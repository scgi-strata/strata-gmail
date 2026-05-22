/**
 * Returns urgency tier for a follow-up date string (YYYY-MM-DD).
 * Returns 'none' if no date is set.
 */
export function getUrgencyTier(followUpDate) {
  if (!followUpDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(followUpDate + 'T00:00:00');
  const diffDays = Math.floor((due - today) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'week';
  return 'upcoming';
}

/** Formats a date or timestamp for display, e.g. "Jun 2". */
export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Returns today as a YYYY-MM-DD string. */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Debounces fn — only fires after delay ms have passed since the last call.
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Shows a toast notification. type: 'info' | 'error' */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/**
 * Upserts a row in an array of plain objects.
 * Finds the row where row[keyField] === keyValue and merges newData into it.
 * If not found, appends a new row. Returns a new array — does not mutate input.
 */
export function upsertRow(rows, keyField, keyValue, newData) {
  const idx = rows.findIndex(r => r[keyField] === keyValue);
  if (idx === -1) return [...rows, { [keyField]: keyValue, ...newData }];
  const updated = [...rows];
  updated[idx] = { ...updated[idx], ...newData };
  return updated;
}

/** Escapes HTML special characters to prevent XSS. */
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses Gmail API thread + messages into display-ready metadata.
 * Returns { id, subject, sender, senderEmail, snippet, date, isUnread }
 */
export function parseThreadMeta(thread, messages) {
  if (!messages?.length) return null;
  const first = messages[0];
  const last  = messages[messages.length - 1];
  const headers = first.payload.headers || [];
  const getHeader = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  const from = getHeader('From');
  const emailMatch = from.match(/<(.+)>/);
  return {
    id: thread.id,
    subject: getHeader('Subject') || '(no subject)',
    sender: from.replace(/<.+>/, '').trim().replace(/^"|"$/g, '') || from,
    senderEmail: emailMatch ? emailMatch[1] : from,
    snippet: last.snippet || '',
    date: new Date(parseInt(last.internalDate)),
    isUnread: last.labelIds?.includes('UNREAD') ?? false,
  };
}
