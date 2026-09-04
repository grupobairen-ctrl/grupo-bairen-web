-- =====================================================================
-- BAIREN · Portal · carga inicial de las unidades
--
-- Se usa cuando el portal vive en su propio proyecto de Supabase y por lo tanto
-- no puede copiarlas de public.propiedades, que está en el proyecto de la web.
-- Generado el 2026-09-04 desde portal/data/avisos-src.json,
-- con la misma lógica de portal/js/data.js: el título se arma con dirección y unidad,
-- las amenities se normalizan y la portada va primera.
--
-- Pasos: SQL Editor -> pegar todo -> Run. Se puede correr más de una vez.
-- Requiere haber corrido antes portal/schema-portal.sql.
--
-- Las fotos se sirven del depósito público del proyecto de la web. Son URLs
-- públicas, así que funcionan desde acá. Si algún día se borra ese proyecto,
-- hay que mover los archivos primero.
-- =====================================================================

do $seed$
declare v_pub uuid; v_aviso uuid;
begin
  select id into v_pub from portal.publicadores where slug = 'maxim-rentals';
  if v_pub is null then
    raise exception 'falta el publicador maxim-rentals: corré antes portal/schema-portal.sql';
  end if;

  -- Niceto Vega 5720 · 4º · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-NICETOVEGA57204M', 'niceto-vega-5720-4', v_pub, '55e465c4-4fc8-4878-acc9-6f07da3f8cb5', 'mediano', 'Niceto Vega 5720 · 4º', 'Niceto Vega 5720', '4º', 'Palermo Hollywood', 'Palermo Hollywood', 850, 34, 34, 1, 1, 1, true, '{}'::text[], 'Monoambiente en el edificio Terre, a metros de Bonpland. Piso 4, con pileta en el rooftop y gimnasio con vista. Todo incluido.

Niceto Vega 5720, en el tramo alto de Palermo Hollywood: la gastronomía de Bonpland y Fitz Roy a la vuelta, Honduras a tres cuadras y Av. Córdoba a una. El Mercado de las Pulgas queda a pocas cuadras por Niceto Vega.

Los 34 m² están bien resueltos: un ventanal de piso a techo con vista abierta a la ciudad, la cama contra la pared larga y la cocina integrada al fondo, con una mesa de madera clara para comer o trabajar. Pisos símil madera en tono claro, muebles de cocina color topo y mesada blanca. Amoblado y equipado, listo para entrar.

• Ambiente principal con cama queen, respaldo tapizado y TV
• Cocina integrada con anafe, horno, microondas y cafetera
• Mesa de madera con sillas, para comer o trabajar
• Dos sillones de ratán y escritorio
• Placard en el ingreso
• Baño completo con mesada larga y revestimiento gris de gran formato
• Aire acondicionado frío/c', 'Studio apartment in the Terre building, a few meters from Bonpland. Floor 4, with a pool on the rooftop and gym with a view. All inclusive.

Niceto Vega 5720, in the upper section of Palermo Hollywood: the gastronomy of Bonpland and Fitz Roy around the corner, Honduras three blocks away and Av. Córdoba one block away. The Flea Market is a few blocks away on Niceto Vega.

The 34 m² are well resolved: a floor-to-ceiling window with an open view of the city, the bed against the long wall and the kitchen integrated in the back, with a light wooden table for eating or working. Light wood-look floors, taupe kitchen furniture and white countertops. Furnished and equipped, ready to move in.

• Main room with queen bed, upholstered backrest and TV
• Integrated kitchen with stove, oven, microwave and coffee maker
• Wooden table with chairs, for eating or working
• Two rattan armchairs and desk
• Closet at the entrance
• Full bathroom with long countertop and large-format gray coating
• Air conditioning cold/c', 'Apartamento estúdio no edifício Terre, a poucos metros de Bonpland. Piso 4, com piscina na cobertura e ginásio com vista. Tudo incluído.

Niceto Vega 5720, na parte alta de Palermo Hollywood: a gastronomia de Bonpland e Fitz Roy na esquina, Honduras a três quarteirões e Av. Córdoba a um quarteirão de distância. O Mercado de Pulgas fica a poucos quarteirões de Niceto Vega.

Os 34 m² são bem resolvidos: janela do chão ao teto com vista aberta para a cidade, a cama encostada na longa parede e a cozinha integrada nos fundos, com mesa de madeira clara para comer ou trabalhar. Pisos de madeira clara, móveis de cozinha cinza e bancadas brancas. Mobilado e equipado, pronto a habitar.

• Quarto principal com cama queen-size, encosto estofado e TV
• Cozinha integrada com fogão, forno, micro-ondas e cafeteira
• Mesa de madeira com cadeiras, para comer ou trabalhar
• Duas poltronas e mesa de vime
• Armário na entrada
• Banheiro completo com bancada longa e revestimento cinza de grande formato
• Ar condicionado frio/c', null, null, '3-12 meses', 'disponible', 'publicado', '2026-09-03T18:22:31.367474+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-NICETOVEGA57204M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/portada-catalogo-1788459934816.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/portada-catalogo-1788459934816.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-1-1788459751379.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-1-1788459751379.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-2-1788459752399.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-2-1788459752399.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-3-1788459752956.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-3-1788459752956.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-4-1788459753616.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-4-1788459753616.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-5-1788459754245.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-5-1788459754245.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-6-1788459754960.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5720-4/foto-6-1788459754960.jpg');

  -- Uruguay 390 · 18 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-URUGUAY39018M', 'uruguay-390-18', v_pub, 'de406578-ae63-4064-b88d-18deeba55e5c', 'mediano', 'Uruguay 390 · 18', 'Uruguay 390', '18', 'Centro', 'Centro', 1200, 60, 60, 3, 2, 1, true, '{}'::text[], null, null, null, null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-28T15:08:33.255595+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-URUGUAY39018M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/portada-catalogo-1787929997454.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/portada-catalogo-1787929997454.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-3-1787954943262.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-3-1787954943262.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-4-1787954943979.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-4-1787954943979.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-1-1787955190885.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-1-1787955190885.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-2-1787954942562.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-2-1787954942562.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-5-1787954944672.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-5-1787954944672.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-6-1787954945321.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-6-1787954945321.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-7-1787954945912.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-7-1787954945912.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-8-1787954946503.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-8-1787954946503.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-9-1787954947195.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-9-1787954947195.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-10-1787954947783.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-10-1787954947783.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-11-1787954948445.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-11-1787954948445.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-12-1787954949023.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-390-18/foto-12-1787954949023.jpg');

  -- Huergo 475 · 0709 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-HUERGO4750709M', 'huergo-475-0709', v_pub, 'c5230e76-503f-4e2b-9ebf-4a343b8f623c', 'mediano', 'Huergo 475 · 0709', 'Huergo 475', '0709', 'Puerto Madero', 'Puerto Madero', 1800, 52, 52, 2, 1, 1, true, '{}'::text[], '*Incluye mobiliario.
Dos ambientes en Huergo 475, la torre de Consultatio diseñada por el estudio Adamo-Faiden, entre San Telmo y Puerto Madero. Piso 7.

La unidad fue intervenida por una interiorista con una idea simple: que el departamento continúe los tonos del edificio. El verde de la fachada reaparece en la mesa del comedor, en el mural del dormitorio y en las venecitas del baño; el techo de hormigón visto y la carpintería negra completan la paleta. Amoblado y equipado, listo para entrar.

• Living comedor con mesa para cuatro y balcón integrado
• Dormitorio con mural en verdes y cobre
• Baño completo con ducha y mampara de vidrio
• Balcón con mesa bistró
• Aire acondicionado frío/calor y TV

El edificio funciona como una pequeña ciudad:
• Pileta climatizada en altura, con techo vidriado
• Sky garden con parrillas y miradores en el piso 38
• Biblioteca, coworking y gimnasio
• Wellness con sauna y sala de masajes
• Espacio comunitario en doble altura en el piso 36', 'Two rooms in Huergo 475, the Consultatio tower designed by the Adamo-Faiden studio, between San Telmo and Puerto Madero. 7th floor, on Venezuela Street.

The unit was intervened by an interior designer with a simple idea: that the apartment continue the tones of the building. The green of the façade reappears on the dining room table, on the bedroom mural and on the bathroom veneers; The exposed concrete ceiling and black carpentry complete the palette. Furnished and equipped, ready to move in.

• Living room with table for four and integrated balcony
• Bedroom with green and copper mural
• Full bathroom with shower and glass screen
• Balcony with bistro table
• Hot/cold air conditioning and TV

The building works like a small city:
• Heated pool in height, with glass roof
• Sky garden with grills and viewing points on the 38th floor
• Library, coworking and gym
• Wellness with sauna and massage room
• Double-height community space on the 36th floor
• AC hall', 'Dois quartos em Huergo 475, a torre Consultatio projetada pelo estúdio Adamo-Faiden, entre San Telmo e Puerto Madero. 7º andar, na Rua Venezuela.

A unidade foi intervencionada por um designer de interiores com uma ideia simples: que o apartamento continuasse com os tons do edifício. O verde da fachada reaparece na mesa da sala de jantar, no mural do quarto e nas folheadas do banheiro; O teto de concreto aparente e a carpintaria preta completam a paleta. Mobilado e equipado, pronto a habitar.

• Sala com mesa para quatro pessoas e varanda integrada
• Quarto com mural verde e cobre
• Banheiro completo com chuveiro e tela de vidro
• Varanda com mesa bistrô
• Ar-condicionado quente/frio e TV

O edifício funciona como uma pequena cidade:
• Piscina aquecida em altura, com cobertura de vidro
• Jardim panorâmico com churrasqueiras e mirantes no 38º andar
• Biblioteca, coworking e academia
• Bem-estar com sauna e sala de massagem
• Espaço comunitário de pé direito duplo no 36º andar
• Hall AC', null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-28T12:54:45.961577+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-HUERGO4750709M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/portada-catalogo-1787922859947.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/portada-catalogo-1787922859947.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-1-1787921952971.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-1-1787921952971.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-2-1787921954200.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-2-1787921954200.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-3-1787921954814.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-3-1787921954814.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-4-1787921955535.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-4-1787921955535.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-5-1787921956203.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-5-1787921956203.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-6-1787921956980.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-6-1787921956980.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-7-1787921957785.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-7-1787921957785.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-8-1787921958369.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-8-1787921958369.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-9-1787921958842.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-9-1787921958842.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-10-1787921959459.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-10-1787921959459.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-11-1787921961222.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-11-1787921961222.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-12-1787921961983.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-12-1787921961983.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-13-1787921962592.jpg', 13 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-13-1787921962592.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-14-1787921963441.jpg', 14 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-14-1787921963441.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-15-1787921964749.jpg', 15 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-15-1787921964749.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-16-1787921965462.jpg', 16 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/huergo-475-0709/foto-16-1787921965462.jpg');

  -- Paraguay 4419 · PB · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-PARAGUAY4419PBM', 'paraguay-4419-pb', v_pub, '53c64bed-5626-4f43-906c-94ac82cc50ac', 'mediano', 'Paraguay 4419 · PB', 'Paraguay 4419', 'PB', 'Palermo', 'Palermo', 1000, 52, 52, 2, 1, 1, true, array['Ascensor','Amoblado','Pet friendly','Terraza o jardín']::text[], 'Planta baja reciclada a nuevo en el corazón de Palermo, con un patio propio de piedras y ladrillo visto rodeado de plantas — un rincón al aire libre difícil de encontrar en plena ciudad, conectado directo al comedor por una puerta vidriada.

