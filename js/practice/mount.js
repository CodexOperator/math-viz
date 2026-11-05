// Test prep page: interleaved retrieval, a section walk, the memory sheet,
// and Leitner flashcards. The two existing test maps stay behind their own links.

import { h, appendRich } from '../stations/test2-ui.js';
import { BOOK_CHAPTERS, CHAPTER_4, CHAPTER_5 } from '../data/book-path.js';
import { closedChapters } from '../book/continue.js';
import { loadCatalog, realize } from './catalog.js';
import { selectItems, sectionOfFocus, practiceEntries, choiceSeed, mixedItems, orderSectionReload } from './queue.js';
import { answersMatch } from './check.js';
import { loadDeck, saveDeck, reviewCard, dueOrder, localDay } from './leitner.js';
import { loadMisses, saveMisses, noteMiss, clearMiss, pendingMisses } from './misses.js';
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

function chaptersPhrase(items) {
  const nums = [...new Set(items.map((it) => it.chapter))].sort((a, b) => a - b);
  if (nums.length === 0) return '';
  if (nums.length === 1) return `Chapter ${nums[0]}`;
  const body = nums.length === 2
    ? `${nums[0]} and ${nums[1]}`
    : `${nums.slice(0, -1).join(', ')}, and ${nums[nums.length - 1]}`;
  return `Chapters ${body}`;
}

function sectionTitle(chapter, section) {
  const ch = BOOK_CHAPTERS.find((c) => c.n === chapter);
  const row = ch && ch.sections.find((s) => s.id === section);
  return row ? `${row.id} ${row.title}` : `Section ${section}`;
}

function sectionIdea(chapter, section) {
  const sections = chapter === 4 ? CHAPTER_4.sections : chapter === 5 ? CHAPTER_5.sections : null;
  const row = sections && sections.find((s) => s.id === section);
  return row && row.idea ? row.idea : '';
}

