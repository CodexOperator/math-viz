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
const CAMP_KEY = 'mv:ch7-camp';
const NAMES = {
  '7.1': 'Uniform convergence',
  '7.2': 'Taylor series',
  '7.3': 'Laurent series',
  '7.4': 'Singularities',
  '7.5': 'Removable singularity',
};
const WAIT = {
  '7.1': 'Press Play until the curve comes back.',
  '7.2': 'Drag past the orange circle.',
  '7.3': 'Leave the annulus and come back.',
  '7.4': 'Walk once around the orange circle.',
  '7.5': 'Drag the point toward 0.',
};
const POLE_WAIT = 'Play on. The image winds the other way.';

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

  function flashKey(id) {
    return `ch7-flash-seen-${id}`;
  }

  function practiceReady(id) {
    return gateIds(id).every((item) => ticks[item] === true);
  }

  function flashReady(id) {
    const flashes = practice.filter((item) => item.section === id && item.kind === 'flash');
    if (!flashes.length) return true;
    return ticks[flashKey(id)] === true;
  }

  function stageReady(id) {
    return practiceReady(id) && flashReady(id);
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
      const scope = `chapter-section-${slug(stage.id)}`;
      const btn = el.querySelector(`#${scope}-complete`);
      const summit = el.querySelector(`#${scope}-summit`);
      if (!btn) continue;
      const done = stageDone(stage.id);
      const ready = stageReady(stage.id);
      const left = gateIds(stage.id).filter((item) => ticks[item] !== true).length;
      btn.disabled = !done && !ready;
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      if (done) btn.textContent = nextOf(stage.id) === 'book' ? 'Back to the book' : `Go to ${nextOf(stage.id)}`;
      else if (left > 0) btn.textContent = left === 1 ? '1 card left.' : `${left} cards left.`;
      else if (!flashReady(stage.id)) btn.textContent = 'Show the back of a card.';
      else btn.textContent = 'Stage complete';
      if (summit) summit.hidden = !done;
      const sheet = el.querySelector(`#${scope}-sheet`);
      if (sheet) {
        const reveal = done && sheet.hidden;
        sheet.hidden = !done;
        if (reveal) sheet.open = true;
      }
      const flash = el.querySelector(`#${scope}-flash`);
      if (flash) flash.hidden = !practiceReady(stage.id);
    }
  }

  let hero = null;
  let parked = false;
  let camp = '';
  function readCamp() {
    const header = document.getElementById('site-header');
    const line = (header ? header.getBoundingClientRect().bottom : 56) + 80;
    let id = '';
    for (const stage of CHAPTER_7.stages) {
      const title = el.querySelector(`#chapter-section-${slug(stage.id)}-title`);
      if (!title) continue;
      if (title.getBoundingClientRect().top <= line) id = stage.id;
    }
    return id;
  }
  function remember() {
    if (parked) return;
    camp = readCamp();
    try { sessionStorage.setItem(CAMP_KEY, camp); } catch { /* ignore */ }
  }
  function park() {
    if (parked) return;
    parked = true;
    camp = readCamp();
    try { sessionStorage.setItem(CAMP_KEY, camp); } catch { /* ignore */ }
  }
  const up = h('a', { class: 'nav-link ch7-up', id: 'chapter-back', href: '#book' }, 'The Book');
  const onLeave = (ev) => {
    const a = ev.target instanceof Element ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href === '#chapter-7' || href.startsWith('#chapter-7-')) return;
    park();
  };
  document.addEventListener('click', onLeave, true);

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

    let picture = null;
    let claimEarned = false;
    let poleEarned = false;
    let refreshGates = () => {};
    if (stage.picture && PICTURES[stage.picture]) {
      picture = h('div', { class: 'ch7-picture', id: `${scope}-picture` });
      stops.push(PICTURES[stage.picture](picture, {
        onEarned() {
          claimEarned = true;
          refreshGates();
        },
        onPole() {
          poleEarned = true;
          refreshGates();
        },
      }));
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

    let memoryList = null;
    if (stage.memory && stage.memory.length) {
      memoryList = h('ul', { class: 'ch7-memory', id: `${scope}-memory` });
      stage.memory.forEach((line) => {
        const li = h('li');
        appendRich(li, line);
        memoryList.append(li);
      });
    }

    const sectionItems = practice.filter((item) => item.section === stage.id && item.kind !== 'flash');
    const flashes = practice.filter((item) => item.section === stage.id && item.kind === 'flash');
    const host = h('div', { class: 'chapter-exercises', id: `${scope}-practice` });
    const ordered = [];
    let wait = null;
    if (picture) {
      wait = h('p', { class: 'ch7-read ch7-wait', id: `${scope}-wait` }, WAIT[stage.id] || '');
      picture.append(wait);
    }
    refreshGates = () => {
      let blocked = false;
      for (const card of ordered) {
        const id = card.getAttribute('data-practice') || '';
        const solved = ticks[id] === true;
        const needsClaim = id.endsWith('-picture') && !claimEarned;
        const needsPole = stage.id === '7.4' && !id.endsWith('-picture') && !poleEarned;
        if (solved) {
          card.hidden = false;
          continue;
        }
        card.hidden = blocked || needsClaim || needsPole;
        blocked = true;
      }
      if (!wait) return;
      if (!claimEarned) {
        wait.hidden = false;
        wait.textContent = WAIT[stage.id] || '';
      } else if (stage.id === '7.4' && !poleEarned) {
        wait.hidden = false;
        wait.textContent = POLE_WAIT;
      } else wait.hidden = true;
    };
    for (const item of sectionItems) {
      const card = mountPracticeItem(item, {
        onDone(itemId) {
          ticks = { ...ticks, [itemId]: true };
          persist();
          refreshGates();
          paintButtons();
          paintStatus();
        },
      });
      const underPlay = picture && item.id.endsWith('-picture');
      if (underPlay) picture.append(card);
      else host.append(card);
      ordered.push(card);
    }
    refreshGates();
    if (picture) {
      const key = h('p', { class: 'ch7-key', id: `${scope}-key` });
      appendRich(key, stage.key);
      picture.append(key);
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
      const title = el.querySelector(`#chapter-section-${slug(nxt)}-title`);
      if (title) placeTitle(title);
    });
    if (flashes.length) {
      const deck = mountFlashDeck(flashes, scope, {
        onSeen() {
          if (ticks[flashKey(stage.id)] === true) return;
          ticks = { ...ticks, [flashKey(stage.id)]: true };
          persist();
          paintButtons();
          paintStatus();
        },
      });
      deck.hidden = !practiceReady(stage.id);
      kids.push(deck);
    }
    kids.push(summit);
    if (memoryList) {
      const sheet = h('details', { class: 'ch7-sheet', id: `${scope}-sheet` });
      sheet.append(h('summary', null, 'Memory'), memoryList);
      sheet.hidden = !stageDone(stage.id);
      if (stageDone(stage.id)) sheet.open = true;
      kids.push(sheet);
    }
    kids.push(complete);

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

  const onScroll = () => remember();
  window.addEventListener('scroll', onScroll, { passive: true });

  function placeTitle(title) {
    const go = () => {
      if (!title || !title.isConnected) return;
      const header = document.getElementById('site-header');
      const under = (header ? header.getBoundingClientRect().bottom : 56) + 40;
      const delta = title.getBoundingClientRect().top - under;
      if (Math.abs(delta) < 1) return;
      window.scrollTo(0, Math.max(0, window.scrollY + delta));
    };
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 60);
    setTimeout(go, 280);
  }

  const focusId = focus ? String(focus) : '';
  const sectionId = CHAPTER_7.stages.some((s) => s.id === focusId)
    ? focusId
    : focusId.split('.').slice(0, 2).join('.');
  const target = focusId ? el.querySelector(`#chapter-section-${slug(sectionId)}-title`) : null;
  if (target) {
    const node = target.closest('.section-node');
    if (node) node.classList.add('is-target');
    placeTitle(target);
  } else {
    let stored = '';
    try { stored = sessionStorage.getItem(CAMP_KEY) || ''; } catch { stored = ''; }
    const back = stored ? el.querySelector(`#chapter-section-${slug(stored)}-title`) : null;
    if (back) placeTitle(back);
  }

  return function unmount() {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('click', onLeave, true);
    if (!parked) {
      try { sessionStorage.setItem(CAMP_KEY, camp); } catch { /* ignore */ }
    }
    for (const stop of stops) stop();
  };
}
