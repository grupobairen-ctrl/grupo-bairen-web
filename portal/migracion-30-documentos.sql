-- =====================================================================
-- BAIREN · Portal · Migración 30 · Documentos y firma electrónica (riel de documentos)
--
-- 9/10/2026. Quien publica prepara la reserva o el contrato desde la operación; cada parte lo lee y lo firma en BAIREN
-- con firma electrónica (Ley 25.506): nombre y DNI tipeados, fecha y hora, IP, navegador y la huella SHA-256 del texto.
--   1. portal.plantillas_documento: los modelos (reserva; locación amoblada de mediano plazo; locación de largo plazo;
--      alojamiento turístico de estadía corta, Ley 6255), en Markdown simple con {{marcadores}} y con versión. Una
--      versión no se edita: se suma otra (portal.nueva_version_plantilla) y la anterior queda inactiva. Todos llevan la
--      leyenda "Modelo base · a validar por el abogado de BAIREN antes de usar".
--   2. portal.documentos (migración 27) suma el contenido renderizado, su huella, el modelo y la versión, las partes que
--      firman, los datos con que se armó y el vencimiento. Un documento armado acá no se cambia desde la página: solo se
--      firma o se anula por estas funciones (trg_documento_guarda).
--   3. portal.firmas: cada firma, con la huella del texto que se firmó. Las partes ven quién y cuándo; la IP y el
--      navegador solo los ve quien firmó y el equipo BAIREN.
--   4. Funciones: generar_documento, firmar_documento, anular_documento, documentos_de, documento_detalle y
--      nueva_version_plantilla. Los pasos van al recorrido con portal._hito: documento_generado (+ contrato_generado),
--      documento_firmado (+ contrato_firmado, que lleva la operación a la etapa Contrato). documento_firmado dispara la
--      regla "Contrato digital con firma" del escenario Rieles (USD 40, la paga el propietario, simulada).
--   5. Identidad: si existe portal.personas.identidad_estado (módulo de identidad), firmar exige 'verificada'. Se mira en
--      el momento, sin romper si la columna no está.
-- Nada de venta: la reserva y el boleto de compra los hace el corredor con el escribano.
-- Nada se borra. Vuelta atrás: migracion-30-documentos-rollback.sql.
-- =====================================================================

-- La huella: pgcrypto (en Supabase vive en el esquema extensions)
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Modelos
-- ---------------------------------------------------------------------
create table if not exists portal.plantillas_documento (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,
  version     integer not null default 1,
  titulo      text not null,
  cuerpo      text not null,
  activa      boolean not null default true,
  nota        text,
  creado_por  text,
  creado_en   timestamptz not null default now(),
  constraint m30_plantilla_tipo check (tipo in ('reserva','contrato_mediano','contrato_tradicional','contrato_temporario')),
  constraint m30_plantilla_version check (version >= 1),
  constraint m30_plantilla_unica unique (tipo, version),
  constraint m30_plantilla_textos check (char_length(btrim(titulo)) between 3 and 160 and char_length(cuerpo) between 50 and 60000
    and char_length(coalesce(nota, '')) <= 600 and char_length(coalesce(creado_por, '')) <= 160)
);
create unique index if not exists plantillas_documento_activa_uniq on portal.plantillas_documento (tipo) where activa;
alter table portal.plantillas_documento enable row level security;

-- ---------------------------------------------------------------------
-- 2. Documentos: el texto que se firma, su huella y quién tiene que firmar
-- ---------------------------------------------------------------------
alter table portal.documentos
  add column if not exists contenido          text,
  add column if not exists hash               text,
  add column if not exists plantilla_id       uuid references portal.plantillas_documento(id) on delete set null,
  add column if not exists plantilla_tipo     text,
  add column if not exists plantilla_version  integer,
  add column if not exists partes             text[],
  add column if not exists datos              jsonb,
  add column if not exists vence_en           timestamptz,
  add column if not exists anulado_en         timestamptz,
  add column if not exists motivo_anulacion   text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'm30_doc_hash') then
    alter table portal.documentos add constraint m30_doc_hash check (hash is null or hash ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'm30_doc_partes') then
    alter table portal.documentos add constraint m30_doc_partes check (partes is null
      or (cardinality(partes) between 1 and 3 and partes <@ array['publicador','interesado','plataforma']::text[]));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'm30_doc_textos') then
    alter table portal.documentos add constraint m30_doc_textos check (octet_length(coalesce(contenido, '')) <= 200000
      and char_length(coalesce(motivo_anulacion, '')) <= 300 and octet_length(coalesce(datos::text, '')) <= 8192);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'm30_doc_firmable') then
    alter table portal.documentos add constraint m30_doc_firmable check (contenido is null or (hash is not null and partes is not null));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Firmas
-- ---------------------------------------------------------------------
create table if not exists portal.firmas (
  id            bigint generated always as identity primary key,
  documento_id  uuid not null references portal.documentos(id) on delete cascade,
  lado          text not null,
  auth_uid      uuid not null,
  persona_id    uuid references portal.personas(id) on delete set null,
  nombre        text not null,
  dni           text not null,
  ip            text,
  user_agent    text,
  hash          text not null,
  firmado_en    timestamptz not null default now(),
  constraint m30_firma_lado check (lado in ('publicador','interesado','plataforma')),
  constraint m30_firma_unica unique (documento_id, lado),
  constraint m30_firma_nombre check (char_length(btrim(nombre)) between 5 and 120),
  constraint m30_firma_dni check (dni ~ '^[A-Z0-9]{6,12}$'),
  constraint m30_firma_hash check (hash ~ '^[0-9a-f]{64}$'),
  constraint m30_firma_textos check (char_length(coalesce(ip, '')) <= 100 and char_length(coalesce(user_agent, '')) <= 400)
);
create index if not exists firmas_doc_idx on portal.firmas (documento_id);
alter table portal.firmas enable row level security;

-- ---------------------------------------------------------------------
-- 4. Ayudas internas: formato del texto e identidad
-- ---------------------------------------------------------------------
-- "1 de noviembre de 2026"
create or replace function portal._doc_fecha(p date) returns text language sql immutable as $$
  select case when p is null then '—' else extract(day from p)::int || ' de ' ||
    (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from p)::int]
    || ' de ' || extract(year from p)::int end
$$;

