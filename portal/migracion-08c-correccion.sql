-- =====================================================================
-- BAIREN · Portal · Migración 08c · Tres arreglos vistos en el ensayo real
--
-- Correr DESPUÉS de la 08 y la 08b.
--
-- ARREGLO 1 (grave) · el mismo dueño se creaba dos veces.
--   En el ensayo del 22/9, Adriana Maria Porcel salió en dos avisos
--   (Anchorena y Guido) y las dos filas decían "crearía el publicador".
--   El pase recorre una lista que se arma UNA vez al principio, así que
--   la segunda vuelta no se entera de que ya lo creó y habría hecho un
--   segundo publicador "adriana-maria-porcel-2". El nombre tampoco sirve
--   como llave: dos personas se pueden llamar igual.
--   Solución: portal.publicadores gana una columna propietario_id que
--   apunta al propietario del OS, con único. Es la llave de verdad, y
--   además deja el pase repetible sin riesgo.
--
-- ARREGLO 2 · los nombres van a salir publicados como están cargados.
--   El ensayo devolvió "Alan gil", "Veronica escudero", "Carlos de la
--   fuente", "Viviana Dafne brujis". Eso es lo que iba a ver cualquiera
--   que entre a la ficha. Se normaliza para mostrar, respetando las
--   partículas en minúscula (de, del, la, los, y). El dato del OS no se
--   toca: solo se acomoda el nombre con el que se publica.
--
-- ARREGLO 3 · el ensayo no decía si el dueño tiene mail.
--   Sin mail no puede entrar a ver su panel ni recibir el resumen
--   semanal, que es todo el punto. Ahora la salida lo avisa.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · La llave de verdad entre publicador y propietario ───────────
alter table portal.publicadores add column if not exists propietario_id uuid;

create unique index if not exists publicadores_propietario_uidx
  on portal.publicadores(propietario_id) where propietario_id is not null;

comment on column portal.publicadores.propietario_id is
  'Propietario del OS (public.propietarios) detrás de este publicador, cuando es un dueño directo. Es la llave que evita crear dos publicadores para la misma persona. El nombre no sirve: dos personas se pueden llamar igual.';

-- ── 2 · Nombre para mostrar ─────────────────────────────────────────
create or replace function portal.nombre_propio(p_nombre text)
returns text
language sql immutable
as $$
  select nullif(trim(coalesce(
    (select string_agg(
       case when i > 1 and lower(w) in ('de','del','la','las','los','y','da','do','dos','van','von')
            then lower(w)
            else upper(left(w, 1)) || lower(substr(w, 2))
       end, ' ' order by i)
     from regexp_split_to_table(trim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g')), ' ')
          with ordinality as t(w, i)
     where w <> ''), '')), '')
$$;

comment on function portal.nombre_propio(text) is
  'Acomoda un nombre para publicarlo: "alan gil" queda "Alan Gil", y las partículas (de, del, la) quedan en minúscula. No toca el dato del OS.';

-- ── 3 · La lista de trabajo, atando por propietario ─────────────────
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
    nullif(trim(pr.email), ''), nullif(trim(pr.telefono), ''),
    pd.id,
    (pr.nombre is not null and a.estado = 'disponible')
  from portal.avisos a
  join portal.publicadores pa on pa.id = a.publicador_id
  left join public.propiedades  p  on p.id  = a.propiedad_id
  left join public.propietarios pr on pr.id = p.propietario_id
  -- Por propietario_id, que es la llave. El cruce por nombre queda solo
  -- para las filas creadas antes de que existiera la columna.
  left join portal.publicadores pd
         on pd.tipo = 'dueno'
        and (pd.propietario_id = pr.id
             or (pd.propietario_id is null
                 and lower(trim(pd.nombre)) = lower(trim(portal.nombre_propio(pr.nombre)))))
  order by pr.nombre nulls last, a.codigo;
$$;

-- ── 4 · El pase, sin duplicar y avisando quién no tiene mail ────────
-- El DROP no es opcional: esta versión devuelve una columna más que la de
-- la 08b (el mail del dueño), y Postgres no deja cambiarle la forma a una
-- función que ya existe. Da "cannot change return type of existing
-- function" si se intenta con create or replace a secas.
drop function if exists portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean);

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
  r      record;
  v_pub  uuid;
  v_slug text;
  v_base text;
  v_n    integer;
  v_nuevos jsonb := '{}'::jsonb;   -- propietarios creados en ESTA corrida
begin
  if not p_solo_simular then
    begin
      execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os';
    exception when others then null;
    end;
  end if;

  for r in
    select * from portal.duenos_de_avisos()
     where propietario_id is not null
       and (p_incluir_reservados or not reservado)
       and publicador_actual = 'BAIREN'
  loop
    codigo := r.codigo; propietario := r.propietario_nombre; mail := r.propietario_email;

    -- 1) el que ya tenía  2) el que creamos recién en esta misma corrida
    --    3) uno vivo en la tabla (por si la lista quedó vieja)  4) se crea
    v_pub := r.publicador_dueno_id;
    if v_pub is null then
      v_pub := nullif(v_nuevos ->> r.propietario_id::text, '')::uuid;
    end if;
    if v_pub is null then
      select id into v_pub from portal.publicadores
       where propietario_id = r.propietario_id limit 1;
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
        -- en el ensayo también se recuerda, así el segundo aviso del mismo
        -- dueño ya no dice "crearía" por segunda vez
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
                'Titularidad controlada por el equipo de Bairen antes del pase del 22/9/2026. Cargar el documento de respaldo en la ficha del publicador.');
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

revoke all  on function portal.duenos_de_avisos() from public, anon, authenticated;
grant execute on function portal.duenos_de_avisos() to service_role;
revoke all  on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) from public, anon, authenticated;
grant execute on function portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean) to service_role;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Volver a correr el ensayo: ahora Adriana tiene que aparecer una sola
-- vez con "crearía" y la otra con "le pasaría este aviso al publicador
-- que ya tiene", y los nombres tienen que verse bien escritos.
-- select * from portal.pasar_avisos_a_duenos('tomas@bairengroup.com');
