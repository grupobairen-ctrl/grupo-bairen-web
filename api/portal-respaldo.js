/**
 * Vercel Function · copia de seguridad de la base del portal BAIREN, a mano.
 *
 * GET|POST /api/portal-respaldo
 *   Autorización: header x-portal-key = PORTAL_NOTIFY_KEY, o Authorization: Bearer CRON_SECRET.
 *   Sin ninguna de las dos: 401. Sin PORTAL_SUPABASE_SERVICE_KEY: 503 {configured:false}.
 *
 *   Sin parámetros: corre respaldar() (api/_portal/respaldo.js) y responde su resultado:
 *     200 {ok, fecha, ruta, bytes, tablas, conteos, faltantes, auth_users, borrados, ms}
 *     500 {ok:false, error} si no se pudo (por ejemplo, falta correr migracion-07-respaldos.sql).
 *   ?estado=1: no copia nada; responde ultimoRespaldo(): {fecha, bytes, tablas, ok, ruta, copias, motivo}.
 *
 * La copia diaria la hace el cron de api/portal-diario.js (paso e); esta función es para
 * disparar una copia fuera de horario (antes de correr una migración, por ejemplo) o para
 * mirar el estado sin entrar a Supabase.
 */
const A = require('./_portal/admin');
const { respaldar, ultimoRespaldo } = require('./_portal/respaldo');

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET' && req.method !== 'POST') return json(405, { error: 'GET o POST' });
  if (!A.conCron(req) && !A.conClave(req)) return json(401, { error: 'sin autorización' });
  if (!A.tieneServiceKey()) return json(503, { configured: false, falta: 'PORTAL_SUPABASE_SERVICE_KEY' });
  const q = A.query(req);
  if (q.estado === '1') return json(200, await ultimoRespaldo());
  try { return json(200, await respaldar()); }
  catch (e) { return json(500, { ok: false, error: String(e && e.message || e).slice(0, 300) }); }
};
