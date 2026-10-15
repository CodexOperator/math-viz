// Review B: independent run of A2 and A3 exactly as the goal's "how" text reads.
import { dragHandle, clickChip, readText, settle, handleZ } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { route, log, assert, shot } = ctx;
  const attr = (sel, n) => page.evaluate(([s, k]) => { const e = document.querySelector(s); return e ? e.getAttribute(k) : null; }, [sel, n]);
  const slackOf = (t) => { const m = /slack = (-?[\d.]+)/.exec(t); return m ? Number(m[1]) : NaN; };
  if (route === 'problem-1-2-2') {
    await page.waitForSelector('#distance-plane-z1', { state: 'visible' });
    let r = await readText(page, '#distance-readout'); log('readout: ' + r);
    assert(r.includes('5.385') && r.includes('5 + 2i'), 'A2a readout has 5.385 and 5 + 2i: ' + r);
    await page.evaluate(() => { location.hash = '#problem-1-2-1'; }); await page.waitForTimeout(600);
    r = await readText(page, '#distance-readout'); log('readout: ' + r);
    assert(r.includes('center 1 + 2i') && r.includes('radius 3'), 'A2b: ' + r);
    await dragHandle(page, 'distance-plane-R', { re: 1, im: 6 });
    r = await readText(page, '#distance-readout'); log('readout: ' + r);
    assert(r.includes('radius 4'), 'A2c: ' + r);
    await clickChip(page, 'distance-mode-triangle');
    await dragHandle(page, 'distance-plane-z1', { re: 1, im: 1 });
    await dragHandle(page, 'distance-plane-z2', { re: 2, im: 2 });
    r = await readText(page, '#distance-readout'); log('readout: ' + r);
    assert(slackOf(r) < 0.02, 'A2d slack<0.02: ' + r);
    await dragHandle(page, 'distance-plane-z2', { re: -2, im: 2 });
    r = await readText(page, '#distance-readout'); log('readout: ' + r);
    assert(slackOf(r) > 1, 'A2e slack>1: ' + r);
    // independent numbers: z1=1+i, z2=-2+2i: |z1|=sqrt2, |z2|=sqrt8, z1+z2=-1+3i |.|=sqrt10 ; slack = 1.414+2.828-3.162=1.081
    const exp = Math.SQRT2 + Math.sqrt(8) - Math.sqrt(10);
    assert(Math.abs(slackOf(r) - exp) < 0.0006, `A2e independent slack ${exp}: ${r}`);
  } else if (route === 'problem-1-5-2') {
    await page.waitForSelector('#sets-plane-p', { state: 'visible' });
    const ans = async () => { const o = {}; for (const k of ['open', 'closed', 'bounded', 'connected', 'domain', 'region']) o[k] = await attr('#sets-' + k, 'data-answer'); return o; };
    let a = await ans(); log(JSON.stringify(a));
    assert(JSON.stringify(a) === JSON.stringify({ open: 'no', closed: 'no', bounded: 'yes', connected: 'yes', domain: 'no', region: 'yes' }), 'A3a ' + JSON.stringify(a));
    for (const [z, w] of [[{ re: 0, im: 0 }, 'boundary'], [{ re: 0, im: 2 }, 'boundary'], [{ re: 0, im: 1 }, 'interior'], [{ re: 3, im: 3 }, 'exterior']]) {
      await dragHandle(page, 'sets-plane-p', z);
      const r = await readText(page, '#sets-readout'); log(JSON.stringify(z) + ' -> ' + r);
      assert(r.includes(w), `A3 ${JSON.stringify(z)} should be ${w}: ${r}`);
    }
    await page.check('#sets-outer-strict'); await settle(page);
    a = await ans(); log(JSON.stringify(a));
    assert(a.open === 'yes' && a.domain === 'yes', 'A3 outer strict -> open yes, domain yes: ' + JSON.stringify(a));
  }
}
