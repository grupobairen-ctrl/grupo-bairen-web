/* Recorrido de Explorar y Se busca en modo local (sin base). Uso: BP_PUERTO=8121 BP_CHROME=9321 BP_CAPTURAS=... node flujo.mjs */
import { conectar, sleep, BASE } from '../flujos/cdp.mjs';
const c = await conectar();
const R = []; const ok = (n, v, extra) => { R.push((v ? 'OK   ' : 'FALLA') + ' ' + n + (extra ? '  · ' + extra : '')); };
const ev = c.ev;
const esperar = async (expr, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await ev(expr); if (v && !(typeof v === 'string' && v.startsWith('EXC'))) return v; await sleep(150); } return null; };
const clic = async (sel, ms = 600) => { const r = await ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return 'no está: ${sel.replace(/'/g,'')}'; b.click(); return true})()`); await sleep(ms); return r; };
const toast = () => ev('(document.getElementById("bpToast")||{}).textContent || ""');
const SES = (u) => `localStorage.setItem('bp_user', JSON.stringify(${JSON.stringify(u)})); true`;
const ANA = { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' };
const PABLO = { id: 'local-pablo', email: 'pablo@prueba.local', perfil: 'profesional' };
const ahora = Date.now(), iso = d => new Date(ahora - d * 864e5).toISOString();
const FOTO = n => BASE + 'test/flujos/fotos-prueba/foto' + n + '.jpg';
const PUB = { id: 'pub-gestora', slug: 'gestora-prueba', tipo: 'gestor', nombre: 'Gestora Prueba', auth_user_id: 'local-pablo', verificado: true, whatsapp: '5491100000000', zonas: ['Palermo', 'Recoleta'] };
const AVISOS = [
  { id: 'av-pablo-1', slug: 'gorriti-4800', codigo: 'BA-GORRITI-M1', publicador_id: 'pub-gestora', estado_curacion: 'publicado', estado: 'disponible', operacion: 'mediano', tipo: 'Departamento', direccion: 'Gorriti 4800', unidad: '3B', barrio: 'Palermo', ciudad: 'Capital Federal', ambientes: 2, dormitorios: 1, banos: 1, m2_total: 55, m2_cubierto: 50, precio: 1400, moneda: 'USD', amoblado: true, fotos: [{ url: FOTO(1), orden: 0 }, { url: FOTO(2), orden: 1 }], publicado_en: iso(2), created_at: iso(2), updated_at: iso(2), descripcion: 'Dos ambientes luminosos, amoblados, a dos cuadras de Plaza Armenia.' },
  { id: 'av-pablo-2', slug: 'ayacucho-1700', codigo: 'BA-AYACUCHO-V1', publicador_id: 'pub-gestora', estado_curacion: 'publicado', estado: 'disponible', operacion: 'venta', tipo: 'Departamento', direccion: 'Ayacucho 1700', unidad: '8A', barrio: 'Recoleta', ciudad: 'Capital Federal', ambientes: 3, dormitorios: 2, banos: 2, m2_total: 92, m2_cubierto: 84, precio: 265000, moneda: 'USD', fotos: [{ url: FOTO(3), orden: 0 }], publicado_en: iso(5), created_at: iso(5), updated_at: iso(5), descripcion: 'Tres ambientes al frente con balcón.' }
];
/* Para ver una baja de precio en modo local (digital.js no las genera sin base): se suma una fila a lo que devuelve novedades() */
const BAJA = `(function(){ let real; Object.defineProperty(window, 'BPDigital', { configurable: true, get(){ return real; }, set(v){ real = v; const o = v.novedades; v.novedades = async function(){ const r = await o.apply(this, arguments); let a = null; try { a = (await BPData.load()).avisos.find(x => x.id === 'av-pablo-2'); } catch (e) {} return a ? [{ tipo: 'baja_precio', aviso_id: 'av-pablo-2', publicacion_id: null, fecha: new Date(Date.now() - 3 * 36e5).toISOString(), anterior: 289000, precio: 265000, moneda: 'USD', titulo: null, texto: null, entrega: null, publicador_id: 'pub-gestora' }].concat(r) : r; }; } }); })()`;
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: BAJA });

