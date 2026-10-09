-- =====================================================================
-- BAIREN · Portal · Migración 31 · Rieles: reservas y cobranza
--
-- 9/10/2026. Regla de oro: LA PLATA NUNCA PASA POR UNA CUENTA DE BAIREN. La seña y cada cuota del alquiler van directo
-- a la cuenta de quien publica (transferencia a su alias o CBU, o Mercado Pago con el split: el cobro se acredita al
-- vendedor y BAIREN solo podría tomar una tarifa aparte, hoy 0). BAIREN registra el paso y su motor de cobro lo pasa
-- por las reglas del escenario "Rieles · octubre 2026" (migración 28), todo en simulación:
--   · reserva_pagada → "Reserva online", USD 80 fijos, paga quien publica (línea mediano);
--   · pago_recibido  → "Cobranza digital", 2 % de lo cobrado, paga el propietario (mediano y largo plazo).
-- Al inquilino de vivienda no se le cobra nada (Ley 5859): la restricción m28_regla_inquilino lo impide en las reglas.
--
-- Qué agrega (nada se borra):
--   1. portal.cuentas_cobro: dónde cobra cada publicador. Manual (titular, alias, CBU o CVU) o Mercado Pago (user id del
--      vendedor). Los datos de la cuenta los ven solo las partes de una operación, y quien busca solo cuando tiene algo
--      para pagar (una seña pedida o una cuota pendiente).
--   2. portal.mp_credenciales: el token OAuth de cada vendedor de Mercado Pago. Sin políticas ni permisos: solo la clave
--      de servicio (api/portal-pago.js y api/portal-mp-webhook.js).
--   3. portal.reservas: la seña de una operación (pedida, pagada, vencida, devuelta o cancelada).
--   4. portal.pagos: una fila por cuota (alquiler, depósito o expensas), con su número de recibo correlativo por
--      publicador (portal.recibos_numeracion).
--   5. Funciones: pedir_reserva, confirmar_reserva, devolver_reserva, cancelar_reserva, vencer_reservas (cron),
--      armar_cuotas, registrar_pago, anular_pago, guardar_cuenta_cobro y las lecturas pagos_de_operacion, mis_pagos,
--      cobranza y recibo. Todas validan el lado con portal.lados_en o portal.soy_publicador.
--   6. Identidad: si existe portal.personas.identidad_estado (la agrega el módulo de identidad), reservar exige
--      'verificada'. Se resuelve en cada llamada; sin esa columna no se exige.
--
-- Permisos: RLS en todas las tablas nuevas; se leen por las partes y se escriben solo por las funciones. El webhook de
-- Mercado Pago y el cron llaman con la clave de servicio (lado 'sistema'). Vuelta atrás: migracion-31-pagos-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cuentas de cobro y credenciales de Mercado Pago
-- ---------------------------------------------------------------------
create table if not exists portal.cuentas_cobro (
  id              uuid primary key default gen_random_uuid(),
  publicador_id   uuid not null references portal.publicadores(id) on delete cascade,
  proveedor       text not null default 'manual',
  titular         text,
  alias           text,
  cbu             text,
  nota            text,
  mp_user_id      text,
  estado          text not null default 'activa',
  creado_por      uuid default auth.uid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint m31_cc_proveedor check (proveedor in ('manual','mercadopago')),
  constraint m31_cc_estado check (estado in ('pendiente','activa','pausada')),
  constraint m31_cc_unica unique (publicador_id, proveedor),
  constraint m31_cc_textos check (char_length(coalesce(titular, '')) <= 120 and char_length(coalesce(alias, '')) <= 20
    and char_length(coalesce(nota, '')) <= 300 and char_length(coalesce(mp_user_id, '')) <= 40),
  constraint m31_cc_cbu check (cbu is null or cbu ~ '^[0-9]{22}$'),
  constraint m31_cc_manual check (proveedor <> 'manual' or (titular is not null and (alias is not null or cbu is not null))),
  constraint m31_cc_mp check (proveedor <> 'mercadopago' or estado <> 'activa' or mp_user_id is not null)
);
alter table portal.cuentas_cobro enable row level security;

-- El token del vendedor (OAuth de Mercado Pago). Nadie lo lee desde el navegador: ni políticas ni permisos.
create table if not exists portal.mp_credenciales (
  publicador_id   uuid primary key references portal.publicadores(id) on delete cascade,
  mp_user_id      text not null,
  access_token    text not null,
  refresh_token   text,
  vence_en        timestamptz,
  actualizado_en  timestamptz not null default now()
);
alter table portal.mp_credenciales enable row level security;

-- Último número de recibo de cada publicador (correlativo, sin huecos por concurrencia)
create table if not exists portal.recibos_numeracion (
  publicador_id  uuid primary key references portal.publicadores(id) on delete cascade,
  ultimo         integer not null default 0
);
alter table portal.recibos_numeracion enable row level security;

