-- =====================================================================
-- SIN CORREDOR — bairengroup.com (11/9/2026)
-- =====================================================================
-- Saca de todas las descripciones de propiedades (ES, EN y PT) la línea
-- "Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527,
-- Maxim Rentals" y sus variantes en inglés y portugués. No toca ninguna
-- otra línea (la de superficies aproximadas, la de contacto, etc.).
--
-- Pasos:
--   1. Supabase Dashboard (proyecto nmrjyyrhwjroonrppnka) -> SQL Editor
--   2. Copiar TODO este archivo y pegarlo en el editor
--   3. Click Run (o Cmd+Enter)
--   4. La última consulta tiene que devolver "campos_con_corredor = 0"
--
-- El 11/9/2026 había 13 propiedades publicadas con la línea (19 campos).
-- Las no publicadas también se limpian: el UPDATE corre sobre toda la tabla.
-- =====================================================================

begin;

-- Una línea entera que nombre al corredor, en cualquier idioma, desaparece.
-- Después se colapsan los saltos de línea que quedan de más y se recorta el final.
create or replace function pg_temp.sin_linea_corredor(t text) returns text
language sql immutable as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          t,
          '^[^\n]*(corredor responsable|responsible broker|corretor respons[aá]vel|matzkin|cucicba|maxim rentals)[^\n]*$',
          '', 'gin'
        ),
        '\n{3,}', E'\n\n', 'g'
      ),
      E' \t\r\n'
    ),
    ''
  )
$$;

update propiedades set
  descripcion    = pg_temp.sin_linea_corredor(descripcion),
  descripcion_en = pg_temp.sin_linea_corredor(descripcion_en),
  descripcion_pt = pg_temp.sin_linea_corredor(descripcion_pt)
where descripcion    ~* '(corredor responsable|responsible broker|corretor respons|matzkin|cucicba|maxim rentals)'
   or descripcion_en ~* '(corredor responsable|responsible broker|corretor respons|matzkin|cucicba|maxim rentals)'
   or descripcion_pt ~* '(corredor responsable|responsible broker|corretor respons|matzkin|cucicba|maxim rentals)';

commit;

-- Verificación: tiene que dar 0.
select count(*) as campos_con_corredor
from propiedades p, unnest(array[p.descripcion, p.descripcion_en, p.descripcion_pt]) as d
where d ~* '(corredor responsable|responsible broker|corretor respons|matzkin|cucicba|maxim rentals)';
