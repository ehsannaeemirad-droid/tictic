#!/usr/bin/env node
/* ============================================================
   roundtrip.mjs — the data-integrity gate for the TickTick bridge.
   Runs the real modules (store.js, ticktick.js) in Node against a
   minimal DOM shim, then measures:

     1. TickTick CSV      export → parse → import  (mapped fields)
     2. TickTick JSON     export → parse → import  (mapped fields)
     3. full backup JSON  export → parse → restore (every field)
     4. duplicate safety  importing the same file twice skips, never doubles
     5. samples/          the shipped sample files parse with 0 errors

   exit 0 = every assertion holds · exit 1 = the failing field is printed
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------------- minimal DOM: modules must load outside a browser ------- */
const el = (tag = 'div') => {
  const node = {
    tagName: tag, children: [], dataset: {}, style: { setProperty() {} },
    className: '', textContent: '', hidden: false, disabled: false, value: '', files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    append(...c) { node.children.push(...c); }, appendChild(c) { node.children.push(c); },
    prepend() {}, remove() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], focus() {}, click() {},
    insertAdjacentHTML() {}, cloneNode: () => el(tag),
  };
  return node;
};
globalThis.document = {
  documentElement: el('html'), head: el('head'), body: el('body'),
  createElement: el, createElementNS: (_ns, t) => el(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  addEventListener() {}, removeEventListener() {}, AudioContext: null,
};
globalThis.localStorage = {
  _d: new Map(),
  getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
  setItem(k, v) { this._d.set(k, String(v)); },
  removeItem(k) { this._d.delete(k); },
  clear() { this._d.clear(); },
};
/* newer Node exposes navigator as a getter-only global */
try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, userAgent: 'node' }, configurable: true }); } catch { /* leave the built-in */ }
/* store.js asks for indexedDB through `'indexedDB' in window` → absent on purpose */

const root = path.dirname(fileURLToPath(import.meta.url));
const load = (p) => import(new URL(`../src/js/${p}`, import.meta.url).href);
const { S, makeTask } = await load('store.js');
const { dayKey } = await load('i18n.js');
const {
  toTickCsv, toTickJson, toBackup, parseAny, parseTickCsv, parseTickJson,
  previewImport, applyImport, restoreBackup, tickDate, parseTickDate, downloadFile,
} = await load('ticktick.js');

/* ---------------- results table ---------------- */
let fails = 0, checks = 0;
const eq = (label, got, want) => {
  checks++;
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { fails++; console.log(`  ✗ ${label}\n      got  ${g}\n      want ${w}`); }
};
const ok = (label, cond, detail = '') => {
  checks++;
  if (!cond) { fails++; console.log(`  ✗ ${label}${detail ? '\n      ' + detail : ''}`); }
};

/* ---------------- fixture: every field the mapping claims to carry ------- */
const freshState = () => {
  S.tasks = []; S.projects = []; S.flows = []; S.dumps = []; S.habits = []; S.countdowns = [];
  S.sections = []; S.tagsBank = []; S.savedFilters = []; S.postSessions = []; S.checkins = [];
  S.lists = [{ id: 'inbox', name: 'اینباکس', system: true }, { id: 'l_work', name: 'کار' }];
  S.sprint = null; S.xp = 0; S.fuel = 0; S.driftCounts = {}; S.energyModes = {};
  S.settings = { lang: 'fa', theme: 'system', calendar: 'gregorian', weekStart: 'sat', energyBehavior: {} };
};
freshState();

const D = (y, m, d, h, mi) => new Date(y, m - 1, d, h || 0, mi || 0, 0, 0).toISOString();
/* the stored shape matters: a calendar day must stay a calendar day */
const shape = (v) => (v == null ? null : String(v).length <= 10 ? 'day' : 'instant');
const fixture = () => {
  freshState();
  const rows = [
    makeTask({
      id: 'p1', title: 'پروژه بازطراحی سایت', listId: 'l_work', priority: 'high', tags: ['کار', 'مهم'],
      dueDate: '2026-11-01', notes: 'سه فاز: تحقیق، طراحی، اجرا', kind: 'action',
    }),
    makeTask({
      id: 'p2', parentId: 'p1', title: 'جمع‌آوری نمونه‌ها', listId: 'l_work', priority: 'med',
      dueDate: '2026-11-03', order: 2, subtasks: [{ title: 'سبک‌شناسی', done: true }, { title: 'رنگ‌ها', done: false }],
      notes: 'شامل کاما, گیومه " و\nخط جدید\nپاراگراف دوم',
    }),
    makeTask({
      id: 'p3', title: 'Milk & bread 🥛', listId: 'inbox', priority: 'none', tags: ['home'],
      dueDate: D(2026, 10, 14, 8, 0), plannedStart: D(2026, 10, 14, 7, 30),
      estimate: 15, reminder: ['TRIGGER:PT0S'],
    }),
    makeTask({
      id: 'p4', title: 'مدیتیشن', listId: 'inbox', priority: 'low', recurrence: 'daily',
      dueDate: D(2026, 10, 14, 6, 15), status: 'todo',
    }),
    makeTask({
      id: 'p5', title: 'کار تمام‌شده', listId: 'inbox', priority: 'frog',
      dueDate: '2026-10-01', status: 'done', progress: 100, createdAt: Date.parse(D(2026, 10, 1, 9, 0)),
    }),
    makeTask({
      id: 'p6', title: 'یادداشت طولانی', listId: 'inbox', kind: 'note', dropped: true,
      notes: 'x'.repeat(800),
    }),
  ];
  S.tasks = rows;
  return rows;
};

