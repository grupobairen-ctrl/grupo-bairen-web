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
drop policy if exists "publicadores visibles" on portal.publicadores;
create policy "publicadores visibles" on portal.publicadores for select using (verificado);
drop policy if exists "avisos publicados visibles" on portal.avisos;
create policy "avisos publicados visibles" on portal.avisos for select using (estado_curacion = 'publicado');
drop policy if exists "fotos de avisos publicados" on portal.fotos;
create policy "fotos de avisos publicados" on portal.fotos for select using (exists (select 1 from portal.avisos a where a.id = aviso_id and a.estado_curacion = 'publicado'));
drop policy if exists "cualquiera consulta" on portal.consultas;
create policy "cualquiera consulta" on portal.consultas for insert with check (true);

-- Exponer el esquema a la API (Dashboard -> Settings -> API -> Exposed schemas: agregar `portal`)

-- ---------------------------------------------------------------------
-- MIGRACIÓN INICIAL: las unidades actuales como avisos de Maxim Rentals
-- ---------------------------------------------------------------------
insert into portal.publicadores (slug, tipo, nombre, responsable, matricula, colegio, badge, verificado, verificado_en, zonas, email)
values ('maxim-rentals','inmobiliaria','Maxim Rentals','Maximiliano Matzkin','CUCICBA 7527','Colegio Único de Corredores Inmobiliarios de la Ciudad de Buenos Aires','Corredor inmobiliario matriculado', true, now(), '{Recoleta,Palermo,Núñez,Puerto Madero,Belgrano}', null)  -- el mail y el WhatsApp reales de Maxim Rentals se cargan aparte; hasta entonces la ficha dice Contacto pendiente
on conflict (slug) do nothing;

-- El portal vive en su propio proyecto de Supabase, separado del de bairengroup.com,
-- así que public.propiedades puede no existir acá. Si está, se migran las unidades;
-- si no, el esquema queda listo y las unidades se cargan con portal/seed-avisos.sql.
do $mig$
begin
  if to_regclass('public.propiedades') is null then
    raise notice 'sin public.propiedades en este proyecto: se omite la migracion inicial. Corré portal/seed-avisos.sql para cargar las unidades.';
    return;
  end if;
  execute $sql1$
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
  on conflict (codigo) do nothing
  $sql1$;
  execute $sql2$
insert into portal.fotos (aviso_id, url, orden)
  select av.id, i.url, i.orden from portal.avisos av join public.imagenes i on i.propiedad_id = av.propiedad_id
  where not exists (select 1 from portal.fotos f where f.aviso_id = av.id)
  $sql2$;
end
$mig$;

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
grant insert on portal.consultas to anon;
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
drop policy if exists "vistas insert" on portal.vistas;
create policy "vistas insert" on portal.vistas for insert with check (true);
grant insert on portal.vistas to anon;  -- el permiso va acá: en el bloque de arriba la tabla todavía no existía

create or replace function portal.es_curador() returns boolean language sql stable as $$
  select exists (select 1 from portal.curadores c where c.email = coalesce(auth.jwt() ->> 'email', ''));
$$;
create or replace function portal.mi_publicador() returns uuid language sql stable as $$
  select id from portal.publicadores where auth_user_id = auth.uid() limit 1;
$$;

-- publicadores: cada cuenta ve y edita el suyo; los curadores todo
drop policy if exists "publicador propio select" on portal.publicadores;
create policy "publicador propio select" on portal.publicadores for select using (auth_user_id = auth.uid() or portal.es_curador());
drop policy if exists "publicador propio insert" on portal.publicadores;
create policy "publicador propio insert" on portal.publicadores for insert with check (auth_user_id = auth.uid());
drop policy if exists "publicador propio update" on portal.publicadores;
create policy "publicador propio update" on portal.publicadores for update using (auth_user_id = auth.uid() or portal.es_curador());

-- avisos: el publicador ve y edita los suyos en cualquier estado; los curadores todo; el público solo publicados
drop policy if exists "avisos propios select" on portal.avisos;
create policy "avisos propios select" on portal.avisos for select using (publicador_id = portal.mi_publicador() or portal.es_curador());
drop policy if exists "avisos propios insert" on portal.avisos;
create policy "avisos propios insert" on portal.avisos for insert with check (publicador_id = portal.mi_publicador());
drop policy if exists "avisos propios update" on portal.avisos;
create policy "avisos propios update" on portal.avisos for update using (publicador_id = portal.mi_publicador() or portal.es_curador());