-- "USD 1.200" · "$ 950.000" · "USD 1.200,50"
create or replace function portal._doc_monto(p numeric, p_moneda text) returns text language sql immutable as $$
  select case when p is null then '—' else
    (case when p_moneda = 'ARS' then '$ ' else 'USD ' end)
    || replace(to_char(trunc(x.v), 'FM999,999,999,999,990'), ',', '.')
    || case when x.v <> trunc(x.v) then ',' || lpad(((x.v - trunc(x.v)) * 100)::int::text, 2, '0') else '' end
  end
  from (select round(abs(p), 2) as v) x
$$;

-- "6 meses" · "1 mes" · "15 días"
create or replace function portal._doc_plazo(p_meses integer, p_dias integer) returns text language sql immutable as $$
  select case when p_dias is not null then p_dias || case when p_dias = 1 then ' día' else ' días' end
              when p_meses is not null then p_meses || case when p_meses = 1 then ' mes' else ' meses' end
              else '—' end
$$;

-- Texto que escribe una persona: en una línea, sin llaves (no puede inventar marcadores) y con tope
create or replace function portal._doc_txt(p text, p_max integer) returns text language sql immutable as $$
  select nullif(btrim(left(btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[{}]', '', 'g'), '\s+', ' ', 'g')), p_max)), '')
$$;

-- "30.111.222" (solo si son números)
create or replace function portal._doc_dni(p text) returns text language sql immutable as $$
  select case when p ~ '^[0-9]+$' then regexp_replace(p, '(\d)(?=(\d{3})+$)', '\1.', 'g') else p end
$$;

-- ¿Existe el requisito de identidad? (la columna la suma el módulo de identidad)
create or replace function portal._identidad_requerida() returns boolean
language sql stable security definer set search_path to 'portal', 'public' as $$
  select exists (select 1 from pg_attribute where attrelid = to_regclass('portal.personas') and attname = 'identidad_estado' and not attisdropped)
$$;

-- ¿La sesión puede firmar? Sin la columna, sí; con la columna, solo con identidad 'verificada'
create or replace function portal._identidad_ok() returns boolean
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare v text;
begin
  if not portal._identidad_requerida() then return true; end if;
  if auth.uid() is null then return false; end if;
  execute 'select identidad_estado::text from portal.personas where auth_user_id = $1 order by created_at limit 1' into v using auth.uid();
  return coalesce(v = 'verificada', false);
end $$;

-- ---------------------------------------------------------------------
-- 5. Guarda: un documento armado por BAIREN no se toca desde la página (solo por las funciones de abajo)
-- ---------------------------------------------------------------------
-- Corre con el rol de quien escribe: desde la página es authenticated; dentro de las funciones SECURITY DEFINER, el dueño.
create or replace function portal.trg_documento_guarda() returns trigger
language plpgsql set search_path to 'portal', 'public' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    if new.contenido is not null or new.hash is not null or new.plantilla_id is not null or new.plantilla_tipo is not null
       or new.plantilla_version is not null or new.partes is not null or new.datos is not null then
      raise exception 'Los documentos para firmar se preparan desde la operación.';
    end if;
    return new;
  end if;
  if old.contenido is not null then
    raise exception 'Este documento solo cambia al firmarlo o anularlo desde BAIREN.';
  end if;
  if (new.contenido, new.hash, new.plantilla_id, new.plantilla_tipo, new.plantilla_version, new.partes, new.datos)
     is distinct from (old.contenido, old.hash, old.plantilla_id, old.plantilla_tipo, old.plantilla_version, old.partes, old.datos) then
    raise exception 'Los documentos para firmar se preparan desde la operación.';
  end if;
  return new;
end $$;
drop trigger if exists trg_documento_guarda on portal.documentos;
create trigger trg_documento_guarda before insert or update on portal.documentos for each row execute function portal.trg_documento_guarda();

-- ---------------------------------------------------------------------
-- 6. Preparar un documento (quien publica o el equipo BAIREN)
-- ---------------------------------------------------------------------
-- p_tipo: 'reserva' | 'contrato'. El modelo del contrato sale de la línea de la operación.
-- p_datos: { fecha_inicio 'AAAA-MM-DD', plazo_meses | plazo_dias (estadía corta), monto (por mes; con plazo_dias, total),
--            moneda 'USD'|'ARS', deposito, sena y vence (reserva), servicios, ajuste (largo plazo), garantia,
--            registro (Ley 6255, estadía corta), huespedes }
create or replace function portal.generar_documento(p_op uuid, p_tipo text, p_datos jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare
  v_uid uuid := auth.uid(); v_lados text[]; v_lado text; o portal.operaciones; a portal.avisos; pb portal.publicadores;
  v_d jsonb := coalesce(p_datos, '{}'::jsonb); v_tpl portal.plantillas_documento; v_linea text; v_etapa_aviso text;
  v_inicio date; v_meses integer; v_dias integer; v_monto numeric; v_moneda text; v_dep numeric; v_sena numeric; v_vence timestamptz;
  v_servicios text; v_ajuste text; v_garantia text; v_registro text; v_huespedes integer;
  v_fin date; v_total numeric; v_vals jsonb; v_txt text; k text; val text; v_hash text; v_id uuid; v_int jsonb; v_dni text;
  v_vence_doc timestamptz; v_ba timestamp;
begin
  if v_uid is null then raise exception 'Ingresá para seguir.'; end if;
  v_lados := portal.lados_en(p_op);
  v_lado := case when 'publicador' = any(v_lados) then 'publicador' when 'plataforma' = any(v_lados) then 'plataforma' end;
  if v_lado is null then raise exception 'Solo quien publica prepara los documentos de la operación.'; end if;
  if p_tipo = 'boleto' then raise exception 'La reserva y el boleto de compra los hace el corredor con el escribano.'; end if;
  if p_tipo is null or p_tipo not in ('reserva','contrato') then raise exception 'Tipo de documento desconocido.'; end if;
  select * into o from portal.operaciones where id = p_op for update;
  if o.etapa in ('caida','cerrada') then raise exception 'La operación está cerrada.'; end if;
  if o.tipo = 'venta' or o.linea in ('venta','pozo') then
    raise exception 'En una venta, la reserva y el boleto de compra los hace el corredor con el escribano.';
  end if;
  if o.interesado_user is null then raise exception 'Falta la otra parte de la operación.'; end if;
  if exists (select 1 from portal.documentos d where d.operacion_id = p_op and d.tipo = p_tipo and d.estado = 'firmado') then
    raise exception '%', case when p_tipo = 'reserva' then 'Ya hay una reserva firmada en esta operación.' else 'Ya hay un contrato firmado en esta operación.' end;
  end if;
  if exists (select 1 from portal.documentos d where d.operacion_id = p_op and d.tipo = p_tipo and d.contenido is not null
               and d.estado in ('borrador','enviado') and (d.vence_en is null or d.vence_en > now())) then
    raise exception '%', case when p_tipo = 'reserva' then 'Ya hay una reserva sin firmar. Anulala antes de preparar otra.'
      else 'Ya hay un contrato sin firmar. Anulalo antes de preparar otro.' end;
  end if;

  -- Los datos que se completan al preparar
  begin
    v_inicio    := nullif(v_d ->> 'fecha_inicio', '')::date;
    v_meses     := round(nullif(v_d ->> 'plazo_meses', '')::numeric)::integer;
    v_dias      := round(nullif(v_d ->> 'plazo_dias', '')::numeric)::integer;
    v_monto     := nullif(v_d ->> 'monto', '')::numeric;
    v_dep       := nullif(v_d ->> 'deposito', '')::numeric;
    v_sena      := nullif(v_d ->> 'sena', '')::numeric;
    v_vence     := nullif(v_d ->> 'vence', '')::timestamptz;
    v_huespedes := round(nullif(v_d ->> 'huespedes', '')::numeric)::integer;
  exception when others then
    raise exception 'Revisá los datos: hay una fecha o un número mal escrito.';
  end;
  v_moneda    := coalesce(case when v_d ->> 'moneda' in ('USD','ARS') then v_d ->> 'moneda' end, o.moneda, 'USD');
  v_servicios := portal._doc_txt(v_d ->> 'servicios', 300);
  v_ajuste    := portal._doc_txt(v_d ->> 'ajuste', 300);
  v_garantia  := portal._doc_txt(v_d ->> 'garantia', 300);
  v_registro  := portal._doc_txt(v_d ->> 'registro', 60);

  if v_inicio is null then raise exception 'Falta la fecha de inicio.'; end if;
  if v_inicio < current_date - 30 or v_inicio > current_date + 400 then raise exception 'Revisá la fecha de inicio.'; end if;
  if v_monto is null or v_monto <= 0 then raise exception 'Falta el precio.'; end if;
  if v_monto > 1e12 or coalesce(v_dep, 0) > 1e12 or coalesce(v_sena, 0) > 1e12 then raise exception 'Revisá los montos.'; end if;
  if v_dep is not null and v_dep < 0 then raise exception 'El depósito no puede ser negativo.'; end if;
  if v_huespedes is not null and (v_huespedes < 1 or v_huespedes > 20) then raise exception 'Revisá la cantidad de huéspedes (de 1 a 20).'; end if;

  -- La línea: con el plazo en meses, un mediano plazo de hasta 3 meses es estadía corta (como en registrar_hito)
  select etapa into v_etapa_aviso from portal.avisos where id = o.aviso_id;
  v_linea := o.linea;
  if o.tipo = 'mediano' and v_meses is not null then v_linea := portal.linea_de('mediano', v_etapa_aviso, v_meses); end if;
  if v_linea = 'temporario' then
    if v_dias is null and v_meses is null then raise exception 'Falta el plazo de la estadía.'; end if;
    if v_dias is not null then
      v_meses := null;
      if v_dias < 1 or v_dias > 92 then raise exception 'La estadía corta es de hasta 3 meses (92 días).'; end if;
    elsif v_meses < 1 or v_meses > 3 then raise exception 'La estadía corta es de hasta 3 meses.'; end if;
  elsif v_linea in ('mediano','tradicional') then
    v_dias := null;
    if v_meses is null or v_meses < 1 or v_meses > 120 then raise exception 'Falta el plazo en meses (de 1 a 120).'; end if;
  else
    raise exception 'Esta operación no admite documentos de alquiler.';
  end if;

  if p_tipo = 'reserva' then
    if v_sena is null or v_sena <= 0 then raise exception 'Falta el monto de la seña.'; end if;
    if v_vence is null then raise exception 'Falta el vencimiento de la reserva.'; end if;
    if v_vence <= now() then raise exception 'El vencimiento tiene que ser un día y una hora que todavía no pasaron.'; end if;
    if v_vence > now() + interval '60 days' then raise exception 'La reserva puede vencer, como mucho, en 60 días.'; end if;
    v_vence_doc := v_vence;
  else
    if v_linea = 'temporario' and v_registro is null then raise exception 'Falta el número de registro de la Ley 6255 (estadía corta).'; end if;
    if v_linea = 'tradicional' and v_ajuste is null then raise exception 'Falta cómo se ajusta el precio (índice y cada cuánto).'; end if;
    v_vence_doc := now() + interval '15 days';
  end if;

  select * into v_tpl from portal.plantillas_documento
   where tipo = case when p_tipo = 'reserva' then 'reserva' else 'contrato_' || v_linea end and activa
   order by version desc limit 1;
  if v_tpl.id is null then raise exception 'No hay un modelo activo para este documento.'; end if;

  -- La operación se completa con el plazo (igual que registrar_hito)
  if o.tipo = 'mediano' and v_meses is not null and (o.plazo_meses is distinct from v_meses or o.linea is distinct from v_linea) then
    update portal.operaciones set plazo_meses = v_meses, linea = v_linea, actualizada_en = now() where id = p_op;
  end if;

  -- Los datos de la operación, el aviso, quien publica y quien busca
  select * into a from portal.avisos where id = o.aviso_id;
  select * into pb from portal.publicadores where id = o.publicador_id;
  v_int := portal.contacto_interesado(p_op);
  select upper(regexp_replace(coalesce(p.dni, ''), '[^0-9A-Za-z]', '', 'g')) into v_dni from portal.personas p where p.auth_user_id = o.interesado_user order by p.created_at limit 1;
  v_fin := case when v_dias is not null then v_inicio + v_dias else (v_inicio + make_interval(months => v_meses))::date - 1 end;
  v_total := case when v_dias is not null then v_monto else v_monto * v_meses end;
  v_ba := now() at time zone 'America/Argentina/Buenos_Aires';

  v_vals := jsonb_build_object(
    'fecha_documento', portal._doc_fecha(v_ba::date),
    'publicador_nombre', coalesce(nullif(btrim(pb.razon_social), ''), nullif(btrim(pb.nombre), ''), 'Quien publica'),
    'publicador_cuit', case when nullif(btrim(pb.cuit), '') is not null then ', CUIT ' || btrim(pb.cuit) else '' end,
    'publicador_caracter', case when pb.tipo = 'dueno' then 'en su carácter de propietario del inmueble'
      else 'en representación del propietario del inmueble, con facultades suficientes para este acto' end,
    'interesado_nombre', coalesce(nullif(btrim(v_int ->> 'nombre'), ''), 'Quien firma al pie'),
    'interesado_doc', case when nullif(v_dni, '') is not null then 'DNI ' || portal._doc_dni(v_dni) else 'con el documento que figura en su firma' end,
    'inmueble_direccion', coalesce(nullif(btrim(coalesce(a.direccion, '') || case when nullif(btrim(a.unidad), '') is not null then ', unidad ' || btrim(a.unidad) else '' end), ''), a.titulo, '—'),
    'inmueble_barrio', coalesce(nullif(btrim(a.barrio), ''), '—'),
    'inmueble_codigo', coalesce(nullif(btrim(a.codigo), ''), '—'),
    'destino', case when v_linea = 'temporario' then 'una estadía corta con fines turísticos' else 'vivienda' end,
    'fecha_inicio', portal._doc_fecha(v_inicio),
    'fecha_fin', portal._doc_fecha(v_fin),
    'plazo', portal._doc_plazo(v_meses, v_dias),
    'precio', portal._doc_monto(v_monto, v_moneda) || case when v_dias is not null then ' por toda la estadía' else ' por mes' end
      || case when v_linea = 'temporario' and v_dias is null then ' (' || portal._doc_monto(v_total, v_moneda) || ' por toda la estadía)' else '' end,
    'moneda_nombre', case when v_moneda = 'ARS' then 'pesos argentinos' else 'dólares estadounidenses' end,
    'deposito', case when coalesce(v_dep, 0) > 0 then portal._doc_monto(v_dep, v_moneda) else 'sin depósito' end,
    'sena', portal._doc_monto(v_sena, v_moneda),
    'vence', case when v_vence is null then '—' else portal._doc_fecha((v_vence at time zone 'America/Argentina/Buenos_Aires')::date)
      || ' a las ' || to_char(v_vence at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI') || ' h' end,
    'servicios', coalesce(v_servicios, 'ninguno'),
    'ajuste', case when v_ajuste is null then 'El precio se mantiene fijo durante todo el plazo.'
      else 'El precio se ajusta así: ' || rtrim(v_ajuste, '.') || '.' end,
    'garantia', case when v_garantia is null then 'Las partes acuerdan la garantía por separado. La parte locataria puede ofrecer la que prefiera: nadie le impone una empresa de garantías ni una aseguradora.'
      else 'La parte locataria ofrece como garantía: ' || rtrim(v_garantia, '.') || '. Es la que eligió: nadie le impone una empresa de garantías ni una aseguradora.' end,
    'registro', coalesce(v_registro, '—'),
    'huespedes', case when v_huespedes is not null then 'hasta ' || v_huespedes || case when v_huespedes = 1 then ' persona' else ' personas' end
      else 'las personas que acuerden las partes' end
  );

  -- El texto final: marcadores reemplazados; lo que no se conoce queda con una raya
  v_txt := v_tpl.cuerpo;
  for k, val in select key, value from jsonb_each_text(v_vals) loop
    v_txt := replace(v_txt, '{{' || k || '}}', regexp_replace(coalesce(val, '—'), '[{}]', '', 'g'));
  end loop;
  v_txt := regexp_replace(v_txt, '\{\{[a-z_]+\}\}', '—', 'g');
  v_hash := encode(extensions.digest(convert_to(v_txt, 'UTF8'), 'sha256'), 'hex');

  insert into portal.documentos (operacion_id, tipo, titulo, estado, contenido, hash, plantilla_id, plantilla_tipo, plantilla_version,
                                 partes, datos, vence_en, creado_por)
  values (p_op, p_tipo, v_tpl.titulo, 'enviado', v_txt, v_hash, v_tpl.id, v_tpl.tipo, v_tpl.version,
          array['publicador','interesado'],
          jsonb_strip_nulls(jsonb_build_object('fecha_inicio', v_inicio, 'fecha_fin', v_fin, 'plazo_meses', v_meses, 'plazo_dias', v_dias,
            'monto', v_monto, 'moneda', v_moneda, 'deposito', v_dep, 'sena', v_sena, 'vence', v_vence, 'servicios', v_servicios,
            'ajuste', v_ajuste, 'garantia', v_garantia, 'registro', v_registro, 'huespedes', v_huespedes, 'monto_total', v_total, 'linea', v_linea)),
          v_vence_doc, v_uid)
  returning id into v_id;

  perform portal._hito(p_op, 'documento_generado', v_lado, jsonb_build_object('documento_id', v_id, 'tipo', p_tipo,
    'modelo', v_tpl.tipo, 'version', v_tpl.version, 'huella', left(v_hash, 16)));
  if p_tipo = 'contrato' then
    perform portal._hito(p_op, 'contrato_generado', v_lado, jsonb_build_object('documento_id', v_id));
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 7. Firmar (cada parte, una vez)
-- ---------------------------------------------------------------------
-- p_hash: la huella que vio quien firma (opcional). Si no coincide con la del documento, no se firma.
create or replace function portal.firmar_documento(p_doc uuid, p_nombre text, p_dni text, p_hash text default null) returns jsonb
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare
  v_uid uuid := auth.uid(); d portal.documentos; o portal.operaciones; v_lados text[]; v_lado text; v_nombre text; v_dni text;
  v_hdr json; v_ip text; v_ua text; v_persona uuid; v_dni_cuenta text; v_faltan text[];
begin
  if v_uid is null then raise exception 'Ingresá para firmar.'; end if;
  select * into d from portal.documentos where id = p_doc for update;
  if d.id is null then raise exception 'El documento no existe.'; end if;
  v_lados := portal.lados_en(d.operacion_id);
  if cardinality(v_lados) = 0 then raise exception 'No sos parte de esta operación.'; end if;
  if d.contenido is null or d.partes is null then raise exception 'Este documento no se firma en BAIREN.'; end if;
  if d.estado = 'anulado' then raise exception 'El documento fue anulado.'; end if;
  if d.estado = 'firmado' then raise exception 'El documento ya está firmado por todas las partes.'; end if;
  if d.estado <> 'enviado' then raise exception 'El documento todavía no está listo para firmar.'; end if;
  if d.vence_en is not null and d.vence_en <= now() then raise exception 'El documento venció. Pedile a quien publica que prepare uno nuevo.'; end if;
  select * into o from portal.operaciones where id = d.operacion_id;
  if o.etapa in ('caida','cerrada') then raise exception 'La operación está cerrada.'; end if;

  -- El lado que firma: uno de los que le tocan a la sesión y todavía no firmó
  select x.l into v_lado from unnest(d.partes) with ordinality as x(l, i)
   where x.l = any(v_lados) and not exists (select 1 from portal.firmas f where f.documento_id = d.id and f.lado = x.l)
   order by case when x.l = 'interesado' then 0 else 1 end, x.i limit 1;
  if v_lado is null then
    if exists (select 1 from portal.firmas f where f.documento_id = d.id and f.lado = any(v_lados)) then raise exception 'Ya firmaste este documento.'; end if;
    raise exception 'Este documento lo firman quien publica y quien busca.';
  end if;

  -- Lo que se firma es exactamente lo que se armó
  if encode(extensions.digest(convert_to(d.contenido, 'UTF8'), 'sha256'), 'hex') is distinct from d.hash then
    raise exception 'El texto del documento cambió y no se puede firmar. Avisale al equipo BAIREN.';
  end if;
  if p_hash is not null and lower(btrim(p_hash)) <> d.hash then
    raise exception 'El documento cambió mientras lo leías. Volvé a abrirlo antes de firmar.';
  end if;
  if not portal._identidad_ok() then raise exception 'Para firmar, primero verificá tu identidad en BAIREN.'; end if;

  v_nombre := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  if char_length(v_nombre) < 5 or char_length(v_nombre) > 120 or position(' ' in v_nombre) = 0 then
    raise exception 'Escribí tu nombre y apellido completos.';
  end if;
  v_dni := upper(regexp_replace(coalesce(p_dni, ''), '[^0-9A-Za-z]', '', 'g'));
  if v_dni !~ '^[A-Z0-9]{6,12}$' or v_dni !~ '[0-9]' then raise exception 'Revisá el DNI: solo los números, sin puntos.'; end if;
  select p.id, upper(regexp_replace(coalesce(p.dni, ''), '[^0-9A-Za-z]', '', 'g')) into v_persona, v_dni_cuenta
    from portal.personas p where p.auth_user_id = v_uid order by p.created_at limit 1;
  if nullif(v_dni_cuenta, '') is not null and v_dni_cuenta <> v_dni then raise exception 'El DNI no coincide con el de tu cuenta.'; end if;

  -- IP y navegador: los manda PostgREST en los encabezados del pedido
  begin v_hdr := nullif(current_setting('request.headers', true), '')::json; exception when others then v_hdr := null; end;
  v_ip := nullif(btrim(split_part(coalesce(v_hdr ->> 'x-forwarded-for', v_hdr ->> 'x-real-ip', ''), ',', 1)), '');
  v_ua := nullif(left(coalesce(v_hdr ->> 'user-agent', ''), 400), '');

  insert into portal.firmas (documento_id, lado, auth_uid, persona_id, nombre, dni, ip, user_agent, hash)
  values (d.id, v_lado, v_uid, v_persona, v_nombre, v_dni, left(v_ip, 100), v_ua, d.hash);

  select array_agg(x.l) into v_faltan from unnest(d.partes) as x(l)
   where not exists (select 1 from portal.firmas f where f.documento_id = d.id and f.lado = x.l);
  if v_faltan is null then
    update portal.documentos set estado = 'firmado', firmado_en = now() where id = d.id;
    perform portal._hito(d.operacion_id, 'documento_firmado', v_lado, jsonb_build_object('documento_id', d.id, 'tipo', d.tipo, 'huella', left(d.hash, 16)));
    if d.tipo = 'contrato' then
      update portal.operaciones set
        monto_contrato = coalesce(nullif(d.datos ->> 'monto_total', '')::numeric, monto_contrato),
        moneda         = coalesce(case when d.datos ->> 'moneda' in ('USD','ARS') then d.datos ->> 'moneda' end, moneda),
        plazo_meses    = coalesce(nullif(d.datos ->> 'plazo_meses', '')::integer, plazo_meses)
      where id = d.operacion_id;
      perform portal._hito(d.operacion_id, 'contrato_firmado', v_lado, jsonb_build_object('documento_id', d.id,
        'monto_contrato', d.datos -> 'monto_total', 'moneda', d.datos ->> 'moneda', 'plazo_meses', d.datos -> 'plazo_meses'));
    end if;
  end if;
  return jsonb_build_object('estado', case when v_faltan is null then 'firmado' else 'enviado' end, 'lado', v_lado,
    'faltan', coalesce(to_jsonb(v_faltan), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------
-- 8. Anular (solo quien publica, antes de que firmen todas las partes)
-- ---------------------------------------------------------------------
create or replace function portal.anular_documento(p_doc uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare d portal.documentos; v_pub uuid;
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  select * into d from portal.documentos where id = p_doc for update;
  if d.id is null then raise exception 'El documento no existe.'; end if;
  select publicador_id into v_pub from portal.operaciones where id = d.operacion_id;
  if not portal.soy_publicador(v_pub) then raise exception 'Solo quien publica puede anular el documento.'; end if;
  if d.estado = 'firmado' then raise exception 'Ya lo firmaron todas las partes: no se puede anular.'; end if;
  if d.estado = 'anulado' then raise exception 'El documento ya está anulado.'; end if;
  update portal.documentos set estado = 'anulado', anulado_en = now(), motivo_anulacion = portal._doc_txt(p_motivo, 300) where id = p_doc;
end $$;

-- ---------------------------------------------------------------------
-- 9. Leer: los documentos de una operación y un documento con su registro de firmas
-- ---------------------------------------------------------------------
create or replace function portal.documentos_de(p_op uuid) returns jsonb
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
begin
  if not portal.es_parte(p_op) then raise exception 'No sos parte de esta operación.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'tipo', d.tipo, 'titulo', d.titulo, 'estado', d.estado, 'hash', d.hash,
        'partes', to_jsonb(d.partes), 'datos', d.datos, 'vence_en', d.vence_en, 'creado_en', d.creado_en, 'firmado_en', d.firmado_en,
        'anulado_en', d.anulado_en, 'motivo_anulacion', d.motivo_anulacion, 'plantilla_tipo', d.plantilla_tipo,
        'plantilla_version', d.plantilla_version, 'firmable', d.contenido is not null,
        'firmas', coalesce((select jsonb_agg(jsonb_build_object('lado', f.lado, 'nombre', f.nombre, 'firmado_en', f.firmado_en) order by f.firmado_en)
                              from portal.firmas f where f.documento_id = d.id), '[]'::jsonb))
      order by d.creado_en)
    from portal.documentos d where d.operacion_id = p_op), '[]'::jsonb);
end $$;

create or replace function portal.documento_detalle(p_doc uuid) returns jsonb
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
declare d portal.documentos; v_lados text[]; v_plat boolean; v_firmar text;
begin
  select * into d from portal.documentos where id = p_doc;
  if d.id is null then raise exception 'El documento no existe.'; end if;
  v_lados := portal.lados_en(d.operacion_id);
  if cardinality(v_lados) = 0 then raise exception 'No sos parte de esta operación.'; end if;
  v_plat := 'plataforma' = any(v_lados);
  select x.l into v_firmar from unnest(coalesce(d.partes, '{}'::text[])) with ordinality as x(l, i)
   where x.l = any(v_lados) and not exists (select 1 from portal.firmas f where f.documento_id = d.id and f.lado = x.l)
   order by case when x.l = 'interesado' then 0 else 1 end, x.i limit 1;
  return jsonb_build_object(
    'documento', to_jsonb(d) - 'creado_por',
    'lados', to_jsonb(v_lados),
    'lado_firma', v_firmar,
    'puede_firmar', v_firmar is not null and d.contenido is not null and d.estado = 'enviado' and (d.vence_en is null or d.vence_en > now()),
    'puede_anular', d.estado in ('borrador','enviado') and 'publicador' = any(v_lados),
    'identidad_requerida', portal._identidad_requerida(),
    'identidad_ok', portal._identidad_ok(),
    'operacion', (select jsonb_build_object('id', o.id, 'etapa', o.etapa, 'linea', o.linea) from portal.operaciones o where o.id = d.operacion_id),
    'aviso', (select jsonb_build_object('titulo', a.titulo, 'barrio', a.barrio, 'codigo', a.codigo)
                from portal.operaciones o join portal.avisos a on a.id = o.aviso_id where o.id = d.operacion_id),
    'firmas', coalesce((select jsonb_agg((jsonb_build_object('lado', f.lado, 'nombre', f.nombre, 'dni', f.dni, 'firmado_en', f.firmado_en,
          'hash', f.hash, 'mia', f.auth_uid = auth.uid())
        || case when v_plat or f.auth_uid = auth.uid() then jsonb_build_object('ip', f.ip, 'user_agent', f.user_agent) else '{}'::jsonb end)
        order by f.firmado_en)
      from portal.firmas f where f.documento_id = d.id), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------
-- 10. Una versión nueva de un modelo (equipo BAIREN): la anterior queda inactiva y los documentos ya armados no cambian
-- ---------------------------------------------------------------------
create or replace function portal.nueva_version_plantilla(p_tipo text, p_titulo text, p_cuerpo text, p_nota text default null) returns integer
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v integer;
begin
  if not (portal.es_curador() or portal.es_plataforma('soporte')) then raise exception 'Solo el equipo BAIREN cambia los modelos.'; end if;
  if p_tipo is null or p_tipo not in ('reserva','contrato_mediano','contrato_tradicional','contrato_temporario') then raise exception 'Modelo desconocido.'; end if;
  perform 1 from portal.plantillas_documento where tipo = p_tipo for update;
  select coalesce(max(version), 0) + 1 into v from portal.plantillas_documento where tipo = p_tipo;
  update portal.plantillas_documento set activa = false where tipo = p_tipo and activa;
  insert into portal.plantillas_documento (tipo, version, titulo, cuerpo, activa, nota, creado_por)
  values (p_tipo, v, btrim(coalesce(p_titulo, '')), coalesce(p_cuerpo, ''), true, nullif(btrim(coalesce(p_nota, '')), ''), coalesce(auth.jwt() ->> 'email', 'sistema'));
  return v;
end $$;

-- ---------------------------------------------------------------------
-- 11. Políticas (RLS) y permisos
-- ---------------------------------------------------------------------
drop policy if exists "plantillas visibles" on portal.plantillas_documento;
create policy "plantillas visibles" on portal.plantillas_documento for select
  using (activa or portal.es_curador() or portal.es_plataforma());

drop policy if exists "firmas de las partes" on portal.firmas;
create policy "firmas de las partes" on portal.firmas for select
  using (exists (select 1 from portal.documentos d where d.id = documento_id and portal.es_parte(d.operacion_id)));

revoke all on portal.plantillas_documento, portal.firmas from anon;
revoke all on portal.plantillas_documento, portal.firmas from authenticated;
grant select on portal.plantillas_documento to authenticated;
-- De la firma, la página ve quién, cuándo y la huella; la IP y el navegador van por documento_detalle (quien firmó y el equipo)
grant select (id, documento_id, lado, nombre, dni, hash, firmado_en) on portal.firmas to authenticated;

-- Internas
revoke all on function portal._doc_fecha(date), portal._doc_monto(numeric, text), portal._doc_plazo(integer, integer),
  portal._doc_txt(text, integer), portal._doc_dni(text), portal._identidad_requerida(), portal._identidad_ok(),
  portal.trg_documento_guarda() from public, anon, authenticated;
-- Las que llama la página (con sesión)
revoke all on function portal.generar_documento(uuid, text, jsonb), portal.firmar_documento(uuid, text, text, text),
  portal.anular_documento(uuid, text), portal.documentos_de(uuid), portal.documento_detalle(uuid),
  portal.nueva_version_plantilla(text, text, text, text) from public, anon;
grant execute on function portal.generar_documento(uuid, text, jsonb), portal.firmar_documento(uuid, text, text, text),
  portal.anular_documento(uuid, text), portal.documentos_de(uuid), portal.documento_detalle(uuid),
  portal.nueva_version_plantilla(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 12. Los modelos base (versión 1). La página los repite en js/dg-documentos.js para el modo local (la prueba
--     test/rieles/documentos.mjs verifica que sean idénticos).
-- ---------------------------------------------------------------------
insert into portal.plantillas_documento (tipo, version, titulo, cuerpo, activa, nota, creado_por)
select v.tipo, 1, v.titulo, v.cuerpo, true, 'Modelo base, a validar por el abogado de BAIREN antes de usar.', 'migración 30'
from (values
('reserva', 'Reserva de locación', $tpl_reserva$# Reserva de locación

> Modelo base · a validar por el abogado de BAIREN antes de usar.

En la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman esta reserva:

- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «quien publica»); y
- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «quien reserva»).

## 1. Objeto

Quien reserva ofrece alquilar el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}), con destino a {{destino}}, en estas condiciones:

- Inicio previsto: {{fecha_inicio}}.
- Plazo: {{plazo}}.
- Precio: {{precio}}, en {{moneda_nombre}}.
- Depósito en garantía: {{deposito}}.

Quien publica acepta la oferta y, mientras la reserva esté vigente, no ofrece el inmueble a otras personas.

## 2. Seña

Quien reserva entrega una seña de **{{sena}}**. La recibe directamente quien publica, en la cuenta que indique por escrito. BAIREN no recibe, no retiene ni administra dinero de las partes.

Si se firma el contrato, la seña se toma como pago a cuenta del precio.

## 3. Vencimiento

Esta reserva vence el **{{vence}}**. Si para esa fecha el contrato no está firmado, la reserva queda sin efecto, sin necesidad de aviso, y quien publica devuelve la seña completa a quien reserva, en la misma moneda, dentro de los 5 días hábiles siguientes y sin descuentos.

## 4. Costos

Firmar esta reserva no le cuesta nada a quien reserva: BAIREN no le cobra tarifas ni servicios.

## 5. El papel de BAIREN

BAIREN es una plataforma tecnológica. No es parte de esta reserva, no actúa como corredor inmobiliario y no garantiza las obligaciones de las partes.

## 6. Firma electrónica

Las partes firman esta reserva con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.

## 7. Datos personales

Los datos de esta reserva se usan solo para esta operación (Ley 25.326). Cada parte puede pedir el acceso, la corrección o la baja de sus datos.$tpl_reserva$),
('contrato_mediano', 'Locación de vivienda amoblada · mediano plazo', $tpl_contrato_mediano$# Contrato de locación de vivienda amoblada

*Mediano plazo*

> Modelo base · a validar por el abogado de BAIREN antes de usar.

En la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman este contrato:

- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «la parte locadora»); y
- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «la parte locataria»).

## 1. Inmueble y destino

La parte locadora da en locación a la parte locataria el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}), amoblado y equipado según el inventario que forma parte de este contrato. El destino es exclusivamente vivienda de la parte locataria y de quienes convivan con ella.

## 2. Plazo

El plazo es de **{{plazo}}**: empieza el {{fecha_inicio}} y termina el {{fecha_fin}}. Al terminar, la parte locataria devuelve el inmueble libre de personas y con los bienes del inventario.

## 3. Precio y moneda

El precio es de **{{precio}}**, en {{moneda_nombre}}. Las partes eligen libremente esa moneda (artículo 765 del Código Civil y Comercial, con la redacción del DNU 70/2023), y la parte locataria cumple solo si paga en la moneda pactada. {{ajuste}}

El alquiler se paga por mes adelantado, del 1 al 10 de cada mes, por transferencia a la cuenta que indique por escrito la parte locadora. BAIREN no recibe ni administra pagos.

## 4. Depósito en garantía

Depósito: **{{deposito}}**. Si hay depósito, se entrega al firmar, en la misma moneda del precio, y se devuelve al recibir el inmueble, descontando solo deudas de servicios o expensas y daños que no sean el desgaste normal por el uso.

## 5. Servicios incluidos

Servicios incluidos en el precio: {{servicios}}. Los consumos que no figuren acá los paga la parte locataria. Las expensas extraordinarias y los impuestos del inmueble los paga la parte locadora.

## 6. Inventario y estado

Al entregar el inmueble, las partes firman el inventario de muebles, artefactos y equipamiento, con su estado. La parte locataria cuida esos bienes, no los retira del inmueble y los devuelve en el mismo estado, salvo el desgaste normal por el uso.

## 7. Uso y cuidado

La parte locataria no puede subalquilar, ceder el contrato, cambiar el destino ni hacer obras sin autorización escrita de la parte locadora. Respeta el reglamento de copropiedad del edificio.

## 8. Rescisión anticipada

La parte locataria puede terminar el contrato antes del plazo, avisando por escrito. En ese caso paga a la parte locadora el 10 % del saldo del alquiler que faltaba pagar hasta el final del plazo (artículo 1221 del Código Civil y Comercial, con la redacción del DNU 70/2023).

## 9. El papel de BAIREN

BAIREN es una plataforma tecnológica. No es parte de este contrato, no actúa como corredor inmobiliario, no recibe dinero de las partes y no garantiza sus obligaciones. La parte locataria no le paga nada a BAIREN por este contrato.

## 10. Firma electrónica

Las partes firman este contrato con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.

## 11. Notificaciones y jurisdicción

Las partes aceptan como domicilio electrónico el correo de su cuenta de BAIREN, donde valen las notificaciones de este contrato. Ante cualquier conflicto, se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.$tpl_contrato_mediano$),
('contrato_tradicional', 'Locación de vivienda · alquiler a largo plazo', $tpl_contrato_tradicional$# Contrato de locación de vivienda

*Alquiler a largo plazo*

> Modelo base · a validar por el abogado de BAIREN antes de usar.

En la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman este contrato:

- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «la parte locadora»); y
- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «la parte locataria»).

