/* ============================================================
   TicTic ADHD — Noise Harbor (§noise in draft): park "this is
   noise" tasks away without deleting. Restore anytime.
   ============================================================ */
import { S, commit, persist, makeTask } from './store.js';
import { tr, N, dayKey } from './i18n.js';
import { sheet, snackbar } from './components.js';
import { h } from './ui.js';
import { artHarbor } from './art.js';

export function openNoiseHarbor() {
  const items = S.tasks.filter(t => t.noise);
  const body = h('div', {});
  body.append(h('p', { class: 'num', style: 'color:var(--text-muted);font-size:13px;margin:0 0 8px' },
    N(items.length) + ' ' + tr('parked_items')));
  if (!items.length) {
    body.append(h('div', { class: 'state-card', style: 'box-shadow:none;background:transparent' },
      artHarbor(), h('h3', {}, tr('harbor_empty'))));
  }
  for (const it of items) {
    body.append(h('div', { style: 'display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--line)' },
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'font-weight:700' }, it.title),
        it.notes ? h('div', { style: 'font-size:12px;color:var(--text-muted);white-space:pre-wrap' }, it.notes) : null),
      h('button', { class: 'pick on', onclick: () => unnoise(it) }, '↩ ' + tr('unpark')),
    ));
  }
  sheet(tr('noise_harbor'), body);
}
function unnoise(it) {
  it.noise = false; it.dueDate = dayKey(new Date()); it.modifiedAt = Date.now();
  persist(); commit();
  document.querySelector('.ov-sheet')?.remove();
  snackbar(tr('unpark_done') + ': ' + it.title, () => {
    it.noise = true; it.dueDate = null; persist(); commit();
    document.dispatchEvent(new Event('rerender'));
  });
}
