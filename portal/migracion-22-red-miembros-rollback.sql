-- =====================================================================
-- BAIREN · Portal · Rollback de la migración 22 (la red)
--
-- Saca las funciones y la vista de la 22, y las TRES TABLAS NO SE BORRAN:
-- se renombran a *_respaldo_22 (seguimientos, propuestas, obra_eventos),
-- sin permisos para nadie más que el dueño. Si ya había datos, quedan ahí
-- y se pueden devolver con un rename. Repetible.
-- =====================================================================

-- ── ENSAYO (solo lectura): qué hay para guardar ─────────────────────
select 'seguimientos' as tabla, case when to_regclass('portal.seguimientos') is null then null else (select count(*) from portal.seguimientos) end as filas
union all select 'propuestas', case when to_regclass('portal.propuestas') is null then null else (select count(*) from portal.propuestas) end
union all select 'obra_eventos', case when to_regclass('portal.obra_eventos') is null then null else (select count(*) from portal.obra_eventos) end;

begin;

drop function if exists portal.mis_propuestas_enviadas(uuid);
drop function if exists portal.enviar_propuesta(uuid, text, text, int, numeric, numeric, text);
drop function if exists portal.demanda_agregada(text);
drop view if exists portal.busquedas_red;
drop function if exists portal.banda_presupuesto(text, numeric);
drop function if exists portal.soy_publicador();
drop function if exists portal.puede_publicar_por(uuid);

do $$
declare t text;
begin
  foreach t in array array['seguimientos', 'propuestas', 'obra_eventos'] loop
    if to_regclass('portal.' || t) is not null then
      if to_regclass('portal.' || t || '_respaldo_22') is not null then
        raise exception 'Ya existe portal.%_respaldo_22: revisarla a mano antes de volver a correr el rollback.', t;
      end if;
      execute format('alter table portal.%I rename to %I', t, t || '_respaldo_22');
      execute format('revoke all on portal.%I from anon, authenticated', t || '_respaldo_22');
      raise notice 'portal.% guardada como portal.%_respaldo_22.', t, t;
    end if;
  end loop;
end $$;
drop function if exists portal.propuesta_respondida() cascade;

commit;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
select 'funciones de la 22' as control,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'portal' and p.proname in ('demanda_agregada', 'enviar_propuesta', 'mis_propuestas_enviadas', 'banda_presupuesto', 'soy_publicador', 'puede_publicar_por'))::text as valor, '0' as esperado
union all select 'tablas activas de la 22',
       ((to_regclass('portal.seguimientos') is not null)::int + (to_regclass('portal.propuestas') is not null)::int + (to_regclass('portal.obra_eventos') is not null)::int)::text, '0';
