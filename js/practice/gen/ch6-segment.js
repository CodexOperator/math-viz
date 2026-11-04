// Deterministic segment integrals. The practice engine calls generate(seed, params).
import { generateSegment } from '../../book/ch6-math.js';

export const id = 'ch6-segment';

export function generate(seed, params) {
  return generateSegment(seed, params || {});
}
