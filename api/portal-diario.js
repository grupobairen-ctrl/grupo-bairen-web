/**
 * Vercel Function — rutina diaria del portal BAIREN (cron: "0 10 * * *", 07:00 Buenos Aires)
 *
 * GET|POST /api/portal-diario
 *   Autorización: Authorization: Bearer CRON_SECRET (así la manda Vercel en los crons)
 *                 o header x-portal-key = PORTAL_NOTIFY_KEY (para dispararla a mano).
 *   Sin ninguna de las dos: 401. Sin PORTAL_SUPABASE_SERVICE_KEY: 503 {configured:false}.
 *
 * Hace, en orden, cada paso con su propio try/catch (uno no tumba al resto):
 *   a. sincronización web → portal (api/_portal/sync.js; respeta el freno de 10 minutos)
 *   b. alertas de búsqueda: por cada alerta 'busqueda' diaria o inmediata, los avisos que entraron
 *      (max(publicado_en, created_at)) después de coalesce(ultimo_envio, created_at) y cumplen sus
 *      filtros con la misma semántica que D.filter; hasta diez por mail, pero se registran todos en
 *      alertas_enviadas con ignore-duplicates: nunca se repite un aviso a la misma alerta, ni si se
 *      cruzan dos corridas. Lotes de 100 ids por consulta y 5 alertas en paralelo.
 *   c. alertas de precio: para cada aviso publicado con alerta, el último cambio de precio de las
 *      últimas 24 h en precios_historial; se avisa solo si es una baja (una vez por precio)
 *   d. resumen a BAIREN (PORTAL_RESUMEN_A o contacto@bairengroup.com): en revisión, verificaciones
 *      pendientes, consultas de 24 h, resultado de la sincronización, alertas enviadas hoy.
 *      Si no hay nada, manda "Sin novedades" igual, para saber que el cron corre.
 *
 * Variables de entorno (ver api/_portal/admin.js): PORTAL_SUPABASE_SERVICE_KEY, CRON_SECRET,
 *   PORTAL_NOTIFY_KEY, RESEND_API_KEY, PORTAL_MAIL_FROM, PORTAL_RESUMEN_A, y las URL/claves con default.
 * Necesita portal/migracion-04-producto.sql (sincronizaciones, precios_historial, alertas_enviadas, alertas.ultimo_envio).
 *
 * Responde 200 {ok, sync, busqueda, precio, resumen, mail, ms} con el detalle de cada paso;
 * los pasos que fallaron traen {error}. Sin RESEND_API_KEY no manda nada y devuelve lo que habría mandado.
 */
const A = require('./_portal/admin');
const { sincronizar } = require('./_portal/sync');
const { alertasDeBusqueda, alertasDePrecio, tituloDe } = require('./_portal/alertas');

const paso = async fn => { try { return await fn(); } catch (e) { return { error: String(e && e.message || e).slice(0, 300) }; } };

async function armarResumen(sync, busqueda, precio) {
  const hace24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const hoy = A.inicioDelDiaBA().toISOString();
  const [enRevision, verifs, consultas, enviadasHoy] = await Promise.all([
    A.get('avisos?select=id,codigo,titulo,direccion,unidad,barrio,operacion,updated_at,publicadores(nombre)&estado_curacion=eq.en_revision&order=updated_at.asc&limit=50'),
    A.get('verificaciones?select=id,tipo,created_at,publicadores(nombre)&resultado=eq.pendiente&order=created_at.asc&limit=50'),
    A.get(`consultas?select=id,canal,nombre,created_at,aviso_ref,avisos(titulo,direccion,unidad,codigo)&created_at=gte.${encodeURIComponent(hace24)}&order=created_at.desc&limit=10`, { count: true }),
    A.contar(`alertas_enviadas?enviada_en=gte.${encodeURIComponent(hoy)}`).catch(() => null),
  ]);
  return {
    fecha: A.fechaBA(),
    en_revision: enRevision.map(a => ({ codigo: a.codigo, titulo: tituloDe(a), barrio: a.barrio, operacion: a.operacion, publicador: a.publicadores && a.publicadores.nombre || null, desde: a.updated_at })),
    verificaciones_pendientes: verifs.map(v => ({ tipo: v.tipo, publicador: v.publicadores && v.publicadores.nombre || null, desde: v.created_at })),
    consultas_24h: consultas.total == null ? consultas.data.length : consultas.total,
    consultas: consultas.data.map(c => ({ cuando: c.created_at, canal: c.canal, nombre: c.nombre || null, aviso: c.avisos ? `${tituloDe(c.avisos)} (${c.avisos.codigo})` : (c.aviso_ref || null) })),
    sync: sync && sync.error ? { error: sync.error } : sync && sync.omitida ? { omitida: true, motivo: sync.motivo } : sync ? { altas: sync.altas, cambios: sync.cambios, bajas: sync.bajas, sin_cambios: sync.sin_cambios } : null,
    alertas_enviadas_hoy: enviadasHoy,
    alertas: { busqueda: busqueda && busqueda.error ? { error: busqueda.error } : busqueda ? { alertas: busqueda.alertas, enviadas: busqueda.enviadas, avisos: busqueda.avisos, ignoradas: busqueda.ignoradas } : null, precio: precio && precio.error ? { error: precio.error } : precio ? { alertas: precio.alertas, bajas: precio.bajas, enviadas: precio.enviadas } : null },
  };
}

