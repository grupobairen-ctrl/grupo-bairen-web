-- =====================================================================
-- BAIREN · Portal · Migración 21 · Bairen Realty solo mediano plazo, y
-- tres limpiezas de datos
--
-- Acompaña el cambio de api/_portal/sync.js del 25/9/2026. Lo que la
-- sincronización ya hace sola desde ese cambio, este archivo lo deja
-- hecho ahora, sin esperar a la próxima corrida.
--
--   A. BAIREN REALTY PUBLICA SOLO MEDIANO PLAZO (decisión cerrada).
--      Cuatro unidades estaban publicadas dos veces, como largo plazo (L)
--      y mediano (M), al mismo precio: Av. Santa Fe 4866 12 C, Figueroa
--      Alcorta 3300 2, Juncal 600 pisos 10 y 11, Núñez 3100 1. Se pausan
--      los L publicados de Bairen Realty y quedan los M.
--      Francisco Acuña de Figueroa 1560 1 G tiene solo precio tradicional:
--      su único aviso es L, así que QUEDA SIN PUBLICAR hasta que la web le
--      cargue precio de mediano plazo. Ese día la sincronización le crea
--      el M sola. Los precios de las propiedades no se tocan: el equipo
--      los usa para trabajar.
--      Pausar, no borrar: consultas, favoritos y vistas siguen atados.
--
--   B. JUNCAL 600 SIN BARRIO. Se completa 'Retiro' (Juncal al 600, CABA;
--      es además lo que decía la web el 4/9/2026, portal/data/avisos-src.json,
--      y 'Retiro' está en BP.ZONAS de portal/js/ui.js, la lista que usa
--      portal/js/data.js). Con el cambio del sync, un barrio vacío en la
--      web ya no pisa el que tiene el portal.
--
--   C. FOTOS REPETIDAS. Una ficha anunciaba 156 fotos y tenía 60. Se
--      quitan las filas de portal.fotos que repiten una foto del mismo
--      aviso, comparando la URL normalizada (misma regla que claveFoto()
--      en api/_portal/sync.js). Gana la primera aparición (menor orden) y
--      el orden de las que quedan no cambia. OJO: esto SÍ saca filas de
--      portal.fotos, porque una foto no tiene estado para "darla de baja".
--      No se pierde nada: cada fila que sale se guarda completa en
--      portal.respaldo_migracion_21 y el rollback la vuelve a poner con su
--      mismo id. Los archivos del storage no se tocan. Además la
--      sincronización borra y reescribe estas filas cada vez que cambian
--      las fotos de la web: son una copia, no el original.
--
--   D. codigo_interno ÚNICO POR PUBLICADOR. Reimportar la cartera creaba
--      avisos repetidos. Índice único parcial (publicador_id, codigo_interno)
--      donde no sea null, el mismo que ya declaraba schema-portal.sql.
--      Antes: los códigos vacíos pasan a null y se recortan los espacios
--      (portal/js/store.js ahora guarda así). SI HAY CÓDIGOS REPETIDOS
--      dentro de un mismo publicador, este paso SE FRENA, lo dice y no crea
--      nada: hay que decidir a mano cuál queda.
--
-- CÓMO SE CORRE
--   1. ENSAYO. Seleccioná desde "PASO 0" hasta el final del "PASO 1" y
--      Run. No modifica nada (la función del paso 0 es temporal, vive solo
--      en esa sesión). Muestra qué se va a tocar en cada punto. Corré las
--      consultas de a una si el editor muestra solo el último resultado.
--   2. Si el ensayo está bien, SUBIR el archivo entero y Run.
--      · A, B y C van en una transacción y D en otra. Cada una tiene sus
--        controles adentro: si un control falla, esa transacción se
--        deshace entera y el error dice por qué.
--      · El último resultado es el tablero de verificación del PASO 4.
--   3. Rollback: migracion-21-realty-mediano-y-limpieza-rollback.sql.
--      OJO: si el cambio de api/_portal/sync.js está desplegado, la
--      próxima sincronización vuelve a pausar los L. Para volver atrás de
--      verdad hay que revertir también ese commit.
--
-- Qué NO hace, a propósito:
--   · No toca public.propiedades (ni del OS ni de la web), ni precios.
--   · No toca los avisos de venta (V) de Bairen Realty, si queda alguno:
--     la decisión es "solo mediano", pero los V van al perfil de Maxim
--     (migración 13) y eso se decide aparte. El ensayo los cuenta.
--   · No renumera fotos.orden: quedan huecos (0, 3, 7...), que no
--     cambian nada porque todo ordena por esa columna.
--   · No despausa nada que otra migración haya pausado.
--
-- Orden: después de migracion-20-resumen-por-propietario.sql.
-- Generada el 25/9/2026. NO CORRIDA todavía.
-- =====================================================================


