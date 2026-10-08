/**
 * Vercel Function — sincronización bairengroup.com → portal BAIREN
 *
 * Quién la dispara (8/10/2026: el navegador del visitante ya NO; con tráfico de anuncios era un POST y dos
 * escrituras en la base por cada pestaña nueva):
 *   GET  /api/portal-sync            el cron de Vercel, cada 15 minutos (vercel.json): Authorization: Bearer CRON_SECRET
 *   GET  /api/portal-sync            a mano, con header x-portal-key = PORTAL_NOTIFY_KEY
 *        ?force=1                    salta el freno de 10 minutos (solo con x-portal-key)
 *   POST /api/portal-sync            Curación → Sistema, con Authorization: Bearer <access_token> de un curador
 *                                    (portal.curadores; ver curadorDeSesion en api/_portal/admin.js), o con x-portal-key
 *   Sin ninguna de esas: 401 {error:'sin autorización'}.
 *
 * Copia public.propiedades de la web (publicadas) a portal.avisos y portal.fotos con el
 * mismo mapeo que portal/js/data.js y los seeds; la lógica vive en api/_portal/sync.js.
 * Freno: si la última sincronización buena terminó hace menos de 10 minutos, responde
 * {omitida:true, motivo:'reciente'} sin escribir nada en la base. Candado: si hay una en curso
 * (iniciada hace menos de 3 minutos y sin terminar; índice único de la migración 04), {omitida:true, motivo:'en curso'}.
 * El detalle (códigos tocados, filas de sincronizaciones) sale solo con x-portal-key.
 *
 * Variables de entorno en Vercel (ver api/_portal/admin.js):
 *   PORTAL_SUPABASE_SERVICE_KEY   service role del proyecto del portal. Sin ella: 503 {configured:false}.
 *   CRON_SECRET                   Vercel la manda sola en cada corrida del cron. Sin ella el cron recibe 401.
 *   PORTAL_NOTIFY_KEY             clave del equipo para GET a mano y ?force=1.
 *   PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, WEB_SUPABASE_URL, WEB_SUPABASE_KEY   con valores por defecto.
 * Necesita portal/migracion-04-producto.sql (tabla portal.sincronizaciones); sin ella: 503 {configured:false, falta}.
 *
 * Respuestas: 200 {ok:true, altas, cambios, bajas, sin_cambios, unidades, ms[, detalle]} | 200 {omitida:true, motivo[, ...]}
 *             401 sin autorización | 403 origen | 405 | 409 sin publicador | 500 {error} | 503 {configured:false, falta}
 */
const A = require('./_portal/admin');
const { sincronizar } = require('./_portal/sync');

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!A.origenPermitido(req)) return json(403, { error: 'origen' });
  if (req.method !== 'POST' && req.method !== 'GET') return json(405, { error: 'GET o POST' });
  res.setHeader('Cache-Control', 'no-store');
  const clave = A.conClave(req);
  const cron = !clave && req.method === 'GET' && A.conCron(req);
  const curador = !clave && !cron && req.method === 'POST' ? await A.curadorDeSesion(req) : null;
  if (!clave && !cron && !curador) return json(401, { error: 'sin autorización' });
  if (!A.tieneServiceKey()) return json(503, { configured: false, falta: 'PORTAL_SUPABASE_SERVICE_KEY' });
  const q = A.query(req);
  const force = clave && (q.force === '1' || q.force === 'true');
  try {
    const r = await sincronizar({ force, origen: clave ? 'manual' : cron ? 'cron' : 'curador' });
    if (r.omitida) return json(200, clave ? r : { omitida: true, motivo: r.motivo });
    return json(200, { ok: true, altas: r.altas, cambios: r.cambios, bajas: r.bajas, sin_cambios: r.sin_cambios, unidades: r.unidades, ms: r.ms, detalle: clave ? r.detalle : undefined });
  } catch (err) {
    if (err && err.status === 503) return json(503, { configured: false, falta: err.falta, error: err.message });
    if (err && err.status === 409) return json(409, { error: err.message });
    return json(500, { error: String(err && err.message || err).slice(0, 300) });
  }
};
module.exports._interno = require('./_portal/sync')._interno;
