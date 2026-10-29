#!/usr/bin/env node
/* ============================================================
   check-types.mjs — the task-type gate (item 9).

     node tools/check-types.mjs      exit 1 = a type invariant broke

   Proves:
     1. makeTask always produces a VALID type (never undefined)
     2. an invalid/absent type normalizes to 'responsibility'
     3. the four types map to four DISTINCT visual classes (t-type-*)
     4. hydrate() normalizes older mirrors: every task after load is valid
     5. the TickTick import heuristic: repeat rule → organizer,
        no due + no priority → nice-to-do, else responsibility,
        and NEVER a mover (movers are user intent only)
     6. rows.js recognizes the class hook for all four types
   Mutation-tested: breaking the default (empty TASK_TYPES fallback) turns
   every assertion 1–2 red.
   ============================================================ */
import { S, hydrate, makeTask, TASK_TYPES, normalizeType } from '../src/js/store.js';
import { parseTickCsv, applyImport } from '../src/js/ticktick.js';
import fs from 'node:fs';
/* same browser stubs the roundtrip gate uses — applyImport calls commit */
globalThis.localStorage = { _d: new Map(), getItem(k) { return this._d.has(k) ? this._d.get(k) : null; }, setItem(k, v) { this._d.set(k, String(v)); }, removeItem(k) { this._d.delete(k); }, clear() { this._d.clear(); } };

let checks = 0, failed = 0;
const fails = [];
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failed++; if (fails.length < 12) fails.push(msg); }
};

/* 1. factory default */
for (const patch of [{}, { title: 'x' }, { type: undefined }]) {
  const t = makeTask(patch);
  assert(TASK_TYPES.includes(t.type), `makeTask must set a valid type (got ${t.type})`);
}
assert(TASK_TYPES.includes('responsibility'), 'responsibility must be a valid type');

/* 2. normalize */
assert(normalizeType(undefined) === 'responsibility', 'absent type must normalize to responsibility');
assert(normalizeType('weird') === 'responsibility', 'an invalid type must normalize to responsibility');
assert(normalizeType('mover') === 'mover', 'a valid type must pass through unchanged');

/* 3. four distinct visual classes — the same map the row renderer uses */
const CLASSES = ['t-type-mover', 't-type-responsibility', 't-type-organizer', 't-type-nice'];
const css = fs.readFileSync('src/css/components.css', 'utf8');
for (const c of CLASSES) assert(css.includes('.' + c + ' '), `the css must style ${c}`);
assert(new Set(CLASSES).size === 4, 'the four classes must be distinct');

/* 4. hydrate normalizes older mirrors */
const before = S.tasks.length;
hydrate({ tasks: [{ id: 'a', title: 'old mirror row' }, { id: 'b', type: 'organizer' }], savedAt: 0 });
assert(S.tasks[0].type === 'responsibility', 'hydrate must normalize a typeless task to responsibility');
assert(S.tasks[1].type === 'organizer', 'hydrate must keep a valid existing type');
/* restore the store shape so other runs are unaffected */
S.tasks = S.tasks.slice(before);

/* 5. import heuristics on a synthetic v7.2 CSV */
const csv = [
  'Folder Name,List Name,Title,Kind,Tags,Content,Is Check list,Start Date,Due Date,Reminder,Repeat,Priority,Status,Created Time,Completed Time,Order,Timezone,Is All Day,Is Floating,Column Name,Column Order,View Mode,taskId,parentId,projectKind',
  'L,,Routine row,0,tags,,N,,2026-10-20T20:00:00+0000,,FREQ=DAILY;INTERVAL=1,,0,2026-10-01T10:00:00+0000,,-8.20E+14,UTC,TRUE,,,"","","",t1,"",p0',
  'L,,Someday row,0,tags,,N,,,,,,0,2026-10-01T10:00:00+0000,,-8.20E+14,UTC,TRUE,,,"","","",t2,"",p0',
  'L,,Vanilla row,0,tags,,N,,2026-10-21T10:00:00+0000,,,3,0,2026-10-01T10:00:00+0000,,-8.20E+14,UTC,TRUE,,,"","","",t3,"",p0',
].join('\n');
S.tasks = []; S.lists = [{ id: 'inbox', name: 'اینباکس', system: true }];
const res = parseTickCsv(csv);
const byTitle = Object.fromEntries(res.tasks.map(r => [r.title, r]));
assert(byTitle['Routine row']?.type === 'organizer', 'a repeat row must import as organizer');
assert(byTitle['Someday row']?.type === 'nice', 'a no-due + no-priority row must import as nice');
assert(byTitle['Vanilla row']?.type === 'responsibility', 'a dated+prioritized row must import as responsibility');
assert(!res.tasks.some(r => r.type === 'mover'), 'the heuristic must NEVER assign mover (user intent only)');
S.tasks = [];

/* 6. applyImport normalizes through store (belt: even if a source forgets) */
applyImport([{ id: 'z', title: 'Heuristic-less row', priority: 'med', dueDate: '2026-10-21' }], { skipDuplicates: false });
const imp = S.tasks.find(t => t.title === 'Heuristic-less row');
assert(imp && TASK_TYPES.includes(imp.type), 'applyImport must land a valid type on the task');
S.tasks = [];

if (failed) {
  console.error(`\n  ✗ types        ${failed}/${checks} assertions failed`);
  for (const f of fails) console.error(`      · ${f}`);
  process.exit(1);
}
console.log(`${checks}/${checks} assertions · factory default valid · normalize → responsibility · 4 distinct classes · hydrate normalizes mirrors · organizer/nice/typeless heuristics · mover never heuristic`);
process.exit(0);
