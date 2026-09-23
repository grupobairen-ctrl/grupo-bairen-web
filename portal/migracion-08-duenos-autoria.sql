-- =====================================================================
-- BAIREN · Portal · Migración 08 · Los avisos pasan a nombre de su dueño
--
-- Decisión de Tomás del 22/9/2026: las unidades que hoy publica BAIREN
-- quedan publicadas a nombre de cada propietario. BAIREN deja de ser
-- publicador, que es lo coherente con "BAIREN no opera".
--
-- Qué agrega:
--   1. portal.traspasos: quién movió qué aviso, de qué publicador a cuál,
--      cuándo y por qué. Sin esto un cambio de autoría no se puede
--      auditar ni revertir, y son 41 avisos de terceros.
--   2. portal.traspasar_aviso(): mueve UN aviso y deja el registro, en
--      una sola transacción. Si el destino no existe o es el mismo
--      publicador, no hace nada y avisa.
--   3. portal.revertir_traspaso(): deshace uno, dejando su propio
--      registro. Nada se borra nunca.
--   4. portal.pasar_avisos_a_duenos(): el pase completo en una sola
--      llamada, y arranca en modo ENSAYO: por defecto muestra qué haría
--      sin tocar nada. Crea el publicador de cada dueño si falta y le
--      pasa sus avisos. Saltea las reservadas salvo que se le pida.
--   5. portal.vincular_publicador_por_email(): la primera vez que el
--      dueño entra con su mail, ata su cuenta a la fila que le creamos.
--   6. portal.duenos_de_avisos(): la lista de trabajo. Cruza los avisos
--      con public.propiedades y public.propietarios (el puente ya existe:
--      avisos.propiedad_id) y devuelve, por cada aviso, qué propietario
--      le corresponde, qué datos de contacto tiene cargados y si su
--      publicador ya está creado. Es lo que alimenta la pantalla.
--
-- SEGURIDAD: las tres funciones son security definer porque tienen que
-- leer public.propietarios, que está bajo RLS por tenant. Por eso se
-- revoca execute a anon y authenticated: SOLO el servidor (service_role)
-- las puede llamar. Un dato de propietario no puede salir por la clave
-- pública del portal.
--
-- Aditiva y repetible. SUBIR el archivo en el SQL Editor, NO pegarlo.
-- Rollback en migracion-08-duenos-autoria-rollback.sql.
-- Orden: después de migracion-07-respaldos.sql.
-- Generada el 2026-09-22. NO CORRIDA todavía.
-- =====================================================================

-- ── 1 · El registro de traspasos ────────────────────────────────────
create table if not exists portal.traspasos (
  id                   uuid primary key default gen_random_uuid(),
  aviso_id             uuid not null references portal.avisos(id) on delete cascade,
  publicador_anterior  uuid not null references portal.publicadores(id),
  publicador_nuevo     uuid not null references portal.publicadores(id),
  motivo               text,
  hecho_por            text,                 -- mail del curador que lo hizo
  revierte_a           uuid references portal.traspasos(id),  -- si es una vuelta atrás
  created_at           timestamptz not null default now()
);

create index if not exists traspasos_aviso_idx on portal.traspasos(aviso_id, created_at desc);

alter table portal.traspasos enable row level security;
-- Sin políticas a propósito: solo el servidor con la service key escribe y lee.

comment on table portal.traspasos is
  'Cada cambio de autoría de un aviso. Es la pista de auditoría del pase de BAIREN a los dueños directos (22/9/2026). Nunca se borra una fila.';

-- ── 2 · Mover un aviso ──────────────────────────────────────────────
create or replace function portal.traspasar_aviso(
  p_aviso   uuid,
  p_destino uuid,
  p_por     text default null,
  p_motivo  text default 'Pase a dueño directo (decisión 22/9/2026)'
) returns portal.traspasos
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  v_actual uuid;
  v_fila   portal.traspasos;
begin
  select publicador_id into v_actual from portal.avisos where id = p_aviso;
  if v_actual is null then
    raise exception 'El aviso % no existe', p_aviso;
  end if;

  if not exists (select 1 from portal.publicadores where id = p_destino) then
    raise exception 'El publicador destino % no existe', p_destino;
  end if;

  if v_actual = p_destino then
    raise exception 'El aviso % ya está publicado por ese publicador', p_aviso;
  end if;

  update portal.avisos
     set publicador_id = p_destino,
         updated_at    = now()
   where id = p_aviso;

  insert into portal.traspasos (aviso_id, publicador_anterior, publicador_nuevo, motivo, hecho_por)
  values (p_aviso, v_actual, p_destino, p_motivo, p_por)
  returning * into v_fila;

  return v_fila;
