-- =====================================================================
-- BAIREN · Portal · Migración 27 · El esqueleto de la operación digital
--
-- 8/10/2026. Base de "BAIREN, la digitalización del real estate" (nota del vault, secciones 11 y 12): cada contacto
-- entre alguien que busca y quien publica pasa a ser una OPERACIÓN con su recorrido completo, y cada paso queda
-- registrado con fecha. Encima de ese registro corre un motor de cobro CONFIGURABLE: las reglas dicen qué evento
-- cobra, cuánto, a quién y en qué escenario. Hoy todas las reglas solo SIMULAN (cobra = false): nada se le cobra a
-- nadie. Cuando Tomás decida el esquema, se cargan o se activan reglas sin tocar código.
--
-- Qué agrega (nada se borra; solo se suman columnas, tablas, vistas y funciones):
--   1. portal.operaciones: ya existía como "el cierre real" (vacía). Ahora es la operación entera, de la consulta al
--      cierre: etapa, línea de negocio, quién busca, origen. precio_cierre y fecha_cierre dejan de ser obligatorios
--      (se completan al cerrar).
--   2. portal.hitos: el registro inmutable de cada paso (consulta, conversación, visita, solicitud, reserva, contrato,
--      cierre, caída, cobro mensual). Solo se escribe por funciones; nadie lo edita ni lo borra.
--   3. portal.mensajes: el chat de cada operación, entre las partes.
--   4. portal.busquedas + portal.propuestas: "Se busca". Quien busca publica lo que quiere sin mostrar quién es; los
--      publicadores le proponen unidades; la identidad se revela recién al aceptar una propuesta.
--   5. portal.publicaciones + vista portal.novedades: el feed de Explorar (unidades nuevas, bajas de precio y
--      novedades curadas de publicadores, como un lanzamiento con fecha de entrega).
--   6. portal.documentos: reserva, contrato, boleto y convenio de cada operación (la firma digital viene después).
--   7. portal.reglas_cobro + portal.cargos: el motor de cobro por escenarios, con dos escenarios de ejemplo
--      ("Idea original · porcentaje" y "Sin matrícula · sección 12"), todos en simulación.
--   8. portal.visitas_reservas.operacion_id: una visita confirmada desde la operación aparece también en el panel.
--   9. Arreglo: la política "visitas las ve el propietario" hacía fallar toda lectura de visitas con sesión (sección 17).
--
-- Permisos: todo se lee con RLS por "parte" de la operación (quien busca, el equipo del publicador, la plataforma) y
-- se escribe por funciones SECURITY DEFINER que validan quién hace cada paso. Ensayada antes en una transacción
-- deshecha con usuarios de prueba. Vuelta atrás: migracion-27-digital-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Funciones puras: la línea de negocio y el orden de las etapas
-- ---------------------------------------------------------------------
-- temporario (hasta 3 meses, régimen de turismo) · mediano (más de 3 meses, amoblado) · tradicional · venta · pozo
create or replace function portal.linea_de(p_operacion text, p_etapa text default null, p_plazo_meses integer default null)
returns text language sql immutable as $$
  select case
    when p_operacion = 'venta' and p_etapa in ('pozo', 'construccion') then 'pozo'
    when p_operacion = 'venta' then 'venta'
    when p_operacion = 'alquiler' then 'tradicional'
    when p_operacion = 'mediano' and p_plazo_meses is not null and p_plazo_meses <= 3 then 'temporario'
    when p_operacion = 'mediano' then 'mediano'
  end
$$;

create or replace function portal.orden_etapa(p text) returns integer language sql immutable as $$
  select case p when 'consulta' then 1 when 'conversacion' then 2 when 'visita' then 3 when 'solicitud' then 4
                when 'reserva' then 5 when 'contrato' then 6 when 'cerrada' then 7 else 0 end
$$;

-- A qué etapa lleva cada hito (null: no mueve la etapa)
create or replace function portal.etapa_de_hito(p text) returns text language sql immutable as $$
  select case p
    when 'consulta' then 'consulta' when 'propuesta_aceptada' then 'consulta'
    when 'conversacion' then 'conversacion' when 'whatsapp' then 'conversacion'
    when 'visita_pedida' then 'visita' when 'visita_confirmada' then 'visita' when 'visita_realizada' then 'visita'
    when 'solicitud_enviada' then 'solicitud' when 'solicitud_aceptada' then 'solicitud'
    when 'reserva' then 'reserva' when 'contrato_firmado' then 'contrato' when 'cierre' then 'cerrada'
  end
$$;

