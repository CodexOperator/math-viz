// Deterministic circle integrals. The practice engine imports generate(params, seed).
import { generateCircle } from '../../book/ch6-math.js';

export function generate(params, seed) {
  return generateCircle(params || {}, seed);
}
