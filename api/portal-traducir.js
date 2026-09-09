/**
 * BAIREN · Portal · traducción de textos de un aviso (función de Vercel)
 *
 * Traduce título y descripción del castellano al inglés y al portugués.
 * Motor por defecto: MyMemory, gratis sin tarjeta (decisión de Tomás, 9/9/2026:
 * "usemos MyMemory, para probarla"). Con un mail en MYMEMORY_EMAIL el cupo es de
 * 50.000 caracteres por día; sin mail, 5.000. Si algún día hay DEEPL_API_KEY,
 * la función usa DeepL sola, sin tocar nada más.
 *
 * Variables en Vercel:
 *   MYMEMORY_EMAIL   opcional, sube el cupo diario de MyMemory (no se cobra nunca)
 *   DEEPL_API_KEY    opcional, si existe se usa DeepL en lugar de MyMemory
 *   PORTAL_SUPABASE_URL / PORTAL_SUPABASE_KEY   para validar la sesión del publicador
 *
 * Uso (desde el navegador, con sesión):
 *   POST /api/portal-traducir  Authorization: Bearer <access_token>
 *   { titulo, descripcion }
 *   → { ok:true, motor:'mymemory'|'deepl', en:{titulo,descripcion}, pt:{titulo,descripcion}, chars }
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

/* MyMemory acepta hasta 500 bytes por pedido: se parte el texto por oraciones,
   respetando los párrafos, y se traduce de a un trozo. */
function trozos(texto, max = 440) {
  const out = [];
  for (const parrafo of String(texto).split(/\n+/)) {
    const p = parrafo.trim(); if (!p) { out.push(''); continue; }
    let actual = '';
    for (const oracion of p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [p]) {
      if (Buffer.byteLength(actual + oracion) > max && actual) { out.push(actual.trim()); actual = ''; }
      if (Buffer.byteLength(oracion) > max) { for (let i = 0; i < oracion.length; i += 300) out.push(oracion.slice(i, i + 300).trim()); continue; }
      actual += oracion;
    }
    if (actual.trim()) out.push(actual.trim());
    out.push('\n');
  }
  return out;
}

/* Glosario inmobiliario: MyMemory traduce literal ("mono-room", "environments"). Después de
   traducir, se corrigen los términos del rubro con la forma que usa el mercado en cada idioma. */
const GLOSARIO = {
  'es|en': [
    [/\bmono[- ]?(room|environment|ambient)s?\b/gi, 'studio'], [/\bstudio apartment\b/gi, 'studio'],
    [/\benvironments?\b/gi, 'rooms'], [/\b(\d+)\s*rooms?\b/gi, '$1 rooms'],
    [/\bexpenses\b/gi, 'building fees'], [/\bcommon expenses\b/gi, 'building fees'],
    [/\bgarage\b/gi, 'parking space'], [/\bparking lot\b/gi, 'parking space'],
    [/\b(counter[- ]?front|rear[- ]?front)\b/gi, 'rear-facing'], [/\bfront(-facing)? apartment\b/gi, 'street-facing apartment'],
    [/\bto (be )?release(d)?\b/gi, 'brand new'], [/\bbrand[- ]?new to release\b/gi, 'brand new'],
    [/\bfurnished and equipped\b/gi, 'furnished and fully equipped'],
    [/\b(medium|mid)[- ]term rental\b/gi, 'mid-term rental'], [/\blong[- ]term rental\b/gi, 'long-term rental'],
    [/\bowner guarantee\b/gi, 'guarantor'], [/\bproperty guarantee\b/gi, 'guarantor'],
    [/\bcaution insurance\b/gi, 'rental guarantee insurance'],
    [/\bdependence\b/gi, 'service room'], [/\btoilette\b/gi, 'guest toilet'],
    [/\bbalcony run\b/gi, 'wraparound balcony'], [/\bterrace of its own\b/gi, 'private terrace'],
    [/\bPH\b/g, 'PH (townhouse-style apartment)'],
  ],
  'es|pt-BR': [
    [/\bmono[- ]?(sala|ambiente)s?\b/gi, 'estúdio'], [/\bkitnet\b/gi, 'estúdio'],
    [/\bambientes\b/gi, 'cômodos'],
    [/\bexpensas\b/gi, 'condomínio'], [/\bdespesas comuns\b/gi, 'condomínio'],
    [/\bcochera\b/gi, 'vaga de garagem'], [/\bgaragem\b/gi, 'vaga de garagem'],
    [/\bcontrafrente\b/gi, 'fundos'], [/\ba estrear\b/gi, 'novo, nunca habitado'],
    [/\bmobiliado e equipado\b/gi, 'mobiliado e totalmente equipado'],
    [/\baluguel de m[eé]dio prazo\b/gi, 'aluguel de médio prazo'],
    [/\bgarantia propriet[aá]ria\b/gi, 'fiador'], [/\bseguro (de )?cau[cç][aã]o\b/gi, 'seguro fiança'],
    [/\btoilette\b/gi, 'lavabo'],
  ],
};
function glosar(texto, par) { let s = texto; for (const [re, rep] of (GLOSARIO[par] || [])) s = s.replace(re, rep); return s; }

