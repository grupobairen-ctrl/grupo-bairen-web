/* Rieles · Tarifas (migración 35): el estimado de los servicios de BAIREN al publicar, la página de precios y el selector
   de Cobros, en modo local (sin base). Uso, desde la raíz del repo, con el servidor y Chrome propios:
     PORT=8207 node portal/test/dev-server.mjs &
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9407 --user-data-dir=/tmp/bp-chrome-estimado about:blank &
     BP_PUERTO=8207 BP_CHROME=9407 BP_CAPTURAS=/tmp/bp-tarifas node portal/test/rieles/tarifas.mjs
   Recorridos: gestora (mediano y estadía corta, celular), dueña (venta, compu), desarrolladora (pozo y terminado,
   celular), inmobiliaria (alquiler en pesos, celular) y lo mismo con BAIREN digital apagado. Sale con 1 si algo falla. */
import { conectar, sleep } from '../flujos/cdp.mjs';
import { limpiar, pantalla, seguir, set, chip, marcar, pasos, medir, fotos, avisos, toast, DESC, FOTOS, ingresarLocal, esperar } from '../flujos/flujo.mjs';

const c = await conectar();
const out = { casos: [], medidas: [] };
const caso = (n, ok, det) => { out.casos.push({ n, ok: !!ok, det: det === undefined ? null : det }); };
/* Apagado = portal cerrado (cookie bp_cerrado del servidor de prueba) y sin el interruptor personal */
const digital = on => c.ev(on ? "document.cookie = 'bp_cerrado=; path=/; max-age=0'; localStorage.setItem('bp_digital','1'); true" : "document.cookie = 'bp_cerrado=1; path=/; max-age=120'; localStorage.removeItem('bp_digital'); true");
/* La barra: visible, sus dos renglones, su alto y si Continuar queda libre y a la vista */
const barra = () => c.ev(`(function(){
  const b = document.querySelector('.tf-barra'); const s = document.getElementById('pfSeguir');
  const vis = !!(b && !b.hidden && b.getClientRects().length);
  let libre = null; if (s) { const r = s.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); libre = !!e && s.contains(e) && r.bottom <= innerHeight && r.top >= 0; }
  const res = vis ? b.getBoundingClientRect().height : 0;
  return { vis, existe: !!b, l1: vis ? b.querySelector('.tf-l1').textContent.trim() : '', l2: vis ? b.querySelector('.tf-l2').textContent.replace(/\\s+/g, ' ').trim() : '', altoRes: Math.round(res), libre,
    scrollX: document.documentElement.scrollWidth > innerWidth + 1 };
})()`);
/* Al final de la pantalla, lo último del contenido queda arriba de la barra fija */
const noTapa = () => c.ev(`(function(){ document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.documentElement.scrollHeight); const p = document.getElementById('pfPie').getBoundingClientRect().top; const u = document.getElementById('pfPantalla').getBoundingClientRect().bottom; const r = u <= p + 1; window.scrollTo(0, 0); document.documentElement.style.scrollBehavior = ''; return r; })()`);
const esperarBarra = async (f, ms = 3000) => { let b; for (let i = 0; i < ms / 100; i++) { b = await barra(); if (f(b)) return b; await sleep(100); } return b; };
const hoja = () => c.ev(`(function(){ const h = document.querySelector('.tf-hoja'); if (!h) return null; return JSON.parse(JSON.stringify({ titulo: h.querySelector('.pf-hoja-t').textContent, items: Array.from(h.querySelectorAll('.tf-items li')).map(li => li.querySelector('.tf-n').textContent + ' = ' + li.querySelector('.tf-m').textContent + ' (' + li.querySelector('small').textContent + ')'), total: (h.querySelector('.tf-total') || {}).textContent || null, sup: Array.from(h.querySelectorAll('.tf-sup')).map(x => x.textContent.trim()).join(' / '), foco: document.activeElement && document.activeElement.textContent.trim() }).replace(/\u00a0/g, ' ')); })()`);
const m = async (n, mob) => { const x = await medir(c); x.nombre = n; out.medidas.push(x); await c.foto((mob ? 'm-' : 'd-') + n); return x; };
const unidad = (i, v) => c.ev(`(function(){ const f=document.querySelector('.pf-u[data-i="${i}"]'); if(!f) return 'no hay ${i}'; const v=${JSON.stringify(v)}; for (const k in v) { const e=f.querySelector('[name='+k+']'); e.value=v[k]; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); } return true; })()`);
/* Desde la pantalla 1 hasta Propiedad: ingreso, Tu empresa (y Tus documentos si es dueña, "Los subo después") */
async function hastaPropiedad(perfil, que, mail, empresa){
  await c.ir('publicar-aviso.html?perfil=' + perfil, 1200);
  await c.ev(`document.querySelector("[data-que=${que}]").click(); true`); await seguir(c, 300);
  await ingresarLocal(c, mail); await esperar(c, 'empresa');
  await set(c, empresa); await seguir(c);
  if (await pantalla(c) === 'documentos') { await c.ev('document.getElementById("pfSeg2").click(); true'); await sleep(900); }
  return pantalla(c);
}

