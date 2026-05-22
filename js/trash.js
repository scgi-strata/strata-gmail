import { listTrashThreads, deleteThreadPermanently, batchDeleteThreadsPermanently } from './gmail.js';
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
    <div class="section-header" id="trash-header">Trash (${trashData.length})</div>
    <div id="trash-batch-bar" class="batch-bar" style="display:none">
      <span class="batch-count" id="trash-batch-count">0 selected</span>
      <button class="batch-action danger" id="trash-batch-delete">Delete Forever</button>
      <button class="batch-clear" id="trash-batch-clear">Clear</button>
    </div>
    <div class="thread-list" id="trash-list"></div>
  `;

  const list = document.getElementById('trash-list');
  const batchBar = document.getElementById('trash-batch-bar');
  const batchCount = document.getElementById('trash-batch-count');
  const selected = new Set();

  function updateBatchBar() {
    if (selected.size > 0) {
      batchBar.style.display = 'flex';
      batchCount.textContent = `${selected.size} selected`;
    } else {
      batchBar.style.display = 'none';
    }
  }

  function updateHeader() {
    const remaining = list.querySelectorAll('.thread-row').length;
    const header = document.getElementById('trash-header');
    if (header) header.textContent = `Trash (${remaining})`;
    if (remaining === 0) view.innerHTML = '<div class="empty">Trash is empty.</div>';
  }

  document.getElementById('trash-batch-clear').addEventListener('click', () => {
    selected.clear();
    list.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
    updateBatchBar();
  });

  document.getElementById('trash-batch-delete').addEventListener('click', async () => {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`Permanently delete ${selected.size} email(s)? This cannot be undone.`);
    if (!confirmed) return;
    const ids = [...selected];
    batchBar.innerHTML = '<span style="color:white;font-size:13px">Deleting…</span>';
    await batchDeleteThreadsPermanently(ids);
    ids.forEach(id => {
      const row = list.querySelector(`[data-thread-id="${id}"]`);
      if (row) row.remove();
    });
    selected.clear();
    updateHeader();
  });

  trashData.forEach(({ thread, messages }) => {
    const meta = parseThreadMeta(thread, messages);
    if (!meta) return;
    const row = document.createElement('div');
    row.className = 'thread-row';
    row.style.cssText = 'opacity:0.75';
    row.dataset.threadId = thread.id;
    row.innerHTML = `
      <input type="checkbox" class="row-check" data-id="${escapeHtml(thread.id)}" />
      <div class="thread-info">
        <div class="thread-sender">${escapeHtml(meta.sender)}</div>
        <div class="thread-subject">${escapeHtml(meta.subject)}</div>
      </div>
      <div class="thread-meta">
        <span class="thread-date">${formatDate(meta.date)}</span>
        <button class="delete-forever-btn"
          style="padding:4px 10px;font-size:11px;font-weight:600;background:var(--overdue-bg);color:var(--overdue-color);border:1px solid var(--overdue-border);border-radius:4px;cursor:pointer;white-space:nowrap">
          Delete Forever
        </button>
      </div>
    `;
    const cb = row.querySelector('.row-check');
    cb.addEventListener('change', e => {
      e.stopPropagation();
      if (cb.checked) selected.add(thread.id); else selected.delete(thread.id);
      updateBatchBar();
    });
    cb.addEventListener('click', e => e.stopPropagation());
    row.querySelector('.delete-forever-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const confirmed = window.confirm(`Permanently delete "${meta.subject}"? This cannot be undone.`);
      if (!confirmed) return;
      btn.textContent = 'Deleting…';
      btn.disabled = true;
      await deleteThreadPermanently(thread.id);
      row.remove();
      selected.delete(thread.id);
      updateBatchBar();
      updateHeader();
    });
    list.appendChild(row);
  });
}
