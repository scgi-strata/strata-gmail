import { readThreads } from './sheets.js';
import { getThread } from './gmail.js';
import { getUrgencyTier, formatDate, parseThreadMeta, escapeHtml } from './utils.js';
import { openThreadPanel } from './thread-panel.js';

const TIER_ORDER = { overdue: 0, today: 1, week: 2, upcoming: 3 };
const TIER_LABEL = { overdue: 'OVERDUE', today: 'TODAY', week: 'THIS WEEK', upcoming: 'UPCOMING' };

export async function renderFollowups() {
  const view = document.getElementById('view-followups');
  view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const crmThreads = await readThreads();
  const tracked = crmThreads
    .filter(t => t.follow_up_date)
    .sort((a, b) => {
      const diff = (TIER_ORDER[getUrgencyTier(a.follow_up_date)] ?? 3)
                 - (TIER_ORDER[getUrgencyTier(b.follow_up_date)] ?? 3);
      return diff !== 0 ? diff : new Date(a.follow_up_date) - new Date(b.follow_up_date);
    });

  if (tracked.length === 0) {
    view.innerHTML = '<div class="empty">No follow-ups set yet.<br>Open an email and set a follow-up date to track it here.</div>';
    return;
  }

  view.innerHTML = `
    <div class="section-header">Follow-ups (${tracked.length})</div>
    <div class="thread-list" id="followups-list"></div>
  `;

  const list = document.getElementById('followups-list');
  tracked.forEach(crm => {
    const tier = getUrgencyTier(crm.follow_up_date);
    const row  = document.createElement('div');
    row.className = 'thread-row';
    row.innerHTML = `
      <span class="thread-badge ${tier}">${TIER_LABEL[tier] || ''}</span>
      <div class="thread-info">
        <div class="thread-sender">${escapeHtml(crm.contact_email)}</div>
        <div class="thread-subject">${escapeHtml(crm.subject || '(no subject)')}</div>
      </div>
      <div class="thread-meta">
        ${crm.status ? `<span class="status-tag ${crm.status.toLowerCase()}">${escapeHtml(crm.status)}</span>` : ''}
        <span class="thread-date">${formatDate(crm.follow_up_date)}</span>
      </div>
    `;
    row.addEventListener('click', async () => {
      const result = await getThread(crm.thread_id);
      if (!result) return;
      const meta = parseThreadMeta(result.thread, result.messages);
      if (!meta) return;
      openThreadPanel({ ...meta, crm, messages: result.messages });
    });
    list.appendChild(row);
  });
}
