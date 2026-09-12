/* BAIREN · Portal · errores del navegador de la gente.
   12/9 · Escucha los errores que hoy solo se ven en la consola de cada usuario (window 'error' y
   'unhandledrejection') y los guarda como evento 'error_js' en portal.eventos, que el curador lee en
   Curación → Sistema ("Errores del navegador, últimas 24 h"). Sin dependencias: carga justo después de
   supabase-portal.js, antes que el resto, así engancha los oyentes temprano y no depende de que ui.js o
   store.js hayan cargado bien (si fallan, eso es justamente lo que hay que enterarse).

   Qué guarda (datos del evento):
     tipo    'error' (excepción) o 'rechazo' (promesa sin catch)
     msg     el mensaje, hasta 300 caracteres (sin el "Uncaught " que antepone Chrome: así agrupa igual en todos los navegadores)
     src     el archivo que lo lanzó (solo si es del propio origen), hasta 200
     linea, col
     stack   los primeros 600 caracteres
     pagina  ruta y búsqueda de la URL, sin el hash y sin parámetros con token, code, key, mail u otp
     ua      navigator.userAgent, hasta 160 caracteres
     lang    idioma elegido (bairen_lang) o el del navegador
     modo    'supabase' o 'local' (BPStore.mode al momento de mandar)
   Qué NO guarda: nada personal. Sin mails, sin tokens, sin el hash de la URL (ahí viaja el enlace mágico
   de Auth), sin lo que la gente escribió en un formulario, sin cookies ni localStorage. usuario_id lo pone
   S.track solo cuando hay sesión, como en cualquier otro evento.

   Qué ignora: errores de extensiones (src fuera del propio origen), "ResizeObserver loop", "Script error."
   sin detalle (script de otro origen sin CORS) y, en modo local, los rechazos que mencionan Supabase
   (la base bloqueada en las pruebas). Un mismo error (msg + src + línea) se guarda una vez por sesión de
   pestaña y hay un tope de 5 por página por sesión: un bucle de errores no inunda la base.

   Envío: si está BPStore, por BPStore.track('error_js', …) cuando el store terminó de iniciar (en modo
   local eso solo escribe en el registro del navegador, localStorage bp_eventos, y no toca la red). Sin
   BPStore (store.js no cargó), POST directo a {URL}/rest/v1/eventos con la clave pública que expone
   supabase-portal.js y Content-Profile: portal (RLS: cualquiera inserta, solo el curador lee).
   Todo va en try/catch: si algo falla acá, no se nota. */
