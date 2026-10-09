-- Vuelta atrás de la migración 29 (identidad verificada y datos de quien ofrece).
-- Antes de correrla: si quedaron fotos en el bucket portal-identidad, borralas desde Supabase → Storage (la base no
-- deja borrar archivos con SQL). Con el bucket vacío, esto lo elimina; si no está vacío, el bucket queda (privado y sin
-- políticas: nadie lo lee) y se avisa.
-- Lo que se pierde: los pedidos de verificación y el estado de la identidad de cada persona. dni_verificado_en queda
-- como estaba (lo usaba ya portal.contacto_interesado). El domicilio legal de los publicadores se borra.
begin;

-- La vista pública vuelve a sus 17 columnas (para sacar columnas hay que recrearla)
drop view if exists portal.publicador_publico;
create view portal.publicador_publico as
select
  pb.id, pb.slug, pb.tipo, pb.nombre, pb.logo_url, pb.descripcion, pb.zonas, pb.badge, pb.verificado,
  pb.telefono, pb.whatsapp, pb.email,
  pe.id  as titular_id,
  trim(coalesce(pe.nombre, '') || ' ' || coalesce(pe.apellido, '')) as titular_nombre,
  pe.colegio as titular_colegio,
  pe.matricula as titular_matricula,
  (pe.matricula_verificada_en is not null) as titular_matricula_verificada
from portal.publicadores pb
left join lateral (
  select p.id, p.nombre, p.apellido, p.colegio, p.matricula, p.matricula_verificada_en
  from portal.membresias m join portal.personas p on p.id = m.persona_id
  where m.publicador_id = pb.id and m.rol = 'titular' and m.hasta is null
  order by m.desde limit 1
) pe on true
where pb.verificado;
grant select on portal.publicador_publico to anon, authenticated;

alter table portal.publicadores drop constraint if exists m29_pub_domicilio;
alter table portal.publicadores drop column if exists domicilio_legal;

drop function if exists portal.confirmar_borrado_identidad(uuid);
drop function if exists portal.resolver_verificacion(uuid, boolean, text);
drop function if exists portal.verificaciones_cola();
drop function if exists portal.solicitar_verificacion(text, text, text, text, text, text, boolean);
drop function if exists portal.mi_identidad();
drop function if exists portal.identidad_verificada(uuid);

drop policy if exists "m29 identidad sube el titular" on storage.objects;
drop policy if exists "m29 identidad lee la curacion" on storage.objects;
drop policy if exists "m29 identidad borra la curacion" on storage.objects;
do $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'portal-identidad') then
    raise notice 'El bucket portal-identidad todavía tiene archivos: queda (privado y sin políticas). Borralos desde Storage y eliminá el bucket a mano.';
  else
    perform set_config('storage.allow_delete_query', 'true', true);   -- el bucket está vacío: solo se borra su fila
    delete from storage.buckets where id = 'portal-identidad';
  end if;
exception when others then
  raise notice 'El bucket portal-identidad no se pudo eliminar con SQL (%). Eliminalo desde Supabase → Storage.', sqlerrm;
end $$;

drop trigger if exists trg_m29_identidad on portal.personas;
drop function if exists portal.m29_proteger_identidad();
drop table if exists portal.verificaciones_identidad;

alter table portal.personas drop constraint if exists m29_per_identidad;
alter table portal.personas drop constraint if exists m29_per_motivo;
alter table portal.personas drop column if exists identidad_estado;
alter table portal.personas drop column if exists identidad_verificada_en;
alter table portal.personas drop column if exists identidad_motivo;

notify pgrst, 'reload schema';
commit;
