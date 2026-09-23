/**
 * Resumen semanal del publicador (módulo compartido; los archivos de api/ que
 * empiezan con guion bajo no se despliegan como función).
 *
 * Lo usan dos: api/portal-semanal.js, para dispararlo a mano o probarlo, y
 * api/portal-diario.js, que lo llama los lunes. Va como módulo y no como una
 * tarea automática propia porque Vercel limita cuántas se pueden tener, y la
 * diaria ya corre igual: agregarle un paso sale gratis.
 *
 * Para qué existe: el panel del propietario ya muestra vistas, consultas y
 * visitas, pero nadie entra solo a mirarlo. Este mail es lo que lo trae de
 * vuelta cada lunes, y es el argumento con el que después se le vende al
 * corredor ("tus propietarios ya están adentro"). Es la palanca de adopción
 * hecha mail.
 *
 * A quiénes les llega:
 *   · Al PUBLICADOR, sobre lo que publica.
 *   · Al PROPIETARIO, sobre su unidad, aunque la publique otro. Desde que las
 *     unidades volvieron a Bairen Realty el dueño no es publicador, así que sin
 *     este segundo envío se quedaba sin el mail, y ese mail es la palanca entera
 *     del modelo. Necesita portal/migracion-19-resumen-propietarios.sql.
 *
 * Reglas:
 *   · Solo a quien tenga mail cargado.
 *   · Solo si hubo al menos una vista en la semana. Un mail que dice "cero en
 *     todo" enseña a ignorar los mails que vienen después.
 *   · Una sola vez por semana y por publicador: lo garantiza el único
 *     (publicador_id, semana) de portal.resumenes_enviados. Si se dispara dos
 *     veces, la segunda no manda nada.
 *
 * Necesita portal/migracion-09-resumen-semanal.sql.
 * Sin RESEND_API_KEY no manda y devuelve lo que habría mandado.
 */
const A = require('./admin');

/* ══════════════════════════════════════════════════════════════════════════════
   23/9/2026 · LLAVE DE LOS PROPIETARIOS, APAGADA A PROPÓSITO.

   Los 24 propietarios todavía NO saben que tienen acceso al portal ni que van a
   recibir un mail semanal. Mandárselo sin avisarles es aparecer sin invitación en
   la casilla de alguien que confió su departamento: se explica una vez, no se
   pide perdón después.

   Mientras esto esté en false, el resumen del publicador sale igual (le llega a
   Bairen Realty y a Maxim, que son de la casa) y el de los propietarios se arma,
   se cuenta y NO se manda.

   Para encenderlo: poner true y publicar. Una línea.
   ══════════════════════════════════════════════════════════════════════════════ */
const AVISAR_A_PROPIETARIOS = false;

/* El lunes 00:00 de Buenos Aires de la semana que ya cerró. */
function lunesDeLaSemanaPasada(hoy) {
  const inicioHoy = A.inicioDelDiaBA(hoy);
  const diaSemana = new Date(inicioHoy.getTime() + 3 * 3600 * 1000).getUTCDay(); // 0 domingo
  const desdeElLunes = (diaSemana + 6) % 7;                                       // lunes = 0
  const lunesDeEstaSemana = new Date(inicioHoy.getTime() - desdeElLunes * 86400000);
  return new Date(lunesDeEstaSemana.getTime() - 7 * 86400000);
}

