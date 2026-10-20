// The Test 2 stops that are not the two pictures and not the index.
// Each one is a short page: the idea, a source tag, one control, and the exercises that live here.
// The Julia film and the Newton picture are separate stations. This file does not draw either.

import { juliaWalk, newtonWalk } from '../core/fractal.js';
import { fmtCart, fmtNum } from '../core/complex.js';
import { test2ProblemsAt } from '../data/test2-problems.js';
import { sectionHref } from '../data/book.js';
import { threadLabel } from '../registry.js';
import { h, richP, sourceTag, scopeBanner, walkList, placeLinks, chipButton, appendRich, storyLinks } from './test2-ui.js';

const I = { re: 0, im: 1 };
const MI = { re: 0, im: -1 };
const ONE = { re: 1, im: 0 };
const MONE = { re: -1, im: 0 };

function mul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function powN(z, n) {
  let r = { re: 1, im: 0 };
  for (let k = 0; k < n; k++) r = mul(r, z);
  return r;
}
function orbit(z, steps) {
  const pts = [];
  let p = { re: z.re, im: z.im };
  for (let k = 1; k <= steps; k++) {
    pts.push(p);
    p = mul(p, z);
  }
  return pts;
}

function show(host, lines) {
  host.replaceChildren(walkList(lines));
}

function problemRow(stationId, preset) {
  const probs = test2ProblemsAt(stationId);
  if (!probs.length) return null;
  const opened = preset && preset.kind === 'problem' ? preset.id : null;
  const box = h('div', { class: 'chips', id: `${stationId}-problems` });
  for (const p of probs) {
    const chip = h('a', {
      class: 'chip', id: `${stationId}-ex-${p.id.replace(/\./g, '-')}`,
      href: `#index-${p.id.replace(/\./g, '-')}`,
    }, p.pin);
    if (p.id === opened) chip.setAttribute('aria-current', 'true');
    box.append(chip);
  }
  const note = opened && probs.some((p) => p.id === opened)
    ? 'This stop is where that exercise is worked. The statement, what the book prints, and the check added for this site are on the index card.'
    : 'Quoted in the problem index, with the book’s solution and any added check kept apart.';
  return h('section', { class: 'panel', 'aria-label': 'Exercises at this stop' },
    h('h2', null, 'Exercises'),
    h('p', { class: 'muted', id: `${stationId}-exercises-note` }, note),
    box);
}

function threadBadges(ctx) {
  const ids = (ctx.station && ctx.station.threads) || [];
  const known = ctx.threads || [];
  const ul = h('ul', { class: 'thread-badges', 'aria-label': 'Story threads that pass through this place' });
  for (const id of ids) {
    const t = known.find((x) => x.id === id);
    if (!t) continue;
    ul.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': id, title: t.summary }, threadLabel(t))));
  }
  return ul.childElementCount ? ul : null;
}

function shell(el, ctx, spec) {
  const id = ctx.station.id;
  const bits = [h('h1', null, ctx.station.title)];
  const banner = scopeBanner(ctx.station.scope);
  if (banner) bits.push(banner);
  bits.push(richP(spec.lede, { class: 'station-lede', id: `${id}-lede` }));
  const badges = threadBadges(ctx);
  if (badges) bits.push(badges);
  for (const cite of spec.cites) bits.push(sourceTag(cite));
  el.append(h('header', { class: 'station-header' }, ...bits));
  el.append(spec.panel);
  const cross = storyLinks(`${id}-story`, spec.cross || []);
  if (cross) el.append(cross);
  const row = problemRow(id, ctx.preset);
  if (row) el.append(row);
  el.append(placeLinks(id));
  if (ctx.preset && ctx.preset.kind === 'problem') {
    const chip = document.getElementById(`${id}-ex-${String(ctx.preset.id).replace(/\./g, '-')}`);
    if (chip) chip.scrollIntoView({ block: 'center' });
  }
}

