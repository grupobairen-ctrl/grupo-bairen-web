-- =====================================================================
-- BAIREN · Portal · Rollback de la migración 21
--
-- Deja todo como estaba antes de migracion-21-realty-mediano-y-limpieza.sql,
-- con los valores guardados en portal.respaldo_migracion_21:
--   D · saca el índice avisos_codigo_interno_idx SOLO si lo creó la 21
--       (si ya existía antes, queda) y devuelve cada codigo_interno a su
--       valor original, con espacios o vacío incluidos.
--   C · vuelve a poner las filas de fotos repetidas, con su mismo id,
--       orden y pie.
--   B · devuelve el barrio, la zona y la ciudad de Juncal 600.
--   A · vuelve a publicar los L de Bairen Realty que la 21 pausó.
--
-- Cuidados, todos contemplados abajo:
--   · Solo revierte lo que nadie tocó después. Un L que alguien volvió a
--     publicar o pasó a otro estado, un barrio que ya no es 'Retiro', un
--     código que se cambió a mano: quedan como están y se avisa.
--   · Las fotos de un aviso se reponen solo si la foto que "ganó" sigue
--     ahí. Si no está, la sincronización ya reescribió las fotos de ese
--     aviso desde la web, y reponer las viejas mezclaría dos listas.
--   · Al volver a 'publicado', trg_aviso_sincroniza_os (del OS) podría
--     crear una propiedad en el OS para un aviso sin propiedad_id. No es
--     lo que había antes, así que se apaga mientras se restaura y se
--     vuelve a prender al final. Lo mismo trg_foto_portada_os al reponer
--     fotos (pondría la foto de portada en el OS). Todo en una sola
--     transacción: si algo falla, se deshace también el apagado.
--   · updated_at de los avisos restaurados queda con la hora del
--     rollback (lo pone el disparador trg_av_upd); el resto, como estaba.
--   · Si todo se restauró, borra portal.respaldo_migracion_21 al final.
--     Si algo no se pudo restaurar, la tabla queda para revisarlo a mano.
--
-- IMPORTANTE: si el cambio de api/_portal/sync.js del 25/9/2026 sigue
-- desplegado, la próxima sincronización vuelve a pausar los L de Bairen
-- Realty. Para volver atrás de verdad, revertir también ese commit.
--
-- Repetible: si no hay respaldo, avisa y no toca nada.
-- SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── ENSAYO (solo lectura) ───────────────────────────────────────────
-- Qué hay para revertir, por paso. Si la tabla no existe, esta consulta
-- da error "relation does not exist": no hay nada que revertir.
select paso, count(distinct coalesce(fila_id::text, id::text)) as filas
  from portal.respaldo_migracion_21
 group by paso
 order by paso;


-- ── ROLLBACK ────────────────────────────────────────────────────────
begin;

do $$
declare
  v_n            integer;
  v_pendientes   integer := 0;
  v_trg_aviso    boolean;
  v_trg_foto     boolean;
