/* La cuenta en el celular y los pagos de todos (9/10). En modo local:
   BP_PUERTO=8107 BP_CHROME=9307 BP_CAPTURAS=<carpeta> node portal/test/rieles/cuenta.mjs
   · el menú muestra Pagos, Tu identidad y Membresía también con la barra de abajo;
   · la pestaña Cuenta abre Mi cuenta, con los accesos arriba;
   · Pagos: "Todos" solo para el equipo (en local, con bp_equipo = '1'), solo lectura y con quién paga a quién. */
import { conectar, sleep } from '../flujos/cdp.mjs';
const c = await conectar();
const R = []; const ok = (n, v, x) => { R.push((v ? 'OK    ' : 'FALLA ') + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); };
await c.vista(true);
await c.ir('index.html', 400);
await c.ev(`document.cookie = 'bp_cerrado=; path=/; max-age=0'; localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bp_user', JSON.stringify({id:'local-ana',email:'ana@prueba.local',perfil:'busca'})); localStorage.setItem('bp_publicadores', JSON.stringify([{ id:'pub-gestora', slug:'g', tipo:'gestor', nombre:'Gestora Prueba', auth_user_id:'local-pablo', verificado:true, whatsapp:'5491100000000' }])); true`);
/* 1 · menú del celular con la barra de abajo */
await c.ir('index.html', 1800);
await c.ev(`document.querySelector('.burger, [class*="burger"]').click(); true`); await sleep(600);
const vis = await c.ev(`JSON.stringify([...document.querySelectorAll('#mobileMenu .m-cuenta a')].map(a => [a.textContent, !!(a.offsetWidth || a.offsetHeight)]))`);
ok('menú: Pagos visible con la barra de abajo', JSON.parse(vis).some(x => x[0] === 'Pagos' && x[1]), vis);
await c.foto('1-menu');
/* 2 · pestaña Cuenta → Mi cuenta con los accesos */
const href = await c.ev(`(document.querySelector('#pTabbar [data-tab="cuenta"]')||{}).getAttribute ? document.querySelector('#pTabbar [data-tab="cuenta"]').getAttribute('href') : ''`);
ok('pestaña Cuenta lleva a Mi cuenta', /panel\.html#cuenta$/.test(href), href);
await c.ir(href, 2200);
const at = await c.ev(`JSON.stringify([...document.querySelectorAll('.p-atajos > .p-atajo .t')].map(x => x.firstChild.textContent))`);
ok('Mi cuenta: accesos arriba', JSON.parse(at)[0] === 'Pagos', at);
ok('Mi cuenta: sin scroll horizontal', await c.ev('document.documentElement.scrollWidth <= innerWidth + 1'));
await c.foto('2-cuenta');
/* 3 · Pagos de todos */
const op = await c.ev(`BPDigital.abrir({ id:'aviso-1', publicador_id:'pub-gestora', operacion:'mediano', precio:1200, moneda:'USD', titulo:'Dos ambientes en Palermo', barrio:'Palermo' }, 'Hola').then(o => o.id || o)`);
await c.ev(`(()=>{ const hoy = new Date(); const per = d => d.toISOString().slice(0,7); const dia = d => d.toISOString().slice(0,10);
  const m1 = new Date(hoy); m1.setDate(m1.getDate() - 5); const m2 = new Date(hoy); m2.setMonth(m2.getMonth() + 1);
  localStorage.setItem('bp_dg_pg_reservas', JSON.stringify([{ id:'res-1', operacion_id:${JSON.stringify(op)}, publicador_id:'pub-gestora', monto:300, moneda:'USD', vence_en:new Date(Date.now()+2*864e5).toISOString(), estado:'pedida', proveedor:'manual', pedida_en:new Date().toISOString() }]));
  localStorage.setItem('bp_dg_pg_pagos', JSON.stringify([
    { id:'pg-1', operacion_id:${JSON.stringify(op)}, publicador_id:'pub-gestora', concepto:'alquiler', periodo:per(hoy), monto:1200, moneda:'USD', vencimiento:dia(m1), estado:'pagado', proveedor:'manual', pagado_en:new Date().toISOString(), recibo:1 },
    { id:'pg-2', operacion_id:${JSON.stringify(op)}, publicador_id:'pub-gestora', concepto:'alquiler', periodo:per(m2), monto:1200, moneda:'USD', vencimiento:dia(m2), estado:'pendiente' } ]));
  return true; })()`);
await c.ir('pagos.html', 2000);
ok('sin bp_equipo: no hay pestaña Todos', !(await c.ev(`!!document.querySelector('[data-vista="todos"]')`)));
await c.ev(`localStorage.setItem('bp_equipo','1'); true`);
await c.ir('pagos.html', 2000);
const h1 = await c.ev(`(document.querySelector('.pg-h1')||{}).textContent`);
ok('equipo: entra directo a Pagos de todos', h1 === 'Pagos de todos', h1);
ok('equipo: estado en una línea', /1 operación|Una operación/.test(await c.ev(`document.querySelector('.pg-estado').textContent`)), await c.ev(`document.querySelector('.pg-estado').textContent`));
ok('equipo: quién paga y a quién', /→ Gestora Prueba/.test(await c.ev(`(document.querySelector('.pg-u-s')||{}).textContent`)), await c.ev(`(document.querySelector('.pg-u-s')||{}).textContent`));
ok('equipo: solo lectura (sin Confirmar, Marcar ni Anular)', await c.ev(`!document.querySelector('#pgVista [data-confirmar], #pgVista [data-marcar], #pgVista [data-anular]')`));
ok('equipo: sin scroll horizontal', await c.ev('document.documentElement.scrollWidth <= innerWidth + 1'));
await c.ev(`document.querySelector('details.pg-unidad').open = true; true`); await sleep(300);
await c.foto('3-todos', true);
await c.ev(`document.querySelector('[data-vista="mis"]').click(); true`); await sleep(500);
ok('pestaña Mis pagos sigue andando', (await c.ev(`document.querySelector('.pg-h1').textContent`)) === 'Mis pagos' && /vista/.test(await c.ev('location.search')) === false);
await c.vista(false); await c.ir('pagos.html?vista=todos', 2000); await c.foto('4-todos-compu');
ok('compu: sin scroll horizontal', await c.ev('document.documentElement.scrollWidth <= innerWidth + 1'));
const errs = (c.errores || []).concat(c.consola || []);
ok('sin errores de página', !errs.length, errs);
console.log(R.join('\n'));
const n = R.filter(x => x.startsWith('FALLA')).length;
console.log(n ? n + ' FALLAS' : 'TODO OK');
process.exit(n ? 1 : 0);
