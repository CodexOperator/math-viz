#!/usr/bin/env node
// Copy only the files the site needs at runtime into a folder that any static host can serve
// (GitHub Pages, a zip for offline use, the claude.ai Artifact publish).
//
//   node tools/publish/build-site.mjs                 -> build/site
//   node tools/publish/build-site.mjs --out <dir>
//   node tools/publish/build-site.mjs --zip           also write build/math-viz-site.zip (needs `zip`)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const outArg = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'build/site';
const OUT = path.resolve(ROOT, outArg);

const INCLUDE = ['index.html', 'css', 'js', 'vendor', 'media/manifest.js', 'media/video', 'media/audio', 'LICENSE'];
const SKIP = (rel) => /(^|\/)\.|\.raw$|\.hashes\.json$/.test(rel);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let files = 0, bytes = 0;
const big = [];
function copy(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src) || SKIP(rel)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) { for (const f of fs.readdirSync(src)) copy(path.posix.join(rel, f)); return; }
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  files++; bytes += st.size;
  if (st.size > 15 * 1024 * 1024) big.push(`${rel} (${(st.size / 1048576).toFixed(1)} MB)`);
}
INCLUDE.forEach(copy);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ commit: sha, built: new Date().toISOString() }, null, 2) + '\n');
console.log(`Built ${path.relative(ROOT, OUT)}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB (commit ${sha}).`);
if (big.length) console.warn(`Files over 15 MB (too big for a claude.ai Artifact; fine for GitHub Pages): ${big.join(', ')}`);
if (!fs.existsSync(path.join(OUT, 'index.html'))) { console.error('index.html is missing; nothing to publish.'); process.exit(1); }

if (argv.includes('--zip')) {
  const zipPath = path.join(path.dirname(OUT), 'math-viz-site.zip');
  fs.rmSync(zipPath, { force: true });
  const r = spawnSync('zip', ['-qr', zipPath, '.'], { cwd: OUT, stdio: 'inherit' });
  if (r.status === 0) console.log(`Wrote ${path.relative(ROOT, zipPath)}. Unzip and run a static server in it (see README).`);
  else console.error('zip failed (is the zip command installed?)');
}
