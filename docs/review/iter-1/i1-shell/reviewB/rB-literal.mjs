// Throwaway: literal A3 and A4 checks, plus independent probes of the fix-round-1 issues.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = '/home/user/math-viz';
const OUT = path.join(ROOT, 'docs/review/iter-1/i1-shell/reviewB');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const globalRoot = execSync('npm root -g').toString().trim();
const require = createRequire(path.join(globalRoot, 'noop.js'));
const { chromium } = require(path.join(globalRoot, 'playwright'));
const browser = await chromium.launch();
const results = [];
const ok = (c, m) => { results.push([c ? 'PASS' : 'FAIL', m]); console.log((c ? 'PASS ' : 'FAIL ') + m); };

for (const vp of [{ n: 'desktop', w: 1280, h: 860 }, { n: 'phone', w: 390, h: 844 }, { n: 'tiny', w: 320, h: 640 }]) {
  console.log('=== ' + vp.n);
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));
  await page.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(base)) return r.continue(); external.push(u); return r.abort(); });
  await page.goto(`${base}/index.html#nosuchplace`, { waitUntil: 'load' });
  await page.waitForSelector('#view[data-state]');
  ok(consoleErrors.length === 0, `${vp.n}: no console errors on #nosuchplace load (${consoleErrors.length})`);
  ok(external.length === 0, `${vp.n}: no external requests (${external.join(',')})`);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(ov <= 0, `${vp.n}: overflow ${ov}`);
  // A3 literal
  await page.evaluate(() => { location.hash = '#distance'; });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ err: document.querySelectorAll('[data-station-error]').length, kids: document.querySelector('#station-distance')?.children.length ?? -1 }));
  ok(r.err > 0 || r.kids > 0, `${vp.n}: A3 #distance -> err=${r.err} kids=${r.kids}`);
  ok(consoleErrors.some((e) => e.startsWith('[mv] station "distance" failed to load')), `${vp.n}: failing import reported by console.error`);
  await page.evaluate(() => { location.hash = '#nosuchplace'; });
  await page.waitForTimeout(300);
  ok((await page.locator('[data-station-error]').count()) === 0, `${vp.n}: no data-station-error after hash back`);
  ok((await page.locator('#no-such-place').count()) === 1 && (await page.locator('#no-such-place [data-station-error]').count()) === 0, `${vp.n}: unknown route panel has no data-station-error`);
  // A4 literal
  await page.evaluate(() => { window.__tc = 0; document.addEventListener('themechange', () => window.__tc++); });
  const t0 = await page.evaluate(() => document.documentElement.dataset.theme || 'none');
  await page.click('#theme-toggle');
  const t1 = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, c: window.__tc, ls: (() => { try { return localStorage.getItem('mv:theme'); } catch { return 'x'; } })() }));
  ok((t1.t === 'dark' || t1.t === 'light') && t1.t !== t0 && t1.c === 1 && t1.ls === t1.t, `${vp.n}: A4 click1 ${t0} -> ${JSON.stringify(t1)}`);
  await page.click('#theme-toggle');
  const t2 = await page.evaluate(() => ({ t: document.documentElement.dataset.theme, c: window.__tc, ls: localStorage.getItem('mv:theme') }));
  ok(t2.t !== t1.t && t2.c === 2 && t2.ls === t2.t, `${vp.n}: A4 click2 flips ${JSON.stringify(t2)}`);
  // with localStorage throwing
  const ctx2 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(e.message));
  p2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()); });
  await p2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p2.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await p2.goto(`${base}/index.html#nosuchplace`, { waitUntil: 'load' });
  await p2.waitForSelector('#view[data-state]');
  await p2.click('#theme-toggle');
  await p2.click('#theme-toggle');
  ok(errs2.length === 0, `${vp.n}: works with localStorage throwing (${errs2.join('|')})`);
  await ctx2.close();
  await ctx.close();
}
await browser.close();
server.close();
console.log(results.filter((r) => r[0] === 'FAIL').length + ' failures');
