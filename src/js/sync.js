/* ============================================================
   TicTic — device sync client
   One tap syncs this device with a tiny server you point it at.
   The server stores an opaque string per "room"; a room is derived
   from a passphrase you choose, so the passphrase is the only
   secret and it never leaves the device (only SHA-256 of it does).

   Flow: pull remote → three-way merge (sync-merge.js) → push.
   If the server moved on since we read it (409), re-pull once and
   retry — no silent overwrite.

   Config (endpoint + passphrase) lives in its OWN localStorage key,
   never in the serialized app state, so it can't be exported or
   synced away by accident.
   ============================================================ */
import { S, commit, persist, serialize, hydrate } from './store.js';
import { buildPayload, mergeStates, applyPayload } from './sync-merge.js';

const CFG_KEY = 'tictic.sync';
const DEFAULTS = { endpoint: '', passphrase: '', auto: false, lastSyncAt: 0, lastResult: null };

export function getSyncCfg() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
export function setSyncCfg(patch) {
  const cfg = { ...getSyncCfg(), ...patch };
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* private mode */ }
  return cfg;
}
export function isConfigured() {
  const c = getSyncCfg();
  return !!(c.endpoint && c.passphrase);
}

/* room key = SHA-256(passphrase), hex. Needs a secure context (https or
   localhost) — both Pages and the dev server qualify. */
async function roomKey(passphrase) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passphrase));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const trimEndpoint = (u) => (u || '').trim().replace(/\/+$/, '');

/* ---- the whole sync, returns { ok, reason?, stats? } ---- */
export async function syncNow() {
  const cfg = getSyncCfg();
  if (!cfg.endpoint || !cfg.passphrase) return { ok: false, reason: 'not_configured' };
  const endpoint = trimEndpoint(cfg.endpoint);
  let room;
  try { room = await roomKey(cfg.passphrase); }
  catch { return { ok: false, reason: 'insecure_context' }; }

  const headers = { Authorization: 'Bearer ' + room, 'Content-Type': 'application/json' };

  /* ---- pull ---- */
  let remote;
  try {
    const res = await fetch(endpoint + '/sync', { method: 'GET', headers });
    if (res.status === 401) return { ok: false, reason: 'bad_key' };
    if (!res.ok) return { ok: false, reason: 'http_' + res.status };
    remote = await res.json();
  } catch { return { ok: false, reason: 'offline' }; }

  const remotePayload = remote && remote.payload ? safeParse(remote.payload) : null;

  /* ---- merge into local ---- */
  const { payload, stats } = mergeStates(buildPayload(S), remotePayload);
  applyPayload(S, payload);
  persist();
  commit(() => true);            /* re-render every view with the merged data */

  /* ---- push (optimistic concurrency via baseUpdatedAt) ---- */
  const body = JSON.stringify({ payload: JSON.stringify(payload), baseUpdatedAt: (remote && remote.updatedAt) || 0 });
  let pushed = false;
  try {
    let res = await fetch(endpoint + '/sync', { method: 'PUT', headers, body });
    if (res.status === 409) {
      /* the other device wrote while we worked — fold its version in and retry once */
      const conflict = await res.json().catch(() => null);
      const theirs = conflict && conflict.payload ? safeParse(conflict.payload) : null;
      const retry = mergeStates(buildPayload(S), theirs);
      applyPayload(S, retry.payload);
      persist(); commit(() => true);
      res = await fetch(endpoint + '/sync', {
        method: 'PUT', headers,
        body: JSON.stringify({ payload: JSON.stringify(retry.payload), baseUpdatedAt: (conflict && conflict.updatedAt) || 0 }),
      });
    }
    pushed = res.ok;
    if (!res.ok && res.status !== 409) {
      setSyncCfg({ lastSyncAt: Date.now(), lastResult: 'push_http_' + res.status });
      return { ok: false, reason: 'http_' + res.status, stats };
    }
  } catch {
    setSyncCfg({ lastSyncAt: Date.now(), lastResult: 'push_offline' });
    return { ok: false, reason: 'offline', stats };   /* merge already applied locally */
  }

  setSyncCfg({ lastSyncAt: Date.now(), lastResult: pushed ? 'ok' : 'conflict' });
  return { ok: true, stats, pushed };
}

/* forget the server copy (used by "reset remote" in Settings) */
export async function forgetRemote() {
  const cfg = getSyncCfg();
  if (!cfg.endpoint || !cfg.passphrase) return { ok: false, reason: 'not_configured' };
  let room;
  try { room = await roomKey(cfg.passphrase); }
  catch { return { ok: false, reason: 'insecure_context' }; }
  try {
    const res = await fetch(trimEndpoint(cfg.endpoint) + '/sync', {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + room },
    });
    return { ok: res.ok, reason: res.ok ? null : 'http_' + res.status };
  } catch { return { ok: false, reason: 'offline' }; }
}

/* ---- auto-sync: on boot, on re-focus, and on a slow timer ---- */
let autoTimer = null;
export function startAutoSync(intervalMs = 90000) {
  stopAutoSync();
  const cfg = getSyncCfg();
  if (!cfg.auto || !isConfigured()) return;      /* opt-in only */
  const tick = () => { if (document.visibilityState === 'visible') syncNow().catch(() => {}); };
  autoTimer = setInterval(tick, intervalMs);
  document.addEventListener('visibilitychange', tick);
  tick();                                         /* one sync the moment it is turned on */
}
export function stopAutoSync() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
}

function safeParse(str) { try { return JSON.parse(str); } catch { return null; } }
