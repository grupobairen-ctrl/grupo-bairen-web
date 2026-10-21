/**
 * Lo que comparten las páginas que se arman en el servidor (19/10/2026).
 *
 * Por qué existe: los robots de ChatGPT, Perplexity, Claude y Bing leen el
 * HTML tal como llega y no ejecutan JavaScript. Ficha, catálogo, sitemap y
 * llms.txt se arman acá con los datos de Supabase para que esos robots vean
 * lo mismo que ve una persona: precio, barrio, ambientes, plazo y texto.
 *
 * El guion bajo del nombre hace que Vercel no lo publique como función.
 *
 * Mantener las reglas espejadas con catalogo.html y propiedad.html:
 *  - solo se ofrece mediano plazo (22/9/2026): ni venta ni largo plazo;
 *  - todas las unidades son "todo incluido": expensas y servicios dentro del
 *    precio (Tomás, 21/10/2026). Ya no hay unidades con expensas aparte;
 *  - nunca la línea del corredor (11/9/2026, sin-corredor.sql).
 */

const SUPABASE_URL = 'https://nmrjyyrhwjroonrppnka.supabase.co';
// Anon key pública por diseño (los datos los protege RLS) — ver supabase-config.js
const SUPABASE_ANON_KEY = 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';
const SITE_ROOT = 'https://www.bairengroup.com';
const ORG_ID = SITE_ROOT + '/#org';
const WHATSAPP_NUM = '5491123106629';

const COLS = [
  'slug', 'dir', 'unidad', 'barrio', 'tipo', 'estado', 'descripcion', 'descripcion_en',
  'ambientes', 'm2', 'plazo', 'precio_temporal', 'precio_tradicional', 'precio_venta',
  'expensas', 'expensas_incluidas', 'fecha_liberacion', 'reservada_at', 'created_at',
  'updated_at', 'portada_url', 'portada_titulo', 'portada_titulo_en',
  'imagenes(url,orden)', 'amenities(nombre)',
].join(',');

// Caché corta dentro de la misma función caliente: el CDN cachea aparte
let cache = { t: 0, data: null };

