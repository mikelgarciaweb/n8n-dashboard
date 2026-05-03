// Capa de presentación: renderizado y control del DOM. Sin lógica de negocio.
import { state } from './state.js';

// --- Sidebar ---

export function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('drawer-overlay').classList.toggle('open');
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

// onSelect(i) y onDelete(i) son callbacks inyectados desde app.js
export function renderWebhooks(onSelect, onDelete) {
  const list = document.getElementById('webhook-list');
  if (state.webhooks.length === 0) {
    list.innerHTML = '<div class="empty-state" style="margin-top:8px;font-size:0.8rem;">Sin webhooks.<br>Añade uno abajo.</div>';
    return;
  }
  list.innerHTML = '';
  state.webhooks.forEach((w, i) => {
    const el = document.createElement('div');
    el.className = 'webhook-item' + (state.activeIndex === i ? ' active' : '');

    // Construcción por DOM para evitar XSS — nunca interpolar datos de usuario en innerHTML
    const nameDiv = document.createElement('div');
    nameDiv.className = 'name';
    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.title = 'Eliminar';
    delBtn.textContent = '✕';
    nameDiv.appendChild(document.createTextNode(w.name));
    nameDiv.appendChild(delBtn);

    const pathDiv = document.createElement('div');
    pathDiv.className = 'path';
    pathDiv.textContent = w.path;

    el.appendChild(nameDiv);
    el.appendChild(pathDiv);

    delBtn.addEventListener('click', (e) => { e.stopPropagation(); onDelete(i); });
    el.addEventListener('click', () => onSelect(i));
    list.appendChild(el);
  });
}

// Muestra u oculta la barra de webhook activo (visible en móvil)
export function setActiveWebhookBar(name) {
  document.getElementById('active-name').textContent = name ?? '—';
  document.getElementById('active-bar').classList.toggle('visible', name !== null);
}

// --- Modal añadir webhook ---

export function openModal() {
  document.getElementById('modal').classList.add('open');
  setTimeout(() => document.getElementById('m-name').focus(), 100);
}

export function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// --- Chat ---

// Añade una burbuja al chat y devuelve { bubble, div } para poder modificarla después
export function addMsg(role, text) {
  const msgs  = document.getElementById('messages');
  const empty = msgs.querySelector('.empty-state');
  if (empty) empty.remove();

  const div    = document.createElement('div');
  div.className = `msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = new Date().toLocaleTimeString('es-ES');

  div.appendChild(bubble);
  div.appendChild(meta);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return { bubble, div };
}

// Adjunta un bloque JSON colapsable a una burbuja de respuesta
export function appendJsonToggle(msgDiv, raw) {
  const toggle = document.createElement('div');
  toggle.className = 'json-toggle';
  toggle.textContent = 'Ver respuesta completa';

  const jBlock = document.createElement('div');
  jBlock.className = 'json-block';
  jBlock.textContent = JSON.stringify(raw, null, 2);

  toggle.addEventListener('click', () => {
    jBlock.classList.toggle('visible');
    toggle.textContent = jBlock.classList.contains('visible') ? 'Ocultar' : 'Ver respuesta completa';
  });

  msgDiv.appendChild(toggle);
  msgDiv.appendChild(jBlock);
}

// Ajusta la altura del textarea al contenido
export function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
