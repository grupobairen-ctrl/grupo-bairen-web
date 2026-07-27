-- =====================================================================
-- Agrega el "estado del filtro" a la tabla conversaciones (bot híbrido WhatsApp)
-- Correr una vez en: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

alter table conversaciones
  add column if not exists estado jsonb not null default '{}'::jsonb;
