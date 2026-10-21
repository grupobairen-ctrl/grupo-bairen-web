/**
 * Vercel Function — "Embellecer con IA" del admin
 *
 * Recibe UNA foto del admin.html, entera, y la devuelve como si un fotógrafo de
 * arquitectura la hubiera vuelto a sacar: la IA la vuelve a encuadrar en 4:5 sin
 * tocar la unidad (arquitectura, muebles, colores, textos). Es el prompt que Tomás
 * usa en ChatGPT. Si la foto trae marca de agua o logo encima, la saca (5/10/2026).
 * Corre por la API de OpenAI (se paga por foto, sin ChatGPT Plus).
 *
 * 9/10/2026: se había pasado a un retoque de la misma toma, con la foto recortada
 * al centro en 4:5 antes de llegar a la IA y salida de 1024x1280.
 * 21/10/2026: Tomás pidió volver a su prompt. El recorte le sacaba los costados a
 * las fotos apaisadas y la salida quedaba más chica que en ChatGPT; ahora la IA
 * recibe la foto entera, la encuadra ella en 4:5 (como en ChatGPT) y sale a 1536x1920.
 *
 * Variables en Vercel (proyecto grupo-bairen-web, entorno Production):
 *   OPENAI_API_KEY        clave de platform.openai.com. Sin ella responde 501.
 *   ADMIN_EMAILS          mails que pueden usar el botón, separados por coma.
 *                         Sin ella responde 501: tener sesión no alcanza para gastar la
 *                         clave (el registro de Supabase estuvo abierto hasta el 1/10/2026).
 *   OPENAI_IMAGE_MODEL    opcional, por defecto 'gpt-image-2.5-sunburst' (el más fiel al editar).
 *   OPENAI_IMAGE_QUALITY  opcional, por defecto 'high' ('medium' empasta textos chicos;
 *                         'xhigh' y 'max' existen y cuestan más).
 *   OPENAI_IMAGE_SIZE     opcional, por defecto '1536x1920' (4:5, ≈ USD 0,15 por foto).
 *                         '1024x1280' es el tamaño anterior (≈ USD 0,06).
 *
 * Uso (desde admin.html, con sesión):
 *   POST /api/embellecer   Authorization: Bearer <access_token de Supabase>
 *   { image: 'data:image/jpeg;base64,…' }
 *   → { ok:true, image:'data:image/jpeg;base64,…', model, quality, size, ms, usage }
 *
 * No toca la base ni el storage: el admin reemplaza la foto en la grilla y la
 * sube recién al guardar, como cualquier foto nueva.
 */

const SUPABASE_URL = 'https://nmrjyyrhwjroonrppnka.supabase.co';
// Anon key pública por diseño (los datos los protege RLS) — ver supabase-config.js
const SUPABASE_ANON_KEY = 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';

