-- =====================================================================
-- BAIREN · Portal · reparación de textos y zonas
--
-- Al pegar seed-avisos.sql en el editor de Supabase, los acentos se rompieron:
-- los bytes UTF-8 se leyeron como MacRoman y "Núñez" quedó guardado "N√∫√±ez".
-- Afectó títulos, descripciones, direcciones y barrios. El archivo original en
-- la Mac está sano; lo que se rompió fue el pegado por el portapapeles.
--
-- Este script deshace ese doble encoding y, de paso, normaliza `zona`, que había
-- quedado copiada de `barrio`. Palermo Hollywood no es una zona: la zona es Palermo.
--
-- IMPORTANTE: SUBIR este archivo en el editor SQL de Supabase, NO pegarlo.
-- Si se pega, los acentos se vuelven a romper igual que la primera vez.
--
-- Se puede correr más de una vez sin problema.
-- Generado el 2026-09-07 leyendo el estado real de portal.avisos.
-- =====================================================================

begin;

update portal.avisos set titulo = 'Anchorena 1472 · 4', descripcion = '*Expensas y gastos incluídos excepto luz y gas.

3 Ambientes en Recoleta. Amoblado y equipado.' where codigo = 'BA-ANCHORENA14724M';
update portal.avisos set titulo = 'Arce 223 · 4C', descripcion = 'Vista al Campo de Polo desde el piso 4, en el corazón de Las Cañitas. Todo incluido, precio final.

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

Todo incluido, precio final: alquiler, expensas y gastos en un solo paquete.', descripcion_en = 'View of the Polo Field from the 4th floor, in the heart of Las Cañitas. All included, final price.

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

All included, final price: rent, bills for utilities (gas, electricity etc.) and expenses in one package.', descripcion_pt = 'Vista do Campo de Pólo desde o 4º andar, no coração de Las Cañitas. Tudo incluído, preço final.

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

Tudo incluído, preço final: aluguel, contas de serviços públicos (gás, luz etc.) e despesas em um só pacote.', barrio = 'Las Cañitas', zona = 'Palermo' where codigo = 'BA-ARCE2234CM';
update portal.avisos set titulo = 'Arenales 2208 · 4', descripcion = 'Arenales 2208 — Recoleta

Departamento de 3 ambientes con 91 m², un metraje muy superior al promedio de la tipología: living-comedor amplio y dos dormitorios con buenas dimensiones. Se entrega completamente amoblado, listo para instalarse sin mudanza de por medio. Ideal para familias, parejas, estudiantes y profesionales.

La ubicación es Recoleta en su mejor expresión. A una cuadra de Av. Santa Fe con todo su corredor comercial y gastronómico, y a solo 3 cuadras de Plaza Houssay, la Facultad de Medicina de la UBA y el Hospital de Clínicas: una zona de demanda permanente para médicos, residentes y estudiantes de la salud. El Hospital Alemán queda a pocas cuadras por Av. Pueyrredón.

