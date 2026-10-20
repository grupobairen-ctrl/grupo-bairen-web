-- =====================================================================
-- BAIREN · Web · Migración web 03 · Solo los administradores editan
--
-- En la base de bairengroup.com (proyecto nmrjyyrhwjroonrppnka), las
-- políticas de schema.sql decían "cualquier usuario autenticado puede
-- CRUD todo": cualquier cuenta con sesión podía crear, editar y borrar
-- propiedades, imágenes y amenities, y subir o borrar fotos del bucket
-- imagenes-propiedades. El registro público estuvo abierto hasta el
-- 1/10/2026 (verificado ese día: disable_signup = true), así que pudo
-- haber cuentas que no son del equipo.
--
-- Este archivo:
--   1. Crea public.admins_web: la lista de mails que administran la web.
--   2. Crea public.es_admin_web(): ¿el mail de la sesión está en la lista?
--   3. Cambia las políticas de escritura de propiedades, imagenes,
--      amenities y del bucket imagenes-propiedades para que pidan
--      es_admin_web(). La lectura pública de lo publicado no cambia.
--
-- ANTES DE CORRER, en el PASO 0:
--   · Mirá la lista de cuentas (0.A). Cualquier mail que no sea del
--     equipo es una cuenta de afuera: anotalo y avisá.
--   · Completá la lista de admins del PASO 1 (0.B muestra la de hoy).
--     Van los mails con los que el equipo entra al admin. Si falta uno,
--     esa persona deja de poder cargar propiedades hasta que se sume.
--
-- Qué NO hace: no borra cuentas ni datos, no toca el portal ni el OS.
-- Vuelta atrás: migracion-web-03-solo-admins-rollback.sql.
-- Generada el 4/10/2026. Ensayada en PGlite. NO CORRIDA todavía.
-- =====================================================================


-- ── PASO 0 · ENSAYO (solo lectura) ──────────────────────────────────
-- 0.A · Las cuentas que hoy pueden escribir (todas las que existen).
select email, created_at::date as creada, last_sign_in_at::date as ultimo_ingreso
  from auth.users
 order by created_at;

-- 0.B · Las políticas de escritura de hoy (las que se reemplazan).
select tablename, policyname, cmd, roles
  from pg_policies
 where (schemaname = 'public' and tablename in ('propiedades', 'imagenes', 'amenities') and cmd <> 'SELECT')
    or (schemaname = 'storage' and tablename = 'objects' and policyname in ('admins suben imagenes', 'admins borran imagenes', 'admins actualizan imagenes'))
 order by 1, 2;

-- ── FIN DEL ENSAYO ──────────────────────────────────────────────────


begin;

-- ── PASO 1 · La lista de administradores ────────────────────────────
create table if not exists public.admins_web (
  email  text primary key check (email = lower(btrim(email))),
  nota   text,
  creado timestamptz not null default now()
);
alter table public.admins_web enable row level security;   -- sin políticas: solo la lee la función de abajo
revoke all on public.admins_web from anon, authenticated;

-- EDITAR ACÁ antes de correr: los mails con los que el equipo entra al admin.
insert into public.admins_web (email, nota) values
  ('grupobairen@gmail.com', 'cuenta de Grupo Bairen'),
  ('contact.tomasromero@gmail.com', 'Tomás'),
  ('julianlavayen.ofic@gmail.com', 'Julián')
  -- , ('<mail de Alethia>', 'Alethia')
  -- , ('<mail de Irene>', 'Irene')
on conflict (email) do nothing;

-- ── PASO 2 · ¿La sesión es de un admin? ─────────────────────────────
create or replace function public.es_admin_web()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins_web a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
revoke execute on function public.es_admin_web() from public, anon;
grant execute on function public.es_admin_web() to authenticated;

-- ── PASO 3 · Escribir pide ser admin ────────────────────────────────
drop policy if exists "admins ven todas" on public.propiedades;
drop policy if exists "admins crean"     on public.propiedades;
drop policy if exists "admins editan"    on public.propiedades;
drop policy if exists "admins borran"    on public.propiedades;
create policy "admins ven todas" on public.propiedades for select to authenticated using (public.es_admin_web());
create policy "admins crean"     on public.propiedades for insert to authenticated with check (public.es_admin_web());
create policy "admins editan"    on public.propiedades for update to authenticated using (public.es_admin_web()) with check (public.es_admin_web());
create policy "admins borran"    on public.propiedades for delete to authenticated using (public.es_admin_web());

drop policy if exists "admins imagenes ALL"  on public.imagenes;
drop policy if exists "admins amenities ALL" on public.amenities;
create policy "admins imagenes ALL"  on public.imagenes  for all to authenticated using (public.es_admin_web()) with check (public.es_admin_web());
create policy "admins amenities ALL" on public.amenities for all to authenticated using (public.es_admin_web()) with check (public.es_admin_web());

drop policy if exists "admins suben imagenes"      on storage.objects;
drop policy if exists "admins borran imagenes"     on storage.objects;
drop policy if exists "admins actualizan imagenes" on storage.objects;
create policy "admins suben imagenes" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagenes-propiedades' and public.es_admin_web());
create policy "admins borran imagenes" on storage.objects for delete to authenticated
  using (bucket_id = 'imagenes-propiedades' and public.es_admin_web());
create policy "admins actualizan imagenes" on storage.objects for update to authenticated
  using (bucket_id = 'imagenes-propiedades' and public.es_admin_web());

-- Control: hay al menos un admin, y ninguna política de escritura quedó con "true" a secas.
do $$
declare n int;
begin
  select count(*) into n from public.admins_web;
  if n = 0 then raise exception 'Control fallido: la lista de admins está vacía; nadie podría cargar propiedades.'; end if;
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename in ('propiedades', 'imagenes', 'amenities') and cmd <> 'SELECT'
     and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');
  if n > 0 then raise exception 'Control fallido: quedan % políticas de escritura abiertas.', n; end if;
end $$;

commit;


-- ── VERIFICACIÓN (solo lectura) ─────────────────────────────────────
select tablename, policyname, cmd, qual, with_check
  from pg_policies
 where (schemaname = 'public' and tablename in ('propiedades', 'imagenes', 'amenities'))
    or (schemaname = 'storage' and tablename = 'objects' and policyname like 'admins %imagenes')
 order by 1, 2;
select email, nota from public.admins_web order by email;
