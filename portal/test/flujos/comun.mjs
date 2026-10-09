/* Pasos comunes: sesión limpia, perfil de publicador y ayudas para el formulario. */
import { sleep, SP } from './cdp.mjs';
export const DESC = 'Departamento de dos ambientes, luminoso, con balcón al frente, cocina integrada y lavadero. Edificio con seguridad y SUM. A metros de la plaza y del subte, con la cuadra arbolada y comercios a mano.';
export const FOTOS = [1,2,3,4,5,6,7,8,9].map(i => SP + '/fotos-prueba/foto' + i + (i <= 5 ? '.jpg' : '.webp'));
export async function limpiar(c){ await c.ir('index.html', 300); await c.ev('localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase("bairen-portal"); true'); }
/* Entra y crea el publicador del tipo pedido (gestor, profesional, desarrolladora, dueno) */
export async function publicador(c, mail, tipo, nombre){
  await c.ingresar(mail, 'publicar');
  await c.ir('publicar-aviso.html?perfil=' + tipo, 1000);
  await c.ev(`(function(){ const r=document.querySelector('[name=tipo][value=${tipo}]'); r.checked=true; r.dispatchEvent(new Event('change')); const s=(n,v)=>{const e=document.querySelector('#perfilForm [name='+n+']'); if(e){e.value=v;}}; s('nombre',${JSON.stringify(nombre)}); s('responsable','Ana Prueba'); s('dni','30111222'); s('matricula','CUCICBA 1234'); s('cuit','30-11122233-4'); s('telefono','1100000000'); s('whatsapp','5491100000000'); return true; })()`);
  await c.ev('document.querySelector("[data-next]").click(); true'); await sleep(1500);
}
export const set = (c, campos) => c.ev(`(function(){ const v=${JSON.stringify(campos)}; for (const k in v) { const e=document.getElementById('f-'+k); if(!e) return 'falta '+k; e.value=v[k]; e.dispatchEvent(new Event('change',{bubbles:true})); } return true; })()`);
export const click = async (c, sel, ms = 1500) => { const r = await c.ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return 'no está'; b.click(); return true})()`); await sleep(ms); return r; };
export const toast = c => c.ev('(document.getElementById("bpToast")||{}).textContent || ""');
export const avisos = c => c.ev('JSON.parse(localStorage.getItem("bp_avisos")||"[]")');