-- ---------------------------------------------------------------------
-- 1. Operaciones: de la consulta al cierre
-- ---------------------------------------------------------------------
alter table portal.operaciones alter column precio_cierre drop not null;
alter table portal.operaciones alter column fecha_cierre drop not null;
alter table portal.operaciones
  add column if not exists linea           text,
  add column if not exists etapa           text not null default 'consulta',
  add column if not exists interesado_user uuid references auth.users(id) on delete set null,
  add column if not exists consulta_id     uuid references portal.consultas(id) on delete set null,
  add column if not exists busqueda_id     uuid,
  add column if not exists origen          text not null default 'ficha',
  add column if not exists abierta_en      timestamptz not null default now(),
  add column if not exists actualizada_en  timestamptz not null default now(),
  add column if not exists cerrada_en      timestamptz,
  add column if not exists motivo_caida    text,
  add column if not exists monto_contrato  numeric(14,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'm27_op_linea') then
    alter table portal.operaciones add constraint m27_op_linea check (linea is null or linea in ('temporario','mediano','tradicional','venta','pozo'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'm27_op_etapa') then
    alter table portal.operaciones add constraint m27_op_etapa check (etapa in ('consulta','conversacion','visita','solicitud','reserva','contrato','cerrada','caida'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'm27_op_origen') then
    alter table portal.operaciones add constraint m27_op_origen check (origen in ('ficha','se_busca','whatsapp','os','manual'));
  end if;
end $$;

create index if not exists operaciones_interesado_idx on portal.operaciones (interesado_user, actualizada_en desc);
create index if not exists operaciones_pub_act_idx on portal.operaciones (publicador_id, actualizada_en desc);
-- Una sola operación abierta por persona y aviso
create unique index if not exists operaciones_abierta_uniq on portal.operaciones (aviso_id, interesado_user)
  where etapa not in ('cerrada', 'caida') and interesado_user is not null and aviso_id is not null;

-- ---------------------------------------------------------------------
-- 2. Hitos: el registro de cada paso (inmutable)
-- ---------------------------------------------------------------------
create table if not exists portal.hitos (
  id            bigint generated always as identity primary key,
  operacion_id  uuid not null references portal.operaciones(id) on delete cascade,
  tipo          text not null,
  lado          text not null,
  autor         uuid,
  datos         jsonb,
  creado_en     timestamptz not null default now(),
  constraint m27_hito_tipo check (tipo in ('consulta','conversacion','whatsapp','visita_pedida','visita_confirmada',
    'visita_realizada','visita_cancelada','solicitud_enviada','solicitud_aceptada','solicitud_rechazada',
    'propuesta_aceptada','reserva','contrato_generado','contrato_firmado','cierre','caida','reabierta','cobro_mensual')),
  constraint m27_hito_lado check (lado in ('interesado','publicador','plataforma','sistema')),
  constraint m27_hito_datos check (datos is null or octet_length(datos::text) <= 8192)
);
create index if not exists hitos_op_idx on portal.hitos (operacion_id, id);
alter table portal.hitos enable row level security;

-- ---------------------------------------------------------------------
-- 3. Mensajes: el chat de la operación
-- ---------------------------------------------------------------------
create table if not exists portal.mensajes (
  id            bigint generated always as identity primary key,
  operacion_id  uuid not null references portal.operaciones(id) on delete cascade,
  lado          text not null,
  autor         uuid not null default auth.uid(),
  texto         text not null,
  creado_en     timestamptz not null default now(),
  leido_en      timestamptz,
  constraint m27_msj_lado check (lado in ('interesado','publicador','plataforma')),
  constraint m27_msj_texto check (char_length(btrim(texto)) between 1 and 4000)
);
create index if not exists mensajes_op_idx on portal.mensajes (operacion_id, id);
alter table portal.mensajes enable row level security;

-- ---------------------------------------------------------------------
-- 4. Se busca: búsquedas anónimas y propuestas de publicadores
-- ---------------------------------------------------------------------
create table if not exists portal.busquedas (
  id               uuid primary key default gen_random_uuid(),
  usuario          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  perfil           text not null default 'particular',
  operacion        text not null,
  linea            text,
  tipo             text,
  zonas            text[] not null default '{}',
  ambientes_min    integer,
  dormitorios_min  integer,
  m2_min           integer,
  precio_max       numeric(14,2),
  moneda           text not null default 'USD',
  desde            date,
  plazo_meses      integer,
  detalle          text,
  verificada       boolean not null default false,
  estado           text not null default 'activa',
  vence_en         timestamptz not null default (now() + interval '60 days'),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  constraint m27_bus_perfil check (perfil in ('particular','inversor','familia','empresa','extranjero')),
  constraint m27_bus_op check (operacion in ('venta','alquiler','mediano')),
  constraint m27_bus_linea check (linea is null or linea in ('temporario','mediano','tradicional','venta','pozo')),
  constraint m27_bus_moneda check (moneda in ('USD','ARS')),
  constraint m27_bus_estado check (estado in ('activa','pausada','cerrada')),
  constraint m27_bus_detalle check (detalle is null or char_length(detalle) <= 600),
  constraint m27_bus_zonas check (cardinality(zonas) <= 12),
  constraint m27_bus_nums check (coalesce(ambientes_min, 0) between 0 and 20 and coalesce(dormitorios_min, 0) between 0 and 20
    and coalesce(m2_min, 0) between 0 and 100000 and coalesce(plazo_meses, 0) between 0 and 120 and coalesce(precio_max, 0) >= 0)
);
create index if not exists busquedas_usuario_idx on portal.busquedas (usuario);
create index if not exists busquedas_activas_idx on portal.busquedas (estado, vence_en);
alter table portal.busquedas enable row level security;

alter table portal.operaciones drop constraint if exists m27_op_busqueda;
alter table portal.operaciones add constraint m27_op_busqueda foreign key (busqueda_id) references portal.busquedas(id) on delete set null;

create table if not exists portal.propuestas (
  id             uuid primary key default gen_random_uuid(),
  busqueda_id    uuid not null references portal.busquedas(id) on delete cascade,
  publicador_id  uuid not null references portal.publicadores(id) on delete cascade,
  aviso_id       uuid references portal.avisos(id) on delete set null,
  autor          uuid not null default auth.uid(),
  mensaje        text,
  estado         text not null default 'enviada',
  operacion_id   uuid references portal.operaciones(id) on delete set null,
  creado_en      timestamptz not null default now(),
  respondida_en  timestamptz,
  constraint m27_prop_estado check (estado in ('enviada','aceptada','rechazada','retirada')),
  constraint m27_prop_mensaje check (mensaje is null or char_length(mensaje) <= 1000),
  constraint m27_prop_unica unique (busqueda_id, aviso_id)
);
create index if not exists propuestas_busqueda_idx on portal.propuestas (busqueda_id);
create index if not exists propuestas_pub_idx on portal.propuestas (publicador_id, creado_en desc);
alter table portal.propuestas enable row level security;

-- ---------------------------------------------------------------------
-- 5. Publicaciones de publicadores (lanzamientos, avance de obra, novedades) · curadas
-- ---------------------------------------------------------------------
create table if not exists portal.publicaciones (
  id             uuid primary key default gen_random_uuid(),
  publicador_id  uuid not null references portal.publicadores(id) on delete cascade,
  aviso_id       uuid references portal.avisos(id) on delete set null,
  tipo           text not null,
  titulo         text not null,
  texto          text,
  imagen_url     text,
  entrega        date,
  estado         text not null default 'en_revision',
  motivo         text,
  autor          uuid default auth.uid(),
  creado_en      timestamptz not null default now(),
  publicado_en   timestamptz,
  constraint m27_pubn_tipo check (tipo in ('lanzamiento','avance_obra','novedad')),
  constraint m27_pubn_estado check (estado in ('en_revision','publicada','rechazada','retirada')),
  constraint m27_pubn_titulo check (char_length(btrim(titulo)) between 3 and 120),
  constraint m27_pubn_texto check (texto is null or char_length(texto) <= 1500),
  constraint m27_pubn_img check (imagen_url is null or char_length(imagen_url) <= 600)
);
create index if not exists publicaciones_estado_idx on portal.publicaciones (estado, publicado_en desc);
create index if not exists publicaciones_pub_idx on portal.publicaciones (publicador_id);
alter table portal.publicaciones enable row level security;

-- ---------------------------------------------------------------------
-- 6. Documentos de la operación
-- ---------------------------------------------------------------------
create table if not exists portal.documentos (
  id               uuid primary key default gen_random_uuid(),
  operacion_id     uuid not null references portal.operaciones(id) on delete cascade,
  tipo             text not null,
  titulo           text,
  estado           text not null default 'borrador',
  archivo          text,
  proveedor_firma  text,
  id_externo       text,
  creado_por       uuid default auth.uid(),
  creado_en        timestamptz not null default now(),
  firmado_en       timestamptz,
  constraint m27_doc_tipo check (tipo in ('reserva','contrato','boleto','convenio','inventario','otro')),
  constraint m27_doc_estado check (estado in ('borrador','enviado','firmado','anulado')),
  constraint m27_doc_textos check (char_length(coalesce(titulo, '')) <= 160 and char_length(coalesce(archivo, '')) <= 600)
);
create index if not exists documentos_op_idx on portal.documentos (operacion_id);
alter table portal.documentos enable row level security;

-- ---------------------------------------------------------------------
-- 7. Motor de cobro: reglas por escenario y cargos generados
-- ---------------------------------------------------------------------
create table if not exists portal.reglas_cobro (
  id              uuid primary key default gen_random_uuid(),
  escenario       text not null,
  concepto        text,
  linea           text not null default 'todas',
  evento          text not null,
  paga            text not null default 'publicador',
  modo            text not null,
  valor           numeric(14,4) not null,
  moneda          text not null default 'USD',
  base            text,
  minimo          numeric(14,2),
  maximo          numeric(14,2),
  activa          boolean not null default true,
  cobra           boolean not null default false,   -- false: solo simula. true: genera cargos pendientes de verdad
  nota            text,
  actualizado_por text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint m27_regla_escenario check (char_length(btrim(escenario)) between 1 and 80),
  constraint m27_regla_linea check (linea in ('todas','temporario','mediano','tradicional','venta','pozo')),
  constraint m27_regla_evento check (evento in ('consulta','conversacion','whatsapp','visita_confirmada','visita_realizada',
    'solicitud_enviada','solicitud_aceptada','propuesta_aceptada','reserva','contrato_generado','contrato_firmado','cierre','cobro_mensual')),
  constraint m27_regla_paga check (paga in ('publicador','interesado','propietario')),
  constraint m27_regla_modo check (modo in ('fijo','porcentaje')),
  constraint m27_regla_valor check (valor >= 0 and (modo <> 'porcentaje' or valor <= 100)),
  constraint m27_regla_moneda check (moneda in ('USD','ARS')),
  constraint m27_regla_base check ((modo = 'fijo' and base is null) or (modo = 'porcentaje' and base in ('precio_publicado','precio_cierre','monto_contrato','monto_hito')))
);
alter table portal.reglas_cobro enable row level security;

create table if not exists portal.cargos (
  id             bigint generated always as identity primary key,
  operacion_id   uuid not null references portal.operaciones(id) on delete cascade,
  hito_id        bigint references portal.hitos(id) on delete set null,
  regla_id       uuid references portal.reglas_cobro(id) on delete set null,
  escenario      text not null,
  publicador_id  uuid not null,
  paga           text not null,
  concepto       text not null,
  linea          text,
  base_monto     numeric(14,2),
  moneda         text not null,
  monto          numeric(14,2) not null,
  estado         text not null default 'simulado',
  creado_en      timestamptz not null default now(),
  constraint m27_cargo_estado check (estado in ('simulado','pendiente','facturado','cobrado','anulado')),
  constraint m27_cargo_unico unique (hito_id, regla_id)
);
create index if not exists cargos_escenario_idx on portal.cargos (escenario, estado);
create index if not exists cargos_op_idx on portal.cargos (operacion_id);
alter table portal.cargos enable row level security;

-- ---------------------------------------------------------------------
-- 8. Visitas atadas a la operación
-- ---------------------------------------------------------------------
alter table portal.visitas_reservas add column if not exists operacion_id uuid references portal.operaciones(id) on delete set null;
create index if not exists visitas_op_idx on portal.visitas_reservas (operacion_id);

-- ---------------------------------------------------------------------
-- 9. Quién es quién en una operación
-- ---------------------------------------------------------------------
-- Los papeles que tiene la sesión en la operación: interesado, publicador (titular o equipo), plataforma (curación o soporte)
create or replace function portal.lados_en(p_op uuid) returns text[]
language sql stable security definer set search_path to 'portal', 'public' as $$
  select coalesce((
    select array_remove(array[
      case when auth.uid() is not null and o.interesado_user = auth.uid() then 'interesado' end,
      case when portal.es_miembro(o.publicador_id)
             or exists (select 1 from portal.publicadores pb where pb.id = o.publicador_id and pb.auth_user_id = auth.uid())
           then 'publicador' end,
      case when portal.es_curador() or portal.es_plataforma() then 'plataforma' end
    ], null)
    from portal.operaciones o where o.id = p_op), '{}'::text[])
$$;

create or replace function portal.es_parte(p_op uuid) returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select cardinality(portal.lados_en(p_op)) > 0
$$;

create or replace function portal.es_mi_busqueda(p_busqueda uuid) returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select exists (select 1 from portal.busquedas b where b.id = p_busqueda and b.usuario = auth.uid())
$$;

create or replace function portal.soy_publicador(p_pub uuid) returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select auth.uid() is not null and (portal.es_miembro(p_pub)
    or exists (select 1 from portal.publicadores pb where pb.id = p_pub and pb.auth_user_id = auth.uid()))
$$;

-- Nombre corto del que busca ("Lucía P."), para listas
create or replace function portal.nombre_interesado(p_uid uuid) returns text
language sql stable security definer set search_path to 'portal', 'public' as $$
  select coalesce(
    (select portal.nombre_publico(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')))
       from portal.personas p where p.auth_user_id = p_uid limit 1),
    (select initcap(split_part(split_part(u.email, '@', 1), '.', 1)) from auth.users u where u.id = p_uid),
    'Interesado')
$$;

-- Contacto completo del que busca: solo lo pide operacion_detalle para el publicador y la plataforma
create or replace function portal.contacto_interesado(p_op uuid) returns jsonb
language sql stable security definer set search_path to 'portal', 'public' as $$
  select jsonb_build_object(
    'nombre', coalesce(nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), c.nombre, portal.nombre_interesado(o.interesado_user)),
    'email', coalesce(u.email, c.email),
    'telefono', coalesce(p.whatsapp, p.telefono, c.telefono),
    'verificado', p.dni_verificado_en is not null)
  from portal.operaciones o
  left join auth.users u on u.id = o.interesado_user
  left join portal.personas p on p.auth_user_id = o.interesado_user
  left join portal.consultas c on c.id = o.consulta_id
  where o.id = p_op
$$;

-- ---------------------------------------------------------------------
-- 10. Escribir un hito (interno) y registrar un paso (desde la página)
-- ---------------------------------------------------------------------
create or replace function portal._hito(p_op uuid, p_tipo text, p_lado text, p_datos jsonb default null) returns bigint
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_id bigint; v_op portal.operaciones; v_nueva text;
begin
  select * into v_op from portal.operaciones where id = p_op for update;
  if v_op.id is null then raise exception 'La operación no existe.'; end if;
  v_nueva := portal.etapa_de_hito(p_tipo);
  if p_tipo = 'caida' then
    update portal.operaciones set etapa = 'caida', motivo_caida = nullif(left(coalesce(p_datos ->> 'motivo', ''), 300), ''), actualizada_en = now() where id = p_op;
  elsif p_tipo = 'reabierta' then
    update portal.operaciones set etapa = 'conversacion', motivo_caida = null, actualizada_en = now() where id = p_op;
  elsif v_nueva is not null and v_op.etapa <> 'caida' and portal.orden_etapa(v_nueva) > portal.orden_etapa(v_op.etapa) then
    update portal.operaciones set etapa = v_nueva, actualizada_en = now() where id = p_op;
  else
    update portal.operaciones set actualizada_en = now() where id = p_op;
  end if;
  insert into portal.hitos (operacion_id, tipo, lado, autor, datos) values (p_op, p_tipo, p_lado, auth.uid(), p_datos) returning id into v_id;
  return v_id;
end $$;

create or replace function portal.registrar_hito(p_op uuid, p_tipo text, p_datos jsonb default null) returns bigint
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare
  v_lados text[]; v_lado text; v_op portal.operaciones; v_fecha timestamptz; v_plazo integer; v_etapa_aviso text;
  INTERESADO_PUEDE text[] := array['whatsapp','visita_pedida','visita_cancelada','solicitud_enviada','caida'];
  PUBLICADOR_PUEDE text[] := array['whatsapp','visita_confirmada','visita_realizada','visita_cancelada','solicitud_aceptada',
    'solicitud_rechazada','reserva','contrato_generado','contrato_firmado','cierre','caida','reabierta','cobro_mensual'];
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  v_lados := portal.lados_en(p_op);
  if cardinality(v_lados) = 0 then raise exception 'No sos parte de esta operación.'; end if;
  select * into v_op from portal.operaciones where id = p_op;
  v_lado := case
    when 'interesado' = any(v_lados) and p_tipo = any(INTERESADO_PUEDE) then 'interesado'
    when 'publicador' = any(v_lados) and p_tipo = any(PUBLICADOR_PUEDE) then 'publicador'
    when 'plataforma' = any(v_lados) and p_tipo <> all(array['consulta','conversacion','propuesta_aceptada']) then 'plataforma'
  end;
  if v_lado is null then raise exception 'Ese paso no te corresponde en esta operación.'; end if;
  if v_op.etapa in ('caida','cerrada') and p_tipo not in ('reabierta','cobro_mensual') then raise exception 'La operación está cerrada.'; end if;
  if p_tipo = 'reabierta' and v_op.etapa <> 'caida' then raise exception 'Solo se reabre una operación caída.'; end if;
  if p_tipo = 'cobro_mensual' and coalesce(nullif(p_datos ->> 'monto', '')::numeric, 0) <= 0 then raise exception 'Falta el monto cobrado.'; end if;

  -- Datos que completan la operación
  v_plazo := nullif(p_datos ->> 'plazo_meses', '')::integer;
  if v_plazo is not null then
    select etapa into v_etapa_aviso from portal.avisos where id = v_op.aviso_id;
    update portal.operaciones set plazo_meses = v_plazo, linea = coalesce(portal.linea_de(tipo, v_etapa_aviso, v_plazo), linea) where id = p_op;
  end if;
  if p_tipo in ('reserva','contrato_firmado','cierre') then
    update portal.operaciones set
      monto_contrato = coalesce(nullif(p_datos ->> 'monto_contrato', '')::numeric, monto_contrato),
      precio_cierre  = coalesce(nullif(p_datos ->> 'precio_cierre', '')::numeric, precio_cierre),
      moneda         = coalesce(case when p_datos ->> 'moneda' in ('USD','ARS') then p_datos ->> 'moneda' end, moneda)
    where id = p_op;
  end if;
  if p_tipo = 'cierre' then
    update portal.operaciones o set fecha_cierre = current_date, cerrada_en = now(),
      dias_en_mercado = (select current_date - a.publicado_en::date from portal.avisos a where a.id = o.aviso_id),
      visitas = (select count(*) from portal.visitas_reservas v where v.operacion_id = o.id and v.estado in ('confirmada','realizada'))
    where o.id = p_op;
  end if;

  -- La visita confirmada también va a visitas_reservas (la ve el panel y, por ahí, el OS)
  if p_tipo = 'visita_confirmada' then
    v_fecha := nullif(p_datos ->> 'fecha', '')::timestamptz;
    if v_fecha is null then raise exception 'Falta la fecha de la visita.'; end if;
    insert into portal.visitas_reservas (aviso_id, publicador_id, tipo, fecha, nota, consulta_id, estado, operacion_id)
    values (v_op.aviso_id, v_op.publicador_id, 'visita', v_fecha, nullif(left(coalesce(p_datos ->> 'nota', ''), 500), ''), v_op.consulta_id, 'confirmada', p_op);
  elsif p_tipo in ('visita_realizada','visita_cancelada') then
    update portal.visitas_reservas
       set estado = case when p_tipo = 'visita_realizada' then 'realizada' else 'cancelada' end,
           feedback = coalesce(nullif(left(coalesce(p_datos ->> 'feedback', ''), 1000), ''), feedback)
     where id = (select id from portal.visitas_reservas where operacion_id = p_op and estado = 'confirmada' order by fecha desc limit 1);
  end if;

  return portal._hito(p_op, p_tipo, v_lado, p_datos);
end $$;

-- ---------------------------------------------------------------------
-- 11. Abrir una operación desde una ficha (quien busca le escribe a quien publica)
-- ---------------------------------------------------------------------
create or replace function portal.abrir_operacion(p_aviso uuid, p_mensaje text default null, p_consulta uuid default null) returns uuid
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_uid uuid := auth.uid(); v_a portal.avisos; v_id uuid; v_consulta uuid := p_consulta;
begin
  if v_uid is null then raise exception 'Ingresá para escribirle a quien publica.'; end if;
  select * into v_a from portal.avisos where id = p_aviso and estado_curacion = 'publicado';
  if v_a.id is null then raise exception 'Esta propiedad ya no está publicada.'; end if;
  if portal.soy_publicador(v_a.publicador_id) then raise exception 'Es una publicación tuya.'; end if;
  if v_consulta is not null and not exists (select 1 from portal.consultas c where c.id = v_consulta and c.aviso_id = p_aviso) then v_consulta := null; end if;
  select id into v_id from portal.operaciones
   where aviso_id = p_aviso and interesado_user = v_uid and etapa not in ('cerrada','caida') limit 1;
  if v_id is null then
    if (select count(*) from portal.operaciones where interesado_user = v_uid and abierta_en > now() - interval '1 day') >= 30 then
      raise exception 'Abriste muchas conversaciones hoy. Probá de nuevo mañana.';
    end if;
    insert into portal.operaciones (aviso_id, publicador_id, tipo, moneda, precio_publicado, linea, etapa, interesado_user, consulta_id, origen)
    values (v_a.id, v_a.publicador_id, v_a.operacion, case when v_a.moneda in ('USD','ARS') then v_a.moneda else 'USD' end,
            v_a.precio, portal.linea_de(v_a.operacion, v_a.etapa), 'consulta', v_uid, v_consulta, 'ficha')
    returning id into v_id;
    perform portal._hito(v_id, 'consulta', 'interesado', case when v_consulta is null then null else jsonb_build_object('consulta_id', v_consulta) end);
  end if;
  if coalesce(btrim(p_mensaje), '') <> '' then
    insert into portal.mensajes (operacion_id, lado, autor, texto) values (v_id, 'interesado', v_uid, left(btrim(p_mensaje), 4000));
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 12. Bandeja y detalle
-- ---------------------------------------------------------------------
-- Mis operaciones (como quien busca y como publicador). Con p_todas, la plataforma ve todas.
create or replace function portal.mis_operaciones(p_todas boolean default false)
returns table (id uuid, lado text, etapa text, linea text, tipo text, origen text, aviso_id uuid, aviso_codigo text,
  aviso_titulo text, aviso_lugar text, foto text, publicador_id uuid, publicador_nombre text, contraparte text,
  ultimo_texto text, ultimo_lado text, ultimo_en timestamptz, no_leidos integer, abierta_en timestamptz, actualizada_en timestamptz)
language sql stable security definer set search_path to 'portal', 'public' as $$
  with mias as (
    select o.*,
      case when o.interesado_user = auth.uid() then 'interesado'
           when portal.soy_publicador(o.publicador_id) then 'publicador' else 'plataforma' end as lado
    from portal.operaciones o
    where auth.uid() is not null and (
      o.interesado_user = auth.uid() or portal.soy_publicador(o.publicador_id)
      or (p_todas and (portal.es_curador() or portal.es_plataforma())))
    order by o.actualizada_en desc
    limit 300
  )
  select m.id, m.lado, m.etapa, m.linea, m.tipo, m.origen, m.aviso_id, a.codigo, a.titulo,
    case when m.lado = 'interesado' and coalesce(a.mostrar_direccion, 'exacta') <> 'exacta' then a.barrio else coalesce(a.direccion, a.barrio) end,
    portal.portada_de(a.id), m.publicador_id, pb.nombre,
    case when m.lado = 'interesado' then pb.nombre else portal.nombre_interesado(m.interesado_user) end,
    u.texto, u.lado, u.creado_en,
    (select count(*)::integer from portal.mensajes x where x.operacion_id = m.id and x.lado <> m.lado and x.leido_en is null),
    m.abierta_en, m.actualizada_en
  from mias m
  left join portal.avisos a on a.id = m.aviso_id
  left join portal.publicadores pb on pb.id = m.publicador_id
  left join lateral (select x.texto, x.lado, x.creado_en from portal.mensajes x where x.operacion_id = m.id order by x.id desc limit 1) u on true
  order by coalesce(u.creado_en, m.actualizada_en) desc
$$;

create or replace function portal.operacion_detalle(p_op uuid) returns jsonb
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare v_lados text[]; v_lado text; v_o portal.operaciones;
begin
  v_lados := portal.lados_en(p_op);
  if cardinality(v_lados) = 0 then raise exception 'No sos parte de esta operación.'; end if;
  v_lado := case when 'interesado' = any(v_lados) then 'interesado' when 'publicador' = any(v_lados) then 'publicador' else 'plataforma' end;
  select * into v_o from portal.operaciones where id = p_op;
  return jsonb_build_object(
    'operacion', to_jsonb(v_o) - 'interesado_user',
    'lado', v_lado,
    'lados', to_jsonb(v_lados),
    'aviso', (select jsonb_build_object('id', a.id, 'codigo', a.codigo, 'slug', a.slug, 'titulo', a.titulo, 'operacion', a.operacion,
        'barrio', a.barrio, 'direccion', case when v_lado <> 'interesado' or coalesce(a.mostrar_direccion, 'exacta') = 'exacta' then a.direccion end,
        'precio', a.precio, 'moneda', a.moneda, 'foto', portal.portada_de(a.id), 'estado', a.estado, 'estado_curacion', a.estado_curacion)
      from portal.avisos a where a.id = v_o.aviso_id),
    'publicador', (select jsonb_build_object('id', p.id, 'nombre', p.nombre, 'slug', p.slug, 'tipo', p.tipo, 'badge', p.badge, 'verificado', p.verificado,
        'whatsapp', case when v_lado <> 'publicador' and portal.orden_etapa(v_o.etapa) >= 2 then coalesce(p.whatsapp, p.telefono) end)
      from portal.publicadores p where p.id = v_o.publicador_id),
    'interesado', case when v_lado <> 'interesado' then portal.contacto_interesado(p_op) end,
    'hitos', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'tipo', h.tipo, 'lado', h.lado, 'datos', h.datos, 'creado_en', h.creado_en) order by h.id)
      from portal.hitos h where h.operacion_id = p_op), '[]'::jsonb),
    'visitas', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'fecha', v.fecha, 'estado', v.estado, 'nota', v.nota, 'feedback', v.feedback) order by v.fecha)
      from portal.visitas_reservas v where v.operacion_id = p_op), '[]'::jsonb),
    'documentos', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'tipo', d.tipo, 'titulo', d.titulo, 'estado', d.estado, 'creado_en', d.creado_en, 'firmado_en', d.firmado_en) order by d.creado_en)
      from portal.documentos d where d.operacion_id = p_op), '[]'::jsonb),
    'cargos', case when 'plataforma' = any(v_lados) then coalesce((select jsonb_agg(jsonb_build_object('escenario', c.escenario, 'concepto', c.concepto,
        'paga', c.paga, 'moneda', c.moneda, 'monto', c.monto, 'estado', c.estado) order by c.id) from portal.cargos c where c.operacion_id = p_op), '[]'::jsonb) end
  );
