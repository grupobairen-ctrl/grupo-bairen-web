'use strict';

/**
 * Filtro de WhatsApp para Bairen (v3). 100% botones/lista/texto = GRATIS, SIN IA.
 *
 * Flujo: barrio(s) -> ambientes -> tiempo -> muestra opciones (foto+desc+link) ->
 *        presupuesto (cascada: barrio+ambientes -> otro barrio -> cualquier cosa en su presupuesto) ->
 *        lista de visita.
 *
 * Toda conversación termina SIEMPRE de una de dos formas:
 *   A) Coordina visita -> botón "Escribir a Tiziana" (link autorrellenado con el depto) ->
 *      'despedida' (si vuelve a escribir, un único "Muchas gracias por tu tiempo...") -> 'fin' (silencio).
 *   B) No quiere / no le interesa / nada en su presupuesto -> "Muchas gracias, te dejo nuestra web..." -> 'fin'.
 *
 * "reiniciar" arranca de cero desde cualquier punto. 'fin' = el bot no responde más.
 */

const TIZIANA_NUM = '5491123106629';
const WEB = 'www.bairengroup.com';
const INSTAGRAM = 'https://instagram.com/grupobairen';
const BARRIOS_TXT = 'Palermo, Recoleta, Belgrano, Núñez, Colegiales, Villa Crespo, Almagro, Centro, Retiro, Puerto Madero, Zona Norte';

// Los 11 barrios que se ofrecen, mapeados a los barrios reales de la base de Supabase.
const ZONAS = [
  { id: 'z_palermo',     titulo: 'Palermo',       barrios: ['Palermo', 'Palermo Hollywood', 'Palermo Soho', 'Las Cañitas'] },
  { id: 'z_recoleta',    titulo: 'Recoleta',      barrios: ['Recoleta'] },
  { id: 'z_belgrano',    titulo: 'Belgrano',      barrios: ['Belgrano C', 'Las Cañitas'] },
  { id: 'z_nunez',       titulo: 'Núñez',         barrios: ['Núñez'] },
  { id: 'z_colegiales',  titulo: 'Colegiales',    barrios: ['Colegiales'] },
  { id: 'z_villacrespo', titulo: 'Villa Crespo',  barrios: ['Villa Crespo'] },
  { id: 'z_almagro',     titulo: 'Almagro',       barrios: ['Almagro'] },
  { id: 'z_centro',      titulo: 'Centro',        barrios: ['Centro'] },
  { id: 'z_retiro',      titulo: 'Retiro',        barrios: ['Retiro'] },
  { id: 'z_madero',      titulo: 'Puerto Madero', barrios: ['Puerto Madero'] },
  { id: 'z_norte',       titulo: 'Zona Norte',    barrios: ['San Isidro'] },
];

const PRESUS = [
  { id: 'pp_800',  titulo: 'Hasta 800',   techo: 800,      desc: 'a menos de 800 USD' },
  { id: 'pp_1500', titulo: '800 a 1500',  techo: 1500,     desc: 'hasta 1500 USD' },
  { id: 'pp_2500', titulo: '1500 a 2500', techo: 2500,     desc: 'hasta 2500 USD' },
  { id: 'pp_max',  titulo: 'Más de 2500', techo: Infinity, desc: 'de más de 2500 USD' },
];

const AMB_LABEL = { amb_1: '1 ambiente', amb_2: '2 ambientes', amb_3: '3 o más ambientes' };

// Zonas AGRUPADAS para el saludo: una lista de 4 opciones (sin texto libre) para que la persona
// toque UNA y elija una región entera. Mata el error de barrios en mensajes sueltos.
// Los 11 barrios entran acá; cada barrio nuevo se agrega a su grupo por cercanía geográfica.
const GRUPOS = [
  { id: 'g_palermo',  titulo: 'Palermo y Recoleta',      desc: 'Palermo · Recoleta · Villa Crespo · Almagro', zonas: ['z_palermo', 'z_recoleta', 'z_villacrespo', 'z_almagro'] },
  { id: 'g_belgrano', titulo: 'Belgrano y Núñez',        desc: 'Belgrano · Núñez · Colegiales',              zonas: ['z_belgrano', 'z_nunez', 'z_colegiales'] },
  { id: 'g_centro',   titulo: 'Retiro y Puerto Madero',  desc: 'Retiro · Puerto Madero · Centro',            zonas: ['z_retiro', 'z_madero', 'z_centro'] },
  { id: 'g_norte',    titulo: 'Zona Norte',              desc: 'San Isidro y alrededores',                   zonas: ['z_norte'] },
];
const grupoPorId = (id) => GRUPOS.find((g) => g.id === id);

