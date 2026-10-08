-- Vuelta atrás de la migración 24: saca el disparador. Los nombres quedan como están (abreviados).
begin;
drop trigger if exists trg_pub_nombre_dueno on portal.publicadores;
drop function if exists portal.nombre_dueno_publico();
commit;
