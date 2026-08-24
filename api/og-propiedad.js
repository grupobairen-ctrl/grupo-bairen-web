/**
 * Vercel Function — OG tags por propiedad
 *
 * WhatsApp/Facebook/Google no ejecutan JavaScript: cuando piden la ficha de
 * una propiedad ven el HTML crudo de propiedad.html con los meta tags
 * genéricos (placa con logo). Esta función sirve propiedad.html con los meta
 * tags reescritos con la foto de portada, título y descripción de ESA
 * propiedad, leídos de Supabase.
 *
 * Llega acá vía los rewrites de vercel.json:
 *   /propiedades/<slug>        → /api/og-propiedad?slug=<slug>
 *   /propiedad.html?slug=<x>   → /api/og-propiedad?slug=<x>
 * (propiedad.html SIN query no se reescribe — eso evita un loop cuando esta
 * función lo fetchea para usarlo de plantilla)
 *
 * Si algo falla (slug inexistente, Supabase caído), devuelve el HTML sin
 * tocar: la página funciona igual, con la placa de logo como preview.
 *
 * Mantener la lógica de título/descripción espejada con renderProperty()
 * en propiedad.html.
 */

const SUPABASE_URL = 'https://nmrjyyrhwjroonrppnka.supabase.co';
// Anon key pública por diseño (los datos los protege RLS) — ver supabase-config.js
const SUPABASE_ANON_KEY = 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';
const SITE_ROOT = 'https://www.bairengroup.com';

module.exports = async (req, res) => {
  let html;
  try {
    const r = await fetch(`${SITE_ROOT}/propiedad.html`);
    if (!r.ok) throw new Error(`propiedad.html ${r.status}`);
    html = await r.text();
  } catch (err) {
    res.statusCode = 302;
    res.setHeader('Location', '/catalogo.html');
    return res.end();
  }

  const slug = String(req.query.slug || '');
  let p = null;
  if (slug) {
    try {
      const q = new URLSearchParams({
        slug: `eq.${slug}`,
        publicada: 'eq.true',
        select: 'slug,dir,unidad,barrio,tipo,descripcion,imagenes(url,orden)',
        limit: '1',
      });
      const r = await fetch(`${SUPABASE_URL}/rest/v1/propiedades?${q}`, {
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) p = (await r.json())[0] || null;
    } catch (_) {
      // Sin datos → servimos el HTML genérico tal cual
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.end(p ? injectMeta(html, p) : html);
};

function injectMeta(html, p) {
  const titleFull = p.dir + (p.unidad ? ' ' + p.unidad : '');
  const pageUrl = `${SITE_ROOT}/propiedades/${p.slug}`;
  const fotos = (p.imagenes || []).slice().sort((a, b) => a.orden - b.orden);
  const ogImg = fotos[0]?.url || `${SITE_ROOT}/og-logo.jpg`;

  const isVenta = p.tipo === 'Venta';
  const tipoLabel = p.tipo === 'Ambos' ? 'a mediano o largo plazo' : (p.tipo === 'Temporal' ? 'a mediano plazo' : p.tipo === 'Tradicional' ? 'a largo plazo' : p.tipo.toLowerCase());
  const descSEO = (p.descripcion && p.descripcion.length > 30)
    ? p.descripcion.slice(0, 160).replace(/\s+\S*$/, '') + '…'
    : `${titleFull} en ${p.barrio}, Buenos Aires. ${isVenta ? 'Venta' : 'Alquiler ' + tipoLabel} — BAIREN.`;

  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(titleFull)} — ${esc(p.barrio)} — BAIREN</title>`);
  out = setAttr(out, 'meta name="robots"', 'content', 'index, follow');
  out = setAttr(out, 'meta name="description"', 'content', descSEO);
  out = setAttr(out, 'link id="metaCanonical"', 'href', pageUrl);
  out = setAttrById(out, 'metaOgTitle', `${titleFull} — BAIREN`);
  out = setAttrById(out, 'metaOgDesc', descSEO);
  out = setAttrById(out, 'metaOgImage', ogImg);
  out = setAttrById(out, 'metaOgUrl', pageUrl);
  out = setAttrById(out, 'metaTwTitle', `${titleFull} — BAIREN`);
  out = setAttrById(out, 'metaTwDesc', descSEO);
  out = setAttrById(out, 'metaTwImage', ogImg);
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();
}

function setAttr(html, tagPrefix, attr, value) {
  const re = new RegExp(`(<${tagPrefix}[^>]*?\\s${attr}=")[^"]*(")`);
  return html.replace(re, `$1${esc(value)}$2`);
}

function setAttrById(html, id, value) {
  const re = new RegExp(`(<meta\\s+id="${id}"[^>]*?\\scontent=")[^"]*(")`);
  return html.replace(re, `$1${esc(value)}$2`);
}

module.exports.injectMeta = injectMeta;
