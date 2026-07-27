-- =====================================================================
-- TABLA: leads  — captura de interesados del chatbot de WhatsApp
-- ---------------------------------------------------------------------
-- Correr en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (es aditivo: no toca propiedades/imagenes/amenities)
-- =====================================================================

create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  nombre          text,
  telefono        text,
  whatsapp        text,
  propiedad_slug  text,
  zona            text,
  presupuesto     text,
  ambientes       text,
  notas           text,
  origen          text not null default 'whatsapp-bot',
  estado          text not null default 'nuevo'
                  check (estado in ('nuevo','contactado','visita','cerrado','descartado')),
  created_at      timestamptz not null default now()
);

create index if not exists leads_created_idx on leads(created_at desc);
create index if not exists leads_estado_idx  on leads(estado);

-- RLS: el bot inserta con la anon/publishable key; solo admins leen.
alter table leads enable row level security;

create policy "bot inserta leads"
  on leads for insert to anon
  with check (true);

create policy "admins ven leads"
  on leads for select to authenticated
  using (true);

create policy "admins editan leads"
  on leads for update to authenticated
  using (true) with check (true);
