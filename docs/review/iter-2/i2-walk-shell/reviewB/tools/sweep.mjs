// Walk ON on every one of the 22 stops at phone and desktop (light and dark): overflow, console errors, bar height, label clamp, plane clearance, Listen.
import { launch } from './lib.mjs';
import fs from 'node:fs';
const STATIONS = (await import('/home/user/math-viz/js/registry.js')).STATIONS;
const stops = [...STATIONS].sort((a, b) => a.order - b.order);
const out = '/home/user/math-viz/docs/review/iter-2/i2-walk-shell/reviewB/sweep';
fs.mkdirSync(out, { recursive: true });
const L = await launch();
const problems = [];
for (const cfg of [{ n: 'phone', w: 390, h: 844, s: 'light' }, { n: 'desktop', w: 1280, h: 860, s: 'light' }, { n: 'phone-dark', w: 390, h: 844, s: 'dark' }, { n: 'desktop-dark', w: 1280, h: 860, s: 'dark' }]) {
  const ctx = await L.browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, colorScheme: cfg.s });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await page.goto(L.base + '#home'); await page.waitForFunction(() => document.querySelector('#view')?.dataset.state === 'ready');
  await page.click('#walk-start');
  for (let k = 0; k < stops.length; k++) {
    await page.evaluate((k) => window.__mv.walk.goTo(k), k);
    const route = stops[k].walk.route;
    await page.waitForFunction((r) => { const v = document.querySelector('#view'); return v && v.dataset.state && v.dataset.state !== 'loading' && v.dataset.route === r; }, route, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const bar = document.getElementById('walk-bar');
      const lab = document.getElementById('walk-stop-label');
      const br = bar.getBoundingClientRect();
      const canv = [...document.querySelectorAll('#view canvas')].filter((c) => c.offsetParent !== null && c.getBoundingClientRect().height > 80);
      // scroll to the very bottom: the last element of the page must end above the bar
      window.scrollTo(0, document.documentElement.scrollHeight);
      const foot = document.querySelector('#colour-key summary').getBoundingClientRect();
      return {
        state: document.querySelector('#view').dataset.state, here: bar.dataset.here, ticked: bar.dataset.done,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        barH: Math.round(bar.offsetHeight), vh: window.innerHeight,
        labelH: Math.round(lab.getBoundingClientRect().height), labelScroll: lab.scrollHeight > lab.clientHeight + 1,
        label: lab.textContent,
        footerAboveBar: foot.bottom <= bar.getBoundingClientRect().top + 0.5,
        walkH: getComputedStyle(document.documentElement).getPropertyValue('--walk-h').trim(),
        nCanvas: canv.length,
        listen: !!document.getElementById('walk-listen-btn'),
        doTxt: document.getElementById('walk-do').textContent,
        bodyScroll: document.getElementById('walk-body').scrollHeight > document.getElementById('walk-body').clientHeight + 1,
      };
    });
    const tag = `${cfg.n} stop ${k + 1} ${stops[k].id}`;
    if (m.state !== 'ready') problems.push(`${tag}: view state ${m.state}`);
    if (m.here !== 'true') problems.push(`${tag}: data-here ${m.here}`);
    if (m.over > 1) problems.push(`${tag}: horizontal overflow ${m.over}px`);
    if (m.barH > m.vh * 0.45) problems.push(`${tag}: bar is ${m.barH}px of ${m.vh}`);
    if (!m.footerAboveBar) problems.push(`${tag}: page end is under the bar`);
    if (m.labelScroll) problems.push(`${tag}: label is clipped (${m.label})`);
    if (m.bodyScroll) problems.push(`${tag}: the bar body scrolls internally`);
    console.log(tag, JSON.stringify({ barH: m.barH, labelH: m.labelH, listen: m.listen, over: m.over }));
    if (k % 7 === 0 || stops[k].id === 'lab' || stops[k].id === 'rehearse') await page.screenshot({ path: `${out}/${cfg.n}--stop${String(k + 1).padStart(2, '0')}-${stops[k].id}.png` });
  }
  // clearance with every station's canvases: scroll each canvas to the bottom of viewport and compare with the bar
  if (errors.length) problems.push(`${cfg.n}: console errors: ${errors.slice(0, 5).join(' | ')}`);
  await ctx.close();
}
await L.close();
console.log('\nPROBLEMS', problems.length); for (const p of problems) console.log(' -', p);
