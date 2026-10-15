/* ============================================================
   TicTic ADHD — Focus / Pomodoro (§5.5, full)
   Timer optional. Ring progress, voice cues at 50%/75%/5min,
   drift counter, pause/resume, +5, resume cue after
   interruption (visibilitychange), post-run calibration.
   ============================================================ */
import { S, commit, byId, persist, upsertTask } from './store.js';
import { tr, N } from './i18n.js';
import { h, sv, icons, announce, confetti, levelProgress } from './ui.js';
import { sfx, say } from './sound.js';
import { sheet, snackbar } from './components.js';

let overlayEl = null, tickHandle = null, escHandler = null;

export function startFocus(task, { noTimer = false } = {}) {
  if (!task || S.activeSession) return;
  S.activeSession = {
    taskId: task.id, title: task.title, estimate: task.estimate || null,
    startedAt: Date.now(), elapsedBeforePause: 0, lastResumeAt: Date.now(),
    paused: false, drift: 0, noTimer,
    targetMinutes: noTimer ? null : (task.estimate || 25),
    cue50: false, cue75: false, cue5: false, cues: [],
  };
  persist();
  renderOverlay();
  if (task.id && byId(task.id)) {
    const t = byId(task.id);
    t.activity = t.activity || [];
    t.activity.push({ kind: 'focus-start', at: Date.now() });
    t.modifiedAt = Date.now(); commit(tt => !!tt.tasks);
  }
  sfx.start();
}

function elapsedMs() {
  const s = S.activeSession; if (!s) return 0;
  return s.elapsedBeforePause + (s.paused ? 0 : Date.now() - s.lastResumeAt);
}
function elapsedMin() { return elapsedMs() / 60000; }
function secondsText() {
  const s = Math.floor(elapsedMs() / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function renderOverlay() {
  closeOverlay();
  const root = document.getElementById('overlays');
  overlayEl = h('div', { class: 'focus-ov', role: 'dialog', 'aria-label': tr('focus') });
  const s = S.activeSession;
  const mini = byId(s.taskId)?.subtasks || [];

  /* SVG ring */
  const R = 54, C = 2 * Math.PI * R;
  const ring = h('svg', { viewBox: '0 0 120 120', width: '200', height: '200', class: 'fo-ring' });
  ring.append(h('circle', { cx: 60, cy: 60, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 8 }));
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  arc.setAttribute('cx', 60); arc.setAttribute('cy', 60); arc.setAttribute('r', R);
  arc.setAttribute('fill', 'none'); arc.setAttribute('stroke', 'var(--accent)');
  arc.setAttribute('stroke-width', 8); arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', String(C)); arc.setAttribute('stroke-dashoffset', String(C));
  arc.setAttribute('transform', 'rotate(-90 60 60)');
  ring.append(arc);

  const timerEl = h('div', { class: 'fo-timer num', id: 'fo-timer' }, secondsText());

  overlayEl.append(
    h('div', { class: 'fo-task' }, s.title),
    h('div', { style: 'position:relative' }, ring, h('div', { class: 'fo-center' }, timerEl)),
    h('div', { class: 'fo-est num' }, s.noTimer ? tr('no_timer_running') : tr('estimate') + ': ' + N(Math.max(0, Math.ceil(s.targetMinutes - elapsedMin()))) + tr('_min') + ' ' + tr('remaining')),
    mini.length ? h('div', { style: 'display:flex;flex-direction:column;gap:4px;max-width:420px;width:90%' },
      ...mini.map(st => h('button', { class: 'pick', style: 'text-align:start', onclick: e => {
        st.done = !st.done; commit(tt => !!tt.tasks);
        e.currentTarget.style.textDecoration = st.done ? 'line-through' : '';
      } }, (st.done ? '☑ ' : '☐ ') + st.title))) : h('span'),
    h('div', { class: 'fo-btns' },
      h('button', { class: 'pick on', style: 'min-height:50px', id: 'fo-pause', onclick: togglePause }, s.paused ? '▶ ' + tr('resume') : '⏸ ' + tr('pause')),
      s.noTimer ? null : h('button', { class: 'pick', style: 'min-height:50px', onclick: addFive }, '+5'),
      h('button', { class: 'pick', style: 'min-height:50px', onclick: logDrift }, '🌀 ' + tr('drift') + ': ' + N(s.drift)),
      h('button', { class: 'pick', style: 'min-height:50px;border-style:solid', onclick: endSession }, '✓ ' + tr('finish')),
    ),
  );
  root.append(overlayEl);

  /* keyboard: Esc pauses (never silently discards a running session) */
  overlayEl.tabIndex = -1;
  overlayEl.focus();
  escHandler = e => { if (e.key === 'Escape') { e.preventDefault(); togglePause(); } };
  document.addEventListener('keydown', escHandler);

  tickHandle = setInterval(() => {
    const el = document.getElementById('fo-timer');
    if (!el) return;
    el.textContent = secondsText();
    if (!s.noTimer) {
      const frac = Math.min(1, elapsedMin() / s.targetMinutes);
      arc.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
    }
    checkCues();
    updateTitle();
  }, 250);
}

function updateTitle() {
  const s = S.activeSession; if (!s) return;
  document.title = secondsText() + ' · ' + (s.title || 'TicTic');
}

function togglePause() {
  const s = S.activeSession; if (!s) return;
  if (!s.paused) { s.elapsedBeforePause += Date.now() - s.lastResumeAt; s.paused = true; }
  else { s.lastResumeAt = Date.now(); s.paused = false; }
  persist(); renderOverlay();
  announce(s.paused ? tr('pause') : tr('resume'));
}
function addFive() {
  const s = S.activeSession; if (!s || s.noTimer) return;
  s.targetMinutes += 5; persist(); renderOverlay();
}
function logDrift() {
  const s = S.activeSession; if (!s) return;
  s.drift++; persist(); renderOverlay(); sfx.drift();
  announce(tr('drift_note'));
}
function checkCues() {
  const s = S.activeSession; if (!s) return;
  const m = elapsedMin();
  if (!s.noTimer) {
    if (!s.cue50 && m >= s.targetMinutes * .5) { s.cue50 = true; say(tr('cue_50')); sfx.complete(); }
    if (!s.cue75 && m >= s.targetMinutes * .75) { s.cue75 = true; say(tr('cue_75')); }
    if (s.targetMinutes > 5 && !s.cue5 && m >= s.targetMinutes - 5) { s.cue5 = true; say(tr('cue_5_left')); }
    if (m >= s.targetMinutes) { say(tr('time_up')); endSession(); return; }
  }
}

/* interruption: record + resume cue */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && S.activeSession) {
    const s = S.activeSession;
    s.interruptedAt = Date.now();
    s.elapsedBeforePause += 0; /* keep running unless paused */
    localStorage.setItem('tictic.resumeCue', JSON.stringify({ taskId: s.taskId, title: s.title, at: Date.now() }));
  }
  if (document.visibilityState === 'visible' && S.activeSession) {
    sfx.start();
  }
});
window.addEventListener('load', () => {
  const cue = localStorage.getItem('tictic.resumeCue');
  if (cue && !S.activeSession) {
    try {
      const { title, at } = JSON.parse(cue);
      if (Date.now() - at < 8 * 3600000) showResumeCue(title);
      else localStorage.removeItem('tictic.resumeCue');
    } catch (e) {}
  }
});
function showResumeCue(title) {
  const bar = h('div', { class: 'resume-cue', role: 'status' },
    '🔁 ', h('span', { style: 'flex:1' }, tr('resume_cue2', { x: title })),
    h('button', { class: 'snack-undo', onclick: () => { bar.remove(); const t = S.tasks.find(x => x.title === title); if (t) startFocus(t); localStorage.removeItem('tictic.resumeCue'); } }, tr('resume')),
    h('button', { class: 'snack-undo', onclick: () => { bar.remove(); localStorage.removeItem('tictic.resumeCue'); } }, tr('dismiss')),
  );
  document.getElementById('overlays').append(bar);
}

