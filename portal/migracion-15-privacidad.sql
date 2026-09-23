-- =====================================================================
-- BAIREN · Portal · Migración 15 · URGENTE · Cerrar la fuga de datos
--
-- Hallazgo del 23/9/2026, verificado a mano contra la API en vivo:
-- cualquiera con la clave pública que está en el HTML del sitio baja de
-- un solo pedido los mails y teléfonos de trece personas físicas.
--
--   curl "https://<proyecto>.supabase.co/rest/v1/publicadores?select=*" \
--        -H "apikey: <la clave que está en supabase-portal.js>" \
--        -H "Accept-Profile: portal"
--   → 12 mails y 12 teléfonos de propietarios. Medido, no estimado.
--
-- Y lo que lo vuelve peor: la migración 12 abrevió el NOMBRE para no
-- publicar el apellido ("Veronica E."), pero el SLUG quedó con el
-- apellido entero ("veronica-escudero"), en la columna de al lado. La
-- anonimización quedó anulada por su vecina.
--
-- El detalle que lo hace evitable: **esas trece personas no se ven en
-- ninguna pantalla del portal.** El directorio solo lista publicadores
-- con avisos, y ninguno de los trece tiene. Se estaba exponiendo el dato
-- personal de trece personas para no mostrar absolutamente nada.
--
-- POR QUÉ ESTE ARREGLO Y NO OTRO: lo obvio sería quitarle a `anon` el
-- permiso de leer la tabla, o quitárselo columna por columna. Las dos
-- cosas son peligrosas: el catálogo trae al publicador embebido en la
-- misma consulta (`publicadores(*)`), así que sacar una columna hace
-- fallar el pedido entero y el portal se queda sin avisos. En cambio
-- achicar QUÉ FILAS se ven no toca ninguna consulta: las que se siguen
-- viendo vuelven completas, y las otras simplemente no están.
--
-- Aditiva y repetible. SUBIR el archivo, no pegarlo.
-- =====================================================================

-- ── 1 · El público solo ve publicadores que publican ────────────────
-- Antes: `using (verificado)` → toda fila verificada, tenga o no avisos.
-- Ahora: verificado Y con al menos un aviso publicado. Es exactamente lo
-- que el portal muestra, así que a la vista no cambia nada; lo que
-- desaparece son las trece filas dormidas que nadie veía y que estaban
-- regalando trece agendas de contacto.
drop policy if exists "publicadores visibles" on portal.publicadores;

create policy "publicadores visibles" on portal.publicadores
for select using (
  verificado
  and exists (
    select 1 from portal.avisos a
     where a.publicador_id = portal.publicadores.id
       and a.estado_curacion = 'publicado'
  )
);

comment on policy "publicadores visibles" on portal.publicadores is
  'El público ve un publicador solo si está verificado y tiene al menos un aviso publicado. Un publicador sin avisos no se muestra en ninguna pantalla, así que tampoco tiene por qué salir por la API con su mail y su teléfono.';

-- ── 2 · Los identificadores dejan de llevar el apellido ─────────────
-- El slug va en la dirección web del perfil, así que es público por
-- definición. Para una persona física se arma con el nombre y la inicial
-- del apellido, igual que el nombre visible, más un sufijo corto para
-- que dos personas que se llamen igual no choquen.
do $$
declare
  r      record;
  v_base text;
  v_slug text;
  v_n    integer;
  v_cambiados integer := 0;
begin
  for r in
    select p.id, p.slug, p.nombre
      from portal.publicadores p
     where p.tipo = 'dueno'
  loop
    -- del nombre YA abreviado ("Adriana Maria P.") → "adriana-maria-p"
    v_base := lower(trim(r.nombre));
    v_base := translate(v_base, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
    v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
    v_base := trim(both '-' from v_base);
    if v_base = '' then v_base := 'dueno'; end if;

    if r.slug = v_base then continue; end if;

    v_slug := v_base; v_n := 1;
    while exists (select 1 from portal.publicadores where slug = v_slug and id <> r.id) loop
      v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    end loop;

    update portal.publicadores set slug = v_slug, updated_at = now() where id = r.id;
    v_cambiados := v_cambiados + 1;
  end loop;

  raise notice 'Identificadores reescritos sin apellido: %.', v_cambiados;
end $$;

-- ── VERIFICACIÓN ────────────────────────────────────────────────────
-- 1) Ningún slug de persona física debe tener apellido entero:
-- select slug, nombre from portal.publicadores where tipo = 'dueno' order by slug;
--
-- 2) Y la prueba de fuego, desde afuera y sin sesión. En la Terminal:
--    curl -s "https://jdatlsrujgfmvyuhoffg.supabase.co/rest/v1/publicadores?select=email" \
--         -H "apikey: <la clave pública de supabase-portal.js>" \
--         -H "Accept-Profile: portal"
--    Antes devolvía 12 mails. Después tiene que devolver solo los de los
--    publicadores con avisos (hoy: BAIREN REALTY, y Maxim cuando publique),
--    que son casillas de empresa y están para que las usen.
--
-- 3) Y que el portal siga andando: abrir el catálogo y una ficha.
--    Si el catálogo queda vacío, revertir con:
--      drop policy if exists "publicadores visibles" on portal.publicadores;
--      create policy "publicadores visibles" on portal.publicadores
--        for select using (verificado);

-- =====================================================================
-- LO QUE ESTE ARCHIVO NO ARREGLA, y hay que decidir aparte:
--
--   a) portal.avisos.propietario_email queda legible para el público en
--      24 avisos. Es el mail del dueño atado a una dirección y un número
--      de unidad: identifica a una persona concreta. No se usa en ninguna
--      pantalla pública. El arreglo limpio es una vista de avisos sin esa
--      columna, y hay que probarlo porque el catálogo lee la tabla entera.
--
--   b) portal.publicadores.cuit del publicador 'bairen' es un CUIT que
--      empieza en 20, o sea de persona física, y sale por la API. No lo
--      toco porque no borro datos sin que me lo pidan, pero no tiene
--      ninguna razón de estar en una respuesta pública.
--
--   c) La vista portal.publicador_publico devuelve mail y teléfono con
--      grant a anon. Con el punto 1 de arriba deja de importar para los
--      trece dueños, pero la vista sigue siendo más generosa de lo que
--      hace falta.
-- =====================================================================