/** Todas las publicadas. Devuelve null si Supabase no responde (no es lo mismo que "ninguna"). */
async function publicadas() {
  if (cache.data && Date.now() - cache.t < 120000) return cache.data;
  try {
    const q = new URLSearchParams({ publicada: 'eq.true', select: COLS, order: 'created_at.desc' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/propiedades?${q}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const data = (await r.json()).map(limpiar);
    cache = { t: Date.now(), data };
    return data;
  } catch (_) {
    return null;
  }
}

/** Una por slug. undefined = no existe o no está publicada; null = Supabase no respondió. */
async function porSlug(slug) {
  try {
    const q = new URLSearchParams({ slug: `eq.${slug}`, publicada: 'eq.true', select: COLS, limit: '1' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/propiedades?${q}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const p = (await r.json())[0];
    return p ? limpiar(p) : undefined;
  } catch (_) {
    return null;
  }
}

const LINEA_CORREDOR = /^[^\n]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel|Matzkin|CUCICBA|Maxim Rentals)[^\n]*$/gim;
function sinLineaCorredor(t) {
  if (!t) return t;
  return t.replace(LINEA_CORREDOR, '').replace(/\n{3,}/g, '\n\n').trim();
}

function limpiar(p) {
  p.descripcion = sinLineaCorredor(p.descripcion);
  p.descripcion_en = sinLineaCorredor(p.descripcion_en);
  p.fotos = (p.imagenes || []).slice().sort((a, b) => a.orden - b.orden).map(f => f.url);
  p.amenities = (p.amenities || []).map(a => a.nombre).filter(Boolean);
  return p;
}

/** Lo que el catálogo ofrece: mediano plazo (Temporal, o Ambos con precio de mediano plazo). */
function enCatalogo(p) {
  return p.tipo === 'Temporal' || (p.tipo === 'Ambos' && Number(p.precio_temporal) > 0);
}

const precio = p => Number(p.precio_temporal) || 0;
// Desde el 21/10/2026 todas las unidades son paquete completo (Tomás): la marca
// expensas_incluidas de la base ya no cambia lo que se publica
const todoIncluido = () => true;
const disponible = p => p.estado === 'Disponible';
const titulo = p => p.dir + (p.unidad && p.unidad !== '-' ? ' ' + p.unidad : '');
const url = p => `${SITE_ROOT}/propiedades/${encodeURIComponent(p.slug)}`;

function usd(n) {
  return 'USD ' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function usdEn(n) {
  return 'USD ' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "3-12 meses" → { min: 3, max: 12 }. Sin dato, el de siempre del mediano plazo. */
function plazoMeses(plazo) {
  const m = String(plazo || '').match(/(\d+)\s*(?:-|–|a)\s*(\d+)\s*mes/i);
  if (m) return { min: +m[1], max: +m[2] };
  return { min: 3, max: 12 };
}

/** La frase que contesta "qué es, dónde, cuánto y en qué condiciones" en una línea. */
function resumen(p) {
  const amb = p.ambientes ? `${p.ambientes} ${p.ambientes === 1 ? 'ambiente' : 'ambientes'}` : null;
  const que = ['Departamento amoblado', amb && `de ${amb}`, p.m2 && `y ${p.m2} m²`].filter(Boolean).join(' ');
  const { min, max } = plazoMeses(p.plazo);
  const cuanto = precio(p)
    ? `${usd(precio(p))} por mes${todoIncluido(p) ? ', todo incluido' : ' más expensas'}`
    : 'precio a consultar';
  return `${que} en ${p.barrio}, Buenos Aires. ${cuanto}, de ${min} a ${max} meses y sin garantía inmobiliaria.`;
}

function resumenEn(p) {
  const amb = p.ambientes ? `${p.ambientes}-room` : '';
  const que = ['Furnished', amb, 'apartment', p.m2 && `(${p.m2} m²)`].filter(Boolean).join(' ');
  const { min, max } = plazoMeses(p.plazo);
  const cuanto = precio(p)
    ? `${usdEn(precio(p))} per month${todoIncluido(p) ? ', all inclusive' : ' plus building fees'}`
    : 'price on request';
  return `${que} in ${p.barrio}, Buenos Aires. ${cuanto}, ${min} to ${max} months, no guarantor needed.`;
}

/* ── Zonas: espejo de BairenZonas en mapa-barrios.js (key = lo que viaja en ?barrio=) ── */
const ZONAS = [
  { key: 'Núñez', alias: ['nunez'], es: 'Residencial y verde, sobre el río.', en: 'Residential and green, by the river.' },
  { key: 'Belgrano', alias: ['belgrano c', 'belgrano r', 'bajo belgrano', 'belgrano chico'], es: 'Avenidas arboladas, casas y el subte a la puerta.', en: 'Tree-lined avenues, houses and the subway at the door.' },
  { key: 'Palermo', alias: ['palermo soho', 'palermo hollywood', 'las canitas', 'canitas', 'palermo chico', 'palermo viejo', 'palermo nuevo', 'palermo botanico', 'botanico'], es: 'Parques, gastronomía y diseño. Incluye Soho, Hollywood y Las Cañitas.', en: 'Parks, dining and design. Includes Soho, Hollywood and Las Cañitas.' },
  { key: 'Recoleta', alias: ['barrio norte'], es: 'Embajadas, museos y la Buenos Aires clásica, a pasos del centro.', en: 'Embassies, museums and classic Buenos Aires, steps from downtown.' },
  { key: 'Retiro', alias: [], es: 'Plaza San Martín, torres y la estación.', en: 'Plaza San Martín, towers and the station.' },
  { key: 'Puerto Madero', alias: [], es: 'Diques, torres y la reserva ecológica.', en: 'Docks, towers and the ecological reserve.' },
  { key: 'Centro', alias: ['microcentro', 'san nicolas', 'monserrat', 'montserrat', 'tribunales'], es: 'Microcentro y Monserrat: oficinas, teatros y el Obelisco.', en: 'Microcentro and Monserrat: offices, theatres and the Obelisk.' },
  { key: 'San Telmo', alias: [], es: 'Adoquines, anticuarios y la feria de los domingos.', en: 'Cobblestones, antiques and the Sunday fair.' },
  { key: 'Villa Crespo', alias: [], es: 'Al lado de Palermo, con vida de barrio.', en: 'Next to Palermo, with neighbourhood life.' },
  { key: 'Almagro', alias: [], es: 'Tango, cafés y la Avenida Corrientes.', en: 'Tango, cafés and Corrientes Avenue.' },
  { key: 'GBA Norte', alias: ['san isidro', 'vicente lopez', 'olivos', 'martinez', 'acassuso', 'la lucila', 'beccar', 'san fernando', 'tigre', 'nordelta'], es: 'San Isidro, Vicente López y Olivos.', en: 'San Isidro, Vicente López and Olivos.' },
];
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function zonaDe(barrio) {
  const b = norm(barrio);
  const z = ZONAS.find(z => norm(z.key) === b || z.alias.includes(b));
  return z ? z.key : 'Otros';
}

/** Por zona: cuántas hay, cuántas disponibles y desde cuánto. Ordenadas por cantidad. */
function porZona(lista) {
  const out = {};
  lista.forEach(p => {
    const k = zonaDe(p.barrio);
    const z = out[k] || (out[k] = { key: k, total: 0, libres: 0, desde: 0, barrios: new Set(), props: [] });
    z.total++;
    if (disponible(p)) z.libres++;
    if (precio(p) && (!z.desde || precio(p) < z.desde)) z.desde = precio(p);
    z.barrios.add(p.barrio);
    z.props.push(p);
  });
  return Object.values(out).sort((a, b) => b.total - a.total);
}

/** 'Puerto Madero' → 'puerto-madero', 'Núñez' → 'nunez' (lo que va en la URL de la guía del barrio) */
const slugZona = k => norm(k).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Barrios que la gente busca y donde hoy puede no haber unidades: la guía dice
   la verdad ("hoy no hay") y muestra las más cercanas. Si entra una unidad con
   ese barrio, aparece primero sola. */
const CERCA = [
  { key: 'Colegiales', cerca: ['Palermo', 'Belgrano', 'Núñez', 'Villa Crespo'],
    es: 'Residencial y tranquilo, con casas bajas, plazas y a pasos de Palermo y Belgrano.',
    en: 'Quiet and residential, with low-rise houses and squares, next to Palermo and Belgrano.' },
  { key: 'Villa Urquiza', cerca: ['Belgrano', 'Núñez', 'Palermo'],
    es: 'Residencial, con avenidas comerciales, mucho verde y la línea B de subte.',
    en: 'Residential, with shopping avenues, green areas and subway line B.' },
];

/* Guías por tema: las preguntas más buscadas que el modelo de BAIREN contesta */
const TEMAS = [
  { key: 'sin-garantia', es: '/alquilar-sin-garantia-buenos-aires', en: '/en/rent-without-guarantor-buenos-aires',
    nombre: 'Alquilar sin garantía inmobiliaria ni seguro de caución', nombreEn: 'Renting without a guarantor or surety bond' },
  { key: 'por-meses', es: '/alquiler-por-meses-buenos-aires', en: '/en/monthly-rentals-buenos-aires',
    nombre: 'Alquilar por 3, 6 o 12 meses', nombreEn: 'Renting for 3, 6 or 12 months' },
];

/** Todas las guías que existen hoy: general, temas, barrios con unidades y barrios cercanos. */
function guias(props) {
  const out = [{ es: '/alquiler-amoblado-buenos-aires', en: '/en/furnished-apartments-buenos-aires', nombre: 'Buenos Aires', nombreEn: 'Buenos Aires', tipo: 'general' }];
  TEMAS.forEach(t => out.push({ es: t.es, en: t.en, nombre: t.nombre, nombreEn: t.nombreEn, tipo: 'tema' }));
  porZona(props).filter(z => z.key !== 'Otros').forEach(z => out.push({
    es: `/alquiler-amoblado-${slugZona(z.key)}`, en: `/en/furnished-apartments-${slugZona(z.key)}`, nombre: z.key, nombreEn: z.key, tipo: 'zona', total: z.total, desde: z.desde,
  }));
  CERCA.forEach(c => out.push({
    es: `/alquiler-amoblado-${slugZona(c.key)}`, en: `/en/furnished-apartments-${slugZona(c.key)}`, nombre: c.key, nombreEn: c.key, tipo: 'cerca',
  }));
  return out;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** JSON dentro de <script>: que un "</script>" en un texto no corte el bloque. */
function ldJson(obj) {
  return `<script type="application/ld+json" data-ssr="1">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

/** Imagen de Supabase achicada (mismo transformador que window.sbImg en i18n.js). */
function sbImg(u, w) {
  if (!u || !u.includes('/storage/v1/object/public/')) return u;
  return u.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    + (u.includes('?') ? '&' : '?') + `width=${w}&quality=75`;
}

/** El aviso en schema.org: lo que leen Google, Bing y los asistentes. */
function avisoLD(p) {
  const pageUrl = url(p);
  const { min, max } = plazoMeses(p.plazo);
  const precioMes = precio(p);
  const amenities = ['Amoblado', ...p.amenities.filter(a => a !== 'Amoblado' && a !== 'All in')];
  const offer = precioMes ? {
    '@type': 'Offer',
    price: precioMes,
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: precioMes,
      priceCurrency: 'USD',
      unitCode: 'MON',
      unitText: todoIncluido(p) ? 'por mes, todo incluido (expensas, servicios y muebles)' : 'por mes, expensas aparte',
    },
    eligibleDuration: { '@type': 'QuantitativeValue', minValue: min, maxValue: max, unitCode: 'MON' },
    availability: disponible(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    ...(p.fecha_liberacion ? { availabilityStarts: p.fecha_liberacion } : {}),
    businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
    seller: { '@id': ORG_ID },
    url: pageUrl,
  } : undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        '@id': pageUrl + '#aviso',
        url: pageUrl,
        name: `${titulo(p)} — ${p.barrio}`,
        headline: resumen(p),
        description: [resumen(p), p.descripcion].filter(Boolean).join(' ').slice(0, 1200),
        inLanguage: 'es-AR',
        image: p.fotos.slice(0, 10),
        datePosted: p.created_at,
        dateModified: p.updated_at || p.created_at,
        provider: { '@id': ORG_ID },
        offers: offer,
        about: {
          '@type': 'Apartment',
          name: `Departamento amoblado en ${titulo(p)}, ${p.barrio}`,
          ...(p.ambientes ? { numberOfRooms: p.ambientes } : {}),
          ...(p.m2 ? { floorSize: { '@type': 'QuantitativeValue', value: p.m2, unitCode: 'MTK' } } : {}),
          address: {
            '@type': 'PostalAddress',
            streetAddress: p.dir,
            addressLocality: p.barrio,
            addressRegion: 'Ciudad Autónoma de Buenos Aires',
            addressCountry: 'AR',
          },
          containedInPlace: { '@type': 'Place', name: `${p.barrio}, Buenos Aires` },
          amenityFeature: amenities.map(a => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_ROOT + '/' },
          { '@type': 'ListItem', position: 2, name: 'Departamentos a mediano plazo', item: SITE_ROOT + '/catalogo.html' },
          { '@type': 'ListItem', position: 3, name: titulo(p), item: pageUrl },
        ],
      },
    ],
  };
}

/** Origen del pedido: en una vista previa de Vercel la plantilla sale de esa misma versión. */
function origen(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (/^[a-z0-9-]+\.vercel\.app$/i.test(host) || /(^|\.)bairengroup\.com$/i.test(host)) return 'https://' + host;
  return SITE_ROOT;
}

module.exports = {
  SITE_ROOT, ORG_ID, WHATSAPP_NUM, ZONAS, CERCA, TEMAS, slugZona, guias, norm,
  publicadas, porSlug, enCatalogo, precio, todoIncluido, disponible, titulo, url,
  usd, usdEn, plazoMeses, resumen, resumenEn, zonaDe, porZona, esc, ldJson, sbImg, avisoLD, origen,
};
