/* BAIREN · Píxel de Meta (28/9/2026)
   Carga el píxel en las páginas públicas y le avisa a Meta cada vez que alguien
   toca un botón de WhatsApp (evento Contact). Con eso la campaña optimiza por
   gente que escribe, no por clics.
   Cualquier link a wa.me cuenta solo. Lo que abre WhatsApp por código (el
   cuestionario de visita) llama a window.bairenPixel('Contact').
   La ficha deja en window.BAIREN_PIXEL los datos de la unidad, que viajan con
   cada evento. Sin PIXEL_ID no se carga nada y bairenPixel no hace nada. */
(function () {
  "use strict";
  var PIXEL_ID = '';

  window.BAIREN_PIXEL = window.BAIREN_PIXEL || {};
  window.bairenPixel = function (evento, extra) {
    if (!PIXEL_ID || !window.fbq) return;
    var datos = {}, k;
    for (k in window.BAIREN_PIXEL) datos[k] = window.BAIREN_PIXEL[k];
    for (k in (extra || {})) datos[k] = extra[k];
    window.fbq('track', evento, datos);
  };
  if (!PIXEL_ID) return;

  /* Código base de Meta */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me/"]') : null;
    if (a) window.bairenPixel('Contact');
  }, true);
})();
