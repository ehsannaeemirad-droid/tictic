#!/usr/bin/env node
/* ============================================================
   check-now.mjs — the Now shortlist gate.

     node tools/check-now.mjs      exit 1 = a rule below broke

   The strip used to score S.tasks directly: no cap worth trusting, no
   tie-break, and no relationship to the rows the view actually drew — so it
   could list tasks the active filter had hidden (the phantom-row bug), and a
   tie could reshuffle it on the next render.

   Invariants proven here, on the real seeded state:
     1. the cap is 3, and it is the ONLY thing bounding the strip
     2. total order: score desc, then the task's own order, then array position
     3. every item scores > 0, appears once, and is one the today view renders
     4. two calls on the same state return the same ids in the same order
     5. `why` is built from an i18n key present in BOTH fa and en, and an
        overdue item says how many days it is past due (n === overdueDaysOf)
     6. visibility is the strip's filter: a list filter narrows it, and a query
        with no matcher fails closed instead of leaking rows
     7. the next-commitment reason fires only for the next commitment, and
        names its window
   ============================================================ */
import { S } from '../src/js/store.js';
import { seedIfNeeded } from '../src/js/seed.js';
import { STRINGS, N, tr } from '../src/js/i18n.js';
import { todayKey, visible, groupOf, overdueDaysOf } from '../src/js/horizons.js';
import { computeNow, NOW_CAP } from '../src/js/now.js';

let checks = 0, failed = 0;
const fails = [];
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failed++; if (fails.length < 12) fails.push(msg); }
};
const idsOf = (list) => list.map((s) => s.t.id).join(',');

seedIfNeeded(S);
S.ui.horizon = 'today';
S.ui.filterList = 'all';
S.ui.filterQuery = '';
const tk = todayKey();

/* ---- 1. the cap --------------------------------------------------------- */
const top = computeNow();
assert(NOW_CAP === 3, `the shortlist cap must be 3 (got ${NOW_CAP})`);
assert(top.length === 3, `a busy day must fill the strip to the cap (got ${top.length})`);
assert(computeNow({ top: 99 }).length > 3, 'the cap must be the only bound (there are more candidates than slots)');
assert(computeNow({ top: 2 }).length === 2, 'the cap must be injectable');
assert(computeNow({ top: 0 }).length === 0, 'a cap of 0 must yield nothing');

/* ---- 2. total order ---------------------------------------------------- */
const ordered = computeNow({ top: 99 });
for (let i = 1; i < ordered.length; i++) {
  const a = ordered[i - 1], b = ordered[i];
  const ao = a.t.order || 0, bo = b.t.order || 0;
  const before = b.score < a.score
    || (b.score === a.score && (ao < bo || (ao === bo && a.i < b.i)));
  assert(before, `order broken at ${i}: ${a.t.title}(${a.score}) before ${b.t.title}(${b.score})`);
}

/* ---- 3. one row each, positive score, actually rendered ---------------- */
assert(new Set(top.map((s) => s.t.id)).size === top.length, 'a task may not appear twice in the shortlist');
assert(top.every((s) => s.score > 0), 'every shortlisted task must score above zero');
assert(top.every((s) => groupOf(s.t, 'today', tk) !== null), 'every shortlisted task must belong to the today horizon (no phantom row)');
assert(top.every((s) => visible(S, s.t)), 'every shortlisted task must pass the render-set predicate');

/* ---- 4. determinism --------------------------------------------------- */
assert(idsOf(computeNow()) === idsOf(top), 'two calls on the same state must return the same order');
assert(idsOf(computeNow({ top: 99 })) === idsOf(ordered), 'the tie-break must be total, not incidental');

/* ---- 5. the one line, and the overdue count --------------------------- */
for (const s of ordered) {
  const n = overdueDaysOf(s.t, tk);
  assert(s.n === n, `n must equal overdueDaysOf for ${s.t.title}`);
  assert(typeof s.why === 'string' && s.why.length > 0, `every item needs a reason line: ${s.t.title}`);
  assert(s.whyKey === 'r_overdue_days' ? n > 0 : true, `r_overdue_days on a task that is not past due: ${s.t.title}`);
  assert(n > 0 ? s.whyKey === 'r_overdue_days' : true, `a past-due task must say so: ${s.t.title}`);
  if (s.whyKey === 'r_overdue_days') {
    assert(s.why === STRINGS.fa.r_overdue_days.replace('{n}', N(n)),
      `the overdue line must carry the day count (${n}) — got "${s.why}"`);
  }
  for (const k of [...s.reasons, s.whyKey].filter(Boolean)) {
    assert(k in STRINGS.fa && k in STRINGS.en, `reason key ${k} must exist in BOTH fa and en`);
  }
}

/* ---- 6. visibility is the filter (the phantom-row rule) -------------- */
S.ui.filterList = 'work';
const byList = computeNow({ top: 99 });
assert(byList.length > 0, 'the seeded work list must still have candidates');
assert(byList.every((s) => s.t.listId === 'work'), 'a list filter must narrow the strip to that list');
S.ui.filterList = 'all';

S.ui.filterQuery = 'no-such-task-anywhere';
assert(computeNow({ top: 99 }).length === 0, 'a query with no matcher must hide everything (fail closed)');
assert(computeNow({ matcher: () => false, top: 99 }).length === 0, 'a non-matching matcher must hide everything');
assert(computeNow({ matcher: () => true, top: 99 }).length > 0, 'a matching matcher must keep the candidates');
S.ui.filterQuery = '';

/* ---- 7. the next-commitment reason ----------------------------------- */
/* a HIGH task that lines up with the next commitment scores without carrying
   any earlier reason, so this is the one path where the timetable line is the
   line the user reads */
const WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const dayKey0 = WEEK[(new Date().getDay() + 1) % 7];
const ROW = ['07:00', '08:00', 'SYNTHETIC COMMITMENT'];
S.timetable = { shift: 'morning', data: { morning: { [dayKey0]: [ROW] } } };
S.tasks.push({ id: 'synth-commitment', title: ROW[2], status: 'todo', listId: 'inbox', priority: 'high', order: 1e15, tags: [], subtasks: [] });
const withCommitment = computeNow({ top: 99 }).find((s) => s.t.id === 'synth-commitment');
assert(!!withCommitment, 'a high task matching the next commitment must still be shortlisted');
if (withCommitment) {
  assert(withCommitment.reasons.includes('r_next_commitment'), 'the timetable reason must be attached');
  assert(withCommitment.whyKey === 'r_next_commitment', 'with no stronger reason, the timetable line is the one shown');
  assert(withCommitment.why === tr('r_next_commitment', { t: N(ROW[0]) + '–' + N(ROW[1]) }),
    `the line must name the window, got "${withCommitment.why}"`);
}
S.tasks = S.tasks.filter((t) => t.id !== 'synth-commitment');
S.timetable = null;
assert(computeNow({ top: 99 }).length > 0, 'removing the synthetic task must leave the strip intact');

if (failed) {
  console.error(`\n  ✗ now           ${failed}/${checks} assertions failed`);
  for (const f of fails) console.error(`      · ${f}`);
  process.exit(1);
}
console.log(`${checks}/${checks} assertions · cap ${NOW_CAP} · total order · why-lines key-checked in fa+en · list/query filters narrow the strip`);
process.exit(0);
