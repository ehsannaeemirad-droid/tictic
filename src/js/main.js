/* ============================================================
   TicTic — entry point
   boot (localStorage mirror + IndexedDB) → first-run sheet →
   appearance → shell → shortcuts → PWA glue.
   Anything that throws during boot lands on a readable card
   instead of a blank page.
   ============================================================ */
import { S, boot, commit, makeTask } from './store.js';
import { shouldShowOnboarding, buildOnboardingTask, ONBOARD_SKIP_KEY } from './onboard.js';
import { sheet } from './components.js';
import { setLang, setCalMode, tr } from './i18n.js';
import { render } from './shell.js';
import { openQuickAdd } from './quickadd.js';
import { openImportSheet } from './ticktick.js';
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

/* ---- first run ------------------------------------------------
   A fresh install ships no data, so Today is genuinely empty and the
   first-run sheet offers three ways in: bulk import, one task, or a
   blank start. "No task of the user's own" is still the signal that
   decides whether to ask (onboard.js) — an existing user never sees it. */
function onboardSkipped() {
  try { return localStorage.getItem(ONBOARD_SKIP_KEY) === '1'; } catch (e) { return false; }
}
function markOnboarded() {
  try { localStorage.setItem(ONBOARD_SKIP_KEY, '1'); } catch (e) { /* private mode */ }
}

function openOnboarding() {
  let sh = null;
  /* every path retires the sheet — the flag is set before the next screen
     opens, so a reload (or an import that takes a while) cannot re-ask */
  const retire = () => { markOnboarded(); sh?.close(); };
  const fromTickTick = h('button', {
    class: 'pick pick--solid', style: 'width:100%;min-height:46px',
    onclick: () => { retire(); openImportSheet(); },
  }, '📥 ' + tr('import_title'));
  const oneTask = h('button', {
    class: 'pick pick--solid', style: 'width:100%;min-height:46px',
    onclick: () => { retire(); openOneQuestion(); },
  }, '➕ ' + tr('onboard_add'));
  const blank = h('button', {
    class: 'pick pick--quiet', style: 'width:100%',
    onclick: retire,
  }, tr('onboard_blank'));
  sh = sheet(tr('onboard_title'), h('div', { style: 'display:grid;gap:10px' },
    h('p', { style: 'margin:0;color:var(--text-muted)' }, tr('onboard_lead')),
    fromTickTick, oneTask, blank));
  return sh;
}

/* the one-question path: the same frog task the sheet used to ask for,
   kept as its own step so “add one task” stays one decision */
function openOneQuestion() {
  const input = h('input', { type: 'text', placeholder: tr('onboard_ph'), 'aria-label': tr('onboard_title'), autocomplete: 'off' });
  let sh = null;
  const submit = () => {
    const patch = buildOnboardingTask(input.value);
    if (!patch) { input.focus(); return; }
    /* unshift, not push: the frog banner and the Today list both read the
       array in order, so the user's frog has to come first */
    S.tasks.unshift(makeTask(patch));
    S.ui.route = 'today';
    S.ui.horizon = 'today';
    markOnboarded();
    commit(() => true);
    sh?.close();
  };
  const primary = h('button', { class: 'pick pick--solid', style: 'width:100%;min-height:46px', onclick: submit }, tr('onboard_cta'));
  const skip = h('button', { class: 'pick pick--quiet', style: 'width:100%', onclick: () => { markOnboarded(); sh?.close(); } }, tr('onboard_skip'));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  sh = sheet(tr('onboard_title'), h('div', { style: 'display:grid;gap:10px' }, input, primary, skip));
  input.focus();
  return sh;
}

async function start() {
  window.addEventListener('error', e => report(e.error || e.message));
  window.addEventListener('unhandledrejection', e => report(e.reason));
  try {
    await boot();
    applySettings();
    render();
    if (shouldShowOnboarding({ tasks: S.tasks, skipped: onboardSkipped() })) openOnboarding();
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
