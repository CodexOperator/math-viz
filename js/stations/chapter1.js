// Chapter 1 as six stages. The tick is the same memory as the other chapters.
// Mark stage complete stays off until the faded blank and the next item are right.
// Flashcards are outside that gate.

import { CHAPTER_1, chapter1Walk } from '../data/chapter1.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountTurn, mountTimes, mountModulus, mountPolar, mountRoots, mountDisk } from './ch1-pictures.js';
import { practiceItems, flashItems, mountPractice, mountDeck } from './ch1-cards.js';

const PICTURES = {
  turn: mountTurn, times: mountTimes, modulus: mountModulus,
  polar: mountPolar, roots: mountRoots, disk: mountDisk,
};

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
  if (t.complete) return `Done. ${t.sectionsFinished} of ${t.sectionTotal} stages.`;
  return `Next is stage ${t.nextId}. ${t.sectionsFinished} of ${t.sectionTotal} stages.`;
}

function gateIds(sectionId) {
  const items = practiceItems(sectionId);
  return items.slice(0, Math.min(2, items.length)).map((item) => item.id);
}

const OPENERS = {
  '1.1': 'The sum and the cubic check open this.',
  '1.2': '$(0,1)(0,1)$ and Exercise 1(f) open this.',
  '1.3': 'The length of $4+3i$ and $|(1+i)(2+i)|$ open this.',
  '1.4': '$1+i$ in polar form and the next polar pair open this.',
  '1.5': 'The length of $(\\sqrt{3}+i)^{10}$ and the angle $2\\pi/5$ open this.',
  '1.6': 'Where the green point sits, and the annulus, open this.',
};

const SUMMIT_FOUR = 'Two turns. $i^2$ landed on $-1$. Bombelli’s $4$ is $(2+\\sqrt{-1})+(2-\\sqrt{-1})$. Equation (1.6), page 3.';

function setLine(el, text) {
  if (!el || el.dataset.line === text) return;
  el.dataset.line = text;
  el.replaceChildren();
  appendRich(el, text);
}

