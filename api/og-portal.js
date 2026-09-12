/**
 * Vercel Function: vista previa al compartir una ficha del portal
 *
 * WhatsApp, Instagram, Facebook y Google no ejecutan JavaScript: cuando piden
 * /portal/propiedad-<id> ven el HTML crudo de portal/propiedad.html, que no
 * trae ni og:image ni og:title (la ficha se arma entera en el navegador).
 * Esta función sirve ese mismo HTML con el <title>, la description y los meta
 * og:* y twitter:* reescritos con los datos del aviso, leídos de la base del
 * portal con la clave pública (RLS solo deja ver lo publicado).
 *
 * Llega acá por el rewrite de vercel.json:
 *   /portal/propiedad-<id>   →  /api/og-portal?id=<id>      (id = uuid o slug)
 *
 * La plantilla se toma de https://<host>/portal/propiedad.html SIN query, que
 * no se reescribe: así no hay loop. La ficha sigue funcionando igual que antes
 * porque el JS lee el id del path (BP.idFromPath) y los recursos relativos
 * (css/, js/) resuelven contra /portal/ como con el rewrite estático.
 *
 * Nunca 500: sin id, sin aviso, con la base caída o con cualquier error, se
 * sirve el HTML tal cual. Si ni siquiera se pudo conseguir la plantilla, se
 * redirige a propiedad.html?id=<id>, que es la misma ficha sin vista previa.
 *
 * Mantener el título y la descripción espejados con propiedad.html
 * (document.title) y con la tarjeta de js/data.js (opTag, metaLine, precio).
 */

const fs = require('fs');
const path = require('path');

const PORTAL_URL = 'https://dahusnnbyrvltcuaelxj.supabase.co';
// Clave publishable, pública por diseño (la misma de portal/supabase-portal.js)
const PORTAL_KEY = 'sb_publishable_tSRRvyBksexYaiuwJ5YTQw_R_4VNp-0';
const SITE_ROOT = 'https://www.bairengroup.com';
const OG_FALLBACK = `${SITE_ROOT}/og-logo.jpg`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[A-Za-z0-9._~-]{1,120}$/;

const CACHE_OK = 'public, s-maxage=300, stale-while-revalidate=3600';   /* un aviso pausado no sigue saliendo un día entero en WhatsApp */
const CACHE_SIN_DATO = 'public, s-maxage=60, stale-while-revalidate=600';

let plantillaCache = { html: null, hasta: 0 };

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').trim();

  let html = null;
  try { html = await plantilla(req); } catch (_) { html = null; }
  if (!html) {
    res.statusCode = 302;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', '/portal/propiedad.html' + (id ? '?id=' + encodeURIComponent(id) : ''));
    return res.end();
  }

  let aviso = null;
  try { aviso = await leerAviso(id); } catch (_) { aviso = null; }

  let out = html;
  if (aviso) {
    try { out = injectMeta(html, aviso); } catch (_) { out = html; }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', aviso ? CACHE_OK : CACHE_SIN_DATO);
  res.end(out);
};

/* ── plantilla ────────────────────────────────────────────────────────────── */

async function plantilla(req) {
  const ahora = Date.now();
  if (plantillaCache.html && plantillaCache.hasta > ahora) return plantillaCache.html;

  let html = null;
  try {
    const proto = String((req.headers && req.headers['x-forwarded-proto']) || 'https').split(',')[0].trim();
    const host = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').split(',')[0].trim();
    if (host) {
      const r = await fetch(`${proto}://${host}/portal/propiedad.html`, { signal: AbortSignal.timeout(3000), headers: { 'user-agent': 'bairen-og-portal' } });
      if (r.ok) {
        const t = await r.text();
        if (/<title>/.test(t)) html = t;
      }
    }
  } catch (_) { /* seguimos con el archivo del deploy */ }

  if (!html) {
    try { html = fs.readFileSync(path.join(__dirname, '..', 'portal', 'propiedad.html'), 'utf8'); } catch (_) { html = null; }
  }

  if (html) plantillaCache = { html, hasta: ahora + 60 * 1000 };
  return html;
}

/* ── base ─────────────────────────────────────────────────────────────────── */

