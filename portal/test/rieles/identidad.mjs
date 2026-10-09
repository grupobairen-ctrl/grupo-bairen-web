/* Pruebas del riel de identidad (migración 29) en modo local, sin base.
   Uso, desde la raíz del repo:
     PORT=8201 node portal/test/dev-server.mjs &
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9401 --user-data-dir=/tmp/bp-chrome-identidad about:blank &
     BP_PUERTO=8201 BP_CHROME=9401 BP_CAPTURAS=/tmp/bp-identidad node portal/test/rieles/identidad.mjs
   Recorre: la verificación de quien busca (tres fotos, revisar y mandar), la curación (rechazar con motivo, aprobar), el
   reintento, la acción "Verificá tu identidad" en Mensajes, el "Verificado" que ve quien publica, el total por mes y
   "Quién ofrece" de la ficha y el domicilio legal del panel. En el celular (390×844) y en la compu (1440×900), sin errores
   de consola y sin scroll horizontal. Sale con 1 si algo falla. */
import { conectar, sleep, SP } from '../flujos/cdp.mjs';

const FOTO = n => SP + '/fotos-prueba/foto' + n + '.jpg';
const ANA = { id: 'local-ana', email: 'ana@prueba.local', perfil: 'busca' };
const BETO = { id: 'local-beto', email: 'beto@prueba.local', perfil: 'busca' };
const CURA = { id: 'local-cura', email: 'cura@prueba.local', perfil: 'busca' };
const PABLO = { id: 'local-pablo', email: 'pablo@prueba.local', perfil: 'profesional' };
const PUBS = [
  { id: 'pub-gestora', auth_user_id: 'local-pablo', slug: 'gestora-prueba', tipo: 'gestor', nombre: 'Gestora Prueba', razon_social: 'Gestora Prueba SRL', cuit: '30111222334', verificado: true, whatsapp: '5491100000000', email: 'pablo@prueba.local', zonas: ['Palermo'], created_at: '2026-10-01T00:00:00Z' },
  { id: 'pub-dueno', auth_user_id: 'local-dora', slug: 'dora-p', tipo: 'dueno', nombre: 'Dora P.', razon_social: 'Dora Pérez', cuit: '27223334445', domicilio_legal: 'Thames 1500, CABA', verificado: true, whatsapp: '5491100000001', zonas: ['Palermo'], created_at: '2026-10-01T00:00:00Z' }
];
const AVISO = (id, pub, extra) => Object.assign({ id, codigo: 'BA-' + id.toUpperCase(), slug: id, publicador_id: pub, operacion: 'alquiler', tipo: 'Departamento', titulo: 'Dos ambientes en Palermo', direccion: 'Gorriti 4800', barrio: 'Palermo', zona: 'Palermo', ciudad: 'Capital Federal', precio: 850000, moneda: 'ARS', expensas: 95000, m2_total: 48, ambientes: 2, banos: 1, amenities: [], caracteristicas: [], fotos: [], descripcion: 'Dos ambientes luminosos.', estado: 'disponible', estado_curacion: 'publicado', publicado_en: '2026-10-05T12:00:00Z', created_at: '2026-10-05T12:00:00Z' }, extra || {});

const r = []; let falla = 0;
const ok = (caso, cond, det) => { r.push({ caso, ok: !!cond, det: det == null ? '' : String(det).slice(0, 200) }); if (!cond) falla++; console.log((cond ? 'OK  ' : 'XX  ') + caso + (det != null && !cond ? ' | ' + String(det).slice(0, 200) : '')); };

const c = await conectar();
const ev = c.ev;
const ses = u => ev(`localStorage.setItem('bp_user', ${JSON.stringify(JSON.stringify(u))}); localStorage.setItem('bp_digital','1'); true`);
const sinScroll = async nombre => { const x = await ev('document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth : 0'); ok(nombre + ': sin scroll horizontal', !x, x); };
const texto = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent || ''`);
const click = async (sel, ms = 600) => { const x = await ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return 'no está'; b.click(); return true})()`); await sleep(ms); return x; };
const subir = async (n) => { await c.archivos('#idnArchivo', [FOTO(n)]); for (let i = 0; i < 40; i++) { await sleep(150); if (await ev('!!document.querySelector(".idn-toma.con-foto img")')) break; } await sleep(250); };
const estadoLocal = u => ev(`(JSON.parse(localStorage.getItem('bp_dg_identidad')||'{}')[${JSON.stringify(u)}]||{}).estado || 'sin'`);

