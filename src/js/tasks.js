/* ============================================================
   TicTic ADHD — task domain helpers
   ============================================================ */
import { S, commit, persist, byId, upsertTask } from './store.js';
import { parseISO, dayKey, shiftDay, hasTimeOfDay } from './i18n.js';

export function effectiveListId(t) { return t.listId || 'inbox'; }

/* Horizon membership lives in horizons.js — one classifier, one convention.
   (A second copy here is how the Today view ended up rendering every overdue
   task twice: this version said `due <= today` while the view's own overdue
   group said `due < today`. Never reintroduce a parallel predicate.) */
export function doneInView(t, h) {
  if (t.status !== 'done') return false;
  if (!t.dueDate) return h === 'inbox' || h === 'all';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = parseISO(dayKey(t.dueDate));
  if (h === 'today') return due <= today;
  return due <= today && due >= new Date(today.getTime() - 7 * 86400000);
}

/* --- completion (§5.2, §4.9): confetti + chime + 5s undo.
       A recurring task rolls to its next date and stays open, like
       TickTick — the completion is logged in `completions`. --- */
export function completeTask(id) {
  const t = byId(id); if (!t || t.status === 'done') return null;
  const snapshot = JSON.parse(JSON.stringify(t));
  t.completions = t.completions || [];
  t.completions.push({ at: Date.now(), dueDate: t.dueDate || null });
  awardXp(t);
  const recurring = !!(t.recurrence && t.dueDate);
  if (recurring) {
    advanceRecurrence(t);            /* sets status back to todo + next dueDate */
    t.lastDoneAt = Date.now();
  } else {
    t.status = 'done'; t.progress = 100;
  }
  t.modifiedAt = Date.now();
  commit(tt => !!tt.tasks);
  return { recurring, undo: () => revert(snapshot) };
}
function revert(snapshot) { upsertTask(snapshot); }

export function uncompleteTask(id) {
  const t = byId(id); if (!t) return;
  t.status = 'todo'; t.progress = 0; t.modifiedAt = Date.now();
  t.completions = (t.completions || []).slice(0, -1);  /* the last one is being undone */
  commit(tt => !!tt.tasks);
}

/* --- XP (§40): base 10 + estimate-derived, × dopamine factor --- */
export function awardXp(t) {
  const base = 10 + Math.min(20, Math.round((t.estimate || 0) / 15) * 2);
  const factor = t.dopamineType === 'dislike' ? 2 : t.dopamineType === 'soso' ? 1.3 : 1;
  S.xp += Math.round(base * factor);
  persist();
}

/* --- recurrence: advance dueDate after completion (§4.9) --- */
export function advanceRecurrence(t) {
  if (!t.recurrence || !t.dueDate) return false;
  const map = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
  const days = typeof map[t.recurrence] === 'number' ? map[t.recurrence] : null;
  if (days == null) return false;
  /* step forward past today, keeping the original time of day and the
     stored shape (calendar day vs timed) */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = parseISO(dayKey(t.dueDate));
  const next = new Date(start);
  do { next.setDate(next.getDate() + days); } while (next < today);
  t.dueDate = shiftDay(t.dueDate, Math.round((next - start) / 86400000));
  t.status = 'todo'; t.progress = 0;
  return true;
}

/* order key for time-sorted rows */
export function sortKey(t) {
  const P = { frog: 0, high: 1, med: 2, low: 3, none: 4 };
  const key = dayKey(t.dueDate);
  const stamp = key ? parseISO(key).getTime() + (hasTimeOfDay(t.dueDate) ? new Date(t.dueDate).getHours() * 3600000 : 0) : 9e15;
  return (P[t.priority] ?? 9) * 1e12 + stamp;
}
