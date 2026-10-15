/* ============================================================
   TicTic ADHD — Search · Saved filters · ⌘K palette · shortcuts
   One overlay to find anything or run anything. Saved filters
   store a query + scope so a messy brain can re-enter the same
   frame of work in one tap.
   ============================================================ */
import { S, commit, persist, uid, byId } from './store.js';
import { tr, N, fmtDate, parseISO, dayKey } from './i18n.js';
import { h, sv, icons, announce } from './ui.js';
import { sheet, snackbar } from './components.js';
import { openDetail } from './detail.js';
import { openQuickAdd, closeQuickAdd } from './quickadd.js';
import { openDrawer } from './drawer.js';
import { openSettings } from './settings.js';
import { openBrainDump, openBreathe, openBlocker, openCheckin, openEnergySheet } from './relief.js';
import { openImportSheet, openExportSheet } from './ticktick.js';
import { artSearch } from './art.js';

/* ---------------- query matching (shared with the views) ---------------- */
export function matchQuery(t, q) {
  if (!q) return true;
  const needle = q.toLowerCase().replace(/^#/, '');
  if ((t.tags || []).some(x => x.toLowerCase().includes(needle))) return true;
  const hay = [t.title, t.notes, (t.subtasks || []).map(s => s.title).join(' ')].join(' ').toLowerCase();
  if (hay.includes(needle)) return true;
  /* token AND semantics: every word must appear somewhere */
  const words = needle.split(/\s+/).filter(Boolean);
  return words.length > 1 && words.every(w => hay.includes(w));
}

/* ---------------- saved filters ---------------- */
export function saveFilter(name, query, scope = 'all') {
  S.savedFilters = S.savedFilters || [];
  S.savedFilters.push({ id: uid(), name, query, scope, at: Date.now() });
  persist(); commit(() => true);
  snackbar(tr('filter_saved', { x: name }));
}
export function applyFilter(f) {
  S.ui.filterQuery = f.query || '';
  S.ui.filterScope = f.scope || 'all';
  S.ui.savedFilterName = f.name;
  S.ui.route = 'today';
  commit(() => true);
  announce(tr('filter_applied', { x: f.name }));
}
export function clearFilter() {
  S.ui.filterQuery = ''; S.ui.savedFilterName = null;
  commit(() => true);
}

const dueLabel = t => t.dueDate ? N(fmtDate(parseISO(dayKey(t.dueDate)), { withYear: false })) : '—';
const prioEmoji = p => ({ frog: '🐸', high: '🔴', med: '🟠', low: '🔵' }[p] || '');

function taskRow(t, { onPick } = {}) {
  return h('button', { class: 'sr-row', onclick: () => { onPick?.(t); } },
    h('span', { class: 'sr-title' }, (t.status === 'done' ? '✓ ' : '') + (prioEmoji(t.priority) ? prioEmoji(t.priority) + ' ' : '') + t.title),
    h('span', { class: 'sr-meta num' }, (S.lists || []).find(l => l.id === t.listId)?.name || '', ' · ', dueLabel(t)),
  );
}

/* ---------------- search overlay ---------------- */
export function openSearch(prefill = '') {
  const input = h('input', { type: 'search', value: prefill, placeholder: tr('search_ph'), 'aria-label': tr('search') });
  const results = h('div', { class: 'sr-list' });
  const savedRow = h('div', { class: 'chips-row', style: 'margin-bottom:8px' });

  const renderSaved = () => {
    savedRow.innerHTML = '';
    for (const f of S.savedFilters || []) {
      savedRow.append(h('button', { class: 'pick', onclick: () => { input.value = f.query; render(); } },
        '⭐ ' + f.name,
        h('span', { class: 'x', style: 'margin-inline-start:8px;opacity:.6', onclick: e => {
          e.stopPropagation();
          S.savedFilters = S.savedFilters.filter(x => x.id !== f.id); persist(); commit(() => true); renderSaved();
        } }, '✕'),
      ));
    }
  };

  const render = () => {
    const q = input.value.trim();
    results.innerHTML = '';
    const list = q
      ? S.tasks.filter(t => !t.noise && matchQuery(t, q)).slice(0, 60)
      : S.tasks.filter(t => t.pinned || t.key).slice(0, 12);
    if (!list.length) results.append(h('div', { class: 'state-card', style: 'box-shadow:none;background:transparent;padding:18px' },
      artSearch(), h('h3', {}, q ? tr('no_results') : tr('empty_list_title'))));
    for (const t of list) results.append(taskRow(t, { onPick: x => { document.querySelector('.ov-sheet')?.remove(); openDetail(x.id); } }));
    saveRow.style.display = q ? 'flex' : 'none';
  };
  const saveRow = h('div', { style: 'display:none;gap:8px;margin-top:8px' },
    h('button', { class: 'pick', style: 'flex:1;min-height:44px', onclick: () => {
      const name = prompt(tr('filter_name'), input.value.slice(0, 24));
      if (name) { saveFilter(name, input.value.trim()); renderSaved(); }
    } }, '⭐ ' + tr('filter_save')),
    h('button', { class: 'pick', style: 'flex:1;min-height:44px', onclick: () => {
      S.ui.filterQuery = input.value.trim(); S.ui.filterList = 'all'; S.ui.savedFilterName = input.value.slice(0, 18);
      document.querySelector('.ov-sheet')?.remove(); commit(() => true); announce(tr('filter_applied', { x: input.value }));
    } }, '🩶 ' + tr('filter_today')),
  );

  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = results.querySelector('.sr-row');
      if (first) { first.click(); }
    }
  });
  const body = h('div', {}, savedRow, input, h('div', { class: 'detail-label', style: 'margin-top:10px' }, tr('results')), results, saveRow);
  renderSaved();
  render();
  sheet(tr('search'), body);
  setTimeout(() => input.focus(), 50);
  return body;
}