Para el tiempo libre, el circuito clásico del barrio está todo a distancia caminable: el Cementerio de la Recoleta, la Iglesia del Pilar, el Centro Cultural Recoleta y la feria de Plaza Francia a 5 cuadras, El Ateneo Grand Splendid a 4 y el Museo Nacional de Bellas Artes.' where codigo = 'BA-ARENALES22084M';
update portal.avisos set titulo = 'Argañarás 19', descripcion = 'Edificio Palmera Crespo. Amenities en cuatro plantas y seguridad las 24 horas.
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
• Gimnasio', descripcion_en = 'Palmera Crespo Building. Amenities on four floors and 24-hour security.
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
• Gym', descripcion_pt = 'Edifício Palmeira Crespo. Comodidades em quatro andares e segurança 24 horas.
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
• Ginásio', direccion = 'Argañarás 19' where codigo = 'BA-ARGANARAS19M';
update portal.avisos set titulo = 'Austria 1938 · 10', descripcion = '• PISO COMPLETO DE 110 M² FRENTE A TORRE DECÓ - RECOLETA - 3 AMBIENTES DE CATEGORÍA CON DEPENDENCIA •
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
Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_en = '• COMPLETE APARTMENT OF 110 M² IN FRONT OF TORRE DECÓ - RECOLETA - 3 CATEGORY ROOMS WITH DEPENDENCY •
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
Contact: +54 9 11 2310-6629', descripcion_pt = '• APARTAMENTO COMPLETO DE 110 M² EM FRENTE À TORRE DECÓ - RECOLETA - 3 QUARTOS CATEGORIA COM DEPENDÊNCIA •
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
Contato: +54 9 11 2310-6629' where codigo = 'BA-AUSTRIA193810V';
update portal.avisos set titulo = 'Austria 1938 · 2B', descripcion = 'Donde Recoleta y Palermo se encuentran en su mejor versión. Piscina en último piso, solarium, sauna, gimnasio, dos SUM, parrilla, cochera con elevador y guarda-bicicletas. 1 ambiente muy amplio, dividido. Con baño completo y toilette. Luminoso, bien distribuido con terminaciones de primer nivel. A estrenar. Disponible para alquiler tradicional de 2 años, sin muebles.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_pt = 'Onde Recoleta e Palermo se encontram na sua melhor versão. Piscina no último andar, solário, sauna, academia, dois salões de festas, churrasqueira, garagem com elevador e bicicletário. Estúdio muito amplo, com divisória. Com banheiro completo e lavabo. Luminoso, bem distribuído, com acabamentos de primeiro nível. Novo, nunca habitado. Disponível para aluguel tradicional de 2 anos, sem mobília.', plazo = 'A partir de 2 años' where codigo = 'BA-AUSTRIA19382BL';
update portal.avisos set titulo = 'Austria 1938 · 2D', descripcion = 'Donde Recoleta y Palermo se encuentran en su mejor versión. Piscina en último piso, solarium, sauna, gimnasio, dos SUM, parrilla, cochera con elevador y guarda-bicicletas. 1 ambiente muy amplio, dividido. Con baño completo y toilette. Luminoso, bien distribuido con terminaciones de primer nivel. A estrenar. Disponible para alquiler tradicional de 2 años, sin muebles.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_pt = 'Onde Recoleta e Palermo se encontram na sua melhor versão. Piscina no último andar, solário, sauna, academia, dois salões de festas, churrasqueira, garagem com elevador e bicicletário. Estúdio muito amplo, com divisória. Com banheiro completo e lavabo. Luminoso, bem distribuído, com acabamentos de primeiro nível. Novo, nunca habitado. Disponível para aluguel tradicional de 2 anos, sem mobília.', plazo = 'A partir de 2 años' where codigo = 'BA-AUSTRIA19382DL';
update portal.avisos set titulo = 'Austria 1938 · 5 B', descripcion = 'Donde Recoleta y Palermo se encuentran en su mejor versión. Piscina en último piso, solarium, sauna, gimnasio, dos SUM, parrilla y guarda-bicicletas. 1 ambiente muy amplio, dividido. Con baño completo y toilette. Luminoso, bien distribuido con terminaciones de primer nivel. A estrenar. Disponible para alquiler temporal, amueblado.', descripcion_pt = 'Onde Recoleta e Palermo se encontram na sua melhor versão. Piscina no último andar, solário, sauna, academia, dois salões de festas, churrasqueira e bicicletário. Estúdio muito amplo, com divisória. Com banheiro completo e lavabo. Luminoso, bem distribuído, com acabamentos de primeiro nível. Novo, nunca habitado. Disponível para aluguel por temporada, mobiliado.' where codigo = 'BA-AUSTRIA19385BM';
update portal.avisos set titulo = 'Av. Medrano 1254 · 4 D', descripcion = 'Edificio premium a estrenar en Av. Medrano, en el límite con Palermo. 
El edificio es otro nivel: pileta en rooftop con reposeras y vista a Buenos Aires, terraza jardín, gimnasio al aire libre, SUM y lobby de acceso con sillones.
 Todo se accede con huella digital — sin llaves, sin tarjetas.

A metros de Thames y del polo gastronómico de Palermo.
Amoblado · Todos los servicios incluidos · Sin garantía propietaria ·', descripcion_en = 'Brand-new premium building on Av. Medrano, on the border with Palermo.
The building is next level: rooftop pool with sun loungers and views over Buenos Aires, garden terrace, outdoor gym, common room and a lobby lounge.
Everything opens with your fingerprint — no keys, no cards.

Steps from Thames street and Palermo''s gastronomic hub.
Furnished · All utilities included · No guarantor required ·', descripcion_pt = 'Edifício premium novo na Av. Medrano, no limite com Palermo.
O edifício é outro nível: piscina no rooftop com espreguiçadeiras e vista para Buenos Aires, terraço jardim, academia ao ar livre, salão de festas e lobby com poltronas.
Tudo se acessa com digital — sem chaves, sem cartões.

A poucos metros da Thames e do polo gastronômico de Palermo.
Mobiliado · Todos os serviços incluídos · Sem exigência de fiador ·', zona = 'Palermo' where codigo = 'BA-AVMEDRANO12544DM';
update portal.avisos set titulo = 'Av. Santa Fe 4866 · 12 C', descripcion = 'Ubicado en un piso 12, se encuentra este departamento completamente renovado y diseñado con estilo. Un departamento ideal para profesionales que valoran el diseño, la luz natural y un espacio cómodo y tranquilo tanto para vivir como para trabajar remoto.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_pt = 'No 12º andar, este apartamento completamente renovado e decorado com estilo. Ideal para profissionais que valorizam o design, a luz natural e um espaço confortável e tranquilo tanto para morar quanto para trabalhar remoto.', plazo = 'A partir de 2 años' where codigo = 'BA-AVSANTAFE486612CL';
update portal.avisos set titulo = 'Bonpland 1976 · PB C', descripcion = 'Unidad en planta baja con acceso independiente en el corazón de Palermo Hollywood. Amoblada y equipada, lista para entrar. A metros de los mejores restaurantes y bares de autor del distrito audiovisual de Buenos Aires.', descripcion_pt = 'Unidade no térreo com acesso independente no coração de Palermo Hollywood. Mobiliada e equipada, pronta para entrar. A poucos metros dos melhores restaurantes e bares de autor do distrito audiovisual de Buenos Aires.', zona = 'Palermo' where codigo = 'BA-BONPLAND1976PBCM';
update portal.avisos set titulo = 'Congreso 2361 · 2 B', descripcion = 'Belgrano · 2 ambientes con terraza propia y cochera.
Valor de expensas $170.000.

