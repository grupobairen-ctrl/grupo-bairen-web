-- =====================================================================
-- BAIREN · Web · Rollback de la migración web 02
-- Deja Pacheco de Melo 2016 4 como precio paquete otra vez y saca las
-- líneas de expensas de las traducciones.
-- =====================================================================

update propiedades
   set expensas_incluidas = true,
       expensas           = null,
       descripcion        = 'Expensas de 260.000ARS',
       descripcion_pt     = 'Despesas de 260.000ARS',
       descripcion_en     = 'Expenses of 260,000ARS',
       updated_at         = now()
 where slug = 'pacheco-de-melo-2016-4';

update propiedades
   set descripcion_pt = regexp_replace(descripcion_pt, '^- Valor do condomínio: \$1\.800\.000 ARS\s*', ''),
       descripcion_en = regexp_replace(descripcion_en, '^- Building fees: \$1,800,000 ARS\s*', ''),
       updated_at     = now()
 where slug = 'figueroa-alcorta-3300-2';

update propiedades
   set descripcion_pt = regexp_replace(descripcion_pt, '^Condomínio e serviços por conta do inquilino \(valor a consultar\)\.\s*', ''),
       descripcion_en = regexp_replace(descripcion_en, '^Building fees and utilities paid by tenant \(amount on request\)\.\s*', ''),
       updated_at     = now()
 where slug = 'av-santa-fe-4866-12-c';
