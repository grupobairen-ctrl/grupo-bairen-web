# Chatbot Bairen — Versión definitiva (sobre Evolution)

Esta es la **mejor versión del bot, enchufada a tus propiedades reales de Supabase**. Lo único que queda para más adelante es pasar a la **API oficial de WhatsApp**; por ahora corre sobre **Evolution API** (WhatsApp no-oficial, vía QR).

El bot:
- Lee el **portfolio real** desde Supabase (solo lo publicado y disponible, con fotos y amenities).
- Manda las **fotos** desde tu Storage de Supabase por WhatsApp.
- Guarda los **leads** en una tabla `leads` de Supabase + avisa al equipo por mail.
- Habla en **tono Bairen** (sobrio, sin emojis, sin exclamaciones) con **Claude**.
- Entiende **texto, audio y fotos** que mande el cliente.

## Archivos

| Archivo | Qué es |
|---|---|
| `bairen-agente-whatsapp.json` | Workflow principal (el cerebro). |
| `bairen-envio-fotos.json` | Sub-workflow que manda fotos (Supabase → WhatsApp). |
| `schema-leads.sql` | Crea la tabla `leads` en Supabase. **Correr una vez.** |
| `docker-compose.yml` | Levanta n8n + Postgres + Redis + Evolution en tu Mac. |

> Ya viene resuelto: tono Bairen, motor Claude, datos desde Supabase (tu URL y anon key ya están puestas), fotos desde Storage, captura de leads, mail a grupobairen@gmail.com, y **sin** dependencia de Google Sheets / Google Drive / Chatwoot.

---

## Arquitectura (cómo fluye un mensaje)

```
WhatsApp del cliente
   │  (Evolution API)
   ▼
Webhook n8n ─▶ detecta tipo (texto / audio→Whisper / imagen→visión)
   │
   ▼  buffer Redis (agrupa mensajes seguidos, espera 10s)
   ▼
AI Agent (Claude Sonnet 4.6) + memoria (Postgres)
   ├─ propiedades_disponibles → Supabase REST (portfolio real)
   ├─ enviar_fotos           → sub-workflow → Supabase Storage → WhatsApp
   ├─ registrar_lead         → Supabase REST (tabla leads)
   └─ enviar_email           → Gmail (aviso al equipo)
   │
   ▼  Format Chain (Claude Haiku) parte la respuesta en mensajitos
   ▼
Evolution API → responde por WhatsApp
```

---

## Puesta en marcha

### Paso 0 — Lo que necesitás

1. **API key de Anthropic** — https://console.anthropic.com (cargá unos USD).
2. **API key de OpenAI** — https://platform.openai.com (solo para audio/imagen; opcional si no probás eso).
3. **Docker Desktop** abierto.
4. Acceso a tu proyecto **Supabase** (ya está cableado al proyecto `nmrjyyrhwjroonrppnka`).

### Paso 1 — Crear la tabla de leads en Supabase

Supabase → SQL Editor → New query → pegá el contenido de `schema-leads.sql` → **Run**.

### Paso 2 — Levantar el stack

```bash
cd "chatbot"
docker compose up -d
```

Esperá un minuto y entrá a **http://localhost:5678**. Creá el usuario admin (es local).

### Paso 3 — Importar los workflows

Menú *⋮ → Import from File* → `bairen-agente-whatsapp.json`. Repetí con `bairen-envio-fotos.json`.

### Paso 4 — Cargar credenciales (los nodos en rojo)

| Credencial | Dónde | Qué poner |
|---|---|---|
| **Bairen - Anthropic** | en los 3 nodos de modelo | tu API key de Anthropic. Confirmá el modelo: *Claude Sonnet 4.6* en el del agente, *Claude Haiku 4.5* en Format/parser. |
| **Bairen - OpenAI** | nodos de audio/imagen | tu API key de OpenAI (para Whisper y visión). |
| **Bairen - Redis** | nodos Redis | host `redis`, puerto `6379`. |
| **Bairen - Postgres** | Postgres Chat Memory | host `postgres`, db `n8n`, user `bairen`, pass `bairen_local_2026`. |
| **Bairen - Evolution** | nodos Evolution API | Base URL `http://evolution:8080`, API key `bairen-evolution-key-cambiala`. |
| **Bairen - Gmail** | enviar_email | OAuth con la cuenta de Bairen. |

