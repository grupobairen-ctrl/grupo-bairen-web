/**
 * Vercel Function — la ficha de cada propiedad, escrita desde el servidor
 *
 * WhatsApp, Facebook, Google, Bing y los asistentes de IA (ChatGPT,
 * Perplexity, Claude) no ejecutan JavaScript o lo ejecutan tarde: cuando
 * piden una ficha ven el HTML crudo de propiedad.html. Esta función sirve
 * propiedad.html con:
 *  - los meta tags de ESA propiedad (foto de portada, título, descripción);
 *  - la ficha ya escrita: dirección, precio, ambientes, m², plazo, garantía,
 *    estado, descripción y amenities (19/10/2026);
 *  - el aviso en schema.org (precio por mes, plazo, ambientes, superficie).
 * El JavaScript de la página vuelve a pintar todo igual al cargar, así que
 * para una persona no cambia nada.
 *
 * Llega acá vía los rewrites de vercel.json:
 *   /propiedades/<slug>        → /api/og-propiedad?slug=<slug>
 *   /propiedad.html?slug=<x>   → /api/og-propiedad?slug=<x>
 * (propiedad.html SIN query no se reescribe — eso evita un loop cuando esta
 * función lo fetchea para usarlo de plantilla)
 *
 * Si la propiedad no existe o no está publicada, responde 404 (así los
 * buscadores la sacan). Si Supabase no responde, devuelve el HTML sin tocar:
 * la página funciona igual, con la placa de logo como preview.
 *
 * Mantener los textos espejados con renderProperty() / renderDynamicTexts()
 * en propiedad.html y las reglas con api/_bairen.js.
 */

const B = require('./_bairen');

module.exports = async (req, res) => {
  let html;
  try {
    const r = await fetch(`${B.origen(req)}/propiedad.html`);
    if (!r.ok) throw new Error(`propiedad.html ${r.status}`);
    html = await r.text();
  } catch (err) {
    res.statusCode = 302;
    res.setHeader('Location', '/catalogo.html');
    return res.end();
  }

  const slug = String(req.query.slug || '');
  const p = slug ? await B.porSlug(slug) : undefined;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  if (p === undefined) res.statusCode = 404;
  res.end(p ? escribirFicha(injectMeta(html, p), p) : html);
};

