/**
 * Vercel Function — resumen semanal del publicador (cron de los lunes)
 *
 * GET|POST /api/portal-semanal
 *   Autorización: Authorization: Bearer CRON_SECRET (así la manda Vercel)
 *                 o x-portal-key = PORTAL_NOTIFY_KEY (para dispararla a mano).
 *   ?ensayo=1  → arma todo y NO manda nada. Devuelve a quién le habría
 *                escrito y con qué números. Sirve para mirarlo antes.
 *   ?desde=AAAA-MM-DD → rehacer una semana puntual.
 *
 * Para qué existe: el panel del propietario ya muestra vistas, consultas y
 * visitas, pero nadie entra solo a mirarlo. Este mail es lo que lo trae de
 * vuelta cada lunes, y es el argumento con el que después se le vende al
 * corredor ("tus propietarios ya están adentro"). Es la palanca de adopción
 * que describe la nota de misión y metas, hecha mail.
 *
 * Reglas:
 *   · Solo a publicadores con mail cargado.
 *   · Solo si hubo al menos una vista en la semana. Un mail que dice "cero
 *     en todo" enseña a ignorar los mails siguientes.
 *   · Una sola vez por semana y por publicador: lo garantiza el único
 *     (publicador_id, semana) de portal.resumenes_enviados. Si el cron corre
 *     dos veces, la segunda no manda nada.
 *
 * Necesita portal/migracion-09-resumen-semanal.sql.
 * Sin RESEND_API_KEY no manda y devuelve lo que habría mandado.
 */
const A = require('./_portal/admin');

/* El lunes 00:00 de Buenos Aires de la semana que ya cerró. */
function lunesDeLaSemanaPasada(hoy) {
  const inicioHoy = A.inicioDelDiaBA(hoy);
  const diaSemana = new Date(inicioHoy.getTime() + 3 * 3600 * 1000).getUTCDay(); // 0 domingo
  const desdeElLunes = (diaSemana + 6) % 7;                                       // lunes = 0
  const lunesDeEstaSemana = new Date(inicioHoy.getTime() - desdeElLunes * 86400000);
  return new Date(lunesDeEstaSemana.getTime() - 7 * 86400000);
}

const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

function cuerpo(pub, filas, desde, hasta) {
  const totalV = filas.reduce((s, f) => s + Number(f.vistas || 0), 0);
  const totalC = filas.reduce((s, f) => s + Number(f.consultas || 0), 0);
  const totalX = filas.reduce((s, f) => s + Number(f.visitas || 0), 0);
  const esDueno = pub.tipo === 'dueno';

  const unidades = filas
    .filter(f => Number(f.vistas || 0) + Number(f.consultas || 0) + Number(f.visitas || 0) > 0)
    .map(f => {
      const partes = [plural(Number(f.vistas || 0), 'vista', 'vistas')];
      if (Number(f.consultas)) partes.push(plural(Number(f.consultas), 'consulta', 'consultas'));
      if (Number(f.visitas)) partes.push(plural(Number(f.visitas), 'visita pedida', 'visitas pedidas'));
      return '<tr>'
        + '<td style="padding:10px 0;border-bottom:1px solid #EFEAE0">'
          + '<div style="font-weight:600">' + A.esc(f.titulo || f.direccion || f.codigo) + '</div>'
          + '<div style="color:#6B6558;font-size:13px">' + A.esc(partes.join(' · ')) + '</div>'
        + '</td></tr>';
    }).join('');

  const encabezado = esDueno
    ? 'Cómo anduvo tu propiedad en BAIREN'
    : 'Cómo anduvieron tus publicaciones en BAIREN';

  const bajada = totalC > 0
    ? (esDueno
        ? 'Entrá al panel para ver quién preguntó y cuándo.'
        : 'Entrá al panel para ver los interesados y responderles.')
    : 'Todavía no hubo consultas esta semana. Las vistas son la antesala.';

  return A.plantilla(
    '<h1 style="font-size:20px;margin:0 0 4px">' + A.esc(encabezado) + '</h1>'
    + '<p style="color:#6B6558;margin:0 0 20px;font-size:14px">Semana del ' + A.fechaBA(desde)
      + ' al ' + A.fechaBA(new Date(hasta.getTime() - 86400000)) + '</p>'
    + '<p style="font-size:17px;margin:0 0 18px">'
      + '<b>' + plural(totalV, 'persona vio', 'personas vieron') + '</b> lo que tenés publicado'
      + (totalC ? ', y <b>' + plural(totalC, 'dejó una consulta', 'dejaron consulta') + '</b>' : '')
      + (totalX ? ', con <b>' + plural(totalX, 'visita pedida', 'visitas pedidas') + '</b>' : '')
      + '.</p>'
    + (unidades ? '<table style="width:100%;border-collapse:collapse;margin:0 0 20px">' + unidades + '</table>' : '')
    + '<p style="margin:0 0 20px;font-size:14px">' + A.esc(bajada) + '</p>'
    + '<p style="margin:0"><a href="' + A.SITE + 'panel.html" '
      + 'style="display:inline-block;background:#131D2D;color:#fff;text-decoration:none;'
      + 'padding:12px 22px;border-radius:4px;font-size:15px">Ver mi panel</a></p>'
  );
}

