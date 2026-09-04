-- =====================================================================
-- BAIREN · Portal · esquema `portal` (Supabase / Postgres)
-- Web de prueba, rama portal. NO toca el esquema public ni las tablas
-- propiedades / imagenes / amenities de producción.
-- Pasos: Supabase Dashboard -> SQL Editor -> pegar todo -> Run.
-- =====================================================================
create extension if not exists "pgcrypto";
create schema if not exists portal;

-- Publicadores: dueños directos verificados, inmobiliarias/corredores, desarrolladoras
create table if not exists portal.publicadores (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  tipo          text not null check (tipo in ('dueno','inmobiliaria','desarrolladora')),
  nombre        text not null,
  responsable   text,
  matricula     text,                       -- 'CUCICBA 7527'
  colegio       text,                       -- CUCICBA, CMCPSI, etc.
  cuit          text,
  logo_url      text,
  descripcion   text,
  telefono      text,
  whatsapp      text,
  email         text,
  zonas         text[] default '{}',
  verificado    boolean not null default false,
  verificado_en timestamptz,
  badge         text,                       -- 'Corredor inmobiliario matriculado' | 'Dueño verificado' | 'Venta directa'
  auth_user_id  uuid,                       -- referencia a auth.users cuando exista cuenta
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Avisos: una fila por operación publicada
create table if not exists portal.avisos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,     -- 'BA-XXXXXXXV'
  slug            text not null,
  publicador_id   uuid not null references portal.publicadores(id) on delete restrict,
  propiedad_id    uuid,                     -- puente opcional a public.propiedades durante la migración
  operacion       text not null check (operacion in ('venta','alquiler','mediano')),
  tipo            text not null default 'Departamento' check (tipo in ('Departamento','Piso','PH','Casa','Local','Oficina','Terreno')),
  titulo          text,
  direccion       text not null,
  unidad          text,
  barrio          text not null,
  zona            text not null,
  ciudad          text not null default 'Capital Federal',
  mostrar_direccion text not null default 'aproximada' check (mostrar_direccion in ('exacta','aproximada')),
  lat             double precision,
  lng             double precision,
  precio          numeric(12,2),
  moneda          text not null default 'USD',
  expensas        numeric(12,2),
  m2_total        integer,
  m2_cubierto     integer,
  ambientes       integer,
  dormitorios     integer,
  banos           integer,
  toilettes       integer,
  cocheras        integer default 0,
  antiguedad      integer,                  -- años; 0 = a estrenar; null = no informado
  orientacion     text,
  disposicion     text,
  piso            text,
  amoblado        boolean not null default false,
  amenities       text[] default '{}',
  caracteristicas text[] default '{}',      -- 'Apto crédito', 'Permite mascotas', ...
  descripcion     text,
  descripcion_en  text,
  descripcion_pt  text,
  video_url       text,
  video_tipo      text check (video_tipo in ('bunny','youtube','mp4')),
  plazo           text,
  estado          text not null default 'disponible' check (estado in ('disponible','reservado','vendido','alquilado')),
  estado_curacion text not null default 'borrador' check (estado_curacion in ('borrador','en_revision','publicado','rechazado','pausado','vencido')),
  motivo_rechazo  text,
  destacado_hasta timestamptz,
  publicado_en    timestamptz,
  vence_en        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists avisos_pub_idx on portal.avisos(estado_curacion) where estado_curacion = 'publicado';
create index if not exists avisos_zona_idx on portal.avisos(zona);
create index if not exists avisos_op_idx on portal.avisos(operacion);

create table if not exists portal.fotos (
  id          uuid primary key default gen_random_uuid(),
  aviso_id    uuid not null references portal.avisos(id) on delete cascade,
  url         text not null,
  orden       integer not null default 0,
  pie         text
);
create index if not exists fotos_aviso_idx on portal.fotos(aviso_id, orden);

-- Consultas: cada contacto se registra y se deriva al publicador
create table if not exists portal.consultas (
  id            uuid primary key default gen_random_uuid(),
  aviso_id      uuid not null references portal.avisos(id) on delete cascade,
  publicador_id uuid not null references portal.publicadores(id),
  usuario_id    uuid,
  nombre        text not null,
  email         text not null,
  telefono      text,
  mensaje       text,
  canal         text not null default 'formulario' check (canal in ('formulario','whatsapp','telefono')),
  acepto_tyc    boolean not null default false,
  enviada_a     text,                       -- mail del publicador al que se derivó
  created_at    timestamptz not null default now()
);

create table if not exists portal.favoritos (
  usuario_id  uuid not null,
  aviso_id    uuid not null references portal.avisos(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (usuario_id, aviso_id)
);

create table if not exists portal.alertas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null,
  tipo        text not null check (tipo in ('busqueda','precio')),
  filtros     jsonb,
  aviso_id    uuid references portal.avisos(id) on delete cascade,
  frecuencia  text not null default 'diaria' check (frecuencia in ('inmediata','diaria','ninguna')),
  created_at  timestamptz not null default now()
);

-- Visitas y reservas: las carga el publicador; el propietario las ve en su panel
create table if not exists portal.visitas_reservas (
  id            uuid primary key default gen_random_uuid(),
  aviso_id      uuid not null references portal.avisos(id) on delete cascade,
  publicador_id uuid not null references portal.publicadores(id),
  tipo          text not null check (tipo in ('visita','reserva','cierre')),
  fecha         timestamptz not null,
  nota          text,
  created_at    timestamptz not null default now()
);

create table if not exists portal.denuncias (
  id         uuid primary key default gen_random_uuid(),
  aviso_id   uuid not null references portal.avisos(id) on delete cascade,
  motivo     text not null,
  detalle    text,
  estado     text not null default 'abierta' check (estado in ('abierta','revisada','cerrada')),
  created_at timestamptz not null default now()
);

-- Verificaciones: se guarda el resultado, nunca el documento
create table if not exists portal.verificaciones (
  id            uuid primary key default gen_random_uuid(),
  publicador_id uuid not null references portal.publicadores(id) on delete cascade,
  tipo          text not null check (tipo in ('dni','titularidad','matricula','cuit')),
  resultado     text not null check (resultado in ('aprobada','rechazada','pendiente')),
  revisado_por  text,
  nota          text,
  created_at    timestamptz not null default now()
);

-- updated_at
create or replace function portal.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_pub_upd on portal.publicadores; create trigger trg_pub_upd before update on portal.publicadores for each row execute function portal.set_updated_at();
drop trigger if exists trg_av_upd on portal.avisos; create trigger trg_av_upd before update on portal.avisos for each row execute function portal.set_updated_at();

-- RLS: lectura pública de lo publicado; escritura solo con cuenta (afinar en Fase 2)
alter table portal.publicadores enable row level security;
alter table portal.avisos enable row level security;
alter table portal.fotos enable row level security;
alter table portal.consultas enable row level security;
create policy if not exists "publicadores visibles" on portal.publicadores for select using (verificado);
create policy if not exists "avisos publicados visibles" on portal.avisos for select using (estado_curacion = 'publicado');
create policy if not exists "fotos de avisos publicados" on portal.fotos for select using (exists (select 1 from portal.avisos a where a.id = aviso_id and a.estado_curacion = 'publicado'));
create policy if not exists "cualquiera consulta" on portal.consultas for insert with check (true);

-- Exponer el esquema a la API (Dashboard -> Settings -> API -> Exposed schemas: agregar `portal`)

-- ---------------------------------------------------------------------
-- MIGRACIÓN INICIAL: las unidades actuales como avisos de Maxim Rentals
-- ---------------------------------------------------------------------
insert into portal.publicadores (slug, tipo, nombre, responsable, matricula, colegio, badge, verificado, verificado_en, zonas, email)
values ('maxim-rentals','inmobiliaria','Maxim Rentals','Maximiliano Matzkin','CUCICBA 7527','Colegio Único de Corredores Inmobiliarios de la Ciudad de Buenos Aires','Corredor inmobiliario matriculado', true, now(), '{Recoleta,Palermo,Núñez,Puerto Madero,Belgrano}', 'contacto@bairengroup.com')
on conflict (slug) do nothing;

with pub as (select id from portal.publicadores where slug = 'maxim-rentals'),
src as (
  select p.*, op.operacion, op.precio
  from public.propiedades p
  cross join lateral (
    values ('venta', p.precio_venta), ('alquiler', p.precio_tradicional), ('mediano', p.precio_temporal)
  ) as op(operacion, precio)
  where p.publicada and op.precio is not null
)
insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
select 'BA-' || upper(regexp_replace(s.slug, '[^A-Za-z0-9]', '', 'g')) || case s.operacion when 'venta' then 'V' when 'alquiler' then 'L' else 'M' end,
       s.slug, pub.id, s.id, s.operacion, s.portada_titulo, s.dir, nullif(s.unidad,'-'), s.barrio, s.barrio, s.precio, s.m2, s.m2, s.ambientes,
       case when s.ambientes is null then null else greatest(1, s.ambientes - 1) end,
       case when s.ambientes is null then null when s.ambientes >= 4 then 2 else 1 end,
       s.operacion = 'mediano',
       coalesce((select array_agg(a.nombre) from public.amenities a where a.propiedad_id = s.id), '{}'),
       s.descripcion, s.descripcion_en, s.descripcion_pt, s.video_url, s.video_tipo, s.plazo,
       case when s.estado = 'Reservado' then 'reservado' else 'disponible' end, 'publicado', s.created_at
from src s, pub
on conflict (codigo) do nothing;

insert into portal.fotos (aviso_id, url, orden)
select av.id, i.url, i.orden from portal.avisos av join public.imagenes i on i.propiedad_id = av.propiedad_id
where not exists (select 1 from portal.fotos f where f.aviso_id = av.id);
-- Nota: la zona se normaliza después con la misma tabla que usa mapa-barrios.js (Palermo Soho -> Palermo, etc.).

-- =====================================================================
-- FASE 2 · cuentas, permisos, curación y archivos
-- =====================================================================
-- 0) En Dashboard -> Settings -> API -> "Exposed schemas": agregar `portal`.
-- 1) Auth: Dashboard -> Authentication -> Providers -> Email: habilitado, con "Email OTP" (código de 6 dígitos)
--    o magic link. Para el código, en la plantilla "Magic Link" usar {{ .Token }}.
-- 2) Este bloque crea lo que falta y los permisos.

