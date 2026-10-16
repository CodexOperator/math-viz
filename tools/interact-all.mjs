#!/usr/bin/env node
// Run every interaction script in tests/interact on the routes it is written for, at desktop,
// phone and dark desktop, through tools/smoke.mjs. Prints one line per script and exits non-zero
// if any script fails.
//
//   node tools/interact-all.mjs              all scripts, two at a time
//   node tools/interact-all.mjs --jobs 3     run three at a time
//   node tools/interact-all.mjs lab roots    only scripts whose file name contains "lab" or "roots"
//
// When a new interaction script is added, add its routes to ROUTES below (the header of each
// script names them).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROUTES = {
  'i1-core-mapping': ['nosuchplace'],
  'i1-core-math': ['home'],
  'i1-core-plane': ['i1-core-plane'],
  'i1-core-three': ['home'],
  'i1-core-widgets': ['widgets-fixture'],
  'i1-data': ['problems'],
  'i1-integration': ['home'],
  'i1-shell': ['nosuchplace'],
  'i1-station-addresses-arithmetic': ['problem-1-3-1', 'addresses', 'addresses-m16', 'problem-1-1-1', 'arithmetic', 'problem-1-1-2', 'problem-P1', 'problem-P2', 'arithmetic-div'],
  'i1-station-branches-graph4d': ['branches', 'graph4d', 'problem-2-4-1'],
  'i1-station-curves-linear': ['problem-1-5-1', 'curves', 'problem-2-1-3', 'problem-P3', 'problem-P4', 'linear'],
  'i1-station-distance-sets': ['problem-1-2-2', 'problem-1-2-1', 'distance', 'problem-1-5-2', 'sets'],
  'i1-station-home-problems': ['home', 'problems'],
  'i1-station-lab': ['lab'],
  'i1-station-limits-derivative': ['problem-2-3-1', 'problem-P5', 'limits', 'problem-3-1-1', 'derivative', 'problem-3-1-2', 'problem-P6'],
  'i1-station-mappings-cr': ['problem-2-1-1', 'mappings', 'problem-3-2-1', 'cauchy-riemann', 'problem-P7'],
  'i1-station-powermap-reciprocal': ['problem-2-1-2', 'problem-2-2-1', 'problem-2-5-1'],
  'i1-station-roots-principal': ['roots', 'principal-root', 'problem-1-4-1', 'problem-1-4-2', 'problem-1-4-3', 'problem-2-2-2'],
  'i1-station-staircase-powers': ['staircase', 'powers', 'problem-1-3-2', 'topic-T2-4'],
  'wave0-sync': ['wave0-sync'],
  // iteration 2 (docs/ARCHITECTURE.md section 8): a row for a script that does not exist yet is harmless
  'i2-decisions-kit': ['home', 'nosuchplace'],
  'i2-media-core': ['home', 'staircase'],
  'i2-walk-shell': ['home', 'staircase', 'roots-m16'],
  'i2-rehearse': ['rehearse', 'rehearse-1-4-2-s7', 'rehearse-2-5-1-s3', 'rehearse-P5-s1'],
  'i2-lab-diary': ['lab'],
  'i2-pictures': ['staircase', 'problem-1-1-1', 'graph4d'],
  'i2-home-index-deck': ['home', 'problems', 'problems-names-all'],
  'i2-adopt-ch1': ['addresses', 'problem-1-2-1', 'problem-1-3-2', 'roots-m16', 'problem-1-5-2', 'problem-1-5-1', 'problem-2-1-3'],
  'i2-adopt-ch2-3': ['mappings', 'problem-2-1-2', 'problem-2-2-2', 'problem-2-4-1', 'problem-2-5-1', 'problem-2-3-1', 'problem-3-1-2', 'problem-3-2-1'],
};

const argv = process.argv.slice(2);
let jobs = 2;
const filters = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--jobs') jobs = Math.max(1, Number(argv[++i]) || 2);
  else filters.push(argv[i]);
}

const scripts = fs.readdirSync(path.join(ROOT, 'tests', 'interact'))
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .map((f) => f.slice(0, -4))
  .filter((name) => !filters.length || filters.some((s) => name.includes(s)));

const missing = scripts.filter((s) => !ROUTES[s]);
if (missing.length) {
  console.error(`No routes listed for: ${missing.join(', ')}. Add them to ROUTES in tools/interact-all.mjs.`);
  process.exit(2);
}

function run(name) {
  return new Promise((resolve) => {
    const args = ['tools/smoke.mjs', '--route', ROUTES[name].join(','), '--script', `tests/interact/${name}.mjs`, '--dark', '--no-shots'];
    const child = spawn(process.execPath, args, { cwd: ROOT });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ name, code, out }));
  });
}

const queue = [...scripts];
const results = [];
async function worker() {
  while (queue.length) {
    const name = queue.shift();
    const r = await run(name);
    const summary = (r.out.match(/(\d+)\/(\d+) checks passed/) || [])[0] || 'no summary';
    console.log(`${r.code === 0 ? 'ok  ' : 'FAIL'} ${name}  (${summary})`);
    if (r.code !== 0) console.log(r.out.split('\n').filter((l) => /FAIL|- /.test(l)).slice(0, 12).map((l) => '       ' + l).join('\n'));
    results.push(r);
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, scripts.length) }, worker));
const failed = results.filter((r) => r.code !== 0);
console.log(`\n${results.length - failed.length}/${results.length} interaction scripts passed.`);
process.exit(failed.length ? 1 : 0);