48 m² cubiertos muy bien resueltos: living, cocina con balcón, dormitorio en suite y toilette. Pulmón contrafrente amplio y luminoso, con excelente ventilación. A metros de Juramento, las Barrancas y toda la movida del barrio.

Mega terraza propia de 32 m²: el diferencial real de la unidad. Espacio para deck, parrilla y aire libre todo el año.
Cochera en PB incluida. SUM y Piscina con solárium en el piso 15.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_en = 'Belgrano · One-bedroom apartment with private terrace and parking space.
Building fees: $170,000 ARS.

48 m² indoors, very well laid out: living room, kitchen with balcony, en-suite bedroom and guest toilet. Bright, airy rear orientation with excellent ventilation. Steps from Juramento Ave, the Barrancas and everything the neighbourhood has to offer.

Huge 32 m² private terrace: the unit''s real differentiator. Room for a deck, BBQ and outdoor living all year round.
Ground-floor parking space included. Common room and pool with solarium on the 15th floor.', descripcion_pt = 'Belgrano · 2 ambientes com terraço próprio e vaga de garagem.
Valor do condomínio: $170.000.

48 m² cobertos muito bem aproveitados: living, cozinha com balcão, quarto em suíte e lavabo. Fundos amplos e luminosos, com excelente ventilação. A poucos metros da Juramento, das Barrancas e de toda a vida do bairro.

Mega terraço próprio de 32 m²: o verdadeiro diferencial da unidade. Espaço para deck, churrasqueira e ar livre o ano todo.
Vaga de garagem no térreo incluída. Salão de festas e piscina com solário no 15º andar.', barrio = 'Núñez', plazo = 'A partir de 2 años', zona = 'Núñez' where codigo = 'BA-CONGRESO23612BL';
update portal.avisos set titulo = 'Costa Rica 4481 · 3 C', descripcion = 'Frente a Plaza Armenia, en el corazón de Palermo Soho. Una de las zonas más reconocidas de Buenos Aires a nivel mundial, con la mejor gastronomía, diseño y vida cultural de la ciudad — todo a metros de la puerta.
Un ambiente amplio amoblado con balcón en piso 3, cocina equipada y aire acondicionado. El edificio cuenta con parrilla.', descripcion_en = 'Facing Plaza Armenia, in the heart of Palermo Soho. One of Buenos Aires'' most internationally recognized areas, with the city''s best dining, design and cultural life — all steps from your door.
Spacious furnished studio with balcony on the 3rd floor, equipped kitchen and air conditioning. The building has a BBQ area.', descripcion_pt = 'Em frente à Plaza Armenia, no coração de Palermo Soho. Uma das zonas mais reconhecidas de Buenos Aires mundialmente, com a melhor gastronomia, design e vida cultural da cidade — tudo a poucos metros da porta.
Estúdio amplo mobiliado com varanda no 3º andar, cozinha equipada e ar-condicionado. O edifício conta com churrasqueira.', zona = 'Palermo' where codigo = 'BA-COSTARICA44813CM';
update portal.avisos set titulo = 'Francisco Acuña de Figueroa 1560 · 1G', descripcion = '*Valor de expensas: $200.000. 
Ambiente muy amplio en edificio muy tranquilo en zona muy residencial de Palermo. A metros de Av. Córdoba y de Av. Santa Fé, Alto Palermo, Plaza Unidad Latinoamericana y la mejor conectividad de la Ciudad. 

Con Jardín, Piscina, SUM equipado y seguridad 24hs.
Sin Amoblar. 

Click en el botón debajo para coordinar tu visita.
Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_en = '*Building fees: $200,000 ARS.
Very spacious unit in a quiet building, in a residential area of Palermo. Steps from Av. Córdoba and Av. Santa Fe, Alto Palermo mall, Plaza Unidad Latinoamericana and the city''s best transit connections.

With garden, pool, equipped common room and 24-hour security.
Unfurnished.

