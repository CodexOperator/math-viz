// The book roadmap, Chapter 4, and the Chapter 5 walk under the exponential.
// Continue, the up link, and Test prep are the shared shell. A section is
// finished when its exercises are ticked. Chapter 4's tick waits until its
// picture has been opened. Hints stay closed. No answer key on these cards.

import { BOOK, sectionHref } from '../data/book.js';
import {
  shellChapters, CHAPTER_4, CHAPTER_5, bookChapter, chapter4ExerciseIds, chapter5ExerciseIds,
  CHAPTER_PICTURE, pictureHref, SECTION_DOOR, stageNext, activeWalk, OPEN_CHAPTERS,
} from '../data/book-path.js';
import { test2ProblemById } from '../data/test2-problems.js';
import {
  loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally,
  justFinished,
} from '../book/progress.js';
import { continueSentence, continueTarget, walkSections } from '../book/continue.js';
import { chapterHash, prepHash } from '../book/route.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountExpPicture } from './exp-picture.js';
import { mountPrep } from '../practice/mount.js';
import { paintSetStill } from '../book/stills.js';
import { PRACTICE } from '../practice/catalog.js';
import { answersMatch } from '../practice/check.js';

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function tickOwned(id) {
  return !!test2ProblemById(id) || chapter5ExerciseIds().includes(id);
}

function ticksOf(store) {
  return loadSharedTicks(store, tickOwned, chapter4ExerciseIds());
}

function upLink(id, href, label) {
  return h('a', { class: 'station-link', id, href, 'data-dir': 'prev' }, label);
}

function exerciseHint(section, problem) {
  if (problem && problem.hint) return problem.hint;
  const local = section.hints && section.hints[problem.id];
  return local || '';
}

function linkAttrs(href, id) {
  const attrs = { href };
  if (id) attrs.id = id;
  if (/^https?:/.test(href)) {
    attrs.target = '_blank';
    attrs.rel = 'noopener noreferrer';
  }
  return attrs;
}

function ch4Name(id) {
  const problem = test2ProblemById(id);
  return problem ? problem.pin : id;
}

function ch5Name(id) {
  const card = CHAPTER_5.cards[id];
  return card ? card.pin : id;
}

function writeStatus(el, tally, nameOf, stage) {
  el.dataset.ticked = String(tally.exercisesTicked);
  el.dataset.total = String(tally.exerciseTotal);
  el.dataset.next = tally.nextExercise || '';
  el.replaceChildren();
  if (stage && stage.summit) {
    const sentence = h('span', { class: 'chapter-summit' });
    appendRich(sentence, stage.summit);
    el.append(sentence);
    const next = stageNext(stage.id);
    if (next && next.href && !next.later) {
      const attrs = linkAttrs(next.href, `${el.id}-next`);
      el.append(document.createTextNode(' Next is '));
      el.append(h('a', attrs, next.label));
      el.append(document.createTextNode('.'));
    } else if (next && next.label) {
      el.append(document.createTextNode(` ${next.label}`));
    }
    el.append(document.createTextNode(' '));
  } else if (tally.complete) {
    el.append(document.createTextNode('Done. '));
  } else {
    el.append(document.createTextNode(`Next is ${nameOf(tally.nextExercise)}. `));
  }
  el.append(document.createTextNode(`${tally.exercisesTicked} of ${tally.exerciseTotal} exercises.`));
}

function sectionList(ch) {
  if (ch.n === 4) return CHAPTER_4.sections;
  if (ch.n === 5) return bookChapter(5).sections;
  return ch.sections || [];
}

function fmtPair(re, im) {
  const n = (v) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(2));
  if (n(im) === '0') return n(re);
  return `${n(re)} ${im < 0 ? '−' : '+'} ${n(Math.abs(im))}i`;
}

function sequenceTerms(re, im, count) {
  const lines = [];
  let p = { re, im };
  for (let k = 1; k <= count; k++) {
    lines.push(fmtPair(p.re, p.im));
    p = { re: p.re * re - p.im * im, im: p.re * im + p.im * re };
  }
  return lines;
}

