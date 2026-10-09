-- =====================================================================
-- BAIREN · Portal · Vuelta atrás de la migración 31 (reservas y cobranza)
--
-- Borra las funciones y las tablas de la 31: cuentas de cobro, credenciales de Mercado Pago, numeración de recibos,
-- reservas y cuotas, CON SUS DATOS. Antes de correrla con datos reales, exportá portal.reservas, portal.pagos y
-- portal.cuentas_cobro.
-- Los pasos que dejaron en el recorrido (reserva_pedida, reserva_pagada, reserva_vencida, reserva_devuelta y
-- pago_recibido) y sus cargos simulados quedan: son el registro de lo que pasó. Si también hay que borrarlos, está el
-- bloque comentado del final (es lo mismo que hace la vuelta atrás de la 28 con todos los pasos nuevos).
-- =====================================================================

drop function if exists portal.recibo(uuid);
drop function if exists portal.cobranza();
drop function if exists portal.mis_pagos();
drop function if exists portal.pagos_de_operacion(uuid);
drop function if exists portal.anular_pago(uuid);
drop function if exists portal.registrar_pago(uuid, text);
drop function if exists portal.armar_cuotas(uuid, date, integer, numeric, text, integer, text);
drop function if exists portal.vencer_reservas();
drop function if exists portal.cancelar_reserva(uuid, text);
drop function if exists portal.devolver_reserva(uuid, text);
drop function if exists portal.confirmar_reserva(uuid, text);
drop function if exists portal.pedir_reserva(uuid, numeric, text, integer);
drop function if exists portal.guardar_cuenta_cobro(uuid, text, text, text, text);
drop function if exists portal._pago_json(portal.pagos);
drop function if exists portal._reserva_json(portal.reservas);
drop function if exists portal._vencer_reservas(uuid);
drop function if exists portal._identidad_ok(uuid);
drop function if exists portal._identidad_requerida();
drop function if exists portal._es_servicio();

drop table if exists portal.pagos;
drop table if exists portal.reservas;
drop table if exists portal.recibos_numeracion;
drop table if exists portal.mp_credenciales;
drop table if exists portal.cuentas_cobro;

-- Opcional: borrar también los pasos de reservas y pagos del recorrido y sus cargos simulados.
-- delete from portal.cargos where hito_id in (select id from portal.hitos where tipo in ('reserva_pedida','reserva_pagada','reserva_vencida','reserva_devuelta','pago_recibido'));
-- delete from portal.hitos where tipo in ('reserva_pedida','reserva_pagada','reserva_vencida','reserva_devuelta','pago_recibido');

notify pgrst, 'reload schema';

select 'migración 31 deshecha' as control,
  not exists (select 1 from information_schema.tables where table_schema = 'portal'
    and table_name in ('cuentas_cobro','mp_credenciales','recibos_numeracion','reservas','pagos'))
  and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'portal'
    and p.proname in ('pedir_reserva','confirmar_reserva','registrar_pago','armar_cuotas','vencer_reservas','pagos_de_operacion')) as ok;
