// Módulo de gestión del panel de flows n8n.
// onUse(name, path) es un callback inyectado desde app.js para añadir el flow al sidebar.

export function openFlowsPanel()  { document.getElementById('flows-panel').classList.add('open'); document.getElementById('flows-overlay').classList.add('open'); }
export function closeFlowsPanel() { document.getElementById('flows-panel').classList.remove('open'); document.getElementById('flows-overlay').classList.remove('open'); }

// Llama a /api/flows y devuelve el array de flows
export async function loadFlows() {
  try {
    const res = await fetch('/api/flows');
    return await res.json();
  } catch {
    return [];
  }
}

// Renderiza las tarjetas de flows en el panel
export function renderFlows(flows, onUse) {
  const list = document.getElementById('flows-list');

  if (flows.length === 0) {
    list.innerHTML = '<div class="empty-state">No hay flows en /public/flows/</div>';
    return;
  }

  list.innerHTML = '';
  flows.forEach(flow => {
    const card = document.createElement('div');
    card.className = 'flow-card';

    const hasPath = !!flow.webhookPath;

    card.innerHTML = `
      <div class="flow-card-header">
        <div class="flow-info">
          <span class="flow-name">${flow.name}</span>
          <code class="flow-path ${hasPath ? '' : 'none'}">${hasPath ? flow.webhookPath : 'sin webhook'}</code>
        </div>
        <div class="flow-actions">
          ${hasPath ? `<button class="btn-use-flow">+ Usar</button>` : ''}
          <button class="btn-view-json">{ }</button>
        </div>
      </div>
      <pre class="flow-json-block"></pre>`;

    // Botón "Usar": añade el webhook al sidebar
    if (hasPath) {
      card.querySelector('.btn-use-flow').addEventListener('click', () => {
        onUse(flow.name, flow.webhookPath);
      });
    }

    // Botón "{ }": carga y muestra el JSON del flow bajo demanda
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

    list.appendChild(card);
  });
}
