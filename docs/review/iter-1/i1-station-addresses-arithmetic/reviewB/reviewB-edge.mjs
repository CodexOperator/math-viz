import { settle, readText, clickChip, dragHandle, handleZ } from '../../../../../tests/interact/_helpers.mjs';
const tex = (page, id) => page.evaluate((i) => { const el = document.getElementById(i); if (!el) return null; const a = el.querySelector('annotation[encoding="application/x-tex"]'); return (el.dataset.tex || (a ? a.textContent : el.textContent.trim())).replace(/\u2212/g, '-'); }, id);
async function typeChange(page, id, text) {
  await page.evaluate(({ id, text }) => { const el = document.getElementById(id); el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, { id, text });
  await settle(page, 4);
}
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  const ok = (c, m) => { log((c ? 'PASS ' : 'FAIL ') + m); assert(c, m); };
  if (route !== 'arithmetic') return;
  await settle(page, 6);
  // --- A6: proofs are live ---
  await typeChange(page, 'arithmetic-z1-input', '1 + i');
  await typeChange(page, 'arithmetic-z2-input', '2 - i');
  const p1 = await tex(page, 'arithmetic-p1-lhs-cart'); const p1r = await tex(page, 'arithmetic-p1-rhs-cart');
  log('P1 lhs: ' + p1 + ' | rhs: ' + p1r);
  // (1+i)(2-i) = 2 - i + 2i - i^2 = 3 + i ; conj = 3 - i ; conj z1 conj z2 = (1-i)(2+i) = 2 + i - 2i - i^2 = 3 - i
  ok(p1.includes('3 - i') && p1r.includes('3 - i'), 'P1 live: both sides 3 - i for z1 = 1 + i, z2 = 2 - i');
  const p2 = await tex(page, 'arithmetic-p2-zzbar-cart'); log('P2: ' + p2);
  ok(p2.includes('= 2'), 'P2 live: z conj z = 2 for z = 1 + i');
  const ag = await page.evaluate(() => ['arithmetic-ex-same', 'arithmetic-p1-same', 'arithmetic-p2-same'].map((i) => document.getElementById(i).dataset.agree));
  ok(ag.every((x) => x === 'true'), 'all three agree footers true: ' + ag.join(','));
  // chips
  const hrefs = await page.evaluate(() => [document.getElementById('arithmetic-p1-chip').getAttribute('href'), document.getElementById('arithmetic-p2-chip').getAttribute('href')]);
  ok(hrefs[0] === '#problem-P1' && hrefs[1] === '#problem-P2', 'proof chips link ' + hrefs.join(','));
  // drag z1 and see the proofs change
  await dragHandle(page, 'arithmetic-plane-z1', { re: 2, im: 1 });
  const p1b = await tex(page, 'arithmetic-p1-lhs-cart'); log('P1 after drag: ' + p1b);
  // (2+i) -> conj 2-i; times conj(2-i... z2=2-i conj = 2+i): (2-i)(2+i) = 5
  ok(p1b.includes('(2 - i)(2 + i) = 5'), 'P1 live after drag z1 -> (2 - i)(2 + i) = 5');

  // --- random numeric agreement sweep through the DOM ---
  const seeds = [[3, -2, -1, 4], [0.5, 0.5, -2, 1], [-3, 0, 0, -3], [1, 1, 0, 1], [-1.5, -1.5, -1.5, 1.5], [7, 2, 0.25, -0.5]];
  for (const mode of ['add', 'sub', 'mul', 'div', 'conj', 'inv']) {
    await clickChip(page, 'arithmetic-mode-' + mode);
    for (const [a, b, c, d] of seeds) {
      await typeChange(page, 'arithmetic-z1-input', `${a} + ${b}i`);
      await typeChange(page, 'arithmetic-z2-input', `${c} + ${d}i`);
      const st = await page.evaluate(() => window.__mv.arithmetic.state());
      const z1 = { re: a, im: b }, z2 = { re: c, im: d };
      const mulc = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
      const dv = (p, q) => { const n = q.re ** 2 + q.im ** 2; return { re: (p.re * q.re + p.im * q.im) / n, im: (p.im * q.re - p.re * q.im) / n }; };
      const want = { add: { re: a + c, im: b + d }, sub: { re: a - c, im: b - d }, mul: mulc(z1, z2), div: dv(z1, z2), conj: { re: a, im: -b }, inv: dv({ re: 1, im: 0 }, z1) }[mode];
      const good = st.result && Math.abs(st.result.re - want.re) < 1e-9 && Math.abs(st.result.im - want.im) < 1e-9;
      if (!good) ok(false, `${mode} ${a}+${b}i, ${c}+${d}i -> ${JSON.stringify(st.result)} want ${JSON.stringify(want)}`);
      const ag2 = await page.evaluate(() => document.getElementById('arithmetic-ex-same').dataset.agree);
      if (ag2 !== 'true') ok(false, `${mode} agree=${ag2} for ${a}+${b}i, ${c}+${d}i`);
    }
  }
  log('sweep done: 36 states, results and agree checked against independent arithmetic');

  // --- div by zero ---
  await clickChip(page, 'arithmetic-mode-div');
  await typeChange(page, 'arithmetic-z2-input', '0');
  log('div by 0 readout: ' + (await readText(page, '#arithmetic-readout')) + ' | note: ' + (await readText(page, '#arithmetic-note')));
  ok((await readText(page, '#arithmetic-readout')).includes('undefined'), 'division by 0 reads undefined');
  // bad input
  await typeChange(page, 'arithmetic-z1-input', '3 +* 2');
  log('bad input error: ' + (await readText(page, '#arithmetic-z1-error')));
  ok((await readText(page, '#arithmetic-z1-error')).length > 0, 'parse error is shown for bad z1');
  await typeChange(page, 'arithmetic-z1-input', '1000');
  log('range error: ' + (await readText(page, '#arithmetic-z1-error')));

  // --- play with the real clock ---
  await clickChip(page, 'arithmetic-preset-1-1-1');
  await clickChip(page, 'arithmetic-mode-mul');
  await clickChip(page, 'arithmetic-animate');
  await page.waitForTimeout(500);
  const mid = await page.evaluate(() => window.__mv.arithmetic.state().anim);
  log('mid-play: ' + JSON.stringify(mid) + ' caption: ' + (await readText(page, '#arithmetic-caption')));
  ok(mid.kind === 'playing', 'playing after click');
  await page.waitForFunction(() => window.__mv.arithmetic.state().anim.kind === 'done', null, { timeout: 6000 });
  const end = await page.evaluate(() => window.__mv.arithmetic.state());
  ok(Math.abs(end.anim.point.re - 5) < 1e-6 && Math.abs(end.anim.point.im - 14) < 1e-6, 'traveller ends on 5 + 14i: ' + JSON.stringify(end.anim.point));
  log('end caption: ' + (await readText(page, '#arithmetic-caption')) + ' announce: ' + (await readText(page, '#arithmetic-announce')));
  // mode change while playing
  await clickChip(page, 'arithmetic-animate');
  await page.waitForTimeout(200);
  await clickChip(page, 'arithmetic-mode-add');
  const after = await page.evaluate(() => window.__mv.arithmetic.state());
  ok(after.anim.kind === 'idle' && after.mode === 'add', 'mode change cancels the animation: ' + JSON.stringify(after.anim));

  // --- reduced motion: stepper ---
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clickChip(page, 'arithmetic-mode-mul');
  const lbl = await readText(page, '#arithmetic-animate');
  log('reduced-motion button label: ' + lbl);
  ok(/Next step/.test(lbl), 'button is a stepper under reduced motion');
  await clickChip(page, 'arithmetic-animate');
  const s1 = await page.evaluate(() => window.__mv.arithmetic.state().anim);
  await clickChip(page, 'arithmetic-animate');
  const s2 = await page.evaluate(() => window.__mv.arithmetic.state().anim);
  log('stepper states: ' + JSON.stringify([s1.kind, s1.step, s2.kind, s2.step]));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // --- keyboard nudge on z1 ---
  await clickChip(page, 'arithmetic-preset-1-1-1');
  await page.focus('#arithmetic-plane-z1');
  const before = await handleZ(page, 'arithmetic-plane-z1');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp');
  await settle(page, 3);
  const nud = await handleZ(page, 'arithmetic-plane-z1');
  log('keyboard nudge ' + JSON.stringify(before) + ' -> ' + JSON.stringify(nud));
  ok(Math.abs(nud.re - before.re - 0.1) < 1e-9 && Math.abs(nud.im - before.im - 0.1) < 1e-9, 'arrow keys move 0.1 with no snapping');

  // --- unmount ---
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(600);
  const gone = await page.evaluate(() => !(window.__mv && window.__mv.arithmetic) && !(window.__mv && window.__mv.addresses));
  ok(gone, 'hooks deleted after leaving the station');
  await page.evaluate(() => { location.hash = '#addresses'; });
  await page.waitForTimeout(600);
  const back = await page.evaluate(() => !!(window.__mv && window.__mv.addresses));
  ok(back, 'addresses mounts after navigation');
  await page.evaluate(() => { location.hash = '#arithmetic'; });
  await page.waitForTimeout(600);
  const back2 = await page.evaluate(() => !!(window.__mv && window.__mv.arithmetic) && !window.__mv.addresses);
  ok(back2, 'arithmetic mounts after navigation, addresses hook gone');
}