function mailResumen(r) {
  const n = r.en_revision.length, m = r.consultas_24h;
  const subject = `BAIREN · Resumen del ${r.fecha} · ${n} en revisión · ${m} consultas`;
  const hayNovedad = n || m || r.verificaciones_pendientes.length || (r.sync && (r.sync.altas || r.sync.cambios || r.sync.bajas || r.sync.error)) || r.alertas_enviadas_hoy;
  const fecha = d => d ? `${A.fechaBA(d)} ${A.horaBA(d)}` : '';
  const sec = (titulo, inner) => `<h3 style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6B7589;margin:22px 0 8px">${titulo}</h3>${inner}`;
  const lista = items => items.length ? `<ul style="margin:0;padding-left:18px">${items.map(x => `<li style="margin:4px 0">${x}</li>`).join('')}</ul>` : '<p style="margin:0;color:#6B7589">Nada.</p>';
  let cuerpo = `<h2 style="">Resumen del ${r.fecha}</h2>`;
  if (!hayNovedad) cuerpo += '<p>Sin novedades.</p>';
  cuerpo += sec(`En revisión (${n})`, lista(r.en_revision.map(a => `${A.esc(a.titulo)} <span style="color:#6B7589">${A.esc(a.codigo)} · ${A.esc(a.publicador || 'sin publicador')}</span>`)));
  cuerpo += sec(`Verificaciones pendientes (${r.verificaciones_pendientes.length})`, lista(r.verificaciones_pendientes.map(v => `${A.esc(v.publicador || 'sin publicador')} <span style="color:#6B7589">${A.esc(v.tipo)} · desde ${fecha(v.desde)}</span>`)));
  cuerpo += sec(`Consultas en 24 h (${m})`, lista(r.consultas.map(c => `${A.esc(c.aviso || 'sin aviso')} <span style="color:#6B7589">${A.esc(c.canal)}${c.nombre ? ' · ' + A.esc(c.nombre) : ''} · ${fecha(c.cuando)}</span>`)));
  const s = r.sync;
  cuerpo += sec('Sincronización con la web', `<p style="margin:0">${!s ? 'No corrió.' : s.error ? 'Error: ' + A.esc(s.error) : s.omitida ? 'Omitida (' + A.esc(s.motivo) + ').' : `${s.altas} altas, ${s.cambios} cambios, ${s.bajas} bajas, ${s.sin_cambios} sin cambios.`}</p>`);
  const ab = r.alertas.busqueda, ap = r.alertas.precio;
  cuerpo += sec('Alertas', `<p style="margin:0">Enviadas hoy: ${r.alertas_enviadas_hoy == null ? 'sin dato' : r.alertas_enviadas_hoy}.<br>Búsqueda: ${!ab ? 'no corrió' : ab.error ? 'error: ' + A.esc(ab.error) : `${ab.alertas} alertas, ${ab.enviadas} mails, ${ab.avisos} avisos${Object.keys(ab.ignoradas || {}).length ? ' (filtros ignorados: ' + A.esc(Object.keys(ab.ignoradas).join(', ')) + ')' : ''}`}.<br>Precio: ${!ap ? 'no corrió' : ap.error ? 'error: ' + A.esc(ap.error) : `${ap.alertas} alertas, ${ap.bajas} bajas, ${ap.enviadas} mails`}.</p>`);
  cuerpo += `<p style="margin-top:22px"><a href="${A.SITE}curacion" class="btn">Abrir curación</a></p>`;
  const text = [`Resumen del ${r.fecha}`, hayNovedad ? '' : 'Sin novedades.', `En revisión: ${n}`, `Verificaciones pendientes: ${r.verificaciones_pendientes.length}`, `Consultas en 24 h: ${m}`, `Sincronización: ${!s ? 'no corrió' : s.error ? 'error ' + s.error : s.omitida ? 'omitida' : `${s.altas} altas, ${s.cambios} cambios, ${s.bajas} bajas`}`, `Alertas enviadas hoy: ${r.alertas_enviadas_hoy == null ? 'sin dato' : r.alertas_enviadas_hoy}`].filter(Boolean).join('\n');
  return { subject, html: A.plantilla(cuerpo), text };
}

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'GET' && req.method !== 'POST') return json(405, { error: 'GET o POST' });
  if (!A.conCron(req) && !A.conClave(req)) return json(401, { error: 'sin autorización' });
  if (!A.tieneServiceKey()) return json(503, { configured: false, falta: 'PORTAL_SUPABASE_SERVICE_KEY' });
  const t0 = Date.now();
  const q = A.query(req);
  const simular = q.simular === '1';   // arma todo y no manda ningún mail (para probar)

  const sync = await paso(() => sincronizar({ force: q.force === '1', origen: A.conCron(req) ? 'cron' : 'manual' }));
  const busqueda = await paso(() => alertasDeBusqueda({ simular }));
  const precio = await paso(() => alertasDePrecio({ simular }));
  const resumen = await paso(() => armarResumen(sync, busqueda, precio));
  let mail;
  if (resumen.error) mail = { enviado: false, motivo: 'resumen con error' };
  else {
    const m = mailResumen(resumen);
    mail = simular ? { enviado: false, motivo: 'simulado', subject: m.subject } : await paso(async () => Object.assign({ subject: m.subject }, await A.enviarMail({ to: A.RESUMEN_A, subject: m.subject, html: m.html, text: m.text })));
    if (mail.error) mail = { enviado: false, motivo: mail.error, subject: m.subject };
  }
  return json(200, { ok: !(sync.error && busqueda.error && precio.error && resumen.error), sync, busqueda, precio, resumen, mail, ms: Date.now() - t0 });
};
