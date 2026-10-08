-- =====================================================================
-- BAIREN · Portal · Migración 23 · Lanzamiento: la base se cuida sola
--
-- PREPARADA, NO CORRIDA (8/10/2026). Ensayada en PGlite con roles anon y
-- authenticated: portal/test/migracion-23.mjs. Vuelta atrás:
-- portal/migracion-23-lanzamiento-rollback.sql.
--
-- Por qué. Al lanzar entran publicadores de afuera (un martillero, dos
-- empresas de mediano plazo, una inmobiliaria). Hasta hoy la base confiaba
-- en que la página no dejara hacer ciertas cosas; con cuentas de terceros
-- eso no alcanza. La auditoría del 8/10 lo ensayó en una copia: una cuenta
-- nueva podía publicar sin curación, ponerse el sello "Selección BAIREN",
-- pisar fotos ajenas, y cualquiera leía el mail del propietario de cada
-- aviso publicado.
--
-- Qué hace (el número es el de la sección de abajo):
--   1. disponible_desde (date) en portal.avisos, para el mediano plazo.
--      unidades_borrador (jsonb): la lista de unidades de un emprendimiento
--      mientras es borrador, para seguir la carga desde otro dispositivo.
--      Más dos columnas internas: portada_curada y pausado_por.
--   3. Disparador en portal.avisos: lo que es de la curación lo cambia solo
--      un curador o el servidor (service key / SQL Editor).
--   4. Disparador en portal.fotos: una portada nueva en un aviso publicado
--      lo vuelve a revisión.
--   5. Disparador en portal.publicadores: slug, badge y verificado solo los
--      cambia un curador (el alta de la cuenta sigue andando).
--   6. trg_aviso_sincroniza_os (del OS) actúa solo para BAIREN REALTY.
--   7. Storage: cada cuenta escribe y borra solo en su carpeta; tope de
--      tamaño y tipos en portal-fotos (15 MB) y portal-docs (10 MB).
--   8. propietario_email cerrado de verdad: select por columna para anon y
--      authenticated; el dueño del aviso, el curador y el propio
--      propietario lo leen por la vista portal.avisos_propietario.
--   9. Topes de largo en consultas, vistas, eventos y denuncias.
--  10. Índices que faltaban, y portal.vistas_de() para contar vistas de un
--      aviso con índice (la ficha ya no agrupa la tabla entera).
--  11. Políticas de avisos y fotos que solo sirven a una cuenta: pasan a
--      `to authenticated` (anon deja de evaluarlas fila por fila) y con
--      (select ...) para que la función se evalúe una vez por consulta. Y
--      DELETE en portal.fotos para authenticated (reemplazar fotos fallaba).
--      DELETE en portal.avisos solo de un borrador propio que nunca se publicó
--      (el panel tiene "Borrar"; sin la 23 el borrador queda como vencido).
--
-- ANTES DE CORRER (sin esto el panel y la carga fallan):
--   · El front de la rama tomas/lanz-servidor en producción: ninguna lectura
--     de avisos pide `*` (store.js S.COLS) y la ficha cuenta vistas con
--     vistas_de.
--   · El equipo de carga cambia en store.js saveAviso los dos `.select()`
--     (insert y update) por `.select(S.COLS.AVISO)`: con permisos por
--     columna, `select=*` (RETURNING *) falla entero.
--   · Las fotos nuevas suben a <id de la cuenta>/<aviso>/... (ver sección 7).
--   · Copia de seguridad del día (api/portal-respaldo) y SUBIR el archivo
--     en el SQL Editor, no pegarlo (los acentos).
--
-- Repetible: una segunda corrida no cambia nada. No borra ni renombra
-- datos. Lo que pisa (definición de trg_aviso_sincroniza_os, políticas que
-- reemplaza, límites de los buckets, permisos de lectura de avisos) queda
-- en portal.respaldo_migracion_23 en la PRIMERA corrida; el rollback lo
-- vuelve a poner desde ahí.
--
-- Nota para migraciones futuras: con select por columna, una columna nueva
-- de portal.avisos NO se ve con la clave pública hasta darle
--   grant select (columna) on portal.avisos to anon, authenticated;
-- =====================================================================

begin;

-- ── 0 · Controles previos ──────────────────────────────────────────
do $$
begin
  if to_regclass('portal.avisos') is null or to_regclass('portal.publicadores') is null or to_regclass('portal.fotos') is null
     or to_regclass('portal.consultas') is null or to_regclass('portal.vistas') is null or to_regclass('portal.eventos') is null
     or to_regclass('portal.denuncias') is null or to_regclass('portal.visitas_reservas') is null then
    raise exception 'Migración 23: faltan tablas del portal (schema-portal.sql y migraciones 01 a 04).';
  end if;
  if to_regprocedure('portal.es_curador()') is null or to_regprocedure('portal.mi_publicador()') is null or to_regprocedure('portal.es_miembro(uuid)') is null then
    raise exception 'Migración 23: faltan portal.es_curador(), portal.mi_publicador() o portal.es_miembro(uuid) (schema-portal.sql y migración 01).';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'portal' and table_name = 'avisos'
        and column_name in ('cualidades_verificadas', 'cualidades_verificadas_por', 'cualidades_verificadas_en', 'propietario_email', 'destacado_hasta', 'publicado_en', 'propiedad_id')) <> 7 then
    raise exception 'Migración 23: a portal.avisos le faltan columnas de la migración 01 o del esquema (cualidades_verificadas*, propietario_email...).';
  end if;
  if to_regclass('storage.objects') is null or to_regprocedure('storage.foldername(text)') is null then
    raise exception 'Migración 23: no está el esquema storage de Supabase.';
  end if;
