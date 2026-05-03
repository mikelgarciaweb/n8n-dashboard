# Arquitectura

## Flujo de datos completo

```
[Browser]
    │  input de usuario
    ▼
[app.js]  →  sendMessage()  →  fetch POST /webhook/<path>
                                        │
[server.js]  ←────────────────────────┘
    │  proxy transparente
    ▼
[n8n :5678]  →  ejecuta el flow  →  respuesta JSON
    │
[server.js]  →  devuelve la respuesta al browser
    │
[n8n.js]  →  extractText()  →  renderiza burbuja en el chat
```

---

## Módulos frontend (`public/js/`)

| Fichero | Responsabilidad | Importa |
|---|---|---|
| `state.js` | Estado global (`webhooks[]`, `activeIndex`) | — |
| `webhooks.js` | CRUD webhooks + localStorage | `state.js` |
| `ui.js` | Renderizado DOM, sidebar, modal, burbujas | `state.js` |
| `n8n.js` | fetch al proxy, `extractText()`, ping | `state.js`, `ui.js` |
| `flows.js` | `loadFlows()` → GET /api/flows | — |
| `app.js` | Entry point `/`: conecta módulos, registra eventos | todos |
| `flows-page.js` | Entry point `/flows`: grid de tarjetas | `flows.js`, `webhooks.js` |

---

## Servidor (`server.js`)

### Endpoints

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/` | Sirve `public/index.html` |
| `GET` | `/flows` | Sirve `public/flows.html` |
| `GET` | `/assets/*`, `/js/*` | Ficheros estáticos |
| `GET` | `/api/flows` | Lista flows de `public/flows/*.json` con `{ file, name, webhookPath }` |
| `POST` | `/webhook/*` | Proxy transparente → n8n `:5678` |
| `POST` | `/webhook-test/*` | Proxy transparente → n8n `:5678` (modo test) |

### Por qué existe el proxy

n8n escucha en `localhost:5678`. Sin proxy, el navegador haría fetch directo a ese puerto y el navegador bloquearía la petición por CORS. El proxy actúa como intermediario en el mismo origen (`:3000`), evitando el problema sin tocar la configuración de n8n.

### Manipulación de headers en el proxy

Se elimina `transfer-encoding` y se recalcula `content-length` porque n8n no acepta requests con encoding chunked cuando se envían desde Node.js sin esta corrección.

---

## Páginas

### `/` — Chat
- Sidebar izquierdo con lista de webhooks guardados en `localStorage`.
- Panel de chat derecho: burbujas usuario/bot.
- Barra de estado: dot verde/rojo según ping a n8n cada 30 s.
- En móvil (≤600px): sidebar se convierte en drawer con hamburger.

### `/flows` — Gestión de flows
- Grid de tarjetas con los flows disponibles en `public/flows/`.
- Botón **"+ Usar en Chat"**: añade el webhook a localStorage y redirige a `/`.
- Botón **"{ }"**: carga el JSON del flow bajo demanda (lazy) y lo muestra colapsable.
- El servidor detecta flows automáticamente — basta con añadir un `.json` a `public/flows/`.

---

## Estado persistente

Solo `localStorage`, clave `n8n_webhooks_v2`:

```json
[
  { "name": "Chat Gemini", "path": "/webhook/chat" },
  { "name": "Cronvars",    "path": "/webhook/cronvars" }
]
```

No hay sesión, no hay backend de usuarios. Todo vive en el navegador.

---

## Seguridad

| Medida | Dónde | Por qué |
|---|---|---|
| Path traversal bloqueado | `server.js` | `path.resolve()` + comprobación de que el path esté dentro de `public/` |
| Sin `innerHTML` con datos externos | `ui.js`, `flows-page.js` | Prevención de XSS; usar siempre `textContent` |
| Límite 1 MB en proxy | `server.js` | Evita OOM por payloads gigantes |
| Security headers | `server.js` | `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` |
| Credenciales deploy en env var | `deploy-claudia.ps1` | `$env:DEPLOY_PASS` — nunca hardcodeado en código |

---

## Deploy

Script: `deploy-claudia.ps1`  
Servidor: `claudia@192.168.1.130` → `/home/claudia/n8n-dashboard`  
Proceso: `git push` local → `git pull` remoto → restart `node server.js`

```powershell
# Antes de ejecutar:
$env:DEPLOY_PASS = "tu_contraseña"
.\deploy-claudia.ps1
```
