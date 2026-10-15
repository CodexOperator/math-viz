#!/usr/bin/env node
// Rewrites the "What to do locally" section of HANDOFF.md from docs/local-tasks.json and
// docs/local-done.json. The cloud orchestrator runs this at the end of every iteration, right
// after updating docs/local-tasks.json, and commits both files.
//
//   node tools/local/sync-handoff.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; } };
const queue = read('docs/local-tasks.json', { tasks: [] });
const entries = read('docs/local-done.json', { entries: [] }).entries || [];

const statusOf = (t) => {
  const mine = entries.filter((e) => e.id === t.id && (e.rev ?? 1) === (t.rev ?? 1));
  if (mine.some((e) => e.status === 'done')) return 'done';
  if (mine.some((e) => e.status === 'blocked')) return 'blocked';
  return 'pending';
};

const lines = [];
const c = queue.cloud || {};
lines.push(`_Updated ${queue.updated || 'unknown'} by the cloud loop. Cloud status: iteration ${c.iteration ?? '?'} of ${c.of ?? '?'}, ${c.status || 'unknown'}._`);
if (c.summary) lines.push('', c.summary);
const tasks = (queue.tasks || []).slice().sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
const open = tasks.filter((t) => statusOf(t) !== 'done');
const finished = tasks.filter((t) => statusOf(t) === 'done');
lines.push('');
if (!open.length) lines.push('Nothing is waiting for the local agent right now. New narration is picked up automatically (`auto-media`).');
for (const t of open) {
  const s = statusOf(t);
  lines.push(`### ${s === 'blocked' ? '⏸ blocked' : '☐'} ${t.id} — ${t.title}`);
  if (t.needs?.length) lines.push(`Needs: ${t.needs.join(', ')}.`);
  if (t.why) lines.push(t.why);
  lines.push('');
  t.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  lines.push('', 'Done when:');
  t.done_when.forEach((d) => lines.push(`- ${d}`));
  if (s === 'blocked') {
    const e = entries.filter((x) => x.id === t.id && x.status === 'blocked').at(-1);
    if (e?.needs_from_student) lines.push('', `**Waiting on the student:** ${e.needs_from_student}`);
  }
  lines.push('');
}
lines.push('Always, on every tick: if narration text changed or a video was rendered without its audio, run the media step (`auto-media`).');
if (finished.length) {
  lines.push('', '<details><summary>Finished tasks</summary>', '');
  for (const t of finished) {
    const e = entries.filter((x) => x.id === t.id && x.status === 'done').at(-1);
    lines.push(`- ☑ ${t.id} — ${t.title}${e?.summary ? `: ${e.summary}` : ''}`);
  }
  lines.push('', '</details>');
}

const file = path.join(ROOT, 'HANDOFF.md');
const doc = fs.readFileSync(file, 'utf8');
const start = '<!-- local-tasks:start -->', end = '<!-- local-tasks:end -->';
const i = doc.indexOf(start), j = doc.indexOf(end);
if (i < 0 || j < 0) { console.error('HANDOFF.md is missing the local-tasks markers'); process.exit(1); }
fs.writeFileSync(file, doc.slice(0, i + start.length) + '\n' + lines.join('\n') + '\n' + doc.slice(j));
console.log(`HANDOFF.md updated: ${open.length} open, ${finished.length} finished.`);
