// Deterministic Cauchy integral formula drills. The practice engine calls generate(seed, params).
import { generateCif } from '../../book/ch6-math.js';

export const id = 'ch6-cif';

export function generate(seed, params) {
  return generateCif(seed, params || {});
}
