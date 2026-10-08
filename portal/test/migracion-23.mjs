/* Ensayo de la migración 23 en un Postgres en memoria (PGlite), con auth.uid()/auth.jwt() simulados y los roles de
   Supabase: anon, authenticated (un publicador, otro publicador, una cuenta nueva, el propietario de una unidad, un
   curador) y service_role (el servidor). Corre el esquema y las migraciones del portal que no dependen del OS, un
   doble del disparador del OS (sql/008-aviso-propiedad.sql de bairen-os, origin/main b8c70a9), la 23, cada control,
   una segunda corrida, el rollback y una tercera corrida.
   Uso (PGlite no está en el repo): en una carpeta aparte `npm i @electric-sql/pglite@0.3` y desde ahí
     W=<ruta a portal/> node <ruta a portal/test/migracion-23.mjs>
   Sale con código 1 si algún control no da lo esperado. No toca ninguna base real. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PGlite } = await import(createRequire(process.cwd() + '/').resolve('@electric-sql/pglite'));
const W = process.env.W || './portal/';
const db = new PGlite();
const U = {
  B: '11111111-1111-4111-a111-111111111111',  // cuenta de BAIREN REALTY
  P1: '22222222-2222-4222-a222-222222222222', // publicador de afuera 1 (inmobiliaria)
  P2: '33333333-3333-4333-a333-333333333333', // publicador de afuera 2
  N: '44444444-4444-4444-a444-444444444444',  // cuenta nueva, se da de alta
  N2: '55555555-5555-4555-a555-555555555555', // otra cuenta nueva, con lo que manda el front
  O: '66666666-6666-4666-a666-666666666666',  // propietaria de una unidad (no publica)
  C: '77777777-7777-4777-a777-777777777777',  // curador
};
const MAIL = { B: 'bairenrealty@x.com', P1: 'p1@x.com', P2: 'p2@x.com', N: 'nueva@x.com', N2: 'nueva2@x.com', O: 'duenia@privado.com', C: 'curador@x.com' };

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
grant usage on schema auth to anon, authenticated, service_role; grant execute on all functions in schema auth to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid default auth.uid());
-- igual que Supabase: las carpetas, sin el nombre del archivo
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$ declare p text[]; begin p := string_to_array(name, '/'); return p[1:array_length(p, 1) - 1]; end $$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role; grant all on storage.objects to anon, authenticated, service_role; grant select on storage.buckets to anon, authenticated;
insert into auth.users values ${Object.keys(U).map(k => `('${U[k]}','${MAIL[k]}')`).join(',')};
`);
let fallas = 0;
const run = async (f, txt) => { try { const r = await db.exec(txt != null ? txt : readFileSync(W + f, 'utf8').replace(/create extension[^;]*;/i, '')); console.log('  corrió', f); return r; } catch (e) { console.log('  NO CORRIÓ', f, '·', e.message.slice(0, 160)); try { await db.exec('rollback'); } catch (_) {} return null; } };
console.log('Esquema y migraciones del portal (las que no necesitan el OS):');
for (const f of ['schema-portal.sql', 'migracion-01-identidad.sql', 'migracion-02-visitas.sql', 'migracion-03-portal-sin-corredor.sql', 'migracion-04-producto.sql',
  'migracion-05-avatares.sql', 'migracion-06-alertas.sql', 'migracion-07-respaldos.sql', 'migracion-09-resumen-semanal.sql', 'migracion-10-expensas.sql',
  'migracion-15-privacidad.sql', 'migracion-16-fuera-de-zona.sql', 'migracion-17-arreglo-urgente.sql', 'migracion-19-resumen-propietarios.sql', 'migracion-20-resumen-por-propietario.sql']) await run(f);

/* Lo de la 11 (tipo gestor, BAIREN REALTY) y el doble del OS: public.propiedades y la 008 */
await run('fixture 11 + OS 008', `
alter table portal.publicadores drop constraint publicadores_tipo_check;
alter table portal.publicadores disable trigger trg_pub_verificacion;
update portal.publicadores set tipo = 'gestor', nombre = 'BAIREN REALTY', badge = 'Gestor de alquileres', auth_user_id = '${U.B}' where slug = 'bairen';
alter table portal.publicadores add constraint publicadores_tipo_check check (tipo in ('dueno','profesional','desarrolladora','gestor'));
insert into portal.publicadores (id, slug, tipo, nombre, email, telefono, whatsapp, verificado, badge, auth_user_id) values
  ('aaaaaaaa-0000-4000-a000-000000000001', 'inmo-uno', 'profesional', 'Inmobiliaria Uno', 'uno@x.com', '11', '5411', true, 'Corredor inmobiliario matriculado', '${U.P1}'),
  ('aaaaaaaa-0000-4000-a000-000000000002', 'renta-dos', 'gestor', 'Rentas Dos', 'dos@x.com', '22', '5422', true, 'Gestor de alquileres', '${U.P2}');
alter table portal.publicadores enable trigger trg_pub_verificacion;
insert into portal.curadores (email, nombre) values ('${MAIL.C}', 'Curador') on conflict do nothing;
-- store.js savePublicador hace upsert por auth_user_id: en una base nueva schema-portal.sql:246 no crea el único (la columna ya existía)
create unique index if not exists publicadores_auth_user_uq on portal.publicadores (auth_user_id);
insert into storage.buckets (id, name, public) values ('portal-fotos','portal-fotos',true), ('portal-docs','portal-docs',false) on conflict do nothing;
create table public.propiedades (id uuid primary key default gen_random_uuid(), direccion text, barrio text, tipo text, metros int, ambientes int, estado text,
  alquiler_usd numeric, tipo_comercializacion text, tenant_id text, gestion text, fecha_carga date, fotos jsonb, foto_portada text, notas text);
create or replace function portal.clave_edificio(p_direccion text) returns text language sql immutable as $$
  with t as (select regexp_split_to_array(trim(regexp_replace(translate(lower(coalesce(p_direccion, '')), 'áéíóúüñ', 'aeiouun'), '\\(.*?\\)', ' ', 'g')), '[^a-z0-9]+') as w),
       n as (select w, (select min(i) from generate_subscripts(w, 1) i where w[i] ~ '^[0-9]+$') as i from t)
  select case when i is null or i < 2 then array_to_string(w, ' ') else w[i-1] || ' ' || w[i] end from n $$;
create or replace function portal.clave_unidad(p_texto text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(translate(lower(coalesce(p_texto, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]', '', 'g'), '^piso', ''), '^p(?=[0-9])', ''), '^(uf|dpto|depto)', '') $$;
create or replace function portal.unidad_de_propiedad(p_direccion text) returns text language sql immutable as $$
  select portal.clave_unidad(coalesce((regexp_match(p_direccion, '\\(([^)]*)\\)\\s*$'))[1], (regexp_match(p_direccion, '(?:Buenos Aires|CABA)\\s+(.{1,12})$', 'i'))[1], '')) $$;
create or replace function portal.propiedad_para_aviso(p_aviso portal.avisos, p_crear boolean default true) returns uuid
language plpgsql volatile security definer set search_path = portal, public as $$
declare v_slug text; v_prop uuid; v_foto text; v_clave text; v_unidad text; v_dir text;
begin
  select slug into v_slug from portal.publicadores where id = p_aviso.publicador_id;
  if v_slug is null then return null; end if;
  select url into v_foto from portal.fotos where aviso_id = p_aviso.id order by orden nulls last, id limit 1;
  if p_aviso.propiedad_id is not null then
    select id into v_prop from public.propiedades where id = p_aviso.propiedad_id and tenant_id = v_slug;
    if v_prop is not null then update public.propiedades set foto_portada = coalesce(foto_portada, v_foto) where id = v_prop; return v_prop; end if;
  end if;
  v_clave := portal.clave_edificio(p_aviso.direccion); v_unidad := portal.clave_unidad(p_aviso.unidad);
  select id into v_prop from public.propiedades pr where pr.tenant_id = v_slug and portal.clave_edificio(pr.direccion) = v_clave
     and (portal.unidad_de_propiedad(pr.direccion) = v_unidad) order by pr.direccion limit 1;
  if v_prop is not null then update public.propiedades set foto_portada = coalesce(foto_portada, v_foto) where id = v_prop; return v_prop; end if;
  if not p_crear then return null; end if;
  v_dir := trim(coalesce(p_aviso.direccion, p_aviso.titulo, 'Sin dirección')) || case when coalesce(p_aviso.unidad, '') <> '' then ' (' || trim(p_aviso.unidad) || ')' else '' end;
  insert into public.propiedades (direccion, barrio, tipo, metros, ambientes, estado, alquiler_usd, tipo_comercializacion, tenant_id, gestion, fecha_carga, fotos, foto_portada, notas)
  values (v_dir, p_aviso.barrio, 'depto', coalesce(p_aviso.m2_total, p_aviso.m2_cubierto), p_aviso.ambientes, 'disponible', p_aviso.precio,
          case when p_aviso.operacion = 'mediano' then 'mediano_plazo' else 'tradicional' end, v_slug, 'bairen', current_date, '[]'::jsonb, v_foto, 'Creada desde el aviso ' || coalesce(p_aviso.codigo, p_aviso.id::text))
  returning id into v_prop;
  return v_prop;
end $$;
create or replace function portal.trg_aviso_sincroniza_os() returns trigger
language plpgsql security definer set search_path = portal, public as $$
begin
  -- Crea solo al publicar un aviso nuevo; en cambios posteriores solo vincula (nunca duplica).
  if new.estado_curacion = 'publicado' then
    new.propiedad_id := coalesce(portal.propiedad_para_aviso(new, tg_op = 'INSERT' or old.propiedad_id is null and old.estado_curacion is distinct from 'publicado'), new.propiedad_id);
  end if;
  return new;
end $$;
create trigger trg_aviso_sincroniza_os before insert or update of estado_curacion, direccion, unidad, publicador_id on portal.avisos for each row execute function portal.trg_aviso_sincroniza_os();
-- Un aviso de BAIREN REALTY publicado con el mail de su propietaria y sus fotos (como lo deja la sincronización)
insert into portal.avisos (id, codigo, slug, publicador_id, operacion, direccion, unidad, barrio, zona, estado_curacion, publicado_en, propietario_email, precio)
  select 'bbbbbbbb-0000-4000-a000-000000000001', 'BA-CALLE123M', 'calle-123', id, 'mediano', 'Calle 123', '4B', 'Palermo', 'Palermo', 'publicado', now(), '${MAIL.O}', 900 from portal.publicadores where slug = 'bairen';
insert into portal.fotos (aviso_id, url, orden) values ('bbbbbbbb-0000-4000-a000-000000000001', 'https://x.supabase.co/storage/v1/object/public/portal-fotos/bairen/1.jpg', 0),
  ('bbbbbbbb-0000-4000-a000-000000000001', 'https://x.supabase.co/storage/v1/object/public/portal-fotos/bairen/2.jpg', 1);
`);

