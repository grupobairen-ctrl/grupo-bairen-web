/* Reexporta las unidades publicadas de la web (public.propiedades, con fotos y
   amenities) a portal/data/avisos-src.json, con la clave pública del sitio.
   Uso: node portal/test/exportar-avisos.mjs
   Después: subir la versión de los assets (?v=) en las páginas del portal. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cfg = readFileSync(join(raiz, 'supabase-config.js'), 'utf8');
const url = (cfg.match(/SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
const key = (cfg.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/) || [])[1];
if (!url || !key) { console.error('No encontré SUPABASE_URL / SUPABASE_ANON_KEY en supabase-config.js'); process.exit(1); }
const res = await fetch(`${url}/rest/v1/propiedades?select=*,imagenes(url,orden),amenities(nombre)&publicada=eq.true&order=created_at.asc`, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
if (!res.ok) { console.error('Supabase respondió', res.status, await res.text()); process.exit(1); }
const units = await res.json();
units.forEach(u => { u.imagenes = (u.imagenes || []).sort((a, b) => (a.orden || 0) - (b.orden || 0)); });
/* El portal no muestra la línea del corredor dentro de una descripción (misma expresión que D.sinLineaCorredor en portal/js/data.js): cada reexportación entra limpia. */
const sinLineaCorredor = s => (s || '').replace(/(^|\n+)[ \t]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel)\s*:[^\n]*/gi, '').trim();
units.forEach(u => { for (const k of ['descripcion', 'descripcion_en', 'descripcion_pt']) if (u[k] != null) u[k] = sinLineaCorredor(u[k]); });
const destino = join(raiz, 'portal', 'data', 'avisos-src.json');
const antes = (() => { try { return JSON.parse(readFileSync(destino, 'utf8')); } catch (e) { return []; } })();
const viejos = new Set(antes.map(u => u.slug));
writeFileSync(destino, JSON.stringify(units, null, 1) + '\n');
console.log(`Escrito ${destino}: ${units.length} publicadas (antes ${antes.length}).`);
const nuevas = units.filter(u => !viejos.has(u.slug)); if (nuevas.length) console.log('Nuevas:', nuevas.map(u => `${u.dir} ${u.unidad || ''}`.trim()).join(' · '));
const idas = antes.filter(u => !units.some(x => x.slug === u.slug)); if (idas.length) console.log('Ya no publicadas:', idas.map(u => `${u.dir} ${u.unidad || ''}`.trim()).join(' · '));
