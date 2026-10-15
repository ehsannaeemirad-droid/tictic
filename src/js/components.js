/* ============================================================
   TicTic ADHD — shared components
   sheet(), snackbar (5s undo), tick circle, chip builders
   ============================================================ */
import { h, clear, icons, sv, announce, confetti } from './ui.js';
import { tr, N } from './i18n.js';
import { sfx } from './sound.js';
import { S, persist } from './store.js';

const overlays = () => document.getElementById('overlays');

/* ---- Sheet (bottom sheet on mobile, centered card on desktop) ---- */
export function sheet(title, bodyEl, { onClose } = {}) {
  const root = overlays();
  const opener = document.activeElement;      /* focus goes back where it came from */
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    sh.remove();
    document.removeEventListener('keydown', esc);
    document.removeEventListener('keydown', trap);
    onClose?.();
    if (opener && opener.isConnected) { try { opener.focus(); } catch (e) { /* detached */ } }
  };
  const esc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  const sh = h('div', { class: 'ov-sheet', role: 'dialog', 'aria-modal': 'true', onClick: e => { if (e.target === sh) close(); } },
    h('div', { class: 'ov-inner' },
      h('div', { class: 'ov-head' },
        h('div', { class: 'ov-title' }, title),
        h('button', { class: 'btn-icon', 'aria-label': tr('close'), onclick: close }, sv(icons.close, 18)),
      ),
      bodyEl,
    ),
  );
  root.append(sh);

  /* keep Tab inside the dialog while it is open (the app behind stays put) */
  const trap = e => {
    if (e.key !== 'Tab' || closed) return;
    const focusables = [...sh.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', trap);

  const f = sh.querySelector('input,textarea,select,button'); f?.focus();
  return { close, el: sh };
}

/* ---- Undo snackbar: 5s window (§5.2, §35) ---- */
export function snackbar(msg, undoFn) {
  const root = overlays();
  const bar = h('div', { class: 'snack', role: 'status' },
    h('span', {}, msg),
    h('button', { class: 'snack-undo', onclick: () => { undoFn?.(); bar.remove(); } }, '↩ ' + tr('undo')),
  );
  root.querySelectorAll('.snack').forEach(x => x.remove());
  root.append(bar);
  announce(msg + '. ' + tr('undo') + ' available.');
  setTimeout(() => bar.remove(), 5000);
}

/* ---- confetti + chime on completion (respects reduced motion) ---- */
export function celebrate() { confetti(); sfx.complete(); }

/* ---- tick circle ---- */
export function tickChip(task, onToggle) {
  const done = task.status === 'done';
  if (task.kind === 'decision') {
    return h('button', { class: 't-decide', title: tr('decide'), 'aria-label': tr('decide'), onclick: onToggle, style: 'width:28px;height:28px;border-radius:10px;border:2px dashed var(--priority-frog);background:transparent;color:var(--priority-frog);font-weight:800;flex:none;display:grid;place-items:center;font-size:11px' }, '؟');
  }
  return h('button', {
    class: 't-tick' + (done ? ' on' : ''), 'aria-label': done ? tr('undo') : tr('complete'),
    'aria-pressed': String(done),
    onclick: onToggle,
  }, done ? sv(icons.check, 14) : '');
}

export const PRIORITY = {
  frog: { key: 'pri_frog', color: 'var(--priority-frog)', emoji: '🐸' },
  high: { key: 'pri_high', color: 'var(--priority-high)', flag: '🔴' },
  med: { key: 'pri_med', color: 'var(--priority-med)', flag: '🟠' },
  low: { key: 'pri_low', color: 'var(--priority-low)', flag: '🔵' },
  none: { key: 'pri_none', color: 'var(--priority-none)', flag: '⚪' },
};
export const DOPAMINE = { love: '⚡', soso: '☀', dislike: '☁' };
export const PRESSURE = { out: '🏛', self: '👤' };

export function priChip(p) {
  const P = PRIORITY[p] || PRIORITY.none;
  return h('span', { class: 'pri-chip num', style: `color:${P.color};box-shadow:inset 0 0 0 1px ${P.color}` },
    P.emoji || P.flag || '', ' ', tr(P.key));
}
