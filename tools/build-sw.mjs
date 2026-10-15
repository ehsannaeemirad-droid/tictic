#!/usr/bin/env node
/* ============================================================
   build-sw.mjs — owns the PRECACHE list in sw.js.
   The shell is every file the app needs to boot offline, so the list
   is derived from the tree, not typed by hand:

     node tools/build-sw.mjs           # check (exit 1 on drift)
     node tools/build-sw.mjs --write   # rewrite the list in sw.js

   Run it after adding, renaming or deleting a module, stylesheet,
   font or icon. `tools/check.mjs` runs the check for you.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SW = path.join(root, 'sw.js');

const walk = (dir, rel = dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    const r = rel === dir ? e.name : path.join(rel === dir ? '' : rel, e.name);
    const relPath = path.relative(root, abs).split(path.sep).join('/');
    if (e.isDirectory()) return walk(abs, relPath.replace(/\/[^/]+$/, ''));
    return [relPath];
  });

/* what must be cached for a cold, offline boot */
const want = [
  './',
  './index.html',
  './manifest.json',
  ...fs.readdirSync(path.join(root, 'src/css')).filter((f) => f.endsWith('.css')).map((f) => `./src/css/${f}`),
  ...fs.readdirSync(path.join(root, 'src/js')).filter((f) => f.endsWith('.js')).map((f) => `./src/js/${f}`),
  ...fs.readdirSync(path.join(root, 'src/js/views')).filter((f) => f.endsWith('.js')).map((f) => `./src/js/views/${f}`),
  ...walk(path.join(root, 'public')).filter((f) => /\.(woff2|svg|png)$/.test(f)).map((f) => `./${f}`),
];

const sortKey = (u) => (u === './' ? 0 : u === './index.html' ? 1 : 2);
const list = [...new Set(want)].sort((a, b) => sortKey(a) - sortKey(b) || a.localeCompare(b));

const source = fs.readFileSync(SW, 'utf8');
const block = source.match(/const PRECACHE = \[[\s\S]*?\n\];/);
if (!block) {
  console.error('sw.js: PRECACHE array not found — nothing to generate');
  process.exit(1);
}
const rendered = 'const PRECACHE = [\n' + list.map((u) => `  '${u}'`).join(',\n') + '\n];';

/* drift = what is on disk vs what sw.js would cache */
const have = new Set([...block[0].matchAll(/'([^']+)'/g)].map((m) => m[1]));
const missing = list.filter((u) => !have.has(u));
const extra = [...have].filter((u) => !list.includes(u));

if (process.argv.includes('--write')) {
  fs.writeFileSync(SW, source.replace(block[0], rendered));
  console.log(`sw.js precache rewritten · ${list.length} entries`);
  process.exit(0);
}

if (missing.length || extra.length) {
  console.error(`sw.js precache is out of date · ${missing.length} missing, ${extra.length} stale`);
  for (const u of missing) console.error('  + ' + u);
  for (const u of extra) console.error('  - ' + u);
  console.error('run: node tools/build-sw.mjs --write');
  process.exit(1);
}
console.log(`sw.js precache is current · ${list.length} entries`);
