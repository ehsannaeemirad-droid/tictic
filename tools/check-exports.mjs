#!/usr/bin/env node
/* ============================================================
   check-exports.mjs — the unused-export gate.

     node tools/check-exports.mjs      exit 1 = an export nobody uses

   Why it exists. LAUNCH_REVIEW.md recorded that "nothing checks for unused
   exports": the `usage` gate catches a MISSING import, and says nothing about
   an export no one calls. Two helpers (`inHorizon`/`inView`) sat dead in
   tasks.js carrying a stale date convention and were found by hand.

   Zero dependencies. It parses export declarations, resolves every static
   import specifier to a real file, and reports an export that is
     · never imported (by any file in the tree), AND
     · never referenced in its own file either.

   Deliberate limits, stated rather than hidden:
     · static imports only. A dynamic `import('./x.js').then(m => m.name())`
       is not resolved to a binding — such names are reported as findings and
       must be allowlisted with a reason (they are printed with the dynamic
       site that uses them, so the reason is evidence, not assertion).
     · name matching is textual. An export called `visible` counts as used if
       any file mentions `visible`, even a same-named local elsewhere. That
       direction is safe: it can miss a dead export, never invent one.
     · it does not check class members, only top-level exports.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const read = (p) => fs.readFileSync(p, 'utf8');

/* every source file the app ships, plus the tools that import them */
const srcFiles = [];
const walkSrc = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSrc(p);
    else if (e.name.endsWith('.js')) srcFiles.push(rel(p));
  }
};
walkSrc(path.join(root, 'src', 'js'));
const toolFiles = fs.readdirSync(path.join(root, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => `tools/${f}`);
const allFiles = [...srcFiles, ...toolFiles];

/* ---- export declarations ---------------------------------------------- */
const PATTERNS = [
  /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
  /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  /export\s+class\s+([A-Za-z_$][\w$]*)/g,
];
const exportsOf = (file) => {
  const src = read(path.join(root, file));
  const found = new Map();                       /* name -> declaration line */
  const lineOf = (idx) => src.slice(0, idx).split('\n').length;
  for (const re of PATTERNS) {
    for (const m of src.matchAll(re)) if (!found.has(m[1])) found.set(m[1], lineOf(m.index));
  }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/).pop().trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && !found.has(name)) found.set(name, lineOf(m.index));
    }
  }
  return { src, found };
};

/* ---- imports, resolved to files -------------------------------------- */
const resolveSpec = (fromFile, spec) => {
  if (!spec.startsWith('.')) return null;
  const abs = path.resolve(path.join(root, path.dirname(fromFile)), spec);
  return rel(abs);
};
const importedNames = new Map();                 /* `${file}::${name}` -> importing file */
const dynamicSites = [];                         /* { file, spec, names } */
for (const file of allFiles) {
  const src = read(path.join(root, file));
  const add = (spec, name) => {
    const target = resolveSpec(file, spec);
    if (target) importedNames.set(`${target}::${name}`, file);
  };
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/)[0].trim();
      if (name) add(m[2], name);
    }
  }
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g)) add(m[2], 'default');
  for (const m of src.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\.then\s*\(\s*\(\s*\{([^}]*)\}/g)) {
    const names = m[2].split(',').map((n) => n.trim()).filter(Boolean);
    for (const n of names) add(m[1], n);
    dynamicSites.push({ file, spec: m[1], names });
  }
  /* the other dynamic shape: import('./x.js').then(ns => … ns.name(…) …) — the
     namespace is captured, then member calls on it inside the same window */
  for (const m of src.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)([\s\S]{0,500})/g)) {
    /* stop at the NEXT dynamic import, or shell.js's two adjacent loaders would
       both be attributed to the first one */
    const window = m[2].split(/import\s*\(/)[0];
    const ns = window.match(/\.then\s*\(\s*([A-Za-z_$][\w$]*)\s*=>/);
    if (!ns) continue;
    const names = [...window.matchAll(new RegExp(`\\b${ns[1]}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, 'g'))].map((x) => x[1]);
    if (names.length) dynamicSites.push({ file, spec: m[1], names: [...new Set(names)] });
  }
}

/* ---- allowlist -------------------------------------------------------- */
const allowPath = path.join(root, 'tools', 'exports-allowlist.json');
const allowRaw = fs.existsSync(allowPath) ? JSON.parse(read(allowPath)) : {};
/* keys beginning with _ are the file's own documentation, not entries */
const allow = Object.fromEntries(Object.entries(allowRaw).filter(([k]) => !k.startsWith('_')));
const allowKeys = new Set(Object.keys(allow));

/* ---- findings --------------------------------------------------------- */
const findings = [];
const usedAllow = new Set();
for (const file of srcFiles) {
  const { src, found } = exportsOf(file);
  for (const [name, line] of found) {
    if (importedNames.has(`${file}::${name}`)) continue;
    /* referenced in its own file, beyond the declaration line itself? */
    const occurrences = [...src.matchAll(new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`, 'g'))]
      .map((m) => src.slice(0, m.index).split('\n').length);
    if (occurrences.filter((ln) => ln !== line).length > 0) continue;

    const elsewhere = allFiles.filter((f) => f !== file && new RegExp(`\\b${name}\\b`).test(read(path.join(root, f))));
    const key = `${file}::${name}`;
    if (allowKeys.has(key)) { usedAllow.add(key); continue; }
    findings.push({ key, name, file, line, elsewhere, dynamic: dynamicSites.filter((d) => d.names.includes(name)) });
  }
}

/* ---- report ----------------------------------------------------------- */
const stale = [...allowKeys].filter((k) => !usedAllow.has(k));
if (findings.length || stale.length) {
  console.error(`\n  ✗ exports       ${findings.length} unused export(s), ${stale.length} stale allowlist entry(ies)`);
  for (const f of findings) {
    console.error(`      · ${f.key} (line ${f.line}) — no import anywhere`);
    for (const d of f.dynamic) {
      const via = d.names.filter((n) => n === f.name).join(', ');
      console.error(`          dynamic use in ${d.file} via ${d.spec} → ${via}(…)`);
    }
    if (!f.dynamic.length && f.elsewhere.length) console.error(`          name appears in: ${f.elsewhere.slice(0, 3).join(', ')}`);
  }
  for (const s of stale) console.error(`      · stale allowlist entry (no such finding now): ${s}`);
  console.error('      allowlist with a reason in tools/exports-allowlist.json (or delete the export)');
  process.exit(1);
}
/* the allowlist's composition is printed on every run: a gate whose allowlist
   is mostly dead code has to say so, not look strong because it is green */
const byTag = {};
for (const [key, reason] of Object.entries(allow)) {
  const tag = String(reason).split(':')[0].trim() || 'uncategorised';
  byTag[tag] = (byTag[tag] || 0) + 1;
}
const parts = Object.entries(byTag).map(([tag, n]) => `${n} ${tag}`);
console.log(`${srcFiles.length} src modules · allowlist ${allowKeys.size}${parts.length ? ` (${parts.join(', ')})` : ''} · no unused exports`);
process.exit(0);
process.exit(0);
