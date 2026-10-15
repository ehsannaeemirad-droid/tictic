#!/usr/bin/env node
/* ============================================================
   check-sync.mjs — the device-sync merge is the one piece of
   logic that can silently lose or resurrect a task, so it gets a
   real test, run in Node against the same module the browser uses.

   Timestamps are relative to now: the merge prunes tombstones older
   than 180 days, so a synthetic epoch-0 timestamp would be treated
   as ancient and pruned before it is asserted on.
   ============================================================ */
import { SYNCED_KEYS, buildPayload, mergeStates, applyPayload } from '../src/js/sync-merge.js';

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};
/* age = how long ago (ms) this version was written; smaller = newer */
const T = (id, age, extra = {}) => ({ id, title: 'x', modifiedAt: NOW - age, ...extra });

/* ---- 1. additions from the other device flow in ---- */
{
  const local = { tasks: [T('a', 3 * DAY)], tombstones: {} };
  const remote = { tasks: [T('a', 3 * DAY), T('b', 5 * DAY)], tombstones: {} };
  const { payload, stats } = mergeStates(local, remote);
  ok('a remote-only task is added', payload.tasks.some(t => t.id === 'b'));
  ok('the existing local task is kept', payload.tasks.some(t => t.id === 'a'));
  ok('stats count the addition', stats.added === 1, `got ${stats.added}`);
}

/* ---- 2. additions from this device survive a pull ---- */
{
  const local = { tasks: [T('a', 3 * DAY), T('c', 1000)], tombstones: {} };
  const remote = { tasks: [T('a', 3 * DAY)], tombstones: {} };
  const { payload } = mergeStates(local, remote);
  ok('a local-only task is not lost on pull', payload.tasks.some(t => t.id === 'c'));
}

/* ---- 3. last-write-wins on a conflicting edit ---- */
{
  const local = { tasks: [T('a', 2 * DAY, { title: 'local' })], tombstones: {} };
  const remote = { tasks: [T('a', 1000, { title: 'remote' })], tombstones: {} };  /* newer */
  const { payload } = mergeStates(local, remote);
  ok('newer remote edit wins', payload.tasks[0].title === 'remote');
  const swap = mergeStates(
    { tasks: [T('a', 500, { title: 'newer-local' })], tombstones: {} },
    { tasks: [T('a', 2 * DAY, { title: 'older-remote' })], tombstones: {} },
  );
  ok('newer local edit wins', swap.payload.tasks[0].title === 'newer-local');
}

/* ---- 4. tie goes to the local copy (stable, no flapping) ---- */
{
  const local = { tasks: [T('a', DAY, { title: 'local' })], tombstones: {} };
  const remote = { tasks: [T('a', DAY, { title: 'remote' })], tombstones: {} };
  ok('tie resolved to local', mergeStates(local, remote).payload.tasks[0].title === 'local');
}

/* ---- 5. a deletion propagates instead of resurrecting ---- */
{
  const local = { tasks: [T('a', 3 * DAY)], tombstones: { a: NOW - 1000 } };  /* deleted here */
  const remote = { tasks: [T('a', 3 * DAY)], tombstones: {} };                /* still has it */
  const { payload, stats } = mergeStates(local, remote);
  ok('a deleted task does not resurrect', !payload.tasks.some(t => t.id === 'a'));
  ok('stats count the removal', stats.removed === 1, `got ${stats.removed}`);
}

/* ---- 6. a deletion on the OTHER device reaches this one ---- */
{
  const local = { tasks: [T('a', 3 * DAY), T('b', 3 * DAY)], tombstones: {} };
  const remote = { tasks: [T('b', 3 * DAY)], tombstones: { a: NOW - 1000 } };
  const { payload } = mergeStates(local, remote);
  ok('remote deletion removes locally', !payload.tasks.some(t => t.id === 'a'));
}

/* ---- 7. an edit NEWER than the tombstone survives (re-created task) ---- */
{
  const local = { tasks: [], tombstones: { a: NOW - 2 * DAY } };
  const remote = { tasks: [T('a', 1000, { title: 'recreated' })], tombstones: { a: NOW - 2 * DAY } };
  const { payload } = mergeStates(local, remote);
  ok('task edited after deletion survives', payload.tasks.some(t => t.id === 'a'));
}

/* ---- 8. tombstones merge across devices (newest deletedAt wins) ---- */
{
  const local = { tasks: [], tombstones: { a: NOW - 5 * DAY } };
  const remote = { tasks: [], tombstones: { a: NOW - 1000, b: NOW - DAY } };
  const { payload } = mergeStates(local, remote);
  ok('tombstone union keeps newest', payload.tombstones.a === NOW - 1000 && payload.tombstones.b === NOW - DAY);
}

/* ---- 9. old tombstones are pruned (bounded growth) ---- */
{
  const ancient = NOW - 200 * DAY;   /* past the 180-day TTL */
  const { payload } = mergeStates({ tasks: [], tombstones: { old: ancient } }, null);
  ok('stale tombstone pruned', !('old' in payload.tombstones));
}

/* ---- 10. merge converges regardless of which device is "local" ---- */
{
  const A = { tasks: [T('a', 2 * DAY), T('b', 3 * DAY)], tombstones: {} };
  const B = { tasks: [T('a', DAY), T('c', 4 * DAY)], tombstones: {} };
  const set = (m) => m.payload.tasks.map(t => t.id).sort().join(',');
  ok('both devices converge to the same task set', set(mergeStates(A, B)) === set(mergeStates(B, A)));
  const winner = mergeStates(A, B).payload.tasks.find(t => t.id === 'a').modifiedAt;
  const winnerSwap = mergeStates(B, A).payload.tasks.find(t => t.id === 'a').modifiedAt;
  ok('both devices pick the same winner', winner === winnerSwap && winner === NOW - DAY, `${winner}/${winnerSwap}`);
}

/* ---- 11. buildPayload carries content only, no secrets/settings ---- */
{
  const p = buildPayload({ tasks: [T('a', DAY)], settings: { lang: 'fa' }, ui: { route: 'today' }, tombstones: {} });
  ok('payload holds synced collections', Array.isArray(p.tasks));
  ok('payload excludes settings', !('settings' in p));
  ok('payload excludes ui', !('ui' in p));
}

/* ---- 12. applyPayload writes merged content back over live state ---- */
{
  const state = { tasks: [T('old', 5 * DAY)], settings: { lang: 'fa' }, tombstones: {} };
  const { payload } = mergeStates(
    { tasks: state.tasks, tombstones: {} },
    { tasks: [T('new', 1000)], tombstones: { gone: NOW - 1000 } },
  );
  applyPayload(state, payload);
  /* union: both the local 'old' and the incoming 'new' survive */
  ok('apply merges the collection', state.tasks.some(t => t.id === 'new') && state.tasks.some(t => t.id === 'old'));
  ok('apply leaves settings untouched', state.settings.lang === 'fa');
  ok('apply sets tombstones', state.tombstones.gone === NOW - 1000);
}

/* ---- 13. SYNCED_KEYS is a clean, non-empty list ---- */
ok('SYNCED_KEYS is non-empty and unique', SYNCED_KEYS.length > 0 && new Set(SYNCED_KEYS).size === SYNCED_KEYS.length);

console.log(`\n${pass}/${pass + fail} merge checks passed`);
process.exit(fail ? 1 : 0);
