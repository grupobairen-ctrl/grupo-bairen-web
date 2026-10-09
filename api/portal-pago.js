/**
 * Vercel Function — pagar una seña o una cuota con Mercado Pago (rieles de BAIREN, migración 31)
 *
 * REGLA DE ORO: la plata nunca pasa por una cuenta de BAIREN. Se usa el modelo marketplace de Mercado Pago (split): la
 * preferencia se crea con el token del VENDEDOR (quien publica, conectado por OAuth a la aplicación de BAIREN), así el
 * cobro se acredita directo en su cuenta. BAIREN solo podría tomar una `marketplace_fee` aparte; hoy es 0 porque todo
 * el cobro de BAIREN está en simulación (motor de reglas, escenario "Rieles · octubre 2026").
 *
 * POST /api/portal-pago  { reserva_id } | { pago_id }   con Authorization: Bearer <access_token de la sesión>
 *   → 200 { init_point }   el link de pago de Mercado Pago (Checkout Pro) para quien busca
 *   → 501 { configured:false, error }   mientras falten las claves (o el vendedor no haya conectado su cuenta)
 *   → 401 sin sesión · 403 si la sesión no es la de quien busca en esa operación · 404 · 409 si ya no está pendiente
 *   → 422 si el monto está en dólares (Mercado Pago Argentina cobra en pesos: la seña en USD va por transferencia)
 *   Lo que pasa después lo registra api/portal-mp-webhook.js (confirmar_reserva o registrar_pago, con la clave de servicio).
 *
 * GET /api/portal-pago   con Authorization: Bearer CRON_SECRET (cron de Vercel) o x-portal-key = PORTAL_NOTIFY_KEY
 *   → vence las señas que no se pagaron a tiempo y marca las cuotas atrasadas (portal.vencer_reservas). No necesita
 *     Mercado Pago. Para prenderlo, en vercel.json: { "path": "/api/portal-pago", "schedule": "0,30 * * * *" }.
 *
 * QUÉ HACE FALTA PARA ACTIVAR MERCADO PAGO (hoy no hay claves):
 *   1. Crear la aplicación de BAIREN en https://www.mercadopago.com.ar/developers/panel/app (modelo marketplace, producto
 *      Checkout Pro) y cargar en Vercel:
 *        MP_ACCESS_TOKEN     token de producción de la aplicación de BAIREN (lee pagos si falta el del vendedor)
 *        MP_CLIENT_ID        id de la aplicación (OAuth)
 *        MP_CLIENT_SECRET    secreto de la aplicación (OAuth y renovación de tokens)
 *        MP_WEBHOOK_SECRET   clave secreta de las notificaciones (Webhooks), para validar x-signature
 *        MP_NOTIFICATION_URL opcional: https://<dominio>/api/portal-mp-webhook (por defecto, el host de este pedido)
 *        MP_SANDBOX=1        opcional: devuelve el sandbox_init_point para probar con usuarios de prueba
 *   2. Conectar a cada publicador por OAuth ("Conectar Mercado Pago" en pagos.html, hoy "Muy pronto"): redirigir a
 *      https://auth.mercadopago.com/authorization?client_id=MP_CLIENT_ID&response_type=code&platform_id=mp&state=<pub>&redirect_uri=…
 *      y, con el code, POST https://api.mercadopago.com/oauth/token (grant_type=authorization_code) → guardar con la clave
 *      de servicio en portal.mp_credenciales { publicador_id, mp_user_id, access_token, refresh_token, vence_en } y en
 *      portal.cuentas_cobro una fila { proveedor:'mercadopago', mp_user_id, estado:'activa' }. Ese callback falta escribir.
 *   3. Validar con el abogado y el contador la tarifa (marketplace_fee) antes de pasarla de 0.
 *   Variables del portal que ya existen: PORTAL_SUPABASE_SERVICE_KEY (obligatoria acá), PORTAL_SITE, CRON_SECRET.
 */
const A = require('./_portal/admin');
const MP_API = 'https://api.mercadopago.com';
const MARKETPLACE_FEE = 0;   // BAIREN no cobra nada sobre el pago mientras el motor de cobro esté en simulación
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hits = new Map();
const limite = (clave, max, ventanaMs) => { const now = Date.now(); const h = (hits.get(clave) || []).filter(t => now - t < ventanaMs); h.push(now); hits.set(clave, h); if (hits.size > 5000) hits.clear(); return h.length > max; };

const faltan = () => ['MP_ACCESS_TOKEN', 'MP_CLIENT_ID', 'MP_CLIENT_SECRET'].filter(k => !process.env[k]).concat(A.tieneServiceKey() ? [] : ['PORTAL_SUPABASE_SERVICE_KEY']);

