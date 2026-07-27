'use strict';

/**
 * Leads: avisar a Tiziana por WhatsApp y registrar el interesado en Supabase
 * (tabla `leads`, definida en chatbot/schema-leads.sql).
 */

const evolution = require('./evolution');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nmrjyyrhwjroonrppnka.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || '';
const TIZIANA = process.env.TIZIANA_WHATSAPP || '';

// Guarda el lead en Supabase. No corta el flujo si falla (logueamos y seguimos).
async function registrarLead(lead) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON,
        authorization: `Bearer ${SUPABASE_ANON}`,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ origen: 'whatsapp-bot', ...lead }),
    });
    if (!res.ok) console.error('[leads] Supabase', res.status, await res.text());
  } catch (e) {
    console.error('[leads] no se pudo registrar:', e.message);
  }
}

// Le manda el WhatsApp personal a Tiziana con los datos del interesado.
async function avisarTiziana(texto) {
  if (!TIZIANA) { console.error('[leads] falta TIZIANA_WHATSAPP'); return; }
  try {
    await evolution.enviarTexto(TIZIANA, texto);
  } catch (e) {
    console.error('[leads] no se pudo avisar a Tiziana:', e.message);
  }
}

module.exports = { registrarLead, avisarTiziana };