function sequencePanel() {
  const host = h('div', { id: 'sequence-walk' });
  const note = h('p', { id: 'sequence-note' });
  const modes = [
    { id: 'sequence-settle', label: '(1/2 + i/4)^n', z: { re: 0.5, im: 0.25 }, kind: 'settle' },
    { id: 'sequence-cycle', label: '((1+i)/√2)^n', z: { re: Math.SQRT1_2, im: Math.SQRT1_2 }, kind: 'cycle' },
  ];
  let current = modes[0];
  const buttons = [];
  function draw() {
    const pts = orbit(current.z, 8);
    show(host, pts.map((p, i) => `n = ${i + 1}: ${fmtCart(p, 4)}, modulus ${fmtNum(Math.hypot(p.re, p.im), 4)}`));
    note.textContent = current.kind === 'settle'
      ? 'Settles at 0. The modulus is (√5 / 4)^n, which goes to 0. Exercise 1(a) asks for this limit. What the book prints is closed on the index.'
      : 'Stays. The modulus is 1, and the point visits the eighth roots of unity. It does not settle. Exercise 7 asks whether the limit exists. What the book prints is closed on the index.';
  }
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Which sequence' });
  modes.forEach((m, i) => {
    const b = chipButton(m.id, m.label, i === 0, () => {
      current = m;
      buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(j === i)));
      draw();
    });
    buttons.push(b);
    chips.append(b);
  });
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'sequence-title' },
    h('h2', { id: 'sequence-title' }, 'Two sequences from section 4.1'),
    h('p', null, 'A limit means the terms eventually sit in every disk you draw around one point. Bounded is weaker: convergent sequences are bounded, and section 4.2 uses that word for orbits.'),
    chips, host, note);
}

function seriesPanel() {
  const host = h('div', { id: 'series-walk' });
  const lines = [];
  for (let n = 1; n <= 6; n++) {
    const term = { re: 0, im: 1 / n };
    lines.push(`n = ${n}: i/${n} = ${fmtCart(term, 4)}, and its modulus is ${fmtNum(1 / n, 4)}`);
  }
  show(host, lines);
  return h('section', { class: 'panel', 'aria-labelledby': 'series-title' },
    h('h2', { id: 'series-title' }, 'The term and its length'),
    h('p', null, 'Exercise 17: z_n goes to 0 exactly when |z_n| does. The two ε-conditions are the same sentence, because ||z_n| − 0| = |z_n − 0|.'),
    host,
    h('p', { id: 'series-note' }, 'Exercise 9 is the one direction. If the pile settles, the bags settle at 0. What the book prints is closed on the index. Bags that settle do not force the pile to settle.'));
}

function repeatPanel() {
  const starts = [
    { id: 'repeat-start-half', label: 'start 1/2', z: { re: 0.5, im: 0 } },
    { id: 'repeat-start-green', label: 'start 0.45 + 0.2i', z: { re: 0.45, im: 0.2 } },
  ];
  const slides = [
    { id: 'repeat-c-0', label: 'c = 0', c: { re: 0, im: 0 } },
    { id: 'repeat-c-i', label: 'c = i', c: { re: 0, im: 1 } },
  ];
  let start = starts[0];
  let slide = slides[0];
  let shown = 1;
  const host = h('div', { id: 'repeat-walk' });
  const startBtns = [];
  const slideBtns = [];
  const more = h('button', { type: 'button', class: 'btn', id: 'repeat-more' }, 'One more step');
  function draw() {
    const w = juliaWalk(start.z, slide.c, Math.max(shown, 1), 64);
    const pts = w.points.slice(0, shown + 1);
    show(host, pts.map((p, i) => `step ${i}: ${fmtCart(p, 4)}`));
    more.disabled = shown >= 8;
    more.textContent = shown >= 8 ? 'Eight steps shown' : 'One more step';
  }
  function press(list, buttons, pick) {
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(list[i] === pick)));
  }
  const startChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Starting point' });
  starts.forEach((s) => {
    const b = chipButton(s.id, s.label, s === start, () => { start = s; shown = 1; press(starts, startBtns, s); draw(); });
    startBtns.push(b);
    startChips.append(b);
  });
  const slideChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'The slide c' });
  slides.forEach((s) => {
    const b = chipButton(s.id, s.label, s === slide, () => { slide = s; shown = 1; press(slides, slideBtns, s); draw(); });
    slideBtns.push(b);
    slideChips.append(b);
  });
  more.addEventListener('click', () => { shown = Math.min(shown + 1, 8); draw(); });
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'repeat-title' },
    h('h2', { id: 'repeat-title' }, 'One step, then again'),
    h('p', null, 'Square is the power from Test 1. Adding c is the slide from Test 1. On the flat paper, c is a hollow square. On the Julia picture the handle for c is orange, and orange on a landing means the walk left. The list you get by doing both, again and again, is the orbit. The green start on the Julia picture is the second chip.'),
    startChips, slideChips, host, more);
}

