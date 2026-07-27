'use strict';

/**
 * Cerebro del bot de WhatsApp. Reusa el tono y el portfolio del chatbot web
 * (única fuente de verdad del tono) y le suma:
 *   - reglas de canal WhatsApp + agenda de visitas (franja de la tarde),
 *   - dos herramientas: ver_disponibilidad y agendar_visita.
 *
 * Devuelve el texto final para la persona. Las herramientas las resuelve quien
 * llama (server.js) a través de `onToolCall`, así este archivo no sabe de Calendar
 * ni de Tiziana: solo conversa y decide cuándo consultar/agendar.
 */

const { fetchPropiedades, buildSystemPrompt } = require('../../chatbot-web/lib/chat');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const VISITA = {
  desde: Number(process.env.VISITA_DESDE || 16),
  hasta: Number(process.env.VISITA_HASTA || 19),
};

const TOOLS = [
  {
    name: 'ver_disponibilidad',
    description:
      'Devuelve los horarios libres para una visita en una fecha. Usalo ANTES de proponerle horarios a la persona, para ofrecer solo turnos libres. No le muestres el listado crudo: elegí dos y ofrecelos con doble alternativa.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha de la visita en formato YYYY-MM-DD' },
      },
      required: ['fecha'],
    },
  },
  {
    name: 'agendar_visita',
    description:
      'Agenda la visita en el calendar de Bairen y avisa a Tiziana para que contacte al interesado. Llamalo SOLO cuando la persona ya confirmó un horario puntual y te dio nombre y teléfono.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        telefono: { type: 'string', description: 'teléfono de contacto del interesado' },
        propiedad_slug: { type: 'string', description: 'slug de la ficha que quiere visitar' },
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        hora: { type: 'integer', description: 'hora de inicio en 24h, ej 17 para las 17:00' },
      },
      required: ['nombre', 'telefono', 'propiedad_slug', 'fecha', 'hora'],
    },
  },
];

function reglasVisita() {
  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const hoyTexto = hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `
# Canal: WhatsApp
Estás por WhatsApp. Mensajes cortos y naturales, como un chat de verdad. Texto plano, sin markdown. Cuando quieras mostrar fotos, pegá las URLs de las fotos de la ficha (cada una en su propia línea); el sistema las manda como imágenes.

# Coordinar visitas
Hoy es ${hoyTexto} (${hoyISO}). Las visitas son de lunes a sábado, SOLO de ${VISITA.desde}:00 a ${VISITA.hasta}:00 (la tarde). Nunca ofrezcas ni aceptes horarios fuera de esa franja ni los domingos.
- Cuando la persona quiera ver una unidad, primero fijá el día (hoy, mañana, o el que prefiera) y llamá a "ver_disponibilidad" con esa fecha.
- Con los horarios libres que te devuelve, ofrecé DOS concretos usando la doble alternativa: "Mañana tenemos a las 17 o a las 18, ¿cuál te queda más cómodo?". Nunca preguntes en abierto "¿a qué hora?".
- Si no quedan horarios ese día, decilo y ofrecé el día siguiente con la misma mecánica.
- Cuando confirme un horario, asegurate de tener su nombre y un teléfono (pedíselos en el mismo mensaje en que cerrás el horario si todavía no los diste) y recién ahí llamá a "agendar_visita".
- Después de agendar, confirmale corto y cálido que Tiziana, del equipo, le va a escribir para presentarse y terminar de coordinar. No des por confirmada la visita "por el sistema": la confirma Tiziana.`;
}

async function callClaude({ apiKey, system, messages }) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Conversa. `messages` es el historial [{role, content}]. `onToolCall(name, input)`
 * resuelve las herramientas y devuelve un objeto (lo que el bot "ve" como resultado).
 * Devuelve { reply, messages } con el historial actualizado (incluye los tool calls).
 */
async function responder({ messages, onToolCall }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY.');

  const props = await fetchPropiedades();
  const system = buildSystemPrompt(props) + '\n' + reglasVisita();

  const convo = messages.slice();

  // Loop de herramientas: el modelo puede consultar disponibilidad y después agendar.
  for (let paso = 0; paso < 5; paso++) {
    const data = await callClaude({ apiKey, system, messages: convo });
    const toolUses = (data.content || []).filter((b) => b.type === 'tool_use');

    if (!toolUses.length) {
      const reply = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { reply: reply || 'Disculpá, no pude responder. ¿Lo intentamos de nuevo?', messages: convo };
    }

    convo.push({ role: 'assistant', content: data.content });
    const results = [];
    for (const tu of toolUses) {
      let result;
      try {
        result = await onToolCall(tu.name, tu.input);
      } catch (e) {
        result = { error: e.message };
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
    }
    convo.push({ role: 'user', content: results });
  }

  return { reply: 'Se me complicó procesar eso. ¿Probamos de nuevo?', messages: convo };
}

module.exports = { responder, VISITA };
