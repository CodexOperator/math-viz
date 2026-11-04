// Chapter 6 as a mountain. Stages 6.1–6.3 are walked. Stages 6.4–6.6 are the next camps.
// A stage is finished when its picture holds and the stage is marked. The tick
// lives in the same memory as the other chapters.

import { sectionHref } from '../data/book.js';
import { CHAPTER_6, chapter4ExerciseIds, chapter5ExerciseIds, chapter6StageIds } from '../data/book-path.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountRealIntegral, mountContourSum, mountDeform, mountBend, mountCauchy, mountLiouville } from './ch6-pictures.js';
import { mountPractice } from './ch6-cards.js';

const PICTURES = {
  real: mountRealIntegral,
  sum: mountContourSum,
  deform: mountDeform,
  bend: mountBend,
  cauchy: mountCauchy,
  liouville: mountLiouville,
};

const STAGES = [
  {
    id: '6.1',
    gesture: 'Drag the green point around the orange circle. Purple is the integral.',
    picture: 'real',
    read: [
      { pin: 'Definition 6.1, page 163', href: sectionHref('sec_complex-integrals.html', 'Integral_Def_1') },
      { pin: 'Example 6.1, page 163', href: sectionHref('sec_complex-integrals.html', 'Int_ex') },
    ],
    workedPin: 'Definition 6.1, page 163',
    workedHref: sectionHref('sec_complex-integrals.html', 'Integral_Def_1'),
    worked: 'From $0$ to $\\pi$, $\\int e^{it}\\,dt=2i$. From $0$ to $2\\pi$ it is $0$.',
    sheet: [
      'Definition 6.1, page 163: $\\int(u+iv)=\\int u+i\\int v$.',
      'An antiderivative $U+iV$ is evaluated at the ends.',
    ],
    summit: 'On a real interval, a complex integral is the real integral plus $i$ times the imaginary integral.',
  },
  {
    id: '6.2',
    gesture: 'Drag the green point along the segment. Orange points are the eight samples.',
    picture: 'sum',
    read: [
      { pin: 'Definition 6.2, page 170', href: sectionHref('sec_contour-integrals.html', 'Contoe_fnt_Def') },
      { pin: 'Example 6.6, page 170', href: sectionHref('sec_contour-integrals.html', 'Riemann_Sum_Ex') },
      { pin: 'Theorem 6.1, page 172', href: sectionHref('sec_contour-integrals.html', 'thm_contour-integral') },
    ],
    workedPin: 'Example 6.7, page 172',
    workedHref: sectionHref('sec_contour-integrals.html', 'Cont_Int_Ex_1'),
    worked: 'The segment from $0$ to $2+i\\pi/4$ is $z(t)=(2+i\\pi/4)t$ for $0\\le t\\le 1$. Then $z\'(t)=2+i\\pi/4$. Theorem 6.1, page 172, says multiply $e^{z(t)}$ by that derivative and integrate in $t$.',
    sheet: [
      'Theorem 6.1, page 172: $\\int_C f(z)\\,dz=\\int_a^b f(z(t))z\'(t)\\,dt$.',
      'A segment from $A$ to $B$ is $z(t)=A+(B-A)t$.',
      'The opposite contour changes the sign.',
      'Theorem 6.3, page 177: if $|f|\\le M$ on $C$ and $L$ is the length, then $|\\int_C f\\,dz|\\le ML$.',
    ],
    summit: 'Parametrize the contour, multiply by $z\'(t)$, and the contour integral is an ordinary integral on a real interval.',
  },
  {
    id: '6.3',
    gesture: 'Drag the green handle. The integrand is $1/z$.',
    picture: 'deform',
    read: [
      { pin: 'Theorem 6.5, page 183', href: sectionHref('sec_cauchy-goursat.html', 'CG_Thm') },
      { pin: 'Theorem 6.6, page 187', href: sectionHref('sec_cauchy-goursat.html', 'Deformation_of_Contour') },
      { pin: 'Corollary 6.1, page 188', href: sectionHref('sec_cauchy-goursat.html', 'x2Pi_or_zero') },
    ],
    workedPin: 'Example 6.12, page 186',
    workedHref: sectionHref('sec_cauchy-goursat.html', 'sec_cauchy-goursat-18'),
    worked: 'Both circles are positively oriented and the integrand is $1/z$. While the pole stays inside both, both integrals are $2\\pi i$. When the green circle drops the pole, its integral is $0$ and the purple circle stays $2\\pi i$.',
    sheet: [
      'Analytic inside and on a simple closed curve: Theorem 6.5, page 183, the integral is $0$.',
      'Same singularity inside two closed curves, analytic between them: Theorem 6.6, page 187, the integrals match.',
      'Only a parametrization: Theorem 6.1, page 172, multiply by $z\'$.',
      '$1/(z-z_0)$ with $z_0$ inside: Corollary 6.1, page 188, $2\\pi i$. Every other integer power is $0$.',
    ],
    summit: 'Deforming a closed contour through analytic points leaves the integral unchanged.',
  },
  {
    id: '6.4',
    gesture: 'Drag the green bend. The ends stay put, and the integrand is $z$.',
    picture: 'bend',
    read: [
      { pin: 'Theorem 6.8, page 193', href: sectionHref('sec_integration-theorems.html', 'Antideriv_Thm') },
      { pin: 'Theorem 6.9, page 194', href: sectionHref('sec_integration-theorems.html', 'DInt_Thm') },
    ],
    workedPin: 'Theorem 6.9, page 194',
    workedHref: sectionHref('sec_integration-theorems.html', 'DInt_Thm'),
    worked: 'The ends stay at $-1-i$ and $3+i$. An antiderivative of $z$ is $z^{2}/2$, so the integral is $4+2i$ on every path between those ends.',
    sheet: [
      'Theorem 6.9, page 194: in a simply connected domain, $\\int_{z_0}^{z_1} f = F(z_1)-F(z_0)$.',
      'An analytic integrand does not care which path you draw between the same ends.',
    ],
    summit: 'For an analytic integrand, the integral is the antiderivative at the end minus the antiderivative at the start.',
  },
  {
    id: '6.5',
    gesture: 'Drag the green point. The integrand is $z/(z-z_0)$ on the unit circle.',
    picture: 'cauchy',
    read: [
      { pin: 'Theorem 6.10, page 197', href: sectionHref('sec_cauchy-integral-formulas.html') },
      { pin: 'Example 6.21, page 198', href: sectionHref('sec_cauchy-integral-formulas.html', 'Cauchy_Int_Ex') },
    ],
    workedPin: 'Theorem 6.10, page 197',
    workedHref: sectionHref('sec_cauchy-integral-formulas.html'),
    worked: 'For $f(z)=z$ on the unit circle, $\\dfrac{1}{2\\pi i}\\int \\dfrac{z}{z-z_0}\\,dz$ equals the green point while it stays inside, and equals $0$ once the point leaves the circle.',
    sheet: [
      'Theorem 6.10, page 197: $f(z_0)=\\dfrac{1}{2\\pi i}\\int_C \\dfrac{f(z)}{z-z_0}\\,dz$ when $z_0$ is inside $C$.',
      'Example 6.21, page 198: $\\int_{|z|=2} e^{z}/(z-1)\\,dz = 2\\pi i\\, e$.',
    ],
    summit: 'The value inside a contour is an integral on the boundary.',
  },
  {
    id: '6.6',
    gesture: 'Drag the green radius. Purple is the estimate $1/R$ of the derivative.',
    picture: 'liouville',
    read: [
      { pin: 'Theorem 6.13, page 203', href: sectionHref('sec_morera-liouville.html', 'Morera_s_Thm') },
      { pin: 'Theorem 6.18, page 206', href: sectionHref('sec_morera-liouville.html', 'Liouville_s_Thm') },
    ],
    workedPin: 'Theorem 6.18, page 206',
    workedHref: sectionHref('sec_morera-liouville.html', 'Liouville_s_Thm'),
    worked: 'If $|f|\\le M$ on every circle, Cauchy\'s estimate says $|f\'(z_0)|\\le M/R$. Let the radius grow. The only number that survives every $R$ is $0$, so $f$ is constant.',
    sheet: [
      'Theorem 6.13, page 203: if $f$ is continuous and every triangle integrates to $0$, then $f$ is analytic.',
      'Theorem 6.18, page 206: a bounded entire function is constant.',
    ],
    summit: 'An entire function that stays bounded is constant.',
  },
];

