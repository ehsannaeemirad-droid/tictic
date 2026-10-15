#!/usr/bin/env node
/* ============================================================
   sync.mjs — publish what you changed: check → commit → push.

     npm run sync                      publish with an auto message
     npm run sync -- "message here"    publish with your own message
     npm run sync -- --watch           publish after each save

   Why this exists: a change is only "both places" once it is pushed.
   GitHub Pages redeploys about a minute after a push, and the app on
   your phone then offers “Reload”. The gates run first, so a broken
   commit never leaves this machine — if they fail, nothing is
   committed and nothing is pushed.

   --watch keeps a process alive and publishes ~5 seconds after you
   stop editing. It is opt-in: it commits on your behalf, so it will
   also record half-finished work as such (the gates still have to
   pass).
   ============================================================ */
import { spawnSync } from 'node:child_process';
import { watch } from 'node:fs';

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const messageArg = args.filter((a) => !a.startsWith('--')).join(' ').trim();

const git = (...a) => spawnSync('git', a, { encoding: 'utf8' });

/* the live URL comes from the remote, so renaming the repo cannot leave a
   stale link printed here */
function liveUrl() {
  const remote = git('remote', 'get-url', 'origin').stdout.trim();
  const m = remote.match(/github\.com[:/]+([^/]+)\/([^/.]+)/);
  return m ? `https://${m[1]}.github.io/${m[2]}/` : null;
}

function sync() {
  const check = spawnSync(process.execPath, ['tools/check.mjs'], { encoding: 'utf8' });
  const out = `${check.stdout || ''}${check.stderr || ''}`;
  if (check.status !== 0) {
    console.log('✗ gates failed — nothing was committed or pushed.');
    console.log(out.split('\n').filter((l) => /✗|failed|UNSTYLED|ORPHAN|MISSING/.test(l)).join('\n'));
    console.log('  fix it, then run this again.');
    return false;
  }
  console.log(`✓ ${(out.match(/\d+\/\d+ gates passed/) || ['gates passed'])[0]}`);

  if (!git('status', '--porcelain').stdout.trim()) {
    console.log('• nothing to publish');
    return true;
  }

  git('add', '-A');
  const files = git('diff', '--cached', '--name-only').stdout.trim().split('\n').filter(Boolean);
  const subject = messageArg || `Sync ${files.length} file${files.length === 1 ? '' : 's'}`;
  const body = [
    subject,
    '',
    files.slice(0, 12).join('\n') + (files.length > 12 ? `\n… and ${files.length - 12} more` : ''),
    '',
    'Generated with Codebuff 🤖',
    'Co-Authored-By: Codebuff <noreply@codebuff.com>',
  ].join('\n');

  const commit = git('commit', '-m', body);
  if (commit.status !== 0) {
    console.log('✗ commit failed');
    console.log(`${commit.stdout}${commit.stderr}`.trim());
    return false;
  }
  console.log(`✓ committed ${files.length} file(s): ${subject}`);

  const push = git('push', 'origin', 'HEAD');
  if (push.status !== 0) {
    console.log('✗ push failed (the commit is still local, nothing is lost)');
    console.log(`${push.stdout}${push.stderr}`.trim());
    return false;
  }
  const url = liveUrl();
  console.log('✓ pushed');
  if (url) console.log(`  live in about a minute: ${url}`);
  return true;
}

if (!WATCH) process.exit(sync() ? 0 : 1);

/* ---- watch mode: publish after you stop editing ---- */
const IGNORE = /(^|[\\/])(\.git|\.freebuff|node_modules)([\\/]|$)|~$|\.swp$/;
let timer = null;
let running = false;

console.log('watching for changes — publishes ~5s after you stop saving (Ctrl+C to stop)');
watch('.', { recursive: true }, (_event, file) => {
  if (!file || IGNORE.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (running) return;
    running = true;
    console.log(`\n— change detected (${file}) —`);
    sync();
    running = false;
  }, 5000);
});
