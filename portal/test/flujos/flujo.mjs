/* Ayudas para el recorrido nuevo de publicar (tanda 2). */
import { sleep, SP } from './cdp.mjs';
export const DESC = 'Departamento de dos ambientes, luminoso, con balcón al frente, cocina integrada y lavadero. Edificio con seguridad y SUM. A metros de la plaza y del subte, con la cuadra arbolada y comercios a mano.';
export const FOTOS = [1,2,3,4,5,6,7,8,9].map(i => SP + '/fotos-prueba/foto' + i + (i <= 5 ? '.jpg' : '.webp'));
export async function limpiar(c){ await c.ir('index.html', 300); await c.ev('localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase("bairen-portal"); true'); }
export const pantalla = c => c.ev('document.body.dataset.pantalla || ""');
export const toast = c => c.ev('(document.getElementById("bpToast")||{}).textContent || ""');
export const avisos = c => c.ev('JSON.parse(localStorage.getItem("bp_avisos")||"[]")');
export const pubs = c => c.ev('JSON.parse(localStorage.getItem("bp_publicadores")||"[]")');
/* Espera a que la pantalla sea la pedida (o cambie) */
export async function esperar(c, nombre, ms = 6000){ for (let i = 0; i < ms / 100; i++) { const p = await pantalla(c); if (!nombre ? p : p === nombre) return p; await sleep(100); } return await pantalla(c); }
export async function seguir(c, ms = 700){ const antes = await pantalla(c); await c.ev('document.getElementById("pfSeguir").click(); true'); for (let i = 0; i < 60; i++) { await sleep(100); const p = await pantalla(c); const busy = await c.ev('!!(document.getElementById("pfSeguir")||{}).disabled'); if (p !== antes || !busy) break; } await sleep(ms); return pantalla(c); }
export const atras = async (c, ms = 700) => { await c.ev('document.getElementById("pfAtras").click(); true'); await sleep(ms); return pantalla(c); };
/* Valores de campos por id f-<nombre>, con change */
export const set = (c, campos) => c.ev(`(function(){ const v=${JSON.stringify(campos)}; for (const k in v) { const e=document.getElementById('f-'+k); if(!e) return 'falta '+k; e.value=v[k]; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); } return true; })()`);
/* Elegir un chip (radio) o marcar casillas por name y value */
export const chip = (c, name, value) => c.ev(`(function(){ const i=document.querySelector('input[name="${name}"][value="${value}"]'); if(!i) return 'no está ${name}=${value}'; i.closest('label').click(); return i.checked; })()`);
export const marcar = (c, name, values) => c.ev(`(function(){ const r=[]; for (const v of ${JSON.stringify(values)}) { const i=document.querySelector('input[name="${name}"][value="'+v+'"]'); if(!i){ r.push('no está '+v); continue;} if(!i.checked) i.closest('label').click(); r.push(i.checked); } return r; })()`);
/* Menos y más: pone el valor n en un stepper */
export const pasos = (c, name, n) => c.ev(`(function(){ const s=document.getElementById('f-${name}').closest('.pf-stepper'); const inp=s.querySelector('input'); let g=0; while(Number(inp.value||0)<${n} && g++<20) s.querySelector('[data-d="1"]').click(); while(Number(inp.value||0)>${n} && g++<40) s.querySelector('[data-d="-1"]').click(); return Number(inp.value||0); })()`);
/* Medidas de la pantalla: palabras visibles, scroll horizontal, Continuar a la vista */
export const medir = c => c.ev(`(function(){
  const raices = ['.pf-top', '#pfPantalla', '#pfPie']; let txt = '';
  for (const r of raices) { const e = document.querySelector(r); if (!e) continue; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; if (!p || p.closest('select,.pf-sr,[hidden],script,style')) return NodeFilter.FILTER_REJECT; if (p.checkVisibility && !p.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } }); while (w.nextNode()) txt += ' ' + w.currentNode.nodeValue; }
  document.querySelectorAll('#pfPantalla select').forEach(s => { if (s.checkVisibility() && s.selectedOptions[0]) txt += ' ' + s.selectedOptions[0].text; });
  const palabras = txt.trim().split(/\\s+/).filter(x => /[\\p{L}\\p{N}]/u.test(x)).length;
  const b = document.getElementById('pfSeguir') || document.querySelector('#pfPie a'); const r = b ? b.getBoundingClientRect() : null;
  return { pantalla: document.body.dataset.pantalla, palabras, scrollX: document.documentElement.scrollWidth > window.innerWidth + 1, anchoDoc: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight, continuarVisible: !!r && r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0, boton: b ? b.textContent.trim() : null, salir: (document.getElementById('pfSalir')||{}).textContent };
})()`);
/* Sube fotos al input y espera a que terminen */
export async function fotos(c, archivos){ await c.archivos('#fotosIn', archivos); await sleep(400); for (let i = 0; i < 120; i++) { await sleep(250); const s = await c.ev('({n: document.querySelectorAll(".pf-foto:not(.sube)").length, sube: document.querySelectorAll(".pf-foto.sube").length, dis: !!document.getElementById("pfSeguir").disabled})'); if (!s.sube && !s.dis) break; } await sleep(300); return c.ev('document.querySelectorAll(".pf-foto:not(.sube)").length'); }
/* Ingresa en modo local con un mail y vuelve a publicar */
export async function ingresarLocal(c, mail){
  await c.ev('localStorage.removeItem("bp_user"); true');
  await c.esperarCarga(800);
  for (let i = 0; i < 30; i++) { if (await c.ev('!!document.getElementById("email")')) break; await sleep(200); }
  await c.ev(`document.getElementById("email").value=${JSON.stringify(mail)}; document.getElementById("btnMail").click(); true`); await sleep(1200);
  const code = await c.ev('JSON.parse(localStorage.getItem("bp_code")).code');
  await c.ev(`document.getElementById("code").value="${code}"; document.getElementById("btnCode").click(); true`); await sleep(1800);
  await c.esperarCarga(1000);
}
