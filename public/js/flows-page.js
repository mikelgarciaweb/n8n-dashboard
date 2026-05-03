import { loadFlows } from './flows.js';
import { addWebhook } from './webhooks.js';

async function init() {
  const flows = await loadFlows();
  const grid  = document.getElementById('flows-grid');

  document.getElementById('flows-count').textContent = flows.length + ' flow' + (flows.length !== 1 ? 's' : '');

  if (flows.length === 0) {
    grid.innerHTML = '<p class="empty-state">No hay flows en /public/flows/ — añade un fichero .json para que aparezca aquí.</p>';
    return;
  }

  flows.forEach(flow => {
    const hasPath = !!flow.webhookPath;
    const card = document.createElement('div');
    card.className = 'flow-card';
    card.innerHTML = `
      <div class="flow-card-header">
        <div class="flow-info">
          <span class="flow-name">${flow.name}</span>
          <code class="flow-path ${hasPath ? '' : 'none'}">${hasPath ? flow.webhookPath : 'sin webhook'}</code>
        </div>
        <div class="flow-actions">
          ${hasPath ? `<button class="btn-use-flow">+ Usar en Chat</button>` : ''}
          <button class="btn-view-json">{ }</button>
        </div>
      </div>
      <pre class="flow-json-block"></pre>`;

    // Añade el webhook al sidebar del chat y redirige
    if (hasPath) {
      card.querySelector('.btn-use-flow').addEventListener('click', () => {
        addWebhook(flow.name, flow.webhookPath);
        window.location.href = '/';
      });
    }

    // Preview del JSON bajo demanda (carga solo al abrir)
    const jsonBlock = card.querySelector('.flow-json-block');
    const viewBtn   = card.querySelector('.btn-view-json');
    let loaded = false;
    viewBtn.addEventListener('click', async () => {
      if (!loaded) {
        try {
          const res  = await fetch('/flows/' + flow.file);
          const data = await res.json();
          jsonBlock.textContent = JSON.stringify(data, null, 2);
        } catch {
          jsonBlock.textContent = 'Error al cargar el JSON';
        }
        loaded = true;
      }
      jsonBlock.classList.toggle('visible');
      viewBtn.textContent = jsonBlock.classList.contains('visible') ? '✕' : '{ }';
    });

    grid.appendChild(card);
  });
}

init();
