// Review B throwaway: contract checks for i1-station-staircase-powers (ids, labels, hrefs, h1, lifecycle, keyboard, emoji).
import { readText, settle, clickChip } from '/home/user/math-viz/tests/interact/_helpers.mjs';
import { STATIONS } from '/home/user/math-viz/js/registry.js';

const stationIds = new Set(STATIONS.map((s) => s.id));

export default async function (page, ctx) {
  const { assert, log, route } = ctx;
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });

  await settle(page, 4);
  const info = await page.evaluate(() => {
    const view = document.querySelector('#view');
    const unnamed = [];
    for (const el of view.querySelectorAll('button, input, select, textarea, a[href]')) {
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim() || (el.labels && el.labels[0] && el.labels[0].textContent.trim()) || el.getAttribute('title');
      if (!name) unnamed.push(el.tagName + '#' + el.id);
      if (!el.id && el.tagName !== 'A' && !el.closest('.staircase-wrap')) unnamed.push('NOID ' + el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30));
    }
    const hrefs = [...view.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    const dupIds = [];
    const seen = new Set();
    for (const el of view.querySelectorAll('[id]')) { if (seen.has(el.id)) dupIds.push(el.id); seen.add(el.id); }
    const text = view.innerText;
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}]/u.test(text);
    return { h1: view.querySelectorAll('h1').length, unnamed, hrefs, dupIds, emoji, nullText: /\bnull\b|undefined(?! \(| z|;|\)|\n| has)|NaN/.test(text.replace(/Arg z = undefined/g, '')), nan: /NaN/.test(text) };
  });
  assert(info.h1 === 1, `h1 count ${info.h1}`);
  assert(info.unnamed.length === 0, `unnamed/no-id controls: ${JSON.stringify(info.unnamed)}`);
  assert(info.dupIds.length === 0, `duplicate ids: ${JSON.stringify(info.dupIds)}`);
  assert(!info.emoji, 'emoji in text');
  assert(!info.nan, 'NaN text on the page');
  for (const h of info.hrefs) {
    assert(/^#[A-Za-z0-9._~-]+$/.test(h), `bad href ${h}`);
    const tok = h.slice(1);
    const ok = stationIds.has(tok) || /^(problem|topic)-/.test(tok) || tok.includes('-');
    assert(ok, `href ${h} does not look like a route`);
  }
  log(`ids ok; hrefs: ${[...new Set(info.hrefs)].join(' ')}`);

  if (route === 'staircase') {
    // keyboard: focus the handle and press arrows
    const before = await page.evaluate(() => { const b = document.getElementById('staircase-plane-z'); return { re: Number(b.dataset.re), im: Number(b.dataset.im) }; });
    await page.focus('#staircase-plane-z');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await settle(page, 3);
    const after = await page.evaluate(() => { const b = document.getElementById('staircase-plane-z'); return { re: Number(b.dataset.re), im: Number(b.dataset.im) }; });
    assert(after.re > before.re + 0.2, `keyboard moves the handle: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    const ro = await readText(page, '#staircase-readout');
    log(`keyboard ok: ${ro}`);
    // seam output default and a value of pi normalises to -pi
    await page.evaluate(() => { const s = document.getElementById('staircase-seam'); s.value = String(Math.PI); s.dispatchEvent(new Event('input', { bubbles: true })); });
    await settle(page, 2);
    assert((await readText(page, '#staircase-window')).startsWith('Home window: (-π, π]'), 'seam pi == -pi window');
    // seam chips
    await clickChip(page, 'staircase-seam-negimag');
    assert((await readText(page, '#staircase-window')).includes('(-π/2, 3π/2]'), `negimag window: ${await readText(page, '#staircase-window')}`);
    await clickChip(page, 'staircase-seam-principal');
    // walk then leave mid-walk
    await clickChip(page, 'staircase-walk');
    await page.waitForTimeout(500);
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForTimeout(1200);
    const gone = await page.evaluate(() => ({ stair: !!(window.__mv && window.__mv.staircase), planes: window.__mv && window.__mv.planes ? [...window.__mv.planes.keys()].filter((k) => k.startsWith('staircase') || k.startsWith('powers')) : [] }));
    assert(!gone.stair, 'window.__mv.staircase removed after unmount');
    assert(gone.planes.length === 0, `planes left after unmount: ${gone.planes}`);
    // come back and go to powers and back
    await page.evaluate(() => { location.hash = '#powers'; });
    await page.waitForTimeout(800);
    await page.evaluate(() => { location.hash = '#staircase'; });
    await page.waitForTimeout(800);
    assert((await readText(page, '#staircase-readout')).startsWith('z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0'), 'fresh state on remount');
    // reduced-motion walk remains OK
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { location.hash = '#powers'; });
    await page.waitForTimeout(600);
    await page.evaluate(() => { location.hash = '#staircase'; });
    await page.waitForTimeout(600);
    assert((await readText(page, '#staircase-walk')) === 'Step 30° counterclockwise', 'reduced-motion label on mount');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  if (route === 'powers') {
    const before = await page.evaluate(() => { const b = document.getElementById('powers-plane-z'); return { re: Number(b.dataset.re), im: Number(b.dataset.im) }; });
    await page.focus('#powers-plane-z');
    for (let i = 0; i < 2; i++) await page.keyboard.press('Shift+ArrowUp');
    await settle(page, 3);
    const after = await page.evaluate(() => { const b = document.getElementById('powers-plane-z'); return { re: Number(b.dataset.re), im: Number(b.dataset.im) }; });
    assert(after.im > before.im + 0.2, `keyboard moves the powers handle`);
    // every n gives a self-consistent explainer row: same point agrees
    for (let n = 1; n <= 12; n++) {
      await page.evaluate((n) => { const s = document.getElementById('powers-n'); s.value = String(n); s.dispatchEvent(new Event('input', { bubbles: true })); }, n);
      await settle(page, 3);
      const agree = await page.getAttribute('#powers-ex-same', 'data-agree');
      assert(agree === 'true', `n=${n}: same-point agree = ${agree}`);
    }
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForTimeout(800);
    const gone = await page.evaluate(() => ({ p: !!(window.__mv && window.__mv.powers), planes: window.__mv && window.__mv.planes ? [...window.__mv.planes.keys()].filter((k) => k.startsWith('powers')) : [] }));
    assert(!gone.p && gone.planes.length === 0, `powers cleanup: ${JSON.stringify(gone)}`);
  }
  const real = errs.filter((e) => !/fonts\.(googleapis|gstatic)/.test(e));
  assert(real.length === 0, `console/page errors: ${JSON.stringify(real)}`);
  log(`contract ok (${route})`);
}
