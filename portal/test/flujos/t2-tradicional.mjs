/* B · Martillero: alquiler tradicional en pesos con garantías, y "Publicar otra parecida".
   C · Inmobiliaria: venta en USD; editarla en revisión (sigue en revisión), aprobarla y editarla publicada (sigue publicada). */
import { conectar, sleep } from './cdp.mjs';
import { limpiar, pantalla, seguir, set, chip, marcar, pasos, medir, fotos, avisos, pubs, toast, DESC, FOTOS, ingresarLocal, esperar, atras } from './flujo.mjs';
const c = await conectar(); const mob = process.argv[2] !== 'desktop'; await c.vista(mob); const P = (mob ? 'm' : 'd') + '-';
const out = { medidas: [] }; const m = async (n) => { const x = await medir(c); out.medidas.push(x); if (n) await c.foto(P + n); return x; };
const enviar = async () => { await c.ev('document.getElementById("acepto") && !document.getElementById("acepto").checked && document.getElementById("acepto").click(); true'); return seguir(c, 1500); };
await limpiar(c);
/* B */
await c.ir('publicar-aviso.html', 1200);
out.B_sugerida = await c.ev('Array.from(document.querySelectorAll(".pf-opcion.on")).map(x=>x.dataset.que).join(",")');
await c.ev('document.querySelector("[data-que=tradicional]").click(); true'); await seguir(c, 300);
await ingresarLocal(c, 'martillero.p2@ejemplo.com'); await esperar(c, 'empresa');
out.B_tipo = await c.ev('(document.querySelector("[name=tipo_pub]:checked")||{}).value');
await set(c, { nombre: 'Martillero Tradicional', whatsapp: '011 15 2345 6789' });
await seguir(c, 500); out.B_sinMatricula = await toast(c) + ' / ' + await pantalla(c);
await set(c, { colegio: 'CUCICBA', matricula: '1234' }); await seguir(c);
out.B_pub = (await pubs(c)).map(p => [p.tipo, p.nombre, p.whatsapp, p.matricula, p.colegio, p.badge].join(' | '));
await set(c, { zona: 'Palermo' }); await set(c, { barrio: 'Palermo Soho', direccion: 'Honduras 5000', unidad: '3 A', m2_total: '50' }); await pasos(c, 'ambientes', 2); await pasos(c, 'banos', 1);
await seguir(c);
out.B_opInicial = await c.ev('(document.querySelector("[name=operacion]:checked")||{}).value');
await chip(c, 'operacion', 'alquiler'); await sleep(200);
await chip(c, 'moneda', 'ARS'); await sleep(100);
await set(c, { precio: '850000', expensas: '95000' });
await chip(c, 'plazo', '24 meses');
await marcar(c, 'gar', ['Acepta seguro de caución', 'Acepta garantía propietaria']);
await c.ev('document.activeElement && document.activeElement.blur(); true'); await sleep(400);
await m('tradicional-5-precio-ars');
await seguir(c);
out.B_guardado = (await avisos(c)).map(a => [a.operacion, a.moneda, a.precio, a.expensas, a.plazo, (a.caracteristicas||[]).join('+')].join(' | '));
await fotos(c, FOTOS.slice(0, 8)); await seguir(c);
await set(c, { descripcion: DESC }); await marcar(c, 'lqt', ['Balcón', 'Cochera', 'Ascensor']); await seguir(c, 1500);
out.B_resumen = await c.ev('document.querySelector(".pf-resumen").innerText.replace(/\\n+/g," / ")');
await m('tradicional-8-revisar');
await enviar();
out.B_final = (await avisos(c)).map(a => [a.direccion, a.unidad, a.operacion, a.moneda, a.precio, a.plazo, (a.caracteristicas||[]).join('+'), a.amenities.join('+'), a.cocheras, a.estado_curacion].join(' | '));
/* Publicar otra parecida */
await c.ev('document.getElementById("pfOtra").click(); true'); await c.esperarCarga(1200);
out.B_copia = await pantalla(c) + ' / ' + await c.ev('document.querySelector(".pf-cab").innerText.replace(/\\n+/g," / ")') + ' / zona=' + await c.ev('document.getElementById("f-zona").value') + ' barrio=' + await c.ev('document.getElementById("f-barrio").value') + ' dir=' + await c.ev('JSON.stringify(document.getElementById("f-direccion").value)');
await m('parecida-4-propiedad');
await set(c, { direccion: 'Honduras 5000', unidad: '5 C' }); await seguir(c);
out.B_copiaPrecio = await c.ev('({op:(document.querySelector("[name=operacion]:checked")||{}).value, mon:(document.querySelector("[name=moneda]:checked")||{}).value, precio: document.getElementById("f-precio").value, plazo:(document.querySelector("[name=plazo]:checked")||{}).value, gar: Array.from(document.querySelectorAll("[name=gar]:checked")).map(x=>x.value)})');
await seguir(c); out.B_copiaFotos = await c.ev('document.querySelectorAll(".pf-foto").length');
await fotos(c, FOTOS.slice(1, 9)); await seguir(c); await seguir(c, 1500); await enviar();
out.B_dos = (await avisos(c)).map(a => [a.direccion, a.unidad, a.moneda, a.precio, a.plazo, (a.caracteristicas||[]).join('+'), a.fotos.length, a.estado_curacion].join(' | '));
/* C · inmobiliaria: venta */
await c.ir('publicar-aviso.html?perfil=inmobiliaria', 1000);
await c.ev('localStorage.removeItem("bp_user"); true'); await c.ir('publicar-aviso.html?perfil=inmobiliaria', 1000);
out.C_sugerida = await c.ev('Array.from(document.querySelectorAll(".pf-opcion.on")).map(x=>x.dataset.que).join(",")');
await seguir(c, 300); await ingresarLocal(c, 'inmo.p2@ejemplo.com'); await esperar(c, 'empresa');
await set(c, { nombre: 'Inmobiliaria Venta', whatsapp: '1144445555', colegio: 'CUCICBA', matricula: '777' }); await seguir(c);
await set(c, { zona: 'Recoleta' }); await set(c, { barrio: 'Barrio Norte', direccion: 'Juncal 1200', unidad: '8 B', m2_total: '90' }); await pasos(c, 'ambientes', 3); await pasos(c, 'banos', 2);
await seguir(c);
await chip(c, 'operacion', 'venta');
out.C_monedaVenta = await c.ev('!document.querySelector("[name=moneda]") && document.getElementById("prePrecio").textContent');
await set(c, { precio: '250.000', expensas: '180000' }); await m('venta-5-precio');
await seguir(c); await fotos(c, FOTOS.slice(0, 8)); await seguir(c); await set(c, { descripcion: DESC }); await seguir(c, 1500); await enviar();
const venta = (await avisos(c)).find(a => a.direccion === 'Juncal 1200');
out.C_venta = [venta.operacion, venta.moneda, venta.precio, venta.expensas, venta.plazo, venta.estado_curacion].join(' | ');
/* editar en revisión */
await c.ir('publicar-aviso.html?id=' + venta.id, 1200);
out.D_entrada = await pantalla(c) + ' / ' + await c.ev('document.getElementById("pfSeguir").textContent') + ' / acepto=' + await c.ev('!!document.getElementById("acepto")');
await m('editar-8-revisar');
await c.ev('document.querySelector("[data-ir=precio]").click(); true'); await sleep(500);
out.D_boton = await c.ev('document.getElementById("pfSeguir").textContent');
await set(c, { precio: '245000' }); await seguir(c);
out.D_volvio = await pantalla(c);
out.D_estado1 = (await avisos(c)).filter(a => a.id === venta.id).map(a => a.estado_curacion + ' ' + a.precio).join();
await seguir(c, 1200);
out.D_rec = await c.ev('document.getElementById("pfPantalla").innerText.replace(/\\n+/g," / ")');
await m('editar-9-cambios');
out.D_estado2 = (await avisos(c)).filter(a => a.id === venta.id).map(a => a.estado_curacion + ' ' + a.precio).join();
/* atrás desde una pantalla abierta con Cambiar vuelve a Revisar */
await c.ir('publicar-aviso.html?id=' + venta.id, 1200);
await c.ev('document.querySelector("[data-ir=fotos]").click(); true'); await sleep(400);
out.D_atras = await atras(c);
/* curación aprueba y se edita publicado */
await c.ir('curacion.html', 1500);
out.E_cola = await c.ev('Array.from(document.querySelectorAll(".p-cur")).map(x=>x.querySelector("b").textContent + " :: " + Array.from(x.querySelectorAll(".m")).map(m=>m.textContent).join(" || ")).join(" ## ")');
await c.foto(P + 'curacion', true);
await c.ev(`document.querySelector('.p-cur[data-id="${venta.id}"] [data-ok]').click(); true`); await sleep(1200);
await c.ir('publicar-aviso.html?id=' + venta.id, 1200);
await c.ev('document.querySelector("[data-ir=propiedad]").click(); true'); await sleep(400);
await pasos(c, 'banos', 3); await seguir(c); await seguir(c, 1200);
out.E_publicado = (await avisos(c)).filter(a => a.id === venta.id).map(a => a.estado_curacion + ' banos=' + a.banos).join() + ' / ' + await c.ev('document.getElementById("pfPantalla").innerText.replace(/\\n+/g," / ")');
/* panel */
await c.ir('panel.html#avisos', 1500);
out.F_panel = await c.ev('Array.from(document.querySelectorAll(".p-aviso-row")).map(r=>r.querySelector("b").textContent + " — " + r.querySelector(".m").textContent).join(" || ")');
out.errores = c.errores; out.consola = c.consola;
console.log(JSON.stringify(out, null, 1)); await c.cerrar(); process.exit(0);
