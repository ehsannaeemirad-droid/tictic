/* ============================================================
   TicTic — PWA glue
   · registers the service worker (https, or localhost for testing)
   · offers “new version available — reload” instead of refreshing
     under the user's cursor
   · shows a calm offline bar; the app keeps working from cache
   ============================================================ */
import { tr } from './i18n.js';
import { h, sv, icons } from './ui.js';

const overlays = () => document.getElementById('overlays');
let offlineBar = null;
let updateBar = null;

const supported = () => 'serviceWorker' in navigator &&
  (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));

export function installPWA() {
  window.addEventListener('online', hideOffline);
  window.addEventListener('offline', showOffline);
  if (!navigator.onLine) showOffline();
  if (!supported()) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg);

    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        /* “installed” + an existing controller = an update, not a first run */
        if (next.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(reg);
      });
    });

    /* check for a new build when the app comes back to the foreground */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => { /* offline support is a bonus, never a blocker */ });
}

function showOffline() {
  if (offlineBar || !overlays()) return;
  offlineBar = h('div', { class: 'status-bar status-bar--warn', role: 'status' },
    h('span', {}, '⚡'), h('span', { style: 'flex:1' }, tr('pwa_offline')));
  overlays().append(offlineBar);
}
function hideOffline() {
  offlineBar?.remove();
  offlineBar = null;
}

function offerUpdate(reg) {
  if (updateBar || !overlays()) return;
  const reload = h('button', { class: 'pick', onclick: () => {
    const waiting = reg.waiting;
    if (!waiting) { location.reload(); return; }
    waiting.postMessage('SKIP_WAITING');
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    /* if the controller never changes, don't leave the button dead */
    setTimeout(() => location.reload(), 1200);
  } }, '↻ ' + tr('pwa_reload'));
  updateBar = h('div', { class: 'status-bar', role: 'status' },
    h('span', {}, sv(icons.clock, 16)), h('span', { style: 'flex:1' }, tr('pwa_update')), reload);
  overlays().append(updateBar);
}
