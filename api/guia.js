/**
 * Vercel Function — la guía para alquilar amoblado en Buenos Aires (19/10/2026)
 *
 *   /alquiler-amoblado-buenos-aires          → /api/guia?lang=es
 *   /en/furnished-apartments-buenos-aires    → /api/guia?lang=en
 *
 * Para qué: es la página que contesta lo que la gente le pregunta a Google y
 * a ChatGPT ("departamento amoblado por meses en Buenos Aires sin garantía",
 * "furnished apartment Buenos Aires monthly rent"). Se arma en el servidor
 * con lo publicado en Supabase, así los números (cuántos hay, desde cuánto
 * por barrio) nunca quedan viejos y los robots que no corren JavaScript la
 * leen entera. Cada unidad lleva a su ficha y todo termina en WhatsApp.
 *
 * Las respuestas de "Preguntas frecuentes" dicen solo lo que la web ya
 * promete en la home y en las fichas. Si cambia una condición (plazo,
 * garantía, qué incluye el precio), se cambia acá también.
 */

const B = require('./_bairen');

const T = {
  es: {
    lang: 'es-AR', path: '/alquiler-amoblado-buenos-aires', otro: '/en/furnished-apartments-buenos-aires', otroLbl: 'EN', otroLang: 'en',
    title: n => `Departamentos amoblados por meses en Buenos Aires: precios por barrio (${n}) · BAIREN`,
    h1: 'Departamentos amoblados por meses en Buenos Aires',
    kicker: 'Guía · Alquiler a mediano plazo',
    lede: s => `En BAIREN hay ${s.total} departamentos amoblados para alquilar de 3 a 12 meses en ${s.zonas} barrios de Buenos Aires, ${s.libres} disponibles hoy. El precio es final y en dólares: alquiler, expensas, servicios y muebles en un solo número, sin garantía inmobiliaria ni seguro de caución. Van de ${B.usd(s.min)} a ${B.usd(s.max)} por mes.`,
    meta: s => `Alquiler amoblado de 3 a 12 meses en Buenos Aires, todo incluido y sin garantía. ${s.total} departamentos en ${s.zonas} barrios, desde ${B.usd(s.min)} por mes. Precios actualizados todos los días.`,
    act: f => `Actualizado el ${f}`,
    ver: 'Ver los departamentos', wa: 'Consultar por WhatsApp',
    waMsg: 'Hola, vi la guía de BAIREN y busco un departamento amoblado por unos meses.',
    waMsgZona: z => `Hola, vi la guía de BAIREN y busco un departamento amoblado en ${z}.`,
    pasosH: 'Cómo funciona',
    pasos: [
      ['Elegís', 'Mirás las fichas con fotos, precio final y plazo. Lo que ves publicado es lo que pagás por mes.'],
      ['Consultás', 'Escribís por WhatsApp y te responde una persona del equipo. Coordinamos la visita.'],
      ['Reservás', 'Sin garantía inmobiliaria ni seguro de caución: firmás un contrato digital en dólares.'],
      ['Te mudás', 'El departamento está amoblado y equipado. Llegás con la valija.'],
    ],
    barriosH: 'Precios por barrio',
    barriosSub: 'Cuántos departamentos hay en cada barrio y desde cuánto, con los datos de hoy.',
    deptos: n => `${n} ${n === 1 ? 'departamento' : 'departamentos'}`,
    libres: n => `${n} ${n === 1 ? 'disponible' : 'disponibles'}`,
    desde: 'desde', porMes: 'por mes',
    verZona: z => `Ver los de ${z}`,
    listaH: 'Todos los departamentos',
    listaSub: 'Cada uno con su ficha: fotos, plano de datos y el botón para consultar.',
    reservado: 'Reservado', disponible: 'Disponible',
    allin: 'todo incluido', exp: 'más expensas',
    amb: n => `${n} amb.`,
    verMas: 'Ver más info',
    faqH: 'Preguntas frecuentes',
    resenasH: 'Lo que dicen quienes alquilaron',
    cierreH: '¿Buscás algo puntual?',
    cierreP: 'Contanos el barrio, cuántos meses y tu presupuesto. Te respondemos con las opciones que encajan.',
    nav: ['Alquilar', 'Contacto'],
    footer: 'Departamentos amoblados a mediano plazo en Buenos Aires.',
    zonaDesc: z => z.es,
    resumen: B.resumen,
    usd: B.usd,
    fecha: d => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }),
    faq: s => [
      ['¿Se puede alquilar un departamento en Buenos Aires sin garantía?',
        'Sí. En el alquiler a mediano plazo de BAIREN no se pide garantía inmobiliaria ni seguro de caución. Alcanza con demostrar ingresos, propios o de alguien que te avale, y la reserva se hace con un contrato digital en dólares.'],
      ['¿Qué piden para alquilar?',
        'Tu documento y que demuestres ingresos, propios o de alguien que te avale. Antes de firmar nos conocemos en la visita. No hace falta garantía inmobiliaria ni seguro de caución.'],
      ['¿Pueden alquilar extranjeros?',
        'Sí. Con pasaporte y demostración de ingresos, propios o de alguien que te avale. No hace falta garantía argentina. Los precios y el contrato son en dólares. Si escribís en inglés, te respondemos en inglés.'],
      ['¿Cuánto cuesta alquilar un departamento amoblado por meses en Buenos Aires?',
        `Hoy, entre ${B.usd(s.min)} y ${B.usd(s.max)} por mes según el barrio, el tamaño y el edificio. ${s.zonasTxt} El precio publicado es final: incluye el alquiler, las expensas, los servicios y los muebles, salvo las unidades marcadas "más expensas".`],
      ['¿Qué incluye el precio "todo incluido"?',
        'Alquiler, expensas, servicios y muebles en un solo número. Lo que ves publicado es lo que pagás por mes, y el contrato detalla qué cubre cada servicio. Si una unidad tiene las expensas aparte, la ficha lo dice y muestra el monto.'],
      ['¿Por cuánto tiempo se puede alquilar?',
        'De 3 a 12 meses. Es alquiler a mediano plazo: para quien viene a trabajar, estudiar o vivir un tiempo en Buenos Aires, o está entre una casa y otra.'],
      ['¿Los departamentos están amoblados y equipados?',
        'Sí. Todos están amoblados y equipados para vivir desde el primer día: llegás con la valija.'],
      ['¿En qué barrios hay departamentos?',
        `Hoy en ${s.barriosTxt}. El catálogo se puede filtrar por barrio, precio y ambientes.`],
      ['¿Cómo se coordina una visita?',
        'Escribís por WhatsApp al +54 11 2310 6629 o desde el botón de cada ficha, y una persona del equipo coordina el día y el horario. Consultar no tiene cargo.'],
    ],
  },
  en: {
    lang: 'en', path: '/en/furnished-apartments-buenos-aires', otro: '/alquiler-amoblado-buenos-aires', otroLbl: 'ES', otroLang: 'es',
    title: n => `Furnished apartments for monthly rent in Buenos Aires: prices by neighbourhood (${n}) · BAIREN`,
    h1: 'Furnished apartments for monthly rent in Buenos Aires',
    kicker: 'Guide · Medium-term rentals',
    lede: s => `BAIREN lists ${s.total} furnished apartments in Buenos Aires for stays of 3 to 12 months, across ${s.zonas} neighbourhoods, ${s.libres} available today. Prices are final and in US dollars: rent, building fees, utilities and furniture in one number, with no local guarantor and no surety bond. They range from ${B.usdEn(s.min)} to ${B.usdEn(s.max)} per month.`,
    meta: s => `Furnished rentals in Buenos Aires for 3 to 12 months, all inclusive, no guarantor needed. ${s.total} apartments in ${s.zonas} neighbourhoods from ${B.usdEn(s.min)} per month. Prices updated daily.`,
    act: f => `Updated ${f}`,
    ver: 'See the apartments', wa: 'Ask on WhatsApp',
    waMsg: 'Hi, I saw the BAIREN guide and I am looking for a furnished apartment for a few months.',
    waMsgZona: z => `Hi, I saw the BAIREN guide and I am looking for a furnished apartment in ${z}.`,
    pasosH: 'How it works',
    pasos: [
      ['Choose', 'Browse listings with photos, final price and stay length. The published price is what you pay each month.'],
      ['Ask', 'Message us on WhatsApp and a real person from the team replies. We set up the viewing.'],
      ['Book', 'No local guarantor and no surety bond: you sign a digital contract in US dollars.'],
      ['Move in', 'The apartment is furnished and equipped. Just bring your suitcase.'],
    ],
    barriosH: 'Prices by neighbourhood',
    barriosSub: 'How many apartments each neighbourhood has and the lowest monthly price, with today\'s data.',
    deptos: n => `${n} ${n === 1 ? 'apartment' : 'apartments'}`,
    libres: n => `${n} available`,
    desde: 'from', porMes: 'per month',
    verZona: z => `See ${z}`,
    listaH: 'All apartments',
    listaSub: 'Each one has its own page with photos, details and a button to ask about it.',
    reservado: 'Reserved', disponible: 'Available',
    allin: 'all inclusive', exp: 'plus building fees',
    amb: n => `${n} rooms`,
    verMas: 'More info',
    faqH: 'Frequently asked questions',
    resenasH: 'What our tenants say',
    cierreH: 'Looking for something specific?',
    cierreP: 'Tell us the neighbourhood, how many months and your budget. We reply with the options that fit.',
    nav: ['Rent', 'Contact'],
    footer: 'Furnished medium-term apartments in Buenos Aires.',
    zonaDesc: z => z.en,
    resumen: B.resumenEn,
    usd: B.usdEn,
    fecha: d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }),
    faq: s => [
      ['Can I rent an apartment in Buenos Aires without a local guarantor?',
        'Yes. BAIREN\'s medium-term rentals require no local guarantor ("garantía inmobiliaria") and no surety bond ("seguro de caución"). Proof of income, your own or from someone who backs you, is enough, and you book with a digital contract in US dollars.'],
      ['Can foreigners rent?',
        'Yes. You need your passport and proof of income, your own or from someone who backs you. No Argentine guarantor is needed. Prices and contracts are in US dollars, and the team replies in English.'],
      ['How much does a furnished monthly rental cost in Buenos Aires?',
        `Today, between ${B.usdEn(s.min)} and ${B.usdEn(s.max)} per month depending on the neighbourhood, size and building. ${s.zonasTxtEn} The published price is final: it includes rent, building fees, utilities and furniture, except for units marked "plus building fees".`],
      ['What does "all inclusive" cover?',
        'Rent, building fees ("expensas"), utilities and furniture in a single monthly price. The contract details what each utility covers. If a unit has building fees on top, its page says so and shows the amount.'],
      ['How long can I stay?',
        'From 3 to 12 months. These are medium-term rentals: for people moving to Buenos Aires to work, study or live for a while, or in between homes.'],
      ['Are the apartments furnished and equipped?',
        'Yes. Every apartment is furnished and equipped so you can live there from day one: just bring your suitcase.'],
      ['Which neighbourhoods do you cover?',
        `Today: ${s.barriosTxtEn}. The catalogue can be filtered by neighbourhood, price and rooms.`],
      ['How do I book a viewing?',
        'Message +54 11 2310 6629 on WhatsApp, or use the button on each listing, and someone from the team will set the day and time. Asking is free.'],
    ],
  },
};

