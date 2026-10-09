-- Vuelta atrás de la migración 35 (tarifas públicas): quita las funciones, la regla "Firma de reserva" que agregó la 35
-- (y sus cargos simulados), la nota pública y la configuración del portal. Las demás reglas y cargos quedan como estaban.
drop function if exists portal.fijar_escenario_publico(text);
drop function if exists portal.tarifas_publicas(text);
drop function if exists portal.escenario_publico();

delete from portal.cargos c
 using portal.reglas_cobro r
 where c.regla_id = r.id and c.estado = 'simulado'
   and r.escenario = 'Rieles · octubre 2026' and r.concepto = 'Firma de reserva' and r.nota like '%(migración 35)%';
delete from portal.reglas_cobro
 where escenario = 'Rieles · octubre 2026' and concepto = 'Firma de reserva' and nota like '%(migración 35)%';

alter table portal.reglas_cobro drop constraint if exists m35_regla_nota_publica;
alter table portal.reglas_cobro drop column if exists nota_publica;

drop table if exists portal.config_portal;

notify pgrst, 'reload schema';

select 'sin configuración' as control, to_regclass('portal.config_portal') is null as ok
union all select 'sin nota pública', not exists (select 1 from information_schema.columns where table_schema = 'portal'
  and table_name = 'reglas_cobro' and column_name = 'nota_publica')
union all select 'sin funciones', not exists (select 1 from pg_proc where pronamespace = 'portal'::regnamespace
  and proname in ('escenario_publico', 'tarifas_publicas', 'fijar_escenario_publico'));
