/**
 * Vercel Function — avisos del portal BAIREN (migración 32): cruce de búsquedas y mail de lo que no se leyó
 *
 * Quién la dispara:
 *   GET  /api/portal-avisos      el cron de Vercel, cada 15 minutos (vercel.json): Authorization: Bearer CRON_SECRET
 *   GET  /api/portal-avisos      a mano, con header x-portal-key = PORTAL_NOTIFY_KEY (?espera=0 manda ya, sin esperar
 *                                los 10 minutos de calma)
 *   POST /api/portal-avisos      una sesión de curador (Authorization: Bearer <access_token>), como portal-sync
 *   Sin ninguna de esas: 401 {error:'sin autorización'}.
 *
 * Hace, cada paso con su propio try/catch:
 *   a. portal.calcular_coincidencias(): cruza las búsquedas activas con las unidades publicadas y deja los avisos
 *      ("Hay una unidad para tu búsqueda" / "Alguien busca algo como tu unidad"). Ninguna se avisa dos veces.
 *   b. mail: portal.avisos_para_mail() devuelve lo que nadie leyó, agrupado por persona (sin leer, quieto hace 10
 *      minutos, de los últimos 3 días, con el mail prendido en sus preferencias). Un solo mail por persona, corto y con
 *      un solo botón; después portal.marcar_mail_enviado() con los ids de ese mail. Sin RESEND_API_KEY o sin
 *      PORTAL_MAIL_FROM no manda nada y lo dice en la respuesta (mail.omitido).
 *
 * Variables de entorno (ver api/_portal/admin.js): PORTAL_SUPABASE_SERVICE_KEY (sin ella: 503 {configured:false}),
 *   CRON_SECRET, PORTAL_NOTIFY_KEY, RESEND_API_KEY, PORTAL_MAIL_FROM, PORTAL_SITE (raíz de los links y del logo).
 * Necesita portal/migracion-32-avisos.sql; sin ella cada paso devuelve su {error}.
 *
 * Respuesta: 200 {ok, coincidencias: {nuevas, avisadas} | {error}, mail: {personas, enviados, fallidos} | {omitido, motivo, personas}, ms}
 */
const A = require('./_portal/admin');

const PARALELO = 5;          // mails a la vez
const MAX_PERSONAS = 100;    // personas por corrida (el resto, en la próxima)
const MAX_ITEMS = 4;         // renglones en un mail con varios avisos ("y 3 más")

