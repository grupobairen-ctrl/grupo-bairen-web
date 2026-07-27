# Chatbot Bairen — versión web

Chatbot de Grupo Bairen que corre en el navegador, con el **mismo cerebro** que tendría en WhatsApp: Claude + el tono de marca Bairen + tus propiedades reales de Supabase. Sin Docker, sin Colima, sin n8n. Solo Node (que ya tenés).

- **Cerebro idéntico al de WhatsApp:** las respuestas que veas acá son palabra por palabra lo que diría en WhatsApp.
- **Datos reales:** lee las propiedades publicadas y disponibles de tu Supabase.
- **Barato:** usa prompt caching, así el tono + el portfolio no se recobran en cada mensaje.

## Archivos

| Archivo | Qué es |
|---|---|
| `lib/chat.js` | El cerebro: trae propiedades de Supabase + llama a Claude. |
| `server.js` | Servidor local (para probar en tu compu). |
| `public/index.html` | La página de chat (estética Bairen). |
| `netlify/functions/chat.js` | La misma lógica, para el deploy con link público. |

---

## Parte A — Probarlo en tu compu (5 minutos)

1. **Conseguí una API key de Anthropic** en https://console.anthropic.com (cargá unos USD; un demo gasta centavos). Empieza con `sk-ant-...`.

2. En Terminal, entrá a la carpeta:
   ```bash
   cd "/Users/tomasromero/Desktop/WEB DE BAIREN/chatbot-web"
   ```

3. Levantá el chatbot pegando tu llave (reemplazá `sk-ant-...`):
   ```bash
   ANTHROPIC_API_KEY=sk-ant-... node server.js
   ```

4. Abrí el navegador en **http://localhost:3000** y escribile:
   - "hola"
   - "busco 2 ambientes en Palermo"
   - "mostrame fotos"

   Mirá que use tus propiedades reales, en tono Bairen (sobrio, sin emojis).

   > No necesitás entrar a Supabase ni a GitHub: el chatbot lee los datos con la llave pública, que ya está puesta.

Para frenarlo: en la Terminal apretá `Ctrl + C`.

---

## Parte B — Subirlo para tener un link que compartir (cuando el tono te cierre)

Esto lo hostea **gratis en Netlify** (donde ya está tu sitio) y te da una URL para pasarles a tus compañeros. Corre 24/7, sin tu compu prendida.

1. Entrá a https://app.netlify.com → **Add new site → Deploy manually**.
2. Arrastrá la carpeta `chatbot-web` completa a la zona de deploy.
3. Cuando termine, andá a **Site settings → Environment variables → Add a variable**:
   - Key: `ANTHROPIC_API_KEY`
   - Value: tu `sk-ant-...`
4. **Deploys → Trigger deploy → Deploy site** (para que tome la variable).
5. Te queda una URL tipo `https://nombre-al-azar.netlify.app` — ese es el link que compartís.

> Si preferís, lo conectamos a tu repo para que se actualice solo — pero eso necesita tu acceso a GitHub (el que estás recuperando). El deploy manual de arriba no lo necesita.

---

## Qué se puede agregar después

- **Captura de leads:** guardar en Supabase a quien deje nombre y teléfono (igual que el plan de WhatsApp).
- **Widget en bairengroup.com:** el mismo chat embebido como burbuja en tu sitio.
- **Fotos más ricas:** hoy el bot comparte el enlace de la foto y la página la muestra; se puede pulir el carrusel.
- **Pasarlo a WhatsApp:** el cerebro (este `lib/chat.js`) es el mismo; solo cambia por dónde entran y salen los mensajes.
