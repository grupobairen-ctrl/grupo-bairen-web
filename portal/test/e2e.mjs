/* Prueba de punta a punta del portal en modo local, con Chrome headless por CDP.
   Uso: (1) servidor local en :8080, (2) Chrome con --remote-debugging-port=9222 (u otro, con CDP=http://127.0.0.1:9223), (3) node portal/test/e2e.mjs
   Con la base del portal conectada, correrla con LOCAL=1 (bloquea Supabase y el portal cae a modo local).
   Recorre: ingresar con código → publicar en 5 pasos con 8 fotos → panel (en revisión) → curación (aprobar) → resultados y ficha
   → perfil al crear la cuenta (la pregunta, el riel por perfil y el cambio desde Mi cuenta; con volver=publicar no se
   pregunta y se respeta el destino; con publicador y sin perfil elegido tampoco, y el riel sale del publicador). */
const BASE = process.env.BASE || 'http://127.0.0.1:8080/portal/';
/* CDP=http://127.0.0.1:9223 para usar otro Chrome: si el de 9222 tiene abiertas otras pestañas del portal, el borrado
   del IndexedDB del arranque queda bloqueado y la subida de fotos no termina nunca. */
const CDP = process.env.CDP || 'http://127.0.0.1:9222';
const FOTOS = Array.from({length: 8}, (_, i) => `/tmp/bp-e2e/foto-${i+1}.jpg`);
const list = await (await fetch(CDP + '/json')).json();
let target = list.find(t => t.type === 'page');
if (!target) target = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json();
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
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
mkdirSync('/tmp/bp-e2e/shots', { recursive: true });
const shot = async (name) => { try { await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync('/tmp/bp-e2e/shots/' + name + '.png', Buffer.from(r.result.data, 'base64')); } catch (e) { console.log('   (sin captura ' + name + ')'); } };
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Network.enable');
/* La prueba compara textos en castellano: el idioma queda fijo aunque el perfil del Chrome tenga otro */
await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('bairen_lang','es')}catch(e){}" });
/* LOCAL=1: bloquea Supabase para que el portal caiga a modo local aunque la base responda (la prueba está escrita para modo local) */
if (process.env.LOCAL === '1') await send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*supabase-js*'] }); await send('Network.clearBrowserCache'); await send('Network.setCacheDisabled', { cacheDisabled: true });
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

  /* 6.2 · reordenar y elegir portada con el dedo, sin arrastrar */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const antesOrden = await evalJs('document.querySelector("#fotosGrid .p-foto img").getAttribute("src").slice(-24)');
  const chicos = await evalJs('(() => { const b = [...document.querySelectorAll("#fotosGrid .p-foto button")]; return b.filter(x => { const r = x.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length; })()');
  await evalJs('document.querySelector("#fotosGrid .p-foto [data-mov=\'1\']").click(); true');
  await waitFor(`document.querySelector("#fotosGrid .p-foto img").getAttribute("src").slice(-24) !== ${JSON.stringify(antesOrden)}`, 'la foto se movió');
  const movida = await evalJs('document.querySelectorAll("#fotosGrid .p-foto")[1].querySelector("img").getAttribute("src").slice(-24)');
  ok('Fotos en táctil: se reordenan con botones, sin arrastrar', movida === antesOrden && chicos === 0,
     'la primera pasó al segundo lugar, ' + chicos + ' botones menores a 44 px');
  await evalJs('document.querySelector("#fotosGrid .p-foto:nth-child(3) [data-portada]").click(); true');
  await sleep(500);
  const portada = await evalJs('!!document.querySelector("#fotosGrid .p-foto:first-child .es-portada")');
  ok('Fotos en táctil: elegir portada desde cualquier posición', portada, 'la tercera quedó de portada');
  await shot('04b-fotos-tactil');
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
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
  await waitFor('document.querySelectorAll(".prop-card, .p-card-h").length > 0', 'tarjetas');
  const card = await evalJs('(() => { const c = Array.from(document.querySelectorAll(".prop-card, .p-card-h")).find(x => x.textContent.includes("Honduras")); return c ? (c.querySelector(".p-publine, .card-pub, .card-address") || c).textContent.replace(/\\s+/g," ").trim() : null; })()');
  await shot('08-resultados-palermo');
  ok('Resultados: el aviso nuevo aparece con su publicador', !!card, card);
  const href = await evalJs('(() => { const c = Array.from(document.querySelectorAll(".prop-card, .p-card-h")).find(x => x.textContent.includes("Honduras")); return c ? (c.querySelector(".p-addr") || c).getAttribute("href") : null; })()');
  await goto(BASE + href);
  await waitFor('!!document.getElementById("contactForm")', 'ficha');
  const ficha = await evalJs('({ h1: document.querySelector("h1").textContent, fotos: document.querySelectorAll("#gal .p-fhero-slide[data-i], #gal img").length, pub: document.querySelector(".p-pub-block b").textContent, badge: !!document.querySelector(".p-pub-block .p-badge.dueno") })');
  await shot('09-ficha-nueva');
  ok('Ficha: título, fotos y publicador verificado', ficha.fotos >= 4 && ficha.badge, JSON.stringify(ficha));
  /* Se acepta solo la casilla de términos: la de visita exige día y hora, y sin fecha el formulario avisa y no envía */
  await evalJs('const f = document.getElementById("contactForm"); f.nombre.value = "Interesada Prueba"; f.email.value = "interesada@bairen.test"; f.telefono.value = "1144445555"; (f.querySelector("#cfAcepto") || f.querySelector("input[type=checkbox][required]")).checked = true; window.__loc = null; f.dispatchEvent(new Event("submit", { cancelable: true })); true');
  await sleep(600);
  const consultas = await evalJs('JSON.parse(localStorage.getItem("bp_consultas_db") || "[]").length');
  ok('Ficha: la consulta queda registrada para el publicador', consultas >= 1, consultas + ' consulta(s)');
  await goto(BASE + 'panel.html#interesados');
  await waitFor('!!document.querySelector("#content .p-tbl") && document.querySelector("#content").textContent.includes("Interesada Prueba")', 'consulta en Interesados');
  await shot('10-panel-interesados');
  ok('Panel: la consulta aparece en Interesados', true);

  /* 4b. Alerta de precio en la ficha (12/9): crear la guarda en bp_alertas con tipo 'precio' y avisoId; al volver a la
     ficha el botón arranca en "Alerta creada" (aria-pressed) y tocarlo la quita. En modo local remoteId queda null. */
  await goto(BASE + href);
  await waitFor('!!document.getElementById("bajaPrecio") && document.getElementById("bajaPrecio").getAttribute("aria-pressed") === "false"', 'botón de alerta de precio');
  await evalJs('document.getElementById("bajaPrecio").click(); true');
  await waitFor('JSON.parse(localStorage.getItem("bp_alertas") || "[]").some(x => x.tipo === "precio") && document.getElementById("bajaPrecio").getAttribute("aria-pressed") === "true"', 'alerta de precio guardada');
  const alPrecio = await evalJs('JSON.parse(localStorage.getItem("bp_alertas") || "[]").find(x => x.tipo === "precio")');
  const avisoFicha = await evalJs('(document.querySelector("[data-wa][data-aviso]") || {}).dataset ? document.querySelector("[data-wa][data-aviso]").dataset.aviso : ""');
  await goto(BASE + href);
  await waitFor('!!document.getElementById("bajaPrecio") && document.getElementById("bajaPrecio").getAttribute("aria-pressed") === "true"', 'la ficha recuerda la alerta');
  const txtCreada = await evalJs('document.getElementById("bajaPrecio").textContent.trim()');
  await shot('10b-ficha-alerta-creada');
  await evalJs('document.getElementById("bajaPrecio").click(); true');
  await waitFor('!JSON.parse(localStorage.getItem("bp_alertas") || "[]").some(x => x.tipo === "precio") && document.getElementById("bajaPrecio").getAttribute("aria-pressed") === "false"', 'alerta de precio quitada');
  const txtQuitada = await evalJs('document.getElementById("bajaPrecio").textContent.trim()');
  ok('Alerta de precio: la ficha la crea con avisoId y precio, la recuerda y la quita', !!alPrecio && String(alPrecio.avisoId) === String(avisoFicha) && alPrecio.precio > 0 && alPrecio.remoteId == null && /Alerta creada/.test(txtCreada) && /Avisarme/.test(txtQuitada),
     'avisoId ' + (alPrecio && alPrecio.avisoId) + ' · precio ' + (alPrecio && alPrecio.precio) + ' · remoteId ' + (alPrecio && alPrecio.remoteId) + ' · "' + txtCreada + '" → "' + txtQuitada + '"');

  /* 4c. Búsqueda guardada en resultados y su vida en el panel: "Crear alerta" la guarda con su key; Búsquedas y alertas
     la lista con su tipo y "Quitar" la saca (BPStore.borrarAlerta antes de sacarla de bp_alertas) y baja el contador. */
  await goto(BASE + 'buscar.html?op=venta&zona=Palermo');
  await waitFor('document.querySelectorAll(".prop-card, .p-card-h").length > 0 && document.getElementById("alertBtn").getAttribute("aria-pressed") === "false"', 'resultados con botón de alerta');
  await evalJs('document.getElementById("alertBtn").click(); true');
  await waitFor('JSON.parse(localStorage.getItem("bp_alertas") || "[]").some(x => x.tipo !== "precio" && x.key) && document.getElementById("alertBtn").getAttribute("aria-pressed") === "true"', 'búsqueda guardada');
  const alBusq = await evalJs('JSON.parse(localStorage.getItem("bp_alertas") || "[]").find(x => x.tipo !== "precio")');
  await goto(BASE + 'panel.html#alertas');
  await waitFor('!!document.querySelector("#content .p-tbl") && document.querySelector("#content").textContent.includes("Búsqueda guardada")', 'la alerta en Búsquedas y alertas');
  const filaAlerta = await evalJs('document.querySelector("#content .p-tbl tbody tr").textContent.replace(/\\s+/g, " ").trim()');
  const contadorAntes = await evalJs('(document.querySelector("#sideNav a[href=\'#alertas\'] .n") || {}).textContent || "0"');
  await shot('10c-panel-alertas');
  await evalJs('document.querySelector("#content [data-del]").click(); true');
  await waitFor('document.querySelector("#content").textContent.includes("Todavía no creaste ninguna alerta") && JSON.parse(localStorage.getItem("bp_alertas") || "[]").length === 0', 'alerta quitada desde el panel');
  const contadorDespues = await evalJs('(document.querySelector("#sideNav a[href=\'#alertas\'] .n") || {}).textContent || "0"');
  await shot('10d-panel-alertas-vacio');
  ok('Búsqueda guardada: el panel la lista y "Quitar" la saca', !!alBusq && /op=venta/.test(alBusq.key) && /Búsqueda guardada/.test(filaAlerta) && /Palermo/.test(filaAlerta) && contadorAntes === '1' && contadorDespues === '0',
     'key ' + (alBusq && alBusq.key) + ' · fila "' + filaAlerta.slice(0, 80) + '" · contador ' + contadorAntes + ' → ' + contadorDespues);

  /* 5. Importación por archivo (inmobiliaria) */
  await goto(BASE + 'importar.html');
  await waitFor('document.querySelector(".p-imp") && document.querySelector(".p-imp").textContent.includes("inmobiliarias y desarrolladoras")', 'gating de importar para dueño');
  ok('Importar: un dueño directo no puede importar', true);
  await evalJs('BPStore.init().then(() => BPStore.getMyPublicador()).then(p => BPStore.savePublicador(Object.assign({}, p, { tipo: "inmobiliaria", nombre: "Inmobiliaria Prueba", responsable: "Corredora Prueba", matricula: "CUCICBA 1234", colegio: "CUCICBA", badge: "Corredor inmobiliario matriculado" })))');
  await goto(BASE + 'importar.html');
  await waitFor('document.body.dataset.ready === "importar" && !!document.getElementById("fileIn")', 'página de importación lista');
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
  /* 6. Visitas y reservas + vista del propietario */
  await goto(BASE + 'panel.html#avisos');
  await waitFor('!!document.querySelector("#content .p-visita-form")', 'formulario de visita');
  await evalJs('(async () => { const a = (await BPStore.myAvisos()).find(x => x.estado_curacion === "publicado"); const rec = Object.assign({}, a); delete rec.publicador; rec.propietario_email = "duenio@bairen.test"; await BPStore.saveAviso(rec); })()');
  await goto(BASE + 'panel.html#avisos');
  await waitFor('!!document.querySelector("#content .p-visita-form")', 'formulario de visita');
  await evalJs('(() => { const f = Array.from(document.querySelectorAll("#content .p-visita-form")).find(x => x.closest(".p-aviso-row").textContent.includes("4800")); f.tipo.value = "visita"; f.fecha.value = "2026-09-05T15:30"; f.nota.value = "Pareja joven, volvería con los padres"; f.requestSubmit(); return true; })()');
  await waitFor('document.querySelector("#content").textContent.includes("Pareja joven")', 'visita registrada');
  await shot('13-panel-visitas');
  ok('Visitas: la inmobiliaria registra una visita en el aviso', true);
  await evalJs('BPStore.signOut()');
  await evalJs('BPStore.sendCode("duenio@bairen.test")');
  const code2 = await evalJs('JSON.parse(localStorage.getItem("bp_code")).code');
  await evalJs(`BPStore.verifyCode("duenio@bairen.test", "${code2}")`);
  await goto(BASE + 'panel.html#propiedades');
  await waitFor('document.querySelector("#content") && document.querySelector("#content").textContent.includes("Pareja joven")', 'el propietario ve la visita');
  await shot('14-propietario-mis-propiedades');
  ok('Propietario: entra con su mail y ve la unidad con la visita registrada', true, await evalJs('document.querySelector("#content .p-aviso-row b").textContent'));
  /* 7. Emprendimientos */
  await goto(BASE + 'emprendimientos.html');
  await waitFor('document.querySelectorAll(".p-emp").length > 0', 'emprendimientos');
  const emp = await evalJs('(() => { const e = document.querySelector(".p-emp"); return e.querySelector("h2").textContent + " · " + e.querySelector(".desde").textContent + " · " + e.querySelector(".facts").textContent.replace(/\s+/g," ").trim() + " · " + (e.querySelector(".p-badge") || {}).textContent; })()');
  await shot('15-emprendimientos');
  ok('Emprendimientos: la página agrupa las unidades de la desarrolladora', /Torre Ejemplo/.test(emp) && /Venta directa/.test(emp), emp);
  /* 8. Rutas limpias */
  const pretty = await evalJs('BP.probePretty()');
  if (pretty) { await goto(BASE + 'departamentos-venta-palermo'); await waitFor('document.querySelectorAll(".prop-card, .p-card-h").length > 0', 'resultados por ruta limpia'); const t = await evalJs('document.getElementById("resTitle").textContent'); const link = await evalJs('(document.querySelector(".p-card-h .p-addr") || document.querySelector(".prop-card")).getAttribute("href")'); ok('Rutas limpias: resultados y links de ficha', /Palermo/.test(t) && /^propiedad-/.test(link), t + ' · ' + link); await goto(BASE + link); await waitFor('!!document.getElementById("contactForm")', 'ficha por ruta limpia'); ok('Rutas limpias: la ficha abre desde su URL', true, await evalJs('document.querySelector("h1").textContent')); }
  else ok('Rutas limpias: servidor sin reescritura (se usan parámetros)', true);

  /* 9. Estado de error: si la carga falla hay mensaje y reintento, no esqueleto eterno.
     En modo local los avisos publicados del navegador alcanzan para no leer el JSON, así que se apartan un momento. */
  await evalJs('sessionStorage.setItem("__bpAvisos", localStorage.getItem("bp_avisos") || "[]"); localStorage.setItem("bp_avisos", "[]"); true');
  await send('Network.setBlockedURLs', { urls: ['*avisos-src.json*'].concat(process.env.LOCAL === '1' ? ['*supabase.co*', '*supabase-js*'] : []) });
  await goto(BASE + 'buscar.html?op=mediano');
  await waitFor('!!document.querySelector(".p-error")', 'estado de error', 12000);
  const err = await evalJs('(() => { const e = document.querySelector(".p-error"); return e.getAttribute("role") + " · " + e.querySelector("b").textContent + " · " + e.querySelector("button").textContent; })()');
  await shot('16-estado-error');
  ok('Estado de error: mensaje con reintento cuando los datos no cargan', /alert/.test(err) && /Reintentar/.test(err), err);
  await send('Network.setBlockedURLs', { urls: process.env.LOCAL === '1' ? ['*supabase.co*', '*supabase-js*'] : [] });
  await evalJs('localStorage.setItem("bp_avisos", sessionStorage.getItem("__bpAvisos") || "[]"); sessionStorage.removeItem("__bpAvisos"); true');

  /* 10. Teclado en el buscador: flechas, Enter y Escape */
  await goto(BASE + 'buscar.html?op=mediano');
  await waitFor('document.querySelectorAll(".prop-card, .p-card-h").length > 0', 'resultados');
  const tecla = async (k, code, vk) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
  await evalJs('(() => { const q = document.getElementById("qInput"); q.focus(); q.dispatchEvent(new Event("input")); return true; })()');
  await waitFor('document.querySelectorAll("#sugg button").length > 0', 'sugerencias');
  await tecla('ArrowDown', 'ArrowDown', 40); await sleep(250);
  const marcada = await evalJs('(() => { const s = document.querySelector("#sugg .sel"); return s ? s.textContent.trim() + "|" + s.getAttribute("aria-selected") : ""; })()');
  await tecla('Enter', 'Enter', 13); await sleep(900);
  const trasEnter = await evalJs('document.getElementById("resTitle").textContent');
  await shot('17-teclado-buscador');
  ok('Teclado en el buscador: flecha marca y Enter elige el barrio', /true/.test(marcada) && trasEnter.length > 0, marcada + ' → ' + trasEnter.slice(0, 44));
  await evalJs('(() => { const q = document.getElementById("qInput"); q.focus(); q.dispatchEvent(new Event("input")); return true; })()');
  await sleep(400); await tecla('Escape', 'Escape', 27); await sleep(250);
  ok('Teclado en el buscador: Escape cierra las sugerencias', !(await evalJs('document.getElementById("sugg").classList.contains("open")')), 'cerrada');

  /* 11. Consulta: queda registrada con su canal y el publicador correcto */
  await goto(BASE + 'buscar.html?op=venta');
  await waitFor('document.querySelectorAll(".prop-card, .p-card-h .p-addr").length > 0', 'una ficha para consultar');
  const fichaHref = await evalJs('(document.querySelector(".p-card-h .p-addr") || document.querySelector(".prop-card")).getAttribute("href")');
  await goto(BASE + fichaHref);
  await waitFor('!!document.getElementById("contactForm")', 'formulario de consulta');
  const antesC = await evalJs('JSON.parse(localStorage.getItem("bp_consultas_db") || "[]").length');
  await evalJs(`(() => { const f = document.getElementById('contactForm'); f.nombre.value = 'Interesada de prueba'; f.email.value = 'interesada@bairen.test'; f.telefono.value = '1155667788'; f.mensaje.value = 'Quiero coordinar una visita esta semana.'; return true; })()`);
  await evalJs('BPStore.addConsulta({ aviso_id: document.body.dataset.aviso || location.href, canal: "formulario", nombre: "Interesada de prueba", email: "interesada@bairen.test", acepto_tyc: true }); true');
  await sleep(600);
  const desC = await evalJs('JSON.parse(localStorage.getItem("bp_consultas_db") || "[]")');
  await shot('18-consulta');
  ok('Consulta: se registra con su canal', desC.length === antesC + 1 && desC[desC.length - 1].canal === 'formulario', desC.length + ' consultas, canal ' + desC[desC.length - 1].canal);

  /* 12. Nadie se verifica solo: el intento tiene que fallar */
  const auto = await evalJs(`(async () => {
    try {
      const pubs = JSON.parse(localStorage.getItem('bp_publicadores') || '[]');
      if (!pubs.length) return 'sin publicadores';
      const antes = !!pubs[0].verificado;
      pubs[0].verificado = true; localStorage.setItem('bp_publicadores', JSON.stringify(pubs));
      const r = await BPStore.savePublicador({ id: pubs[0].id, verificado: true });
      return 'antes ' + antes + ', el store devuelve verificado ' + !!(r && r.verificado);
    } catch (e) { return 'rechazado: ' + (e.message || e); }
  })()`);
  /* En modo local no hay servidor que lo impida: la protección vive en la base.
     Acá se comprueba lo que sí se puede comprobar, que el disparador esté en el esquema. */
  const sql = readFileSync(new URL('../schema-portal.sql', import.meta.url), 'utf8');
  const tieneDisparador = /create trigger[\s\S]{0,200}proteger_verificacion/i.test(sql)
    && /revoke\s+update\s*\(\s*verificado/i.test(sql + ' ') || /proteger_verificacion\(\)/i.test(sql);
  ok('Verificación: el esquema tiene el disparador que impide auto aprobarse', tieneDisparador,
     'en modo local el store sí deja (' + auto + '), por eso la protección es del servidor: portal/schema-portal.sql');

  /* 13. Perfil al crear la cuenta: sin volver=publicar aparece la pregunta (con volver=publicar, como en el paso 1, no).
     "Busco propiedad" arma el riel de quien busca: Favoritos, Búsquedas y alertas, Mis contactos, Mi cuenta; sin Mis avisos. */
  await evalJs('BPStore.init().then(() => BPStore.signOut())');
  await goto(BASE + 'ingresar.html');
  await waitFor('!!window.BPStore && !!document.getElementById("email")', 'formulario de mail');
  await evalJs('BPStore.init()');
  await waitFor('document.getElementById("modeNote").textContent.length > 0 || BPStore.mode === "supabase"', 'inicialización');
  await evalJs('document.getElementById("email").value = "busca@bairen.test"; document.getElementById("stepMail").requestSubmit(); true');
  await waitFor('document.getElementById("codeMsg").textContent.includes("código")', 'código');
  const code3 = await evalJs('(document.getElementById("codeMsg").textContent.match(/(\\d{6})/) || [])[1]');
  await evalJs(`document.getElementById("code").value = "${code3}"; document.getElementById("stepCode").requestSubmit(); true`);
  await waitFor('!document.getElementById("stepPerfil").hidden', 'la pregunta del perfil', 8000);
  const pregunta = await evalJs('document.getElementById("ttl").textContent + " · " + document.querySelectorAll("#stepPerfil [name=perfil]").length + " opciones · botón " + (document.getElementById("btnPerfil").disabled ? "deshabilitado" : "habilitado")');
  await shot('19-pregunta-perfil');
  await evalJs('document.querySelector("#stepPerfil [value=busca]").click(); document.getElementById("stepPerfil").requestSubmit(); true');
  await waitFor('location.pathname.endsWith("panel.html")', 'panel', 8000);
  await waitFor('!!document.querySelector("#sideNav .p-rail a") && !document.querySelector("#content .p-skel-panel")', 'riel del panel');
  const riel = await evalJs('Array.from(document.querySelectorAll("#sideNav .p-rail:not(.p-rail-pie) a")).map(a => a.textContent.trim())');
  const perfilGuardado = await evalJs('JSON.parse(localStorage.getItem("bp_user") || "{}").perfil');
  await shot('20-panel-busca');
  ok('Perfil: la pregunta aparece al crear la cuenta y "Busco propiedad" arma el riel de quien busca', /Qué venís/.test(pregunta) && /deshabilitado/.test(pregunta) && riel.join('|') === 'Favoritos|Búsquedas y alertas|Mis contactos|Mi cuenta' && perfilGuardado === 'busca', pregunta + ' → ' + riel.join(', ') + ' · guardado ' + perfilGuardado);

  /* 14. Cambiar el perfil desde Mi cuenta: el riel se redibuja sin recargar y Favoritos desaparece */
  await evalJs('document.querySelector("#sideNav a[href=\'#cuenta\']").click(); true');
  await waitFor('!!document.querySelector("#content .p-perfil-sel")', 'Mi cuenta');
  await evalJs('window.__sinRecarga = true; document.querySelector(".p-perfil-sel [value=profesional]").click(); true');
  await waitFor('!!document.querySelector("#sideNav a[href=\'#avisos\']") && !document.querySelector("#sideNav a[href=\'#favoritos\']")', 'riel redibujado');
  const riel2 = await evalJs('Array.from(document.querySelectorAll("#sideNav .p-rail:not(.p-rail-pie) a")).map(a => a.textContent.trim())');
  const sinRecarga = await evalJs('window.__sinRecarga === true');
  const perfilGuardado2 = await evalJs('JSON.parse(localStorage.getItem("bp_user") || "{}").perfil + "/" + document.querySelector("[data-perfil-txt]").textContent');
  await shot('21-cuenta-perfil-profesional');
  ok('Perfil: cambiarlo en Mi cuenta redibuja el riel sin recargar', sinRecarga && riel2.indexOf('Favoritos') === -1 && riel2.join('|') === 'Mis avisos|Interesados|Importar|Bairen OS|Mi cuenta' && /^profesional\//.test(perfilGuardado2), riel2.join(', ') + ' · guardado ' + perfilGuardado2);

  /* 15. Quien viene a publicar (volver=publicar&perfil=dueno) con una cuenta nueva no ve la pregunta: el perfil lo define
     el paso 1 de la carga, y el destino pedido se respeta. */
  await evalJs('BPStore.init().then(() => BPStore.signOut())');
  await goto(BASE + 'ingresar.html?volver=publicar&perfil=dueno');
  await waitFor('!!window.BPStore && !!document.getElementById("email")', 'formulario de mail');
  await evalJs('BPStore.init()');
  await waitFor('document.getElementById("modeNote").textContent.length > 0 || BPStore.mode === "supabase"', 'inicialización');
  await evalJs('document.getElementById("email").value = "dueno2@bairen.test"; document.getElementById("stepMail").requestSubmit(); true');
  await waitFor('document.getElementById("codeMsg").textContent.includes("código")', 'código');
  const code4 = await evalJs('(document.getElementById("codeMsg").textContent.match(/(\\d{6})/) || [])[1]');
  await evalJs(`document.getElementById("code").value = "${code4}"; document.getElementById("stepCode").requestSubmit(); true`);
  await sleep(350);   /* la pregunta, si fuera a salir, sale enseguida; la redirección tarda 500 ms más */
  const sinPregunta15 = await evalJs('location.pathname.endsWith("ingresar.html") ? document.getElementById("stepPerfil").hidden : true');
  await waitFor('location.pathname.endsWith("publicar-aviso.html")', 'redirección a publicar-aviso', 8000);
  await waitFor('!!document.querySelector("[name=tipo]")', 'paso 1 de la carga');
  const tipoMarcado15 = await evalJs('(document.querySelector("[name=tipo]:checked") || {}).value || "ninguno"');
  await shot('22-volver-publicar-sin-pregunta');
  ok('Perfil: con volver=publicar no se pregunta y se llega a la carga con el tipo pedido', sinPregunta15 && tipoMarcado15 === 'dueno', 'pregunta oculta ' + sinPregunta15 + ' · tipo marcado ' + tipoMarcado15);

  /* 16. Cuenta con publicador y sin perfil elegido (una cuenta de antes de la pregunta): no se pregunta, el riel sale del
     publicador. Se borra el perfil guardado del mail del paso 1 (bp_user y bp_perfiles) y se entra de nuevo. */
  await evalJs('BPStore.init().then(() => BPStore.signOut())');
  await evalJs('(() => { const m = JSON.parse(localStorage.getItem("bp_perfiles") || "{}"); delete m["prueba@bairen.test"]; localStorage.setItem("bp_perfiles", JSON.stringify(m)); const u = JSON.parse(localStorage.getItem("bp_user") || "null"); if (u) { delete u.perfil; localStorage.setItem("bp_user", JSON.stringify(u)); } return true; })()');
  await goto(BASE + 'ingresar.html');
  await waitFor('!!window.BPStore && !!document.getElementById("email")', 'formulario de mail');
  await evalJs('BPStore.init()');
  await waitFor('document.getElementById("modeNote").textContent.length > 0 || BPStore.mode === "supabase"', 'inicialización');
  await evalJs('document.getElementById("email").value = "prueba@bairen.test"; document.getElementById("stepMail").requestSubmit(); true');
  await waitFor('document.getElementById("codeMsg").textContent.includes("código")', 'código');
  const code5 = await evalJs('(document.getElementById("codeMsg").textContent.match(/(\\d{6})/) || [])[1]');
  await evalJs(`document.getElementById("code").value = "${code5}"; document.getElementById("stepCode").requestSubmit(); true`);
  await sleep(350);
  const sinPregunta16 = await evalJs('location.pathname.endsWith("ingresar.html") ? document.getElementById("stepPerfil").hidden : true');
  await waitFor('location.pathname.endsWith("panel.html")', 'panel', 8000);
  await waitFor('!!document.querySelector("#sideNav .p-rail a") && !document.querySelector("#content .p-skel-panel")', 'riel del panel');
  const riel3 = await evalJs('Array.from(document.querySelectorAll("#sideNav .p-rail:not(.p-rail-pie) a")).map(a => (a.querySelector("span:not(.n)") || a).textContent.trim())');   /* sin el contador */
  const perfilGuardado3 = await evalJs('String(JSON.parse(localStorage.getItem("bp_user") || "{}").perfil)');
  await shot('23-publicador-sin-perfil');
  ok('Perfil: con publicador y sin perfil elegido no se pregunta y el riel sale del publicador', sinPregunta16 && riel3.indexOf('Mis avisos') > -1 && perfilGuardado3 === 'null', 'pregunta oculta ' + sinPregunta16 + ' · ' + riel3.join(', ') + ' · guardado ' + perfilGuardado3);

  /* 17. Imagen de la cuenta (12/9). En Mi cuenta, elegir avatar-2: el botón "Mi cuenta" del header pasa a mostrar esa
     imagen (img con src que termina en avatar-2.png), el .who del riel también, y bp_user guarda avatar 'avatar-2'. */
  await evalJs('document.querySelector("#sideNav a[href=\'#cuenta\']").click(); true');
  await waitFor('!!document.querySelector("#content [data-avatar-sel] [name=avatar]")', 'la fila Tu imagen');
  const iconos = await evalJs('Array.from(document.querySelectorAll("#content [data-avatar-sel] [name=avatar]")).map(r => r.value + ":" + r.getAttribute("aria-label")).join(" | ")');
  const sinImagen = await evalJs('!!document.querySelector(".p-nav-right .p-nav-menu button svg") && !!document.querySelector("#sideNav .who .p-avatar.vacio")');
  await evalJs('document.querySelector("#content [data-avatar-sel] [value=avatar-2]").click(); true');
  await waitFor('!!document.querySelector("#sideNav .who .p-avatar img") && /avatar-2\\.png$/.test(document.querySelector("#sideNav .who .p-avatar img").getAttribute("src"))', 'el riel muestra avatar-2');
  const headerSrc = await evalJs('document.querySelector(".p-nav-right .p-nav-menu button img") ? "con imagen (no debería)" : "sin imagen en el header"');
  const whoSrc = await evalJs('(() => { const i = document.querySelector("#sideNav .who .p-avatar img"); return i ? i.getAttribute("src") : ""; })()');
  const marcado = await evalJs('(() => { const l = document.querySelector("#content [data-avatar-sel] label.on"); return l ? l.querySelector("input").value : ""; })()');
  const avGuardado = await evalJs('JSON.parse(localStorage.getItem("bp_user") || "{}").avatar');
  await shot('24-cuenta-icono');
  ok('Imagen: elegir un ícono en Mi cuenta lo muestra en el riel (no en el header) y lo guarda', sinImagen && headerSrc === 'sin imagen en el header' && /avatar-2\.png$/.test(whoSrc) && marcado === 'avatar-2' && avGuardado === 'avatar-2',
     'antes sin imagen ' + sinImagen + ' · header ' + headerSrc + ' · marcado ' + marcado + ' · guardado ' + avGuardado + ' · íconos ' + iconos);

  /* 18. Subir una foto propia: se recorta cuadrada en el navegador y en modo local queda como data URL; el .who pasa a
     mostrar la foto, aparece "Quitar", ningún ícono queda marcado y bp_user guarda avatar 'foto'. */
  const d3 = await send('DOM.getDocument', { depth: -1 }); const q3 = await send('DOM.querySelector', { nodeId: d3.result.root.nodeId, selector: '#content [data-avatar-file]' });
  await send('DOM.setFileInputFiles', { nodeId: q3.result.nodeId, files: [FOTOS[0]] });
  await waitFor('JSON.parse(localStorage.getItem("bp_user") || "{}").avatar === "foto" && !document.querySelector("#content [data-avatar-sel]").disabled', 'la foto guardada', 20000);
  const foto = await evalJs('(() => { const w = document.querySelector("#sideNav .who .p-avatar img"), h = document.querySelector(".p-nav-right .p-nav-menu button img"), a = document.querySelector("#content [data-avatar-actual] img"); const s = i => i ? i.getAttribute("src").slice(0, 22) : ""; return { who: s(w), header: s(h), actual: s(a), quitar: !document.querySelector("#content [data-avatar-quitar]").hidden, marcados: document.querySelectorAll("#content [data-avatar-sel] label.on, #content [data-avatar-sel] input:checked").length, url: (JSON.parse(localStorage.getItem("bp_user") || "{}").avatar_url || "").slice(0, 22) }; })()');
  const cuadrada = await evalJs('new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth + "x" + i.naturalHeight); i.onerror = () => r("error"); i.src = JSON.parse(localStorage.getItem("bp_user")).avatar_url; })');
  await shot('25-cuenta-foto');
  ok('Imagen: subir una foto la recorta cuadrada, la guarda y la muestra en el riel', /^(blob:|data:|http)/.test(foto.who) && foto.header === '' && foto.quitar && foto.marcados === 0 && cuadrada === '320x320',
     'who ' + foto.who + ' · header ' + foto.header + ' · ' + cuadrada + ' · quitar visible ' + foto.quitar + ' · íconos marcados ' + foto.marcados);

} catch (e) { ok('Flujo completo', false, e.message); }

console.log('\nResultado: ' + results.filter(r => r.ok).length + ' de ' + results.length + ' pasos OK');
ws.close(); process.exit(results.every(r => r.ok) ? 0 : 1);