const como = async (quien, sql) => {
  const rol = quien === 'anon' ? 'anon' : quien === 'servidor' ? 'service_role' : quien === 'editor' ? null : 'authenticated';
  const uid = U[quien] || '';
  const claims = quien === 'editor' ? '' : JSON.stringify(uid ? { sub: uid, email: MAIL[quien], role: rol } : { role: rol });
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); select set_config('request.jwt.claims', '${claims}', false);` + (rol ? ` set role ${rol};` : ''));
  try { const x = await db.query(sql); await db.exec('reset role'); return x.rows; } catch (e) { await db.exec('reset role'); return 'ERROR: ' + e.message; }
};
const J = x => typeof x === 'string' ? x : JSON.stringify(x);
const control = (n, texto, r, esperado) => { const ok = typeof esperado === 'function' ? esperado(r) : J(r) === J(esperado); if (!ok) fallas++; console.log(`${ok ? 'OK ' : 'MAL'} [${n}] ${texto.padEnd(78)} ${J(r).slice(0, 170)}`); };
const err = r => typeof r === 'string' && r.startsWith('ERROR');
const estadoDe = async codigo => (await db.query(`select estado_curacion e, pausado_por p from portal.avisos where codigo = '${codigo}'`)).rows[0];
const props = async () => (await db.query(`select count(*)::int n from public.propiedades`)).rows[0].n;
const P1 = 'aaaaaaaa-0000-4000-a000-000000000001', P2 = 'aaaaaaaa-0000-4000-a000-000000000002', AB = 'bbbbbbbb-0000-4000-a000-000000000001';
const FOTO = n => `https://x.supabase.co/storage/v1/object/public/portal-fotos/${U.P1}/av1/${n}.jpg`;