end;
$$;

-- ── 3 · Deshacer uno ────────────────────────────────────────────────
create or replace function portal.revertir_traspaso(
  p_traspaso uuid,
  p_por      text default null
) returns portal.traspasos
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  v_t    portal.traspasos;
  v_fila portal.traspasos;
begin
  select * into v_t from portal.traspasos where id = p_traspaso;
  if v_t.id is null then
    raise exception 'El traspaso % no existe', p_traspaso;
  end if;

  update portal.avisos
     set publicador_id = v_t.publicador_anterior,
         updated_at    = now()
   where id = v_t.aviso_id;

  insert into portal.traspasos (aviso_id, publicador_anterior, publicador_nuevo, motivo, hecho_por, revierte_a)
  values (v_t.aviso_id, v_t.publicador_nuevo, v_t.publicador_anterior,
          'Vuelta atrás del traspaso ' || p_traspaso, p_por, p_traspaso)
  returning * into v_fila;

  return v_fila;
end;
$$;

-- ── 4 · La lista de trabajo ─────────────────────────────────────────
-- Por cada aviso: de quién es la propiedad según el OS, qué datos tiene
-- ese propietario y si su publicador ya existe. El cruce por nombre
-- normalizado es lo único que ata al propietario del OS con un
-- publicador del portal mientras no exista una columna que los una.
create or replace function portal.duenos_de_avisos()
returns table (
  aviso_id            uuid,
  codigo              text,
  titulo              text,
  estado              text,
  reservado           boolean,
  publicador_actual   text,
  propiedad_id        uuid,
  propietario_id      uuid,
  propietario_nombre  text,
  propietario_email   text,
  propietario_tel     text,
  publicador_dueno_id uuid,
  listo               boolean
)
language sql
security definer
set search_path = portal, public
as $$
  select
    a.id,
    a.codigo,
    a.titulo,
    a.estado,
    (a.estado <> 'disponible'),
    pa.nombre,
    a.propiedad_id,
    pr.id,
    pr.nombre,
    nullif(trim(pr.email), ''),
    nullif(trim(pr.telefono), ''),
    pd.id,
    (pr.nombre is not null and a.estado = 'disponible')
  from portal.avisos a
  join portal.publicadores pa on pa.id = a.publicador_id
  left join public.propiedades  p  on p.id  = a.propiedad_id
  left join public.propietarios pr on pr.id = p.propietario_id
  left join portal.publicadores pd
         on pd.tipo = 'dueno'
        and lower(trim(pd.nombre)) = lower(trim(pr.nombre))
  order by pr.nombre nulls last, a.codigo;
$$;

comment on function portal.duenos_de_avisos() is
  'Lista de trabajo del pase a dueños directos: qué aviso le corresponde a qué propietario del OS, si está reservado y si su publicador ya existe. listo = tiene propietario identificado y la unidad está disponible.';


-- ── 5 · El alta del dueño y el pase, todo junto ─────────────────────
-- Crea el publicador del propietario (si no existe) y le pasa sus
-- avisos. Idempotente: correrla dos veces no duplica nada ni vuelve a
-- traspasar lo que ya está en su nombre.
--
--   p_verificados: si los propietarios ya tienen la titularidad
--   controlada, pasar true y además queda la constancia en
--   portal.verificaciones. Si va en false, el publicador queda sin
--   verificar y la ficha lo dice. Por defecto false: el sello no se
--   enciende solo.
--
--   p_incluir_reservados: por defecto false. Las unidades reservadas,
--   alquiladas o vendidas se quedan como están.

create or replace function portal.pasar_avisos_a_duenos(
  p_por                 text    default null,
  p_verificados         boolean default false,
  p_incluir_reservados  boolean default false,
  p_solo_simular        boolean default true
) returns table (
  codigo        text,
  propietario   text,
  accion        text
)
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  r        record;
  v_pub    uuid;
  v_slug   text;
  v_base   text;
  v_n      integer;
