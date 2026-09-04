# DESIGN.md · BAIREN

Fuente de verdad: los tokens de index.html y el manual de marca (manual-marca-bairen.html). El portal (carpeta portal/) los extiende, no los reemplaza.

## Color
- navy-deeper #131D2D (fondo de header, hero, bloques de peso) · navy-dark #1E2A3F · navy #2A3A52
- gold #C2A968 (acento, líneas, botones) · gold-dark #8A7547 (texto de acento sobre claro) · gold-light #DECDA0
- white #FBFAF6 (fondo de página, cálido) · off-white #EEE5D0 · wheat #D9C9A8 · silver #BFBAB0 · silver-light #DDD8CE
- text-dark #1A2538 · text-mid #6B7589
- **Estrategia (definida el 4/9/2026): navy comprometido. La casa es navy; el papel es crema.** El navy (#131D2D, #1E2A3F, #2A3A52) carga lienzo, header, hero, barra de filtros, cabeceras de página, mapa, rieles, formularios de contacto, bloques de captación y pie. El crema carga una sola hoja por página (#EEE5D0) donde viven las tarjetas (#FDFCF9), la lectura y los formularios largos: las fotos respiran sobre papel, no sobre navy. Objetivo: 50 a 60 % navy en home y resultados, 40 % en ficha y panel. El oro es acento y nunca rellena superficies grandes. Nada de blanco ni negro puros.
- **Registro partido (decisión de Tomás, 4/9/2026).** El navy envolvente es para las superficies de **marca**, donde BAIREN vende criterio: home, publicar, emprendimientos, publicadores, legales, ingresar. Las superficies de **herramienta**, donde la persona compara y decide, van en plano claro continuo con el navy solo en el marco (header, banda de título, barra de filtros, mapa, riel del panel, formulario de contacto, pie): resultados, ficha, panel, curación, importar. En el código se activan con `class="p-product"` en el body.
- **Papel de la herramienta:** #F6F2E8 de fondo, tarjetas #FFFDF8 con línea de 1 px rgba(19,29,45,.10) y aire entre ellas. Sin caja contenedora: dos tonos cálidos casi iguales apilados se leen como mancha.
- **Un solo oro por tarjeta** (la etiqueta sobre la foto) y **un solo botón lleno** por bloque. La matrícula y los datos secundarios van en tinta navy, no en oro.
- **Nota:** el manual de marca (sección 03) propone un sistema "light-dominante"; para marca manda el sitio publicado (navy) y para herramienta manda el catálogo actual (claro). Si se actualiza el manual, alinear esa sección.
- **Tinta según superficie:** sobre navy, crema #FBFAF6 y sus opacidades (.78 subtítulos, .62 meta, piso .55 para texto chico), oro #C2A968 para grande y gold-light #DECDA0 para chico. Sobre crema, #59647A para texto secundario y #75623C para etiquetas chicas en oro; oro puro solo como filete de 1 px. Nunca #6B7589 sobre navy (3,7:1) ni oro puro como texto sobre crema (2,2:1).
- Estados: hover eleva 1 a 2 px y suma sombra difusa; foco con borde oro; activo con fondo navy y texto claro; deshabilitado al 45 %.

## Tipografía
- Display: Playfair Display 400/500 (títulos, precios, cifras con peso). Cuerpo: Jost 300/400/500.
- Escala fluida en marca (clamp), fija en producto. Ratio mínimo 1.25 entre pasos.
- Etiquetas: Jost 500, .66 a .72 rem, tracking .14 a .22 em, mayúsculas solo en etiquetas cortas y botones.
- Línea de lectura máxima 72 ch.

## Superficies y profundidad
- Radio de tarjeta 14 a 18 px; radio de píldora 999 px.
- Sombra única, difusa: 0 10px 30px rgba(19,29,45,.08); en hover 0 18px 44px rgba(19,29,45,.12). Nunca sombras duras.
- Líneas: 1 px rgba(19,29,45,.10). Sin barras laterales de color.
- Doble marco para lo que importa (galería, mapa, formulario): bandeja exterior en #F4F0E6 con 6 a 8 px de aire y radio grande, núcleo interior con su propio radio menor.

## Movimiento
- Curva del sitio: cubic-bezier(.22,1,.36,1) (out-quint) y cubic-bezier(.16,1,.3,1) (out-expo). Sin rebote.
- Marca: revelado al entrar en viewport (translate 16 px + opacidad, 700 a 900 ms) con IntersectionObserver.
- Producto: 150 a 250 ms, solo para estado (hover, foco, apertura de menús, carga).
- Solo transform y opacity.

## Componentes del portal
- Header sobre .navbar (64 px, navy-deeper, línea oro inferior). Izquierda: logo y menú. Derecha: campana, Mis contactos, Publicar (contorno oro), Ingresar (oro lleno).
- Buscador del hero: tarjeta clara con pestañas Comprar / Alquilar / Emprendimientos, tipo, ubicación con sugerencias limitadas a las ocho zonas, botón Buscar.
- Tarjeta de resultado horizontal: foto 38 %, precio en Playfair, expensas, fila de datos, dirección, barrio, dos líneas de descripción, pie con "Publica: quién" y acciones.
- Badges: contorno oro para corredor matriculado; contorno navy para dueño verificado; "Ficha verificada por BAIREN".
- Íconos: trazo fino 1.5, SVG propios.
- Pie: columnas del sitio, leyenda de plataforma, franja legal clara.
