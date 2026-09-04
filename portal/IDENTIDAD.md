# Portal BAIREN: identidad de color, diagnóstico y plan

## 1. Diagnóstico

**Qué comparte con el sitio.** Tokens (base.css sale de index.html), Playfair y Jost, el `.navbar` navy con línea oro, el `.footer` completo, el hero con video, la tarjeta de catalogo.css y la horizontal `.p-card-h` con "Publica: quién".

**Dónde se fue.** En la proporción. El sitio alterna hero navy, `.caminos` off-white, `.mercado` navy, `.cita` crema, `.contacto` navy, footer navy: cerca de dos tercios navy. El portal: hero de 560 px y cinco secciones seguidas en crema (`#barrios`, `#seleccionadas`, `#publicadores`, `#indice`, `#busquedas`); el único navy es `.p-publica`, y es una tarjeta dentro de una sección crema. Resultados, ficha, panel y publicar van 100 % crema entre header y footer. Además `html{background:var(--p-bg)}` (correcciones del 3/9) pisa el lienzo navy del sitio y la página termina en `.p-legal-strip` crema. Estimado: home 25 % navy, resultados 20 %, ficha 15 %.

**Por qué pasó.** No fue por copiar Zonaprop. Fue `--p-bg:#FBFAF6` más el manual de marca, cuya sección 03 recomienda un "sistema evolucionado light-dominante, navy reservado a hero y footer". El manual y el sitio publicado se contradicen; el sitio es navy-dominante y es el que la gente reconoce. Tomás elige el sitio. Conviene escribirlo en DESIGN.md para que no se repita.

