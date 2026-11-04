// The generator registry. A practice item names one of these ids.
// Every generator is generate(seed, params). The seed is first.

import * as geometricSeries from './geometric-series.js';
import * as expModArg from './exp-mod-arg.js';

export const GENERATORS = Object.freeze({
  [geometricSeries.id]: geometricSeries,
  [expModArg.id]: expModArg,
});

export function generateItem(template, seed, params) {
  const gen = GENERATORS[template];
  if (!gen) throw new Error(`Unknown practice generator: ${template}`);
  return gen.generate(seed, params || {});
}
