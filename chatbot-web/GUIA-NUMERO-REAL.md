# Pasar el bot al número REAL (producción 24/7)

El número de prueba de Meta es un sandbox: se desactiva solo (token temporal) y no sirve para 24/7.
Esta guía pasa el bot a tu número real. Es un trámite en Meta, una sola vez.

> **Antes de empezar — importante:**
> - El número real **NO puede estar usándose en la app de WhatsApp / WhatsApp Business** al mismo tiempo. Un número vive en un solo lado. Si está en la app, hay que **borrarlo de la app primero** (perdés los chats de ESE número en la app).
> - Tenés que poder **recibir un SMS o una llamada** en ese número (para verificarlo).
> - Ya tenés el **token permanente** (System User) — perfecto, lo vamos a usar.

---

## PASO 1 — Agregar el número en Meta

1. Entrá a **business.facebook.com/wa/manage** (WhatsApp Manager).
2. Elegí tu cuenta de WhatsApp Business.
3. **Phone numbers / Números de teléfono** → **Add phone number / Agregar número**.
4. Cargá:
   - **Nombre para mostrar (display name):** ej. "Bairen" o "Grupo Bairen". (Meta lo revisa; que no sea engañoso.)
   - **Categoría** y demás datos del negocio.
5. Elegí el método de verificación (**SMS** o **llamada**) y poné el número real.

## PASO 2 — Verificar el número

1. Te llega un **código** por SMS/llamada.
2. Cargalo en Meta. Si todo va bien, el número queda **conectado** a la API.

## PASO 3 — Copiar el nuevo Phone Number ID

1. Una vez verificado, en la lista de números vas a ver tu número real con un **Phone Number ID** (un número largo).
2. **Copialo.** (Es distinto al del número de prueba.)

## PASO 4 — Actualizar Netlify

1. Netlify → tu sitio → **Site configuration → Environment variables**:
   - **`WHATSAPP_PHONE_NUMBER_ID`** = el Phone Number ID NUEVO (el del número real).
   - **`WHATSAPP_TOKEN`** = tu **token permanente** (confirmá que sea el permanente, no el temporal).
2. **Re-deploy** (Trigger deploy) para que tome las variables nuevas.

## PASO 5 — Confirmar el webhook

El webhook es a nivel cuenta, así que el mismo sirve para el número nuevo. Igual confirmá:

1. Meta → **WhatsApp → Configuración → Webhook**:
   - **Callback URL:** `https://velvety-starlight-e9a766.netlify.app/webhook`
   - **`messages`** suscrito (toggle prendido).

## PASO 6 — Habilitar producción (mensajes a CUALQUIERA)

En modo desarrollo, el bot solo responde a números "tester". Para que conteste a **todos** (los leads de los anuncios):

1. **Verificación del Negocio:** Meta Business Settings → **Centro de seguridad** → completá la **verificación del negocio** (Meta pide documentación del negocio; puede tardar días).
2. **Método de pago:** en WhatsApp → Configuración, agregá una tarjeta. (Las conversaciones de servicio tienen un tier gratis, pero Meta exige tener el método de pago cargado.)
3. Pasá la app a **modo Live / producción** (en el panel de la app, el toggle de arriba: Development → Live).

## PASO 7 — Probar

1. Desde **otro teléfono** (no el del bot), mandá "hola" al **número real**.
2. Tiene que arrancar el saludo de Tomás.

---

## Resumen de qué cambia

| | Número de prueba (hoy) | Número real (producción) |
|---|---|---|
| Estabilidad | Se corta cada 24 hs | **24/7** |
| A quién responde | Solo hasta 5 testers | **A todos** |
| Token | Temporal | **Permanente** |
| Requiere | Nada | Verificación de negocio + método de pago |

> El **código del bot no cambia nada**. Solo cambiás 1 variable en Netlify (el Phone Number ID) y hacés el trámite en Meta. El filtro, los textos y todo lo probado quedan igual.
