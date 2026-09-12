/**
 * Copia de seguridad diaria de la base del portal BAIREN (módulo compartido; no se
 * despliega como función). Lo llaman api/portal-diario.js (paso e) y api/portal-respaldo.js.
 *
 * Qué da:
 *   respaldar(opts)     lee todas las tablas del esquema portal con la service key (GET paginado
 *                       de a 1000 hasta vaciar), más lo que se puede leer de Auth por la API de
 *                       administración (id, mail, alta y metadatos de cada cuenta), arma un JSON
 *                       { generado, esquema:'portal', tablas:{nombre: filas[]}, conteos, faltantes,
 *                       auth_users } y lo sube al bucket privado 'portal-respaldos' como
 *                       <YYYY>/<YYYY-MM-DD>.json (upsert: dos corridas el mismo día dejan una copia).
 *                       Después aplica la retención: conserva los últimos 30 diarios y el primero
 *                       de cada mes de los últimos 12 meses; borra el resto. Deja además
 *                       ultimo.json en la raíz del bucket con el resumen de la última copia.
 *                       Devuelve { ok, ruta, bytes, tablas, conteos, faltantes, auth_users, borrados, ms }.
 *   ultimoRespaldo()    { fecha, bytes, tablas, ok, ruta, copias, motivo } leyendo el bucket: la copia
 *                       más nueva, su peso, cuántas tablas trae (de ultimo.json) y ok = true si tiene
 *                       menos de 36 horas. Sin service key o sin bucket: ok false con motivo. Nunca lanza.
 *                       Lo usa portal-salud (Curación → Sistema).
 *   TABLAS              lista fija de tablas en orden de claves foráneas (padres antes que hijos), con
 *                       su clave primaria; la usa portal/test/restaurar-respaldo.mjs para restaurar en
 *                       el orden correcto. Una tabla que no existe todavía (404 de PostgREST) no frena
 *                       la copia: queda anotada en `faltantes`.
 *
 * Storage por REST, con la service key (el bucket es privado: anon y authenticated no llegan):
 *   subir      POST   /storage/v1/object/portal-respaldos/<ruta>  (x-upsert: true)
 *   listar     POST   /storage/v1/object/list/portal-respaldos    { prefix, limit, offset }
 *   bajar      GET    /storage/v1/object/portal-respaldos/<ruta>
 *   borrar     DELETE /storage/v1/object/portal-respaldos          { prefixes: [...] }
 * Necesita portal/migracion-07-respaldos.sql (el bucket). Sin él, respaldar() lanza
 * "falta correr migracion-07-respaldos.sql" y el diario lo informa en el resumen.
 */
const A = require('./admin');

const BUCKET = 'portal-respaldos';
const PAGINA = 1000;              // tope de filas por GET de PostgREST (max-rows de Supabase)
const DIARIOS = 30;               // copias diarias que se conservan
const MESES = 12;                 // meses hacia atrás de los que se conserva la primera copia
const HORAS_OK = 36;              // una copia "está bien" si tiene menos de 36 h (el cron corre cada 24)
const SERVICE_KEY = () => process.env.PORTAL_SUPABASE_SERVICE_KEY || '';

/* Tablas del esquema portal en orden de claves foráneas: cada una viene después de las que referencia.
   pk: columnas de la clave primaria (para paginar con orden estable y para el on_conflict de la restauración).
   identidad: id "generated always as identity" (vistas, eventos): no se puede reinsertar con id, ver el script.
   generadas: columnas "generated always as (...) stored" que la restauración tiene que sacar antes de insertar. */
const TABLAS = [
  { nombre: 'publicadores', pk: ['id'] },
  { nombre: 'personas', pk: ['id'] },
  { nombre: 'membresias', pk: ['id'] },
  { nombre: 'curadores', pk: ['email'] },
  { nombre: 'avisos', pk: ['id'] },
  { nombre: 'fotos', pk: ['id'] },
  { nombre: 'consultas', pk: ['id'] },
  { nombre: 'favoritos', pk: ['usuario_id', 'aviso_id'] },
  { nombre: 'alertas', pk: ['id'], generadas: ['clave'] },
  { nombre: 'alertas_enviadas', pk: ['id'] },
  { nombre: 'visitas_reservas', pk: ['id'] },
  { nombre: 'denuncias', pk: ['id'] },
  { nombre: 'verificaciones', pk: ['id'] },
  { nombre: 'operaciones', pk: ['id'] },
  { nombre: 'sincronizaciones', pk: ['id'] },
  { nombre: 'precios_historial', pk: ['id'] },
  { nombre: 'vistas', pk: ['id'], identidad: true, ventana: 'fecha' },     /* telemetría: solo los últimos VENTANA_DIAS */
  { nombre: 'eventos', pk: ['id'], identidad: true, ventana: 'creado_en' },
];

/* Fecha YYYY-MM-DD en Buenos Aires (UTC-3 fijo, como fechaBA de admin.js). */
function fechaISO(d) { return new Date((d ? new Date(d) : new Date()).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10); }
const rutaDe = fecha => `${fecha.slice(0, 4)}/${fecha}.json`;
const RE_RUTA = /^(\d{4})\/(\d{4}-\d{2}-\d{2})\.json$/;