function orbitFromZero(cRe, cIm, count) {
  const lines = ['0'];
  let z = { re: 0, im: 0 };
  for (let k = 0; k < count; k++) {
    z = {
      re: z.re * z.re - z.im * z.im + cRe,
      im: 2 * z.re * z.im + cIm,
    };
    lines.push(fmtPair(z.re, z.im));
  }
  return lines;
}

function miniBlank(id, prompt, answer, accept, onRight) {
  const line = h('p', { class: 'exp-blank', id });
  appendRich(line, prompt);
  const input = h('input', {
    id: `${id}-input`, type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your answer',
  });
  const check = h('button', { type: 'button', class: 'btn', id: `${id}-check` }, 'Check');
  const note = h('p', { class: 'chapter-need', id: `${id}-note`, hidden: '' });
  check.addEventListener('click', () => {
    if (answersMatch(input.value, answer, accept)) {
      note.hidden = true;
      check.disabled = true;
      input.disabled = true;
      onRight();
      return;
    }
    note.hidden = false;
    note.textContent = 'Not that line.';
  });
  return h('div', { class: 'chapter-blank-work', id: `${id}-work` }, line, input, h('div', { class: 'problem-actions' }, check), note);
}

function stageMemory(sectionId) {
  const flash = PRACTICE.find((it) => it.id === `ch4-${sectionId}-stage-flash` || it.id === `ch5-${sectionId}-stage-flash`);
  const host = h('div', { class: 'card', id: `chapter-memory-${slug(sectionId)}` });
  if (!flash) return host;
  host.append(
    h('h3', null, `${flash.cite.ref}, page ${flash.cite.page}`),
    h('p', { class: 'book-page' }, 'Howell & Mathews, Complex Analysis, 202 Updated Edition.'),
  );
  const ol = h('ol');
  for (const step of String(flash.memory || '').split(/\s(?=\d+\.\s)/)) {
    const li = h('li');
    appendRich(li, step.replace(/^\d+\.\s*/, ''));
    ol.append(li);
  }
  const back = h('p', { id: `chapter-flash-back-${slug(sectionId)}`, hidden: '' });
  appendRich(back, flash.steps[0].answer);
  const show = h('button', { type: 'button', class: 'btn', id: `chapter-flash-${slug(sectionId)}` }, 'Show the card');
  show.addEventListener('click', () => {
    back.hidden = false;
    show.hidden = true;
  });
  const front = h('p');
  appendRich(front, flash.prompt);
  host.append(ol, front, h('div', { class: 'problem-actions' }, show), back);
  return host;
}

function stageFoot(section) {
  const box = h('div', { class: 'stage-done', id: `chapter-done-${slug(section.id)}`, hidden: '' });
  const summit = h('p', { class: 'chapter-summit' });
  appendRich(summit, section.summit || '');
  const kids = [summit, h('p', { class: 'book-flag' }, 'Stage complete.')];
  const next = stageNext(section.id);
  if (next && next.href && !next.later) {
    kids.push(h('a', {
      class: 'btn btn-primary', href: next.href, id: `chapter-done-next-${slug(section.id)}`,
    }, `Next is ${next.label}`));
  } else if (next && next.label) {
    kids.push(h('p', { id: `chapter-done-next-${slug(section.id)}` }, next.label));
  }
  kids.push(stageMemory(section.id));
  box.append(...kids);
  return box;
}

export function mount(section, ctx) {
  const spec = ctx.book;
  if (!spec || spec.kind === 'roadmap') return mountRoadmap(section, ctx, spec);
  if (spec.kind === 'prep') return mountPrep(section, ctx, spec);
  if (spec.chapter === 4) return mountChapter4(section, ctx, spec.focus);
  if (spec.chapter === 5) return mountChapter5(section, ctx, spec.focus);
  return mountRoadmap(section, ctx, { kind: 'roadmap', chapter: null, focus: null });
}