const listNameOf = (t) => (S.lists.find((l) => l.id === t.listId) || {}).name;
const titleOf = (rows, id) => rows.find((r) => r.id === id).title;
/** export exactly these tasks through the real CSV writer and read them back */
const exportOne = (...tasks) => {
  const keep = S.tasks;
  S.tasks = tasks;
  const csv = toTickCsv();
  S.tasks = keep;
  return parseTickCsv(csv).tasks;
};

console.log('1 · TickTick CSV — export → parse → import');
{
  const src = fixture();
  const csv = toTickCsv();
  ok('header row intact (24 columns)', csv.includes('Folder Name,List Name,Title,Kind,Tags,Content,Is check list'), csv.split('\n')[3]);
  const parsed = parseTickCsv(csv);
  ok('no parse error', !parsed.error, parsed.error);
  eq('row count', parsed.tasks.length, src.length);
  /* import into a fresh app: ids are remapped, so compare by title */
  freshState();
  const pv = previewImport(parsed.tasks, { includeCompleted: true });
  eq('preview: nothing skipped on a clean import', pv.skips, { empty: 0, done: 0, duplicate: 0 });
  eq('preview: willImport', pv.willImport, src.length);
  const res = applyImport(parsed.tasks, { includeCompleted: true });
  eq('applied count', res.n, src.length);
  for (const s of src) {
    const g = S.tasks.find((x) => x.title === titleOf(src, s.id));
    ok(`task survives: ${s.id}`, !!g);
    eq(`  title ${s.id}`, g.title, s.title);
    eq(`  list ${s.id}`, listNameOf(g), listNameOf(s));
    eq(`  tags ${s.id}`, g.tags, s.tags);
    eq(`  due day ${s.id}`, dayKey(g.dueDate), dayKey(s.dueDate));
    eq(`  due shape ${s.id}`, shape(g.dueDate), shape(s.dueDate));
    eq(`  status ${s.id}`, g.status, s.status);
    eq(`  recurrence ${s.id}`, g.recurrence, s.recurrence);
    eq(`  checklist ${s.id}`, g.subtasks, (s.subtasks || []).map((x) => ({ title: x.title, done: x.done })));
    eq(`  notes ${s.id}`, g.notes.trim(), s.notes.replace(/^[-*]\s*\[[ xX]\]\s*.+$/gm, '').trim());
    /* TickTick has 5 priority levels; our 'frog' ceiling is High by design */
    eq(`  priority ${s.id}`, g.priority, s.priority === 'frog' ? 'high' : s.priority);
  }
  const child = S.tasks.find((x) => x.title === 'جمع‌آوری نمونه‌ها');
  const parent = S.tasks.find((x) => x.title === 'پروژه بازطراحی سایت');
  eq('parent/child link rebuilt', child.parentId, parent.id);

  /* A known property of TickTick's own shape, asserted rather than hidden:
     Content holds the checklist rows AND the note, so a note that itself
     contains “- [ ] …” returns as an extra checklist row. The JSON and
     backup paths do not merge the two and are exact. */
  const [amb] = exportOne(makeTask({
    title: 'یادداشت با چک‌باکس', listId: 'inbox',
    subtasks: [{ title: 'واقعی', done: false }], notes: '- [ ] داخل متن',
  }));
  eq('checklist rows + note boxes → 2 rows via CSV (1 via JSON)', amb.subtasks.length, 2);
}

