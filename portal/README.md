# BAIREN · Portal (web de prueba)

Rama `portal`. No toca producción. Estructura de referencia: Zonaprop. Identidad: la de la web actual (tokens, Playfair + Jost, header y footer del sitio).

## Correr en local
```
cd "~/Desktop/WEB DE BAIREN"
node portal/test/dev-server.mjs
```
Abrir http://localhost:8080/portal/. El dev server reproduce las reescrituras de `vercel.json` (rutas limpias como `/portal/departamentos-venta-palermo` y `/portal/propiedad-<id>`). Con `python3 -m http.server 8080` también funciona, sin rutas limpias.

## Prueba de punta a punta
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-bp-cdp about:blank &
node portal/test/e2e.mjs
```
Recorre ingresar con código, publicar en cinco pasos con ocho fotos, panel, curación, resultados, ficha, consulta, importación por CSV y rutas limpias. Deja capturas en `/tmp/bp-e2e/shots/`. Necesita ocho JPG en `/tmp/bp-e2e/foto-1.jpg` a `foto-8.jpg` y `/tmp/bp-e2e/cartera.csv` (el script los describe).

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

## Fase 2 y 3 (hechas)
- `js/store.js`: sesión y datos. Modo `supabase` si el esquema `portal` responde (Auth por mail con código, storage `portal-fotos` y `portal-docs`); si no, modo `local` (localStorage e IndexedDB) para probar todo sin base.
- `ingresar.html` (mail y código), `publicar-aviso.html` (cinco pasos con verificación y fotos), `panel.html` (mis avisos, interesados, contactos, favoritos, alertas, cuenta), `curacion.html` (cola y verificación de publicadores), `importar.html` (cartera por CSV con mapeo de columnas).
- Rutas limpias: `vercel.json` y `test/dev-server.mjs`; las páginas sondean `/portal/_rewrite-probe` y, si hay reescritura, generan links limpios.
- Assets con versión (`?v=`) en todos los includes: al cambiar CSS o JS, subir la versión en las páginas.

## Pasar a datos reales (pasos en Supabase, una vez)
1. Settings → API → Exposed schemas: agregar `portal`.
2. Authentication → Providers → Email: habilitado, con código por mail (OTP). En la plantilla "Magic Link" usar `{{ .Token }}`.
3. SQL Editor: correr `schema-portal.sql` completo (crea esquema, migra las unidades actuales como avisos de Maxim Rentals, permisos, curadores, buckets).
4. En `js/data.js`, cuando la migración esté verificada, se puede dejar de leer `data/avisos-src.json`.

## Lo que sigue
Mails de aviso al publicador (aprobado, rechazado, consulta) por función de servidor; borrado automático de documentos ya está al resolver la verificación; Emprendimientos con etapa de obra; Bairen OS como panel del propietario; Índice BAIREN con series.
