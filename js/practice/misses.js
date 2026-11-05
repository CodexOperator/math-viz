// A short record of which practice steps were missed.
// Stored at localStorage key mv:practice.misses (the store prefix is mv:).
// A future signed-in sync merges two books with mergeMisses: the step with
// more misses wins, and a tie keeps the later updated stamp.
// The shape matches the Leitner deck: one versioned object, keyed by id.

export const MISSES_KEY = 'practice.misses';

export function emptyMisses() {
  return { v: 1, steps: {} };
}

export function loadMisses(store) {
  const raw = store && store.get ? store.get(MISSES_KEY, null) : null;
  if (!raw || raw.v !== 1 || !raw.steps || typeof raw.steps !== 'object') return emptyMisses();
  return { v: 1, steps: { ...raw.steps } };
}

export function saveMisses(store, book) {
  if (store && store.set) store.set(MISSES_KEY, book);
}

export function noteMiss(book, id, step, nowMs = Date.now()) {
  const key = String(step);
  const item = (book && book.steps && book.steps[id]) || {};
  const prev = item[key] || { misses: 0, updated: 0 };
  return {
    v: 1,
    steps: {
      ...(book && book.steps),
      [id]: {
        ...item,
        [key]: { misses: (prev.misses || 0) + 1, updated: nowMs },
      },
    },
  };
}

export function mergeMisses(a, b) {
  const steps = { ...(a && a.steps) };
  const incoming = (b && b.steps) || {};
  for (const id of Object.keys(incoming)) {
    const have = { ...(steps[id] || {}) };
    const recs = incoming[id] || {};
    for (const key of Object.keys(recs)) {
      const rec = recs[key];
      const prev = have[key];
      if (!prev) {
        have[key] = rec;
        continue;
      }
      const more = (rec.misses || 0) - (prev.misses || 0);
      if (more > 0 || (more === 0 && (rec.updated || 0) > (prev.updated || 0))) have[key] = rec;
    }
    steps[id] = have;
  }
  return { v: 1, steps };
}
