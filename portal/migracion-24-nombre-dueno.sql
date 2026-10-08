-- =====================================================================
-- BAIREN · Portal · Migración 24 · El dueño directo, con la inicial del apellido
--
-- 8/10/2026. portal.publicadores se lee con la clave pública (el directorio de publicadores y "Publica:" en
-- cada aviso). Para un dueño directo, el nombre ahí va como "Graciela P." (portal.nombre_publico, migración 12):
-- el completo vive solo en portal.personas, que ve la persona y el equipo. La página ya lo manda así desde el
-- 8/10; este disparador lo asegura aunque llegue completo (una versión vieja de la página, el SQL Editor).
-- Solo toca el nombre de filas con tipo = 'dueno'. Repetible. Vuelta atrás: migracion-24-nombre-dueno-rollback.sql.
-- =====================================================================
begin;

create or replace function portal.nombre_dueno_publico() returns trigger
language plpgsql security definer set search_path = portal, public as $$
begin
  if new.tipo = 'dueno' then
    new.nombre := coalesce(portal.nombre_publico(new.nombre), new.nombre);
  end if;
  return new;
end $$;

revoke all on function portal.nombre_dueno_publico() from public, anon, authenticated;

drop trigger if exists trg_pub_nombre_dueno on portal.publicadores;
create trigger trg_pub_nombre_dueno before insert or update of nombre, tipo on portal.publicadores
  for each row execute function portal.nombre_dueno_publico();

-- Los dueños que ya están: en la base del 8/10 los 13 ya estaban abreviados; esto no cambia nada en ellos.
update portal.publicadores set nombre = portal.nombre_publico(nombre)
 where tipo = 'dueno' and nombre is distinct from portal.nombre_publico(nombre) and portal.nombre_publico(nombre) is not null;

commit;

-- Control
select 'disparador trg_pub_nombre_dueno' as control,
       exists (select 1 from pg_trigger where tgname = 'trg_pub_nombre_dueno' and tgrelid = 'portal.publicadores'::regclass) as ok
union all
select 'ningún dueño con el nombre completo',
       not exists (select 1 from portal.publicadores where tipo = 'dueno' and nombre is distinct from portal.nombre_publico(nombre) and portal.nombre_publico(nombre) is not null);