end $$;

create or replace function portal.marcar_leidos(p_op uuid) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_lados text[]; v_lado text; n integer;
begin
  v_lados := portal.lados_en(p_op);
  if cardinality(v_lados) = 0 then return 0; end if;
  v_lado := case when 'interesado' = any(v_lados) then 'interesado' when 'publicador' = any(v_lados) then 'publicador' else null end;
  if v_lado is null then return 0; end if;   -- la plataforma lee sin marcar
  update portal.mensajes set leido_en = now() where operacion_id = p_op and lado <> v_lado and leido_en is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 13. Se busca: responder propuestas y listarlas
-- ---------------------------------------------------------------------
create or replace function portal.responder_propuesta(p_id uuid, p_accion text) returns uuid
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_p portal.propuestas; v_b portal.busquedas; v_a portal.avisos; v_op uuid;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into v_p from portal.propuestas where id = p_id for update;
  if v_p.id is null then raise exception 'La propuesta no existe.'; end if;
  if v_p.estado <> 'enviada' then raise exception 'La propuesta ya fue respondida.'; end if;
  select * into v_b from portal.busquedas where id = v_p.busqueda_id;
  if p_accion = 'retirar' then
    if not portal.soy_publicador(v_p.publicador_id) then raise exception 'No es tu propuesta.'; end if;
    update portal.propuestas set estado = 'retirada', respondida_en = now() where id = p_id;
    return null;
  end if;
  if v_b.usuario is distinct from auth.uid() then raise exception 'Solo quien busca responde la propuesta.'; end if;
  if p_accion = 'rechazar' then
    update portal.propuestas set estado = 'rechazada', respondida_en = now() where id = p_id;
    return null;
  end if;
  if p_accion <> 'aceptar' then raise exception 'Acción desconocida.'; end if;
  select * into v_a from portal.avisos where id = v_p.aviso_id;
  -- Si ya hay una conversación abierta por esa misma unidad, la propuesta se suma a esa operación
  select id into v_op from portal.operaciones
   where aviso_id = v_a.id and interesado_user = auth.uid() and etapa not in ('cerrada','caida') limit 1;
  if v_op is null then
    insert into portal.operaciones (aviso_id, publicador_id, tipo, moneda, precio_publicado, linea, etapa, interesado_user, busqueda_id, origen)
    values (v_a.id, v_p.publicador_id, coalesce(v_a.operacion, v_b.operacion),
            coalesce(case when v_a.moneda in ('USD','ARS') then v_a.moneda end, v_b.moneda), v_a.precio,
            coalesce(portal.linea_de(v_a.operacion, v_a.etapa), v_b.linea), 'consulta', auth.uid(), v_b.id, 'se_busca')
    returning id into v_op;
  else
    update portal.operaciones set busqueda_id = coalesce(busqueda_id, v_b.id) where id = v_op;
  end if;
  update portal.propuestas set estado = 'aceptada', respondida_en = now(), operacion_id = v_op where id = p_id;
  perform portal._hito(v_op, 'propuesta_aceptada', 'interesado', jsonb_build_object('propuesta_id', p_id, 'busqueda_id', v_b.id));
  if coalesce(btrim(v_p.mensaje), '') <> '' then
    insert into portal.mensajes (operacion_id, lado, autor, texto) values (v_op, 'publicador', v_p.autor, btrim(v_p.mensaje));
  end if;
  return v_op;
