import { showToast } from './utils.js';

/** Fetches inbox threads with full message data. Returns array of { thread, messages }. */
export async function listInboxThreads(maxResults = 50) {
  try {
    const listRes = await gapi.client.gmail.users.threads.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults,
    });
    const threads = listRes.result.threads || [];
    const detailed = await Promise.all(threads.map(t => getThread(t.id)));
    return detailed.filter(Boolean);
  } catch (err) {
    if (err.status === 429) showToast('Gmail rate limit hit, try again in a moment', 'error');
    else showToast('Failed to load inbox', 'error');
    return [];
  }
}

/** Fetches a single thread with all messages. Returns { thread, messages } or null. */
export async function getThread(threadId) {
  try {
    const res = await gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });
    const thread = res.result;
    return { thread, messages: thread.messages || [] };
  } catch (err) {
    if (err.status === 404) {
      showToast('This email is no longer available in Gmail', 'error');
      return null;
    }
    throw err;
  }
}

/** Searches Gmail with a query string. Returns array of { thread, messages }. */
export async function searchThreads(query, maxResults = 30) {
  try {
    const listRes = await gapi.client.gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults,
    });
    const threads = listRes.result.threads || [];
    const detailed = await Promise.all(threads.map(t => getThread(t.id)));
    return detailed.filter(Boolean);
  } catch {
    showToast('Search failed', 'error');
    return [];
  }
}

/** Returns the total unread message count for the INBOX label. */
export async function getUnreadCount() {
  try {
    const res = await gapi.client.gmail.users.labels.get({ userId: 'me', id: 'INBOX' });
    return res.result.messagesUnread || 0;
  } catch {
    return 0;
  }
}

/**
 * Decodes a Gmail message body to plain text.
 * Recursively searches nested multipart structures for text/plain, falls back to snippet.
 */
export function decodeBody(message) {
  if (!message.payload) return message.snippet || '';
  return findTextPart(message.payload) ?? message.snippet ?? '';
}

function findTextPart(part) {
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }
  if (part.parts) {
    for (const child of part.parts) {
      const result = findTextPart(child);
      if (result !== null) return result;
    }
  }
  return null;
}
