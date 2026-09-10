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
  var RESORTE = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 };
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
      { duration: opts.duracion || DUR.normal, ease: CURVA, delay: M.stagger ? M.stagger(opts.paso || PASO) : 0 }
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
           : { transform: ['scale(.97)', 'scale(1)'], opacity: [0, 1] };
    return M.animate(el, de, { duration: DUR.rapido, ease: CURVA }).finished;
  };
  BPM.salir = function (el, desde) {
    el = lista(el)[0]; if (!el || !ok) return Promise.resolve();
    var a = desde === 'abajo' ? { transform: 'translateY(16px)', opacity: 0 }
          : desde === 'derecha' ? { transform: 'translateX(20px)', opacity: 0 }
          : { transform: 'scale(.98)', opacity: 0 };
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
        M.animate(el, { opacity: [0, 1], transform: ['scale(.94)', 'scale(1)'] },
          { duration: DUR.rapido, ease: CURVA, delay: escalonado(i % 6) });
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

  /* ── El dedo y el cursor: todo lo que se toca responde ───────────────────
     Hundido de 1,5 % al apretar, con resorte al soltar. Es lo que separa
     una página de un producto, y no se nota conscientemente. */
  BPM.tacto = function (root) {
    if (!ok || !M.press) return;
    var sel = '.p-btn, .p-btn-fill, .p-fbtn, .p-icon-btn, .card-cta, .camino, .p-tab, .p-chip, .p-quick button, .p-report .chips button, .p-ac-link, .soc, button.p-linkbtn';
    lista((root || document).querySelectorAll(sel)).forEach(function (el) {
      if (el._tacto) return; el._tacto = true;
      try {
        M.press(el, function () {
          M.animate(el, { transform: 'scale(.985)' }, { duration: DUR.toque, ease: CURVA });
          return function () { M.animate(el, { transform: 'scale(1)' }, RESORTE); };
        });
      } catch (e) { el._tacto = false; }
    });
  };

  /* ── Puesta en marcha ───────────────────────────────────────────────────── */
  BPM.init = function (root) {
    root = root || document;
    BPM.tacto(root); BPM.sellos(root); BPM.contar(root);
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
