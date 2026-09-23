/**
 * Vercel Function — resumen semanal del publicador, a mano
 *
 * GET|POST /api/portal-semanal
 *   Autorización: la sesión de un curador (Authorization: Bearer <access_token>), el
 *                 CRON_SECRET, o x-portal-key = PORTAL_NOTIFY_KEY.
 *   ?ensayo=1          arma todo y NO manda nada. Devuelve a quién le habría escrito
 *                      y con qué números. Para mirarlo antes de que salga.
 *   ?desde=AAAA-MM-DD  rehacer una semana puntual.
 *   ?prueba=mail@x.com Manda TODOS los mails a esa casilla en vez de a cada
 *                      destinatario, con el asunto marcado y una línea que dice a
 *                      quién le habría llegado. Para verlos de verdad, en un cliente
 *                      de correo, sin escribirle a nadie.
 *
 * El trabajo vive en api/_portal/semanal.js, porque lo comparte con
 * api/portal-diario.js, que lo dispara los lunes. Esta función es para
 * probarlo y para reenviar una semana si algo falló.
 */
const A = require('./_portal/admin');
const { resumenSemanal } = require('./_portal/semanal');

module.exports = async function handler(req, res) {
  const json = A.preparar(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  /* 23/9/2026 · También lo puede disparar un curador con su sesión iniciada, no solo el
     automático o la clave. Las claves de Vercel son de escritura: una vez guardadas nadie las
     vuelve a ver, así que pedirle a alguien que las pegue en la Terminal no es un camino real.
     Con esto hay un botón en la pantalla de curación y no hace falta ninguna clave. */
  if (!(A.conCron(req) || A.conClave(req) || await A.curadorDeSesion(req))) return json(401, { ok: false, error: 'No autorizado' });
  if (!A.tieneServiceKey()) return json(503, { ok: false, configured: false });

  const t0 = Date.now();
  const q = A.query(req);
  const ensayo = q.ensayo === '1' || q.ensayo === 'true';

  try {
    const r = await resumenSemanal({ desde: q.desde, ensayo, prueba: q.prueba });
    return json(200, Object.assign({ ok: true, ensayo }, r, { ms: Date.now() - t0 }));
  } catch (e) {
    return json(500, { ok: false, error: String(e && e.message || e).slice(0, 300), ms: Date.now() - t0 });
  }
};
