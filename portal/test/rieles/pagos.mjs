/* Pruebas del riel de reservas y cobranza (migración 31, 9/10/2026).
   Tres modos, desde la raíz del repo:
   · Front, en modo local (sin base): el recorrido completo de cada lado en Mensajes y en Pagos, los errores, sin errores de
     consola y sin scroll horizontal. Necesita el servidor y Chrome levantados (ver portal/test/flujos/correr.sh):
       BP_PUERTO=8203 BP_CHROME=9403 BP_CAPTURAS=/tmp/bp-pagos node portal/test/rieles/pagos.mjs celular   (o compu)
   · API, sin red: node portal/test/rieles/pagos.mjs api   (501 sin claves, firma del webhook, cron sin secreto)
   · SQL, en la base REAL dentro de una transacción que se deshace (begin; migración 31; pruebas; rollback). Desde la carpeta
     donde está vinculado el proyecto de Supabase:
       node <repo>/portal/test/rieles/pagos.mjs sql   (usa `supabase db query --linked`; nunca hace commit)
   Sale con 1 si algo falla. */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = join(AQUI, '..', '..', '..');
const modo = process.argv[2] || 'celular';
const res = []; const ok = (caso, bien, detalle) => { res.push({ caso, ok: !!bien, detalle: detalle == null ? null : String(detalle).slice(0, 300) }); };
const fin = (extra) => {
  const mal = res.filter(r => !r.ok);
  res.forEach((r, i) => console.log(String(i + 1).padStart(2), r.ok ? 'OK   ' : 'FALLA', r.caso, r.detalle ? '| ' + r.detalle : ''));
  console.log(JSON.stringify(Object.assign({ casos: res.length, fallas: mal.length, e: mal.map(r => 'FALLA: ' + r.caso + (r.detalle ? ' | ' + r.detalle : '')) }, extra || {})));
  process.exit(mal.length || (extra && ((extra.k && extra.k.length) || (extra.errores && extra.errores.length))) ? 1 : 0);
};

