// Capa de comunicación con n8n a través del proxy local (server.js → localhost:5678)
import { state } from './state.js';
import { addMsg, appendJsonToggle, toggleSidebar } from './ui.js';

// Normaliza los distintos formatos de respuesta que pueden devolver los flujos n8n.
// Añadir aquí nuevas formas al integrar nuevos flows o proveedores IA.
export function extractText(data) {
  if (typeof data === 'string')                         return data;
  if (data.output)                                      return data.output;
  if (data.reply)                                       return data.reply;  // chat-gemini-flow
  if (data.text)                                        return data.text;
  if (data.message && !data.code)                       return data.message;
  if (data.response)                                    return data.response;
  if (Array.isArray(data) && data[0])                   return extractText(data[0]);
  // Respuesta directa de Gemini generateContent (sin nodo Respond)
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
  return JSON.stringify(data, null, 2);
}

// Envía el mensaje del input al webhook activo y renderiza la respuesta
export async function sendMessage() {
  if (state.activeIndex === null) { toggleSidebar(); return; }

  const input = document.getElementById('msg-input');
  const btn   = document.getElementById('send-btn');
  const text  = input.value.trim();
  if (!text) return;

  input.value      = '';
  input.style.height = 'auto';
  btn.disabled     = true;

  addMsg('user', text);
  const { bubble, div } = addMsg('bot', 'Procesando...');
  bubble.classList.add('loading');

  try {
    const wh  = state.webhooks[state.activeIndex];
    const res = await fetch(wh.path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // n8n espera siempre { message, timestamp } — no añadir campos extra sin que el flow los use
      body:    JSON.stringify({ message: text, timestamp: new Date().toISOString() }),
    });

    const rawText = await res.text();
    let raw;
    try {
      raw = JSON.parse(rawText);
    } catch {
      bubble.classList.replace('loading', 'error');
      bubble.textContent = `Respuesta no válida (HTTP ${res.status}):\n${rawText.substring(0, 300)}`;
      btn.disabled = false;
      return;
    }

    bubble.classList.remove('loading');
    bubble.textContent = extractText(raw);
    appendJsonToggle(div, raw);

  } catch (e) {
    bubble.classList.replace('loading', 'error');
    bubble.textContent = 'Error de red: ' + e.message;
  }

  btn.disabled = false;
  input.focus();
}

// Comprueba la conectividad con n8n cada 30 s usando un ping al proxy
export async function checkN8n() {
  const dot    = document.getElementById('n8n-dot');
  const status = document.getElementById('n8n-status');
  try {
    await fetch('/webhook/ping', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    '{}',
    });
    dot.className      = 'dot';
    status.textContent = 'n8n conectado · localhost:5678';
  } catch {
    dot.className      = 'dot red';
    status.textContent = 'n8n no disponible';
  }
}
