// The Test 2 problem index. Quotes, book solutions, and added checks stay in three different places.
// Ticks live under progress.test2 so they do not mix with the Test 1 handout ticks.

import { BOOK } from '../data/book.js';
import { TEST2_PROBLEMS, TEST2_GROUPS, HOMEWORK_SET, test2ProblemById, problemMarkdown } from '../data/test2-problems.js';
import { stationById, threadLabel } from '../registry.js';
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

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.append(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  area.remove();
  return ok;
}

function writeClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
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
  const openedToken = ctx.preset && ctx.preset.kind === 'token'
    ? String(ctx.preset.token).replace(/-/g, '.')
    : '';
  const openedProblem = openedToken
    ? TEST2_PROBLEMS.find((p) => p.id.toLowerCase() === openedToken.toLowerCase())
    : null;
  let scope = openedProblem ? openedProblem.scope : 'core';

  const header = h('header', { class: 'station-header' },
    h('h1', null, 'The Problem Index'),
    h('p', { class: 'muted', id: 'index-scope' },
      'The cards follow the map. Homework is the assigned set. The page opens on Core. What is left of sections 4.3 and 4.4 is Likely. Section 3.3 is Possible. A link that names a card opens that card’s scope.'),
    h('ul', { class: 'thread-badges', 'aria-label': 'Story threads that pass through this place' },
      ...(ctx.station.threads || []).map((tid) => {
        const th = (ctx.threads || []).find((t) => t.id === tid);
        return th ? h('li', null, h('span', { class: 'thread-badge', 'data-thread': tid, title: th.summary }, threadLabel(th))) : null;
      })));
  const preface = h('div', { class: 'station-header' },
    h('p', { class: 'station-lede', id: 'index-fates' },
      'The words on the flat paper are settles, stays, leaves, or which root. Settles and stays are blue. Leaves is orange. Which root is the colour of the pin. Orange on a landing means the walk left. Orange on a pin means that root. c is a hollow square. There is no fifth colour. ',
      h('a', { href: '#paper', id: 'index-open-paper' }, 'Open the flat paper'),
      '.'),
    h('p', null,
      `${BOOK.attribution} A block marked “what the book prints” is in the text. A block marked “Check (added)” was worked for this site and checked here. It is not an official answer. A Homework card has a hint and no solution.`),
    sourceTag({ pin: '202 Updated Edition, contents', href: BOOK.html }));

  const groupChips = h('div', { class: 'chips', id: 'index-groups', role: 'group', 'aria-label': 'Which group' });
  const scopeChips = h('div', { class: 'chips', id: 'index-scopes', role: 'group', 'aria-label': 'Which scope' });
  const count = h('p', { class: 'muted', id: 'index-count' });
  const list = h('div', { id: 'index-list' });

  const cards = TEST2_PROBLEMS.map((p) => {
    const st = stationById(p.station);
    const body = h('div');
    appendRich(body, p.statement);
    const threadId = (p.threads || [])[0] || '';
    const kids = [
      h('div', { class: 'row' },
        h('h3', { id: `index-title-${p.id.replace(/\./g, '-')}` }, p.pin),
        threadId ? h('span', { class: 'thread-badge', 'data-thread': threadId }, threadLabel(threadId)) : null),
      h('p', { class: 'source-tag' }, p.quoted ? 'Quoted from the 202 Updated Edition. ' : 'The prompt below is shortened or paraphrased. The link has the book’s wording. '),
      sourceTag({ pin: p.pin, href: p.href }),
    ];
    const banner = scopeBanner(p.scope);
    if (banner) kids.push(banner);
    if (p.homework) kids.push(h('p', { class: 'homework-mark', id: `index-homework-${p.id.replace(/\./g, '-')}` }, 'Homework. Hint only. No solution on this card.'));
    kids.push(body);
    if (st) kids.push(h('p', null, 'Work it at ', h('a', { href: `#${st.id}` }, st.title), '.'));
    if (p.hint) {
      const hint = h('p', { class: 'hint-note', id: `index-hint-${p.id.replace(/\./g, '-')}` });
      appendRich(hint, p.hint);
      kids.push(hint);
    }
    if (p.book) kids.push(revealBox('Show what the book prints', p.book, 'book-answer', `index-book-${p.id.replace(/\./g, '-')}`));
    if (p.added) kids.push(revealBox('Show the check added for this site', p.added, 'added-check', `index-added-${p.id.replace(/\./g, '-')}`));
    const slug = p.id.replace(/\./g, '-');
    const copy = h('button', { type: 'button', class: 'btn', id: `index-copy-${slug}` }, 'Copy Markdown');
    let copyTimer = 0;
    copy.addEventListener('click', () => {
      const markdown = problemMarkdown(p);
      writeClipboard(markdown).then((ok) => {
        copy.textContent = ok ? 'Copied' : 'Copy failed';
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(() => { copy.textContent = 'Copy Markdown'; }, 1600);
      });
    });
    const tick = h('button', { type: 'button', class: 'btn', id: `index-tick-${slug}`, 'aria-pressed': 'false' }, 'Tick');
    tick.addEventListener('click', () => {
      const on = ticks[p.id] !== true;
      if (on) ticks[p.id] = true;
      else delete ticks[p.id];
      try { store.set(KEY, ticks); } catch { /* the tick still shows for this visit */ }
      paint();
    });
    kids.push(h('div', { class: 'problem-actions' }, copy, tick));
    const card = h('article', {
      class: 'card problem-card', id: `index-card-${p.id.replace(/\./g, '-')}`,
      'data-group': p.group, 'data-scope': p.scope, 'data-problem': p.id,
      'data-homework': p.homework || null,
      'data-thread': threadId || null,
    }, ...kids);
    card._tick = tick;
    return card;
  });

  function paint() {
    let shown = 0;
    for (const card of cards) {
      const p = test2ProblemById(card.getAttribute('data-problem'));
      const okGroup = group === 'all' || (group === 'homework' ? p.homework === HOMEWORK_SET : p.group === group);
      const okScope = scope === 'all' || p.scope === scope;
      const on = okGroup && okScope;
      card.hidden = !on;
      if (on) shown += 1;
      const ticked = ticks[p.id] === true;
      card._tick.setAttribute('aria-pressed', String(ticked));
      card._tick.textContent = ticked ? 'Ticked' : 'Tick';
    }
    const tickedN = TEST2_PROBLEMS.filter((p) => ticks[p.id]).length;
    const which = group === 'homework' ? ' Homework.' : '';
    count.textContent = `${shown} shown.${which} Ticked ${tickedN} of ${TEST2_PROBLEMS.length}.`;
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

  let scopeBtns = [];
  const groupBtns = chipRow(groupChips, TEST2_GROUPS, (id) => {
    group = id;
    if (id === 'homework') {
      scope = 'all';
      scopeBtns.forEach((btn, i) => btn.setAttribute('aria-pressed', String(i === 0)));
    }
  }, 'index-filter');
  scopeBtns = chipRow(scopeChips, [
    { id: 'all', label: 'Any scope' },
    { id: 'core', label: 'Core' },
    { id: 'likely', label: 'Likely' },
    { id: 'possible', label: 'Possible' },
  ], (id) => { scope = id; }, 'index-scope-filter');
  groupBtns[0].setAttribute('aria-pressed', 'true');
  const scopeIndex = ['all', 'core', 'likely', 'possible'].indexOf(scope);
  scopeBtns[scopeIndex].setAttribute('aria-pressed', 'true');

  for (const card of cards) list.append(card);
  paint();

  el.append(header,
    h('section', { class: 'panel', 'aria-labelledby': 'index-filter-title' },
      h('h2', { id: 'index-filter-title' }, 'Filter'),
      groupChips, scopeChips, count),
    list,
    preface,
    placeLinks('index'));

  if (openedProblem) {
    const card = cards.find((c) => c.getAttribute('data-problem') === openedProblem.id);
    if (card) {
      card.classList.add('is-target');
      card.scrollIntoView({ block: 'start' });
    }
  }

  return function unmount() {};
}