console.log('\nAntes de la 23 (lo que encontró la auditoría):');
control('antes', 'anon lee propietario_email de un aviso publicado', await como('anon', `select propietario_email from portal.avisos`), r => !err(r) && r[0] && r[0].propietario_email === MAIL.O);
control('antes', 'authenticated no tiene DELETE en portal.fotos (saveAviso no puede reemplazar fotos)', (await db.query(`select has_table_privilege('authenticated', 'portal.fotos', 'DELETE') d`)).rows, [{ d: false }]);
control('antes', 'P1 inserta su aviso directo en publicado', await como('P1', `insert into portal.avisos (codigo, slug, publicador_id, operacion, direccion, barrio, zona, estado_curacion) values ('BA-ANTES', 'antes', '${P1}', 'venta', 'Falsa 1', 'Palermo', 'Palermo', 'publicado') returning estado_curacion`), [{ estado_curacion: 'publicado' }]);
await db.exec(`delete from portal.avisos where codigo = 'BA-ANTES'; delete from public.propiedades;`);

console.log('\nMigración 23, primera corrida:');
const mig = readFileSync(W + 'migracion-23-lanzamiento.sql', 'utf8');
const r1 = await run('migracion-23-lanzamiento.sql', mig);
if (!r1) process.exit(1);
console.table(r1.at(-1).rows);
const respaldo1 = (await db.query(`select clave from portal.respaldo_migracion_23 order by clave`)).rows.map(x => x.clave);

console.log('\nFlujo normal: el publicador carga, la curación publica, la visita lee y consulta');
control('flujo', 'P1 crea un borrador', await como('P1', `insert into portal.avisos (id, codigo, slug, publicador_id, operacion, direccion, unidad, barrio, zona, precio, estado_curacion) values ('cccccccc-0000-4000-a000-000000000001', 'BA-P1-1', 'p1-uno', '${P1}', 'mediano', 'Av. Libertador 100', null, 'Núñez', 'Núñez', 1200, 'borrador') returning estado_curacion`), [{ estado_curacion: 'borrador' }]);
control('flujo', 'P1 sube la foto a su carpeta (<cuenta>/<aviso>/...)', await como('P1', `insert into storage.objects (bucket_id, name) values ('portal-fotos', '${U.P1}/av1/1.jpg'), ('portal-fotos', 'miniaturas/${U.P1}/av1/1.jpg') returning name`), r => !err(r) && r.length === 2);
control('flujo', 'P1 guarda las fotos del aviso', await como('P1', `insert into portal.fotos (aviso_id, url, orden) values ('cccccccc-0000-4000-a000-000000000001', '${FOTO(1)}', 0), ('cccccccc-0000-4000-a000-000000000001', '${FOTO(2)}', 1) returning orden`), r => !err(r) && r.length === 2);
control('flujo', 'P1 lo manda a revisión', await como('P1', `update portal.avisos set estado_curacion = 'en_revision', motivo_rechazo = null where codigo = 'BA-P1-1' returning estado_curacion`), [{ estado_curacion: 'en_revision' }]);
control('flujo', 'el curador lo publica (con cualidades)', await como('C', `update portal.avisos set estado_curacion = 'publicado', publicado_en = now(), cualidades_verificadas = '{Luminoso}' where codigo = 'BA-P1-1' returning estado_curacion, portada_curada`), [{ estado_curacion: 'publicado', portada_curada: FOTO(1) }]);
const COLS_LISTA = 'id,codigo,slug,publicador_id,operacion,tipo,titulo,direccion,unidad,barrio,zona,ciudad,precio,moneda,expensas,m2_total,m2_cubierto,ambientes,dormitorios,banos,cocheras,antiguedad,amoblado,amenities,caracteristicas,cualidades_verificadas,descripcion,video_url,video_tipo,plazo,estado,destacado_hasta,publicado_en,created_at,emprendimiento,etapa,entrega';
const COLS_FICHA = COLS_LISTA + ',descripcion_en,descripcion_pt,mostrar_direccion,orientacion,disposicion,piso';
const COLS_AVISO = 'id,codigo,slug,publicador_id,propiedad_id,operacion,tipo,titulo,direccion,unidad,barrio,zona,ciudad,mostrar_direccion,lat,lng,precio,moneda,expensas,m2_total,m2_cubierto,ambientes,dormitorios,banos,toilettes,cocheras,antiguedad,orientacion,disposicion,piso,amoblado,amenities,caracteristicas,descripcion,descripcion_en,descripcion_pt,video_url,video_tipo,plazo,estado,estado_curacion,motivo_rechazo,destacado_hasta,publicado_en,vence_en,created_at,updated_at,emprendimiento,etapa,entrega,quiero_produccion,codigo_interno,cualidades,cualidades_verificadas,cualidades_verificadas_por,cualidades_verificadas_en';
control('flujo', 'anon lee el catálogo con las columnas del front (S.COLS.LISTA + fotos + publicador)', await como('anon', `select a.codigo, (select count(*)::int from portal.fotos f where f.aviso_id = a.id) fotos, (select p.nombre from portal.publicadores p where p.id = a.publicador_id) pub from (select ${COLS_LISTA} from portal.avisos where estado_curacion = 'publicado' order by publicado_en desc nulls last, id) a order by codigo`), [{ codigo: 'BA-CALLE123M', fotos: 2, pub: 'BAIREN REALTY' }, { codigo: 'BA-P1-1', fotos: 2, pub: 'Inmobiliaria Uno' }]);
control('flujo', 'anon lee la ficha (S.COLS.FICHA) por slug', await como('anon', `select codigo, cualidades_verificadas from (select ${COLS_FICHA} from portal.avisos where slug = 'p1-uno' and estado_curacion = 'publicado') a`), [{ codigo: 'BA-P1-1', cualidades_verificadas: ['Luminoso'] }]);
control('flujo', 'anon deja una consulta', await como('anon', `insert into portal.consultas (aviso_id, publicador_id, nombre, email, telefono, mensaje) values ('cccccccc-0000-4000-a000-000000000001', '${P1}', 'Ana', 'ana@x.com', '1155', 'Me interesa')`), []);
control('flujo', 'P1 ve la consulta que le llegó', await como('P1', `select nombre, mensaje from portal.consultas`), [{ nombre: 'Ana', mensaje: 'Me interesa' }]);
control('flujo', 'anon registra una vista y la cuenta con vistas_de()', await (async () => { await como('anon', `insert into portal.vistas (aviso_id) values ('cccccccc-0000-4000-a000-000000000001'), ('cccccccc-0000-4000-a000-000000000001')`); return como('anon', `select * from portal.vistas_de(array['cccccccc-0000-4000-a000-000000000001', 'BA-NO-EXISTE'])`); })(), r => !err(r) && r.find(x => x.ref.startsWith('cccc')).vistas === 2 && r.find(x => x.ref === 'BA-NO-EXISTE').vistas === 0);
control('flujo', 'el panel de P1 lee su aviso con S.COLS.AVISO', await como('P1', `select count(*)::int n from (select ${COLS_AVISO} from portal.avisos where publicador_id = '${P1}') a`), [{ n: 1 }]);

