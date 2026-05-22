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
  panel.querySelector('#crm-save-btn').addEventListener('click', saveThreadCRM);

  // Wire Add related thread button
  panel.querySelector('#crm-related-add').addEventListener('click', () => {
    const input = panel.querySelector('#crm-related-input');
    const url = input.value.trim();
    if (!url) return;
    const list = panel.querySelector('#crm-related-list');
    const item = document.createElement('div');
    item.className = 'related-thread-item';
    item.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:4px 8px';
    item.innerHTML = `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="flex:1;font-size:12px;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none">↗ ${escapeHtml(url)}</a>
      <button class="remove-related" data-url="${escapeHtml(url)}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:0 2px;line-height:1">×</button>
    `;
    item.querySelector('.remove-related').addEventListener('click', () => item.remove());
    list.appendChild(item);
    input.value = '';
  });

  // Wire remove buttons on existing items
  panel.querySelectorAll('.remove-related').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.related-thread-item').remove());
  });

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
          <label class="crm-label">Related Gmail Threads</label>
          <div id="crm-related-list" style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px">
            ${(crm.related_threads || '').split('|').filter(u => u.trim()).map(url => `
              <div class="related-thread-item" style="display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:4px 8px">
                <a href="${escapeHtml(url.trim())}" target="_blank" rel="noopener" style="flex:1;font-size:12px;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none">↗ ${escapeHtml(url.trim())}</a>
                <button class="remove-related" data-url="${escapeHtml(url.trim())}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:0 2px;line-height:1">×</button>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:6px">
            <input id="crm-related-input" class="crm-input" placeholder="Paste Gmail thread URL…" style="flex:1;font-size:12px" />
            <button id="crm-related-add" style="padding:6px 10px;background:var(--accent);color:var(--btn-primary-text);border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap">Add</button>
          </div>
        </div>
        <div class="crm-field">
          <label class="crm-label" for="crm-notes">Notes</label>
          <textarea id="crm-notes" class="crm-textarea" placeholder="Private notes...">${escapeHtml(crm.notes || '')}</textarea>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <button id="crm-save-btn" class="btn-primary" style="flex:1;padding:8px;font-size:13px">Save</button>
          <p id="crm-save-indicator" style="font-size:11px;color:var(--status-closed-color);opacity:0;transition:opacity 0.3s;margin:0"></p>
        </div>
        <button class="btn-trash" id="crm-trash-btn" style="margin-top:8px;width:100%;padding:8px;background:var(--overdue-bg);color:var(--overdue-color);border:1px solid var(--overdue-border);border-radius:6px;cursor:pointer;font-size:13px;font-weight:500">Move to Trash</button>
        <p style="font-size:12px;color:var(--text-muted);margin-top:10px">From: ${escapeHtml(t.sender)} &lt;${escapeHtml(t.senderEmail)}&gt;</p>
        <a href="https://mail.google.com/mail/#all/${escapeHtml(t.id)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:13px;color:var(--accent);text-decoration:none;font-weight:500">
          ↗ Open in Gmail
        </a>
      </div>
    </div>`;
}

async function saveThreadCRM() {
  if (!currentThread) return;
  const panel = document.getElementById('thread-panel');

  // Show saving indicator
  const indicator = panel.querySelector('#crm-save-indicator');
  if (indicator) { indicator.textContent = 'Saving…'; indicator.style.opacity = '1'; }

  const relatedUrls = [...panel.querySelectorAll('.related-thread-item a')]
    .map(a => a.getAttribute('href'))
    .filter(Boolean)
    .join('|');

  await upsertThread({
    thread_id:       currentThread.id,
    contact_email:   currentThread.senderEmail,
    subject:         currentThread.subject,
    status:          panel.querySelector('#crm-status').value,
    follow_up_date:  panel.querySelector('#crm-followup').value,
    notes:           panel.querySelector('#crm-notes').value,
    related_threads: relatedUrls,
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
