// Flashcards, one at a time. The back stays hidden until the learner asks.

import { h } from '../core/dom.js';
import { prose } from '../core/katex.js';
import { FLASHCARDS, stationById, onThisMap } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { sourceTag } from '../components/source.js';

export function mount(section, ctx) {
  const station = ctx.station;
  const cards = FLASHCARDS.filter((card) => onThisMap(card, ctx.map));
  section.append(stationHeader(station, ctx));
  if (!cards.length) {
    section.append(h('p', { class: 'lede', text: 'No cards yet.' }));
    return;
  }

  let index = 0;
  try {
    const saved = ctx.store.get('card-index', 0);
    if (Number.isInteger(saved) && saved >= 0 && saved < cards.length) index = saved;
  } catch { /* memory */ }
  let face = 'front';

  const kicker = h('p', { class: 'flashcard-kicker', id: 'flashcard-kicker' });
  const front = h('div', { class: 'flashcard-face', id: 'flashcard-front' });
  const back = h('div', { class: 'flashcard-face', id: 'flashcard-back', hidden: true });
  const place = h('p', { class: 'flashcard-place', id: 'flashcard-station' });
  const sourceHost = h('div', { id: 'flashcard-source' });
  const flip = h('button', { type: 'button', class: 'btn btn-primary', id: 'flashcard-flip', 'aria-expanded': 'false' }, 'Show the back');
  const prev = h('button', { type: 'button', class: 'btn', id: 'flashcard-prev' }, 'Previous');
  const next = h('button', { type: 'button', class: 'btn', id: 'flashcard-next' }, 'Next');
  const article = h('article', { class: 'flashcard', id: 'flashcard' }, kicker, front, place, back, sourceHost, h('div', { class: 'row' }, flip, prev, next));
  section.append(article);

  function show() {
    const card = cards[index];
    kicker.textContent = `Card ${index + 1} of ${cards.length}`;
    prose(front, card.front);
    prose(back, card.back);
    front.hidden = face === 'back';
    back.hidden = face !== 'back';
    flip.setAttribute('aria-expanded', String(face === 'back'));
    flip.textContent = face === 'back' ? 'Show the front' : 'Show the back';
    sourceHost.replaceChildren(sourceTag(card.source, { id: 'flashcard-source-tag' }));
    if (card.station) {
      const st = stationById(card.station);
      place.replaceChildren('Watch it at ', h('a', { href: `#${card.station}` }, st ? st.title : card.station));
    } else {
      place.replaceChildren();
    }
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    try { ctx.store.set('card-index', index); } catch { /* ignore */ }
  }

  flip.addEventListener('click', () => {
    face = face === 'front' ? 'back' : 'front';
    show();
  });
  prev.addEventListener('click', () => {
    if (index > 0) { index -= 1; face = 'front'; show(); }
  });
  next.addEventListener('click', () => {
    if (index < cards.length - 1) { index += 1; face = 'front'; show(); }
  });
  show();
  const foot = stationFooter(station, ctx);
  if (foot) section.append(foot);
}