/* ---------------- ⌘K command palette ---------------- */
export function openPalette() {
  const input = h('input', { type: 'search', placeholder: tr('palette_ph'), 'aria-label': tr('palette') });
  const list = h('div', { class: 'sr-list' });

  const cmds = [
    { id: 'new', label: '➕ ' + tr('add_task'), keys: 'n', run: () => openQuickAdd() },
    { id: 'search', label: '🔍 ' + tr('search'), keys: '/', run: () => openSearch() },
    { id: 'dump', label: '🧠 ' + tr('dump'), keys: 'd', run: () => openBrainDump() },
    { id: 'breathe', label: '🌬 ' + tr('breathe'), keys: 'b', run: () => openBreathe() },
    { id: 'blocker', label: '🚧 ' + tr('blocker'), run: () => openBlocker() },
    { id: 'energy', label: '🔋 ' + tr('energy'), run: () => openEnergySheet() },
    { id: 'checkin', label: '🩺 ' + tr('checkin_title'), run: () => openCheckin() },
    { id: 'today', label: '📅 ' + tr('nav_today'), run: () => go('today') },
    { id: 'plan', label: '🗓 ' + tr('nav_plan'), run: () => go('plan') },
    { id: 'projects', label: '📦 ' + tr('nav_projects'), run: () => go('projects') },
    { id: 'flows', label: '🔁 ' + tr('nav_flows'), run: () => go('flows') },
    { id: 'report', label: '📊 ' + tr('nav_report'), run: () => go('report') },
    { id: 'drawer', label: '🧭 ' + tr('horizons'), keys: 'h', run: () => openDrawer() },
    { id: 'habits', label: '🔁 ' + tr('habits'), run: () => moduleSheet(tr('habits'), 'habits') },
    { id: 'countdown', label: '⏳ ' + tr('countdown'), run: () => moduleSheet(tr('countdown'), 'countdown') },
    { id: 'matrix', label: '🧩 ' + tr('eisenhower'), run: () => { S.ui.route = 'plan'; S.ui.planMode = 'matrix'; commit(() => true); } },
    { id: 'import', label: '📥 ' + tr('import_title'), run: () => openImportSheet() },
    { id: 'export', label: '📤 ' + tr('export_title'), run: () => openExportSheet() },
    { id: 'settings', label: '⚙️ ' + tr('settings'), keys: ',', run: () => openSettings() },
  ];
  for (const f of S.savedFilters || []) {
    cmds.push({ id: 'f_' + f.id, label: '⭐ ' + f.name, run: () => applyFilter(f) });
  }

  let sel = 0, rows = [];
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const hits = cmds.filter(c => !q || c.label.toLowerCase().includes(q) || c.id.includes(q));
    const taskHits = q ? S.tasks.filter(t => !t.noise && matchQuery(t, q)).slice(0, 5) : [];
    list.innerHTML = '';
    rows = [];
    for (const c of hits) {
      const row = h('button', { class: 'sr-row pal-row', onclick: () => { close(); c.run(); } },
        h('span', { class: 'sr-title' }, c.label),
        c.keys ? h('kbd', { class: 'kbd' }, c.keys) : null);
      list.append(row); rows.push({ el: row, run: c.run });
    }
    if (taskHits.length) {
      list.append(h('div', { class: 'detail-label', style: 'margin:8px 0 4px' }, tr('results')));
      for (const t of taskHits) {
        const row = taskRow(t);
        row.classList.add('pal-row');
        row.onclick = () => { close(); openDetail(t.id); };
        list.append(row); rows.push({ el: row, run: () => openDetail(t.id) });
      }
    }
    sel = 0; highlight();
  };
  const highlight = () => rows.forEach((r, i) => r.el.classList.toggle('sel', i === sel));
  const close = () => document.querySelector('.ov-sheet')?.remove();
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, rows.length - 1); highlight(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); highlight(); e.preventDefault(); }
    else if (e.key === 'Enter') { const r = rows[sel]; if (r) { close(); r.run(); } }
  });
  const body = h('div', {}, input, h('div', { class: 'detail-label', style: 'margin-top:10px' }, tr('commands')), list);
  closeAllSheets();
  sheet(tr('palette'), body);
  render();
  setTimeout(() => input.focus(), 50);
}
function closeAllSheets() { document.querySelectorAll('.ov-sheet').forEach(x => x.remove()); }
function go(route) { S.ui.route = route; commit(() => true); }
function moduleSheet(title, which) {
  import(`./${which}.js`).then(m => {
    if (which === 'habits') sheet(title, m.renderHabits());
    else sheet(title, m.renderCountdowns());
  });
}

