-- ════════════════════════════════════════════════════════════════════
-- Migración web 04 · Marca "con IA" por foto (5/10/2026)
--
-- El admin ofrece "Embellecer" en cada foto. Para no volver a mandar a la IA
-- (y pagar de nuevo) una foto que ya pasó por ella, cada fila de imagenes
-- guarda si ya está embellecida. El admin la escribe al guardar.
--
-- Al 5/10/2026 todas las fotos cargadas ya tienen IA, salvo las de
-- Arribeños 3758 1 (dato de Tomás): esas quedan en false.
--
-- Va ANTES de publicar el admin que lee con_ia: sin la columna, el admin
-- nuevo no carga el listado. Repetible. Vuelta atrás:
-- migracion-web-04-fotos-con-ia-rollback.sql
-- ════════════════════════════════════════════════════════════════════

alter table public.imagenes
  add column if not exists con_ia boolean not null default false;

update public.imagenes
   set con_ia = true
 where propiedad_id <> (select id from public.propiedades where slug = 'arribenos-3758-1');