grant usage on schema portal to anon, authenticated;
grant select on all tables in schema portal to anon, authenticated;
grant insert, update on all tables in schema portal to authenticated;
grant insert on portal.consultas, portal.vistas to anon;
alter default privileges in schema portal grant select on tables to anon, authenticated;

alter table portal.publicadores add column if not exists auth_user_id uuid unique;
create table if not exists portal.curadores (
  email      text primary key,
  nombre     text,
  created_at timestamptz not null default now()
);
insert into portal.curadores (email, nombre) values ('grupobairen@gmail.com', 'BAIREN') on conflict do nothing;

create table if not exists portal.vistas (
  id        bigint generated always as identity primary key,
  aviso_id  uuid not null references portal.avisos(id) on delete cascade,
  fecha     timestamptz not null default now()
);
alter table portal.vistas enable row level security;
create policy if not exists "vistas insert" on portal.vistas for insert with check (true);

create or replace function portal.es_curador() returns boolean language sql stable as $$
  select exists (select 1 from portal.curadores c where c.email = coalesce(auth.jwt() ->> 'email', ''));
$$;
create or replace function portal.mi_publicador() returns uuid language sql stable as $$
  select id from portal.publicadores where auth_user_id = auth.uid() limit 1;
$$;

-- publicadores: cada cuenta ve y edita el suyo; los curadores todo
create policy if not exists "publicador propio select" on portal.publicadores for select using (auth_user_id = auth.uid() or portal.es_curador());
create policy if not exists "publicador propio insert" on portal.publicadores for insert with check (auth_user_id = auth.uid());
create policy if not exists "publicador propio update" on portal.publicadores for update using (auth_user_id = auth.uid() or portal.es_curador());

