-- =====================================================================
-- BAIREN · Portal · Rollback de la migración 08
--
-- OJO: esto saca las herramientas, NO devuelve los avisos a BAIREN.
-- Para devolver los avisos hay que revertir cada traspaso ANTES de
-- correr esto, con la función que este mismo archivo elimina:
--
--   select portal.revertir_traspaso(id, 'rollback')
--     from portal.traspasos
--    where revierte_a is null
--    order by created_at desc;
--
-- La tabla portal.traspasos NO se borra a propósito: es la pista de
-- auditoría de quién movió qué. Borrarla es perder la prueba.
-- =====================================================================

drop function if exists portal.atar_avisos_por_direccion(boolean);
drop function if exists portal.vincular_publicador_por_email();
drop function if exists portal.pasar_avisos_a_duenos(text, boolean, boolean, boolean);
drop function if exists portal.duenos_de_avisos();
drop function if exists portal.revertir_traspaso(uuid, text);
drop function if exists portal.traspasar_aviso(uuid, uuid, text, text);

-- La tabla queda. Para sacarla también (perdiendo la auditoría), a mano:
-- drop table if exists portal.traspasos;
