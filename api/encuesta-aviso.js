/**
 * Aviso interno de la encuesta PSI — corre en Vercel.
 *
 * El lead ya quedó guardado en Supabase (tabla leads_psi) desde el navegador;
 * esta función solo AVISA a Bairen por los canales que estén configurados.
 * Sin variables de entorno configuradas, responde ok y no hace nada:
 * el flujo de la encuesta nunca depende de esto.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   WHATSAPP_TOKEN     token del usuario de sistema de la app Meta "Bairen HQ"
 *   WHATSAPP_PHONE_ID  Phone number ID del número (WhatsApp → API Setup)
 *   AVISO_WA_NUMBERS   destinatarios coma-separados, ej: 5491124759930,5491123456789
 *   RESEND_API_KEY     (opcional) API key de Resend para avisos por mail
 *   AVISO_EMAILS       (opcional) mails coma-separados, ej: grupobairen@gmail.com
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { nombre, telefono, resumen } = req.body || {};
  if (!nombre || !telefono) return res.status(200).json({ ok: true, aviso: 'sin datos' });

  const texto = `Nuevo perfil PSI desde la web\n\nNombre: ${nombre}\nWhatsApp: ${telefono}\n\n${(resumen || '').slice(0, 2500)}`;
  const enviados = [];

  // WhatsApp Cloud API → Alejandro y quien esté en la lista
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, AVISO_WA_NUMBERS } = process.env;
  if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && AVISO_WA_NUMBERS) {
    for (const to of AVISO_WA_NUMBERS.split(',').map(s => s.trim()).filter(Boolean)) {
      try {
        const r = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } }),
        });
        enviados.push({ canal: 'whatsapp', to, ok: r.ok });
      } catch (e) { enviados.push({ canal: 'whatsapp', to, ok: false }); }
    }
  }

  // Mail vía Resend (opcional)
  const { RESEND_API_KEY, AVISO_EMAILS } = process.env;
  if (RESEND_API_KEY && AVISO_EMAILS) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Bairen Web <onboarding@resend.dev>',
          to: AVISO_EMAILS.split(',').map(s => s.trim()).filter(Boolean),
          subject: `Nuevo perfil PSI: ${nombre}`,
          text: texto,
        }),
      });
      enviados.push({ canal: 'mail', ok: r.ok });
    } catch (e) { enviados.push({ canal: 'mail', ok: false }); }
  }

  return res.status(200).json({ ok: true, enviados });
}
