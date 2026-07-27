'use strict';

/**
 * Capa de WhatsApp vía Evolution API (cuenta NO oficial, conectada por QR).
 *
 * Tres cosas: marcar "escribiendo…", mandar texto y mandar fotos. Los endpoints
 * son los de Evolution API v2. Si tu Evolution es otra versión y algo no entra,
 * el único lugar a tocar es este archivo (lo dejé aislado a propósito).
 */

const URL = process.env.EVOLUTION_URL || 'http://localhost:8080';
const API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'bairen';

async function call(path, body) {
  const res = await fetch(`${URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Evolution ${res.status} en ${path}: ${txt}`);
  }
  return res.json().catch(() => ({}));
}

// "Tomás está escribiendo…" durante `ms` milisegundos.
async function escribiendo(number, ms) {
  return call(`/chat/sendPresence/${INSTANCE}`, {
    number,
    presence: 'composing',
    delay: Math.round(ms),
  });
}

// Manda un mensaje de texto.
async function enviarTexto(number, text) {
  return call(`/message/sendText/${INSTANCE}`, { number, text });
}

// Manda una imagen por URL (para las fotos de las fichas).
async function enviarImagen(number, url, caption = '') {
  return call(`/message/sendMedia/${INSTANCE}`, {
    number,
    mediatype: 'image',
    media: url,
    caption,
  });
}

module.exports = { escribiendo, enviarTexto, enviarImagen, INSTANCE };