Los 52 m² están bien resueltos: living-comedor con la cocina semi-integrada detrás de una barra de madera, dormitorio con parquet de roble y placard de espejos, y un baño renovado por completo en microcemento azul, con ducha a ras de piso y bacha sobre madera.

Amoblado y equipado, con aire acondicionado. Acepta mascotas.

Alquiler a mediano plazo, de 3 a 12 meses, el precio publicado incluye expensas y servicios.', 'Newly renovated ground floor in the heart of Palermo, with its own patio made of stones and exposed brick surrounded by plants — an outdoor corner that is difficult to find in the heart of the city, connected directly to the dining room through a glass door.

The 52 m² are well resolved: living-dining room with a semi-integrated kitchen behind a wooden bar, a bedroom with oak parquet and a mirrored closet, and a bathroom completely renovated in blue microcement, with a walk-in shower and a wooden sink.

Furnished and equipped, with air conditioning. Accepts pets.

Medium-term rental, from 3 to 12 months, the published price includes expenses and services.', 'Rés-do-chão recentemente remodelado no coração de Palermo, com pátio próprio de pedras e tijolos à vista rodeado de plantas - um recanto exterior difícil de encontrar no coração da cidade, ligado directamente à sala de jantar através de uma porta de vidro.

Os 52 m² estão bem resolvidos: sala de jantar com cozinha semi-integrada atrás de balcão de madeira, quarto com parquet de carvalho e armário espelhado e banheiro totalmente reformado em microcimento azul, com box amplo e pia de madeira.

Mobilado e equipado, com ar condicionado. Aceita animais de estimação.

Aluguer de média duração, de 3 a 12 meses, o preço publicado inclui despesas e serviços.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-25T16:09:27.972532+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-PARAGUAY4419PBM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/portada-catalogo-1787674629826.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/portada-catalogo-1787674629826.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-3-1787674169638.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-3-1787674169638.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-1-1787674168016.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-1-1787674168016.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-2-1787674168938.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-2-1787674168938.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-4-1787674170189.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-4-1787674170189.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-5-1787674170972.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-5-1787674170972.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-6-1787674171701.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-6-1787674171701.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-7-1787674172258.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-7-1787674172258.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-8-1787674172932.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-8-1787674172932.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-9-1787674173500.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-4419-pb/foto-9-1787674173500.jpg');

  -- Arce 223 · 4C · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-ARCE2234CM', 'arce-223-4c', v_pub, '8e5be7c4-e442-4e44-87c5-39994525ab35', 'mediano', 'Arce 223 · 4C', 'Arce 223', '4C', 'Las Cañitas', 'Las Cañitas', 1400, 75, 75, 2, 1, 1, true, array['Pileta','Ascensor','Seguridad 24hs','Terraza o jardín','Aire acondicionado','Pet friendly','Laundry','Amoblado','SUM']::text[], 'Vista al Campo de Polo desde el piso 4, en el corazón de Las Cañitas. Todo incluido, precio final.

Unidad en Arce 223, muy luminosa, con orientación este y ventilación cruzada. La gastronomía de Báez a la vuelta, y Av. del Libertador y Luis María Campos a pocas cuadras: uno de los puntos más buscados de la actualidad.

75 m² totales, amoblados y equipados:
• Living comedor con vista al polo
• Dormitorio con baño en suite
• Balcón cerrado al contrafrente con vista a la piscina y al campo argentino de polo.

• Calefacción por losa radiante
• Caldera individual (agua caliente y calefacción propias, sin depender del edificio)

Amenities:
• Pileta
• SUM

Todo incluido, precio final: alquiler, expensas y gastos en un solo paquete.', 'View of the Polo Field from the 4th floor, in the heart of Las Cañitas. All included, final price.

Unit in Arce 223, very bright, facing east and cross ventilation. The gastronomy of Báez around the corner, and Av. del Libertador and Luis María Campos a few blocks away: one of the most sought after spots today.

75 m² total, furnished and equipped:
• Living room with views of the pole
• Bedroom with en-suite bathroom
• Closed balcony to the quiet part of the building with views of the pool and the Argentine polo field.

• Underfloor heating
• Individual boiler (own hot water and heating, without depending on the building)

Amenities:
• Pool
• SUM

All included, final price: rent, bills for utilities (gas, electricity etc.) and expenses in one package.', 'Vista do Campo de Pólo desde o 4º andar, no coração de Las Cañitas. Tudo incluído, preço final.

Unidade no Arce 223, muito luminosa, voltada para nascente e ventilação cruzada. A gastronomia de Báez ao virar da esquina e a Av. del Libertador e Luis María Campos a poucos quarteirões de distância: um dos lugares mais procurados da atualidade.

75 m² totais, mobiliados e equipados:
• Sala de estar com vista para o pólo
• Quarto com banheiro privativo
• Varanda fechada para a parte tranquila do prédio com vista para a piscina e campo de pólo argentino.

• Piso aquecido
• Caldeira individual (água quente e aquecimento próprios, sem depender do edifício)

Comodidades:
• Piscina
• SOMA

Tudo incluído, preço final: aluguel, contas de serviços públicos (gás, luz etc.) e despesas em um só pacote.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-13T16:59:50.981855+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-ARCE2234CM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/portada-catalogo-1787674787107.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/portada-catalogo-1787674787107.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-3-1786640393391.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-3-1786640393391.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-1-1786640391050.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-1-1786640391050.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-2-1786640392214.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-2-1786640392214.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-4-1786640393972.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-4-1786640393972.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-5-1786640733396.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-5-1786640733396.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-9-1786640398295.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-9-1786640398295.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-6-1786640395884.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-6-1786640395884.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-7-1786640396532.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-7-1786640396532.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-8-1786640397507.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-8-1786640397507.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-5-1786640394541.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-5-1786640394541.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-11-1786640399430.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-11-1786640399430.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-10-1786640398895.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arce-223-4c/foto-10-1786640398895.jpg');

  -- Peña 2528 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-PENA2528M', 'pena-2528', v_pub, '63bcc88f-ef21-433b-985a-29b25c9ae5a7', 'mediano', 'Peña 2528', 'Peña 2528', null, 'Recoleta', 'Recoleta', 1200, 41, 41, 1, 1, 1, true, array['Gimnasio','Spa / Sauna','Ascensor','Cochera','SUM','Terraza o jardín','Seguridad 24hs','Laundry','Amoblado']::text[], 'Piso alto al frente, en el corazón de Recoleta. Con cochera cubierta.

A una cuadra de Av. Las Heras, con el subte línea H y Av. Pueyrredón a pasos, y el corredor de Av. Santa Fe a pocas cuadras. El circuito del Pilar y Plaza Francia, cerca.

Unidad de 41 m², muy luminosa, con balcón terraza al frente. Totalmente equipado.

• Ambiente principal con cocina integrada
• Baño completo
• Balcón terraza al frente
• Cochera fija

Amenities:
• Seguridad 24 hs
• Lava-seca ropa en cada piso
• SUM, gym y sauna
• Solarium

Expensas incluidas en el precio.
No se permiten mascotas.', null, null, null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-13T13:51:26.282235+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-PENA2528M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528/portada-catalogo-1787190632071.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528/portada-catalogo-1787190632071.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-5-1786629536666.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-5-1786629536666.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-1-1786629533378.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-1-1786629533378.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-3-1786629535296.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-3-1786629535296.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-4-1786629536084.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-4-1786629536084.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-6-1786629537239.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-6-1786629537239.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-7-1786629537822.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-7-1786629537822.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-8-1786629538314.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-8-1786629538314.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-9-1786629538878.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-9-1786629538878.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-10-1786629539487.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-10-1786629539487.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-11-1786629540208.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-11-1786629540208.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-12-1786629541623.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-12-1786629541623.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-13-1786629542325.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pena-2528-5/foto-13-1786629542325.jpg');

  -- Austria 1938 · 10 · venta
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-AUSTRIA193810V', 'austria-1938-10', v_pub, '7086e5dd-f516-494c-9d58-5c0082c60c9a', 'venta', 'Austria 1938 · 10', 'Austria 1938', '10', 'Recoleta', 'Recoleta', 350000, 110, 110, 3, 2, 1, true, array['Laundry','Parrilla','Baulera','Bicicletero','Pileta','Gimnasio','Spa / Sauna','SUM','Ascensor','Terraza o jardín','Conserje 24hs','Seguridad 24hs','Calefacción central','Aire acondicionado','Pet friendly','Amoblado']::text[], '• PISO COMPLETO DE 110 M² FRENTE A TORRE DECÓ - RECOLETA - 3 AMBIENTES DE CATEGORÍA CON DEPENDENCIA •
Unidad a estrenar con orientación al frente. Originalmente dos unidades de frente que la propietaria decidió unificar, dando como resultado un 3 ambientes de dimensiones únicas en la zona.

La unidad cuenta con:

- Sector social
. Amplio living comedor con salida a doble balcón
. Balcón cubierto con cerramiento de doble vidrio y balcón descubierto
. Toilette de recepción

- Sector privado
. Suite principal con vestidor y armario
. Baño completo

- Sector servicios
. Cocina separada con barra desayunadora
. Lavadero independiente
. Dependencia de servicio

El edificio cuenta con:
. Gimnasio
. Sauna
. 2 SUM
. Piscina climatizada
. Solárium
. Sector guarda-bicicletas

Las superficies y medidas son aproximadas y surgirán del título de propiedad respectivo.
Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', '• COMPLETE APARTMENT OF 110 M² IN FRONT OF TORRE DECÓ - RECOLETA - 3 CATEGORY ROOMS WITH DEPENDENCY •
Brand new unit facing front. Originally two front units that the owner decided to unify, resulting in a 3-bedroom with unique dimensions in the area.

The unit has:

- Social sector
. Large living room with access to a double balcony
. Covered balcony with double glass enclosure and uncovered balcony
. Reception toilette

- Private sector
. Master suite with dressing room and closet
. full bathroom

- Services sector
. Separate kitchen with breakfast bar
. Separate laundry room
. Service dependency

The building has:
. Gym
. Sauna
. 2 SUM
. Heated pool
. Solarium
. Bicycle storage area

The surfaces and measurements are approximate and will arise from the respective property title.
Responsible broker: Maximiliano Matzkin, CUCICBA Registration No. 7527
Contact: +54 9 11 2310-6629', '• APARTAMENTO COMPLETO DE 110 M² EM FRENTE À TORRE DECÓ - RECOLETA - 3 QUARTOS CATEGORIA COM DEPENDÊNCIA •
Unidade totalmente nova voltada para frente. Originalmente duas unidades frontais que o proprietário decidiu unificar, resultando num T3 com dimensões únicas na área.

A unidade possui:

- Setor social
. Sala ampla com acesso a varanda dupla
. Varanda coberta com vidro duplo e varanda descoberta
. Banheiro da recepção

- Setor privado
. Suíte master com closet e closet
. banheiro completo

- Setor de serviços
. Cozinha separada com balcão para café da manhã
. Lavanderia separada
. Dependência de serviço

O edifício possui:
. Academia
. Sauna
. 2 SOMA
. Piscina aquecida
. Solário
. Área de armazenamento de bicicletas