module.exports = async (req, res) => {
  const L = T[req.query.lang === 'en' ? 'en' : 'es'];
  const todas = await B.publicadas();
  if (!todas) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '120');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><meta charset="utf-8"><title>BAIREN</title><p style="font-family:sans-serif;padding:40px">Estamos actualizando los precios. Probá de nuevo en un minuto o mirá el <a href="/catalogo.html">catálogo</a>.</p>');
  }
  const props = todas.filter(B.enCatalogo)
    .sort((a, b) => (B.disponible(b) - B.disponible(a)) || (B.precio(a) - B.precio(b)));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  res.end(pagina(L, props));
};

function pagina(L, props) {
  const zonas = B.porZona(props);
  const precios = props.map(B.precio).filter(Boolean);
  const nombres = zonas.filter(z => z.key !== 'Otros').map(z => z.key);
  const lista = (arr, y) => arr.length > 1 ? arr.slice(0, -1).join(', ') + ` ${y} ` + arr[arr.length - 1] : arr.join('');
  const s = {
    total: props.length,
    libres: props.filter(B.disponible).length,
    zonas: nombres.length,
    min: Math.min(...precios), max: Math.max(...precios),
    barriosTxt: lista(nombres, 'y'),
    barriosTxtEn: lista(nombres, 'and'),
    zonasTxt: zonas.filter(z => z.desde && z.key !== 'Otros').slice(0, 4).map(z => `En ${z.key}, desde ${B.usd(z.desde)}`).join('; ') + '.',
    zonasTxtEn: zonas.filter(z => z.desde && z.key !== 'Otros').slice(0, 4).map(z => `In ${z.key}, from ${B.usdEn(z.desde)}`).join('; ') + '.',
  };
  const hoy = new Date();
  const pageUrl = B.SITE_ROOT + L.path;
  const otroUrl = B.SITE_ROOT + L.otro;
  const wa = msg => `https://wa.me/${B.WHATSAPP_NUM}?text=${encodeURIComponent(msg)}`;
  const faq = L.faq(s);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': pageUrl + '#page', url: pageUrl, name: L.h1, inLanguage: L.lang,
        description: L.meta(s), dateModified: hoy.toISOString(),
        isPartOf: { '@id': B.SITE_ROOT + '/#web' }, publisher: { '@id': B.ORG_ID },
        about: { '@type': 'Place', name: 'Buenos Aires, Argentina' },
        mainEntity: { '@id': pageUrl + '#lista' },
      },
      {
        '@type': 'ItemList', '@id': pageUrl + '#lista', name: L.listaH, numberOfItems: props.length,
        itemListElement: props.map((p, i) => ({
          '@type': 'ListItem', position: i + 1, url: B.url(p), name: `${B.titulo(p)} — ${p.barrio}`,
        })),
      },
      {
        '@type': 'FAQPage', '@id': pageUrl + '#faq', inLanguage: L.lang,
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'BAIREN', item: B.SITE_ROOT + '/' },
          { '@type': 'ListItem', position: 2, name: L.h1, item: pageUrl },
        ],
      },
    ],
  };

  const foto = (p, w) => p.portada_url || B.sbImg(p.fotos[0], w);
  const tarjetaZona = z => {
    // la portada del catálogo es la foto elegida para vender: la de la disponible
    // más cara del barrio (suele ser la más vistosa); si no hay, la primera foto
    const conPortada = z.props.filter(p => p.portada_url).sort((a, b) => (B.disponible(b) - B.disponible(a)) || (B.precio(b) - B.precio(a)));
    const ej = conPortada[0] || z.props.find(p => p.fotos[0]);
    return `<article class="zona">
      ${ej ? `<img src="${B.esc(foto(ej, 640))}" alt="${B.esc(`${B.titulo(ej)}, ${ej.barrio}`)}" loading="lazy" width="640" height="400">` : ''}
      <div class="zona-txt">
        <h3>${B.esc(z.key)}</h3>
        <p class="zona-num">${L.deptos(z.total)} · ${L.libres(z.libres)}</p>
        ${z.desde ? `<p class="zona-precio"><span>${L.desde}</span> ${B.esc(L.usd(z.desde))} <span>${L.porMes}</span></p>` : ''}
        ${z.key !== 'Otros' ? `<p class="zona-desc">${B.esc(L.zonaDesc(B.ZONAS.find(x => x.key === z.key)))}</p>
        <a class="link" href="/catalogo.html?barrio=${encodeURIComponent(z.key)}">${B.esc(L.verZona(z.key))} →</a>` : ''}
      </div>
    </article>`;
  };
  const tarjetaProp = p => `<li class="prop">
      <a href="${B.esc(B.url(p))}">
        ${p.fotos[0] || p.portada_url ? `<img src="${B.esc(foto(p, 480))}" alt="${B.esc(`${L.lang === 'en' ? 'Furnished apartment at' : 'Departamento amoblado en'} ${B.titulo(p)}, ${p.barrio}`)}" loading="lazy" width="480" height="300">` : ''}
        <span class="estado ${B.disponible(p) ? 'ok' : 'res'}">${B.disponible(p) ? L.disponible : L.reservado}</span>
        <span class="prop-txt">
          <strong>${B.esc(B.titulo(p))}</strong>
          <span class="prop-barrio">${B.esc(p.barrio)}${p.ambientes ? ' · ' + L.amb(p.ambientes) : ''}${p.m2 ? ` · ${p.m2}&nbsp;m²` : ''}</span>
          <span class="prop-precio">${B.precio(p) ? B.esc(L.usd(B.precio(p))) : ''} <small>${L.porMes} · ${B.todoIncluido(p) ? L.allin : L.exp}</small></span>
          <span class="link">${L.verMas} →</span>
        </span>
      </a>
    </li>`;

  return `<!DOCTYPE html>
<html lang="${L.lang}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${B.esc(L.title(hoy.getFullYear()))}</title>
<meta name="description" content="${B.esc(L.meta(s))}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<link rel="canonical" href="${pageUrl}"/>
<link rel="alternate" hreflang="${L.lang === 'en' ? 'en' : 'es'}" href="${pageUrl}"/>
<link rel="alternate" hreflang="${L.otroLang}" href="${otroUrl}"/>
<link rel="alternate" hreflang="x-default" href="${B.SITE_ROOT}/alquiler-amoblado-buenos-aires"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="BAIREN"/>
<meta property="og:title" content="${B.esc(L.h1)}"/>
<meta property="og:description" content="${B.esc(L.meta(s))}"/>
<meta property="og:url" content="${pageUrl}"/>
<meta property="og:image" content="${B.SITE_ROOT}/og-card.jpg"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="/bairen_logo.png?v=3"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet"/>
${B.ldJson(ld)}
<style>
:root{--navy:#2A3A52;--navy-dark:#1E2A3F;--navy-deeper:#131D2D;--gold:#C2A968;--gold-dark:#8A7547;--gold-light:#DECDA0;--white:#FBFAF6;--off-white:#EEE5D0;--text:#1A2538;--mid:#4F5A6E;--line:rgba(42,58,82,.12);--display:'Playfair Display',Georgia,serif;--body:'Jost',system-ui,sans-serif;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{background:var(--navy-dark)}
body{font-family:var(--body);font-weight:400;color:var(--text);background:var(--white);-webkit-font-smoothing:antialiased;font-size:17px;line-height:1.55}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%;height:auto}
nav{position:sticky;top:0;z-index:10;height:64px;background:var(--navy-deeper);border-bottom:1px solid var(--gold);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px,4vw,32px)}
nav img{height:42px;width:auto}
.nav-r{display:flex;gap:clamp(14px,3vw,28px);align-items:center}
.nav-r a{font-size:.78rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.82)}
.nav-r a.lng{border:1px solid rgba(194,169,104,.6);padding:5px 10px;color:var(--gold-light)}
.wrap{max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,32px)}
.hero{background:var(--navy);color:#fff;padding:clamp(44px,8vw,88px) 0 clamp(40px,7vw,72px)}
.kicker{font-size:.78rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-light)}
h1{font-family:var(--display);font-weight:500;font-size:clamp(2rem,6vw,3.4rem);line-height:1.08;margin:14px 0 18px;max-width:20ch}
.lede{font-size:clamp(1.05rem,2.2vw,1.2rem);max-width:62ch;color:rgba(255,255,255,.92)}
.act{margin-top:14px;font-size:.85rem;color:var(--gold-light)}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 26px;font-size:.85rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.btn-gold{background:var(--gold);color:var(--navy-deeper)}
.btn-line{border:1px solid rgba(255,255,255,.7);color:#fff}
section{padding:clamp(48px,8vw,80px) 0}
h2{font-family:var(--display);font-weight:500;font-size:clamp(1.6rem,4vw,2.3rem);color:var(--navy);line-height:1.15}
.sub{color:var(--mid);margin-top:8px;max-width:60ch}
.pasos{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px;counter-reset:p}
.paso{background:#fff;border:1px solid var(--line);padding:22px}
.paso b{display:block;font-family:var(--display);font-weight:500;font-size:1.3rem;color:var(--navy);margin-bottom:6px}
.paso b::before{counter-increment:p;content:counter(p) ". ";color:var(--gold-dark)}
.paso p{color:var(--mid);font-size:.98rem}
.zonas{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}
.zona{background:#fff;border:1px solid var(--line);display:flex;flex-direction:column}
.zona img{aspect-ratio:16/10;object-fit:cover;width:100%}
.zona-txt{padding:18px 20px 20px;display:flex;flex-direction:column;gap:6px;flex:1}
.zona h3{font-family:var(--display);font-weight:500;font-size:1.45rem;color:var(--navy)}
.zona-num{font-size:.92rem;color:var(--mid)}
.zona-precio{font-size:1.35rem;font-weight:600;color:var(--navy)}
.zona-precio span{font-size:.85rem;font-weight:400;color:var(--mid)}
.zona-desc{font-size:.95rem;color:var(--mid);flex:1}
.link{color:var(--gold-dark);font-weight:600;font-size:.92rem;margin-top:4px}
.props{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}
.prop a{display:flex;flex-direction:column;height:100%;background:#fff;border:1px solid var(--line);position:relative}
.prop img{aspect-ratio:16/10;object-fit:cover;width:100%}
.estado{position:absolute;top:12px;left:12px;font-size:.75rem;font-weight:600;letter-spacing:.06em;padding:4px 10px;background:#fff}
.estado.ok{color:#1F6B41}.estado.res{color:#A23B3B}
.prop-txt{display:flex;flex-direction:column;gap:4px;padding:16px 18px 18px;flex:1}
.prop strong{font-family:var(--display);font-weight:500;font-size:1.2rem;color:var(--navy)}
.prop-barrio{font-size:.92rem;color:var(--mid)}
.prop-precio{font-size:1.2rem;font-weight:600;color:var(--navy);margin-top:4px}
.prop-precio small{font-size:.82rem;font-weight:400;color:var(--mid)}
.prop .link{margin-top:auto;padding-top:6px}
.faq{margin-top:24px;border-top:1px solid var(--line)}
details{border-bottom:1px solid var(--line)}
summary{cursor:pointer;list-style:none;padding:18px 36px 18px 0;font-weight:500;font-size:1.05rem;color:var(--navy);position:relative}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";position:absolute;right:4px;top:12px;font-size:1.6rem;font-weight:300;color:var(--gold-dark)}
details[open] summary::after{content:"–"}
details p{padding:0 0 20px;color:var(--mid);max-width:70ch}
.resenas{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}
blockquote{background:#fff;border:1px solid var(--line);padding:22px;font-family:var(--display);font-size:1.12rem;line-height:1.45;color:var(--navy)}
blockquote cite{display:block;margin-top:12px;font-family:var(--body);font-style:normal;font-size:.88rem;color:var(--mid)}
.cierre{background:var(--navy);color:#fff;text-align:center}
.cierre h2{color:#fff}
.cierre p{max-width:52ch;margin:10px auto 0;color:rgba(255,255,255,.9)}
.cierre .ctas{justify-content:center}
.alt{background:var(--off-white)}
footer{background:var(--navy-dark);border-top:1px solid var(--gold);color:rgba(255,255,255,.85);padding:32px 0;font-size:.92rem}
footer .wrap{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center;justify-content:space-between}
footer img{height:40px;width:auto}
footer a{color:var(--gold-light)}
@media(max-width:900px){.pasos{grid-template-columns:repeat(2,1fr)}.zonas,.props,.resenas{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){
  .zonas,.props,.resenas{grid-template-columns:1fr}.btn{width:100%}.nav-r a.hide-m{display:none}
  section{padding:44px 0}
  .pasos{grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}
  .paso{padding:14px}.paso b{font-size:1.1rem}.paso p{font-size:.9rem;line-height:1.4}
  /* en el celular, barrios y departamentos van como filas con la foto al costado */
  .zonas,.props{gap:10px;margin-top:20px}
  .zona,.prop a{position:relative;padding-left:116px;min-height:128px}
  .zona img,.prop img{position:absolute;left:0;top:0;width:116px;height:100%;aspect-ratio:auto;object-fit:cover}
  .zona-txt,.prop-txt{padding:12px 14px;gap:2px}
  .zona h3{font-size:1.2rem}.zona-precio{font-size:1.1rem}.zona-desc{display:none}
  .prop strong{font-size:1.05rem}.prop-precio{font-size:1.05rem}
  .estado{top:8px;left:8px;font-size:.72rem;padding:3px 7px}
  .link{font-size:.88rem}
}
</style>
</head>
<body>
<nav>
  <a href="/" aria-label="BAIREN"><img src="/bairen_logo.png?v=3" alt="BAIREN" width="92" height="42"/></a>
  <div class="nav-r">
    <a href="/catalogo.html">${L.nav[0]}</a>
    <a class="hide-m" href="/#contacto">${L.nav[1]}</a>
    <a class="lng" href="${L.otro}" hreflang="${L.otroLang}" lang="${L.otroLang}">${L.otroLbl}</a>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <p class="kicker">${L.kicker}</p>
    <h1>${L.h1}</h1>
    <p class="lede">${B.esc(L.lede(s))}</p>
    <p class="act">${B.esc(L.act(L.fecha(hoy)))}</p>
    <div class="ctas">
      <a class="btn btn-gold" href="/catalogo.html">${L.ver}</a>
      <a class="btn btn-line" href="${wa(L.waMsg)}" target="_blank" rel="noopener">${L.wa}</a>
    </div>
  </div>
</header>

<main>
<section>
  <div class="wrap">
    <h2>${L.pasosH}</h2>
    <div class="pasos">${L.pasos.map(([t, d]) => `<div class="paso"><b>${t}</b><p>${d}</p></div>`).join('')}</div>
  </div>
</section>

<section class="alt">
  <div class="wrap">
    <h2>${L.barriosH}</h2>
    <p class="sub">${L.barriosSub}</p>
    <div class="zonas">${zonas.map(tarjetaZona).join('')}</div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>${L.listaH} (${props.length})</h2>
    <p class="sub">${L.listaSub}</p>
    <ul class="props">${props.map(tarjetaProp).join('')}</ul>
  </div>
</section>

<section class="alt">
  <div class="wrap">
    <h2>${L.faqH}</h2>
    <div class="faq">${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${B.esc(q)}</summary><p>${B.esc(a)}</p></details>`).join('')}</div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>${L.resenasH}</h2>
    <div class="resenas">${RESENAS[L.lang === 'en' ? 'en' : 'es'].map(([t, q]) => `<blockquote>“${B.esc(t)}”<cite>${B.esc(q)}</cite></blockquote>`).join('')}</div>
  </div>
