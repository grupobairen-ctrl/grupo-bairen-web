/**
 * Módulo compartido del motor del portal BAIREN (no se despliega como función:
 * los archivos de api/ que empiezan con guion bajo son módulos).
 *
 * Qué da:
 *   rest(method, path, body, opts)   cliente REST de Supabase con la SERVICE KEY del portal
 *                                    (esquema `portal`), para leer y escribir saltando RLS.
 *   web(path)                        lectura REST de la base de la web (public.propiedades) con la clave pública.
 *   estado()                         qué variables están configuradas (booleanos, nunca los valores).
 *   enviarMail({to, subject, html, text})   Resend por HTTP, igual que portal-notify.
 *   emailDeUsuario(usuarioId)        mail de una cuenta de auth (GET /auth/v1/admin/users/{id}).
 *   curadorDeSesion(req)             si Authorization: Bearer <access_token> es la sesión de un
 *                                    curador (portal.curadores), su mail; si no, null. Lo usa portal-salud.
 *   origenPermitido(req)             misma lista de orígenes que portal-notify.
 *   sinLineaCorredor(s)              misma expresión que D.sinLineaCorredor en portal/js/data.js.
 *   esc, plantilla, json, leerClave, fechaBA, inicioDelDiaBA
 *
 * Variables de entorno (Vercel):
 *   PORTAL_SUPABASE_URL          URL del proyecto del portal (default: el proyecto del 4/9/2026)
 *   PORTAL_SUPABASE_KEY          clave pública del portal (default en el código; es pública)
 *   PORTAL_SUPABASE_SERVICE_KEY  service role del proyecto del portal. SOLO en el servidor.
 *                                Sin ella, sync/diario/salud responden 503 {configured:false}.
 *   WEB_SUPABASE_URL             URL del proyecto de bairengroup.com (default: el de supabase-config.js)
 *   WEB_SUPABASE_KEY             clave pública de la web (default: la de supabase-config.js; es pública)
 *   RESEND_API_KEY               clave de https://resend.com
 *   PORTAL_MAIL_FROM             remitente, ej. "BAIREN <avisos@bairengroup.com>"
 *   CRON_SECRET                  Vercel la manda como Authorization: Bearer en los crons
 *   PORTAL_NOTIFY_KEY            clave del equipo: header x-portal-key para disparar a mano
 *   PORTAL_RESUMEN_A             destinatario del resumen diario (default contacto@bairengroup.com)
 */
const PORTAL_URL = process.env.PORTAL_SUPABASE_URL || 'https://dahusnnbyrvltcuaelxj.supabase.co';
const PORTAL_ANON = process.env.PORTAL_SUPABASE_KEY || 'sb_publishable_tSRRvyBksexYaiuwJ5YTQw_R_4VNp-0';
const SERVICE_KEY = process.env.PORTAL_SUPABASE_SERVICE_KEY || '';
const WEB_URL = process.env.WEB_SUPABASE_URL || 'https://nmrjyyrhwjroonrppnka.supabase.co';
const WEB_KEY = process.env.WEB_SUPABASE_KEY || 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';
const SITE = 'https://www.bairengroup.com/portal/';
const RESUMEN_A = process.env.PORTAL_RESUMEN_A || 'contacto@bairengroup.com';

// Solo estos orígenes pueden llamar a las funciones. Misma lista que portal-notify.
const ORIGENES = [/^https:\/\/(www\.)?bairengroup\.com$/, /^https:\/\/grupo-bairen[a-z0-9-]*\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/];
const origenPermitido = req => { const o = (req.headers && req.headers.origin) || ''; return !o || ORIGENES.some(re => re.test(o)); };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Misma expresión que D.sinLineaCorredor (portal/js/data.js) y que exportar-avisos.mjs.
const sinLineaCorredor = s => (s || '').replace(/(^|\n+)[ \t]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel)\s*:[^\n]*/gi, '').trim();

function estado() {
  return {
    service_key: !!SERVICE_KEY,
    resend: !!process.env.RESEND_API_KEY,
    mail_from: !!process.env.PORTAL_MAIL_FROM,
    cron_secret: !!process.env.CRON_SECRET,
    notify_key: !!process.env.PORTAL_NOTIFY_KEY,
    web_ok: true,   // la lectura de la web siempre está: los valores por defecto del código son válidos
  };
}

