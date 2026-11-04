// Deterministic images for Chapter 2 practice.
// A linear map w = (a+bi)z + (c+di), the parabola of a vertical line under z^2,
// and a sector under z^n. Answers are computed from the seed. No DOM.

function lcg(seed) {
  let s = (Number(seed) >>> 0) || 1;
  // Mix before the first draw. Consecutive seeds otherwise share a first value.
  s = Math.imul(s ^ (s >>> 16), 0x7feb352d) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x846ca68b) >>> 0;
  return function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function irand(rng, lo, hi) {
  const a = Math.round(Number(lo));
  const b = Math.round(Number(hi));
  const span = Math.max(0, b - a);
  return a + Math.floor(rng() * (span + 1));
}

function pair(range, fallback) {
  if (Array.isArray(range) && range.length >= 2) return range;
  return fallback;
}

export function fmtComplex(re, im) {
  const r = Math.round(re);
  const i = Math.round(im);
  if (i === 0) return String(r);
  const imag = i === 1 ? 'i' : i === -1 ? '-i' : `${i}i`;
  if (r === 0) return imag;
  return i < 0 ? `${r}${imag}` : `${r}+${imag}`;
}

export function normAnswer(s) {
  let t = String(s == null ? '' : s).trim().toLowerCase();
  t = t.replace(/\$/g, '').replace(/\\\(|\\\)/g, '');
  t = t.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
  t = t.replace(/\^\{([^{}]+)\}/g, '^$1');
  t = t.replace(/[{}]/g, '');
  t = t.replace(/\\operatorname\{arg\}|\\arg/g, 'arg');
  t = t.replace(/\\pi/g, 'pi');
  t = t.replace(/π/g, 'pi');
  t = t.replace(/[−–—]/g, '-');
  t = t.replace(/_/g, '');
  t = t.replace(/\s+/g, '');
  t = t.replace(/\\/g, '');
  return t;
}

// a+bi, a-bi, a+i, a-i, bi, a, i, -i. null when the text is not one complex number.
export function parseComplex(s) {
  const t = normAnswer(s).replace(/\*/g, '');
  if (t === 'i' || t === '+i') return { re: 0, im: 1 };
  if (t === '-i') return { re: 0, im: -1 };
  let m = /^([+-]?\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)?i$/.exec(t);
  if (m) {
    const sign = m[2] === '-' ? -1 : 1;
    const mag = m[3] == null || m[3] === '' ? 1 : Number(m[3]);
    return { re: Number(m[1]), im: sign * mag };
  }
  m = /^([+-]?\d+(?:\.\d+)?)i$/.exec(t);
  if (m) return { re: 0, im: Number(m[1]) };
  m = /^([+-]?\d+(?:\.\d+)?)$/.exec(t);
  if (m) return { re: Number(m[1]), im: 0 };
  return null;
}

function linear(rng, params) {
  const aR = pair(params.a, [-3, 3]);
  const bR = pair(params.b, [-3, 3]);
  const cR = pair(params.c, [-2, 2]);
  const dR = pair(params.d, [-2, 2]);
  const xR = pair(params.x, [-3, 3]);
  const yR = pair(params.y, [-3, 3]);
  let a = 0;
  let b = 0;
  for (let k = 0; k < 12 && a === 0 && b === 0; k += 1) {
    a = irand(rng, aR[0], aR[1]);
    b = irand(rng, bR[0], bR[1]);
  }
  if (a === 0 && b === 0) a = 1;
  const c = irand(rng, cR[0], cR[1]);
  const d = irand(rng, dR[0], dR[1]);
  const x = irand(rng, xR[0], xR[1]);
  const y = irand(rng, yR[0], yR[1]);
  const re = a * x - b * y + c;
  const im = a * y + b * x + d;
  const coeff = fmtComplex(a, b);
  const slide = fmtComplex(c, d);
  const point = fmtComplex(x, y);
  const image = fmtComplex(re, im);
  return {
    kind: 'blank',
    prompt: `The linear map \\(w = (${coeff})z + (${slide})\\) sends \\(z = ${point}\\) to`,
    answer: image,
    accept: [image, image.replace('+', ' + ').replace(/-(?=\d)/, ' - ')],
    why: `\\((${coeff})(${point}) + (${slide}) = ${image}\\).`,
    memory: 'Multiply by A, then add B.',
    values: { re, im, a, b, c, d, x, y },
  };
}

