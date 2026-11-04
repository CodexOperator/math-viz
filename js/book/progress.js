// Progress on the book path. localStorage key, without the mv: prefix the store adds.
// A section is finished when it is marked and every exercise on it is ticked.
// The book reads this and does not write it.

export const BOOK_PROGRESS_KEY = 'book.progress';

export function blankBookProgress() {
  return { sections: {}, exercises: {} };
}

export function sanitizeBookProgress(raw, sections) {
  const sectionIds = new Set(sections.map((s) => s.id));
  const exerciseIds = new Set(sections.flatMap((s) => s.exercises));
  const out = blankBookProgress();
  if (!raw || typeof raw !== 'object') return out;
  const sectionsRaw = raw.sections && typeof raw.sections === 'object' ? raw.sections : {};
  const exercisesRaw = raw.exercises && typeof raw.exercises === 'object' ? raw.exercises : {};
  for (const id of Object.keys(sectionsRaw)) {
    if (sectionsRaw[id] === true && sectionIds.has(id)) out.sections[id] = true;
  }
  for (const id of Object.keys(exercisesRaw)) {
    if (exercisesRaw[id] === true && exerciseIds.has(id)) out.exercises[id] = true;
  }
  return out;
}

export function toggleBookFlag(progress, bucket, id) {
  const next = {
    sections: { ...progress.sections },
    exercises: { ...progress.exercises },
  };
  if (next[bucket][id] === true) delete next[bucket][id];
  else next[bucket][id] = true;
  return next;
}

export function sectionFinished(section, progress) {
  if (!section || progress.sections[section.id] !== true) return false;
  return section.exercises.every((id) => progress.exercises[id] === true);
}

// Next is the first section that is not finished, in book order.
export function chapterTally(sections, progress) {
  const list = sections || [];
  const exerciseIds = list.flatMap((s) => s.exercises);
  const sectionsMarked = list.filter((s) => progress.sections[s.id] === true).length;
  const sectionsFinished = list.filter((s) => sectionFinished(s, progress)).length;
  const exercisesTicked = exerciseIds.filter((id) => progress.exercises[id] === true).length;
  const next = list.find((s) => !sectionFinished(s, progress)) || null;
  return {
    sectionsMarked,
    sectionsFinished,
    sectionTotal: list.length,
    exercisesTicked,
    exerciseTotal: exerciseIds.length,
    complete: list.length > 0 && !next,
    nextId: next ? next.id : null,
  };
}
