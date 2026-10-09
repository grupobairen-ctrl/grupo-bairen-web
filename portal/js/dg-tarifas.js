/* BAIREN · Portal · Tarifas públicas y estimado de servicios (migración 35, 9/10/2026).
   El pedido de Tomás: al subir un inmueble, un estimado de lo que le correspondería a BAIREN si la operación se concreta,
   "como en Pedidos Ya". El encuadre es otro y se tiene que notar: BAIREN no cobra comisión por la operación. Publicar es
   sin costo; si cerrás por BAIREN, usás servicios con precio fijo o sobre lo que se procesa, y cada uno se paga recién
   cuando se usa (al firmar, al cobrar cada pago, al pagar la reserva). Precios completos y claros (Ley 24.240 art. 4;
   Res. SIC 446/2025).

   Se enchufa en window.BPDigital (cargar después de js/digital.js):
   · BPDigital.tarifas(linea) → las reglas del escenario público que paga quien publica o el propietario (nunca terceros
     ni quien busca): { concepto, linea, evento, paga, modo, valor, moneda, base, minimo, maximo, nota_publica, cobra }.
     Con base, portal.tarifas_publicas (también sin sesión); en modo local, las mismas reglas de "Rieles" de digital.js.
   · BPDigital.estimarServicios({ linea, precio, moneda, meses, perfil, porUnidad }) → { items, total, totalTxt, … }.
     Supuestos: mediano plazo 6 meses, largo plazo 24, estadía corta 1, venta el precio publicado, pozo por inversor
     verificado. Porcentaje sobre lo cobrado = % × alquiler × meses; fijos tal cual; "por inversor verificado" va como
     unitario y no se suma; "Propuesta aceptada en Búsquedas" es opcional (solo si se usa) y tampoco se suma.
   · BPDigital.calcularEstimado(reglas, opciones): el mismo cálculo, sin red (para actualizar mientras se escribe).
   · BPDigital.escenarioPublico() y BPDigital.fijarEscenarioPublico(nombre) (solo la plataforma).
   · BPDigital.estimadoUI(pie, { antesDe }) → la barra "Publicar: sin costo · Si cerrás por BAIREN: ≈ USD X" con su
     "Ver detalle" (la usa publicar-aviso.html). BPDigital.montarSelectorEscenario(contenedor, reglas) (cobros.html).
   Textos por BP.t con el prefijo dg_tarifas_. */