-- ---------------------------------------------------------------------
-- 2. Reservas (la seña)
-- ---------------------------------------------------------------------
create table if not exists portal.reservas (
  id             uuid primary key default gen_random_uuid(),
  operacion_id   uuid not null references portal.operaciones(id) on delete cascade,
  publicador_id  uuid not null references portal.publicadores(id) on delete cascade,
  monto          numeric(14,2) not null,
  moneda         text not null,
  vence_en       timestamptz not null,
  estado         text not null default 'pedida',
  proveedor      text not null default 'manual',
  referencia     text,
  motivo         text,
  pedida_por     uuid,
  pedida_en      timestamptz not null default now(),
  pagada_en      timestamptz,
  vencida_en     timestamptz,
  devuelta_en    timestamptz,
  cancelada_en   timestamptz,
  constraint m31_res_monto check (monto > 0 and monto < 1000000000),
  constraint m31_res_moneda check (moneda in ('USD','ARS')),
  constraint m31_res_estado check (estado in ('pedida','pagada','vencida','devuelta','cancelada')),
  constraint m31_res_proveedor check (proveedor in ('manual','mercadopago')),
  constraint m31_res_textos check (char_length(coalesce(referencia, '')) <= 120 and char_length(coalesce(motivo, '')) <= 300)
);
create index if not exists reservas_op_idx on portal.reservas (operacion_id, pedida_en desc);
create index if not exists reservas_pub_idx on portal.reservas (publicador_id, estado);
create index if not exists reservas_vence_idx on portal.reservas (vence_en) where estado = 'pedida';
-- Una sola reserva en curso (pedida o pagada) por operación
create unique index if not exists reservas_en_curso_uniq on portal.reservas (operacion_id) where estado in ('pedida','pagada');
alter table portal.reservas enable row level security;

-- ---------------------------------------------------------------------
-- 3. Pagos: una fila por cuota
-- ---------------------------------------------------------------------
create table if not exists portal.pagos (
  id             uuid primary key default gen_random_uuid(),
  operacion_id   uuid not null references portal.operaciones(id) on delete cascade,
  publicador_id  uuid not null references portal.publicadores(id) on delete cascade,
  concepto       text not null default 'alquiler',
  periodo        text not null,
  monto          numeric(14,2) not null,
  moneda         text not null,
  vencimiento    date not null,
  estado         text not null default 'pendiente',
  proveedor      text,
  referencia     text,
  pagado_en      timestamptz,
  recibo         integer,
  creado_por     uuid,
  creado_en      timestamptz not null default now(),
  constraint m31_pago_concepto check (concepto in ('alquiler','deposito','expensas')),
  constraint m31_pago_periodo check (periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint m31_pago_monto check (monto > 0 and monto < 1000000000),
  constraint m31_pago_moneda check (moneda in ('USD','ARS')),
  constraint m31_pago_estado check (estado in ('pendiente','pagado','vencido','anulado')),
  constraint m31_pago_proveedor check (proveedor is null or proveedor in ('manual','mercadopago')),
  constraint m31_pago_ref check (char_length(coalesce(referencia, '')) <= 120),
  constraint m31_pago_recibo check ((estado = 'pagado') = (recibo is not null and pagado_en is not null)),
  constraint m31_pago_recibo_unico unique (publicador_id, recibo)
);
create index if not exists pagos_op_idx on portal.pagos (operacion_id, vencimiento);
create index if not exists pagos_pub_idx on portal.pagos (publicador_id, periodo);
create index if not exists pagos_pendientes_idx on portal.pagos (vencimiento) where estado = 'pendiente';
-- Una cuota por concepto y mes en cada operación (las anuladas no cuentan)
create unique index if not exists pagos_cuota_uniq on portal.pagos (operacion_id, concepto, periodo) where estado <> 'anulado';
alter table portal.pagos enable row level security;

-- ---------------------------------------------------------------------
-- 4. Ayudas internas
-- ---------------------------------------------------------------------
-- La llamada viene con la clave de servicio (webhook de Mercado Pago, cron)
create or replace function portal._es_servicio() returns boolean
language sql stable as $$
  select coalesce(auth.role(), '') = 'service_role'
$$;

-- ¿El módulo de identidad ya está? (columna portal.personas.identidad_estado)
create or replace function portal._identidad_requerida() returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select exists (select 1 from pg_attribute where attrelid = 'portal.personas'::regclass and attname = 'identidad_estado' and not attisdropped)
$$;

-- Sin módulo de identidad no se exige; con módulo, la persona de la cuenta tiene que estar 'verificada'
create or replace function portal._identidad_ok(p_uid uuid) returns boolean
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare v boolean;
begin
  if not portal._identidad_requerida() then return true; end if;
  if p_uid is null then return false; end if;
  execute 'select exists (select 1 from portal.personas where auth_user_id = $1 and identidad_estado = ''verificada'')' into v using p_uid;
  return coalesce(v, false);
end $$;

-- Vence las señas pedidas que pasaron su plazo (paso reserva_vencida, lado sistema) y marca las cuotas atrasadas.
-- p_op: solo esa operación; null: todas (cron).
create or replace function portal._vencer_reservas(p_op uuid default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare r record; n integer := 0;
begin
  for r in
    select id, operacion_id from portal.reservas
     where estado = 'pedida' and vence_en <= now() and (p_op is null or operacion_id = p_op)
     order by vence_en
     for update skip locked
  loop
    update portal.reservas set estado = 'vencida', vencida_en = now() where id = r.id;
    perform portal._hito(r.operacion_id, 'reserva_vencida', 'sistema', jsonb_build_object('reserva_id', r.id));
    n := n + 1;
  end loop;
  update portal.pagos set estado = 'vencido'
   where estado = 'pendiente' and vencimiento < (now() at time zone 'America/Argentina/Buenos_Aires')::date
     and (p_op is null or operacion_id = p_op);
  return n;
end $$;

-- Una reserva y una cuota, como las leen las páginas
create or replace function portal._reserva_json(r portal.reservas) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', r.id, 'monto', r.monto, 'moneda', r.moneda, 'vence_en', r.vence_en, 'estado', r.estado,
    'proveedor', r.proveedor, 'referencia', r.referencia, 'motivo', r.motivo, 'pedida_en', r.pedida_en, 'pagada_en', r.pagada_en,
    'vencida_en', r.vencida_en, 'devuelta_en', r.devuelta_en, 'cancelada_en', r.cancelada_en)
$$;
create or replace function portal._pago_json(p portal.pagos) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', p.id, 'concepto', p.concepto, 'periodo', p.periodo, 'monto', p.monto, 'moneda', p.moneda,
    'vencimiento', p.vencimiento, 'estado', p.estado, 'proveedor', p.proveedor, 'referencia', p.referencia,
    'pagado_en', p.pagado_en, 'recibo', p.recibo)
