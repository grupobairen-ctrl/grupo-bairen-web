/* BAIREN · Portal · Rieles: reservas y cobranza (migración 31, 9/10/2026).
   Regla de oro: la plata nunca pasa por una cuenta de BAIREN. La seña y cada cuota van directo a la cuenta de quien
   publica (transferencia a su alias o CBU; Mercado Pago con split, todavía sin claves). BAIREN registra el paso y el
   motor de cobro lo pasa por las reglas, en simulación.

   Qué suma este archivo:
   · window.BPPagos: la API de datos (con base, por las funciones de la migración 31; sin base, por localStorage con las
     mismas reglas) y las piezas que comparte con pagos.html (la hoja de abajo, la hoja "Cómo pagar", formatos).
   · En mensajes.html, por BPDigital: los pasos de la operación ("Reservar", "Pagar la seña", "Pagar el alquiler",
     "Confirmar seña recibida", "Armar cuotas", "Marcar pagado"…), con un solo paso principal por estado y su estado en
     una línea; y la sección "Pagos" de los detalles.
   Identidad: si el módulo de identidad está (con base: portal.personas.identidad_estado; sin base: BPDigital.
   identidadEstado() o d.ext.identidad.estado), reservar exige 'verificada'. */
(function(){
  'use strict';
  const D = window.BPDigital; if (!D) return;
  const S = () => window.BPStore;
  const T = (k, d) => (window.BP && BP.t) ? BP.t('dg_pagos_' + k, d) : d;
  const TF = (k, d, v) => (window.BP && BP.tf) ? BP.tf('dg_pagos_' + k, d, v) : String(d).replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = {};
  const QUIETO = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* Los estilos (en mensajes.html se suman solos; pagos.html los trae en el head) */
  (function(){ try { if (document.querySelector('link[href*="css/pagos.css"]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/pagos.css?v=20261010b'; document.head.appendChild(l); } catch (e) {} })();

  /* ── formatos ──────────────────────────────────────────── */
  const LOC = () => (window.BP && BP.LOCALE) ? BP.LOCALE() : 'es-AR';
  const dos = n => String(n).padStart(2, '0');
  P.fmt = (n, m) => n == null || n === '' ? '' : (m === 'ARS' ? '$ ' : 'USD ') + Number(n).toLocaleString(LOC(), { maximumFractionDigits: 2 });
  const fechaDe = v => { if (!v) return null; const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00') : new Date(v); return isNaN(d) ? null : d; };
  /* Hoy en Buenos Aires (UTC-3, sin horario de verano), como 'AAAA-MM-DD' */
  P.hoy = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  P.dia = v => { const d = fechaDe(v); if (!d) return ''; return d.getDate() + '/' + (d.getMonth() + 1) + (d.getFullYear() !== new Date().getFullYear() ? '/' + d.getFullYear() : ''); };
  P.diaHora = v => { const d = fechaDe(v); if (!d) return ''; let w = ''; try { w = d.toLocaleDateString(LOC(), { weekday: 'short' }).replace(/\.$/, '') + ' '; } catch (e) {} return w + P.dia(v) + ', ' + dos(d.getHours()) + ':' + dos(d.getMinutes()); };
  /* "noviembre" (o "noviembre de 2027" si no es de este año) */
  P.mes = (per, siempreAnio) => {
    const m = /^(\d{4})-(\d{2})$/.exec(per || ''); if (!m) return per || '';
    const conAnio = siempreAnio || +m[1] !== new Date().getFullYear();
    try { return new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(LOC(), conAnio ? { month: 'long', year: 'numeric' } : { month: 'long' }); } catch (e) { return per; }
  };
  P.cuotaTxt = p => p.concepto === 'deposito' ? T('c_deposito', 'Depósito')
    : p.concepto === 'expensas' ? TF('c_expensas', 'Expensas de {m}', { m: P.mes(p.periodo) }) : TF('c_alquiler', 'Alquiler de {m}', { m: P.mes(p.periodo) });
  /* El CBU en sus dos bloques (banco y sucursal · cuenta), como lo muestran los bancos */
  P.cbuTxt = c => { const x = String(c || ''); return x.length === 22 ? x.slice(0, 8) + ' ' + x.slice(8) : x; };
  P.reciboTxt = n => 'N° ' + String(n || 0).padStart(4, '0');

  /* ── estados ───────────────────────────────────────────── */
  const ORDEN_C = { alquiler: 0, expensas: 1, deposito: 2 };
  P.vigente = r => r.estado === 'pedida' && new Date(r.vence_en) > new Date();
  P.estadoReserva = r => r.estado === 'pedida' && !P.vigente(r) ? 'vencida' : r.estado;
  P.estadoCuota = p => {
    if (p.estado === 'pagado') return 'pagada'; if (p.estado === 'anulado') return 'anulada';
    if (p.estado === 'vencido' || p.vencimiento < P.hoy()) return 'atrasada';
    return (fechaDe(p.vencimiento) - fechaDe(P.hoy())) / 864e5 <= 5 ? 'por_vencer' : 'pendiente';
  };
  const PILL = {
    pagada: ['al-dia', 'Pagada'], anulada: ['neutra', 'Anulada'], atrasada: ['atrasada', 'Atrasada'], por_vencer: ['por-vencer', 'Por vencer'], pendiente: ['neutra', 'Pendiente'],
    pedida: ['por-vencer', 'Por pagar'], vencida: ['neutra', 'Vencida'], devuelta: ['neutra', 'Devuelta'], cancelada: ['neutra', 'Cancelada']
  };
  P.pill = (est, base) => { const p = PILL[est] || ['neutra', est]; return `<span class="${base || 'pg-pill'} pg-pill-${p[0]}">${esc(T('e_' + est, p[1]))}</span>`; };
  P.reservaPedida = x => ((x && x.reservas) || []).find(P.vigente) || null;
  P.reservaPagada = x => ((x && x.reservas) || []).find(r => r.estado === 'pagada') || null;
  P.porPagar = x => ((x && x.pagos) || []).filter(p => p.estado === 'pendiente' || p.estado === 'vencido')
    .sort((a, b) => String(a.vencimiento).localeCompare(String(b.vencimiento)) || (ORDEN_C[a.concepto] - ORDEN_C[b.concepto]));
  P.proxima = x => P.porPagar(x)[0] || null;
  /* Una cuota "se puede pagar ya" si está atrasada o vence en los próximos 15 días */
  P.cerca = p => !!p && (P.estadoCuota(p) === 'atrasada' || (fechaDe(p.vencimiento) - fechaDe(P.hoy())) / 864e5 <= 15);
  const esAlquiler = op => !(op.linea === 'venta' || op.linea === 'pozo' || (!op.linea && op.tipo === 'venta'));

  /* ═══════════════ Datos: con base o local ═══════════════ */
  const conBase = () => D.conBase();
  const rpc = (fn, args) => D.rpc(fn, args);
  const L = D._local;
  const K = { cuentas: L.LS('bp_dg_pg_cuentas'), reservas: L.LS('bp_dg_pg_reservas'), pagos: L.LS('bp_dg_pg_pagos'), recibos: L.LS('bp_dg_pg_recibos'), hitos: L.LS('bp_dg_hitos') };
  const sesion = () => { const s = S() && S().session; if (!s) throw new Error(T('err_sesion', 'Ingresá para seguir.')); return s; };
  const opLocal = id => L.ops().find(o => o.id === id) || null;
  const ladoDe = lados => lados.indexOf('interesado') > -1 ? 'interesado' : lados.indexOf('publicador') > -1 ? 'publicador' : 'plataforma';
  async function ladosOp(op){ return op ? L.ladosLocal(op) : []; }
  const jsonR = r => ({ id: r.id, monto: r.monto, moneda: r.moneda, vence_en: r.vence_en, estado: r.estado, proveedor: r.proveedor, referencia: r.referencia || null, motivo: r.motivo || null, pedida_en: r.pedida_en, pagada_en: r.pagada_en || null, vencida_en: r.vencida_en || null, devuelta_en: r.devuelta_en || null, cancelada_en: r.cancelada_en || null });
  const jsonP = p => ({ id: p.id, concepto: p.concepto, periodo: p.periodo, monto: p.monto, moneda: p.moneda, vencimiento: p.vencimiento, estado: p.estado, proveedor: p.proveedor || null, referencia: p.referencia || null, pagado_en: p.pagado_en || null, recibo: p.recibo || null });
  const reservasDe = opId => K.reservas.get([]).filter(r => r.operacion_id === opId).sort((a, b) => String(b.pedida_en).localeCompare(String(a.pedida_en))).map(jsonR);
  const pagosDe = (opId, conAnuladas) => K.pagos.get([]).filter(p => p.operacion_id === opId && (conAnuladas || p.estado !== 'anulado'))
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || (ORDEN_C[a.concepto] - ORDEN_C[b.concepto])).map(jsonP);
  const cuentaManual = pubId => K.cuentas.get([]).find(c => c.publicador_id === pubId && c.proveedor === 'manual' && c.estado === 'activa') || null;
  const cuentaPublica = c => c ? { titular: c.titular, alias: c.alias || null, cbu: c.cbu || null, nota: c.nota || null } : null;
  const algoParaPagar = opId => K.reservas.get([]).some(r => r.operacion_id === opId && r.estado === 'pedida') || K.pagos.get([]).some(p => p.operacion_id === opId && (p.estado === 'pendiente' || p.estado === 'vencido'));
  async function identidadLocal(){
    if (typeof D.identidadEstado !== 'function') return { requerida: false, ok: true };
    try { return { requerida: true, ok: (await D.identidadEstado()) === 'verificada' }; } catch (e) { return { requerida: true, ok: false }; }
  }
  /* Vence lo que ya venció (como portal._vencer_reservas): seña pedida fuera de plazo y cuotas atrasadas */
  function vencerLocal(opId){
    const ahora = new Date(); let n = 0;
    const rs = K.reservas.get([]); const vencidas = [];
    rs.forEach(r => { if (r.estado === 'pedida' && new Date(r.vence_en) <= ahora && (!opId || r.operacion_id === opId)) { r.estado = 'vencida'; r.vencida_en = L.now(); vencidas.push(r); n++; } });
    if (vencidas.length) { K.reservas.set(rs); vencidas.forEach(r => { try { D._hitoLocal(r.operacion_id, 'reserva_vencida', 'sistema', { reserva_id: r.id }); } catch (e) {} }); }
    const ps = K.pagos.get([]); let cambio = false; const hoy = P.hoy();
    ps.forEach(p => { if (p.estado === 'pendiente' && p.vencimiento < hoy && (!opId || p.operacion_id === opId)) { p.estado = 'vencido'; cambio = true; } });
    if (cambio) K.pagos.set(ps);
    return n;
  }
  const exigir = (cond, msg) => { if (!cond) throw new Error(msg); };
  const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; };

  /* Lo de una operación: { lado, reservas, pagos, cuenta, cuenta_cargada, mp, identidad } */
  P.deOperacion = async function(opId){
    sesion();
    if (conBase()) return rpc('pagos_de_operacion', { p_op: opId });
    const op = opLocal(opId); const lados = await ladosOp(op);
    exigir(lados.length, T('err_no_parte', 'No sos parte de esta operación.'));
    const lado = ladoDe(lados);
    const vencidas = vencerLocal(opId);
    const c = cuentaManual(op.publicador_id);
    const ver = lado !== 'interesado' || algoParaPagar(opId);
    return { lado, vencidas, reservas: reservasDe(opId), pagos: pagosDe(opId, lado !== 'interesado'), cuenta: c && ver ? cuentaPublica(c) : null, cuenta_cargada: !!c, mp: false,
      identidad: lado === 'interesado' ? await identidadLocal() : { requerida: (await identidadLocal()).requerida, ok: null } };
  };

  P.pedirReserva = async function(opId, monto, moneda, horas){
    sesion();
    if (conBase()) return rpc('pedir_reserva', { p_op: opId, p_monto: monto, p_moneda: moneda || null, p_horas: horas || 48 });
    const op = opLocal(opId); const lados = await ladosOp(op);
    exigir(lados.indexOf('interesado') > -1, T('err_solo_busca', 'Solo quien busca pide la reserva.'));
    exigir(op.etapa !== 'caida' && op.etapa !== 'cerrada', T('err_cerrada', 'La operación está cerrada.'));
    exigir(D.ordenEtapa(op.etapa) < 6, T('err_paso', 'La operación ya pasó la reserva.'));
    const sol = K.hitos.get([]).filter(h => h.operacion_id === opId && /^solicitud_(enviada|aceptada|rechazada)$/.test(h.tipo)).pop();
    exigir(sol, T('err_avanzar', 'Primero avisá que querés avanzar.'));
    exigir(sol.tipo !== 'solicitud_rechazada', T('err_rechazada', 'La solicitud fue rechazada.'));
    const idn = await identidadLocal(); exigir(!idn.requerida || idn.ok, T('err_identidad', 'Para reservar, primero verificá tu identidad.'));
    const m = num(monto); exigir(m > 0 && m < 1e9, T('err_monto_sena', 'Revisá el monto de la seña.'));
    const mon = moneda || op.moneda || 'USD'; exigir(mon === 'USD' || mon === 'ARS', T('err_moneda', 'La moneda es USD o ARS.'));
    const h = Math.round(horas || 48); exigir(h >= 1 && h <= 168, T('err_plazo', 'El plazo para pagar la seña va de 1 a 168 horas.'));
    vencerLocal(opId);
    exigir(!K.reservas.get([]).some(r => r.operacion_id === opId && (r.estado === 'pedida' || r.estado === 'pagada')), T('err_en_curso', 'Ya hay una reserva en curso para esta operación.'));
    const r = { id: L.uid(), operacion_id: opId, publicador_id: op.publicador_id, monto: m, moneda: mon, vence_en: new Date(Date.now() + h * 3600e3).toISOString(), estado: 'pedida', proveedor: 'manual', referencia: null, motivo: null, pedida_por: S().session.id, pedida_en: L.now() };
    const rs = K.reservas.get([]); rs.push(r); K.reservas.set(rs);
    D._hitoLocal(opId, 'reserva_pedida', 'interesado', { reserva_id: r.id, monto: m, moneda: mon, vence_en: r.vence_en });
    return r.id;
  };
  /* Con base: confirmar_reserva / devolver_reserva / cancelar_reserva. Sin base, las mismas reglas. */
  async function reservaLocal(id, lado, msg){
    const r = K.reservas.get([]).find(x => x.id === id); exigir(r, T('err_no_reserva', 'La reserva no existe.'));
    const lados = await ladosOp(opLocal(r.operacion_id));
    exigir(Array.isArray(lado) ? lado.some(l => lados.indexOf(l) > -1) : lados.indexOf(lado) > -1, msg);
    return r;
  }
  function guardarReserva(r){ const rs = K.reservas.get([]); const i = rs.findIndex(x => x.id === r.id); rs[i] = r; K.reservas.set(rs); }
  P.confirmarReserva = async function(id, referencia){
    sesion();
    if (conBase()) return rpc('confirmar_reserva', { p_reserva: id, p_referencia: referencia || null });
    const r = await reservaLocal(id, 'publicador', T('err_solo_pub_sena', 'Solo quien publica confirma la seña.'));
    const op = opLocal(r.operacion_id);
    exigir(r.estado !== 'pagada', T('err_ya_confirmada', 'La seña ya está confirmada.'));
    exigir(r.estado === 'pedida' || r.estado === 'vencida', T('err_no_pendiente', 'Esta reserva ya no está pendiente.'));
    exigir(op.etapa !== 'caida' && op.etapa !== 'cerrada', T('err_cerrada', 'La operación está cerrada.'));
    exigir(r.estado !== 'vencida' || !K.reservas.get([]).some(x => x.operacion_id === r.operacion_id && x.id !== r.id && (x.estado === 'pedida' || x.estado === 'pagada')), T('err_otra', 'Hay otra reserva en curso para esta operación.'));
    const ref = String(referencia || '').trim().slice(0, 120) || null;
    Object.assign(r, { estado: 'pagada', pagada_en: L.now(), referencia: ref || r.referencia, proveedor: 'manual' }); guardarReserva(r);
    return D._hitoLocal(r.operacion_id, 'reserva_pagada', 'publicador', Object.assign({ reserva_id: r.id, monto: r.monto, moneda: r.moneda }, ref ? { referencia: ref } : {}));
  };
  P.devolverReserva = async function(id, motivo){
    sesion();
    if (conBase()) return rpc('devolver_reserva', { p_reserva: id, p_motivo: motivo || null });
    const r = await reservaLocal(id, 'publicador', T('err_solo_pub_dev', 'Solo quien publica devuelve la seña.'));
    exigir(r.estado === 'pagada', T('err_dev', 'Solo se devuelve una seña pagada.'));
    const mot = String(motivo || '').trim().slice(0, 300) || null;
    Object.assign(r, { estado: 'devuelta', devuelta_en: L.now(), motivo: mot || r.motivo }); guardarReserva(r);
    return D._hitoLocal(r.operacion_id, 'reserva_devuelta', 'publicador', Object.assign({ reserva_id: r.id, monto: r.monto, moneda: r.moneda }, mot ? { motivo: mot } : {}));
  };
  P.cancelarReserva = async function(id, motivo){
    sesion();
    if (conBase()) return rpc('cancelar_reserva', { p_reserva: id, p_motivo: motivo || null });
    const r = await reservaLocal(id, ['interesado', 'publicador'], T('err_no_parte', 'No sos parte de esta operación.'));
    exigir(r.estado === 'pedida', T('err_cancelar', 'Solo se cancela una reserva que todavía no se pagó.'));
    Object.assign(r, { estado: 'cancelada', cancelada_en: L.now(), motivo: String(motivo || '').trim().slice(0, 300) || r.motivo }); guardarReserva(r);
    return null;
  };

  /* o: { desde: 'AAAA-MM', meses, monto, moneda, dia, concepto: alquiler|expensas|deposito } → cuántas cuotas nuevas */
  P.armarCuotas = async function(opId, o){
    sesion();
    if (conBase()) return rpc('armar_cuotas', { p_op: opId, p_desde: (o.desde || '').slice(0, 7) + '-01', p_meses: o.meses, p_monto: o.monto, p_moneda: o.moneda || null, p_dia_venc: o.dia || 10, p_concepto: o.concepto || 'alquiler' });
    const op = opLocal(opId); const lados = await ladosOp(op);
    exigir(lados.indexOf('publicador') > -1, T('err_solo_pub_cuotas', 'Solo quien publica arma las cuotas.'));
    exigir(op.etapa !== 'caida', T('err_caida', 'La operación quedó sin acuerdo.'));
    exigir(esAlquiler(op), T('err_venta', 'Las cuotas son para alquileres.'));
    const con = o.concepto || 'alquiler'; exigir(ORDEN_C[con] != null, T('err_concepto', 'El concepto es alquiler, depósito o expensas.'));
    const m0 = /^(\d{4})-(\d{2})/.exec(o.desde || ''); exigir(m0, T('err_desde', 'Falta desde qué mes.'));
    const meses = Math.round(+o.meses); exigir(meses >= 1 && meses <= 60, T('err_meses', 'Las cuotas van de 1 a 60 meses.'));
    const monto = num(o.monto); exigir(monto > 0 && monto < 1e9, T('err_monto', 'Revisá el monto.'));
    const dia = Math.round(+(o.dia || 10)); exigir(dia >= 1 && dia <= 31, T('err_dia', 'El día de vencimiento va de 1 a 31.'));
    const mon = o.moneda || op.moneda || 'USD'; exigir(mon === 'USD' || mon === 'ARS', T('err_moneda', 'La moneda es USD o ARS.'));
    const ps = K.pagos.get([]); let n = 0;
    for (let i = 0; i < meses; i++) {
      const f = new Date(Date.UTC(+m0[1], +m0[2] - 1 + i, 1)); const y = f.getUTCFullYear(), mm = f.getUTCMonth();
      const per = y + '-' + dos(mm + 1); const ult = new Date(Date.UTC(y, mm + 1, 0)).getUTCDate();
      if (ps.some(p => p.operacion_id === opId && p.concepto === con && p.periodo === per && p.estado !== 'anulado')) continue;
      ps.push({ id: L.uid(), operacion_id: opId, publicador_id: op.publicador_id, concepto: con, periodo: per, monto, moneda: mon, vencimiento: per + '-' + dos(Math.min(dia, ult)), estado: 'pendiente', proveedor: null, referencia: null, pagado_en: null, recibo: null, creado_por: S().session.id, creado_en: L.now() });
      n++;
    }
    K.pagos.set(ps);
    const ops = L.ops(); const o2 = ops.find(x => x.id === opId); if (o2) { o2.actualizada_en = L.now(); L.guardarOps(ops); }
    return n;
  };
  /* → el número de recibo */
  P.registrarPago = async function(id, referencia){
    sesion();
    if (conBase()) return rpc('registrar_pago', { p_pago: id, p_referencia: referencia || null });
    const ps = K.pagos.get([]); const p = ps.find(x => x.id === id); exigir(p, T('err_no_cuota', 'La cuota no existe.'));
    const op = opLocal(p.operacion_id); const lados = await ladosOp(op);
    exigir(lados.indexOf('publicador') > -1, T('err_solo_pub_pago', 'Solo quien publica marca un pago.'));
    exigir(p.estado !== 'pagado', T('err_ya_paga', 'Esta cuota ya está paga.'));
    exigir(p.estado !== 'anulado', T('err_anulada', 'Esta cuota está anulada.'));
    exigir(op.etapa !== 'caida', T('err_caida', 'La operación quedó sin acuerdo.'));
    const nums = K.recibos.get({}); const n = (nums[p.publicador_id] || 0) + 1; nums[p.publicador_id] = n; K.recibos.set(nums);
    const ref = String(referencia || '').trim().slice(0, 120) || null;
    Object.assign(p, { estado: 'pagado', pagado_en: L.now(), recibo: n, referencia: ref || p.referencia, proveedor: 'manual' }); K.pagos.set(ps);
    D._hitoLocal(p.operacion_id, 'pago_recibido', 'publicador', { monto: p.monto, moneda: p.moneda, periodo: p.periodo, concepto: p.concepto, pago_id: p.id, recibo: n });
    return n;
  };
  P.anularPago = async function(id){
    sesion();
    if (conBase()) return rpc('anular_pago', { p_pago: id });
    const ps = K.pagos.get([]); const p = ps.find(x => x.id === id); exigir(p, T('err_no_cuota', 'La cuota no existe.'));
    exigir((await ladosOp(opLocal(p.operacion_id))).indexOf('publicador') > -1, T('err_solo_pub_anular', 'Solo quien publica anula una cuota.'));
    exigir(p.estado === 'pendiente' || p.estado === 'vencido', T('err_anular', 'Solo se anula una cuota sin pagar.'));
    p.estado = 'anulado'; K.pagos.set(ps); return null;
  };

  /* La cuenta de cobro manual de un publicador: { titular, alias, cbu, nota } */
  P.guardarCuenta = async function(pubId, c){
    sesion();
    if (conBase()) return rpc('guardar_cuenta_cobro', { p_pub: pubId, p_titular: c.titular || null, p_alias: c.alias || null, p_cbu: c.cbu || null, p_nota: c.nota || null });
    const mio = await L.miPub(); exigir(mio && mio.id === pubId, T('err_solo_pub_cuenta', 'Solo quien publica carga su cuenta de cobro.'));
    const tit = String(c.titular || '').trim(), alias = String(c.alias || '').trim().toLowerCase() || null, cbu = String(c.cbu || '').replace(/\D/g, '') || null, nota = String(c.nota || '').trim() || null;
    exigir(tit.length >= 2 && tit.length <= 120, T('err_titular', 'Poné el titular de la cuenta.'));
    exigir(alias || cbu, T('err_alias_cbu', 'Poné el alias o el CBU.'));
    exigir(!alias || /^[a-z0-9.-]{6,20}$/.test(alias), T('err_alias', 'Revisá el alias: de 6 a 20 letras, números, puntos o guiones.'));
    exigir(!cbu || cbu.length === 22, T('err_cbu', 'Revisá el CBU o CVU: son 22 números.'));
    exigir(!nota || nota.length <= 300, T('err_nota', 'La nota es muy larga.'));
    const cs = K.cuentas.get([]); let x = cs.find(y => y.publicador_id === pubId && y.proveedor === 'manual');
    if (!x) { x = { id: L.uid(), publicador_id: pubId, proveedor: 'manual', creado_en: L.now() }; cs.push(x); }
    Object.assign(x, { titular: tit, alias, cbu, nota, estado: 'activa', actualizado_en: L.now() }); K.cuentas.set(cs);
    return x.id;
  };

  /* "Mis pagos" de quien busca: [{ operacion_id, etapa, linea, aviso_titulo, aviso_lugar, foto, publicador_nombre, reservas, pagos, cuenta, mp }] */
  P.misPagos = async function(){
    const ses = sesion();
    if (conBase()) return rpc('mis_pagos');
    vencerLocal();
    const conAlgo = id => K.reservas.get([]).some(r => r.operacion_id === id) || K.pagos.get([]).some(p => p.operacion_id === id);
    return L.ops().filter(o => o.interesado_user === ses.id && conAlgo(o.id)).sort((a, b) => String(b.actualizada_en).localeCompare(String(a.actualizada_en))).map(o => ({
      operacion_id: o.id, etapa: o.etapa, linea: o.linea, aviso_titulo: o.aviso && o.aviso.titulo, aviso_lugar: o.aviso && (o.aviso.barrio || o.aviso.direccion), foto: o.aviso && o.aviso.foto,
      publicador_nombre: o.publicador_nombre, reservas: reservasDe(o.id), pagos: pagosDe(o.id), cuenta: algoParaPagar(o.id) ? cuentaPublica(cuentaManual(o.publicador_id)) : null, mp: false }));
  };
  /* "Cobranza" de quien publica: { publicadores, cuentas, operaciones: [{ operacion_id, publicador_id, etapa, linea, aviso_titulo, aviso_direccion, interesado, reservas, pagos }] } */
  P.cobranza = async function(){
    sesion();
    if (conBase()) return rpc('cobranza');
    vencerLocal();
    const pub = await L.miPub(); if (!pub) return { publicadores: [], cuentas: [], operaciones: [] };
    const conAlgo = id => K.reservas.get([]).some(r => r.operacion_id === id) || K.pagos.get([]).some(p => p.operacion_id === id);
    const nombre = e => { const s = String(e || '').split('@')[0].split('.')[0]; return s ? s.charAt(0).toUpperCase() + s.slice(1) : T('interesado', 'Interesado'); };
    return {
      publicadores: [{ id: pub.id, nombre: pub.nombre }],
      cuentas: K.cuentas.get([]).filter(c => c.publicador_id === pub.id).map(c => ({ publicador_id: c.publicador_id, proveedor: c.proveedor, titular: c.titular, alias: c.alias, cbu: c.cbu, nota: c.nota, estado: c.estado, mp_user_id: null, actualizado_en: c.actualizado_en })),
      operaciones: L.ops().filter(o => o.publicador_id === pub.id && conAlgo(o.id)).sort((a, b) => String(b.actualizada_en).localeCompare(String(a.actualizada_en))).map(o => ({
        operacion_id: o.id, publicador_id: o.publicador_id, etapa: o.etapa, linea: o.linea, aviso_titulo: o.aviso && o.aviso.titulo,
        aviso_direccion: o.aviso && [o.aviso.direccion, o.aviso.barrio].filter(Boolean).join(' · '), interesado: nombre(o.interesado_email), reservas: reservasDe(o.id), pagos: pagosDe(o.id, true) }))
    };
  };
  /* 9/10 · "Todos", para el equipo de BAIREN (migración 37): las señas y cuotas de todas las operaciones, solo lectura.
     Mismo formato que la cobranza, más el nombre de quien publica. En modo local, cualquiera con sesión es del equipo. */
  P.deTodos = async function(){
    sesion();
    if (conBase()) return rpc('pagos_de_todos');
    vencerLocal();
    const conAlgo = id => K.reservas.get([]).some(r => r.operacion_id === id) || K.pagos.get([]).some(p => p.operacion_id === id);
    const nombre = e => { const s = String(e || '').split('@')[0].split('.')[0]; return s ? s.charAt(0).toUpperCase() + s.slice(1) : T('interesado', 'Interesado'); };
    const pubs = L.LS('bp_publicadores').get([]);
    const pubNombre = o => o.publicador_nombre || ((pubs.find(x => x.id === o.publicador_id) || {}).nombre) || '';
    return { operaciones: L.ops().filter(o => conAlgo(o.id)).sort((a, b) => String(b.actualizada_en).localeCompare(String(a.actualizada_en))).map(o => ({
      operacion_id: o.id, publicador_id: o.publicador_id, publicador: pubNombre(o), etapa: o.etapa, linea: o.linea, aviso_titulo: o.aviso && o.aviso.titulo,
      aviso_direccion: o.aviso && [o.aviso.direccion, o.aviso.barrio].filter(Boolean).join(' · '), interesado: nombre(o.interesado_email), reservas: reservasDe(o.id), pagos: pagosDe(o.id, true) })) };
  };
  /* El recibo de una cuota pagada */
  P.recibo = async function(id){
    sesion();
    if (conBase()) return rpc('recibo', { p_pago: id });
    const p = K.pagos.get([]).find(x => x.id === id); exigir(p, T('err_no_recibo', 'El recibo no existe.'));
    const op = opLocal(p.operacion_id); exigir((await ladosOp(op)).length, T('err_no_parte', 'No sos parte de esta operación.'));
    exigir(p.estado === 'pagado', T('err_sin_pago', 'Esta cuota todavía no está paga.'));
    const pub = (await S().getPublicador(op.publicador_id).catch(() => null)) || {};
    const e = String(op.interesado_email || '').split('@')[0];
    return Object.assign(jsonP(p), { operacion_id: op.id, publicador: { nombre: pub.razon_social || pub.nombre || op.publicador_nombre, marca: pub.nombre || op.publicador_nombre, cuit: pub.cuit || null },
      pagador: e ? e.charAt(0).toUpperCase() + e.slice(1) : null, unidad: { titulo: op.aviso && op.aviso.titulo, direccion: op.aviso && op.aviso.direccion, unidad: null, barrio: op.aviso && op.aviso.barrio } });
  };

  /* Mercado Pago: el link de pago de una seña o de una cuota (api/portal-pago.js). 501 mientras no esté configurado. */
  P.linkMP = async function(tipo, id){
    if (!conBase()) throw new Error(T('err_mp', 'Mercado Pago todavía no está disponible. Pagá por transferencia.'));
    let token = null; try { const { data } = await S().sb.auth.getSession(); token = data && data.session && data.session.access_token; } catch (e) {}
    const r = await fetch('/api/portal-pago', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(tipo === 'reserva' ? { reserva_id: id } : { pago_id: id }) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 501) throw new Error(T('err_mp', 'Mercado Pago todavía no está disponible. Pagá por transferencia.'));
    if (!r.ok || !j.init_point) throw new Error(j.error || T('err_mp_link', 'No pudimos abrir Mercado Pago. Probá de nuevo.'));
    return j.init_point;
  };

  /* ═══════════════ Piezas de pantalla ═══════════════ */
  const ICO = {
    candado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    copiar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  P.ICO = ICO;
  /* La confianza, en una línea chica al lado de la acción */
  P.confianza = txt => `<p class="pg-conf">${ICO.candado}<span>${esc(txt)}</span></p>`;

  /* La hoja: sube desde abajo en el celular, centrada en la compu (la misma de Explorar). Foco atrapado, Escape y vuelta
     al botón que la abrió. o: { titulo, cuerpo (html), clase, devolverA, primero (selector), alCerrar } */
  P.hoja = function(o){
    const id = 'pgH' + Math.random().toString(36).slice(2, 8);
    const w = document.createElement('div'); w.className = 'pg-velo';
    w.innerHTML = `<div class="pg-hoja ${o.clase || ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="pg-hoja-cab"><h2 class="pg-hoja-t" id="${id}">${esc(o.titulo)}</h2><button type="button" class="pg-x" data-cerrar aria-label="${esc(T('cerrar', 'Cerrar'))}">${ICO.x}</button></div>
      <div class="pg-hoja-cuerpo">${o.cuerpo}</div></div>`;
    document.body.appendChild(w); document.documentElement.classList.add('pg-quieta');
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('on')));
    const caja = w.querySelector('.pg-hoja'); let soltar = null, ida = false, porAtras = false;
    /* El Atrás del celular cierra la hoja (como la hoja del buscador de la portada): un paso más en el historial, misma URL */
    let conHist = false; try { history.pushState(Object.assign({}, history.state || {}, { pgHoja: id }), ''); conHist = true; } catch (e) {}
    const onPop = () => { if (ida) return; porAtras = true; cerrar(); };
    window.addEventListener('popstate', onPop);
    const quitar = () => { if (ida) return; ida = true; window.removeEventListener('popstate', onPop);
      if (conHist && !porAtras && history.state && history.state.pgHoja === id) { try { history.back(); } catch (e) {} }
      w.classList.remove('on'); if (!document.querySelectorAll('.pg-velo.on').length) document.documentElement.classList.remove('pg-quieta'); setTimeout(() => w.remove(), QUIETO() ? 0 : 240); if (o.alCerrar) o.alCerrar(); };
    const cerrar = () => { if (soltar) { const f = soltar; soltar = null; f(); } else quitar(); };
    soltar = BP.focoAtrapado(caja, { devolverA: o.devolverA || document.activeElement, primero: o.primero ? caja.querySelector(o.primero) : null, alCerrar: () => { soltar = null; quitar(); } });
    w.addEventListener('mousedown', e => { if (e.target === w) cerrar(); });
    caja.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', cerrar));
    return { w, caja, cerrar };
  };

  /* Un formulario corto en la hoja (en pagos.html; en mensajes.html se usa el diálogo de los pasos). Mismo contrato que
     ui.dialogo: { titulo, texto, campos: [{ n, label, tipo: texto|numero|moneda|mes|area, req, valor, ayuda, max, pos }
     o { fila: [...] }], ok, peligro, enviar: async v => … } → los valores o null. */
  P.preguntar = function(o){
    return new Promise(resolve => {
      let n = 0; const pre = 'pgF' + Math.random().toString(36).slice(2, 6);
      const campo = c => { const id = pre + (n++); const v = c.valor == null ? '' : String(c.valor); const ay = c.ayuda ? ` aria-describedby="${id}a"` : '';
        let ctl;
        if (c.tipo === 'area') ctl = `<textarea id="${id}" name="${c.n}" rows="2" maxlength="${c.max || 300}"${ay}>${esc(v)}</textarea>`;
        else if (c.tipo === 'moneda') ctl = `<select id="${id}" name="${c.n}"${ay}><option value="USD"${v !== 'ARS' ? ' selected' : ''}>USD</option><option value="ARS"${v === 'ARS' ? ' selected' : ''}>${esc(T('pesos', '$ (pesos)'))}</option></select>`;
        else if (c.tipo === 'mes') ctl = `<input type="month" id="${id}" name="${c.n}" value="${esc(v)}"${ay}>`;
        else if (c.tipo === 'numero') ctl = `<input type="number" inputmode="decimal" id="${id}" name="${c.n}" value="${esc(v)}" min="0" step="any"${ay}>`;
        else ctl = `<input type="text" id="${id}" name="${c.n}" value="${esc(v)}" maxlength="${c.max || 120}" autocomplete="${c.auto || 'off'}"${c.teclado ? ` inputmode="${c.teclado}"` : ''}${c.mayus === false || c.teclado ? ' autocapitalize="none" spellcheck="false"' : ''}${ay}>`;
        return `<div class="pg-campo"><label for="${id}">${esc(c.label)}${c.req ? '' : ` <span class="pg-opc">${esc(T('opcional', '(opcional)'))}</span>`}</label>${ctl}${c.ayuda ? `<p class="pg-ayuda" id="${id}a">${esc(c.ayuda)}</p>` : ''}</div>`; };
      const lista = (o.campos || []).reduce((l, c) => l.concat(c.fila || [c]), []);
      const cuerpo = `${o.texto ? `<p class="pg-txt">${esc(o.texto)}</p>` : ''}<form class="pg-form" novalidate>${(o.campos || []).map(c => c.fila ? `<div class="pg-fila">${c.fila.map(campo).join('')}</div>` : campo(c)).join('')}
        <p class="pg-err" role="alert" hidden></p>
        <div class="pg-acts"><button type="button" class="p-btn" data-cerrar>${esc(T('cancelar', 'Cancelar'))}</button><button type="submit" class="p-btn p-btn-fill${o.peligro ? ' pg-peligro' : ''}">${esc(o.ok)}</button></div></form>${o.pie || ''}`;
      let res = null;
      const h = P.hoja({ titulo: o.titulo, cuerpo, clase: 'pg-hoja-chica', devolverA: o.devolverA, primero: 'input,select,textarea', alCerrar: () => resolve(res) });
      const f = h.caja.querySelector('form'), err = h.caja.querySelector('.pg-err'), ok = f.querySelector('[type=submit]');
      const mal = (msg, nombre) => { err.textContent = msg; err.hidden = false; const el = nombre && f.elements[nombre]; if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } };
      f.addEventListener('input', e => { if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); });
      f.addEventListener('submit', async e => {
        e.preventDefault(); err.hidden = true; const v = {};
        for (const c of lista) {
          const el = f.elements[c.n]; let x = el ? String(el.value || '').trim() : '';
          if (c.req && !x) return mal(TF('falta', 'Completá: {c}.', { c: c.label }), c.n);
          if (c.tipo === 'numero' && x) { const nn = num(x); if (!isFinite(nn)) return mal(TF('num_mal', 'Revisá el número de "{c}".', { c: c.label }), c.n); if (c.pos && !(nn > 0)) return mal(TF('num_pos', '"{c}" tiene que ser mayor a cero.', { c: c.label }), c.n); x = nn; }
          v[c.n] = x === '' ? null : x;
        }
        if (!o.enviar) { res = v; return h.cerrar(); }
        ok.disabled = true; const txt = ok.textContent; ok.textContent = T('guardando', 'Guardando…'); f.setAttribute('aria-busy', 'true');
        try { await o.enviar(v); res = v; h.cerrar(); }
        catch (ex) { ok.disabled = false; ok.textContent = txt; f.removeAttribute('aria-busy'); mal((ex && ex.message) || T('err_guardar', 'No pudimos guardar. Probá de nuevo.')); }
      });
    });
  };

  async function copiar(texto){
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; } } catch (e) {}
    try { const ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }

  /* "Cómo pagar": el total grande, el plazo, el alias o CBU con Copiar y una sola acción; el desglose, plegado.
     o: { tipo: 'reserva'|'cuota', item, items (las cuotas que vencen juntas), cuenta, mp, opId, unidad, devolverA, alCambiar } */
  P.hojaPagar = function(o){
    const sena = o.tipo === 'reserva';
    const items = sena ? [o.item] : (o.items && o.items.length ? o.items : [o.item]);
    const it = items[0];
    const etiqueta = sena ? T('sena', 'Seña') : items.length > 1 ? TF('n_pagos', '{n} pagos', { n: items.length }) : P.cuotaTxt(it);
    const ultimo = items.reduce((m, x) => (!m || String(x.vencimiento) > String(m.vencimiento)) ? x : m, null);
    const plazo = sena ? TF('pagala_antes', 'Pagala antes del {f}', { f: P.diaHora(it.vence_en) })
      : items.some(x => P.estadoCuota(x) === 'atrasada') ? TF('vencio_el', 'Venció el {f}', { f: P.dia(items[0].vencimiento) }) : TF('vence_el', 'Vence el {f}', { f: P.dia(ultimo.vencimiento) });
    const tot = {}; items.forEach(x => { tot[x.moneda] = (tot[x.moneda] || 0) + Number(x.monto); });
    const monedas = Object.keys(tot).sort((a, b) => (a === 'USD' ? -1 : 0) - (b === 'USD' ? -1 : 0));
    const c = o.cuenta;
    const fila = (lab, valor, mostrar) => `<div class="pg-copia"><span class="pg-copia-l">${esc(lab)}</span><span class="pg-copia-v">${esc(mostrar || valor)}</span><button type="button" class="pg-copiar" data-copiar="${esc(valor)}" aria-label="${esc(TF('copiar_aria', 'Copiar {c}', { c: lab }))}">${ICO.copiar}<span>${esc(T('copiar', 'Copiar'))}</span></button></div>`;
    const mp = !!o.mp && items.length === 1 && it.moneda === 'ARS' && conBase();
    const detalle = items.length > 1 ? `<details class="pg-detalle"><summary>${esc(T('ver_detalle', 'Ver detalle'))}</summary><ul>${items.map(x => `<li><span>${esc(P.cuotaTxt(x))}</span><span>${esc(P.fmt(x.monto, x.moneda))}</span></li>`).join('')}</ul></details>` : '';
    const cuerpo = `<div class="pg-pagar">
      <p class="pg-pagar-l">${esc(etiqueta)}${o.unidad ? ` · ${esc(o.unidad)}` : ''}</p>
      <p class="pg-pagar-m">${monedas.map((m, k) => `<span${k ? ' class="pg-pagar-m2"' : ''}>${k ? '+ ' : ''}${esc(P.fmt(tot[m], m))}</span>`).join('')}</p>
      <p class="pg-pagar-v">${esc(plazo)}</p>${detalle}
      ${c ? `<div class="pg-cuenta"><p class="pg-cuenta-t">${esc(TF('transferi_a', 'Transferí a {t}', { t: c.titular }))}</p>
          ${c.alias ? fila(T('alias', 'Alias'), c.alias) : ''}${c.cbu ? fila(T('cbu', 'CBU o CVU'), c.cbu, P.cbuTxt(c.cbu)) : ''}
          ${c.nota ? `<p class="pg-cuenta-n">${esc(c.nota)}</p>` : ''}</div>`
        : `<p class="pg-sin-cuenta">${esc(T('sin_cuenta', 'Todavía no cargó su alias o CBU. Pedíselo por el chat.'))}</p>`}
      <div class="pg-acts pg-acts-1">
        ${mp ? `<button type="button" class="p-btn p-btn-fill" data-mp>${esc(T('pagar_mp', 'Pagar con Mercado Pago'))}</button><p class="pg-sale">${esc(T('te_llevamos', 'Te llevamos a Mercado Pago y volvés acá.'))}</p>`
          : c ? `<button type="button" class="p-btn p-btn-fill" data-avisar>${esc(T('ya_pague', 'Ya pagué'))}</button>`
          : `<button type="button" class="p-btn p-btn-fill" data-pedir>${esc(T('pedir_cuenta', 'Pedir alias'))}</button>`}
      </div>
      ${P.confianza(sena ? T('conf_sena', 'La seña va directo a quien publica. BAIREN no recibe tu dinero.') : T('conf_cuota', 'El pago va directo a quien publica. BAIREN no recibe tu dinero.'))}
    </div>`;
    const titulo = sena ? T('pagar_sena', 'Pagar la seña') : items.length > 1 || it.concepto === 'alquiler' ? T('pagar_alquiler', 'Pagar el alquiler')
      : it.concepto === 'deposito' ? T('pagar_deposito', 'Pagar el depósito') : T('pagar_expensas', 'Pagar las expensas');
    const h = P.hoja({ titulo, cuerpo, devolverA: o.devolverA, primero: '[data-copiar], .p-btn-fill' });
    h.caja.querySelectorAll('[data-copiar]').forEach(b => b.addEventListener('click', async () => {
      const ok = await copiar(b.dataset.copiar); const s = b.querySelector('span');
      if (ok) { s.textContent = T('copiado', 'Copiado'); b.classList.add('ok'); BP.anunciar(T('copiado_aria', 'Copiado.')); setTimeout(() => { s.textContent = T('copiar', 'Copiar'); b.classList.remove('ok'); }, 1800); }
      else BP.toast(T('err_copiar', 'No pudimos copiar. Seleccionalo y copialo a mano.'));
    }));
    const avisar = async (texto, toast, b) => {
      const antes = b.textContent; b.disabled = true; b.textContent = T('enviando', 'Enviando…');
      try {
        await D.enviar(o.opId, 'interesado', texto); h.cerrar(); BP.toast(toast);
        /* En Mensajes, que el chat traiga el mensaje ya (la página trae lo nuevo al volver a estar a la vista) */
        if (document.body.classList.contains('p-mensajes')) document.dispatchEvent(new Event('visibilitychange'));
        if (o.alCambiar) o.alCambiar();
      } catch (e) { b.disabled = false; b.textContent = antes; BP.toast((e && e.message) || T('err_enviar', 'No pudimos mandar el mensaje.'), 'error'); }
    };
    const lista = items.map(x => P.cuotaTxt(x).toLowerCase() + ' (' + P.fmt(x.monto, x.moneda) + ')').join(T('y', ' y '));
    const bA = h.caja.querySelector('[data-avisar]');
    if (bA) bA.addEventListener('click', () => avisar(sena ? TF('msj_sena', 'Listo, te transferí la seña de {m}.', { m: P.fmt(it.monto, it.moneda) }) : TF('msj_cuota', 'Listo, te transferí: {c}.', { c: lista }), T('avisado', 'Le avisamos por el chat.'), bA));
    const bP = h.caja.querySelector('[data-pedir]');
    if (bP) bP.addEventListener('click', () => avisar(T('msj_pedir', '¿Me pasás tu alias o CBU para hacerte el pago?'), T('pedido', 'Se lo pedimos por el chat.'), bP));
    const bM = h.caja.querySelector('[data-mp]');
    if (bM) bM.addEventListener('click', async () => { const antes = bM.textContent; bM.disabled = true; bM.textContent = T('abriendo', 'Abriendo…'); try { location.href = await P.linkMP(o.tipo, it.id); } catch (e) { bM.disabled = false; bM.textContent = antes; BP.toast(e.message, 'error'); } });
    return h;
  };
  /* Las cuotas que se pagan juntas: todo lo que vence hasta el día de la primera sin pagar */
  P.juntas = x => { const ps = P.porPagar(x); if (!ps.length) return []; return ps.filter(p => String(p.vencimiento) <= String(ps[0].vencimiento)); };
  /* La línea de estado de lo que vence junto: "Alquiler de octubre: vence el 10/10" o "2 pagos: vencen el 10/10" */
  P.lineaJuntas = x => {
    const js = P.juntas(x); if (!js.length) return '';
    const atr = js.some(p => P.estadoCuota(p) === 'atrasada');
    if (js.length === 1) return atr ? TF('est_atrasada', '{c} atrasada · venció el {f}', { c: P.cuotaTxt(js[0]), f: P.dia(js[0].vencimiento) }) : TF('est_cuota', '{c}: vence el {f}', { c: P.cuotaTxt(js[0]), f: P.dia(js[0].vencimiento) });
    return atr ? TF('est_atrasados_n', '{n} pagos atrasados · desde el {f}', { n: js.length, f: P.dia(js[0].vencimiento) }) : TF('est_juntos', '{n} pagos: vencen el {f}', { n: js.length, f: P.dia(js[js.length - 1].vencimiento) });
  };

  /* Identidad pendiente: el módulo de identidad puede exponer BPDigital.verificarIdentidad() o d.ext.identidad.url */
  P.identidadPendiente = (x, d) => !!((x && x.identidad && x.identidad.requerida && x.identidad.ok === false)
    || (d && d.ext && d.ext.identidad && d.ext.identidad.estado && d.ext.identidad.estado !== 'verificada'));
  P.hojaIdentidad = function(d, devolverA){
    if (typeof D.verificarIdentidad === 'function') return D.verificarIdentidad();
    const url = (d && d.ext && d.ext.identidad && d.ext.identidad.url) || 'panel.html#cuenta';
    P.hoja({ titulo: T('id_t', 'Primero, tu identidad'), clase: 'pg-hoja-chica', devolverA, primero: '.p-btn-fill',
      cuerpo: `<p class="pg-txt">${esc(T('id_p', 'Para reservar necesitás tu identidad verificada. Lleva un par de minutos.'))}</p><div class="pg-acts pg-acts-1"><a class="p-btn p-btn-fill" href="${esc(url)}">${esc(T('id_btn', 'Verificar identidad'))}</a></div>` });
  };

  /* ═══════════════ Los pasos (mensajes.html y pagos.html) ═══════════════
     ctx: { dialogo (ui.dialogo o P.preguntar), recargar, toast, devolverA } */
  const F = P.flujos = {};
  F.reservar = async (ctx, d, x) => {
    if (P.identidadPendiente(x, d)) return P.hojaIdentidad(d, ctx.devolverA);
    const op = d.operacion; let id = null;
    const v = await ctx.dialogo({ titulo: T('d_reservar_t', 'Reservar'), texto: T('conf_sena', 'La seña va directo a quien publica. BAIREN no recibe tu dinero.'), ok: T('d_reservar_ok', 'Reservar'),
      campos: [{ fila: [{ n: 'monto', tipo: 'numero', label: T('c_sena_monto', 'Seña'), req: true, pos: true, valor: esAlquiler(op) && op.precio_publicado ? op.precio_publicado : '', ayuda: esAlquiler(op) ? T('c_sena_ayuda', 'Suele ser un mes de alquiler.') : null }, { n: 'moneda', tipo: 'moneda', label: T('c_moneda', 'Moneda'), req: true, valor: op.moneda || 'USD' }] }],
      enviar: async v => { id = await P.pedirReserva(op.id, v.monto, v.moneda, 48); } });
    if (!v) return;
    await ctx.recargar();
    try { const x2 = await P.deOperacion(op.id); const r = (x2.reservas || []).find(y => y.id === id) || P.reservaPedida(x2);
      if (r) P.hojaPagar({ tipo: 'reserva', item: r, cuenta: x2.cuenta, mp: x2.mp, opId: op.id, devolverA: ctx.devolverA, alCambiar: ctx.recargar }); }
    catch (e) { ctx.toast(T('reserva_ok', 'Listo: pediste la reserva.')); }
  };
  F.pagar = (ctx, d, x, tipo, item) => P.hojaPagar({ tipo, item, items: tipo === 'cuota' ? P.juntas(x) : null, cuenta: x.cuenta, mp: x.mp, opId: d.operacion.id, devolverA: ctx.devolverA, alCambiar: ctx.recargar });
  F.cancelar = async (ctx, d, r) => {
    const v = await ctx.dialogo({ titulo: T('d_cancelar_t', 'Cancelar la reserva'), texto: TF('d_cancelar_p', 'Seña de {m}, sin pagar. Se puede volver a pedir.', { m: P.fmt(r.monto, r.moneda) }), ok: T('d_cancelar_ok', 'Cancelar reserva'), peligro: true,
      campos: [{ n: 'motivo', tipo: 'texto', label: T('c_motivo', 'Motivo'), max: 300 }], enviar: v => P.cancelarReserva(r.id, v.motivo) });
    if (!v) return; await ctx.recargar(); ctx.toast(T('cancelada_ok', 'Reserva cancelada.'));
  };
  F.confirmar = async (ctx, d, r) => {
    const v = await ctx.dialogo({ titulo: T('d_confirmar_t', 'Confirmar la seña'), texto: TF('d_confirmar_p', 'Confirmala solo si los {m} ya están en tu cuenta.', { m: P.fmt(r.monto, r.moneda) }), ok: T('d_confirmar_ok', 'Confirmar seña'),
      campos: [{ n: 'referencia', tipo: 'texto', label: T('c_referencia', 'Referencia'), max: 120, ayuda: T('c_referencia_a', 'Por ejemplo, el número de la transferencia.') }], enviar: v => P.confirmarReserva(r.id, v.referencia) });
    if (!v) return; await ctx.recargar(); ctx.toast(T('confirmada_ok', 'Listo: seña confirmada. La operación pasó a Reserva.'));
  };
  F.devolver = async (ctx, d, r) => {
    const v = await ctx.dialogo({ titulo: T('d_devolver_t', 'Devolver la seña'), texto: TF('d_devolver_p', 'Devolvé los {m} desde tu cuenta y marcalo acá.', { m: P.fmt(r.monto, r.moneda) }), ok: T('d_devolver_ok', 'Marcar devuelta'), peligro: true,
      campos: [{ n: 'motivo', tipo: 'texto', label: T('c_motivo', 'Motivo'), max: 300 }], enviar: v => P.devolverReserva(r.id, v.motivo) });
    if (!v) return; await ctx.recargar(); ctx.toast(T('devuelta_ok', 'Listo: seña devuelta.'));
  };
  const proxMes = () => { const h = new Date(); const f = new Date(h.getFullYear(), h.getMonth() + 1, 1); return f.getFullYear() + '-' + dos(f.getMonth() + 1); };
  F.armar = async (ctx, d) => {
    const op = d.operacion;
    const v = await ctx.dialogo({ titulo: T('d_armar_t', 'Armar las cuotas'), texto: T('d_armar_p', 'Una cuota por mes. Te pagan directo a vos.'), ok: T('d_armar_ok', 'Armar cuotas'),
      campos: [{ fila: [{ n: 'desde', tipo: 'mes', label: T('c_desde', 'Primer mes'), req: true, valor: proxMes() }, { n: 'meses', tipo: 'numero', label: T('c_meses', 'Meses'), req: true, pos: true, paso: 1, min: 1, max: 60, valor: op.plazo_meses || 6 }] },
               { fila: [{ n: 'monto', tipo: 'numero', label: T('c_alquiler_mes', 'Alquiler por mes'), req: true, pos: true, valor: op.precio_publicado || '' }, { n: 'moneda', tipo: 'moneda', label: T('c_moneda', 'Moneda'), req: true, valor: op.moneda || 'USD' }] },
               { n: 'dia', tipo: 'numero', label: T('c_dia', 'Vence el día'), req: true, pos: true, paso: 1, min: 1, max: 31, valor: 10 }],
      enviar: v => P.armarCuotas(op.id, { desde: v.desde, meses: Math.round(v.meses), monto: v.monto, moneda: v.moneda, dia: Math.round(v.dia), concepto: 'alquiler' }) });
    if (!v) return; await ctx.recargar(); ctx.toast(TF('armadas_ok', 'Listo: {n} cuotas.', { n: Math.round(v.meses) }));
  };
  /* Expensas y depósito: los mismos meses y el mismo día que el alquiler */
  const baseAlquiler = x => { const al = ((x && x.pagos) || []).filter(p => p.concepto === 'alquiler' && p.estado !== 'anulado').sort((a, b) => a.periodo.localeCompare(b.periodo)); return al.length ? { desde: al[0].periodo, meses: al.length, dia: +String(al[0].vencimiento).slice(8, 10) || 10 } : null; };
  F.expensas = async (ctx, d, x) => {
    const b = baseAlquiler(x); if (!b) return;
    const v = await ctx.dialogo({ titulo: T('d_expensas_t', 'Sumar expensas'), texto: TF('d_expensas_p', 'Los mismos {n} meses y vencimiento que el alquiler.', { n: b.meses }), ok: T('d_expensas_ok', 'Sumar expensas'),
      campos: [{ fila: [{ n: 'monto', tipo: 'numero', label: T('c_expensas_mes', 'Expensas por mes'), req: true, pos: true }, { n: 'moneda', tipo: 'moneda', label: T('c_moneda', 'Moneda'), req: true, valor: 'ARS' }] }],
      enviar: v => P.armarCuotas(d.operacion.id, { desde: b.desde, meses: b.meses, monto: v.monto, moneda: v.moneda, dia: b.dia, concepto: 'expensas' }) });
    if (!v) return; await ctx.recargar(); ctx.toast(T('expensas_ok', 'Listo: expensas sumadas.'));
  };
  F.deposito = async (ctx, d, x) => {
    const b = baseAlquiler(x); if (!b) return;
    const v = await ctx.dialogo({ titulo: T('d_deposito_t', 'Sumar el depósito'), texto: T('d_deposito_p', 'Un solo pago, con el vencimiento de la primera cuota.'), ok: T('d_deposito_ok', 'Sumar depósito'),
      campos: [{ fila: [{ n: 'monto', tipo: 'numero', label: T('c_deposito_monto', 'Depósito'), req: true, pos: true, valor: d.operacion.precio_publicado || '' }, { n: 'moneda', tipo: 'moneda', label: T('c_moneda', 'Moneda'), req: true, valor: d.operacion.moneda || 'USD' }] }],
      enviar: v => P.armarCuotas(d.operacion.id, { desde: b.desde, meses: 1, monto: v.monto, moneda: v.moneda, dia: b.dia, concepto: 'deposito' }) });
    if (!v) return; await ctx.recargar(); ctx.toast(T('deposito_ok', 'Listo: depósito sumado.'));
  };
  F.marcar = async (ctx, p) => {
    let n = null;
    const v = await ctx.dialogo({ titulo: T('d_marcar_t', 'Marcar pagado'),
      texto: TF('d_marcar_p', '{c}, {m}. Marcalo cuando esté en tu cuenta.', { c: P.cuotaTxt(p), m: P.fmt(p.monto, p.moneda) }),
      ok: T('d_marcar_ok', 'Marcar pagado'), campos: [{ n: 'referencia', tipo: 'texto', label: T('c_referencia', 'Referencia'), max: 120, ayuda: T('c_referencia_a', 'Por ejemplo, el número de la transferencia.') }],
      enviar: async v => { n = await P.registrarPago(p.id, v.referencia); } });
    if (!v) return; await ctx.recargar(); ctx.toast(TF('marcado_ok', 'Listo: recibo {n}.', { n: P.reciboTxt(n) }));
  };
  F.cuenta = async (ctx, pubId, actual) => {
    const c = actual || {};
    const v = await P.preguntar({ devolverA: ctx.devolverA, titulo: T('d_cuenta_t', 'Tu cuenta de cobro'), texto: T('d_cuenta_p', 'Te pagan directo acá. Solo la ve quien te debe pagar.'), ok: T('d_cuenta_ok', 'Guardar'),
      campos: [{ n: 'titular', tipo: 'texto', label: T('c_titular', 'Titular'), req: true, max: 120, valor: c.titular || '' },
               { n: 'alias', tipo: 'texto', label: T('c_alias', 'Alias'), max: 20, valor: c.alias || '', mayus: false },
               { n: 'cbu', tipo: 'texto', teclado: 'numeric', label: T('c_cbu', 'CBU o CVU'), max: 30, valor: c.cbu || '', ayuda: T('c_cbu_a', 'Con el alias alcanza. Si ponés el CBU, son 22 números.') },
               { n: 'nota', tipo: 'texto', label: T('c_nota', 'Nota para quien paga'), max: 300, valor: c.nota || '', ayuda: T('c_nota_a', 'Por ejemplo: "Mandá el comprobante por el chat".') }],
      enviar: v => P.guardarCuenta(pubId, v) });
    if (!v) return; await ctx.recargar(); ctx.toast(T('cuenta_ok', 'Listo: cuenta guardada.'));
  };

  /* ═══════════════ mensajes.html: pasos y sección ═══════════════ */
  if (typeof D.registrarAccion !== 'function') { window.BPPagos = P; return; }
  const X = d => (d && d.ext && d.ext.pagos) || null;
  const abierta = d => d.operacion.etapa !== 'caida' && d.operacion.etapa !== 'cerrada';
  const ultimaSolicitud = d => { const hs = (d.hitos || []).filter(h => /^solicitud_(enviada|aceptada|rechazada)$/.test(h.tipo)); return hs.length ? hs[hs.length - 1].tipo : null; };
  const reservaEnCurso = x => ((x && x.reservas) || []).some(r => r.estado === 'pagada' || P.vigente(r));
  const hayCuotas = x => ((x && x.pagos) || []).some(p => p.estado !== 'anulado');
  const hayConcepto = (x, c) => ((x && x.pagos) || []).some(p => p.concepto === c && p.estado !== 'anulado');
  /* El paso principal de cada lado (uno solo por estado) */
  function principal(d){
    const x = X(d); if (!x) return null;
    if (d.lado === 'interesado') {
      if (P.reservaPedida(x)) return 'pagar_sena';
      const p = P.proxima(x); if (p && P.cerca(p)) return 'pagar_cuota';
      const s = ultimaSolicitud(d);
      if (abierta(d) && D.ordenEtapa(d.operacion.etapa) < 6 && (s === 'solicitud_enviada' || s === 'solicitud_aceptada') && !reservaEnCurso(x)) return 'reservar';
      return null;
    }
    if (d.lado === 'publicador') {
      if (P.reservaPedida(x)) return x.cuenta_cargada ? 'confirmar_sena' : 'cargar_cuenta';
      const p = P.proxima(x); if (p && P.cerca(p) && d.operacion.etapa !== 'caida') return 'marcar_pagado';
      if (esAlquiler(d.operacion) && d.operacion.etapa !== 'caida' && !hayCuotas(x) && (P.reservaPagada(x) || D.ordenEtapa(d.operacion.etapa) >= 6)) return 'armar_cuotas';
    }
    return null;
  }
  const lineaCuota = p => P.estadoCuota(p) === 'atrasada' ? TF('est_atrasada', '{c} atrasada · venció el {f}', { c: P.cuotaTxt(p), f: P.dia(p.vencimiento) }) : TF('est_cuota', '{c}: vence el {f}', { c: P.cuotaTxt(p), f: P.dia(p.vencimiento) });
  /* La línea de estado cuando no hay un paso de plata pendiente */
  function estadoTranquilo(d){
    const x = X(d); if (!x) return '';
    const p = P.proxima(x), pagada = P.reservaPagada(x);
    if (p) return TF('est_proxima', 'Al día · próxima: {c}, vence el {f}', { c: P.cuotaTxt(p).toLowerCase(), f: P.dia(p.vencimiento) });
    if (hayCuotas(x)) return T('est_al_dia', 'Al día: no hay cuotas pendientes.');
    if (pagada) return d.lado === 'publicador' && esAlquiler(d.operacion) ? TF('est_sena_ok_p', 'Seña de {m} confirmada · falta el contrato', { m: P.fmt(pagada.monto, pagada.moneda) }) : TF('est_sena_ok', 'Seña de {m} pagada · falta el contrato', { m: P.fmt(pagada.monto, pagada.moneda) });
    return '';
  }
  const ctxDe = ui => ({ dialogo: ui.dialogo, recargar: ui.recargar, toast: ui.toast, devolverA: document.activeElement });
  const reg = (id, lados, cuando, texto, o) => D.registrarAccion(Object.assign({ id: 'pg_' + id, lados, cuando: d => { try { return !!X(d) && cuando(d); } catch (e) { return false; } }, texto }, o || {}));

  /* 1. "Ver pagos" (en Más): lleva la línea de estado cuando no hay nada de plata por hacer. Va primero: el estado de un
     paso principal la reemplaza. */
  reg('ver', ['interesado', 'publicador'], d => (X(d).reservas || []).length > 0 || hayCuotas(X(d)), T('a_ver', 'Ver pagos'), {
    estado: d => principal(d) ? '' : estadoTranquilo(d),
    ejecutar: async d => { location.href = 'pagos.html' + (d.lado === 'publicador' ? '?vista=cobranza' : ''); } });
  /* 2. Quien busca */
  reg('reservar', ['interesado'], d => principal(d) === 'reservar', T('a_reservar', 'Reservar'), {
    prim: () => true, primero: () => true, ejecutar: (d, ui) => F.reservar(ctxDe(ui), d, X(d)) });
  reg('pagar_sena', ['interesado'], d => principal(d) === 'pagar_sena', T('a_pagar_sena', 'Pagar seña'), {
    prim: () => true, primero: () => true,
    estado: d => { const r = P.reservaPedida(X(d)); return TF('est_sena', 'Seña de {m} · pagala antes del {f}', { m: P.fmt(r.monto, r.moneda), f: P.diaHora(r.vence_en) }); },
    ejecutar: (d, ui) => F.pagar(ctxDe(ui), d, X(d), 'reserva', P.reservaPedida(X(d))) });
  reg('pagar_cuota', ['interesado'], d => principal(d) === 'pagar_cuota', d => P.juntas(X(d)).some(p => p.concepto === 'alquiler') ? T('a_pagar_alquiler', 'Pagar alquiler') : T('a_pagar', 'Pagar'), {
    prim: () => true, primero: () => true, estado: d => P.lineaJuntas(X(d)),
    ejecutar: (d, ui) => F.pagar(ctxDe(ui), d, X(d), 'cuota', P.proxima(X(d))) });
  reg('cancelar_i', ['interesado'], d => !!P.reservaPedida(X(d)), T('a_cancelar', 'Cancelar reserva'), {
    peligro: true, ejecutar: (d, ui) => F.cancelar(ctxDe(ui), d, P.reservaPedida(X(d))) });
  /* 3. Quien publica */
  reg('cargar_cuenta', ['publicador'], d => principal(d) === 'cargar_cuenta' || (!X(d).cuenta_cargada && (P.reservaPedida(X(d)) || hayCuotas(X(d)))), T('a_cuenta', 'Cargar alias'), {
    prim: d => principal(d) === 'cargar_cuenta', primero: d => principal(d) === 'cargar_cuenta',
    estado: d => principal(d) === 'cargar_cuenta' ? TF('est_cargar', 'Quiere reservar con {m} · cargá tu alias o CBU para que te pague', { m: P.fmt(P.reservaPedida(X(d)).monto, P.reservaPedida(X(d)).moneda) }) : '',
    ejecutar: (d, ui) => F.cuenta(ctxDe(ui), d.operacion.publicador_id, null) });
  reg('confirmar_sena', ['publicador'], d => !!P.reservaPedida(X(d)), T('a_confirmar', 'Confirmar seña'), {
    prim: d => principal(d) === 'confirmar_sena', primero: d => principal(d) === 'confirmar_sena',
    estado: d => { if (principal(d) !== 'confirmar_sena') return ''; const r = P.reservaPedida(X(d)); return TF('est_confirmar', 'Quiere reservar con {m} · confirmala cuando esté en tu cuenta', { m: P.fmt(r.monto, r.moneda) }); },
    ejecutar: (d, ui) => F.confirmar(ctxDe(ui), d, P.reservaPedida(X(d))) });
  reg('marcar', ['publicador'], d => principal(d) === 'marcar_pagado', T('a_marcar', 'Marcar pagado'), {
    prim: () => true, primero: () => true, estado: d => lineaCuota(P.proxima(X(d))),
    ejecutar: (d, ui) => F.marcar(ctxDe(ui), P.proxima(X(d))) });
  reg('armar', ['publicador'], d => principal(d) === 'armar_cuotas' || (esAlquiler(d.operacion) && d.operacion.etapa !== 'caida' && !hayCuotas(X(d)) && D.ordenEtapa(d.operacion.etapa) >= 4), T('a_armar', 'Armar cuotas'), {
    prim: d => principal(d) === 'armar_cuotas', primero: d => principal(d) === 'armar_cuotas',
    estado: d => principal(d) === 'armar_cuotas' ? (P.reservaPagada(X(d)) ? TF('est_armar', 'Seña de {m} confirmada · armá las cuotas del alquiler', { m: P.fmt(P.reservaPagada(X(d)).monto, P.reservaPagada(X(d)).moneda) }) : T('est_armar2', 'Armá las cuotas del alquiler')) : '',
    ejecutar: (d, ui) => F.armar(ctxDe(ui), d) });
  reg('expensas', ['publicador'], d => hayConcepto(X(d), 'alquiler') && !hayConcepto(X(d), 'expensas') && d.operacion.etapa !== 'caida', T('a_expensas', 'Sumar expensas'), {
    ejecutar: (d, ui) => F.expensas(ctxDe(ui), d, X(d)) });
  reg('deposito', ['publicador'], d => hayConcepto(X(d), 'alquiler') && !hayConcepto(X(d), 'deposito') && d.operacion.etapa !== 'caida', T('a_deposito', 'Sumar depósito'), {
    ejecutar: (d, ui) => F.deposito(ctxDe(ui), d, X(d)) });
  reg('cancelar_p', ['publicador'], d => !!P.reservaPedida(X(d)), T('a_cancelar', 'Cancelar reserva'), {
    peligro: true, ejecutar: (d, ui) => F.cancelar(ctxDe(ui), d, P.reservaPedida(X(d))) });
  reg('devolver', ['publicador'], d => !!P.reservaPagada(X(d)), T('a_devolver', 'Devolver seña'), {
    peligro: true, ejecutar: (d, ui) => F.devolver(ctxDe(ui), d, P.reservaPagada(X(d))) });

  /* Sección "Pagos" de los detalles: el número importante grande, hasta 3 renglones y el resto en pagos.html */
  function filaHTML(d, it, tipo){
    const pub = d.lado === 'publicador';
    if (tipo === 'reserva') {
      const est = P.estadoReserva(it);
      const sub = est === 'pedida' ? TF('pagala_antes', 'Pagala antes del {f}', { f: P.diaHora(it.vence_en) }) : est === 'pagada' ? TF('pagada_el', 'Pagada el {f}', { f: P.dia(it.pagada_en) }) : P.dia(it.pedida_en);
      const acc = pub && est === 'pedida' && d.ext.pagos.cuenta_cargada ? `<button type="button" class="pg-mini" data-pg-confirmar="${esc(it.id)}">${esc(T('confirmar_corto', 'Confirmar'))}</button>` : '';
      return `<li class="pg-fila"><span class="pg-fila-t">${esc(T('sena', 'Seña'))}<small>${esc(sub)}</small></span><span class="pg-fila-m">${esc(P.fmt(it.monto, it.moneda))}</span>${P.pill(est, 'ms-pill pg-pill')}${acc}</li>`;
    }
    const est = P.estadoCuota(it);
    const sub = est === 'pagada' ? TF('pagada_el', 'Pagada el {f}', { f: P.dia(it.pagado_en) }) : est === 'atrasada' ? TF('vencio_el', 'Venció el {f}', { f: P.dia(it.vencimiento) }) : TF('vence_el', 'Vence el {f}', { f: P.dia(it.vencimiento) });
    const acc = est === 'pagada' ? `<a class="pg-mini" href="pagos.html?recibo=${encodeURIComponent(it.id)}">${esc(T('recibo', 'Recibo'))}</a>`
      : pub && est !== 'anulada' ? `<button type="button" class="pg-mini" data-pg-marcar="${esc(it.id)}">${esc(T('marcar_corto', 'Marcar pagado'))}</button>` : '';
    return `<li class="pg-fila"><span class="pg-fila-t">${esc(P.cuotaTxt(it))}<small>${esc(sub)}</small></span><span class="pg-fila-m">${esc(P.fmt(it.monto, it.moneda))}</span>${P.pill(est, 'ms-pill pg-pill')}${acc}</li>`;
  }
  D.registrarSeccion({
    id: 'pagos',
    titulo: T('s_pagos', 'Pagos'),
    cuando: d => { const x = X(d); return !!x && (d.lado === 'interesado' || d.lado === 'publicador') && ((x.reservas || []).length > 0 || hayCuotas(x)); },
    cuenta: d => { const x = X(d); return (P.reservaPedida(x) ? 1 : 0) + P.porPagar(x).filter(P.cerca).length; },
    html: d => {
      const x = X(d), pub = d.lado === 'publicador';
      const ped = P.reservaPedida(x), prox = P.proxima(x);
      /* El número importante, grande, con su acción chica al lado (quien publica); debajo, hasta 2 renglones más */
      let grande = '';
      if (ped) grande = `<div class="pg-dato"><span class="pg-dato-l">${esc(T('sena', 'Seña'))}</span><span class="pg-dato-m">${esc(P.fmt(ped.monto, ped.moneda))}</span><span class="pg-dato-s">${esc(TF('pagala_antes', 'Pagala antes del {f}', { f: P.diaHora(ped.vence_en) }))}</span>${pub && x.cuenta_cargada ? `<button type="button" class="pg-mini" data-pg-confirmar="${esc(ped.id)}">${esc(T('confirmar_corto', 'Confirmar'))}</button>` : ''}</div>`;
      else if (prox) grande = `<div class="pg-dato"><span class="pg-dato-l">${esc(T('proxima', 'Próxima cuota'))}</span><span class="pg-dato-m">${esc(P.fmt(prox.monto, prox.moneda))}</span><span class="pg-dato-s">${esc(lineaCuota(prox))}</span>${pub ? `<button type="button" class="pg-mini" data-pg-marcar="${esc(prox.id)}">${esc(T('marcar_corto', 'Marcar pagado'))}</button>` : ''}</div>`;
      const filas = [];
      const pagada = P.reservaPagada(x); if (!ped && pagada && !hayCuotas(x)) filas.push(filaHTML(d, pagada, 'reserva'));
      if (!ped) P.porPagar(x).slice(prox ? 1 : 0, 3).forEach(p => filas.push(filaHTML(d, p, 'cuota')));
      /* Sin nada por pagar: lo último pagado, con su recibo */
      if (!ped && !prox) (x.pagos || []).filter(p => p.estado === 'pagado').sort((a, b) => String(b.pagado_en).localeCompare(String(a.pagado_en))).slice(0, 2).forEach(p => filas.push(filaHTML(d, p, 'cuota')));
      const total = (x.pagos || []).filter(p => p.estado !== 'anulado').length + (x.reservas || []).length;
      const mas = total > filas.length + (grande ? 1 : 0) ? `<a class="ms-link pg-ver" href="pagos.html${pub ? '?vista=cobranza' : ''}">${esc(TF('ver_todos', 'Ver los {n}', { n: total }))}</a>` : '';
      return `<div class="pg-sec">${grande}${filas.length ? `<ul class="pg-filas">${filas.join('')}</ul>` : ''}${mas}
        ${P.confianza(pub ? T('conf_pub', 'Te pagan directo a tu cuenta. BAIREN no recibe ese dinero.') : T('conf_int', 'Pagás directo a quien publica. BAIREN no recibe tu dinero.'))}</div>`;
    },
    montar: (d, el, ui) => {
      el.querySelectorAll('[data-pg-marcar]').forEach(b => b.addEventListener('click', () => { const p = (X(d).pagos || []).find(y => y.id === b.dataset.pgMarcar); if (p) F.marcar(Object.assign(ctxDe(ui), { devolverA: b }), p).catch(e => ui.toast(e.message)); }));
      el.querySelectorAll('[data-pg-confirmar]').forEach(b => b.addEventListener('click', () => { const r = (X(d).reservas || []).find(y => y.id === b.dataset.pgConfirmar); if (r) F.confirmar(Object.assign(ctxDe(ui), { devolverA: b }), d, r).catch(e => ui.toast(e.message)); }));
    }
  });

  /* Las datos de pagos, cada vez que se carga una operación */
  D.enriquecerDetalle(async d => {
    if (!d || !d.operacion || (d.lado !== 'interesado' && d.lado !== 'publicador' && d.lado !== 'plataforma')) return;
    try {
      d.ext.pagos = await P.deOperacion(d.operacion.id);
      /* Si al leer venció una seña, el paso "La reserva venció" se sumó después de leer el recorrido: se vuelve a leer */
      if (d.ext.pagos && d.ext.pagos.vencidas > 0) {
        if (conBase()) { const { data } = await D.db().from('hitos').select('id,tipo,lado,datos,creado_en').eq('operacion_id', d.operacion.id).order('id', { ascending: true }); if (Array.isArray(data)) d.hitos = data; }
        else d.hitos = K.hitos.get([]).filter(h => h.operacion_id === d.operacion.id);
      }
    }
    catch (e) { d.ext.pagos = null; if (!/pagos_de_operacion|schema cache|does not exist|404/i.test(String(e && e.message))) console.warn('pagos', e); }
  });

  window.BPPagos = P;
})();