// ---------------------------------------------------------------------------
// Helpers de texto (acentos, fuzzy para typos)
// ---------------------------------------------------------------------------
const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Sinónimos / variantes por barrio (para el fallback escrito).
const ZONA_KEYWORDS = {
  z_palermo:     ['palermo', 'las canitas', 'canitas', 'palermo soho', 'soho', 'palermo hollywood', 'hollywood'],
  z_recoleta:    ['recoleta'],
  z_belgrano:    ['belgrano'],
  z_nunez:       ['nunez'],
  z_colegiales:  ['colegiales'],
  z_villacrespo: ['villa crespo', 'crespo'],
  z_almagro:     ['almagro'],
  z_centro:      ['centro', 'microcentro'],
  z_retiro:      ['retiro'],
  z_madero:      ['puerto madero', 'madero'],
  z_norte:       ['zona norte', 'norte', 'san isidro', 'isidro', 'martinez', 'olivos', 'nordelta', 'tigre', 'vicente lopez'],
};
// Palabra-clave única -> zona, para tolerar errores de tipeo (palrmo, recoleeta, etc.)
const FUZZY = {
  palermo: 'z_palermo', canitas: 'z_palermo', soho: 'z_palermo', hollywood: 'z_palermo',
  recoleta: 'z_recoleta', belgrano: 'z_belgrano', nunez: 'z_nunez',
  colegiales: 'z_colegiales', madero: 'z_madero', isidro: 'z_norte',
  crespo: 'z_villacrespo', almagro: 'z_almagro', retiro: 'z_retiro',
};

function parseBarriosTexto(texto) {
  const t = norm(texto);
  if (!t) return [];
  const ids = new Set();
  for (const [id, kws] of Object.entries(ZONA_KEYWORDS)) {
    if (kws.some((k) => t.includes(norm(k)))) ids.add(id);
  }
  for (const w of t.split(/[^a-z]+/).filter((x) => x.length >= 4)) {
    for (const [kw, id] of Object.entries(FUZZY)) {
      if (lev(w, kw) <= (kw.length >= 6 ? 2 : 1)) ids.add(id);
    }
  }
  return [...ids];
}

const ALL_ZONA_IDS = ZONAS.map((z) => z.id);

// Interpreta el barrio contemplando NEGACIÓN y "todos".
//   "todo menos puerto madero y zona norte" -> todas MENOS esas (antes elegía JUSTO esas).
//   "todos" / "cualquiera" / "me da igual"   -> todas.
//   "palermo y recoleta"                     -> las mencionadas (comportamiento normal).
function parseBarriosConNegacion(texto) {
  const t = norm(texto);
  const mencionadas = parseBarriosTexto(texto);
  const hayNegacion = /\b(menos|excepto|salvo|aparte de|fuera de|que no sea|que no sean)\b/.test(t);
  const hayTodo = /\b(todo|todos|todas|cualquiera|cualquier barrio|donde sea|me da igual|me es igual|indistinto|no importa)\b/.test(t);

  // "todo menos X, Y" -> todas menos las mencionadas.
  if (hayNegacion && mencionadas.length) return ALL_ZONA_IDS.filter((id) => !mencionadas.includes(id));
  // "todo" / "cualquiera" sin barrio puntual (o "todo menos <algo que no ofrecemos>") -> todas.
  if (hayTodo && !mencionadas.length) return ALL_ZONA_IDS.slice();
  return mencionadas;
}

function parseAmbTexto(texto) {
  const t = norm(texto);
  if (/\b1\b|^un$|un ambiente|monoambiente|mono\b/.test(t)) return 'amb_1';
  if (/\b2\b|dos\b/.test(t)) return 'amb_2';
  if (/\b[3-9]\b|tres|cuatro|cinco|mas ambiente|o mas/.test(t)) return 'amb_3';
  return null;
}

function parsePresuTexto(texto) {
  const t = norm(texto);
  const nums = (t.match(/\d{2,6}/g) || []).map(Number);
  const max = nums.length ? Math.max(...nums) : null;
  if (max != null) {
    if (max <= 800) return 'pp_800';
    if (max <= 1500) return 'pp_1500';
    if (max <= 2500) return 'pp_2500';
    return 'pp_max';
  }
  if (/menos de 800|hasta 800/.test(t)) return 'pp_800';
  if (/mas de 2500|2500\+/.test(t)) return 'pp_max';
  return null;
}

// "¿En cuánto tiempo te mudás?" escrito: acepta meses del año y fechas concretas (antes no los entendía).
// El valor solo se guarda como nota del lead, así que cualquier señal válida sirve para avanzar.
const MESES = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/;
function parseTiempoTexto(texto) {
  const t = norm(texto);
  if (!t) return null;
  if (/\b(ya|urgente|inmediato|ahora|cuanto antes|lo antes|este mes|esta semana)\b/.test(t)) return 't_ya';
  if (/\b(mas adelante|adelante|no hay apuro|sin apuro|el ano que viene|mirando|viendo)\b/.test(t)) return 't_luego';
  if (/\b(mes|meses|pronto|semana|semanas|quincena|dias|dia)\b/.test(t)) return 't_pronto';
  if (MESES.test(t)) return 't_fecha';                     // "en agosto", "octubre"
  if (/\b\d{1,2}\s*(de|del|\/|-)\s*\w+/.test(t)) return 't_fecha'; // "01 de octubre", "1/10", "15-09"
  return null;
}

