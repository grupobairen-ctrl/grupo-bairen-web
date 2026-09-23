-- =====================================================================
-- BAIREN · Portal · Migración 14 · Maxim Propiedades, y el panel de Bairen Realty
--
-- Correr DESPUÉS de la 11. Tres cosas, todas del 23/9/2026:
--
--   1. Bairen Realty no tenía NINGUNA cuenta atada, así que nadie podía
--      entrar a su panel a manejar sus avisos. Por eso Tomás no
--      encontraba dónde dar de baja una unidad. Se ata a
--      grupobairen@gmail.com, que ya existe y es el curador.
--
--   2. Se crea MAXIM PROPIEDADES, la inmobiliaria matriculada de Maxi.
--      Ahí van los avisos en venta, que hasta hoy los publicaba BAIREN
--      sin matrícula: publicar una venta y atender al interesado sin
--      matrícula es justo lo que el marco legal del vault marca como no
--      se puede.
--
--   3. Austria 1938 unidad 10 (venta) se PAUSA: Bairen ya no la tiene.
--      Pausar y no borrar, porque si vuelve se reactiva en un clic y
--      mientras tanto conserva sus vistas y consultas.
--
-- Nota sobre el sello de Maxim: el disparador de verificación fuerza
-- 'no verificado' en toda alta nueva, y está bien. Maxi se verifica
-- desde la pantalla de curación, y ahí SÍ hay que mirar su matrícula
-- contra el registro público de CUCICBA, que para un corredor no es un
-- trámite: es lo que el badge promete.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · El panel de Bairen Realty, con dueño ────────────────────────
update portal.publicadores p
   set auth_user_id = u.id,
       updated_at   = now()
  from auth.users u
 where u.email = 'grupobairen@gmail.com'
   and p.slug = 'bairen'
   and p.auth_user_id is null;

-- ── 2 · Maxim Propiedades ───────────────────────────────────────────
insert into portal.publicadores
  (slug, tipo, nombre, responsable, matricula, colegio, email, telefono, whatsapp, badge, zonas, descripcion)
values
  ('maxim-propiedades', 'profesional', 'Maxim Propiedades',
   'Maximiliano Matzkin', '7527', 'CUCICBA',
   'info@maximpropiedades.com.ar', '+54 9 11 2565 3312', '5491125653312',
   'Corredor inmobiliario matriculado',
   '{}', 'Inmobiliaria matriculada. Venta y alquiler de propiedades en Buenos Aires.')
on conflict (slug) do update
   set email     = excluded.email,
       telefono  = excluded.telefono,
       whatsapp  = excluded.whatsapp,
       updated_at = now();

-- ── 3 · Las ventas van a Maxim, y Austria se pausa ──────────────────
do $$
declare
  v_maxim uuid;
  r       record;
  v_n     integer := 0;
begin
  select id into v_maxim from portal.publicadores where slug = 'maxim-propiedades';

  -- El disparador que sincroniza con el OS se apaga mientras se mueve:
  -- Maxim no tiene cuenta en el sistema de gestión y no queremos que se
  -- le cree una sola porque le pasamos un aviso.
  begin
    execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os';
  exception when others then null;
  end;

  -- Austria 1938 unidad 10: Bairen ya no la tiene. Se pausa, no se borra.
  update portal.avisos
     set estado_curacion = 'pausado',
         updated_at      = now()
   where operacion = 'venta'
     and direccion ilike '%Austria%1938%'
     and estado_curacion <> 'pausado';

  -- El resto de las ventas pasan a Maxim, con registro del movimiento.
  for r in
    select a.id, a.codigo
      from portal.avisos a
      join portal.publicadores pub on pub.id = a.publicador_id and pub.slug = 'bairen'
     where a.operacion = 'venta'
       and a.estado_curacion <> 'pausado'
  loop
    perform portal.traspasar_aviso(
      r.id, v_maxim, 'tomas',
      'Venta: la publica el corredor matriculado, no el gestor (decisión 23/9/2026)');
    v_n := v_n + 1;
  end loop;

  begin
    execute 'alter table portal.avisos enable trigger trg_aviso_sincroniza_os';
  exception when others then null;
  end;

  raise notice 'Ventas pasadas a Maxim Propiedades: %.', v_n;
end $$;

-- ── VERIFICACIÓN (correr después) ───────────────────────────────────
-- Quién publica qué:
-- select pub.nombre as publica, a.operacion, a.estado_curacion, count(*)
--   from portal.avisos a join portal.publicadores pub on pub.id = a.publicador_id
--  group by 1,2,3 order by 1,2;
--
-- Que Bairen Realty ya tenga cuenta para entrar al panel:
-- select p.slug, u.email from portal.publicadores p
--   join auth.users u on u.id = p.auth_user_id where p.slug = 'bairen';
--
-- Y el disparador prendido ('O'):
-- select tgname, tgenabled from pg_trigger
--  where tgrelid = 'portal.avisos'::regclass and not tgisinternal;
