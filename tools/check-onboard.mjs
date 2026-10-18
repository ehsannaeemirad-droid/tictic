#!/usr/bin/env node
/* ============================================================
   check-onboard.mjs — the first-run gate.

     node tools/check-onboard.mjs      exit 1 = a rule below broke

   The question the feature answers: "does the app ask a user who has
   no tasks of their own, exactly once, and never ask an existing user?"

   Invariants proven here:
     1. an empty store shows the question
     2. a demo-only store shows it (seed inventory is not "the user's work")
     3. ONE user task — in any state — retires it, and so does a row
        written before the `demo` flag existed (no re-onboarding)
     4. the skip flag retires it forever, empty store or not
     5. the created task is the frog, undated (undated rows land in Today)
        and a blank submission creates nothing
     6. onboard.js stays pure (no DOM, no localStorage, no imports) so this
        gate can trust it, and seed.js marks its rows `demo: true` in exactly
        one place — if that line disappears, nobody is ever asked
     7. main.js persists the skip flag under the key onboard.js exports
     8. boot ships no demo data (seed.js stays a gate fixture only), so a
        fresh install's Today view is genuinely empty
     9. the first-run sheet offers three labelled paths — import, one task,
        blank — and every one of them sets the skip flag
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldShowOnboarding, buildOnboardingTask, ONBOARD_SKIP_KEY } from '../src/js/onboard.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

let checks = 0, failed = 0;
const fails = [];
const assert = (cond, msg) => {
  checks++;
  if (!cond) { failed++; if (fails.length < 12) fails.push(msg); }
};

const demo = (i, extra = {}) => ({ id: 'demo' + i, title: 'demo ' + i, status: 'todo', demo: true, ...extra });
const own = (i, extra = {}) => ({ id: 'own' + i, title: 'own ' + i, status: 'todo', ...extra });

/* ---- 1. empty ---------------------------------------------------------- */
assert(shouldShowOnboarding({ tasks: [] }) === true, 'empty state: the question must show');
assert(shouldShowOnboarding() === true, 'empty state: no argument must behave like an empty store');
assert(shouldShowOnboarding({ tasks: [], skipped: false }) === true, 'empty state with skipped:false must show');

/* ---- 2. demo only ------------------------------------------------------ */
assert(shouldShowOnboarding({ tasks: [demo(1), demo(2)] }) === true, 'demo-only state: the question must show');
assert(shouldShowOnboarding({ tasks: [
  demo(3, { status: 'done', progress: 100 }),
  demo(4, { noise: true }),
  demo(5, { dropped: true }),
  demo(6, { status: 'note' }),
  demo(7, { parentId: 'demo3' }),
] }) === true, 'demo-only state: finished/parked/note/nested demo rows are all still demo');

/* ---- 3. the user has work of their own --------------------------------- */
assert(shouldShowOnboarding({ tasks: [own(1)] }) === false, 'one real task: the question must retire');
assert(shouldShowOnboarding({ tasks: [demo(1), own(2), demo(3)] }) === false, 'one real task among demo rows: must retire');
assert(shouldShowOnboarding({ tasks: [own(4, { status: 'done' })] }) === false, 'a completed real task is still the user\'s work');
assert(shouldShowOnboarding({ tasks: [{ id: 'legacy', title: 'old', status: 'todo' }] }) === false,
  'a row written before the demo flag existed must be read as the user\'s work (no re-onboarding)');

/* ---- 4. the skip flag -------------------------------------------------- */
assert(shouldShowOnboarding({ tasks: [], skipped: true }) === false, 'skip flag: must never show again');
assert(shouldShowOnboarding({ tasks: [], skipped: '1' }) === false, 'skip flag stored as "1": must never show again');
assert(shouldShowOnboarding({ tasks: [demo(1)], skipped: true }) === false, 'skip flag wins over a demo-only store');
assert(typeof ONBOARD_SKIP_KEY === 'string' && ONBOARD_SKIP_KEY.length > 0, 'the skip key must be exported and non-empty');

