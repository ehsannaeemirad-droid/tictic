#!/usr/bin/env node
/* ============================================================
   serve.mjs — the dev/use server for TicTic. No dependencies.

     npm start                 # http://127.0.0.1:8123/index.html
     npm start -- 9000         # another port

   The app needs a real http(s) origin: ES modules are blocked on
   file:// and a service worker cannot register there at all. That
   is the only reason this file exists — there is no build step.

   Serves the project root read-only, with the MIME types the app
   actually uses (modules are rejected by browsers if sent as
   text/plain), and never touches another origin.
   ============================================================ */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.argv[2] || process.env.PORT || 8123);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('method not allowed');
    return;
  }
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    /* Split on '/' and re-join instead of letting path.normalize run: on
       Windows it rewrites '/' to '\', which turns a request for the site
       root into a bogus directory redirect (that broke the app's './'
       precache entry when this was first written). */
    let segs = decodeURIComponent(url.pathname).split('/').filter(Boolean);
    if (!segs.length || url.pathname.endsWith('/')) segs = [...segs, 'index.html'];
    const file = join(root, ...segs);
    if (file !== root && !file.startsWith(root + sep)) {          /* no escaping the root */
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) {
      res.writeHead(302, { Location: url.pathname.replace(/\/*$/, '/') }).end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      /* Always revalidate: during development you want the edit, not yesterday's
         copy, and the service worker does its own caching anyway. */
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (err) {
    const code = err && err.code === 'ENOENT' ? 404 : 500;
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end(code === 404 ? 'not found' : 'server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`TicTic is serving ${root}`);
  console.log(`  → http://127.0.0.1:${port}/index.html`);
  console.log('  Ctrl+C to stop.');
});