/* ── 1. La API en la página de precios (modo local) ── */
await c.vista(true);
await limpiar(c); await digital(true);
await c.ir('precios.html', 1500);
const api = await c.ev(`(async function(){
  const D = BPDigital, r = {};
  const e = async o => { const x = await D.estimarServicios(o); return { total: x.totalTxt, items: x.items.map(i => i.concepto + ':' + i.tipo + ':' + (i.monto == null ? '-' : i.monto) + i.moneda), sup: x.supuesto, simulado: x.simulado }; };
  r.tarifas = (await D.tarifas()).map(t => t.concepto + '/' + t.linea + '/' + t.paga);
  r.mediano = await e({ linea: 'mediano', precio: 1000, moneda: 'USD' });
  r.mediano8 = await e({ linea: 'mediano', precio: 1000, moneda: 'USD', meses: 8 });
  r.tradicional = await e({ linea: 'tradicional', precio: 700, moneda: 'USD' });
  r.tradicionalCorredor = await e({ linea: 'tradicional', precio: 700, moneda: 'USD', perfil: 'profesional' });
  r.tradicionalArs = await e({ linea: 'tradicional', precio: 800000, moneda: 'ARS', meses: 24 });
  r.temporario = await e({ linea: 'temporario', precio: 1200, moneda: 'USD' });
  r.temporario3 = await e({ linea: 'temporario', precio: 1000, moneda: 'USD', meses: 3 });
  r.venta = await e({ linea: 'venta', precio: 180000, moneda: 'USD', perfil: 'dueno' });
  r.ventaCorredor = await e({ linea: 'venta', precio: 180000, moneda: 'USD', perfil: 'profesional' });
  r.pozo = await e({ linea: 'pozo', perfil: 'desarrolladora' });
  r.sinPrecio = await e({ linea: 'mediano' });
  try { await D.estimarServicios({ linea: 'alquiler', precio: 1 }); r.lineaMala = 'entró'; } catch (x) { r.lineaMala = x.message; }
  try { await D.fijarEscenarioPublico('Sin matrícula · sección 12'); r.sinSesion = 'entró'; } catch (x) { r.sinSesion = x.message; }
  return r;
})()`);
caso('API: 12 tarifas, sin terceros ni quien busca', api.tarifas.length === 12 && !api.tarifas.some(x => /tercero|interesado|Garantía|Seguro/.test(x)), api.tarifas.join(' | '));
caso('API: mediano USD 1.000 · 6 meses = USD 240 (reserva 80, contrato 40, cobranza 120) y Búsquedas aparte', api.mediano.total === 'USD 240' && api.mediano.items.join(',') === 'Reserva online:suma:80USD,Contrato digital con firma:suma:40USD,Cobranza digital:suma:120USD,Propuesta aceptada en Búsquedas:opcional:20USD', api.mediano);
caso('API: mediano a 8 meses = USD 280', api.mediano8.total === 'USD 280', api.mediano8.total);
caso('API: largo plazo USD 700 · 24 meses = USD 376; un corredor suma USD 50', api.tradicional.total === 'USD 376' && api.tradicionalCorredor.total === 'USD 426', [api.tradicional.total, api.tradicionalCorredor.total]);
caso('API: largo plazo en pesos: USD 40 + $ 384.000', api.tradicionalArs.total === 'USD 40 + $ 384.000', api.tradicionalArs.total);
caso('API: estadía corta USD 1.200 · 1 mes = USD 160 (10 % de la estadía + contrato)', api.temporario.total === 'USD 160' && api.temporario3.total === 'USD 340', [api.temporario.total, api.temporario3.total, api.temporario.items]);
caso('API: venta de dueña = firma de reserva USD 40; corredor USD 190', api.venta.total === 'USD 40' && api.venta.items[0] === 'Firma de reserva:suma:40USD' && api.ventaCorredor.total === 'USD 190', [api.venta.items, api.ventaCorredor.total]);
caso('API: pozo, USD 30 por inversor verificado, sin total', api.pozo.total === '' && api.pozo.items[0] === 'Inversor verificado:unitario:30USD', api.pozo);
caso('API: sin precio, la cobranza queda sin monto', api.sinPrecio.items.some(i => i === 'Cobranza digital:suma:-USD'), api.sinPrecio.items);
caso('API: línea desconocida, error', api.lineaMala === 'Línea desconocida.', api.lineaMala);
caso('API: sin sesión no se cambia el escenario', /Ingresá/.test(api.sinSesion), api.sinSesion);
caso('API: todo en simulación', api.mediano.simulado && api.venta.simulado, null);

