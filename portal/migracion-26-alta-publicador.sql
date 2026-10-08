-- =====================================================================
-- BAIREN · Portal · Migración 26 · El alta y la edición de un publicador vuelven a andar
--
-- 8/10/2026. La página guarda el publicador con upsert on_conflict=auth_user_id (una cuenta, un publicador). En la base
-- la regla existía solo como índice PARCIAL (publicadores_auth_user_id_uniq ... where auth_user_id is not null), y
-- Postgres no lo acepta como destino de ON CONFLICT: cada alta o edición de perfil fallaba con 42P10 ("there is no
-- unique or exclusion constraint matching the ON CONFLICT specification"). Las simulaciones corrían en modo local y no
-- lo veían. Esta restricción UNIQUE común permite exactamente lo mismo (los publicadores sin cuenta, auth_user_id null,
-- siguen pudiendo ser varios: en un UNIQUE los null no chocan). Ensayada antes en una transacción deshecha: alta,
-- edición, persona y membresía. El índice parcial queda (redundante, no molesta). Vuelta atrás: el rollback.
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'publicadores_auth_user_id_key' and conrelid = 'portal.publicadores'::regclass) then
    alter table portal.publicadores add constraint publicadores_auth_user_id_key unique (auth_user_id);
  end if;
end $$;

select 'unique (auth_user_id) en publicadores' as control,
       exists (select 1 from pg_constraint where conname = 'publicadores_auth_user_id_key' and conrelid = 'portal.publicadores'::regclass) as ok;
