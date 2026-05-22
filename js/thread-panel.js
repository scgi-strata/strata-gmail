import { upsertThread, upsertContact } from './sheets.js';
import { decodeBody } from './gmail.js';
import { debounce, formatDate, escapeHtml } from './utils.js';

const saveDebounced = debounce(saveThreadCRM, 400);
let currentThread = null;
let overlayHandler = null;

export function openThreadPanel(threadData) {
  currentThread = threadData;
  const panel   = document.getElementById('thread-panel');
  const overlay = document.getElementById('panel-overlay');

  panel.innerHTML = buildPanelHTML(threadData);
  panel.classList.remove('hidden');
  panel.classList.add('open');
  overlay.classList.remove('hidden');

  panel.querySelector('.panel-close').addEventListener('click', closeThreadPanel);
  overlayHandler = closeThreadPanel;
  overlay.addEventListener('click', overlayHandler, { once: true });

  panel.querySelector('#crm-status').addEventListener('change', saveDebounced);
  panel.querySelector('#crm-followup').addEventListener('change', saveDebounced);
  panel.querySelector('#crm-notes').addEventListener('input', saveDebounced);

  panel.querySelector('#crm-trash-btn').addEventListener('click', async () => {
    await import('./gmail.js').then(m => m.trashThread(threadData.id));
    closeThreadPanel();
    // Refresh dashboard if visible
    const dash = document.getElementById('view-dashboard');
    if (dash && !dash.classList.contains('hidden')) {
      const { renderDashboard } = await import('./dashboard.js');
      renderDashboard();
    }
  });
}

function buildPanelHTML(t) {
  const crm = t.crm || {};
  const msgs = [...t.messages].reverse().map(m => {
    const headers = m.payload.headers || [];
    const from    = headers.find(h => h.name === 'From')?.value || '';
    const date    = new Date(parseInt(m.internalDate));
    const body    = escapeHtml(decodeBody(m)).slice(0, 2000);
    return `
      <div class="message">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span class="message-from">${escapeHtml(from)}</span>
          <span class="message-date">${formatDate(date)}</span>
        </div>
        <div class="message-body">${body}</div>
      </div>`;
  }).join('');

  const statusOpts = ['', 'Urgent', 'Pending', 'Waiting', 'Closed'].map(s =>
    `<option value="${s}" ${crm.status === s ? 'selected' : ''}>${s || '— None —'}</option>`
  ).join('');

  return `
    <div class="panel-header">
      <button class="panel-close" aria-label="Close panel">✕</button>
      <span style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${escapeHtml(t.subject)}</span>
    </div>
    <div class="panel-body">
      <div class="panel-section">
        <div class="panel-section-title">Email Thread</div>
        ${msgs}
      </div>
      <div class="panel-section">
        <div class="panel-section-title">CRM</div>
        <div class="crm-field">
          <label class="crm-label" for="crm-status">Status</label>
          <select id="crm-status" class="crm-select">${statusOpts}</select>
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-followup">Follow-up Date</label>
          <input id="crm-followup" type="date" class="crm-input" value="${escapeHtml(crm.follow_up_date || '')}" />
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-notes">Notes</label>
          <textarea id="crm-notes" class="crm-textarea" placeholder="Private notes...">${escapeHtml(crm.notes || '')}</textarea>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px">From: ${escapeHtml(t.sender)} &lt;${escapeHtml(t.senderEmail)}&gt;</p>
        <p id="crm-save-indicator" style="font-size:11px;color:var(--status-closed-color);text-align:right;margin-top:4px;opacity:0;transition:opacity 0.3s"></p>
        <button class="btn-trash" id="crm-trash-btn" style="margin-top:12px;width:100%;padding:8px;background:var(--overdue-bg);color:var(--overdue-color);border:1px solid var(--overdue-border);border-radius:6px;cursor:pointer;font-size:13px;font-weight:500">Move to Trash</button>
      </div>
    </div>`;
}

async function saveThreadCRM() {
  if (!currentThread) return;
  const panel = document.getElementById('thread-panel');

  // Show saving indicator
  const indicator = panel.querySelector('#crm-save-indicator');
  if (indicator) { indicator.textContent = 'Saving…'; indicator.style.opacity = '1'; }

  await upsertThread({
    thread_id:      currentThread.id,
    contact_email:  currentThread.senderEmail,
    subject:        currentThread.subject,
    status:         panel.querySelector('#crm-status').value,
    follow_up_date: panel.querySelector('#crm-followup').value,
    notes:          panel.querySelector('#crm-notes').value,
  });
  await upsertContact({
    email:          currentThread.senderEmail,
    name:           currentThread.sender,
    last_contacted: new Date().toISOString().slice(0, 10),
  });

  // Show saved confirmation
  if (indicator) {
    indicator.textContent = 'Saved ✓';
    setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
  }
}

export function closeThreadPanel() {
  const panel   = document.getElementById('thread-panel');
  const overlay = document.getElementById('panel-overlay');
  if (overlayHandler) {
    overlay.removeEventListener('click', overlayHandler);
    overlayHandler = null;
  }
  panel.classList.remove('open');
  panel.classList.add('hidden');
  overlay.classList.add('hidden');
  currentThread = null;
}
