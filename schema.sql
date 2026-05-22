-- =====================================================================
-- SCHEMA SUPABASE — Grupo Bairen CMS
-- =====================================================================
-- Pasos:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Copiar TODO este archivo y pegarlo en el editor
--   3. Click Run (o Cmd+Enter)
--   4. Debe decir "Success. No rows returned"
--   5. Crear el bucket de Storage manualmente (Storage -> New bucket):
--        name = imagenes-propiedades
--        public = ON
-- =====================================================================

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- TABLA: propiedades
-- ---------------------------------------------------------------------
create table propiedades (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  dir                 text not null,
  unidad              text,
  barrio              text not null,
  tipo                text not null
                      check (tipo in ('Tradicional','Temporal','Ambos')),
  precio_temporal     numeric(10,2),
  precio_tradicional  numeric(10,2),
  ambientes           integer,
  m2                  integer,
  plazo               text default '3 a 24 meses',
  estado              text not null default 'Disponible'
                      check (estado in ('Disponible','Reservado')),
  descripcion         text,
  video_url           text,
  video_tipo          text check (video_tipo in ('bunny','youtube','mp4')),
  publicada           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint precio_segun_tipo check (
    (tipo = 'Tradicional' and precio_tradicional is not null) or
    (tipo = 'Temporal'    and precio_temporal    is not null) or
    (tipo = 'Ambos' and precio_tradicional is not null and precio_temporal is not null)
  )
);

create trigger trg_propiedades_updated
  before update on propiedades
  for each row execute function set_updated_at();

create index propiedades_publicada_idx on propiedades(publicada) where publicada;
create index propiedades_barrio_idx    on propiedades(barrio);
create index propiedades_tipo_idx      on propiedades(tipo);

-- ---------------------------------------------------------------------
-- TABLA: imagenes (la de orden=0 es la portada)
-- ---------------------------------------------------------------------
create table imagenes (
  id            uuid primary key default gen_random_uuid(),
  propiedad_id  uuid not null references propiedades(id) on delete cascade,
  url           text not null,
  storage_path  text,
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

create index imagenes_propiedad_idx on imagenes(propiedad_id, orden);

-- ---------------------------------------------------------------------
-- TABLA: amenities
-- ---------------------------------------------------------------------
create table amenities (
  id            uuid primary key default gen_random_uuid(),
  propiedad_id  uuid not null references propiedades(id) on delete cascade,
  nombre        text not null,
  icono         text
);

create index amenities_propiedad_idx on amenities(propiedad_id);
create unique index amenities_unique on amenities(propiedad_id, nombre);

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================
alter table propiedades enable row level security;
alter table imagenes    enable row level security;
alter table amenities   enable row level security;

-- Lectura publica: solo lo publicado
create policy "propiedades publicadas son lectura publica"
  on propiedades for select using (publicada = true);

create policy "imagenes de publicadas son lectura publica"
  on imagenes for select using (
    exists (select 1 from propiedades p
            where p.id = imagenes.propiedad_id and p.publicada)
  );

create policy "amenities de publicadas son lectura publica"
  on amenities for select using (
    exists (select 1 from propiedades p
            where p.id = amenities.propiedad_id and p.publicada)
  );

-- Admin: cualquier usuario autenticado puede CRUD todo
create policy "admins ven todas"  on propiedades for select to authenticated using (true);
create policy "admins crean"      on propiedades for insert to authenticated with check (true);
create policy "admins editan"     on propiedades for update to authenticated using (true) with check (true);
create policy "admins borran"     on propiedades for delete to authenticated using (true);

create policy "admins imagenes ALL"  on imagenes  for all to authenticated using (true) with check (true);
create policy "admins amenities ALL" on amenities for all to authenticated using (true) with check (true);

-- =====================================================================
-- STORAGE (politicas del bucket imagenes-propiedades)
-- =====================================================================
-- IMPORTANTE: antes de correr esto, crear el bucket en el dashboard:
--   Storage -> New bucket -> name: imagenes-propiedades, public: ON

create policy "admins suben imagenes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes-propiedades');

create policy "admins borran imagenes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes-propiedades');

create policy "admins actualizan imagenes" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagenes-propiedades');

create policy "imagenes son lectura publica" on storage.objects
  for select to public
  using (bucket_id = 'imagenes-propiedades');
