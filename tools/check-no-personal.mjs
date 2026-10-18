#!/usr/bin/env node
/* ============================================================
   check-no-personal.mjs — the personal-data canary.

   Bug #23 removed real names and real task text from seed.js and
   timetable.js. This gate is what stops them coming back: it greps
   every SHIPPED file for the exact strings that were scrubbed and
   fails if even one reappears.

     node tools/check-no-personal.mjs     exit 1 = a scrubbed token is back

   Where the tokens come from: `tools/scrub-history.txt`, the same
   file `git filter-repo` used for the history rewrite, so the gate
   and the rewrite cannot drift. That file is gitignored (it has to
   name the personal strings), so on a fresh clone it is absent —
   there the gate falls back to the inlined copy below and says so.
   Keep the two in sync; the gate warns when their counts differ.

   Scope is deliberate: src/, samples/, index.html, manifest.json,
   sw.js — what ships. It does NOT scan tools/ or *.md, which name
   the tokens on purpose (this file, LAUNCH_REVIEW.md row 23, the
   .gitignore comment). Matching is case-sensitive and textual.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const SCRUB = 'tools/scrub-history.txt';
const TARGETS = ['src', 'samples', 'index.html', 'manifest.json', 'sw.js'];

/* the 27 scrubbed literals, verbatim from tools/scrub-history.txt (OLD side).
   Used only when the scrub file is missing, i.e. on a fresh clone. */
const FALLBACK = [
  "Evidence: user-supplied dictation, October 2026. TODO: verify",
  "The user's real commitments: school, wife pickup, classes.",
  "exact weekday name mapping (Iranian week starts Saturday).",
  "TicTic ADHD — Weekly timetable (user-provided)",
  "قوانین احداث مدرسه هوم اسکول + هوش مصنوعی",
  "درخواست خروج پول های تاکی",
  "بیمه شخص ثالث ماشین",
  "مقاومت به انسولین",
  "مربیگری شطرنج",
  "نوبت آزمایش",
  "صندوق نسرین",
  "داوری شطرنج",
  "قسط مسکن",
  "بانک ملی",
  "نت سیما",
  "مرادیان",
  "ابراهیم",
  "Hitalki",
  "تارنوم",
  "skyeng",
  "تارنم",
  "سمیرا",
  "Mona",
  "سارا",
  "لیلی",
  "صدرا",
  "ندال",
];

/* ---- tokens: the scrub file wins, the fallback covers a fresh clone ---- */
let tokens = FALLBACK;
let source = 'inlined fallback (27 literals)';
if (fs.existsSync(SCRUB)) {
  const body = fs.readFileSync(SCRUB, 'utf8');
  const parsed = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^literal:(.*)==>/);
    if (m && m[1]) parsed.push(m[1]);
  }
  if (!parsed.length) {
    console.error(`FAIL  ${SCRUB} exists but yielded no literal:OLD==>NEW tokens`);
    process.exit(1);
  }
  tokens = parsed;
  source = SCRUB;
  if (parsed.length !== FALLBACK.length) {
    console.log(`  WARN  ${SCRUB} has ${parsed.length} tokens, inlined fallback has ${FALLBACK.length} — update the fallback`);
  }
} else {
  console.log(`  WARN  ${SCRUB} is absent (gitignored, expected on a fresh clone) — using the inlined fallback`);
}

/* ---- files that actually ship ---- */
const files = [];
const walk = (p) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p).sort()) walk(path.join(p, e));
    return;
  }
  files.push(p.split(path.sep).join('/'));
};
for (const t of TARGETS) if (fs.existsSync(t)) walk(t);

/* ---- the canary ---- */
const hits = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const tok of tokens) {
      if (lines[i].includes(tok)) hits.push(`${f}:${i + 1}  ${tok}`);
    }
  }
}

if (hits.length) {
  for (const h of hits) console.log(`  LEAK  ${h}`);
  console.error(`FAIL  ${hits.length} scrubbed token match(es) in ${files.length} shipped file(s)`);
  process.exit(1);
}
console.log(`0 scrubbed tokens in ${files.length} shipped files \u00b7 ${tokens.length} tokens from ${source}`);
