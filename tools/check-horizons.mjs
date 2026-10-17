#!/usr/bin/env node
/* ============================================================
   check-horizons.mjs — the duplicate-row gate.

     node tools/check-horizons.mjs      exit 1 = a view invariant broke

   The bug this exists for: the Today view rendered every overdue
   task twice, because "is this row overdue?" (due < today) and
   "is this row in the horizon bucket?" (due <= today) were two
   independent predicates that both said yes. No gate caught it —
   the rows were valid, just duplicated.

   Invariants proven here, over every horizon × date × task shape:
     1. groupOf returns exactly ONE label (never two groups at once)
     2. 'overdue' is exactly the past-due set, on every horizon that
        shows past-due work at all
     3. on the today horizon nothing due today-or-earlier is hidden —
        the fix must not "solve" duplication by dropping tasks
     4. each horizon's own list holds only the dates it claims
     5. the inbox never shows a dated task
     6. done / noise / dropped tasks belong to no horizon group
     7. on the REAL seeded today view: no task id is rendered twice, and the
        Now shortlist is a subset of the rows the list renders (one row per
        task, no phantom row) — measured, never hard-coded
   ============================================================ */
import { groupOf, inBucket, dayShift, todayKey, HORIZON_IDS, visible } from '../src/js/horizons.js';
import { S } from '../src/js/store.js';
import { seedIfNeeded } from '../src/js/seed.js';
import { doneInView } from '../src/js/tasks.js';
import { computeNow, NOW_CAP } from '../src/js/now.js';
import { bannerFrog } from '../src/js/rows.js';

const TODAY = '2026-10-15';                     /* fixed, so the run is reproducible */
const OFFSETS = [null, -400, -3, -1, 0, 1, 2, 6, 7, 8, 400];
const LABELS = ['overdue', 'bucket', null];

let checks = 0, failed = 0;
const fails = [];
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failed++; if (fails.length < 12) fails.push(msg); }
};

/* a due date in either stored shape — a calendar day ('YYYY-MM-DD') or a real
   instant — because dayKey() must read both to the same local day */
const dueFor = (offset, shape) => {
  if (offset === null) return null;
  const key = dayShift(TODAY, offset);
  if (shape === 'day') return key;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 9, 30).toISOString();   /* 09:30 local, unambiguous */
};
const task = (dueDate, extra = {}) => ({ id: 'x', title: 'x', status: 'todo', dueDate, ...extra });

/* ---- 1–5. horizon × date × shape × state ---- */
for (const horizon of HORIZON_IDS) {
  for (const offset of OFFSETS) {
    for (const shape of ['day', 'instant']) {
      const due = dueFor(offset, shape);
      const t = task(due);
      const label = groupOf(t, horizon, TODAY);
      const tag = `${horizon} · due ${offset === null ? 'none' : offset + 'd'} (${shape})`;

      /* 1. exactly one label */
      assert(LABELS.includes(label), `${tag}: unexpected label ${label}`);

      /* 2. overdue ⟺ past-due, wherever overdue is shown */
      const pastDue = offset !== null && offset < 0;
      const showsOverdue = horizon !== 'inbox';
      assert((label === 'overdue') === (pastDue && showsOverdue), `${tag}: overdue classification wrong (got ${label})`);

      /* 3. the today horizon hides nothing */
      if (horizon === 'today' && (offset === null || offset <= 0)) {
        assert(label !== null, `${tag}: a task the today view must show is hidden`);
        assert(label === 'overdue' || label === 'bucket', `${tag}: no group assigned`);
      }

      /* 4. each horizon's own list holds exactly the dates it claims.
         Checked straight against inBucket() so the bucket contract is pinned
         on its own terms — including for past-due dates, which is precisely
         where the old `due <= today` rule pulled a second copy of every
         overdue task into the list. */
      const dueKeyNow = offset === null ? null : dayShift(TODAY, offset);
      const inOwnList = inBucket(horizon, dueKeyNow, TODAY);
      const spec = {
        today:     offset === null || offset === 0,
        tomorrow:  offset === 1,
        this_week: offset !== null && offset >= 0 && offset <= 7,
        next7:     offset !== null && offset >= 1 && offset <= 7,
        inbox:     offset === null,
      }[horizon];
      assert(inOwnList === spec, `${tag}: ${horizon} bucket wrong — spec ${spec}, got ${inOwnList}`);
      /* and the classifier hands the bucket only what the bucket claims */
      if (label === 'bucket') assert(inOwnList, `${tag}: labelled 'bucket' but the bucket rejects it`);

      /* 5. the inbox is undated capture only */
      if (horizon === 'inbox') assert(label === null || (label === 'bucket' && offset === null), `${tag}: inbox shows a dated task`);
    }
  }
}

