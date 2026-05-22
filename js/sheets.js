import { CONFIG } from './config.js';
import { showToast, upsertRow } from './utils.js';

const CONTACTS_RANGE = 'Contacts!A:E';
const THREADS_RANGE  = 'Threads!A:G';

const CONTACTS_FIELDS = ['email', 'name', 'company', 'notes', 'last_contacted'];
const THREADS_FIELDS  = ['thread_id', 'contact_email', 'subject', 'status', 'follow_up_date', 'notes', 'updated_at'];

function rowsToObjects(fields, rows) {
  return rows.map(row => Object.fromEntries(fields.map((f, i) => [f, row[i] ?? ''])));
}

function objectsToRows(fields, objects) {
  return objects.map(obj => fields.map(f => obj[f] ?? ''));
}

async function readRange(range) {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    range,
  });
  const rows = res.result.values || [];
  return rows.slice(1); // skip header row
}

async function writeRange(range, allRows) {
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    resource: { values: allRows },
  });
}

export async function readContacts() {
  try {
    return rowsToObjects(CONTACTS_FIELDS, await readRange(CONTACTS_RANGE));
  } catch {
    showToast("Couldn't load contacts — check your connection", 'error');
    return [];
  }
}

export async function upsertContact(data) {
  // data: { email, name?, company?, notes?, last_contacted? }
  try {
    const contacts = await readContacts();
    const updated  = upsertRow(contacts, 'email', data.email, data);
    await writeRange(CONTACTS_RANGE, [CONTACTS_FIELDS, ...objectsToRows(CONTACTS_FIELDS, updated)]);
  } catch {
    showToast("Couldn't save — check your connection", 'error');
  }
}

export async function readThreads() {
  try {
    return rowsToObjects(THREADS_FIELDS, await readRange(THREADS_RANGE));
  } catch {
    showToast("Couldn't load thread data — check your connection", 'error');
    return [];
  }
}

export async function upsertThread(data) {
  // data: { thread_id, contact_email?, subject?, status?, follow_up_date?, notes? }
  try {
    const threads = await readThreads();
    const merged  = { ...data, updated_at: new Date().toISOString() };
    const updated = upsertRow(threads, 'thread_id', data.thread_id, merged);
    await writeRange(THREADS_RANGE, [THREADS_FIELDS, ...objectsToRows(THREADS_FIELDS, updated)]);
  } catch {
    showToast("Couldn't save — check your connection", 'error');
  }
}
