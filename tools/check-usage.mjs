#!/usr/bin/env node
/* ============================================================
   check-usage.mjs — catches the classic ES-module foot-gun: an
   identifier is CALLED in a module but is neither imported there
   nor declared there (a runtime TypeError, invisible to --check).

     node tools/check-usage.mjs     exit 1 = a missing import
   ============================================================ */
import fs from 'node:fs';

const dirs = ['src/js', 'src/js/views'];
const files = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`));
const watch = ['tr', 'N', 'h', 'sv', 'icons', 'commit', 'persist', 'uid', 'makeTask', 'byId', 'upsertTask',
  'sheet', 'snackbar', 'announce', 'openDetail', 'startFocus', 'parseISO', 'fmtDate', 'iso', 'dayName', 'matchQuery'];
const wordChar = (c) => /[A-Za-z0-9_$]/.test(c);

let issues = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  /* every binding a module gets from an import — static and dynamic */
  const imported = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]+)\}/g)) {
    for (const name of m[1].split(',')) {
      const n = name.trim().split(/\s+as\s+/).pop().trim();
      if (n) imported.add(n);
    }
  }
  for (const m of src.matchAll(/import\s*\(\s*['"][^'"]+['"]\s*\)\s*\.then\s*\(\s*\(\s*\{([^}]+)\}/g)) {
    /* import('./x.js').then(({ sheet }) => …) binds the same way */
    for (const name of m[1].split(',')) { const n = name.trim(); if (n) imported.add(n); }
  }
  const declared = (n) => new RegExp(`(function|const|let|var|class|export\\s+(function|const|let|var))\\s+${n}\\b`).test(src);

  /* find `ident(` where ident is watched and not `.method(` */
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '(') continue;
    let j = i - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    let k = j;
    while (k >= 0 && wordChar(src[k])) k--;
    const ident = src.slice(k + 1, j + 1);
    if (!ident || !watch.includes(ident)) continue;
    if (k >= 0 && (src[k] === '.' || src[k] === '$')) continue;         /* method call */
    if (imported.has(ident) || declared(ident)) continue;
    console.log(`MISSING ${ident}() in ${f}`);
    issues++;
  }
}
console.log(issues ? `${issues} missing-import issue(s)` : 'no missing-import issues');
process.exit(issues ? 1 : 0);
