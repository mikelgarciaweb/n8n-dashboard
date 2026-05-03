# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arrancar en local

```bash
node server.js
# → http://localhost:3000
```

Requiere n8n corriendo en `localhost:5678`. Sin `package.json` — cero dependencias externas, solo Node.js built-ins.

Con VS Code: `F5` arranca el servidor y abre el navegador automáticamente (ver `.vscode/launch.json`).

## Estructura del proyecto

```
n8n-dashboard/
├── server.js                  ← backend: proxy + static server + /api/flows
├── CLAUDE.md
├── deploy-claudia.ps1         ← deploy SSH a 192.168.1.130 (claudia)
├── .vscode/launch.json
├── docs/                      ← documentación detallada
│   ├── arquitectura.md
│   ├── webhooks.md
│   └── flows.md
└── public/
    ├── index.html             ← página Chat (/)
    ├── flows.html             ← página Flows (/flows)
    ├── assets/style.css
    ├── js/
    │   ├── app.js             ← entry point de index.html
    │   ├── flows-page.js      ← entry point de flows.html
    │   ├── state.js           ← estado compartido (webhooks[], activeIndex)
    │   ├── webhooks.js        ← CRUD + localStorage
    │   ├── ui.js              ← renderizado DOM
    │   ├── n8n.js             ← fetch al proxy, extractText(), checkN8n()
    │   └── flows.js           ← loadFlows() → GET /api/flows
    └── flows/                 ← flows n8n importables (.json)
```

## Arquitectura en una línea

`user input → app.js → n8n.js → fetch(/webhook/*) → server.js proxy → n8n:5678 → extractText() → burbuja`

Ver `docs/arquitectura.md` para el detalle completo.

## Coding priorities

El objetivo es gestionar flujos n8n a la perfección, simplificando las llamadas al máximo.

**Limpio** — Cada función hace una sola cosa. Sin lógica anidada.

**Escalable** — Añadir un nuevo flow o formato de respuesta = tocar un solo sitio (`extractText()` o soltar un `.json` en `public/flows/`).

**Comentado** — Comentar el *por qué*, nunca el *qué*. Obligatorio en `extractText()` (qué flow genera cada shape) y en cualquier workaround de n8n.

**Seguro** — Nunca interpolar datos externos en `innerHTML`. Usar siempre `textContent`. Ver `docs/arquitectura.md#seguridad`.

**Llamadas n8n simplificadas** — Siempre `POST { message, timestamp }`. Sin campos extra salvo que el flow lo requiera explícitamente.

## Constraints clave

- Los paths de webhook deben empezar por `/webhook/` o `/webhook-test/` — validado en frontend y servidor.
- El proxy elimina `transfer-encoding` y recalcula `content-length` para evitar errores de parseo en n8n.
- Límite de 1 MB por payload en el proxy (protección DoS).
- Sin bundler ni build step — editar los ficheros directamente.
- Para añadir un nuevo flow: soltar el `.json` en `public/flows/` → aparece automáticamente en `/flows`.
