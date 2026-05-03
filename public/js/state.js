// Single source of truth for runtime state shared across modules
export const state = {
  webhooks:    JSON.parse(localStorage.getItem('n8n_webhooks_v2') || '[]'),
  activeIndex: null,
};