console.log('2 · TickTick JSON (Open-API shape) — export → parse → import');
{
  const src = fixture();
  const json = JSON.parse(toTickJson());
  eq('projects block', json.projects.length, 2);
  eq('task count', json.tasks.length, src.length);
  const parsed = parseTickJson(toTickJson());
  ok('no parse error', !parsed.error, parsed.error);
  freshState();
  applyImport(parsed.tasks, { includeCompleted: true });
  for (const s of src) {
    const g = S.tasks.find((x) => x.title === s.title);
    eq(`  title/count ${s.id}`, !!g, true);
    eq(`  due day ${s.id}`, dayKey(g.dueDate), dayKey(s.dueDate));
    eq(`  due shape ${s.id}`, shape(g.dueDate), shape(s.dueDate));
    eq(`  notes ${s.id}`, g.notes.trim(), s.notes.trim());
    eq(`  priority ${s.id}`, g.priority, s.priority === 'frog' ? 'high' : s.priority);
  }
}

console.log('3 · full backup JSON — export → parse → restore (lossless)');
{
  const src = fixture();
  const parsed = parseAny(toBackup(), 'tictic-backup.json');
  ok('recognised as our own backup', !!parsed.restore);
  const before = JSON.stringify(src);
  freshState();
  restoreBackup(parsed.restore);
  eq('every field of every task identical', JSON.stringify(S.tasks), before);
  eq('lists restored', S.lists.length, 2);
}

console.log('4 · duplicate safety — the same file twice never doubles');
{
  const src = fixture();
  const parsed = parseAny(toTickCsv(), 'tictic-ticktick.csv');
  freshState();
  applyImport(parsed.tasks, { includeCompleted: true });
  const afterFirst = S.tasks.length;
  const pv = previewImport(parsed.tasks, { includeCompleted: true });
  eq('preview reports every row as a duplicate', pv.skips.duplicate, src.length);
  const res = applyImport(parsed.tasks, { includeCompleted: true });
  eq('nothing added on the second import', res.n, 0);
  eq('state unchanged', S.tasks.length, afterFirst);
  const forced = applyImport(parsed.tasks, { includeCompleted: true, skipDuplicates: false });
  eq('“add anyway” does add', forced.n, src.length);
  eq('  → doubled, as asked', S.tasks.length, afterFirst * 2);
}

console.log('5 · shipped samples parse');
{
  const dir = path.join(root, '..', 'samples');
  if (!fs.existsSync(dir)) {
    ok('samples/ exists', false, 'run the generator first');
  } else {
    const files = fs.readdirSync(dir).filter((f) => /\.(csv|json|txt)$/.test(f));
    eq('sample files present', files.length >= 2, true);
    freshState();
    for (const f of files) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const res = parseAny(text, f);
      ok(`${f} parses`, !res.error && (res.tasks || res.restore), res.error || 'no payload');
      const n = res.restore ? res.restore.tasks.length : res.tasks.length;
      ok(`${f} yields rows`, n > 0, `rows=${n}`);
      console.log(`     ${f}: ${n} rows`);
    }
  }
}

console.log('6 · date conversion and the all-day rule');
{
  eq('calendar day → wall-clock midnight', tickDate('2026-10-13'), '2026-10-13T00:00:00' + tzOffset());
  const t = D(2026, 10, 13, 8, 0);
  eq('timed value keeps its local hour', new Date(parseTickDate(tickDate(t))).getHours(), 8);
  eq('empty stays empty', [tickDate(''), tickDate(null), parseTickDate('')], ['', '', null]);
  eq('garbage date is refused', parseTickDate('not-a-date'), null);

  /* the reader owns the all-day rule, not the raw date parser */
  const [day] = exportOne(makeTask({ title: 'همه‌روزه', listId: 'inbox', dueDate: '2026-10-13' }));
  eq('Is All Day=Y → plain calendar day, not an instant', day.dueDate, '2026-10-13');
  const [timed] = exportOne(makeTask({ title: 'زمان‌دار', listId: 'inbox', dueDate: t }));
  eq('timed row → instant at the same local hour', new Date(timed.dueDate).getHours(), 8);
  eq('  …and the same local day', dayKey(timed.dueDate), '2026-10-13');
}

console.log(`\n${checks - fails}/${checks} assertions passed${fails ? ` · ${fails} FAILED` : ' · all green'}`);
process.exit(fails ? 1 : 0);
function tzOffset() {
  const off = -new Date(2026, 9, 13).getTimezoneOffset();
  const p = (n) => String(n).padStart(2, '0');
  return `${off < 0 ? '-' : '+'}${p(Math.floor(Math.abs(off) / 60))}${p(Math.abs(off) % 60)}`;
}
