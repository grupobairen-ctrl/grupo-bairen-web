import { conectar, sleep } from './cdp.mjs';
import { avisos, pubs } from './flujo.mjs';
const c = await conectar(); await c.vista(true);
await c.ir('index.html', 300);
const pub = (await pubs(c))[0];
const base = { publicador_id: pub.id, tipo: 'Departamento', ciudad: 'Capital Federal', moneda: 'USD', amenities: ['Pileta'], fotos: [], descripcion: 'x'.repeat(160), estado: 'disponible', estado_curacion: 'en_revision', quiero_produccion: true, updated_at: new Date().toISOString() };
const l = [Object.assign({}, base, { id: 'lc1', codigo: 'BA-CUR1V-AAA', titulo: 'Torre Prueba · 4° A', operacion: 'venta', direccion: 'Av. del Libertador 7200', unidad: '4° A', barrio: 'Núñez', zona: 'Núñez', precio: 185000, m2_total: 58, ambientes: 2, emprendimiento: 'Torre Prueba', etapa: 'construccion', entrega: 'Diciembre 2027', estado: 'reservado', caracteristicas: [] }),
           Object.assign({}, base, { id: 'lc2', codigo: 'BA-CUR2M-AAA', operacion: 'mediano', direccion: 'Arenales 1000', unidad: '5 A', barrio: 'Retiro', zona: 'Retiro', precio: 1400, m2_total: 45, ambientes: 2, plazo: '3 meses', disponible_desde: '2026-11-01', caracteristicas: ['Expensas incluidas', 'Internet incluido'] })];
await c.ev(`localStorage.setItem("bp_avisos", JSON.stringify(${JSON.stringify(l)})); true`);
await c.ir('curacion.html', 1500);
console.log(await c.ev('Array.from(document.querySelectorAll(".p-cur")).map(x=>Array.from(x.querySelectorAll(".m")).map(m=>m.textContent).join(" || ")).join("\\n")'));
await c.fotoDe('m-curacion-nuevos', '.p-cur', 6);
console.log(JSON.stringify({ e: c.errores, k: c.consola })); await c.cerrar(); process.exit(0);
