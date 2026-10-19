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

const lista = (arr, y) => arr.length > 1 ? arr.slice(0, -1).join(', ') + ` ${y} ` + arr[arr.length - 1] : arr.join('');

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
      ['No tengo garantía inmobiliaria ni seguro de caución, ¿dónde puedo alquilar en Buenos Aires?',
        `En BAIREN no se piden. Hay ${s.total} departamentos amoblados de 3 a 12 meses en ${s.barriosTxt}, desde ${B.usd(s.min)} por mes, todo incluido. Alcanza con demostrar ingresos, propios o de alguien que te avale.`],
      ['¿Dónde alquilo un departamento por 3 meses en Buenos Aires?',
        `En BAIREN el plazo va de 3 a 12 meses: podés alquilar por 3, 4, 6 meses o un año, amoblado y con un solo precio final por mes. Hoy desde ${B.usd(s.min)} por mes.`],
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
    // ── Página de un barrio (/alquiler-amoblado-<barrio>) ──
    zPath: slug => `/alquiler-amoblado-${slug}`,
    zTitle: (z, n) => `Departamentos amoblados por meses en ${z}: precios ${n} · BAIREN`,
    zH1: z => `Departamentos amoblados por meses en ${z}`,
    zKicker: z => `Guía de barrio · ${z}`,
    zLede: (s, z) => s.total === 1
      ? `En BAIREN hay 1 departamento amoblado en ${z}${s.incluye} para alquilar de 3 a 12 meses, por ${B.usd(s.min)} por mes. Precio final en dólares, con alquiler, expensas, servicios y muebles, sin garantía inmobiliaria ni seguro de caución.`
      : `En BAIREN hay ${s.total} departamentos amoblados en ${z}${s.incluye} para alquilar de 3 a 12 meses, ${s.libres} disponibles hoy. Van de ${B.usd(s.min)} a ${B.usd(s.max)} por mes, con precio final en dólares: alquiler, expensas, servicios y muebles, sin garantía inmobiliaria ni seguro de caución.`,
    zIncluye: bs => ` (${lista(bs, 'y')})`,
    zMeta: (s, z) => `Departamentos amoblados en ${z} para alquilar de 3 a 12 meses, todo incluido y sin garantía. ${s.total === 1 ? '1 departamento' : s.total + ' departamentos'} desde ${B.usd(s.min)} por mes. Precios de hoy.`,
    tamH: z => `Cuánto cuesta alquilar en ${z}`,
    tamSub: 'El precio más bajo por tamaño, con los datos de hoy.',
    tamLbl: a => a >= 4 ? '4 ambientes o más' : `${a} ${a === 1 ? 'ambiente' : 'ambientes'}`,
    tamFila: (n, l) => `${n} ${n === 1 ? 'departamento' : 'departamentos'}, ${l} ${l === 1 ? 'disponible' : 'disponibles'}`,
    zListaH: z => `Los departamentos de ${z}`,
    otrosH: 'Otros barrios',
    otrosSub: 'Lo mismo, en el resto de Buenos Aires.',
    verBarrio: z => `Ver ${z}`,
    verTodos: 'Ver todos los barrios',
    verCatZona: z => `Ver los de ${z} en el catálogo`,
    zFaq: (s, z, q) => [
      [`¿Cuánto cuesta alquilar un departamento amoblado en ${z}?`,
        `Hoy, en BAIREN, ${s.total === 1 ? B.usd(s.min) : `de ${B.usd(s.min)} a ${B.usd(s.max)}`} por mes. ${s.tamTxt} El precio es final: incluye alquiler, expensas, servicios y muebles, salvo las unidades marcadas "más expensas".`],
      [`¿Se puede alquilar en ${z} sin garantía?`,
        'Sí. En el alquiler a mediano plazo de BAIREN no se pide garantía inmobiliaria ni seguro de caución. Alcanza con demostrar ingresos, propios o de alguien que te avale, y la reserva se hace con un contrato digital en dólares.'],
      [`¿Dónde quedan los departamentos de ${z}?`,
        `${s.dondeTxt} Cada uno tiene su ficha con fotos, mapa y precio.`],
      [`¿Cómo es vivir en ${z}?`, q],
      ['¿Por cuánto tiempo se puede alquilar?',
        'De 3 a 12 meses. Es alquiler a mediano plazo: para quien viene a trabajar, estudiar o vivir un tiempo en Buenos Aires, o está entre una casa y otra.'],
      ['¿Pueden alquilar extranjeros?',
        'Sí. Con pasaporte y demostración de ingresos, propios o de alguien que te avale. No hace falta garantía argentina. Los precios y el contrato son en dólares. Si escribís en inglés, te respondemos en inglés.'],
      ['¿Cómo se coordina una visita?',
        'Escribís por WhatsApp al +54 11 2310 6629 o desde el botón de cada ficha, y una persona del equipo coordina el día y el horario. Consultar no tiene cargo.'],
    ],

    // ── Barrio sin unidades hoy (Colegiales, Villa Urquiza): se dice y se muestran las más cerca ──
    cTitle: (b, n) => `Alquiler amoblado por meses en ${b} y alrededores, sin garantía (${n}) · BAIREN`,
    cLede: (b, cercaTxt) => `Hoy BAIREN no tiene departamentos en ${b}. Los más cerca están en ${cercaTxt}: amoblados, de 3 a 12 meses, con precio final en dólares y sin garantía inmobiliaria ni seguro de caución.`,
    cMeta: (b, s) => `¿Buscás alquilar amoblado en ${b}, sin garantía? Hoy hay ${s.total} departamentos muy cerca, de 3 a 12 meses, todo incluido, desde ${B.usd(s.min)} por mes.`,
    cListaH: b => `Los más cerca de ${b}`,
    cAvisoBtn: 'Avisame cuando haya',
    cAvisoMsg: b => `Hola, busco un departamento amoblado en ${b}. ¿Me avisan si entra uno?`,
    cFaq: (b, s, cercaNombres, desc) => [
      [`¿Dónde alquilo un departamento amoblado en ${b} sin garantía?`,
        `Hoy BAIREN no tiene unidades en ${b}, pero sí ${s.total} muy cerca, en ${cercaNombres}, desde ${B.usd(s.min)} por mes, de 3 a 12 meses y sin garantía inmobiliaria ni seguro de caución. Si querés que te avisemos cuando entre uno en ${b}, escribinos por WhatsApp.`],
      [`¿Cómo es ${b}?`, desc],
    ],
    // ── Guías por tema ──
    temas: {
      'sin-garantia': {
        title: n => `Alquilar sin garantía inmobiliaria ni seguro de caución en Buenos Aires (${n}) · BAIREN`,
        h1: 'Alquilar sin garantía inmobiliaria ni seguro de caución en Buenos Aires',
        kicker: 'Guía · Sin garantía',
        lede: s => `Si no tenés garantía inmobiliaria ni seguro de caución, en BAIREN podés alquilar igual: ${s.total} departamentos amoblados de 3 a 12 meses en ${s.zonas} barrios de Buenos Aires, ${s.libres} disponibles hoy, desde ${B.usd(s.min)} por mes. En lugar de la garantía, alcanza con demostrar ingresos, propios o de alguien que te avale.`,
        meta: s => `¿No tenés garantía inmobiliaria ni seguro de caución? Alquilá amoblado de 3 a 12 meses en Buenos Aires con BAIREN: ${s.total} departamentos desde ${B.usd(s.min)} por mes, todo incluido.`,
        bloqueH: 'Qué te pedimos en lugar de la garantía',
        bloque: [
          ['Tu documento', 'DNI o pasaporte, si venís de afuera.'],
          ['Tus ingresos', 'Propios o de alguien que te avale.'],
          ['Una visita', 'Ves el departamento y nos conocemos antes de firmar.'],
          ['Contrato digital', 'En dólares. Sin garantía inmobiliaria ni seguro de caución.'],
        ],
        faq: s => [
          ['No tengo garantía inmobiliaria, ¿dónde puedo alquilar en Buenos Aires?',
            `En BAIREN no se pide. Hay ${s.total} departamentos amoblados de 3 a 12 meses en ${s.barriosTxt}, desde ${B.usd(s.min)} por mes, todo incluido. Alcanza con demostrar ingresos, propios o de alguien que te avale.`],
          ['No tengo seguro de caución, ¿puedo alquilar igual?',
            'Sí. El alquiler a mediano plazo de BAIREN no pide seguro de caución ni garantía inmobiliaria. Se firma un contrato digital en dólares después de visitar la unidad.'],
          ['Soy del interior o de otro país y no tengo garantía en CABA, ¿puedo alquilar?',
            'Sí. Es justamente para eso: con tu documento (o pasaporte) y demostración de ingresos, propios o de alguien que te avale, alquilás un departamento amoblado de 3 a 12 meses.'],
        ],
      },
      'por-meses': {
        title: n => `Alquilar por 3, 6 o 12 meses en Buenos Aires: departamentos amoblados (${n}) · BAIREN`,
        h1: 'Alquilar por 3, 6 o 12 meses en Buenos Aires',
        kicker: 'Guía · Alquiler por meses',
        lede: s => `En BAIREN alquilás un departamento amoblado por el tiempo que necesites entre 3 y 12 meses: ${s.total} departamentos en ${s.zonas} barrios, ${s.libres} disponibles hoy, desde ${B.usd(s.min)} por mes, todo incluido y sin garantía inmobiliaria ni seguro de caución.`,
        meta: s => `Alquiler por 3, 4, 6 o 12 meses en Buenos Aires: departamentos amoblados, todo incluido y sin garantía. ${s.total} departamentos desde ${B.usd(s.min)} por mes.`,
        bloqueH: 'Cuánto tiempo podés quedarte',
        bloque: [
          ['3 meses', 'El mínimo. Para un trabajo, un cuatrimestre o mientras buscás algo fijo.'],
          ['4 a 11 meses', 'Los meses que necesites, con un solo precio final por mes.'],
          ['12 meses', 'Un año entero, amoblado y sin garantía inmobiliaria.'],
          ['Más de un año', 'Hoy publicamos hasta 12 meses. Si buscás 2 años o más, escribinos y te decimos qué hay.'],
        ],
        faq: s => [
          ['¿Dónde alquilo un departamento por 3 meses en Buenos Aires?',
            `En BAIREN el plazo arranca en 3 meses. Hay ${s.total} departamentos amoblados en ${s.barriosTxt}, desde ${B.usd(s.min)} por mes, todo incluido y sin garantía inmobiliaria.`],
          ['¿Se puede alquilar por 4, 5, 6 u 8 meses?',
            'Sí. Cualquier plazo entre 3 y 12 meses, con un solo precio final por mes: alquiler, expensas, servicios y muebles.'],
          ['¿Puedo alquilar por un año sin garantía?',
            'Sí. Hasta 12 meses, sin garantía inmobiliaria ni seguro de caución. Alcanza con demostrar ingresos, propios o de alguien que te avale.'],
          ['¿Y por menos de 3 meses?',
            'BAIREN alquila desde 3 meses. Por menos tiempo es alquiler turístico, que funciona con otras reglas.'],
          ['¿Y por 2 años o más?',
            'Hoy publicamos alquileres de 3 a 12 meses. Si necesitás 2 años o más, escribinos por WhatsApp y te decimos si hay algo.'],
        ],
      },
    },
    masGuiasH: 'Más guías',
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
      ['I don\'t have an Argentine guarantor or surety bond. Where can I rent in Buenos Aires?',
        `BAIREN doesn't ask for either. There are ${s.total} furnished apartments for 3 to 12 months in ${s.barriosTxtEn}, from ${B.usdEn(s.min)} per month, all inclusive. Proof of income is enough, your own or from someone who backs you.`],
      ['Where can I rent an apartment for 3 months in Buenos Aires?',
        `At BAIREN stays run from 3 to 12 months: you can rent for 3, 4 or 6 months or a full year, furnished and with one final monthly price. Today from ${B.usdEn(s.min)} per month.`],
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
    // ── Neighbourhood page (/en/furnished-apartments-<barrio>) ──
    zPath: slug => `/en/furnished-apartments-${slug}`,
    zTitle: (z, n) => `Furnished apartments for monthly rent in ${z}: ${n} prices · BAIREN`,
    zH1: z => `Furnished apartments for monthly rent in ${z}`,
    zKicker: z => `Neighbourhood guide · ${z}`,
    zLede: (s, z) => s.total === 1
      ? `BAIREN has 1 furnished apartment in ${z}${s.incluye} for stays of 3 to 12 months, at ${B.usdEn(s.min)} per month. Final price in US dollars covering rent, building fees, utilities and furniture, with no local guarantor and no surety bond.`
      : `BAIREN has ${s.total} furnished apartments in ${z}${s.incluye} for stays of 3 to 12 months, ${s.libres} available today. They range from ${B.usdEn(s.min)} to ${B.usdEn(s.max)} per month, final price in US dollars: rent, building fees, utilities and furniture, with no local guarantor and no surety bond.`,
    zIncluye: bs => ` (${lista(bs, 'and')})`,
    zMeta: (s, z) => `Furnished apartments in ${z} for 3 to 12 months, all inclusive, no guarantor needed. ${s.total === 1 ? '1 apartment' : s.total + ' apartments'} from ${B.usdEn(s.min)} per month. Today's prices.`,
    tamH: z => `How much it costs to rent in ${z}`,
    tamSub: 'Lowest monthly price by size, with today\'s data.',
    tamLbl: a => a >= 4 ? '4 rooms or more' : `${a} ${a === 1 ? 'room (studio)' : 'rooms'}`,
    tamFila: (n, l) => `${n} ${n === 1 ? 'apartment' : 'apartments'}, ${l} available`,
    zListaH: z => `Apartments in ${z}`,
    otrosH: 'Other neighbourhoods',
    otrosSub: 'The same, across the rest of Buenos Aires.',
    verBarrio: z => `See ${z}`,
    verTodos: 'See all neighbourhoods',
    verCatZona: z => `See ${z} in the catalogue`,
    zFaq: (s, z, q) => [
      [`How much does a furnished apartment cost in ${z}?`,
        `Today, at BAIREN, ${s.total === 1 ? B.usdEn(s.min) : `from ${B.usdEn(s.min)} to ${B.usdEn(s.max)}`} per month. ${s.tamTxtEn} The price is final: it includes rent, building fees, utilities and furniture, except for units marked "plus building fees".`],
      [`Can I rent in ${z} without a local guarantor?`,
        'Yes. BAIREN\'s medium-term rentals require no local guarantor ("garantía inmobiliaria") and no surety bond ("seguro de caución"). Proof of income, your own or from someone who backs you, is enough, and you book with a digital contract in US dollars.'],
      [`Where are the apartments in ${z}?`,
        `${s.dondeTxtEn} Each one has its own page with photos, map and price.`],
      [`What is it like to live in ${z}?`, q],
      ['How long can I stay?',
        'From 3 to 12 months. These are medium-term rentals: for people moving to Buenos Aires to work, study or live for a while, or in between homes.'],
      ['Can foreigners rent?',
        'Yes. You need your passport and proof of income, your own or from someone who backs you. No Argentine guarantor is needed. Prices and contracts are in US dollars, and the team replies in English.'],
      ['How do I book a viewing?',
        'Message +54 11 2310 6629 on WhatsApp, or use the button on each listing, and someone from the team will set the day and time. Asking is free.'],
    ],

    // ── Neighbourhood with no units today ──
    cTitle: (b, n) => `Furnished monthly rentals in and around ${b}, no guarantor (${n}) · BAIREN`,
    cLede: (b, cercaTxt) => `BAIREN has no apartments in ${b} today. The closest ones are in ${cercaTxt}: furnished, for 3 to 12 months, final price in US dollars, with no local guarantor and no surety bond.`,
    cMeta: (b, s) => `Looking for a furnished rental in ${b} with no guarantor? Today there are ${s.total} apartments nearby, for 3 to 12 months, all inclusive, from ${B.usdEn(s.min)} per month.`,
    cListaH: b => `Closest to ${b}`,
    cAvisoBtn: 'Let me know when there is one',
    cAvisoMsg: b => `Hi, I am looking for a furnished apartment in ${b}. Can you let me know if one comes up?`,
    cFaq: (b, s, cercaNombres, desc) => [
      [`Where can I rent a furnished apartment in ${b} without a guarantor?`,
        `BAIREN has no units in ${b} today, but there are ${s.total} close by, in ${cercaNombres}, from ${B.usdEn(s.min)} per month, for 3 to 12 months, with no local guarantor and no surety bond. Message us on WhatsApp if you want us to let you know when one comes up in ${b}.`],
      [`What is ${b} like?`, desc],
    ],
    temas: {
      'sin-garantia': {
        title: n => `Renting in Buenos Aires without a guarantor or surety bond (${n}) · BAIREN`,
        h1: 'Renting in Buenos Aires without a guarantor or surety bond',
        kicker: 'Guide · No guarantor',
        lede: s => `No Argentine guarantor ("garantía inmobiliaria") and no surety bond ("seguro de caución")? You can still rent with BAIREN: ${s.total} furnished apartments for 3 to 12 months across ${s.zonas} neighbourhoods, ${s.libres} available today, from ${B.usdEn(s.min)} per month. Instead of a guarantor, proof of income is enough, your own or from someone who backs you.`,
        meta: s => `No guarantor or surety bond? Rent a furnished apartment in Buenos Aires for 3 to 12 months with BAIREN: ${s.total} apartments from ${B.usdEn(s.min)} per month, all inclusive.`,
        bloqueH: 'What we ask for instead of a guarantor',
        bloque: [
          ['Your ID', 'Passport if you are coming from abroad.'],
          ['Your income', 'Your own or from someone who backs you.'],
          ['A viewing', 'You see the apartment and we meet before signing.'],
          ['Digital contract', 'In US dollars. No guarantor and no surety bond.'],
        ],
        faq: s => [
          ['I don\'t have an Argentine guarantor. Where can I rent in Buenos Aires?',
            `BAIREN doesn't ask for one. There are ${s.total} furnished apartments for 3 to 12 months in ${s.barriosTxtEn}, from ${B.usdEn(s.min)} per month, all inclusive. Proof of income is enough, your own or from someone who backs you.`],
          ['I don\'t have a surety bond ("seguro de caución"). Can I still rent?',
            'Yes. BAIREN\'s medium-term rentals require no surety bond and no guarantor. You sign a digital contract in US dollars after viewing the unit.'],
          ['I\'m a foreigner with no guarantor in Buenos Aires. Can I rent?',
            'Yes. That is exactly who it is for: with your passport and proof of income, your own or from someone who backs you, you can rent a furnished apartment for 3 to 12 months.'],
        ],
      },
      'por-meses': {
        title: n => `Renting for 3, 6 or 12 months in Buenos Aires: furnished apartments (${n}) · BAIREN`,
        h1: 'Renting for 3, 6 or 12 months in Buenos Aires',
        kicker: 'Guide · Monthly rentals',
        lede: s => `With BAIREN you rent a furnished apartment for as long as you need between 3 and 12 months: ${s.total} apartments across ${s.zonas} neighbourhoods, ${s.libres} available today, from ${B.usdEn(s.min)} per month, all inclusive and with no guarantor or surety bond.`,
        meta: s => `Rent for 3, 4, 6 or 12 months in Buenos Aires: furnished apartments, all inclusive, no guarantor. ${s.total} apartments from ${B.usdEn(s.min)} per month.`,
        bloqueH: 'How long you can stay',
        bloque: [
          ['3 months', 'The minimum. For a job, a semester or while you look for something permanent.'],
          ['4 to 11 months', 'As many months as you need, with one final monthly price.'],
          ['12 months', 'A full year, furnished and with no guarantor.'],
          ['Over a year', 'Today we list stays of up to 12 months. If you need 2 years or more, message us and we will tell you what there is.'],
        ],
        faq: s => [
          ['Where can I rent an apartment for 3 months in Buenos Aires?',
            `At BAIREN stays start at 3 months. There are ${s.total} furnished apartments in ${s.barriosTxtEn}, from ${B.usdEn(s.min)} per month, all inclusive and with no guarantor.`],
          ['Can I rent for 4, 5, 6 or 8 months?',
            'Yes. Any length between 3 and 12 months, with one final monthly price: rent, building fees, utilities and furniture.'],
          ['Can I rent for a year without a guarantor?',
            'Yes. Up to 12 months, with no local guarantor and no surety bond. Proof of income is enough, your own or from someone who backs you.'],
          ['What about less than 3 months?',
            'BAIREN rents from 3 months. Shorter stays are tourist rentals, which follow different rules.'],
          ['What about 2 years or more?',
            'Today we list rentals from 3 to 12 months. If you need 2 years or more, message us on WhatsApp and we will tell you if there is something.'],
        ],
      },
    },
    masGuiasH: 'More guides',
  },
};

