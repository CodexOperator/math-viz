// The book roadmap and Chapter 4. Not a test map.
// A section is finished when its exercises are ticked. The tick is the same
// memory as the Test 2 index. Hints stay closed. No answer key on these cards.

import { stationById } from '../registry.js';
import { BOOK, sectionHref } from '../data/book.js';
import { BOOK_CHAPTERS, CHAPTER_4, chapter4ExerciseIds, CHAPTER_PICTURE, pictureHref } from '../data/book-path.js';
import { test2ProblemById } from '../data/test2-problems.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function ticksOf(store) {
  return loadSharedTicks(store, (id) => !!test2ProblemById(id), chapter4ExerciseIds());
}

function exerciseHint(section, problem) {
  if (problem && problem.hint) return problem.hint;
  const local = section.hints && section.hints[problem.id];
  return local || '';
}

function nextSentence(t) {
  if (t.complete) return `Done. ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
  const problem = test2ProblemById(t.nextExercise);
  const name = problem ? problem.pin : t.nextExercise;
  return `Next is ${name}. ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
}

export function mount(section, ctx) {
  const spec = ctx.book;
  if (!spec || spec.kind === 'roadmap') return mountRoadmap(section, ctx, spec);
  if (spec.chapter === 4) return mountChapter4(section, ctx, spec.focus);
  if (spec.chapter === 5) return mountChapter5(section);
  return mountRoadmap(section, ctx, { kind: 'roadmap', chapter: null, focus: null });
}

function mountRoadmap(el, ctx, spec) {
  const store = ctx.store;
  let ticks = ticksOf(store);
  const tally = () => chapterTally(CHAPTER_4.sections, ticks);

  const status = h('p', { class: 'book-status', id: 'book-status' });
  const walk = h('a', { class: 'btn btn-primary', id: 'book-walk', href: '#chapter-4' }, 'Walk Chapter 4');
  const list = h('ol', { class: 'book-path', id: 'book-path' });

  function paint() {
    const t = tally();
    if (t.complete) {
      status.textContent = `${nextSentence(t)} Chapter 5 is next, and its walk is not drawn yet.`;
      walk.textContent = 'Open Chapter 5';
      walk.setAttribute('href', '#chapter-5');
    } else {
      status.textContent = nextSentence(t);
      walk.textContent = 'Walk Chapter 4';
      walk.setAttribute('href', '#chapter-4');
    }
    for (const node of list.querySelectorAll('.book-node')) {
      const n = Number(node.getAttribute('data-chapter'));
      let state = 'later';
      if (n === 4) state = t.complete ? 'done' : 'next';
      else if (n === 5) state = 'open';
      node.setAttribute('data-state', state);
      const flag = node.querySelector('.book-flag');
      if (!flag) continue;
      if (n === 4) flag.textContent = t.complete ? 'Done' : 'Next';
      else if (n === 5) flag.textContent = 'Open';
      else flag.textContent = 'Later';
    }
    for (const row of list.querySelectorAll('[data-section]')) {
      const id = row.getAttribute('data-section');
      const section = CHAPTER_4.sections.find((s) => s.id === id);
      if (!section) continue;
      const finished = sectionFinished(section, ticks);
      row.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
      const mark = row.querySelector('.book-section-mark');
      if (mark) mark.textContent = finished ? 'Done' : (t.nextId === id ? 'Next' : '');
    }
  }

  for (const ch of BOOK_CHAPTERS) {
    const head = h('div', { class: 'book-node-head' },
      h('p', { class: 'book-flag', id: `book-flag-${ch.n}` }, 'Later'),
      h('h2', { id: `book-title-${ch.n}` },
        h('span', { class: 'book-num' }, String(ch.n)),
        document.createTextNode(` ${ch.title}`)),
      h('p', { class: 'book-page', id: `book-page-${ch.n}` }, `Page ${ch.page}`));
    const kids = [head];
    if (ch.n === 4) {
      const sections = h('ol', { class: 'book-sections', id: 'book-sections-4' });
      for (const s of ch.sections) {
        sections.append(h('li', { 'data-section': s.id, id: `book-section-${slug(s.id)}` },
          h('span', null, `${s.id} ${s.title}`),
          h('span', { class: 'book-section-page' }, `p. ${s.page}`),
          h('span', { class: 'book-section-mark' }, '')));
      }
      kids.push(sections);
    }
    if (!ch.open && ch.door) {
      const st = stationById(ch.door);
      if (st) {
        kids.push(h('p', { class: 'book-door', id: `book-door-${ch.n}` },
          'Already drawn: ',
          h('a', { href: `#${st.id}` }, st.title),
          '.'));
      }
    }
    if (ch.n === 5) {
      kids.push(h('p', { class: 'book-node-note', id: 'book-note-5' }, 'Open. The walk through these sections is not drawn yet.'));
    }
    list.append(h('li', { class: 'book-node', id: `book-node-${ch.n}`, 'data-chapter': String(ch.n), 'data-state': 'later' }, ...kids));
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('h1', { id: 'book-title' }, 'The Book'),
      h('p', { class: 'station-lede', id: 'book-lede' }, 'Eleven chapters, in the order Howell and Mathews print them.'),
      sourceTag({ pin: '202 Updated Edition, table of contents, pages i–ii', href: BOOK.html })),
    h('div', { class: 'book-next', id: 'book-next' }, status, walk),
    list);

  const focus = spec && spec.chapter;
  if (focus) {
    const node = el.querySelector(`#book-node-${focus}`);
    if (node) node.scrollIntoView({ block: 'start' });
  }

  return function unmount() {};
}

