/* ============================================================
   TicTic ADHD — Now list (§4.1): a shortlist, not a second list.
   ≤3 items, ONE visible reason each, one action each, and a total
   order so a tie cannot reshuffle the strip between two renders.

   Candidates go through the same predicates as the rows below
   (horizons.visible + horizons.groupOf), so the strip can never
   show a task the list has filtered out — the phantom-row bug it
   had while it scored S.tasks directly.
   ============================================================ */
import { S } from './store.js';
import { parseISO, tr, dayKey, N } from './i18n.js';
import { groupOf, todayKey, visible, overdueDaysOf } from './horizons.js';
import { nextCommitment, todayCommitmentRows } from './timetable.js';

export const NOW_CAP = 3;

export function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }

/* Score every candidate and return the top few.
   `matcher` is the query matcher owned by search.js, injected because that
   module touches the DOM at module scope and cannot be imported outside the
   browser (see horizons.visible). `top` is injectable so a gate can prove the
   cap without restating a constant. */
export function computeNow({ matcher = null, top = NOW_CAP } = {}) {
  const today = today0();
  const tk = todayKey();
  const next = nextCommitment(todayCommitmentRows(), new Date().toTimeString().slice(0, 5));

  /* A task matched to the next fixed commitment counts as today work even
     when undated — the timetable is itself the due anchor (check-now pins
     this). Everything else undated lives in the inbox horizon now. */
  const cands = S.tasks.filter(t =>
    t.status === 'todo' && !t.noise && !t.dropped && !t.parentId &&
    visible(S, t, matcher) &&
    (groupOf(t, 'today', tk) !== null || (!t.dueDate && next && t.title === next[2])));

  const scored = cands.map((t, i) => {
    const reasons = [];                 /* i18n KEYS, in the order they apply */
    let score = 0;
    if (t.priority === 'frog') { score += 100; reasons.push('r_frog'); }
    else if (t.priority === 'high') { score += 45; }
    if (t.key) { score += 40; reasons.push('r_key'); }
    if (t.dueDate) {
      const due = parseISO(dayKey(t.dueDate));
      if (due < today) { score += 55; reasons.push('r_overdue'); }
      else if (+due === +today) { score += 35; reasons.push('r_due_today'); }
      else if (+due === +today + 86400000) { score += 18; reasons.push('r_due_tomorrow'); }
    }
    if (t.pinned) { score += 12; }
    if (t.delay) reasons.push('r_delayed');
    if (next && t.title === next[2]) reasons.push('r_next_commitment');

    /* the ONE line the user reads. Overdue carries its count — a bare
       "overdue" never says how far gone the thing is — and the timetable
       reason names the window instead of repeating the task title. */
    const n = overdueDaysOf(t, tk);
    let whyKey = '';
    let why = '';
    if (n > 0) { whyKey = 'r_overdue_days'; why = tr(whyKey, { n: N(n) }); }
    else {
      whyKey = reasons[0] || '';
      why = whyKey === 'r_next_commitment'
        ? tr(whyKey, { t: N(next[0]) + '–' + N(next[1]) })
        : whyKey ? tr(whyKey) : '';
    }
    return { t, score, reasons, whyKey, why, n, i };
  });

  /* total order — score, then the task's own order, then its place in the
     array — so equal scores can never make the shortlist jump between renders */
  scored.sort((a, b) => b.score - a.score || (a.t.order || 0) - (b.t.order || 0) || a.i - b.i);
  return scored.filter(s => s.score > 0).slice(0, Math.max(0, top));
}
