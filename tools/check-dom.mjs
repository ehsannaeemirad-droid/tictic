#!/usr/bin/env node
/* ============================================================
   check-dom.mjs — the rendered-element gate.

     node tools/check-dom.mjs      exit 1 = a task is drawn twice

   Why it exists. Bugs #18 and #19 were both "the same task drawn twice",
   and all 12 gates passed while they were live, because every individual
   row was valid — only its multiplicity was wrong. Nothing inspected the
   set of elements the view builds.

   How it can exist at all. views/daily.js imports the UI layer and cannot
   be imported in Node ("document is not defined", verified). Rather than
   fake a document, the view's selection step was moved into a pure module
   (src/js/rows.js) and daily.js now renders from that plan — so this gate
   asserts exactly the element set the real view builds, not a model of it.
   It reads the same `todayRenderPlan()` the view calls.

   What it asserts, on the real seeded state:
     1. every element id is a task that exists
     2. no id appears twice in the LISTED layer (banner + overdue + bucket
        + done) — this is bug #18 (two groups claiming a row) and bug #19
        (the frog as banner AND as a bucket row)
     3. the banner's task is in no list group (#19, stated directly)
     4. the overdue and bucket groups are disjoint (#18, stated directly)
     5. no id appears twice inside the strip
     6. every strip item is drawn somewhere — its own row, or the banner
        (a strip entry can never be a phantom)
     7. the badge count the view will draw is DERIVED, not assumed: it is
        |strip ∩ listed|, so an orphan badge fails the gate
     8. the same rules hold on the tomorrow horizon and under a list filter
   What it does NOT cover: the DOM itself. It proves selection, not
   appending — a view that built the right set and then appended it twice
   would still pass. That residual gap is stated in LAUNCH_REVIEW.md.
   ============================================================ */
import { S } from '../src/js/store.js';
import { seedIfNeeded } from '../src/js/seed.js';
import { todayRenderPlan, renderOrder } from '../src/js/rows.js';

let checks = 0, failed = 0;
const fails = [];
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failed++; if (fails.length < 12) fails.push(msg); }
};
const count = (list) => {
  const m = new Map();
  for (const id of list) m.set(id, (m.get(id) || 0) + 1);
  return m;
};
const dupes = (m) => [...m.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);

seedIfNeeded(S);
S.ui.horizon = 'today';
S.ui.filterList = 'all';
S.ui.filterQuery = '';

const known = new Set(S.tasks.map((t) => t.id));
const plan = todayRenderPlan(S);
const order = renderOrder(plan);
const idsOf = (layer) => order.filter((e) => e.layer === layer).map((e) => e.id);

const listed = order.filter((e) => e.layer !== 'strip').map((e) => e.id);
const stripped = idsOf('strip');
const rowIds = new Set(idsOf('row'));
const bannerId = plan.banner ? plan.banner.id : null;

/* ---- 1. every drawn element is a real task ---------------------------- */
assert(order.length > 0, 'the seeded today view must draw something');
for (const e of order) assert(known.has(e.id), `the view would draw a task that does not exist: ${e.id}`);

/* ---- 2. the listed layer: one element per task ------------------------ */
const listedCount = count(listed);
assert(dupes(listedCount).length === 0,
  `a task is drawn twice in the listed layer: ${dupes(listedCount).join(', ')}`);

/* ---- 3 + 4. the two bugs, stated directly ---------------------------- */
if (bannerId) {
  assert(!plan.overdue.some((t) => t.id === bannerId), 'the frog is drawn as the banner AND in the overdue group (#19)');
  assert(!plan.bucket.some((t) => t.id === bannerId), 'the frog is drawn as the banner AND in the bucket (#19)');
  assert(!plan.done.some((t) => t.id === bannerId), 'the frog is drawn as the banner AND in done today (#19)');
}
const overdueIds = new Set(plan.overdue.map((t) => t.id));
for (const t of plan.bucket) assert(!overdueIds.has(t.id), `a past-due task is in the overdue group AND the bucket (#18): ${t.id}`);

