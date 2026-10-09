/* BAIREN · Portal · Riel de garantías y seguros (migración 33, 9/10/2026).
   Quien busca un alquiler de mediano o largo plazo elige su garantía sin salir de la conversación: una empresa de
   fianza, un seguro (caución, hogar, daños) o su garantía propietaria. Nunca se impone un proveedor.
   · En Mensajes (se enchufa con BPDigital): la acción "Elegir garantía" (hoja con hasta 3 tarjetas comparables y
     "Usar mi garantía propietaria" al final), la sección "Garantía" con el estado, y para quien publica "Garantía
     aprobada" y "Garantía rechazada". Como app: hojas que suben desde abajo con esqueleto mientras cargan, el Atrás
     del celular cierra la hoja o vuelve al paso anterior, y antes de ir a la web del proveedor se avisa "Te llevamos
     a …" con un enlace (nunca una pestaña forzada); al volver, el estado nuevo a la vista.
   · En garantias.html (plataforma): window.BPGarantias trae los proveedores, el alta y la edición, y las solicitudes.
   Con base, todo va por las funciones de la migración 33; sin base, por localStorage con las mismas reglas.
   Al aprobarse una garantía queda el paso garantia_emitida (fianza o propia) o seguro_emitido (seguros) con
   { monto, moneda }: lo cobran las reglas "Garantía de alquiler" y "Seguro" al tercero, en simulación. */
