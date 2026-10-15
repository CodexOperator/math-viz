// tests/interact/i1-core-math.mjs
// Browser parity check for js/core/complex.js and js/core/parse.js (goal i1-core-math).
//
// Run: node tools/smoke.mjs --route home --script tests/interact/i1-core-math.mjs --no-shots
// The harness runs this once per viewport (desktop 1280x860, phone 390x844).
//
// The modules have no screen of their own, so the script never clicks or reads the page. It only
// imports both modules inside the loaded page (real static server, real MIME type, real browser
// module loader) and checks four things:
//   1. both modules load, export every name ARCHITECTURE 3.1 and 3.2 promise, and create no globals;
//   2. at least 50 pinned values (handout answers, strings, parser values) agree in Chromium;
//   3. every TeX string renders in the page's own KaTeX (skipped if the page has no window.katex);
//   4. a live Lab speed budget: 100,000 evaluations of three formulas, each under 400 ms.
//
// Verdict for this goal: per viewport, four log lines starting "i1-core-math" and no problem line
// saying "interaction script failed". Page-level problems about the route itself (a missing home
// station, for example) belong to the shell and station goals, not to this one.

const MODULE_BASE = 'js/core/';

export default async function (page, ctx) {
  const { log, assert, viewport, label } = ctx;
  const view = label || (viewport && viewport.width < 900 ? 'phone' : 'desktop');

  // ---- 1. load and purity -----------------------------------------------------------------
  const load = await page.evaluate(async (base) => {
    const before = new Set(Object.getOwnPropertyNames(window));
    const X = await import(new URL(base + 'complex.js', document.baseURI).href);
    const P = await import(new URL(base + 'parse.js', document.baseURI).href);
    const complexNames = ['C', 'ZERO', 'ONE', 'I', 'fromPolar', 'toPolar', 'add', 'sub', 'mul', 'div', 'neg', 'conj', 'inv', 'scale', 'abs', 'abs2', 'Arg', 'wrapArg', 'argSet', 'expi', 'exp', 'log', 'sqrt', 'sin', 'cos', 'pow', 'powc', 'rootsOf', 'rootsOfUnity', 'principalRoot', 'branchRoot', 'branchArg', 'isPrimitiveRoot', 'quadraticRoots', 'eq', 'isFiniteC', 'numericPartials', 'jacobian', 'localLinear', 'directionalQuotients', 'fmtNum', 'fmtCart', 'fmtPolar', 'fmtAngle', 'texNumber', 'texCart', 'texPolar', 'texAngle', 'exactAngle'];
    const parseNames = ['ParseError', 'parse', 'compile', 'toTex', 'evaluate'];
    const missing = complexNames.filter((n) => !(n in X)).concat(parseNames.filter((n) => !(n in P)));
    window.__i1core = { X, P };
    const created = Object.getOwnPropertyNames(window).filter((n) => !before.has(n) && n !== '__i1core');
    return { missing, created, nComplex: Object.keys(X).length, nParse: Object.keys(P).length };
  }, MODULE_BASE);
  assert(load.missing.length === 0, `missing exports: ${load.missing.join(', ')}`);
  assert(load.nComplex === 49 && load.nParse === 5, `export counts ${load.nComplex} + ${load.nParse}, expected 49 + 5`);
  assert(load.created.length === 0, `the imports created window properties: ${load.created.join(', ')}`);
  log(`i1-core-math: modules load, ${load.nComplex} + ${load.nParse} exports, no globals created`);

  // ---- 2. pinned values in Chromium -------------------------------------------------------
  const pinned = await page.evaluate(() => {
    const { X, P } = window.__i1core;
    const { C, ZERO, ONE, I, fromPolar, toPolar, add, sub, mul, div, conj, abs, abs2, Arg, wrapArg, argSet, pow, rootsOf, rootsOfUnity, principalRoot, branchRoot, branchArg, isPrimitiveRoot, quadraticRoots, localLinear, fmtCart, fmtPolar, fmtAngle, texCart, texPolar, texAngle, texNumber } = X;
    const PI = Math.PI;
    const S2 = Math.SQRT2;
    const S3 = Math.sqrt(3);
    const rows = [];
    const num = (name, got, want, tol = 1e-9) => rows.push([name, Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)), got, want]);
    const cpx = (name, z, w, tol = 1e-9) => rows.push([name, Math.hypot(z.re - w.re, z.im - w.im) <= tol * Math.max(1, Math.hypot(w.re, w.im)), JSON.stringify(z), JSON.stringify(w)]);
    const exact = (name, got, want) => rows.push([name, got === want, got, want]);
    const z1 = C(3, -2);
    const z2 = C(-1, 4);

    // 1.1.1, 1.1.2, 1.2.2
    cpx('1.1.1 product', mul(z1, z2), C(5, 14));
    cpx('1.1.1 quotient', div(z1, z2), C(-11 / 17, -10 / 17));
    num('1.1.1 |product|', abs(mul(z1, z2)), Math.sqrt(221));
    num('1.1.1 Arg of product', Arg(mul(z1, z2)), 1.2277723864, 1e-9);
    num('1.1.1 Arg is the wrapped sum', Arg(mul(z1, z2)), wrapArg(Arg(z1) + Arg(z2)));
    num('1.1.2 Im(conj(z1 - z2))', conj(sub(z1, z2)).im, 6);
    num('1.2.2 distance', abs(sub(C(4, 3), C(-1, 1))), Math.sqrt(29));
    // 1.3.1, Arg and the staircase
    const w = C(-1, S3);
    num('1.3.1 r', toPolar(w).r, 2);
    num('1.3.1 Arg', toPolar(w).theta, 2 * PI / 3);
    cpx('1.3.1 fromPolar', fromPolar(2, 2 * PI / 3), w);
    exact('Arg(-1) is exactly pi', Arg(C(-1, 0)), PI);
    exact('Arg(0) is exactly 0', Arg(C(0, 0)), 0);
    exact('Arg(-1 - 1e-17 i) is pi, never -pi', Arg(C(-1, -1e-17)), PI);
    num('wrapArg(5pi/3)', wrapArg(5 * PI / 3), -PI / 3);
    exact('wrapArg(-pi) is pi', wrapArg(-PI), PI);
    num('argSet middle step', argSet(w, { kMin: -1, kMax: 1 })[1].theta, 2 * PI / 3);
    num('argSet step -1', argSet(w, { kMin: -1, kMax: 1 })[0].theta, 2 * PI / 3 - 2 * PI);
    num('argSet step +1', argSet(w, { kMin: -1, kMax: 1 })[2].theta, 2 * PI / 3 + 2 * PI);
    num('P2 abs2(z1)', abs2(z1), 13);
    num('P2 z conj z', mul(z1, conj(z1)).re, 13);
    cpx('P1 conj z1 conj z2', mul(conj(z1), conj(z2)), C(5, -14));
    cpx('P1 conj(z1 z2)', conj(mul(z1, z2)), C(5, -14));
    // 1.3.2
    cpx('1.3.2 (sqrt3 + i)^10', pow(C(S3, 1), 10), C(512, -512 * S3), 1e-6);
    num('1.3.2 Arg', Arg(pow(C(S3, 1), 10)), -PI / 3);
    // 1.4.1, 1.4.2, 1.4.3
    const roots16 = rootsOf(-16, 4);
    [C(S2, S2), C(-S2, S2), C(-S2, -S2), C(S2, -S2)].forEach((r, k) => cpx(`1.4.2 root k=${k}`, roots16[k], r));
    roots16.forEach((r, k) => cpx(`1.4.2 root k=${k} to the 4th`, pow(r, 4), C(-16, 0)));
    const unity = rootsOfUnity(5);
    cpx('1.4.1 k=1', unity[1], C(Math.cos(2 * PI / 5), Math.sin(2 * PI / 5)));
    unity.forEach((r, k) => cpx(`1.4.1 root k=${k} to the 5th`, pow(r, 5), ONE));
    exact('1.4.1 primitive flags', JSON.stringify([0, 1, 2, 3, 4].map((k) => isPrimitiveRoot(k, 5))), '[false,true,true,true,true]');
    exact('1.4.2 (2,4) is not primitive', isPrimitiveRoot(2, 4), false);
    const q = quadraticRoots(1, -4, 13);
    cpx('1.4.3 root 1', q[0], C(2, 3));
    cpx('1.4.3 root 2', q[1], C(2, -3));
    // 2.2.2, 2.4.1
    cpx('2.2.2 principal root of 2i', principalRoot(C(0, 2), 2), C(1, 1));
    cpx('2.4.1 seam 0 at -1', branchRoot(-1, 3, 0), C(0.5, S3 / 2));
    cpx('2.4.1 seam -pi at -1', branchRoot(-1, 3, -PI), C(0.5, S3 / 2));
    rows.push(['2.4.1 seam 0 is continuous below -1', branchRoot(C(-1, -1e-12), 3, 0).im > 0.8, branchRoot(C(-1, -1e-12), 3, 0).im, '> 0.8']);
    rows.push(['2.4.1 principal branch jumps below -1', branchRoot(C(-1, -1e-12), 3, -PI).im < 0, branchRoot(C(-1, -1e-12), 3, -PI).im, '< 0']);
    exact('2.4.1 branchArg(-1, 0)', branchArg(-1, 0), PI);
    exact('2.4.1 branchArg(1, 0)', branchArg(1, 0), 2 * PI);
    // 3.1.2 and the A/B form
    const abs2f = (z) => ({ re: abs2(z), im: 0 });
    const ll = localLinear(abs2f, C(1, 1));
    cpx('3.1.2 A of |z|^2 at 1+i', ll.A, C(1, -1), 1e-6);
    cpx('3.1.2 B of |z|^2 at 1+i', ll.B, C(1, 1), 1e-6);
    cpx('P6 A of Re z', localLinear((z) => ({ re: z.re, im: 0 }), C(0.3, -0.7)).A, C(0.5, 0), 1e-6);
    cpx('3.1.1 A of z^2 + z at 1+i', localLinear(P.compile('z^2 + z').f, C(1, 1)).A, C(3, 2), 1e-6);
    // strings
    exact('fmtCart(3 - 2i)', fmtCart(C(3, -2)), '3 - 2i');
    exact('fmtAngle(2pi/3)', fmtAngle(2 * PI / 3), '2pi/3');
    exact('fmtPolar(-1 + sqrt3 i)', fmtPolar(w), '2 e^(i 2.094)');
    exact('texCart(sqrt2 + sqrt2 i)', texCart(C(S2, S2)), '\\sqrt{2} + \\sqrt{2}\\,i');
    exact('texPolar(-1 + sqrt3 i)', texPolar(w), '2\\,e^{i\\frac{2\\pi}{3}}');
    exact('texAngle(-pi/3)', texAngle(-PI / 3), '-\\frac{\\pi}{3}');
    exact('texNumber(-512 sqrt3)', texNumber(-512 * S3), '-512\\sqrt{3}');
    exact('texNumber(-11/17)', texNumber(-11 / 17), '-\\frac{11}{17}');
    // parser
    const ev = (src, z) => P.evaluate(src, z);
    cpx('parse z^2 + iz at 1+i', ev('z^2 + iz', C(1, 1)), C(-1, 3));
    cpx('parse (1+i)z at i', ev('(1+i)z', I), C(-1, 1));
    cpx('parse iz - 2i at 2+3i', ev('iz - 2i', C(2, 3)), C(-3, 0));
    cpx('parse sqrt(z) at 2i', ev('sqrt(z)', C(0, 2)), C(1, 1));
    cpx('parse z^(1/3) at -1', ev('z^(1/3)', C(-1, 0)), C(0.5, S3 / 2));
    cpx('parse -z^2 at i', ev('-z^2', I), C(1, 0));
    cpx('parse z(z+1) at 1', ev('z(z+1)', ONE), C(2, 0));
    cpx('parse abs(z)^2 at 3-2i', ev('abs(z)^2', C(3, -2)), C(13, 0));
    cpx('parse 1/z at 2 (bare real)', ev('1/z', 2), C(0.5, 0));
    cpx('parse z at 0', ev('z', ZERO), ZERO);
    exact('toTex z^2 + iz', P.toTex('z^2 + iz'), 'z^{2} + iz');
    // pi next to a letter gets a thin space (\\piz would be one unknown control word)
    exact('toTex pi z', P.toTex('pi z'), '\\pi\\,z');
    exact('toTex piz', P.toTex('piz'), '\\pi\\,z');
    exact('toTex 2 pi i z', P.toTex('2 pi i z'), '2\\pi\\,iz');
    exact('toTex exp(i pi z)', P.toTex('exp(i pi z)'), 'e^{i\\pi\\,z}');
    exact('toTex z pi', P.toTex('z pi'), 'z\\pi');
    // the sign of zero
    rows.push(['div(1, -1).im is +0', Object.is(div(1, -1).im, 0), div(1, -1).im, 0]);
    rows.push(['pow(-i, 2).im is +0', Object.is(pow(C(0, -1), 2).im, 0), pow(C(0, -1), 2).im, 0]);
    rows.push(['Arg of a tiny negative im is +0', Object.is(Arg({ re: 1e300, im: -5e-324 }), 0), Arg({ re: 1e300, im: -5e-324 }), 0]);
    // messages a student reads
    const msg = (src) => { try { P.parse(src); } catch (e) { return `${e.position}/${e.length}/${e.message}`; } return 'no error'; };
    exact('"(z+)" names the missing operand', msg('(z+)'), '3/1/Something is missing between "+" and this ")". Put a number or a variable there.');
    exact('"z)" has no partner', msg('z)'), '1/1/This ")" has no matching "(".');
    exact('"|z|" points to abs(z)', msg('|z|'), '0/1/Bars are not supported. Use abs(z) for the modulus, like abs(z - 1).');
    exact('an emoji is one whole character', msg('z + \u{1F600}'), '4/2/I don\'t understand the character "\u{1F600}". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ).');
    let err = null;
    try { P.parse('z +'); } catch (e) { err = e; }
    rows.push(['parse("z +") throws ParseError at 3', !!err && err instanceof P.ParseError && err instanceof Error && err.position === 3, err && err.position, 3]);
    err = null;
    try { P.parse('foo(z)'); } catch (e) { err = e; }
    rows.push(['parse("foo(z)") throws ParseError at 0', !!err && err instanceof P.ParseError && err.position === 0, err && err.position, 0]);

    return { n: rows.length, failures: rows.filter((r) => !r[1]).map((r) => `${r[0]}: got ${r[2]}, wanted ${r[3]}`) };
  });
  assert(pinned.failures.length === 0, `pinned values disagree in Chromium: ${pinned.failures.join(' | ')}`);
  assert(pinned.n >= 50, `only ${pinned.n} pinned values were checked`);
  log(`i1-core-math: ${pinned.n} pinned values agree in Chromium`);

  // ---- 3. TeX renders in the page's KaTeX --------------------------------------------------
  const tex = await page.evaluate(() => {
    if (!window.katex) return { skipped: true };
    const { X, P } = window.__i1core;
    const { C, ZERO, ONE, I, texCart, texPolar, texAngle, texNumber } = X;
    const PI = Math.PI;
    const S2 = Math.SQRT2;
    const S3 = Math.sqrt(3);
    const points = [C(3, -2), C(-1, 4), C(-1, S3), C(S3, 1), C(0.3, -0.7), C(-2, -0.5), C(0, 2), C(-3, 0), ZERO, ONE, I, C(S2, S2), C(512, -512 * S3), C(-11 / 17, -10 / 17)];
    const strings = [];
    for (const z of points) strings.push(texCart(z), texPolar(z));
    for (const a of [0, PI, -PI, PI / 2, -PI / 3, 2 * PI / 3, 8 * PI / 3, 1.234, 31 * PI / 6]) strings.push(texAngle(a));
    for (const x of [0, 1, -1, 0.5, -11 / 17, S2, -S2 / 2, S3 / 2, 886.81, PI, -PI / 4, 3.14]) strings.push(texNumber(x));
    for (const src of ['z^2', '1/z', 'iz - 2i', '(1+i)z', 'z^2 + iz', 'exp(z)', 'conj(z)', 'Re(z)', 'abs(z)^2', 'z^2/abs(z)^2', 'sqrt(z)', 'z^(1/3)', '(Re(1+z) - 1)/z', '(x^2 - y^2 + 2ixy)/(x^2 + y^2)', 'sin(z)cos(z)']) strings.push(P.toTex(src));
    // pi followed by a letter: the formulas of the Lab that used to give \\piz and fail to render
    for (const src of ['pi z', 'piz', '2 pi i z', 'exp(i pi z)', 'e^(2 pi i z)', 'pi x', 'pi(z+1)', 'pi y', 'z pi', 'pi abs(z)']) strings.push(P.toTex(src));
    // a small deterministic fuzz of parseable formulas, rendered the same way
    let state = 4242;
    const rnd = (n) => { state = (state * 1664525 + 1013904223) >>> 0; return (state >>> 8) % n; };
    const atoms = ['z', 'x', 'y', 'i', 'e', 'pi', 'pi', '2', '3', '0.5'];
    const funcs = ['sin', 'cos', 'exp', 'abs', 'Re', 'Im', 'conj', 'sqrt', 'log', 'arg', 'Arg'];
    const seps = ['+', '-', '*', '/', '^', ' ', '', ' '];
    const gen = (d) => {
      const r = d <= 0 ? rnd(3) : rnd(10);
      if (r < 3) return atoms[rnd(atoms.length)];
      if (r === 3) return '-' + gen(d - 1);
      if (r === 4) return '(' + gen(d - 1) + ')';
      if (r === 5) return funcs[rnd(funcs.length)] + '(' + gen(d - 1) + ')';
      return gen(d - 1) + seps[rnd(seps.length)] + gen(d - 1);
    };
    for (let n = 0; n < 600; n++) {
      try { strings.push(P.toTex(gen(1 + rnd(4)))); } catch (e) { if (!(e instanceof P.ParseError)) throw e; }
    }
    const bad = [];
    for (const s of strings) {
      try { window.katex.renderToString(s, { throwOnError: true, strict: 'error' }); } catch (e) { bad.push(`${s}: ${e.message}`); }
    }
    return { skipped: false, n: strings.length, bad };
  });
  if (tex.skipped) {
    log('i1-core-math: window.katex is absent on this page, so the KaTeX check is skipped (unit test U27 covers it in Node)');
  } else {
    assert(tex.bad.length === 0, `KaTeX rejected: ${tex.bad.join(' | ')}`);
    assert(tex.n >= 50, `only ${tex.n} TeX strings were checked`);
    log(`i1-core-math: ${tex.n} TeX strings render in KaTeX`);
  }

  // ---- 4. speed budget for a live Lab -------------------------------------------------------
  const speed = await page.evaluate(() => {
    const { P } = window.__i1core;
    const out = [];
    for (const src of ['z^2 + iz', '(x^2 - y^2 + 2ixy)/(x^2 + y^2)', 'z^(1/3)']) {
      const f = P.compile(src).f;
      const pts = [];
      for (let j = 0; j < 250; j++) for (let i = 0; i < 400; i++) pts.push({ re: -2 + 4 * i / 399, im: -1.25 + 2.5 * j / 249 });
      let sink = 0;
      for (let k = 0; k < 5000; k++) sink += f(pts[k % pts.length]).re;
      const t0 = performance.now();
      for (let k = 0; k < pts.length; k++) sink += f(pts[k]).re;
      out.push({ src, ms: performance.now() - t0, n: pts.length, sink });
    }
    return out;
  });
  for (const s of speed) assert(s.n === 100000 && s.ms < 400, `100k evaluations of ${s.src} took ${s.ms.toFixed(0)} ms (budget 400 ms)`);
  log(`i1-core-math [${view}]: 100k evaluations in ${speed.map((s) => Math.round(s.ms)).join(' / ')} ms`);
}
