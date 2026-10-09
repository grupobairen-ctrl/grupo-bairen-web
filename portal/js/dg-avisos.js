/* BAIREN · Portal · Avisos y cruce de búsquedas (migración 32, 9/10/2026).
   "Que nada quede sin contestar": cada mensaje y cada paso de una operación le llega a la otra parte, y cada búsqueda
   activa se cruza con las unidades publicadas.

   Suma a BPDigital (js/digital.js, que tiene que estar cargado antes):
     · avisos({ limite, sinLeer }) → los avisos de la sesión, los más nuevos primero;
     · noLeidosAvisos() → cuántos sin leer;  marcarLeido(id | [ids] | null) → null: todos;
     · preferenciasAviso() → { email }  y  guardarPreferenciasAviso({ email });
     · coincidencias() → las del publicador de la sesión (sus unidades × búsquedas que encajan, sin quién busca);
     · campana(el) → arma la campana del header (la llama BP.campana en js/ui.js, que carga este archivo si falta).
   Con base, todo va por la migración 32 (los avisos los crean los triggers de la base). En modo local (sin base),
   este archivo envuelve enviar, paso, _hitoLocal, abrir, proponer, responder, leidos y guardarBusqueda de digital.js
   para crear los mismos avisos en localStorage (bp_dg_avisos), con las mismas reglas. */
