/**
 * BAIREN · Portal · producción de fotos con IA (función de Vercel)
 *
 * Toma UNA foto real de una unidad y la "vuelve a sacar" como lo haría un fotógrafo
 * de arquitectura, sin cambiar la propiedad, con el prompt maestro de Bairen
 * (vault: "Prompt — Fotos de Unidades con IA"). Corre con el modelo de imágenes de
 * OpenAI, por decisión de Tomás (9/9/2026): las fotos se hacen con GPT, no con Claude.
 *
 * Variables en Vercel:
 *   OPENAI_API_KEY        clave de platform.openai.com. Sin ella responde 501 {configured:false}.
 *   OPENAI_IMAGE_MODEL    opcional, por defecto 'gpt-image-2'.
 *   OPENAI_IMAGE_SIZE     opcional, por defecto '1536x1024' (apaisado 3:2). Vertical: '1024x1536'.
 *   PORTAL_SUPABASE_URL / PORTAL_SUPABASE_KEY   el proyecto del portal (para validar la sesión y la foto).
 *
 * Cómo se usa (desde el navegador, con sesión de publicador):
 *   POST /api/portal-produccion  Authorization: Bearer <access_token de Supabase>
 *   { url, textos?, luz?, formato?, indicacion? }
 *     url        foto original, pública, alojada en el storage del portal
 *     textos     lo que dicen los carteles visibles, exacto (opcional)
 *     luz        'editorial' (default) | 'sol' | 'exterior-dia' | 'exterior-atardecer'
 *     formato    'apaisado' (default) | 'vertical'
 *     indicacion frase final para dirigir la toma, ej. "wider shot showing the whole living room"
 *   → { ok:true, image:'data:image/png;base64,…', model, size }   la sube el navegador con uploadFoto
 *
 * Lo que NO hace, a propósito: no toca la base ni el storage. El navegador decide si la
 * publica, después de compararla con la original (es regeneración, no retoque).
 */
const SUPABASE_URL = process.env.PORTAL_SUPABASE_URL || 'https://dahusnnbyrvltcuaelxj.supabase.co';
const SUPABASE_ANON_KEY = process.env.PORTAL_SUPABASE_KEY || 'sb_publishable_tSRRvyBksexYaiuwJ5YTQw_R_4VNp-0';

const PROMPT_MAESTRO = `Re-shoot this exact photograph as if a world-class architectural photographer had come to the property and taken it again for an editorial magazine feature (ArchDaily / Dezeen / Divisare standard). Two goals, in this order:

1. PERFECT COMPOSITION (required): do NOT keep the original framing. Treat the original framing as a rough draft to correct, not as a reference. Recompose the shot from the ideal camera position and angle for this space: shoot from the center of the space, camera centered on the room's axis, angle perfectly straight; centered, balanced composition; a clean frontal one-point perspective, or a corner two-point perspective if it shows the space better; perfectly vertical lines, as if shot on a 17mm tilt-shift lens on a tripod at chest height, camera perfectly level; straight horizon; comfortable margins, nothing important cut off at the edges.

2. THE PROPERTY IS LOCKED: it must remain exactly the same real place, only photographed better.
- Same architecture: layout, walls, ceiling height, real dimensions and proportions, doors, windows, moldings, columns, stairs, floors.
- Same furniture and objects: identical pieces, same positions, same sizes, same colors, same materials. Do not add, remove, replace or upgrade anything. No new plants, lamps, artwork or decor.
- Same wall colors, same floor, same textures and materials, true to the original.
- Same view through the windows.
- Every visible text must remain identical, sharp and legible: signs, building name, unit numbers, posters, brand names.{TEXTOS}
- If the new angle reveals areas not visible in the original photo, extend the existing architecture and surfaces logically and consistently; never invent new windows, doors, furniture or decor.{EXTERIOR}

Photography quality:
- Light: {LUZ}
- Color: neutral professional white balance (clean daylight, no yellow or warm cast), true-to-material colors, restrained editorial color grade, clean whites, shadows with natural detail.
- Technique: everything in focus (f/8, ISO 100), zero noise, no lens distortion, crisp high-resolution detail.

The result must be a photorealistic photograph, indistinguishable from a real photo. Not a 3D render, not an illustration, no painterly or over-sharpened textures. Format: {FORMATO}.{INDICACION}`;

