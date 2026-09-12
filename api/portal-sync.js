/**
 * Vercel Function — sincronización bairengroup.com → portal BAIREN
 *
 * POST /api/portal-sync            la pide el portal una vez por pestaña (BPStore.pedirSync);
 *                                  sin clave exige cabecera Origin de un origen permitido
 *                                  (el navegador la manda siempre en un POST; curl sin Origin: 403)
 * GET  /api/portal-sync            a mano, con header x-portal-key = PORTAL_NOTIFY_KEY
 *      ?force=1                    salta el freno de 10 minutos (solo con clave)
 *
 * Copia public.propiedades de la web (publicadas) a portal.avisos y portal.fotos con el
 * mismo mapeo que portal/js/data.js y los seeds; la lógica vive en api/_portal/sync.js.
 * Freno: si la última sincronización buena terminó hace menos de 10 minutos, responde
 * {omitida:true, motivo:'reciente'}. Candado: si hay una en curso (iniciada hace menos de
 * 3 minutos y sin terminar; índice único de la migración 04), {omitida:true, motivo:'en curso'}.
 * Sin clave la respuesta lleva solo {omitida, motivo} o los números; el detalle (códigos
 * tocados, filas de sincronizaciones) sale solo con clave.
 *
 * Variables de entorno en Vercel (ver api/_portal/admin.js):
 *   PORTAL_SUPABASE_SERVICE_KEY   service role del proyecto del portal. Sin ella: 503 {configured:false}.
 *   PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, WEB_SUPABASE_URL, WEB_SUPABASE_KEY   con valores por defecto.
 *   PORTAL_NOTIFY_KEY             clave del equipo para GET y ?force=1.
 * Necesita portal/migracion-04-producto.sql (tabla portal.sincronizaciones); sin ella: 503 {configured:false, falta}.
 *
 * Respuestas: 200 {ok:true, altas, cambios, bajas, sin_cambios, unidades, ms[, detalle]} | 200 {omitida:true, motivo[, ...]}
 *             403 origen o clave | 405 | 409 sin publicador | 500 {error} | 503 {configured:false, falta}
 */
const A = require('./_portal/admin');
const { sincronizar } = require('./_portal/sync');

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!A.origenPermitido(req)) return json(403, { error: 'origen' });
  if (req.method !== 'POST' && req.method !== 'GET') return json(405, { error: 'POST' });
  const clave = A.conClave(req);
  if (req.method === 'GET' && !clave) return json(403, { error: 'clave' });
  if (!clave && !req.headers.origin) return json(403, { error: 'origen' });   // sin clave, solo desde el navegador (que siempre manda Origin en un POST)
  if (!A.tieneServiceKey()) return json(503, { configured: false, falta: 'PORTAL_SUPABASE_SERVICE_KEY' });
  const q = A.query(req);
  const force = clave && (q.force === '1' || q.force === 'true');
  try {
    const r = await sincronizar({ force, origen: clave ? 'manual' : 'web' });
    if (r.omitida) return json(200, clave ? r : { omitida: true, motivo: r.motivo });
    return json(200, { ok: true, altas: r.altas, cambios: r.cambios, bajas: r.bajas, sin_cambios: r.sin_cambios, unidades: r.unidades, ms: r.ms, detalle: clave ? r.detalle : undefined });
  } catch (err) {
    if (err && err.status === 503) return json(503, { configured: false, falta: err.falta, error: err.message });
    if (err && err.status === 409) return json(409, { error: err.message });
    return json(500, { error: String(err && err.message || err).slice(0, 300) });
  }
};
module.exports._interno = require('./_portal/sync')._interno;