/* ═══════════════ API (sin red) ═══════════════ */
if (modo === 'api') {
  const req = createRequire(import.meta.url);
  const llamar = async (archivo, r) => new Promise(resolve => {
    const resp = { statusCode: 200, h: {}, setHeader(k, v) { this.h[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, body: b ? JSON.parse(b) : null, h: this.h }); } };
    req(join(REPO, 'api', archivo))(Object.assign({ headers: {}, query: {} }, r), resp);
  });
  for (const k of ['MP_ACCESS_TOKEN', 'MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'MP_WEBHOOK_SECRET', 'PORTAL_SUPABASE_SERVICE_KEY', 'CRON_SECRET', 'PORTAL_NOTIFY_KEY']) delete process.env[k];
  let r = await llamar('portal-pago.js', { method: 'POST', body: { reserva_id: '00000000-0000-0000-0000-000000000000' } });
  ok('Pagar sin claves: 501 "Mercado Pago todavía no está configurado"', r.status === 501 && r.body.configured === false && r.body.error === 'Mercado Pago todavía no está configurado', JSON.stringify(r.body));
  r = await llamar('portal-pago.js', { method: 'POST', headers: { origin: 'https://otro.com' }, body: {} });
  ok('Pagar desde otro origen: 403', r.status === 403, r.status);
  r = await llamar('portal-pago.js', { method: 'GET', query: { vencer: '1' } });
  ok('Cron sin secreto: 401', r.status === 401, r.status);
  process.env.CRON_SECRET = 'secreto-cron';
  r = await llamar('portal-pago.js', { method: 'GET', headers: { authorization: 'Bearer secreto-cron' }, query: { vencer: '1' } });
  ok('Cron con secreto pero sin clave de servicio: 501', r.status === 501, JSON.stringify(r.body));
  r = await llamar('portal-mp-webhook.js', { method: 'POST', body: { type: 'payment', data: { id: '123' } } });
  ok('Webhook sin claves: 501', r.status === 501 && r.body.configured === false, JSON.stringify(r.body));
  Object.assign(process.env, { MP_WEBHOOK_SECRET: 'whsec', MP_ACCESS_TOKEN: 'APP_USR-x', PORTAL_SUPABASE_SERVICE_KEY: 'srv' });
  delete req.cache[req.resolve(join(REPO, 'api', '_portal', 'admin.js'))]; delete req.cache[req.resolve(join(REPO, 'api', 'portal-mp-webhook.js'))];
  const ts = String(Math.floor(Date.now() / 1000));
  const firma = (id, rid, t) => 'ts=' + t + ',v1=' + createHmac('sha256', 'whsec').update(`id:${id};request-id:${rid};ts:${t};`).digest('hex');
  r = await llamar('portal-mp-webhook.js', { method: 'POST', headers: { 'x-signature': 'ts=' + ts + ',v1=abc', 'x-request-id': 'r1' }, query: { 'data.id': '123' }, body: { type: 'payment', data: { id: '123' } } });
  ok('Webhook con firma falsa: 401', r.status === 401, JSON.stringify(r.body));
  r = await llamar('portal-mp-webhook.js', { method: 'POST', headers: { 'x-signature': firma('123', 'r1', String(+ts - 3600)), 'x-request-id': 'r1' }, query: { 'data.id': '123' }, body: { type: 'payment', data: { id: '123' } } });
  ok('Webhook con firma vieja (más de 10 minutos): 401', r.status === 401, JSON.stringify(r.body));
  r = await llamar('portal-mp-webhook.js', { method: 'POST', headers: { 'x-signature': firma('abc', 'r2', ts), 'x-request-id': 'r2' }, query: { 'data.id': 'abc' }, body: { type: 'merchant_order', data: { id: 'abc' } } });
  ok('Webhook con firma buena de algo que no es un pago: 200 ignorado', r.status === 200 && r.body.ignorado, JSON.stringify(r.body));
  delete process.env.PORTAL_SUPABASE_SERVICE_KEY; delete req.cache[req.resolve(join(REPO, 'api', '_portal', 'admin.js'))]; delete req.cache[req.resolve(join(REPO, 'api', 'portal-pago.js'))];
  r = await llamar('portal-pago.js', { method: 'POST', body: { pago_id: '00000000-0000-0000-0000-000000000000' } });
  ok('Pagar con claves de MP pero sin la clave de servicio: 501', r.status === 501 && (r.body.falta || []).indexOf('PORTAL_SUPABASE_SERVICE_KEY') > -1, JSON.stringify(r.body));
  fin();
}

/* ═══════════════ SQL (base real, transacción deshecha) ═══════════════ */
if (modo === 'sql') {
  const mig = readFileSync(join(REPO, 'portal', 'migracion-31-pagos.sql'), 'utf8');
  const pruebas = pruebasSQL();
  const dir = mkdtempSync(join(tmpdir(), 'bp-m31-'));
  const f = join(dir, 'm31-ensayo.sql');
  writeFileSync(f, 'begin;\n' + mig + '\n' + pruebas + '\nrollback;\n');
  const out = execFileSync('supabase', ['db', 'query', '--linked', '-o', 'json', '-f', f], { encoding: 'utf8', maxBuffer: 1 << 24 });
  const j = JSON.parse(out.slice(out.indexOf('{')));
  (j.rows || []).forEach(x => ok(x.caso, x.ok, x.detalle));
  fin();
}

/* ═══════════════ Front, en modo local ═══════════════ */
const { conectar, sleep } = await import('../flujos/cdp.mjs');
const movil = modo !== 'compu';
const sufijo = movil ? 'cel' : 'pc';
const c = await conectar(); await c.vista(movil);
/* Copiar necesita el permiso del portapapeles y la página con foco (en Chrome sin pantalla, se emulan) */
await c.send('Browser.grantPermissions', { origin: new URL(process.env.BP_PUERTO ? 'http://127.0.0.1:' + process.env.BP_PUERTO : 'http://127.0.0.1:8107').origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
/* El portapapeles de Chrome sin ventana exige que la página tenga el foco: se emula (si no, "Copiar" cae en el plan B) */
await c.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });

/* Ayudas que viven en la página (se vuelven a cargar después de cada navegación) */
const H = `(() => { if (window.__pg) return; window.__pg = {
  txt: s => String(s || '').replace(/\\s+/g, ' ').trim(),
  chips: () => Array.from(document.querySelectorAll('#msAcc .ms-acc-fila > [data-acc]')).map(b => __pg.txt(b.textContent)),
  mas: () => { const b = document.getElementById('msMasBtn'); if (!b) return []; b.click(); const l = Array.from(document.querySelectorAll('#msMasPop [role=menuitem]')).map(x => __pg.txt(x.textContent)); b.click(); return l; },
  estado: () => __pg.txt((document.querySelector('#msAcc .ms-acc-estado') || {}).textContent),
  esta: t => __pg.chips().indexOf(t) > -1 || __pg.mas().indexOf(t) > -1,
  acc: t => { let b = Array.from(document.querySelectorAll('#msAcc .ms-acc-fila > [data-acc]')).find(x => __pg.txt(x.textContent) === t);
    if (!b) { const m = document.getElementById('msMasBtn'); if (m) { m.click(); b = Array.from(document.querySelectorAll('#msMasPop [role=menuitem]')).find(x => __pg.txt(x.textContent) === t); } }
    if (!b) return 'no está: ' + t; b.click(); return true; },
  llenar: (v, sel) => { const f = document.querySelector((sel || '.ms-dlg') + ' form'); if (!f) return 'sin diálogo'; for (const k in v) { const e = f.elements[k]; if (!e) return 'falta ' + k; e.value = v[k]; e.dispatchEvent(new Event('input', { bubbles: true })); } f.requestSubmit(); return true; },
  err: sel => __pg.txt((document.querySelector((sel || '.ms-dlg') + ' [role=alert]:not([hidden])') || {}).textContent),
  hoja: () => { const h = document.querySelector('.pg-velo .pg-hoja'); return h ? __pg.txt(h.textContent) : ''; },
  scroll: () => document.documentElement.scrollWidth - window.innerWidth
}; })(); true`;
const ev = async expr => { await c.ev(H); return c.ev(expr); };
const S = 900;
const sesion = (id, email) => c.ev(`localStorage.setItem('bp_user', JSON.stringify({ id: ${JSON.stringify(id)}, email: ${JSON.stringify(email)}, perfil: ${JSON.stringify(id === 'local-ana' ? 'busca' : null)} })); true`);
const abrirOp = async (id, espera = 1600) => { await c.ir('mensajes.html?op=' + encodeURIComponent(id), espera); await c.ev(H); };
/* Captura sin el aviso flotante encima */
const foto = async (nombre, completa) => { await c.ev('(() => { const t = document.getElementById("bpToast"); if (t) t.classList.remove("on"); return true; })()'); await sleep(350); return c.foto(nombre, completa); };
const sinScroll = async donde => { const s = await ev('__pg.scroll()'); ok('Sin scroll horizontal: ' + donde, s <= 0, s); };

/* 0. Datos: el publicador (Pablo), la sesión de quien busca (Ana) y la operación */
await c.ir('index.html', 300);
await c.ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bp_digital', '1'); localStorage.setItem('bp_dg_identidad', JSON.stringify({ 'local-ana': { estado: 'verificada', verificada_en: new Date().toISOString() } }));
  localStorage.setItem('bp_publicadores', JSON.stringify([{ id: 'pub-gestora', slug: 'gestora-prueba', nombre: 'Gestora Prueba', razon_social: 'Gestora Prueba SRL', cuit: '30-11122233-4', tipo: 'gestor', auth_user_id: 'local-pablo', email: 'pablo@prueba.local', verificado: true, whatsapp: '5491100000000' }])); true`);
await c.ir('pagos.html', 900);
ok('Pagos sin sesión pide ingresar', /ingresar\.html/.test(await c.ev('location.href')), await c.ev('location.href'));
await sesion('local-ana', 'ana@prueba.local');
await c.ir('pagos.html', 1200);
ok('Mis pagos vacío guía a Mensajes', /Todavía no tenés pagos/.test(await c.ev('document.querySelector("main").textContent')) && await c.ev('!!document.querySelector(".pg-vacio a[href=\\"mensajes.html\\"]")'), null);
const op1 = await c.ev(`BPDigital.abrir({ id: 'aviso-1', publicador_id: 'pub-gestora', operacion: 'mediano', precio: 1000, moneda: 'USD', titulo: 'Dos ambientes en Palermo', barrio: 'Palermo' }, 'Hola, ¿está disponible?')`);
const op2 = await c.ev(`BPDigital.abrir({ id: 'aviso-2', publicador_id: 'pub-gestora', operacion: 'mediano', precio: 900, moneda: 'USD', titulo: 'Monoambiente en Belgrano', barrio: 'Belgrano' }, 'Hola')`);
ok('Ana abre dos operaciones', typeof op1 === 'string' && typeof op2 === 'string', op1 + ' ' + op2);

/* 1. Quien busca: "Reservar" aparece recién después de "Quiero avanzar" */
await abrirOp(op1);
ok('Antes de avanzar no hay "Reservar"', (await ev('__pg.chips()')).indexOf('Reservar') < 0, JSON.stringify(await ev('__pg.chips()')));
let e = await c.ev(`BPPagos.pedirReserva(${JSON.stringify(op1)}, 1000, 'USD', 48).then(() => 'entró', x => x.message)`);
ok('Error: reservar sin avisar que quiere avanzar', e === 'Primero avisá que querés avanzar.', e);
await ev('__pg.acc("Quiero avanzar")'); await sleep(400); await ev('__pg.llenar({ nota: "Me interesa desde noviembre." })'); await sleep(S);
const chipsI = await ev('__pg.chips()');
ok('Después de "Quiero avanzar": "Reservar" es el paso principal', chipsI.indexOf('Reservar') > -1 && await ev('!!Array.from(document.querySelectorAll("#msAcc .ms-chip.prim")).length'), JSON.stringify(chipsI));
await ev('__pg.acc("Reservar")'); await sleep(500);
const dlgR = await ev('__pg.txt(document.querySelector(".ms-dlg").textContent)');
ok('Diálogo de reserva: monto sugerido y la línea de confianza', /La seña va directo a quien publica\. BAIREN no recibe tu dinero\./.test(dlgR) && await ev('document.querySelector(".ms-dlg form").elements.monto.value') === '1000', dlgR);
await ev('__pg.llenar({ monto: "0" })'); await sleep(300);
ok('Error: seña en cero no pasa', /mayor a cero/.test(await ev('__pg.err()')), await ev('__pg.err()'));
await ev('__pg.llenar({ monto: "1000" })'); await sleep(1400);
let hoja = await ev('__pg.hoja()');
ok('Pide la reserva y se abre "Pagar la seña" con el monto grande', /Pagar la seña/.test(hoja) && /USD 1\.000/.test(hoja) && /Pagala antes del/.test(hoja), hoja);
ok('Sin cuenta cargada: lo dice y ofrece pedirle el alias', /Todavía no cargó su alias o CBU/.test(hoja) && /Pedir alias/.test(hoja), hoja);
await foto('pg-' + sufijo + '-1-pagar-sin-cuenta');
await ev('document.querySelector(".pg-hoja [data-pedir]").click()'); await sleep(S);
ok('"Pedirle el alias" manda el mensaje al chat', /alias o CBU para hacerte el pago/.test(await ev('document.getElementById("msLog").textContent')), null);
const estI = await ev('__pg.estado()');
ok('Estado en una línea: seña y plazo', /^Seña de USD 1\.000 · pagala antes del/.test(estI), estI);
ok('El paso de pago ahora es "Pagar seña" (y ya no "Reservar")', (await ev('__pg.chips()')).indexOf('Pagar seña') > -1 && !(await ev('__pg.esta("Reservar")')), JSON.stringify(await ev('__pg.chips()')));
ok('Hito "Pidió la reserva" en el chat', /Pidió la reserva/.test(await ev('document.getElementById("msLog").textContent')), null);
e = await c.ev(`BPPagos.pedirReserva(${JSON.stringify(op1)}, 500, 'USD', 24).then(() => 'entró', x => x.message)`);
ok('Error: una sola reserva en curso', e === 'Ya hay una reserva en curso para esta operación.', e);
e = await c.ev(`BPPagos.confirmarReserva(JSON.parse(localStorage.bp_dg_pg_reservas)[0].id, 'yo').then(() => 'entró', x => x.message)`);
ok('Error: quien busca no confirma su propia seña', e === 'Solo quien publica confirma la seña.', e);
await sinScroll('operación de quien busca');

/* 2. Quien publica: cargar la cuenta, confirmar la seña, armar las cuotas */
await sesion('local-pablo', 'pablo@prueba.local');
await abrirOp(op1);
let estP = await ev('__pg.estado()');
ok('Publicador sin cuenta: el paso es "Cargar alias" y el estado lo dice', await ev('__pg.esta("Cargar alias")') && /cargá tu alias o CBU/.test(estP), estP + ' ' + JSON.stringify(await ev('__pg.chips()')));
e = await c.ev(`BPPagos.pedirReserva(${JSON.stringify(op1)}, 1000, 'USD', 48).then(() => 'entró', x => x.message)`);
ok('Error: quien publica no pide la reserva', e === 'Solo quien busca pide la reserva.', e);
await ev('__pg.acc("Cargar alias")'); await sleep(600);
ok('La cuenta se carga en una hoja, con teclado numérico para el CBU', await ev('document.querySelector(".pg-hoja [name=cbu]").getAttribute("inputmode")') === 'numeric', null);
await ev('__pg.llenar({ titular: "Gestora Prueba SRL", alias: "Gestora.Prueba", cbu: "123", nota: "" }, ".pg-hoja")'); await sleep(400);
ok('Error: CBU mal escrito se avisa en la hoja', /Revisá el CBU o CVU/.test(await ev('__pg.err(".pg-hoja")')), await ev('__pg.err(".pg-hoja")'));
await ev('__pg.llenar({ cbu: "0170 0000 1000 0000 1234 56", nota: "Mandá el comprobante por el chat." }, ".pg-hoja")'); await sleep(S + 300);
estP = await ev('__pg.estado()');
ok('Con cuenta: el paso es "Confirmar seña" y el estado lo dice', await ev('__pg.esta("Confirmar seña")') && /confirmala cuando esté en tu cuenta/.test(estP), estP + ' ' + JSON.stringify(await ev('__pg.chips()')));
await ev('__pg.acc("Aceptar solicitud")'); await sleep(400); await ev('__pg.llenar({})'); await sleep(S);
ok('Con la solicitud aceptada, "Confirmar seña" queda a la vista', (await ev('__pg.chips()')).indexOf('Confirmar seña') > -1, JSON.stringify(await ev('__pg.chips()')));
await ev('__pg.acc("Confirmar seña")'); await sleep(500);
ok('Confirmar avisa que sea solo con la plata en la cuenta', /ya están en tu cuenta/.test(await ev('__pg.txt(document.querySelector(".ms-dlg").textContent)')), null);
await ev('__pg.llenar({ referencia: "Transferencia 0001" })'); await sleep(S);
const etapa = await c.ev(`JSON.parse(localStorage.bp_dg_ops).find(o => o.id === ${JSON.stringify(op1)}).etapa`);
ok('Seña confirmada: la operación pasa a Reserva', etapa === 'reserva', etapa);
const cargos = await c.ev(`JSON.parse(localStorage.bp_dg_cargos || '[]').filter(x => x.operacion_id === ${JSON.stringify(op1)}).map(x => x.concepto + ' ' + x.monto + ' ' + x.moneda + ' ' + x.paga + ' ' + x.estado)`);
ok('Regla "Reserva online": USD 80 a quien publica, simulado', cargos.indexOf('Reserva online 80 USD publicador simulado') > -1, JSON.stringify(cargos));
estP = await ev('__pg.estado()');
ok('Después de la seña, el paso es "Armar cuotas" y el estado lo dice', (await ev('__pg.chips()')).indexOf('Armar cuotas') > -1 && /armá las cuotas/.test(estP), estP + ' ' + JSON.stringify(await ev('__pg.chips()')));
await ev('__pg.acc("Armar cuotas")'); await sleep(500);
const mesHoy = await c.ev(`(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })()`);
await ev(`__pg.llenar({ desde: ${JSON.stringify(mesHoy)}, meses: "6", monto: "1000", moneda: "USD", dia: "10" })`); await sleep(S);
let cuotas = await c.ev(`JSON.parse(localStorage.bp_dg_pg_pagos).filter(p => p.operacion_id === ${JSON.stringify(op1)}).length`);
ok('Arma 6 cuotas de alquiler', cuotas === 6, cuotas);
await ev('__pg.acc("Sumar expensas")'); await sleep(500); await ev('__pg.llenar({ monto: "85000", moneda: "ARS" })'); await sleep(S);
await ev('__pg.acc("Sumar depósito")'); await sleep(500); await ev('__pg.llenar({ monto: "1000", moneda: "USD" })'); await sleep(S);
cuotas = await c.ev(`JSON.parse(localStorage.bp_dg_pg_pagos).filter(p => p.operacion_id === ${JSON.stringify(op1)}).map(p => p.concepto).join(',')`);
ok('Suma 6 de expensas (en pesos) y el depósito', (cuotas.match(/expensas/g) || []).length === 6 && (cuotas.match(/deposito/g) || []).length === 1, cuotas);
estP = await ev('__pg.estado()');
const venceCerca = await c.ev(`(() => { const p = JSON.parse(localStorage.bp_dg_pg_pagos).filter(p => p.operacion_id === ${JSON.stringify(op1)} && p.concepto === 'alquiler').sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))[0]; return (new Date(p.vencimiento + 'T12:00:00') - Date.now()) / 864e5 <= 15; })()`);
if (venceCerca) ok('Con una cuota por vencer, el paso es "Marcar pagado" y el estado dice cuál', (await ev('__pg.chips()')).indexOf('Marcar pagado') > -1 && /: vence el|atrasada/.test(estP), estP + ' ' + JSON.stringify(await ev('__pg.chips()')));
else ok('Con la próxima cuota lejos no hay paso principal y el estado lo dice', /Al día · próxima/.test(estP), estP);
await ev('document.querySelector(".ms-info-btn").click()'); await sleep(600);
const sec = await ev('__pg.txt((document.querySelector("[data-sec=\\"ext-pagos\\"]") || {}).textContent)');
ok('Sección "Pagos": próxima cuota en grande con su acción, 2 renglones más y "Ver los…"', /Próxima cuota/.test(sec) && /Ver los 14/.test(sec) && await ev('document.querySelectorAll("[data-sec=\\"ext-pagos\\"] .pg-fila").length') === 2 && await ev('!!document.querySelector("[data-sec=\\"ext-pagos\\"] .pg-dato [data-pg-marcar]")'), sec);
await ev('document.querySelector("[data-sec=\\"ext-pagos\\"]").scrollIntoView({ block: "start" })'); await foto('pg-' + sufijo + '-2-seccion-publicador');
await ev('document.querySelector("[data-sec=\\"ext-pagos\\"] [data-pg-marcar]").click()'); await sleep(500);
await ev('__pg.llenar({ referencia: "Transferencia 0002" })'); await sleep(S);
const pagada = await c.ev(`JSON.parse(localStorage.bp_dg_pg_pagos).filter(p => p.estado === 'pagado').map(p => p.concepto + ' ' + p.periodo + ' ' + p.recibo)`);
ok('"Marcar pagado" desde la sección: recibo N° 1', pagada.length === 1 && / 1$/.test(pagada[0]), JSON.stringify(pagada));
const cargo2 = await c.ev(`JSON.parse(localStorage.bp_dg_cargos || '[]').filter(x => x.concepto === 'Cobranza digital').map(x => x.monto + ' ' + x.moneda + ' ' + x.paga)`);
ok('Regla "Cobranza digital": 2 % al propietario', cargo2.length === 1 && /^(20 USD|1700 ARS) propietario$/.test(cargo2[0]), JSON.stringify(cargo2));
ok('Hito "Pago recibido" en el chat', /Pago recibido/.test(await ev('document.getElementById("msLog").textContent')), null);
e = await c.ev(`BPPagos.registrarPago(JSON.parse(localStorage.bp_dg_pg_pagos).find(p => p.estado === 'pagado').id).then(() => 'entró', x => x.message)`);
ok('Error: una cuota no se cobra dos veces', e === 'Esta cuota ya está paga.', e);
ok('Nada se le cobra a quien busca', await c.ev(`!JSON.parse(localStorage.bp_dg_cargos || '[]').some(x => x.paga === 'interesado')`), null);
await foto('pg-' + sufijo + '-3-operacion-publicador');
await sinScroll('operación de quien publica');

/* 3. Quien busca: pagar el alquiler (alias con Copiar) y avisar */
await sesion('local-ana', 'ana@prueba.local');
await abrirOp(op1);
const chipsI2 = await ev('__pg.chips()'); const estI2 = await ev('__pg.estado()'); const pagarI = chipsI2.find(x => /^Pagar/.test(x));
ok('Quien busca: un paso de pago y su estado en una línea', !!pagarI && chipsI2.filter(x => /^Pagar/.test(x)).length === 1 && /vencen? el|atrasad/.test(estI2), estI2 + ' ' + JSON.stringify(chipsI2));
await ev(`__pg.acc(${JSON.stringify(pagarI)})`); await sleep(700);
hoja = await ev('__pg.hoja()');
ok('Lo que vence el mismo día va junto: total grande y "Ver detalle"', /Ver detalle/.test(hoja) && /\+ \$ 85\.000/.test(hoja), hoja);
ok('"Cómo pagar": monto grande, alias y CBU con Copiar, y la confianza', /Transferí a Gestora Prueba SRL/.test(hoja) && /gestora\.prueba/.test(hoja) && /01700000 10000000123456/.test(hoja) && await ev('document.querySelectorAll(".pg-hoja [data-copiar]").length') === 2 && /BAIREN no recibe tu dinero/.test(hoja), hoja);
await ev('document.querySelector(".pg-hoja [data-copiar]").click()'); await sleep(400);
/* Chrome sin ventana no deja escribir en el portapapeles aunque se emule el foco: vale "Copiado" o el plan B ("copialo a mano") */
ok('Copiar responde ("Copiado" o el plan B)', /Copiado/.test(await ev('document.querySelector(".pg-hoja [data-copiar]").textContent')) || /copialo a mano/i.test(await ev('(document.getElementById("bpToast") || {}).textContent || ""')), await ev('document.querySelector(".pg-hoja [data-copiar]").textContent + " | " + ((document.getElementById("bpToast") || {}).textContent || "") + " | " + document.hasFocus()'));
await foto('pg-' + sufijo + '-4-pagar-alquiler');
await ev('document.querySelector(".pg-hoja [data-avisar]").click()'); await sleep(S);
ok('"Ya pagué" le avisa por el chat', /Listo, te transferí/.test(await ev('document.getElementById("msLog").textContent')), null);
e = await c.ev(`BPPagos.armarCuotas(${JSON.stringify(op1)}, { desde: '2027-06', meses: 1, monto: 1, moneda: 'USD', dia: 10 }).then(() => 'entró', x => x.message)`);
ok('Error: quien busca no arma cuotas', e === 'Solo quien publica arma las cuotas.', e);
e = await c.ev(`BPPagos.guardarCuenta('pub-gestora', { titular: 'Trampa', alias: 'trampa.alias' }).then(() => 'entró', x => x.message)`);
ok('Error: quien busca no toca la cuenta de cobro', e === 'Solo quien publica carga su cuenta de cobro.', e);

/* 4. La seña que no se paga vence sola; cancelar un pedido */
await abrirOp(op2);
await ev('__pg.acc("Quiero avanzar")'); await sleep(400); await ev('__pg.llenar({})'); await sleep(S);
await ev('__pg.acc("Reservar")'); await sleep(500); await ev('__pg.llenar({ monto: "900" })'); await sleep(1300);
await ev('document.querySelector(".pg-hoja [data-cerrar]").click()'); await sleep(400);
await c.ev(`(() => { const rs = JSON.parse(localStorage.bp_dg_pg_reservas); const r = rs.find(x => x.operacion_id === ${JSON.stringify(op2)}); r.vence_en = new Date(Date.now() - 60000).toISOString(); localStorage.bp_dg_pg_reservas = JSON.stringify(rs); return true; })()`);
await abrirOp(op2);
ok('Seña fuera de plazo: vence sola y queda el paso en el chat', /La reserva venció/.test(await ev('document.getElementById("msLog").textContent')) && await c.ev(`JSON.parse(localStorage.bp_dg_pg_reservas).find(x => x.operacion_id === ${JSON.stringify(op2)}).estado`) === 'vencida', null);
ok('Vencida la seña, se puede volver a reservar', (await ev('__pg.chips()')).indexOf('Reservar') > -1, JSON.stringify(await ev('__pg.chips()')));
await ev('__pg.acc("Reservar")'); await sleep(500); await ev('__pg.llenar({ monto: "900" })'); await sleep(1300);
await ev('document.querySelector(".pg-hoja [data-cerrar]").click()'); await sleep(400);
await ev('__pg.acc("Cancelar reserva")'); await sleep(500); await ev('__pg.llenar({ motivo: "Me arrepentí" })'); await sleep(S);
ok('Quien busca cancela su pedido de reserva', await c.ev(`JSON.parse(localStorage.bp_dg_pg_reservas).filter(x => x.operacion_id === ${JSON.stringify(op2)}).map(x => x.estado).join(',')`) === 'cancelada,vencida' || await c.ev(`JSON.parse(localStorage.bp_dg_pg_reservas).filter(x => x.operacion_id === ${JSON.stringify(op2)}).map(x => x.estado).sort().join(',')`) === 'cancelada,vencida', await c.ev(`JSON.parse(localStorage.bp_dg_pg_reservas).map(x => x.estado).join(',')`));

/* 5. pagos.html: Mis pagos, el recibo y la cobranza */
await c.ir('pagos.html', 1400); await c.ev(H);
const mis = await ev('__pg.txt(document.getElementById("pgCuerpo").textContent)');
ok('Mis pagos: el estado arriba y lo próximo en una tarjeta grande con "Pagar"', await ev('!!document.querySelector(".pg-estado")') && await ev('!!document.querySelector(".pg-prox .pg-prox-m")') && await ev('document.querySelectorAll(".pg-prox .p-btn-fill").length') === 1 && /BAIREN no recibe tu dinero/.test(mis), mis.slice(0, 200));
ok('Mis pagos: el historial plegado por mes, con el recibo', await ev('document.querySelectorAll("details.pg-mes").length') >= 1 && /Recibo N° 0001/.test(mis), null);
await foto('pg-' + sufijo + '-5-mis-pagos', true);
await sinScroll('Mis pagos');
await ev('document.querySelector(".pg-prox [data-pagar]").click()'); await sleep(600);
ok('"Pagar" en Mis pagos abre la misma hoja', /Transferí a Gestora Prueba SRL/.test(await ev('__pg.hoja()')), null);
await ev('document.querySelector(".pg-hoja [data-cerrar]").click()'); await sleep(400);
const idPagado = await c.ev(`JSON.parse(localStorage.bp_dg_pg_pagos).find(p => p.estado === 'pagado').id`);
await c.ir('pagos.html?recibo=' + idPagado, 1200); await c.ev(H);
const rec = await ev('__pg.txt(document.querySelector(".pg-recibo").textContent)');
ok('Recibo imprimible: número, quién emite, quién paga y la regla de oro', /Recibo N° 0001/.test(rec) && /Gestora Prueba SRL/.test(rec) && /CUIT 30-11122233-4/.test(rec) && /Recibí de Ana/.test(rec) && /BAIREN no recibió este dinero/.test(rec), rec);
await foto('pg-' + sufijo + '-6-recibo', true);
await sinScroll('Recibo');
await sesion('local-pablo', 'pablo@prueba.local');
await c.ir('pagos.html', 1400); await c.ev(H);
const cob = await ev('__pg.txt(document.getElementById("pgCuerpo").textContent)');
ok('Cobranza: "Cobrado este mes" y "Atrasados" en grande', await ev('document.querySelectorAll(".pg-kpi").length') === 2 && /Cobrado este mes/.test(cob) && /Atrasados/.test(cob), cob.slice(0, 200));
ok('Cobranza: las unidades en lista y la cuenta de cobro', await ev('document.querySelectorAll("details.pg-unidad").length') === 1 && /gestora\.prueba/.test(cob) && await ev('document.querySelector(".pg-mp .p-btn").disabled') && /Muy pronto/.test(cob), null);
await ev('Array.from(document.querySelectorAll("details.pg-unidad")).find(x => /Dos ambientes/.test(x.textContent)).open = true'); await sleep(300);
ok('Unidad: 3 tarjetas a la vista y el resto plegado', await ev('document.querySelectorAll("details.pg-unidad[open] .pg-u-in > .pg-tarjetas > .pg-tarjeta").length') === 3 && await ev('!!document.querySelector("details.pg-unidad[open] .pg-u-in > details.pg-mas")'), null);
ok('Las cuotas de una unidad van en tarjetas', await ev('document.querySelectorAll("details.pg-unidad[open] .pg-tarjeta").length') >= 13 && !(await ev('!!document.querySelector(".pg-unidad table")')), await ev('document.querySelectorAll("details.pg-unidad[open] .pg-tarjeta").length'));
await foto('pg-' + sufijo + '-7-cobranza', true);
await sinScroll('Cobranza');
await ev('document.querySelector("details.pg-unidad[open] [data-marcar]").click()'); await sleep(500);
await ev('__pg.llenar({ referencia: "" }, ".pg-hoja")'); await sleep(S + 300);
ok('"Marcar pagado" desde Cobranza: recibo N° 2', await c.ev(`JSON.parse(localStorage.bp_dg_pg_pagos).filter(p => p.recibo === 2).length`) === 1, null);
await ev('document.querySelector("[data-cuenta]").click()'); await sleep(500);
await ev('__pg.llenar({ alias: "x" }, ".pg-hoja")'); await sleep(400);
ok('Error: alias corto se avisa en la hoja', /Revisá el alias/.test(await ev('__pg.err(".pg-hoja")')), await ev('__pg.err(".pg-hoja")'));
await ev('document.querySelector(".pg-hoja [data-cerrar]").click()'); await sleep(400);
await c.ev(`document.cookie = 'bp_cerrado=1; path=/; max-age=120'; localStorage.removeItem('bp_digital'); true`);
await c.ir('pagos.html', 1000);
ok('Apagado para el público: "Muy pronto"', /muy pronto/i.test(await c.ev('document.getElementById("pgCuerpo").textContent')), null);
await c.ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; localStorage.setItem('bp_digital', '1'); true`);

