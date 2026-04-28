# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the server

```bash
node server.js
```

Runs on `http://0.0.0.0:3000`. Requires n8n running locally on port 5678.

No package.json — zero dependencies, pure Node.js built-ins only.

## Architecture

**`server.js`** — minimal HTTP server with two responsibilities:
1. Proxy: any request to `/webhook/*` or `/webhook-test/*` is forwarded verbatim to `http://localhost:5678`. This avoids CORS issues when the frontend calls n8n directly.
2. Static file server: everything else is served from `public/`, defaulting to `index.html`.

**`public/index.html`** — single-file SPA (all CSS and JS inline). Key design decisions:
- Webhook configs are stored in `localStorage` under the key `n8n_webhooks_v2` (versioned to avoid conflicts with old data).
- `extractText(data)` normalises n8n response shapes — it checks `output`, `reply`, `text`, `message`, `response`, array[0], and Gemini's `candidates[0].content.parts[0].text` in order. Add new shapes here when integrating new flows.
- n8n connectivity is checked every 30 s by POSTing to `/webhook/ping`; the status dot turns green/red accordingly.
- On mobile (≤600px) the sidebar becomes a slide-in drawer with an overlay; on desktop it is always visible.

**`public/*.json`** — example n8n flows ready to import into n8n via *Import from file*:
- `chat-gemini-flow.json` — Webhook → Gemini 2.0 Flash → Respond. Requires `GEMINI_API_KEY` env var in n8n.
- `cronvars-flow.json` / `cronvars-flow-2.json` — cron-triggered variable flows.

## Coding priorities

The goal of this project is to manage n8n workflows perfectly, simplifying calls to the maximum.

**Clean** — Each function does one thing. No nested logic. Names explain intent without comments.

**Scalable** — Adding a new webhook type, a new n8n flow, or a new response format must require touching the minimum possible code (ideally one function or one config object).

**Understandable** — Any developer unfamiliar with n8n must be able to follow the data flow in under 5 minutes: user message → fetch → proxy → n8n → `extractText()` → bubble.

**Commented** — Comment the *why*, never the *what*. Required in:
- `extractText()` for each response shape: which n8n node / AI provider generates it.
- `proxyToN8n()` for any non-obvious header manipulation.
- Any workaround for n8n-specific behaviour.

**n8n call simplification** — Every interaction with n8n must:
- Use a single POST with `{ message, timestamp }` — no extra fields unless the flow explicitly requires them.
- Never duplicate logic between flows; shared behaviour belongs in `extractText()` or a shared helper.
- Fail loudly and visibly (error bubble) rather than silently swallowing bad responses.

## Key constraints

- Webhook paths must start with `/webhook/` or `/webhook-test/` — enforced both in the UI modal and server routing.
- The server strips `transfer-encoding` and recalculates `content-length` before proxying to avoid n8n parse errors with chunked requests.
- No build step, no bundler — edit `index.html` directly.