end $$;

-- ── 0b · Respaldo de lo que se pisa (solo en la primera corrida) ───
create table if not exists portal.respaldo_migracion_23 (
  clave     text primary key,
  valor     jsonb,
  creado_en timestamptz not null default now()
);
alter table portal.respaldo_migracion_23 enable row level security;
revoke all on portal.respaldo_migracion_23 from public, anon, authenticated;
comment on table portal.respaldo_migracion_23 is
  'Lo que pisó migracion-23-lanzamiento.sql en su primera corrida: definición de trg_aviso_sincroniza_os, políticas reemplazadas, límites de los buckets y permisos de lectura de avisos. Lo usa el rollback, que la borra al terminar. Sin políticas: solo el servidor y el SQL Editor.';

insert into portal.respaldo_migracion_23 (clave, valor)
select 'buckets', coalesce(jsonb_agg(jsonb_build_object('id', id, 'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types)), '[]'::jsonb)
  from storage.buckets where id in ('portal-fotos', 'portal-docs')
on conflict (clave) do nothing;

insert into portal.respaldo_migracion_23 (clave, valor)
values ('delete_fotos_authenticated', to_jsonb(has_table_privilege('authenticated', 'portal.fotos', 'DELETE')))
on conflict (clave) do nothing;

insert into portal.respaldo_migracion_23 (clave, valor)
values ('delete_avisos_authenticated', to_jsonb(has_table_privilege('authenticated', 'portal.avisos', 'DELETE')))
on conflict (clave) do nothing;

insert into portal.respaldo_migracion_23 (clave, valor)
select 'select_avisos', coalesce(jsonb_agg(distinct grantee), '[]'::jsonb)
  from information_schema.role_table_grants
 where table_schema = 'portal' and table_name = 'avisos' and privilege_type = 'SELECT' and grantee in ('anon', 'authenticated')
on conflict (clave) do nothing;

-- Índices de la sección 10 que ya existían con ese nombre: el rollback no los toca
insert into portal.respaldo_migracion_23 (clave, valor)
select 'indices_previos', coalesce(jsonb_agg(indexname), '[]'::jsonb)
  from pg_indexes
 where schemaname = 'portal' and indexname in ('avisos_publicador_idx', 'avisos_catalogo_idx', 'avisos_publicado_en_idx', 'avisos_slug_idx',
                                              'consultas_publicador_idx', 'consultas_aviso_idx', 'vistas_aviso_fecha_idx', 'visitas_reservas_aviso_idx')
on conflict (clave) do nothing;

do $$
begin
  if to_regprocedure('portal.trg_aviso_sincroniza_os()') is not null then
    insert into portal.respaldo_migracion_23 (clave, valor)
    values ('trg_aviso_sincroniza_os', to_jsonb(pg_get_functiondef('portal.trg_aviso_sincroniza_os()'::regprocedure)))
    on conflict (clave) do nothing;
  end if;
end $$;

-- Las políticas que esta migración reemplaza, tal como están hoy
insert into portal.respaldo_migracion_23 (clave, valor)
select 'politica|' || schemaname || '|' || tablename || '|' || policyname,
       jsonb_build_object('esquema', schemaname, 'tabla', tablename, 'nombre', policyname, 'permisiva', permissive,
                          'roles', to_jsonb(roles), 'cmd', cmd, 'using', qual, 'check', with_check)
  from pg_policies
 where (schemaname = 'portal' and tablename = 'avisos' and policyname in
          ('avisos propios select', 'avisos propios insert', 'avisos propios update',
           'avisos por membresia select', 'avisos por membresia insert', 'avisos por membresia update', 'propietario ve su aviso'))
    or (schemaname = 'portal' and tablename = 'fotos' and policyname = 'fotos propias all')
    or (schemaname = 'storage' and tablename = 'objects' and policyname in
          ('fotos sube autenticado', 'fotos edita autenticado', 'docs sube autenticado', 'docs borra su dueño'))
on conflict (clave) do nothing;

-- ── 1 · Columnas nuevas ────────────────────────────────────────────
-- disponible_desde: desde cuándo se puede entrar (mediano plazo). La usa el front en la tanda siguiente.
alter table portal.avisos add column if not exists disponible_desde date;
comment on column portal.avisos.disponible_desde is 'Mediano plazo: desde qué fecha la unidad está libre para entrar. Opcional (migración 23).';
-- unidades_borrador: la lista de unidades de un emprendimiento en borrador (publicar-aviso.html, paso Unidades), guardada
-- en el aviso base. Al enviar se crea un aviso por unidad y la lista vuelve a null. Hasta la 23 vivía solo en el navegador:
-- en otro dispositivo se perdía sin aviso (simulación de venta, 8/10/2026). Un arreglo, con tope de 64 KB (unas 300 unidades).
alter table portal.avisos add column if not exists unidades_borrador jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'portal.avisos'::regclass and conname = 'avisos_unidades_borrador_check') then
    alter table portal.avisos add constraint avisos_unidades_borrador_check
      check (unidades_borrador is null or (jsonb_typeof(unidades_borrador) = 'array' and octet_length(unidades_borrador::text) <= 65536));
  end if;
end $$;
comment on column portal.avisos.unidades_borrador is 'Emprendimiento en borrador: la lista de unidades (piso y unidad, ambientes, m², precio, estado) que carga la desarrolladora. Al enviar se crea un aviso por unidad y vuelve a null. Opcional (migración 23).';
-- Internas del disparador de curación (sección 3): la portada que vio el curador y quién pausó.
alter table portal.avisos add column if not exists portada_curada text;
alter table portal.avisos add column if not exists pausado_por text;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'portal.avisos'::regclass and conname = 'avisos_pausado_por_check') then
    alter table portal.avisos add constraint avisos_pausado_por_check check (pausado_por in ('publicador', 'curador', 'sistema'));
  end if;
end $$;
comment on column portal.avisos.portada_curada is 'URL de la portada (primera foto) cuando el aviso quedó publicado por un curador o el servidor. Si el publicador pone otra portada, el aviso vuelve a revisión (migración 23).';
comment on column portal.avisos.pausado_por is 'Quién pausó el aviso: publicador, curador o sistema. El publicador reactiva sin curación solo lo que pausó él (migración 23).';

-- La portada de hoy de lo publicado o pausado: lo que ya vio la curación. Sin tocar updated_at (se apaga
-- trg_av_upd para este UPDATE): la sincronización reactiva sola lo que pausó solo si nadie lo tocó después, y el
-- sitemap usa updated_at. Si algo falla, la transacción deshace también el apagado.
do $$
declare v_upd boolean := exists (select 1 from pg_trigger where tgrelid = 'portal.avisos'::regclass and tgname = 'trg_av_upd' and tgenabled <> 'D');
begin
  if v_upd then execute 'alter table portal.avisos disable trigger trg_av_upd'; end if;
  update portal.avisos a set portada_curada = f.url
    from (select distinct on (aviso_id) aviso_id, url from portal.fotos order by aviso_id, orden nulls last, id) f
   where f.aviso_id = a.id and a.estado_curacion in ('publicado', 'pausado') and a.portada_curada is null;
  if v_upd then execute 'alter table portal.avisos enable trigger trg_av_upd'; end if;
end $$;

-- ── 2 · Ayudantes ──────────────────────────────────────────────────
-- ¿El pedido viene de una cuenta o de la clave pública? (true) ¿O del servidor con la service key o del SQL Editor? (false)
create or replace function portal.es_cliente() returns boolean
language sql stable set search_path = portal, public as $$
  select auth.uid() is not null or coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated')
$$;
-- La misma clave de foto que D.claveFoto (portal/js/data.js): sin query, sin fragmento y siempre por /object/.
create or replace function portal.clave_foto(p_url text) returns text
language sql immutable as $$
  select nullif(replace(split_part(split_part(coalesce(p_url, ''), '#', 1), '?', 1), '/storage/v1/render/image/public/', '/storage/v1/object/public/'), '')
$$;
-- Texto comparable: sin espacios de más, en minúscula, vacío = null.
create or replace function portal.texto_comparable(p text) returns text
language sql immutable as $$ select nullif(lower(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g')), '') $$;
-- Portada de un aviso: la primera foto por orden.
create or replace function portal.portada_de(p_aviso uuid) returns text
language sql stable security definer set search_path = portal, public as $$
  select url from portal.fotos where aviso_id = p_aviso order by orden nulls last, id limit 1
$$;
revoke all on function portal.portada_de(uuid) from public, anon, authenticated;
-- Insignia que corresponde a cada tipo de publicador (la misma que pone publicar-aviso.html).
create or replace function portal.badge_por_tipo(p_tipo text) returns text
language sql immutable as $$
  select case p_tipo when 'dueno' then 'Dueño verificado' when 'desarrolladora' then 'Venta directa'
                     when 'gestor' then 'Gestor de alquileres' else 'Corredor inmobiliario matriculado' end
$$;

-- ── 3 · Avisos: lo de la curación lo cambia la curación ────────────
-- Quién: el servidor (service key, cron, SQL Editor) y los curadores pasan siempre. Para cualquier otra cuenta:
--   · Alta: nace en 'borrador' o 'en_revision' (si pide 'publicado', entra a la cola: 'en_revision'), sin
--     publicado_en, destacado, propiedad del OS ni cualidades verificadas.
--   · Edición: no cambia publicador_id, propiedad_id, publicado_en, destacado_hasta, cualidades_verificadas*, ni
--     escribe un motivo de rechazo (sí lo puede borrar al reenviar).
--   · Estados: borrador y en_revision, siempre. 'pausado', solo desde publicado. 'rechazado' y 'vencido', nunca.
--     'publicado': si ya lo estaba (editar), o para reactivar un aviso que pausó él mismo (pausado_por =
--     'publicador'). Si lo pausó el sistema (la sincronización, una migración) o un curador, pedir 'publicado'
--     lo manda a revisión. Ejemplo real: los avisos de Maxim Propiedades pausados en la 21.
--   · Un aviso publicado (o que se reactiva) vuelve a 'en_revision' si cambia la dirección, la unidad o la
--     operación (es otro aviso), o si su portada ya no es la que vio el curador. Precio, estado (reservado,
--     disponible, alquilado), descripción, fotos que no son la portada y el resto: libres, como dueño del aviso.
--   · Editar un aviso pausado lo deja pausado (el panel ya no lo pasa a borrador). Si en la pausa cambia la
--     dirección, la unidad o la operación, queda pausado_por = 'sistema': reactivarlo lo manda a revisión.
-- No lanza errores: lo que no le corresponde se conserva o se corrige, igual que proteger_verificacion. Así el
-- panel y la carga no se rompen; el resultado se ve en el estado del aviso.
create or replace function portal.proteger_curacion_aviso() returns trigger
language plpgsql security definer set search_path = portal, public as $$
declare
  v_quien   text;
  v_destino text;
  v_portada text;
begin
  if not portal.es_cliente() then v_quien := 'sistema';
  elsif portal.es_curador() then v_quien := 'curador';
  else v_quien := 'publicador';
  end if;

  if v_quien <> 'publicador' then
    if new.estado_curacion = 'publicado' and (tg_op = 'INSERT' or old.estado_curacion is distinct from 'publicado' or new.portada_curada is null) then
      new.portada_curada := coalesce(portal.portada_de(new.id), new.portada_curada);
    end if;
    if new.estado_curacion = 'pausado' then
      if tg_op = 'INSERT' or old.estado_curacion is distinct from 'pausado' then new.pausado_por := v_quien; end if;
    else
      new.pausado_por := null;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado_curacion := case when new.estado_curacion in ('borrador', 'en_revision') then new.estado_curacion
                                when new.estado_curacion = 'publicado' then 'en_revision' else 'borrador' end;
    new.publicado_en := null;
    new.destacado_hasta := null;
    new.propiedad_id := null;
    new.cualidades_verificadas := '{}';
    new.cualidades_verificadas_por := null;
    new.cualidades_verificadas_en := null;
    new.portada_curada := null;
    new.pausado_por := null;
    new.motivo_rechazo := null;
    return new;
  end if;

  new.publicador_id := old.publicador_id;
  new.propiedad_id := old.propiedad_id;
  new.publicado_en := old.publicado_en;
  new.destacado_hasta := old.destacado_hasta;
  new.cualidades_verificadas := old.cualidades_verificadas;
  new.cualidades_verificadas_por := old.cualidades_verificadas_por;
  new.cualidades_verificadas_en := old.cualidades_verificadas_en;
  new.portada_curada := old.portada_curada;
  if new.motivo_rechazo is not null and new.motivo_rechazo is distinct from old.motivo_rechazo then
    new.motivo_rechazo := old.motivo_rechazo;
  end if;

  v_destino := new.estado_curacion;
  if v_destino = 'publicado' then
    if old.estado_curacion = 'publicado' or (old.estado_curacion = 'pausado' and old.pausado_por = 'publicador') then
      if portal.texto_comparable(new.direccion) is distinct from portal.texto_comparable(old.direccion)
         or portal.texto_comparable(new.unidad) is distinct from portal.texto_comparable(old.unidad)
         or new.operacion is distinct from old.operacion then
        v_destino := 'en_revision';
      else
        v_portada := portal.portada_de(new.id);
        if v_portada is not null and portal.clave_foto(v_portada) is distinct from portal.clave_foto(old.portada_curada) then
          v_destino := 'en_revision';
        end if;
      end if;
    else
      v_destino := 'en_revision';
    end if;
  elsif v_destino in ('rechazado', 'vencido') then
    v_destino := old.estado_curacion;
  elsif v_destino = 'pausado' and old.estado_curacion not in ('publicado', 'pausado') then
    v_destino := old.estado_curacion;
  end if;
  new.estado_curacion := v_destino;

  if v_destino = 'pausado' then
    if old.estado_curacion = 'pausado'
       and (portal.texto_comparable(new.direccion) is distinct from portal.texto_comparable(old.direccion)
            or portal.texto_comparable(new.unidad) is distinct from portal.texto_comparable(old.unidad)
            or new.operacion is distinct from old.operacion) then
      new.pausado_por := 'sistema';
    else
      new.pausado_por := case when old.estado_curacion = 'pausado' then old.pausado_por else 'publicador' end;
    end if;
  else
    new.pausado_por := null;
  end if;
  return new;
end $$;
revoke all on function portal.proteger_curacion_aviso() from public, anon, authenticated;

-- El nombre ordena: corre antes que trg_av_upd y que trg_aviso_sincroniza_os (orden alfabético de Postgres),
-- así lo que este corrige ya llega corregido al disparador del OS.
drop trigger if exists trg_av_curacion on portal.avisos;
create trigger trg_av_curacion before insert or update on portal.avisos
  for each row execute function portal.proteger_curacion_aviso();

-- ── 4 · Fotos: una portada nueva en un aviso publicado vuelve a revisión ──
-- store.js saveAviso borra todas las fotos y las vuelve a insertar en cada guardado: borrar no cuenta (deja el
-- aviso sin portada un instante) y volver a poner la misma portada tampoco. Cuenta que la primera foto sea otra
-- que la curada (portada_curada). Si las cambia el servidor (sincronización) o un curador, esa pasa a ser la
-- portada curada.
create or replace function portal.fotos_cuidan_portada() returns trigger
language plpgsql security definer set search_path = portal, public as $$
declare
  v_aviso   uuid;
  v_estado  text;
  v_curada  text;
  v_portada text;
begin
  v_aviso := case when tg_op = 'DELETE' then old.aviso_id else new.aviso_id end;
  select estado_curacion, portada_curada into v_estado, v_curada from portal.avisos where id = v_aviso;
  if v_estado is distinct from 'publicado' then return null; end if;
  v_portada := portal.portada_de(v_aviso);
  if not portal.es_cliente() or portal.es_curador() then
    if v_portada is not null and v_portada is distinct from v_curada then
      update portal.avisos set portada_curada = v_portada where id = v_aviso;
    end if;
    return null;
  end if;
  if tg_op = 'DELETE' then return null; end if;
  if v_portada is not null and portal.clave_foto(v_portada) is distinct from portal.clave_foto(v_curada) then
    update portal.avisos set estado_curacion = 'en_revision' where id = v_aviso;
  end if;
  return null;
end $$;
revoke all on function portal.fotos_cuidan_portada() from public, anon, authenticated;
drop trigger if exists trg_fotos_portada on portal.fotos;
create trigger trg_fotos_portada after insert or update or delete on portal.fotos
  for each row execute function portal.fotos_cuidan_portada();

-- ── 5 · Publicadores: slug, insignia y verificación son de la curación ──
-- Para una cuenta que no es curador (el servidor y los curadores pasan):
--   · Alta: verificado false; la insignia es la del tipo (nunca 'Selección BAIREN'); el slug se respeta si es
--     un slug válido (a-z, 0-9 y guiones, 3 a 80) y no dice "bairen"; si no, 'publicador-' + 8 letras de su cuenta.
--   · Edición: slug, verificado y verificado_en quedan como estaban. La insignia también, salvo que cambie el
--     tipo (mientras no está verificado, proteger_verificacion lo deja): entonces la del tipo nuevo.
-- Convive con proteger_verificacion (schema-portal.sql), que corre después por orden alfabético.
create or replace function portal.proteger_curacion_publicador() returns trigger
language plpgsql security definer set search_path = portal, public as $$
begin
  if not portal.es_cliente() or portal.es_curador() then return new; end if;
  if tg_op = 'INSERT' then
    new.verificado := false;
    new.verificado_en := null;
    new.badge := portal.badge_por_tipo(new.tipo);
    if new.slug is null or new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new.slug) not between 3 and 80 or new.slug ~ 'bairen' then
      new.slug := 'publicador-' || substr(md5(coalesce(auth.uid()::text, gen_random_uuid()::text)), 1, 8);
    end if;
    return new;
  end if;
  new.slug := old.slug;
  new.verificado := old.verificado;
  new.verificado_en := old.verificado_en;
  new.badge := case when new.tipo is distinct from old.tipo then portal.badge_por_tipo(new.tipo) else old.badge end;
  return new;
end $$;
revoke all on function portal.proteger_curacion_publicador() from public, anon, authenticated;
drop trigger if exists trg_pub_curacion on portal.publicadores;
create trigger trg_pub_curacion before insert or update on portal.publicadores
  for each row execute function portal.proteger_curacion_publicador();

-- ── 6 · El OS solo para BAIREN REALTY ──────────────────────────────
-- trg_aviso_sincroniza_os (sql/008-aviso-propiedad.sql del repo del OS) crea una propiedad en public.propiedades
-- cada vez que un aviso queda publicado, con el slug del publicador como tenant. Con publicadores de afuera eso
-- llenaría el OS de propiedades ajenas. Ahora solo actúa si el publicador es 'bairen'. El resto de la función,
-- igual que la 008. Si la base no tiene el disparador (otra copia), se avisa y se sigue.
do $$
begin
  if to_regprocedure('portal.trg_aviso_sincroniza_os()') is null or to_regprocedure('portal.propiedad_para_aviso(portal.avisos,boolean)') is null then
    raise notice 'Migración 23: no está portal.trg_aviso_sincroniza_os (OS 008); se omite la sección 6.';
    return;
  end if;
  execute $f$
create or replace function portal.trg_aviso_sincroniza_os() returns trigger
language plpgsql security definer set search_path = portal, public as $b$
begin
  -- Migración 23 del portal (8/10/2026): solo los avisos de BAIREN REALTY (publicador slug 'bairen') crean o
  -- vinculan una propiedad en el OS. Crea solo al publicar un aviso nuevo; en cambios posteriores solo vincula.
  if new.estado_curacion = 'publicado'
     and exists (select 1 from portal.publicadores p where p.id = new.publicador_id and p.slug = 'bairen') then
    new.propiedad_id := coalesce(portal.propiedad_para_aviso(new, tg_op = 'INSERT' or old.propiedad_id is null and old.estado_curacion is distinct from 'publicado'), new.propiedad_id);
  end if;
  return new;
end $b$;
  $f$;
end $$;

-- ── 7 · Storage: cada cuenta en su carpeta ─────────────────────────
-- Rutas (store.js):
--   portal-fotos  hoy:   <id del aviso | slug | 'nuevo-XXXX'>/<marca>-<i>.jpg  y  miniaturas/<lo mismo>
--                 nueva: <id de la cuenta>/<id o slug del aviso>/<marca>-<i>.jpg  y  miniaturas/<id de la cuenta>/...
--                 (cambio mínimo en S.uploadFoto, equipo de carga). Se acepta la nueva y, para no cortar la carga
--                 mientras tanto, la de hoy cuando la carpeta es el id de un aviso de la cuenta. La de slug o
--                 'nuevo-XXXX' no dice de quién es: queda rechazada.
--   portal-docs   <id del publicador>/<tipo>-<marca>.<ext> (S.uploadDoc): el publicador tiene que ser de la cuenta.
create or replace function portal.carpeta_aviso_propio(p_name text) returns boolean
language sql stable security definer set search_path = portal, public as $$
  select coalesce((
    select exists (select 1 from portal.avisos a
                    where a.id = c.carpeta::uuid
                      and (a.publicador_id = portal.mi_publicador() or portal.es_miembro(a.publicador_id)))
      from (select case when f[1] = 'miniaturas' then f[2] else f[1] end as carpeta from (select storage.foldername(p_name) as f) x) c
     where c.carpeta ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), false)
$$;
create or replace function portal.carpeta_publicador_propio(p_name text) returns boolean
language sql stable security definer set search_path = portal, public as $$
  select coalesce((
    select exists (select 1 from portal.publicadores pb
                    where pb.id = c.carpeta::uuid and (pb.auth_user_id = auth.uid() or portal.es_miembro(pb.id)))
      from (select (storage.foldername(p_name))[1] as carpeta) c
     where c.carpeta ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'), false)
$$;
revoke all on function portal.carpeta_aviso_propio(text) from public, anon;
revoke all on function portal.carpeta_publicador_propio(text) from public, anon;
grant execute on function portal.carpeta_aviso_propio(text), portal.carpeta_publicador_propio(text) to authenticated;

update storage.buckets set file_size_limit = 15728640, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
 where id = 'portal-fotos';
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
 where id = 'portal-docs';

drop policy if exists "fotos sube autenticado" on storage.objects;
drop policy if exists "fotos edita autenticado" on storage.objects;
drop policy if exists "fotos sube en su carpeta" on storage.objects;
drop policy if exists "fotos edita en su carpeta" on storage.objects;
drop policy if exists "fotos borra en su carpeta" on storage.objects;
create policy "fotos sube en su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-fotos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = 'miniaturas' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or portal.carpeta_aviso_propio(name)
    or (select portal.es_curador())));
create policy "fotos edita en su carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'portal-fotos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = 'miniaturas' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or portal.carpeta_aviso_propio(name)
    or (select portal.es_curador())))
  with check (bucket_id = 'portal-fotos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = 'miniaturas' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or portal.carpeta_aviso_propio(name)
    or (select portal.es_curador())));