function powerLine(rng, params) {
  const aR = pair(params.a, [1, 3]);
  let a = irand(rng, aR[0], aR[1]);
  if (a === 0) a = 1;
  const num = a * a;
  const den = 4 * a * a;
  const answer = `u = ${num} - v^2/${den}`;
  const choices = [
    answer,
    `u = ${num} - v^2/${2 * a}`,
    `v = ${num} - u^2/${den}`,
    `u = ${num} + v^2/${den}`,
  ];
  // Shuffle after the answer exists, so the seed picks the order and not the truth.
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = irand(rng, 0, i);
    const swap = choices[i];
    choices[i] = choices[j];
    choices[j] = swap;
  }
  return {
    kind: 'mc',
    prompt: `Under \\(w = z^2\\), the vertical line \\(x = ${a}\\) maps to the parabola`,
    answer,
    accept: [answer, `u=${num}-v^2/${den}`, `u = ${num} - \\frac{v^2}{${den}}`],
    choices,
    why: `\\(v = ${2 * a}y\\), so \\(y = v/${2 * a}\\) and \\(u = ${num} - v^2/${den}\\).`,
    memory: 'A vertical line under z^2 opens left as a parabola.',
    values: { a, num, den },
  };
}

// The image angle is n times the sector. These pairs are not all π/2.
const SECTORS = Object.freeze([
  { n: 2, den: 3, label: '2π/3', rad: (2 * Math.PI) / 3 },
  { n: 3, den: 2, label: '3π/2', rad: (3 * Math.PI) / 2 },
  { n: 2, den: 4, label: 'π/2', rad: Math.PI / 2 },
  { n: 4, den: 3, label: '4π/3', rad: (4 * Math.PI) / 3 },
  { n: 3, den: 3, label: 'π', rad: Math.PI },
  { n: 4, den: 2, label: '2π', rad: 2 * Math.PI },
]);

function powerSector(rng, seed) {
  const row = SECTORS[(Number(seed) >>> 0) % SECTORS.length];
  const answer = `0 < arg w < ${row.label}`;
  const forgot = `0 < arg w < π/${row.den}`;
  const tooFar = `0 < arg w < ${row.n}π`;
  const swapped = `π/${row.den} < arg w < π`;
  const choices = [answer, forgot, tooFar, swapped];
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = irand(rng, 0, i);
    const swap = choices[i];
    choices[i] = choices[j];
    choices[j] = swap;
  }
  const miss = {};
  miss[forgot] = 'That is the angle of the sector, before multiplying by n.';
  miss[tooFar] = 'That multiplies the fraction by n in the wrong place.';
  miss[swapped] = 'That starts at the cut instead of at 0.';
  return {
    kind: 'mc',
    prompt: `Under \\(w = z^{${row.n}}\\), the sector \\(r > 0\\), \\(0 < \\arg z < \\pi/${row.den}\\) maps to`,
    answer,
    accept: [answer],
    choices,
    miss,
    why: `Arguments multiply by ${row.n}: \\(\\pi/${row.den} \\cdot ${row.n} = ${row.label}\\).`,
    memory: 'z^n multiplies arguments by n.',
    values: { n: row.n, end: row.rad, den: row.den },
  };
}

function recipLine(rng) {
  const a = irand(rng, 1, 3);
  const answer = `|w - 1/${2 * a}| = 1/${2 * a}`;
  const choices = [
    answer,
    `|w - 1/${a}| = 1/${a}`,
    `|w| = ${a}`,
    `u = ${a}`,
  ];
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = irand(rng, 0, i);
    const swap = choices[i];
    choices[i] = choices[j];
    choices[j] = swap;
  }
  const miss = {};
  miss[`|w - 1/${a}| = 1/${a}`] = 'The centre is 1/(2a), not 1/a.';
  miss[`|w| = ${a}`] = 'A vertical line does not stay a circle centred at 0.';
  miss[`u = ${a}`] = '1/z bends a vertical line into a circle.';
  return {
    kind: 'mc',
    prompt: `Under \\(w = 1/z\\), the line \\(x = ${a}\\) maps to the circle`,
    answer,
    accept: [answer],
    choices,
    miss,
    why: `On \\(x = ${a}\\), \\(|w - 1/${2 * a}| = 1/${2 * a}\\).`,
    memory: '1/z swaps lines and circles.',
    values: { a },
  };
}

