/* BAIREN · Portal · almacenamiento y sesión.
   Dos modos: 'supabase' (esquema `portal` expuesto en la API y Auth por mail con código) y 'local'
   (localStorage + IndexedDB, para probar los flujos sin base). Se elige solo: si el esquema portal
   responde, supabase; si no, local. Misma API para las páginas. */
(function(){
  'use strict';
  const S = { mode: 'local', session: null, sb: null, ready: null };
  const LS = key => ({ get(d){ try{ const v = JSON.parse(localStorage.getItem(key)); return v == null ? d : v; }catch(e){ return d; } }, set(v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){ console.warn('localStorage lleno', e); } } });
  const L = { user: LS('bp_user'), pubs: LS('bp_publicadores'), avisos: LS('bp_avisos'), consultas: LS('bp_consultas_db'), verif: LS('bp_verificaciones'), vistas: LS('bp_vistas'), code: LS('bp_code') };
  const uid = () => 'l' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const now = () => new Date().toISOString();
  const slugify = t => (t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  /* IndexedDB mínimo para fotos en modo local */
  const idb = { db: null,
    open(){ return new Promise((res, rej) => { if (idb.db) return res(idb.db); const r = indexedDB.open('bairen-portal', 1); r.onupgradeneeded = () => r.result.createObjectStore('blobs'); r.onsuccess = () => { idb.db = r.result; res(idb.db); }; r.onerror = () => rej(r.error); }); },
    put(key, blob){ return idb.open().then(db => new Promise((res, rej) => { const tx = db.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(blob, key); tx.oncomplete = () => res(key); tx.onerror = () => rej(tx.error); })); },
    get(key){ return idb.open().then(db => new Promise((res, rej) => { const tx = db.transaction('blobs'); const q = tx.objectStore('blobs').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); })); },
  };
  const urlCache = {};
  S.resolveFoto = async function(url){ if (!url || url.indexOf('idb:') !== 0) return url; if (urlCache[url]) return urlCache[url]; const b = await idb.get(url.slice(4)); if (!b) return ''; urlCache[url] = URL.createObjectURL(b); return urlCache[url]; };

  /* Reducción de fotos en el navegador (máximo 1600 px de lado, JPEG 82 %) */
  S.shrink = function(file, max){ return new Promise(res => { const img = new Image(); const u = URL.createObjectURL(file); img.onload = () => { const k = Math.min(1, (max||1600) / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => { URL.revokeObjectURL(u); res(b || file); }, 'image/jpeg', .82); }; img.onerror = () => res(file); img.src = u; }); };

  /* ── modo demo ─────────────────────────────────────────
     Entra al panel sin pasar por el código de mail, leyendo los datos reales de
     Supabase. Sirve para recorrer el producto sin depender del envío de mails.
     Solo se activa en la máquina de desarrollo o en un preview de Vercel: en un
     dominio de verdad queda muerto. Se prende con ?demo=1 y se apaga con ?demo=0. */
  const DEMO = (() => {
    try {
      const h = location.hostname;
      if (!(h === 'localhost' || h === '127.0.0.1' || /^192\.168\./.test(h) || /\.vercel\.app$/.test(h))) return false;
      const q = new URLSearchParams(location.search).get('demo');
      if (q === '1') sessionStorage.setItem('bp_demo', '1');
      if (q === '0') sessionStorage.removeItem('bp_demo');
      return sessionStorage.getItem('bp_demo') === '1';
    } catch (e) { return false; }
  })();
  S.demo = DEMO;

  /* ── init ─────────────────────────────────────────────── */
  S.init = function(){
    if (S.ready) return S.ready;
    S.ready = (async () => {
      try {
        if (window.bairenReady) {
          const sb = await Promise.race([window.bairenReady, new Promise((_, r) => setTimeout(() => r(new Error('sdk')), 15000))]);
          const probe = await sb.schema('portal').from('publicadores').select('id').limit(1);
          if (!probe.error) { S.mode = 'supabase'; S.sb = sb; const { data } = await sb.auth.getUser(); S.session = data && data.user ? { id: data.user.id, email: data.user.email } : null; sb.auth.onAuthStateChange((_, sess) => { if (DEMO) return; S.session = sess && sess.user ? { id: sess.user.id, email: sess.user.email } : null; if (window.BP && BP.applySession) BP.applySession(S.session, S.mode); }); }
        }
      } catch (e) { /* modo local */ }
      if (DEMO) {
        /* Sesión de mentira: alcanza para ver el panel. Todo lo que se lee es real;
           lo que se intente guardar lo va a rechazar la política por fila de Supabase,
           que es justamente lo que tiene que pasar. */
        S.session = { id: 'demo', email: 'demo@bairen.local', demo: true };
      }
      if (S.mode === 'local' && !DEMO) S.session = L.user.get(null);
      if (window.BP && BP.applySession) BP.applySession(S.session, S.mode);
      return S.mode;
    })();
    return S.ready;
  };
  S.requireSession = function(volver){ if (!S.session) { location.href = 'ingresar.html?volver=' + encodeURIComponent(volver || location.pathname.split('/').pop() + location.search); return false; } return true; };

  /* ── auth ─────────────────────────────────────────────── */
  S.sendCode = async function(email){
    email = (email||'').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok:false, msg:'Revisá el mail.' };
    if (S.mode === 'supabase') { const { error } = await S.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); return error ? { ok:false, msg: error.message } : { ok:true, msg:'Te mandamos un código de seis dígitos a ' + email + '. Si no llega, revisá spam.' }; }
    const code = String(Math.floor(100000 + Math.random() * 900000)); L.code.set({ email, code, t: Date.now() });
    return { ok:true, msg:'Modo local: tu código es ' + code + '. Con Supabase conectado llega por mail.', code };
  };
  S.verifyCode = async function(email, code){
    email = (email||'').trim().toLowerCase(); code = (code||'').trim();
    if (S.mode === 'supabase') { const { data, error } = await S.sb.auth.verifyOtp({ email, token: code, type: 'email' }); if (error) return { ok:false, msg: error.message }; S.session = { id: data.user.id, email: data.user.email }; return { ok:true }; }
    const c = L.code.get(null); if (!c || c.email !== email || c.code !== code) return { ok:false, msg:'Código incorrecto.' };
    S.session = { id: 'local-' + slugify(email), email }; L.user.set(S.session); if (window.BP && BP.applySession) BP.applySession(S.session, S.mode); return { ok:true };
  };
  S.signOut = async function(){ if (S.mode === 'supabase') await S.sb.auth.signOut(); S.session = null; L.user.set(null); if (window.BP && BP.applySession) BP.applySession(null, S.mode); };

  /* ── publicador ───────────────────────────────────────── */
  S.getMyPublicador = async function(){
    if (DEMO && S.mode === 'supabase') {
      const { data } = await S.sb.schema('portal').from('publicadores').select('*').eq('slug', 'maxim-rentals').maybeSingle();
      return data || null;
    }
    if (!S.session) return null;
    if (S.mode === 'supabase') {
      /* Modelo nuevo (migración 01): la cuenta es una persona, y la persona es miembro de un publicador.
         Si la migración todavía no corrió, la consulta falla y se cae al modelo viejo (auth_user_id). */
      try {
        const { data: m, error } = await S.sb.schema('portal').from('membresias')
          .select('rol, publicadores(*), personas!inner(auth_user_id)')
          .eq('personas.auth_user_id', S.session.id).is('hasta', null).order('desde').limit(1).maybeSingle();
        if (!error && m && m.publicadores) return m.publicadores;
      } catch (e) { /* sin migración: seguimos */ }
      const { data } = await S.sb.schema('portal').from('publicadores').select('*').eq('auth_user_id', S.session.id).maybeSingle(); return data || null;
    }
    return L.pubs.get([]).find(p => p.auth_user_id === S.session.id) || null;
  };
  /* La persona detrás de la cuenta (modelo nuevo). null si no hay migración o no se registró. */
  S.getMyPersona = async function(){
    if (!S.session || S.mode !== 'supabase' || DEMO) return null;
    try { const { data, error } = await S.sb.schema('portal').from('personas').select('*').eq('auth_user_id', S.session.id).maybeSingle(); return error ? null : (data || null); }
    catch (e) { return null; }
  };
  /* Asegura persona + membresía de titular para un publicador recién guardado. Tolerante: si no hay migración, no hace nada. */
  S.vincularTitular = async function(pub, datos){
    if (!S.session || S.mode !== 'supabase' || !pub || !pub.id) return null;
    try {
      const mat = (datos && datos.matricula) ? String(datos.matricula) : (pub.matricula || '');
      const persona = {
        auth_user_id: S.session.id,
        nombre: (datos && datos.responsable) || pub.responsable || pub.nombre,
        email: pub.email || S.session.email, telefono: pub.telefono || null, whatsapp: pub.whatsapp || null,
        matricula: (mat.replace(/\D/g, '') || null), colegio: mat ? (/cucicba/i.test(mat) ? 'CUCICBA' : (pub.colegio || null)) : null,
      };
      const { data: per, error } = await S.sb.schema('portal').from('personas').upsert(persona, { onConflict: 'auth_user_id' }).select().single();
      if (error || !per) return null;
      const { data: ya } = await S.sb.schema('portal').from('membresias').select('id').eq('persona_id', per.id).eq('publicador_id', pub.id).is('hasta', null).maybeSingle();
      if (!ya) await S.sb.schema('portal').from('membresias').insert({ persona_id: per.id, publicador_id: pub.id, rol: 'titular' });
      return per;
    } catch (e) { return null; }
  };
  S.savePublicador = async function(p){
    if (!S.session) throw new Error('sin sesión');
    const rec = Object.assign({ tipo:'dueno', verificado:false, zonas:[], badge: p.tipo === 'dueno' ? 'Dueño verificado' : p.tipo === 'desarrolladora' ? 'Venta directa' : 'Corredor inmobiliario matriculado' }, p, { auth_user_id: S.session.id, email: p.email || S.session.email, slug: p.slug || slugify(p.nombre) + '-' + (S.session.id||'').slice(-4), updated_at: now() });
    if (S.mode === 'supabase') { const { data, error } = await S.sb.schema('portal').from('publicadores').upsert(rec, { onConflict: 'auth_user_id' }).select().single(); if (error) throw error; await S.vincularTitular(data, p); return data; }
    S.track('publicador_alta', { publicador_id: rec.id || null, datos: { tipo: rec.tipo } });
    const all = L.pubs.get([]); const i = all.findIndex(x => x.auth_user_id === S.session.id); if (i > -1) { rec.id = all[i].id; rec.created_at = all[i].created_at; rec.verificado = all[i].verificado; all[i] = Object.assign(all[i], rec); } else { rec.id = uid(); rec.created_at = now(); all.push(rec); } L.pubs.set(all); return rec;
  };
  S.uploadDoc = async function(file, pubId, tipo){
    if (S.mode === 'supabase') { const path = pubId + '/' + tipo + '-' + Date.now() + '.' + (file.name.split('.').pop() || 'jpg'); const { error } = await S.sb.storage.from('portal-docs').upload(path, file, { upsert: true }); if (error) throw error; return path; }
    return 'local:' + file.name;
  };
  S.requestVerificacion = async function(pubId, tipo, docPath){
    const rec = { publicador_id: pubId, tipo, resultado: 'pendiente', nota: docPath ? 'Documento: ' + docPath : null, created_at: now() };
    if (S.mode === 'supabase') { const { error } = await S.sb.schema('portal').from('verificaciones').insert(rec); if (error) throw error; return; }
    const all = L.verif.get([]); rec.id = uid(); all.push(rec); L.verif.set(all);
  };

  /* ── avisos ───────────────────────────────────────────── */
  const codigo = (slug, op) => 'BA-' + (slug||'x').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) + (op === 'venta' ? 'V' : op === 'alquiler' ? 'L' : 'M') + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
  S.myAvisos = async function(){
    if (DEMO && S.mode === 'supabase') {
      const pub = await S.getMyPublicador();
      if (!pub) return [];
      const { data } = await S.sb.schema('portal').from('avisos').select('*, fotos(url, orden)').eq('publicador_id', pub.id).order('updated_at', { ascending:false });
      return data || [];
    }
    const pub = await S.getMyPublicador(); if (!pub) return [];
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('avisos').select('*, fotos(url, orden)').eq('publicador_id', pub.id).order('updated_at', { ascending:false }); return data || []; }
    return L.avisos.get([]).filter(a => a.publicador_id === pub.id).sort((a,b) => (b.updated_at||'').localeCompare(a.updated_at||''));
  };
  S.getAviso = async function(id){
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('avisos').select('*, fotos(url, orden)').eq('id', id).maybeSingle(); return data || null; }
    return L.avisos.get([]).find(a => a.id === id) || null;
  };
  S.saveAviso = async function(a){
    const pub = await S.getMyPublicador(); if (!pub) throw new Error('Completá tu perfil de publicador primero.');
    const rec = Object.assign({ estado: 'disponible', estado_curacion: 'borrador', moneda: 'USD', ciudad: a.zona === 'GBA Norte' ? 'Zona Norte' : 'Capital Federal', tipo: 'Departamento', mostrar_direccion: 'aproximada' }, a, { publicador_id: pub.id, updated_at: now() });
    if (!rec.slug) rec.slug = slugify((rec.direccion||'') + ' ' + (rec.unidad||'') + ' ' + (rec.barrio||''));
    if (!rec.codigo) rec.codigo = codigo(rec.slug, rec.operacion);
    const fotos = rec.fotos || []; delete rec.fotos;
    if (S.mode === 'supabase') {
      const q = S.sb.schema('portal').from('avisos'); let res;
      if (rec.id) res = await q.update(rec).eq('id', rec.id).select().single(); else res = await q.insert(rec).select().single();
      if (res.error) throw res.error; const saved = res.data;
      if (fotos.length) { await S.sb.schema('portal').from('fotos').delete().eq('aviso_id', saved.id); const rows = fotos.map((f, i) => ({ aviso_id: saved.id, url: f.url, orden: i })); const { error } = await S.sb.schema('portal').from('fotos').insert(rows); if (error) throw error; }
      saved.fotos = fotos.map((f, i) => ({ url: f.url, orden: i })); return saved;
    }
    S.track(rec.estado_curacion === 'en_revision' ? 'aviso_enviado' : 'aviso_creado', { aviso_id: rec.id || null, publicador_id: pub.id, datos: { operacion: rec.operacion, zona: rec.zona } });
    const all = L.avisos.get([]); const i = all.findIndex(x => x.id === rec.id); rec.fotos = fotos.map((f, i2) => ({ url: f.url, orden: i2 }));
    if (i > -1) { rec.created_at = all[i].created_at; all[i] = rec; } else { rec.id = rec.id || uid(); rec.created_at = now(); all.push(rec); } L.avisos.set(all); return rec;
  };
  S.uploadFoto = async function(file, avisoKey, i){
    const blob = await S.shrink(file, 1600);
    if (S.mode === 'supabase') { const path = avisoKey + '/' + Date.now() + '-' + i + '.jpg'; const { error } = await S.sb.storage.from('portal-fotos').upload(path, blob, { contentType: 'image/jpeg', upsert: true }); if (error) throw error; return S.sb.storage.from('portal-fotos').getPublicUrl(path).data.publicUrl; }
    const key = avisoKey + '-' + Date.now() + '-' + i; await idb.put(key, blob); return 'idb:' + key;
  };
  S.setEstado = async function(id, estado_curacion, motivo, extra){
    const patch = Object.assign({ estado_curacion, motivo_rechazo: motivo || null, updated_at: now() }, extra || {}); if (estado_curacion === 'publicado') patch.publicado_en = now();
    S.track(estado_curacion === 'publicado' ? 'aviso_aprobado' : estado_curacion === 'rechazado' ? 'aviso_rechazado' : 'aviso_estado', { aviso_id: id, datos: { estado_curacion, motivo: motivo || null } });
    if (S.mode === 'supabase') { const { error } = await S.sb.schema('portal').from('avisos').update(patch).eq('id', id); if (error) throw error; if (estado_curacion === 'publicado' && !(extra && extra.estado)) S.notify('aprobado', { aviso_id: id }); else if (estado_curacion === 'rechazado') S.notify('rechazado', { aviso_id: id, datos: { motivo } }); else if (estado_curacion === 'borrador' && motivo) S.notify('cambios', { aviso_id: id, datos: { motivo } }); return; }
    const all = L.avisos.get([]); const a = all.find(x => x.id === id); if (a) Object.assign(a, patch); L.avisos.set(all);
  };
  S.publishedAvisos = async function(){
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('avisos').select('id,codigo,slug,publicador_id,operacion,tipo,titulo,direccion,unidad,barrio,zona,ciudad,mostrar_direccion,precio,moneda,expensas,m2_total,m2_cubierto,ambientes,dormitorios,banos,cocheras,antiguedad,orientacion,disposicion,piso,amoblado,amenities,caracteristicas,descripcion,descripcion_en,descripcion_pt,video_url,video_tipo,plazo,estado,estado_curacion,destacado_hasta,publicado_en,created_at,emprendimiento,etapa,entrega, fotos(url, orden), publicadores(id,slug,tipo,nombre,responsable,matricula,colegio,badge,verificado,descripcion,telefono,whatsapp,email,zonas,created_at)').eq('estado_curacion', 'publicado').order('publicado_en', { ascending:false }); return (data || []).map(a => { a.publicador = a.publicadores; delete a.publicadores; return a; }); }
    const pubs = L.pubs.get([]); return L.avisos.get([]).filter(a => a.estado_curacion === 'publicado').map(a => Object.assign({}, a, { publicador: pubs.find(p => p.id === a.publicador_id) || null }));
  };

  /* ── 4.4 Registro de eventos: una sola puerta para todo lo que queremos medir ── */
  const esUUID = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  const LE = LS('bp_eventos');
  S.EVENTOS = ['aviso_creado','aviso_enviado','aviso_aprobado','aviso_rechazado','consulta','vista_ficha','publicador_alta','publicador_verificado','importacion','favorito','alerta','denuncia'];
  S.track = async function(evento, campos){
    const rec = Object.assign({ evento, creado_en: now() }, campos || {});
    if (rec.aviso_id && !esUUID(rec.aviso_id)) { rec.aviso_ref = String(rec.aviso_id); delete rec.aviso_id; }
    if (rec.publicador_id && !esUUID(rec.publicador_id)) { rec.publicador_ref = String(rec.publicador_id); delete rec.publicador_id; }
    const local = LE.get([]); local.push(rec); if (local.length > 500) local.splice(0, local.length - 500); LE.set(local);
    if (S.mode === 'supabase') {
      const fila = { evento, aviso_ref: rec.aviso_ref || (rec.aviso_id ? String(rec.aviso_id) : null), publicador_ref: rec.publicador_ref || (rec.publicador_id ? String(rec.publicador_id) : null), usuario_id: S.session ? S.session.id : null, canal: rec.canal || null, datos: rec.datos || null };
      try { await S.sb.schema('portal').from('eventos').insert(fila); } catch (e) { console.warn('evento no registrado', e); }
    }
    return rec;
  };
  S.eventos = () => LE.get([]);

  /* ── consultas, vistas ────────────────────────────────── */
  S.addConsulta = async function(c){
    const rec = Object.assign({ canal: 'formulario', created_at: now() }, c);
    if (S.mode === 'supabase') {
      const fila = { publicador_id: esUUID(c.publicador_id) ? c.publicador_id : null, publicador_ref: esUUID(c.publicador_id) ? null : String(c.publicador_id || ''), nombre: c.nombre || '', email: c.email || '', telefono: c.telefono || null, mensaje: c.mensaje || null, canal: rec.canal, acepto_tyc: !!c.acepto_tyc, enviada_a: c.enviada_a || null };
      if (esUUID(c.aviso_id)) fila.aviso_id = c.aviso_id; else fila.aviso_ref = String(c.aviso_id || '');
      if (c.visita_deseada) fila.visita_deseada = c.visita_deseada;
      let { error } = await S.sb.schema('portal').from('consultas').insert(fila);
      if (error && (fila.visita_deseada || fila.canal === 'visita')) { /* sin migración 02: se guarda como consulta común y la fecha va en el mensaje */ fila.mensaje = ((fila.mensaje || '') + ' [Pide visita: ' + new Date(c.visita_deseada).toLocaleString('es-AR') + ']').trim(); delete fila.visita_deseada; fila.canal = 'formulario'; ({ error } = await S.sb.schema('portal').from('consultas').insert(fila)); }
      if (error) console.warn('consulta no guardada', error);
      if (esUUID(c.aviso_id)) S.notify('consulta', { aviso_id: c.aviso_id, datos: { nombre: c.nombre, email: c.email, telefono: c.telefono, mensaje: c.mensaje } });
    }
    const all = L.consultas.get([]); rec.id = uid(); all.push(rec); L.consultas.set(all);
    S.track('consulta', { aviso_id: c.aviso_id, publicador_id: c.publicador_id, canal: rec.canal });
    return rec;
  };
  S.consultasRecibidas = async function(pubId){
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('consultas').select('*').eq('publicador_id', pubId).order('created_at', { ascending:false }); return data || []; }
    return L.consultas.get([]).filter(c => c.publicador_id === pubId).reverse();
  };
  S.misConsultas = function(){ const e = S.session && S.session.email; return L.consultas.get([]).filter(c => !e || (c.email||'').toLowerCase() === e.toLowerCase()).reverse(); };
  S.addVista = async function(avisoId){
    const v = L.vistas.get({}); v[avisoId] = (v[avisoId]||0) + 1; L.vistas.set(v);
    if (S.mode === 'supabase') { const fila = esUUID(avisoId) ? { aviso_id: avisoId } : { aviso_ref: String(avisoId) }; S.sb.schema('portal').from('vistas').insert(fila).then(() => {}, () => {}); }
    S.track('vista_ficha', { aviso_id: avisoId });
    return S.mode === 'supabase' ? (await S.vistasDe([avisoId]))[String(avisoId)] || v[avisoId] : v[avisoId];
  };
  /* 4.3 Vistas reales del servidor, no las de este navegador */
  S.vistasDe = async function(ids){
    if (S.mode !== 'supabase' || !ids || !ids.length) return {};
    try { const { data } = await S.sb.schema('portal').from('vistas_por_aviso').select('ref,vistas').in('ref', ids.map(String)); const r = {}; (data||[]).forEach(x => r[x.ref] = x.vistas); return r; } catch (e) { return {}; }
  };
  S.consultasDe = async function(ids){
    if (S.mode !== 'supabase' || !ids || !ids.length) return {};
    try { const { data } = await S.sb.schema('portal').from('consultas_por_aviso').select('ref,consultas').in('ref', ids.map(String)); const r = {}; (data||[]).forEach(x => r[x.ref] = x.consultas); return r; } catch (e) { return {}; }
  };
  S.vistas = id => (L.vistas.get({})[id] || 0);

  /* ── visitas y reservas, propietario ─────────────────── */
  const LV = LS('bp_visitas_db');
  S.addVisita = async function(aviso_id, v){
    const pub = await S.getMyPublicador(); if (!pub) throw new Error('sin publicador');
    const rec = Object.assign({ tipo: 'visita', fecha: now(), nota: '' }, v, { aviso_id, publicador_id: pub.id, created_at: now() });
    if (S.mode === 'supabase') { let { data, error } = await S.sb.schema('portal').from('visitas_reservas').insert(rec).select().single(); if (error && (rec.consulta_id || rec.estado)) { delete rec.consulta_id; delete rec.estado; ({ data, error } = await S.sb.schema('portal').from('visitas_reservas').insert(rec).select().single()); } if (error) throw error; return data; }
    const all = LV.get([]); rec.id = uid(); all.push(rec); LV.set(all); return rec;
  };
  /* Todas las visitas de varios avisos en UNA consulta, agrupadas por aviso. El panel
     antes pedía una por aviso: 38 consultas en serie, quince segundos de espera. */
  S.visitasDe = async function(ids){
    const r = {}; (ids||[]).forEach(i => r[i] = []);
    if (!ids || !ids.length) return r;
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('visitas_reservas').select('*').in('aviso_id', ids).order('fecha', { ascending:false }); (data||[]).forEach(v => { (r[v.aviso_id] = r[v.aviso_id] || []).push(v); }); return r; }
    LV.get([]).forEach(v => { if (r[v.aviso_id]) r[v.aviso_id].push(v); }); Object.values(r).forEach(l => l.sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''))); return r;
  };
  S.visitas = async function(aviso_id){
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('visitas_reservas').select('*').eq('aviso_id', aviso_id).order('fecha', { ascending:false }); return data || []; }
    return LV.get([]).filter(v => v.aviso_id === aviso_id).sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));
  };
  S.avisosDePropietario = async function(){
    if (!S.session) return [];
    const e = S.session.email.toLowerCase();
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('avisos').select('*, fotos(url, orden), publicadores(nombre, tipo, matricula, badge)').ilike('propietario_email', e); return (data || []).map(a => { a.publicador = a.publicadores; delete a.publicadores; return a; }); }
    const pubs = L.pubs.get([]); return L.avisos.get([]).filter(a => (a.propietario_email||'').toLowerCase() === e).map(a => Object.assign({}, a, { publicador: pubs.find(p => p.id === a.publicador_id) || null }));
  };

  /* ── mails al publicador (función de servidor; en modo local no hay envío) ── */
  S.notify = async function(tipo, payload){
    if (S.mode !== 'supabase') return { skipped: true };
    try { const r = await fetch('/api/portal-notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ tipo }, payload)) }); return await r.json().catch(() => ({ ok: r.ok })); } catch (e) { return { error: String(e) }; }
  };

  /* ── 4.5 Lo que hoy vive en el navegador y tiene tabla propia ── */
  S.addDenuncia = async function(avisoId, motivo, detalle){
    S.track('denuncia', { aviso_id: avisoId, datos: { motivo } });
    if (S.mode !== 'supabase' || !esUUID(avisoId)) return { local: true };
    try { const { error } = await S.sb.schema('portal').from('denuncias').insert({ aviso_id: avisoId, motivo, detalle: detalle || null }); if (error) throw error; return { ok: true }; } catch (e) { console.warn('denuncia no guardada', e); return { error: String(e) }; }
  };
  S.syncFavorito = async function(avisoId, activo){
    S.track('favorito', { aviso_id: avisoId, datos: { activo } });
    if (S.mode !== 'supabase' || !S.session || !esUUID(avisoId)) return;
    try { if (activo) await S.sb.schema('portal').from('favoritos').upsert({ usuario_id: S.session.id, aviso_id: avisoId }); else await S.sb.schema('portal').from('favoritos').delete().eq('usuario_id', S.session.id).eq('aviso_id', avisoId); } catch (e) { console.warn('favorito no sincronizado', e); }
  };
  S.syncAlerta = async function(alerta){
    S.track('alerta', { aviso_id: alerta.avisoId || null, datos: { tipo: alerta.tipo || 'busqueda' } });
    if (S.mode !== 'supabase' || !S.session) return;
    const fila = { usuario_id: S.session.id, tipo: alerta.tipo === 'precio' ? 'precio' : 'busqueda', filtros: alerta.filtros || null, frecuencia: 'diaria' };
    if (alerta.avisoId && esUUID(alerta.avisoId)) fila.aviso_id = alerta.avisoId;
    try { await S.sb.schema('portal').from('alertas').insert(fila); } catch (e) { console.warn('alerta no sincronizada', e); }
  };

  /* ── curación ─────────────────────────────────────────── */
  S.isCurador = async function(){
    if (!S.session) return false;
    if (DEMO) return true; /* modo demo: también se recorre la curación */
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('curadores').select('email').eq('email', S.session.email).maybeSingle(); return !!data; }
    return true; /* modo local: cualquiera con sesión, para probar */
  };
  S.colaCuracion = async function(){
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('avisos').select('*, fotos(url, orden), publicadores(*)').in('estado_curacion', ['en_revision']).order('updated_at', { ascending:true }); return (data || []).map(a => { a.publicador = a.publicadores; delete a.publicadores; return a; }); }
    const pubs = L.pubs.get([]); return L.avisos.get([]).filter(a => a.estado_curacion === 'en_revision').map(a => Object.assign({}, a, { publicador: pubs.find(p => p.id === a.publicador_id) || null }));
  };
  /* La persona titular de un publicador (migración 01). null si no hay migración o no tiene titular. */
  S.titularDe = async function(pubId){
    if (S.mode !== 'supabase') return null;
    try { const { data, error } = await S.sb.schema('portal').from('membresias').select('personas(*)').eq('publicador_id', pubId).eq('rol', 'titular').is('hasta', null).order('desde').limit(1).maybeSingle(); if (!error && data && data.personas) return data.personas; } catch (e) { /* sigue */ }
    /* Sin sesión con permiso (o en demo), lo público alcanza: la vista publicador_publico. */
    try { const { data } = await S.sb.schema('portal').from('publicador_publico').select('titular_id,titular_nombre,titular_colegio,titular_matricula,titular_matricula_verificada').eq('id', pubId).maybeSingle();
      if (data && data.titular_id) return { id: data.titular_id, nombre: data.titular_nombre, apellido: '', colegio: data.titular_colegio, matricula: data.titular_matricula, matricula_verificada_en: data.titular_matricula_verificada ? 'sí' : null, publico: true };
    } catch (e) { /* nada */ }
    return null;
  };
  /* El curador deja constancia de que comprobó la matrícula en el registro público. */
  S.marcarMatricula = async function(personaId, ok){
    if (S.mode !== 'supabase') return;
    const { error } = await S.sb.schema('portal').from('personas').update({ matricula_verificada_en: ok ? now() : null, matricula_verificada_por: ok ? ((S.session && S.session.email) || 'curador') : null }).eq('id', personaId);
    if (error) throw error;
  };
  /* Qué dijo el que visitó. Lo carga el corredor; lo lee el propietario. Sin migración 02, va en la nota. */
  S.feedbackVisita = async function(id, feedback){
    if (S.mode === 'supabase') {
      let { error } = await S.sb.schema('portal').from('visitas_reservas').update({ feedback, estado: 'realizada' }).eq('id', id);
      if (error) { const { data: v } = await S.sb.schema('portal').from('visitas_reservas').select('nota').eq('id', id).maybeSingle(); ({ error } = await S.sb.schema('portal').from('visitas_reservas').update({ nota: ((v && v.nota) ? v.nota + ' · ' : '') + 'Feedback: ' + feedback }).eq('id', id)); }
      if (error) throw error; return;
    }
    const all = LV.get([]); const v = all.find(x => x.id === id); if (v) { v.feedback = feedback; v.estado = 'realizada'; LV.set(all); }
  };
  /* ── funciones de servidor (Vercel /api): traducción y producción de fotos ── */
  S.tokenAcceso = async function(){ if (S.mode !== 'supabase' || !S.sb) return null; try { const { data } = await S.sb.auth.getSession(); return data && data.session ? data.session.access_token : null; } catch (e) { return null; } };
  async function apiPortal(ruta, body){
    const token = await S.tokenAcceso(); if (!token) throw new Error(DEMO ? 'En modo demo no hay sesión real: esta función necesita una cuenta.' : 'Iniciá sesión para usar esta función.');
    const r = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (r.status === 404) throw new Error('Esta función corre en la web publicada, no en el servidor local.');
    if (r.status === 501) throw new Error(j.msg || 'La función todavía no está configurada.');
    if (!r.ok || !j.ok) throw new Error(j.error || ('Error ' + r.status));
    return j;
  }
  /* Título y descripción al inglés y al portugués. Gratis (MyMemory). Devuelve { en:{titulo,descripcion}, pt:{...} } */
  S.traducir = (titulo, descripcion) => apiPortal('/api/portal-traducir', { titulo, descripcion });
  /* La foto vuelta a sacar con IA (GPT, prompt maestro de Bairen). Devuelve una data URL; el que publica decide si la usa. */
  S.producirFoto = (url, opts) => apiPortal('/api/portal-produccion', Object.assign({ url }, opts || {}));
  /* Sube una data URL como foto del aviso y devuelve su URL pública. */
  S.subirDataUrl = async function(dataUrl, avisoKey, i){ const b = await (await fetch(dataUrl)).blob(); const f = new File([b], 'ia.png', { type: b.type || 'image/png' }); return S.uploadFoto(f, avisoKey, i); };
  S.publicadoresPendientes = async function(){
    if (S.mode === 'supabase') { const { data } = await S.sb.schema('portal').from('publicadores').select('*, verificaciones(*)').eq('verificado', false); return data || []; }
    const v = L.verif.get([]); return L.pubs.get([]).filter(p => !p.verificado).map(p => Object.assign({}, p, { verificaciones: v.filter(x => x.publicador_id === p.id) }));
  };
  S.verificarPublicador = async function(id, ok, nota){
    if (S.mode === 'supabase') { const { error } = await S.sb.schema('portal').from('publicadores').update({ verificado: ok, verificado_en: ok ? now() : null }).eq('id', id); if (error) throw error; await S.sb.schema('portal').from('verificaciones').update({ resultado: ok ? 'aprobada' : 'rechazada', nota: nota || null }).eq('publicador_id', id).eq('resultado', 'pendiente');
      /* política de privacidad: los documentos se borran al resolver; queda solo el resultado */
      try {
        const { data: files, error: le } = await S.sb.storage.from('portal-docs').list(id);
        if (le) throw le;
        if (files && files.length) {
          const { data: borrados, error: de } = await S.sb.storage.from('portal-docs').remove(files.map(f => id + '/' + f.name));
          if (de) throw de;
          if (!borrados || borrados.length !== files.length) throw new Error('se borraron ' + ((borrados||[]).length) + ' de ' + files.length);
        }
      } catch (e) {
        console.error('[bairen] los documentos de verificación NO se borraron:', e);
        if (window.BP && BP.toast) BP.toast('Atención: los documentos de verificación no se pudieron borrar. Revisalo antes de seguir.');
      }
      S.notify(ok ? 'verificado' : 'verificacion_rechazada', { publicador_id: id, datos: { nota } });
      return; }
    const all = L.pubs.get([]); const p = all.find(x => x.id === id); if (p) { p.verificado = ok; p.verificado_en = ok ? now() : null; } L.pubs.set(all);
    const v = L.verif.get([]); v.forEach(x => { if (x.publicador_id === id && x.resultado === 'pendiente') { x.resultado = ok ? 'aprobada' : 'rechazada'; x.nota = nota || null; } }); L.verif.set(v);
  };

  window.BPStore = S;
})();
