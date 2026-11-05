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

let pendingMemory = '';

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function load(store) {
  const owned = new Set(chapter3StageIds());
  return loadSharedTicks(store, (id) => owned.has(id), []);
}

function statusLine(tally) {
  if (tally.complete) return `Done. ${tally.sectionsFinished} of ${tally.sectionTotal} stages.`;
  return `Next is ${tally.nextId}.`;
}

export function mount(el, ctx, focus) {
  const store = ctx.store;
  let ticks = load(store);
  const stops = [];
  const path = h('ol', { class: 'chapter-path ch3-path', id: 'chapter-path' });
  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const stageLine = h('p', { id: 'chapter-stage-line' });
  const statusWrap = h('div', { class: 'book-next', id: 'chapter-next-row' }, status);
  const buttons = [];
  const anchors = new Map();
  const opening = CHAPTER_3.sections[0];

  function finishedAnchor(tally) {
    if (tally.complete) return CHAPTER_3.sections[CHAPTER_3.sections.length - 1].id;
    const nextIndex = CHAPTER_3.sections.findIndex((s) => s.id === tally.nextId);
    for (let i = nextIndex - 1; i >= 0; i -= 1) {
      if (sectionFinished(CHAPTER_3.sections[i], ticks)) return CHAPTER_3.sections[i].id;
    }
    for (let i = CHAPTER_3.sections.length - 1; i > nextIndex; i -= 1) {
      if (sectionFinished(CHAPTER_3.sections[i], ticks)) return CHAPTER_3.sections[i].id;
    }
    return opening.id;
  }

  function paint() {
    const t = chapterTally(CHAPTER_3.sections, ticks);
    // The line under the title sits over the derivative square, so it keeps
    // naming 3.1 after that stage is marked. The count updates. While nothing
    // is marked, the kicker already names 3.1, so the status row stays off.
    // After a stage is marked, "Next is 3.2." sits with that stage.
    stageLine.textContent = `${opening.id} · ${opening.title} · ${t.sectionsFinished} of ${t.sectionTotal}`;
    if (t.sectionsFinished === 0) {
      statusWrap.hidden = true;
    } else {
      status.textContent = statusLine(t);
      statusWrap.hidden = false;
      const anchor = anchors.get(finishedAnchor(t));
      if (anchor) anchor.after(statusWrap);
    }
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
    const workedBody = h('div', { id: `${scope}-worked-body` });
    for (const para of section.worked.body) {
      const p = h('p');
      appendRich(p, para);
      workedBody.append(p);
    }
    const termBlock = (section.terms || []).map((line, i) => {
      const p = h('p', { class: 'section-idea', id: `${scope}-term-${i + 1}` });
      appendRich(p, line);
      return p;
    });
    const bridge = section.bridge ? h('p', { class: 'section-idea', id: `${scope}-bridge` }) : null;
    if (bridge) appendRich(bridge, section.bridge);
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
    const actions = h('div', { class: 'problem-actions', id: `${scope}-actions` }, mark);
    anchors.set(section.id, actions);
    const flagHash = `#chapter-3-${slug(section.id)}`;
    const flag = h('a', { class: 'book-flag', href: flagHash, id: `${scope}-flag` }, section.id);
    flag.addEventListener('click', (ev) => {
      pendingMemory = `${scope}-memory`;
      if (location.hash !== flagHash) return;
      ev.preventDefault();
      pendingMemory = '';
      const node = document.getElementById(`${scope}-memory`);
      if (node) node.scrollIntoView({ block: 'start' });
    });
    const heading = [
      flag,
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
    ];
    const whyBlock = h('div', { id: `${scope}-why-block` },
      h('p', { class: 'book-label', id: `${scope}-why-label` }, "Why you'd care"),
      why);
    const rest = [
      ...termBlock,
      h('p', { class: 'book-label' }, 'Worked'),
      worked,
      h('p', { class: 'book-label' }, 'Practice'),
      bridge,
      practice,
      h('p', { class: 'book-label' }, 'Memory'),
      memory,
      deck,
      h('p', { class: 'book-label' }, 'Summit'),
      summit,
      actions,
    ];
    const openOnPicture = section.id === '3.1'
      ? [picture, whyBlock, ...heading, ...rest]
      : [...heading, whyBlock, picture, ...rest];
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    }, ...openOnPicture));
  }

  paint();
  el.append(
    h('header', { class: 'station-header' },
      h('a', { class: 'station-link', href: '#book', id: 'chapter-back' }, 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 3. Analytic and Harmonic Functions'),
      stageLine),
    path,
    sourceTag({ pin: CHAPTER_3.pin, href: CHAPTER_3.href }));

  const memoryId = pendingMemory;
  pendingMemory = '';
  const targetId = focusSection(focus);
  const target = targetId ? el.querySelector(`#${targetId}`) : null;
  if (target) target.classList.add('is-target');
  const memory = memoryId ? document.getElementById(memoryId) : null;
  const openingId = `chapter-section-${slug(opening.id)}`;
  // A cold #chapter-3-3-1 is the first screen. Scrolling the camp under the
  // header would hide the stage line. The flag still scrolls the memory list.
  // The route focuses the page after mount, so the scroll is repeated on the
  // next frame, after that focus.
  const land = memory || (target && target.id !== openingId ? target : null);
  if (land) {
    const go = () => land.scrollIntoView({ block: 'start' });
    go();
    requestAnimationFrame(go);
  }
  document.documentElement.dataset.ch3Memory = `${memoryId || ''}|${memory ? 'yes' : 'no'}|${Math.round(window.scrollY)}`;

  return function unmount() {
    for (const stop of stops) stop();
  };
}

function focusSection(focus) {
  const raw = String(focus || '');
  const id = /^3\.[123]/.exec(raw);
  return id ? `chapter-section-${slug(id[0])}` : '';
}
