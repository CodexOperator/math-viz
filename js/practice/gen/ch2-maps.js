// Deterministic images for Chapter 2 practice.
// A linear map w = (a+bi)z + (c+di), the parabola of a vertical line under z^2,
// and a sector under z^n. Answers are computed from the seed. No DOM.

function lcg(seed) {
  let s = (Number(seed) >>> 0) || 1;
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

// a+bi, a-bi, bi, a, i, -i. null when the text is not one complex number.
export function parseComplex(s) {
  const t = normAnswer(s).replace(/\*/g, '');
  if (t === 'i') return { re: 0, im: 1 };
  if (t === '-i') return { re: 0, im: -1 };
  let m = /^([+-]?\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)i$/.exec(t);
  if (m) return { re: Number(m[1]), im: Number(m[2]) };
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

function powerSector(rng) {
  const n = [2, 3, 4][irand(rng, 0, 2)];
  const cut = 2 * n;
  const answer = '0 < arg w < π/2';
  const choices = [
    answer,
    `0 < arg w < π/${cut}`,
    `0 < arg w < ${n}π`,
    `π/${cut} < arg w < π`,
  ];
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = irand(rng, 0, i);
    const swap = choices[i];
    choices[i] = choices[j];
    choices[j] = swap;
  }
  const end = (Math.PI / cut) * n;
  return {
    kind: 'mc',
    prompt: `Under \\(w = z^{${n}}\\), the sector \\(r > 0\\), \\(0 < \\arg z < \\pi/${cut}\\) maps to`,
    answer,
    accept: [answer, '0 < arg w < pi/2', '0<argw<pi/2'],
    choices,
    why: `Arguments multiply by ${n}: \\(\\pi/${cut} \\cdot ${n} = \\pi/2\\).`,
    memory: 'z^n multiplies arguments by n.',
    values: { n, end },
  };
}

export function generate(seed, params) {
  const spec = params && typeof params === 'object' ? params : {};
  const rng = lcg(seed);
  const kind = spec.kind || 'linear';
  if (kind === 'power-line') return powerLine(rng, spec);
  if (kind === 'power-sector') return powerSector(rng);
  return linear(rng, spec);
}

export function sameComplex(text, values) {
  const got = parseComplex(text);
  if (!got || !values) return false;
  return Math.abs(got.re - values.re) < 1e-9 && Math.abs(got.im - values.im) < 1e-9;
}

export function answerMatches(text, item) {
  if (!item) return false;
  if (item.values && Object.prototype.hasOwnProperty.call(item.values, 're')) return sameComplex(text, item.values);
  const got = normAnswer(text);
  if (!got) return false;
  const forms = [item.answer].concat(item.accept || []);
  return forms.some((form) => normAnswer(form) === got);
}

// Recompute a handful of seeds. Throws if a generated answer disagrees with the arithmetic.
export function selfCheck() {
  for (let seed = 1; seed <= 24; seed += 1) {
    const lin = generate(seed, { kind: 'linear', a: [-3, 3], b: [-3, 3], c: [-2, 2], d: [-2, 2], x: [-3, 3], y: [-3, 3] });
    const v = lin.values;
    const re = v.a * v.x - v.b * v.y + v.c;
    const im = v.a * v.y + v.b * v.x + v.d;
    if (re !== v.re || im !== v.im) throw new Error(`linear seed ${seed} drifted`);
    if (fmtComplex(re, im) !== lin.answer) throw new Error(`linear seed ${seed} text`);
    if (!answerMatches(lin.answer, lin)) throw new Error(`linear seed ${seed} grade`);
    if (v.a === 0 && v.b === 0) throw new Error(`linear seed ${seed} is constant`);

    const line = generate(seed, { kind: 'power-line', a: [1, 3] });
    const a = line.values.a;
    const expect = `u = ${a * a} - v^2/${4 * a * a}`;
    if (line.answer !== expect) throw new Error(`line seed ${seed}`);
    if (!line.choices.includes(line.answer) || new Set(line.choices).size !== 4) throw new Error(`line choices ${seed}`);

    const sector = generate(seed, { kind: 'power-sector' });
    const n = sector.values.n;
    if (![2, 3, 4].includes(n)) throw new Error(`sector n ${seed}`);
    if (Math.abs(sector.values.end - Math.PI / 2) > 1e-12) throw new Error(`sector angle ${seed}`);
    if (sector.answer !== '0 < arg w < π/2') throw new Error(`sector text ${seed}`);
    if (!sector.choices.includes(sector.answer)) throw new Error(`sector choices ${seed}`);
  }
  return true;
}
