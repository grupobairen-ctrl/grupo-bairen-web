-- =====================================================================
-- BAIREN · Portal · Migración 32 · Avisos y cruce de búsquedas
--
-- 9/10/2026. Riel "que nada quede sin contestar": cada mensaje y cada paso de una operación le llega a la otra parte,
-- y cada búsqueda activa se cruza con las unidades publicadas.
--
-- Qué agrega (nada se borra; solo tablas, funciones y triggers nuevos):
--   1. portal.notificaciones: los avisos de cada cuenta (en la campana del header y en avisos.html; por mail, los que
--      no leyó). Cada uno ve y marca solo los suyos.
--   2. portal.preferencias_aviso: si la cuenta quiere los avisos también por mail (sin fila: sí).
--   3. Triggers que avisan a la contraparte:
--      · un mensaje nuevo, al interesado o a todo el equipo del publicador (titular y membresías vigentes). Si llegan
--        varios seguidos de la misma operación, se suman en un solo aviso sin leer ("3 mensajes nuevos de Lucía P.").
--        Cuando la parte lee el chat (marcar_leidos), el aviso queda leído;
--      · un paso importante (visita, solicitud, reserva, documento, pago, garantía, cierre, caída), a la otra parte;
--        si lo registra el sistema o la plataforma, a las dos;
--      · en Búsquedas: una propuesta nueva, al dueño de la búsqueda; aceptada o rechazada, al equipo del publicador.
--   4. portal.coincidencias + portal.calcular_coincidencias(): cruza las búsquedas activas con las unidades publicadas
--      (operación compatible, zona o barrio, ambientes y dormitorios mínimos, precio máximo en la misma moneda). Por
--      cada coincidencia nueva avisa al que busca ("Hay una unidad para tu búsqueda") y al publicador ("Alguien busca
--      algo como tu unidad", sin datos de quién). Ninguna se avisa dos veces. La corre el cron (api/portal-avisos.js)
--      con la clave de servicio, o la plataforma.
--   5. portal.mis_coincidencias(): las del publicador de la sesión, con lo público de cada búsqueda.
--   6. Para el servidor (solo clave de servicio): avisos_para_mail() agrupa por persona lo pendiente de mandar por mail
--      y marcar_mail_enviado() lo marca.
--
-- Permisos: RLS en las tablas nuevas; los clientes solo leen lo suyo y escriben por funciones SECURITY DEFINER.
-- Si un aviso falla, el mensaje o el paso igual se guarda (los triggers atrapan el error y dejan un warning).
-- Ensayada en una transacción deshecha. Vuelta atrás: migracion-32-avisos-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------
create table if not exists portal.notificaciones (
  id               bigint generated always as identity primary key,
  usuario          uuid not null references auth.users(id) on delete cascade,
  tipo             text not null,
  titulo           text not null,
  texto            text,
  contexto         text,                 -- la unidad o la búsqueda de la que habla ("Dos ambientes · Palermo")
  url              text,                 -- relativa al portal: mensajes.html?op=…, propiedad.html?id=…, avisos.html…
  operacion_id     uuid references portal.operaciones(id) on delete cascade,
  busqueda_id      uuid references portal.busquedas(id) on delete cascade,
  aviso_id         uuid references portal.avisos(id) on delete set null,
  lado             text,                 -- el papel de quien recibe en la operación
  cantidad         integer not null default 1,   -- mensajes o búsquedas sumados en este aviso
  datos            jsonb,
  leida_en         timestamptz,
  creado_en        timestamptz not null default now(),
  actualizada_en   timestamptz not null default now(),
  email_enviado_en timestamptz,
  constraint m32_notif_tipo check (tipo in ('mensaje','paso','propuesta','propuesta_respondida','coincidencia','coincidencia_pub')),
  constraint m32_notif_lado check (lado is null or lado in ('interesado','publicador','plataforma')),
  constraint m32_notif_textos check (char_length(titulo) between 1 and 160 and char_length(coalesce(texto, '')) <= 400
    and char_length(coalesce(contexto, '')) <= 200 and char_length(coalesce(url, '')) <= 300),
  constraint m32_notif_cantidad check (cantidad between 0 and 100000),
  constraint m32_notif_datos check (datos is null or octet_length(datos::text) <= 4096)
);
create index if not exists notificaciones_usuario_idx on portal.notificaciones (usuario, actualizada_en desc);
create index if not exists notificaciones_sin_leer_idx on portal.notificaciones (usuario) where leida_en is null;
create index if not exists notificaciones_mail_idx on portal.notificaciones (actualizada_en) where email_enviado_en is null and leida_en is null;
create index if not exists notificaciones_op_idx on portal.notificaciones (operacion_id) where operacion_id is not null;
alter table portal.notificaciones enable row level security;

create table if not exists portal.preferencias_aviso (
  usuario        uuid primary key references auth.users(id) on delete cascade,
  email          boolean not null default true,
  actualizado_en timestamptz not null default now()
);
alter table portal.preferencias_aviso enable row level security;

create table if not exists portal.coincidencias (
  id           bigint generated always as identity primary key,
  busqueda_id  uuid not null references portal.busquedas(id) on delete cascade,
  aviso_id     uuid not null references portal.avisos(id) on delete cascade,
  puntaje      integer not null default 0,
  creado_en    timestamptz not null default now(),
  avisado_en   timestamptz,
  constraint m32_coin_unica unique (busqueda_id, aviso_id),
  constraint m32_coin_puntaje check (puntaje between 0 and 100)
);
create index if not exists coincidencias_aviso_idx on portal.coincidencias (aviso_id);
create index if not exists coincidencias_pendientes_idx on portal.coincidencias (busqueda_id) where avisado_en is null;
alter table portal.coincidencias enable row level security;

-- ---------------------------------------------------------------------
-- 2. Ayudas internas (prefijo _ntf_: solo las llaman otras funciones)
-- ---------------------------------------------------------------------
-- Texto sin tildes y en minúscula, para comparar zonas y barrios ("Núñez" = "nunez")
create or replace function portal._ntf_norm(p text) returns text language sql immutable as $$
  select nullif(btrim(lower(translate(coalesce(p, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))), '')
$$;

-- "USD 1.200" / "$ 450.000"
create or replace function portal._ntf_monto(p_monto numeric, p_moneda text) returns text language sql immutable as $$
  select case when p_monto is null then null
    else (case when p_moneda = 'ARS' then '$ ' else 'USD ' end) || replace(to_char(round(p_monto), 'FM999,999,999,990'), ',', '.') end
$$;

-- Una fecha de los datos de un paso, sin romper si viene mal escrita
create or replace function portal._ntf_ts(p text) returns timestamptz language plpgsql immutable as $$
begin
  return nullif(btrim(coalesce(p, '')), '')::timestamptz;
exception when others then return null;
end $$;

-- "20/10, 15:00 h" en Buenos Aires
create or replace function portal._ntf_fecha(p timestamptz) returns text language sql stable as $$
  select case when p is null then null else to_char(p at time zone 'America/Argentina/Buenos_Aires', 'DD/MM, HH24:MI') || ' h' end
$$;

-- La unidad, en pocas palabras. Para quien busca: "Dos ambientes · Palermo" (la dirección puede estar reservada).
-- Para el publicador, como la conoce: "Gorriti 4800 · 4B".
create or replace function portal._ntf_unidad(p_aviso uuid, p_publicador boolean default false) returns text
language sql stable security definer set search_path to 'portal', 'public' as $$
  select left(case when p_publicador and nullif(btrim(coalesce(a.direccion, '')), '') is not null
      then btrim(a.direccion) || coalesce(' · ' || nullif(btrim(coalesce(a.unidad, '')), ''), '')
      else coalesce(nullif(btrim(a.titulo), ''), nullif(btrim(coalesce(a.tipo, '') || ' en ' || coalesce(a.barrio, '')), 'en'), 'Una unidad')
        || case when a.barrio is not null and position(lower(a.barrio) in lower(coalesce(a.titulo, ''))) = 0 then ' · ' || a.barrio else '' end
    end, 200)
  from portal.avisos a where a.id = p_aviso
$$;

-- Lo público de una búsqueda, en una línea: "Mediano plazo · 2+ ambientes · Palermo, Recoleta · hasta USD 1.500 por mes"
create or replace function portal._ntf_busqueda(p_busqueda uuid) returns text
language sql stable security definer set search_path to 'portal', 'public' as $$
  select left(concat_ws(' · ',
    case b.linea when 'temporario' then 'Estadía corta (hasta 3 meses)' when 'mediano' then 'Mediano plazo'
      when 'tradicional' then 'Alquiler a largo plazo' when 'venta' then 'Compra' when 'pozo' then 'Compra en pozo' end,
    case when b.ambientes_min > 0 then b.ambientes_min || '+ ambientes' end,
    case when cardinality(b.zonas) > 0 then array_to_string(b.zonas[1:3], ', ') || case when cardinality(b.zonas) > 3 then ' y más' else '' end end,
    case when b.precio_max > 0 then 'hasta ' || portal._ntf_monto(b.precio_max, b.moneda) || case when b.operacion <> 'venta' then ' por mes' else '' end end
  ), 400)
  from portal.busquedas b where b.id = p_busqueda
$$;

-- El equipo de un publicador: el titular de la cuenta y las personas con membresía vigente
create or replace function portal._ntf_equipo(p_pub uuid) returns setof uuid
language sql stable security definer set search_path to 'portal', 'public' as $$
  select pb.auth_user_id from portal.publicadores pb where pb.id = p_pub and pb.auth_user_id is not null
  union
  select pe.auth_user_id from portal.membresias m join portal.personas pe on pe.id = m.persona_id
   where m.publicador_id = p_pub and m.hasta is null and pe.auth_user_id is not null
$$;

-- A quién le llega algo de una operación, según de qué lado vino (null: de la plataforma o del sistema, a las dos partes)
create or replace function portal._ntf_destinatarios(p_op uuid, p_origen text)
returns table (usuario uuid, lado text)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select o.interesado_user, 'interesado'::text from portal.operaciones o
   where o.id = p_op and o.interesado_user is not null and p_origen is distinct from 'interesado'
  union
  select e.e, 'publicador'::text from portal.operaciones o cross join lateral portal._ntf_equipo(o.publicador_id) as e(e)
   where o.id = p_op and p_origen is distinct from 'publicador'
$$;

-- El servidor con la clave de servicio, o una conexión directa a la base (SQL Editor): nunca una sesión ni anon
create or replace function portal._ntf_es_servicio() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or (auth.uid() is null and coalesce(auth.jwt() ->> 'role', '') not in ('anon', 'authenticated'))
$$;

-- Crea un aviso o, con p_agrupar, lo suma al último sin leer de la misma cuenta, tipo y operación/búsqueda/unidad.
-- p_titulo_varios lleva {n} ("{n} mensajes nuevos de Lucía P."). Si ya se había mandado por mail hace más de 6 horas,
-- vuelve a quedar pendiente de mail: como mucho un mail cada 6 horas por conversación sin leer.
create or replace function portal._ntf_avisar(
  p_usuario uuid, p_tipo text, p_titulo text, p_texto text, p_contexto text, p_url text,
  p_op uuid default null, p_busqueda uuid default null, p_aviso uuid default null, p_lado text default null,
  p_datos jsonb default null, p_agrupar boolean default false, p_titulo_varios text default null, p_cantidad integer default 1)
returns bigint
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v portal.notificaciones; v_id bigint; v_n integer;
begin
  if p_usuario is null then return null; end if;
  if p_agrupar then
    select * into v from portal.notificaciones n
     where n.usuario = p_usuario and n.tipo = p_tipo and n.leida_en is null
       and n.operacion_id is not distinct from p_op and n.busqueda_id is not distinct from p_busqueda and n.aviso_id is not distinct from p_aviso
     order by n.id desc limit 1 for update;
    if v.id is not null then
      v_n := v.cantidad + greatest(coalesce(p_cantidad, 1), 0);
      update portal.notificaciones set
        cantidad = v_n,
        titulo = left(case when v_n > 1 and p_titulo_varios is not null then replace(p_titulo_varios, '{n}', v_n::text) else p_titulo end, 160),
        texto = left(coalesce(p_texto, v.texto), 400),
        contexto = left(coalesce(p_contexto, v.contexto), 200),
        url = left(coalesce(p_url, v.url), 300),
        lado = coalesce(p_lado, v.lado),
        actualizada_en = now(),
        email_enviado_en = case when v.email_enviado_en < now() - interval '6 hours' then null else v.email_enviado_en end
      where id = v.id;
      return v.id;
    end if;
  end if;
  insert into portal.notificaciones (usuario, tipo, titulo, texto, contexto, url, operacion_id, busqueda_id, aviso_id, lado, datos, cantidad)
  values (p_usuario, p_tipo, left(p_titulo, 160), left(p_texto, 400), left(p_contexto, 200), left(p_url, 300),
          p_op, p_busqueda, p_aviso, p_lado, p_datos, greatest(coalesce(p_cantidad, 1), 0))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 3. Mensajes: avisan a la otra parte; leerlos marca el aviso
-- ---------------------------------------------------------------------
create or replace function portal.trg_ntf_mensaje() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_op portal.operaciones; r record; v_de text; v_ctx text; v_ctx_pub text; v_txt text; v_primero boolean;
begin
  begin
    select * into v_op from portal.operaciones where id = new.operacion_id;
    if v_op.id is null then return null; end if;
    v_ctx := portal._ntf_unidad(v_op.aviso_id);
    v_ctx_pub := portal._ntf_unidad(v_op.aviso_id, true);
    v_txt := left(regexp_replace(btrim(new.texto), '\s+', ' ', 'g'), 160);
    v_de := coalesce(case new.lado
      when 'interesado' then portal.nombre_interesado(v_op.interesado_user)
      when 'publicador' then (select nullif(btrim(nombre), '') from portal.publicadores where id = v_op.publicador_id)
      else 'BAIREN' end, 'BAIREN');
    v_primero := new.lado = 'interesado' and not exists (select 1 from portal.mensajes m where m.operacion_id = new.operacion_id and m.id < new.id);
    for r in select d.usuario, d.lado from portal._ntf_destinatarios(new.operacion_id, case when new.lado in ('interesado','publicador') then new.lado end) d loop
      continue when r.usuario = new.autor or r.usuario is not distinct from auth.uid();
      perform portal._ntf_avisar(r.usuario, 'mensaje',
        case when v_primero then 'Nueva consulta de ' || v_de else 'Mensaje nuevo de ' || v_de end,
        v_txt, case when r.lado = 'publicador' then v_ctx_pub else v_ctx end, 'mensajes.html?op=' || new.operacion_id,
        new.operacion_id, null, v_op.aviso_id, r.lado, null, true, '{n} mensajes nuevos de ' || v_de, 1);
    end loop;
  exception when others then
    raise warning 'avisos (mensaje): %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists trg_ntf_mensaje on portal.mensajes;
create trigger trg_ntf_mensaje after insert on portal.mensajes for each row execute function portal.trg_ntf_mensaje();

-- Cuando un lado lee el chat (portal.marcar_leidos), el aviso de esos mensajes queda leído para todo ese lado
create or replace function portal.trg_ntf_mensaje_leido() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  begin
    update portal.notificaciones n set leida_en = now()
      from (select distinct x.operacion_id, case x.lado when 'interesado' then 'publicador' when 'publicador' then 'interesado' end as lector
              from nuevos x where x.leido_en is not null) l
     where n.tipo = 'mensaje' and n.leida_en is null and n.operacion_id = l.operacion_id and n.lado = l.lector;
  exception when others then
    raise warning 'avisos (leídos): %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists trg_ntf_mensaje_leido on portal.mensajes;
create trigger trg_ntf_mensaje_leido after update on portal.mensajes referencing new table as nuevos
  for each statement execute function portal.trg_ntf_mensaje_leido();

-- ---------------------------------------------------------------------
-- 4. Pasos: cada paso importante le llega a la contraparte
-- ---------------------------------------------------------------------
create or replace function portal.trg_ntf_hito() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare
  v_op portal.operaciones; r record; v_tit text; v_txt text; v_ctx text; v_ctx_pub text; d jsonb := coalesce(new.datos, '{}'::jsonb);
  v_fecha timestamptz; v_monto text;
begin
  begin
    -- La consulta, la conversación y la propuesta aceptada ya avisan por el mensaje o por la propuesta
    if new.tipo in ('conversacion','whatsapp','propuesta_aceptada','visita_realizada','cobro_mensual') then return null; end if;
    select * into v_op from portal.operaciones where id = new.operacion_id;
    if v_op.id is null then return null; end if;
    v_ctx := portal._ntf_unidad(v_op.aviso_id);
    v_ctx_pub := portal._ntf_unidad(v_op.aviso_id, true);

    -- Una consulta sin mensaje igual le llega al publicador (con mensaje, el primero se suma a este aviso)
    if new.tipo = 'consulta' then
      for r in select * from portal._ntf_destinatarios(new.operacion_id, 'interesado') loop
        continue when r.usuario is not distinct from auth.uid() or r.usuario is not distinct from new.autor;
        perform portal._ntf_avisar(r.usuario, 'mensaje', 'Nueva consulta de ' || coalesce(portal.nombre_interesado(v_op.interesado_user), 'alguien'),
          null, v_ctx_pub, 'mensajes.html?op=' || new.operacion_id, new.operacion_id, null, v_op.aviso_id, r.lado,
          jsonb_build_object('consulta', true), false, null, 0);
      end loop;
      return null;
    end if;

    v_fecha := portal._ntf_ts(d ->> 'fecha');
    v_monto := portal._ntf_monto(nullif(d ->> 'monto', '')::numeric, coalesce(d ->> 'moneda', v_op.moneda));
    v_tit := case new.tipo
      when 'visita_pedida'      then 'Pidieron una visita'
      when 'visita_confirmada'  then 'Visita confirmada'
      when 'visita_cancelada'   then 'Visita cancelada'
      when 'solicitud_enviada'  then 'Recibiste una solicitud'
      when 'solicitud_aceptada' then 'Aceptaron tu solicitud'
      when 'solicitud_rechazada' then 'Tu solicitud no avanzó'
      when 'reserva'            then 'Reserva registrada'
      when 'reserva_pedida'     then 'Pidieron la reserva'
      when 'reserva_pagada'     then 'Reserva pagada'
      when 'reserva_vencida'    then 'La reserva venció'
      when 'reserva_devuelta'   then 'Reserva devuelta'
      when 'contrato_generado'  then 'Hay un contrato para revisar'
      when 'documento_generado' then 'Hay un documento para firmar'
      when 'contrato_firmado'   then 'Contrato firmado'
      when 'documento_firmado'  then 'Documento firmado'
      when 'pago_recibido'      then 'Pago recibido'
      when 'garantia_elegida'   then 'Eligió la garantía'
      when 'garantia_emitida'   then 'Garantía aprobada'
      when 'seguro_emitido'     then 'Seguro emitido'
      when 'lead_inversor'      then 'Consulta de inversor verificado'
      when 'cierre'             then 'Operación cerrada'
      when 'caida'              then 'La operación quedó sin acuerdo'
      when 'reabierta'          then 'Se retomó la operación'
    end;
    if v_tit is null then return null; end if;
    v_txt := case new.tipo
      when 'visita_pedida'     then coalesce('Propone el ' || portal._ntf_fecha(v_fecha) || '.', 'Coordiná el día y la hora.')
      when 'visita_confirmada' then coalesce('El ' || portal._ntf_fecha(v_fecha) || '.', null) || coalesce(' ' || nullif(left(btrim(d ->> 'nota'), 120), ''), '')
      when 'reserva_pagada'    then coalesce('Seña de ' || v_monto || '.', null)
      when 'pago_recibido'     then concat_ws(' · ', v_monto, nullif(d ->> 'periodo', ''))
      when 'documento_generado' then nullif(left(btrim(coalesce(d ->> 'titulo', '')), 160), '')
      when 'documento_firmado' then nullif(left(btrim(coalesce(d ->> 'titulo', '')), 160), '')
      when 'caida'             then nullif(left(btrim(coalesce(d ->> 'motivo', '')), 200), '')
      when 'solicitud_enviada' then 'Revisala y respondé desde la conversación.'
    end;
    for r in select * from portal._ntf_destinatarios(new.operacion_id, case when new.lado in ('interesado','publicador') then new.lado end) loop
      continue when r.usuario is not distinct from new.autor or r.usuario is not distinct from auth.uid();
      perform portal._ntf_avisar(r.usuario, 'paso', v_tit, v_txt, case when r.lado = 'publicador' then v_ctx_pub else v_ctx end,
        'mensajes.html?op=' || new.operacion_id,
        new.operacion_id, null, v_op.aviso_id, r.lado, jsonb_build_object('hito', new.tipo, 'hito_id', new.id), false);
    end loop;
  exception when others then
    raise warning 'avisos (paso): %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists trg_ntf_hito on portal.hitos;
create trigger trg_ntf_hito after insert on portal.hitos for each row execute function portal.trg_ntf_hito();

-- ---------------------------------------------------------------------
-- 5. Búsquedas: propuesta nueva, aceptada o rechazada
-- ---------------------------------------------------------------------
create or replace function portal.trg_ntf_propuesta() returns trigger
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_b portal.busquedas; v_pub text; v_ctx text; e uuid;
begin
  begin
    v_ctx := portal._ntf_unidad(new.aviso_id);
    if tg_op = 'INSERT' then
      select * into v_b from portal.busquedas where id = new.busqueda_id;
      select nullif(btrim(nombre), '') into v_pub from portal.publicadores where id = new.publicador_id;
      if v_b.usuario is not null and v_b.usuario is distinct from auth.uid() then
        perform portal._ntf_avisar(v_b.usuario, 'propuesta', 'Recibiste una propuesta',
          coalesce(v_pub, 'Un publicador') || ' te propone una unidad para tu búsqueda.', v_ctx, 'se-busca.html#b-' || new.busqueda_id,
          null, new.busqueda_id, new.aviso_id, 'interesado', jsonb_build_object('propuesta_id', new.id), false);
      end if;
    elsif new.estado is distinct from old.estado and new.estado in ('aceptada', 'rechazada') then
      v_ctx := portal._ntf_unidad(new.aviso_id, true);
      for e in select * from portal._ntf_equipo(new.publicador_id) loop
        continue when e is not distinct from auth.uid();
        perform portal._ntf_avisar(e, 'propuesta_respondida',
          case when new.estado = 'aceptada' then 'Aceptaron tu propuesta' else 'Tu propuesta no fue aceptada' end,
          case when new.estado = 'aceptada' then 'Ya pueden conversar en BAIREN.' else 'Podés proponer otra unidad que encaje mejor.' end,
          v_ctx, case when new.estado = 'aceptada' and new.operacion_id is not null then 'mensajes.html?op=' || new.operacion_id else 'explorar.html#se-busca' end,
          case when new.estado = 'aceptada' then new.operacion_id end, null, new.aviso_id, 'publicador',
          jsonb_build_object('propuesta_id', new.id, 'estado', new.estado), false);
      end loop;
    end if;
  exception when others then
    raise warning 'avisos (propuesta): %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists trg_ntf_propuesta on portal.propuestas;
create trigger trg_ntf_propuesta after insert or update of estado on portal.propuestas for each row execute function portal.trg_ntf_propuesta();

-- ---------------------------------------------------------------------
-- 6. Cruce de búsquedas con unidades publicadas
-- ---------------------------------------------------------------------
-- Puntaje de 60 a 100 si la unidad cumple la búsqueda; null si no. Obligatorio: operación compatible (mediano con
-- mediano, alquiler con alquiler, venta con venta, pozo con etapa pozo o construcción), zona o barrio entre los
-- buscados (o cualquiera), ambientes y dormitorios mínimos, precio máximo en la misma moneda. Suman: el tipo, los m²,
-- la fecha de entrada y haber elegido zonas.
create or replace function portal._ntf_puntaje(b portal.busquedas, a portal.avisos) returns integer
language sql stable set search_path to 'portal', 'public' as $$
  select case when
      (case
         when b.operacion = 'mediano'  then a.operacion = 'mediano'
         when b.operacion = 'alquiler' then a.operacion = 'alquiler'
         when b.operacion = 'venta' and b.linea = 'pozo' then a.operacion = 'venta' and coalesce(a.etapa, '') in ('pozo', 'construccion')
         when b.operacion = 'venta'    then a.operacion = 'venta' and coalesce(a.etapa, '') not in ('pozo', 'construccion')
         else false end)
      and (cardinality(b.zonas) = 0 or exists (
            select 1 from unnest(b.zonas) z
             where portal._ntf_norm(z) = portal._ntf_norm(a.zona) or portal._ntf_norm(z) = portal._ntf_norm(a.barrio)
                or portal._ntf_norm(a.barrio) like portal._ntf_norm(z) || ' %'))
      and (coalesce(b.ambientes_min, 0) = 0 or coalesce(a.ambientes, 0) >= b.ambientes_min)
      and (coalesce(b.dormitorios_min, 0) = 0
           or coalesce(a.dormitorios, case when a.ambientes > 0 then greatest(1, a.ambientes - 1) end, 0) >= b.dormitorios_min)
      and (coalesce(b.precio_max, 0) = 0 or (a.precio is not null and a.moneda = b.moneda and a.precio <= b.precio_max))
    then 60
      + case when coalesce(b.tipo, '') = '' or lower(coalesce(a.tipo, '')) = lower(b.tipo) then 15 else 0 end
      + case when coalesce(b.m2_min, 0) = 0 or coalesce(a.m2_total, 0) >= b.m2_min then 10 else 0 end
      + case when b.desde is null or a.disponible_desde is null or a.disponible_desde <= b.desde then 10 else 0 end
      + case when cardinality(b.zonas) > 0 then 5 else 0 end
  end
$$;

-- Registra las coincidencias nuevas y avisa las pendientes (hasta p_max_por_busqueda por búsqueda en cada corrida,
-- las de mejor puntaje primero; las demás quedan para la próxima). Devuelve { nuevas, avisadas }.
create or replace function portal.calcular_coincidencias(p_max_por_busqueda integer default 3) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v_nuevas integer := 0; v_avisadas integer := 0; c record; v_ctx text; v_txt text; v_bus text; e uuid;
begin
  if not (portal._ntf_es_servicio() or portal.es_curador() or portal.es_plataforma()) then
    raise exception 'Solo la plataforma calcula las coincidencias.';
  end if;

  insert into portal.coincidencias (busqueda_id, aviso_id, puntaje)
  select b.id, a.id, x.p
  from portal.busquedas b
  join portal.avisos a on a.estado_curacion = 'publicado' and coalesce(a.estado, 'disponible') <> 'reservado'
  cross join lateral (select portal._ntf_puntaje(b, a) as p) x
  where b.estado = 'activa' and b.vence_en > now() and x.p is not null
    and not exists (select 1 from portal._ntf_equipo(a.publicador_id) eq(u) where eq.u = b.usuario)
    and not exists (select 1 from portal.propuestas pr where pr.busqueda_id = b.id and pr.aviso_id = a.id)
    and not exists (select 1 from portal.operaciones o where o.aviso_id = a.id and o.interesado_user = b.usuario)
  on conflict (busqueda_id, aviso_id) do nothing;
  get diagnostics v_nuevas = row_count;

  for c in
    select q.* from (
      select k.id, k.busqueda_id, k.aviso_id, k.puntaje, b.usuario, a.publicador_id, a.precio, a.moneda, a.operacion,
        row_number() over (partition by k.busqueda_id order by k.puntaje desc, k.id) as n
      from portal.coincidencias k
      join portal.busquedas b on b.id = k.busqueda_id and b.estado = 'activa' and b.vence_en > now()
      join portal.avisos a on a.id = k.aviso_id and a.estado_curacion = 'publicado' and coalesce(a.estado, 'disponible') <> 'reservado'
      where k.avisado_en is null
        and not exists (select 1 from portal.propuestas pr where pr.busqueda_id = k.busqueda_id and pr.aviso_id = k.aviso_id)
    ) q
    where q.n <= greatest(1, coalesce(p_max_por_busqueda, 3))
    order by q.busqueda_id, q.n
  loop
    v_ctx := portal._ntf_unidad(c.aviso_id);
    v_txt := portal._ntf_monto(c.precio, c.moneda) || case when c.operacion <> 'venta' and c.precio is not null then ' por mes' else '' end;
    perform portal._ntf_avisar(c.usuario, 'coincidencia', 'Hay una unidad para tu búsqueda', v_txt, v_ctx,
      'propiedad.html?id=' || c.aviso_id, null, c.busqueda_id, c.aviso_id, 'interesado', jsonb_build_object('puntaje', c.puntaje), false);
    v_bus := portal._ntf_busqueda(c.busqueda_id);
    v_ctx := portal._ntf_unidad(c.aviso_id, true);
    for e in select * from portal._ntf_equipo(c.publicador_id) loop
      perform portal._ntf_avisar(e, 'coincidencia_pub', 'Alguien busca algo como tu unidad', v_bus, v_ctx,
        'avisos.html?aviso=' || c.aviso_id || '#coincidencias', null, null, c.aviso_id, 'publicador', null, true,
        '{n} personas buscan algo como tu unidad', 1);
    end loop;
    update portal.coincidencias set avisado_en = now() where id = c.id;
    v_avisadas := v_avisadas + 1;
  end loop;
  return jsonb_build_object('nuevas', v_nuevas, 'avisadas', v_avisadas);
end $$;

-- Las coincidencias de las unidades del publicador de la sesión, con lo público de cada búsqueda (nunca quién busca)
create or replace function portal.mis_coincidencias()
returns table (aviso_id uuid, aviso_codigo text, aviso_titulo text, aviso_direccion text, aviso_barrio text, aviso_precio numeric,
  aviso_moneda text, aviso_operacion text, aviso_etapa text, foto text, busqueda_id uuid, puntaje integer, creado_en timestamptz,
  busqueda jsonb, propuesta text)
language sql stable security definer set search_path to 'portal', 'public' as $$
  select a.id, a.codigo, a.titulo, a.direccion, a.barrio, a.precio, a.moneda, a.operacion, a.etapa, portal.portada_de(a.id),
    b.id, k.puntaje, k.creado_en,
    jsonb_build_object('perfil', b.perfil, 'operacion', b.operacion, 'linea', b.linea, 'tipo', b.tipo, 'zonas', b.zonas,
      'ambientes_min', b.ambientes_min, 'dormitorios_min', b.dormitorios_min, 'm2_min', b.m2_min, 'precio_max', b.precio_max,
      'moneda', b.moneda, 'desde', b.desde, 'plazo_meses', b.plazo_meses, 'detalle', b.detalle, 'verificada', b.verificada,
      'vence_en', b.vence_en),
    (select pr.estado from portal.propuestas pr where pr.busqueda_id = b.id and pr.aviso_id = a.id limit 1)
  from portal.coincidencias k
  join portal.avisos a on a.id = k.aviso_id and a.estado_curacion = 'publicado'
  join portal.busquedas b on b.id = k.busqueda_id and b.estado = 'activa' and b.vence_en > now()
  where auth.uid() is not null and portal.soy_publicador(a.publicador_id)
  order by a.id, k.puntaje desc, k.creado_en desc
  limit 500
$$;

-- ---------------------------------------------------------------------
-- 7. Marcar leídos y preferencias (la sesión, sobre lo suyo)
-- ---------------------------------------------------------------------
-- p_ids null: todos los sin leer de la sesión
create or replace function portal.marcar_notificaciones(p_ids bigint[] default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  update portal.notificaciones set leida_en = now()
   where usuario = auth.uid() and leida_en is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function portal.guardar_preferencias_aviso(p_email boolean) returns boolean
language plpgsql security definer set search_path to 'portal', 'public' as $$
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  insert into portal.preferencias_aviso (usuario, email, actualizado_en) values (auth.uid(), coalesce(p_email, true), now())
  on conflict (usuario) do update set email = excluded.email, actualizado_en = now();
  return coalesce(p_email, true);
end $$;

-- ---------------------------------------------------------------------
-- 8. Mail (solo el servidor, con la clave de servicio)
-- ---------------------------------------------------------------------
-- Lo pendiente de mandar, agrupado por persona: sin leer, sin mail, quieto hace p_espera_min minutos (una conversación
-- activa no manda mail en el medio), de los últimos 3 días y con el mail prendido. Un aviso de mensajes que la otra
-- parte ya leyó en el chat (otro miembro del equipo) no va.
create or replace function portal.avisos_para_mail(p_espera_min integer default 10, p_limite integer default 100)
returns table (usuario uuid, email text, ids bigint[], items jsonb)
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
begin
  if not portal._ntf_es_servicio() then raise exception 'Solo el servidor.'; end if;
  return query
  with pend as (
    select n.* from portal.notificaciones n
    where n.leida_en is null and n.email_enviado_en is null
      and n.actualizada_en <= now() - make_interval(mins => greatest(0, coalesce(p_espera_min, 10)))
      and n.actualizada_en > now() - interval '3 days'
      and (n.tipo <> 'mensaje' or n.cantidad = 0 or exists (select 1 from portal.mensajes m
            where m.operacion_id = n.operacion_id and m.leido_en is null and m.lado is distinct from n.lado))
      and not exists (select 1 from portal.preferencias_aviso p where p.usuario = n.usuario and not p.email)
  )
  select p.usuario, u.email::text,
    array_agg(p.id order by p.actualizada_en desc),
    jsonb_agg(jsonb_build_object('id', p.id, 'tipo', p.tipo, 'titulo', p.titulo, 'texto', p.texto, 'contexto', p.contexto,
      'url', p.url, 'cantidad', p.cantidad, 'cuando', p.actualizada_en) order by p.actualizada_en desc)
  from pend p join auth.users u on u.id = p.usuario
  where u.email is not null and u.email <> ''
  group by p.usuario, u.email
  order by min(p.actualizada_en)
  limit greatest(1, least(coalesce(p_limite, 100), 500));
end $$;

create or replace function portal.marcar_mail_enviado(p_ids bigint[]) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare n integer;
begin
  if not portal._ntf_es_servicio() then raise exception 'Solo el servidor.'; end if;
  update portal.notificaciones set email_enviado_en = now() where id = any(coalesce(p_ids, '{}')) and email_enviado_en is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 9. Políticas (RLS)
-- ---------------------------------------------------------------------
drop policy if exists "notificaciones propias" on portal.notificaciones;
create policy "notificaciones propias" on portal.notificaciones for select using (usuario = auth.uid());
drop policy if exists "preferencias de aviso propias" on portal.preferencias_aviso;
create policy "preferencias de aviso propias" on portal.preferencias_aviso for select using (usuario = auth.uid());
drop policy if exists "coincidencias la plataforma" on portal.coincidencias;
create policy "coincidencias la plataforma" on portal.coincidencias for select using (portal.es_curador() or portal.es_plataforma());

-- ---------------------------------------------------------------------
-- 10. Permisos de tabla y de función
-- ---------------------------------------------------------------------
revoke all on portal.notificaciones, portal.preferencias_aviso, portal.coincidencias from anon, authenticated;
grant select on portal.notificaciones, portal.preferencias_aviso, portal.coincidencias to authenticated;
grant select, insert, update, delete on portal.notificaciones, portal.preferencias_aviso, portal.coincidencias to service_role;

-- Internas: solo las llaman otras funciones
revoke all on function portal._ntf_norm(text), portal._ntf_monto(numeric, text), portal._ntf_ts(text), portal._ntf_fecha(timestamptz),
  portal._ntf_unidad(uuid, boolean), portal._ntf_busqueda(uuid), portal._ntf_equipo(uuid), portal._ntf_destinatarios(uuid, text),
  portal._ntf_es_servicio(), portal._ntf_puntaje(portal.busquedas, portal.avisos),
  portal._ntf_avisar(uuid, text, text, text, text, text, uuid, uuid, uuid, text, jsonb, boolean, text, integer),
  portal.trg_ntf_mensaje(), portal.trg_ntf_mensaje_leido(), portal.trg_ntf_hito(), portal.trg_ntf_propuesta()
  from public, anon, authenticated;
-- La sesión
revoke all on function portal.calcular_coincidencias(integer), portal.mis_coincidencias(), portal.marcar_notificaciones(bigint[]),
  portal.guardar_preferencias_aviso(boolean), portal.avisos_para_mail(integer, integer), portal.marcar_mail_enviado(bigint[])
  from public, anon, authenticated;
grant execute on function portal.calcular_coincidencias(integer), portal.mis_coincidencias(), portal.marcar_notificaciones(bigint[]),
  portal.guardar_preferencias_aviso(boolean) to authenticated;
-- El servidor
grant execute on function portal.calcular_coincidencias(integer), portal.avisos_para_mail(integer, integer),
  portal.marcar_mail_enviado(bigint[]) to service_role;

notify pgrst, 'reload schema';

-- Controles
select 'tablas nuevas' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal'
     and table_name in ('notificaciones', 'preferencias_aviso', 'coincidencias')) = 3 as ok
union all select 'RLS prendido', (select bool_and(relrowsecurity) from pg_class
     where oid in ('portal.notificaciones'::regclass, 'portal.preferencias_aviso'::regclass, 'portal.coincidencias'::regclass))
union all select 'triggers de avisos', (select count(*) from pg_trigger where not tgisinternal
     and tgname in ('trg_ntf_mensaje', 'trg_ntf_mensaje_leido', 'trg_ntf_hito', 'trg_ntf_propuesta')) = 4
union all select 'anon no lee avisos', not has_table_privilege('anon', 'portal.notificaciones', 'select')
union all select 'la sesión no escribe avisos', not has_table_privilege('authenticated', 'portal.notificaciones', 'insert')
  and not has_table_privilege('authenticated', 'portal.notificaciones', 'update');