// ¿El mensaje pide explícitamente hablar con una persona real / un humano del equipo?
// Corre en CUALQUIER estado; si matchea, derivamos a Tiziana y cerramos.
function pideHumano(texto) {
  const t = norm(texto);
  if (!t) return false;
  // Palabras que casi siempre significan "quiero que me atienda alguien del equipo".
  if (/\b(humano|humana|asesor|asesora|agente|representante|ejecutiv[oa]|operador|operadora|tiziana|tizi)\b/.test(t)) return true;
  if (/persona real|una persona de verdad|gente real|humano real/.test(t)) return true;
  // "sos/eres un bot?", "no sea un bot", "no quiero un bot", "hablar con un bot no".
  if (/\bbot\b/.test(t) && (/\bno\b/.test(t) || /\bsos\b/.test(t) || /\beres\b/.test(t) || /\?/.test(t))) return true;
  // hablar/comunicarse/contactar/atender + persona/alguien/gente/encargado.
  const verbo = /\b(hablar|hablarme|hablo|habla|comunicar|comunicarme|contactar|contactarme|atienda|atender|atiende|charlar|conversar|pasame|pasarme|derivame|derivar)\b/.test(t);
  const objetivo = /\b(persona|alguien|gente|encargad[oa])\b/.test(t);
  if (verbo && objetivo) return true;
  return false;
}

// ¿Pregunta por LA propiedad puntual del anuncio ("el del aviso", "este depto", "el del reel")?
// Los anuncios muestran unidades concretas (reels virales); el bot no sabe cuál es -> a Tiziana.
function pideAnuncio(texto) {
  const t = norm(texto);
  if (!t) return false;
  // Si es intención de COMPRA, lo maneja el filtro comprar/alquilar (mensaje de venta), no Tiziana.
  if (/\b(venta|vender|comprar|compra|adquirir)\b/.test(t)) return false;
  if (/\b(anuncio|aviso|posteo|publicacion|publicidad|reel|reels)\b/.test(t)) return true;   // "el del anuncio"
  if (/\b(instagram|facebook)\b/.test(t)) return true;                                        // "el que vi en instagram"
  if (/\b(este|esta|ese|esa)\s+(depto|departamento|depa|depo|propiedad|unidad|ph|triplex|monoambiente|inmueble|lugar)\b/.test(t)) return true; // "este depto"
  if (/\b(este|esta|ese|esa)\b.*\b(particular|puntual|especifico)\b/.test(t)) return true;    // "este en particular"
  if (/\b(la|esa|dicha) unidad\b/.test(t) || /\bte consulte\b/.test(t) || /\bel que vi\b/.test(t)) return true;
  if (/\b(de la|del) (foto|imagen|video|publicacion|historia|reel)\b/.test(t)) return true;
  if (/\btriplex\b/.test(t)) return true;                                                     // la propiedad del aviso
  return false;
}

// ---------------------------------------------------------------------------
// Búsqueda de propiedades
// ---------------------------------------------------------------------------
const money = (n) => (n == null ? '' : 'USD ' + Number(n).toLocaleString('es-AR'));
const precioDe = (p) => p.precio_temporal ?? p.precio_tradicional ?? null;
const zonaPorId = (id) => ZONAS.find((z) => z.id === id);
const presuPorId = (id) => PRESUS.find((x) => x.id === id);
const zonasTitulo = (ids) => {
  const n = (ids || []).map((z) => (zonaPorId(z) || {}).titulo).filter(Boolean);
  return n.length <= 1 ? (n[0] || '') : n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
};

// Títulos de los GRUPOS ya elegidos (para "…además de Palermo y Recoleta"). Los grupos se suman enteros.
const gruposElegidos = (zonas) => GRUPOS.filter((g) => g.zonas.every((z) => (zonas || []).includes(z)));
const gruposTitulo = (zonas) => {
  const t = gruposElegidos(zonas).map((g) => g.titulo);
  return t.length <= 1 ? (t[0] || '') : t.slice(0, -1).join(', ') + ' y ' + t[t.length - 1];
};

function barriosDe(zonaIds) {
  const set = new Set();
  (zonaIds || []).forEach((id) => (zonaPorId(id) || { barrios: [] }).barrios.forEach((b) => set.add(b)));
  return [...set];
}

// Une zonas ya elegidas + las nuevas, sin duplicar, en orden canónico (para el multi-zona "sumar otra").
function mergeZonas(actuales, nuevas) {
  const set = new Set([...(actuales || []), ...(nuevas || [])]);
  return ALL_ZONA_IDS.filter((id) => set.has(id));
}

