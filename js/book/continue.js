// Where Continue goes, and the count on the status card.
// The walk is every exercise the open chapters actually have, in book order.
// Ticks stay in progress.test2. This file only reads them.

import { CHAPTER_4, CHAPTER_5, activeWalk, shellChapters } from '../data/book-path.js';
import { chapterTally } from './progress.js';
import { test2ProblemById } from '../data/test2-problems.js';

export function walkSections() {
  const out = [];
  for (const ch of shellChapters()) {
    if (ch.n === 4) for (const s of CHAPTER_4.sections) out.push({ ...s, chapter: 4 });
    if (ch.n === 5) for (const s of CHAPTER_5.sections) out.push({ ...s, chapter: 5 });
  }
  return out;
}

export function exerciseLabel(id) {
  const problem = test2ProblemById(id);
  if (problem) return problem.pin;
  const card = CHAPTER_5.cards[id];
  if (card) return card.pin;
  return id;
}

export function continueTarget(ticks) {
  const tally = chapterTally(walkSections(), ticks);
  if (!tally.nextExercise) {
    return { tally, href: '#test-prep', label: 'Continue' };
  }
  const walked = activeWalk(ticks);
  return { tally, href: `#chapter-${walked.chapter}`, label: 'Continue' };
}

export function continueSentence(ticks) {
  const { tally } = continueTarget(ticks);
  const name = tally.nextExercise ? exerciseLabel(tally.nextExercise) : '';
  // The front door counts Chapters 4 and 5 together. A chapter page keeps its own count.
  if (tally.complete) return `Done. ${tally.exercisesTicked} of ${tally.exerciseTotal} exercises in Chapters 4 and 5.`;
  return `Next is ${name}, in Chapters 4 and 5. ${tally.exercisesTicked} of ${tally.exerciseTotal} exercises.`;
}
