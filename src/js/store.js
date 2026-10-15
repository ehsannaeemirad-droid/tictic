/* ============================================================
   TicTic ADHD — Store
   State model + persistence: IndexedDB primary, localStorage
   mirror under key `tictic.v1` for fast boot. Mirror write-back
   on every commit; IndexedDB write debounced.
   ============================================================ */

export const LS_KEY = 'tictic.v1';
const DB_NAME = 'tictic';
const DB_STORE = 'state';

/* Subscribed render hooks: view modules register [stateKeysFilter, fn] */
const subs = [];

export const S = {
  /* core */
  tasks: [], flows: [], dumps: [], projects: [], sections: [], tagsBank: [], lists: [],
  checkins: [], postSessions: [], driftCounts: {}, energyModes: {},
  tombstones: {}, /* { id: deletedAt } so deletions travel across devices */
  sprint: null, fuel: 0, xp: 0,
  /* settings */
  settings: {
    lang: 'fa', theme: 'system', accent: 'red', calendar: 'gregorian',
    voiceCues: false, foghorn: false, sfx: true,
    density: 'comfortable', motion: 'on', timerVisible: true,
    energyBehavior: {
      lowHelpCards: true, highNudge: true, badUrgentDef: 'both',
      badAutoHelp: true, badHelpCount: 3,
    },
  },
  lighthouse: { beam: true, frogGlow: true, foghorn: false },
  timetable: null, /* filled on seed: our shift timetable */
  collapseState: {},
  ui: { route: 'today', horizon: 'today', filterList: 'all', drawerOpen: false },
  /* transient (not persisted) */
  activeSession: null,
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* ---- task shape factory (§3) ---- */
export function makeTask(patch = {}) {
  const now = Date.now();
  return {
    id: uid(), title: '', notes: '',
    dueDate: null, plannedStart: null, estimate: null, actual: null,
    reminder: [], recurrence: null, priority: 'none',
    dopamineType: null, pressureType: null, kind: 'action',
    tags: [], listId: 'inbox', sectionId: null,
    subtasks: [], checkItems: [], progress: 0,
    status: 'todo', pinned: false, key: false, noise: false,
    delay: null, dropped: false, decision: { pros: '', cons: '', options: '', by: null },
    createdAt: now, modifiedAt: now, activity: [], parentId: null,
    order: now, ...patch,
  };
}

/* ---- persistence ---- */
export function serialize() {
  const { ui, activeSession, ...persisted } = S;   /* ui persisted minus transient bits below */
  return { ...persisted, ui: { route: S.ui.route, horizon: S.ui.horizon, filterList: S.ui.filterList }, v: 1 };
}

export function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(serialize())); } catch (e) { console.warn('LS write failed', e); }
  scheduleIDB();
}

let idbTimer = null;
function scheduleIDB() {
  if (idbTimer) return;
  idbTimer = setTimeout(() => { idbTimer = null; writeIDB(); }, 800);
}
function writeIDB() {
  if (!('indexedDB' in window)) return;
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(DB_STORE);
  open.onsuccess = () => {
    const db = open.result;
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(serialize(), 'state');
  };
}

export async function boot() {
  /* fast path: localStorage mirror */
  let raw = null;
  try { raw = localStorage.getItem(LS_KEY); } catch (e) {}
  if (raw) {
    try { hydrate(JSON.parse(raw)); } catch (e) { console.warn('mirror corrupt', e); }
  }
  /* confirm/refresh from IndexedDB in background; IDB wins if newer */
  if ('indexedDB' in window) {
    const idb = await readIDB();
    if (idb && (!raw || (idb.modifiedAt || idb.savedAt) >= (lastMirrorSavedAt))) hydrate(idb);
  }
  persist();
}
let lastMirrorSavedAt = 0;

function readIDB() {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(DB_STORE);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get('state');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      };
      open.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

export function hydrate(data) {
  if (!data || typeof data !== 'object') return;
  for (const k of ['tasks','flows','dumps','projects','sections','tagsBank','lists','checkins','postSessions','driftCounts','energyModes','sprint','fuel','xp','settings','lighthouse','collapseState','ui','timetable','habits','countdowns','savedFilters','__seeded','tombstones']) {
    if (data[k] !== undefined) S[k] = data[k];
  }
  /* settings gain keys over time — merge over the defaults instead of
     replacing them wholesale, so an older mirror can't blank a new option */
  if (data.settings) S.settings = { ...S.settings, ...data.settings, energyBehavior: { ...S.settings.energyBehavior, ...(data.settings.energyBehavior || {}) } };
  lastMirrorSavedAt = data.savedAt || 0;
}

/* ---- mutation + notify ---- */
export function commit(filterFn) {
  S.savedAt = Date.now();
  persist();
  for (const [flt, fn] of subs) {
    if (!flt || flt(S)) fn();
  }
}
export function subscribe(fn, filter) { subs.push([filter, fn]); return () => {
  const i = subs.findIndex(([f]) => f === filter); if (i >= 0) subs.splice(i, 1);
}; }
export function unsubscribeAll(fn) {
  for (let i = subs.length - 1; i >= 0; i--) if (subs[i][1] === fn) subs.splice(i, 1);
}

/* ---- helpers over tasks ---- */
export const byId = id => S.tasks.find(t => t.id === id);
export function upsertTask(patch) {
  const i = S.tasks.findIndex(t => t.id === patch.id);
  if (i >= 0) { S.tasks[i] = { ...S.tasks[i], ...patch, modifiedAt: Date.now() }; }
  else { S.tasks.push(makeTask(patch)); }
  commit(t => !!t.tasks);
}
export function childrenOf(id) {
  return S.tasks.filter(t => t.parentId === id).sort((a, b) => a.order - b.order);
}
/* Delete a task AND remember it, so the deletion propagates to a synced
   device instead of the task resurrecting on the next pull. */
export function deleteTask(id) {
  const i = S.tasks.findIndex(t => t.id === id);
  if (i < 0) return false;
  S.tasks.splice(i, 1);
  S.tombstones = S.tombstones || {};
  S.tombstones[id] = Date.now();
  return true;
}
/* descendants guard for DnD (§33 in draft) */
export function isDescendant(candidateId, ancestorId) {
  let cur = byId(candidateId);
  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = byId(cur.parentId);
  }
  return false;
}
/* nesting depth (max 4) */
export function taskDepth(t) {
  let d = 0, cur = t;
  while (cur && cur.parentId) { d++; cur = byId(cur.parentId); }
  return d;
}

/* Deliberate reset: leaves a genuinely empty first-run app. `__seeded` stays
   true so boot does not push the demo inventory back in — the user can bring
   it back on purpose from Settings (seed.js `force`). */
export function clearAllData() {
  S.tasks = []; S.flows = []; S.dumps = []; S.projects = []; S.checkins = [];
  S.habits = []; S.countdowns = []; S.savedFilters = [];
  S.sections = []; S.lists = [{ id: 'inbox', name: 'اینباکس', system: true }];
  S.__seeded = true;
  S.sprint = null; S.xp = 0; S.fuel = 0; S.driftCounts = {}; S.postSessions = [];
  S.energyModes = {}; S.timetable = null; S.tombstones = {};
  commit();
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  if ('indexedDB' in window) {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(DB_STORE);
    open.onsuccess = () => {
      const tx = open.result.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).clear();
    };
  }
}
