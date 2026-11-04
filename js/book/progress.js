// One score for the Chapter 4 walk and the Test 2 index.
// Ticks live under `progress.test2`. A section is finished when its exercises are ticked.
// There is no section mark. `book.progress` is read once and folded in, then marked migrated.

export const TICK_KEY = 'progress.test2';
export const BOOK_PROGRESS_KEY = 'book.progress';

export function sanitizeTicks(raw, isValid) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of Object.keys(raw)) {
    if (raw[id] === true && isValid(id)) out[id] = true;
  }
  return out;
}

export function foldLegacyExercises(ticks, legacy, exerciseIds) {
  const next = { ...ticks };
  const allowed = new Set(exerciseIds);
  const raw = legacy && legacy.exercises && typeof legacy.exercises === 'object' ? legacy.exercises : null;
  if (!raw || legacy.migrated === true) return next;
  for (const id of Object.keys(raw)) {
    if (raw[id] === true && allowed.has(id)) next[id] = true;
  }
  return next;
}

// Read both memories, keep one, and remember that the old chapter marks were folded.
export function loadSharedTicks(store, isValid, exerciseIds) {
  let raw = {};
  try { raw = store.get(TICK_KEY, {}) || {}; } catch { raw = {}; }
  let legacy = null;
  try { legacy = store.get(BOOK_PROGRESS_KEY, null); } catch { legacy = null; }
  const ticks = sanitizeTicks(raw, isValid);
  if (!legacy || legacy.migrated === true) return ticks;
  const merged = foldLegacyExercises(ticks, legacy, exerciseIds);
  try {
    store.set(TICK_KEY, merged);
    store.set(BOOK_PROGRESS_KEY, { migrated: true });
  } catch { /* this visit still shows the merged ticks */ }
  return merged;
}

export function saveSharedTicks(store, ticks) {
  try { store.set(TICK_KEY, ticks); } catch { /* the tick still shows for this visit */ }
}

export function toggleTick(ticks, id) {
  const next = { ...ticks };
  if (next[id] === true) delete next[id];
  else next[id] = true;
  return next;
}

export function sectionFinished(section, ticks) {
  if (!section) return false;
  return section.exercises.every((id) => ticks[id] === true);
}

// Next is the first unticked exercise, in book order.
export function chapterTally(sections, ticks) {
  const list = sections || [];
  const exerciseIds = list.flatMap((s) => s.exercises);
  const exercisesTicked = exerciseIds.filter((id) => ticks[id] === true).length;
  const sectionsFinished = list.filter((s) => sectionFinished(s, ticks)).length;
  let nextExercise = null;
  let nextId = null;
  for (const section of list) {
    const open = section.exercises.find((id) => ticks[id] !== true);
    if (open) {
      nextExercise = open;
      nextId = section.id;
      break;
    }
  }
  return {
    sectionsFinished,
    sectionTotal: list.length,
    exercisesTicked,
    exerciseTotal: exerciseIds.length,
    complete: list.length > 0 && !nextExercise,
    nextId,
    nextExercise,
  };
}