/* ---- 6. done / noise / dropped are in no horizon group ---- */
for (const horizon of HORIZON_IDS) {
  for (const offset of OFFSETS) {
    for (const state of [{ status: 'done' }, { noise: true }, { dropped: true }]) {
      const label = groupOf(task(dueFor(offset, 'day'), state), horizon, TODAY);
      checks++;
      if (label !== null) { failed++; if (fails.length < 12) fails.push(`${horizon} · due ${offset} · ${JSON.stringify(state)}: should be in no group, got ${label}`); }
    }
  }
}

/* ---- 7. the exact regression: yesterday's rows must not be in today's bucket ---- */
const yesterday = dayShift(TODAY, -1);
assert(!inBucket('today', yesterday, TODAY), 'a past-due task is in the today bucket (duplicate rows would return)');
assert(inBucket('today', TODAY, TODAY), 'a task due today must be in the today bucket');
assert(inBucket('today', null, TODAY), 'an undated task must be in the today bucket (the app shows it there)');
assert(groupOf(task(yesterday), 'today', TODAY) === 'overdue', 'a past-due task must be owned by the overdue group');

/* ---- 8. the seeded Today view: the real render set -----------------------
   The seven blocks above prove the CLASSIFIER on synthetic shapes. This one
   proves the VIEW on the data it actually receives: which tasks the today
   horizon draws, that none is drawn twice, and that the Now shortlist is a
   subset of those rows rather than a list of its own. Every count is derived
   here — a hard-coded row count would rot the day the seed data changes. */
seedIfNeeded(S);
S.ui.horizon = 'today';
S.ui.filterList = 'all';
const seededTk = todayKey();
const shown = (t) => visible(S, t);
const overdueSet = S.tasks.filter((t) => shown(t) && groupOf(t, 'today', seededTk) === 'overdue');
const bucketSet = S.tasks.filter((t) => shown(t) && groupOf(t, 'today', seededTk) === 'bucket');
const doneSet = S.tasks.filter((t) => shown(t) && doneInView(t, 'today'));
const renderedIds = [...overdueSet, ...bucketSet, ...doneSet].map((t) => t.id);
assert(renderedIds.length > 0, 'the seeded today view must render something');
assert(new Set(renderedIds).size === renderedIds.length, 'a task must not be rendered twice in the today view');

/* the frog is drawn as the banner instead of its bucket row (#19), so for the
   strip's "is it drawn at all?" contract the banner counts as a render site */
const mainIds = new Set([...overdueSet, ...bucketSet].map((t) => t.id));
const banner = bannerFrog(S);
if (banner) mainIds.add(banner.id);
const doneIds = new Set(doneSet.map((t) => t.id));
const strip = computeNow();
assert(NOW_CAP === 3, `the strip cap must stay 3 (got ${NOW_CAP})`);
assert(strip.length <= NOW_CAP, `the strip must respect its cap in the real view (got ${strip.length})`);
for (const s of strip) assert(mainIds.has(s.t.id), `the Now strip shows a task nothing draws (no group row, no banner): ${s.t.title}`);
for (const s of strip) assert(!doneIds.has(s.t.id), `the Now strip shows a finished task: ${s.t.title}`);

if (failed) {
  console.error(`\n  ✗ horizons      ${failed}/${checks} assertions failed`);
  for (const f of fails) console.error(`      · ${f}`);
  process.exit(1);
}
console.log(`${checks}/${checks} assertions · ${HORIZON_IDS.length} horizons × ${OFFSETS.length} dates · groups disjoint, past-due owned by overdue · seeded classifier sets ${renderedIds.length} rows (${overdueSet.length}/${bucketSet.length}/${doneSet.length}) · strip ${strip.length} (the view replaces the banner frog's bucket row with the banner)`);
process.exit(0);