console.log('\n7 · Avisos: lo de la curación lo cambia la curación');
control(7, 'P1 inserta un aviso en publicado → entra a revisión, sin publicado_en ni sellos', await como('P1', `insert into portal.avisos (codigo, slug, publicador_id, operacion, direccion, barrio, zona, estado_curacion, publicado_en, destacado_hasta, cualidades_verificadas, propiedad_id) values ('BA-P1-2', 'p1-dos', '${P1}', 'venta', 'Falsa 1', 'Palermo', 'Palermo', 'publicado', now(), now() + interval '1 year', '{Seleccion}', gen_random_uuid()) returning estado_curacion, publicado_en, destacado_hasta, cualidades_verificadas, propiedad_id`), [{ estado_curacion: 'en_revision', publicado_en: null, destacado_hasta: null, cualidades_verificadas: [], propiedad_id: null }]);
control(7, 'P1 inserta un aviso en pausado → borrador', await como('P1', `insert into portal.avisos (codigo, slug, publicador_id, operacion, direccion, barrio, zona, estado_curacion) values ('BA-P1-3', 'p1-tres', '${P1}', 'venta', 'Falsa 3', 'Palermo', 'Palermo', 'pausado') returning estado_curacion`), [{ estado_curacion: 'borrador' }]);
control(7, 'P1 pasa su aviso en revisión a publicado → sigue en revisión', await como('P1', `update portal.avisos set estado_curacion = 'publicado', publicado_en = now() where codigo = 'BA-P1-2' returning estado_curacion, publicado_en`), [{ estado_curacion: 'en_revision', publicado_en: null }]);
control(7, 'P1 edita su aviso publicado: precio y reservado → sigue publicado', await como('P1', `update portal.avisos set precio = 1500, estado = 'reservado', descripcion = 'Nueva descripción' where codigo = 'BA-P1-1' returning estado_curacion, precio::int, estado`), [{ estado_curacion: 'publicado', precio: 1500, estado: 'reservado' }]);
control(7, 'P1 toca publicado_en, destacado, cualidades, propiedad_id, publicador_id → no cambian', await como('P1', `update portal.avisos set publicado_en = now() + interval '1 day', destacado_hasta = now() + interval '1 year', cualidades_verificadas = '{Falsa}', propiedad_id = gen_random_uuid(), publicador_id = '${P2}', motivo_rechazo = 'inventado' where codigo = 'BA-P1-1' returning estado_curacion, destacado_hasta, cualidades_verificadas, propiedad_id, publicador_id = '${P1}' as mismo_pub, publicado_en < now() as pub_en_igual, motivo_rechazo`), [{ estado_curacion: 'publicado', destacado_hasta: null, cualidades_verificadas: ['Luminoso'], propiedad_id: null, mismo_pub: true, pub_en_igual: true, motivo_rechazo: null }]);
control(7, 'P1 guarda con la unidad vacía en vez de null (como el formulario) → sigue publicado', await como('P1', `update portal.avisos set unidad = '', direccion = 'Av.  Libertador 100 ' where codigo = 'BA-P1-1' returning estado_curacion`), [{ estado_curacion: 'publicado' }]);
control(7, 'P1 vuelve a guardar las mismas fotos (borra todas y las inserta) → sigue publicado', await (async () => { const d = await como('P1', `delete from portal.fotos where aviso_id = 'cccccccc-0000-4000-a000-000000000001' returning id`); if (err(d) || d.length !== 2) return 'no pudo borrar: ' + J(d); await como('P1', `insert into portal.fotos (aviso_id, url, orden) values ('cccccccc-0000-4000-a000-000000000001', '${FOTO(1)}?t=123', 0), ('cccccccc-0000-4000-a000-000000000001', '${FOTO(2)}', 1), ('cccccccc-0000-4000-a000-000000000001', '${FOTO(3)}', 2)`); return estadoDe('BA-P1-1'); })(), { e: 'publicado', p: null });
control(7, 'P1 pone otra portada (foto nueva en el primer lugar) → vuelve a revisión', await (async () => { await como('P1', `delete from portal.fotos where aviso_id = 'cccccccc-0000-4000-a000-000000000001'`); await como('P1', `insert into portal.fotos (aviso_id, url, orden) values ('cccccccc-0000-4000-a000-000000000001', '${FOTO(9)}', 0), ('cccccccc-0000-4000-a000-000000000001', '${FOTO(1)}', 1)`); return estadoDe('BA-P1-1'); })(), { e: 'en_revision', p: null });
await como('C', `update portal.avisos set estado_curacion = 'publicado' where codigo = 'BA-P1-1'`);
control(7, 'el curador la aprueba: esa portada pasa a ser la curada', (await db.query(`select estado_curacion, portada_curada from portal.avisos where codigo = 'BA-P1-1'`)).rows, [{ estado_curacion: 'publicado', portada_curada: FOTO(9) }]);
control(7, 'P1 cambia la dirección de su aviso publicado → revisión', await como('P1', `update portal.avisos set direccion = 'Otra calle 200' where codigo = 'BA-P1-1' returning estado_curacion`), [{ estado_curacion: 'en_revision' }]);
await como('C', `update portal.avisos set estado_curacion = 'publicado' where codigo = 'BA-P1-1'`);
control(7, 'P1 cambia la operación → revisión', await como('P1', `update portal.avisos set operacion = 'venta' where codigo = 'BA-P1-1' returning estado_curacion`), [{ estado_curacion: 'en_revision' }]);
await como('C', `update portal.avisos set estado_curacion = 'publicado', operacion = 'mediano' where codigo = 'BA-P1-1'`);
control(7, 'P1 pausa su aviso publicado → pausado por el publicador', await como('P1', `update portal.avisos set estado_curacion = 'pausado' where codigo = 'BA-P1-1' returning estado_curacion, pausado_por`), [{ estado_curacion: 'pausado', pausado_por: 'publicador' }]);
control(7, 'P1 lo reactiva → publicado (lo pausó él)', await como('P1', `update portal.avisos set estado_curacion = 'publicado', publicado_en = now() + interval '1 day' where codigo = 'BA-P1-1' returning estado_curacion, publicado_en < now() as publicado_en_igual`), [{ estado_curacion: 'publicado', publicado_en_igual: true }]);
control(7, 'el servidor (sincronización) lo pausa → pausado por el sistema', await como('servidor', `update portal.avisos set estado_curacion = 'pausado' where codigo = 'BA-P1-1' returning estado_curacion, pausado_por`), [{ estado_curacion: 'pausado', pausado_por: 'sistema' }]);
control(7, 'P1 intenta reactivarlo → va a revisión', await como('P1', `update portal.avisos set estado_curacion = 'publicado' where codigo = 'BA-P1-1' returning estado_curacion`), [{ estado_curacion: 'en_revision' }]);
control(7, 'P1 se pone rechazado o vencido → no cambia', await como('P1', `update portal.avisos set estado_curacion = 'vencido' where codigo = 'BA-P1-1' returning estado_curacion`), [{ estado_curacion: 'en_revision' }]);
control(7, 'P2 intenta editar el aviso de P1 → ninguna fila', await como('P2', `update portal.avisos set precio = 1 where codigo = 'BA-P1-1' returning id`), []);
control(7, 'el servidor publica un aviso con publicado_en (sincronización) → queda así', await como('servidor', `insert into portal.avisos (codigo, slug, publicador_id, operacion, direccion, unidad, barrio, zona, estado_curacion, publicado_en) select 'BA-SYNC1M', 'sync-1', id, 'mediano', 'Sync 1', '2A', 'Recoleta', 'Recoleta', 'publicado', '2026-09-01' from portal.publicadores where slug = 'bairen' returning estado_curacion, publicado_en::date::text`), [{ estado_curacion: 'publicado', publicado_en: '2026-09-01' }]);

