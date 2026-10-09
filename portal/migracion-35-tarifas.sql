-- =====================================================================
-- BAIREN · Portal · Migración 35 · Tarifas públicas: el estimado al publicar y la página de precios
--
-- 9/10/2026. Pedido de Tomás: "poner un estimado de lo que correspondería para BAIREN en el caso de que se concrete la
-- operación del usuario en el momento en el que el usuario suba su inmueble [...] como en Pedidos Ya". Encuadre: BAIREN no
-- cobra comisión por la operación; cobra SERVICIOS, con precio fijo o sobre lo que procesa, en el momento en que se usan
-- (al firmar, al cobrar cada pago, al pagar la reserva). Publicar es sin costo. Precios completos y claros (Ley 24.240
-- art. 4; Res. SIC 446/2025).
--
-- Qué agrega (nada se borra):
--   1. portal.config_portal: configuración del portal, clave → valor jsonb. Arranca con escenario_publico =
--      'Rieles · octubre 2026' (el escenario del motor de cobro que ven los publicadores). Solo la lee la plataforma; el
--      público la usa a través de las funciones.
--   2. portal.reglas_cobro.nota_publica: la aclaración que ve el público (la columna "nota" sigue siendo interna). Se
--      completa para las reglas del escenario Rieles.
--   3. Regla "Firma de reserva" (venta, al firmar el documento, USD 40 fijo, la paga el propietario), en simulación, solo
--      si el escenario Rieles todavía no tiene una regla de firma para la venta (si la trajo el módulo de documentos, no
--      se duplica). Es el servicio del dueño directo que vende: el valor es de ejemplo, igual al contrato digital.
--   4. portal.escenario_publico() y portal.tarifas_publicas(p_linea), también para anónimos: las reglas activas del
--      escenario público que paga quien publica o el propietario (nunca las de terceros ni las de quien busca).
--   5. portal.fijar_escenario_publico(p_escenario): la plataforma (curación o soporte) cambia el escenario público. No
--      acepta un escenario que cobre un porcentaje de la venta o del alquiler (solo un corredor matriculado puede, Ley
--      2340): esos precios no se le pueden mostrar al público.
-- Vuelta atrás: migracion-35-tarifas-rollback.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Configuración del portal
-- ---------------------------------------------------------------------
create table if not exists portal.config_portal (
  clave           text primary key,
  valor           jsonb not null,
  actualizado_por text,
  actualizado_en  timestamptz not null default now(),
  constraint m35_config_clave check (clave ~ '^[a-z][a-z0-9_]{0,59}$')
);
alter table portal.config_portal enable row level security;

drop policy if exists "config la ve la plataforma" on portal.config_portal;
create policy "config la ve la plataforma" on portal.config_portal for select
  using (portal.es_curador() or portal.es_plataforma());

revoke all on portal.config_portal from anon, authenticated;
grant select on portal.config_portal to authenticated;

insert into portal.config_portal (clave, valor, actualizado_por)
values ('escenario_publico', to_jsonb('Rieles · octubre 2026'::text), 'migración 35')
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------
-- 2. La nota que ve el público
-- ---------------------------------------------------------------------
alter table portal.reglas_cobro add column if not exists nota_publica text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'm35_regla_nota_publica') then
    alter table portal.reglas_cobro add constraint m35_regla_nota_publica check (char_length(coalesce(nota_publica, '')) <= 240);
  end if;
end $$;

update portal.reglas_cobro r set nota_publica = v.nota
from (values
  ('Contrato digital con firma', 'Lo preparamos y se firma en línea. Precio fijo, igual para cualquier unidad.'),
  ('Cobranza digital', 'Sobre cada pago que cobrás por BAIREN. La plata va directo a tu cuenta.'),
  ('Reserva online', 'Por cada reserva pagada en línea. La seña va directo a tu cuenta.'),
  ('Propuesta aceptada en Búsquedas', 'Solo si alguien acepta una unidad que le propusiste. No depende de cerrar.'),
  ('Tecnología por operación (corredor aliado)', 'Para corredores matriculados: monto fijo por operación registrada, nunca un porcentaje de sus honorarios.'),
  ('Estadía corta', 'Sobre el total de la estadía, de hasta 3 meses.'),
  ('Inversor verificado', 'Por cada inversor verificado que te consulta. No depende de la venta.')
) as v(concepto, nota)
where r.escenario = 'Rieles · octubre 2026' and r.concepto = v.concepto and r.nota_publica is null;

-- ---------------------------------------------------------------------
-- 3. Firma de reserva para la venta (si el escenario Rieles no tiene ya una firma para la venta)
-- ---------------------------------------------------------------------
insert into portal.reglas_cobro (escenario, concepto, linea, evento, paga, modo, valor, moneda, base, nota, nota_publica)
select 'Rieles · octubre 2026', 'Firma de reserva', 'venta', 'documento_firmado', 'propietario', 'fijo', 40, 'USD', null,
       'Valor de ejemplo, igual al contrato digital (migración 35). Servicio con precio fijo.',
       'La reserva se firma en línea. Precio fijo, igual para cualquier unidad.'
