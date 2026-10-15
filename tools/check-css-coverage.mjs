#!/usr/bin/env node
/* ============================================================
   check-css-coverage.mjs — every class the app renders must have a
   rule that styles it, and no CSS class may be orphaned.

   A class appearing anywhere in a selector is not enough: `.dump-list
   .pick {}` styles `.pick` *inside* a dump list, so a `.pick` elsewhere
   is still unstyled. Only the rightmost compound counts.

     node tools/check-css-coverage.mjs     exit 1 = gaps or orphans
   ============================================================ */
import fs from 'node:fs';

const cssFiles = fs.readdirSync('src/css').filter((f) => f.endsWith('.css'));
const jsFiles = [
  ...fs.readdirSync('src/js').filter((f) => f.endsWith('.js')).map((f) => `src/js/${f}`),
  ...fs.readdirSync('src/js/views').filter((f) => f.endsWith('.js')).map((f) => `src/js/views/${f}`),
];
const html = fs.readFileSync('index.html', 'utf8');

/* classes that appear in the rightmost compound of a rule with a declaration */
const styled = new Map();
for (const file of cssFiles) {
  const src = fs.readFileSync(`src/css/${file}`, 'utf8');
  for (const [, selText, body] of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/[-a-z]+\s*:/.test(body)) continue;                       /* skip empty rules / at-rule headers */
    for (const sel of selText.split(',')) {
      const last = sel.trim().split(/\s+|>/).filter(Boolean).pop() || '';
      for (const m of last.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
        if (!styled.has(m[1])) styled.set(m[1], file);
      }
    }
  }
}

/* classes the app actually renders */
const used = new Map();
const note = (t, where) => { if (!used.has(t)) used.set(t, new Set()); used.get(t).add(where); };
for (const f of jsFiles) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/class:\s*'([^']*)'/g)) for (const t of m[1].split(/\s+/)) if (t) note(t, f.replace('src/js/', ''));
  for (const m of s.matchAll(/classList\.(?:add|toggle)\('([^']+)'/g)) note(m[1], f.replace('src/js/', ''));
}
for (const m of html.matchAll(/class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) note(t, 'index.html');

const unstyled = [...used.keys()].filter((t) => !styled.has(t)).sort();
const orphans = [...styled.keys()].filter((t) => !used.has(t)).sort();

for (const t of unstyled) console.log(`  UNSTYLED ${t.padEnd(18)} used in ${[...used.get(t)].slice(0, 4).join(', ')}`);
for (const t of orphans) console.log(`  ORPHAN   ${t.padEnd(18)} defined in ${styled.get(t)}`);
console.log(`classes used: ${used.size} · styled: ${used.size - unstyled.length} · unstyled: ${unstyled.length} · orphan rules: ${orphans.length}`);
