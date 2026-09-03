# DESIGN.md · BAIREN

Fuente de verdad: los tokens de index.html y el manual de marca (manual-marca-bairen.html). El portal (carpeta portal/) los extiende, no los reemplaza.

## Color
- navy-deeper #131D2D (fondo de header, hero, bloques de peso) · navy-dark #1E2A3F · navy #2A3A52
- gold #C2A968 (acento, líneas, botones) · gold-dark #8A7547 (texto de acento sobre claro) · gold-light #DECDA0
- white #FBFAF6 (fondo de página, cálido) · off-white #EEE5D0 · wheat #D9C9A8 · silver #BFBAB0 · silver-light #DDD8CE
- text-dark #1A2538 · text-mid #6B7589
- Estrategia: restringida sobre crema cálido, con el navy como color comprometido en header, hero y pie. El oro es acento, nunca relleno de superficies grandes. Nada de blanco ni negro puros: superficies #FDFCF9 sobre #FBFAF6.
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
