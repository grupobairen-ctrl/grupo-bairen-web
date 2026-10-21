/* BAIREN · Coordinar visita (21/10/2026)
   Antes había dos botones que terminaban en WhatsApp ("Consultar por
   WhatsApp" y "Coordinar visita", que llevaba a un cuestionario de 5
   preguntas) y la gente no sabía cuál tocar. Ahora hay uno solo: se elige
   la duración del contrato y el botón abre WhatsApp con el mensaje escrito.
   El modelo de BAIREN es de 3 a 12 meses, todo incluido (Tomás, 21/10/2026).
   12 meses va en verde y, al elegirlo, avisa el beneficio: honorarios
   preferenciales (menos comisión con el contrato largo, dicho en tono premium).
   El mensaje pide conocerlos.
   En la ficha, los meses salen del plazo cargado en el admin: "3-12 meses"
   muestra 3, 6 y 12; "12-24 meses" (Álvarez Thomas 800, la excepción), solo
   12 y 24 y sin verde, porque el beneficio es frente a los contratos cortos.

   - La ficha avisa la unidad con BairenVisita.setUnidad({...}) y monta el
     formulario adentro de su tarjeta con BairenVisita.mount(el).
   - data-visita (la barra fija del celular) abre ese mismo formulario en una
     ventana. Lo elegido se ve igual en los dos.
   - data-busqueda ("¿Qué estás buscando?", arriba en todas las páginas) abre
     la búsqueda: barrio, ambientes, presupuesto y duración, todo opcional,
     para que el equipo le pase opciones por WhatsApp.
   - El botón final es un link a wa.me: meta-pixel.js lo cuenta como Contact
     igual que cualquier otro WhatsApp de la web. */