Click the button below to schedule your visit.', descripcion_pt = '*Valor do condomínio: $200.000.
Ambiente muito amplo em edifício tranquilo, em zona residencial de Palermo. A poucos metros da Av. Córdoba e da Av. Santa Fe, do Alto Palermo, da Plaza Unidad Latinoamericana e da melhor conectividade da cidade.

Com jardim, piscina, salão de festas equipado e segurança 24h.
Sem mobília.

Clique no botão abaixo para agendar sua visita.', direccion = 'Francisco Acuña de Figueroa 1560', plazo = 'A partir de 2 años' where codigo = 'BA-FRANCISCOACUNADEFIGUEROA15601GL';
update portal.avisos set titulo = 'Gallo 1210 · PH', descripcion = 'PH con patio privado propio en pleno Recoleta. Tres ambientes completamente renovados: living amplio con cocina abierta, isla con mesada de granito, campana de acero y equipamiento completo. Smart TV, aire acondicionado y piso de madera en todos los ambientes.
Dormitorio principal con acceso directo al patio, dormitorio secundario con dos camas y baño completo con ducha y mampara de vidrio. Segundo baño con vanitory de madera y ducha separada.
El patio es el diferencial: techado con plantas y sillones. Luz natural todo el día, privacidad total.
A metros de Av. Santa Fe y del polo cultural de Recoleta.
Amoblado · Todos los servicios incluidos · Sin garantía propietaria ·', descripcion_en = 'PH-style apartment with its own private patio in the heart of Recoleta. Three fully renovated rooms: spacious living room with open kitchen, granite-top island, steel range hood and full equipment. Smart TV, air conditioning and wooden floors throughout.
Main bedroom with direct patio access, second bedroom with two beds, and a full bathroom with glass shower screen. Second bathroom with wooden vanity and separate shower.
The patio is the differentiator: covered, with plants and lounge seating. Natural light all day, total privacy.
Steps from Av. Santa Fe and Recoleta''s cultural district.
Furnished · All utilities included · No guarantor required ·', descripcion_pt = 'PH com pátio privado em plena Recoleta. Três ambientes completamente renovados: living amplo com cozinha aberta, ilha com bancada de granito, coifa de aço e equipamento completo. Smart TV, ar-condicionado e piso de madeira em todos os ambientes.
Quarto principal com acesso direto ao pátio, segundo quarto com duas camas e banheiro completo com box de vidro. Segundo banheiro com gabinete de madeira e ducha separada.
O pátio é o diferencial: coberto, com plantas e poltronas. Luz natural o dia todo, privacidade total.
A poucos metros da Av. Santa Fe e do polo cultural de Recoleta.
Mobiliado · Todos os serviços incluídos · Sem exigência de fiador ·' where codigo = 'BA-GALLO1210PHM';
update portal.avisos set titulo = 'Gorriti 6051 · 1D', descripcion = 'Contrafrente silencioso en Palermo Hollywood. Dos ambientes amoblados y equipados en una de las zonas más codiciadas de la ciudad. Plaza Mafalda a una cuadra, rodeado de cafés de autor y gastronomía de primer nivel.', descripcion_en = 'Quiet rear-facing unit in Palermo Hollywood. Furnished and equipped one-bedroom apartment in one of the city''s most coveted areas. Plaza Mafalda one block away, surrounded by specialty cafés and top-tier dining.', descripcion_pt = 'Fundos silenciosos em Palermo Hollywood. Dois ambientes mobiliados e equipados em uma das zonas mais cobiçadas da cidade. Plaza Mafalda a uma quadra, rodeado de cafés de autor e gastronomia de primeiro nível.', zona = 'Palermo' where codigo = 'BA-GORRITI60511DM';
update portal.avisos set titulo = 'Guido 1671 · 1B', descripcion = '*Opción Temporal y amoblado precio paquete: $3500 USD. 

Edificio clásico de principios de siglo con techos altos, a 200 metros de Av. del Libertador y Plaza Francia. Living con vista verde, cocina equipada con mesada de mármol, 2 dormitorios en suite. Dormitorio principal con vestidor propio y baño con jacuzzi y ducha separada. Una propiedad de categoría que combina la arquitectura de otra época con el confort de hoy.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_pt = '*Opção temporada e mobiliado, preço pacote: USD 3.500.