function pack(item) {
  item.steps = [{
    text: '___',
    answer: item.answer,
    accept: item.accept || [],
    choices: item.choices,
    why: item.why,
    miss: item.miss || null,
  }];
  return item;
}

export const id = 'ch2-maps';

export function generate(seed, params) {
  const spec = params && typeof params === 'object' ? params : {};
  const rng = lcg(seed);
  const kind = spec.kind || 'linear';
  if (kind === 'power-line') return pack(powerLine(rng, spec));
  if (kind === 'power-sector') return pack(powerSector(rng, seed));
  if (kind === 'recip-line') return pack(recipLine(rng));
  return pack(linear(rng, spec));
}

export function sameComplex(text, values) {
  const got = parseComplex(text);
  if (!got || !values) return false;
  return Math.abs(got.re - values.re) < 1e-9 && Math.abs(got.im - values.im) < 1e-9;
}

export function answerMatches(text, item) {
  if (!item) return false;
  if (item.values && Object.prototype.hasOwnProperty.call(item.values, 're') && sameComplex(text, item.values)) return true;
  const got = normAnswer(text);
  if (!got) return false;
  const forms = [item.answer].concat(item.accept || []);
  return forms.some((form) => normAnswer(form) === got);
}

// Recompute a handful of seeds. Throws if a generated answer disagrees with the arithmetic.
export function selfCheck() {
  // Seeds past 24 are where the image is written 9+i or 3-i. The grader has to accept that form.
  for (let seed = 1; seed <= 80; seed += 1) {
    const lin = generate(seed, { kind: 'linear', a: [-3, 3], b: [-3, 3], c: [-2, 2], d: [-2, 2], x: [-3, 3], y: [-3, 3] });
    const v = lin.values;
    const re = v.a * v.x - v.b * v.y + v.c;
    const im = v.a * v.y + v.b * v.x + v.d;
    if (re !== v.re || im !== v.im) throw new Error(`linear seed ${seed} drifted`);
    if (fmtComplex(re, im) !== lin.answer) throw new Error(`linear seed ${seed} text`);
    const read = parseComplex(lin.answer);
    if (!read || read.re !== re || read.im !== im) throw new Error(`linear seed ${seed} parse ${lin.answer}`);
    if (!answerMatches(lin.answer, lin)) throw new Error(`linear seed ${seed} grade`);
    if (!answerMatches(lin.answer.replace('+', ' + '), lin)) throw new Error(`linear seed ${seed} spaced`);
    if (v.a === 0 && v.b === 0) throw new Error(`linear seed ${seed} is constant`);

    const line = generate(seed, { kind: 'power-line', a: [1, 3] });
    const a = line.values.a;
    const expect = `u = ${a * a} - v^2/${4 * a * a}`;
    if (line.answer !== expect) throw new Error(`line seed ${seed}`);
    if (!line.choices.includes(line.answer) || new Set(line.choices).size !== 4) throw new Error(`line choices ${seed}`);

    const sector = generate(seed, { kind: 'power-sector' });
    const n = sector.values.n;
    const row = SECTORS.find((s) => s.n === n && s.den === sector.values.den);
    if (!row) throw new Error(`sector seed ${seed}`);
    if (Math.abs(sector.values.end - row.rad) > 1e-12) throw new Error(`sector angle ${seed}`);
    if (sector.answer !== `0 < arg w < ${row.label}`) throw new Error(`sector text ${seed}`);
    if (!sector.choices.includes(sector.answer) || new Set(sector.choices).size !== 4) throw new Error(`sector choices ${seed}`);
    const expected = (Math.PI / row.den) * row.n;
    if (Math.abs(expected - row.rad) > 1e-12) throw new Error(`sector product ${seed}`);

    const circ = generate(seed, { kind: 'recip-line' });
    const A = circ.values.a;
    if (circ.answer !== `|w - 1/${2 * A}| = 1/${2 * A}`) throw new Error(`recip ${seed}`);
    if (new Set(circ.choices).size !== 4) throw new Error(`recip choices ${seed}`);
  }
  const angles = new Set();
  for (let seed = 1; seed <= 40; seed += 1) angles.add(generate(seed, { kind: 'power-sector' }).answer);
  if (angles.size < 3) throw new Error(`sector answers did not vary: ${[...angles].join(' | ')}`);
  return true;
}
