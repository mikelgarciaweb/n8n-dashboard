// Data layer: CRUD sobre la lista de webhooks. Sin dependencias de DOM.
import { state } from './state.js';

const STORAGE_KEY = 'n8n_webhooks_v2';

export function saveWebhooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.webhooks));
}

// Valida que el path apunte a un endpoint n8n válido
export function validateWebhookPath(path) {
  return path.startsWith('/webhook/') || path.startsWith('/webhook-test/');
}

export function addWebhook(name, path) {
  state.webhooks.push({ name, path });
  saveWebhooks();
}

// Elimina el webhook y ajusta activeIndex si hace falta
export function removeWebhook(index) {
  state.webhooks.splice(index, 1);
  if (state.activeIndex === index) {
    state.activeIndex = null;
  } else if (state.activeIndex > index) {
    state.activeIndex--;
  }
  saveWebhooks();
}
