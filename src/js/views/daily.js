/* ============================================================
   TicTic ADHD — Today view (§5.1) + horizons
   Frog banner · energy mode · overdue (neutral) · key tasks ·
   regular · done today · Noise Harbor card · Now list
   ============================================================ */
import { S, commit, persist, byId, makeTask, deleteTask } from '../store.js';
import { tr, N, fmtDate, dayName, parseISO, dayKey } from '../i18n.js';
import { visible } from '../horizons.js';
import { todayRenderPlan } from '../rows.js';
import { h, sv, icons, announce, levelProgress } from '../ui.js';
import { PRIORITY, DOPAMINE, PRESSURE, tickChip, snackbar, celebrate, sheet } from '../components.js';
import { completeTask, uncompleteTask } from '../tasks.js';
import { openDetail } from '../detail.js';
import { openQuickAdd } from '../quickadd.js';
import { startFocus } from '../focus.js';
import { matchQuery } from '../search.js';
import { todayCommitmentStrip } from '../timetable.js';
import { artOpenDay } from '../art.js';
import { HORIZONS } from '../drawer.js';

export function renderToday() {
  const wrap = h('div', {});
  const now = new Date();

  wrap.append(h('div', { style: 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:14px' },
    h('h2', { style: 'font-size:24px;margin:0' }, tr({ today: 'today', tomorrow: 'tomorrow', this_week: 'this_week', next7: 'next_7_days', inbox: 'inbox' }[S.ui.horizon] || 'today')),
    S.ui.horizon === 'today' ? h('span', { class: 'tb-date num' }, dayName(now) + ' · ' + fmtDate(now, { withYear: false })) : h('span', {}),
  ));

  /* everything this view draws comes from the render plan (rows.js), so the
     selection is pure and importable in Node — that is what lets
     tools/check-dom.mjs assert the element set this function will build. The
     banner, the strip and every list row are read from the same object. */
  const plan = todayRenderPlan(S, { matcher: matchQuery });
  const frog = plan.banner;
  if (frog) wrap.append(frogBanner(frog));
  if (S.ui.horizon === 'today') {
    wrap.append(energyChips());
    const behavior = energyBehaviorCard();
    if (behavior) wrap.append(behavior);
  }

  /* Now list — a shortlist, not a second list: ≤3 items, ONE reason and one
     action each. Candidates pass the same visible()/groupOf() predicates as
     the rows below, so the strip can never show a task the list has filtered
     out (it used to: it scored S.tasks directly). */
  const nowItems = plan.now;
  const shortlist = new Set(nowItems.map(s => s.t.id));
  if (nowItems.length) {
    wrap.append(h('div', { class: 'sec-h' }, '🧭 ' + tr('now_list')), h('div', {}, ...nowItems.map(nowRow)));
  }

  /* overdue */
  const overdue = plan.overdue;
  if (overdue.length) {
    wrap.append(sectionHeader('📅 ' + tr('overdue'), N(overdue.length)), ...overdue.map(t => rowTask(t, shortlist.has(t.id))));
  }

  /* main bucket by horizon */
  const bucket = plan.bucket;
  if (bucket.length) wrap.append(...bucket.map(t => rowTask(t, shortlist.has(t.id))));

  /* done today */
  const done = plan.done;
  if (done.length) {
    const body = h('div', {}, ...done.map(t => rowTask(t, shortlist.has(t.id))));
    const head = h('button', { class: 'sec-h', 'aria-expanded': 'false', onclick: () => {
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : ''; head.setAttribute('aria-expanded', String(!open));
    } }, '✅ ' + tr('done_today') + ' · ' + N(done.length));
    wrap.append(head, body);
  }

  if (!frog && !overdue.length && !bucket.length && !done.length) wrap.append(emptyState());

  /* today's fixed commitments (school / pickup / classes) */
  const strip = todayCommitmentStrip();
  if (strip) wrap.append(strip);

  /* noise harbor card */
  const noiseCount = S.tasks.filter(t => t.noise).length;
  if (noiseCount) {
    wrap.append(h('button', { class: 'card', style: 'width:100%;text-align:start;padding:12px 14px;margin-block:14px;display:flex;gap:10px;align-items:center;cursor:pointer', onclick: () => import('../noise.js').then(m => m.openNoiseHarbor()) },
      h('span', {}, '🛟'), h('span', { style: 'flex:1;font-weight:600' }, tr('noise_harbor')),
      h('span', { class: 'chip num' }, N(noiseCount))));
  }
  return wrap;
}

function sectionHeader(txt, count) {
  return h('div', { class: 'sec-h' }, txt, count ? h('span', { class: 'chip num', style: 'margin-inline-start:6px' }, count) : null);
}
function emptyState() {
  return h('div', { class: 'state-card' },
    artOpenDay(),
    h('h3', {}, tr('empty_today')),
    h('p', {}, tr('empty_hint_add')));
}
function frogBanner(frog) {
  return h('button', { class: 'frog-banner', onclick: () => openDetail(frog.id) },
    h('span', { style: 'font-size:24px' }, '🐸'),
    h('div', { style: 'flex:1;text-align:start' },
      h('div', { style: 'font-weight:800' }, frog.title),
      h('div', { style: 'font-size:12px;color:var(--text-muted)' }, tr('pri_frog_label') + (frog.estimate ? ' · ' + N(frog.estimate) + tr('_min') : ''))),
    h('span', { class: 'chip', style: 'background:var(--priority-frog);color:#fff' }, tr('eat_it')));
}

const ENERGY_LABELS = [['normal', 'energy_normal'], ['low', 'energy_low'], ['high', 'energy_high'], ['bad', 'energy_bad']];
const energyISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
function setEnergy(k) {
  S.settings.energyMode = k;
  S.energyModes = { ...S.energyModes, today: k, [energyISO()]: k };
  persist(); commit(); rerenderToday();
}
function energyChips() {
  const cur = S.settings.energyMode || S.energyModes?.today || 'normal';
  return h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px' },
    ENERGY_LABELS.map(([k, lk]) => h('button', {
      class: 'chip' + (cur === k ? ' on' : ''), style: cur === k ? 'background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent)' : 'box-shadow:inset 0 0 0 1px var(--line);background:var(--bg-secondary)',
      'aria-pressed': String(cur === k),
      onclick: () => setEnergy(k),
    }, tr(lk))));
}

