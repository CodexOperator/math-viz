// The book roadmap, Chapter 4, and the §5.1 walk under the exponential.
// A section is finished when its exercises are ticked. The tick is the same
// memory as the Test 2 index. Hints stay closed. No answer key on these cards.

import { BOOK, sectionHref } from '../data/book.js';
import { shellChapters, CHAPTER_4, CHAPTER_5, bookChapter, chapter4ExerciseIds, chapter5ExerciseIds, CHAPTER_PICTURE, pictureHref, OPEN_CHAPTERS } from '../data/book-path.js';
import { test2ProblemById } from '../data/test2-problems.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { continueSentence, continueTarget, walkSections } from '../book/continue.js';
import { chapterHash } from '../book/route.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountExpPicture } from './exp-picture.js';
import { mountPrep } from '../practice/mount.js';
import { prepHash } from '../book/route.js';

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function tickOwned(id) {
  return !!test2ProblemById(id) || chapter5ExerciseIds().includes(id);
}

function ticksOf(store) {
  return loadSharedTicks(store, tickOwned, chapter4ExerciseIds());
}

function upLink(id, href, label) {
  return h('a', { class: 'station-link', id, href, 'data-dir': 'prev' }, label);
}

function exerciseHint(section, problem) {
  if (problem && problem.hint) return problem.hint;
  const local = section.hints && section.hints[problem.id];
  return local || '';
}

function nextSentence(ticks) {
  return continueSentence(ticks);
}

export function mount(section, ctx) {
  const spec = ctx.book;
  if (!spec || spec.kind === 'roadmap') return mountRoadmap(section, ctx, spec);
  if (spec.kind === 'prep') return mountPrep(section, ctx, spec);
  if (spec.chapter === 4) return mountChapter4(section, ctx, spec.focus);
  if (spec.chapter === 5) return mountChapter5(section, ctx, spec.focus);
  return mountRoadmap(section, ctx, { kind: 'roadmap', chapter: null, focus: null });
}

function sectionList(ch) {
  if (ch.n === 4) return CHAPTER_4.sections;
  if (ch.n === 5) return bookChapter(5).sections;
  return ch.sections || [];
}