/* ── 2. Precios (celular y compu) ── */
for (const mob of [true, false]) {
  await c.vista(mob); await c.ir('precios.html', 1500);
  const p = await c.ev(`({ tarjetas: Array.from(document.querySelectorAll('.tp-t')).map(t => t.querySelector('h2').textContent + ' = ' + t.querySelector('.tp-total').textContent.replace(/\\s+/g,' ').trim()), confia: Array.from(document.querySelectorAll('.tp-confia li')).map(x => x.textContent.trim()), lanz: (document.querySelector('.tp-lanz')||{}).textContent || '', todas: (document.querySelector('.tp-todas')||{}).textContent || '', botones: document.querySelectorAll('#contenido .p-btn').length, scrollX: document.documentElement.scrollWidth > innerWidth + 1, comision: /comisi/i.test(document.getElementById('contenido').innerText), viejas: /tradicional|temporario/i.test(document.getElementById('contenido').innerText) })`);
  caso('Precios ' + (mob ? 'celular' : 'compu') + ': 5 tarjetas con su total', p.tarjetas.join(' | ') === 'Mediano plazo = USD 240 | Alquiler a largo plazo = USD 376 | Estadía corta (hasta 3 meses) = USD 160 | Venta = USD 40 | Desarrollo en pozo = USD 30 por inversor verificado', p.tarjetas);
  caso('Precios ' + (mob ? 'celular' : 'compu') + ': lo que nunca se cobra (con "nunca un porcentaje"), lanzamiento, un solo botón, sin "comisión" ni palabras viejas, sin scroll horizontal',
    p.confia.length === 3 && p.confia[0] === 'Nunca un porcentaje de la venta ni del alquiler.' && p.confia.some(x => x === 'Al inquilino que alquila para vivir no le cobramos nada.') && p.confia.some(x => x === 'La plata de tus operaciones va directo a tu cuenta.') && /hoy no se cobran/.test(p.lanz) && p.botones === 1 && !p.comision && !p.viejas && !p.scrollX, p);
  await c.foto((mob ? 'm' : 'd') + '-precios', true);
}
await c.vista(true);