create policy "fotos borra en su carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'portal-fotos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] = 'miniaturas' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or portal.carpeta_aviso_propio(name)
    or (select portal.es_curador())));

drop policy if exists "docs sube autenticado" on storage.objects;
drop policy if exists "docs borra su dueño" on storage.objects;
drop policy if exists "docs sube en su carpeta" on storage.objects;
drop policy if exists "docs edita los suyos" on storage.objects;
drop policy if exists "docs ve los suyos" on storage.objects;
drop policy if exists "docs borra los suyos" on storage.objects;
create policy "docs sube en su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-docs' and portal.carpeta_publicador_propio(name));
-- Ver, reemplazar y borrar: solo lo que subió esa cuenta, en su carpeta (upsert necesita ver y reemplazar).
-- El curador sigue con "docs lee curador" y "docs borra curador" (schema-portal.sql), que no se tocan.
create policy "docs ve los suyos" on storage.objects for select to authenticated
  using (bucket_id = 'portal-docs' and owner = (select auth.uid()) and portal.carpeta_publicador_propio(name));
create policy "docs edita los suyos" on storage.objects for update to authenticated
  using (bucket_id = 'portal-docs' and owner = (select auth.uid()) and portal.carpeta_publicador_propio(name))
  with check (bucket_id = 'portal-docs' and portal.carpeta_publicador_propio(name));
