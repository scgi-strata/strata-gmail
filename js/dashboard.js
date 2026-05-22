import { listInboxThreads, getUnreadCount, batchTrashThreads } from './gmail.js';
import { readThreads } from './sheets.js';
import { getUrgencyTier, formatDate, parseThreadMeta, escapeHtml } from './utils.js';
import { openThreadPanel } from './thread-panel.js';

const TIER_ORDER = { overdue: 0, today: 1, week: 2, none: 3, upcoming: 4 };
const TIER_LABEL = { overdue: 'OVERDUE', today: 'TODAY', week: 'THIS WEEK', upcoming: 'UPCOMING', none: 'NEW' };
const TIER_CLASS = { overdue: 'overdue', today: 'today', week: 'week', upcoming: 'upcoming', none: 'new' };

export async function renderDashboard() {
  const view = document.getElementById('view-dashboard');
  view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const [inboxData, crmThreads, unreadCount] = await Promise.all([
    listInboxThreads(50),
    readThreads(),
    getUnreadCount(),
  ]);

  const crmMap = Object.fromEntries(crmThreads.map(t => [t.thread_id, t]));

  const threads = inboxData.map(({ thread, messages }) => {
    const meta = parseThreadMeta(thread, messages);
    if (!meta) return null;
    const crm = crmMap[thread.id] || {};
    return { ...meta, crm, messages, tier: getUrgencyTier(crm.follow_up_date || '') };
  }).filter(Boolean);

  threads.sort((a, b) => {
    const diff = (TIER_ORDER[a.tier] ?? 3) - (TIER_ORDER[b.tier] ?? 3);
    if (diff !== 0) return diff;
    if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
    return b.date - a.date;
  });

  const overdueCount = threads.filter(t => t.tier === 'overdue').length;
  const todayCount   = threads.filter(t => t.tier === 'today').length;

  view.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card overdue">
        <div class="stat-card-number">${overdueCount}</div>
        <div class="stat-card-label">Overdue</div>
      </div>
      <div class="stat-card today">
        <div class="stat-card-number">${todayCount}</div>
        <div class="stat-card-label">Due Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-number">${unreadCount}</div>
        <div class="stat-card-label">Unread</div>
      </div>
    </div>
    <div class="section-header">Priority Inbox</div>
    <div id="inbox-batch-bar" class="batch-bar" style="display:none">
      <span class="batch-count" id="inbox-batch-count">0 selected</span>
      <button class="batch-action danger" id="inbox-batch-trash">Move to Trash</button>
      <button class="batch-clear" id="inbox-batch-clear">Clear</button>
    </div>
    <div class="thread-list" id="dashboard-list"></div>
  `;

  const list = document.getElementById('dashboard-list');
  const batchBar = document.getElementById('inbox-batch-bar');
  const batchCount = document.getElementById('inbox-batch-count');
  const selected = new Set();

  function updateBatchBar() {
    if (selected.size > 0) {
      batchBar.style.display = 'flex';
      batchCount.textContent = `${selected.size} selected`;
    } else {
      batchBar.style.display = 'none';
    }
  }

  document.getElementById('inbox-batch-clear').addEventListener('click', () => {
    selected.clear();
    list.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
    updateBatchBar();
  });

  document.getElementById('inbox-batch-trash').addEventListener('click', async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    batchBar.innerHTML = '<span style="color:white;font-size:13px">Moving to trash…</span>';
    await batchTrashThreads(ids);
    await renderDashboard();
  });

  if (threads.length === 0) {
    list.innerHTML = '<div class="empty">No emails in inbox.</div>';
    return;
  }

  threads.forEach(t => {
    const row = document.createElement('div');
    row.className = `thread-row${t.isUnread ? ' unread' : ''}`;
    row.innerHTML = `
      <input type="checkbox" class="row-check" data-id="${escapeHtml(t.id)}" />
      <span class="thread-badge ${TIER_CLASS[t.tier]}">${TIER_LABEL[t.tier]}</span>
      <div class="thread-info">
        <div class="thread-sender">${escapeHtml(t.sender)}</div>
        <div class="thread-subject">${escapeHtml(t.subject)}</div>
      </div>
      <div class="thread-meta">
        ${t.crm.status ? `<span class="status-tag ${t.crm.status.toLowerCase()}">${escapeHtml(t.crm.status)}</span>` : ''}
        <span class="thread-date">${formatDate(t.date)}</span>
      </div>
    `;
    const cb = row.querySelector('.row-check');
    cb.addEventListener('change', e => {
      e.stopPropagation();
      if (cb.checked) selected.add(t.id); else selected.delete(t.id);
      updateBatchBar();
    });
    cb.addEventListener('click', e => e.stopPropagation());
    row.addEventListener('click', () => openThreadPanel(t));
    list.appendChild(row);
  });
}
