/* ============================================================
   TicTic ADHD — Now list (§4.1): small set (max 5) + visible
   reason per item. Reasons are computed, never guessed silently.
   ============================================================ */import { S } from './store.js';
import { parseISO, tr, dayKey } from './i18n.js';

export function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }

/* Score each candidate and return top items with reasons */
export function computeNow() {
  const today = today0();
  const cands = S.tasks.filter(t => t.status === 'todo' && !t.noise && !t.dropped && !t.parentId);
  const scored = cands.map(t => {
    const reasons = [];
    let score = 0;
    if (t.priority === 'frog') { score += 100; reasons.push(tr('r_frog')); }
    else if (t.priority === 'high') { score += 45; }
    if (t.key) { score += 40; reasons.push(tr('r_key')); }
    if (t.dueDate) {
      const due = parseISO(dayKey(t.dueDate));
      if (due < today) { score += 55; reasons.push(tr('r_overdue')); }
      else if (+due === +today) { score += 35; reasons.push(tr('r_due_today')); }
      else if (+due === +today + 86400000) { score += 18; reasons.push(tr('r_due_tomorrow')); }
    }
    if (t.pinned) { score += 12; }
    if (t.delay) reasons.push(tr('r_delayed'));
    return { t, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, 5);
}


