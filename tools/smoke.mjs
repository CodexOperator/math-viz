#!/usr/bin/env node
// Headless smoke test for every station route.
//
//   node tools/smoke.mjs                      all routes in js/registry.js
//   node tools/smoke.mjs --route roots        one route (repeat or comma-separate for more)
//   node tools/smoke.mjs --out docs/review/x  screenshot folder (default docs/review/shots)
//   node tools/smoke.mjs --wait 1500          extra settle time per route in ms (default 800)
//   node tools/smoke.mjs --dark               also capture dark-theme desktop screenshots
//   node tools/smoke.mjs --no-shots           skip screenshots
//   node tools/smoke.mjs --route lab --script tests/interact/lab.mjs
//        the script exports `default async function (page, ctx)`; ctx has
//        { route, viewport, shot(name), log(msg), assert(cond, msg) }. A throw fails the route.
//        A script that provokes errors on purpose can also export
//          export const expectedErrors = [/regex/, ...]
//        and problem lines matching any of them are reported as expected instead of failing.
//
// Google Fonts requests are blocked (as in the tests' offline setting) and their failures are
// ignored, so a page may keep a Google Fonts <link> as long as its fallback fonts look right.
//
// Exit code 0 when every route loads with no console errors, page errors, failed local
// requests, external requests, horizontal overflow, or router error panel.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const opts = { routes: [], out: 'docs/review/shots', wait: 800, dark: false, shots: true, script: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--route') opts.routes.push(...argv[++i].split(',').filter(Boolean));
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--wait') opts.wait = Number(argv[++i]);
    else if (a === '--dark') opts.dark = true;
    else if (a === '--no-shots') opts.shots = false;
    else if (a === '--script') opts.script = argv[++i];
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  return opts;
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const globalRoot = execSync('npm root -g').toString().trim();
  const require = createRequire(path.join(globalRoot, 'noop.js'));
  return require(path.join(globalRoot, 'playwright'));
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(ROOT, urlPath);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function loadRoutes() {
  const reg = path.join(ROOT, 'js', 'registry.js');
  if (!fs.existsSync(reg)) return ['home'];
  const mod = await import(pathToFileURL(reg).href + `?t=${process.hrtime.bigint()}`);
  return (mod.STATIONS || []).map((s) => s.id);
}

const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;

async function checkRoute(browser, base, route, viewport, opts, userScript, label) {
  const problems = [];
  const context = await browser.newContext({ viewport, colorScheme: label.endsWith('dark') ? 'dark' : 'light', deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route('**/*', (r) => {
    const u = r.request().url();
    if (u.startsWith(base)) return r.continue();
    if (!FONT_HOSTS.test(u)) problems.push(`external request blocked: ${u}`);
    return r.abort();
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const where = (m.location() && m.location().url) || '';
    if (FONT_HOSTS.test(where) || (FONT_HOSTS.test(m.text()))) return;
    if (/Failed to load resource/.test(m.text()) && FONT_HOSTS.test(where)) return;
    problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('requestfailed', (r) => { if (r.url().startsWith(base)) problems.push(`request failed: ${r.url()}`); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });

  const shot = async (name) => {
    if (!opts.shots) return null;
    const dir = path.resolve(ROOT, opts.out);
    fs.mkdirSync(dir, { recursive: true });
    const abs = path.join(dir, `${route}--${label}${name ? '--' + name : ''}.png`);
    await page.screenshot({ path: abs, fullPage: true });
    return path.relative(ROOT, abs).startsWith('..') ? abs : path.relative(ROOT, abs);
  };
  const shots = [];
  try {
    await page.goto(`${base}/index.html#${route}`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(opts.wait);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      errorPanel: !!document.querySelector('[data-station-error]'),
      viewChildren: document.querySelector('#view')?.children.length ?? -1,
      title: document.title,
    }));
    if (state.overflow > 1) problems.push(`horizontal overflow of ${state.overflow}px`);
    if (state.errorPanel) problems.push('router showed the station error panel');
    if (state.viewChildren === 0) problems.push('#view is empty after load');
    if (state.viewChildren === -1) problems.push('no #view element found');
    const s = await shot('');
    if (s) shots.push(s);
    if (userScript) {
      const log = (msg) => console.log(`  [${route} ${label}] ${msg}`);
      const assert = (cond, msg) => { if (!cond) throw new Error(`assertion failed: ${msg}`); };
      try {
        await userScript(page, { route, viewport, label, log, assert, shot: async (n) => { const f = await shot(n); if (f) shots.push(f); return f; } });
      } catch (e) {
        problems.push(`interaction script failed: ${e.message}`);
      }
    }
  } catch (e) {
    problems.push(`navigation failed: ${e.message}`);
  }
  await context.close();
  const expected = (userScript && userScript.expectedErrors) || [];
  const real = problems.filter((p) => !expected.some((re) => re.test(p)));
  const allowed = problems.length - real.length;
  return { route, label, problems: real, allowed, shots };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const routes = opts.routes.length ? opts.routes : await loadRoutes();
  let userScript = null;
  if (opts.script) {
    const mod = await import(pathToFileURL(path.resolve(opts.script)).href);
    userScript = mod.default;
    if (userScript) userScript.expectedErrors = mod.expectedErrors || [];
  }
  const { chromium } = await loadPlaywright();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const results = [];
  const views = [
    { label: 'desktop', viewport: { width: 1280, height: 860 } },
    { label: 'phone', viewport: { width: 390, height: 844 } },
  ];
  if (opts.dark) views.push({ label: 'desktop-dark', viewport: { width: 1280, height: 860 } });
  for (const route of routes) {
    for (const v of views) {
      const r = await checkRoute(browser, base, route, v.viewport, opts, userScript, v.label);
      results.push(r);
      const status = r.problems.length ? 'FAIL' : 'ok  ';
      console.log(`${status} ${route} (${v.label})${r.allowed ? `  (${r.allowed} expected error line(s) ignored)` : ''}${r.shots.length ? '  → ' + r.shots.join(', ') : ''}`);
      for (const p of r.problems) console.log(`       - ${p}`);
    }
  }
  await browser.close();
  server.close();
  const failed = results.filter((r) => r.problems.length);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed across ${routes.length} route(s).`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