Edifício clássico do início do século, com pé-direito alto, a 200 metros da Av. del Libertador e da Plaza Francia. Living com vista verde, cozinha equipada com bancada de mármore, 2 quartos em suíte. Quarto principal com closet próprio e banheiro com jacuzzi e ducha separada. Um imóvel de categoria que combina a arquitetura de outra época com o conforto de hoje.', plazo = 'A partir de 2 años' where codigo = 'BA-GUIDO16711BL';
update portal.avisos set titulo = 'Huergo 475 · 0709', descripcion = '*Incluye mobiliario.
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
• Espacio comunitario en doble altura en el piso 36', descripcion_en = 'Two rooms in Huergo 475, the Consultatio tower designed by the Adamo-Faiden studio, between San Telmo and Puerto Madero. 7th floor, on Venezuela Street.

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
• AC hall', descripcion_pt = 'Dois quartos em Huergo 475, a torre Consultatio projetada pelo estúdio Adamo-Faiden, entre San Telmo e Puerto Madero. 7º andar, na Rua Venezuela.

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
• Hall AC' where codigo = 'BA-HUERGO4750709M';
update portal.avisos set titulo = 'Juana Manso 1551 · 507', descripcion = '2 ambientes en Puerto Madero. Cuenta con cocina y barra desayunador, amplio living, dormitorio principal en suite, baño completo y toilette secundario. Balcón con inigualable vista. El edificio posee piscina para huéspedes, sector solárium y parrillas, SUM, gimnasio totalmente equipado y área de esparcimiento con pool y tejo. Además cuenta con cochera propia y sistema de seguridad 24 horas.', descripcion_pt = '2 ambientes em Puerto Madero. Conta com cozinha e bancada para café da manhã, living amplo, quarto principal em suíte, banheiro completo e lavabo. Varanda com vista incomparável. O edifício possui piscina para hóspedes, solário e churrasqueira, salão de festas, academia totalmente equipada e área de lazer com bilhar e tejo. Conta ainda com vaga de garagem própria e segurança 24 horas.' where codigo = 'BA-JUANAMANSO1551507M';
update portal.avisos set titulo = 'Juncal 600 · Pisos 10 - 11', descripcion = '*Total de Expensas ($600.000) y servicios a cargo del inquilino. 
Dúplex completamente refaccionado en pisos 10 y 11. 
Doble altura, terminaciones en madera de roble y luz en todos los ambientes.
· Sala de estar con hogar a leña
· Family room con balcón aterrazado y parrilla
· Sauna propio 
· 2 dormitorios en suite + escritorio con baño
· Terraza propia con vista a la ciudad

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_en = '*Total building fees ($600,000 ARS) and utilities paid by tenant.
Fully renovated duplex on the 10th and 11th floors.
Double-height ceilings, oak wood finishes and natural light in every room.
· Living room with wood-burning fireplace
· Family room with terraced balcony and BBQ
· Private sauna
· 2 en-suite bedrooms + study with bathroom
· Private terrace with city views', descripcion_pt = '*Condomínio total ($600.000) e serviços por conta do inquilino.
Dúplex completamente reformado nos andares 10 e 11.
Pé-direito duplo, acabamentos em madeira de carvalho e luz em todos os ambientes.
· Sala de estar com lareira a lenha
· Family room com varanda em terraço e churrasqueira
· Sauna própria
· 2 quartos em suíte + escritório com banheiro
· Terraço próprio com vista para a cidade', plazo = 'A partir de 2 años' where codigo = 'BA-JUNCAL600PISOS1011L';
update portal.avisos set titulo = 'Juramento 3106 · 1C', zona = 'Belgrano' where codigo = 'BA-JURAMENTO31061CM';
update portal.avisos set titulo = 'Lavalle 4022 · 14 C', descripcion = '*Opción Temporal amoblado y equipado: $2500 USD.
 Departamento equipado con cocina separada en Torre con vista panorámica 360º.
Aire acondicionado, garaje, parrilla, piscina olímpica, cancha de tenis, gimnasio, spa y sala de fiestas.
La unidad también tiene cine y sonido Hi Fi (Netflix, Star +, Amazon Prime). 

El alojamiento
Vista de la ciudad desde el piso 14', descripcion_en = '*Short-term option, furnished and equipped: USD 2,500.
Fully equipped apartment with separate kitchen in a tower with 360º panoramic views.
Air conditioning, parking, BBQ area, Olympic pool, tennis court, gym, spa and party room.
The unit also features a home cinema with Hi-Fi sound (Netflix, Star+, Amazon Prime).

The space
City views from the 14th floor', descripcion_pt = '*Opção temporada, mobiliado e equipado: USD 2.500.
Apartamento equipado com cozinha separada em torre com vista panorâmica 360º.
Ar-condicionado, garagem, churrasqueira, piscina olímpica, quadra de tênis, academia, spa e salão de festas.
A unidade também tem cinema e som Hi-Fi (Netflix, Star+, Amazon Prime).

A acomodação
Vista da cidade desde o 14º andar' where codigo = 'BA-LAVALLE402214CM';
update portal.avisos set titulo = 'Malabia 2233 · 3 B', descripcion = '3 ambientes en Palermo Soho. Ubicación estratégica en el corazón del barrio más buscado
por locales y viajeros. Amoblado y listo para ingresar.', descripcion_pt = '3 ambientes em Palermo Soho. Localização estratégica no coração do bairro mais procurado por locais e viajantes. Mobiliado e pronto para entrar.', zona = 'Palermo' where codigo = 'BA-MALABIA22333BM';
update portal.avisos set descripcion = 'Unidad amoblada y equipada en edificio residencial y moderno en Núñez. 
A pasos: Av. Cabildo y la mejor conectividad del barrio. 

