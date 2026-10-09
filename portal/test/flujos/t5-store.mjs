/* F · saveAviso sin la migración 23 (Supabase simulado): disponible_desde se reintenta sin el campo; el respaldo de `*` sigue. */
import { conectar, sleep } from './cdp.mjs';
import { limpiar } from './flujo.mjs';
const c = await conectar(); await c.vista(false);
await limpiar(c); await c.ir('publicar-aviso.html', 1200);
const r = await c.ev(`(async () => {
  const S = BPStore; const log = []; let modo = 'sin23';
  const handler = ops => {
    const tabla = (ops.find(o => o[0] === 'from') || [])[1]?.[0];
    const ins = ops.find(o => o[0] === 'insert' || o[0] === 'update');
    const sel = ops.find(o => o[0] === 'select');
    if (tabla === 'membresias') return { data: null, error: { code: 'X' } };
    if (tabla === 'publicadores') return { data: { id: 'pub-1', tipo: 'gestor', nombre: 'Prueba' }, error: null };
    if (tabla === 'fotos') return { error: null };
    if (tabla === 'avisos' && ins) {
      const body = ins[1][0]; const cols = sel ? sel[1][0] : null;
      log.push(ins[0] + ' dd=' + ('disponible_desde' in body ? body.disponible_desde : '(no va)') + ' cols=' + (cols === '*' ? '*' : 'AVISO'));
      if (modo === 'colSelect' && cols !== '*') return { data: null, error: { code: '42703', message: 'column avisos.quiero_produccion does not exist' } };
      if ('disponible_desde' in body && modo !== 'con23') return { data: null, error: { code: 'PGRST204', message: "Could not find the 'disponible_desde' column of 'avisos' in the schema cache" } };
      return { data: Object.assign({ id: body.id || 'av-1' }, body), error: null };
    }
    return { data: null, error: null };
  };
  const mk = ops => { const b = {}; ['schema','from','select','insert','update','upsert','delete','eq','is','in','order','limit','maybeSingle','single','ilike','range','neq'].forEach(m => b[m] = (...a) => mk(ops.concat([[m, a]]))); b.rpc = () => mk(ops.concat([['rpc', []]])); b.then = (res, rej) => Promise.resolve(handler(ops)).then(res, rej); return b; };
  S.mode = 'supabase'; S.sb = mk([]); S.session = { id: 'u-1', email: 'x@y.z' };
  const base = { direccion: 'Arenales 1000', unidad: '5 A', zona: 'Retiro', barrio: 'Retiro', operacion: 'mediano', precio: 1400, fotos: [{ url: 'https://x/1.jpg' }] };
  const res = {};
  modo = 'sin23'; let a = await S.saveAviso(Object.assign({}, base, { disponible_desde: '2026-11-01' })); res.caso1 = { id: a.id, dd: a.disponible_desde, log: log.splice(0) };
  res.flag = !!S._sinDisponibleDesde;
  a = await S.saveAviso(Object.assign({}, base, { id: 'av-1', disponible_desde: '2026-11-02' })); res.caso2_noManda = log.splice(0);
  S._sinDisponibleDesde = false; modo = 'colSelect'; a = await S.saveAviso(Object.assign({}, base, { disponible_desde: '2026-11-01' })); res.caso3_colSelect = log.splice(0);
  S._sinDisponibleDesde = false; modo = 'con23'; a = await S.saveAviso(Object.assign({}, base, { disponible_desde: '' })); res.caso4_vacioEsNull = log.splice(0);
  modo = 'con23'; a = await S.saveAviso(Object.assign({}, base, { disponible_desde: '2026-11-01' })); res.caso5_con23 = log.splice(0).concat(['devuelto ' + a.disponible_desde]);
  modo = 'sin23'; a = await S.saveAviso(Object.assign({}, base)); res.caso6_sinCampo = log.splice(0);
  try { modo = 'colSelect'; S._sinDisponibleDesde = false; const h0 = handler; } catch (e) {}
  return res;
})()`);
console.log(JSON.stringify(r, null, 1), JSON.stringify({ e: c.errores, k: c.consola }));
await c.cerrar(); process.exit(0);
