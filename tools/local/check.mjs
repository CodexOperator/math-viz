#!/usr/bin/env node
// Cheap hourly check for the local agent. No AI involved: it pulls the branch, then works out
// whether there is anything for the local agent to do.
//
//   node tools/local/check.mjs            pull, then print pending work
//   node tools/local/check.mjs --json     same, as JSON on stdout
//   node tools/local/check.mjs --no-pull  skip git fetch/pull
//   node tools/local/check.mjs --tools    report which local tools are installed, then exit
//   node tools/local/check.mjs --no-lease don't take the lease (just look)
//
// Exit codes: 0 = there is work and this machine holds the lease, 10 = nothing to do (or another
// agent holds the lease), 11 = this checkout is not set up (no .local/dispatch.env, e.g. a
// sandboxed VM), 1 = error.
//
// Several machines can run the local agent (a Mac and a Linux box). When there is work, this
// script takes the lease in docs/local-lease.json (tools/local/lease.mjs) so only one works at a
// time; the agent releases it at the end of its run. Tasks with "per_machine": true (toolchain
// setup) are done once on every machine.
//
// Pending work is:
//   * tasks in docs/local-tasks.json without a matching done entry in docs/local-done.json.
//     A task blocked at the same rev is skipped, and retried when the cloud bumps its rev, when
//     a task it depends on is finished after the block, or after retry_after_hours (default 12).
//   * "auto-media": narration text without up-to-date audio, or videos that have all their
//     audio but were rendered silent (the fix is always `npm run media` under Doppler);
//   * "dirty-tree": uncommitted changes left by an earlier run.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agentName, claim } from './lease.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const sh = (cmd, cmdArgs, opts = {}) => spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts });
const readJson = (rel, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; } };

function toolReport() {
  const found = (cmd, a = ['--version']) => sh(cmd, a).status === 0;
  const manim = [process.env.MANIM, path.join(os.homedir(), '.venvs', 'manim', 'bin', 'manim'), 'manim'].filter(Boolean).find((c) => found(c));
  return {
    node: process.version, git: found('git'), npm: found('npm'), ffmpeg: found('ffmpeg', ['-version']),
    doppler: found('doppler', ['--version']), claude: found('claude', ['--version']), manim: manim || null,
  };
}

if (args.has('--tools')) {
  const t = toolReport();
  for (const [k, v] of Object.entries(t)) console.log(`${v ? 'ok     ' : 'MISSING'} ${k}${typeof v === 'string' ? `  (${v})` : ''}`);
  process.exit(Object.values(t).every(Boolean) ? 0 : 1);
}

if (!fs.existsSync(path.join(ROOT, '.local', 'dispatch.env'))) {
  console.log('This checkout is not set up for the local agent (no .local/dispatch.env), so it may be a sandboxed VM or a fresh clone.');
  console.log('On the student\'s machine run `bash tools/local/setup.sh` first. Nothing was changed.');
  process.exit(11);
}
const ME = agentName() || 'unnamed';

const log = [];
const pending = [];
let branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
const dirty = sh('git', ['status', '--porcelain']).stdout.trim();

if (!args.has('--no-pull')) {
  const fetch = sh('git', ['fetch', '--quiet', 'origin', branch]);
  if (fetch.status !== 0) { console.error(`git fetch failed: ${fetch.stderr.trim()}`); process.exit(1); }
  const behind = Number(sh('git', ['rev-list', '--count', `HEAD..origin/${branch}`]).stdout.trim() || 0);
  if (behind > 0 && !dirty) {
    const pull = sh('git', ['pull', '--rebase', '--quiet', 'origin', branch]);
    if (pull.status !== 0) { sh('git', ['rebase', '--abort']); console.error(`git pull failed: ${pull.stderr.trim()}`); process.exit(1); }
    log.push(`pulled ${behind} new commit(s) from origin/${branch}`);
  } else if (behind > 0) {
    log.push(`${behind} new commit(s) on origin, not pulled because the working tree has changes`);
  } else {
    log.push('already up to date');
  }
}

if (dirty) pending.push({ id: 'dirty-tree', title: 'Finish or discard the uncommitted changes from an earlier run', detail: dirty.split('\n').slice(0, 12).join('\n') });