create policy "docs borra los suyos" on storage.objects for delete to authenticated
  using (bucket_id = 'portal-docs' and owner = (select auth.uid()) and portal.carpeta_publicador_propio(name));

-- ── 8 · propietario_email, cerrado de verdad ───────────────────────
-- schema-portal.sql:409 hacía revoke select (propietario_email) from anon, pero el grant de tabla de la línea
-- 241 lo anulaba: con permiso sobre la tabla, el revoke de una columna no cambia nada. Ahora anon y authenticated
-- tienen select columna por columna, todas menos propietario_email (las de hoy, incluidas disponible_desde y
-- unidades_borrador; esta última solo tiene datos en borradores, que la clave pública no ve).
-- Revocar el select de tabla también revoca los de columna, así que esto es repetible.
-- Efecto en el front: nadie con la clave pública puede pedir `*` de avisos (falla entero). store.js ya no lo
-- pide (S.COLS); saveAviso tiene que pedir .select(S.COLS.AVISO).
do $$
declare v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'portal' and table_name = 'avisos' and column_name <> 'propietario_email';
  execute 'revoke select on portal.avisos from anon, authenticated';
  execute format('grant select (%s) on portal.avisos to anon, authenticated', v_cols);
end $$;

-- El mail lo leen el publicador del aviso (o un miembro), un curador y el propio propietario.
-- La vista corre con los permisos de su dueño y filtra ella; security_barrier para que un filtro del pedido
-- no se adelante al de la vista.
create or replace view portal.avisos_propietario with (security_barrier = true) as
  select a.id, a.publicador_id, a.propietario_email
    from portal.avisos a
   where portal.es_curador()
      or a.publicador_id = portal.mi_publicador()
      or portal.es_miembro(a.publicador_id)
      or (a.propietario_email is not null and lower(a.propietario_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
revoke all on portal.avisos_propietario from public, anon, authenticated;
grant select on portal.avisos_propietario to authenticated;
comment on view portal.avisos_propietario is
  'El mail del propietario de cada aviso, solo para el publicador del aviso (o un miembro), un curador o el propio propietario. La tabla avisos no lo deja leer con la clave pública (migración 23).';

-- ── 9 · Topes de largo ─────────────────────────────────────────────
-- Lo que escribe cualquiera sin cuenta (consultas, vistas, eventos, denuncias) tiene tope. NOT VALID: no revisa
-- las filas que ya están, solo las nuevas. Los topes del formulario de la ficha conviene ponerlos también en el
-- HTML (maxlength), para que nadie pierda una consulta larga.
do $$
declare r record;
begin
  for r in select * from (values
      ('consultas', 'm23_consultas_nombre',    'char_length(nombre) <= 120'),
      ('consultas', 'm23_consultas_email',     'char_length(email) <= 254'),
      ('consultas', 'm23_consultas_telefono',  'char_length(telefono) <= 40'),
      ('consultas', 'm23_consultas_mensaje',   'char_length(mensaje) <= 2000'),
      ('consultas', 'm23_consultas_refs',      'char_length(aviso_ref) <= 200 and char_length(publicador_ref) <= 200 and char_length(enviada_a) <= 254'),
      ('vistas',    'm23_vistas_ref',          'char_length(aviso_ref) <= 200'),
      ('eventos',   'm23_eventos_textos',      'char_length(evento) <= 60 and char_length(aviso_ref) <= 200 and char_length(publicador_ref) <= 200 and char_length(canal) <= 40'),
      ('eventos',   'm23_eventos_datos',       'octet_length(datos::text) <= 8192'),
      ('denuncias', 'm23_denuncias_motivo',    'char_length(motivo) <= 120'),
      ('denuncias', 'm23_denuncias_detalle',   'char_length(detalle) <= 2000')
    ) t(tabla, nombre, expr)
  loop
    if not exists (select 1 from pg_constraint where conname = r.nombre and conrelid = ('portal.' || r.tabla)::regclass) then
      execute format('alter table portal.%I add constraint %I check (%s) not valid', r.tabla, r.nombre, r.expr);
    end if;
  end loop;
end $$;

-- ── 10 · Índices y conteo de vistas ────────────────────────────────
create index if not exists avisos_publicador_idx     on portal.avisos (publicador_id);
create index if not exists avisos_catalogo_idx       on portal.avisos (estado_curacion, operacion, zona, precio);
create index if not exists avisos_publicado_en_idx   on portal.avisos (publicado_en desc nulls last, id) where estado_curacion = 'publicado';
create index if not exists avisos_slug_idx           on portal.avisos (slug);
create index if not exists consultas_publicador_idx  on portal.consultas (publicador_id);
create index if not exists consultas_aviso_idx       on portal.consultas (aviso_id);
create index if not exists vistas_aviso_fecha_idx    on portal.vistas (aviso_id, fecha);
create index if not exists visitas_reservas_aviso_idx on portal.visitas_reservas (aviso_id);

-- Vistas de unos avisos (hasta 200 por pedido), contadas con índice. Mismo resultado que portal.vistas_por_aviso
-- (ref = aviso_ref, o el id si no hay ref), sin agrupar la tabla entera. La pide la ficha (BPStore.addVista) y el
-- panel (BPStore.vistasDe). Es el mismo dato que la vista ya mostraba a cualquiera.
create or replace function portal.vistas_de(p_refs text[]) returns table (ref text, vistas integer)
language sql stable security definer set search_path = portal, public as $$
  select r.ref,
         (case when r.ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               then (select count(*) from portal.vistas v where v.aviso_id = r.ref::uuid and v.aviso_ref is null)
               else 0 end
          + (select count(*) from portal.vistas v where v.aviso_ref = r.ref))::integer
    from (select distinct x as ref from unnest((coalesce(p_refs, '{}'::text[]))[1:200]) x where x is not null) r
$$;
revoke all on function portal.vistas_de(text[]) from public;
grant execute on function portal.vistas_de(text[]) to anon, authenticated, service_role;

-- ── 11 · Políticas de avisos y fotos que son de una cuenta ─────────
-- Mismo efecto que antes, pero `to authenticated`: una visita sin cuenta (el tráfico de los anuncios) ya no las
-- evalúa fila por fila, y las funciones que no dependen de la fila van en (select ...) para correr una vez.
drop policy if exists "avisos propios select" on portal.avisos;
create policy "avisos propios select" on portal.avisos for select to authenticated
  using (publicador_id = (select portal.mi_publicador()) or (select portal.es_curador()));
drop policy if exists "avisos propios insert" on portal.avisos;
create policy "avisos propios insert" on portal.avisos for insert to authenticated
  with check (publicador_id = (select portal.mi_publicador()));
drop policy if exists "avisos propios update" on portal.avisos;
create policy "avisos propios update" on portal.avisos for update to authenticated
  using (publicador_id = (select portal.mi_publicador()) or (select portal.es_curador()));
drop policy if exists "avisos por membresia select" on portal.avisos;
create policy "avisos por membresia select" on portal.avisos for select to authenticated
  using (portal.es_miembro(publicador_id));
drop policy if exists "avisos por membresia insert" on portal.avisos;
create policy "avisos por membresia insert" on portal.avisos for insert to authenticated
  with check (portal.es_miembro(publicador_id));
drop policy if exists "avisos por membresia update" on portal.avisos;
create policy "avisos por membresia update" on portal.avisos for update to authenticated
  using (portal.es_miembro(publicador_id));
drop policy if exists "propietario ve su aviso" on portal.avisos;
create policy "propietario ve su aviso" on portal.avisos for select to authenticated
  using (propietario_email is not null and lower(propietario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))));
