// The book roadmap, Chapter 1, Chapter 4, and the §5.1 walk under the exponential.
// A section is finished when its exercises are ticked. The tick is the same
// memory as the Test 2 index. Hints stay closed. No answer key on these cards.

import { stationById } from '../registry.js';
import { BOOK, sectionHref } from '../data/book.js';
import { BOOK_CHAPTERS, CHAPTER_4, CHAPTER_5, bookChapter, bookWalkTarget, chapter4ExerciseIds, chapter5ExerciseIds, CHAPTER_PICTURE, pictureHref } from '../data/book-path.js';
import { CHAPTER_1, chapter1Walk } from '../data/chapter1.js';
import { mountChapter1 } from './chapter1.js';
import { test2ProblemById } from '../data/test2-problems.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountExpPicture } from './exp-picture.js';

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
  if (spec.chapter === 1) return mountChapter1(section, ctx, spec.focus);
  if (spec.chapter === 4) return mountChapter4(section, ctx, spec.focus);
  if (spec.chapter === 5) return mountChapter5(section, ctx, spec.focus);
  return mountRoadmap(section, ctx, { kind: 'roadmap', chapter: null, focus: null });
}

function mountRoadmap(el, ctx, spec) {
  const store = ctx.store;
  let ticks = ticksOf(store);
  const ch1Ids = new Set(chapter1Walk().flatMap((s) => s.exercises));
  const ch1Ticks = loadSharedTicks(store, (id) => ch1Ids.has(id), []);
  const tally = () => chapterTally(CHAPTER_4.sections, ticks);
  const ch1Tally = () => chapterTally(chapter1Walk(), ch1Ticks);

  const status = h('p', { class: 'book-status', id: 'book-status' });
  const walk = h('a', { class: 'btn btn-primary', id: 'book-walk', href: '#chapter-1' }, 'Walk Chapter 1');
  const list = h('ol', { class: 'book-path', id: 'book-path' });

  function paint() {
    const t = tally();
    const t1 = ch1Tally();
    const target = bookWalkTarget(t1, t);
    walk.textContent = target.label;
    walk.setAttribute('href', target.href);
    if (target.chapter === 1) {
      status.textContent = `Next is stage ${t1.nextId}. ${t1.sectionsFinished} of ${t1.sectionTotal} stages.`;
    } else if (t.complete) {
      status.textContent = `${nextSentence(t)} Chapter 5 is next.`;
    } else {
      status.textContent = nextSentence(t);
    }
    for (const node of list.querySelectorAll('.book-node')) {
      const n = Number(node.getAttribute('data-chapter'));
      let state = 'later';
      let word = 'Later';
      if (n === 1) {
        state = t1.complete ? 'open' : 'next';
        word = t1.complete ? 'Open' : '';
      } else if (n === 4) {
        state = t.complete ? 'done' : (target.chapter === 4 ? 'next' : 'open');
        word = t.complete ? 'Done' : (target.chapter === 4 ? '' : 'Open');
      } else if (n === 5) {
        state = 'open';
        word = 'Open';
      }
      node.setAttribute('data-state', state);
      const flag = node.querySelector('.book-flag');
      if (flag) flag.textContent = word;
    }
    for (const row of list.querySelectorAll('[data-section]')) {
      const id = row.getAttribute('data-section');
      const section1 = CHAPTER_1.sections.find((s) => s.id === id);
      if (section1) {
        const mark = row.querySelector('.book-section-mark');
        if (!section1.exercises.length) {
          row.setAttribute('data-state', 'later');
          if (mark) mark.textContent = 'Later';
          continue;
        }
        const here = ch1Tally();
        const finished = sectionFinished(section1, ch1Ticks);
        const walking = target.chapter === 1 && here.nextId === id;
        row.setAttribute('data-state', finished ? 'done' : (walking ? 'next' : 'ahead'));
        if (mark) mark.textContent = finished ? 'Done' : (walking ? 'Next' : '');
        continue;
      }
      const section = CHAPTER_4.sections.find((s) => s.id === id);
      if (!section) continue;
      const finished = sectionFinished(section, ticks);
      const walking = target.chapter === 4 && t.nextId === id;
      row.setAttribute('data-state', finished ? 'done' : (walking ? 'next' : 'ahead'));
      const mark = row.querySelector('.book-section-mark');
      if (mark) mark.textContent = finished ? 'Done' : (walking ? 'Next' : '');
    }
  }

  for (const ch of BOOK_CHAPTERS) {
    if (ch.n > 7) continue;
    const title = h('h2', { id: `book-title-${ch.n}` },
      h('span', { class: 'book-num' }, String(ch.n)),
      ch.open
        ? h('a', { href: `#chapter-${ch.n}` }, ` ${ch.title}`)
        : document.createTextNode(` ${ch.title}`));
    const head = h('div', { class: 'book-node-head' },
      h('p', { class: 'book-flag', id: `book-flag-${ch.n}` }, 'Later'),
      title,
      h('p', { class: 'book-page', id: `book-page-${ch.n}` }, `Page ${ch.page}`));
    const kids = [head];
    if (ch.n === 1 || ch.n === 4) {
      const sections = h('ol', { class: 'book-sections', id: `book-sections-${ch.n}` });
      for (const s of ch.sections) {
        sections.append(h('li', { 'data-section': s.id, id: `book-section-${slug(s.id)}` },
          h('a', {
            class: 'book-section-link',
            href: `#chapter-${ch.n}-${slug(s.id)}`,
            id: `book-section-link-${slug(s.id)}`,
          },
            h('span', { class: 'book-section-name' }, `${s.id} ${s.title}`),
            h('span', { class: 'book-section-page' }, `p. ${s.page}`),
            h('span', { class: 'book-section-mark' }, ''))));
      }
      kids.push(sections);
    }
    if (ch.door && !ch.open) {
      const st = stationById(ch.door);
      if (st) {
        kids.push(h('p', { class: 'book-door', id: `book-door-${ch.n}` },
          'Already drawn: ',
          h('a', { href: `#${st.id}` }, st.title),
          '.'));
      }
    }
    list.append(h('li', { class: 'book-node', id: `book-node-${ch.n}`, 'data-chapter': String(ch.n), 'data-state': 'later' }, ...kids));
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('h1', { id: 'book-title' }, 'The Book'),
      h('p', { class: 'station-lede', id: 'book-lede' }, 'Seven chapters, in the order Howell and Mathews print them.'),
      sourceTag({ pin: '202 Updated Edition, table of contents, pages i–ii', href: BOOK.html })),
    h('div', { class: 'book-next', id: 'book-next' }, status, walk),
    list);

  const pending = window.__mv && window.__mv.bookScroll;
  if (window.__mv) window.__mv.bookScroll = '';
  const focus = pending || (spec && spec.chapter);
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
    h('p', { class: 'book-flag', id: `${scope}-flag` }, '5.1'),
    h('h2', { id: `${scope}-title` }, section.title),
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
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 5. The exponential')),
    picture,
    h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Section 5.1. A blank fills when the picture makes it true. The hint stays closed until you ask.'),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status),
    walk,
    later,
    sourceTag({ pin: 'Chapter 5, Elementary Functions, page 130', href: sectionHref('sec_exponential-function.html') }),
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  paint();

  const targetId = focus === '5.1' ? scope : (CHAPTER_5.cards[focus] ? `chapter-card-${slug(focus)}` : '');
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
