// Practice problems. Hint and answer stay closed until the learner asks.

import { h } from '../core/dom.js';
import { PROBLEMS } from '../registry.js';
import { stationHeader, stationFooter } from '../components/chrome.js';
import { problemCard } from '../components/practice-card.js';

export function mount(section, ctx) {
  const station = ctx.station;
  section.append(stationHeader(station, ctx));
  const chapters = [...new Set(PROBLEMS.map((p) => String(p.chapter)))];
  let chapter = 'all';
  if (ctx.preset && ctx.preset.kind === 'token' && (ctx.preset.token === 'all' || chapters.includes(ctx.preset.token))) {
    chapter = ctx.preset.token;
  }
  const filters = h('div', { class: 'chips', id: 'practice-filters', role: 'group', 'aria-label': 'Chapter' });
  const deck = h('div', { class: 'stack', id: 'practice-deck' });

  function paint() {
    deck.replaceChildren();
    const list = PROBLEMS.filter((p) => chapter === 'all' || String(p.chapter) === chapter);
    if (!list.length) {
      deck.append(h('p', { class: 'muted', text: 'No problems in this chapter.' }));
      return;
    }
    for (const p of list) {
      const open = ctx.preset && ctx.preset.kind === 'problem' && ctx.preset.id === p.id;
      deck.append(problemCard(p, { hintOpen: open, showStation: true }));
    }
  }

  function chip(id, label) {
    const b = h('button', {
      type: 'button',
      class: 'chip',
      'data-chapter': id,
      'aria-pressed': chapter === id ? 'true' : 'false',
    }, label);
    b.addEventListener('click', () => {
      chapter = id;
      for (const el of filters.querySelectorAll('.chip')) el.setAttribute('aria-pressed', el === b ? 'true' : 'false');
      paint();
    });
    return b;
  }

  filters.append(chip('all', 'All'));
  for (const c of chapters) filters.append(chip(c, c === '0' ? 'Outside the chapters' : `Chapter ${c}`));
  section.append(filters, deck);
  paint();
  const foot = stationFooter(station, ctx);
  if (foot) section.append(foot);
}
