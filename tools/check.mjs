#!/usr/bin/env node
/* ============================================================
   check.mjs — one command, the whole gate. CI runs this.

     npm run check      (= node tools/check.mjs)

   Gates, cheapest first:
     syntax        every module parses (node --check)
     usage         no call to an identifier that is never imported/declared
     css           every rendered class has a rule
     tokens        every custom property referenced is defined
     i18n          fa and en carry the same keys
     manifest      parseable, icons on disk, maskable + 192 + 512 present
     offline-url   no CDN or third-party URL in any runtime file
     console       no console.log left in the app
     sw-precache   sw.js precache list matches the tree
     contrast      WCAG 2.2 AA across every theme × accent
     calendar      Jalali conversion vs ICU, day by day
     roundtrip     TickTick export → import reproduces the data
     horizons      no row lands in two groups of one view (duplicate rows)
     onboard       first run asks one question, and only once
     sync-merge    device sync merges without losing or resurrecting a task

   Exit 0 only when every gate passes.
   ============================================================ */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const results = [];
const run = (name, cmd, args, { allowFail = false } = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 180000 });
  const ok = r.status === 0;
  results.push({ name, ok: ok || allowFail, hard: ok, detail: (r.stdout || '').trim().split('\n').slice(-1)[0] || (r.stderr || '').trim().split('\n')[0] || '' });
  return r;
};
const inline = (name, fn) => {
  try {
    const msg = fn() || '';
    results.push({ name, ok: true, hard: true, detail: msg });
  } catch (e) {
    results.push({ name, ok: false, hard: false, detail: e.message });
  }
};

/* ---- 1. syntax ---------------------------------------------------------- */
const js = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, f));
const allJs = [...js('src/js'), ...js('src/js/views'), ...js('tools'), 'index.html'];
inline('syntax', () => {
  const bad = [];
  for (const f of allJs) {
    if (f.endsWith('.html')) continue;
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) bad.push(`${f}: ${(r.stderr || '').trim().split('\n')[0]}`);
  }
  if (bad.length) throw new Error(bad.join(' · '));
  return `${allJs.length} modules parse`;
});

run('usage', process.execPath, ['tools/check-usage.mjs']);
run('css', process.execPath, ['tools/check-css-coverage.mjs']);

/* ---- 4. every referenced custom property is defined -------------------- */
inline('tokens', () => {
  /* definitions: a `--x:` declaration in CSS (comments stripped) or in a JS
     inline style / setProperty call. References: `var(--x` anywhere. */
  const cssFiles = ['tokens', 'base', 'components', 'shell', 'views'].map((f) => `src/css/${f}.css`);
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const defined = new Set();
  const referenced = new Set();
  const fallback = new Set();
  const collect = (src) => {
    for (const m of src.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
    for (const m of src.matchAll(/setProperty\(\s*['"](--[\w-]+)/g)) defined.add(m[1]);
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*(,|\))/g)) {
      /* var(--x, fallback) is self-sufficient; var(--x) must be defined */
      if (m[2] === ',') fallback.add(m[1]); else referenced.add(m[1]);
    }
  };
  for (const f of cssFiles) collect(stripComments(fs.readFileSync(f, 'utf8')));
  for (const f of [...js('src/js'), ...js('src/js/views'), 'index.html']) collect(fs.readFileSync(f, 'utf8'));
  const missing = [...referenced].filter((v) => !defined.has(v));
  if (missing.length) throw new Error(`undefined custom properties: ${missing.join(', ')}`);
  return `${defined.size} tokens defined · ${referenced.size} var() without fallback · ${fallback.size} with fallback · all resolve`;
});

/* ---- 5. i18n parity (i18n.js is an ES module, so run it in a child) --- */
run('i18n', process.execPath, ['--input-type=module', '-e', `
  const { STRINGS } = await import('./src/js/i18n.js');
  const fa = Object.keys(STRINGS.fa || {}), en = Object.keys(STRINGS.en || {});
  const onlyFa = fa.filter(k => !en.includes(k)), onlyEn = en.filter(k => !fa.includes(k));
  if (onlyFa.length || onlyEn.length) { console.error('fa-only: [' + onlyFa + '] en-only: [' + onlyEn + ']'); process.exit(1); }
  console.log(fa.length + ' keys, identical in fa and en');
`]);

/* ---- 6. manifest ------------------------------------------------------- */
inline('manifest', () => {
  const m = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const need = ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color'];
  const missing = need.filter((k) => !m[k]);
  if (missing.length) throw new Error(`missing fields: ${missing.join(', ')}`);
  for (const icon of m.icons || []) {
    if (!fs.existsSync(icon.src)) throw new Error(`icon not on disk: ${icon.src}`);
  }
  const sizes = (m.icons || []).map((i) => i.sizes);
  if (!sizes.includes('192x192') || !sizes.includes('512x512')) throw new Error('needs 192 and 512 icons');
  if (!(m.icons || []).some((i) => i.purpose === 'maskable')) throw new Error('needs a maskable icon');
  return `${(m.icons || []).length} icons on disk · 192/512/maskable present`;
});

/* ---- 7 + 8. offline purity and console discipline ---------------------- */
inline('offline-url', () => {
  const files = ['index.html', 'manifest.json', 'sw.js', ...js('src/js'), ...js('src/js/views'), ...js('src/css')];
  const hits = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
      if (/w3\.org|example\.com|localhost|127\.0\.0\.1/.test(m[0])) continue;   /* namespaces, docs, tests */
      hits.push(`${f}: ${m[0]}`);
    }
  }
  if (hits.length) throw new Error(hits.join(' · '));
  return 'no third-party URL in any runtime file';
});
inline('console', () => {
  const hits = [];
  for (const f of [...js('src/js'), ...js('src/js/views'), 'index.html']) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/console\.log\(/g)) hits.push(`${f}:${src.slice(0, m.index).split('\n').length}`);
  }
  if (hits.length) throw new Error(`console.log left behind: ${hits.join(', ')}`);
  return 'console.log-free';
});

/* ---- 9–12. the heavier gates ------------------------------------------ */
run('sw-precache', process.execPath, ['tools/build-sw.mjs']);
run('contrast', process.execPath, ['tools/contrast.mjs', '--all']);
run('calendar', process.execPath, ['tools/calendar.mjs']);
run('roundtrip', process.execPath, ['tools/roundtrip.mjs']);
run('horizons', process.execPath, ['tools/check-horizons.mjs']);
run('onboard', process.execPath, ['tools/check-onboard.mjs']);
run('sync-merge', process.execPath, ['tools/check-sync.mjs']);

/* ---- report ------------------------------------------------------------ */
const pad = Math.max(...results.map((r) => r.name.length));
console.log('');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(pad)}  ${r.detail}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} gates passed`);
if (failed.length) {
  console.log(`failed: ${failed.map((f) => f.name).join(', ')}`);
  process.exit(1);
}
