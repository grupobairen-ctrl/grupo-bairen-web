-- =====================================================================
-- BAIREN · Portal · Migración 11 · Los gestores, y BAIREN deja de publicar
--
-- Decisión de Tomás del 23/9/2026:
--   · Bairen Realty es una línea de negocio propia: alquiler a mediano
--     plazo, 3 a 12 meses, amoblado, sin garantía inmobiliaria ni seguro
--     de caución.
--   · Entra al portal como una categoría nueva de publicador: GESTOR.
--   · Las unidades que hoy publica "BAIREN" son de Bairen Realty.
--
-- Por qué importa más de lo que parece: hasta ahora el publicador se
-- llamaba "BAIREN", o sea que la marca del portal figuraba publicando 28
-- unidades y atendiendo sus consultas. Eso es BAIREN operando, que es la
-- única regla marcada como no negociable ("el día que se rompe, no se
-- vuelve"). Con este cambio el portal deja de publicar y quien publica
-- es un gestor, que es un actor más del portal, como un corredor o un
-- dueño directo.
--
-- Qué hace:
--   1. Suma dos curadores. Hasta hoy había UNO solo, y si ese mail se
--      perdía nadie podía aprobar nada: el portal se congelaba.
--   2. Agrega el tipo 'gestor' a los tipos válidos de publicador.
--   3. Convierte el publicador 'bairen' en BAIREN REALTY, tipo gestor.
--   4. Arregla el pase, que filtraba por nombre y se rompía con el
--      cambio de nombre.
--
-- OJO con dos cosas, las dos contempladas abajo:
--   · trg_pub_verificacion bloquea los cambios de tipo y de badge en un
--     publicador verificado, salvo que lo haga un curador. Se apaga y se
--     vuelve a prender alrededor del UPDATE.
--   · El slug 'bairen' NO se toca: está en las direcciones web, en el
--     código y en api/_portal/alertas.js. Cambia el nombre visible, no
--     el identificador.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · Dos curadores más ───────────────────────────────────────────
insert into portal.curadores (email, nombre)
values ('contact.tomasromero@gmail.com', 'Tomás Romero'),
       ('julianlavayen.ofic@gmail.com',  'Julián Lavayen')
on conflict (email) do nothing;

-- ── 2 · El tipo 'gestor' ────────────────────────────────────────────
-- Un gestor administra y alquila unidades de terceros. No es el dueño,
-- no es un corredor matriculado, y no es el portal.
do $$
declare v_nombre text;
begin
  select conname into v_nombre
    from pg_constraint
   where conrelid = 'portal.publicadores'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%tipo%';

  if v_nombre is not null then
    execute format('alter table portal.publicadores drop constraint %I', v_nombre);
  end if;

  alter table portal.publicadores
    add constraint publicadores_tipo_check
    check (tipo in ('dueno', 'profesional', 'desarrolladora', 'gestor'));
end $$;

comment on column portal.publicadores.tipo is
  'dueno: el propietario publica lo suyo. profesional: corredor o inmobiliaria matriculada. desarrolladora: vende sus propios emprendimientos. gestor: administra y alquila unidades de terceros sin ser corredor (Bairen Realty, desde el 23/9/2026).';

-- ── 3 · BAIREN pasa a ser BAIREN REALTY, gestor ─────────────────────
-- El disparador de verificación protege tipo y badge en un publicador ya
-- verificado. Se apaga para este UPDATE y se vuelve a prender enseguida.
-- Si algo falla, la transacción revierte todo, incluido el apagado.
do $$
begin
  begin
    execute 'alter table portal.publicadores disable trigger trg_pub_verificacion';
  exception when others then null;
  end;

  update portal.publicadores
     set nombre      = 'BAIREN REALTY',
         tipo        = 'gestor',
         badge       = 'Gestor de alquileres',
         descripcion = 'Alquiler a mediano plazo, de 3 a 12 meses. Departamentos amoblados y equipados, con un solo precio todo incluido, sin garantía inmobiliaria ni seguro de caución.',
         updated_at  = now()
   where slug = 'bairen';

  begin
    execute 'alter table portal.publicadores enable trigger trg_pub_verificacion';
  exception when others then null;
  end;
end $$;

-- ── 4 · El pase, filtrando por identificador y no por nombre ────────
-- Antes decía publicador_actual = 'BAIREN'. Con el cambio de nombre eso
-- dejaba de encontrar nada y el pase se volvía mudo, sin avisar.
create or replace function portal.pasar_avisos_a_duenos(
  p_por                 text    default null,
  p_verificados         boolean default false,
  p_incluir_reservados  boolean default false,
  p_solo_simular        boolean default true
) returns table (
  codigo        text,
  propietario   text,
  mail          text,
  accion        text
)
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  r        record;
  v_pub    uuid;
  v_slug   text;
  v_base   text;
  v_n      integer;
  v_nuevos jsonb := '{}'::jsonb;
  v_origen uuid;
begin
  select id into v_origen from portal.publicadores where slug = 'bairen';
  if v_origen is null then
    raise exception 'No existe el publicador de origen (slug bairen)';
  end if;

  if not p_solo_simular then
    begin
      execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os';
    exception when others then null;
    end;
  end if;

  for r in
    select d.* from portal.duenos_de_avisos() d
      join portal.avisos a on a.id = d.aviso_id
     where d.propietario_id is not null
       and (p_incluir_reservados or not d.reservado)
       and a.publicador_id = v_origen
  loop
    codigo := r.codigo; propietario := r.propietario_nombre; mail := r.propietario_email;

    v_pub := r.publicador_dueno_id;
    if v_pub is null then
      v_pub := nullif(v_nuevos ->> r.propietario_id::text, '')::uuid;
    end if;
    if v_pub is null then
      select id into v_pub from portal.publicadores where propietario_id = r.propietario_id limit 1;
    end if;

    if v_pub is null then
      v_base := lower(trim(r.propietario_nombre));
      v_base := translate(v_base, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
      v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
      v_base := trim(both '-' from v_base);
      if v_base = '' then v_base := 'dueno'; end if;
      v_slug := v_base; v_n := 1;
      while exists (select 1 from portal.publicadores where slug = v_slug) loop
        v_n := v_n + 1; v_slug := v_base || '-' || v_n;
      end loop;

      if p_solo_simular then
        accion := 'crearía el publicador "' || v_slug || '" y le pasaría este aviso'
                  || case when r.propietario_email is null then ' · SIN MAIL: no va a poder entrar a ver su panel' else '' end;
        v_nuevos := v_nuevos || jsonb_build_object(r.propietario_id::text, gen_random_uuid()::text);
        return next; continue;
      end if;

      insert into portal.publicadores (slug, tipo, nombre, email, telefono, whatsapp,
                                       propietario_id, verificado, verificado_en, badge)
      values (v_slug, 'dueno', r.propietario_nombre,
              r.propietario_email, r.propietario_tel, r.propietario_tel,
              r.propietario_id, p_verificados,
              case when p_verificados then now() else null end, 'Dueño verificado')
      returning id into v_pub;

      v_nuevos := v_nuevos || jsonb_build_object(r.propietario_id::text, v_pub::text);

      if p_verificados then
        insert into portal.verificaciones (publicador_id, tipo, resultado, revisado_por, nota)
        values (v_pub, 'titularidad', 'aprobada', p_por,
                'Titularidad controlada por el equipo de Bairen. Cargar el documento de respaldo en la ficha del publicador.');
      end if;
    else
      if p_solo_simular then
        accion := 'le pasaría este aviso al publicador que ya tiene'
                  || case when r.propietario_email is null then ' · SIN MAIL' else '' end;
        return next; continue;
      end if;
    end if;

    begin
      perform portal.traspasar_aviso(r.aviso_id, v_pub, p_por);
      accion := 'traspasado' || case when r.propietario_email is null then ' · SIN MAIL: cargarle el mail en el OS' else '' end;
    exception when others then
      accion := 'sin cambios: ' || SQLERRM;
    end;
    return next;
  end loop;

  if not p_solo_simular then
    begin
      execute 'alter table portal.avisos enable trigger trg_aviso_sincroniza_os';
    exception when others then null;
    end;
  end if;
end;
$$;

revoke all  on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) to service_role;

-- ── VERIFICACIÓN (correr después) ───────────────────────────────────
-- Tiene que devolver BAIREN REALTY, tipo gestor, y los tres curadores,
-- y los disparadores todos en 'O' (prendidos):
--
-- select slug, nombre, tipo, badge from portal.publicadores where slug = 'bairen';
-- select email from portal.curadores order by email;
-- select c.relname, t.tgname, t.tgenabled from pg_trigger t
--   join pg_class c on c.oid = t.tgrelid
--  where c.relnamespace = 'portal'::regnamespace
--    and c.relname in ('avisos','publicadores') and not t.tgisinternal
--  order by 1, 2;