async function mymemory(texto, par, email) {
  if (!texto) return '';
  const partes = [];
  for (const t of trozos(texto)) {
    if (t === '' || t === '\n') { partes.push(t); continue; }
    const u = new URL('https://api.mymemory.translated.net/get');
    u.searchParams.set('q', t); u.searchParams.set('langpair', par); if (email) u.searchParams.set('de', email);
    const r = await fetch(u); const j = await r.json().catch(() => ({}));
    const ok = r.ok && j.responseData && j.responseStatus === 200 && j.responseData.translatedText;
    if (!ok) throw new Error((j.responseDetails || 'MyMemory') + ' (' + (j.responseStatus || r.status) + ')');
    partes.push(j.responseData.translatedText);
  }
  return glosar(partes.join(' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), par);
}

async function deepl(key, textos, target) {
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const r = await fetch(host + '/v2/translate', { method: 'POST', headers: { Authorization: 'DeepL-Auth-Key ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: textos, source_lang: 'ES', target_lang: target, formality: 'prefer_less', preserve_formatting: true }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.translations) throw new Error((j.message || 'DeepL') + ' (' + r.status + ')');
  return j.translations.map(t => t.text);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST' }); return; }
  const user = await usuarioDe(req);
  if (!user) { res.status(401).json({ ok: false, error: 'Hace falta una sesión de publicador.' }); return; }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const titulo = String(b.titulo || '').trim().slice(0, 200);
  const descripcion = String(b.descripcion || '').trim().slice(0, 6000);
  if (!descripcion && !titulo) { res.status(400).json({ ok: false, error: 'No hay texto para traducir.' }); return; }
  const chars = (titulo.length + descripcion.length) * 2;

  try {
    if (process.env.DEEPL_API_KEY) {
      const [en, pt] = await Promise.all([deepl(process.env.DEEPL_API_KEY, [titulo, descripcion], 'EN-US'), deepl(process.env.DEEPL_API_KEY, [titulo, descripcion], 'PT-BR')]);
      res.status(200).json({ ok: true, motor: 'deepl', en: { titulo: en[0], descripcion: en[1] }, pt: { titulo: pt[0], descripcion: pt[1] }, chars }); return;
    }
    const email = process.env.MYMEMORY_EMAIL || '';
    const en = { titulo: await mymemory(titulo, 'es|en', email), descripcion: await mymemory(descripcion, 'es|en', email) };
    const pt = { titulo: await mymemory(titulo, 'es|pt-BR', email), descripcion: await mymemory(descripcion, 'es|pt-BR', email) };
    res.status(200).json({ ok: true, motor: 'mymemory', en, pt, chars });
  } catch (e) {
    console.error('[portal-traducir]', e.message);
    res.status(502).json({ ok: false, error: 'No se pudo traducir: ' + e.message });
  }
};
