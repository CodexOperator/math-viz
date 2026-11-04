// The book roadmap and the chapter pages. Not a test map.
// Chapter 4 is the walk: one sentence, the pictures already on the site, the
// reading, and the exercises. Hints stay closed until asked. No answer key.
// Chapter 5 names its sections. Section 5.4 links the two stations that exist.
// Later chapters are nodes on the roadmap only.

import { stationById } from '../registry.js';
import { BOOK, sectionHref } from '../data/book.js';
import { BOOK_CHAPTERS, CHAPTER_4, bookChapter } from '../data/book-path.js';
import { test2ProblemById, problemMarkdown } from '../data/test2-problems.js';
import {
  BOOK_PROGRESS_KEY, blankBookProgress, sanitizeBookProgress, toggleBookFlag, sectionFinished, chapterTally,
} from '../book/progress.js';
import { chapterHash } from '../book/route.js';
import { h, appendRich, sourceTag } from './test2-ui.js';

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function loadProgress(store) {
  let raw = null;
  try { raw = store.get(BOOK_PROGRESS_KEY, null); } catch { raw = null; }
  return sanitizeBookProgress(raw, CHAPTER_4.sections);
}

function saveProgress(store, progress) {
  try { store.set(BOOK_PROGRESS_KEY, progress); } catch { /* this visit still shows the mark */ }
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

function stationChip(id, scope) {
  const st = stationById(id);
  if (!st) return null;
  return h('a', { class: 'chip', href: `#${st.id}`, id: `${scope}-to-${st.id}` }, st.title);
}

function readList(items, scope) {
  const ul = h('ul', { class: 'book-read', id: `${scope}-read` });
  items.forEach((item, i) => {
    const a = h('a', { href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}` }, item.pin);
    ul.append(h('li', null, a));
  });
  return ul;
}

function exerciseHint(section, problem) {
  if (problem && problem.hint) return problem.hint;
  const local = section.hints && section.hints[problem.id];
  return local || '';
}

function exerciseMarkdown(problem, hint) {
  if (problem.homework) return problemMarkdown(problem);
  const st = problem.station ? stationById(problem.station) : null;
  const lines = [
    `# ${problem.pin}`,
    '',
    'Howell & Mathews, Complex Analysis (202 Updated Edition).',
    '',
    '## Statement',
    problem.statement,
    '',
    '## Book',
    `[${problem.pin}](${problem.href})`,
    '',
    '## Where to look on One Point, Two Addresses',
  ];
  if (st) lines.push(`- Map stop: [${st.title}](#${st.id})`);
  lines.push(`- Chapter path: [Chapter 4](#chapter-4)`);
  lines.push('', '## Hint');
  lines.push(hint || `Work it at #${problem.station}. This export has no answer key.`);
  lines.push(
    '',
    '## Your solution',
    '',
    '(paste your work here)',
    '',
    '## Check',
    'Paste this file into an LLM and ask it to verify **your** solution against the statement.',
    'This export deliberately omits an answer key.',
    '',
  );
  return lines.join('\n');
}

export function mount(section, ctx) {
  const spec = ctx.book;
  if (!spec || spec.kind === 'roadmap') return mountRoadmap(section, ctx, spec);
  if (spec.chapter === 4) return mountChapter4(section, ctx, spec.focus);
  if (spec.chapter === 5) return mountChapter5(section, ctx, spec.focus);
  return mountRoadmap(section, ctx, { kind: 'roadmap', chapter: null, focus: null });
}

function mountRoadmap(el, ctx, spec) {
  const store = ctx.store;
  let progress = loadProgress(store);
  const tally = () => chapterTally(CHAPTER_4.sections, progress);

  const status = h('p', { class: 'book-status', id: 'book-status' });
  const walk = h('a', { class: 'btn btn-primary', id: 'book-walk', href: '#chapter-4' }, 'Walk Chapter 4');
  const list = h('ol', { class: 'book-path', id: 'book-path' });

  function paint() {
    const t = tally();
    const ch4 = bookChapter(4);
    const nextSection = ch4.sections.find((s) => s.id === t.nextId);
    if (t.complete) {
      status.textContent = `Chapter 4 is done. ${t.sectionsFinished} of ${t.sectionTotal} sections, ${t.exercisesTicked} of ${t.exerciseTotal} exercises. Chapter 5 is the next open chapter.`;
      walk.textContent = 'Open Chapter 5';
      walk.setAttribute('href', '#chapter-5');
    } else if (nextSection) {
      status.textContent = `Next is ${nextSection.id} ${nextSection.title}. ${t.sectionsFinished} of ${t.sectionTotal} sections finished, ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
      walk.textContent = 'Walk Chapter 4';
      walk.setAttribute('href', `#${chapterHash(4, nextSection.id)}`);
    }
    for (const node of list.querySelectorAll('.book-node')) {
      const n = Number(node.getAttribute('data-chapter'));
      let state = 'later';
      if (n === 4) state = t.complete ? 'done' : 'next';
      else if (n === 5) state = 'open';
      node.setAttribute('data-state', state);
      const flag = node.querySelector('.book-flag');
      if (!flag) continue;
      if (n === 4) {
        flag.textContent = t.complete ? 'Done' : 'Next';
      } else if (n === 5) flag.textContent = 'Open';
      else flag.textContent = 'Later';
    }
    for (const row of list.querySelectorAll('[data-section]')) {
      const id = row.getAttribute('data-section');
      const section = CHAPTER_4.sections.find((s) => s.id === id);
      if (!section) continue;
      const finished = sectionFinished(section, progress);
      row.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
      const mark = row.querySelector('.book-section-mark');
      if (mark) mark.textContent = finished ? 'Done' : (t.nextId === id ? 'Next' : '');
    }
  }

  for (const ch of BOOK_CHAPTERS) {
    const head = h('div', { class: 'book-node-head' },
      h('p', { class: 'book-flag', id: `book-flag-${ch.n}` }, 'Later'),
      h('h2', { id: `book-title-${ch.n}` },
        h('span', { class: 'book-num' }, String(ch.n)),
        document.createTextNode(` ${ch.title}`)),
      h('p', { class: 'book-page', id: `book-page-${ch.n}` }, `Page ${ch.page}`));
    const sections = h('ol', { class: 'book-sections', id: `book-sections-${ch.n}` });
    for (const s of ch.sections) {
      const label = `${s.id} ${s.title}`;
      const page = h('span', { class: 'book-section-page' }, `p. ${s.page}`);
      let name;
      if (ch.n === 4 || ch.n === 5) {
        name = h('a', { href: `#${chapterHash(ch.n, s.id)}` }, label);
      } else {
        name = h('span', null, label);
      }
      const mark = ch.n === 4 ? h('span', { class: 'book-section-mark' }, '') : null;
      sections.append(h('li', { 'data-section': ch.n === 4 ? s.id : null, id: `book-section-${slug(s.id)}` }, name, page, mark));
    }
    const kids = [head, sections];
    if (!ch.open && ch.door) {
      const st = stationById(ch.door);
      if (st) {
        kids.push(h('p', { class: 'book-door', id: `book-door-${ch.n}` },
          'Already drawn: ',
          h('a', { href: `#${st.id}` }, st.title),
          '.'));
      }
    }
    if (ch.n === 4) {
      kids.push(h('p', { class: 'book-node-note', id: 'book-progress-4' }, 'The assigned exercises sit on this chapter, with a hint and no solution.'));
    }
    if (ch.n === 5) {
      kids.push(h('p', { class: 'book-node-note', id: 'book-note-5' }, 'Open. The exponential and the logarithm are not drawn here yet. Section 5.4 already has two stations.'));
    }
    list.append(h('li', { class: 'book-node', id: `book-node-${ch.n}`, 'data-chapter': String(ch.n), 'data-state': 'later' }, ...kids));
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('h1', { id: 'book-title' }, 'The Book'),
      h('p', { class: 'station-lede', id: 'book-lede' }, 'Eleven chapters, in the order Howell and Mathews print them. Walk Chapter 4 until every section and every exercise on it is done.'),
      sourceTag({ pin: '202 Updated Edition, table of contents, pages i–ii', href: BOOK.html })),
    h('div', { class: 'book-next', id: 'book-next' }, status, walk),
    list);

  const focus = spec && spec.chapter;
  if (focus) {
    const node = el.querySelector(`#book-node-${focus}`);
    if (node) node.scrollIntoView({ block: 'start' });
  }

  return function unmount() {};
}

function mountChapter4(el, ctx, focus) {
  const store = ctx.store;
  let progress = loadProgress(store);
  const timers = [];

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });
  const cards = [];

  function tally() {
    return chapterTally(CHAPTER_4.sections, progress);
  }

  function paint() {
    const t = tally();
    const next = CHAPTER_4.sections.find((s) => s.id === t.nextId);
    if (!next) {
      status.textContent = `Done. ${t.sectionsFinished} of ${t.sectionTotal} sections, ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
      nextBtn.textContent = 'Back to the book';
      nextBtn.dataset.jump = 'book';
    } else {
      status.textContent = `Next is ${next.id} ${next.title}. ${t.sectionsFinished} of ${t.sectionTotal} sections finished. ${t.exercisesTicked} of ${t.exerciseTotal} exercises.`;
      nextBtn.textContent = `Go to ${next.id}`;
      nextBtn.dataset.jump = next.id;
    }
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const section = CHAPTER_4.sections.find((s) => s.id === id);
      const finished = sectionFinished(section, progress);
      const state = finished ? 'done' : (t.nextId === id ? 'next' : 'ahead');
      node.setAttribute('data-state', state);
      const btn = node.querySelector('.section-mark');
      if (btn) {
        const on = progress.sections[id] === true;
        btn.setAttribute('aria-pressed', String(on));
        btn.textContent = on ? `${id} marked` : `Mark ${id} done`;
        btn.classList.toggle('btn-primary', state === 'next' && !on);
      }
    }
    for (const card of cards) {
      const id = card.getAttribute('data-problem');
      const on = progress.exercises[id] === true;
      card._tick.setAttribute('aria-pressed', String(on));
      card._tick.textContent = on ? 'Ticked' : 'Tick';
    }
  }

  nextBtn.addEventListener('click', () => {
    const jump = nextBtn.dataset.jump;
    if (jump === 'book') {
      ctx.navigate('book');
      return;
    }
    const node = el.querySelector(`#chapter-section-${slug(jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const section of CHAPTER_4.sections) {
    const scope = `chapter-section-${slug(section.id)}`;
    const idea = h('p', { class: 'section-idea', id: `${scope}-idea` });
    appendRich(idea, section.idea);
    const pictures = h('div', { class: 'chips', id: `${scope}-pictures` });
    for (const id of section.stations) {
      const chip = stationChip(id, scope);
      if (chip) pictures.append(chip);
    }
    const mark = h('button', {
      type: 'button', class: 'btn section-mark', id: `${scope}-mark`, 'aria-pressed': 'false',
    }, `Mark ${section.id} done`);
    mark.addEventListener('click', () => {
      progress = toggleBookFlag(progress, 'sections', section.id);
      saveProgress(store, progress);
      paint();
    });
    const exerciseHost = h('div', { class: 'chapter-exercises', id: `${scope}-exercises` });
    for (const exId of section.exercises) {
      const problem = test2ProblemById(exId);
      if (!problem) continue;
      exerciseHost.append(exerciseCard(section, problem, scope, timers, () => {
        progress = toggleBookFlag(progress, 'exercises', problem.id);
        saveProgress(store, progress);
        paint();
      }));
    }
    const node = h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      idea,
      h('h3', { class: 'book-label', id: `${scope}-read-label` }, 'Read'),
      readList(section.read, scope),
      h('h3', { class: 'book-label', id: `${scope}-pictures-label` }, 'Pictures'),
      pictures,
      h('h3', { class: 'book-label', id: `${scope}-exercises-label` }, 'Exercises'),
      exerciseHost,
      mark);
    path.append(node);
  }

  function exerciseCard(section, problem, scope, timers, onTick) {
    const idSlug = slug(problem.id);
    const cardId = `chapter-card-${idSlug}`;
    const body = h('div', { id: `${cardId}-statement` });
    appendRich(body, problem.statement);
    const hintText = exerciseHint(section, problem);
    const hint = h('p', { class: 'hint-note', id: `chapter-hint-${idSlug}`, hidden: '' });
    if (hintText) appendRich(hint, hintText);
    const show = h('button', {
      type: 'button', class: 'btn', id: `chapter-show-${idSlug}`,
      'aria-expanded': 'false', 'aria-controls': `chapter-hint-${idSlug}`,
    }, 'Show the hint');
    show.addEventListener('click', () => {
      hint.hidden = false;
      show.hidden = true;
      show.setAttribute('aria-expanded', 'true');
    });
    const copy = h('button', { type: 'button', class: 'btn', id: `chapter-copy-${idSlug}` }, 'Copy Markdown');
    copy.addEventListener('click', () => {
      const markdown = exerciseMarkdown(problem, hintText);
      const finish = (ok) => {
        copy.textContent = ok ? 'Copied' : 'Copy failed';
        const timer = window.setTimeout(() => { copy.textContent = 'Copy Markdown'; }, 1600);
        timers.push(timer);
      };
      // execCommand has to run in this click turn. The clipboard promise
      // resolves later, after the browser has dropped the gesture.
      if (fallbackCopy(markdown)) {
        finish(true);
        return;
      }
      writeClipboard(markdown).then(finish);
    });
    const tick = h('button', { type: 'button', class: 'btn', id: `chapter-tick-${idSlug}`, 'aria-pressed': 'false' }, 'Tick');
    tick.addEventListener('click', onTick);
    const kids = [
      h('h3', { id: `chapter-title-${idSlug}` }, problem.pin),
      sourceTag({ pin: problem.pin, href: problem.href }),
    ];
    if (problem.homework) {
      kids.push(h('p', { class: 'homework-mark', id: `chapter-homework-${idSlug}` }, 'Homework. The hint points at a picture. No solution on this card.'));
    } else {
      kids.push(h('p', { class: 'homework-mark', id: `chapter-homework-${idSlug}` }, 'No solution on this card.'));
    }
    kids.push(body);
    const st = stationById(problem.station);
    if (st) kids.push(h('p', null, 'Picture: ', h('a', { href: `#${st.id}`, id: `${cardId}-station` }, st.title), '.'));
    if (hintText) kids.push(show, hint);
    kids.push(h('div', { class: 'problem-actions' }, copy, tick));
    const card = h('article', {
      class: 'card problem-card chapter-card', id: cardId, 'data-problem': problem.id,
      'data-homework': problem.homework || null,
    }, ...kids);
    card._tick = tick;
    cards.push(card);
    return card;
  }

  paint();

  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 4. Sequences, Series, and Fractals'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Four sections, in the order the book prints them. Mark a section when you can say its sentence, and tick an exercise when you have worked it. The hint stays closed until you ask.'),
      sourceTag({ pin: CHAPTER_4.pin, href: CHAPTER_4.href })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  if (focus) {
    const sectionNode = el.querySelector(`#chapter-section-${slug(focus)}`);
    const card = cards.find((c) => c.getAttribute('data-problem') === focus);
    const target = card || sectionNode;
    if (target) {
      target.classList.add('is-target');
      target.scrollIntoView({ block: 'start' });
    }
  }

  return function unmount() {
    for (const timer of timers) window.clearTimeout(timer);
  };
}

