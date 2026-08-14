'use strict';

/**
 * Bot de WhatsApp de Bairen — orquestador.
 *
 * Flujo de un mensaje entrante:
 *   Evolution (webhook) → este server → cerebro (brain) → respuesta con ritmo humano.
 * Si el cerebro decide agendar, resuelve las tools: consulta el calendar, agenda
 * la visita, registra el lead y le avisa a Tiziana.
 *
 * Correr local:  node server.js   (necesita las variables de entorno del .env)
 */

const http = require('node:http');

const brain = require('./lib/brain');
const calendar = require('./lib/calendar');
const evolution = require('./lib/evolution');
const leads = require('./lib/leads');
const pacing = require('./lib/pacing');
const store = require('./lib/store');
const { fetchPropiedades } = require('../chatbot-web/lib/chat');

const PORT = Number(process.env.PORT || 3200);
const { desde: DESDE, hasta: HASTA } = brain.VISITA;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Resolución de las herramientas que pide el cerebro
// ─────────────────────────────────────────────────────────────────────────────
async function onToolCall(name, input) {
  if (name === 'ver_disponibilidad') {
    const libres = await calendar.horasLibres(input.fecha, DESDE, HASTA);
    return {
      fecha: input.fecha,
      franja: `${DESDE}:00 a ${HASTA}:00`,
      horarios_libres: libres.map((h) => `${h}:00`),
    };
  }

  if (name === 'agendar_visita') {
    return agendarVisita(input);
  }

  return { error: `herramienta desconocida: ${name}` };
}

