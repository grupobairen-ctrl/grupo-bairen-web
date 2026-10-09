-- =====================================================================
-- BAIREN · Portal · Vuelta atrás de la migración 27 (operación digital)
--
-- BORRA lo que la 27 creó: operaciones en curso (las que no tienen cierre), hitos, chat, búsquedas y propuestas de
-- Se busca, publicaciones de Explorar, documentos, reglas y cargos. Las operaciones con cierre completo quedan.
-- La política de visitas del propietario vuelve a la versión anterior (la que fallaba con sesión; ver la 27).
-- Correr solo si hace falta deshacer la 27 entera.
-- =====================================================================
begin;

drop policy if exists "operaciones del interesado" on portal.operaciones;
drop policy if exists "operaciones del publicador" on portal.operaciones;

drop policy if exists "visitas las ve el propietario" on portal.visitas_reservas;
create policy "visitas las ve el propietario" on portal.visitas_reservas for select
  using (exists (select 1 from portal.avisos a where a.id = visitas_reservas.aviso_id and a.propietario_email is not null
    and lower(a.propietario_email) = lower(coalesce(auth.jwt() ->> 'email', ''))));
drop function if exists portal.es_propietario_de(uuid);

drop view if exists portal.novedades;
drop view if exists portal.busquedas_publicas;

alter table portal.visitas_reservas drop column if exists operacion_id;
alter table portal.operaciones drop constraint if exists m27_op_busqueda;
drop table if exists portal.cargos;
drop table if exists portal.reglas_cobro;
drop table if exists portal.documentos;
drop table if exists portal.publicaciones;
drop table if exists portal.propuestas;
drop table if exists portal.busquedas;
drop table if exists portal.mensajes;
drop table if exists portal.hitos;

delete from portal.operaciones where precio_cierre is null or fecha_cierre is null;
drop index if exists portal.operaciones_abierta_uniq;
drop index if exists portal.operaciones_interesado_idx;
drop index if exists portal.operaciones_pub_act_idx;
alter table portal.operaciones drop constraint if exists m27_op_linea;
alter table portal.operaciones drop constraint if exists m27_op_etapa;
alter table portal.operaciones drop constraint if exists m27_op_origen;
alter table portal.operaciones
  drop column if exists linea, drop column if exists etapa, drop column if exists interesado_user,
  drop column if exists consulta_id, drop column if exists busqueda_id, drop column if exists origen,
  drop column if exists abierta_en, drop column if exists actualizada_en, drop column if exists cerrada_en,
  drop column if exists motivo_caida, drop column if exists monto_contrato;
alter table portal.operaciones alter column precio_cierre set not null;
alter table portal.operaciones alter column fecha_cierre set not null;

drop function if exists portal.registrar_hito(uuid, text, jsonb);
drop function if exists portal.abrir_operacion(uuid, text, uuid);
drop function if exists portal.mis_operaciones(boolean);
drop function if exists portal.operacion_detalle(uuid);
drop function if exists portal.marcar_leidos(uuid);
drop function if exists portal.responder_propuesta(uuid, text);
drop function if exists portal.propuestas_recibidas();
drop function if exists portal.mis_propuestas();
drop function if exists portal.recalcular_cargos(text);
drop function if exists portal.resumen_cobros();
drop function if exists portal._aplicar_reglas(bigint, text);
drop function if exists portal._hito(uuid, text, text, jsonb);
drop function if exists portal.trg_hito_cobros();
drop function if exists portal.trg_mensaje();
drop function if exists portal.trg_busqueda();
drop function if exists portal.trg_propuesta();
drop function if exists portal.trg_publicacion();
drop function if exists portal.trg_regla();
drop function if exists portal.contacto_interesado(uuid);
drop function if exists portal.nombre_interesado(uuid);
drop function if exists portal.soy_publicador(uuid);
drop function if exists portal.es_mi_busqueda(uuid);
drop function if exists portal.es_parte(uuid);
drop function if exists portal.lados_en(uuid);
drop function if exists portal.etapa_de_hito(text);
drop function if exists portal.orden_etapa(text);
drop function if exists portal.linea_de(text, text, integer);

notify pgrst, 'reload schema';
commit;

select 'migración 27 deshecha' as control,
  not exists (select 1 from information_schema.tables where table_schema = 'portal' and table_name in ('hitos','mensajes','busquedas','reglas_cobro','cargos')) as ok;
