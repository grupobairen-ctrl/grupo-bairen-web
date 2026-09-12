/* Restaura la base del portal desde una copia del bucket portal-respaldos.
   Necesita PORTAL_SUPABASE_SERVICE_KEY en el entorno (la service key del proyecto del portal;
   nunca va en el repo). Lee la copia con la API REST de Storage y escribe con PostgREST,
   upsert por clave primaria (Prefer: resolution=merge-duplicates): las filas de la copia PISAN
   las actuales con la misma clave; las que hoy existen y en la copia no, quedan como están.

   Uso:
     node portal/test/restaurar-respaldo.mjs --listar                         qué copias hay
     node portal/test/restaurar-respaldo.mjs --dry-run                        cuenta lo que restauraría de la última copia
     node portal/test/restaurar-respaldo.mjs --fecha 2026-09-12 --tabla avisos --dry-run
     node portal/test/restaurar-respaldo.mjs --fecha 2026-09-12 --tabla avisos --confirmar   restaura UNA tabla (pisa lo actual)
     node portal/test/restaurar-respaldo.mjs --fecha 2026-09-12 --todas --confirmar     todas, en orden de claves foráneas
     node portal/test/restaurar-respaldo.mjs --fecha 2026-09-12 --descargar copia.json  solo baja el JSON
     node portal/test/restaurar-respaldo.mjs --archivo copia.json --todas --dry-run     desde un JSON local

   Sin --fecha usa la copia más nueva. Sin --tabla ni --todas no escribe nada (solo cuenta).
   vistas y eventos (id generado siempre) se restauran sin id y solo si la tabla está vacía;
   con --con-registros se insertan igual (quedan duplicados si ya había filas). Las cuentas de
   Auth (auth_users) no se restauran: Auth no acepta altas con el mismo id por REST; quedan en el
   JSON para consultar. Los disparadores corren al restaurar (un precio distinto en avisos deja
   una fila más en precios_historial). */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = require(join(raiz, 'api', '_portal', 'respaldo.js'));
const A = require(join(raiz, 'api', '_portal', 'admin.js'));

const args = process.argv.slice(2);
const flag = n => args.indexOf('--' + n) > -1;
const valor = n => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : null; };
const dry = flag('dry-run');
const confirmar = flag('confirmar');
const todas = flag('todas');
const tabla = valor('tabla');
const fecha = valor('fecha');
const archivo = valor('archivo');
const descargar = valor('descargar');
const conRegistros = flag('con-registros');
const LOTE = 500;

const KEY = process.env.PORTAL_SUPABASE_SERVICE_KEY || '';
if (!KEY && !archivo) { console.error('Falta PORTAL_SUPABASE_SERVICE_KEY en el entorno (o --archivo para leer un JSON local).'); process.exit(1); }
if (tabla && !R.TABLAS.some(t => t.nombre === tabla)) { console.error(`La tabla ${tabla} no está en la lista: ${R.TABLAS.map(t => t.nombre).join(', ')}`); process.exit(1); }

if (flag('listar')) {
  const copias = await R._interno.listarCopias();
  if (!copias.length) console.log('No hay copias en el bucket.');
  for (const c of copias) console.log(`${c.fecha}  ${String(Math.round(c.bytes / 1024)).padStart(7)} KB  ${c.ruta}`);
  process.exit(0);
}

/* 1. La copia */
let copia, origen;
if (archivo) { copia = JSON.parse(readFileSync(archivo, 'utf8')); origen = archivo; }
else {
  let ruta;
  if (fecha) { if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { console.error('--fecha va como YYYY-MM-DD'); process.exit(1); } ruta = R.rutaDe(fecha); }
  else { const copias = await R._interno.listarCopias(); if (!copias.length) { console.error('No hay copias en el bucket.'); process.exit(1); } ruta = copias[0].ruta; }
  const texto = await R._interno.bajar(ruta);
  if (texto == null) { console.error(`No existe ${ruta} en el bucket ${R.BUCKET}.`); process.exit(1); }
  copia = JSON.parse(texto); origen = `${R.BUCKET}/${ruta}`;
  if (descargar) { writeFileSync(descargar, texto); console.log(`Guardado ${descargar} (${Math.round(Buffer.byteLength(texto) / 1024)} KB).`); process.exit(0); }
}
if (!copia || copia.esquema !== 'portal' || !copia.tablas) { console.error('Ese JSON no es una copia del portal (falta esquema o tablas).'); process.exit(1); }
console.log(`Copia: ${origen}, generada ${copia.generado}, ${Object.keys(copia.tablas).length} tablas${copia.auth_users ? `, ${copia.auth_users.length} cuentas de Auth (no se restauran)` : ''}.`);
if (copia.faltantes && copia.faltantes.length) console.log(`La copia no trae ${copia.faltantes.join(', ')} (no existían cuando se hizo).`);

/* 2. Qué tablas */
const lista = tabla ? R.TABLAS.filter(t => t.nombre === tabla) : R.TABLAS;
const plan = lista.filter(t => copia.tablas[t.nombre]).map(t => ({ t, filas: copia.tablas[t.nombre] }));
for (const { t, filas } of plan) console.log(`  ${t.nombre.padEnd(20)} ${String(filas.length).padStart(6)} filas${t.identidad ? '  (id generado: sin id, solo si está vacía)' : ''}${t.generadas ? `  (sin ${t.generadas.join(', ')})` : ''}`);
if (tabla && !plan.length) { console.log(`La copia no trae la tabla ${tabla}.`); process.exit(0); }
if (!dry && (tabla || todas) && !confirmar) { console.log('Escribir de verdad pisa lo que hay en la base. Agregá --confirmar (o probá con --dry-run).'); process.exit(1); }
if (dry || (!tabla && !todas)) { console.log(dry ? 'Modo --dry-run: no se escribió nada.' : 'Sin --tabla ni --todas no se escribe nada. Para restaurar de verdad, elegí una tabla o --todas.'); process.exit(0); }
if (!KEY) { console.error('Para escribir hace falta PORTAL_SUPABASE_SERVICE_KEY.'); process.exit(1); }

/* 3. Restaurar, en orden de claves foráneas, en lotes, upsert por clave primaria */
console.log(`Restaurando ${plan.length} tabla${plan.length === 1 ? '' : 's'}. Esto PISA las filas actuales con la misma clave.`);
let total = 0;
for (const { t, filas } of plan) {
  let f = filas;
  if (t.generadas) f = f.map(r => { const c = Object.assign({}, r); t.generadas.forEach(k => delete c[k]); return c; });
  if (t.identidad) {
    const hay = await A.contar(t.nombre);
    if (hay && !conRegistros) { console.log(`  ${t.nombre}: tiene ${hay} filas y el id es generado; se salta (con --con-registros se insertan igual).`); continue; }
    f = f.map(r => { const c = Object.assign({}, r); delete c.id; return c; });
  }
  let n = 0;
  for (let i = 0; i < f.length; i += LOTE) {
    const lote = f.slice(i, i + LOTE);
    if (t.identidad) await A.post(t.nombre, lote, { prefer: 'return=minimal' });
    else await A.post(`${t.nombre}?on_conflict=${t.pk.join(',')}`, lote, { prefer: 'resolution=merge-duplicates, return=minimal' });
    n += lote.length;
  }
  total += n;
  console.log(`  ${t.nombre}: ${n} filas.`);
}
console.log(`Listo: ${total} filas escritas desde ${origen}.`);
