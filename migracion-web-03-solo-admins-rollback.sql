-- =====================================================================
-- BAIREN · Web · Rollback de la migración web 03
-- Devuelve las políticas de schema.sql (cualquier autenticado escribe).
-- Deja public.admins_web y public.es_admin_web() sin uso, por si se
-- vuelve a correr la 03 (no borra la lista de mails). Repetible.
-- =====================================================================
begin;

drop policy if exists "admins ven todas" on public.propiedades;
drop policy if exists "admins crean"     on public.propiedades;
drop policy if exists "admins editan"    on public.propiedades;
drop policy if exists "admins borran"    on public.propiedades;
create policy "admins ven todas" on public.propiedades for select to authenticated using (true);
create policy "admins crean"     on public.propiedades for insert to authenticated with check (true);
create policy "admins editan"    on public.propiedades for update to authenticated using (true) with check (true);
create policy "admins borran"    on public.propiedades for delete to authenticated using (true);

drop policy if exists "admins imagenes ALL"  on public.imagenes;
drop policy if exists "admins amenities ALL" on public.amenities;
create policy "admins imagenes ALL"  on public.imagenes  for all to authenticated using (true) with check (true);
create policy "admins amenities ALL" on public.amenities for all to authenticated using (true) with check (true);

drop policy if exists "admins suben imagenes"      on storage.objects;
drop policy if exists "admins borran imagenes"     on storage.objects;
drop policy if exists "admins actualizan imagenes" on storage.objects;
create policy "admins suben imagenes" on storage.objects for insert to authenticated with check (bucket_id = 'imagenes-propiedades');
create policy "admins borran imagenes" on storage.objects for delete to authenticated using (bucket_id = 'imagenes-propiedades');
create policy "admins actualizan imagenes" on storage.objects for update to authenticated using (bucket_id = 'imagenes-propiedades');

commit;
