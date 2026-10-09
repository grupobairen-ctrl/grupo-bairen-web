/* Prueba de punta a punta de mensajes.html en modo local.
   BP_PUERTO=8131 BP_CHROME=9331 BP_CAPTURAS=<carpeta> node t-mensajes.mjs */
import { conectar, sleep } from '../flujos/cdp.mjs';

const c = await conectar();
const fallas = [];
const check = (cond, msg, extra) => { console.log((cond ? 'OK    ' : 'FALLA ') + msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); if (!cond) fallas.push(msg); };
const ANA = { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' };
const PABLO = { id: 'local-pablo', email: 'pablo@prueba.local', perfil: 'profesional' };
const CURA = { id: 'local-cura', email: 'cura@prueba.local', perfil: null };
const PUB = [{ id: 'pub-gestora', slug: 'gestora-prueba', tipo: 'gestor', nombre: 'Gestora Prueba', auth_user_id: 'local-pablo', verificado: true, whatsapp: '5491100000000' }];
const como = u => c.ev(`localStorage.setItem('bp_user', ${JSON.stringify(JSON.stringify(u))}); true`);
const toast = () => c.ev('(document.getElementById("bpToast")||{}).textContent || ""');
const texto = sel => c.ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent || ""`);
const hay = sel => c.ev(`!!document.querySelector(${JSON.stringify(sel)})`);
const sinScrollH = () => c.ev('document.documentElement.scrollWidth <= window.innerWidth + 1');
const esperar = async (expr, ms = 4000) => { for (let i = 0; i < ms / 100; i++) { if (await c.ev(expr)) return true; await sleep(100); } return false; };
/* Abre una acción (directa o desde "Más") */
const accion = async id => {
  const r = await c.ev(`(()=>{ const b = document.querySelector('#msAcc [data-acc="${id}"]'); if (!b) return 'no está'; if (b.closest('#msMasPop')) { document.getElementById('msMasBtn').click(); } b.click(); return true; })()`);
  await sleep(350); return r;
};
/* Completa el diálogo abierto y confirma */
const dialogo = async (valores, confirmar = true) => {
  const r = await c.ev(`(()=>{ const f = document.querySelector('.ms-dlg form'); if (!f) return 'sin diálogo'; const v = ${JSON.stringify(valores)};
    for (const k in v) { const e = f.elements[k]; if (!e) return 'falta ' + k; e.value = v[k]; e.dispatchEvent(new Event('input', { bubbles: true })); }
    return true; })()`);
  if (r !== true) return r;
  if (confirmar) { await c.ev(`document.querySelector('.ms-dlg form [type=submit]').click(); true`); await esperar('!document.querySelector(".ms-dlg-velo")'); await sleep(500); }
  return true;
};
/* Captura con la página asentada (sin el fundido de arranque ni fotos a medio bajar) */
const fotoOriginal = c.foto;
c.foto = async (n, completa) => { await esperar(`!document.documentElement.classList.contains('arrancando') && getComputedStyle(document.body).opacity === '1' && [...document.images].every(i => i.complete)`, 5000); await sleep(250); return fotoOriginal(n, completa); };
const enDosDias = `(()=>{ const d = new Date(); d.setDate(d.getDate()+2); d.setHours(15,0,0,0); return BP.isoLocal(d); })()`;
/* Escribe en el campo y manda con Enter (teclas reales) */
const escribir = async txt => {
  await c.ev(`document.getElementById('msTexto').focus(); true`);
  await c.send('Input.insertText', { text: txt });
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await sleep(700);
};

try {
  /* ── 1 · Cerrado (cookie bp_cerrado del servidor de prueba) y sin ?digital=1: Muy pronto. Abierto: nunca ── */
  await c.vista(true);
  await c.ir('index.html', 300); await c.ev(`localStorage.clear(); sessionStorage.clear(); document.cookie = 'bp_cerrado=1; path=/; max-age=120'; true`);
  await c.ir('mensajes.html?digital=0', 1000);
  check(await hay('.ms-pronto'), '1 · sin ?digital=1 muestra "Muy pronto"', await texto('.ms-pronto-t'));
  check(await hay('.ms-pronto a[href="index.html"]'), '1 · botón a index.html');
  await c.foto('01-pronto-movil');
  await c.ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; true`);
  await c.ir('mensajes.html?digital=0', 1000);
  check(await c.ev('!!(window.BP && BP.DIGITAL_PUBLICO)') && !(await hay('.ms-pronto')), '1 · abierto para todos: sin "Muy pronto" aunque venga ?digital=0');

  /* ── 2 · Ana abre la operación y la ve en la bandeja ── */
  await c.ev(`localStorage.setItem('bp_publicadores', ${JSON.stringify(JSON.stringify(PUB))}); true`);
  await como(ANA);
  await c.ir('mensajes.html?digital=1', 1200);
  check(await hay('.ms-vacio'), '2 · bandeja vacía de Ana', await texto('.ms-vacio-t'));
  await c.foto('02-bandeja-vacia-movil');
  const op1 = await c.ev(`BPDigital.abrir({ id: 'aviso-prueba-1', publicador_id: 'pub-gestora', operacion: 'mediano', precio: 1200, moneda: 'USD', titulo: 'Dos ambientes con balcón', barrio: 'Palermo', fotos: ['test/flujos/fotos-prueba/foto1.jpg'] }, 'Hola, ¿está disponible desde noviembre?')`);
  check(typeof op1 === 'string' && op1.length > 4, '2 · BPDigital.abrir devuelve el id', op1);
  await c.ir('mensajes.html', 1200);
  check(await c.ev(`!!document.querySelector('.ms-fila[data-op="${op1}"]')`), '2 · la operación aparece en la bandeja de Ana');
  check((await texto('.ms-fila-ult')).includes('Vos: Hola'), '2 · último mensaje con "Vos:"', await texto('.ms-fila-ult'));
  /* En modo local el nombre del publicador sale del aviso que se pasa a abrir(); este no lo trae, así que vale el respaldo */
  check(/Gestora Prueba|Quien publica/.test(await texto('.ms-fila-con')), '2 · contraparte = publicador (o "Quien publica" sin nombre)', await texto('.ms-fila-con'));
  check(await sinScrollH(), '2 · sin scroll horizontal (celular, bandeja)');
  await c.foto('03-bandeja-ana-movil');
  await c.ev(`document.querySelector('.ms-fila[data-op="${op1}"]').click(); true`); await sleep(900);
  check(await c.ev(`document.body.classList.contains('ms-en-op') && location.search.includes('op=')`), '2 · tocar la fila abre la operación (pushState)');
  check((await texto('#msLog')).includes('Primera consulta'), '2 · hito "Primera consulta" en el chat');
  check(await hay('#msLog .ms-m.mio'), '2 · burbuja propia a la derecha');
  check(!(await hay('#msAcc [data-acc="wa"]')), '2 · sin WhatsApp antes de la respuesta');
  check(await c.ev(`getComputedStyle(document.getElementById('pTabbar')||document.body).display === 'none' || !document.getElementById('pTabbar')`), '2 · sin barra de abajo en la operación');
  await c.foto('04-op-ana-consulta-movil');
  /* volver con la flecha */
  await c.ev(`document.querySelector('.ms-volver').click(); true`); await sleep(700);
  check(await c.ev(`!document.body.classList.contains('ms-en-op') && !location.search.includes('op=')`), '2 · la flecha vuelve a la bandeja');

  /* ── 3a · Pablo ve el no leído y contesta ── */
  await como(PABLO);
  await c.ir('mensajes.html', 1200);
  check((await texto(`.ms-fila[data-op="${op1}"] .ms-nl`)).includes('1'), '3 · Pablo ve 1 no leído', await texto(`.ms-fila[data-op="${op1}"] .ms-nl`));
  check((await texto('.ms-fila-con')).toLowerCase().includes('ana'), '3 · contraparte = nombre corto del interesado', await texto('.ms-fila-con'));
  await c.foto('05-bandeja-pablo-movil');
  await c.ir('mensajes.html?op=' + op1, 1300);
  check(!(await hay('.ms-corte')), '3 · sin separador cuando todo lo sin leer es el primer mensaje');
  await escribir('¡Hola Ana! Sí, está disponible desde el 1 de noviembre.');
  check((await texto('#msLog')).includes('está disponible desde el 1'), '3 · Enter manda el mensaje');
  check(await c.ev(`document.getElementById('msTexto').value === ''`), '3 · el campo queda vacío');
  await sleep(500);
  check((await texto('#msRec')).includes('Conversación'), '3 · etapa pasa a Conversación', await texto('.ms-rec-txt'));
  await c.ir('mensajes.html', 900);
  check(!(await hay(`.ms-fila[data-op="${op1}"] .ms-nl`)), '3 · sin no leídos después de abrir');

  /* ── 4a · Ana ve el WhatsApp después de la respuesta y pide visita ── */
  await como(ANA);
  await c.ir('mensajes.html?op=' + op1, 1300);
  const wa = await c.ev(`(document.querySelector('#msAcc [data-acc="wa"]')||{}).href || ''`);
  check(wa.startsWith('https://wa.me/5491100000000'), '4 · WhatsApp aparece después de la respuesta', wa);
  check(decodeURIComponent(wa).includes('mensajes.html?op=' + op1), '4 · el WhatsApp sale con el link de vuelta a la operación', decodeURIComponent(wa).slice(-90));
  /* La pista "acá queda registrado" aparece con un teléfono, un mail o "wsp", y se va al borrar */
  const pista = async v => c.ev(`(()=>{ const ta = document.getElementById('msTexto'); ta.value = ${JSON.stringify(v)}; ta.dispatchEvent(new Event('input', { bubbles: true })); return !document.getElementById('msPista').hidden; })()`);
  check(!(await pista('Hola, ¿se puede visitar el jueves?')), '4 · sin pista en un mensaje común');
  check(await pista('Mi cel es 11 5555-1234'), '4 · pista con un teléfono');
  check(await pista('escribime a ana@mail.com'), '4 · pista con un mail');
  check(await pista('pasame tu wsp'), '4 · pista con "wsp"');
  check(!(await pista('')), '4 · la pista se va al borrar');
  check(await hay('#msLog .ms-corte'), '4 · separador "Sin leer" antes de la respuesta de Pablo');
  check((await texto('#msLog .ms-m.mio .ms-visto')).includes('Visto'), '4 · "Visto" debajo del mensaje que Pablo leyó');
  /* Escape cierra el diálogo y devuelve el foco */
  await accion('avanzar');
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(400);
  check(!(await hay('.ms-dlg-velo')), '4 · Escape cierra el diálogo');
  check(await c.ev(`document.activeElement && document.activeElement.dataset.acc === 'avanzar'`), '4 · el foco vuelve al botón que abrió el diálogo');
  /* El menú Más se abre y se cierra con Escape */
  await c.ev(`document.getElementById('msMasBtn').click(); true`); await sleep(200);
  check(await c.ev(`!document.getElementById('msMasPop').hidden && document.activeElement.getAttribute('role') === 'menuitem'`), '4 · "Más" abre el menú con foco adentro');
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(200);
  check(await c.ev(`document.getElementById('msMasPop').hidden && document.activeElement.id === 'msMasBtn'`), '4 · Escape cierra el menú y vuelve al botón');
  await accion('pedir_visita');
  check(await hay('.ms-dlg input[type=datetime-local]'), '4 · diálogo de pedir visita con fecha y hora');
  await c.foto('06-dialogo-pedir-visita-movil');
  await dialogo({ fecha: await c.ev(enDosDias), nota: '¿Puedo ir con mi pareja?' });
  check((await toast()).includes('Pidió una visita'), '4 · toast del paso', await toast());
  check((await texto('#msLog')).includes('Pidió una visita'), '4 · hito "Pidió una visita" en el chat');
  check((await texto('#msLog')).includes('¿Puedo ir con mi pareja?'), '4 · la nota también va al chat');
  check((await texto('.ms-acc-estado')).includes('Pediste una visita'), '4 · estado "Pediste una visita…"', await texto('.ms-acc-estado'));

  /* ── 3b · Pablo: confirma visita, visita hecha, contrato, cierre, cobro ── */
  await como(PABLO);
  await c.ir('mensajes.html?op=' + op1, 1300);
  check(await hay('#msAcc [data-acc="confirmar_visita"]'), '3 · "Confirmar visita" a mano');
  await accion('confirmar_visita');
  const pre = await c.ev(`document.querySelector('.ms-dlg form').elements.fecha.value`);
  check(pre === await c.ev(enDosDias), '3 · la fecha pedida viene precargada', pre);
  await dialogo({ nota: 'Tocá el timbre del 4B.' });
  check((await texto('#msLog')).includes('Visita confirmada'), '3 · visita confirmada');
  check(await c.ev(`[...document.querySelectorAll('.ms-hito')].some(h => /Visita confirmada · \\S+ \\d+\\/\\d+ 15:00/.test(h.textContent))`), '3 · renglón "Visita confirmada · jue 20/10 15:00"', await c.ev(`[...document.querySelectorAll('.ms-hito')].map(h=>h.textContent).join(' | ')`));
  await accion('visita_hecha');
  await dialogo({ feedback: 'Le gustó mucho la luz.' });
  check((await texto('#msLog')).includes('Visita hecha'), '3 · visita hecha');
  /* Desde la integración de los rieles (9/10), "Contrato preparado" y "Registrar cobro del mes" los hacen los módulos de
     documentos y de pagos (sus pruebas propias están en test/rieles). Acá se registran por la API para seguir el recorrido. */
  check(!(await hay('#msAcc [data-acc="contrato_gen"]')), '3 · el paso manual "Contrato preparado" lo reemplaza el riel de documentos');
  const pasoApi = async (tipo, datos) => { await c.ev(`BPDigital.paso(new URLSearchParams(location.search).get('op'), ${JSON.stringify(tipo)}, ${JSON.stringify(datos || null)}).then(() => true)`); await c.ev('location.reload(); true'); await sleep(1500); };
  await pasoApi('contrato_generado');
  check((await texto('#msLog')).includes('Contrato preparado'), '3 · contrato preparado');
  await accion('cerrar');
  await dialogo({ plazo_meses: '6' }, false);
  const auto = await c.ev(`document.querySelector('.ms-dlg form').elements.monto_contrato.value`);
  check(auto === '7200', '3 · el total se completa con 6 × 1.200', auto);
  await c.foto('07-dialogo-cierre-movil');
  await dialogo({ monto_contrato: '7200', moneda: 'USD' });
  check((await texto('#msRec')).includes('Cerrada'), '3 · etapa Cerrada', await texto('.ms-rec-txt'));
  check((await texto('#msLog')).includes('USD 7.200 · 6 meses'), '3 · hito de cierre con monto y plazo');
  check((await texto('.ms-acc-estado')).includes('cuotas'), '3 · cerrada, el riel de pagos propone armar las cuotas', await texto('.ms-acc-estado'));
  await pasoApi('cobro_mensual', { monto: 1200, moneda: 'USD', periodo: '2026-11' });
  check((await texto('#msLog')).includes('Cobro del mes'), '3 · cobro del mes registrado');
  await c.ev(`document.querySelector('.ms-info-btn').click(); true`); await sleep(500);
  check(await c.ev(`document.getElementById('msOp').classList.contains('ms-panel-on')`), '3 · se abren los detalles');
  check((await texto('#msPanel')).includes('ana@prueba.local'), '3 · contacto del interesado en los detalles');
  check((await texto('#msPanel')).includes('Le gustó mucho la luz'), '3 · feedback en Visitas');
  check((await texto('#msPanel')).includes('Acá van a estar la reserva y el contrato'), '3 · documentos vacíos con su explicación');
  await c.foto('08-detalles-pablo-movil');
  await c.ev(`document.querySelector('[data-cerrar-panel]').click(); true`); await sleep(400);
  check(!(await c.ev(`document.getElementById('msOp').classList.contains('ms-panel-on')`)), '3 · se cierran los detalles');
  check(await sinScrollH(), '3 · sin scroll horizontal (celular, operación)');
  await c.foto('09-op-pablo-cerrada-movil');
  await c.vista(false);
  await c.ir('mensajes.html?op=' + op1, 1300);
  await c.foto('10-op-pablo-cerrada-escritorio');

  /* ── 4b · Ana ve el recorrido completo; en otra operación pide visita y "No sigo" ── */
  await como(ANA);
  await c.ir('mensajes.html?op=' + op1, 1300);
  const hitos = await c.ev(`[...document.querySelectorAll('#msPanel .ms-tl-t')].map(x => x.textContent.split(' ·')[0])`);
  check(['Primera consulta', 'Empezó la conversación', 'Pidió una visita', 'Visita confirmada', 'Visita hecha', 'Contrato preparado', 'Operación cerrada', 'Cobro del mes'].every(h => hitos.includes(h)), '4 · Ana ve todo el recorrido', hitos);
  check(await c.ev(`document.querySelectorAll('#msRec li.hecho').length === 6 && !!document.querySelector('#msRec li.actual')`), '4 · el recorrido marca los 7 pasos');
  check(await hay('#msLog .ms-visto'), '4 · existe el marcador de visto');
  await c.foto('11-op-ana-cerrada-escritorio');
  const op2 = await c.ev(`BPDigital.abrir({ id: 'aviso-prueba-2', publicador_id: 'pub-gestora', operacion: 'venta', precio: 245000, moneda: 'USD', titulo: 'Tres ambientes en Belgrano R', barrio: 'Belgrano', fotos: ['test/flujos/fotos-prueba/foto3.jpg'] }, 'Hola, ¿aceptan crédito hipotecario?')`);
  await c.ir('mensajes.html?op=' + op2, 1300);
  await accion('pedir_visita');
  await dialogo({ fecha: await c.ev(enDosDias) });
  check((await texto('#msLog')).includes('Pidió una visita'), '4 · otra operación: pide visita');
  await accion('no_sigo');
  await dialogo({ motivo: 'Encontré otra opción más cerca.' });
  check((await texto('#msRec')).includes('Sin acuerdo'), '4 · "No sigo" deja la operación sin acuerdo', await texto('.ms-rec-txt'));
  check((await texto('#msRec')).includes('Encontré otra opción'), '4 · se ve el motivo');
  await c.foto('12-op-ana-caida-escritorio');
  /* bandeja: filtros */
  await c.ev(`document.querySelector('[data-f="cerradas"]').click(); true`); await sleep(300);
  check(await c.ev(`document.querySelectorAll('#msLista .ms-fila').length === 2`), '4 · filtro Cerradas (cerrada + sin acuerdo)');
  await c.ev(`document.querySelector('[data-f="todas"]').click(); true`); await sleep(300);
  await c.foto('13-bandeja-ana-escritorio');
  /* Pablo retoma la caída */
  await como(PABLO);
  await c.ir('mensajes.html?op=' + op2, 1300);
  check(await hay('#msAcc [data-acc="retomar"]'), '3 · Pablo puede retomar la caída');
  await accion('retomar'); await dialogo({});
  check((await texto('#msRec')).includes('Conversación'), '3 · retomada vuelve a Conversación', await texto('#msRec .ms-pasos li.actual'));
  /* Solicitud: Ana quiere avanzar, Pablo acepta */
  await como(ANA);
  await c.ir('mensajes.html?op=' + op2, 1300);
  await accion('avanzar'); await dialogo({ nota: 'Tengo la preaprobación del banco.' });
  check((await texto('.ms-acc-estado')).includes('Mandaste la solicitud'), '4 · "Quiero avanzar" deja la solicitud enviada', await texto('.ms-acc-estado'));
  await como(PABLO);
  await c.ir('mensajes.html?op=' + op2, 1300);
  check(await hay('#msAcc [data-acc="aceptar_sol"]') && await hay('#msAcc [data-acc="rechazar_sol"]'), '3 · Pablo ve Aceptar y Rechazar solicitud');
  await accion('aceptar_sol'); await dialogo({});
  check((await texto('#msLog')).includes('Solicitud aceptada'), '3 · solicitud aceptada');
  await c.foto('12b-op-pablo-solicitud-escritorio');

  /* ── 5 · Curador: ve todas y el cobro simulado ── */
  await como(CURA);
  await c.ir('mensajes.html', 1200);
  check(await c.ev(`!document.getElementById('msTodas').hidden`), '5 · "Ver todas" para la curación');
  await c.ev(`document.getElementById('msTodas').click(); true`); await sleep(700);
  check(await c.ev(`document.querySelectorAll('#msLista .ms-fila').length === 2`), '5 · con "Ver todas" aparecen las dos operaciones');
  await c.ev(`document.querySelector('.ms-fila[data-op="${op1}"]').click(); true`); await sleep(1200);
  const cobro = await texto('#msPanel [data-sec="cobro"]');
  check(cobro.includes('Contrato digital') && cobro.includes('USD 40'), '5 · cargo "Contrato digital 40"', cobro.slice(0, 200));
  check(cobro.includes('Administración mensual') && cobro.includes('USD 60'), '5 · cargo "Administración mensual 60"');
  check(!(await hay('#msAcc .ms-chip')), '5 · la plataforma no tiene acciones de paso');
  await escribir('Hola a los dos: el contrato digital ya quedó cargado.');
  check(await hay('#msLog .ms-m.equipo'), '5 · mensaje del equipo BAIREN, centrado');
  await c.foto('14-op-curador-escritorio');
  await c.vista(true);
  await c.ir('mensajes.html?op=' + op1, 1300);
  await c.foto('15-op-curador-movil');
  await c.ev(`document.querySelector('.ms-info-btn').click(); true`); await sleep(500);
  await c.ev(`document.querySelector('#msPanel [data-sec="cobro"]').scrollIntoView(); true`); await sleep(200);
  await c.foto('16-detalles-cobro-movil');

  /* ── Lo nuevo llega solo (cada 8 s) y queda leído ── */
  await como(ANA);
  await c.ir('mensajes.html?op=' + op2, 1300);
  await c.ev(`(()=>{ const ms = JSON.parse(localStorage.getItem('bp_dg_msj')); ms.push({ id: Date.now() + 5000, operacion_id: '${op2}', lado: 'publicador', autor: 'local-pablo', texto: 'Te mando el modelo de reserva por acá.', creado_en: new Date().toISOString(), leido_en: null }); localStorage.setItem('bp_dg_msj', JSON.stringify(ms)); return true; })()`);
  const llego = await esperar(`document.getElementById('msLog').textContent.includes('modelo de reserva')`, 18000);
  check(llego, '· sondeo: el mensaje de la otra parte aparece sin recargar');
  check(await c.ev(`JSON.parse(localStorage.getItem('bp_dg_msj')).filter(m => m.texto.includes('modelo de reserva'))[0].leido_en !== null`), '· sondeo: queda marcado como leído');
  /* ── Un error del paso se lee dentro del diálogo ── */
  await c.ev(`window._paso = BPDigital.paso; BPDigital.paso = async () => { throw new Error('No pudimos guardar: prueba de error.'); }; true`);
  await accion('no_sigo'); await dialogo({ motivo: 'x' }, false);
  await c.ev(`document.querySelector('.ms-dlg form [type=submit]').click(); true`); await sleep(500);
  check((await texto('.ms-dlg-err')).includes('prueba de error'), '· el error del paso se muestra en el diálogo', await texto('.ms-dlg-err'));
  check(await hay('.ms-dlg-velo'), '· el diálogo queda abierto para reintentar');
  await c.fotoDe('21-dialogo-error-moneda', '.ms-dlg');
  await c.ev(`document.querySelector('.ms-dlg [data-x]').click(); BPDigital.paso = window._paso; true`); await sleep(300);
  /* ── Menos movimiento ── */
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  check(await c.ev(`(()=>{ const e = document.querySelector('.ms-entra') || document.querySelector('.ms-m'); return getComputedStyle(e).animationName === 'none' || !document.querySelector('.ms-entra'); })()`), '· con menos movimiento, sin animación de entrada');
  await c.send('Emulation.setEmulatedMedia', { features: [] });

  /* ── Capturas finales de bandeja y operación (celular y escritorio) como Ana ── */
  await como(ANA);
  await c.ir('mensajes.html', 1200);
  await c.foto('17-bandeja-ana-movil');
  await c.ir('mensajes.html?op=' + op1, 1300);
  check(/px$/.test(await c.ev(`document.getElementById('msOp').style.getPropertyValue('--ms-alto')`)), '· celular: la operación sigue al viewport visible (--ms-alto)');
  await c.foto('18-op-ana-movil');
  await accion('wa'); await sleep(300);
  await c.ev(`document.querySelector('.ms-info-btn').click(); true`); await sleep(500);
  await c.foto('18b-detalles-ana-movil');
  await c.vista(false);
  await c.ir('mensajes.html', 1200);
  await c.foto('19-bandeja-ana-escritorio');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 820, deviceScaleFactor: 1, mobile: false });
  await c.ir('mensajes.html?op=' + op1, 1300);
  await c.ev(`document.querySelector('.ms-info-btn').click(); true`); await sleep(500);
  check(await c.ev(`getComputedStyle(document.getElementById('msPanel')).visibility === 'visible'`), '1100 px · los detalles se abren como panel');
  await c.foto('20-op-ana-1100-detalles');
} catch (e) { console.log('EXCEPCIÓN', e); fallas.push('excepción'); }

console.log('\nErrores de página:', JSON.stringify(c.errores, null, 1));
console.log('Consola (error/warning):', JSON.stringify(c.consola, null, 1));
console.log(fallas.length ? `\n${fallas.length} FALLAS: ${fallas.join(' | ')}` : '\nTODO OK');
await c.cerrar();
process.exit(0);
