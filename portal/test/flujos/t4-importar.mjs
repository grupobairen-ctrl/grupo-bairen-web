/* E · Importar un CSV con las columnas nuevas (estadia_minima, incluye, disponible_desde), en celular o compu */
import { conectar, sleep, SP } from './cdp.mjs';
import { limpiar, seguir, set, avisos, toast, ingresarLocal, esperar } from './flujo.mjs';
const c = await conectar(); const mob = process.argv[2] !== 'desktop'; await c.vista(mob); const P = (mob ? 'm' : 'd') + '-importar-';
const out = {};
await limpiar(c);
await c.ir('publicar-aviso.html?perfil=gestor', 900); await seguir(c, 300);
await ingresarLocal(c, 'gestor.imp@ejemplo.com'); await esperar(c, 'empresa');
await set(c, { nombre: 'Gestora Importa', whatsapp: '1122223333', cuit: '30-71111111-1' }); await seguir(c);
await c.ir('importar.html', 1200);
out.textoArriba = await c.ev('document.querySelector(".p-band .p-sub").textContent.slice(0, 80)');
out.columnas = await c.ev('document.querySelector(".p-kicker").textContent.match(/Para mediano plazo[^.]*\\./)[0]');
await c.archivos('#fileIn', [SP + '/datos/import-nuevo.csv']); await sleep(1200);
out.mapeo = await c.ev('["estadia_minima","incluye","disponible_desde"].map(k=>{const s=document.querySelector("#mapa select[data-k="+k+"]"); return k+"->"+(s && s.selectedOptions[0].text)}).join(", ")');
out.preview = await c.ev('Array.from(document.querySelectorAll("#prev tbody tr")).map(r=>r.innerText.replace(/\\t/g," | ")).join(" || ")');
await c.foto(P + 'preview', true);
await c.ev('document.getElementById("importar").click(); true'); await sleep(2500);
out.toast = await toast(c);
await c.esperarCarga(1200);
out.importados = (await avisos(c)).map(a => [a.codigo_interno, a.operacion, a.moneda, a.precio, a.plazo, a.disponible_desde, (a.caracteristicas||[]).join('+'), a.amoblado, a.estado_curacion].join(' | '));
/* reimportar: no duplica y no pisa la estadía si la columna viene vacía */
out.errores = c.errores; out.consola = c.consola;
console.log(JSON.stringify(out, null, 1)); await c.cerrar(); process.exit(0);
