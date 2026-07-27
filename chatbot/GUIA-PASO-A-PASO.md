# Guía paso a paso — Chatbot Bairen (de cero)

Para macOS (Intel). No hace falta saber programar. Seguí los pasos en orden.
Tiempo estimado: 1 a 2 horas la primera vez.

Cada vez que veas un bloque gris con comandos, se copia y se pega en la app **Terminal**
(la abrís con la lupa de Spotlight arriba a la derecha → escribí "Terminal" → Enter).

---

## PARTE 0 — Conseguir las llaves (hacelo primero, tardan un poco)

### 0.1 — Llave de Anthropic (Claude) — OBLIGATORIA

1. Entrá a https://console.anthropic.com y creá una cuenta (o iniciá sesión).
2. Andá a **Billing** (Facturación) y cargá crédito: con 5 a 10 USD sobra para meses de prueba.
3. Andá a **API Keys** → **Create Key** → ponele de nombre "Bairen" → **Copiá la llave**.
   Empieza con `sk-ant-...`. Guardala en una nota; no la vas a poder volver a ver entera.

### 0.2 — Llave de OpenAI — OPCIONAL (solo si querés que entienda audios y fotos)

1. Entrá a https://platform.openai.com → creá cuenta / iniciá sesión.
2. **Settings → Billing** → cargá 5 USD.
3. **API keys → Create new secret key** → copiala (empieza con `sk-...`).
   Si por ahora no te importa audio/imagen, salteá esto.

> La llave de Supabase ya está puesta en el bot. No tenés que tocar nada ahí.

---

## PARTE 1 — Instalar el motor de contenedores (Colima)

Tu macOS (12.7.6) es anterior al que pide la última Docker Desktop. No hay problema:
usamos **Colima**, que cumple la misma función y funciona perfecto en tu Mac.
Son 3 comandos en Terminal.

### 1.1 — Instalar Homebrew (el instalador de programas de Mac)

Pegá esto en Terminal y apretá Enter. Te va a pedir tu **contraseña de Mac**
(al escribirla no se ve nada, es normal; escribila y Enter). Tarda unos minutos.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Si en el camino te aparece una ventana pidiendo instalar las "Command Line Tools", aceptá.

Cuando termina, comprobá:

```bash
brew --version
```

Tiene que mostrar algo como `Homebrew 4...`.

### 1.2 — Instalar Colima y Docker

```bash
brew install colima docker docker-compose
```

### 1.3 — Encender el motor

```bash
colima start --cpu 2 --memory 5 --disk 20
```

La primera vez tarda un par de minutos (crea una máquina liviana por dentro).
Cuando vuelve el cursor sin error, está listo. Comprobá:

```bash
docker ps
```

Si muestra una tabla con encabezados (aunque esté vacía), funciona.

> De ahora en más, **cada vez que prendas la Mac** y quieras usar el bot, primero corré
> `colima start` una vez. Para apagar el motor del todo: `colima stop`.

---

## PARTE 2 — Crear la tabla de leads en Supabase

1. Entrá a https://app.supabase.com → tu proyecto de Bairen.
2. En el menú de la izquierda, **SQL Editor** → **New query**.
3. Abrí el archivo `chatbot/schema-leads.sql`, copiá TODO su contenido y pegalo en el editor.
4. Clic en **Run** (o Cmd+Enter). Tiene que decir *Success*.

Esto crea la tabla donde el bot va a guardar los interesados.

---

## PARTE 3 — Levantar el sistema del bot

1. Asegurate de que el motor esté encendido (si recién prendiste la Mac): `colima start`
2. En Terminal, entrá a la carpeta del bot (copiá tal cual, con las comillas):

```bash
cd "/Users/tomasromero/Desktop/WEB DE BAIREN/chatbot"
```

3. Levantá todo:

```bash
docker-compose up -d
```

La primera vez tarda unos minutos (baja n8n, Postgres, Redis y Evolution).
Cuando termina, vas a ver varias líneas con `Started` o `Running`.

4. Comprobá que está todo arriba:

```bash
docker-compose ps
```

Tenés que ver 4 servicios (`n8n`, `postgres`, `redis`, `evolution`) en estado *running / up*.

---

## PARTE 4 — Configurar n8n (el cerebro)

### 4.1 — Entrar

1. Abrí el navegador en: **http://localhost:5678**
2. La primera vez te pide crear un usuario dueño: poné tu mail y una contraseña. (Es local, queda en tu Mac.)

### 4.2 — Importar los dos workflows

1. Arriba a la derecha, el menú de tres puntos **⋮** → **Import from File**.
2. Elegí `chatbot/bairen-agente-whatsapp.json`. Se abre el workflow.
3. Repetí: **⋮ → Import from File** → `chatbot/bairen-envio-fotos.json`.

### 4.3 — Cargar las credenciales (los nodos que aparecen en rojo)

Abrí el workflow **"Bairen — Agente WhatsApp"**. Vas a ver nodos con un triángulo rojo: les falta credencial. Hacé clic en cada uno y completá según esta tabla. **Solo cargás cada credencial una vez**; después el resto de los nodos del mismo tipo la reusan.

