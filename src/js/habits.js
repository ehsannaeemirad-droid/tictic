/* ============================================================
   TicTic ADHD — Habits (§5.10): flexible check-ins, opt-in
   streaks, neutral language ("Resume today", not shame).
   ============================================================ */
import { S, commit, persist, uid } from './store.js';
import { tr, N, iso } from './i18n.js';
import { h } from './ui.js';
import { sheet } from './components.js';

export function renderHabits() {
  if (!S.habits) S.habits = [];
  const wrap = h('div', {});
  wrap.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' },
    h('h2', { style: 'font-size:20px;margin:0' }, tr('habits')),
    h('button', { class: 'pick on', onclick: habitForm }, '+ ' + tr('new_habit')),
  ));

  const today = iso(new Date());
  for (const hb of S.habits) {
    const doneToday = (hb.checkins || []).includes(today);
    const streak = (S.settings.showStreaks && hb.checkins?.length) ? computeStreak(hb) : null;
    wrap.append(h('div', { class: 'card', style: 'padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:center' },
      h('div', { style: 'flex:1' },
        h('div', { style: 'font-weight:700' }, hb.name),
        h('div', { class: 'num', style: 'font-size:12px;color:var(--text-muted)' },
          streak != null ? tr('streak_n', { n: N(streak) }) : N(hb.checkins?.length || 0) + ' ' + tr('checkins_total')),
      ),
      h('button', { class: 'pick' + (doneToday ? ' on' : ''), onclick: () => toggleCheckin(hb) },
        doneToday ? '✓ ' + tr('done') : tr('checkin')),
    ));
  }
  if (!S.habits.length) {
    wrap.append(h('div', { class: 'card', style: 'padding:28px;text-align:center;color:var(--text-muted)' }, tr('no_habits')));
    wrap.append(gallery());
  }
  return wrap;
}
function rerender() { document.dispatchEvent(new Event('rerender')); }
function computeStreak(hb) {
  const set = new Set(hb.checkins || []);
  let n = 0; const d = new Date();
  while (set.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function toggleCheckin(hb) {
  const today = iso(new Date());
  hb.checkins = hb.checkins || [];
  const i = hb.checkins.indexOf(today);
  if (i >= 0) hb.checkins.splice(i, 1); else { hb.checkins.push(today); }
  persist(); commit(); rerender();
}
function habitForm(prefill) {
  const name = h('input', { type: 'text', value: prefill || '', placeholder: tr('habit_name'), 'aria-label': tr('habit_name') });
  const body = h('div', {},
    name,
    h('button', { class: 'pick on', style: 'width:100%;margin-top:10px;min-height:46px', onclick: () => {
      if (name.value.trim()) { S.habits.push({ id: uid(), name: name.value.trim(), checkins: [] }); persist(); commit(); rerender(); }
      document.querySelector('.ov-sheet')?.remove();
    } }, tr('save')),
  );
  sheet(tr('new_habit'), body);
}
/* small starter gallery */
export function gallery() {
  const ideas = ['آب', 'ورزش', 'مطالعه', 'نوشتن روزانه', 'مدیتیشن', 'خواب منظم'];
  return h('div', {}, h('div', { class: 'detail-label' }, tr('ideas')),
    h('div', { class: 'chips-row' }, ...ideas.map(x => h('button', { class: 'pick', onclick: () => habitForm(x) }, x))));
}
