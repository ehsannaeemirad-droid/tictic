/* ============================================================
   TicTic ADHD — Countdown (§5.11): significant dates with days
   remaining + per-item reminder toggle.
   ============================================================ */
import { S, commit, persist, uid } from './store.js';
import { tr, N, fmtDate, parseISO, dayKey, iso } from './i18n.js';
import { h } from './ui.js';
import { sheet } from './components.js';

export function renderCountdowns() {
  if (!S.countdowns) S.countdowns = [];
  const wrap = h('div', {});
  wrap.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' },
    h('h2', { style: 'font-size:20px;margin:0' }, tr('countdown')),
    h('button', { class: 'pick on', onclick: cdForm }, '+ ' + tr('new_countdown')),
  ));
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const sorted = [...S.countdowns].sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)));
  for (const cd of sorted) {
    const days = Math.round((parseISO(dayKey(cd.date)) - today0) / 86400000);
    wrap.append(h('div', { class: 'card', style: 'padding:14px;margin-bottom:8px;display:flex;gap:10px;align-items:center' },
      h('div', { style: 'flex:1' },
        h('div', { style: 'font-weight:700' }, cd.name),
        h('div', { class: 'num', style: 'font-size:13px;color:var(--text-muted)' }, N(fmtDate(parseISO(cd.date), { withYear: true }))),
      ),
      h('button', { class: 'pick' + (cd.notify ? ' on' : ''), title: tr('notify_toggle'), onclick: () => { cd.notify = !cd.notify; persist(); commit(); rerender(); } }, '🔔'),
      h('span', { class: 'chip num', style: days < 3 ? 'background:var(--bg-hover);color:var(--text-muted)' : '' }, days >= 0 ? N(days) + ' ' + tr('days') : tr('passed')),
      h('button', { class: 'btn-icon', style: 'width:36px;height:36px;color:var(--danger)', 'aria-label': tr('delete'), onclick: () => {
        S.countdowns = S.countdowns.filter(x => x.id !== cd.id); persist(); commit(); rerender();
      } }, '🗑'),
    ));
  }
  if (!S.countdowns.length) wrap.append(h('div', { class: 'card', style: 'padding:28px;text-align:center;color:var(--text-muted)' }, tr('no_countdowns')));
  return wrap;
}
function rerender() { document.dispatchEvent(new Event('rerender')); }
function cdForm() {
  const name = h('input', { type: 'text', placeholder: tr('countdown_name'), 'aria-label': tr('countdown_name') });
  const date = h('input', { type: 'date' });
  const body = h('div', { style: 'display:grid;gap:10px' }, name, date,
    h('button', { class: 'pick on', style: 'min-height:46px', onclick: () => {
      if (name.value.trim() && date.value) {
        S.countdowns.push({ id: uid(), name: name.value.trim(), date: dayKey(date.value) || iso(new Date()), notify: true });
        persist(); commit(); rerender();
      }
      document.querySelector('.ov-sheet')?.remove();
    } }, tr('save')));
  sheet(tr('new_countdown'), body);
}
