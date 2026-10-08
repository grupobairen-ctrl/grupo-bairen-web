/**
 * Vercel Function — avisos por mail del portal BAIREN
 *
 * POST /api/portal-notify  { tipo, aviso_id?, publicador_id?, datos? }
 *
 * Quién puede pedir cada tipo (8/10/2026; antes cualquiera, sin sesión, podía hacerle llegar a un publicador real
 * un "aprobado" o un "rechazado" con el texto que quisiera):
 *   consulta                 cualquiera, sin sesión. Solo si el aviso existe y está publicado. Con la service key, el
 *                            mail sale de la consulta guardada en portal.consultas (la de los últimos 15 minutos para
 *                            ese aviso y ese mail), no de lo que mande el navegador, y cada consulta da un solo mail
 *                            (se anota en portal.eventos 'consulta_notificada'); tope de 10 por aviso por hora.
 *                            Sin service key, como antes pero con los textos recortados. Además, 5 por IP cada 10 minutos.
 *   aprobado | rechazado | cambios      sesión de curador (Authorization: Bearer <access_token>, validado en
 *   verificado | verificacion_rechazada /auth/v1/user y con el mail en portal.curadores) o la clave del equipo
 *                                       (x-portal-key o x-bairen-key = PORTAL_NOTIFY_KEY).
 *   revision                 sesión del publicador dueño del aviso (o de un miembro vigente de ese publicador), con
 *                            el aviso en 'en_revision'. Le avisa AL EQUIPO (PORTAL_RESUMEN_A, o contacto@bairengroup.com)
 *                            "Entró un aviso a revisión", con título, publicador y link a curación. Uno por aviso por
 *                            hora. Necesita la service key (para comprobar de quién es el aviso).
 *
 * El destinatario NUNCA viene del cliente: sale de la base (el publicador del aviso, el publicador indicado, o el
 * equipo). Envía con Resend por HTTP (sin dependencias).
 *
 * Variables de entorno en Vercel:
 *   RESEND_API_KEY     clave de https://resend.com. Sin ella responde 501 {configured:false} y la web sigue con el mailto.
 *   PORTAL_MAIL_FROM   remitente, ej. "BAIREN <avisos@bairengroup.com>" (dominio verificado en Resend)
 *   PORTAL_SUPABASE_SERVICE_KEY  para leer la consulta guardada, los avisos que no están publicados y de quién es cada
 *                      aviso. Sin ella: consulta va por el camino viejo, curación lee con el token del curador y
 *                      revision responde 503.
 *   PORTAL_RESUMEN_A   a quién le llega "Entró un aviso a revisión" (default contacto@bairengroup.com)
 *   PORTAL_NOTIFY_KEY  clave del equipo, para disparar los tipos de curación a mano.
 *   PORTAL_SITE, PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, PORTAL_ORIGENES   ver api/_portal/admin.js
 */
const A = require('./_portal/admin');
const SITE = A.SITE;
const TIPOS = ['consulta', 'aprobado', 'rechazado', 'cambios', 'verificado', 'verificacion_rechazada', 'revision'];
const DE_CURADOR = ['aprobado', 'rechazado', 'cambios', 'verificado', 'verificacion_rechazada'];
const POR_AVISO = ['consulta', 'aprobado', 'rechazado', 'cambios', 'revision'];
const EQUIPO = () => process.env.PORTAL_RESUMEN_A || 'contacto@bairengroup.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Límite por instancia (cada instancia de Vercel tiene el suyo): frena ráfagas de un mismo cliente. Lo firme
// para 'consulta' está en la base (una consulta guardada = un mail, tope por aviso).
const hits = new Map();
const limite = (clave, max, ventanaMs) => { const now = Date.now(); const h = (hits.get(clave) || []).filter(t => now - t < ventanaMs); h.push(now); hits.set(clave, h); if (hits.size > 5000) hits.clear(); return h.length > max; };
const esc = A.esc;
const corta = (v, n) => String(v == null ? '' : v).slice(0, n);
const esMail = v => typeof v === 'string' && /^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$/i.test(v);
const hace = ms => new Date(Date.now() - ms).toISOString();

/* Lectura del esquema portal: con la service key si está; si no, con la clave pública y el token de la sesión (si
   hay), que deja ver lo que RLS le deja ver a esa cuenta. */
