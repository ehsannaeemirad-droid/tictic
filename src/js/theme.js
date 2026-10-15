/* ============================================================
   TicTic — appearance
   One place that decides what the app looks like: theme palette,
   light/dark scheme, accent hue, motion, contrast. The classic
   bootstrap (theme-boot.js) applies the same values before first
   paint; this module re-applies them when Settings changes.
   ============================================================ */
import { S, persist } from './store.js';

/* the table itself lives in theme-boot.js so there is exactly one copy */
export const THEMES = window.__TICTIC_THEMES || [
  { id: 'paper', scheme: 'light', label: { fa: 'کاغذ', en: 'Paper' } },
  { id: 'midnight', scheme: 'dark', label: { fa: 'نیمه‌شب', en: 'Midnight' } },
];
export const ACCENTS = window.__TICTIC_ACCENTS || ['auto', 'clay', 'blue'];

export const SYSTEM_ID = { light: 'paper', dark: 'midnight' };

export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0];
export const themeName = (t, lang) => t.label[lang] || t.label.en;

export function resolveThemeId(pref) {
  if (pref && pref !== 'system') return themeById(pref).id;
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  return dark ? SYSTEM_ID.dark : SYSTEM_ID.light;
}

/* what the picker should show as active (the concrete palette, not "system") */
export function currentThemeId() { return resolveThemeId(S.settings.theme); }

export function applyAppearance() {
  const root = document.documentElement;
  const id = currentThemeId();
  const theme = themeById(id);
  root.dataset.theme = id;
  root.dataset.scheme = theme.scheme;

  const accent = S.settings.accent || 'auto';
  if (accent === 'auto') delete root.dataset.accent;
  else root.dataset.accent = accent;

  root.dataset.motion = S.settings.motion === 'off' ? 'off' : 'on';
  if (S.settings.contrast === 'more') root.dataset.contrast = 'more';
  else delete root.dataset.contrast;

  paintThemeColor();
}

export function setTheme(pref) {
  S.settings.theme = pref;
  persist();
  applyAppearance();
}
export function setAccent(accent) {
  S.settings.accent = accent;
  persist();
  applyAppearance();
}

/* the browser chrome follows the palette */
export function paintThemeColor() {
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (!bg) return;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = bg;
  } catch (e) { /* non-fatal */ }
}

/* follow the OS while the user is on "system" */
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => { if (!S.settings.theme || S.settings.theme === 'system') applyAppearance(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}
