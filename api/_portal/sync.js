/**
 * Sincronización bairengroup.com → portal (módulo compartido; lo usan
 * api/portal-sync.js y api/portal-diario.js).
 *
 * Lee public.propiedades de la web (publicadas, con imagenes y amenities) y deja
 * portal.avisos y portal.fotos iguales, con el MISMO mapeo que fromUnit en
 * portal/js/data.js y que los seeds (seed-avisos.sql, seed-avisos-2026-09-10.sql):
 *   · una unidad da hasta tres avisos: venta (precio_venta), alquiler
 *     (precio_tradicional) y mediano (precio_temporal); solo los que tienen precio.
 *   · codigo = 'BA-' + slug en mayúsculas sin símbolos + V/L/M. Es el formato de los
 *     seeds y de la base (data.js recorta a 8 letras, pero eso choca: las tres
 *     unidades de Austria 1938 darían el mismo código, y la base ya tiene el largo).
 *   · zona = zonaDe(barrio) de ./zonas.js (la tabla de mapa-barrios.js), o el barrio si no
 *     se conoce: Palermo Hollywood → Palermo, Las Cañitas → Palermo, San Isidro → GBA Norte.
 *     Es lo que reparar-textos.sql dejó en la base y lo que fromUnit calcula en el cliente.
 *     ciudad = 'Zona Norte' si la zona es GBA Norte, si no 'Capital Federal' (como fromUnit).
 *   · dormitorios = ambientes - 1 (mínimo 1); baños = 2 si hay 4 o más ambientes, si no 1;
 *     cocheras = 1 si "Cochera" está en amenities; amoblado = mediano o amenity "Amoblado".
 *   · amenities normalizadas (Aire acond. → Aire acondicionado, Jardín / Terraza → Terraza o jardín).
 *   · descripciones sin la línea del corredor; portada primera en las fotos, sin URLs
 *     repetidas (la web tiene alguna unidad con la misma foto dos veces).
 *   · estado 'reservado' si la web dice Reservado u Ocupado; estado_curacion 'publicado';
 *     publicado_en = created_at de la web en el alta. Después la web no lo gobierna:
 *     al reactivar un aviso pausado se pone publicado_en = ahora, para que las alertas
 *     lo vean como nuevo (max(publicado_en, created_at) en alertas.js).
 *   · estado se recalcula solo si el que hay es 'disponible' o 'reservado': 'vendido' y
 *     'alquilado' los pone un curador y se respetan.
 * Clave de coincidencia: (propiedad_id, operacion); si no hay, por codigo.
 * Alta: insert de aviso y fotos. Cambio: PATCH solo de los campos que cambiaron.
 * Nunca pisa cualidades_verificadas, estado_curacion (salvo reactivar una baja hecha
 * por esta misma sincronización), destacado_hasta, motivo_rechazo, tipo, expensas ni
 * moneda. Baja: el aviso cuya unidad (o precio) ya no está en la web pasa a 'pausado';
 * no se borra porque consultas, favoritos y vistas lo referencian.
 * Todo queda registrado en portal.sincronizaciones (migracion-04-producto.sql), también
 * el detalle parcial de una corrida que falló a mitad de camino: así los avisos que
 * alcanzó a pausar se reactivan solos cuando vuelven a la web.
 * Candado: índice único parcial sobre las corridas sin terminar; se cierran las
 * abandonadas (más de 3 minutos sin terminar), se inserta la propia y, si el insert da
 * 409/23505, hay otra en curso y se devuelve {omitida:true, motivo:'en curso'}.
 *
 * Las funciones puras (mapeo, comparación) se exportan para probarlas con node sin red.
 */
const A = require('./admin');
const { zonaDe } = require('./zonas');

const AMEN_MAP = { 'Aire acond.': 'Aire acondicionado', 'Jardín / Terraza': 'Terraza o jardín' };
const normAmen = a => AMEN_MAP[a] || a;
const OPS = [['venta', 'precio_venta', 'V'], ['alquiler', 'precio_tradicional', 'L'], ['mediano', 'precio_temporal', 'M']];
const VIDEO_TIPOS = ['bunny', 'youtube', 'mp4'];
/* Campos que la web gobierna. Lo que no está acá, la sincronización no lo toca nunca
   (publicado_en solo se fija en el alta y al reactivar; estado, solo si es disponible/reservado). */
