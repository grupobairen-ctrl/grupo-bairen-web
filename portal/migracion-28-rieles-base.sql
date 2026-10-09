-- =====================================================================
-- BAIREN · Portal · Migración 28 · Rieles: la base común de los módulos
--
-- 9/10/2026. Plan "BAIREN Nueva Era": BAIREN cobra por los rieles por donde pasa la operación (identidad, documentos y
-- firma, reserva, cobranza, garantía y seguro, desarrollos), nunca un porcentaje de la comisión ni nada al inquilino de
-- vivienda. Cada módulo (migraciones 29 a 34) registra sus pasos como hitos de la operación y el motor de cobro de la 27
-- los pasa por las reglas. Esta migración:
--   1. suma los pasos nuevos a portal.hitos (reserva pedida, pagada, vencida y devuelta; documento generado y firmado;
--      pago recibido; garantía elegida y emitida; seguro emitido; lead de inversor);
--   2. la reserva pagada lleva la operación a la etapa "reserva";
--   3. las reglas de cobro aceptan esos eventos y un pagador "tercero" (aseguradora, fiadora, banco);
--   4. carga el escenario "Rieles · octubre 2026" con los montos del plan, en simulación (cobra = false).
-- Nada se borra. Vuelta atrás: migracion-28-rieles-base-rollback.sql.
-- =====================================================================

alter table portal.hitos drop constraint if exists m27_hito_tipo;
alter table portal.hitos add constraint m27_hito_tipo check (tipo in ('consulta','conversacion','whatsapp','visita_pedida',
  'visita_confirmada','visita_realizada','visita_cancelada','solicitud_enviada','solicitud_aceptada','solicitud_rechazada',
  'propuesta_aceptada','reserva','contrato_generado','contrato_firmado','cierre','caida','reabierta','cobro_mensual',
  'reserva_pedida','reserva_pagada','reserva_vencida','reserva_devuelta','documento_generado','documento_firmado',
  'pago_recibido','garantia_elegida','garantia_emitida','seguro_emitido','lead_inversor'));

create or replace function portal.etapa_de_hito(p text) returns text language sql immutable as $$
  select case p
    when 'consulta' then 'consulta' when 'propuesta_aceptada' then 'consulta'
    when 'conversacion' then 'conversacion' when 'whatsapp' then 'conversacion'
    when 'visita_pedida' then 'visita' when 'visita_confirmada' then 'visita' when 'visita_realizada' then 'visita'
    when 'solicitud_enviada' then 'solicitud' when 'solicitud_aceptada' then 'solicitud'
    when 'reserva' then 'reserva' when 'reserva_pagada' then 'reserva'
    when 'contrato_firmado' then 'contrato' when 'cierre' then 'cerrada'
  end
$$;

alter table portal.reglas_cobro drop constraint if exists m27_regla_evento;
alter table portal.reglas_cobro add constraint m27_regla_evento check (evento in ('consulta','conversacion','whatsapp',
  'visita_confirmada','visita_realizada','solicitud_enviada','solicitud_aceptada','propuesta_aceptada','reserva',
  'contrato_generado','contrato_firmado','cierre','cobro_mensual','reserva_pagada','documento_firmado','pago_recibido',
  'garantia_emitida','seguro_emitido','lead_inversor'));
alter table portal.reglas_cobro drop constraint if exists m27_regla_paga;
alter table portal.reglas_cobro add constraint m27_regla_paga check (paga in ('publicador','interesado','propietario','tercero'));

-- Ninguna regla le cobra al inquilino de vivienda (Ley 5859): "interesado" queda solo para la estadía corta (turismo, Ley 6255)
alter table portal.reglas_cobro drop constraint if exists m28_regla_inquilino;
alter table portal.reglas_cobro add constraint m28_regla_inquilino check (paga <> 'interesado' or linea = 'temporario');

insert into portal.reglas_cobro (escenario, concepto, linea, evento, paga, modo, valor, moneda, base, nota)
select * from (values
  ('Rieles · octubre 2026', 'Contrato digital con firma', 'mediano', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null, 'Servicio con precio fijo, igual para cualquier unidad.'),
  ('Rieles · octubre 2026', 'Contrato digital con firma', 'tradicional', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null, 'Servicio con precio fijo, igual para cualquier unidad.'),
  ('Rieles · octubre 2026', 'Contrato digital con firma', 'temporario', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null, 'Servicio con precio fijo, igual para cualquier unidad.'),
  ('Rieles · octubre 2026', 'Cobranza digital', 'mediano', 'pago_recibido', 'propietario', 'porcentaje', 2, 'USD', 'monto_hito', 'Sobre lo cobrado con el split de Mercado Pago; la plata va directo al dueño.'),
  ('Rieles · octubre 2026', 'Cobranza digital', 'tradicional', 'pago_recibido', 'propietario', 'porcentaje', 2, 'USD', 'monto_hito', 'Sobre lo cobrado con el split de Mercado Pago; la plata va directo al dueño.'),
  ('Rieles · octubre 2026', 'Reserva online', 'mediano', 'reserva_pagada', 'publicador', 'fijo', 80, 'USD', null, 'Tarifa fija por reserva; nunca al inquilino.'),
  ('Rieles · octubre 2026', 'Propuesta aceptada en Búsquedas', 'todas', 'propuesta_aceptada', 'publicador', 'fijo', 20, 'USD', null, 'Se cobra al aceptar el contacto, no al cerrar.'),
  ('Rieles · octubre 2026', 'Garantía de alquiler', 'todas', 'garantia_emitida', 'tercero', 'porcentaje', 20, 'USD', 'monto_hito', 'Comisión del convenio con la empresa de garantías, sobre el costo de la garantía.'),
  ('Rieles · octubre 2026', 'Seguro (caución u hogar)', 'todas', 'seguro_emitido', 'tercero', 'porcentaje', 20, 'USD', 'monto_hito', 'Vía productor aliado o agente institorio (Ley 22.400).'),
  ('Rieles · octubre 2026', 'Tecnología por operación (corredor aliado)', 'venta', 'cierre', 'publicador', 'fijo', 150, 'USD', null, 'Monto fijo que paga el corredor por usar la plataforma; nunca un porcentaje de su comisión.'),
  ('Rieles · octubre 2026', 'Tecnología por operación (corredor aliado)', 'tradicional', 'cierre', 'publicador', 'fijo', 50, 'USD', null, 'Monto fijo que paga el corredor por usar la plataforma; nunca un porcentaje de su comisión.'),
  ('Rieles · octubre 2026', 'Estadía corta', 'temporario', 'cierre', 'publicador', 'porcentaje', 10, 'USD', 'monto_contrato', 'Hasta 3 meses, turismo (Ley 6255); requiere el registro de la plataforma.'),
  ('Rieles · octubre 2026', 'Inversor verificado', 'pozo', 'lead_inversor', 'publicador', 'fijo', 30, 'USD', null, 'Contacto calificado para la desarrolladora; no depende de la venta.')
) as v(escenario, concepto, linea, evento, paga, modo, valor, moneda, base, nota)
where not exists (select 1 from portal.reglas_cobro where escenario = 'Rieles · octubre 2026');

notify pgrst, 'reload schema';

select 'pasos nuevos' as control, exists (select 1 from pg_constraint where conname = 'm27_hito_tipo' and pg_get_constraintdef(oid) like '%garantia_emitida%') as ok
union all select 'escenario Rieles', (select count(*) from portal.reglas_cobro where escenario = 'Rieles · octubre 2026') = 13
union all select 'todo en simulación', not exists (select 1 from portal.reglas_cobro where cobra);