/* Respuesta JSON. Pone CORS solo si el origen está en la lista. */
function preparar(req, res, metodos) {
  const origin = (req.headers && req.headers.origin) || '';
  if (origin && ORIGENES.some(re => re.test(origin))) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Portal-Key, Authorization');
  res.setHeader('Access-Control-Allow-Methods', (metodos || 'GET, POST') + ', OPTIONS');
  return (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
}

/* Error de REST con el detalle que devuelve PostgREST (código y mensaje cortos). */
class RestError extends Error {
  constructor(status, path, texto) { super(`supabase ${status} en ${path.split('?')[0]}: ${String(texto || '').slice(0, 200)}`); this.status = status; this.path = path; this.detalle = texto; }
}

/* Cliente REST del portal con la service key. opts.prefer: 'return=representation' | 'return=minimal' | 'resolution=merge-duplicates' ... ; opts.count: true para leer el total (Content-Range). */
async function rest(method, path, body, opts) {
  if (!SERVICE_KEY) throw new Error('sin PORTAL_SUPABASE_SERVICE_KEY');
  opts = opts || {};
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Accept-Profile': 'portal', 'Content-Profile': 'portal', 'Content-Type': 'application/json' };
  const prefer = [];
  if (opts.prefer) prefer.push(opts.prefer); else if (method === 'POST' || method === 'PATCH') prefer.push('return=representation'); else if (method === 'DELETE') prefer.push('return=minimal');
  if (opts.count) prefer.push('count=exact');
  if (prefer.length) headers.Prefer = prefer.join(', ');
  const r = await fetch(`${PORTAL_URL}/rest/v1/${path}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  const texto = await r.text();
  if (!r.ok) throw new RestError(r.status, path, texto);
  let data = null; if (texto) { try { data = JSON.parse(texto); } catch (e) { data = null; } }
  if (opts.count) { const cr = r.headers.get('content-range') || ''; const total = Number(cr.split('/')[1]); return { data, total: isNaN(total) ? null : total }; }
  return data;
}
const get = (path, opts) => rest('GET', path, null, opts);
const post = (path, body, opts) => rest('POST', path, body, opts);
const patch = (path, body, opts) => rest('PATCH', path, body, opts);
const del = (path, opts) => rest('DELETE', path, null, opts);
/* Cantidad de filas que cumplen el filtro, sin traerlas. */
async function contar(path) { const r = await get(path + (path.indexOf('?') > -1 ? '&' : '?') + 'select=id&limit=1', { count: true }); return r.total == null ? (r.data || []).length : r.total; }

/* Lectura de la base de la web (public.propiedades) con la clave pública del sitio. */
async function web(path) {
  const r = await fetch(`${WEB_URL}/rest/v1/${path}`, { headers: { apikey: WEB_KEY, Authorization: `Bearer ${WEB_KEY}` } });
  if (!r.ok) throw new RestError(r.status, 'web/' + path, await r.text());
  return r.json();
}

/* Mail de una cuenta de auth del portal. Devuelve null si no existe o no hay service key. */
async function emailDeUsuario(usuarioId) {
  if (!SERVICE_KEY || !usuarioId) return null;
  const r = await fetch(`${PORTAL_URL}/auth/v1/admin/users/${encodeURIComponent(usuarioId)}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return (u && u.email) || null;
}

/**
 * Sesión de un curador. Lee Authorization: Bearer <access_token> (el de BPStore.sb.auth.getSession()
 * en el navegador), lo valida en GET /auth/v1/user con la clave anon del portal y comprueba que ese
 * mail esté en portal.curadores: con la service key si hay, si no con el mismo token (la política
 * "curadores se ven a si mismos" deja leer la fila propia). Devuelve el mail o null. Nunca lanza.
 */
async function curadorDeSesion(req) {
  try {
    const m = /^Bearer\s+(\S+)$/i.exec((req.headers && req.headers.authorization) || '');
    if (!m) return null;
    const token = m[1];
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return null;   // el secreto del cron no es una sesión
    const r = await fetch(`${PORTAL_URL}/auth/v1/user`, { headers: { apikey: PORTAL_ANON, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json(); const email = u && u.email; if (!email) return null;
    const path = `curadores?select=email&email=eq.${encodeURIComponent(email)}`;
    let filas;
    if (SERVICE_KEY) filas = await get(path);
    else { const rr = await fetch(`${PORTAL_URL}/rest/v1/${path}`, { headers: { apikey: PORTAL_ANON, Authorization: `Bearer ${token}`, 'Accept-Profile': 'portal' } }); filas = rr.ok ? await rr.json() : []; }
    return Array.isArray(filas) && filas.length ? email : null;
  } catch (e) { return null; }
}

/* Envío por Resend, igual que portal-notify. Sin RESEND_API_KEY no manda y lo dice. */
async function enviarMail({ to, subject, html, text, reply_to }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { enviado: false, motivo: 'sin RESEND_API_KEY' };
  if (!to) return { enviado: false, motivo: 'sin destinatario' };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.PORTAL_MAIL_FROM || 'BAIREN <onboarding@resend.dev>', to: Array.isArray(to) ? to : [to], subject, html, text: text || undefined, reply_to: reply_to || undefined }) });
  if (!r.ok) return { enviado: false, motivo: 'resend ' + r.status, detalle: (await r.text()).slice(0, 300) };
  return { enviado: true };
}

/* Plantilla de mail: la misma que portal-notify (cabecera navy, cuerpo crema, pie legal). */
function plantilla(inner) {
  const cuerpo = inner
    .replace(/<h2 style="[^"]*">/g, '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-weight:normal;font-size:24px;line-height:1.3;color:#131D2D;margin:0 0 14px">')
    .replace(/<a href="([^"]*)" class="btn">/g, '<a href="$1" style="display:inline-block;background:#131D2D;color:#FBFAF6;text-decoration:none;padding:12px 22px;font-size:12px;letter-spacing:2px;text-transform:uppercase;border:1px solid #C2A968">');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E6;padding:32px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%"><tr><td style="background:#131D2D;padding:26px 36px;border-bottom:1px solid #C2A968;text-align:center"><div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:6px;color:#FBFAF6">BAIREN</div><div style="font-size:10px;letter-spacing:3px;color:#C2A968;margin-top:6px">PROPIEDADES SELECCIONADAS</div></td></tr><tr><td style="background:#FBFAF6;padding:34px 36px 30px;color:#1A2538;font-size:15px;line-height:1.6">${cuerpo}</td></tr><tr><td style="background:#F4F0E6;padding:18px 36px;text-align:center;font-size:11px;line-height:1.6;letter-spacing:.5px;color:#6B7589">BAIREN es un portal de propiedades y no ejerce el corretaje inmobiliario. Cada propiedad es publicada por su titular, por un corredor matriculado o por una desarrolladora, responsable de la operación.</td></tr></table></td></tr></table>`;
}