function injectMeta(html, p) {
  const titleFull = B.titulo(p);
  const pageUrl = B.url(p);
  const ogImg = p.fotos[0] || `${B.SITE_ROOT}/og-logo.jpg`;

  const isVenta = p.tipo === 'Venta';
  const tipoLabel = p.tipo === 'Ambos' ? 'a mediano o largo plazo' : (p.tipo === 'Temporal' ? 'a mediano plazo' : p.tipo === 'Tradicional' ? 'a largo plazo' : p.tipo.toLowerCase());
  // og/twitter: el texto de la unidad (es la vista previa de WhatsApp, no cambia)
  const descOG = (p.descripcion && p.descripcion.length > 30)
    ? p.descripcion.slice(0, 160).replace(/\s+\S*$/, '') + '…'
    : `${titleFull} en ${p.barrio}, Buenos Aires. ${isVenta ? 'Venta' : 'Alquiler ' + tipoLabel} — BAIREN.`;
  // meta description: primero los datos (qué, dónde, cuánto, plazo), que es lo
  // que citan buscadores y asistentes; después el comienzo del texto
  const descSEO = B.enCatalogo(p) ? metaDesc(p) : descOG;

  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${B.esc(titleFull)} — ${B.esc(p.barrio)} — BAIREN</title>`);
  out = setAttr(out, 'meta name="robots"', 'content', 'index, follow');
  out = setAttr(out, 'meta name="description"', 'content', descSEO);
  out = setAttr(out, 'link id="metaCanonical"', 'href', pageUrl);
  out = setAttrById(out, 'metaOgTitle', `${titleFull} — BAIREN`);
  out = setAttrById(out, 'metaOgDesc', descOG);
  out = setAttrById(out, 'metaOgImage', ogImg);
  out = setAttrById(out, 'metaOgUrl', pageUrl);
  out = setAttrById(out, 'metaTwTitle', `${titleFull} — BAIREN`);
  out = setAttrById(out, 'metaTwDesc', descOG);
  out = setAttrById(out, 'metaTwImage', ogImg);
  if (B.enCatalogo(p)) out = out.replace('</head>', B.ldJson(B.avisoLD(p)) + '\n</head>');
  return out;
}

/** Hasta 160 caracteres: el resumen y, si entra, el arranque del texto. */
function metaDesc(p) {
  const base = B.resumen(p);
  const resto = (p.descripcion || '').replace(/\s+/g, ' ').trim();
  if (!resto || base.length > 140) return base;
  const corte = resto.slice(0, 159 - base.length).replace(/\s+\S*$/, '');
  return corte ? `${base} ${corte}…` : base;
}

/* ── La ficha escrita: mismos textos en español que PROP_T.es de propiedad.html ── */
function escribirFicha(html, p) {
  const isAmbos = p.tipo === 'Ambos';
  const isTemp = p.tipo === 'Temporal';
  const isTrad = p.tipo === 'Tradicional';
  const isVenta = p.tipo === 'Venta';
  const reservado = p.estado === 'Reservado';
  const unidadLbl = p.unidad ? ', ' + p.unidad : '';

  const tag = isAmbos ? 'Alquiler a mediano y largo plazo' : isVenta ? 'En Venta' : isTemp ? 'Alquiler a Mediano Plazo' : 'Alquiler a Largo Plazo';
  const fmt = n => (n ? B.usd(n) : 'Consultar');
  let precio, precioMo, precioAc;
  // Todo incluido siempre (21/10/2026): expensas y servicios van dentro del precio
  if (isAmbos || isTemp) { precio = fmt(p.precio_temporal); precioMo = precioAc = 'por mes · todo incluido'; }
  else if (isTrad) { precio = fmt(p.precio_tradicional); precioMo = precioAc = 'por mes'; }
  else { precio = fmt(p.precio_venta); precioMo = precioAc = ''; }

  const { min, max } = B.plazoMeses(p.plazo);
  // Lo que no está cargado no se muestra (antes salía "— M²")
  const stats = [
    ...(p.m2 ? [[p.m2, 'M²']] : []),
    ...(p.unidad ? [[p.unidad, 'Unidad']] : []),
    ...(p.ambientes ? [[p.ambientes, 'Ambientes']] : []),
    ...(isVenta ? [] : [[isTrad ? '2+' : `${min}–${max}`, isTrad ? 'Años' : 'Meses']]),
  ].map(([v, l]) => `<div class="stat"><div class="stat-val">${B.esc(v)}</div><div class="stat-lbl">${B.esc(l)}</div></div>`).join('');

  const rows = [['Dirección', p.dir + unidadLbl], ['Barrio', p.barrio]];
  if (p.m2) rows.push(['Superficie', `${p.m2} m²`]);
  if (p.ambientes) rows.push(['Ambientes', `${p.ambientes} ${p.ambientes !== 1 ? 'ambientes' : 'ambiente'}`]);
  if (!isVenta) rows.push(['Plazo', p.plazo || '3 a 12 meses']);
  if (isTemp || isAmbos) {
    rows.push(['Expensas y servicios', 'Incluidos']);
  } else if (isTrad) rows.push(['Servicios', 'A cargo del inquilino']);
  if (!isVenta) rows.push(['Garantía', isTrad ? 'Gtía CABA / Seguro de Caución' : 'No requerida']);
  rows.push(['Estado', p.estado]);
  const unidadRef = `${p.dir}${p.unidad ? ' unidad ' + p.unidad : ''}${p.barrio ? ', ' + p.barrio : ''}`;
  // Mismo botón que arma visita.js en el navegador (que después suma Llegada y Estadía)
  const wa = `https://wa.me/${B.WHATSAPP_NUM}?text=${encodeURIComponent(`Hola, quiero coordinar una visita a ${unidadRef}.`)}`;
  const acBody = (reservado ? '' : `<a class="btn-primary" href="${wa}" target="_blank" rel="noopener noreferrer">COORDINAR VISITA</a>`)
    + rows.map(([l, v]) => `<div class="ac-row"><span class="ac-lbl">${B.esc(l)}</span><span class="ac-val">${B.esc(v)}</span></div>`).join('');

  const desc = p.descripcion || `${B.titulo(p)} — unidad disponible en ${p.barrio}, Buenos Aires. Listo para vivir desde el primer día.`;
  const ams = p.amenities.length
    ? `<div class="sec-label">Amenities del edificio</div><div class="amenities-grid">${p.amenities.map(a => `<div class="amenity"><div class="amenity-name">${B.esc(a)}</div></div>`).join('')}</div>`
    : '';

  let out = html;
  // Venta: "Valor" en vez de "Precio mensual" (lo mismo que hace renderDynamicTexts)
  if (isVenta) out = out.replace(/(data-i18n=")prop_price_m(">)Precio mensual</g, '$1prop_price_v$2Valor<');
  // El cartel de "no encontrada" no viaja si la unidad existe: un asistente que
  // lee el HTML lo tomaría como que no está. propiedad.html se arregla sin él.
  out = out.replace(/\n?<!-- NOT FOUND -->\s*<div class="notfound" id="notFoundScreen"[\s\S]*?<\/div>\n/, '\n');
  out = fill(out, 'heroTag', tag);
  out = fill(out, 'heroAddress', p.dir);
  out = fill(out, 'heroSub', `${p.barrio} · Buenos Aires`);
  out = fill(out, 'heroPrice', precio);
  out = fill(out, 'heroPriceMo', precioMo);
  if (isAmbos || isTemp) out = fill(out, 'heroPriceInc', 'Incluye expensas y servicios');
  out = fill(out, 'acPrice', precio);
  out = fill(out, 'acPriceMo', precioAc);
  out = fillHTML(out, 'statsRow', stats);
  out = fill(out, 'propDesc', desc);
  out = fillHTML(out, 'amenitiesBlock', ams);
  out = fillHTML(out, 'acBody', acBody);
  return out;
}

/** Texto dentro del elemento con ese id (elementos simples: <x id="...">…</x>). */
function fill(html, id, text) {
  return fillHTML(html, id, B.esc(text));
}
function fillHTML(html, id, inner) {
  const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\sid="${id}"[^>]*>)[^<]*(</\\2>)`, 'i');
  return html.replace(re, (_, open, tag, close) => open + inner + close);
}

function setAttr(html, tagPrefix, attr, value) {
  const re = new RegExp(`(<${tagPrefix}[^>]*?\\s${attr}=")[^"]*(")`);
  return html.replace(re, `$1${B.esc(value)}$2`);
}

function setAttrById(html, id, value) {
  const re = new RegExp(`(<meta\\s+id="${id}"[^>]*?\\scontent=")[^"]*(")`);
  return html.replace(re, `$1${B.esc(value)}$2`);
}

module.exports.injectMeta = injectMeta;
module.exports.escribirFicha = escribirFicha;