$$;

-- ---------------------------------------------------------------------
-- 5. Cuenta de cobro (la carga quien publica)
-- ---------------------------------------------------------------------
create or replace function portal.guardar_cuenta_cobro(p_pub uuid, p_titular text, p_alias text default null, p_cbu text default null, p_nota text default null) returns uuid
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_tit text := nullif(btrim(coalesce(p_titular, '')), ''); v_alias text := nullif(lower(btrim(coalesce(p_alias, ''))), '');
        v_cbu text := nullif(regexp_replace(coalesce(p_cbu, ''), '[^0-9]', '', 'g'), ''); v_nota text := nullif(btrim(coalesce(p_nota, '')), ''); v_id uuid;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  if p_pub is null or not portal.soy_publicador(p_pub) then raise exception 'Solo quien publica carga su cuenta de cobro.'; end if;
  if v_tit is null or char_length(v_tit) < 2 or char_length(v_tit) > 120 then raise exception 'Poné el titular de la cuenta.'; end if;
  if v_alias is null and v_cbu is null then raise exception 'Poné el alias o el CBU.'; end if;
  if v_alias is not null and v_alias !~ '^[a-z0-9.-]{6,20}$' then raise exception 'Revisá el alias: de 6 a 20 letras, números, puntos o guiones.'; end if;
  if v_cbu is not null and char_length(v_cbu) <> 22 then raise exception 'Revisá el CBU o CVU: son 22 números.'; end if;
  if v_nota is not null and char_length(v_nota) > 300 then raise exception 'La nota es muy larga.'; end if;
  insert into portal.cuentas_cobro (publicador_id, proveedor, titular, alias, cbu, nota, estado, creado_por)
  values (p_pub, 'manual', v_tit, v_alias, v_cbu, v_nota, 'activa', auth.uid())
  on conflict (publicador_id, proveedor) do update
    set titular = excluded.titular, alias = excluded.alias, cbu = excluded.cbu, nota = excluded.nota, estado = 'activa', actualizado_en = now()
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 6. Reservas: pedir, confirmar, devolver, cancelar y vencer
-- ---------------------------------------------------------------------
-- Quien busca pide reservar (después de "Quiero avanzar" o de "Solicitud aceptada"). La seña se paga a quien publica.
create or replace function portal.pedir_reserva(p_op uuid, p_monto numeric, p_moneda text default null, p_horas integer default 48) returns uuid
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_op portal.operaciones; v_ult text; v_mon text; v_h integer := coalesce(p_horas, 48); v_vence timestamptz; v_prov text; v_id uuid; v_monto numeric := round(p_monto, 2);
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  if not ('interesado' = any(portal.lados_en(p_op))) then raise exception 'Solo quien busca pide la reserva.'; end if;
  select * into v_op from portal.operaciones where id = p_op for update;
  if v_op.etapa in ('caida','cerrada') then raise exception 'La operación está cerrada.'; end if;
  if portal.orden_etapa(v_op.etapa) >= 6 then raise exception 'La operación ya pasó la reserva.'; end if;
  select tipo into v_ult from portal.hitos
   where operacion_id = p_op and tipo in ('solicitud_enviada','solicitud_aceptada','solicitud_rechazada') order by id desc limit 1;
  if v_ult is null then raise exception 'Primero avisá que querés avanzar.'; end if;
  if v_ult = 'solicitud_rechazada' then raise exception 'La solicitud fue rechazada.'; end if;
  if not portal._identidad_ok(auth.uid()) then raise exception 'Para reservar, primero verificá tu identidad.'; end if;
  if v_monto is null or v_monto <= 0 or v_monto >= 1000000000 then raise exception 'Revisá el monto de la seña.'; end if;
  v_mon := coalesce(nullif(btrim(coalesce(p_moneda, '')), ''), v_op.moneda, 'USD');
  if v_mon not in ('USD','ARS') then raise exception 'La moneda es USD o ARS.'; end if;
  if v_h < 1 or v_h > 168 then raise exception 'El plazo para pagar la seña va de 1 a 168 horas.'; end if;
  perform portal._vencer_reservas(p_op);
  if exists (select 1 from portal.reservas where operacion_id = p_op and estado in ('pedida','pagada')) then
    raise exception 'Ya hay una reserva en curso para esta operación.';
  end if;
  if (select count(*) from portal.reservas where pedida_por = auth.uid() and pedida_en > now() - interval '1 day') >= 10 then
    raise exception 'Pediste muchas reservas hoy. Probá de nuevo mañana.';
  end if;
  v_vence := now() + make_interval(hours => v_h);
  v_prov := case when exists (select 1 from portal.cuentas_cobro c where c.publicador_id = v_op.publicador_id and c.proveedor = 'mercadopago' and c.estado = 'activa')
                 then 'mercadopago' else 'manual' end;
  insert into portal.reservas (operacion_id, publicador_id, monto, moneda, vence_en, proveedor, pedida_por)
  values (p_op, v_op.publicador_id, v_monto, v_mon, v_vence, v_prov, auth.uid())
  returning id into v_id;
  perform portal._hito(p_op, 'reserva_pedida', 'interesado', jsonb_build_object('reserva_id', v_id, 'monto', v_monto, 'moneda', v_mon, 'vence_en', v_vence));
  return v_id;
