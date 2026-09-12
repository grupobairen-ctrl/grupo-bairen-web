-- =====================================================================
-- BAIREN · Portal · Migración 07 · Copia de seguridad diaria de la base
--
-- Cada día, al final de la rutina diaria (api/portal-diario.js, paso e), el
-- motor lee todas las tablas del esquema portal con la service key, arma un
-- JSON y lo guarda en el bucket 'portal-respaldos' como <año>/<fecha>.json.
-- Conserva los últimos 30 diarios y el primero de cada mes de los últimos 12
-- meses; el resto lo borra. Lo hace api/_portal/respaldo.js; también se puede
-- disparar a mano con GET /api/portal-respaldo (header x-portal-key).
--
-- Lo único que falta en la base es el lugar donde guardar la copia:
--   1. el bucket 'portal-respaldos', PRIVADO (public = false). Solo la service
--      key lee, escribe y borra. Nadie del navegador puede llegar: no hay
--      políticas para anon ni authenticated, y sin política RLS no deja pasar.
--   2. Tope de 100 MB por archivo (hoy una copia pesa unos cientos de KB) y solo
--      JSON.
--
-- La copia incluye lo que se puede leer de Auth por la API de administración
-- (id, mail, fecha de alta y metadatos de cada cuenta), bajo la clave
-- "auth_users". No incluye contraseñas ni tokens: Auth no los expone.
--
-- Idempotente: insert ... on conflict do nothing. Se puede correr más de una
-- vez. SUBIR el archivo en el SQL Editor del proyecto del portal, NO pegarlo
-- (por los acentos de los comentarios).
--
-- Orden: schema-portal.sql → 01 → 02 → 03 → 04 → 05 → 06 → esta (07). No depende
-- de ninguna tabla del esquema portal, así que también puede correr sola.
-- Generado el 2026-09-12.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. El bucket: privado, 100 MB de tope por archivo, solo JSON.
--    Si ya existe, no se toca.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portal-respaldos', 'portal-respaldos', false, 104857600, array['application/json'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Sin políticas. La service key salta RLS; anon y authenticated no tienen
--    ninguna política sobre este bucket y por eso no pueden listar, leer,
--    subir ni borrar. Si alguna vez alguien creó una por error, acá se limpia.
-- ---------------------------------------------------------------------
drop policy if exists "respaldos lectura" on storage.objects;
drop policy if exists "respaldos escritura" on storage.objects;

commit;

-- ---------------------------------------------------------------------
-- Control a mano, después de correr:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'portal-respaldos';
--   -- public tiene que ser false.
--   select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'respaldos%';
--   -- no tiene que salir ninguna.
-- Qué copias hay (la más nueva primero):
--   select name, (metadata->>'size')::bigint as bytes, created_at from storage.objects where bucket_id = 'portal-respaldos' order by name desc limit 40;
-- Primera copia, sin esperar al cron:
--   curl -s -H "x-portal-key: $PORTAL_NOTIFY_KEY" https://www.bairengroup.com/api/portal-respaldo | jq
