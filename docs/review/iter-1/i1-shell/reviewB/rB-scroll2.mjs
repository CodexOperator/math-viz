import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = '/home/user/math-viz';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf'); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}`;
const gr = execSync('npm root -g').toString().trim(); const require = createRequire(path.join(gr, 'noop.js')); const { chromium } = require(path.join(gr, 'playwright'));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
const page = await ctx.newPage();
await page.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
await page.goto(`${base}/index.html#nosuchplace`); await page.waitForSelector('#view[data-state]');
const y = () => page.evaluate(() => Math.round(scrollY));
await page.evaluate(() => window.scrollTo(0, 400));
console.log('start', await y());

await page.evaluate(() => { window.__log = []; window.addEventListener('scroll', () => window.__log.push(Math.round(scrollY))); });
const b = await page.locator('#nav-toggle').boundingBox();
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(300);
console.log('REAL mouse click on toggle at', JSON.stringify(b), '-> scrollY', await y(), 'open?', await page.getAttribute('#nav-toggle', 'aria-expanded'), JSON.stringify(await page.evaluate(() => window.__log)));
await page.keyboard.press('Escape');
console.log('after Escape', await y());
// Playwright click() (scrolls into view first)
await page.evaluate(() => window.scrollTo(0, 400));
await page.click('#nav-toggle');
console.log('playwright click() ->', await y());
await browser.close(); server.close();
