// Order of a zero or a pole of (z-a)^m / (z-b)^k, computed by cancelling.
// Rational, so the order is exact. seed 1 with the default params is the
// instance stored in data/practice/ch7.json.

function lcg(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickInt(rng, lo, hi) {
  const a = Math.round(Number(lo));
  const b = Math.round(Number(hi));
  return a + Math.floor(rng() * (Math.max(0, b - a) + 1));
}

function lin(root) {
  if (root < 0) return `z+${-root}`;
  if (root === 0) return 'z';
  return `z-${root}`;
}

export function generate(seed, params) {
  const rng = lcg(seed);
  const range = params && Array.isArray(params.a) ? params.a : [-3, 3];
  const orderRange = params && Array.isArray(params.b) ? params.b : [1, 3];
  const zeroAt = pickInt(rng, range[0], range[1]);
  let poleAt = pickInt(rng, range[0], range[1]);
  if (poleAt === zeroAt) poleAt = zeroAt === range[1] ? zeroAt - 1 : zeroAt + 1;
  const zeroOrder = pickInt(rng, orderRange[0], orderRange[1]);
  const poleOrder = pickInt(rng, orderRange[0], orderRange[1]);
  const phrase = `pole of order ${poleOrder}`;
  return {
    seed: Number(seed) || 1,
    zeroAt,
    poleAt,
    zeroOrder,
    poleOrder,
    kind: 'pole',
    order: poleOrder,
    prompt: `Classify the singularity of $f(z)=(${lin(zeroAt)})^{${zeroOrder}}/(${lin(poleAt)})^{${poleOrder}}$ at $z=${poleAt}$.`,
    steps: [
      {
        text: 'The denominator vanishes there and the numerator does not, so the singularity is a ___',
        answer: phrase,
        accept: [`a ${phrase}`, `order ${poleOrder} pole`, `${poleOrder}`],
        why: `Theorem 7.12, page 235. $f=h(z)/(${lin(poleAt)})^{${poleOrder}}$ with $h(${poleAt})\\neq 0$.`,
      },
    ],
    memory: 'A pole of order $k$ is $h(z)/(z-\\alpha)^k$ with $h$ analytic and $h(\\alpha)\\neq 0$.',
  };
}