function slug(id) {
  return String(id).replace(/\./g, '-');
}

function liveSections() {
  return CHAPTER_6.sections.filter((s) => s.exercises.length > 0);
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
  if (!line) return;
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

function setTick(tick, on, ready) {
  if (!tick) return;
  tick.disabled = !on && !ready;
  tick.setAttribute('aria-pressed', String(on));
  tick.textContent = on ? 'Completed' : 'Stage complete';
  tick.dataset.done = on ? 'true' : 'false';
}

export function mount(section, ctx) {
  const store = ctx.store;
  const owned = new Set([...chapter4ExerciseIds(), ...chapter5ExerciseIds(), ...chapter6StageIds()]);
  let ticks = loadSharedTicks(store, (id) => owned.has(id), chapter4ExerciseIds());
  const stops = [];
  let dead = false;

  const status = h('p', { class: 'book-status', id: 'chapter-status' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'chapter-next' }, 'Next');
  const path = h('ol', { class: 'chapter-path ch6-path', id: 'chapter-path' });
  const blanks = {};
  const ticksBtn = {};

  function paintStatus() {
    const t = chapterTally(liveSections(), ticks);
    if (t.complete) {
      status.textContent = `Done. ${t.exercisesTicked} of ${t.exerciseTotal} stages.`;
      nextBtn.hidden = false;
      nextBtn.textContent = 'Back to the book';
      nextBtn.dataset.jump = 'book';
    } else if (t.nextId && t.nextId !== '6.1') {
      status.textContent = `Next is ${t.nextId}. ${t.exercisesTicked} of ${t.exerciseTotal} stages.`;
      nextBtn.hidden = false;
      nextBtn.textContent = `Go to ${t.nextId}`;
      nextBtn.dataset.jump = t.nextId;
    } else {
      status.textContent = `Next is 6.1. ${t.exercisesTicked} of ${t.exerciseTotal} stages.`;
      nextBtn.hidden = true;
      nextBtn.dataset.jump = '';
    }
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const spec = CHAPTER_6.sections.find((s) => s.id === id);
      if (!spec || !spec.exercises.length) continue;
      const finished = sectionFinished(spec, ticks);
      node.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
    }
  }

  nextBtn.addEventListener('click', () => {
    const jump = nextBtn.dataset.jump;
    if (jump === 'book') {
      ctx.navigate('book');
      return;
    }
    const node = section.querySelector(`#chapter-section-${slug(jump)}`);
    if (node) node.scrollIntoView({ block: 'start' });
  });

  for (const stage of STAGES) {
    const scope = `chapter-section-${slug(stage.id)}`;
    const gesture = h('p', { class: 'ch6-gesture', id: `${scope}-gesture` });
    appendRich(gesture, stage.gesture);
    const picture = h('div', { class: 'ch6-picture', id: `ch6-picture-${slug(stage.id)}` });
    stops.push(PICTURES[stage.picture](picture));
    const read = h('ul', { class: 'book-read', id: `${scope}-read` });
    stage.read.forEach((item, i) => {
      read.append(h('li', null, h('a', {
        href: item.href, target: '_blank', rel: 'noopener noreferrer', id: `${scope}-read-${i + 1}`,
      }, item.pin)));
    });
    const worked = h('p', { class: 'section-idea', id: `${scope}-worked` });
    appendRich(worked, stage.worked);
    const sheet = h('ul', { class: 'ch6-sheet', id: `${scope}-sheet` });
    stage.sheet.forEach((line) => {
      const li = h('li');
      appendRich(li, line);
      sheet.append(li);
    });
    const blankHost = h('div', { class: 'exp-blanks', id: `${scope}-blanks` });
    if (stage.id === '6.1') {
      blanks.half = blankLine('ch6-blank-half', 'From $0$ to $\\pi$ the integral is ');
      blanks.full = blankLine('ch6-blank-full', 'From $0$ to $2\\pi$ the integral is ');
      blankHost.append(blanks.half, blanks.full);
    } else if (stage.id === '6.2') {
      blanks.exact = blankLine('ch6-blank-exact', 'The exact value is ');
      blankHost.append(blanks.exact);
    } else if (stage.id === '6.3') {
      blanks.pole = blankLine('ch6-blank-pole', 'The integral of $1/z$ over the green circle is ');
      blankHost.append(blanks.pole);
    } else if (stage.id === '6.4') {
      blanks.bend = blankLine('ch6-blank-bend', 'The integral of $z$ is ');
      blankHost.append(blanks.bend);
    } else if (stage.id === '6.5') {
      blanks.cauchy = blankLine('ch6-blank-cauchy', 'The formula returns ');
      blankHost.append(blanks.cauchy);
    } else {
      blanks.liouville = blankLine('ch6-blank-liouville', 'The derivative is ');
      blankHost.append(blanks.liouville);
    }
    const practice = h('div', { class: 'chapter-exercises', id: `ch6-practice-${slug(stage.id)}` });
    const summit = h('p', { class: 'ch6-summit', id: `${scope}-summit` });
    appendRich(summit, stage.summit);
    const tick = h('button', {
      type: 'button', class: 'btn', id: `chapter-tick-${slug(stage.id)}`, 'aria-pressed': 'false', disabled: '',
    }, 'Stage complete');
    tick.addEventListener('click', () => {
      if (tick.disabled) return;
      ticks = toggleTick(ticks, stage.id);
      saveSharedTicks(store, ticks);
      paintAll();
    });
    ticksBtn[stage.id] = tick;
    const head = [
      h('p', { class: 'book-flag', id: `${scope}-flag` }, stage.id),
      h('h2', { id: `${scope}-title` }, CHAPTER_6.sections.find((s) => s.id === stage.id).title),
      h('p', { class: 'book-page' }, `Page ${CHAPTER_6.sections.find((s) => s.id === stage.id).page}`),
      gesture,
      picture,
    ];
    if (stage.id === '6.1') head.push(h('div', { class: 'book-next', id: 'chapter-next-row' }, status, nextBtn));
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': stage.id, 'data-state': 'ahead',
    },
      ...head,
      read,
      h('p', { class: 'book-label', id: `${scope}-worked-label` }, 'Worked example'),
      sourceTag({ pin: stage.workedPin, href: stage.workedHref }),
      worked,
      blankHost,
      h('p', { class: 'book-label', id: `${scope}-sheet-label` }, 'For the exam'),
      sheet,
      practice,
      summit,
      h('div', { class: 'problem-actions' }, tick)));
  }

  function paintAll() {
    const real = section.querySelector('#ch6-real-stage');
    const sum = section.querySelector('#ch6-sum-stage');
    const deform = section.querySelector('#ch6-deform-stage');
    const bend = section.querySelector('#ch6-bend-stage');
    const cauchy = section.querySelector('#ch6-cauchy-stage');
    const liouville = section.querySelector('#ch6-liouville-stage');
    const phase = real && real.dataset.phase;
    fillGap(blanks.half, phase === 'half' ? '$2i$' : '');
    fillGap(blanks.full, phase === 'full' ? '$0$' : '');
    const steps = sum ? Number(sum.dataset.steps) : 0;
    fillGap(blanks.exact, steps === 8 ? '$\\exp(2+i\\pi/4)-1$' : '');
    const where = deform && deform.dataset.where;
    fillGap(blanks.pole, where === 'inside' ? '$2\\pi i$' : (where === 'outside' ? '$0$' : ''));
    fillGap(blanks.bend, bend && bend.dataset.bent === 'true' ? '$4+2i$' : '');
    const spot = cauchy && cauchy.dataset.where;
    fillGap(blanks.cauchy, spot === 'inside' ? 'the green point' : (spot === 'outside' ? '$0$' : ''));
    fillGap(blanks.liouville, liouville && liouville.dataset.collapsed === 'true' ? '$0$' : '');
    setTick(ticksBtn['6.1'], ticks['6.1'] === true, phase === 'full');
    setTick(ticksBtn['6.2'], ticks['6.2'] === true, steps === 8);
    setTick(ticksBtn['6.3'], ticks['6.3'] === true, where === 'inside');
    setTick(ticksBtn['6.4'], ticks['6.4'] === true, bend && bend.dataset.bent === 'true');
    setTick(ticksBtn['6.5'], ticks['6.5'] === true, spot === 'inside');
    setTick(ticksBtn['6.6'], ticks['6.6'] === true, liouville && liouville.dataset.collapsed === 'true');
    paintStatus();
  }

  function watch(selector) {
    const node = section.querySelector(selector);
    if (!node) return;
    const observer = new MutationObserver(paintAll);
    observer.observe(node, { attributes: true, attributeFilter: ['data-phase', 'data-steps', 'data-where', 'data-holds', 'data-bent', 'data-collapsed'] });
    stops.push(() => observer.disconnect());
  }

  section.append(
    h('header', { class: 'station-header' },
      h('p', { class: 'book-kicker' }, h('a', { href: '#book', id: 'chapter-back' }, 'The Book')),
      h('h1', { id: 'chapter-title' }, 'Chapter 6. Complex Integration'),
      h('p', { class: 'station-lede', id: 'chapter-lede' }, 'Six stages, from a real interval to a contour you can move.')),
    path,
    sourceTag({ pin: CHAPTER_6.pin, href: CHAPTER_6.href }),
    h('p', { class: 'book-footer-link' }, h('a', { href: '#book', id: 'chapter-back-end' }, 'Back to the book')));

  watch('#ch6-real-stage');
  watch('#ch6-sum-stage');
  watch('#ch6-deform-stage');
  watch('#ch6-bend-stage');
  watch('#ch6-cauchy-stage');
  watch('#ch6-liouville-stage');
  paintAll();

  const focus = ctx.book && ctx.book.focus;
  if (focus) {
    const target = section.querySelector(`#chapter-section-${slug(focus)}`)
      || section.querySelector(`#chapter-section-${slug(String(focus).split('.').slice(0, 2).join('.'))}`);
    if (target) {
      target.classList.add('is-target');
      target.scrollIntoView({ block: 'start' });
    }
  }

  const practiceUrl = new URL('data/practice/ch6.json', window.location.href);
  fetch(practiceUrl.href).then((res) => {
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }).then((items) => {
    if (dead || !Array.isArray(items)) return;
    for (const stage of STAGES) {
      const host = section.querySelector(`#ch6-practice-${slug(stage.id)}`);
      if (!host) continue;
      const mine = items.filter((item) => item && item.section === stage.id);
      stops.push(mountPractice(host, mine));
    }
  }).catch(() => {
    if (dead) return;
    const host = section.querySelector('#ch6-practice-6-1');
    if (host && !host.childElementCount) {
      host.append(h('p', { class: 'section-idea', id: 'ch6-practice-missing' }, 'The practice file did not load.'));
    }
  });

  return function unmount() {
    dead = true;
    for (const stop of stops) {
      try { stop(); } catch { /* a picture already released its listeners */ }
    }
  };
}
