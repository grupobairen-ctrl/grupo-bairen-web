/**
 * Supabase config — Grupo Bairen
 *
 * Carga el SDK de Supabase JS v2 desde CDN y expone un cliente global
 * en `window.bairenSupabase`. Las páginas pueden esperar a que esté listo
 * con `window.bairenReady.then(client => ...)`.
 *
 * ────────────────────────────────────────────────────────────────────────
 * COMPLETAR LAS DOS LÍNEAS DE ABAJO:
 *
 *   1. Entrá a https://app.supabase.com → tu proyecto → Project Settings → API
 *   2. Copiá "Project URL"  → SUPABASE_URL
 *   3. Copiá la key "anon public" (NO la "service_role") → SUPABASE_ANON_KEY
 *
 * Por qué el ANON_KEY puede ir hardcodeado y no es un secret:
 *   - Es público por diseño de Supabase: lo que protege los datos es RLS
 *     (Row Level Security) configurado en el SQL del schema.
 *   - El único secret real es el `service_role` key, que NUNCA va al cliente.
 *   - Si alguna vez rotás el ANON_KEY: regenerás acá y re-deployás.
 * ────────────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL      = 'https://nmrjyyrhwjroonrppnka.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_D0YwiSL5Hm3GyOSx2r1lug_ZV7v46_n';

window.bairenReady = new Promise((resolve, reject) => {
  function init() {
    try {
      window.bairenSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      resolve(window.bairenSupabase);
    } catch (err) {
      console.error('[bairen] Error inicializando Supabase:', err);
      reject(err);
    }
  }

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    init();
    return;
  }

  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.async = false;
  s.onload = init;
  s.onerror = () => {
    const err = new Error('No se pudo cargar el SDK de Supabase desde la CDN.');
    console.error('[bairen]', err);
    reject(err);
  };
  document.head.appendChild(s);
});
