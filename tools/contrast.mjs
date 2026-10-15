/* ============================================================
   tools/contrast.mjs — WCAG 2.2 AA gate for the theme tokens
   Reads src/css/tokens.css and reproduces the cascade:
     :root → [data-scheme="dark"] (when the theme is dark) → [data-theme] → [data-accent]
   then checks every text/background pair the UI actually renders.
   Exits non-zero on any failure, so CI can gate on it.
   Usage:  node tools/contrast.mjs [--all]
   ============================================================ */
import fs from 'fs';

const css = fs.readFileSync('src/css/tokens.css', 'utf8');
const ALL = process.argv.includes('--all');

/* ---- tiny CSS block reader: returns the declarations of the block that
        starts at the brace after `re`'s first match ---- */
function parseBlockAt(index) {
  const start = css.indexOf('{', index);
  let depth = 0, i = start;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) break;
  }
  const out = {};
  for (const m of css.slice(start + 1, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
function findBlocks(re) {
  const out = [];
  for (const m of css.matchAll(re)) out.push({ sel: m[0], tokens: parseBlockAt(m.index) });
  return out;
}

const base = parseBlockAt(css.indexOf(':root {'));
const darkScheme = findBlocks(/^:root\[data-scheme="dark"\]\s*\{/gm)[0]?.tokens ?? {};
const themeBlocks = findBlocks(/^:root\[data-theme="([\w-]+)"\]\s*\{/gm);
const accentBlocks = new Map();
for (const b of findBlocks(/^:root\[data-accent="([\w-]+)"\]\s*\{/gm)) accentBlocks.set(/data-accent="([\w-]+)"/.exec(b.sel)[1], b.tokens);
const darkAccentBlocks = new Map();
for (const b of findBlocks(/^:root\[data-scheme="dark"\]\[data-accent="([\w-]+)"\]\s*\{/gm)) darkAccentBlocks.set(/data-accent="([\w-]+)"/.exec(b.sel)[1], b.tokens);
/* one theme may need a deeper accent than paper white does */
const themeAccentBlocks = new Map();   /* "theme/accent" -> tokens */
for (const b of findBlocks(/^:root\[data-theme="([\w-]+)"\]\[data-accent="([\w-]+)"\]\s*\{/gm)) {
  const [, t, a] = /data-theme="([\w-]+)"\]\[data-accent="([\w-]+)"/.exec(b.sel);
  themeAccentBlocks.set(`${t}/${a}`, { ...(themeAccentBlocks.get(`${t}/${a}`) ?? {}), ...b.tokens });
}

/* ---- colour maths ---- */
function parseColor(v) {
  if (!v) return null;
  v = v.trim();
  const hex = v.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const p = rgb[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  if (v === 'transparent') return [0, 0, 0, 0];
  return null;
}
function resolve(v, map, seen = 0) {
  if (!v || seen > 8) return null;
  v = v.trim();
  const varM = v.match(/^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/);
  if (varM) {
    const next = map[varM[1]] ?? varM[2];
    return next ? resolve(next, map, seen + 1) : null;
  }
  const mix = v.match(/^color-mix\(in srgb,\s*([^,]+?)\s+([\d.]+)%,\s*(.+)\)$/i);
  if (mix) {
    const a = resolve(mix[1], map, seen + 1);
    const b = resolve(mix[3].trim(), map, seen + 1);
    const w = parseFloat(mix[2]) / 100;
    if (!a) return b;
    if (!b) return a;
    const c = i => [a[i] * w + b[i] * (1 - w)];
    const alpha = a[3] * w + b[3] * (1 - w);
    return [0, 1, 2].map(i => a[i] * w + b[i] * (1 - w)).concat(alpha);
  }
  return parseColor(v);
}
const lum = ([r, g, b]) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const over = (fg, bg) => (fg[3] >= 1 ? fg : [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1));
function ratio(fg, bg) {
  const f = over(fg, bg);
  const [a, b] = [lum(f), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/* ---- the pairs the UI renders: [fg, bg, min, label] ---- */
const PAIRS = [
  ['--text', '--bg', 4.5, 'body text on page'],
  ['--text', '--surface', 4.5, 'text on cards'],
  ['--text', '--surface-2', 4.5, 'text on raised surfaces'],
  ['--text-2', '--bg', 4.5, 'secondary text'],
  ['--text-2', '--surface', 4.5, 'secondary text on cards'],
  ['--text-muted', '--bg', 4.5, 'muted meta text'],
  ['--text-muted', '--surface', 4.5, 'muted meta text on cards'],
  ['--accent', '--bg', 4.5, 'accent text on page (nav, times)'],
  ['--accent', '--surface', 4.5, 'accent text on cards'],
  ['--accent-contrast', '--accent', 4.5, 'label on filled accent button'],
  ['--danger', '--surface', 4.5, 'destructive text'],
  ['--success', '--surface', 4.5, 'success text'],
  ['--warning', '--surface', 4.5, 'warning text'],
  ['--priority-frog', '--surface', 4.5, 'frog priority label'],
  ['--priority-high', '--surface', 4.5, 'high priority label'],
  ['--priority-med', '--surface', 4.5, 'medium priority label'],
  ['--priority-low', '--surface', 4.5, 'low priority label'],
  ['--priority-none', '--surface', 4.5, 'neutral priority label'],
  ['--overdue', '--surface', 4.5, 'overdue label (grey on purpose)'],
  ['--text', '--surface-hover', 4.5, 'text on hovered row'],
  ['--text-2', '--accent-soft', 4.5, 'text on active/soft accent row'],
  ['--accent', '--accent-soft', 3.0, 'accent on its own soft tint (nav icon)'],
];

/* themes that exist as blocks + the implicit default (paper) */
const themes = [{ name: 'paper', tokens: { ...base } }];
for (const b of themeBlocks) {
  const name = /data-theme="([\w-]+)"/.exec(b.sel)[1];
  let t = { ...base };
  if (b.tokens['--theme-scheme'] === 'dark') t = { ...t, ...darkScheme };
  t = { ...t, ...b.tokens };
  themes.push({ name, tokens: t });
}
const accents = [{ name: '(theme default)', tokens: {} }];
for (const [name, tokens] of accentBlocks) accents.push({ name, tokens });

/* ---- run ---- */
let failures = 0, checks = 0;
const rows = [];
for (const theme of themes) {
  const isDark = theme.tokens['--theme-scheme'] === 'dark';
  for (const accent of accents) {
    const tokens = {
      ...theme.tokens,
      ...accent.tokens,
      ...(isDark ? darkAccentBlocks.get(accent.name) ?? {} : {}),
      ...(themeAccentBlocks.get(`${theme.name}/${accent.name}`) ?? {}),
    };
    const vals = PAIRS.map(([fg, bg, min, label]) => {
      const f = resolve(tokens[fg], tokens);
      const b = resolve(tokens[bg], tokens);
      if (!f || !b) return { label, r: null, min, unresolved: f ? bg : fg };
      return { label, r: ratio(f, b), min };
    });
    const worst = vals.reduce((a, x) => (x.r != null && (!a || x.r < a.r) ? x : a), null);
    const fails = vals.filter(v => v.r == null || v.r + 1e-9 < v.min);
    checks += vals.length;
    failures += fails.length;
    rows.push({ theme: theme.name, accent: accent.name, worst, fails });
  }
}
const showAll = ALL || failures > 0;
for (const row of rows) {
  const tag = `${row.theme}/${row.accent}`;
  if (row.fails.length === 0) {
    if (showAll) console.log(`${tag.padEnd(30)} ok   · worst ${row.worst.label} ${row.worst.r.toFixed(2)}`);
    continue;
  }
  console.log(`${tag.padEnd(30)} ${row.fails.length} FAIL`);
  for (const f of row.fails) console.log(`    ${f.unresolved ? `unresolved ${f.unresolved}` : `${f.r.toFixed(2)} < ${f.min}`}   ${f.label}`);
}
console.log(`\n${checks} pairs checked across ${themes.length} themes × ${accents.length - 1 + 1} accents · ${failures} failing`);
process.exit(failures ? 1 : 0);