-- avisos: el publicador ve y edita los suyos en cualquier estado; los curadores todo; el público solo publicados
create policy if not exists "avisos propios select" on portal.avisos for select using (publicador_id = portal.mi_publicador() or portal.es_curador());
create policy if not exists "avisos propios insert" on portal.avisos for insert with check (publicador_id = portal.mi_publicador());
create policy if not exists "avisos propios update" on portal.avisos for update using (publicador_id = portal.mi_publicador() or portal.es_curador());

create policy if not exists "fotos propias all" on portal.fotos for all using (exists (select 1 from portal.avisos a where a.id = aviso_id and (a.publicador_id = portal.mi_publicador() or portal.es_curador())));

-- consultas: el publicador ve las que recibe; los curadores todo
create policy if not exists "consultas del publicador" on portal.consultas for select using (publicador_id = portal.mi_publicador() or portal.es_curador());

-- verificaciones: el publicador crea las suyas y las ve; los curadores todo
alter table portal.verificaciones enable row level security;
create policy if not exists "verif propias" on portal.verificaciones for select using (publicador_id = portal.mi_publicador() or portal.es_curador());
create policy if not exists "verif insert" on portal.verificaciones for insert with check (publicador_id = portal.mi_publicador());
create policy if not exists "verif update curador" on portal.verificaciones for update using (portal.es_curador());

