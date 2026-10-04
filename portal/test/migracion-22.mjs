import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
/* Ensayo de la migración 22 en un Postgres en memoria (PGlite), con auth.uid() simulado y roles anon y authenticated.
   Uso: npm i @electric-sql/pglite@0.3 en una carpeta aparte y correr desde ahí con W apuntando a portal/. */
const W = process.env.W || './portal/';
const db = new PGlite();
const U = { P: '11111111-1111-1111-1111-111111111111', M1: '22222222-2222-2222-2222-222222222222', M2: '33333333-3333-3333-3333-333333333333', M3: '44444444-4444-4444-4444-444444444444', M4: '55555555-5555-5555-5555-555555555555' };
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create schema portal; grant usage on schema portal to anon, authenticated;
create table portal.publicadores (id uuid primary key default gen_random_uuid(), slug text unique, nombre text, tipo text, auth_user_id uuid);
create table portal.avisos (id uuid primary key default gen_random_uuid(), publicador_id uuid references portal.publicadores, operacion text, precio numeric, ambientes int, estado_curacion text);
create table portal.alertas (id uuid primary key default gen_random_uuid(), usuario_id uuid not null, tipo text, filtros jsonb);
create table portal.personas (id uuid primary key default gen_random_uuid(), auth_user_id uuid);
create table portal.membresias (id uuid primary key default gen_random_uuid(), persona_id uuid, publicador_id uuid, titular boolean default false, hasta timestamptz);
create table portal.membresia_permisos (membresia_id uuid, area text, nivel text);
grant select on portal.avisos, portal.publicadores to anon, authenticated;
create or replace function portal.tiene_permiso(p_area text, p_nivel text, p_publicador uuid)
returns boolean language sql stable security definer set search_path = portal, public as $$
  select p_publicador is not null and p_nivel in ('ver', 'editar') and exists (
    select 1 from portal.membresias m join portal.personas p on p.id = m.persona_id
    where p.auth_user_id = auth.uid() and m.hasta is null and m.publicador_id = p_publicador
      and (m.titular or exists (select 1 from portal.membresia_permisos mp where mp.membresia_id = m.id and mp.area = p_area and (mp.nivel = 'editar' or p_nivel = 'ver')))) $$;
create or replace function portal.es_curador() returns boolean language sql stable security definer as $$ select false $$;
grant execute on function portal.tiene_permiso(text,text,uuid), portal.es_curador() to authenticated;
insert into auth.users values ('${U.P}','corredor@x.com'),('${U.M1}','m1@x.com'),('${U.M2}','m2@x.com'),('${U.M3}','m3@x.com'),('${U.M4}','m4@x.com');
insert into portal.publicadores (id, slug, nombre, tipo) values ('aaaaaaaa-0000-0000-0000-000000000001','alvear','Alvear Propiedades','profesional');
insert into portal.personas (id, auth_user_id) values ('bbbbbbbb-0000-0000-0000-000000000001','${U.P}');
insert into portal.membresias (persona_id, publicador_id, titular) values ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001', true);
insert into portal.avisos (id, publicador_id, operacion, precio, ambientes, estado_curacion) values
 ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','venta',650000,3,'publicado'),
 ('cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','venta',650000,3,'borrador');
insert into portal.alertas (usuario_id, tipo, filtros) values
 ('${U.M1}','busqueda','{"key":"mi-busqueda","op":"venta","zonas":["Palermo"],"amb":3,"pmax":700000,"red":{"imprescindibles":["cochera","vista"]}}'),
 ('${U.M2}','busqueda','{"key":"mi-busqueda","op":"venta","zonas":["Palermo","Recoleta"],"amb":3,"pmax":900000,"red":{"imprescindibles":["cochera"]}}'),
 ('${U.M3}','busqueda','{"key":"mi-busqueda","op":"venta","zonas":["Palermo"],"amb":3,"pmax":610000,"red":{"imprescindibles":["vista"]}}'),
 ('${U.M4}','busqueda','{"key":"mi-busqueda","op":"venta","zonas":["Recoleta"],"amb":2,"pmax":400000}'),
 ('${U.M1}','busqueda','{"key":"otra-cosa","op":"venta","zonas":["Palermo"]}');