</section>

<section class="cierre">
  <div class="wrap">
    <h2>${L.cierreH}</h2>
    <p>${L.cierreP}</p>
    <div class="ctas">
      <a class="btn btn-gold" href="${wa(L.waMsg)}" target="_blank" rel="noopener">${L.wa}</a>
      <a class="btn btn-line" href="/catalogo.html">${L.ver}</a>
    </div>
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <img src="/bairen_logo.png?v=3" alt="BAIREN" width="88" height="40"/>
    <span>${L.footer} <a href="https://wa.me/${B.WHATSAPP_NUM}">+54 11 2310 6629</a> · <a href="mailto:contacto@bairengroup.com">contacto@bairengroup.com</a></span>
  </div>
</footer>
<script src="/meta-pixel.js"></script>
</body>
</html>`;
}

/* Tres de las reseñas reales de la home (vault: Testimonios Reales), con su traducción */
const RESENAS = {
  es: [
    ['Mi experiencia ha sido excelente. Estuvieron pendientes de todo el proceso: desde la coordinación para ver el departamento hasta el proceso de reserva, súper sencillo.', 'Catalina · Inquilina'],
    ['Hasta la fecha son los que mejor trato me han dado. Más que sorprendido y agradecido.', 'Tadeo T. · Inquilino'],
    ['Desde el primer momento recibimos una atención profesional, clara y cercana. Una vez iniciado el contrato, el acompañamiento continuó.', 'María Eugenia · Inquilina'],
  ],
  en: [
    ['My experience has been excellent. They were on top of the whole process: from coordinating the viewing to the reservation process, super simple.', 'Catalina · Tenant'],
    ['To this day they have given me the best treatment. More than surprised and grateful.', 'Tadeo T. · Tenant'],
    ['From the very first moment we received professional, clear and warm attention. Once the contract started, the support continued.', 'María Eugenia · Tenant'],
  ],
};
