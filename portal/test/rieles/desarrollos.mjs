/* Rieles · Desarrollos y Membresía Inversor (migración 34), en modo local (sin base).
   Recorre: lista de espera en Desarrollos (sin sesión, con sesión, ida y vuelta, la desarrolladora ve cuántos), la página
   de la membresía (pedir, estados), la vista de la plataforma (?admin: activar, pausar, listas de espera), el acceso
   anticipado en Explorar ("Antes que nadie") y el paso lead_inversor en Mensajes (con su cargo simulado de USD 30).
   Uso (desde la raíz del repo, con el servidor y Chrome levantados):
     BP_PUERTO=8206 BP_CHROME=9406 BP_CAPTURAS=/tmp/bp-desarrollos node portal/test/rieles/desarrollos.mjs
   Imprime un JSON con { casos, errores, consola, final }; sale con 1 si algún caso falla. */
import { conectar, sleep } from '../flujos/cdp.mjs';

const c = await conectar();
const casos = [], fallas = [];
const caso = (nombre, ok, det) => { casos.push({ nombre, ok: !!ok, det: det === undefined ? null : det }); if (!ok) fallas.push('CASO: ' + nombre + ' → ' + JSON.stringify(det === undefined ? null : det).slice(0, 240)); };
const U = {
  ana: { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' },
  beto: { id: 'local-beto', email: 'beto@prueba.local', perfil: 'busca' },
  carla: { id: 'local-carla', email: 'carla@prueba.local', perfil: 'busca' },
  dev: { id: 'local-dev', email: 'dev@prueba.local', perfil: 'publica' }
};
const EMP = 'Torre Ejemplo Núñez', PUB = 'desarrolladora-ejemplo';
const UNIDAD1 = { id: 'ejemplo-emp-nunez-1', publicador_id: PUB, operacion: 'venta', etapa: 'construccion', precio: 185000, moneda: 'USD', titulo: 'Torre Ejemplo Núñez · 2 ambientes', barrio: 'Núñez' };
const UNIDAD2 = { id: 'ejemplo-emp-nunez-2', publicador_id: PUB, operacion: 'venta', etapa: 'construccion', precio: 265000, moneda: 'USD', titulo: 'Torre Ejemplo Núñez · 3 ambientes', barrio: 'Núñez' };
const como = async (u) => { await c.ev(u ? `localStorage.setItem('bp_user', ${JSON.stringify(JSON.stringify(u))}); true` : `localStorage.removeItem('bp_user'); true`); };
const ls = k => c.ev(`JSON.parse(localStorage.getItem(${JSON.stringify(k)}) || 'null')`);
const scrollH = () => c.ev('document.documentElement.scrollWidth - window.innerWidth');
const txt = sel => c.ev(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ''`);
const esperarSel = async (sel, ms = 6000) => { for (let i = 0; i < ms / 100; i++) { if (await c.ev(`!!document.querySelector(${JSON.stringify(sel)})`)) return true; await sleep(100); } return false; };
const sinScroll = async (donde) => { const h = await scrollH(); caso('Sin scroll horizontal · ' + donde, h <= 0, h); };

/* ── Preparación: navegador limpio, interruptor prendido, la desarrolladora con su cuenta ── */
await c.vista(true);
await c.ir('index.html', 300);
await c.ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bp_digital', '1');
  localStorage.setItem('bp_publicadores', JSON.stringify([{ id: '${PUB}', slug: '${PUB}', auth_user_id: 'local-dev', nombre: 'Desarrolladora Ejemplo', tipo: 'desarrolladora', verificado: true }])); true`);

/* ── 1. Desarrollos: "Avisame" sin sesión lleva a ingresar y vuelve con el pedido ── */
await como(null);
await c.ir('emprendimientos.html', 1800);
await esperarSel('.p-emp-avisame');
caso('Desarrollos: botón discreto "Avisame" en el desarrollo', (await txt(`.p-emp[data-emp="${EMP}"] .p-emp-avisame`)).trim() === 'Avisame'
  && /Avisame cuando haya novedades de Torre Ejemplo/.test(await c.ev(`document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame').getAttribute('aria-label')`)), await txt(`.p-emp[data-emp="${EMP}"] .p-emp-avisame`));
await c.foto('m-emp-1-sin-sesion');
await c.ev(`document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame').click(); true`); await sleep(1200);
const urlIng = await c.ev('location.pathname + location.search');
caso('Sin sesión: va a ingresar y vuelve a Desarrollos con el pedido', /ingresar\.html\?volver=emprendimientos\.html%3Favisame%3D/.test(urlIng), urlIng);

await como(U.ana);
await c.ir('emprendimientos.html?avisame=' + encodeURIComponent(EMP) + '&avisame_pub=' + PUB, 2200);
await esperarSel('.p-emp-avisame[aria-pressed="true"]', 4000);
caso('Al volver con sesión se suma sola: "Te avisamos ✓"', (await c.ev(`(document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame')||{}).getAttribute && document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame').getAttribute('aria-pressed')`)) === 'true'
  && (await txt(`.p-emp[data-emp="${EMP}"] .p-emp-avisame`)).trim() === 'Te avisamos', await txt(`.p-emp[data-emp="${EMP}"] .p-emp-avisame`));
caso('La dirección queda limpia (sin avisame)', !(await c.ev('location.search')).includes('avisame'), await c.ev('location.search'));
caso('Una fila en la lista de espera', ((await ls('bp_dg_lista_espera')) || []).length === 1, await ls('bp_dg_lista_espera'));
await c.fotoDe('m-emp-2-te-avisamos', `.p-emp[data-emp="${EMP}"] .body`);
await c.ev(`document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame').click(); true`); await sleep(700);
caso('Tocarlo de nuevo la saca de la lista', ((await ls('bp_dg_lista_espera')) || []).length === 0 && (await txt('#bpToast')).includes('no te avisamos'), await txt('#bpToast'));
await c.ev(`document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame').click(); true`); await sleep(700);
caso('Y otra vez la suma', ((await ls('bp_dg_lista_espera')) || []).length === 1, null);
await sinScroll('Desarrollos celular');
caso('Error: un desarrollo que no existe', String(await c.ev(`BPDigital.sumarmeLista('Torre Inventada', null).then(() => 'entró', e => e.message)`)).includes('no está publicado'), null);

await como(U.beto);
await c.ir('emprendimientos.html', 1800); await esperarSel('.p-emp-avisame');
await c.ev(`document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame').click(); true`); await sleep(700);
caso('Beto también se suma', ((await ls('bp_dg_lista_espera')) || []).length === 2, null);

await como(U.dev);
await c.ir('emprendimientos.html', 1800); await esperarSel('.p-emp-espera', 4000);
caso('La desarrolladora ve cuántos esperan, no quiénes', (await txt(`.p-emp[data-emp="${EMP}"] .p-emp-espera`)).includes('2 personas esperan novedades')
  && !(await c.ev(`!!document.querySelector('.p-emp[data-emp="${EMP}"] .p-emp-avisame')`)), await txt(`.p-emp[data-emp="${EMP}"] .p-emp-aviso`));
caso('La desarrolladora no se suma a su propio desarrollo', String(await c.ev(`BPDigital.sumarmeLista(${JSON.stringify(EMP)}, '${PUB}').then(() => 'entró', e => e.message)`)).includes('Es un desarrollo tuyo'), null);
await c.fotoDe('m-emp-3-desarrolladora', `.p-emp[data-emp="${EMP}"] .body`);

/* ── 2. La membresía: sin sesión, pedirla, estados ── */
await como(null);
await c.ir('inversores.html', 1500); await esperarSel('.inv-cta');
const pub0 = await c.ev(`({ h1: (document.querySelector('.inv-h1')||{}).textContent, ben: document.querySelectorAll('.inv-ben li').length, precio: (document.querySelector('.inv-precio')||{}).textContent, ctas: document.querySelectorAll('main .p-btn, main button').length, href: (document.querySelector('.inv-cta')||{}).getAttribute && document.querySelector('.inv-cta').getAttribute('href'), letra: !document.querySelector('.inv-letra').open })`);
caso('Membresía sin sesión: título, 3 beneficios, precio, un solo botón y la letra chica plegada',
  pub0.ben === 3 && /USD 25/.test(pub0.precio) && /por mes/.test(pub0.precio) && pub0.ctas === 1 && /ingresar\.html\?volver=inversores\.html%3Fquiero%3D1/.test(pub0.href) && pub0.letra, pub0);
await c.foto('m-inv-1-publico', true);
await sinScroll('Membresía celular');

await como(U.ana);
await c.ir('inversores.html', 1500); await esperarSel('#invPedir');
caso('Con sesión: "Ser miembro"', (await txt('#invPedir')) === 'Ser miembro', await txt('#invPedir'));
const barra = await c.ev(`(() => { const b = document.querySelector('.inv-barra'), r = b.getBoundingClientRect(), tb = document.querySelector('.p-tabbar'); return { pos: getComputedStyle(b).position, abajo: Math.round(innerHeight - r.bottom), tab: tb ? Math.round(tb.getBoundingClientRect().height) : 0, precio: (b.querySelector('.inv-precio')||{}).textContent }; })()`);
caso('Celular: el botón fijo abajo, con el precio, sobre la barra de pestañas', barra.pos === 'fixed' && barra.abajo >= barra.tab - 1 && barra.abajo <= barra.tab + 2 && /USD 25/.test(barra.precio), barra);
await c.ev(`document.getElementById('invPedir').addEventListener('click', () => { window._txtAlTocar = document.getElementById('invPedir') && document.getElementById('invPedir').textContent; }, { once: true }); true`);
await c.ev(`document.getElementById('invPedir').click(); true`); await sleep(800);
const ana1 = await c.ev(`({ estado: (document.querySelector('.inv-estado')||{}).textContent, ctas: document.querySelectorAll('.inv-cta').length, conf: (document.querySelector('.inv-conf')||{}).textContent })`);
caso('Pedido: el estado en una línea y sin botón que compita', /Pedido recibido/.test(ana1.estado) && ana1.ctas === 0 && /ana@prueba\.local/.test(ana1.conf), ana1);
caso('Al tocar, el botón pasa a "Enviando…"', (await c.ev('window._txtAlTocar')) === 'Enviando…', await c.ev('window._txtAlTocar'));
await c.foto('m-inv-2-pedida', true);
caso('Pedirla dos veces no duplica', ((await c.ev(`BPDigital.solicitarMembresia().then(() => JSON.parse(localStorage.bp_dg_inv_membresias).length)`)) === 1), null);

await como(U.carla);
await c.ir('inversores.html?quiero=1', 1800); await esperarSel('.inv-estado');
caso('Al volver de ingresar con ?quiero=1 se pide sola', /Pedido recibido/.test(await txt('.inv-estado')) && !(await c.ev('location.search')).includes('quiero'), await txt('.inv-estado'));

/* ── 3. La plataforma (?admin): pedidos, activar, pausar, listas de espera ── */
await como(U.dev);
await c.ir('inversores.html?admin', 1800); await esperarSel('.inv-admin');
const adm0 = await c.ev(`({ linea: (document.querySelector('.inv-admin .inv-estado')||{}).textContent, pedidos: document.querySelectorAll('#sec-sol + .inv-filas .inv-fila, .inv-sec:first-of-type .inv-fila').length })`);
caso('Plataforma: la línea de estado y los dos pedidos', /2 pedidos por activar/.test(adm0.linea) && /0 miembros/.test(adm0.linea) && /USD 25 por mes/.test(adm0.linea), adm0);
await c.foto('m-adm-1-pedidos', true);
const idAna = await c.ev(`JSON.parse(localStorage.bp_dg_inv_membresias).find(m => m.usuario === 'local-ana').id`);
await c.ev(`document.querySelector('[data-activar="${idAna}"]').click(); true`); await sleep(600);
caso('Activar abre la hoja con la fecha sugerida (un mes)', await c.ev(`!!document.querySelector('.inv-velo.on [name=hasta]') && /^\\d{4}-\\d{2}-\\d{2}$/.test(document.querySelector('.inv-velo [name=hasta]').value)`), await c.ev(`(document.querySelector('.inv-velo [name=hasta]')||{}).value`));
await c.foto('m-adm-2-hoja-activar');
caso('Fecha con el teclado de fecha', (await c.ev(`document.querySelector('.inv-velo [name=hasta]').type`)) === 'date', null);
await c.ev('history.back(); true'); await sleep(700);
caso('El botón Atrás del celular cierra la hoja y deja la página', !(await c.ev(`!!document.querySelector('.inv-velo')`)) && /inversores\.html/.test(await c.ev('location.pathname')) && (await c.ev(`JSON.parse(localStorage.bp_dg_inv_membresias).find(m => m.usuario === 'local-ana').estado`)) === 'solicitada', await c.ev('location.href'));
await c.ev(`document.querySelector('[data-activar="${idAna}"]').click(); true`); await sleep(600);
await c.ev(`document.querySelector('.inv-velo [name=referencia]').value = 'Transferencia 9/10'; document.querySelector('.inv-velo [type=submit]').click(); true`); await sleep(900);
caso('La hoja se cierra sola al activar y no deja historia de más', !(await c.ev(`!!document.querySelector('.inv-velo')`)), null);
const memAna = await c.ev(`JSON.parse(localStorage.bp_dg_inv_membresias).find(m => m.usuario === 'local-ana')`);
caso('Ana queda activa por un mes, con la referencia', memAna.estado === 'activa' && new Date(memAna.hasta) > new Date(Date.now() + 27 * 864e5) && memAna.referencia === 'Transferencia 9/10', memAna);
caso('La pastilla dice hasta cuándo', /Activa · hasta el/.test(await txt('.inv-pill.e-activa')), await txt('.inv-pill.e-activa'));
caso('Error: activar con fecha pasada', String(await c.ev(`BPDigital.activarMembresia('${idAna}', '2020-01-01').then(() => 'entró', e => e.message)`)).includes('posterior a hoy'), null);
await c.ev(`document.querySelector('[data-pausar="${idAna}"]').click(); true`); await sleep(600);
caso('Pausar pide confirmación', /¿Pausar a ana\?/.test(await txt('.inv-velo .inv-hoja-t')), await txt('.inv-velo .inv-hoja-t'));
await c.ev(`document.querySelector('.inv-velo [type=submit]').click(); true`); await sleep(900);
caso('Pausada', (await c.ev(`JSON.parse(localStorage.bp_dg_inv_membresias).find(m => m.usuario === 'local-ana').estado`)) === 'pausada', null);
await c.ev(`document.querySelector('[data-activar="${idAna}"]').click(); true`); await sleep(600);
await c.ev(`document.querySelector('.inv-velo [type=submit]').click(); true`); await sleep(900);
caso('Reactivada', (await c.ev(`JSON.parse(localStorage.bp_dg_inv_membresias).find(m => m.usuario === 'local-ana').estado`)) === 'activa', null);
await c.ev(`document.querySelector('.inv-sec-espera').open = true; document.querySelector('.inv-espera [data-quienes]').click(); true`); await sleep(700);
caso('Listas de espera: la plataforma ve quiénes', (await txt('.inv-espera .inv-quienes')).includes('ana@prueba.local') && (await txt('.inv-espera')).includes('2 esperan'), await txt('.inv-espera'));
await c.fotoDe('m-adm-3-espera', '.inv-sec-espera');
await c.ev(`document.querySelector('.inv-espera [data-avisados]').click(); true`); await sleep(900);
caso('Marcar avisados', ((await ls('bp_dg_lista_espera')) || []).every(x => x.avisado_en) && !(await c.ev(`!!document.querySelector('.inv-espera [data-avisados]')`)), await txt('#bpToast'));
await sinScroll('Plataforma celular');

await como(U.ana);
await c.ir('inversores.html', 1500); await esperarSel('.inv-cta');
const ana2 = await c.ev(`({ estado: (document.querySelector('.inv-estado')||{}).textContent, cta: (document.querySelector('.inv-cta')||{}).textContent, href: document.querySelector('.inv-cta').getAttribute('href') })`);
caso('Miembro: "Sos miembro · hasta el …" y "Ver lanzamientos"', /Sos miembro · hasta el \d+\/\d+\/\d{4}/.test(ana2.estado) && ana2.cta === 'Ver lanzamientos' && ana2.href === 'explorar.html', ana2);
caso('BPDigital.esMiembro() de Ana', (await c.ev('BPDigital.esMiembro()')) === true, null);
await c.foto('m-inv-3-miembro', true);

/* ── 4. Explorar: acceso anticipado ── */
await como(U.dev);
await c.ir('explorar.html', 1500);
const pubId = await c.ev(`(async () => { const p = await BPDigital.publicar({ tipo: 'lanzamiento', titulo: 'Preventa Torre Ejemplo Núñez', texto: 'Últimas unidades en pozo, entrega en 2027.', entrega: '2027-12-01', aviso_id: 'ejemplo-emp-nunez-1' });
  await BPDigital.publicar({ tipo: 'avance_obra', titulo: 'Avance de obra en Núñez', texto: 'Terminamos la estructura.' }).then(x => BPDigital.estadoPublicacion(x.id, 'publicada'));
  await BPDigital.estadoPublicacion(p.id, 'publicada'); return p.id; })()`);
await como(U.ana);
await c.ir('explorar.html', 2200); await esperarSel('.p-ex-p', 5000);
const exAna = await c.ev(`(() => { const a = Array.from(document.querySelectorAll('.p-ex-p')).find(x => x.textContent.includes('Preventa Torre Ejemplo')); const b = Array.from(document.querySelectorAll('.p-ex-p')).find(x => x.textContent.includes('Avance de obra')); return { lanz: !!a, antes: a ? (a.querySelector('.p-ex-antes')||{}).textContent : null, avance: !!b, avanceAntes: b ? !!b.querySelector('.p-ex-antes') : null }; })()`);
caso('Miembro: ve el lanzamiento con "Antes que nadie"', exAna.lanz && exAna.antes === 'Antes que nadie' && exAna.avance && exAna.avanceAntes === false, exAna);
await c.ev(`(() => { const a = Array.from(document.querySelectorAll('.p-ex-p')).find(x => x.textContent.includes('Preventa Torre Ejemplo')); a.scrollIntoView({ block: 'center' }); })(); true`); await sleep(400);
await c.fotoDe('m-ex-1-antes-que-nadie', `.p-ex-p.t-lanzamiento`);
await sinScroll('Explorar celular');
await como(U.beto);
await c.ir('explorar.html', 2200); await esperarSel('.p-ex-p', 5000);
const exBeto = await c.ev(`({ lanz: Array.from(document.querySelectorAll('.p-ex-p')).some(x => x.textContent.includes('Preventa Torre Ejemplo')), avance: Array.from(document.querySelectorAll('.p-ex-p')).some(x => x.textContent.includes('Avance de obra')), antes: document.querySelectorAll('.p-ex-antes').length })`);
caso('Sin membresía: el lanzamiento todavía no se ve; el avance sí', !exBeto.lanz && exBeto.avance && exBeto.antes === 0, exBeto);
await c.ev(`(() => { const all = JSON.parse(localStorage.bp_dg_publicaciones); const p = all.find(x => x.id === ${JSON.stringify(pubId)}); p.publicado_en = new Date(Date.now() - 3 * 864e5).toISOString(); localStorage.bp_dg_publicaciones = JSON.stringify(all); })(); true`);
await c.ir('explorar.html', 2200); await esperarSel('.p-ex-p', 5000);
const exBeto2 = await c.ev(`({ lanz: Array.from(document.querySelectorAll('.p-ex-p')).some(x => x.textContent.includes('Preventa Torre Ejemplo')), antes: document.querySelectorAll('.p-ex-antes').length })`);
caso('Pasadas las 48 h, lo ve todo el mundo, sin la marca', exBeto2.lanz && exBeto2.antes === 0, exBeto2);

/* ── 5. Lead de inversor ── */
await como(U.ana);
await c.ir('explorar.html', 1200);
const op1 = await c.ev(`BPDigital.abrir(${JSON.stringify(UNIDAD1)}, 'Hola, ¿qué unidades quedan en pozo?')`);
const h1 = await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op1)}).map(h => h.tipo + '/' + h.lado)`);
caso('Miembro consulta en pozo: paso lead_inversor del sistema', JSON.stringify(h1) === JSON.stringify(['consulta/interesado', 'lead_inversor/sistema']), h1);
const cargo = await c.ev(`JSON.parse(localStorage.bp_dg_cargos).filter(x => x.operacion_id === ${JSON.stringify(op1)})`);
caso('Cargo simulado: USD 30 a la desarrolladora (Inversor verificado)', cargo.length === 1 && cargo[0].monto === 30 && cargo[0].paga === 'publicador' && cargo[0].estado === 'simulado' && cargo[0].concepto === 'Inversor verificado', cargo);
const op1b = await c.ev(`BPDigital.abrir(${JSON.stringify(UNIDAD1)}, 'Otra pregunta')`);
caso('Vuelve a escribir: misma operación, un solo lead', op1b === op1 && (await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op1)} && h.tipo === 'lead_inversor').length`)) === 1, null);
const op2 = await c.ev(`BPDigital.abrir(${JSON.stringify(UNIDAD2)}, 'Y la de 3 ambientes?')`);
caso('Otra unidad del mismo desarrollo: no es un lead nuevo', op2 !== op1 && (await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op2)} && h.tipo === 'lead_inversor').length`)) === 0, null);
await como(U.beto);
await c.ir('explorar.html', 1200);
const op3 = await c.ev(`BPDigital.abrir(${JSON.stringify(UNIDAD1)}, 'Hola')`);
caso('Sin membresía: sin lead', (await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op3)} && h.tipo === 'lead_inversor').length`)) === 0, null);
caso('Nada se le cobra a quien busca', (await c.ev(`JSON.parse(localStorage.bp_dg_cargos).filter(x => x.paga === 'interesado').length`)) === 0, null);