As superfícies e medidas são aproximadas e decorrerão do respetivo título de propriedade.
Corretor responsável: Maximiliano Matzkin, CUCICBA Registro nº 7527
Contato: +54 9 11 2310-6629', null, null, null, 'disponible', 'publicado', '2026-08-11T16:28:52.659179+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-AUSTRIA193810V'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-1-1786465732651.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-1-1786465732651.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-2-1786465733738.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-2-1786465733738.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-3-1786465734752.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-3-1786465734752.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-4-1786465735262.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-4-1786465735262.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-5-1786465735802.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-5-1786465735802.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-6-1786465736354.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-6-1786465736354.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-7-1786465737018.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-7-1786465737018.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-8-1786465737693.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-8-1786465737693.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-9-1786465738250.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-9-1786465738250.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-10-1786465738861.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-10-1786465738861.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-11-1786465739414.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-11-1786465739414.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-12-1786465739955.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-12-1786465739955.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-13-1786465740621.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-13-1786465740621.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-14-1786465741531.jpg', 13 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-14-1786465741531.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-15-1786465742176.jpg', 14 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-15-1786465742176.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-16-1786465742819.jpg', 15 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-16-1786465742819.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-17-1786465743399.jpg', 16 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-17-1786465743399.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-18-1786465744015.jpg', 17 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-18-1786465744015.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-19-1786465744619.jpg', 18 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-19-1786465744619.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-20-1786465745220.jpg', 19 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-10/foto-20-1786465745220.jpg');

  -- Arenales 2208 · 4 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-ARENALES22084M', 'arenales-2208-4', v_pub, '61f1d90f-f24d-48be-8b62-f9c8eac7b6ec', 'mediano', 'Arenales 2208 · 4', 'Arenales 2208', '4', 'Recoleta', 'Recoleta', 1700, 90, 90, 3, 2, 1, true, array['Amoblado','Seguridad 24hs','Ascensor']::text[], 'Arenales 2208 — Recoleta

Departamento de 3 ambientes con 91 m², un metraje muy superior al promedio de la tipología: living-comedor amplio y dos dormitorios con buenas dimensiones. Se entrega completamente amoblado, listo para instalarse sin mudanza de por medio. Ideal para familias, parejas, estudiantes y profesionales.

La ubicación es Recoleta en su mejor expresión. A una cuadra de Av. Santa Fe con todo su corredor comercial y gastronómico, y a solo 3 cuadras de Plaza Houssay, la Facultad de Medicina de la UBA y el Hospital de Clínicas: una zona de demanda permanente para médicos, residentes y estudiantes de la salud. El Hospital Alemán queda a pocas cuadras por Av. Pueyrredón.

Para el tiempo libre, el circuito clásico del barrio está todo a distancia caminable: el Cementerio de la Recoleta, la Iglesia del Pilar, el Centro Cultural Recoleta y la feria de Plaza Francia a 5 cuadras, El Ateneo Grand Splendid a 4 y el Museo Nacional de Bellas Artes.', null, null, null, null, '3-12 meses', 'reservado', 'publicado', '2026-08-03T21:10:12.010008+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-ARENALES22084M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/portada-catalogo-1787190784636.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/portada-catalogo-1787190784636.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-3-1785791412906.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-3-1785791412906.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-1-1785791411958.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-1-1785791411958.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-2-1785791412434.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-2-1785791412434.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-6-1785791414596.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-6-1785791414596.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-7-1785791415050.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-7-1785791415050.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-8-1785791415873.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-8-1785791415873.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-9-1785791416270.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arenales-2208-4/foto-9-1785791416270.jpg');

  -- Paraguay 1484 · 4B · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-PARAGUAY14844BM', 'paraguay-1484-4b', v_pub, '640b824a-33ae-499b-8c18-af85802ce2e8', 'mediano', 'Paraguay 1484 · 4B', 'Paraguay 1484', '4B', 'Recoleta', 'Recoleta', 750, 32, 32, 1, 1, 1, true, array['Seguridad 24hs','Amoblado','Ascensor','Aire acondicionado','Laundry']::text[], 'Paraguay 1484, 4° B — Recoleta / Barrio Norte

Monoambiente de 32 m² totalmente refaccionado con estética moderna, amoblado y equipado: llegás con la valija y ya estás viviendo. El ambiente es funcional y luminoso, con cocina equipada, baño completo renovado y todo el mobiliario necesario para instalarse.

La ubicación es de las mejores del corredor universitario de Buenos Aires. La UCES está a una cuadra sobre la misma calle, las sedes de la USAL (Marcelo T. de Alvear, Callao y Viamonte) quedan entre 2 y 6 cuadras, y la Facultad de Medicina de la UBA a solo 7 cuadras caminando por Paraguay. Ideal para estudiantes y profesionales jóvenes.

A una cuadra tenés Av. Santa Fe y Av. Córdoba con todo el comercio, gastronomía y líneas de colectivo; el subte D y B (estaciones Tribunales y Callao) a menos de 5 cuadras conecta con toda la ciudad. Y para tiempos libres: Teatro Colón a 600 metros,', null, null, null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-03T20:49:37.366855+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-PARAGUAY14844BM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/portada-catalogo-1787190949061.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/portada-catalogo-1787190949061.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-1-1785790177285.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-1-1785790177285.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-2-1785790177847.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-2-1785790177847.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-3-1785790178317.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-3-1785790178317.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-4-1785790178703.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-4-1785790178703.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-5-1785790179114.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-5-1785790179114.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-6-1785790179629.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-1484-4b/foto-6-1785790179629.jpg');

  -- Argañarás 19 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-ARGANARAS19M', 'arganaras-19', v_pub, '4e6e630e-a1f3-45aa-a831-4788448e4363', 'mediano', 'Argañarás 19', 'Argañarás 19', null, 'Villa Crespo', 'Villa Crespo', 1300, 51, 51, 2, 1, 1, true, array['Pileta','Gimnasio','SUM','Ascensor','Terraza o jardín','Conserje 24hs','Seguridad 24hs','Calefacción central','Aire acondicionado','Pet friendly','Bicicletero','Parrilla','Laundry','Baulera','Amoblado']::text[], 'Edificio Palmera Crespo. Amenities en cuatro plantas y seguridad las 24 horas.
Valor de expensas incluído en el precio.

2 ambientes amoblado y equipado en Villa Crespo.
• Living comedor
• Cocina equipada con barra.
• Dormitorio en suite con vestidor.
• Baño completo + toilette.
• Balcón al frente.

Incluye:
• Mobiliario completo y equipamiento
• Vajilla, blanquería y wifi.
• Calefacción frío/calor

Amenities:
• Paseo gastronómico en planta baja
• Espacios verdes de relajación en el piso 2
• Piso 5 para los chicos: pileta infantil, playroom, SUM y juegos de plaza
• Rooftop en el piso 13 solo para adultos: pileta descubierta, solárium con deck, jacuzzi y parrillas
• Gimnasio', 'Palmera Crespo Building. Amenities on four floors and 24-hour security.
Value of expenses included in the price.

2 furnished and equipped rooms in Villa Crespo.
• Living room
• Kitchen equipped with bar.
• Bedroom suite with dressing room.
• Full bathroom + toilet.
• Balcony to the front.

Includes:
• Complete furniture and equipment
• Crockery, linen and wifi.
• Hot/cold heating

Amenities:
• Gastronomic walk on the ground floor
• Green relaxation spaces on the 2nd floor
• Floor 5 for the kids: children''s pool, playroom, SUM and playground games
• Rooftop on the 13th floor for adults only: outdoor pool, solarium with deck, jacuzzi and grills
• Gym', 'Edifício Palmeira Crespo. Comodidades em quatro andares e segurança 24 horas.
Valor das despesas incluídas no preço.

2 quartos mobilados e equipados em Villa Crespo.
• Sala de estar
• Cozinha equipada com bar.
• Suíte com closet.
• Banheiro completo + lavabo.
• Varanda na frente.

Inclui:
• Móveis e equipamentos completos
• Louça, roupa de cama e wifi.
• Aquecimento quente/frio

Comodidades:
• Passeio gastronômico no térreo
• Espaços verdes de relaxamento no 2º andar
• Piso 5 para as crianças: piscina infantil, brinquedoteca, SUM e playground de jogos
• Cobertura no 13º andar somente para adultos: piscina externa, solário com deck, jacuzzi e churrasqueiras
• Ginásio', null, null, '3-12 meses', 'disponible', 'publicado', '2026-08-03T19:03:09.121994+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-ARGANARAS19M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arganaras-19-522/portada-catalogo-1787190815800.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/arganaras-19-522/portada-catalogo-1787190815800.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-2-1785785630217.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-2-1785785630217.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-1-1785783963834.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-1-1785783963834.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-3-1785783966146.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-3-1785783966146.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-4-1785783966581.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-4-1785783966581.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-5-1785784131201.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-5-1785784131201.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-6-1785784131723.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-6-1785784131723.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-7-1785784132432.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-7-1785784132432.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-8-1785784132852.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-8-1785784132852.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-9-1785784133321.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-9-1785784133321.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-10-1785784133789.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-10-1785784133789.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-11-1785784134240.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-11-1785784134240.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-12-1785784134950.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/pringles-1210-5002/foto-12-1785784134950.jpg');

  -- Anchorena 1472 · 4 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-ANCHORENA14724M', 'anchorena-1472-4', v_pub, 'edb9b6d7-c38e-4776-a024-8fdae1a34b2b', 'mediano', 'Anchorena 1472 · 4', 'Anchorena 1472', '4', 'Recoleta', 'Recoleta', 1600, 78, 78, 3, 2, 1, true, array['Amoblado','Laundry','Seguridad 24hs','Ascensor','Aire acondicionado']::text[], '*Expensas y gastos incluídos excepto luz y gas.

3 Ambientes en Recoleta. Amoblado y equipado.', null, null, null, null, '3-12 meses', 'disponible', 'publicado', '2026-07-28T18:45:55.443946+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-ANCHORENA14724M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-1472-4/portada-catalogo-1787190707678.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-1472-4/portada-catalogo-1787190707678.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-9-1785264474324.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-9-1785264474324.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-1-1785264355557.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-1-1785264355557.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-2-1785264356689.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-2-1785264356689.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-7-1785264360112.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-7-1785264360112.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-10-1785264362394.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-10-1785264362394.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-5-1785264471535.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-5-1785264471535.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-6-1785264472622.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-6-1785264472622.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-7-1785264473318.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-7-1785264473318.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-8-1785264473767.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/anchorena-4/foto-8-1785264473767.jpg');

  -- Niceto Vega 5932 · 6A · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-NICETOVEGA59326AM', 'niceto-vega-5932-6a', v_pub, '71bf6ef6-e220-4970-a17c-03def3f56297', 'mediano', 'Niceto Vega 5932 · 6A', 'Niceto Vega 5932', '6A', 'Palermo Hollywood', 'Palermo Hollywood', 1100, 48, 48, 1, 1, 1, true, array['Seguridad 24hs','Ascensor','Conserje 24hs','Amoblado','Aire acondicionado','Terraza o jardín']::text[], 'Amplio monoambiente dividido en Palermo Hollywood a metros de Plaza Mafalda. 
