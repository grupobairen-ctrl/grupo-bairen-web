'use strict';

/**
 * Función serverless de Netlify — misma lógica que el server local.
 * La API key vive en una variable de entorno de Netlify (ANTHROPIC_API_KEY),
 * nunca en el navegador.
 */

const { chat } = require('../../lib/chat');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages) || !messages.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan los mensajes.' }) };
    }
    const out = await chat(messages);
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(out),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
