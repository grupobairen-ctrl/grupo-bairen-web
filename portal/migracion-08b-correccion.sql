-- =====================================================================
-- BAIREN · Portal · Migración 08b · Dos correcciones a la 08
--
-- Correr DESPUÉS de migracion-08-duenos-autoria.sql. Reemplaza dos
-- funciones; no crea tablas ni toca datos.
--
-- CORRECCIÓN 1 · atar_avisos_por_direccion() daba
--   "column p.unidad does not exist".
--   public.propiedades no tiene columna de unidad: la unidad viene
--   dentro del texto de la dirección ("Cabildo 2890 (4 B)"). El script
--   sql/008-aviso-propiedad.sql del OS ya resolvió esto con
--   portal.unidad_de_propiedad() y portal.clave_unidad(). Ahora se usan
--   esas, así los dos scripts no pueden discrepar. Además se acota la
--   búsqueda al tenant 'bairen', que es de quien son estas unidades.
--
-- CORRECCIÓN 3 · el pase no distinguía de quién era el aviso: recorría
--   TODOS los avisos con propietario. El día que Maxi o una inmobiliaria
--   estén adentro, correrlo les habría sacado sus avisos. Ahora toca
--   solo los que publica BAIREN.
--
-- CORRECCIÓN 2 · el pase disparaba la sincronización con el OS.
--   El disparador trg_aviso_sincroniza_os (de la 008) se activa cuando
--   cambia publicador_id, y crea o vincula una propiedad en el OS DE ESA
--   CUENTA. O sea que pasar los 24 avisos a sus dueños habría creado 24
--   cuentas nuevas en el OS, cada una con una copia de la propiedad,
--   despegadas de los contratos y pagos que Bairen ya tiene cargados.
--   No es lo que queremos: el dueño ve su unidad desde el panel del
--   propietario, no necesita una copia propia. Ahora el pase apaga ese
--   disparador mientras trabaja y lo vuelve a prender al terminar. Si
--   algo falla, la transacción revierte todo, incluido el apagado.
--
-- Generada el 22/9/2026 después del error real en el SQL Editor.
-- =====================================================================

-- ── 1 · Atar por dirección, con la unidad sacada del texto ──────────
create or replace function portal.atar_avisos_por_direccion(
  p_solo_simular boolean default true
) returns table (
  codigo       text,
  direccion    text,
  propiedad    uuid,
  propietario  text,
  accion       text
)
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  r        record;
  v_prop   uuid;
  v_due    text;
  v_clave  text;
  v_unidad text;
  v_cuantas integer;
begin
  if to_regprocedure('portal.clave_edificio(text)') is null
     or to_regprocedure('portal.unidad_de_propiedad(text)') is null then
    raise exception 'Faltan las funciones de dirección: correr antes sql/008-aviso-propiedad.sql del repo del OS';
  end if;

  for r in
    select a.id, a.codigo, a.direccion, a.unidad
      from portal.avisos a
      join portal.publicadores pub on pub.id = a.publicador_id and pub.slug = 'bairen'
      left join public.propiedades p on p.id = a.propiedad_id
     where p.id is null
       and coalesce(trim(a.direccion), '') <> ''
  loop
    v_clave  := portal.clave_edificio(r.direccion);
    v_unidad := portal.clave_unidad(r.unidad);

    -- Cuántas propiedades hay en ese edificio, en la cuenta de Bairen
    select count(*) into v_cuantas
      from public.propiedades q
     where q.tenant_id = 'bairen'
       and portal.clave_edificio(q.direccion) = v_clave;

    -- Misma unidad; o el edificio tiene una sola y alguno de los dos no la indica.
    -- Es el mismo criterio de la 008, para no inventar uno nuevo.
    select p.id, pr.nombre into v_prop, v_due
      from public.propiedades p
      left join public.propietarios pr on pr.id = p.propietario_id
     where p.tenant_id = 'bairen'
       and portal.clave_edificio(p.direccion) = v_clave
       and (portal.unidad_de_propiedad(p.direccion) = v_unidad
            or (v_cuantas = 1 and (v_unidad = '' or portal.unidad_de_propiedad(p.direccion) = '')))
     order by p.direccion
     limit 1;

    codigo := r.codigo; direccion := r.direccion; propiedad := v_prop; propietario := v_due;

    if v_prop is null then
      accion := case when v_cuantas = 0
                     then 'no hay ninguna propiedad en ese edificio: queda en BAIREN'
                     else 'hay ' || v_cuantas || ' en el edificio y ninguna coincide con la unidad "' || coalesce(r.unidad,'') || '": revisar a mano' end;
    elsif p_solo_simular then
      accion := 'ataría' || case when v_due is null then ' (la propiedad no tiene propietario cargado en el OS)' else '' end;
    else
      update portal.avisos set propiedad_id = v_prop, updated_at = now() where id = r.id;
      accion := 'atado' || case when v_due is null then ' (falta cargarle el propietario en el OS)' else '' end;
    end if;
    return next;
  end loop;
