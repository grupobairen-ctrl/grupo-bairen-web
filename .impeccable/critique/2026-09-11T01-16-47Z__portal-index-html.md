---
target: portada del portal (portal/index.html)
total_score: 21
p0_count: 0
p1_count: 3
timestamp: 2026-09-11T01-16-47Z
slug: portal-index-html
---
# Crítica de diseño · portada del portal BAIREN (portal/index.html) · 10/9/2026

## Design Health Score (Nielsen, 0-4 cada una)
| # | Heurística | Puntaje | Hallazgo clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Índice y camino esperan a la carga de datos (aparecen a ~2 s en red local; la caja del índice mide 0 px mientras tanto). Los edificios sí tienen esqueleto. |
| 2 | Coincidencia con el mundo real | 3 | Comprar/Alquilar y la línea de contexto del plazo hablan como la gente. Siglas sin explicar: OS, PSI, Índice BAIREN. El m² no dice operación ni fecha. |
| 3 | Control y libertad | 3 | Carrusel con flechas, puntos, swipe, teclado. El video no se puede pausar. |
| 4 | Consistencia y estándares | 1 | "Alquilar" lleva a tres destinos (hero mediano, menú alquiler, pie mediano). PSI es "Inmobiliario" en la home e "Investment" en psi.html, que además trata de usted. Publicar tiene dos destinos (publicar.html y publicar-aviso.html). |
| 5 | Prevención de errores | 2 | "Avisarme" (edificio sin unidades) lleva a publicar.html. "Zonas" del menú móvil apunta a #zonas, que no existe en la home. |
| 6 | Reconocimiento antes que recuerdo | 2 | En escritorio la portada no tiene navegación primaria: Emprendimientos, Publicadores y Criterios solo en el pie. |
| 7 | Flexibilidad y eficiencia | 3 | Buen teclado y skip link. El selector ES/PT/EN guarda la preferencia y recarga, pero nada traduce: control muerto. |
| 8 | Estético y minimalista | 2 | Piezas grandes limpias; ruido en los bordes: 8 controles en el header anónimo, tres puertas a publicar, pie = 33 % de la página en celular. |
| 9 | Recuperación de errores | 1 | Si falla la carga de datos, el error se muestra sin reintento y el return deja vacíos el índice y el camino, que no dependen de datos. |
| 10 | Ayuda y documentación | 2 | criterios.html existe y el estándar no lo enlaza. |
| **Total** | | **21/40** | **Aceptable (20-27)** |

## Veredicto de anti-patrones
**Evaluación de diseño:** nadie diría "esto lo hizo una IA" de entrada (video, fachadas reales, hilo de oro, índice como cifras). Los reflejos aparecen en la capa chica: volantas en mayúsculas tracked en 3 de 5 secciones, "VER UNIDADES →" en cada fachada y "›" en el índice, buscador de vidrio esmerilado, bandas navy/crema alternadas como cebra, y copy de folleto ("Viví Buenos Aires en su máximo esplendor", "Hoy encuentran su espacio en BAIREN", "tu próxima mejor inversión").
**Detector determinista (navegador, 1440 y 430):** 2 hallazgos. `tiny-text` en #ctxPlazo (11,84 px; aparece al tocar Alquilar): válido. `all-caps-body` en la volanta de PSI: falso positivo (etiqueta de una línea que pasa 30 caracteres por el nombre completo del producto). Scan de archivo degradado (faltan htmlparser2/css-tree en la skill; único hallazgo single-font es artefacto de la regex). Scan de URL no disponible (sin Puppeteer). Overlays vistos en las capturas critB-overlay-*.png.
**Coincidencias:** las dos evaluaciones marcan las volantas en mayúsculas y el texto chico en celular; el detector no ve copy ni consistencia de destinos, que son los problemas de fondo.

## Impresión general
Las piezas grandes tienen oficio y la marca se reconoce. Lo que resta es la capa de conexiones: enlaces que van a lugares distintos o a ningún lado, un selector de idioma que no traduce, siglas sin explicar y cifras sin fecha ni fuente. La mayor oportunidad: que cada promesa de la portada tenga destino y respaldo.

