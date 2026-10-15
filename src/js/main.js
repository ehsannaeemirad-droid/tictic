/* ============================================================
   TicTic — entry point
   boot (localStorage mirror + IndexedDB) → seed first launch →
   appearance → shell → shortcuts → PWA glue.
   Anything that throws during boot lands on a readable card
   instead of a blank page.
   ============================================================ */
import { S, boot, commit } from './store.js';
import { seedIfNeeded } from './seed.js';
import { setLang, setCalMode, tr } from './i18n.js';
import { render } from './shell.js';
import { openQuickAdd } from './quickadd.js';
import { openBrainDump } from './relief.js';
import { installShortcuts } from './search.js';
import { applyAppearance } from './theme.js';
import { installPWA } from './pwa.js';
import { startAutoSync } from './sync.js';
import { h } from './ui.js';
import { artTorn } from './art.js';

function applySettings() {
  setLang(S.settings.lang || 'fa');
  setCalMode(S.settings.calendar || 'gregorian');
  applyAppearance();
}

/* a readable failure surface — the app never shows a blank page */
function showFatal(detail) {
  const root = document.getElementById('app');
  if (!root) return;
  root.dataset.fatal = '1';
  root.textContent = '';
  root.append(h('div', { class: 'state-card', style: 'margin:24px auto;max-width:560px' },
    artTorn(),
    h('h3', {}, tr('error_title')),
    h('p', {}, tr('error_body')),
    detail ? h('p', { class: 'num', style: 'font-size:12px;color:var(--text-muted);overflow-wrap:anywhere' }, String(detail).slice(0, 300)) : null,
    h('button', { class: 'pick pick--solid', onclick: () => location.reload() }, '↻ ' + tr('error_reload')),
  ));
}

function report(err) {
  console.error('[tictic]', err);
  const app = document.getElementById('app');
  if (app && !app.querySelector('.shell')) showFatal(err);
}

async function start() {
  window.addEventListener('error', e => report(e.error || e.message));
  window.addEventListener('unhandledrejection', e => report(e.reason));
  try {
    await boot();
    applySettings();
    if (seedIfNeeded(S)) commit(() => true);
    render();
    document.addEventListener('rerender', () => render());
    installShortcuts();
    installPWA();
    startAutoSync();            /* no-op unless sync is configured + enabled */
    handleLaunchParams();
  } catch (err) {
    report(err);
  }
}

/* Launcher shortcuts (manifest) arrive as ?do=… */
function handleLaunchParams() {
  const what = new URLSearchParams(location.search).get('do');
  if (what === 'quickadd') openQuickAdd();
  else if (what === 'dump') openBrainDump();
  else if (what === 'plan') { S.ui.route = 'plan'; commit(() => true); }
}

start();
