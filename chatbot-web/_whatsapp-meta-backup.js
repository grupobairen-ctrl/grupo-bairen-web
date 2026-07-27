'use strict';

/**
 * Webhook de WhatsApp — bot HÍBRIDO de Bairen.
 *   Etapas 1-2: filtro con botones/lista (GRATIS, sin IA).
 *   Etapa 3:    IA (Tomás) solo para los leads calificados que preguntan algo.
 *
 * Variables de entorno (en Netlify):
 *   ANTHROPIC_API_KEY · WHATSAPP_TOKEN · WHATSAPP_PHONE_NUMBER_ID · WHATSAPP_VERIFY_TOKEN
 */

const { procesarFlujo } = require('../../lib/flujo');
const { fetchPropiedades, loadConv, saveConv, saveLead } = require('../../lib/chat');

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY = process.env.WHATSAPP_VERIFY_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v25.0';
const FLOW_ID = process.env.WHATSAPP_FLOW_ID; // id del formulario de zonas (WhatsApp Flows)
const GRAPH = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`;

// Argentina: el wa_id entra como 549XXXXXXXXXX pero para ENVIAR hay que sacarle el 9.
function normalizarNumero(n) {
  const m = String(n).match(/^549(\d{10})$/);
  return m ? '54' + m[1] : String(n);
}

async function post(payload) {
  return fetch(GRAPH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: normalizarNumero(payload.to), ...payload.rest }),
  });
}

async function sendText(to, text) {
  await post({ to, rest: { type: 'text', text: { body: text } } });
}

async function sendImage(to, link) {
  await post({ to, rest: { type: 'image', image: { link } } });
}

async function sendImageCaption(to, link, caption) {
  await post({ to, rest: { type: 'image', image: { link, caption } } });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Marca el mensaje como leído (doble tilde azul) y muestra "escribiendo..." (hasta 25s o hasta que respondemos).
async function sendTyping(messageId) {
  if (!messageId) return;
  try {
    await fetch(GRAPH, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }),
    });
  } catch (e) { /* si la cuenta no soporta typing, no rompe nada */ }
}

// Botón "Call To Action" que abre un link, escondiendo el URL largo detrás de un texto lindo.
async function sendCtaUrl(to, texto, displayText, url) {
  const res = await post({ to, rest: {
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: texto },
      action: { name: 'cta_url', parameters: { display_text: displayText, url } },
    },
  } });
  // Si WhatsApp no acepta el botón (algunas cuentas), caemos al link en texto para no romper el handoff.
  if (res && !res.ok) await sendText(to, texto + '\n' + url);
}

async function sendButtons(to, texto, botones) {
  await post({ to, rest: {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: texto },
      action: { buttons: botones.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.titulo.slice(0, 20) } })) },
    },
  } });
}

async function sendList(to, texto, botonTexto, filas) {
  await post({ to, rest: {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: texto },
      action: {
        button: (botonTexto || 'Ver opciones').slice(0, 20),
        sections: [{ title: 'Opciones', rows: filas.slice(0, 10).map((f) => ({ id: f.id, title: f.titulo.slice(0, 24) })) }],
      },
    },
  } });
}

// Formulario de checkboxes (WhatsApp Flows) para elegir varias zonas a la vez.
async function sendFlow(to, texto, cta) {
  await post({ to, rest: {
    type: 'interactive',
    interactive: {
      type: 'flow',
      body: { text: texto },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_token: 'bairen-zonas',
          flow_id: FLOW_ID,
          flow_cta: cta || 'Elegir zonas',
          flow_action: 'navigate',
          flow_action_payload: { screen: 'ZONAS' },
        },
      },
    },
  } });
}

// La respuesta de la IA (Etapa 3) puede ser larga: la parto en globos + saco fotos.
async function sendReply(to, reply) {
  const imgRe = /https?:\/\/\S+\.(?:png|jpe?g|webp)(?:\?\S*)?/gi;
  const images = (reply.match(imgRe) || []).slice(0, 4);
  const textPart = reply.replace(imgRe, '').replace(/\n{3,}/g, '\n\n').trim();
  let chunks = textPart.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (chunks.length > 5) chunks = [...chunks.slice(0, 4), chunks.slice(4).join('\n\n')];
  for (const c of chunks) await sendText(to, c);
  for (const url of images) await sendImage(to, url);
}

async function enviarMensaje(to, m) {
  if (m.tipo === 'texto') return sendText(to, m.texto);
  if (m.tipo === 'imagen') return sendImage(to, m.url);
  if (m.tipo === 'imagen_caption') return sendImageCaption(to, m.url, m.caption);
  if (m.tipo === 'ia') return sendReply(to, m.texto);
  if (m.tipo === 'botones') return sendButtons(to, m.texto, m.botones);
  if (m.tipo === 'lista') return sendList(to, m.texto, m.boton, m.filas);
  if (m.tipo === 'cta') return sendCtaUrl(to, m.texto, m.cta, m.url);
  if (m.tipo === 'flow') {
    if (FLOW_ID) return sendFlow(to, m.texto, m.cta);
    // Sin formulario: el saludo ya lista los barrios y pide que escriban; no agregamos nada.
    return sendText(to, m.texto);
  }
}

exports.handler = async (event) => {
  // 1) Verificación del webhook
  if (event.httpMethod === 'GET') {
    const p = event.queryStringParameters || {};
    if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] === VERIFY) {
      return { statusCode: 200, body: p['hub.challenge'] || '' };
    }
    return { statusCode: 403, body: 'forbidden' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    const value = body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value;
    const msg = value && value.messages && value.messages[0];
    if (!msg) return { statusCode: 200, body: 'ok' };

    const from = msg.from;

    // ¿Qué mandó? Texto libre o una opción (botón/lista).
    let input;
    if (msg.type === 'interactive') {
      const ir = msg.interactive || {};
      if (ir.type === 'nfm_reply') {
        // Respuesta del formulario de zonas (checkboxes)
        let zonas = [];
        try { zonas = JSON.parse((ir.nfm_reply && ir.nfm_reply.response_json) || '{}').zonas || []; } catch (e) { /* noop */ }
        if (!Array.isArray(zonas)) zonas = [zonas].filter(Boolean);
        input = { tipo: 'flow', id: null, texto: '', zonas };
      } else {
        const r = ir.button_reply || ir.list_reply || {};
        input = { tipo: 'opcion', id: r.id || null, texto: r.title || '' };
      }
    } else if (msg.type === 'text') {
      input = { tipo: 'texto', id: null, texto: (msg.text && msg.text.body) || '' };
    } else {
      // Foto/audio/sticker/ubicación: entrada genérica. Si es un usuario nuevo, el flujo igual lo saluda.
      input = { tipo: 'otro', id: null, texto: '' };
    }

    const { mensajes: historial, estado } = await loadConv(from);
    const props = await fetchPropiedades();
    const res = procesarFlujo(estado, input, props);

    const nuevoHistorial = historial.slice();
    nuevoHistorial.push({ role: 'user', content: input.texto || '(opción)' });

    if (res.lead) {
      await saveLead({ ...res.lead, whatsapp: from, origen: 'whatsapp-filtro' });
    }

    // Sin IA: el filtro es 100% canned (gratis). Guardamos el texto en el historial igual.
    for (const m of res.mensajes) {
      if (m.texto) nuevoHistorial.push({ role: 'assistant', content: m.texto });
    }

    // Toque humano: "escribiendo..." + una pausa antes de responder.
    if (res.mensajes.length) {
      await sendTyping(msg.id);
      const tieneFotos = res.mensajes.some((m) => m.tipo === 'imagen' || m.tipo === 'imagen_caption');
      await sleep(tieneFotos ? 400 : 2200);
    }

    // Enviamos en orden. CLAVE: si venimos de fotos y ahora sigue un texto/lista (ej. "¿Cuál es tu
    // presupuesto?" o la lista de visita), esperamos de más para que TODAS las fotos lleguen primero
    // y ese mensaje NO se intercale entre opción y opción.
    let prevFoto = false;
    for (const m of res.mensajes) {
      const esFoto = m.tipo === 'imagen' || m.tipo === 'imagen_caption';
      if (prevFoto && !esFoto) await sleep(1500);
      await enviarMensaje(from, m);
      await sleep(esFoto ? 600 : 250);
      prevFoto = esFoto;
    }

    await saveConv(from, nuevoHistorial, res.estado);
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('[whatsapp] error:', e.message);
    return { statusCode: 200, body: 'ok' };
  }
};