function practiceFacts(items) {
  const lines = [];
  const seen = new Set();
  for (const it of items) {
    if (!it || it.kind === 'flash' || !it.memory || seen.has(it.memory)) continue;
    seen.add(it.memory);
    lines.push(it.memory);
  }
  return lines;
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
  el.classList.add('practice-mount');
  const section = sectionOfFocus(spec && spec.focus);
  const chapter = spec && spec.chapter;
  const PRACTICE = await loadCatalog();
  const closed = closedChapters();
  const scoped = selectItems(PRACTICE, { chapter, section });
  const pool = (chapter || section) ? scoped : mixedItems(scoped, closed);
  const walk = !!(section);
  function drawSeed() {
    const n = Math.floor(Math.random() * 2147483646) + 1;
    return n;
  }
  let seed = drawSeed();
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
  let shown = false;
  let stickTop = true;
  let listed = 0;
  let reordered = false;
  let deck = loadDeck(ctx.store);
  let missesBook = loadMisses(ctx.store);
  let flashShow = false;
  let cardIds = null;
  let cardPos = 0;
  let pileIndex = 0;
  let pileTotal = 0;
  const today = localDay();

  const status = h('p', { class: 'book-status', id: 'practice-status' });
  const statusRow = h('div', { class: 'book-next', id: 'practice-next-row' }, status);
  const sectionChapter = chapter || (section ? Number(String(section).split('.')[0]) : null);
  const upToChapter = !!(section && (sectionChapter === 4 || sectionChapter === 5));
  const up = h('a', {
    class: 'station-link', id: 'practice-book', 'data-dir': 'prev',
    href: upToChapter ? `#chapter-${sectionChapter}` : '#book',
  }, upToChapter ? `Chapter ${sectionChapter}` : 'The Book');
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
  const newSet = h('button', { type: 'button', class: 'chip', id: 'practice-new-set' }, 'New set');
  newSet.addEventListener('click', () => {
    let next = drawSeed();
    if (next === seed) next = (seed % 2147483646) + 1;
    seed = next;
    queue = practiceEntries(pool, { mode: walk ? 'walk' : 'prep', seed });
    restorePending();
    index = 0;
    openEntry();
    done = false;
    shown = false;
    mode = 'practice';
    cardIds = null;
    paint();
  });
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

  function openEntry() {
    resetStep();
    const entry = currentEntry();
    if (!entry) {
      done = true;
      listed = queue.length;
      stickTop = true;
      return;
    }
    if (Number.isInteger(entry.step) && (entry.reask || entry.resume)) step = entry.step;
    const item = realized();
    if (item && entry.resume && step >= item.steps.length) {
      index += 1;
      openEntry();
      return;
    }
    listed = queue.length;
    stickTop = true;
  }

  function stepReturns() {
    const entry = currentEntry();
    if (!entry) return false;
    return queue.some((row) => row !== entry && row.reask && row.source.id === entry.source.id && row.step === step);
  }

  // A reload of a section set opens the missed blank. The mixed set keeps its order.
  function hoistPending() {
    if (!walk) return;
    const next = orderSectionReload(queue);
    const moved = next.length !== queue.length || next.some((entry, i) => entry !== queue[i]);
    if (!moved) return;
    queue = next;
    reordered = true;
    index = 0;
  }

  // After a reload, the count is the missed blank and the steps still ahead.
  // The worked line sits behind those cards and joins the count when you reach it.
  function shownTotal() {
    const total = listed || queue.length;
    if (!reordered) return total;
    let last = queue.length;
    while (last > 0 && queue[last - 1].view === 'worked') last -= 1;
    const ahead = last || queue.length;
    if (index < ahead) return ahead;
    return queue.length;
  }

  function scheduleReask(source, stepIndex, itemSeed) {
    if (!source) return;
    if (queue.some((entry) => entry.reask && entry.source.id === source.id && entry.step === stepIndex)) return;
    queue.push({
      source,
      seed: itemSeed || 1,
      view: 'faded',
      reask: true,
      step: stepIndex,
    });
  }

  function restorePending() {
    for (const pending of pendingMisses(missesBook)) {
      const source = pool.find((it) => it.id === pending.id);
      if (!source) continue;
      const prior = queue.find((entry) => entry.source.id === pending.id && !entry.reask);
      scheduleReask(source, pending.step, prior ? prior.seed : 1);
    }
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
    stickTop = true;
    done = false;
    paint();
  }

  function advance() {
    const entry = currentEntry();
    const item = realized();
    if (entry && entry.view === 'worked' && item && step < item.steps.length - 1) {
      step += 1;
      hint = 0;
      misses = 0;
      phase = 'ask';
      right = false;
      stickTop = true;
      paint();
      return;
    }
    if (item && !(entry && entry.reask) && step < item.steps.length - 1 && phase === 'told') {
      step += 1;
      hint = 0;
      misses = 0;
      phase = 'ask';
      right = false;
      stickTop = true;
      paint();
      return;
    }
    if (endless && entry && entry.view !== 'worked' && !entry.reask && entry.source.generator) {
      generateAnother();
      return;
    }
    index += 1;
    if (index >= queue.length) {
      if (endless) {
        const gens = pool.filter((it) => it.generator);
        if (gens.length) {
          const source = gens[(index) % gens.length];
          queue.push({ source, seed: nextSeed(source), view: 'faded' });
          openEntry();
          done = false;
          paint();
          return;
        }
      }
      done = true;
      paint();
      return;
    }
    openEntry();
    done = false;
    paint();
  }

  function onAnswer(value) {
    const entry = currentEntry();
    const item = realized();
    if (!item || (phase !== 'ask' && phase !== 'hint')) return;
    const s = item.steps[step];
    right = answersMatch(value, s.answer, s.accept);
    if (right) {
      phase = 'told';
      if (entry && entry.reask) {
        missesBook = clearMiss(missesBook, item.id, step);
        saveMisses(ctx.store, missesBook);
      }
      paint();
      return;
    }
    misses += 1;
    missesBook = noteMiss(missesBook, item.id, step);
    saveMisses(ctx.store, missesBook);
    if (entry) scheduleReask(entry.source, step, entry.seed);
    if (misses === 1) {
      phase = 'hint';
      if (hint < 1 && s.hints && s.hints.length) hint = 1;
    } else {
      phase = 'told';
      shown = true;
    }
    paint();
  }

  function paintPractice() {
    const item = realized();
    const entry = currentEntry();
    const where = walk ? `Section ${section}` : (chapter ? `Chapter ${chapter}` : chaptersPhrase(pool));
    if (!item || done) {
      status.textContent = pool.length
        ? `${where}.`
        : 'No items for this chapter yet.';
      if (!pool.length) {
        const filed = chaptersPhrase(mixedItems(PRACTICE, closed));
        const whereElse = filed
          ? `${filed} ${filed.startsWith('Chapters') ? 'are' : 'is'} on the mixed Test prep page.`
          : 'Nothing is filed for this set yet.';
        stage.replaceChildren(h('article', { class: 'card practice-card', id: 'practice-card' },
          h('h2', { id: 'practice-prompt' }, 'Nothing filed here yet'),
          h('p', null, whereElse)));
        return;
      }
      renderCard(stage, { done: true, facts: practiceFacts(pool), shown }, { memory: () => { mode = 'memory'; paint(); } });
      return;
    }
    status.textContent = `${where}. ${index + 1} of ${shownTotal()}.`;
    const proof = String(item.kind).startsWith('proof');
    renderCard(stage, {
      item,
      view: entry.view,
      step,
      hint,
      phase: entry.view === 'worked' ? 'ask' : phase,
      right,
      revealAnswer: phase === 'told',
      missLine: missLine(item),
      returns: phase === 'hint' && misses === 1 && stepReturns(),
      reading: entry.view === 'worked' && proof ? sectionIdea(item.chapter, item.section) : '',
      choiceSeed: choiceSeed(entry.seed || 1, item.id, step),
      kindLabel: KIND_LABEL[item.kind] || 'Practice',
      count: `Step ${Math.min(step + 1, item.steps.length)} of ${item.steps.length}`,
      showGenerate: !!(item.generator && phase === 'told' && step >= item.steps.length - 1 && !endless),
      endless,
    }, {
      answer: onAnswer,
      hint: () => { hint += 1; paint(); },
      next: advance,
      generate: generateAnother,
      focus: pinAnswer,
      memory: () => { mode = 'memory'; paint(); },
    });
  }

  function liveConceal() {
    if (done) return null;
    const entry = currentEntry();
    const item = realized();
    if (!entry || !item || entry.view === 'worked' || phase === 'told') return null;
    const s = item.steps[step];
    if (!s) return null;
    return { answer: s.answer, accept: s.accept || [] };
  }

  function paintMemory() {
    status.textContent = 'The sheet for this set. It prints without the menu.';
    renderSheet(stage, memoryGroups(pool), liveConceal());
  }

  function flashList() {
    const order = dueOrder(pool, deck, today);
    const fresh = order.due.filter((row) => !row.rec);
    const reviewed = order.due.filter((row) => row.rec);
    if (reviewed.length || fresh.length) return { rows: reviewed.concat(fresh), early: false };
    return { rows: order.later, early: order.later.length > 0 };
  }

  function paintCards() {
    if (!cardIds) {
      const { rows } = flashList();
      cardIds = rows.map((row) => row.item.id);
      cardPos = 0;
      pileIndex = 0;
      pileTotal = cardIds.length;
    }
    if (!cardIds.length) {
      status.textContent = '';
      renderFlash(stage, { item: null }, {});
      return;
    }
    if (cardPos >= cardIds.length) {
      cardPos = 0;
      pileIndex = 0;
      pileTotal = cardIds.length;
    }
    const item = pool.find((it) => it.id === cardIds[cardPos]);
    if (!item) return;
    const rec = deck.cards[item.id];
    const total = Math.max(pileTotal, pileIndex + 1);
    const count = `${pileIndex + 1} of ${total}`;
    status.textContent = '';
    renderFlash(stage, {
      item,
      show: flashShow,
      early: false,
      box: rec ? rec.box : 0,
      count,
    }, {
      show: () => { flashShow = true; paint(); },
      grade: (grade) => {
        deck = reviewCard(deck, item.id, grade, today);
        saveDeck(ctx.store, deck);
        flashShow = false;
        if (grade === 'again') {
          const id = cardIds[cardPos];
          cardIds.splice(cardPos, 1);
          cardIds.push(id);
        } else {
          cardPos += 1;
        }
        pileIndex += 1;
        paint();
      },
    });
  }

  function paint() {
    for (const id of ['practice', 'memory', 'cards']) {
      const btn = modeRow.querySelector(`#practice-mode-${id}`);
      if (btn) btn.setAttribute('aria-pressed', String(id === mode));
    }
    const entryNow = currentEntry();
    const endlessHere = !!(mode === 'practice' && !done && entryNow
      && entryNow.view !== 'worked' && !entryNow.reask && entryNow.source.generator);
    endlessBtn.hidden = !endlessHere;
    newSet.hidden = mode !== 'practice';
    statusRow.hidden = mode === 'cards';
    if (mode === 'memory') paintMemory();
    else if (mode === 'cards') paintCards();
    else paintPractice();
    const entry = currentEntry();
    if (mode === 'cards') setLede(flashShow ? 'Again, or got it.' : 'Show the back.');
    else if (mode === 'memory') setLede('The formulas and the one-line versions.');
    else if (done || !entry) setLede(doneLede());
    else if (entry.view === 'worked') setLede('Read this filled line.');
    else setLede('Check, then read the reason.');
    if (stickTop && mode === 'practice') {
      stickTop = false;
      const scroller = document.scrollingElement || document.documentElement;
      if (scroller) scroller.scrollTop = 0;
    }
    if (mode === 'practice' && phase === 'ask' && !(entry && entry.view === 'worked')) {
      requestAnimationFrame(() => fitAnswer());
    }
    if (mode === 'practice' && (phase === 'hint' || phase === 'told')) {
      requestAnimationFrame(() => {
        const node = stage.querySelector('#practice-hint')
          || stage.querySelector('#practice-next')
          || stage.querySelector('#practice-hint-note')
          || stage.querySelector('#practice-why')
          || stage.querySelector('#practice-verdict');
        revealInView(node);
      });
    }
  }

  function doneLede() {
    const facts = practiceFacts(pool);
    if (!pool.length) return 'Check, then read the reason.';
    if (facts.length === 1) return facts[0];
    if (shown) return 'These lines were shown.';
    if (facts.length) return 'The facts from this set.';
    return 'Set complete.';
  }

  function setLede(text) {
    lede.replaceChildren();
    appendRich(lede, text || '');
  }

  function fitAnswer() {
    const choices = [...stage.querySelectorAll('.practice-choice')];
    const checkBtn = stage.querySelector('#practice-check');
    const hintBtn = stage.querySelector('#practice-hint');
    const candidates = choices.length ? [choices[choices.length - 1]] : [checkBtn, hintBtn].filter(Boolean);
    const check = candidates.reduce((low, node) => (
      !low || node.getBoundingClientRect().bottom > low.getBoundingClientRect().bottom ? node : low
    ), null);
    if (!check) return;
    const header = document.getElementById('site-header');
    const topLimit = (header ? header.getBoundingClientRect().bottom : 0) + 8;
    const vv = window.visualViewport;
    const bottomLimit = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 12;
    const over = check.getBoundingClientRect().bottom - bottomLimit;
    if (over > 0) window.scrollBy(0, Math.ceil(over));
    const step = stage.querySelector('.practice-step-text');
    if (!step) return;
    const gap = topLimit - step.getBoundingClientRect().top;
    if (gap > 0) {
      const room = bottomLimit - check.getBoundingClientRect().bottom;
      if (room > 0) window.scrollBy(0, -Math.min(gap, room));
    }
  }

  function revealInView(node) {
    if (!node || typeof node.getBoundingClientRect !== 'function') return;
    const header = document.getElementById('site-header');
    const topLimit = (header ? header.getBoundingClientRect().bottom : 0) + 8;
    const vv = window.visualViewport;
    const bottomLimit = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 8;
    const rect = node.getBoundingClientRect();
    if (rect.bottom > bottomLimit) window.scrollBy(0, Math.ceil(rect.bottom - bottomLimit));
    const next = node.getBoundingClientRect();
    if (next.top < topLimit) window.scrollBy(0, Math.floor(next.top - topLimit));
  }

  function pinAnswer() {
    const run = () => {
      const input = stage.querySelector('#practice-input');
      const check = stage.querySelector('#practice-check');
      if (!input || !check || document.activeElement !== input) return;
      revealInView(check);
      const header = document.getElementById('site-header');
      const topLimit = (header ? header.getBoundingClientRect().bottom : 0) + 8;
      const inputTop = input.getBoundingClientRect().top;
      if (inputTop < topLimit) {
        const vv = window.visualViewport;
        const bottomLimit = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 8;
        const shift = inputTop - topLimit;
        if (check.getBoundingClientRect().bottom + shift <= bottomLimit) window.scrollBy(0, shift);
      }
    };
    requestAnimationFrame(run);
    setTimeout(run, 280);
  }

  const onResize = () => pinAnswer();
  window.addEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  const lede = h('p', { class: 'station-lede', id: 'practice-lede' });
  el.append(
    h('header', { class: 'station-header' },
      up,
      h('h1', { id: 'practice-title' }, 'Test prep'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Test prep'),
      lede),
    statusRow,
    h('div', { class: 'practice-toolbar', id: 'practice-toolbar' }, modeRow, newSet, hasGenerator ? endlessBtn : null),
    stage,
    indexes);
  restorePending();
  hoistPending();
  openEntry();
  paint();
  return function unmount() {
    window.removeEventListener('resize', onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
  };
}