function endSession() {
  const s = S.activeSession; if (!s) return;
  const mins = Math.max(0, Math.round(elapsedMin()));
  const task = byId(s.taskId);
  if (task && task.id) {
    task.actual = (task.actual || 0) + mins;
    task.modifiedAt = Date.now();
    task.activity = task.activity || [];
    task.activity.push({ kind: 'focus-end', minutes: mins, drift: s.drift, at: Date.now() });
  }
  /* hyperfocus blocks started from Projects feed that project's progress */
  if (String(s.taskId).startsWith('proj-')) {
    const p = (S.projects || []).find(x => 'proj-' + x.id === s.taskId);
    if (p) p.consumedHours = Math.round(((p.consumedHours || 0) + mins / 60) * 10) / 10;
  }
  S.xp += 5 + Math.min(30, mins);
  S.driftCounts[s.taskId] = (S.driftCounts[s.taskId] || 0) + s.drift;
  S.postSessions.push({ taskId: s.taskId, title: s.title, minutes: mins, drift: s.drift, at: Date.now() });
  S.activeSession = null; persist();
  closeOverlay(); document.title = 'TicTic ADHD';
  commit(tt => !!tt.tasks);
  confetti(); sfx.complete();
  /* lets multi-step flows chain to the next step (see flows.js) */
  document.dispatchEvent(new CustomEvent('tictic:session-end', { detail: { taskId: s.taskId, minutes: mins } }));
  postRunCalibrate(task, mins);
}

function postRunCalibrate(task, mins) {
  const body = h('div', {});
  body.append(
    h('p', { style: 'font-weight:700;margin:0 0 8px' }, tr('post_run_q')),
    h('div', { class: 'chips-row' },
      h('button', { class: 'pick on', onclick: () => done('yes') }, tr('cal_ok')),
      h('button', { class: 'pick', onclick: () => done('drifted') }, tr('cal_drifted')),
      h('button', { class: 'pick', onclick: () => done('skip') }, tr('skip'))),
    h('p', { class: 'num', style: 'color:var(--text-muted);font-size:13px;margin-top:10px' }, tr('cal_logged', { m: N(mins) })),
  );
  const { close } = sheet(tr('post_run_title'), body);
  function done(kind) {
    const last = S.postSessions[S.postSessions.length - 1];
    if (last) last.kind = kind;
    persist(); commit(tt => !!tt.tasks); close();
  }
}
function closeOverlay() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
}
