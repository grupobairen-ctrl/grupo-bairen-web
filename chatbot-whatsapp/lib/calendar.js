'use strict';

/**
 * Google Calendar de Bairen: consultar qué horarios están libres y crear el evento
 * de la visita. Usa una cuenta de servicio (service account) de Google.
 *
 * Setup (una sola vez, está detallado en el README):
 *   1. Crear una service account en Google Cloud y bajar su JSON.
 *   2. Compartir el calendario de Bairen con el email de esa service account,
 *      con permiso "hacer cambios en los eventos".
 *   3. Poner el JSON en GOOGLE_SERVICE_ACCOUNT_JSON y el id en GOOGLE_CALENDAR_ID.
 *
 * Argentina es UTC-3 todo el año, así que armamos las horas como "-03:00" sin DST.
 */

const { GoogleAuth } = require('google-auth-library');

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || '';
const TZ = 'America/Argentina/Buenos_Aires';
const OFFSET = '-03:00';

let _auth = null;
function auth() {
  if (_auth) return _auth;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON.');
  _auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return _auth;
}

async function token() {
  const client = await auth().getClient();
  const { token } = await client.getAccessToken();
  return token;
}

function iso(fecha, hora) {
  // fecha 'YYYY-MM-DD', hora entero -> '2026-06-10T17:00:00-03:00'
  const hh = String(hora).padStart(2, '0');
  return `${fecha}T${hh}:00:00${OFFSET}`;
}

/**
 * Devuelve las horas (enteros) libres para una fecha, dentro de [desde, hasta].
 * Una hora H está libre si no hay ningún evento ocupando [H:00, H+1:00).
 */
async function horasLibres(fecha, desde, hasta) {
  const tk = await token();
  const timeMin = iso(fecha, desde);
  const timeMax = iso(fecha, hasta + 1);

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tk}` },
    body: JSON.stringify({ timeMin, timeMax, timeZone: TZ, items: [{ id: CALENDAR_ID }] }),
  });
  if (!res.ok) throw new Error(`Calendar freeBusy ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const busy = (((data.calendars || {})[CALENDAR_ID] || {}).busy) || [];

  const libres = [];
  for (let h = desde; h <= hasta; h++) {
    const ini = new Date(iso(fecha, h)).getTime();
    const fin = new Date(iso(fecha, h + 1)).getTime();
    const ocupada = busy.some((b) => {
      const bIni = new Date(b.start).getTime();
      const bFin = new Date(b.end).getTime();
      return bIni < fin && bFin > ini; // se solapan
    });
    if (!ocupada) libres.push(h);
  }
  return libres;
}

/**
 * Crea el evento de la visita en el calendar de Bairen. Devuelve el id y el link.
 */
async function crearVisita({ fecha, hora, titulo, descripcion }) {
  const tk = await token();
  const body = {
    summary: titulo,
    description: descripcion,
    start: { dateTime: iso(fecha, hora), timeZone: TZ },
    end: { dateTime: iso(fecha, hora + 1), timeZone: TZ },
  };
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tk}` },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`Calendar insert ${res.status}: ${await res.text()}`);
  const ev = await res.json();
  return { id: ev.id, link: ev.htmlLink };
}

module.exports = { horasLibres, crearVisita };