alter table portal.curadores enable row level security;
create policy if not exists "curadores se ven a si mismos" on portal.curadores for select using (email = coalesce(auth.jwt() ->> 'email', ''));

-- Storage: fotos públicas, documentos privados
insert into storage.buckets (id, name, public) values ('portal-fotos', 'portal-fotos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('portal-docs', 'portal-docs', false) on conflict (id) do nothing;
create policy if not exists "fotos publicas lectura" on storage.objects for select using (bucket_id = 'portal-fotos');
create policy if not exists "fotos sube autenticado" on storage.objects for insert with check (bucket_id = 'portal-fotos' and auth.role() = 'authenticated');
create policy if not exists "fotos edita autenticado" on storage.objects for update using (bucket_id = 'portal-fotos' and auth.role() = 'authenticated');
create policy if not exists "docs sube autenticado" on storage.objects for insert with check (bucket_id = 'portal-docs' and auth.role() = 'authenticated');
create policy if not exists "docs lee curador" on storage.objects for select using (bucket_id = 'portal-docs' and portal.es_curador());
-- Los documentos de verificación se borran al aprobar o rechazar (política de privacidad): hacerlo desde el panel de curación o con un cron.

-- =====================================================================
-- FASE 4 · propietario, emprendimientos, visitas
-- =====================================================================
alter table portal.avisos add column if not exists propietario_email text;
alter table portal.avisos add column if not exists emprendimiento text;
alter table portal.avisos add column if not exists etapa text check (etapa in ('pozo','construccion','terminado'));
alter table portal.avisos add column if not exists entrega text;
create index if not exists avisos_propietario_idx on portal.avisos(lower(propietario_email));

-- El propietario (dueño de la unidad que publica una inmobiliaria) ve su aviso y sus visitas con su cuenta
create policy if not exists "propietario ve su aviso" on portal.avisos for select using (propietario_email is not null and lower(propietario_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
alter table portal.visitas_reservas enable row level security;
create policy if not exists "visitas del publicador" on portal.visitas_reservas for all using (publicador_id = portal.mi_publicador() or portal.es_curador());
create policy if not exists "visitas las ve el propietario" on portal.visitas_reservas for select using (exists (select 1 from portal.avisos a where a.id = aviso_id and a.propietario_email is not null and lower(a.propietario_email) = lower(coalesce(auth.jwt() ->> 'email', ''))));
-- Mails: la función /api/portal-notify (Vercel) lee publicador y aviso con la clave pública y envía por Resend. Variables RESEND_API_KEY y PORTAL_MAIL_FROM en Vercel.