function matchAmb(p, ambId) {
  if (ambId === 'amb_1') return p.ambientes === 1;
  if (ambId === 'amb_2') return p.ambientes === 2;
  if (ambId === 'amb_3') return (p.ambientes || 0) >= 3;
  return true;
}

// zonaIds = null  -> busca en TODOS los barrios (matching cruzado).
function buscar(props, zonaIds, ambId, techo) {
  const barrios = zonaIds ? barriosDe(zonaIds) : null;
  return props
    .filter((p) => (barrios ? barrios.includes(p.barrio) : true))
    .filter((p) => (ambId ? matchAmb(p, ambId) : true))
    .filter((p) => (techo == null ? true : (precioDe(p) ?? Infinity) <= techo))
    .sort((a, b) => (precioDe(a) ?? 0) - (precioDe(b) ?? 0));
}

const nombreUnidad = (p) => (p.unidad ? `${p.dir} (${p.unidad})` : p.dir);
const etiquetaUnidad = (p) => (p.unidad ? `${p.dir} ${p.unidad}` : p.dir).slice(0, 24);

// Cada opción: 1 foto de portada con el detalle como epígrafe (orden garantizado).
// En temporales: precio en *negrita* + "Todo incluido". Saco la descripción para que no quede un choclo
// (la foto y el link ya cuentan el lugar; el detalle completo está en la web).
function mostrarUnidad(p) {
  const web = `https://www.bairengroup.com/propiedad.html?slug=${p.slug}`;
  const fotos = (p.imagenes || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const amb = `${p.ambientes ?? '?'} ${p.ambientes === 1 ? 'ambiente' : 'ambientes'}`;
  const esTemporal = p.precio_temporal != null;
  const lineaPrecio = esTemporal
    ? `*${money(precioDe(p))}/mes*\n*(Todo incluido: Alquiler + expensas + gastos)*`
    : `*${money(precioDe(p))}/mes + expensas*`;
  const caption =
    `${nombreUnidad(p)}, ${p.barrio}\n` +
    `${amb} · ${p.m2 ?? '?'} m²\n` +
    `${lineaPrecio}\n` +
    `Ver más fotos en la web: ${web}`;
  return fotos[0] ? [{ tipo: 'imagen_caption', url: fotos[0].url, caption }] : [{ tipo: 'texto', texto: caption }];
}

const aMostrado = (p) => ({ slug: p.slug, etiqueta: etiquetaUnidad(p), nombre: nombreUnidad(p) });

function listaVisita(mostrados, esAlternativa) {
  const filas = mostrados.map((m) => ({ id: 'visit_' + m.slug, titulo: m.etiqueta }));
  filas.push({ id: 'no_visita', titulo: 'No me interesa' }); // <=24 chars (sin cortar "visita")
  return {
    tipo: 'lista',
    // Si son alternativas que ofrecemos nosotros (otra medida), no decimos "lo que estás buscando".
    texto: esAlternativa
      ? 'Tu presupuesto se adecúa a estas alternativas. ¿Te gustaría coordinar una visita?'
      : 'Tu presupuesto se adecúa a lo que estás buscando. ¿Te gustaría coordinar una visita?',
    boton: 'Coordinar visita',
    filas,
  };
}

function linkTiziana(nombreDepto) {
  const msg = `Hola Tiziana cómo estás? Soy [tu nombre], me gustaría coordinar una visita para ${nombreDepto}. Muchas gracias!`;
  return `https://wa.me/${TIZIANA_NUM}?text=${encodeURIComponent(msg)}`;
}

// Cierre cuando NO coordina visita: web + contacto de Tiziana (acá SIN mensaje predeterminado),
// para no perder al lead que se equivocó de opción o quiere ver más cosas.
function cierreWeb() {
  return [
    { tipo: 'texto', texto: `Muchas gracias. Te dejo nuestra web para que veas todas nuestras opciones: ${WEB}.` },
    { tipo: 'cta', texto: 'Por consultas sobre más opciones disponibles, te dejo el contacto de Tiziana, del equipo. Ella estará a tu disposición. ¡Saludos!', cta: 'Escribir a Tiziana', url: `https://wa.me/${TIZIANA_NUM}` },
  ];
}

// El usuario pidió hablar con una persona real -> le pasamos el contacto de Tiziana con un botón.
function derivarHumano() {
  return [{
    tipo: 'cta',
    texto: 'Claro! Te dejo el contacto de Tiziana, del equipo de Bairen.\nCualquier consulta ella te dará una mano',
    cta: 'Escribir a Tiziana',
    url: `https://wa.me/${TIZIANA_NUM}`,
  }];
}

// Busca comprar: todavía no vendemos -> mensaje honesto + botón para seguir el Instagram.
function cierreVenta() {
  return [
    { tipo: 'texto', texto:
      'Gracias por escribir. Por ahora en Bairen nos dedicamos a los alquileres, temporales y tradicionales; todavía no tenemos propiedades en venta.\n\n' +
      'Muy pronto vamos a sumar venta. Si querés, seguinos en Instagram y te enterás apenas lancemos.' },
    { tipo: 'cta', texto: 'Te dejo acá nuestro Instagram.', cta: 'Seguir en Instagram', url: INSTAGRAM },
  ];
}

// Pregunta por "el del anuncio / este depto" (los avisos muestran unidades puntuales, los reels virales).
// El bot no sabe cuál es -> lo pasamos directo a Tiziana con contexto, que es el lead más caliente.
function derivarAnuncio() {
  const msg = 'Hola Tiziana, cómo estás? Vengo del anuncio y quería consultar por la propiedad que vi. Muchas gracias!';
  return [{
    tipo: 'cta',
    texto: 'Buenísimo. Para esa propiedad en particular te paso con Tiziana, del equipo, que tiene todo el detalle y coordina la visita.',
    cta: 'Escribir a Tiziana',
    url: `https://wa.me/${TIZIANA_NUM}?text=${encodeURIComponent(msg)}`,
  }];
}

// Mandó audio/foto/video/sticker en vez de escribir: no lo podemos leer, le pedimos que escriba.
const M_ESCRIBIME = { tipo: 'texto', texto: 'Podría pedirte que me escribas? Nos entendemos mejor por mensaje :)' };

// ---------------------------------------------------------------------------
// Mensajes
// ---------------------------------------------------------------------------
// El saludo se manda en 2 mensajes (más humano).
const SALUDO_1 = 'Hola, cómo estás? Te habla Tomás, asistente de Bairen';
const SALUDO_2 =
  'Te ayudo a encontrar tu próximo hogar.\n' +
  'Contame, ¿En qué barrio/s estás buscando?\n\n' +
  `(${BARRIOS_TXT})`;

const M = {
  // Pregunta filtro de entrada: comprar o alquilar (ataja a los que vienen por venta desde los anuncios).
  intencion: () => ({
    tipo: 'botones',
    texto: 'Contame, ¿estás buscando comprar o alquilar?',
    botones: [
      { id: 'int_alquilar', titulo: 'Alquilar' },
      { id: 'int_comprar', titulo: 'Comprar' },
    ],
  }),
  // Saludo/zona por LISTA de 4 grupos (una sola opción) en vez de texto libre.
  zonaGrupos: () => ({
    tipo: 'lista',
    texto: 'Te ayudo a encontrar tu próximo hogar.\n¿En qué zona estás buscando?',
    boton: 'Ver zonas',
    filas: GRUPOS.map((g) => ({ id: g.id, titulo: g.titulo, desc: g.desc })),
  }),
  // Lista de zonas cuando SUMA otra: mensaje distinto (no repite el saludo) y esconde las ya elegidas.
  zonaGruposMas: (zonas) => {
    const restantes = GRUPOS.filter((g) => !g.zonas.every((z) => (zonas || []).includes(z)));
    const filas = (restantes.length ? restantes : GRUPOS).map((g) => ({ id: g.id, titulo: g.titulo, desc: g.desc }));
    return {
      tipo: 'lista',
      texto: `Perfecto. ¿Qué zona te gustaría sumar además de ${gruposTitulo(zonas)}?`,
      boton: 'Ver zonas',
      filas,
    };
  },
  // Después de elegir una zona: ¿sumar otra o seguir? (multi-zona 100% botón)
  zonaMas: () => ({
    tipo: 'botones',
    texto: '¿Querés sumar otra zona o seguimos?',
    botones: [
      { id: 'zona_add', titulo: 'Agregar otra zona' },
      { id: 'zona_go', titulo: 'Seguir' },
    ],
  }),
  zonaFlow: () => ({ tipo: 'flow', texto: SALUDO_2, cta: 'Elegir barrios' }), // (queda por si se activa WhatsApp Flows)
  barrioInvalido: () => ({
    tipo: 'texto',
    texto: 'Esa no la tenemos en cartera por ahora. Tocá "Ver zonas" y elegí una de estas opciones:',
  }),
  ambientes: () => ({
    tipo: 'botones',
    texto: '¿Cuántos ambientes necesitás?',
    botones: [
      { id: 'amb_1', titulo: '1 ambiente' },
      { id: 'amb_2', titulo: '2 ambientes' },
      { id: 'amb_3', titulo: '3 o más' },
    ],
  }),
  tiempo: () => ({
    tipo: 'botones',
    texto: '¿En cuánto tiempo planeas mudarte?',
    botones: [
      { id: 't_ya', titulo: 'Este mes' },
      { id: 't_pronto', titulo: 'En 2-3 meses' },
      { id: 't_luego', titulo: 'Más adelante' },
    ],
  }),
  presupuesto: () => ({
    tipo: 'lista',
    texto: '¿Cuál es tu presupuesto mensual? (En $USD)',
    boton: 'Elegir presupuesto',
    filas: PRESUS.map((x) => ({ id: x.id, titulo: x.titulo })),
  }),
  reintento: (canned) => [{ tipo: 'texto', texto: 'Por favor, seleccioná una de las opciones de abajo.' }, canned],
};

const R = (mensajes, estado, extra) => ({ mensajes, estado, usarIA: false, lead: null, ...(extra || {}) });

// Saludo inicial = 2 mensajes (presentación + pregunta filtro comprar/alquilar).
const saludoInicial = () => [{ tipo: 'texto', texto: SALUDO_1 }, M.intencion()];

// ---------------------------------------------------------------------------
// Máquina de estados
// ---------------------------------------------------------------------------
function procesarFlujo(estado, input, props) {
  estado = estado && typeof estado === 'object' ? { ...estado } : {};
  const step = estado.step || 'inicio';
  const id = input && input.id;
  const esOpcion = input && input.tipo === 'opcion' && id;
  const esTexto = input && input.tipo === 'texto';
  const esMedia = input && input.tipo === 'media';
  const texto = (input && input.texto) || '';

  // Reinicio desde CUALQUIER estado: "reiniciar"/"menu" o un SALUDO solo ("hola", "buenas").
  // (Si el saludo viene con un barrio, ej "hola busco en palermo", NO entra acá y se procesa normal.)
  if (esTexto && /^(reiniciar|reset|empezar|empezar de nuevo|volver a empezar|menu|arrancar|hola+|holis|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hello|hi|hey|ola|que tal)[\s!.,¡?]*$/.test(norm(texto))) {
    return R(saludoInicial(), { step: 'intencion', zonas: [] });
  }

  // Pedido explícito de un humano ("quiero hablar con una persona real", "sos un bot?", etc.).
  // Vale en CUALQUIER estado: le pasamos el contacto de Tiziana con un botón y cerramos.
  if (esTexto && pideHumano(texto)) {
    return R(derivarHumano(), { ...estado, step: 'fin' });
  }

  // Pregunta por "el del anuncio / este depto" -> directo a Tiziana (lead caliente por una unidad puntual).
  // NO en el primer mensaje (inicio): al lead nuevo lo saludamos y filtramos igual; recién si insiste.
  if (esTexto && step !== 'inicio' && step !== 'cerrado' && pideAnuncio(texto)) {
    return R(derivarAnuncio(), { ...estado, step: 'fin' });
  }

  // Audio/foto/video/sticker: no los podemos leer, le pedimos que escriba.
  // (Usuario nuevo -> lo saludamos igual; 'fin' -> silencio para no molestar mientras Tiziana atiende.)
  if (esMedia) {
    if (step === 'inicio' || step === 'cerrado') return R(saludoInicial(), { step: 'intencion', zonas: [] });
    if (step === 'fin') return R([], { ...estado, step: 'fin' });
    return R([M_ESCRIBIME], estado);
  }

  // Estado terminal: ya derivado/cerrado. Solo se REACTIVA si dice "hola"/"buenas" en cualquier
  // parte del mensaje. Cualquier otra cosa -> silencio (no molesta mientras Tiziana atiende).
  if (step === 'fin') {
    if (esTexto && /\b(hola+|holis|buenas|buen dia|buenos dias|hello)\b/.test(norm(texto))) {
      return R(saludoInicial(), { step: 'intencion', zonas: [] });
    }
    return R([], { ...estado, step: 'fin' });
  }

  if (step === 'inicio' || step === 'cerrado') {
    return R(saludoInicial(), { step: 'intencion', zonas: [] });
  }

  // --- Intención: ¿comprar o alquilar? (ataja a los que vienen por venta desde los anuncios) ---
  if (step === 'intencion') {
    const t = norm(texto);
    const alquilar = (esOpcion && id === 'int_alquilar') || (esTexto && /\b(alquilar|alquiler|alquilo|rentar|renta|temporal|tradicional|arrendar|inquilino)\b/.test(t));
    const comprar = (esOpcion && id === 'int_comprar') || (esTexto && /\b(comprar|compra|comprarme|venta|vender|adquirir|invertir|inversion|inversores|dueno)\b/.test(t));
    // Si menciona alquiler (aunque también diga comprar, ej "alquilar no comprar") -> es nuestro negocio.
    if (alquilar) return R([M.zonaGrupos()], { ...estado, step: 'zona_flow' });
    if (comprar) return R(cierreVenta(), { ...estado, step: 'fin' });
    return R(M.reintento(M.intencion()), estado);
  }

  // --- Barrios: SOLO por botón. Toca un grupo -> lo suma y pregunta si quiere otra zona (multi-zona). ---
  if (step === 'zona_flow') {
    // La lista: la primera vez es el saludo; si ya eligió algo (viene de "sumar otra"), mensaje distinto.
    const listaZonas = (estado.zonas || []).length ? M.zonaGruposMas(estado.zonas) : M.zonaGrupos();
    // 1) Tocó un grupo. La 1ra vez ofrecemos sumar UNA más; si ya tenía una (esta es la 2da) -> directo a ambientes.
    if (esOpcion && grupoPorId(id)) {
      const zonas = mergeZonas(estado.zonas, grupoPorId(id).zonas);
      if ((estado.zonas || []).length) return R([M.ambientes()], { ...estado, step: 'ambientes', zonas });
      return R([M.zonaMas()], { ...estado, step: 'zona_mas', zonas });
    }
    // 2) Formulario multi-zona (si se activa WhatsApp Flows) -> llega la lista de zonas ya elegida.
    const zonas = input && Array.isArray(input.zonas) ? input.zonas.filter((z) => zonaPorId(z)) : [];
    if (zonas.length) {
      return R([M.ambientes()], { ...estado, step: 'ambientes', zonas });
    }
    // Escribió en vez de tocar -> NO lo tomamos como respuesta, le pedimos que use la lista.
    if (esTexto && texto.trim()) {
      return R(M.reintento(listaZonas), { ...estado, step: 'zona_flow' });
    }
    return R([listaZonas], { ...estado, step: 'zona_flow' });
  }

  // --- ¿Sumar otra zona o seguir? (multi-zona) ---
  if (step === 'zona_mas') {
    if (esOpcion && id === 'zona_go') {
      if (!(estado.zonas || []).length) return R([M.zonaGrupos()], { ...estado, step: 'zona_flow' });
      return R([M.ambientes()], { ...estado, step: 'ambientes' });
    }
    if (esOpcion && id === 'zona_add') {
      // Si ya tiene las 4 zonas, no hay nada más para sumar -> seguimos.
      if (!GRUPOS.some((g) => !g.zonas.every((z) => (estado.zonas || []).includes(z)))) {
        return R([M.ambientes()], { ...estado, step: 'ambientes' });
      }
      return R([M.zonaGruposMas(estado.zonas)], { ...estado, step: 'zona_flow' });
    }
    // Tocó otro grupo directo (botón viejo) -> es la 2da zona -> directo a ambientes (no re-preguntamos).
    if (esOpcion && grupoPorId(id)) {
      const zonas = mergeZonas(estado.zonas, grupoPorId(id).zonas);
      return R([M.ambientes()], { ...estado, step: 'ambientes', zonas });
    }
    // Cualquier otra cosa (texto) -> pedimos que use los botones.
    return R(M.reintento(M.zonaMas()), estado);
  }

  // --- Ambientes (SOLO botón) ---
  if (step === 'ambientes') {
    const amb = (esOpcion && AMB_LABEL[id]) ? id : null;
    if (amb) return R([M.tiempo()], { ...estado, step: 'tiempo', ambientes: amb });
    return R(M.reintento(M.ambientes()), estado);
  }

  // --- Tiempo + mostrar opciones del barrio/ambientes (SOLO botón) ---
  if (step === 'tiempo') {
    const t = (esOpcion && ['t_ya', 't_pronto', 't_luego'].includes(id)) ? id : null;
    if (!t) return R(M.reintento(M.tiempo()), estado);

    const ambTit = AMB_LABEL[estado.ambientes] || '';
    const zonasTit = zonasTitulo(estado.zonas);
    // TODAS las opciones de barrio + ambientes (cualquier precio), CON FOTOS. Después el presupuesto filtra.
    const matches = buscar(props, estado.zonas, estado.ambientes, null);
    const TCAP = 5; // máx con fotos por mensaje (límite de tiempo de la función)
    const top = matches.slice(0, TCAP);

    const mensajes = [];
    if (top.length) {
      mensajes.push({ tipo: 'texto', texto: `Perfecto, ${ambTit} en ${zonasTit}, podemos ofrecerte:` });
      for (const p of top) mensajes.push(...mostrarUnidad(p));
      if (matches.length > TCAP) mensajes.push({ tipo: 'texto', texto: `Y tengo ${matches.length - TCAP} opción/es más. Las vemos según tu presupuesto.` });
    } else {
      mensajes.push({ tipo: 'texto', texto: `${ambTit} en ${zonasTit}: según tu presupuesto te muestro lo que mejor se ajuste.` });
    }
    mensajes.push(M.presupuesto());
    return R(mensajes, { ...estado, step: 'presupuesto', timing: t });
  }

  // --- Presupuesto: filtra y arma la visita (SOLO botón) ---
  if (step === 'presupuesto') {
    const presu = (esOpcion && presuPorId(id)) ? presuPorId(id) : null;
    if (!presu) return R(M.reintento(M.presupuesto()), estado);

    const zonasTit = zonasTitulo(estado.zonas);
    const ambTit = AMB_LABEL[estado.ambientes] || 'eso';
    const techo = presu.techo;

    // Cascada: nunca dejar al lead sin mostrar nada si hay algo dentro de su presupuesto.
    let nivel = 'exacto';
    let matches = buscar(props, estado.zonas, estado.ambientes, techo);                  // 1) barrio + ambientes
    if (!matches.length) { matches = buscar(props, null, estado.ambientes, techo); nivel = 'cruzado'; }   // 2) otro barrio, mismos ambientes
    if (!matches.length) { matches = buscar(props, null, null, techo); nivel = 'presupuesto'; }           // 3) cualquier cosa en su presupuesto

    // Solo si NO hay literalmente nada en su presupuesto -> pedimos nombre + email.
    if (!matches.length) {
      return R(cierreWeb(), { ...estado, step: 'fin' });
    }

    const CAP = 5; // máximo con fotos por mensaje (límite de tiempo de la función)
    const top = matches.slice(0, CAP);
    const mostrados = top.map(aMostrado);
    const mensajes = [];
    if (nivel === 'cruzado') {
      mensajes.push({ tipo: 'texto', texto: `En ${zonasTit} no tengo en ese presupuesto, pero te muestro estas que sí se ajustan:` });
      for (const p of top) mensajes.push(...mostrarUnidad(p));
    } else if (nivel === 'presupuesto') {
      mensajes.push({ tipo: 'texto', texto: `No tengo ${ambTit} en ese presupuesto, te paso opciones que se ajustan a tus preferencias:` });
      for (const p of top) mensajes.push(...mostrarUnidad(p));
    }
    // nivel 'exacto': ya las mostró con fotos en el paso anterior -> directo a la lista de visita.
    if (nivel !== 'exacto' && matches.length > CAP) {
      mensajes.push({ tipo: 'texto', texto: `Y tengo ${matches.length - CAP} más en tu presupuesto.` });
    }
    const esAlt = nivel === 'presupuesto';
    mensajes.push(listaVisita(mostrados, esAlt));

    return {
      mensajes,
      estado: { ...estado, step: 'visita', presupuesto: id, mostrados, esAlt },
      usarIA: false,
      lead: {
        zona: zonasTit,
        ambientes: ambTit,
        presupuesto: presu.titulo,
        propiedad_slug: top[0] ? top[0].slug : null,
        notas: `timing: ${estado.timing}; lead calificado (filtro); match ${nivel}`,
      },
    };
  }

  // --- Visita ---
  if (step === 'visita') {
    const noQuiere = (esOpcion && id === 'no_visita') || (esTexto && /^\s*(no|no me interesa|nada|paso|despues|luego)\b/i.test(norm(texto)));
    if (noQuiere) {
      return R(cierreWeb(), { ...estado, step: 'fin' });
    }
    let slug = null;
    if (esOpcion && id && id.startsWith('visit_')) slug = id.slice('visit_'.length);
    else if (esTexto && texto.trim()) {
      const t = norm(texto);
      const hit = (estado.mostrados || []).find((m) => t.includes(norm(m.nombre)) || norm(m.nombre).includes(t) || t.includes(norm(m.etiqueta)));
      if (hit) slug = hit.slug;
    }
    if (slug) {
      const elegido = (estado.mostrados || []).find((m) => m.slug === slug);
      const nombre = elegido ? elegido.nombre : 'el departamento';
      // Handoff a Tiziana: botón limpio (esconde el link largo) + qué contarle. Y termina.
      return R([
        { tipo: 'cta', texto: 'Perfecto. Para coordinar la visita, escribile a Tiziana.', cta: 'Escribir a Tiziana', url: linkTiziana(nombre) },
        { tipo: 'texto', texto: `Contale tu nombre y que estás interesado en visitar ${nombre}.\nAsí coordinamos día y horario.` },
      ], { ...estado, step: 'despedida', elegido: slug });
    }
    return R(M.reintento(listaVisita(estado.mostrados || [], estado.esAlt)), estado);
  }

  // --- Despedida: una última respuesta y después silencio total ---
  if (step === 'despedida') {
    return R(
      [{ tipo: 'texto', texto: 'Muchas gracias por tu tiempo. Cualquier cosa, Tizi será la encargada de ayudarte en lo que necesites. Saludos!' }],
      { ...estado, step: 'fin' },
    );
  }

  return R([M.zonaGrupos()], { step: 'zona_flow', zonas: [] });
}

module.exports = { procesarFlujo, ZONAS, GRUPOS, parseBarriosTexto, parseBarriosConNegacion, parseAmbTexto, parsePresuTexto, parseTiempoTexto, pideHumano, pideAnuncio };