module.exports = async (req, res) => {
  const L = T[req.query.lang === 'en' ? 'en' : 'es'];
  const todas = await B.publicadas();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!todas) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '120');
    return res.end('<!doctype html><meta charset="utf-8"><title>BAIREN</title><p style="font-family:sans-serif;padding:40px">Estamos actualizando los precios. Probá de nuevo en un minuto o mirá el <a href="/catalogo.html">catálogo</a>.</p>');
  }
  const props = todas.filter(B.enCatalogo)
    .sort((a, b) => (B.disponible(b) - B.disponible(a)) || (B.precio(a) - B.precio(b)));

  // Qué página es: toda la ciudad, un tema, un barrio con unidades o uno cercano
  const zonaSlug = String(req.query.zona || '');
  const tema = String(req.query.tema || '');
  let ctx = { tipo: 'general' };
  if (tema && L.temas[tema]) ctx = { tipo: 'tema', tema };
  else if (zonaSlug && zonaSlug !== 'buenos-aires') {
    const z = B.ZONAS.find(z => B.slugZona(z.key) === zonaSlug);
    const c = B.CERCA.find(c => B.slugZona(c.key) === zonaSlug);
    const propias = props.filter(p => (z && B.zonaDe(p.barrio) === z.key) || (c && B.norm(p.barrio) === B.norm(c.key)));
    if (propias.length) ctx = { tipo: 'zona', key: (z || c).key, slug: zonaSlug, propias, desc: L.zonaDesc(z || c) };
    else if (c) ctx = { tipo: 'cerca', key: c.key, slug: zonaSlug, cerca: c.cerca, desc: L.zonaDesc(c) };
    else {
      res.statusCode = 404;
      ctx = { tipo: 'general', noindex: true };
    }
  }
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  res.end(pagina(L, props, ctx));
};

