-- =====================================================================
-- BAIREN · Portal · Migración 03 · El portal no tiene corredor
--
-- BAIREN es un portal. Las unidades que se migraron de bairengroup.com no las
-- publica ninguna inmobiliaria ni ningún corredor: las publica el portal mismo,
-- con el contacto del sitio. Esta migración deja la base así:
--   1. el publicador de la carga inicial pasa a ser 'bairen': nombre BAIREN,
--      badge "Selección BAIREN", sin responsable, matrícula ni colegio, con
--      contacto@bairengroup.com y el WhatsApp del sitio (+54 9 11 2310-6629).
--      Las consultas de esas unidades llegan a BAIREN.
--   2. la persona con matrícula que había dado de alta migracion-01 (paso 8.a)
--      se borra con sus membresías. Si tuviera cuenta, solo se le saca la
--      membresía con 'bairen' y se avisa para decidir a mano.
--   3. las descripciones de los avisos pierden la línea "Corredor responsable: ..."
--      en los tres idiomas.
--   4. un control final con los números que tienen que dar.
--
-- Acá no se escribe ni el slug viejo ni el nombre ni la matrícula, a propósito:
-- el vault no los conserva. Se reconoce lo viejo por su forma: la app siempre
-- crea publicadores y personas con auth_user_id (las políticas lo exigen), así
-- que el único publicador sin cuenta es el de la carga inicial y la única persona
-- con matrícula y sin cuenta es la que creó el backfill 8.a de migracion-01.
--
-- IMPORTANTE: SUBIR este archivo en el SQL Editor de Supabase del proyecto del
-- portal, NO pegarlo. Si se pega, los acentos del patrón y del badge se rompen.
--
-- Correr ANTES de seed-avisos-2026-09-10.sql, que busca el publicador 'bairen',
-- y antes de volver a correr schema-portal.sql en una base que ya existía.
--
-- Se puede correr más de una vez sin problema.
-- Generado el 2026-09-11.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. El publicador: el de la carga inicial pasa a ser 'bairen'. Si 'bairen' ya
--    existe, solo se aseguran sus valores y no se toca nada más.
-- ---------------------------------------------------------------------
do $p1$
declare v_id uuid; v_viejo uuid; v_sin_cuenta int; v_hay_trigger boolean;
begin
  select id into v_id from portal.publicadores where slug = 'bairen';
  if v_id is null then
    select count(*) into v_sin_cuenta from portal.publicadores where slug <> 'bairen' and auth_user_id is null;
    if v_sin_cuenta = 0 then
      raise notice 'paso 1: no hay publicador bairen ni publicador de la carga inicial. En una base nueva lo crea schema-portal.sql.';
      return;
    elsif v_sin_cuenta > 1 then
      raise notice 'paso 1: hay % publicadores sin cuenta y ninguno es bairen. No se renombra ninguno: decidir a mano.', v_sin_cuenta;
      return;
    end if;
    select id into v_id from portal.publicadores where slug <> 'bairen' and auth_user_id is null;
  else
    -- 'bairen' ya existe: se aseguran sus valores. Si además quedó el publicador
    -- de la carga inicial (schema-portal.sql nuevo corrido antes que esta
    -- migración), sus avisos, consultas, verificaciones, visitas y membresías
    -- pasan a 'bairen' y la fila vieja se borra: no puede quedar pública una
    -- fila con nombre y matrícula que el portal ya no muestra.
    select count(*) into v_sin_cuenta from portal.publicadores where slug <> 'bairen' and auth_user_id is null;
    if v_sin_cuenta = 1 then
      select id into v_viejo from portal.publicadores where slug <> 'bairen' and auth_user_id is null;
      update portal.avisos set publicador_id = v_id where publicador_id = v_viejo;
      update portal.consultas set publicador_id = v_id where publicador_id = v_viejo;
      if to_regclass('portal.verificaciones') is not null then
        execute 'update portal.verificaciones set publicador_id = $1 where publicador_id = $2' using v_id, v_viejo;
      end if;
      if to_regclass('portal.visitas_reservas') is not null then
        execute 'update portal.visitas_reservas set publicador_id = $1 where publicador_id = $2' using v_id, v_viejo;
      end if;
      if to_regclass('portal.operaciones') is not null then
        execute 'update portal.operaciones set publicador_id = $1 where publicador_id = $2' using v_id, v_viejo;
      end if;
      if to_regclass('portal.membresias') is not null then
        execute 'delete from portal.membresias where publicador_id = $1' using v_viejo;
      end if;
      delete from portal.publicadores where id = v_viejo;
      raise notice 'paso 1: bairen ya existía; el publicador de la carga inicial (%) se fusionó en bairen y se borró.', v_viejo;
    elsif v_sin_cuenta > 1 then
      raise notice 'paso 1: bairen ya existe y además hay % publicadores sin cuenta. No se tocan: decidir a mano a quién pertenecen los avisos migrados.', v_sin_cuenta;
    end if;
  end if;

  -- El disparador de la ola 3 (proteger_verificacion) no deja tocar matrícula,
  -- colegio, badge ni verificado si no hay un curador logueado, y desde el SQL
  -- Editor no lo hay. Se apaga solo mientras dura este update; si algo falla,
  -- la transacción vuelve todo atrás, el disparador incluido.
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'portal.publicadores'::regclass and tgname = 'trg_pub_verificacion' and not tgisinternal
  ) into v_hay_trigger;
  if v_hay_trigger then execute 'alter table portal.publicadores disable trigger trg_pub_verificacion'; end if;

  update portal.publicadores set
    slug          = 'bairen',
    tipo          = 'inmobiliaria',
    nombre        = 'BAIREN',
    responsable   = null,
    matricula     = null,
    colegio       = null,
    badge         = 'Selección BAIREN',
    email         = 'contacto@bairengroup.com',
    whatsapp      = '5491123106629',
    telefono      = null,
    verificado    = true,
    verificado_en = coalesce(verificado_en, now())
  where id = v_id;

  if v_hay_trigger then execute 'alter table portal.publicadores enable trigger trg_pub_verificacion'; end if;
  raise notice 'paso 1: publicador bairen listo (id %).', v_id;
