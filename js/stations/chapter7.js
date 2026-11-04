// Chapter 7. Five stages. The first screen is the move, the picture, and Play.
// A stage is complete when its practice is right and the student marks it.

import { h, appendRich, sourceTag } from './test2-ui.js';
import { CHAPTER_7 } from '../data/chapter-7.js';
import { loadSharedTicks, saveSharedTicks } from '../book/progress.js';
import { mountUniform, mountTaylor, mountLaurent, mountWinding, mountRemovable } from './ch7-pictures.js';
import { mountPracticeItem, mountFlashDeck } from './ch7-cards.js';
import practice from '../../data/practice/ch7.json' with { type: 'json' };

const PICTURES = {
  uniform: mountUniform,
  taylor: mountTaylor,
  laurent: mountLaurent,
  winding: mountWinding,
  removable: mountRemovable,
};
const SCROLL_KEY = 'mv:ch7-scroll';
const NAMES = {
  '7.1': 'Uniform convergence',
  '7.2': 'Taylor series',
  '7.3': 'Laurent series',
  '7.4': 'Singularities',
  '7.5': 'Isolated zeros',
};

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function isCh7(id) {
  return typeof id === 'string' && id.startsWith('ch7-');
}

function stageKey(id) {
  return `ch7-stage-${id}`;
}

function nextOf(id) {
  const i = CHAPTER_7.stages.findIndex((s) => s.id === id);
  const nxt = CHAPTER_7.stages[i + 1];
  return nxt ? nxt.id : 'book';
}

