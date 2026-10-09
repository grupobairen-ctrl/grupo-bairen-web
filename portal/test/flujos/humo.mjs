import { conectar, sleep } from './cdp.mjs';
import { limpiar, ingresarLocal } from './flujo.mjs';
const c = await conectar(); await c.vista(true); const r = {};
await limpiar(c); await c.ir('ingresar.html', 900); await ingresarLocal(c, 'humo@ejemplo.com');
for (const p of ['index.html','buscar.html?op=mediano','guardados.html','emprendimientos.html','publicadores.html','criterios.html','membership.html','legales.html','publicar.html','publicar-aviso.html','panel.html','panel.html#cuenta','curacion.html','importar.html']) {
  await c.ir(p, 1800); r[p] = await c.ev('(document.querySelector("h1,h2")||{}).textContent ? ((document.querySelector("h1,h2").textContent||"").trim().slice(0,30)) : "(sin título)"');
}
const f = await c.ev('location.href="buscar.html"; 1'); await sleep(2500); const fu = await c.ev('([...document.querySelectorAll("a")].map(a=>a.getAttribute("href")).find(h=>/propiedad/.test(h||""))||"")'); await c.ir(fu.replace(/^\/portal\//,''), 2500); r.ficha = await c.ev('document.title');
const e = await c.ev('JSON.stringify(window.__errs||[])');
console.log(JSON.stringify(r, null, 1)); process.exit(0);
