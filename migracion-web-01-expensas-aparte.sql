-- =====================================================================
-- BAIREN · Web (bairengroup.com) · Migración web 01
-- Los 6 de largo plazo vuelven al catálogo como mediano plazo,
-- con las expensas a la vista.
--
-- Contexto: el 22/9/2026 el catálogo pasó a mostrar solo mediano plazo
-- (commit a341aa5) y estas 6 unidades quedaron ocultas, porque su precio
-- es "seco" y la web promete precio final. No se borró nada: siguen
-- publicadas y su ficha abre por link directo.
--
-- Decisión del 23/9/2026: vuelven al catálogo como 'Temporal', pero sin
-- fingir que el precio incluye todo. Se agregan dos campos para que la
-- ficha pueda decir la verdad unidad por unidad:
--
--   expensas            monto mensual en ARS (null = no lo sabemos)
--   expensas_incluidas  si el precio publicado ya las incluye
--
-- Las 25 unidades que ya estaban en el catálogo son precio paquete de
-- verdad, así que el default 'true' las deja exactamente como están.
--
-- Los montos salen de la descripción de cada unidad, leída en esta misma
-- base. Son los mismos cuatro que ya se habían verificado el 22/9 en
-- portal/migracion-10-expensas.sql. Para Medrano 333 7A y Av. Santa Fe
-- 4866 12 C no hay monto en ningún lado: van con expensas = null y la
-- ficha muestra "A cargo del inquilino", sin inventar un número.
--
-- precio_tradicional NO se borra: queda como registro para el rollback.
--
-- Repetible: correrla dos veces deja lo mismo.
-- =====================================================================

-- ── 1. Campos nuevos ────────────────────────────────────────────────
alter table propiedades add column if not exists expensas numeric;
alter table propiedades add column if not exists expensas_incluidas boolean not null default true;

comment on column propiedades.expensas is
  'Expensas mensuales en ARS. Null = monto desconocido. Solo se muestra cuando expensas_incluidas = false.';
comment on column propiedades.expensas_incluidas is
  'true = el precio publicado ya incluye expensas y servicios (precio paquete, el modelo normal de Bairen). false = van aparte y la ficha lo dice.';

-- ── 2. Las 6 pasan a mediano plazo ──────────────────────────────────
-- precio_temporal toma el valor que ya tenían en precio_tradicional:
-- es el mismo alquiler, lo que cambia es el plazo y que las expensas
-- se declaran aparte en vez de esconderse en el párrafo.
update propiedades
   set tipo               = 'Temporal',
       precio_temporal    = precio_tradicional,
       plazo              = '3-12 meses',
       expensas_incluidas = false,
       updated_at         = now()
 where slug in (
         'figueroa-alcorta-3300-2',
         'juncal-600-pisos-10-11',
         'nunez-3100-1',
         'congreso-2361-2-b',
         'medrano-333-7a',
         'av-santa-fe-4866-12-c'
       )
   and tipo = 'Tradicional';

-- ── 3. Los montos que sí conocemos ──────────────────────────────────
update propiedades set expensas = 1800000
 where slug = 'figueroa-alcorta-3300-2' and expensas is distinct from 1800000;

update propiedades set expensas = 600000
 where slug = 'juncal-600-pisos-10-11'  and expensas is distinct from 600000;

update propiedades set expensas = 450000
 where slug = 'nunez-3100-1'            and expensas is distinct from 450000;

update propiedades set expensas = 170000
 where slug = 'congreso-2361-2-b'       and expensas is distinct from 170000;

-- Medrano 333 7A y Av. Santa Fe 4866 12 C quedan con expensas = null
-- a propósito. La ficha dirá "A cargo del inquilino" sin monto.

-- ── 4. La única descripción que no nombraba las expensas ────────────
-- Las otras cinco ya lo dicen en su texto; no se tocan.
update propiedades
   set descripcion = 'Expensas y servicios a cargo del inquilino (valor a consultar).' || chr(10) || chr(10) || descripcion,
       updated_at  = now()
 where slug = 'av-santa-fe-4866-12-c'
   and descripcion not ilike '%expensa%';

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Esperado: 31 filas Temporal, 0 Tradicional; 6 con expensas_incluidas
-- = false, de las cuales 4 con monto y 2 en null.
--
-- select tipo, expensas_incluidas, count(*)
--   from propiedades group by 1,2 order by 1,2;
--
-- select dir, unidad, tipo, plazo, precio_temporal, expensas, expensas_incluidas
--   from propiedades where expensas_incluidas = false order by dir;