end;
$$;

-- ── 2 · El pase, sin disparar la sincronización con el OS ───────────
create or replace function portal.pasar_avisos_a_duenos(
  p_por                 text    default null,
  p_verificados         boolean default false,
  p_incluir_reservados  boolean default false,
  p_solo_simular        boolean default true
) returns table (
  codigo        text,
  propietario   text,
  accion        text
)
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  r      record;
  v_pub  uuid;
  v_slug text;
  v_base text;
  v_n    integer;
begin
  -- Mientras movemos la autoría, el disparador que sincroniza con el OS
  -- se apaga: si no, cada dueño terminaría con una cuenta nueva en el OS
  -- y una copia suelta de su propiedad. Si algo falla, la transacción
  -- revierte todo, incluido este apagado.
  if not p_solo_simular then
    begin
      execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os';
    exception when others then null;   -- si el disparador no existe, seguimos
    end;
  end if;

  for r in
    select * from portal.duenos_de_avisos()
     where propietario_id is not null
       and (p_incluir_reservados or not reservado)
       -- SOLO los que publica BAIREN. Sin esto, el día que Maxi o una
       -- inmobiliaria estén adentro, correr el pase les sacaría los avisos
       -- y se los pondría a nombre del propietario de cada unidad.
       and publicador_actual = 'BAIREN'
  loop
    v_pub := r.publicador_dueno_id;

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
        codigo := r.codigo; propietario := r.propietario_nombre;
        accion := 'crearía el publicador "' || v_slug || '" y le pasaría este aviso';
        return next; continue;
      end if;

      insert into portal.publicadores (slug, tipo, nombre, email, telefono, whatsapp,
                                       verificado, verificado_en, badge)
      values (v_slug, 'dueno', r.propietario_nombre,
              r.propietario_email, r.propietario_tel, r.propietario_tel,
              p_verificados, case when p_verificados then now() else null end,
              'Dueño verificado')
      returning id into v_pub;

      if p_verificados then
        insert into portal.verificaciones (publicador_id, tipo, resultado, revisado_por, nota)
        values (v_pub, 'titularidad', 'aprobada', p_por,
                'Titularidad controlada por el equipo de Bairen antes del pase del 22/9/2026. Cargar el documento de respaldo en la ficha del publicador.');
      end if;
    end if;

    if p_solo_simular then
      codigo := r.codigo; propietario := r.propietario_nombre;
      accion := 'le pasaría este aviso al publicador que ya tiene';
      return next; continue;
    end if;

    begin
      perform portal.traspasar_aviso(r.aviso_id, v_pub, p_por);
      codigo := r.codigo; propietario := r.propietario_nombre; accion := 'traspasado';
    exception when others then
      codigo := r.codigo; propietario := r.propietario_nombre; accion := 'sin cambios: ' || SQLERRM;
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

revoke all  on function portal.atar_avisos_por_direccion(boolean) from public, anon, authenticated;
grant execute on function portal.atar_avisos_por_direccion(boolean) to service_role;
revoke all  on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) to service_role;

-- ── VERIFICACIÓN: que el disparador quedó PRENDIDO ──────────────────
-- Tiene que devolver 'O' (origin = activo). Si devuelve 'D', está apagado
-- y hay que prenderlo con:
--   alter table portal.avisos enable trigger trg_aviso_sincroniza_os;
--
-- select tgname, tgenabled from pg_trigger
--  where tgrelid = 'portal.avisos'::regclass and not tgisinternal;
