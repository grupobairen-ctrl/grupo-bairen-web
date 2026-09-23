-- =====================================================================
-- BAIREN · Portal · Migración 13 · Bairen Realty comercializa, el dueño mira
--
-- Decisión de Tomás del 23/9/2026, pensada desde el mandato:
--   "los dueños directos nos confiaron a nosotros (Bairen Realty) para
--    comercializárselos, o sea no le podemos decir a ellos que vayan a
--    mostrarlo, para eso nos pagaron"
--
-- Es correcto, y corrige la decisión de ayer. Si el aviso figura a nombre
-- del dueño, la consulta le llega a él: se le deriva un trabajo que
-- contrató para no hacer, y Bairen pierde el control de su propia
-- operación. El pase de ayer se revierte.
--
-- Pero revertir a secas deja a los trece dueños sin ver nada, porque
-- dejarían de ser publicadores y no hay ningún otro vínculo: HOY SOLO 2
-- DE 42 AVISOS TIENEN CARGADO EL MAIL DEL PROPIETARIO. Por eso el orden
-- de abajo no es negociable: primero se ata el mail, después se revierte.
--
-- Con las dos cosas hechas queda el modelo que Tomás quiere:
--   · publica y atiende Bairen Realty (la consulta le llega a Bairen);
--   · el dueño entra con su mail y ve vistas, consultas y visitas de su
--     unidad, sin ser el que la publica ni el que atiende.
--
-- Qué NO hace, a propósito:
--   · No toca los avisos en venta. Esos van al perfil de Maxim
--     Propiedades, que necesita los datos de contacto de Maxi y va en
--     otro archivo.
--   · No convierte largo plazo en mediano plazo. Eso es un cambio de
--     producto y necesita el precio paquete de cada unidad, que todavía
--     no está.
--   · No borra los trece publicadores de dueño. Quedan sin avisos, y
--     sirven el día que un dueño quiera publicar por su cuenta.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · PRIMERO: atar cada aviso al mail de su propietario ──────────
-- Es lo que le da al dueño acceso a su panel sin ser el publicador.
-- Sale del OS (public.propietarios) por el puente que ya existe.
update portal.avisos a
   set propietario_email = portal.mail_limpio(pr.email),
       updated_at        = now()
  from public.propiedades p
  join public.propietarios pr on pr.id = p.propietario_id
 where p.id = a.propiedad_id
   and portal.mail_limpio(pr.email) is not null
   and a.propietario_email is distinct from portal.mail_limpio(pr.email);

-- Control: cuántos quedaron atados y cuántos no.
do $$
declare v_con integer; v_sin integer;
begin
  select count(propietario_email), count(*) - count(propietario_email)
    into v_con, v_sin from portal.avisos;
  raise notice 'Avisos con mail de propietario: %. Sin mail: %.', v_con, v_sin;
  raise notice 'Los que quedan sin mail son unidades cuyo dueño no está cargado en el OS, o lo tiene mal escrito.';
end $$;

-- ── 2 · DESPUÉS: devolver los avisos a Bairen Realty ────────────────
-- Usa la vuelta atrás que ya existe, así queda registrado que se
-- revirtió y quién lo hizo. Nada se borra: portal.traspasos guarda las
-- dos puntas de cada movimiento.
do $$
declare r record; v_n integer := 0;
begin
  -- El disparador que sincroniza con el OS se apaga mientras se mueve,
  -- por el mismo motivo que en el pase: no queremos que cada cambio de
  -- autoría cree o toque propiedades en el sistema de gestión.
  begin
    execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os';
  exception when others then null;
  end;

  for r in
    select t.id
      from portal.traspasos t
      join portal.publicadores po on po.id = t.publicador_anterior
     where t.revierte_a is null
       and po.slug = 'bairen'
       -- solo los que todavía no se revirtieron
       and not exists (select 1 from portal.traspasos v where v.revierte_a = t.id)
     order by t.created_at
  loop
    perform portal.revertir_traspaso(r.id, 'vuelta a Bairen Realty, decisión 23/9/2026');
    v_n := v_n + 1;
  end loop;

  begin
    execute 'alter table portal.avisos enable trigger trg_aviso_sincroniza_os';
  exception when others then null;
  end;

  raise notice 'Avisos devueltos a Bairen Realty: %.', v_n;
end $$;

-- ── VERIFICACIÓN (correr después) ───────────────────────────────────
-- Quién publica qué, y cuántos dueños pueden ver lo suyo:
--
-- select pub.nombre as publica, count(*) as avisos
--   from portal.avisos a join portal.publicadores pub on pub.id = a.publicador_id
--  group by 1 order by 2 desc;
--
-- select count(distinct propietario_email) as duenos_con_acceso from portal.avisos;
--
-- Y que el disparador haya quedado prendido ('O'):
-- select tgname, tgenabled from pg_trigger
--  where tgrelid = 'portal.avisos'::regclass and not tgisinternal;
