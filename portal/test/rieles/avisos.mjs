/* Pruebas del módulo de avisos y cruce de búsquedas (migración 32, 9/10/2026).
   Uso, desde la raíz del repo, con el servidor y el Chrome propios levantados:
     BP_PUERTO=8204 BP_CHROME=9404 BP_CAPTURAS=/tmp/bp-avisos node portal/test/rieles/avisos.mjs mobile
     BP_PUERTO=8204 BP_CHROME=9404 BP_CAPTURAS=/tmp/bp-avisos node portal/test/rieles/avisos.mjs desktop
     node portal/test/rieles/avisos.mjs servidor        (api/portal-avisos.js con la base y Resend simulados)
   Modo local (Supabase bloqueado): la campana, avisos.html, los avisos que crean mensajes, pasos, propuestas y el cruce,
   las preferencias, los vacíos y los errores. Sale con 1 si algo falla. */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const modo = process.argv[2] || 'mobile';
const R = [];
const ok = (caso, cond, det) => { R.push({ caso, ok: !!cond, det }); console.log((cond ? 'OK    ' : 'FALLA ') + caso + (det != null && !cond ? '  :: ' + JSON.stringify(det).slice(0, 300) : '')); };
const fin = () => { const f = R.filter(r => !r.ok).length; console.log(`\nRESULTADO ${modo}: ${R.length - f} OK, ${f} FALLAS`); process.exit(f ? 1 : 0); };

