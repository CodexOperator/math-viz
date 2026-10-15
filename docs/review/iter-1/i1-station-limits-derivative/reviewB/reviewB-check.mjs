// Review B independent check for goal i1-station-limits-derivative.
// Expected values are recomputed here from first principles (no repo imports except the interaction helpers).
//   node tools/smoke.mjs --route problem-2-3-1 --script docs/review/iter-1/i1-station-limits-derivative/reviewB/reviewB-check.mjs --dark --no-shots
import { clickChip, dragHandle, readText, setSlider, parseCart, settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';

const C = {
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  conj: (a) => ({ re: a.re, im: -a.im }),
  inv: (a) => { const d = a.re * a.re + a.im * a.im; return { re: a.re / d, im: -a.im / d }; },
  exp: (a) => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) }),
  abs: (a) => Math.hypot(a.re, a.im),
};
const z = (re, im = 0) => ({ re, im });

// A, B for each catalogue function, derived by hand (A = (f_x - i f_y)/2, B = (f_x + i f_y)/2)
const AB = {
  'sq-plus-z': (p) => ({ A: C.add(C.mul(z(2), p), z(1)), B: z(0) }),
  abs2: (p) => ({ A: C.conj(p), B: p }),
  conj: () => ({ A: z(0), B: z(1) }),
  re: () => ({ A: z(0.5), B: z(0.5) }),
  cube: (p) => ({ A: C.mul(z(3), C.mul(p, p)), B: z(0) }),
  exp: (p) => ({ A: C.exp(p), B: z(0) }),
  recip: (p) => ({ A: C.mul(z(-1), C.inv(C.mul(p, p))), B: z(0) }),
};
const near = (a, b, tol = 2e-3) => Math.hypot(a.re - b.re, a.im - b.im) < tol;
const fmt = (c) => `${c.re.toFixed(3)}${c.im < 0 ? '-' : '+'}${Math.abs(c.im).toFixed(3)}i`;

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const body = () => page.evaluate(() => document.body.innerText);
  const badNums = async (w) => assert(!/NaN|Infinity|undefined\b(?!\s*(at|\())/.test(await body()) || !/NaN|Infinity/.test(await body()), `${w}: NaN/Infinity in page`);

  if (ctx.route === 'problem-2-3-1' || ctx.route === 'limits') {
    const ro = () => readText(page, '#limits-readout');
    // ---- A2 literal
    let r = await ro();
    assert(/y = x\^2|y = x²/.test(r), 'A2 y = x^2: ' + r);
    assert(r.includes('limit along this path: 1'), 'A2 limit 1');
    assert(r.includes('circle center 0 radius 1'), 'A2 circle');
    assert(r.includes('limit exists: no'), 'A2 exists no');
    await clickChip(page, 'limits-path-line');
    await setSlider(page, 'limits-m', 1);
    assert((await ro()).includes('limit along this path: i'), 'A2 m=1 i: ' + (await ro()));
    await setSlider(page, 'limits-m', 0);
    assert((await ro()).includes('limit along this path: 1'), 'A2 m=0 -> 1');
    await setSlider(page, 'limits-m', 0);
    await setSlider(page, 'limits-t', 0.01);
    r = await ro();
    let v = parseCart(/value at t: ([^;]+)/.exec(r)[1]);
    let L = parseCart(/limit along this path: ([^;]+)/.exec(r)[1]);
    assert(near(v, L, 0.05), 'A2 value near limit: ' + r);

    // ---- independent numbers: dir on lines for many slopes
    for (const m of [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3]) {
      await clickChip(page, 'limits-path-line');
      await setSlider(page, 'limits-m', m);
      await setSlider(page, 'limits-t', 0.3);
      r = await ro();
      const got = parseCart(/limit along this path: ([^;]+)/.exec(r)[1]);
      const th = Math.atan(m);
      const exp = z(Math.cos(2 * th), Math.sin(2 * th));
      assert(near(got, exp), `dir line m=${m}: expected ${fmt(exp)}, readout "${r}"`);
      // value at t on the line is the same number (g is constant on rays)
      const val = parseCart(/value at t: ([^;]+)/.exec(r)[1]);
      assert(near(val, exp), `dir value at t on m=${m}: ${fmt(val)} vs ${fmt(exp)}`);
    }
    // parabola values at several t: find x from the readout z? use explainer: just check value is on unit circle and tends to 1
    await clickChip(page, 'limits-path-parabola');
    for (const t of [1, 0.45, 0.1, 0.01]) {
      await setSlider(page, 'limits-t', t);
      r = await ro();
      const val = parseCart(/value at t: ([^;]+)/.exec(r)[1]);
      assert(Math.abs(C.abs(val) - 1) < 2e-3, `dir on parabola |g| = 1 at t=${t}: ${fmt(val)}`);
      // independent: g = (1 - x^2 + 2ix)/(1 + x^2) with x derived from arg: tan(arg g / 2) = x
      const x = Math.tan(Math.atan2(val.im, val.re) / 2);
      const gexp = z((1 - x * x) / (1 + x * x), 2 * x / (1 + x * x));
      assert(near(val, gexp), `parabola identity at t=${t}`);
      if (t === 0.45) assert(near(val, z(0.548, 0.836), 2e-3), 'default value 0.548+0.836i: ' + fmt(val));
      if (t === 0.01) assert(near(val, z(1, 0), 0.05), 'tends to 1');
    }
    await clickChip(page, 'limits-path-vertical');
    assert((await ro()).includes('limit along this path: -1'), 'dir vertical -1: ' + (await ro()));

    // ---- P5 (x-over-z)
    await page.evaluate(() => { location.hash = '#problem-P5'; });
    await page.waitForTimeout(600);
    r = await ro();
    assert(r.includes('circle center 0.5 radius 0.5'), 'P5 circle: ' + r);
    assert(r.includes('limit along this path: 1'), 'P5 line m=0 -> 1');
    for (const m of [-3, -1, 0, 1, 2, 3]) {
      await clickChip(page, 'limits-path-line');
      await setSlider(page, 'limits-m', m);
      r = await ro();
      const got = parseCart(/limit along this path: ([^;]+)/.exec(r)[1]);
      const exp = C.inv(z(1, m));   // 1/(1 + im)
      assert(near(got, exp), `x/z line m=${m}: expected ${fmt(exp)}, readout "${r}"`);
    }
    await clickChip(page, 'limits-path-vertical');
    r = await ro();
    assert(r.includes('limit along this path: 0'), 'P5 vertical 0: ' + r);
    assert(r.includes('limit exists: no'), 'P5 exists no');
    await clickChip(page, 'limits-path-parabola');
    assert((await ro()).includes('limit along this path: 1'), 'P5 parabola -> 1');

    // ---- eps-delta
    const d = async (e) => Number(/largest delta = ([0-9.]+)/.exec(await (async () => { await setSlider(page, 'limits-eps', e); return readText(page, '#limits-epsdelta'); })())[1]);
    for (const e of [0.05, 0.1, 0.25, 0.5, 1, 1.5]) {
      const got = await d(e);
      const exp = Math.sqrt(1 + e) - 1;
      assert(Math.abs(got - exp) < 6e-4, `eps=${e}: delta ${got} vs sqrt(1+e)-1 = ${exp.toFixed(6)}`);
    }
    const d1 = await d(0.5), d2 = await d(0.1);
    assert(d2 > 0 && d2 < d1, `A2 delta shrinks ${d1} -> ${d2}`);

    // ---- story-thread text on the limits page
    const t = await body();
    assert(/arg g/.test(t) && /Arg g/.test(t), 'limits page distinguishes arg g and Arg g');
    assert(/Cartesian/.test(t) && /Polar/.test(t), 'limits page shows both addresses');
    assert(!/NaN|Infinity/.test(t), 'no NaN/Infinity on limits');
    // cross links
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')));
    assert(hrefs.includes('#derivative'), 'limits links to derivative: ' + hrefs.join(' '));
    assert(hrefs.every((h) => /^#[A-Za-z0-9._~-]+$/.test(h)), 'all hrefs are bare-token routes: ' + hrefs.join(' '));
    // overflow
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(ov <= 0, 'no horizontal overflow: ' + ov);
    // no literal colour styles inline
    const inl = await page.evaluate(() => [...document.querySelectorAll('#view [style]')].map((e) => e.getAttribute('style')).filter((s) => /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i.test(s)));
    assert(inl.length === 0, 'inline literal colours: ' + inl.join(' | '));
    log('limits independent checks ok');
    return;
  }

  // ---- derivative routes
  const ro = () => readText(page, '#derivative-readout');
  const drag = (p) => dragHandle(page, 'derivative-zplane-z0', p);
  const fns = ['sq-plus-z', 'abs2', 'conj', 're', 'cube', 'exp', 'recip'];
  const pts = [z(1, 1), z(0.5, -1), z(-0.5, 0.5), z(0.3, 0), z(0, 0), z(1, -0.5)];
  let checked = 0;
  for (const fn of fns) {
    await clickChip(page, `derivative-fn-${fn}`);
    for (const p of pts) {
      await drag(p);
      const r = await ro();
      const polePt = fn === 'recip' && p.re === 0 && p.im === 0;
      if (polePt) {
        assert(/undefined/.test(r) && !/NaN|Infinity/.test(r), `recip at 0: ${r}`);
        continue;
      }
      const { A, B } = AB[fn](p);
      const mA = /A = ([^;]+);/.exec(r);
      const mB = /\|B\| = ([0-9.]+)/.exec(r);
      assert(mA && mB, `readout parse for ${fn} at ${fmt(p)}: ${r}`);
      const gotA = parseCart(mA[1]);
      assert(near(gotA, A, 2e-3), `${fn} at ${fmt(p)}: A expected ${fmt(A)}, readout "${r}"`);
      assert(Math.abs(Number(mB[1]) - C.abs(B)) < 1.5e-3, `${fn} at ${fmt(p)}: |B| expected ${C.abs(B).toFixed(3)}, readout "${r}"`);
      const exists = C.abs(B) < 1e-3;
      assert(/does not exist/.test(r) === !exists, `${fn} at ${fmt(p)}: existence flag wrong: ${r}`);
      if (exists) {
        const mf = /f'\(z0\) = ([^;]+)$/.exec(r);
        assert(mf && near(parseCart(mf[1]), A, 2e-3), `${fn} at ${fmt(p)}: f' expected ${fmt(A)}, readout "${r}"`);
      } else {
        const mr = /circle radius ([0-9.]+)/.exec(r);
        assert(mr && Math.abs(Number(mr[1]) - C.abs(B)) < 1.5e-3, `${fn} at ${fmt(p)}: circle radius text: ${r}`);
      }
      // the hook's ring fit must equal A when differentiable and the state kind must match the math
      const s = await page.evaluate(() => window.__mv.derivative.state());
      const absA = C.abs(A), absB = C.abs(B);
      const kind = absB < 1e-3 ? (absA < 1e-3 ? 'point' : 'ring') : absA < 1e-3 ? 'mirrored' : Math.abs(absA - absB) < 1e-3 ? 'flat' : 'ellipse';
      assert(s.kind === kind || (kind === 'ring' && s.kind === 'ring'), `${fn} at ${fmt(p)}: image kind expected ${kind}, state ${s.kind}`);
      if (exists && absA > 1e-3) assert(near(s.fit, A, 1e-3), `${fn} at ${fmt(p)}: ring fit ${fmt(s.fit)} vs A ${fmt(A)}`);
      checked++;
    }
    assert(!/NaN|Infinity/.test(await body()), `no NaN/Infinity after ${fn}`);
  }
  log(`derivative: ${checked} (function, z0) combinations match the independent A, B`);

  // ---- the numbers for the three review problems, in both addresses, from the explainer's TeX
  await clickChip(page, 'derivative-fn-sq-plus-z');
  await drag(z(1, 1));
  await setSlider(page, 'derivative-phi', 0);
  await settle(page, 4);
  await page.waitForTimeout(400);
  const texs = await page.evaluate(() => [...document.querySelectorAll('#view [data-tex]')].map((e) => e.id + ' => ' + e.dataset.tex));
  log('3.1.1 explainer cells: ' + texs.join(' || '));
  const joined = texs.join(' ');
  assert(joined.includes('3.2 + 2i'), '3.1.1 quotient at rho=.2: 3.2+2i');
  assert(/3\.606/.test(joined) && /0\.588/.test(joined), '3.1.1 polar: 3.606 e^{i 0.588}');
  assert(/3\.774/.test(joined) && /0\.559/.test(joined), '3.1.1 polar quotient 3.774 e^{i 0.559} (|3.2+2i| = 3.7736, atan2(2,3.2) = 0.5586)');

  // story text on derivative
  const t = await body();
  assert(/Cartesian/.test(t) && /Polar/.test(t), 'derivative shows both addresses');
  assert(/Arg h/.test(t) && /360|2π|k/.test(t), 'derivative says Arg h is the home name of the direction');
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')));
  assert(hrefs.includes('#limits'), 'derivative links to limits: ' + hrefs.join(' '));
  assert(hrefs.every((h) => /^#[A-Za-z0-9._~-]+$/.test(h)), 'all hrefs bare-token: ' + hrefs.join(' '));
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(ov <= 0, 'no horizontal overflow: ' + ov);
  const inl = await page.evaluate(() => [...document.querySelectorAll('#view [style]')].map((e) => e.getAttribute('style')).filter((s) => /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i.test(s)));
  assert(inl.length === 0, 'inline literal colours: ' + inl.join(' | '));
  log('derivative independent checks ok');
}
