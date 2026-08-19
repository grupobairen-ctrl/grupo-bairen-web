/* ─── Bairen · Capa de motion premium ────────────────────────────────
   Activa premium.css agregando html.pm, y maneja lo que el CSS no puede:
   revelado de tarjetas (incluidas las que renderiza Supabase), velo de
   transición entre páginas, cifras que cuentan y parallax del hero.
   Mobile: sin parallax (scroll 100% nativo), sin escalonado (una columna),
   velo más corto. Respeta prefers-reduced-motion: si está activo, no hace nada. */
(function () {
  "use strict";
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var H = document.documentElement;
  H.classList.add('pm');
  var FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ── 5 · Velo de transición entre páginas ─────────────────────── */
  var veil = document.createElement('div');
  veil.id = 'pm-veil';
  function mountVeil() { document.body.appendChild(veil); }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url; try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;   /* anclas internas */
    if (/\.pdf$/i.test(url.pathname)) return;
    e.preventDefault();
    H.classList.add('pm-leave');
    setTimeout(function () { location.href = url.href; }, FINE ? 290 : 210);
  }, true);
  window.addEventListener('pageshow', function (ev) {
    if (ev.persisted) H.classList.remove('pm-leave');
  });

  /* ── 2 + 7 · Revelado de tarjetas, estáticas y dinámicas ─────── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      en.target.classList.add('pm-in');
    });
  }, FINE ? { threshold: .12, rootMargin: '0px 0px -6% 0px' }
          : { threshold: 0, rootMargin: '0px 0px 14% 0px' });  /* mobile: dispara antes, el pulgar es rápido */

  var bucket = 0, lastPrime = 0;
  function prime(el) {
    if (el.classList.contains('pm-card')) return;
    var now = performance.now();
    if (now - lastPrime > 400) bucket = 0;      /* tanda nueva: reinicia el escalonado */
    lastPrime = now;
    el.classList.add('pm-card');
    /* En mobile el grid es una columna: cada tarjeta entra sola, sin delay artificial */
    el.style.setProperty('--pm-d', FINE ? (bucket++ % 4) * 70 + 'ms' : '0ms');
    io.observe(el);
  }
  function sweep(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('.prop-card, .dest-card').forEach(prime);
  }
  sweep(document);
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('.prop-card, .dest-card')) prime(n);
        sweep(n);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* Contador SOLO donde el dato es estadística de mercado (data-countup),
     nunca en precios: el precio se declara quieto (regla del 19 ago). */
  var cuIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      cuIO.unobserve(en.target);
      var el = en.target, final = el.textContent;
      var m = final.match(/([\d.,]{2,})/);
      if (!m) return;
      var target = parseInt(m[1].replace(/[.,]/g, ''), 10);
      var sep = m[1].indexOf('.') > -1 ? '.' : (m[1].indexOf(',') > -1 ? ',' : '');
      var t0 = performance.now(), DUR = 1400;
      el.style.fontVariantNumeric = 'tabular-nums';
      requestAnimationFrame(function tick(now) {
        var p = Math.min((now - t0) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 4);
        var val = Math.round(target * eased).toString();
        if (sep) val = val.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
        el.textContent = final.replace(m[1], val);
        if (p < 1) requestAnimationFrame(tick);
        else { el.textContent = final; el.style.fontVariantNumeric = ''; }
      });
    });
  }, { threshold: .6 });
  document.querySelectorAll('[data-countup]').forEach(function (el) { cuIO.observe(el); });

  /* ── 3 · Parallax del hero (solo desktop; el scroll queda nativo:
     en Mac el trackpad ya trae inercia y sumarle otra lo hace pesado;
     en mobile iOS entrega los eventos de scroll tarde y el parallax saltaría) ── */
  if (FINE) {
    var bg = document.querySelector('.hero-bg');
    if (bg) {
      bg.addEventListener('animationend', function () { bg.style.animation = 'none'; });
      var ticking = false;
      addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = Math.min(scrollY, innerHeight);
          bg.style.transform = 'translateY(' + (y * .14).toFixed(1) + 'px) scale(1.02)';
          ticking = false;
        });
      }, { passive: true });
    }
  }

  if (document.body) mountVeil();
  else document.addEventListener('DOMContentLoaded', mountVeil);
})();
