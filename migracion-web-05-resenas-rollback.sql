-- Vuelta atrás de migracion-web-05-resenas.sql
-- OJO: borra también las reseñas que hayan dejado los clientes. Antes de
-- correrla, exportar la tabla (Supabase → Table editor → resenas → Export).
drop table if exists public.resenas;
