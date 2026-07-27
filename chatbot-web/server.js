'use strict';

/**
 * Servidor local del chatbot Bairen — sin dependencias.
 * Correr:  ANTHROPIC_API_KEY=sk-ant-... node server.js
 * Abrir:   http://localhost:3000
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chat } = require('./lib/chat');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'public', 'index.html');

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // Página
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    return send(res, 200, fs.readFileSync(INDEX), 'text/html; charset=utf-8');
  }

  // API del chat
  if (req.method === 'POST' && req.url === '/api/chat') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(raw || '{}');
        if (!Array.isArray(messages) || !messages.length) {
          return send(res, 400, JSON.stringify({ error: 'Faltan los mensajes.' }));
        }
        const out = await chat(messages);
        send(res, 200, JSON.stringify(out));
      } catch (err) {
        console.error('[chat] error:', err.message);
        send(res, 500, JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  send(res, 404, 'No encontrado', 'text/plain');
});

const BUILD = 'tono-humano + ritmo-burbujas + cierre-doble-alternativa (2026-06-09)';
let port = Number(PORT);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < Number(PORT) + 20) {
    console.log(`  Puerto ${port} ocupado, probando ${port + 1}...`);
    port += 1;
    server.listen(port);
  } else {
    console.error(err);
    process.exit(1);
  }
});

server.on('listening', () => {
  console.log(`\n  ──────────────────────────────────────────────`);
  console.log(`  Bairen chatbot corriendo en  http://localhost:${port}`);
  console.log(`  BUILD: ${BUILD}`);
  console.log(`  ──────────────────────────────────────────────\n`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  ⚠  Falta ANTHROPIC_API_KEY (el chat no va a responder sin ella).\n');
  }
});

server.listen(port);
