# Webhooks

## Qué es un webhook en este proyecto

Un webhook es una URL de n8n que recibe una petición POST y ejecuta un flow. Este dashboard actúa como cliente: el usuario escribe un mensaje, el frontend hace POST a `/webhook/<path>`, el servidor lo proxea a n8n, y n8n devuelve una respuesta JSON.

---

## Formato de petición estándar

Todas las llamadas del chat usan este body:

```json
{
  "message": "texto que escribe el usuario",
  "timestamp": "2026-05-03T10:00:00.000Z"
}
```

No añadir campos extra salvo que el flow los requiera explícitamente.

---

## Formato de respuesta — `extractText()`

n8n puede devolver la respuesta en distintas formas según el nodo final del flow. La función `extractText()` en `public/js/n8n.js` normaliza todas ellas:

| Shape de respuesta | Campo leído | Quién lo produce |
|---|---|---|
| `string` directa | valor completo | flows sin nodo Respond |
| `{ output: "..." }` | `output` | flows con nodo Code + `return [{ json: { output } }]` |
| `{ reply: "..." }` | `reply` | `chat-gemini-flow` |
| `{ text: "..." }` | `text` | flows genéricos |
| `{ message: "..." }` | `message` (si no hay `code`) | flows de error o info |
| `{ response: "..." }` | `response` | flows personalizados |
| `[{ ... }]` | recursión sobre `[0]` | n8n devuelve arrays |
| `{ candidates[0].content.parts[0].text }` | texto de Gemini | llamada directa a Gemini API sin nodo Respond |
| cualquier otro | `JSON.stringify` completo | fallback visible, nunca silencioso |

**Para añadir un nuevo shape:** editar `extractText()` en `public/js/n8n.js` y añadir un comentario indicando qué flow lo genera.

---

## Webhooks actualmente configurados en el sistema

Los webhooks se guardan en `localStorage` del navegador. No hay lista fija en el servidor. Cada usuario gestiona los suyos desde la UI.

### Añadir un webhook manualmente
1. Abrir `/` (Chat)
2. Hacer clic en **"+ Añadir webhook"** en el sidebar
3. Introducir nombre y path (debe empezar por `/webhook/` o `/webhook-test/`)

### Añadir un webhook desde la página de Flows
1. Ir a `/flows`
2. Hacer clic en **"+ Usar en Chat"** en la tarjeta del flow deseado
3. El dashboard añade el webhook automáticamente y redirige al chat

---

## Validación de paths

El path debe comenzar obligatoriamente por:
- `/webhook/` — producción (n8n ejecuta el flow real)
- `/webhook-test/` — test (n8n ejecuta el flow en modo prueba, sin guardar en historial)

Esta validación se aplica en dos lugares:
- Frontend: `webhooks.js → validateWebhookPath()`
- Servidor: `server.js` solo proxea paths con estos prefijos

---

## Conectividad con n8n

El status dot en la barra superior indica si n8n está disponible:

- 🟢 Verde: n8n responde en `localhost:5678`
- 🔴 Rojo: n8n no disponible

La comprobación se hace cada 30 segundos con `POST /webhook/ping`. Si n8n no tiene un flow en ese path, devuelve 404 — pero la conexión existe y el dot se pone verde igualmente (el proxy llega a n8n). Si el proxy no puede conectar a n8n en absoluto, devuelve 502 y el dot se pone rojo.

---

## Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Burbuja roja "Error de red" | n8n no corre o port 5678 cerrado | Arrancar n8n |
| Burbuja roja "Respuesta no válida" | El flow no devuelve JSON válido | Revisar el nodo Respond del flow |
| Burbuja muestra JSON completo | `extractText()` no reconoce el shape | Añadir el nuevo shape a `extractText()` |
| Dot siempre rojo | n8n no corre o firewall bloquea 5678 | Verificar `http://localhost:5678` |
