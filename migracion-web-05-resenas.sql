-- ════════════════════════════════════════════════════════════════════
-- Migración web 05 · Reseñas de clientes (15/10/2026)
--
-- La portada muestra, debajo del hero, las reseñas de inquilinos y
-- propietarios, y cualquiera puede dejar la suya desde ahí (o desde el
-- link bairengroup.com/resena que el equipo manda por WhatsApp).
--
-- Cómo se protege:
--   · Lo que llega desde la web entra como 'pendiente'. Nadie de afuera
--     puede publicar, verificar ni responder.
--   · El público lee solo las publicadas y solo las columnas públicas:
--     el teléfono o email (contacto) y el apellido completo nunca salen.
--   · El equipo (usuario logueado del admin; el alta de usuarios está
--     cerrada) confirma que es cliente y publica desde admin-resenas.html.
--
-- Las cinco reseñas que ya rotaban en la home entran como 'historico',
-- publicadas y verificadas (son clientes que el equipo conoce), SIN
-- estrellas: nunca las calificaron con estrellas y no se inventan.
--
-- Repetible. Vuelta atrás: migracion-web-05-resenas-rollback.sql
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.resenas (
  id              uuid primary key default gen_random_uuid(),
  creada_en       timestamptz not null default now(),
  nombre          text not null check (char_length(btrim(nombre)) between 2 and 40),
  apellido        text check (apellido is null or char_length(btrim(apellido)) <= 40),
  -- lo único del nombre que se publica: "Catalina M."
  nombre_publico  text generated always as (
                    btrim(nombre) ||
                    case when coalesce(btrim(apellido), '') <> ''
                         then ' ' || upper(left(btrim(apellido), 1)) || '.'
                         else '' end
                  ) stored,
  rol             text not null check (rol in ('inquilino','inquilina','propietario','propietaria')),
  estrellas       smallint check (estrellas between 1 and 5),   -- null solo en las históricas
  texto           text not null check (char_length(btrim(texto)) between 20 and 2000),
  barrio          text check (barrio is null or char_length(barrio) <= 40),
  idioma          text not null default 'es' check (idioma in ('es','pt','en')),
  traducciones    jsonb,                                        -- {"pt": "...", "en": "..."}
  contacto        text check (contacto is null or char_length(contacto) <= 120),  -- privado
  estado          text not null default 'pendiente' check (estado in ('pendiente','publicada','rechazada')),
  verificada      boolean not null default false,
  respuesta       text check (respuesta is null or char_length(respuesta) <= 1000),
  publicada_en    timestamptz,
  origen          text not null default 'web' check (origen in ('web','historico'))
);

create index if not exists resenas_estado_idx on public.resenas (estado, publicada_en desc);

alter table public.resenas enable row level security;

-- Columnas: el público solo escribe lo del formulario y solo lee lo público.
revoke all on public.resenas from anon, authenticated;
grant insert (nombre, apellido, rol, estrellas, texto, barrio, idioma, contacto)
  on public.resenas to anon;
grant select (id, creada_en, nombre_publico, rol, estrellas, texto, barrio, idioma,
              traducciones, verificada, respuesta, publicada_en, origen)
  on public.resenas to anon;
grant all on public.resenas to authenticated;

drop policy if exists "resenas: el publico deja la suya"      on public.resenas;
drop policy if exists "resenas: el publico lee las publicadas" on public.resenas;
drop policy if exists "resenas: el equipo maneja todo"         on public.resenas;

create policy "resenas: el publico deja la suya" on public.resenas
  for insert to anon
  with check (estado = 'pendiente' and verificada = false and respuesta is null
              and publicada_en is null and origen = 'web' and estrellas is not null);

create policy "resenas: el publico lee las publicadas" on public.resenas
  for select to anon
  using (estado = 'publicada');

create policy "resenas: el equipo maneja todo" on public.resenas
  for all to authenticated
  using (true) with check (true);

-- ── Las cinco históricas (vault: Testimonios Reales) ────────────────
-- creada_en escalonada para conservar el orden en que rotaban.
insert into public.resenas
  (creada_en, nombre, apellido, rol, estrellas, texto, idioma, traducciones,
   estado, verificada, origen)
select v.creada_en::timestamptz, v.nombre, v.apellido, v.rol, null, v.texto, 'es',
       jsonb_build_object('pt', v.pt, 'en', v.en), 'publicada', true, 'historico'