(function () {
  'use strict';
  var WA = '5491123106629';
  var MESES = [3, 6, 12, 24];
  var CON_BENEFICIOS = [12, 24];
  var BARRIOS = ['Recoleta', 'Palermo', 'Núñez', 'Puerto Madero', 'Belgrano', 'Colegiales'];
  var AMBS = ['1', '2', '3', '4'];
  var PRESUS = ['p1', 'p2', 'p3', 'p4'];

  var T = {
    es: {
      eyebrow: 'Coordinar visita', duracion: 'Duración del contrato', meses: '{n} meses',
      beneficios: 'Honorarios preferenciales',
      btn: 'Coordinar visita', cerrar: 'Cerrar',
      nota: 'Te respondemos en menos de 10 minutos.',
      msg: 'Hola, quiero coordinar una visita a {u}.', m_duracion: 'Duración del contrato: {n} meses.',
      m_beneficios: 'Me gustaría conocer los honorarios preferenciales.',
      b_title: '¿Qué estás buscando?', b_sub: 'Contanos y te mandamos por WhatsApp las opciones que encajan.',
      barrio: 'Barrio', amb: 'Ambientes', presu: 'Presupuesto por mes', opcional: 'opcional',
      a1: 'Mono', a2: '2', a3: '3', a4: '4 o más',
      p1: 'Hasta USD 1.000', p2: 'USD 1.000 a 1.500', p3: 'USD 1.500 a 2.500', p4: 'Más de USD 2.500',
      b_btn: 'Enviar por WhatsApp',
      b_msg: 'Hola, estoy buscando departamento.', b_cierre: 'Me pasan opciones?',
      m_barrio: 'Barrio: {v}', m_amb: 'Ambientes: {v}', m_presu: 'Presupuesto: {v} por mes', m_y: ' o '
    },
    pt: {
      eyebrow: 'Agendar visita', duracion: 'Duração do contrato', meses: '{n} meses',
      beneficios: 'Honorários preferenciais',
      btn: 'Agendar visita', cerrar: 'Fechar',
      nota: 'Respondemos em menos de 10 minutos.',
      msg: 'Olá, quero agendar uma visita a {u}.', m_duracion: 'Duração do contrato: {n} meses.',
      m_beneficios: 'Gostaria de conhecer os honorários preferenciais.',
      b_title: 'O que você procura?', b_sub: 'Conte para nós e enviamos pelo WhatsApp as opções que combinam.',
      barrio: 'Bairro', amb: 'Ambientes', presu: 'Orçamento por mês', opcional: 'opcional',
      a1: 'Studio', a2: '2', a3: '3', a4: '4 ou mais',
      p1: 'Até USD 1.000', p2: 'USD 1.000 a 1.500', p3: 'USD 1.500 a 2.500', p4: 'Mais de USD 2.500',
      b_btn: 'Enviar pelo WhatsApp',
      b_msg: 'Olá, estou procurando apartamento.', b_cierre: 'Podem me enviar opções?',
      m_barrio: 'Bairro: {v}', m_amb: 'Ambientes: {v}', m_presu: 'Orçamento: {v} por mês', m_y: ' ou '
    },
    en: {
      eyebrow: 'Book a viewing', duracion: 'Contract length', meses: '{n} months',
      beneficios: 'Preferential agency fees',
      btn: 'Book a viewing', cerrar: 'Close',
      nota: 'We reply in under 10 minutes.',
      msg: 'Hi, I would like to book a viewing at {u}.', m_duracion: 'Contract length: {n} months.',
      m_beneficios: 'I would like to know about the preferential fees.',
      b_title: 'What are you looking for?', b_sub: 'Tell us and we send you the options that fit on WhatsApp.',
      barrio: 'Neighbourhood', amb: 'Rooms', presu: 'Monthly budget', opcional: 'optional',
      a1: 'Studio', a2: '2', a3: '3', a4: '4+',
      p1: 'Up to USD 1,000', p2: 'USD 1,000 to 1,500', p3: 'USD 1,500 to 2,500', p4: 'Over USD 2,500',
      b_btn: 'Send on WhatsApp',
      b_msg: 'Hi, I am looking for an apartment.', b_cierre: 'Could you send me some options?',
      m_barrio: 'Neighbourhood: {v}', m_amb: 'Rooms: {v}', m_presu: 'Budget: {v} per month', m_y: ' or '
    }
  };
  function t() { return T[window.BAIREN_LANG] || T.es; }

  var unidad = null;      // { ref, titulo, sub } o null
  var meses = 0;          // duración elegida (0 = ninguna)
  var busca = { barrio: [], amb: '', presu: '' };   // la búsqueda (barrio admite varios)
  var modo = 'unidad';    // qué muestra la ventana: 'unidad' o 'busqueda'
  var forms = [];         // formularios montados (ventana + tarjeta de la ficha)
  var dlg = null;

  var ICO_OK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l4.5 4.5L19.5 7"/></svg>';
  var ICO_WA = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.83.736 5.487 2.023 7.793L0 32l8.438-2.01A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.278 13.278 0 01-6.77-1.848l-.484-.287-5.013 1.195 1.228-4.88-.317-.502A13.278 13.278 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.3-9.96c-.4-.2-2.363-1.166-2.728-1.3-.366-.133-.633-.2-.9.2-.266.4-1.033 1.3-1.266 1.566-.233.267-.466.3-.866.1-2.367-1.183-3.917-2.117-5.475-4.8-.413-.712.413-.663 1.183-2.202.133-.267.067-.5-.033-.7-.1-.2-.9-2.163-1.233-2.963-.324-.778-.653-.672-.9-.685l-.767-.013a1.47 1.47 0 00-1.067.5c-.366.4-1.4 1.367-1.4 3.33s1.434 3.863 1.634 4.13c.2.267 2.823 4.312 6.837 6.05 2.54 1.097 3.534 1.19 4.804.999.773-.115 2.363-.966 2.696-1.9.333-.933.333-1.733.233-1.9-.1-.166-.366-.266-.766-.466z"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // El plazo del admin es texto libre: "3-12 meses", "3 a 12 meses",
  // "12 - 24 meses", "12 meses", "A partir de 6 meses", "1 a 2 años"...
  // Sin dato, el plazo de BAIREN: de 3 a 12 meses.
  function rangoPlazo(txt) {
    var s = String(txt || '').toLowerCase();
    var x = /a[ñn]os?/.test(s) && !/mes/.test(s) ? 12 : 1;
    var n = (s.match(/\d+/g) || []).slice(0, 2).map(function (v) { return +v * x; });
    if (!n.length) return { min: 3, max: 12 };
    if (n.length === 1) return /partir|desde|m[ií]n/.test(s) ? { min: n[0], max: Math.max(n[0], 12) } : { min: n[0], max: n[0] };
    return { min: Math.min(n[0], n[1]), max: Math.max(n[0], n[1]) };
  }
  // Los botones de duración que van: los de siempre dentro del plazo, más el
  // mínimo y el máximo si son otros (ej. "6-18 meses" → 6, 12 y 18)
  function opciones(m) {
    // La búsqueda ofrece el plazo de BAIREN: de 3 a 12 meses
    var r = m === 'busqueda' || !unidad ? rangoPlazo('') : unidad.rango, o = MESES.filter(function (n) { return n >= r.min && n <= r.max; });
    if (o.indexOf(r.min) === -1) o.push(r.min);
    if (o.indexOf(r.max) === -1) o.push(r.max);
    return o.sort(function (a, b) { return a - b; });
  }
  // Verde y "Honorarios preferenciales" solo si la unidad también tiene contratos cortos
  function conBeneficios(m, n) {
    return CON_BENEFICIOS.indexOf(n) !== -1 && opciones(m)[0] < 12;
  }

  function lineaDuracion(L, m) {
    if (!meses || opciones(m).indexOf(meses) === -1) return '';
    return L.m_duracion.replace('{n}', meses) + (conBeneficios(m, meses) ? ' ' + L.m_beneficios : '');
  }
  function mensaje(m) {
    var L = t(), lineas;
    if (m === 'busqueda') {
      lineas = [L.b_msg];
      if (busca.barrio.length) lineas.push(L.m_barrio.replace('{v}', busca.barrio.join(L.m_y)));
      if (busca.amb) lineas.push(L.m_amb.replace('{v}', L['a' + busca.amb]));
      if (busca.presu) lineas.push(L.m_presu.replace('{v}', L[busca.presu]));
      if (lineaDuracion(L, m)) lineas.push(lineaDuracion(L, m));
      lineas.push(L.b_cierre);
    } else {
      lineas = [L.msg.replace('{u}', unidad ? unidad.ref : 'BAIREN')];
      if (lineaDuracion(L, m)) lineas.push(lineaDuracion(L, m));
    }
    return lineas.join('\n');
  }
  function waHref(m) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(mensaje(m)); }

  function chip(g, v, txt, extra) {
    return '<button type="button" class="vis-chip' + (extra || '') + '" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="false">' + esc(txt) + '</button>';
  }
  function grupo(lbl, opc, chips, cls) {
    return '<div class="vis-field"><span class="vis-lbl">' + esc(lbl) + (opc ? '<small>' + esc(opc) + '</small>' : '') + '</span>'
      + '<div class="vis-chips' + (cls || '') + '" role="group" aria-label="' + esc(lbl) + '">' + chips + '</div>';
  }

  function htmlForm(m) {
    var L = t(), h = '';
    if (m === 'busqueda') {
      h += grupo(L.barrio, L.opcional, BARRIOS.map(function (b) { return chip('barrio', b, b); }).join('')) + '</div>'
        + grupo(L.amb, L.opcional, AMBS.map(function (a) { return chip('amb', a, L['a' + a]); }).join(''), ' vis-chips--meses') + '</div>'
        + grupo(L.presu, L.opcional, PRESUS.map(function (k) { return chip('presu', k, L[k]); }).join('')) + '</div>';
    }
    h += grupo(L.duracion, m === 'busqueda' ? L.opcional : '', opciones(m).map(function (n) {
        return chip('meses', n, L.meses.replace('{n}', n), conBeneficios(m, n) ? ' vis-chip--plus' : '');
      }).join(''), ' vis-chips--meses')
      + '<p class="vis-plus" aria-live="polite"></p></div>'
      + '<a class="vis-btn" href="' + esc(waHref(m)) + '" target="_blank" rel="noopener noreferrer">' + ICO_WA
      + '<span>' + esc(m === 'busqueda' ? L.b_btn : L.btn) + '</span></a>'
      + '<p class="vis-nota">' + esc(L.nota) + '</p>';
    return h;
  }

  // Deja cada formulario montado igual que lo elegido (ventana y tarjeta van juntas)
  function sync() {
    forms.forEach(function (f) {
      var plus = conBeneficios(f.dataset.modo, meses) ? t().beneficios.replace('{n}', meses) : '';
      f.querySelectorAll('.vis-chip').forEach(function (c) {
        var g = c.dataset.g, v = c.dataset.v;
        var on = g === 'meses' ? String(meses) === v : g === 'barrio' ? busca.barrio.indexOf(v) !== -1 : busca[g] === v;
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var p = f.querySelector('.vis-plus');
      if (p) {
        p.innerHTML = plus ? ICO_OK + '<span>' + esc(plus) + '</span>' : '';
        p.classList.toggle('on', !!plus);
      }
      var a = f.querySelector('.vis-btn');
      if (a) a.href = waHref(f.dataset.modo);
    });
  }

  // Un solo escuchador por formulario (sobrevive al cambio de idioma, que
  // vuelve a escribir el contenido)
  function onClick(e) {
    var c = e.target.closest('.vis-chip');
    if (c) {
      var g = c.dataset.g, v = c.dataset.v;
      if (g === 'meses') meses = String(meses) === v ? 0 : +v;
      else if (g === 'barrio') {
        var i = busca.barrio.indexOf(v);
        if (i === -1) busca.barrio.push(v); else busca.barrio.splice(i, 1);
      } else busca[g] = busca[g] === v ? '' : v;
      sync();
      return;
    }
    if (e.target.closest('.vis-btn') && dlg && dlg.open && dlg.contains(e.currentTarget)) setTimeout(cerrar, 300);
  }

  function vivos() { forms = forms.filter(function (f) { return f.isConnected; }); }

  function mount(el, m) {
    if (!el) return;
    el.classList.add('vis-form');
    el.dataset.modo = m || el.dataset.modo || 'unidad';
    // La ficha reescribe su tarjeta al cambiar de idioma: lo que quedó fuera de la página se suelta
    vivos();
    if (forms.indexOf(el) === -1) forms.push(el);
    if (!el._vis) { el.addEventListener('click', onClick); el._vis = true; }
    el.innerHTML = htmlForm(el.dataset.modo);
    sync();
  }

  function cabecera() {
    var L = t();
    var b = modo === 'busqueda';
    dlg.querySelector('.vis-eyebrow').textContent = b ? 'BAIREN' : L.eyebrow;
    dlg.querySelector('.vis-title').textContent = b ? L.b_title : (unidad ? unidad.titulo : 'BAIREN');
    dlg.querySelector('.vis-sub').textContent = b ? L.b_sub : (unidad ? (unidad.sub || '') : '');
    dlg.querySelector('.vis-x').setAttribute('aria-label', L.cerrar);
  }

  function crear() {
    dlg = document.createElement('dialog');
    dlg.className = 'vis-dlg';
    dlg.setAttribute('aria-labelledby', 'visTitle');
    dlg.innerHTML = '<div class="vis-hd"><div class="vis-eyebrow"></div><h2 class="vis-title" id="visTitle"></h2><p class="vis-sub"></p>'
      + '<button type="button" class="vis-x">×</button></div><div class="vis-form"></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.vis-x').addEventListener('click', cerrar);
    // Tocar afuera de la ventana la cierra
    dlg.addEventListener('click', function (e) { if (e.target === dlg) cerrar(); });
    dlg.addEventListener('close', function () { document.documentElement.style.overflow = ''; });
  }

  function abrir(m) {
    modo = m === 'busqueda' ? 'busqueda' : 'unidad';
    if (!dlg) crear();
    cabecera();
    mount(dlg.querySelector('.vis-form'), modo);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.style.overflow = 'hidden';
  }
  function cerrar() {
    if (!dlg) return;
    if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else dlg.removeAttribute('open');
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-visita],[data-busqueda]');
    if (!b) return;
    e.preventDefault();
    abrir(b.hasAttribute('data-busqueda') ? 'busqueda' : 'unidad');
  });

  document.addEventListener('bairen:lang', function () {
    vivos();
    forms.forEach(function (f) { mount(f); });
    if (dlg) cabecera();
  });

  window.BairenVisita = {
    open: abrir,
    close: cerrar,
    mount: mount,
    // El catálogo arma su etiqueta ("De 3 a 12 meses") con el mismo lector del plazo
    rango: rangoPlazo,
    setUnidad: function (u) {
      unidad = u ? Object.assign({}, u, { rango: rangoPlazo(u.plazo) }) : null;
      // Cambian los meses que se ofrecen: se vuelven a escribir los formularios
      vivos();
      forms.forEach(function (f) { mount(f); });
      if (dlg) cabecera();
    }
  };
})();
