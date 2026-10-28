/* ============================================================
   TicTic ADHD — TickTick bridge (§8)
   Easy in / easy out:
     • Import: TickTick CSV backup, TickTick JSON (Open-API shape),
       our own full backup JSON, and plain pasted text.
     • Export: TickTick-importable CSV, TickTick-API JSON, full
       backup JSON.
   Round-trip safety: exporting then importing yields the same
   tasks (ids preserved via taskId/parentId columns).

   TickTick formats (research, Oct 2026):
   CSV header: Folder Name,List Name,Title,Kind,Tags,Content,
     Is Check list,Start Date,Due Date,Reminder,Repeat,Priority,
     Status,Created Time,Completed Time,Order,Timezone,Is All Day,
     Is Floating,Column Name,Column Order,View Mode,taskId,parentId
   CSV preamble: "Date: yyyy-MM-dd+0000" / "Version: 7.1" /
     "Status:\\n0 Normal\\n1 Completed\\n2 Archived"
   CSV priorities: 0 none, 1 low, 3 med, 5 high
   Dates: yyyy-MM-dd'T'HH:mm:ssZ → 2019-11-13T03:00:00+0000
   JSON task: {id,projectId,title,content,desc,isAllDay,startDate,
     dueDate,timeZone,reminders,repeatFlag,priority,status,
     completedTime,sortOrder,items[{id,status,title}]}
   JSON status: 0 normal · 2 completed (item status: 0/1)
   ============================================================ */
import { S, commit, persist, uid, makeTask, serialize } from './store.js';
import { tr, N, dayKey } from './i18n.js';
import { h, announce } from './ui.js';
import { sheet, snackbar } from './components.js';
import { parseQuick } from './parse.js';

/* ---------------- helpers ---------------- */
const PRIO_OUT = { none: 0, low: 1, med: 3, high: 5, frog: 5 };
const PRIO_IN = { 0: 'none', 1: 'low', 2: 'med', 3: 'med', 4: 'high', 5: 'high' };
const REPEAT_OUT = { daily: 'RRULE:FREQ=DAILY;INTERVAL=1', weekly: 'RRULE:FREQ=WEEKLY;INTERVAL=1', monthly: 'RRULE:FREQ=MONTHLY;INTERVAL=1', yearly: 'RRULE:FREQ=YEARLY;INTERVAL=1' };
const REPEAT_IN = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };

/** 2026-10-13T08:00:00.000Z → 2026-10-13T11:30:00+0330 (local wall clock).
    A plain 'YYYY-MM-DD' calendar day stays midnight of that same day. */
