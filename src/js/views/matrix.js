/* ============================================================
   TicTic ADHD — Eisenhower Matrix (§5.7)
   4 quadrants. Moving = set priority + due window. Drag on
   desktop + keyboard alternative (arrow keys on focused task).
   Rules (what counts urgent) live in Settings later.
   ============================================================ */
import { S, commit, persist } from '../store.js';
import { tr, N, dayKey, parseISO } from '../i18n.js';
import { h, announce } from '../ui.js';
import { openDetail } from '../detail.js';

/* ids are lowercase on purpose — quadrantOf() and every lookup compare them raw */
const QUADRANTS = [
  { id: 'iu', labelKey: 'q_iu', priority: 'high' },   /* important+urgent */
  { id: 'inu', labelKey: 'q_inu', priority: 'med' },  /* important, not urgent */
  { id: 'niu', labelKey: 'q_niu', priority: 'low' },  /* not important, urgent */
  { id: 'ninu', labelKey: 'q_ninu', priority: 'none' },
];

function urgent(t) {
  if (!t.dueDate) return false;
  const due = parseISO(dayKey(t.dueDate)); const today = new Date(); today.setHours(0, 0, 0, 0);
  const in3 = new Date(today); in3.setDate(in3.getDate() + 3);
  return due <= in3;
}
function important(t) { return ['frog', 'high', 'med'].includes(t.priority); }

function quadrantOf(t) {
  const im = important(t), ur = urgent(t);
  return im && ur ? 'iu' : im ? 'inu' : ur ? 'niu' : 'ninu';
}

function rerender() { document.dispatchEvent(new Event('rerender')); }
/* moving a task = set priority + due window (both directions are symmetric) */
function moveTo(t, q) {
  t.priority = q.priority;
  const urgentQuadrants = q.id === 'iu' || q.id === 'niu';
  const today = new Date(); today.setHours(17, 0, 0, 0);
  if (urgentQuadrants && (!t.dueDate || parseISO(dayKey(t.dueDate)) > today)) t.dueDate = today.toISOString();
  persist(); commit(); rerender();
  announce(tr('moved') + ' — ' + tr(q.labelKey));
}

export function renderMatrix() {
  const wrap = h('div', {});
  const grid = h('div', { class: 'matrix-grid' });
  const open = S.tasks.filter(t => t.status === 'todo' && !t.noise && !t.dropped && !t.parentId);
  for (const q of QUADRANTS) {
    const items = open.filter(t => quadrantOf(t) === q.id);
    const cell = h('div', { class: 'qcard', 'data-q': q.id,
      onDragover: e => { e.preventDefault(); cell.classList.add('drag-over'); },
      onDragleave: () => cell.classList.remove('drag-over'),
      onDrop: e => { e.preventDefault(); cell.classList.remove('drag-over'); const id = e.dataTransfer.getData('text/plain'); dropTask(id, q); } },
      h('div', { class: 'q-head' }, tr(q.labelKey), h('span', { class: 'chip num' }, N(items.length))),
      ...items.slice(0, 8).map(t => h('button', { class: 'q-item', draggable: 'true', tabindex: '0',
        onDragstart: e => e.dataTransfer.setData('text/plain', t.id),
        onKeydown: e => keyMove(e, t, q),
        onclick: () => openDetail(t.id) },
        h('span', {}, t.title),
        h('span', { class: 'chip num', style: 'font-size:10px' }, qWhy(t, q)),
      )),
    );
    grid.append(cell);
  }
  wrap.append(h('p', { style: 'font-size:12px;color:var(--text-muted)' }, tr('matrix_kbd_hint')));
  wrap.append(grid);
  return wrap;
}

function qWhy(t, q) {
  const bits = [];
  const im = IMPORTANT_LABELS[t.priority];
  if (im) bits.push(im);
  if (urgent(t)) bits.push(tr('urgent'));
  return bits.join(' · ') || tr('calm');
}
const IMPORTANT_LABELS = { frog: '🐸', high: '🔴', med: '🟠' };

function dropTask(id, q) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  moveTo(t, q);
}
/* keyboard: arrows move the task between quadrants */
function keyMove(e, t, q) {
  const order = QUADRANTS.map(x => x.id);
  let idx = order.indexOf(q.id);
  if (e.key === 'ArrowRight') idx = Math.min(order.length - 1, idx + 1);
  else if (e.key === 'ArrowLeft') idx = Math.max(0, idx - 1);
  else return;
  e.preventDefault();
  const tq = QUADRANTS.find(x => x.id === order[idx]);
  if (!tq || tq.id === q.id) return;
  moveTo(t, tq);
}
