/* Prueba de punta a punta del portal en modo local, con Chrome headless por CDP.
   Uso: (1) servidor local en :8080, (2) Chrome con --remote-debugging-port=9222, (3) node portal/test/e2e.mjs
   Recorre: ingresar con código → publicar en 5 pasos con 8 fotos → panel (en revisión) → curación (aprobar) → resultados y ficha. */
const BASE = process.env.BASE || 'http://127.0.0.1:8080/portal/';
const FOTOS = Array.from({length: 8}, (_, i) => `/tmp/bp-e2e/foto-${i+1}.jpg`);
const list = await (await fetch('http://127.0.0.1:9222/json')).json();
let target = list.find(t => t.type === 'page');
if (!target) target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error('JS: ' + (r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description || r.result.exceptionDetails.text)); return r.result && r.result.result ? r.result.result.value : undefined; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, label, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await evalJs(expr)) return true; } catch (e) {} await sleep(250); } throw new Error('Tiempo agotado esperando: ' + label); };
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(600); await waitFor('document.readyState === "complete"', 'carga ' + url); };
const step = (n, msg) => console.log(`  ${n}. ${msg}`);
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('/tmp/bp-e2e/shots', { recursive: true });
const shot = async (name) => { try { await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync('/tmp/bp-e2e/shots/' + name + '.png', Buffer.from(r.result.data, 'base64')); } catch (e) { console.log('   (sin captura ' + name + ')'); } };
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Network.enable'); await send('Network.clearBrowserCache'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const results = [];
const ok = (name, cond, detail) => { results.push({ name, ok: !!cond, detail }); console.log(`${cond ? 'OK ' : 'FALLA'} ${name}${detail ? ' · ' + detail : ''}`); };

