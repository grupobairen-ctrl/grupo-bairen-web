/* Capturas y chequeo mobile del portal por DevTools.
   Uso: Chrome con --remote-debugging-port=9223 y el dev server en :8080
   node portal/test/shots.mjs [desktop|mobile|both] */
const BASE = process.env.BASE || 'http://127.0.0.1:8080/portal/';
const MODE = process.argv[2] || 'both';
const OUT = '/tmp/bp-shots';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const PAGES = [
  ['home', 'index.html'], ['resultados', 'buscar.html?op=venta'], ['resultados-alq', 'buscar.html?op=alquiler&zona=Recoleta'],
  ['ficha', 'propiedad.html?id=austria-1938-10-venta'], ['publicar', 'publicar.html'], ['ingresar', 'ingresar.html?volver=publicar&perfil=dueno'],
  ['emprendimientos', 'emprendimientos.html'], ['publicadores', 'publicadores.html'], ['legales', 'legales.html'],
];
const list = await (await fetch('http://127.0.0.1:9223/json')).json();
const target = list.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); let errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 120)); };
const send = (m, p = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const CHECK = `(() => { const vw = window.innerWidth;
  const over = Array.from(document.querySelectorAll('body *')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1); }).slice(0,6).map(e => (e.tagName.toLowerCase() + '.' + (e.className && typeof e.className === 'string' ? e.className.split(' ')[0] : '') + ' w=' + Math.round(e.getBoundingClientRect().width)));
  const small = Array.from(document.querySelectorAll('a,button,input,select,summary')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40); }).slice(0,8).map(e => (e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '') + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  return { scrollW: document.documentElement.scrollWidth, vw, over, small: small.length, smallList: small }; })()`;
const modes = MODE === 'both' ? ['desktop', 'mobile'] : [MODE];
for (const mode of modes) {
  const mob = mode === 'mobile';
  await send('Emulation.setDeviceMetricsOverride', mob ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mob });
  for (const [name, url] of PAGES) {
    errors = [];
    await send('Page.navigate', { url: BASE + url }); await sleep(mob ? 3800 : 3200);
    await ev("document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('in')); true");
    await sleep(400);
    const c = await ev(CHECK);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, optimizeForSpeed: true });
    if (r.result?.data) writeFileSync(`${OUT}/${mode}-${name}.png`, Buffer.from(r.result.data, 'base64'));
    const desb = c && c.scrollW > c.vw + 1;
    console.log(`${mode.padEnd(7)} ${name.padEnd(16)} ${desb ? 'DESBORDA ' + c.scrollW + '>' + c.vw : 'ok'} · táctiles chicos: ${c ? c.small : '?'}${c && c.over.length ? ' · ' + c.over.join(', ') : ''}${errors.length ? ' · ERR ' + errors[0] : ''}`);
    if (mob && c && c.small && c.smallList) console.log('        chicos: ' + c.smallList.slice(0,4).join(' | '));
  }
}
ws.close(); process.exit(0);