Edificio moderno, acceso con clave alfanumérica y amoblado de primer nivel.', 'Spacious partitioned studio in Palermo Hollywood, steps from Plaza Mafalda.
Modern building, keyless entry with alphanumeric code and top-quality furnishings.', 'Amplo estúdio com divisória em Palermo Hollywood, a poucos metros da Plaza Mafalda.
Edifício moderno, acesso com senha alfanumérica e mobiliário de primeiro nível.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-07-07T19:40:28.671714+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-NICETOVEGA59326AM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932-6a/portada-catalogo-1787191108624.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932-6a/portada-catalogo-1787191108624.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-4-1783453233789.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-4-1783453233789.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-1-1783453228839.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-1-1783453228839.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-2-1783453230954.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-2-1783453230954.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-3-1783453232479.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-3-1783453232479.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-5-1783453234846.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-5-1783453234846.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-6-1783453236079.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-6-1783453236079.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-7-1783453237559.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-7-1783453237559.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-9-1783453239753.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-9-1783453239753.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-10-1783453240892.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-10-1783453240892.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-11-1783453242174.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/niceto-vega-5932/foto-11-1783453242174.jpg');

  -- Moldes 3018 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-MOLDES3018M', 'moldes-3018', v_pub, 'aa166893-1daa-4a4c-b876-005a7853d35e', 'mediano', 'Moldes 3018', 'Moldes 3018', null, 'Núñez', 'Núñez', 2500, 160, 160, 4, 3, 2, true, array['Ascensor','Terraza o jardín','Laundry','Amoblado','Aire acondicionado','Seguridad 24hs']::text[], '4 Ambientes en Núñez. 
Amoblado y equipado, con terraza propia, baño completo y Toilette', '3-bedroom apartment in Núñez.
Furnished and fully equipped, with private terrace, full bathroom and guest toilet.', '4 ambientes em Núñez.
Mobiliado e equipado, com terraço próprio, banheiro completo e lavabo.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-07-07T18:43:43.049432+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-MOLDES3018M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/portada-catalogo-1787191158696.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/portada-catalogo-1787191158696.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-2-1783450089166.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-2-1783450089166.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-1-1783450088148.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-1-1783450088148.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-3-1783450090127.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-3-1783450090127.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-4-1783450090751.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-4-1783450090751.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-5-1783450091416.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-5-1783450091416.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-6-1783450092030.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-6-1783450092030.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-7-1783450092488.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-7-1783450092488.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-8-1783450093351.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-8-1783450093351.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-9-1783450093870.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-9-1783450093870.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-10-1783450094312.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-10-1783450094312.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-11-1783450094811.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-11-1783450094811.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-12-1783450095746.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018/foto-12-1783450095746.jpg');

  -- Juramento 3106 · 1C · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-JURAMENTO31061CM', 'juramento-3106-1c', v_pub, '62c83935-7e3d-4171-ab83-5dba1d5bad54', 'mediano', 'Juramento 3106 · 1C', 'Juramento 3106', '1C', 'Belgrano C', 'Belgrano C', 1200, 80, 80, 2, 1, 1, true, array['Amoblado','Aire acondicionado','Terraza o jardín','Laundry']::text[], null, null, null, null, null, '3-12 meses', 'disponible', 'publicado', '2026-07-06T16:47:36.620376+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-JURAMENTO31061CM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-3106-1c/portada-catalogo-1787191172281.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-3106-1c/portada-catalogo-1787191172281.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-1-1783356456877.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-1-1783356456877.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-2-1783356458208.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-2-1783356458208.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-3-1783356459571.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-3-1783356459571.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-4-1783356460566.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-4-1783356460566.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-5-1783356461768.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-5-1783356461768.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-6-1783356462815.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juramento-1c/foto-6-1783356462815.jpg');

  -- Moldes 3018 · 4 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-MOLDES30184M', 'moldes-3018-4', v_pub, '6911e3d8-fa8c-44fe-8b59-4e6f868771e9', 'mediano', 'Moldes 3018 · 4', 'Moldes 3018', '4', 'Núñez', 'Núñez', 1600, 64, 64, 3, 2, 1, true, array['Amoblado','Ascensor','Baulera','Seguridad 24hs','Laundry']::text[], 'Hermoso 3 ambientes con toilette y baño completo en Núñez. 

Unidad amoblada y equipada. 
Baulera disponible.', 'Beautiful 2-bedroom apartment with guest toilet and full bathroom in Núñez.

Furnished and fully equipped unit.
Storage room available.', 'Lindo apartamento de 3 ambientes com lavabo e banheiro completo em Núñez.

Unidade mobiliada e equipada.
Depósito disponível.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-07-01T20:01:17.536126+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-MOLDES30184M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/portada-catalogo-1787191285491.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/portada-catalogo-1787191285491.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-1-1783449572135.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-1-1783449572135.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-2-1783449574288.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-2-1783449574288.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-3-1783449575303.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-3-1783449575303.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-4-1783449576612.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-4-1783449576612.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-5-1783449577914.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-5-1783449577914.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-6-1783449579303.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-6-1783449579303.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-7-1783449580512.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-7-1783449580512.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-8-1783449583009.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-8-1783449583009.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-9-1783449584224.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-9-1783449584224.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-10-1783449585353.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-10-1783449585353.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-11-1783449586803.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-11-1783449586803.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-12-1783449587930.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/moldes-3018-4/foto-12-1783449587930.jpg');

  -- Paraguay 3734 · 3 · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-PARAGUAY37343L', 'paraguay-3734-3', v_pub, '09d4e608-b0fc-4bc8-a575-40a38090ddf1', 'alquiler', 'Paraguay 3734 · 3', 'Paraguay 3734', '3', 'Palermo', 'Palermo', 800, 48, 48, 2, 1, 1, true, array['Seguridad 24hs','Aire acondicionado','Laundry','Amoblado','Ascensor','Pet friendly','Baulera','Pileta','Gimnasio']::text[], '*Valor de expensas: $250.000. 
Edificio con 1 año de antigüedad.
Monoambiente dividido y muy espacioso en Palermo.
Además de la Habitación dividida en suite, la unidad cuenta con toilette y vestidor. 
Piscina en piso 10 y gimnasio.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', '*Building fees: $250,000 ARS.
One-year-old building.
Very spacious partitioned studio in Palermo.
Besides the separate en-suite bedroom, the unit features a guest toilet and walk-in closet.
Pool on the 10th floor and gym.', '*Valor do condomínio: $250.000.
Edifício com 1 ano de construção.
Estúdio com divisória, muito espaçoso, em Palermo.
Além do quarto separado em suíte, a unidade conta com lavabo e closet.
Piscina no 10º andar e academia.', null, null, 'A partir de 2 años', 'reservado', 'publicado', '2026-06-22T14:48:43.609916+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-PARAGUAY37343L'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/portada-catalogo-1787191341595.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/portada-catalogo-1787191341595.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-3-1783081815731.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-3-1783081815731.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-4-1783081816812.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-4-1783081816812.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-5-1783081817524.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-5-1783081817524.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-6-1783081818323.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-6-1783081818323.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-7-1783081819119.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-7-1783081819119.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-8-1783081819822.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-8-1783081819822.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-9-1783081820460.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-9-1783081820460.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-10-1783081821497.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-10-1783081821497.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-12-1783081823756.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-12-1783081823756.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-11-1783081822615.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734-3/foto-11-1783081822615.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734/foto-11-1782312381875.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734/foto-11-1782312381875.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734/foto-12-1782312382671.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/paraguay-3734/foto-12-1782312382671.jpg');

  -- Francisco Acuña de Figueroa 1560 · 1G · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-FRANCISCOACUNADEFIGUEROA15601GL', 'francisco-acuna-de-figueroa-1560-1g', v_pub, '17f2ad31-20bd-4b4a-8009-2fdb8c5069aa', 'alquiler', 'Francisco Acuña de Figueroa 1560 · 1G', 'Francisco Acuña de Figueroa 1560', '1G', 'Palermo', 'Palermo', 750, 40, 40, 1, 1, 1, true, array['Ascensor','Terraza o jardín','Conserje 24hs','Seguridad 24hs','Laundry','Amoblado','Pet friendly','Aire acondicionado','Parrilla','Pileta','SUM']::text[], '*Valor de expensas: $200.000. 
Ambiente muy amplio en edificio muy tranquilo en zona muy residencial de Palermo. A metros de Av. Córdoba y de Av. Santa Fé, Alto Palermo, Plaza Unidad Latinoamericana y la mejor conectividad de la Ciudad. 

Con Jardín, Piscina, SUM equipado y seguridad 24hs.
Sin Amoblar. 

Click en el botón debajo para coordinar tu visita.
Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', '*Building fees: $200,000 ARS.
Very spacious unit in a quiet building, in a residential area of Palermo. Steps from Av. Córdoba and Av. Santa Fe, Alto Palermo mall, Plaza Unidad Latinoamericana and the city''s best transit connections.

With garden, pool, equipped common room and 24-hour security.
Unfurnished.

Click the button below to schedule your visit.', '*Valor do condomínio: $200.000.
Ambiente muito amplo em edifício tranquilo, em zona residencial de Palermo. A poucos metros da Av. Córdoba e da Av. Santa Fe, do Alto Palermo, da Plaza Unidad Latinoamericana e da melhor conectividade da cidade.

Com jardim, piscina, salão de festas equipado e segurança 24h.
Sem mobília.

Clique no botão abaixo para agendar sua visita.', null, null, 'A partir de 2 años', 'reservado', 'publicado', '2026-06-18T13:23:25.967123+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-FRANCISCOACUNADEFIGUEROA15601GL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/portada-catalogo-1787191394384.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/portada-catalogo-1787191394384.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-1-1781789006175.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-1-1781789006175.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-2-1781789007821.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-2-1781789007821.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-3-1781789008528.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-3-1781789008528.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-4-1781789009202.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-4-1781789009202.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-5-1781789009866.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-5-1781789009866.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-6-1781789010474.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-6-1781789010474.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-7-1781789011157.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-7-1781789011157.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-8-1781789011759.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-8-1781789011759.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-9-1781789012388.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-9-1781789012388.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-10-1781789127055.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/francisco-acuna-de-figueroa-1560-1g/foto-10-1781789127055.jpg');

  -- Núñez 3100 · 1 · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-NUNEZ31001L', 'nunez-3100-1', v_pub, 'a6c1f19a-b629-4aff-9ad7-7cab33944bbe', 'alquiler', 'Núñez 3100 · 1', 'Núñez 3100', '1', 'Núñez', 'Núñez', 1200, 80, 80, 3, 2, 1, false, '{}'::text[], 'Complejo de diseño, super tranquilo con amenities y pocas unidades.
Valor de expensas: $450.000

Loft doble altura con detalles de diseño. Excelente calidad constructiva.
Pisos de madera natural. Barrio de Núñez. 

Unidad en 1° piso al frente, con amplio balcón, portón en madera plegable a ambos costados que da privacidad.

Planta baja:
• Living comedor
• Toilette
• Cocina integrada con barra y banquetas.
• Balcon

Primer piso:
• Dormitorio en suite con vestidor
• Puente de vidrio.
• Espacio para escritorio o similar.
• Baño completo

• Calefacción individual por piso radiante
• Dos equipos split frío/calor
• Agua caliente central
• Pisos de madera natural

Amenities:
• Gran parque arbolado con piscina.
• Solarium con deck de madera
• SUM con cocina, parrilla y baño
• Gimnasio y laundry

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', 'Design complex, very quiet, with amenities and few units.
Building fees: $450,000 ARS

Double-height loft with designer details. Excellent build quality.
Natural wood floors. Núñez neighbourhood.

Front-facing unit on the 1st floor, with a large balcony and folding wooden shutters on both sides for privacy.

Ground floor:
• Living and dining room
• Guest toilet
• Integrated kitchen with bar and stools
• Balcony

First floor:
• En-suite bedroom with walk-in closet
• Glass bridge
• Space for a home office or similar
• Full bathroom

• Individual radiant floor heating
• Two hot/cold split AC units
• Central hot water
• Natural wood floors

Amenities:
• Large tree-filled park with pool
• Solarium with wooden deck
• Common room with kitchen, BBQ and bathroom
• Gym and laundry', 'Complexo de design, super tranquilo, com comodidades e poucas unidades.
Valor do condomínio: $450.000

