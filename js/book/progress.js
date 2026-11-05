// One score for the Chapter 4 walk, the Chapter 5 exercises, and the Test 2 index.
// Ticks live under `progress.test2`. A section is finished when its exercises are ticked.
// There is no section mark. `book.progress` is read once and folded in, then marked migrated.
// A page writes the exercises it owns. A tick it does not own stays in the same store.

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
  const kept = trueTicks(raw);
  for (const id of Object.keys(merged)) if (merged[id] === true) kept[id] = true;
  try {
    store.set(TICK_KEY, kept);
    store.set(BOOK_PROGRESS_KEY, { migrated: true });
  } catch { /* this visit still shows the merged ticks */ }
  return merged;
}

function trueTicks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of Object.keys(raw)) if (raw[id] === true) out[id] = true;
  return out;
}

// Keys this page sets to false are cleared. Keys it does not mention stay.
export function saveSharedTicks(store, ticks) {
  let prev = {};
  try { prev = store.get(TICK_KEY, {}) || {}; } catch { prev = {}; }
  const next = trueTicks(prev);
  const owned = ticks && typeof ticks === 'object' ? ticks : {};
  for (const id of Object.keys(owned)) {
    if (owned[id] === true) next[id] = true;
    else delete next[id];
  }
  try { store.set(TICK_KEY, next); } catch { /* the tick still shows for this visit */ }
}

export function toggleTick(ticks, id) {
  const next = { ...ticks };
  next[id] = next[id] === true ? false : true;
  return next;
}

export function sectionFinished(section, ticks) {
  if (!section || !Array.isArray(section.exercises) || section.exercises.length === 0) return false;
  return section.exercises.every((id) => ticks[id] === true);
}

// The stage you just finished: the previous section, and only while the next
// one has not been ticked yet. A finished chapter returns its last stage.
export function justFinished(sections, ticks) {
  const list = sections || [];
  const t = chapterTally(list, ticks);
  if (t.complete) return list[list.length - 1] || null;
  const idx = list.findIndex((s) => s.id === t.nextId);
  if (idx <= 0) return null;
  const prev = list[idx - 1];
  if (!sectionFinished(prev, ticks)) return null;
  const started = list[idx].exercises.some((id) => ticks[id] === true);
  if (started) return null;
  return prev;
}

// Pictures the chapter page has been opened on. A tick it does not own stays.
export const SEEN_KEY = 'book.seen';

export function loadSeen(store) {
  let raw = {};
  try { raw = store.get(SEEN_KEY, {}) || {}; } catch { raw = {}; }
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of Object.keys(raw)) if (raw[id] === true) out[id] = true;
  return out;
}

export function markSeen(store, ids) {
  const seen = loadSeen(store);
  const list = Array.isArray(ids) ? ids : [ids];
  let changed = false;
  for (const id of list) {
    if (!id || seen[id] === true) continue;
    seen[id] = true;
    changed = true;
  }
  if (changed) {
    try { store.set(SEEN_KEY, seen); } catch { /* this visit still counts */ }
  }
  return seen;
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
