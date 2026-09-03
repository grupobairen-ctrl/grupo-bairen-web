# BAIREN · Portal (web de prueba)

Rama `portal`. No toca producción. Estructura de referencia: Zonaprop. Identidad: la de la web actual (tokens, Playfair + Jost, header y footer del sitio).

## Correr en local
```
cd "~/Desktop/WEB DE BAIREN"
python3 -m http.server 8080
```
Abrir http://localhost:8080/portal/

## Qué hay (Fase 1)
- `index.html` home: buscador con pestañas, ocho barrios con el mapa del sitio, seleccionadas de la semana, publicá tu propiedad, publicadores, índice BAIREN, guía, búsquedas frecuentes.
- `buscar.html` resultados: barra de filtros (ubicación como chip, operación, tipo, ambientes y dormitorios, precio, más filtros en panel lateral), crear alerta, ordenar, lista de tarjetas horizontales con "Publica: quién", paginación, mapa lateral, leyenda de alquiler, migas.
- `propiedad.html?id=` ficha: galería con lightbox, precio y "avisarme si baja", mapa por barrio, fila de datos, video, descripción, preguntas rápidas, pestañas de características, bloque del publicador con matrícula y "Ficha verificada", denuncia, similares, migas, formulario fijo ruteado al publicador (mailto y WhatsApp), leyendas legales, JSON-LD.
- `publicar.html` (perfil, pasos, criterios), `ingresar.html` (mail y código, Google, Apple), `publicadores.html` (directorio y perfiles), `legales.html` (términos de intermediario, contratación, privacidad, arrepentimiento, baja, consumidor, criterios, fraudes).
- `css/base.css`, `css/catalogo.css`, `css/ficha.css`: extraídos automáticamente de las páginas actuales. `css/portal.css`: componentes nuevos. `js/ui.js`: header, footer, íconos, favoritos y alertas locales. `js/data.js`: capa de datos y plantillas de tarjeta.
- `data/avisos-src.json`: las 38 unidades publicadas, exportadas de Supabase el 3/9/2026 con la clave pública. Más dos avisos de ejemplo (Inmobiliaria Ejemplo y Dueño directo) para ver los badges y la neutralidad.
- `schema-portal.sql`: esquema `portal` para Supabase, con la migración de las unidades actuales como avisos de Maxim Rentals. No se ejecutó: correrlo desde el SQL Editor cuando Tomás lo apruebe.

## Datos inferidos hasta que exista el esquema portal
La tabla actual no tiene dormitorios, baños, cocheras, expensas ni antigüedad. En la prueba: dormitorios = ambientes menos uno; baños = 1 (2 si hay 4 o más ambientes); cocheras = 1 si "Cochera" está en amenities; expensas y antigüedad vacías. El WhatsApp y el mail de Maxim Rentals son los de BAIREN como marcador: reemplazar por los de Maxi.

## Lo que sigue (Fase 2)
Ingresar con Supabase Auth, Publicar con carga de aviso y verificación, panel del publicador, cola de curación, importación desde Tokko, y reemplazo de `data.js` por consultas al esquema `portal`.