Loft de pé-direito duplo com detalhes de design. Excelente qualidade construtiva.
Pisos de madeira natural. Bairro de Núñez.

Unidade no 1º andar, de frente, com amplo balcão e portão de madeira dobrável dos dois lados que garante privacidade.

Térreo:
• Living com sala de jantar
• Lavabo
• Cozinha integrada com bancada e banquetas
• Balcão

Primeiro andar:
• Quarto em suíte com closet
• Passarela de vidro
• Espaço para escritório ou similar
• Banheiro completo

• Aquecimento individual por piso radiante
• Dois aparelhos split quente/frio
• Água quente central
• Pisos de madeira natural

Comodidades:
• Grande parque arborizado com piscina
• Solário com deck de madeira
• Salão de festas com cozinha, churrasqueira e banheiro
• Academia e lavanderia', null, null, 'A partir de 2 años', 'disponible', 'publicado', '2026-06-16T14:15:11.254322+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-NUNEZ31001L'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/portada-catalogo-1787191443872.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/portada-catalogo-1787191443872.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-1-1781619311003.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-1-1781619311003.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-2-1781619312299.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-2-1781619312299.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-3-1781619312909.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-3-1781619312909.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-4-1781619313872.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-4-1781619313872.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-5-1781619314588.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-5-1781619314588.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-6-1781619315448.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-6-1781619315448.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-7-1781619316091.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-7-1781619316091.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-8-1781619362626.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-8-1781619362626.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-8-1781619316648.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-8-1781619316648.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-9-1781619317183.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-9-1781619317183.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-10-1781619317835.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-10-1781619317835.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-11-1781619318622.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/nunez-3100-1/foto-11-1781619318622.jpg');

  -- Juncal 600 · Pisos 10 - 11 · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-JUNCAL600PISOS1011L', 'juncal-600-pisos-10-11', v_pub, '5a0ecd31-6146-4c12-903c-9294122bdcc5', 'alquiler', 'Juncal 600 · Pisos 10 - 11', 'Juncal 600', 'Pisos 10 - 11', 'Retiro', 'Retiro', 2500, 230, 230, 5, 4, 2, true, array['Amoblado','Terraza o jardín','Parrilla','Spa / Sauna']::text[], '*Total de Expensas ($600.000) y servicios a cargo del inquilino. 
Dúplex completamente refaccionado en pisos 10 y 11. 
Doble altura, terminaciones en madera de roble y luz en todos los ambientes.
· Sala de estar con hogar a leña
· Family room con balcón aterrazado y parrilla
· Sauna propio 
· 2 dormitorios en suite + escritorio con baño
· Terraza propia con vista a la ciudad

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', '*Total building fees ($600,000 ARS) and utilities paid by tenant.
Fully renovated duplex on the 10th and 11th floors.
Double-height ceilings, oak wood finishes and natural light in every room.
· Living room with wood-burning fireplace
· Family room with terraced balcony and BBQ
· Private sauna
· 2 en-suite bedrooms + study with bathroom
· Private terrace with city views', '*Condomínio total ($600.000) e serviços por conta do inquilino.
Dúplex completamente reformado nos andares 10 e 11.
Pé-direito duplo, acabamentos em madeira de carvalho e luz em todos os ambientes.
· Sala de estar com lareira a lenha
· Family room com varanda em terraço e churrasqueira
· Sauna própria
· 2 quartos em suíte + escritório com banheiro
· Terraço próprio com vista para a cidade', 'https://www.youtube.com/embed/WJqXj3PmPt4?si=VnPJVGnd-AppT9jj', 'bunny', 'A partir de 2 años', 'disponible', 'publicado', '2026-05-29T16:18:59.64218+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-JUNCAL600PISOS1011L'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juncal-600-pisos-10-11/portada-catalogo-1787230931432.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juncal-600-pisos-10-11/portada-catalogo-1787230931432.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juncal-655-pisos-10-11/foto-1-1780078020049.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juncal-655-pisos-10-11/foto-1-1780078020049.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juncal-655-pisos-10-11/foto-1-1780078020049.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juncal-655-pisos-10-11/foto-1-1780078020049.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-2-1780071540689.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-2-1780071540689.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-2-1780071540689.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-2-1780071540689.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-3-1780071541815.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-3-1780071541815.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-3-1780071541815.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-3-1780071541815.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-4-1780071542942.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-4-1780071542942.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-4-1780071542942.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-4-1780071542942.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-5-1780071543657.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-5-1780071543657.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-5-1780071543657.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-5-1780071543657.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-6-1780071544785.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-6-1780071544785.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-6-1780071544785.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-6-1780071544785.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-7-1780071545773.jpg', 13 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-7-1780071545773.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-7-1780071545773.jpg', 14 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-7-1780071545773.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-8-1780071546745.jpg', 15 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-8-1780071546745.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-8-1780071546745.jpg', 16 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-8-1780071546745.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-9-1780071547549.jpg', 17 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-9-1780071547549.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-9-1780071547549.jpg', 18 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-9-1780071547549.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-10-1780071548055.jpg', 19 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-10-1780071548055.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-10-1780071548055.jpg', 20 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-10-1780071548055.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-11-1780071548620.jpg', 21 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-11-1780071548620.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-11-1780071548620.jpg', 22 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-11-1780071548620.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-12-1780071549350.jpg', 23 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-12-1780071549350.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-12-1780071549350.jpg', 24 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/retiro-5-b/foto-12-1780071549350.jpg');

  -- Congreso 2361 · 2 B · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-CONGRESO23612BL', 'congreso-2361-2-b', v_pub, '542a2237-628d-42c2-bfb3-ffac2412fb41', 'alquiler', 'Congreso 2361 · 2 B', 'Congreso 2361', '2 B', 'Núñez', 'Núñez', 850, 80, 80, 1, 1, 1, false, array['Ascensor','Cochera','SUM','Terraza o jardín','Seguridad 24hs','Aire acondicionado','Parrilla','Pileta']::text[], 'Belgrano · 2 ambientes con terraza propia y cochera.
Valor de expensas $170.000.

48 m² cubiertos muy bien resueltos: living, cocina con balcón, dormitorio en suite y toilette. Pulmón contrafrente amplio y luminoso, con excelente ventilación. A metros de Juramento, las Barrancas y toda la movida del barrio.

Mega terraza propia de 32 m²: el diferencial real de la unidad. Espacio para deck, parrilla y aire libre todo el año.
Cochera en PB incluida. SUM y Piscina con solárium en el piso 15.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', 'Belgrano · One-bedroom apartment with private terrace and parking space.
Building fees: $170,000 ARS.

48 m² indoors, very well laid out: living room, kitchen with balcony, en-suite bedroom and guest toilet. Bright, airy rear orientation with excellent ventilation. Steps from Juramento Ave, the Barrancas and everything the neighbourhood has to offer.

Huge 32 m² private terrace: the unit''s real differentiator. Room for a deck, BBQ and outdoor living all year round.
Ground-floor parking space included. Common room and pool with solarium on the 15th floor.', 'Belgrano · 2 ambientes com terraço próprio e vaga de garagem.
Valor do condomínio: $170.000.

48 m² cobertos muito bem aproveitados: living, cozinha com balcão, quarto em suíte e lavabo. Fundos amplos e luminosos, com excelente ventilação. A poucos metros da Juramento, das Barrancas e de toda a vida do bairro.

Mega terraço próprio de 32 m²: o verdadeiro diferencial da unidade. Espaço para deck, churrasqueira e ar livre o ano todo.
Vaga de garagem no térreo incluída. Salão de festas e piscina com solário no 15º andar.', null, null, 'A partir de 2 años', 'disponible', 'publicado', '2026-05-27T21:08:05.586766+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-CONGRESO23612BL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/portada-catalogo-1787230595603.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/portada-catalogo-1787230595603.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-1-1779916085674.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-1-1779916085674.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-2-1779916303095.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-2-1779916303095.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-3-1779916087828.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-3-1779916087828.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-4-1779916303982.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-4-1779916303982.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-5-1779916089054.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-5-1779916089054.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-6-1779916089676.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-6-1779916089676.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-7-1779916090048.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-7-1779916090048.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-8-1779916090534.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-8-1779916090534.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-9-1779916091103.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-9-1779916091103.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-10-1779916093972.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-10-1779916093972.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-11-1779916094587.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-11-1779916094587.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-12-1779916095227.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/congreso-2361-2-b/foto-12-1779916095227.jpg');

  -- Av. Medrano 1254 · 4 D · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-AVMEDRANO12544DM', 'av-medrano-1254-4-d', v_pub, 'c11fcef3-3541-4c81-8902-dd0623c64d4d', 'mediano', 'Av. Medrano 1254 · 4 D', 'Av. Medrano 1254', '4 D', 'Palermo Soho', 'Palermo Soho', 800, 35, 35, 1, 1, 1, true, array['Pileta','Gimnasio','SUM','Ascensor','Terraza o jardín','Seguridad 24hs','Aire acondicionado','Bicicletero','Parrilla','Laundry','Amoblado']::text[], 'Edificio premium a estrenar en Av. Medrano, en el límite con Palermo. 
El edificio es otro nivel: pileta en rooftop con reposeras y vista a Buenos Aires, terraza jardín, gimnasio al aire libre, SUM y lobby de acceso con sillones.
 Todo se accede con huella digital — sin llaves, sin tarjetas.

A metros de Thames y del polo gastronómico de Palermo.
Amoblado · Todos los servicios incluidos · Sin garantía propietaria ·', 'Brand-new premium building on Av. Medrano, on the border with Palermo.
The building is next level: rooftop pool with sun loungers and views over Buenos Aires, garden terrace, outdoor gym, common room and a lobby lounge.
Everything opens with your fingerprint — no keys, no cards.

Steps from Thames street and Palermo''s gastronomic hub.
Furnished · All utilities included · No guarantor required ·', 'Edifício premium novo na Av. Medrano, no limite com Palermo.
O edifício é outro nível: piscina no rooftop com espreguiçadeiras e vista para Buenos Aires, terraço jardim, academia ao ar livre, salão de festas e lobby com poltronas.
Tudo se acessa com digital — sem chaves, sem cartões.

A poucos metros da Thames e do polo gastronômico de Palermo.
Mobiliado · Todos os serviços incluídos · Sem exigência de fiador ·', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-26T16:44:05.412392+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-AVMEDRANO12544DM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/portada-catalogo-1787230520932.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/portada-catalogo-1787230520932.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-1-1779813845214.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-1-1779813845214.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-2-1779813846074.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-2-1779813846074.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-3-1779813846641.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-3-1779813846641.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-4-1779813847215.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-4-1779813847215.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-5-1779813847875.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-5-1779813847875.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-6-1779813848640.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-6-1779813848640.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-7-1779813849282.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-7-1779813849282.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-8-1779813849984.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-8-1779813849984.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-9-1779813851151.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-medrano-1254-4-d/foto-9-1779813851151.jpg');

  -- Gallo 1210 · PH · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-GALLO1210PHM', 'gallo-1210-ph', v_pub, '74b9f657-8152-4dff-9bab-7935636eb04c', 'mediano', 'Gallo 1210 · PH', 'Gallo 1210', 'PH', 'Recoleta', 'Recoleta', 3500, 100, 100, 3, 2, 1, true, array['Laundry','Amoblado','Aire acondicionado','Bicicletero']::text[], 'PH con patio privado propio en pleno Recoleta. Tres ambientes completamente renovados: living amplio con cocina abierta, isla con mesada de granito, campana de acero y equipamiento completo. Smart TV, aire acondicionado y piso de madera en todos los ambientes.
