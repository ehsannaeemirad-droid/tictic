/* ============================================================
   TicTic ADHD — Task detail sheet (§4.4)
   Progressive disclosure: essentials first. Distinct labels for
   due / planned start / estimate / actual / reminders.
   ============================================================ */
import { S, commit, byId, deleteTask } from './store.js';
import { tr, N, parseISO, fmtDate, isoTime, iso, dayKey, hasTimeOfDay } from './i18n.js';
import { h, sv, icons, announce } from './ui.js';
import { sheet, snackbar, tickChip, PRIORITY, DOPAMINE, PRESSURE } from './components.js';
import { completeTask, uncompleteTask } from './tasks.js';
import { startFocus } from './focus.js';

export function openDetail(id) {
  const task = byId(id); if (!task) return;
  const body = h('div', {});

  /* --- header: tick + title + star --- */
  const titleInp = h('input', { type: 'text', value: task.title, 'aria-label': tr('task'), style: 'font-weight:700' });
  titleInp.addEventListener('change', () => { task.title = titleInp.value.trim() || task.title; task.modifiedAt = Date.now(); commit(tt => !!tt.tasks); });
  body.append(h('div', { class: 'detail-sec', style: 'display:flex;gap:10px;align-items:center' },
    tickChip(task, () => onToggleDone(task)),
    titleInp,
    h('button', { class: 'star-btn' + (task.key ? ' on' : ''), title: tr('key_toggle'), 'aria-label': tr('key_toggle'), onclick: () => {
      task.key = !task.key; commit(tt => !!tt.tasks);
    } }, sv(icons.star, 18)),
  ));

  /* --- add first step beside title (§6) --- */
  body.append(h('div', { class: 'detail-sec' },
    h('button', { class: 'pick', style: 'width:100%;min-height:42px;border-style:dashed', onclick: () => addMiniStep(task) },
      '🧩 ' + tr('add_first_step')),
  ));

  /* --- quick set: estimate chips + priority + kind --- */
  body.append(quickSetSection(task));

  /* --- distinct commitments --- */
  body.append(commitSection(task));

  /* --- dopamine + pressure --- */
  body.append(dpSection(task));

  /* --- mini steps --- */
  body.append(stepsSection(task, body));

  /* --- notes --- */
  body.append(notesSection(task));

  /* --- actions --- */
  const { close: closeSheet } = sheet(tr('task'), body, { onClose: () => commit(tt => !!tt.tasks) });
  body.append(actionsSection(task, closeSheet));
}

function onToggleDone(task) {
  if (task.status === 'done') {
    uncompleteTask(task.id);
    announce(tr('undo'));
  } else {
    const res = completeTask(task.id);
    /* the sheet closes, so the undo has to live in the snackbar */
    snackbar(tr('completed_toast') + ': ' + task.title + (res?.recurring ? ' · ' + tr('repeat_rolled') : ''),
      res?.undo || (() => uncompleteTask(task.id)));
  }
  document.getElementById('overlays')?.querySelector('.ov-sheet')?.remove();
}

/* quick set chips row: estimate + priority + kind */function quickSetSection(task) {
  const rebuild = () => { document.querySelector('.ov-sheet')?.remove(); openDetail(task.id); };
  const est = h('div', { class: 'chips-row' });
  for (const m of [5, 10, 15, 25, 45, 60]) {
    est.append(h('button', { class: 'pick num' + (task.estimate === m ? ' on' : ''), onclick: () => {
      task.estimate = task.estimate === m ? null : m; commit(tt => !!tt.tasks); rebuild();
    } }, N(m) + tr('_min')));
  }
  const pr = h('div', { class: 'chips-row', style: 'margin-top:8px' });
  for (const [k, P] of Object.entries(PRIORITY)) {
    pr.append(h('button', { class: 'pick num' + (task.priority === k ? ' on' : ''), style: task.priority === k ? `color:${P.color};border-color:${P.color}` : '', onclick: () => {
      task.priority = k; commit(tt => !!tt.tasks); rebuild();
    } }, P.flag || P.emoji));
  }
  const kd = h('div', { class: 'chips-row', style: 'margin-top:8px' });
  for (const [k, lk] of [['action', 'kind_action'], ['decision', 'kind_decision'], ['project', 'kind_project']]) {
    kd.append(h('button', { class: 'pick' + (task.kind === k ? ' on' : ''), onclick: () => { task.kind = k; commit(tt => !!tt.tasks); rebuild(); } }, tr(lk)));
  }
  return h('div', { class: 'detail-sec' },
    h('div', { class: 'detail-label' }, tr('estimate')), est,
    h('div', { class: 'detail-label', style: 'margin-top:12px' }, tr('priority')), pr,
    h('div', { class: 'detail-label', style: 'margin-top:12px' }, tr('kind')), kd,
  );
}