/* ── 3. Gestora: mediano (y estadía corta), en el celular ── */
await limpiar(c); await digital(true);
let p = await hastaPropiedad('gestor', 'mediano', 'gestora.tf@ejemplo.com', { nombre: 'Gestora Tarifas', whatsapp: '11 2345 6789', cuit: '30-71234567-8' });
caso('Gestora: llega a Propiedad', p === 'propiedad', p);
caso('Gestora: en Propiedad, sin precio, no hay barra', !(await barra()).vis, null);
await set(c, { zona: 'Palermo' }); await set(c, { barrio: 'Palermo', direccion: 'Gorriti 4800', unidad: '2 B', m2_total: '48' }); await pasos(c, 'ambientes', 2); await pasos(c, 'banos', 1);
await seguir(c);
caso('Gestora: en Precio, sin precio, no hay barra', await pantalla(c) === 'precio' && !(await barra()).vis, await pantalla(c));
await set(c, { precio: '1000' });
let b = await esperarBarra(x => x.vis);
caso('Gestora: al escribir USD 1.000, "Publicar: sin costo" y "Si cerrás por BAIREN ≈ USD 240"', b.vis && b.l1 === 'Publicar: sin costo' && b.l2 === 'Si cerrás por BAIREN ≈ USD 240', b);
caso('Gestora: dos renglones y Continuar libre', b.altoRes <= 52 && b.libre && !b.scrollX, b);
await m('tf-mediano-precio', true);
await chip(c, 'plazo', '3 meses'); b = await esperarBarra(x => /340/.test(x.l2));
caso('Gestora: estadía mínima de 3 meses es estadía corta: ≈ USD 340 (10 % de 3 meses + contrato)', b.l2 === 'Si cerrás por BAIREN ≈ USD 340', b.l2);
await chip(c, 'plazo', '8 meses'); b = await esperarBarra(x => /280/.test(x.l2));
caso('Gestora: estadía mínima de 8 meses: ≈ USD 280', b.l2 === 'Si cerrás por BAIREN ≈ USD 280', b.l2);
await set(c, { precio: '1.500' }); b = await esperarBarra(x => /360/.test(x.l2));
caso('Gestora: el monto sigue al precio (USD 1.500 · 8 meses ≈ USD 360)', b.l2 === 'Si cerrás por BAIREN ≈ USD 360', b.l2);
await chip(c, 'plazo', '6 meses'); await set(c, { precio: '1000' }); b = await esperarBarra(x => /240/.test(x.l2));
await c.ev('document.activeElement && document.activeElement.blur(); true');
await c.ev('document.querySelector(".tf-ver").click(); true'); await sleep(500);
let h = await hoja();
caso('Gestora: Ver detalle abre la hoja con cada servicio y su precio', !!h && h.items.length === 3 && /Reserva online = USD 80/.test(h.items[0]) && /Contrato digital con firma = USD 40/.test(h.items[1]) && /Cobranza digital = USD 120 \(Al cobrar cada pago · 2\s% de cada pago · 6 pagos de USD 1\.000/.test(h.items[2]) && /USD 240/.test(h.total), h);
caso('Gestora: supuestos y lanzamiento en letra chica; Búsquedas aparte; el contrato lo paga el propietario', !!h && /6 meses de alquiler a USD 1.000 por mes/.test(h.sup) && /Si usás Búsquedas: USD 20/.test(h.sup) && /Hoy no se cobran/.test(h.sup) && /lo paga el propietario/.test(h.items[1]), h && h.sup);
caso('Gestora: la hoja enfoca Cerrar', !!h && h.foco === 'Cerrar', h && h.foco);
await m('tf-mediano-detalle', true);
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300);
caso('Gestora: Escape cierra la hoja y vuelve a Ver detalle', !(await hoja()) && await c.ev('document.activeElement && document.activeElement.classList.contains("tf-ver")'), null);
await sleep(300);
caso('Gestora: cerrar la hoja no deja un paso de más en el historial', await c.ev('!(history.state && history.state.tfHoja)'), await c.ev('JSON.stringify(history.state)'));
/* El Atrás del celular cierra la hoja y deja a la persona en el mismo paso */
await c.ev('document.querySelector(".tf-ver").click(); true'); await sleep(400);
const linksNuevos = await c.ev('document.querySelectorAll(".tf-hoja a[target=_blank]").length');
const urlAntes = await c.ev('location.href');
await c.ev('history.back(); true'); await sleep(700);
caso('Gestora: el Atrás del celular cierra la hoja sin salir del paso', !(await hoja()) && await pantalla(c) === 'precio' && await c.ev('location.href') === urlAntes, { url: await c.ev('location.href'), p: await pantalla(c) });
caso('Gestora: la hoja no abre pestañas nuevas', linksNuevos === 0, linksNuevos);
await seguir(c);
b = await barra();
caso('Gestora: en Fotos sigue la barra y Continuar libre', await pantalla(c) === 'fotos' && b.vis && b.l2 === 'Si cerrás por BAIREN ≈ USD 240' && b.libre, b);
await fotos(c, FOTOS.slice(0, 8));
caso('Gestora: en Fotos, la barra no tapa la casilla de abajo', await noTapa(), null);
await m('tf-mediano-fotos', true);
await seguir(c);
await set(c, { descripcion: DESC }); await marcar(c, 'lqt', ['Balcón']);
caso('Gestora: en Descripción, la barra no tapa nada', await noTapa() && (await barra()).libre, null);
await seguir(c, 1500);
b = await barra();
caso('Gestora: en Revisar y enviar, la barra', await pantalla(c) === 'revisar' && b.vis && b.l2 === 'Si cerrás por BAIREN ≈ USD 240' && b.libre, b);
caso('Gestora: en Revisar, la barra no tapa los términos', await noTapa(), null);
await m('tf-mediano-revisar', true);
await c.ev('document.getElementById("acepto").click(); true'); await seguir(c, 1800);
b = await barra();
caso('Gestora: Recibido, sin barra', await pantalla(c) === 'recibido' && !b.vis, { p: await pantalla(c), b });
const idMediano = (await avisos(c))[0].id;
/* Apagado: el mismo aviso, sin BAIREN digital, no tiene barra; prendido, sí */
await digital(false);
await c.ir('publicar-aviso.html?id=' + encodeURIComponent(idMediano), 1500);
b = await barra();
caso('Apagado: editar el aviso no muestra la barra (ni la crea)', await pantalla(c) === 'revisar' && !b.existe, { p: await pantalla(c), b });
await digital(true);
await c.ir('publicar-aviso.html?id=' + encodeURIComponent(idMediano), 1500);
b = await esperarBarra(x => x.vis);
caso('Prendido: editar el aviso abre Revisar con la barra', await pantalla(c) === 'revisar' && b.l2 === 'Si cerrás por BAIREN ≈ USD 240', b);

