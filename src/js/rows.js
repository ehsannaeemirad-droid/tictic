/* ============================================================
   TicTic — the Today render plan (pure, no DOM)

   Why this module exists
     views/daily.js imports the UI layer, so it cannot be imported in
     Node ("document is not defined") — which is why no gate could see
     what the view actually drew. Bug #18 (every overdue task drawn
     twice) and bug #19 (the frog drawn as a banner and again as a
     bucket row) were both invisible to all 12 gates for exactly that
     reason: every individual row was valid, only their multiplicity
     was wrong.

     The plan decides WHICH tasks become elements; daily.js only turns
     those tasks into DOM. A gate can therefore assert the element set
     on stock Node, and the view cannot quietly disagree with it —
     both read this one function.
   ============================================================ */
import { S } from './store.js';
import { groupOf, todayKey, visible } from './horizons.js';
import { computeNow } from './now.js';
import { doneInView } from './tasks.js';

/* The frog banner's own predicate — deliberately NOT the render-set predicate:
   the banner is a spotlight and keeps showing while a list filter hides rows.
   That is existing behaviour this refactor preserves rather than changes. */
export const bannerFrog = (state) =>
  state.tasks.find((t) => t.priority === 'frog' && t.status === 'todo' && !t.noise) || null;

/**
 * Every element the Today view will build, as tasks.
 * @returns {{ banner: object|null, now: Array, overdue: Array, bucket: Array, done: Array }}
 */
export function todayRenderPlan(state = S, { matcher = null, today } = {}) {
  const tk = today || todayKey();
  const onToday = state.ui.horizon === 'today';
  const banner = onToday ? bannerFrog(state) : null;
  const bannerId = banner ? banner.id : null;

  /* #19 — the frog IS the banner, so it is not also a list row. One element per
     task in the list layer, with the banner counting as that task's row. */
  const shown = (t) => t.id !== bannerId && visible(state, t, matcher);

  return {
    banner,
    now: onToday ? computeNow({ matcher }) : [],
    overdue: state.tasks.filter((t) => shown(t) && groupOf(t, state.ui.horizon, tk) === 'overdue'),
    bucket: state.tasks.filter((t) => shown(t) && groupOf(t, state.ui.horizon, tk) === 'bucket'),
    done: state.tasks.filter((t) => shown(t) && doneInView(t, state.ui.horizon)),
  };
}

/* the id of every element the plan draws, in the order it draws them, tagged
   with the layer it belongs to — the single source both the view and the
   rendered-DOM gate read */
export function renderOrder(plan) {
  const out = [];
  if (plan.banner) out.push({ layer: 'banner', id: plan.banner.id });
  for (const s of plan.now) out.push({ layer: 'strip', id: s.t.id });
  for (const t of plan.overdue) out.push({ layer: 'row', id: t.id });
  for (const t of plan.bucket) out.push({ layer: 'row', id: t.id });
  for (const t of plan.done) out.push({ layer: 'row', id: t.id });
  return out;
}