module.exports = async function handler(req, res) {
  if (A.preparar(req, res, 'GET, POST, OPTIONS')) return;
  if (!(A.conCron(req) || A.conClave(req))) return res.status(401).json({ ok: false, error: 'No autorizado' });
  if (!A.tieneServiceKey()) return res.status(503).json({ ok: false, configured: false });

  const t0 = Date.now();
  const q = A.query(req);
  const ensayo = q.ensayo === '1' || q.ensayo === 'true';

  try {
    const desde = q.desde ? A.inicioDelDiaBA(q.desde + 'T12:00:00Z') : lunesDeLaSemanaPasada();
    const hasta = new Date(desde.getTime() + 7 * 86400000);
    const semana = desde.toISOString().slice(0, 10);

    const filas = await A.post('rpc/resumen_semanal',
      { p_desde: desde.toISOString(), p_hasta: hasta.toISOString() }) || [];

    /* Una entrada por publicador, con sus avisos adentro. */
    const porPub = new Map();
    for (const f of filas) {
      if (!f.publicador_email) continue;
      if (!porPub.has(f.publicador_id)) {
        porPub.set(f.publicador_id, {
          id: f.publicador_id, nombre: f.publicador_nombre,
          email: f.publicador_email, tipo: f.publicador_tipo, filas: []
        });
      }
      porPub.get(f.publicador_id).filas.push(f);
    }

    /* A quién ya se le mandó esta semana. */
    const yaEnviados = new Set(
      (await A.get('resumenes_enviados?select=publicador_id&semana=eq.' + semana) || [])
        .map(r => r.publicador_id)
    );

    const mandados = [], salteados = [];

    for (const pub of porPub.values()) {
      const vistas = pub.filas.reduce((s, f) => s + Number(f.vistas || 0), 0);
      const consultas = pub.filas.reduce((s, f) => s + Number(f.consultas || 0), 0);

      if (yaEnviados.has(pub.id)) { salteados.push({ nombre: pub.nombre, motivo: 'ya se le mandó esta semana' }); continue; }
      if (!vistas) { salteados.push({ nombre: pub.nombre, motivo: 'sin movimiento en la semana' }); continue; }

      const resumen = { nombre: pub.nombre, email: pub.email, avisos: pub.filas.length, vistas, consultas };
      if (ensayo) { mandados.push(Object.assign({ ensayo: true }, resumen)); continue; }

      try {
        await A.enviarMail({
          to: pub.email,
          subject: 'BAIREN · ' + plural(vistas, 'persona vio', 'personas vieron') + ' lo tuyo esta semana',
          html: cuerpo(pub, pub.filas, desde, hasta)
        });
        /* Se registra después de mandar: si el mail falla, se reintenta la próxima corrida. */
        await A.post('resumenes_enviados',
          { publicador_id: pub.id, semana, avisos: pub.filas.length, vistas, consultas },
          { prefer: 'return=minimal' });
        mandados.push(resumen);
      } catch (e) {
        salteados.push({ nombre: pub.nombre, motivo: String(e && e.message || e).slice(0, 200) });
      }
    }

    return res.status(200).json({
      ok: true, ensayo, semana,
      desde: desde.toISOString(), hasta: hasta.toISOString(),
      mandados, salteados, ms: Date.now() - t0
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e).slice(0, 300), ms: Date.now() - t0 });
  }
};
