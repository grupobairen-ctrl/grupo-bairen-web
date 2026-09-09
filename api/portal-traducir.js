/**
 * BAIREN · Portal · traducción de textos de un aviso (función de Vercel)
 *
 * Traduce título y descripción del castellano al inglés y al portugués con
 * DeepL, que tiene un plan gratis de 500.000 caracteres por mes: alcanza para
 * cientos de avisos sin gastar nada (decisión de Tomás, 9/9/2026: "el que sea
 * más barato"). Sin DEEPL_API_KEY responde 501 y el portal sigue igual.
 *
 * Variables en Vercel:
 *   DEEPL_API_KEY   clave del plan gratis de deepl.com (termina en ":fx")
 *   PORTAL_SUPABASE_URL / PORTAL_SUPABASE_KEY   para validar la sesión del publicador
 *
 * Uso (desde el navegador, con sesión):
 *   POST /api/portal-traducir  Authorization: Bearer <access_token>
 *   { titulo, descripcion, operacion }
 *   → { ok:true, en:{titulo,descripcion}, pt:{titulo,descripcion}, chars }
 *
 * La línea del corredor responsable no se traduce acá: la ficha la agrega sola
 * en cada idioma, a partir de la persona titular (migración 01).
 */
const SUPABASE_URL = process.env.PORTAL_SUPABASE_URL || 'https://dahusnnbyrvltcuaelxj.supabase.co';
const SUPABASE_ANON_KEY = process.env.PORTAL_SUPABASE_KEY || 'sb_publishable_tSRRvyBksexYaiuwJ5YTQw_R_4VNp-0';

async function usuarioDe(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

async function deepl(key, textos, target) {
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const r = await fetch(host + '/v2/translate', {
    method: 'POST',
    headers: { Authorization: 'DeepL-Auth-Key ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: textos, source_lang: 'ES', target_lang: target, formality: 'prefer_less', preserve_formatting: true }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.translations) throw new Error((j.message || 'DeepL') + ' (' + r.status + ')');
  return j.translations.map(t => t.text);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST' }); return; }
  const key = process.env.DEEPL_API_KEY;
  if (!key) { res.status(501).json({ ok: false, configured: false, msg: 'Falta DEEPL_API_KEY en Vercel.' }); return; }

  const user = await usuarioDe(req);
  if (!user) { res.status(401).json({ ok: false, error: 'Hace falta una sesión de publicador.' }); return; }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const titulo = String(b.titulo || '').trim().slice(0, 200);
  const descripcion = String(b.descripcion || '').trim().slice(0, 6000);
  if (!descripcion && !titulo) { res.status(400).json({ ok: false, error: 'No hay texto para traducir.' }); return; }
  const textos = [titulo, descripcion];

  try {
    const [en, pt] = await Promise.all([deepl(key, textos, 'EN-US'), deepl(key, textos, 'PT-BR')]);
    res.status(200).json({ ok: true, en: { titulo: en[0], descripcion: en[1] }, pt: { titulo: pt[0], descripcion: pt[1] }, chars: (titulo.length + descripcion.length) * 2 });
  } catch (e) {
    console.error('[portal-traducir]', e.message);
    res.status(502).json({ ok: false, error: 'No se pudo traducir: ' + e.message });
  }
};