end $$;

-- Quien publica confirma que la seña llegó a SU cuenta (o el webhook de Mercado Pago, con la clave de servicio).
-- Registra reserva_pagada: la operación pasa a la etapa reserva y corre la regla "Reserva online" (simulada).
create or replace function portal.confirmar_reserva(p_reserva uuid, p_referencia text default null) returns bigint
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_r portal.reservas; v_op portal.operaciones; v_srv boolean := portal._es_servicio(); v_lado text;
        v_ref text := nullif(left(btrim(coalesce(p_referencia, '')), 120), '');
begin
  select * into v_r from portal.reservas where id = p_reserva for update;
  if v_r.id is null then raise exception 'La reserva no existe.'; end if;
  if v_srv then v_lado := 'sistema';
  else
    if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
    if not ('publicador' = any(portal.lados_en(v_r.operacion_id))) then raise exception 'Solo quien publica confirma la seña.'; end if;
    v_lado := 'publicador';
  end if;
  select * into v_op from portal.operaciones where id = v_r.operacion_id;
  if v_r.estado = 'pagada' then raise exception 'La seña ya está confirmada.'; end if;
  if v_r.estado not in ('pedida','vencida') then raise exception 'Esta reserva ya no está pendiente.'; end if;
  -- Con la clave de servicio el pago ya se hizo: se registra igual aunque la operación se haya cerrado
  if not v_srv and v_op.etapa in ('caida','cerrada') then raise exception 'La operación está cerrada.'; end if;
  if v_r.estado = 'vencida' and exists (select 1 from portal.reservas where operacion_id = v_r.operacion_id and id <> v_r.id and estado in ('pedida','pagada')) then
    raise exception 'Hay otra reserva en curso para esta operación.';
  end if;
  update portal.reservas set estado = 'pagada', pagada_en = now(), referencia = coalesce(v_ref, referencia),
         proveedor = case when v_srv then 'mercadopago' else 'manual' end
   where id = p_reserva;
  return portal._hito(v_r.operacion_id, 'reserva_pagada', v_lado,
    jsonb_build_object('reserva_id', v_r.id, 'monto', v_r.monto, 'moneda', v_r.moneda) || case when v_ref is null then '{}'::jsonb else jsonb_build_object('referencia', v_ref) end);
end $$;

-- Quien publica devuelve una seña pagada (la devuelve él, desde su cuenta)
create or replace function portal.devolver_reserva(p_reserva uuid, p_motivo text default null) returns bigint
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_r portal.reservas; v_srv boolean := portal._es_servicio(); v_lado text; v_mot text := nullif(left(btrim(coalesce(p_motivo, '')), 300), '');
begin
  select * into v_r from portal.reservas where id = p_reserva for update;
  if v_r.id is null then raise exception 'La reserva no existe.'; end if;
  if v_srv then v_lado := 'sistema';
  else
    if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
    if not ('publicador' = any(portal.lados_en(v_r.operacion_id))) then raise exception 'Solo quien publica devuelve la seña.'; end if;
    v_lado := 'publicador';
  end if;
  if v_r.estado <> 'pagada' then raise exception 'Solo se devuelve una seña pagada.'; end if;
  update portal.reservas set estado = 'devuelta', devuelta_en = now(), motivo = coalesce(v_mot, motivo) where id = p_reserva;
  return portal._hito(v_r.operacion_id, 'reserva_devuelta', v_lado,
    jsonb_build_object('reserva_id', v_r.id, 'monto', v_r.monto, 'moneda', v_r.moneda) || case when v_mot is null then '{}'::jsonb else jsonb_build_object('motivo', v_mot) end);