/* ---- 5 + 6. the strip ------------------------------------------------- */
assert(dupes(count(stripped)).length === 0, `a task appears twice in the strip: ${dupes(count(stripped)).join(', ')}`);
assert(stripped.length <= 3, `the strip must stay within its cap (got ${stripped.length})`);
const drawn = new Set(listed);
for (const id of stripped) {
  assert(drawn.has(id) || id === bannerId, `the strip would draw a task no other element shows: ${id}`);
}

/* ---- 7. the badge count is derived -----------------------------------
   daily.js puts the badge on ROWS only (rowTask), and the banner is not a
   row — so the derived badge count is |strip ∩ rows|. With #19 fixed the
   frog is the banner, so it is shortlisted but carries no badge; counting
   the banner as a badged element was the gate's own first bug. */
const badges = stripped.filter((id) => rowIds.has(id)).length;
assert(badges <= stripped.length, 'more badges than shortlisted rows');
if (bannerId) {
  const frogShortlisted = stripped.includes(bannerId);
  assert(badges === stripped.length - (frogShortlisted ? 1 : 0),
    `every shortlisted task except the banner frog must carry a badge (shortlisted ${stripped.length}, badges ${badges})`);
}

/* ---- 8. the same rules on another horizon and under a filter ---------- */
S.ui.horizon = 'tomorrow';
const tomorrow = todayRenderPlan(S);
const tomorrowOrder = renderOrder(tomorrow);
assert(tomorrow.banner === null, 'only the today horizon draws a frog banner');
assert(tomorrow.now.length === 0, 'only the today horizon draws the strip');
assert(dupes(count(tomorrowOrder.map((e) => e.id))).length === 0, 'a task is drawn twice on the tomorrow horizon');
S.ui.horizon = 'today';

S.ui.filterList = 'work';
const filtered = todayRenderPlan(S);
const filteredOrder = renderOrder(filtered);
const filteredListed = new Set(filteredOrder.filter((e) => e.layer !== 'strip').map((e) => e.id));
/* the banner deliberately ignores list filters (it is a spotlight, not a row),
   so it is drawn once whether or not its list matches — but it still never
   becomes a list row, and a strip entry still needs an element to sit on */
assert(filtered.banner !== null, 'a list filter must not suppress the frog banner');
assert(filteredOrder.filter((e) => e.layer === 'banner').length === 1, 'the view draws the banner exactly once, filter or not');
for (const e of filteredOrder) {
  if (e.layer === 'strip') assert(filteredListed.has(e.id) || e.id === filtered.banner.id, 'a filtered strip entry has no element to sit on');
  if (e.layer === 'row') assert(e.id !== filtered.banner.id, 'a list row must not be the banner task');
}
assert(dupes(count(filteredOrder.filter((e) => e.layer !== 'strip').map((e) => e.id))).length === 0,
  'a task is drawn twice in the listed layer under a filter');
S.ui.filterList = 'all';

/* ---- report (derived, never hard-coded) ------------------------------ */
const restored = todayRenderPlan(S);
const restoredOrder = renderOrder(restored);
const listRows = restoredOrder.filter((e) => e.layer === 'row').length;

if (failed) {
  console.error(`\n  ✗ dom           ${failed}/${checks} assertions failed`);
  for (const f of fails) console.error(`      · ${f}`);
  process.exit(1);
}
const stripRows = restoredOrder.filter((e) => e.layer === 'strip').length;
console.log(`${checks}/${checks} assertions · today draws ${restoredOrder.length} elements `
  + `(banner ${bannerId ? 1 : 0} + rows ${listRows} + strip ${stripRows}) · `
  + `no task drawn twice in the listed layer · ${badges} badge(s) · groups disjoint`);
process.exit(0);