function mountChapter5(el, ctx, focus) {
  const ch = bookChapter(5);
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });
  for (const section of ch.sections) {
    const scope = `chapter-section-${slug(section.id)}`;
    const pictures = h('div', { class: 'chips', id: `${scope}-pictures` });
    const stations = section.stations || [];
    for (const id of stations) {
      const chip = stationChip(id, scope);
      if (chip) pictures.append(chip);
    }
    const note = stations.length
      ? 'These two stations are section 5.4. The rest of the section is not drawn on this page yet.'
      : 'Not drawn on this page yet.';
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag' }, section.id),
      h('h2', null, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      h('p', { class: 'section-idea' }, note),
      stations.length ? pictures : null));
  }
  el.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 5. Elementary Functions'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Five sections, from the exponential to the inverse functions. The exponential, the logarithm, and the powers are not drawn here yet. Section 5.4 already has the current and the impedance.'),
      sourceTag({ pin: 'Chapter 5, Elementary Functions, page 130', href: sectionHref('sec_exponential-function.html') })),
    path,
    h('p', { class: 'book-footer-link' }, h('a', { href: '#chapter-4', id: 'chapter-to-4' }, 'Chapter 4 is the walk that is open now.')));

  if (focus) {
    const node = el.querySelector(`#chapter-section-${slug(focus)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  }
  return function unmount() {};
}

export const internals = Object.freeze({ blankBookProgress, loadProgress });
