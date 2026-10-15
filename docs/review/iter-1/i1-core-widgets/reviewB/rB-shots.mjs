// Review B: targeted element screenshots of the fixes claimed in the build report.
//   node tools/smoke.mjs --route widgets-fixture --script docs/review/iter-1/i1-core-widgets/reviewB/rB-shots.mjs --dark --no-shots
import path from 'node:path';
import fs from 'node:fs';
const OUT = path.resolve('docs/review/iter-1/i1-core-widgets/reviewB/zoom');

export default async function (page, ctx) {
  const { log, assert, viewport } = ctx;
  fs.mkdirSync(OUT, { recursive: true });
  const dark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches);
  const tag = `${viewport.width}${dark ? 'd' : 'l'}`;
  await page.evaluate(async () => {
    const kx = await import('./js/core/katex.js'); const ex = await import('./js/core/explainer.js'); const st = await import('./js/core/staircase.js');
    const sec = document.createElement('section'); sec.id = 'rbz'; sec.style.cssText = 'padding:8px;display:grid;gap:14px;justify-items:start';
    (document.getElementById('view') || document.body).appendChild(sec);
    const mkh = (id, w) => { const d = document.createElement('div'); d.id = id; d.style.width = w; sec.appendChild(d); return d; };
    const A = st.createStaircase(mkh('z-a', 'min(380px,100%)'), { id: 'za', onPick: () => {} }); A.update(2 * Math.PI / 3);
    const B = st.createStaircase(mkh('z-b', 'min(380px,100%)'), { id: 'zb', onPick: () => {} }); B.update(null);
    const C = st.createStaircase(mkh('z-c', 'min(320px,100%)'), { id: 'zc', kMin: -5, kMax: 5, onPick: () => {} }); C.update(0.7);
    const D = ex.createExplainer(mkh('z-d', 'min(320px,100%)'), { id: 'zd', rows: [{ id: 'a', label: 'z1z2', cart: () => kx.cart('5 + 14i'), polar: () => kx.polar('14.866\\,e^{i\\,1.228}') }], same: () => ({ cart: '', polar: '' }) });
    D.update({});
    const E = ex.createExplainer(mkh('z-e', 'min(720px,100%)'), { id: 'ze', title: 'Not checked, wide', rows: [{ id: 'a', label: 'z1z2', native: 'polar', cart: () => kx.cart('5 + 14i'), polar: () => kx.polar('14.866\\,e^{i\\,1.228}') }], same: () => ({ cart: '', polar: '' }) });
    E.update({});
    window.__rbz = { A, B, C, D, E };
  });
  await page.waitForTimeout(150);
  // pick row 1 then keyboard-focus it
  await page.click('#za-k1 button'); await page.focus('#za-k0 button'); await page.keyboard.press('ArrowUp');
  const el = async (sel, name) => { const h = await page.$(sel); await h.scrollIntoViewIfNeeded(); await page.waitForTimeout(80); await h.screenshot({ path: path.join(OUT, `${name}-${tag}.png`) }); };
  await el('#z-a', 'focus-picked');
  await page.mouse.move(0, 0);
  await el('#z-b', 'z0');
  await el('#z-c', 'dense-320');
  await el('#z-d', 'notchecked-320');
  await el('#z-e', 'notchecked-wide');
  const info = await page.evaluate(() => ({
    bandZ0: getComputedStyle(document.querySelector('#z-b .staircase-home')).display,
    firstDec: document.querySelector('#zc-k1 .stair-text').textContent, clipped: [...document.querySelectorAll('#z-c .stair-text')].filter((n) => n.scrollWidth > n.clientWidth + 1).length,
    sameText: document.getElementById('zd-same').textContent.replace(/\s+/g, ' '),
  }));
  log(JSON.stringify(info));
  assert(info.bandZ0 === 'none', 'band hidden at z = 0');
  assert(info.clipped === 0, 'no truncated step text in an 11-row staircase at 320px');
  await page.evaluate(() => { document.getElementById('rbz').remove(); delete window.__rbz; });
}