-- ── PASO 0 · Clave de una foto (temporal, solo esta sesión) ──────────
-- MISMA REGLA que claveFoto() en api/_portal/sync.js. Si se cambia una,
-- se cambia la otra.
--   · sin espacios alrededor ni fragmento (#...);
--   · en el storage de Supabase (/storage/v1/), sin query (?t=, ?width=);
--     fuera de Supabase la query se respeta (?id= distingue fotos);
--   · http igual a https; /render/image/public/ igual a /object/public/;
--   · esquema y host en minúsculas; sin barras dobles; espacio = %20.
create or replace function pg_temp.clave_url_foto(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  s text := btrim(coalesce(p_url, ''), E' \t\r\n');   -- como trim() de JS
  h text;
begin
  if s = '' then return null; end if;
  s := regexp_replace(s, '#.*$', '');
  if position('/storage/v1/' in s) > 0 then
    s := regexp_replace(s, '\?.*$', '');
  end if;
  s := regexp_replace(s, '^http://', 'https://', 'i');
  s := replace(s, '/storage/v1/render/image/public/', '/storage/v1/object/public/');
  h := substring(s from '^[A-Za-z]+://[^/?]+');
  if h is not null then
    s := lower(h) || substr(s, length(h) + 1);
  end if;
  s := regexp_replace(s, '([^:])/{2,}', '\1/', 'g');
  s := replace(s, ' ', '%20');
  return nullif(s, '');
end;
$$;


-- ── PASO 1 · ENSAYO (solo lectura) ──────────────────────────────────

-- 1.A · Los L publicados de Bairen Realty, que se pausan. Se esperan 5:
--       Santa Fe 4866, Figueroa Alcorta 3300, Juncal 600 y Núñez 3100
--       (les queda el M) y Acuña de Figueroa 1560 (queda sin publicar).
select a.codigo, a.direccion, a.unidad, a.precio, a.estado,
       exists (select 1 from portal.avisos m
                where m.publicador_id = a.publicador_id
                  and m.operacion = 'mediano'
                  and m.estado_curacion = 'publicado'
                  and m.slug = a.slug) as tiene_mediano_publicado,
       case when exists (select 1 from portal.avisos m
                          where m.publicador_id = a.publicador_id
                            and m.operacion = 'mediano'
                            and m.estado_curacion = 'publicado'
                            and m.slug = a.slug)
            then 'se pausa; la unidad sigue publicada como mediano plazo'
            else 'se pausa; la unidad QUEDA SIN PUBLICAR hasta tener precio de mediano plazo'
       end as efecto
  from portal.avisos a
  join portal.publicadores p on p.id = a.publicador_id
 where p.slug = 'bairen'
   and a.operacion = 'alquiler'
   and a.estado_curacion = 'publicado'
 order by a.direccion;

-- 1.A bis · Qué publica hoy Bairen Realty, por operación y estado.
--           Si aparece 'venta', ver "Qué NO hace" arriba.
select a.operacion, a.estado_curacion, count(*) as avisos
  from portal.avisos a
  join portal.publicadores p on p.id = a.publicador_id
 where p.slug = 'bairen'
 group by 1, 2
 order by 1, 2;

-- 1.B · Juncal 600: todos sus avisos. Se completa barrio (y zona, si está
--       vacía) solo en los que tienen el barrio vacío.
select a.codigo, a.operacion, a.estado_curacion, a.direccion, a.unidad,
       a.barrio, a.zona, a.ciudad,
       coalesce(btrim(a.barrio), '') = '' as se_completa
  from portal.avisos a
 where a.direccion ~* '^\s*juncal\s+600\M'
 order by a.codigo;

-- 1.C · Avisos con fotos repetidas: cuántas filas tienen, cuántas fotos
--       distintas hay de verdad y cuántas filas salen. La ficha de 156
--       fotos tiene que aparecer acá con unas 60 distintas. Si
--       urls_exactas_distintas ya es igual a fotos_distintas, eran copias
--       exactas; si es mayor, había variantes de la misma URL.
select a.codigo, a.estado_curacion,
       count(*)                                            as filas,
       count(distinct f.url)                               as urls_exactas_distintas,
       count(distinct pg_temp.clave_url_foto(f.url))       as fotos_distintas,
       count(pg_temp.clave_url_foto(f.url))
         - count(distinct pg_temp.clave_url_foto(f.url))   as filas_que_salen
  from portal.fotos f
  join portal.avisos a on a.id = f.aviso_id
 group by a.codigo, a.estado_curacion
having count(pg_temp.clave_url_foto(f.url)) > count(distinct pg_temp.clave_url_foto(f.url))
 order by filas_que_salen desc, a.codigo;

-- 1.D · codigo_interno: vacíos que pasan a null y códigos con espacios.
select count(*) filter (where codigo_interno is not null and btrim(codigo_interno) = '')           as vacios_pasan_a_null,
       count(*) filter (where btrim(codigo_interno) <> '' and codigo_interno <> btrim(codigo_interno)) as con_espacios_se_recortan,
       count(*) filter (where nullif(btrim(codigo_interno), '') is not null)                         as con_codigo
  from portal.avisos;

-- 1.D bis · CÓDIGOS REPETIDOS dentro de un publicador (ya recortados).
--           SI ESTA CONSULTA DEVUELVE FILAS, EL PASO D SE VA A FRENAR.
--           Hay que resolverlos antes: corregir el código del que sobra
--           (o dejarlo en null) y volver a correr el archivo.
select p.slug, p.nombre, btrim(a.codigo_interno) as codigo_interno, count(*) as avisos,
       string_agg(a.codigo || ' (' || a.estado_curacion || ', ' || to_char(a.created_at, 'DD/MM/YYYY') || ')', ', ' order by a.created_at) as cuales
  from portal.avisos a
  join portal.publicadores p on p.id = a.publicador_id
 where nullif(btrim(a.codigo_interno), '') is not null
 group by p.slug, p.nombre, btrim(a.codigo_interno)
having count(*) > 1
 order by p.slug, 3;

-- 1.D ter · Si el índice ya existe, cómo está definido.
select indexname, indexdef
  from pg_indexes
 where schemaname = 'portal' and tablename = 'avisos' and indexdef ilike '%codigo_interno%';

-- ── FIN DEL ENSAYO ──────────────────────────────────────────────────


-- ── PASO 2 · A, B y C ───────────────────────────────────────────────
begin;

-- El respaldo: cada valor que este archivo cambia, como estaba antes.
-- Es lo que usa el rollback. Una fila por cosa tocada; si el archivo se
-- corre dos veces, vale la primera fila de cada una (menor id).
create table if not exists portal.respaldo_migracion_21 (
  id         bigint generated always as identity primary key,
  paso       text not null,          -- 'A_pausa_largo_plazo' | 'B_barrio' | 'C_foto_repetida' | 'D_codigo_interno' | 'D_indice_creado'
  tabla      text not null,          -- 'avisos' | 'fotos' | 'indice'
  fila_id    uuid,                   -- id del aviso o de la foto (null para el índice)
  antes      jsonb not null,         -- la fila o los campos como estaban
  creado_en  timestamptz not null default now()
);
create index if not exists respaldo_migracion_21_idx on portal.respaldo_migracion_21 (paso, fila_id, id);

alter table portal.respaldo_migracion_21 enable row level security;
-- Sin políticas a propósito: solo el servidor y el SQL Editor lo leen.

comment on table portal.respaldo_migracion_21 is
  'Valores anteriores de todo lo que tocó migracion-21 (25/9/2026): L de Bairen Realty pausados, barrio de Juncal 600, filas de fotos repetidas (completas) y códigos internos normalizados. Lo usa migracion-21-realty-mediano-y-limpieza-rollback.sql, que la borra al terminar.';

-- ── A · Los L de Bairen Realty se pausan ────────────────────────────
-- El disparador trg_aviso_sincroniza_os mira estado_curacion, pero solo
-- actúa cuando el aviso queda 'publicado'. Al pausar no hace nada, así
-- que NO hace falta apagarlo (y no se apaga: menos riesgo de que quede
-- apagado).
do $$
declare
  v_pub uuid;
  v_n   integer;
begin
  select id into v_pub from portal.publicadores where slug = 'bairen';
  if v_pub is null then
    raise exception 'No existe el publicador de Bairen Realty (slug bairen)';
  end if;

  insert into portal.respaldo_migracion_21 (paso, tabla, fila_id, antes)
  select 'A_pausa_largo_plazo', 'avisos', a.id,
         jsonb_build_object('codigo', a.codigo, 'estado_curacion', a.estado_curacion, 'updated_at', a.updated_at)
    from portal.avisos a
   where a.publicador_id = v_pub
     and a.operacion = 'alquiler'
     and a.estado_curacion = 'publicado';

  update portal.avisos a
     set estado_curacion = 'pausado',
         updated_at      = now()
   where a.publicador_id = v_pub
     and a.operacion = 'alquiler'
     and a.estado_curacion = 'publicado';
  get diagnostics v_n = row_count;

  raise notice 'A · Avisos de largo plazo de Bairen Realty pausados: % (se esperaban 5).', v_n;
  if v_n <> 5 then
    raise notice 'A · No son 5: revisar la lista del ensayo 1.A. No es un error, la decisión vale para todos los L de Bairen Realty.';
  end if;

  -- Control: no queda ningún L de Bairen Realty publicado.
  select count(*) into v_n
    from portal.avisos a
   where a.publicador_id = v_pub and a.operacion = 'alquiler' and a.estado_curacion = 'publicado';
  if v_n > 0 then
    raise exception 'A · Control fallido: quedan % avisos L de Bairen Realty publicados.', v_n;
  end if;
end $$;

-- ── B · Juncal 600: barrio Retiro ───────────────────────────────────
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
    from portal.avisos a
   where a.direccion ~* '^\s*juncal\s+600\M'
     and coalesce(btrim(a.barrio), '') = '';
  if v_n > 3 then
    raise exception 'B · Hay % avisos de Juncal 600 sin barrio y se esperaban hasta 3 (L, M y a lo sumo V). Revisar el ensayo 1.B antes de seguir.', v_n;
  end if;

  insert into portal.respaldo_migracion_21 (paso, tabla, fila_id, antes)
  select 'B_barrio', 'avisos', a.id,
         jsonb_build_object('codigo', a.codigo, 'barrio', a.barrio, 'zona', a.zona, 'ciudad', a.ciudad)
    from portal.avisos a
   where a.direccion ~* '^\s*juncal\s+600\M'
     and coalesce(btrim(a.barrio), '') = '';

  update portal.avisos a
     set barrio     = 'Retiro',
         zona       = case when coalesce(btrim(a.zona), '') = '' then 'Retiro' else a.zona end,
         ciudad     = 'Capital Federal',
         updated_at = now()
   where a.direccion ~* '^\s*juncal\s+600\M'
     and coalesce(btrim(a.barrio), '') = '';
  get diagnostics v_n = row_count;
  raise notice 'B · Avisos de Juncal 600 con barrio completado: %.', v_n;

  -- Control: ningún aviso de Juncal 600 queda sin barrio ni sin zona.
  select count(*) into v_n
    from portal.avisos a
   where a.direccion ~* '^\s*juncal\s+600\M'
     and (coalesce(btrim(a.barrio), '') = '' or coalesce(btrim(a.zona), '') = '');
  if v_n > 0 then
    raise exception 'B · Control fallido: % avisos de Juncal 600 siguen sin barrio o sin zona.', v_n;
  end if;
end $$;

-- ── C · Fotos repetidas ─────────────────────────────────────────────
-- Por aviso y por clave de foto, gana la fila de menor orden (y, entre
-- dos con el mismo orden, la que se insertó primero). Las demás se
-- guardan completas en el respaldo, con el id de la que ganó, y salen.
-- trg_foto_portada_os (del OS) es AFTER INSERT: un borrado no lo dispara.
do $$
declare
  v_n     integer;
  v_resp  integer;
begin
  insert into portal.respaldo_migracion_21 (paso, tabla, fila_id, antes)
  select 'C_foto_repetida', 'fotos', r.id, r.fila || jsonb_build_object('gano', r.gano)
    from (
      select f.id, to_jsonb(f) as fila,
             row_number()  over w as n,
             first_value(f.id) over w as gano
        from portal.fotos f
       where pg_temp.clave_url_foto(f.url) is not null
      window w as (partition by f.aviso_id, pg_temp.clave_url_foto(f.url) order by f.orden, f.ctid)
    ) r
   where r.n > 1;
  get diagnostics v_resp = row_count;

  delete from portal.fotos f
   where f.id in (select x.fila_id from portal.respaldo_migracion_21 x where x.paso = 'C_foto_repetida');
  get diagnostics v_n = row_count;

  raise notice 'C · Filas de fotos repetidas quitadas: % (respaldadas en esta corrida: %).', v_n, v_resp;
  if v_n <> v_resp then
    raise exception 'C · Control fallido: se respaldaron % filas y se quitaron %. No se toca nada.', v_resp, v_n;
  end if;

  -- Control: ningún aviso queda con la misma foto dos veces.
  select count(*) into v_n
    from (select 1
            from portal.fotos f
           where pg_temp.clave_url_foto(f.url) is not null
           group by f.aviso_id, pg_temp.clave_url_foto(f.url)
          having count(*) > 1) d;
  if v_n > 0 then
    raise exception 'C · Control fallido: todavía hay % fotos repetidas.', v_n;
  end if;

  -- Control: ningún aviso que tenía fotos se quedó sin ninguna.
  select count(*) into v_n
    from (select distinct (x.antes->>'aviso_id')::uuid as aviso_id
            from portal.respaldo_migracion_21 x
           where x.paso = 'C_foto_repetida') s
   where not exists (select 1 from portal.fotos f where f.aviso_id = s.aviso_id);
  if v_n > 0 then
    raise exception 'C · Control fallido: % avisos quedaron sin fotos.', v_n;
  end if;
end $$;

commit;


-- ── PASO 3 · D · codigo_interno único por publicador ────────────────
-- Transacción aparte: si hay repetidos se frena SOLO esto, y A, B y C
-- (ya confirmados arriba) quedan hechos. Si el editor corriera todo el
-- archivo como una única transacción, un freno acá deshace todo: también
-- está bien, no queda nada a medias. En los dos casos, volver a correr el
-- archivo entero después de resolver los repetidos es seguro.
begin;

do $$
declare
  v_n      integer;
  v_dup    text;
  v_def    text;
  v_unico  boolean;
begin
  -- 1 · Vacíos a null y sin espacios, con respaldo.
  insert into portal.respaldo_migracion_21 (paso, tabla, fila_id, antes)
  select 'D_codigo_interno', 'avisos', a.id,
         jsonb_build_object('codigo', a.codigo, 'codigo_interno', a.codigo_interno)
    from portal.avisos a
   where a.codigo_interno is distinct from nullif(btrim(a.codigo_interno), '');

  update portal.avisos a
     set codigo_interno = nullif(btrim(a.codigo_interno), ''),
         updated_at     = now()
   where a.codigo_interno is distinct from nullif(btrim(a.codigo_interno), '');
  get diagnostics v_n = row_count;
  raise notice 'D · Códigos internos normalizados (vacío a null, sin espacios): %.', v_n;

  -- 2 · Repetidos: si hay, se frena y lo dice.
  select string_agg(format('%s · "%s" en %s avisos (%s)', d.slug, d.codigo_interno, d.n, d.cuales), E'\n  ')
    into v_dup
    from (select p.slug, a.codigo_interno, count(*) as n,
                 string_agg(a.codigo, ', ' order by a.created_at) as cuales
            from portal.avisos a
            join portal.publicadores p on p.id = a.publicador_id
           where a.codigo_interno is not null
           group by p.slug, a.codigo_interno
          having count(*) > 1) d;

  if v_dup is not null then
    raise exception using
      message = E'D · SE FRENA: hay códigos internos repetidos dentro de un mismo publicador, y el índice único no se puede crear sin decidir cuál queda:\n  ' || v_dup,
      hint    = 'Corregir el código del aviso que sobra (o dejarlo en null) y volver a correr el archivo. Este paso no dejó nada hecho: la normalización también se deshizo.';
  end if;

  -- 3 · El índice. Si ya existe con esa misma forma, se deja; si existe
  --     con otra forma, se frena en vez de pisarlo.
  select x.indexdef, i.indisunique
    into v_def, v_unico
    from pg_indexes x
    join pg_class c  on c.relname = x.indexname and c.relnamespace = 'portal'::regnamespace
    join pg_index i  on i.indexrelid = c.oid
   where x.schemaname = 'portal' and x.indexname = 'avisos_codigo_interno_idx';

  if v_def is null then
    create unique index avisos_codigo_interno_idx
      on portal.avisos (publicador_id, codigo_interno)
      where codigo_interno is not null;
    insert into portal.respaldo_migracion_21 (paso, tabla, fila_id, antes)
    values ('D_indice_creado', 'indice', null, jsonb_build_object('indice', 'portal.avisos_codigo_interno_idx'));
    raise notice 'D · Índice único avisos_codigo_interno_idx creado.';
  elsif v_unico
        and v_def ilike '%(publicador_id, codigo_interno)%'
        and v_def ilike '%WHERE (codigo_interno IS NOT NULL)%' then
    raise notice 'D · El índice avisos_codigo_interno_idx ya existía con la misma forma: no se toca.';
  else
    raise exception 'D · Existe un índice avisos_codigo_interno_idx con otra forma y no se pisa: %', v_def;
  end if;

  -- Control: el índice está, es único y es válido.
  select count(*) into v_n
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
   where c.relname = 'avisos_codigo_interno_idx'
     and c.relnamespace = 'portal'::regnamespace
     and i.indisunique and i.indisvalid;
  if v_n <> 1 then
    raise exception 'D · Control fallido: el índice único no quedó creado.';
  end if;
end $$;

commit;


-- ── PASO 4 · VERIFICACIÓN (solo lectura) ────────────────────────────
-- Tablero final: cada fila dice qué se esperaba y si está bien (ok vacío
-- = fila informativa, sin valor esperado).
select control, valor, esperado, case when esperado is null then null else valor = esperado end as ok
  from (
    select 1 as orden, 'A · avisos L de Bairen Realty publicados' as control,
           (select count(*) from portal.avisos a join portal.publicadores p on p.id = a.publicador_id
             where p.slug = 'bairen' and a.operacion = 'alquiler' and a.estado_curacion = 'publicado')::text as valor,
           '0' as esperado
    union all
    select 2, 'A · avisos M de Bairen Realty publicados (informativo)',
           (select count(*) from portal.avisos a join portal.publicadores p on p.id = a.publicador_id
             where p.slug = 'bairen' and a.operacion = 'mediano' and a.estado_curacion = 'publicado')::text,
           null
    union all
    select 3, 'B · avisos de Juncal 600 sin barrio',
           (select count(*) from portal.avisos a
             where a.direccion ~* '^\s*juncal\s+600\M' and coalesce(btrim(a.barrio), '') = '')::text,
           '0'
    union all
    select 4, 'C · fotos repetidas dentro de un aviso',
           (select count(*) from (select 1 from portal.fotos f
                                   where pg_temp.clave_url_foto(f.url) is not null
                                   group by f.aviso_id, pg_temp.clave_url_foto(f.url)
                                  having count(*) > 1) d)::text,
           '0'
    union all
    select 5, 'D · índice único avisos_codigo_interno_idx',
           case when exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                              where c.relname = 'avisos_codigo_interno_idx'
                                and c.relnamespace = 'portal'::regnamespace and i.indisunique and i.indisvalid)
                then 'está' else 'falta' end,
           'está'
    union all
    select 6, 'Disparador trg_aviso_sincroniza_os (O = prendido)',
           coalesce((select t.tgenabled::text from pg_trigger t
                      where t.tgrelid = 'portal.avisos'::regclass and t.tgname = 'trg_aviso_sincroniza_os'), 'no existe'),
           'O'
  ) v
 order by orden;
