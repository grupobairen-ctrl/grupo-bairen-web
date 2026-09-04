/**
 * Vercel Function — avisos por mail del portal BAIREN
 *
 * POST /api/portal-notify  { tipo, aviso_id?, publicador_id?, datos? }
 *   tipo: 'consulta' | 'aprobado' | 'rechazado' | 'cambios' | 'verificado' | 'verificacion_rechazada'
 *
 * El destinatario NUNCA viene del cliente: se busca en Supabase (esquema portal)
 * a partir del aviso o del publicador, así nadie puede usar esto para mandar
 * mails a cualquier dirección. Envía con Resend por HTTP (sin dependencias).
 *
 * Variables de entorno en Vercel:
 *   RESEND_API_KEY     clave de https://resend.com (plan gratis alcanza para empezar)
 *   PORTAL_MAIL_FROM   remitente, ej. "BAIREN <avisos@bairengroup.com>" (dominio verificado en Resend)
 * Sin RESEND_API_KEY responde 501 {configured:false} y la web sigue con el mailto de siempre.
 */
/* El portal vive en su propio proyecto, separado del de bairengroup.com.
   Se configuran como variables de entorno en Vercel para no repetir el dato
   en dos lugares; si faltan, cae al proyecto del sitio y avisa. */
const SUPABASE_URL = process.env.PORTAL_SUPABASE_URL || 'https://nmrjyyrhwjroonrppnka.supabase.co';
const SUPABASE_ANON_KEY = process.env.PORTAL_SUPABASE_KEY || 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';
if (!process.env.PORTAL_SUPABASE_URL) console.warn('[portal-notify] sin PORTAL_SUPABASE_URL: usando el proyecto del sitio');
const SITE = 'https://www.bairengroup.com/portal/';
const TIPOS = ['consulta', 'aprobado', 'rechazado', 'cambios', 'verificado', 'verificacion_rechazada'];
// Límite de frecuencia por instancia. En un entorno sin estado cada instancia tiene el suyo,
// así que frena ráfagas de un mismo cliente pero no es una defensa dura. El control real
// es que el destinatario se resuelve en el servidor y el origen está restringido.
const hits = new Map();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Accept-Profile': 'portal' } });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return r.json();
}

