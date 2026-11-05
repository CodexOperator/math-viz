// Deterministic circle integrals. The practice engine calls generate(seed, params).
import { generateCircle } from '../../book/ch6-math.js';

export const id = 'ch6-circle';

export function generate(seed, params) {
  return generateCircle(seed, params || {});
}