export function mountChapter1(el, ctx, focus) {
  const store = ctx.store;
  const walk = chapter1Walk();
  let ticks = loadTicks(store);
  let turnHolds = false;
  const earned = new Map();
  const stops = [];
  const path = h('ol', { class: 'chapter-path ch1-path', id: 'chapter-path' });

  function paint() {
    const t = chapterTally(walk, ticks);
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

  for (const section of CHAPTER_1.sections) {
    path.append(section.exercises.length ? fullStage(section) : stubStage(section));
  }

  function fullStage(section) {
    const scope = `chapter-section-${slug(section.id)}`;
    const why = h('p', { class: 'section-idea', id: `${scope}-why` });
    appendRich(why, section.why);
    const picture = h('div', { class: 'ch1-stage-picture', id: `${scope}-picture` });
    const mount = PICTURES[section.picture];
    if (mount) {
      const onClaim = section.id === '1.1'
        ? (c) => {
            if (c && c.holds) turnHolds = true;
            paintTicks();
          }
        : undefined;
      stops.push(mount(picture, onClaim));
    }
    const read = linkList(section.read, `${scope}-read`);
    const worked = workedBlock(section, scope);
    const sheet = h('ul', { class: 'ch1-sheet', id: `${scope}-sheet` });
    for (const line of section.memory) {
      const li = h('li');
      appendRich(li, line);
      sheet.append(li);
    }
    const items = practiceItems(section.id);
    const practice = h('div', { class: 'chapter-exercises ch1-practice', id: `${scope}-practice` });
    const more = h('div', { class: 'chapter-exercises ch1-practice', id: `${scope}-more` });
    const onItem = (id) => {
      if (!earned.has(section.id)) earned.set(section.id, new Set());
      earned.get(section.id).add(id);
      paintTicks();
    };
    const openers = items.slice(0, Math.min(2, items.length));
    mountPractice(practice, openers, onItem);
    mountPractice(more, items.slice(openers.length), onItem);
    const deck = h('div', { class: 'ch1-deck', id: `${scope}-deck` });
    mountDeck(deck, flashItems(section.id), store);
    const summit = h('p', { class: 'stage-summit', id: `${scope}-summit` });
    appendRich(summit, section.summit);
    const tick = h('button', {
      type: 'button', class: 'btn', id: `chapter-tick-${slug(section.id)}`, 'aria-pressed': 'false',
    }, 'Mark stage complete');
    const go = h('a', { class: 'btn btn-primary ch1-go', id: `${scope}-go` }, 'Go');
    go.hidden = true;
    const where = h('p', { class: 'book-status', id: `${scope}-next` });
    tick.addEventListener('click', () => {
      ticks = toggleTick(ticks, section.id);
      saveSharedTicks(store, ticks);
      paintTicks();
    });
    const flag = h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id);
    const title = h('h2', { id: `${scope}-title` }, section.title);
    const page = h('p', { class: 'book-page' }, `Page ${section.page}`);
    const lead = section.id === '1.1'
      ? [flag, picture, title, page]
      : [flag, title, page, picture];
    const actions = h('div', { class: 'problem-actions ch1-done', id: `${scope}-actions` }, where, tick, go);
    const head = [...lead, why, worked];
    const tail = [
      openers.length > 1
        ? h('p', { class: 'book-status', id: `${scope}-unlock` }, 'The first two unlock the stage.')
        : null,
      practice,
      summit,
      actions,
      items.length > openers.length ? more : null,
      deck,
      sheet,
      read,
    ];
    const node = h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    }, ...head, ...tail);
    node._tick = tick;
    node._go = go;
    node._where = where;
    node._summit = summit;
    node._gate = gateIds(section.id);
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
      const a = h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${id}-${i + 1}`,
      });
      appendRich(a, item.pin);
      ul.append(h('li', null, a));
    });
    return ul;
  }

  function workedBlock(section, scope) {
    const w = section.worked;
    const body = h('div', { id: `${scope}-worked` });
    const title = h('h3', { id: `${scope}-worked-title` });
    appendRich(title, w.title);
    const text = h('p');
    appendRich(text, w.body);
    body.append(title, sourceTag({ pin: w.pin, href: w.href }), text);
    return body;
  }

  function gateMet(node) {
    const need = node._gate || [];
    if (!need.length) return false;
    const id = node.getAttribute('data-section');
    if (id === '1.1' && !turnHolds) return false;
    const got = earned.get(id);
    if (!got) return false;
    return need.every((item) => got.has(item));
  }

  function blocked(section) {
    const line = OPENERS[section.id] || 'The first two cards open this.';
    if (section.id === '1.1' && !turnHolds) return `Press Times i until two turns land on $-1$. ${line}`;
    return line;
  }

  function goTarget(id) {
    const i = walk.findIndex((s) => s.id === id);
    const nxt = walk[i + 1];
    if (!nxt) return { href: '#book', label: 'Back to the book' };
    return { href: `#chapter-1-${slug(nxt.id)}`, label: `Go to ${nxt.id}` };
  }

  function paintTicks() {
    const sentence = nextSentence(chapterTally(walk, ticks));
    for (const section of walk) {
      const node = path.querySelector(`#chapter-section-${slug(section.id)}`);
      if (!node || !node._tick) continue;
      const on = ticks[section.id] === true;
      const open = on || gateMet(node);
      const go = node._go;
      if (on) {
        setLine(node._where, sentence);
        node._tick.hidden = true;
        node._tick.disabled = true;
        node._tick.setAttribute('aria-pressed', 'true');
        if (go) {
          const target = goTarget(section.id);
          go.hidden = false;
          go.href = target.href;
          go.textContent = target.label;
        }
      } else {
        setLine(node._where, blocked(section));
        node._tick.hidden = false;
        node._tick.disabled = !open;
        node._tick.setAttribute('aria-pressed', 'false');
        node._tick.textContent = 'Mark stage complete';
        if (go) go.hidden = true;
      }
      if (node._summit) {
        const line = section.id === '1.1' && open ? SUMMIT_FOUR : section.summit;
        setLine(node._summit, line);
      }
    }
    paint();
  }

  el.append(
    h('header', { class: 'station-header' },
      h('a', { class: 'station-link', id: 'chapter-back', href: '#book' }, 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 1. Complex Numbers'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Press Times i. The purple point turns.'),
      sourceTag({ pin: CHAPTER_1.pin, href: CHAPTER_1.href })),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { class: 'station-link', id: 'chapter-back-end', href: '#book' }, 'The Book')));

  paintTicks();

  const focusId = focus && CHAPTER_1.sections.some((s) => s.id === focus) ? `chapter-section-${slug(focus)}` : '';
  const target = focusId ? el.querySelector(`#${focusId}`) : null;
  if (target && !ctx.keepScroll) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  let hashReady = false;
  let hashFrame = 0;
  function stageInView() {
    const header = document.querySelector('.site-header');
    const line = ((header && header.offsetHeight) || 56) + 8;
    let current = null;
    for (const node of path.querySelectorAll('.section-node')) {
      if (node.getBoundingClientRect().top <= line) current = node;
    }
    return current;
  }
  function syncStageHash() {
    const node = stageInView();
    if (!node) return;
    const id = node.getAttribute('data-section');
    const next = `#chapter-1-${slug(id)}`;
    const y = window.scrollY;
    const prev = history.state && typeof history.state === 'object' ? history.state : {};
    try { history.replaceState({ ...prev, y, hash: next }, '', next); }
    catch { /* keep the hash the visit already has */ }
    const mem = window.__mv && window.__mv.scrollMem;
    if (mem) mem.set(next, y);
  }
  function onScroll() {
    if (!hashReady) return;
    if (hashFrame) return;
    hashFrame = requestAnimationFrame(() => {
      hashFrame = 0;
      syncStageHash();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  const arm = requestAnimationFrame(() => {
    hashReady = true;
    syncStageHash();
  });

  return function unmount() {
    hashReady = false;
    cancelAnimationFrame(arm);
    if (hashFrame) cancelAnimationFrame(hashFrame);
    window.removeEventListener('scroll', onScroll);
    for (const stop of stops) stop();
  };
}
