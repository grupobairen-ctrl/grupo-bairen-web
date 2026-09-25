-- =====================================================================
-- BAIREN · Portal · Verificaciones pendientes del 25/9/2026
--
-- SOLO LECTURA: no modifica nada, se puede correr cuantas veces haga
-- falta, antes o después de la migración 21.
--
-- Qué mira:
--   1. Que el disparador trg_aviso_sincroniza_os sobre portal.avisos esté
--      prendido (tgenabled = 'O'). Varias migraciones (08b, 08c, 11, 12,
--      13, 14, 16) lo apagan y lo vuelven a prender, y lo hacen tragándose
--      cualquier error ("exception when others then null"): si el prendido
--      falló alguna vez, nadie se enteró. Apagado, un aviso publicado desde
--      el portal no se ata a su propiedad del OS.
--      Valores posibles: O = prendido; D = apagado; R / A = solo en modo
--      réplica / siempre (no deberían aparecer).
--   2. Dueños directos con verificado = false pese a tener constancia de
--      titularidad (una fila de portal.verificaciones tipo 'titularidad'
--      con resultado 'aprobada'). La ficha pinta el sello del dueño solo
--      con verificado = true (portal/js/data.js, 22/9/2026), así que a
--      esos dueños se les está negando un sello que ya se ganaron. Aparte,
--      informativo: los que tienen la titularidad pendiente de revisión.
--   3. Cuántos avisos de largo plazo (L, operación 'alquiler') quedan de
--      Bairen Realty. Después de la migración 21 tienen que ser 0
--      publicados; los pausados siguen existiendo (pausar, no borrar).
--
-- CÓMO SE LEE: el último resultado es el tablero, una fila por control,
-- con el valor, lo esperado y si está bien. Arriba, el detalle de cada
-- uno, para correr de a una consulta si hace falta ver los nombres.
-- =====================================================================

-- ── Detalle 1 · El disparador ───────────────────────────────────────
select t.tgname, t.tgenabled, t.tgenabled = 'O' as prendido,
       pg_get_triggerdef(t.oid) as definicion
  from pg_trigger t
 where t.tgrelid = 'portal.avisos'::regclass
   and t.tgname = 'trg_aviso_sincroniza_os';

-- ── Detalle 2 · Dueños sin verificar con titularidad aprobada ───────
select p.slug, p.nombre, p.verificado, p.verificado_en,
       max(v.created_at) filter (where v.resultado = 'aprobada')  as titularidad_aprobada_el,
       string_agg(distinct v.revisado_por, ', ')                   as revisado_por,
       exists (select 1 from portal.avisos a
                where a.publicador_id = p.id and a.estado_curacion = 'publicado') as tiene_avisos_publicados
  from portal.publicadores p
  join portal.verificaciones v on v.publicador_id = p.id and v.tipo = 'titularidad'
 where p.tipo = 'dueno'
   and not p.verificado
 group by p.id, p.slug, p.nombre, p.verificado, p.verificado_en
having bool_or(v.resultado = 'aprobada')
 order by p.nombre;

-- ── Detalle 3 · Avisos L de Bairen Realty, por estado ───────────────
select a.estado_curacion, count(*) as avisos,
       string_agg(a.codigo, ', ' order by a.codigo) as codigos
  from portal.avisos a
  join portal.publicadores p on p.id = a.publicador_id
 where p.slug = 'bairen'
   and a.operacion = 'alquiler'
 group by a.estado_curacion
 order by a.estado_curacion;

-- ── TABLERO ─────────────────────────────────────────────────────────
-- ok vacío = fila informativa, sin valor esperado.
select control, valor, esperado,
       case when esperado is null then null else valor = esperado end as ok
  from (
    select 1 as orden,
           '1 · trg_aviso_sincroniza_os sobre portal.avisos (O = prendido)' as control,
           coalesce((select t.tgenabled::text from pg_trigger t
                      where t.tgrelid = 'portal.avisos'::regclass
                        and t.tgname = 'trg_aviso_sincroniza_os'), 'no existe') as valor,
           'O' as esperado
    union all
    select 2,
           '2 · dueños con verificado = false y titularidad aprobada',
           (select count(*) from portal.publicadores p
             where p.tipo = 'dueno' and not p.verificado
               and exists (select 1 from portal.verificaciones v
                            where v.publicador_id = p.id and v.tipo = 'titularidad'
                              and v.resultado = 'aprobada'))::text,
           '0'
    union all
    select 3,
           '2 · dueños sin verificar con titularidad pendiente de revisión (informativo)',
           (select count(*) from portal.publicadores p
             where p.tipo = 'dueno' and not p.verificado
               and exists (select 1 from portal.verificaciones v
                            where v.publicador_id = p.id and v.tipo = 'titularidad'
                              and v.resultado = 'pendiente'))::text,
           null
    union all
    select 4,
           '3 · avisos L de Bairen Realty publicados',
           (select count(*) from portal.avisos a join portal.publicadores p on p.id = a.publicador_id
             where p.slug = 'bairen' and a.operacion = 'alquiler' and a.estado_curacion = 'publicado')::text,
           '0'
    union all
    select 5,
           '3 · avisos L de Bairen Realty en total, cualquier estado (informativo)',
           (select count(*) from portal.avisos a join portal.publicadores p on p.id = a.publicador_id
             where p.slug = 'bairen' and a.operacion = 'alquiler')::text,
           null
  ) v
 order by orden;