function mountChapter4(el, ctx, focus) {
  const store = ctx.store;
  let ticks = ticksOf(store);
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });
  const cards = [];

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');

  function tally() {
    return chapterTally(CHAPTER_4.sections, ticks);
  }

  function paint() {
    const t = tally();
    status.textContent = nextSentence(t);
    if (t.complete) {
      nextBtn.hidden = false;
      nextBtn.textContent = 'Back to the book';
      nextBtn.dataset.jump = 'book';
    } else if (t.nextId && t.nextId !== '4.1') {
      nextBtn.hidden = false;
      nextBtn.textContent = `Go to ${t.nextId}`;
      nextBtn.dataset.jump = t.nextId;
    } else {
      nextBtn.hidden = true;
      nextBtn.dataset.jump = '';
    }
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const section = CHAPTER_4.sections.find((s) => s.id === id);
      const finished = sectionFinished(section, ticks);
      node.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
    }
    for (const card of cards) {
      const id = card.getAttribute('data-problem');
      const on = ticks[id] === true;
      card._tick.setAttribute('aria-pressed', String(on));
      card._tick.textContent = on ? 'Ticked' : 'Tick';
    }
  }

  nextBtn.addEventListener('click', () => {
    const jump = nextBtn.dataset.jump;
    if (jump === 'book') {
      ctx.navigate('book');
      return;
    }
    const node = el.querySelector(`#chapter-section-${slug(jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const section of CHAPTER_4.sections) {
    const scope = `chapter-section-${slug(section.id)}`;
    const idea = h('p', { class: 'section-idea', id: `${scope}-idea` });
    appendRich(idea, section.idea);
    const exerciseHost = h('div', { class: 'chapter-exercises', id: `${scope}-exercises` });
    for (const exId of section.exercises) {
      const problem = test2ProblemById(exId);
      if (!problem) continue;
      exerciseHost.append(exerciseCard(section, problem, () => {
        ticks = toggleTick(ticks, problem.id);
        saveSharedTicks(store, ticks);
        paint();
      }));
    }
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    section.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      idea,
      read,
      exerciseHost));
  }

  function exerciseCard(section, problem, onTick) {
    const idSlug = slug(problem.id);
    const cardId = `chapter-card-${idSlug}`;
    const body = h('div', { id: `${cardId}-statement` });
    appendRich(body, problem.statement);
    const hintText = exerciseHint(section, problem);
    const hint = h('p', { class: 'hint-note', id: `chapter-hint-${idSlug}`, hidden: '' });
    if (hintText) appendRich(hint, hintText);
    const show = h('button', {
      type: 'button', class: 'btn', id: `chapter-show-${idSlug}`,
      'aria-expanded': 'false', 'aria-controls': `chapter-hint-${idSlug}`,
    }, 'Show the hint');
    show.addEventListener('click', () => {
      hint.hidden = false;
      show.hidden = true;
      show.setAttribute('aria-expanded', 'true');
    });
    const tick = h('button', { type: 'button', class: 'btn', id: `chapter-tick-${idSlug}`, 'aria-pressed': 'false' }, 'Tick');
    tick.addEventListener('click', onTick);
    const pic = CHAPTER_PICTURE[problem.id];
    const kids = [
      h('h3', { id: `chapter-title-${idSlug}` }, problem.pin),
      sourceTag({ pin: problem.pin, href: problem.href }),
      body,
    ];
    if (pic) {
      kids.push(h('p', null, h('a', {
        class: 'chip', href: pictureHref(problem.id), id: `${cardId}-station`,
      }, pic.label)));
    }
    if (hintText) kids.push(show, hint);
    kids.push(h('div', { class: 'problem-actions' }, tick));
    const card = h('article', {
      class: 'card problem-card chapter-card', id: cardId, 'data-problem': problem.id,
      'data-homework': problem.homework || null,
    }, ...kids);
    card._tick = tick;
    cards.push(card);
    return card;
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 4. Sequences, Series, and Fractals'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Four sections. Tick an exercise when you have worked it. The hint stays closed until you ask.'),
      sourceTag({ pin: CHAPTER_4.pin, href: CHAPTER_4.href })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  if (focus) {
    const card = cards.find((c) => c.getAttribute('data-problem') === focus);
    const sectionNode = el.querySelector(`#chapter-section-${slug(focus)}`);
    const target = card || sectionNode;
    if (target) {
      target.classList.add('is-target');
      target.scrollIntoView({ block: 'start' });
    }
  }

  return function unmount() {};
}

function mountChapter5(el) {
  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 5. Elementary Functions'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'The exponential, the logarithm, and the powers are not drawn here yet.'),
      sourceTag({ pin: 'Chapter 5, Elementary Functions, page 130', href: sectionHref('sec_exponential-function.html') })),
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));
  return function unmount() {};
}
