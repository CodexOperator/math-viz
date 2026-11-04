// Test prep page: interleaved retrieval, a section walk, the memory sheet,
// and Leitner flashcards. The two existing test maps stay behind their own links.

import { h } from '../stations/test2-ui.js';
import { BOOK_CHAPTERS } from '../data/book-path.js';
import { loadCatalog, realize } from './catalog.js';
import { selectItems, sectionOfFocus, practiceEntries } from './queue.js';
import { answersMatch } from './check.js';
import { loadDeck, saveDeck, reviewCard, dueOrder, localDay } from './leitner.js';
import { renderCard, renderSheet, renderFlash } from './render.js';

const KIND_LABEL = {
  'proof-blank': 'Proof',
  'proof-mc': 'Proof',
  'next-step-blank': 'Next step',
  'next-step-mc': 'Next step',
  blank: 'Recall',
  mc: 'Recall',
  flash: 'Card',
};

function sectionTitle(chapter, section) {
  const ch = BOOK_CHAPTERS.find((c) => c.n === chapter);
  const row = ch && ch.sections.find((s) => s.id === section);
  return row ? `${row.id} ${row.title}` : `Section ${section}`;
}

function memoryGroups(items) {
  const groups = [];
  const index = new Map();
  for (const it of items) {
    if (!it.memory) continue;
    let group = index.get(it.section);
    if (!group) {
      group = {
        section: it.section,
        title: sectionTitle(it.chapter, it.section),
        lines: [],
        seen: new Set(),
      };
      index.set(it.section, group);
      groups.push(group);
    }
    if (group.seen.has(it.memory)) continue;
    group.seen.add(it.memory);
    group.lines.push({
      memory: it.memory,
      formula: it.formula || '',
      ref: it.cite.ref,
      page: it.cite.page,
    });
  }
  return groups;
}

