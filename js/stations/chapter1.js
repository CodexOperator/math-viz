// Chapter 1 as six stages. 1.1–1.3 are walked. 1.4–1.6 are titles and cites.
// A stage is complete when its tick is on. The tick is the same memory as the other chapters.

import { CHAPTER_1, chapter1Walk } from '../data/chapter1.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountTurn, mountTimes, mountModulus } from './ch1-pictures.js';
import { practiceItems, flashItems, mountPractice, mountDeck } from './ch1-cards.js';

const PICTURES = { turn: mountTurn, times: mountTimes, modulus: mountModulus };

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function ownedIds() {
  return new Set(chapter1Walk().flatMap((s) => s.exercises));
}

function loadTicks(store) {
  const ids = ownedIds();
  return loadSharedTicks(store, (id) => ids.has(id), []);
}

function nextSentence(t) {
  if (t.complete) return `Done. ${t.sectionsFinished} of ${t.sectionTotal} stages. Sections 1.4 to 1.6 are next, and they are titles so far.`;
  return `Next is stage ${t.nextId}. ${t.sectionsFinished} of ${t.sectionTotal} stages.`;
}

export function mountChapter1(el, ctx, focus) {
  const store = ctx.store;
  const walk = chapter1Walk();
  let ticks = loadTicks(store);
  const stops = [];
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });
  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');

  function paint() {
    const t = chapterTally(walk, ticks);
    status.textContent = nextSentence(t);
    if (t.complete) {
      nextBtn.hidden = false;
      nextBtn.textContent = 'Back to the book';
      nextBtn.dataset.jump = 'book';
    } else if (t.nextId && t.nextId !== '1.1') {
      nextBtn.hidden = false;
      nextBtn.textContent = `Go to ${t.nextId}`;
      nextBtn.dataset.jump = t.nextId;
    } else {
      nextBtn.hidden = true;
      nextBtn.dataset.jump = '';
    }
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const section = CHAPTER_1.sections.find((s) => s.id === id);
      if (!section || !section.exercises.length) {
        node.setAttribute('data-state', 'later');
        continue;
      }
      const finished = sectionFinished(section, ticks);
      node.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
      const flag = node.querySelector('.book-flag');
      if (flag) flag.textContent = finished ? 'Done' : id;
    }
  }

  nextBtn.addEventListener('click', () => {
    const jump = nextBtn.dataset.jump;
    if (jump === 'book') { ctx.navigate('book'); return; }
    const node = el.querySelector(`#chapter-section-${slug(jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const section of CHAPTER_1.sections) {
    path.append(section.exercises.length ? fullStage(section) : stubStage(section));
  }

  function fullStage(section) {
    const scope = `chapter-section-${slug(section.id)}`;
    const why = h('p', { class: 'section-idea', id: `${scope}-why` });
    appendRich(why, section.why);
    const picture = h('div', { class: 'ch1-stage-picture', id: `${scope}-picture` });
    const mount = PICTURES[section.picture];
    if (mount) stops.push(mount(picture));
    const read = linkList(section.read, `${scope}-read`);
    const worked = workedBlock(section, scope);
    const sheet = h('ul', { class: 'ch1-sheet', id: `${scope}-sheet` });
    for (const line of section.memory) {
      const li = h('li');
      appendRich(li, line);
      sheet.append(li);
    }
    const practice = h('div', { class: 'chapter-exercises', id: `${scope}-practice` });
    mountPractice(practice, practiceItems(section.id));
    const deck = h('div', { class: 'ch1-deck', id: `${scope}-deck` });
    mountDeck(deck, flashItems(section.id));
    const summit = h('p', { class: 'stage-summit', id: `${scope}-summit` });
    appendRich(summit, section.summit);
    const tick = h('button', {
      type: 'button', class: 'btn', id: `chapter-tick-${slug(section.id)}`, 'aria-pressed': 'false',
    }, 'Stage complete');
    tick.addEventListener('click', () => {
      ticks = toggleTick(ticks, section.id);
      saveSharedTicks(store, ticks);
      paintTicks();
    });
    const node = h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      h('p', { class: 'book-label' }, 'Why you\'d care'),
      why,
      h('p', { class: 'book-label' }, 'The picture'),
      picture,
      h('p', { class: 'book-label' }, 'Pinned'),
      read,
      h('p', { class: 'book-label' }, 'Worked example'),
      worked,
      h('p', { class: 'book-label' }, 'Memory'),
      sheet,
      h('p', { class: 'book-label' }, 'Practice'),
      practice,
      h('p', { class: 'book-label' }, 'Cards'),
      deck,
      h('p', { class: 'book-label' }, 'Summit'),
      summit,
      h('div', { class: 'problem-actions' }, tick));
    node._tick = tick;
    return node;
  }

  function stubStage(section) {
    const scope = `chapter-section-${slug(section.id)}`;
    return h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'later',
    },
      h('p', { class: 'book-flag' }, 'Later'),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      linkList(section.read, `${scope}-read`));
  }

  function linkList(items, id) {
    const ul = h('ul', { class: 'book-read', id });
    items.forEach((item, i) => {
      ul.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${id}-${i + 1}`,
      }, item.pin)));
    });
    return ul;
  }

  function workedBlock(section, scope) {
    const w = section.worked;
    const body = h('div', { id: `${scope}-worked` });
    const title = h('h3', { id: `${scope}-worked-title` }, w.title);
    const text = h('p');
    appendRich(text, w.body);
    body.append(title, sourceTag({ pin: w.pin, href: w.href }), text);
    return body;
  }

  function paintTicks() {
    for (const section of walk) {
      const node = path.querySelector(`#chapter-section-${slug(section.id)}`);
      if (!node || !node._tick) continue;
      const on = ticks[section.id] === true;
      node._tick.setAttribute('aria-pressed', on ? 'true' : 'false');
      node._tick.textContent = on ? 'Stage complete' : 'Mark stage complete';
    }
    paint();
  }

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 1. Complex Numbers'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Six stages. The first three are walked. Mark a stage when you have worked it.'),
      sourceTag({ pin: CHAPTER_1.pin, href: CHAPTER_1.href })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  paintTicks();

  const focusId = focus && CHAPTER_1.sections.some((s) => s.id === focus) ? `chapter-section-${slug(focus)}` : '';
  const target = focusId ? el.querySelector(`#${focusId}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    for (const stop of stops) stop();
  };
}