async function leer(path, token) {
  if (A.tieneServiceKey()) return A.get(path);
  const r = await fetch(`${A.PORTAL_URL}/rest/v1/${path}`, { headers: { apikey: A.PORTAL_ANON, Authorization: `Bearer ${token || A.PORTAL_ANON}`, 'Accept-Profile': 'portal' } });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return r.json();
}
const anotar = (evento, aviso, datos) => A.post('eventos', { evento, aviso_ref: aviso, datos }, { prefer: 'return=minimal' }).catch(() => null);
const tituloDe = a => a ? (a.titulo || `${a.direccion}${a.unidad ? ' · ' + a.unidad : ''}`) : '';

/* Cabecera navy, cuerpo crema y pie legal, con los botones en dorado: igual que siempre. */
const wrap = inner => {
  const cuerpo = inner
    .replace(/<h2 style="[^"]*">/g, '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-weight:normal;font-size:24px;line-height:1.3;color:#131D2D;margin:0 0 14px">')
    .replace(/<a href="([^"]*)" style="[^"]*">/g, '<a href="$1" style="display:inline-block;background:#131D2D;color:#FBFAF6;text-decoration:none;padding:12px 22px;font-size:12px;letter-spacing:2px;text-transform:uppercase;border:1px solid #C2A968">');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E6;padding:32px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td style="background:#131D2D;padding:26px 36px;border-bottom:1px solid #C2A968;text-align:center"><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:6px;color:#FBFAF6">BAIREN</div><div style="font-size:10px;letter-spacing:3px;color:#C2A968;margin-top:6px">PROPIEDADES SELECCIONADAS</div></td></tr><tr><td style="background:#FBFAF6;padding:34px 36px 30px;color:#1A2538;font-size:15px;line-height:1.6">${cuerpo}</td></tr><tr><td style="background:#F4F0E6;padding:18px 36px;text-align:center;font-size:11px;line-height:1.6;letter-spacing:.5px;color:#6B7589">BAIREN es un portal de propiedades y no ejerce el corretaje inmobiliario. Cada propiedad es publicada por su titular, por un corredor matriculado o por una desarrolladora, responsable de la operación.</td></tr></table></td></tr></table>`;
};

