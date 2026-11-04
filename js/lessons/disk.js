// The Example 4.9 lesson. One gesture: the blank. The rule box is the second control.
// Check becomes Pause, Play, or Step, so the motion is not a fourth control.
// The plane does not pan or zoom. Station hashes are not locked.

import { createPlane, drawCircle, drawDot, drawSegment } from '../core/plane.js';
import { createMotion } from '../core/anim.js';
import { tex } from '../core/katex.js';
import { createStore } from '../core/store.js';
import { prefersReducedMotion } from '../core/theme.js';
import { BOOK, sectionHref } from '../data/book.js';
import {
  DISK_STEPS,
  INSIDE,
  SEEDS,
  bookSquare,
  compileRule,
  picturePoints,
  grade,
  walk,
} from '../core/lesson.js';
import {
  DISK_STRIP,
  doorHref,
  inkFraction,
  loadProgress,
  loadRule,
  markStep,
  nodeById,
  nodeState,
  saveProgress,
  saveRule,
} from '../core/progress.js';

const NODE = '4.2.disk';

function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
  }
  for (const kid of kids) if (kid) node.append(kid);
  return node;
}

function renderParts(node, parts) {
  node.replaceChildren();
  for (const p of parts || []) {
    if (p.tex) {
      const span = document.createElement('span');
      tex(span, p.tex);
      node.append(span);
    } else {
      node.append(document.createTextNode(p.t));
    }
  }
}

function pageHref(node) {
  const href = doorHref(node);
  if (!href) return null;
  if (href.startsWith('lessons/')) return href.slice('lessons/'.length);
  return `../${href}`;
}

