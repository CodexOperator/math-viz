// Test 2 stop. The page lives in concept.js so the stations stay one module each.
import { mountConcept } from './concept.js';

export function mount(el, ctx) {
  return mountConcept(el, ctx);
}