**Síntomas concretos de "portal claro".**
- `.p-search{background:#fff}`: tarjeta blanca sobre foto, la imagen mental de Zonaprop; el sitio nunca la usa.
- `.p-filters{background:#fff}`: barra blanca pegada a un header navy.
- El mapa de barrios está dibujado para navy (mapa-barrios.js: rótulos #FBFAF6, tierra en blanco al 7 %, sombras de texto navy). En `.p-map-home` y `.p-map-card` sobre crema queda fantasma; se ve en las capturas.
- Catorce reglas con `#fff` puro (`.p-icon-btn`, `.p-dd`, `.p-perfil`, `.p-login`, `.p-side-pub`, `.p-pager button`, `.p-drawer .panel`, `.p-fsel`, `.p-fbtn`, entre otras).
- Plantilla: `.p-perfil{border-top:3px}` y `.p-prose .box{border-left:3px}` (los marca el detector), `.p-kpis` con cuatro tiles iguales, `.p-eyebrow` como píldora arriba de cada h2, tres tarjetas iguales con ícono en publicar.html.
- Fuga menor: el sitio es angular (`.hbtn`, `.btn-submit`, `.camino`) y el portal es píldora (`.p-btn` 999 px). Se arregla en una línea, al final del CSS.

**Qué se conserva.** `.p-card-h` (foto 38 %, precio Playfair, fila de datos, pie con matrícula), `.p-tray` y `.p-gallery` con doble marco, `.p-btn .ic`, la escala tipográfica, `.p-publica` como concepto, las sombras difusas, los badges de matrícula, el formulario fijo de la ficha y el registro producto del panel, denso y sin decoración.

## 2. Estrategia de color

**Decisión: navy comprometido. La casa es navy; el papel es crema.** El navy carga estructura y atmósfera: lienzo, header, hero, barra de filtros, cabeceras, mapa, rieles laterales, formularios de contacto, bloques de captación, footer. El crema carga una sola hoja por página, `.p-sheet` en #EEE5D0 (el off-white de `.destacadas` del sitio), donde viven las tarjetas #FDFCF9, la lectura y los formularios largos. Las fotos respiran en la hoja, no sobre navy: treinta fotos en grilla sobre navy se leen como Netflix, pierden el cálido editorial y el texto secundario #6B7589 no llega a contraste (3,65:1). Hoja crema sobre lienzo navy es el catálogo actual con el lienzo correcto. Objetivo: 50 a 60 % navy en home y resultados, 40 % en ficha y panel. Escena: alguien busca de noche desde el sillón; el navy cansa menos que un portal blanco y la foto brilla sobre el papel.

**Ritmo por página** (N navy, C crema):
- **Home**: hero N deeper → `#barrios` N #2A3A52 como `.zonas` del sitio, tiles inset y el mapa en su color → `#seleccionadas` C hoja con tarjetas → `#publicar` N deeper a sangre, como sección y no tarjeta → `#publicadores` + `#indice` + `#guia` N deeper con hairline oro arriba, como `.mercado` → `#busquedas` C franja corta → footer N. Ritmo N N C N N C N.
- **Resultados**: header N → `.p-filters` navy-dark → `.p-results-head` sobre N (título Playfair claro) → columna lista C hoja; columna mapa N → footer N.
- **Ficha**: `.p-ficha-top` N con la galería en bandeja navy-dark (como `.photo-strip`) → `.p-ficha-main` C hoja de lectura, con el mapa como isla navy adentro → `.p-side`: `.p-form` navy como `.contacto` del sitio, `.p-side-pub` tile navy → similares sobre N → footer.
- **Publicar aviso**: cabecera N (eyebrow, h1, `.p-stepper`) → `.p-card-panel` C hoja → footer. **Publicar landing**: perfiles como lista sobre N, pasos en C, CTA en N.
- **Panel y curación**: `.p-side-nav` riel navy-dark; `#content` C hoja; KPIs como una línea de texto, no tiles.
- **Emprendimientos**: cabecera N por proyecto (render al 18 % detrás, como `.p-publica`) y unidades en hoja C.
- **Legales**: cabecera N, hoja de lectura C a 680 px. **Ingresar**: todo N, `.p-login` como tile navy-dark con campos inset; la puerta es navy.
- **Cierre de página**: `html` navy-deeper, `.p-legal-strip` en navy-dark. Nunca terminar en crema.

## 3. Plan CSS

Pegar al final de portal.css, después del bloque de correcciones del 3/9 (pisa `html{background}`). Los estilos inline de panel.html y publicar-aviso.html se vencen anteponiendo `.p-page`. Opcional, una línea de HTML: `class="p-sheet"` en el primer `div` de `.p-results`; abajo va el selector estructural por si no se toca.

```css
/* Tokens de superficie */
:root{
  --p-canvas:#131D2D; --p-navy-2:#1E2A3F; --p-navy-3:#2A3A52;
  --p-sheet:#EEE5D0; --p-sheet-2:#F4F0E6; --p-card:#FDFCF9;
  --p-ink:#FBFAF6; --p-ink-2:rgba(251,250,246,.78); --p-ink-3:rgba(251,250,246,.62);
  --p-line-d:rgba(255,255,255,.12); --p-line-gold:rgba(194,169,104,.32);
  --p-tile:rgba(255,255,255,.05); --p-tile-hi:rgba(255,255,255,.09);
  --p-gold-ink:#75623C; --p-mid-ink:#59647A;
  --p-shadow-d:0 24px 60px rgba(0,0,0,.35); --p-focus:0 0 0 3px rgba(194,169,104,.35);
}
html,body{background:var(--p-canvas)}

/* Texto sobre navy: Jost 400, más interlínea */
.p-section:not(.alt),.p-page,.p-filters,.p-form,.p-dd,.p-pop,.p-drawer .panel,.p-search,.p-login{color:var(--p-ink);font-weight:400;line-height:1.7}
.p-section:not(.alt) .p-h2,.p-page .p-h2,.p-results-head h1,.p-form h3,.p-login h1{color:var(--p-ink)}
.p-section:not(.alt) .p-sub,.p-page .p-sub{color:var(--p-ink-2)}
.p-section:not(.alt) .p-link,.p-page .p-link{color:var(--p-ink)} .p-link:hover{color:var(--gold-light)}
.p-results-head h1 span{color:var(--gold-light)}
.p-eyebrow{border:0;padding:0;border-radius:0;color:var(--gold-light);font-weight:600} /* texto, como .camino-kicker */

/* Hoja crema */
.p-sheet,.p-results>div:first-child,.p-ficha-main,.p-page #content,.p-page .p-card-panel,.p-prose{background:var(--p-sheet);border-radius:calc(var(--p-radius) + 8px);padding:20px 24px;color:var(--text-dark);font-weight:300;line-height:1.6}
.p-page .p-card-panel{border:0}
.p-prose{padding:32px 36px}
.p-sheet .p-h2,.p-ficha-main .p-h2,.p-page #content .p-h2,.p-prose h1,.p-prose h2{color:var(--navy-deeper)}
.p-sheet .p-sub,.p-page #content .p-sub,.p-prose p,.p-prose li,.p-desc,.p-expensas,.p-barrio,.p-publine,.p-kicker,.p-legend,.p-codes,.p-meta-line,.p-card-pub,.p-text{color:var(--p-mid-ink)}
.p-fld label,.p-resumen dt,.p-tbl th{color:var(--p-gold-ink)}
.p-section.alt{background:var(--p-sheet)}
#busquedas{background:var(--p-sheet-2);padding:44px 0}
.p-prose .box{border-left-width:1px;background:#F7F1E2}

/* Secciones navy de la home */
.p-section{background:var(--p-canvas)}
#barrios{background:var(--p-navy-3)}
#publicadores,#indice{border-top:1px solid rgba(194,169,104,.14)}
#publicar{position:relative;background:var(--p-canvas) url(../hero-poster.jpg?v=2) center/cover}
#publicar::before{content:"";position:absolute;inset:0;background:rgba(19,29,45,.84)}
#publicar .p-container{position:relative}
.p-publica{background:transparent;border-radius:0;padding:0} .p-publica img{display:none}
#barrios .p-zona,#guia .p-zona,.p-pub-card,.p-side-pub{background:var(--p-tile);border-color:var(--p-line-d);box-shadow:none}
#barrios .p-zona:hover,#guia .p-zona:hover{background:var(--p-tile-hi);border-color:var(--gold);box-shadow:none}
#barrios .p-zona b,#guia .p-zona b,.p-pub-card b,.p-side-pub b{color:var(--p-ink)}
#barrios .p-zona span,#guia .p-zona span,.p-pub-card small,.p-side-pub small,#indice .p-note{color:var(--p-ink-3)}
#barrios .p-zona .n,#guia .p-zona .n{color:var(--gold-light)}
.p-pub-logo{background:var(--gold);color:var(--navy-deeper)}
.p-index{background:transparent;border-color:var(--p-line-d);color:var(--p-ink)}
.p-index th{background:var(--p-tile);color:var(--gold-light);border-color:var(--p-line-d)} .p-index td{border-color:var(--p-line-d)}

/* Galería y mapa: siempre sobre navy, el mapa también como isla dentro de la hoja */
.p-ficha-top .p-tray{background:var(--p-navy-2);border:1px solid var(--p-line-d)}
.p-map-home,.p-map-card,.p-map-ficha{background:var(--p-navy-2);border:1px solid var(--p-line-d)}
.p-map-home .in,.p-map-card .in{background:transparent;padding:0}
.p-map-hint,.p-map-ficha .p-note{color:var(--p-ink-3)}

/* Buscador del hero */
.p-search{background:rgba(30,42,63,.94);border:1px solid var(--p-line-gold);box-shadow:var(--p-shadow-d)}
.p-tab{color:var(--p-ink-3)} .p-tab:hover{color:var(--gold-light)} .p-tab.active{color:var(--p-ink);border-bottom-color:var(--gold)}
.p-search-row{border-top-color:var(--p-line-d)}
.p-hero .p-chip,.p-fchip .p-chip{background:rgba(194,169,104,.16);border-color:transparent;color:var(--gold-light)} .p-chip button{color:inherit}

/* Campos sobre navy: la gramática de .cfield del sitio */
.p-field select,.p-field input,.p-fchip,.p-fsel,.p-fbtn,.p-pop input[type=number],.p-pop .seg button,.p-form input,.p-form textarea,.p-login input,.p-login .soc{background:var(--p-tile);border-color:rgba(255,255,255,.16);color:var(--p-ink)}
.p-fchip input{background:none;color:var(--p-ink)}
.p-field input::placeholder,.p-fchip input::placeholder,.p-form input::placeholder,.p-form textarea::placeholder,.p-login input::placeholder{color:rgba(251,250,246,.5)}
.p-field select,.p-fsel{background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M0 0l5 6 5-6z' fill='%23DECDA0'/></svg>")}
.p-field select option,.p-fsel option{color:var(--navy-deeper);background:#FBFAF6}
.p-fbtn:hover,.p-fsel:hover,.p-fchip:hover{border-color:var(--gold)}
.p-field:focus-within select,.p-field:focus-within input,.p-fchip:focus-within,.p-fsel:focus-visible,.p-fbtn:focus-visible,.p-form input:focus,.p-form textarea:focus,.p-login input:focus{outline:0;border-color:var(--gold);box-shadow:var(--p-focus);background:var(--p-tile-hi)}
.p-form .chk,.p-drawer .checks label{color:var(--p-ink-3)} .p-form .chk a{color:var(--p-ink)}
.p-form .chk input,.p-drawer input[type=checkbox]{accent-color:var(--gold)}
.p-form{background:var(--p-navy-2);border-color:var(--p-line-d);box-shadow:none}
.p-side .p-icon-btn{background:transparent;border-color:rgba(255,255,255,.2);color:var(--p-ink)}

/* Barra de filtros, desplegables, popovers, drawer */
.p-filters{background:var(--p-navy-2);border-bottom:1px solid var(--p-line-gold)}
.p-dd,.p-pop,.p-sugg{background:var(--p-navy-2);border:1px solid var(--p-line-d);box-shadow:var(--p-shadow-d);color:var(--p-ink)}
.p-dd{border-top:0}
.p-dd a,.p-sugg button{color:var(--p-ink-2)} .p-dd a:hover,.p-sugg button:hover{background:var(--p-tile-hi);color:var(--p-ink)}
.p-dd .p-dd-ttl,.p-pop label,.p-drawer .grp label.t{color:var(--gold-light)} .p-sugg small{color:var(--p-ink-3)}
.p-pop .seg button{color:var(--p-ink-2)} .p-pop .seg button.on{background:var(--gold);border-color:var(--gold);color:var(--navy-deeper)}
.p-pop .lnk,.p-drawer .lnk{color:var(--p-ink-3)}
.p-drawer .panel,.p-drawer .foot{background:var(--p-navy-2);color:var(--p-ink)} .p-drawer h3{color:var(--p-ink)} .p-drawer .grp,.p-drawer .foot{border-color:var(--p-line-d)}

/* Tarjetas en la hoja: sin bordes de color, la foto se acerca en hover */
.p-card-h,.p-emp,.p-aviso-row,.p-cur,.p-pub-block,.p-perfil,.p-step{background:var(--p-card);border:1px solid rgba(19,29,45,.08);box-shadow:var(--p-shadow)}
.p-card-h:hover{box-shadow:var(--p-shadow-hover);transform:translateY(-2px)}
.p-card-photo img{transition:transform .5s var(--ease)} .p-card-h:hover .p-card-photo img{transform:scale(1.03)}
.p-perfil{border-top-width:1px}
.p-pager button,.p-quick button,.p-report .chips button,.p-empty,.p-icon-btn{background:var(--p-card)}

/* Badges */
.p-badge{border-color:rgba(194,169,104,.75);color:var(--gold-light)}
.p-badge.dueno{border-color:rgba(251,250,246,.4);color:var(--p-ink)}
.p-sheet .p-badge,.p-card-h .p-badge,.p-ficha-main .p-badge,.p-page #content .p-badge,.p-section.alt .p-badge{background:#F7F1E2;border-color:rgba(138,117,71,.45);color:var(--p-gold-ink)}
.p-sheet .p-badge.dueno,.p-card-h .p-badge.dueno,.p-ficha-main .p-badge.dueno,.p-page #content .p-badge.dueno,.p-section.alt .p-badge.dueno{background:transparent;border-color:var(--navy-deeper);color:var(--navy-deeper)}
.p-badge.demo{border-color:#B3423C;color:#E8A39E} .p-sheet .p-badge.demo,.p-page #content .p-badge.demo{color:#9C3A34}

/* Botones: sobre navy, oro; sobre papel, tinta navy; un solo oro lleno por página */
.p-btn{border-color:rgba(194,169,104,.7);color:var(--gold-light)}
.p-btn:hover{background:var(--gold);border-color:var(--gold);color:var(--navy-deeper)}
.p-btn:focus-visible{outline:0;box-shadow:var(--p-focus)}
.p-btn-fill{background:var(--gold);border-color:var(--gold);color:var(--navy-deeper)} .p-btn-fill:hover{background:var(--gold-light)}
.p-btn .ic{background:rgba(19,29,45,.14)}
.p-pop .p-btn-navy,.p-drawer .p-btn-navy{background:var(--gold);border-color:var(--gold);color:var(--navy-deeper)}
.p-sheet .p-btn,.p-card-h .p-btn,.p-ficha-main .p-btn,.p-page #content .p-btn,.p-page .p-card-panel .p-btn,.p-section.alt .p-btn,.p-btn-dark{background:transparent;border-color:var(--navy-deeper);color:var(--navy-deeper)}
.p-sheet .p-btn:hover,.p-card-h .p-btn:hover,.p-ficha-main .p-btn:hover,.p-page #content .p-btn:hover,.p-page .p-card-panel .p-btn:hover,.p-section.alt .p-btn:hover,.p-btn-dark:hover,.p-btn-navy{background:var(--navy-deeper);border-color:var(--navy-deeper);color:var(--p-ink)}
.p-card-h .p-btn-fill,.p-ficha-main .p-btn-fill,.p-page .p-card-panel .p-btn-fill,.p-section.alt .p-btn-fill{background:var(--gold);border-color:var(--gold);color:var(--navy-deeper)}

/* Panel, stepper, login, cierre de página */
.p-page{background:var(--p-canvas)}
.p-page .p-side-nav{background:var(--p-navy-2);border-color:var(--p-line-d)}
.p-page .p-side-nav a{color:var(--p-ink-2)} .p-page .p-side-nav a svg{color:var(--gold-light)}
.p-page .p-side-nav a.on{background:var(--p-tile-hi);color:var(--p-ink)} .p-page .p-side-nav .who{color:var(--p-ink-3);border-color:var(--p-line-d)}
.p-page .p-kpis{display:flex;gap:28px;padding:0 0 14px;margin:0 0 18px;border-bottom:1px solid var(--p-line)}
.p-page .p-kpi{background:none;border:0;padding:0;display:flex;align-items:baseline;gap:8px} .p-page .p-kpi b{font-size:1.25rem}
.p-page .p-stepper button{background:var(--p-tile);border-color:var(--p-line-d);color:var(--p-ink-3)}
.p-page .p-stepper button i{background:var(--p-tile-hi);color:var(--p-ink)}
.p-page .p-stepper button.on{border-color:var(--gold);color:var(--p-ink)} .p-page .p-stepper button.on i{background:var(--gold);color:var(--navy-deeper)}
.p-page .p-stepper button.done i{background:var(--p-ink);color:var(--navy-deeper)}
.p-page .p-note,.p-page .p-fld .hint{color:var(--p-ink-3)} .p-page #content .p-note,.p-page .p-card-panel .hint{color:var(--p-mid-ink)}
.p-perfiles{grid-template-columns:1fr;gap:0} .p-perfil{background:transparent;border:0;border-top:1px solid var(--p-line-d);border-radius:0;box-shadow:none;text-align:left;padding:22px 0;display:grid;grid-template-columns:32px 1fr;gap:16px}
.p-perfil svg{width:28px;height:28px;margin:0;color:var(--gold-light)} .p-perfil b{color:var(--p-ink)} .p-perfil span{color:var(--p-ink-3)}
.p-login{background:var(--p-navy-2);border-color:var(--p-line-d);box-shadow:none}
.p-login .or{color:var(--p-ink-3)} .p-login .or::before,.p-login .or::after{background:var(--p-line-d)}
.p-legal-strip{background:var(--p-navy-2);border-top:1px solid var(--p-line-d)}
.p-legal-strip .p-container{color:var(--p-ink-3)} .p-legal-strip b,.p-legal-strip a{color:var(--p-ink-2)}
.p-demo-banner{background:var(--p-navy-2);border-color:var(--gold);color:var(--p-ink)} .p-demo-banner b{color:var(--gold-light)}
/* Opcional, geometría del sitio: */ /* :root{--p-radius:4px} .p-btn,.p-fchip,.p-fsel,.p-fbtn{border-radius:2px} */
```

Estados: hover 200 ms con `--p-expo`; foco siempre `--p-focus`, nunca `outline:0` sin reemplazo; activo oro/navy sobre navy y navy/crema sobre papel; deshabilitado .45.

## 4. Riesgos de contraste (WCAG, aproximados)

| Par | Ratio | Uso |
|---|---|---|
| Oro #C2A968 sobre navy-deeper | 7,4 | Texto de cualquier tamaño, hairlines |
| Oro sobre navy #2A3A52 (`#barrios`) | 5,0 | AA normal; en etiquetas de .64 rem usar gold-light |
| Gold-light #DECDA0 sobre navy-deeper | 10,8 | Eyebrows, títulos de columna, íconos |
| Crema #FBFAF6 sobre navy-deeper | 16,2 | Títulos y cuerpo |
| rgba(251,250,246,.78) / .62 / .5 sobre navy-deeper | 10,2 / 6,6 / 5,1 | Subtítulos / meta / placeholder. Piso .55 para texto chico |
| Text-mid #6B7589 sobre navy | 3,7 | Nunca; es el error típico al pintar navy sin cambiar tinta |
| Navy-deeper sobre oro (botón lleno) | 7,4 | Correcto |
| Oro #C2A968 sobre crema #FBFAF6 | 2,2 | Nunca como texto ni como borde único de un control (`.p-btn` en publicar-aviso hoy) |
| Gold-dark #8A7547 sobre crema / bandeja / off-white | 4,3 / 3,9 / 3,6 | Solo texto grande (precios, ≥ .8 rem); falla en `.p-eyebrow`, `.p-fld label`, `.p-index th` |
| `--p-gold-ink` #75623C sobre crema / off-white | 5,6 / 4,7 | Etiquetas chicas en oro sobre papel |
| Text-mid sobre #FBFAF6 / #F4F0E6 / #EEE5D0 | 4,4 / 4,1 / 3,7 | Falla en texto chico sobre papel; `--p-mid-ink` #59647A da 5,7 / 5,2 / 4,8 |

Regla corta: sobre navy, oro para grande y gold-light para chico; sobre crema, gold-ink para chico, gold-dark para grande, oro puro solo como filete de 1 px.

## 5. Para no parecer Zonaprop

- Ninguna tarjeta blanca sobre la foto del hero; el buscador vive en navy.
- Ningún gris de página (#F5F5F5): lienzo navy, papel crema cálido. Ningún `#fff`, Roboto, Inter ni ícono relleno.
- Sin "Super destacado", "Oportunidad", contadores de avisos, estrellas ni banners; la única etiqueta sobre foto es "Seleccionada" en oro.
- Sin barra inferior fija de contacto; el contacto es el formulario navy de la ficha, ruteado al publicador.
- Sin tres tarjetas iguales con ícono, bordes de color, gradientes en texto ni tiles de métricas.
- Sin naranja ni azul eléctrico; #2A7A4B y #B94A4A solo en estados.
- Sin densidad de clasificado: dos líneas de descripción, una fila de datos, 16 px entre tarjetas, secciones de 64 a 104 px.