Dormitorio principal con acceso directo al patio, dormitorio secundario con dos camas y baño completo con ducha y mampara de vidrio. Segundo baño con vanitory de madera y ducha separada.
El patio es el diferencial: techado con plantas y sillones. Luz natural todo el día, privacidad total.
A metros de Av. Santa Fe y del polo cultural de Recoleta.
Amoblado · Todos los servicios incluidos · Sin garantía propietaria ·', 'PH-style apartment with its own private patio in the heart of Recoleta. Three fully renovated rooms: spacious living room with open kitchen, granite-top island, steel range hood and full equipment. Smart TV, air conditioning and wooden floors throughout.
Main bedroom with direct patio access, second bedroom with two beds, and a full bathroom with glass shower screen. Second bathroom with wooden vanity and separate shower.
The patio is the differentiator: covered, with plants and lounge seating. Natural light all day, total privacy.
Steps from Av. Santa Fe and Recoleta''s cultural district.
Furnished · All utilities included · No guarantor required ·', 'PH com pátio privado em plena Recoleta. Três ambientes completamente renovados: living amplo com cozinha aberta, ilha com bancada de granito, coifa de aço e equipamento completo. Smart TV, ar-condicionado e piso de madeira em todos os ambientes.
Quarto principal com acesso direto ao pátio, segundo quarto com duas camas e banheiro completo com box de vidro. Segundo banheiro com gabinete de madeira e ducha separada.
O pátio é o diferencial: coberto, com plantas e poltronas. Luz natural o dia todo, privacidade total.
A poucos metros da Av. Santa Fe e do polo cultural de Recoleta.
Mobiliado · Todos os serviços incluídos · Sem exigência de fiador ·', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-26T16:21:12.1045+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-GALLO1210PHM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/portada-catalogo-1787230970703.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/portada-catalogo-1787230970703.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-1-1779812472053.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-1-1779812472053.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-2-1779812473233.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-2-1779812473233.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-3-1779812473945.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-3-1779812473945.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-4-1779812475169.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-4-1779812475169.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-5-1779812475787.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-5-1779812475787.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-6-1779812476383.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-6-1779812476383.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-7-1779812477715.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-7-1779812477715.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-8-1779812478282.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-8-1779812478282.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-9-1779812478958.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gallo-1210-ph/foto-9-1779812478958.jpg');

  -- Costa Rica 4481 · 3 C · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-COSTARICA44813CM', 'costa-rica-4481-3-c', v_pub, '479d1f38-745d-4859-a370-6ba2c18daa7f', 'mediano', 'Costa Rica 4481 · 3 C', 'Costa Rica 4481', '3 C', 'Palermo Soho', 'Palermo Soho', 900, 40, 40, 1, 1, 1, true, array['Amoblado','Laundry','Parrilla','Aire acondicionado']::text[], 'Frente a Plaza Armenia, en el corazón de Palermo Soho. Una de las zonas más reconocidas de Buenos Aires a nivel mundial, con la mejor gastronomía, diseño y vida cultural de la ciudad — todo a metros de la puerta.
Un ambiente amplio amoblado con balcón en piso 3, cocina equipada y aire acondicionado. El edificio cuenta con parrilla.', 'Facing Plaza Armenia, in the heart of Palermo Soho. One of Buenos Aires'' most internationally recognized areas, with the city''s best dining, design and cultural life — all steps from your door.
Spacious furnished studio with balcony on the 3rd floor, equipped kitchen and air conditioning. The building has a BBQ area.', 'Em frente à Plaza Armenia, no coração de Palermo Soho. Uma das zonas mais reconhecidas de Buenos Aires mundialmente, com a melhor gastronomia, design e vida cultural da cidade — tudo a poucos metros da porta.
Estúdio amplo mobiliado com varanda no 3º andar, cozinha equipada e ar-condicionado. O edifício conta com churrasqueira.', null, null, '3-12 meses', 'reservado', 'publicado', '2026-05-26T16:01:47.988856+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-COSTARICA44813CM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/portada-catalogo-1787231134949.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/portada-catalogo-1787231134949.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-1-1779811455322.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-1-1779811455322.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-2-1779812087903.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-2-1779812087903.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-3-1779812089029.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-3-1779812089029.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-4-1779811411081.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-4-1779811411081.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-5-1779812090066.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-5-1779812090066.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-6-1779812090643.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-6-1779812090643.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-7-1779811312953.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/costa-rica-4481-3-c/foto-7-1779811312953.jpg');

  -- Manuel Ugarte 1992 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-MANUELUGARTE1992M', 'manuel-ugarte-1992', v_pub, '60c743b8-63ad-4450-8a0c-4191bd721300', 'mediano', 'Manuel Ugarte 1992', 'Manuel Ugarte 1992', null, 'Núñez', 'Núñez', 900, 45, 45, 1, 1, 1, true, array['Aire acondicionado','Amoblado','Ascensor','Seguridad 24hs','Calefacción central','Conserje 24hs']::text[], 'Unidad amoblada y equipada en edificio residencial y moderno en Núñez. 
A pasos: Av. Cabildo y la mejor conectividad del barrio. 

Zona tranquila, arbolada, a minutos de Belgrano y San Isidro. Monoambiente a estrenar con todos los servicios incluidos. Menos Luz.', 'Furnished and fully equipped unit in a modern residential building in Núñez.
Steps away: Av. Cabildo and the neighbourhood''s best transit connections.

Quiet, tree-lined area, minutes from Belgrano and San Isidro. Brand-new studio with all utilities included.', 'Unidade mobiliada e equipada em edifício residencial e moderno em Núñez.
A poucos passos: Av. Cabildo e a melhor conectividade do bairro.

Zona tranquila, arborizada, a minutos de Belgrano e San Isidro. Estúdio novo com todos os serviços incluídos.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-26T15:21:43.47588+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-MANUELUGARTE1992M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/portada-catalogo-1787231232401.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/portada-catalogo-1787231232401.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-1-1779808903513.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-1-1779808903513.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-3-1779808905011.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-3-1779808905011.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-4-1779808905669.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-4-1779808905669.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-5-1779808906252.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-5-1779808906252.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-5-1782911246355.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-5-1782911246355.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-6-1782911247586.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/manuel-ugarte-1992/foto-6-1782911247586.jpg');

  -- Malabia 2233 · 3 B · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-MALABIA22333BM', 'malabia-2233-3-b', v_pub, '828c9f6d-d8ac-47af-8c28-4173aa05e074', 'mediano', 'Malabia 2233 · 3 B', 'Malabia 2233', '3 B', 'Palermo Soho', 'Palermo Soho', 2500, 75, 75, 3, 2, 1, true, array['Aire acondicionado','Amoblado','Ascensor','Gimnasio','Terraza o jardín','Laundry','Parrilla','Pileta','Seguridad 24hs','SUM']::text[], '3 ambientes en Palermo Soho. Ubicación estratégica en el corazón del barrio más buscado
por locales y viajeros. Amoblado y listo para ingresar.', 'Two-bedroom apartment in Palermo Soho. Strategic location in the heart of the neighbourhood most sought after by locals and travellers alike. Furnished and move-in ready.', '3 ambientes em Palermo Soho. Localização estratégica no coração do bairro mais procurado por locais e viajantes. Mobiliado e pronto para entrar.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-22T19:33:31.238377+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-MALABIA22333BM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-1-1779479836725.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-1-1779479836725.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-2-1779479837816.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-2-1779479837816.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-3-1779479838739.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-3-1779479838739.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-4-1779479839247.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-4-1779479839247.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-5-1779479938649.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-5-1779479938649.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-6-1779479939572.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-6-1779479939572.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-7-1779479840906.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-7-1779479840906.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-8-1779479841425.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-8-1779479841425.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-9-1779479842017.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-9-1779479842017.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-10-1779479842593.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-10-1779479842593.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-11-1779479843131.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/malabia-2233-3-b/foto-11-1779479843131.jpg');

  -- Austria 1938 · 5 B · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-AUSTRIA19385BM', 'austria-1938-5-b', v_pub, '7f429e75-83c3-43ce-8eaf-0eeeec74773b', 'mediano', 'Austria 1938 · 5 B', 'Austria 1938', '5 B', 'Recoleta', 'Recoleta', 1300, 52, 52, 2, 1, 1, true, array['Pileta','SUM','Terraza o jardín','Amoblado','Parrilla','Laundry','Aire acondicionado','Conserje 24hs','Seguridad 24hs','Ascensor','Gimnasio','Spa / Sauna']::text[], 'Donde Recoleta y Palermo se encuentran en su mejor versión. Piscina en último piso, solarium, sauna, gimnasio, dos SUM, parrilla y guarda-bicicletas. 1 ambiente muy amplio, dividido. Con baño completo y toilette. Luminoso, bien distribuido con terminaciones de primer nivel. A estrenar. Disponible para alquiler temporal, amueblado.', 'Where Recoleta and Palermo meet at their finest. Rooftop pool, solarium, sauna, gym, two common rooms, BBQ area and bike storage. Very spacious partitioned studio, with full bathroom and guest toilet. Bright, well laid out, with top-quality finishes. Brand new. Available for short-term rental, furnished.', 'Onde Recoleta e Palermo se encontram na sua melhor versão. Piscina no último andar, solário, sauna, academia, dois salões de festas, churrasqueira e bicicletário. Estúdio muito amplo, com divisória. Com banheiro completo e lavabo. Luminoso, bem distribuído, com acabamentos de primeiro nível. Novo, nunca habitado. Disponível para aluguel por temporada, mobiliado.', null, null, '3-12 meses', 'reservado', 'publicado', '2026-05-22T19:25:39.210244+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-AUSTRIA19385BM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/portada-catalogo-1787231404165.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/portada-catalogo-1787231404165.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-1-1779477939158.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-1-1779477939158.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-2-1779477939749.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-2-1779477939749.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-3-1779477940425.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-3-1779477940425.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-4-1779477941497.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-4-1779477941497.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-5-1779477942208.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-5-1779477942208.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-6-1779477943033.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-6-1779477943033.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-7-1779477943640.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-7-1779477943640.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-8-1779477944684.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-8-1779477944684.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-9-1779477945735.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-9-1779477945735.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-10-1779477946405.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-10-1779477946405.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-11-1779477947068.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-5-b/foto-11-1779477947068.jpg');

  -- Lavalle 4022 · 14 C · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-LAVALLE402214CM', 'lavalle-4022-14-c', v_pub, 'dd735140-d16e-4f99-a6c9-a771bf50da5a', 'mediano', 'Lavalle 4022 · 14 C', 'Lavalle 4022', '14 C', 'Palermo', 'Palermo', 2500, 58, 58, 2, 1, 1, true, array['Parrilla','Pet friendly','Pileta','Seguridad 24hs','Spa / Sauna','SUM','Aire acondicionado','Amoblado','Ascensor','Bicicletero','Cochera','Conserje 24hs','Gimnasio','Terraza o jardín','Laundry']::text[], '*Opción Temporal amoblado y equipado: $2500 USD.
 Departamento equipado con cocina separada en Torre con vista panorámica 360º.
Aire acondicionado, garaje, parrilla, piscina olímpica, cancha de tenis, gimnasio, spa y sala de fiestas.
La unidad también tiene cine y sonido Hi Fi (Netflix, Star +, Amazon Prime). 

