-- =====================================================================
-- BAIREN · Portal · Migración 33 · Garantías y seguros dentro de la operación
--
-- 9/10/2026. Riel "garantía y seguro" del plan Rieles. Quien busca un alquiler de mediano o largo plazo elige su
-- garantía sin salir de la conversación: una empresa de fianza, un seguro (caución, hogar, daños) o su garantía
-- propietaria. Nunca se impone un proveedor: "Usar mi garantía propietaria" está siempre.
--
-- Marco legal (nota del plan):
--   · Las empresas de fianza no son seguros: el acuerdo de referidos con ellas es comercial, sin regulación específica.
--   · Los seguros solo pagan comisión a inscriptos en la SSN (Ley 22.400, art. 7): productor asesor o agente institorio.
--     Mientras BAIREN no esté inscripta, la venta de seguros va por un productor aliado: un seguro solo se activa con
--     el nombre y la matrícula SSN del productor (la base lo exige).
--   · Al inquilino no se le cobra nada (Ley 5859). La plata de la póliza va directo al proveedor, en su web.
--
-- Qué agrega (nada se borra):
--   1. portal.proveedores_garantia: qué es, cómo se contrata, el convenio y el productor. Lo administra la plataforma.
--      Dos ejemplos INACTIVOS y marcados como ejemplo (la base no deja activar un ejemplo). No hay empresas reales.
--   2. portal.solicitudes_garantia: la garantía de cada operación (elegida, en trámite, aprobada, rechazada, cancelada).
--   3. Funciones: garantias_disponibles (lista para quien busca, sin los % del convenio), elegir_garantia,
--      usar_garantia_propia, actualizar_garantia (quien publica o la plataforma), guardar_proveedor_garantia y
--      solicitudes_garantia_lista (plataforma).
--   4. Al aprobarse: hito garantia_emitida (fianza o propia) o seguro_emitido (caución, hogar, daños) con
--      { monto: costo, moneda }. Eso dispara las reglas "Garantía de alquiler" y "Seguro" de la migración 28 (20 % del
--      costo, lo paga el tercero, en simulación). La garantía propia aprobada no lleva monto: no genera cargos.
--
-- Permisos: RLS en las dos tablas. Las solicitudes las ven las partes de la operación; los proveedores (con su
-- convenio), solo la plataforma. Toda escritura va por funciones SECURITY DEFINER. Vuelta atrás:
-- migracion-33-garantias-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Proveedores
-- ---------------------------------------------------------------------
create table if not exists portal.proveedores_garantia (
  id                       uuid primary key default gen_random_uuid(),
  -- qué es
  nombre                   text not null,
  tipo                     text not null,
  descripcion              text,
  -- cómo se contrata
  url                      text,
  param_referido           text,
  costo_pct                numeric(6,3),
  cuotas                   text,
  requisitos               text,
  -- el convenio
  comision_pct             numeric(6,3),
  requiere_productor       boolean not null default false,
  productor_nombre         text,
  productor_matricula_ssn  text,
  -- estado
  activo                   boolean not null default false,
  orden                    integer not null default 100,
  ejemplo                  boolean not null default false,
  actualizado_por          text,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),
  constraint m33_prov_tipo check (tipo in ('fianza','caucion','hogar','danos')),
  constraint m33_prov_nombre check (char_length(btrim(nombre)) between 2 and 80),
  constraint m33_prov_textos check (char_length(coalesce(descripcion, '')) <= 240 and char_length(coalesce(cuotas, '')) <= 80
    and char_length(coalesce(requisitos, '')) <= 600 and char_length(coalesce(productor_nombre, '')) <= 120
    and char_length(coalesce(productor_matricula_ssn, '')) <= 40),
  constraint m33_prov_url check (url is null or (char_length(url) <= 500 and url ~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]+)?([/?#][^[:space:]]*)?$')),
  constraint m33_prov_param check (param_referido is null or (char_length(param_referido) <= 120
    and param_referido ~ '^[A-Za-z0-9_.~-]+=[A-Za-z0-9_.~{}-]*(&[A-Za-z0-9_.~-]+=[A-Za-z0-9_.~{}-]*)*$')),
  constraint m33_prov_pct check (coalesce(costo_pct, 0) between 0 and 100 and coalesce(comision_pct, 0) between 0 and 100),
  constraint m33_prov_orden check (orden between 0 and 9999),
  -- Un seguro siempre va por un productor (Ley 22.400, art. 7)
  constraint m33_prov_seguro check (tipo = 'fianza' or requiere_productor),
  -- Activo: con su web y, si es un seguro, con el productor y su matrícula SSN
  constraint m33_prov_activo check (not activo or (url is not null and (not requiere_productor
    or (nullif(btrim(productor_nombre), '') is not null and nullif(btrim(productor_matricula_ssn), '') is not null)))),
  -- Un ejemplo nunca se muestra
  constraint m33_prov_ejemplo check (not (ejemplo and activo))
);
create index if not exists proveedores_garantia_activos_idx on portal.proveedores_garantia (activo, orden);
alter table portal.proveedores_garantia enable row level security;

-- Dos ejemplos, inactivos, sin web y sin convenio real
insert into portal.proveedores_garantia (nombre, tipo, descripcion, url, param_referido, costo_pct, cuotas, requisitos,
  comision_pct, requiere_productor, productor_nombre, productor_matricula_ssn, activo, orden, ejemplo)
select * from (values
  ('Ejemplo · garantía de fianza', 'fianza', 'Ejemplo para ver cómo se muestra. No es una empresa real y no hay convenio.',
   null::text, 'ref=bairen', 5.5::numeric, 'Hasta 6 cuotas', 'Ejemplo: DNI y recibos de sueldo o constancia de ingresos.',
   null::numeric, false, null::text, null::text, false, 900, true),
  ('Ejemplo · seguro de caución', 'caucion', 'Ejemplo para ver cómo se muestra. No es una aseguradora real y no hay convenio.',
   null::text, 'ref=bairen', 4.5::numeric, 'Hasta 3 cuotas', 'Ejemplo: DNI e ingresos demostrables.',
   null::numeric, true, null::text, null::text, false, 910, true)
) as v(nombre, tipo, descripcion, url, param_referido, costo_pct, cuotas, requisitos, comision_pct, requiere_productor,
       productor_nombre, productor_matricula_ssn, activo, orden, ejemplo)
where not exists (select 1 from portal.proveedores_garantia where ejemplo);

-- ---------------------------------------------------------------------
-- 2. Solicitudes: la garantía de cada operación
-- ---------------------------------------------------------------------
create table if not exists portal.solicitudes_garantia (
  id                uuid primary key default gen_random_uuid(),
  operacion_id      uuid not null references portal.operaciones(id) on delete cascade,
  proveedor_id      uuid references portal.proveedores_garantia(id) on delete set null,
  proveedor_nombre  text,                                   -- copia del nombre al elegir (queda aunque cambie el proveedor)
  tipo              text not null,                          -- el del proveedor, o 'propia'
  estado            text not null default 'elegida',
  costo_estimado    numeric(14,2),                          -- % del proveedor sobre el total del contrato, al elegir
  costo_total       numeric(14,2),                          -- el que confirma el proveedor, al aprobar
  moneda            text not null default 'USD',
  referencia        text,                                   -- número de solicitud o póliza del proveedor
  detalle           text,                                   -- garantía propia: cuál es, en palabras de quien busca
  creado_por        uuid default auth.uid(),
  actualizado_por   uuid,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  aprobada_en       timestamptz,
  constraint m33_sol_tipo check (tipo in ('fianza','caucion','hogar','danos','propia')),
  constraint m33_sol_estado check (estado in ('elegida','en_tramite','aprobada','rechazada','cancelada')),
  constraint m33_sol_moneda check (moneda in ('USD','ARS')),
  constraint m33_sol_costos check (coalesce(costo_estimado, 0) >= 0 and coalesce(costo_total, 0) >= 0),
  constraint m33_sol_textos check (char_length(coalesce(proveedor_nombre, '')) <= 80 and char_length(coalesce(referencia, '')) <= 80
    and char_length(coalesce(detalle, '')) <= 300),
  constraint m33_sol_propia check (tipo <> 'propia' or proveedor_id is null)
);
create index if not exists solicitudes_garantia_op_idx on portal.solicitudes_garantia (operacion_id, creado_en);
create index if not exists solicitudes_garantia_fecha_idx on portal.solicitudes_garantia (creado_en desc);
-- Una sola en curso y una sola aprobada por operación
create unique index if not exists solicitudes_garantia_en_curso_uniq on portal.solicitudes_garantia (operacion_id) where estado in ('elegida','en_tramite');
create unique index if not exists solicitudes_garantia_aprobada_uniq on portal.solicitudes_garantia (operacion_id) where estado = 'aprobada';
alter table portal.solicitudes_garantia enable row level security;

-- ---------------------------------------------------------------------
-- 3. Internas
-- ---------------------------------------------------------------------
-- Total del contrato para estimar el costo: el monto del contrato o, si no se conoce, alquiler × plazo
create or replace function portal._garantia_base(p_op uuid) returns numeric
language sql stable security definer set search_path to 'portal', 'public' as $$
  select coalesce(case when o.monto_contrato > 0 then o.monto_contrato end,
                  case when o.precio_publicado > 0 and o.plazo_meses > 0 then o.precio_publicado * o.plazo_meses end)
  from portal.operaciones o where o.id = p_op
$$;

-- Por qué la sesión no puede elegir garantía en esta operación (null: puede)
create or replace function portal._garantia_impedimento(p_op uuid) returns text
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare v_o portal.operaciones; v_ult text;
begin
  select * into v_o from portal.operaciones where id = p_op;
  if v_o.id is null then return 'La operación no existe.'; end if;
  if not ('interesado' = any(portal.lados_en(p_op))) then return 'Solo quien busca elige la garantía.'; end if;
  if coalesce(v_o.linea, '') not in ('mediano', 'tradicional') then return 'La garantía se elige en alquileres de mediano o largo plazo.'; end if;
  if v_o.etapa in ('caida', 'cerrada') then return 'La operación está cerrada.'; end if;
  if portal.orden_etapa(v_o.etapa) < 4 then return 'Primero avisá que querés avanzar.'; end if;
  select h.tipo into v_ult from portal.hitos h
   where h.operacion_id = p_op and h.tipo in ('solicitud_enviada', 'solicitud_aceptada', 'solicitud_rechazada')
   order by h.id desc limit 1;
  if v_ult = 'solicitud_rechazada' then return 'La solicitud fue rechazada.'; end if;
  if exists (select 1 from portal.solicitudes_garantia s where s.operacion_id = p_op and s.estado = 'aprobada') then
    return 'Ya tenés una garantía aprobada.';
  end if;
  return null;
end $$;

-- La web del proveedor con el referido. {op} en el parámetro se reemplaza por un código de la solicitud.
create or replace function portal._garantia_url(p_url text, p_param text, p_sol uuid) returns text
language sql immutable as $$
  select case when p_url is null then null else
    regexp_replace(p_url, '#.*$', '')
    || case when coalesce(p_param, '') = '' then ''
            when position('?' in regexp_replace(p_url, '#.*$', '')) > 0 then '&' else '?' end
    || replace(coalesce(p_param, ''), '{op}', left(replace(p_sol::text, '-', ''), 10))
    || coalesce(substring(p_url from '#.*$'), '')
  end
$$;

-- ---------------------------------------------------------------------
-- 4. Quien busca: la lista, elegir un proveedor o usar la propia
-- ---------------------------------------------------------------------
-- Proveedores activos, con lo necesario para mostrarlos. Sin los % del convenio. El productor y su matrícula SSN se
-- muestran: quien ofrece un seguro tiene que decir quién lo intermedia.
create or replace function portal.garantias_disponibles()
returns table (id uuid, nombre text, tipo text, descripcion text, dominio text, costo_pct numeric, cuotas text, requisitos text,
  requiere_productor boolean, productor_nombre text, productor_matricula_ssn text, orden integer)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select p.id, p.nombre, p.tipo, p.descripcion, lower(substring(p.url from '^https://([^/?#:]+)')), p.costo_pct, p.cuotas, p.requisitos,
    p.requiere_productor, p.productor_nombre, p.productor_matricula_ssn, p.orden
  from portal.proveedores_garantia p
  where auth.uid() is not null and p.activo and not p.ejemplo
  order by p.orden, p.nombre
$$;

-- Elige un proveedor: queda la solicitud, el paso "garantía elegida" y vuelve la web con el referido.
-- La misma elección otra vez no duplica nada (sirve para volver a la web); otra elección cancela la anterior.
create or replace function portal.elegir_garantia(p_op uuid, p_proveedor uuid) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_imp text; v_p portal.proveedores_garantia; v_o portal.operaciones; v_s portal.solicitudes_garantia; v_base numeric;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into v_o from portal.operaciones where id = p_op for update;
  v_imp := portal._garantia_impedimento(p_op);
  if v_imp is not null then raise exception '%', v_imp; end if;
  select * into v_p from portal.proveedores_garantia where id = p_proveedor and activo and not ejemplo;
  if v_p.id is null then raise exception 'Ese proveedor no está disponible.'; end if;
  select * into v_s from portal.solicitudes_garantia where operacion_id = p_op and estado in ('elegida', 'en_tramite') limit 1;
  if v_s.id is null or v_s.proveedor_id is distinct from v_p.id then
    if (select count(*) from portal.solicitudes_garantia where operacion_id = p_op) >= 12 then
      raise exception 'Cambiaste muchas veces de garantía. Escribile a quien publica por acá.';
    end if;
    update portal.solicitudes_garantia set estado = 'cancelada', actualizado_en = now(), actualizado_por = auth.uid()
     where operacion_id = p_op and estado in ('elegida', 'en_tramite');
    v_base := portal._garantia_base(p_op);
    insert into portal.solicitudes_garantia (operacion_id, proveedor_id, proveedor_nombre, tipo, estado, costo_estimado, moneda, creado_por)
    values (p_op, v_p.id, v_p.nombre, v_p.tipo, 'elegida',
            case when v_base is not null and v_p.costo_pct is not null then round(v_base * v_p.costo_pct / 100, 2) end,
            case when v_o.moneda in ('USD', 'ARS') then v_o.moneda else 'USD' end, auth.uid())
    returning * into v_s;
    perform portal._hito(p_op, 'garantia_elegida', 'interesado', jsonb_build_object('solicitud_id', v_s.id, 'proveedor', v_p.nombre, 'tipo', v_p.tipo));
  end if;
  return jsonb_build_object('id', v_s.id, 'url', portal._garantia_url(v_p.url, v_p.param_referido, v_s.id), 'proveedor', v_p.nombre,
    'tipo', v_p.tipo, 'costo_estimado', v_s.costo_estimado, 'moneda', v_s.moneda);
end $$;

-- Quien busca usa su garantía propietaria (o la que prefiera) y la deja anotada
create or replace function portal.usar_garantia_propia(p_op uuid, p_detalle text default null) returns uuid
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_imp text; v_o portal.operaciones; v_s portal.solicitudes_garantia; v_det text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into v_o from portal.operaciones where id = p_op for update;
  v_imp := portal._garantia_impedimento(p_op);
  if v_imp is not null then raise exception '%', v_imp; end if;
  v_det := nullif(left(btrim(coalesce(p_detalle, '')), 300), '');
  select * into v_s from portal.solicitudes_garantia where operacion_id = p_op and estado in ('elegida', 'en_tramite') limit 1;
  if v_s.id is not null and v_s.tipo = 'propia' then
    update portal.solicitudes_garantia set detalle = coalesce(v_det, detalle), actualizado_en = now(), actualizado_por = auth.uid() where id = v_s.id;
    return v_s.id;
  end if;
  if (select count(*) from portal.solicitudes_garantia where operacion_id = p_op) >= 12 then
    raise exception 'Cambiaste muchas veces de garantía. Escribile a quien publica por acá.';
  end if;
  update portal.solicitudes_garantia set estado = 'cancelada', actualizado_en = now(), actualizado_por = auth.uid()
   where operacion_id = p_op and estado in ('elegida', 'en_tramite');
  insert into portal.solicitudes_garantia (operacion_id, tipo, estado, moneda, detalle, creado_por)
  values (p_op, 'propia', 'elegida', case when v_o.moneda in ('USD', 'ARS') then v_o.moneda else 'USD' end, v_det, auth.uid())
  returning id into v_id;
  perform portal._hito(p_op, 'garantia_elegida', 'interesado', jsonb_build_object('solicitud_id', v_id, 'tipo', 'propia'));
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 5. Quien publica o la plataforma: en trámite, aprobada, rechazada o cancelada
-- ---------------------------------------------------------------------
create or replace function portal.actualizar_garantia(p_id uuid, p_estado text, p_costo numeric default null,
  p_moneda text default null, p_referencia text default null) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_s portal.solicitudes_garantia; v_o portal.operaciones; v_lados text[]; v_lado text; v_mon text; v_ref text;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into v_s from portal.solicitudes_garantia where id = p_id;
  if v_s.id is null then raise exception 'La garantía no existe.'; end if;
  select * into v_o from portal.operaciones where id = v_s.operacion_id for update;
  select * into v_s from portal.solicitudes_garantia where id = p_id for update;
  v_lados := portal.lados_en(v_s.operacion_id);
  -- Quien busca no aprueba su propia garantía, aunque además sea del equipo
  v_lado := case when 'publicador' = any(v_lados) then 'publicador'
                 when 'plataforma' = any(v_lados) and not ('interesado' = any(v_lados)) then 'plataforma' end;
  if v_lado is null then raise exception 'Solo quien publica o el equipo de BAIREN actualiza la garantía.'; end if;
  if p_estado is null or p_estado not in ('en_tramite', 'aprobada', 'rechazada', 'cancelada') then raise exception 'Estado desconocido.'; end if;
  if v_s.estado in ('aprobada', 'rechazada', 'cancelada') then raise exception 'Esta garantía ya está cerrada.'; end if;
  if p_estado = 'en_tramite' and v_s.estado = 'en_tramite' then raise exception 'Ya está en trámite.'; end if;
  if p_costo is not null and p_costo < 0 then raise exception 'Revisá el costo.'; end if;
  if p_moneda is not null and p_moneda not in ('USD', 'ARS') then raise exception 'Moneda desconocida.'; end if;
  v_mon := coalesce(p_moneda, v_s.moneda);
  v_ref := nullif(left(btrim(coalesce(p_referencia, '')), 80), '');
  if p_estado = 'aprobada' then
    if v_o.etapa = 'caida' then raise exception 'La operación quedó sin acuerdo.'; end if;
    if v_s.tipo <> 'propia' and coalesce(p_costo, 0) <= 0 then raise exception 'Falta el costo total de la garantía.'; end if;
  end if;
  update portal.solicitudes_garantia set
    estado = p_estado,
    costo_total = case when tipo = 'propia' then null else coalesce(p_costo, costo_total) end,
    moneda = v_mon,
    referencia = coalesce(v_ref, referencia),
    aprobada_en = case when p_estado = 'aprobada' then now() else aprobada_en end,
    actualizado_en = now(), actualizado_por = auth.uid()
  where id = p_id
  returning * into v_s;
  if p_estado = 'aprobada' then
    -- Fianza o propia: garantía emitida. Caución, hogar o daños: seguro emitido. Con monto, pasa por las reglas de cobro
    -- (lo paga el tercero, simulado); la propia no lleva monto y no genera cargos.
    perform portal._hito(v_s.operacion_id,
      case when v_s.tipo in ('fianza', 'propia') then 'garantia_emitida' else 'seguro_emitido' end, v_lado,
      case when v_s.tipo = 'propia' then jsonb_build_object('solicitud_id', v_s.id, 'tipo', 'propia')
           else jsonb_build_object('monto', v_s.costo_total, 'moneda', v_s.moneda, 'solicitud_id', v_s.id,
                                   'proveedor', v_s.proveedor_nombre, 'tipo', v_s.tipo) end);
  else
    update portal.operaciones set actualizada_en = now() where id = v_s.operacion_id;
  end if;
  return to_jsonb(v_s);
end $$;

-- ---------------------------------------------------------------------
-- 6. La plataforma: alta y edición de proveedores, y la lista de solicitudes
-- ---------------------------------------------------------------------
-- p_datos: { nombre, tipo, descripcion, url, param_referido, costo_pct, cuotas, requisitos, comision_pct,
--            requiere_productor, productor_nombre, productor_matricula_ssn, activo, orden }. Con p_id, edita (solo lo que viene).
create or replace function portal.guardar_proveedor_garantia(p_id uuid, p_datos jsonb) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v portal.proveedores_garantia; d jsonb := coalesce(p_datos, '{}'::jsonb); x text;
begin
  if not (portal.es_curador() or portal.es_plataforma('soporte')) then raise exception 'Solo el equipo de BAIREN carga proveedores.'; end if;
  if p_id is not null then
    select * into v from portal.proveedores_garantia where id = p_id for update;
    if v.id is null then raise exception 'El proveedor no existe.'; end if;
  else
    v.activo := false; v.orden := 100; v.requiere_productor := false; v.ejemplo := false;
  end if;
  if d ? 'nombre' then v.nombre := nullif(btrim(d ->> 'nombre'), ''); end if;
  if d ? 'tipo' then v.tipo := d ->> 'tipo'; end if;
  if d ? 'descripcion' then v.descripcion := nullif(btrim(d ->> 'descripcion'), ''); end if;
  if d ? 'url' then v.url := nullif(btrim(d ->> 'url'), ''); end if;
  if d ? 'param_referido' then v.param_referido := nullif(btrim(d ->> 'param_referido'), ''); end if;
  if d ? 'cuotas' then v.cuotas := nullif(btrim(d ->> 'cuotas'), ''); end if;
  if d ? 'requisitos' then v.requisitos := nullif(btrim(d ->> 'requisitos'), ''); end if;
  if d ? 'productor_nombre' then v.productor_nombre := nullif(btrim(d ->> 'productor_nombre'), ''); end if;
  if d ? 'productor_matricula_ssn' then v.productor_matricula_ssn := nullif(btrim(d ->> 'productor_matricula_ssn'), ''); end if;
  if d ? 'requiere_productor' then v.requiere_productor := coalesce((d ->> 'requiere_productor')::boolean, false); end if;
  if d ? 'activo' then v.activo := coalesce((d ->> 'activo')::boolean, false); end if;
  if d ? 'costo_pct' then
    x := nullif(btrim(d ->> 'costo_pct'), '');
    if x is not null and x !~ '^[0-9]+([.][0-9]+)?$' then raise exception 'Revisá el costo estimado: un porcentaje de 0 a 100.'; end if;
    v.costo_pct := x::numeric;
  end if;
  if d ? 'comision_pct' then
    x := nullif(btrim(d ->> 'comision_pct'), '');
    if x is not null and x !~ '^[0-9]+([.][0-9]+)?$' then raise exception 'Revisá el %% del convenio: de 0 a 100.'; end if;
    v.comision_pct := x::numeric;
  end if;
  if d ? 'orden' then
    x := nullif(btrim(d ->> 'orden'), '');
    if x is not null and x !~ '^[0-9]{1,4}$' then raise exception 'Revisá el orden: un número de 0 a 9999.'; end if;
    v.orden := coalesce(x::integer, 100);
  end if;

  -- Validaciones con mensajes claros (las constraints de la tabla repiten las mismas reglas)
  if v.nombre is null or char_length(v.nombre) not between 2 and 80 then raise exception 'Poné el nombre del proveedor (hasta 80 letras).'; end if;
  if v.tipo is null or v.tipo not in ('fianza', 'caucion', 'hogar', 'danos') then raise exception 'Elegí qué es: fianza, caución, hogar o daños.'; end if;
  if v.url is not null and (char_length(v.url) > 500 or v.url !~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]+)?([/?#][^[:space:]]*)?$') then
    raise exception 'La web tiene que empezar con https://';
  end if;
  if v.param_referido is not null and (char_length(v.param_referido) > 120
     or v.param_referido !~ '^[A-Za-z0-9_.~-]+=[A-Za-z0-9_.~{}-]*(&[A-Za-z0-9_.~-]+=[A-Za-z0-9_.~{}-]*)*$') then
    raise exception 'El parámetro de referido va como clave=valor. Por ejemplo: ref=bairen';
  end if;
  if coalesce(v.costo_pct, 0) not between 0 and 100 then raise exception 'Revisá el costo estimado: un porcentaje de 0 a 100.'; end if;
  if coalesce(v.comision_pct, 0) not between 0 and 100 then raise exception 'Revisá el %% del convenio: de 0 a 100.'; end if;
  if char_length(coalesce(v.descripcion, '')) > 240 then raise exception 'La descripción va corta: hasta 240 letras.'; end if;
  if char_length(coalesce(v.requisitos, '')) > 600 then raise exception 'Los requisitos van hasta 600 letras.'; end if;
  if char_length(coalesce(v.cuotas, '')) > 80 then raise exception 'Las cuotas van hasta 80 letras.'; end if;
  if char_length(coalesce(v.productor_nombre, '')) > 120 or char_length(coalesce(v.productor_matricula_ssn, '')) > 40 then
    raise exception 'Revisá los datos del productor.';
  end if;
  if v.tipo <> 'fianza' then v.requiere_productor := true; end if;   -- un seguro siempre va por un productor
  if v.activo and v.ejemplo then raise exception 'Es un ejemplo: no se puede activar. Cargá el proveedor real con su convenio.'; end if;
  if v.activo and v.url is null then raise exception 'Para activarlo, cargá su web.'; end if;
  if v.activo and v.requiere_productor and (v.productor_nombre is null or v.productor_matricula_ssn is null) then
    raise exception 'Un seguro se activa con el productor asesor y su matrícula SSN (Ley 22.400).';
  end if;

  if p_id is null then
    insert into portal.proveedores_garantia (nombre, tipo, descripcion, url, param_referido, costo_pct, cuotas, requisitos, comision_pct,
      requiere_productor, productor_nombre, productor_matricula_ssn, activo, orden, ejemplo, actualizado_por)
    values (v.nombre, v.tipo, v.descripcion, v.url, v.param_referido, v.costo_pct, v.cuotas, v.requisitos, v.comision_pct,
      v.requiere_productor, v.productor_nombre, v.productor_matricula_ssn, v.activo, v.orden, false, coalesce(auth.jwt() ->> 'email', 'sistema'))
    returning * into v;
  else
    update portal.proveedores_garantia set nombre = v.nombre, tipo = v.tipo, descripcion = v.descripcion, url = v.url,
      param_referido = v.param_referido, costo_pct = v.costo_pct, cuotas = v.cuotas, requisitos = v.requisitos,
      comision_pct = v.comision_pct, requiere_productor = v.requiere_productor, productor_nombre = v.productor_nombre,
      productor_matricula_ssn = v.productor_matricula_ssn, activo = v.activo, orden = v.orden,
      actualizado_por = coalesce(auth.jwt() ->> 'email', 'sistema'), actualizado_en = now()
    where id = p_id
    returning * into v;
  end if;
  return to_jsonb(v);
end $$;

-- Todas las solicitudes, con la operación y el % del convenio (para la herramienta de la plataforma)
create or replace function portal.solicitudes_garantia_lista(p_limite integer default 200)
returns table (id uuid, operacion_id uuid, aviso_titulo text, linea text, etapa text, publicador_nombre text, proveedor_id uuid,
  proveedor_nombre text, tipo text, estado text, costo_estimado numeric, costo_total numeric, moneda text, referencia text,
  detalle text, comision_pct numeric, creado_en timestamptz, actualizado_en timestamptz, aprobada_en timestamptz)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select s.id, s.operacion_id, a.titulo, o.linea, o.etapa, pb.nombre, s.proveedor_id, coalesce(s.proveedor_nombre, p.nombre), s.tipo,
    s.estado, s.costo_estimado, s.costo_total, s.moneda, s.referencia, s.detalle, p.comision_pct, s.creado_en, s.actualizado_en, s.aprobada_en
  from portal.solicitudes_garantia s
  join portal.operaciones o on o.id = s.operacion_id
  left join portal.avisos a on a.id = o.aviso_id
  left join portal.publicadores pb on pb.id = o.publicador_id
  left join portal.proveedores_garantia p on p.id = s.proveedor_id
  where portal.es_curador() or portal.es_plataforma()
  order by s.creado_en desc
  limit least(greatest(coalesce(p_limite, 200), 1), 500)
$$;

-- ---------------------------------------------------------------------
-- 7. Políticas (RLS)
-- ---------------------------------------------------------------------
drop policy if exists "proveedores_garantia la plataforma" on portal.proveedores_garantia;
create policy "proveedores_garantia la plataforma" on portal.proveedores_garantia for select
  using (portal.es_curador() or portal.es_plataforma());

drop policy if exists "solicitudes_garantia de las partes" on portal.solicitudes_garantia;
create policy "solicitudes_garantia de las partes" on portal.solicitudes_garantia for select
  using (portal.es_parte(operacion_id));

-- ---------------------------------------------------------------------
-- 8. Permisos de tabla y de función
-- ---------------------------------------------------------------------
revoke all on portal.proveedores_garantia, portal.solicitudes_garantia from public, anon, authenticated;
grant select on portal.proveedores_garantia, portal.solicitudes_garantia to authenticated;

revoke all on function portal._garantia_base(uuid), portal._garantia_impedimento(uuid), portal._garantia_url(text, text, uuid)
  from public, anon, authenticated;
revoke all on function portal.garantias_disponibles(), portal.elegir_garantia(uuid, uuid), portal.usar_garantia_propia(uuid, text),
  portal.actualizar_garantia(uuid, text, numeric, text, text), portal.guardar_proveedor_garantia(uuid, jsonb),
  portal.solicitudes_garantia_lista(integer) from public, anon;
grant execute on function portal.garantias_disponibles(), portal.elegir_garantia(uuid, uuid), portal.usar_garantia_propia(uuid, text),
  portal.actualizar_garantia(uuid, text, numeric, text, text), portal.guardar_proveedor_garantia(uuid, jsonb),
  portal.solicitudes_garantia_lista(integer) to authenticated;

notify pgrst, 'reload schema';

-- Controles
select 'tablas nuevas' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal' and table_name in ('proveedores_garantia', 'solicitudes_garantia')) = 2 as ok
union all select 'dos ejemplos inactivos', (select count(*) from portal.proveedores_garantia where ejemplo and not activo) = 2
union all select 'ningún ejemplo activo', not exists (select 1 from portal.proveedores_garantia where ejemplo and activo)
union all select 'reglas de garantía y seguro', (select count(*) from portal.reglas_cobro where escenario = 'Rieles · octubre 2026'
  and evento in ('garantia_emitida', 'seguro_emitido') and paga = 'tercero') = 2
union all select 'todo en simulación', not exists (select 1 from portal.reglas_cobro where cobra);
