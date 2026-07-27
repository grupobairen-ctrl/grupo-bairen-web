# Conectar el bot a WhatsApp (Cloud API oficial de Meta)

El código ya está listo. Esto es el alta en Meta + cargar las llaves. Lo hacemos por fases.
Para la demo a tus compañeros alcanza el **modo de prueba** de Meta: gratis, número de prueba que da Meta, y le podés mandar hasta 5 números (los tuyos y los de tu equipo). Sin verificación de empresa.

---

## FASE 1 — Subir el webhook a Netlify y elegir una palabra clave

El bot de WhatsApp necesita una dirección pública donde Meta le hable. Esa dirección la da Netlify (es invisible, tus clientes no ven ninguna página: usan WhatsApp).

1. Subí la carpeta `chatbot-web` a tu sitio de Netlify (cuenta nueva), como ya hiciste antes.
2. Tu webhook va a ser: **`https://TU-SITIO.netlify.app/webhook`** (anotá tu URL real).
3. Elegí una **palabra clave de verificación** (la inventás vos, cualquier texto sin espacios). Ejemplo: `bairen-webhook-2026`. La vas a usar en dos lados y tienen que coincidir.
4. En Netlify → **Site configuration → Environment variables**, agregá (además de `ANTHROPIC_API_KEY` que ya está):
   - `WHATSAPP_VERIFY_TOKEN` = `bairen-webhook-2026` (tu palabra clave)
5. **Deploys → Trigger deploy** para que tome la variable.

---

## FASE 2 — Crear la app de WhatsApp en Meta

1. Entrá a **https://developers.facebook.com** e iniciá sesión con tu Facebook (si no tenés cuenta de desarrollador, te la crea ahí).
2. **My Apps → Create App**.
3. Caso de uso: elegí **"Other"** → tipo de app: **"Business"**.
4. Ponele un nombre (ej: "Bairen Bot") y creala.
5. En el panel de la app, buscá **WhatsApp** y tocá **"Set up"**.
6. Se abre **WhatsApp → API Setup**. Ahí tenés todo lo que necesitamos:
   - Un **número de teléfono de prueba** (lo da Meta, arriba).
   - Un **token de acceso temporal** (dura 24 hs, sirve para probar hoy).
   - El **Phone number ID** (un número largo, debajo del teléfono de prueba).
7. En esa misma página, sección **"To"** / **"Manage phone number list"**: agregá los números a los que vas a poder escribir (el tuyo y los de tus compañeros, hasta 5). A cada uno le llega un código de WhatsApp para confirmarlo.

---

## FASE 3 — Cargar las llaves de Meta en Netlify

En Netlify → **Site configuration → Environment variables**, agregá:

- `WHATSAPP_TOKEN` = el **token de acceso** que viste en API Setup
- `WHATSAPP_PHONE_NUMBER_ID` = el **Phone number ID** (el número largo, NO el teléfono)

Y **Deploys → Trigger deploy** otra vez (para que tome las nuevas variables).

> Recordá el error de antes: el **nombre** de la variable va arriba (ej. `WHATSAPP_TOKEN`), el **valor** abajo.

---

## FASE 4 — Conectar el webhook en Meta

1. En la app de Meta: **WhatsApp → Configuration** (o "Webhooks").
2. **Callback URL:** `https://TU-SITIO.netlify.app/webhook`
3. **Verify token:** la misma palabra clave que pusiste en Netlify (`bairen-webhook-2026`).
4. Tocá **"Verify and save"**. Si todo está bien, Meta confirma el webhook (nuestro código le responde el desafío automáticamente).
5. En **Webhook fields**, suscribite al campo **`messages`** (tocá "Subscribe").

---

## FASE 5 — Probar

1. Desde uno de los números que registraste, mandale un WhatsApp al **número de prueba** de Meta.
2. Escribí "hola". Tomás te tiene que responder.
3. Probá "busco 2 ambientes en Palermo", pedile fotos, etc.

---

## Cosas para saber (importante)

- **El token de prueba dura 24 hs.** Para que el bot siga andando después, hay que generar un **token permanente** (System User). Te guío cuando quieras dejarlo estable.
- **Modo de prueba = hasta 5 números.** Para escribirle a cualquiera (producción), Meta pide **verificación de empresa** y aprobar el número. Eso es el paso de producción, más adelante.
- **Número definitivo:** el número de prueba es de Meta. Para usar el número propio de Bairen en producción, se registra en Meta (no puede estar activo en WhatsApp normal a la vez).
- La **seguridad de las tablas** (leads, conversaciones) hoy está abierta para arrancar; en producción la cerramos para que escriba solo el servidor.
