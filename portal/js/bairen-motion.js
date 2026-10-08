/* ── El movimiento de BAIREN ────────────────────────────────────────────────
   Un solo lugar donde se decide cómo se mueve todo. Sin bibliotecas: Web Animations
   del navegador y CSS (css/transiciones.css). 8/10/2026 · Antes iba sobre Motion
   (motion.js, 81 KB en cada página) y tenía doce efectos; quedan tres familias:

   a) Aparición al entrar: opacidad de 0 a 1 y 10 px de subida, 280 ms, una vez por
      elemento, escalonado de 40 ms con tope en 6.
   b) Respuesta al toque: lo que se aprieta baja a .98 en 120 ms y vuelve.
   c) Paneles: menú, hojas, filtros y visor se deslizan en 300 ms con fondo que se oscurece.

   Reglas de la casa
   1. Una sola curva: cubic-bezier(.22,1,.36,1). Nada rebota.
   2. El precio no se anima nunca (regla de Tomás, 19/8/2026).
   3. Ninguna animación hace esperar: lo que está en pantalla ya se ve.
   4. Con "menos movimiento" pedido en el sistema: sin desplazamientos ni escalas,
      solo fundidos de hasta 150 ms.
   5. Si esto no carga, la web funciona igual. Es un agregado, no un cimiento.

   Salieron (eran de lucimiento): el titular que se armaba por palabras, la entrada
   que barajaba letras, el hilo del estándar que se dibujaba, los contadores, los
   sellos que se asentaban, la profundidad del hero, el rótulo que rodaba, la luz que
   seguía al cursor en la barra y en el muro. El estándar queda dibujado y quieto.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var quieto = false;
  try { quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var hayWAAPI = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  var ok = hayWAAPI;   /* con menos movimiento igual hay fundidos cortos: anim() saca desplazamientos y escalas */

  var CURVA = 'cubic-bezier(.22,1,.36,1)';
  var DUR = { toque: 120, foto: 220, aparece: 280, panel: 300, sale: 240 };
  var SUBE = 10;      // cuánto sube algo al aparecer (px)
  var PASO = 40;      // demora entre hermanos (ms)
  var TOPE = 5;       // escalonados: del 1 al 6, el resto entra con el sexto

  var BPM = { ok: ok, quieto: quieto, CURVA: CURVA, DUR: DUR };

  function lista(x) {
    if (!x) return [];
    if (typeof x === 'string') return Array.prototype.slice.call(document.querySelectorAll(x));
    if (x.length !== undefined && !x.tagName) return Array.prototype.slice.call(x);
    return [x];
  }

  /* Una animación con la curva de la casa. Con menos movimiento: solo la opacidad, 150 ms como mucho.
     Devuelve una promesa que se cumple al terminar (o enseguida si no hay nada que animar). */
  /* Lo que dejó una animación anterior de la casa (una salida queda "puesta" hasta que se cierra el panel) */
  function limpiar(el) {
    try { el.getAnimations().forEach(function (a) { if (a.id === 'bp') a.cancel(); }); } catch (e) {}
  }
  function anim(el, kf, o) {
    o = o || {};
    if (!el || !hayWAAPI) return Promise.resolve();
    limpiar(el);
    if (quieto) {
      if (!kf.opacity) return Promise.resolve();
      kf = { opacity: kf.opacity };
      o = { duration: Math.min(o.duration || 150, 150), fill: o.fill };
    }
    try {
      var a = el.animate(kf, { id: 'bp', duration: o.duration || DUR.aparece, delay: o.delay || 0, easing: o.easing || CURVA, fill: o.fill || 'none' });
      /* Una salida queda puesta hasta que quien la pidió esconde el panel; después se suelta, para no
         dejar un estado viejo pegado a la próxima vez que se abra */
      if (o.fill === 'forwards') a.finished.then(function () { requestAnimationFrame(function () { requestAnimationFrame(function () { try { a.cancel(); } catch (e) {} }); }); }, function () {});
      return a.finished.then(function () { return a; }, function () { return a; });
    } catch (e) { return Promise.resolve(); }
  }
  BPM.anim = anim;

  function enPantalla(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || 800) && r.width > 0;
  }

  /* ── a) Aparecer: sube 10 px y se revela, escalonado corto ────────────── */
  BPM.aparecer = function (els, opts) {
    els = lista(els); if (!els.length) return;
    opts = opts || {};
    els.forEach(function (e, i) {
      e.classList.add('in');
      anim(e, { opacity: [0, 1], transform: ['translateY(' + (opts.sube || SUBE) + 'px)', 'translateY(0px)'] },
        { duration: opts.duracion || DUR.aparece, delay: Math.min(i, TOPE) * PASO, fill: 'backwards' });
    });
  };

  /* Al filtrar se vuelve a dibujar la lista: las tarjetas que llegan nuevas y se ven, aparecen.
     Las que ya estaban no viajan (antes había un FLIP de 550 ms): el resultado está al instante. */
  BPM.reacomodar = function (cont, dibujar) {
    if (!cont || typeof dibujar !== 'function') return;
    var antes = {};
    lista(cont.querySelectorAll('[data-flip]')).forEach(function (el) { antes[el.getAttribute('data-flip')] = 1; });
    dibujar();
    if (!ok || quieto) return;
    var nuevos = lista(cont.querySelectorAll('[data-flip]')).filter(function (el) { return !antes[el.getAttribute('data-flip')] && enPantalla(el); });
    if (nuevos.length) BPM.aparecer(nuevos.slice(0, 12));
  };

  /* ── c) Paneles: entrar y salir (diálogos, hoja de compartir, visor, "¿Quién publica?") ── */
  function desde(lado, cuanto) {
    return lado === 'hoja' ? 'translateY(100%)'
      : lado === 'abajo' ? 'translateY(' + (cuanto || 16) + 'px)'
      : lado === 'derecha' ? 'translateX(' + (cuanto || 24) + 'px)'
      : 'translateY(' + (cuanto || 8) + 'px)';
  }
  /* lado: 'hoja' (sube entera desde abajo), 'abajo' (16 px), 'derecha' (24 px), 'fundido' (solo opacidad,
     para los fondos que oscurecen) o nada (8 px). */
  var opacidad = function (el) { var o = parseFloat(getComputedStyle(el).opacity); return isNaN(o) ? 1 : o; };
  var esFondo = function (el, lado) { return lado === 'fundido' || (!lado && el.classList && el.classList.contains('velo')); };
  BPM.entrar = function (el, lado) {
    el = lista(el)[0]; if (!el) return Promise.resolve();
    limpiar(el);
    if (esFondo(el, lado)) lado = 'fundido';
    var kf = lado === 'fundido' ? {} : { transform: [desde(lado), 'translateY(0px)'] };
    if (lado !== 'hoja') kf.opacity = [0, lado === 'fundido' ? opacidad(el) : 1];
    return anim(el, kf, { duration: DUR.panel });
  };
  BPM.salir = function (el, lado) {
    el = lista(el)[0]; if (!el) return Promise.resolve();
    limpiar(el);
    if (esFondo(el, lado)) lado = 'fundido';
    var kf = lado === 'fundido' ? {} : { transform: ['translateY(0px)', desde(lado, lado === 'abajo' ? 12 : 6)] };
    if (lado !== 'hoja') kf.opacity = [lado === 'fundido' ? opacidad(el) : 1, 0];
    return anim(el, kf, { duration: DUR.sale, fill: 'forwards' });
  };

  /* El visor crece desde la foto que se tocó, y vuelve a ella al cerrarse */
  function viaje(a, b) {
    var o = a.getBoundingClientRect(), d = b.getBoundingClientRect();
    if (!o.width || !d.width) return null;
    return 'translate(' + ((o.left + o.width / 2) - (d.left + d.width / 2)) + 'px,' + ((o.top + o.height / 2) - (d.top + d.height / 2)) + 'px) scale(' + (o.width / d.width).toFixed(4) + ',' + (o.height / d.height).toFixed(4) + ')';
  }
  BPM.abrirDesde = function (destino, origen) {
    destino = lista(destino)[0]; origen = lista(origen)[0];
    if (!destino) return Promise.resolve();
    var t = origen ? viaje(origen, destino) : null;
    if (!t) return anim(destino, { opacity: [0, 1], transform: ['scale(.98)', 'scale(1)'] }, { duration: DUR.panel });
    return anim(destino, { transform: [t, 'translate(0px,0px) scale(1,1)'], opacity: [0.6, 1] }, { duration: DUR.panel });
  };
  BPM.cerrarHacia = function (el, dst) {
    el = lista(el)[0]; dst = lista(dst)[0];
    if (!el) return Promise.resolve();
    var t = dst ? viaje(dst, el) : null;
    if (!t) return anim(el, { opacity: [1, 0] }, { duration: DUR.sale, fill: 'forwards' });
    return anim(el, { transform: ['translate(0px,0px) scale(1,1)', t], opacity: [1, 0.4] }, { duration: DUR.sale, fill: 'forwards' });
  };

  /* ── El visor sigue al dedo: la foto se corre con el arrastre; si no alcanza para pasar, vuelve.
     Pasar de foto (el umbral y el cambio) lo decide la ficha; acá solo se acompaña el gesto. */
  BPM.pasarFoto = function (el, direccion) {
    el = lista(el)[0]; if (!el) return;
    el._pasada = performance.now();
    var arr = parseFloat(el.style.translate) || 0;
    el.style.translate = ''; el.style.opacity = '';
    var d = direccion < 0 ? -1 : 1;
    anim(el, { translate: [(40 * d) + 'px 0px', '0px 0px'], opacity: [arr ? 0.35 : 0.2, 1] }, { duration: DUR.foto });
  };
  BPM.arrastrar = function (marco, img) {
    marco = lista(marco)[0]; img = lista(img)[0];
    if (!marco || !img || marco._arrastre || quieto) return; marco._arrastre = true;
    var x0 = null, id = null, dx = 0;
    marco.addEventListener('pointerdown', function (e) { if (e.button > 0) return; x0 = e.clientX; id = e.pointerId; dx = 0; }, { passive: true });
    marco.addEventListener('pointermove', function (e) {
      if (x0 === null || e.pointerId !== id) return;
      dx = e.clientX - x0; if (Math.abs(dx) < 4) return;
      img.style.translate = Math.round(dx * 0.9) + 'px 0px';
      img.style.opacity = String(1 - Math.min(Math.abs(dx) / 700, 0.3));
    }, { passive: true });
    var soltar = function () {
      if (x0 === null) return; x0 = null;
      var hecho = dx; dx = 0;
      if (Math.abs(hecho) < 4) return;
      /* La ficha escucha el mismo gesto: si pasó de foto, pasarFoto ya se ocupó */
      setTimeout(function () {
        if (img._pasada && performance.now() - img._pasada < 200) return;
        var desdeX = img.style.translate || '0px 0px', op = parseFloat(img.style.opacity) || 1;
        img.style.translate = ''; img.style.opacity = '';
        anim(img, { translate: [desdeX, '0px 0px'], opacity: [op, 1] }, { duration: DUR.foto });
      }, 0);
    };
    marco.addEventListener('pointerup', soltar);
    marco.addEventListener('pointercancel', soltar);
  };

  /* ── Copiar: el ícono se cambia por una tilde y el rótulo lo dice. Sin festejos. */
  BPM.copiar = function (boton, texto, rotulo) {
    if (!boton) return Promise.resolve(false);
    if (boton.getAttribute('data-copiado') === '1') return Promise.resolve(true);
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
      setTimeout(function () { boton.innerHTML = original; boton.removeAttribute('data-copiado'); }, 2000);
      return true;
    }, function () { return false; });
  };

  /* ── Cambio de paso (Ingresar): la caja cambia de alto y el paso nuevo entra de costado */
  BPM.cambioDePaso = function (cont, cambiar, dir) {
    cont = lista(cont)[0];
    if (!cont || typeof cambiar !== 'function') return;
    if (!ok) { cambiar(); return; }
    var h0 = cont.getBoundingClientRect().height;
    cambiar();
    var h1 = cont.getBoundingClientRect().height;
    if (!quieto && Math.abs(h1 - h0) > 1) {
      cont.style.overflow = 'hidden';
      anim(cont, { height: [h0 + 'px', h1 + 'px'] }, { duration: DUR.panel }).then(function () { cont.style.overflow = ''; });
    }
    var visible = cont.querySelector('form:not([hidden]), [data-paso]:not([hidden])');
    if (visible) anim(visible, { opacity: [0, 1], transform: ['translateX(' + (10 * (dir === -1 ? -1 : 1)) + 'px)', 'translateX(0px)'] }, { duration: DUR.aparece });
  };

  /* ── Reservar (panel): la fila queda apagada. Ya no se estampa una palabra encima. */
  BPM.sello = function (destino) {
    destino = lista(destino)[0];
    if (destino) destino.classList.add('sellado');
    return Promise.resolve();
  };

  /* ── Muro de publicadores: si son más de los que entran, las tandas se alternan con un fundido.
     La de atrás no recibe toques. Con menos movimiento, queda la primera tanda quieta. */
  BPM.muro = function (cont, opts) {
    cont = lista(cont)[0]; if (!cont || cont._muro) return; cont._muro = true;
    opts = opts || {};
    var tandas = lista(cont.querySelectorAll('.tanda'));
    var mostrar = function (t, si) { t.style.opacity = si ? '1' : '0'; t.style.visibility = si ? 'visible' : 'hidden'; t.style.zIndex = si ? '2' : '1'; t.setAttribute('aria-hidden', si ? 'false' : 'true'); };
    tandas.forEach(function (t, n) { mostrar(t, n === 0); });
    if (tandas.length < 2 || quieto) return;
    var i = 0;
    setInterval(function () {
      if (document.hidden || cont.matches(':hover') || cont.contains(document.activeElement)) return;
      var sale = tandas[i], entra = tandas[(i + 1) % tandas.length];
      mostrar(entra, true); mostrar(sale, false); sale.style.visibility = 'visible';
      anim(entra, { opacity: [0, 1] }, { duration: DUR.panel });
      anim(sale, { opacity: [1, 0] }, { duration: DUR.panel }).then(function () { if (sale.style.opacity === '0') sale.style.visibility = 'hidden'; });
      i = (i + 1) % tandas.length;
    }, (opts.cada || 4.2) * 1000);
  };

  /* ── El camino del estándar: dibujado y quieto. El hilo de oro une los cuatro hitos,
     todos encendidos. Se vuelve a trazar si cambia el ancho. */
  BPM.camino = function (cont) {
    cont = lista(cont)[0]; if (!cont || cont._camino) return; cont._camino = true;
    var svg = cont.querySelector('.h-camino-linea');
    var guia = svg && svg.querySelector('.guia'), trazo = svg && svg.querySelector('.trazo');
    var hitos = lista(cont.querySelectorAll('[data-hito]'));
    var NS = 'http://www.w3.org/2000/svg';
    hitos.forEach(function (h) {
      var pt = h.querySelector('.pt');
      if (pt && !pt.querySelector('.anillo')) {   /* el anillo de oro de cada hito, ya cerrado */
        var a = document.createElementNS(NS, 'svg'); a.setAttribute('class', 'anillo'); a.setAttribute('viewBox', '0 0 64 64'); a.setAttribute('aria-hidden', 'true');
        var ci = document.createElementNS(NS, 'circle'); ci.setAttribute('cx', '32'); ci.setAttribute('cy', '32'); ci.setAttribute('r', '31');
        a.appendChild(ci); pt.appendChild(a);
      }
      h.classList.add('on');
    });
    cont.classList.add('completo');
    if (!svg || !trazo || hitos.length < 2) return;
    function dibujar() {
      var c = cont.getBoundingClientRect(); if (!c.width) return;
      var ps = hitos.map(function (h) { var r = (h.querySelector('.pt') || h).getBoundingClientRect(); return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 }; });
      var d = 'M ' + ps[0].x.toFixed(1) + ' ' + ps[0].y.toFixed(1);
      for (var i = 1; i < ps.length; i++) {
        var a = ps[i - 1], b = ps[i], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        d += ' Q ' + a.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' Q ' + b.x.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
      }
      svg.setAttribute('viewBox', '0 0 ' + Math.round(c.width) + ' ' + Math.round(c.height));
      svg.style.width = c.width + 'px'; svg.style.height = c.height + 'px';
      trazo.setAttribute('d', d); if (guia) guia.setAttribute('d', d);
      trazo.style.strokeDasharray = ''; trazo.style.strokeDashoffset = '0';
    }
    dibujar();
    var t = null;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(dibujar, 160); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(dibujar, function () {});
  };

  /* ── b) El toque: lo que se aprieta baja a .98 en 120 ms y vuelve igual.
     Sobre la propiedad scale (no transform), así no pisa los hover ni las transiciones del CSS.
     Con el dedo espera 60 ms: si en ese tiempo empieza un desplazamiento, no se hunde nada. */
  var CONTROLES = '.p-btn, .p-fbtn, .p-chip, .p-icon-btn, .tj-fav, .h-cta, .h-seg button, .h-btn, .h-flecha, .p-tabbar a, .p-plazo-pills button, .p-quick button, .p-tab, .p-pill, button.p-linkbtn, .p-compartir .op, .p-crear-pop a, .card-cta, .thumb, .p-lb .nav, .p-pg button, #pager button, .m-cta a, .p-perfil';
  var TARJETAS = '.prop-card, .h-edif';
  BPM.toque = function () {
    if (BPM._toque || quieto || !hayWAAPI) return; BPM._toque = true;
    var actual = null, timer = null, x0 = 0, y0 = 0;
    var soltar = function () {
      clearTimeout(timer); timer = null;
      var el = actual; actual = null; if (!el || !el._toque) return;
      var abajo = el._toque; el._toque = null;
      var s = getComputedStyle(el).scale; var desdeS = s && s !== 'none' ? s : '0.98';
      var a = el.animate({ scale: [desdeS, '1'] }, { duration: DUR.toque, easing: CURVA });
      a.finished.then(function () { abajo.cancel(); }, function () { abajo.cancel(); });
      setTimeout(function () { try { abajo.cancel(); } catch (e) {} }, DUR.toque + 60);
    };
    var hundir = function (el) {
      if (!el.isConnected) return;
      el._toque = el.animate({ scale: ['1', '0.98'] }, { duration: DUR.toque, easing: CURVA, fill: 'forwards' });
    };
    document.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || !e.target.closest) return;
      var el = e.target.closest(CONTROLES) || e.target.closest(TARJETAS);
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      soltar(); actual = el; x0 = e.clientX; y0 = e.clientY;
      if (e.pointerType === 'touch') timer = setTimeout(function () { timer = null; if (actual === el) hundir(el); }, 60);
      else hundir(el);
    }, { passive: true, capture: true });
    document.addEventListener('pointermove', function (e) {
      if (actual && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) soltar();
    }, { passive: true, capture: true });
    ['pointerup', 'pointercancel', 'dragstart'].forEach(function (t) { document.addEventListener(t, soltar, { passive: true, capture: true }); });
    window.addEventListener('blur', soltar);
  };

  /* ── Puesta en marcha ───────────────────────────────────────────────────── */
  BPM.init = function (root) {
    root = root || document;
    BPM.toque();
    if (window.BP && BP.crear) BP.crear(root); // el header se vuelve a dibujar al abrir sesión
    if (window.BP && BP.desplegables) BP.desplegables(root);
    if (window.BP && BP.idioma) BP.idioma(root);
    var lb = document.getElementById('lbMarco'), lbImg = document.getElementById('lbImg');
    if (lb && lbImg) BPM.arrastrar(lb, lbImg);
  };

  window.BPM = BPM;

  /* Se engancha solo, al cargar. Si el header se vuelve a dibujar (al abrir sesión), se engancha de nuevo:
     el observador mira solo el header, no la página entera. */
  function arrancar() {
    BPM.init(document);
    var h = document.getElementById('pHeader');
    if (!h || !window.MutationObserver) return;
    var pend = null;
    new MutationObserver(function () {
      clearTimeout(pend);
      pend = setTimeout(function () { BPM.init(h); }, 60);
    }).observe(h, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
