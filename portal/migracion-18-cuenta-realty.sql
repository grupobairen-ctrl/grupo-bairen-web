-- =====================================================================
-- BAIREN · Portal · Migración 18 · Bairen Realty pasa a bairenrealty@gmail.com
--
-- Decisión de Tomás del 23/9/2026: para Bairen Realty, **el mismo mail
-- para las dos cosas**: con el que se entra al panel, y el que ven los
-- interesados para escribirle por sus propiedades.
--
--   bairenrealty@gmail.com
--
-- realty@bairengroup.com deja de existir y sale de todos lados.
-- portal@bairengroup.com queda como el contacto del PORTAL: legales,
-- privacidad, ayuda y membresía. Son dos cosas distintas.
--
-- ═══ ANTES DE CORRER, un paso de un minuto ═══
-- Entrá UNA VEZ al portal con bairenrealty@gmail.com:
--
--   https://portal.bairengroup.com/portal/ingresar.html
--
-- Se pone el mail, llega un código de ocho dígitos a esa casilla, se
-- entra. Eso crea la cuenta. No hace falta contraseña.
--
-- Por qué no lo puede hacer este archivo: crear una cuenta de acceso
-- desde SQL saltea la confirmación del mail, que es justamente lo que
-- prueba que la casilla es de quien dice ser.
--
-- Si se corre sin haber entrado, el archivo avisa y no toca nada.
--
-- Qué NO cambia: grupobairen@gmail.com sigue siendo curador y conserva
-- la pantalla de curación, que es donde se aprueban avisos y se
-- verifican publicadores. Lo que pasa a la cuenta nueva es el panel de
-- publicador de Bairen Realty. Son dos accesos distintos y está bien
-- que lo sean.
--
-- Repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

do $$
declare
  v_uid uuid;
  v_pub uuid;
begin
  select id into v_pub from portal.publicadores where slug = 'bairen';
  if v_pub is null then
    raise exception 'No existe el publicador de Bairen Realty (slug bairen)';
  end if;

  -- ── 1 · El mail de contacto que ven los interesados ───────────────
  -- El disparador de verificación no protege esta columna, así que no
  -- hace falta apagarlo.
  update portal.publicadores
     set email      = 'bairenrealty@gmail.com',
         updated_at = now()
   where id = v_pub
     and email is distinct from 'bairenrealty@gmail.com';

  -- ── 2 · La cuenta con la que se entra al panel ────────────────────
  select id into v_uid from auth.users where lower(email) = 'bairenrealty@gmail.com';

  if v_uid is null then
    raise notice 'El mail de contacto quedó actualizado.';
    raise exception 'Falta el paso de un minuto: entrá una vez a portal.bairengroup.com/portal/ingresar.html con bairenrealty@gmail.com (llega un código de ocho dígitos) y volvé a correr este archivo. Hasta entonces, al panel se sigue entrando con grupobairen@gmail.com.';
  end if;

  update portal.publicadores
     set auth_user_id = v_uid,
         updated_at   = now()
   where id = v_pub
     and auth_user_id is distinct from v_uid;

  raise notice 'Listo: Bairen Realty entra y recibe consultas en bairenrealty@gmail.com.';
end $$;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- Las dos columnas tienen que decir bairenrealty@gmail.com:
--
-- select p.slug, p.nombre, u.email as entra_con, p.email as contacto
--   from portal.publicadores p
--   left join auth.users u on u.id = p.auth_user_id
--  where p.slug = 'bairen';
--
-- Y que no quede ninguna mención al mail viejo:
-- select count(*) from portal.publicadores where email like '%realty@bairengroup%';
