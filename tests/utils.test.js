// Run with: node tests/utils.test.js
import { getUrgencyTier, upsertRow, debounce, escapeHtml, todayISO, formatDate } from '../js/utils.js';

let passed = 0, failed = 0;
function assert(desc, condition) {
  if (condition) { console.log(`  ✓ ${desc}`); passed++; }
  else { console.error(`  ✗ ${desc}`); failed++; }
}

// getUrgencyTier
console.log('\ngetUrgencyTier');
const today     = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const in3Days   = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const in10Days  = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
assert('null → none',         getUrgencyTier(null) === 'none');
assert('empty string → none', getUrgencyTier('') === 'none');
assert('yesterday → overdue', getUrgencyTier(yesterday) === 'overdue');
assert('today → today',       getUrgencyTier(today) === 'today');
assert('3 days → week',       getUrgencyTier(in3Days) === 'week');
assert('10 days → upcoming',  getUrgencyTier(in10Days) === 'upcoming');

// upsertRow
console.log('\nupsertRow');
const rows = [{ email: 'a@b.com', name: 'Alice' }];
const inserted = upsertRow(rows, 'email', 'b@b.com', { name: 'Bob' });
const updated  = upsertRow(rows, 'email', 'a@b.com', { name: 'Alicia' });
assert('inserts new row',           inserted.length === 2);
assert('new row has key field',     inserted[1].email === 'b@b.com');
assert('updates existing row',      updated[0].name === 'Alicia');
assert('does not mutate original',  rows[0].name === 'Alice');

// escapeHtml
console.log('\nescapeHtml');
assert('escapes <',   escapeHtml('<b>') === '&lt;b&gt;');
assert('escapes &',   escapeHtml('a & b') === 'a &amp; b');
assert('escapes "',   escapeHtml('"hi"') === '&quot;hi&quot;');
assert('null → ""',   escapeHtml(null) === '');
assert("escapes '",   escapeHtml("it's") === "it&#39;s");

// debounce
console.log('\ndebounce');
let callCount = 0;
const fn = debounce(() => callCount++, 50);
fn(); fn(); fn();
await new Promise(r => setTimeout(r, 120));
assert('fires once after rapid calls', callCount === 1);

// todayISO
console.log('\ntodayISO');
assert('returns YYYY-MM-DD format', /^\d{4}-\d{2}-\d{2}$/.test(todayISO()));
assert('matches current date', todayISO() === new Date().toISOString().slice(0, 10));

// formatDate
console.log('\nformatDate');
assert('empty/null → ""',       formatDate(null) === '');
assert('formats a date string', formatDate('2026-01-15').includes('Jan'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
