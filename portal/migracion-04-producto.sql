-- =====================================================================
-- BAIREN · Portal · Migración 04 · El motor: sincronización, alertas y resumen diario
--
-- Qué agrega:
--   1. portal.sincronizaciones: registro de cada corrida de api/portal-sync.js
--      (web → portal): cuándo empezó y terminó, si salió bien, cuántas altas,
--      cambios y bajas, el error si lo hubo y el detalle (códigos tocados).
--      Solo la lee el servidor con la service key: RLS sin políticas.
--   2. portal.precios_historial: cada cambio de precio de un aviso, escrito por
--      un disparador. Es lo que la ficha ya muestra como historial, así que la
--      lectura es pública, pero solo de los avisos publicados: el historial de
--      un borrador, un rechazado o un pausado no se ve con la clave anon.
--      Las alertas de precio salen de acá.
--   3. portal.alertas.ultimo_envio: cuándo se le mandó por última vez a esa alerta.
--   4. portal.alertas_enviadas: qué aviso ya se le mandó a qué alerta, para no
--      repetir. Para las alertas de precio guarda también el precio avisado, así
--      se vuelve a avisar solo si baja de nuevo (en las de búsqueda precio = 0).
--      Único por (alerta, aviso, precio): el servidor inserta con
--      on_conflict e ignora duplicados, así dos corridas cruzadas del diario no
--      mandan dos veces. Solo el servidor: RLS sin políticas.
--   5. Candado de la sincronización: índice único parcial sobre las corridas sin
--      terminar, así dos instancias no pueden correr a la vez (la segunda recibe
--      23505 y se omite).
--
-- Aditiva y repetible. SUBIR el archivo en el SQL Editor del proyecto del portal,
-- NO pegarlo. Generado el 2026-09-11; revisado el mismo día (candado atómico,
-- historial solo de publicados, alertas_enviadas con precio 0 y único simple).
--
-- Orden: schema-portal.sql → migracion-01 → migracion-02 → migracion-03 → esta (04).
-- La 03 va antes porque el sync busca el publicador 'bairen'. El seed del 10/9
-- deja de ser necesario cuando el sync funciona (trae las mismas unidades desde
-- la web), pero no molesta: el sync reconoce las filas por propiedad_id.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. El servidor entra con la service role. Esa role salta RLS pero igual
--    necesita permisos sobre el esquema: schema-portal.sql solo se los dio a
--    anon y authenticated. Sin esto, la clave es válida y PostgREST responde
--    42501 (permission denied for schema portal).
-- ---------------------------------------------------------------------
grant usage on schema portal to service_role;
grant all on all tables in schema portal to service_role;
grant all on all sequences in schema portal to service_role;
alter default privileges in schema portal grant all on tables to service_role;
alter default privileges in schema portal grant all on sequences to service_role;

-- ---------------------------------------------------------------------
-- 1. Registro de sincronizaciones
-- ---------------------------------------------------------------------
create table if not exists portal.sincronizaciones (
  id           uuid primary key default gen_random_uuid(),
  origen       text not null default 'web',          -- 'web' (la pidió el portal), 'cron', 'manual'
  iniciada     timestamptz not null default now(),
  terminada    timestamptz,
  ok           boolean,
  altas        integer default 0,
  cambios      integer default 0,
  bajas        integer default 0,
  sin_cambios  integer default 0,
  error        text,
  detalle      jsonb                                  -- { altas:[codigos], cambios:[{codigo,campos}], bajas:[codigos], reactivados:[], fotos:[] }
);
create index if not exists sincronizaciones_terminada_idx on portal.sincronizaciones (terminada desc) where ok;
create index if not exists sincronizaciones_iniciada_idx on portal.sincronizaciones (iniciada desc);
-- Candado atómico: a lo sumo una corrida sin terminar. El servidor cierra antes las
-- abandonadas (iniciadas hace más de 3 minutos y sin terminar) y recién después
-- inserta la suya; si el insert da 23505, hay otra en curso y se omite.
-- Antes de crear el índice se cierran las que hubieran quedado abiertas (si había
-- dos, el índice no se podría crear).
update portal.sincronizaciones set terminada = now(), ok = false, error = 'abandonada' where terminada is null;
create unique index if not exists sincronizaciones_en_curso_uq on portal.sincronizaciones ((1)) where terminada is null;
alter table portal.sincronizaciones enable row level security;
-- Sin políticas: solo la service key (que salta RLS) lee y escribe.
revoke all on portal.sincronizaciones from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Historial de precios, escrito por disparador
-- ---------------------------------------------------------------------
create table if not exists portal.precios_historial (
  id             uuid primary key default gen_random_uuid(),
  aviso_id       uuid not null references portal.avisos(id) on delete cascade,
  anterior       numeric(12,2),
  precio         numeric(12,2) not null,
  moneda         text,
  registrado_en  timestamptz not null default now()
);
create index if not exists precios_historial_aviso_idx on portal.precios_historial (aviso_id, registrado_en desc);
create index if not exists precios_historial_fecha_idx on portal.precios_historial (registrado_en desc);

-- security definer: el que cambia el precio (publicador o curador, con RLS) no tiene
-- permiso de escribir el historial; la función lo escribe como dueña de la tabla.
create or replace function portal.registrar_precio() returns trigger
language plpgsql security definer set search_path = portal, public as $$
begin
  insert into portal.precios_historial (aviso_id, anterior, precio, moneda)
  values (new.id, old.precio, new.precio, new.moneda);
  return new;
