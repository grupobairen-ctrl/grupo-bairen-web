-- =====================================================================
-- BAIREN · Portal · Migración 16 · Lo que no comercializamos, no se muestra
--
-- Decisión de Tomás del 23/9/2026: "lo que no sea de los barrios que
-- decimos que comercializamos, no los mostramos".
--
-- El problema que corrige: hay avisos marcados como PUBLICADOS cuyo
-- barrio no está en la lista de zonas del portal. El buscador los filtra
-- y no aparecen en ninguna búsqueda, pero la ficha abre igual y el aviso
-- figura publicado. O sea: el dueño cree que su unidad está publicada y
-- ningún inquilino la encuentra nunca. Es lo peor de los dos mundos.
--
-- Ahora quedan PAUSADOS, que es la verdad: no se muestran. Pausar y no
-- borrar, porque si mañana se suma el barrio se reactivan en un clic y
-- mientras tanto conservan sus fotos, sus vistas y sus consultas.
--
-- Las zonas son las mismas que BP.ZONAS en portal/js/ui.js. Si se suma
-- un barrio allá, hay que sumarlo acá, o volver a correr esto lo vuelve
-- a pausar.
--
-- ARRANCA EN MODO ENSAYO: la primera corrida solo muestra qué pausaría.
-- Para ejecutarlo de verdad hay que pasarle false.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

create or replace function portal.pausar_fuera_de_zona(
  p_solo_simular boolean default true
) returns table (
  codigo    text,
  direccion text,
  barrio    text,
  zona      text,
  accion    text
)
language plpgsql
security definer
set search_path = portal, public
as $$
declare
  r record;
  ZONAS text[] := array[
    'Palermo', 'Recoleta', 'Retiro', 'Belgrano', 'Núñez',
    'Colegiales', 'Villa Crespo', 'Puerto Madero', 'Saavedra', 'GBA Norte'
  ];
begin
  if not p_solo_simular then
    begin
      execute 'alter table portal.avisos disable trigger trg_aviso_sincroniza_os';
    exception when others then null;
    end;
  end if;

  for r in
    select a.id, a.codigo, a.direccion, a.barrio, a.zona
      from portal.avisos a
     where a.estado_curacion = 'publicado'
       and not (a.zona = any (ZONAS))
     order by a.zona, a.direccion
  loop
    codigo := r.codigo; direccion := r.direccion; barrio := r.barrio; zona := r.zona;

    if p_solo_simular then
      accion := 'pausaría: la zona "' || coalesce(r.zona, '(vacía)') || '" no está en la lista del portal';
    else
      update portal.avisos
         set estado_curacion = 'pausado',
             updated_at      = now()
       where id = r.id;
      accion := 'pausado';
    end if;
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

comment on function portal.pausar_fuera_de_zona(boolean) is
  'Pausa los avisos publicados cuya zona no está entre las que el portal comercializa. Arranca en ensayo. Las zonas tienen que coincidir con BP.ZONAS de portal/js/ui.js.';

revoke all  on function portal.pausar_fuera_de_zona(boolean) from public, anon, authenticated;
grant execute on function portal.pausar_fuera_de_zona(boolean) to service_role;

-- ── CÓMO SE USA ─────────────────────────────────────────────────────
-- Primero el ensayo, que no toca nada y te muestra la lista:
--   select * from portal.pausar_fuera_de_zona();
--
-- Si la lista está bien, de verdad:
--   select * from portal.pausar_fuera_de_zona(false);
--
-- Para reactivar una que se pausó de más, una por una:
--   update portal.avisos set estado_curacion = 'publicado'
--    where codigo = 'BA-LOQUESEA';
