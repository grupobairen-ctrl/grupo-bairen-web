/**
 * Vercel Function — notificaciones (webhook) de Mercado Pago para los rieles de BAIREN (migración 31)
 *
 * POST /api/portal-mp-webhook   lo llama Mercado Pago (no el navegador): { type:'payment', data:{ id }, user_id, … }
 *   1. Valida la firma x-signature con MP_WEBHOOK_SECRET: el manifiesto "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *      firmado con HMAC-SHA256 tiene que dar el v1 del encabezado (y el ts no puede tener más de 10 minutos).
 *   2. Consulta el pago en GET /v1/payments/<id> con el token del vendedor (portal.mp_credenciales, por el user_id de la
 *      notificación); si no está, con MP_ACCESS_TOKEN.
 *   3. Si está aprobado, por su external_reference ("reserva:<uuid>" o "pago:<uuid>") llama con la clave de servicio a
 *      portal.confirmar_reserva o portal.registrar_pago (lado 'sistema'; el motor de cobro corre igual, en simulación).
 *   Antes de registrar comprueba la regla de oro: el pago se acreditó al VENDEDOR (collector_id = su user id de Mercado
 *   Pago), no a BAIREN; en pesos y por el monto completo. Si algo no cuadra, no registra nada y responde 200 (para que
 *   Mercado Pago no reintente) con el motivo.
 *   Responde 200 también si ya estaba registrado (las notificaciones se repiten).
 *
 * Sin MP_WEBHOOK_SECRET, MP_ACCESS_TOKEN o PORTAL_SUPABASE_SERVICE_KEY responde 501 { configured:false }.
 * Qué hace falta para activarlo: ver el encabezado de api/portal-pago.js. En el panel de la aplicación de Mercado Pago,
 * Webhooks → URL de producción https://<dominio>/api/portal-mp-webhook, evento "Pagos", y copiar la clave secreta a
 * MP_WEBHOOK_SECRET.
 */
const crypto = require('crypto');
const A = require('./_portal/admin');
const MP_API = 'https://api.mercadopago.com';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* x-signature: "ts=1704908010,v1=618c…". Devuelve true si la firma coincide. */
function firmaValida(req, dataId) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  const firma = String(req.headers['x-signature'] || '');
  const partes = {}; firma.split(',').forEach(p => { const i = p.indexOf('='); if (i > 0) partes[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  if (!secreto || !partes.ts || !partes.v1) return false;
  const ts = Number(partes.ts); const ms = ts > 1e12 ? ts : ts * 1000;
  if (!isFinite(ms) || Math.abs(Date.now() - ms) > 10 * 60 * 1000) return false;
  const reqId = req.headers['x-request-id'];
  let manifiesto = '';
  if (dataId) manifiesto += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (reqId) manifiesto += `request-id:${reqId};`;
  manifiesto += `ts:${partes.ts};`;
  const esperado = crypto.createHmac('sha256', secreto).update(manifiesto).digest('hex');
  const a = Buffer.from(esperado, 'utf8'), b = Buffer.from(partes.v1, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function rpc(fn, args) {
  try { return { ok: true, data: await A.post('rpc/' + fn, args) }; }
  catch (e) { return { ok: false, error: String((e && e.detalle) || e.message || e) }; }
}

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'POST');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return json(405, { error: 'POST' });
  const falta = ['MP_WEBHOOK_SECRET', 'MP_ACCESS_TOKEN'].filter(k => !process.env[k]).concat(A.tieneServiceKey() ? [] : ['PORTAL_SUPABASE_SERVICE_KEY']);
  if (falta.length) return json(501, { configured: false, error: 'Mercado Pago todavía no está configurado', falta });

  let body = req.body;
  if (typeof body === 'string') { if (body.length > 20000) return json(413, { error: 'cuerpo' }); try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body && typeof body === 'object' ? body : {};
  const q = A.query(req);
  const tipo = String(body.type || body.topic || q.type || q.topic || '');
  const dataId = String((body.data && body.data.id) || q['data.id'] || q.id || '');
  if (!firmaValida(req, dataId)) return json(401, { error: 'firma' });
  if (tipo !== 'payment' || !/^\d{1,20}$/.test(dataId)) return json(200, { ok: true, ignorado: 'no es un pago' });

  try {
    // El pago es del vendedor: se consulta con su token (por el user_id de la notificación)
    const userId = body.user_id != null ? String(body.user_id) : '';
    const cred = /^\d{1,20}$/.test(userId) ? (await A.get(`mp_credenciales?mp_user_id=eq.${userId}&select=publicador_id,mp_user_id,access_token`))[0] : null;
    const token = (cred && cred.access_token) || process.env.MP_ACCESS_TOKEN;
    const r = await fetch(`${MP_API}/v1/payments/${dataId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return json(502, { error: 'mercado pago ' + r.status });   // 5xx: Mercado Pago reintenta
    const pago = await r.json();
    if (pago.status !== 'approved') return json(200, { ok: true, ignorado: 'estado ' + pago.status });
    const m = /^(reserva|pago):([0-9a-f-]{36})$/i.exec(String(pago.external_reference || ''));
    if (!m || !UUID_RE.test(m[2])) return json(200, { ok: true, ignorado: 'sin referencia de BAIREN' });
    const tipoItem = m[1].toLowerCase(), id = m[2];

    const item = (await A.get(`${tipoItem === 'reserva' ? 'reservas' : 'pagos'}?id=eq.${id}&select=id,publicador_id,monto,moneda,estado`))[0];
    if (!item) return json(200, { ok: true, ignorado: 'no existe' });
    // Regla de oro: el dinero se acreditó a quien publica, no a BAIREN
    const vendedor = (await A.get(`mp_credenciales?publicador_id=eq.${item.publicador_id}&select=mp_user_id`))[0];
    if (!vendedor || String(pago.collector_id) !== String(vendedor.mp_user_id)) return json(200, { ok: true, ignorado: 'el cobro no se acreditó a quien publica' });
    if (pago.currency_id !== 'ARS' || item.moneda !== 'ARS' || Number(pago.transaction_amount) + 0.01 < Number(item.monto)) return json(200, { ok: true, ignorado: 'monto o moneda distintos' });

    const ref = ('Mercado Pago ' + pago.id).slice(0, 120);
    const out = tipoItem === 'reserva'
      ? await rpc('confirmar_reserva', { p_reserva: id, p_referencia: ref })
      : await rpc('registrar_pago', { p_pago: id, p_referencia: ref });
    if (out.ok) return json(200, { ok: true, registrado: tipoItem });
    if (/ya está confirmada|ya está paga/i.test(out.error)) return json(200, { ok: true, ya: true });
    return json(200, { ok: false, ignorado: out.error.slice(0, 200) });
  } catch (e) { return json(500, { error: String(e.message || e).slice(0, 300) }); }
};