(function(){
  'use strict';
  const D = window.BPDigital; if (!D) return;
  const T = (k, d) => (window.BP && BP.t) ? BP.t('dg_tarifas_' + k, d) : d;
  const TF = (k, d, v) => (window.BP && BP.tf) ? BP.tf('dg_tarifas_' + k, d, v) : String(d).replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
  const esc = s => (window.BP && BP.esc) ? BP.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dinero = (n, m) => (window.BP && BP.fmtPrecio) ? BP.fmtPrecio(n, m) : (m === 'ARS' ? '$ ' : 'USD ') + Math.round(n).toLocaleString('es-AR');
  /* "USD 1.000" y "$ 800.000" no se parten en dos renglones (solo en lo que se muestra) */
  const nb = s => String(s == null ? '' : s).replace(/(USD|\$) (?=\d)/g, '$1\u00a0');
  D.sinCorte = nb;
  const pct = v => Number(v).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' %';

  const ESCENARIO = 'Rieles · octubre 2026';
  const LINEAS = ['mediano', 'tradicional', 'temporario', 'venta', 'pozo'];
  const PAGAN = ['publicador', 'propietario'];
  const MESES = { mediano: 6, tradicional: 24, temporario: 1 };
  const RECURRENTES = ['pago_recibido', 'cobro_mensual'];
  /* En qué orden se usan los servicios a lo largo de una operación */
  const ORDEN = ['lead_inversor', 'visita_confirmada', 'visita_realizada', 'solicitud_aceptada', 'reserva_pagada', 'reserva', 'contrato_generado', 'documento_firmado', 'contrato_firmado', 'pago_recibido', 'cobro_mensual', 'cierre', 'propuesta_aceptada'];

  /* Las notas públicas de Rieles (las mismas de la migración 35) y la regla que esa migración suma para la venta */
  const NOTAS = {
    'Contrato digital con firma': 'Lo preparamos y se firma en línea. Precio fijo, igual para cualquier unidad.',
    'Cobranza digital': 'Sobre cada pago que cobrás por BAIREN. La plata va directo a tu cuenta.',
    'Reserva online': 'Por cada reserva pagada en línea. La seña va directo a tu cuenta.',
    'Propuesta aceptada en Búsquedas': 'Solo si alguien acepta una unidad que le propusiste. No depende de cerrar.',
    'Tecnología por operación (corredor aliado)': 'Para corredores matriculados: monto fijo por operación registrada, nunca un porcentaje de sus honorarios.',
    'Estadía corta': 'Sobre el total de la estadía, de hasta 3 meses.',
    'Inversor verificado': 'Por cada inversor verificado que te consulta. No depende de la venta.',
    'Firma de reserva': 'La reserva se firma en línea. Precio fijo, igual para cualquier unidad.'
  };
  const FIRMA_RESERVA = ['Firma de reserva', 'venta', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null];
  /* Copia de las reglas de Rieles de REGLAS_EJEMPLO (digital.js), por si este navegador guardó las reglas antes de la 28 */
  const RIELES = [
    ['Contrato digital con firma', 'mediano', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null],
    ['Contrato digital con firma', 'tradicional', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null],
    ['Contrato digital con firma', 'temporario', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null],
    ['Cobranza digital', 'mediano', 'pago_recibido', 'propietario', 'porcentaje', 2, 'USD', 'monto_hito'],
    ['Cobranza digital', 'tradicional', 'pago_recibido', 'propietario', 'porcentaje', 2, 'USD', 'monto_hito'],
    ['Reserva online', 'mediano', 'reserva_pagada', 'publicador', 'fijo', 80, 'USD', null],
    ['Propuesta aceptada en Búsquedas', 'todas', 'propuesta_aceptada', 'publicador', 'fijo', 20, 'USD', null],
    ['Garantía de alquiler', 'todas', 'garantia_emitida', 'tercero', 'porcentaje', 20, 'USD', 'monto_hito'],
    ['Seguro (caución u hogar)', 'todas', 'seguro_emitido', 'tercero', 'porcentaje', 20, 'USD', 'monto_hito'],
    ['Tecnología por operación (corredor aliado)', 'venta', 'cierre', 'publicador', 'fijo', 150, 'USD', null],
    ['Tecnología por operación (corredor aliado)', 'tradicional', 'cierre', 'publicador', 'fijo', 50, 'USD', null],
    ['Estadía corta', 'temporario', 'cierre', 'publicador', 'porcentaje', 10, 'USD', 'monto_contrato'],
    ['Inversor verificado', 'pozo', 'lead_inversor', 'publicador', 'fijo', 30, 'USD', null]
  ];
  const fila = x => ({ escenario: ESCENARIO, concepto: x[0], linea: x[1], evento: x[2], paga: x[3], modo: x[4], valor: x[5], moneda: x[6], base: x[7], minimo: null, maximo: null, activa: true, cobra: false });

  /* Un porcentaje de la venta o del alquiler (salvo la estadía corta) solo lo puede cobrar un corredor (Ley 2340): ese
     escenario no se le muestra al público. La misma regla que portal.fijar_escenario_publico. */
  const vendePorcentaje = r => r.activa !== false && PAGAN.indexOf(r.paga) > -1 && r.modo === 'porcentaje'
    && ['precio_publicado', 'precio_cierre', 'monto_contrato'].indexOf(r.base) > -1 && r.linea !== 'temporario';
  D.escenarioMostrable = (reglas, nombre) => { const rs = (reglas || []).filter(r => r.escenario === nombre && r.activa !== false); return rs.length > 0 && !rs.some(vendePorcentaje); };

  /* ── Datos ─────────────────────────────────────────────── */
  const CFG = D._local.LS('bp_dg_config');
  const cfgLocal = () => { const c = CFG.get({}); return (c && typeof c === 'object') ? c : {}; };
  const normal = r => ({
    concepto: r.concepto || r.evento, linea: r.linea, evento: r.evento, paga: r.paga, modo: r.modo, valor: Number(r.valor), moneda: r.moneda === 'ARS' ? 'ARS' : 'USD',
    base: r.base || null, minimo: r.minimo == null ? null : Number(r.minimo), maximo: r.maximo == null ? null : Number(r.maximo), nota_publica: r.nota_publica || null, cobra: !!r.cobra
  });
  async function tarifasLocal(){
    const nombre = cfgLocal().escenario_publico || ESCENARIO;
    let reglas = []; try { reglas = (await D.reglas()) || []; } catch (e) { reglas = []; }
    reglas = reglas.filter(r => r.escenario === nombre);
    if (nombre === ESCENARIO) {
      if (!reglas.length) reglas = RIELES.map(fila);
      if (!reglas.some(r => r.evento === 'documento_firmado' && (r.linea === 'venta' || r.linea === 'todas'))) reglas = reglas.concat([fila(FIRMA_RESERVA)]);
    }
    return reglas.filter(r => r.activa !== false && PAGAN.indexOf(r.paga) > -1)
      .map(r => normal(Object.assign({}, r, { nota_publica: r.nota_publica || (nombre === ESCENARIO ? NOTAS[r.concepto] : null) || null })));
  }
  let cache = null;
  function todas(){
    if (!cache) {
      cache = (async () => D.conBase() ? ((await D.rpc('tarifas_publicas', { p_linea: null })) || []).map(normal) : tarifasLocal())();
      cache.catch(() => { cache = null; });
    }
    return cache;
  }
  D.tarifas = async function(linea){
    if (linea != null && LINEAS.indexOf(linea) < 0) throw new Error(T('err_linea', 'Línea desconocida.'));
    const l = await todas();
    return linea ? l.filter(r => r.linea === linea || r.linea === 'todas') : l.slice();
  };
  D.escenarioPublico = async function(){
    if (D.conBase()) return D.rpc('escenario_publico');
    return cfgLocal().escenario_publico || ESCENARIO;
  };
  D.fijarEscenarioPublico = async function(nombre){
    const v = String(nombre == null ? '' : nombre).trim();
    if (!window.BPStore || !BPStore.session) throw new Error(T('err_sesion', 'Ingresá para seguir.'));
    let r;
    if (D.conBase()) r = await D.rpc('fijar_escenario_publico', { p_escenario: v });
    else {
      if (!(await BPStore.isCurador())) throw new Error(T('err_plataforma', 'Solo la plataforma cambia el escenario que ven los publicadores.'));
      const reglas = await D.reglas();
      if (!v || !reglas.some(x => x.escenario === v && x.activa !== false)) throw new Error(T('err_escenario', 'Ese escenario no existe o no tiene reglas activas.'));
      if (!D.escenarioMostrable(reglas, v)) throw new Error(T('err_porcentaje', 'Ese escenario cobra un porcentaje de la venta o del alquiler: no se le puede mostrar al público (Ley 2340).'));
      const c = cfgLocal(); c.escenario_publico = v; CFG.set(c); r = v;
    }
    cache = null;
    return r;
  };

  /* ── Textos de cada servicio ───────────────────────────── */
  const esVenta = l => l === 'venta' || l === 'pozo';
  D.cuandoTarifa = function(r, linea){
    switch (r.evento) {
      case 'documento_firmado': return esVenta(linea || r.linea) ? T('cuando_firma_reserva', 'Al firmar la reserva') : r.linea === 'todas' ? T('cuando_firma', 'Al firmar el documento') : T('cuando_firma_contrato', 'Al firmar el contrato');
      case 'contrato_generado': return T('cuando_contrato_generado', 'Al preparar el contrato');
      case 'contrato_firmado': return T('cuando_firma_contrato', 'Al firmar el contrato');
      case 'reserva_pagada': return T('cuando_reserva_pagada', 'Al pagarse la reserva');
      case 'reserva': return T('cuando_reserva', 'Al registrar la reserva');
      case 'pago_recibido': return T('cuando_pago', 'Al cobrar cada pago');
      case 'cobro_mensual': return T('cuando_mes', 'Al cobrar cada mes');
      case 'cierre': { const l = linea || r.linea; return esVenta(l) ? T('cuando_cierre_venta', 'Al cerrar la venta') : l === 'temporario' ? T('cuando_cierre_estadia', 'Al confirmar la estadía') : l === 'todas' ? T('cuando_cierre', 'Al cerrar la operación') : T('cuando_cierre_alquiler', 'Al cerrar el alquiler'); }
      case 'propuesta_aceptada': return T('cuando_propuesta', 'Si aceptan tu propuesta en Búsquedas');
      case 'lead_inversor': return T('cuando_inversor', 'Por cada inversor verificado');
      case 'visita_confirmada': return T('cuando_visita', 'Por cada visita confirmada');
      case 'visita_realizada': return T('cuando_visita_hecha', 'Por cada visita hecha');
      case 'solicitud_aceptada': return T('cuando_solicitud', 'Al aceptar una solicitud');
      default: return (D.HITO_TXT && D.HITO_TXT[r.evento]) || r.evento;
    }
  };
  /* "de cada pago", "de la estadía", "del contrato", "del precio" */
  const sobreTxt = (r, linea) => r.base === 'monto_hito' ? T('sobre_pago', 'de cada pago')
    : r.base === 'monto_contrato' ? ((linea || r.linea) === 'temporario' ? T('sobre_estadia', 'de la estadía') : esVenta(linea || r.linea) ? T('sobre_precio', 'del precio') : T('sobre_contrato', 'del contrato'))
    : T('sobre_precio', 'del precio');
  /* El precio de un servicio, como se lee en la tabla: "USD 40", "2 % de cada pago", "USD 30 por inversor verificado" */
  D.precioTarifa = function(r, linea){
    let t = r.modo === 'fijo' ? dinero(r.valor, r.moneda) : pct(r.valor) + ' ' + sobreTxt(r, linea);
    if (r.modo === 'fijo' && r.evento === 'lead_inversor') t += ' ' + T('por_inversor', 'por inversor verificado');
    else if (r.modo === 'fijo' && RECURRENTES.indexOf(r.evento) > -1) t += ' ' + T('por_pago', 'por pago');
    if (r.modo === 'porcentaje' && r.minimo != null) t += ', ' + TF('minimo', 'mínimo {m}', { m: dinero(r.minimo, r.moneda) });
    if (r.modo === 'porcentaje' && r.maximo != null) t += ', ' + TF('maximo', 'hasta {m}', { m: dinero(r.maximo, r.moneda) });
    return t;
  };
  D.soloCorredor = r => /corredor/i.test(r.concepto || '');
  /* En el orden en que se usan a lo largo de una operación */
  const posEvento = e => { const i = ORDEN.indexOf(e); return i < 0 ? 50 : i; };
  D.ordenarTarifas = l => (l || []).slice().sort((a, b) => posEvento(a.evento) - posEvento(b.evento) || String(a.concepto).localeCompare(String(b.concepto)));
  const mesesTxt = n => n === 1 ? T('un_mes', '1 mes') : TF('n_meses', '{n} meses', { n });
  const pagosTxt = n => n === 1 ? T('un_pago', '1 pago') : TF('n_pagos', '{n} pagos', { n });

  /* ── El cálculo ─────────────────────────────────────────── */
  D.calcularEstimado = function(reglas, opciones){
    const o = opciones || {};
    const linea = o.linea; if (LINEAS.indexOf(linea) < 0) return null;
    const precio = Number(o.precio) > 0 ? Number(o.precio) : null;
    const moneda = o.moneda === 'ARS' ? 'ARS' : 'USD';
    const meses = MESES[linea] ? (Number(o.meses) >= 1 ? Math.round(Number(o.meses)) : MESES[linea]) : null;
    const corredor = ['profesional', 'corredor', 'inmobiliaria'].indexOf(o.perfil) > -1;
    const items = [];
    (reglas || []).filter(r => (r.linea === linea || r.linea === 'todas') && PAGAN.indexOf(r.paga) > -1 && r.activa !== false).forEach(r => {
      if (D.soloCorredor(r) && !corredor) return;
      const tipo = r.evento === 'lead_inversor' ? 'unitario' : r.evento === 'propuesta_aceptada' ? 'opcional' : 'suma';
      const veces = RECURRENTES.indexOf(r.evento) > -1 ? (meses || 1) : 1;
      let monto = null, mon = r.moneda, base = null, detalle;
      if (r.modo === 'fijo') {
        monto = Number(r.valor) * veces;
        detalle = veces > 1 ? TF('det_fijo_n', '{m} por pago · {p}', { m: dinero(r.valor, r.moneda), p: pagosTxt(veces) }) : T('det_fijo', 'precio fijo');
      } else {
        mon = moneda;
        if (precio != null) base = r.base === 'monto_contrato' ? (meses ? precio * meses : precio) : precio;
        if (base != null) {
          let uno = Math.round(base * Number(r.valor)) / 100;
          if (mon === r.moneda) { if (r.minimo != null && uno < r.minimo) uno = r.minimo; if (r.maximo != null && uno > r.maximo) uno = r.maximo; }
          monto = Math.round(uno * veces * 100) / 100;
        }
        detalle = pct(r.valor) + ' ' + sobreTxt(r, linea);
        if (precio != null) {
          if (RECURRENTES.indexOf(r.evento) > -1 || r.base === 'monto_hito') detalle += ' · ' + TF('det_pagos', '{p} de {m}', { p: pagosTxt(veces), m: dinero(precio, moneda) });
          else if (r.base === 'monto_contrato' && meses) detalle += ' · ' + TF('det_meses', '{n} a {m} por mes', { n: mesesTxt(meses), m: dinero(precio, moneda) });
          else detalle += ' · ' + dinero(precio, moneda);
        }
      }
      items.push({ concepto: r.concepto, evento: r.evento, paga: r.paga, modo: r.modo, valor: Number(r.valor), base: r.base, tipo, veces, moneda: mon, monto, cuando: D.cuandoTarifa(r, linea), detalle, nota: r.nota_publica || null, cobra: !!r.cobra, soloCorredor: D.soloCorredor(r) });
    });
    const pesoTipo = { suma: 0, unitario: 1, opcional: 2 };
    items.sort((a, b) => pesoTipo[a.tipo] - pesoTipo[b.tipo] || posEvento(a.evento) - posEvento(b.evento) || String(a.concepto).localeCompare(String(b.concepto)));
    const total = {}; let completo = true;
    items.filter(i => i.tipo === 'suma').forEach(i => { if (i.monto == null) { completo = false; return; } total[i.moneda] = Math.round(((total[i.moneda] || 0) + i.monto) * 100) / 100; });
    const monedas = Object.keys(total).sort((a, b) => a === 'USD' ? -1 : b === 'USD' ? 1 : 0);
    const totalTxt = monedas.map(m => dinero(total[m], m)).join(' + ');
    const supuesto = linea === 'pozo' ? T('sup_pozo', 'Se paga por cada inversor verificado que te consulta. No depende de la venta.')
      : precio == null ? T('sup_sin_precio', 'Con el precio, calculamos el total.')
      : linea === 'venta' ? (o.porUnidad ? TF('sup_venta_unidad', 'Por cada unidad vendida, al precio publicado ({m}).', { m: dinero(precio, moneda) }) : TF('sup_venta', 'La venta al precio publicado, {m}.', { m: dinero(precio, moneda) }))
      : linea === 'temporario' ? TF('sup_temporario', 'Una estadía de {n} a {m} por mes.', { n: mesesTxt(meses), m: dinero(precio, moneda) })
      : TF('sup_alquiler', '{n} de alquiler a {m} por mes.', { n: mesesTxt(meses), m: dinero(precio, moneda) });
    const totalRot = MESES[linea] ? (linea === 'temporario' ? T('total_estadia', 'Total estimado de la estadía') : TF('total_meses', 'Total estimado para {n}', { n: mesesTxt(meses) }))
      : o.porUnidad ? T('total_unidad', 'Total estimado por unidad') : T('total', 'Total estimado');
    return { linea, lineaTxt: (D.LINEAS && D.LINEAS[linea]) || linea, precio, moneda, meses, porUnidad: !!o.porUnidad, perfil: o.perfil || null,
      items, total, totalTxt, totalRot, completo, supuesto, simulado: !items.some(i => i.cobra), mixto: items.some(i => i.cobra) && items.some(i => !i.cobra) };
  };
  D.estimarServicios = async function(opciones){
    const o = opciones || {};
    if (LINEAS.indexOf(o.linea) < 0) throw new Error(T('err_linea', 'Línea desconocida.'));
    return D.calcularEstimado(await D.tarifas(o.linea), o);
  };

  /* ── La barra del asistente para publicar ──────────────── */
  /* Como Pedidos Ya: dos renglones fijos arriba de Continuar ("Publicar: sin costo" y "Si cerrás por BAIREN ≈ USD X")
     con un enlace "Ver detalle" que abre la hoja de abajo del asistente (pf-hoja): cada servicio en una línea con su
     precio, el total y los supuestos en letra chica. */
  D.resumenEstimado = function(e){
    const sumados = e.items.filter(i => i.tipo === 'suma'), unit = e.items.filter(i => i.tipo === 'unitario');
    if (sumados.length && e.completo && e.totalTxt) return { rot: T('si_cerras', 'Si cerrás por BAIREN'), val: '≈ ' + e.totalTxt + (e.porUnidad ? ' ' + T('por_unidad', 'por unidad') : '') };
    if (!sumados.length && unit.length) return { rot: unit[0].evento === 'lead_inversor' ? T('por_inversor_rot', 'Por inversor verificado') : unit[0].concepto, val: unit.map(i => dinero(i.monto, i.moneda)).join(' + ') };
    if (!sumados.length) return { rot: T('si_cerras', 'Si cerrás por BAIREN'), val: T('sin_servicios', 'sin servicios con costo') };
    return { rot: T('si_cerras', 'Si cerrás por BAIREN'), val: T('segun_precio', 'según el precio') };
  };
  /* El renglón de un servicio: nombre y precio; debajo, en letra chica, cuándo se paga y el supuesto */
  D.itemEstimadoHtml = function(i, e){
    const paga = i.paga === 'propietario' && e.perfil && e.perfil !== 'dueno' ? ' · ' + T('paga_propietario', 'lo paga el propietario') : '';
    const hoy = e.mixto && !i.cobra ? ' · ' + T('hoy_sin_costo', 'hoy sin costo') : '';
    const monto = i.monto == null ? pct(i.valor) : dinero(i.monto, i.moneda);
    return `<li><span class="tf-n">${esc(i.concepto)}</span><span class="tf-m">${esc(nb(monto))}</span><small>${esc(nb(i.cuando + ' · ' + i.detalle + paga + hoy))}</small></li>`;
  };
  D.estimadoUI = function(pie, opciones){
    const op = opciones || {};
    if (!pie) return null;
    const caja = document.createElement('div');
    caja.className = 'tf-barra'; caja.hidden = true; caja.setAttribute('role', 'region'); caja.setAttribute('aria-label', T('aria', 'Lo que cuestan los servicios de BAIREN'));
    pie.insertBefore(caja, op.antesDe && op.antesDe.parentNode === pie ? op.antesDe : pie.firstChild);
    let turno = 0, ultimo = null, actual = null;
    todas().catch(() => {});   /* precarga: cuando llegue el precio, las tarifas ya están */
    const visible = on => { caja.hidden = !on; document.body.classList.toggle('tf-con-estimado', on); };
    function hoja(boton){
      const e = actual; if (!e) return;
      const sumados = e.items.filter(i => i.tipo === 'suma'), unit = e.items.filter(i => i.tipo === 'unitario'), opc = e.items.filter(i => i.tipo === 'opcional');
      const h = document.createElement('div'); h.className = 'pf-hoja tf-hoja';
      h.innerHTML = `<div class="pf-hoja-fondo" data-cerrar></div><div class="pf-hoja-caja" role="dialog" aria-modal="true" aria-labelledby="tfHojaT">
        <p class="pf-hoja-t" id="tfHojaT">${esc(T('hoja_t', 'Si cerrás por BAIREN'))}</p>
        <p class="tf-intro">${esc(T('intro_hoja', 'Publicar es sin costo. Estos servicios se pagan al usarlos.'))}</p>
        ${sumados.length || unit.length ? `<ul class="tf-items">${sumados.concat(unit).map(i => D.itemEstimadoHtml(i, e)).join('')}</ul>` : `<p class="tf-intro">${esc(T('sin_servicios_det', 'Para esta publicación no hay servicios con costo.'))}</p>`}
        ${sumados.length && e.completo && e.totalTxt ? `<p class="tf-total"><span>${esc(e.totalRot)}</span><b>${esc(nb(e.totalTxt))}</b></p>` : ''}
        <p class="tf-sup">${esc(nb(e.supuesto))}${opc.length ? ' ' + esc(nb(opc.map(i => TF('si_usas', 'Si usás Búsquedas: {m} por propuesta aceptada.', { m: dinero(i.monto, i.moneda) })).join(' '))) : ''}</p>
        <p class="tf-sup tf-lanz">${esc(e.simulado ? T('lanzamiento', 'Precios de lanzamiento. Hoy no se cobran.') : T('vigentes', 'Cada servicio se paga cuando se usa.'))}</p>
        <div class="pf-hoja-acc"><button type="button" class="suave" data-cerrar>${esc(T('cerrar', 'Cerrar'))}</button></div></div>`;
      document.body.appendChild(h);
      /* Como la hoja del buscador de la portada: abrirla suma un paso al historial, así el Atrás del celular la cierra
         sin sacar a la persona del asistente; cerrarla con Cerrar, Escape o tocando afuera deshace ese paso. */
      let abierta = true, conHistoria = false, viaHistoria = false;
      const alVolver = () => { if (!abierta) return; viaHistoria = true; soltar(); };
      const soltar = BP.focoAtrapado(h.querySelector('.pf-hoja-caja'), { devolverA: boton, primero: h.querySelector('.pf-hoja-acc button'), alCerrar: () => {
        if (!abierta) return; abierta = false; window.removeEventListener('popstate', alVolver); h.remove();
        if (conHistoria && !viaHistoria) { conHistoria = false; try { history.back(); } catch (x) { /* nada */ } }
      } });
      try { history.pushState({ tfHoja: 1 }, ''); conHistoria = true; } catch (x) { conHistoria = false; }
      window.addEventListener('popstate', alVolver);
      h.addEventListener('click', ev => { if (ev.target.closest('[data-cerrar]')) soltar(); });
    }
    function pintarHtml(e){
      const r = D.resumenEstimado(e);
      /* "Ver detalle" va al lado del primer renglón: el segundo (el monto) tiene todo el ancho y no se parte */
      caja.innerHTML = `<p class="tf-l1">${esc(T('publicar_sin_costo', 'Publicar: sin costo'))}</p>
        <button type="button" class="tf-ver" aria-haspopup="dialog">${esc(T('ver_detalle', 'Ver detalle'))}</button>
        <p class="tf-l2"><span>${esc(r.rot)}</span> <b aria-live="polite">${esc(nb(r.val))}</b></p>`;
      const b = caja.querySelector('.tf-ver'); b.addEventListener('click', () => hoja(b));
    }
    return {
      el: caja,
      /* datos: { linea, precio, moneda, meses, perfil, porUnidad } o null (se esconde) */
      async pintar(datos){
        const mio = ++turno;
        if (!datos) { visible(false); ultimo = null; actual = null; return null; }
        let e = null;
        try { e = await D.estimarServicios(datos); } catch (x) { e = null; }
        if (mio !== turno) return null;
        if (!e) { visible(false); ultimo = null; actual = null; return null; }
        actual = e;
        const clave = JSON.stringify(D.resumenEstimado(e));
        if (clave !== ultimo) { const foco = caja.contains(document.activeElement); pintarHtml(e); ultimo = clave; if (foco) { const b = caja.querySelector('.tf-ver'); if (b) b.focus(); } }
        visible(true);
        return e;
      },
      esconder(){ turno++; visible(false); ultimo = null; actual = null; }
    };
  };

  /* ── Cobros: el escenario que ven los publicadores ─────── */
  D.montarSelectorEscenario = async function(contenedor, reglas){
    if (!contenedor) return;
    let actual = ESCENARIO;
    try { actual = await D.escenarioPublico(); } catch (e) { actual = null; }
    const nombres = [...new Set((reglas || []).filter(r => r.activa !== false).map(r => r.escenario))].sort();
    if (actual && nombres.indexOf(actual) < 0) nombres.unshift(actual);
    const caja = document.createElement('div'); caja.className = 'tf-esc-pub';
    const opt = n => { const ok = D.escenarioMostrable(reglas, n); return `<option value="${esc(n)}"${n === actual ? ' selected' : ''}${ok || n === actual ? '' : ' disabled'}>${esc(n)}${ok ? '' : ' · ' + esc(T('no_mostrable', 'cobra un porcentaje, no se muestra'))}</option>`; };
    caja.innerHTML = `<label for="tfEscPub">${esc(T('esc_rot', 'Escenario que ven los publicadores'))}</label>
      <div class="tf-esc-fila"><select id="tfEscPub"${actual == null ? ' disabled' : ''}>${actual == null ? `<option>${esc(T('esc_sin_base', 'Falta la migración 35'))}</option>` : nombres.map(opt).join('')}</select>
      <a href="precios.html">${esc(T('esc_ver', 'Ver precios'))}</a></div>
      <p>${esc(T('esc_ayuda', 'Se usa al publicar y en Precios.'))}</p>`;
    const previo = contenedor.querySelector('.tf-esc-pub'); if (previo) previo.remove();
    const ancla = contenedor.querySelector('.cb-ok, .cb-alerta');
    if (ancla) ancla.insertAdjacentElement('afterend', caja); else contenedor.insertAdjacentElement('afterbegin', caja);
    const s = caja.querySelector('select');
    s.addEventListener('change', async () => {
      const v = s.value;
      s.disabled = true;
      try { actual = await D.fijarEscenarioPublico(v); if (window.BP && BP.toast) BP.toast(TF('esc_ok', 'Ahora los publicadores ven "{e}".', { e: actual })); }
      catch (e) { s.value = actual; if (window.BP && BP.toast) BP.toast(e.message || String(e), 'error'); }
      finally { s.disabled = false; }
    });
  };
})();
