#!/usr/bin/env node
// A lease so that several local agents (say a Mac and a Linux box) never work at the same time.
// The lease lives in docs/local-lease.json and is taken with a git push, so a race resolves
// cleanly: only one push fast-forwards, and the loser sees the winner's name after pulling.
//
//   node tools/local/lease.mjs claim     exit 0 if this machine now holds the lease, 3 if another does
//   node tools/local/lease.mjs release   give it back (commit + push)
//   node tools/local/lease.mjs status    print who holds it
//
// The machine name is AGENT_NAME from .local/dispatch.env (written by tools/local/setup.sh),
// falling back to the short hostname.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = path.join(ROOT, 'docs', 'local-lease.json');
const REL = 'docs/local-lease.json';
const HOURS = 2;
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });

export function agentName() {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.local', 'dispatch.env'), 'utf8');
    const m = env.match(/^AGENT_NAME=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return process.env.AGENT_NAME || os.hostname().split('.')[0] || null;
}

const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { holder: null }; } };
const live = (l) => l.holder && Date.parse(l.until || 0) > Date.now();

function write(lease, message) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(lease, null, 2) + '\n');
  git('add', REL);
  const c = git('commit', '--quiet', '-m', message, '--', REL);
  if (c.status !== 0 && !/nothing to commit/.test(c.stdout + c.stderr)) return { ok: false, why: c.stderr.trim() };
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
  const p = git('push', '--quiet', 'origin', branch);
  if (p.status === 0) return { ok: true };
  // Someone pushed first: drop our lease commit (keeping any other work in the tree), take
  // theirs, and let the caller re-read.
  git('reset', '--quiet', '--mixed', 'HEAD~1');
  if (git('ls-files', '--error-unmatch', REL).status === 0) git('checkout', '--', REL);
  else fs.rmSync(FILE, { force: true });
  git('pull', '--rebase', '--autostash', '--quiet', 'origin', branch);
  return { ok: false, why: 'push rejected (another agent pushed first)' };
}

export function claim() {
  const me = agentName();
  if (!me) return { ok: false, why: 'AGENT_NAME is not set; run tools/local/setup.sh' };
  for (let attempt = 0; attempt < 2; attempt++) {
    const l = read();
    if (live(l) && l.holder !== me) return { ok: false, holder: l.holder, until: l.until };
    const now = new Date();
    const r = write({ holder: me, since: now.toISOString(), until: new Date(now.getTime() + HOURS * 3600e3).toISOString() }, `local lease: ${me} working`);
    if (r.ok) return { ok: true, holder: me };
  }
  const l = read();
  return { ok: false, holder: l.holder, until: l.until };
}

export function release() {
  const me = agentName();
  const l = read();
  if (l.holder !== me) return { ok: true, note: `lease held by ${l.holder || 'nobody'}; nothing to release` };
  return write({ holder: null, released_by: me, at: new Date().toISOString() }, `local lease: ${me} done`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === 'claim') {
    const r = claim();
    console.log(r.ok ? `lease held by ${r.holder}` : `lease not taken: ${r.holder ? `${r.holder} holds it until ${r.until}` : r.why}`);
    process.exit(r.ok ? 0 : 3);
  } else if (cmd === 'release') {
    const r = release();
    console.log(r.ok ? (r.note || 'lease released') : `release failed: ${r.why}`);
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === 'status') {
    const l = read();
    console.log(live(l) ? `${l.holder} holds the lease until ${l.until}` : 'lease is free');
  } else {
    console.error('usage: node tools/local/lease.mjs claim|release|status');
    process.exit(2);
  }
}
