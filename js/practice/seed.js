// Deterministic seeds for practice generators. Same seed, same stream.
// mulberry32 is a small integer hash; it is not a cryptographic generator.

export function mulberry32(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickInt(rand, lo, hi) {
  return lo + Math.floor(rand() * (hi - lo + 1));
}
