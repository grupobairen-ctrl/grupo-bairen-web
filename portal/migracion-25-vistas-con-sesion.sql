-- =====================================================================
-- BAIREN · Portal · Migración 25 · Las vistas de quien tiene sesión también cuentan
--
-- 8/10/2026. portal.vistas tenía INSERT para anon pero no para authenticated: la ficha de cualquiera con sesión
-- (compradores con favoritos, publicadores, el equipo) no sumaba la vista, y el error no se veía (la página no lo
-- muestra). La política "vistas insert" ya deja insertar a cualquiera; faltaba el permiso de tabla. Repetible.
-- Vuelta atrás: migracion-25-vistas-con-sesion-rollback.sql.
-- =====================================================================
grant insert on portal.vistas to authenticated;

select 'authenticated inserta en vistas' as control, has_table_privilege('authenticated', 'portal.vistas', 'INSERT') as ok;
