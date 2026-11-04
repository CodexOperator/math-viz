// Where Continue goes, and the count on the status card.
// The walk is every exercise the open chapters actually have, in book order.
// Ticks stay in progress.test2. This file only reads them.

import { CHAPTER_4, CHAPTER_5, shellChapters } from '../data/book-path.js';
import { chapterTally } from './progress.js';
import { chapterHash } from './route.js';
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
  const section = walkSections().find((s) => s.exercises.includes(tally.nextExercise));
  const chapter = section ? section.chapter : 1;
  const href = section ? `#${chapterHash(chapter, tally.nextExercise)}` : '#chapter-1';
  return { tally, href, label: 'Continue' };
}

export function continueSentence(ticks) {
  const { tally } = continueTarget(ticks);
  const name = tally.nextExercise ? exerciseLabel(tally.nextExercise) : '';
  if (tally.complete) return `Done. ${tally.exercisesTicked} of ${tally.exerciseTotal} exercises.`;
  return `Next is ${name}. ${tally.exercisesTicked} of ${tally.exerciseTotal} exercises.`;
}