/* ── Servidor: api/portal-avisos.js con fetch simulado ─────────────────────────────── */
if (modo === 'servidor') {
  const require = createRequire(import.meta.url);
  const RAIZ = decodeURIComponent(new URL('../../../', import.meta.url).pathname);
  const OUT = (process.env.BP_CAPTURAS || '/tmp/bp-avisos') + '/'; mkdirSync(OUT, { recursive: true });
  const cargar = env => {
    ['PORTAL_SUPABASE_SERVICE_KEY', 'CRON_SECRET', 'RESEND_API_KEY', 'PORTAL_MAIL_FROM', 'PORTAL_NOTIFY_KEY', 'PORTAL_SITE'].forEach(k => { delete process.env[k]; });
    Object.assign(process.env, env);
    Object.keys(require.cache).forEach(k => { if (k.indexOf('/api/') > -1) delete require.cache[k]; });
    return require(RAIZ + 'api/portal-avisos.js');
  };
  const llamar = (fn, { method = 'GET', headers = {} } = {}) => new Promise(res => {
    const req = { method, headers, url: '/api/portal-avisos', query: {} }; const h = {};
    const resp = { statusCode: 200, setHeader: (k, v) => { h[k.toLowerCase()] = v; }, end: b => res({ status: resp.statusCode, body: b ? JSON.parse(b) : null, headers: h }) };
    fn(req, resp);
  });
  const PEND = [
    { usuario: 'u1', email: 'uno@prueba.local', ids: [11, 12, 13, 14, 15, 16], items: [
      { id: 11, tipo: 'mensaje', titulo: '3 mensajes nuevos de Lucía P.', texto: '¿Acepta mascotas?', contexto: 'Gorriti 4800', url: 'mensajes.html?op=abc' },
      { id: 12, tipo: 'paso', titulo: 'Visita confirmada', texto: 'El 20/10, 15:00 h.', contexto: 'Gorriti 4800', url: 'mensajes.html?op=abc' },
      { id: 13, tipo: 'coincidencia_pub', titulo: '2 personas buscan algo como tu unidad', texto: 'Mediano plazo · Palermo', contexto: 'Honduras 5000', url: 'avisos.html?aviso=x#coincidencias' },
      { id: 14, tipo: 'propuesta_respondida', titulo: 'Aceptaron tu propuesta', contexto: 'Honduras 5000', url: 'mensajes.html?op=def' },
      { id: 15, tipo: 'paso', titulo: 'Pago recibido', texto: 'USD 1.200', contexto: 'Gorriti 4800', url: 'mensajes.html?op=abc' },
      { id: 16, tipo: 'paso', titulo: 'Reserva pagada <script>alert(1)</script>', contexto: 'Soler 4000', url: 'https://malo.example/x' }] },
    { usuario: 'u2', email: 'dos@prueba.local', ids: [21], items: [{ id: 21, tipo: 'coincidencia', titulo: 'Hay una unidad para tu búsqueda', texto: 'USD 1.100 por mes', contexto: 'Dos ambientes luminoso · Palermo Soho', url: 'propiedad.html?id=a3' }] },
    { usuario: 'u3', email: 'tres@prueba.local', ids: [31], items: [{ id: 31, tipo: 'paso', titulo: 'Reserva <script>alert(1)</script>', texto: '<img src=x onerror=alert(1)>', contexto: 'Soler 4000', url: 'https://malo.example/x' }] }
  ];
  let llamadas = [], resendStatus = 200;
  globalThis.fetch = async (url, op) => {
    const body = op && op.body ? JSON.parse(op.body) : null; llamadas.push({ url: String(url), body, headers: op && op.headers });
    const r = (status, obj) => ({ ok: status < 400, status, headers: { get: () => null }, text: async () => JSON.stringify(obj), json: async () => obj });
    if (/rpc\/calcular_coincidencias/.test(url)) return r(200, { nuevas: 2, avisadas: 2 });
    if (/rpc\/avisos_para_mail/.test(url)) return r(200, PEND);
    if (/rpc\/marcar_mail_enviado/.test(url)) return r(200, (body.p_ids || []).length);
    if (/api\.resend\.com/.test(url)) return r(resendStatus, resendStatus < 400 ? { id: 'x' } : { error: 'falla' });
    if (/auth\/v1\/user/.test(url)) return r(401, {});
    return r(404, {});
  };
  let api = cargar({});
  let x = await llamar(api);
  ok('Sin autorización: 401', x.status === 401, x);
  x = await llamar(api, { headers: { authorization: 'Bearer otra-cosa' } });
  ok('Con un token que no es el del cron: 401', x.status === 401, x);
  api = cargar({ CRON_SECRET: 'cron-123' });
  x = await llamar(api, { headers: { authorization: 'Bearer cron-123' } });
  ok('Cron sin clave de servicio: 503 no configurado', x.status === 503 && x.body.configured === false, x);
  api = cargar({ CRON_SECRET: 'cron-123', PORTAL_SUPABASE_SERVICE_KEY: 'srv' });
  llamadas = [];
  x = await llamar(api, { headers: { authorization: 'Bearer cron-123' } });
  ok('Cron: corre el cruce con la clave de servicio', x.status === 200 && x.body.coincidencias.nuevas === 2
    && llamadas.some(l => /rpc\/calcular_coincidencias/.test(l.url) && l.headers.Authorization === 'Bearer srv'), x.body);
  ok('Sin RESEND_API_KEY: no manda y lo dice', x.body.mail.omitido === true && /RESEND_API_KEY/.test(x.body.mail.motivo) && x.body.mail.personas === 3
    && !llamadas.some(l => /resend/.test(l.url)) && !llamadas.some(l => /marcar_mail_enviado/.test(l.url)), x.body.mail);
  api = cargar({ CRON_SECRET: 'cron-123', PORTAL_SUPABASE_SERVICE_KEY: 'srv', RESEND_API_KEY: 're_x' });
  x = await llamar(api, { headers: { authorization: 'Bearer cron-123' } });
  ok('Sin PORTAL_MAIL_FROM: no manda y lo dice', x.body.mail.omitido === true && /PORTAL_MAIL_FROM/.test(x.body.mail.motivo), x.body.mail);
  api = cargar({ CRON_SECRET: 'cron-123', PORTAL_SUPABASE_SERVICE_KEY: 'srv', RESEND_API_KEY: 're_x', PORTAL_MAIL_FROM: 'BAIREN <avisos@bairengroup.com>', PORTAL_SITE: 'https://portal.bairengroup.com/' });
  llamadas = [];
  x = await llamar(api, { headers: { authorization: 'Bearer cron-123' } });
  const mails = llamadas.filter(l => /resend/.test(l.url)).map(l => l.body);
  const marcas = llamadas.filter(l => /marcar_mail_enviado/.test(l.url)).map(l => l.body.p_ids);
  ok('Un solo mail por persona', x.body.mail.enviados === 3 && mails.length === 3 && mails.every(m => m.to.length === 1), x.body.mail);
  const m1 = mails.find(m => m.to[0] === 'uno@prueba.local') || {}, m2 = mails.find(m => m.to[0] === 'dos@prueba.local') || {}, m3 = mails.find(m => m.to[0] === 'tres@prueba.local') || {};
  ok('Varios avisos: asunto con el número, 4 renglones y "y 2 más"', m1.subject === 'Tenés 6 avisos nuevos en BAIREN' && /y 2 más/.test(m1.html) && /Ver avisos/.test(m1.html), m1.subject);
  ok('Un solo botón (más el enlace para dejar de recibirlos)', (m1.html.match(/<a /g) || []).length === 2 && (m2.html.match(/<a /g) || []).length === 2);
  ok('Un aviso: el título es el asunto y el botón lleva directo', m2.subject === 'Hay una unidad para tu búsqueda' && m2.html.indexOf('href="https://portal.bairengroup.com/propiedad.html?id=a3"') > -1 && /Ver unidad/.test(m2.html), m2.subject);
  ok('La marca: la palabra del logo en URL absoluta, sin obelisco', /src="https:\/\/portal\.bairengroup\.com\/img\/bairen-marca\.png/.test(m1.html) && !/obelisco|bairen_logo/i.test(m1.html));
  ok('El texto de los avisos va escapado y los links no salen del portal', m3.html && m3.html.indexOf('<script>') < 0 && m3.html.indexOf('<img src=x') < 0 && /&lt;script&gt;/.test(m3.html) && m3.html.indexOf('malo.example') < 0 && m3.html.indexOf('href="https://portal.bairengroup.com/avisos.html"') > -1, m3.html && m3.html.slice(0, 200));
  ok('Versión de texto y remitente', /Ver avisos: https:\/\/portal\.bairengroup\.com\/avisos\.html/.test(m1.text) && m1.from === 'BAIREN <avisos@bairengroup.com>');
  ok('Marca como enviados solo los ids de cada mail', marcas.length === 3 && marcas.some(i => i.join() === '11,12,13,14,15,16') && marcas.some(i => i.join() === '21'), marcas);
  writeFileSync(OUT + 'mail-varios.html', m1.html); writeFileSync(OUT + 'mail-uno.html', m2.html);
  resendStatus = 500; llamadas = [];
  x = await llamar(api, { headers: { authorization: 'Bearer cron-123' } });
  ok('Si Resend falla: no marca nada como enviado', x.body.mail.fallidos === 3 && !llamadas.some(l => /marcar_mail_enviado/.test(l.url)), x.body.mail);
  x = await llamar(api, { method: 'PUT', headers: { authorization: 'Bearer cron-123' } });
  ok('Otro método: 405', x.status === 405, x);
  x = await llamar(api, { headers: { authorization: 'Bearer cron-123', origin: 'https://otro.example' } });
  ok('Otro origen: 403', x.status === 403, x);
  fin();
}

/* ── Front en modo local ─────────────────────────────────────────────────────────────── */
const { conectar, sleep, OUT } = await import('../flujos/cdp.mjs');
const movil = modo !== 'desktop';
const c = await conectar(); const { ev, ir, foto, vista } = c;
await c.send('Page.bringToFront');
await vista(movil);
const pref = movil ? 'm-' : 'd-';
const J = o => JSON.stringify(JSON.stringify(o));
const USR = { ana: { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' }, pablo: { id: 'local-pablo', email: 'pablo@prueba.local', perfil: 'profesional' }, bruno: { id: 'local-bruno', email: 'bruno@prueba.local', perfil: 'busca' }, carla: { id: 'local-carla', email: 'carla@prueba.local', perfil: 'busca' } };
const como = async (k, url = 'index.html', espera = 1500) => { await ev(`localStorage.setItem('bp_user', ${J(USR[k])}); true`); await ir(url, espera); };
const sinScroll = async n => { const w = await ev('[document.documentElement.scrollWidth, innerWidth]'); ok(`${n}: sin scroll horizontal`, w && w[0] <= w[1] + 1, w); };
const esperarQue = async (expr, ms = 4000) => { for (let i = 0; i < ms / 100; i++) { const v = await ev(expr); if (v && !(typeof v === 'string' && v.indexOf('EXC') === 0)) return v; await sleep(100); } return ev(expr); };
const CAMPANA = movil ? '.p-campana-m' : '.p-nav-right .p-campana';

/* Datos de partida: un publicador (Pablo, Gestora Prueba) con tres unidades publicadas */
await ir('index.html', 300);
await ev(`(() => { Object.keys(localStorage).filter(k => /^bp_dg_|^bp_(publicadores|avisos|user)$/.test(k)).forEach(k => localStorage.removeItem(k));
  localStorage.setItem('bp_digital', '1');
  localStorage.setItem('bp_publicadores', ${J([{ id: 'pub-gestora', auth_user_id: 'local-pablo', nombre: 'Gestora Prueba', tipo: 'gestor', slug: 'gestora-prueba', verificado: true, email: 'pablo@prueba.local' }])});
  localStorage.setItem('bp_avisos', ${J([
    { id: 'aviso-1', codigo: 'BP-1', publicador_id: 'pub-gestora', operacion: 'mediano', tipo: 'Departamento', titulo: 'Dos ambientes', direccion: 'Gorriti 4800', barrio: 'Palermo', zona: 'Palermo', ambientes: 2, dormitorios: 1, precio: 1000, moneda: 'USD', estado: 'disponible', estado_curacion: 'publicado', fotos: [] },
    { id: 'aviso-2', codigo: 'BP-2', publicador_id: 'pub-gestora', operacion: 'venta', tipo: 'Departamento', titulo: 'Tres ambientes', direccion: 'Ayacucho 1800', barrio: 'Recoleta', zona: 'Recoleta', ambientes: 3, dormitorios: 2, precio: 200000, moneda: 'USD', estado: 'disponible', estado_curacion: 'publicado', fotos: [] },
    { id: 'aviso-3', codigo: 'BP-3', publicador_id: 'pub-gestora', operacion: 'mediano', tipo: 'Departamento', titulo: 'Dos ambientes luminoso', direccion: 'Honduras 5000', barrio: 'Palermo Soho', zona: 'Otra', ambientes: 2, precio: 900, moneda: 'USD', estado: 'disponible', estado_curacion: 'publicado', fotos: [] }])});
  return true; })()`);

/* 1. Ana consulta y escribe dos veces más: a Pablo le llega un solo aviso con el número */
await como('ana', 'mensajes.html', 1800);
const op = await ev(`(async () => { const id = await BPDigital.abrir({ id: 'aviso-1', publicador_id: 'pub-gestora', operacion: 'mediano', precio: 1000, moneda: 'USD', titulo: 'Dos ambientes', barrio: 'Palermo' }, 'Hola, ¿sigue disponible?');
  await BPDigital.enviar(id, 'interesado', 'Somos dos.'); await BPDigital.enviar(id, 'interesado', '¿Acepta mascotas?'); return id; })()`);
ok('Ana abre la operación', typeof op === 'string' && op.indexOf('EXC') < 0, op);
ok('Ana no recibe avisos de lo que escribe', await ev('BPDigital.noLeidosAvisos()') === 0);
await como('pablo', 'index.html', 2200);
const n1 = await esperarQue(`(() => { const e = document.querySelector('${CAMPANA} .p-campana-n'); return e && !e.hidden ? e.textContent : null; })()`);
ok('Pablo: la campana muestra 1 (tres mensajes, un solo aviso)', n1 === '1', n1);
ok('La campana dice cuántos sin leer', /1 sin leer/.test(await ev(`document.querySelector('${CAMPANA} > button').getAttribute('aria-label')`) || ''));
await ev(`document.querySelector('${CAMPANA} > button').click(); true`); await sleep(700);
const panel = await ev(`(() => { const p = document.querySelector('${CAMPANA} .p-campana-dd'); if (!p || p.hidden) return null; const it = p.querySelector('.p-campana-item'); return { t: it && it.querySelector('b').textContent, ctx: it && it.querySelector('.p-campana-ctx') && it.querySelector('.p-campana-ctx').textContent, hora: it && it.querySelector('time').textContent, nuevo: it && it.classList.contains('nuevo'), href: it && it.getAttribute('href'), todos: !!p.querySelector('a.p-campana-todos[href="avisos.html"]'), expanded: document.querySelector('${CAMPANA} > button').getAttribute('aria-expanded') }; })()`);
ok('Desplegable: título, unidad (dirección para quien publica) y hora', panel && panel.t === '3 mensajes nuevos de Ana' && panel.ctx === 'Gorriti 4800' && !!panel.hora && panel.nuevo, panel);
ok('Desplegable: lleva directo a la conversación y tiene "Ver todos"', panel && panel.href === 'mensajes.html?op=' + op && panel.todos && panel.expanded === 'true', panel);
await foto(pref + '01-campana-pablo');
await sinScroll('Inicio con la campana abierta');
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`); await sleep(300);
ok('Escape cierra el desplegable', await ev(`document.querySelector('${CAMPANA} .p-campana-dd').hidden && document.querySelector('${CAMPANA} > button').getAttribute('aria-expanded') === 'false'`));
if (movil) {
  await ev(`document.querySelector('${CAMPANA} > button').click(); true`); await sleep(600);
  await ev('history.back(); true'); await sleep(600);
  ok('Celular: Atrás cierra el desplegable sin salir de la página', await ev(`document.querySelector('${CAMPANA} .p-campana-dd').hidden && /\/portal\/index\.html$/.test(location.pathname)`));
}
await ev(`document.querySelector('${CAMPANA} > button').click(); true`); await sleep(700);
await ev(`document.querySelector('${CAMPANA} .p-campana-item').click(); true`);
await c.esperarCarga(2200);
ok('Tocar el aviso abre la conversación y lo deja leído', (await ev('location.pathname + location.search')).indexOf('/portal/mensajes.html?op=' + op) === 0 && await ev('BPDigital.noLeidosAvisos()') === 0);

/* 2. Pablo contesta y confirma la visita: a Ana le llegan dos avisos */
await ev(`(async () => { await BPDigital.enviar(${JSON.stringify(op)}, 'publicador', 'Sí, acepta mascotas chicas.'); await BPDigital.paso(${JSON.stringify(op)}, 'visita_confirmada', { fecha: '2026-10-20T15:00:00-03:00', nota: 'Tocar en portería.' }); return true; })()`);
ok('Pablo no recibe avisos de lo que hace', await ev('BPDigital.noLeidosAvisos()') === 0);
await como('ana', 'avisos.html', 2200);
const lista = await esperarQue(`(() => { const l = Array.from(document.querySelectorAll('.p-av-item.nuevo')); return l.length ? l.map(a => a.querySelector('b').textContent + ' | ' + (a.querySelector('.p-av-ctx') || {}).textContent + ' | ' + (a.querySelector('.p-av-txt') || {}).textContent) : null; })()`);
ok('Ana: dos avisos sin leer (el mensaje y la visita)', Array.isArray(lista) && lista.length === 2 && lista.some(s => /^Mensaje nuevo de Gestora Prueba \| Dos ambientes · Palermo/.test(s)) && lista.some(s => /^Visita confirmada \| .* \| El 20\/10, 15:00 h\. Tocar en portería\./.test(s)), lista);
ok('Quien busca no tiene la pestaña de coincidencias', await ev('!document.getElementById("tabC")'));
await foto(pref + '02-avisos-ana', true);
await sinScroll('Avisos de Ana');
await ev(`document.getElementById('btnTodo').click(); true`); await sleep(900);
ok('Marcar todo como leído: la lista queda al día y la campana sin número', await ev(`!document.querySelector('.p-av-item.nuevo') && !!document.querySelector('.p-av-aldia') && document.querySelector('${CAMPANA} .p-campana-n').hidden`));

/* 3. Búsquedas: Bruno y Ana buscan; el cruce les avisa y Pablo ve sus coincidencias agrupadas por unidad */
await como('bruno', 'se-busca.html', 1500);
await ev(`BPDigital.guardarBusqueda({ operacion: 'mediano', zonas: ['Palermo'], ambientes_min: 2, precio_max: 1500, moneda: 'USD' }).then(() => true)`);
await ev(`BPDigital.guardarBusqueda({ operacion: 'venta', linea: 'pozo', zonas: ['Recoleta'] }).then(() => true)`);
const coinB = await ev(`BPDigital.avisos().then(l => l.filter(n => n.tipo === 'coincidencia').map(n => n.contexto + ' | ' + n.url))`);
ok('Bruno: "Hay una unidad para tu búsqueda", con link a la ficha (por zona y por barrio; el pozo no entra en compra)', Array.isArray(coinB) && coinB.length === 2 && coinB.every(s => / \| propiedad\.html\?id=aviso-[13]$/.test(s)), coinB);
await como('ana', 'se-busca.html', 1500);
await ev(`BPDigital.guardarBusqueda({ operacion: 'mediano', zonas: ['Palermo'], ambientes_min: 2, precio_max: 1500, moneda: 'USD' }).then(() => true)`);
const coinA = await ev(`BPDigital.avisos().then(l => l.filter(n => n.tipo === 'coincidencia').map(n => n.url))`);
ok('Ana: no le avisa la unidad que ya consultó', Array.isArray(coinA) && coinA.length === 1 && coinA[0] === 'propiedad.html?id=aviso-3', coinA);
await como('pablo', 'index.html', 2200);
const avP = await ev(`BPDigital.avisos().then(l => l.filter(n => n.tipo === 'coincidencia_pub').map(n => n.titulo + ' | ' + n.contexto + ' | ' + n.texto))`);
ok('Pablo: agrupado por unidad y sin datos de quién busca', Array.isArray(avP) && avP.length === 2 && avP.some(s => /^2 personas buscan algo como tu unidad \| Honduras 5000/.test(s)) && avP.some(s => /^Alguien busca algo como tu unidad \| Gorriti 4800 \| Mediano plazo · 2\+ ambientes · Palermo · hasta USD 1\.500 por mes$/.test(s)) && !avP.some(s => /ana|bruno/i.test(s)), avP);
await ir('avisos.html#coincidencias', 2200);
const unis = await esperarQue(`(() => { const l = Array.from(document.querySelectorAll('.p-av-uni')); return l.length ? l.map(u => u.querySelector('.p-av-uni-t').textContent + ' | ' + u.querySelector('.p-av-uni-ctx').textContent + ' | ' + u.querySelectorAll('button').length + ' ' + u.querySelector('button').textContent) : null; })()`);
ok('Coincidencias por unidad: "N personas buscan algo como …", un solo botón "Ver y proponer"', Array.isArray(unis) && unis.length === 2 && /^2 personas buscan algo como Honduras 5000 \| Palermo Soho · USD 900 por mes \| 1 Ver y proponer$/.test(unis[0]) && /^1 persona busca algo como Gorriti 4800/.test(unis[1]), unis);
ok('La pestaña Coincidencias está abierta y cuenta las unidades', await ev(`document.getElementById('tabC').getAttribute('aria-selected') === 'true' && document.getElementById('nC').textContent === '2'`));
await foto(pref + '03-coincidencias-pablo', true);
await sinScroll('Coincidencias de Pablo');
await ev(`document.querySelector('#u-aviso-3 [data-proponer]').click(); true`); await sleep(700);
const hojaP = await ev(`(() => { const h = document.querySelector('.p-dg-velo.on .p-dg-hoja'); if (!h) return null; return { t: h.querySelector('.p-dg-hoja-t').textContent, ops: h.querySelectorAll('input[name=b]').length, txt: Array.from(h.querySelectorAll('.p-av-bus b')).map(b => b.textContent), primarios: h.querySelectorAll('.p-btn-fill').length }; })()`);
ok('Ver y proponer: la hoja con las búsquedas, sin quién busca, y un solo botón principal', hojaP && hojaP.ops === 2 && hojaP.primarios === 1 && hojaP.txt.every(s => /^Mediano plazo · 2\+ ambientes · Palermo · hasta USD 1\.500 por mes$/.test(s)), hojaP);
await ev(`document.querySelector('#fProp').requestSubmit(); true`); await sleep(400);
ok('Sin elegir: pide elegir una búsqueda', await ev(`!!document.querySelector('#gBus-err') && !document.querySelector('#gBus-err').hidden`));
await foto(pref + '04-hoja-proponer');
await ev(`document.querySelector('.p-dg-hoja input[name=b]').click(); document.getElementById('propMsj').value = 'Está libre desde noviembre.'; document.querySelector('#fProp').requestSubmit(); true`); await sleep(1200);
ok('Propuesta enviada: la tarjeta dice a cuántos se la propuso', await ev(`!document.querySelector('.p-dg-velo.on') && /Propusiste a 1 de 2/.test(document.querySelector('#u-aviso-3').textContent)`));
const props = await ev(`JSON.parse(localStorage.getItem('bp_dg_props') || '[]').map(p => p.id + '|' + p.busqueda_id)`);

/* 4. Quien busca recibe la propuesta y la rechaza: le llega a Pablo */
const propId = (props[0] || '').split('|')[0], busDe = await ev(`JSON.parse(localStorage.getItem('bp_dg_bus')).find(b => b.id === ${JSON.stringify((props[0] || '').split('|')[1])}).usuario`);
const quien = busDe === 'local-ana' ? 'ana' : 'bruno';
await como(quien, 'index.html', 1800);
const rec = await ev(`BPDigital.avisos().then(l => l.filter(n => n.tipo === 'propuesta').map(n => n.titulo + ' | ' + n.texto + ' | ' + n.url))`);
ok('Propuesta nueva: le llega al dueño de la búsqueda', Array.isArray(rec) && rec.length === 1 && /^Recibiste una propuesta \| Gestora Prueba te propone una unidad para tu búsqueda\. \| se-busca\.html#b-/.test(rec[0]), rec);
await ev(`BPDigital.responder(${JSON.stringify(propId)}, 'rechazar').then(() => true)`);
await como('pablo', 'index.html', 1800);
const resp = await ev(`BPDigital.avisos().then(l => l.filter(n => n.tipo === 'propuesta_respondida').map(n => n.titulo + ' | ' + n.url))`);
ok('Rechazada: le llega al publicador', Array.isArray(resp) && resp.length === 1 && resp[0] === 'Tu propuesta no fue aceptada | explorar.html#se-busca', resp);

/* 5. Entrar desde el aviso abre directo la hoja de esa unidad */
await ir('avisos.html?aviso=aviso-1#coincidencias', 4000);
ok('avisos.html?aviso=…#coincidencias abre la hoja de esa unidad', await esperarQue(`(() => { const h = document.querySelector('.p-dg-velo.on .p-dg-resumen'); return h && /Gorriti 4800/.test(h.textContent); })()`));
await ev('history.back(); true'); await sleep(700);
ok('Atrás cierra la hoja y deja la página', await ev(`!document.querySelector('.p-dg-velo') && /avisos\.html$/.test(location.pathname) && document.getElementById('tabC').getAttribute('aria-selected') === 'true'`));

/* 6. Preferencias: un interruptor */
await ir('avisos.html#preferencias', 2000);
ok('El interruptor arranca prendido', await esperarQue(`document.getElementById('prefMail').getAttribute('aria-checked') === 'true' && !document.getElementById('prefMail').disabled`));
await ev(`document.getElementById('prefMail').click(); true`); await sleep(600);
await ir('avisos.html', 1800);
ok('Apagado: queda guardado', await esperarQue(`document.getElementById('prefMail').getAttribute('aria-checked') === 'false'`));
await ev(`document.getElementById('prefMail').click(); true`); await sleep(500);
await foto(pref + '05-avisos-pablo', true);

/* 7. Vacíos, el header y los errores */
await como('carla', 'avisos.html', 1800);
ok('Sin avisos: el vacío dice qué va a aparecer y lleva a Explorar', await esperarQue(`(() => { const v = document.querySelector('#lista .p-dg-vacio'); return !!v && !!v.querySelector('a.p-btn-fill[href="explorar.html"]'); })()`));
await foto(pref + '06-vacio');
await como('carla', 'buscar.html', 2200);
ok('En una página sin digital.js la campana se arma sola', await esperarQue(`!!(window.BPDigital && BPDigital.campana) && !!document.querySelector('${CAMPANA}') && !document.querySelector('${CAMPANA}').hidden`));
await sinScroll('Buscar con la campana');
await ev(`localStorage.removeItem('bp_digital'); true`); await ir('index.html', 1800);
ok('Sin BAIREN digital: la campana de siempre (sin desplegable)', await ev(`!document.querySelector('.p-campana') && !!document.querySelector('[data-notif]')`));
await ir('avisos.html', 1800);
ok('Sin BAIREN digital: avisos.html dice "Muy pronto"', await ev(`!!document.querySelector('.p-dg-pronto')`));
await ev(`localStorage.setItem('bp_digital', '1'); localStorage.removeItem('bp_user'); true`); await ir('avisos.html', 2200);
ok('Sin sesión: manda a ingresar', /ingresar\.html/.test(await ev('location.pathname')));
const errores = c.errores.concat(c.consola.filter(x => !/supabase|jsdelivr|ERR_BLOCKED|Failed to load resource|favicon/i.test(x)));
ok('Sin errores de consola', errores.length === 0, errores);
console.log('Capturas en ' + OUT);
await c.cerrar();
fin();
