// Chapter 3 as three stages. A stage is finished when it is marked.
// The mark is the same memory as the other chapter ticks. Practice stays local
// until the shared cards in js/practice/ arrive.

import { CHAPTER_3, chapter3StageIds } from '../data/book-path.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from './progress.js';
import { h, appendRich, sourceTag } from '../stations/test2-ui.js';
import { mountDerivativePicture, mountSquarePicture, mountLevelPicture } from './ch3-pictures.js';
import { mountPractice, mountDeck } from './ch3-cards.js';

const PICTURES = {
  '3.1': mountDerivativePicture,
  '3.2': mountSquarePicture,
  '3.3': mountLevelPicture,
};

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function load(store) {
  const owned = new Set(chapter3StageIds());
  return loadSharedTicks(store, (id) => owned.has(id), []);
}

function statusLine(tally) {
  if (tally.complete) return `Done. ${tally.sectionsFinished} of ${tally.sectionTotal} stages.`;
  const section = CHAPTER_3.sections.find((s) => s.id === tally.nextId);
  const name = section ? `${section.id} ${section.title}` : tally.nextId;
  return `Next is ${name}. ${tally.sectionsFinished} of ${tally.sectionTotal} stages.`;
}

export function mount(el, ctx, focus) {
  const store = ctx.store;
  let ticks = load(store);
  const stops = [];
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });
  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const lede = h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Three stages, from the derivative to a harmonic conjugate.');
  const statusWrap = h('div', { class: 'book-next', id: 'chapter-next-row' }, status);
  const buttons = [];

  function paint() {
    const t = chapterTally(CHAPTER_3.sections, ticks);
    status.textContent = statusLine(t);
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const section = CHAPTER_3.sections.find((s) => s.id === id);
      const finished = sectionFinished(section, ticks);
      node.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
      const flag = node.querySelector('.book-flag');
      if (flag) flag.textContent = finished ? `${id} · stage complete` : id;
    }
    for (const button of buttons) {
      const on = ticks[button.dataset.stage] === true;
      button.setAttribute('aria-pressed', String(on));
      button.textContent = on ? 'Stage complete' : 'Mark stage complete';
    }
  }

  for (const section of CHAPTER_3.sections) {
    const scope = `chapter-section-${slug(section.id)}`;
    const why = h('p', { class: 'section-idea', id: `${scope}-why` });
    appendRich(why, section.why);
    const picture = h('section', { class: 'exp-picture ch3-picture', id: `${scope}-picture`, 'aria-label': section.title });
    const mountPicture = PICTURES[section.id];
    if (mountPicture) stops.push(mountPicture(picture));
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    section.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    const workedBody = h('div', { id: `${scope}-worked-body` });
    for (const para of section.worked.body) {
      const p = h('p');
      appendRich(p, para);
      workedBody.append(p);
    }
    const worked = h('article', { class: 'card chapter-card', id: `${scope}-worked` },
      h('h3', { id: `${scope}-worked-title` }, section.worked.pin),
      sourceTag({ pin: section.worked.pin, href: section.worked.href }),
      workedBody);
    const practice = h('div', { class: 'chapter-exercises', id: `${scope}-practice` });
    stops.push(mountPractice(practice, section.id));
    const memory = h('ul', { class: 'book-read ch3-memory', id: `${scope}-memory` });
    for (const line of [...section.recipes, ...(section.extras || [])]) {
      const li = h('li');
      appendRich(li, line);
      memory.append(li);
    }
    const deck = h('div', { id: `${scope}-deck` });
    stops.push(mountDeck(deck, section.id));
    const summit = h('p', { class: 'section-idea', id: `${scope}-summit` });
    appendRich(summit, section.summit);
    const mark = h('button', {
      type: 'button', class: 'btn', id: `chapter-stage-${slug(section.id)}`, 'data-stage': section.id, 'aria-pressed': 'false',
    }, 'Mark stage complete');
    mark.addEventListener('click', () => {
      ticks = toggleTick(ticks, section.id);
      saveSharedTicks(store, ticks);
      paint();
    });
    buttons.push(mark);
    const flag = h('a', { class: 'book-flag', href: `#${scope}-memory`, id: `${scope}-flag` }, section.id);
    const heading = [
      flag,
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
    ];
    const whyBlock = [
      h('p', { class: 'book-label', id: `${scope}-why-label` }, "Why you'd care"),
      why,
    ];
    const rest = [
      h('p', { class: 'book-label' }, 'In the book'),
      read,
      h('p', { class: 'book-label' }, 'Worked'),
      worked,
      h('p', { class: 'book-label' }, 'Practice'),
      practice,
      h('p', { class: 'book-label' }, 'Memory'),
      memory,
      deck,
      h('p', { class: 'book-label' }, 'Summit'),
      summit,
      h('div', { class: 'problem-actions' }, mark),
    ];
    const openOnPicture = section.id === '3.1'
      ? [picture, ...whyBlock, lede, statusWrap, ...heading, ...rest]
      : [...heading, ...whyBlock, picture, ...rest];
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    }, ...openOnPicture));
  }

  paint();
  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 3. Analytic and Harmonic Functions')),
    path,
    sourceTag({ pin: CHAPTER_3.pin, href: CHAPTER_3.href }),
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  const targetId = focusSection(focus);
  const target = targetId ? el.querySelector(`#${targetId}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    for (const stop of stops) stop();
  };
}

function focusSection(focus) {
  const raw = String(focus || '');
  const id = /^3\.[123]/.exec(raw);
  return id ? `chapter-section-${slug(id[0])}` : '';
}
