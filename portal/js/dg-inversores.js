/* BAIREN · Portal · Desarrollos y Membresía Inversor (migración 34, 9/10/2026).
   El riel de desarrollos, enchufado a BPDigital (js/digital.js) sin tocarlo:
   · Lista de espera: "Avisame cuando haya novedades" en cada desarrollo (emprendimientos.html). Se agrupa por el texto de
     avisos.emprendimiento y la desarrolladora. La desarrolladora ve cuántos esperan; la plataforma, quiénes.
   · Membresía Inversor (inversores.html): la pide el usuario, la activa o la pausa la plataforma a mano (hasta que el cobro
     vaya por Mercado Pago). El precio es un dato del plan (USD 25 por mes), no está fijo acá.
   · Acceso anticipado: los miembros ven los lanzamientos de Explorar 48 h antes (BPDigital.novedades trae "anticipado").
   · Lead de inversor: el paso "lead_inversor" cuando un miembro activo consulta una unidad en pozo. Con base, lo registra
     un trigger; en modo local, este archivo al abrir la operación y, si se abrió desde otra página, al cargarla en Mensajes.
   Con base, todo va por las funciones de la migración 34; en modo local, por localStorage con las mismas reglas. */
(function(){
  'use strict';
  const D = window.BPDigital; if (!D || D._inversores) return;
  D._inversores = true;
  const S = () => window.BPStore;
  const T = (k, d) => (window.BP && BP.t) ? BP.t('dg_desarrollos_' + k, d) : d;
  const L = D._local;
  const K = { mem: L.LS('bp_dg_inv_membresias'), plan: L.LS('bp_dg_inv_plan'), lista: L.LS('bp_dg_lista_espera'), hitos: L.LS('bp_dg_hitos'), pubs: L.LS('bp_dg_publicaciones') };
  const PLAN_EJEMPLO = { plan: 'inversor', nombre: 'Membresía Inversor', precio: 25, moneda: 'USD', periodo: 'mes', activo: true };
  const H48 = 48 * 36e5;
  const ses = () => (S() && S().session) || null;
  const requiere = () => { const s = ses(); if (!s) throw new Error(T('err_sesion', 'Ingresá para seguir.')); return s; };
  const base = () => D.conBase();
  const esPlataforma = async () => { try { return !!(ses() && await S().isCurador()); } catch (e) { return false; } };
  const t0 = s => s ? Date.parse(s) : NaN;

  /* ── Membresía: modo local ─────────────────────────────── */
  const planLocal = () => { let p = K.plan.get(null); if (!p) { p = Object.assign({}, PLAN_EJEMPLO); K.plan.set(p); } return p; };
  const vigente = (m, cuando) => { const c = cuando == null ? Date.now() : cuando; return !!(m && m.estado === 'activa' && t0(m.desde) <= c && t0(m.hasta) > c); };
  const estadoDe = m => !m ? null : (m.estado === 'activa' && t0(m.hasta) <= Date.now()) ? 'vencida' : m.estado;
  const memDe = uid => K.mem.get([]).find(m => m.usuario === uid) || null;
  const publica = m => m ? { id: m.id, plan: m.plan, estado: estadoDe(m), desde: m.desde || null, hasta: m.hasta || null, solicitada_en: m.solicitada_en, precio: m.precio, moneda: m.moneda } : null;
  const guardarMem = (id, cambios) => { const all = K.mem.get([]); const m = all.find(x => x.id === id); if (!m) throw new Error(T('err_no_existe', 'La membresía no existe.')); Object.assign(m, cambios, { actualizado_en: L.now() }); K.mem.set(all); return m; };

  let cache = null, cacheEn = 0;
  const olvidar = () => { cache = null; cacheEn = 0; };

  /* { plan: { plan, nombre, precio, moneda, periodo, activo }, membresia: { id, estado, desde, hasta, … } | null, miembro } */
  D.membresia = async function(){
    if (cache && Date.now() - cacheEn < 20000) return cache;
    let r;
    if (base()) r = await D.rpc('mi_membresia_inversor');
    else { const s = ses(); const m = s ? memDe(s.id) : null; r = { plan: planLocal(), membresia: publica(m), miembro: vigente(m) }; }
    cache = r; cacheEn = Date.now(); return r;
  };
  D.esMiembro = async function(){ if (!ses()) return false; try { return !!(await D.membresia()).miembro; } catch (e) { return false; } };

  /* La pide el usuario: queda "solicitada" (o vuelve a "solicitada" si estaba pausada o vencida) */
  D.solicitarMembresia = async function(){
    const s = requiere(); olvidar();
    if (base()) { cache = await D.rpc('solicitar_membresia'); cacheEn = Date.now(); return cache; }
    const p = planLocal(); if (!p.activo) throw new Error(T('err_plan', 'La membresía no está disponible por ahora.'));
    const all = K.mem.get([]); let m = all.find(x => x.usuario === s.id);
    if (!m) { m = { id: L.uid(), usuario: s.id, email: s.email || null, plan: p.plan, estado: 'solicitada', desde: null, hasta: null, proveedor: null, referencia: null, precio: p.precio, moneda: p.moneda, solicitada_en: L.now(), creado_en: L.now(), actualizado_en: L.now() }; all.push(m); K.mem.set(all); }
    else if (estadoDe(m) === 'pausada' || estadoDe(m) === 'vencida') guardarMem(m.id, { estado: 'solicitada', solicitada_en: L.now(), precio: p.precio, moneda: p.moneda });
    return D.membresia();
  };

  /* Plataforma: solicitudes y miembros (lo vencido pasa a "vencida") */
  D.membresiasAdmin = async function(){
    requiere();
    if (base()) return D.rpc('membresias_inversor_lista');
    if (!(await esPlataforma())) throw new Error(T('err_plataforma', 'Solo la plataforma ve las membresías.'));
    const all = K.mem.get([]); all.forEach(m => { if (m.estado === 'activa' && t0(m.hasta) <= Date.now()) { m.estado = 'vencida'; m.actualizado_en = L.now(); } }); K.mem.set(all);
    const orden = { solicitada: 0, activa: 1, pausada: 2, vencida: 3 };
    return all.map(m => ({ id: m.id, usuario: m.usuario, nombre: (m.email || '').split('@')[0] || T('alguien', 'Sin nombre'), email: m.email, plan: m.plan, estado: m.estado, desde: m.desde, hasta: m.hasta, proveedor: m.proveedor, referencia: m.referencia, precio: m.precio, moneda: m.moneda, solicitada_en: m.solicitada_en, actualizado_en: m.actualizado_en }))
      .sort((a, b) => (orden[a.estado] - orden[b.estado]) || String(b.solicitada_en).localeCompare(String(a.solicitada_en)));
  };
  /* hasta: ISO o 'YYYY-MM-DD' (sin hasta: un mes desde hoy, o desde el vencimiento si sigue activa) */
  D.activarMembresia = async function(id, hasta, referencia){
    requiere(); olvidar();
    const h = hasta ? (/^\d{4}-\d{2}-\d{2}$/.test(hasta) ? hasta + 'T23:59:00-03:00' : hasta) : null;
    if (base()) return D.rpc('activar_membresia', { p_id: id, p_hasta: h, p_proveedor: 'manual', p_referencia: referencia || null });
    if (!(await esPlataforma())) throw new Error(T('err_activa', 'Solo la plataforma activa membresías.'));
    const m = K.mem.get([]).find(x => x.id === id); if (!m) throw new Error(T('err_no_existe', 'La membresía no existe.'));
    const sigue = vigente(m); const desdeBase = sigue ? t0(m.hasta) : Date.now();
    const fin = h ? t0(h) : (() => { const f = new Date(desdeBase); f.setMonth(f.getMonth() + 1); return +f; })();
    if (!(fin > Date.now())) throw new Error(T('err_fecha', 'La fecha de fin tiene que ser posterior a hoy.'));
    if (fin > Date.now() + 3 * 365 * 864e5) throw new Error(T('err_fecha_lejos', 'La fecha de fin es demasiado lejana.'));
    return guardarMem(id, { estado: 'activa', desde: sigue ? m.desde : L.now(), hasta: new Date(fin).toISOString(), proveedor: 'manual', referencia: (referencia && String(referencia).trim().slice(0, 200)) || m.referencia || null });
  };
  D.pausarMembresia = async function(id){
    requiere(); olvidar();
    if (base()) return D.rpc('pausar_membresia', { p_id: id });
    if (!(await esPlataforma())) throw new Error(T('err_pausa', 'Solo la plataforma pausa membresías.'));
    return guardarMem(id, { estado: 'pausada' });
  };

  /* ── Lista de espera ───────────────────────────────────── */
  const limpio = e => String(e || '').trim();
  const mismoPub = (a, pub) => !pub || a.publicadorId === pub || (window.BPData && BPData.pub(a.publicadorId).storeId === pub);
  /* El publicador (id del catálogo) de un desarrollo publicado, o null */
  async function pubDelDesarrollo(emp, pub){
    let avisos = []; try { avisos = (await window.BPData.load()).avisos || []; } catch (e) { return pub || null; }
    const us = avisos.filter(a => limpio(a.emprendimiento) === emp && mismoPub(a, pub));
    if (!us.length) return null;
    const a = us[0]; const p = window.BPData ? BPData.pub(a.publicadorId) : null;
    return (p && p.storeId) || a.publicadorId;
  }
  /* pub: el id del publicador (con base, el uuid; en local, el id del catálogo) */
  D.sumarmeLista = async function(emprendimiento, pub){
    const s = requiere(); const emp = limpio(emprendimiento);
    if (!emp) throw new Error(T('err_falta_emp', 'Falta el desarrollo.'));
    if (base()) return D.rpc('sumarme_lista', { p_emprendimiento: emp, p_publicador: pub || null });
    const p = await pubDelDesarrollo(emp, pub); if (!p) throw new Error(T('err_no_publicado', 'Ese desarrollo no está publicado.'));
    const mio = await L.miPub(); if (mio && (mio.id === p || mio.slug === p)) throw new Error(T('err_tuyo', 'Es un desarrollo tuyo.'));
    const all = K.lista.get([]);
    if (!all.some(x => x.usuario === s.id && x.emprendimiento === emp && x.publicador_id === p)) {
      if (all.filter(x => x.usuario === s.id).length >= 50) throw new Error(T('err_max', 'Ya estás en 50 listas de espera.'));
      all.push({ id: L.nid(), emprendimiento: emp, publicador_id: p, usuario: s.id, email: s.email || null, creado_en: L.now(), avisado_en: null }); K.lista.set(all);
    }
    return { en_lista: true, emprendimiento: emp, publicador_id: p };
  };
  D.salirLista = async function(emprendimiento, pub){
    const s = requiere(); const emp = limpio(emprendimiento);
    if (base()) return D.rpc('salir_lista', { p_emprendimiento: emp, p_publicador: pub || null });
    const all = K.lista.get([]); const quedan = all.filter(x => !(x.usuario === s.id && x.emprendimiento === emp && (!pub || x.publicador_id === pub)));
    K.lista.set(quedan); return all.length - quedan.length;
  };
  /* Las listas en las que está la sesión: [{ emprendimiento, publicador_id, creado_en, avisado_en }] */
  D.misListas = async function(){
    const s = ses(); if (!s) return [];
    if (base()) { const { data, error } = await D.db().from('lista_espera').select('emprendimiento,publicador_id,creado_en,avisado_en').eq('usuario', s.id).limit(200); if (error) throw error; return data || []; }
    return K.lista.get([]).filter(x => x.usuario === s.id).map(x => ({ emprendimiento: x.emprendimiento, publicador_id: x.publicador_id, creado_en: x.creado_en, avisado_en: x.avisado_en }));
  };
  /* Cuántos esperan cada desarrollo: la plataforma, todos; la desarrolladora, los suyos */
  D.listasEspera = async function(){
    if (!ses()) return [];
    if (base()) return D.rpc('lista_espera_resumen');
    const plat = await esPlataforma(); const mio = await L.miPub();
    const g = {};
    K.lista.get([]).forEach(x => {
      if (!plat && !(mio && (mio.id === x.publicador_id || mio.slug === x.publicador_id))) return;
      const k = x.publicador_id + '|' + x.emprendimiento;
      const r = g[k] = g[k] || { emprendimiento: x.emprendimiento, publicador_id: x.publicador_id, publicador_nombre: (window.BPData && BPData.pub(x.publicador_id).nombre) || null, total: 0, sin_avisar: 0, ultimo: null };
      r.total++; if (!x.avisado_en) r.sin_avisar++; if (!r.ultimo || x.creado_en > r.ultimo) r.ultimo = x.creado_en;
    });
    return Object.values(g).sort((a, b) => String(b.ultimo).localeCompare(String(a.ultimo)));
  };
  /* Quiénes esperan (solo la plataforma) */
  D.listaPersonas = async function(emprendimiento, pub){
    requiere();
    if (base()) return D.rpc('lista_espera_personas', { p_emprendimiento: limpio(emprendimiento), p_publicador: pub || null });
    if (!(await esPlataforma())) throw new Error(T('err_quienes', 'Solo la plataforma ve quiénes esperan.'));
    return K.lista.get([]).filter(x => x.emprendimiento === limpio(emprendimiento) && (!pub || x.publicador_id === pub))
      .map(x => ({ id: x.id, nombre: (x.email || '').split('@')[0], email: x.email, creado_en: x.creado_en, avisado_en: x.avisado_en }));
  };
  D.marcarAvisados = async function(emprendimiento, pub){
    requiere();
    if (base()) return D.rpc('marcar_avisados', { p_emprendimiento: limpio(emprendimiento), p_publicador: pub || null });
    if (!(await esPlataforma())) throw new Error(T('err_avisos', 'Solo la plataforma marca avisos.'));
    const all = K.lista.get([]); let n = 0;
    all.forEach(x => { if (x.emprendimiento === limpio(emprendimiento) && (!pub || x.publicador_id === pub) && !x.avisado_en) { x.avisado_en = L.now(); n++; } });
    K.lista.set(all); return n;
  };

  /* ── Acceso anticipado en Explorar (modo local; con base lo hace la vista portal.novedades) ── */
  const novedadesBase = D.novedades;
  D.novedades = async function(){
    const filas = await novedadesBase.apply(D, arguments);
    if (base()) return filas;
    const miembro = await D.esMiembro(); const ahora = Date.now(); const pubs = K.pubs.get([]);
    return filas.filter(r => {
      if (!r.publicacion_id) { r.visible_desde_publico = null; r.anticipado = false; return true; }
      const p = pubs.find(x => x.id === r.publicacion_id) || {};
      const pubEn = t0(r.fecha) || ahora;
      const desde = p.visible_desde_publico ? Math.max(t0(p.visible_desde_publico), pubEn) : pubEn + (r.tipo === 'lanzamiento' ? H48 : 0);
      r.visible_desde_publico = new Date(desde).toISOString(); r.anticipado = desde > ahora;
      if (r.anticipado && !miembro) return false;
      if (!miembro && desde > pubEn) r.fecha = r.visible_desde_publico;
      return true;
    });
  };

  /* ── Lead de inversor (modo local; con base, el trigger trg_lead_inversor) ── */
  async function leadLocal(opId){
    if (base()) return false;
    const op = L.ops().find(o => o.id === opId);
    if (!op || op.linea !== 'pozo' || !op.interesado_user) return false;
    const hitos = K.hitos.get([]);
    const consulta = hitos.find(h => h.operacion_id === opId && h.tipo === 'consulta'); if (!consulta) return false;
    if (hitos.some(h => h.operacion_id === opId && h.tipo === 'lead_inversor')) return false;
    if (!vigente(memDe(op.interesado_user), t0(consulta.creado_en))) return false;
    let emp = null;
    try { const a = ((await window.BPData.load()).avisos || []).find(x => String(x.id) === String(op.aviso_id)); emp = (a && limpio(a.emprendimiento)) || null; } catch (e) { /* sin catálogo: solo por unidad */ }
    const conLead = new Set(hitos.filter(h => h.tipo === 'lead_inversor').map(h => h.operacion_id));
    const repetido = L.ops().some(o => o.id !== opId && conLead.has(o.id) && o.interesado_user === op.interesado_user && o.publicador_id === op.publicador_id
      && (String(o.aviso_id) === String(op.aviso_id) || (emp && o.emprendimiento_local === emp)));
    if (emp) { const ops = L.ops(); const o = ops.find(x => x.id === opId); o.emprendimiento_local = emp; L.guardarOps(ops); }
    if (repetido) return false;
    D._hitoLocal(opId, 'lead_inversor', 'sistema', emp ? { consulta: consulta.id, plan: 'inversor', emprendimiento: emp } : { consulta: consulta.id, plan: 'inversor' });
    return true;
  }
  const abrirBase = D.abrir;
  D.abrir = async function(){
    const id = await abrirBase.apply(D, arguments);
    try { await leadLocal(id); } catch (e) { console.warn('lead de inversor', e); }
    return id;
  };
  /* Si la operación se abrió desde una página sin este archivo (la ficha), el paso se registra al cargarla */
  D.enriquecerDetalle(async d => {
    const op = d.operacion || {};
    if (!base() && await leadLocal(op.id)) d.hitos = K.hitos.get([]).filter(h => h.operacion_id === op.id);
    d.ext.desarrollos = { lead: (d.hitos || []).some(h => h.tipo === 'lead_inversor') };
  });
})();
