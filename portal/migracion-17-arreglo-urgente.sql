-- =====================================================================
-- BAIREN · Portal · Migración 17 · URGENTE · Arreglo de la 15
--
-- CORRER YA. El portal está mostrando cero propiedades.
--
-- Qué pasó: la migración 15 puso esta regla sobre portal.publicadores
--
--   using (verificado and exists (select 1 from portal.avisos a
--            where a.publicador_id = publicadores.id ...))
--
-- El problema es que portal.avisos tiene su propia regla de seguridad
-- que a su vez mira portal.publicadores. Entonces para decidir si se
-- puede ver un publicador hay que leer los avisos, y para leer los
-- avisos hay que decidir si se puede ver el publicador: se llaman en
-- círculo hasta que Postgres corta con "stack depth limit exceeded".
-- Resultado: la lectura pública de avisos devuelve cero filas y el
-- catálogo queda vacío.
--
-- El arreglo: mover la consulta adentro de una función SECURITY
-- DEFINER. Una función así corre con los permisos de su dueño y no
-- vuelve a aplicar las reglas de fila, así que el círculo se corta.
-- Es la forma estándar de resolver esto en Postgres.
--
-- La privacidad se mantiene igual que en la 15: el público sigue viendo
-- solo publicadores verificados y con al menos un aviso publicado.
--
-- Repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · La consulta, fuera del círculo ──────────────────────────────
create or replace function portal.publicador_con_avisos(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = portal, public
as $$
  select exists (
    select 1 from portal.avisos a
     where a.publicador_id = p_id
       and a.estado_curacion = 'publicado'
  )
$$;

comment on function portal.publicador_con_avisos(uuid) is
  'Si un publicador tiene al menos un aviso publicado. Va en una función SECURITY DEFINER a propósito: llamada desde la política de portal.publicadores, evita la recursión con la política de portal.avisos, que fue lo que dejó el catálogo vacío el 23/9/2026.';

grant execute on function portal.publicador_con_avisos(uuid) to anon, authenticated, service_role;

-- ── 2 · La misma regla, sin el círculo ──────────────────────────────
drop policy if exists "publicadores visibles" on portal.publicadores;

create policy "publicadores visibles" on portal.publicadores
for select using (
  verificado and portal.publicador_con_avisos(id)
);

comment on policy "publicadores visibles" on portal.publicadores is
  'El público ve un publicador verificado y con al menos un aviso publicado. La comprobación va por portal.publicador_con_avisos() para no recursar contra la política de avisos.';

-- ── VERIFICACIÓN, y esta vez hay que hacerla ────────────────────────
-- 1) Tiene que devolver 35 y no 0:
--    select count(*) from portal.avisos where estado_curacion = 'publicado';
--
-- 2) Y lo que importa: que el catálogo vuelva a mostrar propiedades.
--    Abrir https://portal.bairengroup.com/portal/ y ver que haya avisos.
--
-- 3) Y que la privacidad siga cerrada, desde afuera y sin sesión:
--    los mails que devuelve la API tienen que ser solo los de las
--    cuentas de empresa, no los de los propietarios.
--
-- SI ALGO SIGUE MAL, la vuelta atrás que restaura el portal al instante
-- (reabre la fuga de datos, es solo para emergencia):
--   drop policy if exists "publicadores visibles" on portal.publicadores;
--   create policy "publicadores visibles" on portal.publicadores
--     for select using (verificado);
