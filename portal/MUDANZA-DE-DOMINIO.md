# Mudar el portal a otro dominio

El portal vive hoy en `portal.bairengroup.com`. El dominio definitivo todavía no
está comprado (se evalúa `bairen.ar`). Este archivo es la lista completa de lo
que hay que tocar el día que se mude, escrita el 23/9/2026 después de dejar el
código preparado para que la mudanza sea corta.

La mayor parte del código **no** tiene el dominio escrito: los links internos
salen de la dirección que el visitante está usando, así que funcionan solos en
cualquier dominio, en las vistas previas de Vercel y en la máquina de casa.
Lo que sigue es lo que sí hay que cambiar a mano.

---

## 1. En Vercel

**Agregar el dominio nuevo** al proyecto `grupo-bairen-web` y apuntar el DNS.

**Variables de entorno** (Settings → Environment Variables), marcadas para
Production **y Preview**, que es donde corre la rama `portal`:

| Variable | Valor |
|---|---|
| `PORTAL_SITE` | La raíz pública del portal con la barra final, por ejemplo `https://bairen.ar/` |

`PORTAL_SITE` es la que usan los mails que salen del sistema para armar los
links a las fichas y al panel. Si no está, se usa el dominio de hoy.

**Después de cambiar cualquier variable hay que volver a desplegar.** Vercel no
las aplica a un despliegue que ya existe.

---

## 2. En el código, cuatro lugares

**`portal/js/ui.js`** · `BP.OS_URL`
La dirección de Bairen OS, que vive en otro subdominio. Es el único lugar del
lado del navegador donde el dominio está escrito.

**`vercel.json`** · tres cosas:
- La redirección que manda la raíz del subdominio a `/portal/` (busca
  `"type": "host"`).
- El `Content-Security-Policy`, si el dominio nuevo sirve algo desde otro lado.
- Nada más: las rutas internas son relativas.

**`api/_portal/admin.js`** y **`api/portal-notify.js`** · la lista `ORIGENES`
Es la que dice qué dominios pueden llamar a la API. Si el dominio nuevo no está,
**las consultas dejan de avisarle al publicador y la sincronización se corta**,
que es exactamente lo que pasó el 23/9/2026 y costó una semana de datos
desactualizados. Agregar el dominio nuevo ahí es obligatorio.

**`portal/index.html`** · las etiquetas para compartir
`og:image` y el bloque de datos estructurados llevan direcciones absolutas
(`https://www.bairengroup.com/...`) porque la norma lo exige. Son cuatro líneas
en la cabecera del archivo.

---

## 3. Una decisión que conviene tomar en la mudanza

Hoy la dirección de cualquier página interna es `portal.bairengroup.com/portal/loquesea`,
con `/portal/` repetido. Es porque el portal es una carpeta dentro del sitio de
bairengroup.com y el subdominio apunta ahí.

Si el portal se muda a un dominio propio, **conviene que quede en la raíz**:
`bairen.ar/propiedades` en vez de `bairen.ar/portal/propiedades`. Es más corto,
más fácil de dictar por teléfono y no arrastra una carpeta que ya no significa
nada. Se resuelve con las reglas de `vercel.json`, sin mover archivos.

---

## 4. Lo que NO cambia

- **Los mails.** `portal@bairengroup.com` y `bairenrealty@gmail.com` son
  casillas, no direcciones web. Siguen funcionando aunque el sitio se mude.
- **La base de datos.** Supabase no sabe ni le importa desde qué dominio se la
  consulta.
- **Los links internos del portal.** Son relativos.

---

## 5. Antes de apagar el dominio viejo

Dejar redirecciones permanentes de `portal.bairengroup.com` al dominio nuevo, al
menos por un año. Hay fichas compartidas por WhatsApp e Instagram que apuntan al
dominio viejo, y un link roto en un aviso es una consulta perdida.
