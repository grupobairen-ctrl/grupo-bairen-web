# Bot de WhatsApp de Bairen (prototipo, cuenta no oficial)

Bot de WhatsApp que usa **el mismo cerebro y tono** que el chatbot web
(`../chatbot-web/lib/chat.js`), y además:

- Conversa por WhatsApp con una cuenta **no oficial** (vía Evolution API + QR).
- Cuando hay un interesado en visitar una unidad, ofrece **dos horarios libres de la tarde** (16:00–19:00) con doble alternativa.
- Al confirmar: **agenda la visita en el Google Calendar de Bairen**, registra el lead en Supabase y **le manda un WhatsApp personal a Tiziana** para que ella contacte al interesado, se presente y confirme.

> ⚠️ **La cuenta no oficial puede ser baneada por Meta.** Es ideal para probar. Usá un número **descartable**, nunca el principal de Bairen ni el de Tiziana, y no lo uses para mandar mensajes en masa. Para producción, el plan es migrar a la **WhatsApp Cloud API oficial**.

---

## Arquitectura

```
WhatsApp del lead
   │
   ▼
Evolution API (Docker, en el VPS)  ← conectado por QR al número del bot
   │  webhook  → POST /webhook
   ▼
server.js (Node)  ── reusa ../chatbot-web/lib/chat.js (tono + portfolio Supabase)
   │   ├─ responde con ritmo humano (typing + mensajes separados + fotos)
   │   └─ tools:
   │        ver_disponibilidad → Google Calendar (qué horarios están libres)
   │        agendar_visita     → crea evento + registra lead + avisa a Tiziana
```

---

## 0. Lo que necesitás antes de empezar

1. **Número descartable** para el bot (un chip/SIM o un número virtual). Vas a escanear un QR con él.
2. **Número de Tiziana** en formato internacional sin signos (ej. `5491122334455`).
3. **VPS barato** (ver abajo).
4. **Cuenta de Google** con un calendario para Bairen + una **service account** (ver paso 4).
5. La **API key de Anthropic** (la misma del web).

### VPS recomendado (~US$5–6/mes)

Cualquiera de estos alcanza de sobra (2 GB de RAM):

- **Hetzner Cloud**, plan **CX22** (~€4/mes) — el mejor precio/calidad.
- **DigitalOcean**, droplet **Basic 2 GB** (~US$12/mes) — más caro pero muy fácil.

Tomá uno con **Ubuntu 24.04**. Después:

```bash
# en el VPS, como root
curl -fsSL https://get.docker.com | sh           # instala Docker
apt-get install -y git
# instalá Node 20 (para correr el bot)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
```

---

## 1. Subir el código al VPS

El bot reusa `../chatbot-web`, así que tienen que estar **las dos carpetas juntas**:

```bash
# subí el repo entero (o al menos chatbot-web/ y chatbot-whatsapp/)
scp -r "chatbot-web" "chatbot-whatsapp" root@TU_VPS:/opt/bairen/
```

---

## 2. Levantar Evolution API (el WhatsApp no oficial)

```bash
cd /opt/bairen/chatbot-whatsapp
cp .env.example .env
nano .env          # completá EVOLUTION_API_KEY (una clave larga inventada) y lo demás
docker compose up -d
docker compose logs -f evolution   # esperá a que arranque
```

Conectá el número del bot:

- Abrí `http://TU_VPS:8080/manager` en el navegador, entrá con tu `EVOLUTION_API_KEY`.
- Creá una instancia llamada **`bairen`** (igual que `EVOLUTION_INSTANCE`).
- Te muestra un **QR**: escanealo desde el WhatsApp del número descartable (WhatsApp → Dispositivos vinculados).

> Si tu Evolution es otra versión y cambia algún endpoint, el único archivo a tocar es `lib/evolution.js`.

---

## 3. Crear la tabla de leads (una vez)

En Supabase → SQL Editor, corré `../chatbot/schema-leads.sql` (si todavía no existe la tabla `leads`).

---

## 4. Google Calendar (service account)

1. En [console.cloud.google.com](https://console.cloud.google.com): creá un proyecto, activá **Google Calendar API**.
2. Creá una **Service Account** y bajá su clave **JSON**.
3. En **Google Calendar**: creá (o elegí) el calendario de Bairen → *Configuración del calendario* → **Compartir con personas específicas** → agregá el **email de la service account** con permiso **“Hacer cambios en los eventos”**.
4. Copiá el **ID del calendario** (misma pantalla) a `GOOGLE_CALENDAR_ID`.
5. Pegá el JSON completo (en una sola línea) en `GOOGLE_SERVICE_ACCOUNT_JSON`.

---

## 5. Correr el bot

```bash
cd /opt/bairen/chatbot-whatsapp
npm install                     # instala google-auth-library
# dejalo prendido siempre con pm2:
npm install -g pm2
pm2 start server.js --name bairen-wa
pm2 logs bairen-wa
pm2 save && pm2 startup         # para que arranque solo si se reinicia el VPS
```

Probá el `/health`: `curl http://localhost:3200/health` → debería devolver `{ ok: true }`.

Si Evolution corre en Docker y el bot en el host (este setup), el webhook ya apunta a
`http://host.docker.internal:3200/webhook` (configurado en `docker-compose.yml`).

---

## 6. Probar

Escribile al número del bot desde otro WhatsApp. Probá el camino completo:
"hola" → contale qué buscás → pedile ver una unidad → coordinar visita
("mañana") → te ofrece **dos horarios** → confirmás y le das nombre + teléfono →
te confirma que **Tiziana te escribe**, y a Tiziana le llega el WhatsApp + queda el evento en el calendar.

---

## Ajustes rápidos

- **Tono / qué dice el bot:** `../chatbot-web/lib/chat.js` (es compartido con el web; si lo cambiás, cambia en los dos).
- **Reglas de visita y herramientas:** `lib/brain.js`.
- **Franja horaria:** `VISITA_DESDE` / `VISITA_HASTA` en `.env`.
- **Velocidad del “tipeo”:** `RITMO_ESCALA` en `.env` (1 = humano; 2–3 = más lento).
- **Envío por WhatsApp (texto/fotos/typing):** `lib/evolution.js`.

## Pendiente de verificar en vivo (necesita tus credenciales)

No se pudo testear de punta a punta sin el VPS y las credenciales. Cuando esté arriba hay que confirmar:
- El **formato exacto del webhook** de tu versión de Evolution (parsing en `server.js → extraer()`).
- Los **endpoints** de `lib/evolution.js` (sendText / sendMedia / sendPresence) según tu versión.
- Que la **service account** tenga permiso de escritura en el calendar (paso 4).