(function(){
  'use strict';
  const D = window.BPDigital; if (!D) return;
  const S = () => window.BPStore;
  const t = (k, d) => (window.BP && BP.t) ? BP.t('dg_garantias_' + k, d) : d;
  const tf = (k, d, v) => (window.BP && BP.tf) ? BP.tf('dg_garantias_' + k, d, v) : String(d).replace(/\{(\w+)\}/g, (m, x) => v && v[x] != null ? v[x] : m);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = {};

  /* ── vocabulario ───────────────────────────────────────── */
  const voc = (pref, base) => { const o = {}; Object.keys(base).forEach(k => Object.defineProperty(o, k, { get: () => t(pref + k, base[k]), enumerable: true })); return o; };
  G.TIPOS = voc('tipo_', { fianza: 'Garantía de fianza', caucion: 'Seguro de caución', hogar: 'Seguro de hogar', danos: 'Seguro de daños', propia: 'Garantía propietaria' });
  G.ESTADOS = voc('estado_', { elegida: 'Elegida', en_tramite: 'En trámite', aprobada: 'Aprobada', rechazada: 'Rechazada', cancelada: 'Cancelada' });
  G.LINEAS = ['mediano', 'tradicional'];
  const EN_CURSO = ['elegida', 'en_tramite'];
  const FINALES = ['aprobada', 'rechazada', 'cancelada'];

  /* ── formato ───────────────────────────────────────────── */
  const LOC = () => (window.BP && BP.LOCALE) ? BP.LOCALE() : 'es-AR';
  G.dinero = (n, m) => n == null || n === '' ? '' : (window.BP && BP.fmtPrecio) ? BP.fmtPrecio(+n, m) : (m === 'ARS' ? '$ ' : 'USD ') + Math.round(+n).toLocaleString(LOC());
  G.pct = n => n == null || n === '' ? '' : Number(n).toLocaleString(LOC(), { maximumFractionDigits: 2 }) + ' %';
  G.fecha = v => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d.getDate() + '/' + (d.getMonth() + 1) + (d.getFullYear() !== new Date().getFullYear() ? '/' + d.getFullYear() : '') : ''; };
  const dominioDe = u => { const m = /^https:\/\/([^/?#:]+)/i.exec(u || ''); return m ? m[1].toLowerCase() : null; };

  /* ── reglas (las mismas que la migración 33) ───────────── */
  const RE_URL = /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]+)?([/?#]\S*)?$/;
  const RE_PARAM = /^[A-Za-z0-9_.~-]+=[A-Za-z0-9_.~{}-]*(&[A-Za-z0-9_.~-]+=[A-Za-z0-9_.~{}-]*)*$/;
  /* Total del contrato: el monto del contrato o, si no se conoce, alquiler × plazo */
  G.base = op => { if (!op) return null; const mc = +op.monto_contrato; if (mc > 0) return mc; const p = +op.precio_publicado, m = +op.plazo_meses; return p > 0 && m > 0 ? p * m : null; };
  G.estimar = (op, pct) => { const b = G.base(op); return b != null && pct != null && pct !== '' ? Math.round(b * +pct) / 100 : null; };
  /* La web del proveedor con el referido; {op} se reemplaza por un código de la solicitud */
  G.urlReferido = (url, param, solId) => {
    if (!url) return null;
    const i = url.indexOf('#'), sin = i > -1 ? url.slice(0, i) : url, frag = i > -1 ? url.slice(i) : '';
    const p = String(param || '').replace(/\{op\}/g, String(solId || '').replace(/-/g, '').slice(0, 10));
    return sin + (p ? (sin.indexOf('?') > -1 ? '&' : '?') + p : '') + frag;
  };
  /* Por qué no se puede elegir garantía (null: se puede). op: la operación; hitos y sols: los de esa operación. */
  G.impedimento = (op, hitos, sols) => {
    if (!op || G.LINEAS.indexOf(op.linea) < 0) return t('err_linea', 'La garantía se elige en alquileres de mediano o largo plazo.');
    if (op.etapa === 'caida' || op.etapa === 'cerrada') return t('err_cerrada', 'La operación está cerrada.');
    if (D.ordenEtapa(op.etapa) < 4) return t('err_avanzar', 'Primero avisá que querés avanzar.');
    const ult = (hitos || []).filter(h => /^solicitud_(enviada|aceptada|rechazada)$/.test(h.tipo))
      .sort((a, b) => (+new Date(a.creado_en) - +new Date(b.creado_en)) || (a.id > b.id ? 1 : a.id < b.id ? -1 : 0)).pop();
    if (ult && ult.tipo === 'solicitud_rechazada') return t('err_rechazada', 'La solicitud fue rechazada.');
    if ((sols || []).some(s => s.estado === 'aprobada')) return t('err_aprobada', 'Ya tenés una garantía aprobada.');
    return null;
  };
  /* Un proveedor completo (lo que queda guardado) → el error, o null si está bien */
  G.validarProveedor = v => {
    if (!v.nombre || v.nombre.length < 2 || v.nombre.length > 80) return t('v_nombre', 'Poné el nombre del proveedor (hasta 80 letras).');
    if (['fianza', 'caucion', 'hogar', 'danos'].indexOf(v.tipo) < 0) return t('v_tipo', 'Elegí qué es: fianza, caución, hogar o daños.');
    if (v.url && (v.url.length > 500 || !RE_URL.test(v.url))) return t('v_url', 'La web tiene que empezar con https://');
    if (v.param_referido && (v.param_referido.length > 120 || !RE_PARAM.test(v.param_referido))) return t('v_param', 'El parámetro de referido va como clave=valor. Por ejemplo: ref=bairen');
    if (v.costo_pct != null && !(v.costo_pct >= 0 && v.costo_pct <= 100)) return t('v_costo', 'Revisá el costo estimado: un porcentaje de 0 a 100.');
    if (v.comision_pct != null && !(v.comision_pct >= 0 && v.comision_pct <= 100)) return t('v_comision', 'Revisá el % del convenio: de 0 a 100.');
    if ((v.descripcion || '').length > 240) return t('v_desc', 'La descripción va corta: hasta 240 letras.');
    if ((v.requisitos || '').length > 600) return t('v_req', 'Los requisitos van hasta 600 letras.');
    if ((v.cuotas || '').length > 80) return t('v_cuotas', 'Las cuotas van hasta 80 letras.');
    if ((v.productor_nombre || '').length > 120 || (v.productor_matricula_ssn || '').length > 40) return t('v_productor', 'Revisá los datos del productor.');
    if (!(v.orden >= 0 && v.orden <= 9999)) return t('v_orden', 'Revisá el orden: un número de 0 a 9999.');
    if (v.activo && v.ejemplo) return t('v_ejemplo', 'Es un ejemplo: no se puede activar. Cargá el proveedor real con su convenio.');
    if (v.activo && !v.url) return t('v_activo_url', 'Para activarlo, cargá su web.');
    if (v.activo && v.requiere_productor && (!v.productor_nombre || !v.productor_matricula_ssn)) return t('v_activo_productor', 'Un seguro se activa con el productor asesor y su matrícula SSN (Ley 22.400).');
    return null;
  };
  const txt = x => { const s = x == null ? '' : String(x).trim(); return s === '' ? null : s; };
  const numero = x => { if (x == null || x === '') return null; const n = typeof x === 'number' ? x : Number(String(x).trim().replace(',', '.')); return isFinite(n) ? n : NaN; };
  /* Une lo guardado con lo que llega (solo las claves presentes), como guardar_proveedor_garantia */
  G.mezclarProveedor = (actual, datos) => {
    const v = Object.assign({ activo: false, orden: 100, requiere_productor: false, ejemplo: false }, actual || {});
    const d = datos || {};
    ['nombre', 'tipo', 'descripcion', 'url', 'param_referido', 'cuotas', 'requisitos', 'productor_nombre', 'productor_matricula_ssn'].forEach(k => { if (k in d) v[k] = txt(d[k]); });
    ['costo_pct', 'comision_pct'].forEach(k => { if (k in d) v[k] = numero(d[k]); });
    if ('orden' in d) { const n = numero(d.orden); v.orden = n == null ? 100 : n; }
    if ('requiere_productor' in d) v.requiere_productor = !!d.requiere_productor;
    if ('activo' in d) v.activo = !!d.activo;
    if (v.tipo && v.tipo !== 'fianza') v.requiere_productor = true;   /* un seguro siempre va por un productor */
    return v;
  };

  /* ── base o local ──────────────────────────────────────── */
  const conBase = () => D.conBase();
  const humano = e => { const m = String((e && e.message) || e || ''); return new Error(/permission denied|JWT|not authenticated/i.test(m) ? t('err_sesion', 'Ingresá para seguir.') : m); };
  const sesion = () => { if (!S() || !S().session) throw new Error(t('err_sesion', 'Ingresá para seguir.')); return S().session; };
  const rpc = async (fn, args) => { try { return await D.rpc(fn, args); } catch (e) { throw humano(e); } };
  const COLS = 'id,operacion_id,proveedor_id,proveedor_nombre,tipo,estado,costo_estimado,costo_total,moneda,referencia,detalle,creado_en,actualizado_en,aprobada_en';
  const LK = { prov: 'bp_dg_gar_prov', sol: 'bp_dg_gar_sol', hitos: 'bp_dg_hitos' };
  const ls = k => D._local.LS(k);
  const ahora = () => new Date().toISOString();
  const EJEMPLOS = [
    { nombre: 'Ejemplo · garantía de fianza', tipo: 'fianza', descripcion: 'Ejemplo para ver cómo se muestra. No es una empresa real y no hay convenio.', param_referido: 'ref=bairen', costo_pct: 5.5, cuotas: 'Hasta 6 cuotas', requisitos: 'Ejemplo: DNI y recibos de sueldo o constancia de ingresos.', requiere_productor: false, orden: 900 },
    { nombre: 'Ejemplo · seguro de caución', tipo: 'caucion', descripcion: 'Ejemplo para ver cómo se muestra. No es una aseguradora real y no hay convenio.', param_referido: 'ref=bairen', costo_pct: 4.5, cuotas: 'Hasta 3 cuotas', requisitos: 'Ejemplo: DNI e ingresos demostrables.', requiere_productor: true, orden: 910 }
  ];
  function provsLocal(){
    let v = ls(LK.prov).get(null);
    if (!Array.isArray(v)) { v = EJEMPLOS.map(x => Object.assign({ id: D._local.uid(), url: null, comision_pct: null, productor_nombre: null, productor_matricula_ssn: null, activo: false, ejemplo: true, creado_en: ahora(), actualizado_en: ahora() }, x)); ls(LK.prov).set(v); }
    return v;
  }
  const solsLocal = () => ls(LK.sol).get([]);
  const opLocal = id => D._local.ops().find(o => o.id === id) || null;
  const porOrden = (a, b) => ((+a.orden || 0) - (+b.orden || 0)) || String(a.nombre).localeCompare(String(b.nombre));
  const porFecha = (a, b) => String(a.creado_en).localeCompare(String(b.creado_en));
  const publico = p => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, descripcion: p.descripcion || null, dominio: dominioDe(p.url), costo_pct: p.costo_pct, cuotas: p.cuotas || null, requisitos: p.requisitos || null, requiere_productor: !!p.requiere_productor, productor_nombre: p.productor_nombre || null, productor_matricula_ssn: p.productor_matricula_ssn || null, orden: p.orden });
  async function ladoQueElige(op){
    const lados = await D._local.ladosLocal(op);
    if (lados.indexOf('interesado') < 0) throw new Error(t('err_solo_busca', 'Solo quien busca elige la garantía.'));
    const imp = G.impedimento(op, ls(LK.hitos).get([]).filter(h => h.operacion_id === op.id), solsLocal().filter(s => s.operacion_id === op.id));
    if (imp) throw new Error(imp);
  }
  /* Quien busca no aprueba su propia garantía, aunque además sea del equipo */
  const ladoQueActualiza = lados => lados.indexOf('publicador') > -1 ? 'publicador' : (lados.indexOf('plataforma') > -1 && lados.indexOf('interesado') < 0) ? 'plataforma' : null;
  G.puedeActualizar = d => !!(d && ladoQueActualiza(d.lados || [d.lado]));

  /* ── datos ─────────────────────────────────────────────── */
  /* Proveedores activos para quien busca (sin los % del convenio) */
  G.disponibles = async function(){
    sesion();
    if (conBase()) return (await rpc('garantias_disponibles')) || [];
    return provsLocal().filter(p => p.activo && !p.ejemplo).sort(porOrden).map(publico);
  };
  /* Las solicitudes de una operación, de la más vieja a la más nueva */
  G.solicitudes = async function(opId){
    sesion();
    if (conBase()) { const { data, error } = await D.db().from('solicitudes_garantia').select(COLS).eq('operacion_id', opId).order('creado_en', { ascending: true }); if (error) throw humano(error); return data || []; }
    return solsLocal().filter(s => s.operacion_id === opId).sort(porFecha);
  };
  /* Quien busca elige un proveedor → { id, url, proveedor, tipo, costo_estimado, moneda }. Otra vez el mismo: no duplica. */
  G.elegir = async function(opId, provId){
    const ses = sesion();
    if (conBase()) return rpc('elegir_garantia', { p_op: opId, p_proveedor: provId });
    const op = opLocal(opId); if (!op) throw new Error(t('err_no_op', 'La operación no existe.'));
    await ladoQueElige(op);
    const p = provsLocal().find(x => x.id === provId && x.activo && !x.ejemplo); if (!p) throw new Error(t('err_no_prov', 'Ese proveedor no está disponible.'));
    const sols = solsLocal(); let s = sols.find(x => x.operacion_id === opId && EN_CURSO.indexOf(x.estado) > -1);
    if (!s || s.proveedor_id !== p.id) {
      if (sols.filter(x => x.operacion_id === opId).length >= 12) throw new Error(t('err_muchas', 'Cambiaste muchas veces de garantía. Escribile a quien publica por acá.'));
      sols.forEach(x => { if (x.operacion_id === opId && EN_CURSO.indexOf(x.estado) > -1) { x.estado = 'cancelada'; x.actualizado_en = ahora(); } });
      s = { id: D._local.uid(), operacion_id: opId, proveedor_id: p.id, proveedor_nombre: p.nombre, tipo: p.tipo, estado: 'elegida', costo_estimado: G.estimar(op, p.costo_pct), costo_total: null, moneda: op.moneda === 'ARS' ? 'ARS' : 'USD', referencia: null, detalle: null, creado_por: ses.id, creado_en: ahora(), actualizado_en: ahora(), aprobada_en: null };
      sols.push(s); ls(LK.sol).set(sols);
      D._hitoLocal(opId, 'garantia_elegida', 'interesado', { solicitud_id: s.id, proveedor: p.nombre, tipo: p.tipo });
    }
    return { id: s.id, url: G.urlReferido(p.url, p.param_referido, s.id), proveedor: p.nombre, tipo: p.tipo, costo_estimado: s.costo_estimado, moneda: s.moneda };
  };
  /* Quien busca usa su garantía propietaria (o la que prefiera) → id de la solicitud */
  G.propia = async function(opId, detalle){
    const ses = sesion();
    if (conBase()) return rpc('usar_garantia_propia', { p_op: opId, p_detalle: detalle || null });
    const op = opLocal(opId); if (!op) throw new Error(t('err_no_op', 'La operación no existe.'));
    await ladoQueElige(op);
    const det = txt(detalle) ? txt(detalle).slice(0, 300) : null;
    const sols = solsLocal(); const s = sols.find(x => x.operacion_id === opId && EN_CURSO.indexOf(x.estado) > -1);
    if (s && s.tipo === 'propia') { if (det) s.detalle = det; s.actualizado_en = ahora(); ls(LK.sol).set(sols); return s.id; }
    if (sols.filter(x => x.operacion_id === opId).length >= 12) throw new Error(t('err_muchas', 'Cambiaste muchas veces de garantía. Escribile a quien publica por acá.'));
    sols.forEach(x => { if (x.operacion_id === opId && EN_CURSO.indexOf(x.estado) > -1) { x.estado = 'cancelada'; x.actualizado_en = ahora(); } });
    const n = { id: D._local.uid(), operacion_id: opId, proveedor_id: null, proveedor_nombre: null, tipo: 'propia', estado: 'elegida', costo_estimado: null, costo_total: null, moneda: op.moneda === 'ARS' ? 'ARS' : 'USD', referencia: null, detalle: det, creado_por: ses.id, creado_en: ahora(), actualizado_en: ahora(), aprobada_en: null };
    sols.push(n); ls(LK.sol).set(sols);
    D._hitoLocal(opId, 'garantia_elegida', 'interesado', { solicitud_id: n.id, tipo: 'propia' });
    return n.id;
  };
  /* Quien publica o la plataforma: en_tramite | aprobada (con costo y moneda; la propia, sin costo) | rechazada | cancelada */
  G.actualizar = async function(id, estado, costo, moneda, referencia){
    sesion();
    const c = costo == null || costo === '' ? null : +costo;
    if (conBase()) return rpc('actualizar_garantia', { p_id: id, p_estado: estado, p_costo: c, p_moneda: moneda || null, p_referencia: referencia || null });
    const sols = solsLocal(); const s = sols.find(x => x.id === id); if (!s) throw new Error(t('err_no_sol', 'La garantía no existe.'));
    const op = opLocal(s.operacion_id); if (!op) throw new Error(t('err_no_op', 'La operación no existe.'));
    const lado = ladoQueActualiza(await D._local.ladosLocal(op));
    if (!lado) throw new Error(t('err_solo_publica', 'Solo quien publica o el equipo de BAIREN actualiza la garantía.'));
    if (['en_tramite', 'aprobada', 'rechazada', 'cancelada'].indexOf(estado) < 0) throw new Error(t('err_estado', 'Estado desconocido.'));
    if (FINALES.indexOf(s.estado) > -1) throw new Error(t('err_cerrada_g', 'Esta garantía ya está cerrada.'));
    if (estado === 'en_tramite' && s.estado === 'en_tramite') throw new Error(t('err_ya_tramite', 'Ya está en trámite.'));
    if (c != null && !(c >= 0)) throw new Error(t('err_costo', 'Revisá el costo.'));
    if (moneda && moneda !== 'USD' && moneda !== 'ARS') throw new Error(t('err_moneda', 'Moneda desconocida.'));
    if (estado === 'aprobada') {
      if (op.etapa === 'caida') throw new Error(t('err_caida', 'La operación quedó sin acuerdo.'));
      if (s.tipo !== 'propia' && !(c > 0)) throw new Error(t('err_falta_costo', 'Falta el costo total de la garantía.'));
    }
    s.estado = estado; s.moneda = moneda || s.moneda;
    s.costo_total = s.tipo === 'propia' ? null : (c != null ? c : s.costo_total);
    if (txt(referencia)) s.referencia = txt(referencia).slice(0, 80);
    if (estado === 'aprobada') s.aprobada_en = ahora();
    s.actualizado_en = ahora(); ls(LK.sol).set(sols);
    if (estado === 'aprobada') D._hitoLocal(s.operacion_id, s.tipo === 'fianza' || s.tipo === 'propia' ? 'garantia_emitida' : 'seguro_emitido', lado,
      s.tipo === 'propia' ? { solicitud_id: s.id, tipo: 'propia' } : { monto: s.costo_total, moneda: s.moneda, solicitud_id: s.id, proveedor: s.proveedor_nombre, tipo: s.tipo });
    else { const ops = D._local.ops(); const o = ops.find(x => x.id === op.id); if (o) { o.actualizada_en = ahora(); D._local.guardarOps(ops); } }
    return Object.assign({}, s);
  };
  /* Plataforma: todos los proveedores (con el convenio) */
  G.proveedores = async function(){
    sesion();
    if (conBase()) { const { data, error } = await D.db().from('proveedores_garantia').select('*').order('orden', { ascending: true }).order('nombre', { ascending: true }); if (error) throw humano(error); return data || []; }
    if (!(await S().isCurador())) return [];
    return provsLocal().slice().sort(porOrden);
  };
  /* Plataforma: alta (id null) o edición (solo las claves que vienen) */
  G.guardarProveedor = async function(id, datos){
    sesion();
    if (conBase()) {
      const d2 = Object.assign({}, datos);
      ['costo_pct', 'comision_pct', 'orden'].forEach(k => { if (typeof d2[k] === 'string') d2[k] = d2[k].trim().replace(',', '.'); });
      return rpc('guardar_proveedor_garantia', { p_id: id || null, p_datos: d2 });
    }
    if (!(await S().isCurador())) throw new Error(t('err_solo_equipo', 'Solo el equipo de BAIREN carga proveedores.'));
    const all = provsLocal(); const actual = id ? all.find(p => p.id === id) : null;
    if (id && !actual) throw new Error(t('err_no_prov_e', 'El proveedor no existe.'));
    const MAL = { costo_pct: () => t('v_costo', 'Revisá el costo estimado: un porcentaje de 0 a 100.'), comision_pct: () => t('v_comision', 'Revisá el % del convenio: de 0 a 100.'), orden: () => t('v_orden', 'Revisá el orden: un número de 0 a 9999.') };
    Object.keys(MAL).forEach(k => { if (datos && k in datos && Number.isNaN(numero(datos[k]))) throw new Error(MAL[k]()); });
    const v = G.mezclarProveedor(actual, datos);
    const err = G.validarProveedor(v); if (err) throw new Error(err);
    v.actualizado_en = ahora(); v.actualizado_por = (S().session && S().session.email) || 'local';
    if (actual) Object.assign(actual, v); else { v.id = D._local.uid(); v.ejemplo = false; v.creado_en = ahora(); all.push(v); }
    ls(LK.prov).set(all);
    return Object.assign({}, actual || v);
  };
  /* Plataforma: todas las solicitudes con la operación y el % del convenio */
  G.lista = async function(){
    sesion();
    if (conBase()) return (await rpc('solicitudes_garantia_lista', { p_limite: 200 })) || [];
    if (!(await S().isCurador())) return [];
    const provs = provsLocal(), ops = D._local.ops();
    return solsLocal().slice().sort((a, b) => porFecha(b, a)).slice(0, 200).map(s => {
      const o = ops.find(x => x.id === s.operacion_id) || {}, p = provs.find(x => x.id === s.proveedor_id) || {};
      return Object.assign({}, s, { aviso_titulo: o.aviso && o.aviso.titulo, linea: o.linea, etapa: o.etapa, publicador_nombre: o.publicador_nombre || null, proveedor_nombre: s.proveedor_nombre || p.nombre || null, comision_pct: p.comision_pct == null ? null : p.comision_pct });
    });
  };
  window.BPGarantias = G;

  /* ════════════════ En Mensajes ════════════════ */
  if (!D.registrarAccion) return;
  (function estilos(){
    try {
      document.body.classList.add('dg-garantias');
      if (!document.querySelector('link[data-dg-garantias]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/garantias.css?v=20261009h'; l.setAttribute('data-dg-garantias', ''); document.head.appendChild(l); }
    } catch (e) {}
  })();

  const ext = d => (d && d.ext && d.ext.garantias) || null;
  const sols = d => (ext(d) && ext(d).solicitudes) || [];
  const enCurso = d => sols(d).filter(s => EN_CURSO.indexOf(s.estado) > -1).pop() || null;
  const aprobada = d => sols(d).filter(s => s.estado === 'aprobada').pop() || null;
  const aplica = d => !!(ext(d) && d.operacion && G.LINEAS.indexOf(d.operacion.linea) > -1);
  const puedeElegir = d => !!(d && d.lado === 'interesado' && ext(d) && !G.impedimento(d.operacion, d.hitos, sols(d)));
  const nombreDe = s => s.tipo === 'propia' ? G.TIPOS.propia : (s.proveedor_nombre || G.TIPOS[s.tipo] || '');
  const ICO_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICO_IR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';
  const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Solo en alquileres. Antes de "Quiero avanzar" no puede haber solicitudes: no se consulta la base. */
  D.enriquecerDetalle(async d => {
    const op = d && d.operacion; if (!op || G.LINEAS.indexOf(op.linea) < 0) return;
    if (D.ordenEtapa(op.etapa) < 4 && op.etapa !== 'caida') { d.ext.garantias = { solicitudes: [] }; return; }
    try { d.ext.garantias = { solicitudes: await G.solicitudes(op.id) }; }
    catch (e) { d.ext.garantias = null; }   /* sin la migración 33 el módulo no aparece */
  });

  const recargar = ui => { try { Promise.resolve(ui.recargar()).catch(() => {}); } catch (e) {} };

  /* Un paso con el diálogo de Mensajes: con "enviar", el error queda en el diálogo; si no, se hace al volver */
  async function conDialogo(ui, o, hacer, listo){
    let hecho = false;
    const v = await ui.dialogo(Object.assign({}, o, { enviar: async x => { await hacer(x || {}); hecho = true; } }));
    if (!v) return false;
    if (!hecho) { try { await hacer(v); } catch (e) { ui.toast((e && e.message) || String(e)); return false; } }
    ui.toast(listo); try { await ui.recargar(); } catch (e) {} return true;
  }

  /* ── La hoja: sube desde abajo en el celular (el diálogo de Mensajes), con foco atrapado y el Atrás del celular ──
     Cada hoja suma una entrada al historial: Atrás la cierra. h.adelante(volver) suma un paso: Atrás vuelve a él. */
  function hoja(o){
    const abridor = document.activeElement;
    const velo = document.createElement('div'); velo.className = 'ms-dlg-velo gr-velo';
    velo.innerHTML = `<div class="ms-dlg gr-hoja" role="dialog" aria-modal="true" aria-labelledby="grT" aria-describedby="grP">
      <div class="gr-hoja-cab"><h2 class="ms-dlg-t" id="grT"></h2><button type="button" class="ms-ico-btn gr-x" data-x aria-label="${esc(t('cerrar', 'Cerrar'))}">${ICO_X}</button></div>
      <p class="ms-dlg-p" id="grP"></p>
      <div class="gr-cuerpo" aria-live="polite">${o.cuerpo || ''}</div></div>`;
    document.body.appendChild(velo);
    const dlg = velo.firstElementChild, tit = dlg.querySelector('#grT'), sub = dlg.querySelector('#grP');
    const titulo = (a, b) => { tit.textContent = a || ''; sub.textContent = b || ''; sub.hidden = !b; };
    titulo(o.titulo, o.texto);
    const pasos = []; let fin = false, porAtras = false;
    const onPop = () => { if (fin) return; const f = pasos.pop(); if (f) f(); else { porAtras = true; suelta(); } };
    try { history.pushState(Object.assign({}, history.state, { grHoja: 1 }), ''); window.addEventListener('popstate', onPop); } catch (e) {}
    const quitar = () => {
      if (fin) return; fin = true; window.removeEventListener('popstate', onPop);
      if (!porAtras) { try { history.go(-(pasos.length + 1)); } catch (e) {} }
      velo.classList.add('sale'); setTimeout(() => velo.remove(), quieto() ? 0 : 160);
      setTimeout(() => { const ae = document.activeElement; if (!ae || ae === document.body || !document.contains(ae)) { const x = document.querySelector('[data-acc^="ext:garantia"]') || document.getElementById('msLog'); if (x) x.focus({ preventScroll: true }); } }, 0);
    };
    const suelta = BP.focoAtrapado(dlg, { devolverA: abridor, primero: dlg.querySelector('[data-x]'), alCerrar: quitar });
    const cerrar = () => { if (!fin) suelta(); };
    velo.addEventListener('mousedown', e => { if (e.target === velo) cerrar(); });
    dlg.querySelector('[data-x]').addEventListener('click', cerrar);
    return { dlg, cerrar, titulo, cuerpo: dlg.querySelector('.gr-cuerpo'), cerrada: () => fin,
      adelante: volver => { pasos.push(volver); try { history.pushState(Object.assign({}, history.state, { grHoja: pasos.length + 1 }), ''); } catch (e) {} },
      atras: () => { try { history.back(); } catch (e) {} } };
  }
  const esqueleto = n => `<ul class="gr-ops gr-esq" aria-hidden="true">${Array.from({ length: n }, () => '<li class="gr-op"><i></i><i class="c"></i><i class="g"></i><i class="b"></i></li>').join('')}</ul>`;

  /* ── Elegí tu garantía: hasta 3 tarjetas comparables y la propia al final ── */
  /* En mediano plazo amoblado casi nunca hay garantía: el seguro de daños va primero */
  const ordenar = (lista, linea) => lista.slice().sort((a, b) => (linea === 'mediano' ? (b.tipo === 'danos') - (a.tipo === 'danos') : 0) || porOrden(a, b));
  function tarjeta(p, d, i){
    const op = d.operacion, est = G.estimar(op, p.costo_pct), idn = 'grN' + i;
    const monto = est != null
      ? `<p class="gr-op-m"><span class="gr-op-mv">${esc(G.dinero(est, op.moneda))}</span><span class="gr-op-mt">${esc(tf('estimado_de', 'estimado · {p} del contrato', { p: G.pct(p.costo_pct) }))}</span></p>`
      : p.costo_pct != null ? `<p class="gr-op-m"><span class="gr-op-mv">${esc(G.pct(p.costo_pct))}</span><span class="gr-op-mt">${esc(t('del_total', 'del total del contrato'))}</span></p>` : '';
    const mas = [p.descripcion ? `<p>${esc(p.descripcion)}</p>` : '', p.requisitos ? `<p><b>${esc(t('requisitos', 'Requisitos'))}:</b> ${esc(p.requisitos)}</p>` : '',
      p.requiere_productor && p.productor_nombre ? `<p>${esc(tf('productor', 'Productor asesor: {n} · Matrícula SSN {m}', { n: p.productor_nombre, m: p.productor_matricula_ssn || '' }))}</p>` : '',
      p.dominio ? `<p>${esc(tf('se_abre', 'Se contrata en {d}', { d: p.dominio }))}</p>` : ''].join('');
    return `<li class="gr-op">
      <div class="gr-op-cab"><h3 class="gr-op-n" id="${idn}">${esc(p.nombre)}</h3><span class="gr-op-tipo">${esc(G.TIPOS[p.tipo] || p.tipo)}</span></div>
      ${op.linea === 'mediano' && p.tipo === 'danos' ? `<span class="gr-op-tag">${esc(t('habitual_mediano', 'Lo habitual en mediano plazo'))}</span>` : ''}
      ${monto}
      ${p.cuotas ? `<p class="gr-op-c">${esc(p.cuotas)}</p>` : ''}
      <button type="button" class="ms-btn ms-btn-navy gr-op-btn" data-elegir="${esc(p.id)}" aria-label="${esc(tf('elegir_n', 'Elegir {n}', { n: p.nombre }))}">${esc(t('elegir', 'Elegir'))}</button>
      ${mas ? `<details class="gr-op-req"><summary>${esc(t('ver_requisitos', 'Requisitos'))}</summary><div class="gr-op-req-in">${mas}</div></details>` : ''}
    </li>`;
  }
  const listaHTML = (provs, d) => {
    const vis = provs.slice(0, 3), resto = provs.slice(3);
    return `${provs.length ? `<ul class="gr-ops">${vis.map((p, i) => tarjeta(p, d, i)).join('')}</ul>` : `<p class="gr-vacio">${esc(t('sin_proveedores', 'Por ahora no hay proveedores para elegir acá.'))}</p>`}
      ${resto.length ? `<details class="gr-resto"><summary>${esc(tf('ver_los', 'Ver los {n}', { n: provs.length }))}</summary><ul class="gr-ops">${resto.map((p, i) => tarjeta(p, d, i + 3)).join('')}</ul></details>` : ''}
      <button type="button" class="gr-propia" data-propia><span class="gr-propia-t">${esc(t('propia', 'Usar mi garantía propietaria'))}<small>${esc(t('propia_s', 'O la que prefieras.'))}</small></span>${ICO_IR}</button>
      <p class="ms-dlg-err" role="alert" hidden></p>
      ${provs.length ? `<p class="gr-conf">${esc(t('confianza', 'Pagás directo al proveedor. Puede pagarle una tarifa a BAIREN.'))}</p>` : ''}`;
  };
  /* "Te llevamos a …": el aviso antes de salir a la web del proveedor, con un enlace de verdad (no una pestaña forzada) */
  function mostrarIr(h, r, ui, conVolver){
    const url = r && /^https:\/\//i.test(r.url || '') ? r.url : null;
    h.titulo(tf('ir_t', 'Te llevamos a {p}', { p: r.proveedor }), t('ir_p', 'Hacés el trámite en su web y volvés acá.'));
    h.cuerpo.innerHTML = `${url ? `<a class="ms-btn ms-btn-navy gr-op-btn gr-ir" href="${esc(url)}" target="_blank" rel="noopener" data-ir>${esc(t('continuar', 'Continuar'))}</a>` : `<p class="ms-dlg-err" role="alert">${esc(t('sin_web', 'Este proveedor todavía no tiene web cargada.'))}</p>`}
      <p class="gr-conf">${esc(tf('ir_conf', 'Ya quedó anotada acá. Pagás directo a {p}.', { p: r.proveedor }))}</p>
      ${conVolver ? `<button type="button" class="gr-link" data-otra>${esc(t('elegir_otra', 'Elegir otra'))}</button>` : ''}`;
    const a = h.cuerpo.querySelector('[data-ir]');
    if (a) { a.focus(); a.addEventListener('click', () => { esperarVuelta(ui, r); setTimeout(h.cerrar, 0); }); }
    const o = h.cuerpo.querySelector('[data-otra]'); if (o) o.addEventListener('click', h.atras);
  }
  /* Al volver de la web del proveedor: el estado nuevo a la vista */
  function esperarVuelta(ui, r){
    let seFue = false;
    const vuelta = () => { if (document.hidden) { seFue = true; return; } if (!seFue) return; listo(); recargar(ui); ui.toast(tf('t_vuelta', 'Elegiste {p}. Falta la aprobación.', { p: r.proveedor })); };
    const listo = () => { document.removeEventListener('visibilitychange', vuelta); clearTimeout(tope); };
    const tope = setTimeout(listo, 30 * 60000);
    document.addEventListener('visibilitychange', vuelta);
  }
  async function abrirHoja(d, ui){
    const titulo = t('hoja_t', 'Elegí tu garantía'), texto = t('hoja_p', 'Elegí tu garantía sin salir de la conversación. Podés usar la que prefieras.');
    const h = hoja({ titulo, texto, cuerpo: esqueleto(3) });
    let provs;
    try { provs = ordenar(await G.disponibles(), d.operacion.linea); }
    catch (e) { if (!h.cerrada()) h.cuerpo.innerHTML = `<p class="ms-dlg-err" role="alert">${esc((e && e.message) || String(e))}</p>`; return; }
    if (h.cerrada()) return;
    const lista = () => { h.titulo(titulo, texto); h.cuerpo.innerHTML = listaHTML(provs, d); const b = h.cuerpo.querySelector('[data-elegir],[data-propia]'); if (b) b.focus({ preventScroll: true }); };
    lista();
    let ocupado = false;
    h.cuerpo.addEventListener('click', async e => {
      const b = e.target.closest('[data-elegir]');
      if (b) {
        if (ocupado) return; ocupado = true;
        const err = h.cuerpo.querySelector('.ms-dlg-err'); if (err) err.hidden = true;
        b.disabled = true; b.textContent = t('eligiendo', 'Eligiendo…');
        try { const r = await G.elegir(d.operacion.id, b.dataset.elegir); recargar(ui); if (!h.cerrada()) { h.adelante(lista); mostrarIr(h, r, ui, true); } }
        catch (ex) { b.disabled = false; b.textContent = t('elegir', 'Elegir'); if (err) { err.textContent = (ex && ex.message) || String(ex); err.hidden = false; } }
        finally { ocupado = false; }
        return;
      }
      if (e.target.closest('[data-propia]') && !ocupado) { h.cerrar(); setTimeout(() => usarPropia(d, ui), 0); }
    });
  }
  function usarPropia(d, ui){
    return conDialogo(ui, { titulo: t('propia_dlg_t', 'Tu garantía propietaria'), texto: t('propia_dlg_p', 'Queda anotada y quien publica la ve acá.'), ok: t('guardar', 'Guardar'),
      campos: [{ n: 'detalle', tipo: 'area', label: t('propia_cual', 'Cuál es'), max: 300, ayuda: t('propia_ayuda', 'Por ejemplo: propiedad de un familiar en CABA.') }] },
      v => G.propia(d.operacion.id, v.detalle), t('t_propia', 'Listo: anotamos tu garantía.'));
  }
  /* Seguir el trámite en la web del proveedor elegido (la misma elección no suma pasos) */
  async function irAWeb(d, ui, s){
    const h = hoja({ titulo: tf('ir_t', 'Te llevamos a {p}', { p: nombreDe(s) }), cuerpo: esqueleto(1) });
    try { const r = await G.elegir(d.operacion.id, s.proveedor_id); if (!h.cerrada()) mostrarIr(h, r, ui, false); }
    catch (e) { if (!h.cerrada()) h.cuerpo.innerHTML = `<p class="ms-dlg-err" role="alert">${esc((e && e.message) || String(e))}</p>`; }
  }
  function aprobar(d, ui){
    const s = enCurso(d); if (!s) return;
    const o = s.tipo === 'propia'
      ? { titulo: t('ap_t', 'Garantía aprobada'), texto: t('ap_propia_p', 'Aceptás la garantía propietaria que ofreció.'), ok: t('ap_ok', 'Aprobar'), campos: [] }
      : { titulo: t('ap_t', 'Garantía aprobada'), texto: tf('ap_p', '{p} ya te la confirmó. Anotá el costo total.', { p: nombreDe(s) }), ok: t('ap_ok', 'Aprobar'),
          campos: [{ n: 'costo', tipo: 'numero', label: t('ap_costo', 'Costo total'), req: true, pos: true, min: 0, ayuda: s.costo_estimado != null ? tf('ap_costo_a', 'Estimado: {m}.', { m: G.dinero(s.costo_estimado, s.moneda) }) : null },
                   { n: 'moneda', tipo: 'moneda', label: t('ap_moneda', 'Moneda'), req: true, valor: s.moneda },
                   { n: 'referencia', tipo: 'texto', label: t('ap_ref', 'N.º de póliza o solicitud'), max: 80 }] };
    return conDialogo(ui, o, v => G.actualizar(s.id, 'aprobada', s.tipo === 'propia' ? null : v.costo, s.tipo === 'propia' ? null : v.moneda, v.referencia), t('t_aprobada', 'Listo: garantía aprobada.'));
  }
  function rechazar(d, ui){
    const s = enCurso(d); if (!s) return;
    return conDialogo(ui, { titulo: t('re_t', 'Garantía rechazada'), texto: t('re_p', 'Le avisamos por acá. Puede elegir otra.'), ok: t('re_ok', 'Rechazar'), peligro: true, campos: [] },
      () => G.actualizar(s.id, 'rechazada'), t('t_rechazada', 'Listo: garantía rechazada.'));
  }

  /* ── Próximo paso: el estado en una línea y un solo botón principal ── */
  const solicitudPendiente = d => { const hs = (d.hitos || []).filter(h => /^solicitud_(enviada|aceptada|rechazada)$/.test(h.tipo)); const u = hs[hs.length - 1]; return !!(u && u.tipo === 'solicitud_enviada'); };
  D.registrarAccion({ id: 'garantia_elegir', lados: ['interesado'],
    cuando: d => aplica(d) && puedeElegir(d),
    texto: d => enCurso(d) ? t('a_cambiar', 'Cambiar garantía') : t('a_elegir', 'Elegir garantía'),
    prim: d => !enCurso(d),
    estado: d => { const s = enCurso(d); return !s ? null : s.tipo === 'propia' ? t('e_i_propia', 'Garantía propietaria: falta que la acepten.') : tf('e_i_curso', 'Garantía con {p}: falta la aprobación.', { p: nombreDe(s) }); },
    ejecutar: (d, ui) => abrirHoja(d, ui) });
  D.registrarAccion({ id: 'garantia_aprobada', lados: ['publicador', 'plataforma'],
    cuando: d => aplica(d) && !!enCurso(d) && d.operacion.etapa !== 'caida' && G.puedeActualizar(d),
    texto: t('a_aprobada', 'Garantía aprobada'), prim: () => true,
    estado: d => solicitudPendiente(d) ? null : tf('e_p_curso', 'Eligió {p} de garantía. Marcala al confirmarse.', { p: nombreDe(enCurso(d)) }),
    ejecutar: (d, ui) => aprobar(d, ui) });
  D.registrarAccion({ id: 'garantia_rechazada', lados: ['publicador', 'plataforma'], peligro: true,
    cuando: d => aplica(d) && !!enCurso(d) && G.puedeActualizar(d),
    texto: t('a_rechazada', 'Garantía rechazada'), prim: () => false,
    ejecutar: (d, ui) => rechazar(d, ui) });

  /* ── Sección "Garantía" en los detalles: el estado en una línea, el costo grande, un solo botón ── */
  function seccionHTML(d){
    const s = aprobada(d) || enCurso(d);
    const previas = sols(d).filter(x => x !== s && (x.estado === 'cancelada' || x.estado === 'rechazada')).reverse();
    let h = '';
    if (!s) {
      h += puedeElegir(d)
        ? `<p class="ms-nota">${esc(t('hoja_p', 'Elegí tu garantía sin salir de la conversación. Podés usar la que prefieras.'))}</p><button type="button" class="ms-btn ms-btn-navy gr-sec-btn" data-gar="elegir">${esc(t('a_elegir', 'Elegir garantía'))}</button>`
        : `<p class="ms-nota">${esc(d.lado === 'interesado' ? (G.impedimento(d.operacion, d.hitos, sols(d)) || '') : t('sin_curso', 'Todavía no eligió una garantía.'))}</p>`;
    } else {
      const monto = s.costo_total != null ? s.costo_total : s.costo_estimado;
      const fechaTxt = s.estado === 'aprobada' && s.aprobada_en ? tf('aprobada_el', 'aprobada el {f}', { f: G.fecha(s.aprobada_en) }) : tf('elegida_el', 'elegida el {f}', { f: G.fecha(s.creado_en) });
      const det = [s.tipo !== 'propia' ? G.TIPOS[s.tipo] : null, s.referencia ? tf('ref', 'N.º {r}', { r: s.referencia }) : null, fechaTxt].filter(Boolean).join(' · ');
      h += `<div class="gr-est">
        <p class="gr-est-l1"><span class="gr-est-n">${esc(nombreDe(s))}</span><span class="ms-pill gr-pill-${esc(s.estado)}">${esc(G.ESTADOS[s.estado] || s.estado)}</span></p>
        ${s.tipo !== 'propia' && monto != null ? `<p class="gr-est-m"><span class="gr-est-mv">${esc(G.dinero(monto, s.moneda))}</span><span class="gr-est-mt">${esc(s.costo_total != null ? t('costo', 'costo total') : t('costo_est', 'costo estimado'))}</span></p>` : ''}
        <p class="ms-nota">${esc(det)}</p>
        ${s.tipo === 'propia' && s.detalle ? `<p class="gr-est-det">${esc(s.detalle)}</p>` : ''}
      </div>`;
      const curso = EN_CURSO.indexOf(s.estado) > -1;
      if (d.lado === 'interesado' && curso && s.tipo !== 'propia' && s.proveedor_id) {
        h += `<button type="button" class="ms-btn ms-btn-navy gr-sec-btn" data-gar="web">${esc(t('seguir_web', 'Seguir trámite'))}</button><p class="gr-conf">${esc(tf('conf_web', 'Pagás directo a {p}.', { p: nombreDe(s) }))}</p>`;
      } else if (d.lado === 'interesado' && curso) {
        h += `<p class="gr-conf">${esc(t('conf_propia', 'Quien publica la revisa y te confirma por acá.'))}</p>`;
      } else if (curso && G.puedeActualizar(d) && d.operacion.etapa !== 'caida') {
        h += `<button type="button" class="ms-btn ms-btn-navy gr-sec-btn" data-gar="aprobar">${esc(t('marcar_aprobada', 'Marcar aprobada'))}</button><p class="gr-conf">${esc(s.tipo === 'propia' ? t('conf_p_propia', 'Va a usar su garantía propietaria.') : tf('conf_p_prov', 'Marcala cuando {p} te la confirme.', { p: nombreDe(s) }))}</p>`;
      }
      if (d.lado === 'interesado' && curso && puedeElegir(d)) h += `<button type="button" class="gr-link" data-gar="elegir">${esc(t('a_cambiar', 'Cambiar garantía'))}</button>`;
    }
    if (previas.length) h += `<details class="gr-prev"><summary>${esc(tf('anteriores', 'Ver anteriores ({n})', { n: previas.length }))}</summary><ul>${previas.map(x => `<li><span>${esc(nombreDe(x))}</span><span class="ms-pill gr-pill-${esc(x.estado)}">${esc(G.ESTADOS[x.estado] || x.estado)}</span></li>`).join('')}</ul></details>`;
    return `<div class="gr-sec">${h}</div>`;
  }
  D.registrarSeccion({ id: 'garantia', titulo: () => t('s_titulo', 'Garantía'),
    cuando: d => aplica(d) && (sols(d).length > 0 || puedeElegir(d)),
    html: seccionHTML,
    montar: (d, el, ui) => el.addEventListener('click', e => {
      const b = e.target.closest('[data-gar]'); if (!b) return;
      const a = b.dataset.gar;
      if (a === 'elegir') abrirHoja(d, ui);
      else if (a === 'web') { const s = enCurso(d); if (s) irAWeb(d, ui, s); }
      else if (a === 'aprobar') aprobar(d, ui);
    }) });
})();
