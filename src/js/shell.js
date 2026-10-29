/* ============================================================
   TicTic ADHD — App shell (§3)
   Sidebar / bottom nav / FABs / topbar + routing between views.
   Phase 1: all 5 routes present; views render gradually, and only
   the Today view has a real skeleton right now.
   ============================================================ */
import { S, commit, subscribe } from './store.js';
import { tr, N, fmtDate, setLang, dayKey } from './i18n.js';
import { inBucket, todayKey } from './horizons.js';
import { h, clear, sv, icons, levelProgress, announce } from './ui.js';
import { renderToday, rerenderToday as rerender } from './views/daily.js';
import { openQuickAdd } from './quickadd.js';
import { openDrawer } from './drawer.js';
import { renderPlan } from './plan.js';
import { renderProjects } from './projects.js';
import { renderFlows } from './flows.js';
import { renderReport } from './report.js';
import { openSettings } from './settings.js';
import { openSearch, openPalette, clearFilter, applyFilter } from './search.js';
import { openBrainDump, openBreathe, openEnergySheet, ENERGY_MODES } from './relief.js';
import { sheet } from './components.js';
import { SORT_KEYS } from './rows.js';

export const NAV = [
  { id: 'today', labelKey: 'nav_today', icon: icons.today },
  { id: 'plan', labelKey: 'nav_plan', icon: icons.plan },
  { id: 'projects', labelKey: 'nav_projects', icon: icons.projects },
  { id: 'flows', labelKey: 'nav_flows', icon: icons.flows },
  { id: 'report', labelKey: 'nav_report', icon: icons.report },
];

/* horizon shortcuts that live on the Today route (item 2) — not routes
   themselves; clicking one switches S.ui.horizon and renders Today */