end $$;
drop trigger if exists trg_precio_historial on portal.avisos;
create trigger trg_precio_historial after update of precio on portal.avisos
  for each row when (old.precio is distinct from new.precio and new.precio is not null)
  execute function portal.registrar_precio();

alter table portal.precios_historial enable row level security;
grant select on portal.precios_historial to anon, authenticated;
-- Se lee solo el historial de los avisos publicados: con using (true) la clave anon
-- veía el de borradores, en revisión, rechazados y pausados de otros publicadores.
drop policy if exists "precios historial publico" on portal.precios_historial;
create policy "precios historial publico" on portal.precios_historial for select
  using (exists (select 1 from portal.avisos a where a.id = aviso_id and a.estado_curacion = 'publicado'));

-- ---------------------------------------------------------------------
-- 3. Último envío por alerta
-- ---------------------------------------------------------------------
alter table portal.alertas add column if not exists ultimo_envio timestamptz;

-- ---------------------------------------------------------------------
-- 4. Qué se le mandó a cada alerta
-- ---------------------------------------------------------------------
create table if not exists portal.alertas_enviadas (
  id          uuid primary key default gen_random_uuid(),
  alerta_id   uuid not null references portal.alertas(id) on delete cascade,
  aviso_id    uuid not null references portal.avisos(id) on delete cascade,
  precio      numeric(12,2) not null default 0,       -- 0 en alertas de búsqueda; el precio avisado en las de precio
  enviada_en  timestamptz not null default now()
);
-- Único simple por (alerta, aviso, precio): con precio 0 en vez de null el unique
-- sí frena duplicados y el servidor puede insertar con on_conflict + ignore-duplicates.
-- La primera versión tenía precio null y dos índices parciales: se convierten.
update portal.alertas_enviadas set precio = 0 where precio is null;
alter table portal.alertas_enviadas alter column precio set default 0;
alter table portal.alertas_enviadas alter column precio set not null;
drop index if exists portal.alertas_enviadas_busqueda_uq;
drop index if exists portal.alertas_enviadas_precio_uq;
create unique index if not exists alertas_enviadas_uq on portal.alertas_enviadas (alerta_id, aviso_id, precio);
create index if not exists alertas_enviadas_fecha_idx on portal.alertas_enviadas (enviada_en desc);
alter table portal.alertas_enviadas enable row level security;
revoke all on portal.alertas_enviadas from anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Control
-- ---------------------------------------------------------------------
do $c$
declare n int;
begin
  select count(*) into n from information_schema.tables where table_schema = 'portal' and table_name in ('sincronizaciones','precios_historial','alertas_enviadas');
  raise notice 'control: tablas del motor = % (debe ser 3)', n;
  select count(*) into n from information_schema.columns where table_schema = 'portal' and table_name = 'alertas' and column_name = 'ultimo_envio';
  raise notice 'control: alertas.ultimo_envio = % (debe ser 1)', n;
  select count(*) into n from pg_trigger where tgrelid = 'portal.avisos'::regclass and tgname = 'trg_precio_historial' and not tgisinternal;
  raise notice 'control: disparador de precios = % (debe ser 1)', n;
  select count(*) into n from pg_indexes where schemaname = 'portal' and indexname in ('sincronizaciones_en_curso_uq', 'alertas_enviadas_uq');
  raise notice 'control: candado del sync + único de alertas_enviadas = % (debe ser 2)', n;
  select count(*) into n from pg_indexes where schemaname = 'portal' and indexname in ('alertas_enviadas_busqueda_uq', 'alertas_enviadas_precio_uq');
  raise notice 'control: índices parciales viejos de alertas_enviadas = % (debe ser 0)', n;
  select count(*) into n from portal.alertas_enviadas where precio is null;
  raise notice 'control: alertas_enviadas con precio null = % (debe ser 0)', n;
end
$c$;

commit;

-- ---------------------------------------------------------------------
-- Después de correr: variables en Vercel (Settings → Environment Variables, Production)
--   PORTAL_SUPABASE_SERVICE_KEY   service role de ESTE proyecto (Settings → API → service_role). Solo en Vercel, nunca en el repo ni en el navegador.
--   CRON_SECRET                   una cadena larga cualquiera (32 o más caracteres); Vercel la manda en el cron.
--   PORTAL_NOTIFY_KEY             clave del equipo (ya existe) para disparar sync y diario a mano con x-portal-key.
--   RESEND_API_KEY, PORTAL_MAIL_FROM   ya existen; sin ellas el diario arma el resumen pero no manda.
--   PORTAL_RESUMEN_A              opcional; destinatario del resumen (default contacto@bairengroup.com).
--   WEB_SUPABASE_URL, WEB_SUPABASE_KEY   opcionales; la URL y la clave pública de bairengroup.com (default en el código).
-- Orden de las migraciones en una base que ya existía: 01 → 02 → 03 → 04.
-- Control a mano:
--   select origen, iniciada, terminada, ok, altas, cambios, bajas, sin_cambios, error from portal.sincronizaciones order by iniciada desc limit 5;
--   select a.codigo, h.anterior, h.precio, h.registrado_en from portal.precios_historial h join portal.avisos a on a.id = h.aviso_id order by h.registrado_en desc limit 10;
--   select count(*) from portal.alertas_enviadas where enviada_en >= current_date;
