-- =====================================================================
-- BAIREN · Portal · Migración 22 · La red: seguir, propuestas, obra y
-- la demanda sin nombres
--
-- Es la base de datos de la red BAIREN (Fase 1 y 2 del plan BAIREN 360,
-- 3/10/2026). Hasta acá la búsqueda del miembro vive como alerta
-- 'busqueda' con clave 'mi-busqueda' en portal.alertas (filtros con op,
-- zonas, pmax, amb y la búsqueda entera en filtros.red), y lo que sigue,
-- solo en el navegador. Este archivo agrega:
--
--   A. portal.seguimientos: lo que cada cuenta sigue (barrio, edificio,
--      obra, publicador). Cada uno ve y toca solo lo suyo.
--
--   B. portal.propuestas: la propuesta que le llega a un miembro.
--      · Nadie la inserta directo: se crea con portal.enviar_propuesta.
--      · El destinatario la ve y solo puede cambiar estado y motivo
--        (interesa / no_gracias; motivo precio, zona o estado).
--      · Quien la manda NO lee la tabla: ve sus números y, solo de los que
--        respondieron "Me interesa", el contacto, con
--        portal.mis_propuestas_enviadas. Así nunca sabe quién busca hasta
--        que esa persona decide.
--
--   C. portal.obra_eventos: los hitos de obra de un emprendimiento.
--      Lectura pública; escribe quien publica el emprendimiento.
--
--   D. portal.demanda_agregada(p_zona): la demanda que ve el que vende.
--      Agrupa las búsquedas por zona, operación, ambientes mínimos y banda
--      de presupuesto, y devuelve SOLO los grupos con 3 búsquedas o más de
--      personas distintas, para que nadie sea identificable. Solo la puede
--      leer quien publica (membresía vigente o cuenta atada) o un curador.
--
--   E. portal.enviar_propuesta(...): manda una unidad propia a un grupo de
--      demanda. La base elige a quién le llega (búsqueda que coincide con la
--      unidad y con el grupo, sin propuesta previa de esa unidad), con un
--      cupo de 30 entregas por semana por publicador. Devuelve cuántas
--      salieron. BAIREN no cobra nada por esto: el cupo es contra el spam.
--
--   F. portal.mis_propuestas_enviadas(p_publicador): los números por unidad
--      y los contactos de los que dijeron que les interesa.
--
-- Lo que NO hace, a propósito:
--   · No toca alertas, avisos ni publicadores: solo lee.
--   · No manda mails ni avisos: eso va en el motor de alertas, después.
--   · No cobra ni registra nada de dinero.
--
-- CÓMO SE CORRE
--   1. ENSAYO: desde "PASO 0" hasta el final del "PASO 1" (solo SELECT).
--   2. Si el ensayo da lo esperado, el archivo entero (una transacción).
--   3. El último resultado es el tablero de verificación.
--   4. Vuelta atrás: migracion-22-red-miembros-rollback.sql.
-- Orden: después de migracion-21-realty-mediano-y-limpieza.sql.
-- Generada el 4/10/2026. Ensayada en PGlite. NO CORRIDA todavía.
-- =====================================================================


-- ── PASO 0 · ENSAYO (solo lectura) ──────────────────────────────────

-- 0.A · Que existan las piezas de las que depende.
select 'portal.avisos' as pieza, to_regclass('portal.avisos') is not null as existe
union all select 'portal.alertas', to_regclass('portal.alertas') is not null
union all select 'portal.publicadores', to_regclass('portal.publicadores') is not null
union all select 'portal.membresias', to_regclass('portal.membresias') is not null
union all select 'portal.personas', to_regclass('portal.personas') is not null
union all select 'portal.tiene_permiso(text,text,uuid)', to_regprocedure('portal.tiene_permiso(text,text,uuid)') is not null
union all select 'portal.es_curador()', to_regprocedure('portal.es_curador()') is not null
union all select 'ya existe portal.propuestas (se reusa)', to_regclass('portal.propuestas') is not null;

-- 0.B · Cuántas búsquedas de la red hay hoy, por operación.
select coalesce(filtros->>'op', '(sin op)') as operacion, count(*) as busquedas, count(distinct usuario_id) as personas
  from portal.alertas
 where tipo = 'busqueda' and filtros->>'key' = 'mi-busqueda'
 group by 1 order by 1;

