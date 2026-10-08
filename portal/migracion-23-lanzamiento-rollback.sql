-- =====================================================================
-- BAIREN · Portal · Migración 23 · VUELTA ATRÁS
--
-- Deshace portal/migracion-23-lanzamiento.sql con lo que ella guardó en
-- portal.respaldo_migracion_23 en su primera corrida:
--   · trg_aviso_sincroniza_os vuelve a la definición que tenía (la del OS);
--   · las políticas de avisos, fotos y storage que reemplazó vuelven tal
--     cual estaban, y se borran las nuevas;
--   · los buckets vuelven a su tope y tipos de antes;
--   · anon y authenticated vuelven a tener select de tabla en avisos (o sea,
--     propietario_email vuelve a quedar a la vista, como antes);
--   · se borran los disparadores, la vista avisos_propietario, la función
--     vistas_de, los topes de largo y los índices que creó (los que ya
--     existían con ese nombre se dejan);
--   · se borran las columnas portada_curada y pausado_por. disponible_desde
--     y unidades_borrador se borran solo si están vacías en todos los avisos;
--     si alguien ya las usó, quedan y se avisa (no se borran datos). Sin
--     unidades_borrador, el front vuelve a guardar la lista de unidades en el
--     navegador y avisa que el envío se termina desde ese dispositivo.
-- Al final borra portal.respaldo_migracion_23. Después se puede volver a
-- correr la 23.
--
-- OJO: después de esto el front sigue andando (las listas de columnas
-- sirven con o sin la 23). Lo que se pierde es la protección.
-- Subir el archivo en el SQL Editor, no pegarlo.
-- =====================================================================

begin;

do $$
begin
  if to_regclass('portal.respaldo_migracion_23') is null then
    raise exception 'No está portal.respaldo_migracion_23: la migración 23 no corrió o ya se deshizo.';
  end if;
end $$;

-- ── Políticas: se borran las de la 23 y vuelven las de antes ───────
drop policy if exists "avisos propios select" on portal.avisos;
drop policy if exists "avisos propios insert" on portal.avisos;
drop policy if exists "avisos propios update" on portal.avisos;
drop policy if exists "avisos por membresia select" on portal.avisos;
drop policy if exists "avisos por membresia insert" on portal.avisos;
drop policy if exists "avisos por membresia update" on portal.avisos;
drop policy if exists "propietario ve su aviso" on portal.avisos;
drop policy if exists "fotos propias all" on portal.fotos;
drop policy if exists "fotos sube en su carpeta" on storage.objects;
drop policy if exists "fotos edita en su carpeta" on storage.objects;
drop policy if exists "fotos borra en su carpeta" on storage.objects;
drop policy if exists "docs sube en su carpeta" on storage.objects;
drop policy if exists "docs ve los suyos" on storage.objects;
drop policy if exists "docs edita los suyos" on storage.objects;
drop policy if exists "docs borra los suyos" on storage.objects;

do $$
declare
  r       record;
  v       jsonb;
  v_roles text;
begin
  for r in select valor from portal.respaldo_migracion_23 where clave like 'politica|%' order by clave loop
    v := r.valor;
    select string_agg(case when x = 'public' then 'public' else quote_ident(x) end, ', ') into v_roles
      from jsonb_array_elements_text(v->'roles') x;
    execute format('drop policy if exists %I on %I.%I', v->>'nombre', v->>'esquema', v->>'tabla');
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',
                   v->>'nombre', v->>'esquema', v->>'tabla',
                   case when v->>'permisiva' = 'RESTRICTIVE' then 'restrictive' else 'permissive' end,
                   v->>'cmd', coalesce(v_roles, 'public'),
                   case when v->>'using' is not null then ' using (' || (v->>'using') || ')' else '' end,
                   case when v->>'check' is not null then ' with check (' || (v->>'check') || ')' else '' end);
  end loop;
end $$;

-- ── Buckets como estaban ───────────────────────────────────────────
update storage.buckets b
   set file_size_limit = nullif(x->>'file_size_limit', '')::bigint,
       allowed_mime_types = case when jsonb_typeof(x->'allowed_mime_types') = 'array'
                                 then (select array_agg(m) from jsonb_array_elements_text(x->'allowed_mime_types') m) end
  from portal.respaldo_migracion_23 r, jsonb_array_elements(r.valor) x
 where r.clave = 'buckets' and b.id = x->>'id';

-- ── Lectura de avisos como estaba ──────────────────────────────────
drop view if exists portal.avisos_propietario;
do $$
declare v jsonb;
begin
  select valor into v from portal.respaldo_migracion_23 where clave = 'select_avisos';
  execute 'revoke select on portal.avisos from anon, authenticated';   -- también saca los de columna
  if v is null or v ? 'anon' then execute 'grant select on portal.avisos to anon'; end if;
  if v is null or v ? 'authenticated' then execute 'grant select on portal.avisos to authenticated'; end if;
  execute 'revoke select (propietario_email) on portal.avisos from anon';   -- igual que schema-portal.sql:409