/* ── 0 · limpio ── */
await c.vista(true);
await c.ir('index.html', 400);
await ev('localStorage.clear(); sessionStorage.clear(); true');

/* ── 1 · cerrado (cookie bp_cerrado del servidor de prueba) y sin ?digital=1: Muy pronto ── */
await ev(`document.cookie = 'bp_cerrado=1; path=/; max-age=120'; true`);
await c.ir('explorar.html', 1500);
ok('1 explorar sin interruptor: Muy pronto', await esperar('!!document.querySelector(".p-dg-pronto")'));
await c.foto('01-pronto-m');
await c.ir('se-busca.html', 1500);
ok('1 se-busca sin interruptor: Muy pronto (sin pedir sesión)', (await esperar('!!document.querySelector(".p-dg-pronto")')) && /se-busca/.test(await ev('location.pathname')));
await c.vista(false); await c.ir('explorar.html', 1200); await c.foto('01-pronto-d');
await ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; true`);

/* ── 2 · con ?digital=1, sin sesión ── */
await c.vista(true);
await c.ir('explorar.html?digital=1', 2500);
ok('2 novedades visibles sin sesión', await esperar('document.querySelectorAll("#feed .p-ex-item").length > 3'), await ev('document.querySelectorAll("#feed .p-ex-item").length + " filas"'));
await c.foto('02-explorar-visitante-m'); await c.foto('02-explorar-visitante-m-completa', true);
await clic('#tabSb', 700);
ok('2 Se busca invita a ingresar', await esperar('!!document.querySelector("#sb .p-ex-invita a[href^=\'ingresar.html\']")'), await ev('(document.querySelector("#sb .p-ex-invita a")||{}).getAttribute("href")'));
ok('2 sin lista de búsquedas sin sesión', !(await ev('!!document.querySelector(".p-ex-bus")')));
await c.foto('02-sebusca-invita-m', true);
await c.vista(false); await c.ir('explorar.html', 2200); await c.foto('02-explorar-visitante-d', true);
await c.ir('explorar.html#se-busca', 1800); await c.foto('02-sebusca-invita-d');
ok('2 #se-busca abre la pestaña', await ev('document.getElementById("tabSb").getAttribute("aria-selected") === "true"'));

/* ── 3 · Ana crea una búsqueda ── */
await c.vista(true);
await ev(SES(ANA));
await c.ir('se-busca.html', 1800);
ok('3 se-busca con sesión muestra el formulario', await esperar('!!document.getElementById("fBus")'));
await c.foto('03-sebusca-vacio-m', true);
const llenar = async (detalle) => ev(`(function(){
  const f = document.getElementById('fBus');
  f.querySelector('[name=perfil][value=inversor]').click();
  f.querySelector('[name=op][value=mediano]').click();
  ['Palermo','Recoleta'].forEach(z => { const x = f.querySelector('[name=zona][value="'+z+'"]'); if (!x.checked) x.click(); });
  const s = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  s('fAmb', '2'); s('fDorm', '1'); s('fM2', '45'); s('fPrecio', '1500'); s('fDesde', '2026-11-01'); s('fPlazo', '6');
  s('fDetalle', ${JSON.stringify(detalle)});
  return [!document.getElementById('filaPlazo').hidden, document.getElementById('filaMoneda').hidden, document.getElementById('precioLbl').textContent].join('|');
})()`);
ok('3 campos según la operación (plazo visible, moneda oculta en mediano)', /^true\|true\|/.test(await llenar('Llámenme al 11 5555 4444, gracias.')), await ev('document.getElementById("precioLbl").textContent'));
await clic('#btnGuardar', 900);
const errTel = await ev('(document.getElementById("fDetalle-err")||{}).textContent || ""');
ok('3 un teléfono en el detalle da error legible', /contacto/i.test(errTel) && (await ev('document.getElementById("fDetalle").getAttribute("aria-invalid")')) === 'true', errTel);
ok('3 no se guardó con el teléfono', (await ev('JSON.parse(localStorage.getItem("bp_dg_bus")||"[]").length')) === 0);
await c.foto('03-sebusca-error-telefono-m');
await ev(`(function(){ const e = document.getElementById('fDetalle'); e.value = 'Llego con mi pareja por trabajo, seis meses. Preferimos piso alto y luminoso, cerca del subte.'; e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
await clic('#btnGuardar', 1200);
const bus = await ev('JSON.parse(localStorage.getItem("bp_dg_bus")||"[]")');
ok('3 búsqueda guardada', Array.isArray(bus) && bus.length === 1 && bus[0].linea === 'mediano' && bus[0].zonas.length === 2, bus && bus[0] && [bus[0].perfil, bus[0].operacion, bus[0].linea, bus[0].zonas.join('+'), bus[0].precio_max, bus[0].plazo_meses].join(' · '));
ok('3 aparece en Tus búsquedas', await esperar('document.querySelectorAll(".p-sb-bus").length === 1'), await ev('(document.querySelector(".p-sb-bus .p-ex-bus-tit")||{}).textContent'));
await sleep(600);
await c.foto('03-sebusca-guardada-m', true);
await clic('#btnNueva', 700);
ok('3 Nueva búsqueda abre el formulario en el celular', await ev('getComputedStyle(document.getElementById("formSec")).display !== "none"'));
await c.foto('03-sebusca-form-abierto-m', true);
await clic('#btnCancelar', 400);
await c.vista(false); await c.ir('se-busca.html', 1800); await c.foto('03-sebusca-d', true);

/* ── 4 · Pablo (publicador) propone una unidad ── */
await c.vista(true);
await ev(`localStorage.setItem('bp_publicadores', JSON.stringify([${JSON.stringify(PUB)}])); localStorage.setItem('bp_avisos', JSON.stringify(${JSON.stringify(AVISOS)})); ${SES(PABLO)}`);
await c.ir('explorar.html', 2500);
ok('4 baja de precio con el anterior tachado', await esperar('!!document.querySelector(".p-ex-u.es-baja s")'), await ev('(document.querySelector(".p-ex-u.es-baja .p-ex-u-precio")||{}).textContent'));
ok('4 la unidad recién publicada de Pablo en el feed', await ev('!!document.querySelector(".p-ex-u-link[href*=av-pablo-1]")'));
await c.foto('04-feed-con-baja-m');
await c.ir('explorar.html#se-busca', 2500);
ok('4 Pablo ve la búsqueda de Ana', await esperar('document.querySelectorAll(".p-ex-bus").length === 1'), await ev('(document.querySelector(".p-ex-bus-tit")||{}).textContent'));
ok('4 botón Proponer una propiedad', await ev('!!document.querySelector("[data-proponer]")'));
ok('4 herramientas de publicador arriba (Publicar una novedad)', await ev('!!document.getElementById("btnNov")'));
await c.foto('04-sebusca-publicador-m', true);
await clic('[data-proponer]', 900);
ok('4 hoja de proponer con sus unidades', await esperar('document.querySelectorAll(".p-dg-unidad").length === 2'), await ev('Array.from(document.querySelectorAll(".p-dg-unidad b")).map(x=>x.textContent).join(" | ")'));
ok('4 la que coincide va primero', await ev('!!document.querySelector(".p-dg-unidad:first-child em.ok") && document.querySelector(".p-dg-unidad:first-child input").value === "av-pablo-1"'));
ok('4 foco dentro de la hoja', await ev('!!document.activeElement.closest(".p-dg-hoja")'));
await c.foto('04-proponer-hoja-m');
await clic('#propEnviar', 500);
ok('4 sin elegir unidad: error legible', /Elegí la unidad/.test(await ev('(document.getElementById("gUni-err")||{}).textContent||""')));
await ev('document.querySelector(".p-dg-unidad input[value=av-pablo-1]").click(); document.getElementById("propMsj").value = "Está libre desde noviembre, amoblado y con todo incluido. Te puedo mostrar fotos del balcón."; true');
await c.foto('04-proponer-elegida-m');
await clic('#propEnviar', 1400);
const props = await ev('JSON.parse(localStorage.getItem("bp_dg_props")||"[]")');
ok('4 propuesta guardada', props.length === 1 && props[0].aviso_id === 'av-pablo-1' && props[0].publicador_id === 'pub-gestora', props[0] && props[0].estado);
ok('4 hoja cerrada y contador actualizado', await esperar('!document.querySelector(".p-dg-velo") && /1 propuesta/.test(document.querySelector(".p-ex-bus-n").textContent)'), await ev('document.querySelector(".p-ex-bus-n").textContent'));
await c.foto('04-propuesta-enviada-m', true);
/* curador (en modo local, cualquiera con sesión): marcar verificada */
await clic('[data-verif]', 1200);
ok('4 curador marca la búsqueda verificada', await esperar('!!document.querySelector(".p-ex-bus.es-verif") && /verificado/.test(document.querySelector(".p-ex-bus-tit").textContent)'), await ev('document.querySelector(".p-ex-bus-tit").textContent'));
await c.vista(false); await c.ir('explorar.html#se-busca', 2300); await c.foto('04-sebusca-publicador-d', true);
await clic('[data-proponer]', 900); await c.foto('04-proponer-hoja-d'); await ev('document.querySelector(".p-dg-x").click(); true'); await sleep(400);

/* ── 6 · Pablo publica una novedad; el curador la aprueba y aparece en el feed (y una segunda se rechaza) ── */
await c.vista(true);
await c.ir('explorar.html', 2500);
await clic('#btnNov', 900);
ok('6 hoja Publicar una novedad', await esperar('!!document.getElementById("fNov")'));
await clic('#novEnviar', 500);
ok('6 título vacío: error legible', /título/i.test(await ev('(document.getElementById("novTit-err")||{}).textContent||""')));
await ev(`(function(){ document.querySelector('[name=tipo][value=lanzamiento]').click(); document.getElementById('novTit').value = 'Abrimos la reserva de los dos ambientes de Gorriti'; document.getElementById('novTit').dispatchEvent(new Event('input')); document.getElementById('novTxt').value = 'Seis unidades amobladas para estadías de 3 a 12 meses.' + String.fromCharCode(10) + 'Todo incluido y sin garantía propietaria.'; document.getElementById('novEnt').value = '2027-03-01'; document.getElementById('novUni').value = 'av-pablo-1'; return true; })()`);
await c.foto('06-novedad-hoja-m');
await clic('#novEnviar', 1400);
ok('6 lo propio del publicador plegado en el celular', (await ev('document.getElementById("misDet").open')) === false);
await ev('document.getElementById("misDet").open = true; true');
ok('6 novedad en revisión', await esperar('/En revisión/.test(document.getElementById("misPubs").textContent)'), await toast());
ok('6 aparece en Para revisar', await esperar('document.querySelectorAll("#revLista .p-ex-rev").length === 1'));
ok('6 todavía no está en el feed', !(await ev('!!document.querySelector("#feed .p-ex-p")')));
await c.foto('06-para-revisar-m', true);
/* una segunda, para rechazarla */
await clic('#btnNov', 800);
await ev(`(function(){ document.getElementById('novTit').value = 'Llamanos al 11 5555 4444'; return true; })()`);
await clic('#novEnviar', 1300);
await esperar('document.querySelectorAll("#revLista .p-ex-rev").length === 2');
await clic('#revLista .p-ex-rev:last-child [data-rechazar]', 800);
await clic('#fRech button[type=submit]', 500);
ok('6 rechazar sin motivo: error legible', /motivo/i.test(await ev('(document.getElementById("rechMot-err")||{}).textContent||""')));
await ev('document.getElementById("rechMot").value = "Sin teléfonos en el título: el contacto pasa por BAIREN."; true');
await c.foto('06-rechazar-hoja-m');
await clic('#fRech button[type=submit]', 1300);
ok('6 rechazada con motivo visible para el publicador', await esperar('/Motivo: Sin teléfonos/.test(document.getElementById("misPubs").textContent)'));
await clic('#revLista [data-aprobar]', 1500);
ok('6 aprobada: aparece en el feed', await esperar('!!document.querySelector("#feed .p-ex-p.t-lanzamiento")'), await ev('(document.querySelector("#feed .p-ex-p .p-ex-p-tit")||{}).textContent'));
ok('6 con la unidad y la entrega', await ev('!!document.querySelector("#feed .p-ex-p .p-ex-mini") && /Entrega estimada/.test(document.querySelector("#feed .p-ex-p").textContent)'), await ev('(document.querySelector("#feed .p-ex-p .p-ex-p-meta")||{}).textContent'));
ok('6 Para revisar vacío', await esperar('/Nada pendiente/.test(document.getElementById("revLista").textContent)'));
await c.foto('06-feed-con-novedad-m', true);
await clic('[data-f=pub]', 500);
ok('6 filtro De quienes publican', await ev('document.querySelectorAll("#feed .p-ex-item").length === 1'));
await c.foto('06-feed-filtro-pub-m');
await c.vista(false); await c.ir('explorar.html', 2500); await c.foto('06-explorar-publicador-d', true);
await clic('#btnNov', 900); await c.foto('06-novedad-hoja-d'); await ev('document.querySelector(".p-dg-x").click(); true'); await sleep(400);

/* ── 5 · Ana ve la propuesta y la acepta ── */
await c.vista(true);
await ev(SES(ANA));
await c.ir('se-busca.html', 2000);
ok('5 Ana ve la propuesta', await esperar('document.querySelectorAll(".p-sb-prop").length === 1'), await ev('(document.querySelector(".p-sb-prop-quien")||{}).textContent'));
ok('5 la propuesta trae foto, precio, quién y mensaje', await ev('!!document.querySelector(".p-sb-prop img") && /USD 1\.400/.test(document.querySelector(".p-sb-prop-lugar").textContent) && /Gestora Prueba/.test(document.querySelector(".p-sb-prop-quien").textContent) && !!document.querySelector(".p-sb-prop-msj")'));
ok('5 enlace a la ficha', /propiedad/.test(await ev('document.querySelector(".p-sb-prop-tit a").getAttribute("href")')), await ev('document.querySelector(".p-sb-prop-tit a").getAttribute("href")'));
await c.foto('05-propuesta-recibida-m', true);
await c.vista(false); await c.ir('se-busca.html', 1800); await c.foto('05-propuesta-recibida-d', true);
await c.vista(true); await c.ir('se-busca.html#b-' + bus[0].id, 1800);
ok('5 #b-<id> enfoca la búsqueda', await ev('document.activeElement && document.activeElement.id === "b-' + bus[0].id + '"'));
await clic('[data-aceptar]', 900);
ok('5 confirmar antes de aceptar', await ev('!!document.querySelector(".p-dg-hoja [data-si]")'), await ev('(document.querySelector(".p-dg-hoja .p-dg-txt")||{}).textContent'));
await c.foto('05-aceptar-confirmar-m');
await clic('.p-dg-hoja [data-si]', 700);
ok('5 explica que ya pueden hablar', await esperar('/Ya pueden conversar/.test((document.querySelector(".p-dg-ok")||{}).textContent||"")'));
await c.foto('05-aceptada-m');
const destino = await esperar('location.href.indexOf("mensajes.html?op=") > -1 ? location.href : ""', 7000);
ok('5 redirige a mensajes.html?op=…', !!destino, destino);
const ops = await ev('JSON.parse(localStorage.getItem("bp_dg_ops")||"[]")');
ok('5 operación abierta con origen se_busca', ops.length === 1 && ops[0].origen === 'se_busca' && destino && destino.indexOf(encodeURIComponent(ops[0].id)) > -1, ops[0] && ops[0].id);

/* ── extras: Ana pausa/reactiva; el feed en la compu con sesión de Ana ── */
await c.ir('se-busca.html', 1800);
ok('extra la aceptada muestra Ir a la conversación', await ev('!!document.querySelector(".p-sb-prop.e-aceptada a[href^=\'mensajes.html?op=\']")'));
await clic('[data-estado=pausada]', 1100);
ok('extra pausar', await esperar('!!document.querySelector(".p-sb-bus.e-pausada")'));
await c.foto('07-pausada-m', true);
await clic('[data-estado=activa]', 1100);
ok('extra reactivar', await esperar('!!document.querySelector(".p-sb-bus.e-activa")'));
await clic('[data-editar]', 900);
ok('extra editar llena el formulario', await ev('document.getElementById("formT").textContent === "Editar búsqueda" && document.querySelector("[name=op]:checked").value === "mediano" && document.getElementById("fPrecio").value === "1500"'));
await c.foto('07-editar-m');
await ev('document.getElementById("fPrecio").value = "1700"; true'); await clic('#btnGuardar', 1300);
ok('extra edición guardada', /1\.700/.test(await ev('document.querySelector(".p-sb-bus .p-ex-datos").textContent')));
await c.ir('explorar.html', 2500);
ok('extra Ana en Explorar ve "Es tuya" en Se busca', (await clic('#tabSb', 800)) && await esperar('!!document.querySelector(".p-ex-mia")'));
await c.foto('08-sebusca-ana-m', true);
await c.vista(false); await c.ir('explorar.html', 2500); await c.foto('08-explorar-ana-d', true);

/* Teclado en las pestañas y sin desborde horizontal */
await c.vista(true); await c.ir('explorar.html', 2200);
await ev('document.getElementById("tabNov").focus(); true');
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 }); await sleep(300);
ok('a11y flecha derecha cambia de pestaña', await ev('document.activeElement.id === "tabSb" && !document.getElementById("panSb").hidden'));
for (const [pag, nom] of [['explorar.html', 'explorar'], ['se-busca.html', 'se-busca']]) {
  for (const mob of [true, false]) { await c.vista(mob); await c.ir(pag, 2000); const w = await ev('[document.documentElement.scrollWidth, window.innerWidth]'); ok('sin scroll horizontal ' + nom + (mob ? ' (celular)' : ' (compu)'), w[0] <= w[1], w.join(' ≤ ')); }
}
/* Hoja: Escape cierra y el foco vuelve al botón; con movimiento reducido se quita sin esperar */
await c.vista(true); await c.ir('se-busca.html', 1800);
await ev('document.querySelector("[data-borrar]").focus(); document.querySelector("[data-borrar]").click(); true'); await sleep(500);
ok('a11y la hoja abre con foco adentro', await ev('!!document.activeElement.closest(".p-dg-hoja") && document.activeElement.hasAttribute("data-si")'));
await c.foto('09-confirmar-borrar-m');
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(500);
/* Espera a que la hoja termine de cerrarse (con la máquina cargada, 500 ms a veces no alcanzaban) */
ok('a11y Escape cierra y devuelve el foco', await esperar('!document.querySelector(".p-dg-velo") && document.activeElement.hasAttribute("data-borrar") && !document.documentElement.classList.contains("p-dg-quieta")'));
ok('a11y Escape no borró nada', (await ev('JSON.parse(localStorage.getItem("bp_dg_bus")||"[]").length')) === 1);
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await c.ir('explorar.html', 2200);
ok('movimiento reducido: sin animación en las filas', await ev('getComputedStyle(document.querySelector(".p-ex-item") || document.body).animationName === "none"'));
await clic('#tabSb', 300);
await clic('.p-ex-bus [data-verif]', 900);
ok('movimiento reducido: la página sigue andando', await esperar('!!document.querySelector(".p-ex-bus")'));
await c.send('Emulation.setEmulatedMedia', { features: [] });
await c.vista(true); await ev(`document.cookie = 'bp_cerrado=1; path=/; max-age=120'; true`); await c.ir('explorar.html?digital=0', 1500);
ok('?digital=0 vuelve a Muy pronto', await esperar('!!document.querySelector(".p-dg-pronto")'));
await ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; true`); await c.ir('explorar.html?digital=0', 1500);
ok('Abierto para todos: ni con ?digital=0 aparece Muy pronto', await esperar('!document.querySelector(".p-dg-pronto") && !!document.querySelector(".p-ex-bus")'));

console.log(R.join('\n'));
const errs = c.errores.concat(c.consola);
console.log('\nERRORES DE CONSOLA (' + errs.length + '):\n' + errs.join('\n'));
await c.cerrar();