export function mountBookHome(el, ctx, spec) {
  const store = ctx.store;
  const ticks = ticksOf(store);
  const target = continueTarget(ticks);
  const tally = target.tally;
  const status = h('p', { class: 'book-status', id: 'book-status' });
  const walked = activeWalk(ticks);
  status.dataset.chapter = String(walked.chapter);
  status.textContent = continueSentence(ticks);
  const walk = h('a', { class: 'btn btn-primary', id: 'book-continue', href: target.href }, 'Continue');
  const list = h('ol', { class: 'book-path', id: 'book-path' });

  for (const ch of shellChapters()) {
    const open = OPEN_CHAPTERS.includes(ch.n);
    const href = `#chapter-${ch.n}`;
    const head = h('a', { class: 'book-row', id: `book-open-${ch.n}`, href },
      h('p', { class: 'book-flag', id: `book-flag-${ch.n}` }, 'Later'),
      h('h2', { id: `book-title-${ch.n}` },
        h('span', { class: 'book-num' }, String(ch.n)),
        document.createTextNode(` ${ch.title}`)),
      h('p', { class: 'book-page', id: `book-page-${ch.n}` }, `Page ${ch.page}`));
    const kids = [head];
    if (open) {
      const sections = h('ol', { class: 'book-sections', id: `book-sections-${ch.n}` });
      for (const s of sectionList(ch)) {
        const sectionHrefHash = `#${chapterHash(ch.n, s.id)}`;
        sections.append(h('li', { 'data-section': s.id, id: `book-section-${slug(s.id)}` },
          h('a', { class: 'book-section-link', id: `book-section-link-${slug(s.id)}`, href: sectionHrefHash },
            h('span', null, `${s.id} ${s.title}`),
            h('span', { class: 'book-section-page' }, `p. ${s.page}`),
            h('span', { class: 'book-section-mark' }, ''))));
      }
      kids.push(sections);
    }
    list.append(h('li', {
      class: 'book-node', id: `book-node-${ch.n}`, 'data-chapter': String(ch.n), 'data-state': 'later',
    }, ...kids));
  }

  for (const node of list.querySelectorAll('.book-node')) {
    const n = Number(node.getAttribute('data-chapter'));
    const mine = walkSections().filter((s) => s.chapter === n);
    let state = 'later';
    let flag = 'Later';
    if (mine.length) {
      const done = mine.every((s) => sectionFinished(s, ticks));
      const current = mine.some((s) => s.id === tally.nextId);
      if (done) { state = 'done'; flag = 'Done'; }
      else if (current || (n === walked.chapter && walked.tally.exercisesTicked > 0 && !walked.tally.complete)) {
        state = 'next';
        flag = 'Next';
      } else { state = 'open'; flag = 'Open'; }
    }
    node.setAttribute('data-state', state);
    const flagEl = node.querySelector('.book-flag');
    if (flagEl) flagEl.textContent = flag;
  }
  for (const row of list.querySelectorAll('[data-section]')) {
    const id = row.getAttribute('data-section');
    const section = walkSections().find((s) => s.id === id);
    const mark = row.querySelector('.book-section-mark');
    if (!section) {
      row.setAttribute('data-state', 'later');
      if (mark) mark.textContent = '';
      continue;
    }
    const finished = sectionFinished(section, ticks);
    const isNext = !finished && tally.nextId === id;
    row.setAttribute('data-state', finished ? 'done' : (isNext ? 'next' : 'ahead'));
    if (mark) mark.textContent = finished ? 'Done' : (isNext ? 'Next' : '');
  }

  el.append(
    h('header', { class: 'station-header' },
      h('h1', { id: 'book-title' }, 'The Book'),
      h('p', { class: 'where-line', id: 'where-line' }, 'The book · Chapters 1–7'),
      h('p', { class: 'station-lede', id: 'book-lede' }, 'Chapters 1 to 7, in the order Howell and Mathews print them.'),
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

function mountRoadmap(el, ctx, spec) {
  return mountBookHome(el, ctx, spec);
}

function mountChapter4(el, ctx, focus) {
  const store = ctx.store;
  let ticks = ticksOf(store);
  const work = { settle: false, stay: false, proof: false, orbit: 0, newton: false, disk: false, sums: false, closer: false };
  const path = h('ol', { class: 'chapter-path', id: 'chapter-path' });
  const cards = [];
  let proofHost = null;
  let ex5 = null;

  function earned(id) {
    if (id === '4.1.3' || id === '4.1.13') return work.proof;
    if (id === '4.2.3') return work.newton;
    if (id === '4.2.4') return work.disk;
    if (id === '4.2.5') return work.orbit >= 4;
    if (id === '4.3.1' || id === '4.3.2') return work.sums;
    if (id === '4.4.6') return work.closer;
    return false;
  }

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  status.dataset.chapter = '4';
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');

  function paint() {
    const t = chapterTally(CHAPTER_4.sections, ticks);
    writeStatus(status, t, ch4Name, justFinished(CHAPTER_4.sections, ticks));
    if (t.complete) {
      nextBtn.hidden = false;
      nextBtn.textContent = 'Open Chapter 5';
      nextBtn.dataset.jump = '5';
    } else if (t.nextId && t.nextId !== '4.1') {
      nextBtn.hidden = false;
      nextBtn.textContent = `Go to ${t.nextId}`;
      nextBtn.dataset.jump = t.nextId;
    } else {
      nextBtn.hidden = true;
      nextBtn.dataset.jump = '';
    }
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const section = CHAPTER_4.sections.find((s) => s.id === id);
      const finished = sectionFinished(section, ticks);
      node.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
    }
    for (const card of cards) {
      const id = card.getAttribute('data-problem');
      const on = ticks[id] === true;
      const ready = earned(id);
      card._tick.hidden = !on && !ready;
      card._tick.disabled = false;
      card._tick.setAttribute('aria-pressed', String(on));
      card._tick.textContent = on ? 'Ticked' : 'Tick';
    }
    if (proofHost) proofHost.hidden = !(work.settle && work.stay);
    if (ex5) ex5.hidden = work.orbit < 4;
    for (const section of CHAPTER_4.sections) {
      const foot = el.querySelector(`#chapter-done-${slug(section.id)}`);
      if (foot) foot.hidden = !sectionFinished(section, ticks);
    }
  }

  nextBtn.addEventListener('click', () => {
    const jump = nextBtn.dataset.jump;
    if (jump === '5') {
      ctx.navigate('chapter-5');
      return;
    }
    const node = el.querySelector(`#chapter-section-${slug(jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const section of CHAPTER_4.sections) {
    const scope = `chapter-section-${slug(section.id)}`;
    const idea = h('p', { class: 'section-idea', id: `${scope}-idea` });
    appendRich(idea, section.idea);
    const exerciseHost = h('div', { class: 'chapter-exercises', id: `${scope}-exercises` });
    for (const exId of section.exercises) {
      const problem = test2ProblemById(exId);
      if (!problem) continue;
      const card = exerciseCard(section, problem, () => {
        const node = cards.find((c) => c.getAttribute('data-problem') === problem.id);
        if (!node || node._tick.hidden) return;
        ticks = toggleTick(ticks, problem.id);
        saveSharedTicks(store, ticks);
        paint();
      });
      if (problem.id === '4.2.5') {
        card.classList.add('chapter-fade');
        card.hidden = true;
        ex5 = card;
      }
      exerciseHost.append(card);
    }
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    section.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    const door = SECTION_DOOR[section.id];
    const titleAttrs = door ? linkAttrs(door, `${scope}-door`) : null;
    if (titleAttrs) titleAttrs.class = 'chapter-door';
    const extra = [];
    if (section.id === '4.1') extra.push(pair41(), proof41());
    if (section.id === '4.2') extra.push(orbit42(), sets42(), beatNewton(), beatDisk());
    if (section.id === '4.3') extra.push(beatSums());
    if (section.id === '4.4') extra.push(beatCloser());
    path.append(h('li', {
      class: 'section-node chapter-stage', id: scope, 'data-section': section.id, 'data-state': 'ahead',
    },
      h('p', { class: 'book-flag', id: `${scope}-flag` }, section.id),
      door ? h('h2', { id: `${scope}-title` }, h('a', titleAttrs, section.title)) : h('h2', { id: `${scope}-title` }, section.title),
      h('p', { class: 'book-page' }, `Page ${section.page}`),
      idea,
      ...extra,
      read,
      h('p', { class: 'book-door', id: `${scope}-practice-row` },
        h('a', { href: `#${prepHash(4, section.id)}`, id: `${scope}-practice` }, `Practice ${section.id}`)),
      exerciseHost,
      stageFoot(section)));
  }

  function chipPair(id, label, re, im, key) {
    const note = h('p', { class: 'chapter-orbit', id: `${id}-note`, hidden: '' });
    const btn = h('button', { type: 'button', class: 'chip', id, 'aria-pressed': 'false' }, label);
    btn.addEventListener('click', () => {
      work[key] = true;
      btn.setAttribute('aria-pressed', 'true');
      note.hidden = false;
      note.textContent = sequenceTerms(re, im, 4).join(' → ');
      paint();
    });
    return h('div', null, btn, note);
  }

  function pair41() {
    return h('div', { class: 'chips', id: 'chapter-4-1-pair' },
      chipPair('chapter-4-1-settle', '(1/2 + i/4)^n', 0.5, 0.25, 'settle'),
      chipPair('chapter-4-1-stay', '((1+i)/√2)^n', Math.SQRT1_2, Math.SQRT1_2, 'stay'));
  }

  function proof41() {
    const item = PRACTICE.find((it) => it.id === 'ch4-4.1-yn-blank');
    const step = item.steps[0];
    proofHost = miniBlank('chapter-4-1-proof', step.text, step.answer, step.accept, () => {
      work.proof = true;
      paint();
    });
    proofHost.hidden = true;
    return proofHost;
  }

  function orbit42() {
    const list = h('p', { class: 'chapter-orbit', id: 'chapter-4-2-orbit' }, '0');
    const btn = h('button', { type: 'button', class: 'btn', id: 'chapter-4-2-again' }, 'Next landing');
    btn.addEventListener('click', () => {
      if (work.orbit >= 6) return;
      work.orbit += 1;
      list.textContent = orbitFromZero(0, 1, work.orbit).join(' → ');
      if (work.orbit >= 6) btn.disabled = true;
      paint();
    });
    return h('div', { id: 'chapter-4-2-orbit-work' },
      h('p', null, 'The orbit of 0 at c = i. Each press is one landing.'),
      list,
      h('div', { class: 'problem-actions' }, btn));
  }

  function sets42() {
    const sets = h('div', { class: 'chapter-sets', id: 'chapter-sets' });
    const stills = [
      { kind: 'julia', label: 'Julia set' },
      { kind: 'mandelbrot', label: 'Mandelbrot set' },
    ].map((spec) => {
      const canvas = h('canvas', { id: `chapter-${spec.kind}-still`, 'aria-hidden': 'true' });
      sets.append(h('a', { class: 'chapter-set', id: `chapter-set-${spec.kind}`, href: `#${spec.kind}` },
        canvas, h('span', null, spec.label)));
      return { canvas, kind: spec.kind };
    });
    const redraw = (force) => {
      for (const still of stills) {
        if (force) delete still.canvas.dataset.edge;
        paintSetStill(still.canvas, still.kind, still.canvas.clientWidth);
      }
    };
    const themeObs = new MutationObserver(() => redraw(true));
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    let box = null;
    if (typeof ResizeObserver === 'function') {
      box = new ResizeObserver(() => redraw(false));
      box.observe(sets);
    }
    sets._stop = () => {
      themeObs.disconnect();
      if (box) box.disconnect();
    };
    return h('div', null,
      h('p', { id: 'chapter-4-2-orbit-line' }, 'The orbit is the sequence from §4.1.'),
      sets);
  }

  function beatNewton() {
    return miniBlank(
      'chapter-4-2-newton',
      'For $f(z)=az+b$, one Newton step sends every guess to ___.',
      '-b/a',
      ['-b/a', '-\\frac{b}{a}'],
      () => { work.newton = true; paint(); },
    );
  }

  function beatDisk() {
    return miniBlank(
      'chapter-4-2-disk',
      'At $c=0$ the filled set is a ___. Example 4.9, page 113.',
      'disk',
      ['the disk', 'unit disk', 'closed unit disk'],
      () => { work.disk = true; paint(); },
    );
  }

  function beatSums() {
    return miniBlank(
      'chapter-4-3-sums',
      'Inside the unit disk the partial sums settle at ___.',
      '1/(1-z)',
      ['\\frac{1}{1-z}', '\\dfrac{1}{1-z}'],
      () => { work.sums = true; paint(); },
    );
  }

  function beatCloser() {
    return miniBlank(
      'chapter-4-4-closer',
      'Theorem 4.15, page 124, spreads convergence to every point ___ the centre.',
      'closer to',
      ['closer', 'nearer to', 'inside'],
      () => { work.closer = true; paint(); },
    );
  }

  function exerciseCard(section, problem, onTick) {
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
    const tick = h('button', { type: 'button', class: 'btn', id: `chapter-tick-${idSlug}`, 'aria-pressed': 'false', hidden: '' }, 'Tick');
    tick.addEventListener('click', onTick);
    const pic = CHAPTER_PICTURE[problem.id];
    const kids = [
      h('h3', { id: `chapter-title-${idSlug}` }, problem.pin),
      sourceTag({ pin: problem.pin, href: problem.href }),
      body,
    ];
    if (pic) {
      kids.push(h('a', {
        class: 'chip', href: pictureHref(problem.id), id: `${cardId}-station`,
      }, pic.label));
    }
    if (hintText) kids.push(show, hint);
    kids.push(h('div', { class: 'problem-actions' }, tick));
    const card = h('article', {
      class: 'card problem-card chapter-card', id: cardId, 'data-problem': problem.id,
      'data-homework': problem.homework || null,
    }, ...kids);
    card._tick = tick;
    cards.push(card);
    return card;
  }

  el.append(
    h('header', { class: 'station-header' },
      upLink('chapter-back', '#book', 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 4. Sequences, Series, and Fractals'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Chapter 4 · Sequences, Series, and Fractals'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'An orbit is a sequence. Each section says why, then the work, then the sentence.'),
      sourceTag({ pin: CHAPTER_4.pin, href: CHAPTER_4.href })),
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn),
    path,
    upLink('chapter-back-end', '#book', 'The Book'));

  paint();

  if (focus) {
    const card = cards.find((c) => c.getAttribute('data-problem') === focus);
    const sectionNode = el.querySelector(`#chapter-section-${slug(focus)}`);
    const target = card || sectionNode;
    if (target) {
      target.classList.add('is-target');
      target.scrollIntoView({ block: 'start' });
    }
  }

  return function unmount() {
    const sets = el.querySelector('#chapter-sets');
    if (sets && sets._stop) sets._stop();
  };
}

function mountChapter5(el, ctx, focus) {
  const store = ctx.store;
  let ticks = ticksOf(store);
  const section = CHAPTER_5.sections[0];
  const picture = h('section', { class: 'exp-picture', id: 'chapter-exp', 'aria-labelledby': 'chapter-title' });
  const stop = mountExpPicture(picture, focus === '5.1.1' ? 'zero' : undefined);

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  status.dataset.chapter = '5';
  const cards = {};
  const quarter = blankLine('chapter-blank-quarter', '$e^{i\\pi/2}$ lands at ');
  const quarterLi = h('li', { id: 'chapter-quarter', hidden: '' }, quarter);
  const off = h('p', { class: 'chapter-off', id: 'chapter-exp-off', hidden: '' }, 'This question is about the unit circle.');
  const exerciseHost = h('div', { class: 'chapter-exercises', id: 'chapter-section-5-1-exercises' });
  for (const id of section.exercises) {
    cards[id] = exerciseCard5(CHAPTER_5.cards[id], id, () => {
      if (cards[id]._tick.disabled) return;
      ticks = toggleTick(ticks, id);
      saveSharedTicks(store, ticks);
      paint();
    });
    exerciseHost.append(cards[id]);
  }

  const scope = 'chapter-section-5-1';
  const idea = h('p', { class: 'section-idea', id: `${scope}-idea` });
  appendRich(idea, section.idea);
  const read = h('ul', { class: 'book-read', id: `${scope}-read` });
  section.read.forEach((item, i) => {
    read.append(h('li', null, h('a', {
      href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
    }, item.pin)));
  });
  const titleAttrs = linkAttrs(SECTION_DOOR['5.1'], `${scope}-door`);
  titleAttrs.class = 'chapter-door';
  // #chapter-exp is the picture on this page, not a route. Following the hash
  // would leave the chapter for "No such place".
  const titleDoor = h('a', titleAttrs, section.title);
  titleDoor.addEventListener('click', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
    const frame = el.querySelector('#chapter-exp');
    if (!frame) return;
    ev.preventDefault();
    frame.scrollIntoView({ block: 'start' });
  });
  const walk = h('section', {
    class: 'section-node chapter-stage exp-walk', id: scope, 'data-section': '5.1',
  },
    h('p', { class: 'book-flag', id: `${scope}-flag` }, '5.1'),
    h('h2', { id: `${scope}-title` }, titleDoor),
    h('p', { class: 'book-page' }, `Page ${section.page}`),
    idea,
    read,
    h('p', { class: 'book-door', id: 'chapter-section-5-1-practice-row' },
      h('a', { href: `#${prepHash(5, '5.1')}`, id: 'chapter-section-5-1-practice' }, 'Practice 5.1')),
    h('ul', { class: 'exp-blanks', id: 'chapter-blanks' }, quarterLi),
    exerciseHost,
    stageFoot(section));

  const later = h('ol', { class: 'book-path exp-later', id: 'chapter-later-sections' });
  for (const s of bookChapter(5).sections) {
    if (s.id === '5.1') continue;
    later.append(h('li', {
      class: 'book-node', id: `chapter-later-${slug(s.id)}`, 'data-section': s.id, 'data-state': 'later',
    },
      h('p', { class: 'book-flag' }, 'Later'),
      h('h2', null, `${s.id} ${s.title}`),
      h('p', { class: 'book-page' }, `Page ${s.page}`)));
  }

  function paintStatus() {
    const t = chapterTally(CHAPTER_5.sections, ticks);
    writeStatus(status, t, ch5Name, justFinished(CHAPTER_5.sections, ticks));
    walk.setAttribute('data-state', sectionFinished(section, ticks) ? 'done' : 'next');
  }

  function paintBlanks() {
    const stage = picture.querySelector('#chapter-exp-stage');
    const x = Number(stage && stage.dataset.probeRe);
    const y = Number(stage && stage.dataset.probeIm);
    const onCircle = Number.isFinite(x) && Math.abs(x) <= 1e-9;
    const nearRight = onCircle && Number.isFinite(y) && Math.abs(y) <= 0.35;
    const nearTop = onCircle && Number.isFinite(y) && Math.abs(y - Math.PI / 2) <= 0.35;
    const nearLeft = onCircle && Number.isFinite(y)
      && Math.min(Math.abs(y - Math.PI), Math.abs(y + Math.PI)) <= 0.35;
    off.hidden = !(Number.isFinite(x) && Math.abs(x) > 0.06);
    if (nearRight) lockGap(cards['5.1.1']._blank, CHAPTER_5.cards['5.1.1'].answer);
    quarterLi.hidden = cards['5.1.1']._blank.dataset.locked !== 'true';
    if (nearTop) lockGap(quarter, '$i$');
    if (nearLeft) lockGap(cards['5.1.2']._blank, CHAPTER_5.cards['5.1.2'].answer);
    setTick(cards['5.1.1'], ticks['5.1.1'] === true, nearRight || cards['5.1.1']._blank.dataset.locked === 'true');
    setTick(cards['5.1.2'], ticks['5.1.2'] === true, nearLeft || cards['5.1.2']._blank.dataset.locked === 'true');
    const foot = el.querySelector('#chapter-done-5-1');
    if (foot) foot.hidden = !sectionFinished(section, ticks);
    paintStatus();
  }

  function paint() {
    paintBlanks();
  }

  const stage = () => picture.querySelector('#chapter-exp-stage');
  const onProbe = () => paintBlanks();
  const observed = stage();
  const observer = new MutationObserver(onProbe);
  if (observed) observer.observe(observed, { attributes: true, attributeFilter: ['data-probe-re', 'data-probe-im'] });

  el.append(
    h('header', { class: 'station-header' },
      upLink('chapter-back', '#book', 'The Book'),
      h('h1', { id: 'chapter-title' }, 'Chapter 5. The exponential'),
      h('p', { class: 'where-line', id: 'where-line' }, 'Chapter 5 · The exponential'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Drag the green dot. Play turns the angle. A blank fills when the picture makes it true.'),
      sourceTag({ pin: 'Chapter 5, Elementary Functions, page 130', href: sectionHref('sec_exponential-function.html') })),
    picture,
    off,
    h('div', { class: 'book-next', id: 'chapter-next-row' }, status),
    walk,
    later,
    upLink('chapter-back-end', '#book', 'The Book'));

  paint();

  const laterId = focus && focus !== '5.1' && !CHAPTER_5.cards[focus] ? `chapter-later-${slug(focus)}` : '';
  const targetId = focus === '5.1' ? scope : (CHAPTER_5.cards[focus] ? `chapter-card-${slug(focus)}` : laterId);
  const target = targetId ? el.querySelector(`#${targetId}`) : null;
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'start' });
  }

  return function unmount() {
    observer.disconnect();
    stop();
  };
}