/* distinct commitments: due / planned start / estimate / actual / reminders */
function commitSection(task) {
  /* stored dates are UTC instants (or plain calendar days) — always show them
     as the user's local wall-clock date/time */
  const fmt = dd => dd
    ? N(fmtDate(parseISO(dayKey(dd)), {})) + (hasTimeOfDay(dd) ? ' ' + N(isoTime(new Date(dd))) : '')
    : '—';
  const row = (label, value) => h('div', { style: 'display:flex;justify-content:space-between;gap:8px;padding:5px 0;font-size:14px' },
    h('span', { style: 'color:var(--text-muted)' }, label),
    h('span', { class: 'num', style: 'font-weight:600' }, String(value)));
  return h('div', { class: 'detail-sec' },
    h('div', { class: 'detail-label' }, tr('commitments')),
    row(tr('due'), fmt(task.dueDate) + (task.recurrence ? ' ⟳ ' + tr('repeat_' + task.recurrence) : '')),
    row(tr('planned_start'), fmt(task.plannedStart)),
    row(tr('estimate'), task.estimate ? N(task.estimate) + tr('_min') : '—'),
    row(tr('actual'), task.actual != null ? N(task.actual) + tr('_min') : '—'),
    (task.reminder?.length || task.reminders?.length)
      ? row(tr('reminders'), N((task.reminder || task.reminders).length)) : null,
  );
}

function dpSection(task) {
  const rebuild = () => { document.querySelector('.ov-sheet')?.remove(); openDetail(task.id); };
  const dop = h('div', { class: 'chips-row' });
  for (const [k, emo] of Object.entries(DOPAMINE)) {
    dop.append(h('button', { class: 'pick' + (task.dopamineType === k ? ' on' : ''), title: tr('dop_' + k), onclick: () => {
      task.dopamineType = task.dopamineType === k ? null : k; commit(tt => !!tt.tasks); rebuild();
    } }, emo));
  }
  const pre = h('div', { class: 'chips-row', style: 'margin-inline-start:8px' });
  for (const [k, emo] of Object.entries(PRESSURE)) {
    pre.append(h('button', { class: 'pick' + (task.pressureType === k ? ' on' : ''), title: tr('pre_' + k), onclick: () => {
      task.pressureType = task.pressureType === k ? null : k; commit(tt => !!tt.tasks); rebuild();
    } }, emo));
  }
  return h('div', { class: 'detail-sec' },
    h('div', { class: 'detail-label' }, tr('dopamine_pressure')),
    h('div', { style: 'display:flex' }, dop, pre),
  );
}

/* mini steps — the "first step" checklist (§5.4 subtasks) */
function stepsSection(task, body) {
  const wrap = h('div', { class: 'detail-sec' });
  const list = h('div', {});
  const renderSteps = () => {
    list.innerHTML = '';
    task.subtasks.forEach((st, i) => {
      list.append(h('div', { class: 'step-row' },
        h('button', { class: 't-tick' + (st.done ? ' on' : ''), style: 'width:26px;height:26px', 'aria-label': tr('complete'),
          onclick: () => { st.done = !st.done; commit(tt => !!tt.tasks); renderSteps(); } }, st.done ? sv(icons.check, 10) : ''),
        h('input', { type: 'text', value: st.title, 'aria-label': tr('subtasks'),
          onchange: e => { st.title = e.target.value.trim(); commit(tt => !!tt.tasks); },
          onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } },
          style: 'padding:2px 8px;min-height:36px' }),
        h('button', { class: 'btn-icon', style: 'width:32px;height:32px;color:var(--text-muted)', 'aria-label': tr('delete'),
          onclick: () => { task.subtasks.splice(i, 1); commit(tt => !!tt.tasks); renderSteps(); } }, sv(icons.close, 14)),
      ));
    });
  };
  renderSteps();
  wrap.append(h('div', { class: 'detail-label' }, tr('first_step_plural')), list);
  body.append(wrap);
}
function addMiniStep(task) {
  /* a real sheet, and the detail view is rebuilt so the new step is visible */
  const inp = h('input', { type: 'text', placeholder: tr('first_step_ph'), 'aria-label': tr('first_step') });
  const sh = sheet(tr('first_step'), h('div', {},
    inp,
    h('button', { class: 'pick on', style: 'width:100%;margin-top:10px;min-height:46px', onclick: () => {
      const v = inp.value.trim();
      if (v) {
        task.subtasks.push({ id: Math.random().toString(36).slice(2), title: v, done: false });
        task.modifiedAt = Date.now();
        commit(tt => !!tt.tasks);
      }
      sh.close();
      rebuildDetail(task.id);
    } }, tr('save')),
  ));
}
/* re-open the detail sheet in place (used after structural changes) */
function rebuildDetail(id) {
  document.querySelector('.ov-sheet')?.remove();
  openDetail(id);
}

