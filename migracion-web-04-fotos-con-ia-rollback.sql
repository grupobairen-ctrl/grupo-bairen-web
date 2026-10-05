-- Vuelta atrás de la migración web 04. Solo se pierde la marca "con IA";
-- las fotos no se tocan. Correr DESPUÉS de volver el admin a una versión
-- que no lea con_ia, o el listado del admin deja de cargar.
alter table public.imagenes drop column if exists con_ia;