/* ── Storage por REST ── */
function cabeceras(extra) { const k = SERVICE_KEY(); return Object.assign({ apikey: k, Authorization: `Bearer ${k}` }, extra || {}); }
class StorageError extends Error {
  constructor(status, que, texto) {
    const t = String(texto || '');
    super(/bucket not found/i.test(t) ? 'falta correr migracion-07-respaldos.sql (no existe el bucket portal-respaldos)' : `storage ${status} en ${que}: ${t.slice(0, 200)}`);
    this.status = status; this.sinBucket = /bucket not found/i.test(t);
  }
}
async function subir(ruta, texto) {
  const r = await fetch(`${A.PORTAL_URL}/storage/v1/object/${BUCKET}/${ruta}`, { method: 'POST', headers: cabeceras({ 'Content-Type': 'application/json', 'x-upsert': 'true' }), body: texto });
  if (!r.ok) throw new StorageError(r.status, 'subir ' + ruta, await r.text());
  return true;
}
async function bajar(ruta) {
  const r = await fetch(`${A.PORTAL_URL}/storage/v1/object/${BUCKET}/${ruta}`, { headers: cabeceras() });
  if (r.status === 404 || r.status === 400) { const t = await r.text(); if (/bucket not found/i.test(t)) throw new StorageError(r.status, 'bajar ' + ruta, t); return null; }
  if (!r.ok) throw new StorageError(r.status, 'bajar ' + ruta, await r.text());
  return r.text();
}
/* Un nivel del bucket: los archivos traen id y metadata.size; las carpetas vienen con id null. */
async function listarNivel(prefix) {
  const todo = [];
  for (let offset = 0; ; offset += PAGINA) {
    const r = await fetch(`${A.PORTAL_URL}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: cabeceras({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefix: prefix || '', limit: PAGINA, offset, sortBy: { column: 'name', order: 'asc' } }) });
    if (!r.ok) throw new StorageError(r.status, 'listar ' + (prefix || '/'), await r.text());
    const pagina = await r.json();
    todo.push(...(Array.isArray(pagina) ? pagina : []));
    if (!Array.isArray(pagina) || pagina.length < PAGINA) break;
  }
  return todo;
}
/* Todas las copias del bucket: [{ ruta, fecha, bytes, updated_at }] ordenadas de la más nueva a la más vieja.
   Solo cuenta lo que tiene forma <YYYY>/<YYYY-MM-DD>.json; cualquier otro archivo se deja en paz. */
async function listarCopias() {
  const raiz = await listarNivel('');
  const carpetas = raiz.filter(e => e.id == null && /^\d{4}$/.test(e.name)).map(e => e.name);
  const copias = [];
  for (const anio of carpetas) {
    for (const e of await listarNivel(anio)) {
      if (e.id == null) continue;
      const ruta = `${anio}/${e.name}`; const m = ruta.match(RE_RUTA); if (!m) continue;
      copias.push({ ruta, fecha: m[2], bytes: Number(e.metadata && e.metadata.size) || 0, updated_at: e.updated_at || e.created_at || null });
    }
  }
  return copias.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}
async function borrar(rutas) {
  if (!rutas.length) return [];
  const r = await fetch(`${A.PORTAL_URL}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: cabeceras({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: rutas }) });
  if (!r.ok) throw new StorageError(r.status, 'borrar', await r.text());
  return rutas;
}