/* ── 4. Dueña: venta, en la compu ── */
await c.vista(false);
await limpiar(c); await digital(true);
p = await hastaPropiedad('dueno', 'venta', 'duena.tf@ejemplo.com', { nombre: 'Ana Dueña', whatsapp: '11 5555 1234' });
caso('Dueña: llega a Propiedad (documentos después)', p === 'propiedad', p);
await set(c, { zona: 'Belgrano' }); await set(c, { barrio: 'Belgrano', direccion: 'Cuba 2200', unidad: '7 A', m2_total: '70' }); await pasos(c, 'ambientes', 3); await pasos(c, 'banos', 1);
await seguir(c);
await set(c, { precio: '180.000' });
b = await esperarBarra(x => x.vis);
caso('Dueña: venta USD 180.000 ≈ USD 40', b.l2 === 'Si cerrás por BAIREN ≈ USD 40' && b.libre && !b.scrollX, b);
await c.ev('document.activeElement && document.activeElement.blur(); true');
await c.ev('document.querySelector(".tf-ver").click(); true'); await sleep(500);
h = await hoja();
caso('Dueña: el detalle es la firma de reserva (sin corredor) y lo paga ella', !!h && h.items.length === 1 && /^Firma de reserva = USD 40 \(Al firmar la reserva · precio fijo\)$/.test(h.items[0]) && /USD 180.000/.test(h.sup), h);
await m('tf-venta-detalle', false);
await c.ev('document.querySelector(".tf-hoja [data-cerrar].suave").click(); true'); await sleep(300);
caso('Dueña: Cerrar cierra la hoja', !(await hoja()), null);
await chip(c, 'operacion', 'alquiler'); b = await esperarBarra(x => x.vis && !/≈ USD 40$/.test(x.l2));
caso('Dueña: al pasar a alquiler, el monto cambia', b.vis && b.l2 !== 'Si cerrás por BAIREN ≈ USD 40', b.l2);
await chip(c, 'operacion', 'venta'); b = await esperarBarra(x => /≈ USD 40$/.test(x.l2));
caso('Dueña: y vuelve a venta', b.l2 === 'Si cerrás por BAIREN ≈ USD 40', b.l2);
await m('tf-venta-precio', false);
await seguir(c);
await c.ev('document.getElementById("quieroProd").click(); true'); await seguir(c);
await set(c, { descripcion: DESC }); await seguir(c, 1500);
b = await barra();
caso('Dueña: Revisar en la compu con la barra y Continuar libre', await pantalla(c) === 'revisar' && b.vis && b.libre && !b.scrollX && await noTapa(), b);
await m('tf-venta-revisar', false);