drop policy if exists "fotos propias all" on portal.fotos;
-- El publicador reemplaza las fotos de su aviso borrándolas y volviendo a insertarlas (store.js saveAviso). La
-- política siempre lo permitió (for all), pero authenticated nunca tuvo DELETE sobre portal.fotos: el borrado fallaba
-- callado y las fotos se duplicaban (las fichas con la misma foto tres veces, ver D.fotosUnicas en data.js). Se da
-- DELETE; la política sigue diciendo de qué avisos.
grant delete on portal.fotos to authenticated;
create policy "fotos propias all" on portal.fotos for all to authenticated
  using (exists (select 1 from portal.avisos a where a.id = aviso_id
                  and (a.publicador_id = (select portal.mi_publicador()) or (select portal.es_curador()))));
-- Borrar (panel → ··· → Borrar): solo un borrador propio que nunca estuvo publicado (sin publicado_en). Lo que estuvo
-- en línea tiene consultas, favoritos y vistas que lo nombran: eso no se borra, se pausa. Fotos, alertas y el
-- historial de precio se van con el aviso (on delete cascade).
grant delete on portal.avisos to authenticated;
drop policy if exists "avisos borrador se borra" on portal.avisos;
create policy "avisos borrador se borra" on portal.avisos for delete to authenticated
  using (estado_curacion = 'borrador' and publicado_en is null
         and (publicador_id = (select portal.mi_publicador()) or portal.es_miembro(publicador_id)));

