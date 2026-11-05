// Practice misses. Stored at mv:practice.misses.
// Shape: { v: 1, steps: { itemId: { step: { misses, updated } } } }.
// Sign-in merges two books by the larger count, then the later stamp.
// A wrong answer on Test prep writes one step. The phone keeps the book
// if the student never signs in.

export const MISSES_KEY = 'practice.misses';

export function emptyMisses() {
  return { v: 1, steps: {} };
}

export function loadMisses(store) {
  const raw = store && store.get ? store.get(MISSES_KEY, null) : null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 1 || !raw.steps || typeof raw.steps !== 'object' || Array.isArray(raw.steps)) {
    return emptyMisses();
  }
  return { v: 1, steps: raw.steps };
}

export function recordMiss(store, itemId, step, now = Date.now()) {
  const id = String(itemId || '');
  if (!id) return loadMisses(store);
  const book = loadMisses(store);
  const item = { ...(book.steps[id] && typeof book.steps[id] === 'object' ? book.steps[id] : {}) };
  const key = String(step);
  const prev = item[key] && typeof item[key] === 'object' ? item[key] : { misses: 0, updated: 0 };
  item[key] = { misses: (Number(prev.misses) || 0) + 1, updated: now };
  const next = { v: 1, steps: { ...book.steps, [id]: item } };
  if (store && store.set) store.set(MISSES_KEY, next);
  return next;
}