drop policy if exists "fotos propias all" on portal.fotos;
create policy "fotos propias all" on portal.fotos for all using (exists (select 1 from portal.avisos a where a.id = aviso_id and (a.publicador_id = portal.mi_publicador() or portal.es_curador())));

-- consultas: el publicador ve las que recibe; los curadores todo
drop policy if exists "consultas del publicador" on portal.consultas;
create policy "consultas del publicador" on portal.consultas for select using (publicador_id = portal.mi_publicador() or portal.es_curador());

-- verificaciones: el publicador crea las suyas y las ve; los curadores todo
alter table portal.verificaciones enable row level security;
drop policy if exists "verif propias" on portal.verificaciones;
create policy "verif propias" on portal.verificaciones for select using (publicador_id = portal.mi_publicador() or portal.es_curador());
drop policy if exists "verif insert" on portal.verificaciones;
create policy "verif insert" on portal.verificaciones for insert with check (publicador_id = portal.mi_publicador());
drop policy if exists "verif update curador" on portal.verificaciones;
create policy "verif update curador" on portal.verificaciones for update using (portal.es_curador());

alter table portal.curadores enable row level security;
drop policy if exists "curadores se ven a si mismos" on portal.curadores;
create policy "curadores se ven a si mismos" on portal.curadores for select using (email = coalesce(auth.jwt() ->> 'email', ''));

