/* ============================================================
   theme-boot.js — classic, runs in <head> before first paint.
   Single source of truth for the theme table: the module layer
   (theme.js) reads window.__TICTIC_THEMES back from here.
   ============================================================ */
(function () {
  var THEMES = [
    { id: 'paper',         scheme: 'light', label: { fa: 'کاغذ',        en: 'Paper' } },
    { id: 'sepia',         scheme: 'light', label: { fa: 'سپیا',        en: 'Sepia' } },
    { id: 'mint',          scheme: 'light', label: { fa: 'نعنا',        en: 'Mint' } },
    { id: 'midnight',      scheme: 'dark',  label: { fa: 'نیمه‌شب',     en: 'Midnight' } },
    { id: 'neon',          scheme: 'dark',  label: { fa: 'نئون',        en: 'Neon' } },
    { id: 'terminal',      scheme: 'dark',  label: { fa: 'ترمینال',     en: 'Terminal' } },
    { id: 'contrast',      scheme: 'light', label: { fa: 'کنتراست بالا', en: 'High contrast' } },
    { id: 'contrast-dark', scheme: 'dark',  label: { fa: 'کنتراست تاریک', en: 'High contrast dark' } }
  ];
  var ACCENTS = ['auto', 'clay', 'blue', 'green', 'violet', 'amber', 'teal', 'rose'];
  window.__TICTIC_THEMES = THEMES;
  window.__TICTIC_ACCENTS = ACCENTS;

  var root = document.documentElement;
  var settings = {};
  try { settings = (JSON.parse(localStorage.getItem('tictic.v1') || '{}') || {}).settings || {}; } catch (e) { settings = {}; }

  var byId = {};
  THEMES.forEach(function (t) { byId[t.id] = t; });
  var pref = settings.theme || 'system';
  var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var id = pref === 'system' || !byId[pref] ? (systemDark ? 'midnight' : 'paper') : pref;
  var accent = settings.accent || 'auto';

  window.__TICTIC_RESOLVED_THEME = id;
  root.dataset.theme = id;
  root.dataset.scheme = byId[id].scheme;
  if (accent !== 'auto') root.dataset.accent = accent;
  if (settings.motion === 'off') root.dataset.motion = 'off';
  if (settings.contrast === 'more') root.dataset.contrast = 'more';

  /* keep the browser chrome in step with the palette */
  function paintMeta() {
    try {
      var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (!bg) return;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
      meta.content = bg;
    } catch (e) { /* first paint only */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintMeta);
  else paintMeta();
  window.addEventListener('load', paintMeta);
})();