## Qué funciona
1. El camino del estándar (BPM.camino): una sola coreografía, sin depender del scroll, estado final sin Motion o con menos movimiento.
2. El buscador de una intención: Comprar/Alquilar y recién ahí Mediano/Largo plazo con su línea de contexto.
3. El índice en escritorio como tres cifras: se lee como dato, no como tabla.

## Problemas prioritarios
1. **[P1] "Avisarme" lleva a publicar y "Zonas" no lleva a nada.** index.html:221-222, ui.js:332. Arreglo: "Avisarme" a un destino de alerta real; "Zonas" a buscar.html o fuera del menú de la home.
2. **[P1] El selector ES/PT/EN no traduce nada.** ui.js:267-291. Arreglo: ocultarlo hasta que exista traducción.
3. **[P1] Inconsistencias de nombre y destino.** PSI Inmobiliario/Investment y usted/vos entre index.html:122 y psi.html:5-30; "Alquilar" a mediano o alquiler según dónde; Publicar a dos páginas. Arreglo: un nombre, un tratamiento, un destino por intención.
4. **[P2] Cifras y criterios sin respaldo.** El índice no dice operación, fecha ni fuente (el comentario del código sí: promedio de publicación, septiembre 2026); "Consultá más barrios y evolución de valores" cae en buscar.html?op=venta; el estándar no enlaza criterios.html. Arreglo: subtítulo con operación y fecha, enlace honesto, enlace a criterios bajo el camino.
5. **[P2] Piso tipográfico y pie en celular.** Volantas 8,96 px, "VER UNIDADES" 9,6 px, botones 9,92 px, cuerpo 12,8 px; pie de 1299 px sobre 3995. Arreglo: 11 px mínimo, cuerpo 14 px, zonas del pie en dos columnas.
6. **[P2] Un fallo de datos rompe tres secciones.** index.html:193. Arreglo: reintento en el error y que índice y camino no dependan de la carga.

## Banderas rojas por persona
- Jordan (primerizo): el hero no dice qué es BAIREN; "OS" sin enlace; PSI con dos nombres; "Ver unidades" en Huergo lleva a una sola ficha; en escritorio no encuentra Emprendimientos ni Publicadores hasta el pie.
- Riley (probador): PT/EN recargan en castellano; Alquilar con tres destinos; "evolución de valores" sin evolución; leyenda del pie "da la gestión para administrarlas" contra "no administra"; error de datos sin reintento.
- Casey (móvil, una mano): carrusel solo por swipe, puntos no tocables; botón "Publicar propiedad" a 165 px y 9,9 px de letra; menú de 15 opciones; 1300 px de pie; único contacto un mailto.
- Inversor con capital (45-60, desde WhatsApp): primer cuadro del video es una bañera y "máximo esplendor"; cuerpo a 12,8 px; índice sin fecha ni fuente; estándar sin criterios; sin teléfono ni WhatsApp; "Publica: quién" no aparece en la home.

## Observaciones menores
Poster del hero vertical recortado al 70 % en escritorio; ES/PT/EN de 28×23 px (bajo el mínimo 24×24 de WCAG 2.2); campana y "Mis contactos" para visitante sin sesión solo avisan que hay que ingresar; BP.ZONAS incluye Retiro y Villa Crespo y PRODUCT.md no; nombres de hitos al 55 % hasta que llega el hilo; "Hoy encuentran su espacio en BAIREN" no informa nada; el riel de "edificios de primera línea" cierra con una tarjeta de publicar.

## Preguntas
1. Si la curación es la marca, ¿por qué el único enlace a Criterios está en el pie y no bajo el hilo de oro?
2. ¿Qué gana el header anónimo con campana, Mis contactos y corazón?
3. Si BAIREN no vende ni negocia, ¿PSI va con el "nosotros" de BAIREN o como un servicio con nombre propio?
