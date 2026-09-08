-- =====================================================================
-- BAIREN · Portal · Migración 02 · Pedido de visita desde la ficha
--
-- El que busca elige un día y una hora desde la ficha; el pedido llega al
-- corredor como una consulta con fecha, y él la confirma desde su panel (eso
-- crea la visita en visitas_reservas, que el propietario ya puede ver).
-- Aditiva y repetible. SUBIR el archivo en el SQL Editor, no pegarlo.
-- Generado el 2026-09-08.
-- =====================================================================
begin;

alter table portal.consultas add column if not exists visita_deseada timestamptz;
create index if not exists consultas_visita_idx on portal.consultas (publicador_id, visita_deseada) where visita_deseada is not null;

-- El canal 'visita' se suma a los existentes.
alter table portal.consultas drop constraint if exists consultas_canal_check;
alter table portal.consultas add constraint consultas_canal_check
  check (canal in ('formulario','whatsapp','telefono','visita'));

-- La visita confirmada guarda de qué consulta salió, y si se hizo o no.
alter table portal.visitas_reservas add column if not exists consulta_id uuid references portal.consultas(id) on delete set null;
alter table portal.visitas_reservas add column if not exists estado text not null default 'confirmada'
  check (estado in ('confirmada','realizada','cancelada','no_asistio'));
alter table portal.visitas_reservas add column if not exists feedback text;   -- lo que dijo el que visitó; lo ve el propietario

commit;