const HORIZON_NAV = [
  { id: 'tomorrow', labelKey: 'tomorrow', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 13l3 3 3-3' },
  { id: 'next7', labelKey: 'next_7_days', icon: 'M5 6l6 6-6 6M13 6l6 6-6 6' },
];

let prevRoute = 'today';/* routes */
const STUBS = {
  plan: () => renderPlan(),
  projects: () => renderProjects(),
  flows: () => renderFlows(),
  report: () => renderReport(),
};

function stubView(labelKey, phase) {
  return h('div', { class: 'card', style: 'padding:32px;text-align:center' },
    h('div', { style: 'font-size:40px' }, '🚧'),
    h('p', { class: 'mt' }, tr(labelKey), ' — ', N('Phase ' + phase)),
  );
}

export function render() {
  const root = document.getElementById('app');
  if (!root) return;
  const route = S.ui.route;

  clear(root);
  root.append(
    h('div', { class: 'shell' },
      buildSidebar(route),
      buildContent(route),
    ),
  );
}

function buildSidebar(route) {
  const sb = h('aside', { class: 'sidebar', 'aria-label': tr('app_name') });
  const brand = h('div', { class: 'sb-brand' },
    h('img', { src: 'public/icons/logo.svg', width: 22, height: 22, alt: '', 'aria-hidden': 'true' }),
    h('span', {}, tr('app_name')));
  sb.append(brand);

  const tk = todayKey();
  const keyOf = t => (t.dueDate ? dayKey(t.dueDate) : null);
  const horizonCount = hz => S.tasks.filter(t =>
    t.status === 'todo' && !t.noise && inBucket(hz, keyOf(t), tk)).length;

  /* today route entry — badge now counted by the SAME horizon logic the view
     uses, instead of every open task, so it can't say 127 over a 5-row view */
  {
    const n = NAV[0];
    sb.append(h('button', {
      class: 'sb-item' + (S.ui.route === n.id ? ' active' : ''),
      onclick: () => setRoute(n.id),
      'aria-current': S.ui.route === n.id ? 'page' : null,
    },
      sv(n.icon),
      h('span', { class: 'sb-label' }, tr(n.labelKey)),
      h('span', { class: 'count' }, N(horizonCount('today'))),
    ));
  }
  /* horizon shortcuts between Today and Plan (item 2) */
  for (const hz of HORIZON_NAV) {
    const active = S.ui.route === 'today' && S.ui.horizon === hz.id;
    sb.append(h('button', {
      class: 'sb-item' + (active ? ' active' : ''),
      onclick: () => { S.ui.horizon = hz.id; S.ui.route = 'today'; commit(() => true); render(); },
      'aria-current': active ? 'page' : null,
    },
      sv(hz.icon),
      h('span', { class: 'sb-label' }, tr(hz.labelKey)),
      h('span', { class: 'count' }, N(horizonCount(hz.id))),
    ));
  }
  for (const n of NAV.slice(1)) {
    const item = h('button', {
      class: 'sb-item' + (S.ui.route === n.id ? ' active' : ''),
      onclick: () => setRoute(n.id),
      'aria-current': S.ui.route === n.id ? 'page' : null,
    },
      sv(n.icon),
      h('span', { class: 'sb-label' }, tr(n.labelKey)),
    );
    sb.append(item);
  }
  /* modules: habits + countdown accessible from sidebar */
  sb.append(h('div', { class: 'sb-seg' }, tr('extra_modules')));
  const energyKey = S.settings.energyMode || 'normal';
  const energyEmoji = (ENERGY_MODES.find(m => m[0] === energyKey) || ENERGY_MODES[0])[2];
  sb.append(h('button', { class: 'sb-item', onclick: () => openEnergySheet() },
    energyEmoji + ' ', h('span', { class: 'sb-label' }, tr('energy'))));
  sb.append(h('button', { class: 'sb-item', onclick: () => import('./habits.js').then(m => moduleSheet(tr('habits'), () => m.renderHabits())) },
    '🔁 ', h('span', { class: 'sb-label' }, tr('habits'))));
  sb.append(h('button', { class: 'sb-item', onclick: () => import('./countdown.js').then(m => moduleSheet(tr('countdown'), () => m.renderCountdowns())) },
    '⏳ ', h('span', { class: 'sb-label' }, tr('countdown'))));
  sb.append(h('button', { class: 'sb-item', onclick: () => openSettings() },
    sv(icons.settings, 18), h('span', { class: 'sb-label' }, tr('settings'))));

  /* saved filters */
  if ((S.savedFilters || []).length) {
    sb.append(h('div', { class: 'sb-seg' }, tr('filters')));
    for (const f of S.savedFilters) {
      sb.append(h('button', { class: 'sb-item', style: 'padding:6px 12px;min-height:34px;font-size:13px', onclick: () => applyFilter(f) },
        '⭐ ', h('span', { class: 'sb-label' }, f.name)));
    }
  }

  sb.append(h('div', { class: 'sb-seg' }, tr('lists')));

  /* lists quick filter */
  for (const l of S.lists) {
    const c = S.tasks.filter(t => t.listId === l.id && t.status === 'todo').length;
    sb.append(h('button', { class: 'sb-item', style: 'padding:6px 12px;min-height:34px;font-size:13px', onclick: () => {
      S.ui.route = 'today'; S.ui.filterList = l.id; commit(() => true);
    } },
      sv(icons.inbox, 16),
      h('span', { class: 'sb-label' }, l.name),
      c ? h('span', { class: 'count' }, N(c)) : null,
    ));
  }
  return sb;
}

function buildContent(route) {
  const wrap = h('div', { class: 'content' });
  wrap.append(buildTopbar(route));

  const main = h('main', { class: 'main', id: 'main' });
  if (route === 'today') main.append(renderToday());
  else {
    const stub = STUBS[route];
    if (stub) main.append(stub());
  }
  wrap.append(main);

  /* mobile bottom nav */
  const nav = h('nav', { class: 'bottomnav', role: 'navigation' });
  for (const n of NAV) {
    nav.append(h('button', { class: 'bn-item' + (route === n.id ? ' active' : ''), onclick: () => setRoute(n.id) }, sv(n.icon, 22), tr(n.labelKey)));
  }
  wrap.append(nav);

  /* FABs — actions live here so they survive re-renders */
  wrap.append(
    h('button', { class: 'fab fab-add', title: tr('add_task'), 'aria-label': tr('add_task'), onclick: () => openQuickAdd() }, sv(icons.plus, 24)),
    h('button', { class: 'fab fab-dump', title: tr('dump'), 'aria-label': tr('dump'), onclick: () => openBrainDump() }, sv(icons.dump, 22)),
    h('button', { class: 'fab fab-breathe', title: tr('breathe'), 'aria-label': tr('breathe'), onclick: () => openBreathe() }, sv(icons.breathe, 20)),
  );
  return wrap;
}

/* simple module sheet renderer for habits/countdown */
function moduleSheet(title, renderFn) {
  import('./components.js').then(({ sheet }) => {
    sheet(title, renderFn(), {});
  });
}

/* item 8 — sort menu sheet: two ordered keys, each with a direction toggle.
   Written straight to S.ui.sort and persisted via commit → render. */
function openSortMenu() {
  const cfg = S.ui.sort || { primary: 'due', primaryDir: 'asc', secondary: null, secondaryDir: 'asc' };
  const st = { ...cfg };               /* live draft until Apply */
  const dirBtn = () => {
    const b = h('button', {
      class: 'btn-icon',
      onclick: () => {
        st[dirBtn.which + 'Dir'] = st[dirBtn.which + 'Dir'] === 'asc' ? 'desc' : 'asc';
        b.textContent = st[dirBtn.which + 'Dir'] === 'desc' ? '↓' : '↑';
        b.setAttribute('aria-label', tr(st[dirBtn.which + 'Dir'] === 'desc' ? 'sort_desc' : 'sort_asc'));
      },
    });
    b.set = (which) => {
      dirBtn.which = which;
      b.textContent = st[which + 'Dir'] === 'desc' ? '↓' : '↑';
      b.setAttribute('aria-label', tr(st[which + 'Dir'] === 'desc' ? 'sort_desc' : 'sort_asc'));
    };
    return b;
  };
  const row = (which, allowNone) => {
    const keys = allowNone ? ['none', ...SORT_KEYS] : SORT_KEYS;
    const a = dirBtn();
    const sel = h('select', { style: 'flex:1;min-height:36px', 'aria-label': tr('sort_by'),
      onchange: (e) => { const v = e.target.value; st[which] = v === 'none' ? null : v; a.set(which); } },
      ...keys.map(k => h('option', { value: k, selected: (st[which] || 'none') === k ? 'selected' : null },
        k === 'none' ? '—' : tr('sort_' + k))))
    ;
    a.set(which);
    return h('div', { class: 'chips-row', style: 'margin-block:6px' }, sel, a);
  };
  const s = sheet(tr('sort_by'),
    h('div', { style: 'min-width:260px' },
      row('primary', false),
      row('secondary', true),
      h('div', { class: 'chips-row', style: 'margin-top:10px' },
        h('button', { class: 'pick', style: 'padding:8px 14px', onclick: () => {
          S.ui.sort = st.primary ? st : null; commit(() => true); render();
          s.close();
        } }, tr('common.apply')),
        h('button', { class: 'pick', style: 'padding:8px 14px', onclick: () => {
          S.ui.sort = null; commit(() => true); render();
          s.close();
        } }, '✕ ' + tr('filter_clear')),
      )), {});
  return s;
}

function buildTopbar(route) {
  const tb = h('header', { class: 'topbar' });
  if (route === 'today' && S.ui.horizon === 'today') { 
    tb.append(h('button', { class: 'btn-icon', title: tr('drawer_btn'), 'aria-label': tr('drawer_btn'), onclick: () => openDrawer() }, sv(icons.drawer)));
  }
  tb.append(h('h1', {}, tr('app_name'), ' · ', tr(NAV.find(n => n.id === route)?.labelKey || 'app_name')));
  const now = new Date();
  tb.append(h('span', { class: 'tb-date num' }, dayLabel(now)));

  /* XP bar */
  const { lvl, pct, remain } = levelProgress(S.xp);
  tb.append(
    h('div', { class: 'xpwrap', title: tr('xp_to_next', { n: N(remain) }) },
      h('span', { class: 'chip num', style: 'background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)' },
        tr('level', { n: N(lvl) })),
      h('div', { class: 'xpbar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 },
        h('i', { style: `width:${pct}%` })),
    ),
  );
  tb.append(h('button', { class: 'btn-icon', title: tr('search') + ' (/)', 'aria-label': tr('search'), onclick: () => openSearch() }, sv(icons.search)));
  tb.append(h('button', { class: 'btn-icon', title: tr('palette') + ' (Ctrl+K)', 'aria-label': tr('palette'), onclick: () => openPalette() }, '⌘'));
  if (S.ui.filterQuery) {
    tb.append(h('button', { class: 'pick', style: 'max-width:220px', onclick: () => { clearFilter(); }, title: tr('filter_clear') },
      '🩶 ' + (S.ui.savedFilterName || S.ui.filterQuery) + ' ✕'));
  }
  if (S.ui.filterList !== 'all') {
    const lname = (S.lists || []).find(l => l.id === S.ui.filterList)?.name || N(S.ui.filterList);
    tb.append(h('button', { class: 'pick', style: 'max-width:220px', onclick: () => { S.ui.filterList = 'all'; commit(() => true); render(); }, title: tr('filter_clear') },
      '🩶 ' + lname + ' ✕'));
  }
  /* item 8 — the sort menu (Today route only) */
  if (route === 'today') {
    const sc = S.ui.sort;
    tb.append(h('button', {
      class: 'btn-icon', title: tr('sort_by'), 'aria-label': tr('sort_by'),
      onclick: () => openSortMenu(),
      style: sc ? 'color:var(--accent)' : '',
    }, sc ? '⇅' : '↕'));
  }

  tb.append(h('button', { class: 'btn-icon', title: tr('settings') + ' (s)', 'aria-label': tr('settings'), onclick: () => openSettings() }, sv(icons.settings)));

  prevRoute = route;
  return tb;
}

function dayLabel(d) {
  const lbl = fmtDate(d, { withYear: false });
  return lbl;
}

export function setRoute(id) {
  if (S.ui.route !== id) {
    prevRoute = S.ui.route;
    S.ui.route = id;
    commit(() => true);
    render();
  }
}

/* re-render only Today view when task data changes and route = today */
subscribe(() => {
  if (S.ui.route === 'today') render();
}, () => true);