end $$;

-- DELETE en fotos para authenticated, como estaba
do $$
begin
  if coalesce((select (valor #>> '{}')::boolean from portal.respaldo_migracion_23 where clave = 'delete_fotos_authenticated'), false) is false then
    execute 'revoke delete on portal.fotos from authenticated';
  end if;
end $$;

-- ── El disparador del OS vuelve a su definición ────────────────────
do $$
declare v_def text;
begin
  select valor #>> '{}' into v_def from portal.respaldo_migracion_23 where clave = 'trg_aviso_sincroniza_os';
  if v_def is not null then execute v_def; end if;
end $$;

-- ── Disparadores y funciones de la 23 ──────────────────────────────
drop trigger if exists trg_av_curacion on portal.avisos;
drop trigger if exists trg_fotos_portada on portal.fotos;
drop trigger if exists trg_pub_curacion on portal.publicadores;
drop function if exists portal.proteger_curacion_aviso();
drop function if exists portal.fotos_cuidan_portada();
drop function if exists portal.proteger_curacion_publicador();
drop function if exists portal.vistas_de(text[]);
drop function if exists portal.carpeta_aviso_propio(text);
drop function if exists portal.carpeta_publicador_propio(text);
drop function if exists portal.portada_de(uuid);
drop function if exists portal.badge_por_tipo(text);
drop function if exists portal.texto_comparable(text);
drop function if exists portal.clave_foto(text);
drop function if exists portal.es_cliente();

-- ── Topes de largo ─────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select conrelid::regclass::text as tabla, conname from pg_constraint
            where conname like 'm23\_%' and connamespace = 'portal'::regnamespace loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
  end loop;
end $$;

-- ── Índices (solo los que creó la 23) ──────────────────────────────
do $$
declare
  v_previos jsonb;
  i         text;
begin
  select valor into v_previos from portal.respaldo_migracion_23 where clave = 'indices_previos';
  foreach i in array array['avisos_publicador_idx', 'avisos_catalogo_idx', 'avisos_publicado_en_idx', 'avisos_slug_idx',
                           'consultas_publicador_idx', 'consultas_aviso_idx', 'vistas_aviso_fecha_idx', 'visitas_reservas_aviso_idx'] loop
    if not coalesce(v_previos ? i, false) then execute format('drop index if exists portal.%I', i); end if;
  end loop;
end $$;

-- ── Columnas ───────────────────────────────────────────────────────
alter table portal.avisos drop constraint if exists avisos_pausado_por_check;
alter table portal.avisos drop column if exists portada_curada;
alter table portal.avisos drop column if exists pausado_por;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'portal' and table_name = 'avisos' and column_name = 'disponible_desde') then
    if exists (select 1 from portal.avisos where disponible_desde is not null) then
      raise notice 'disponible_desde tiene datos: se deja la columna (no se borran datos).';
    else
      alter table portal.avisos drop column disponible_desde;
    end if;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'portal' and table_name = 'avisos' and column_name = 'unidades_borrador') then
    if exists (select 1 from portal.avisos where unidades_borrador is not null) then
      raise notice 'unidades_borrador tiene datos (emprendimientos en borrador): se deja la columna y su tope (no se borran datos).';
    else
      alter table portal.avisos drop constraint if exists avisos_unidades_borrador_check;
      alter table portal.avisos drop column unidades_borrador;
    end if;
  end if;
end $$;

drop table portal.respaldo_migracion_23;

commit;

-- ── Tablero ────────────────────────────────────────────────────────
select control, ok from (values
  ('sin disparadores de la 23',
     not exists (select 1 from pg_trigger where tgname in ('trg_av_curacion', 'trg_fotos_portada', 'trg_pub_curacion'))),
  ('anon vuelve a tener select de tabla en avisos',
     has_table_privilege('anon', 'portal.avisos', 'SELECT')),
  ('sin vista avisos_propietario', to_regclass('portal.avisos_propietario') is null),
  ('sin topes m23_', not exists (select 1 from pg_constraint where conname like 'm23\_%')),
  ('trg_aviso_sincroniza_os como antes (o no existe)',
     to_regprocedure('portal.trg_aviso_sincroniza_os()') is null
     or pg_get_functiondef('portal.trg_aviso_sincroniza_os()'::regprocedure) not like '%p.slug = ''bairen''%'),
  ('políticas de storage de antes',
     exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'fotos sube autenticado')),
  ('sin respaldo_migracion_23', to_regclass('portal.respaldo_migracion_23') is null)
) t(control, ok);
