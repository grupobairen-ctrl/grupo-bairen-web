-- =====================================================================
-- BAIREN · Portal · Migración 10 · Las expensas salen del texto
--
-- Problema: en los once avisos de largo plazo el campo `expensas` está
-- vacío. El monto existe, pero escrito adentro de la descripción, así
-- que la ficha no lo puede mostrar aparte ni sumarlo al precio. El que
-- mira ve "USD 850" y se entera de los $170.000 leyendo el párrafo.
--
-- Los montos de abajo se leyeron de la descripción de cada unidad en la
-- base de bairengroup.com el 22/9/2026. La descripción NO se toca: el
-- texto queda igual, solo se completa el campo.
--
-- Quedan afuera a propósito:
--   · Medrano 333 7A: la descripción dice "expensas y servicios a cargo
--     del inquilino" sin monto. No se inventa un número.
--   · Av. Santa Fe 4866 12 C: está en_revision (no se ve en el portal) y
--     además tiene dos precios distintos, USD 1.200 en la web y USD 1.350
--     en el portal. Hay que resolver cuál antes de tocarla.
--
-- Repetible: correrla dos veces deja lo mismo. SUBIR el archivo.
-- =====================================================================

update portal.avisos set expensas = 170000
 where codigo = 'BA-CONGRESO23612BL' and expensas is distinct from 170000;

update portal.avisos set expensas = 450000
 where codigo = 'BA-NUNEZ31001L' and expensas is distinct from 450000;

update portal.avisos set expensas = 600000
 where codigo = 'BA-JUNCAL600PISOS1011L' and expensas is distinct from 600000;

update portal.avisos set expensas = 1800000
 where codigo = 'BA-FIGUEROAALCORTA33002L' and expensas is distinct from 1800000;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- select codigo, direccion, precio, moneda, expensas from portal.avisos
--  where operacion = 'alquiler' order by direccion;
