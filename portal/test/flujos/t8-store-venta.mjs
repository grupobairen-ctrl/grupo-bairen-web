/* H · Lo nuevo de venta con Supabase simulado: unidades_borrador con y sin la columna (guardar, leer, panel), setDisponibilidad
   y misVerificaciones. Mismo doble que t5. */
import { conectar } from './cdp.mjs';
import { limpiar } from './flujo.mjs';
const c = await conectar(); await c.vista(false);
await limpiar(c); await c.ir('publicar-aviso.html', 1200);
const fase = async (CON23) => { await c.ir('publicar-aviso.html', 1200); await c.ev('sessionStorage.clear(); true'); await c.ir('publicar-aviso.html', 1200); return c.ev(`(async () => {
  const S = BPStore; const log = []; let con23 = ${CON23};
  const COL = /unidades_borrador/;
  const handler = ops => {
    const tabla = (ops.find(o => o[0] === 'from') || [])[1]?.[0];
    const ins = ops.find(o => o[0] === 'insert' || o[0] === 'update');
    const sel = ops.find(o => o[0] === 'select'); const cols = sel ? String(sel[1][0]) : '';
    if (tabla === 'membresias') return { data: null, error: { code: 'X' } };
    if (tabla === 'publicadores') return { data: { id: 'pub-1', tipo: 'desarrolladora', nombre: 'Torre' }, error: null };
    if (tabla === 'fotos') return { error: null };
    if (tabla === 'avisos_propietario') return { data: [], error: null };
    if (tabla === 'verificaciones') return { data: [{ tipo: 'dni', resultado: 'pendiente', nota: 'Documento: pub-1/dni-1.jpg' }, { tipo: 'titularidad', resultado: 'pendiente', nota: null }], error: null };
    if (tabla === 'avisos' && ins) {
      const body = ins[1][0];
      log.push(ins[0] + ' ' + ('unidades_borrador' in body ? 'lista=' + (body.unidades_borrador ? body.unidades_borrador.length : 'null') : 'lista no va') + (ins[0] === 'update' && !sel ? ' campos=' + Object.keys(body).sort().join(',') : ''));
      if (con23 !== true && 'unidades_borrador' in body) return { data: null, error: { code: 'PGRST204', message: "Could not find the 'unidades_borrador' column of 'avisos' in the schema cache" } };
      return { data: Object.assign({ id: body.id || 'av-1' }, body), error: null };
    }
    if (tabla === 'avisos' && sel) {
      log.push('select ' + (COL.test(cols) ? 'con lista' : 'sin lista'));
      if (con23 !== true && COL.test(cols)) return { data: null, error: { code: '42703', message: 'column avisos.unidades_borrador does not exist' } };
      const fila = { id: 'av-1', estado_curacion: 'borrador', emprendimiento: 'Torre', fotos: [] }; if (con23 === true) fila.unidades_borrador = [{ unidad: '2° A' }, { unidad: '2° B' }];
      return { data: ops.some(o => o[0] === 'maybeSingle') ? fila : [fila], error: null };
    }
    return { data: null, error: null };
  };
  const mk = ops => { const b = {}; ['schema','from','select','insert','update','upsert','delete','eq','is','in','order','limit','maybeSingle','single','ilike','range','neq'].forEach(m => b[m] = (...a) => mk(ops.concat([[m, a]]))); b.rpc = () => mk(ops.concat([['rpc', []]])); b.then = (res, rej) => Promise.resolve(handler(ops)).then(res, rej); return b; };
  S.mode = 'supabase'; S.sb = mk([]); S.session = { id: 'u-1', email: 'x@y.z' };
  try { sessionStorage.removeItem('bp_sin_unidades_borrador'); } catch (e) {}
  const base = { direccion: 'Av. del Libertador 7400', zona: 'Núñez', barrio: 'Núñez', operacion: 'venta', precio: 165000, emprendimiento: 'Torre', fotos: [] };
  const res = {}; let a, l;
  if (con23 === 'leer') { a = await S.getAviso('av-1'); res.leer_primero = { log: log.splice(0), id: a && a.id, hay: S.hayUnidadesBorrador() }; a = await S.getAviso('av-1'); res.leer_segundo = log.splice(0); return res; }
  if (!con23) {
  a = await S.saveAviso(Object.assign({}, base, { unidades_borrador: [{ unidad: '2° A' }, { unidad: '2° B' }] })); res.sin23_guardar = { id: a.id, log: log.splice(0), hay: S.hayUnidadesBorrador() };
  a = await S.saveAviso(Object.assign({}, base, { id: 'av-1', unidades_borrador: [{ unidad: '2° A' }] })); res.sin23_segunda_no_manda = log.splice(0);
  a = await S.getAviso('av-1'); res.sin23_leer = { log: log.splice(0), lista: a && a.unidades_borrador, hay: S.hayUnidadesBorrador() };
  l = await S.myAvisos(); res.sin23_panel = { log: log.splice(0), n: l.length };
  return res; }
  a = await S.saveAviso(Object.assign({}, base, { id: 'av-1', unidades_borrador: [{ unidad: '2° A' }, { unidad: '2° B' }] })); res.con23_guardar = log.splice(0);
  a = await S.saveAviso(Object.assign({}, base, { id: 'av-1', unidades_borrador: [] })); res.con23_vacia_es_null = log.splice(0);
  a = await S.getAviso('av-1'); res.con23_leer = { log: log.splice(0), lista: (a.unidades_borrador || []).map(u => u.unidad).join(','), hay: S.hayUnidadesBorrador() };
  l = await S.myAvisos(); res.con23_panel = { log: log.splice(0), lista: (l[0].unidades_borrador || []).length };
  await S.setDisponibilidad('av-1', 'reservado'); res.reservar = log.splice(0);
  try { await S.setDisponibilidad('av-1', 'vendido'); res.estadoRaro = 'no lanzó'; } catch (e) { res.estadoRaro = 'lanzó: ' + e.message; }
  const v = await S.misVerificaciones('pub-1'); res.docs = S.docsEnviados(v);
  res.riel = S.rielDe('profesional', { tipo: 'desarrolladora' }).join(',') + ' / ' + S.rielDe('profesional', { tipo: 'profesional' }).join(',');
  res.rotulos = [S.perfilTxt('profesional', { tipo: 'desarrolladora' }), S.perfilTxt('profesional', { tipo: 'profesional' }), S.perfilTxt('profesional', { tipo: 'gestor' }), S.perfilTxt('profesional', null)].join(' | ');
  return res;
})()`); };
const r1 = await fase(false), r2 = await fase(true), r3 = await fase("'leer'");
console.log(JSON.stringify({ sin23: r1, con23: r2, sin23_leer_primero: r3 }, null, 1), JSON.stringify({ e: c.errores, k: c.consola }));
await c.cerrar(); process.exit(0);