export function tickDate(v) {
  if (!v) return '';
  const s = String(v);
  const off = -new Date().getTimezoneOffset();
  const p = n => String(n).padStart(2, '0');
  const sign = off < 0 ? '-' : '+';
  const oh = p(Math.floor(Math.abs(off) / 60)), om = p(Math.abs(off) % 60);
  const zone = `${sign}${oh}${om}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00${zone}`;
  const d = new Date(v);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${zone}`;
}
export function parseTickDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!m) { const d = new Date(s); return isNaN(d) ? null : d.toISOString(); }
  const [, y, mo, dd, hh = '00', mi = '00', ss = '00', tz] = m;
  if (!tz) { const d = new Date(+y, +mo - 1, +dd, +hh, +mi, +ss); return d.toISOString(); }
  const z = tz === 'Z' ? 'Z' : tz.replace(/([+-]\d{2})(\d{2})/, '$1:$2');
  const d = new Date(`${y}-${mo}-${dd}T${hh}:${mi}:${ss}${z}`);
  return isNaN(d) ? null : d.toISOString();
}
const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export function downloadFile(filename, text, mime = 'text/plain') {
  const blob = new Blob(['\ufeff' + text], { type: mime + ';charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const download = downloadFile;   /* internal alias */
/** all-day = due exactly at local midnight (stored ISO is UTC, so a literal
    'T00:00:00Z' test would miss every +0330 task) */
function isAllDay(v) {
  if (!v) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return true;   /* calendar day */
  const d = new Date(v);
  if (isNaN(d)) return false;
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

const listName = id => (S.lists || []).find(l => l.id === id)?.name || 'Inbox';
const projectName = t => t.projectId ? (S.projects || []).find(p => p.id === t.projectId)?.name || '' : '';

/* ---------------- export: TickTick CSV ---------------- */
export function toTickCsv() {
  const head = 'Folder Name,List Name,Title,Kind,Tags,Content,Is check list,Start Date,Due Date,Reminder,Repeat,Priority,Status,Created Time,Completed Time,Order,Timezone,Is All Day,Is Floating,Column Name,Column Order,View Mode,taskId,parentId';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const rows = S.tasks.map(t => {
    const hasItems = (t.subtasks || []).length > 0 || (t.checkItems || []).length > 0;
    const kind = t.status === 'note' ? 'NOTE' : hasItems ? 'CHECKLIST' : 'TEXT';
    const content = [
      (t.subtasks || []).map(s => `- [${s.done ? 'x' : ' '}] ${s.title}`).join('\n'),
      t.notes || '',
      t.decision && (t.decision.pros || t.decision.cons) ? `decision: +${t.decision.pros} / -${t.decision.cons}` : '',
    ].filter(Boolean).join('\n');
    const reminders = (t.reminder || []).map(() => 'TRIGGER:PT0S').join(',');
    return [
      projectName(t), listName(t.listId), t.title, kind,
      (t.tags || []).join(','),
      content, hasItems ? 'Y' : 'N',
      tickDate(t.plannedStart), tickDate(t.dueDate), reminders,
      REPEAT_OUT[t.recurrence] || '',
      PRIO_OUT[t.priority] ?? 0,
      t.status === 'done' ? 1 : t.dropped ? 2 : 0,
      tickDate(new Date(t.createdAt || Date.now()).toISOString()),
      t.status === 'done' ? tickDate(new Date(t.modifiedAt || Date.now()).toISOString()) : '',
      String(t.order || 0), tz, isAllDay(t.dueDate) ? 'Y' : 'N', 'N',
      '', '', 'list', t.id, t.parentId || '',
    ].map(csvCell).join(',');
  });
  return [
    `"Date: ${dayKey(new Date())}+0000"`,
    '"Version: 7.1"',
    '"Status:',
    '0 Normal',
    '1 Completed',
    '2 Archived"',
    head, ...rows,
  ].join('\n');
}

/* ---------------- export: TickTick JSON (Open-API shape) ---------------- */
export function toTickJson() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const projects = [{ id: 'inbox', name: 'Inbox' }, ...(S.lists || []).filter(l => l.id !== 'inbox').map(l => ({ id: l.id, name: l.name }))];
  const tasks = S.tasks.map(t => ({
    id: t.id,
    projectId: t.listId || 'inbox',
    title: t.title,
    content: t.notes || '',
    desc: t.status === 'note' ? 'note' : '',
    isAllDay: isAllDay(t.dueDate),
    startDate: tickDate(t.plannedStart) || null,
    dueDate: tickDate(t.dueDate) || null,
    timeZone: tz,
    reminders: (t.reminder || []).map(() => 'TRIGGER:PT0S'),
    repeatFlag: REPEAT_OUT[t.recurrence] || null,
    priority: PRIO_OUT[t.priority] ?? 0,
    status: t.status === 'done' ? 2 : 0,
    completedTime: t.status === 'done' ? tickDate(new Date(t.modifiedAt || Date.now()).toISOString()) : null,
    sortOrder: t.order || 0,
    tags: t.tags || [],
    items: (t.subtasks || []).map((s, i) => ({ id: uid(), title: s.title, status: s.done ? 1 : 0, sortOrder: i })),
    parentId: t.parentId || null,
  }));
  return JSON.stringify({ projects, tasks }, null, 2);
}

/* ---------------- export: full backup ---------------- */
export function toBackup() {
  return JSON.stringify({ app: 'tictic', v: 1, exportedAt: new Date().toISOString(), state: serialize() }, null, 2);
}

/* ---------------- import parsing ---------------- */
/** RFC-4180 CSV → records of cells. Quoted cells may contain commas AND
    newlines (TickTick notes often do), so this is a single pass over the
    whole text rather than per line. */
export function parseCsv(text) {
  const records = []; let cells = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { cells.push(cur.trim()); cur = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { cells.push(cur.trim()); records.push(cells); cells = []; cur = ''; }
    else cur += c;
  }
  if (cur.trim() || cells.length) { cells.push(cur.trim()); records.push(cells); }
  return records.filter(r => r.some(c => c !== ''));
}

/** TickTick CSV (or a plain CSV with similar headers) → array of patches */
export function parseTickCsv(text) {
  const lines = parseCsv(String(text).replace(/^\ufeff/, ''));
  /* skip the "Date:/Version:/Status:" preamble — the header row is the
     first record whose cells include both a title column and 4+ columns */
  let hi = -1;
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const cells = lines[i].map(s => s.trim().replace(/^"|"$/g, '').toLowerCase());
    if (cells.length >= 5 && cells.includes('title') && cells.some(c => c.startsWith('list'))) { hi = i; break; }
  }
  if (hi < 0) return { tasks: [], error: 'no_header' };
  /* the preamble's status legend (“Status:\n0 Normal\n-1 Abandoned\n2 Completed”)
     is the file's own decoding table: v7.1 wrote "1 Completed" while v7.2
     writes "2 Completed" + "-1 Abandoned". Read the legend instead of
     hard-coding either — and let it drive the completed/abandoned skip. */
  const legend = {};
  for (let i = 0; i < hi; i++) {
    const first = (lines[i][0] || '').replace(/^"|"$/g, '');
    if (!/^\s*status\s*:/i.test(first)) continue;
    for (const ln of first.split(/\r?\n/)) {
      const m = ln.match(/^\s*(-?\d+)\s+\S/);
      if (m) legend[m[1]] = ln.slice(ln.indexOf(m[1])).replace(/^-?\d+\s*/, '').trim().toLowerCase();
    }
    break;
  }
  const statDec = (raw) => {
    const lbl = legend[String(raw).trim()];
    if (lbl !== undefined) {
      if (/complet/.test(lbl)) return { done: true, status: 'done' };
      if (/abandon/.test(lbl)) return { abandoned: true, dropped: true, status: 'dropped' };
      if (/archiv/.test(lbl)) return { dropped: true, status: 'dropped' };
      return {};                                  /* 0 Normal, or an unknown word: normal */
    }
    if (raw === '1') return { done: true, status: 'done' };       /* no legend: v7.1 layout */
    if (raw === '2') return { dropped: true, status: 'dropped' };
    return {};
  };
  const header = lines[hi].map(s => s.trim().replace(/^"|"$/g, '').toLowerCase());
  const col = (...names) => {
    for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
    return -1;
  };
  const ix = {
    folder: col('folder name', 'folder'), list: col('list name', 'list'), title: col('title'),
    kind: col('kind'), tags: col('tags'), content: col('content'), check: col('is check list'),
    allDay: col('is all day'),
    start: col('start date'), due: col('due date'), remind: col('reminder'), repeat: col('repeat'),
    prio: col('priority'), status: col('status'), created: col('created time'), completed: col('completed time'),
    order: col('order', 'sort order'), id: col('taskid'), parent: col('parentid'),
  };
  const rows = [];
  for (let i = hi + 1; i < lines.length; i++) {
    const c = lines[i];
    if (!c.length || (ix.title >= 0 && !(c[ix.title] || '').trim())) continue;
    const get = k => (ix[k] >= 0 ? (c[ix[k]] || '').trim() : '');
    /* An all-day row carries `Is All Day = Y` and a wall-clock midnight. It is
       stored as a plain calendar day (not the UTC instant of that midnight),
       so the date the user sees does not move when the file is re-imported or
       the machine changes time zone. */
    const allDay = ix.allDay >= 0
      ? /^y(es)?$/i.test(get('allDay'))
      : (d => !!d && new Date(d).getHours() + new Date(d).getMinutes() === 0)(parseTickDate(get('due')));
    const day = v => { const iso = parseTickDate(v); return iso && allDay ? dayKey(iso) : iso; };
    const due = day(get('due'));
    /* TickTick stores checklist rows inside Content as markdown boxes — but
       only for rows it labels as a check list (`Is check list = Y`). A plain
       task whose note happens to contain “- [ ] …” keeps its note. */
    const items = [];
    const checkList = ix.check < 0 || /^y(es)?$/i.test(get('check'));
    if (checkList) for (const m of (get('content') || '').matchAll(/^[-*]\s*\[( |x|X)\]\s*(.+)$/gm)) items.push({ title: m[2].trim(), done: m[1].toLowerCase() === 'x' });
    const st = statDec(get('status'));
    rows.push({
      id: get('id') || uid(),
      parentId: get('parent') || null,
      title: get('title'),
      notes: (checkList ? (get('content') || '').replace(/^[-*]\s*\[[ xX]\]\s*.+$/gm, '') : get('content') || '').trim(),
      status: st.status || 'todo',
      dropped: !!st.dropped,
      done: !!st.done,
      abandoned: !!st.abandoned,
      statusRaw: get('status'),
      priority: PRIO_IN[get('prio')] || 'none',
      dueDate: due, plannedStart: day(get('start')), createdAt: parseTickDate(get('created')) || new Date().toISOString(),
      recurrence: REPEAT_IN[(get('repeat').match(/FREQ=(\w+)/i) || [])[1]?.toUpperCase()] || null,
      tags: get('tags') ? get('tags').split(',').map(s => s.trim()).filter(Boolean) : [],
      listName: get('list'), folderName: get('folder'),
      kind: get('kind') === 'NOTE' ? 'note' : 'action',
      subtasks: items,
    });
  }
  return { tasks: rows };
}

/** TickTick Open-API JSON, an array of tasks, or our own state backup */
export function parseTickJson(text) {
  let j; try { j = JSON.parse(text); } catch (e) { return { error: 'bad_json' }; }
  /* full backup of this app → full restore payload */
  if (j && j.app === 'tictic' && j.state) return { restore: j.state };
  const raw = Array.isArray(j) ? j : (j.tasks || j.data || []);
  const projects = Array.isArray(j) ? [] : (j.projects || []);
  const byProj = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const rows = raw.map(t => {
    /* same rule as the CSV reader: an all-day row becomes a calendar day */
    const allDay = t.isAllDay === true || t.isAllDay === 'true' || t.isAllDay === 'Y';
    const day = v => { const iso = parseTickDate(v); return iso && allDay ? dayKey(iso) : iso; };
    return {
    id: t.id || uid(),
    parentId: t.parentId || null,
    title: t.title || t.name || '',
    notes: t.content || t.notes || '',
    status: (t.status === 2 || t.status === 'done') ? 'done' : t.status === 'archived' ? 'dropped' : 'todo',
    dropped: t.status === 'archived',
    done: t.status === 2 || t.status === 'done',
    priority: PRIO_IN[t.priority] || 'none',
    dueDate: day(t.dueDate), plannedStart: day(t.startDate),
    createdAt: parseTickDate(t.createdTime) || new Date().toISOString(),
    recurrence: REPEAT_IN[(String(t.repeatFlag || t.repeat || '').match(/FREQ=(\w+)/i) || [])[1]?.toUpperCase()] || null,
    tags: t.tags || [],
    listName: byProj[t.projectId] || t.list || '',
    kind: t.kind === 'NOTE' || t.desc === 'note' ? 'note' : 'action',
    subtasks: (t.items || []).map(s => ({ title: s.title, done: s.status === 1 })),
  }; });
  return { tasks: rows };
}

/** Plain text: "one task per line", `- [ ]`, `1.`, `*`, indentation = subtasks */
export function parsePlainText(text) {
  const rows = [];
  const stack = [];   /* open parents by indent */
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indent = (line.match(/^\s*/) || [''])[0].replace(/\t/g, '  ').length;
    const body = line.trim()
      .replace(/^[-*+•]\s*(\[[ xX]\]\s*)?/, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^#+\s*/, '');
    if (!body) continue;
    const parsed = parseQuick(body);
    const row = {
      id: uid(), title: parsed.title, notes: '',
      tags: parsed.tags || [], priority: parsed.priority || 'none',
      dueDate: parsed.when || null, plannedStart: null,
      recurrence: parsed.recurrence || null, listName: '',
      status: 'todo', subtasks: [],
    };
    /* indentation → parent: first line has no parent, deeper lines attach to
       the nearest shallower task */
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    row.parentId = stack.length ? stack[stack.length - 1].id : null;
    rows.push(row);
    stack.push({ indent, id: row.id });
  }
  return { tasks: rows };
}

/** Unified: sniff the payload and parse accordingly */
export function parseAny(text, filename = '') {
  const t = String(text).replace(/^\ufeff/, '').trim();
  const looksCsv = /\.csv$/i.test(filename) || /(^|\n)"?\s*(Title|Title\s*,)/i.test(t.slice(0, 400)) || /(^|\n)\s*(Folder Name|List Name)\s*,/i.test(t.slice(0, 400));
  if (t.startsWith('{') || t.startsWith('[')) {
    const j = parseTickJson(t);
    if (!j.error) return j;
  }
  if (looksCsv) {
    const c = parseTickCsv(t);
    if (!c.error) return c;
  }
  return parsePlainText(t);
}

/* ---------------- import: preview + apply ---------------- */
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const dupeKey = r => norm(r.title) + '|' + (dayKey(r.dueDate) || '');

/** everything the user should see BEFORE anything is written to state */
export function previewImport(rows, { includeCompleted = true } = {}) {
  const existing = new Set((S.tasks || []).map(t => norm(t.title) + '|' + (dayKey(t.dueDate) || '')));
  const haveLists = new Set((S.lists || []).map(l => norm(l.name)));
  const newLists = new Map();          /* display name -> count */
  const skips = { empty: 0, done: 0, abandoned: 0, duplicate: 0 };
  const dupes = [];
  for (const r of rows) {
    if (!r.title || !String(r.title).trim()) { skips.empty++; continue; }
    if (r.abandoned) { skips.abandoned++; continue; }   /* abandoned history is never current work */
    if (!includeCompleted && (r.done || r.status === 'done')) { skips.done++; continue; }
    if (existing.has(dupeKey(r))) { skips.duplicate++; dupes.push(r.title); }
    const name = (r.listName || '').trim();
    if (name && !haveLists.has(norm(name))) newLists.set(name, (newLists.get(name) || 0) + 1);
  }
  const willImport = rows.length - skips.empty - skips.done - skips.abandoned;
  return { total: rows.length, willImport, skips, dupes, newLists: [...newLists.entries()] };
}

/** duplicate rows are never overwritten silently: by default they are skipped */
export function applyImport(rows, { includeCompleted = true, listId = null, skipDuplicates = true } = {}) {
  if (!S.lists) S.lists = [{ id: 'inbox', name: 'اینباکس', system: true }];
  const idMap = new Map();          /* incoming id → new id */
  const listCache = new Map((S.lists || []).map(l => [l.name, l.id]));
  const ensureList = name => {
    if (!name) return listId || 'inbox';
    if (listCache.has(name)) return listCache.get(name);
    const id = 'l_' + uid();
    S.lists.push({ id, name });
    listCache.set(name, id);
    return id;
  };
  const existing = skipDuplicates
    ? new Set((S.tasks || []).map(t => norm(t.title) + '|' + (dayKey(t.dueDate) || '')))
    : null;
  let n = 0, skipped = 0, abandoned = 0, duplicates = 0;
  /* parents first, and keep looping for deeper chains (a child may itself
     be a parent of something imported later) */
  const pending = [...rows.filter(r => !r.parentId), ...rows.filter(r => r.parentId)];
  const inOrder = [];
  let progress = true;
  while (pending.length && progress) {
    progress = false;
    for (let i = 0; i < pending.length; i++) {
      const r = pending[i];
      if (!r.parentId || idMap.has(r.parentId)) { inOrder.push(r); pending.splice(i, 1); i--; progress = true; }
    }
  }
  for (const r of [...inOrder, ...pending]) {
    if (!r.title || !String(r.title).trim()) continue;
    if (r.abandoned) { abandoned++; continue; }   /* abandoned history is never current work */
    if (!includeCompleted && (r.done || r.status === 'done')) { skipped++; continue; }
    if (existing?.has(dupeKey(r))) { duplicates++; continue; }
    const task = makeTask({
      id: idMap.get(r.id) || uid(),
      title: String(r.title).trim(),
      notes: r.notes || '',
      listId: ensureList(r.listName),
      tags: r.tags || [],
      priority: r.priority || 'none',
      dueDate: r.dueDate || null,
      plannedStart: r.plannedStart || null,
      recurrence: r.recurrence || null,
      kind: r.kind === 'note' ? 'note' : 'action',
      status: r.dropped ? 'todo' : r.done ? 'done' : 'todo',
      dropped: !!r.dropped,
      progress: r.done ? 100 : 0,
      createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
      order: Date.now() + n,
      subtasks: (r.subtasks || []).map(s => ({ title: s.title, done: !!s.done })),
    });
    idMap.set(r.id, task.id);
    task.parentId = r.parentId ? (idMap.get(r.parentId) || null) : null;
    S.tasks.push(task);
    n++;
  }
  persist(); commit(() => true);
  return { n, skipped, abandoned, duplicates };
}

export function restoreBackup(state) {
  if (!state || typeof state !== 'object') return false;
  for (const k of Object.keys(state)) S[k] = state[k];
  persist(); commit(() => true);
  return true;
}

/* ---------------- UI: export sheet ---------------- */
export function openExportSheet() {
  const today = dayKey(new Date());
  const body = h('div', { style: 'display:grid;gap:10px' },
    h('p', { style: 'margin:0;color:var(--text-muted);font-size:13px' }, tr('export_hint')),
    h('button', { class: 'pick on', style: 'min-height:52px', onclick: () => { download(`tictic-ticktick-${today}.csv`, toTickCsv(), 'text/csv'); announce(tr('export_csv')); } },
      '📄 ' + tr('export_csv')),
    h('button', { class: 'pick on', style: 'min-height:52px', onclick: () => { download(`tictic-ticktick-${today}.json`, toTickJson(), 'application/json'); announce(tr('export_json')); } },
      '🧩 ' + tr('export_json_api')),
    h('button', { class: 'pick', style: 'min-height:52px', onclick: () => { download(`tictic-backup-${today}.json`, toBackup(), 'application/json'); announce(tr('backup_json')); } },
      '🗄 ' + tr('backup_json')),
    h('p', { style: 'margin:0;color:var(--text-muted);font-size:12px' }, tr('csv_howto')),
  );
  sheet(tr('export_title') || tr('import_export'), body);
}

/* ---------------- UI: import sheet ---------------- */
export function openImportSheet() {
  let parsed = null;          /* { tasks } | { restore } | { error } */
  let skipDuplicates = true;  /* the safe default: never overwrite quietly */

  const status = h('div', { class: 'num metric-sub' }, tr('import_none'));
  const includeChk = h('input', { type: 'checkbox', checked: false, id: 'imp-done' });
  const fileInput = h('input', { type: 'file', accept: '.csv,.json,.txt,text/csv,application/json,text/plain', style: 'display:none' });
  const area = h('textarea', { rows: 5, placeholder: tr('import_paste'), 'aria-label': tr('import_paste') });
  const panel = h('div', { class: 'stack', hidden: true, style: 'padding:12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2)' });
  const strategyRow = h('div', { class: 'chips-row' });
  const confirmBtn = h('button', { class: 'pick pick--solid', style: 'min-height:50px;width:100%', disabled: true }, '✅ ' + tr('import_confirm'));

  const setStrategy = v => {
    skipDuplicates = v === 'skip';
    [...strategyRow.querySelectorAll('.pick')].forEach(b => b.classList.toggle('on', b.dataset.v === v));
  };

  /* the preview: exactly what will happen, before anything is written.
     `quiet` is for the auto-preview while typing — a half-typed paste is not
     an error worth shouting about, so it leaves the hint alone. */
  const show = (res, { quiet = false } = {}) => {
    parsed = res;
    panel.textContent = '';
    panel.hidden = true;
    confirmBtn.disabled = true;
    if (!res || res.error) {
      /* empty box: back to the neutral hint. A failed explicit read: say so.
         A failed auto-parse while typing stays silent but still clears the
         preview, so the panel never describes text the box no longer holds. */
      if (!res) status.textContent = tr('import_none');
      else if (!quiet) status.textContent = tr('import_error');
      return;
    }
    if (res.restore) {
      status.textContent = tr('backup_found');
      panel.hidden = false;
      panel.append(h('div', { class: 'detail-label' }, tr('import_preview_title')), h('p', { style: 'margin:0' }, tr('backup_found')));
      confirmBtn.disabled = false;
      return;
    }

    const pv = previewImport(res.tasks, { includeCompleted: includeChk.checked });
    status.textContent = tr('import_preview') + ': ' + N(res.tasks.length);
    panel.hidden = false;
    panel.append(
      h('div', { class: 'detail-label' }, tr('import_preview_title')),
      h('p', { class: 'num', style: 'margin:0;font-weight:700' }, tr('import_counts', { tasks: N(pv.willImport), lists: N(Math.max(1, pv.newLists.length)) })),
    );
    const skipped = pv.skips.empty + pv.skips.done + pv.skips.duplicate;
    if (skipped) {
      panel.append(h('p', { class: 'num metric-sub', style: 'margin:0' }, tr('import_skipped', { n: N(skipped) }) + ' — ' + [
        pv.skips.empty ? N(pv.skips.empty) + ' · ' + tr('import_skip_empty') : '',
        pv.skips.done ? N(pv.skips.done) + ' · ' + tr('import_skip_done') : '',
        pv.skips.abandoned ? N(pv.skips.abandoned) + ' · ' + tr('import_skip_abandoned') : '',
      ].filter(Boolean).join(' / ')));
    }
    if (pv.newLists.length) {
      const names = pv.newLists.slice(0, 4).map(([n]) => n).join('، ') + (pv.newLists.length > 4 ? ' …' : '');
      panel.append(h('p', { class: 'metric-sub', style: 'margin:0' }, tr('import_more_lists', { names })));
    }
    if (pv.skips.duplicate) {
      strategyRow.textContent = '';
      for (const [v, label] of [['skip', tr('import_dupe_skip')], ['add', tr('import_dupe_add')]]) {
        strategyRow.append(h('button', { class: 'pick' + (skipDuplicates === (v === 'skip') ? ' on' : ''), dataset: { v }, onclick: () => setStrategy(v) }, label));
      }
      panel.append(h('div', {}, h('div', { class: 'detail-label' }, tr('import_dupes', { n: N(pv.skips.duplicate) }) + ' · ' + tr('import_dupe_mode')), strategyRow));
    }
    confirmBtn.disabled = pv.willImport === 0 && !pv.skips.duplicate;
  };

  const body = h('div', { style: 'display:grid;gap:10px' },
    h('p', { class: 'metric-sub', style: 'margin:0' }, tr('import_hint')),
    h('button', { class: 'pick on', style: 'min-height:50px', onclick: () => fileInput.click() }, '📥 ' + tr('import_pick')),
    fileInput,
    h('p', { class: 'metric-sub', style: 'margin:0;text-align:center' }, tr('or_drop')),
    h('div', { class: 'detail-label' }, tr('or_paste')),
    area,
    h('button', { class: 'pick', onclick: () => show(parseAny(area.value)) }, tr('parse_text')),
    h('label', { class: 'row', style: 'font-size:13px' }, includeChk, tr('include_completed')),
    status,
    panel,
    confirmBtn,
    h('button', { class: 'pick', style: 'min-height:44px;width:100%', onclick: () => document.querySelector('.ov-sheet')?.remove() }, tr('cancel')),
  );

  confirmBtn.addEventListener('click', () => {
    if (!parsed) return;
    if (parsed.restore) {
      restoreBackup(parsed.restore);
      snackbar(tr('backup_restored'));
    } else {
      const r = applyImport(parsed.tasks, { includeCompleted: includeChk.checked, skipDuplicates });
      snackbar(tr('import_done', { n: N(r.n) }) + (r.duplicates ? ' · ' + tr('import_skip_dupe_n', { n: N(r.duplicates) }) : '') + (r.abandoned ? ' · ' + tr('import_skip_abandoned_n', { n: N(r.abandoned) }) : ''));
    }
    document.querySelector('.ov-sheet')?.remove();
    document.dispatchEvent(new Event('rerender'));
  });

  includeChk.addEventListener('change', () => { if (parsed && !parsed.restore) show(parsed); });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0]; if (!f) return;
    show(parseAny(await f.text(), f.name));
  });

  /* Pasting is the common case (TickTick's own export is a file on a computer
     but text on a phone), so read it as it arrives instead of asking for a
     second tap on “Read”. Short text is left alone — that is typing, not an
     export, and a mid-word error message would be noise. */
  let typeTimer = null;
  area.addEventListener('input', () => {
    clearTimeout(typeTimer);
    const v = area.value;
    if (v.trim().length < 40) {
      show(null, { quiet: true });      /* no export in the box: drop the stale preview */
      return;
    }
    typeTimer = setTimeout(() => show(parseAny(v), { quiet: true }), 350);
  });

  /* Dropping a file straight onto the sheet: on a desktop this replaces
     “open the picker → find the file”, and Android browsers allow a drop from
     Files too. Oversized files are refused rather than parsed into a freeze. */
  const sh = sheet(tr('import_title'), body);
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  sh.el.addEventListener('dragover', e => { stop(e); sh.el.classList.add('ov-sheet--drop'); });
  sh.el.addEventListener('dragleave', e => { if (e.target === sh.el) sh.el.classList.remove('ov-sheet--drop'); });
  sh.el.addEventListener('drop', async e => {
    stop(e);
    sh.el.classList.remove('ov-sheet--drop');
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { status.textContent = tr('import_error'); return; }
    show(parseAny(await f.text(), f.name));
  });
  return body;
}
