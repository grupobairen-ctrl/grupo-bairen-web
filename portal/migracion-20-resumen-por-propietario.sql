-- =====================================================================
-- BAIREN · Portal · Migración 20 · Quién recibe el resumen semanal
--
-- Decisión de Tomás del 23/9/2026:
--   · Publicadores (corredores, inmobiliarias, gestores, desarrolladoras):
--     reciben el resumen. Están adentro sabiendo que están adentro.
--   · Propietarios que YA estaban al 23/9/2026: NO reciben nada. Son 24
--     personas que confiaron su departamento y todavía no saben que
--     tienen acceso al portal ni que les va a llegar un mail semanal.
--     Se les avisa primero, y recién ahí se les enciende.
--   · Propietarios que entren DESDE HOY: reciben, automáticamente. El
--     que entra de ahora en más entra sabiendo cómo funciona.
--
-- Cómo se implementa: una tabla con un renglón por propietario y un
-- interruptor. Los 24 de hoy entran apagados. Cualquier mail que no
-- figure en la tabla se considera nuevo, se enciende solo y queda
-- registrado, así nadie nuevo se pierde el mail por olvido.
--
-- Para encender a los de hoy, cuando Tomás les avise:
--   update portal.propietarios_resumen set activo = true;
-- O de a uno:
--   update portal.propietarios_resumen set activo = true where email = '...';
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · El registro ─────────────────────────────────────────────────
create table if not exists portal.propietarios_resumen (
  email      text primary key,
  activo     boolean not null default true,
  desde      timestamptz not null default now(),
  avisado_en timestamptz,
  nota       text
);

alter table portal.propietarios_resumen enable row level security;
-- Sin políticas: solo el servidor con la service key.

comment on table portal.propietarios_resumen is
  'Qué propietarios reciben el resumen semanal. Un mail que no está acá se considera nuevo y se agrega encendido. Los que estaban al 23/9/2026 entraron apagados porque todavía no se les había avisado.';

comment on column portal.propietarios_resumen.avisado_en is
  'Cuándo se le contó al propietario que tiene acceso al portal y que va a recibir el resumen. Se completa a mano cuando se le avisa.';

-- ── 2 · Los que ya estaban entran apagados ──────────────────────────
-- Solo esta vez: de acá en adelante, el que aparezca se enciende solo.
insert into portal.propietarios_resumen (email, activo, nota)
select distinct lower(trim(a.propietario_email)), false,
       'Ya era propietario al 23/9/2026 y todavía no se le avisó. Encender cuando se le cuente.'
  from portal.avisos a
 where coalesce(trim(a.propietario_email), '') <> ''
on conflict (email) do nothing;

-- ── 3 · La lista de trabajo, con el interruptor al lado ─────────────
-- Igual que resumen_semanal_propietarios, más una columna que dice si a
-- ese mail hay que escribirle. `activo` en null significa que es nuevo.
--
-- El DROP no es opcional: esta versión devuelve una columna más que la de
-- la migración 19, y Postgres no deja cambiarle la forma a una función que
-- ya existe. Sin esto da "cannot change return type of existing function".
drop function if exists portal.resumen_semanal_propietarios(timestamptz, timestamptz);

create or replace function portal.resumen_semanal_propietarios(
  p_desde timestamptz,
  p_hasta timestamptz default now()
) returns table (
  propietario_email text,
  activo            boolean,
  publica           text,
  aviso_id          uuid,
  codigo            text,
  titulo            text,
  direccion         text,
  vistas            bigint,
  consultas         bigint,
  visitas           bigint
)
language sql
security definer
set search_path = portal, public
as $$
  select
    lower(trim(a.propietario_email)), pr.activo, pub.nombre,
    a.id, a.codigo, a.titulo, a.direccion,
    (select count(*) from portal.vistas v
      where (v.aviso_id = a.id or v.aviso_ref = a.id::text or v.aviso_ref = a.codigo)
        and v.fecha >= p_desde and v.fecha < p_hasta),
    (select count(*) from portal.consultas c
      where (c.aviso_id = a.id or c.aviso_ref = a.id::text or c.aviso_ref = a.codigo)
        and c.created_at >= p_desde and c.created_at < p_hasta),
    (select count(*) from portal.visitas_reservas r
      where r.aviso_id = a.id
        and r.created_at >= p_desde and r.created_at < p_hasta)
  from portal.avisos a
  join portal.publicadores pub on pub.id = a.publicador_id
  left join portal.propietarios_resumen pr on pr.email = lower(trim(a.propietario_email))
  where a.estado_curacion = 'publicado'
    and coalesce(trim(a.propietario_email), '') <> ''
  order by 1, a.codigo;
$$;

revoke all  on function portal.resumen_semanal_propietarios(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function portal.resumen_semanal_propietarios(timestamptz, timestamptz) to service_role;

-- ── 4 · Dar de alta a uno nuevo ─────────────────────────────────────
-- La usa el servidor cuando se cruza con un propietario que no figura.
create or replace function portal.alta_propietario_resumen(p_email text)
returns boolean
language plpgsql
security definer
set search_path = portal, public
as $$
declare v_mail text := lower(trim(coalesce(p_email, '')));
begin
  if v_mail = '' then return false; end if;
  insert into portal.propietarios_resumen (email, activo, nota)
  values (v_mail, true, 'Alta automática: entró después del 23/9/2026.')
  on conflict (email) do nothing;
  return true;
end;
$$;

revoke all  on function portal.alta_propietario_resumen(text) from public, anon, authenticated;
grant execute on function portal.alta_propietario_resumen(text) to service_role;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Cuántos quedaron apagados (tendrían que ser los de hoy) y cuántos encendidos:
-- select activo, count(*) from portal.propietarios_resumen group by 1;
--
-- Y el día que se les avise, para encenderlos a todos:
-- update portal.propietarios_resumen
--    set activo = true, avisado_en = now()
--  where activo = false;
