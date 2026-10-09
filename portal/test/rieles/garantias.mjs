/* Riel de garantías y seguros (migración 33) · prueba de recorrido en modo local (sin base).
   Uso, desde la raíz del repo, con el servidor y el Chrome propios levantados:
     BP_PUERTO=8205 BP_CHROME=9405 BP_CAPTURAS=/tmp/bp-garantias node portal/test/rieles/garantias.mjs mobile|desktop
   Recorre: la plataforma carga proveedores en garantias.html (con errores), quien busca elige garantía en Mensajes
   (hoja con 3 tarjetas, "Ver los 4", "Te llevamos a…", Atrás del celular, propia, cambiar), quien publica la aprueba (cargo al
   tercero, nada al inquilino), la plataforma actualiza otra desde su pantalla, y los casos que no se pueden. */
import { conectar, sleep } from '../flujos/cdp.mjs';
const c = await conectar(); const mob = process.argv[2] !== 'desktop'; await c.vista(mob);
const P = (mob ? 'm' : 'd') + '-gar-';
const CH = 'http://127.0.0.1:' + (process.env.BP_CHROME || 9307);
const casos = []; const ok = (caso, cond, det) => casos.push({ caso, ok: !!cond, det: det == null ? null : String(det).slice(0, 220) });
const J = v => JSON.stringify(v);
const ev = c.ev;
/* Con gesto de usuario (para que window.open no quede bloqueado) */
const evGesto = async expr => { const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }); return r.result?.result?.value; };
const toast = () => ev('(document.getElementById("bpToast")||{}).textContent || ""');
const sinScroll = () => ev('document.documentElement.scrollWidth <= window.innerWidth + 1');
const esperar = async (expr, ms = 5000) => { for (let i = 0; i < ms / 100; i++) { if (await ev(`!!(${expr})`)) return true; await sleep(100); } return false; };
const foto = async n => { await sleep(250); return c.foto(P + n); };
const pestanas = async () => (await (await fetch(CH + '/json/list')).json()).filter(x => x.type === 'page');
const cerrarPestana = async id => { try { await fetch(CH + '/json/close/' + id); } catch (e) {} };
const SES = { ana: { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' }, pub: { id: 'local-pub', email: 'pub@prueba.local', perfil: 'publica' }, cura: { id: 'local-cura', email: 'cura@prueba.local' } };
const como = async (k, url) => { await ev(`localStorage.setItem("bp_user", ${J(J(SES[k]))}); true`); if (url) await c.ir(url, 1600); };
/* Diálogo de Mensajes: completa los campos y lo manda */
const dialogo = async (campos, ms = 1200) => { await esperar('document.querySelector(".ms-dlg form")'); await ev(`(()=>{ const f=document.querySelector(".ms-dlg form"); const v=${J(campos || {})}; for (const k in v){ const e=f.elements[k]; e.value=v[k]; e.dispatchEvent(new Event("input",{bubbles:true})); } f.requestSubmit(); return true })()`); await sleep(ms); };
const accion = async (id, ms = 900) => { const r = await ev(`(()=>{ let b=document.querySelector('[data-acc="${id}"]'); if(!b){ const m=document.getElementById("msMasBtn"); if(m){ m.click(); b=document.querySelector('[data-acc="${id}"]'); } } if(!b) return "no está"; b.click(); return true })()`); await sleep(ms); return r; };
const chips = () => ev('[...document.querySelectorAll("#msAcc [data-acc]")].map(b => (b.closest("#msMasPop") ? "más:" : "") + b.dataset.acc + (b.classList.contains("prim") ? "*" : ""))');
/* textContent: en el celular el panel de detalles está cerrado (oculto) y innerText vendría vacío */
const seccion = () => ev('(() => { const e = document.querySelector("[data-sec=\\"ext-garantia\\"] .ms-sec-in"); return e ? [...e.querySelectorAll("p,span,button,summary,li")].filter(x => !x.children.length).map(x => x.textContent.trim()).filter(Boolean).join(" · ") : null })()');

/* ── 0. Datos de base: interruptor, el publicador de la gestora ── */
await c.ir('index.html', 400);
await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem("bp_digital","1");
  localStorage.setItem("bp_publicadores", ${J(J([{ id: 'pub-gestora', auth_user_id: 'local-pub', nombre: 'Gestora Prueba', tipo: 'gestor', slug: 'gestora-prueba', whatsapp: '5491100000000', verificado: true }]))}); true`);

/* ── 1. La plataforma carga proveedores ───────────────────── */
await como('cura', 'garantias.html');
ok('Plataforma: dos ejemplos, marcados y sin switch', (await ev('[...document.querySelectorAll(".ga-prov")].filter(p => /Ejemplo/.test(p.innerText) && !p.querySelector("[data-activo]")).length')) === 2);
ok('Plataforma: vacío que guía en solicitudes', /Todavía nadie eligió/.test(await ev('document.getElementById("gaCuerpo").innerText')));
await foto('1-plataforma-inicio');
ok('Plataforma inicio sin scroll horizontal', await sinScroll());
const nuevo = async (pasos, ms = 1300) => {
  await ev('(matchMedia("(max-width: 699px)").matches ? document.querySelector("#gaBarra [data-nuevo]") : document.getElementById("gaNuevo")).click(); true'); await sleep(400);
  const r = [];
  for (const campos of pasos) {
    r.push(await ev(`(()=>{ const f=document.querySelector(".ga-dlg form"); const v=${J(campos)}; for (const k in v){ const e=f.elements[k]; if(!e) return "falta "+k; if(e.type==="checkbox") e.checked=!!v[k]; else e.value=v[k]; e.dispatchEvent(new Event("change",{bubbles:true})); } f.requestSubmit(); return (f.querySelector(".ga-err:not([hidden])")||{}).textContent || f.querySelector(".ga-paso").textContent })()`));
    await sleep(250);
  }
  await sleep(ms); return r;
};
ok('Botón principal: abajo en el celular, arriba en la compu', await ev(`(() => { const b = matchMedia("(max-width: 699px)").matches ? document.querySelector("#gaBarra [data-nuevo]") : document.getElementById("gaNuevo"); const r = b.getBoundingClientRect(); return r.height >= 44 && r.bottom <= innerHeight && (matchMedia("(max-width: 699px)").matches ? innerHeight - r.bottom < 40 : true) })()`));
/* Error en el paso 2: web sin https */
await ev('(matchMedia("(max-width: 699px)").matches ? document.querySelector("#gaBarra [data-nuevo]") : document.getElementById("gaNuevo")).click(); true'); await sleep(400);
await foto('2-nuevo-paso1');
await ev(`(()=>{ const f=document.querySelector(".ga-dlg form"); f.elements.nombre.value="Fianza Prueba"; f.elements.tipo.value="fianza"; f.requestSubmit(); return true })()`); await sleep(300);
await ev(`(()=>{ const f=document.querySelector(".ga-dlg form"); f.elements.url.value="http://fianza.bairen.test"; f.requestSubmit(); return true })()`); await sleep(300);
ok('Alta: web sin https se frena en el paso 2', /https:\/\//.test(await ev('(document.querySelector(".ga-dlg .ga-err:not([hidden])")||{}).textContent||""')) && /Paso 2/.test(await ev('document.querySelector(".ga-dlg .ga-paso").textContent')));
await foto('2-nuevo-error');
await ev('history.back(); true'); await sleep(400);
ok('Atrás del celular: vuelve al paso 1', /Paso 1/.test(await ev('document.querySelector(".ga-dlg .ga-paso").textContent')) && (await ev('document.querySelector(".ga-dlg form").elements.nombre.value')) === 'Fianza Prueba');
await ev('history.back(); true'); await sleep(400);
ok('Atrás del celular: cierra la hoja', !(await ev('!!document.querySelector(".ga-dlg")')));
const r1 = await nuevo([{ nombre: 'Fianza Prueba', tipo: 'fianza', descripcion: 'Garantía de fianza para alquileres.', requisitos: 'DNI y recibos de sueldo.' },
  { url: 'https://fianza.bairen.test/solicitar', param_referido: 'ref=bairen&op={op}', costo_pct: '6', cuotas: 'Hasta 6 cuotas' }, { comision_pct: '20', orden: '10' }]);
ok('Alta en tres pasos: fianza guardada', /Para ofrecerlo/.test(await toast()), r1.join(' / '));
/* Un seguro sin productor no se activa */
await nuevo([{ nombre: 'Caución Prueba', tipo: 'caucion' }, { url: 'https://caucion.bairen.test', costo_pct: '4,5', cuotas: 'Hasta 3 cuotas' }, { comision_pct: '15', orden: '30' }]);
const idCaucion = await ev('[...document.querySelectorAll(".ga-prov")].find(p => /Caución Prueba/.test(p.innerText)).querySelector("[data-activo]").dataset.activo');
await ev(`(()=>{ const c=document.querySelector('[data-activo="${idCaucion}"]'); c.checked=true; c.dispatchEvent(new Event("change",{bubbles:true})); return true })()`); await sleep(900);
ok('Seguro sin productor: no se activa', /matrícula SSN/.test(await toast()) && !(await ev(`document.querySelector('[data-activo="${idCaucion}"]').checked`)), await toast());
ok('Costo con coma: 4,5 %', /4,5 %/.test(await ev('[...document.querySelectorAll(".ga-prov")].find(p => /Caución Prueba/.test(p.innerText)).innerText')));
await nuevo([{ nombre: 'Daños Prueba', tipo: 'danos', descripcion: 'Seguro de daños para mediano plazo.', requisitos: 'DNI.' }, { url: 'https://danos.bairen.test', param_referido: 'utm_source=bairen', costo_pct: '2', cuotas: 'Hasta 3 cuotas' },
  { comision_pct: '15', productor_nombre: 'Productora Aliada', productor_matricula_ssn: '12345', orden: '5' }]);
await nuevo([{ nombre: 'Hogar Prueba', tipo: 'hogar' }, { url: 'https://hogar.bairen.test', costo_pct: '1,5', cuotas: 'Mensual' }, { productor_nombre: 'Productora Aliada', productor_matricula_ssn: '12345', orden: '20' }]);
await nuevo([{ nombre: 'Fianza Dos', tipo: 'fianza' }, { url: 'https://fianza-dos.bairen.test', costo_pct: '7', cuotas: 'Hasta 12 cuotas' }, { orden: '40' }]);
for (const n of ['Fianza Prueba', 'Daños Prueba', 'Hogar Prueba', 'Fianza Dos']) {
  const id = await ev(`[...document.querySelectorAll(".ga-prov")].find(p => p.querySelector(".ga-prov-n").textContent === ${J(n)}).querySelector("[data-activo]").dataset.activo`);
  await ev(`(()=>{ const c=document.querySelector('[data-activo="${id}"]'); c.checked=true; c.dispatchEvent(new Event("change",{bubbles:true})); return true })()`); await sleep(900);
}
ok('Cuatro activos', (await ev('JSON.parse(localStorage.getItem("bp_dg_gar_prov")).filter(p => p.activo).map(p => p.nombre).sort().join(",")')) === 'Daños Prueba,Fianza Dos,Fianza Prueba,Hogar Prueba');
ok('Un seguro queda con productor obligatorio', await ev('JSON.parse(localStorage.getItem("bp_dg_gar_prov")).filter(p => p.tipo !== "fianza").every(p => p.requiere_productor)'));
ok('Plataforma: 3 tarjetas a la vista y el resto plegado', (await ev('document.querySelectorAll(".ga-sec .ga-provs")[0].children.length')) === 3 && /Ver los 7/.test(await ev('(document.querySelector(".ga-resto > summary")||{}).textContent||""')));
await foto('3-plataforma-proveedores');
ok('Plataforma proveedores sin scroll horizontal', await sinScroll());

/* ── 2. Quien busca: la operación de mediano plazo ─────────── */
await como('ana', 'mensajes.html');
const op1 = await ev(`BPDigital.abrir({ id:'aviso-1', publicador_id:'pub-gestora', operacion:'mediano', precio:1000, moneda:'USD', titulo:'Dos ambientes', barrio:'Palermo' }, 'Hola, ¿sigue disponible?')`);
await c.ir('mensajes.html?op=' + op1, 2000);
ok('Antes de avanzar: sin "Elegir garantía" ni sección', !(await chips()).some(x => /garantia/.test(x)) && (await seccion()) === null, J(await chips()));
await accion('avanzar'); await dialogo({ nota: 'Somos dos, trabajamos en Palermo.' }, 1600);
const ch1 = await chips();
ok('Después de "Quiero avanzar": "Elegir garantía" a la vista (no en Más)', ch1.some(x => /^ext:garantia_elegir\*?$/.test(x)), J(ch1));
ok('Sección "Garantía" con el texto clave y un botón', /Elegí tu garantía sin salir de la conversación\. Podés usar la que prefieras\./.test(await seccion() || '') && (await ev('document.querySelectorAll("[data-sec=\\"ext-garantia\\"] .ms-btn").length')) === 1, await seccion());
await accion('ext:garantia_elegir', 1200);
ok('Hoja abierta con el texto clave', await ev('!!document.querySelector(".gr-hoja") && /Podés usar la que prefieras/.test(document.querySelector(".gr-hoja").innerText)'));
const hoja = await ev('({ vis: [...document.querySelectorAll(".gr-cuerpo > .gr-ops > .gr-op .gr-op-n")].map(x => x.textContent), resto: (document.querySelector(".gr-resto > summary")||{}).textContent || null, botones: document.querySelectorAll(".gr-cuerpo > .gr-ops > .gr-op [data-elegir]").length, propia: !!document.querySelector("[data-propia]"), ultimo: document.querySelector(".gr-cuerpo").lastElementChild.className, req: [...document.querySelectorAll(".gr-cuerpo > .gr-ops .gr-op-req")].every(d => !d.open), montos: [...document.querySelectorAll(".gr-cuerpo > .gr-ops .gr-op-m")].map(x => x.innerText.replace(/\\n/g, " ")), tag: (document.querySelector(".gr-op-tag")||{}).textContent || null, foco: document.activeElement && document.activeElement.dataset.elegir ? "elegir" : (document.activeElement||{}).className })');
ok('Hoja: hasta 3 tarjetas, un botón "Elegir" por tarjeta', hoja.vis.length === 3 && hoja.botones === 3, J(hoja.vis));
ok('Hoja: en mediano plazo, el seguro de daños primero', hoja.vis[0] === 'Daños Prueba' && /mediano/.test(hoja.tag || ''), hoja.tag);
ok('Hoja: el resto plegado ("Ver los 4")', hoja.resto === 'Ver los 4', hoja.resto);
ok('Hoja: requisitos plegados', hoja.req);
ok('Hoja: sin total conocido, solo el %', hoja.montos[0] === '2 % del total del contrato', J(hoja.montos));
ok('Hoja: "Usar mi garantía propietaria" al final', hoja.propia);
ok('Hoja: el foco va al primer "Elegir"', hoja.foco === 'elegir', hoja.foco);
await foto('4-hoja');
ok('Hoja sin scroll horizontal', await sinScroll());
ok('Hoja: textos cortos (título y botones)', await ev('[...document.querySelectorAll(".gr-hoja .ms-dlg-t, .gr-hoja [data-elegir]")].every(x => x.textContent.trim().split(/\\s+/).length <= 5)'));
await ev('history.back(); true'); await sleep(500);
ok('Atrás del celular: cierra la hoja', !(await ev('!!document.querySelector(".gr-hoja")')));
await accion('ext:garantia_elegir', 1200);
/* Elegir: queda anotada y aparece "Te llevamos a …" con un enlace de verdad (sin pestañas forzadas) */
const antes = (await pestanas()).length;
await ev('[...document.querySelectorAll("[data-elegir]")].find(b => /Fianza Prueba/.test(b.getAttribute("aria-label"))).click(); true'); await sleep(1200);
const ir = await ev('({ t: document.getElementById("grT").textContent, p: document.getElementById("grP").textContent, href: (document.querySelector(".gr-hoja [data-ir]")||{}).href || null, target: (document.querySelector(".gr-hoja [data-ir]")||{}).target || null, otra: !!document.querySelector(".gr-hoja [data-otra]"), boton: (document.querySelector(".gr-hoja [data-ir]")||{}).textContent })');
ok('Elegir: "Te llevamos a" antes de salir', ir.t === 'Te llevamos a Fianza Prueba' && /volvés acá/.test(ir.p) && ir.boton === 'Continuar', J(ir));
ok('Elegir: el enlace lleva el referido', /^https:\/\/fianza\.bairen\.test\/solicitar\?ref=bairen&op=[a-z0-9]{1,10}$/.test(ir.href || '') && ir.target === '_blank', ir.href);
ok('Elegir: no abre pestañas solo', (await pestanas()).length === antes);
ok('Elegir: queda anotada', (await ev('JSON.parse(localStorage.getItem("bp_dg_gar_sol")).filter(s => s.estado === "elegida").length')) === 1);
await foto('5-hoja-te-llevamos');
await ev('history.back(); true'); await sleep(500);
ok('Atrás del celular: vuelve a la lista', (await ev('document.getElementById("grT") && document.getElementById("grT").textContent')) === 'Elegí tu garantía' && (await ev('document.querySelectorAll(".gr-cuerpo > .gr-ops > .gr-op").length')) === 3);
await ev('[...document.querySelectorAll("[data-elegir]")].find(b => /Fianza Prueba/.test(b.getAttribute("aria-label"))).click(); true'); await sleep(1200);
ok('La misma elección no suma pasos', (await ev('JSON.parse(localStorage.getItem("bp_dg_hitos")).filter(h => h.tipo === "garantia_elegida").length')) === 1);
await evGesto('document.querySelector(".gr-hoja [data-ir]").click(); true'); await sleep(1500);
const tabs1 = await pestanas(); const nt = tabs1.find(x => /fianza\.bairen\.test/.test(x.url));
ok('Continuar: abre la web del proveedor y cierra la hoja', !!nt && !(await ev('!!document.querySelector(".gr-hoja")')), J(tabs1.map(x => x.url)));
for (const x of tabs1) if (/bairen\.test/.test(x.url) || x.url === 'about:blank') await cerrarPestana(x.id);
await sleep(800);
const s1 = await seccion();
ok('Sección: Fianza Prueba, elegida, un botón', /Fianza Prueba/.test(s1 || '') && /Elegida/.test(s1 || '') && /Seguir trámite/.test(s1 || ''), s1);
ok('Estado en una línea arriba de los pasos', /Garantía con Fianza Prueba: falta la aprobación\./.test(await ev('(document.querySelector("#msAcc .ms-acc-estado")||{}).textContent||""')), await ev('(document.querySelector("#msAcc .ms-acc-estado")||{}).textContent||""'));
ok('Chat: el paso "Eligió la garantía"', /Eligió la garantía/.test(await ev('document.getElementById("msLog").innerText')));
const ch2 = await chips();
ok('Con una elegida: "Cambiar garantía" pasa a Más', ch2.indexOf('más:ext:garantia_elegir') > -1, J(ch2));
/* Volver a la web con gesto de usuario: se abre la pestaña y no suma pasos */
const hitosAntes = await ev('JSON.parse(localStorage.getItem("bp_dg_hitos")).filter(h => h.tipo === "garantia_elegida").length');
await ev('document.querySelector("[data-gar=\\"web\\"]").click(); true'); await sleep(1200);
ok('"Seguir trámite": "Te llevamos a" y Continuar', (await ev('document.getElementById("grT").textContent')) === 'Te llevamos a Fianza Prueba' && !(await ev('!!document.querySelector(".gr-hoja [data-otra]")')));
await evGesto('document.querySelector(".gr-hoja [data-ir]").click(); true'); await sleep(1500);
const tabs2 = await pestanas(); const t2 = tabs2.find(x => /fianza\.bairen\.test/.test(x.url));
ok('Continuar abre la web del proveedor', !!t2, J(tabs2.map(x => x.url)));
for (const x of tabs2) if (/bairen\.test/.test(x.url) || x.url === 'about:blank') await cerrarPestana(x.id);
ok('Volver a la web no suma pasos', (await ev('JSON.parse(localStorage.getItem("bp_dg_hitos")).filter(h => h.tipo === "garantia_elegida").length')) === hitosAntes);
/* Cambiar a la propia */
await accion('ext:garantia_elegir', 1200);
await ev('document.querySelector("[data-propia]").click(); true');
await esperar('document.querySelector(".ms-dlg-velo:not(.gr-velo) .ms-dlg form") && !document.querySelector(".gr-hoja")');
const dlgPropia = await ev('(() => { const d = document.querySelector(".ms-dlg-velo:not(.gr-velo) .ms-dlg"); return d ? { campos: d.querySelectorAll("form textarea, form input").length, t: d.querySelector(".ms-dlg-t").textContent } : null })()');
ok('Propia: el diálogo de Mensajes con un solo campo', dlgPropia && dlgPropia.campos === 1 && dlgPropia.t === 'Tu garantía propietaria', J(dlgPropia));
await foto('6-propia');
await dialogo({ detalle: 'Propietaria de mi madre, en CABA' }, 1600);
const s2 = await seccion();
ok('Sección: garantía propietaria con su detalle y la anterior plegada', /Garantía propietaria/.test(s2 || '') && /Propietaria de mi madre/.test(s2 || '') && /Ver anteriores \(1\)/.test(s2 || ''), s2);
ok('La fianza anterior quedó cancelada', (await ev('JSON.parse(localStorage.getItem("bp_dg_gar_sol")).map(s => s.tipo + ":" + s.estado).join(",")')) === 'fianza:cancelada,propia:elegida');
/* Vuelve a la fianza, ahora con gesto: la pestaña se abre directo */
await accion('ext:garantia_elegir', 1200);
await ev('[...document.querySelectorAll("[data-elegir]")].find(b => /Fianza Prueba/.test(b.getAttribute("aria-label"))).click(); true'); await sleep(1300);
await evGesto('document.querySelector(".gr-hoja [data-ir]").click(); true'); await sleep(1600);
const tabs3 = await pestanas(); const t3 = tabs3.find(x => /fianza\.bairen\.test/.test(x.url));
ok('Vuelve a la fianza: la web con el referido', !!t3 && /\/solicitar\?ref=bairen&op=[a-z0-9]{1,10}$/.test(t3.url), t3 && t3.url);
ok('Vuelve a la fianza: la hoja se cierra', !(await ev('!!document.querySelector(".gr-hoja")')));
for (const x of tabs3) if (/bairen\.test/.test(x.url) || x.url === 'about:blank') await cerrarPestana(x.id);
await sleep(900);
await ev('document.querySelector(".ms-info-btn") && !document.querySelector(".ms-op.ms-panel-on") && document.querySelector(".ms-info-btn").click(); true'); await sleep(600);
await foto('7-seccion-interesado');
ok('Quien busca no aprueba su garantía', /Solo quien publica/.test(await ev(`BPGarantias.actualizar(JSON.parse(localStorage.getItem("bp_dg_gar_sol")).pop().id, "aprobada", 1000, "USD").then(() => "entró", e => e.message)`)));

/* ── 3. Quien publica la aprueba ───────────────────────────── */
await como('pub', 'mensajes.html?op=' + op1);
await sleep(600);
const ch3 = await chips();
ok('Quien publica: "Garantía aprobada" y "Rechazada" (esta en Más)', ch3.some(x => /garantia_aprobada/.test(x)) && ch3.indexOf('más:ext:garantia_rechazada') > -1, J(ch3));
const s3 = await seccion();
ok('Quien publica ve la elegida con un solo botón', /Fianza Prueba/.test(s3 || '') && (await ev('document.querySelectorAll("[data-sec=\\"ext-garantia\\"] .ms-btn").length')) === 1, s3);
ok('Quien publica no elige garantía', !ch3.some(x => /garantia_elegir/.test(x)));
await accion('ext:garantia_aprobada', 700);
await foto('8-aprobar');
await dialogo({ costo: '' }, 700);
ok('Aprobar sin costo: el diálogo avisa', /Costo total/.test(await ev('(document.querySelector(".ms-dlg-err:not([hidden])")||{}).textContent||""')));
await dialogo({ costo: '1000', moneda: 'USD', referencia: 'F-123' }, 1700);
ok('Aprobada: aviso', /garantía aprobada/.test(await toast()), await toast());
const s4 = await seccion();
ok('Sección: aprobada, con el costo grande', /Aprobada/.test(s4 || '') && /USD 1\.000/.test(s4 || '') && /N\.º F-123/.test(s4 || ''), s4);
ok('Chat: "Garantía aprobada"', /Garantía aprobada/.test(await ev('document.getElementById("msLog").innerText')));
const cargos = await ev('JSON.parse(localStorage.getItem("bp_dg_cargos")||"[]").filter(c => c.operacion_id === ' + J(op1) + ').map(c => c.concepto + "|" + c.monto + "|" + c.moneda + "|" + c.paga + "|" + c.estado)');
ok('Cargo "Garantía de alquiler": 20 % al tercero, simulado', cargos.indexOf('Garantía de alquiler|200|USD|tercero|simulado') > -1, J(cargos));
ok('Nada al inquilino', !(await ev('JSON.parse(localStorage.getItem("bp_dg_cargos")||"[]").some(c => c.paga === "interesado")')));
ok('Sin acciones de garantía después de aprobar', !(await chips()).some(x => /garantia/.test(x)));
await foto('9-aprobada-publicador');
await como('ana', 'mensajes.html?op=' + op1);
ok('Quien busca: ya no elige otra', !(await chips()).some(x => /garantia/.test(x)) && /Aprobada/.test(await seccion() || ''));
ok('Otra elección después de aprobar: no', /Ya tenés una garantía aprobada/.test(await ev(`BPGarantias.elegir(${J(op1)}, JSON.parse(localStorage.getItem("bp_dg_gar_prov")).find(p => p.nombre === "Daños Prueba").id).then(() => "entró", e => e.message)`)));

/* ── 4. Largo plazo en pesos: total conocido, la plataforma la actualiza desde su pantalla ── */
const op2 = await ev(`BPDigital.abrir({ id:'aviso-2', publicador_id:'pub-gestora', operacion:'alquiler', precio:800000, moneda:'ARS', titulo:'Tres ambientes', barrio:'Belgrano' }, 'Hola')`);
await ev(`BPDigital.paso(${J(op2)}, 'solicitud_enviada')`);
await como('pub', 'mensajes.html');
await ev(`BPDigital.paso(${J(op2)}, 'reserva', { monto_contrato: 19200000, moneda: 'ARS' })`);
await como('ana', 'mensajes.html?op=' + op2);
await accion('ext:garantia_elegir', 1200);
const montos2 = await ev('[...document.querySelectorAll(".gr-cuerpo > .gr-ops .gr-op")].map(x => x.querySelector(".gr-op-n").textContent + "=" + (x.querySelector(".gr-op-mv")||{}).textContent)');
ok('Largo plazo: costo estimado grande sobre el total (6 % de $ 19.200.000)', montos2.indexOf('Fianza Prueba=$ 1.152.000') > -1, J(montos2));
await foto('10-hoja-largo-plazo');
await ev('[...document.querySelectorAll("[data-elegir]")].find(b => /Daños Prueba/.test(b.getAttribute("aria-label"))).click(); true'); await sleep(1300);
await ev('document.querySelector(".gr-hoja [data-x]").click(); true'); await sleep(500);
for (const x of await pestanas()) if (/bairen\.test/.test(x.url) || x.url === 'about:blank') await cerrarPestana(x.id);
await como('cura', 'garantias.html');
const fil = await ev('[...document.querySelectorAll(".ga-filtro")].map(b => b.textContent + (b.getAttribute("aria-pressed") === "true" ? "*" : ""))');
ok('Plataforma: filtros con cantidades, "En curso" primero', J(fil) === J(['En curso (1)*', 'Aprobadas (1)', 'Todas (4)']), J(fil));
ok('Plataforma: número de convenio', /USD 200/.test(await ev('document.querySelector(".ga-nums").innerText')), await ev('document.querySelector(".ga-nums").innerText.replace(/\\n/g," ")'));
await foto('11-plataforma-solicitudes');
ok('Plataforma solicitudes sin scroll horizontal', await sinScroll());
await ev('document.querySelector("[data-actualizar]").click(); true'); await sleep(400);
await ev(`(()=>{ const f=document.querySelector(".ga-dlg form"); f.querySelector('input[value="en_tramite"]').click(); f.requestSubmit(); return true })()`); await sleep(1300);
ok('Plataforma: en trámite', /en trámite/.test(await toast()) && /En trámite/.test(await ev('document.querySelector(".ga-sol").innerText')), await toast());
await ev('document.querySelector("[data-actualizar]").click(); true'); await sleep(400);
await ev(`(()=>{ const f=document.querySelector(".ga-dlg form"); f.querySelector('input[value="aprobada"]').click(); f.dispatchEvent(new Event("change")); f.requestSubmit(); return true })()`); await sleep(500);
ok('Plataforma: aprobar sin costo, avisa', /Falta el costo/.test(await ev('(document.querySelector(".ga-dlg .ga-err:not([hidden])")||{}).textContent||""')));
await foto('12-plataforma-actualizar');
await ev(`(()=>{ const f=document.querySelector(".ga-dlg form"); f.elements.costo.value="400.000"; f.elements.moneda.value="ARS"; f.elements.referencia.value="POL-77"; f.requestSubmit(); return true })()`); await sleep(1400);
const cargos2 = await ev('JSON.parse(localStorage.getItem("bp_dg_cargos")||"[]").filter(c => c.operacion_id === ' + J(op2) + ').map(c => c.concepto + "|" + c.monto + "|" + c.moneda + "|" + c.paga)');
ok('Seguro aprobado por la plataforma: 20 % al tercero', cargos2.indexOf('Seguro (caución u hogar)|80000|ARS|tercero') > -1, J(cargos2));
ok('El paso quedó como de la plataforma', await ev(`JSON.parse(localStorage.getItem("bp_dg_hitos")).some(h => h.operacion_id === ${J(op2)} && h.tipo === "seguro_emitido" && h.lado === "plataforma" && h.datos.monto === 400000)`));

/* ── 5. Lo que no se puede ─────────────────────────────────── */
await como('ana', 'mensajes.html');
const op3 = await ev(`BPDigital.abrir({ id:'aviso-3', publicador_id:'pub-gestora', operacion:'venta', precio:150000, moneda:'USD', titulo:'Casa', barrio:'Núñez' }, 'Hola')`);
await ev(`BPDigital.paso(${J(op3)}, 'solicitud_enviada')`);
ok('Venta: no hay garantía', /mediano o largo plazo/.test(await ev(`BPGarantias.propia(${J(op3)}, null).then(() => "entró", e => e.message)`)));
await c.ir('mensajes.html?op=' + op3, 1800);
ok('Venta: sin acción ni sección', !(await chips()).some(x => /garantia/.test(x)) && (await seccion()) === null);
const op4 = await ev(`BPDigital.abrir({ id:'aviso-4', publicador_id:'pub-gestora', operacion:'mediano', precio:900, moneda:'USD', titulo:'Monoambiente', barrio:'Recoleta' }, 'Hola')`);
await ev(`BPDigital.paso(${J(op4)}, 'solicitud_enviada')`);
await como('pub', 'mensajes.html'); await ev(`BPDigital.paso(${J(op4)}, 'solicitud_rechazada', { motivo: 'Ya está alquilado' })`); await como('ana', 'mensajes.html');
ok('Solicitud rechazada: no', /rechazada/.test(await ev(`BPGarantias.elegir(${J(op4)}, JSON.parse(localStorage.getItem("bp_dg_gar_prov")).find(p => p.activo).id).then(() => "entró", e => e.message)`)));
const ej = await ev('JSON.parse(localStorage.getItem("bp_dg_gar_prov")).find(p => p.ejemplo).id');
ok('Un ejemplo no se activa', /Es un ejemplo/.test(await ev(`BPGarantias.guardarProveedor(${J(ej)}, { url: "https://x.bairen.test", activo: true }).then(() => "entró", e => e.message)`)));
ok('Un parámetro raro no entra', /clave=valor/.test(await ev(`BPGarantias.guardarProveedor(null, { nombre: "Raro", tipo: "fianza", param_referido: "ref=<x>" }).then(() => "entró", e => e.message)`)));

ok('Sin errores de JavaScript', !c.errores.length, J(c.errores));
const consola = c.consola.filter(x => !/supabase|jsdelivr|ERR_BLOCKED|bairen\.test|Failed to load resource/.test(x));
ok('Consola limpia', !consola.length, J(consola));
const malos = casos.filter(x => !x.ok);
console.log(JSON.stringify({ vista: mob ? 'celular' : 'compu', casos: casos.length, fallan: malos.length, detalle: casos }, null, 1));
await c.cerrar(); process.exit(malos.length ? 1 : 0);
