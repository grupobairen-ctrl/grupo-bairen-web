/* Riel de documentos y firma (migración 30) · prueba del front en modo local (sin base).
   Uso, desde la raíz del repo, con el servidor y Chrome propios levantados:
     BP_PUERTO=8202 BP_CHROME=9402 BP_CAPTURAS=/tmp/bp-documentos node portal/test/rieles/documentos.mjs
   Recorre: preparar la reserva (dos pasos, con Atrás), firmar las dos partes en documento.html (hoja, errores, Atrás),
   la sección "Firmas", el contrato (anular y volver a preparar), largo plazo, estadía corta, venta, identidad, cobro
   simulado, imprimir/PDF, celular (390×844) y compu (1440×900), sin scroll horizontal ni errores de consola.
   También verifica que los modelos de js/dg-documentos.js sean idénticos a los de la migración 30. Sale con 1 si algo falla. */
import { readFileSync, writeFileSync } from 'node:fs';
import { conectar, sleep, OUT } from '../flujos/cdp.mjs';

const RAIZ = decodeURIComponent(new URL('../../', import.meta.url).pathname);
const res = []; let fallas = 0;
const ok = (caso, cond, det) => { res.push([!!cond, caso, det]); if (!cond) fallas++; console.log((cond ? '  ok   ' : '  FALLA ') + caso + (det != null && det !== '' ? '  · ' + String(typeof det === 'string' ? det : JSON.stringify(det)).slice(0, 220) : '')); };