/* ── 5. Desarrolladora: pozo y terminado, en el celular ── */
await c.vista(true);
await limpiar(c); await digital(true);
p = await hastaPropiedad('desarrolladora', 'emprendimiento', 'desa.tf@ejemplo.com', { nombre: 'Desarrolladora Tarifas', whatsapp: '11 4444 0000', cuit: '30-70000000-1' });
await set(c, { zona: 'Núñez' }); await set(c, { direccion: 'Av. del Libertador 7300' }); await seguir(c);
caso('Desarrolladora: en Unidades, sin etapa, no hay barra', await pantalla(c) === 'precio' && !(await barra()).vis, await pantalla(c));
await set(c, { emprendimiento: 'Torre Tarifas', entrega: 'Diciembre 2027' }); await chip(c, 'etapa', 'pozo');
b = await esperarBarra(x => x.vis);
caso('Desarrolladora: en pozo, "Por inversor verificado: USD 30"', b.l1 === 'Publicar: sin costo' && b.l2 === 'Por inversor verificado USD 30' && b.libre, b);
await unidad(0, { u_unidad: '4° A', u_ambientes: '2', u_m2: '58', u_precio: '185000' });
await chip(c, 'etapa', 'terminado'); b = await esperarBarra(x => /por unidad/.test(x.l2));
caso('Desarrolladora: terminado, por unidad vendida ≈ USD 40', b.l2 === 'Si cerrás por BAIREN ≈ USD 40 por unidad', b.l2);
await chip(c, 'etapa', 'construccion'); b = await esperarBarra(x => /inversor/.test(x.l2));
caso('Desarrolladora: en construcción vuelve a pozo', b.l2 === 'Por inversor verificado USD 30', b.l2);
await c.ev('document.activeElement && document.activeElement.blur(); true'); await sleep(200);
caso('Desarrolladora: la barra no tapa "Agregar unidad"', await noTapa() && (await barra()).libre, null);
await m('tf-pozo-unidades', true);
await c.ev('document.querySelector(".tf-ver").click(); true'); await sleep(500);
h = await hoja();
caso('Desarrolladora: el detalle dice por inversor verificado, sin total', !!h && /^Inversor verificado = USD 30/.test(h.items[0]) && !h.total && /No depende de la venta/.test(h.sup), h);
await m('tf-pozo-detalle', true);
await c.ev('document.querySelector(".tf-hoja .pf-hoja-fondo").click(); true'); await sleep(300);
caso('Desarrolladora: tocar afuera cierra la hoja', !(await hoja()), null);

/* ── 6. Inmobiliaria: alquiler en pesos, en el celular ── */
await limpiar(c); await digital(true);
p = await hastaPropiedad('inmobiliaria', 'alquiler', 'inmo.tf@ejemplo.com', { nombre: 'Inmobiliaria Tarifas', whatsapp: '11 3333 0000', colegio: 'CUCICBA', matricula: '4321' });
caso('Inmobiliaria: llega a Propiedad', p === 'propiedad', p);
await set(c, { zona: 'Recoleta' }); await set(c, { barrio: 'Recoleta', direccion: 'Ayacucho 1800', unidad: '5 C', m2_total: '60' }); await pasos(c, 'ambientes', 2); await pasos(c, 'banos', 1);
await seguir(c);
await chip(c, 'moneda', 'ARS'); await set(c, { precio: '800.000' }); await chip(c, 'plazo', '24 meses');
b = await esperarBarra(x => /384/.test(x.l2));
caso('Inmobiliaria: alquiler de $ 800.000 a 24 meses ≈ USD 90 + $ 384.000, en dos renglones', b.l2 === 'Si cerrás por BAIREN ≈ USD 90 + $ 384.000' && b.altoRes <= 52 && b.libre && !b.scrollX, b);
await c.ev('document.activeElement && document.activeElement.blur(); true');
await m('tf-alquiler-ars', true);
await c.ev('document.querySelector(".tf-ver").click(); true'); await sleep(500);
h = await hoja();
caso('Inmobiliaria: el detalle suma la tecnología por operación y marca lo que paga el propietario', !!h && h.items.some(x => /^Tecnología por operación \(corredor aliado\) = USD 50/.test(x)) && h.items.some(x => /^Cobranza digital = \$ 384.000 .*lo paga el propietario/.test(x)) && /USD 90 \+ \$ 384.000/.test(h.total), h);
await m('tf-alquiler-detalle', true);
await c.ev('document.querySelector(".tf-hoja [data-cerrar].suave").click(); true'); await sleep(300);
await chip(c, 'plazo', '12 meses'); b = await esperarBarra(x => /192/.test(x.l2));
caso('Inmobiliaria: con contrato de 12 meses ≈ USD 90 + $ 192.000', b.l2 === 'Si cerrás por BAIREN ≈ USD 90 + $ 192.000', b.l2);