end $$;

-- Las propuestas que recibió quien busca, con la unidad y quien la propone (lo público)
create or replace function portal.propuestas_recibidas()
returns table (id uuid, busqueda_id uuid, estado text, mensaje text, creado_en timestamptz, operacion_id uuid,
  aviso_id uuid, aviso_codigo text, aviso_titulo text, aviso_barrio text, aviso_precio numeric, aviso_moneda text, foto text,
  publicador_id uuid, publicador_nombre text, publicador_tipo text, publicador_verificado boolean)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select p.id, p.busqueda_id, p.estado, p.mensaje, p.creado_en, p.operacion_id,
    a.id, a.codigo, a.titulo, a.barrio, a.precio, a.moneda, portal.portada_de(a.id),
    pb.id, pb.nombre, pb.tipo, pb.verificado
  from portal.propuestas p
  join portal.busquedas b on b.id = p.busqueda_id and b.usuario = auth.uid()
  left join portal.avisos a on a.id = p.aviso_id and a.estado_curacion = 'publicado'
  left join portal.publicadores pb on pb.id = p.publicador_id
  where auth.uid() is not null and p.estado <> 'retirada'
  order by p.creado_en desc
  limit 300
$$;

-- Las propuestas que mandó el publicador de la sesión, con lo público de la búsqueda
create or replace function portal.mis_propuestas()
returns table (id uuid, busqueda_id uuid, estado text, mensaje text, creado_en timestamptz, respondida_en timestamptz,
  operacion_id uuid, aviso_id uuid, aviso_titulo text, busqueda jsonb)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select p.id, p.busqueda_id, p.estado, p.mensaje, p.creado_en, p.respondida_en, p.operacion_id, p.aviso_id, a.titulo,
    jsonb_build_object('perfil', b.perfil, 'operacion', b.operacion, 'linea', b.linea, 'tipo', b.tipo, 'zonas', b.zonas,
      'ambientes_min', b.ambientes_min, 'dormitorios_min', b.dormitorios_min, 'precio_max', b.precio_max, 'moneda', b.moneda,
      'verificada', b.verificada, 'estado', b.estado)
  from portal.propuestas p
  join portal.busquedas b on b.id = p.busqueda_id
  left join portal.avisos a on a.id = p.aviso_id
  where portal.soy_publicador(p.publicador_id)
  order by p.creado_en desc
  limit 300
