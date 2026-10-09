/* BAIREN · Portal · Riel de identidad (migración 29, 9/10/2026).
   Identidad verificada, una vez por persona, y los datos de quien ofrece (Res. SIC 446/2025).
   window.BPIdentidad (se puede usar en cualquier página, con o sin js/digital.js):
     · estado({ fresco }) → { estado: 'sin'|'pendiente'|'verificada'|'rechazada', verificada, verificada_en, motivo,
       pendiente_desde, nombre, apellido, dni } de la sesión. Guarda 60 s; olvidar() lo vuelve a pedir.
     · verificada() → boolean (promesa).
     · achicar(file) → JPEG chico, hecho en el navegador.
     · solicitar({ frente, dorso, selfie, nombre, apellido, dni, consentimiento, progreso(i, n) }) → sube las tres fotos a
       la carpeta de la cuenta (bucket privado portal-identidad) y pide la revisión.
     · cola(), resolver(id, ok, motivo), borrarFotos(id, rutas) → la curación. Al resolver se borran las fotos.
     · oferente(pub) → { nombre, cuit, domicilio, dueno, completo } para el renglón "Quién ofrece" de la ficha.
     · guardarDomicilio(pub, texto) → el domicilio legal del publicador (panel, Mi cuenta).
     · url(volver) → cuenta-verificacion.html?volver=…
   Con js/digital.js cargado, además: BPDigital.identidad() → { estado, verificada }, BPDigital.identidadVerificada() →
   boolean (los usan la reserva y la firma), la acción "Verificá tu identidad" en "Más" para quien busca y, en modo local,
   el "Verificado" del contacto del interesado.
   Con base: las funciones de la migración 29. Sin base (modo local): localStorage, con las mismas reglas. */