/* Las tres fotos, revisar y mandar (quien está en la sesión) */
async function verificar(movil, pref, datos){
  await c.ir('cuenta-verificacion.html' + (datos.volver ? '?volver=' + encodeURIComponent(datos.volver) : ''), 1200);
  if (pref) { await c.foto(pref + '-0-inicio'); await sinScroll(pref + ' inicio'); }
  ok((pref || 'verificar') + ': un solo botón principal', await ev('document.querySelectorAll(".idn-acc .p-btn-fill").length') === 1);
  await click('[data-empezar]');
  ok((pref || 'verificar') + ': paso 1 de 3', /Paso 1 de 3/.test(await texto('.idn-prog-n')), await texto('.idn-prog-n'));
  if (pref) await c.foto(pref + '-1-frente');
  for (let i = 0; i < 3; i++) {
    await subir(i + 1);
    if (pref && i === 0) await c.foto(pref + '-1b-frente-con-foto');
    await click('[data-seguir]', 500);
    if (datos.probarAtras && i === 0) {
      await ev('history.back(); true'); await sleep(500);
      ok('Atrás del celular: vuelve al paso 1 con la foto', /Paso 1 de 3/.test(await texto('.idn-prog-n')) && await ev('!!document.querySelector(".idn-toma.con-foto img")'), await texto('.idn-prog-n'));
      await click('[data-seguir]', 500);
    }
  }
  ok((pref || 'verificar') + ': revisar y mandar', /Revisá y mandá/.test(await texto('#idnTit')), await texto('#idnTit'));
  if (pref) { await c.foto(pref + '-4-revisar', true); await sinScroll(pref + ' revisar'); }
  if (datos.probarAtras) {
    await ev(`document.getElementById('idnForm').elements.nombre.value = 'Anita'; true`);
    await ev('history.back(); true'); await sleep(500);
    ok('Atrás desde revisar: paso 3', /Paso 3 de 3/.test(await texto('.idn-prog-n')), await texto('.idn-prog-n'));
    await click('[data-seguir]', 500);
    ok('Atrás no pierde lo escrito', await ev('document.getElementById("idnForm").elements.nombre.value') === 'Anita');
  }
  return true;
}
async function llenarYMandar(d){
  await ev(`(()=>{const f=document.getElementById('idnForm'); f.elements.nombre.value=${JSON.stringify(d.nombre || '')}; f.elements.apellido.value=${JSON.stringify(d.apellido || '')}; f.elements.dni.value=${JSON.stringify(d.dni || '')}; f.elements.acepto.checked=${!!d.acepto}; return true})()`);
  await click('[data-mandar]', 1500);
}

