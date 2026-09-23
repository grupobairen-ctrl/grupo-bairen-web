-- =====================================================================
-- BAIREN · Portal · Migración 18 · La cuenta con la que entra Bairen Realty
--
-- Decisión de Tomás del 23/9/2026: al panel de Bairen Realty se entra con
-- bairenrealty@gmail.com, no con grupobairen@gmail.com.
--
-- ANTES DE CORRER ESTE ARCHIVO hay que entrar UNA VEZ al portal con
-- bairenrealty@gmail.com:
--
--   https://portal.bairengroup.com/portal/ingresar.html
--
-- Se pone el mail, llega un código de ocho dígitos y se entra. Eso crea la
-- cuenta. Es de un minuto y no hace falta contraseña. Después se corre
-- esto, que la ata al publicador.
--
-- Por qué no se puede al revés: la cuenta no existe hasta que alguien
-- entra con ese mail, y este archivo no puede crearla (crear cuentas de
-- acceso desde SQL saltea la confirmación del mail, que es justamente lo
-- que prueba que la casilla es de quien dice).
--
-- Qué NO cambia:
--   · El mail de CONTACTO de Bairen Realty sigue siendo
--     realty@bairengroup.com. Ahí llegan las consultas de sus unidades.
--     El de ingreso y el de contacto son cosas distintas.
--   · grupobairen@gmail.com sigue siendo curador, así que conserva el
--     acceso a la pantalla de curación. Lo que pierde es el panel de
--     publicador de Bairen Realty, que pasa a la cuenta nueva.
--
-- Repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

do $$
declare
  v_uid uuid;
  v_pub uuid;
begin
  select id into v_uid from auth.users where lower(email) = 'bairenrealty@gmail.com';
  select id into v_pub from portal.publicadores where slug = 'bairen';

  if v_pub is null then
    raise exception 'No existe el publicador de Bairen Realty (slug bairen)';
  end if;

  if v_uid is null then
    raise exception 'La cuenta bairenrealty@gmail.com todavía no existe. Entrá una vez al portal con ese mail (ingresar.html, llega un código de ocho dígitos) y volvé a correr este archivo.';
  end if;

  update portal.publicadores
     set auth_user_id = v_uid,
         updated_at   = now()
   where id = v_pub
     and auth_user_id is distinct from v_uid;

  raise notice 'Bairen Realty ahora se entra con bairenrealty@gmail.com.';
end $$;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Tiene que devolver bairenrealty@gmail.com en la columna de ingreso, y
-- realty@bairengroup.com en la de contacto:
--
-- select p.slug, p.nombre, u.email as entra_con, p.email as contacto
--   from portal.publicadores p
--   left join auth.users u on u.id = p.auth_user_id
--  where p.slug = 'bairen';
