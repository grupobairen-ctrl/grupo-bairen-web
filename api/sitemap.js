/**
 * Vercel Function — /sitemap.xml armado con lo publicado (19/10/2026)
 *
 * El sitemap.xml fijo quedaba viejo: al 19/10 listaba 11 unidades que ya no
 * estaban y le faltaban 17 de las 35 publicadas. Este se arma con Supabase en
 * cada pedido (cacheado 1 hora en el CDN): entra toda unidad que muestra el
 * catálogo (mediano plazo), con la fecha de su última edición.
 *
 * Llega acá vía vercel.json: /sitemap.xml → /api/sitemap
 */

const B = require('./_bairen');

const FIJAS = [
  { loc: '/', prio: '1.0' },
  { loc: '/catalogo.html', prio: '0.9' },
  { loc: '/alquiler-amoblado-buenos-aires', prio: '0.9', alt: '/en/furnished-apartments-buenos-aires' },
  { loc: '/en/furnished-apartments-buenos-aires', prio: '0.8', alt: '/alquiler-amoblado-buenos-aires' },
];

module.exports = async (req, res) => {
  const todas = await B.publicadas();
  if (!todas) {
    // Sin base no se inventa un sitemap a medias: el buscador reintenta
    res.statusCode = 503;
    res.setHeader('Retry-After', '600');
    return res.end('Sitemap temporalmente no disponible');
  }
  const props = todas.filter(B.enCatalogo);
  const ultima = props.reduce((m, p) => ((p.updated_at || p.created_at) > m ? (p.updated_at || p.created_at) : m), '2026-10-19');
  const dia = s => String(s).slice(0, 10);

  const urls = [
    ...FIJAS.map(f => `  <url>
    <loc>${B.SITE_ROOT}${f.loc}</loc>
    <lastmod>${dia(ultima)}</lastmod>
    <priority>${f.prio}</priority>${f.alt ? `
    <xhtml:link rel="alternate" hreflang="${f.loc.startsWith('/en/') ? 'en' : 'es'}" href="${B.SITE_ROOT}${f.loc}"/>
    <xhtml:link rel="alternate" hreflang="${f.loc.startsWith('/en/') ? 'es' : 'en'}" href="${B.SITE_ROOT}${f.alt}"/>` : ''}
  </url>`),
    ...props.map(p => `  <url>
    <loc>${B.esc(B.url(p))}</loc>
    <lastmod>${dia(p.updated_at || p.created_at)}</lastmod>
    <priority>0.7</priority>${p.fotos.slice(0, 5).map(f => `
    <image:image><image:loc>${B.esc(f)}</image:loc></image:image>`).join('')}
  </url>`),
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`);
};