begin
  for r in
    select * from portal.duenos_de_avisos()
     where propietario_id is not null
       and (p_incluir_reservados or not reservado)
       and publicador_actual is distinct from null
  loop
    -- El publicador del dueño: se reusa si ya existe, se crea si no.
    v_pub := r.publicador_dueno_id;

    if v_pub is null then
      -- slug legible y único a partir del nombre
      v_base := lower(trim(r.propietario_nombre));
      v_base := translate(v_base, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
      v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
      v_base := trim(both '-' from v_base);
      if v_base = '' then v_base := 'dueno'; end if;
      v_slug := v_base;
      v_n := 1;
      while exists (select 1 from portal.publicadores where slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
      end loop;

      if p_solo_simular then
        codigo := r.codigo; propietario := r.propietario_nombre;
        accion := 'crearía publicador ' || v_slug || ' y traspasaría';
        return next; continue;
      end if;

      insert into portal.publicadores (slug, tipo, nombre, email, telefono, whatsapp,
                                       verificado, verificado_en, badge)
      values (v_slug, 'dueno', r.propietario_nombre,
              r.propietario_email, r.propietario_tel, r.propietario_tel,
              p_verificados, case when p_verificados then now() else null end,
              'Dueño verificado')
      returning id into v_pub;

      if p_verificados then
        insert into portal.verificaciones (publicador_id, tipo, resultado, revisado_por, nota)
        values (v_pub, 'titularidad', 'aprobada', p_por,
                'Titularidad controlada por el equipo de Bairen antes del pase del 22/9/2026. Cargar el documento de respaldo en la ficha del publicador.');
      end if;
    end if;

    -- El pase. Si ya está en su nombre, traspasar_aviso avisa y se sigue.
    if p_solo_simular then
      codigo := r.codigo; propietario := r.propietario_nombre;
      accion := 'traspasaría a publicador existente';
      return next; continue;
    end if;

    begin
      perform portal.traspasar_aviso(r.aviso_id, v_pub, p_por);
      codigo := r.codigo; propietario := r.propietario_nombre; accion := 'traspasado';
    exception when others then
      codigo := r.codigo; propietario := r.propietario_nombre; accion := 'sin cambios: ' || SQLERRM;
    end;
    return next;
  end loop;
end;
$$;

comment on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) is
  'Pase de los avisos de BAIREN a sus dueños directos. Arranca en modo simulación (p_solo_simular = true): muestra qué haría sin tocar nada. Para ejecutarlo de verdad hay que pasar false explícitamente.';


-- ── 6 · Que el dueño entre y encuentre lo suyo ──────────────────────
-- Las filas de publicador las creamos nosotros, así que nacen sin
-- auth_user_id: nadie las reclamó todavía. La primera vez que el
-- propietario entra al portal con su mail (código de ocho dígitos,
-- sin contraseña), esta función ata su cuenta a su fila.
--
-- Es segura para que la llame el propio usuario porque:
--   · lee el mail del token de sesión, no de lo que manda el navegador;
--   · solo ata filas SIN dueño (auth_user_id is null): una fila ya
--     reclamada no se le puede robar a nadie;
--   · no crea nada ni cambia ningún otro campo.

create or replace function portal.vincular_publicador_por_email()
returns portal.publicadores
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_fila  portal.publicadores;
begin
  if v_uid is null or v_email = '' then
    return null;
  end if;

  -- Si ya tiene el suyo atado, se devuelve ese y listo.
  select * into v_fila from portal.publicadores where auth_user_id = v_uid limit 1;
  if v_fila.id is not null then
    return v_fila;
  end if;

  update portal.publicadores
     set auth_user_id = v_uid,
         updated_at   = now()
   where auth_user_id is null
     and lower(trim(email)) = v_email
   returning * into v_fila;

  return v_fila;
end;
$$;

comment on function portal.vincular_publicador_por_email() is
  'Ata la cuenta del que entra con su fila de publicador, cuando la fila la creó el equipo por adelantado. Solo ata filas sin dueño y usa el mail verificado del token.';


-- ── 7 · Los que quedaron sin puente ─────────────────────────────────
-- Diagnóstico del 22/9/2026: de 42 avisos de BAIREN, solo 24 llegan
-- hasta su propietario. El resto tiene el propiedad_id apuntando a la
-- base vieja de bairengroup.com, o directamente vacío.
--
-- Esto los vuelve a atar POR DIRECCIÓN, que es el mismo criterio que usó
-- sql/008-aviso-propiedad.sql del repo del OS. Reusa su función
-- portal.clave_edificio() (última palabra de la calle + número + unidad),
-- así los dos scripts no pueden discrepar.
--
-- Solo ata lo que está suelto: nunca pisa un propiedad_id que ya resuelve.
-- Arranca en modo ensayo, igual que el pase.

create or replace function portal.atar_avisos_por_direccion(
  p_solo_simular boolean default true
) returns table (
  codigo       text,
  direccion    text,
  propiedad    uuid,
  propietario  text,
  accion       text
)
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  r      record;
  v_prop uuid;
  v_due  text;
  v_n    integer;
begin
  -- Si la 008 no corrió, la función de dirección no existe y no hay nada que hacer.
  if to_regprocedure('portal.clave_edificio(text)') is null then
    raise exception 'Falta portal.clave_edificio(): correr antes sql/008-aviso-propiedad.sql del repo del OS';
  end if;

  for r in
    select a.id, a.codigo, a.direccion, a.unidad
      from portal.avisos a
      join portal.publicadores pub on pub.id = a.publicador_id and pub.slug = 'bairen'
      left join public.propiedades p on p.id = a.propiedad_id
     where p.id is null                       -- el puente no resuelve
       and coalesce(trim(a.direccion), '') <> ''
  loop
    select p.id, pr.nombre into v_prop, v_due
      from public.propiedades p
      left join public.propietarios pr on pr.id = p.propietario_id
     where portal.clave_edificio(p.direccion) = portal.clave_edificio(r.direccion)
       and coalesce(nullif(trim(lower(p.unidad)), ''), '-') = coalesce(nullif(trim(lower(r.unidad)), ''), '-')
     limit 2;

    get diagnostics v_n = row_count;

    codigo := r.codigo; direccion := r.direccion; propiedad := v_prop; propietario := v_due;

    if v_prop is null then
      accion := 'sin coincidencia por dirección: queda en BAIREN';
    elsif v_n > 1 then
      accion := 'más de una propiedad con esa dirección: revisar a mano';
      propiedad := null;
    elsif p_solo_simular then
      accion := 'ataría' || case when v_due is null then ' (la propiedad no tiene propietario cargado)' else '' end;
    else
      update portal.avisos set propiedad_id = v_prop, updated_at = now() where id = r.id;
      accion := 'atado' || case when v_due is null then ' (falta cargarle el propietario en el OS)' else '' end;
    end if;
    return next;
  end loop;
end;
$$;

comment on function portal.atar_avisos_por_direccion(boolean) is
  'Vuelve a atar por dirección los avisos de BAIREN cuyo propiedad_id no resuelve (18 de 42 al 22/9/2026). Mismo criterio que sql/008 del OS. Arranca en modo ensayo. Después de correrla, volver a correr pasar_avisos_a_duenos.';

-- ── 8 · Candado: esto no sale por la clave pública ──────────────────
revoke all on function portal.traspasar_aviso(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function portal.revertir_traspaso(uuid, text)           from public, anon, authenticated;
revoke all on function portal.duenos_de_avisos()                      from public, anon, authenticated;
revoke all on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) from public, anon, authenticated;

grant execute on function portal.traspasar_aviso(uuid, uuid, text, text) to service_role;
grant execute on function portal.revertir_traspaso(uuid, text)           to service_role;
grant execute on function portal.duenos_de_avisos()                      to service_role;
grant execute on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) to service_role;
revoke all  on function portal.atar_avisos_por_direccion(boolean) from public, anon, authenticated;
grant execute on function portal.atar_avisos_por_direccion(boolean) to service_role;

-- Esta sí la llama el propio usuario al entrar (ver el comentario de arriba).
revoke all on function portal.vincular_publicador_por_email() from public, anon;
grant execute on function portal.vincular_publicador_por_email() to authenticated;

-- ── VERIFICACIÓN (correr después, tiene que dar 6 filas) ────────────
-- select routine_name from information_schema.routines
--  where routine_schema = 'portal'
--    and routine_name in ('traspasar_aviso','revertir_traspaso','duenos_de_avisos',
--                         'pasar_avisos_a_duenos','vincular_publicador_por_email',
--                         'atar_avisos_por_direccion');
--
-- La foto del trabajo pendiente:
-- select count(*) filter (where listo)      as se_pueden_pasar,
--        count(*) filter (where reservado)  as reservadas,
--        count(*) filter (where propietario_id is null) as sin_propietario,
--        count(*)                           as total
--   from portal.duenos_de_avisos();
--
-- Y el ensayo, que NO toca nada:
-- select * from portal.pasar_avisos_a_duenos('tomas@bairengroup.com');
