'use strict';
/**
 * Batería de pruebas del filtro (lib/flujo.js). Simula todos los escenarios.
 * Correr:  node test-flujo.js
 */
const { procesarFlujo, ZONAS, GRUPOS, pideAnuncio, parseBarriosTexto, parseBarriosConNegacion, parseAmbTexto, parseTiempoTexto, parsePresuTexto } = require('./lib/flujo');
const { fetchPropiedades } = require('./lib/chat');

const flow = (zonas) => ({ tipo: 'flow', zonas });
const op = (id) => ({ tipo: 'opcion', id, texto: '' });
const txt = (t) => ({ tipo: 'texto', texto: t });

let PASS = 0, FAIL = 0;
function ok(cond, label) { if (cond) { PASS++; } else { FAIL++; console.log('   ❌ FALLA: ' + label); } }
function tipos(r) { return r.mensajes.map((m) => m.tipo).join(','); }
function texto1(r) { const m = r.mensajes.find((x) => x.texto); return m ? m.texto : ''; }

(async () => {
  const props = await fetchPropiedades();
  const P = (est, inp) => procesarFlujo(est, inp, props);

  // ---------- 1. Happy path completo (Palermo, 1 amb, hasta 800) ----------
  console.log('1) Happy path: Palermo 1amb hasta 800 -> visita -> despedida -> fin');
  {
    let r = P({}, txt('hola'));
    ok(r.estado.step === 'intencion' && r.mensajes.length === 2 && r.mensajes[0].tipo === 'texto' && /Te habla Tomás/.test(r.mensajes[0].texto) && r.mensajes[1].tipo === 'botones', '1.saludo 2 mensajes (texto + pregunta compra/alquiler)');
    r = P(r.estado, op('int_alquilar'));
    ok(r.estado.step === 'zona_flow' && r.mensajes[0].tipo === 'lista', '1.alquilar -> lista de zonas');
    r = P(r.estado, flow(['z_palermo']));
    ok(r.estado.step === 'ambientes', '1.ambientes');
    r = P(r.estado, op('amb_1'));
    ok(r.estado.step === 'tiempo', '1.tiempo');
    r = P(r.estado, op('t_ya'));
    ok(r.estado.step === 'presupuesto' && /podemos ofrecerte/.test(texto1(r)), '1.tiempo muestra opciones');
    ok(r.mensajes.some((m) => m.tipo === 'imagen_caption'), '1.tiempo manda fotos');
    ok(r.mensajes[r.mensajes.length - 1].tipo === 'lista', '1.pregunta presupuesto al final');
    r = P(r.estado, op('pp_800'));
    ok(r.estado.step === 'visita' && r.lead, '1.visita + lead guardado');
    ok(r.mensajes[r.mensajes.length - 1].tipo === 'lista', '1.presupuesto -> lista de visita');
    const visitFila = r.mensajes[r.mensajes.length - 1].filas.find((f) => f.id.startsWith('visit_'));
    r = P(r.estado, op(visitFila.id));
    ok(r.estado.step === 'despedida', '1.handoff -> despedida');
    ok(r.mensajes[0].tipo === 'cta' && /wa\.me/.test(r.mensajes[0].url), '1.boton CTA con link');
    ok(/coordinar una visita para .+ Muchas gracias/.test(decodeURIComponent(r.mensajes[0].url)), '1.prefill con depto');
    ok(r.mensajes.length === 2 && !/quedo a disposición/i.test(texto1(r)), '1.solo 2 msgs, sin "quedo a disposicion"');
    const r2 = P(r.estado, txt('gracias!'));
    ok(r2.estado.step === 'fin' && /Muchas gracias por tu tiempo/.test(texto1(r2)), '1.proximo msg -> despedida unica');
    const r3 = P(r2.estado, txt('ok dale'));
    ok(r3.mensajes.length === 0 && r3.estado.step === 'fin', '1.fin -> mensaje suelto = silencio');
    const r4 = P(r2.estado, txt('hola'));
    ok(r4.estado.step === 'intencion', '1.fin -> un saludo nuevo reinicia');
  }

  // ---------- 2. Multi-barrio por formulario ----------
  console.log('2) Multi-barrio formulario: Palermo + Recoleta');
  {
    let r = P({ step: 'zona_flow', zonas: [] }, flow(['z_palermo', 'z_recoleta']));
    ok(r.estado.step === 'ambientes' && r.estado.zonas.length === 2, '2.dos zonas');
  }

  // ---------- 3. Zonas SOLO-BOTÓN: el texto escrito NO se toma como respuesta ----------
  console.log('3) Zonas solo-botón: texto escrito NO avanza, pide usar la lista');
  {
    let r = P({ step: 'zona_flow', zonas: [] }, txt('Palermo'));
    ok(r.estado.step === 'zona_flow', '3.texto "Palermo" NO avanza (sigue en zonas)');
    ok(/una de las opciones/i.test(texto1(r)), '3.pide seleccionar una opción');
    ok(r.mensajes.some((m) => m.tipo === 'lista' && m.filas.length === 4), '3.reofrece la lista de 4 grupos');
    // Tocar el grupo SÍ lo toma (y pregunta si suma otra zona)
    ok(P({ step: 'zona_flow', zonas: [] }, op('g_palermo')).estado.step === 'zona_mas', '3.tocar el grupo -> pregunta si suma otra');
  }

  // ---------- 4. Texto inválido en zonas -> también pide seleccionar ----------
  console.log('4) Texto invalido en zonas ("caballito") -> pide seleccionar');
  {
    let r = P({ step: 'zona_flow', zonas: [] }, txt('caballito'));
    ok(r.estado.step === 'zona_flow' && /una de las opciones/i.test(r.mensajes[0].texto), '4.texto invalido -> pide seleccionar');
    const listaZonas = r.mensajes.find((m) => m.tipo === 'lista');
    ok(listaZonas && listaZonas.filas.length === 4, '4.reofrece la lista de 4 grupos de zonas');
  }

  // ---------- 5. parseBarriosTexto tolera typos (función; el flujo ya NO la usa, queda por si Flows/fallback) ----------
  console.log('5) parseBarriosTexto typos: palrmo / recoleeta / belgrno / nuñes');
  {
    ok(parseBarriosTexto('palrmo').includes('z_palermo'), '5.palrmo->Palermo');
    ok(parseBarriosTexto('recoleeta').includes('z_recoleta'), '5.recoleeta->Recoleta');
    ok(parseBarriosTexto('belgrno').includes('z_belgrano'), '5.belgrno->Belgrano');
    ok(parseBarriosTexto('nuñes').includes('z_nunez'), '5.nuñes->Núñez');
  }

  // ---------- 6. parseBarriosTexto sinónimos ----------
  console.log('6) parseBarriosTexto sinónimos: "las cañitas" / "soho" / "san isidro" / "olivos"');
  {
    ok(parseBarriosTexto('las cañitas').includes('z_palermo'), '6.cañitas->Palermo');
    ok(parseBarriosTexto('soho').includes('z_palermo'), '6.soho->Palermo');
    ok(parseBarriosTexto('san isidro').includes('z_norte'), '6.san isidro->Zona Norte');
    ok(parseBarriosTexto('olivos').includes('z_norte'), '6.olivos->Zona Norte');
  }

  // ---------- 7. Ambientes/presupuesto: SOLO botón (el texto ya no avanza) ----------
  console.log('7) Ambientes/presupuesto solo-botón (texto NO avanza)');
  {
    // Las funciones de parseo siguen existiendo (por si Flows/fallback)...
    ok(parseAmbTexto('dos ambientes') === 'amb_2', '7.parseAmb "dos"->amb_2 (función)');
    ok(parsePresuTexto('como 1000 usd') === 'pp_1500', '7.parsePresu "1000"->pp_1500 (función)');
    // ...pero en el flujo, escribir NO avanza (pide usar los botones).
    ok(P({ step: 'ambientes', zonas: ['z_palermo'] }, txt('dos ambientes')).estado.step === 'ambientes', '7.texto en ambientes NO avanza');
    ok(P({ step: 'ambientes', zonas: ['z_palermo'] }, op('amb_2')).estado.step === 'tiempo', '7.botón en ambientes SÍ avanza');
    ok(P({ step: 'presupuesto', zonas: ['z_palermo'], ambientes: 'amb_1', timing: 't_ya' }, txt('1000 usd')).estado.step === 'presupuesto', '7.texto en presupuesto NO avanza');
  }

  // ---------- 8. Matching cruzado (Recoleta 1amb hasta 800 -> Palermo/Villa Crespo) ----------
  console.log('8) Matching cruzado: Recoleta 1amb hasta 800');
  {
    let est = { step: 'presupuesto', zonas: ['z_recoleta'], ambientes: 'amb_1', timing: 't_ya' };
    let r = P(est, op('pp_800'));
    ok(r.estado.step === 'visita', '8.llega a visita por cruzado');
    ok(/no tengo en ese presupuesto, pero te muestro/.test(texto1(r)), '8.mensaje cruzado');
    ok(r.mensajes.some((m) => m.tipo === 'imagen_caption'), '8.muestra fotos de las cruzadas');
    const slugs = r.estado.mostrados.map((m) => m.slug);
    ok(slugs.length > 0 && r.estado.mostrados.every((m) => m.slug), '8.tiene mostrados');
  }

  // ---------- 9. EL BUG REPORTADO: 3 amb hasta 800 NO debe dead-endear ----------
  console.log('9) 3 ambientes hasta 800: muestra el de 750/800 (no "no tengo")');
  {
    let est = { step: 'presupuesto', zonas: ['z_nunez'], ambientes: 'amb_3', timing: 't_ya' };
    let r = P(est, op('pp_800'));
    ok(r.estado.step === 'visita', '9.no dead-end -> visita');
    ok(/No tengo .*en ese presupuesto, te paso opciones que se ajustan a tus preferencias/.test(texto1(r)), '9.mensaje claro');
    ok(r.estado.mostrados.some((m) => m.slug === 'francisco-acuna-de-figueroa-1560-1g'), '9.incluye el de 750');
    ok(!/no tengo unidades disponibles a menos de 800/i.test(texto1(r)), '9.NO dice el mensaje viejo');
    const lista9 = r.mensajes[r.mensajes.length - 1];
    ok(/Tu presupuesto se adecúa a estas alternativas/.test(lista9.texto), '9.lista dice "estas alternativas" (no "lo que buscás")');
  }

  // ---------- 10. No me interesa -> web + contacto Tiziana (sin prefill) -> fin ----------
  console.log('10) "No me interesa" -> web + contacto Tiziana -> fin -> silencio');
  {
    let est = { step: 'visita', zonas: ['z_palermo'], ambientes: 'amb_1', mostrados: [{ slug: 'x', nombre: 'X', etiqueta: 'X' }] };
    let r = P(est, op('no_visita'));
    ok(r.estado.step === 'fin' && !r.usarIA, '10.fin sin IA');
    ok(/Te dejo nuestra web para que veas todas nuestras opciones/.test(r.mensajes[0].texto) && !/Saludos/.test(r.mensajes[0].texto), '10.msg web sin ¡Saludos!');
    const cta = r.mensajes.find((m) => m.tipo === 'cta');
    ok(cta && /Tiziana/.test(cta.texto) && cta.url === 'https://wa.me/5491123106629', '10.contacto Tiziana SIN prefill (?text)');
    ok(P(r.estado, txt('?')).mensajes.length === 0, '10.silencio despues');
  }

  // ---------- 11. "no" escrito en visita ----------
  console.log('11) "no gracias" escrito en visita');
  {
    let est = { step: 'visita', zonas: ['z_palermo'], ambientes: 'amb_1', mostrados: [{ slug: 'x', nombre: 'X', etiqueta: 'X' }] };
    ok(P(est, txt('no gracias')).estado.step === 'fin', '11.no escrito -> cierre web');
  }

  // ---------- 12. reiniciar desde cualquier punto ----------
  console.log('12) "reiniciar" desde el medio');
  {
    ok(P({ step: 'presupuesto', zonas: ['z_palermo'], ambientes: 'amb_2' }, txt('reiniciar')).estado.step === 'intencion', '12.reinicia');
    ok(P({ step: 'fin' }, txt('reiniciar')).estado.step === 'intencion', '12.reinicia hasta desde fin');
    ok(P({ step: 'fin' }, txt('hola')).estado.step === 'intencion', '12.un saludo reinicia desde fin');
    ok(P({ step: 'fin' }, txt('buenas tardes')).estado.step === 'intencion', '12.buenas reinicia');
    ok(P({ step: 'fin' }, txt('ok gracias')).mensajes.length === 0, '12.mensaje suelto en fin -> silencio');
    // "hola" en cualquier estado RE-SALUDA (2 mensajes), no lo toma como barrio inválido
    const rh = P({ step: 'zona_flow', zonas: [] }, txt('hola'));
    ok(rh.mensajes.length === 2 && /Te habla Tomás/.test(rh.mensajes[0].texto), '12.hola en zona_flow re-saluda (no "elegí barrio")');
    // pero "hola + barrio" NO reinicia: extrae el barrio
    ok(P({ step: 'zona_flow', zonas: [] }, txt('hola, busco en palermo')).estado.step === 'zona_flow', '12.hola+barrio NO resetea ni toma el texto (queda en zonas)');
    // "hola" en el medio del flujo también re-saluda
    ok(P({ step: 'presupuesto', zonas: ['z_palermo'], ambientes: 'amb_2' }, txt('hola!')).estado.step === 'intencion', '12.hola en el medio re-saluda');
  }

  // ---------- 13. Garbage / reintentos ----------
  console.log('13) Inputs basura -> reintento (no rompe)');
  {
    ok(/una de las opciones/i.test(texto1(P({ step: 'ambientes', zonas: ['z_palermo'] }, txt('askjdh')))), '13.ambientes basura');
    ok(/una de las opciones/i.test(texto1(P({ step: 'presupuesto', zonas: ['z_palermo'], ambientes: 'amb_1' }, txt('???')))), '13.presupuesto basura');
    ok(P({ step: 'zona_flow', zonas: [] }, txt('')).estado.step === 'zona_flow', '13.zona vacia no rompe');
    ok(P({ step: 'visita', mostrados: [] }, op('boton_raro')).estado.step === 'visita', '13.visita boton raro');
  }

  // ---------- 14. Recorrido por CADA barrio (que ninguno explote y muestre algo coherente) ----------
  console.log('14) Cada barrio x cada ambiente x cada presupuesto (sin crashear)');
  {
    const zonas = ['z_palermo', 'z_recoleta', 'z_belgrano', 'z_nunez', 'z_colegiales', 'z_villacrespo', 'z_almagro', 'z_centro', 'z_retiro', 'z_madero', 'z_norte'];
    const ambs = ['amb_1', 'amb_2', 'amb_3'];
    const presus = ['pp_800', 'pp_1500', 'pp_2500', 'pp_max'];
    let combos = 0, crashes = 0;
    for (const z of zonas) for (const a of ambs) for (const pp of presus) {
      combos++;
      try {
        let r = P({ step: 'presupuesto', zonas: [z], ambientes: a, timing: 't_ya' }, op(pp));
        const okStep = ['visita', 'pedir_contacto'].includes(r.estado.step);
        if (!okStep) { crashes++; console.log('   ⚠ combo raro', z, a, pp, '->', r.estado.step); }
      } catch (e) { crashes++; console.log('   💥 crash', z, a, pp, e.message); }
    }
    ok(crashes === 0, `14.${combos} combos sin crash`);
  }

  // ---------- 15. Los 4 barrios nuevos encuentran su depto ----------
  console.log('15) Barrios nuevos: Villa Crespo / Almagro / Centro / Retiro');
  {
    const casos = [
      ['z_villacrespo', 'amb_1', 'pp_800',  'Villa Crespo'],
      ['z_almagro',     'amb_3', 'pp_1500', 'Almagro'],
      ['z_centro',      'amb_3', 'pp_2500', 'Centro'],
      ['z_retiro',      'amb_3', 'pp_2500', 'Retiro'],
    ];
    for (const [z, a, pp, label] of casos) {
      const r = P({ step: 'presupuesto', zonas: [z], ambientes: a, timing: 't_ya' }, op(pp));
      ok(r.estado.step === 'visita' && (r.estado.mostrados || []).length > 0, `15.${label} muestra depto propio`);
    }
  }

  // ---------- 16. Texto de barrios nuevos ----------
  console.log('16) Texto: "villa crespo" / "almagro" / "centro" / "retiro"');
  {
    ok(parseBarriosTexto('villa crespo').includes('z_villacrespo'), '16.villa crespo');
    ok(parseBarriosTexto('almagro').includes('z_almagro'), '16.almagro');
    ok(parseBarriosTexto('centro').includes('z_centro'), '16.centro');
    ok(parseBarriosTexto('retiro').includes('z_retiro'), '16.retiro');
    // que "cuatro ambientes" NO se confunda con Centro (falso positivo de fuzzy)
    ok(!parseBarriosTexto('cuatro').includes('z_centro'), '16.cuatro NO es Centro');
  }

  // ---------- 17. BARRIDO EXTREMO A EXTREMO: toda conversación termina bien ----------
  // Para cada (barrio x ambientes x presupuesto) x {coordina visita, no quiere}:
  // confirmar que SIEMPRE termina en Tiziana o en el mensaje de la web, sin IA, sin crash.
  console.log('17) Barrido completo: cada conversación termina en Tiziana o web (sin IA)');
  {
    const zonas = ['z_palermo', 'z_recoleta', 'z_belgrano', 'z_nunez', 'z_colegiales', 'z_villacrespo', 'z_almagro', 'z_centro', 'z_retiro', 'z_madero', 'z_norte'];
    const ambs = ['amb_1', 'amb_2', 'amb_3'];
    const presus = ['pp_800', 'pp_1500', 'pp_2500', 'pp_max'];

    function journey(z, a, pp, elegirVisita) {
      let r = P({}, txt('hola'));
      r = P(r.estado, op('int_alquilar'));
      if (r.estado.step !== 'zona_flow') return { err: `no llegó a zona tras alquilar (${r.estado.step})` };
      r = P(r.estado, flow([z]));
      if (r.estado.step !== 'ambientes') return { err: `no llegó a ambientes (${r.estado.step})` };
      r = P(r.estado, op(a));
      r = P(r.estado, op('t_ya'));
      if (r.estado.step !== 'presupuesto') return { err: `no llegó a presupuesto (${r.estado.step})` };
      r = P(r.estado, op(pp));
      if (r.usarIA) return { err: 'usó IA en presupuesto' };
      if (r.estado.step === 'fin') return { fin: 'web', usoIA: false }; // nada en budget (no pasa con data actual)
      if (r.estado.step !== 'visita') return { err: `tras presupuesto: ${r.estado.step}` };
      const lista = r.mensajes[r.mensajes.length - 1];
      if (lista.tipo !== 'lista') return { err: 'no hay lista de visita' };
      const fila = lista.filas.find((f) => f.id.startsWith('visit_'));
      if (!fila) return { err: 'sin opción de visita' };

      if (elegirVisita) {
        r = P(r.estado, op(fila.id));
        const cta = r.mensajes.find((m) => m.tipo === 'cta');
        if (r.estado.step !== 'despedida' || !cta || !/wa\.me/.test(cta.url || '')) return { err: 'handoff mal' };
        if (r.usarIA) return { err: 'IA en handoff' };
        let r2 = P(r.estado, txt('una pregunta'));
        if (r2.estado.step !== 'fin' || !/Muchas gracias por tu tiempo/.test(texto1(r2)) || r2.usarIA) return { err: 'despedida mal' };
        if (P(r2.estado, txt('ok dale')).mensajes.length !== 0) return { err: 'no silencia tras fin' };
        return { fin: 'tiziana', usoIA: false };
      } else {
        r = P(r.estado, op('no_visita'));
        const ctaW = r.mensajes.find((m) => m.tipo === 'cta');
        if (r.estado.step !== 'fin' || !/Te dejo nuestra web/.test(texto1(r)) || !ctaW || r.usarIA) return { err: 'no_visita mal' };
        if (P(r.estado, txt('ok dale')).mensajes.length !== 0) return { err: 'no silencia tras no_visita' };
        return { fin: 'web', usoIA: false };
      }
    }

    let total = 0, tiziana = 0, web = 0, errores = 0, conIA = 0;
    for (const z of zonas) for (const a of ambs) for (const pp of presus) for (const elegir of [true, false]) {
      total++;
      let res;
      try { res = journey(z, a, pp, elegir); }
      catch (e) { errores++; console.log(`   💥 crash ${z}/${a}/${pp}/${elegir}: ${e.message}`); continue; }
      if (res.err) { errores++; console.log(`   ❌ ${z}/${a}/${pp}/visita=${elegir}: ${res.err}`); continue; }
      if (res.usoIA) conIA++;
      if (res.fin === 'tiziana') tiziana++;
      else if (res.fin === 'web') web++;
      else { errores++; console.log(`   ❌ ${z}/${a}/${pp}: fin desconocido`); }
    }
    console.log(`   -> ${total} conversaciones: ${tiziana} terminan en Tiziana, ${web} en web, ${conIA} usaron IA, ${errores} errores`);
    ok(errores === 0, `17.${total} conversaciones sin error`);
    ok(conIA === 0, '17.ninguna usó IA (todo gratis)');
    ok(tiziana + web === total, '17.TODAS terminan en Tiziana o web');
  }

  // ---------- 18. Precios: temporal (negrita + Todo incluido) | tradicional (negrita + expensas) ----------
  // Agnóstico al inventario: barre todos los barrios y valida el FORMATO de precio, no una propiedad puntual.
  console.log('18) Temporal: negrita + Todo incluido | Tradicional: negrita + expensas');
  {
    const zonasTodas = ['z_palermo', 'z_recoleta', 'z_belgrano', 'z_nunez', 'z_colegiales', 'z_villacrespo', 'z_almagro', 'z_centro', 'z_retiro', 'z_madero', 'z_norte'];
    const caps = [];
    for (const amb of ['amb_1', 'amb_2', 'amb_3']) for (const z of zonasTodas) {
      caps.push(...P({ step: 'tiempo', zonas: [z], ambientes: amb }, op('t_ya')).mensajes.filter((m) => m.tipo === 'imagen_caption').map((m) => m.caption));
    }
    const temporalCap = caps.find((c) => /Todo incluido/.test(c));
    const tradicionalCap = caps.find((c) => /\/mes \+ expensas\*/.test(c));
    ok(temporalCap && /\*USD [\d.]+\/mes\*/.test(temporalCap), '18.temporal precio en *negrita*');
    ok(temporalCap && /\*\(Todo incluido: Alquiler \+ expensas \+ gastos\)\*/.test(temporalCap), '18.temporal "Todo incluido" en negrita');
    ok(tradicionalCap && /\*USD [\d.]+\/mes \+ expensas\*/.test(tradicionalCap), '18.tradicional precio en *negrita* + expensas');
  }

  // ---------- 19. Las Cañitas = Palermo Y Belgrano; el paso tiempo muestra TODAS con foto (tope 5) ----------
  console.log('19) Las Cañitas = Palermo y Belgrano; tiempo muestra TODAS con foto');
  {
    // Invariante de config (no depende del inventario): "Las Cañitas" cuenta para Palermo Y Belgrano.
    const zPal = ZONAS.find((z) => z.id === 'z_palermo');
    const zBel = ZONAS.find((z) => z.id === 'z_belgrano');
    ok(zPal.barrios.includes('Las Cañitas'), '19.Las Cañitas mapea a Palermo');
    ok(zBel.barrios.includes('Las Cañitas'), '19.Las Cañitas mapea a Belgrano');
    // Muestra UNA foto por coincidencia (hasta el tope de 5), no corta en 3 como el bug viejo.
    // El esperado se calcula de la data en vivo con el mismo mapeo de barrios (agnóstico al inventario).
    const barriosPBN = ['Palermo', 'Palermo Hollywood', 'Palermo Soho', 'Las Cañitas', 'Belgrano C', 'Núñez'];
    const esperado = Math.min(props.filter((p) => barriosPBN.includes(p.barrio) && p.ambientes === 2).length, 5);
    const fotos = P({ step: 'tiempo', zonas: ['z_palermo', 'z_belgrano', 'z_nunez'], ambientes: 'amb_2' }, op('t_ya')).mensajes.filter((m) => m.tipo === 'imagen_caption').length;
    ok(fotos === esperado, `19.muestra las ${esperado} coincidencias con foto (no corta en 3)`);
  }

  // ---------- 20. Activación: primer mensaje cualquiera saluda; en fin solo "hola"/"buenas" ----------
  console.log('20) Activación: primer mensaje cualquiera saluda; en fin solo "hola"/"buenas"');
  {
    ok(P({}, txt('me interesa un depto en palermo')).estado.step === 'intencion', '20.primer msg cualquiera -> saluda');
    ok(P({}, { tipo: 'otro', texto: '' }).estado.step === 'intencion', '20.primer msg ubicacion/otro -> saluda');
    ok(P({ step: 'fin' }, txt('hola, quiero ver otro depto')).estado.step === 'intencion', '20.fin + "hola..." reactiva');
    ok(P({ step: 'fin' }, txt('buenas, algo mas?')).estado.step === 'intencion', '20.fin + "buenas..." reactiva');
    ok(P({ step: 'fin' }, txt('gracias por todo')).mensajes.length === 0, '20.fin + msg sin saludo = silencio');
    ok(P({ step: 'fin' }, { tipo: 'otro', texto: '' }).mensajes.length === 0, '20.fin + ubicacion/otro = silencio');
  }

  // ---------- 21. "Quiero hablar con una persona real" -> contacto de Tiziana (cualquier estado) ----------
  console.log('21) Pedido de humano -> botón Tiziana, desde cualquier estado');
  {
    const media = (t) => ({ tipo: 'media', id: null, texto: '', media: t });
    const casos = [
      'quiero hablar con una persona real',
      'puedo hablar con una persona?',
      'quiero hablar con alguien que no sea un bot',
      'necesito hablar con un humano',
      'me pasas con un asesor',
      'sos un bot?',
      'quiero que me atienda una persona',
      'hay algun representante con quien hablar',
    ];
    for (const c of casos) {
      const r = P({ step: 'ambientes', zonas: ['z_palermo'] }, txt(c));
      const cta = r.mensajes.find((m) => m.tipo === 'cta');
      ok(cta && /te dará una mano/.test(cta.texto) && cta.url === 'https://wa.me/5491123106629' && r.estado.step === 'fin', `21."${c}" -> Tiziana + fin`);
    }
    // Texto EXACTO pedido por el usuario.
    const r0 = P({ step: 'visita', mostrados: [] }, txt('quiero hablar con una persona real'));
    ok(/Claro! Te dejo el contacto de Tiziana, del equipo de Bairen/.test(r0.mensajes[0].texto) && /Cualquier consulta ella te dará una mano/.test(r0.mensajes[0].texto), '21.texto exacto del handoff');
    // Funciona incluso en 'fin' (aunque ya esté cerrado).
    ok(P({ step: 'fin' }, txt('puedo hablar con alguien real?')).mensajes.find((m) => m.tipo === 'cta' && /te dará una mano/.test(m.texto)), '21.tambien dispara en fin');
    // NO debe ser falso positivo con inputs normales del flujo.
    ok(!P({ step: 'visita', mostrados: [] }, txt('no me interesa')).mensajes.find((m) => /te dará una mano/.test(m.texto || '')), '21.no falso positivo con "no me interesa"');
    ok((() => { const rp = P({ step: 'zona_flow', zonas: [] }, txt('busco en palermo')); return rp.estado.step === 'zona_flow' && !rp.mensajes.find((m) => m.tipo === 'cta'); })(), '21.no falso positivo con un barrio (no Tiziana; queda en zonas)');
    ok(!P({ step: 'ambientes', zonas: ['z_palermo'] }, txt('dos ambientes')).mensajes.find((m) => m.tipo === 'cta'), '21.no falso positivo con ambientes (no Tiziana)');
    // Media (foto/audio) NO dispara el handoff a humano.
    ok(!P({ step: 'ambientes', zonas: ['z_palermo'] }, media('image')).mensajes.find((m) => m.tipo === 'cta'), '21.foto no dispara handoff');
  }

  // ---------- 22. Audio/foto -> "escribime" (nuevo -> saluda; fin -> silencio) ----------
  console.log('22) Audio/foto -> pedir que escriba por mensaje');
  {
    const media = (t) => ({ tipo: 'media', id: null, texto: '', media: t });
    // Usuario nuevo manda foto -> lo saludamos igual (onboarding).
    ok(P({}, media('image')).estado.step === 'intencion', '22.usuario nuevo + foto -> saluda');
    // Mid-flow: pide que escriba y NO avanza de paso.
    const r = P({ step: 'ambientes', zonas: ['z_palermo'] }, media('image'));
    ok(/me escribas/i.test(texto1(r)) && /Nos entendemos mejor por mensaje/.test(texto1(r)), '22.foto mid-flow -> texto exacto');
    ok(r.estado.step === 'ambientes', '22.foto no avanza de paso');
    const ra = P({ step: 'presupuesto', zonas: ['z_palermo'], ambientes: 'amb_1' }, media('audio'));
    ok(/me escribas/i.test(texto1(ra)) && ra.estado.step === 'presupuesto', '22.audio -> escribime, no avanza');
    // En 'fin' -> silencio (Tiziana ya está atendiendo).
    ok(P({ step: 'fin' }, media('image')).mensajes.length === 0, '22.fin + foto -> silencio');
  }

  // ---------- 23. parseBarriosConNegacion: "todo menos X" (función; queda para Flows/fallback) ----------
  console.log('23) parseBarriosConNegacion: "todo menos X" -> todas MENOS esas');
  {
    const NEG = (t) => parseBarriosConNegacion(t);
    // Caso Lucas Serra: "Todo menos puerto madero y zona norte" -> 9 zonas
    let z = NEG('Todo menos puerto madero y zona norte');
    ok(!z.includes('z_madero') && !z.includes('z_norte') && z.includes('z_palermo') && z.length === 9, '23.todo menos madero/norte -> 9 zonas');
    // Caso Maxi: "Todo menos centro retiro, pto madero" -> 8 zonas
    z = NEG('Todo menos centro retiro, pto madero');
    ok(z.length === 8 && !z.includes('z_centro') && !z.includes('z_retiro') && !z.includes('z_madero'), '23.excluye centro/retiro/madero (8 zonas)');
    ok(NEG('cualquiera').length === 11, '23.cualquiera -> 11 zonas');
    ok(NEG('me da igual el barrio').length === 11, '23.me da igual -> todas');
    z = NEG('menos palermo');
    ok(z.length === 10 && !z.includes('z_palermo'), '23.menos palermo -> 10 zonas');
    ok(NEG('todo menos caballito').length === 11, '23.todo menos <no-barrio> -> todas');
    ok(NEG('palermo y recoleta').length === 2, '23.normal -> 2 zonas');
  }

  // ---------- 24. Pregunta filtro comprar/alquilar ----------
  console.log('24) Filtro compra/alquiler: compra -> venta futura; alquiler -> zonas');
  {
    // Saludo arranca en 'intencion'
    let r = P({}, txt('hola'));
    ok(r.estado.step === 'intencion' && r.mensajes[1].tipo === 'botones' && /comprar o alquilar/i.test(r.mensajes[1].texto), '24.saludo pregunta compra/alquiler');
    // COMPRAR (botón) -> mensaje de venta futura + botón de Instagram + fin, sin arrastrarlo al funnel
    let rc = P(r.estado, op('int_comprar'));
    ok(rc.estado.step === 'fin' && /todavía no tenemos propiedades en venta/i.test(texto1(rc)), '24.comprar -> mensaje venta futura + fin');
    const igCta = rc.mensajes.find((m) => m.tipo === 'cta' && /instagram\.com\/grupobairen/.test(m.url || ''));
    ok(igCta, '24.venta incluye botón de Instagram @grupobairen');
    // COMPRAR por texto ("es para comprar", "para la venta", "soy inversor")
    ok(P({ step: 'intencion' }, txt('es para comprar')).estado.step === 'fin', '24.texto "comprar" -> venta');
    ok(P({ step: 'intencion' }, txt('para la venta, soy inversor')).estado.step === 'fin', '24.texto "venta/inversor" -> venta');
    // ALQUILAR (botón) -> lista de zonas
    let ra = P(r.estado, op('int_alquilar'));
    ok(ra.estado.step === 'zona_flow' && ra.mensajes[0].tipo === 'lista' && ra.mensajes[0].filas.length === 4, '24.alquilar -> lista de 4 zonas');
    // ALQUILAR por texto
    ok(P({ step: 'intencion' }, txt('quiero alquilar')).estado.step === 'zona_flow', '24.texto "alquilar" -> zonas');
    ok(P({ step: 'intencion' }, txt('alquiler temporal')).estado.step === 'zona_flow', '24.texto "alquiler temporal" -> zonas');
    // "alquilar no comprar" -> gana alquilar (es el negocio)
    ok(P({ step: 'intencion' }, txt('alquilar, no comprar')).estado.step === 'zona_flow', '24.ambiguo con "alquilar" -> zonas');
    // Basura -> reintento sin avanzar
    ok(P({ step: 'intencion' }, txt('asdkj')).estado.step === 'intencion' && /una de las opciones/i.test(texto1(P({ step: 'intencion' }, txt('asdkj')))), '24.basura -> reintento');
    // Pedido de humano en intención sigue derivando a Tiziana
    ok(P({ step: 'intencion' }, txt('quiero hablar con una persona real')).mensajes.find((m) => m.tipo === 'cta'), '24.humano en intencion -> Tiziana');
  }

  // ---------- 25. Grupo de zonas -> lo acumula y ofrece sumar otra (multi-zona) ----------
  console.log('25) Grupos de zonas: tocar un grupo lo acumula + pregunta si suma otra');
  {
    for (const g of GRUPOS) {
      const r = P({ step: 'zona_flow', zonas: [] }, op(g.id));
      ok(r.estado.step === 'zona_mas' && g.zonas.every((z) => r.estado.zonas.includes(z)) && r.estado.zonas.length === g.zonas.length, `25.grupo ${g.id} -> acumula ${g.zonas.length} zonas`);
      ok(r.mensajes[0].tipo === 'botones' && r.mensajes[0].botones.some((b) => b.id === 'zona_go'), `25.grupo ${g.id} -> botones sumar/seguir`);
    }
    // Los 11 barrios están cubiertos por los 4 grupos, sin repetir
    const cubiertos = GRUPOS.flatMap((g) => g.zonas);
    ok(cubiertos.length === 11 && new Set(cubiertos).size === 11 && ZONAS.every((z) => cubiertos.includes(z.id)), '25.los 4 grupos cubren los 11 barrios sin repetir');
    // Los títulos y descripciones entran en los límites de WhatsApp (24 / 72)
    ok(GRUPOS.every((g) => g.titulo.length <= 24 && g.desc.length <= 72), '25.titulos<=24 y desc<=72 (limites WhatsApp)');
  }

  // ---------- 26. Tiempo: SOLO botón (el texto ya no avanza) ----------
  console.log('26) Tiempo solo-botón (texto NO avanza)');
  {
    ok(parseTiempoTexto('01 de octubre') === 't_fecha', '26.parseTiempo fecha (función)');
    ok(parseTiempoTexto('en 3 meses') === 't_pronto', '26.parseTiempo plazo (función)');
    const base = { step: 'tiempo', zonas: ['z_palermo'], ambientes: 'amb_2' };
    ok(P(base, txt('01 de octubre')).estado.step === 'tiempo', '26.texto en tiempo NO avanza');
    ok(P(base, op('t_ya')).estado.step === 'presupuesto', '26.botón en tiempo SÍ avanza');
  }

  // ---------- 27. "El del anuncio / este depto" -> directo a Tiziana (#1b) ----------
  console.log('27) "El del anuncio / este depto" -> Tiziana');
  {
    const aTiziana = (r) => r.mensajes.find((m) => m.tipo === 'cta' && /wa\.me\/5491123106629/.test(m.url || ''));
    // Desde el paso intención (no primer mensaje), varios fraseos reales
    const casos = [
      'me interesa el del anuncio',            // Paul
      'quería consultar por este en particular', // HL
      'me interesa el del reel',
      'quiero info de este depto',
      'el que vi en instagram',
      'la unidad sobre la que te consulté',    // Abie
    ];
    for (const c of casos) {
      const r = P({ step: 'intencion' }, txt(c));
      ok(aTiziana(r) && r.estado.step === 'fin', `27."${c}" -> Tiziana + fin`);
    }
    // Prefill con contexto del anuncio
    ok(/Vengo del anuncio/.test(decodeURIComponent(aTiziana(P({ step: 'intencion' }, txt('el del anuncio'))).url)), '27.prefill menciona el anuncio');
    // NO en el PRIMER mensaje: al lead nuevo lo saluda igual (no manda toda la campaña a Tiziana)
    ok(P({}, txt('quiero mas informacion sobre este depo')).estado.step === 'intencion', '27.primer msg "este depo" -> saluda (no Tiziana)');
    // NO falso positivo con el CTWA genérico ni inputs del funnel
    ok(!pideAnuncio('quiero mas informacion'), '27.generico "mas informacion" NO dispara');
    ok(!pideAnuncio('busco en palermo y recoleta'), '27.barrios NO disparan');
    ok(!pideAnuncio('2 ambientes hasta 1500'), '27.ambientes/presupuesto NO disparan');
    // Compra puntual del anuncio -> gana el filtro de VENTA (mensaje de venta), no Tiziana
    ok(!pideAnuncio('quiero comprar el triplex del anuncio'), '27.si dice comprar/venta -> lo maneja el filtro de venta');
    const rv = P({ step: 'intencion' }, txt('quiero comprar el del anuncio'));
    ok(rv.estado.step === 'fin' && /no tenemos propiedades en venta/i.test(texto1(rv)), '27.compra del anuncio -> mensaje de venta (no Tiziana)');
  }

  // ---------- 28. Multi-zona: 1 chance de sumar; con 2 zonas -> directo a ambientes ----------
  console.log('28) Multi-zona: 1ra zona -> ¿sumás otra?; 2da zona -> directo a ambientes');
  {
    let r = P({ step: 'zona_flow', zonas: [] }, op('g_palermo'));
    ok(r.estado.step === 'zona_mas' && r.estado.zonas.length === 4, '28.1ra zona -> ¿sumás otra? (4 zonas)');
    // "Agregar otra zona" -> mensaje DISTINTO (no repite el saludo) que nombra lo ya elegido
    r = P(r.estado, op('zona_add'));
    ok(r.estado.step === 'zona_flow' && r.mensajes[0].tipo === 'lista' && r.estado.zonas.length === 4, '28.agregar otra -> lista, no pierde las elegidas');
    ok(/Perfecto\. ¿Qué zona te gustaría sumar además de Palermo y Recoleta\?/.test(r.mensajes[0].texto), '28.mensaje "sumar además de Palermo y Recoleta" (no repite el saludo)');
    ok(!r.mensajes[0].filas.some((f) => f.id === 'g_palermo'), '28.la lista de "sumar" NO reofrece el grupo ya elegido');
    // 2da zona -> DIRECTO a ambientes (NO vuelve a preguntar)
    r = P(r.estado, op('g_belgrano'));
    ok(r.estado.step === 'ambientes' && r.estado.zonas.length === 7, '28.2da zona -> directo a ambientes (7 zonas, sin re-preguntar)');
    // Camino corto: 1ra zona -> Seguir -> ambientes (1 zona)
    let r2 = P({ step: 'zona_flow', zonas: [] }, op('g_norte'));
    r2 = P(r2.estado, op('zona_go'));
    ok(r2.estado.step === 'ambientes' && r2.estado.zonas.length === 1, '28.1ra zona -> Seguir -> ambientes (1 zona)');
    // En zona_mas, tocar otro grupo directo (botón viejo) también va directo a ambientes
    const r3 = P({ step: 'zona_mas', zonas: ['z_palermo', 'z_recoleta', 'z_villacrespo', 'z_almagro'] }, op('g_belgrano'));
    ok(r3.estado.step === 'ambientes' && r3.estado.zonas.length === 7 && new Set(r3.estado.zonas).size === 7, '28.zona_mas + tap grupo -> ambientes directo (sin duplicar)');
    // Texto en zona_mas -> pide usar botón
    ok(/una de las opciones/i.test(texto1(P({ step: 'zona_mas', zonas: ['z_palermo'] }, txt('dale')))), '28.texto en zona_mas -> pide botón');
    // "Seguir" sin zonas (defensivo) -> vuelve a la lista
    ok(P({ step: 'zona_mas', zonas: [] }, op('zona_go')).estado.step === 'zona_flow', '28.seguir sin zonas -> vuelve a la lista');
  }

  console.log('\n=========================================');
  console.log(`RESULTADO: ${PASS} OK, ${FAIL} fallas`);
  console.log('=========================================');
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
