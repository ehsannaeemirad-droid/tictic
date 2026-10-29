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
import { dayKey } from './i18n.js';

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
    overdue: sortTasks(state.tasks.filter((t) => shown(t) && groupOf(t, state.ui.horizon, tk) === 'overdue'), state.ui.sort, state.lists),
    bucket: sortTasks(state.tasks.filter((t) => shown(t) && groupOf(t, state.ui.horizon, tk) === 'bucket'), state.ui.sort, state.lists),
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

/* ---- item 8 — multi-key sort -------------------------------------------
   The row order of overdue + bucket is decided here, pure and assertable in
   Node. cfg lives on state.ui.sort ({ primary, primaryDir, secondary,
   secondaryDir }); null (factory default) leaves the natural order alone.
   The Now strip is deliberately NOT rewired: its order is the score contract
   check-now.mjs pins (cap, total order), not a sort menu's job. */
export const SORT_KEYS = ['due', 'priority', 'title', 'list', 'estimate', 'created'];
const PRI_RANK = { frog: 0, high: 1, med: 2, low: 3, none: 4 };

function sortVal(t, key, listIx) {
  switch (key) {
    case 'due':       return t.dueDate ? dayKey(t.dueDate) : null;
    case 'priority':  return PRI_RANK[t.priority] ?? 4;
    case 'title':     return String(t.title || '');
    case 'list':      return listIx.get(t.listId) ?? 1e9;
    case 'estimate':  return t.estimate == null ? null : t.estimate;
    case 'created':   return t.createdAt || 0;
    default:          return 0;
  }
}

/** Reorder `tasks` by cfg; ties fall to the secondary key, then to the
 *  input order (stable, so equal rows never jump between two renders). */
export function sortTasks(tasks, cfg = null, lists = []) {
  if (!cfg || !cfg.primary || !SORT_KEYS.includes(cfg.primary)) return tasks;
  const listIx = new Map((lists || []).map((l, ix) => [l.id, ix]));
  const pairs = tasks.map((t, i) => [t, i]);
  const by = (a, b, key, dir) => {
    const va = sortVal(a, key, listIx), vb = sortVal(b, key, listIx);
    /* a missing value (undated, no estimate) sinks to the end REGARDLESS of
       direction — sorting by due desc must not float never-due rows on top */
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va === vb) return 0;   /* equality guard — equal values are a tie,
                                  never ±1 in both directions (a comparator
                                  that always says one direction makes the
                                  secondary key unreachable) */
    return ((va < vb) === (dir === 'asc')) ? -1 : 1;
  };
  pairs.sort(([ta, ia], [tb, ib]) => {
    let c = by(ta, tb, cfg.primary, cfg.primaryDir || 'asc');
    if (!c && cfg.secondary && SORT_KEYS.includes(cfg.secondary) && cfg.secondary !== cfg.primary) {
      c = by(ta, tb, cfg.secondary, cfg.secondaryDir || 'asc');
    }
    return c || ia - ib;
  });
  return pairs.map(([t]) => t);
}
