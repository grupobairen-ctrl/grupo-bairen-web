'use strict';

/**
 * Memoria de conversación por número de teléfono.
 *
 * Para el prototipo es un Map en memoria: simple y sin dependencias. Se pierde
 * si reiniciás el bot. Cuando pasemos a beta conviene moverlo a Supabase o Redis
 * para que las charlas sobrevivan a un reinicio. La interfaz queda igual.
 */

const MAX_MENSAJES = 40;        // recorta historiales largos (controla costo de tokens)
const TTL_MS = 6 * 60 * 60 * 1000; // olvida una charla inactiva tras 6 horas

const _convos = new Map(); // phone -> { messages: [...], at: timestamp }

function get(phone) {
  const c = _convos.get(phone);
  if (!c) return [];
  if (Date.now() - c.at > TTL_MS) { _convos.delete(phone); return []; }
  return c.messages;
}

function set(phone, messages) {
  // Nos quedamos con los últimos MAX_MENSAJES para no inflar el prompt.
  const trimmed = messages.slice(-MAX_MENSAJES);
  _convos.set(phone, { messages: trimmed, at: Date.now() });
}

function reset(phone) {
  _convos.delete(phone);
}

module.exports = { get, set, reset };