Zona tranquila, arbolada, a minutos de Belgrano y San Isidro. Monoambiente a estrenar con todos los servicios incluidos. Menos Luz.', descripcion_en = 'Furnished and fully equipped unit in a modern residential building in Núñez.
Steps away: Av. Cabildo and the neighbourhood''s best transit connections.

Quiet, tree-lined area, minutes from Belgrano and San Isidro. Brand-new studio with all utilities included.', descripcion_pt = 'Unidade mobiliada e equipada em edifício residencial e moderno em Núñez.
A poucos passos: Av. Cabildo e a melhor conectividade do bairro.

Zona tranquila, arborizada, a minutos de Belgrano e San Isidro. Estúdio novo com todos os serviços incluídos.', barrio = 'Núñez', zona = 'Núñez' where codigo = 'BA-MANUELUGARTE1992M';
update portal.avisos set titulo = 'Medrano 333 · 7A', descripcion = '*Expensas y Servicios a cargo del inquilino. 
Departamento domotizado con balcón corrido y cochera. Totalmente amoblado y equipado, con sistema de domótica integrado y control por voz mediante Alexa. Doble vidrio, cava de vinos y aspiradora robot son algunos de los agregados que hacen de esta propiedad, una oportunidad única. En Almagro, uno de los barrios más auténticos de Buenos Aires, con acceso inmediato a Corrientes, el Teatro Colón y el centro porteño.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_en = '*Building fees and utilities paid by tenant.
Smart-home apartment with wraparound balcony and parking space. Fully furnished and equipped, with integrated home automation and voice control via Alexa. Double glazing, a wine cellar and a robot vacuum are some of the extras that make this property one of a kind. In Almagro, one of Buenos Aires'' most authentic neighbourhoods, with immediate access to Corrientes Ave, the Teatro Colón and downtown.', descripcion_pt = '*Condomínio e serviços por conta do inquilino.
Apartamento com automação residencial, varanda corrida e vaga de garagem. Totalmente mobiliado e equipado, com sistema de domótica integrado e controle por voz via Alexa. Vidro duplo, adega de vinhos e aspirador robô são alguns dos extras que fazem deste imóvel algo único. Em Almagro, um dos bairros mais autênticos de Buenos Aires, com acesso imediato à Corrientes, ao Teatro Colón e ao centro portenho.', plazo = 'A partir de 2 años' where codigo = 'BA-MEDRANO3337AL';
update portal.avisos set titulo = 'Migueletes 680 · 3A', descripcion = 'Departamento amoblado en Las Cañitas, el microbarrio más cómodo y residencial de Buenos Aires. Rodeado de embajadas, jardines y arquitectura de principios del siglo XX. Silencioso, exclusivo y a metros de la Avenida del Libertador.', descripcion_en = 'Furnished apartment in Las Cañitas, Buenos Aires'' most comfortable and residential micro-neighbourhood. Surrounded by embassies, gardens and early-20th-century architecture. Quiet, exclusive and steps from Avenida del Libertador.', descripcion_pt = 'Apartamento mobiliado em Las Cañitas, o microbairro mais confortável e residencial de Buenos Aires. Rodeado de embaixadas, jardins e arquitetura do início do século XX. Silencioso, exclusivo e a poucos metros da Avenida del Libertador.', barrio = 'Las Cañitas', zona = 'Palermo' where codigo = 'BA-MIGUELETES6803AM';
update portal.avisos set titulo = 'Moldes 3018 · 4', descripcion = 'Hermoso 3 ambientes con toilette y baño completo en Núñez. 

Unidad amoblada y equipada. 
Baulera disponible.', descripcion_en = 'Beautiful 2-bedroom apartment with guest toilet and full bathroom in Núñez.

Furnished and fully equipped unit.
Storage room available.', descripcion_pt = 'Lindo apartamento de 3 ambientes com lavabo e banheiro completo em Núñez.

Unidade mobiliada e equipada.
Depósito disponível.', barrio = 'Núñez', zona = 'Núñez' where codigo = 'BA-MOLDES30184M';
update portal.avisos set descripcion = '4 Ambientes en Núñez. 
Amoblado y equipado, con terraza propia, baño completo y Toilette', descripcion_en = '3-bedroom apartment in Núñez.
Furnished and fully equipped, with private terrace, full bathroom and guest toilet.', descripcion_pt = '4 ambientes em Núñez.
Mobiliado e equipado, com terraço próprio, banheiro completo e lavabo.', barrio = 'Núñez', zona = 'Núñez' where codigo = 'BA-MOLDES3018M';
update portal.avisos set titulo = 'Niceto Vega 5720 · 4º', descripcion = 'Monoambiente en el edificio Terre, a metros de Bonpland. Piso 4, con pileta en el rooftop y gimnasio con vista. Todo incluido.