| Nodo (clic) | Credencial | Qué poner |
|---|---|---|
| **OpenAI Chat Model** (es de Claude) | Anthropic → *Create New* | Pegá tu llave `sk-ant-...`. Guardá. En **Model** elegí **Claude Sonnet 4.6**. |
| **Format Chain** y el otro modelo | la misma Anthropic | En **Model** elegí **Claude Haiku 4.5**. |
| **OpenAI3** y **Analyze image** | OpenAI → *Create New* | Tu llave `sk-...`. (Si salteaste OpenAI, ignorá estos dos.) |
| Cualquier nodo **Redis** | Redis → *Create New* | Host: `redis` · Port: `6379` · sin contraseña. |
| **Postgres Chat Memory** | Postgres → *Create New* | Host: `postgres` · Database: `n8n` · User: `bairen` · Password: `bairen_local_2026` · Port: `5432`. |
| Cualquier nodo **Evolution API** | Evolution → *Create New* | Base URL: `http://evolution:8080` · API Key: `bairen-evolution-key-cambiala`. |

> Las herramientas **propiedades_disponibles** y **registrar_lead** NO piden credencial: ya llevan tu llave de Supabase en los headers.

### 4.4 — Re-vincular el sub-workflow de fotos

1. En el workflow principal, clic en el nodo **enviar_fotos**.
2. En el campo **Workflow**, elegí de la lista **"Bairen — Envío de Fotos"** (el que importaste).
3. Guardá (Cmd+S).

### 4.5 — Probar el tono SIN WhatsApp todavía (opcional pero recomendado)

Antes de conectar WhatsApp, podés ver si Claude responde como Bairen:

1. Arrastrá al lienzo un nodo nuevo: clic en el **+**, buscá **"Manual Chat Trigger"**, agregalo.
2. Conectá su salida a la entrada del nodo **AI Agent** (arrastrá la bolita).
3. Abajo aparece un botón **Chat**. Escribí "hola" y mandá. Después "busco 2 ambientes en Palermo".
4. Mirá que responda sobrio, sin emojis, sin signos de exclamación, y que traiga TUS propiedades reales.
5. Cuando estés conforme, **borrá ese nodo de prueba** (clic y tecla Supr) para no dejarlo conectado.

---

## PARTE 5 — Conectar WhatsApp (Evolution)

Usá un **número descartable** (un chip viejo o uno nuevo). NO uses tu WhatsApp personal ni el número final de Bairen: como Evolution es no-oficial, Meta puede bloquear el número.

### 5.1 — Abrir el panel de Evolution

1. En el navegador entrá a: **http://localhost:8080/manager**
2. Te pide una API Key: pegá `bairen-evolution-key-cambiala` → entrar.

### 5.2 — Crear la instancia y escanear el QR

1. Clic en **Create Instance** (o "Nueva instancia").
2. Nombre de la instancia: escribí exactamente **bairen** (en minúscula).
3. Guardá. Te va a mostrar un **código QR**.
4. En el teléfono del número descartable: WhatsApp → **Configuración → Dispositivos vinculados → Vincular un dispositivo** → escaneá el QR de la pantalla.
5. Cuando el panel diga **connected / open**, ya está vinculado.

### 5.3 — Decirle a Evolution que avise a n8n

Esto conecta "llega un WhatsApp" con "el bot lo procesa". En el panel de la instancia **bairen**, buscá la sección **Webhook / Settings** y poné:

- **Enabled / Activado:** sí
- **URL:** `http://n8n:5678/webhook/chatbot-evolution`
- **Eventos:** marcá **MESSAGES_UPSERT**

Guardá.

> Si tu panel no tiene esa sección, avisame y te paso el comando para Terminal que hace lo mismo.

### 5.4 — Activar el bot

1. Volvé a n8n (http://localhost:5678), abrí **"Bairen — Agente WhatsApp"**.
2. Arriba a la derecha, poné el interruptor **Active** en ON (verde).
   (Un workflow tiene que estar activo para recibir mensajes de verdad.)

---

## PARTE 6 — Probar de punta a punta

Desde **otro teléfono**, mandale un WhatsApp al número descartable:

1. "hola" → tiene que saludar como Bairen.
2. "busco 2 ambientes en Palermo hasta 600 mil" → tiene que ofrecerte algo de tu portfolio real.
3. "mandame fotos" → tiene que llegar las fotos de esa propiedad (las de Supabase).
4. "quiero verlo, soy Lucía, 11 2345 6789" → revisá en Supabase (tabla **leads**) que se haya guardado.

Si algo no responde, en n8n entrá a **Executions** (menú izquierdo): ahí ves cada mensaje que entró y, si hubo un error, en qué nodo. Copiame ese error y lo arreglo.

---

## PARTE 7 — Apagar y volver a encender

- **Apagar el bot** (sin perder nada), en Terminal dentro de la carpeta `chatbot`:
  ```bash
  docker-compose down
  ```
- **Encender de nuevo** (acordate de prender el motor primero):
  ```bash
  colima start
  docker-compose up -d
  ```
  Los datos (n8n, propiedades, leads) quedan guardados entre apagados.
- **Apagar el motor del todo** (libera memoria de la Mac): `colima stop`

---

## Si algo sale mal (lo más común)

- **No abre localhost:5678** → esperá 1 minuto más; Docker tarda en arrancar la primera vez. Reintentá.
- **El bot no contesta en WhatsApp** → revisá: (a) el workflow está **Active**, (b) el webhook en Evolution apunta a `http://n8n:5678/webhook/chatbot-evolution`, (c) la instancia está **connected**.
- **No trae propiedades** → en n8n abrí el nodo **propiedades_disponibles** y apretá **Test step**: tiene que devolver tus propiedades. Si da error 401, avisame (puede ser la llave de Supabase).
- **No llegan las fotos** → probá el sub-workflow **enviar_fotos** con un slug real. Si Evolution rechaza el formato, copiame el error y lo ajusto.

Cualquier error, copiámelo tal cual y seguimos.
