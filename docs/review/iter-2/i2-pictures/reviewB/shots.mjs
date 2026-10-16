// throwaway: element screenshots of the staircase helix and graph4d shadows, desktop and phone, light and dark
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = path.resolve('.');
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = createRequire(path.join(globalRoot, 'noop.js'))(path.join(globalRoot, 'playwright'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.vtt': 'text/vtt' };
const server = http.createServer((req, res) => { let f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = 'docs/review/iter-2/i2-pictures/reviewB/el'; fs.mkdirSync(out, { recursive: true });
const views = [['desktop', 1280, 860, 'light'], ['desktop-dark', 1280, 860, 'dark'], ['phone', 390, 844, 'light'], ['phone-dark', 390, 844, 'dark']];
for (const [label, w, h, scheme] of views) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text() + (m.location().url || ''))) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await page.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
  for (const [route, sels] of [['staircase', ['#staircase-helix', '#staircase-plane-host']], ['graph4d', ['#graph4d-view', '#graph4d-shadows']], ['problem-1-1-1', ['#arithmetic-plane-host', '#arithmetic-ruler-host']]]) {
    await page.goto(`${base}/index.html#${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    for (const s of sels) {
      const el = page.locator(s).first();
      if (await el.count() === 0) { console.log(label, route, s, 'MISSING'); continue; }
      await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
      const box = await el.boundingBox();
      await el.screenshot({ path: `${out}/${route}-${s.slice(1)}-${label}.png` });
      console.log(label, route, s, JSON.stringify(box && { w: Math.round(box.width), h: Math.round(box.height) }));
    }
  }
  console.log(label, 'errors', JSON.stringify(errs.filter((e) => !/ERR_ABORTED|media\/video/.test(e))));
  await ctx.close();
}
await browser.close(); server.close();