from (values
  ('2026-08-19 12:00:05-03', 'Marcela', 'R', 'propietaria',
   'La verdad, nos solucionaron todo. Respondieron todas las dudas sin importar la hora. Nos dieron la confianza que necesitábamos. Son unos genios.',
   'Resolveram tudo para nós, de verdade. Responderam todas as dúvidas a qualquer hora. Nos deram a confiança que precisávamos. Vocês são geniais.',
   'They truly solved everything for us. They answered every question no matter the hour. They gave us the confidence we needed. They are brilliant.'),
  ('2026-08-19 12:00:04-03', 'Tadeo', 'T', 'inquilino',
   'Hasta la fecha son los que mejor trato me han dado. Más que sorprendido y agradecido.',
   'Até hoje são os que melhor atendimento me deram. Mais que surpreendido e agradecido.',
   'To this day they have given me the best treatment. More than surprised and grateful.'),
  ('2026-08-19 12:00:03-03', 'Oscar', null, 'propietario',
   'Muy satisfecho con la atención y el trabajo. Nunca tuve ningún problema, y los recomendaría sin dudar.',
   'Muito satisfeito com a atenção e o trabalho. Nunca tive nenhum problema, e os recomendaria sem hesitar.',
   'Very satisfied with the attention and the work. I never had a single problem, and I would recommend them without hesitation.'),
  ('2026-08-19 12:00:02-03', 'Catalina', null, 'inquilina',
   'Mi experiencia ha sido excelente. Estuvieron pendientes de todo el proceso: desde la coordinación para ver el departamento, mostrarnos varias veces, hasta el proceso de reserva, súper sencillo. Ahora que ya estamos en el departamento también han sido un apoyo cuando tuvimos dudas.',
   'Minha experiência foi excelente. Estiveram atentos a todo o processo: desde a coordenação para ver o apartamento, nos mostrar várias vezes, até o processo de reserva, super simples. Agora que já estamos no apartamento também têm sido um apoio quando tivemos dúvidas.',
   'My experience has been excellent. They were on top of the whole process: from coordinating the viewing, showing us the apartment several times, to the reservation process, super simple. Now that we are in the apartment they have also been a support whenever we had questions.'),
  ('2026-08-19 12:00:01-03', 'María Eugenia', null, 'inquilina',
   'Quiero compartir mi excelente experiencia con BAIREN durante el alquiler de la primera vivienda de mi hija. Desde el primer momento recibimos una atención profesional, clara y cercana. Quiero destacar especialmente el trabajo de Julián y de todo su equipo, que estuvieron siempre disponibles para responder nuevas consultas, acompañarnos en cada etapa del proceso y hacer que todo fuera ágil, simple y transparente. Una vez iniciado el contrato, el acompañamiento continuó: se preocuparon por hacer un seguimiento para saber si estaba todo bien en la vivienda y si mi hija necesitaba algo, un gesto que demuestra un verdadero compromiso con las personas y no solo con la operación. Saber que la primera experiencia de mi hija alquilando su propio hogar estuvo acompañada por un equipo tan comprometido nos dio mucha tranquilidad. Sin dudas recomiendo a BAIREN a quienes busquen una inmobiliaria seria, confiable y con una atención de excelencia.',
   'Quero compartilhar minha excelente experiência com o BAIREN durante o aluguel da primeira moradia da minha filha. Desde o primeiro momento recebemos um atendimento profissional, claro e próximo. Quero destacar especialmente o trabalho de Julián e de toda a sua equipe, que estiveram sempre disponíveis para responder novas consultas, nos acompanhar em cada etapa do processo e fazer com que tudo fosse ágil, simples e transparente. Uma vez iniciado o contrato, o acompanhamento continuou: se preocuparam em fazer um seguimento para saber se estava tudo bem na moradia e se minha filha precisava de algo, um gesto que demonstra um verdadeiro compromisso com as pessoas e não só com a operação. Saber que a primeira experiência da minha filha alugando o próprio lar esteve acompanhada por uma equipe tão comprometida nos deu muita tranquilidade. Sem dúvidas recomendo o BAIREN a quem busca uma imobiliária séria, confiável e com um atendimento de excelência.',
   'I want to share my excellent experience with BAIREN during the rental of my daughter''s first home. From the very first moment we received professional, clear and warm attention. I especially want to highlight the work of Julián and his whole team, who were always available to answer new questions, walk with us through every stage of the process and make everything agile, simple and transparent. Once the contract started, the support continued: they followed up to make sure everything was fine in the home and whether my daughter needed anything, a gesture that shows a true commitment to people and not just to the deal. Knowing that my daughter''s first experience renting her own home was accompanied by such a committed team gave us great peace of mind. I recommend BAIREN without hesitation to anyone looking for a serious, trustworthy agency with excellent service.')
) as v(creada_en, nombre, apellido, rol, texto, pt, en)
where not exists (select 1 from public.resenas r where r.origen = 'historico' and r.nombre = v.nombre);