-- ── FIN DEL ENSAYO ──────────────────────────────────────────────────


begin;

-- ── A · Seguir ──────────────────────────────────────────────────────
create table if not exists portal.seguimientos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null default auth.uid(),
  tipo        text not null check (tipo in ('barrio', 'edificio', 'obra', 'publicador')),
  ref         text not null check (length(ref) between 1 and 200),
  creado      timestamptz not null default now(),
  unique (usuario_id, tipo, ref)
);
alter table portal.seguimientos enable row level security;
drop policy if exists "seguimientos propios" on portal.seguimientos;
create policy "seguimientos propios" on portal.seguimientos
  for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
revoke all on portal.seguimientos from anon, authenticated;
grant select, insert, delete on portal.seguimientos to authenticated;
comment on table portal.seguimientos is 'Lo que cada cuenta sigue en la red (barrio, edificio, obra, publicador). Migración 22, 4/10/2026.';

-- ── B · Propuestas ──────────────────────────────────────────────────
create table if not exists portal.propuestas (
  id              uuid primary key default gen_random_uuid(),
  aviso_id        uuid not null references portal.avisos(id) on delete cascade,
  publicador_id   uuid not null references portal.publicadores(id) on delete cascade,
  usuario_destino uuid not null,
  nota            text check (nota is null or length(nota) <= 600),
  estado          text not null default 'enviada' check (estado in ('enviada', 'interesa', 'no_gracias')),
  motivo          text check (motivo is null or motivo in ('precio', 'zona', 'estado')),
  creada          timestamptz not null default now(),
  respondida      timestamptz,
  unique (aviso_id, usuario_destino)
);
create index if not exists propuestas_publicador_idx on portal.propuestas (publicador_id, creada desc);
create index if not exists propuestas_destino_idx on portal.propuestas (usuario_destino, creada desc);
alter table portal.propuestas enable row level security;
drop policy if exists "propuestas recibidas, ver" on portal.propuestas;
create policy "propuestas recibidas, ver" on portal.propuestas
  for select to authenticated using (usuario_destino = auth.uid());
drop policy if exists "propuestas recibidas, responder" on portal.propuestas;
create policy "propuestas recibidas, responder" on portal.propuestas
  for update to authenticated using (usuario_destino = auth.uid()) with check (usuario_destino = auth.uid());
revoke all on portal.propuestas from anon, authenticated;
grant select on portal.propuestas to authenticated;
grant update (estado, motivo) on portal.propuestas to authenticated;   -- el destinatario solo responde
comment on table portal.propuestas is 'Propuestas de unidades a miembros cuya búsqueda coincide. Se crean con portal.enviar_propuesta; quien las manda las ve con portal.mis_propuestas_enviadas. Migración 22, 4/10/2026.';

-- Al responder: fecha de respuesta, y no se vuelve a "enviada".
create or replace function portal.propuesta_respondida()
returns trigger language plpgsql set search_path = portal, public as $$
begin
  if new.estado = 'enviada' and old.estado <> 'enviada' then
    raise exception 'Una propuesta respondida no vuelve a enviada.';
  end if;
  if new.estado = 'interesa' then new.motivo := null; end if;
  if new.estado is distinct from old.estado then new.respondida := now(); end if;
  return new;
end $$;
drop trigger if exists trg_propuesta_respondida on portal.propuestas;
create trigger trg_propuesta_respondida before update on portal.propuestas
  for each row execute function portal.propuesta_respondida();

-- ── C · Obra ────────────────────────────────────────────────────────
create table if not exists portal.obra_eventos (
  id             uuid primary key default gen_random_uuid(),
  publicador_id  uuid not null references portal.publicadores(id) on delete cascade,
  emprendimiento text not null check (length(emprendimiento) between 1 and 200),
  titulo         text not null check (length(titulo) between 1 and 120),
  fecha          date,
  porcentaje     int check (porcentaje is null or porcentaje between 0 and 100),
  foto_url       text,
  nota           text check (nota is null or length(nota) <= 800),
  creado         timestamptz not null default now()
);
create index if not exists obra_eventos_emp_idx on portal.obra_eventos (emprendimiento, fecha);
alter table portal.obra_eventos enable row level security;
drop policy if exists "obra, lectura pública" on portal.obra_eventos;
create policy "obra, lectura pública" on portal.obra_eventos for select to anon, authenticated using (true);
drop policy if exists "obra, escribe quien publica" on portal.obra_eventos;
create policy "obra, escribe quien publica" on portal.obra_eventos
  for all to authenticated
  using (portal.tiene_permiso('avisos', 'editar', publicador_id)
         or exists (select 1 from portal.publicadores p where p.id = publicador_id and p.auth_user_id = auth.uid()))
  with check (portal.tiene_permiso('avisos', 'editar', publicador_id)
         or exists (select 1 from portal.publicadores p where p.id = publicador_id and p.auth_user_id = auth.uid()));
