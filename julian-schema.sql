-- =====================================================================
-- SCHEMA SUPABASE — Cargas de Julián (bairengroup.com/julian)
-- =====================================================================
-- Pasos:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Copiar TODO este archivo y pegarlo en el editor
--   3. Click Run (o Cmd+Enter)
--   4. Debe decir "Success. No rows returned"
--
-- Esto crea tablas y un bucket NUEVOS, separados del catálogo público.
-- No toca nada de propiedades / imagenes / amenities.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLA: cargas_julian (cada propiedad que Juli sube desde el celu)
-- ---------------------------------------------------------------------
create table cargas_julian (
  id           uuid primary key default gen_random_uuid(),
  descripcion  text not null,
  subida       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_cargas_julian_updated
  before update on cargas_julian
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- TABLA: cargas_julian_media (fotos y videos de cada carga)
-- ---------------------------------------------------------------------
create table cargas_julian_media (
  id            uuid primary key default gen_random_uuid(),
  carga_id      uuid not null references cargas_julian(id) on delete cascade,
  url           text not null,
  storage_path  text,
  tipo          text not null default 'foto' check (tipo in ('foto','video')),
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

create index cargas_julian_media_idx on cargas_julian_media(carga_id, orden);

-- ---------------------------------------------------------------------
-- RLS: la página es un link abierto sin login, así que el acceso es
-- público (anon) pero SOLO sobre estas dos tablas nuevas.
-- ---------------------------------------------------------------------
alter table cargas_julian       enable row level security;
alter table cargas_julian_media enable row level security;

create policy "cargas julian acceso publico"
  on cargas_julian for all
  using (true) with check (true);

create policy "cargas julian media acceso publico"
  on cargas_julian_media for all
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- STORAGE: bucket público nuevo para las fotos/videos de Juli
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cargas-julian', 'cargas-julian', true)
on conflict (id) do nothing;

create policy "cargas julian storage upload"
  on storage.objects for insert
  with check (bucket_id = 'cargas-julian');

-- necesario para que remove() encuentre el archivo antes de borrarlo
create policy "cargas julian storage select"
  on storage.objects for select
  using (bucket_id = 'cargas-julian');

create policy "cargas julian storage delete"
  on storage.objects for delete
  using (bucket_id = 'cargas-julian');
