// The book footer, read from the same ticks as the roadmap.

import { CHAPTER_3, CHAPTER_4, bookPathNote, chapter3StageIds, chapter4ExerciseIds } from '../data/book-path.js';
import { chapterTally, loadSharedTicks } from './progress.js';

export function bookFooterText(store) {
  const stages = new Set(chapter3StageIds());
  const exerciseIds = chapter4ExerciseIds();
  const exercises = new Set(exerciseIds);
  const ticks = loadSharedTicks(store, (id) => stages.has(id) || exercises.has(id), exerciseIds);
  const t3 = chapterTally(CHAPTER_3.sections, ticks);
  const t4 = chapterTally(CHAPTER_4.sections, ticks);
  return bookPathNote(t3.complete, t4.complete);
}

export function writeBookFooter(store) {
  const note = document.getElementById('site-footer-note');
  if (!note || document.body.dataset.book !== 'true') return;
  note.textContent = bookFooterText(store);
}