revoke all on portal.obra_eventos from anon, authenticated;
grant select on portal.obra_eventos to anon, authenticated;
grant insert, update, delete on portal.obra_eventos to authenticated;
comment on table portal.obra_eventos is 'Hitos de obra de un emprendimiento, en orden de fecha. Lectura pública. Migración 22, 4/10/2026.';

-- ── Piezas comunes de D, E y F ──────────────────────────────────────
-- ¿La cuenta actual puede actuar por este publicador? (membresía con avisos:editar, titular o cuenta atada)
create or replace function portal.puede_publicar_por(p_publicador uuid)
returns boolean language sql stable security definer set search_path = portal, public as $$
  select p_publicador is not null and (
    portal.tiene_permiso('avisos', 'editar', p_publicador)
    or exists (select 1 from portal.publicadores p where p.id = p_publicador and p.auth_user_id = auth.uid())
  )
$$;
-- ¿La cuenta actual publica algo, en alguna cuenta? (para ver la demanda)
create or replace function portal.soy_publicador()
returns boolean language sql stable security definer set search_path = portal, public as $$
  select auth.uid() is not null and (
    exists (select 1 from portal.membresias m join portal.personas pe on pe.id = m.persona_id
             where pe.auth_user_id = auth.uid() and m.hasta is null)
    or exists (select 1 from portal.publicadores p where p.auth_user_id = auth.uid())
    or portal.es_curador()
  )
$$;
-- Banda de presupuesto: los límites de cada tramo, por operación (en USD; alquiler por mes).
create or replace function portal.banda_presupuesto(p_op text, p_pmax numeric)
returns numeric[] language sql immutable as $$
  select case
    when p_pmax is null then array[null, null]::numeric[]
    when p_op = 'venta' then case
      when p_pmax < 300000 then array[0, 300000]
      when p_pmax < 600000 then array[300000, 600000]
      when p_pmax < 1000000 then array[600000, 1000000]
      when p_pmax < 2000000 then array[1000000, 2000000]
      else array[2000000, null] end::numeric[]
    else case
      when p_pmax < 1000 then array[0, 1000]
      when p_pmax < 2000 then array[1000, 2000]
      when p_pmax < 4000 then array[2000, 4000]
      else array[4000, null] end::numeric[]
  end
$$;
-- Las búsquedas de la red, aplanadas: una fila por persona y zona.
create or replace view portal.busquedas_red as
  select a.usuario_id,
         coalesce(a.filtros->>'op', 'venta') as operacion,
         z.zona,
         nullif(a.filtros->>'amb', '')::int as amb_min,
         nullif(a.filtros->>'pmax', '')::numeric as pmax,
         coalesce(array(select jsonb_array_elements_text(coalesce(a.filtros->'red'->'imprescindibles', '[]'::jsonb))), '{}') as imprescindibles
    from portal.alertas a
    cross join lateral (
      select jsonb_array_elements_text(case when jsonb_typeof(a.filtros->'zonas') = 'array' and jsonb_array_length(a.filtros->'zonas') > 0
                                            then a.filtros->'zonas' else '[null]'::jsonb end) as zona
    ) z
   where a.tipo = 'busqueda' and a.filtros->>'key' = 'mi-busqueda';
revoke all on portal.busquedas_red from anon, authenticated;   -- solo la leen las funciones de abajo
comment on view portal.busquedas_red is 'Búsquedas de la red aplanadas por zona. Sin acceso directo: la usan demanda_agregada y enviar_propuesta. Migración 22.';

