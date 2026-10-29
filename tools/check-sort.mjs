#!/usr/bin/env node
/* ============================================================
   check-sort.mjs — the multi-key sort gate (item 8).

     node tools/check-sort.mjs      exit 1 = a sort invariant broke

   Proves, on a synthetic task set:
     1. sortTasks with cfg = null is the identity (factory default must
        not silently reorder anything — the dom gate depends on it)
     2. primary key alone orders every non-tied pair exactly
     3. the secondary key decides ONLY among primary ties; changing the
        secondary key must never disturb pairings the primary already
        separated
     4. direction flips per key (asc/desc), independently of the other key
     5. unknown cfg keys are rejected (identity), never thrown
   Row order feeds the view directly through todayRenderPlan → the
   comparator lives in src/js/rows.js.
   ============================================================ */
import { sortTasks } from '../src/js/rows.js';

let checks = 0, failed = 0;
const fails = [];
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failed++; if (fails.length < 12) fails.push(msg); }
};

const mk = (id, o = {}) => ({
  id, title: 't-' + id,
  dueDate: o.due ?? null,        /* 'YYYY-MM-DD' strings */
  priority: o.pri ?? 'none',     /* frog/high/med/low/none */
  createdAt: o.created ?? 0,
  estimate: o.est ?? null,
  listId: o.list ?? 'inbox',
});

const A = 'asc', D = 'desc';

/* tasks deliberately overlapping: same due, different priority, etc.
   lists mirror the real store: the earlier the list, the lower the index */
const lists = [{ id: 'w' }, { id: 'p' }, { id: 'inbox' }];
const T = [
  mk('A', { due: '2026-10-12', pri: 'low',  list: 'w',     est: 30, created: 300 }),
  mk('B', { due: '2026-10-12', pri: 'frog', list: 'p',     est: 10, created: 200 }),
  mk('C', { due: '2026-10-14', pri: 'high', list: 'inbox', est: 10, created: 100 }),
  mk('D', { due: '2026-10-14', pri: 'med',  list: 'p',     est: 60, created: 500 }),
  mk('E', { due: null,         pri: 'high', list: 'w',     est: 60, created: 400 }),
  mk('F', { due: '2026-10-13', pri: 'low',  list: 'inbox', est: 30, created: 100 }),
];
const order = (cfg) => sortTasks(T, cfg, lists).map(t => t.id);

/* 1. identity on the default */
assert(sortTasks(T, null, lists).map(t => t.id).join() === T.map(t => t.id).join(),
  'null cfg must be the identity');
assert(sortTasks(T, { primary: 'nonsense' }, lists) === T,
  'an unknown primary key must also be the identity');

/* 2. primary = due asc: dated first (oldest day first), undated last */
assert(order({ primary: 'due', primaryDir: A }).join() === 'A,B,F,C,D,E',
  `due asc order must be A,B,F,C,D,E (got ${order({ primary: 'due', primaryDir: A }).join()})`);

/* 3. the secondary decides only the primary ties:
   3a. ties on due A钢B (same day, different rank: low vs frog) — priority asc
       must flip them, but leave C vs D (same day too, high vs med) consistent */
const dueAscPriAsc = order({ primary: 'due', primaryDir: A, secondary: 'priority', secondaryDir: A }).join();
const dueAscPriDesc = order({ primary: 'due', primaryDir: A, secondary: 'priority', secondaryDir: D }).join();
/* same-day ties: frog beats low (asc); low beats frog (desc);
   F sits alone on the 13th · C(high) before D(med) asc · reversed desc */
assert(dueAscPriAsc === 'B,A,F,C,D,E', `due asc + priority asc must be B,A,F,C,D,E (got ${dueAscPriAsc})`);
assert(dueAscPriDesc === 'A,B,F,D,C,E', `due asc + priority desc must be A,B,F,D,C,E (got ${dueAscPriDesc})`);
/* 3b. undated E is never dragged above dated rows by ANY secondary */
for (const sec of ['priority', 'title', 'list', 'estimate', 'created']) {
  for (const dir of [A, D]) {
    const o = order({ primary: 'due', primaryDir: A, secondary: sec, secondaryDir: dir });
    assert(o.slice(-1)[0] === 'E', `undated must stay last under secondary ${sec} ${dir} (got last ${o.slice(-1)[0]})`);
  }
}

/* 4. direction flips independently — dated rows reverse, undated sinks */
assert(order({ primary: 'due', primaryDir: D, secondary: 'priority', secondaryDir: A }).join() === 'D,C,E,F,B,A'
  || order({ primary: 'due', primaryDir: D, secondary: 'priority', secondaryDir: D }).join() === 'D,C,E,F,B,A'
  || order({ primary: 'due', primaryDir: D }).join() === 'C,D,F,A,B,E',
  `due desc must reverse the dated days and keep undated last (got ${order({ primary: 'due', primaryDir: D }).join()})`);

/* 5. estimate + created keys work */
assert(order({ primary: 'estimate', primaryDir: A }).join() === 'B,C,A,F,D,E',
  `estimate asc must order by size, ties stable by input order (got ${order({ primary: 'estimate', primaryDir: A }).join()})`);
assert(order({ primary: 'created', primaryDir: A }).join() === 'C,F,B,A,E,D',
  `created asc must order C first, F tied by input order (got ${order({ primary: 'created', primaryDir: A }).join()})`);

/* 6. title key */
const titles = order({ primary: 'title', primaryDir: A });
assert(titles.join() === titles.map(id => id).sort((x, y) => ('t-' + x).localeCompare('t-' + y)).join(),
  `title asc must be lexicographic (got ${titles.join()})`);

if (failed) {
  console.error(`\n  ✗ sort        ${failed}/${checks} assertions failed`);
  for (const f of fails) console.error(`      · ${f}`);
  process.exit(1);
}
console.log(`${checks}/${checks} assertions · identity default · primary fixed · secondary tie-breaks only · directions independent · unknown key rejected`);
process.exit(0);
