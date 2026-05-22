import { listTrashThreads, deleteThreadPermanently } from './gmail.js';
import { formatDate, parseThreadMeta, escapeHtml } from './utils.js';

export async function renderTrash() {
  const view = document.getElementById('view-trash');
  view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const trashData = await listTrashThreads(50);

  if (trashData.length === 0) {
    view.innerHTML = '<div class="empty">Trash is empty.</div>';
    return;
  }

  view.innerHTML = `
    <div class="section-header">Trash (${trashData.length})</div>
    <div class="thread-list" id="trash-list"></div>
  `;

  const list = document.getElementById('trash-list');
  trashData.forEach(({ thread, messages }) => {
    const meta = parseThreadMeta(thread, messages);
    if (!meta) return;
    const row = document.createElement('div');
    row.className = 'thread-row';
    row.style.cssText = 'opacity:0.75';
    row.innerHTML = `
      <div class="thread-info">
        <div class="thread-sender">${escapeHtml(meta.sender)}</div>
        <div class="thread-subject">${escapeHtml(meta.subject)}</div>
      </div>
      <div class="thread-meta">
        <span class="thread-date">${formatDate(meta.date)}</span>
        <button class="delete-forever-btn" data-id="${escapeHtml(thread.id)}"
          style="padding:4px 10px;font-size:11px;font-weight:600;background:var(--overdue-bg);color:var(--overdue-color);border:1px solid var(--overdue-border);border-radius:4px;cursor:pointer;white-space:nowrap">
          Delete Forever
        </button>
      </div>
    `;
    row.querySelector('.delete-forever-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const confirmed = window.confirm(`Permanently delete "${meta.subject}"? This cannot be undone.`);
      if (!confirmed) return;
      btn.textContent = 'Deleting…';
      btn.disabled = true;
      await deleteThreadPermanently(thread.id);
      row.remove();
      // Update count in header
      const remaining = list.querySelectorAll('.thread-row').length;
      const header = view.querySelector('.section-header');
      if (header) header.textContent = `Trash (${remaining})`;
      if (remaining === 0) {
        view.innerHTML = '<div class="empty">Trash is empty.</div>';
      }
    });
    list.appendChild(row);
  });
}