-- ── D · La demanda sin nombres ──────────────────────────────────────
create or replace function portal.demanda_agregada(p_zona text default null)
returns table (zona text, operacion text, amb_min int, presupuesto_desde numeric, presupuesto_hasta numeric, busquedas int, imprescindibles text[])
language sql stable security definer set search_path = portal, public as $$
  with b as (
    select r.*, portal.banda_presupuesto(r.operacion, r.pmax) as banda
      from portal.busquedas_red r
     where portal.soy_publicador()
       and (p_zona is null or r.zona = p_zona)
  ),
  g as (
    select b.zona, b.operacion, coalesce(b.amb_min, 0) as amb_min, b.banda[1] as desde, b.banda[2] as hasta,
           count(distinct b.usuario_id)::int as n
      from b group by 1, 2, 3, 4, 5
  ),
  imp as (
    select b.zona, b.operacion, coalesce(b.amb_min, 0) as amb_min, b.banda[1] as desde, b.banda[2] as hasta, i.imp, count(distinct b.usuario_id) as veces
      from b cross join lateral unnest(b.imprescindibles) as i(imp)
     group by 1, 2, 3, 4, 5, 6
  )
  select g.zona, g.operacion, nullif(g.amb_min, 0), g.desde, g.hasta, g.n,
         coalesce(array(select imp.imp from imp
                         where imp.zona is not distinct from g.zona and imp.operacion = g.operacion and imp.amb_min = g.amb_min
                           and imp.desde is not distinct from g.desde and imp.hasta is not distinct from g.hasta
                           and imp.veces * 2 >= g.n
                         order by imp.veces desc, imp.imp limit 3), '{}')
    from g
   where g.n >= 3                      -- nunca un grupo chico: nadie es identificable
   order by g.n desc, g.zona nulls last
$$;
revoke execute on function portal.demanda_agregada(text) from public, anon;
grant execute on function portal.demanda_agregada(text) to authenticated;

-- ── E · Mandar una propuesta a un grupo ─────────────────────────────
create or replace function portal.enviar_propuesta(
  p_aviso uuid, p_zona text, p_operacion text, p_amb_min int,
  p_desde numeric, p_hasta numeric, p_nota text default null)
returns int language plpgsql security definer set search_path = portal, public as $$
declare
  v_aviso   portal.avisos%rowtype;
  v_cupo    int := 30;           -- entregas por semana por publicador
  v_usadas  int;
  v_n       int;
  v_op      text;
begin
  select * into v_aviso from portal.avisos where id = p_aviso;
  if not found then raise exception 'La unidad no existe.'; end if;
  if not portal.puede_publicar_por(v_aviso.publicador_id) then
    raise exception 'Solo quien publica la unidad puede mandar propuestas.' using hint = 'sin_permiso';
  end if;
  if v_aviso.estado_curacion is distinct from 'publicado' then
    raise exception 'La unidad tiene que estar publicada para mandar propuestas.';
  end if;
  v_op := case when v_aviso.operacion = 'venta' then 'venta' else 'alquiler' end;
  if p_operacion is distinct from v_op then raise exception 'La unidad no es de esa operación.'; end if;

  select count(*) into v_usadas from portal.propuestas
   where publicador_id = v_aviso.publicador_id and creada > now() - interval '7 days';
  if v_usadas >= v_cupo then
    raise exception 'Llegaste al cupo de % propuestas por semana.', v_cupo using hint = 'cupo_propuestas';
  end if;

  with destino as (
    select distinct r.usuario_id
      from portal.busquedas_red r
     where r.operacion = v_op
       and r.zona is not distinct from p_zona
       and coalesce(r.amb_min, 0) = coalesce(p_amb_min, 0)
       and (portal.banda_presupuesto(r.operacion, r.pmax))[1] is not distinct from p_desde
       and (portal.banda_presupuesto(r.operacion, r.pmax))[2] is not distinct from p_hasta
       -- la unidad tiene que servirle de verdad: presupuesto con 10% de margen y ambientes
       and (r.pmax is null or v_aviso.precio is null or v_aviso.precio <= r.pmax * 1.1)
       and (r.amb_min is null or coalesce(v_aviso.ambientes, 0) >= r.amb_min)
       and r.usuario_id is distinct from auth.uid()
       and not exists (select 1 from portal.propuestas p where p.aviso_id = v_aviso.id and p.usuario_destino = r.usuario_id)
     limit greatest(v_cupo - v_usadas, 0)
  )
  insert into portal.propuestas (aviso_id, publicador_id, usuario_destino, nota)
  select v_aviso.id, v_aviso.publicador_id, d.usuario_id, nullif(btrim(p_nota), '')
    from destino d;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke execute on function portal.enviar_propuesta(uuid, text, text, int, numeric, numeric, text) from public, anon;