## 1. Inmueble y destino

La parte locadora da en locación a la parte locataria el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}). El destino es exclusivamente vivienda de la parte locataria y de quienes convivan con ella. Las partes dejan constancia del estado del inmueble en un acta con fotos, que firman al entregar las llaves.

## 2. Plazo

El plazo es de **{{plazo}}**: empieza el {{fecha_inicio}} y termina el {{fecha_fin}}. Las partes lo pactan libremente (DNU 70/2023). Al terminar, la parte locataria devuelve el inmueble libre de personas y de cosas, en el estado del acta, salvo el desgaste normal por el uso.

## 3. Precio y moneda

El precio inicial es de **{{precio}}**, en {{moneda_nombre}}. Las partes eligen libremente esa moneda (artículo 765 del Código Civil y Comercial, con la redacción del DNU 70/2023), y la parte locataria cumple solo si paga en la moneda pactada.

El alquiler se paga por mes adelantado, del 1 al 10 de cada mes, por transferencia a la cuenta que indique por escrito la parte locadora. BAIREN no recibe ni administra pagos.

## 4. Ajuste

{{ajuste}} Las partes eligen libremente el índice y la periodicidad del ajuste (DNU 70/2023).

## 5. Depósito en garantía

Depósito: **{{deposito}}**. Si hay depósito, se entrega al firmar, en la misma moneda del precio, y se devuelve al recibir el inmueble, descontando solo deudas de servicios o expensas y daños que no sean el desgaste normal por el uso.