const paso = async fn => { try { return await fn(); } catch (e) { return { error: String(e && e.message || e).slice(0, 300) }; } };
const corta = (v, n) => { const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const site = () => A.SITE.replace(/\/?$/, '/');
/* La url del aviso es relativa al portal (mensajes.html?op=…); nunca se manda a otro dominio */
const absoluta = u => { const s = String(u || '').trim(); if (!s || /^[a-z]+:/i.test(s) || s.indexOf('//') === 0) return site() + 'avisos.html'; return site() + s.replace(/^\/+/, ''); };

/* El mail: papel, la palabra BAIREN (el logo en blanco sobre navy, con el texto de respaldo), lo que pasó en pocas líneas y
   un solo botón. Sin obelisco. */
function armarMail(persona) {
  const items = Array.isArray(persona.items) ? persona.items : [];
  const uno = items.length === 1 ? items[0] : null;
  const subject = uno ? corta(uno.titulo, 90) : `Tenés ${items.length} avisos nuevos en BAIREN`;
  const boton = uno ? absoluta(uno.url) : site() + 'avisos.html';
  /* Botones de una o dos palabras */
  const textoBoton = uno ? (uno.tipo === 'mensaje' ? 'Responder' : uno.tipo === 'coincidencia' ? 'Ver unidad' : uno.tipo === 'coincidencia_pub' ? 'Proponer' : 'Abrir') : 'Ver avisos';
  const marca = `${site()}img/bairen-marca.png?v=1`;
  const sans = "'Jost',Helvetica,Arial,sans-serif", serif = "'Playfair Display',Georgia,'Times New Roman',serif";
  const renglon = it => `<tr><td style="padding:14px 0;border-top:1px solid #E7E1D3">
      <div style="font:500 15px/1.4 ${sans};color:#131D2D">${A.esc(corta(it.titulo, 120))}</div>
      ${it.contexto ? `<div style="font:400 13px/1.5 ${sans};color:#59647A;margin-top:2px">${A.esc(corta(it.contexto, 120))}</div>` : ''}
    </td></tr>`;
  const resto = items.length - MAX_ITEMS;
  const cuerpo = uno
    ? `<h1 style="margin:0 0 6px;font:400 24px/1.3 ${serif};color:#131D2D">${A.esc(corta(uno.titulo, 120))}</h1>
       ${uno.contexto ? `<p style="margin:0 0 14px;font:400 14px/1.5 ${sans};color:#59647A">${A.esc(corta(uno.contexto, 160))}</p>` : ''}
       ${uno.texto ? `<p style="margin:0 0 22px;font:300 16px/1.6 ${sans};color:#1A2538">${A.esc(corta(uno.texto, 280))}</p>` : '<div style="height:8px"></div>'}`
    : `<h1 style="margin:0 0 14px;font:400 24px/1.3 ${serif};color:#131D2D">Tenés ${items.length} avisos nuevos</h1>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.slice(0, MAX_ITEMS).map(renglon).join('')}</table>
       ${resto > 0 ? `<p style="margin:10px 0 0;font:400 13px/1.5 ${sans};color:#59647A">y ${resto} más</p>` : ''}
       <div style="height:22px"></div>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${A.esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F6F2E8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F2E8;padding:28px 12px"><tr><td align="center">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#FFFDF8;border:1px solid #E7E1D3;border-radius:14px;overflow:hidden">
    <tr><td style="background:#131D2D;padding:22px 32px" align="left"><img src="${A.esc(marca)}" width="88" height="24" alt="BAIREN" style="display:block;height:24px;width:auto;border:0;color:#FBFAF6;font:500 18px/24px ${serif};letter-spacing:5px"></td></tr>
    <tr><td style="padding:30px 32px 30px">
      ${cuerpo}
      <a href="${A.esc(boton)}" style="display:inline-block;background:#131D2D;color:#FBFAF6;text-decoration:none;padding:13px 26px;border-radius:10px;font:500 15px/1 ${sans}">${A.esc(textoBoton)}</a>
    </td></tr>
  </table>
  <p style="max-width:520px;margin:16px auto 0;font:400 12px/1.6 ${sans};color:#59647A;text-align:center">Te escribimos porque tenés avisos sin leer en BAIREN. <a href="${A.esc(site() + 'avisos.html#preferencias')}" style="color:#75623C">Dejar de recibirlos por mail</a>.</p>
</td></tr></table></body></html>`;
  const text = [uno ? corta(uno.titulo, 120) : `Tenés ${items.length} avisos nuevos en BAIREN`, '']
    .concat(uno ? [uno.contexto, uno.texto].filter(Boolean).map(s => corta(s, 280)) : items.slice(0, MAX_ITEMS).map(it => '· ' + corta(it.titulo, 120) + (it.contexto ? ' (' + corta(it.contexto, 80) + ')' : '')))
    .concat(resto > 0 && !uno ? [`y ${resto} más`] : [], ['', `${textoBoton}: ${boton}`, '', `Dejar de recibirlos por mail: ${site()}avisos.html#preferencias`]).join('\n');
  return { subject, html, text };
}

async function mandarMails(espera) {
  const pendientes = await A.post('rpc/avisos_para_mail', { p_espera_min: espera, p_limite: MAX_PERSONAS });
  const personas = Array.isArray(pendientes) ? pendientes : [];
  const falta = !process.env.RESEND_API_KEY ? 'RESEND_API_KEY' : !process.env.PORTAL_MAIL_FROM ? 'PORTAL_MAIL_FROM' : null;
  if (falta) return { omitido: true, motivo: `no configurado: falta ${falta}`, personas: personas.length, avisos: personas.reduce((n, p) => n + ((p.ids || []).length), 0) };
  let enviados = 0; const fallidos = [];
  for (let i = 0; i < personas.length; i += PARALELO) {
    await Promise.all(personas.slice(i, i + PARALELO).map(async p => {
      try {
        if (!p.email || !(p.ids || []).length) return;
        const m = armarMail(p);
        const r = await A.enviarMail({ to: p.email, subject: m.subject, html: m.html, text: m.text });
        if (!r.enviado) { fallidos.push(r.motivo || 'sin detalle'); return; }
        await A.post('rpc/marcar_mail_enviado', { p_ids: p.ids });
        enviados++;
      } catch (e) { fallidos.push(String(e && e.message || e).slice(0, 160)); }
    }));
  }
  return { personas: personas.length, enviados, fallidos: fallidos.length, errores: fallidos.slice(0, 3) };
}

module.exports = async (req, res) => {
  const t0 = Date.now();
  const json = A.preparar(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (!A.origenPermitido(req)) return json(403, { error: 'origen' });
  if (req.method !== 'POST' && req.method !== 'GET') return json(405, { error: 'GET o POST' });
  res.setHeader('Cache-Control', 'no-store');
  const clave = A.conClave(req);
  const cron = !clave && req.method === 'GET' && A.conCron(req);
  const curador = !clave && !cron && req.method === 'POST' ? await A.curadorDeSesion(req) : null;
  if (!clave && !cron && !curador) return json(401, { error: 'sin autorización' });
  if (!A.tieneServiceKey()) return json(503, { configured: false, falta: 'PORTAL_SUPABASE_SERVICE_KEY' });
  const q = A.query(req);
  const espera = clave && q.espera != null && /^\d{1,3}$/.test(String(q.espera)) ? Number(q.espera) : 10;
  const coincidencias = await paso(() => A.post('rpc/calcular_coincidencias', { p_max_por_busqueda: 3 }));
  const mail = await paso(() => mandarMails(espera));
  return json(200, { ok: !coincidencias.error && !mail.error, coincidencias, mail, ms: Date.now() - t0 });
};
module.exports._interno = { armarMail, absoluta };