(function(){
  'use strict';
  const D = window.BPDigital;
  if (!D || D.campana) return;
  const S = () => window.BPStore;
  const t = (k, d) => (window.BP && BP.t) ? BP.t('dg_avisos_' + k, d) : d;
  const tf = (k, d, v) => (window.BP && BP.tf) ? BP.tf('dg_avisos_' + k, d, v) : String(d).replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
  const esc = s => (window.BP && BP.esc) ? BP.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = D._local;
  const LA = L.LS('bp_dg_avisos'), LP = L.LS('bp_dg_pref_avisos'), LC = L.LS('bp_dg_coincidencias');
  const OPS = L.LS('bp_dg_ops'), MSJ = L.LS('bp_dg_msj'), HITOS = L.LS('bp_dg_hitos'), BUS = L.LS('bp_dg_bus'), PROPS = L.LS('bp_dg_props'), PUBS = L.LS('bp_publicadores'), AVISOS = L.LS('bp_avisos');
  const yo = () => (S() && S().session && S().session.id) || null;
  const corta = (s, n) => { const x = String(s || '').replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n - 1).trimEnd() + '…' : x; };
  const COLS = 'id,tipo,titulo,texto,contexto,url,operacion_id,busqueda_id,aviso_id,lado,cantidad,leida_en,creado_en,actualizada_en';
  const cambio = () => { try { document.dispatchEvent(new CustomEvent('bp:avisos')); } catch (e) { /* nada */ } };
  /* Solo direcciones del portal (mensajes.html?op=…, propiedad.html?id=…, avisos.html#…) */
  D.urlAviso = u => /^[a-z0-9-]+\.html([?#][^\s"'<>]*)?$/i.test(String(u || '')) ? String(u) : 'avisos.html';

  /* ── Lectura y marcas ─────────────────────────────────── */
  D.avisos = async function(o){
    o = o || {}; if (!yo()) return [];
    const lim = Math.max(1, Math.min(+o.limite || 50, 200));
    if (D.conBase()) {
      let q = D.db().from('notificaciones').select(COLS).order('actualizada_en', { ascending: false }).limit(lim);
      if (o.sinLeer) q = q.is('leida_en', null);
      const { data, error } = await q; if (error) throw error; return data || [];
    }
    return LA.get([]).filter(n => n.usuario === yo() && (!o.sinLeer || !n.leida_en))
      .sort((a, b) => String(b.actualizada_en).localeCompare(String(a.actualizada_en)) || (b.id - a.id)).slice(0, lim);
  };
  D.noLeidosAvisos = async function(){
    if (!yo()) return 0;
    try {
      if (D.conBase()) { const { count, error } = await D.db().from('notificaciones').select('id', { count: 'exact', head: true }).is('leida_en', null); if (error) throw error; return count || 0; }
      return LA.get([]).filter(n => n.usuario === yo() && !n.leida_en).length;
    } catch (e) { return 0; }
  };
  D.marcarLeido = async function(id){
    if (!yo()) return 0;
    const ids = id == null ? null : [].concat(id).map(Number).filter(n => isFinite(n));
    let n = 0;
    if (D.conBase()) n = await D.rpc('marcar_notificaciones', { p_ids: ids });
    else { const all = LA.get([]); all.forEach(x => { if (x.usuario === yo() && !x.leida_en && (!ids || ids.indexOf(+x.id) > -1)) { x.leida_en = L.now(); n++; } }); LA.set(all); }
    cambio(); return n;
  };
  D.marcarTodosLeidos = () => D.marcarLeido(null);

  D.preferenciasAviso = async function(){
    if (!yo()) return { email: true };
    if (D.conBase()) { const { data, error } = await D.db().from('preferencias_aviso').select('email').eq('usuario', yo()).maybeSingle(); if (error) throw error; return { email: data ? !!data.email : true }; }
    const m = LP.get({}); return { email: m[yo()] ? m[yo()].email !== false : true };
  };
  D.guardarPreferenciasAviso = async function(p){
    if (!yo()) throw new Error(t('err_sesion', 'Ingresá para seguir.'));
    const email = !!(p && p.email);
    if (D.conBase()) { await D.rpc('guardar_preferencias_aviso', { p_email: email }); return { email }; }
    const m = LP.get({}); m[yo()] = { email }; LP.set(m); return { email };
  };

  /* ── Modo local: los mismos avisos que crean los triggers de la base ── */
  function avisarLocal(usuario, n, agrupar, varios){
    if (!usuario) return null;
    const all = LA.get([]);
    if (agrupar) {
      const v = all.filter(x => x.usuario === usuario && x.tipo === n.tipo && !x.leida_en && (x.operacion_id || null) === (n.operacion_id || null)
        && (x.busqueda_id || null) === (n.busqueda_id || null) && (x.aviso_id || null) === (n.aviso_id || null)).pop();
      if (v) {
        v.cantidad = (+v.cantidad || 0) + (n.cantidad == null ? 1 : n.cantidad);
        v.titulo = v.cantidad > 1 && varios ? varios.replace('{n}', v.cantidad) : n.titulo;
        ['texto', 'contexto', 'url', 'lado'].forEach(k => { if (n[k] != null) v[k] = n[k]; });
        v.actualizada_en = L.now(); LA.set(all); return v.id;
      }
    }
    const x = Object.assign({ id: L.nid(), usuario, cantidad: 1, texto: null, contexto: null, url: null, operacion_id: null, busqueda_id: null, aviso_id: null, lado: null, leida_en: null, creado_en: L.now(), actualizada_en: L.now(), email_enviado_en: null }, n);
    all.push(x); if (all.length > 600) all.splice(0, all.length - 600); LA.set(all); return x.id;
  }
  const equipoLocal = pubId => PUBS.get([]).filter(p => p.id === pubId && p.auth_user_id).map(p => p.auth_user_id);
  function destinatariosLocal(op, origen){
    const r = [];
    if (origen !== 'interesado' && op.interesado_user) r.push({ usuario: op.interesado_user, lado: 'interesado' });
    if (origen !== 'publicador') equipoLocal(op.publicador_id).forEach(u => r.push({ usuario: u, lado: 'publicador' }));
    return r;
  }
  const avisoLocal = id => AVISOS.get([]).find(a => a.id === id) || null;
  /* Para quien busca, el título de la unidad; para el publicador, la dirección (como la conoce) */
  function unidadLocal(avisoId, datos, paraPublicador){
    const a = avisoLocal(avisoId) || datos || {};
    if (paraPublicador && (a.direccion || a.dir)) return corta((a.direccion || a.dir) + (a.unidad ? ' · ' + a.unidad : ''), 200);
    const tit = a.titulo || t('una_unidad', 'Una unidad');
    return corta(a.barrio && tit.toLowerCase().indexOf(String(a.barrio).toLowerCase()) < 0 ? tit + ' · ' + a.barrio : tit, 200);
  }
  const ctxOp = (op, lado) => unidadLocal(op.aviso_id, op.aviso, lado === 'publicador');
  const nombreInteresado = op => { const s = String(op.interesado_email || '').split('@')[0].split('.')[0]; return s ? s.charAt(0).toUpperCase() + s.slice(1) : t('alguien', 'alguien'); };
  const fmtMonto = (n, m) => n == null || n === '' || !isFinite(+n) ? null : (m === 'ARS' ? '$ ' : 'USD ') + Math.round(+n).toLocaleString('es-AR');
  const fmtFecha = v => { const d = new Date(v); if (isNaN(d)) return null; const p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ', ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ' h'; };

  function mensajeLocal(opId, lado, m){
    const op = OPS.get([]).find(o => o.id === opId); if (!op || !m) return;
    const de = lado === 'interesado' ? nombreInteresado(op) : lado === 'publicador' ? (op.publicador_nombre || t('quien_publica', 'quien publica')) : 'BAIREN';
    const primero = lado === 'interesado' && MSJ.get([]).filter(x => x.operacion_id === opId).length === 1;
    destinatariosLocal(op, lado === 'plataforma' ? null : lado).forEach(r => {
      if (r.usuario === yo() || r.usuario === m.autor) return;
      avisarLocal(r.usuario, { tipo: 'mensaje', titulo: (primero ? t('nueva_consulta', 'Nueva consulta de') : t('mensaje_nuevo', 'Mensaje nuevo de')) + ' ' + de,
        texto: corta(m.texto, 160), contexto: ctxOp(op, r.lado), url: 'mensajes.html?op=' + encodeURIComponent(opId), operacion_id: opId, aviso_id: op.aviso_id || null, lado: r.lado },
        true, tf('n_mensajes', '{n} mensajes nuevos de {de}', { n: '{n}', de }));
    });
  }

  /* Igual que portal.trg_ntf_hito: cada paso importante, a la otra parte (si lo registra el sistema, a las dos) */
  const PASO = {
    visita_pedida: 'Pidieron una visita', visita_confirmada: 'Visita confirmada', visita_cancelada: 'Visita cancelada',
    solicitud_enviada: 'Recibiste una solicitud', solicitud_aceptada: 'Aceptaron tu solicitud', solicitud_rechazada: 'Tu solicitud no avanzó',
    reserva: 'Reserva registrada', reserva_pedida: 'Pidieron la reserva', reserva_pagada: 'Reserva pagada', reserva_vencida: 'La reserva venció', reserva_devuelta: 'Reserva devuelta',
    contrato_generado: 'Hay un contrato para revisar', documento_generado: 'Hay un documento para firmar', contrato_firmado: 'Contrato firmado', documento_firmado: 'Documento firmado',
    pago_recibido: 'Pago recibido', garantia_elegida: 'Eligió la garantía', garantia_emitida: 'Garantía aprobada', seguro_emitido: 'Seguro emitido',
    lead_inversor: 'Consulta de inversor verificado', cierre: 'Operación cerrada', caida: 'La operación quedó sin acuerdo', reabierta: 'Se retomó la operación'
  };
  function textoPaso(tipo, d){
    d = d || {};
    const f = d.fecha ? fmtFecha(d.fecha) : null, m = fmtMonto(d.monto, d.moneda);
    switch (tipo) {
      case 'visita_pedida': return f ? tf('t_propone', 'Propone el {f}.', { f }) : t('t_coordina', 'Coordiná el día y la hora.');
      case 'visita_confirmada': return f ? (tf('t_el', 'El {f}.', { f }) + (d.nota ? ' ' + corta(d.nota, 120) : '')) : null;
      case 'reserva_pagada': return m ? tf('t_sena', 'Seña de {m}.', { m }) : null;
      case 'pago_recibido': return [m, d.periodo].filter(Boolean).join(' · ') || null;
      case 'documento_generado': case 'documento_firmado': return d.titulo ? corta(d.titulo, 160) : null;
      case 'caida': return d.motivo ? corta(d.motivo, 200) : null;
      case 'solicitud_enviada': return t('t_solicitud', 'Revisala y respondé desde la conversación.');
    }
    return null;
  }
  function pasoLocal(h){
    if (!h || !PASO[h.tipo]) return;
    const op = OPS.get([]).find(o => o.id === h.operacion_id); if (!op) return;
    const origen = (h.lado === 'interesado' || h.lado === 'publicador') ? h.lado : null;
    destinatariosLocal(op, origen).forEach(r => {
      if (r.usuario === yo() || (h.autor && r.usuario === h.autor)) return;
      avisarLocal(r.usuario, { tipo: 'paso', titulo: t('h_' + h.tipo, PASO[h.tipo]), texto: textoPaso(h.tipo, h.datos), contexto: ctxOp(op, r.lado),
        url: 'mensajes.html?op=' + encodeURIComponent(op.id), operacion_id: op.id, aviso_id: op.aviso_id || null, lado: r.lado, datos: { hito: h.tipo } }, false);
    });
  }
  const hitoPorId = id => HITOS.get([]).find(h => h.id === id) || null;

  /* ── Cruce local (igual que portal._ntf_puntaje y calcular_coincidencias) ── */
  const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function puntajeLocal(b, a){
    const op = b.operacion === 'mediano' ? a.operacion === 'mediano' : b.operacion === 'alquiler' ? a.operacion === 'alquiler'
      : b.operacion === 'venta' && b.linea === 'pozo' ? a.operacion === 'venta' && ['pozo', 'construccion'].indexOf(a.etapa || '') > -1
      : b.operacion === 'venta' ? a.operacion === 'venta' && ['pozo', 'construccion'].indexOf(a.etapa || '') < 0 : false;
    if (!op) return null;
    const zonas = b.zonas || [];
    if (zonas.length && !zonas.some(z => { const n = norm(z); return n && (n === norm(a.zona) || n === norm(a.barrio) || norm(a.barrio).indexOf(n + ' ') === 0); })) return null;
    if (+b.ambientes_min && !((+a.ambientes || 0) >= +b.ambientes_min)) return null;
    const dorm = a.dormitorios != null ? +a.dormitorios : (+a.ambientes > 0 ? Math.max(1, +a.ambientes - 1) : 0);
    if (+b.dormitorios_min && !(dorm >= +b.dormitorios_min)) return null;
    if (+b.precio_max && !(a.precio != null && (a.moneda || 'USD') === (b.moneda || 'USD') && +a.precio <= +b.precio_max)) return null;
    return 60 + (!b.tipo || String(a.tipo || '').toLowerCase() === String(b.tipo).toLowerCase() ? 15 : 0) + (!+b.m2_min || (+a.m2_total || 0) >= +b.m2_min ? 10 : 0)
      + (!b.desde || !a.disponible_desde || a.disponible_desde <= b.desde ? 10 : 0) + (zonas.length ? 5 : 0);
  }
  const LINEA_TXT = l => ({ temporario: D.LINEAS.temporario, mediano: D.LINEAS.mediano, tradicional: D.LINEAS.tradicional, venta: t('compra', 'Compra'), pozo: t('compra_pozo', 'Compra en pozo') })[l] || '';
  /* Lo público de una búsqueda en una línea (igual que portal._ntf_busqueda) */
  D.resumenBusqueda = function(b){
    const z = b.zonas || [], lin = b.linea || D.lineaDe(b.operacion, null, b.plazo_meses);
    return [LINEA_TXT(lin), +b.ambientes_min ? tf('amb_min', '{n}+ ambientes', { n: b.ambientes_min }) : '',
      z.length ? z.slice(0, 3).join(', ') + (z.length > 3 ? ' ' + t('y_mas', 'y más') : '') : '',
      +b.precio_max ? tf('hasta', 'hasta {p}', { p: fmtMonto(b.precio_max, b.moneda) }) + (b.operacion !== 'venta' ? ' ' + t('por_mes', 'por mes') : '') : ''].filter(Boolean).join(' · ');
  };
  function calcularLocal(max){
    const ahora = L.now();
    const bus = BUS.get([]).filter(b => b.estado === 'activa' && (!b.vence_en || b.vence_en > ahora));
    const avs = AVISOS.get([]).filter(a => a.estado_curacion === 'publicado' && a.estado !== 'reservado');
    const coin = LC.get([]), props = PROPS.get([]), ops = OPS.get([]);
    bus.forEach(b => avs.forEach(a => {
      if (coin.some(c => c.busqueda_id === b.id && c.aviso_id === a.id)) return;
      const p = puntajeLocal(b, a); if (p == null) return;
      if (equipoLocal(a.publicador_id).indexOf(b.usuario) > -1) return;
      if (props.some(x => x.busqueda_id === b.id && x.aviso_id === a.id)) return;
      if (ops.some(o => o.aviso_id === a.id && o.interesado_user === b.usuario)) return;
      coin.push({ id: L.nid(), busqueda_id: b.id, aviso_id: a.id, puntaje: p, creado_en: ahora, avisado_en: null });
    }));
    const porBus = {};
    coin.filter(c => !c.avisado_en).sort((x, y) => y.puntaje - x.puntaje || x.id - y.id).forEach(c => {
      const b = bus.find(x => x.id === c.busqueda_id), a = avs.find(x => x.id === c.aviso_id);
      if (!b || !a || props.some(x => x.busqueda_id === b.id && x.aviso_id === a.id)) return;
      porBus[b.id] = (porBus[b.id] || 0) + 1; if (porBus[b.id] > (max || 3)) return;
      avisarLocal(b.usuario, { tipo: 'coincidencia', titulo: t('coincidencia', 'Hay una unidad para tu búsqueda'),
        texto: (fmtMonto(a.precio, a.moneda) || '') + (a.precio != null && a.operacion !== 'venta' ? ' ' + t('por_mes', 'por mes') : ''),
        contexto: unidadLocal(a.id, a, false), url: 'propiedad.html?id=' + encodeURIComponent(a.id), busqueda_id: b.id, aviso_id: a.id, lado: 'interesado' }, false);
      equipoLocal(a.publicador_id).forEach(u => avisarLocal(u, { tipo: 'coincidencia_pub', titulo: t('coincidencia_pub', 'Alguien busca algo como tu unidad'),
        texto: D.resumenBusqueda(b), contexto: unidadLocal(a.id, a, true), url: 'avisos.html?aviso=' + encodeURIComponent(a.id) + '#coincidencias', aviso_id: a.id, lado: 'publicador' },
        true, t('n_personas', '{n} personas buscan algo como tu unidad')));
      c.avisado_en = ahora;
    });
    LC.set(coin);
  }

  /* Las coincidencias del publicador de la sesión: una fila por unidad y búsqueda, sin quién busca */
  D.coincidencias = async function(){
    if (!yo()) return [];
    if (D.conBase()) return D.rpc('mis_coincidencias');
    calcularLocal();
    const pub = await L.miPub(); if (!pub) return [];
    const ahora = L.now(), bus = BUS.get([]), props = PROPS.get([]);
    return LC.get([]).map(c => {
      const a = avisoLocal(c.aviso_id), b = bus.find(x => x.id === c.busqueda_id);
      if (!a || !b || a.publicador_id !== pub.id || a.estado_curacion !== 'publicado' || b.estado !== 'activa' || (b.vence_en && b.vence_en <= ahora)) return null;
      const f = (a.fotos || []).slice().sort((x, y) => (x.orden || 0) - (y.orden || 0))[0];
      const pr = props.find(x => x.busqueda_id === b.id && x.aviso_id === a.id);
      return { aviso_id: a.id, aviso_codigo: a.codigo, aviso_titulo: a.titulo, aviso_direccion: a.direccion || null, aviso_barrio: a.barrio, aviso_precio: a.precio, aviso_moneda: a.moneda,
        aviso_operacion: a.operacion, aviso_etapa: a.etapa || null, foto: f ? (f.url || f) : null, busqueda_id: b.id, puntaje: c.puntaje, creado_en: c.creado_en,
        busqueda: { perfil: b.perfil, operacion: b.operacion, linea: b.linea, tipo: b.tipo, zonas: b.zonas, ambientes_min: b.ambientes_min, dormitorios_min: b.dormitorios_min, m2_min: b.m2_min,
          precio_max: b.precio_max, moneda: b.moneda, desde: b.desde, plazo_meses: b.plazo_meses, detalle: b.detalle, verificada: !!b.verificada, vence_en: b.vence_en },
        propuesta: pr ? pr.estado : null };
    }).filter(Boolean);
  };

  /* ── Envolturas de digital.js (en modo local crean los avisos; con base solo avisan a la campana) ── */
  const orig = {};
  const envolver = (nombre, despues) => {
    if (typeof D[nombre] !== 'function') return;
    orig[nombre] = D[nombre];
    D[nombre] = async function(){
      const args = arguments, r = await orig[nombre].apply(D, args);
      if (!D.conBase()) { try { despues(r, args); } catch (e) { console.warn('avisos locales', e); } }
      return r;
    };
  };
  envolver('enviar', (m, a) => mensajeLocal(a[0], a[1], m));
  envolver('paso', id => pasoLocal(hitoPorId(id)));
  envolver('proponer', id => {
    const p = PROPS.get([]).find(x => x.id === id); if (!p) return;
    const b = BUS.get([]).find(x => x.id === p.busqueda_id); if (!b || b.usuario === yo()) return;
    avisarLocal(b.usuario, { tipo: 'propuesta', titulo: t('propuesta', 'Recibiste una propuesta'), texto: tf('t_propone_unidad', '{p} te propone una unidad para tu búsqueda.', { p: p.publicador_nombre || t('un_publicador', 'Un publicador') }),
      contexto: unidadLocal(p.aviso_id, p.aviso, false), url: 'se-busca.html#b-' + encodeURIComponent(b.id), busqueda_id: b.id, aviso_id: p.aviso_id, lado: 'interesado' }, false);
  });
  envolver('responder', (opId, a) => {
    const accion = a[1]; if (accion !== 'aceptar' && accion !== 'rechazar') return;
    const p = PROPS.get([]).find(x => x.id === a[0]); if (!p) return;
    const ok = accion === 'aceptar';
    equipoLocal(p.publicador_id).forEach(u => { if (u === yo()) return; avisarLocal(u, { tipo: 'propuesta_respondida',
      titulo: ok ? t('prop_aceptada', 'Aceptaron tu propuesta') : t('prop_rechazada', 'Tu propuesta no fue aceptada'),
      texto: ok ? t('t_conversar', 'Ya pueden conversar en BAIREN.') : t('t_otra', 'Podés proponer otra unidad que encaje mejor.'),
      contexto: unidadLocal(p.aviso_id, p.aviso, true), url: ok && opId ? 'mensajes.html?op=' + encodeURIComponent(opId) : 'explorar.html#se-busca',
      operacion_id: ok ? opId : null, aviso_id: p.aviso_id, lado: 'publicador' }, false); });
  });
  envolver('guardarBusqueda', () => calcularLocal());
  /* Los pasos de los otros módulos en modo local (BPDigital._hitoLocal) también avisan */
  if (typeof D._hitoLocal === 'function') { const h0 = D._hitoLocal; D._hitoLocal = function(){ const id = h0.apply(D, arguments); try { pasoLocal(hitoPorId(id)); } catch (e) { console.warn('avisos locales', e); } return id; }; }
  /* Leer el chat deja leído su aviso (con base lo hace el trigger de portal.mensajes) */
  if (typeof D.leidos === 'function') {
    const l0 = D.leidos;
    D.leidos = async function(opId){
      const n = await l0.apply(D, arguments);
      if (!D.conBase() && yo()) { const all = LA.get([]); let k = 0; all.forEach(x => { if (x.usuario === yo() && x.tipo === 'mensaje' && x.operacion_id === opId && !x.leida_en) { x.leida_en = L.now(); k++; } }); if (k) LA.set(all); }
      cambio(); return n;
    };
  }

  /* ── Hora corta: "Ahora", "hace 5 min", "15:02", "Ayer", "lun", "6/10" ── */
  D.horaAviso = function(v){
    const d = new Date(v); if (isNaN(d)) return '';
    const ahora = new Date(), min = (ahora - d) / 6e4, dos = n => String(n).padStart(2, '0');
    const mismo = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (min < 1) return t('ahora', 'Ahora');
    if (min < 60) return tf('hace_min', 'hace {n} min', { n: Math.floor(min) });
    if (mismo(d, ahora)) return dos(d.getHours()) + ':' + dos(d.getMinutes());
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    if (mismo(d, ayer)) return t('ayer', 'Ayer');
    if (ahora - d < 6 * 864e5) { try { return d.toLocaleDateString(window.BP && BP.LOCALE ? BP.LOCALE() : 'es-AR', { weekday: 'short' }).replace(/\.$/, ''); } catch (e) { /* sigue */ } }
    return d.getDate() + '/' + (d.getMonth() + 1);
  };

  /* ── La campana del header ────────────────────────────── */
  const montadas = new Set(); let reloj = null, nPanel = 0;
  function cssUnaVez(listo){
    if (document.querySelector('link[data-dg-avisos-css]') || document.body.classList.contains('p-avisos')) { const l = document.querySelector('link[data-dg-avisos-css]'); if (!l || l.dataset.ok) listo(); else l.addEventListener('load', listo, { once: true }); return; }
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/avisos.css?v=20261009c'; l.dataset.dgAvisosCss = '1';
    l.addEventListener('load', () => { l.dataset.ok = '1'; listo(); }, { once: true }); l.addEventListener('error', listo, { once: true });
    document.head.appendChild(l);
  }
  async function actualizar(){
    const vivas = Array.from(montadas).filter(el => el.isConnected); montadas.clear(); vivas.forEach(el => montadas.add(el));
    if (!vivas.length) return;
    const n = await D.noLeidosAvisos();
    vivas.forEach(el => {
      const b = el.querySelector('button'), c = el.querySelector('.p-campana-n'); if (!b) return;
      if (c) { c.textContent = n > 9 ? '9+' : String(n); c.hidden = !n; }
      b.setAttribute('aria-label', n ? tf('campana_n', 'Avisos, {n} sin leer', { n }) : t('campana', 'Avisos'));
    });
  }
  function itemCampana(n){
    const nuevo = !n.leida_en, ctx = n.contexto || n.texto || '';
    return `<li><a class="p-campana-item${nuevo ? ' nuevo' : ''}" href="${esc(D.urlAviso(n.url))}" data-id="${esc(n.id)}">
      <span class="p-campana-punto" aria-hidden="true"></span>
      <span class="p-campana-l1"><b>${esc(n.titulo)}</b><time datetime="${esc(n.actualizada_en || '')}">${esc(D.horaAviso(n.actualizada_en))}</time></span>
      ${ctx ? `<span class="p-campana-ctx">${esc(ctx)}</span>` : ''}${nuevo ? `<span class="p-sr">${esc(t('sin_leer', 'sin leer'))}</span>` : ''}</a></li>`;
  }
  async function pintarPanel(panel){
    let lista = [], fallo = false;
    try { lista = await D.avisos({ limite: 6 }); } catch (e) { fallo = true; }
    const n = lista.filter(x => !x.leida_en).length;
    panel.innerHTML = `<div class="p-campana-cab"><p class="p-campana-t">${esc(t('titulo', 'Avisos'))}</p>${n ? `<button type="button" class="p-campana-todo" data-todo>${esc(t('marcar_leidos', 'Marcar leídos'))}</button>` : ''}</div>
      ${fallo ? `<p class="p-campana-vacio">${esc(t('err_cargar', 'No pudimos cargar tus avisos.'))}</p>`
        : lista.length ? `<ul class="p-campana-lista">${lista.map(itemCampana).join('')}</ul>`
        : `<p class="p-campana-vacio">${esc(t('vacio_corto', 'Acá vas a ver mensajes, visitas y propuestas.'))}</p>`}
      <a class="p-campana-todos" href="avisos.html">${esc(t('ver_todos', 'Ver todos'))}</a>`;
  }
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  D.campana = function(el){
    if (!el || el._dg) return; el._dg = true;
    const btn = el.querySelector('button'); if (!btn) return;
    cssUnaVez(() => { el.hidden = false; });
    const panel = document.createElement('div');
    panel.className = 'p-campana-dd'; panel.id = 'dgCampana' + (++nPanel); panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('titulo', 'Avisos'));
    btn.setAttribute('aria-controls', panel.id); btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    el.appendChild(panel); montadas.add(el);
    let soltar = null, empujado = false, porAtras = false;
    const cerrar = () => { if (soltar) { const f = soltar; soltar = null; f(); } };
    addEventListener('popstate', () => { if (!panel.hidden && empujado) { porAtras = true; empujado = false; cerrar(); porAtras = false; } });
    const ubicar = () => {
      if (!el.classList.contains('p-campana-m')) { panel.style.top = ''; return; }
      const r = btn.getBoundingClientRect(); panel.style.top = Math.round(r.bottom + 8) + 'px';
    };
    btn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      if (!panel.hidden) { cerrar(); return; }
      panel.innerHTML = `<div class="p-campana-cab"><p class="p-campana-t">${esc(t('titulo', 'Avisos'))}</p></div><div class="p-campana-sk" aria-busy="true" aria-label="${esc(t('cargando', 'Cargando…'))}">${'<span><i></i><i></i></span>'.repeat(3)}</div>`;
      panel.hidden = false; el.classList.add('abierta'); btn.setAttribute('aria-expanded', 'true'); ubicar();
      /* En el celular, Atrás cierra el desplegable (como la hoja del buscador de la portada) */
      if (el.classList.contains('p-campana-m')) { try { history.pushState({ dgCampana: panel.id }, ''); empujado = true; } catch (x) { empujado = false; } }
      soltar = BP.focoAtrapado(panel, { disparador: btn, cerrarAlClicFuera: true, devolverA: btn, enfocar: false,
        alCerrar: () => { panel.hidden = true; el.classList.remove('abierta'); btn.setAttribute('aria-expanded', 'false'); soltar = null;
          if (empujado && !porAtras) { empujado = false; try { history.back(); } catch (x) { /* nada */ } } empujado = false; } });
      await pintarPanel(panel);
      if (!panel.hidden && document.documentElement.classList.contains('teclado')) { const f = panel.querySelector('a,button'); if (f) f.focus(); }
    });
    panel.addEventListener('click', async e => {
      const todo = e.target.closest('[data-todo]');
      if (todo) { todo.disabled = true; try { await D.marcarLeido(null); } catch (x) { /* sigue */ } await pintarPanel(panel); const f = panel.querySelector('a'); if (f) f.focus(); return; }
      const a = e.target.closest('a[data-id]');
      if (a) {
        e.preventDefault(); const href = a.href; a.setAttribute('aria-busy', 'true');
        if (a.classList.contains('nuevo')) { try { await Promise.race([D.marcarLeido(+a.dataset.id), esperar(700)]); } catch (x) { /* igual sigue */ } }
        /* Con el desplegable abierto por Atrás, se reemplaza esa entrada: Atrás desde el destino vuelve a esta página */
        if (empujado) location.replace(href); else location.href = href;
      }
    });
    addEventListener('resize', () => { if (!panel.hidden) ubicar(); });
    actualizar();
    if (!reloj) {
      reloj = setInterval(() => { if (document.visibilityState === 'visible') actualizar(); }, 60000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') actualizar(); });
      document.addEventListener('bp:avisos', actualizar);
    }
  };
  D.actualizarCampana = actualizar;
})();