(function(){
  'use strict';
  const S = () => window.BPStore;
  const T = (k, d) => (window.BP && BP.t) ? BP.t('dg_identidad_' + k, d) : d;
  const BUCKET = 'portal-identidad';
  const TIPOS = ['frente', 'dorso', 'selfie'];
  const I = {};

  const conBase = () => !!(S() && S().mode === 'supabase' && !S().demo && S().sb);
  const db = () => S().sb.schema('portal');
  const humano = (e, noDisponible) => {
    const m = String((e && e.message) || e || '');
    const txt = /permission denied|JWT|not authenticated/i.test(m) ? T('err_sesion', 'Ingresá para seguir.')
      : /does not exist|could not find|schema cache|bucket not found/i.test(m) ? (noDisponible || T('err_no_disponible', 'La verificación de identidad todavía no está disponible.'))
      : /failed to fetch|networkerror|load failed/i.test(m) ? T('err_red', 'No hay conexión. Revisá internet y probá de nuevo.')
      : m;
    const err = new Error(txt); err.original = e; return err;
  };
  const rpc = async (fn, args) => { const { data, error } = await db().rpc(fn, args || {}); if (error) throw humano(error); return data; };
  const LS = key => ({
    get(d){ try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? d : v; } catch (e) { return d; } },
    set(v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { throw new Error(T('err_lleno', 'No hay lugar en este navegador para guardar las fotos de prueba.')); } }
  });
  const L = { per: LS('bp_dg_identidad'), cola: LS('bp_dg_identidad_cola') };
  const now = () => new Date().toISOString();
  const nid = () => 'v' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const sesion = () => (S() && S().session) || null;
  const requiereSesion = () => { const s = sesion(); if (!s) throw new Error(T('err_sesion', 'Ingresá para seguir.')); return s; };
  const limpio = v => { const x = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return x || null; };
  const esUUID = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  const dniLimpio = v => String(v || '').replace(/[^0-9a-z]/gi, '').toUpperCase();

  /* ── estado de la sesión ───────────────────────────────── */
  let cache = null;
  I.olvidar = () => { cache = null; };
  const SIN = () => ({ estado: 'sin', verificada: false, verificada_en: null, motivo: null, pendiente_desde: null, nombre: null, apellido: null, dni: null });
  I.estado = async function(o){
    const s = sesion(); if (!s) return SIN();
    if (!(o && o.fresco) && cache && cache.uid === s.id && Date.now() - cache.t < 60000) return cache.v;
    let v;
    if (conBase()) v = Object.assign(SIN(), (await rpc('mi_identidad')) || {});
    else {
      const p = L.per.get({})[s.id];
      v = p ? Object.assign(SIN(), { estado: p.estado || 'sin', verificada_en: p.verificada_en || null, motivo: p.estado === 'rechazada' ? (p.motivo || null) : null,
        pendiente_desde: p.estado === 'pendiente' ? (p.pendiente_desde || null) : null, nombre: p.nombre || null, apellido: p.apellido || null, dni: p.dni || null }) : SIN();
      v.verificada = v.estado === 'verificada';
    }
    v.verificada = !!v.verificada;
    cache = { uid: s.id, t: Date.now(), v }; return v;
  };
  I.verificada = async function(){ try { return (await I.estado()).verificada; } catch (e) { return false; } };
  I.url = volver => 'cuenta-verificacion.html' + (volver ? '?volver=' + encodeURIComponent(volver) : '');

  /* ── fotos: se achican en el navegador (con base, 1600 px; en modo local, 900 px para que entren en localStorage) ── */
  I.achicar = function(file){
    const max = conBase() ? 1600 : 900, calidad = conBase() ? .82 : .7;
    return new Promise((res, rej) => {
      if (!file || (file.type && !/^image\//.test(file.type))) return rej(new Error(T('err_tipo', 'Elegí una foto.')));
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        if (Math.max(w, h) < 480) { URL.revokeObjectURL(u); return rej(new Error(T('err_chica', 'La foto salió muy chica. Sacala de nuevo, más cerca.'))); }
        const k = Math.min(1, max / Math.max(w, h));
        const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(b => b ? res(b) : rej(new Error(T('err_foto', 'No pudimos leer esa foto. Probá con otra.'))), 'image/jpeg', calidad);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error(T('err_foto', 'No pudimos leer esa foto. Probá con otra.'))); };
      img.src = u;
    });
  };
  const aDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

  /* ── pedir la verificación ─────────────────────────────── */
  I.solicitar = async function(o){
    const s = requiereSesion(); o = o || {};
    if (!o.consentimiento) throw new Error(T('err_consent', 'Para mandar las fotos, marcá que estás de acuerdo.'));
    const fotos = TIPOS.map(k => o[k]);
    if (fotos.some(f => !f)) throw new Error(T('err_faltan', 'Faltan fotos: el frente y el dorso del documento y una selfie.'));
    const nombre = limpio(o.nombre), apellido = limpio(o.apellido), dni = dniLimpio(o.dni);
    if (!nombre || !apellido) throw new Error(T('err_nombre', 'Escribí tu nombre y tu apellido como figuran en el documento.'));
    if (!/^[0-9A-Z]{6,12}$/.test(dni)) throw new Error(T('err_dni', 'Revisá el número de documento.'));
    if (nombre.length > 80 || apellido.length > 80) throw new Error(T('err_largo', 'El nombre es muy largo.'));
    const avance = typeof o.progreso === 'function' ? o.progreso : () => {};
    if (conBase()) {
      const st = S().sb.storage.from(BUCKET), marca = Date.now().toString(36), rutas = [];
      for (let i = 0; i < 3; i++) {
        avance(i + 1, 3);
        const ruta = s.id + '/' + marca + '-' + TIPOS[i] + '.jpg';
        const { error } = await st.upload(ruta, fotos[i], { contentType: 'image/jpeg', upsert: false, cacheControl: '60' });
        if (error) throw humano(error);
        rutas.push(ruta);
      }
      const r = await rpc('solicitar_verificacion', { p_frente: rutas[0], p_dorso: rutas[1], p_selfie: rutas[2], p_nombre: nombre, p_apellido: apellido, p_dni: dni, p_consentimiento: true });
      I.olvidar(); return r;
    }
    /* modo local: las mismas reglas que portal.solicitar_verificacion */
    const per = L.per.get({}), p = per[s.id] || {};
    if (p.estado === 'verificada') throw new Error(T('err_ya', 'Tu identidad ya está verificada.'));
    if (p.estado === 'pendiente') throw new Error(T('err_pendiente', 'Ya mandaste tus fotos: las estamos revisando.'));
    const cola = L.cola.get([]);
    if (cola.filter(x => x.usuario === s.id && Date.now() - new Date(x.creado_en).getTime() < 864e5).length >= 5) throw new Error(T('err_muchas', 'Mandaste muchas verificaciones hoy. Probá de nuevo mañana.'));
    const datos = [];
    for (let i = 0; i < 3; i++) { avance(i + 1, 3); datos.push(await aDataUrl(fotos[i])); }
    const x = { id: nid(), usuario: s.id, email: s.email, estado: 'pendiente', frente: datos[0], dorso: datos[1], selfie: datos[2], nombre, apellido, dni,
      consentimiento_en: now(), creado_en: now(), resuelta_en: null, revisado_por: null, motivo: null, archivos_borrados_en: null };
    cola.push(x); L.cola.set(cola);
    per[s.id] = Object.assign(p, { estado: 'pendiente', motivo: null, pendiente_desde: x.creado_en, nombre, apellido, dni, email: s.email });
    L.per.set(per);
    I.olvidar(); return { id: x.id, estado: 'pendiente' };
  };

  /* ── curación ──────────────────────────────────────────── */
  /* Lo pendiente (con las fotos por URL firmada de 2 minutos) y lo resuelto cuyas fotos todavía no se borraron */
  I.cola = async function(){
    requiereSesion();
    if (conBase()) {
      const filas = (await rpc('verificaciones_cola')) || [];
      const rutas = [].concat(...filas.filter(f => f.estado === 'pendiente').map(f => TIPOS.map(k => f[k]).filter(Boolean)));
      const firmadas = {};
      if (rutas.length) {
        const { data, error } = await S().sb.storage.from(BUCKET).createSignedUrls(rutas, 120);
        if (error) console.warn('identidad: URL firmadas', error);
        (data || []).forEach(d => { if (d && d.path && d.signedUrl) firmadas[d.path] = d.signedUrl; });
      }
      return filas.map(f => Object.assign({}, f, { urls: { frente: firmadas[f.frente] || null, dorso: firmadas[f.dorso] || null, selfie: firmadas[f.selfie] || null } }));
    }
    if (!(await S().isCurador())) return [];
    const todas = L.cola.get([]);
    return todas.filter(x => x.estado === 'pendiente' || (!x.archivos_borrados_en && (x.frente || x.dorso || x.selfie)))
      .sort((a, b) => (a.estado === 'pendiente' ? 0 : 1) - (b.estado === 'pendiente' ? 0 : 1) || String(a.creado_en).localeCompare(String(b.creado_en)))
      .map(x => {
        const previas = todas.filter(y => y.usuario === x.usuario && y.id !== x.id && y.estado === 'rechazada').sort((a, b) => String(b.resuelta_en).localeCompare(String(a.resuelta_en)));
        return { id: x.id, estado: x.estado, creado_en: x.creado_en, resuelta_en: x.resuelta_en, frente: x.frente ? 'local' : null, dorso: x.dorso ? 'local' : null, selfie: x.selfie ? 'local' : null,
          nombre: x.nombre, apellido: x.apellido, dni: x.dni, email: x.email, motivo: x.motivo, motivo_anterior: previas[0] ? previas[0].motivo : null,
          intentos: todas.filter(y => y.usuario === x.usuario).length, urls: { frente: x.frente, dorso: x.dorso, selfie: x.selfie } };
      });
  };
  async function borrarArchivos(id, rutas){
    try {
      const r = (rutas || []).filter(Boolean);
      if (r.length) { const { error } = await S().sb.storage.from(BUCKET).remove(r); if (error) throw error; }
      return !!(await rpc('confirmar_borrado_identidad', { p_id: id }));
    } catch (e) { console.error('[bairen] las fotos de identidad NO se borraron:', e); return false; }
  }
  /* Aprobar (ok = true) o rechazar con motivo. Después se borran las fotos: { estado, borradas } */
  I.resolver = async function(id, ok, motivo){
    const s = requiereSesion();
    const m = limpio(motivo);
    if (!ok && !m) throw new Error(T('err_motivo', 'Escribí el motivo del rechazo: la persona lo va a leer.'));
    if (m && m.length > 300) throw new Error(T('err_motivo_largo', 'El motivo puede tener hasta 300 letras.'));
    if (conBase()) {
      const r = await rpc('resolver_verificacion', { p_id: id, p_ok: !!ok, p_motivo: ok ? null : m });
      const borradas = await borrarArchivos(id, (r && r.archivos) || []);
      return { estado: r && r.estado, borradas };
    }
    if (!(await S().isCurador())) throw new Error(T('err_solo_cura', 'Solo la curación resuelve las verificaciones.'));
    const cola = L.cola.get([]), x = cola.find(y => y.id === id);
    if (!x) throw new Error(T('err_no_existe', 'La verificación no existe.'));
    if (x.usuario === s.id) throw new Error(T('err_propia', 'Tu propia verificación la resuelve otra persona del equipo.'));
    if (x.estado !== 'pendiente') throw new Error(T('err_resuelta', 'Esta verificación ya está resuelta.'));
    Object.assign(x, { estado: ok ? 'verificada' : 'rechazada', resuelta_en: now(), revisado_por: s.email || s.id, motivo: ok ? null : m,
      frente: null, dorso: null, selfie: null, archivos_borrados_en: now() });   /* en modo local, borrar es sacar las fotos de la fila */
    L.cola.set(cola);
    const per = L.per.get({}), p = per[x.usuario] || { nombre: x.nombre, apellido: x.apellido, dni: x.dni, email: x.email };
    Object.assign(p, ok ? { estado: 'verificada', verificada_en: now(), motivo: null, pendiente_desde: null } : { estado: 'rechazada', motivo: m, pendiente_desde: null });
    per[x.usuario] = p; L.per.set(per);
    I.olvidar();
    return { estado: x.estado, borradas: true };
  };
  /* Reintento del borrado de lo resuelto (la cola lo muestra como "Fotos por borrar") */
  I.borrarFotos = async function(id, rutas){ requiereSesion(); return conBase() ? borrarArchivos(id, rutas) : true; };

  /* ── quien ofrece (Res. SIC 446/2025) ─────────────────── */
  const fmtCuit = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10) : String(c || '').trim(); };
  const nombrePublico = n => (window.BPData && BPData.nombrePublico) ? BPData.nombrePublico(n) : n;
  /* pub: el publicador de la ficha (BPData.pub): id es el slug, storeId el id de la base */
  I.oferente = async function(pub){
    pub = pub || {};
    let fila = null;
    try {
      if (conBase()) {
        let q = db().from('publicador_publico').select('id,slug,tipo,nombre,razon_social,cuit,domicilio_legal');
        q = esUUID(pub.storeId) ? q.eq('id', pub.storeId) : esUUID(pub.id) ? q.eq('id', pub.id) : q.eq('slug', pub.slug || pub.id || '');
        const { data, error } = await q.maybeSingle(); if (error) throw error; fila = data || null;
      } else if (S() && S().getPublicador && (pub.storeId || pub.id)) fila = await S().getPublicador(pub.storeId || pub.id);
    } catch (e) { console.warn('quién ofrece', e && e.message); }
    const base = fila || pub;
    const dueno = (base.tipo || pub.tipo) === 'dueno';
    /* Un dueño directo es una persona física: su nombre público, su CUIT y su domicilio. Una empresa: la razón social. */
    const nombre = dueno ? limpio(nombrePublico(base.nombre || pub.nombre)) : (limpio(!dueno && base.razon_social) || limpio(base.nombre || pub.nombre));
    const cuit = limpio(base.cuit) ? fmtCuit(base.cuit) : null, domicilio = limpio(base.domicilio_legal);
    return { nombre, cuit, domicilio, dueno, completo: !!(nombre && cuit && domicilio) };
  };
  /* El domicilio legal del publicador de la sesión (vacío lo borra) */
  I.guardarDomicilio = async function(pub, texto){
    requiereSesion();
    const v = limpio(texto);
    if (v && v.length < 6) throw new Error(T('err_dom_corto', 'Escribí la calle, el número y la ciudad.'));
    if (v && v.length > 200) throw new Error(T('err_dom_largo', 'El domicilio puede tener hasta 200 letras.'));
    if (!pub || !pub.id) throw new Error(T('err_dom_sin_pub', 'Primero creá tu perfil de publicador.'));
    if (conBase()) {
      const { data, error } = await db().from('publicadores').update({ domicilio_legal: v }).eq('id', pub.id).select('id,domicilio_legal').maybeSingle();
      if (error) throw humano(error, T('err_dom_no_disponible', 'Todavía no se puede guardar el domicilio. Probá más tarde.'));
      if (!data) throw new Error(T('err_dom_permiso', 'No pudimos guardar el domicilio de este perfil.'));
      return data.domicilio_legal;
    }
    const all = LS('bp_publicadores').get([]), x = all.find(p => p.id === pub.id);
    if (!x) throw new Error(T('err_dom_permiso', 'No pudimos guardar el domicilio de este perfil.'));
    x.domicilio_legal = v; LS('bp_publicadores').set(all);
    return v;
  };

  window.BPIdentidad = I;

  /* ── enchufe a la operación (js/digital.js) ────────────── */
  const D = window.BPDigital;
  if (D && !D._identidad) {
    D._identidad = true;
    D.identidad = async function(){ const e = await I.estado(); return { estado: e.estado, verificada: !!e.verificada }; };
    D.identidadVerificada = () => I.verificada();
    if (D.enriquecerDetalle) D.enriquecerDetalle(async d => {
      if (d.lado === 'interesado') { try { d.ext.identidad = await D.identidad(); } catch (e) { d.ext.identidad = null; } }
      /* Modo local: el "Verificado" del interesado que ve quien publica (con base lo da portal.contacto_interesado) */
      if (!conBase() && d.interesado && d.operacion && d.operacion.interesado_user) {
        const p = L.per.get({})[d.operacion.interesado_user];
        if (p && p.estado === 'verificada') d.interesado.verificado = true;
      }
    });
    /* Para quien busca y todavía no se verificó: en "Más", lleva a la verificación y vuelve a esta conversación */
    if (D.registrarAccion) D.registrarAccion({
      id: 'identidad', lados: ['interesado'],
      cuando: d => { const e = d.ext && d.ext.identidad, et = d.operacion && d.operacion.etapa; return !!e && !e.verificada && et !== 'cerrada' && et !== 'caida'; },
      texto: d => d.ext.identidad.estado === 'pendiente' ? T('acc_revision', 'Identidad en revisión') : T('acc_verificar', 'Verificá tu identidad'),
      ejecutar: async (d, ui) => { location.href = I.url('mensajes.html?op=' + encodeURIComponent(ui.opId)); }
    });
  }
})();
