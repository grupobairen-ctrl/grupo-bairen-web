/**
 * Vercel Function: sitemap del portal
 *
 * GET /portal/sitemap.xml  →  /api/sitemap-portal  (rewrite en vercel.json)
 *
 * Arma un urlset con las páginas fijas del portal (portada, búsqueda por
 * operación, publicadores, emprendimientos, criterios, PSI) y una URL por
 * aviso publicado (https://www.bairengroup.com/portal/propiedad-<id>, con
 * lastmod = updated_at). Lee la base del portal con la clave pública: RLS
 * solo deja ver lo publicado, así que nada en borrador o pausado sale acá.
 *
 * Nunca 500: si la base no responde, sale el sitemap con las páginas fijas
 * solas y un caché corto para que el próximo pedido vuelva a intentar.
 *
 * El sitemap.xml y el robots.txt de la raíz son del sitio viejo (main) y no
 * se tocan. Al salir a producción: agregar a robots.txt la línea
 * "Sitemap: https://www.bairengroup.com/portal/sitemap.xml" y sacar los
 * noindex de las páginas del portal (ver portal/README.md, "Compartir y sitemap").
 */

const PORTAL_URL = 'https://dahusnnbyrvltcuaelxj.supabase.co';
// Clave publishable, pública por diseño (la misma de portal/supabase-portal.js)
const PORTAL_KEY = 'sb_publishable_tSRRvyBksexYaiuwJ5YTQw_R_4VNp-0';
const SITE_ROOT = 'https://www.bairengroup.com';
const PORTAL_ROOT = `${SITE_ROOT}/portal`;

const CACHE_OK = 'public, s-maxage=3600, stale-while-revalidate=86400';
const CACHE_SIN_BASE = 'public, s-maxage=60, stale-while-revalidate=600';

/* Páginas fijas, con las URLs bonitas cuando el rewrite existe (vercel.json) y
   el .html cuando no (criterios y psi no tienen rewrite hoy). */
const FIJAS = [
  { loc: `${PORTAL_ROOT}/`, priority: '1.0', changefreq: 'daily', conAvisos: true },
  { loc: `${PORTAL_ROOT}/departamentos-venta-buenos-aires`, priority: '0.9', changefreq: 'daily', conAvisos: true },
  { loc: `${PORTAL_ROOT}/departamentos-alquiler-buenos-aires`, priority: '0.9', changefreq: 'daily', conAvisos: true },
  { loc: `${PORTAL_ROOT}/emprendimientos`, priority: '0.8', changefreq: 'weekly', conAvisos: true },
  { loc: `${PORTAL_ROOT}/publicadores`, priority: '0.7', changefreq: 'weekly' },
  { loc: `${PORTAL_ROOT}/criterios.html`, priority: '0.6', changefreq: 'monthly' },
  { loc: `${PORTAL_ROOT}/psi.html`, priority: '0.6', changefreq: 'monthly' },
];

module.exports = async (req, res) => {
  let avisos = null;
  try { avisos = await leerAvisos(); } catch (_) { avisos = null; }

  let xml;
  try { xml = armarXml(avisos || []); }
  catch (_) { xml = armarXml([]); }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', avisos ? CACHE_OK : CACHE_SIN_BASE);
  res.end(xml);
};

async function leerAvisos() {
  const q = new URLSearchParams({
    select: 'id,updated_at,publicado_en',
    estado_curacion: 'eq.publicado',
    order: 'updated_at.desc',
    limit: '5000',
  });
  const r = await fetch(`${PORTAL_URL}/rest/v1/avisos?${q}`, {
    headers: { apikey: PORTAL_KEY, Authorization: `Bearer ${PORTAL_KEY}`, 'Accept-Profile': 'portal' },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) return null;
  const filas = await r.json();
  return Array.isArray(filas) ? filas.filter(a => a && a.id) : null;
}

function armarXml(avisos) {
  const ultimo = avisos.map(a => fecha(a.updated_at || a.publicado_en)).filter(Boolean).sort().pop() || null;
  const urls = [];
  for (const p of FIJAS) {
    const lastmod = p.conAvisos ? ultimo : null;
    urls.push(url(p.loc, lastmod, p.changefreq, p.priority));
  }
  for (const a of avisos) {
    urls.push(url(`${PORTAL_ROOT}/propiedad-${a.id}`, fecha(a.updated_at || a.publicado_en), 'weekly', '0.8'));
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.join('\n') + '\n'
    + '</urlset>\n';
}

function url(loc, lastmod, changefreq, priority) {
  return '  <url>\n'
    + `    <loc>${esc(loc)}</loc>\n`
    + (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '')
    + (changefreq ? `    <changefreq>${changefreq}</changefreq>\n` : '')
    + (priority ? `    <priority>${priority}</priority>\n` : '')
    + '  </url>';
}

/* ISO completo (con zona) si la fecha es válida; null si no */
function fecha(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

module.exports._interno = { armarXml, leerAvisos, FIJAS };
