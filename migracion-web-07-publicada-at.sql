-- ════════════════════════════════════════════════════════════════════
-- Migración web 07 · Fecha de publicación (24/10/2026)
--
-- El cartel "Nuevo" del catálogo y de la home sale las primeras 48 horas
-- desde que la unidad se publica (Tomás, 24/10/2026). Hasta acá solo
-- estaba created_at, que es cuando se cargó en el admin: una unidad
-- cargada como borrador y publicada días después nunca se veía nueva.
--
-- · publicada_at se escribe sola cada vez que publicada pasa a true
--   (al crearla ya publicada, o al publicar un borrador). Si se despublica
--   y se vuelve a publicar, cuenta de nuevo.
-- · Las que ya estaban publicadas toman created_at, que es lo mejor que hay.
-- · Mismo estilo que stamp_reservada / reservada_at.
--
-- Solo agrega: no cambia ni borra datos.
-- Para deshacer: migracion-web-07-publicada-at-rollback.sql
-- ════════════════════════════════════════════════════════════════════

alter table public.propiedades add column if not exists publicada_at timestamptz;

update public.propiedades
   set publicada_at = created_at
 where publicada and publicada_at is null;

create or replace function public.stamp_publicada()
returns trigger
language plpgsql
as $$
begin
  if new.publicada then
    if tg_op = 'INSERT' then
      new.publicada_at := now();
    elsif old.publicada is distinct from true then
      new.publicada_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_publicada on public.propiedades;
create trigger trg_stamp_publicada
  before insert or update on public.propiedades
  for each row execute function public.stamp_publicada();
