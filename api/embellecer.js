/**
 * Vercel Function — "Embellecer con IA" del admin
 *
 * Recibe UNA foto del admin.html y la devuelve retocada como lo haría un
 * retocador profesional: misma toma, mismo encuadre, mismos muebles; cambian
 * solo la luz, el color, la nitidez y las líneas torcidas. Si la foto trae marca
 * de agua o logo encima, la saca (5/10/2026).
 * Corre por la API de OpenAI (se paga por foto, sin ChatGPT Plus).
 *
 * 9/10/2026: el prompt anterior pedía "volver a sacar" la foto desde otro ángulo
 * y la salida era siempre 4:5. Para recomponer la toma, la IA redibujaba el
 * ambiente entero y cambiaba la perspectiva, los muebles y las medidas. Ahora se
 * pide un retoque de la misma toma, y la salida tiene la proporción de la original.
 *
 * Variables en Vercel (proyecto grupo-bairen-web, entorno Production):
 *   OPENAI_API_KEY        clave de platform.openai.com. Sin ella responde 501.
 *   ADMIN_EMAILS          mails que pueden usar el botón, separados por coma.
 *                         Sin ella responde 501: tener sesión no alcanza para gastar la
 *                         clave (el registro de Supabase estuvo abierto hasta el 1/10/2026).
 *   OPENAI_IMAGE_MODEL    opcional, por defecto 'gpt-image-2.5-sunburst' (el más fiel al editar).
 *   OPENAI_IMAGE_QUALITY  opcional, por defecto 'high' (≈ USD 0,06 por foto; 'medium' ≈ 0,026 empasta
 *                         textos chicos; 'xhigh' y 'max' existen y cuestan más).
 *   OPENAI_IMAGE_SIZE     opcional. Sin ella, la proporción de la foto original con los
 *                         mismos píxeles que el 1024x1280 de antes (mismo costo por foto).
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

const PROMPT = `Edit this real estate photo the way a professional photo retoucher would. This is a retouch of the SAME photograph: not a new photo, not a re-shoot, not a redesign. A person who knows the place must recognize it instantly and find nothing changed except the photo quality.

KEEP EXACTLY AS IN THE ORIGINAL:

- Camera: same position, height, angle, lens and field of view. Same framing and crop, same perspective and vanishing points. Every wall, door, window, piece of furniture and object stays in the same place in the frame and at the same size. Do not zoom, rotate, widen or recompose.

- Architecture: layout, walls, ceiling height, real dimensions and proportions, doors, windows, moldings, columns, stairs, floors.

- Furniture and objects: the same pieces, in the same positions, with the same sizes, shapes, colors and materials. Do not add, remove, move, replace, upgrade or restyle anything. No new plants, lamps, artwork, cushions or decor. Do not tidy up or declutter.

- Wall colors, floor, textures and materials, true to the original.

- The view through the windows.

- Every text that physically exists in the place stays identical, sharp and legible: signs, building name, unit numbers, posters, brand names.

IMPROVE ONLY THIS:

- Exposure: lift dark shadows and bring down blown highlights, so the interior is evenly and naturally exposed and the view through the windows is still visible, as a professional exposure blend would. Keep the real light of the photo: same light sources, same direction, same time of day. Do not add sunlight, sun rays, lamps or light effects.

- Color: neutral white balance (remove yellow, green or blue casts), true-to-material colors, clean whites, natural contrast. Restrained and realistic, not saturated.

- Lines: if the camera was slightly tilted, straighten the vertical lines and the horizon. Only a subtle correction; never change the viewpoint.

- Clarity: remove noise and blur, crisp natural detail.

- Watermarks are NOT part of the place: if the photo has a watermark, logo, text, timestamp or stamp overlaid on top of the image (for example a real estate agency or listing portal logo, semi-transparent lettering, lines or a corner stamp), remove it completely and reconstruct what is behind it, so the result looks as if it was never there. This applies only to graphics added on top of the photo, never to real signs or objects in the scene.

The result must look like the original photo after a professional edit: a real photograph, indistinguishable from one taken with a good camera. Not a 3D render, not an illustration, not an AI image. Keep real textures and natural imperfections: no plastic, waxy or over-smoothed surfaces, no over-sharpening, no HDR look, no halos, no glow.`;

// Medidas de la foto que llega (el admin siempre manda JPG; PNG por las dudas).
// Sin medidas legibles devuelve null y se usa size 'auto'.
function medidas(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0 a SOF15 traen alto y ancho (C4, C8 y CC son otra cosa)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

// Misma proporción que la original, para que la IA no tenga que recortar ni
// inventar bordes, con los mismos píxeles que el 1024x1280 de antes (mismo
// costo). OpenAI pide lados múltiplos de 16 y proporción entre 1:3 y 3:1.
function tamanoPara(buf) {
  const m = medidas(buf);
  if (!m || !m.w || !m.h) return 'auto';
  const r = Math.min(3, Math.max(1 / 3, m.w / m.h));
  let w = Math.round(Math.sqrt(1024 * 1280 * r) / 16) * 16;
  let h = Math.round(w / r / 16) * 16;
  // El redondeo a 16 puede pasar apenas de 3:1 en las panorámicas
  if (w > 3 * h) h += 16;
  if (h > 3 * w) w += 16;
  return w + 'x' + h;
}

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
  const size    = process.env.OPENAI_IMAGE_SIZE    || tamanoPara(bytes);

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