export function mountBookHome(el, ctx, spec) {
  const store = ctx.store;
  const ticks = ticksOf(store);
  const target = continueTarget(ticks);
  const tally = target.tally;
  const status = h('p', { class: 'book-status', id: 'book-status' });
  status.textContent = nextSentence(ticks);
  const walk = h('a', { class: 'btn btn-primary', id: 'book-continue', href: target.href }, 'Continue');
  const list = h('ol', { class: 'book-path', id: 'book-path' });

  for (const ch of shellChapters()) {
    const open = OPEN_CHAPTERS.includes(ch.n);
    const href = `#chapter-${ch.n}`;
    const expanded = walkSections().some((s) => s.chapter === ch.n);
    const head = expanded
      ? h('a', { class: 'book-row', id: `book-open-${ch.n}`, href },
        h('p', { class: 'book-flag', id: `book-flag-${ch.n}` }, 'Later'),
        h('h2', { id: `book-title-${ch.n}` },
          h('span', { class: 'book-num' }, String(ch.n)),
          document.createTextNode(` ${ch.title}`)),
        h('p', { class: 'book-page', id: `book-page-${ch.n}` }, `Page ${ch.page}`))
      : h('a', { class: 'book-row book-row-closed', id: `book-open-${ch.n}`, href },
        h('span', { class: 'book-num' }, String(ch.n)),
        h('span', { class: 'book-closed-title', id: `book-title-${ch.n}` }, ch.title),
        h('span', { class: 'book-flag', id: `book-flag-${ch.n}` }, open ? 'Open' : 'Closed'));
    const kids = [head];
    if (expanded) {
      const sections = h('ol', { class: 'book-sections', id: `book-sections-${ch.n}` });
      for (const s of sectionList(ch)) {
        const live = walkSections().some((w) => w.id === s.id);
        if (!live) {
          sections.append(h('li', { 'data-section': s.id, id: `book-section-${slug(s.id)}`, 'data-state': 'later' },
            h('span', null, `${s.id} ${s.title}`),
            h('span', { class: 'book-flag' }, 'Later')));
          continue;
        }
        sections.append(h('li', { 'data-section': s.id, id: `book-section-${slug(s.id)}` },
          h('a', { class: 'book-section-link', href: `#${chapterHash(ch.n, s.id)}` },
            h('span', null, `${s.id} ${s.title}`),
            h('span', { class: 'book-section-page' }, `p. ${s.page}`),
            h('span', { class: 'book-section-mark' }, ''))));
      }
      kids.push(sections);
    }
    list.append(h('li', {
      class: 'book-node', id: `book-node-${ch.n}`, 'data-chapter': String(ch.n), 'data-state': 'later',
    }, ...kids));
  }

  for (const node of list.querySelectorAll('.book-node')) {
    const n = Number(node.getAttribute('data-chapter'));
    const mine = walkSections().filter((s) => s.chapter === n);
    let state = 'later';
    let flag = OPEN_CHAPTERS.includes(n) ? 'Open' : 'Closed';
    if (mine.length) {
      const done = mine.every((s) => sectionFinished(s, ticks));
      const current = mine.some((s) => s.id === tally.nextId);
      if (done) { state = 'done'; flag = 'Done'; }
      else if (current) { state = 'next'; flag = 'Next'; }
      else { state = 'open'; flag = 'Open'; }
    }
    node.setAttribute('data-state', state);
    const flagEl = node.querySelector('.book-flag');
    if (flagEl) flagEl.textContent = flag;
  }
  for (const row of list.querySelectorAll('[data-section]')) {
    const id = row.getAttribute('data-section');
    const section = walkSections().find((s) => s.id === id);
    if (!section) continue;
    const finished = sectionFinished(section, ticks);
    row.setAttribute('data-state', finished ? 'done' : (tally.nextId === id ? 'next' : 'ahead'));
    const mark = row.querySelector('.book-section-mark');
    if (mark) mark.textContent = finished ? 'Done' : (tally.nextId === id ? 'Next' : '');
  }

  el.append(
    h('header', { class: 'station-header' },
      h('h1', { id: 'book-title' }, 'The Book'),
      h('p', { class: 'where-line', id: 'where-line' }, 'The book · Chapters 1–7'),
      h('p', { class: 'station-lede', id: 'book-lede' }, 'Chapters 1 to 7, in the order Howell and Mathews print them.'),
      sourceTag({ pin: '202 Updated Edition, table of contents, pages i–ii', href: BOOK.html })),
    h('div', { class: 'book-next', id: 'book-next' }, status, walk),
    list);

  const focus = spec && spec.chapter;
  if (focus && walkSections().some((s) => s.chapter === focus)) {
    const node = el.querySelector(`#book-node-${focus}`);
    if (node) node.scrollIntoView({ block: 'start' });
  }

  return function unmount() {};
}

