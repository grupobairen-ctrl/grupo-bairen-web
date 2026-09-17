/**
 * Supabase del PORTAL — BAIREN
 *
 * Desde el 16/9/2026 el portal comparte proyecto de Supabase con Bairen OS
 * (proyecto bairen OS, jdatlsrujgfmvyuhoffg, São Paulo): un solo sistema, una
 * sola base, una sola cuenta. El portal vive en el esquema `portal`; el OS en
 * `public`. Sigue separado del proyecto de bairengroup.com (la web).
 *
 * ─────────────────────────────────────────────────
 * Las dos líneas de abajo salen de Supabase → proyecto bairen OS → Project Settings → API:
 *   "Project URL"  → PORTAL_SUPABASE_URL
 *   "anon public"  → PORTAL_SUPABASE_KEY (la misma que usa el OS; NO la "service_role")
 *
 * La clave pública puede ir en el código: es pública por diseño. Lo que protege
 * los datos son las políticas por fila del esquema, en portal/schema-portal.sql.
 * El único secreto de verdad es la "service_role", que nunca va al navegador.
 *
 * Historia: del 4/9 al 16/9/2026 el portal tuvo proyecto propio (BAIREN PORTAL,
 * dahusnnbyrvltcuaelxj, Oregon). Se mudó al del OS en el paso A4 de la unificación.
 * ─────────────────────────────────────────────────
 */

const PORTAL_SUPABASE_URL = 'https://jdatlsrujgfmvyuhoffg.supabase.co';
const PORTAL_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYXRsc3J1amdmbXZ5dWhvZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzcyNTYsImV4cCI6MjA5NDQ1MzI1Nn0.g9B1EoHkVeAcDJ2KNuMjwMW2_5Y6Xk2IlWjdQRrob2o';

window.bairenReady = new Promise((resolve, reject) => {
  if (!PORTAL_SUPABASE_URL || !PORTAL_SUPABASE_KEY) {
    reject(new Error('portal sin proyecto configurado'));
    return;
  }
// bairenCookieStorage (B4, 17/9/2026): la sesión de Supabase se guarda en una cookie del dominio
  // .bairengroup.com, en trozos de 3000 caracteres, para que el portal y os.bairengroup.com
  // compartan la misma sesión. Fuera de bairengroup.com (localhost, *.vercel.app) vale null y el
  // SDK sigue usando localStorage como siempre. Copia exacta en assets/js/supabase.js (OS) (cambiar los dos juntos).
  (function () {
    var DOMINIO = '.bairengroup.com';
    var TROZO = 3000;
    var MAX_TROZOS = 8;
    var UN_ANIO = 60 * 60 * 24 * 365;
  
    function enDominio() {
      var h = window.location.hostname;
      return window.location.protocol === 'https:' && (h === 'bairengroup.com' || /\.bairengroup\.com$/.test(h));
    }
    function leerCruda(nombre) {
      var partes = document.cookie.split('; ');
      for (var i = 0; i < partes.length; i++) {
        if (partes[i].indexOf(nombre + '=') === 0) return partes[i].slice(nombre.length + 1);
      }
      return null;
    }
    function escribir(nombre, valor, maxAge) {
      document.cookie = nombre + '=' + valor + '; Domain=' + DOMINIO + '; Path=/; Max-Age=' + maxAge + '; Secure; SameSite=Lax';
    }
  
    window.bairenCookieStorage = enDominio() ? {
      getItem: function (key) {
        var trozos = [];
        for (var i = 0; i < MAX_TROZOS; i++) {
          var t = leerCruda(key + '.' + i);
          if (t === null) break;
          trozos.push(t);
        }
        if (!trozos.length) return null;
        try { return decodeURIComponent(trozos.join('')); } catch (e) { return null; }
      },
      setItem: function (key, value) {
        this.removeItem(key);
        var cod = encodeURIComponent(String(value));
        var n = Math.ceil(cod.length / TROZO);
        if (n > MAX_TROZOS) { console.warn('bairenCookieStorage: sesión demasiado grande (' + cod.length + ')'); n = MAX_TROZOS; }
        for (var i = 0; i < n; i++) escribir(key + '.' + i, cod.slice(i * TROZO, (i + 1) * TROZO), UN_ANIO);
      },
      removeItem: function (key) {
        for (var i = 0; i < MAX_TROZOS; i++) {
          if (leerCruda(key + '.' + i) === null) break;
          escribir(key + '.' + i, '', 0);
        }
      }
    } : null;
  })();
  
function init() {
    try {
      window.bairenSupabase = window.supabase.createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storage: window.bairenCookieStorage || undefined },
        db: { schema: 'portal' }
      });
      resolve(window.bairenSupabase);
    } catch (err) {
      console.error('[bairen portal] no se pudo inicializar Supabase:', err);
      reject(err);
    }
  }
  if (window.supabase && typeof window.supabase.createClient === 'function') { init(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.108.2/dist/umd/supabase.js';
  s.onload = init;
  s.onerror = () => reject(new Error('no se pudo cargar el SDK de Supabase'));
  document.head.appendChild(s);
});
/* 11/9 · Si el SDK no carga, la promesa rechaza. store.js ya lo maneja (cae a modo local), pero hasta que
   engancha su handler el rechazo quedaba "sin consumidor" y pintaba una excepción roja en la consola de
   todas las páginas. Este catch vacío solo marca el rechazo como atendido; no cambia nada más. */
window.bairenReady.catch(() => {});