function stats(props) {
  const zonas = B.porZona(props);
  const precios = props.map(B.precio).filter(Boolean);
  const nombres = zonas.filter(z => z.key !== 'Otros').map(z => z.key);
  // desde cuánto por tamaño (1, 2, 3 y 4 o más ambientes)
  const tam = [1, 2, 3, 4].map(a => {
    const ps = props.filter(p => (a === 4 ? p.ambientes >= 4 : p.ambientes === a) && B.precio(p));
    return ps.length ? { a, n: ps.length, libres: ps.filter(B.disponible).length, desde: Math.min(...ps.map(B.precio)) } : null;
  }).filter(Boolean);
  const barrios = [...new Set(props.map(p => p.barrio))];
  const calles = props.slice(0, 6).map(p => `${p.dir} (${p.barrio})`);
  return {
    total: props.length,
    libres: props.filter(B.disponible).length,
    zonas: nombres.length,
    min: precios.length ? Math.min(...precios) : 0, max: precios.length ? Math.max(...precios) : 0,
    barriosTxt: lista(nombres, 'y'),
    barriosTxtEn: lista(nombres, 'and'),
    zonasTxt: zonas.filter(z => z.desde && z.key !== 'Otros').slice(0, 4).map(z => `En ${z.key}, desde ${B.usd(z.desde)}`).join('; ') + '.',
    zonasTxtEn: zonas.filter(z => z.desde && z.key !== 'Otros').slice(0, 4).map(z => `In ${z.key}, from ${B.usdEn(z.desde)}`).join('; ') + '.',
    tam,
    tamTxt: tam.map(t => `${t.a >= 4 ? '4 ambientes o más' : t.a === 1 ? '1 ambiente' : t.a + ' ambientes'}, desde ${B.usd(t.desde)}`).join('; ') + '.',
    tamTxtEn: tam.map(t => `${t.a >= 4 ? '4+ rooms' : t.a === 1 ? 'studios' : t.a + ' rooms'} from ${B.usdEn(t.desde)}`).join('; ') + '.',
    barrios,
    dondeTxt: `En ${lista(calles, 'y')}${props.length > 6 ? `, entre otras` : ''}.`,
    dondeTxtEn: `At ${lista(calles, 'and')}${props.length > 6 ? `, among others` : ''}.`,
  };
}