begin
  if to_regclass('portal.respaldo_migracion_21') is null then
    raise notice 'No hay respaldo de la migración 21: no se corrió, o ya se revirtió. No se toca nada.';
    return;
  end if;

  -- Los disparadores del OS que se prenden en lo que sigue. Solo se
  -- apagan si están prendidos, y al final se prenden solo esos.
  select exists (select 1 from pg_trigger
                  where tgrelid = 'portal.avisos'::regclass and tgname = 'trg_aviso_sincroniza_os' and tgenabled <> 'D')
    into v_trg_aviso;
  select exists (select 1 from pg_trigger
                  where tgrelid = 'portal.fotos'::regclass and tgname = 'trg_foto_portada_os' and tgenabled <> 'D')
    into v_trg_foto;
  if v_trg_aviso then execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os'; end if;
  if v_trg_foto  then execute 'alter table portal.fotos disable trigger trg_foto_portada_os'; end if;

  -- ── D · El índice (primero: si lo creó la 21, los vacíos originales
  --       chocarían con él) y los códigos internos.
  if exists (select 1 from portal.respaldo_migracion_21 where paso = 'D_indice_creado') then
    drop index if exists portal.avisos_codigo_interno_idx;
    raise notice 'D · Índice avisos_codigo_interno_idx eliminado (lo había creado la 21).';
  end if;

  update portal.avisos a
     set codigo_interno = r.antes->>'codigo_interno'
    from (select distinct on (fila_id) fila_id, antes
            from portal.respaldo_migracion_21
           where paso = 'D_codigo_interno'
           order by fila_id, id) r
   where a.id = r.fila_id
     and a.codigo_interno is not distinct from nullif(btrim(r.antes->>'codigo_interno'), '');
  get diagnostics v_n = row_count;
  raise notice 'D · Códigos internos devueltos a su valor original: %.', v_n;

  select count(*) into v_n
    from (select distinct fila_id from portal.respaldo_migracion_21 where paso = 'D_codigo_interno') r
    join portal.avisos a on a.id = r.fila_id
   where a.codigo_interno is distinct from (select x.antes->>'codigo_interno' from portal.respaldo_migracion_21 x
                                             where x.paso = 'D_codigo_interno' and x.fila_id = r.fila_id order by x.id limit 1);
  if v_n > 0 then
    v_pendientes := v_pendientes + v_n;
    raise notice 'D · % códigos internos se cambiaron después de la 21 y quedan como están.', v_n;
  end if;

  -- ── C · Las fotos repetidas vuelven, con su mismo id.
  insert into portal.fotos
  select (jsonb_populate_record(null::portal.fotos, r.antes - 'gano')).*
    from (select distinct on (fila_id) fila_id, antes
            from portal.respaldo_migracion_21
           where paso = 'C_foto_repetida'
           order by fila_id, id) r
   where exists (select 1 from portal.avisos a where a.id = (r.antes->>'aviso_id')::uuid)
     and exists (select 1 from portal.fotos g where g.id = (r.antes->>'gano')::uuid)
  on conflict (id) do nothing;
  get diagnostics v_n = row_count;
  raise notice 'C · Filas de fotos repuestas: %.', v_n;

  select count(*) into v_n
    from (select distinct fila_id from portal.respaldo_migracion_21 where paso = 'C_foto_repetida') r
   where not exists (select 1 from portal.fotos f where f.id = r.fila_id);
  if v_n > 0 then
    v_pendientes := v_pendientes + v_n;
    raise notice 'C · % filas de fotos no se repusieron: la sincronización ya reescribió las fotos de ese aviso (o el aviso no existe).', v_n;
  end if;

  -- ── B · Juncal 600: barrio, zona y ciudad como estaban.
  update portal.avisos a
     set barrio = r.antes->>'barrio',
         zona   = r.antes->>'zona',
         ciudad = r.antes->>'ciudad'
    from (select distinct on (fila_id) fila_id, antes
            from portal.respaldo_migracion_21
           where paso = 'B_barrio'
           order by fila_id, id) r
   where a.id = r.fila_id
     and a.barrio = 'Retiro';
  get diagnostics v_n = row_count;
  raise notice 'B · Avisos de Juncal 600 devueltos a su barrio original: %.', v_n;

  select count(*) into v_n
    from (select distinct fila_id from portal.respaldo_migracion_21 where paso = 'B_barrio') r
    join portal.avisos a on a.id = r.fila_id
   where a.barrio is distinct from (select x.antes->>'barrio' from portal.respaldo_migracion_21 x
                                     where x.paso = 'B_barrio' and x.fila_id = r.fila_id order by x.id limit 1);
  if v_n > 0 then
    v_pendientes := v_pendientes + v_n;
    raise notice 'B · % avisos de Juncal 600 tienen hoy otro barrio que no es Retiro y quedan como están.', v_n;
  end if;

  -- ── A · Los L de Bairen Realty vuelven al estado que tenían.
  update portal.avisos a
     set estado_curacion = r.antes->>'estado_curacion',
         updated_at      = now()
    from (select distinct on (fila_id) fila_id, antes
            from portal.respaldo_migracion_21
           where paso = 'A_pausa_largo_plazo'
           order by fila_id, id) r
   where a.id = r.fila_id
     and a.estado_curacion = 'pausado';
  get diagnostics v_n = row_count;
  raise notice 'A · Avisos de largo plazo de Bairen Realty devueltos a publicado: %.', v_n;

  select count(*) into v_n
    from (select distinct fila_id from portal.respaldo_migracion_21 where paso = 'A_pausa_largo_plazo') r
    join portal.avisos a on a.id = r.fila_id
   where a.estado_curacion is distinct from (select x.antes->>'estado_curacion' from portal.respaldo_migracion_21 x
                                              where x.paso = 'A_pausa_largo_plazo' and x.fila_id = r.fila_id order by x.id limit 1);
  if v_n > 0 then
    v_pendientes := v_pendientes + v_n;
    raise notice 'A · % avisos L cambiaron de estado después de la 21 y quedan como están.', v_n;
  end if;

  -- Los disparadores, prendidos otra vez (solo los que estaban prendidos).
  if v_trg_aviso then execute 'alter table portal.avisos enable trigger trg_aviso_sincroniza_os'; end if;
  if v_trg_foto  then execute 'alter table portal.fotos enable trigger trg_foto_portada_os'; end if;

  -- Control: los que estaban prendidos, lo están ('O').
  if v_trg_aviso and not exists (select 1 from pg_trigger where tgrelid = 'portal.avisos'::regclass
                                   and tgname = 'trg_aviso_sincroniza_os' and tgenabled = 'O') then
    raise exception 'Control fallido: trg_aviso_sincroniza_os no quedó prendido. Se deshace todo.';
  end if;
  if v_trg_foto and not exists (select 1 from pg_trigger where tgrelid = 'portal.fotos'::regclass
                                  and tgname = 'trg_foto_portada_os' and tgenabled = 'O') then
    raise exception 'Control fallido: trg_foto_portada_os no quedó prendido. Se deshace todo.';
  end if;

  -- El respaldo se borra solo si no quedó nada sin restaurar.
  if v_pendientes = 0 then
    drop table portal.respaldo_migracion_21;
    raise notice 'Rollback completo. portal.respaldo_migracion_21 eliminada.';
  else
    raise notice 'Rollback hecho con % cosas que no se tocaron porque cambiaron después de la 21 (ver avisos de arriba). portal.respaldo_migracion_21 QUEDA para revisarlas a mano.', v_pendientes;
  end if;