console.log('\n8 · Publicadores: slug, insignia y verificación son de la curación');
control(8, 'cuenta nueva se da de alta verificada, "Selección BAIREN" y slug bairen-oficial', await como('N', `insert into portal.publicadores (slug, tipo, nombre, auth_user_id, verificado, badge) values ('bairen-oficial', 'dueno', 'Falso', '${U.N}', true, 'Selección BAIREN') returning verificado, badge, slug like 'publicador-%' as slug_neutro`), [{ verificado: false, badge: 'Dueño verificado', slug_neutro: true }]);
control(8, 'cuenta nueva con lo que manda el front (slug nombre-xxxx) → se respeta', await como('N2', `insert into portal.publicadores (slug, tipo, nombre, auth_user_id, badge, email) values ('juan-perez-5555', 'profesional', 'Juan Pérez', '${U.N2}', 'Corredor inmobiliario matriculado', 'nueva2@x.com') returning slug, badge, verificado`), [{ slug: 'juan-perez-5555', badge: 'Corredor inmobiliario matriculado', verificado: false }]);
control(8, 'la cuenta nueva guarda su perfil otra vez (upsert por auth_user_id) → anda', await como('N2', `insert into portal.publicadores (slug, tipo, nombre, auth_user_id, badge, telefono) values ('otro-slug', 'profesional', 'Juan Pérez', '${U.N2}', 'Selección BAIREN', '1199') on conflict (auth_user_id) do update set slug = excluded.slug, badge = excluded.badge, telefono = excluded.telefono, nombre = excluded.nombre returning slug, badge, telefono`), [{ slug: 'juan-perez-5555', badge: 'Corredor inmobiliario matriculado', telefono: '1199' }]);
control(8, 'P1 cambia su slug, insignia y verificado → no cambian', await como('P1', `update portal.publicadores set slug = 'tenant-ajeno', badge = 'Selección BAIREN', verificado = false, whatsapp = '549111' where id = '${P1}' returning slug, badge, verificado, whatsapp`), [{ slug: 'inmo-uno', badge: 'Corredor inmobiliario matriculado', verificado: true, whatsapp: '549111' }]);
control(8, 'el curador sí los cambia', await como('C', `update portal.publicadores set slug = 'inmo-uno-ok', badge = 'Corredor inmobiliario matriculado', verificado = true where id = '${P1}' returning slug`), [{ slug: 'inmo-uno-ok' }]);
control(8, 'la cuenta nueva sin verificar cambia de tipo → la insignia es la del tipo nuevo', await como('N2', `update portal.publicadores set tipo = 'desarrolladora', badge = 'Selección BAIREN' where auth_user_id = '${U.N2}' returning tipo, badge`), [{ tipo: 'desarrolladora', badge: 'Venta directa' }]);