`);
const mig = readFileSync(W + 'migracion-22-red-miembros.sql', 'utf8');
const r = await db.exec(mig);
console.log('Tablero:'); console.table(r.at(-1).rows);
const como = async (uid, sql, rol = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); set role ${rol};`);
  try { const x = await db.query(sql); await db.exec('reset role'); return x.rows; } catch (e) { await db.exec('reset role'); return 'ERROR: ' + e.message; }
};
const J = x => typeof x === 'string' ? x : JSON.stringify(x);
console.log('demanda como corredor:', J(await como(U.P, `select * from portal.demanda_agregada()`)));
console.log('demanda como miembro (no publica):', J(await como(U.M1, `select * from portal.demanda_agregada()`)));
console.log('demanda como anon:', J(await como(null, `select * from portal.demanda_agregada()`, 'anon')));
console.log('vista aplanada como miembro:', J(await como(U.M1, `select * from portal.busquedas_red`)));
console.log('enviar (aviso borrador):', J(await como(U.P, `select portal.enviar_propuesta('cccccccc-0000-0000-0000-000000000002','Palermo','venta',3,600000,1000000,'hola')`)));
console.log('enviar como miembro:', J(await como(U.M1, `select portal.enviar_propuesta('cccccccc-0000-0000-0000-000000000001','Palermo','venta',3,600000,1000000,'hola')`)));
console.log('enviar como corredor:', J(await como(U.P, `select portal.enviar_propuesta('cccccccc-0000-0000-0000-000000000001','Palermo','venta',3,600000,1000000,'Tiene la cochera que buscás')`)));
console.log('reenviar (no duplica):', J(await como(U.P, `select portal.enviar_propuesta('cccccccc-0000-0000-0000-000000000001','Palermo','venta',3,600000,1000000,null)`)));
console.log('M1 ve las suyas:', J(await como(U.M1, `select estado, nota from portal.propuestas`)));
console.log('M4 ve las suyas:', J(await como(U.M4, `select * from portal.propuestas`)));
console.log('M1 responde interesa:', J(await como(U.M1, `update portal.propuestas set estado='interesa' returning estado, respondida is not null as fecha`)));
console.log('M2 responde no con motivo:', J(await como(U.M2, `update portal.propuestas set estado='no_gracias', motivo='precio' returning estado, motivo`)));
console.log('M1 intenta cambiar la nota:', J(await como(U.M1, `update portal.propuestas set nota='x'`)));
console.log('M1 intenta volver a enviada:', J(await como(U.M1, `update portal.propuestas set estado='enviada'`)));
console.log('M1 intenta insertar:', J(await como(U.M1, `insert into portal.propuestas (aviso_id, publicador_id, usuario_destino) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','${U.M1}')`)));
console.log('corredor lee la tabla directo:', J(await como(U.P, `select * from portal.propuestas`)));
console.log('mis enviadas (corredor):', J(await como(U.P, `select enviadas, interesa, no_gracias, por_precio, contactos from portal.mis_propuestas_enviadas('aaaaaaaa-0000-0000-0000-000000000001')`)));
console.log('mis enviadas (miembro):', J(await como(U.M1, `select * from portal.mis_propuestas_enviadas('aaaaaaaa-0000-0000-0000-000000000001')`)));
console.log('obra: anon lee:', J(await como(null, `select count(*)::int n from portal.obra_eventos`, 'anon')));
console.log('obra: corredor escribe:', J(await como(U.P, `insert into portal.obra_eventos (publicador_id, emprendimiento, titulo, porcentaje) values ('aaaaaaaa-0000-0000-0000-000000000001','Torre Alcorta','Estructura',40) returning titulo`)));
console.log('obra: miembro escribe:', J(await como(U.M1, `insert into portal.obra_eventos (publicador_id, emprendimiento, titulo) values ('aaaaaaaa-0000-0000-0000-000000000001','Torre Alcorta','Falso')`)));
console.log('obra: anon escribe:', J(await como(null, `insert into portal.obra_eventos (publicador_id, emprendimiento, titulo) values ('aaaaaaaa-0000-0000-0000-000000000001','x','y')`, 'anon')));
console.log('seguir: M1 sigue Palermo:', J(await como(U.M1, `insert into portal.seguimientos (tipo, ref) values ('barrio','Palermo') returning tipo, ref`)));
console.log('seguir: M2 ve los de M1:', J(await como(U.M2, `select * from portal.seguimientos`)));
console.log('seguir: M1 inserta a nombre de M2:', J(await como(U.M1, `insert into portal.seguimientos (usuario_id, tipo, ref) values ('${U.M2}','barrio','x')`)));
console.log('2da corrida de la 22:', (await db.exec(mig)).at(-1).rows.map(x => x.ok).join(','));
const rb = readFileSync(W + 'migracion-22-red-miembros-rollback.sql', 'utf8');
const r2 = await db.exec(rb); console.table(r2.at(-1).rows);
console.log('respaldo de propuestas:', (await db.query(`select count(*)::int n from portal.propuestas_respaldo_22`)).rows[0].n);
console.log('3ra corrida tras rollback:', (await db.exec(mig)).at(-1).rows.map(x => x.ok).join(','));