/* ── 7. Cobros: el escenario que ven los publicadores ── */
await c.vista(false);
await c.ir('cobros.html', 1800);
const cb = await c.ev(`(function(){ const s = document.getElementById('tfEscPub'); if (!s) return null; return { nuevas: document.querySelectorAll('.tf-esc-pub a[target=_blank]').length, valor: s.value, opciones: Array.from(s.options).map(o => o.value + (o.disabled ? ' (no)' : '')), rot: document.querySelector('.tf-esc-pub label').textContent }; })()`);
caso('Cobros: selector con Rieles elegido; el porcentaje de la operación no se puede elegir', !!cb && cb.valor === 'Rieles · octubre 2026' && cb.nuevas === 0 && cb.opciones.indexOf('Idea original · porcentaje (no)') > -1 && cb.opciones.indexOf('Sin matrícula · sección 12') > -1, cb);
await c.fotoDe('d-tf-cobros-selector', '.tf-esc-pub', 12);
await c.ev(`window.confirm = () => { throw new Error('no debería preguntar'); }; const s = document.getElementById('tfEscPub'); s.value = 'Sin matrícula · sección 12'; s.dispatchEvent(new Event('change')); true`); await sleep(800);
caso('Cobros: cambia a Sin matrícula', /Sin matrícula/.test(await toast(c)), await toast(c));
await c.ir('precios.html', 1500);
const sm = await c.ev(`Array.from(document.querySelectorAll('.tp-t')).map(t => t.querySelector('h2').textContent + ' = ' + t.querySelector('.tp-total').textContent.trim()).join(' | ') + ' || ' + Array.from(document.querySelectorAll('.tp-lista .n')).map(x => x.textContent).join(',')`);
caso('Precios con Sin matrícula: administración mensual en vez de cobranza', /Administración mensual/.test(sm) && !/Cobranza digital/.test(sm), sm);
await c.ir('cobros.html', 1800);
await c.ev(`window.confirm = () => true; const s = document.getElementById('tfEscPub'); s.value = 'Rieles · octubre 2026'; s.dispatchEvent(new Event('change')); true`); await sleep(800);
caso('Cobros: vuelve a Rieles', await c.ev('BPDigital.escenarioPublico()') === 'Rieles · octubre 2026', null);
const forzado = await c.ev(`BPDigital.fijarEscenarioPublico('Idea original · porcentaje').then(() => 'entró', e => e.message)`);
caso('Cobros: un escenario con porcentaje de la operación se rechaza', /Ley 2340/.test(forzado), forzado);

/* ── 8. Apagado ── */
await digital(false);
await c.ir('precios.html', 1500);
caso('Precios apagado: Muy pronto', /Muy pronto/.test(await c.ev('document.getElementById("contenido").innerText')), null);
await digital(true);   /* deja el portal abierto para la prueba que sigue (la cookie bp_cerrado dura 2 minutos) */

out.medidas = out.medidas.map(x => ({ n: x.nombre, scrollX: x.scrollX, continuar: x.continuarVisible, palabras: x.palabras }));
caso('Medidas: sin scroll horizontal y Continuar a la vista en todas', out.medidas.every(x => !x.scrollX && x.continuar), out.medidas);
out.errores = c.errores; out.consola = c.consola;
const fallas = out.casos.filter(x => !x.ok);
for (const x of out.casos) console.log((x.ok ? 'ok   ' : 'FALLA') + ' ' + x.n + (x.ok ? '' : ' → ' + JSON.stringify(x.det).slice(0, 600)));
console.log(JSON.stringify({ casos: out.casos.length, fallas: fallas.length, errores: out.errores, consola: out.consola, final: fallas.length ? 'falla' : 'listo' }));
await c.cerrar();
process.exit(fallas.length || out.errores.length || out.consola.length ? 1 : 0);
