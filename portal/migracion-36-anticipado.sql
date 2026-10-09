-- =====================================================================
-- BAIREN · Portal · Migración 36 · El acceso anticipado no le oculta el lanzamiento a quien lo publicó
--
-- 9/10/2026, integración de los rieles. La 34 hizo que los lanzamientos se vean primero para los miembros de la
-- Membresía Inversor y 48 h después para el resto. Faltaba que quien lo publicó (y la curación) lo vea siempre en
-- Explorar desde el momento en que se publica. Misma vista, mismas columnas; solo cambia esa condición.
-- Vuelta atrás: migracion-36-anticipado-rollback.sql (la vista como la dejó la 34).
-- =====================================================================
create or replace view portal.novedades as
 SELECT 'nuevo'::text AS tipo,
    a.id AS aviso_id,
    NULL::uuid AS publicacion_id,
    a.publicado_en AS fecha,
    NULL::numeric AS anterior,
    a.precio,
    a.moneda,
    NULL::text AS titulo,
    NULL::text AS texto,
    NULL::date AS entrega,
    a.publicador_id,
    NULL::timestamp with time zone AS visible_desde_publico,
    false AS anticipado
   FROM portal.avisos a
  WHERE a.estado_curacion = 'publicado'::text AND a.publicado_en > (now() - '45 days'::interval)
UNION ALL
 SELECT 'baja_precio'::text AS tipo,
    ph.aviso_id,
    NULL::uuid AS publicacion_id,
    ph.registrado_en AS fecha,
    ph.anterior,
    ph.precio,
    ph.moneda,
    NULL::text AS titulo,
    NULL::text AS texto,
    NULL::date AS entrega,
    a.publicador_id,
    NULL::timestamp with time zone AS visible_desde_publico,
    false AS anticipado
   FROM portal.precios_historial ph
     JOIN portal.avisos a ON a.id = ph.aviso_id AND a.estado_curacion = 'publicado'::text
  WHERE ph.anterior IS NOT NULL AND ph.precio < ph.anterior AND ph.registrado_en > (now() - '45 days'::interval)
UNION ALL
 SELECT p.tipo,
    p.aviso_id,
    p.id AS publicacion_id,
        CASE
            WHEN ( SELECT portal.es_miembro_inversor() AS es_miembro_inversor) OR portal.soy_publicador(p.publicador_id) OR portal.es_curador() THEN p.publicado_en
            ELSE GREATEST(p.publicado_en, v.desde)
        END AS fecha,
    NULL::numeric AS anterior,
    NULL::numeric AS precio,
    NULL::text AS moneda,
    p.titulo,
    p.texto,
    p.entrega,
    p.publicador_id,
    v.desde AS visible_desde_publico,
    v.desde > now() AS anticipado
   FROM portal.publicaciones p
     CROSS JOIN LATERAL ( SELECT COALESCE(p.visible_desde_publico, p.publicado_en +
                CASE
                    WHEN p.tipo = 'lanzamiento'::text THEN '48:00:00'::interval
                    ELSE '00:00:00'::interval
                END, p.creado_en) AS desde) v
  WHERE p.estado = 'publicada'::text AND (v.desde <= now() OR ( SELECT portal.es_miembro_inversor() AS es_miembro_inversor) OR portal.soy_publicador(p.publicador_id) OR portal.es_curador());

notify pgrst, 'reload schema';

select 'vista con la excepción del publicador' as control, pg_get_viewdef('portal.novedades'::regclass) like '%soy_publicador%' as ok;
