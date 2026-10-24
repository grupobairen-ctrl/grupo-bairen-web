-- Deshace migracion-web-07-publicada-at.sql (24/10/2026).
-- La web sigue andando sin la columna: usa created_at si publicada_at no viene.
drop trigger if exists trg_stamp_publicada on public.propiedades;
drop function if exists public.stamp_publicada();
alter table public.propiedades drop column if exists publicada_at;
