-- =====================================================================
-- BAIREN · Portal · Migración 33 · Vuelta atrás (garantías y seguros)
--
-- Saca las funciones y las dos tablas de la migración 33. Se pierden los proveedores cargados y las solicitudes.
-- Lo que ya quedó registrado en la operación NO se toca: los hitos garantia_elegida, garantia_emitida y seguro_emitido
-- y sus cargos simulados siguen en portal.hitos y portal.cargos (son de la migración 28).
-- =====================================================================

drop function if exists portal.solicitudes_garantia_lista(integer);
drop function if exists portal.guardar_proveedor_garantia(uuid, jsonb);
drop function if exists portal.actualizar_garantia(uuid, text, numeric, text, text);
drop function if exists portal.usar_garantia_propia(uuid, text);
drop function if exists portal.elegir_garantia(uuid, uuid);
drop function if exists portal.garantias_disponibles();
drop function if exists portal._garantia_url(text, text, uuid);
drop function if exists portal._garantia_impedimento(uuid);
drop function if exists portal._garantia_base(uuid);

drop table if exists portal.solicitudes_garantia;
drop table if exists portal.proveedores_garantia;

notify pgrst, 'reload schema';

select 'migración 33 deshecha' as control,
  not exists (select 1 from information_schema.tables where table_schema = 'portal' and table_name in ('proveedores_garantia', 'solicitudes_garantia'))
  and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'portal' and p.proname like '%garantia%') as ok;
