-- Vuelta atrás de la migración 28: borra el escenario "Rieles · octubre 2026" con sus cargos y los pasos de los tipos
-- nuevos, y deja las restricciones como en la 27.
begin;
delete from portal.cargos where escenario = 'Rieles · octubre 2026';
delete from portal.reglas_cobro where escenario = 'Rieles · octubre 2026';
delete from portal.hitos where tipo in ('reserva_pedida','reserva_pagada','reserva_vencida','reserva_devuelta','documento_generado','documento_firmado','pago_recibido','garantia_elegida','garantia_emitida','seguro_emitido','lead_inversor');
alter table portal.reglas_cobro drop constraint if exists m28_regla_inquilino;
alter table portal.reglas_cobro drop constraint if exists m27_regla_paga;
alter table portal.reglas_cobro add constraint m27_regla_paga check (paga in ('publicador','interesado','propietario'));
alter table portal.reglas_cobro drop constraint if exists m27_regla_evento;
alter table portal.reglas_cobro add constraint m27_regla_evento check (evento in ('consulta','conversacion','whatsapp','visita_confirmada','visita_realizada',
  'solicitud_enviada','solicitud_aceptada','propuesta_aceptada','reserva','contrato_generado','contrato_firmado','cierre','cobro_mensual'));
alter table portal.hitos drop constraint if exists m27_hito_tipo;
alter table portal.hitos add constraint m27_hito_tipo check (tipo in ('consulta','conversacion','whatsapp','visita_pedida','visita_confirmada',
  'visita_realizada','visita_cancelada','solicitud_enviada','solicitud_aceptada','solicitud_rechazada',
  'propuesta_aceptada','reserva','contrato_generado','contrato_firmado','cierre','caida','reabierta','cobro_mensual'));
create or replace function portal.etapa_de_hito(p text) returns text language sql immutable as $$
  select case p
    when 'consulta' then 'consulta' when 'propuesta_aceptada' then 'consulta'
    when 'conversacion' then 'conversacion' when 'whatsapp' then 'conversacion'
    when 'visita_pedida' then 'visita' when 'visita_confirmada' then 'visita' when 'visita_realizada' then 'visita'
    when 'solicitud_enviada' then 'solicitud' when 'solicitud_aceptada' then 'solicitud'
    when 'reserva' then 'reserva' when 'contrato_firmado' then 'contrato' when 'cierre' then 'cerrada'
  end
$$;
notify pgrst, 'reload schema';
commit;
