// Classify an isolated singularity from a computed Laurent series.
// Seed 1 is sin(1/z) at 0, §7.4 Exercise 3(b), page 238.
// Seed 2 is z exp(1/z), Exercise 3(c). The series is built from the
// Taylor series of sin or exp. It is not a table of labels.
// generate(seed, params): the seed is the first argument.

export const id = 'singularity-class';

const DEPTH = 40;

// sin(1/w) = sum_{k=0} (-1)^k w^{-(2k+1)} / (2k+1)!
function sinInv() {
  const map = new Map();
  let fact = 1;
  for (let k = 0; k <= DEPTH; k += 1) {
    if (k > 0) fact *= (2 * k) * (2 * k + 1);
    const sign = k % 2 === 0 ? 1 : -1;
    map.set(-(2 * k + 1), sign / fact);
  }
  // (2k+1)! is never 0, and the power -(2k+1) runs off to -∞.
  map.open = true;
  return map;
}

// w exp(1/w) = sum_{k=0} w^{1-k} / k!
function wExpInv() {
  const map = new Map();
  let fact = 1;
  for (let k = 0; k <= DEPTH + 1; k += 1) {
    if (k > 0) fact *= k;
    map.set(1 - k, 1 / fact);
  }
  // 1/k! is never 0, and the power 1-k runs off to -∞.
  map.open = true;
  return map;
}

// (exp(w)-1)/w = sum_{m=0} w^m / (m+1)!
function expMinusOneOverW() {
  const map = new Map();
  let fact = 1;
  for (let m = 0; m <= DEPTH; m += 1) {
    fact *= m + 1;
    map.set(m, 1 / fact);
  }
  return map;
}

// sin(w)/w^2 = sum_{k=0} (-1)^k w^{2k-1} / (2k+1)!
function sinOverW2() {
  const map = new Map();
  let fact = 1;
  for (let k = 0; k <= DEPTH; k += 1) {
    if (k > 0) fact *= (2 * k) * (2 * k + 1);
    const sign = k % 2 === 0 ? 1 : -1;
    map.set(2 * k - 1, sign / fact);
  }
  return map;
}

// z^2 / (z - sin z) = z^{-1} / v, where z - sin z = z^3 v and v(0) = 1/6.
function z2OverZMinusSin() {
  const terms = 20;
  const v = new Array(terms).fill(0);
  let fact = 6;
  v[0] = 1 / 6;
  for (let m = 1; m < terms; m += 1) {
    fact *= (2 * m + 2) * (2 * m + 3);
    v[m] = (m % 2 === 0 ? 1 : -1) / fact;
  }
  const s = new Array(terms).fill(0);
  s[0] = 1 / v[0];
  for (let n = 1; n < terms; n += 1) {
    let acc = 0;
    for (let i = 1; i <= n; i += 1) acc += v[i] * s[n - i];
    s[n] = -acc / v[0];
  }
  const map = new Map();
  for (let m = 0; m < terms; m += 1) map.set(2 * m - 1, s[m]);
  return map;
}

export function classifyMap(map) {
  let lowest = 0;
  for (const [n, c] of map) {
    if (Math.abs(c) <= 1e-12) continue;
    if (n < 0 && n < lowest) lowest = n;
  }
  if (map.open === true) return { kind: 'essential', order: null };
  if (lowest === 0) return { kind: 'removable', order: 0 };
  return { kind: 'pole', order: -lowest };
}

const CATALOG = [
  {
    tex: '\\sin(1/z)',
    series: sinInv,
    slip: null,
  },
  {
    tex: 'z\\exp(1/z)',
    series: wExpInv,
    slip: null,
  },
  {
    tex: '(\\exp z-1)/z',
    series: expMinusOneOverW,
    slip: null,
  },
  {
    tex: 'z^{2}/(z-\\sin z)',
    series: z2OverZMinusSin,
    slip: 'The selected answer on page 448 calls this removable. $z-\\sin z$ has a zero of order 3 and $z^2$ has a zero of order 2, so Corollary 7.8, page 236, says the quotient has a pole of order 1.',
  },
  {
    tex: '\\sin z/z^{2}',
    series: sinOverW2,
    slip: null,
    exercise: false,
  },
];

function phrase(found) {
  if (found.kind === 'essential') return 'essential';
  if (found.kind === 'removable') return 'removable';
  return `a pole of order ${found.order}`;
}

function whyFor(label, found, slip) {
  const right = phrase(found);
  if (label === right) {
    if (found.kind === 'essential') return 'The computed series still has a negative power at the far end of the expansion, so the principal part does not stop.';
    if (found.kind === 'removable') return 'Every negative coefficient in the computed series is 0.';
    const extra = slip ? ` ${slip}` : '';
    return `The lowest negative power in the computed series is $-${found.order}$, and the powers below it are 0.${extra}`;
  }
  if (label === 'removable') return 'Removable means no negative powers. The computed series still has some.';
  if (label === 'essential') return 'Essential means the negative powers do not stop. This principal part ends.';
  const order = Number(String(label).replace(/[^0-9]/g, '')) || 0;
  if (found.kind === 'pole') return `The lowest power is $-${found.order}$, not $-${order}.`;
  return 'A pole has a finite principal part. This series does not stop.';
}

export function generate(seed, params) {
  const n = Math.max(1, Number(seed) || 1);
  const entry = CATALOG[(n - 1) % CATALOG.length];
  const found = classifyMap(entry.series());
  const answer = phrase(found);
  const choices = ['removable', 'a pole of order 1', 'a pole of order 2', 'essential'];
  if (!choices.includes(answer)) choices[1] = answer;
  const choiceWhy = choices.map((label) => whyFor(label, found, entry.slip));
  const named = entry.exercise !== false && !(params && params.cite === false);
  const cited = named
    ? `Exercise 3 of §7.4, page 238. Classify the singularity of $${entry.tex}$ at $0$.`
    : `Classify the singularity of $${entry.tex}$ at $0$.`;
  return {
    seed: n,
    kind: found.kind,
    order: found.order,
    prompt: cited,
    steps: [
      {
        text: 'The singularity is',
        answer,
        choices,
        choiceWhy,
        why: choiceWhy[choices.indexOf(answer)],
      },
    ],
    memory: 'No negative powers: removable. Lowest power $-k$: a pole of order $k$. Infinitely many negative powers: essential.',
  };
}
