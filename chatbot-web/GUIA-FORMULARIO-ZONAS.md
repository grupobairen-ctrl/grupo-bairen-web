# Formulario de zonas (WhatsApp Flows) — multi-selección de barrios

Esto crea el formulario de checkboxes para que la persona elija varias zonas en un solo mensaje.
Es un trámite en Meta (parecido al del webhook), una sola vez.

---

## PASO 1 — Crear el formulario (Flow) en Meta

1. Entrá a **https://business.facebook.com** → buscá **WhatsApp Manager** (Administrador de WhatsApp).
2. En el menú, buscá **"Flujos" / "Flows"** (suele estar en "Herramientas de la cuenta" / "Account tools").
   - Atajo: probá **https://business.facebook.com/wa/manage/flows**
3. Tocá **"Crear flujo" / "Create flow"**.
   - **Nombre:** `Zonas Bairen`
   - **Categoría:** elegí cualquiera (ej. "Más información" / "Other").
   - **Plantilla:** "Empezar de cero" / "Start from scratch".
   - Si te pregunta por un **endpoint / punto de conexión**: elegí **sin endpoint** (es un formulario estático, no necesita servidor).

## PASO 2 — Pegar el formulario

1. Dentro del editor del flujo, buscá el modo **JSON** (un ícono `</>` o un botón "Editar JSON").
2. Borrá lo que haya y **pegá todo el contenido** del archivo `flujo-zonas.flow.json` (está en la carpeta `chatbot-web`).
3. **Guardá**. No debería marcar errores.
   - Si se queja por la **versión** (dice que "5.0" no sirve), cambiá `"version": "5.0"` por el número que te sugiera Meta y guardá de nuevo.

## PASO 3 — Publicar

1. Tocá **"Publicar" / "Publish"**. (Un flujo tiene que estar publicado para usarse de verdad.)

## PASO 4 — Copiar el Flow ID

1. En la lista de flujos (o en los detalles del flujo), vas a ver un **Flow ID**: un número largo.
2. **Copialo.**

## PASO 5 — Cargar el Flow ID en Netlify

1. En Netlify → tu sitio → **Site configuration → Environment variables → Add a variable**:
   - **Key:** `WHATSAPP_FLOW_ID`
   - **Value:** el número largo del Flow ID
   - Scopes: **All scopes** → Save.

## PASO 6 — Base de datos + deploy

1. En Supabase → SQL Editor → corré `schema-flujo.sql` (si no lo hiciste antes). Agrega la columna `estado`.
2. Re-deploy: subí la carpeta `chatbot-web` a Netlify → **Trigger deploy**.

---

## Probar

Escribile "hola" al bot. El primer mensaje ahora trae un botón **"Elegir zonas"** que abre el formulario con checkboxes. Marcás varias zonas, "Continuar", y el bot sigue con los ambientes.

> **Si el formulario no aparece** (sale solo texto pidiendo que escribas las zonas): es porque falta el `WHATSAPP_FLOW_ID` o el flujo no está publicado. Igual funciona escribiendo los barrios (ej: "Palermo, Recoleta") — ese es el fallback que dejé puesto.
