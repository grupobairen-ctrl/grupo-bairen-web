-- Tabla de leads de la encuesta PSI (correr una vez en Supabase → SQL Editor)
-- El navegador inserta con la anon key; nadie puede LEER los leads desde el cliente
-- (sin policy de select para anon). Se leen desde el dashboard de Supabase o con service key.

create table if not exists leads_psi (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  telefono text not null,
  respuestas jsonb not null default '{}'::jsonb,
  resumen text,
  origen text not null default 'encuesta-web',
  contactado boolean not null default false
);

alter table leads_psi enable row level security;

drop policy if exists "encuesta inserta" on leads_psi;
create policy "encuesta inserta" on leads_psi
  for insert to anon with check (origen = 'encuesta-web' or origen is null);