/* ---- 5. the task the question creates ---------------------------------- */
const patch = buildOnboardingTask('  Buy milk  ');
assert(!!patch, 'a non-blank title must produce a task patch');
assert(patch && patch.title === 'Buy milk', 'the title must be trimmed (got ' + JSON.stringify(patch && patch.title) + ')');
assert(patch && patch.priority === 'frog',
  'the created task must be the frog — daily.js only puts priority "frog" in the frog banner');
assert(patch && patch.dueDate == null, 'the created task must stay undated (undated rows land in Today)');
assert(patch && patch.listId === 'inbox', 'the created task must land in the inbox list');
assert(buildOnboardingTask('   ') === null, 'a whitespace-only title must create nothing');
assert(buildOnboardingTask('') === null, 'an empty title must create nothing');
assert(buildOnboardingTask(null) === null, 'a missing title must create nothing');
assert(buildOnboardingTask(undefined) === null, 'an undefined title must create nothing');
assert(Array.isArray([]) && buildOnboardingTask(42).title === '42', 'a non-string title degrades to its text, never throws');

/* ---- 6. purity + the seed flag ---------------------------------------- */
const onboardSrc = stripComments(read('src/js/onboard.js'));
const dom = onboardSrc.match(/\b(document|window|localStorage|sessionStorage|navigator)\b/);
assert(!dom, 'onboard.js must stay pure — found ' + (dom && dom[1]));
assert(!/^\s*import\s/m.test(onboardSrc), 'onboard.js must not import anything (no store, no DOM)');
assert(!/^\s*export\s+(default|let|var)\s/m.test(onboardSrc), 'onboard.js exports must be functions/consts the gate can call');

const seedSrc = read('src/js/seed.js');
const marks = seedSrc.match(/demo:\s*true/g) || [];
assert(marks.length === 1, 'seed.js must set demo:true in exactly one place (found ' + marks.length + ')');
assert(/function add\(lvl, title, extra = \{\}\)[\s\S]{0,400}demo:\s*true/.test(seedSrc),
  'the demo flag must live in the seed builder every row passes through');

/* ---- 7. the flag is actually persisted -------------------------------- */
const mainSrc = read('src/js/main.js');
assert(/setItem\(\s*ONBOARD_SKIP_KEY/.test(mainSrc), 'main.js must persist the skip flag under ONBOARD_SKIP_KEY');
assert(/shouldShowOnboarding\(/.test(mainSrc), 'main.js must consult shouldShowOnboarding');

/* ---- 8. a fresh boot ships no demo data -------------------------------- */
assert(!/\bseedIfNeeded\s*\(/.test(mainSrc),
  'main.js must NOT seed on boot — a fresh install has to start blank (seed.js demo rows such as "Team A Tasks" are gate fixtures only)');
assert(!/from\s+'\.\/seed\.js'/.test(mainSrc), 'main.js must not import seed.js at all');

/* ---- 9. the first-run sheet offers three paths ------------------------- */
const paths = ['import_title', 'onboard_add', 'onboard_blank'].filter((k) => mainSrc.includes(`tr('${k}')`));
assert(paths.length === 3,
  'the first-run sheet must label three paths (import / one task / blank) — found ' + paths.length + (paths.length ? ': ' + paths.join(', ') : ''));
assert(/import\s*\{[^}]*\bopenImportSheet\b[^}]*\}\s*from\s*'\.\/ticktick\.js'/.test(mainSrc),
  'main.js must import openImportSheet from ticktick.js for the import path');
assert(/openImportSheet\(\)/.test(mainSrc), 'the import path must open the TickTick import sheet');
assert(/openOneQuestion\(\)|openQuickAdd\(\)/.test(mainSrc), 'the add-one-task path must open a task entry point');
assert(/const retire = \(\) => \{ markOnboarded\(\);/.test(mainSrc),
  'every path must set the skip flag through one retire() before handing off');

if (failed) {
  console.error(`\n  ✗ onboard       ${failed}/${checks} assertions failed`);
  for (const f of fails) console.error(`      · ${f}`);
  process.exit(1);
}
console.log(`${checks}/${checks} assertions · empty + demo-only ask once · one real task or the skip flag never asks · frog task undated`);
process.exit(0);
