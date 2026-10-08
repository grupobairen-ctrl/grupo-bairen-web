/* Pruebas de la tanda "servidor" del lanzamiento (8/10/2026). Sin red: Supabase y Cloudflare Turnstile se simulan.
   Uso, desde la raíz del repo:
     node portal/test/servidor-lanzamiento.mjs
       Solo node: alertas por mail contra D.filter (moneda y todo incluido), tope de portal-traducir, orígenes de
       portal-notify y portal-sync con PORTAL_ORIGENES, ruta /portal/guardados y la CSP de vercel.json.
     BASE=http://127.0.0.1:8097/portal/ CDP=http://127.0.0.1:9247 node portal/test/servidor-lanzamiento.mjs
       Además, en un Chrome con --remote-debugging-port y el dev server (PORT=8097 node portal/test/dev-server.mjs):
       ingresar.html sin captcha y con captcha (token, espera, reenvío, error, vencido, casilla a la vista, rechazo de
       Supabase), con la CSP de vercel.json puesta en la respuesta; y el respaldo de disponible_desde y vistas_de en
       store.js. El SDK de Supabase y el script de Turnstile se reemplazan por simulaciones (Fetch de CDP); cualquier
       pedido a *.supabase.co o a Cloudflare que no sea el simulado se corta y la prueba falla.
     SHOTS=<carpeta>  guarda capturas de ingresar.html con y sin captcha, en compu y en celular. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import vm from 'node:vm';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const resultados = [];
const ok = (nombre, cond, detalle) => { resultados.push({ nombre, ok: !!cond }); console.log(`${cond ? 'OK   ' : 'FALLA'} ${nombre}${detalle != null && detalle !== '' ? ' · ' + detalle : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── 1. Alertas por mail: mismas reglas que el catálogo ─────────────────────────── */
console.log('\n1 · Alertas por mail contra D.filter (portal/js/data.js)');
{
  const AL = require(join(RAIZ, 'api/_portal/alertas.js'));
  const win = { BP: { isFav: () => false, diasDesde: iso => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)) : null, t: (k, d) => d, tf: (k, d) => d, lang: 'es' } };
  const ctx = vm.createContext({ window: win, console, URL, Date, Math, JSON, Promise, setTimeout, Object, Array, String, Number, RegExp });
  vm.runInContext(readFileSync(join(RAIZ, 'portal/js/data.js'), 'utf8'), ctx);
  const D = win.BPData;
  const hoy = new Date().toISOString();
  let n = 0;
  const fila = o => Object.assign({ id: 'a' + (++n), codigo: 'BA-' + n, slug: 's' + n, operacion: 'alquiler', tipo: 'Departamento', titulo: 'Aviso ' + n, direccion: 'Calle ' + n, unidad: '', barrio: 'Palermo', zona: 'Palermo', ciudad: 'Capital Federal', precio: 1000, moneda: 'USD', expensas: null, m2_total: 50, ambientes: 2, dormitorios: 1, banos: 1, cocheras: 0, antiguedad: 10, amoblado: false, amenities: [], caracteristicas: [], cualidades_verificadas: [], descripcion: 'texto', video_url: null, estado: 'disponible', publicado_en: hoy, created_at: hoy, publicadores: { slug: 'inmo-uno', tipo: 'profesional' } }, o);
  const FILAS = [
    fila({ operacion: 'alquiler', precio: 900, moneda: 'USD', expensas: 80000 }),
    fila({ operacion: 'alquiler', precio: 850000, moneda: 'ARS', expensas: 120000 }),
    fila({ operacion: 'alquiler', precio: 1200000, moneda: 'ARS', expensas: null }),
    fila({ operacion: 'alquiler', precio: 700, moneda: 'USD', expensas: null }),
    fila({ operacion: 'alquiler', precio: 1100, moneda: null, expensas: 50000 }),   /* sin moneda: cuenta como USD, igual que fromStore */
    fila({ operacion: 'alquiler', precio: 950, moneda: 'USD', expensas: null, caracteristicas: ['Expensas incluidas'] }),
    fila({ operacion: 'mediano', precio: 1500, moneda: 'USD', expensas: null, publicadores: { slug: 'bairen', tipo: 'gestor' } }),   /* todo incluido: BAIREN REALTY */
    fila({ operacion: 'mediano', precio: 1400, moneda: 'USD', expensas: null, publicadores: { slug: 'otra-gestora', tipo: 'gestor' } }),   /* mediano de otra empresa, sin dato: no */
    fila({ operacion: 'mediano', precio: 1300, moneda: 'USD', expensas: null, caracteristicas: ['Expensas incluidas', 'Servicios incluidos'], publicadores: { slug: 'otra-gestora', tipo: 'gestor' } }),
    fila({ operacion: 'mediano', precio: 1250, moneda: 'USD', expensas: 300000, publicadores: { slug: 'otra-gestora', tipo: 'gestor' } }),
    fila({ operacion: 'venta', precio: 250000, moneda: 'USD', expensas: 150000, publicadores: { slug: 'duena', tipo: 'dueno' } }),
    fila({ operacion: 'alquiler', precio: 800, moneda: 'USD', expensas: 60000, publicadores: null }),   /* sin publicador: el catálogo no lo muestra */
  ];
  const FILTROS = [
    {}, { op: 'alquiler' }, { op: 'largo' }, { op: 'mediano' }, { op: 'venta' },
    { op: 'largo', pmin: 500, pmax: 1000 }, { op: 'largo', pmin: 500, pmax: 1000, mon: '' },
    { op: 'largo', pmax: 1000000, mon: 'ARS' }, { op: 'largo', pmin: 1000000, mon: 'ARS' }, { op: 'largo', mon: 'ARS' },
    { op: 'alquiler', pmax: 2000 }, { op: 'alquiler', pmax: 2000000, mon: 'ARS' },
    { op: 'alquiler', expmax: 100000 }, { op: 'mediano', expmax: 1 }, { op: 'largo', expmax: 1 }, { expmax: 200000 },
    { op: 'alquiler', pmax: 1000, expmax: 90000 }, { op: 'venta', pmin: 200000, pmax: 300000 }, { op: 'venta', pmax: 300000, mon: 'ARS' },
  ];
  const visible = a => !!(a.publicadorId && D.PUBLICADORES[a.publicadorId]);   /* D.load */
  const modelos = [];
  for (const r of FILAS) modelos.push(await D.fromStore(Object.assign({}, r, { publicador: r.publicadores ? { slug: r.publicadores.slug, tipo: r.publicadores.tipo, nombre: r.publicadores.slug, verificado: true } : null })));
  let difs = [];
  for (const f of FILTROS) {
    const cli = FILAS.map((r, i) => visible(modelos[i]) && D.filter([modelos[i]], f).length === 1);
    const srv = FILAS.map(r => AL.cumpleFiltros(r, f));
    cli.forEach((c, i) => { if (c !== srv[i]) difs.push(JSON.stringify(f) + ' fila ' + (i + 1) + ': catálogo ' + c + ', alerta ' + srv[i]); });
  }
  ok('alertas y catálogo dan lo mismo en ' + FILTROS.length + ' filtros por ' + FILAS.length + ' avisos', !difs.length, difs.slice(0, 3).join(' | '));
  ok('rango en USD no trae avisos en pesos', !AL.cumpleFiltros(FILAS[1], { op: 'largo', pmin: 500, pmax: 1000000 }) && AL.cumpleFiltros(FILAS[0], { op: 'largo', pmin: 500, pmax: 1000000 }));
  ok('rango en pesos no trae avisos en dólares', AL.cumpleFiltros(FILAS[1], { op: 'largo', pmax: 1000000, mon: 'ARS' }) && !AL.cumpleFiltros(FILAS[3], { op: 'largo', pmax: 1000000, mon: 'ARS' }));
  ok('sin rango de precio, mon no filtra', AL.cumpleFiltros(FILAS[1], { op: 'largo', mon: '' }) && AL.cumpleFiltros(FILAS[0], { op: 'largo', mon: 'ARS' }));
  ok('expensas máximas: sin dato no entra; todo incluido sí', !AL.cumpleFiltros(FILAS[3], { expmax: 1 }) && AL.cumpleFiltros(FILAS[6], { expmax: 1 }) && AL.cumpleFiltros(FILAS[8], { expmax: 1 }) && !AL.cumpleFiltros(FILAS[7], { expmax: 1 }) && AL.cumpleFiltros(FILAS[5], { expmax: 1 }));
  ok('todo incluido: mediano de bairen o con expensas y servicios incluidos', AL.todoIncluido(AL.modelo(FILAS[6])) && AL.todoIncluido(AL.modelo(FILAS[8])) && !AL.todoIncluido(AL.modelo(FILAS[7])) && !AL.todoIncluido(AL.modelo(FILAS[5])));
  ok('sin publicador no entra (antes caía en bairen)', !AL.cumpleFiltros(FILAS[11], {}) && AL.modelo(FILAS[11]).publicadorId === null);
  ok('mon ya no figura como clave ignorada', AL.clavesIgnoradas({ mon: 'ARS', pmax: 5 }).length === 0);
}