function pagina(L, props, ctx) {
  const en = L.lang === 'en';
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const zonas = B.porZona(props);
  const sAll = stats(props);
  const wa = msg => `https://wa.me/${B.WHATSAPP_NUM}?text=${encodeURIComponent(msg)}`;
  const otroL = T[en ? 'es' : 'en'];

  // ── Lo que cambia según la página ──
  let path, otroPath, title, h1, kicker, lede, meta, faq, lst, listaH, waMsg, verHref, extra = '', bloqueH = null, bloque = null;
  if (ctx.tipo === 'tema') {
    const t = L.temas[ctx.tema], tm = B.TEMAS.find(x => x.key === ctx.tema);
    path = en ? tm.en : tm.es; otroPath = en ? tm.es : tm.en;
    title = t.title(anio); h1 = t.h1; kicker = t.kicker; lede = t.lede(sAll); meta = t.meta(sAll);
    // de las generales salen las que el tema ya contesta (ver el orden de faq en T):
    // sin garantía → 0 y 2 (las de garantía); por meses → 1 y 7 (las de plazo)
    const fuera = ctx.tema === 'sin-garantia' ? [0, 2] : [1, 7];
    faq = [...t.faq(sAll), ...L.faq(sAll).filter((_, i) => !fuera.includes(i))];
    lst = props; listaH = `${L.listaH} (${props.length})`; waMsg = L.waMsg; verHref = '/catalogo.html';
    bloqueH = t.bloqueH; bloque = t.bloque;
  } else if (ctx.tipo === 'zona') {
    const s = stats(ctx.propias);
    const subs = s.barrios.filter(b => B.norm(b) !== B.norm(ctx.key));
    s.incluye = subs.length ? L.zIncluye(subs) : '';
    path = L.zPath(ctx.slug); otroPath = otroL.zPath(ctx.slug);
    title = L.zTitle(ctx.key, anio); h1 = L.zH1(ctx.key); kicker = L.zKicker(ctx.key);
    lede = L.zLede(s, ctx.key); meta = L.zMeta(s, ctx.key);
    faq = L.zFaq(s, ctx.key, ctx.desc);
    lst = ctx.propias; listaH = `${L.zListaH(ctx.key)} (${ctx.propias.length})`;
    waMsg = L.waMsgZona(ctx.key); verHref = `/catalogo.html?barrio=${encodeURIComponent(B.zonaDe(ctx.propias[0].barrio))}`;
    extra = seccionTam(L, s, ctx.key);
    ctx.s = s;
  } else if (ctx.tipo === 'cerca') {
    const cz = ctx.cerca.map(k => zonas.find(z => z.key === k)).filter(Boolean);
    lst = cz.flatMap(z => z.props).sort((a, b) => (B.disponible(b) - B.disponible(a)) || (B.precio(a) - B.precio(b)));
    const s = stats(lst);
    const cercaTxt = lista(cz.map(z => `${z.key} (${z.total}, ${L.desde} ${L.usd(z.desde)})`), en ? 'and' : 'y');
    const cercaNombres = lista(cz.map(z => z.key), en ? 'and' : 'y');
    path = L.zPath(ctx.slug); otroPath = otroL.zPath(ctx.slug);
    title = L.cTitle(ctx.key, anio); h1 = L.zH1(ctx.key); kicker = L.zKicker(ctx.key);
    lede = L.cLede(ctx.key, cercaTxt); meta = L.cMeta(ctx.key, s);
    faq = [...L.cFaq(ctx.key, s, cercaNombres, ctx.desc), ...L.zFaq(s, ctx.key, ctx.desc).slice(4)];
    listaH = `${L.cListaH(ctx.key)} (${lst.length})`;
    waMsg = L.cAvisoMsg(ctx.key); verHref = '/catalogo.html';
  } else {
    path = L.path; otroPath = L.otro;
    title = L.title(anio); h1 = L.h1; kicker = L.kicker; lede = L.lede(sAll); meta = L.meta(sAll);
    faq = L.faq(sAll); lst = props; listaH = `${L.listaH} (${props.length})`; waMsg = L.waMsg; verHref = '/catalogo.html';
  }
  const pageUrl = B.SITE_ROOT + path;
  const otroUrl = B.SITE_ROOT + otroPath;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': pageUrl + '#page', url: pageUrl, name: h1, inLanguage: L.lang,
        description: meta, dateModified: hoy.toISOString(),
        isPartOf: { '@id': B.SITE_ROOT + '/#web' }, publisher: { '@id': B.ORG_ID },
        about: { '@type': 'Place', name: (ctx.key ? ctx.key + ', ' : '') + 'Buenos Aires, Argentina' },
        mainEntity: { '@id': pageUrl + '#lista' },
      },
      {
        '@type': 'ItemList', '@id': pageUrl + '#lista', name: listaH, numberOfItems: lst.length,
        itemListElement: lst.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: B.url(p), name: `${B.titulo(p)} — ${p.barrio}` })),
      },
      {
        '@type': 'FAQPage', '@id': pageUrl + '#faq', inLanguage: L.lang,
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'BAIREN', item: B.SITE_ROOT + '/' },
          ...(ctx.tipo === 'general' ? [] : [{ '@type': 'ListItem', position: 2, name: L.h1, item: B.SITE_ROOT + L.path }]),
          { '@type': 'ListItem', position: ctx.tipo === 'general' ? 2 : 3, name: h1, item: pageUrl },
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
    const href = z.key !== 'Otros' ? L.zPath(B.slugZona(z.key)) : '/catalogo.html';
    return `<article class="zona">
      ${ej ? `<img src="${B.esc(foto(ej, 640))}" alt="${B.esc(`${B.titulo(ej)}, ${ej.barrio}`)}" loading="lazy" width="640" height="400">` : ''}
      <div class="zona-txt">
        <h3>${B.esc(z.key)}</h3>
        <p class="zona-num">${L.deptos(z.total)} · ${L.libres(z.libres)}</p>
        ${z.desde ? `<p class="zona-precio"><span>${L.desde}</span> ${B.esc(L.usd(z.desde))} <span>${L.porMes}</span></p>` : ''}
        ${z.key !== 'Otros' ? `<p class="zona-desc">${B.esc(L.zonaDesc(B.ZONAS.find(x => x.key === z.key)))}</p>` : ''}
        <a class="link" href="${href}">${B.esc(L.verBarrio(z.key))} →</a>
      </div>
    </article>`;
  };
  const tarjetaProp = p => `<li class="prop">
      <a href="${B.esc(B.url(p))}">
        ${p.fotos[0] || p.portada_url ? `<img src="${B.esc(foto(p, 480))}" alt="${B.esc(`${en ? 'Furnished apartment at' : 'Departamento amoblado en'} ${B.titulo(p)}, ${p.barrio}`)}" loading="lazy" width="480" height="300">` : ''}
        <span class="estado ${B.disponible(p) ? 'ok' : 'res'}">${B.disponible(p) ? L.disponible : L.reservado}</span>
        <span class="prop-txt">
          <strong>${B.esc(B.titulo(p))}</strong>
          <span class="prop-barrio">${B.esc(p.barrio)}${p.ambientes ? ' · ' + L.amb(p.ambientes) : ''}${p.m2 ? ` · ${p.m2}&nbsp;m²` : ''}</span>
          <span class="prop-precio">${B.precio(p) ? B.esc(L.usd(B.precio(p))) : ''} <small>${L.porMes} · ${B.todoIncluido(p) ? L.allin : L.exp}</small></span>
          <span class="link">${L.verMas} →</span>
        </span>
      </a>
    </li>`;

  // Links a las demás guías (barrios y temas): para la gente y para los robots
  const otras = B.guias(props).filter(g => (en ? g.en : g.es) !== path);
  const masGuias = `<section class="alt"><div class="wrap">
    <h2>${L.masGuiasH}</h2>
    <div class="guias">${otras.map(g => `<a href="${en ? g.en : g.es}">${B.esc(g.tipo === 'zona' || g.tipo === 'cerca' ? g.nombre : (en ? g.nombreEn : g.nombre))}</a>`).join('')}</div>
  </div></section>`;

  const robots = ctx.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';

  return `<!DOCTYPE html>
<html lang="${L.lang}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${B.esc(title)}</title>
<meta name="description" content="${B.esc(meta)}"/>
<meta name="robots" content="${robots}"/>
<link rel="canonical" href="${pageUrl}"/>
<link rel="alternate" hreflang="${en ? 'en' : 'es'}" href="${pageUrl}"/>
<link rel="alternate" hreflang="${en ? 'es' : 'en'}" href="${otroUrl}"/>
<link rel="alternate" hreflang="x-default" href="${en ? otroUrl : pageUrl}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="BAIREN"/>
<meta property="og:title" content="${B.esc(h1)}"/>
<meta property="og:description" content="${B.esc(meta)}"/>
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
/* bloques de 4 (qué te pedimos, plazos) y tabla de precios por tamaño */
.bloque{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
.bloque div{background:#fff;border:1px solid var(--line);padding:22px}
.bloque b{display:block;font-family:var(--display);font-weight:500;font-size:1.3rem;color:var(--navy);margin-bottom:6px}
.bloque p{color:var(--mid);font-size:.98rem}
.tam{margin-top:24px;border-top:1px solid var(--line);max-width:760px}
.tam div{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:16px 0;border-bottom:1px solid var(--line)}
.tam b{font-weight:500;color:var(--navy)}
.tam span{color:var(--mid);font-size:.92rem}
.tam strong{font-size:1.2rem;color:var(--navy);white-space:nowrap}
.guias{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
.guias a{border:1px solid var(--line);background:#fff;padding:10px 16px;font-size:.95rem;color:var(--navy)}
.guias a:hover{border-color:var(--gold)}
@media(max-width:900px){.bloque{grid-template-columns:repeat(2,1fr)}.pasos{grid-template-columns:repeat(2,1fr)}.zonas,.props,.resenas{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){
  .zonas,.props,.resenas{grid-template-columns:1fr}.btn{width:100%}.nav-r a.hide-m{display:none}
  section{padding:44px 0}
  .pasos,.bloque{grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}
  .bloque div{padding:14px}.bloque b{font-size:1.1rem}.bloque p{font-size:.9rem;line-height:1.4}
  .tam div{flex-wrap:wrap}.tam span{order:3;width:100%}
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
    <a class="lng" href="${otroPath}" hreflang="${L.otroLang}" lang="${L.otroLang}">${L.otroLbl}</a>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <p class="kicker">${B.esc(kicker)}</p>
    <h1>${B.esc(h1)}</h1>
    <p class="lede">${B.esc(lede)}</p>
    <p class="act">${B.esc(L.act(L.fecha(hoy)))}</p>
    <div class="ctas">
      ${ctx.tipo === 'cerca'
        ? `<a class="btn btn-gold" href="${wa(waMsg)}" target="_blank" rel="noopener">${L.cAvisoBtn}</a>`
        : `<a class="btn btn-gold" href="${verHref}">${L.ver}</a>`}
      <a class="btn btn-line" href="${wa(waMsg)}" target="_blank" rel="noopener">${L.wa}</a>
    </div>
  </div>
</header>

<main>
${bloque ? `<section>
  <div class="wrap">
    <h2>${bloqueH}</h2>
    <div class="bloque">${bloque.map(([t, d]) => `<div><b>${t}</b><p>${d}</p></div>`).join('')}</div>
  </div>
