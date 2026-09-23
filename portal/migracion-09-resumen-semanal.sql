-- =====================================================================
-- BAIREN · Portal · Migración 09 · El resumen semanal del publicador
--
-- Para qué: que al dueño le llegue cada lunes "esta semana tu unidad
-- tuvo 40 vistas y 3 consultas". Es lo que lo hace volver al portal en
-- vez de entrar una sola vez por curiosidad, y es el argumento con el
-- que después se le vende al corredor: tus propietarios ya están
-- adentro. Lo manda api/portal-semanal.js con un cron de los lunes.
--
-- Qué agrega:
--   1. portal.resumen_semanal(desde, hasta): por cada aviso publicado,
--      cuántas vistas, consultas y visitas tuvo en la ventana, con el
--      mail del publicador. Una fila por aviso.
--   2. portal.resumenes_enviados: qué semana se le mandó a quién, para
--      que dos corridas del cron no manden dos veces.
--
-- Ojo con los nombres de columna, que ya me hicieron tropezar una vez:
--   portal.vistas usa "fecha", no "created_at".
--   portal.consultas y portal.visitas_reservas usan "created_at".
-- Y las filas viejas guardan el aviso en aviso_ref (texto) en vez de
-- aviso_id, así que se cuentan por las tres vías o se pierden.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- Generada el 22/9/2026. NO CORRIDA todavía.
-- =====================================================================

-- ── 1 · Qué pasó con cada aviso en la ventana ───────────────────────
create or replace function portal.resumen_semanal(
  p_desde timestamptz,
  p_hasta timestamptz default now()
) returns table (
  publicador_id     uuid,
  publicador_nombre text,
  publicador_email  text,
  publicador_tipo   text,
  aviso_id          uuid,
  codigo            text,
  titulo            text,
  direccion         text,
  vistas            bigint,
  consultas         bigint,
  visitas           bigint
)
language sql
security definer
set search_path = portal, public
as $$
  select
    pub.id, pub.nombre, nullif(trim(pub.email), ''), pub.tipo,
    a.id, a.codigo, a.titulo, a.direccion,
    (select count(*) from portal.vistas v
      where (v.aviso_id = a.id or v.aviso_ref = a.id::text or v.aviso_ref = a.codigo)
        and v.fecha >= p_desde and v.fecha < p_hasta),
    (select count(*) from portal.consultas c
      where (c.aviso_id = a.id or c.aviso_ref = a.id::text or c.aviso_ref = a.codigo)
        and c.created_at >= p_desde and c.created_at < p_hasta),
    (select count(*) from portal.visitas_reservas r
      where r.aviso_id = a.id
        and r.created_at >= p_desde and r.created_at < p_hasta)
  from portal.avisos a
  join portal.publicadores pub on pub.id = a.publicador_id
  where a.estado_curacion = 'publicado'
  order by pub.nombre, a.codigo;
$$;

comment on function portal.resumen_semanal(timestamptz, timestamptz) is
  'Vistas, consultas y visitas de cada aviso publicado en una ventana de tiempo, con el mail de quien publica. La usa api/portal-semanal.js para el mail de los lunes.';

-- ── 2 · Para no mandar dos veces ────────────────────────────────────
create table if not exists portal.resumenes_enviados (
  id            uuid primary key default gen_random_uuid(),
  publicador_id uuid not null references portal.publicadores(id) on delete cascade,
  semana        date not null,          -- el lunes de la semana resumida
  avisos        integer not null default 0,
  vistas        integer not null default 0,
  consultas     integer not null default 0,
  enviado_en    timestamptz not null default now(),
  unique (publicador_id, semana)
);

alter table portal.resumenes_enviados enable row level security;
-- Sin políticas: solo el servidor con la service key.

comment on table portal.resumenes_enviados is
  'Qué resumen semanal se le mandó a qué publicador. El único por (publicador, semana) es lo que evita que dos corridas del cron manden el mail dos veces.';

revoke all  on function portal.resumen_semanal(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function portal.resumen_semanal(timestamptz, timestamptz) to service_role;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Qué habría salido esta semana, sin mandar nada:
-- select publicador_nombre, publicador_email, count(*) as avisos,
--        sum(vistas) as vistas, sum(consultas) as consultas
--   from portal.resumen_semanal(now() - interval '7 days')
--  group by 1,2 order by 4 desc;
