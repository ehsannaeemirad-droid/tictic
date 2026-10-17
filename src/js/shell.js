/* ============================================================
   TicTic ADHD — App shell (§3)
   Sidebar / bottom nav / FABs / topbar + routing between views.
   Phase 1: all 5 routes present; views render gradually, and only
   the Today view has a real skeleton right now.
   ============================================================ */
import { S, commit, subscribe } from './store.js';
import { tr, N, fmtDate, setLang } from './i18n.js';
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

export const NAV = [
  { id: 'today', labelKey: 'nav_today', icon: icons.today },
  { id: 'plan', labelKey: 'nav_plan', icon: icons.plan },
  { id: 'projects', labelKey: 'nav_projects', icon: icons.projects },
  { id: 'flows', labelKey: 'nav_flows', icon: icons.flows },
  { id: 'report', labelKey: 'nav_report', icon: icons.report },
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

  const tasksCount = S.tasks.filter(t => t.status === 'todo' && !t.noise).length;
  for (const n of NAV) {
    const count = n.id === 'today' ? N(tasksCount) : '';
    const item = h('button', {
      class: 'sb-item' + (route === n.id ? ' active' : ''),
      onclick: () => setRoute(n.id),
      'aria-current': route === n.id ? 'page' : null,
    },
      sv(n.icon),
      h('span', { class: 'sb-label' }, tr(n.labelKey)),
      count ? h('span', { class: 'count' }, count) : null,
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
