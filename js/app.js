import { initAuth, signOut } from './auth.js';
import { initTheme } from './theme.js';
import { renderDashboard } from './dashboard.js';
import { renderFollowups } from './followups.js';
import { renderContacts } from './contacts.js';
import { searchThreads } from './gmail.js';
import { parseThreadMeta, escapeHtml, formatDate } from './utils.js';
import { openThreadPanel } from './thread-panel.js';

function onSignedIn() {
  initTheme();
  wireNav();
  wireSearch();
  document.getElementById('sign-out-btn').addEventListener('click', signOut);
  navigateTo('dashboard');
}

function wireNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.view);
    });
  });
}

function wireSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const q = input.value.trim();
    if (!q) return;

    showView('dashboard');
    updateNavActive('dashboard');
    const view = document.getElementById('view-dashboard');
    view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    const results = await searchThreads(q, 30);

    if (results.length === 0) {
      view.innerHTML = `<div class="empty">No results for "${escapeHtml(q)}".</div>`;
      return;
    }

    view.innerHTML = `
      <div class="section-header">Search: "${escapeHtml(q)}" — ${results.length} result${results.length !== 1 ? 's' : ''}</div>
      <div class="thread-list" id="search-list"></div>
    `;

    const list = document.getElementById('search-list');
    results.forEach(({ thread, messages }) => {
      const meta = parseThreadMeta(thread, messages);
      if (!meta) return;
      const row  = document.createElement('div');
      row.className = `thread-row${meta.isUnread ? ' unread' : ''}`;
      row.innerHTML = `
        <div class="thread-info">
          <div class="thread-sender">${escapeHtml(meta.sender)}</div>
          <div class="thread-subject">${escapeHtml(meta.subject)}</div>
        </div>
        <span class="thread-date">${formatDate(meta.date)}</span>
      `;
      row.addEventListener('click', () => openThreadPanel({ ...meta, crm: {}, messages }));
      list.appendChild(row);
    });
  });
}

function navigateTo(view) {
  showView(view);
  updateNavActive(view);
  if (view === 'dashboard') renderDashboard();
  else if (view === 'followups') renderFollowups();
  else if (view === 'contacts') renderContacts();
}

function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`)?.classList.remove('hidden');
}

function updateNavActive(view) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });
}

window.addEventListener('load', () => {
  initAuth(onSignedIn);
});
