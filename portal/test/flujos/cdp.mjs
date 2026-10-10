/* Helper CDP para el área de carga (lanzamiento): puerto 8098, Chrome 9248, modo local (Supabase y jsdelivr bloqueados). */
import { writeFileSync, mkdirSync } from 'node:fs';
/* Carpeta de estas pruebas (fotos de prueba al lado); capturas en BP_CAPTURAS. Puertos: BP_PUERTO (servidor) y BP_CHROME. */
export const SP = process.env.BP_PRUEBAS || decodeURIComponent(new URL('.', import.meta.url).pathname).replace(/\/$/, '');
export const OUT = (process.env.BP_CAPTURAS || '/tmp/bp-flujos') + '/';
export const BASE = 'http://127.0.0.1:' + (process.env.BP_PUERTO || 8107) + '/portal/';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });
export async function conectar() {
  const t = await (await fetch('http://127.0.0.1:' + (process.env.BP_CHROME || 9307) + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map(); const errores = []; const consola = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') errores.push(String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300));
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) consola.push(m.params.type + ': ' + m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300));
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/ERR_BLOCKED_BY_CLIENT|supabase|jsdelivr|from the Manifest/.test(m.params.entry.text + ' ' + (m.params.entry.url || ''))) consola.push('log: ' + m.params.entry.text.slice(0, 200) + ' ' + (m.params.entry.url || '')); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('DOM.enable'); await send('Log.enable');
  await send('Network.setBlockedURLs', { urls: ['*jdatlsrujgfmvyuhoffg.supabase.co*', '*supabase.co*', '*cdn.jsdelivr.net*', '*/api/*'] });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'EXC: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result?.result?.value; };
  const vista = async (mob) => { await send('Emulation.setDeviceMetricsOverride', mob ? { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Emulation.setTouchEmulationEnabled', { enabled: !!mob, maxTouchPoints: mob ? 5 : 0 }); };
  const esperarCarga = async (espera = 1500) => { for (let i = 0; i < 60; i++) { await sleep(250); const s = await ev('document.readyState + "|" + document.documentElement.classList.contains("cargando")'); if (s === 'complete|false') break; } await sleep(espera); };
  const ir = async (url, espera = 1500) => { await send('Page.navigate', { url: url.startsWith('http') ? url : BASE + url }); await esperarCarga(espera); };
  const foto = async (nombre, completa = false) => {
    let params = { format: 'png' };
    if (completa) { const h = await ev('Math.min(document.documentElement.scrollHeight, 7000)'); const w = await ev('window.innerWidth'); params = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } }; }
    const r = await send('Page.captureScreenshot', params); writeFileSync(OUT + nombre + '.png', Buffer.from(r.result.data, 'base64')); return OUT + nombre + '.png';
  };
  /* Captura de un elemento (selector) con un margen */
  const fotoDe = async (nombre, selector, margen = 8) => {
    const rect = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height}})()`);
    if (!rect) return null;
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.max(0, rect.x - margen), y: Math.max(0, rect.y - margen), width: rect.w + margen * 2, height: Math.min(rect.h + margen * 2, 7000), scale: 1 } });
    writeFileSync(OUT + nombre + '.png', Buffer.from(r.result.data, 'base64')); return OUT + nombre + '.png';
  };
  const archivos = async (selector, files) => { const doc = await send('DOM.getDocument', { depth: -1 }); const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector }); await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files }); };
  const cerrar = async () => { try { ws.close(); await fetch('http://127.0.0.1:' + (process.env.BP_CHROME || 9307) + '/json/close/' + t.id); } catch (e) {} };
  /* Ingresa en modo local con un mail (código de bp_code) y deja la sesión puesta */
  const ingresar = async (mail, volver = 'panel.html') => {
    await ir('index.html', 200); await ev('localStorage.removeItem("bp_user"); true');   /* cerrar la sesión anterior */
    await ir('ingresar.html?volver=' + encodeURIComponent(volver), 800);
    await ev(`document.getElementById("email").value=${JSON.stringify(mail)}; document.getElementById("btnMail").click(); true`); await sleep(1200);
    const code = await ev('JSON.parse(localStorage.getItem("bp_code")).code');
    await ev(`document.getElementById("code").value="${code}"; document.getElementById("btnCode").click(); true`); await sleep(2000);
    await esperarCarga(1200);
  };
  return { send, ev, vista, ir, foto, fotoDe, archivos, errores, consola, cerrar, esperarCarga, ingresar };
}