El alojamiento
Vista de la ciudad desde el piso 14', '*Short-term option, furnished and equipped: USD 2,500.
Fully equipped apartment with separate kitchen in a tower with 360º panoramic views.
Air conditioning, parking, BBQ area, Olympic pool, tennis court, gym, spa and party room.
The unit also features a home cinema with Hi-Fi sound (Netflix, Star+, Amazon Prime).

The space
City views from the 14th floor', '*Opção temporada, mobiliado e equipado: USD 2.500.
Apartamento equipado com cozinha separada em torre com vista panorâmica 360º.
Ar-condicionado, garagem, churrasqueira, piscina olímpica, quadra de tênis, academia, spa e salão de festas.
A unidade também tem cinema e som Hi-Fi (Netflix, Star+, Amazon Prime).

A acomodação
Vista da cidade desde o 14º andar', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-22T18:21:37.609394+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-LAVALLE402214CM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle-4022-14-c/portada-catalogo-1787231495556.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle-4022-14-c/portada-catalogo-1787231495556.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-2-1779474155161.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-2-1779474155161.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-3-1779474155779.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-3-1779474155779.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-4-1779474156495.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-4-1779474156495.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-5-1779474157834.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-5-1779474157834.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-6-1779474158547.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-6-1779474158547.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-7-1779474159678.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-7-1779474159678.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-8-1779474160695.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-8-1779474160695.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-9-1779474161413.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-9-1779474161413.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-10-1779474162041.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-10-1779474162041.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-11-1779474162664.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-11-1779474162664.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-12-1779474163449.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/lavalle/foto-12-1779474163449.jpg');

  -- Av. Santa Fe 4866 · 12 C · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-AVSANTAFE486612CL', 'av-santa-fe-4866-12-c', v_pub, '2908c596-a1ec-4297-8352-c0fdacdfb1d3', 'alquiler', 'Av. Santa Fe 4866 · 12 C', 'Av. Santa Fe 4866', '12 C', 'Palermo', 'Palermo', 1200, 75, 75, 3, 2, 1, false, array['Ascensor','Seguridad 24hs','Aire acondicionado','Pet friendly']::text[], 'Ubicado en un piso 12, se encuentra este departamento completamente renovado y diseñado con estilo. Un departamento ideal para profesionales que valoran el diseño, la luz natural y un espacio cómodo y tranquilo tanto para vivir como para trabajar remoto.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', 'On the 12th floor, this fully renovated, stylishly designed apartment. Ideal for professionals who value design, natural light and a comfortable, quiet space for both living and working remotely.', 'No 12º andar, este apartamento completamente renovado e decorado com estilo. Ideal para profissionais que valorizam o design, a luz natural e um espaço confortável e tranquilo tanto para morar quanto para trabalhar remoto.', null, null, 'A partir de 2 años', 'reservado', 'publicado', '2026-05-22T13:38:24.595865+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-AVSANTAFE486612CL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-1.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-2.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-3.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-4.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-5.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-6.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-7.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-8.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-8.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-9.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-9.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-10.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-10.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-11.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-11.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-12.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/av-santa-fe-4866-12-c/foto-12.jpg');

  -- Guido 1671 · 1B · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-GUIDO16711BL', 'guido-1671-1b', v_pub, '871aa424-261a-4ac3-8b7d-62fe792c07a0', 'alquiler', 'Guido 1671 · 1B', 'Guido 1671', '1B', 'Recoleta', 'Recoleta', 2000, 160, 160, 4, 3, 2, true, array['Aire acondicionado','Conserje 24hs','Amoblado','Laundry','Ascensor']::text[], '*Opción Temporal y amoblado precio paquete: $3500 USD. 

Edificio clásico de principios de siglo con techos altos, a 200 metros de Av. del Libertador y Plaza Francia. Living con vista verde, cocina equipada con mesada de mármol, 2 dormitorios en suite. Dormitorio principal con vestidor propio y baño con jacuzzi y ducha separada. Una propiedad de categoría que combina la arquitectura de otra época con el confort de hoy.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', '*Short-term furnished option, package price: USD 3,500.

Classic early-20th-century building with high ceilings, 200 metres from Av. del Libertador and Plaza Francia. Living room with green views, kitchen with marble countertops, 2 en-suite bedrooms. Main bedroom with its own walk-in closet and a bathroom with jacuzzi and separate shower. A distinguished property that combines old-world architecture with today''s comfort.', '*Opção temporada e mobiliado, preço pacote: USD 3.500.

Edifício clássico do início do século, com pé-direito alto, a 200 metros da Av. del Libertador e da Plaza Francia. Living com vista verde, cozinha equipada com bancada de mármore, 2 quartos em suíte. Quarto principal com closet próprio e banheiro com jacuzzi e ducha separada. Um imóvel de categoria que combina a arquitetura de outra época com o conforto de hoje.', 'https://www.youtube.com/embed/g1Bxfhdru3U', 'youtube', 'A partir de 2 años', 'disponible', 'publicado', '2026-05-22T13:38:15.483813+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-GUIDO16711BL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/portada-catalogo-1787232027381.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/portada-catalogo-1787232027381.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-1.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-2.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-3.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-4.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-5.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-6.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-7.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-8.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-8.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-9.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-9.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-10.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-10.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-11.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-11.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-12.jpg', 12 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/guido-1671-1b/foto-12.jpg');

  -- Uruguay 115 · 6 - 3 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-URUGUAY11563M', 'uruguay-115-6-3', v_pub, '8ed9543b-1391-4489-a81a-7188f5cb2401', 'mediano', 'Uruguay 115 · 6 - 3', 'Uruguay 115', '6 - 3', 'Centro', 'Centro', 1600, 180, 180, 6, 5, 2, true, array['Aire acondicionado','Ascensor','Terraza o jardín','Seguridad 24hs','Laundry']::text[], 'Un departamento de seis ambientes con dimensiones que ya no se consiguen. Dos dormitorios amplios. Uno con dos camas y escritorio integrado. Cocina separada. Comedor amplio. Espacio real para vivir, trabajar y recibir.', 'A six-room apartment with proportions you can no longer find. Two large bedrooms. One with two beds and a built-in desk. Separate kitchen. Spacious dining room. Real space to live, work and entertain.', 'Um apartamento de seis ambientes com dimensões que já não se encontram. Dois quartos amplos. Um deles com duas camas e escritório integrado. Cozinha separada. Sala de jantar ampla. Espaço de verdade para morar, trabalhar e receber.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-22T13:38:02.609605+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-URUGUAY11563M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/portada-catalogo-1787232313105.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/portada-catalogo-1787232313105.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-1.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-2.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-3.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-4.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-5.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-6.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-7.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-8.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-8.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-9.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/uruguay-115-6-3/foto-9.jpg');

  -- Vicente López 2227 · 3A · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-VICENTELOPEZ22273AM', 'vicente-lopez-2227-3a', v_pub, 'd16a9f40-2deb-446a-9b48-cfdd574a4997', 'mediano', 'Vicente López 2227 · 3A', 'Vicente López 2227', '3A', 'Recoleta', 'Recoleta', 1300, 75, 75, 2, 1, 1, true, array['Aire acondicionado','Ascensor','Terraza o jardín','Seguridad 24hs']::text[], 'Departamento amoblado en el corazón de Recoleta. A metros del museo de bellas artes y del cementerio más famoso de latinoamérica. Equipado, amoblado con criterio y listo para ingresar.', 'Furnished apartment in the heart of Recoleta. Steps from the Museum of Fine Arts and Latin America''s most famous cemetery. Fully equipped, thoughtfully furnished and move-in ready.', 'Apartamento mobiliado no coração de Recoleta. A poucos metros do Museu de Belas Artes e do cemitério mais famoso da América Latina. Equipado, mobiliado com critério e pronto para entrar.', 'https://www.youtube.com/embed/INMtwEaLyTw', 'youtube', '3-12 meses', 'disponible', 'publicado', '2026-05-22T13:37:56.354105+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-VICENTELOPEZ22273AM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/portada-catalogo-1787232395461.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/portada-catalogo-1787232395461.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-1-1786730703681.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-1-1786730703681.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-2-1786730704608.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-2-1786730704608.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-9-1786730869912.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-9-1786730869912.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-4-1786730706444.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-4-1786730706444.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-5-1786730707176.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-5-1786730707176.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-6-1786730708287.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-6-1786730708287.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-7-1786730708864.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-7-1786730708864.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-8-1786730709624.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/vicente-lopez-2227-3a/foto-8-1786730709624.jpg');

  -- Migueletes 680 · 3A · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-MIGUELETES6803AM', 'migueletes-680-3a', v_pub, 'c5a68744-f693-443e-a9b9-3503e1ecd643', 'mediano', 'Migueletes 680 · 3A', 'Migueletes 680', '3A', 'Las Cañitas', 'Las Cañitas', 1200, 45, 45, 2, 1, 1, true, array['Aire acondicionado','Laundry','Ascensor','Terraza o jardín','Seguridad 24hs']::text[], 'Departamento amoblado en Las Cañitas, el microbarrio más cómodo y residencial de Buenos Aires. Rodeado de embajadas, jardines y arquitectura de principios del siglo XX. Silencioso, exclusivo y a metros de la Avenida del Libertador.', 'Furnished apartment in Las Cañitas, Buenos Aires'' most comfortable and residential micro-neighbourhood. Surrounded by embassies, gardens and early-20th-century architecture. Quiet, exclusive and steps from Avenida del Libertador.', 'Apartamento mobiliado em Las Cañitas, o microbairro mais confortável e residencial de Buenos Aires. Rodeado de embaixadas, jardins e arquitetura do início do século XX. Silencioso, exclusivo e a poucos metros da Avenida del Libertador.', null, null, '3-12 meses', 'reservado', 'publicado', '2026-05-22T13:37:49.433186+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-MIGUELETES6803AM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/portada-catalogo-1787232199296.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/portada-catalogo-1787232199296.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-1.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-2.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-3.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-4.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-5.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-6.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-7.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/migueletes-680-3a/foto-7.jpg');

  -- Gorriti 6051 · 1D · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-GORRITI60511DM', 'gorriti-6051-1d', v_pub, '6ace4ff4-59ac-4dfc-ba85-a491a75aa4df', 'mediano', 'Gorriti 6051 · 1D', 'Gorriti 6051', '1D', 'Palermo Hollywood', 'Palermo Hollywood', 1100, 45, 45, 2, 1, 1, true, array['Aire acondicionado','Laundry','Ascensor','Terraza o jardín','Seguridad 24hs']::text[], 'Contrafrente silencioso en Palermo Hollywood. Dos ambientes amoblados y equipados en una de las zonas más codiciadas de la ciudad. Plaza Mafalda a una cuadra, rodeado de cafés de autor y gastronomía de primer nivel.', 'Quiet rear-facing unit in Palermo Hollywood. Furnished and equipped one-bedroom apartment in one of the city''s most coveted areas. Plaza Mafalda one block away, surrounded by specialty cafés and top-tier dining.', 'Fundos silenciosos em Palermo Hollywood. Dois ambientes mobiliados e equipados em uma das zonas mais cobiçadas da cidade. Plaza Mafalda a uma quadra, rodeado de cafés de autor e gastronomia de primeiro nível.', 'https://www.youtube.com/embed/boCF74D3yoM', 'youtube', '3-12 meses', 'reservado', 'publicado', '2026-05-22T13:37:43.218248+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-GORRITI60511DM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/portada-catalogo-1787231838732.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/portada-catalogo-1787231838732.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-1.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-2.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-3.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-4.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-5.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-6.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-7.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-8.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/gorriti-6051-1d/foto-8.jpg');

  -- Bonpland 1976 · PB C · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-BONPLAND1976PBCM', 'bonpland-1976-pb-c', v_pub, 'b679f31d-45b0-4ab4-94db-f2a08e119a11', 'mediano', 'Bonpland 1976 · PB C', 'Bonpland 1976', 'PB C', 'Palermo Hollywood', 'Palermo Hollywood', 1000, 62, 62, 2, 1, 1, true, array['Aire acondicionado','Laundry','Ascensor','Terraza o jardín']::text[], 'Unidad en planta baja con acceso independiente en el corazón de Palermo Hollywood. Amoblada y equipada, lista para entrar. A metros de los mejores restaurantes y bares de autor del distrito audiovisual de Buenos Aires.', 'Ground-floor unit with independent access in the heart of Palermo Hollywood. Furnished and equipped, move-in ready. Steps from the best restaurants and signature bars in Buenos Aires'' audiovisual district.', 'Unidade no térreo com acesso independente no coração de Palermo Hollywood. Mobiliada e equipada, pronta para entrar. A poucos metros dos melhores restaurantes e bares de autor do distrito audiovisual de Buenos Aires.', null, null, '3-12 meses', 'reservado', 'publicado', '2026-05-22T13:37:37.961947+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-BONPLAND1976PBCM'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/portada-catalogo-1787231655735.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/portada-catalogo-1787231655735.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-1.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-2.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-3.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-4.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-5.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-6.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/bonpland-1976-pb-c/foto-6.jpg');

  -- Medrano 333 · 7A · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-MEDRANO3337AL', 'medrano-333-7a', v_pub, '6715a22f-f983-47ef-94f4-7839781dc19c', 'alquiler', 'Medrano 333 · 7A', 'Medrano 333', '7A', 'Almagro', 'Almagro', 1800, 85, 85, 4, 3, 2, true, array['Aire acondicionado','Pet friendly','Laundry','Seguridad 24hs','Ascensor','Cochera','Amoblado']::text[], '*Expensas y Servicios a cargo del inquilino. 
