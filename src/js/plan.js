/* ============================================================
   TicTic ADHD — Plan view (§5.6)
   Week (7-day list) · Month grid · Sprint (14-day bar) · Agenda.
   Timetable commitments (morning/evening shift) render as their
   own section — see timetable.js.
   ============================================================ */
import { S, commit, persist, byId } from './store.js';
import { tr, N, fmtDate, parseISO, dayName, isoTime, dayKey, shiftDay, hasTimeOfDay } from './i18n.js';
import { h, sv, icons, announce } from './ui.js';
import { sheet } from './components.js';
import { openDetail } from './detail.js';
import { timetableSection } from './timetable.js';
import { renderMatrix } from './views/matrix.js';

let mode = 'week';
let anchor = new Date();
/* local-calendar date helpers (never mix UTC parse with local days) */
function localISO(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function day0(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function anchorISO() { return localISO(day0(anchor)); }

export function renderPlan() {
  /* the ⌘K palette can jump straight to a mode */
  if (S.ui.planMode) { mode = S.ui.planMode; S.ui.planMode = null; }
  const wrap = h('div', {});
  const seg = h('div', { class: 'seg plan-seg' });
  for (const [m, k] of [['week', 'week'], ['month', 'month'], ['sprint', 'sprint'], ['agenda', 'agenda'], ['matrix', 'eisenhower']]) {
    seg.append(h('button', { class: mode === m ? 'on' : '', onclick: () => { mode = m; rerender(); } }, tr(k)));
  }
  wrap.append(seg);

  if (mode === 'matrix') { wrap.append(renderMatrix()); return wrap; }
  if (mode === 'week') wrap.append(weekList());
  if (mode === 'month') wrap.append(monthGrid());
  if (mode === 'sprint') wrap.append(sprintView());
  if (mode === 'agenda') wrap.append(agendaList());

  /* timetable (always at bottom of plan) */
  wrap.append(timetableSection());
  return wrap;
}

/* ---- helpers ---- */
function shift(days) { const x = day0(anchor); x.setDate(x.getDate() + days); return x; }
function rerender() { document.dispatchEvent(new Event('rerender')); }

/** first day of the visible week, honouring Settings → week start */
function weekStartDay(d) {
  const pref = S.settings.weekStart || 'sat';
  const offset = pref === 'mon' ? 6 : (pref === 'sat' || pref === 'saturday') ? 1 : 0;
  const x = day0(d);
  x.setDate(x.getDate() - ((x.getDay() + offset) % 7));
  return x;
}

/* ---- Week: 7-day list ---- */
function weekList() {
  const wrap = h('div', {});
  const start = weekStartDay(anchor);
  const nav = h('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:6px' },
    h('button', { class: 'btn-icon', 'aria-label': tr('week_prev'), onclick: () => { start.setDate(start.getDate() - 7); anchor = start; rerender(); } }, '‹'),
    h('span', { class: 'num', style: 'font-weight:700' }, fmtDate(start) + ' – ' + fmtDate(new Date(start.getTime() + 6 * 86400000))),
    h('button', { class: 'btn-icon', 'aria-label': tr('week_next'), onclick: () => { start.setDate(start.getDate() + 7); anchor = start; rerender(); } }, '›'),
  );
  wrap.append(nav);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const isoDay = localISO(d);
    const tasks = S.tasks.filter(t => t.status === 'todo' && !t.noise && t.dueDate && dayKey(t.dueDate) === isoDay);
    const card = h('div', { class: 'card day-card' },
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
        h('div', { style: 'font-weight:800' }, dayName(d), ' ', h('span', { class: 'num' }, N(d.getDate()))),
        h('span', { class: 'chip num' }, N(tasks.length)),
      ),
      ...tasks.slice(0, 6).map(t => h('button', { class: 'mini-row', onclick: () => openDetail(t.id) },
        t.title[0] ? '' : '', h('span', { style: 'flex:1;text-align:start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, t.title),
        t.estimate ? h('span', { class: 'num' }, N(t.estimate) + '′') : null)),
      tasks.length > 6 ? h('button', { class: 'mini-more num', onclick: () => { anchor = d; mode = 'agenda'; rerender(); } }, '+' + N(tasks.length - 6) + ' ' + tr('more')) : null,
    );
    wrap.append(card);
  }
  return wrap;
}

/* ---- Month grid ---- */
function monthGrid() {
  const wrap = h('div', {});
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const nav = h('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:6px' },
    h('button', { class: 'btn-icon', onclick: () => { anchor = new Date(first); anchor.setMonth(anchor.getMonth() - 1); rerender(); } }, '‹'),
    h('span', { class: 'num', style: 'font-weight:700' }, fmtDate(first, { withYear: true })),
    h('button', { class: 'btn-icon', onclick: () => { anchor = new Date(first); anchor.setMonth(anchor.getMonth() + 1); rerender(); } }, '›'),
  );
  wrap.append(nav);
  const grid = h('div', { class: 'month-grid' });
  /* pad from the configured week start, same rule as the week list */
  const ws = S.settings.weekStart || 'sat';
  const lead = (first.getDay() + (ws === 'mon' ? 6 : 1)) % 7;
  for (let i = 0; i < lead; i++) grid.append(h('div', { class: 'mcell empty' }));
  for (let d = 1; d <= days; d++) {
    const iso = localISO(new Date(first.getFullYear(), first.getMonth(), d));
    const cnt = S.tasks.filter(t => t.dueDate && dayKey(t.dueDate) === iso && t.status === 'todo' && !t.noise).length;
    const isToday = iso === localISO(new Date());
    grid.append(h('button', { class: 'mcell' + (isToday ? ' today' : ''), onclick: () => { anchor = new Date(first.getFullYear(), first.getMonth(), d); mode = 'agenda'; rerender(); } },
      h('span', { class: 'num' }, N(d)),
      cnt ? h('span', { class: 'chip num', style: 'padding:1px 6px;font-size:10px' }, N(cnt)) : null));
  }
  wrap.append(grid);
  return wrap;
}