function diskPanel() {
  const samples = [
    { id: 'disk-inside', label: '|z| < 1', z: { re: 0.5, im: 0 }, fate: 'Settles. Inside the unit circle, |z_k| = |z_0| raised to 2^k, so the terms go to 0. Exercise 4(a).' },
    { id: 'disk-outside', label: '|z| > 1', z: { re: 1.5, im: 0 }, fate: 'Leaves. Outside the unit circle the moduli grow, so the orbit runs off every disk. Exercise 4(b).' },
    { id: 'disk-seam', label: 'z = −1', z: { re: -1, im: 0 }, fate: 'Settles. On the unit circle, −1 goes to 1 and sits there. The criterion for 4(c) is the added check, closed on the index.' },
    { id: 'disk-cycle', label: 'cube root of 1, not 1', z: { re: -0.5, im: Math.sqrt(3) / 2 }, fate: 'Stays. On the unit circle, this start is a non-real cube root of unity, from Roots on Test 1. It cycles and does not settle at 1.' },
  ];
  let current = samples[0];
  const host = h('div', { id: 'disk-walk' });
  const note = h('p', { id: 'disk-fate' });
  const buttons = [];
  function draw() {
    const w = juliaWalk(current.z, { re: 0, im: 0 }, 6, 1e9);
    show(host, w.points.map((p, i) => {
      const r = Math.hypot(p.re, p.im);
      return `step ${i}: ${fmtCart(p, 4)}, modulus ${fmtNum(r, 4)}`;
    }));
    note.textContent = current.fate;
  }
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Where the start sits' });
  samples.forEach((s, i) => {
    const b = chipButton(s.id, s.label, i === 0, () => {
      current = s;
      buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(j === i)));
      draw();
    });
    buttons.push(b);
    chips.append(b);
  });
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'disk-title' },
    h('h2', { id: 'disk-title' }, 'c = 0, before the picture'),
    h('p', null, 'Example 4.2.8 says the filled set is the closed unit disk and the Julia set is the unit circle. The picture of that disk is the next stop. These four starts are the exercise.'),
    chips, host, note,
    h('p', null, h('a', { href: '#julia' }, 'Open the Julia picture at c = 0')));
}