function mountRoadmap(el, ctx, spec) {
  return mountBookHome(el, ctx, spec);
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
    status.textContent = nextSentence(ticks);
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
      h('div', { class: 'section-head', id: `${scope}-head` },
        h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
        h('h2', { id: `${scope}-title` }, section.title),
        h('a', { class: 'btn', href: `#${prepHash(4, section.id)}`, id: `${scope}-practice` }, `Test prep · ${section.id}`)),
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
      upLink('chapter-back', '#book', 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 4. Sequences, Series, and Fractals'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Chapter 4 · Sequences, Series, and Fractals'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Four sections. Tick an exercise when you have worked it. The hint stays closed until you ask.'),
      sourceTag({ pin: CHAPTER_4.pin, href: CHAPTER_4.href })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    upLink('chapter-back-end', '#book', 'The Book'));

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

function mountChapter5(el, ctx, focus) {
  const store = ctx.store;
  const owned = new Set([...chapter4ExerciseIds(), ...chapter5ExerciseIds()]);
  let ticks = loadSharedTicks(store, (id) => owned.has(id), chapter4ExerciseIds());
  const section = CHAPTER_5.sections[0];
  const picture = h('section', { class: 'exp-picture', id: 'chapter-exp', 'aria-labelledby': 'chapter-title' });
  const stop = mountExpPicture(picture, focus === '5.1.1' ? 'zero' : undefined);

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const modulus = blankLine('chapter-blank-modulus', 'The modulus is ');
  const cards = {};
  const exerciseHost = h('div', { class: 'chapter-exercises', id: 'chapter-section-5-1-exercises' });
  for (const id of section.exercises) {
    cards[id] = exerciseCard5(CHAPTER_5.cards[id], id, () => {
      if (cards[id]._tick.disabled) return;
      ticks = toggleTick(ticks, id);
      saveSharedTicks(store, ticks);
      paint();
    });
    exerciseHost.append(cards[id]);
  }

  const scope = 'chapter-section-5-1';
  const idea = h('p', { class: 'section-idea', id: `${scope}-idea` });
  appendRich(idea, section.idea);
  const read = h('ul', { class: 'book-read', id: `${scope}-read` });
  section.read.forEach((item, i) => {
    read.append(h('li', null, h('a', {
      href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
    }, item.pin)));
  });
  const walk = h('section', {
    class: 'section-node exp-walk', id: scope, 'data-section': '5.1',
  },
    h('div', { class: 'section-head', id: `${scope}-head` },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, '5.1'),
      h('h2', { id: `${scope}-title` }, section.title),
      h('a', { class: 'btn', href: `#${prepHash(5, '5.1')}`, id: 'chapter-section-5-1-practice' }, 'Test prep · 5.1')),
    h('p', { class: 'book-page' }, `Page ${section.page}`),
    idea,
    read,
    h('ul', { class: 'exp-blanks', id: 'chapter-blanks' },
      h('li', null, modulus)),
    exerciseHost);

  const later = h('ol', { class: 'book-path exp-later', id: 'chapter-later-sections' });
  for (const s of bookChapter(5).sections) {
    if (s.id === '5.1') continue;
    later.append(h('li', {
      class: 'book-node', id: `chapter-later-${slug(s.id)}`, 'data-state': 'later',
    },
      h('p', { class: 'book-flag' }, 'Later'),
      h('h2', null, `${s.id} ${s.title}`),
      h('p', { class: 'book-page' }, `Page ${s.page}`)));
  }

  function paintStatus() {
    const t = chapterTally(CHAPTER_5.sections, ticks);
    if (t.complete) {
      status.textContent = `Done. ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
    } else {
      const card = CHAPTER_5.cards[t.nextExercise];
      const name = card ? card.pin : t.nextExercise;
      status.textContent = `Next is ${name}. ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
    }
    walk.setAttribute('data-state', sectionFinished(section, ticks) ? 'done' : 'next');
  }

  function paintBlanks() {
    const stage = picture.querySelector('#chapter-exp-stage');
    const x = Number(stage && stage.dataset.probeRe);
    const y = Number(stage && stage.dataset.probeIm);
    const onCircle = Number.isFinite(x) && Math.abs(x) <= 1e-9;
    const nearRight = onCircle && Number.isFinite(y) && Math.abs(y) <= 0.35;
    const nearLeft = onCircle && Number.isFinite(y)
      && Math.min(Math.abs(y - Math.PI), Math.abs(y + Math.PI)) <= 0.35;
    const grown = Number.isFinite(x) && x > 0.06;
    const shrunk = Number.isFinite(x) && x < -0.06;
    fillGap(modulus, grown ? '$e^{x}$, larger than 1' : (shrunk ? '$e^{x}$, smaller than 1' : ''));
    fillGap(cards['5.1.1']._blank, nearRight ? CHAPTER_5.cards['5.1.1'].answer : '');
    fillGap(cards['5.1.2']._blank, nearLeft ? CHAPTER_5.cards['5.1.2'].answer : '');
    setTick(cards['5.1.1'], ticks['5.1.1'] === true, nearRight);
    setTick(cards['5.1.2'], ticks['5.1.2'] === true, nearLeft);
    paintStatus();
  }

  function paint() {
    paintBlanks();
  }

  const stage = () => picture.querySelector('#chapter-exp-stage');
  const onProbe = () => paintBlanks();
  const observed = stage();
  const observer = new MutationObserver(onProbe);
  if (observed) observer.observe(observed, { attributes: true, attributeFilter: ['data-probe-re', 'data-probe-im'] });

  el.append(
    h('header', { class: 'station-header' },
      upLink('chapter-back', '#book', 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 5. The exponential'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Chapter 5 · The exponential')),
    picture,
    h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Section 5.1. A blank fills when the picture makes it true. The hint stays closed until you ask.'),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status),
    walk,
    later,
    sourceTag({ pin: 'Chapter 5, Elementary Functions, page 130', href: sectionHref('sec_exponential-function.html') }),
    upLink('chapter-back-end', '#book', 'The Book'));

  paint();

  const targetId = focus === '5.1'
    ? scope
    : (CHAPTER_5.cards[focus] ? `chapter-card-${slug(focus)}` : (focus ? `chapter-later-${slug(focus)}` : ''));
  const target = targetId ? el.querySelector(`#${targetId}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    observer.disconnect();
    stop();
  };
}

function blankLine(id, prompt) {
  const gap = h('span', { class: 'exp-blank-gap' });
  gap.setAttribute('aria-label', 'waiting');
  const line = h('p', { class: 'exp-blank', id, 'data-right': 'false' });
  appendRich(line, prompt);
  line.append(gap);
  line._gap = gap;
  return line;
}

function fillGap(line, text) {
  const gap = line._gap;
  const key = text || '';
  if (gap.dataset.filled === key) return;
  gap.dataset.filled = key;
  gap.replaceChildren();
  if (key) appendRich(gap, key);
  if (key) gap.removeAttribute('aria-label');
  else gap.setAttribute('aria-label', 'waiting');
  line.dataset.right = key ? 'true' : 'false';
}

function setTick(card, on, ready) {
  const tick = card._tick;
  const last = card._last;
  last.dataset.right = ready ? 'true' : 'false';
  tick.disabled = !on && !ready;
  tick.setAttribute('aria-pressed', String(on));
  tick.textContent = on ? 'Ticked' : 'Tick';
}

function exerciseCard5(card, id, onTick) {
  const idSlug = slug(id);
  const cardId = `chapter-card-${idSlug}`;
  const body = h('div', { id: `${cardId}-statement` });
  appendRich(body, card.statement);
  const hint = h('p', { class: 'hint-note', id: `chapter-hint-${idSlug}`, hidden: '' });
  appendRich(hint, card.hint);
  const show = h('button', {
    type: 'button', class: 'btn', id: `chapter-show-${idSlug}`,
    'aria-expanded': 'false', 'aria-controls': `chapter-hint-${idSlug}`,
  }, 'Show the hint');
  show.addEventListener('click', () => {
    hint.hidden = false;
    show.hidden = true;
    show.setAttribute('aria-expanded', 'true');
  });
  const blank = blankLine(`chapter-blank-${idSlug}`, card.blank);
  const tick = h('button', {
    type: 'button', class: 'btn', id: `chapter-tick-${idSlug}`, 'aria-pressed': 'false', disabled: '',
  }, 'Tick');
  tick.addEventListener('click', onTick);
  const last = h('div', { class: 'exp-blank', id: `chapter-tick-blank-${idSlug}`, 'data-right': 'false' }, tick);
  const node = h('article', {
    class: 'card problem-card chapter-card', id: cardId, 'data-problem': id,
  },
    h('h3', { id: `chapter-title-${idSlug}` }, card.pin),
    sourceTag({ pin: card.pin, href: card.href }),
    body,
    blank,
    last,
    show,
    hint);
  node._tick = tick;
  node._blank = blank;
  node._last = last;
  return node;
}
