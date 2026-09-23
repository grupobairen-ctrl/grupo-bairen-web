-- =====================================================================
-- BAIREN · Web · Rollback de la migración web 01
--
-- Devuelve las 6 unidades a 'Tradicional' y las saca del catálogo, como
-- estaban entre el 22/9 y el 23/9/2026. precio_tradicional nunca se
-- borró, así que el precio vuelve solo.
--
-- Los campos expensas / expensas_incluidas NO se eliminan: son inocuos
-- (el default 'true' deja a las 25 unidades de paquete como estaban) y
-- tirarlos rompería propiedad.html y catalogo.html si el código nuevo ya
-- está publicado. Para sacarlos de verdad, primero revertir el código.
-- =====================================================================

update propiedades
   set tipo               = 'Tradicional',
       precio_temporal    = null,
       plazo              = 'A partir de 2 años',
       expensas_incluidas = true,
       updated_at         = now()
 where slug in (
         'figueroa-alcorta-3300-2',
         'juncal-600-pisos-10-11',
         'nunez-3100-1',
         'congreso-2361-2-b',
         'medrano-333-7a',
         'av-santa-fe-4866-12-c'
       );

-- La línea agregada a la descripción de Av. Santa Fe 4866 12 C:
update propiedades
   set descripcion = regexp_replace(descripcion, '^Expensas y servicios a cargo del inquilino \(valor a consultar\)\.\s*', ''),
       updated_at  = now()
 where slug = 'av-santa-fe-4866-12-c';

-- Verificación: select tipo, count(*) from propiedades group by 1;
