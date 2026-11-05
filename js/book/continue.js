// Where Continue goes, and the count on the status card.
// The walk is every exercise the open chapters actually have, in book order.
// Ticks stay in progress.test2. This file only reads them.

import { CHAPTER_4, CHAPTER_5, shellChapters } from '../data/book-path.js';
import { CHAPTER_WALKS } from './registry.js';
import { chapterTally } from './progress.js';
import { test2ProblemById } from '../data/test2-problems.js';

// extra walks let a test, or a chapter loop, add sections without editing this file.
// CHAPTER_WALKS is the registry. Chapters 4 and 5 keep the sections already on the book path.
export function walkSections(extra = CHAPTER_WALKS) {
  const out = [];
  const seen = new Set();
  const push = (section, chapter) => {
    if (!section || seen.has(section.id)) return;
    seen.add(section.id);
    out.push({ ...section, chapter, exercises: section.exercises || [] });
  };
  for (const ch of shellChapters()) {
    if (ch.n === 4) for (const s of CHAPTER_4.sections) push(s, 4);
    if (ch.n === 5) for (const s of CHAPTER_5.sections) push(s, 5);
    const more = extra && extra[ch.n];
    if (more) for (const s of more) push(s, ch.n);
  }
  return out;
}

export function closedChapters() {
  const walking = new Set(walkSections().map((s) => s.chapter));
  return shellChapters().filter((ch) => !walking.has(ch.n)).map((ch) => ch.n);
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
  const href = `#chapter-${chapter}`;
  return { tally, href, label: 'Continue' };
}

function closedWords(nums) {
  if (!nums.length) return '';
  if (nums.length === 1) return `Chapter ${nums[0]} is closed. `;
  const body = nums.length === 2
    ? `${nums[0]} and ${nums[1]}`
    : `${nums.slice(0, -1).join(', ')}, and ${nums[nums.length - 1]}`;
  return `Chapters ${body} are closed. `;
}

export function continueSentence(ticks) {
  const { tally } = continueTarget(ticks);
  const closed = closedWords(closedChapters());
  if (tally.complete) return `${closed}Done. ${tally.exercisesTicked} of ${tally.exerciseTotal} exercises.`;
  const name = tally.nextExercise ? exerciseLabel(tally.nextExercise) : '';
  return `${closed}Next is ${name}. ${tally.exercisesTicked} of ${tally.exerciseTotal} exercises.`;
}
