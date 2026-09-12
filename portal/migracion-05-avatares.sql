-- =====================================================================
-- BAIREN · Portal · Migración 05 · La imagen de la cuenta
--
-- Cada cuenta puede elegir uno de cuatro íconos (portal/img/avatares) o subir
-- una foto propia. La elección vive en los metadatos del usuario de Auth
-- (user_metadata.avatar y user_metadata.avatar_url), que ya existen y no
-- necesitan tabla. Lo único que falta en la base es dónde guardar la foto:
--   1. el bucket 'portal-avatares', público de lectura: la imagen se ve en el
--      header y en el panel sin firmar URLs. La foto ya viene recortada por el
--      navegador a 320 px, cuadrada, JPEG, unos 20 KB.
--   2. políticas de storage: cualquiera lee; escribe, reemplaza y borra solo el
--      propio usuario, y solo dentro de su carpeta <uid>/… (la app sube
--      <uid>/avatar.jpg con upsert y borra ese mismo archivo al quitar la foto
--      o al elegir un ícono).
--
-- Si esta migración no corrió, la app lo dice al subir: "La foto no se pudo
-- subir: falta correr migracion-05-avatares.sql", y el ícono elegido queda igual.
--
-- Mismo estilo que los buckets de schema-portal.sql: insert ... on conflict do
-- nothing y drop policy if exists antes de cada create policy. Se puede correr
-- más de una vez sin problema. SUBIR el archivo en el SQL Editor del proyecto del
-- portal, NO pegarlo (por los acentos de los comentarios).
--
-- Orden: schema-portal.sql → migracion-01 → 02 → 03 → 04 → esta (05). No depende
-- de ninguna tabla del esquema portal, así que también puede correr sola.
-- Generado el 2026-09-12.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. El bucket: público de lectura, 2 MB de tope (la app manda ~20 KB) y solo
--    imágenes. Si ya existe, no se toca.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-avatares', 'portal-avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Políticas sobre storage.objects. La carpeta es el primer tramo de la ruta:
--    (storage.foldername(name))[1] = auth.uid()::text. Así una cuenta no puede
--    pisar ni borrar la foto de otra.
-- ---------------------------------------------------------------------
-- La foto se ve por su URL pública (el bucket es public y sirve los objetos sin
-- pasar por esta política). El select solo hace falta para que upsert y remove
-- devuelvan la fila propia; se limita a la propia carpeta para que nadie pueda
-- listar los uids de todas las cuentas con foto.
drop policy if exists "avatares lectura publica" on storage.objects;
create policy "avatares lectura publica" on storage.objects
  for select using (bucket_id = 'portal-avatares' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares sube el propio usuario" on storage.objects;
create policy "avatares sube el propio usuario" on storage.objects
  for insert with check (
    bucket_id = 'portal-avatares'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatares reemplaza el propio usuario" on storage.objects;
create policy "avatares reemplaza el propio usuario" on storage.objects
  for update using (
    bucket_id = 'portal-avatares'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'portal-avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatares borra el propio usuario" on storage.objects;
create policy "avatares borra el propio usuario" on storage.objects
  for delete using (
    bucket_id = 'portal-avatares'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- ---------------------------------------------------------------------
-- Control a mano, después de correr:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'portal-avatares';
--   select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'avatares%';
--   -- tienen que salir cuatro: select, insert, update, delete.
-- Qué archivos hay (cada cuenta, uno):
--   select name, created_at, updated_at from storage.objects where bucket_id = 'portal-avatares' order by updated_at desc limit 20;
-- Si una cuenta se borra desde Auth, su avatar.jpg queda huérfano en el bucket: borrarlo a mano o con un cron.