/* ── 2. Traducción: solo con sesión y con tope por IP por día ────────────────────── */
console.log('\n2 · api/portal-traducir.js');
{
  const fetchReal = globalThis.fetch;
  let llamadasMyMemory = 0;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) { const a = (opts && opts.headers && opts.headers.Authorization) || ''; return a === 'Bearer sesion-buena' ? new Response(JSON.stringify({ id: 'u1', email: 'x@y.z' }), { status: 200 }) : new Response('{}', { status: 401 }); }
    if (u.includes('mymemory')) { llamadasMyMemory++; return new Response(JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'hola traducido' } }), { status: 200 }); }
    throw new Error('red no simulada: ' + u);
  };
  delete process.env.DEEPL_API_KEY;
  const T = require(join(RAIZ, 'api/portal-traducir.js'));
  const llamar = async (headers, body) => { const out = {}; const res = { setHeader() {}, status(c) { out.status = c; return res; }, json(j) { out.json = j; return res; } }; await T({ method: 'POST', headers, body: body === undefined ? { titulo: 'Hola', descripcion: 'Un texto.' } : body }, res); return out; };
  const sin = await llamar({ 'x-forwarded-for': '1.1.1.1' });
  ok('sin sesión: 401 en castellano', sin.status === 401 && /iniciar sesión/.test(sin.json.error), sin.json && sin.json.error);
  const mala = await llamar({ 'x-forwarded-for': '1.1.1.1', authorization: 'Bearer vencida' });
  ok('con un token que Auth no reconoce: 401', mala.status === 401);
  const tope = T._interno.TOPE_DIA; let todosOk = true;
  for (let i = 0; i < tope; i++) { const r = await llamar({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1', authorization: 'Bearer sesion-buena' }); if (r.status !== 200) todosOk = false; }
  ok(`con sesión: ${tope} traducciones en el día`, todosOk);
  const pasada = await llamar({ 'x-forwarded-for': '2.2.2.2', authorization: 'Bearer sesion-buena' });
  ok('la siguiente de la misma IP: 429 en castellano', pasada.status === 429 && /tope de traducciones/.test(pasada.json.error), pasada.json && pasada.json.error);
  const otra = await llamar({ 'x-forwarded-for': '3.3.3.3', authorization: 'Bearer sesion-buena' });
  ok('otra IP sigue pudiendo', otra.status === 200);
  const nowReal = Date.now; Date.now = () => nowReal() + 24 * 3600 * 1000;
  const manana = await llamar({ 'x-forwarded-for': '2.2.2.2', authorization: 'Bearer sesion-buena' });
  Date.now = nowReal;
  ok('al día siguiente se libera', manana.status === 200 && ![...T._interno.usos.keys()].some(k => !k.startsWith(new Date(nowReal() + 21 * 3600 * 1000).toISOString().slice(0, 10))));
  const rota = await llamar({ 'x-forwarded-for': '4.4.4.4', authorization: 'Bearer sesion-buena' }, '{no es json');
  ok('cuerpo roto: 400, no 500', rota.status === 400);
  globalThis.fetch = fetchReal;
}

/* ── 3. Orígenes de portal-notify y portal-sync ──────────────────────────────────── */
console.log('\n3 · Orígenes (PORTAL_ORIGENES) en portal-notify y portal-sync');
{
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async url => { throw new Error('red no simulada: ' + url); };
  const limpiar = () => Object.keys(require.cache).forEach(k => { if (k.includes(join('api', '_portal')) || k.includes('portal-notify') || k.includes('portal-sync')) delete require.cache[k]; });
  const llamar = async (h, origin, method) => { const out = { headers: {} }; const res = { statusCode: 200, setHeader(k, v) { out.headers[k.toLowerCase()] = v; }, end(b) { out.status = res.statusCode; out.body = b; } }; await h({ method: method || 'POST', headers: origin ? { origin } : {}, body: {} }, res); return out; };
  delete process.env.RESEND_API_KEY; delete process.env.PORTAL_NOTIFY_KEY; delete process.env.CRON_SECRET;
  limpiar(); delete process.env.PORTAL_ORIGENES;
  let notify = require(join(RAIZ, 'api/portal-notify.js')), sync = require(join(RAIZ, 'api/portal-sync.js'));
  ok('sin PORTAL_ORIGENES, bairen-portal.vercel.app no pasa', (await llamar(notify, 'https://bairen-portal.vercel.app')).status === 403 && (await llamar(sync, 'https://bairen-portal.vercel.app')).status === 403);
  limpiar(); process.env.PORTAL_ORIGENES = 'https://bairen-portal.vercel.app';
  notify = require(join(RAIZ, 'api/portal-notify.js')); sync = require(join(RAIZ, 'api/portal-sync.js'));
  const n1 = await llamar(notify, 'https://bairen-portal.vercel.app'), s1 = await llamar(sync, 'https://bairen-portal.vercel.app');
  ok('con PORTAL_ORIGENES=https://bairen-portal.vercel.app pasa el origen (notify sigue a 501 sin Resend, sync a 401 sin clave)', n1.status === 501 && s1.status === 401, `notify ${n1.status}, sync ${s1.status}`);
  ok('y responde CORS a ese origen', n1.headers['access-control-allow-origin'] === 'https://bairen-portal.vercel.app' && s1.headers['access-control-allow-origin'] === 'https://bairen-portal.vercel.app');
  const malos = ['https://bairen-portal-evil.vercel.app', 'https://bairen-portal.vercel.app.evil.com', 'http://bairen-portal.vercel.app', 'https://evilbairen-portal.vercel.app', 'https://bairen-portal-git-main-x.vercel.app'];
  const r = []; for (const o of malos) r.push((await llamar(notify, o)).status, (await llamar(sync, o)).status);
  ok('parecidos y vistas previas no pasan (403)', r.every(s => s === 403), r.join(','));
  ok('los de siempre siguen (portal.bairengroup.com)', (await llamar(notify, 'https://portal.bairengroup.com')).status === 501);
  limpiar(); delete process.env.PORTAL_ORIGENES; globalThis.fetch = fetchReal;
}

/* ── 4. Ruta limpia y CSP en vercel.json ─────────────────────────────────────────── */
console.log('\n4 · vercel.json');
const VJ = JSON.parse(readFileSync(join(RAIZ, 'vercel.json'), 'utf8'));
const cspDe = vj => vj.headers.find(h => h.source === '/portal/:path*').headers.find(h => h.key === 'Content-Security-Policy').value;
const CSP = cspDe(VJ);
{
  const rw = VJ.rewrites.find(r => r.source.startsWith('/portal/:page('));
  const re = new RegExp('^/portal/(' + /\(([^)]*)\)/.exec(rw.source)[1] + ')$');
  ok('rewrite /portal/guardados → /portal/guardados.html', re.test('/portal/guardados') && rw.destination === '/portal/:page.html');
  const dev = readFileSync(join(RAIZ, 'portal/test/dev-server.mjs'), 'utf8');
  ok('el dev server tiene la misma ruta', /membership\|guardados\)\$/.test(dev));
  const dir = Object.fromEntries(CSP.split(';').map(s => s.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  ok('CSP: challenges.cloudflare.com en script-src y frame-src', dir['script-src'].includes('https://challenges.cloudflare.com') && dir['frame-src'].includes('https://challenges.cloudflare.com'));
  const otras = Object.entries(dir).filter(([k]) => k !== 'script-src' && k !== 'frame-src').some(([, v]) => v.some(x => /cloudflare/.test(x)));
  ok('CSP: no se abrió nada más (connect-src y el resto, sin Cloudflare)', !otras);
}

/* ── 5. Navegador: ingresar.html y store.js ──────────────────────────────────────── */
const BASE = process.env.BASE, CDP = process.env.CDP, SHOTS = process.env.SHOTS;
if (!BASE || !CDP) {
  console.log('\n5 · Navegador: se saltea (faltan BASE y CDP; ver el comentario del principio)');
} else {
  console.log('\n5 · Navegador: ' + BASE + ' por ' + CDP);
  let CSP_VIEJA = null;
  try { CSP_VIEJA = cspDe(JSON.parse(execSync('git show HEAD~0:vercel.json', { cwd: RAIZ }).toString())); } catch (e) { /* sin git */ }
  if (CSP_VIEJA && CSP_VIEJA.includes('challenges.cloudflare.com')) CSP_VIEJA = CSP_VIEJA.replace(/ https:\/\/challenges\.cloudflare\.com/g, '');
  const destino = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(destino.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); const handlers = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method) handlers.forEach(h => h(m)); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result && r.result.result ? r.result.result.value : undefined; };
  const esperar = async (expr, etiqueta, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch (e) { /* todavía no */ } await sleep(100); } throw new Error('Tiempo agotado: ' + etiqueta); };

  /* Escenario de la página: lo leen las simulaciones al arrancar */
  let escenario = {}; let cspActual = CSP; const cortados = []; const aCloudflare = [];
  /* SDK de Supabase simulado: lo justo para store.js. Anota los pedidos en window.__fake (otp, selects, rpcs). Con
     __escenario.sin23, la columna disponible_desde da 42703 y vistas_de da 404 (PGRST202), como la base sin la 23. */
  const SDK_FALSO = `(function(){
    var E = window.__escenario || {};
    var F = window.__fake = { otp: [], selects: [], rpcs: [], otpErrores: (E.otpErrores || []).slice() };
    var FILA = function(id, extra){ var r = { id: id, codigo: 'BA-X', slug: 'calle-' + id.slice(0, 4), publicador_id: 'p1', operacion: 'mediano', tipo: 'Departamento', titulo: 'Aviso ' + id.slice(0, 4), direccion: 'Calle 123', barrio: 'Palermo', zona: 'Palermo', precio: 1500, moneda: 'USD', estado_curacion: 'publicado', publicado_en: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z', fotos: [], publicadores: { id: 'p1', slug: 'bairen', nombre: 'BAIREN REALTY', tipo: 'gestor', verificado: true } }; if (extra) r.disponible_desde = '2026-11-01'; return r; };
    function responder(q){
      if (q.rpc) { F.rpcs.push(q.rpc); if (E.sin23) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function portal.vistas_de(p_refs) in the schema cache', details: null, hint: null }, status: 404, statusText: 'Not Found' }; return { data: (q.args.p_refs || []).map(function(r){ return { ref: r, vistas: 7 }; }), error: null, status: 200 }; }
      if (q.insert) return { data: null, error: null, status: 201 };
      F.selects.push({ table: q.table, cols: q.cols });
      var conDisp = /disponible_desde/.test(q.cols || '');
      if (q.table === 'avisos' && conDisp && E.sin23) return { data: null, error: { code: '42703', message: 'column avisos.disponible_desde does not exist', details: null, hint: null }, status: 400, count: null };
      if (q.table === 'avisos') { var filas = [FILA('11111111-2222-4333-8444-555555555555', conDisp), FILA('22222222-2222-4333-8444-555555555555', conDisp)]; return { data: q.single ? filas[0] : (q.uno ? filas.slice(0, 1) : filas), error: null, status: 200, count: filas.length }; }
      return { data: q.single ? null : [], error: null, status: 200, count: 0 };
    }
    function consulta(tabla){
      var q = { table: tabla, cols: '' }, b = {};
      ['eq','neq','in','order','range','ilike','is','not','or','gte','lte','gt','lt','contains','filter','match','overlaps'].forEach(function(m){ b[m] = function(){ return b; }; });
      b.select = function(c){ q.cols = c || '*'; return b; };
      b.insert = function(){ q.insert = true; return b; }; b.update = function(){ q.insert = true; return b; }; b.delete = function(){ q.insert = true; return b; }; b.upsert = function(){ q.insert = true; return b; };
      b.limit = function(n){ if (n === 1) q.uno = true; return b; };
      b.maybeSingle = function(){ q.single = true; return b; }; b.single = function(){ q.single = true; return b; };
      b.then = function(ok, ko){ return Promise.resolve(responder(q)).then(ok, ko); };
      return b;
    }
    var api = { from: consulta, rpc: function(fn, args){ return { then: function(ok, ko){ return Promise.resolve(responder({ rpc: fn, args: args || {} })).then(ok, ko); } }; } };
    window.supabase = { createClient: function(){ return {
      schema: function(){ return api; }, from: consulta, rpc: api.rpc,
      storage: { from: function(){ return { getPublicUrl: function(){ return { data: { publicUrl: '' } }; } }; } },
      auth: {
        getUser: function(){ return Promise.resolve({ data: { user: null }, error: null }); },
        getSession: function(){ return Promise.resolve({ data: { session: null }, error: null }); },
        onAuthStateChange: function(){ return { data: { subscription: { unsubscribe: function(){} } } }; },
        signInWithOtp: function(args){ F.otp.push(JSON.parse(JSON.stringify(args))); var e = F.otpErrores.shift(); return Promise.resolve({ data: {}, error: e || null }); },
        verifyOtp: function(){ return Promise.resolve({ data: { user: null }, error: { message: 'Token has expired or is invalid' } }); },
        signInWithOAuth: function(){ return Promise.resolve({ error: null }); }, signOut: function(){ return Promise.resolve({}); }
      } }; } };
  })();`;
  /* Turnstile simulado. __escenario.turnstile: 'ok' (token a los __escenario.demora ms), 'error' (error-callback) o
     'interactivo' (pide la casilla: before-interactive-callback y un iframe visible; __ts.resolver() la "toca").
     __ts.expirar() vence el token y a los 300 ms llega otro. Cada token es tok-1, tok-2… */
  const TURNSTILE_FALSO = `(function(){
    var E = window.__escenario || {};
    var T = window.__ts = { renders: [], resets: 0, n: 0, modo: E.turnstile || 'ok', w: null };
    function correr(w){
      if (T.modo === 'error') { setTimeout(function(){ w.o['error-callback'] && w.o['error-callback']('300030'); }, 250); return; }
      if (T.modo === 'interactivo') { setTimeout(function(){ w.o['before-interactive-callback'] && w.o['before-interactive-callback'](); w.f.style.cssText = 'border:0;width:100%;height:65px;display:block'; }, 200); return; }
      setTimeout(function(){ w.token = 'tok-' + (++T.n); w.o.callback && w.o.callback(w.token); }, E.demora || 600);
    }
    window.turnstile = {
      render: function(el, o){ var w = T.w = { el: typeof el === 'string' ? document.querySelector(el) : el, o: o, token: '' };
        T.renders.push({ sitekey: o.sitekey, appearance: o.appearance, size: o.size, theme: o.theme, language: o.language, execution: o.execution });
        w.f = document.createElement('iframe'); w.f.title = 'Turnstile simulado'; w.f.src = 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/simulado'; w.f.style.cssText = 'display:none'; w.el.appendChild(w.f);
        correr(w); return 'w1'; },
      reset: function(){ T.resets++; T.w.token = ''; correr(T.w); },
      getResponse: function(){ return T.w ? T.w.token : undefined; }, isExpired: function(){ return false; }, remove: function(){}, execute: function(){}
    };
    T.resolver = function(){ var w = T.w; w.f.style.cssText = 'display:none'; w.o['after-interactive-callback'] && w.o['after-interactive-callback'](); w.token = 'tok-' + (++T.n); w.o.callback(w.token); };
    T.expirar = function(){ var w = T.w; w.token = ''; w.o['expired-callback'] && w.o['expired-callback'](); setTimeout(function(){ w.token = 'tok-' + (++T.n); w.o.callback(w.token); }, 300); };
  })();`;
  const CASILLA = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#232323;color:#fff;font:14px system-ui;display:flex;align-items:center;gap:10px;height:63px;padding:0 14px;border:1px solid #444;box-sizing:border-box"><span style="width:22px;height:22px;border:2px solid #aaa;border-radius:3px;display:inline-block"></span>Verificá que sos una persona (simulado)</body>';
  const b64 = s => Buffer.from(s).toString('base64');
  handlers.push(async m => {
    if (m.method !== 'Fetch.requestPaused') return;
    const p = m.params, u = p.request.url;
    try {
      if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(u)) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: b64(SDK_FALSO) });
      if (/challenges\.cloudflare\.com/.test(u)) {
        aCloudflare.push(u);
        if (/turnstile\/v0\/api\.js/.test(u)) return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: b64(TURNSTILE_FALSO) });
        return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: b64(CASILLA) });
      }
      if (/supabase\.co|cloudflare/.test(u)) { cortados.push(u); return await send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }); }
      if (p.responseStatusCode != null && /\/portal\/(supabase-portal\.js|ingresar\.html)/.test(u)) {
        const cuerpo = await send('Fetch.getResponseBody', { requestId: p.requestId });
        let txt = cuerpo.result.base64Encoded ? Buffer.from(cuerpo.result.body, 'base64').toString('utf8') : cuerpo.result.body;
        let headers = (p.responseHeaders || []).filter(h => h.name.toLowerCase() !== 'content-length');
        if (/supabase-portal\.js/.test(u) && escenario.sitekey) txt = txt.replace("const PORTAL_CAPTCHA_SITEKEY = '';", `const PORTAL_CAPTCHA_SITEKEY = '${escenario.sitekey}';`);
        if (/ingresar\.html/.test(u)) headers.push({ name: 'Content-Security-Policy', value: cspActual });
        return await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: p.responseStatusCode, responseHeaders: headers, body: b64(txt) });
      }
      await send('Fetch.continueRequest', { requestId: p.requestId });
    } catch (e) { console.log('  (intercepción) ' + e.message); }
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Fetch.enable', { patterns: [
    { urlPattern: '*cdn.jsdelivr.net/npm/@supabase*', requestStage: 'Request' }, { urlPattern: '*supabase.co*', requestStage: 'Request' },
    { urlPattern: '*cloudflare*', requestStage: 'Request' }, { urlPattern: '*/portal/supabase-portal.js*', requestStage: 'Response' }, { urlPattern: '*/portal/ingresar.html*', requestStage: 'Response' } ] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('bairen_lang','es')}catch(e){} window.__csp=[]; document.addEventListener('securitypolicyviolation', function(e){ window.__csp.push(e.violatedDirective + ' ' + e.blockedURI); });" });
  let scriptEsc = null;
  const abrir = async (esc, url, compu = true) => {
    escenario = esc;
    if (scriptEsc) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptEsc });
    scriptEsc = (await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__escenario = ' + JSON.stringify(esc) + ';' })).result.identifier;
    await send('Emulation.setDeviceMetricsOverride', compu ? { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false } : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: !compu });
    await send('Page.navigate', { url: url || BASE + 'ingresar.html' });
    await esperar('document.readyState === "complete" && !!window.BPStore && BPStore.mode === "supabase" && !!document.getElementById("email") && !document.getElementById("stepMail").hidden', 'formulario de mail');
    await esperar('!document.documentElement.classList.contains("cargando")', 'velo', 9000).catch(() => {});
    await ev("document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('in')); true");
  };
  const captura = async nombre => {
    if (!SHOTS) return; mkdirSync(SHOTS, { recursive: true }); await sleep(350);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (r.result && r.result.data) writeFileSync(join(SHOTS, nombre + '.png'), Buffer.from(r.result.data, 'base64'));
  };
  const pedirCodigo = async mail => ev(`document.getElementById('email').value = ${JSON.stringify(mail || 'prueba@bairen.test')}; document.getElementById('stepMail').requestSubmit(); true`);
  const errorMail = () => ev("(document.getElementById('email-err') && !document.getElementById('email-err').hidden) ? document.getElementById('email-err').textContent : ''");
  const MSG = 'No pudimos verificar que sos una persona. Probá de nuevo.';
  const OBSERVAR_BOTON = "window.__textosBoton = []; new MutationObserver(() => window.__textosBoton.push(document.getElementById('btnMail').textContent)).observe(document.getElementById('btnMail'), { childList: true, characterData: true, subtree: true }); true";

  try {
    /* 5.1 sin captcha: exactamente como antes */
    for (const compu of [true, false]) {
      aCloudflare.length = 0;
      await abrir({}, null, compu);
      await captura('sin-captcha-' + (compu ? 'compu' : 'celular'));
      if (compu) {
        await ev(OBSERVAR_BOTON);
        await pedirCodigo();
        await esperar('!document.getElementById("stepCode").hidden', 'paso del código');
        const otp = await ev('window.__fake.otp');
        ok('sin clave: no se pide nada a Cloudflare ni hay widget', aCloudflare.length === 0 && await ev("!document.querySelector('script[src*=\"challenges.cloudflare.com\"]') && document.getElementById('captcha').hidden && !window.turnstile"));
        ok('sin clave: signInWithOtp con las opciones de siempre (sin captchaToken)', otp.length === 1 && JSON.stringify(Object.keys(otp[0].options).sort()) === '["emailRedirectTo","shouldCreateUser"]' && otp[0].email === 'prueba@bairen.test', JSON.stringify(otp[0] && otp[0].options));
        ok('sin clave: el botón no pasa por "Verificando…"', !(await ev('window.__textosBoton || []')).includes('Verificando…'));
      }
    }

    /* 5.2 con captcha: el botón espera el token, el token viaja, el reenvío usa otro */
    aCloudflare.length = 0;
    await abrir({ sitekey: 'clave-de-prueba', turnstile: 'ok', demora: 1500 });
    await esperar('window.__ts && window.__ts.renders.length === 1', 'widget dibujado');
    const render = await ev('window.__ts.renders[0]');
    ok('con clave: carga Turnstile (render explícito) y dibuja el widget', aCloudflare.some(u => /turnstile\/v0\/api\.js\?render=explicit/.test(u)) && render.sitekey === 'clave-de-prueba', aCloudflare[0]);
    ok('con clave: widget discreto (interaction-only, ancho del formulario)', render.appearance === 'interaction-only' && render.size === 'flexible' && (render.execution == null || render.execution === 'render'), JSON.stringify(render));
    await captura('con-captcha-compu');   /* antes de que llegue el token: el widget invisible no cambia nada */
    await ev(OBSERVAR_BOTON);
    await pedirCodigo();
    await esperar("document.getElementById('btnMail').textContent === 'Verificando…'", 'el botón espera el token', 3000);
    ok('con clave: si el token no llegó, el botón dice Verificando… y no pide el código todavía', (await ev('window.__fake.otp.length')) === 0);
    await esperar('!document.getElementById("stepCode").hidden', 'paso del código');
    let otp = await ev('window.__fake.otp');
    ok('con clave: el token viaja en signInWithOtp (options.captchaToken)', otp.length === 1 && otp[0].options.captchaToken === 'tok-1' && otp[0].options.shouldCreateUser === true && !!otp[0].options.emailRedirectTo, JSON.stringify(otp[0] && otp[0].options));
    ok('con clave: después de usarlo se reinicia el widget', (await ev('window.__ts.resets')) === 1);
    await esperar("window.turnstile.getResponse() === 'tok-2'", 'token nuevo');
    await ev("document.getElementById('again').click(); true");
    await esperar('window.__fake.otp.length === 2', 'reenvío');
    otp = await ev('window.__fake.otp');
    ok('con clave: el reenvío usa un token nuevo', otp[1].options.captchaToken === 'tok-2', otp[1].options.captchaToken);
    ok('con clave: la CSP de vercel.json deja cargar el script y el iframe de Turnstile', (await ev('window.__csp')).length === 0, (await ev('window.__csp')).join(' | '));
    await abrir({ sitekey: 'clave-de-prueba', turnstile: 'ok', demora: 300 }, null, false);
    await esperar("window.turnstile && window.turnstile.getResponse() === 'tok-1'", 'token');
    await captura('con-captcha-celular');
    ok('con clave y token listo: el botón no muestra Verificando…', await (async () => { await ev(OBSERVAR_BOTON); await pedirCodigo(); await esperar('window.__fake.otp.length === 1', 'pedido'); return !(await ev('window.__textosBoton')).includes('Verificando…'); })());

    /* 5.3 el captcha falla: mensaje en castellano, no se pide el código, se puede reintentar */
    for (const compu of [true, false]) {
      await abrir({ sitekey: 'clave-de-prueba', turnstile: 'error' }, null, compu);
      await pedirCodigo();
      await esperar("!!document.getElementById('email-err') && !document.getElementById('email-err').hidden", 'mensaje de error');
      if (compu) {
        ok('captcha con error: "' + MSG + '"', (await errorMail()) === MSG, await errorMail());
        ok('captcha con error: no se pidió el código y el botón vuelve', (await ev('window.__fake.otp.length')) === 0 && await ev("!document.getElementById('btnMail').disabled && document.getElementById('btnMail').textContent === 'Continuar'"));
        await ev("window.__ts.modo = 'ok'; true");
        await pedirCodigo();
        await esperar('window.__fake.otp.length === 1', 'reintento');
        ok('captcha con error: el reintento reinicia el widget y pasa', (await ev('window.__fake.otp[0].options.captchaToken')) === 'tok-1' && (await ev('window.__ts.resets')) >= 1);
      } else await captura('con-captcha-error-celular');
      if (compu) { await abrir({ sitekey: 'clave-de-prueba', turnstile: 'error' }, null, true); await pedirCodigo(); await esperar("!!document.getElementById('email-err') && !document.getElementById('email-err').hidden", 'mensaje'); await captura('con-captcha-error-compu'); }
    }

    /* 5.4 Supabase rechaza el token (captcha prendido allá): mismo mensaje, y el reintento lleva token nuevo */
    await abrir({ sitekey: 'clave-de-prueba', turnstile: 'ok', demora: 200, otpErrores: [{ message: 'captcha protection: request disallowed (timeout-or-duplicate)', code: 'captcha_failed', status: 400 }] });
    await esperar("window.turnstile.getResponse() === 'tok-1'", 'token');
    await pedirCodigo();
    await esperar("!!document.getElementById('email-err') && !document.getElementById('email-err').hidden", 'mensaje');
    ok('Supabase rechaza el captcha: mismo mensaje en castellano', (await errorMail()) === MSG, await errorMail());
    await esperar("window.turnstile.getResponse() === 'tok-2'", 'token nuevo');
    await pedirCodigo();
    await esperar('window.__fake.otp.length === 2 && !document.getElementById("stepCode").hidden', 'segundo pedido');
    ok('Supabase rechaza el captcha: el segundo intento va con otro token y pasa', (await ev('window.__fake.otp[1].options.captchaToken')) === 'tok-2');
    await esperar('window.__fake.otpErrores.length === 0', 'cola de errores vacía').catch(() => {});
    await ev("window.__fake.otpErrores.push({ message: 'captcha protection: request disallowed (timeout-or-duplicate)', code: 'captcha_failed', status: 400 }); document.getElementById('again').click(); true");
    await esperar("!!document.getElementById('code-err') && !document.getElementById('code-err').hidden", 'error del reenvío a la vista');
    ok('reenvío rechazado: el error se ve debajo del código (el mail está oculto)', (await ev("document.getElementById('code-err').textContent")) === MSG);

    /* 5.5 token vencido: se espera el que Turnstile pide solo */
    await abrir({ sitekey: 'clave-de-prueba', turnstile: 'ok', demora: 200 });
    await esperar("window.turnstile.getResponse() === 'tok-1'", 'token');
    await ev('window.__ts.expirar(); true');
    await pedirCodigo();
    await esperar('window.__fake.otp.length === 1', 'pedido');
    ok('token vencido: no se usa; se espera el nuevo', (await ev('window.__fake.otp[0].options.captchaToken')) === 'tok-2');

    /* 5.6 Cloudflare pide tocar la casilla: el widget aparece debajo de Continuar y el botón espera */
    for (const compu of [true, false]) {
      await abrir({ sitekey: 'clave-de-prueba', turnstile: 'interactivo' }, null, compu);
      await esperar("document.querySelector('#captcha iframe') && document.querySelector('#captcha iframe').offsetHeight > 0", 'casilla a la vista');
      const pos = await ev("(() => { const b = document.getElementById('btnMail').getBoundingClientRect(), c = document.getElementById('captcha').getBoundingClientRect(), o = document.querySelector('#social .or').getBoundingClientRect(); return { debajo: c.top >= b.bottom, antesDeGoogle: c.bottom <= o.top, ancho: Math.round(c.width), anchoBoton: Math.round(b.width) }; })()");
      await captura('con-captcha-casilla-' + (compu ? 'compu' : 'celular'));
      if (compu) {
        ok('casilla: aparece entre Continuar y "o Google", del ancho del botón', pos.debajo && pos.antesDeGoogle && Math.abs(pos.ancho - pos.anchoBoton) <= 1, JSON.stringify(pos));
        await pedirCodigo(); await sleep(1200);
        ok('casilla: sin tocarla no se pide el código', (await ev('window.__fake.otp.length')) === 0 && (await ev("document.getElementById('btnMail').textContent")) === 'Verificando…');
        await ev('window.__ts.resolver(); true');
        await esperar('window.__fake.otp.length === 1', 'pedido después de la casilla');
        ok('casilla: al tocarla sigue sola con el token', (await ev('window.__fake.otp[0].options.captchaToken')) === 'tok-1');
      }
    }

    /* 5.7 control: con la CSP de antes (sin Cloudflare) el navegador lo bloquea, o sea que la prueba de 5.2 mide algo */
    if (CSP_VIEJA) {
      cspActual = CSP_VIEJA;
      escenario = { sitekey: 'clave-de-prueba', turnstile: 'ok' };
      if (scriptEsc) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptEsc });
      scriptEsc = (await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__escenario = ' + JSON.stringify(escenario) + ';' })).result.identifier;
      await send('Page.navigate', { url: BASE + 'ingresar.html' });
      await esperar('document.readyState === "complete" && window.__csp && window.__csp.length > 0', 'violación de CSP', 6000).catch(() => {});
      ok('control: con la CSP vieja, Turnstile queda bloqueado', (await ev('window.__csp.length')) > 0 && await ev('!window.turnstile'), (await ev('window.__csp')).join(' | '));
      cspActual = CSP;
    }

    /* 5.8 store.js: disponible_desde y vistas_de con y sin la migración 23 */
    const UUID = '11111111-2222-4333-8444-555555555555';
    await abrir({ sin23: true });
    await ev('sessionStorage.clear(); window.__fake.selects = []; window.__fake.rpcs = []; true');
    let l = await ev('BPStore.publishedAvisos().then(r => r.length)');
    let sel = await ev('window.__fake.selects.filter(s => s.table === "avisos")');
    ok('sin la 23: el catálogo pide con la columna, la base dice que no existe y repite sin ella', l === 2 && sel.length === 2 && /disponible_desde/.test(sel[0].cols) && !/disponible_desde/.test(sel[1].cols), sel.map(s => /disponible_desde/.test(s.cols)).join(','));
    ok('sin la 23: queda anotado en sessionStorage', (await ev("sessionStorage.getItem('bp_sin_disponible_desde')")) === '1' && (await ev('BPStore.hayDisponibleDesde()')) === false);
    await ev('window.__fake.selects = []; true');
    await ev(`BPStore.publishedAvisos().then(() => BPStore.avisoPublicado('${UUID}')).then(() => BPStore.getAviso('${UUID}')).then(() => true)`);
    sel = await ev('window.__fake.selects.filter(s => s.table === "avisos")');
    ok('sin la 23, ya sabido: catálogo, ficha y aviso, un pedido cada uno y sin la columna', sel.length === 3 && sel.every(s => !/disponible_desde/.test(s.cols)), sel.length + ' pedidos');
    await ev('window.__fake.rpcs = []; true');
    await ev("BPStore.vistasDe(['a1','a2']).then(() => BPStore.vistasDe(['a1'])).then(() => BPStore.addVista('a1').catch(() => null)).then(() => true)");
    ok('sin la 23: vistas_de da 404 una vez y no se vuelve a llamar en la visita', (await ev('window.__fake.rpcs.length')) === 1 && (await ev("sessionStorage.getItem('bp_sin_vistas_de')")) === '1', (await ev('window.__fake.rpcs.length')) + ' llamadas');
    ok('sin la 23: la ficha no muestra el número (addVista lanza como antes)', await ev("BPStore.addVista('a1').then(() => false, () => true)"));
    await ev(`sessionStorage.clear(); true`);
    await abrir({ sin23: true });
    await ev('window.__fake.selects = []; true');
    const ficha = await ev(`BPStore.avisoPublicado('${UUID}').then(a => a && a.id)`);
    sel = await ev('window.__fake.selects.filter(s => s.table === "avisos")');
    ok('sin la 23, visita nueva entrando por la ficha: dos pedidos y la ficha sale igual', ficha === UUID && sel.length === 2, sel.length + ' pedidos');

    await abrir({ sin23: false });
    await ev('sessionStorage.clear(); window.__fake.selects = []; window.__fake.rpcs = []; true');
    const lista = await ev('BPStore.publishedAvisos()');
    const a1 = await ev(`BPStore.avisoPublicado('${UUID}')`);
    const a2 = await ev(`BPStore.getAviso('${UUID}')`);
    sel = await ev('window.__fake.selects.filter(s => s.table === "avisos")');
    ok('con la 23: un pedido por consulta, con la columna', sel.length === 3 && sel.every(s => /,disponible_desde,fotos\(/.test(s.cols)), sel.map(s => s.cols.slice(-60)).join(' | '));
    ok('con la 23: el dato llega a la lista, la ficha y el aviso', lista[0].disponible_desde === '2026-11-01' && a1.disponible_desde === '2026-11-01' && a2.disponible_desde === '2026-11-01');
    ok('con la 23: nada anotado como faltante', (await ev("sessionStorage.getItem('bp_sin_disponible_desde')")) === null && (await ev('BPStore.hayDisponibleDesde()')) === true);
    const v = await ev("BPStore.vistasDe(['a1']).then(r => BPStore.vistasDe(['a1'])).then(r => r.a1)");
    ok('con la 23: vistas_de responde y se sigue usando', v === 7 && (await ev('window.__fake.rpcs.length')) === 2);
    ok('ninguna simulación dejó pasar un pedido a Supabase o Cloudflare de verdad', cortados.length === 0, cortados.slice(0, 2).join(' | '));
  } catch (e) {
    ok('navegador: ' + e.message, false);
  } finally {
    await send('Fetch.disable').catch(() => {});
    ws.close();
    await fetch(CDP + '/json/close/' + destino.id).catch(() => {});
  }
}

const fallas = resultados.filter(r => !r.ok);
console.log(`\n${resultados.length - fallas.length} de ${resultados.length} bien${fallas.length ? '; fallan: ' + fallas.map(f => f.nombre).join(' / ') : ''}`);
process.exit(fallas.length ? 1 : 0);
