-- =====================================================================
-- BAIREN · Portal · Migración 12 · El apellido no se publica entero
--
-- Decisión de Tomás del 23/9/2026: en el portal público el dueño directo
-- figura con su nombre y la inicial del apellido ("Adriana Maria P.").
-- El nombre completo sigue existiendo en el sistema de gestión, en
-- public.propietarios, que está bajo RLS y no se expone al público.
--
-- Por qué importa: hasta hoy el portal publicaba nombre y apellido
-- completos de trece personas, y esa fila la puede leer cualquiera con
-- la clave pública del portal, no solo quien mira la ficha. Es un dato
-- personal de un tercero expuesto sin necesidad.
--
-- Dónde queda el nombre completo: portal.publicadores.propietario_id
-- apunta a public.propietarios, así que el equipo lo tiene a un salto,
-- y la Console y el OS lo siguen mostrando entero.
--
-- Qué hace:
--   1. portal.nombre_publico(): la regla de abreviatura.
--   2. Abrevia los publicadores de tipo dueño que ya están creados.
--   3. El pase crea los nuevos ya abreviados.
--
-- NO toca el nombre de los gestores, inmobiliarias ni desarrolladoras:
-- esos son nombres comerciales, no datos personales.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · La regla ────────────────────────────────────────────────────
-- Todas las palabras menos la última quedan enteras; la última se
-- reduce a su inicial con punto. "Carlos de la Fuente" queda
-- "Carlos de la F.".
--
-- OJO, la limitación: la regla asume que el apellido va al final. Si un
-- propietario está cargado al revés ("Accrogliano Susana Beatriz"),
-- abrevia el nombre y deja el apellido entero, o sea lo contrario de lo
-- que queremos. Los que se carguen así hay que corregirlos en el OS.
create or replace function portal.nombre_publico(p_nombre text)
returns text
language sql immutable
as $$
  with palabras as (
    select w, i, count(*) over () as total
      from regexp_split_to_table(
             trim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g')), ' ')
           with ordinality as t(w, i)
     where w <> ''
  )
  select nullif(
    string_agg(
      case when i = total and total > 1 then upper(left(w, 1)) || '.' else w end,
      ' ' order by i), '')
  from palabras
$$;

comment on function portal.nombre_publico(text) is
  'Nombre para mostrar en el portal público: el apellido (última palabra) queda en su inicial. El nombre completo vive en public.propietarios, bajo RLS. Asume el apellido al final.';

-- ── 2 · Los trece que ya están publicados ───────────────────────────
-- Solo los de tipo dueño: un gestor o una inmobiliaria tienen nombre
-- comercial, que sí es público por definición.
update portal.publicadores p
   set nombre     = portal.nombre_publico(pr.nombre),
       updated_at = now()
  from public.propietarios pr
 where pr.id = p.propietario_id
   and p.tipo = 'dueno'
   and p.nombre is distinct from portal.nombre_publico(pr.nombre);

-- ── 3 · Los que se creen de ahora en más ────────────────────────────
-- Misma función del pase, con una sola línea distinta: el publicador se
-- crea con el nombre abreviado. El resto queda igual que en la 11.
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
  v_visible text;
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
    v_visible := portal.nombre_publico(r.propietario_nombre);
    codigo := r.codigo; propietario := v_visible; mail := r.propietario_email;

    v_pub := r.publicador_dueno_id;
    if v_pub is null then
      v_pub := nullif(v_nuevos ->> r.propietario_id::text, '')::uuid;
    end if;
    if v_pub is null then
      select id into v_pub from portal.publicadores where propietario_id = r.propietario_id limit 1;
    end if;

    if v_pub is null then
      -- El slug se arma del nombre completo: no se muestra, y así dos
      -- personas con el mismo nombre de pila no chocan entre ellas.
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
      values (v_slug, 'dueno', v_visible,
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

revoke all  on function portal.nombre_publico(text) from public, anon, authenticated;
grant execute on function portal.nombre_publico(text) to service_role, authenticated;
revoke all  on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) to service_role;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Tienen que salir los trece con la inicial, y ningún apellido entero:
-- select nombre from portal.publicadores where tipo = 'dueno' order by nombre;
--
-- Y el nombre completo tiene que seguir estando en el sistema:
-- select p.nombre as en_el_portal, pr.nombre as en_el_sistema
--   from portal.publicadores p
--   join public.propietarios pr on pr.id = p.propietario_id
--  where p.tipo = 'dueno' order by 2;
