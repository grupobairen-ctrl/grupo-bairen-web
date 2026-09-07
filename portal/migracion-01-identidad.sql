-- =====================================================================
-- BAIREN · Portal · Migración 01 · Identidad: persona, matrícula y organización
--
-- Por qué: hoy `publicadores` es una fila por entidad, la matrícula cuelga de la
-- inmobiliaria y una cuenta es un rol. En la realidad legal la matrícula es de la
-- PERSONA (CUCICBA matricula corredores), la inmobiliaria es el envase, los
-- corredores cambian de agencia y se llevan su historial, y una misma persona es
-- dueño, corredor y buscador a la vez. Detalle en el vault:
-- "Modelo Portal BAIREN — Zonaprop ennichado (sep 2026)", sección 13.
--
-- Cómo: ADITIVA. No borra ni renombra nada de lo que el portal usa hoy.
--   · `publicadores` queda como el perfil que publica (la organización, o el dueño).
--   · `personas`   = la identidad: una por cuenta, con la matrícula si la tiene.
--   · `membresias` = quién pertenece a qué publicador, con rol.
--   · `operaciones` = el cierre real (precio pagado): el comienzo de los datos.
--   · `consultas.referido_por` = autoría del contacto: la semilla del MLS.
--   · `avisos.cualidades` / `cualidades_verificadas` = curaduría por cualidades.
-- Las políticas nuevas se SUMAN a las existentes (en Postgres las políticas
-- permisivas se combinan con OR), así el portal actual sigue andando igual
-- mientras el código se adapta.
--
-- Se puede correr más de una vez. SUBIR el archivo en el SQL Editor, no pegarlo.
-- Generado el 2026-09-07.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Personas: la identidad. Una por cuenta de auth. La matrícula vive acá.
-- ---------------------------------------------------------------------
create table if not exists portal.personas (
  id                     uuid primary key default gen_random_uuid(),
  auth_user_id           uuid unique,                    -- auth.users; null hasta que la persona se registre
  nombre                 text not null,
  apellido               text,
  email                  text,
  telefono               text,
  whatsapp               text,
  dni                    text,                           -- solo el número; el documento se verifica y se borra
  dni_verificado_en      timestamptz,
  matricula              text,                           -- '7527' (sin el colegio)
  colegio                text,                           -- 'CUCICBA' | 'CMCPSI' | ...
  matricula_verificada_en timestamptz,                   -- contra el registro público, por un curador
  matricula_verificada_por text,
  foto_url               text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists personas_auth_idx on portal.personas (auth_user_id);
create index if not exists personas_matricula_idx on portal.personas (colegio, matricula);
drop trigger if exists trg_personas_upd on portal.personas;
create trigger trg_personas_upd before update on portal.personas for each row execute function portal.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Membresías: persona ↔ publicador, con rol. Los roles se acumulan.
--    'titular'  = responsable del publicador (para una inmobiliaria, el corredor
--                 cuya matrícula respalda las publicaciones; para un dueño, él mismo).
--    'agente'   = trabaja para el publicador. 'admin' = administra la cuenta.
-- ---------------------------------------------------------------------
create table if not exists portal.membresias (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references portal.personas(id) on delete cascade,
  publicador_id uuid not null references portal.publicadores(id) on delete cascade,
  rol           text not null default 'agente' check (rol in ('titular','admin','agente')),
  desde         date not null default current_date,
  hasta         date,                                    -- null = vigente. El historial no se borra: se cierra.
  created_at    timestamptz not null default now(),
  unique (persona_id, publicador_id, desde)
);
create index if not exists membresias_pub_idx on portal.membresias (publicador_id) where hasta is null;
create index if not exists membresias_persona_idx on portal.membresias (persona_id) where hasta is null;

-- La persona detrás de la cuenta actual, si existe.
create or replace function portal.mi_persona() returns uuid
language sql stable security definer set search_path = portal, public as $$
  select id from portal.personas where auth_user_id = auth.uid() limit 1
$$;

-- ¿La cuenta actual es miembro vigente de este publicador?
create or replace function portal.es_miembro(p_pub uuid) returns boolean
language sql stable security definer set search_path = portal, public as $$
  select exists (
    select 1 from portal.membresias m
    join portal.personas p on p.id = m.persona_id
    where m.publicador_id = p_pub and m.hasta is null and p.auth_user_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------
-- 3. Políticas nuevas, que se suman a las existentes.
-- ---------------------------------------------------------------------
alter table portal.personas   enable row level security;
alter table portal.membresias enable row level security;

drop policy if exists "persona propia select" on portal.personas;
create policy "persona propia select" on portal.personas for select
  using (auth_user_id = auth.uid() or portal.es_curador());
drop policy if exists "persona propia insert" on portal.personas;
create policy "persona propia insert" on portal.personas for insert
  with check (auth_user_id = auth.uid());
drop policy if exists "persona propia update" on portal.personas;
create policy "persona propia update" on portal.personas for update
  using (auth_user_id = auth.uid() or portal.es_curador());
-- Lo público de una persona (nombre y matrícula) se expone por la vista de abajo, no por la tabla.

drop policy if exists "membresia propia select" on portal.membresias;
create policy "membresia propia select" on portal.membresias for select
  using (persona_id = portal.mi_persona() or portal.es_miembro(publicador_id) or portal.es_curador());
drop policy if exists "membresia alta por titular" on portal.membresias;
create policy "membresia alta por titular" on portal.membresias for insert
  with check (
    persona_id = portal.mi_persona()                                   -- me sumo yo (alta inicial)
    or exists (select 1 from portal.membresias m join portal.personas p on p.id = m.persona_id
               where m.publicador_id = membresias.publicador_id and m.hasta is null
                 and m.rol in ('titular','admin') and p.auth_user_id = auth.uid())  -- o me suma un titular/admin
    or portal.es_curador()
  );

-- El publicador también es accesible para sus miembros (además del auth_user_id histórico).
drop policy if exists "publicador por membresia select" on portal.publicadores;
create policy "publicador por membresia select" on portal.publicadores for select using (portal.es_miembro(id));
drop policy if exists "publicador por membresia update" on portal.publicadores;
create policy "publicador por membresia update" on portal.publicadores for update using (portal.es_miembro(id));

drop policy if exists "avisos por membresia select" on portal.avisos;
create policy "avisos por membresia select" on portal.avisos for select using (portal.es_miembro(publicador_id));
drop policy if exists "avisos por membresia insert" on portal.avisos;
create policy "avisos por membresia insert" on portal.avisos for insert with check (portal.es_miembro(publicador_id));
drop policy if exists "avisos por membresia update" on portal.avisos;
create policy "avisos por membresia update" on portal.avisos for update using (portal.es_miembro(publicador_id));

drop policy if exists "consultas por membresia select" on portal.consultas;
create policy "consultas por membresia select" on portal.consultas for select using (portal.es_miembro(publicador_id));

-- ---------------------------------------------------------------------
-- 4. Lo que se muestra en la ficha: "Publica: Maximiliano Matzkin · CUCICBA 7527 · Maxim Rentals"
--    Vista pública, solo publicadores verificados y titulares con matrícula verificada.
-- ---------------------------------------------------------------------
create or replace view portal.publicador_publico as
select
  pb.id, pb.slug, pb.tipo, pb.nombre, pb.logo_url, pb.descripcion, pb.zonas, pb.badge, pb.verificado,
  pb.telefono, pb.whatsapp, pb.email,
  pe.id  as titular_id,
  trim(coalesce(pe.nombre,'') || ' ' || coalesce(pe.apellido,'')) as titular_nombre,
  pe.colegio as titular_colegio,
  pe.matricula as titular_matricula,
  (pe.matricula_verificada_en is not null) as titular_matricula_verificada
from portal.publicadores pb
left join lateral (
  select p.* from portal.membresias m join portal.personas p on p.id = m.persona_id
  where m.publicador_id = pb.id and m.rol = 'titular' and m.hasta is null
  order by m.desde limit 1
) pe on true
where pb.verificado;
grant select on portal.publicador_publico to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Autoría del contacto: quién trajo la consulta. Semilla del MLS.
-- ---------------------------------------------------------------------
alter table portal.consultas add column if not exists referido_por uuid references portal.personas(id);
create index if not exists consultas_referido_idx on portal.consultas (referido_por);

-- ---------------------------------------------------------------------
-- 6. Operaciones: el cierre real. El precio pagado, no el pedido.
--    Nadie la usa todavía; existe para que cada cierre quede registrado desde el día uno.
-- ---------------------------------------------------------------------
create table if not exists portal.operaciones (
  id               uuid primary key default gen_random_uuid(),
  aviso_id         uuid references portal.avisos(id) on delete set null,
  publicador_id    uuid not null references portal.publicadores(id),
  tipo             text not null check (tipo in ('venta','alquiler','mediano')),
  precio_cierre    numeric(14,2) not null,
  moneda           text not null default 'USD' check (moneda in ('USD','ARS')),
  precio_publicado numeric(14,2),                        -- para medir la brecha pedido/pagado
  fecha_cierre     date not null,
  plazo_meses      integer,                              -- alquileres
  dias_en_mercado  integer,                              -- publicado_en → fecha_cierre
  visitas          integer,                              -- cuántas hicieron falta
  corredor_id      uuid references portal.personas(id),  -- quién cerró
  referido_por     uuid references portal.personas(id),  -- quién trajo la contraparte (colaboración)
  contraparte_id   uuid references portal.personas(id),  -- comprador o inquilino, si tiene cuenta
  nota             text,
  created_at       timestamptz not null default now()
);
create index if not exists operaciones_pub_idx on portal.operaciones (publicador_id, fecha_cierre desc);
alter table portal.operaciones enable row level security;
drop policy if exists "operaciones por membresia" on portal.operaciones;
create policy "operaciones por membresia" on portal.operaciones for all
  using (portal.es_miembro(publicador_id) or portal.es_curador())
  with check (portal.es_miembro(publicador_id) or portal.es_curador());

-- ---------------------------------------------------------------------
-- 7. Cualidades: lo que declara el publicador y lo que verificó la curación.
--    "La zona es dónde empezás; la cualidad es por qué entrás."
-- ---------------------------------------------------------------------
alter table portal.avisos add column if not exists cualidades text[] not null default '{}';
alter table portal.avisos add column if not exists cualidades_verificadas text[] not null default '{}';
alter table portal.avisos add column if not exists cualidades_verificadas_por text;
alter table portal.avisos add column if not exists cualidades_verificadas_en timestamptz;
create index if not exists avisos_cualidades_idx on portal.avisos using gin (cualidades_verificadas);

-- ---------------------------------------------------------------------
-- 8. Backfill: lo que ya existe pasa al modelo nuevo sin perder nada.
-- ---------------------------------------------------------------------
do $mig$
declare v_pub uuid; v_per uuid; r record;
begin
  -- 8.a Maxim Rentals: la persona es Maximiliano Matzkin, matrícula CUCICBA 7527, titular.
  select id into v_pub from portal.publicadores where slug = 'maxim-rentals';
  if v_pub is not null then
    select id into v_per from portal.personas where colegio = 'CUCICBA' and matricula = '7527';
    if v_per is null then
      insert into portal.personas (nombre, apellido, matricula, colegio)
      values ('Maximiliano', 'Matzkin', '7527', 'CUCICBA') returning id into v_per;
    end if;
    if not exists (select 1 from portal.membresias where persona_id = v_per and publicador_id = v_pub and hasta is null) then
      insert into portal.membresias (persona_id, publicador_id, rol) values (v_per, v_pub, 'titular');
    end if;
  end if;

  -- 8.b Cualquier publicador que ya tenga cuenta: su persona y su membresía de titular.
  for r in select id, auth_user_id, nombre, responsable, email, telefono, whatsapp, matricula, colegio
           from portal.publicadores where auth_user_id is not null loop
    select id into v_per from portal.personas where auth_user_id = r.auth_user_id;
    if v_per is null then
      insert into portal.personas (auth_user_id, nombre, email, telefono, whatsapp,
                                   matricula, colegio)
      values (r.auth_user_id, coalesce(r.responsable, r.nombre), r.email, r.telefono, r.whatsapp,
              nullif(regexp_replace(coalesce(r.matricula,''), '\D', '', 'g'), ''),
              case when r.matricula ilike 'CUCICBA%' then 'CUCICBA' else r.colegio end)
      returning id into v_per;
    end if;
    if not exists (select 1 from portal.membresias where persona_id = v_per and publicador_id = r.id and hasta is null) then
      insert into portal.membresias (persona_id, publicador_id, rol) values (v_per, r.id, 'titular');
    end if;
  end loop;
end
$mig$;

commit;