(function(){
  'use strict';
  /* En la Mac de desarrollo no se registra nada: los errores de prueba no van a la base real */
  try { if (/^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)) return; } catch (e) {}
  var MAX_POR_PAGINA = 5, MAX_MSG = 300, MAX_SRC = 200, MAX_STACK = 600, MAX_UA = 160, MAX_PAG = 200;
  var CLAVE_SESION = 'bp_errores';
  var memoria = { claves: [], paginas: {} };   /* respaldo si sessionStorage no está */

  function leer(){ try { var v = JSON.parse(sessionStorage.getItem(CLAVE_SESION)); if (v && v.claves && v.paginas) return v; } catch (e) {} return memoria; }
  function guardar(v){ memoria = v; try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(v)); } catch (e) {} }
  function corte(s, n){ s = s == null ? '' : String(s); return s.length > n ? s.slice(0, n) : s; }
  /* Un stack o un archivo pueden traer la URL del documento: sin el hash (el enlace mágico de Auth viaja ahí) y con los
     parámetros con token, code, key, mail u otp tapados. Lo mismo que hace pagina() con la búsqueda. */
  function limpiar(s){ return String(s == null ? '' : s).replace(/[\w.+%-]+@[\w-]+(\.[\w-]+)+/g, '…@…').replace(/#[^\s):]*/g, '').replace(/([?&][^=&\s)]*(token|code|key|secret|mail|otp|session)[^=&\s)]*=)[^&\s):]*/gi, '$1…'); }
  function origenPropio(src){ try { return !src || new URL(src, location.href).origin === location.origin; } catch (e) { return false; } }
  function pagina(){
    try {
      var p = new URLSearchParams(location.search), q = new URLSearchParams();
      p.forEach(function(v, k){ if (!/token|code|key|secret|mail|otp|session/i.test(k)) q.append(k, v); });
      var qs = q.toString();
      return corte(location.pathname + (qs ? '?' + qs : ''), MAX_PAG);
    } catch (e) { return corte(location.pathname, MAX_PAG); }
  }
  /* Si el store ya terminó de iniciar, BPStore.mode es de fiar (sin llamar a init: solo mira BPStore.ready cuando la página lo creó) */
  var storeInicio = false;
  (function mirar(vueltas){ try { var S = window.BPStore; if (S && S.ready) { S.ready.then(function(){ storeInicio = true; }, function(){ storeInicio = true; }); return; } } catch (e) { return; } if (vueltas < 120) setTimeout(function(){ mirar(vueltas + 1); }, 500); })(0);
  /* Modo local con la base bloqueada (pruebas): un rechazo por Supabase no es un error del producto */
  function rechazoPorSupabaseEnLocal(d, modoActual){ return d.tipo === 'rechazo' && modoActual === 'local' && /supabase/i.test(d.msg + ' ' + d.stack); }
  function idioma(){ try { return (window.BP && BP.lang) || localStorage.getItem('bairen_lang') || document.documentElement.lang || navigator.language || ''; } catch (e) { return ''; } }
  function modo(){ try { return (window.BPStore && BPStore.mode) || null; } catch (e) { return null; } }

  /* Espera al store (hasta 8 s a que la página llame a BPStore.init; después lo llama solo, es idempotente).
     Resuelve siempre; si no hay store.js, resuelve null. */
  function storeListo(){
    return new Promise(function(res){
      var t0 = Date.now();
      (function ver(){
        try {
          var S = window.BPStore;
          if (S && S.ready) { S.ready.then(function(){ res(S); }, function(){ res(S); }); return; }
          if (S && Date.now() - t0 > 8000) { Promise.resolve(S.init()).then(function(){ res(S); }, function(){ res(S); }); return; }
          if (!S && Date.now() - t0 > 12000) { res(null); return; }
        } catch (e) { res(null); return; }
        setTimeout(ver, 250);
      })();
    });
  }
  function clavePublica(){
    try {
      var url = (typeof PORTAL_SUPABASE_URL === 'string' && PORTAL_SUPABASE_URL) || window.PORTAL_SUPABASE_URL || (window.bairenSupabase && window.bairenSupabase.supabaseUrl) || '';
      var key = (typeof PORTAL_SUPABASE_KEY === 'string' && PORTAL_SUPABASE_KEY) || window.PORTAL_SUPABASE_KEY || (window.bairenSupabase && window.bairenSupabase.supabaseKey) || '';
      return url && key ? { url: url.replace(/\/$/, ''), key: key } : null;
    } catch (e) { return null; }
  }
  /* Sin store: POST directo a REST con la clave pública. Nunca lanza. */
  function postDirecto(datos){
    try {
      var c = clavePublica(); if (!c || typeof fetch !== 'function') return;
      fetch(c.url + '/rest/v1/eventos', { method: 'POST', keepalive: true, headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Profile': 'portal', 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ evento: 'error_js', datos: datos }) }).catch(function(){});
    } catch (e) {}
  }
  function mandar(datos){
    storeListo().then(function(S){
      try {
        datos.modo = modo();
        if (S) {
          if (rechazoPorSupabaseEnLocal(datos, datos.modo)) return;
          if (typeof S.track !== 'function') return;
          Promise.resolve(S.track('error_js', { datos: datos })).catch(function(){});
        } else postDirecto(datos);
      } catch (e) {}
    }, function(){});
  }
  function registrar(d){
    try {
      if (!d.msg) return;
      d.msg = String(d.msg).replace(/^Uncaught (\(in promise\) )?/, '');   /* Chrome antepone "Uncaught "; Firefox y Safari no: así agrupan igual */
      if (/ResizeObserver loop/i.test(d.msg)) return;
      if (/^Script error\.?$/.test(d.msg) && !d.stack) return;
      if (d.tipo === 'error' && !origenPropio(d.src)) return;      /* extensiones y scripts de otros dominios */
      if (d.tipo === 'rechazo' && /\w+-extension:\/\//.test(d.stack)) return;   /* promesa rechazada dentro de una extensión */
      if (storeInicio && rechazoPorSupabaseEnLocal(d, modo())) return;           /* si el modo ya se sabe, ni se cuenta */
      var reg = leer(), pag = location.pathname, clave = [d.msg, d.src, d.linea].join('|');
      if (reg.claves.indexOf(clave) > -1) return;
      if ((reg.paginas[pag] || 0) >= MAX_POR_PAGINA) return;
      reg.claves.push(clave); if (reg.claves.length > 200) reg.claves.splice(0, reg.claves.length - 200);
      reg.paginas[pag] = (reg.paginas[pag] || 0) + 1;
      guardar(reg);
      mandar({ tipo: d.tipo, msg: corte(limpiar(d.msg), MAX_MSG), src: corte(limpiar(d.src), MAX_SRC), linea: d.linea == null ? null : Number(d.linea) || 0, col: d.col == null ? null : Number(d.col) || 0, stack: corte(limpiar(d.stack), MAX_STACK), pagina: pagina(), ua: corte(navigator.userAgent, MAX_UA), lang: corte(idioma(), 12), modo: modo() });
    } catch (e) {}
  }
  function deError(e){
    try {
      /* Un error de carga de un recurso (img, script) no llega a window sin captura; acá solo entran excepciones (ErrorEvent) */
      if (!e || typeof e.message !== 'string') return;
      var err = e.error;
      registrar({ tipo: 'error', msg: e.message || (err && err.message) || (err ? String(err) : ''), src: e.filename || '', linea: e.lineno, col: e.colno, stack: (err && err.stack) || '' });
    } catch (x) {}
  }
  function deRechazo(e){
    try {
      var r = e && e.reason, msg, stack = '';
      /* De un objeto solo se toman campos de error conocidos: nunca se serializa entero (podría traer datos de la gente) */
      if (r && typeof r === 'object') { msg = r.message || r.error_description || (r.error && r.error.message) || r.msg || r.code || r.name || 'rechazo sin mensaje'; stack = r.stack || ''; }
      else msg = r == null ? 'rechazo sin mensaje' : String(r);
      /* El archivo sale del stack; solo si es del propio origen (un stack en el SDK o en una extensión no dice nada nuestro) */
      var m = /(https?:\/\/[^\s)]+?):(\d+):(\d+)/.exec(stack || ''), propio = m && origenPropio(m[1]);
      registrar({ tipo: 'rechazo', msg: msg, src: propio ? m[1] : '', linea: propio ? m[2] : null, col: propio ? m[3] : null, stack: stack });
    } catch (x) {}
  }
  try { window.addEventListener('error', deError); window.addEventListener('unhandledrejection', deRechazo); } catch (e) {}
  /* Para las pruebas: el registro de la sesión y la lista de ignorados */
  try { window.BPErrores = { sesion: leer, reiniciar: function(){ guardar({ claves: [], paginas: {} }); }, MAX_POR_PAGINA: MAX_POR_PAGINA }; } catch (e) {}
})();