end $$;

commit;


-- ── VERIFICACIÓN (solo lectura, correr después) ─────────────────────
-- Los L de Bairen Realty publicados de nuevo, el barrio de Juncal 600,
-- el índice y los dos disparadores del OS.
select 'L de Bairen Realty publicados' as control,
       (select count(*) from portal.avisos a join portal.publicadores p on p.id = a.publicador_id
         where p.slug = 'bairen' and a.operacion = 'alquiler' and a.estado_curacion = 'publicado')::text as valor
union all
select 'Juncal 600: barrio(s)',
       coalesce((select string_agg(distinct coalesce(nullif(a.barrio, ''), '(vacío)'), ', ') from portal.avisos a
                  where a.direccion ~* '^\s*juncal\s+600\M'), '(sin avisos)')
union all
select 'Índice avisos_codigo_interno_idx',
       case when to_regclass('portal.avisos_codigo_interno_idx') is null then 'no está' else 'está' end
union all
select 'trg_aviso_sincroniza_os (O = prendido)',
       coalesce((select tgenabled::text from pg_trigger where tgrelid = 'portal.avisos'::regclass and tgname = 'trg_aviso_sincroniza_os'), 'no existe')
union all
select 'trg_foto_portada_os (O = prendido)',
       coalesce((select tgenabled::text from pg_trigger where tgrelid = 'portal.fotos'::regclass and tgname = 'trg_foto_portada_os'), 'no existe')
union all
select 'Respaldo de la 21',
       case when to_regclass('portal.respaldo_migracion_21') is null then 'eliminado (rollback completo)' else 'queda (ver avisos del rollback)' end;
