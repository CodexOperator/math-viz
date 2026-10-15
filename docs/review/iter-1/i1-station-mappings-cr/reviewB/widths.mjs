import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const ROOT = '/home/user/math-viz';
const globalRoot = execSync('npm root -g').toString().trim();
const require = createRequire(path.join(globalRoot, 'noop.js'));
const { chromium } = require(path.join(globalRoot, 'playwright'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => { let f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
for (const route of ['mappings', 'cauchy-riemann', 'problem-P7']) {
  for (const w of [320, 360, 400, 600, 768, 900, 1024, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text() + (m.location().url || ''))) errs.push(m.text()); });
    await page.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
    await page.goto(`${base}/index.html#${route}`); await page.waitForTimeout(900);
    const o = await page.evaluate(() => {
      const de = document.documentElement; const over = de.scrollWidth - de.clientWidth;
      const wide = [...document.querySelectorAll('#view *')].filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map((e) => e.tagName + '#' + e.id + '.' + e.className);
      const planes = [...document.querySelectorAll('canvas')].map((c) => Math.round(c.getBoundingClientRect().width));
      return { over, wide, planes };
    });
    console.log(route.padEnd(15), String(w).padStart(5), 'overflow', o.over, 'canvases', o.planes.join(','), o.wide.length ? 'WIDE ' + o.wide.join(' ') : '', errs.length ? 'ERR ' + errs.join('|') : '');
    await ctx.close();
  }
}
await browser.close(); server.close();
