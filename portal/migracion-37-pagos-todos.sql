-- =====================================================================
-- BAIREN · Portal · Migración 37 · Los pagos de todos, para el equipo
--
-- 9/10/2026. Tomás: "¿dónde se ven los pagos que hace cada usuario?". Cada persona ve los suyos en pagos.html (Mis pagos
-- y Cobranza). El equipo de BAIREN (curación y plataforma) suma la vista "Todos": las señas y cuotas de todas las
-- operaciones, con quién paga y a quién. Solo lectura: confirmar, marcar o anular sigue siendo de quien publica.
-- Las tablas ya dejan leer al equipo (portal.es_parte incluye a la plataforma); esta función junta todo en una llamada,
-- con el mismo formato que portal.cobranza() más el nombre de quien publica.
-- Solo agrega una función. Vuelta atrás: migracion-37-pagos-todos-rollback.sql.
-- =====================================================================

create or replace function portal.pagos_de_todos() returns jsonb
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
begin
  if auth.uid() is null then raise exception 'Ingresá para seguir.'; end if;
  if not (portal.es_curador() or portal.es_plataforma()) then raise exception 'Solo el equipo de BAIREN ve los pagos de todos.'; end if;
  return jsonb_build_object(
    'operaciones', coalesce((select jsonb_agg(jsonb_build_object(
        'operacion_id', o.id, 'publicador_id', o.publicador_id, 'publicador', pb.nombre, 'etapa', o.etapa, 'linea', o.linea,
        'aviso_titulo', a.titulo, 'aviso_direccion', concat_ws(' · ', nullif(concat_ws(' ', a.direccion, a.unidad), ''), a.barrio),
        'interesado', portal.nombre_interesado(o.interesado_user),
        'reservas', coalesce((select jsonb_agg(portal._reserva_json(r) order by r.pedida_en desc) from portal.reservas r where r.operacion_id = o.id), '[]'::jsonb),
        'pagos', coalesce((select jsonb_agg(portal._pago_json(p) order by p.vencimiento, p.concepto) from portal.pagos p where p.operacion_id = o.id), '[]'::jsonb))
        order by o.actualizada_en desc)
      from portal.operaciones o
      left join portal.avisos a on a.id = o.aviso_id
      left join portal.publicadores pb on pb.id = o.publicador_id
      where exists (select 1 from portal.reservas r where r.operacion_id = o.id) or exists (select 1 from portal.pagos p where p.operacion_id = o.id)), '[]'::jsonb)
  );
end $$;

revoke all on function portal.pagos_de_todos() from public, anon;
grant execute on function portal.pagos_de_todos() to authenticated;

notify pgrst, 'reload schema';

select 'pagos_de_todos' as control, exists (select 1 from pg_proc where proname = 'pagos_de_todos' and pronamespace = 'portal'::regnamespace) as ok;