</section>` : ''}
${ctx.tipo === 'general' ? `<section>
  <div class="wrap">
    <h2>${L.pasosH}</h2>
    <div class="pasos">${L.pasos.map(([t, d]) => `<div class="paso"><b>${t}</b><p>${d}</p></div>`).join('')}</div>
  </div>
</section>` : ''}
${extra}
${ctx.tipo === 'general' || ctx.tipo === 'tema' ? `<section class="alt">
  <div class="wrap">
    <h2>${L.barriosH}</h2>
    <p class="sub">${L.barriosSub}</p>
    <div class="zonas">${zonas.map(tarjetaZona).join('')}</div>
  </div>
</section>` : ''}

<section>
  <div class="wrap">
    <h2>${B.esc(listaH)}</h2>
    <p class="sub">${L.listaSub}</p>
    <ul class="props">${lst.map(tarjetaProp).join('')}</ul>
  </div>
</section>

<section class="alt">
  <div class="wrap">
    <h2>${L.faqH}</h2>
    <div class="faq">${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${B.esc(q)}</summary><p>${B.esc(a)}</p></details>`).join('')}</div>
  </div>
</section>

${ctx.tipo === 'zona' || ctx.tipo === 'cerca' ? `<section>
  <div class="wrap">
    <h2>${L.otrosH}</h2>
    <p class="sub">${L.otrosSub}</p>
    <div class="zonas">${zonas.filter(z => z.key !== 'Otros' && z.key !== ctx.key).map(tarjetaZona).join('')}</div>
  </div>
</section>` : ''}

