// Punto de entrada: conecta módulos y registra todos los event listeners
import { state } from './state.js';
import { addWebhook, removeWebhook, validateWebhookPath } from './webhooks.js';
import { renderWebhooks, setActiveWebhookBar, openModal, closeModal, toggleSidebar, closeSidebar, autoResize } from './ui.js';
import { sendMessage, checkN8n } from './n8n.js';
import { openFlowsPanel, closeFlowsPanel, loadFlows, renderFlows } from './flows.js';

// --- Coordinación de acciones que afectan a varios módulos ---

function selectWebhook(i) {
  state.activeIndex = i;
  setActiveWebhookBar(state.webhooks[i].name);
  render();
  closeSidebar();
  document.getElementById('msg-input').focus();
}

function deleteWebhook(i) {
  if (!confirm(`¿Eliminar "${state.webhooks[i].name}"?`)) return;
  const wasActive = state.activeIndex === i;
  removeWebhook(i);
  if (wasActive) setActiveWebhookBar(null);
  render();
}

function handleSaveWebhook() {
  const name = document.getElementById('m-name').value.trim();
  const path = document.getElementById('m-path').value.trim();
  if (!name || !path) { alert('Rellena los dos campos'); return; }
  if (!validateWebhookPath(path)) { alert('El path debe empezar por /webhook/ o /webhook-test/'); return; }
  addWebhook(name, path);
  closeModal();
  document.getElementById('m-name').value = '';
  document.getElementById('m-path').value = '';
  render();
}

function render() {
  renderWebhooks(selectWebhook, deleteWebhook);
}

// --- Event listeners ---

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('msg-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.getElementById('msg-input').addEventListener('input', (e) => autoResize(e.target));
document.querySelector('.hamburger').addEventListener('click', toggleSidebar);
document.getElementById('drawer-overlay').addEventListener('click', closeSidebar);
document.querySelector('.sidebar-close').addEventListener('click', closeSidebar);
document.querySelector('.add-webhook').addEventListener('click', openModal);
document.querySelector('.btn-cancel').addEventListener('click', closeModal);
document.querySelector('.btn-save').addEventListener('click', handleSaveWebhook);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Flows panel
document.getElementById('nav-flows').addEventListener('click', async () => {
  const flows = await loadFlows();
  renderFlows(flows, (name, path) => {
    addWebhook(name, path);
    render();
    closeFlowsPanel();
  });
  openFlowsPanel();
});
document.getElementById('flows-close').addEventListener('click', closeFlowsPanel);
document.getElementById('flows-overlay').addEventListener('click', closeFlowsPanel);

// --- Init ---
render();
checkN8n();
setInterval(checkN8n, 30_000);
