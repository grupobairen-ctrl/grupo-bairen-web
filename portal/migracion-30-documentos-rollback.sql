-- =====================================================================
-- BAIREN · Portal · Migración 30 · Vuelta atrás (documentos y firma electrónica)
--
-- Deja portal.documentos como en la migración 27. OJO: borra las firmas, los modelos y el texto de los documentos
-- armados en BAIREN (las filas de portal.documentos quedan, sin contenido ni huella). Si hay documentos firmados de
-- verdad, exportalos antes (select * from portal.documentos where contenido is not null; select * from portal.firmas).
-- =====================================================================

drop trigger if exists trg_documento_guarda on portal.documentos;

drop function if exists portal.generar_documento(uuid, text, jsonb);
drop function if exists portal.firmar_documento(uuid, text, text, text);
drop function if exists portal.anular_documento(uuid, text);
drop function if exists portal.documentos_de(uuid);
drop function if exists portal.documento_detalle(uuid);
drop function if exists portal.nueva_version_plantilla(text, text, text, text);
drop function if exists portal.trg_documento_guarda();
drop function if exists portal._identidad_ok();
drop function if exists portal._identidad_requerida();
drop function if exists portal._doc_fecha(date);
drop function if exists portal._doc_monto(numeric, text);
drop function if exists portal._doc_plazo(integer, integer);
drop function if exists portal._doc_txt(text, integer);
drop function if exists portal._doc_dni(text);

drop table if exists portal.firmas;

alter table portal.documentos drop constraint if exists m30_doc_hash;
alter table portal.documentos drop constraint if exists m30_doc_partes;
alter table portal.documentos drop constraint if exists m30_doc_textos;
alter table portal.documentos drop constraint if exists m30_doc_firmable;
alter table portal.documentos
  drop column if exists contenido,
  drop column if exists hash,
  drop column if exists plantilla_id,
  drop column if exists plantilla_tipo,
  drop column if exists plantilla_version,
  drop column if exists partes,
  drop column if exists datos,
  drop column if exists vence_en,
  drop column if exists anulado_en,
  drop column if exists motivo_anulacion;

drop table if exists portal.plantillas_documento;

-- pgcrypto queda: ya estaba instalada en Supabase y la usan otras partes.

notify pgrst, 'reload schema';

select 'sin firmas ni modelos' as control,
  (select count(*) from information_schema.tables where table_schema = 'portal' and table_name in ('plantillas_documento','firmas')) = 0 as ok
union all select 'documentos como en la 27', not exists (select 1 from information_schema.columns where table_schema = 'portal'
  and table_name = 'documentos' and column_name in ('contenido','hash','partes','vence_en'));
