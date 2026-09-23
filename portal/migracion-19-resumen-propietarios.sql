-- =====================================================================
-- BAIREN · Portal · Migración 19 · El resumen semanal también al dueño
--
-- Agujero encontrado el 23/9/2026 al probar la migración 09: el resumen
-- semanal se arma POR PUBLICADOR, y desde que las unidades volvieron a
-- Bairen Realty, los propietarios ya no son publicadores. O sea que el
-- mail le llegaba a Bairen Realty y a Maxim, y a los trece dueños no les
-- llegaba nada.
--
-- Y ese mail al dueño es la palanca entera del modelo: es lo que lo hace
-- entrar cada semana a ver sus números, y es el argumento con el que
-- después se le vende el sistema al corredor ("tus propietarios ya están
-- adentro pidiéndote que cargues las visitas ahí").
--
-- Qué agrega:
--   1. portal.resumen_semanal_propietarios(): lo mismo que el otro, pero
--      agrupado por el mail del propietario del aviso, que es el vínculo
--      que se creó en la migración 13.
--   2. portal.resumenes_enviados acepta destinatarios que no son
--      publicadores, con su propio control de "una vez por semana".
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · El registro de envíos acepta también a los propietarios ─────
alter table portal.resumenes_enviados add column if not exists propietario_email text;
alter table portal.resumenes_enviados alter column publicador_id drop not null;

-- Una fila es de un publicador o de un propietario, nunca de los dos ni de ninguno.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'resumenes_destinatario_check') then
    alter table portal.resumenes_enviados
      add constraint resumenes_destinatario_check
      check ((publicador_id is not null) <> (propietario_email is not null));
  end if;
end $$;

create unique index if not exists resumenes_propietario_uidx
  on portal.resumenes_enviados(lower(propietario_email), semana)
  where propietario_email is not null;

comment on column portal.resumenes_enviados.propietario_email is
  'Cuando el resumen va a un propietario que no publica. Con publicador_id son excluyentes: una fila es de uno o del otro.';

-- ── 2 · El resumen, visto desde el dueño ────────────────────────────
-- Mismo criterio que resumen_semanal, pero agrupando por el mail del
-- propietario en vez del publicador. Solo avisos publicados, y solo los
-- que tienen ese mail cargado (la migración 13 lo completó para 24).
create or replace function portal.resumen_semanal_propietarios(
  p_desde timestamptz,
  p_hasta timestamptz default now()
) returns table (
  propietario_email text,
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
    lower(trim(a.propietario_email)), pub.nombre,
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
  where a.estado_curacion = 'publicado'
    and coalesce(trim(a.propietario_email), '') <> ''
  order by 1, a.codigo;
$$;

comment on function portal.resumen_semanal_propietarios(timestamptz, timestamptz) is
  'Vistas, consultas y visitas de cada unidad, agrupadas por el mail de su propietario. Es el resumen que recibe el dueño, que no es quien publica: esa separación es el modelo decidido el 23/9/2026.';

revoke all  on function portal.resumen_semanal_propietarios(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function portal.resumen_semanal_propietarios(timestamptz, timestamptz) to service_role;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- A cuántos dueños les llegaría, y con qué números:
-- select propietario_email, count(*) as unidades, sum(vistas) as vistas,
--        sum(consultas) as consultas
--   from portal.resumen_semanal_propietarios(now() - interval '7 days')
--  group by 1 order by 3 desc;