console.log('\n9 · Storage: cada cuenta en su carpeta');
await db.exec(`insert into storage.objects (bucket_id, name, owner) values ('portal-fotos', 'cccccccc-0000-4000-a000-000000000001/vieja.jpg', '${U.P1}'), ('portal-docs', '${P1}/matricula-1.pdf', '${U.P1}')`);
control(9, 'P2 pisa una foto de P1 (carpeta del aviso) → ninguna fila', await como('P2', `update storage.objects set name = name where bucket_id = 'portal-fotos' and name = 'cccccccc-0000-4000-a000-000000000001/vieja.jpg' returning name`), []);
control(9, 'P2 sube a la carpeta del aviso de P1 → rechazado', await como('P2', `insert into storage.objects (bucket_id, name) values ('portal-fotos', 'cccccccc-0000-4000-a000-000000000001/mia.jpg')`), err);
control(9, 'P2 sube a la carpeta de la cuenta de P1 → rechazado', await como('P2', `insert into storage.objects (bucket_id, name) values ('portal-fotos', '${U.P1}/av1/mia.jpg')`), err);
control(9, 'P2 sube a su carpeta y a su miniatura → anda', await como('P2', `insert into storage.objects (bucket_id, name) values ('portal-fotos', '${U.P2}/av9/1.jpg'), ('portal-fotos', 'miniaturas/${U.P2}/av9/1.jpg') returning name`), r => !err(r) && r.length === 2);
control(9, 'P1 sube a la carpeta vieja de SU aviso (ruta de hoy, con id) → anda', await como('P1', `insert into storage.objects (bucket_id, name) values ('portal-fotos', 'cccccccc-0000-4000-a000-000000000001/2.jpg'), ('portal-fotos', 'miniaturas/cccccccc-0000-4000-a000-000000000001/2.jpg') returning name`), r => !err(r) && r.length === 2);
control(9, 'P1 sube a una carpeta que no dice de quién es (nuevo-XXXX) → rechazado', await como('P1', `insert into storage.objects (bucket_id, name) values ('portal-fotos', 'nuevo-2222/1.jpg')`), err);
control(9, 'anon sube una foto → rechazado', await como('anon', `insert into storage.objects (bucket_id, name) values ('portal-fotos', '${U.P1}/x.jpg')`), err);
control(9, 'P2 borra una foto de P1 → ninguna fila', await como('P2', `delete from storage.objects where bucket_id = 'portal-fotos' and name like '${U.P1}/%' returning name`), []);
control(9, 'P1 borra una foto suya → anda', await como('P1', `delete from storage.objects where bucket_id = 'portal-fotos' and name = 'cccccccc-0000-4000-a000-000000000001/2.jpg' returning name`), r => !err(r) && r.length === 1);
control(9, 'el curador borra una foto de P1 → anda', await como('C', `delete from storage.objects where bucket_id = 'portal-fotos' and name = 'cccccccc-0000-4000-a000-000000000001/vieja.jpg' returning name`), r => !err(r) && r.length === 1);
control(9, 'P2 sube un documento a la carpeta del publicador de P1 → rechazado', await como('P2', `insert into storage.objects (bucket_id, name) values ('portal-docs', '${P1}/dni.pdf')`), err);
control(9, 'P1 sube un documento a la carpeta de su publicador → anda', await como('P1', `insert into storage.objects (bucket_id, name) values ('portal-docs', '${P1}/cuit-2.pdf') returning name`), r => !err(r) && r.length === 1);
control(9, 'P2 lee los documentos de P1 → nada', await como('P2', `select name from storage.objects where bucket_id = 'portal-docs'`), []);
control(9, 'P1 ve los suyos; el curador los ve todos', [await como('P1', `select count(*)::int n from storage.objects where bucket_id = 'portal-docs'`), await como('C', `select count(*)::int n from storage.objects where bucket_id = 'portal-docs'`)], [[{ n: 2 }], [{ n: 2 }]]);
control(9, 'buckets: tope y tipos', (await db.query(`select id, file_size_limit::int, allowed_mime_types from storage.buckets where id in ('portal-fotos', 'portal-docs') order by id`)).rows, [{ id: 'portal-docs', file_size_limit: 10485760, allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'] }, { id: 'portal-fotos', file_size_limit: 15728640, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] }]);

console.log('\n10 · propietario_email');
control(10, 'anon pide propietario_email → permiso denegado', await como('anon', `select propietario_email from portal.avisos`), r => err(r) && /permission denied/.test(r));
control(10, 'anon pide select * → permiso denegado (por eso el front pide columnas)', await como('anon', `select * from portal.avisos limit 1`), r => err(r) && /permission denied/.test(r));
control(10, 'P2 (otra cuenta) pide propietario_email de la tabla → permiso denegado', await como('P2', `select propietario_email from portal.avisos where id = '${AB}'`), r => err(r) && /permission denied/.test(r));
control(10, 'P2 en la vista avisos_propietario → no ve el de BAIREN', await como('P2', `select propietario_email from portal.avisos_propietario where id = '${AB}'`), []);
control(10, 'anon en la vista → permiso denegado', await como('anon', `select * from portal.avisos_propietario`), r => err(r));
control(10, 'BAIREN (dueño del aviso) en la vista → lo ve', await como('B', `select propietario_email from portal.avisos_propietario where id = '${AB}'`), [{ propietario_email: MAIL.O }]);
control(10, 'el curador en la vista → lo ve', await como('C', `select propietario_email from portal.avisos_propietario where id = '${AB}'`), [{ propietario_email: MAIL.O }]);
control(10, 'la propietaria en la vista → ve el suyo (y solo ese)', await como('O', `select id, propietario_email from portal.avisos_propietario`), [{ id: AB, propietario_email: MAIL.O }]);
control(10, 'la propietaria lee su aviso (columnas) aunque no esté publicado', await (async () => { await como('servidor', `update portal.avisos set estado_curacion = 'pausado' where id = '${AB}'`); const r = await como('O', `select codigo, estado_curacion from portal.avisos where id = '${AB}'`); await como('servidor', `update portal.avisos set estado_curacion = 'publicado' where id = '${AB}'`); return r; })(), [{ codigo: 'BA-CALLE123M', estado_curacion: 'pausado' }]);
control(10, 'P1 guarda el mail del propietario en su aviso (update) → anda', await como('P1', `update portal.avisos set propietario_email = 'otro@privado.com' where codigo = 'BA-P1-2' returning id`), r => err(r) ? false : r.length === 1);

console.log('\n11 · Topes de largo');
control(11, 'anon consulta con un mensaje de 100.000 caracteres → rechazada', await como('anon', `insert into portal.consultas (aviso_id, publicador_id, nombre, email, mensaje) values ('${AB}', '${P1}', 'x', 'x@x.com', repeat('x', 100000))`), r => err(r) && /m23_consultas_mensaje/.test(r));
control(11, 'anon consulta con 2.000 caracteres → entra', await como('anon', `insert into portal.consultas (aviso_id, publicador_id, nombre, email, mensaje) values ('${AB}', '${P1}', 'x', 'x@x.com', repeat('x', 2000))`), []);
control(11, 'anon consulta con un nombre de 500 → rechazada', await como('anon', `insert into portal.consultas (aviso_id, publicador_id, nombre, email) values ('${AB}', '${P1}', repeat('n', 500), 'x@x.com')`), err);
control(11, 'anon evento de 500 KB → rechazado', await como('anon', `insert into portal.eventos (evento, datos) values ('x', jsonb_build_object('a', repeat('y', 500000)))`), r => err(r) && /m23_eventos_datos/.test(r));
control(11, 'anon evento normal (error_js de 1,5 KB) → entra', await como('anon', `insert into portal.eventos (evento, datos) values ('error_js', jsonb_build_object('msg', repeat('m', 300), 'stack', repeat('s', 600), 'pagina', repeat('p', 200)))`), []);
control(11, 'anon vista con aviso_ref de 500 → rechazada', await como('anon', `insert into portal.vistas (aviso_ref) values (repeat('r', 500))`), err);
control(11, 'anon denuncia con detalle de 100.000 → rechazada', await como('anon', `insert into portal.denuncias (aviso_id, motivo, detalle) values ('${AB}', 'otro', repeat('z', 100000))`), err);
control(11, 'anon denuncia normal → entra', await como('anon', `insert into portal.denuncias (aviso_id, motivo, detalle) values ('${AB}', 'vendida', 'Ya no está')`), []);

console.log('\n12 · El OS solo para BAIREN REALTY');
const antesOS = await props();
control(12, 'el curador publica un aviso de P1 → el OS no crea propiedad', await (async () => { await como('C', `update portal.avisos set estado_curacion = 'publicado' where codigo = 'BA-P1-2'`); return { propiedades_nuevas: (await props()) - antesOS, propiedad_id: (await db.query(`select propiedad_id from portal.avisos where codigo = 'BA-P1-2'`)).rows[0].propiedad_id }; })(), { propiedades_nuevas: 0, propiedad_id: null });
control(12, 'un aviso de BAIREN REALTY que se publica → el OS lo crea y lo vincula', await (async () => { await como('servidor', `insert into portal.avisos (codigo, slug, publicador_id, operacion, direccion, unidad, barrio, zona, estado_curacion) select 'BA-OS2M', 'os-2', id, 'mediano', 'Guemes 400', '1A', 'Palermo', 'Palermo', 'publicado' from portal.publicadores where slug = 'bairen'`); return { propiedades_nuevas: (await props()) - antesOS, vinculado: (await db.query(`select propiedad_id is not null v from portal.avisos where codigo = 'BA-OS2M'`)).rows[0].v }; })(), { propiedades_nuevas: 1, vinculado: true });

console.log('\n13 · Índices y políticas');
control(13, 'índices nuevos', (await db.query(`select count(*)::int n from pg_indexes where schemaname = 'portal' and indexname in ('avisos_publicador_idx','avisos_catalogo_idx','avisos_publicado_en_idx','avisos_slug_idx','consultas_publicador_idx','consultas_aviso_idx','vistas_aviso_fecha_idx','visitas_reservas_aviso_idx')`)).rows, [{ n: 8 }]);
control(13, 'políticas nuevas o tocadas: todas "to authenticated"', (await db.query(`select tablename, policyname, roles::text from pg_policies where (schemaname = 'portal' and tablename in ('avisos','fotos') and policyname <> 'avisos publicados visibles' and policyname <> 'fotos de avisos publicados') or (schemaname = 'storage' and policyname in ('fotos sube en su carpeta','fotos edita en su carpeta','fotos borra en su carpeta','docs sube en su carpeta','docs ve los suyos','docs edita los suyos','docs borra los suyos')) order by 1, 2`)).rows, r => r.length === 15 && r.every(x => x.roles === '{authenticated}'));
control(13, 'las que comparan con la cuenta usan (select auth.uid()) / (select ...)', (await db.query(`select count(*)::int n from pg_policies where policyname in ('fotos sube en su carpeta','docs ve los suyos','avisos propios select','propietario ve su aviso') and coalesce(qual, with_check) ~ 'SELECT'`)).rows, [{ n: 4 }]);
control(13, 'anon ya no evalúa las políticas de cuenta (solo "publicados visibles")', (await db.query(`select policyname from pg_policies where schemaname = 'portal' and tablename = 'avisos' and cmd = 'SELECT' and ('anon' = any(roles) or 'public' = any(roles))`)).rows, [{ policyname: 'avisos publicados visibles' }]);

console.log('\n14 · disponible_desde');
control(14, 'P1 la carga en su aviso y anon la lee', [await como('P1', `update portal.avisos set disponible_desde = '2026-11-01' where codigo = 'BA-P1-2' returning disponible_desde::text`), await como('anon', `select disponible_desde::text from portal.avisos where codigo = 'BA-P1-2'`)], [[{ disponible_desde: '2026-11-01' }], [{ disponible_desde: '2026-11-01' }]]);

console.log('\nSegunda corrida (repetible):');
const r2 = await run('migracion-23-lanzamiento.sql (2da)', mig);
control('rep', 'tablero todo en verde', r2 && r2.at(-1).rows.every(x => x.ok), true);
control('rep', 'el respaldo no se pisó', (await db.query(`select clave from portal.respaldo_migracion_23 order by clave`)).rows.map(x => x.clave), respaldo1);
control('rep', 'la definición respaldada del OS es la de antes (sin el filtro de bairen)', (await db.query(`select valor #>> '{}' like '%p.slug = ''bairen''%' as tiene from portal.respaldo_migracion_23 where clave = 'trg_aviso_sincroniza_os'`)).rows, [{ tiene: false }]);
control('rep', 'los datos siguen (avisos, consultas, disponible_desde)', (await db.query(`select (select count(*)::int from portal.avisos) a, (select count(*)::int from portal.consultas) c, (select disponible_desde::text from portal.avisos where codigo = 'BA-P1-2') d`)).rows, [{ a: 6, c: 2, d: '2026-11-01' }]);

console.log('\nRollback:');
const rb = readFileSync(W + 'migracion-23-lanzamiento-rollback.sql', 'utf8');
const r3 = await run('migracion-23-lanzamiento-rollback.sql', rb);
if (r3) console.table(r3.at(-1).rows);
control('rb', 'tablero del rollback en verde', r3 && r3.at(-1).rows.every(x => x.ok), true);
control('rb', 'disponible_desde tenía datos: quedó', (await db.query(`select count(*)::int n from information_schema.columns where table_schema = 'portal' and table_name = 'avisos' and column_name = 'disponible_desde'`)).rows, [{ n: 1 }]);
control('rb', 'vuelve lo de antes: anon lee propietario_email', await como('anon', `select count(propietario_email)::int n from portal.avisos where id = '${AB}'`), [{ n: 1 }]);
control('rb', 'vuelve lo de antes: P1 publica sin curación', await como('P1', `update portal.avisos set estado_curacion = 'publicado' where codigo = 'BA-P1-3' returning estado_curacion`), [{ estado_curacion: 'publicado' }]);
control('rb', 'políticas de avisos como antes (roles public)', (await db.query(`select count(*)::int n from pg_policies where schemaname = 'portal' and tablename = 'avisos' and roles = '{public}'::name[]`)).rows, [{ n: 8 }]);
control('rb', 'los datos siguen', (await db.query(`select (select count(*)::int from portal.avisos) a, (select count(*)::int from portal.consultas) c`)).rows, [{ a: 6, c: 2 }]);
await db.exec(`update portal.avisos set estado_curacion = 'borrador' where codigo = 'BA-P1-3'`);

console.log('\nTercera corrida, después del rollback:');
const r4 = await run('migracion-23-lanzamiento.sql (3ra)', mig);
control('3ra', 'tablero todo en verde', r4 && r4.at(-1).rows.every(x => x.ok), true);
control('3ra', 'protege otra vez: anon no lee propietario_email', await como('anon', `select propietario_email from portal.avisos`), r => err(r));
control('3ra', 'protege otra vez: P1 no publica sin curación', await como('P1', `update portal.avisos set estado_curacion = 'publicado' where codigo = 'BA-P1-3' returning estado_curacion`), [{ estado_curacion: 'en_revision' }]);

console.log(fallas ? `\n${fallas} control(es) NO dieron lo esperado.` : '\nTodos los controles dieron lo esperado.');
process.exit(fallas ? 1 : 0);