end
$p1$;

-- ---------------------------------------------------------------------
-- 2. La persona con matrícula que había creado migracion-01, y sus membresías.
--    Solo si migracion-01 corrió en este proyecto (existen personas y membresias).
-- ---------------------------------------------------------------------
do $p2$
declare v_pub uuid; r record; v_col text;
begin
  if to_regclass('portal.personas') is null or to_regclass('portal.membresias') is null then
    raise notice 'paso 2: sin portal.personas en este proyecto (migracion-01 no corrió acá): nada que borrar.';
    return;
  end if;
  select id into v_pub from portal.publicadores where slug = 'bairen';

  for r in
    select p.id, p.auth_user_id, p.nombre
    from portal.personas p
    where (p.auth_user_id is null and (p.matricula is not null or p.colegio is not null))
       or (v_pub is not null and p.auth_user_id is not null
           and exists (select 1 from portal.membresias m where m.persona_id = p.id and m.publicador_id = v_pub))
  loop
    if r.auth_user_id is not null then
      -- Tiene cuenta: solo se le saca la membresía con bairen. La persona queda.
      delete from portal.membresias where persona_id = r.id and publicador_id = v_pub;
      raise notice 'paso 2: la persona % (%) tiene cuenta. Se le sacó la membresía con bairen y queda en la base: decidir a mano qué hacer con ella.', r.id, r.nombre;
      continue;
    end if;

    -- Sin cuenta: la creó el backfill 8.a de migracion-01. Antes de borrarla se
    -- sueltan las referencias que no tienen cascade, solo si esas columnas existen.
    if to_regclass('portal.consultas') is not null and exists (
      select 1 from information_schema.columns
      where table_schema = 'portal' and table_name = 'consultas' and column_name = 'referido_por'
    ) then
      execute 'update portal.consultas set referido_por = null where referido_por = $1' using r.id;
    end if;
    if to_regclass('portal.operaciones') is not null then
      for v_col in
        select column_name from information_schema.columns
        where table_schema = 'portal' and table_name = 'operaciones'
          and column_name in ('corredor_id', 'referido_por', 'contraparte_id')
      loop
        execute format('update portal.operaciones set %I = null where %I = $1', v_col, v_col) using r.id;
      end loop;
    end if;
    delete from portal.membresias where persona_id = r.id;   -- el cascade lo haría igual; queda explícito
    delete from portal.personas where id = r.id;
    raise notice 'paso 2: persona sin cuenta % borrada con sus membresías.', r.id;
  end loop;