function notesSection(task) {
  const ta = h('textarea', { 'aria-label': tr('notes'), style: 'min-height:80px' });
  ta.value = task.notes || '';
  ta.addEventListener('change', () => { task.notes = ta.value; task.modifiedAt = Date.now(); commit(tt => !!tt.tasks); });
  return h('div', { class: 'detail-sec' }, h('div', { class: 'detail-label' }, tr('notes')), ta);
}

/* --- decision helper (§5.8): deciding is executive work, so it is a first-
       class action, with the cost of deciding made visible --- */
function openDecision(task, closeSheet) {
  const d = task.decision || (task.decision = { pros: '', cons: '', options: '', by: null });
  const field = (labelKey, key) => {
    const ta = h('textarea', { rows: 2, 'aria-label': tr(labelKey), placeholder: tr(labelKey) });
    ta.value = d[key] || '';
    ta.addEventListener('change', () => { d[key] = ta.value; commit(tt => !!tt.tasks); });
    return h('div', { style: 'display:grid;gap:4px' }, h('div', { class: 'detail-label' }, tr(labelKey)), ta);
  };
  const by = h('input', { type: 'datetime-local', 'aria-label': tr('decide_by') });
  if (d.by) { try { const bd = new Date(d.by); by.value = iso(bd) + 'T' + isoTime(bd); } catch (e) {} }
  by.addEventListener('change', () => { d.by = by.value ? new Date(by.value).toISOString() : null; commit(tt => !!tt.tasks); });

  closeSheet();
  const sh = sheet('🧭 ' + tr('decide'), h('div', { style: 'display:grid;gap:10px' },
    h('p', { style: 'margin:0;font-size:13px;color:var(--text-muted)' }, tr('deciding_is_work')),
    h('div', { style: 'font-weight:700' }, task.title),
    field('decision_options', 'options'),
    field('decision_pros', 'pros'),
    field('decision_cons', 'cons'),
    h('div', { style: 'display:grid;gap:4px' }, h('div', { class: 'detail-label' }, tr('decide_by')), by),
    h('button', { class: 'pick on', style: 'min-height:48px', onclick: () => {
      const res = completeTask(task.id);
      sh.close();
      snackbar(tr('decision_made') + ': ' + task.title + (res?.recurring ? ' · ' + tr('repeat_rolled') : ''),
        res?.undo || (() => uncompleteTask(task.id)));
      document.dispatchEvent(new Event('rerender'));
    } }, '✅ ' + tr('decide_now')),
    h('button', { class: 'pick', style: 'min-height:46px', onclick: () => { closeSheet(); sh.close(); } }, tr('skip')),
  ));
}

function actionsSection(task, closeSheet) {
  const acts = h('div', { class: 'detail-sec', style: 'display:grid;gap:8px' });
  const btn = (label, fn, primary) => h('button', { class: 'pick' + (primary ? ' on' : ''), style: 'min-height:46px;' + (primary ? '' : 'border-style:solid'), onclick: fn }, label);
  acts.append(btn('▶ ' + tr('start_timer'), () => { startFocus(task); closeSheet(); }, true));
  acts.append(btn(tr('start_no_timer'), () => { startFocus(task, { noTimer: true }); closeSheet(); }));
  if (task.kind === 'decision') acts.append(btn('🧭 ' + tr('decide'), () => openDecision(task, closeSheet)));
  if (task.status === 'done') acts.append(btn(tr('undo') + ' ' + tr('done'), () => { uncompleteTask(task.id); closeSheet(); }));
  else acts.append(btn('✓ ' + tr('complete'), () => { completeTask(task.id); announce(tr('done') + '.'); closeSheet(); }));
  acts.append(btn('🗑 ' + tr('delete'), () => {
    if (deleteTask(task.id)) { commit(tt => !!tt.tasks); closeSheet(); }
  }));
  return acts;
}