Departamento domotizado con balcón corrido y cochera. Totalmente amoblado y equipado, con sistema de domótica integrado y control por voz mediante Alexa. Doble vidrio, cava de vinos y aspiradora robot son algunos de los agregados que hacen de esta propiedad, una oportunidad única. En Almagro, uno de los barrios más auténticos de Buenos Aires, con acceso inmediato a Corrientes, el Teatro Colón y el centro porteño.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', '*Building fees and utilities paid by tenant.
Smart-home apartment with wraparound balcony and parking space. Fully furnished and equipped, with integrated home automation and voice control via Alexa. Double glazing, a wine cellar and a robot vacuum are some of the extras that make this property one of a kind. In Almagro, one of Buenos Aires'' most authentic neighbourhoods, with immediate access to Corrientes Ave, the Teatro Colón and downtown.', '*Condomínio e serviços por conta do inquilino.
Apartamento com automação residencial, varanda corrida e vaga de garagem. Totalmente mobiliado e equipado, com sistema de domótica integrado e controle por voz via Alexa. Vidro duplo, adega de vinhos e aspirador robô são alguns dos extras que fazem deste imóvel algo único. Em Almagro, um dos bairros mais autênticos de Buenos Aires, com acesso imediato à Corrientes, ao Teatro Colón e ao centro portenho.', 'https://www.youtube.com/embed/X9bHJmPwJYg', 'youtube', 'A partir de 2 años', 'disponible', 'publicado', '2026-05-22T13:37:30.327643+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-MEDRANO3337AL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/portada-catalogo-1787232522688.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/portada-catalogo-1787232522688.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-1.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-2.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-3.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-4.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-5.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-6.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-7.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-8.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/medrano-333-7a/foto-8.jpg');

  -- Austria 1938 · 2B · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-AUSTRIA19382BL', 'austria-1938-2b', v_pub, '7ff93f37-9baf-4f5a-8f02-3ed4b90ef511', 'alquiler', 'Austria 1938 · 2B', 'Austria 1938', '2B', 'Recoleta', 'Recoleta', 750, 58, 58, 2, 1, 1, false, array['Pileta','Gimnasio','Spa / Sauna','SUM','Ascensor','Terraza o jardín','Conserje 24hs','Seguridad 24hs','Aire acondicionado','Pet friendly','Bicicletero','Parrilla','Laundry']::text[], 'Donde Recoleta y Palermo se encuentran en su mejor versión. Piscina en último piso, solarium, sauna, gimnasio, dos SUM, parrilla, cochera con elevador y guarda-bicicletas. 1 ambiente muy amplio, dividido. Con baño completo y toilette. Luminoso, bien distribuido con terminaciones de primer nivel. A estrenar. Disponible para alquiler tradicional de 2 años, sin muebles.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', 'Where Recoleta and Palermo meet at their finest. Rooftop pool, solarium, sauna, gym, two common rooms, BBQ area, car lift parking and bike storage. Very spacious partitioned studio, with full bathroom and guest toilet. Bright, well laid out, with top-quality finishes. Brand new. Available for a traditional 2-year lease, unfurnished.', 'Onde Recoleta e Palermo se encontram na sua melhor versão. Piscina no último andar, solário, sauna, academia, dois salões de festas, churrasqueira, garagem com elevador e bicicletário. Estúdio muito amplo, com divisória. Com banheiro completo e lavabo. Luminoso, bem distribuído, com acabamentos de primeiro nível. Novo, nunca habitado. Disponível para aluguel tradicional de 2 anos, sem mobília.', null, null, 'A partir de 2 años', 'reservado', 'publicado', '2026-05-22T13:37:10.514649+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-AUSTRIA19382BL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-1.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-2.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-3.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-4.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-5.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-6.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-7.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-8.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-8.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-9.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-9.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-10.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-10.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-11.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-11.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-12.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2b/foto-12.jpg');

  -- Austria 1938 · 2D · alquiler
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-AUSTRIA19382DL', 'austria-1938-2d', v_pub, '166b5915-3d07-4b03-9595-f26ec1a1295e', 'alquiler', 'Austria 1938 · 2D', 'Austria 1938', '2D', 'Recoleta', 'Recoleta', 750, 58, 58, 2, 1, 1, false, array['Pileta','Gimnasio','Spa / Sauna','SUM','Ascensor','Terraza o jardín','Conserje 24hs','Seguridad 24hs','Aire acondicionado','Pet friendly','Bicicletero','Parrilla','Laundry']::text[], 'Donde Recoleta y Palermo se encuentran en su mejor versión. Piscina en último piso, solarium, sauna, gimnasio, dos SUM, parrilla, cochera con elevador y guarda-bicicletas. 1 ambiente muy amplio, dividido. Con baño completo y toilette. Luminoso, bien distribuido con terminaciones de primer nivel. A estrenar. Disponible para alquiler tradicional de 2 años, sin muebles.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', 'Where Recoleta and Palermo meet at their finest. Rooftop pool, solarium, sauna, gym, two common rooms, BBQ area, car lift parking and bike storage. Very spacious partitioned studio, with full bathroom and guest toilet. Bright, well laid out, with top-quality finishes. Brand new. Available for a traditional 2-year lease, unfurnished.', 'Onde Recoleta e Palermo se encontram na sua melhor versão. Piscina no último andar, solário, sauna, academia, dois salões de festas, churrasqueira, garagem com elevador e bicicletário. Estúdio muito amplo, com divisória. Com banheiro completo e lavabo. Luminoso, bem distribuído, com acabamentos de primeiro nível. Novo, nunca habitado. Disponível para aluguel tradicional de 2 anos, sem mobília.', null, null, 'A partir de 2 años', 'reservado', 'publicado', '2026-05-22T13:36:59.82824+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-AUSTRIA19382DL'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-1.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-1.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-2.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-2.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-3.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-3.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-4.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-4.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-5.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-5.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-6.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-6.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-7.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-7.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-8.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-8.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-9.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-9.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-10.jpg', 9 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-10.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-11.jpg', 10 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-11.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-12.jpg', 11 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/austria-1938-2d/foto-12.jpg');

  -- Juana Manso 1551 · 507 · mediano
  insert into portal.avisos (codigo, slug, publicador_id, propiedad_id, operacion, titulo, direccion, unidad, barrio, zona, precio, m2_total, m2_cubierto, ambientes, dormitorios, banos, amoblado, amenities, descripcion, descripcion_en, descripcion_pt, video_url, video_tipo, plazo, estado, estado_curacion, publicado_en)
  values ('BA-JUANAMANSO1551507M', 'juana-manso-1551-507', v_pub, 'db998671-fc3b-4234-909f-3d27476c1b6b', 'mediano', 'Juana Manso 1551 · 507', 'Juana Manso 1551', '507', 'Puerto Madero', 'Puerto Madero', 2500, 65, 65, 2, 1, 1, true, array['Pileta','Gimnasio','SUM','Cochera','Ascensor','Terraza o jardín','Conserje 24hs','Seguridad 24hs','Aire acondicionado','Pet friendly','Bicicletero','Parrilla','Laundry','Baulera','Amoblado']::text[], '2 ambientes en Puerto Madero. Cuenta con cocina y barra desayunador, amplio living, dormitorio principal en suite, baño completo y toilette secundario. Balcón con inigualable vista. El edificio posee piscina para huéspedes, sector solárium y parrillas, SUM, gimnasio totalmente equipado y área de esparcimiento con pool y tejo. Además cuenta con cochera propia y sistema de seguridad 24 horas.', 'One-bedroom apartment in Puerto Madero. Features a kitchen with breakfast bar, spacious living room, en-suite main bedroom, full bathroom and guest toilet. Balcony with unbeatable views. The building offers a guest pool, solarium and BBQ area, common room, fully equipped gym and a games area with billiards and tejo. It also includes a private parking space and 24-hour security.', '2 ambientes em Puerto Madero. Conta com cozinha e bancada para café da manhã, living amplo, quarto principal em suíte, banheiro completo e lavabo. Varanda com vista incomparável. O edifício possui piscina para hóspedes, solário e churrasqueira, salão de festas, academia totalmente equipada e área de lazer com bilhar e tejo. Conta ainda com vaga de garagem própria e segurança 24 horas.', null, null, '3-12 meses', 'disponible', 'publicado', '2026-05-22T12:54:24.378664+00:00')
  on conflict (codigo) do nothing
  returning id into v_aviso;
  if v_aviso is null then select id into v_aviso from portal.avisos where codigo = 'BA-JUANAMANSO1551507M'; end if;
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-1-1779454464451.jpg', 0 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-1-1779454464451.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-2-1779460737886.jpg', 1 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-2-1779460737886.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-3-1779454466804.jpg', 2 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-3-1779454466804.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-4-1779454467395.jpg', 3 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-4-1779454467395.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-5-1779454468245.jpg', 4 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-5-1779454468245.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-6-1779454468768.jpg', 5 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-6-1779454468768.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-7-1779454469919.jpg', 6 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-7-1779454469919.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-8-1779454470456.jpg', 7 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-8-1779454470456.jpg');
  insert into portal.fotos (aviso_id, url, orden) select v_aviso, 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-9-1779454471028.jpg', 8 where not exists (select 1 from portal.fotos where aviso_id = v_aviso and url = 'https://nmrjyyrhwjroonrppnka.supabase.co/storage/v1/object/public/imagenes-propiedades/juana-manso-1551-507/foto-9-1779454471028.jpg');

  raise notice 'carga lista: % avisos, % fotos', (select count(*) from portal.avisos), (select count(*) from portal.fotos);
end
$seed$;