end
$p2$;

-- ---------------------------------------------------------------------
-- 3. Las descripciones: fuera la línea del corredor, en los tres idiomas.
--    Solo se tocan las filas que la tienen, y al resultado se le recortan los
--    espacios, tabs y saltos que quedan al final.
-- ---------------------------------------------------------------------
do $p3$
declare
  re constant text := $re$(^|\n+)[ \t]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel)\s*:[^\n]*$re$;
  n int;
begin
  update portal.avisos set descripcion = rtrim(regexp_replace(descripcion, re, '', 'gi'), E' \t\r\n')
  where descripcion ~* re;
  get diagnostics n = row_count;
  raise notice 'paso 3: descripcion, % avisos corregidos.', n;

  update portal.avisos set descripcion_en = rtrim(regexp_replace(descripcion_en, re, '', 'gi'), E' \t\r\n')
  where descripcion_en ~* re;
  get diagnostics n = row_count;
  raise notice 'paso 3: descripcion_en, % avisos corregidos.', n;

  update portal.avisos set descripcion_pt = rtrim(regexp_replace(descripcion_pt, re, '', 'gi'), E' \t\r\n')
  where descripcion_pt ~* re;
  get diagnostics n = row_count;
  raise notice 'paso 3: descripcion_pt, % avisos corregidos.', n;
end
$p3$;

-- ---------------------------------------------------------------------
-- 4. Control: los números que tienen que dar.
-- ---------------------------------------------------------------------
do $p4$
declare
  re constant text := $re$(^|\n+)[ \t]*(Corredor responsable|Responsible broker|Corretor respons[aá]vel)\s*:[^\n]*$re$;
  n_bairen int; n_sin_cuenta int; n_avisos_ajenos int; n_personas int := 0; n_lineas int;
begin
  select count(*) into n_bairen from portal.publicadores where slug = 'bairen';
  select count(*) into n_sin_cuenta from portal.publicadores where slug <> 'bairen' and auth_user_id is null;
  select count(*) into n_avisos_ajenos
  from portal.avisos a join portal.publicadores p on p.id = a.publicador_id
  where a.propiedad_id is not null and p.slug <> 'bairen';
  if to_regclass('portal.personas') is not null then
    execute 'select count(*) from portal.personas where auth_user_id is null and (matricula is not null or colegio is not null)' into n_personas;
  end if;
  select count(*) into n_lineas from portal.avisos
  where descripcion ~* re or descripcion_en ~* re or descripcion_pt ~* re;

  raise notice 'control: publicadores bairen = % (debe ser 1)', n_bairen;
  raise notice 'control: publicadores sin cuenta que no son bairen (el slug viejo) = % (debe ser 0)', n_sin_cuenta;
  raise notice 'control: avisos migrados de bairengroup.com que no son de bairen = % (debe ser 0)', n_avisos_ajenos;
  raise notice 'control: personas con matrícula y sin cuenta = % (debe ser 0)', n_personas;
  raise notice 'control: avisos con la línea del corredor en algún idioma = % (debe ser 0)', n_lineas;
end
$p4$;

commit;

-- Control a mano, después de correr:
-- select slug, tipo, nombre, responsable, matricula, colegio, badge, email, whatsapp, telefono, verificado, auth_user_id
--   from portal.publicadores order by created_at;
-- select codigo, left(descripcion, 80) from portal.avisos
--   where descripcion ~* 'corredor responsable' or descripcion_en ~* 'responsible broker' or descripcion_pt ~* 'corretor respons';
-- select id, nombre, apellido, colegio, matricula, auth_user_id from portal.personas where auth_user_id is null;
