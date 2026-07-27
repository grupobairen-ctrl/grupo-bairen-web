'use strict';

/**
 * Webhook de WhatsApp — bot HÍBRIDO de Bairen.
 *   Etapas 1-2: filtro con botones/lista (GRATIS, sin IA).
 *   Etapa 3:    IA (Tomás) solo para los leads calificados que preguntan algo.
 *
 * Variables de entorno (en Netlify):
 *   ANTHROPIC_API_KEY · YCLOUD_API_KEY · YCLOUD_FROM   (WhatsApp ahora va por YCloud, no Meta)
 */

const { procesarFlujo } = require('../../lib/flujo');
const { fetchPropiedades, loadConv, saveConv, saveLead } = require('../../lib/chat');

// --- WhatsApp via YCloud (BSP) ---
const API_KEY = process.env.YCLOUD_API_KEY;       // YCloud -> Developers -> API Key
const FROM = process.env.YCLOUD_FROM;             // numero del negocio conectado en YCloud (ej 5491123973898)
const VERIFY = process.env.WHATSAPP_VERIFY_TOKEN; // opcional, solo para el health-check GET
const FLOW_ID = process.env.WHATSAPP_FLOW_ID;     // id del formulario de zonas (WhatsApp Flows), opcional
const YCLOUD_URL = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';

// Argentina: el wa_id entra como 549XXXXXXXXXX pero para ENVIAR hay que sacarle el 9.
function normalizarNumero(n) {
  const s = String(n).replace(/^\+/, '');
  const m = s.match(/^549(\d{10})$/);
  return m ? '54' + m[1] : s;
}

async function post(payload) {
  return fetch(YCLOUD_URL, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: normalizarNumero(payload.to), ...payload.rest }),
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
  // YCloud: marca el mensaje como leido (doble tilde azul) y muestra "escribiendo...".
  // Se descarta solo al responder o a los 25s. Solo lo llamamos si vamos a contestar.
  if (!messageId) return;
  try {
    await fetch(`https://api.ycloud.com/v2/whatsapp/inboundMessages/${messageId}/typingIndicator`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'content-type': 'application/json' },
    });
  } catch (e) { /* si la cuenta no lo soporta, no rompe el flujo */ }
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
        sections: [{ title: 'Opciones', rows: filas.slice(0, 10).map((f) => {
          const row = { id: f.id, title: f.titulo.slice(0, 24) };
          if (f.desc) row.description = String(f.desc).slice(0, 72); // subtítulo (ej: los barrios del grupo)
          return row;
        }) }],
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
  // 1) GET: health-check. YCloud no usa el handshake hub.challenge de Meta.
  if (event.httpMethod === 'GET') {
    const p = event.queryStringParameters || {};
    if (p['hub.mode'] === 'subscribe' && VERIFY && p['hub.verify_token'] === VERIFY) {
      return { statusCode: 200, body: p['hub.challenge'] || '' };
    }
    return { statusCode: 200, body: 'ok' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    // YCloud manda varios eventos al mismo webhook (estados, etc.).
    // Solo procesamos los mensajes ENTRANTES.
    const msg = body.whatsappInboundMessage;
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
    } else if (['image', 'audio', 'voice', 'video', 'document', 'sticker'].includes(msg.type)) {
      // Si la foto/video vienen con epígrafe, ESO es lo que la persona quiso decir: lo tratamos como texto.
      const caption = (msg.image && msg.image.caption) || (msg.video && msg.video.caption) || '';
      if (caption.trim()) {
        input = { tipo: 'texto', id: null, texto: caption };
      } else {
        // Audio/foto/video sin texto: no los podemos leer. El flujo pide que escriban.
        input = { tipo: 'media', id: null, texto: '', media: msg.type };
      }
    } else {
      // Ubicación, contactos u otros: entrada genérica. Si es un usuario nuevo, el flujo igual lo saluda.
      input = { tipo: 'otro', id: null, texto: '' };
    }

    const { mensajes: historial, estado } = await loadConv(from);

    // Anti-duplicados: YCloud puede reintentar el MISMO webhook si tardamos en responder.
    // Si ya procesamos este message id, no lo repetimos (evita saludos/fotos/mensajes dobles).
    if (msg.id && estado && estado.lastMsgId === msg.id) {
      return { statusCode: 200, body: 'ok' };
    }

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

    // Guardamos el estado + el id del último mensaje procesado (para el anti-duplicados de arriba).
    await saveConv(from, nuevoHistorial, { ...res.estado, lastMsgId: msg.id });
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('[whatsapp] error:', e.message);
    return { statusCode: 200, body: 'ok' };
  }
};
