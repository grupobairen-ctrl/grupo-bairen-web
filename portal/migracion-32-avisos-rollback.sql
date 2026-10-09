-- Vuelta atrás de la migración 32 (avisos y cruce de búsquedas): saca los triggers, las funciones y las tres tablas
-- nuevas (con los avisos, las preferencias y las coincidencias que hubiera). Mensajes, pasos, búsquedas y propuestas
-- quedan como estaban.
drop trigger if exists trg_ntf_mensaje on portal.mensajes;
drop trigger if exists trg_ntf_mensaje_leido on portal.mensajes;
drop trigger if exists trg_ntf_hito on portal.hitos;
drop trigger if exists trg_ntf_propuesta on portal.propuestas;

drop function if exists portal.trg_ntf_mensaje();
drop function if exists portal.trg_ntf_mensaje_leido();
drop function if exists portal.trg_ntf_hito();
drop function if exists portal.trg_ntf_propuesta();
drop function if exists portal.calcular_coincidencias(integer);
drop function if exists portal.mis_coincidencias();
drop function if exists portal.marcar_notificaciones(bigint[]);
drop function if exists portal.guardar_preferencias_aviso(boolean);
drop function if exists portal.avisos_para_mail(integer, integer);
drop function if exists portal.marcar_mail_enviado(bigint[]);
drop function if exists portal._ntf_avisar(uuid, text, text, text, text, text, uuid, uuid, uuid, text, jsonb, boolean, text, integer);
drop function if exists portal._ntf_puntaje(portal.busquedas, portal.avisos);
drop function if exists portal._ntf_destinatarios(uuid, text);
drop function if exists portal._ntf_equipo(uuid);
drop function if exists portal._ntf_busqueda(uuid);
drop function if exists portal._ntf_unidad(uuid, boolean);
drop function if exists portal._ntf_fecha(timestamptz);
drop function if exists portal._ntf_ts(text);
drop function if exists portal._ntf_monto(numeric, text);
drop function if exists portal._ntf_norm(text);
drop function if exists portal._ntf_es_servicio();

drop table if exists portal.coincidencias;
drop table if exists portal.preferencias_aviso;
drop table if exists portal.notificaciones;

notify pgrst, 'reload schema';

select 'migración 32 deshecha' as control,
  not exists (select 1 from information_schema.tables where table_schema = 'portal'
    and table_name in ('notificaciones', 'preferencias_aviso', 'coincidencias')) as ok;
