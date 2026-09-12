-- =====================================================================
-- BAIREN · Portal · Migración 06 · Las alertas se pueden borrar y no se duplican
--
-- Las alertas del que busca ("avisame cuando entre una propiedad así",
-- "avisame si baja de precio") viven en portal.alertas y el motor
-- (api/portal-diario) las manda por mail. Hasta acá:
--   1. quitar una alerta desde el portal no podía borrar la fila: el esquema
--      da a `authenticated` insert y update sobre las tablas, pero nunca dio
--      delete. La política "alertas propias" (for all, usuario_id = auth.uid())
--      ya limita a la propia fila; solo faltaba el privilegio. Lo mismo para
--      favoritos, que el portal también borra.
--   2. nada impedía dos alertas iguales del mismo usuario: se agrega una
--      columna `clave` (la clave de la búsqueda, que el portal guarda en
--      filtros->>'key') y dos índices únicos, uno por búsqueda y otro por aviso
--      para las de precio. El portal reusa la fila si ya existe; el índice es
--      la red por si dos pestañas la crean a la vez.
--
-- Repetible. SUBIR el archivo en el SQL Editor del proyecto del portal, NO pegar.
-- Generado el 2026-09-12.
-- =====================================================================
begin;

-- 1. Borrar lo propio: el privilegio que faltaba (la política ya limita a la propia fila).
grant delete on portal.alertas, portal.favoritos to authenticated;

-- 2. Sin duplicados: la clave de la búsqueda como columna generada.
alter table portal.alertas add column if not exists clave text generated always as (filtros->>'key') stored;

-- Si ya hubiera duplicados (misma clave o mismo aviso), se conserva la más vieja.
delete from portal.alertas a using portal.alertas b
 where a.usuario_id = b.usuario_id and a.tipo = b.tipo and a.id > b.id
   and ((a.tipo = 'busqueda' and a.clave is not null and a.clave = b.clave)
     or (a.tipo = 'precio' and a.aviso_id is not null and a.aviso_id = b.aviso_id));

create unique index if not exists alertas_busqueda_uq on portal.alertas (usuario_id, clave) where tipo = 'busqueda' and clave is not null;
create unique index if not exists alertas_precio_uq   on portal.alertas (usuario_id, aviso_id) where tipo = 'precio' and aviso_id is not null;

-- 3. Control.
do $c$
declare n_del int; n_idx int;
begin
  select count(*) into n_del from information_schema.role_table_grants
   where table_schema = 'portal' and table_name in ('alertas', 'favoritos') and grantee = 'authenticated' and privilege_type = 'DELETE';
  select count(*) into n_idx from pg_indexes where schemaname = 'portal' and indexname in ('alertas_busqueda_uq', 'alertas_precio_uq');
  raise notice 'control: delete concedido en alertas y favoritos = % (debe ser 2)', n_del;
  raise notice 'control: índices únicos de alertas = % (debe ser 2)', n_idx;
end
$c$;

commit;
