-- =====================================================================
-- BAIREN · Portal · Migración 29 · Identidad verificada y datos de quien ofrece
--
-- 9/10/2026. Riel "identidad" del plan Rieles. Dos cosas:
--
--   A. Identidad verificada, una vez por persona. Quien tiene cuenta sube el frente y el dorso de su documento y una
--      selfie (cuenta-verificacion.html); la curación lo revisa y lo aprueba o lo rechaza con un motivo. Al resolver,
--      la página de curación borra las tres fotos del bucket (Ley 25.326: lo mínimo y los documentos se borran apenas se
--      resuelven). Lo usan la reserva y la firma (BPDigital.identidadVerificada() en el navegador y
--      portal.identidad_verificada(uid) en las funciones SQL de esos módulos). La verificación no cobra nada: no es un
--      paso de la operación y no pasa por las reglas de cobro (al inquilino de vivienda no se le cobra, Ley 5859).
--        1. portal.personas: identidad_estado ('sin','pendiente','verificada','rechazada'), identidad_verificada_en e
--           identidad_motivo. Al aprobar se completa también dni_verificado_en, que portal.contacto_interesado ya usa
--           como "verificado".
--        2. portal.verificaciones_identidad: cada pedido, con las rutas de las tres fotos, fechas, quién lo revisó y
--           el motivo. Solo se escribe por funciones.
--        3. Bucket privado portal-identidad: cada cuenta sube solo a su carpeta (<auth.uid()>/…) y no puede leer ni lo
--           suyo; solo la curación lee (con URL firmada de corta duración) y borra.
--        4. Funciones: mi_identidad() y solicitar_verificacion(…) para la persona; verificaciones_cola(),
--           resolver_verificacion(id, ok, motivo) y confirmar_borrado_identidad(id) para la curación;
--           identidad_verificada(uid), interna, para los otros módulos.
--        5. Un disparador que no deja que una cuenta se marque verificada sola ni cambie su nombre o su documento
--           mientras está en revisión o ya verificada.
--   B. Datos de quien ofrece (Res. SIC 446/2025: toda publicidad da acceso al nombre o la razón social, el domicilio y
--      el CUIT de quien ofrece).
--        6. portal.publicadores.domicilio_legal.
--        7. La vista pública portal.publicador_publico suma razon_social (solo de empresas: de un dueño directo, persona
--           física, se muestra su nombre público), cuit y domicilio_legal, al final y sin tocar las columnas de antes.
--
-- Nada se borra. Ensayada en una transacción deshecha con usuarios de prueba. Vuelta atrás:
-- migracion-29-identidad-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Personas: el estado de la identidad
-- ---------------------------------------------------------------------
alter table portal.personas
  add column if not exists identidad_estado        text not null default 'sin',
  add column if not exists identidad_verificada_en timestamptz,
  add column if not exists identidad_motivo        text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'm29_per_identidad') then
    alter table portal.personas add constraint m29_per_identidad check (identidad_estado in ('sin','pendiente','verificada','rechazada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'm29_per_motivo') then
    alter table portal.personas add constraint m29_per_motivo check (identidad_motivo is null or char_length(identidad_motivo) <= 300);
  end if;
end $$;

-- Quien ya tenía el documento verificado de antes queda verificado (hoy, nadie)
update portal.personas set identidad_estado = 'verificada', identidad_verificada_en = dni_verificado_en
 where dni_verificado_en is not null and identidad_estado = 'sin';

-- ---------------------------------------------------------------------
-- 2. Los pedidos de verificación
-- ---------------------------------------------------------------------
create table if not exists portal.verificaciones_identidad (
  id                    uuid primary key default gen_random_uuid(),
  persona_id            uuid not null references portal.personas(id) on delete cascade,
  usuario               uuid not null references auth.users(id) on delete cascade,
  estado                text not null default 'pendiente',
  frente                text,            -- rutas dentro del bucket portal-identidad; quedan en null al borrar las fotos
  dorso                 text,
  selfie                text,
  consentimiento_en     timestamptz not null default now(),
  creado_en             timestamptz not null default now(),
  resuelta_en           timestamptz,
  revisado_por          text,
  motivo                text,
  archivos_borrados_en  timestamptz,
  constraint m29_vid_estado check (estado in ('pendiente','verificada','rechazada')),
  constraint m29_vid_motivo check (motivo is null or char_length(motivo) <= 300),
  constraint m29_vid_rutas check (char_length(coalesce(frente, '')) <= 300 and char_length(coalesce(dorso, '')) <= 300 and char_length(coalesce(selfie, '')) <= 300),
  constraint m29_vid_resuelta check ((estado = 'pendiente') = (resuelta_en is null))
);
-- Un solo pedido en revisión por persona
create unique index if not exists verificaciones_identidad_pendiente_uniq on portal.verificaciones_identidad (persona_id) where estado = 'pendiente';
create index if not exists verificaciones_identidad_cola_idx on portal.verificaciones_identidad (estado, creado_en);
create index if not exists verificaciones_identidad_usuario_idx on portal.verificaciones_identidad (usuario, creado_en desc);
alter table portal.verificaciones_identidad enable row level security;

drop policy if exists "verificaciones de identidad propias" on portal.verificaciones_identidad;
create policy "verificaciones de identidad propias" on portal.verificaciones_identidad for select
  using (usuario = auth.uid());
drop policy if exists "verificaciones de identidad la curacion" on portal.verificaciones_identidad;
create policy "verificaciones de identidad la curacion" on portal.verificaciones_identidad for select
  using (portal.es_curador());

-- ---------------------------------------------------------------------
-- 3. Cuidado: una cuenta no se marca verificada sola
-- ---------------------------------------------------------------------
-- La tabla personas se puede actualizar desde la página (persona propia, migración 01). Este disparador corre con el
-- rol de quien escribe: si es una sesión (authenticated) que no es curación, el estado de la identidad no cambia, y el
-- nombre y el documento quedan fijos mientras está en revisión o ya verificada. Las funciones de abajo (SECURITY
-- DEFINER, dueño postgres), la clave de servicio y el SQL Editor pasan.
create or replace function portal.m29_proteger_identidad() returns trigger
language plpgsql set search_path to 'portal', 'public' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if portal.es_curador() then return new; end if;
  if tg_op = 'INSERT' then
    new.identidad_estado := 'sin';
    new.identidad_verificada_en := null;
    new.identidad_motivo := null;
    return new;
  end if;
  new.identidad_estado := old.identidad_estado;
  new.identidad_verificada_en := old.identidad_verificada_en;
  new.identidad_motivo := old.identidad_motivo;
  if old.identidad_estado in ('pendiente', 'verificada') then
    new.nombre := old.nombre;
    new.apellido := old.apellido;
    new.dni := old.dni;
  end if;
  return new;
end $$;
drop trigger if exists trg_m29_identidad on portal.personas;
create trigger trg_m29_identidad before insert or update on portal.personas for each row execute function portal.m29_proteger_identidad();

-- ---------------------------------------------------------------------
-- 4. El bucket privado de las fotos
-- ---------------------------------------------------------------------
-- 5 MB por archivo (la página manda unos 300 KB: achica cada foto en el navegador), solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-identidad', 'portal-identidad', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada cuenta sube solo a su carpeta. No puede leer ni reemplazar lo que subió (no hay política de select ni de
-- update para el titular): lo ve solo la curación.
drop policy if exists "m29 identidad sube el titular" on storage.objects;
create policy "m29 identidad sube el titular" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-identidad' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "m29 identidad lee la curacion" on storage.objects;
create policy "m29 identidad lee la curacion" on storage.objects for select to authenticated
  using (bucket_id = 'portal-identidad' and (select portal.es_curador()));
drop policy if exists "m29 identidad borra la curacion" on storage.objects;
create policy "m29 identidad borra la curacion" on storage.objects for delete to authenticated
  using (bucket_id = 'portal-identidad' and (select portal.es_curador()));

-- ---------------------------------------------------------------------
-- 5. Funciones
-- ---------------------------------------------------------------------
-- ¿Esta cuenta tiene la identidad verificada? Interna: la llaman las funciones de la reserva y la firma.
create or replace function portal.identidad_verificada(p_uid uuid) returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select coalesce((select p.identidad_estado = 'verificada' or p.dni_verificado_en is not null
                     from portal.personas p where p.auth_user_id = p_uid limit 1), false)
$$;

-- El estado de la sesión: { estado, verificada, verificada_en, motivo, pendiente_desde, nombre, apellido, dni }
create or replace function portal.mi_identidad() returns jsonb
language sql stable security definer set search_path to 'portal', 'public' as $$
  select case when auth.uid() is null then null else coalesce(
    (select jsonb_build_object(
        'estado', case when p.identidad_estado = 'sin' and p.dni_verificado_en is not null then 'verificada' else p.identidad_estado end,
        'verificada', p.identidad_estado = 'verificada' or p.dni_verificado_en is not null,
        'verificada_en', coalesce(p.identidad_verificada_en, p.dni_verificado_en),
        'motivo', case when p.identidad_estado = 'rechazada' then p.identidad_motivo end,
        'pendiente_desde', (select v.creado_en from portal.verificaciones_identidad v where v.persona_id = p.id and v.estado = 'pendiente' limit 1),
        'nombre', p.nombre, 'apellido', p.apellido, 'dni', p.dni)
       from portal.personas p where p.auth_user_id = auth.uid() limit 1),
    jsonb_build_object('estado', 'sin', 'verificada', false)) end
$$;

-- La persona manda sus tres fotos (ya subidas a su carpeta) con su consentimiento. Crea su fila en personas si no
-- existe (con su mail) y la deja en revisión.
create or replace function portal.solicitar_verificacion(p_frente text, p_dorso text, p_selfie text,
  p_nombre text default null, p_apellido text default null, p_dni text default null, p_consentimiento boolean default false)
returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare
  v_uid uuid := auth.uid(); v_per portal.personas; v_mail text; v_dni text; v_id uuid; r text;
  v_nombre text := nullif(btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g')), '');
  v_apellido text := nullif(btrim(regexp_replace(coalesce(p_apellido, ''), '\s+', ' ', 'g')), '');
begin
  if v_uid is null then raise exception 'Ingresá para seguir.'; end if;
  if not coalesce(p_consentimiento, false) then raise exception 'Para verificar tu identidad necesitamos tu consentimiento.'; end if;
  if p_frente is null or p_dorso is null or p_selfie is null then raise exception 'Faltan fotos: el frente y el dorso del documento y una selfie.'; end if;
  foreach r in array array[p_frente, p_dorso, p_selfie] loop
    if r !~ ('^' || v_uid::text || '/[A-Za-z0-9._-]{1,120}$') then raise exception 'Esa foto no es tuya.'; end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'portal-identidad' and o.name = r) then
      raise exception 'No encontramos una de las fotos. Volvé a subirla.';
    end if;
  end loop;
  if p_frente = p_dorso or p_frente = p_selfie or p_dorso = p_selfie then raise exception 'Subí tres fotos distintas: frente, dorso y selfie.'; end if;
  v_dni := nullif(upper(regexp_replace(coalesce(p_dni, ''), '[^0-9A-Za-z]', '', 'g')), '');
  if v_dni is not null and v_dni !~ '^[0-9A-Z]{6,12}$' then raise exception 'Revisá el número de documento.'; end if;
  if char_length(coalesce(v_nombre, '')) > 80 or char_length(coalesce(v_apellido, '')) > 80 then raise exception 'El nombre es muy largo.'; end if;
  if (select count(*) from portal.verificaciones_identidad where usuario = v_uid and creado_en > now() - interval '1 day') >= 5 then
    raise exception 'Mandaste muchas verificaciones hoy. Probá de nuevo mañana.';
  end if;

  select email into v_mail from auth.users where id = v_uid;
  select * into v_per from portal.personas where auth_user_id = v_uid for update;
  if v_per.id is null then
    insert into portal.personas (auth_user_id, nombre, apellido, email, dni)
    values (v_uid, coalesce(v_nombre, nullif(initcap(split_part(split_part(coalesce(v_mail, ''), '@', 1), '.', 1)), ''), 'Sin nombre'),
            v_apellido, v_mail, v_dni)
    returning * into v_per;
  else
    if v_per.identidad_estado = 'verificada' or v_per.dni_verificado_en is not null then raise exception 'Tu identidad ya está verificada.'; end if;
    if v_per.identidad_estado = 'pendiente' then raise exception 'Ya mandaste tus fotos: las estamos revisando.'; end if;
    update portal.personas set nombre = coalesce(v_nombre, nombre), apellido = coalesce(v_apellido, apellido),
      dni = coalesce(v_dni, dni), email = coalesce(email, v_mail)
     where id = v_per.id;
  end if;

  insert into portal.verificaciones_identidad (persona_id, usuario, frente, dorso, selfie, consentimiento_en)
  values (v_per.id, v_uid, p_frente, p_dorso, p_selfie, now())
  returning id into v_id;
  update portal.personas set identidad_estado = 'pendiente', identidad_motivo = null where id = v_per.id;
  return jsonb_build_object('id', v_id, 'estado', 'pendiente');
end $$;

-- La cola de la curación: lo pendiente, y lo resuelto cuyas fotos todavía no se borraron
create or replace function portal.verificaciones_cola()
returns table (id uuid, estado text, creado_en timestamptz, resuelta_en timestamptz, frente text, dorso text, selfie text,
  nombre text, apellido text, dni text, email text, motivo text, motivo_anterior text, intentos integer)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select v.id, v.estado, v.creado_en, v.resuelta_en, v.frente, v.dorso, v.selfie,
    p.nombre, p.apellido, p.dni, coalesce(p.email, u.email), v.motivo,
    (select x.motivo from portal.verificaciones_identidad x
      where x.persona_id = v.persona_id and x.estado = 'rechazada' and x.id <> v.id order by x.resuelta_en desc limit 1),
    (select count(*)::integer from portal.verificaciones_identidad x where x.persona_id = v.persona_id)
  from portal.verificaciones_identidad v
  join portal.personas p on p.id = v.persona_id
  left join auth.users u on u.id = v.usuario
  where portal.es_curador()
    and (v.estado = 'pendiente' or (v.archivos_borrados_en is null and coalesce(v.frente, v.dorso, v.selfie) is not null))
  order by (v.estado = 'pendiente') desc, v.creado_en
  limit 200
$$;

-- La curación aprueba o rechaza (con motivo). Devuelve las rutas de las fotos para que la página las borre del bucket.
create or replace function portal.resolver_verificacion(p_id uuid, p_ok boolean, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v portal.verificaciones_identidad; v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if auth.uid() is null or not portal.es_curador() then raise exception 'Solo la curación resuelve las verificaciones.'; end if;
  if p_ok is null then raise exception 'Elegí aprobar o rechazar.'; end if;
  select * into v from portal.verificaciones_identidad where id = p_id for update;
  if v.id is null then raise exception 'La verificación no existe.'; end if;
  if v.usuario = auth.uid() then raise exception 'Tu propia verificación la resuelve otra persona del equipo.'; end if;
  if v.estado <> 'pendiente' then raise exception 'Esta verificación ya está resuelta.'; end if;
  if not p_ok and v_motivo is null then raise exception 'Escribí el motivo del rechazo: la persona lo va a leer.'; end if;
  if char_length(coalesce(v_motivo, '')) > 300 then raise exception 'El motivo puede tener hasta 300 letras.'; end if;
  update portal.verificaciones_identidad
     set estado = case when p_ok then 'verificada' else 'rechazada' end, resuelta_en = now(),
         revisado_por = coalesce(nullif(auth.jwt() ->> 'email', ''), auth.uid()::text),
         motivo = case when p_ok then null else v_motivo end
   where id = p_id;
  if p_ok then
    update portal.personas set identidad_estado = 'verificada', identidad_verificada_en = now(), identidad_motivo = null,
      dni_verificado_en = coalesce(dni_verificado_en, now())
     where id = v.persona_id;
  else
    update portal.personas set identidad_estado = 'rechazada', identidad_motivo = v_motivo where id = v.persona_id;
  end if;
  return jsonb_build_object('id', p_id, 'estado', case when p_ok then 'verificada' else 'rechazada' end,
    'archivos', to_jsonb(array_remove(array[v.frente, v.dorso, v.selfie], null)));
end $$;

-- Después de borrar las fotos del bucket, la página lo confirma: si ya no están, las rutas quedan en null y se anota
-- cuándo. Si alguna sigue ahí, devuelve false (la cola la vuelve a mostrar para borrarla).
create or replace function portal.confirmar_borrado_identidad(p_id uuid) returns boolean
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v portal.verificaciones_identidad;
begin
  if auth.uid() is null or not portal.es_curador() then raise exception 'Solo la curación.'; end if;
  select * into v from portal.verificaciones_identidad where id = p_id for update;
  if v.id is null then raise exception 'La verificación no existe.'; end if;
  if v.estado = 'pendiente' then raise exception 'Primero resolvé la verificación.'; end if;
  if exists (select 1 from storage.objects o where o.bucket_id = 'portal-identidad' and o.name in (v.frente, v.dorso, v.selfie)) then return false; end if;
  update portal.verificaciones_identidad set frente = null, dorso = null, selfie = null,
    archivos_borrados_en = coalesce(archivos_borrados_en, now())
   where id = p_id;
  return true;
end $$;

-- ---------------------------------------------------------------------
-- 6. Datos de quien ofrece
-- ---------------------------------------------------------------------
alter table portal.publicadores add column if not exists domicilio_legal text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'm29_pub_domicilio') then
    alter table portal.publicadores add constraint m29_pub_domicilio check (domicilio_legal is null or char_length(domicilio_legal) <= 200);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. La vista pública: las mismas 17 columnas de la migración 01, en el mismo orden, y tres nuevas al final
-- ---------------------------------------------------------------------
create or replace view portal.publicador_publico as
select
  pb.id, pb.slug, pb.tipo, pb.nombre, pb.logo_url, pb.descripcion, pb.zonas, pb.badge, pb.verificado,
  pb.telefono, pb.whatsapp, pb.email,
  pe.id  as titular_id,
  trim(coalesce(pe.nombre, '') || ' ' || coalesce(pe.apellido, '')) as titular_nombre,
  pe.colegio as titular_colegio,
  pe.matricula as titular_matricula,
  (pe.matricula_verificada_en is not null) as titular_matricula_verificada,
  -- De un dueño directo (persona física) no sale la razón social: se muestra su nombre público, su CUIT y su domicilio
  case when pb.tipo is distinct from 'dueno' then nullif(btrim(pb.razon_social), '') end as razon_social,
  nullif(btrim(pb.cuit), '') as cuit,
  nullif(btrim(pb.domicilio_legal), '') as domicilio_legal
from portal.publicadores pb
left join lateral (
  select p.id, p.nombre, p.apellido, p.colegio, p.matricula, p.matricula_verificada_en
  from portal.membresias m join portal.personas p on p.id = m.persona_id
  where m.publicador_id = pb.id and m.rol = 'titular' and m.hasta is null
  order by m.desde limit 1
) pe on true
where pb.verificado;

-- ---------------------------------------------------------------------
-- 8. Permisos
-- ---------------------------------------------------------------------
revoke all on portal.verificaciones_identidad from anon;
revoke insert, update, delete, truncate on portal.verificaciones_identidad from authenticated;
grant select on portal.verificaciones_identidad to authenticated;
grant select on portal.publicador_publico to anon, authenticated;

revoke all on function portal.m29_proteger_identidad() from public, anon, authenticated;
revoke all on function portal.identidad_verificada(uuid) from public, anon, authenticated;
revoke all on function portal.mi_identidad(), portal.solicitar_verificacion(text, text, text, text, text, text, boolean),
  portal.verificaciones_cola(), portal.resolver_verificacion(uuid, boolean, text), portal.confirmar_borrado_identidad(uuid) from public, anon;
grant execute on function portal.mi_identidad(), portal.solicitar_verificacion(text, text, text, text, text, text, boolean),
  portal.verificaciones_cola(), portal.resolver_verificacion(uuid, boolean, text), portal.confirmar_borrado_identidad(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Controles
select 'columnas de personas' as control,
  (select count(*) from information_schema.columns where table_schema = 'portal' and table_name = 'personas'
     and column_name in ('identidad_estado', 'identidad_verificada_en', 'identidad_motivo')) = 3 as ok
union all select 'tabla de verificaciones con RLS', (select relrowsecurity from pg_class where oid = 'portal.verificaciones_identidad'::regclass)
union all select 'bucket privado', exists (select 1 from storage.buckets where id = 'portal-identidad' and not public)
union all select 'políticas del bucket', (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'm29 identidad%') = 3
union all select 'vista con los datos del oferente', (select count(*) from information_schema.columns where table_schema = 'portal' and table_name = 'publicador_publico'
     and column_name in ('razon_social', 'cuit', 'domicilio_legal')) = 3
union all select 'anon no ve las verificaciones', not has_table_privilege('anon', 'portal.verificaciones_identidad', 'select');