const c = await conectar();
const J = v => JSON.stringify(v);
const esperar = async (expr, ms = 6000) => { const t0 = Date.now(); for (;;) { const v = await c.ev(expr); if (v && !(typeof v === 'string' && v.startsWith('EXC'))) return v; if (Date.now() - t0 > ms) return v; await sleep(150); } };
const ANA = { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' };
const PABLO = { id: 'local-pablo', email: 'pablo@prueba.local', perfil: 'publica' };
const CARLA = { id: 'local-carla', email: 'carla@prueba.local', perfil: 'busca' };
const como = u => c.ev(`localStorage.setItem('bp_user', ${J(J(u))}); true`);
const sinScroll = () => c.ev('document.documentElement.scrollWidth <= window.innerWidth + 1');
const toast = () => c.ev('(document.getElementById("bpToast")||{}).textContent || ""');
const LS = k => c.ev(`JSON.parse(localStorage.getItem(${J(k)}) || 'null')`);
const llenar = campos => c.ev(`(()=>{ const v=document.querySelectorAll('.ms-dlg-velo:not(.sale)'); const f=v[v.length-1].querySelector('form'); const x=${J(campos)}; for (const k in x){ const e=f.elements[k]; if(!e) return 'falta '+k; e.value=x[k]; e.dispatchEvent(new Event('input',{bubbles:true})); } return true; })()`);
const enviarDlg = () => c.ev(`(()=>{ const v=document.querySelectorAll('.ms-dlg-velo:not(.sale)'); v[v.length-1].querySelector('form [type=submit]').click(); return true; })()`);
const dlg = () => c.ev(`(()=>{ const v=document.querySelectorAll('.ms-dlg-velo:not(.sale)'); const d=v[v.length-1]; if(!d) return null; const f=d.querySelector('form'); const vals={}; Array.from(f.elements).forEach(e=>{ if(e.name) vals[e.name]=e.value; }); return { t: d.querySelector('.ms-dlg-t').textContent, err: d.querySelector('.ms-dlg-err').hidden ? '' : d.querySelector('.ms-dlg-err').textContent, vals, tipos: Array.from(f.elements).filter(e=>e.name).map(e=>e.name+':'+e.type+(e.inputMode?'/'+e.inputMode:'')) }; })()`);
const chips = () => c.ev(`(()=>({ prim: Array.from(document.querySelectorAll('#msAcc .ms-acc-fila > [data-acc]')).map(b=>b.dataset.acc), mas: Array.from(document.querySelectorAll('#msMasPop [data-acc]')).map(b=>b.dataset.acc), estado: (document.querySelector('#msAcc .ms-acc-estado')||{}).textContent || '' }))()`);
const abrirOp = async (op, mob) => { await c.ir('mensajes.html?op=' + encodeURIComponent(op), 600); await esperar(`document.querySelector('#msAcc') && document.querySelector('#msPanel .ms-sec') ? true : false`, 8000); await sleep(300); };
const seccion = () => c.ev(`(()=>{ const s=document.querySelector('[data-sec="ext-firmas"]'); return s ? s.textContent.replace(/\\s+/g,' ').trim() : null; })()`);
const estadoDoc = () => c.ev(`(()=>{ const e=document.getElementById('dgdEstado'); return e ? e.textContent.replace(/\\s+/g,' ').trim() : null; })()`);
const barra = () => c.ev(`(()=>{ const b=document.getElementById('dgdBarra'); return b && !b.hidden ? b.textContent.replace(/\\s+/g,' ').trim() : ''; })()`);
const abrirDoc = async id => { await c.ir('documento.html?id=' + encodeURIComponent(id), 400); await esperar(`document.getElementById('dgdEstado') || document.querySelector('.dgd-vacio') ? true : false`, 8000); await sleep(250); };
const hojaErr = () => c.ev(`(()=>{ const e=document.querySelector('.dgd-velo .dgd-err'); return e && !e.hidden ? e.textContent : ''; })()`);
const firmarEnHoja = async (nombre, dni, tilde) => {
  await c.ev(`(()=>{ const f=document.querySelector('.dgd-velo form'); f.elements.nombre.value=${J(nombre)}; f.elements.dni.value=${J(dni)}; f.elements.ok.checked=${!!tilde}; f.querySelector('[type=submit]').click(); return true; })()`);
  await sleep(700);
};

try {
  /* ── 0. Datos de prueba (modo local) ── */
  await c.vista(true);
  await c.ir('index.html', 300);
  await c.ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bp_digital','1');
    localStorage.setItem('bp_publicadores', ${J(J([{ id: 'pub-gestora', auth_user_id: 'local-pablo', nombre: 'Gestora Prueba', razon_social: 'Gestora Prueba SRL', cuit: '30-11122233-4', tipo: 'gestor', verificado: true, whatsapp: '5491100000000', email: 'pablo@prueba.local' }]))}); true`);
  await como(ANA);
  await c.ir('mensajes.html', 800);
  const ops = await c.ev(`(async()=>{ await BPStore.ready; const D=BPDigital;
    const o1 = await D.abrir({ id:'aviso-1', publicador_id:'pub-gestora', operacion:'mediano', precio:1200, moneda:'USD', titulo:'Dos ambientes con balcón', barrio:'Palermo', direccion:'Gorriti 4800', codigo:'B-101' }, 'Hola, ¿está disponible en noviembre?');
    const o2 = await D.abrir({ id:'aviso-2', publicador_id:'pub-gestora', operacion:'alquiler', precio:900000, moneda:'ARS', titulo:'Tres ambientes', barrio:'Recoleta', direccion:'Arenales 1500', codigo:'B-102' }, 'Hola');
    const o3 = await D.abrir({ id:'aviso-3', publicador_id:'pub-gestora', operacion:'venta', precio:250000, moneda:'USD', titulo:'Piso en venta', barrio:'Palermo', direccion:'Libertador 2000', codigo:'B-103' }, 'Hola');
    const o4 = await D.abrir({ id:'aviso-4', publicador_id:'pub-gestora', operacion:'mediano', precio:1500, moneda:'USD', titulo:'Monoambiente', barrio:'Palermo', direccion:'Thames 1200', codigo:'B-104' }, 'Hola');
    await D.paso(o1, 'solicitud_enviada', null);
    return { o1, o2, o3, o4 }; })()`);
  ok('Ana abre cuatro operaciones y pide avanzar en la primera', ops && ops.o1 && ops.o4, ops);

  /* ── 1. Los modelos del front son los de la migración ── */
  const sql = readFileSync(RAIZ + 'migracion-30-documentos.sql', 'utf8');
  const re = /\('(\w+)', '([^']+)', \$tpl_(\w+)\$([\s\S]*?)\$tpl_\3\$\)/g; const delSql = {}; let m;
  while ((m = re.exec(sql))) delSql[m[1]] = { titulo: m[2], cuerpo: m[4] };
  const delJs = await c.ev('JSON.stringify(Object.fromEntries(Object.entries(BPDocumentos.PLANTILLAS).map(([k,v])=>[k,{titulo:v.titulo,cuerpo:v.cuerpo}])))');
  ok('Modelos del front idénticos a los de la migración 30 (4)', Object.keys(delSql).length === 4 && delJs === JSON.stringify(delSql), Object.keys(delSql).join(', '));
  ok('Cada modelo lleva la leyenda "a validar por el abogado"', Object.values(delSql).every(x => x.cuerpo.includes('Modelo base · a validar por el abogado de BAIREN antes de usar.')));
  ok('Ningún modelo dice "temporario" ni "tradicional" ni "comisión"', Object.values(delSql).every(x => !/temporario|tradicional|comisi[oó]n/i.test(x.cuerpo + x.titulo)));
  const mdh = await c.ev(`BPDocumentos.md('# Título\\n\\n*Sub*\\n\\n> Leyenda\\n\\n## 1. Cláusula\\n\\n- uno\\n- dos\\n\\nTexto con **negrita** y <script>x</script>.')`);
  ok('Markdown simple: títulos, lista, leyenda, negrita y escapado', /<h1>Título<\/h1>/.test(mdh) && /<em>Sub<\/em>/.test(mdh) && /<blockquote>/.test(mdh) && /<li>dos<\/li>/.test(mdh) && /<strong>negrita<\/strong>/.test(mdh) && !/<script>/.test(mdh), mdh.slice(0, 120));
  const h1 = await c.ev(`BPDocumentos.huella('BAIREN · firma')`);
  ok('Huella SHA-256 en el navegador igual a la de la base', h1 === '2cccc7b93ed3bb05cd0d8f3cd91371415fe5672ca37b9727808c7966da9a99d5', h1);

  /* ── 2. Quien publica: un solo chip por momento ── */
  await como(PABLO);
  await abrirOp(ops.o1, true);
  let ch = await chips();
  ok('Solicitud sin responder: lo próximo es responderla; "Preparar…" queda en Más', ch.prim.includes('aceptar_sol') && !ch.prim.some(x => /^ext:doc_/.test(x)) && ch.mas.includes('ext:doc_reserva'), ch);
  await c.ev(`BPDigital.paso(${J(ops.o1)}, 'solicitud_aceptada', null).then(()=>true)`);
  await abrirOp(ops.o1, true);
  ch = await chips();
  const unoDelRiel = x => x.prim.filter(y => /^ext:doc_/.test(y)).length <= 1;
  ok('Solicitud aceptada: un solo chip del riel, "Preparar reserva"; "Preparar contrato" en Más', ch.prim.includes('ext:doc_reserva') && unoDelRiel(ch) && ch.mas.includes('ext:doc_contrato'), ch);
  let sec = await seccion();
  ok('Sección Firmas vacía que guía', sec && /Prepará la reserva o el contrato/.test(sec), sec);

  /* ── 3. Preparar la reserva: dos pasos, Atrás vuelve al paso 1, errores en el diálogo ── */
  const largoHist = await c.ev('history.length');
  await c.ev(`document.querySelector('[data-acc="ext:doc_reserva"]').click(); true`); await sleep(500);
  let dl = await dlg();
  ok('Paso 1 de 2 con fecha de calendario (solo día) y montos con teclado numérico', dl && /1 de 2/.test(dl.t) && dl.tipos.includes('fecha_inicio:date') && dl.tipos.some(x => /^monto:number\/decimal/.test(x)) && dl.vals.monto === '1200', dl);
  await c.foto('doc-01-paso1-celular');
  await llenar({ deposito: '1200' }); await enviarDlg(); await sleep(500);
  dl = await dlg();
  ok('Paso 2 de 2: seña y vencimiento', dl && /2 de 2/.test(dl.t) && 'sena' in dl.vals && 'vence' in dl.vals, dl && dl.t);
  await c.ev('history.back(); true'); await sleep(600);
  dl = await dlg();
  ok('Atrás del celular vuelve al paso 1 con lo cargado', dl && /1 de 2/.test(dl.t) && dl.vals.deposito === '1200', dl && dl.vals);
  await enviarDlg(); await sleep(500);
  const lejos = await c.ev('BP.isoLocal(new Date(Date.now() + 90*864e5))');
  await llenar({ sena: '600', vence: lejos }); await enviarDlg(); await sleep(700);
  dl = await dlg();
  ok('Error de la regla (vence en más de 60 días) se ve en el diálogo', dl && /60 días/.test(dl.err), dl && dl.err);
  const tres = await c.ev('BP.isoLocal(new Date(Date.now() + 3*864e5))');
  await llenar({ vence: tres }); await enviarDlg(); await sleep(1500);
  dl = await dlg();
  ok('Reserva preparada: se cierra el diálogo y avisa "Listo"', !dl && /Listo/.test(await toast()), await toast());
  ok('El historial quedó como antes (sin entradas de los pasos)', (await c.ev('history.length')) >= largoHist && !(await c.ev('history.state && history.state.dgdPaso')), await c.ev('JSON.stringify(history.state)'));
  let docs = await LS('bp_dg_docs');
  const r1 = docs && docs[0];
  ok('Documento guardado: enviado, con texto, huella y partes', r1 && r1.estado === 'enviado' && r1.hash && r1.hash.length === 64 && r1.partes.join() === 'publicador,interesado' && r1.plantilla_tipo === 'reserva', r1 && { estado: r1.estado, titulo: r1.titulo });
  ok('El texto trae los datos (quien publica, inmueble, seña, plazo)', r1 && /Gestora Prueba SRL\*\*, CUIT 30-11122233-4/.test(r1.contenido) && /Gorriti 4800, barrio de Palermo/.test(r1.contenido) && /seña de \*\*USD 600\*\*/.test(r1.contenido) && /USD 1\.200 por mes/.test(r1.contenido) && !/\{\{/.test(r1.contenido));
  ok('Huella del texto correcta', r1 && (await c.ev(`BPDocumentos.huella(${J(r1.contenido)})`)) === r1.hash);
  let hitos = await LS('bp_dg_hitos');
  ok('Paso "documento_generado" en el recorrido', hitos.some(h => h.tipo === 'documento_generado' && h.operacion_id === ops.o1 && h.lado === 'publicador'));
  await sleep(300);
  ch = await chips();
  ok('Ahora un solo chip del riel: "Revisar y firmar" (sin preparar)', ch.prim.includes('ext:doc_firmar') && !ch.prim.concat(ch.mas).some(x => /doc_reserva|doc_contrato/.test(x)) && /Falta tu firma en la reserva/.test(ch.estado), ch);
  sec = await seccion();
  ok('Sección Firmas: la reserva, por firmar', sec && /Reserva de locación/.test(sec) && /Faltan las dos firmas/.test(sec) && /Por firmar/.test(sec), sec);
  await c.ev(`document.querySelector('.ms-info-btn').click(); true`); await sleep(500);
  await c.foto('doc-02-firmas-celular');
  ok('Mensajes en el celular sin scroll horizontal', await sinScroll());
  await c.ev(`(document.querySelector('[data-cerrar-panel]')||{click(){}}).click(); true`); await sleep(300);

  /* ── 4. Quien publica firma en documento.html ── */
  await c.ev(`document.querySelector('[data-acc="ext:doc_firmar"]').click(); true`);
  await sleep(600); await c.esperarCarga(400);
  await esperar(`document.getElementById('dgdEstado') ? true : false`, 8000);
  ok('"Revisar y firmar" abre documento.html en la misma pestaña', /documento\.html\?id=/.test(await c.ev('location.href')));
  let est = await estadoDoc();
  ok('Arriba, el estado en una línea: "Falta tu firma · Después firma quien reserva."', /Falta tu firma/.test(est) && /Después firma quien reserva/.test(est), est);
  ok('Barra fija abajo con un solo botón "Firmar" y la confianza en una línea', /^Firmar Firma con registro de fecha, IP y huella/.test(await barra()) && (await c.ev(`document.querySelectorAll('#dgdBarra button').length`)) === 1, await barra());
  ok('El registro de firmas y la huella van plegados', await c.ev(`!document.getElementById('dgdRegistro').open`));
  ok('Título del documento', (await c.ev(`document.querySelector('.dgd-texto h1').textContent`)) === 'Reserva de locación');
  await c.foto('doc-03-documento-celular');
  await c.foto('doc-03b-documento-celular-completo', true);
  ok('documento.html en el celular sin scroll horizontal', await sinScroll());
  await c.ev(`document.querySelector('[data-firmar]').click(); true`); await sleep(500);
  ok('"Firmar" abre una hoja corta (con entrada en el historial)', await c.ev(`!!document.querySelector('.dgd-velo.on .dgd-sheet') && !!(history.state && history.state.dgdHoja)`));
  ok('DNI con teclado numérico y nombre con autocompletar', await c.ev(`(()=>{ const f=document.querySelector('.dgd-velo form'); return f.elements.dni.inputMode==='numeric' && f.elements.nombre.autocomplete==='name'; })()`));
  await c.foto('doc-04-hoja-firma-celular');
  await c.ev('history.back(); true'); await sleep(500);
  ok('Atrás del celular cierra la hoja', await c.ev(`!document.querySelector('.dgd-velo') && /documento\\.html/.test(location.href)`));
  await c.ev(`document.querySelector('[data-firmar]').click(); true`); await sleep(500);
  await firmarEnHoja('Ana', '28999888', true);
  ok('Error: nombre sin apellido', /nombre y apellido/.test(await hojaErr()), await hojaErr());
  await firmarEnHoja('Ana Prueba', '12', true);
  ok('Error: DNI mal escrito', /Revisá el DNI/.test(await hojaErr()), await hojaErr());
  await firmarEnHoja('Ana Prueba', '28.999.888', false);
  ok('Error: falta la casilla "Leí el documento completo"', /leíste el documento/.test(await hojaErr()), await hojaErr());
  await firmarEnHoja('Ana Prueba', '28.999.888', true); await sleep(800);
  est = await estadoDoc();
  ok('Firmó quien publica: "Firmaste · Falta la firma de quien reserva." y sin barra', /Firmaste/.test(est) && /Falta la firma de quien reserva/.test(est) && !(await barra()), est);
  ok('Aviso corto "Listo"', /Listo/.test(await toast()), await toast());
  let firmas = await LS('bp_dg_firmas');
  ok('Firma guardada con nombre, DNI normalizado, huella y fecha', firmas.length === 1 && firmas[0].lado === 'publicador' && firmas[0].dni === '28999888' && firmas[0].hash === r1.hash);
  await c.ev(`document.getElementById('dgdRegistro').open = true; true`); await sleep(200);
  const reg = await c.ev(`document.getElementById('dgdRegistro').textContent.replace(/\\s+/g,' ')`);
  ok('Registro desplegado: quién, cuándo, huella recortada y "verificada"', /Quien publica/.test(reg) && /Ana Prueba · DNI 28\.999\.888/.test(reg) && /huella [0-9a-f]{8}…[0-9a-f]{8}/.test(reg) && /Verificada en este navegador/.test(reg) && /Falta firmar/.test(reg), reg.slice(0, 260));
  await c.foto('doc-05-registro-celular');

  /* ── 5. Quien busca firma: firmado por las dos partes ── */
  await como(ANA);
  await abrirOp(ops.o1, true);
  ch = await chips();
  ok('Ana: un chip "Revisar y firmar" y el estado "Ya firmó la otra parte…"', ch.prim.includes('ext:doc_firmar') && /Ya firmó la otra parte/.test(ch.estado), ch);
  sec = await seccion();
  ok('Ana: Firmas dice "Firmó quien publica · falta tu firma"', sec && /Firmó quien publica · falta tu firma/.test(sec), sec);
  ok('Ana: no ve "Preparar"', !ch.prim.concat(ch.mas).some(x => /doc_reserva|doc_contrato/.test(x)));
  await abrirDoc(r1.id);
  est = await estadoDoc();
  ok('Ana: "Falta tu firma · Ya firmó quien publica." y no ve "Anular"', /Falta tu firma/.test(est) && /Ya firmó quien publica/.test(est) && !(await c.ev(`!!document.querySelector('[data-anular]')`)), est);
  await c.ev(`document.querySelector('[data-firmar]').click(); true`); await sleep(500);
  await firmarEnHoja('Ana García', '30.111.222', true); await sleep(800);
  est = await estadoDoc();
  ok('Reserva "Firmado por las dos partes"', /Firmado por las dos partes/.test(est), est);
  docs = await LS('bp_dg_docs');
  ok('Documento firmado con fecha', docs[0].estado === 'firmado' && !!docs[0].firmado_en);
  hitos = await LS('bp_dg_hitos');
  ok('Paso "documento_firmado" (y no "contrato_firmado")', hitos.some(h => h.tipo === 'documento_firmado' && h.operacion_id === ops.o1) && !hitos.some(h => h.tipo === 'contrato_firmado'));
  let cargos = await LS('bp_dg_cargos');
  ok('Cargo simulado "Contrato digital con firma" USD 40, lo paga el propietario', cargos.some(x => x.concepto === 'Contrato digital con firma' && +x.monto === 40 && x.paga === 'propietario' && x.estado === 'simulado'), cargos.map(x => x.concepto + ' ' + x.monto + ' ' + x.paga));
  ok('A quien busca no se le cobra nada', !cargos.some(x => x.paga === 'interesado'));
  await c.foto('doc-06-firmado-celular');

  /* ── 6. Contrato: chip único, prellenado con la reserva; anular y volver a preparar ── */
  await como(PABLO);
  await abrirOp(ops.o1, true);
  ch = await chips();
  ok('Con la reserva firmada, el chip es "Preparar contrato" (y no hay "Preparar reserva")', ch.prim.includes('ext:doc_contrato') && !ch.prim.concat(ch.mas).includes('ext:doc_reserva'), ch);
  await c.ev(`document.querySelector('[data-acc="ext:doc_contrato"]').click(); true`); await sleep(500);
  dl = await dlg();
  ok('Contrato paso 1 prellenado con los datos de la reserva', dl && /Preparar el contrato · 1 de 2/.test(dl.t) && dl.vals.deposito === '1200' && dl.vals.plazo_meses === '6', dl && dl.vals);
  await enviarDlg(); await sleep(500);
  dl = await dlg();
  ok('Contrato paso 2 (mediano plazo): servicios y ajuste', dl && 'servicios' in dl.vals && 'ajuste' in dl.vals && !('registro' in dl.vals), dl && dl.vals);
  await llenar({ servicios: 'expensas e internet' }); await enviarDlg(); await sleep(1500);
  docs = await LS('bp_dg_docs');
  let c1 = docs.find(x => x.tipo === 'contrato');
  ok('Contrato de mediano plazo preparado (modelo según la línea)', c1 && c1.plantilla_tipo === 'contrato_mediano' && /Servicios incluidos en el precio: expensas e internet\./.test(c1.contenido) && /El precio se mantiene fijo/.test(c1.contenido), c1 && c1.titulo);
  hitos = await LS('bp_dg_hitos');
  ok('Pasos "documento_generado" y "contrato_generado"', hitos.filter(h => h.operacion_id === ops.o1 && h.tipo === 'contrato_generado').length === 1);
  await abrirDoc(c1.id);
  await c.ev(`document.getElementById('dgdRegistro').open = true; true`); await sleep(150);
  ok('Quien publica ve "Anular el documento" plegado en el registro', await c.ev(`!!document.querySelector('#dgdRegistro [data-anular]')`));
  await c.ev(`document.querySelector('[data-anular]').click(); true`); await sleep(500);
  ok('Anular pide confirmación en una hoja', await c.ev(`/Anular el documento/.test((document.querySelector('.dgd-velo .dgd-sheet-t')||{}).textContent||'')`));
  await c.ev(`(()=>{ const f=document.querySelector('.dgd-velo form'); f.elements.motivo.value='Cambió la fecha'; f.querySelector('[type=submit]').click(); return true; })()`); await sleep(1000);
  est = await estadoDoc();
  ok('Contrato anulado: "Anulado · Motivo: Cambió la fecha" y sin barra', /Anulado/.test(est) && /Cambió la fecha/.test(est) && !(await barra()), est);
  ok('Un anulado no se firma', /anulado/.test(await c.ev(`BPDocumentos.firmar(${J(c1.id)}, 'Ana Prueba', '28999888').then(()=>'entró', e=>e.message)`)));
  await abrirOp(ops.o1, true);
  ch = await chips();
  /* Con "contrato_generado" en el recorrido, mensajes.html muestra sus pasos manuales ("Contrato firmado", "Cerrar",
     "Reserva") y el chip del riel pasa a Más: el informe trae el cambio de mensajes.html para ordenarlo. */
  ok('Anulado: vuelve "Preparar contrato" (en Próximo paso o en Más)', ch.prim.concat(ch.mas).includes('ext:doc_contrato') && !ch.prim.concat(ch.mas).includes('ext:doc_reserva'), ch);
  const c2id = await c.ev(`BPDocumentos.generar(${J(ops.o1)}, 'contrato', { fecha_inicio: '2026-11-01', plazo_meses: 6, monto: 1200, moneda: 'USD', deposito: 1200, servicios: 'expensas e internet' })`);
  ok('Se prepara otro contrato', typeof c2id === 'string' && !c2id.startsWith('EXC'), c2id);
  /* Identidad: si el módulo de identidad dice que no está verificada, no se firma */
  await abrirDoc(c2id);
  const idn = await c.ev(`(async()=>{ window.BPIdentidad = { estado: async () => 'pendiente' }; const j = await BPDocumentos.detalle(${J(c2id)}); const e = await BPDocumentos.firmar(${J(c2id)}, 'Ana Prueba', '28999888').then(()=>'entró', x=>x.message); delete window.BPIdentidad; return { req: j.identidad_requerida, ok: j.identidad_ok, e }; })()`);
  ok('Identidad sin verificar (módulo presente): no firma', idn && idn.req && !idn.ok && /verificá tu identidad/.test(idn.e), idn);
  await c.ev(`document.querySelector('[data-firmar]').click(); true`); await sleep(500);
  await firmarEnHoja('Ana Prueba', '28999888', true); await sleep(600);
  await como(ANA);
  await abrirDoc(c2id);
  await c.ev(`document.querySelector('[data-firmar]').click(); true`); await sleep(500);
  await firmarEnHoja('Ana García', '30111222', true); await sleep(900);
  est = await estadoDoc();
  ok('Contrato firmado por las dos partes', /Firmado por las dos partes/.test(est), est);
  const op1 = (await LS('bp_dg_ops')).find(o => o.id === ops.o1);
  ok('La operación pasa a la etapa Contrato con el total (USD 7.200, 6 meses)', op1.etapa === 'contrato' && +op1.monto_contrato === 7200 && +op1.plazo_meses === 6, { etapa: op1.etapa, monto: op1.monto_contrato });
  hitos = await LS('bp_dg_hitos');
  ok('Pasos "documento_firmado" (2) y "contrato_firmado" (1)', hitos.filter(h => h.operacion_id === ops.o1 && h.tipo === 'documento_firmado').length === 2 && hitos.filter(h => h.operacion_id === ops.o1 && h.tipo === 'contrato_firmado').length === 1);
  await abrirOp(ops.o1, true);
  ch = await chips();
  ok('Contrato firmado: ya no hay chips del riel', !ch.prim.concat(ch.mas).some(x => /^ext:doc_/.test(x)), ch);

  /* ── 7. Otras líneas y reglas ── */
  await como(PABLO);
  await c.ir('mensajes.html', 600);
  const otros = await c.ev(`(async()=>{
    const g = (op, tipo, d) => BPDocumentos.generar(op, tipo, d).then(id => ({ id }), e => ({ e: e.message }));
    const venta = await g(${J(ops.o3)}, 'reserva', { fecha_inicio: '2026-11-01', plazo_meses: 6, monto: 1000, sena: 100, vence: new Date(Date.now()+864e5).toISOString() });
    const boleto = await g(${J(ops.o1)}, 'boleto', {});
    const sinAjuste = await g(${J(ops.o2)}, 'contrato', { fecha_inicio: '2026-12-01', plazo_meses: 24, monto: 900000, moneda: 'ARS' });
    const largo = await g(${J(ops.o2)}, 'contrato', { fecha_inicio: '2026-12-01', plazo_meses: 24, monto: 900000, moneda: 'ARS', ajuste: 'IPC cada 6 meses', garantia: 'seguro de caución' });
    const corto0 = await g(${J(ops.o4)}, 'contrato', { fecha_inicio: '2026-11-01', plazo_meses: 2, monto: 1500 });
    const corto = await g(${J(ops.o4)}, 'contrato', { fecha_inicio: '2026-11-01', plazo_meses: 2, monto: 1500, registro: 'RAT-12345', huespedes: 2 });
    const docs = JSON.parse(localStorage.getItem('bp_dg_docs'));
    const op4 = JSON.parse(localStorage.getItem('bp_dg_ops')).find(o => o.id === ${J(ops.o4)});
    return { venta, boleto, sinAjuste, largo: docs.find(x => x.id === largo.id), corto: docs.find(x => x.id === corto.id), linea4: op4.linea, corto0 }; })()`);
  ok('Venta: no hay reserva ni contrato (corredor y escribano)', /escribano/.test(otros.venta.e || ''), otros.venta);
  ok('Boleto: no', /escribano/.test(otros.boleto.e || ''), otros.boleto);
  ok('Largo plazo sin ajuste: pide el ajuste', /ajusta/.test(otros.sinAjuste.e || ''), otros.sinAjuste);
  ok('Largo plazo en pesos, con ajuste y garantía propia', otros.largo && otros.largo.plantilla_tipo === 'contrato_tradicional' && /\$ 900\.000 por mes/.test(otros.largo.contenido) && /IPC cada 6 meses\./.test(otros.largo.contenido) && /ofrece como garantía: seguro de caución/.test(otros.largo.contenido) && /30 de noviembre de 2028/.test(otros.largo.contenido));
  ok('Mediano de 2 meses sin registro: pide el de la Ley 6255', /Ley 6255/.test(otros.corto0.e || ''), otros.corto0);
  ok('Estadía corta: modelo turístico, total y registro; la operación pasa a estadía corta', otros.corto && otros.corto.plantilla_tipo === 'contrato_temporario' && otros.linea4 === 'temporario' && /USD 1\.500 por mes \(USD 3\.000 por toda la estadía\)/.test(otros.corto.contenido) && /RAT-12345/.test(otros.corto.contenido) && !/temporario/i.test(otros.corto.contenido));

  /* ── 8. Plataforma (en modo local, cualquiera con sesión es curadora): ve, no firma ── */
  await como(CARLA);
  await abrirDoc(otros.largo.id);
  est = await estadoDoc();
  ok('Plataforma ve el documento sin barra de firma', /Por firmar/.test(est) && !(await barra()), est);

  /* ── 9. Compu (1440×900) e impresión ── */
  await c.vista(false);
  await como(PABLO);
  await abrirOp(ops.o2, false);
  await c.foto('doc-07-mensajes-compu');
  ok('Mensajes en la compu sin scroll horizontal', await sinScroll());
  await abrirDoc(otros.largo.id);
  await c.foto('doc-08-documento-compu');
  ok('documento.html en la compu sin scroll horizontal', await sinScroll());
  await c.ev(`document.querySelector('[data-firmar]').click(); true`); await sleep(500);
  await c.foto('doc-09-hoja-firma-compu');
  await c.ev(`document.querySelector('.dgd-velo [data-cerrar]').click(); true`); await sleep(500);
  ok('La hoja se cierra con la X y deja el historial como estaba', await c.ev(`!document.querySelector('.dgd-velo') && !(history.state && history.state.dgdHoja)`));
  await c.ev(`window.dispatchEvent(new Event('beforeprint')); true`);
  await c.send('Emulation.setEmulatedMedia', { media: 'print' }); await sleep(300);
  const imp = await c.ev(`(()=>{ const vis = s => { const e=document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }; return { header: vis('#pHeader .navbar') || vis('.navbar'), barra: vis('#dgdBarra'), estado: vis('#dgdEstado'), hoja: vis('.dgd-hoja'), registro: document.getElementById('dgdRegistro').open, huella: vis('.dgd-solo-print') }; })()`);
  ok('Para imprimir: solo el documento y el registro de firmas (con la huella completa)', imp && !imp.header && !imp.barra && !imp.estado && imp.hoja && imp.registro && imp.huella, imp);
  await c.foto('doc-10-impresion', true);
  const pdf = await c.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  if (pdf.result && pdf.result.data) writeFileSync(OUT + 'doc-11-contrato.pdf', Buffer.from(pdf.result.data, 'base64'));
  ok('Guardar como PDF (A4)', !!(pdf.result && pdf.result.data && pdf.result.data.length > 10000), OUT + 'doc-11-contrato.pdf');
  await c.send('Emulation.setEmulatedMedia', { media: '' });
  await c.ev(`window.dispatchEvent(new Event('afterprint')); true`);

  /* ── 10. Sin el interruptor: "Muy pronto"; sin id: vacío que guía ── */
  await c.ev(`document.cookie = 'bp_cerrado=1; path=/; max-age=120'; true`);
  await c.ir('documento.html?digital=0', 600);
  ok('Sin BAIREN digital: "Muy pronto"', /muy pronto/i.test(await c.ev(`document.querySelector('main').textContent`)));
  await c.ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; localStorage.setItem('bp_digital','1'); true`);
  await c.ir('documento.html', 600);
  ok('Sin documento: vacío que lleva a Mensajes', await c.ev(`!!document.querySelector('.dgd-vacio a[href="mensajes.html"]')`));
  await abrirDoc('no-existe');
  ok('Documento inexistente: error claro', /no existe/i.test(await c.ev(`document.querySelector('main').textContent`)));

  /* ── 11. Consola ── */
  const errs = c.errores.slice(), cons = c.consola.filter(x => /^error/.test(x));
  ok('Sin errores de consola', !errs.length && !cons.length, errs.concat(cons).slice(0, 4));
  if (c.consola.length) console.log('  (avisos de consola: ' + c.consola.length + ')\n    ' + c.consola.slice(0, 6).join('\n    '));
} catch (e) {
  ok('La prueba corrió entera', false, String(e && e.stack || e).slice(0, 400));
} finally {
  await c.cerrar();
}
console.log('\ndocumentos: ' + (fallas ? 'FALLA ' : 'OK ') + (res.length - fallas) + '/' + res.length + ' · capturas en ' + OUT);
process.exit(fallas ? 1 : 0);