// El prompt de Tomás, igual al que pega en ChatGPT. Dos cambios: sin el corchete de
// textos (en ChatGPT se completa a mano, foto por foto) y con el párrafo de las marcas
// de agua, porque muchas fotos vienen de portales con logo encima.
const PROMPT = `Re-shoot this exact photograph as if a world-class architectural photographer had come to the property and taken it again for an editorial magazine feature (ArchDaily / Dezeen / Divisare standard). Two goals, in this order:

1. PERFECT COMPOSITION (required): do NOT keep the original framing. Treat the original framing as a rough draft to correct, not as a reference. Recompose the shot from the ideal camera position and angle for this space: centered, balanced composition; a clean frontal one-point perspective, or a corner two-point perspective if it shows the space better; perfectly vertical lines, as if shot on a 17mm tilt-shift lens on a tripod at chest height, camera perfectly level; straight horizon; comfortable margins, nothing important cut off at the edges.

2. THE PROPERTY IS LOCKED: it must remain exactly the same real place, only photographed better.

- Same architecture: layout, walls, ceiling height, real dimensions and proportions, doors, windows, moldings, columns, stairs, floors.

- Same furniture and objects: identical pieces, same positions, same sizes, same colors, same materials. Do not add, remove, replace or upgrade anything. No new plants, lamps, artwork or decor.

- Same wall colors, same floor, same textures and materials, true to the original.

- Same view through the windows.

- Every visible text must remain identical, sharp and legible: signs, building name, unit numbers, posters, brand names.

- If the new angle reveals areas not visible in the original photo, extend the existing architecture and surfaces logically and consistently; never invent new windows, doors, furniture or decor.

- Watermarks are NOT part of the place: if the photo has a watermark, logo, text, timestamp or stamp overlaid on top of the image (for example a real estate agency or listing portal logo), remove it completely. This applies only to graphics added on top of the photo, never to real signs or objects in the scene.

Photography quality:

- Light: relight the scene as a master architectural photographer would, with natural daylight only, coming exclusively through the real windows and openings of the space. Soft diffused mid-morning light: even and realistic, gentle falloff, shadows with natural detail. All artificial and ceiling lights off. Balanced exposure: interior perfectly exposed and the view through the windows still visible. No blown-out windows, no fake HDR look, no halos.

- Color: neutral professional white balance (clean daylight, no yellow or warm cast), true-to-material colors, restrained editorial color grade, clean whites, shadows with natural detail.

- Technique: everything in focus (f/8, ISO 100), zero noise, no lens distortion, crisp high-resolution detail.

The result must be a photorealistic photograph, indistinguishable from a real photo. Not a 3D render, not an illustration, no painterly or over-sharpened textures. Format: 4:5`;

async function usuarioDe(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Solo POST.' });

  const key = process.env.OPENAI_API_KEY;
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!key || !admins.length) {
    return res.status(501).json({ ok: false, error: 'Falta configurar OPENAI_API_KEY o ADMIN_EMAILS en Vercel.' });
  }

  const user = await usuarioDe(req);
  if (!user) return res.status(401).json({ ok: false, error: 'La sesión venció. Volvé a ingresar.' });
  if (!admins.includes(String(user.email || '').toLowerCase())) {
    return res.status(403).json({ ok: false, error: 'Tu usuario no tiene permiso para usar la IA.' });
  }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(b.image || ''));
  if (!m) return res.status(400).json({ ok: false, error: 'No llegó una imagen válida.' });
  const bytes = Buffer.from(m[2], 'base64');

  const model   = process.env.OPENAI_IMAGE_MODEL   || 'gpt-image-2.5-sunburst';
  const quality = process.env.OPENAI_IMAGE_QUALITY || 'high';
  const size    = process.env.OPENAI_IMAGE_SIZE    || '1536x1920';

  const fd = new FormData();
  fd.append('model', model);
  fd.append('image', new Blob([bytes], { type: m[1] }), 'original.' + m[1].split('/')[1]);
  fd.append('prompt', PROMPT);
  fd.append('size', size);
  fd.append('quality', quality);
  fd.append('output_format', 'jpeg');
  fd.append('output_compression', '90');
  fd.append('n', '1');

  const t0 = Date.now();
  let r, j;
  try {
    r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key },
      body: fd,
    });
    j = await r.json().catch(() => ({}));
  } catch (err) {
    console.error('[embellecer] red', err);
    return res.status(502).json({ ok: false, error: 'No pude conectar con OpenAI.' });
  }
  if (!r.ok || !j.data || !j.data[0] || !j.data[0].b64_json) {
    console.error('[embellecer] OpenAI', r.status, JSON.stringify(j).slice(0, 400));
    // 400 (foto rechazada) y 429 (límite por minuto) se pasan tal cual para que el admin sepa si reintentar
    const status = r.status === 400 || r.status === 429 ? r.status : 502;
    return res.status(status).json({ ok: false, error: (j.error && j.error.message) || 'OpenAI no devolvió una imagen.' });
  }

  console.log('[embellecer]', user.email, model, quality, size, Date.now() - t0 + 'ms', JSON.stringify(j.usage || {}));
  res.status(200).json({
    ok: true,
    image: 'data:image/jpeg;base64,' + j.data[0].b64_json,
    model, quality, size,
    ms: Date.now() - t0,
    usage: j.usage || null,
  });
};