async function leerAviso(id) {
  if (!id) return null;
  const q = new URLSearchParams({
    select: 'id,slug,operacion,tipo,titulo,direccion,unidad,barrio,precio,moneda,m2_total,ambientes,dormitorios,banos,cocheras,estado,descripcion,updated_at,fotos(url,orden),publicadores(nombre)',
    estado_curacion: 'eq.publicado',
    'fotos.order': 'orden.asc',
    'fotos.limit': '1',
    limit: '1',
  });
  if (UUID_RE.test(id)) q.set('id', `eq.${id.toLowerCase()}`);
  else if (SLUG_RE.test(id)) q.set('slug', `eq.${id}`);
  else return null;

  const r = await fetch(`${PORTAL_URL}/rest/v1/avisos?${q}`, {
    headers: { apikey: PORTAL_KEY, Authorization: `Bearer ${PORTAL_KEY}`, 'Accept-Profile': 'portal' },
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) return null;
  const filas = await r.json();
  const a = Array.isArray(filas) ? filas[0] : null;
  return a && a.id ? a : null;
}

/* ── textos, espejo de la tarjeta y de la ficha ───────────────────────────── */

function miles(n) { return String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function tituloDe(a) { return a.titulo || (String(a.direccion || '') + (a.unidad ? ' · ' + a.unidad : '')); }

function opTag(a) { return a.operacion === 'venta' ? 'Venta' : a.operacion === 'mediano' ? 'Alquiler, mediano plazo' : 'Alquiler, largo plazo'; }

function precioTexto(a) {
  if (a.estado === 'reservado') return 'Reservada';
  if (a.precio == null) return 'Consultar precio';
  return (a.moneda || 'USD') + ' ' + miles(a.precio) + (a.operacion === 'venta' ? '' : ' por mes');
}

function metaLine(a) {
  const amb = a.ambientes || null, dorm = a.dormitorios || null, banos = a.banos || null, coch = a.cocheras || 0;
  return [
    a.m2_total ? a.m2_total + ' m²' : null,
    amb ? (amb === 1 ? 'Monoamb.' : amb + ' amb.') : null,
    dorm ? dorm + ' dorm.' : null,
    banos ? banos + ' ' + (banos === 1 ? 'baño' : 'baños') : null,
    coch ? coch + ' coch.' : null,
  ].filter(Boolean).join(' · ');
}

function descripcionDe(a) {
  const pub = a.publicadores && a.publicadores.nombre ? a.publicadores.nombre : null;
  return [opTag(a), precioTexto(a), metaLine(a) || null, a.barrio || null, pub ? 'Publica ' + pub : null].filter(Boolean).join(' · ');
}

function fotoDe(a) {
  const fotos = (a.fotos || []).slice().sort((x, y) => (x.orden || 0) - (y.orden || 0));
  const u = fotos[0] && fotos[0].url ? String(fotos[0].url) : '';
  return /^https:\/\//.test(u) ? u : OG_FALLBACK;
}

/* ── reescritura del head ─────────────────────────────────────────────────── */

function injectMeta(html, a) {
  const titulo = tituloDe(a);
  const title = [titulo, a.barrio, 'BAIREN'].filter(Boolean).join(' · ');
  const desc = descripcionDe(a);
  const url = `${SITE_ROOT}/portal/propiedad-${a.id}`;
  const img = fotoDe(a);

  let out = html;
  /* se limpia lo que hubiera para no duplicar si la plantilla algún día trae og:* */
  out = out.replace(/\s*<meta\s+(?:property|name)="(?:og:[a-z:_]+|twitter:[a-z:_]+)"[^>]*>/g, '');
  out = out.replace(/\s*<link\s+rel="canonical"[^>]*>/g, '');

  const bloque = [
    `<title>${esc(title)}</title>`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="BAIREN">`,
    `<meta property="og:locale" content="es_AR">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`,
  ].join('\n  ');

  /* Reemplazos con función: así un título con $& o $' no expande patrones de String.replace */
  if (/<title>[^<]*<\/title>/.test(out)) out = out.replace(/<title>[^<]*<\/title>/, () => bloque);
  else out = out.replace(/<head>/i, m => m + '\n  ' + bloque);
  out = setAttr(out, 'meta name="description"', 'content', desc);
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();
}

function setAttr(html, tagPrefix, attr, value) {
  const re = new RegExp(`(<${tagPrefix}[^>]*?\\s${attr}=")[^"]*(")`);
  return html.replace(re, (m, a, b) => a + esc(value) + b);
}

module.exports.injectMeta = injectMeta;
module.exports._interno = { tituloDe, descripcionDe, fotoDe, miles, leerAviso, plantilla };