/* ---- Sprint ---- */
function sprintView() {
  const sp = S.sprint || { name: 'اسپرینت', goal: '', start: localISO(new Date()), length: 14 };
  const start = new Date(sp.start);
  const end = new Date(start); end.setDate(end.getDate() + (sp.length || 14));
  const now = new Date();
  const dayN = Math.min((sp.length || 14), Math.max(1, Math.round((day0(now) - day0(start)) / 86400000) + 1));
  const pct = Math.round((dayN / (sp.length || 14)) * 100);
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'card', style: 'padding:16px' },
    h('div', { style: 'font-weight:800;margin-bottom:4px' }, sp.name),
    sp.goal ? h('div', { style: 'font-size:13px;color:var(--text-muted);margin-bottom:10px' }, sp.goal) : null,
    h('div', { class: 'num', style: 'font-weight:700;margin-bottom:6px' }, tr('day_x_of_y', { x: N(dayN), y: N(sp.length || 14) })),
    h('div', { class: 'xpbar', style: 'width:100%' }, h('i', { style: `width:${pct}%` })),
  ));
  /* sprint days with tasks */
  for (let i = 0; i < (sp.length || 14); i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const iso = localISO(d);
    const tasks = S.tasks.filter(t => t.status === 'todo' && !t.noise && t.dueDate && dayKey(t.dueDate) === iso);
    if (!tasks.length) continue;
    wrap.append(h('div', { class: 'card', style: 'padding:12px' },
      h('div', { style: 'font-weight:700;display:flex;justify-content:space-between' }, fmtDate(d), tasks[0] && tasks[0]._sprintSkip ? '' : null),
      ...tasks.map(t => h('div', { style: 'display:flex;gap:8px;align-items:center;padding-top:6px' },
        h('span', { style: 'flex:1' }, t.title),
        h('button', { class: 'btn-icon', title: tr('move_later'), onclick: () => {
          t.dueDate = shiftDay(t.dueDate, 1);
          commit(); rerender(); announce(tr('moved_later'));
        } }, '→')),
      )));
  }
  return wrap;
}

/* ---- Agenda: tasks for anchor day ---- */
function agendaList() {
  const wrap = h('div', {});
  const iso = anchorISO();
  wrap.append(h('div', { style: 'display:flex;align-items:center' },
    h('button', { class: 'btn-icon', onclick: () => { anchor = new Date(anchor.getTime() - 86400000); rerender(); } }, '‹'),
    h('span', { style: 'flex:1;text-align:center;font-weight:800' }, dayName(anchor) + ' · ' + fmtDate(anchor, { withYear: true })),
    h('button', { class: 'btn-icon', onclick: () => { anchor = new Date(anchor.getTime() + 86400000); rerender(); } }, '›'),
  ));
  const tasks = S.tasks.filter(t => t.status === 'todo' && !t.noise && t.dueDate && dayKey(t.dueDate) === iso);
  if (!tasks.length) wrap.append(h('div', { class: 'card', style: 'padding:24px;color:var(--text-muted);text-align:center' }, tr('day_empty')));
  wrap.append(...tasks.map(t => agendaRow(t)));
  return wrap;
}
function agendaRow(t) {
  return h('div', { class: 'trow' },
    h('div', { class: 't-main' },
      h('button', { class: 't-title', onclick: () => openDetail(t.id) }, t.title),
      h('span', { class: 't-meta num' }, hasTimeOfDay(t.dueDate) ? N(isoTime(new Date(t.dueDate))) : tr('no_time'))));
}
