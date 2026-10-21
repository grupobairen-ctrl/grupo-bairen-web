-- Deshace migracion-web-06: vuelve cada unidad al plazo que tenía el 21/10/2026
-- antes de pasar todas las de mediano plazo (menos Álvarez Thomas 800) a '3-24 meses'.
begin;
update propiedades set plazo = '6-12 meses' where id = '7605e874-c6b4-4619-88d6-2528daad08af';  -- Acevedo 500
update propiedades set plazo = '3-12 meses' where id = 'edb9b6d7-c38e-4776-a024-8fdae1a34b2b';  -- Anchorena 1472 4
update propiedades set plazo = '3-12 meses' where id = '8e5be7c4-e442-4e44-87c5-39994525ab35';  -- Arce 223 4C
update propiedades set plazo = '3-12 meses' where id = '61f1d90f-f24d-48be-8b62-f9c8eac7b6ec';  -- Arenales 2208 4
update propiedades set plazo = '3-12 meses' where id = '4e6e630e-a1f3-45aa-a831-4788448e4363';  -- Argañarás 19
update propiedades set plazo = '3-12 meses' where id = '873368b3-a2f9-493d-ab26-03ba47e45ce4';  -- Arias 1970
update propiedades set plazo = '3-12 meses' where id = '96773ebe-c3ae-43d4-ad00-62587f08b680';  -- Arribeños 3758 1
update propiedades set plazo = '3 - 24 meses' where id = '166b5915-3d07-4b03-9595-f26ec1a1295e';  -- Austria 1938 2D
update propiedades set plazo = '3-12 meses' where id = '0dad9fa5-e39d-4b9a-be60-49cda4868358';  -- Austria 1938 4 B
update propiedades set plazo = '3-12 meses' where id = '7f429e75-83c3-43ce-8eaf-0eeeec74773b';  -- Austria 1938 5 B
update propiedades set plazo = '3-12 meses' where id = 'e59bcbcb-3dd8-44ed-8fbe-ded196e6cf5c';  -- Av. Córdoba 600
update propiedades set plazo = '3-12 meses' where id = 'c7dac31b-ac91-4979-ae46-08064bd253c1';  -- Av. Crámer y Juramento
update propiedades set plazo = '3-12 meses' where id = '709daa3b-2f96-405d-92ad-4d450b2056b4';  -- Av. de Mayo 800
update propiedades set plazo = '3-12 meses' where id = '8b013e60-0f99-4c26-a3c4-bc540357798d';  -- Av. del Libertador y Basavilbaso
update propiedades set plazo = '3-12 meses' where id = '5ae2b51e-5321-45fb-bb81-24862047476e';  -- Av. Entre Ríos 900
update propiedades set plazo = '3-12 meses' where id = '13a3a74a-2616-4d4b-b778-10f441c2acb7';  -- Av. Juan B. Justo 3000
update propiedades set plazo = '3-12 meses' where id = 'c11fcef3-3541-4c81-8902-dd0623c64d4d';  -- Av. Medrano 1254 4 D
update propiedades set plazo = '3-12 meses' where id = '14bd432a-8f08-4433-9985-61af012b9084';  -- Av. Raúl Scalabrini Ortiz 1160
update propiedades set plazo = '3-12 meses' where id = '2f1527f4-74ef-4ad1-b45a-781c99860188';  -- Av. Santa Fe 4000
update propiedades set plazo = '3-12 meses' where id = '2908c596-a1ec-4297-8352-c0fdacdfb1d3';  -- Av. Santa Fe 4866 12 C
update propiedades set plazo = '3-12 meses' where id = 'ab835f79-251a-4925-92f2-c231943e6a55';  -- Ayacucho 1000
update propiedades set plazo = '3-12 meses' where id = '1de45d5b-7efd-4b6f-be31-b7f235bc7d11';  -- Azcuenaga 1068 5
update propiedades set plazo = '3-12 meses' where id = 'ce6cdb5e-b1f0-4f4a-9e35-9cf69c58d17d';  -- Bernardo de Irigoyen 700
update propiedades set plazo = '3-12 meses' where id = 'efa8b44b-fdf4-4948-8254-64f1b2192a41';  -- Beruti 4200
update propiedades set plazo = '3-12 meses' where id = '6d060d0f-fa30-400a-bb2c-e651f607e121';  -- Billinghurst 1000
update propiedades set plazo = '3-12 meses' where id = '9bebdcca-8c02-40a1-97c9-8937239fdcac';  -- Blanco Encalada 1800
update propiedades set plazo = '3-12 meses' where id = 'b679f31d-45b0-4ab4-94db-f2a08e119a11';  -- Bonpland 1976 PB C
update propiedades set plazo = '3-12 meses' where id = '5cc3f6bf-e0f1-4380-910e-ba12a1d82e28';  -- Bonpland 2000
update propiedades set plazo = '3-12 meses' where id = '4ee87e51-e40b-4e9c-a29e-cdbe6b0fe6ae';  -- Borges 2400
update propiedades set plazo = '3-12 meses' where id = 'b6056db8-5a37-4ffd-bed3-1eb06f0e7502';  -- Bulnes 2700
update propiedades set plazo = '3-12 meses' where id = '4a3f8596-cbb0-48a2-a0c3-1b0ab4ff183f';  -- Carlos Pellegrini 300
update propiedades set plazo = '3-12 meses' where id = '679b4db7-d0fc-4181-9870-e120c498949f';  -- Carranza 1284 5
update propiedades set plazo = '3-12 meses' where id = '19f66e1b-9732-4393-b638-cc0bf07253e5';  -- Charcas 3036
update propiedades set plazo = '3-12 meses' where id = 'cf6fb5b7-71eb-41da-a4b0-98ca90ddc71c';  -- Ciudad de la Paz 280
update propiedades set plazo = '3-12 meses' where id = '7066fd21-0ada-4692-8b8a-31ba2f968351';  -- Conde 2190
update propiedades set plazo = '3-12 meses' where id = '542a2237-628d-42c2-bfb3-ffac2412fb41';  -- Congreso 2361 2 B
update propiedades set plazo = '3-12 meses' where id = '479d1f38-745d-4859-a370-6ba2c18daa7f';  -- Costa Rica 4481 3 C
update propiedades set plazo = '3-12 meses' where id = 'd11e3dc0-4a36-4296-8c0a-8a46c77567cb';  -- Deheza 1648
update propiedades set plazo = '3-12 meses' where id = '33d80dbd-e568-41cc-9698-ad1a3d684a50';  -- Deheza 1671
update propiedades set plazo = '3-12 meses' where id = '9fa978f3-cf56-42f4-8dc0-dc57ac8c89de';  -- Echeverría 1300
update propiedades set plazo = '3-12 meses' where id = 'cb2676ec-9309-400d-b6cd-94b72c562192';  -- Ecuador 1200
update propiedades set plazo = '3-12 meses' where id = '2c69b317-911b-4476-8ccb-205e53a05b92';  -- Figueroa Alcorta 3300 2
update propiedades set plazo = '3-12 meses' where id = '17f2ad31-20bd-4b4a-8009-2fdb8c5069aa';  -- Francisco Acuña de Figueroa 1560 1G
update propiedades set plazo = '3-12 meses' where id = '40efa59f-65e6-4d7d-8248-df8caae65d81';  -- Freire 2200
update propiedades set plazo = '3-12 meses' where id = '74b9f657-8152-4dff-9bab-7935636eb04c';  -- Gallo 1210 PH
update propiedades set plazo = '3-12 meses' where id = '8fd2c525-2ae0-40fe-9777-035b289afdf9';  -- Godoy Cruz 1800
update propiedades set plazo = '3-12 meses' where id = '39b5a9bc-70eb-4ca4-95ce-949e86f024e0';  -- Godoy Cruz y Paraguay
update propiedades set plazo = '3-12 meses' where id = '6ace4ff4-59ac-4dfc-ba85-a491a75aa4df';  -- Gorriti 6051 1D
update propiedades set plazo = '3-12 meses' where id = '59a74507-6e4f-4f64-b85b-ed0ea22797b5';  -- Guatemala 5500 2 amb
update propiedades set plazo = '3-12 meses' where id = '01c9b564-dfd0-4cc9-b8cb-3566e0d46d5d';  -- Guatemala 5800
update propiedades set plazo = '3-12 meses' where id = '871aa424-261a-4ac3-8b7d-62fe792c07a0';  -- Guido 1671 1B
update propiedades set plazo = '3-12 meses' where id = '63ccb56d-7ee3-442b-9b72-503364440806';  -- Guido 2465 8
update propiedades set plazo = '3-12 meses' where id = 'c5230e76-503f-4e2b-9ebf-4a343b8f623c';  -- Huergo 475 0709
update propiedades set plazo = '3-12 meses' where id = '0573ba96-e65f-47a8-bbf8-1ee5be7c8f44';  -- Huergo 475 29
update propiedades set plazo = '12 meses' where id = '8aa411e3-fd43-4511-b206-171766fb5784';  -- Humboldt 1865
update propiedades set plazo = '3-12 meses' where id = '7080a8d7-76dd-43ad-94e9-bb64779db18e';  -- Humboldt 2300
update propiedades set plazo = '3-12 meses' where id = '87cc3c1d-545f-4ae5-9090-a799d01153f9';  -- Húsares 1080 1º
update propiedades set plazo = '3-12 meses' where id = '83d48c35-498f-4d16-a595-89e983bfb7f4';  -- Juana Manso 900
update propiedades set plazo = '3-12 meses' where id = '5a0ecd31-6146-4c12-903c-9294122bdcc5';  -- Juncal 600 Pisos 10 - 11
update propiedades set plazo = '3-12 meses' where id = '62c83935-7e3d-4171-ab83-5dba1d5bad54';  -- Juramento 3106 1C
update propiedades set plazo = '3-12 meses' where id = '6792b6d4-04a0-44b6-86d5-5ff09c91a90d';  -- La Pampa 1400
update propiedades set plazo = '3-12 meses' where id = 'bb3321ce-69e9-4c83-9b55-ebd56132fe6c';  -- Lavalle 1700
update propiedades set plazo = '3-12 meses' where id = 'dd735140-d16e-4f99-a6c9-a771bf50da5a';  -- Lavalle 4022 14 C
update propiedades set plazo = '3-12 meses' where id = '828c9f6d-d8ac-47af-8c28-4173aa05e074';  -- Malabia 2233 3 B
update propiedades set plazo = '3-12 meses' where id = '60c743b8-63ad-4450-8a0c-4191bd721300';  -- Manuel Ugarte 1992
update propiedades set plazo = '3-12 meses' where id = 'a18df400-354a-40bf-aed0-d77595dea0c5';  -- Manzanares 1600
update propiedades set plazo = '3-12 meses' where id = 'c5a68744-f693-443e-a9b9-3503e1ecd643';  -- Migueletes 680 3A
update propiedades set plazo = '3-12 meses' where id = '42910f68-cb3e-4e1d-94aa-25a25efe7064';  -- Migueletes 700
update propiedades set plazo = '3-12 meses' where id = '382e1380-cd7f-48c4-8019-f1c498c2507c';  -- Migueletes 800 4
update propiedades set plazo = '3-12 meses' where id = 'be9fbf6f-3901-4972-b4f0-35b1f56f213f';  -- Moldes 2800
update propiedades set plazo = '3-12 meses' where id = 'aa166893-1daa-4a4c-b876-005a7853d35e';  -- Moldes 3018
update propiedades set plazo = '3-12 meses' where id = '6911e3d8-fa8c-44fe-8b59-4e6f868771e9';  -- Moldes 3018 4
update propiedades set plazo = '3-12 meses' where id = '55e465c4-4fc8-4878-acc9-6f07da3f8cb5';  -- Niceto Vega 5720 4º
update propiedades set plazo = '3-12 meses' where id = '71bf6ef6-e220-4970-a17c-03def3f56297';  -- Niceto Vega 5932 6A
update propiedades set plazo = '3-12 meses' where id = 'a6c1f19a-b629-4aff-9ad7-7cab33944bbe';  -- Núñez 3100 1
update propiedades set plazo = '3-12 meses' where id = 'ab3c302a-f77d-4535-a0a0-b746fcf0dcab';  -- Olazábal 1584
update propiedades set plazo = '3-12 meses' where id = 'bd80f83b-7c62-4ad1-8dc0-931e57bd8f4e';  -- Olga Cosettini 1540
update propiedades set plazo = '3-12 meses' where id = 'fd8d159e-60dc-4d53-be1c-29874ac6101d';  -- Pacheco de Melo 2016 4
update propiedades set plazo = '3-12 meses' where id = 'b9ebce63-5669-47fc-b0d2-74d53ed10560';  -- Padilla 900
update propiedades set plazo = '3-12 meses' where id = '640b824a-33ae-499b-8c18-af85802ce2e8';  -- Paraguay 1484 4B
update propiedades set plazo = '3-12 meses' where id = '53c64bed-5626-4f43-906c-94ac82cc50ac';  -- Paraguay 4419 PB
update propiedades set plazo = '3-12 meses' where id = '63bcc88f-ef21-433b-985a-29b25c9ae5a7';  -- Peña 2528
update propiedades set plazo = '3-12 meses' where id = '20508956-617a-4602-96a8-719a15e14460';  -- Pje. Tres Sargentos 400
update propiedades set plazo = '3-12 meses' where id = '24a9f7ac-149f-4f24-9a39-ac4b9812c865';  -- Posadas 1500
update propiedades set plazo = '3-12 meses' where id = '6c7d970e-472d-444a-815c-32e622662468';  -- Pres. Luis Sáenz Peña 10
update propiedades set plazo = '3-12 meses' where id = 'bef18e58-4a32-4f42-a3a1-c8de22fa30cb';  -- Ravignani 2393 10 B
update propiedades set plazo = '3-12 meses' where id = 'fc92fdfa-cffc-403d-b5b4-17bff0204013';  -- Rawson 351 Mono
update propiedades set plazo = '3-12 meses' where id = '93c32a47-4131-43aa-b731-17f5cec494a6';  -- Rawson 351 2 amb
update propiedades set plazo = '3-12 meses' where id = '8a830568-2a81-40c2-b2a0-68192978cda1';  -- Riobamba 1200
update propiedades set plazo = '3-12 meses' where id = '30f74192-7a92-439c-ac1d-b0c984ddbc7c';  -- Rómulo Naón 2700
update propiedades set plazo = '3-12 meses' where id = '25ca52fa-3c41-4f07-9066-55dc3a2cd086';  -- Santa fe 2927 PB
update propiedades set plazo = '3-12 meses' where id = 'a2837adb-8f97-4b99-9c58-cfff818f4478';  -- Scalabrini Ortiz 1600
update propiedades set plazo = '3-12 meses' where id = '2fbeaf1a-59fa-4fbc-8cb2-befd733e0ed5';  -- Teodoro García 2698 5 C
update propiedades set plazo = '3-12 meses' where id = '8ed9543b-1391-4489-a81a-7188f5cb2401';  -- Uruguay 115 6 - 3
update propiedades set plazo = '3-12 meses' where id = 'b65325e5-c13d-4905-9602-8f762f66533b';  -- Uruguay 800
update propiedades set plazo = '3-12 meses' where id = 'd16a9f40-2deb-446a-9b48-cfdd574a4997';  -- Vicente López 2227 3A
update propiedades set plazo = '3-12 meses' where id = 'bf5139c8-b7e7-47af-9b91-083c608e4ef6';  -- Zabala 2400
commit;
