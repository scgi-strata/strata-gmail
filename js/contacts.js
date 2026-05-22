import { readContacts, upsertContact } from './sheets.js';
import { searchThreads } from './gmail.js';
import { formatDate, parseThreadMeta, debounce, escapeHtml } from './utils.js';
import { openThreadPanel } from './thread-panel.js';

let allContacts = [];

export async function renderContacts() {
  const view = document.getElementById('view-contacts');
  view.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  allContacts = await readContacts();

  view.innerHTML = `
    <div class="search-bar">
      <input id="contact-search" type="text" placeholder="Search by name or email…" />
    </div>
    <div class="section-header" id="contacts-header">Contacts (${allContacts.length})</div>
    <div class="contact-list" id="contact-list"></div>
  `;

  renderList(allContacts);

  document.getElementById('contact-search').addEventListener('input', debounce(e => {
    const q = e.target.value.toLowerCase();
    const filtered = allContacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
    document.getElementById('contacts-header').textContent = `Contacts (${filtered.length})`;
    renderList(filtered);
  }, 200));
}

function renderList(contacts) {
  const list = document.getElementById('contact-list');
  if (!list) return;

  if (contacts.length === 0) {
    list.innerHTML = '<div class="empty">No contacts yet. They are added automatically when you first track an email.</div>';
    return;
  }

  list.innerHTML = '';
  contacts.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contact-row';
    const initial = (c.name || c.email || '?')[0].toUpperCase();
    row.innerHTML = `
      <div class="contact-avatar">${escapeHtml(initial)}</div>
      <div class="contact-info">
        <div class="contact-name">${escapeHtml(c.name || c.email)}</div>
        <div class="contact-email">${escapeHtml(c.email)}</div>
      </div>
      <div class="contact-last">${c.last_contacted ? formatDate(c.last_contacted) : ''}</div>
    `;
    row.addEventListener('click', () => openContactPanel(c));
    list.appendChild(row);
  });
}

async function openContactPanel(contact) {
  const panel   = document.getElementById('contact-panel');
  const overlay = document.getElementById('panel-overlay');

  panel.innerHTML = `
    <div class="panel-header">
      <button class="panel-close" aria-label="Close panel">✕</button>
      <span style="font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(contact.name || contact.email)}</span>
    </div>
    <div class="panel-body">
      <div class="panel-section">
        <div class="panel-section-title">Contact Info</div>
        <div class="crm-field">
          <label class="crm-label">Name</label>
          <input id="cp-name" class="crm-input" value="${escapeHtml(contact.name || '')}" />
        </div>
        <div class="crm-field">
          <label class="crm-label">Company</label>
          <input id="cp-company" class="crm-input" value="${escapeHtml(contact.company || '')}" />
        </div>
        <div class="crm-field">
          <label class="crm-label">Notes</label>
          <textarea id="cp-notes" class="crm-textarea">${escapeHtml(contact.notes || '')}</textarea>
        </div>
        <button id="cp-save" class="btn-primary" style="font-size:12px;padding:6px 14px">Save</button>
      </div>
      <div class="panel-section">
        <div class="panel-section-title">Email History</div>
        <div id="cp-history"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    </div>
  `;

  panel.classList.remove('hidden');
  panel.classList.add('open');
  overlay.classList.remove('hidden');

  let contactOverlayHandler = null;

  const closePanel = () => {
    if (contactOverlayHandler) {
      overlay.removeEventListener('click', contactOverlayHandler);
      contactOverlayHandler = null;
    }
    panel.classList.remove('open');
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
  };

  panel.querySelector('.panel-close').addEventListener('click', closePanel);
  contactOverlayHandler = closePanel;
  overlay.addEventListener('click', contactOverlayHandler);

  panel.querySelector('#cp-save').addEventListener('click', async () => {
    await upsertContact({
      email:   contact.email,
      name:    panel.querySelector('#cp-name').value,
      company: panel.querySelector('#cp-company').value,
      notes:   panel.querySelector('#cp-notes').value,
    });
    allContacts = await readContacts();
    renderList(allContacts);
    const header = document.getElementById('contacts-header');
    if (header) header.textContent = `Contacts (${allContacts.length})`;
  });

  // Load email history
  const historyEl = document.getElementById('cp-history');
  const threads   = await searchThreads(`from:${contact.email} OR to:${contact.email}`, 20);

  if (threads.length === 0) {
    historyEl.innerHTML = '<div class="empty">No emails found with this contact.</div>';
    return;
  }

  historyEl.innerHTML = '<div class="thread-list" id="cp-thread-list"></div>';
  const tList = document.getElementById('cp-thread-list');
  threads.forEach(({ thread, messages }) => {
    const meta = parseThreadMeta(thread, messages);
    if (!meta) return;
    const row  = document.createElement('div');
    row.className = `thread-row${meta.isUnread ? ' unread' : ''}`;
    row.innerHTML = `
      <div class="thread-info">
        <div class="thread-sender">${escapeHtml(meta.subject)}</div>
        <div class="thread-subject">${escapeHtml(meta.snippet)}</div>
      </div>
      <span class="thread-date">${formatDate(meta.date)}</span>
    `;
    row.addEventListener('click', () => openThreadPanel({ ...meta, crm: {}, messages }));
    tList.appendChild(row);
  });
}