-- Storage: fotos públicas, documentos privados
insert into storage.buckets (id, name, public) values ('portal-fotos', 'portal-fotos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('portal-docs', 'portal-docs', false) on conflict (id) do nothing;
drop policy if exists "fotos publicas lectura" on storage.objects;
create policy "fotos publicas lectura" on storage.objects for select using (bucket_id = 'portal-fotos');
drop policy if exists "fotos sube autenticado" on storage.objects;
create policy "fotos sube autenticado" on storage.objects for insert with check (bucket_id = 'portal-fotos' and auth.role() = 'authenticated');
drop policy if exists "fotos edita autenticado" on storage.objects;
create policy "fotos edita autenticado" on storage.objects for update using (bucket_id = 'portal-fotos' and auth.role() = 'authenticated');
drop policy if exists "docs sube autenticado" on storage.objects;
create policy "docs sube autenticado" on storage.objects for insert with check (bucket_id = 'portal-docs' and auth.role() = 'authenticated');
drop policy if exists "docs lee curador" on storage.objects;
create policy "docs lee curador" on storage.objects for select using (bucket_id = 'portal-docs' and portal.es_curador());
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
drop policy if exists "propietario ve su aviso" on portal.avisos;
create policy "propietario ve su aviso" on portal.avisos for select using (propietario_email is not null and lower(propietario_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
alter table portal.visitas_reservas enable row level security;
drop policy if exists "visitas del publicador" on portal.visitas_reservas;
create policy "visitas del publicador" on portal.visitas_reservas for all using (publicador_id = portal.mi_publicador() or portal.es_curador());
drop policy if exists "visitas las ve el propietario" on portal.visitas_reservas;
create policy "visitas las ve el propietario" on portal.visitas_reservas for select using (exists (select 1 from portal.avisos a where a.id = aviso_id and a.propietario_email is not null and lower(a.propietario_email) = lower(coalesce(auth.jwt() ->> 'email', ''))));
-- Mails: la función /api/portal-notify (Vercel) lee publicador y aviso con la clave pública y envía por Resend. Variables RESEND_API_KEY y PORTAL_MAIL_FROM en Vercel.

-- Columnas que el código ya escribía y no existían (auditoría 4/9/2026, hallazgo 15)
alter table portal.avisos add column if not exists quiero_produccion boolean not null default false;
alter table portal.avisos add column if not exists codigo_interno text;
create unique index if not exists avisos_codigo_interno_idx on portal.avisos(publicador_id, codigo_interno) where codigo_interno is not null;

-- =====================================================================
-- OLA 3 de la remediación (auditoría 4/9/2026) · cerrar la confianza en el servidor
-- =====================================================================

-- 3.1 La verificación no puede ser auto declarada.
-- RLS no filtra por columna, así que se protege con un disparador: al insertar,
-- nadie nace verificado; al actualizar, solo un curador toca los campos de confianza,
-- y la matrícula solo se corrige mientras el publicador todavía no fue verificado.
create or replace function portal.proteger_verificacion() returns trigger language plpgsql as $$
begin
  if portal.es_curador() then return new; end if;
  if tg_op = 'INSERT' then
    new.verificado := false;
    new.verificado_en := null;
    return new;
  end if;
  new.verificado := old.verificado;
  new.verificado_en := old.verificado_en;
  if old.verificado then
    new.matricula := old.matricula;
    new.colegio := old.colegio;
    new.badge := old.badge;
    new.cuit := old.cuit;
    new.tipo := old.tipo;
  end if;
  return new;
end $$;
drop trigger if exists trg_pub_verificacion on portal.publicadores;
create trigger trg_pub_verificacion before insert or update on portal.publicadores
  for each row execute function portal.proteger_verificacion();

-- 3.2 Tablas que se habían quedado sin seguridad por fila y con lectura para anónimos.
alter table portal.favoritos enable row level security;
alter table portal.alertas   enable row level security;
alter table portal.denuncias enable row level security;
revoke select on portal.favoritos, portal.alertas, portal.denuncias from anon;

drop policy if exists "favoritos propios" on portal.favoritos;
create policy "favoritos propios" on portal.favoritos for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "alertas propias" on portal.alertas;
create policy "alertas propias" on portal.alertas for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- Denunciar es un acto de cuidado: cualquiera puede, solo el equipo lee.
grant insert on portal.denuncias to anon, authenticated;
drop policy if exists "denuncia cualquiera" on portal.denuncias;
create policy "denuncia cualquiera" on portal.denuncias for insert with check (true);
drop policy if exists "denuncias las lee el curador" on portal.denuncias;
create policy "denuncias las lee el curador" on portal.denuncias for select using (portal.es_curador());
drop policy if exists "denuncias las resuelve el curador" on portal.denuncias;
create policy "denuncias las resuelve el curador" on portal.denuncias for update using (portal.es_curador());

-- 3.3 Los documentos de verificación tienen que poder borrarse de verdad.
drop policy if exists "docs borra curador" on storage.objects;
create policy "docs borra curador" on storage.objects for delete
  using (bucket_id = 'portal-docs' and portal.es_curador());
drop policy if exists "docs borra su dueño" on storage.objects;
create policy "docs borra su dueño" on storage.objects for delete
  using (bucket_id = 'portal-docs' and owner = auth.uid());

-- 3.4 El mail del propietario no sale al público.
revoke select (propietario_email) on portal.avisos from anon;

-- =====================================================================
-- OLA 4 de la remediación · que se pueda medir
-- =====================================================================
-- 4.1 Los avisos semilla no tienen identificador de base, así que consultas y vistas
-- se perdían. Se agrega una referencia de texto y el identificador pasa a ser opcional.
alter table portal.consultas add column if not exists aviso_ref text;
alter table portal.consultas alter column aviso_id drop not null;
alter table portal.vistas    add column if not exists aviso_ref text;
alter table portal.vistas    alter column aviso_id drop not null;
alter table portal.consultas add column if not exists publicador_ref text;
alter table portal.consultas alter column publicador_id drop not null;
create index if not exists consultas_ref_idx on portal.consultas(aviso_ref);
create index if not exists vistas_ref_idx on portal.vistas(aviso_ref);

-- 4.4 Un solo registro de eventos, sin dependencias.
create table if not exists portal.eventos (
  id         bigint generated always as identity primary key,
  evento     text not null,
  aviso_ref  text,
  publicador_ref text,
  usuario_id uuid,
  canal      text,
  datos      jsonb,
  creado_en  timestamptz not null default now()
);
create index if not exists eventos_evento_idx on portal.eventos(evento, creado_en desc);
alter table portal.eventos enable row level security;
grant insert on portal.eventos to anon, authenticated;
drop policy if exists "eventos escribe cualquiera" on portal.eventos;
create policy "eventos escribe cualquiera" on portal.eventos for insert with check (true);
drop policy if exists "eventos los lee el curador" on portal.eventos;
create policy "eventos los lee el curador" on portal.eventos for select using (portal.es_curador());

-- 4.3 Vistas agregadas por aviso, para que el panel muestre las reales y no las del navegador.
create or replace view portal.vistas_por_aviso as
  select coalesce(aviso_ref, aviso_id::text) as ref, count(*)::int as vistas
  from portal.vistas group by 1;
grant select on portal.vistas_por_aviso to anon, authenticated;
create or replace view portal.consultas_por_aviso as
  select coalesce(aviso_ref, aviso_id::text) as ref, count(*)::int as consultas
  from portal.consultas group by 1;
grant select on portal.consultas_por_aviso to authenticated;
-- 4.2 Una consulta por WhatsApp no trae nombre ni mail: se registra igual, con su canal.
alter table portal.consultas alter column nombre drop not null;
alter table portal.consultas alter column email  drop not null;