## 6. Garantía

{{garantia}}

## 7. Expensas, servicios e impuestos

La parte locataria paga los servicios que consume y las expensas ordinarias. La parte locadora paga las expensas extraordinarias y los impuestos que gravan el inmueble.

## 8. Uso y cuidado

La parte locataria no puede subalquilar, ceder el contrato, cambiar el destino ni hacer obras sin autorización escrita de la parte locadora. Respeta el reglamento de copropiedad del edificio.

## 9. Rescisión anticipada

La parte locataria puede terminar el contrato antes del plazo, avisando por escrito. En ese caso paga a la parte locadora el 10 % del saldo del alquiler que faltaba pagar hasta el final del plazo (artículo 1221 del Código Civil y Comercial, con la redacción del DNU 70/2023).

## 10. El papel de BAIREN

BAIREN es una plataforma tecnológica. No es parte de este contrato, no actúa como corredor inmobiliario, no recibe dinero de las partes y no garantiza sus obligaciones. La parte locataria no le paga nada a BAIREN por este contrato.

## 11. Firma electrónica

Las partes firman este contrato con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.

## 12. Notificaciones y jurisdicción

Las partes aceptan como domicilio electrónico el correo de su cuenta de BAIREN, donde valen las notificaciones de este contrato. Ante cualquier conflicto, se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.$tpl_contrato_tradicional$),
('contrato_temporario', 'Alojamiento turístico · estadía corta (hasta 3 meses)', $tpl_contrato_temporario$# Contrato de alojamiento turístico

*Estadía corta (hasta 3 meses)*

> Modelo base · a validar por el abogado de BAIREN antes de usar.

En la Ciudad Autónoma de Buenos Aires, el {{fecha_documento}}, firman este contrato:

- **{{publicador_nombre}}**{{publicador_cuit}}, {{publicador_caracter}} (en adelante, «el anfitrión»); y
- **{{interesado_nombre}}**, {{interesado_doc}} (en adelante, «el huésped»).

## 1. Inmueble y registro

El anfitrión ofrece al huésped alojamiento en el inmueble de {{inmueble_direccion}}, barrio de {{inmueble_barrio}}, Ciudad Autónoma de Buenos Aires (referencia BAIREN {{inmueble_codigo}}), amoblado y equipado. El inmueble está inscripto en el registro de la Ciudad que exige la Ley 6255 con el número **{{registro}}**.

## 2. Destino

El alojamiento tiene fines turísticos y no es vivienda permanente. Pueden alojarse {{huespedes}}.

## 3. Plazo

La estadía es de **{{plazo}}**: el ingreso es el {{fecha_inicio}} y el egreso, el {{fecha_fin}}, en los horarios que acuerden las partes. No se renueva sola y, sumada a otras estadías seguidas, no puede pasar de 3 meses.

## 4. Precio

El precio es de **{{precio}}**, en {{moneda_nombre}}. Se paga directamente al anfitrión, en la forma que acuerden las partes por escrito. BAIREN no recibe ni administra pagos.

## 5. Depósito

Depósito: **{{deposito}}**. Si hay depósito, se devuelve dentro de los 5 días hábiles del egreso, descontando solo daños que no sean el desgaste normal por el uso y faltantes del inventario.

## 6. Servicios incluidos

Servicios incluidos en el precio: {{servicios}}.

## 7. Inventario y convivencia

El huésped recibe el inmueble con el inventario de muebles y equipamiento, cuida esos bienes y los devuelve en el mismo estado, salvo el desgaste normal por el uso. Respeta el reglamento del edificio y la tranquilidad de los vecinos, y no puede subalquilar ni ceder la estadía.

## 8. El papel de BAIREN

BAIREN es una plataforma tecnológica. No es parte de este contrato, no actúa como corredor inmobiliario, no recibe dinero de las partes y no garantiza sus obligaciones.

## 9. Firma electrónica

Las partes firman este contrato con firma electrónica en BAIREN (Ley 25.506). El registro de firmas guarda el nombre y el DNI que escribe cada parte, la fecha y la hora, la dirección IP y la huella digital (SHA-256) del texto firmado. Las partes aceptan este medio y reconocen el documento como propio.

## 10. Notificaciones y jurisdicción

Las partes aceptan como domicilio electrónico el correo de su cuenta de BAIREN, donde valen las notificaciones de este contrato. Ante cualquier conflicto, se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.$tpl_contrato_temporario$)
) as v(tipo, titulo, cuerpo)
where not exists (select 1 from portal.plantillas_documento p where p.tipo = v.tipo);

notify pgrst, 'reload schema';

-- Controles
select 'tablas nuevas' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal' and table_name in ('plantillas_documento','firmas')) = 2 as ok
union all select 'cuatro modelos activos', (select count(*) from portal.plantillas_documento where activa) = 4
union all select 'modelos con la leyenda', not exists (select 1 from portal.plantillas_documento where cuerpo not like '%Modelo base · a validar por el abogado de BAIREN antes de usar.%')
union all select 'columnas de documentos', (select count(*) from information_schema.columns where table_schema = 'portal' and table_name = 'documentos'
     and column_name in ('contenido','hash','plantilla_id','plantilla_version','partes','vence_en')) = 6
union all select 'huella SHA-256', encode(extensions.digest(convert_to('BAIREN · firma', 'UTF8'), 'sha256'), 'hex') = '2cccc7b93ed3bb05cd0d8f3cd91371415fe5672ca37b9727808c7966da9a99d5';