/* Carla: miembro que consulta desde una página sin este módulo (Cobros): el paso aparece al abrir la conversación */
await como(U.dev);
await c.ir('inversores.html?admin', 1500); await esperarSel('.inv-admin');
const idCarla = await c.ev(`JSON.parse(localStorage.bp_dg_inv_membresias).find(m => m.usuario === 'local-carla').id`);
await c.ev(`BPDigital.activarMembresia('${idCarla}', null).then(() => true)`);
await como(U.carla);
await c.ir('cobros.html', 1200);
caso('Cobros no carga el módulo (prueba del caso)', (await c.ev('!!BPDigital._inversores')) === false, null);
const op4 = await c.ev(`BPDigital.abrir(${JSON.stringify(UNIDAD2)}, 'Hola, soy inversora')`);
caso('Sin el módulo, todavía no hay lead', (await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op4)} && h.tipo === 'lead_inversor').length`)) === 0, null);
await c.ir('mensajes.html?op=' + encodeURIComponent(op4), 2500); await esperarSel('.ms-hito-lead_inversor', 5000);
caso('Al abrir la conversación en Mensajes se registra y se lee en el chat', (await txt('.ms-hito-lead_inversor')).includes('Consulta de inversor verificado')
  && (await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op4)} && h.tipo === 'lead_inversor').length`)) === 1, await txt('.ms-hito-lead_inversor'));
