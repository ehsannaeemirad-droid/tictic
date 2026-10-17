/* ============================================================
   TicTic ADHD — Weekly timetable (user-provided)
   The user's real commitments: school, wife pickup, classes.
   These are fixed busy-window commitments — a separate concept
   from tasks (design principle: separate commitments).
   Shown in Plan view; respect evening/morning shift toggle.

   Evidence: user-supplied dictation, October 2026. TODO: verify
   exact weekday name mapping (Iranian week starts Saturday).
   ============================================================ */
import { S, commit, persist } from './store.js';
import { tr, N } from './i18n.js';
import { h } from './ui.js';

/* shift enumeration 0=Saturday … 6=Friday (Iranian week) */
export const DEFAULT_TIMETABLE = {
  morning: {
    sat: [['07:10', '07:30', 'حرکت از خانه به مدرسه'], ['07:30', '12:10', 'مدرسه'], ['12:30', '13:30', 'استراحت در خانه'], ['13:45', '14:10', 'بردن همسر از محل کار']],
    sun: [['18:30', '19:30', 'کلاس لیلی'], ['20:00', '21:00', 'کلاس ندال']],
    mon: [['07:30', '12:10', 'مدرسه'], ['13:45', '14:10', 'بردن همسر از محل کار'], ['17:00', '18:00', 'کلاس تارنوم']],
    tue: [['07:30', '12:10', 'مدرسه'], ['13:45', '14:10', 'بردن همسر از محل کار']],
    wed: [['13:45', '14:10', 'بردن همسر از محل کار'], ['18:30', '19:30', 'کلاس لیلی'], ['20:00', '21:00', 'کلاس ندال']],
    thu: [['17:00', '18:00', 'کلاس تارنوم']],
    fri: [],
  },
  evening: {
    sat: [['12:40', '13:00', 'بریم مدرسه'], ['13:00', '17:10', 'مدرسه شیفت عصر']],
    sun: [['18:30', '19:30', 'کلاس لیلی'], ['20:00', '21:00', 'کلاس ندال']],
    mon: [['07:30', '09:00', 'مدرسه صبح'], ['12:40', '13:00', 'بریم مدرسه'], ['13:00', '17:10', 'مدرسه شیفت عصر'], ['20:00', '21:00', 'کلاس تارنم']],
    tue: [['07:30', '12:10', 'مدرسه'], ['13:45', '14:10', 'بر سراغ همسر']],
    wed: [['18:30', '19:30', 'کلاس لیلی'], ['20:00', '21:00', 'کلاس ندال']],
    thu: [['17:00', '18:00', 'کلاس تارنم']],
    fri: [],
  },
};

const DAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const DAYS_EN = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function currentShift() { return S.timetable?.shift || 'morning'; }

export function timetableSection() {
  if (!S.timetable) S.timetable = { shift: 'morning', data: DEFAULT_TIMETABLE };
  const shift = currentShift();
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'sec-h', style: 'margin-top:24px' }, '🕐 ' + tr('timetable')));

  const shiftToggle = h('div', { class: 'chips-row', style: 'margin-bottom:10px' });
  for (const [k, label] of [['morning', tr('shift_morning')], ['evening', tr('shift_evening')]]) {
    shiftToggle.append(h('button', { class: 'pick' + (shift === k ? ' on' : ''), onclick: () => {
      S.timetable.shift = k; persist(); commit(); document.dispatchEvent(new Event('rerender'));
    } }, label));
  }
  wrap.append(shiftToggle);

  /* Iranian week (Saturday first) — today highlighted, whole week visible
     so the shape of the week is legible at a glance. */
  const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
  const todayKey = WEEK[(new Date().getDay() + 1) % 7]; /* getDay: 0=Sun → sat=0 */
  const names = (S.settings.lang === 'fa' ? DAYS_FA : DAYS_EN);

  const grid = h('div', { class: 'tt-grid' });
  WEEK.forEach((key, i) => {
    const rows = S.timetable.data[shift][key] || [];
    const isToday = key === todayKey;
    const card = h('div', { class: 'card tt-day' + (isToday ? ' today' : '') },
      h('div', { class: 'tt-dayname' }, names[i], isToday ? h('span', { class: 'chip', style: 'margin-inline-start:6px' }, tr('today')) : null),
      rows.length
        ? h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, ...rows.map(([start, end, label]) =>
          h('div', { class: 'tt-row' },
            h('span', { class: 'num tt-time' }, N(start) + '–' + N(end)),
            h('span', { class: 'tt-label' }, label))))
        : h('div', { class: 'tt-free' }, tr('day_free')),
    );
    grid.append(card);
  });
  wrap.append(grid);

  /* today's list, big and tappable, under the grid */
  const todayRows = S.timetable.data[shift][todayKey] || [];
  wrap.append(h('div', { class: 'sec-h', style: 'margin-top:10px' }, '⭐ ' + tr('today')));
  if (!todayRows.length) {
    wrap.append(h('div', { class: 'card', style: 'padding:14px;color:var(--text-muted);text-align:center' }, tr('no_commitments_today')));
  }
  for (const [start, end, label] of todayRows) {
    wrap.append(h('div', { class: 'card', style: 'display:flex;gap:10px;align-items:center;padding:10px 14px;margin:6px 0;border-inline-start:4px solid var(--accent)' },
      h('span', { class: 'chip num', style: 'min-width:110px;justify-content:center' }, N(start) + '–' + N(end)),
      h('span', { style: 'flex:1;font-weight:600' }, label),
      h('span', { style: 'font-size:12px;color:var(--text-muted)' }, tr('fixed_commitment')),
    ));
  }
  return wrap;
}

/* today's commitments for the current shift, as [[start, end, label], …] */
export function todayCommitmentRows() {
  if (!S.timetable) return [];
  const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
  const key = WEEK[(new Date().getDay() + 1) % 7];
  return (S.timetable.data[currentShift()] || {})[key] || [];
}

/* the next commitment still ahead of `nowHM` (`HH:MM`), falling back to the
   last one of the day; null when there is nothing scheduled. Exported so the
   Today card and the Now shortlist read the same pick instead of each
   re-deriving it — the reasoning line must not disagree with the card. */
export function nextCommitment(rows, nowHM) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows.find(([start]) => start >= nowHM) || rows[rows.length - 1] || null;
}

/* compact one-line commitment strip for the Today view */
export function todayCommitmentStrip() {
  if (!S.timetable) return null;
  const rows = todayCommitmentRows();
  const next = nextCommitment(rows, new Date().toTimeString().slice(0, 5));
  if (!next) return null;
  return h('button', { class: 'card', style: 'width:100%;text-align:start;padding:10px 14px;margin-block:8px;display:flex;gap:10px;align-items:center',
    onclick: () => { S.ui.route = 'plan'; commit(() => true); } },
    h('span', {}, '🕐'),
    h('span', { class: 'num chip' }, N(next[0]) + '–' + N(next[1])),
    h('span', { style: 'flex:1;font-weight:600' }, next[2]),
    h('span', { style: 'font-size:12px;color:var(--text-muted)' }, tr('fixed_commitment')),
  );
}
