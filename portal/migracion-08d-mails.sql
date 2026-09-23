-- =====================================================================
-- BAIREN · Portal · Migración 08d · Los mails, limpios
--
-- Correr DESPUÉS de la 08, 08b y 08c.
--
-- Qué pasó: el ensayo del 22/9/2026 devolvió el mail de un propietario
-- con un espacio en el medio ("nombre@ gmail.com"). Un mail no puede
-- tener espacios, así que ese dato está roto: con él, el dueño no puede
-- entrar a su panel ni recibir el resumen semanal.
--
-- Qué hace esto: limpia el mail SOLO para publicarlo (saca espacios,
-- pasa a minúscula) y, si aun así no parece un mail, lo trata como si
-- no tuviera y lo avisa. **No toca el dato del OS**: la corrección de
-- fondo la hace Tomás en la ficha del propietario.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · Un mail utilizable, o nada ──────────────────────────────────
create or replace function portal.mail_limpio(p_mail text)
returns text
language sql immutable
as $$
  select nullif(
    case
      when limpio ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then limpio
      else ''
    end, '')
  from (select lower(regexp_replace(coalesce(p_mail, ''), '[[:space:]]', '', 'g')) as limpio) t
$$;

comment on function portal.mail_limpio(text) is
  'Deja un mail utilizable: sin espacios y en minúscula. Si aun así no tiene forma de mail, devuelve nulo, porque un contacto roto publicado es peor que ninguno. No corrige el dato de origen.';

-- ── 2 · La lista de trabajo usa el mail limpio ──────────────────────
create or replace function portal.duenos_de_avisos()
returns table (
  aviso_id            uuid,
  codigo              text,
  titulo              text,
  estado              text,
  reservado           boolean,
  publicador_actual   text,
  propiedad_id        uuid,
  propietario_id      uuid,
  propietario_nombre  text,
  propietario_email   text,
  propietario_tel     text,
  publicador_dueno_id uuid,
  listo               boolean
)
language sql
security definer
set search_path = portal, public
as $$
  select
    a.id, a.codigo, a.titulo, a.estado, (a.estado <> 'disponible'), pa.nombre,
    a.propiedad_id, pr.id,
    portal.nombre_propio(pr.nombre),
    portal.mail_limpio(pr.email),
    nullif(trim(pr.telefono), ''),
    pd.id,
    (pr.nombre is not null and a.estado = 'disponible')
  from portal.avisos a
  join portal.publicadores pa on pa.id = a.publicador_id
  left join public.propiedades  p  on p.id  = a.propiedad_id
  left join public.propietarios pr on pr.id = p.propietario_id
  left join portal.publicadores pd
         on pd.tipo = 'dueno'
        and (pd.propietario_id = pr.id
             or (pd.propietario_id is null
                 and lower(trim(pd.nombre)) = lower(trim(portal.nombre_propio(pr.nombre)))))
  order by pr.nombre nulls last, a.codigo;
$$;

-- ── 3 · Qué mails hay que arreglar en el OS ─────────────────────────
-- Los que están cargados pero no se pueden usar. Es la lista para Tomás.
create or replace function portal.mails_rotos()
returns table (propietario text, mail_cargado text, problema text)
language sql
security definer
set search_path = portal, public
as $$
  select distinct
    portal.nombre_propio(pr.nombre),
    pr.email,
    case
      when coalesce(trim(pr.email), '') = '' then 'no tiene mail cargado'
      when pr.email ~ '[[:space:]]'          then 'tiene un espacio en el medio'
      else 'no tiene forma de mail'
    end
  from portal.avisos a
  join portal.publicadores pa on pa.id = a.publicador_id and pa.slug = 'bairen'
  join public.propiedades  p  on p.id  = a.propiedad_id
  join public.propietarios pr on pr.id = p.propietario_id
  where portal.mail_limpio(pr.email) is null
  order by 1;
$$;

revoke all  on function portal.duenos_de_avisos() from public, anon, authenticated;
grant execute on function portal.duenos_de_avisos() to service_role;
revoke all  on function portal.mails_rotos()       from public, anon, authenticated;
grant execute on function portal.mails_rotos()       to service_role;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Los que hay que arreglar a mano en el OS:
--   select * from portal.mails_rotos();
-- Y el ensayo, que ahora tiene que mostrar el mail de Daniel sin el espacio:
--   select * from portal.pasar_avisos_a_duenos('tomas@bairengroup.com');