/* ---------------- global shortcuts ---------------- */
const typing = () => {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};
export function installShortcuts() {
  document.addEventListener('keydown', e => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape') { closeQuickAdd(); document.querySelectorAll('.ov-sheet').forEach(x => x.remove()); return; }
    if (typing()) return;
    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (e.key === 'n') { e.preventDefault(); openQuickAdd(); }
    else if (e.key === 'd') { e.preventDefault(); openBrainDump(); }
    else if (e.key === 'b') { e.preventDefault(); openBreathe(); }
    else if (e.key === 'h') { e.preventDefault(); openDrawer(); }
    else if (e.key === 's' && !mod) { e.preventDefault(); openSettings(); }
    else if (e.key === '?') { e.preventDefault(); openShortcutSheet(); }
  });
}
export function openShortcutSheet() {
  const rows = [
    ['⌘/Ctrl + K', tr('shortcut_palette')],
    ['/', tr('shortcut_search')],
    ['n', tr('shortcut_new')],
    ['d', tr('shortcut_dump')],
    ['b', tr('breathe')],
    ['h', tr('horizons')],
    ['s', tr('settings')],
    ['Esc', tr('close')],
  ];
  const body = h('div', {}, ...rows.map(([k, v]) => h('div', { class: 'set-row', style: 'display:flex;gap:10px;align-items:center' },
    h('kbd', { class: 'kbd' }, k), h('span', {}, v))));
  sheet(tr('shortcuts'), body);
}
