/**
 * Vercel Function — salud del motor del portal BAIREN (la lee Curación → Sistema)
 *
 * GET /api/portal-salud   solo para el equipo. Autorización, una de dos:
 *   · header x-portal-key = PORTAL_NOTIFY_KEY (a mano, con curl), o
 *   · Authorization: Bearer <access_token> de la sesión de un curador. Es lo que manda
 *     curacion.html (BPStore.sb.auth.getSession().data.session.access_token): el token se
 *     valida en GET /auth/v1/user del proyecto del portal y el mail tiene que estar en
 *     portal.curadores (ver curadorDeSesion en api/_portal/admin.js).
 *   Sin ninguna de las dos: 401 {error:'sin autorización'}. En modo local o sin sesión la
 *   pantalla muestra "sin función" y no llama.
 * Nunca devuelve valores de claves ni mails de usuarios: solo números y booleanos.
 * {
 *   configurado: { service_key, resend, mail_from, cron_secret, notify_key, web, migracion04 },
 *   sync: { ultima_ok: { terminada, altas, cambios, bajas, sin_cambios } | null, ultima_error: { terminada, error } | null } | null,
 *   hoy:  { alertas_enviadas, consultas_24h, en_revision, verificaciones_pendientes, avisos_publicados, alertas_activas } | null,
 *   cron: { ruta: '/api/portal-diario', horario: '10:00 UTC (07:00 Buenos Aires)' },
 *   version: '2026-09-11'
 * }
 * configurado.web es siempre true: la lectura de bairengroup.com tiene valores por defecto válidos.
 * Sin PORTAL_SUPABASE_SERVICE_KEY: configurado se informa igual y sync y hoy van null (el curador
 * se comprueba con su propio token, así que la pantalla puede decir que falta la service key).
 * Sin migracion-04-producto.sql: sync va null y hoy.alertas_enviadas va null (migracion04:false).
 */
const A = require('./_portal/admin');

const VERSION = '2026-09-11';
const CRON = { ruta: '/api/portal-diario', horario: '10:00 UTC (07:00 Buenos Aires)' };

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'GET');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!A.origenPermitido(req)) return json(403, { error: 'origen' });
  if (req.method !== 'GET') return json(405, { error: 'GET' });
  res.setHeader('Cache-Control', 'no-store');
  if (!A.conClave(req) && !(await A.curadorDeSesion(req))) return json(401, { error: 'sin autorización' });
  const e = A.estado();
  const configurado = { service_key: e.service_key, resend: e.resend, mail_from: e.mail_from, cron_secret: e.cron_secret, notify_key: e.notify_key, web: e.web_ok, migracion04: null };
  if (!configurado.service_key) return json(200, { configurado, sync: null, hoy: null, cron: CRON, version: VERSION });

  const hace24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const hoyDesde = A.inicioDelDiaBA().toISOString();
  const seguro = p => p.catch(() => null);
  const [ok, err, enviadas, consultas, enRevision, verifs, publicados, alertas] = await Promise.all([
    seguro(A.get('sincronizaciones?select=terminada,altas,cambios,bajas,sin_cambios&ok=eq.true&order=terminada.desc&limit=1')),
    seguro(A.get('sincronizaciones?select=terminada,error&ok=eq.false&order=iniciada.desc&limit=1')),
    seguro(A.contar(`alertas_enviadas?enviada_en=gte.${encodeURIComponent(hoyDesde)}`)),
    seguro(A.contar(`consultas?created_at=gte.${encodeURIComponent(hace24)}`)),
    seguro(A.contar('avisos?estado_curacion=eq.en_revision')),
    seguro(A.contar('verificaciones?resultado=eq.pendiente')),
    seguro(A.contar('avisos?estado_curacion=eq.publicado')),
    seguro(A.contar('alertas?frecuencia=neq.ninguna')),
  ]);
  configurado.migracion04 = ok !== null && enviadas !== null;
  const sync = ok === null ? null : {
    ultima_ok: ok[0] ? { terminada: ok[0].terminada, altas: ok[0].altas, cambios: ok[0].cambios, bajas: ok[0].bajas, sin_cambios: ok[0].sin_cambios } : null,
    ultima_error: err && err[0] ? { terminada: err[0].terminada, error: String(err[0].error || '').slice(0, 200) } : null,
  };
  const hoy = { alertas_enviadas: enviadas, consultas_24h: consultas, en_revision: enRevision, verificaciones_pendientes: verifs, avisos_publicados: publicados, alertas_activas: alertas };
  return json(200, { configurado, sync, hoy, cron: CRON, version: VERSION });
};