/* El token del vendedor, renovado si venció (OAuth refresh_token). null si no conectó su cuenta. */
async function tokenVendedor(publicadorId) {
  const c = (await A.get(`mp_credenciales?publicador_id=eq.${publicadorId}&select=*`))[0];
  if (!c || !c.access_token) return null;
  if (c.vence_en && new Date(c.vence_en).getTime() < Date.now() + 5 * 60 * 1000 && c.refresh_token) {
    const r = await fetch(`${MP_API}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.MP_CLIENT_ID, client_secret: process.env.MP_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: c.refresh_token }) });
    if (!r.ok) return null;
    const j = await r.json();
    await A.patch(`mp_credenciales?publicador_id=eq.${publicadorId}`, { access_token: j.access_token, refresh_token: j.refresh_token || c.refresh_token,
      vence_en: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null, actualizado_en: new Date().toISOString() }, { prefer: 'return=minimal' });
    return { token: j.access_token, mp_user_id: c.mp_user_id };
  }
  return { token: c.access_token, mp_user_id: c.mp_user_id };
}

module.exports = async (req, res) => {
  const json = A.preparar(req, res, 'GET, POST');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!A.origenPermitido(req)) return json(403, { error: 'origen' });

  /* ── Cron: vencer señas y marcar cuotas atrasadas ── */
  if (req.method === 'GET') {
    if (!A.conCron(req) && !A.conClave(req)) return json(401, { error: 'solo el cron' });
    if (!A.tieneServiceKey()) return json(501, { configured: false, falta: ['PORTAL_SUPABASE_SERVICE_KEY'] });
    try { const n = await A.post('rpc/vencer_reservas', {}); return json(200, { ok: true, vencidas: n }); }
    catch (e) { return json(500, { error: String(e.message || e).slice(0, 300) }); }
  }
  if (req.method !== 'POST') return json(405, { error: 'POST' });

  /* ── Sin claves: 501, sin romper nada (la página ofrece la transferencia) ── */
  const f = faltan();
  if (f.length) return json(501, { configured: false, error: 'Mercado Pago todavía no está configurado', falta: f });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limite('p|' + ip, 20, 10 * 60 * 1000)) return json(429, { error: 'Demasiados pedidos. Probá en unos minutos.' });
  const usuario = await A.usuarioDeSesion(req);
  if (!usuario) return json(401, { error: 'Ingresá para pagar.' });

  let body = req.body;
  if (typeof body === 'string') { if (body.length > 2000) return json(413, { error: 'cuerpo' }); try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body && typeof body === 'object' ? body : {};
  const tipo = body.reserva_id ? 'reserva' : body.pago_id ? 'pago' : null;
  const id = String(body.reserva_id || body.pago_id || '');
  if (!tipo || !UUID_RE.test(id)) return json(400, { error: 'reserva_id o pago_id' });

  try {
    const item = (await A.get(`${tipo === 'reserva' ? 'reservas' : 'pagos'}?id=eq.${id}&select=*`))[0];
    if (!item) return json(404, { error: 'No encontramos ese pago.' });
    const op = (await A.get(`operaciones?id=eq.${item.operacion_id}&select=id,interesado_user,publicador_id,etapa,aviso_id`))[0];
    if (!op) return json(404, { error: 'No encontramos la operación.' });
    // Solo quien busca (el que paga) pide el link
    if (op.interesado_user !== usuario.id) return json(403, { error: 'Este pago no es tuyo.' });
    if (tipo === 'reserva' && (item.estado !== 'pedida' || new Date(item.vence_en).getTime() <= Date.now())) return json(409, { error: 'Esta seña ya no está pendiente.' });
    if (tipo === 'pago' && item.estado !== 'pendiente' && item.estado !== 'vencido') return json(409, { error: 'Esta cuota ya no está pendiente.' });
    if (item.moneda !== 'ARS') return json(422, { error: 'Mercado Pago cobra en pesos. Para un monto en dólares, pagá por transferencia.' });

    // El cobro se acredita al vendedor: sin su cuenta conectada no hay link
    const cuenta = (await A.get(`cuentas_cobro?publicador_id=eq.${item.publicador_id}&proveedor=eq.mercadopago&estado=eq.activa&select=mp_user_id`))[0];
    const vendedor = cuenta ? await tokenVendedor(item.publicador_id) : null;
    if (!vendedor) return json(501, { configured: false, error: 'Quien publica todavía no conectó Mercado Pago.' });

    const aviso = op.aviso_id ? (await A.get(`avisos?id=eq.${op.aviso_id}&select=titulo,direccion`))[0] : null;
    const unidad = (aviso && (aviso.titulo || aviso.direccion)) || 'Propiedad';
    const titulo = tipo === 'reserva' ? `Seña · ${unidad}` : `${item.concepto === 'deposito' ? 'Depósito' : item.concepto === 'expensas' ? 'Expensas' : 'Alquiler'} ${item.periodo} · ${unidad}`;
    const vuelta = `${A.SITE}pagos.html`;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const preferencia = {
      items: [{ id: `${tipo}-${item.id}`, title: titulo.slice(0, 250), quantity: 1, unit_price: Number(item.monto), currency_id: 'ARS' }],
      payer: { email: usuario.email },
      external_reference: `${tipo}:${item.id}`,
      metadata: { tipo, id: item.id, operacion_id: op.id },
      notification_url: process.env.MP_NOTIFICATION_URL || `https://${host}/api/portal-mp-webhook`,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      auto_return: 'approved',
      marketplace_fee: MARKETPLACE_FEE
    };
    if (tipo === 'reserva') { preferencia.expires = true; preferencia.expiration_date_to = new Date(item.vence_en).toISOString(); }
    const r = await fetch(`${MP_API}/checkout/preferences`, { method: 'POST',
      headers: { Authorization: `Bearer ${vendedor.token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `${tipo}-${item.id}-${item.monto}` },
      body: JSON.stringify(preferencia) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json(502, { error: 'Mercado Pago no respondió. Probá de nuevo o pagá por transferencia.', detalle: String(j.message || r.status).slice(0, 200) });
    const link = process.env.MP_SANDBOX === '1' ? (j.sandbox_init_point || j.init_point) : j.init_point;
    if (!link) return json(502, { error: 'Mercado Pago no devolvió el link de pago.' });
    return json(200, { init_point: link });
  } catch (e) { return json(500, { error: String(e.message || e).slice(0, 300) }); }
};
