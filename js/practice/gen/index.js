// The generator registry. A practice item names one of these ids.
// Every generator is generate(seed, params). The seed is first.

import * as geometricSeries from './geometric-series.js';
import * as expModArg from './exp-mod-arg.js';
import * as ch2Maps from './ch2-maps.js';

export const GENERATORS = Object.freeze({
  [geometricSeries.id]: geometricSeries,
  [expModArg.id]: expModArg,
  [ch2Maps.id]: ch2Maps,
});

// True when the function is written generate(seed, ...). A swapped
// generate(params, seed) is rejected. The name is what the chapter loops share.
export function seedFirst(fn) {
  if (typeof fn !== 'function') return false;
  const src = Function.prototype.toString.call(fn);
  const named = src.match(/^(?:function\s*)?[^(]*\(\s*([^,)]*)/);
  if (!named) return false;
  return named[1].trim() === 'seed';
}

export function generateItem(template, seed, params) {
  const gen = GENERATORS[template];
  if (!gen) throw new Error(`Unknown practice generator: ${template}`);
  return gen.generate(seed, params || {});
}