function zeroPanel() {
  const samples = [
    { id: 'zero-c-0', label: 'c = 0', c: { re: 0, im: 0 }, text: 'Settles at 0. The orbit of 0 is 0, 0, 0, …. It is bounded, so the Julia set is the unit circle, one piece.' },
    { id: 'zero-c-i', label: 'c = i', c: { re: 0, im: 1 }, text: 'Stays. Example 4.2.12. The steps are 0, i, −1 + i, −i, and then it repeats. Bounded, so the Julia set is connected. The printed list of that orbit omits i. The index names the slip.' },
    { id: 'zero-c-m2', label: 'c = −2', c: { re: -2, im: 0 }, text: 'Settles at 2. Exercise 5. The orbit is 0, −2, 2, 2, 2, …. Bounded, so the Julia set is connected. The picture’s pad stops at 1.6, so c = −2 is computed here.' },
    { id: 'zero-c-quarter', label: 'c = 0.3', c: { re: 0.3, im: 0 }, text: 'Leaves. Real and greater than 1/4. Exercise 8: this c is not in the set of c whose orbit of 0 stays bounded. The terms keep climbing.' },
  ];
  let current = samples[1];
  const host = h('div', { id: 'zero-walk' });
  const note = h('p', { id: 'zero-fate' });
  const buttons = [];
  function draw() {
    const w = juliaWalk({ re: 0, im: 0 }, current.c, 8, 64);
    show(host, w.points.map((p, i) => `step ${i}: ${fmtCart(p, 4)}`));
    note.textContent = current.text;
  }
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'The value of c' });
  samples.forEach((s, i) => {
    const b = chipButton(s.id, s.label, s === current, () => {
      current = s;
      buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(samples[j] === s)));
      draw();
    });
    buttons.push(b);
    chips.append(b);
  });
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'zero-title' },
    h('h2', { id: 'zero-title' }, 'Only the start at 0'),
    h('p', null, 'Theorem 4.2.11: the Julia set of z² + c is connected exactly when this one orbit stays bounded. The book then collects those c into a set. The stop “Which c keep 0 bounded” states that definition and does not draw the set. On the flat paper, c is a hollow square.'),
    chips, host, note);
}

const BOOK_NEWTON = [
  { re: -0.875, im: 1.125 },
  { re: -0.22212, im: 0.83942 },
  { re: 0.03624, im: 0.97638 },
  { re: -0.00086, im: 0.99958 },
];

function newtonStepPanel() {
  const host = h('div', { id: 'newton-step-walk' });
  const note = h('p', { id: 'newton-step-book' });
  const w = newtonWalk({ re: 0.25, im: 0.25 }, [I, MI], 6, 1e-18);
  const lines = w.points.map((p, i) => `step ${i}: ${fmtCart(p, 5)}`);
  show(host, lines);
  const mismatches = BOOK_NEWTON.filter((b, i) => {
    const p = w.points[i + 1];
    return !p || Math.hypot(p.re - b.re, p.im - b.im) > 2e-4;
  });
  note.textContent = mismatches.length
    ? 'The computed steps do not match the book’s table. Treat the table in the index as the printed source.'
    : 'These five steps match Example 4.2.1’s table to the digits the book prints. z_5 agrees with i to five decimals.';
  const lineHost = h('div', { id: 'newton-step-line' });
  show(lineHost, ['f(z) = 2z − 4, start at 0.', 'One step: 0 − (2·0 − 4)/2 = 2, which is the root. Exercise 3.']);
  return h('section', { class: 'panel', 'aria-labelledby': 'newton-step-title' },
    h('h2', { id: 'newton-step-title' }, 'The book’s five steps, and a line'),
    h('p', null, 'The step is z − f(z)/f′(z). For a line az + b that is one subtraction, and you are done. The derivative in the denominator is the zoom from Test 1.'),
    host, note,
    h('h3', null, 'Degree 1'),
    lineHost,
    h('p', null, h('a', { href: '#newton' }, 'Open the Newton picture')));
}