await c.ir('mensajes.html?op=' + encodeURIComponent(op4), 2000);
caso('Recargar no lo repite', (await c.ev(`JSON.parse(localStorage.bp_dg_hitos).filter(h => h.operacion_id === ${JSON.stringify(op4)} && h.tipo === 'lead_inversor').length`)) === 1, null);
await c.foto('m-ms-1-lead');
await sinScroll('Mensajes celular');
caso('Sin sesión no se pide nada', String(await c.ev(`(localStorage.removeItem('bp_user'), BPStore.session = null, BPDigital.solicitarMembresia().then(() => 'entró', e => e.message))`)).includes('Ingresá'), null);

/* ── 6. Compu (1440 × 900) ── */
await c.vista(false);
await como(U.ana);
await c.ir('inversores.html', 1500); await esperarSel('.inv-cta'); await c.foto('d-inv-miembro'); await sinScroll('Membresía compu');
await como(null);
await c.ir('inversores.html', 1500); await esperarSel('.inv-cta'); await c.foto('d-inv-publico'); await sinScroll('Membresía compu sin sesión');
await como(U.dev);
await c.ir('inversores.html?admin', 1800); await esperarSel('.inv-admin'); await c.foto('d-adm', true); await sinScroll('Plataforma compu');
await como(U.ana);
await c.ir('emprendimientos.html', 1800); await esperarSel('.p-emp-avisame'); await c.fotoDe('d-emp-te-avisamos', `.p-emp[data-emp="${EMP}"]`); await sinScroll('Desarrollos compu');
await c.ev(`(() => { const all = JSON.parse(localStorage.bp_dg_publicaciones); all.forEach(p => { if (p.tipo === 'lanzamiento') p.publicado_en = new Date().toISOString(); }); localStorage.bp_dg_publicaciones = JSON.stringify(all); })(); true`);
await c.ir('explorar.html', 2200); await esperarSel('.p-ex-antes', 5000); await c.fotoDe('d-ex-antes-que-nadie', '.p-ex-p.t-lanzamiento'); await sinScroll('Explorar compu');
caso('Compu: "Antes que nadie" en Explorar', (await txt('.p-ex-antes')) === 'Antes que nadie', null);
await c.ir('mensajes.html?op=' + encodeURIComponent(op1), 2200); await c.foto('d-ms-lead'); await sinScroll('Mensajes compu');

/* Página sin el interruptor: "Muy pronto" */
await c.ev(`localStorage.removeItem('bp_digital'); true`);
await c.ir('inversores.html', 1200);
caso('Sin BAIREN digital: "Muy pronto"', (await txt('.inv-vacio b')) === 'Muy pronto', await txt('main'));
await c.ir('emprendimientos.html', 1500);
caso('Sin BAIREN digital, Desarrollos queda como estaba', (await c.ev(`document.querySelectorAll('.p-emp-avisame, .p-emp-aviso').length`)) === 0, null);

const errores = c.errores.concat(fallas);
console.log(JSON.stringify({ casos, errores, consola: c.consola, final: casos.filter(x => x.ok).length + '/' + casos.length }, null, 1));
await c.cerrar();
process.exit(errores.length || c.consola.length ? 1 : 0);