Niceto Vega 5720, en el tramo alto de Palermo Hollywood: la gastronomía de Bonpland y Fitz Roy a la vuelta, Honduras a tres cuadras y Av. Córdoba a una. El Mercado de las Pulgas queda a pocas cuadras por Niceto Vega.

Los 34 m² están bien resueltos: un ventanal de piso a techo con vista abierta a la ciudad, la cama contra la pared larga y la cocina integrada al fondo, con una mesa de madera clara para comer o trabajar. Pisos símil madera en tono claro, muebles de cocina color topo y mesada blanca. Amoblado y equipado, listo para entrar.

• Ambiente principal con cama queen, respaldo tapizado y TV
• Cocina integrada con anafe, horno, microondas y cafetera
• Mesa de madera con sillas, para comer o trabajar
• Dos sillones de ratán y escritorio
• Placard en el ingreso
• Baño completo con mesada larga y revestimiento gris de gran formato
• Aire acondicionado frío/c', descripcion_en = 'Studio apartment in the Terre building, a few meters from Bonpland. Floor 4, with a pool on the rooftop and gym with a view. All inclusive.

Niceto Vega 5720, in the upper section of Palermo Hollywood: the gastronomy of Bonpland and Fitz Roy around the corner, Honduras three blocks away and Av. Córdoba one block away. The Flea Market is a few blocks away on Niceto Vega.

The 34 m² are well resolved: a floor-to-ceiling window with an open view of the city, the bed against the long wall and the kitchen integrated in the back, with a light wooden table for eating or working. Light wood-look floors, taupe kitchen furniture and white countertops. Furnished and equipped, ready to move in.

• Main room with queen bed, upholstered backrest and TV
• Integrated kitchen with stove, oven, microwave and coffee maker
• Wooden table with chairs, for eating or working
• Two rattan armchairs and desk
• Closet at the entrance
• Full bathroom with long countertop and large-format gray coating
• Air conditioning cold/c', descripcion_pt = 'Apartamento estúdio no edifício Terre, a poucos metros de Bonpland. Piso 4, com piscina na cobertura e ginásio com vista. Tudo incluído.

Niceto Vega 5720, na parte alta de Palermo Hollywood: a gastronomia de Bonpland e Fitz Roy na esquina, Honduras a três quarteirões e Av. Córdoba a um quarteirão de distância. O Mercado de Pulgas fica a poucos quarteirões de Niceto Vega.

Os 34 m² são bem resolvidos: janela do chão ao teto com vista aberta para a cidade, a cama encostada na longa parede e a cozinha integrada nos fundos, com mesa de madeira clara para comer ou trabalhar. Pisos de madeira clara, móveis de cozinha cinza e bancadas brancas. Mobilado e equipado, pronto a habitar.

• Quarto principal com cama queen-size, encosto estofado e TV
• Cozinha integrada com fogão, forno, micro-ondas e cafeteira
• Mesa de madeira com cadeiras, para comer ou trabalhar
• Duas poltronas e mesa de vime
• Armário na entrada
• Banheiro completo com bancada longa e revestimento cinza de grande formato
• Ar condicionado frio/c', unidad = '4º', zona = 'Palermo' where codigo = 'BA-NICETOVEGA57204M';
update portal.avisos set titulo = 'Niceto Vega 5932 · 6A', descripcion = 'Amplio monoambiente dividido en Palermo Hollywood a metros de Plaza Mafalda. 
Edificio moderno, acceso con clave alfanumérica y amoblado de primer nivel.', descripcion_pt = 'Amplo estúdio com divisória em Palermo Hollywood, a poucos metros da Plaza Mafalda.
Edifício moderno, acesso com senha alfanumérica e mobiliário de primeiro nível.', zona = 'Palermo' where codigo = 'BA-NICETOVEGA59326AM';
update portal.avisos set titulo = 'Núñez 3100 · 1', descripcion = 'Complejo de diseño, super tranquilo con amenities y pocas unidades.
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

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_en = 'Design complex, very quiet, with amenities and few units.
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
• Gym and laundry', descripcion_pt = 'Complexo de design, super tranquilo, com comodidades e poucas unidades.
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
• Academia e lavanderia', direccion = 'Núñez 3100', barrio = 'Núñez', plazo = 'A partir de 2 años', zona = 'Núñez' where codigo = 'BA-NUNEZ31001L';
update portal.avisos set titulo = 'Paraguay 1484 · 4B', descripcion = 'Paraguay 1484, 4° B — Recoleta / Barrio Norte

Monoambiente de 32 m² totalmente refaccionado con estética moderna, amoblado y equipado: llegás con la valija y ya estás viviendo. El ambiente es funcional y luminoso, con cocina equipada, baño completo renovado y todo el mobiliario necesario para instalarse.