function halfPanel() {
  const samples = [
    { id: 'half-upper', label: 'upper, z² + 1', z: { re: 0.25, im: 0.25 }, roots: [I, MI], text: 'Which root: i. Im stays positive. The added check for Exercise 1(d) is closed on the index. A sample of half-plane seeds walks to i.' },
    { id: 'half-lower', label: 'lower, z² + 1', z: { re: 0.25, im: -0.25 }, roots: [I, MI], text: 'Which root: −i. Im stays negative.' },
    { id: 'half-real', label: 'real, z² + 1', z: { re: 0.5, im: 0 }, roots: [I, MI], text: 'Leaves. Example 4.2.4. A real seed stays real, so the walk never answers which root. Exercise 1(c) is the induction.' },
    { id: 'half-right', label: 'right, z² − 1', z: { re: 0.4, im: 0.3 }, roots: [ONE, MONE], text: 'Which root: 1. Exercise 2. The right half-plane walks to 1. N(z) = (z + 1/z)/2.' },
    { id: 'half-imag', label: 'imaginary, z² − 1', z: { re: 0, im: 0.5 }, roots: [ONE, MONE], text: 'Leaves. The seed stays on the imaginary axis. The roots are real, so this walk does not name one.' },
  ];
  let current = samples[0];
  const host = h('div', { id: 'half-walk' });
  const note = h('p', { id: 'half-fate' });
  const buttons = [];
  function draw() {
    const w = newtonWalk(current.z, current.roots, 8, 1e-16);
    show(host, w.points.map((p, i) => `step ${i}: ${fmtCart(p, 4)}`));
    note.textContent = current.text;
  }
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Which seed' });
  samples.forEach((s) => {
    const b = chipButton(s.id, s.label, s === current, () => {
      current = s;
      buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(samples[j] === s)));
      draw();
    });
    buttons.push(b);
    chips.append(b);
  });
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'half-title' },
    h('h2', { id: 'half-title' }, 'Which side of the line'),
    h('p', null, 'The book proves the half-planes are invariant and leaves the convergence in (d) as a discussion. The added check in the index is the squared-ratio argument, checked on a grid. It is not printed in the book.'),
    chips, host, note);
}

function seedsPanel() {
  const samples = [
    { id: 'seeds-quarter', label: '|c| ≤ 1/4', c: { re: 0.2, im: 0 }, text: 'Settles. Example 4.2.16. |c| ≤ 1/4 forces the orbit of 0 to stay inside |z| ≤ 1/2, and it sits down. The book’s induction is closed on the index.' },
    { id: 'seeds-cusp', label: 'c = 1/2', c: { re: 0.5, im: 0 }, text: 'Leaves. Exercise 8. A real c bigger than 1/4 is not in the set. Each step grows by at least c − 1/4.' },
    { id: 'seeds-m2', label: 'c = −2', c: { re: -2, im: 0 }, text: 'Settles at 2. Exercise 9. −2 is in the set, because the orbit of 0 is bounded, and its negative, 2, is not.' },
    { id: 'seeds-2', label: 'c = 2', c: { re: 2, im: 0 }, text: 'Leaves. The orbit of 0 under z² + 2 runs off every disk. So 2 is the book’s example of a negative that falls outside.' },
  ];
  let current = samples[0];
  const host = h('div', { id: 'seeds-walk' });
  const note = h('p', { id: 'seeds-fate' });
  const buttons = [];
  function draw() {
    const w = juliaWalk({ re: 0, im: 0 }, current.c, 8, 64);
    show(host, w.points.map((p, i) => `step ${i}: ${fmtCart(p, 4)}`));
    note.textContent = current.text;
  }
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'A value of c' });
  samples.forEach((s) => {
    const b = chipButton(s.id, s.label, s === current, () => {
      current = s;
      buttons.forEach((btn, j) => btn.setAttribute('aria-pressed', String(samples[j] === s)));
      draw();
    });
    buttons.push(b);
    chips.append(b);
  });
  draw();
  return h('section', { class: 'panel', 'aria-labelledby': 'seeds-title' },
    h('h2', { id: 'seeds-title' }, 'Which c keep the orbit of 0 bounded'),
    h('p', { id: 'seeds-no-picture' }, 'The book calls this set the Mandelbrot set: the c for which the orbit of 0 under z² + c stays bounded. It contains the disk |c| ≤ 1/4 and sits inside |c| ≤ 2. This site does not draw it. On the flat paper, c is a hollow square. Definitions 4.2.17 and 4.2.18 and Theorem 4.2.20 are the fixed point, the attracting one, and the cardioid |f′(z₀)| < 1. That derivative is the zoom from Test 1. Exercises 7 through 13 in the index are still section 4.2.'),
    chips, host, note);
}