export async function mountPrep(el, ctx, spec) {
  const section = sectionOfFocus(spec && spec.focus);
  const chapter = spec && spec.chapter;
  const PRACTICE = await loadCatalog();
  const pool = selectItems(PRACTICE, { chapter, section });
  const walk = !!(section);
  const seed = 1 + (chapter || 0);
  let mode = 'practice';
  let endless = false;
  let queue = practiceEntries(pool, { mode: walk ? 'walk' : 'prep', seed });
  let index = 0;
  let step = 0;
  let hint = 0;
  let misses = 0;
  let phase = 'ask';
  let right = false;
  let done = false;
  let deck = loadDeck(ctx.store);
  let flashShow = false;
  let flashCursor = 0;
  const today = localDay();

  const status = h('p', { class: 'book-status', id: 'practice-status' });
  const up = h('a', { class: 'station-link', id: 'practice-book', href: '#book', 'data-dir': 'prev' }, 'The Book');
  const endlessBtn = h('button', {
    type: 'button', class: 'chip', id: 'practice-endless', 'aria-pressed': 'false',
  }, 'Endless');
  const modeRow = h('div', { class: 'chips', id: 'practice-modes', role: 'group', 'aria-label': 'Test prep' });
  for (const [id, label] of [['practice', 'Practice'], ['memory', 'Memory sheet'], ['cards', 'Flashcards']]) {
    const btn = h('button', { type: 'button', class: 'chip', id: `practice-mode-${id}`, 'aria-pressed': id === mode ? 'true' : 'false' }, label);
    btn.addEventListener('click', () => {
      mode = id;
      paint();
    });
    modeRow.append(btn);
  }
  const hasGenerator = pool.some((it) => it.generator);
  if (hasGenerator) {
    endlessBtn.addEventListener('click', () => {
      endless = !endless;
      endlessBtn.setAttribute('aria-pressed', String(endless));
      paint();
    });
  }
  const stage = h('div', { class: 'practice-stage', id: 'practice-stage' });
  const indexes = h('nav', { class: 'practice-indexes', id: 'practice-indexes', 'aria-label': 'The two tests' },
    h('a', { class: 'station-link', id: 'practice-to-test1', href: '#problems' }, 'Test 1'),
    h('a', { class: 'station-link', id: 'practice-to-test2', href: '#index' }, 'Test 2'));

  function currentEntry() {
    return queue[index] || null;
  }

  function realized() {
    const entry = currentEntry();
    if (!entry) return null;
    return realize(entry.source, entry.seed || 1);
  }

  function resetStep() {
    step = 0;
    hint = 0;
    misses = 0;
    phase = 'ask';
    right = false;
  }

  function missLine(item) {
    const s = item.steps[step];
    if (s && s.hints && s.hints.length) return s.hints[0];
    return item.memory || '';
  }

  function nextSeed(source) {
    let max = 0;
    for (const entry of queue) {
      if (entry.source.id === source.id) max = Math.max(max, entry.seed || 1);
    }
    return max + 1;
  }

  function generateAnother() {
    const entry = currentEntry();
    if (!entry || !entry.source.generator) return;
    entry.seed = (entry.seed || 1) + 1;
    resetStep();
    done = false;
    paint();
  }

  function advance() {
    const entry = currentEntry();
    const item = realized();
    if (item && step < item.steps.length - 1 && phase === 'told') {
      step += 1;
      hint = 0;
      misses = 0;
      phase = 'ask';
      right = false;
      paint();
      return;
    }
    if (endless && entry && entry.source.generator) {
      generateAnother();
      return;
    }
    index += 1;
    resetStep();
    if (index >= queue.length) {
      if (endless) {
        const gens = pool.filter((it) => it.generator);
        if (gens.length) {
          const source = gens[(index) % gens.length];
          queue.push({ source, seed: nextSeed(source), view: 'faded' });
          done = false;
          paint();
          return;
        }
      }
      done = true;
    }
    paint();
  }

  function onAnswer(value) {
    const item = realized();
    if (!item || (phase !== 'ask' && phase !== 'hint')) return;
    const s = item.steps[step];
    right = answersMatch(value, s.answer, s.accept);
    if (right) {
      phase = 'told';
      paint();
      return;
    }
    misses += 1;
    phase = misses === 1 ? 'hint' : 'told';
    paint();
  }

  function paintPractice() {
    const item = realized();
    const entry = currentEntry();
    if (!item || done) {
      status.textContent = pool.length
        ? 'The set is done. The memory sheet holds the same lines.'
        : 'No items for this chapter yet.';
      if (!pool.length) {
        stage.replaceChildren(h('article', { class: 'card practice-card', id: 'practice-card' },
          h('h2', { id: 'practice-prompt' }, 'Nothing filed here yet'),
          h('p', null, 'Chapters 4 and 5, section 5.1, are the sets on this page.')));
        return;
      }
      renderCard(stage, { done: true }, { memory: () => { mode = 'memory'; paint(); } });
      return;
    }
    const where = walk ? `Section ${section}` : (chapter ? `Chapter ${chapter}` : 'Chapters 4 and 5');
    status.textContent = `${where}. ${index + 1} of ${queue.length}.`;
    renderCard(stage, {
      item,
      view: entry.view,
      step,
      hint,
      phase: entry.view === 'worked' ? 'ask' : phase,
      right,
      revealAnswer: phase === 'told' && !right,
      missLine: missLine(item),
      kindLabel: KIND_LABEL[item.kind] || 'Practice',
      count: `Step ${Math.min(step + 1, item.steps.length)} of ${item.steps.length}`,
      showGenerate: !!(item.generator && phase === 'told' && step >= item.steps.length - 1 && !endless),
      endless,
    }, {
      answer: onAnswer,
      hint: () => { hint += 1; paint(); },
      next: advance,
      generate: generateAnother,
      memory: () => { mode = 'memory'; paint(); },
    });
  }

  function paintMemory() {
    status.textContent = 'The sheet for this set. It prints without the menu.';
    renderSheet(stage, memoryGroups(pool));
  }

  function flashList() {
    const order = dueOrder(pool, deck, today);
    const fresh = order.due.filter((row) => !row.rec);
    const reviewed = order.due.filter((row) => row.rec);
    if (reviewed.length) return { rows: reviewed, early: false };
    if (fresh.length) return { rows: fresh, early: false };
    return { rows: order.later, early: order.later.length > 0 };
  }

  function paintCards() {
    const { rows, early } = flashList();
    if (!rows.length) {
      status.textContent = 'No flashcards in this set.';
      renderFlash(stage, { item: null }, {});
      return;
    }
    if (flashCursor >= rows.length) flashCursor = 0;
    const row = rows[flashCursor];
    const rec = deck.cards[row.item.id];
    const fresh = rows.every((r) => !r.rec);
    status.textContent = fresh
      ? `${flashCursor + 1} of ${rows.length}`
      : (early ? 'Nothing is due. This card is early.' : `${rows.length} due.`);
    const front = row.item.cite && row.item.cite.ref ? row.item.cite.ref : row.item.prompt;
    renderFlash(stage, {
      item: { ...row.item, prompt: front },
      show: flashShow,
      early,
      box: rec ? rec.box : 0,
      count: fresh ? `${flashCursor + 1} of ${rows.length}` : (rec ? `Box ${rec.box}` : 'New'),
    }, {
      show: () => { flashShow = true; paint(); },
      grade: (grade) => {
        deck = reviewCard(deck, row.item.id, grade, today);
        saveDeck(ctx.store, deck);
        flashShow = false;
        flashCursor += 1;
        paint();
      },
    });
  }

  function paint() {
    for (const id of ['practice', 'memory', 'cards']) {
      const btn = modeRow.querySelector(`#practice-mode-${id}`);
      if (btn) btn.setAttribute('aria-pressed', String(id === mode));
    }
    endlessBtn.hidden = !hasGenerator || mode !== 'practice';
    if (mode === 'memory') paintMemory();
    else if (mode === 'cards') paintCards();
    else paintPractice();
  }

  const lede = walk
    ? 'A worked proof, then the same proof with the steps missing, then the exercises.'
    : 'Items from more than one section, mixed. Check, then read the reason.';
  el.append(
    h('header', { class: 'station-header' },
      up,
      h('h1', { id: 'practice-title' }, 'Test prep'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Test prep'),
      h('p', { class: 'station-lede', id: 'practice-lede' }, lede)),
    h('div', { class: 'book-next', id: 'practice-next-row' }, status),
    h('div', { class: 'practice-toolbar', id: 'practice-toolbar' }, modeRow, hasGenerator ? endlessBtn : null),
    stage,
    indexes);
  paint();
  return function unmount() {};
}
