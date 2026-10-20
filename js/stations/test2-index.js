// The Test 2 problem index. Quotes, book solutions, and added checks stay in three different places.
// Ticks live under progress.test2 so they do not mix with the Test 1 handout ticks.

import { BOOK } from '../data/book.js';
import { TEST2_PROBLEMS, TEST2_GROUPS, test2ProblemById } from '../data/test2-problems.js';
import { stationById } from '../registry.js';
import { h, appendRich, sourceTag, scopeBanner, placeLinks } from './test2-ui.js';

const KEY = 'progress.test2';

function loadTicks(store) {
  let raw = {};
  try { raw = store.get(KEY, {}) || {}; } catch { raw = {}; }
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(raw)) if (raw[id] === true && test2ProblemById(id)) out[id] = true;
  }
  return out;
}

function revealBox(label, text, className, id) {
  const box = h('div', { class: className, id, hidden: '' });
  appendRich(box, text);
  const btn = h('button', { type: 'button', class: 'btn', 'aria-controls': id }, label);
  btn.addEventListener('click', () => {
    box.hidden = false;
    btn.hidden = true;
  });
  return h('div', null, btn, box);
}

export function mount(el, ctx) {
  const store = ctx.store;
  let ticks = loadTicks(store);
  let group = 'all';
  let scope = 'all';

  const header = h('header', { class: 'station-header' },
    h('h1', null, 'The Problem Index'),
    h('p', { class: 'scope-banner', id: 'index-scope', 'data-scope': 'note' },
      'Scope based on Chapter 4; confirm with your syllabus. Sections 4.1 and 4.2 are the core. Sections 4.3 and 4.4 are marked likely. Section 3.3 is marked possible.'),
    h('p', { class: 'station-lede' },
      `${BOOK.attribution} A block marked “what the book prints” is in the text. A block marked “Check (added)” was worked for this site and checked here. It is not an official answer.`),
    sourceTag({ pin: 'HTML edition, contents', href: BOOK.html }));

  const groupChips = h('div', { class: 'chips', id: 'index-groups', role: 'group', 'aria-label': 'Which group' });
  const scopeChips = h('div', { class: 'chips', id: 'index-scopes', role: 'group', 'aria-label': 'Which scope' });
  const count = h('p', { class: 'muted', id: 'index-count' });
  const list = h('div', { id: 'index-list' });

  const cards = TEST2_PROBLEMS.map((p) => {
    const st = stationById(p.station);
    const body = h('div');
    appendRich(body, p.statement);
    const kids = [
      h('h3', { id: `index-title-${p.id.replace(/\./g, '-')}` }, p.pin),
      h('p', { class: 'source-tag' }, p.quoted ? 'Quoted from the HTML edition. ' : 'The prompt below is shortened or paraphrased. The link has the book’s wording. '),
      sourceTag({ pin: p.pin, href: p.href }),
    ];
    const banner = scopeBanner(p.scope);
    if (banner) kids.push(banner);
    kids.push(body);
    if (st) kids.push(h('p', null, 'Work it at ', h('a', { href: `#${st.id}` }, st.title), '.'));
    if (p.book) kids.push(revealBox('Show what the book prints', p.book, 'book-answer', `index-book-${p.id.replace(/\./g, '-')}`));
    if (p.added) kids.push(revealBox('Show the check added for this site', p.added, 'added-check', `index-added-${p.id.replace(/\./g, '-')}`));
    const tick = h('button', { type: 'button', class: 'btn', id: `index-tick-${p.id.replace(/\./g, '-')}`, 'aria-pressed': 'false' }, 'Tick');
    tick.addEventListener('click', () => {
      const on = ticks[p.id] !== true;
      if (on) ticks[p.id] = true;
      else delete ticks[p.id];
      try { store.set(KEY, ticks); } catch { /* the tick still shows for this visit */ }
      paint();
    });
    kids.push(tick);
    const card = h('article', {
      class: 'card problem-card', id: `index-card-${p.id.replace(/\./g, '-')}`,
      'data-group': p.group, 'data-scope': p.scope, 'data-problem': p.id,
    }, ...kids);
    card._tick = tick;
    return card;
  });

  function paint() {
    let shown = 0;
    for (const card of cards) {
      const p = test2ProblemById(card.getAttribute('data-problem'));
      const okGroup = group === 'all' || p.group === group;
      const okScope = scope === 'all' || p.scope === scope;
      const on = okGroup && okScope;
      card.hidden = !on;
      if (on) shown += 1;
      const ticked = ticks[p.id] === true;
      card._tick.setAttribute('aria-pressed', String(ticked));
      card._tick.textContent = ticked ? 'Ticked' : 'Tick';
    }
    const tickedN = TEST2_PROBLEMS.filter((p) => ticks[p.id]).length;
    count.textContent = `${shown} shown. Ticked ${tickedN} of ${TEST2_PROBLEMS.length}.`;
  }

  function chipRow(host, items, set, idPrefix) {
    const buttons = [];
    items.forEach((item) => {
      const b = h('button', { type: 'button', class: 'chip', id: `${idPrefix}-${item.id}`, 'aria-pressed': 'false' }, item.label);
      b.addEventListener('click', () => {
        set(item.id);
        buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn === b)));
        paint();
      });
      buttons.push(b);
      host.append(b);
    });
    return buttons;
  }

  const groupBtns = chipRow(groupChips, TEST2_GROUPS, (id) => { group = id; }, 'index-filter');
  const scopeBtns = chipRow(scopeChips, [
    { id: 'all', label: 'Any scope' },
    { id: 'core', label: 'Core' },
    { id: 'likely', label: 'Likely' },
    { id: 'possible', label: 'Possible' },
  ], (id) => { scope = id; }, 'index-scope-filter');
  groupBtns[0].setAttribute('aria-pressed', 'true');
  scopeBtns[0].setAttribute('aria-pressed', 'true');

  for (const card of cards) list.append(card);
  paint();

  el.append(header,
    h('section', { class: 'panel', 'aria-labelledby': 'index-filter-title' },
      h('h2', { id: 'index-filter-title' }, 'Filter'),
      groupChips, scopeChips, count),
    list,
    placeLinks('index'));

  return function unmount() {};
}