const CAMPOS = ['slug', 'titulo', 'direccion', 'unidad', 'barrio', 'zona', 'ciudad', 'precio', 'm2_total', 'm2_cubierto', 'ambientes', 'dormitorios', 'banos', 'cocheras', 'amoblado', 'amenities', 'descripcion', 'descripcion_en', 'descripcion_pt', 'video_url', 'video_tipo', 'plazo', 'estado'];
const ESTADOS_WEB = ['disponible', 'reservado'];   // los únicos estados que la web puede pisar
const SELECT_AVISOS = 'id,codigo,propiedad_id,publicador_id,operacion,precio,moneda,expensas,estado,estado_curacion,updated_at,publicado_en,' + CAMPOS.filter(c => ['precio', 'estado'].indexOf(c) === -1).join(',') + ',fotos(url,orden)';
const FRENO_MS = 10 * 60 * 1000;   // no se vuelve a sincronizar si la última buena terminó hace menos de 10 minutos
const CANDADO_MS = 3 * 60 * 1000;  // una iniciada y no terminada hace menos de 3 minutos sigue en curso

const codigoDe = (slug, op) => 'BA-' + String(slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + (op === 'venta' ? 'V' : op === 'alquiler' ? 'L' : 'M');
const vacio = v => v == null || v === '';

function videoTipo(p) {
  if (!p.video_url) return null;
  if (VIDEO_TIPOS.indexOf(p.video_tipo) > -1) return p.video_tipo;
  if (/youtu\.?be/i.test(p.video_url)) return 'youtube';
  if (/\.mp4(\?|$)/i.test(p.video_url)) return 'mp4';
  return 'bunny';
}

/* Fotos de una unidad, en orden y con la portada primera (igual que fromUnit), sin URLs repetidas. */
function fotosDeUnidad(p) {
  const fotos = (p.imagenes || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(i => i.url).filter(Boolean);
  if (p.portada_url && fotos.indexOf(p.portada_url) === -1) fotos.unshift(p.portada_url);
  return Array.from(new Set(fotos));
}

/* Una unidad de la web + una operación → la fila de portal.avisos (sin publicador_id) y sus fotos. */
function filaDesdeUnidad(p, op, precio) {
  const amen = (p.amenities || []).map(a => normAmen(a && a.nombre)).filter(Boolean);
  const amb = p.ambientes || null;
  const unidad = p.unidad && p.unidad !== '-' ? p.unidad : null;
  const reservado = p.estado === 'Reservado' || p.estado === 'Ocupado' || p.reservada === true;
  const zona = zonaDe(p.barrio) || p.barrio;
  return {
    codigo: codigoDe(p.slug, op), slug: p.slug, propiedad_id: p.id, operacion: op,
    titulo: p.portada_titulo || (p.dir + (unidad ? ' · ' + unidad : '')),
    direccion: p.dir, unidad, barrio: p.barrio, zona, ciudad: zona === 'GBA Norte' ? 'Zona Norte' : 'Capital Federal',
    precio: Number(precio), moneda: 'USD',
    m2_total: p.m2 || null, m2_cubierto: p.m2 || null, ambientes: amb,
    dormitorios: amb == null ? null : Math.max(1, amb - 1), banos: amb == null ? null : (amb >= 4 ? 2 : 1),
    cocheras: amen.indexOf('Cochera') > -1 ? 1 : 0,
    amoblado: op === 'mediano' || amen.indexOf('Amoblado') > -1, amenities: amen,
    descripcion: A.sinLineaCorredor(p.descripcion) || null, descripcion_en: A.sinLineaCorredor(p.descripcion_en) || null, descripcion_pt: A.sinLineaCorredor(p.descripcion_pt) || null,
    video_url: p.video_url || null, video_tipo: videoTipo(p), plazo: p.plazo || null,
    estado: reservado ? 'reservado' : 'disponible', estado_curacion: 'publicado', publicado_en: p.created_at || null,
    fotos: fotosDeUnidad(p),
  };
}

/* Una unidad → sus avisos (uno por operación con precio). */
function avisosDeUnidad(p) {
  const out = [];
  for (const [op, col] of OPS) { const precio = p[col]; if (precio != null && precio !== '' && Number(precio) > 0) out.push(filaDesdeUnidad(p, op, precio)); }
  return out;
}

/* Normaliza para comparar: null y '' son lo mismo; números como números; fechas por instante; arrays ordenados. */
function normalizar(v) {
  if (vacio(v)) return null;
  if (Array.isArray(v)) return JSON.stringify(v.map(x => String(x)).sort());
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number(v);
  if (typeof v === 'string') {
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) { const t = Date.parse(v); if (!isNaN(t)) return t; }
    return v;
  }
  return v;
}
/* Qué cambió entre la fila que hay y la que manda la web: solo los CAMPOS que la web gobierna. */
function diferencias(existente, nueva) {
  const patch = {};
  for (const k of CAMPOS) { if (normalizar(existente[k]) !== normalizar(nueva[k])) patch[k] = nueva[k]; }
  return patch;
}
/* Lista ordenada de URLs de la fila de la base vs. la de la web. */
function fotosDifieren(fotosBase, fotosWeb) {
  const a = (fotosBase || []).slice().sort((x, y) => (x.orden || 0) - (y.orden || 0)).map(f => f.url);
  return JSON.stringify(a) !== JSON.stringify(fotosWeb || []);
}

/* Fecha ISO sin milisegundos, como la quiere PostgREST en un filtro. */
const iso = t => new Date(t).toISOString();
const esTablaFaltante = e => e && e.status === 404 && /sincronizaciones/.test(String(e.detalle || e.message || ''));
/* 409 de PostgREST o 23505 de Postgres: chocó con el índice único de "una en curso". */
const esCandado = e => e && (e.status === 409 || /23505/.test(String(e.detalle || e.message || '')));

/* El publicador de las unidades migradas: 'bairen'; si no existe, la única fila sin cuenta (slug viejo, hasta la migración 03). */
async function publicadorDestino() {
  const filas = await A.get('publicadores?select=id,slug,auth_user_id&or=(slug.eq.bairen,auth_user_id.is.null)');
  const bairen = filas.find(p => p.slug === 'bairen'); if (bairen) return bairen;
  const sinCuenta = filas.filter(p => !p.auth_user_id);
  if (sinCuenta.length === 1) return sinCuenta[0];
  const e = new Error(sinCuenta.length ? `hay ${sinCuenta.length} publicadores sin cuenta y ninguno es bairen: correr migracion-03` : 'no existe el publicador bairen: correr schema-portal.sql o migracion-03'); e.status = 409; throw e;
}

/**
 * Sincroniza. opts.force salta el freno de 10 minutos; opts.origen queda en la fila ('web', 'cron', 'manual').
 * Devuelve {omitida:true, motivo} o {ok:true, altas, cambios, bajas, sin_cambios, ms, detalle}.
 * Si falta la tabla sincronizaciones, lanza un error con status 503 y falta:'migracion-04-producto.sql'.
 * Candado: primero cierra las corridas abandonadas (sin terminar hace más de 3 minutos), después
 * inserta la propia; el índice único parcial de la migración 04 deja una sola sin terminar, así
 * que si el insert choca (409/23505) hay otra en curso y se omite sin correr.
 */
async function sincronizar(opts) {
  opts = opts || {};
  const t0 = Date.now();
  let ultima, fila;
  try {
    await A.patch(`sincronizaciones?terminada=is.null&iniciada=lt.${encodeURIComponent(iso(t0 - CANDADO_MS))}`, { terminada: iso(t0), ok: false, error: 'abandonada' }, { prefer: 'return=minimal' });
    ultima = await A.get('sincronizaciones?select=terminada,altas,cambios,bajas,sin_cambios&ok=eq.true&terminada=not.is.null&order=terminada.desc&limit=1');
  } catch (e) { if (esTablaFaltante(e)) { const err = new Error('falta la tabla portal.sincronizaciones'); err.status = 503; err.falta = 'migracion-04-producto.sql'; throw err; } throw e; }
  if (!opts.force && ultima[0] && Date.parse(ultima[0].terminada) > t0 - FRENO_MS) return { omitida: true, motivo: 'reciente', ultima: ultima[0] };

  try { [fila] = await A.post('sincronizaciones', { origen: opts.origen || 'web' }); }
  catch (e) { if (esCandado(e)) return { omitida: true, motivo: 'en curso' }; throw e; }
  const cerrar = async (campos) => { try { await A.patch(`sincronizaciones?id=eq.${fila.id}`, Object.assign({ terminada: iso(Date.now()) }, campos), { prefer: 'return=minimal' }); } catch (e) { /* el resultado ya se devuelve igual */ } };

  /* El detalle vive acá afuera: si correr() falla a mitad de camino, lo que alcanzó a hacer queda guardado igual. */
  const detalle = { altas: [], cambios: [], bajas: [], reactivados: [], fotos: [] };
  try {
    const r = await correr(detalle);
    r.ms = Date.now() - t0;
    await cerrar({ ok: true, altas: r.altas, cambios: r.cambios, bajas: r.bajas, sin_cambios: r.sin_cambios, detalle });
    return Object.assign({ ok: true }, r);
  } catch (e) {
    await cerrar({ ok: false, error: String(e && e.message || e).slice(0, 500), altas: detalle.altas.length, cambios: detalle.cambios.length, bajas: detalle.bajas.length, detalle });
    throw e;
  }
}

/* El trabajo en sí, con la fila de sincronizaciones ya abierta. Va llenando `detalle` a medida que toca filas. */
async function correr(detalle) {
  const pub = await publicadorDestino();
  const [unidades, avisos, historial] = await Promise.all([
    A.web('propiedades?select=*,imagenes(url,orden),amenities(nombre)&publicada=eq.true&order=created_at.asc'),
    A.get(`avisos?select=${SELECT_AVISOS}&or=(propiedad_id.not.is.null,publicador_id.eq.${pub.id})`),
    A.get('sincronizaciones?select=terminada,detalle&detalle=not.is.null&order=iniciada.desc&limit=200'),
  ]);
  /* Códigos que esta sincronización dio de baja alguna vez (también en corridas que fallaron después), con la fecha: solo esos se reactivan solos. */
  const bajasPrevias = {};
  for (const s of historial) { const b = s.detalle && s.detalle.bajas; if (Array.isArray(b)) for (const c of b) { const t = Date.parse(s.terminada || 0) || 0; if (!bajasPrevias[c] || bajasPrevias[c] < t) bajasPrevias[c] = t; } }

  const porClave = new Map(), porCodigo = new Map();
  for (const a of avisos) { if (a.propiedad_id) porClave.set(a.propiedad_id + '|' + a.operacion, a); porCodigo.set(a.codigo, a); }

  const vistos = new Set();
  const nuevos = [];         // filas a insertar (con sus fotos aparte)
  let sinCambios = 0;

  for (const p of unidades) {
    for (const n of avisosDeUnidad(p)) {
      const fotosWeb = n.fotos; delete n.fotos;
      const ex = porClave.get(n.propiedad_id + '|' + n.operacion) || porCodigo.get(n.codigo);
      if (!ex) { nuevos.push({ fila: Object.assign({ publicador_id: pub.id }, n), fotos: fotosWeb }); continue; }
      vistos.add(ex.id);
      const patch = diferencias(ex, n);
      if ('estado' in patch && ESTADOS_WEB.indexOf(ex.estado) === -1) delete patch.estado;   // 'vendido' / 'alquilado' los puso un curador: se respetan
      if (ex.propiedad_id !== n.propiedad_id) patch.propiedad_id = n.propiedad_id;   // fila sin puente, o unidad recreada en la web con otro id
      /* Reactivar solo lo que esta misma sincronización pausó y nadie tocó después. Entra como nuevo para las alertas: publicado_en = ahora. */
      if (ex.estado_curacion === 'pausado' && bajasPrevias[ex.codigo] && bajasPrevias[ex.codigo] + 5000 >= (Date.parse(ex.updated_at) || 0)) { patch.estado_curacion = 'publicado'; patch.publicado_en = iso(Date.now()); detalle.reactivados.push(ex.codigo); }
      const campos = Object.keys(patch);
      let toco = false;
      if (campos.length) { await A.patch(`avisos?id=eq.${ex.id}`, patch, { prefer: 'return=minimal' }); detalle.cambios.push({ codigo: ex.codigo, campos }); toco = true; }
      if (fotosDifieren(ex.fotos, fotosWeb)) {
        await A.del(`fotos?aviso_id=eq.${ex.id}`);
        if (fotosWeb.length) await A.post('fotos', fotosWeb.map((url, i) => ({ aviso_id: ex.id, url, orden: i })), { prefer: 'return=minimal' });
        detalle.fotos.push(ex.codigo); if (!toco) { detalle.cambios.push({ codigo: ex.codigo, campos: ['fotos'] }); toco = true; }
      }
      if (!toco) sinCambios++;
    }
  }

  /* Altas: un solo insert de avisos y otro de fotos. */
  if (nuevos.length) {
    const insertados = await A.post('avisos', nuevos.map(n => n.fila));
    const idPorCodigo = new Map(insertados.map(a => [a.codigo, a.id]));
    const fotos = [];
    for (const n of nuevos) { const id = idPorCodigo.get(n.fila.codigo); if (!id) continue; n.fotos.forEach((url, i) => fotos.push({ aviso_id: id, url, orden: i })); detalle.altas.push(n.fila.codigo); }
    if (fotos.length) await A.post('fotos', fotos, { prefer: 'return=minimal' });
  }

  /* Bajas: lo que vino de la web (propiedad_id) y ya no está, o ya no tiene ese precio. */
  for (const a of avisos) {
    if (!a.propiedad_id || vistos.has(a.id)) continue;
    if (a.estado_curacion !== 'publicado') continue;   // ya estaba fuera (pausado, vencido, etc.): no se toca
    await A.patch(`avisos?id=eq.${a.id}`, { estado_curacion: 'pausado' }, { prefer: 'return=minimal' });
    detalle.bajas.push(a.codigo);
  }

  return { altas: detalle.altas.length, cambios: detalle.cambios.length, bajas: detalle.bajas.length, sin_cambios: sinCambios, unidades: unidades.length, detalle };
}

module.exports = { sincronizar, _interno: { AMEN_MAP, CAMPOS, ESTADOS_WEB, codigoDe, videoTipo, fotosDeUnidad, filaDesdeUnidad, avisosDeUnidad, normalizar, diferencias, fotosDifieren, esCandado, FRENO_MS, CANDADO_MS } };