const LUZ = {
  'editorial': 'relight the scene as a master architectural photographer would, with natural daylight only, coming exclusively through the real windows and openings of the space. Soft diffused mid-morning light: even and realistic, gentle falloff, shadows with natural detail. All artificial and ceiling lights off. Balanced exposure: interior perfectly exposed and the view through the windows still visible. No blown-out windows, no fake HDR look, no halos.',
  'sol': 'warm directional sunlight entering through the real windows at a low late-afternoon angle, drawing defined shafts and patches of sunlight on floors and walls, with shadows that model the volumes of the architecture. Realistic contrast: highlights held, shadow detail retained. All artificial lights off. The sun direction must be physically consistent with the windows of the space. No blown-out windows, no fake HDR look, no halos.',
  'exterior-dia': 'soft directional daylight, clear sky, sun gently modeling the volumes of the facade. Realistic sky, no oversaturated blue.',
  'exterior-atardecer': 'twilight, 20 minutes after sunset, deep blue sky, warm interior lights glowing in the windows. Realistic, no HDR look.',
};
const EXTERIOR = '\n- Same facade materials, same street, sidewalk, trees and surroundings. The street number and building name stay identical and legible.';

function armarPrompt(b) {
  const luz = LUZ[b.luz] || LUZ.editorial;
  const esExterior = /^exterior/.test(b.luz || '');
  const textos = b.textos && String(b.textos).trim() ? ` [TEXTS VISIBLE IN THIS PHOTO: "${String(b.textos).trim().replace(/"/g, "'")}"]` : '';
  const formato = b.formato === 'vertical' ? 'portrait 4:5' : 'landscape 3:2';
  const ind = b.indicacion && String(b.indicacion).trim() ? `\nFor this photo: ${String(b.indicacion).trim().slice(0, 300)}` : '';
  return PROMPT_MAESTRO.replace('{TEXTOS}', textos).replace('{EXTERIOR}', esExterior ? EXTERIOR : '').replace('{LUZ}', luz).replace('{FORMATO}', formato).replace('{INDICACION}', ind);
}

async function usuarioDe(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST' }); return; }
  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(501).json({ ok: false, configured: false, msg: 'Falta OPENAI_API_KEY en Vercel.' }); return; }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const url = String(b.url || '');
  if (!url.startsWith(SUPABASE_URL + '/storage/v1/object/public/')) { res.status(400).json({ ok: false, error: 'La foto tiene que estar en el storage del portal.' }); return; }

  const user = await usuarioDe(req);
  if (!user) { res.status(401).json({ ok: false, error: 'Hace falta una sesión de publicador.' }); return; }

  const foto = await fetch(url);
  if (!foto.ok) { res.status(400).json({ ok: false, error: 'No pude leer la foto original.' }); return; }
  const tipo = foto.headers.get('content-type') || 'image/jpeg';
  const bytes = Buffer.from(await foto.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024) { res.status(413).json({ ok: false, error: 'La foto pesa más de 20 MB.' }); return; }

  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const size = process.env.OPENAI_IMAGE_SIZE || (b.formato === 'vertical' ? '1024x1536' : '1536x1024');
  const fd = new FormData();
  fd.append('model', model);
  fd.append('image', new Blob([bytes], { type: tipo }), 'original.' + (tipo.includes('png') ? 'png' : 'jpg'));
  fd.append('prompt', armarPrompt(b));
  fd.append('size', size);
  fd.append('quality', 'high');
  fd.append('n', '1');

  const t0 = Date.now();
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.data || !j.data[0]) {
    console.error('[portal-produccion] OpenAI', r.status, JSON.stringify(j).slice(0, 400));
    res.status(502).json({ ok: false, error: (j.error && j.error.message) || 'OpenAI no devolvió una imagen.', status: r.status }); return;
  }
  const d = j.data[0];
  const image = d.b64_json ? 'data:image/png;base64,' + d.b64_json : (d.url || null);
  res.status(200).json({ ok: true, image, model, size, ms: Date.now() - t0, usage: j.usage || null });
};
