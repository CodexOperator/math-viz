import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = '/home/user/math-viz'; const OUT = path.join(ROOT, 'docs/review/iter-1/i1-shell/reviewB');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const gr = execSync('npm root -g').toString().trim(); const require = createRequire(path.join(gr, 'noop.js')); const { chromium } = require(path.join(gr, 'playwright'));
const browser = await chromium.launch();
for (const [name, vp, scheme] of [['light-desktop', { width: 1280, height: 860 }, 'light'], ['dark-desktop', { width: 1280, height: 860 }, 'dark'], ['light-phone', { width: 390, height: 844 }, 'light'], ['dark-phone', { width: 390, height: 844 }, 'dark']]) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await page.goto(`${base}/index.html#home`); await page.waitForSelector('#view[data-state]');
  await page.click('#colour-key summary');
  await page.locator('#colour-key').scrollIntoViewIfNeeded();
  await page.locator('#colour-key').screenshot({ path: path.join(OUT, `key-${name}.png`) });
  await ctx.close();
}
// drawer open viewport shot on phone, at #distance (error panel), light and dark
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await page.goto(`${base}/index.html#distance`); await page.waitForSelector('#view[data-state="error"]');
  await page.click('#nav-toggle');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `drawer-${scheme}.png`) });
  await ctx.close();
}
await browser.close(); server.close();
