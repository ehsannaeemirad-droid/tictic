/* ============================================================
   TicTic sync endpoint
   One row per "room" in D1. A room is derived on the client from a
   passphrase the user chooses: room = SHA-256(passphrase). The
   passphrase itself never reaches this server, and this worker
   never parses the stored state — it is an opaque string here, so
   the app owns its own format and a server bug cannot mangle it.

     GET    /health              liveness, no auth
     GET    /sync                → { payload, updatedAt }   (404-shaped: payload null)
     PUT    /sync                body { payload, baseUpdatedAt } → { updatedAt }
                                409 + current payload if the room moved meanwhile
     DELETE /sync                forget this room for good

   Auth is the room key itself, sent as a bearer token: knowing the
   passphrase is what grants access, so there is nothing else to
   leak. Requests without a well-formed key are refused before any
   database work happens.
   ============================================================ */
const SERVICE = 'tictic-sync';
const VERSION = 1;
const MAX_BYTES = 2 * 1024 * 1024;          /* the whole state, twice over */
const ROOM_KEY = /^[a-f0-9]{64}$/;          /* sha-256 hex */

/* CORS is not the auth boundary here (the room key is), but keep it to the
   places this app is actually served from: GitHub Pages and local dev. */
function originAllowed(origin) {
  if (!origin) return null;
  if (origin === 'https://ehsannaeemirad-droid.github.io') return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function corsHeaders(origin) {
  const allowed = originAllowed(origin);
  if (!allowed) return {};
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Base-Updated-At',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const send = (body, status, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });

function roomFrom(req) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim().toLowerCase() : '';
  return ROOM_KEY.test(token) ? token : null;
}

/* Create the table on first use rather than on every request: DDL is a write,
   and the free tier counts writes. A missing-table error is the signal. */
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS sync_rooms (
       room TEXT PRIMARY KEY,
       payload TEXT NOT NULL,
       updated_at INTEGER NOT NULL
     )`
  ).run();
  schemaReady = true;
}
const missingTable = (err) => /no such table/i.test(String((err && err.message) || err));

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (origin && !originAllowed(origin)) {
      return send({ error: 'origin_not_allowed' }, 403);
    }
    if (url.pathname === '/health') {
      return send({ ok: true, service: SERVICE, version: VERSION }, 200, cors);
    }
    if (url.pathname !== '/sync') {
      return send({ error: 'not_found' }, 404, cors);
    }

    const room = roomFrom(request);
    if (!room) return send({ error: 'sync_key_required' }, 401, cors);

    try {
      if (request.method === 'GET') return await readRoom(env, room, cors);
      if (request.method === 'PUT') return await writeRoom(request, env, room, cors);
      if (request.method === 'DELETE') return await forgetRoom(env, room, cors);
      return send({ error: 'method_not_allowed' }, 405, cors);
    } catch (err) {
      return send({ error: 'server_error', detail: String((err && err.message) || err).slice(0, 200) }, 500, cors);
    }
  },
};

async function readRoom(env, room, cors) {
  let row;
  try {
    row = await env.DB.prepare('SELECT payload, updated_at FROM sync_rooms WHERE room = ?').bind(room).first();
  } catch (err) {
    if (!missingTable(err)) throw err;
    await ensureSchema(env);
    row = await env.DB.prepare('SELECT payload, updated_at FROM sync_rooms WHERE room = ?').bind(room).first();
  }
  if (!row) return send({ payload: null, updatedAt: 0 }, 200, cors);
  return send({ payload: row.payload, updatedAt: row.updated_at }, 200, cors);
}

async function writeRoom(request, env, room, cors) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BYTES * 2) return send({ error: 'too_large', limit: MAX_BYTES }, 413, cors);

  let body;
  try {
    body = await request.json();
  } catch {
    return send({ error: 'bad_json' }, 400, cors);
  }
  const payload = typeof body?.payload === 'string' ? body.payload : null;
  if (!payload) return send({ error: 'payload_required' }, 400, cors);
  if (payload.length > MAX_BYTES) return send({ error: 'too_large', limit: MAX_BYTES }, 413, cors);

  const base = Number(body.baseUpdatedAt || 0);
  const now = Date.now();

  let current;
  try {
    current = await env.DB.prepare('SELECT payload, updated_at FROM sync_rooms WHERE room = ?').bind(room).first();
  } catch (err) {
    if (!missingTable(err)) throw err;
    await ensureSchema(env);
    current = null;
  }

  /* optimistic concurrency: if the other device wrote since this client read,
     hand its version back instead of silently overwriting it */
  if (current && Number(current.updated_at) > base) {
    return send({ conflict: true, payload: current.payload, updatedAt: current.updated_at }, 409, cors);
  }

  await env.DB.prepare(
    `INSERT INTO sync_rooms (room, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(room) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).bind(room, payload, now).run();

  return send({ ok: true, updatedAt: now }, 200, cors);
}

async function forgetRoom(env, room, cors) {
  try {
    await env.DB.prepare('DELETE FROM sync_rooms WHERE room = ?').bind(room).run();
  } catch (err) {
    if (!missingTable(err)) throw err;
    await ensureSchema(env);
  }
  return send({ ok: true, forgotten: true }, 200, cors);
}
