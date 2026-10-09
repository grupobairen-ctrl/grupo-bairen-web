-- =====================================================================
-- BAIREN · Portal · Migración 34 · Desarrollos: lista de espera y Membresía Inversor
--
-- 9/10/2026. El riel de desarrollos del plan "Rieles · octubre 2026". Esta migración:
--   1. portal.lista_espera: "Avisame cuando haya novedades" en cada desarrollo. Se agrupa por el texto de
--      avisos.emprendimiento (como hoy) y por la desarrolladora que lo publica. La desarrolladora ve cuántos hay, no
--      quiénes; la plataforma ve quiénes y marca cuándo les avisó.
--   2. portal.planes_membresia: el precio de la membresía es un dato (USD 25 por mes), no está en el código.
--   3. portal.membresias_inversor: una por persona (solicitada, activa, pausada, vencida). La pide el usuario; la activa
--      o la pausa la plataforma a mano, hasta que el cobro vaya por Mercado Pago (proveedor y referencia ya están).
--   4. Acceso anticipado: portal.publicaciones.visible_desde_publico (por defecto, publicado + 48 h en los lanzamientos
--      y publicado en el resto). La vista portal.novedades lo respeta: los miembros ven desde que se publica y el resto
--      desde visible_desde_publico. La vista suma dos columnas al final (visible_desde_publico y anticipado).
--   5. Lead de inversor: cuando un miembro activo abre una operación sobre una unidad en pozo (el paso "consulta"),
--      un trigger registra el paso "lead_inversor", que pasa por la regla "Inversor verificado" (USD 30 a la
--      desarrolladora, en simulación). Una sola vez por operación y por persona y desarrollo; sin recursión.
-- Nada se borra. Todo cobro sigue en simulación. Vuelta atrás: migracion-34-desarrollos-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lista de espera de desarrollos
-- ---------------------------------------------------------------------
create table if not exists portal.lista_espera (
  id              bigint generated always as identity primary key,
  emprendimiento  text not null,
  publicador_id   uuid references portal.publicadores(id) on delete cascade,
  usuario         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creado_en       timestamptz not null default now(),
  avisado_en      timestamptz,
  constraint m34_espera_emp check (char_length(btrim(emprendimiento)) between 1 and 160)
);
create unique index if not exists m34_espera_unica on portal.lista_espera
  (usuario, emprendimiento, coalesce(publicador_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists m34_espera_emp_idx on portal.lista_espera (publicador_id, emprendimiento);
alter table portal.lista_espera enable row level security;

-- ---------------------------------------------------------------------
-- 2. El plan y su precio (dato, no código)
-- ---------------------------------------------------------------------
create table if not exists portal.planes_membresia (
  plan            text primary key,
  nombre          text not null,
  precio          numeric(10,2) not null,
  moneda          text not null default 'USD',
  periodo         text not null default 'mes',
  activo          boolean not null default true,
  nota            text,
  actualizado_en  timestamptz not null default now(),
  constraint m34_plan_precio check (precio >= 0),
  constraint m34_plan_moneda check (moneda in ('USD','ARS')),
  constraint m34_plan_periodo check (periodo in ('mes','anio'))
);
alter table portal.planes_membresia enable row level security;
insert into portal.planes_membresia (plan, nombre, precio, moneda, periodo, nota)
values ('inversor', 'Membresía Inversor', 25, 'USD', 'mes', 'Precio de referencia del plan Rieles · octubre 2026. Activación manual hasta que esté Mercado Pago.')
on conflict (plan) do nothing;

-- ---------------------------------------------------------------------
-- 3. Membresías
-- ---------------------------------------------------------------------
create table if not exists portal.membresias_inversor (
  id              uuid primary key default gen_random_uuid(),
  usuario         uuid not null references auth.users(id) on delete cascade,
  plan            text not null default 'inversor' references portal.planes_membresia(plan),
  estado          text not null default 'solicitada',
  desde           timestamptz,
  hasta           timestamptz,
  proveedor       text,
  referencia      text,
  precio          numeric(10,2),
  moneda          text,
  solicitada_en   timestamptz not null default now(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  actualizado_por text,
  constraint m34_mi_usuario unique (usuario),
  constraint m34_mi_estado check (estado in ('solicitada','activa','pausada','vencida')),
  constraint m34_mi_proveedor check (proveedor is null or proveedor in ('manual','mercadopago')),
  constraint m34_mi_referencia check (referencia is null or char_length(referencia) <= 200),
  constraint m34_mi_fechas check (hasta is null or desde is null or hasta > desde),
  constraint m34_mi_activa check (estado <> 'activa' or (desde is not null and hasta is not null))
);
create index if not exists m34_mi_estado_idx on portal.membresias_inversor (estado, hasta);
alter table portal.membresias_inversor enable row level security;

-- Si una persona es miembro activo hoy (interna: la usan la vista, el trigger y las funciones)
create or replace function portal._miembro_inversor(p_uid uuid) returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select p_uid is not null and exists (select 1 from portal.membresias_inversor m
    where m.usuario = p_uid and m.estado = 'activa' and m.desde <= now() and m.hasta > now())
$$;

-- La sesión es miembro activo (la usa la vista novedades: sin sesión, false)
create or replace function portal.es_miembro_inversor() returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select portal._miembro_inversor(auth.uid())
$$;

create or replace function portal._es_plataforma_soporte() returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select portal.es_curador() or portal.es_plataforma('soporte') or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
$$;

-- El plan y la membresía de la sesión (sin sesión: solo el plan)
create or replace function portal.mi_membresia_inversor() returns jsonb
language sql stable security definer set search_path to 'portal', 'public' as $$
  select jsonb_build_object(
    'plan', (select jsonb_build_object('plan', p.plan, 'nombre', p.nombre, 'precio', p.precio, 'moneda', p.moneda, 'periodo', p.periodo, 'activo', p.activo)
               from portal.planes_membresia p where p.plan = 'inversor'),
    'membresia', (select jsonb_build_object('id', m.id, 'plan', m.plan,
        'estado', case when m.estado = 'activa' and m.hasta <= now() then 'vencida' else m.estado end,
        'desde', m.desde, 'hasta', m.hasta, 'solicitada_en', m.solicitada_en, 'precio', m.precio, 'moneda', m.moneda)
      from portal.membresias_inversor m where auth.uid() is not null and m.usuario = auth.uid()),
    'miembro', portal._miembro_inversor(auth.uid()))
$$;

-- La pide el usuario. Si ya es miembro activo, no cambia nada; si estaba pausada o vencida, vuelve a "solicitada".
create or replace function portal.solicitar_membresia() returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_uid uuid := auth.uid(); v_p portal.planes_membresia; v_m portal.membresias_inversor;
begin
  if v_uid is null then raise exception 'Ingresá para pedir la membresía.'; end if;
  select * into v_p from portal.planes_membresia where plan = 'inversor' and activo;
  if v_p.plan is null then raise exception 'La membresía no está disponible por ahora.'; end if;
  insert into portal.membresias_inversor (usuario, plan, estado, precio, moneda, actualizado_por)
  values (v_uid, v_p.plan, 'solicitada', v_p.precio, v_p.moneda, coalesce(auth.jwt() ->> 'email', 'usuario'))
  on conflict (usuario) do nothing;
  select * into v_m from portal.membresias_inversor where usuario = v_uid for update;
  if v_m.estado in ('pausada','vencida') or (v_m.estado = 'activa' and v_m.hasta <= now()) then
    update portal.membresias_inversor set estado = 'solicitada', solicitada_en = now(), precio = v_p.precio, moneda = v_p.moneda,
      actualizado_en = now(), actualizado_por = coalesce(auth.jwt() ->> 'email', 'usuario')
    where id = v_m.id;
  end if;
  return portal.mi_membresia_inversor();
end $$;

-- La activa la plataforma (hoy a mano; mañana el aviso de pago de Mercado Pago, con la clave de servicio).
-- Sin p_hasta: un mes desde hoy (o desde el vencimiento, si todavía estaba activa).
create or replace function portal.activar_membresia(p_id uuid, p_hasta timestamptz default null, p_proveedor text default 'manual', p_referencia text default null)
returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_m portal.membresias_inversor; v_vigente boolean; v_hasta timestamptz;
begin
  if not portal._es_plataforma_soporte() then raise exception 'Solo la plataforma activa membresías.'; end if;
  select * into v_m from portal.membresias_inversor where id = p_id for update;
  if v_m.id is null then raise exception 'La membresía no existe.'; end if;
  v_vigente := v_m.estado = 'activa' and v_m.hasta > now();
  v_hasta := coalesce(p_hasta, (case when v_vigente then v_m.hasta else now() end) + interval '1 month');
  if v_hasta <= now() then raise exception 'La fecha de fin tiene que ser posterior a hoy.'; end if;
  if v_hasta > now() + interval '3 years' then raise exception 'La fecha de fin es demasiado lejana.'; end if;
  if coalesce(p_proveedor, 'manual') not in ('manual','mercadopago') then raise exception 'Proveedor desconocido.'; end if;
  update portal.membresias_inversor set
    estado = 'activa',
    desde = case when v_vigente then desde else now() end,
    hasta = v_hasta,
    proveedor = coalesce(p_proveedor, 'manual'),
    referencia = coalesce(nullif(left(btrim(coalesce(p_referencia, '')), 200), ''), referencia),
    actualizado_en = now(),
    actualizado_por = coalesce(auth.jwt() ->> 'email', 'sistema')
  where id = p_id returning * into v_m;
  return to_jsonb(v_m) - 'actualizado_por';
end $$;

create or replace function portal.pausar_membresia(p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_m portal.membresias_inversor;
begin
  if not portal._es_plataforma_soporte() then raise exception 'Solo la plataforma pausa membresías.'; end if;
  update portal.membresias_inversor set estado = 'pausada', actualizado_en = now(), actualizado_por = coalesce(auth.jwt() ->> 'email', 'sistema')
  where id = p_id returning * into v_m;
  if v_m.id is null then raise exception 'La membresía no existe.'; end if;
  return to_jsonb(v_m) - 'actualizado_por';
end $$;

-- Solicitudes y miembros, para la plataforma. Antes de listar, pasa a "vencida" lo que ya venció.
create or replace function portal.membresias_inversor_lista()
returns table (id uuid, usuario uuid, nombre text, email text, plan text, estado text, desde timestamptz, hasta timestamptz,
  proveedor text, referencia text, precio numeric, moneda text, solicitada_en timestamptz, actualizado_en timestamptz)
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  if not (portal.es_curador() or portal.es_plataforma()) then raise exception 'Solo la plataforma ve las membresías.'; end if;
  update portal.membresias_inversor x set estado = 'vencida', actualizado_en = now(), actualizado_por = 'sistema'
   where x.estado = 'activa' and x.hasta <= now();
  return query
    select m.id, m.usuario, portal.nombre_interesado(m.usuario), u.email::text, m.plan, m.estado, m.desde, m.hasta,
      m.proveedor, m.referencia, m.precio, m.moneda, m.solicitada_en, m.actualizado_en
    from portal.membresias_inversor m
    left join auth.users u on u.id = m.usuario
    order by case m.estado when 'solicitada' then 0 when 'activa' then 1 when 'pausada' then 2 else 3 end, m.solicitada_en desc
    limit 500;
end $$;

-- ---------------------------------------------------------------------
-- 4. Lista de espera: sumarse, salir, resumen (cuántos) y detalle (quiénes, solo la plataforma)
-- ---------------------------------------------------------------------
create or replace function portal.sumarme_lista(p_emprendimiento text, p_publicador uuid default null) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_uid uuid := auth.uid(); v_emp text := btrim(coalesce(p_emprendimiento, '')); v_pub uuid;
begin
  if v_uid is null then raise exception 'Ingresá para que te avisemos.'; end if;
  if v_emp = '' then raise exception 'Falta el desarrollo.'; end if;
  select a.publicador_id into v_pub from portal.avisos a
   where a.emprendimiento = v_emp and a.estado_curacion = 'publicado' and (p_publicador is null or a.publicador_id = p_publicador)
   group by a.publicador_id order by count(*) desc limit 1;
  if v_pub is null then raise exception 'Ese desarrollo no está publicado.'; end if;
  if portal.soy_publicador(v_pub) then raise exception 'Es un desarrollo tuyo.'; end if;
  if not exists (select 1 from portal.lista_espera l where l.usuario = v_uid and l.emprendimiento = v_emp and l.publicador_id = v_pub)
     and (select count(*) from portal.lista_espera l where l.usuario = v_uid) >= 50 then
    raise exception 'Ya estás en 50 listas de espera.';
  end if;
  insert into portal.lista_espera (emprendimiento, publicador_id, usuario) values (v_emp, v_pub, v_uid)
  on conflict do nothing;
  return jsonb_build_object('en_lista', true, 'emprendimiento', v_emp, 'publicador_id', v_pub);
end $$;

create or replace function portal.salir_lista(p_emprendimiento text, p_publicador uuid default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  delete from portal.lista_espera l where l.usuario = auth.uid() and l.emprendimiento = btrim(coalesce(p_emprendimiento, ''))
    and (p_publicador is null or l.publicador_id = p_publicador);
  get diagnostics n = row_count;
  return n;
end $$;

-- Cuántos esperan cada desarrollo: la plataforma ve todos; la desarrolladora, los suyos. Nadie ve quiénes por acá.
create or replace function portal.lista_espera_resumen()
returns table (emprendimiento text, publicador_id uuid, publicador_nombre text, total integer, sin_avisar integer, ultimo timestamptz)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select l.emprendimiento, l.publicador_id, pb.nombre, count(*)::integer, count(*) filter (where l.avisado_en is null)::integer, max(l.creado_en)
  from portal.lista_espera l
  left join portal.publicadores pb on pb.id = l.publicador_id
  where auth.uid() is not null and (portal.es_curador() or portal.es_plataforma() or portal.soy_publicador(l.publicador_id))
  group by l.emprendimiento, l.publicador_id, pb.nombre
  order by max(l.creado_en) desc
  limit 300
$$;

-- Quiénes esperan un desarrollo: solo la plataforma
create or replace function portal.lista_espera_personas(p_emprendimiento text, p_publicador uuid default null)
returns table (id bigint, nombre text, email text, creado_en timestamptz, avisado_en timestamptz)
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
begin
  if not (portal.es_curador() or portal.es_plataforma()) then raise exception 'Solo la plataforma ve quiénes esperan.'; end if;
  return query
    select l.id, portal.nombre_interesado(l.usuario), u.email::text, l.creado_en, l.avisado_en
    from portal.lista_espera l left join auth.users u on u.id = l.usuario
    where l.emprendimiento = btrim(coalesce(p_emprendimiento, '')) and (p_publicador is null or l.publicador_id = p_publicador)
    order by l.creado_en
    limit 1000;
end $$;

-- La plataforma avisó a los que esperaban (el aviso en sí lo manda el equipo; acá queda la fecha)
create or replace function portal.marcar_avisados(p_emprendimiento text, p_publicador uuid default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare n integer;
begin
  if not portal._es_plataforma_soporte() then raise exception 'Solo la plataforma marca avisos.'; end if;
  update portal.lista_espera l set avisado_en = now()
   where l.emprendimiento = btrim(coalesce(p_emprendimiento, '')) and (p_publicador is null or l.publicador_id = p_publicador) and l.avisado_en is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 5. Acceso anticipado: desde cuándo ve el público cada publicación
-- ---------------------------------------------------------------------
alter table portal.publicaciones add column if not exists visible_desde_publico timestamptz;

-- Corre después de trg_publicacion (orden alfabético), que ya fijó publicado_en. Por defecto: publicado + 48 h en los
-- lanzamientos y publicado en el resto. Solo la plataforma lo puede fijar a mano (nunca antes de publicado_en).
create or replace function portal.trg_publicacion_visible() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_plat boolean := auth.uid() is null or portal.es_curador() or portal.es_plataforma('cura');
begin
  if new.publicado_en is null then new.visible_desde_publico := null; return new; end if;
  if v_plat and new.visible_desde_publico is not null
     and (tg_op = 'INSERT' or new.visible_desde_publico is distinct from old.visible_desde_publico) then
    new.visible_desde_publico := greatest(new.visible_desde_publico, new.publicado_en);
  elsif tg_op = 'UPDATE' and old.visible_desde_publico is not null
     and new.publicado_en is not distinct from old.publicado_en and new.tipo is not distinct from old.tipo then
    new.visible_desde_publico := old.visible_desde_publico;
  else
    new.visible_desde_publico := new.publicado_en + case when new.tipo = 'lanzamiento' then interval '48 hours' else interval '0 hours' end;
  end if;
  return new;
end $$;
drop trigger if exists trg_publicacion_visible on portal.publicaciones;
create trigger trg_publicacion_visible before insert or update on portal.publicaciones
  for each row execute function portal.trg_publicacion_visible();

update portal.publicaciones set visible_desde_publico = publicado_en + case when tipo = 'lanzamiento' then interval '48 hours' else interval '0 hours' end
 where publicado_en is not null and visible_desde_publico is null;

-- La vista del feed de Explorar (migración 27): mismas columnas y en el mismo orden; suma visible_desde_publico y
-- anticipado (la ve antes que el público porque es miembro). Para el miembro, la fecha es la de publicación; para el
-- resto, la de cuando se hizo pública. es_miembro_inversor() va en sub-select: se calcula una vez por consulta.
create or replace view portal.novedades as
  select 'nuevo'::text as tipo, a.id as aviso_id, null::uuid as publicacion_id, a.publicado_en as fecha,
    null::numeric as anterior, a.precio, a.moneda, null::text as titulo, null::text as texto, null::date as entrega, a.publicador_id,
    null::timestamptz as visible_desde_publico, false as anticipado
  from portal.avisos a
  where a.estado_curacion = 'publicado' and a.publicado_en > now() - interval '45 days'
  union all
  select 'baja_precio', ph.aviso_id, null, ph.registrado_en, ph.anterior, ph.precio, ph.moneda, null, null, null, a.publicador_id,
    null::timestamptz, false
  from portal.precios_historial ph
  join portal.avisos a on a.id = ph.aviso_id and a.estado_curacion = 'publicado'
  where ph.anterior is not null and ph.precio < ph.anterior and ph.registrado_en > now() - interval '45 days'
  union all
  select p.tipo, p.aviso_id, p.id,
    case when (select portal.es_miembro_inversor()) then p.publicado_en else greatest(p.publicado_en, v.desde) end,
    null, null, null, p.titulo, p.texto, p.entrega, p.publicador_id,
    v.desde, v.desde > now()
  from portal.publicaciones p
  cross join lateral (select coalesce(p.visible_desde_publico,
      p.publicado_en + case when p.tipo = 'lanzamiento' then interval '48 hours' else interval '0 hours' end, p.creado_en) as desde) v
  where p.estado = 'publicada' and (v.desde <= now() or (select portal.es_miembro_inversor()));

-- ---------------------------------------------------------------------
-- 6. Lead de inversor: el paso "consulta" de un miembro activo sobre una unidad en pozo
-- ---------------------------------------------------------------------
-- Una sola vez por operación (además, el índice único lo garantiza)
create unique index if not exists m34_hitos_lead_unico on portal.hitos (operacion_id) where tipo = 'lead_inversor';

-- Solo corre para tipo 'consulta' (WHEN del trigger) y escribe 'lead_inversor': no se llama a sí mismo. Una persona que
-- consulta otra unidad del mismo desarrollo, o reabre la consulta por la misma unidad, no es un contacto nuevo para la
-- desarrolladora. Si algo falla, la consulta igual queda registrada.
create or replace function portal.trg_lead_inversor() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare o portal.operaciones; v_emp text;
begin
  begin
    select * into o from portal.operaciones where id = new.operacion_id;
    if o.id is null or o.linea is distinct from 'pozo' or o.interesado_user is null then return null; end if;
    if not portal._miembro_inversor(o.interesado_user) then return null; end if;
    if exists (select 1 from portal.hitos h where h.operacion_id = o.id and h.tipo = 'lead_inversor') then return null; end if;
    select nullif(btrim(a.emprendimiento), '') into v_emp from portal.avisos a where a.id = o.aviso_id;
    if exists (select 1 from portal.hitos h
                 join portal.operaciones x on x.id = h.operacion_id
                 left join portal.avisos ax on ax.id = x.aviso_id
                where h.tipo = 'lead_inversor' and x.interesado_user = o.interesado_user and x.publicador_id = o.publicador_id
                  and (x.aviso_id = o.aviso_id or (v_emp is not null and btrim(ax.emprendimiento) = v_emp))) then
      return null;
    end if;
    perform portal._hito(o.id, 'lead_inversor', 'sistema',
      jsonb_strip_nulls(jsonb_build_object('consulta', new.id, 'plan', 'inversor', 'emprendimiento', v_emp)));
  exception when others then
    raise warning 'lead de inversor: %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists trg_lead_inversor on portal.hitos;
create trigger trg_lead_inversor after insert on portal.hitos
  for each row when (new.tipo = 'consulta') execute function portal.trg_lead_inversor();

-- ---------------------------------------------------------------------
-- 7. Políticas (RLS)
-- ---------------------------------------------------------------------
drop policy if exists "lista de espera propia" on portal.lista_espera;
create policy "lista de espera propia" on portal.lista_espera for select
  using (usuario = auth.uid() or portal.es_curador() or portal.es_plataforma());

drop policy if exists "planes visibles" on portal.planes_membresia;
create policy "planes visibles" on portal.planes_membresia for select using (activo or portal.es_curador() or portal.es_plataforma());
drop policy if exists "planes los cambia la plataforma" on portal.planes_membresia;
create policy "planes los cambia la plataforma" on portal.planes_membresia for update
  using (portal.es_curador() or portal.es_plataforma('soporte')) with check (portal.es_curador() or portal.es_plataforma('soporte'));

drop policy if exists "membresia propia" on portal.membresias_inversor;
create policy "membresia propia" on portal.membresias_inversor for select
  using (usuario = auth.uid() or portal.es_curador() or portal.es_plataforma());

-- ---------------------------------------------------------------------
-- 8. Permisos de tabla y de función
-- ---------------------------------------------------------------------
revoke all on portal.lista_espera, portal.membresias_inversor, portal.planes_membresia from anon, authenticated;
grant select on portal.lista_espera, portal.membresias_inversor, portal.planes_membresia to authenticated;
grant select on portal.planes_membresia to anon;
grant update (nombre, precio, moneda, periodo, activo, nota) on portal.planes_membresia to authenticated;
grant select on portal.novedades to anon, authenticated;

-- Internas
revoke all on function portal._miembro_inversor(uuid), portal._es_plataforma_soporte(), portal.trg_lead_inversor(),
  portal.trg_publicacion_visible() from public, anon, authenticated;
-- La vista novedades la llama con la sesión de quien mira (también sin sesión)
revoke all on function portal.es_miembro_inversor() from public;
grant execute on function portal.es_miembro_inversor() to anon, authenticated;
revoke all on function portal.mi_membresia_inversor() from public;
grant execute on function portal.mi_membresia_inversor() to anon, authenticated;
-- Las que llama la página (con sesión)
revoke all on function portal.solicitar_membresia(), portal.activar_membresia(uuid, timestamptz, text, text),
  portal.pausar_membresia(uuid), portal.membresias_inversor_lista(), portal.sumarme_lista(text, uuid),
  portal.salir_lista(text, uuid), portal.lista_espera_resumen(), portal.lista_espera_personas(text, uuid),
  portal.marcar_avisados(text, uuid) from public, anon;
grant execute on function portal.solicitar_membresia(), portal.activar_membresia(uuid, timestamptz, text, text),
  portal.pausar_membresia(uuid), portal.membresias_inversor_lista(), portal.sumarme_lista(text, uuid),
  portal.salir_lista(text, uuid), portal.lista_espera_resumen(), portal.lista_espera_personas(text, uuid),
  portal.marcar_avisados(text, uuid) to authenticated;
-- El aviso de pago de Mercado Pago (cuando esté) activa y pausa con la clave de servicio
grant execute on function portal.activar_membresia(uuid, timestamptz, text, text), portal.pausar_membresia(uuid) to service_role;

notify pgrst, 'reload schema';

-- Controles
select 'tablas nuevas' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal'
     and table_name in ('lista_espera','planes_membresia','membresias_inversor')) = 3 as ok
union all select 'precio como dato', exists (select 1 from portal.planes_membresia where plan = 'inversor' and precio = 25 and moneda = 'USD')
union all select 'novedades con acceso anticipado', (select count(*) from information_schema.columns where table_schema = 'portal'
     and table_name = 'novedades' and column_name in ('visible_desde_publico','anticipado')) = 2
union all select 'trigger del lead', exists (select 1 from pg_trigger where tgname = 'trg_lead_inversor' and tgrelid = 'portal.hitos'::regclass)
union all select 'regla Inversor verificado en simulación', exists (select 1 from portal.reglas_cobro where evento = 'lead_inversor' and linea = 'pozo' and not cobra);