grant execute on function portal.enviar_propuesta(uuid, text, text, int, numeric, numeric, text) to authenticated;

-- ── F · Lo que ve quien manda ───────────────────────────────────────
create or replace function portal.mis_propuestas_enviadas(p_publicador uuid)
returns table (aviso_id uuid, enviadas int, interesa int, no_gracias int, por_precio int, por_zona int, por_estado int, contactos jsonb)
language sql stable security definer set search_path = portal, public as $$
  select p.aviso_id,
         count(*)::int,
         count(*) filter (where p.estado = 'interesa')::int,
         count(*) filter (where p.estado = 'no_gracias')::int,
         count(*) filter (where p.motivo = 'precio')::int,
         count(*) filter (where p.motivo = 'zona')::int,
         count(*) filter (where p.motivo = 'estado')::int,
         coalesce(jsonb_agg(jsonb_build_object('email', u.email, 'respondida', p.respondida) order by p.respondida desc)
                  filter (where p.estado = 'interesa'), '[]'::jsonb)
    from portal.propuestas p
    left join auth.users u on u.id = p.usuario_destino and p.estado = 'interesa'
   where p.publicador_id = p_publicador and portal.puede_publicar_por(p_publicador)
   group by p.aviso_id
$$;
revoke execute on function portal.mis_propuestas_enviadas(uuid) from public, anon;
grant execute on function portal.mis_propuestas_enviadas(uuid) to authenticated;

revoke execute on function portal.puede_publicar_por(uuid) from public, anon;
grant execute on function portal.puede_publicar_por(uuid) to authenticated;
revoke execute on function portal.soy_publicador() from public, anon;
grant execute on function portal.soy_publicador() to authenticated;

-- Controles: si algo no quedó, se deshace todo.
do $$
begin
  if to_regclass('portal.seguimientos') is null or to_regclass('portal.propuestas') is null or to_regclass('portal.obra_eventos') is null then
    raise exception 'Control fallido: faltan tablas de la migración 22.';
  end if;
  if to_regprocedure('portal.demanda_agregada(text)') is null or to_regprocedure('portal.enviar_propuesta(uuid,text,text,integer,numeric,numeric,text)') is null then
    raise exception 'Control fallido: faltan funciones de la migración 22.';
  end if;
  if has_table_privilege('anon', 'portal.propuestas', 'SELECT') or has_table_privilege('authenticated', 'portal.propuestas', 'INSERT') then
    raise exception 'Control fallido: las propuestas quedaron abiertas de más.';
  end if;
end $$;

commit;


-- ── VERIFICACIÓN (solo lectura) ─────────────────────────────────────
select control, valor, esperado, valor = esperado as ok from (
  select 1 as orden, 'tablas de la red' as control,
         ((to_regclass('portal.seguimientos') is not null)::int + (to_regclass('portal.propuestas') is not null)::int + (to_regclass('portal.obra_eventos') is not null)::int)::text as valor, '3' as esperado
  union all select 2, 'RLS prendido en las tres',
         (select count(*) from pg_class where oid in ('portal.seguimientos'::regclass, 'portal.propuestas'::regclass, 'portal.obra_eventos'::regclass) and relrowsecurity)::text, '3'
  union all select 3, 'anon no lee propuestas', (not has_table_privilege('anon', 'portal.propuestas', 'SELECT'))::text, 'true'
  union all select 4, 'authenticated no inserta propuestas directo', (not has_table_privilege('authenticated', 'portal.propuestas', 'INSERT'))::text, 'true'
  union all select 5, 'anon no ve la demanda', (not has_function_privilege('anon', 'portal.demanda_agregada(text)', 'EXECUTE'))::text, 'true'
  union all select 6, 'anon no lee las búsquedas aplanadas', (not has_table_privilege('anon', 'portal.busquedas_red', 'SELECT'))::text, 'true'
  union all select 7, 'obra con lectura pública', has_table_privilege('anon', 'portal.obra_eventos', 'SELECT')::text, 'true'
) v order by orden;