La ubicación es de las mejores del corredor universitario de Buenos Aires. La UCES está a una cuadra sobre la misma calle, las sedes de la USAL (Marcelo T. de Alvear, Callao y Viamonte) quedan entre 2 y 6 cuadras, y la Facultad de Medicina de la UBA a solo 7 cuadras caminando por Paraguay. Ideal para estudiantes y profesionales jóvenes.

A una cuadra tenés Av. Santa Fe y Av. Córdoba con todo el comercio, gastronomía y líneas de colectivo; el subte D y B (estaciones Tribunales y Callao) a menos de 5 cuadras conecta con toda la ciudad. Y para tiempos libres: Teatro Colón a 600 metros,' where codigo = 'BA-PARAGUAY14844BM';
update portal.avisos set titulo = 'Paraguay 3734 · 3', descripcion = '*Valor de expensas: $250.000. 
Edificio con 1 año de antigüedad.
Monoambiente dividido y muy espacioso en Palermo.
Además de la Habitación dividida en suite, la unidad cuenta con toilette y vestidor. 
Piscina en piso 10 y gimnasio.

Corredor responsable: Maximiliano Matzkin, Matrícula CUCICBA Nº 7527 Maxim rentals.', descripcion_pt = '*Valor do condomínio: $250.000.
Edifício com 1 ano de construção.
Estúdio com divisória, muito espaçoso, em Palermo.
Além do quarto separado em suíte, a unidade conta com lavabo e closet.
Piscina no 10º andar e academia.', plazo = 'A partir de 2 años' where codigo = 'BA-PARAGUAY37343L';
update portal.avisos set titulo = 'Paraguay 4419 · PB', descripcion = 'Planta baja reciclada a nuevo en el corazón de Palermo, con un patio propio de piedras y ladrillo visto rodeado de plantas — un rincón al aire libre difícil de encontrar en plena ciudad, conectado directo al comedor por una puerta vidriada.

Los 52 m² están bien resueltos: living-comedor con la cocina semi-integrada detrás de una barra de madera, dormitorio con parquet de roble y placard de espejos, y un baño renovado por completo en microcemento azul, con ducha a ras de piso y bacha sobre madera.

Amoblado y equipado, con aire acondicionado. Acepta mascotas.

Alquiler a mediano plazo, de 3 a 12 meses, el precio publicado incluye expensas y servicios.', descripcion_en = 'Newly renovated ground floor in the heart of Palermo, with its own patio made of stones and exposed brick surrounded by plants — an outdoor corner that is difficult to find in the heart of the city, connected directly to the dining room through a glass door.

The 52 m² are well resolved: living-dining room with a semi-integrated kitchen behind a wooden bar, a bedroom with oak parquet and a mirrored closet, and a bathroom completely renovated in blue microcement, with a walk-in shower and a wooden sink.

Furnished and equipped, with air conditioning. Accepts pets.

Medium-term rental, from 3 to 12 months, the published price includes expenses and services.', descripcion_pt = 'Rés-do-chão recentemente remodelado no coração de Palermo, com pátio próprio de pedras e tijolos à vista rodeado de plantas - um recanto exterior difícil de encontrar no coração da cidade, ligado directamente à sala de jantar através de uma porta de vidro.

Os 52 m² estão bem resolvidos: sala de jantar com cozinha semi-integrada atrás de balcão de madeira, quarto com parquet de carvalho e armário espelhado e banheiro totalmente reformado em microcimento azul, com box amplo e pia de madeira.

Mobilado e equipado, com ar condicionado. Aceita animais de estimação.

Aluguer de média duração, de 3 a 12 meses, o preço publicado inclui despesas e serviços.' where codigo = 'BA-PARAGUAY4419PBM';
update portal.avisos set titulo = 'Peña 2528', descripcion = 'Piso alto al frente, en el corazón de Recoleta. Con cochera cubierta.

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
No se permiten mascotas.', direccion = 'Peña 2528' where codigo = 'BA-PENA2528M';
update portal.avisos set titulo = 'Uruguay 115 · 6 - 3', descripcion_pt = 'Um apartamento de seis ambientes com dimensões que já não se encontram. Dois quartos amplos. Um deles com duas camas e escritório integrado. Cozinha separada. Sala de jantar ampla. Espaço de verdade para morar, trabalhar e receber.' where codigo = 'BA-URUGUAY11563M';
update portal.avisos set titulo = 'Uruguay 390 · 18' where codigo = 'BA-URUGUAY39018M';
update portal.avisos set titulo = 'Vicente López 2227 · 3A', descripcion = 'Departamento amoblado en el corazón de Recoleta. A metros del museo de bellas artes y del cementerio más famoso de latinoamérica. Equipado, amoblado con criterio y listo para ingresar.', descripcion_pt = 'Apartamento mobiliado no coração de Recoleta. A poucos metros do Museu de Belas Artes e do cemitério mais famoso da América Latina. Equipado, mobiliado com critério e pronto para entrar.', direccion = 'Vicente López 2227' where codigo = 'BA-VICENTELOPEZ22273AM';

commit;