const errores = c.errores, consola = c.consola.filter(x => !/no-existe/.test(x));
ok('Sin errores de consola', !errores.length && !consola.length, JSON.stringify(errores.concat(consola)).slice(0, 300));
await c.cerrar();
fin({ errores, k: consola, final: 'pagos ' + sufijo });

/* Las pruebas SQL (se corren después de la migración 31, dentro de la misma transacción deshecha). Usuarios de prueba en
   auth.users, publicador y avisos; cambian de sesión con set local role + request.jwt.claims; resultados en _r. */
function pruebasSQL(){ return String.raw`-- Pruebas de la migración 31 (se corren después de la migración, dentro de la misma transacción deshecha)
create temp table _r (n serial primary key, caso text, ok boolean, detalle text);
create temp table _ids (k text primary key, v uuid);
grant all on _r, _ids to authenticated, anon, service_role;
grant usage on sequence _r_n_seq to authenticated, anon, service_role;

insert into _ids values
  ('I', gen_random_uuid()), ('I2', gen_random_uuid()), ('P', gen_random_uuid()), ('X', gen_random_uuid()), ('C', gen_random_uuid()),
  ('pub', gen_random_uuid()), ('a1', gen_random_uuid()), ('a2', gen_random_uuid()), ('a3', gen_random_uuid());
insert into auth.users (id, email, aud, role, created_at, updated_at)
select v, lower(k) || '-m31@prueba.local', 'authenticated', 'authenticated', now(), now() from _ids where k in ('I','I2','P','X','C');
insert into portal.curadores (email) values ('c-m31@prueba.local');
insert into portal.publicadores (id, slug, tipo, nombre, razon_social, cuit, auth_user_id, verificado, whatsapp)
values ((select v from _ids where k='pub'), 'prueba-m31', 'gestor', 'Gestora Prueba', 'Gestora Prueba SRL', '30-11122233-4', (select v from _ids where k='P'), true, '5491100000000');
insert into portal.avisos (id, codigo, slug, publicador_id, operacion, tipo, titulo, direccion, unidad, barrio, zona, precio, moneda, estado_curacion, publicado_en)
values ((select v from _ids where k='a1'), 'M31-1', 'prueba-m31-1', (select v from _ids where k='pub'), 'mediano', 'Departamento', 'Prueba m31 uno', 'Calle Falsa 123', '4 B', 'Palermo', 'Palermo', 1200, 'USD', 'publicado', now() - interval '10 days'),
       ((select v from _ids where k='a2'), 'M31-2', 'prueba-m31-2', (select v from _ids where k='pub'), 'mediano', 'Departamento', 'Prueba m31 dos', 'Calle Falsa 456', null, 'Belgrano', 'Belgrano', 900, 'USD', 'publicado', now() - interval '5 days'),
       ((select v from _ids where k='a3'), 'M31-3', 'prueba-m31-3', (select v from _ids where k='pub'), 'venta', 'Departamento', 'Prueba m31 venta', 'Calle Falsa 789', null, 'Núñez', 'Núñez', 150000, 'USD', 'publicado', now() - interval '5 days');

create or replace function pg_temp.como(p_k text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select v from _ids where k = p_k), 'email', lower(p_k) || '-m31@prueba.local', 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', (select v from _ids where k = p_k)::text, true);
end $$;
create or replace function pg_temp.servicio() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
grant execute on function pg_temp.como(text), pg_temp.servicio() to authenticated, service_role;

-- 0. Operaciones: I abre la 1 (mediano) y la 3 (venta); I2 abre la 2
set local role authenticated; select pg_temp.como('I');
do $$ begin
  insert into _ids values ('op1', portal.abrir_operacion((select v from _ids where k='a1'), 'Hola, ¿sigue disponible?', null));
  insert into _ids values ('op3', portal.abrir_operacion((select v from _ids where k='a3'), 'Hola', null));
  insert into _r (caso, ok, detalle) values ('I abre dos operaciones', true, null);
exception when others then insert into _r (caso, ok, detalle) values ('I abre dos operaciones', false, sqlerrm); end $$;
select pg_temp.como('I2');
do $$ begin
  insert into _ids values ('op2', portal.abrir_operacion((select v from _ids where k='a2'), 'Hola', null));
  perform portal.registrar_hito((select v from _ids where k='op2'), 'solicitud_enviada', null);
  insert into _r (caso, ok, detalle) values ('I2 abre una operación y quiere avanzar', true, null);
exception when others then insert into _r (caso, ok, detalle) values ('I2 abre una operación', false, sqlerrm); end $$;

-- 1. Reservar exige "Quiero avanzar"
select pg_temp.como('I');
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op1'), 1200, 'USD', 48);
  insert into _r (caso, ok, detalle) values ('I no reserva sin avisar que quiere avanzar', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I no reserva sin avisar que quiere avanzar', sqlerrm like 'Primero avisá%', sqlerrm); end $$;
do $$ declare d jsonb; begin
  perform portal.registrar_hito((select v from _ids where k='op1'), 'solicitud_enviada', null);
  d := portal.pagos_de_operacion((select v from _ids where k='op1'));
  insert into _r (caso, ok, detalle) values ('I ve Pagos vacío y sin cuenta', d ->> 'lado' = 'interesado' and jsonb_array_length(d -> 'reservas') = 0
    and d -> 'cuenta' = 'null'::jsonb and not (d ->> 'cuenta_cargada')::boolean and not (d -> 'identidad' ->> 'requerida')::boolean, d::text);
  insert into _ids values ('r1', portal.pedir_reserva((select v from _ids where k='op1'), 1200, 'USD', 48));
  insert into _r (caso, ok, detalle) values ('I pide la reserva: queda pedida, con su paso',
    (select estado = 'pedida' and monto = 1200 and moneda = 'USD' and vence_en > now() + interval '47 hours' from portal.reservas where id = (select v from _ids where k='r1'))
    and exists (select 1 from portal.hitos where operacion_id = (select v from _ids where k='op1') and tipo = 'reserva_pedida' and lado = 'interesado'
                 and datos ->> 'reserva_id' = (select v from _ids where k='r1')::text), null);
exception when others then insert into _r (caso, ok, detalle) values ('I pide la reserva', false, sqlerrm); end $$;
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op1'), 500, 'USD', 24);
  insert into _r (caso, ok, detalle) values ('Una sola reserva en curso por operación', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Una sola reserva en curso por operación', sqlerrm like 'Ya hay una reserva%', sqlerrm); end $$;
do $$ begin
  perform portal.registrar_hito((select v from _ids where k='op3'), 'solicitud_enviada', null);
exception when others then insert into _r (caso, ok, detalle) values ('I avanza en la venta', false, sqlerrm); end $$;
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op3'), -5, 'USD', 24);
  insert into _r (caso, ok, detalle) values ('Monto inválido: no', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Monto inválido: no', sqlerrm like 'Revisá el monto%', sqlerrm); end $$;
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op3'), 1000, 'EUR', 24);
  insert into _r (caso, ok, detalle) values ('Moneda que no es USD ni ARS: no', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Moneda que no es USD ni ARS: no', sqlerrm like 'La moneda%', sqlerrm); end $$;
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op3'), 1000, 'USD', 500);
  insert into _r (caso, ok, detalle) values ('Plazo de más de una semana: no', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Plazo de más de una semana: no', sqlerrm like 'El plazo%', sqlerrm); end $$;
do $$ begin
  perform portal.confirmar_reserva((select v from _ids where k='r1'), 'yo mismo');
  insert into _r (caso, ok, detalle) values ('I no confirma su propia seña', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I no confirma su propia seña', sqlerrm like 'Solo quien publica%', sqlerrm); end $$;
do $$ begin
  update portal.reservas set estado = 'pagada' where id = (select v from _ids where k='r1');
  insert into _r (caso, ok, detalle) values ('I no escribe la tabla de reservas', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I no escribe la tabla de reservas', sqlerrm like 'permission denied%', sqlerrm); end $$;
do $$ begin
  insert into portal.pagos (operacion_id, publicador_id, periodo, monto, moneda, vencimiento) values ((select v from _ids where k='op1'), (select v from _ids where k='pub'), '2026-11', 1, 'USD', '2026-11-10');
  insert into _r (caso, ok, detalle) values ('I no inserta cuotas a mano', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I no inserta cuotas a mano', sqlerrm like 'permission denied%', sqlerrm); end $$;

-- 2. Quien publica no reserva por el otro; un extraño no ve ni toca nada
select pg_temp.como('P');
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op1'), 1200, 'USD', 48);
  insert into _r (caso, ok, detalle) values ('P no pide la reserva', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('P no pide la reserva', sqlerrm like 'Solo quien busca%', sqlerrm); end $$;
select pg_temp.como('X');
do $$ begin
  insert into _r (caso, ok, detalle) values ('X no ve reservas, cuotas ni cuentas',
    (select count(*) from portal.reservas) = 0 and (select count(*) from portal.pagos) = 0 and (select count(*) from portal.cuentas_cobro) = 0
    and jsonb_array_length(portal.mis_pagos()) = 0 and jsonb_array_length(portal.cobranza() -> 'operaciones') = 0, null);
exception when others then insert into _r (caso, ok, detalle) values ('X no ve reservas, cuotas ni cuentas', false, sqlerrm); end $$;
do $$ begin
  perform portal.pagos_de_operacion((select v from _ids where k='op1'));
  insert into _r (caso, ok, detalle) values ('X no lee los pagos de la operación', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('X no lee los pagos de la operación', sqlerrm like 'No sos parte%', sqlerrm); end $$;
do $$ begin
  perform portal.confirmar_reserva((select v from _ids where k='r1'), null);
  insert into _r (caso, ok, detalle) values ('X no confirma la seña', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('X no confirma la seña', true, sqlerrm); end $$;
do $$ begin
  perform portal.cancelar_reserva((select v from _ids where k='r1'), null);
  insert into _r (caso, ok, detalle) values ('X no cancela la reserva', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('X no cancela la reserva', true, sqlerrm); end $$;
do $$ begin
  perform portal.guardar_cuenta_cobro((select v from _ids where k='pub'), 'Trampa', 'trampa.alias', null, null);
  insert into _r (caso, ok, detalle) values ('X no carga la cuenta de otro', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('X no carga la cuenta de otro', true, sqlerrm); end $$;

-- 3. Cuenta de cobro de quien publica
select pg_temp.como('P');
do $$ begin
  perform portal.guardar_cuenta_cobro((select v from _ids where k='pub'), 'Gestora Prueba SRL', null, '123', null);
  insert into _r (caso, ok, detalle) values ('CBU mal escrito: no', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('CBU mal escrito: no', sqlerrm like 'Revisá el CBU%', sqlerrm); end $$;
do $$ begin
  perform portal.guardar_cuenta_cobro((select v from _ids where k='pub'), 'Gestora Prueba SRL', 'Gestora.Prueba', '0170 0000 1000 0000 1234 56', 'Mandá el comprobante por acá.');
  perform portal.guardar_cuenta_cobro((select v from _ids where k='pub'), 'Gestora Prueba SRL', 'gestora.prueba', '0170000010000000123456', 'Mandá el comprobante por acá.');
  insert into _r (caso, ok, detalle) values ('P carga su cuenta (y la corrige): una sola fila',
    (select count(*) = 1 and min(alias) = 'gestora.prueba' and min(cbu) = '0170000010000000123456' from portal.cuentas_cobro), null);
exception when others then insert into _r (caso, ok, detalle) values ('P carga su cuenta', false, sqlerrm); end $$;

-- 4. Quien busca ve dónde pagar solo cuando tiene algo para pagar
select pg_temp.como('I');
do $$ declare d jsonb; begin
  d := portal.pagos_de_operacion((select v from _ids where k='op1'));
  insert into _r (caso, ok, detalle) values ('I ve el alias y el CBU (tiene una seña pedida)', d -> 'cuenta' ->> 'alias' = 'gestora.prueba' and not (d ->> 'mp')::boolean, d -> 'cuenta' ::text);
  insert into _r (caso, ok, detalle) values ('I no lee la tabla de cuentas', (select count(*) from portal.cuentas_cobro) = 0, null);
exception when others then insert into _r (caso, ok, detalle) values ('I ve la cuenta', false, sqlerrm); end $$;
select pg_temp.como('I2');
do $$ declare d jsonb; begin
  d := portal.pagos_de_operacion((select v from _ids where k='op2'));
  insert into _r (caso, ok, detalle) values ('I2 sin nada para pagar no ve la cuenta', d -> 'cuenta' = 'null'::jsonb and (d ->> 'cuenta_cargada')::boolean, null);
exception when others then insert into _r (caso, ok, detalle) values ('I2 sin nada para pagar no ve la cuenta', false, sqlerrm); end $$;

-- 5. P confirma la seña: etapa reserva y la regla "Reserva online" (simulada)
select pg_temp.como('P');
do $$ begin
  perform portal.confirmar_reserva((select v from _ids where k='r1'), 'Transferencia 0001');
  insert into _r (caso, ok, detalle) values ('P confirma la seña: pagada, etapa reserva, paso registrado',
    (select estado = 'pagada' and pagada_en is not null and referencia = 'Transferencia 0001' and proveedor = 'manual' from portal.reservas where id = (select v from _ids where k='r1'))
    and (select etapa from portal.operaciones where id = (select v from _ids where k='op1')) = 'reserva'
    and exists (select 1 from portal.hitos where operacion_id = (select v from _ids where k='op1') and tipo = 'reserva_pagada' and lado = 'publicador'), null);
  insert into _r (caso, ok, detalle) values ('P no ve cargos simulados', (select count(*) from portal.cargos) = 0, null);
exception when others then insert into _r (caso, ok, detalle) values ('P confirma la seña', false, sqlerrm); end $$;
do $$ begin
  perform portal.confirmar_reserva((select v from _ids where k='r1'), null);
  insert into _r (caso, ok, detalle) values ('No se confirma dos veces', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('No se confirma dos veces', sqlerrm like 'La seña ya está confirmada%', sqlerrm); end $$;

-- 6. Cuotas
select pg_temp.como('I');
do $$ begin
  perform portal.armar_cuotas((select v from _ids where k='op1'), '2026-11-01', 6, 1200, 'USD', 10, 'alquiler');
  insert into _r (caso, ok, detalle) values ('I no arma cuotas', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I no arma cuotas', sqlerrm like 'Solo quien publica%', sqlerrm); end $$;
select pg_temp.como('P');
do $$ declare n1 integer; n2 integer; n3 integer; n4 integer; begin
  n1 := portal.armar_cuotas((select v from _ids where k='op1'), '2026-11-15', 6, 1200, 'USD', 31, 'alquiler');
  n2 := portal.armar_cuotas((select v from _ids where k='op1'), '2026-11-01', 6, 1200, 'USD', 31, 'alquiler');
  n3 := portal.armar_cuotas((select v from _ids where k='op1'), '2026-11-01', 6, 85000, 'ARS', 10, 'expensas');
  n4 := portal.armar_cuotas((select v from _ids where k='op1'), '2026-11-01', 1, 1200, 'USD', 10, 'deposito');
  insert into _r (caso, ok, detalle) values ('P arma 6 de alquiler, 6 de expensas y el depósito; repetir no duplica',
    n1 = 6 and n2 = 0 and n3 = 6 and n4 = 1 and (select count(*) from portal.pagos where operacion_id = (select v from _ids where k='op1')) = 13,
    n1 || ' ' || n2 || ' ' || n3 || ' ' || n4);
  insert into _r (caso, ok, detalle) values ('Vencimiento al último día del mes si el día no existe',
    (select vencimiento from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2027-02') = '2027-02-28'
    and (select vencimiento from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2026-11') = '2026-11-30', null);
exception when others then insert into _r (caso, ok, detalle) values ('P arma las cuotas', false, sqlerrm); end $$;
do $$ begin
  perform portal.armar_cuotas((select v from _ids where k='op3'), '2026-11-01', 6, 1000, 'USD', 10, 'alquiler');
  insert into _r (caso, ok, detalle) values ('En una venta no hay cuotas', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('En una venta no hay cuotas', sqlerrm like 'Las cuotas son para alquileres%', sqlerrm); end $$;

-- 7. Registrar pagos: recibo correlativo, paso pago_recibido y regla "Cobranza digital" (simulada)
select pg_temp.como('I');
do $$ begin
  perform portal.registrar_pago((select id from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2026-11'), 'yo');
  insert into _r (caso, ok, detalle) values ('I no marca sus cuotas como pagas', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I no marca sus cuotas como pagas', sqlerrm like 'Solo quien publica%', sqlerrm); end $$;
do $$ declare d jsonb; begin
  d := portal.pagos_de_operacion((select v from _ids where k='op1'));
  insert into _r (caso, ok, detalle) values ('I ve sus 13 cuotas y la cuenta para pagar', jsonb_array_length(d -> 'pagos') = 13 and d -> 'cuenta' ->> 'alias' = 'gestora.prueba', null);
exception when others then insert into _r (caso, ok, detalle) values ('I ve sus cuotas', false, sqlerrm); end $$;
select pg_temp.como('P');
do $$ declare n1 integer; n2 integer; v_nov uuid; begin
  select id into v_nov from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2026-11';
  insert into _ids values ('pnov', v_nov);
  n1 := portal.registrar_pago(v_nov, 'Transferencia 0002');
  n2 := portal.registrar_pago((select id from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'expensas' and periodo = '2026-11'), null);
  insert into _r (caso, ok, detalle) values ('P registra dos pagos: recibos 1 y 2', n1 = 1 and n2 = 2
    and (select estado = 'pagado' and recibo = 1 and proveedor = 'manual' and pagado_en is not null from portal.pagos where id = v_nov), n1 || ' ' || n2);
  insert into _r (caso, ok, detalle) values ('Paso pago_recibido con monto, moneda y período',
    exists (select 1 from portal.hitos where operacion_id = (select v from _ids where k='op1') and tipo = 'pago_recibido' and lado = 'publicador'
      and datos ->> 'monto' = '1200.00' and datos ->> 'moneda' = 'USD' and datos ->> 'periodo' = '2026-11'),
    (select string_agg(datos::text, ' | ') from portal.hitos where operacion_id = (select v from _ids where k='op1') and tipo = 'pago_recibido'));
exception when others then insert into _r (caso, ok, detalle) values ('P registra pagos', false, sqlerrm); end $$;
do $$ begin
  perform portal.registrar_pago((select v from _ids where k='pnov'), null);
  insert into _r (caso, ok, detalle) values ('Una cuota no se cobra dos veces', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Una cuota no se cobra dos veces', sqlerrm like 'Esta cuota ya está paga%', sqlerrm); end $$;
do $$ begin
  perform portal.anular_pago((select id from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'expensas' and periodo = '2027-04'));
  insert into _r (caso, ok, detalle) values ('P anula una cuota sin pagar; la paga no se anula',
    (select estado from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'expensas' and periodo = '2027-04') = 'anulado', null);
exception when others then insert into _r (caso, ok, detalle) values ('P anula una cuota sin pagar', false, sqlerrm); end $$;
do $$ begin
  perform portal.anular_pago((select v from _ids where k='pnov'));
  insert into _r (caso, ok, detalle) values ('La cuota paga no se anula', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('La cuota paga no se anula', sqlerrm like 'Solo se anula%', sqlerrm); end $$;

-- 8. El webhook de Mercado Pago (clave de servicio): lado sistema, recibo siguiente
reset role;
set local role service_role; select pg_temp.servicio();
do $$ declare n integer; begin
  n := portal.registrar_pago((select id from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2026-12'), 'MP 123456789');
  insert into _r (caso, ok, detalle) values ('Webhook (clave de servicio): recibo 3, Mercado Pago, lado sistema', n = 3
    and exists (select 1 from portal.pagos where recibo = 3 and proveedor = 'mercadopago' and referencia = 'MP 123456789')
    and exists (select 1 from portal.hitos where operacion_id = (select v from _ids where k='op1') and tipo = 'pago_recibido' and lado = 'sistema'), n::text);
exception when others then insert into _r (caso, ok, detalle) values ('Webhook registra un pago', false, sqlerrm); end $$;
reset role;

-- 9. Recibo, Mis pagos y Cobranza
set local role authenticated; select pg_temp.como('I');
do $$ declare r jsonb; begin
  r := portal.recibo((select v from _ids where k='pnov'));
  insert into _r (caso, ok, detalle) values ('I ve su recibo N° 1 a nombre de quien publica', (r ->> 'numero' is null) and (r ->> 'recibo')::integer = 1
    and r -> 'publicador' ->> 'nombre' = 'Gestora Prueba SRL' and r -> 'publicador' ->> 'cuit' = '30-11122233-4' and r -> 'unidad' ->> 'unidad' = '4 B' and coalesce(r ->> 'pagador', '') <> '', r::text);
  insert into _r (caso, ok, detalle) values ('Mis pagos de I: una operación con la seña y 13 cuotas (sin la anulada: 12)',
    jsonb_array_length(portal.mis_pagos()) = 1 and jsonb_array_length(portal.mis_pagos() -> 0 -> 'pagos') = 12 and jsonb_array_length(portal.mis_pagos() -> 0 -> 'reservas') = 1
    and portal.mis_pagos() -> 0 -> 'cuenta' ->> 'alias' = 'gestora.prueba',
    jsonb_array_length(portal.mis_pagos()) || ' ops · ' || jsonb_array_length(portal.mis_pagos() -> 0 -> 'pagos') || ' cuotas · ' || jsonb_array_length(portal.mis_pagos() -> 0 -> 'reservas') || ' reservas · ' || coalesce(portal.mis_pagos() -> 0 ->> 'cuenta', 'sin cuenta'));
exception when others then insert into _r (caso, ok, detalle) values ('I recibo y mis pagos', false, sqlerrm); end $$;
do $$ begin
  perform portal.recibo((select id from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2027-01'));
  insert into _r (caso, ok, detalle) values ('Sin pago no hay recibo', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Sin pago no hay recibo', sqlerrm like 'Esta cuota todavía no está paga%', sqlerrm); end $$;
select pg_temp.como('X');
do $$ begin
  perform portal.recibo((select v from _ids where k='pnov'));
  insert into _r (caso, ok, detalle) values ('X no ve el recibo', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('X no ve el recibo', sqlerrm like 'No sos parte%', sqlerrm); end $$;
select pg_temp.como('P');
do $$ declare c jsonb; begin
  c := portal.cobranza();
  insert into _r (caso, ok, detalle) values ('Cobranza de P: su cuenta y la operación con 13 cuotas',
    jsonb_array_length(c -> 'cuentas') = 1 and jsonb_array_length(c -> 'operaciones') = 1 and jsonb_array_length(c -> 'operaciones' -> 0 -> 'pagos') = 13
    and c -> 'operaciones' -> 0 ->> 'interesado' is not null, left(c::text, 300));
  insert into _r (caso, ok, detalle) values ('P lee la tabla de su cuenta', (select count(*) from portal.cuentas_cobro) = 1, null);
exception when others then insert into _r (caso, ok, detalle) values ('Cobranza', false, sqlerrm); end $$;

-- 10. Vencimientos: la seña que no se paga vence (cron con la clave de servicio); la cuota atrasada queda vencida
select pg_temp.como('I2');
do $$ begin
  insert into _ids values ('r2', portal.pedir_reserva((select v from _ids where k='op2'), 900, null, 1));
  insert into _r (caso, ok, detalle) values ('I2 pide reserva con 1 hora de plazo (moneda de la operación)', (select moneda from portal.reservas where id = (select v from _ids where k='r2')) = 'USD', null);
exception when others then insert into _r (caso, ok, detalle) values ('I2 pide reserva', false, sqlerrm); end $$;
do $$ begin
  perform portal.vencer_reservas();
  insert into _r (caso, ok, detalle) values ('I2 no corre el vencimiento', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('I2 no corre el vencimiento', sqlerrm like 'Solo el sistema%', sqlerrm); end $$;
reset role;
update portal.reservas set vence_en = now() - interval '1 minute' where id = (select v from _ids where k='r2');
update portal.pagos set vencimiento = current_date - 3 where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2027-01';
set local role service_role; select pg_temp.servicio();
do $$ declare n integer; begin
  n := portal.vencer_reservas();
  insert into _r (caso, ok, detalle) values ('Cron: vence la seña (paso del sistema) y marca la cuota atrasada', n = 1
    and (select estado from portal.reservas where id = (select v from _ids where k='r2')) = 'vencida'
    and exists (select 1 from portal.hitos where operacion_id = (select v from _ids where k='op2') and tipo = 'reserva_vencida' and lado = 'sistema')
    and (select estado from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2027-01') = 'vencido', n::text);
exception when others then insert into _r (caso, ok, detalle) values ('Cron vence', false, sqlerrm); end $$;
reset role;
set local role authenticated; select pg_temp.como('P');
do $$ declare n integer; begin
  n := portal.registrar_pago((select id from portal.pagos where operacion_id = (select v from _ids where k='op1') and concepto = 'alquiler' and periodo = '2027-01'), null);
  insert into _r (caso, ok, detalle) values ('La cuota atrasada se puede cobrar: recibo 4', n = 4, n::text);
exception when others then insert into _r (caso, ok, detalle) values ('Cuota atrasada', false, sqlerrm); end $$;

-- 11. Cancelar y devolver
select pg_temp.como('I2');
do $$ begin
  insert into _ids values ('r3', portal.pedir_reserva((select v from _ids where k='op2'), 900, 'USD', 24));
  perform portal.cancelar_reserva((select v from _ids where k='r3'), 'Me arrepentí');
  insert into _ids values ('r4', portal.pedir_reserva((select v from _ids where k='op2'), 900, 'USD', 24));
  insert into _r (caso, ok, detalle) values ('I2 cancela su pedido y vuelve a pedir',
    (select estado from portal.reservas where id = (select v from _ids where k='r3')) = 'cancelada' and (select estado from portal.reservas where id = (select v from _ids where k='r4')) = 'pedida', null);
exception when others then insert into _r (caso, ok, detalle) values ('I2 cancela y vuelve a pedir', false, sqlerrm); end $$;
select pg_temp.como('P');
do $$ begin
  perform portal.confirmar_reserva((select v from _ids where k='r4'), null);
  perform portal.devolver_reserva((select v from _ids where k='r4'), 'No se firmó');
  insert into _r (caso, ok, detalle) values ('P confirma y después devuelve la seña',
    (select estado = 'devuelta' and motivo = 'No se firmó' from portal.reservas where id = (select v from _ids where k='r4'))
    and exists (select 1 from portal.hitos where operacion_id = (select v from _ids where k='op2') and tipo = 'reserva_devuelta' and lado = 'publicador'), null);
exception when others then insert into _r (caso, ok, detalle) values ('P devuelve la seña', false, sqlerrm); end $$;

-- 11b. Al abrir la operación, lo vencido vence solo (sin esperar al cron) y la lectura lo cuenta
select pg_temp.como('I2');
do $$ begin
  insert into _ids values ('r5', portal.pedir_reserva((select v from _ids where k='op2'), 900, 'USD', 1));
exception when others then insert into _r (caso, ok, detalle) values ('I2 pide otra reserva', false, sqlerrm); end $$;
reset role;
update portal.reservas set vence_en = now() - interval '1 minute' where id = (select v from _ids where k='r5');
set local role authenticated; select pg_temp.como('I2');
do $$ declare d jsonb; begin
  d := portal.pagos_de_operacion((select v from _ids where k='op2'));
  insert into _r (caso, ok, detalle) values ('Al leer, la seña fuera de plazo vence y se avisa (vencidas = 1)',
    (d ->> 'vencidas')::integer = 1 and (select estado from portal.reservas where id = (select v from _ids where k='r5')) = 'vencida'
    and (select count(*) from portal.hitos where operacion_id = (select v from _ids where k='op2') and tipo = 'reserva_vencida') = 2
    and (portal.pagos_de_operacion((select v from _ids where k='op2')) ->> 'vencidas')::integer = 0, d ->> 'vencidas');
exception when others then insert into _r (caso, ok, detalle) values ('Vence al leer', false, sqlerrm); end $$;

-- 12. La plataforma ve los cargos: solo a quien publica y al propietario, nunca al inquilino
select pg_temp.como('C');
do $$ begin
  insert into _r (caso, ok, detalle) values ('Reserva online: USD 80 a quien publica, simulado (dos señas confirmadas)',
    (select count(*) from portal.cargos c join portal.hitos h on h.id = c.hito_id where h.tipo = 'reserva_pagada' and c.escenario = 'Rieles · octubre 2026'
      and c.concepto = 'Reserva online' and c.monto = 80 and c.moneda = 'USD' and c.paga = 'publicador' and c.estado = 'simulado') = 2,
    (select string_agg(c.concepto || ' ' || c.monto || ' ' || c.moneda || ' ' || c.paga || ' ' || c.estado, ' | ') from portal.cargos c join portal.hitos h on h.id = c.hito_id where h.tipo = 'reserva_pagada'));
  insert into _r (caso, ok, detalle) values ('Cobranza digital: 2 % al propietario, simulado (USD 24 y ARS 1700)',
    exists (select 1 from portal.cargos where concepto = 'Cobranza digital' and monto = 24 and moneda = 'USD' and paga = 'propietario' and estado = 'simulado')
    and exists (select 1 from portal.cargos where concepto = 'Cobranza digital' and monto = 1700 and moneda = 'ARS' and paga = 'propietario' and estado = 'simulado'),
    (select string_agg(concepto || ' ' || monto || ' ' || moneda || ' ' || paga, ' | ') from portal.cargos where concepto = 'Cobranza digital'));
  insert into _r (caso, ok, detalle) values ('No se le cobra nada al inquilino',
    not exists (select 1 from portal.cargos c join portal.operaciones o on o.id = c.operacion_id where c.paga = 'interesado' and coalesce(o.linea, '') <> 'temporario')
    and not exists (select 1 from portal.cargos where estado <> 'simulado'), null);
  insert into _r (caso, ok, detalle) values ('La plataforma ve los pagos de la operación', jsonb_array_length(portal.pagos_de_operacion((select v from _ids where k='op1')) -> 'pagos') = 13, null);
exception when others then insert into _r (caso, ok, detalle) values ('Cargos', false, sqlerrm); end $$;
do $$ begin
  insert into portal.reglas_cobro (escenario, concepto, linea, evento, paga, modo, valor, moneda, base) values ('Trampa', 'Cobro al inquilino', 'mediano', 'pago_recibido', 'interesado', 'porcentaje', 1, 'USD', 'monto_hito');
  insert into _r (caso, ok, detalle) values ('Ninguna regla puede cobrarle al inquilino de vivienda', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Ninguna regla puede cobrarle al inquilino de vivienda', sqlerrm like '%m28_regla_inquilino%', sqlerrm); end $$;

-- 13. Sin sesión
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op1'), 1, 'USD', 1);
  insert into _r (caso, ok, detalle) values ('Sin sesión: no llama a las funciones', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Sin sesión: no llama a las funciones', sqlerrm like 'permission denied%', sqlerrm); end $$;
do $$ begin
  perform 1 from portal.reservas;
  insert into _r (caso, ok, detalle) values ('Sin sesión: no lee reservas', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Sin sesión: no lee reservas', sqlerrm like 'permission denied%', sqlerrm); end $$;
reset role;
set local role authenticated; select pg_temp.como('P');
do $$ begin
  perform 1 from portal.mp_credenciales;
  insert into _r (caso, ok, detalle) values ('Nadie con sesión lee los tokens de Mercado Pago', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Nadie con sesión lee los tokens de Mercado Pago', sqlerrm like 'permission denied%', sqlerrm); end $$;
do $$ begin
  perform portal._vencer_reservas(null);
  insert into _r (caso, ok, detalle) values ('Las funciones internas no se llaman desde afuera', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Las funciones internas no se llaman desde afuera', sqlerrm like 'permission denied%', sqlerrm); end $$;

-- 14. Identidad: con la columna del módulo de identidad, reservar exige 'verificada' (se resuelve en ejecución)
reset role;
alter table portal.personas add column if not exists identidad_estado text;
set local role authenticated; select pg_temp.como('I2');
do $$ declare d jsonb; begin
  d := portal.pagos_de_operacion((select v from _ids where k='op2'));
  insert into _r (caso, ok, detalle) values ('Con módulo de identidad, Pagos lo avisa', (d -> 'identidad' ->> 'requerida')::boolean and not (d -> 'identidad' ->> 'ok')::boolean, d -> 'identidad' ::text);
exception when others then insert into _r (caso, ok, detalle) values ('Con módulo de identidad, Pagos lo avisa', false, sqlerrm); end $$;
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op2'), 900, 'USD', 24);
  insert into _r (caso, ok, detalle) values ('Sin identidad verificada no se reserva', false, 'entró');
exception when others then insert into _r (caso, ok, detalle) values ('Sin identidad verificada no se reserva', sqlerrm like 'Para reservar, primero verificá%', sqlerrm); end $$;
reset role;
insert into portal.personas (auth_user_id, nombre, email, identidad_estado) values ((select v from _ids where k='I2'), 'Ivana', 'i2-m31@prueba.local', 'verificada');
set local role authenticated; select pg_temp.como('I2');
do $$ begin
  perform portal.pedir_reserva((select v from _ids where k='op2'), 900, 'USD', 24);
  insert into _r (caso, ok, detalle) values ('Con identidad verificada, sí', true, null);
exception when others then insert into _r (caso, ok, detalle) values ('Con identidad verificada, sí', false, sqlerrm); end $$;
reset role;

select n, caso, ok, left(detalle, 300) as detalle from _r order by n;
`; }