const queue = readJson('docs/local-tasks.json', { tasks: [] });
const done = readJson('docs/local-done.json', { entries: [] }).entries || [];

const blocked = [];
const at = (e) => Date.parse(e.at || 0) || 0;
for (const t of (queue.tasks || []).slice().sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))) {
  const mine = done.filter((e) => e.id === t.id && (e.rev ?? 1) === (t.rev ?? 1) && (!t.per_machine || e.machine === ME));
  if (mine.some((e) => e.status === 'done')) continue;
  const block = mine.filter((e) => e.status === 'blocked').sort((a, b) => at(b) - at(a))[0];
  if (block) {
    const depDoneLater = (t.depends_on || []).some((d) => done.some((e) => e.id === d && e.status === 'done' && at(e) > at(block)));
    const expired = Date.now() - at(block) > (t.retry_after_hours ?? 12) * 3600e3;
    if (!depDoneLater && !expired) { blocked.push(t.id); continue; }
  }
  const unmet = (t.depends_on || []).filter((d) => !done.some((e) => e.id === d && e.status === 'done' && (!(queue.tasks || []).find((x) => x.id === d)?.per_machine || e.machine === ME)));
  if (unmet.length) { blocked.push(`${t.id} (waits for ${unmet.join(', ')})`); continue; }
  pending.push({ id: t.id, title: t.title, needs: t.needs || [], retry: !!block });
}

// Narration that has no up-to-date audio yet.
const dry = sh(process.execPath, ['tools/media/generate-audio.mjs', '--dry-run']);
const stale = Number((dry.stdout.match(/^(\d+) clip\(s\) to generate/m) || [])[1] || 0);
// Videos that have all their narration audio but were rendered without it.
let silent = [];
try {
  const manifest = fs.readFileSync(path.join(ROOT, 'media', 'manifest.js'), 'utf8');
  const videos = JSON.parse(manifest.match(/export const VIDEOS = (\[[\s\S]*?\]);/)[1]);
  silent = videos.filter((v) => !v.narrated).map((v) => v.id).filter((id) => {
    const n = readJson(`media/narration/videos/${id}.json`, null);
    return n && (n.segments || []).length && n.segments.every((s) => fs.existsSync(path.join(ROOT, 'media', 'audio', 'videos', id, `${s.id}.mp3`)));
  });
} catch {}
const audioApiReady = done.some((e) => e.id === 'L2-audio-api' && e.status === 'done');
if (stale > 0 || silent.length) {
  if (audioApiReady || silent.length) {
    pending.push({ id: 'auto-media', title: `Generate audio for ${stale} clip(s) and re-render${silent.length ? ` (silent videos: ${silent.join(', ')})` : ''}`, needs: ['doppler', 'network', 'manim'] });
  } else {
    log.push(`${stale} narration clip(s) are waiting for audio once L2-audio-api is done`);
  }
}

let leaseNote = null;
if (pending.length && !args.has('--no-lease') && !args.has('--no-pull')) {
  const l = claim();
  if (!l.ok) {
    leaseNote = l.holder ? `another agent (${l.holder}) is working until ${l.until}; skipping this tick` : `could not take the lease: ${l.why}`;
    pending.length = 0;
  } else {
    log.push(`took the lease as ${ME}`);
  }
}
if (leaseNote) log.push(leaseNote);

const result = { machine: ME, branch, head: sh('git', ['rev-parse', '--short', 'HEAD']).stdout.trim(), cloud: queue.cloud || null, pending, blocked, log };
if (args.has('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const l of log) console.log(`· ${l}`);
  if (queue.cloud) console.log(`· cloud loop: iteration ${queue.cloud.iteration}/${queue.cloud.of}, ${queue.cloud.status}. ${queue.cloud.summary || ''}`);
  if (blocked.length) console.log(`· blocked (waiting on the student or the cloud): ${blocked.join(', ')}`);
  if (!pending.length) console.log('Nothing to do.');
  for (const p of pending) console.log(`→ ${p.id}: ${p.title}${p.needs?.length ? `  [needs ${p.needs.join(', ')}]` : ''}${p.retry ? '  (retry after an earlier block)' : ''}`);
}
process.exit(pending.length ? 0 : 10);
