/* BAIREN · Coordinar visita (21/10/2026)
   Antes había dos botones que terminaban en WhatsApp ("Consultar por
   WhatsApp" y "Coordinar visita", que llevaba a un cuestionario de 5
   preguntas) y la gente no sabía cuál tocar. Ahora hay uno solo, con la
   misma lógica que una reserva: Llegada y Estadía, y el botón abre WhatsApp
   con el mensaje escrito. Si no hay una unidad (inicio, catálogo) se suman
   Barrio y Presupuesto, opcionales.

   - Cualquier elemento con data-visita abre la ventana.
   - La ficha avisa la unidad con BairenVisita.setUnidad({...}) y monta el
     mismo formulario adentro de su tarjeta con BairenVisita.mount(el).
   - El botón final es un link a wa.me: meta-pixel.js lo cuenta como Contact
     igual que cualquier otro WhatsApp de la web. */
(function () {
  'use strict';
  var WA = '5491123106629';
  var MESES = [3, 6, 12, 24];
  var BARRIOS = ['Recoleta', 'Palermo', 'Núñez', 'Puerto Madero', 'Belgrano'];
  var PRESUS = ['p1', 'p2', 'p3', 'p4'];

  var T = {
    es: {
      eyebrow: 'Coordinar visita', gen_title: 'Contanos qué buscás',
      gen_sub: 'Te pasamos las unidades que encajan y coordinamos la visita.',
      llegada: 'Llegada', estadia: 'Estadía', barrio: 'Barrio', presupuesto: 'Presupuesto por mes', opcional: 'opcional',
      fecha_ph: 'Elegí una fecha', meses: '{n} meses', cualquiera: 'Cualquiera',
      p1: 'Hasta USD 1.000', p2: 'USD 1.000 a 1.500', p3: 'USD 1.500 a 2.500', p4: 'Más de USD 2.500',
      btn: 'Coordinar visita', cerrar: 'Cerrar',
      nota: 'Se abre WhatsApp con tu mensaje listo. Te responde una persona del equipo.',
      msg_u: 'Hola, quiero coordinar una visita a {u}.', msg_g: 'Hola, quiero coordinar una visita.',
      m_llegada: 'Llegada: {v}', m_estadia: 'Estadía: {v}', m_barrio: 'Barrio: {v}', m_presu: 'Presupuesto: {v} por mes',
      locale: 'es-AR'
    },
    pt: {
      eyebrow: 'Agendar visita', gen_title: 'Conte o que você procura',
      gen_sub: 'Enviamos as unidades que combinam com você e agendamos a visita.',
      llegada: 'Chegada', estadia: 'Estadia', barrio: 'Bairro', presupuesto: 'Orçamento por mês', opcional: 'opcional',
      fecha_ph: 'Escolha uma data', meses: '{n} meses', cualquiera: 'Qualquer um',
      p1: 'Até USD 1.000', p2: 'USD 1.000 a 1.500', p3: 'USD 1.500 a 2.500', p4: 'Mais de USD 2.500',
      btn: 'Agendar visita', cerrar: 'Fechar',
      nota: 'O WhatsApp abre com a sua mensagem pronta. Quem responde é uma pessoa da equipe.',
      msg_u: 'Olá, quero agendar uma visita a {u}.', msg_g: 'Olá, quero agendar uma visita.',
      m_llegada: 'Chegada: {v}', m_estadia: 'Estadia: {v}', m_barrio: 'Bairro: {v}', m_presu: 'Orçamento: {v} por mês',
      locale: 'pt-BR'
    },
    en: {
      eyebrow: 'Book a viewing', gen_title: 'Tell us what you need',
      gen_sub: 'We send you the units that fit and book the viewing.',
      llegada: 'Move-in', estadia: 'Stay', barrio: 'Neighbourhood', presupuesto: 'Monthly budget', opcional: 'optional',
      fecha_ph: 'Pick a date', meses: '{n} months', cualquiera: 'Any',
      p1: 'Up to USD 1,000', p2: 'USD 1,000 to 1,500', p3: 'USD 1,500 to 2,500', p4: 'Over USD 2,500',
      btn: 'Book a viewing', cerrar: 'Close',
      nota: 'WhatsApp opens with your message ready. A person from our team replies.',
      msg_u: 'Hi, I would like to book a viewing at {u}.', msg_g: 'Hi, I would like to book a viewing.',
      m_llegada: 'Move-in: {v}', m_estadia: 'Stay: {v}', m_barrio: 'Neighbourhood: {v}', m_presu: 'Budget: {v} per month',
      locale: 'en-US'
    }
  };
  function t() { return T[window.BAIREN_LANG] || T.es; }

  var unidad = null;      // { ref, titulo, sub, desde:'AAAA-MM-DD' } o null
  var estado = { llegada: '', estadia: 0, barrio: '', presu: '' };
  var forms = [];         // formularios montados (ventana + tarjeta de la ficha)
  var dlg = null;

  var ICO_CAL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  var ICO_WA = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.83.736 5.487 2.023 7.793L0 32l8.438-2.01A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.278 13.278 0 01-6.77-1.848l-.484-.287-5.013 1.195 1.228-4.88-.317-.502A13.278 13.278 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.3-9.96c-.4-.2-2.363-1.166-2.728-1.3-.366-.133-.633-.2-.9.2-.266.4-1.033 1.3-1.266 1.566-.233.267-.466.3-.866.1-2.367-1.183-3.917-2.117-5.475-4.8-.413-.712.413-.663 1.183-2.202.133-.267.067-.5-.033-.7-.1-.2-.9-2.163-1.233-2.963-.324-.778-.653-.672-.9-.685l-.767-.013a1.47 1.47 0 00-1.067.5c-.366.4-1.4 1.367-1.4 3.33s1.434 3.863 1.634 4.13c.2.267 2.823 4.312 6.837 6.05 2.54 1.097 3.534 1.19 4.804.999.773-.115 2.363-.966 2.696-1.9.333-.933.333-1.733.233-1.9-.1-.166-.366-.266-.766-.466z"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function deIso(v) {
    var x = String(v || '').split('-');
    return x.length === 3 ? new Date(+x[0], +x[1] - 1, +x[2]) : null;
  }
  // La primera llegada posible: hoy, o el día que se libera la unidad
  function minLlegada() {
    var hoy = iso(new Date());
    return unidad && unidad.desde && unidad.desde > hoy ? unidad.desde : hoy;
  }
  function fechaTxt(v) {
    var d = deIso(v);
    if (!d) return '';
    var o = { day: 'numeric', month: 'long' };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
    return d.toLocaleDateString(t().locale, o);
  }

  function mensaje() {
    var L = t(), lineas = [];
    lineas.push(unidad ? L.msg_u.replace('{u}', unidad.ref) : L.msg_g);
    if (estado.llegada) lineas.push(L.m_llegada.replace('{v}', fechaTxt(estado.llegada)));
    if (estado.estadia) lineas.push(L.m_estadia.replace('{v}', L.meses.replace('{n}', estado.estadia)));
    if (!unidad && estado.barrio) lineas.push(L.m_barrio.replace('{v}', estado.barrio === '*' ? L.cualquiera : estado.barrio));
    if (!unidad && estado.presu) lineas.push(L.m_presu.replace('{v}', L[estado.presu]));
    return lineas.join('\n');
  }
  function waHref() { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(mensaje()); }

  function chip(grupo, valor, txt) {
    return '<button type="button" class="vis-chip" data-g="' + grupo + '" data-v="' + esc(valor) + '" aria-pressed="false">' + esc(txt) + '</button>';
  }

  function htmlForm() {
    var L = t();
    var h = ''
      + '<div class="vis-field"><span class="vis-lbl">' + esc(L.llegada) + '</span>'
      + '<label class="vis-date">' + ICO_CAL + '<span class="vis-date-txt">' + esc(L.fecha_ph) + '</span>'
      + '<input type="date" aria-label="' + esc(L.llegada) + '"></label></div>'
      + '<div class="vis-field"><span class="vis-lbl">' + esc(L.estadia) + '</span><div class="vis-chips vis-chips--meses" role="group" aria-label="' + esc(L.estadia) + '">'
      + MESES.map(function (n) { return chip('estadia', n, L.meses.replace('{n}', n)); }).join('')
      + '</div></div>';
    if (!unidad) {
      h += '<div class="vis-field"><span class="vis-lbl">' + esc(L.barrio) + '<small>' + esc(L.opcional) + '</small></span><div class="vis-chips" role="group" aria-label="' + esc(L.barrio) + '">'
        + BARRIOS.map(function (b) { return chip('barrio', b, b); }).join('') + chip('barrio', '*', L.cualquiera)
        + '</div></div>'
        + '<div class="vis-field"><span class="vis-lbl">' + esc(L.presupuesto) + '<small>' + esc(L.opcional) + '</small></span><div class="vis-chips" role="group" aria-label="' + esc(L.presupuesto) + '">'
        + PRESUS.map(function (k) { return chip('presu', k, L[k]); }).join('')
        + '</div></div>';
    }
    h += '<a class="vis-btn" href="' + esc(waHref()) + '" target="_blank" rel="noopener noreferrer">' + ICO_WA + '<span>' + esc(L.btn) + '</span></a>'
      + '<p class="vis-nota">' + esc(L.nota) + '</p>';
    return h;
  }

  // Deja cada formulario montado igual que el estado (ventana y tarjeta van juntas)
  function sync() {
    forms.forEach(function (f) {
      var inp = f.querySelector('.vis-date input');
      if (inp) {
        inp.min = minLlegada();
        if (inp.value !== estado.llegada) inp.value = estado.llegada;
        var box = inp.parentNode;
        box.classList.toggle('has-val', !!estado.llegada);
        box.querySelector('.vis-date-txt').textContent = estado.llegada ? fechaTxt(estado.llegada) : t().fecha_ph;
      }
      f.querySelectorAll('.vis-chip').forEach(function (c) {
        var g = c.dataset.g, v = c.dataset.v;
        var on = g === 'estadia' ? String(estado.estadia) === v : estado[g] === v;
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var a = f.querySelector('.vis-btn');
      if (a) a.href = waHref();
    });
  }

  // Los botoncitos se escuchan una sola vez por formulario (sobreviven al
  // cambio de idioma, que vuelve a escribir el contenido)
  function onChip(e) {
    var c = e.target.closest('.vis-chip');
    if (!c) return;
    var g = c.dataset.g, v = c.dataset.v;
    if (g === 'estadia') estado.estadia = String(estado.estadia) === v ? 0 : +v;
    else estado[g] = estado[g] === v ? '' : v;
    sync();
  }

  function wire(f) {
    var inp = f.querySelector('.vis-date input');
    // En la compu el input invisible no abre el calendario solo: se lo pide
    inp.addEventListener('click', function () { try { inp.showPicker(); } catch (_) {} });
    inp.addEventListener('change', function () {
      estado.llegada = inp.value && inp.value >= minLlegada() ? inp.value : (inp.value ? minLlegada() : '');
      sync();
    });
    f.querySelector('.vis-btn').addEventListener('click', function () {
      if (dlg && dlg.open && dlg.contains(f)) setTimeout(cerrar, 300);
    });
  }

  function render(f) {
    f.innerHTML = htmlForm();
    wire(f);
  }

  function mount(el) {
    if (!el) return;
    el.classList.add('vis-form');
    // La ficha reescribe su tarjeta al cambiar de idioma: lo que quedó fuera de la página se suelta
    forms = forms.filter(function (f) { return f.isConnected; });
    if (forms.indexOf(el) === -1) forms.push(el);
    if (!el._visChips) { el.addEventListener('click', onChip); el._visChips = true; }
    render(el);
    sync();
  }

  function cabecera() {
    var L = t();
    dlg.querySelector('.vis-eyebrow').textContent = L.eyebrow;
    dlg.querySelector('.vis-title').textContent = unidad ? unidad.titulo : L.gen_title;
    dlg.querySelector('.vis-sub').textContent = unidad ? (unidad.sub || '') : L.gen_sub;
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

  function abrir() {
    if (!dlg) crear();
    cabecera();
    var f = dlg.querySelector('.vis-form');
    mount(f);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.style.overflow = 'hidden';
  }
  function cerrar() {
    if (!dlg) return;
    if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else dlg.removeAttribute('open');
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-visita]');
    if (!b) return;
    e.preventDefault();
    // Si el menú del celular estaba abierto, se cierra antes
    var mm = document.getElementById('mobileMenu'), bg = document.getElementById('burger');
    if (mm && mm.classList.contains('open') && bg) bg.click();
    abrir();
  });

  document.addEventListener('bairen:lang', function () {
    forms = forms.filter(function (f) { return f.isConnected; });
    forms.forEach(render);
    sync();
    if (dlg) cabecera();
  });

  window.BairenVisita = {
    open: abrir,
    close: cerrar,
    mount: mount,
    setUnidad: function (u) {
      unidad = u || null;
      // La ventana cambia de forma (con o sin barrio y presupuesto)
      forms = forms.filter(function (f) { return f.isConnected; });
      forms.forEach(render);
      sync();
      if (dlg) cabecera();
    }
  };
})();