$$;

-- ---------------------------------------------------------------------
-- 14. Motor de cobro
-- ---------------------------------------------------------------------
create or replace function portal._aplicar_reglas(p_hito bigint, p_escenario text default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare h portal.hitos; o portal.operaciones; r portal.reglas_cobro; v_base numeric; v_monto numeric; v_mon text; n integer := 0;
begin
  select * into h from portal.hitos where id = p_hito;
  if h.id is null then return 0; end if;
  select * into o from portal.operaciones where id = h.operacion_id;
  for r in
    select * from portal.reglas_cobro x
     where x.activa and x.evento = h.tipo and (x.linea = 'todas' or x.linea = o.linea)
       and (p_escenario is null or x.escenario = p_escenario)
  loop
    if r.modo = 'fijo' then
      v_base := null; v_monto := r.valor; v_mon := r.moneda;
    else
      v_base := case r.base
        when 'precio_publicado' then o.precio_publicado
        when 'precio_cierre'    then coalesce(o.precio_cierre, o.precio_publicado)
        when 'monto_contrato'   then coalesce(o.monto_contrato, o.precio_cierre)
        when 'monto_hito'       then nullif(h.datos ->> 'monto', '')::numeric
      end;
      continue when v_base is null or v_base <= 0;
      v_mon := case when r.base = 'monto_hito' and h.datos ->> 'moneda' in ('USD','ARS') then h.datos ->> 'moneda' else o.moneda end;
      v_monto := round(v_base * r.valor / 100, 2);
      if v_mon = r.moneda then
        if r.minimo is not null and v_monto < r.minimo then v_monto := r.minimo; end if;
        if r.maximo is not null and v_monto > r.maximo then v_monto := r.maximo; end if;
      end if;
    end if;
    insert into portal.cargos (operacion_id, hito_id, regla_id, escenario, publicador_id, paga, concepto, linea, base_monto, moneda, monto, estado)
    values (o.id, h.id, r.id, r.escenario, o.publicador_id, r.paga, coalesce(nullif(btrim(r.concepto), ''), r.evento), o.linea,
            v_base, v_mon, v_monto, case when r.cobra then 'pendiente' else 'simulado' end)
    on conflict (hito_id, regla_id) do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Cada hito nuevo pasa por las reglas. Si el motor falla, el paso igual queda registrado.
create or replace function portal.trg_hito_cobros() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  begin
    perform portal._aplicar_reglas(new.id, null);
  exception when others then
    raise warning 'motor de cobro: %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists trg_hito_cobros on portal.hitos;
create trigger trg_hito_cobros after insert on portal.hitos for each row execute function portal.trg_hito_cobros();

-- Vuelve a calcular lo SIMULADO de un escenario (o de todos) con las reglas de hoy, sobre todos los hitos registrados:
-- "¿cuánto habríamos facturado con este esquema?". Lo pendiente, facturado o cobrado no se toca.
create or replace function portal.recalcular_cargos(p_escenario text default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare h record; n integer := 0;
begin
  if not (portal.es_curador() or portal.es_plataforma()) then raise exception 'Solo la plataforma recalcula.'; end if;
  delete from portal.cargos where estado = 'simulado' and (p_escenario is null or escenario = p_escenario);
  for h in select id from portal.hitos order by id loop
    n := n + portal._aplicar_reglas(h.id, p_escenario);
  end loop;
  return n;
end $$;

create or replace function portal.resumen_cobros()
returns table (escenario text, linea text, paga text, estado text, moneda text, cantidad integer, total numeric)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select c.escenario, coalesce(c.linea, '—'), c.paga, c.estado, c.moneda, count(*)::integer, sum(c.monto)
  from portal.cargos c
  where portal.es_curador() or portal.es_plataforma()
  group by 1, 2, 3, 4, 5
  order by 1, 2, 3, 4, 5
$$;

-- ---------------------------------------------------------------------
-- 15. Triggers de cuidado
-- ---------------------------------------------------------------------
-- Mensajes: la operación se mueve y, cuando hablaron las dos partes, queda el hito "conversación"
create or replace function portal.trg_mensaje() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  update portal.operaciones set actualizada_en = now() where id = new.operacion_id;
  if new.lado in ('interesado','publicador')
     and not exists (select 1 from portal.hitos h where h.operacion_id = new.operacion_id and h.tipo = 'conversacion')
     and exists (select 1 from portal.mensajes m where m.operacion_id = new.operacion_id and m.lado in ('interesado','publicador') and m.lado <> new.lado) then
    perform portal._hito(new.operacion_id, 'conversacion', new.lado, null);
  end if;
  return null;
end $$;
drop trigger if exists trg_mensaje on portal.mensajes;
create trigger trg_mensaje after insert on portal.mensajes for each row execute function portal.trg_mensaje();

-- Búsquedas: la marca "verificada" la pone solo la plataforma; sin datos de contacto en el texto; hasta 5 activas
create or replace function portal.trg_busqueda() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_plat boolean := portal.es_curador() or portal.es_plataforma();
begin
  new.linea := case when new.operacion = 'venta' and new.linea = 'pozo' then 'pozo' else portal.linea_de(new.operacion, null, new.plazo_meses) end;
  new.actualizado_en := now();
  if auth.uid() is null then return new; end if;   -- clave de servicio o SQL Editor
  if tg_op = 'INSERT' then
    new.usuario := auth.uid();
    if not v_plat then new.verificada := false; end if;
    if (select count(*) from portal.busquedas b where b.usuario = auth.uid() and b.estado = 'activa') >= 5 then
      raise exception 'Podés tener hasta 5 búsquedas activas.';
    end if;
  else
    new.usuario := old.usuario;
    if not v_plat then new.verificada := old.verificada; end if;
  end if;
  if new.detalle is not null and (new.detalle ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' or new.detalle ~ '(\d[\s.()-]*){10,}' or new.detalle ~* '(wa\.me|whatsapp|instagram\.com|t\.me/)') then
    raise exception 'Sin datos de contacto en el texto: quien busca se da a conocer cuando acepta una propuesta.';
  end if;
  return new;
end $$;
drop trigger if exists trg_busqueda on portal.busquedas;
create trigger trg_busqueda before insert or update on portal.busquedas for each row execute function portal.trg_busqueda();

-- Propuestas: solo a búsquedas activas ajenas, con una unidad publicada propia, hasta 3 por búsqueda y publicador
create or replace function portal.trg_propuesta() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_b portal.busquedas;
begin
  if auth.uid() is null then return new; end if;
  new.autor := auth.uid(); new.estado := 'enviada'; new.operacion_id := null; new.respondida_en := null;
  select * into v_b from portal.busquedas where id = new.busqueda_id;
  if v_b.id is null or v_b.estado <> 'activa' or v_b.vence_en <= now() then raise exception 'Esta búsqueda ya no está activa.'; end if;
  if v_b.usuario = auth.uid() then raise exception 'Es una búsqueda tuya.'; end if;
  if new.aviso_id is null or not exists (select 1 from portal.avisos a where a.id = new.aviso_id and a.publicador_id = new.publicador_id and a.estado_curacion = 'publicado') then
    raise exception 'Elegí una de tus propiedades publicadas.';
  end if;
  if (select count(*) from portal.propuestas p where p.busqueda_id = new.busqueda_id and p.publicador_id = new.publicador_id) >= 3 then
    raise exception 'Ya le propusiste 3 unidades a esta búsqueda.';
  end if;
  return new;
end $$;
drop trigger if exists trg_propuesta on portal.propuestas;
create trigger trg_propuesta before insert on portal.propuestas for each row execute function portal.trg_propuesta();

-- Publicaciones: entran en revisión; las publica la curación; si el publicador edita una publicada, vuelve a revisión
create or replace function portal.trg_publicacion() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_cura boolean := portal.es_curador() or portal.es_plataforma('cura');
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.autor := auth.uid();
    if not v_cura then new.estado := 'en_revision'; new.publicado_en := null; new.motivo := null; end if;
  elsif not v_cura then
    new.publicador_id := old.publicador_id;
    if new.estado not in ('retirada', old.estado) then new.estado := old.estado; end if;
    if new.estado <> 'retirada' and (new.titulo, new.texto, new.imagen_url, new.entrega, new.tipo, new.aviso_id)
       is distinct from (old.titulo, old.texto, old.imagen_url, old.entrega, old.tipo, old.aviso_id) then
      new.estado := 'en_revision'; new.publicado_en := null;
    end if;
  end if;
  if new.estado = 'publicada' and new.publicado_en is null then new.publicado_en := now(); end if;
  if new.aviso_id is not null and not exists (select 1 from portal.avisos a where a.id = new.aviso_id and a.publicador_id = new.publicador_id) then
    raise exception 'La propiedad no es de este publicador.';
  end if;
  return new;
end $$;
drop trigger if exists trg_publicacion on portal.publicaciones;
create trigger trg_publicacion before insert or update on portal.publicaciones for each row execute function portal.trg_publicacion();

create or replace function portal.trg_regla() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  new.actualizado_en := now();
  new.actualizado_por := coalesce(auth.jwt() ->> 'email', new.actualizado_por, 'sistema');
  return new;
end $$;
drop trigger if exists trg_regla on portal.reglas_cobro;
create trigger trg_regla before insert or update on portal.reglas_cobro for each row execute function portal.trg_regla();

-- ---------------------------------------------------------------------
-- 16. Vistas: Se busca (sin quién) y el feed de Explorar
-- ---------------------------------------------------------------------
create or replace view portal.busquedas_publicas as
  select b.id, b.perfil, b.operacion, b.linea, b.tipo, b.zonas, b.ambientes_min, b.dormitorios_min, b.m2_min,
    b.precio_max, b.moneda, b.desde, b.plazo_meses, b.detalle, b.verificada, b.creado_en, b.vence_en,
    (select count(*)::integer from portal.propuestas p where p.busqueda_id = b.id and p.estado <> 'retirada') as propuestas
  from portal.busquedas b
  where b.estado = 'activa' and b.vence_en > now();

create or replace view portal.novedades as
  select 'nuevo'::text as tipo, a.id as aviso_id, null::uuid as publicacion_id, a.publicado_en as fecha,
    null::numeric as anterior, a.precio, a.moneda, null::text as titulo, null::text as texto, null::date as entrega, a.publicador_id
  from portal.avisos a
  where a.estado_curacion = 'publicado' and a.publicado_en > now() - interval '45 days'
  union all
  select 'baja_precio', ph.aviso_id, null, ph.registrado_en, ph.anterior, ph.precio, ph.moneda, null, null, null, a.publicador_id
  from portal.precios_historial ph
  join portal.avisos a on a.id = ph.aviso_id and a.estado_curacion = 'publicado'
  where ph.anterior is not null and ph.precio < ph.anterior and ph.registrado_en > now() - interval '45 days'
  union all
  select p.tipo, p.aviso_id, p.id, p.publicado_en, null, null, null, p.titulo, p.texto, p.entrega, p.publicador_id
  from portal.publicaciones p
  where p.estado = 'publicada';

-- ---------------------------------------------------------------------
-- 17. Políticas (RLS)
-- ---------------------------------------------------------------------
drop policy if exists "operaciones del interesado" on portal.operaciones;
create policy "operaciones del interesado" on portal.operaciones for select using (interesado_user = auth.uid());
-- La política de la migración 01 cubre al equipo (membresías); esta cubre al titular de la cuenta del publicador
drop policy if exists "operaciones del publicador" on portal.operaciones;
create policy "operaciones del publicador" on portal.operaciones for select using (portal.soy_publicador(publicador_id));

-- Arreglo de paso (8/10): la política "visitas las ve el propietario" leía avisos.propietario_email, una columna que la
-- migración 23 cerró para las sesiones. Resultado: CUALQUIER sesión que leía portal.visitas_reservas recibía
-- "permission denied for table avisos" (las visitas del panel no cargaban). Misma regla, por una función.
create or replace function portal.es_propietario_de(p_aviso uuid) returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select exists (select 1 from portal.avisos a where a.id = p_aviso and a.propietario_email is not null
    and lower(a.propietario_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
drop policy if exists "visitas las ve el propietario" on portal.visitas_reservas;
create policy "visitas las ve el propietario" on portal.visitas_reservas for select using (portal.es_propietario_de(aviso_id));

drop policy if exists "hitos de las partes" on portal.hitos;
create policy "hitos de las partes" on portal.hitos for select using (portal.es_parte(operacion_id));

drop policy if exists "mensajes de las partes" on portal.mensajes;
create policy "mensajes de las partes" on portal.mensajes for select using (portal.es_parte(operacion_id));
drop policy if exists "mensajes las partes escriben" on portal.mensajes;
create policy "mensajes las partes escriben" on portal.mensajes for insert
  with check (autor = auth.uid() and lado = any(portal.lados_en(operacion_id)));

drop policy if exists "busquedas propias" on portal.busquedas;
create policy "busquedas propias" on portal.busquedas for all
  using (usuario = auth.uid()) with check (usuario = auth.uid());
drop policy if exists "busquedas la plataforma" on portal.busquedas;
create policy "busquedas la plataforma" on portal.busquedas for select using (portal.es_curador() or portal.es_plataforma());
drop policy if exists "busquedas la plataforma verifica" on portal.busquedas;
create policy "busquedas la plataforma verifica" on portal.busquedas for update
  using (portal.es_curador() or portal.es_plataforma()) with check (portal.es_curador() or portal.es_plataforma());

drop policy if exists "propuestas las ven las partes" on portal.propuestas;
create policy "propuestas las ven las partes" on portal.propuestas for select
  using (portal.soy_publicador(publicador_id) or portal.es_mi_busqueda(busqueda_id) or portal.es_curador());
drop policy if exists "propuestas las manda el publicador" on portal.propuestas;
create policy "propuestas las manda el publicador" on portal.propuestas for insert
  with check (portal.soy_publicador(publicador_id));

drop policy if exists "publicaciones publicadas" on portal.publicaciones;
create policy "publicaciones publicadas" on portal.publicaciones for select
  using (estado = 'publicada' or portal.soy_publicador(publicador_id) or portal.es_curador());
drop policy if exists "publicaciones las crea el publicador" on portal.publicaciones;
create policy "publicaciones las crea el publicador" on portal.publicaciones for insert
  with check (portal.soy_publicador(publicador_id) or portal.es_curador());
drop policy if exists "publicaciones las cambia el publicador o la curacion" on portal.publicaciones;
create policy "publicaciones las cambia el publicador o la curacion" on portal.publicaciones for update
  using (portal.soy_publicador(publicador_id) or portal.es_curador())
  with check (portal.soy_publicador(publicador_id) or portal.es_curador());

drop policy if exists "documentos de las partes" on portal.documentos;
create policy "documentos de las partes" on portal.documentos for select using (portal.es_parte(operacion_id));
drop policy if exists "documentos los carga el publicador" on portal.documentos;
create policy "documentos los carga el publicador" on portal.documentos for insert
  with check (portal.lados_en(operacion_id) && array['publicador','plataforma']);
drop policy if exists "documentos los cambia el publicador" on portal.documentos;
create policy "documentos los cambia el publicador" on portal.documentos for update
  using (portal.lados_en(operacion_id) && array['publicador','plataforma'])
  with check (portal.lados_en(operacion_id) && array['publicador','plataforma']);

drop policy if exists "reglas visibles" on portal.reglas_cobro;
create policy "reglas visibles" on portal.reglas_cobro for select
  using ((activa and cobra) or portal.es_curador() or portal.es_plataforma());
drop policy if exists "reglas las edita la plataforma" on portal.reglas_cobro;
create policy "reglas las edita la plataforma" on portal.reglas_cobro for all
  using (portal.es_curador() or portal.es_plataforma('soporte'))
  with check (portal.es_curador() or portal.es_plataforma('soporte'));

drop policy if exists "cargos la plataforma" on portal.cargos;
create policy "cargos la plataforma" on portal.cargos for select
  using (portal.es_curador() or portal.es_plataforma()
     or (estado <> 'simulado' and (portal.tiene_permiso('facturacion', 'ver', publicador_id) or publicador_id = portal.mi_publicador())));
drop policy if exists "cargos los marca la plataforma" on portal.cargos;
create policy "cargos los marca la plataforma" on portal.cargos for update
  using (portal.es_curador() or portal.es_plataforma('soporte'))
  with check (portal.es_curador() or portal.es_plataforma('soporte'));

-- ---------------------------------------------------------------------
-- 18. Permisos de tabla y de función
-- ---------------------------------------------------------------------
revoke all on portal.hitos, portal.mensajes, portal.busquedas, portal.propuestas, portal.documentos, portal.cargos, portal.busquedas_publicas from anon;
grant select on portal.hitos, portal.mensajes, portal.busquedas, portal.propuestas, portal.documentos, portal.cargos,
  portal.busquedas_publicas, portal.reglas_cobro, portal.publicaciones, portal.novedades to authenticated;
grant select on portal.novedades, portal.publicaciones, portal.reglas_cobro to anon;
grant insert (operacion_id, lado, texto) on portal.mensajes to authenticated;
grant insert, update, delete on portal.busquedas to authenticated;
grant insert (busqueda_id, publicador_id, aviso_id, mensaje) on portal.propuestas to authenticated;
grant insert, update on portal.publicaciones to authenticated;
grant insert, update on portal.documentos to authenticated;
grant insert, update, delete on portal.reglas_cobro to authenticated;
grant update (estado) on portal.cargos to authenticated;

-- Internas: solo las llaman otras funciones
revoke all on function portal._hito(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function portal._aplicar_reglas(bigint, text) from public, anon, authenticated;
revoke all on function portal.nombre_interesado(uuid) from public, anon, authenticated;
revoke all on function portal.contacto_interesado(uuid) from public, anon, authenticated;
revoke all on function portal.trg_hito_cobros() from public, anon, authenticated;
revoke all on function portal.trg_mensaje() from public, anon, authenticated;
revoke all on function portal.trg_busqueda() from public, anon, authenticated;
revoke all on function portal.trg_propuesta() from public, anon, authenticated;
revoke all on function portal.trg_publicacion() from public, anon, authenticated;
revoke all on function portal.trg_regla() from public, anon, authenticated;
-- Las que llama la página (con sesión)
revoke all on function portal.registrar_hito(uuid, text, jsonb), portal.abrir_operacion(uuid, text, uuid),
  portal.mis_operaciones(boolean), portal.operacion_detalle(uuid), portal.marcar_leidos(uuid),
  portal.responder_propuesta(uuid, text), portal.propuestas_recibidas(), portal.mis_propuestas(),
  portal.recalcular_cargos(text), portal.resumen_cobros() from public, anon;
grant execute on function portal.registrar_hito(uuid, text, jsonb), portal.abrir_operacion(uuid, text, uuid),
  portal.mis_operaciones(boolean), portal.operacion_detalle(uuid), portal.marcar_leidos(uuid),
  portal.responder_propuesta(uuid, text), portal.propuestas_recibidas(), portal.mis_propuestas(),
  portal.recalcular_cargos(text), portal.resumen_cobros() to authenticated;

-- ---------------------------------------------------------------------
-- 19. Dos escenarios de ejemplo, en simulación (los valores fijos son de ejemplo, a definir)
-- ---------------------------------------------------------------------
insert into portal.reglas_cobro (escenario, concepto, linea, evento, paga, modo, valor, moneda, base, nota)
select * from (values
  ('Idea original · porcentaje', 'Porcentaje de la operación', 'temporario', 'cierre', 'publicador', 'porcentaje', 0.5, 'USD', 'monto_contrato', 'Idea de Tomás (8/10). Legal sin matrícula solo en temporario de hasta 3 meses.'),
  ('Idea original · porcentaje', 'Porcentaje de la operación', 'mediano', 'cierre', 'publicador', 'porcentaje', 0.5, 'USD', 'monto_contrato', 'Requiere corredor: más de 3 meses es corretaje (Ley 2340).'),
  ('Idea original · porcentaje', 'Porcentaje de la operación', 'tradicional', 'cierre', 'publicador', 'porcentaje', 1, 'USD', 'monto_contrato', 'Requiere corredor (Ley 2340).'),
  ('Idea original · porcentaje', 'Porcentaje de la operación', 'venta', 'cierre', 'publicador', 'porcentaje', 1.5, 'USD', 'precio_cierre', 'Requiere corredor (Ley 2340).'),
  ('Idea original · porcentaje', 'Porcentaje de la operación', 'pozo', 'cierre', 'publicador', 'porcentaje', 3, 'USD', 'precio_cierre', 'Requiere corredor (Ley 2340).'),
  ('Sin matrícula · sección 12', 'Comisión de plataforma (temporario)', 'temporario', 'cierre', 'publicador', 'porcentaje', 3, 'USD', 'monto_contrato', 'Hasta 3 meses es turismo (Ley 6255): porcentaje posible. Inscribir a BAIREN ante ENTUR.'),
  ('Sin matrícula · sección 12', 'Administración mensual', 'mediano', 'cobro_mensual', 'propietario', 'porcentaje', 5, 'USD', 'monto_hito', 'Valor de ejemplo. Lo paga el propietario; nunca el inquilino (Ley 5859).'),
  ('Sin matrícula · sección 12', 'Administración mensual', 'tradicional', 'cobro_mensual', 'propietario', 'porcentaje', 5, 'USD', 'monto_hito', 'Valor de ejemplo. Lo paga el propietario; nunca el inquilino (Ley 5859).'),
  ('Sin matrícula · sección 12', 'Contrato digital', 'mediano', 'contrato_generado', 'publicador', 'fijo', 40, 'USD', null, 'Valor de ejemplo. Precio fijo, igual para cualquier unidad.'),
  ('Sin matrícula · sección 12', 'Contrato digital', 'tradicional', 'contrato_generado', 'publicador', 'fijo', 40, 'USD', null, 'Valor de ejemplo. Precio fijo, igual para cualquier unidad.'),
  ('Sin matrícula · sección 12', 'Visita coordinada', 'venta', 'visita_confirmada', 'publicador', 'fijo', 20, 'USD', null, 'Valor de ejemplo. Se cobra se cierre o no.'),
  ('Sin matrícula · sección 12', 'Visita coordinada', 'pozo', 'visita_confirmada', 'publicador', 'fijo', 20, 'USD', null, 'Valor de ejemplo. Se cobra se cierre o no.'),
  ('Sin matrícula · sección 12', 'Propuesta aceptada en Se busca', 'todas', 'propuesta_aceptada', 'publicador', 'fijo', 25, 'USD', null, 'Valor de ejemplo. Se cobra al aceptar el contacto, no al cerrar.')
) as v(escenario, concepto, linea, evento, paga, modo, valor, moneda, base, nota)
where not exists (select 1 from portal.reglas_cobro);

notify pgrst, 'reload schema';

-- Controles
select 'tablas nuevas' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal'
     and table_name in ('hitos','mensajes','busquedas','propuestas','publicaciones','documentos','reglas_cobro','cargos')) = 8 as ok
union all select 'columnas de operaciones', (select count(*) from information_schema.columns where table_schema = 'portal' and table_name = 'operaciones'
     and column_name in ('linea','etapa','interesado_user','origen','monto_contrato')) = 5
union all select 'reglas en simulación', not exists (select 1 from portal.reglas_cobro where cobra);
