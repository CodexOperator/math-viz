// Interaction script for goal i2-generators (the module has no page of its own, so this script loads it in the browser the way a station does).
// Run:  node tools/smoke.mjs --route home --script tests/interact/i2-generators.mjs
// It covers A1 (spot values), A2 (replay and speed in a real browser), A3 (check on a pinned card), A4 (source inspection by fetch).
// The smoke runner itself fails the route on any console error, page error, failed request or horizontal overflow.

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

export default async function (page, ctx) {
  const r = await page.evaluate(async () => {
    const m = await import('./js/data/generators.js');
    const C = (re, im = 0) => ({ re, im });
    const out = { exports: Object.keys(m).sort(), families: m.FAMILIES.length, frozen: Object.isFrozen(m.FAMILIES) };

    // the pinned card of the Rehearsal Room: 1.4.2 seed 7 is the fourth roots of -81
    const card = m.generate('1.4.2', 7);
    out.same = JSON.stringify(card) === JSON.stringify(m.generate('1.4.2', 7));
    out.given = card.given;
    out.sketch = { kind: card.sketch.kind, n: card.sketch.n };
    out.statementText = card.statementText;
    out.answerText = card.answer.text;
    out.values = card.values;
    out.checkOk = m.check(card, card.answer.values.roots).ok;
    const th = (10 * Math.PI) / 180;
    out.checkRotated = m.check(card, card.answer.values.roots.map((z) => C(z.re * Math.cos(th) - z.im * Math.sin(th), z.re * Math.sin(th) + z.im * Math.cos(th)))).ok;

    // A1 spot values, solved in the browser
    const v = (id, g) => m.solve(id, g).answer.values;
    out.a1 = {
      product: v('1.1.1', { z1: C(2, 1), z2: C(1, -3) }).product,
      distance: v('1.2.2', { z1: C(1, 5), z2: C(-2, 1) }).distance,
      power: v('1.3.2', { z: C(Math.sqrt(2), Math.sqrt(2)), n: 4 }).result,
      primitive: v('1.4.1', { n: 6 }).primitive,
      roots43: v('1.4.3', { p: 3, q: 2 }).roots,
      parabola: v('2.1.2', { axis: 'x', c: 3 }).parabola,
      line251: v('2.5.1', { circle: { a: C(0, 1) } }).imageLine,
      fprime: v('3.1.1', { a: 2, b: -3, c: 1 }).fprimeTex,
    };

    // the sentences of the review (round 1): what a student reads, not only the numbers
    out.text = {
      p4: m.generate('P4', 6).answer.text,
      p5: m.generate('P5', 8).answer.text,
      turn: m.generate('2.1.3', 10).answer.text,
      axis: m.solve('1.3.1', { z: C(-1, 0) }).worked.polar,
      quotient: m.generate('1.1.1', 3).answer.text,
      signs: m.solve('2.1.2', { axis: 'x', c: -3 }).worked.cart,
      circle: m.solve('2.5.1', { line: { c: -1 } }).answer.text,
    };
    const BAD = [/\+ [-\u2212]/, /[-\u2212] [-\u2212]/, /\/[-\u2212]/, /(^|[^\w.])[-\u2212]0(?![.\d])/, /(^|[^\d.\w\\])1i\b/];
    out.signHits = [];
    for (const id of m.FAMILIES) for (let s = 1; s <= 60; s++) {
      const c = m.generate(id, s);
      for (const t of [c.statementText, c.answer.text, c.answer.tex, c.worked.cart, c.worked.polar]) if (BAD.some((re) => re.test(t))) out.signHits.push(id + '#' + s);
    }

    // every family, seeds 1..20: no exception, every card survives JSON, and it is fast
    const t0 = performance.now(); let n = 0; const bad = [];
    for (const id of m.FAMILIES) for (let s = 1; s <= 20; s++) {
      const c = m.generate(id, s); n++;
      if (JSON.stringify(JSON.parse(JSON.stringify(c))) !== JSON.stringify(c) || c.id !== id || c.seed !== s) bad.push(id + '#' + s);
    }
    out.cards = n; out.ms = performance.now() - t0; out.bad = bad;
    out.unknown = m.generate('nope', 1);
    out.info = m.familyInfo('2.5.1');

    // A4: read the module's own text
    const src = await (await fetch('./js/data/generators.js')).text();
    out.imports = (src.match(/^import\s/gm) || []).length;
    out.fromComplex = /^import \{[^}]*\} from '\.\.\/core\/complex\.js';$/m.test(src);
    out.forbidden = [/Math\.random/, /\bDate\b/, /\bdocument\b/, /\bglobalThis\b/, /\blocalStorage\b/, /\bsetTimeout\b/, /\bperformance\b/, /\bwindow\s*[.\[(=)]/].filter((re) => re.test(src)).map(String);
    return out;
  });

  ctx.assert(JSON.stringify(r.exports) === JSON.stringify(['FAMILIES', 'check', 'draw', 'familyInfo', 'generate', 'rng', 'solve', 'statementFor']), 'the module exports exactly the eight names of ARCHITECTURE 11.6: ' + r.exports);
  ctx.assert(r.families === 29 && r.frozen, 'FAMILIES is a frozen list of 29 ids');
  ctx.assert(r.same, 'generate("1.4.2", 7) is the same card twice');
  ctx.assert(r.given.n === 4 && r.given.c.re === -81 && r.given.c.im === 0, '1.4.2 seed 7 is the fourth roots of -81: ' + JSON.stringify(r.given));
  ctx.assert(r.sketch.kind === 'roots' && r.sketch.n === 4, 'the pinned card asks for four roots');
  ctx.assert(r.statementText === 'Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms.', 'statement text: ' + r.statementText);
  ctx.assert(r.answerText.startsWith('3 e^(i pi/4), 3 e^(i 3pi/4), 3 e^(i 5pi/4), 3 e^(i 7pi/4) = '), 'answer text: ' + r.answerText);
  ctx.assert(r.values.n === 4 && r.values.c.re === -81, 'the values preset is { c, n }');
  ctx.assert(r.checkOk === true, 'the exact roots pass check()');
  ctx.assert(r.checkRotated === false, 'roots rotated by 10 degrees fail check()');
  ctx.assert(near(r.a1.product.re, 5) && near(r.a1.product.im, -5), '1.1.1 product 5 - 5i');
  ctx.assert(r.a1.distance === 5, '1.2.2 distance 5');
  ctx.assert(near(r.a1.power.re, -16, 1e-9) && near(r.a1.power.im, 0, 1e-9), '1.3.2 (sqrt2 + sqrt2 i)^4 = -16');
  ctx.assert(JSON.stringify(r.a1.primitive) === JSON.stringify([false, true, false, false, false, true]), '1.4.1 primitive flags for n = 6');
  ctx.assert(JSON.stringify(r.a1.roots43) === JSON.stringify([{ re: 3, im: 2 }, { re: 3, im: -2 }]), '1.4.3 roots 3 +- 2i');
  ctx.assert(r.a1.parabola.vertex === 9 && r.a1.parabola.coeff === -1 / 36 && r.a1.parabola.focus === 0, '2.1.2 x = 3 gives u = 9 - v^2/36');
  ctx.assert(r.a1.line251 === 'Im w = -1/2', '2.5.1 |z - i| = 1 gives Im w = -1/2');
  ctx.assert(r.a1.fprime === '4z - 3', "3.1.1 f'(z) = 4z - 3");
  ctx.assert(/w = 4 e\^\(i\(t \+ pi\)\) covers the whole circle \|w\| = 4$/.test(r.text.p4), 'P4 seed 6 prints the image radius 4 in w: ' + r.text.p4);
  ctx.assert(r.text.p5.includes('but 0 along the imaginary axis'), 'P5 seed 8 (y = x^3) quotes the imaginary axis: ' + r.text.p5);
  ctx.assert(r.text.turn.includes('turn by Arg a = -pi/2 (clockwise)'), '2.1.3 seed 10 turns clockwise: ' + r.text.turn);
  ctx.assert(r.text.axis.includes('on the negative real axis') && !r.text.axis.includes('quadrant'), '1.3.1 z = -1 is on the negative real axis: ' + r.text.axis);
  ctx.assert(r.text.quotient === 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i', '1.1.1 seed 3 prints the exact quotient: ' + r.text.quotient);
  ctx.assert(r.text.signs.includes('(9 \u2212 y\u00b2) \u2212 6iy') && r.text.signs.includes('y = \u2212v/6'), '2.1.2 x = -3 folds its signs: ' + r.text.signs);
  ctx.assert(r.text.circle === 'the circle |w + 1/2| = 1/2 (through 0)', '2.5.1 x = -1 prints w + 1/2: ' + r.text.circle);
  ctx.assert(r.signHits.length === 0, 'no sign-unaware template in 29 families x 60 seeds: ' + r.signHits.slice(0, 8).join(', '));
  ctx.assert(r.cards === 580 && r.bad.length === 0, 'all 29 families give 20 clean cards: ' + r.bad.join(', '));
  ctx.assert(r.ms < 600, `580 cards in ${r.ms.toFixed(0)} ms (limit 600)`);
  ctx.assert(r.unknown === null && r.info && r.info.hasLab === true && r.info.sketch === 'line', 'unknown id gives null; familyInfo("2.5.1") reports its lab and sketch');
  ctx.assert(r.imports === 1 && r.fromComplex, 'exactly one import, from ../core/complex.js');
  ctx.assert(r.forbidden.length === 0, 'no clock, no randomness, no browser object in the module: ' + r.forbidden);
  ctx.log(`i2-generators: ${r.cards} cards in ${r.ms.toFixed(0)} ms at ${ctx.viewport && ctx.viewport.width ? ctx.viewport.width : '?'} px`);
}