commit;

-- ── Tablero ────────────────────────────────────────────────────────
select n, control, ok from (values
  (1, 'columna avisos.disponible_desde',
      exists (select 1 from information_schema.columns where table_schema = 'portal' and table_name = 'avisos' and column_name = 'disponible_desde')),
  (1, 'columna avisos.unidades_borrador (jsonb, con tope)',
      exists (select 1 from information_schema.columns where table_schema = 'portal' and table_name = 'avisos' and column_name = 'unidades_borrador' and data_type = 'jsonb')
      and exists (select 1 from pg_constraint where conrelid = 'portal.avisos'::regclass and conname = 'avisos_unidades_borrador_check')),
  (2, 'disparador trg_av_curacion (avisos)',
      exists (select 1 from pg_trigger where tgrelid = 'portal.avisos'::regclass and tgname = 'trg_av_curacion' and tgenabled = 'O')),
  (3, 'disparador trg_fotos_portada (fotos)',
      exists (select 1 from pg_trigger where tgrelid = 'portal.fotos'::regclass and tgname = 'trg_fotos_portada' and tgenabled = 'O')),
  (4, 'disparador trg_pub_curacion (publicadores)',
      exists (select 1 from pg_trigger where tgrelid = 'portal.publicadores'::regclass and tgname = 'trg_pub_curacion' and tgenabled = 'O')),
  (5, 'trg_aviso_sincroniza_os solo para bairen (o no existe)',
      to_regprocedure('portal.trg_aviso_sincroniza_os()') is null
      or pg_get_functiondef('portal.trg_aviso_sincroniza_os()'::regprocedure) like '%p.slug = ''bairen''%'),
  (6, 'buckets con tope y tipos',
      not exists (select 1 from storage.buckets where id in ('portal-fotos', 'portal-docs') and (file_size_limit is null or allowed_mime_types is null))),
  (7, 'anon NO lee propietario_email',
      not has_column_privilege('anon', 'portal.avisos', 'propietario_email', 'SELECT')),
  (7, 'authenticated NO lee propietario_email de la tabla',
      not has_column_privilege('authenticated', 'portal.avisos', 'propietario_email', 'SELECT')),
  (7, 'anon lee el resto (precio, descripcion)',
      has_column_privilege('anon', 'portal.avisos', 'precio', 'SELECT') and has_column_privilege('anon', 'portal.avisos', 'descripcion', 'SELECT')),
  (8, 'topes de largo (10 restricciones m23_)',
      (select count(*) from pg_constraint where conname like 'm23\_%') = 10),
  (9, 'índices nuevos (8)',
      (select count(*) from pg_indexes where schemaname = 'portal' and indexname in ('avisos_publicador_idx', 'avisos_catalogo_idx', 'avisos_publicado_en_idx', 'avisos_slug_idx', 'consultas_publicador_idx', 'consultas_aviso_idx', 'vistas_aviso_fecha_idx', 'visitas_reservas_aviso_idx')) = 8),
  (9, 'función vistas_de',
      to_regprocedure('portal.vistas_de(text[])') is not null),
  (10, 'borrar: solo un borrador propio sin publicar (política de delete en avisos)',
      exists (select 1 from pg_policies where schemaname = 'portal' and tablename = 'avisos' and policyname = 'avisos borrador se borra' and cmd = 'DELETE')
      and has_table_privilege('authenticated', 'portal.avisos', 'DELETE')),
  (10, 'políticas de storage nuevas solo para authenticated',
      not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                   and policyname in ('fotos sube en su carpeta', 'fotos edita en su carpeta', 'fotos borra en su carpeta', 'docs sube en su carpeta', 'docs ve los suyos', 'docs edita los suyos', 'docs borra los suyos')
                   and roles <> '{authenticated}'::name[])),
  (11, 'respaldo guardado',
      (select count(*) from portal.respaldo_migracion_23) >= 2)
) t(n, control, ok) order by n;
