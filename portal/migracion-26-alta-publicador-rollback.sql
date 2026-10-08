-- Vuelta atrás de la migración 26.
alter table portal.publicadores drop constraint if exists publicadores_auth_user_id_key;