end $$;

-- Cualquiera de las dos partes cancela un pedido de reserva que todavía no se pagó
create or replace function portal.cancelar_reserva(p_reserva uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_r portal.reservas; v_lados text[];
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into v_r from portal.reservas where id = p_reserva for update;
  if v_r.id is null then raise exception 'La reserva no existe.'; end if;
  v_lados := portal.lados_en(v_r.operacion_id);
  if not (v_lados && array['interesado','publicador']) then raise exception 'No sos parte de esta operación.'; end if;
  if v_r.estado <> 'pedida' then raise exception 'Solo se cancela una reserva que todavía no se pagó.'; end if;
  update portal.reservas set estado = 'cancelada', cancelada_en = now(), motivo = coalesce(nullif(left(btrim(coalesce(p_motivo, '')), 300), ''), motivo) where id = p_reserva;
  update portal.operaciones set actualizada_en = now() where id = v_r.operacion_id;
end $$;

-- Para el cron (clave de servicio) o la plataforma: vence las señas que no se pagaron a tiempo y marca las cuotas atrasadas
create or replace function portal.vencer_reservas() returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  if not (portal._es_servicio() or portal.es_curador() or portal.es_plataforma()) then raise exception 'Solo el sistema vence reservas.'; end if;
  return portal._vencer_reservas(null);
end $$;

-- ---------------------------------------------------------------------
-- 7. Cuotas: armar, registrar el pago (con recibo) y anular
-- ---------------------------------------------------------------------
-- Quien publica arma las cuotas de un alquiler (idealmente después del contrato). p_desde: cualquier día del primer mes.
-- p_concepto: alquiler (por defecto), expensas o deposito. Las que ya existen para ese mes y concepto no se repiten.
create or replace function portal.armar_cuotas(p_op uuid, p_desde date, p_meses integer, p_monto numeric, p_moneda text default null,
  p_dia_venc integer default 10, p_concepto text default 'alquiler') returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_op portal.operaciones; v_mon text; v_mes date; v_venc date; n integer := 0; k integer; i integer; v_ult integer;
        v_con text := coalesce(nullif(btrim(coalesce(p_concepto, '')), ''), 'alquiler'); v_monto numeric := round(p_monto, 2);
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  if not ('publicador' = any(portal.lados_en(p_op))) then raise exception 'Solo quien publica arma las cuotas.'; end if;
  select * into v_op from portal.operaciones where id = p_op;
  if v_op.etapa = 'caida' then raise exception 'La operación quedó sin acuerdo.'; end if;
  if coalesce(v_op.linea, '') in ('venta','pozo') or (v_op.linea is null and v_op.tipo = 'venta') then raise exception 'Las cuotas son para alquileres.'; end if;
  if v_con not in ('alquiler','deposito','expensas') then raise exception 'El concepto es alquiler, depósito o expensas.'; end if;
  if p_desde is null then raise exception 'Falta desde qué mes.'; end if;
  if p_meses is null or p_meses < 1 or p_meses > 60 then raise exception 'Las cuotas van de 1 a 60 meses.'; end if;
  if v_monto is null or v_monto <= 0 or v_monto >= 1000000000 then raise exception 'Revisá el monto.'; end if;
  if p_dia_venc is null or p_dia_venc < 1 or p_dia_venc > 31 then raise exception 'El día de vencimiento va de 1 a 31.'; end if;
  v_mon := coalesce(nullif(btrim(coalesce(p_moneda, '')), ''), v_op.moneda, 'USD');
  if v_mon not in ('USD','ARS') then raise exception 'La moneda es USD o ARS.'; end if;
  for i in 0 .. p_meses - 1 loop
    v_mes := (date_trunc('month', p_desde) + make_interval(months => i))::date;
    v_ult := extract(day from (v_mes + interval '1 month' - interval '1 day'))::integer;
    v_venc := v_mes + (least(p_dia_venc, v_ult) - 1);
    insert into portal.pagos (operacion_id, publicador_id, concepto, periodo, monto, moneda, vencimiento, creado_por)
    values (p_op, v_op.publicador_id, v_con, to_char(v_mes, 'YYYY-MM'), v_monto, v_mon, v_venc, auth.uid())
    on conflict (operacion_id, concepto, periodo) where estado <> 'anulado' do nothing;
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  update portal.operaciones set actualizada_en = now() where id = p_op;
  return n;
end $$;

-- Quien publica marca una cuota como cobrada (modo manual) o lo hace el webhook de Mercado Pago. Da el número de recibo
-- y registra pago_recibido { monto, moneda, periodo }: corre la regla "Cobranza digital" (simulada).
create or replace function portal.registrar_pago(p_pago uuid, p_referencia text default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_p portal.pagos; v_op portal.operaciones; v_srv boolean := portal._es_servicio(); v_lado text; v_n integer;
        v_ref text := nullif(left(btrim(coalesce(p_referencia, '')), 120), '');
begin
  select * into v_p from portal.pagos where id = p_pago for update;
  if v_p.id is null then raise exception 'La cuota no existe.'; end if;
  if v_srv then v_lado := 'sistema';
  else
    if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
    if not ('publicador' = any(portal.lados_en(v_p.operacion_id))) then raise exception 'Solo quien publica marca un pago.'; end if;
    v_lado := 'publicador';
  end if;
  if v_p.estado = 'pagado' then raise exception 'Esta cuota ya está paga.'; end if;
  if v_p.estado = 'anulado' then raise exception 'Esta cuota está anulada.'; end if;
  select * into v_op from portal.operaciones where id = v_p.operacion_id;
  if not v_srv and v_op.etapa = 'caida' then raise exception 'La operación quedó sin acuerdo.'; end if;
  insert into portal.recibos_numeracion as rn (publicador_id, ultimo) values (v_p.publicador_id, 1)
  on conflict (publicador_id) do update set ultimo = rn.ultimo + 1
  returning ultimo into v_n;
  update portal.pagos set estado = 'pagado', pagado_en = now(), recibo = v_n, referencia = coalesce(v_ref, referencia),
         proveedor = case when v_srv then 'mercadopago' else 'manual' end
   where id = p_pago;
  perform portal._hito(v_p.operacion_id, 'pago_recibido', v_lado, jsonb_build_object('monto', v_p.monto, 'moneda', v_p.moneda,
    'periodo', v_p.periodo, 'concepto', v_p.concepto, 'pago_id', v_p.id, 'recibo', v_n));
  return v_n;
end $$;

-- Quien publica anula una cuota que no corresponde (todavía sin pagar)
create or replace function portal.anular_pago(p_pago uuid) returns void
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_p portal.pagos;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into v_p from portal.pagos where id = p_pago for update;
  if v_p.id is null then raise exception 'La cuota no existe.'; end if;
  if not ('publicador' = any(portal.lados_en(v_p.operacion_id))) then raise exception 'Solo quien publica anula una cuota.'; end if;
  if v_p.estado not in ('pendiente','vencido') then raise exception 'Solo se anula una cuota sin pagar.'; end if;
  update portal.pagos set estado = 'anulado' where id = p_pago;
end $$;

-- ---------------------------------------------------------------------
-- 8. Lecturas
-- ---------------------------------------------------------------------
-- Lo de una operación: reservas, cuotas, la cuenta de cobro (quien busca la ve solo si tiene algo para pagar), si quien
-- publica cobra con Mercado Pago y si la identidad es requisito. Al leer, vence lo que ya venció de esta operación
-- (vencidas: cuántas señas venció esta lectura; la página vuelve a leer el recorrido para mostrar el paso).
create or replace function portal.pagos_de_operacion(p_op uuid) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_lados text[]; v_lado text; v_op portal.operaciones; v_c portal.cuentas_cobro; v_ver boolean; v_venc integer;
begin
  v_lados := portal.lados_en(p_op);
  if cardinality(v_lados) = 0 then raise exception 'No sos parte de esta operación.'; end if;
  v_lado := case when 'interesado' = any(v_lados) then 'interesado' when 'publicador' = any(v_lados) then 'publicador' else 'plataforma' end;
  v_venc := portal._vencer_reservas(p_op);
  select * into v_op from portal.operaciones where id = p_op;
  select * into v_c from portal.cuentas_cobro where publicador_id = v_op.publicador_id and proveedor = 'manual' and estado = 'activa';
  v_ver := v_lado <> 'interesado'
        or exists (select 1 from portal.reservas where operacion_id = p_op and estado = 'pedida')
        or exists (select 1 from portal.pagos where operacion_id = p_op and estado in ('pendiente','vencido'));
  return jsonb_build_object(
    'lado', v_lado,
    'vencidas', v_venc,
    'reservas', coalesce((select jsonb_agg(portal._reserva_json(r) order by r.pedida_en desc) from portal.reservas r where r.operacion_id = p_op), '[]'::jsonb),
    'pagos', coalesce((select jsonb_agg(portal._pago_json(p) order by p.vencimiento, p.concepto) from portal.pagos p
      where p.operacion_id = p_op and (p.estado <> 'anulado' or v_lado <> 'interesado')), '[]'::jsonb),
    'cuenta', case when v_c.id is not null and v_ver then jsonb_build_object('titular', v_c.titular, 'alias', v_c.alias, 'cbu', v_c.cbu, 'nota', v_c.nota) end,
    'cuenta_cargada', v_c.id is not null,
    'mp', exists (select 1 from portal.cuentas_cobro where publicador_id = v_op.publicador_id and proveedor = 'mercadopago' and estado = 'activa'),
    'identidad', jsonb_build_object('requerida', portal._identidad_requerida(), 'ok', case when v_lado = 'interesado' then portal._identidad_ok(auth.uid()) end)
  );
end $$;

-- "Mis pagos" de quien busca: sus operaciones con señas o cuotas
create or replace function portal.mis_pagos() returns jsonb
language sql stable security definer set search_path to 'portal', 'public' as $$
  select coalesce(jsonb_agg(x.j order by x.orden desc), '[]'::jsonb) from (
    select o.actualizada_en as orden, jsonb_build_object(
      'operacion_id', o.id, 'etapa', o.etapa, 'linea', o.linea,
      'aviso_titulo', a.titulo,
      'aviso_lugar', case when coalesce(a.mostrar_direccion, 'exacta') <> 'exacta' then a.barrio else coalesce(a.direccion, a.barrio) end,
      'foto', portal.portada_de(a.id), 'publicador_nombre', pb.nombre,
      'reservas', coalesce((select jsonb_agg(portal._reserva_json(r) order by r.pedida_en desc) from portal.reservas r where r.operacion_id = o.id), '[]'::jsonb),
      'pagos', coalesce((select jsonb_agg(portal._pago_json(p) order by p.vencimiento, p.concepto) from portal.pagos p where p.operacion_id = o.id and p.estado <> 'anulado'), '[]'::jsonb),
      'cuenta', (select jsonb_build_object('titular', c.titular, 'alias', c.alias, 'cbu', c.cbu, 'nota', c.nota) from portal.cuentas_cobro c
                  where c.publicador_id = o.publicador_id and c.proveedor = 'manual' and c.estado = 'activa'
                    and (exists (select 1 from portal.reservas r where r.operacion_id = o.id and r.estado = 'pedida')
                      or exists (select 1 from portal.pagos p where p.operacion_id = o.id and p.estado in ('pendiente','vencido')))),
      'mp', exists (select 1 from portal.cuentas_cobro c where c.publicador_id = o.publicador_id and c.proveedor = 'mercadopago' and c.estado = 'activa')) as j
    from portal.operaciones o
    left join portal.avisos a on a.id = o.aviso_id
    left join portal.publicadores pb on pb.id = o.publicador_id
    where auth.uid() is not null and o.interesado_user = auth.uid()
      and (exists (select 1 from portal.reservas r where r.operacion_id = o.id) or exists (select 1 from portal.pagos p where p.operacion_id = o.id))
    limit 300
  ) x
$$;

-- "Cobranza" de quien publica (titular o equipo): sus cuentas de cobro y las operaciones con señas o cuotas
create or replace function portal.cobranza() returns jsonb
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare v_pubs uuid[];
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select coalesce(array_agg(pb.id), '{}') into v_pubs from portal.publicadores pb
   where pb.auth_user_id = auth.uid() or portal.es_miembro(pb.id);
  return jsonb_build_object(
    'publicadores', coalesce((select jsonb_agg(jsonb_build_object('id', pb.id, 'nombre', pb.nombre) order by pb.nombre) from portal.publicadores pb where pb.id = any(v_pubs)), '[]'::jsonb),
    'cuentas', coalesce((select jsonb_agg(jsonb_build_object('publicador_id', c.publicador_id, 'proveedor', c.proveedor, 'titular', c.titular, 'alias', c.alias,
        'cbu', c.cbu, 'nota', c.nota, 'estado', c.estado, 'mp_user_id', c.mp_user_id, 'actualizado_en', c.actualizado_en))
      from portal.cuentas_cobro c where c.publicador_id = any(v_pubs)), '[]'::jsonb),
    'operaciones', coalesce((select jsonb_agg(jsonb_build_object(
        'operacion_id', o.id, 'publicador_id', o.publicador_id, 'etapa', o.etapa, 'linea', o.linea,
        'aviso_titulo', a.titulo, 'aviso_direccion', concat_ws(' · ', nullif(concat_ws(' ', a.direccion, a.unidad), ''), a.barrio),
        'interesado', portal.nombre_interesado(o.interesado_user),
        'reservas', coalesce((select jsonb_agg(portal._reserva_json(r) order by r.pedida_en desc) from portal.reservas r where r.operacion_id = o.id), '[]'::jsonb),
        'pagos', coalesce((select jsonb_agg(portal._pago_json(p) order by p.vencimiento, p.concepto) from portal.pagos p where p.operacion_id = o.id), '[]'::jsonb))
        order by o.actualizada_en desc)
      from portal.operaciones o left join portal.avisos a on a.id = o.aviso_id
      where o.publicador_id = any(v_pubs)
        and (exists (select 1 from portal.reservas r where r.operacion_id = o.id) or exists (select 1 from portal.pagos p where p.operacion_id = o.id))), '[]'::jsonb)
  );
end $$;

-- El recibo de una cuota pagada. Lo emite quien publica (que recibió el dinero); BAIREN solo lo registra.
create or replace function portal.recibo(p_pago uuid) returns jsonb
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare v_p portal.pagos; v_op portal.operaciones;
begin
  select * into v_p from portal.pagos where id = p_pago;
  if v_p.id is null then raise exception 'El recibo no existe.'; end if;
  if cardinality(portal.lados_en(v_p.operacion_id)) = 0 then raise exception 'No sos parte de esta operación.'; end if;
  if v_p.estado <> 'pagado' then raise exception 'Esta cuota todavía no está paga.'; end if;
  select * into v_op from portal.operaciones where id = v_p.operacion_id;
  return portal._pago_json(v_p) || jsonb_build_object(
    'operacion_id', v_op.id,
    'publicador', (select jsonb_build_object('nombre', coalesce(nullif(btrim(pb.razon_social), ''), pb.nombre), 'marca', pb.nombre, 'cuit', pb.cuit)
                     from portal.publicadores pb where pb.id = v_p.publicador_id),
    'pagador', portal.contacto_interesado(v_op.id) ->> 'nombre',
    'unidad', (select jsonb_build_object('titulo', a.titulo, 'direccion', a.direccion, 'unidad', a.unidad, 'barrio', a.barrio)
                 from portal.avisos a where a.id = v_op.aviso_id));
end $$;

-- ---------------------------------------------------------------------
-- 9. Políticas (RLS): se leen por las partes; se escriben solo por las funciones
-- ---------------------------------------------------------------------
drop policy if exists "cuentas de cobro las ve su publicador" on portal.cuentas_cobro;
create policy "cuentas de cobro las ve su publicador" on portal.cuentas_cobro for select
  using (portal.soy_publicador(publicador_id) or portal.es_curador() or portal.es_plataforma());
drop policy if exists "reservas de las partes" on portal.reservas;
create policy "reservas de las partes" on portal.reservas for select using (portal.es_parte(operacion_id));
drop policy if exists "pagos de las partes" on portal.pagos;
create policy "pagos de las partes" on portal.pagos for select using (portal.es_parte(operacion_id));
-- portal.mp_credenciales y portal.recibos_numeracion: sin políticas (solo la clave de servicio y las funciones)

-- ---------------------------------------------------------------------
-- 10. Permisos de tabla y de función
-- ---------------------------------------------------------------------
revoke all on portal.cuentas_cobro, portal.reservas, portal.pagos, portal.mp_credenciales, portal.recibos_numeracion from public, anon;
revoke all on portal.mp_credenciales, portal.recibos_numeracion from authenticated;
revoke insert, update, delete, truncate, references, trigger on portal.cuentas_cobro, portal.reservas, portal.pagos from authenticated;
grant select on portal.cuentas_cobro, portal.reservas, portal.pagos to authenticated;
grant all on portal.cuentas_cobro, portal.reservas, portal.pagos, portal.mp_credenciales, portal.recibos_numeracion to service_role;

-- Internas
revoke all on function portal._es_servicio(), portal._identidad_requerida(), portal._identidad_ok(uuid), portal._vencer_reservas(uuid),
  portal._reserva_json(portal.reservas), portal._pago_json(portal.pagos) from public, anon, authenticated;
-- Las que llama la página (con sesión)
revoke all on function portal.guardar_cuenta_cobro(uuid, text, text, text, text), portal.pedir_reserva(uuid, numeric, text, integer),
  portal.confirmar_reserva(uuid, text), portal.devolver_reserva(uuid, text), portal.cancelar_reserva(uuid, text), portal.vencer_reservas(),
  portal.armar_cuotas(uuid, date, integer, numeric, text, integer, text), portal.registrar_pago(uuid, text), portal.anular_pago(uuid),
  portal.pagos_de_operacion(uuid), portal.mis_pagos(), portal.cobranza(), portal.recibo(uuid) from public, anon;
grant execute on function portal.guardar_cuenta_cobro(uuid, text, text, text, text), portal.pedir_reserva(uuid, numeric, text, integer),
  portal.confirmar_reserva(uuid, text), portal.devolver_reserva(uuid, text), portal.cancelar_reserva(uuid, text), portal.vencer_reservas(),
  portal.armar_cuotas(uuid, date, integer, numeric, text, integer, text), portal.registrar_pago(uuid, text), portal.anular_pago(uuid),
  portal.pagos_de_operacion(uuid), portal.mis_pagos(), portal.cobranza(), portal.recibo(uuid) to authenticated;
-- El webhook de Mercado Pago y el cron (clave de servicio)
grant execute on function portal.confirmar_reserva(uuid, text), portal.registrar_pago(uuid, text), portal.devolver_reserva(uuid, text),
  portal.vencer_reservas() to service_role;

notify pgrst, 'reload schema';

-- Controles
select 'tablas nuevas' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal'
     and table_name in ('cuentas_cobro','mp_credenciales','recibos_numeracion','reservas','pagos')) = 5 as ok
union all select 'RLS prendido', (select bool_and(relrowsecurity) from pg_class where oid in ('portal.cuentas_cobro'::regclass, 'portal.mp_credenciales'::regclass,
     'portal.recibos_numeracion'::regclass, 'portal.reservas'::regclass, 'portal.pagos'::regclass))
union all select 'reglas de reserva y cobranza en simulación', (select count(*) from portal.reglas_cobro
     where escenario = 'Rieles · octubre 2026' and evento in ('reserva_pagada','pago_recibido') and not cobra and paga <> 'interesado') = 3
union all select 'nada se le cobra al inquilino', not exists (select 1 from portal.reglas_cobro where paga = 'interesado' and linea <> 'temporario');
