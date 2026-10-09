-- Vuelta atrás de la migración 37: saca la función de los pagos de todos. No toca datos.
drop function if exists portal.pagos_de_todos();
notify pgrst, 'reload schema';
