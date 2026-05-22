import { listInboxThreads, getUnreadCount } from './gmail.js';
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
    const crm  = crmMap[thread.id] || {};
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
    <div class="thread-list" id="dashboard-list"></div>
  `;

  const list = document.getElementById('dashboard-list');

  if (threads.length === 0) {
    list.innerHTML = '<div class="empty">No emails in inbox.</div>';
    return;
  }

  threads.forEach(t => {
    const row = document.createElement('div');
    row.className = `thread-row${t.isUnread ? ' unread' : ''}`;
    row.innerHTML = `
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
    row.addEventListener('click', () => openThreadPanel(t));
    list.appendChild(row);
  });
}