/* ---- energy behaviour (§8): low → help cards, high → nudge, bad → helpers ---- */
const MICRO_IDEAS = ['micro_1', 'micro_2', 'micro_3', 'micro_4'];
function addMicroTask(title) {
  const task = makeTask({
    title, listId: 'inbox', estimate: 2, tags: ['quick'],
    dueDate: (() => { const d = new Date(); d.setHours(23, 0, 0, 0); return d.toISOString(); })(),
    order: Date.now(),
  });
  S.tasks.push(task);
  persist(); commit(); rerenderToday();
  snackbar(tr('micro_added', { x: title }), () => {
    deleteTask(task.id);
    persist(); commit(); rerenderToday();
  });
}
function energyBehaviorCard() {
  const mode = S.settings.energyMode || 'normal';
  const eb = S.settings.energyBehavior || {};
  const iso = energyISO();

  if (mode === 'low' && eb.lowHelpCards !== false) {
    return h('div', { class: 'card', style: 'padding:12px 14px;margin-block:10px' },
      h('div', { style: 'font-weight:700;margin-bottom:8px' }, '🔋 ' + tr('energy_low_note')),
      h('div', { class: 'chips-row' }, ...MICRO_IDEAS.map(k =>
        h('button', { class: 'pick', onclick: () => addMicroTask(tr(k)) }, '＋ ' + tr(k)))));
  }
  if (mode === 'high' && eb.highNudge !== false) {
    const best = frogInView() || S.tasks.find(t => t.key && t.status === 'todo' && !t.noise);
    if (best) {
      return h('div', { class: 'card', style: 'padding:12px 14px;margin-block:10px;display:flex;gap:10px;align-items:center' },
        h('span', {}, '⚡'),
        h('div', { style: 'flex:1' },
          h('div', { style: 'font-weight:700' }, tr('energy_high_note')),
          h('div', { style: 'font-size:13px;color:var(--text-muted)' }, best.title)),
        h('button', { class: 'pick on', onclick: () => startFocus(best) }, tr('start')));
    }
  }
  if (mode === 'bad' && eb.badAutoHelp !== false) {
    const flag = 'helpers:' + iso;
    if (!S.energyModes[flag]) {
      S.energyModes[flag] = true;
      const n = Math.max(1, Math.min(6, eb.badHelpCount || 3));
      for (let i = 0; i < n; i++) {
        S.tasks.push(makeTask({ title: tr(MICRO_IDEAS[i % MICRO_IDEAS.length]), listId: 'inbox', estimate: 2, tags: ['quick'], order: Date.now() + i }));
      }
      persist(); commit();
    }
    return h('div', { class: 'card', style: 'padding:12px 14px;margin-block:10px' },
      h('div', { style: 'font-weight:700' }, '🌧 ' + tr('energy_bad_note')));
  }
  return null;
}
function frogInView() {
  return S.tasks.find(t => t.priority === 'frog' && t.status === 'todo' && !t.noise && !t.dropped);
}

/* ---- the shortlist row: one reason, one action ----------------------------
   No tick, no star, no overflow: the strip answers "what next", and the list
   below keeps owning the full set of actions. */
