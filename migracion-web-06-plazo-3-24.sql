-- Pedido de Tomás (21/10/2026): todas las unidades de mediano plazo pasan a
-- '3-24 meses', menos Álvarez Thomas 800, que queda en '12 - 24 meses'.
-- Se aplicó por la API con la clave de servicio; esto es lo mismo en SQL.
-- Para deshacer: migracion-web-06-plazo-3-24-rollback.sql
update propiedades
   set plazo = '3-24 meses'
 where tipo = 'Temporal'
   and slug <> 'alvarez-thomas-800';
