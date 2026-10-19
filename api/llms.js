/**
 * Vercel Function — /llms.txt (19/10/2026)
 *
 * Un resumen en texto plano para asistentes de IA (formato de llmstxt.org):
 * qué es BAIREN, cómo funciona el alquiler y la lista de departamentos con
 * precio, barrio y link, armada con lo publicado. En castellano y en inglés,
 * porque buena parte de quien pregunta por amoblados en Buenos Aires escribe
 * en inglés.
 *
 * Llega acá vía vercel.json: /llms.txt → /api/llms
 * Mantener las condiciones espejadas con la home y con api/guia.js.
 */

const B = require('./_bairen');

module.exports = async (req, res) => {
  const todas = await B.publicadas();
  if (!todas) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '120');
    return res.end('Temporalmente no disponible');
  }
  const props = todas.filter(B.enCatalogo)
    .sort((a, b) => (B.disponible(b) - B.disponible(a)) || a.barrio.localeCompare(b.barrio) || (B.precio(a) - B.precio(b)));
  const zonas = B.porZona(props);
  const precios = props.map(B.precio).filter(Boolean);
  const min = Math.min(...precios), max = Math.max(...precios);
  const libres = props.filter(B.disponible).length;
  const hoy = new Date().toISOString().slice(0, 10);

  const linea = p => `- [${B.titulo(p)}, ${p.barrio}](${B.url(p)}): ${B.resumen(p)}${B.disponible(p) ? '' : ' Reservado.'}`;
  const lineaEn = p => `- [${B.titulo(p)}, ${p.barrio}](${B.url(p)}): ${B.resumenEn(p)}${B.disponible(p) ? '' : ' Reserved.'}`;

  const txt = `# BAIREN

> BAIREN (bairengroup.com) alquila departamentos amoblados a mediano plazo en Buenos Aires, Argentina: de 3 a 12 meses, con un precio final en dólares que incluye alquiler, expensas, servicios y muebles, sin garantía inmobiliaria ni seguro de caución. Hoy tiene ${props.length} departamentos publicados (${libres} disponibles) en ${zonas.filter(z => z.key !== 'Otros').length} barrios, de ${B.usd(min)} a ${B.usd(max)} por mes.

Actualizado: ${hoy}. Los precios y la disponibilidad salen de la base en vivo; para confirmar una unidad, escribir por WhatsApp.

## Cómo funciona

- Plazo: de 3 a 12 meses.
- Precio: final, en dólares, por mes. Incluye alquiler, expensas, servicios y muebles. Si una unidad tiene las expensas aparte, su ficha lo dice y muestra el monto.
- Requisitos: documento (pasaporte si sos extranjero) y demostrar ingresos, propios o de alguien que te avale. No se pide garantía inmobiliaria ni seguro de caución.
- Reserva: con contrato digital en dólares, después de visitar la unidad.
- Los departamentos están amoblados y equipados para vivir desde el primer día.
- Consultas y visitas: WhatsApp +54 11 2310 6629 (https://wa.me/${B.WHATSAPP_NUM}) o contacto@bairengroup.com. Responde una persona del equipo, en castellano o en inglés. Consultar no tiene cargo.

## Páginas principales

- [Inicio](${B.SITE_ROOT}/): qué ofrece BAIREN y reseñas de clientes.
- [Catálogo](${B.SITE_ROOT}/catalogo.html): todos los departamentos, con filtro por barrio, precio y ambientes.
- [Guía para alquilar amoblado en Buenos Aires](${B.SITE_ROOT}/alquiler-amoblado-buenos-aires): precios por barrio y preguntas frecuentes.
- [Furnished apartments guide (English)](${B.SITE_ROOT}/en/furnished-apartments-buenos-aires): prices by neighbourhood and FAQ in English.

## Precios por barrio (hoy)

${zonas.map(z => `- ${z.key}: ${z.total} ${z.total === 1 ? 'departamento' : 'departamentos'} (${z.libres} ${z.libres === 1 ? 'disponible' : 'disponibles'}), desde ${B.usd(z.desde)} por mes.${z.barrios.size > 1 || ![...z.barrios].includes(z.key) ? ` Incluye ${[...z.barrios].join(', ')}.` : ''}`).join('\n')}

## Departamentos

${props.map(linea).join('\n')}

## In English

BAIREN rents furnished apartments in Buenos Aires for 3 to 12 months. One final monthly price in US dollars covers rent, building fees, utilities and furniture. No Argentine guarantor and no surety bond: passport (or ID) and proof of income, your own or from someone who backs you. Book with a digital contract in US dollars after viewing the unit. ${props.length} apartments listed today (${libres} available), from ${B.usdEn(min)} to ${B.usdEn(max)} per month. WhatsApp +54 11 2310 6629, the team replies in English.

${props.map(lineaEn).join('\n')}
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(txt);
};