// Solo estos orígenes pueden llamar a la función. Nada de comodín: era usable como relay.
const ORIGENES = [/^https:\/\/(www\.)?bairengroup\.com$/, /^https:\/\/grupo-bairen[a-z0-9-]*\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/];
// Los avisos derivan su destinatario del propio aviso; la verificación es del equipo y va con clave.
const POR_AVISO = ['consulta', 'aprobado', 'rechazado', 'cambios'];
const POR_CLAVE = ['verificado', 'verificacion_rechazada'];
const esMail = v => typeof v === 'string' && /^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,}$/i.test(v);

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (origin && ORIGENES.some(re => re.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Bairen-Key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (origin && !ORIGENES.some(re => re.test(origin))) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'origen' })); }
  const json = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return json(405, { error: 'POST' });
  const key = process.env.RESEND_API_KEY;
  if (!key) return json(501, { configured: false });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(); const h = (hits.get(ip) || []).filter(t => now - t < 60000); h.push(now); hits.set(ip, h);
  if (h.length > 20) return json(429, { error: 'Demasiados envíos, probá en un minuto.' });

  let body = req.body;
  if (typeof body === 'string') { if (body.length > 20000) return json(413, { error: 'cuerpo' }); try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const tipo = String(body.tipo || ''); if (TIPOS.indexOf(tipo) === -1) return json(400, { error: 'tipo' });
  const datos = body.datos && typeof body.datos === 'object' ? body.datos : {};
  // La verificación la manda el equipo, no el navegador: sin clave no sale.
  if (POR_CLAVE.indexOf(tipo) > -1) {
    const clave = process.env.PORTAL_NOTIFY_KEY;
    if (!clave || req.headers['x-bairen-key'] !== clave) return json(403, { error: 'clave' });
  }
  if (POR_AVISO.indexOf(tipo) > -1 && !body.aviso_id) return json(400, { error: 'aviso_id' });

  try {
    let aviso = null, pub = null;
    if (body.aviso_id) { const a = await sbGet(`avisos?id=eq.${encodeURIComponent(body.aviso_id)}&select=id,titulo,direccion,unidad,codigo,publicador_id`); aviso = a[0] || null; }
    // El destinatario nunca viene del cliente cuando hay un aviso de por medio.
    const pubId = POR_AVISO.indexOf(tipo) > -1 ? (aviso && aviso.publicador_id) : body.publicador_id;
    if (!pubId) return json(404, { error: 'publicador' });
    if (pubId) { const p = await sbGet(`publicadores?id=eq.${encodeURIComponent(pubId)}&select=id,nombre,email`); pub = p[0] || null; }
    if (!pub || !pub.email) return json(404, { error: 'publicador' });
    const titulo = aviso ? (aviso.titulo || `${aviso.direccion}${aviso.unidad ? ' · ' + aviso.unidad : ''}`) : '';
    const link = aviso ? `${SITE}propiedad-${encodeURIComponent(aviso.id)}` : `${SITE}panel`;
    let subject, html;
    const wrap = inner => `<div style="font-family:Jost,Helvetica,Arial,sans-serif;color:#1A2538;max-width:560px;margin:0 auto;padding:24px"><p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#8A7547;margin:0 0 16px">BAIREN</p>${inner}<p style="font-size:12px;color:#6B7589;margin-top:28px;border-top:1px solid #DDD8CE;padding-top:12px">BAIREN es una plataforma de propiedades y no ejerce el corretaje inmobiliario. Cada propiedad es publicada por su titular o por un corredor matriculado, responsable de la operación.</p></div>`;
    if (tipo === 'consulta') {
      subject = `Consulta por ${titulo} (${aviso ? aviso.codigo : ''}) desde BAIREN`;
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Nueva consulta por ${esc(titulo)}</h2><p><b>${esc(datos.nombre)}</b><br>${esc(datos.email)}${datos.telefono ? ' · ' + esc(datos.telefono) : ''}</p><p style="background:#F4F0E6;padding:12px;border-radius:8px">${esc(datos.mensaje)}</p><p>Respondé vos directamente: BAIREN no interviene en la conversación.</p><p><a href="${link}" style="color:#1A2538">Ver la ficha</a> · <a href="${SITE}panel#interesados" style="color:#1A2538">Ver en tu panel</a></p>`);
    } else if (tipo === 'aprobado') {
      subject = `Tu aviso ${titulo} ya está publicado en BAIREN`;
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Publicado</h2><p>${esc(titulo)} pasó la curación y ya se ve en BAIREN con tu nombre como publicador.</p><p><a href="${link}" style="color:#1A2538">Ver la ficha</a></p>`);
    } else if (tipo === 'rechazado' || tipo === 'cambios') {
      subject = tipo === 'rechazado' ? `Tu aviso ${titulo} no entró en BAIREN` : `Tu aviso ${titulo} necesita cambios`;
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">${tipo === 'rechazado' ? 'No entró, y te decimos por qué' : 'Hay que ajustar algo'}</h2><p style="background:#F4F0E6;padding:12px;border-radius:8px">${esc(datos.motivo || 'Sin detalle')}</p><p><a href="${SITE}panel#avisos" style="color:#1A2538">Abrir en tu panel</a></p>`);
    } else if (tipo === 'verificado') {
      subject = 'Tu cuenta de publicador en BAIREN está verificada';
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Verificado</h2><p>${esc(pub.nombre)} ya figura como publicador verificado. Tus avisos muestran el distintivo en cada ficha.</p><p><a href="${SITE}panel#avisos" style="color:#1A2538">Ir a tu panel</a></p>`);
    } else {
      subject = 'No pudimos verificar tu cuenta de publicador en BAIREN';
      html = wrap(`<h2 style="font-weight:500;margin:0 0 12px">Verificación pendiente</h2><p>${esc(datos.nota || 'Revisá los datos y volvé a cargar la documentación desde tu perfil.')}</p><p><a href="${SITE}panel#cuenta" style="color:#1A2538">Ir a mi cuenta</a></p>`);
    }
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.PORTAL_MAIL_FROM || 'BAIREN <onboarding@resend.dev>', to: [pub.email], subject, html, reply_to: tipo === 'consulta' && esMail(datos.email) ? datos.email : undefined }) });
    if (!r.ok) return json(502, { error: 'resend ' + r.status, detail: await r.text() });
    return json(200, { ok: true });
  } catch (err) { return json(500, { error: String(err.message || err) }); }
};
