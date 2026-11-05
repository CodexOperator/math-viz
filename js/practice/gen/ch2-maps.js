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
  t = t.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(ch).toString());
  t = t.replace(/√/g, 'sqrt');
  t = t.replace(/_/g, '');
  t = t.replace(/\s+/g, '');
  t = t.replace(/\\/g, '');
  return t;
}

// a+bi, a-bi, a+i, a-i, bi, a, i, -i. null when the text is not one complex number.
export function parseComplex(s) {
  let t = normAnswer(s).replace(/\*/g, '').replace(/[()]/g, '');
  if (t === 'i' || t === '+i') return { re: 0, im: 1 };
  if (t === '-i') return { re: 0, im: -1 };
  // 2i+3, -7i+3, i-4. The real part is written second.
  let m = /^([+-]?)(\d+(?:\.\d+)?)?i([+-]\d+(?:\.\d+)?)$/.exec(t);
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    const mag = m[2] == null || m[2] === '' ? 1 : Number(m[2]);
    return { re: Number(m[3]), im: sign * mag };
  }
  m = /^([+-]?\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)?i$/.exec(t);
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

function freshLine(seed, skip) {
  const pool = [];
  for (let n = 3; n <= 6; n += 1) if (!skip.has(n)) pool.push(n);
  return pool[(Number(seed) >>> 0) % pool.length];
}

function powerLine(rng, params, seed) {
  const skip = new Set([1, 2]);
  const a = params && params.fresh === false ? irand(rng, 1, 3) : freshLine(seed, skip);
  const num = a * a;
  const den = 4 * a * a;
  const answer = `u = ${num} - v^2/${den}`;
  const coeff = `u = ${num} - v^2/${2 * a}`;
  const swapped = `v = ${num} - u^2/${den}`;
  const sign = `u = ${num} + v^2/${den}`;
  const choices = [answer, coeff, swapped, sign];
  const miss = {};
  miss[coeff] = 'The denominator is 4a^2.';
  miss[swapped] = 'That swaps the axes.';
  miss[sign] = 'The parabola opens to the left, so the v^2 term is subtracted.';
  // Shuffle after the answer exists, so the seed picks the order and not the truth.
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = irand(rng, 0, i);
    const swap = choices[i];
    choices[i] = choices[j];
    choices[j] = swap;
  }
  return {
    kind: 'mc',
    prompt: 'Another vertical line under \\(z^2\\).',
    ask: `The image of \\(x = ${a}\\) is`,
    answer,
    accept: [answer, `u=${num}-v^2/${den}`, `u = ${num} - \\frac{v^2}{${den}}`],
    choices,
    miss,
    why: `\\(v = ${2 * a}y\\), so \\(y = v/${2 * a}\\) and \\(u = ${num} - v^2/${den}\\).`,
    memory: 'A vertical line under z^2 opens left as a parabola.',
    values: { a, num, den },
  };
}

// The image angle is n times the sector. These pairs are not all π/2.
const SECTORS = Object.freeze([
  { n: 2, den: 3, label: '2π/3', tex: '2\\pi/3', rad: (2 * Math.PI) / 3 },
  { n: 3, den: 2, label: '3π/2', tex: '3\\pi/2', rad: (3 * Math.PI) / 2 },
  { n: 2, den: 4, label: 'π/2', tex: '\\pi/2', rad: Math.PI / 2 },
  { n: 4, den: 3, label: '4π/3', tex: '4\\pi/3', rad: (4 * Math.PI) / 3 },
  { n: 3, den: 3, label: 'π', tex: '\\pi', rad: Math.PI },
  { n: 4, den: 2, label: '2π', tex: '2\\pi', rad: 2 * Math.PI },
]);

function powerSector(rng, seed) {
  const row = SECTORS[(Number(seed) >>> 0) % SECTORS.length];
  // Math mode drops spaces, so plain "arg w" typesets as argw. \arg keeps the gap the prompt uses.
  const answer = `0 < \\arg w < ${row.tex}`;
  const forgot = `0 < \\arg w < \\pi/${row.den}`;
  const tooFar = `0 < \\arg w < ${row.n}\\pi`;
  const swapped = `\\pi/${row.den} < \\arg w < \\pi`;
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
    why: `Arguments multiply by ${row.n}: \\(\\pi/${row.den} \\cdot ${row.n} = ${row.tex}\\).`,
    memory: 'z^n multiplies arguments by n.',
    values: { n: row.n, end: row.rad, den: row.den },
  };
}

function recipLine(rng, seed) {
  const a = freshLine(seed, new Set([1, 2]));
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
    memory: '1/z sends lines and circles to lines and circles.',
    values: { a },
  };
}

// Equation (1.45), page 32. rho is |z|, not 1 for every row, so Another is not three unit lists.
const ROOT_CASES = Object.freeze([
  { n: 2, label: '-1', arg: Math.PI, rho: 1 },
  { n: 2, label: '1', arg: 0, rho: 1 },
  { n: 4, label: '1', arg: 0, rho: 1 },
  { n: 2, label: '4', arg: 0, rho: 4 },
  { n: 2, label: '-4', arg: Math.PI, rho: 4 },
  { n: 4, label: '16', arg: 0, rho: 16 },
  { n: 2, label: '9', arg: 0, rho: 9 },
  { n: 2, label: '-9', arg: Math.PI, rho: 9 },
]);

