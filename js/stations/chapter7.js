// Chapter 7 as five stages. Sections 7.1–7.3 are drawn. 7.4 and 7.5 are the next camps.
// A stage is complete when its practice is right and the student marks it.

import { h, appendRich, sourceTag } from './test2-ui.js';
import { CHAPTER_7 } from '../data/chapter-7.js';
import { loadSharedTicks, saveSharedTicks } from '../book/progress.js';
import { mountUniform, mountTaylor, mountLaurent } from './ch7-pictures.js';
import { mountPracticeItem, mountFlashDeck } from './ch7-cards.js';
import practice from '../../data/practice/ch7.json' with { type: 'json' };

const PICTURES = { uniform: mountUniform, taylor: mountTaylor, laurent: mountLaurent };
const DRAWN = ['7.1', '7.2', '7.3'];

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function isCh7(id) {
  return typeof id === 'string' && id.startsWith('ch7-');
}

function stageKey(id) {
  return `ch7-stage-${id}`;
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

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });

  function firstOpen() {
    return DRAWN.find((id) => !stageDone(id)) || '7.4';
  }

  function paintStatus() {
    const done = DRAWN.filter(stageDone).length;
    const open = firstOpen();
    const stage = CHAPTER_7.stages.find((s) => s.id === open);
    if (done === DRAWN.length) {
      status.textContent = `Three stages done. Next is ${stage.id} ${stage.title}.`;
      nextBtn.textContent = `Go to ${stage.id}`;
    } else {
      status.textContent = `Stage ${open} of 5. ${done} of 3 drawn stages complete.`;
      nextBtn.textContent = done === 0 && open === '7.1' ? 'Go to 7.1' : `Go to ${open}`;
    }
    nextBtn.dataset.jump = open;
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const spec = CHAPTER_7.stages.find((s) => s.id === id);
      let state = 'ahead';
      if (spec && spec.stub) state = 'later';
      else if (stageDone(id)) state = 'done';
      else if (id === open) state = 'next';
      node.setAttribute('data-state', state);
      const mark = node.querySelector('.ch7-stage-flag');
      if (mark) mark.textContent = state === 'done' ? 'Stage complete' : (state === 'later' ? 'Later' : '');
    }
  }

  nextBtn.addEventListener('click', () => {
    const node = el.querySelector(`#chapter-section-${slug(nextBtn.dataset.jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const stage of CHAPTER_7.stages) {
    const scope = `chapter-section-${slug(stage.id)}`;
    const why = h('p', { class: 'section-idea', id: `${scope}-why` });
    appendRich(why, stage.why);
    const kids = [
      h('p', { class: 'book-flag', id: `${scope}-flag` }, stage.id),
      h('h2', { id: `${scope}-title` }, stage.title),
      h('p', { class: 'book-page' }, `Page ${stage.page}`),
      why,
    ];

    if (stage.picture && PICTURES[stage.picture]) {
      const picture = h('div', { class: 'ch7-picture', id: `${scope}-picture` });
      const observe = h('p', { class: 'ch7-observe', id: `${scope}-observe` });
      appendRich(observe, stage.observe);
      const key = h('p', { class: 'ch7-key', id: `${scope}-key` });
      appendRich(key, stage.key);
      picture.append(observe);
      stops.push(PICTURES[stage.picture](picture));
      picture.append(key);
      kids.push(picture);
    }

    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
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
        sourceTag({ pin: stage.worked.pin, href: stage.worked.href }),
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
    if (sectionItems.length || flashes.length) {
      const host = h('div', { class: 'chapter-exercises', id: `${scope}-practice` });
      if (stage.stub) {
        host.append(h('p', { class: 'section-idea', id: `${scope}-practice-note` }, 'The cards are written. The picture for this stage is the next batch.'));
      }
      for (const item of sectionItems) {
        host.append(mountPracticeItem(item, {
          onDone(itemId) {
            ticks = { ...ticks, [itemId]: true };
            persist();
            paintStatus();
            const btn = el.querySelector(`#${scope}-complete`);
            if (btn) btn.disabled = !stageReady(stage.id);
          },
        }));
      }
      if (flashes.length) host.append(mountFlashDeck(flashes, scope));
      kids.push(h('p', { class: 'book-label', id: `${scope}-practice-label` }, 'Practice'), host);
    }

    if (!stage.stub) {
      const complete = h('button', {
        type: 'button',
        class: 'btn',
        id: `${scope}-complete`,
        'aria-pressed': 'false',
      }, 'Stage complete');
      const summit = h('p', { class: 'ch7-summit', id: `${scope}-summit` });
      appendRich(summit, stage.summit);
      complete.addEventListener('click', () => {
        if (!stageReady(stage.id)) return;
        ticks = { ...ticks, [stageKey(stage.id)]: true };
        persist();
        complete.setAttribute('aria-pressed', 'true');
        complete.textContent = 'Stage complete';
        paintStatus();
      });
      kids.push(summit, h('p', { class: 'ch7-stage-flag', id: `${scope}-done` }, ''), complete);
    } else {
      kids.push(h('p', { class: 'ch7-stage-flag', id: `${scope}-done` }, 'Later'));
    }

    path.append(h('li', {
      class: 'section-node',
      id: scope,
      'data-section': stage.id,
      'data-state': stage.stub ? 'later' : 'ahead',
    }, ...kids));
  }

  function paintButtons() {
    for (const stage of CHAPTER_7.stages) {
      if (stage.stub) continue;
      const btn = el.querySelector(`#chapter-section-${slug(stage.id)}-complete`);
      if (!btn) continue;
      const done = stageDone(stage.id);
      btn.disabled = !done && !stageReady(stage.id);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      btn.textContent = 'Stage complete';
    }
  }

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 7. Taylor and Laurent Series'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Five stages. The first three are drawn. Sections 7.4 and 7.5 are marked for the next pass.'),
      sourceTag({ pin: CHAPTER_7.pin, href: CHAPTER_7.href })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  const paintAll = () => {
    paintButtons();
    paintStatus();
  };
  paintAll();

  const focusId = focus ? String(focus) : '';
  const sectionId = CHAPTER_7.stages.some((s) => s.id === focusId)
    ? focusId
    : focusId.split('.').slice(0, 2).join('.');
  const target = focusId ? el.querySelector(`#chapter-section-${slug(sectionId)}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    for (const stop of stops) stop();
  };
}
