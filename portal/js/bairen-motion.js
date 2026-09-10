/* ── El movimiento de BAIREN ────────────────────────────────────────────────
   Un solo lugar donde se decide cómo se mueve todo: el portal hoy y el OS después.
   Sobre Motion (motion.dev), fijado en la versión 12.23.12 y servido desde el repo.

   Reglas de la casa
   1. El movimiento aparece donde algo CAMBIA. Lo que simplemente está, está quieto.
   2. Nada rebota. La curva es la misma de bairengroup.com: expo, decidida, sin volver.
   3. El precio no se anima nunca (regla de Tomás, 19/8/2026: el precio se declara quieto).
   4. Ninguna animación hace esperar. Si tarda, es un error, no un efecto.
   5. Si la persona pidió menos movimiento en su sistema, no hay movimiento.
   6. Si la librería no carga, la web funciona igual. Esto es un agregado, no un cimiento.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var M = window.Motion || null;
  var quieto = false;
  try { quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var ok = !!(M && M.animate) && !quieto;

  /* Vocabulario: duraciones en segundos, una sola curva, un solo resorte */
  var CURVA = [0.22, 1, 0.36, 1];
  var DUR = { toque: 0.18, rapido: 0.28, normal: 0.55, lento: 0.9 };
  var RESORTE = { type: 'spring', stiffness: 220, damping: 40, mass: 1 }; // sólo para lo que se arrastra: hojas y cajones. Amortiguado, no rebota.
  var SUBE = 20;      // cuánto sube algo al aparecer
  var PASO = 0.055;   // demora entre hermanos
  var TOPE = 8;       // a partir de acá el escalonado no crece más, para no hacer esperar

  var BPM = { ok: ok, hayMotion: !!M, CURVA: CURVA, DUR: DUR, RESORTE: RESORTE };

  function lista(x) {
    if (!x) return [];
    if (typeof x === 'string') return Array.prototype.slice.call(document.querySelectorAll(x));
    if (x.length !== undefined && !x.tagName) return Array.prototype.slice.call(x);
    return [x];
  }
  function escalonado(i) { return Math.min(i, TOPE) * PASO; }

  /* ── Aparecer: lo que entra en pantalla sube y se revela ──────────────────
     Reemplaza al observador viejo. Los hermanos de una misma grilla entran
     escalonados; los bloques sueltos entran solos. */
  BPM.aparecer = function (els, opts) {
    els = lista(els); if (!els.length) return;
    if (!ok) { els.forEach(function (e) { e.style.opacity = ''; e.style.transform = ''; e.classList.add('in'); }); return; }
    opts = opts || {};
    els.forEach(function (e) { e.style.transition = 'none'; e.classList.add('in'); });
    M.animate(els,
      { opacity: [0, 1], transform: ['translateY(' + (opts.sube || SUBE) + 'px)', 'translateY(0px)'] },
      { duration: opts.duracion || DUR.normal, ease: CURVA, delay: M.stagger ? M.stagger(Math.min(opts.paso || PASO, 0.4 / Math.max(1, els.length - 1))) : 0 }
    ).finished.then(function () { els.forEach(function (e) { e.style.transition = ''; }); }, function () {});
  };

  /* ── Reacomodar (FLIP): al filtrar, las tarjetas viajan a su lugar nuevo ──
     Se mide dónde estaba cada una, se vuelve a dibujar la lista, y se anima
     la diferencia. Las que llegan nuevas suben y se revelan. */
  BPM.reacomodar = function (cont, dibujar) {
    if (!cont || typeof dibujar !== 'function') return;
    if (!ok) { dibujar(); return; }
    var antes = {};
    lista(cont.querySelectorAll('[data-flip]')).forEach(function (el) {
      antes[el.getAttribute('data-flip')] = el.getBoundingClientRect();
    });
    dibujar();
    var nuevos = [];
    lista(cont.querySelectorAll('[data-flip]')).forEach(function (el) {
      var b = antes[el.getAttribute('data-flip')];
      var a = el.getBoundingClientRect();
      if (!b) { nuevos.push(el); return; }
      var dx = Math.round(b.left - a.left), dy = Math.round(b.top - a.top);
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      M.animate(el,
        { transform: ['translate(' + dx + 'px,' + dy + 'px)', 'translate(0px,0px)'] },
        { duration: DUR.normal, ease: CURVA }
      );
    });
    if (nuevos.length) BPM.aparecer(nuevos, { sube: 16, duracion: DUR.normal });
  };

  /* ── Entrar y salir: diálogos, cajón de filtros, hoja de barrios, visor ── */
  BPM.entrar = function (el, desde) {
    el = lista(el)[0]; if (!el || !ok) return Promise.resolve();
    var de = desde === 'abajo' ? { transform: ['translateY(24px)', 'translateY(0px)'], opacity: [0, 1] }
           : desde === 'derecha' ? { transform: ['translateX(28px)', 'translateX(0px)'], opacity: [0, 1] }
           : { transform: ['translateY(10px)', 'translateY(0px)'], opacity: [0, 1] };
    return M.animate(el, de, { duration: DUR.rapido, ease: CURVA }).finished;
  };
  BPM.salir = function (el, desde) {
    el = lista(el)[0]; if (!el || !ok) return Promise.resolve();
    var a = desde === 'abajo' ? { transform: 'translateY(16px)', opacity: 0 }
          : desde === 'derecha' ? { transform: 'translateX(20px)', opacity: 0 }
          : { transform: 'translateY(6px)', opacity: 0 };
    return M.animate(el, a, { duration: DUR.toque, ease: 'easeIn' }).finished;
  };

  /* ── Profundidad: la foto del hero va más lenta que el scroll, el titular se retira.
     Sutil a propósito: 8 % de recorrido. Se nota como calidad, no como efecto. */
  BPM.profundidad = function (contenedor, foto, titular) {
    if (!ok || !M.scroll) return;
    var cont = lista(contenedor)[0]; if (!cont) return;
    var f = lista(foto)[0], t = lista(titular)[0];
    try {
      if (f) M.scroll(M.animate(f, { transform: ['translateY(0%)', 'translateY(8%)'] }, { ease: 'linear' }),
        { target: cont, offset: ['start start', 'end start'] });
      if (t) M.scroll(M.animate(t, { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(28px)'] }, { ease: 'linear' }),
        { target: cont, offset: ['start start', 'end start'] });
    } catch (e) {}
  };

  /* ── Sello: la verificación se asienta al entrar en pantalla.
     Es la tesis de BAIREN hecha visible: alguien revisó esto. Una sola vez. */
  BPM.sellos = function (root) {
    if (!ok || !M.inView) return;
    lista((root || document).querySelectorAll('.p-badge, .p-cta-verif, .amenity')).forEach(function (el, i) {
      if (el._sello) return; el._sello = true;
      M.inView(el, function () {
        M.animate(el, { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0px)'] },
          { duration: DUR.normal, ease: CURVA, delay: escalonado(i % 6) });
      }, { amount: 0.6 });
    });
  };

  /* ── Contar: sólo estadísticas de mercado. Nunca un precio. ─────────────── */
  BPM.contar = function (root) {
    if (!ok || !M.inView) return;
    lista((root || document).querySelectorAll('[data-countup]')).forEach(function (el) {
      if (el._cont) return; el._cont = true;
      M.inView(el, function () {
        var fin = el.textContent, m = fin.match(/([\d.,]{2,})/); if (!m) return;
        var meta = parseInt(m[1].replace(/[.,]/g, ''), 10); if (!meta) return;
        var sep = m[1].indexOf('.') > -1 ? '.' : (m[1].indexOf(',') > -1 ? ',' : '');
        el.style.fontVariantNumeric = 'tabular-nums';
        M.animate(0, meta, {
          duration: 1.4, ease: CURVA,
          onUpdate: function (v) {
            var s = Math.round(v).toString();
            if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
            el.textContent = fin.replace(m[1], s);
          },
          onComplete: function () { el.textContent = fin; el.style.fontVariantNumeric = ''; }
        });
      }, { amount: 0.6 });
    });
  };

  /* ── El dedo y el cursor ────────────────────────────────────────────────
     Nada de hundidos ni de resortes: eso lee a aplicación, no a inmobiliaria.
     Lo que se aprieta baja un punto de luz durante un instante y vuelve.
     Es lo que hace una marca cara: se siente, no se ve. */
  BPM.tacto = function (root) {
    if (!ok || !M.press) return;
    var sel = '.p-btn, .p-btn-fill, .p-fbtn, .p-icon-btn, .card-cta, .camino, .p-tab, .p-chip, .p-quick button, .p-report .chips button, .p-ac-link, .soc, button.p-linkbtn';
    lista((root || document).querySelectorAll(sel)).forEach(function (el) {
      if (el._tacto) return; el._tacto = true;
      try {
        M.press(el, function () {
          M.animate(el, { opacity: 0.82 }, { duration: 0.08, ease: 'linear' });
          return function () { M.animate(el, { opacity: 1 }, { duration: 0.22, ease: CURVA }); };
        });
      } catch (e) { el._tacto = false; }
    });
  };

  /* ── Abrir desde: el elemento crece desde donde estaba, no aparece de la nada.
     Es la transición que usan las casas de subastas para mostrar una obra:
     el ojo no pierde de vista la foto que eligió. */
  BPM.abrirDesde = function (destino, origen) {
    destino = lista(destino)[0]; origen = lista(origen)[0];
    if (!ok || !destino || !origen) return Promise.resolve();
    var o = origen.getBoundingClientRect(), d = destino.getBoundingClientRect();
    if (!o.width || !d.width) return Promise.resolve();
    var sx = o.width / d.width, sy = o.height / d.height;
    var dx = (o.left + o.width / 2) - (d.left + d.width / 2);
    var dy = (o.top + o.height / 2) - (d.top + d.height / 2);
    return M.animate(destino, {
      transform: ['translate(' + dx + 'px,' + dy + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')', 'translate(0px,0px) scale(1,1)'],
      opacity: [0.55, 1]
    }, { duration: DUR.normal, ease: CURVA }).finished;
  };
  BPM.cerrarHacia = function (origenDelViaje, destinoFisico) {
    var el = lista(origenDelViaje)[0], dst = lista(destinoFisico)[0];
    if (!ok || !el) return Promise.resolve();
    if (!dst) return M.animate(el, { opacity: 0 }, { duration: DUR.toque, ease: 'easeIn' }).finished;
    var o = dst.getBoundingClientRect(), d = el.getBoundingClientRect();
    if (!o.width || !d.width) return M.animate(el, { opacity: 0 }, { duration: DUR.toque }).finished;
    var sx = o.width / d.width, sy = o.height / d.height;
    var dx = (o.left + o.width / 2) - (d.left + d.width / 2);
    var dy = (o.top + o.height / 2) - (d.top + d.height / 2);
    return M.animate(el, {
      transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')',
      opacity: 0.4
    }, { duration: DUR.rapido, ease: CURVA }).finished;
  };

  /* ── Cambiar de foto: la que sale se va para un lado, la que entra llega del otro. */
  BPM.pasarFoto = function (el, direccion) {
    el = lista(el)[0]; if (!ok || !el) return;
    var d = direccion < 0 ? -1 : 1;
    M.animate(el, {
      transform: ['translateX(' + (26 * d) + 'px)', 'translateX(0px)'],
      opacity: [0, 1]
    }, { duration: DUR.rapido, ease: CURVA });
  };

  /* ── Copiar: el ícono se cambia por una tilde y el rótulo lo dice. Sin festejos. */
  BPM.copiar = function (boton, texto, rotulo) {
    if (!boton) return Promise.resolve(false);
    var previo = boton.getAttribute('data-copiado') === '1';
    if (previo) return Promise.resolve(true);
    var hacer = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(texto)
      : new Promise(function (res, rej) {
          try { var t = document.createElement('textarea'); t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
            document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); res(); } catch (e) { rej(e); }
        });
    return hacer.then(function () {
      var original = boton.innerHTML;
      boton.setAttribute('data-copiado', '1');
      boton.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>' + (rotulo || 'Copiado');
      if (ok) M.animate(boton.firstChild, { opacity: [0, 1], transform: ['translateY(4px)', 'translateY(0px)'] }, { duration: DUR.rapido, ease: CURVA });
      setTimeout(function () { boton.innerHTML = original; boton.removeAttribute('data-copiado'); }, 2000);
      return true;
    }, function () { return false; });
  };

  /* ── Cambio de paso: la tarjeta cambia de alto y el contenido cruza de lado.
     Es lo que separa un formulario de un producto: el paso no salta, se corre. */
  BPM.cambioDePaso = function (cont, cambiar, dir) {
    cont = lista(cont)[0];
    if (!cont || typeof cambiar !== 'function') return;
    if (!ok) { cambiar(); return; }
    var h0 = cont.getBoundingClientRect().height;
    cambiar();
    var h1 = cont.getBoundingClientRect().height;
    cont.style.overflow = 'hidden';
    M.animate(cont, { height: [h0 + 'px', h1 + 'px'] }, { duration: DUR.rapido, ease: CURVA })
      .finished.then(function () { cont.style.height = ''; cont.style.overflow = ''; },
                     function () { cont.style.height = ''; cont.style.overflow = ''; });
    var visible = cont.querySelector('form:not([hidden]), [data-paso]:not([hidden])');
    if (visible) M.animate(visible,
      { opacity: [0, 1], transform: ['translateX(' + (14 * (dir === -1 ? -1 : 1)) + 'px)', 'translateX(0px)'] },
      { duration: DUR.normal, ease: CURVA });
  };

  /* ── Sello: BAIREN no festeja una operación, la deja asentada.
     Una palabra en oro se estampa sobre la unidad y después la fila se apaga.
     Es un registro, no una fiesta: la operación es de quien publica, no nuestra. */
  BPM.sello = function (destino, texto) {
    destino = lista(destino)[0];
    if (!destino) return Promise.resolve();
    if (getComputedStyle(destino).position === 'static') destino.style.position = 'relative';
    var el = document.createElement('span');
    el.className = 'p-sello'; el.textContent = texto || 'Reservada'; el.setAttribute('aria-hidden', 'true');
    destino.appendChild(el);
    var sacar = function () { el.remove(); destino.classList.add('sellado'); };
    if (!ok) { setTimeout(sacar, 1400); return Promise.resolve(); }
    return M.animate(el,
      { opacity: [0, 1], transform: ['rotate(-8deg) scale(1.3)', 'rotate(-8deg) scale(1)'] },
      { duration: 0.34, ease: CURVA }
    ).finished.then(function () {
      return M.animate(el, { opacity: 0 }, { duration: 0.5, delay: 1.1, ease: 'easeIn' }).finished;
    }).then(sacar, sacar);
  };

  /* ── Rodar: el rótulo sube y una copia llega desde abajo. Un solo giro,
     nunca en bucle: en bucle deja de ser un botón y pasa a ser una marquesina. */
  BPM.rodar = function (root) {
    if (!ok) return;
    lista((root || document).querySelectorAll('[data-rueda]')).forEach(function (b) {
      if (b._rueda) return; b._rueda = true;
      var txt = b.getAttribute('data-rueda') || b.textContent.trim();
      b.innerHTML = '<span class="rd"><span class="a">' + txt + '</span><span class="b" aria-hidden="true">' + txt + '</span></span>';
      var caja = b.querySelector('.rd');
      var girando = false;
      var girar = function () {
        if (girando) return; girando = true;
        M.animate(caja, { transform: ['translateY(0%)', 'translateY(-50%)'] }, { duration: 0.42, ease: CURVA })
          .finished.then(function () { caja.style.transform = 'translateY(0%)'; girando = false; }, function () { girando = false; });
      };
      b.addEventListener('mouseenter', girar);
      b.addEventListener('focus', girar);
    });
  };

  /* ── Entrada: el nombre se arma desde el ruido y queda. Una vez por sesión,
     sólo en la portada, con tope de tiempo. Una intro es un peaje: se cobra
     una sola vez y barato, o no se cobra. */
  BPM.entrada = function (palabra, opts) {
    opts = opts || {};
    try { if (sessionStorage.getItem('bairen-entrada') === '1') return; sessionStorage.setItem('bairen-entrada', '1'); } catch (e) {}
    if (!ok) return;
    palabra = (palabra || 'BAIREN').toUpperCase();
    var capa = document.createElement('div');
    capa.className = 'p-entrada'; capa.setAttribute('aria-hidden', 'true');
    capa.innerHTML = '<span class="w"></span>';
    document.body.appendChild(capa);
    var w = capa.querySelector('.w');
    var glifos = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var fijas = 0, t0 = performance.now(), TOPE = opts.tope || 780;
    (function tick(now) {
      var t = Math.min((now - t0) / TOPE, 1);
      fijas = Math.floor(t * t * palabra.length);
      var out = '';
      for (var i = 0; i < palabra.length; i++) out += i < fijas ? palabra[i] : glifos[(Math.random() * glifos.length) | 0];
      w.textContent = out;
      if (t < 1) requestAnimationFrame(tick);
      else {
        w.textContent = palabra;
        M.animate(capa, { opacity: 0 }, { duration: 0.5, delay: 0.32, ease: CURVA })
          .finished.then(function () { capa.remove(); }, function () { capa.remove(); });
      }
    })(t0);
    setTimeout(function () { if (capa.parentNode) capa.remove(); }, TOPE + 1400);
  };

  /* ── Titular por palabras: cada una sube desde abajo detrás de una máscara.
     Es el gesto de las casas de moda y de las galerías. No aparece: entra. */
  BPM.titular = function (el, opts) {
    el = lista(el)[0]; if (!el) return;
    if (el._titular) return; el._titular = true;
    opts = opts || {};
    var lineas = el.querySelectorAll('.hline');
    var fuentes = lineas.length ? lineas : [el];
    var piezas = [];
    Array.prototype.forEach.call(fuentes, function (ln) {
      var palabras = (ln.textContent || '').trim().split(/\s+/);
      ln.textContent = '';
      palabras.forEach(function (w, i) {
        var caja = document.createElement('span'); caja.className = 'p-msk';
        var dentro = document.createElement('span'); dentro.className = 'p-msk-in';
        dentro.textContent = w + (i < palabras.length - 1 ? '\u00A0' : '');
        caja.appendChild(dentro); ln.appendChild(caja); piezas.push(dentro);
      });
    });
    if (!ok) { piezas.forEach(function (x) { x.style.transform = 'none'; }); return; }
    piezas.forEach(function (x) { x.style.transform = 'translateY(110%)'; });
    M.animate(piezas, { transform: ['translateY(110%)', 'translateY(0%)'] },
      { duration: 0.6, ease: CURVA, delay: M.stagger(0.05, { startDelay: opts.demora || 0 }) });
  };

  /* ── Foco que sigue al cursor en la barra de arriba.
     Una luz cálida y baja, no un reflector: la casa es navy, no un escenario. */
  BPM.foco = function (nav) {
    nav = lista(nav)[0]; if (!nav || !ok || nav._foco) return; nav._foco = true;
    var luz = document.createElement('span'); luz.className = 'p-foco'; luz.setAttribute('aria-hidden', 'true');
    nav.insertBefore(luz, nav.firstChild);
    var activo = function () { var a = nav.querySelector('[aria-current="page"], .p-nav-menu > div > button[aria-expanded="true"]'); if (!a) return null; var r = a.getBoundingClientRect(), n = nav.getBoundingClientRect(); return r.left - n.left + r.width / 2; };
    var poner = function (x) { nav.style.setProperty('--foco-x', x + 'px'); };
    var vuelta = null;
    nav.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      if (vuelta) { vuelta.stop(); vuelta = null; }
      var n = nav.getBoundingClientRect();
      poner(e.clientX - n.left); luz.style.opacity = '1';
    });
    nav.addEventListener('pointerleave', function () {
      var destino = activo();
      if (destino == null) { luz.style.opacity = '0'; return; }
      var actual = parseFloat(getComputedStyle(nav).getPropertyValue('--foco-x')) || destino;
      vuelta = M.animate(actual, destino, { type: 'spring', stiffness: 180, damping: 34, onUpdate: poner });
      M.animate(luz, { opacity: 0.55 }, { duration: 0.4, ease: CURVA });
    });
    var d = activo(); if (d != null) { poner(d); luz.style.opacity = '0.55'; }
  };

  /* ── Muro de publicadores: cuadrícula con líneas de separación y una luz que
     sigue al cursor. Si son más de los que entran, las tandas se alternan.
     Nunca inventa: sólo entran los publicadores reales. */
  BPM.muro = function (cont, opts) {
    cont = lista(cont)[0]; if (!cont || cont._muro) return; cont._muro = true;
    opts = opts || {};
    var tandas = cont.querySelectorAll('.tanda');
    cont.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = cont.getBoundingClientRect();
      cont.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      cont.style.setProperty('--my', (e.clientY - r.top) + 'px');
      cont.classList.add('con-luz');
    });
    cont.addEventListener('pointerleave', function () { cont.classList.remove('con-luz'); });
    if (!ok || tandas.length < 2) return;
    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      var sale = tandas[i], entra = tandas[(i + 1) % tandas.length];
      M.animate(sale, { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(-10px)'] }, { duration: DUR.normal, ease: CURVA });
      entra.style.zIndex = '2'; sale.style.zIndex = '1';
      M.animate(entra, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: DUR.normal, ease: CURVA, delay: 0.08 });
      i = (i + 1) % tandas.length;
    }, (opts.cada || 4.2) * 1000);
  };

  /* ── Botón de producción con IA: mientras trabaja, una luz de oro recorre el
     rótulo. Sin destellos de neón: acá la IA vuelve a sacar una foto, no hace magia. */
  BPM.produciendo = function (b, encendido) {
    b = lista(b)[0]; if (!b) return;
    b.classList.toggle('p-gen', !!encendido);
    b.setAttribute('aria-busy', encendido ? 'true' : 'false');
    if (!encendido || !ok) return;
    M.animate(b, { opacity: [1, 1] }, { duration: 0.01 });
  };

  /* ── Puesta en marcha ───────────────────────────────────────────────────── */
  BPM.init = function (root) {
    root = root || document;
    BPM.tacto(root); BPM.sellos(root); BPM.contar(root); BPM.rodar(root);
    if (window.BP && BP.crear) BP.crear(root); // el header se vuelve a dibujar al abrir sesión
    if (window.BP && BP.desplegables) BP.desplegables(root);
  };

  window.BPM = BPM;

  /* Se engancha solo: al cargar y cada vez que una página dibuja contenido nuevo.
     Así ninguna página tiene que acordarse de llamarlo. */
  function arrancar() {
    BPM.init(document);
    if (!ok || !window.MutationObserver) return;
    var pend = null;
    new MutationObserver(function () {
      clearTimeout(pend);
      pend = setTimeout(function () { BPM.init(document); }, 80);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
