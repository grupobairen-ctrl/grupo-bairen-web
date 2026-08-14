/**
 * Edge Function — OG tags por propiedad
 *
 * WhatsApp/Facebook/Google no ejecutan JavaScript: cuando piden
 * /propiedades/<slug> ven el HTML crudo de propiedad.html, que trae los
 * meta tags genéricos (placa con logo). Esta función intercepta el request,
 * busca la propiedad en Supabase y reescribe los meta tags en el HTML antes
 * de responder, para que la preview del link muestre la foto de portada y
 * la descripción de ESA propiedad.
 *
 * Si algo falla (slug inexistente, Supabase caído), devuelve el HTML sin
 * tocar: la página sigue funcionando igual que hoy, con la placa de logo.
 *
 * Mantener la lógica de título/descripción espejada con renderProperty()
 * en propiedad.html.
 */

const SUPABASE_URL = 'https://nmrjyyrhwjroonrppnka.supabase.co';
// Anon key pública por diseño (los datos los protege RLS) — ver supabase-config.js
const SUPABASE_ANON_KEY = 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';
const SITE_ROOT = 'https://bairengroup.com';

export default async function handler(request, context) {
  const response = await context.next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const slug = new URL(request.url).pathname.split('/').filter(Boolean).pop();
  if (!slug || slug === 'propiedades') return response;

  let p = null;
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
    // Sin datos → respondemos el HTML genérico tal cual
  }
  if (!p) return response;

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(injectMeta(html, p), { status: response.status, headers });
}

export function injectMeta(html, p) {
  const titleFull = p.dir + (p.unidad ? ' ' + p.unidad : '');
  const pageUrl = `${SITE_ROOT}/propiedades/${p.slug}`;
  const fotos = (p.imagenes || []).slice().sort((a, b) => a.orden - b.orden);
  const ogImg = fotos[0]?.url || `${SITE_ROOT}/og-logo.jpg`;

  const isVenta = p.tipo === 'Venta';
  const tipoLabel = p.tipo === 'Ambos' ? 'temporal o tradicional' : p.tipo.toLowerCase();
  const descSEO = (p.descripcion && p.descripcion.length > 30)
    ? p.descripcion.slice(0, 160).replace(/\s+\S*$/, '') + '…'
    : `${titleFull} en ${p.barrio}, Buenos Aires. ${isVenta ? 'Venta' : 'Alquiler ' + tipoLabel} — Grupo Bairen.`;

  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(titleFull)} — ${esc(p.barrio)} — Grupo Bairen</title>`);
  out = setAttr(out, 'meta name="robots"', 'content', 'index, follow');
  out = setAttr(out, 'meta name="description"', 'content', descSEO);
  out = setAttr(out, 'link id="metaCanonical"', 'href', pageUrl);
  out = setAttrById(out, 'metaOgTitle', `${titleFull} — Grupo Bairen`);
  out = setAttrById(out, 'metaOgDesc', descSEO);
  out = setAttrById(out, 'metaOgImage', ogImg);
  out = setAttrById(out, 'metaOgUrl', pageUrl);
  out = setAttrById(out, 'metaTwTitle', `${titleFull} — Grupo Bairen`);
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

export const config = { path: '/propiedades/*' };