export function mountDiskLesson(root, env = {}) {
  if (!root) return () => {};
  const store = env.store || createStore('mv:');
  const motion = createMotion(env.motion || {});
  const reducedNow = env.reduced || prefersReducedMotion;

  const state = {
    progress: loadProgress(store),
    index: 0,
    shown: 0,
    playing: false,
    ruleText: loadRule(store) || 'z^2',
    rule: null,
  };
  state.rule = compileRule(state.ruleText);
  state.index = firstGap(state.progress);

  const map = el('ol', { class: 'ink-map', id: 'ink-map', 'aria-label': 'The map this lesson fills' });
  const title = el('h2', { id: 'step-title' });
  const observe = el('p', { class: 'observe', id: 'observe' });
  const prompt = el('span', { id: 'prompt' });
  const tail = el('span', { id: 'tail' });
  const blank = el('input', {
    id: 'blank',
    class: 'lesson-blank',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    maxlength: '80',
    enterkeyhint: 'go',
  });
  const check = el('button', { id: 'check', class: 'btn btn-primary', type: 'submit' });
  const form = el('form', { id: 'blank-form' });
  const sentence = el('div', { class: 'blank-sentence' });
  const label = el('label', { class: 'sr-only', for: 'blank', id: 'blank-label' });
  sentence.append(prompt, blank, tail);
  form.append(label, sentence, check);

  const feedback = el('p', { id: 'feedback', class: 'feedback', role: 'status' });
  const claim = el('p', { id: 'claim', class: 'claim' });
  const hint = el('details', { id: 'hint', class: 'hint' });
  const hintBody = el('p', { id: 'hint-body' });
  hint.append(el('summary', { text: 'Hint' }), hintBody);

  const back = el('button', { id: 'back', class: 'btn btn-quiet', type: 'button', text: 'Back' });
  const forward = el('button', { id: 'forward', class: 'btn btn-quiet', type: 'button', text: 'Next step' });
  const next = el('div', { id: 'next-node' });
  const nav = el('div', { class: 'lesson-nav' });
  nav.append(back, forward, next);

  const ruleInput = el('input', {
    id: 'rule',
    class: 'rule-input',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    maxlength: '400',
    'aria-describedby': 'rule-note',
  });
  const ruleTex = el('p', { id: 'rule-tex', class: 'rule-tex' });
  const ruleNote = el('p', { id: 'rule-note', class: 'rule-note' });
  const ruleLabel = el('label', { for: 'rule', text: 'Your rule, f(z)' });
  const ruleBox = el('div', { class: 'rule-box' });
  ruleBox.append(ruleLabel, ruleInput, ruleTex, ruleNote);

  const picture = el('div', { id: 'picture' });
  const stepStatus = el('p', { id: 'step-status', class: 'sr-only', role: 'status' });

  const card = el('section', { class: 'panel lesson-card', 'aria-labelledby': 'step-title' });
  card.append(title, observe, picture, claim, form, feedback, ruleBox, hint, nav, stepStatus);

  const cite = el('p', { class: 'lesson-cite' });
  const citeA = el('a', {
    href: sectionHref('sec_julia-mandelbrot.html', 'K-0'),
    text: '§4.2, Example 4.9, page 113',
  });
  cite.append(citeA, document.createTextNode('. ' + BOOK.attribution + ' Exercise 4 asks which starts stay bounded. The write-up stays on the index.'));

  const colour = el('p', {
    class: 'lesson-key',
    text: 'Green is the start. Orange is the unit circle. Blue is a walk that stays bounded, and the disk when it inks. Purple is your rule, when it is not z².',
  });

  const top = el('div', { class: 'lesson-top' });
  top.append(
    el('a', { href: '../index.html#disk', text: 'The disk stop' }),
    el('a', { href: '../index.html#home', text: 'The map' }),
  );

  const page = el('article', { class: 'lesson', id: 'lesson' });
  page.append(
    top,
    el('h1', { text: 'The closed disk' }),
    el('p', { class: 'lede', text: 'For z², the walks that stay bounded fill a disk. Six blanks ink it. The next node stays shut until the last blank is right.' }),
    map,
    card,
    colour,
    cite,
  );
  root.replaceChildren(page);

  const plane = createPlane(picture, {
    id: 'disk-lesson',
    xRange: [-2, 2],
    yRange: [-2, 2],
    grid: 'cart',
    axes: true,
    axisLabels: ['Re', 'Im'],
    interactive: false,
    legend: false,
    maxWidth: 520,
    ariaLabel: 'The unit circle and one start. The orbit appears when the blank is right.',
  });
  plane.addLayer((ctx, p) => paint(ctx, p), { order: 20 });

  function step() {
    return DISK_STEPS[state.index];
  }
  function stepDone(id) {
    const row = state.progress.nodes[NODE];
    return !!(row && row.steps[id]);
  }
  function done() {
    return stepDone(step().id);
  }

  function paint(ctx, p) {
    const s = step();
    const seed = SEEDS[s.seed];
    const showDisk = done() && s.id === 'closed' && state.shown > 0;
    drawCircle(ctx, p, { re: 0, im: 0 }, 1, {
      color: '--polar',
      width: 2,
      fill: showDisk ? '--cart' : null,
      fillAlpha: showDisk ? 0.22 * state.shown : 0,
    });
    if (state.rule && state.rule.ok && !state.rule.same) {
      const theirs = picturePoints(walk(state.rule.f, seed).points);
      for (let i = 1; i < theirs.length; i++) {
        drawSegment(ctx, p, theirs[i - 1], theirs[i], { color: '--output', dash: [4, 3], width: 2 });
      }
      if (theirs.length > 1) drawDot(ctx, p, theirs[theirs.length - 1], { color: '--output', radius: 4, halo: false });
    }
    // The landing earned on step 1 stays up for the comparison. Later steps withhold the orbit until that blank is right.
    const showLanding = (s.id === 'image' && done() && state.shown > 0) || (s.id === 'compare' && stepDone('image'));
    if (showLanding) drawDot(ctx, p, bookSquare(INSIDE), { color: '--output', radius: 5.5 });
    if (done() && state.shown > 0 && s.reveal !== 'dot') {
      const walked = walk(bookSquare, seed);
      const pts = picturePoints(walked.points);
      const last = Math.max(1, Math.round(state.shown * (pts.length - 1)));
      const color = walked.fate === 'leaves' ? '--polar' : '--cart';
      const shownPts = pts.slice(0, last + 1);
      for (let i = 1; i < shownPts.length; i++) {
        drawSegment(ctx, p, shownPts[i - 1], shownPts[i], { color, width: 2.5 });
        drawDot(ctx, p, shownPts[i], { color, radius: 3.5, halo: false });
      }
    }
    drawDot(ctx, p, seed, { color: '--input', radius: 6.5, label: 'z' });
  }

  function revealCount() {
    const s = step();
    if (s.reveal === 'dot') return 1;
    const pts = picturePoints(walk(bookSquare, SEEDS[s.seed]).points);
    return Math.max(1, pts.length - 1);
  }

  function labelButton() {
    if (!done()) {
      check.textContent = 'Check';
      return;
    }
    if (reducedNow()) {
      check.textContent = state.shown >= 1 ? 'Again' : 'Step';
      return;
    }
    check.textContent = state.playing ? 'Pause' : (state.shown >= 1 ? 'Replay' : 'Play');
  }

  function stopMotion() {
    motion.cancel();
    state.playing = false;
  }

  function playFrom(u0) {
    const s = step();
    const dur = (s.reveal === 'dot' ? 480 : 1400) * (1 - u0);
    state.playing = true;
    labelButton();
    motion.run(Math.max(48, dur), (u) => {
      state.shown = u0 + (1 - u0) * u;
      plane.requestDraw();
    }, () => {
      state.shown = 1;
      state.playing = false;
      labelButton();
      plane.requestDraw();
    });
  }

  function stepOnce() {
    const n = revealCount();
    const cur = Math.round(state.shown * n);
    state.shown = cur >= n ? 0 : Math.min(1, (cur + 1) / n);
    plane.requestDraw();
    labelButton();
  }

  function startReveal() {
    state.shown = 0;
    if (reducedNow()) {
      stepOnce();
      return;
    }
    playFrom(0);
  }

  function ruleNoteText() {
    const rule = state.rule;
    if (!rule || !rule.ok) return rule && rule.message ? rule.message : 'Type a formula in z.';
    if (rule.same) return 'This is z², the rule in Example 4.9.';
    if (nodeState(state.progress, NODE) === 'inked') {
      const fate = walk(rule.f, SEEDS[step().seed]).fate;
      return `Your rule at the green seed, in 32 steps: ${fate}. The blue disk is the set for z² only.`;
    }
    return 'Your rule is the purple orbit. The blanks stay on z².';
  }

  function paintRule() {
    ruleNote.textContent = ruleNoteText();
    ruleTex.replaceChildren();
    if (state.rule && state.rule.ok) {
      const span = document.createElement('span');
      tex(span, state.rule.tex);
      ruleTex.append(span);
    }
  }

  function renderMap() {
    map.replaceChildren();
    for (const id of DISK_STRIP) {
      const node = nodeById(id);
      const st = nodeState(state.progress, id);
      const li = el('li', { class: 'ink-node' });
      li.dataset.state = st;
      li.dataset.here = id === NODE ? 'true' : 'false';
      const frac = id === NODE ? inkFraction(state.progress, id) : (st === 'inked' ? 1 : 0);
      li.style.setProperty('--ink', String(frac));
      const dot = el('span', { class: 'ink-dot', 'aria-hidden': 'true' });
      const name = el('span', { class: 'ink-label', text: node.short });
      const href = pageHref(node);
      const here = id === NODE;
      if (st !== 'locked' && !here && href) {
        const a = el('a', { href });
        a.append(dot, name);
        a.setAttribute('aria-label', st === 'inked' ? `${node.title}, inked` : node.title);
        li.append(a);
      } else {
        li.append(dot, name);
        const suffix = st === 'locked' ? ', locked' : (here ? ', this lesson' : '');
        li.setAttribute('aria-label', node.title + suffix);
      }
      map.append(li);
    }
  }

  function renderNext() {
    next.replaceChildren();
    const node = nodeById('4.2.slide');
    const st = nodeState(state.progress, node.id);
    if (st === 'locked') {
      next.append(el('button', { type: 'button', class: 'btn', disabled: 'disabled', text: 'Next node locked' }));
      return;
    }
    const a = el('a', { class: 'btn btn-primary', href: pageHref(node), text: 'Next node: Square, then slide' });
    next.append(a);
  }

  function render() {
    const s = step();
    const isDone = done();
    title.textContent = s.title;
    observe.textContent = s.observe;
    renderParts(prompt, s.prompt);
    renderParts(tail, s.tail || []);
    label.textContent = s.blankLabel;
    blank.value = isDone ? s.canonical : '';
    blank.readOnly = isDone;
    blank.setAttribute('aria-invalid', 'false');
    if (isDone) blank.dataset.ok = 'true';
    else delete blank.dataset.ok;
    hint.open = false;
    hintBody.textContent = s.hint;
    const carried = !isDone && s.id === 'compare' && stepDone('image');
    claim.textContent = isDone ? s.claim : (carried ? 'The square of 1/2 is 1/4, closer to 0.' : 'The picture has not moved.');
    feedback.textContent = '';
    feedback.dataset.kind = '';
    back.disabled = state.index === 0;
    forward.hidden = state.index === DISK_STEPS.length - 1;
    forward.disabled = !isDone;
    next.hidden = state.index !== DISK_STEPS.length - 1;
    page.dataset.step = s.id;
    stepStatus.textContent = `Step ${state.index + 1} of ${DISK_STEPS.length}. ${s.title}.`;
    if (!isDone) state.shown = 0;
    else if (!state.playing) state.shown = 1;
    labelButton();
    renderMap();
    renderNext();
    paintRule();
    plane.requestDraw();
    if (!isDone) blank.focus();
  }

  function go(index) {
    stopMotion();
    state.index = index;
    state.shown = done() ? 1 : 0;
    render();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!done()) {
      const result = grade(step().id, blank.value);
      if (!result.ok) {
        feedback.textContent = result.nudge;
        feedback.dataset.kind = 'bad';
        blank.setAttribute('aria-invalid', 'true');
        delete blank.dataset.ok;
        return;
      }
      state.progress = markStep(state.progress, NODE, step().id);
      saveProgress(store, state.progress);
      feedback.dataset.kind = 'good';
      renderParts(feedback, result.reveal);
      claim.textContent = result.claim;
      blank.readOnly = true;
      blank.dataset.ok = 'true';
      blank.setAttribute('aria-invalid', 'false');
      forward.disabled = false;
      renderMap();
      renderNext();
      paintRule();
      startReveal();
      return;
    }
    if (reducedNow()) {
      stepOnce();
      return;
    }
    if (state.playing) {
      stopMotion();
      labelButton();
      return;
    }
    if (state.shown >= 1) playFrom(0);
    else playFrom(state.shown);
  });

  back.addEventListener('click', () => {
    if (state.index > 0) go(state.index - 1);
  });
  forward.addEventListener('click', () => {
    if (done() && state.index < DISK_STEPS.length - 1) go(state.index + 1);
  });

  ruleInput.value = state.ruleText;
  ruleInput.addEventListener('input', () => {
    state.ruleText = ruleInput.value;
    state.rule = compileRule(state.ruleText);
    if (state.rule.ok) saveRule(store, state.ruleText);
    paintRule();
    plane.requestDraw();
  });

  render();

  return () => {
    stopMotion();
    plane.destroy();
  };
}

function firstGap(progress) {
  const steps = progress.nodes[NODE].steps;
  const i = DISK_STEPS.findIndex((s) => steps[s.id] !== true);
  return i < 0 ? DISK_STEPS.length - 1 : i;
}
