/* ============================================================
   TicTic ADHD — Quick Add (§4.3): capture first, classify later.
   Title alone saves with Enter. Recognized tokens become EDITABLE
   chips — never silently auto-applied. Post-save prompts skippable.
   ============================================================ */
import { makeTask, S, commit } from './store.js';
import { tr, N, parseISO, dayKey, hasTimeOfDay } from './i18n.js';
import { h, sv, icons } from './ui.js';
import { sheet } from './components.js';
import { parseQuick } from './parse.js';

let qaRoot = null;

export function openQuickAdd() {
  /* the node can be detached by an outside cleanup — rebuild instead of
     silently doing nothing for the rest of the session */
  if (qaRoot && !qaRoot.isConnected) qaRoot = null;
  if (qaRoot) return;
  const root = document.getElementById('overlays');
  qaRoot = h('div', { class: 'qa' });
  const input = h('input', { type: 'text', placeholder: tr('quick_add_ph'), 'aria-label': tr('add_task'), autocomplete: 'off' });
  const chipsRow = h('div', { class: 'qa-chips', style: 'display:none' });
  const micBtn = h('button', { class: 'btn-icon', title: tr('voice'), 'aria-label': tr('voice') }, sv(icons.mic, 18));
  const saveBtn = h('button', { class: 'btn-icon', title: tr('save'), 'aria-label': tr('save'), style: 'color:var(--accent)' }, sv(icons.check, 18));

  const parsed = { title: '', when: null, time: null, tags: [], priority: null, recurrence: null };

  function refreshChips() {
    chipsRow.innerHTML = '';
    const items = [];
    if (parsed.when) items.push({ k: 'when', label: N(fmtChipDate(parsed.when)), clear: () => (parsed.when = null) });
    if (parsed.time) items.push({ k: 'time', label: N(parsed.time), clear: () => (parsed.time = null) });
    if (parsed.priority) items.push({ k: 'priority', label: parsed.priority.toUpperCase(), clear: () => (parsed.priority = null) });
    if (parsed.recurrence) items.push({ k: 'recurrence', label: tr('repeat') + ': ' + parsed.recurrence, clear: () => (parsed.recurrence = null) });
    for (const tg of parsed.tags) items.push({ k: 'tag', label: '#' + tg, clear: () => (parsed.tags = parsed.tags.filter(x => x !== tg)) });
    if (!input.value.trim() && !items.length) { chipsRow.style.display = 'none'; return; }
    chipsRow.style.display = '';
    for (const it of items) {
      chipsRow.append(h('button', { class: 'qa-chip', title: tr('remove'), onclick: () => { it.clear(); refreshChips(); } },
        it.label, h('span', { style: 'opacity:.6' }, '✕')));
    }
  }
  function fmtChipDate(isoStr) {
    const d = parseISO(dayKey(isoStr));
    return d.toLocaleDateString(document.documentElement.lang === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US', { day: 'numeric', month: 'short' });
  }

  input.addEventListener('input', () => {
    const p = parseQuick(input.value);
    parsed.when = p.when; parsed.time = p.time; parsed.tags = p.tags;
    parsed.priority = p.priority; parsed.recurrence = p.recurrence;
    refreshChips();
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  saveBtn.addEventListener('click', save);

  function save() {
    const p = parseQuick(input.value);
    const title = p.title === undefined ? input.value.trim() : (p.title || '').trim() || input.value.trim();
    if (!title) return;
    let dueDate = null;
    if (parsed.when) {
      const w = new Date(parsed.when);
      if (parsed.time) {
        const [hh, mm] = parsed.time.split(':').map(Number);
        dueDate = new Date(w.getFullYear(), w.getMonth(), w.getDate(), hh, mm, 0, 0).toISOString();
      } else dueDate = dayKey(parsed.when);   /* calendar day — timezone-safe */
    }
    const task = makeTask({
      title, dueDate, tags: parsed.tags, priority: parsed.priority || 'none', recurrence: parsed.recurrence,
      listId: S.ui.filterList !== 'all' ? S.ui.filterList : 'inbox',
    });
    S.tasks.push(task);
    commit(tt => !!tt.tasks);
    input.value = ''; parsed.when = parsed.time = parsed.priority = parsed.recurrence = null; parsed.tags = [];
    refreshChips();
    followPrompts(task);
  }

  /* skippable inline prompts after save (§4.3) — one set at a time, so a
     second save cannot stack stale prompts from the first */
  function followPrompts(task) {
    qaRoot.querySelectorAll('.qa-follow,.qa-dismiss').forEach(x => x.remove());
    const f1 = h('button', { class: 'f', onclick: () => { askFirstStep(task); close(); } }, '🧩 ' + tr('add_first_step_prompt'));
    const f2 = h('button', { class: 'f', onclick: () => { askWhenStart(task); close(); } }, '🕒 ' + tr('ask_start_prompt'));
    const follow = h('div', { class: 'qa-follow' }, f1, f2);
    qaRoot.append(follow);
    const dismiss = h('button', { class: 'qa-chip qa-dismiss', style: 'margin-top:8px;width:100%;justify-content:center' , onclick: close }, tr('skip'));
    qaRoot.append(dismiss);
  }
  function askFirstStep(task) {
    const inp = h('input', { type: 'text', placeholder: tr('first_step_ph'), 'aria-label': tr('first_step') });
    /* real sheet handle — never wipe #overlays (that would kill the quick-add bar too) */
    const sh = sheet(tr('add_first_step_prompt'), h('div', {},
      inp,
      h('button', { class: 'pick on', style: 'width:100%;margin-top:10px;min-height:46px', onclick: () => {
        const v = inp.value.trim();
        if (v) { task.subtasks.push({ id: Math.random().toString(36).slice(2), title: v, done: false }); commit(tt => !!tt.tasks); }
        sh.close();
      } }, tr('save')),
    ));
  }
  function askWhenStart(task) {
    scheduleStart(task);
  }
  /* „When will you start?“ — sets plannedStart (and offers to make it the due date) */
  function scheduleStart(task) {
    const when = h('input', { type: 'datetime-local', 'aria-label': tr('ask_start_prompt') });
    const asDue = h('input', { type: 'checkbox', id: 'qa-as-due' });
    const sh = sheet(tr('ask_start_prompt'), h('div', { style: 'display:grid;gap:10px' },
      when,
      h('label', { style: 'display:flex;gap:8px;align-items:center;font-size:13px' }, asDue, tr('due')),
      h('button', { class: 'pick on', style: 'min-height:46px', onclick: () => {
        if (when.value) {
          const plannedAt = new Date(when.value);
          const whenISO = plannedAt.toISOString();
          task.plannedStart = whenISO;
          /* midnight means “that day” — store it as a calendar day, not an instant */
          if (asDue.checked) task.dueDate = hasTimeOfDay(whenISO) ? whenISO : dayKey(plannedAt);
          commit(tt => !!tt.tasks);
        }
        sh.close();
      } }, tr('save')),
    ));
  }
  function close() { if (qaRoot) { qaRoot.remove(); qaRoot = null; } }

  /* voice input (Web Speech API where available) */
  micBtn.addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micBtn.title = tr('voice_unavailable'); return; }
    try {
      const rec = new SR();
      rec.lang = S.settings.lang === 'fa' ? 'fa-IR' : 'en-US';
      rec.onresult = ev => { input.value = ev.results[0][0].transcript; input.dispatchEvent(new Event('input')); input.focus(); };
      rec.start();
    } catch (e) {}
  });

  qaRoot.append(h('div', { class: 'qa-box' }, input, micBtn, saveBtn), chipsRow);
  root.append(qaRoot);
  input.focus();
  return { close };
}

/** the global Esc handler uses this so the bar can always be dismissed */
export function closeQuickAdd() {
  if (qaRoot) { qaRoot.remove(); qaRoot = null; }
}
