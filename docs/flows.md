# Flows

Los flows son ficheros `.json` exportados de n8n. Están en `public/flows/` y se pueden importar directamente en n8n via **Settings → Import from file**.

Para añadir un nuevo flow al dashboard: soltar el `.json` en `public/flows/` — aparece automáticamente en `/flows` sin tocar código.

---

## chat-gemini-flow.json

**Nombre:** Chat Gemini  
**Webhook:** `POST /webhook/chat`  
**Propósito:** Recibe un mensaje de texto y devuelve una respuesta generada por Gemini 2.0 Flash.

### Nodos
```
Webhook → Gemini (HTTP Request) → Respond
```

### Requisitos
- Variable de entorno en n8n: `GEMINI_API_KEY` (Google AI Studio)

### Entrada
```json
{ "message": "Hola, ¿qué es n8n?", "timestamp": "..." }
```

### Salida
```json
{ "reply": "n8n es una herramienta de automatización..." }
```

### Notas
- Llama a `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- `extractText()` lo detecta por el campo `reply`

---

## cronvars-flow.json

**Nombre:** Cronvars Fetch  
**Webhook:** `POST /webhook/cronvars`  
**Propósito:** Obtiene variables de cron desde una URL externa y las devuelve limpias.

### Nodos
```
Webhook → Fetch URL (HTTP GET) → Extraer Respuesta (Code) → Respond
```

### Entrada
```json
{ "message": "cualquier texto", "timestamp": "..." }
```

### Salida
```json
{ "output": "contenido de la URL externa" }
```

### Notas
- URL objetivo: `http://setradis.dyndns.org:1080/setradiscte/cron/cronvars.php?opt=fr_pre`
- El nodo Code normaliza distintos campos de respuesta (`data`, `body`, `text`) para garantizar que siempre haya un campo `output`
- `extractText()` lo detecta por el campo `output`

---

## cronvars-flow-2.json

**Nombre:** Cronvars V2 - Logic, Log & Clean  
**Webhook:** `POST /webhook/cronvars-v2`  
**Propósito:** Versión avanzada con enrutamiento de comandos, validación, limpieza de HTML y log local.

### Nodos
```
Webhook V2 → Router de Comandos (Code) → Es Fetch? (IF)
    ├─ SÍ → Ejecutar Cron (HTTP GET) → Limpiar Respuesta (Code) → Guardar Log Local → Respond Success
    └─ NO → Respuesta Info (Respond)
```

### Comandos soportados en el mensaje

| Mensaje | Resultado |
|---|---|
| `/list` | Devuelve las opciones disponibles: `["fr_pre", "man"]` |
| `{opt=fr_pre}` | Ejecuta el cron con opción `fr_pre` |
| `{opt=man}` | Ejecuta el cron con opción `man` |
| cualquier otro | Error con instrucciones de uso |

### Entrada
```json
{ "message": "{opt=fr_pre}", "timestamp": "..." }
```

### Salida (éxito)
```json
{ "output": "resultado limpio del cron sin etiquetas HTML" }
```

### Salida (info / error)
```json
{ "mensaje": "Opciones disponibles", "opciones": ["fr_pre", "man"] }
```

### Notas
- Limpia etiquetas HTML del resultado con regex `/<[^>]*>?/gm`
- Guarda un log en `cronvars_executions.log` en el servidor de n8n
- `extractText()` lo detecta por el campo `output`

---

## widget-drice.json

**Nombre:** Drive - List Folder Content  
**Webhook:** `POST /webhook/list-drive`  
**Propósito:** Lista el contenido de una carpeta de Google Drive.

### Nodos
```
Webhook → Google Drive (List files) → Respond List
```

### Requisitos
- Credencial OAuth2 de Google Drive configurada en n8n (id: `TUS_CREDENCIALES_ID`)
- Sustituir `FOLDER_ID_AQUÍ` en el nodo Google Drive por el ID real de la carpeta

### Entrada
```json
{ "message": "cualquier texto", "timestamp": "..." }
```

### Salida
```json
{
  "total": 3,
  "files": [
    { "id": "...", "name": "documento.pdf", "mimeType": "application/pdf", "modifiedTime": "..." }
  ]
}
```

### Notas
- La query filtra ficheros no eliminados: `'FOLDER_ID' in parents and trashed = false`
- Campos devueltos: `id`, `name`, `mimeType`, `modifiedTime`
- `extractText()` no reconoce este shape → muestra el JSON completo (correcto para este caso de uso)

---

## Discord Webhook Flow.json

**Nombre:** Discord Webhook Flow  
**Webhook:** `POST /webhook/discord-test`  
**Propósito:** Reenvía un mensaje al canal de Discord configurado.

### Nodos
```
Webhook1 → Discord Webhook Request (HTTP POST) → Respond to Webhook1
```

### Entrada
```json
{ "content": "Mensaje a enviar a Discord" }
```

### Salida
```json
{
  "status": "ok",
  "discord_response": { ... },
  "original_body": { "content": "..." }
}
```

### Notas
> **SEGURIDAD:** El fichero contiene una URL de webhook de Discord con token. Si el canal ya no se usa, regenerar el webhook en Discord y actualizar el JSON.

- URL formato: `https://discord.com/api/webhooks/<id>/<token>`
- El flow está marcado como `"active": false` — activarlo en n8n antes de usar
- `extractText()` detecta el campo `status` → muestra "ok" como respuesta en el chat

---

## Añadir un nuevo flow

1. Exportar el flow desde n8n (⋯ → Export)
2. Guardar el `.json` en `public/flows/`
3. Verificar que el nodo Webhook del flow tiene un `parameters.path` definido
4. Si la respuesta usa un shape nuevo, añadir el caso en `extractText()` (`public/js/n8n.js`) con un comentario indicando qué flow lo genera
5. Hacer deploy o reiniciar el servidor local
