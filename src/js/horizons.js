/* ============================================================
   TicTic — horizon math (pure)

   Why this module exists
     The Today view used to decide "is this row overdue?" and "is
     this row in the horizon bucket?" with two independent date
     predicates. They disagreed about past-due work
       · overdue group:  due <  today
       · today bucket:   due <= today      ← the same task again
     so every overdue task was rendered twice (44 duplicate rows
     in the seeded data). One classifier returning exactly one
     label makes that disagreement impossible by construction,
     and living outside the DOM lets tools/check-horizons.mjs
     prove the invariants on stock Node.

   Labels
     'overdue'  shown in the overdue group (never anywhere else)
     'bucket'   shown in the horizon's own list
     null       not part of this horizon
   ============================================================ */
import { dayKey, iso } from './i18n.js';

export const HORIZON_IDS = ['today', 'tomorrow', 'this_week', 'next7', 'inbox'];

/* today's local calendar day, as 'YYYY-MM-DD' */
export function todayKey(now = new Date()) { return iso(now); }

/* shift a 'YYYY-MM-DD' key by whole days (pure date arithmetic: UTC math on a
   date-only key cannot drift across a DST boundary) */
export function dayShift(key, days) {
  const [y, m, d] = String(key).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/* the task's local calendar day, or null when it has no due date */
export function dueKeyOf(task) {
  if (!task || !task.dueDate) return null;
  return dayKey(task.dueDate);
}

/* where a task belongs in the given horizon — exactly one label */
export function groupOf(task, horizon, today = todayKey()) {
  if (!task || task.status !== 'todo' || task.noise || task.dropped) return null;
  const due = dueKeyOf(task);

  /* past-due work is owned by the overdue group on every horizon that shows
     it (the inbox is undated capture and never shows due dates at all) */
  if (horizon !== 'inbox' && due && due < today) return 'overdue';

  return inBucket(horizon, due, today) ? 'bucket' : null;
}

/* the horizon's own list, with the overdue set already claimed above */
export function inBucket(horizon, due, today = todayKey()) {
  const tomorrow = dayShift(today, 1);
  const in7 = dayShift(today, 7);
  switch (horizon) {
    case 'today':     return !due || due === today;          /* past-due lives in the overdue group */
    case 'tomorrow':  return due === tomorrow;
    case 'this_week': return !!due && due >= today && due <= in7;
    case 'next7':     return !!due && due >= tomorrow && due <= in7;
    case 'inbox':     return !due;                           /* undated capture only */
    default:          return true;
  }
}
