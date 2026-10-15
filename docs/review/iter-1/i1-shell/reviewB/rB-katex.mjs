import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = '/home/user/math-viz';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const gr = execSync('npm root -g').toString().trim(); const require = createRequire(path.join(gr, 'noop.js')); const { chromium } = require(path.join(gr, 'playwright'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();
const reqs = [];
page.on('request', (r) => reqs.push(r.url()));
await page.goto(`${base}/index.html#nosuchplace`); await page.waitForSelector('#view[data-state]');
console.log('katex defined at start:', await page.evaluate(() => typeof window.katex?.renderToString));
console.log('external requests:', reqs.filter((u) => !u.startsWith(base) && !u.startsWith('data:')));
console.log('nav link count', await page.locator('#site-nav a.nav-link').count(), 'groups', await page.locator('#site-nav .nav-part').count());
// back/forward
await page.evaluate(() => { location.hash = '#roots'; }); await page.waitForTimeout(400);
await page.goBack(); await page.waitForTimeout(400);
console.log('after back:', await page.evaluate(() => document.querySelector('#view').dataset.route + '/' + document.querySelector('#view').dataset.state));
await page.goForward(); await page.waitForTimeout(400);
console.log('after forward:', await page.evaluate(() => document.querySelector('#view').dataset.route + '/' + document.querySelector('#view').dataset.state));
// bad hashes don't throw
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
for (const h of ['#a=b', '#%E0%A4%A', '#problem-', '#' + 'x'.repeat(500), '#', '#home']) { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(150); }
console.log('page errors from odd hashes:', errs);
await browser.close(); server.close();