/* Hoy es lunes en Buenos Aires */
function esLunes(hoy) {
  const inicioHoy = A.inicioDelDiaBA(hoy);
  return new Date(inicioHoy.getTime() + 3 * 3600 * 1000).getUTCDay() === 1;
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
      return '<tr><td style="padding:10px 0;border-bottom:1px solid #EFEAE0">'
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


function cuerpoPropietario(filas, publica, desde, hasta) {
  const totalV = filas.reduce((s, f) => s + Number(f.vistas || 0), 0);
  const totalC = filas.reduce((s, f) => s + Number(f.consultas || 0), 0);
  const totalX = filas.reduce((s, f) => s + Number(f.visitas || 0), 0);

  const unidades = filas.map(f => {
    const partes = [plural(Number(f.vistas || 0), 'vista', 'vistas')];
    if (Number(f.consultas)) partes.push(plural(Number(f.consultas), 'consulta', 'consultas'));
    if (Number(f.visitas)) partes.push(plural(Number(f.visitas), 'visita pedida', 'visitas pedidas'));
    return '<tr><td style="padding:10px 0;border-bottom:1px solid #EFEAE0">'
      + '<div style="font-weight:600">' + A.esc(f.titulo || f.direccion || f.codigo) + '</div>'
      + '<div style="color:#6B6558;font-size:13px">' + A.esc(partes.join(' · ')) + '</div>'
      + '</td></tr>';
  }).join('');

  const una = filas.length === 1;
  return A.plantilla(
    '<h1 style="font-size:20px;margin:0 0 4px">' + (una ? 'Cómo anduvo tu propiedad esta semana' : 'Cómo anduvieron tus propiedades esta semana') + '</h1>'
    + '<p style="color:#6B6558;margin:0 0 20px;font-size:14px">Semana del ' + A.fechaBA(desde)
      + ' al ' + A.fechaBA(new Date(hasta.getTime() - 86400000)) + '</p>'
    + '<p style="font-size:17px;margin:0 0 18px"><b>' + plural(totalV, 'persona vio', 'personas vieron') + '</b> '
      + (una ? 'tu propiedad en BAIREN' : 'tus propiedades en BAIREN')
      + (totalC ? ', y <b>' + plural(totalC, 'dejó una consulta', 'dejaron consulta') + '</b>' : '')
      + (totalX ? ', con <b>' + plural(totalX, 'visita pedida', 'visitas pedidas') + '</b>' : '')
      + '.</p>'
    + (unidades ? '<table style="width:100%;border-collapse:collapse;margin:0 0 20px">' + unidades + '</table>' : '')
    + '<p style="margin:0 0 20px;font-size:14px">'
      + (totalC ? 'De las consultas se ocupa ' + A.esc(publica) + ', que comercializa tu unidad. '
                : 'Todavía no hubo consultas. Las vistas son la antesala. ')
      + 'Entrá cuando quieras a ver el detalle.</p>'
    + '<p style="margin:0"><a href="' + A.SITE + 'panel.html" '
      + 'style="display:inline-block;background:#131D2D;color:#fff;text-decoration:none;'
      + 'padding:12px 22px;border-radius:4px;font-size:15px">Ver mis propiedades</a></p>'
  );
}

/* opciones: { desde: 'AAAA-MM-DD', ensayo: true } */
async function resumenSemanal(opciones) {
  const o = opciones || {};
  /* Modo prueba: en vez de a cada destinatario, todo va a una sola casilla, con el
     asunto marcado y una línea arriba diciendo a quién le habría llegado. Sirve para
     ver los mails de verdad, en un cliente de correo real, sin escribirle a nadie. */
  const prueba = o.prueba && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(o.prueba) ? o.prueba : null;
  const aviso = (para) => prueba
    ? '<p style="background:#FFF4D6;border:1px solid #C2A968;padding:10px 12px;margin:0 0 18px;font-size:13px">'
      + 'Prueba. Este mail le habría llegado a <b>' + A.esc(para) + '</b>.</p>'
    : '';
  const desde = o.desde ? A.inicioDelDiaBA(o.desde + 'T12:00:00Z') : lunesDeLaSemanaPasada();
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
    if (o.ensayo) { mandados.push(Object.assign({ ensayo: true }, resumen)); continue; }

    try {
      await A.enviarMail({
        to: prueba || pub.email,
        subject: (prueba ? '[PRUEBA] ' : '') + 'BAIREN · ' + plural(vistas, 'persona vio', 'personas vieron') + ' lo tuyo esta semana',
        html: aviso(pub.email) + cuerpo(pub, pub.filas, desde, hasta)
      });
      if (prueba) { mandados.push(Object.assign({ prueba: true, habriaIdoA: pub.email }, resumen)); continue; }
      /* Se registra después de mandar: si el mail falla, se reintenta la próxima corrida. */
      await A.post('resumenes_enviados',
        { publicador_id: pub.id, semana, avisos: pub.filas.length, vistas, consultas },
        { prefer: 'return=minimal' });
      mandados.push(resumen);
    } catch (e) {
      salteados.push({ nombre: pub.nombre, motivo: String(e && e.message || e).slice(0, 200) });
    }
  }

  /* ── Y ahora los propietarios ────────────────────────────────────────────────
     El dueño no publica, así que no aparece en el resumen de arriba. Pero es
     justamente a quien hay que avisarle: ver los números de su departamento sin
     tener que llamar por teléfono es lo único que el portal le da y nadie más.
     Necesita portal/migracion-19-resumen-propietarios.sql; sin ella, este paso
     no encuentra la función y se saltea sin romper el resto. */
  const duenos = [];
  try {
    const fp = await A.post('rpc/resumen_semanal_propietarios',
      { p_desde: desde.toISOString(), p_hasta: hasta.toISOString() }) || [];

    const porDueno = new Map();
    for (const f of fp) {
      if (!f.propietario_email) continue;
      if (!porDueno.has(f.propietario_email)) porDueno.set(f.propietario_email, { publica: f.publica, filas: [] });
      porDueno.get(f.propietario_email).filas.push(f);
    }

    const yaD = new Set(
      (await A.get('resumenes_enviados?select=propietario_email&semana=eq.' + semana + '&propietario_email=not.is.null') || [])
        .map(r => String(r.propietario_email || '').toLowerCase())
    );

    for (const [mail, d] of porDueno) {
      const vistas = d.filas.reduce((s, f) => s + Number(f.vistas || 0), 0);
      const consultas = d.filas.reduce((s, f) => s + Number(f.consultas || 0), 0);
      if (yaD.has(mail)) { salteados.push({ nombre: mail, motivo: 'al propietario ya se le mandó esta semana' }); continue; }
      if (!vistas) { salteados.push({ nombre: mail, motivo: 'propietario sin movimiento en la semana' }); continue; }

      const r = { propietario: mail, unidades: d.filas.length, vistas, consultas };
      if (o.ensayo) { duenos.push(Object.assign({ ensayo: true }, r)); continue; }

      /* La llave de arriba: si está apagada, se cuenta pero no se manda. En modo
         prueba sí se manda, porque va a la casilla de la casa y no a la del dueño. */
      if (!AVISAR_A_PROPIETARIOS && !prueba) {
        salteados.push({ nombre: mail, motivo: 'a los propietarios todavía no se les avisó (AVISAR_A_PROPIETARIOS)' });
        continue;
      }

      try {
        await A.enviarMail({
          to: prueba || mail,
          subject: (prueba ? '[PRUEBA] ' : '') + 'BAIREN · ' + plural(vistas, 'persona vio', 'personas vieron') + (d.filas.length === 1 ? ' tu propiedad esta semana' : ' tus propiedades esta semana'),
          html: aviso(mail) + cuerpoPropietario(d.filas, d.publica, desde, hasta)
        });
        if (prueba) { duenos.push(Object.assign({ prueba: true, habriaIdoA: mail }, r)); continue; }
        await A.post('resumenes_enviados',
          { propietario_email: mail, semana, avisos: d.filas.length, vistas, consultas },
          { prefer: 'return=minimal' });
        duenos.push(r);
      } catch (e) {
        salteados.push({ nombre: mail, motivo: String(e && e.message || e).slice(0, 200) });
      }
    }
  } catch (e) {
    salteados.push({ nombre: 'propietarios', motivo: 'sin migracion-19: ' + String(e && e.message || e).slice(0, 160) });
  }

  return { semana, desde: desde.toISOString(), hasta: hasta.toISOString(), mandados, duenos, salteados };
}

module.exports = { resumenSemanal, esLunes, lunesDeLaSemanaPasada };