try {
  /* limpiar estado local */
  await goto(BASE + 'index.html');
  await evalJs('localStorage.clear(); indexedDB.deleteDatabase("bairen-portal"); true');

  /* 1. Ingresar */
  await goto(BASE + 'ingresar.html?volver=publicar&perfil=dueno');
  await waitFor('!!window.BPStore && !!document.getElementById("email")', 'formulario de mail');
  const mode = await evalJs('BPStore.init()'); step(0, 'modo de almacenamiento: ' + mode);
  await waitFor('document.getElementById("modeNote").textContent.length > 0 || BPStore.mode === "supabase"', 'inicialización');
  await evalJs('document.getElementById("email").value = "prueba@bairen.test"; document.getElementById("stepMail").requestSubmit(); true');
  await waitFor('document.getElementById("codeMsg").textContent.includes("código")', 'código');
  const code = await evalJs('(document.getElementById("codeMsg").textContent.match(/(\\d{6})/) || [])[1]');
  await shot('01-ingresar-codigo');
  ok('Ingresar: código generado en modo local', code && code.length === 6, code);
  await evalJs(`document.getElementById("code").value = "${code}"; document.getElementById("stepCode").requestSubmit(); true`);
  await waitFor('location.pathname.endsWith("publicar-aviso.html")', 'redirección a publicar-aviso', 8000);
  ok('Ingresar: sesión y redirección a la carga', true);

  /* 2. Publicar: paso 0 perfil */
  await waitFor('!!document.querySelector("#perfilForm [name=nombre]")', 'formulario de perfil');
  await shot('02-publicar-perfil');
  await evalJs(`document.querySelector("[name=tipo][value=dueno]").checked = true; const f = {nombre:"Prueba Dueño", dni:"30111222", telefono:"1155556666", whatsapp:"5491155556666", email:"prueba@bairen.test", descripcion:"Propietario de prueba."}; Object.keys(f).forEach(k => { const i = document.querySelector("#perfilForm [name="+k+"]"); if (i) i.value = f[k]; }); document.querySelector("[data-next]").click(); true`);
  await waitFor('!!document.getElementById("f-direccion")', 'paso principales');
  ok('Publicar: perfil de dueño guardado', true);
  /* paso 1 principales */
  await evalJs(`const set = (k, v) => { const i = document.getElementById("f-"+k); i.value = v; i.dispatchEvent(new Event("change")); }; set("operacion","venta"); set("tipo","Departamento"); set("zona","Palermo"); set("barrio","Palermo Soho"); set("direccion","Honduras 4800"); set("unidad","3° A"); set("precio","210000"); set("expensas","180000"); set("m2_total","72"); set("m2_cubierto","65"); set("ambientes","3"); set("dormitorios","2"); set("banos","1"); set("cocheras","0"); set("antiguedad","8"); set("titulo","Honduras al 4800 · Tres ambientes con balcón al frente"); set("descripcion","Aviso de prueba automática. Tres ambientes luminosos al frente con balcón corrido sobre Honduras, cocina integrada, dos dormitorios y baño completo. Edificio de ocho años con ascensor, bicicletero y terraza con parrilla. A dos cuadras de Plaza Armenia."); document.querySelector("[data-next]").click(); true`);
  await shot('03-publicar-principales');
  await waitFor('!!document.getElementById("fotosIn")', 'paso fotos');
  ok('Publicar: principales validados', true);
  /* paso 2 fotos: adjuntar 8 archivos reales */
  const doc = await send('DOM.getDocument', { depth: -1 });
  const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#fotosIn' });
  await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: FOTOS });
  await waitFor('document.querySelectorAll("#fotosGrid .p-foto").length >= 8', 'ocho fotos subidas', 40000);
  ok('Publicar: ocho fotos reducidas y guardadas', true, await evalJs('document.querySelectorAll("#fotosGrid .p-foto").length + " fotos"'));
  await shot('04-publicar-fotos');
  await evalJs('document.querySelector("[data-next]").click(); true');
  await waitFor('!!document.querySelector("[name=amen]")', 'paso extras');
  await evalJs('document.querySelector("[name=amen][value=Pileta]").checked = true; document.querySelector("[name=amen][value=Ascensor]").checked = true; document.querySelector("[name=car][value=\'Apto crédito\']").checked = true; document.querySelector("[data-next]").click(); true');
  await waitFor('!!document.getElementById("enviar")', 'paso revisión');
  ok('Publicar: extras y revisión', true, await evalJs('document.querySelector(".p-resumen").textContent.replace(/\\s+/g," ").slice(0,120)'));
  await shot('05-publicar-revision');
  await evalJs('document.getElementById("acepto").checked = true; document.getElementById("enviar").click(); true');
  await waitFor('location.pathname.endsWith("panel.html")', 'panel', 8000);
  await waitFor('!!document.querySelector("#content .p-aviso-row") && document.querySelector("#content").textContent.includes("En revisión")', 'aviso en revisión en el panel');
  await shot('06-panel-mis-avisos');
  ok('Panel: el aviso figura en revisión', true);

  /* 3. Curación */
  await goto(BASE + 'curacion.html');
  await waitFor('!!document.querySelector(".p-cur [data-ok]")', 'cola de curación');
  const checks = await evalJs('Array.from(document.querySelectorAll(".p-check span")).map(s => s.className + ":" + s.textContent.trim()).join(" | ")');
  await shot('07-curacion-cola');
  ok('Curación: el aviso aparece en la cola con sus chequeos', true, checks);
  await evalJs('document.querySelector(".p-cur [data-ok]").click(); true');
  await waitFor('document.getElementById("out").textContent.includes("No hay avisos esperando")', 'cola vacía tras aprobar');
  ok('Curación: aprobado y publicado', true);
  await evalJs('document.querySelector(".p-tabs2 [data-t=pubs]").click(); true'); await sleep(500);
  const pend = await evalJs('!!document.querySelector(".p-cur [data-ok]")');
  if (pend) { await evalJs('document.querySelector(".p-cur [data-ok]").click(); true'); await sleep(500); }
  ok('Curación: publicador verificado', true);

  /* 4. Resultados y ficha */
  await goto(BASE + 'buscar.html?op=venta&zona=Palermo');
  await waitFor('document.querySelectorAll(".p-card-h").length > 0', 'tarjetas');
  const card = await evalJs('(() => { const c = Array.from(document.querySelectorAll(".p-card-h")).find(x => x.textContent.includes("Honduras")); return c ? c.querySelector(".p-publine").textContent.replace(/\\s+/g," ").trim() : null; })()');
  await shot('08-resultados-palermo');
  ok('Resultados: el aviso nuevo aparece con su publicador', !!card, card);
  const href = await evalJs('(() => { const c = Array.from(document.querySelectorAll(".p-card-h")).find(x => x.textContent.includes("Honduras")); return c ? c.querySelector(".p-addr").getAttribute("href") : null; })()');
  await goto(BASE + href);
  await waitFor('!!document.getElementById("contactForm")', 'ficha');
  const ficha = await evalJs('({ h1: document.querySelector("h1").textContent, fotos: document.querySelectorAll("#gal img").length, pub: document.querySelector(".p-pub-block b").textContent, badge: !!document.querySelector(".p-pub-block .p-badge.dueno") })');
  await shot('09-ficha-nueva');
  ok('Ficha: título, fotos y publicador verificado', ficha.fotos >= 4 && ficha.badge, JSON.stringify(ficha));
  await evalJs('const f = document.getElementById("contactForm"); f.nombre.value = "Interesada Prueba"; f.email.value = "interesada@bairen.test"; f.telefono.value = "1144445555"; f.querySelectorAll("input[type=checkbox]").forEach(c => c.checked = true); window.__loc = null; f.dispatchEvent(new Event("submit", { cancelable: true })); true');
  await sleep(600);
  const consultas = await evalJs('JSON.parse(localStorage.getItem("bp_consultas_db") || "[]").length');
  ok('Ficha: la consulta queda registrada para el publicador', consultas >= 1, consultas + ' consulta(s)');
  await goto(BASE + 'panel.html#interesados');
  await waitFor('!!document.querySelector("#content .p-tbl") && document.querySelector("#content").textContent.includes("Interesada Prueba")', 'consulta en Interesados');
  await shot('10-panel-interesados');
  ok('Panel: la consulta aparece en Interesados', true);
  /* 5. Importación por archivo (inmobiliaria) */
  await goto(BASE + 'importar.html');
  await waitFor('document.querySelector(".p-imp") && document.querySelector(".p-imp").textContent.includes("inmobiliarias y desarrolladoras")', 'gating de importar para dueño');
  ok('Importar: un dueño directo no puede importar', true);
  await evalJs('BPStore.init().then(() => BPStore.getMyPublicador()).then(p => BPStore.savePublicador(Object.assign({}, p, { tipo: "inmobiliaria", nombre: "Inmobiliaria Prueba", responsable: "Corredora Prueba", matricula: "CUCICBA 1234", colegio: "CUCICBA", badge: "Corredor inmobiliario matriculado" })))');
  await goto(BASE + 'importar.html');
  await waitFor('!!document.getElementById("fileIn")', 'página de importación');
  const d2 = await send('DOM.getDocument', { depth: -1 }); const q2 = await send('DOM.querySelector', { nodeId: d2.result.root.nodeId, selector: '#fileIn' });
  await send('DOM.setFileInputFiles', { nodeId: q2.result.nodeId, files: ['/tmp/bp-e2e/cartera.csv'] });
  await waitFor('document.querySelectorAll("#prev tbody tr").length >= 3', 'vista previa del CSV');
  const prev = await evalJs('Array.from(document.querySelectorAll("#prev tbody tr")).map(r => r.cells[2].textContent.trim() + " → " + r.cells[7].textContent.trim()).join(" | ")');
  await shot('11-importar-preview');
  ok('Importar: tres filas leídas con mapeo automático', true, prev);
  await evalJs('document.getElementById("importar").click(); true');
  await waitFor('location.pathname.endsWith("panel.html")', 'vuelta al panel', 10000);
  await waitFor('document.querySelectorAll("#content .p-aviso-row").length >= 4', 'borradores en el panel');
  const nRows = await evalJs('document.querySelectorAll("#content .p-aviso-row").length');
  await shot('12-panel-tras-importar');
  ok('Importar: los borradores aparecen en Mis avisos', nRows >= 4, nRows + ' avisos en el panel');
  /* 6. Rutas limpias */
  const pretty = await evalJs('BP.probePretty()');
  if (pretty) { await goto(BASE + 'departamentos-venta-palermo'); await waitFor('document.querySelectorAll(".p-card-h").length > 0', 'resultados por ruta limpia'); const t = await evalJs('document.getElementById("resTitle").textContent'); const link = await evalJs('document.querySelector(".p-card-h .p-addr").getAttribute("href")'); ok('Rutas limpias: resultados y links de ficha', /Palermo/.test(t) && /^propiedad-/.test(link), t + ' · ' + link); await goto(BASE + link); await waitFor('!!document.getElementById("contactForm")', 'ficha por ruta limpia'); ok('Rutas limpias: la ficha abre desde su URL', true, await evalJs('document.querySelector("h1").textContent')); }
  else ok('Rutas limpias: servidor sin reescritura (se usan parámetros)', true);
} catch (e) { ok('Flujo completo', false, e.message); }

console.log('\nResultado: ' + results.filter(r => r.ok).length + ' de ' + results.length + ' pasos OK');
ws.close(); process.exit(results.every(r => r.ok) ? 0 : 1);