where exists (select 1 from portal.reglas_cobro where escenario = 'Rieles · octubre 2026')
  and not exists (select 1 from portal.reglas_cobro where escenario = 'Rieles · octubre 2026'
                    and evento = 'documento_firmado' and linea in ('venta', 'todas'));

-- ---------------------------------------------------------------------
-- 4. Lo que ve el público
-- ---------------------------------------------------------------------
create or replace function portal.escenario_publico() returns text
language sql stable security definer set search_path to 'portal', 'public' as $$
  select coalesce((select c.valor #>> '{}' from portal.config_portal c where c.clave = 'escenario_publico'), 'Rieles · octubre 2026')
$$;

-- Las reglas activas del escenario público que paga quien publica o el propietario. Con p_linea, las de esa línea y las
-- de todas. Nunca las de terceros (aseguradora, fiadora) ni las de quien busca. Sin la nota interna.
create or replace function portal.tarifas_publicas(p_linea text default null)
returns table (concepto text, linea text, evento text, paga text, modo text, valor numeric, moneda text, base text,
               minimo numeric, maximo numeric, nota_publica text, cobra boolean)
language plpgsql stable security definer set search_path to 'portal', 'public' as $$
begin
  if p_linea is not null and p_linea not in ('temporario', 'mediano', 'tradicional', 'venta', 'pozo') then
    raise exception 'Línea desconocida.' using errcode = '22023';
  end if;
  return query
    select coalesce(nullif(btrim(r.concepto), ''), r.evento), r.linea, r.evento, r.paga, r.modo, r.valor::numeric, r.moneda, r.base,
           r.minimo::numeric, r.maximo::numeric, r.nota_publica, r.cobra
      from portal.reglas_cobro r
     where r.escenario = portal.escenario_publico()
       and r.activa
       and r.paga in ('publicador', 'propietario')
       and (p_linea is null or r.linea in (p_linea, 'todas'))
     order by (r.linea = 'todas'), r.linea, r.evento, r.concepto;
end $$;

-- ---------------------------------------------------------------------
-- 5. La plataforma elige el escenario público
-- ---------------------------------------------------------------------
create or replace function portal.fijar_escenario_publico(p_escenario text) returns text
language plpgsql security definer set search_path to 'portal', 'public' as $$
declare v text := btrim(coalesce(p_escenario, ''));
begin
  if not (portal.es_curador() or portal.es_plataforma('soporte')) then
    raise exception 'Solo la plataforma cambia el escenario que ven los publicadores.' using errcode = '42501';
  end if;
  if v = '' or not exists (select 1 from portal.reglas_cobro where escenario = v and activa) then
    raise exception 'Ese escenario no existe o no tiene reglas activas.' using errcode = '22023';
  end if;
  -- BAIREN no es corredora: un porcentaje de la venta o del alquiler (salvo la estadía corta) no se muestra al público
  if exists (select 1 from portal.reglas_cobro where escenario = v and activa and paga in ('publicador', 'propietario')
               and modo = 'porcentaje' and base in ('precio_publicado', 'precio_cierre', 'monto_contrato') and linea <> 'temporario') then
    raise exception 'Ese escenario cobra un porcentaje de la venta o del alquiler: no se le puede mostrar al público (Ley 2340).' using errcode = '22023';
  end if;
  insert into portal.config_portal (clave, valor, actualizado_por, actualizado_en)
  values ('escenario_publico', to_jsonb(v), coalesce(auth.jwt() ->> 'email', 'sistema'), now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_por = excluded.actualizado_por, actualizado_en = now();
  return v;
end $$;

-- ---------------------------------------------------------------------
-- 6. Permisos de función
-- ---------------------------------------------------------------------
revoke all on function portal.escenario_publico(), portal.tarifas_publicas(text), portal.fijar_escenario_publico(text) from public;
revoke all on function portal.fijar_escenario_publico(text) from anon;
grant execute on function portal.escenario_publico(), portal.tarifas_publicas(text) to anon, authenticated;
grant execute on function portal.fijar_escenario_publico(text) to authenticated;

notify pgrst, 'reload schema';

-- Controles
select 'configuración' as control, (select valor #>> '{}' from portal.config_portal where clave = 'escenario_publico') = 'Rieles · octubre 2026' as ok
union all select 'notas públicas de Rieles', not exists (select 1 from portal.reglas_cobro where escenario = 'Rieles · octubre 2026'
  and paga in ('publicador', 'propietario') and nota_publica is null)
union all select 'firma de reserva para la venta', exists (select 1 from portal.reglas_cobro where escenario = 'Rieles · octubre 2026'
  and evento = 'documento_firmado' and linea in ('venta', 'todas'))
union all select 'tarifas públicas sin terceros', (select count(*) from portal.tarifas_publicas()) > 0
  and not exists (select 1 from portal.tarifas_publicas() t where t.paga not in ('publicador', 'propietario'))
union all select 'todo en simulación', not exists (select 1 from portal.reglas_cobro where cobra);