try {
  /* ── preparación ── */
  await c.ir('index.html', 300);
  await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bp_publicadores', ${JSON.stringify(JSON.stringify(PUBS))}); localStorage.setItem('bp_avisos', ${JSON.stringify(JSON.stringify([AVISO('av-ars', 'pub-gestora'), AVISO('av-usd', 'pub-dueno', { precio: 1450, moneda: 'USD', expensas: 120000, titulo: 'Tres ambientes con balcón' })]))}); true`);

  /* ── 1. Sin la llave de BAIREN digital: muy pronto ── */
  await c.vista(true);
  await ev(`localStorage.setItem('bp_user', ${JSON.stringify(JSON.stringify(ANA))}); localStorage.removeItem('bp_digital'); document.cookie = 'bp_cerrado=1; path=/; max-age=120'; true`);
  await c.ir('cuenta-verificacion.html', 900);
  ok('Apagado: muy pronto', /Muy pronto/.test(await texto('#idnCaja')), await texto('#idnCaja'));
  await ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; true`);

  /* ── 2. Ana se verifica (celular) ── */
  await ses(ANA);
  await verificar(true, 'm-ana', { volver: 'mensajes.html', probarAtras: true });
  await llenarYMandar({ nombre: 'Ana', apellido: 'Prueba', dni: '30.111.222', acepto: false });
  ok('Sin consentimiento no se manda', await estadoLocal('local-ana') === 'sin' && /de acuerdo/.test(await ev('(document.querySelector(".p-err-campo:not([hidden])")||{}).textContent||""')), await ev('(document.querySelector(".p-err-campo")||{}).textContent'));
  await llenarYMandar({ nombre: 'Ana', apellido: 'Prueba', dni: '30.1', acepto: true });
  ok('Documento mal escrito no se manda', await estadoLocal('local-ana') === 'sin');
  await llenarYMandar({ nombre: 'Ana', apellido: 'Prueba', dni: '30.111.222', acepto: true });
  ok('Ana manda: queda en revisión', await estadoLocal('local-ana') === 'pendiente' && /La estamos revisando/.test(await texto('#idnTit')), await texto('#idnCaja'));
  await sleep(400);
  ok('Al mandar, el historial vuelve al principio', await ev('history.state && history.state.prof === 0 && history.state.idn == null'), await ev('JSON.stringify(history.state)'));
  ok('En revisión: estado en una línea arriba', /En revisión/.test(await texto('.idn-estado')), await texto('.idn-estado'));
  await c.foto('m-ana-5-pendiente'); await sinScroll('pendiente');
  ok('Ana no ve fotos guardadas sin resolver (la cola tiene una)', await ev('JSON.parse(localStorage.getItem("bp_dg_identidad_cola")||"[]").filter(x=>x.estado==="pendiente").length') === 1);
  ok('Ana no se resuelve sola', /otra persona del equipo/.test(await ev(`BPIdentidad.resolver(JSON.parse(localStorage.getItem("bp_dg_identidad_cola"))[0].id, true).then(()=>'entró', e=>e.message)`)));

  /* ── 3. Curación: rechazar con motivo (compu) ── */
  await c.vista(false);
  await ses(CURA);
  await c.ir('curacion.html#identidad', 1800);
  ok('Curación: pestaña Identidad', await ev('!document.querySelector(".p-tabs2 [data-t=identidad]").hidden && document.querySelector(".p-tabs2 [data-t=identidad]").classList.contains("on")'));
  ok('Curación: una tarjeta con tres fotos', await ev('document.querySelectorAll(".idn-cur").length') === 1 && await ev('document.querySelectorAll(".idn-cur img").length') === 3);
  ok('Curación: nombre y documento', /Ana Prueba/.test(await texto('.idn-cur')) && /30\.111\.222/.test(await texto('.idn-cur')), await texto('.idn-cur .m'));
  await c.foto('d-curacion-identidad', true); await sinScroll('curación compu');
  await click('.idn-cur [data-no]', 600);
  ok('Curación: no rechaza sin motivo', await estadoLocal('local-ana') === 'pendiente');
  await ev(`document.querySelector('.idn-cur textarea').value = 'No se lee el número del documento.'; true`);
  await click('.idn-cur [data-no]', 1200);
  ok('Curación: rechazada con motivo', await estadoLocal('local-ana') === 'rechazada');
  ok('Curación: las fotos se borran al resolver', await ev('JSON.parse(localStorage.getItem("bp_dg_identidad_cola")).every(x => x.estado === "pendiente" || (!x.frente && !x.dorso && !x.selfie && x.archivos_borrados_en))'));
  ok('Curación: la cola queda vacía', /No hay identidades/.test(await texto('#out')), await texto('#out'));

  /* ── 4. Ana ve el motivo y reintenta ── */
  await c.vista(true);
  await ses(ANA);
  await c.ir('cuenta-verificacion.html', 1000);
  ok('Ana ve el rechazo con el motivo y "Reintentar"', /No se lee el número/.test(await texto('.idn-estado')) && /Reintentar/.test(await texto('[data-empezar]')), await texto('.idn-estado'));
  await c.foto('m-ana-6-rechazada');
  await verificar(true, null, {});
  ok('Reintento: los datos vuelven completos', await ev('document.getElementById("idnForm").elements.dni.value') === '30111222');
  await llenarYMandar({ nombre: 'Ana', apellido: 'Prueba', dni: '30111222', acepto: true });
  ok('Reintento: en revisión otra vez', await estadoLocal('local-ana') === 'pendiente');

  /* ── 5. Curación aprueba (celular) ── */
  await ses(CURA);
  await c.ir('curacion.html#identidad', 1600);
  ok('Curación: reintento marcado con el motivo anterior', /Reintento/.test(await texto('.idn-cur')) && /No se lee/.test(await texto('.p-cur-anterior')));
  await c.foto('m-curacion-identidad', true); await sinScroll('curación celular');
  await click('.idn-cur [data-ok]', 1200);
  ok('Curación: aprobada', await estadoLocal('local-ana') === 'verificada');
  await ses(ANA);
  await c.ir('cuenta-verificacion.html', 1000);
  ok('Ana verificada, con fecha', /Verificada/.test(await texto('.idn-estado')) && /desde el/.test(await texto('.idn-estado')), await texto('.idn-estado'));
  ok('BPDigital.identidadVerificada() da true', await ev('BPDigital.identidadVerificada()') === true);
  ok('BPDigital.identidad() da { estado, verificada }', await ev('BPDigital.identidad().then(x => x.estado + "|" + x.verificada)') === 'verificada|true');
  await c.foto('m-ana-7-verificada'); await sinScroll('verificada');

  /* ── 6. Mensajes: la acción en "Más" para quien no se verificó ── */
  await ses(BETO);
  await c.ir('mensajes.html', 1200);
  const opB = await ev(`BPDigital.abrir({ id:'av-ars', publicador_id:'pub-gestora', operacion:'alquiler', precio:850000, moneda:'ARS', titulo:'Dos ambientes en Palermo', barrio:'Palermo' }, 'Hola')`);
  await c.ir('mensajes.html?op=' + encodeURIComponent(opB), 1800);
  ok('Beto: "Verificá tu identidad" en Más', await ev('Array.from(document.querySelectorAll("#msMasPop [data-acc]")).some(b => /Verificá tu identidad/.test(b.textContent))'), await ev('Array.from(document.querySelectorAll("#msAcc [data-acc]")).map(b=>b.textContent).join(" | ")'));
  ok('Beto: no está entre los botones principales', !(await ev('Array.from(document.querySelectorAll(".ms-acc-fila > [data-acc]")).some(b => /identidad/.test(b.textContent))')));
  await click('#msMasBtn', 400); await c.foto('m-mensajes-mas');
  await click('#msMasPop [data-acc="ext:identidad"]', 1500);
  ok('Beto: lleva a la verificación con la vuelta', /cuenta-verificacion\.html\?volver=mensajes\.html%3Fop%3D/.test(await ev('location.href')), await ev('location.href'));
  await ses(ANA);
  await c.ir('mensajes.html', 1200);   /* la sesión nueva se toma al cargar la página */
  const opA = await ev(`BPDigital.abrir({ id:'av-ars', publicador_id:'pub-gestora', operacion:'alquiler', precio:850000, moneda:'ARS', titulo:'Dos ambientes en Palermo', barrio:'Palermo' }, 'Hola, soy Ana')`);
  await c.ir('mensajes.html?op=' + encodeURIComponent(opA), 1800);
  ok('Ana y Beto: operaciones distintas', opA && opA !== opB, opA + ' ' + opB);
  ok('Ana verificada: sin la acción', !(await ev('Array.from(document.querySelectorAll("#msAcc [data-acc]")).some(b => /identidad/i.test(b.textContent))')));
  await ses(PABLO);
  await c.ir('mensajes.html?op=' + encodeURIComponent(opA), 1800);
  ok('Pablo (publica) ve a Ana "Verificado"', await ev('!!document.querySelector("[data-sec=contacto] .ms-verif")'), await texto('[data-sec=contacto]'));
  await c.ir('mensajes.html?op=' + encodeURIComponent(opB), 1800);
  ok('Pablo ve a Beto "Sin verificar"', await ev('!!document.querySelector("[data-sec=contacto] .ms-sinverif")'));

  /* ── 7. Panel: domicilio legal (Pablo, gestora) ── */
  await c.ir('panel.html#cuenta', 1800);
  ok('Panel: campo Domicilio legal', await ev('!!document.getElementById("idnDom")'));
  await ev(`document.getElementById('idnDom').value = 'abc'; true`); await click('[data-dom] button', 600);
  ok('Panel: domicilio muy corto no se guarda, con el error al lado', !(await ev('(JSON.parse(localStorage.getItem("bp_publicadores")).find(p=>p.id==="pub-gestora")||{}).domicilio_legal')) && await ev('!document.getElementById("idnDomE").hidden'));
  await ev(`document.getElementById('idnDom').value = '  Av. Santa Fe 1234,  piso 5, CABA '; true`); await click('[data-dom] button', 800);
  ok('Panel: domicilio guardado (y el error se va)', await ev('(JSON.parse(localStorage.getItem("bp_publicadores")).find(p=>p.id==="pub-gestora")||{}).domicilio_legal') === 'Av. Santa Fe 1234, piso 5, CABA' && await ev('document.getElementById("idnDomE").hidden'));
  await sleep(2800); await ev('document.querySelector("[data-dom]").scrollIntoView({ block: "center" }); true'); await sleep(300);
  await c.foto('m-panel-domicilio'); await sinScroll('panel');

  /* ── 8. Ficha: total por mes y Quién ofrece ── */
  await ses(BETO);
  for (const movil of [true, false]) {
    await c.vista(movil); const p = movil ? 'm' : 'd';
    await c.ir('propiedad.html?id=av-ars', 2000);
    ok(p + ' ficha en pesos: total por mes sumado', /Total por mes\s*\$ 945\.000/.test(await texto('.idn-total')), await texto('.idn-total'));
    ok(p + ' ficha: "Quién ofrece" plegado', await ev('document.getElementById("idnOfe").hidden && document.querySelector("[data-ofe]").getAttribute("aria-expanded") === "false"'));
    await click('[data-ofe]', 800);
    const ofe = await texto('#idnOfe');
    ok(p + ' ficha empresa: razón social, CUIT y domicilio', /Gestora Prueba SRL/.test(ofe) && /30-11122233-4/.test(ofe) && /Santa Fe 1234/.test(ofe), ofe);
    await c.fotoDe(p + '-ficha-ofe', '#contacto', 10); await sinScroll(p + ' ficha');
    await c.ir('propiedad.html?id=av-usd', 2000);
    ok(p + ' ficha en dólares: las dos partes', /Total por mes\s*USD 1\.450 \+ \$ 120\.000 de expensas/.test(await texto('.idn-total')), await texto('.idn-total'));
    await click('[data-ofe]', 800);
    const ofe2 = await texto('#idnOfe');
    ok(p + ' ficha dueño directo: nombre público, CUIT y domicilio, sin razón social', /Dora P\./.test(ofe2) && !/Pérez/.test(ofe2) && /27-22333444-5/.test(ofe2) && /Thames 1500/.test(ofe2), ofe2);
  }
  await c.vista(true);
  await c.ir('propiedad.html?id=ejemplo-alquiler-nunez', 2000);
  await click('[data-ofe]', 800);
  ok('Ficha sin datos: "pedilos por mensaje"', /pedilos por mensaje/.test(await texto('#idnOfe')), await texto('#idnOfe'));

  /* ── 9. La compu: la verificación ── */
  await c.vista(false);
  await ses(BETO);
  await verificar(false, 'd-beto', { volver: 'mensajes.html?op=' + opB });
  await llenarYMandar({ nombre: 'Beto', apellido: 'Prueba', dni: '28999888', acepto: true });
  ok('Compu: Beto en revisión con "Volver"', /^Volver$/.test((await texto('[data-volver]')).trim()), await texto('#idnCaja'));
  await click('[data-volver]', 1500);
  ok('Compu: "Volver" lleva a la conversación', /mensajes\.html\?op=/.test(await ev('location.href')), await ev('location.href'));
  await c.foto('d-beto-pendiente');
} catch (e) { ok('el recorrido terminó sin excepciones', false, e && e.stack); }

const errores = c.errores.slice(), consola = c.consola.filter(x => !/no-existe|favicon|Failed to load resource/.test(x));
ok('Sin errores de JavaScript', !errores.length, errores.join(' || '));
ok('Sin errores en la consola', !consola.length, consola.join(' || '));
console.log(JSON.stringify({ casos: r.length, fallan: falla, e: errores, k: consola }));
await c.cerrar();
process.exit(falla ? 1 : 0);
