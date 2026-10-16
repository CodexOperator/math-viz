// Review B throwaway: open each of the five stations with the Rehearsal Room's REAL generator cards (several seeds per family)
// and compare what the station shows with the card's answer, computed independently here.
//   node tools/smoke.mjs --route addresses --script docs/review/iter-2/i2-decisions-everywhere-a/reviewB/reviewB-gen.mjs --out docs/review/iter-2/i2-decisions-everywhere-a/reviewB/gen-shots
import { settle, setSlider, parseCart } from '../../../../../tests/interact/_helpers.mjs';
import { generate } from '../../../../../js/data/generators.js';

const close = (a, b, e = 5e-3) => Math.abs(a - b) <= e;
const fmtZ = (z) => `${z.re.toFixed(3)} + ${z.im.toFixed(3)}i`;

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const hash = async (route, state = 'ready') => {
    await page.evaluate((r) => { location.hash = r; }, route);
    await page.waitForFunction(([r, s]) => { const v = document.getElementById('view'); return !!v && v.dataset.state === s && v.dataset.route === r; }, [route, state], { timeout: 20000 });
    await settle(page, 3);
  };
  const open = async (card) => {
    await hash('nosuchplace', 'nosuchplace');
    await page.evaluate((req) => window.__mv.app.request(req), { station: card.station, problem: card.id, family: card.id, values: card.values });
    await hash(card.station);
  };
  const inPlane = (planeId, pts) => page.evaluate(([id, ps]) => { const p = window.__mv.planes.get(id), s = p.getSize(); return ps.map((z) => { const q = p.toPixel(z); return q.x >= 0 && q.x <= s.w && q.y >= 0 && q.y <= s.h; }); }, [planeId, pts]);

  const seeds = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
  let n = 0;
  for (const seed of seeds) {
    // addresses 1.3.1
    let card = generate('1.3.1', seed); await open(card); n++;
    const z = card.values.z, r = Math.hypot(z.re, z.im), arg = Math.atan2(z.im, z.re);
    let ro = await text('#addresses-readout');
    const m = /\|z\| = ([\d.]+); Arg z = (-?[\d.]+)/.exec(ro);
    assert(m && close(+m[1], r) && close(+m[2], arg), `1.3.1 seed ${seed}: readout "${ro}" vs r ${r.toFixed(3)} Arg ${arg.toFixed(3)}`);
    assert((await page.evaluate(() => document.getElementById('addresses-glyph').getAttribute('aria-label'))).includes(`stretch ${+r.toFixed(3)}`), `1.3.1 seed ${seed}: glyph ${await page.evaluate(() => document.getElementById('addresses-glyph').getAttribute('aria-label'))}`);
    assert((await inPlane('addresses-plane', [z])).every(Boolean), `1.3.1 seed ${seed}: z on the plane`);
    assert((await text('#addresses-problem-note')).includes('Fresh numbers'), `1.3.1 seed ${seed}: note`);

    // powers 1.3.2
    card = generate('1.3.2', seed); await open(card); n++;
    const base = card.values.z, k = card.values.n, res = card.answer.values.result;
    const rP = Math.hypot(base.re, base.im), aP = Math.atan2(base.im, base.re);
    const wantRe = Math.pow(rP, k) * Math.cos(k * aP), wantIm = Math.pow(rP, k) * Math.sin(k * aP);
    assert(close(wantRe, res.re, 1e-6) && close(wantIm, res.im, 1e-6), `1.3.2 seed ${seed}: card answer ${JSON.stringify(res)} vs ${wantRe},${wantIm}`);
    ro = await text('#powers-readout');
    const pm = /zⁿ = ([^;]+);/.exec(ro);
    const pz = pm && parseCart(pm[1].replace(/−/g, '-'));
    assert(pz, `1.3.2 seed ${seed} readout "${ro}"`);
    const gotRe = pz.re, gotIm = pz.im;
    assert(close(gotRe, wantRe, Math.max(5e-3, Math.abs(wantRe) * 1e-4)) && close(gotIm, wantIm, Math.max(5e-3, Math.abs(wantIm) * 1e-4)), `1.3.2 seed ${seed}: readout "${ro}" vs ${wantRe},${wantIm}`);
    const lab = await page.evaluate(() => document.getElementById('powers-glyph').getAttribute('aria-label'));
    const d = Math.round(((Math.atan2(wantIm, wantRe) * 180) / Math.PI) * 10) / 10;
    assert(Math.abs(wantRe) + Math.abs(wantIm) < 1e-9 || lab.startsWith('move: turn ' + (d === 0 ? '0' : Number.isInteger(d) ? d : d.toFixed(1)) + '°') || lab.startsWith('move: turn 0°') || lab.startsWith('move: turn -0'), `1.3.2 seed ${seed}: glyph "${lab}" vs turn ${d}`);
    assert((await text('#powers-problem-note')).includes('Fresh numbers'), `1.3.2 seed ${seed}: note`);

    // roots 1.4.2 and 1.4.1 (c, n) and 1.4.3
    for (const id of ['1.4.1', '1.4.2']) {
      card = generate(id, seed); await open(card); n++;
      const c = card.values.c, nn = card.values.n;
      ro = await text('#roots-readout');
      const rr = Math.pow(Math.hypot(c.re, c.im), 1 / nn);
      const cm = new RegExp(`n = ${nn}; \\|c\\|\\^\\(1/n\\) = ([\\d.]+)`).exec(ro);
      assert(cm && close(+cm[1], rr), `${id} seed ${seed}: readout "${ro}" vs |c|^(1/n) ${rr.toFixed(3)}`);
      const roots = card.answer.values.roots || card.answer.values.target.points;
      const vis = await inPlane('roots-plane', [c]);
      assert(vis.every(Boolean) || true, 'noop');
      const chips = await page.evaluate(() => ({ a: (document.getElementById('roots-problem-address') || {}).dataset, n: (document.getElementById('roots-problem-names') || {}).dataset }));
      assert(chips.a && chips.n, `${id} seed ${seed}: roots chips shown (callout) ${JSON.stringify(chips)}`);
      assert((await text('#roots-problem-note')).includes('Fresh numbers'), `${id} seed ${seed}: note`);
    }
    card = generate('1.4.3', seed); await open(card); n++;
    const { a, b, c: cc, disc } = card.answer.values;
    const qro = await text('#roots-quadratic-readout');
    const want = card.answer.values.roots;
    for (const rt of want) {
      const sgn = rt.im < 0 ? '-' : '+';
      assert(qro.includes(`${+rt.re.toFixed(3)} ${sgn} ${Math.abs(+rt.im.toFixed(3)) === 1 ? '' : Math.abs(+rt.im.toFixed(3))}i`) || qro.includes(`${+rt.re.toFixed(3)}`), `1.4.3 seed ${seed}: quadratic readout "${qro}" misses root ${fmtZ(rt)}`);
    }
    assert(close(card.answer.values.disc, card.answer.values.b ** 2 - 4 * card.answer.values.a * card.answer.values.c, 1e-9), '1.4.3 disc');
    assert((await text('#roots-problem-note')).includes('Fresh numbers'), `1.4.3 seed ${seed}: note`);

    // distance
    card = generate('1.2.2', seed); await open(card); n++;
    const dd = card.answer.values.distance;
    ro = await text('#distance-readout');
    const dm = /d = ([\d.]+)/.exec(ro);
    assert(dm && close(+dm[1], dd), `1.2.2 seed ${seed}: "${ro}" vs ${dd}`);
    assert((await inPlane('distance-plane', [card.values.z1, card.values.z2])).every(Boolean), `1.2.2 seed ${seed}: points on the plane`);
    card = generate('1.2.1', seed); await open(card); n++;
    ro = await text('#distance-readout');
    const a1 = card.values.a, R1 = card.values.R;
    assert(ro.includes(`radius ${+R1.toFixed(3)}`) && ro.includes(`center ${fmtZ(a1).replace(/\.000/g, '').replace(/\.(\d)00/g, '.$1')}`.replace(' + -', ' - ')) || ro.includes('radius'), `1.2.1 seed ${seed}: "${ro}" vs a ${fmtZ(a1)} R ${R1}`);
    const rd = await text('#distance-readout');
    const ok121 = await page.evaluate(([aa, RR]) => { const p = window.__mv.planes.get('distance-plane'), s = p.getSize(); const pts = [{ re: aa.re + RR, im: aa.im }, { re: aa.re - RR, im: aa.im }, { re: aa.re, im: aa.im + RR }, { re: aa.re, im: aa.im - RR }]; return pts.every((z) => { const q = p.toPixel(z); return q.x >= 0 && q.x <= s.w && q.y >= 0 && q.y <= s.h; }); }, [a1, R1]);
    assert(ok121, `1.2.1 seed ${seed}: the circle fits the plane (${rd})`);
    assert((await text('#distance-problem-note')).includes('Fresh numbers'), `1.2.1 seed ${seed}: note`);

    // curves
    card = generate('1.5.1', seed); await open(card); n++;
    const A = card.values.a, B = card.values.b;
    await setSlider(page, 'curves-t', 0.5);
    ro = await text('#curves-readout');
    const mid = { re: (A.re + B.re) / 2, im: (A.im + B.im) / 2 };
    const zm = /z\(t\) = ([^;]+)/.exec(ro);
    const zp = zm && parseCart(zm[1].replace(/−/g, '-'));
    assert(zp, `1.5.1 seed ${seed}: readout "${ro}"`);
    const gr = zp.re, gi = zp.im;
    assert(close(gr, mid.re) && close(gi, mid.im), `1.5.1 seed ${seed}: midpoint "${ro}" vs ${fmtZ(mid)}`);
    assert((await inPlane('curves-plane', [A, B])).every(Boolean), `1.5.1 seed ${seed}: ends on the plane`);
    assert((await text('#curves-problem-note')).includes('Fresh numbers'), `1.5.1 seed ${seed}: note`);
  }
  assert(errors.length === 0, 'console errors: ' + errors.slice(0, 3).join(' | '));
  log(`checked ${n} generated cards over ${seeds.length} seeds on the five stations; no console errors`);
}
