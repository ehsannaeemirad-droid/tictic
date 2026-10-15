/* ============================================================
   TicTic — sync merge (pure)
   No imports, no DOM: this file is imported by the browser client
   AND by tools/check-sync.mjs in Node, so both see the same logic.

   Two devices each keep a full copy. Sync is a three-way merge of
   the *content* collections only — theme, UI route, XP and other
   per-device settings never leave the device.

   Rules, per entity (keyed by id):
     · newest `modifiedAt` wins  (last-write-wins)
     · a tombstone (id → deletedAt) deletes an entity that has not
       been touched since the deletion; an entity edited *after* its
       tombstone survives (it was re-created on purpose)
   Deletions therefore travel instead of resurrecting on the next pull.
   ============================================================ */

/* the collections that actually sync (everything else stays per-device) */
export const SYNCED_KEYS = [
  'tasks', 'lists', 'projects', 'sections', 'tagsBank',
  'habits', 'countdowns', 'dumps', 'flows', 'savedFilters',
];

/* a deletion is remembered for 6 months, then forgotten (bounds growth) */
const TOMBSTONE_TTL = 180 * 24 * 60 * 60 * 1000;

const ts = (e) => (e && (e.modifiedAt || e.createdAt)) || 0;

/* Build the payload we are willing to share with the server: the synced
   collections + tombstones + a timestamp. Nothing secret, no passphrase. */
export function buildPayload(state) {
  const p = { tombstones: { ...(state.tombstones || {}) }, savedAt: Date.now() };
  for (const key of SYNCED_KEYS) p[key] = state[key] || [];
  return p;
}

/* Merge a local payload with the remote one. Both may be null/empty.
   Returns { payload, stats } — payload is what both devices converge on. */
export function mergeStates(local, remote) {
  local = local || {};
  remote = remote || {};

  /* ---- tombstones: union, keep the newest deletedAt per id ---- */
  const tomb = { ...(local.tombstones || {}) };
  for (const [id, at] of Object.entries(remote.tombstones || {})) {
    if (!tomb[id] || at > tomb[id]) tomb[id] = at;
  }
  const now = Date.now();
  for (const id of Object.keys(tomb)) if (now - tomb[id] > TOMBSTONE_TTL) delete tomb[id];

  /* ---- collections: LWW per entity, then apply tombstones ---- */
  const payload = { tombstones: tomb, savedAt: Math.max(local.savedAt || 0, remote.savedAt || 0) };
  for (const key of SYNCED_KEYS) {
    const byId = new Map();
    for (const e of remote[key] || []) if (e && e.id) byId.set(e.id, e);
    for (const e of local[key] || []) {
      if (!e || !e.id) continue;
      const r = byId.get(e.id);
      if (!r || ts(e) >= ts(r)) byId.set(e.id, e);   /* local wins ties (stable, no flap) */
    }
    payload[key] = [...byId.values()].filter((e) => !(tomb[e.id] && ts(e) <= tomb[e.id]));
  }

  /* ---- how this changed the local copy, for the confirmation line ---- */
  const before = new Map((local.tasks || []).map((t) => [t.id, t]));
  const after = new Map((payload.tasks || []).map((t) => [t.id, t]));
  const stats = { added: 0, updated: 0, removed: 0 };
  for (const [id, t] of after) {
    const b = before.get(id);
    if (!b) stats.added++;
    else if (ts(t) > ts(b)) stats.updated++;
  }
  for (const id of before.keys()) if (!after.has(id)) stats.removed++;

  return { payload, stats };
}

/* Write a merged payload back over live state (collections + tombstones). */
export function applyPayload(state, payload) {
  for (const key of SYNCED_KEYS) if (payload[key]) state[key] = payload[key];
  state.tombstones = payload.tombstones || {};
  return state;
}