/* ── Lectura de la base ── */
/* Todas las filas de una tabla, de a PAGINA con orden estable por la clave primaria. null si la tabla no existe (404). */
const VENTANA_DIAS = 90;
async function leerTabla(t) {
  const filas = [];
  const desde = t.ventana ? `&${t.ventana}=gte.${new Date(Date.now() - VENTANA_DIAS * 864e5).toISOString()}` : '';
  for (let offset = 0; ; offset += PAGINA) {
    let pagina;
    try { pagina = await A.get(`${t.nombre}?select=*&order=${t.pk.join(',')}&limit=${PAGINA}&offset=${offset}${desde}`); }
    catch (e) { if (e && e.status === 404) return null; throw e; }
    if (!Array.isArray(pagina)) break;
    filas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return filas;
}
/* Cuentas de Auth por la API de administración: solo id, mail, alta y metadatos. Si falla, {error} y la copia sigue. */
async function leerAuth() {
  const usuarios = [];
  try {
    for (let page = 1; ; page++) {
      const r = await fetch(`${A.PORTAL_URL}/auth/v1/admin/users?page=${page}&per_page=${PAGINA}`, { headers: cabeceras() });
      if (!r.ok) return { usuarios: null, error: `auth ${r.status}: ${(await r.text()).slice(0, 200)}` };
      const d = await r.json(); const lista = Array.isArray(d) ? d : (d && d.users) || [];
      usuarios.push(...lista.map(u => ({ id: u.id, email: u.email || null, created_at: u.created_at || null, user_metadata: u.user_metadata || {} })));
      if (lista.length < PAGINA) break;
    }
    return { usuarios, error: null };
  } catch (e) { return { usuarios: null, error: String(e && e.message || e).slice(0, 200) }; }
}

/* ── Retención ──
   Qué copias conservar: las DIARIOS más nuevas y, por cada uno de los últimos MESES meses (contando el actual),
   la primera copia de ese mes. Devuelve { conservar: [rutas], borrar: [rutas] }. Función pura, para probar. */
function retencion(copias, hoy) {
  const orden = copias.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const conservar = new Set(orden.slice(0, DIARIOS).map(c => c.ruta));
  const [y, m] = (hoy || fechaISO()).split('-').map(Number);
  const meses = new Set();
  for (let i = 0; i < MESES; i++) { const d = new Date(Date.UTC(y, m - 1 - i, 1)); meses.add(d.toISOString().slice(0, 7)); }
  for (const mes of meses) {
    const delMes = orden.filter(c => c.fecha.slice(0, 7) === mes);
    if (delMes.length) conservar.add(delMes[delMes.length - 1].ruta);   // la más vieja del mes (la lista está de nueva a vieja)
  }
  return { conservar: orden.filter(c => conservar.has(c.ruta)).map(c => c.ruta), borrar: orden.filter(c => !conservar.has(c.ruta)).map(c => c.ruta) };
}

/* ── La copia ── */
async function respaldar(opts) {
  opts = opts || {};
  if (!SERVICE_KEY()) throw new Error('sin PORTAL_SUPABASE_SERVICE_KEY');
  const t0 = Date.now();
  const fecha = opts.fecha || fechaISO();
  const copia = { generado: new Date().toISOString(), esquema: 'portal', proyecto: A.PORTAL_URL, version: 1, tablas: {}, conteos: {}, faltantes: [], auth_users: null, auth_error: null };
  for (const t of TABLAS) {
    const filas = await leerTabla(t);
    if (filas == null) { copia.faltantes.push(t.nombre); continue; }
    copia.tablas[t.nombre] = filas; copia.conteos[t.nombre] = filas.length;
  }
  const auth = await leerAuth();
  copia.auth_users = auth.usuarios; copia.auth_error = auth.error;
  if (auth.usuarios) copia.conteos.auth_users = auth.usuarios.length;
  const texto = JSON.stringify(copia);
  const bytes = Buffer.byteLength(texto, 'utf8');
  const ruta = rutaDe(fecha);
  await subir(ruta, texto);
  const tablas = Object.keys(copia.tablas).length;
  const resumen = { fecha, ruta, bytes, tablas, conteos: copia.conteos, faltantes: copia.faltantes, auth_users: auth.usuarios ? auth.usuarios.length : null, auth_error: auth.error, generado: copia.generado };
  let borrados = [];
  if (opts.retencion !== false) {
    const copias = await listarCopias();
    borrados = await borrar(retencion(copias, fechaISO()).borrar);   /* la retención siempre relativa al día real */
  }
  try { await subir('ultimo.json', JSON.stringify(resumen)); } catch (e) { /* el resumen es una comodidad para salud; la copia ya está */ }
  return Object.assign({ ok: true }, resumen, { borrados, ms: Date.now() - t0 });
}

/* Estado de la última copia, para portal-salud. Nunca lanza. */
async function ultimoRespaldo() {
  const vacio = motivo => ({ fecha: null, bytes: null, tablas: null, ok: false, ruta: null, copias: 0, motivo });
  if (!SERVICE_KEY()) return vacio('sin service key');
  try {
    const copias = await listarCopias();
    if (!copias.length) return vacio('todavía no hay ninguna copia');
    const u = copias[0];
    let tablas = null, conteos = null, generado = null;
    try { const t = await bajar('ultimo.json'); const j = t ? JSON.parse(t) : null; if (j && j.ruta === u.ruta) { tablas = j.tablas; conteos = j.conteos || null; generado = j.generado || null; } } catch (e) { /* sin resumen: quedan null */ }
    const cuando = generado || u.updated_at || (u.fecha + 'T03:00:00Z');   // la fecha del nombre es de Buenos Aires: 00:00 BA = 03:00 UTC
    const horas = (Date.now() - new Date(cuando).getTime()) / 3600000;
    const ok = isFinite(horas) && horas >= 0 && horas < HORAS_OK;
    return { fecha: u.fecha, bytes: u.bytes, tablas, ok, ruta: u.ruta, copias: copias.length, conteos, generado, motivo: ok ? null : `la última copia tiene ${Math.round(horas)} h` };
  } catch (e) { return vacio(e && e.sinBucket ? 'falta correr migracion-07-respaldos.sql' : String(e && e.message || e).slice(0, 200)); }
}

module.exports = { respaldar, ultimoRespaldo, TABLAS, BUCKET, DIARIOS, MESES, fechaISO, rutaDe, _interno: { retencion, listarCopias, listarNivel, leerTabla, leerAuth, subir, bajar, borrar, StorageError } };
