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
 *   hoy:  { alertas_enviadas, consultas_24h, en_revision, verificaciones_pendientes, avisos_publicados, alertas_activas,
 *           errores_24h, errores_24h_top: [{ msg, pagina, n, ultimo }] } | null,
 *   respaldo: { fecha, bytes, tablas, ok, copias, generado, motivo } | null,
 *   cron: { ruta: '/api/portal-diario', horario: '10:00 UTC (07:00 Buenos Aires)' },
 *   version: '2026-09-12'
 * }
 * configurado.web es siempre true: la lectura de bairengroup.com tiene valores por defecto válidos.
 * Sin PORTAL_SUPABASE_SERVICE_KEY: configurado se informa igual y sync, hoy y respaldo van null (el curador
 * se comprueba con su propio token, así que la pantalla puede decir que falta la service key).
 * Sin migracion-04-producto.sql: sync va null y hoy.alertas_enviadas va null (migracion04:false).
 * 12/9 · hoy.errores_24h: cuántos eventos 'error_js' (los que guarda portal/js/errores.js desde el navegador
 * de la gente) hubo en las últimas 24 h; hoy.errores_24h_top: los 5 mensajes más repetidos, con la página
 * donde más pasó, las veces y la última vez. Se leen hasta 1000 filas y se agrupan acá (PostgREST no agrupa
 * por una clave de jsonb sin una vista). Si la tabla no responde, los dos van null. Los mensajes van
 * recortados a 200 caracteres y nunca traen mails ni tokens: errores.js no los guarda.
 * 12/9 · respaldo: ultimoRespaldo() de api/_portal/respaldo.js (la última copia del bucket portal-respaldos:
 * fecha, peso, tablas, ok si tiene menos de 36 h). Si el módulo no está o falla, null.
 */
const A = require('./_portal/admin');
let R = null; try { R = require('./_portal/respaldo'); } catch (e) { R = null; }   /* el módulo del respaldo puede no estar todavía */

const VERSION = '2026-09-12';
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
  if (!configurado.service_key) return json(200, { configurado, sync: null, hoy: null, respaldo: null, cron: CRON, version: VERSION });

  const hace24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const hoyDesde = A.inicioDelDiaBA().toISOString();
  const seguro = p => p.catch(() => null);
  const [ok, err, enviadas, consultas, enRevision, verifs, publicados, alertas, errores, erroresFilas, respaldo] = await Promise.all([
    seguro(A.get('sincronizaciones?select=terminada,altas,cambios,bajas,sin_cambios&ok=eq.true&order=terminada.desc&limit=1')),
    seguro(A.get('sincronizaciones?select=terminada,error&ok=eq.false&order=iniciada.desc&limit=1')),
    seguro(A.contar(`alertas_enviadas?enviada_en=gte.${encodeURIComponent(hoyDesde)}`)),
    seguro(A.contar(`consultas?created_at=gte.${encodeURIComponent(hace24)}`)),
    seguro(A.contar('avisos?estado_curacion=eq.en_revision')),
    seguro(A.contar('verificaciones?resultado=eq.pendiente')),
    seguro(A.contar('avisos?estado_curacion=eq.publicado')),
    seguro(A.contar('alertas?frecuencia=neq.ninguna')),
    seguro(A.contar(`eventos?evento=eq.error_js&creado_en=gte.${encodeURIComponent(hace24)}`)),
    seguro(A.get(`eventos?select=msg:datos->>msg,pagina:datos->>pagina,creado_en&evento=eq.error_js&creado_en=gte.${encodeURIComponent(hace24)}&order=creado_en.desc&limit=1000`)),
    seguro(Promise.resolve().then(() => (R && typeof R.ultimoRespaldo === 'function') ? R.ultimoRespaldo() : null)),
  ]);
  configurado.migracion04 = ok !== null && enviadas !== null;
  const sync = ok === null ? null : {
    ultima_ok: ok[0] ? { terminada: ok[0].terminada, altas: ok[0].altas, cambios: ok[0].cambios, bajas: ok[0].bajas, sin_cambios: ok[0].sin_cambios } : null,
    ultima_error: err && err[0] ? { terminada: err[0].terminada, error: String(err[0].error || '').slice(0, 200) } : null,
  };
  const hoy = { alertas_enviadas: enviadas, consultas_24h: consultas, en_revision: enRevision, verificaciones_pendientes: verifs, avisos_publicados: publicados, alertas_activas: alertas, errores_24h: errores, errores_24h_top: erroresFilas ? topErrores(erroresFilas) : null };
  return json(200, { configurado, sync, hoy, respaldo: respaldo || null, cron: CRON, version: VERSION });
};

/* Los 5 mensajes más repetidos entre las filas de error_js (datos.msg): { msg, pagina, n, ultimo }.
   pagina es la página donde más veces pasó; ultimo, la fecha más reciente. Filas sin datos o sin msg se saltean. */
function topErrores(filas) {
  const grupos = new Map();
  for (const f of Array.isArray(filas) ? filas : []) {
    const d = f && typeof f === 'object' ? (f.datos && typeof f.datos === 'object' ? f.datos : f) : null;   /* select con alias (msg, pagina) o fila entera */
    const msg = d && d.msg != null ? String(d.msg).replace(/[\w.+%-]+@[\w-]+(\.[\w-]+)+/g, '…@…').trim().slice(0, 200) : '';
    if (!msg) continue;
    let g = grupos.get(msg); if (!g) { g = { msg, n: 0, ultimo: null, paginas: new Map() }; grupos.set(msg, g); }
    g.n++;
    if (f.creado_en && (!g.ultimo || f.creado_en > g.ultimo)) g.ultimo = f.creado_en;
    const pag = d.pagina != null ? String(d.pagina).slice(0, 200) : '';
    g.paginas.set(pag, (g.paginas.get(pag) || 0) + 1);
  }
  return Array.from(grupos.values())
    .sort((a, b) => b.n - a.n || String(b.ultimo || '').localeCompare(String(a.ultimo || '')))
    .slice(0, 5)
    .map(g => { let pagina = '', max = 0; g.paginas.forEach((n, p) => { if (n > max) { max = n; pagina = p; } }); return { msg: g.msg, pagina, n: g.n, ultimo: g.ultimo }; });
}