async function enviar(to, subject, html, replyTo) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.PORTAL_MAIL_FROM || 'BAIREN <onboarding@resend.dev>', to: [to], subject, html, reply_to: replyTo || undefined }) });
  if (!r.ok) return { status: 502, cuerpo: { error: 'resend ' + r.status, detail: (await r.text()).slice(0, 300) } };
  return { status: 200, cuerpo: { ok: true } };
}

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Portal-Key, X-Bairen-Key');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!A.origenPermitido(req)) return json(403, { error: 'origen' });
  if (req.method !== 'POST') return json(405, { error: 'POST' });
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.RESEND_API_KEY) return json(501, { configured: false });

  let body = req.body;
  if (typeof body === 'string') { if (body.length > 20000) return json(413, { error: 'cuerpo' }); try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body && typeof body === 'object' ? body : {};
  const tipo = String(body.tipo || ''); if (TIPOS.indexOf(tipo) === -1) return json(400, { error: 'tipo' });
  const datos = body.datos && typeof body.datos === 'object' ? body.datos : {};
  const avisoId = body.aviso_id == null ? '' : String(body.aviso_id);
  if (POR_AVISO.indexOf(tipo) > -1 && !UUID_RE.test(avisoId)) return json(400, { error: 'aviso_id' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (tipo === 'consulta' ? limite('c|' + ip, 5, 10 * 60 * 1000) : limite('o|' + ip, 30, 60 * 1000)) return json(429, { error: 'Demasiados envíos, probá en unos minutos.' });

  // Quién llama. La clave del equipo vale como curador; el token se valida en Auth.
  const k = process.env.PORTAL_NOTIFY_KEY;
  const conClave = !!k && (req.headers['x-portal-key'] === k || req.headers['x-bairen-key'] === k);
  const usuario = tipo === 'consulta' ? null : await A.usuarioDeSesion(req);
  if (DE_CURADOR.indexOf(tipo) > -1 && !conClave && !(usuario && await A.curadorDeSesion(req, usuario))) return json(403, { error: 'solo el equipo de curación' });
  if (tipo === 'revision' && !usuario) return json(401, { error: 'sin sesión' });

  try {
    /* ── revisión: al equipo ── */
    if (tipo === 'revision') {
      if (!A.tieneServiceKey()) return json(503, { configured: false, falta: 'PORTAL_SUPABASE_SERVICE_KEY' });
      const a = (await A.get(`avisos?id=eq.${avisoId}&select=id,codigo,titulo,direccion,unidad,barrio,operacion,precio,moneda,estado_curacion,publicador_id,publicadores(id,nombre,slug,auth_user_id)`))[0];
      if (!a) return json(404, { error: 'aviso' });
      const pub = a.publicadores || {};
      let dueno = pub.auth_user_id === usuario.id;
      if (!dueno) { const m = await A.get(`membresias?select=id,personas!inner(auth_user_id)&publicador_id=eq.${a.publicador_id}&hasta=is.null&personas.auth_user_id=eq.${usuario.id}&limit=1`).catch(() => []); dueno = Array.isArray(m) && m.length > 0; }
      if (!dueno) return json(403, { error: 'el aviso no es de esta cuenta' });
      if (a.estado_curacion !== 'en_revision') return json(409, { error: 'el aviso no está en revisión' });
      const ya = await A.get(`eventos?select=id&evento=eq.revision_notificada&aviso_ref=eq.${a.id}&creado_en=gte.${encodeURIComponent(hace(3600 * 1000))}&limit=1`).catch(() => []);
      if (Array.isArray(ya) && ya.length) return json(200, { ok: true, omitida: 'ya avisado en la última hora' });
      const titulo = tituloDe(a);
      const html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Entró un aviso a revisión</h2><p><b>${esc(titulo)}</b>${a.barrio ? ', ' + esc(a.barrio) : ''}<br>${esc(a.codigo || '')} · ${esc(a.operacion || '')}</p><p>Publica <b>${esc(pub.nombre || 'sin nombre')}</b>.</p><p><a href="${SITE}curacion" style="color:#1A2538">Abrir curación</a></p>`);
      const r = await enviar(EQUIPO(), `Entró un aviso a revisión: ${corta(titulo, 120)}`, html);
      if (r.status === 200) await anotar('revision_notificada', a.id, { publicador: pub.slug || null });
      return json(r.status, r.cuerpo);
    }

    /* ── el resto le escribe al publicador ── */
    let aviso = null, pub = null;
    const token = usuario && usuario.token;
    if (POR_AVISO.indexOf(tipo) > -1) {
      aviso = (await leer(`avisos?id=eq.${avisoId}&select=id,titulo,direccion,unidad,codigo,publicador_id,estado_curacion`, token))[0] || null;
      if (!aviso) return json(404, { error: 'aviso' });
      if (tipo === 'consulta' && aviso.estado_curacion !== 'publicado') return json(404, { error: 'aviso' });
    }
    // El destinatario nunca viene del cliente cuando hay un aviso de por medio.
    const pubId = aviso ? aviso.publicador_id : String(body.publicador_id || '');
    if (!UUID_RE.test(pubId)) return json(404, { error: 'publicador' });
    pub = (await leer(`publicadores?id=eq.${pubId}&select=id,nombre,email`, token))[0] || null;
    if (!pub || !esMail(pub.email)) return json(404, { error: 'publicador' });
    const titulo = tituloDe(aviso);
    const link = aviso ? `${SITE}propiedad-${encodeURIComponent(aviso.id)}` : `${SITE}panel`;
    let subject, html, replyTo, consultaId = null;

    if (tipo === 'consulta') {
      let c = { nombre: corta(datos.nombre, 120), email: corta(datos.email, 254), telefono: corta(datos.telefono, 40), mensaje: corta(datos.mensaje, 2000), visita_deseada: null };
      if (A.tieneServiceKey()) {
        /* La consulta guardada (la que acaba de insertar BPStore.addConsulta): el mail dice lo que quedó en la base. */
        const filas = await A.get(`consultas?select=*&aviso_id=eq.${aviso.id}&created_at=gte.${encodeURIComponent(hace(15 * 60 * 1000))}&order=created_at.desc&limit=20`);
        const pedido = String(datos.email || '').trim().toLowerCase();
        const fila = filas.find(f => pedido && String(f.email || '').trim().toLowerCase() === pedido) || (!pedido ? filas[0] : null);
        if (!fila) return json(404, { error: 'consulta' });
        const ya = await A.get(`eventos?select=id&evento=eq.consulta_notificada&aviso_ref=eq.${aviso.id}&creado_en=gte.${encodeURIComponent(hace(3600 * 1000))}&limit=20`);
        const notificadas = await A.get(`eventos?select=id&evento=eq.consulta_notificada&aviso_ref=eq.${aviso.id}&datos->>consulta=eq.${fila.id}&limit=1`);
        if (notificadas.length) return json(200, { ok: true, omitida: 'ya avisada' });
        if (ya.length >= 10) return json(429, { error: 'Demasiadas consultas para este aviso en la última hora.' });
        consultaId = fila.id;
        c = { nombre: corta(fila.nombre, 120), email: corta(fila.email, 254), telefono: corta(fila.telefono, 40), mensaje: corta(fila.mensaje, 2000), visita_deseada: fila.visita_deseada || null };
      }
      subject = `Consulta por ${corta(titulo, 120)} (${aviso.codigo || ''}) desde BAIREN`;
      const visita = c.visita_deseada ? `<p>Pide visitar el ${esc(new Date(c.visita_deseada).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }))}.</p>` : '';
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Nueva consulta por ${esc(titulo)}</h2><p><b>${esc(c.nombre)}</b><br>${esc(c.email)}${c.telefono ? ' · ' + esc(c.telefono) : ''}</p>${visita}<p style="background:#F4F0E6;padding:12px;border-radius:8px">${esc(c.mensaje)}</p><p>Respondé vos directamente: BAIREN no interviene en la conversación.</p><p><a href="${link}" style="color:#1A2538">Ver la ficha</a> · <a href="${SITE}panel#interesados" style="color:#1A2538">Ver en tu panel</a></p>`);
      replyTo = esMail(c.email) ? c.email : undefined;
    } else if (tipo === 'aprobado') {
      subject = `Tu aviso ${corta(titulo, 120)} ya está publicado en BAIREN`;
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Publicado</h2><p>${esc(titulo)} pasó la curación y ya se ve en BAIREN con tu nombre como publicador.</p><p><a href="${link}" style="color:#1A2538">Ver la ficha</a></p>`);
    } else if (tipo === 'rechazado' || tipo === 'cambios') {
      subject = tipo === 'rechazado' ? `Tu aviso ${corta(titulo, 120)} no entró en BAIREN` : `Tu aviso ${corta(titulo, 120)} necesita cambios`;
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">${tipo === 'rechazado' ? 'No entró, y te decimos por qué' : 'Hay que ajustar algo'}</h2><p style="background:#F4F0E6;padding:12px;border-radius:8px">${esc(corta(datos.motivo, 2000) || 'Sin detalle')}</p><p><a href="${SITE}panel#avisos" style="color:#1A2538">Abrir en tu panel</a></p>`);
    } else if (tipo === 'verificado') {
      subject = 'Tu cuenta de publicador en BAIREN está verificada';
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Verificado</h2><p>${esc(pub.nombre)} ya figura como publicador verificado. Tus avisos muestran el distintivo en cada ficha.</p><p><a href="${SITE}panel#avisos" style="color:#1A2538">Ir a tu panel</a></p>`);
    } else {
      subject = 'No pudimos verificar tu cuenta de publicador en BAIREN';
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Verificación pendiente</h2><p>${esc(corta(datos.nota, 2000) || 'Revisá los datos y volvé a cargar la documentación desde tu perfil.')}</p><p><a href="${SITE}panel#cuenta" style="color:#1A2538">Ir a mi cuenta</a></p>`);
    }
    const r = await enviar(pub.email, subject, html, replyTo);
    if (r.status === 200 && consultaId) await anotar('consulta_notificada', aviso.id, { consulta: consultaId });
    return json(r.status, r.cuerpo);
  } catch (err) { return json(500, { error: String(err.message || err).slice(0, 300) }); }
};
