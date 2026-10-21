-- Deshace migracion-web-06: vuelve al plazo que tenía cada unidad el 21/10/2026
-- antes del cambio. Solo estas 5 tenían algo distinto de '3-12 meses'.
begin;
update propiedades set plazo = '6-12 meses' where id = '7605e874-c6b4-4619-88d6-2528daad08af';  -- Acevedo 500  (borrador)
update propiedades set plazo = '3 - 24 meses' where id = '166b5915-3d07-4b03-9595-f26ec1a1295e';  -- Austria 1938 2D (publicada)
update propiedades set plazo = '12 meses' where id = '8aa411e3-fd43-4511-b206-171766fb5784';  -- Humboldt 1865  (borrador)
update propiedades set plazo = '3-24 meses' where id = 'db998671-fc3b-4234-909f-3d27476c1b6b';  -- Juana Manso 1551 507 (publicada)
update propiedades set plazo = '3-24 meses' where id = '6715a22f-f983-47ef-94f4-7839781dc19c';  -- Medrano 333 7A (publicada)
commit;
