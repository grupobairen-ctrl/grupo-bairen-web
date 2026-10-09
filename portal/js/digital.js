/* BAIREN · Portal · La operación digital (migración 27, 8/10/2026).
   Una sola puerta para todo lo nuevo: operaciones con su recorrido, chat, Se busca, Explorar y el motor de cobro por
   escenarios. Con base (BPStore.mode 'supabase') todo va por las funciones de la migración 27; en modo local, por
   localStorage con las mismas reglas, para probar los recorridos sin base.

   Está APAGADO para el público: las páginas nuevas y los accesos solo aparecen con BPDigital.activo(), que se prende
   con ?digital=1 en cualquier página (queda en este navegador) y se apaga con ?digital=0. Para abrirlo a todos,
   PUBLICO = true. */
(function(){
  'use strict';
  const PUBLICO = false;
  const S = () => window.BPStore;
  const T = (k, d) => (window.BP && BP.t) ? BP.t(k, d) : d;
  const D = {};

  /* ── interruptor ───────────────────────────────────────── */
  D.activo = function(){
    if (PUBLICO || (window.BP && BP.DIGITAL_PUBLICO)) return true;
    try {
      const q = new URLSearchParams(location.search).get('digital');
      if (q === '1') localStorage.setItem('bp_digital', '1');
      if (q === '0') localStorage.removeItem('bp_digital');
      return localStorage.getItem('bp_digital') === '1';
    } catch (e) { return false; }
  };

  /* ── vocabulario ───────────────────────────────────────── */
  D.LINEAS = {
    get temporario(){ return T('dg_l_temporario', 'Estadía corta (hasta 3 meses)'); },
    get mediano(){ return T('dg_l_mediano', 'Mediano plazo'); },
    get tradicional(){ return T('dg_l_tradicional', 'Alquiler a largo plazo'); },
    get venta(){ return T('dg_l_venta', 'Venta'); },
    get pozo(){ return T('dg_l_pozo', 'Desarrollo en pozo'); }
  };
  D.ETAPAS = ['consulta', 'conversacion', 'visita', 'solicitud', 'reserva', 'contrato', 'cerrada'];
  D.ETAPA_TXT = {
    get consulta(){ return T('dg_e_consulta', 'Consulta'); }, get conversacion(){ return T('dg_e_conversacion', 'Conversación'); },
    get visita(){ return T('dg_e_visita', 'Visita'); }, get solicitud(){ return T('dg_e_solicitud', 'Solicitud'); },
    get reserva(){ return T('dg_e_reserva', 'Reserva'); }, get contrato(){ return T('dg_e_contrato', 'Contrato'); },
    get cerrada(){ return T('dg_e_cerrada', 'Cerrada'); }, get caida(){ return T('dg_e_caida', 'Sin acuerdo'); }
  };
  D.HITO_TXT = {
    get consulta(){ return T('dg_h_consulta', 'Primera consulta'); }, get conversacion(){ return T('dg_h_conversacion', 'Empezó la conversación'); },
    get whatsapp(){ return T('dg_h_whatsapp', 'Pasaron a WhatsApp'); }, get visita_pedida(){ return T('dg_h_visita_pedida', 'Pidió una visita'); },
    get visita_confirmada(){ return T('dg_h_visita_confirmada', 'Visita confirmada'); }, get visita_realizada(){ return T('dg_h_visita_realizada', 'Visita hecha'); },
    get visita_cancelada(){ return T('dg_h_visita_cancelada', 'Visita cancelada'); }, get solicitud_enviada(){ return T('dg_h_solicitud_enviada', 'Mandó la solicitud'); },
    get solicitud_aceptada(){ return T('dg_h_solicitud_aceptada', 'Solicitud aceptada'); }, get solicitud_rechazada(){ return T('dg_h_solicitud_rechazada', 'Solicitud rechazada'); },
    get propuesta_aceptada(){ return T('dg_h_propuesta_aceptada', 'Aceptó una propuesta'); }, get reserva(){ return T('dg_h_reserva', 'Reserva'); },
    get contrato_generado(){ return T('dg_h_contrato_generado', 'Contrato preparado'); }, get contrato_firmado(){ return T('dg_h_contrato_firmado', 'Contrato firmado'); },
    get cierre(){ return T('dg_h_cierre', 'Operación cerrada'); }, get caida(){ return T('dg_h_caida', 'Sin acuerdo'); },
    get reabierta(){ return T('dg_h_reabierta', 'Se retomó'); }, get cobro_mensual(){ return T('dg_h_cobro_mensual', 'Cobro del mes'); }
  };
  D.PERFILES = {
    get particular(){ return T('dg_p_particular', 'Particular'); }, get inversor(){ return T('dg_p_inversor', 'Inversor'); },
    get familia(){ return T('dg_p_familia', 'Familia'); }, get empresa(){ return T('dg_p_empresa', 'Empresa'); },
    get extranjero(){ return T('dg_p_extranjero', 'Del exterior'); }
  };
  /* Qué pasos puede marcar cada lado (igual que portal.registrar_hito) */
  D.PUEDE = {
    interesado: ['whatsapp', 'visita_pedida', 'visita_cancelada', 'solicitud_enviada', 'caida'],
    publicador: ['whatsapp', 'visita_confirmada', 'visita_realizada', 'visita_cancelada', 'solicitud_aceptada', 'solicitud_rechazada', 'reserva', 'contrato_generado', 'contrato_firmado', 'cierre', 'caida', 'reabierta', 'cobro_mensual']
  };
  D.EVENTOS_COBRO = ['consulta', 'conversacion', 'whatsapp', 'visita_confirmada', 'visita_realizada', 'solicitud_enviada', 'solicitud_aceptada', 'propuesta_aceptada', 'reserva', 'contrato_generado', 'contrato_firmado', 'cierre', 'cobro_mensual'];
  D.ordenEtapa = e => { const i = D.ETAPAS.indexOf(e); return i < 0 ? 0 : i + 1; };
  D.lineaDe = (op, etapa, plazo) => op === 'venta' ? ((etapa === 'pozo' || etapa === 'construccion') ? 'pozo' : 'venta') : op === 'alquiler' ? 'tradicional' : op === 'mediano' ? ((plazo != null && plazo <= 3) ? 'temporario' : 'mediano') : null;

  /* ── base o local ──────────────────────────────────────── */
  const conBase = () => S() && S().mode === 'supabase' && !S().demo;
  const db = () => S().sb.schema('portal');
  const rpc = async (fn, args) => { const { data, error } = await db().rpc(fn, args || {}); if (error) throw humano(error); return data; };
  const humano = e => { const m = String((e && e.message) || e || ''); const err = new Error(/permission denied|JWT|not authenticated/i.test(m) ? T('dg_err_sesion', 'Ingresá para seguir.') : m); err.original = e; return err; };
  const requiereSesion = () => { if (!S() || !S().session) throw new Error(T('dg_err_sesion', 'Ingresá para seguir.')); return S().session; };

  const LS = key => ({ get(d){ try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? d : v; } catch (e) { return d; } }, set(v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} } });
  const L = { ops: LS('bp_dg_ops'), msj: LS('bp_dg_msj'), hitos: LS('bp_dg_hitos'), bus: LS('bp_dg_bus'), props: LS('bp_dg_props'), pubs: LS('bp_dg_publicaciones'), reglas: LS('bp_dg_reglas'), cargos: LS('bp_dg_cargos') };
  const uid = () => 'l' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const now = () => new Date().toISOString();
  let seq = Date.now();
  const nid = () => ++seq;
  /* Los avisos del catálogo (BPData) traen la operación en "op"; las filas de la base, en "operacion" */
  const opDe = a => (a && (a.operacion || a.op)) || null;
  const fotoDe = a => (a && ((a.fotos && a.fotos[0] && (a.fotos[0].url || a.fotos[0])) || a.foto || a.img)) || null;
  const miPub = async () => { try { return await S().getMyPublicador(); } catch (e) { return null; } };
  async function ladosLocal(op){
    const ses = S().session; const l = [];
    if (ses && op.interesado_user === ses.id) l.push('interesado');
    const p = await miPub(); if (p && p.id === op.publicador_id) l.push('publicador');
    if (ses && await S().isCurador()) l.push('plataforma');
    return l;
  }

  /* ── motor de cobro local (igual que portal._aplicar_reglas) ── */
  const REGLAS_EJEMPLO = [
    ['Idea original · porcentaje', 'Porcentaje de la operación', 'temporario', 'cierre', 'publicador', 'porcentaje', 0.5, 'USD', 'monto_contrato'],
    ['Idea original · porcentaje', 'Porcentaje de la operación', 'mediano', 'cierre', 'publicador', 'porcentaje', 0.5, 'USD', 'monto_contrato'],
    ['Idea original · porcentaje', 'Porcentaje de la operación', 'tradicional', 'cierre', 'publicador', 'porcentaje', 1, 'USD', 'monto_contrato'],
    ['Idea original · porcentaje', 'Porcentaje de la operación', 'venta', 'cierre', 'publicador', 'porcentaje', 1.5, 'USD', 'precio_cierre'],
    ['Idea original · porcentaje', 'Porcentaje de la operación', 'pozo', 'cierre', 'publicador', 'porcentaje', 3, 'USD', 'precio_cierre'],
    ['Sin matrícula · sección 12', 'Comisión de plataforma (temporario)', 'temporario', 'cierre', 'publicador', 'porcentaje', 3, 'USD', 'monto_contrato'],
    ['Sin matrícula · sección 12', 'Administración mensual', 'mediano', 'cobro_mensual', 'propietario', 'porcentaje', 5, 'USD', 'monto_hito'],
    ['Sin matrícula · sección 12', 'Administración mensual', 'tradicional', 'cobro_mensual', 'propietario', 'porcentaje', 5, 'USD', 'monto_hito'],
    ['Sin matrícula · sección 12', 'Contrato digital', 'mediano', 'contrato_generado', 'publicador', 'fijo', 40, 'USD', null],
    ['Sin matrícula · sección 12', 'Contrato digital', 'tradicional', 'contrato_generado', 'publicador', 'fijo', 40, 'USD', null],
    ['Sin matrícula · sección 12', 'Visita coordinada', 'venta', 'visita_confirmada', 'publicador', 'fijo', 20, 'USD', null],
    ['Sin matrícula · sección 12', 'Visita coordinada', 'pozo', 'visita_confirmada', 'publicador', 'fijo', 20, 'USD', null],
    ['Sin matrícula · sección 12', 'Propuesta aceptada en Se busca', 'todas', 'propuesta_aceptada', 'publicador', 'fijo', 25, 'USD', null]
  ];
  const reglasLocal = () => { let r = L.reglas.get(null); if (!r) { r = REGLAS_EJEMPLO.map(x => ({ id: uid(), escenario: x[0], concepto: x[1], linea: x[2], evento: x[3], paga: x[4], modo: x[5], valor: x[6], moneda: x[7], base: x[8], minimo: null, maximo: null, activa: true, cobra: false, nota: null })); L.reglas.set(r); } return r; };
  function aplicarLocal(h, escenario){
    const op = L.ops.get([]).find(o => o.id === h.operacion_id); if (!op) return 0;
    const cargos = L.cargos.get([]); let n = 0;
    reglasLocal().filter(r => r.activa && r.evento === h.tipo && (r.linea === 'todas' || r.linea === op.linea) && (!escenario || r.escenario === escenario)).forEach(r => {
      if (cargos.some(c => c.hito_id === h.id && c.regla_id === r.id)) return;
      let base = null, monto, moneda;
      if (r.modo === 'fijo') { monto = +r.valor; moneda = r.moneda; }
      else {
        base = r.base === 'precio_publicado' ? op.precio_publicado : r.base === 'precio_cierre' ? (op.precio_cierre || op.precio_publicado) : r.base === 'monto_contrato' ? (op.monto_contrato || op.precio_cierre) : r.base === 'monto_hito' ? +((h.datos || {}).monto || 0) : null;
        if (!base || base <= 0) return;
        moneda = (r.base === 'monto_hito' && h.datos && /^(USD|ARS)$/.test(h.datos.moneda)) ? h.datos.moneda : op.moneda;
        monto = Math.round(base * r.valor) / 100;
        if (moneda === r.moneda) { if (r.minimo != null && monto < r.minimo) monto = +r.minimo; if (r.maximo != null && monto > r.maximo) monto = +r.maximo; }
      }
      cargos.push({ id: nid(), operacion_id: op.id, hito_id: h.id, regla_id: r.id, escenario: r.escenario, publicador_id: op.publicador_id, paga: r.paga, concepto: r.concepto || r.evento, linea: op.linea, base_monto: base, moneda, monto, estado: r.cobra ? 'pendiente' : 'simulado', creado_en: now() });
      n++;
    });
    L.cargos.set(cargos); return n;
  }
  function hitoLocal(opId, tipo, lado, datos){
    const ops = L.ops.get([]); const op = ops.find(o => o.id === opId); if (!op) throw new Error('La operación no existe.');
    const nueva = { consulta: 'consulta', propuesta_aceptada: 'consulta', conversacion: 'conversacion', whatsapp: 'conversacion', visita_pedida: 'visita', visita_confirmada: 'visita', visita_realizada: 'visita', solicitud_enviada: 'solicitud', solicitud_aceptada: 'solicitud', reserva: 'reserva', contrato_firmado: 'contrato', cierre: 'cerrada' }[tipo];
    if (tipo === 'caida') { op.etapa = 'caida'; op.motivo_caida = (datos && datos.motivo) || null; }
    else if (tipo === 'reabierta') { op.etapa = 'conversacion'; op.motivo_caida = null; }
    else if (nueva && op.etapa !== 'caida' && D.ordenEtapa(nueva) > D.ordenEtapa(op.etapa)) op.etapa = nueva;
    op.actualizada_en = now(); L.ops.set(ops);
    const h = { id: nid(), operacion_id: opId, tipo, lado, autor: S().session ? S().session.id : null, datos: datos || null, creado_en: now() };
    const hs = L.hitos.get([]); hs.push(h); L.hitos.set(hs);
    try { aplicarLocal(h); } catch (e) { console.warn('motor de cobro local', e); }
    return h.id;
  }

  /* ── operaciones ───────────────────────────────────────── */
  /* aviso: el objeto de la ficha (id, publicador_id, operacion, etapa, precio, moneda, titulo…) */
  D.abrir = async function(aviso, mensaje, consultaId){
    requiereSesion();
    if (conBase()) return rpc('abrir_operacion', { p_aviso: aviso.id, p_mensaje: mensaje || null, p_consulta: consultaId || null });
    const ses = S().session; const p = await miPub();
    if (p && p.id === aviso.publicador_id) throw new Error(T('dg_err_propia', 'Es una publicación tuya.'));
    const pubDe = aviso.publicador_id ? await S().getPublicador(aviso.publicador_id).catch(() => null) : null;
    const ops = L.ops.get([]);
    let op = ops.find(o => o.aviso_id === aviso.id && o.interesado_user === ses.id && o.etapa !== 'cerrada' && o.etapa !== 'caida');
    if (!op) {
      op = { id: uid(), aviso_id: aviso.id, publicador_id: aviso.publicador_id || (aviso.publicador && aviso.publicador.id) || null, tipo: opDe(aviso), moneda: aviso.moneda === 'ARS' ? 'ARS' : 'USD', precio_publicado: aviso.precio || null, linea: D.lineaDe(opDe(aviso), aviso.etapa), etapa: 'consulta', interesado_user: ses.id, interesado_email: ses.email, consulta_id: consultaId || null, origen: 'ficha', abierta_en: now(), actualizada_en: now(), aviso: { id: aviso.id, titulo: aviso.titulo, codigo: aviso.codigo, barrio: aviso.barrio, direccion: aviso.direccion || aviso.dir, precio: aviso.precio, moneda: aviso.moneda, foto: fotoDe(aviso) }, publicador_nombre: (aviso.publicador && aviso.publicador.nombre) || aviso.publicador_nombre || (pubDe && pubDe.nombre) || null };
      ops.push(op); L.ops.set(ops);
      hitoLocal(op.id, 'consulta', 'interesado', consultaId ? { consulta_id: consultaId } : null);
    }
    if (mensaje && String(mensaje).trim()) await D.enviar(op.id, 'interesado', mensaje);
    return op.id;
  };

  D.bandeja = async function(opts){
    const o = opts || {};
    if (!S() || !S().session) return [];
    if (conBase()) return rpc('mis_operaciones', { p_todas: !!o.todas });
    const ses = S().session; const p = await miPub(); const cur = o.todas && await S().isCurador();
    const msj = L.msj.get([]);
    return L.ops.get([]).filter(x => x.interesado_user === ses.id || (p && x.publicador_id === p.id) || cur).map(x => {
      const lado = x.interesado_user === ses.id ? 'interesado' : (p && x.publicador_id === p.id) ? 'publicador' : 'plataforma';
      const ms = msj.filter(m => m.operacion_id === x.id); const u = ms[ms.length - 1];
      return { id: x.id, lado, etapa: x.etapa, linea: x.linea, tipo: x.tipo, origen: x.origen, aviso_id: x.aviso_id, aviso_codigo: x.aviso && x.aviso.codigo, aviso_titulo: x.aviso && x.aviso.titulo, aviso_lugar: x.aviso && (x.aviso.barrio || x.aviso.direccion), foto: x.aviso && x.aviso.foto, publicador_id: x.publicador_id, publicador_nombre: x.publicador_nombre, contraparte: lado === 'interesado' ? x.publicador_nombre : (x.interesado_email || '').split('@')[0], ultimo_texto: u ? u.texto : null, ultimo_lado: u ? u.lado : null, ultimo_en: u ? u.creado_en : null, no_leidos: ms.filter(m => m.lado !== lado && !m.leido_en).length, abierta_en: x.abierta_en, actualizada_en: x.actualizada_en };
    }).sort((a, b) => String(b.ultimo_en || b.actualizada_en).localeCompare(String(a.ultimo_en || a.actualizada_en)));
  };
  /* Total de mensajes sin leer (para el número del acceso) */
  D.noLeidos = async function(){ try { return (await D.bandeja()).reduce((n, r) => n + (r.no_leidos || 0), 0); } catch (e) { return 0; } };

  D.detalle = async function(opId){
    requiereSesion();
    if (conBase()) return rpc('operacion_detalle', { p_op: opId });
    const op = L.ops.get([]).find(o => o.id === opId); if (!op) throw new Error(T('dg_err_no_parte', 'No sos parte de esta operación.'));
    const lados = await ladosLocal(op); if (!lados.length) throw new Error(T('dg_err_no_parte', 'No sos parte de esta operación.'));
    const lado = lados.indexOf('interesado') > -1 ? 'interesado' : lados.indexOf('publicador') > -1 ? 'publicador' : 'plataforma';
    const pub = op.publicador_id ? await S().getPublicador(op.publicador_id).catch(() => null) : null;
    return {
      operacion: Object.assign({}, op), lado, lados,
      aviso: op.aviso ? Object.assign({ operacion: op.tipo }, op.aviso) : null,
      publicador: { id: op.publicador_id, nombre: (pub && pub.nombre) || op.publicador_nombre, slug: pub && pub.slug, tipo: pub && pub.tipo, verificado: !!(pub && pub.verificado), whatsapp: lado !== 'publicador' && D.ordenEtapa(op.etapa) >= 2 ? ((pub && (pub.whatsapp || pub.telefono)) || null) : null },
      interesado: lado !== 'interesado' ? { nombre: (op.interesado_email || '').split('@')[0], email: op.interesado_email, telefono: null, verificado: false } : null,
      hitos: L.hitos.get([]).filter(h => h.operacion_id === opId),
      visitas: (op.visitas_local || []),
      documentos: [],
      cargos: lados.indexOf('plataforma') > -1 ? L.cargos.get([]).filter(c => c.operacion_id === opId) : null
    };
  };

  /* Mensajes de una operación; con desdeId, solo los nuevos */
  D.mensajes = async function(opId, desdeId){
    requiereSesion();
    if (conBase()) {
      let q = db().from('mensajes').select('id,lado,texto,creado_en,leido_en').eq('operacion_id', opId).order('id', { ascending: true }).limit(500);
      if (desdeId) q = q.gt('id', desdeId);
      const { data, error } = await q; if (error) throw humano(error); return data || [];
    }
    return L.msj.get([]).filter(m => m.operacion_id === opId && (!desdeId || m.id > desdeId));
  };
  D.enviar = async function(opId, lado, texto){
    requiereSesion();
    const t = String(texto || '').trim(); if (!t) throw new Error(T('dg_err_vacio', 'Escribí un mensaje.'));
    if (t.length > 4000) throw new Error(T('dg_err_largo', 'El mensaje es muy largo.'));
    if (conBase()) { const { data, error } = await db().from('mensajes').insert({ operacion_id: opId, lado, texto: t }).select('id,lado,texto,creado_en,leido_en').single(); if (error) throw humano(error); return data; }
    const op = L.ops.get([]).find(o => o.id === opId); if (!op) throw new Error('La operación no existe.');
    if ((await ladosLocal(op)).indexOf(lado) < 0) throw new Error(T('dg_err_no_parte', 'No sos parte de esta operación.'));
    const all = L.msj.get([]); const m = { id: nid(), operacion_id: opId, lado, autor: S().session.id, texto: t, creado_en: now(), leido_en: null }; all.push(m); L.msj.set(all);
    if ((lado === 'interesado' || lado === 'publicador') && !L.hitos.get([]).some(h => h.operacion_id === opId && h.tipo === 'conversacion') && all.some(x => x.operacion_id === opId && (x.lado === 'interesado' || x.lado === 'publicador') && x.lado !== lado)) hitoLocal(opId, 'conversacion', lado, null);
    else { const ops = L.ops.get([]); const o = ops.find(x => x.id === opId); if (o) { o.actualizada_en = now(); L.ops.set(ops); } }
    return m;
  };
  D.leidos = async function(opId){
    if (!S() || !S().session) return 0;
    if (conBase()) { try { return await rpc('marcar_leidos', { p_op: opId }); } catch (e) { return 0; } }
    const op = L.ops.get([]).find(o => o.id === opId); if (!op) return 0;
    const lados = await ladosLocal(op); const lado = lados.indexOf('interesado') > -1 ? 'interesado' : lados.indexOf('publicador') > -1 ? 'publicador' : null; if (!lado) return 0;
    const all = L.msj.get([]); let n = 0; all.forEach(m => { if (m.operacion_id === opId && m.lado !== lado && !m.leido_en) { m.leido_en = now(); n++; } }); L.msj.set(all); return n;
  };

  /* Un paso del recorrido. datos según el paso: visita_confirmada { fecha, nota }, visita_realizada { feedback },
     cierre { precio_cierre | monto_contrato, plazo_meses, moneda }, caida { motivo }, cobro_mensual { monto, moneda, periodo } */
  D.paso = async function(opId, tipo, datos){
    requiereSesion();
    if (conBase()) return rpc('registrar_hito', { p_op: opId, p_tipo: tipo, p_datos: datos || null });
    const op = L.ops.get([]).find(o => o.id === opId); if (!op) throw new Error('La operación no existe.');
    const lados = await ladosLocal(op); if (!lados.length) throw new Error(T('dg_err_no_parte', 'No sos parte de esta operación.'));
    const lado = (lados.indexOf('interesado') > -1 && D.PUEDE.interesado.indexOf(tipo) > -1) ? 'interesado' : (lados.indexOf('publicador') > -1 && D.PUEDE.publicador.indexOf(tipo) > -1) ? 'publicador' : (lados.indexOf('plataforma') > -1 && ['consulta', 'conversacion', 'propuesta_aceptada'].indexOf(tipo) < 0) ? 'plataforma' : null;
    if (!lado) throw new Error(T('dg_err_no_corresponde', 'Ese paso no te corresponde en esta operación.'));
    if ((op.etapa === 'caida' || op.etapa === 'cerrada') && tipo !== 'reabierta' && tipo !== 'cobro_mensual') throw new Error(T('dg_err_cerrada', 'La operación está cerrada.'));
    if (tipo === 'reabierta' && op.etapa !== 'caida') throw new Error('Solo se reabre una operación caída.');
    const d = datos || {}; const ops = L.ops.get([]); const o = ops.find(x => x.id === opId);
    if (d.plazo_meses != null) { o.plazo_meses = +d.plazo_meses; o.linea = D.lineaDe(o.tipo, null, o.plazo_meses) || o.linea; }
    if (tipo === 'reserva' || tipo === 'contrato_firmado' || tipo === 'cierre') { if (d.monto_contrato) o.monto_contrato = +d.monto_contrato; if (d.precio_cierre) o.precio_cierre = +d.precio_cierre; if (/^(USD|ARS)$/.test(d.moneda || '')) o.moneda = d.moneda; }
    if (tipo === 'cierre') { o.fecha_cierre = now().slice(0, 10); o.cerrada_en = now(); }
    if (tipo === 'visita_confirmada') { if (!d.fecha) throw new Error(T('dg_err_fecha', 'Falta la fecha de la visita.')); (o.visitas_local = o.visitas_local || []).push({ id: uid(), fecha: d.fecha, estado: 'confirmada', nota: d.nota || null, feedback: null }); }
    if (tipo === 'visita_realizada' || tipo === 'visita_cancelada') { const v = (o.visitas_local || []).filter(x => x.estado === 'confirmada').pop(); if (v) { v.estado = tipo === 'visita_realizada' ? 'realizada' : 'cancelada'; if (d.feedback) v.feedback = d.feedback; } }
    if (tipo === 'cobro_mensual' && !(+d.monto > 0)) throw new Error('Falta el monto cobrado.');
    L.ops.set(ops);
    return hitoLocal(opId, tipo, lado, datos || null);
  };

  /* ── Se busca ──────────────────────────────────────────── */
  const COLS_BUS = 'id,perfil,operacion,linea,tipo,zonas,ambientes_min,dormitorios_min,m2_min,precio_max,moneda,desde,plazo_meses,detalle,verificada,estado,vence_en,creado_en';
  const contacto = t => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t) || /(\d[\s.()-]*){10,}/.test(t) || /(wa\.me|whatsapp|instagram\.com|t\.me\/)/i.test(t);
  D.busquedasPublicas = async function(){
    if (!S() || !S().session) return [];
    if (conBase()) { const { data, error } = await db().from('busquedas_publicas').select('*').order('creado_en', { ascending: false }).limit(200); if (error) throw humano(error); return data || []; }
    const props = L.props.get([]);
    return L.bus.get([]).filter(b => b.estado === 'activa' && b.vence_en > now()).map(b => { const c = Object.assign({}, b); delete c.usuario; c.propuestas = props.filter(p => p.busqueda_id === b.id && p.estado !== 'retirada').length; return c; }).reverse();
  };
  D.misBusquedas = async function(){
    if (!S() || !S().session) return [];
    if (conBase()) { const { data, error } = await db().from('busquedas').select(COLS_BUS).eq('usuario', S().session.id).order('creado_en', { ascending: false }); if (error) throw humano(error); return data || []; }
    return L.bus.get([]).filter(b => b.usuario === S().session.id).reverse();
  };
  /* b: { id?, perfil, operacion, linea?, tipo, zonas[], ambientes_min, dormitorios_min, m2_min, precio_max, moneda, desde, plazo_meses, detalle } */
  D.guardarBusqueda = async function(b){
    const ses = requiereSesion();
    if (b.detalle && contacto(b.detalle)) throw new Error(T('dg_err_contacto', 'Sin datos de contacto en el texto: te das a conocer cuando aceptás una propuesta.'));
    const fila = {}; ['perfil', 'operacion', 'linea', 'tipo', 'zonas', 'ambientes_min', 'dormitorios_min', 'm2_min', 'precio_max', 'moneda', 'desde', 'plazo_meses', 'detalle'].forEach(k => { if (b[k] !== undefined) fila[k] = (b[k] === '' ? null : b[k]); });
    if (conBase()) {
      const q = b.id ? db().from('busquedas').update(fila).eq('id', b.id) : db().from('busquedas').insert(fila);
      const { data, error } = await q.select(COLS_BUS).single(); if (error) throw humano(error); return data;
    }
    const all = L.bus.get([]);
    if (b.id) { const x = all.find(y => y.id === b.id && y.usuario === ses.id); if (!x) throw new Error('No es tu búsqueda.'); Object.assign(x, fila); x.linea = (fila.operacion === 'venta' && fila.linea === 'pozo') ? 'pozo' : D.lineaDe(x.operacion, null, x.plazo_meses); L.bus.set(all); return x; }
    if (all.filter(y => y.usuario === ses.id && y.estado === 'activa').length >= 5) throw new Error(T('dg_err_max_bus', 'Podés tener hasta 5 búsquedas activas.'));
    const x = Object.assign({ id: uid(), usuario: ses.id, perfil: 'particular', zonas: [], moneda: 'USD', verificada: false, estado: 'activa', vence_en: new Date(Date.now() + 60 * 864e5).toISOString(), creado_en: now() }, fila);
    x.linea = (x.operacion === 'venta' && fila.linea === 'pozo') ? 'pozo' : D.lineaDe(x.operacion, null, x.plazo_meses);
    all.push(x); L.bus.set(all); return x;
  };
  D.estadoBusqueda = async function(id, estado){
    requiereSesion();
    if (conBase()) { const { error } = await db().from('busquedas').update({ estado }).eq('id', id); if (error) throw humano(error); return; }
    const all = L.bus.get([]); const x = all.find(y => y.id === id); if (x) { x.estado = estado; L.bus.set(all); }
  };
  D.verificarBusqueda = async function(id, ok){
    requiereSesion();
    if (conBase()) { const { error } = await db().from('busquedas').update({ verificada: !!ok }).eq('id', id); if (error) throw humano(error); return; }
    const all = L.bus.get([]); const x = all.find(y => y.id === id); if (x) { x.verificada = !!ok; L.bus.set(all); }
  };
  D.borrarBusqueda = async function(id){
    requiereSesion();
    if (conBase()) { const { error } = await db().from('busquedas').delete().eq('id', id); if (error) throw humano(error); return; }
    L.bus.set(L.bus.get([]).filter(y => !(y.id === id && y.usuario === S().session.id)));
  };
  /* El publicador de la sesión le propone una de sus unidades publicadas a una búsqueda */
  D.proponer = async function(busquedaId, aviso, mensaje){
    requiereSesion();
    const p = await miPub(); if (!p) throw new Error(T('dg_err_sin_pub', 'Para proponer una unidad necesitás una cuenta de publicador.'));
    if (conBase()) { const { data, error } = await db().from('propuestas').insert({ busqueda_id: busquedaId, publicador_id: p.id, aviso_id: aviso.id, mensaje: mensaje || null }).select('id').single(); if (error) throw humano(error); return data.id; }
    const b = L.bus.get([]).find(x => x.id === busquedaId); if (!b || b.estado !== 'activa') throw new Error('Esta búsqueda ya no está activa.');
    if (b.usuario === S().session.id) throw new Error('Es una búsqueda tuya.');
    const all = L.props.get([]);
    if (all.some(x => x.busqueda_id === busquedaId && x.aviso_id === aviso.id)) throw new Error('Ya propusiste esta unidad.');
    if (all.filter(x => x.busqueda_id === busquedaId && x.publicador_id === p.id).length >= 3) throw new Error('Ya le propusiste 3 unidades a esta búsqueda.');
    const x = { id: uid(), busqueda_id: busquedaId, publicador_id: p.id, publicador_nombre: p.nombre, publicador_tipo: p.tipo, publicador_verificado: !!p.verificado, aviso_id: aviso.id, aviso: { id: aviso.id, codigo: aviso.codigo, titulo: aviso.titulo, barrio: aviso.barrio, precio: aviso.precio, moneda: aviso.moneda, operacion: opDe(aviso), etapa: aviso.etapa, foto: fotoDe(aviso) }, autor: S().session.id, mensaje: mensaje || null, estado: 'enviada', operacion_id: null, creado_en: now(), respondida_en: null };
    all.push(x); L.props.set(all); return x.id;
  };
  D.propuestasRecibidas = async function(){
    if (!S() || !S().session) return [];
    if (conBase()) return rpc('propuestas_recibidas');
    const mias = L.bus.get([]).filter(b => b.usuario === S().session.id).map(b => b.id);
    return L.props.get([]).filter(p => mias.indexOf(p.busqueda_id) > -1 && p.estado !== 'retirada').map(p => ({ id: p.id, busqueda_id: p.busqueda_id, estado: p.estado, mensaje: p.mensaje, creado_en: p.creado_en, operacion_id: p.operacion_id, aviso_id: p.aviso_id, aviso_codigo: p.aviso.codigo, aviso_titulo: p.aviso.titulo, aviso_barrio: p.aviso.barrio, aviso_precio: p.aviso.precio, aviso_moneda: p.aviso.moneda, foto: p.aviso.foto, publicador_id: p.publicador_id, publicador_nombre: p.publicador_nombre, publicador_tipo: p.publicador_tipo, publicador_verificado: p.publicador_verificado })).reverse();
  };
  D.misPropuestas = async function(){
    if (!S() || !S().session) return [];
    if (conBase()) return rpc('mis_propuestas');
    const p = await miPub(); if (!p) return [];
    const bus = L.bus.get([]);
    return L.props.get([]).filter(x => x.publicador_id === p.id).map(x => { const b = bus.find(y => y.id === x.busqueda_id) || {}; return { id: x.id, busqueda_id: x.busqueda_id, estado: x.estado, mensaje: x.mensaje, creado_en: x.creado_en, respondida_en: x.respondida_en, operacion_id: x.operacion_id, aviso_id: x.aviso_id, aviso_titulo: x.aviso.titulo, busqueda: { perfil: b.perfil, operacion: b.operacion, linea: b.linea, tipo: b.tipo, zonas: b.zonas, ambientes_min: b.ambientes_min, dormitorios_min: b.dormitorios_min, precio_max: b.precio_max, moneda: b.moneda, verificada: b.verificada, estado: b.estado } }; }).reverse();
  };
  /* accion: 'aceptar' (devuelve el id de la operación) | 'rechazar' | 'retirar' */
  D.responder = async function(propuestaId, accion){
    requiereSesion();
    if (conBase()) return rpc('responder_propuesta', { p_id: propuestaId, p_accion: accion });
    const all = L.props.get([]); const x = all.find(y => y.id === propuestaId); if (!x) throw new Error('La propuesta no existe.');
    if (x.estado !== 'enviada') throw new Error('La propuesta ya fue respondida.');
    if (accion === 'retirar') { x.estado = 'retirada'; x.respondida_en = now(); L.props.set(all); return null; }
    const b = L.bus.get([]).find(y => y.id === x.busqueda_id); if (!b || b.usuario !== S().session.id) throw new Error('Solo quien busca responde la propuesta.');
    if (accion === 'rechazar') { x.estado = 'rechazada'; x.respondida_en = now(); L.props.set(all); return null; }
    const ses = S().session; const ops = L.ops.get([]);
    let op = ops.find(o => o.aviso_id === x.aviso_id && o.interesado_user === ses.id && o.etapa !== 'cerrada' && o.etapa !== 'caida');
    if (!op) { op = { id: uid(), aviso_id: x.aviso_id, publicador_id: x.publicador_id, tipo: x.aviso.operacion || b.operacion, moneda: x.aviso.moneda === 'ARS' ? 'ARS' : b.moneda, precio_publicado: x.aviso.precio, linea: D.lineaDe(x.aviso.operacion, x.aviso.etapa) || b.linea, etapa: 'consulta', interesado_user: ses.id, interesado_email: ses.email, busqueda_id: b.id, origen: 'se_busca', abierta_en: now(), actualizada_en: now(), aviso: x.aviso, publicador_nombre: x.publicador_nombre }; ops.push(op); L.ops.set(ops); }
    x.estado = 'aceptada'; x.respondida_en = now(); x.operacion_id = op.id; L.props.set(all);
    hitoLocal(op.id, 'propuesta_aceptada', 'interesado', { propuesta_id: x.id, busqueda_id: b.id });
    if (x.mensaje) { const ms = L.msj.get([]); ms.push({ id: nid(), operacion_id: op.id, lado: 'publicador', autor: x.autor, texto: x.mensaje, creado_en: now(), leido_en: null }); L.msj.set(ms); }
    return op.id;
  };

  /* ── Explorar ──────────────────────────────────────────── */
  /* Filas de la vista portal.novedades: { tipo: nuevo|baja_precio|lanzamiento|avance_obra|novedad, aviso_id, publicacion_id,
     fecha, anterior, precio, moneda, titulo, texto, entrega, publicador_id }. En modo local, lo nuevo de BPData. */
  D.novedades = async function(){
    if (conBase()) { const { data, error } = await db().from('novedades').select('*').order('fecha', { ascending: false }).limit(120); if (error) throw humano(error); return data || []; }
    let avisos = []; try { avisos = (await window.BPData.load()).avisos || []; } catch (e) {}
    const cuando = a => a.publicadoEn || a.publicado_en || a.created_at || '';
    const nuevos = avisos.slice().sort((a, b) => String(cuando(b)).localeCompare(String(cuando(a)))).slice(0, 12)
      .map(a => ({ tipo: 'nuevo', aviso_id: a.id, publicacion_id: null, fecha: cuando(a) || now(), anterior: null, precio: a.precio, moneda: a.moneda, titulo: null, texto: null, entrega: null, publicador_id: ((window.BPData && BPData.PUBLICADORES && BPData.PUBLICADORES[a.publicadorId]) || {}).storeId || a.publicadorId || null }));
    const pubs = L.pubs.get([]).filter(p => p.estado === 'publicada').map(p => ({ tipo: p.tipo, aviso_id: p.aviso_id, publicacion_id: p.id, fecha: p.publicado_en, anterior: null, precio: null, moneda: null, titulo: p.titulo, texto: p.texto, entrega: p.entrega, publicador_id: p.publicador_id }));
    return pubs.concat(nuevos).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  };
  /* p: { id?, tipo: lanzamiento|avance_obra|novedad, titulo, texto, imagen_url, entrega, aviso_id } · entra en revisión */
  D.publicar = async function(p){
    requiereSesion();
    const pub = await miPub(); if (!pub) throw new Error(T('dg_err_sin_pub', 'Para publicar una novedad necesitás una cuenta de publicador.'));
    const fila = { tipo: p.tipo, titulo: p.titulo, texto: p.texto || null, imagen_url: p.imagen_url || null, entrega: p.entrega || null, aviso_id: p.aviso_id || null };
    if (conBase()) {
      const q = p.id ? db().from('publicaciones').update(fila).eq('id', p.id) : db().from('publicaciones').insert(Object.assign({ publicador_id: pub.id }, fila));
      const { data, error } = await q.select('*').single(); if (error) throw humano(error); return data;
    }
    const all = L.pubs.get([]); const cur = await S().isCurador();
    if (p.id) { const x = all.find(y => y.id === p.id); Object.assign(x, fila); if (!cur && x.estado !== 'retirada') x.estado = 'en_revision'; L.pubs.set(all); return x; }
    const x = Object.assign({ id: uid(), publicador_id: pub.id, publicador_nombre: pub.nombre, estado: 'en_revision', creado_en: now(), publicado_en: null }, fila); all.push(x); L.pubs.set(all); return x;
  };
  D.misPublicaciones = async function(){
    const pub = await miPub(); if (!pub) return [];
    if (conBase()) { const { data, error } = await db().from('publicaciones').select('*').eq('publicador_id', pub.id).order('creado_en', { ascending: false }); if (error) throw humano(error); return data || []; }
    return L.pubs.get([]).filter(p => p.publicador_id === pub.id).reverse();
  };
  D.publicacionesPendientes = async function(){
    if (!S() || !S().session || !(await S().isCurador())) return [];
    if (conBase()) { const { data, error } = await db().from('publicaciones').select('*, publicadores(nombre,slug,tipo)').eq('estado', 'en_revision').order('creado_en', { ascending: true }); if (error) throw humano(error); return data || []; }
    return L.pubs.get([]).filter(p => p.estado === 'en_revision');
  };
  /* La curación publica, rechaza (con motivo) o retira; el publicador solo retira */
  D.estadoPublicacion = async function(id, estado, motivo){
    requiereSesion();
    if (conBase()) { const { error } = await db().from('publicaciones').update({ estado, motivo: motivo || null }).eq('id', id); if (error) throw humano(error); return; }
    const all = L.pubs.get([]); const x = all.find(y => y.id === id); if (x) { x.estado = estado; x.motivo = motivo || null; if (estado === 'publicada' && !x.publicado_en) x.publicado_en = now(); L.pubs.set(all); }
  };

  /* ── Cobros (plataforma) ───────────────────────────────── */
  D.reglas = async function(){
    if (conBase()) { const { data, error } = await db().from('reglas_cobro').select('*').order('escenario').order('linea').order('evento'); if (error) throw humano(error); return data || []; }
    return reglasLocal();
  };
  /* r: { id?, escenario, concepto, linea, evento, paga, modo, valor, moneda, base, minimo, maximo, activa, cobra, nota } */
  D.guardarRegla = async function(r){
    requiereSesion();
    const fila = {}; ['escenario', 'concepto', 'linea', 'evento', 'paga', 'modo', 'valor', 'moneda', 'base', 'minimo', 'maximo', 'activa', 'cobra', 'nota'].forEach(k => { if (r[k] !== undefined) fila[k] = r[k] === '' ? null : r[k]; });
    if (fila.modo === 'fijo') fila.base = null;
    if (conBase()) { const q = r.id ? db().from('reglas_cobro').update(fila).eq('id', r.id) : db().from('reglas_cobro').insert(fila); const { data, error } = await q.select('*').single(); if (error) throw humano(error); return data; }
    const all = reglasLocal(); if (r.id) { const x = all.find(y => y.id === r.id); Object.assign(x, fila); L.reglas.set(all); return x; }
    const x = Object.assign({ id: uid(), activa: true, cobra: false, moneda: 'USD', linea: 'todas', paga: 'publicador' }, fila); all.push(x); L.reglas.set(all); return x;
  };
  D.borrarRegla = async function(id){
    requiereSesion();
    if (conBase()) { const { error } = await db().from('reglas_cobro').delete().eq('id', id); if (error) throw humano(error); return; }
    L.reglas.set(reglasLocal().filter(r => r.id !== id));
  };
  /* "¿Cuánto habríamos facturado con este esquema?": rehace lo simulado con las reglas de hoy */
  D.recalcular = async function(escenario){
    requiereSesion();
    if (conBase()) return rpc('recalcular_cargos', { p_escenario: escenario || null });
    L.cargos.set(L.cargos.get([]).filter(c => !(c.estado === 'simulado' && (!escenario || c.escenario === escenario))));
    let n = 0; L.hitos.get([]).forEach(h => { n += aplicarLocal(h, escenario || null); }); return n;
  };
  /* Totales por escenario, línea, quién paga, estado y moneda */
  D.resumen = async function(){
    if (conBase()) return rpc('resumen_cobros');
    const g = {}; L.cargos.get([]).forEach(c => { const k = [c.escenario, c.linea || '—', c.paga, c.estado, c.moneda].join('|'); (g[k] = g[k] || { escenario: c.escenario, linea: c.linea || '—', paga: c.paga, estado: c.estado, moneda: c.moneda, cantidad: 0, total: 0 }); g[k].cantidad++; g[k].total += +c.monto; });
    return Object.values(g);
  };
  D.cargos = async function(opts){
    const o = opts || {};
    if (conBase()) { let q = db().from('cargos').select('*').order('id', { ascending: false }).limit(o.limit || 200); if (o.escenario) q = q.eq('escenario', o.escenario); const { data, error } = await q; if (error) throw humano(error); return data || []; }
    return L.cargos.get([]).filter(c => !o.escenario || c.escenario === o.escenario).reverse().slice(0, o.limit || 200);
  };

  window.BPDigital = D;
})();
