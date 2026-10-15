import fs from 'node:fs';
import path from 'node:path';
import { clickChip, settle, dragHandle } from '../../../../../tests/interact/_helpers.mjs';
const OUT = path.resolve('docs/review/iter-1/i1-station-branches-graph4d/reviewB/life');
fs.mkdirSync(OUT, { recursive: true });
export default async function (page, ctx) {
  if (ctx.route !== 'branches' || ctx.label !== 'desktop') return;
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.waitForSelector('#branches-readout');
  // churn: branches <-> graph4d <-> lab <-> home, 4 times
  for (let i = 0; i < 4; i++) {
    for (const r of ['graph4d', 'branches', 'lab', 'home', 'problem-2-4-1']) {
      await page.evaluate((r) => { location.hash = '#' + r; }, r);
      await page.waitForTimeout(350);
    }
  }
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(400);
  const mv = await page.evaluate(() => ({ branches: !!window.__mv?.branches, graph4d: !!window.__mv?.graph4d, views: window.__mv?.views3d ? [...window.__mv.views3d.keys()] : null, planes: window.__mv?.planes ? [...window.__mv.planes.keys()] : null }));
  ctx.log('after churn at #home: ' + JSON.stringify(mv));
  ctx.log('console errors/warnings during churn: ' + JSON.stringify(errs));
  // webgl contexts leak? count canvases
  ctx.log('canvases at home: ' + await page.evaluate(() => document.querySelectorAll('canvas').length));
  // live theme switch on branches and graph4d
  for (const r of ['branches', 'graph4d']) {
    await page.evaluate((r) => { location.hash = '#' + r; }, r);
    await page.waitForTimeout(900);
    await page.click('#theme-toggle');
    await page.waitForTimeout(700);
    const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const sel = r === 'branches' ? '.station-header' : '.station-header';
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(OUT, `${r}-after-toggle-${th}.png`), fullPage: false });
    const el = page.locator(r === 'branches' ? '[data-plane-id="branches-wplane"]' : '#graph4d-view'); await el.scrollIntoViewIfNeeded(); await settle(page, 5);
    await el.screenshot({ path: path.join(OUT, `${r}-el-${th}.png`) });
    ctx.log(r + ' theme now ' + th);
    await page.click('#theme-toggle'); await page.waitForTimeout(300);
  }
  ctx.log('errors after theme: ' + JSON.stringify(errs));
  // a11y: ids and names
  for (const r of ['branches', 'graph4d']) {
    await page.evaluate((r) => { location.hash = '#' + r; }, r);
    await page.waitForTimeout(900);
    const bad = await page.evaluate(() => [...document.querySelectorAll('#view button, #view input, #view select, #view a')].filter((e) => e.offsetParent !== null).map((e) => {
      const name = (e.getAttribute('aria-label') || e.textContent || '').trim() || (e.labels && e.labels[0] && e.labels[0].textContent.trim()) || e.getAttribute('title') || '';
      return { tag: e.tagName, id: e.id, name: name.slice(0, 40), href: e.getAttribute('href') };
    }).filter((x) => (!x.id && x.tag !== 'A') || !x.name));
    ctx.log(r + ' controls missing id or name: ' + JSON.stringify(bad));
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a')].map((a) => a.getAttribute('href')));
    ctx.log(r + ' hrefs: ' + JSON.stringify(hrefs));
  }
}