function rootList(row, rho) {
  const rad = Math.pow(rho, 1 / row.n);
  const roots = [];
  for (let k = 0; k < row.n; k += 1) {
    const t = (row.arg + 2 * Math.PI * k) / row.n;
    const re = rad * Math.cos(t);
    const im = rad * Math.sin(t);
    const q = (x) => {
      const nearest = Math.round(x);
      return Math.abs(x - nearest) < 1e-8 ? nearest : x;
    };
    roots.push(fmtComplex(q(re), q(im)));
  }
  return roots;
}

function rootItem(seed) {
  const row = ROOT_CASES[(Number(seed) >>> 0) % ROOT_CASES.length];
  const roots = rootList(row, row.rho);
  const answer = roots.join(' and ');
  const principal = roots[0];
  const unit = rootList(row, 1).join(' and ');
  const miss = {};
  const choices = [answer];
  const add = (choice, why) => {
    if (!choice || choice === answer || choices.includes(choice)) return;
    choices.push(choice);
    miss[choice] = why;
  };
  add(principal, 'That keeps k = 0 and drops the roots from Arg + 2πk.');
  if (row.rho !== 1) add(unit, 'That list has modulus 1. Equation (1.45) also takes the modulus to the 1/n.');
  add('1 and -1', row.n === 4
    ? 'That is only k = 0 and k = 2. Equation (1.45) also needs k = 1 and k = 3.'
    : 'Those are the square roots of 1.');
  add('i and -i', row.n === 4
    ? 'That is only k = 1 and k = 3. The fourth roots also include 1 and -1.'
    : 'Those are the square roots of -1.');
  add(row.arg === 0 ? rootList({ n: row.n, arg: Math.PI }, row.rho).join(' and ') : rootList({ n: row.n, arg: 0 }, row.rho).join(' and '),
    'That uses the opposite argument.');
  add(`only ${principal}`, 'That keeps k = 0 and drops the roots from Arg + 2πk.');
  const name = row.n === 2 ? 'square' : `${row.n}th`;
  const modNote = row.rho === 1 ? 'modulus 1' : `modulus ${row.rho}, to the power 1/${row.n}`;
  return {
    kind: 'mc',
    prompt: `The ${name} roots of \\(${row.label}\\) are`,
    answer,
    accept: [answer],
    choices: choices.slice(0, 4),
    miss,
    why: `Equation (1.45), page 32: ${modNote}, argument \\((\\operatorname{Arg} + 2\\pi k)/${row.n}\\) for \\(k = 0\\) through \\(${row.n - 1}\\).`,
    memory: 'The other roots come from Arg + 2πk.',
    values: { n: row.n, arg: row.arg, rho: row.rho },
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
  if (kind === 'power-line') return pack(powerLine(rng, spec, seed));
  if (kind === 'power-sector') return pack(powerSector(rng, seed));
  if (kind === 'recip-line') return pack(recipLine(rng, seed));
  if (kind === 'root') return pack(rootItem(seed));
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
  const official = parseComplex(item.answer);
  const gotC = parseComplex(text);
  if (official && gotC && Math.abs(official.re - gotC.re) < 1e-9 && Math.abs(official.im - gotC.im) < 1e-9) return true;
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
    if (im !== 0) {
      const imagFirst = re < 0 ? `${im}i${re}` : `${im}i+${re}`;
      if (!answerMatches(imagFirst, lin)) throw new Error(`linear seed ${seed} imag first ${imagFirst}`);
    }
    if (!answerMatches(`(${lin.answer})`, lin)) throw new Error(`linear seed ${seed} parens`);
    if (v.a === 0 && v.b === 0) throw new Error(`linear seed ${seed} is constant`);

    const line = generate(seed, { kind: 'power-line', a: [1, 3] });
    const a = line.values.a;
    if (a === 1 || a === 2) throw new Error(`line seed ${seed} repeats a worked line`);
    const expect = `u = ${a * a} - v^2/${4 * a * a}`;
    if (line.answer !== expect) throw new Error(`line seed ${seed}`);
    {
      const y = 1;
      const u = a * a - y * y;
      const v = 2 * a * y;
      const onCurve = a * a - (v * v) / (4 * a * a);
      if (Math.abs(u - onCurve) > 1e-9) throw new Error(`line identity ${seed}`);
    }
    if (!line.prompt.endsWith('z^2\\).') && !line.prompt.endsWith('z^2).')) throw new Error(`line prompt ${line.prompt}`);
    if (!line.choices.includes(line.answer) || new Set(line.choices).size !== 4) throw new Error(`line choices ${seed}`);

    const sector = generate(seed, { kind: 'power-sector' });
    const n = sector.values.n;
    const row = SECTORS.find((s) => s.n === n && s.den === sector.values.den);
    if (!row) throw new Error(`sector seed ${seed}`);
    if (Math.abs(sector.values.end - row.rad) > 1e-12) throw new Error(`sector angle ${seed}`);
    if (sector.answer !== `0 < \\arg w < ${row.tex}`) throw new Error(`sector text ${seed}`);
    if (!sector.choices.includes(sector.answer) || new Set(sector.choices).size !== 4) throw new Error(`sector choices ${seed}`);
    const expected = (Math.PI / row.den) * row.n;
    if (Math.abs(expected - row.rad) > 1e-12) throw new Error(`sector product ${seed}`);

    const circ = generate(seed, { kind: 'recip-line' });
    const A = circ.values.a;
    if (A === 1 || A === 2) throw new Error(`recip seed ${seed} repeats a shown line`);
    if (circ.answer !== `|w - 1/${2 * A}| = 1/${2 * A}`) throw new Error(`recip ${seed}`);
    {
      const y = 1;
      const den = A * A + y * y;
      const u = A / den;
      const v = -y / den;
      const centre = 1 / (2 * A);
      const radius = Math.abs(centre);
      const dist = Math.hypot(u - centre, v);
      if (Math.abs(dist - radius) > 1e-9) throw new Error(`recip identity ${seed}`);
    }
    if (new Set(circ.choices).size !== 4) throw new Error(`recip choices ${seed}`);

    const root = generate(seed, { kind: 'root' });
    if (!root.choices.includes(root.answer) || new Set(root.choices).size !== 4) throw new Error(`root choices ${seed}`);
    const keyed = root.choices.filter((choice) => answerMatches(choice, root));
    if (keyed.length !== 1 || keyed[0] !== root.answer) throw new Error(`root double key ${seed}: ${keyed.join(' | ')}`);
    const reversed = root.answer.split(' and ').reverse().join(' and ');
    if (reversed !== root.answer && answerMatches(reversed, root)) throw new Error(`root reverse ${seed}`);
    const parts = root.answer.split(' and ');
    if (parts.length !== root.values.n) throw new Error(`root count ${seed}`);
    const wantRe = root.values.rho * Math.cos(root.values.arg);
    const wantIm = root.values.rho * Math.sin(root.values.arg);
    for (const part of parts) {
      const z = parseComplex(part);
      if (!z) throw new Error(`root part ${seed} ${part}`);
      let re = 1;
      let im = 0;
      for (let k = 0; k < root.values.n; k += 1) {
        const nextRe = re * z.re - im * z.im;
        im = re * z.im + im * z.re;
        re = nextRe;
      }
      if (Math.abs(re - wantRe) > 1e-6 || Math.abs(im - wantIm) > 1e-6) throw new Error(`root power ${seed} ${part}`);
    }
    for (const choice of root.choices) {
      if (choice === root.answer) continue;
      const line = root.miss && root.miss[choice];
      if (!line || /3\+2i/.test(line)) throw new Error(`root miss ${seed} ${choice}`);
    }
    if (!/Arg \+ 2πk/.test(Object.values(root.miss).join(' '))) throw new Error(`root miss text ${seed}`);
  }
  if (answerMatches('0-6i', { answer: '-6', accept: ['-6+0i'] })) throw new Error('0-6i must stay -6i');
  if (!answerMatches('-6.0', { answer: '-6', accept: [] })) throw new Error('.0');
  if (!answerMatches('3+2*i', { answer: '3+2i', accept: [] })) throw new Error('star');
  if (!answerMatches('(3+2i)', { answer: '3+2i', accept: [] })) throw new Error('parens');
  if (!answerMatches('2i+3', { answer: '3+2i', accept: [] })) throw new Error('order');
  if (!answerMatches('3.0+2.0i', { answer: '3+2i', accept: [] })) throw new Error('decimals');
  if (!answerMatches('right triangle', { answer: 'triangle', accept: ['a triangle', 'right triangle', 'a right triangle'] })) throw new Error('shape');
  if (!answerMatches('|f(z)-w₀|', { answer: '|f(z) - w_0|', accept: ['sqrt((u-u0)^2+(v-v0)^2)'] })) throw new Error('modulus');
  if (!answerMatches('sqrt((u-u_0)^2+(v-v_0)^2)', { answer: '|f(z) - w_0|', accept: ['sqrt((u-u0)^2+(v-v0)^2)'] })) throw new Error('sqrt modulus');
  const rhos = new Set();
  for (let seed = 1; seed <= ROOT_CASES.length; seed += 1) rhos.add(generate(seed, { kind: 'root' }).values.rho);
  if (rhos.size < 3 || ![...rhos].some((rho) => rho > 1)) throw new Error(`roots stayed on three unit lists: ${[...rhos].join(',')}`);
  const lines = new Set();
  for (let seed = 1; seed <= 4; seed += 1) lines.add(generate(seed, { kind: 'power-line' }).values.a);
  if (lines.size < 4) throw new Error('another did not change the line');
  const angles = new Set();
  for (let seed = 1; seed <= 40; seed += 1) angles.add(generate(seed, { kind: 'power-sector' }).answer);
  if (angles.size < 3) throw new Error(`sector answers did not vary: ${[...angles].join(' | ')}`);
  return true;
}