function nowRow({ t, why }) {
  const P = PRIORITY[t.priority] || PRIORITY.none;
  return h('div', { class: 'trow' + (t.priority === 'frog' ? ' kfrog' : prioClass(t.priority)), style: `--pc:${P.color}` },
    h('div', { class: 't-main' },
      h('div', { style: 'min-width:0;flex:1' },
        h('button', { class: 't-title', onclick: () => openDetail(t.id), title: t.title }, t.title),
        h('span', { class: 't-reason num' }, why),
      ),
    ),
    h('button', { class: 'pick on', onclick: () => startFocus(t) }, tr('start_timer')),
  );
}

/* ---- task row — the shortlist badge comes from the Now strip ---- */
const PRIO_ORDER = ['none', 'low', 'med', 'high', 'frog'];
function rowKeyMove(e, task) {
  if (!e.altKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const i = PRIO_ORDER.indexOf(task.priority || 'none');
    const ni = Math.max(0, Math.min(PRIO_ORDER.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    if (ni === i) return;
    task.priority = PRIO_ORDER[ni];
    persist(); commit(); rerenderToday();
    announce(tr('priority') + ': ' + tr(PRIORITY[task.priority].key));
    e.preventDefault();
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const sibs = S.tasks
      .filter(t => !t.parentId && t.status === task.status && visible(S, t, matchQuery))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const i = sibs.indexOf(task);
    const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= sibs.length) return;
    const other = sibs[j];
    const o = task.order; task.order = other.order; other.order = o;
    persist(); commit(); rerenderToday();
    announce(tr('moved'));
    e.preventDefault();
  }
}
/* priority visual class: high 3px bar, med 2px, frog keeps its kfrog row rule */
const prioClass = p => p === 'high' ? ' p-high' : p === 'med' ? ' p-med' : '';
function rowTask(task, inShortlist = false) {
  const P = PRIORITY[task.priority] || PRIORITY.none;
  return h('div', {
    class: 'trow' + (task.status === 'done' ? ' done' : '') + (task.priority === 'frog' ? ' kfrog' : prioClass(task.priority)), style: `--pc:${P.color}`,
    tabindex: '0', role: 'listitem',
    'aria-label': task.title + ' — ' + tr('kbd_move_hint'),
    onKeydown: e => rowKeyMove(e, task),
  },
    tickChip(task, () => onToggle(task)),
    h('div', { class: 't-main' },
      h('div', { style: 'min-width:0;flex:1' },
        h('button', { class: 't-title', onclick: () => openDetail(task.id), title: task.title }, task.title),
        h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
          h('span', { style: 'flex:none;font-size:14px' },
            task.dopamineType ? DOPAMINE[task.dopamineType] : '', task.pressureType ? PRESSURE[task.pressureType] : ''),
          metaChips(task),
          inShortlist ? h('span', { class: 'chip num' }, tr('now_badge')) : null,
        ),
      ),
    ),
    h('div', { class: 't-actions' },
      h('button', { class: 'star-btn' + (task.key ? ' on' : ''), title: tr('key_toggle'), 'aria-label': tr('key_toggle'),
        onclick: () => { task.key = !task.key; commit(); rerenderToday(); } }, sv(icons.star, 16)),
      h('button', { class: 'act', title: tr('start_timer'), 'aria-label': tr('start_timer'), onclick: () => startFocus(task) }, sv(icons.play, 18)),
    ),
  );
}
function metaChips(task) {
  const bits = [];
  if (task.estimate) bits.push(N(task.estimate) + '′');
  if (task.actual) bits.push('✓' + N(task.actual) + '′');
  if (task.subtasks?.length) bits.push('☑' + N(task.subtasks.filter(s => s.done).length) + '/' + N(task.subtasks.length));
  if (task.delay) bits.push('⏳' + N(fmtDate(parseISO(dayKey(task.delay)))));
  if (task.reminders?.length) bits.push('🔔' + N(task.reminders.length));
  if (task.kind === 'decision') bits.push('？' + tr('decide'));
  if (!bits.length) return h('span', {});
  return h('span', { class: 't-meta num' }, bits.join(' · '));
}

function onToggle(task) {
  if (task.status === 'done') {
    uncompleteTask(task.id);
  } else {
    const res = completeTask(task.id);
    celebrate();
    const msg = (S.settings.lang === 'fa' ? 'انجام شد: ' : 'Completed: ') + task.title;
    snackbar(res?.recurring ? msg + ' · ' + tr('repeat_rolled') : msg,
      res?.undo || (() => uncompleteTask(task.id)));
  }
  rerenderToday();
}
export function rerenderToday() { document.dispatchEvent(new Event('rerender')); }