/* Clave del equipo: header x-portal-key igual a PORTAL_NOTIFY_KEY. */
function conClave(req) { const k = process.env.PORTAL_NOTIFY_KEY; return !!k && (req.headers['x-portal-key'] === k); }
/* Cron de Vercel: Authorization: Bearer CRON_SECRET. */
function conCron(req) { const s = process.env.CRON_SECRET; return !!s && (req.headers.authorization === `Bearer ${s}`); }
/* Parámetros de la URL (Vercel expone req.query; en pruebas con req simulados puede no estar). */
function query(req) { if (req.query && typeof req.query === 'object') return req.query; try { return Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams); } catch (e) { return {}; } }

/* Fechas en Buenos Aires (UTC-3 fijo, sin horario de verano). */
const BA_OFFSET_MS = -3 * 3600 * 1000;
function inicioDelDiaBA(d) { const t = (d ? new Date(d) : new Date()).getTime() + BA_OFFSET_MS; const ba = new Date(t); const y = ba.getUTCFullYear(), m = ba.getUTCMonth(), day = ba.getUTCDate(); return new Date(Date.UTC(y, m, day) - BA_OFFSET_MS); }
function fechaBA(d) { const ba = new Date((d ? new Date(d) : new Date()).getTime() + BA_OFFSET_MS); const p = n => String(n).padStart(2, '0'); return `${p(ba.getUTCDate())}/${p(ba.getUTCMonth() + 1)}/${ba.getUTCFullYear()}`; }
function horaBA(d) { const ba = new Date((d ? new Date(d) : new Date()).getTime() + BA_OFFSET_MS); const p = n => String(n).padStart(2, '0'); return `${p(ba.getUTCHours())}:${p(ba.getUTCMinutes())}`; }
const fmtUSD = n => n == null ? 'Consultar precio' : 'USD ' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
const linkFicha = id => `${SITE}propiedad-${encodeURIComponent(id)}`;

module.exports = { PORTAL_URL, WEB_URL, SITE, RESUMEN_A, ORIGENES, RestError, tieneServiceKey: () => !!SERVICE_KEY, rest, get, post, patch, del, contar, web, emailDeUsuario, curadorDeSesion, enviarMail, plantilla, estado, origenPermitido, preparar, conClave, conCron, query, esc, sinLineaCorredor, inicioDelDiaBA, fechaBA, horaBA, fmtUSD, linkFicha };