> Las herramientas de Supabase (**propiedades_disponibles** y **registrar_lead**) **no necesitan credencial**: usan tu anon key en los headers, ya puesta. Y el sub-workflow de fotos llama a Supabase y a Evolution por URL, también ya configurado.

### Paso 5 — Re-vincular el sub-workflow de fotos

En el workflow principal, abrí el nodo **enviar_fotos** y en *Workflow* elegí el importado **"Bairen — Envío de Fotos"** (el ID viejo no existe en tu instancia).

### Paso 6 — Conectar WhatsApp (Evolution)

Usá un **número descartable** (no el personal ni el definitivo de Bairen: Meta puede bloquear conexiones no-oficiales).

```bash
# crear la instancia
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: bairen-evolution-key-cambiala" -H "Content-Type: application/json" \
  -d '{"instanceName":"bairen","integration":"WHATSAPP-BAILEYS"}'

# registrar el webhook hacia n8n
curl -X POST http://localhost:8080/webhook/set/bairen \
  -H "apikey: bairen-evolution-key-cambiala" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"http://host.docker.internal:5678/webhook/chatbot-evolution","events":["MESSAGES_UPSERT"]}}'
```

Pedí el QR en **http://localhost:8080/instance/connect/bairen** (header `apikey`) y escanealo desde *WhatsApp → Dispositivos vinculados*.

### Paso 7 — Activar y probar

Activá el workflow (toggle arriba a la derecha) y escribile al número descartable desde otro teléfono:
- "hola"
- "busco 2 ambientes en Palermo hasta 600 mil"
- "me gustó, mandame fotos"
- "quiero visitarlo, soy Lucía, 11 2345 6789"

**Qué mirar:** que use tus propiedades reales, que mande fotos de Supabase, que el lead aparezca en la tabla `leads`, y que el tono sea Bairen (sin emojis, sin exclamaciones, sereno).

---

## Verificar antes de confiar (lo hago explícito porque no puedo correr n8n por vos)

Los workflows son JSON válido y están cableados, pero **estos 4 puntos conviene probarlos una vez en n8n**, porque dependen de versiones de nodos y de tu instancia:

1. **propiedades_disponibles**: ejecutá el nodo suelto (botón *Test step*). Debe traer tus propiedades con `imagenes` adentro. Si da 401, revisá que la anon key del header siga vigente.
2. **registrar_lead**: probá una vez; si el body con `$fromAI` no inserta, te lo paso como sub-workflow (patrón más robusto).
3. **enviar_fotos**: ejecutá el sub-workflow con un `slug` real y un `remoteJid`. Verificá que Evolution acepte `sendMedia` por URL (si tu versión pide otro formato, lo ajusto).
4. **Audio/imagen**: si no vas a probarlos ya, podés ignorar esos nodos.

Si alguno falla, decime el error exacto del nodo y lo corrijo.

---

## Modelo de datos que usa el bot

- **`propiedades`** (ya existe): lee `publicada = true` y `estado = 'Disponible'`. Devuelve slug, dirección, barrio, tipo, precios, ambientes, m2, plazo, descripción + `imagenes` + `amenities` en una sola consulta.
- **`imagenes`** (ya existe): el bot ordena por `orden` (la 0 es portada) y manda las URLs.
- **`leads`** (la creás con `schema-leads.sql`): nombre, teléfono, whatsapp, propiedad, zona, presupuesto, ambientes, notas, estado.

---

## Lo que queda para producción (cuando quieras)

- **WhatsApp Cloud API oficial**: tilde verde "Grupo Bairen", sin riesgo de ban. Cambia el nodo de entrada y el de salida (te lo armo cuando decidas).
- **Handoff a humano**: pausar el bot para un cliente cuando lo atiende una persona. Lo resolvemos con un flag en Supabase o Redis (sin necesidad de Chatwoot).
- **Filtros en la consulta**: hoy trae todo el portfolio disponible y el agente filtra (ideal para inventario curado y chico). Si crece a cientos, agregamos filtros por barrio/precio en la query.
- **Caption en las fotos**: hoy van sin texto; se puede poner la dirección o un detalle.
- **Panel de leads**: ver los leads del bot dentro de tu `admin.html`.