async function agendarVisita({ nombre, telefono, propiedad_slug, fecha, hora }) {
  if (hora < DESDE || hora > HASTA) {
    return { ok: false, motivo: `las visitas son de ${DESDE}:00 a ${HASTA}:00` };
  }

  // Revisamos de nuevo que el horario siga libre (evita pisar otra visita).
  const libres = await calendar.horasLibres(fecha, DESDE, HASTA);
  if (!libres.includes(hora)) {
    return { ok: false, motivo: 'ese horario se ocupó recién', horarios_libres: libres.map((h) => `${h}:00`) };
  }

  // Datos de la propiedad para el evento y el aviso.
  const props = await fetchPropiedades().catch(() => []);
  const prop = props.find((p) => p.slug === propiedad_slug);
  const dir = prop ? (prop.unidad ? `${prop.dir} (${prop.unidad})` : prop.dir) : propiedad_slug;
  const barrio = prop ? prop.barrio : '';
  const ficha = `https://www.bairengroup.com/propiedades/${propiedad_slug}`;
  const cuando = `${fecha} ${hora}:00`;

  // 1) Evento en el calendar de Bairen
  let evento = null;
  try {
    evento = await calendar.crearVisita({
      fecha,
      hora,
      titulo: `Visita: ${nombre} — ${dir}${barrio ? `, ${barrio}` : ''}`,
      descripcion: `Lead del bot de WhatsApp.\nTel: ${telefono}\nUnidad: ${dir} (${propiedad_slug})\nFicha: ${ficha}`,
    });
  } catch (e) {
    console.error('[agendar] calendar falló:', e.message);
    return { ok: false, motivo: 'no se pudo agendar en el calendar, probá de nuevo en un momento' };
  }

  // 2) Lead en Supabase
  await leads.registrarLead({
    nombre,
    telefono,
    propiedad_slug,
    estado: 'visita',
    notas: `Visita ${cuando}. ${evento.link || ''}`.trim(),
  });

  // 3) Aviso personal a Tiziana
  await leads.avisarTiziana(
    `Nuevo interesado para visita.\n\n` +
    `Nombre: ${nombre}\n` +
    `Teléfono: ${telefono}\n` +
    `Unidad: ${dir}${barrio ? `, ${barrio}` : ''}\n` +
    `Día y hora: ${fecha} a las ${hora}:00\n` +
    `Ficha: ${ficha}\n\n` +
    `Ya quedó agendado en el calendar. Escribile vos para presentarte y confirmar.`,
  );

  return { ok: true, fecha, hora: `${hora}:00`, mensaje: 'Visita agendada y Tiziana avisada.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Enviar la respuesta del bot con ritmo humano (varios mensajes, fotos aparte)
// ─────────────────────────────────────────────────────────────────────────────
async function responderConRitmo(phone, reply) {
  const partes = pacing.partir(reply);
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (p.type === 'text') {
      const ms = pacing.tTipeo(p.value);
      await evolution.escribiendo(phone, ms).catch(() => {});
      await sleep(ms);
      await evolution.enviarTexto(phone, p.value);
    } else {
      await sleep(pacing.imagenDelay());
      await evolution.enviarImagen(phone, p.value).catch((e) => console.error('[img]', e.message));
    }
    if (i < partes.length - 1) await sleep(pacing.tPausa());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Procesar un mensaje entrante
// ─────────────────────────────────────────────────────────────────────────────
async function procesar(phone, texto) {
  try {
    // "Escribiendo…" la pausa de lectura, mientras el cerebro trabaja.
    evolution.escribiendo(phone, pacing.tLectura(texto.length)).catch(() => {});

    const previo = store.get(phone);
    const messages = [...previo, { role: 'user', content: texto }];

    const { reply } = await brain.responder({ messages, onToolCall });

    store.set(phone, [...messages, { role: 'assistant', content: reply }]);
    await responderConRitmo(phone, reply);
  } catch (e) {
    console.error('[procesar] error:', e.message);
    await evolution.enviarTexto(phone, 'Disculpá, se me complicó un segundo. ¿Me lo repetís?').catch(() => {});
  }
}

// Extrae teléfono y texto de un evento de Evolution (ignora grupos y mensajes propios).
function extraer(msg) {
  const jid = msg?.key?.remoteJid || '';
  if (!jid || msg?.key?.fromMe || jid.endsWith('@g.us')) return null;
  const m = msg.message || {};
  const texto = m.conversation || m.extendedTextMessage?.text || '';
  if (!texto.trim()) return null;
  return { phone: jid.split('@')[0], texto: texto.trim() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Servidor HTTP (webhook de Evolution)
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, build: BUILD }));
  }

  if (req.method === 'POST' && req.url.startsWith('/webhook')) {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2e6) req.destroy(); });
    req.on('end', () => {
      // Respondemos 200 ya mismo; procesamos en segundo plano (Evolution reintenta si tarda).
      res.writeHead(200); res.end('ok');
      try {
        const body = JSON.parse(raw || '{}');
        if (body.event !== 'messages.upsert') return;
        const data = Array.isArray(body.data) ? body.data : [body.data];
        for (const msg of data) {
          const parsed = extraer(msg);
          if (parsed) procesar(parsed.phone, parsed.texto);
        }
      } catch (e) {
        console.error('[webhook] body inválido:', e.message);
      }
    });
    return;
  }

  res.writeHead(404); res.end('no encontrado');
});

const BUILD = 'whatsapp-evolution + visitas-tarde + aviso-tiziana (2026-06-09)';
server.listen(PORT, () => {
  console.log(`\n  Bairen WhatsApp bot escuchando en :${PORT}`);
  console.log(`  BUILD: ${BUILD}`);
  console.log(`  Visitas: ${DESDE}:00 a ${HASTA}:00`);
  const faltan = ['ANTHROPIC_API_KEY', 'EVOLUTION_URL', 'EVOLUTION_API_KEY', 'TIZIANA_WHATSAPP', 'GOOGLE_CALENDAR_ID', 'GOOGLE_SERVICE_ACCOUNT_JSON']
    .filter((k) => !process.env[k]);
  if (faltan.length) console.log('  ⚠  Faltan variables de entorno:', faltan.join(', '));
  console.log('');
});
