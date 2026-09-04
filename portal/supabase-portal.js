/**
 * Supabase del PORTAL — BAIREN
 *
 * El portal vive en su propio proyecto de Supabase, separado del que usa
 * bairengroup.com. Así, si algo se rompe acá, la web que ya vende no se toca.
 * El precio de esa separación: las cuentas del portal no son las del sitio.
 *
 * ────────────────────────────────────────────────────────────────────────
 * COMPLETAR LAS DOS LÍNEAS DE ABAJO con el proyecto NUEVO:
 *
 *   1. https://app.supabase.com → el proyecto del portal → Project Settings → API
 *   2. "Project URL"                    → PORTAL_SUPABASE_URL
 *   3. La clave "anon public" o "publishable" (NO la "service_role") → PORTAL_SUPABASE_KEY
 *
 * La clave pública puede ir en el código: es pública por diseño. Lo que protege
 * los datos son las políticas por fila del esquema, en portal/schema-portal.sql.
 * El único secreto de verdad es la "service_role", que nunca va al navegador.
 *
 * Mientras estas dos líneas estén vacías, el portal funciona en modo local:
 * todo se guarda en el navegador y nada sale a ningún lado.
 * ────────────────────────────────────────────────────────────────────────
 */

const PORTAL_SUPABASE_URL = '';
const PORTAL_SUPABASE_KEY = '';

window.bairenReady = new Promise((resolve, reject) => {
  if (!PORTAL_SUPABASE_URL || !PORTAL_SUPABASE_KEY) {
    reject(new Error('portal sin proyecto configurado'));
    return;
  }
  function init() {
    try {
      window.bairenSupabase = window.supabase.createClient(PORTAL_SUPABASE_URL, PORTAL_SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
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
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  s.onload = init;
  s.onerror = () => reject(new Error('no se pudo cargar el SDK de Supabase'));
  document.head.appendChild(s);
});