function blankLine(id, prompt) {
  const gap = h('span', { class: 'exp-blank-gap' });
  gap.setAttribute('aria-label', 'waiting');
  const line = h('p', { class: 'exp-blank', id, 'data-right': 'false' });
  appendRich(line, prompt);
  line.append(gap);
  line._gap = gap;
  return line;
}

function fillGap(line, text) {
  const gap = line._gap;
  const key = text || '';
  if (gap.dataset.filled === key) return;
  gap.dataset.filled = key;
  gap.replaceChildren();
  if (key) appendRich(gap, key);
  if (key) gap.removeAttribute('aria-label');
  else gap.setAttribute('aria-label', 'waiting');
  line.dataset.right = key ? 'true' : 'false';
}

function lockGap(line, text) {
  if (!line || line.dataset.locked === 'true' || !text) return;
  fillGap(line, text);
  line.dataset.locked = 'true';
}

function setTick(card, on, ready) {
  const tick = card._tick;
  const last = card._last;
  last.dataset.right = ready ? 'true' : 'false';
  tick.hidden = !on && !ready;
  tick.disabled = !on && !ready;
  tick.setAttribute('aria-pressed', String(on));
  tick.textContent = on ? 'Ticked' : 'Tick';
}

function exerciseCard5(card, id, onTick) {
  const idSlug = slug(id);
  const cardId = `chapter-card-${idSlug}`;
  const body = h('div', { id: `${cardId}-statement` });
  appendRich(body, card.statement);
  const hint = h('p', { class: 'hint-note', id: `chapter-hint-${idSlug}`, hidden: '' });
  appendRich(hint, card.hint);
  const show = h('button', {
    type: 'button', class: 'btn', id: `chapter-show-${idSlug}`,
    'aria-expanded': 'false', 'aria-controls': `chapter-hint-${idSlug}`,
  }, 'Show the hint');
  show.addEventListener('click', () => {
    hint.hidden = false;
    show.hidden = true;
    show.setAttribute('aria-expanded', 'true');
  });
  const blank = blankLine(`chapter-blank-${idSlug}`, card.blank);
  const tick = h('button', {
    type: 'button', class: 'btn', id: `chapter-tick-${idSlug}`, 'aria-pressed': 'false', disabled: '',
  }, 'Tick');
  tick.addEventListener('click', onTick);
  const last = h('div', { class: 'exp-blank', id: `chapter-tick-blank-${idSlug}`, 'data-right': 'false' }, tick);
  const node = h('article', {
    class: 'card problem-card chapter-card', id: cardId, 'data-problem': id,
  },
    h('h3', { id: `chapter-title-${idSlug}` }, card.pin),
    sourceTag({ pin: card.pin, href: card.href }),
    body,
    blank,
    last,
    show,
    hint);
  node._tick = tick;
  node._blank = blank;
  node._last = last;
  return node;
}
