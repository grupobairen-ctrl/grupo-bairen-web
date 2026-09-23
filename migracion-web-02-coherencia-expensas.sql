-- =====================================================================
-- BAIREN · Web · Migración web 02
-- Coherencia de expensas: auditoría de las 31 fichas del 23/9/2026.
--
-- Se revisó, unidad por unidad, que lo que dice el texto de la
-- descripción coincida con lo que dicen los campos (y por lo tanto con
-- lo que imprime la ficha). Aparecieron dos problemas:
--
--   1. Dos de las seis unidades con expensas aparte lo decían solo en
--      castellano. Figueroa Alcorta 3300 2 tiene "Valor de expensas
--      $1.800.000 ARS" en español y nada en portugués ni en inglés; a
--      Av. Santa Fe 4866 12 C la migración web 01 le puso la línea en
--      español únicamente.
--
--   2. Pacheco de Melo 2016 4 se publica a USD 500 y su descripción
--      entera es "Expensas de 260.000ARS", pero estaba marcada como
--      precio paquete: la ficha decía "Todos incluidos" mientras el
--      texto cantaba un monto. Confirmado por Tomás el 23/9: esos
--      $260.000 van aparte.
--
-- Las otras cuatro con expensas aparte (Congreso, Juncal, Núñez y
-- Medrano) ya eran coherentes en los tres idiomas, y las 24 de precio
-- paquete tampoco tenían contradicciones. No se tocan.
--
-- Repetible: correrla dos veces deja lo mismo.
-- =====================================================================

-- ── 1. Pacheco de Melo 2016 4: las expensas van aparte ──────────────
update propiedades
   set expensas_incluidas = false,
       expensas           = 260000,
       updated_at         = now()
 where slug = 'pacheco-de-melo-2016-4'
   and (expensas_incluidas is distinct from false or expensas is distinct from 260000);

-- El texto decía el monto sin decir de quién es. Ahora lo dice.
update propiedades
   set descripcion    = 'Expensas de $260.000, a cargo del inquilino.',
       descripcion_pt = 'Condomínio de $260.000, por conta do inquilino.',
       descripcion_en = 'Building fees of $260,000, paid by tenant.',
       updated_at     = now()
 where slug = 'pacheco-de-melo-2016-4'
   and descripcion not ilike '%a cargo del inquilino%';

-- ── 2. Las expensas, también en portugués y en inglés ───────────────
-- La fila de la ficha ya muestra el monto en los tres idiomas (sale del
-- campo `expensas`, no del texto). Esto es para que el cuerpo de la
-- descripción no se contradiga con esa fila.
--
-- La línea va al principio del texto traducido, no en la misma posición
-- que en el español: insertarla en el medio de un párrafo traducido es
-- frágil y no vale la pena.

update propiedades
   set descripcion_pt = '- Valor do condomínio: $1.800.000 ARS' || chr(10) || chr(10) || descripcion_pt,
       updated_at     = now()
 where slug = 'figueroa-alcorta-3300-2'
   and descripcion_pt is not null
   and descripcion_pt not ilike '%condom%';

update propiedades
   set descripcion_en = '- Building fees: $1,800,000 ARS' || chr(10) || chr(10) || descripcion_en,
       updated_at     = now()
 where slug = 'figueroa-alcorta-3300-2'
   and descripcion_en is not null
   and descripcion_en not ilike '%building fee%';

update propiedades
   set descripcion_pt = 'Condomínio e serviços por conta do inquilino (valor a consultar).' || chr(10) || chr(10) || descripcion_pt,
       updated_at     = now()
 where slug = 'av-santa-fe-4866-12-c'
   and descripcion_pt is not null
   and descripcion_pt not ilike '%condom%';

update propiedades
   set descripcion_en = 'Building fees and utilities paid by tenant (amount on request).' || chr(10) || chr(10) || descripcion_en,
       updated_at     = now()
 where slug = 'av-santa-fe-4866-12-c'
   and descripcion_en is not null
   and descripcion_en not ilike '%building fee%';

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Esperado: 7 unidades con expensas aparte, las 7 nombrando las
-- expensas en los tres idiomas; 24 de precio paquete, ninguna con monto.
--
-- select dir, unidad, expensas,
--        descripcion     ilike '%expensa%'                                     as es_ok,
--        (descripcion_pt ilike '%condom%' or descripcion_pt ilike '%expensa%') as pt_ok,
--        (descripcion_en ilike '%fee%'    or descripcion_en ilike '%expense%') as en_ok
--   from propiedades where expensas_incluidas = false order by dir;
--
-- select count(*) filter (where expensas_incluidas) as paquete,
--        count(*) filter (where not expensas_incluidas) as aparte
--   from propiedades;