function geometricPanel() {
  const ratio = { re: 0.5, im: 0.5 };
  let sum = { re: 0, im: 0 };
  let term = { re: 1, im: 0 };
  const lines = [];
  for (let n = 0; n <= 8; n++) {
    sum = { re: sum.re + term.re, im: sum.im + term.im };
    lines.push(`partial sum through n = ${n}: ${fmtCart(sum, 4)}`);
    term = mul(term, ratio);
  }
  const host = h('div', { id: 'geometric-sum' });
  show(host, lines);
  return h('section', { class: 'panel', 'aria-labelledby': 'geometric-title' },
    h('h2', { id: 'geometric-title' }, 'The closed form, term by term'),
    h('p', null, 'Theorem 4.3.1: if |z| < 1, the pile settles at 1/(1 − z). For z = (1 + i)/2 that point is 1 + i. The partial sums above are that walk. On the unit circle the bags stay, and outside it the pile leaves. Exercise 1 is this series. What the book prints, and the added check, stay closed on the index.'),
    host);
}

function powerPanel() {
  const r1 = Math.hypot(4, -1);
  const r2 = Math.hypot(2, 3);
  return h('section', { class: 'panel', 'aria-labelledby': 'powerseries-title' },
    h('h2', { id: 'powerseries-title' }, 'Inside the disk, outside the disk'),
    h('p', { id: 'powerseries-radii' }, `Theorem 4.4.1: a power series settles inside its disk and leaves outside it. The book says converges and diverges. The circle is the same wall as c = 0. |4 − i| = ${fmtNum(r1, 4)} = √17. |2 + 3i| = ${fmtNum(r2, 4)} = √13, which is smaller. Exercise 6 asks whether a series can settle at the first point and leave at the second. The added check is closed on the index.`),
    h('p', null, 'Exercise 3, marked extra, asks for ten radii. The index quotes the four answers the HTML prints and leaves the rest in the section.'));
}

function harmonicPanel() {
  return h('section', { class: 'panel', 'aria-labelledby': 'harmonic-title' },
    h('h2', { id: 'harmonic-title' }, 'After Cauchy–Riemann, if you go there'),
    h('p', { id: 'harmonic-check' }, 'Theorem 3.3.1 [PDF Theorem 3.8]: if f = u + iv is analytic on a domain, then u and v are harmonic there, meaning u_xx + u_yy = 0 and the same for v. Example 3.3.2 [PDF Example 3.11] takes u = x² − y². Then u_xx + u_yy = 2 + (−2) = 0, and v = 2xy is a harmonic conjugate, so f(z) = z². That square is the power from Test 1.'),
    h('p', null, 'Test 1 stopped at the Cauchy–Riemann equations, section 3.2. Nothing on the Julia or Newton picture uses this section. The flat paper does not use it either.'));
}

