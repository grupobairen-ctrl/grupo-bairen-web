/* G · Editar un aviso viejo (campos que el recorrido ya no pide se conservan), perfil desde el panel, Atrás y Salir, otro idioma */
import { conectar, sleep, SP, BASE } from './cdp.mjs';
import { limpiar, pantalla, seguir, set, chip, marcar, medir, fotos, avisos, pubs, toast, DESC, FOTOS, ingresarLocal, esperar, atras } from './flujo.mjs';
const c = await conectar(); const mob = process.argv[2] !== 'desktop'; await c.vista(mob); const P = (mob ? 'm' : 'd') + '-';
const out = {};
await limpiar(c);
await c.ir('publicar-aviso.html', 900); await c.ev('document.querySelector("[data-que=venta]").click(); true'); await seguir(c, 300);
await ingresarLocal(c, 'inmo.viejo@ejemplo.com'); await esperar(c, 'empresa');
await set(c, { nombre: 'Inmobiliaria Vieja', whatsapp: '1166667777', colegio: 'CUCICBA', matricula: '55' }); await seguir(c);
out.atrasPropiedad = await atras(c);            // propiedad → empresa (se mostró)
out.atrasEmpresa = await atras(c);              // empresa → que
await c.ev('document.getElementById("pfAtras").click(); true'); await c.esperarCarga(1200);
out.atrasQue = await c.ev('location.pathname + location.hash');
const pub = (await pubs(c))[0];
/* un aviso "viejo", publicado, con datos que el recorrido nuevo no pide */
const viejo = { id: 'lviejo1', codigo: 'BA-VIEJOV-AAA', slug: 'viejo', publicador_id: pub.id, operacion: 'venta', tipo: 'PH', titulo: 'PH reciclado con terraza propia', direccion: 'Gorriti 4000', unidad: 'PB', barrio: 'Palermo Soho', zona: 'Palermo', ciudad: 'Capital Federal', mostrar_direccion: 'exacta', precio: 320000, moneda: 'USD', expensas: 50000, m2_total: 120, m2_cubierto: 95, ambientes: 4, dormitorios: 3, banos: 2, cocheras: 2, antiguedad: 40, orientacion: 'Norte', piso: '0', amoblado: false, amenities: ['SUM', 'Parrilla', 'Terraza o jardín'], caracteristicas: ['Apto crédito', 'Luminoso'], cualidades: ['Terraza propia'], descripcion: DESC, video_url: 'https://youtu.be/xyz', video_tipo: 'youtube', propietario_email: 'dueno@ejemplo.com', quiero_produccion: false, estado: 'disponible', estado_curacion: 'publicado', fotos: [1,2,3,4,5,6,7,8].map(i => ({ url: BASE + 'img/edificio-lumiere.webp?n=' + i, orden: i - 1 })), created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' };
await c.ev(`(function(){ const l=JSON.parse(localStorage.getItem("bp_avisos")||"[]"); l.push(${JSON.stringify(viejo)}); localStorage.setItem("bp_avisos", JSON.stringify(l)); return true; })()`);
await c.ir('publicar-aviso.html?id=lviejo1', 1200);
out.entradaViejo = await pantalla(c) + ' / ' + await c.ev('document.getElementById("pfSeguir").textContent');
await c.ev('document.querySelector("[data-ir=descripcion]").click(); true'); await sleep(400);
out.chipsViejo = await c.ev('Array.from(document.querySelectorAll("[name=lqt]:checked")).map(x=>x.value).join(",")');
await marcar(c, 'lqt', ['Balcón']); await seguir(c); await seguir(c, 1200);
const v = (await avisos(c)).find(a => a.id === 'lviejo1');
out.viejoDespues = { estado: v.estado_curacion, titulo: v.titulo, tipo: v.tipo, dormitorios: v.dormitorios, cocheras: v.cocheras, m2_cubierto: v.m2_cubierto, antiguedad: v.antiguedad, orientacion: v.orientacion, video: v.video_url, cualidades: v.cualidades, amen: v.amenities, car: v.caracteristicas, mail: v.propietario_email, mostrar: v.mostrar_direccion, fotos: v.fotos.length, codigo: v.codigo, barrio: v.barrio };
/* perfil desde el panel */
await c.ir('publicar-aviso.html?paso=perfil', 1200);
out.perfil = await pantalla(c) + ' / ' + await c.ev('document.getElementById("pfSeguir").textContent') + ' / campos: ' + await c.ev('Array.from(document.querySelectorAll("#empCampos label, #empCampos .pf-rot")).map(x=>x.textContent).join(" | ")');
await c.foto(P + 'perfil-panel', true);
await set(c, { telefono: '1140001000', descripcion: 'Inmobiliaria de Palermo desde 1990.' });
await c.archivos('#docs', [SP + '/fotos-prueba/foto1.jpg']); await sleep(300);
out.docsLista = await c.ev('document.getElementById("docsLista").innerText.replace(/\\n+/g," ")');
await c.ev('document.getElementById("pfSeguir").click(); true'); await sleep(1500); await c.esperarCarga(800);
out.trasPerfil = await c.ev('location.pathname + location.hash');
out.pubDespues = (await pubs(c)).map(p => [p.nombre, p.telefono, p.whatsapp, p.matricula, p.descripcion, p.slug].join(' | '));
out.verif = await c.ev('JSON.parse(localStorage.getItem("bp_verificaciones")||"[]").map(v=>v.tipo+":"+(v.nota||"-")).join(", ")');
/* sin publicador: paso=perfil no se rompe */
/* idioma: inglés (las claves pub2_ todavía no tienen traducción: cae al castellano sin errores) */
await c.ev('localStorage.setItem("bairen_lang","en"); true');
await c.ir('publicar-aviso.html', 1200);
out.en = await pantalla(c) + ' / ' + await c.ev('document.getElementById("pfT").textContent');
await c.ev('localStorage.setItem("bairen_lang","es"); true');
/* Salir desde propiedad con dirección escrita: queda guardado como borrador */
await c.ir('publicar-aviso.html', 1000); await c.ev('document.querySelector("[data-que=venta]").click(); true'); await seguir(c);
out.salirAntes = await c.ev('document.getElementById("pfSalir").textContent');
await set(c, { zona: 'Belgrano' }); await set(c, { direccion: 'Juramento 2400' });
out.salirConDir = await c.ev('document.getElementById("pfSalir").textContent');
await c.ev('document.getElementById("pfSalir").click(); true'); await c.esperarCarga(1200);
out.salirA = await c.ev('location.pathname + location.hash');
out.borradorSalir = (await avisos(c)).filter(a => a.direccion === 'Juramento 2400').map(a => a.estado_curacion + ' ' + a.zona + ' ' + a.barrio).join();
out.errores = c.errores; out.consola = c.consola;
console.log(JSON.stringify(out, null, 1)); await c.cerrar(); process.exit(0);
