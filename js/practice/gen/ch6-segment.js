// Deterministic segment integrals. The practice engine imports generate(params, seed).
import { generateSegment } from '../../book/ch6-math.js';

export function generate(params, seed) {
  return generateSegment(params || {}, seed);
}