const PAGES = {
  sequence: {
    lede: 'Section 4.1 is the language for everything after it. An orbit is a sequence. A basin is the set of starts whose sequence settles on a root.',
    cites: [
      { pin: '§4.1, Definition 4.1.1 [PDF Definition 4.1]', href: sectionHref('sec_sequences-series.html', 'Seq_Lim_Def') },
      { pin: '§4.1, Definition 4.1.7 and Theorem 4.1.8 [PDF Definition 4.2 and Theorem 4.2]', href: sectionHref('sec_sequences-series.html', 'Bounded_Def') },
    ],
    cross: [
      ['#paper', 'The flat paper: settles or stays', 'sequence-link-paper'],
      ['#powers', 'Test 1, Powers: spin and stretch, n times', 'sequence-link-powers'],
      ['#roots', 'Test 1, Roots: the eighth roots of unity', 'sequence-link-roots'],
      ['#distance', 'Test 1, Distance: the modulus is the length', 'sequence-link-distance'],
    ],
    panel: sequencePanel(),
  },
  series: {
    lede: 'This sits after the sequence. The pile settles only if the bags settle at 0. The book calls that converge, and it does not claim the converse.',
    cites: [{ pin: '§4.1, Theorem 4.1.17 [PDF Theorem 4.5]', href: sectionHref('sec_sequences-series.html', 'Conv_terms_go_to_0') }],
    cross: [
      ['#paper', 'The flat paper: the bags and the pile', 'series-link-paper'],
      ['#distance', 'Test 1, Distance: |z| goes to 0', 'series-link-distance'],
    ],
    panel: seriesPanel(),
  },
  repeat: {
    lede: 'This sits on the motion from Test 1. Do it again and the list settles, stays, or leaves. The orbit of z₀ is z₀, f(z₀), f(f(z₀)), and so on.',
    cites: [{ pin: '§4.2, iteration after the Newton pictures', href: sectionHref('sec_julia-mandelbrot.html') }],
    cross: [
      ['#paper', 'The flat paper: the twist', 'repeat-link-paper'],
      ['#powers', 'Test 1, Powers: squaring', 'repeat-link-powers'],
      ['#arithmetic', 'Test 1, Arithmetic: the slide', 'repeat-link-arithmetic'],
      ['#julia', 'Test 2, the Julia picture of this rule', 'repeat-link-julia'],
    ],
    panel: repeatPanel(),
  },
  disk: {
    lede: 'This sits before c moves. The rule is squaring, and the unit circle is the wall. Example 4.2.8 names the filled set and the Julia set in that one case.',
    cites: [{ pin: '§4.2, Example 4.2.8 [PDF Example 4.9]', href: sectionHref('sec_julia-mandelbrot.html', 'K-0') }],
    cross: [
      ['#paper', 'The flat paper: the unit circle', 'disk-link-paper'],
      ['#powers', 'Test 1, Powers: squaring', 'disk-link-powers'],
      ['#roots', 'Test 1, Roots: roots of unity on the circle', 'disk-link-roots'],
      ['#sets', 'Test 1, Disks: the closed unit disk', 'disk-link-sets'],
      ['#staircase', 'Test 1, the Staircase: the angle', 'disk-link-staircase'],
    ],
    panel: diskPanel(),
  },
  zero: {
    lede: 'One seed decides the shape. The Julia set of z² + c is one piece exactly when the orbit of 0 stays bounded.',
    cites: [
      { pin: '§4.2, Theorem 4.2.11 [PDF Theorem 4.9]', href: sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected') },
      { pin: '§4.2, Example 4.2.12 [PDF Example 4.10]', href: sectionHref('sec_julia-mandelbrot.html', 'Julia_Connected_Ex') },
    ],
    cross: [
      ['#paper', 'The flat paper: the notch c', 'zero-link-paper'],
      ['#powers', 'Test 1, Powers: squaring', 'zero-link-powers'],
      ['#arithmetic', 'Test 1, Arithmetic: the slide by c', 'zero-link-arithmetic'],
    ],
    panel: zeroPanel(),
  },
  'newton-step': {
    lede: 'This sits on the correction. Example 4.2.1 traces five steps from 1/4 + i/4 for z² + 1, and the fifth iterate agrees with i. Landed, within 0.01, is already the fourth step.',
    cites: [{ pin: '§4.2, Example 4.2.1 [PDF Example 4.7]', href: sectionHref('sec_julia-mandelbrot.html', 'Newton_s_Method_Ex') }],
    cross: [
      ['#paper', 'The flat paper: the correction', 'newton-step-link-paper'],
      ['#derivative', 'Test 1, the derivative: the zoom in the denominator', 'newton-step-link-derivative'],
    ],
    panel: newtonStepPanel(),
  },
  half: {
    lede: 'For z² + 1 the real axis is a wall. Example 4.2.4 shows a real seed never finds ±i. Exercise 1 asks you to see why a half-plane seed stays in that half-plane.',
    cites: [{ pin: '§4.2, Example 4.2.4 [PDF Example 4.8]', href: sectionHref('sec_julia-mandelbrot.html', 'ex_4_8') }],
    cross: [
      ['#paper', 'The flat paper: which root, and the real wall', 'half-link-paper'],
      ['#addresses', 'Test 1, Addresses: the step in r and θ', 'half-link-addresses'],
      ['#reciprocal', 'Test 1, 1/z: the step subtracts a reciprocal', 'half-link-reciprocal'],
      ['#sets', 'Test 1, Sets: a half-plane', 'half-link-sets'],
    ],
    panel: halfPanel(),
  },
  seeds: {
    lede: 'Which c keep the orbit of 0 bounded: every c for which that orbit under z² + c stays bounded. This site does not draw that set. The exercises stay in the index. The Julia set is one piece exactly when this orbit is bounded.',
    cites: [
      { pin: '§4.2, Example 4.2.16 [PDF Example 4.11]', href: sectionHref('sec_julia-mandelbrot.html', 'Disk__25_in_M') },
      { pin: '§4.2, Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10], Theorem 4.2.20 [PDF Theorem 4.11]', href: sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def') },
    ],
    cross: [
      ['#paper', 'The flat paper: |f′(z₀)| < 1 as a number', 'seeds-link-paper'],
      ['#derivative', 'Test 1, the derivative: |f′(z₀)| < 1', 'seeds-link-derivative'],
      ['#zero', 'Test 2, the orbit of 0', 'seeds-link-zero'],
    ],
    panel: seedsPanel(),
  },
  geometric: {
    lede: 'After the pictures, section 4.3 goes back to series. The geometric series is the one with a closed form inside the unit disk.',
    cites: [{ pin: '§4.3, Theorem 4.3.1 [PDF Theorem 4.12]', href: sectionHref('sec_convergence-theorems.html', 'Geometric_Series') }],
    cross: [
      ['#paper', 'The flat paper: the stack', 'geometric-link-paper'],
      ['#powers', 'Test 1, Powers: the terms zⁿ', 'geometric-link-powers'],
      ['#sets', 'Test 1, Disks: inside |z| < 1', 'geometric-link-sets'],
    ],
    panel: geometricPanel(),
  },
  powerseries: {
    lede: 'This sits after the geometric series. A power series settles inside its disk and leaves outside it. The circle is the same wall as c = 0.',
    cites: [{ pin: '§4.4, Theorems 4.4.1 and 4.4.3 [PDF Theorems 4.15 and 4.16]', href: sectionHref('sec_power-series.html', 'Regions_of_Convergence') }],
    cross: [
      ['#paper', 'The flat paper: inside the circle, outside it', 'powerseries-link-paper'],
      ['#sets', 'Test 1, Disks: inside the radius, outside it', 'powerseries-link-sets'],
    ],
    panel: powerPanel(),
  },
  harmonic: {
    lede: 'Section 3.3 is the only piece of Chapter 3 that Test 1 did not cover. It may or may not be on Test 2. Next from the radius opens the index, then the flat paper. This stop is not on that path.',
    cites: [{ pin: '§3.3, Theorem 3.3.1 [PDF Theorem 3.8]', href: sectionHref('sec_harmonic-functions.html', 'Harmonic_Theorem') }],
    cross: [
      ['#cauchy-riemann', 'Test 1, Cauchy–Riemann', 'harmonic-link-cr'],
      ['#powers', 'Test 1, Powers: the example is z²', 'harmonic-link-powers'],
    ],
    panel: harmonicPanel(),
  },
};

export function mountConcept(el, ctx) {
  const spec = PAGES[ctx.station.id];
  if (!spec) {
    el.append(h('p', null, 'This stop has no page.'));
    return function unmount() {};
  }
  shell(el, ctx, spec);
  return function unmount() {};
}
