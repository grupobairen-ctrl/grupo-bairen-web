-- Pedido de Tomás (21/10/2026): el modelo de BAIREN es de 3 a 12 meses, todo
-- incluido. Todas las unidades de mediano plazo quedan en '3-12 meses', menos
-- Álvarez Thomas 800, que sigue en '12 - 24 meses'.
-- Se aplicó por la API con la clave de servicio; esto es lo mismo en SQL.
-- Para deshacer: migracion-web-06-plazo-3-12-rollback.sql
update propiedades
   set plazo = '3-12 meses'
 where tipo = 'Temporal'
   and slug <> 'alvarez-thomas-800';