export function mountChapter7(el, ctx, focus) {
  const store = ctx.store;
  let ticks = loadSharedTicks(store, isCh7, []);
  const stops = [];

  function persist() {
    const owned = {};
    for (const id of Object.keys(ticks)) owned[id] = ticks[id] === true;
    saveSharedTicks(store, owned);
  }

  function gateIds(section) {
    return practice.filter((item) => item.section === section && item.kind !== 'flash').map((item) => item.id);
  }

  function stageReady(id) {
    return gateIds(id).every((item) => ticks[item] === true);
  }

  function stageDone(id) {
    return ticks[stageKey(id)] === true;
  }

  function firstOpen() {
    return CHAPTER_7.stages.find((s) => !stageDone(s.id)) || null;
  }

  const status = h('p', { class: 'ch7-where', id: 'chapter-status' });
  const path = h('ol', { class: 'chapter-path ch7-path', id: 'chapter-path' });

  function paintStatus() {
    const open = firstOpen();
    const done = CHAPTER_7.stages.filter((s) => stageDone(s.id)).length;
    if (!open) status.textContent = 'Done · 5 of 5 stages.';
    else status.textContent = `${NAMES[open.id] || open.title} · Stage ${CHAPTER_7.stages.indexOf(open) + 1} of 5`;
    status.dataset.done = String(done);
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      let state = 'ahead';
      if (stageDone(id)) state = 'done';
      else if (open && id === open.id) state = 'next';
      node.setAttribute('data-state', state);
    }
  }

  function paintButtons() {
    for (const stage of CHAPTER_7.stages) {
      const btn = el.querySelector(`#chapter-section-${slug(stage.id)}-complete`);
      const summit = el.querySelector(`#chapter-section-${slug(stage.id)}-summit`);
      if (!btn) continue;
      const done = stageDone(stage.id);
      const ready = stageReady(stage.id);
      btn.disabled = !done && !ready;
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      if (done) btn.textContent = nextOf(stage.id) === 'book' ? 'Back to the book' : `Go to ${nextOf(stage.id)}`;
      else if (!ready) btn.textContent = 'Answer the practice to finish this stage.';
      else btn.textContent = 'Stage complete';
      if (summit) summit.hidden = !done;
    }
  }

  let hero = null;
  const up = h('a', { class: 'nav-link ch7-up', id: 'chapter-back', href: '#book' }, 'The Book');
  up.addEventListener('click', () => {
    try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* this visit still leaves */ }
  });

  for (const stage of CHAPTER_7.stages) {
    const scope = `chapter-section-${slug(stage.id)}`;
    const kids = [];
    const lead = stage.id !== '7.1';
    if (lead) {
      kids.push(
        h('p', { class: 'book-flag', id: `${scope}-flag` }, stage.id),
        h('h2', { id: `${scope}-title` }, stage.title),
        h('p', { class: 'book-page' }, `Page ${stage.page}`),
      );
      const why = h('p', { class: 'section-idea', id: `${scope}-why` });
      appendRich(why, stage.why);
      kids.push(why);
      if (stage.observe) {
        const observe = h('p', { class: 'ch7-observe', id: `${scope}-observe` });
        appendRich(observe, stage.observe);
        kids.push(observe);
      }
    }

    if (stage.picture && PICTURES[stage.picture]) {
      const picture = h('div', { class: 'ch7-picture', id: `${scope}-picture` });
      stops.push(PICTURES[stage.picture](picture));
      const key = h('p', { class: 'ch7-key', id: `${scope}-key` });
      appendRich(key, stage.key);
      picture.append(key);
      if (stage.id === '7.1') {
        picture.id = 'chapter-hero';
        picture.classList.add('ch7-hero');
        hero = picture;
      } else kids.push(picture);
    }

    if (!lead) {
      kids.push(h('h2', { id: `${scope}-title` }, stage.title), h('p', { class: 'book-page' }, `Page ${stage.page}`));
      const why = h('p', { class: 'section-idea', id: `${scope}-why` });
      appendRich(why, stage.why);
      kids.push(why);
    }

    const read = h('ul', { class: 'book-read ch7-pins', id: `${scope}-read` });
    stage.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    kids.push(h('p', { class: 'book-label', id: `${scope}-pins` }, 'Pinned'), read);

    if (stage.worked) {
      const body = h('p', { id: `${scope}-worked-body` });
      appendRich(body, stage.worked.body);
      kids.push(h('article', { class: 'card chapter-card', id: `${scope}-worked` },
        h('h3', null, 'Worked example'),
        body));
    }

    if (stage.memory && stage.memory.length) {
      const list = h('ul', { class: 'ch7-memory', id: `${scope}-memory` });
      stage.memory.forEach((line) => {
        const li = h('li');
        appendRich(li, line);
        list.append(li);
      });
      kids.push(h('p', { class: 'book-label', id: `${scope}-sheet` }, 'Memory'), list);
    }

    const sectionItems = practice.filter((item) => item.section === stage.id && item.kind !== 'flash');
    const flashes = practice.filter((item) => item.section === stage.id && item.kind === 'flash');
    const host = h('div', { class: 'chapter-exercises', id: `${scope}-practice` });
    let waiting = false;
    for (const item of sectionItems) {
      const card = mountPracticeItem(item, {
        onDone(itemId) {
          ticks = { ...ticks, [itemId]: true };
          persist();
          const cards = [...host.querySelectorAll('[data-practice]')];
          const at = cards.findIndex((node) => node.getAttribute('data-practice') === itemId);
          const nxt = cards[at + 1];
          if (nxt) nxt.hidden = false;
          const flash = host.querySelector('.ch7-flash');
          if (flash && stageReady(stage.id)) flash.hidden = false;
          paintButtons();
          paintStatus();
        },
      });
      card.hidden = waiting;
      if (ticks[item.id] !== true) waiting = true;
      host.append(card);
    }
    if (flashes.length) {
      const deck = mountFlashDeck(flashes, scope);
      deck.hidden = !stageReady(stage.id);
      host.append(deck);
    }
    kids.push(h('p', { class: 'book-label', id: `${scope}-practice-label` }, 'Practice'), host);

    const complete = h('button', {
      type: 'button',
      class: 'btn',
      id: `${scope}-complete`,
      'aria-pressed': 'false',
    }, 'Answer the practice to finish this stage.');
    const summit = h('p', { class: 'ch7-summit', id: `${scope}-summit`, hidden: '' });
    appendRich(summit, stage.summit);
    complete.addEventListener('click', () => {
      if (!stageReady(stage.id)) return;
      if (!stageDone(stage.id)) {
        ticks = { ...ticks, [stageKey(stage.id)]: true };
        persist();
        summit.hidden = false;
        paintButtons();
        paintStatus();
        return;
      }
      const nxt = nextOf(stage.id);
      if (nxt === 'book') {
        ctx.navigate('book');
        return;
      }
      const node = el.querySelector(`#chapter-section-${slug(nxt)}`);
      if (node) node.scrollIntoView({ block: 'start' });
    });
    kids.push(summit, complete);

    path.append(h('li', {
      class: 'section-node',
      id: scope,
      'data-section': stage.id,
      'data-state': 'ahead',
    }, ...kids));
  }

  el.append(
    h('header', { class: 'station-header ch7-head' },
      up,
      h('h1', { id: 'chapter-title' }, 'Chapter 7. Taylor and Laurent Series'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Drag the green point toward 1 until it leaves the orange band. Press Play and watch it come back.')),
    status);
  if (hero) el.append(hero);
  el.append(
    path,
    sourceTag({ pin: CHAPTER_7.pin, href: CHAPTER_7.href }));

  paintButtons();
  paintStatus();

  const onScroll = () => {
    try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* ignore */ }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const focusId = focus ? String(focus) : '';
  const sectionId = CHAPTER_7.stages.some((s) => s.id === focusId)
    ? focusId
    : focusId.split('.').slice(0, 2).join('.');
  const target = focusId ? el.querySelector(`#chapter-section-${slug(sectionId)}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  } else {
    let y = 0;
    try { y = Number(sessionStorage.getItem(SCROLL_KEY)) || 0; } catch { y = 0; }
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }

  return function unmount() {
    window.removeEventListener('scroll', onScroll);
    try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* ignore */ }
    for (const stop of stops) stop();
  };
}
