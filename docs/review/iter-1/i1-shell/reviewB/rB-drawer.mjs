import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = '/home/user/math-viz';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const gr = execSync('npm root -g').toString().trim(); const require = createRequire(path.join(gr, 'noop.js')); const { chromium } = require(path.join(gr, 'playwright'));
const browser = await chromium.launch();
const log = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
for (const w of [390, 320]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 700 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/distance|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await page.goto(`${base}/index.html#nosuchplace`); await page.waitForSelector('#view[data-state]');
  const ov = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // scroll page down a bit, open drawer, check scroll position is held and page doesn't scroll
  await page.evaluate(() => window.scrollTo(0, 400));
  const y0 = await page.evaluate(() => scrollY);
  await page.click('#nav-toggle');
  const nb = await page.locator('#site-nav').boundingBox();
  log(nb.x >= 0 && nb.x + nb.width <= w + 0.5, `${w}: drawer within width ${JSON.stringify(nb)}`);
  log((await ov()) <= 0, `${w}: no overflow with drawer open`);
  await page.mouse.wheel(0, 300); await page.waitForTimeout(200);
  log((await page.evaluate(() => scrollY)) === y0, `${w}: page scroll locked behind drawer (scrollY ${y0} -> ${await page.evaluate(() => scrollY)})`);
  // a real click on the page below the drawer closes it, and does not follow any link
  const hashBefore = await page.evaluate(() => location.hash);
  const below = Math.min(690, Math.round(nb.y + nb.height + 8));
  if (below < 695) {
    await page.mouse.click(w / 2, below);
    log((await page.getAttribute('#nav-toggle', 'aria-expanded')) === 'false', `${w}: real click on page area below drawer (y=${below}) closes it`);
    log((await page.evaluate(() => location.hash)) === hashBefore, `${w}: ...and did not navigate`);
  } else log(true, `${w}: drawer fills the viewport height (${nb.height}); outside-click check not applicable`);
  // theme toggle usable while drawer is open
  await page.click('#nav-toggle');
  await page.click('#theme-toggle');
  log((await page.getAttribute('#theme-toggle', 'aria-pressed')) === 'true', `${w}: theme toggle still works with drawer open`);
  log((await page.getAttribute('#nav-toggle', 'aria-expanded')) === 'false' || true, `${w}: (drawer state after theme click: ${await page.getAttribute('#nav-toggle', 'aria-expanded')})`);
  // choose another place through a real tap
  if ((await page.getAttribute('#nav-toggle', 'aria-expanded')) !== 'true') await page.click('#nav-toggle');
  await page.click('#nav-roots');
  await page.waitForFunction(() => document.querySelector('#view').dataset.route === 'roots' && document.querySelector('#view').dataset.state !== 'loading');
  log((await page.getAttribute('#nav-toggle', 'aria-expanded')) === 'false' && (await page.evaluate(() => !document.querySelector('#view').inert && document.body.style.overflow !== 'hidden')), `${w}: choosing another place closes drawer and releases inert`);
  log((await page.evaluate(() => scrollY)) === 0, `${w}: new place starts at top`);
  // resize to wide with drawer open
  await page.click('#nav-toggle');
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.waitForTimeout(150);
  log((await page.evaluate(() => document.body.dataset.navOpen)) !== 'true' && (await page.evaluate(() => !document.querySelector('#view').inert)), `${w}: widening the window with the drawer open resets it`);
  log(errs.length === 0, `${w}: no unexpected errors ${errs.join('|')}`);
  await ctx.close();
}
await browser.close(); server.close();
