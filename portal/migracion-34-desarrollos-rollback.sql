-- =====================================================================
-- BAIREN · Portal · Vuelta atrás de la migración 34 (desarrollos y Membresía Inversor)
--
-- BORRA las listas de espera, las membresías y el plan. La vista portal.novedades vuelve a la de la 27 (sin acceso
-- anticipado) y portal.publicaciones pierde visible_desde_publico. Los pasos "lead_inversor" ya registrados quedan:
-- son parte del recorrido de cada operación (tipo de la 28) y sus cargos son simulados.
-- =====================================================================
begin;

drop trigger if exists trg_lead_inversor on portal.hitos;
drop function if exists portal.trg_lead_inversor();
drop index if exists portal.m34_hitos_lead_unico;

drop view if exists portal.novedades;
create view portal.novedades as
  select 'nuevo'::text as tipo, a.id as aviso_id, null::uuid as publicacion_id, a.publicado_en as fecha,
    null::numeric as anterior, a.precio, a.moneda, null::text as titulo, null::text as texto, null::date as entrega, a.publicador_id
  from portal.avisos a
  where a.estado_curacion = 'publicado' and a.publicado_en > now() - interval '45 days'
  union all
  select 'baja_precio', ph.aviso_id, null, ph.registrado_en, ph.anterior, ph.precio, ph.moneda, null, null, null, a.publicador_id
  from portal.precios_historial ph
  join portal.avisos a on a.id = ph.aviso_id and a.estado_curacion = 'publicado'
  where ph.anterior is not null and ph.precio < ph.anterior and ph.registrado_en > now() - interval '45 days'
  union all
  select p.tipo, p.aviso_id, p.id, p.publicado_en, null, null, null, p.titulo, p.texto, p.entrega, p.publicador_id
  from portal.publicaciones p
  where p.estado = 'publicada';
grant select on portal.novedades to anon, authenticated;

drop trigger if exists trg_publicacion_visible on portal.publicaciones;
drop function if exists portal.trg_publicacion_visible();
alter table portal.publicaciones drop column if exists visible_desde_publico;

drop function if exists portal.marcar_avisados(text, uuid);
drop function if exists portal.lista_espera_personas(text, uuid);
drop function if exists portal.lista_espera_resumen();
drop function if exists portal.salir_lista(text, uuid);
drop function if exists portal.sumarme_lista(text, uuid);
drop function if exists portal.membresias_inversor_lista();
drop function if exists portal.pausar_membresia(uuid);
drop function if exists portal.activar_membresia(uuid, timestamptz, text, text);
drop function if exists portal.solicitar_membresia();
drop function if exists portal.mi_membresia_inversor();
drop function if exists portal._es_plataforma_soporte();
drop function if exists portal.es_miembro_inversor();
drop function if exists portal._miembro_inversor(uuid);

drop table if exists portal.membresias_inversor;
drop table if exists portal.planes_membresia;
drop table if exists portal.lista_espera;

notify pgrst, 'reload schema';
commit;