<section>
  <div class="wrap">
    <h2>${L.resenasH}</h2>
    <div class="resenas">${RESENAS[en ? 'en' : 'es'].map(([t, q]) => `<blockquote>“${B.esc(t)}”<cite>${B.esc(q)}</cite></blockquote>`).join('')}</div>
  </div>
</section>

${masGuias}

<section class="cierre">
  <div class="wrap">
    <h2>${L.cierreH}</h2>
    <p>${L.cierreP}</p>
    <div class="ctas">
      <a class="btn btn-gold" href="${wa(waMsg)}" target="_blank" rel="noopener">${L.wa}</a>
      <a class="btn btn-line" href="${verHref}">${L.ver}</a>
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

/** "Cuánto cuesta alquilar en Palermo": desde cuánto por tamaño */
function seccionTam(L, s, key) {
  if (!s.tam.length) return '';
  return `<section>
  <div class="wrap">
    <h2>${B.esc(L.tamH(key))}</h2>
    <p class="sub">${L.tamSub}</p>
    <div class="tam">${s.tam.map(t => `<div><b>${L.tamLbl(t.a)}</b><span>${L.tamFila(t.n, t.libres)}</span><strong>${L.desde} ${B.esc(L.usd(t.desde))}</strong></div>`).join('')}</div>
  </div>
</section>`;
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
