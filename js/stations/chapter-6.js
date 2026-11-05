// Chapter 6 as a mountain. Stages 6.1–6.3 are walked. Stages 6.4–6.6 are the next camps.
// A stage is finished when its picture holds and the stage is marked. The tick
// lives in the same memory as the other chapters.

import { sectionHref } from '../data/book.js';
import { CHAPTER_6, chapter4ExerciseIds, chapter5ExerciseIds, chapter6StageIds } from '../data/book-path.js';
import { loadSharedTicks, saveSharedTicks, toggleTick, sectionFinished, chapterTally } from '../book/progress.js';
import { h, appendRich, sourceTag } from './test2-ui.js';
import { mountRealIntegral, mountContourSum, mountDeform, mountBend, mountCauchy, mountLiouville, mountGoursat } from './ch6-pictures.js';
import { mountPractice, matches } from './ch6-cards.js';

const PICTURES = {
  real: mountRealIntegral,
  sum: mountContourSum,
  deform: mountDeform,
  goursat: mountGoursat,
  bend: mountBend,
  cauchy: mountCauchy,
  liouville: mountLiouville,
};

const STAGES = [
  {
    id: '6.1',
    why: 'Later integrals come back to this real integral.',
    next: 'Next camp is 6.2, contours.',
    go: '6.2',
    goLabel: 'Go to 6.2',
    gesture: 'Drag the green point around the orange circle. Purple is the integral.',
    picture: 'real',
    read: [
      { pin: 'Definition 6.1, page 163', href: sectionHref('sec_complex-integrals.html', 'Integral_Def_1') },
      { pin: 'Example 6.1, page 163', href: sectionHref('sec_complex-integrals.html', 'sec_complex-integrals-5') },
    ],
    workedPin: 'Definition 6.1, page 163',
    workedHref: sectionHref('sec_complex-integrals.html', 'Integral_Def_1'),
    worked: 'From $0$ to $\\pi$, integrate $e^{it}$. From $0$ to $2\\pi$, that is one full period of the same integrand.',
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
    why: 'A contour is the real integral from 6.1, after a parametrization.',
    next: 'Next camp is 6.3, Cauchy-Goursat.',
    go: '6.3',
    goLabel: 'Go to 6.3',
    worked: 'The segment from $0$ to $2+i\\pi/4$ is $z(t)=(2+i\\pi/4)t$ for $0\\le t\\le 1$. Theorem 6.1, page 172, says multiply $e^{z(t)}$ by $z\'(t)$ and integrate in $t$.',
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
    why: '6.2 computes one path. A closed analytic path integrates to $0$.',
    next: 'Next camp is 6.4, the fundamental theorems.',
    go: '6.4',
    goLabel: 'Go to 6.4',
    gesture: 'Play subdivides the triangle. The integrand is analytic.',
    picture: 'goursat',
    read: [
      { pin: 'Theorem 6.5, page 183', href: sectionHref('sec_cauchy-goursat.html', 'CG_Thm') },
      { pin: "Goursat's proof, page 184", href: sectionHref('sec_cauchy-goursat.html', 'sec_cauchy-goursat-17') },
      { pin: 'Example 6.12, page 186', href: sectionHref('sec_cauchy-goursat.html', 'sec_cauchy-goursat-18') },
      { pin: 'Theorem 6.6, page 187', href: sectionHref('sec_cauchy-goursat.html', 'Deformation_of_Contour') },
      { pin: 'Corollary 6.1, page 188', href: sectionHref('sec_cauchy-goursat.html', 'x2Pi_or_zero') },
    ],
    workedPin: 'Corollary 6.1, page 188',
    workedHref: sectionHref('sec_cauchy-goursat.html', 'x2Pi_or_zero'),
    worked: 'Both circles are positively oriented and the integrand is $1/z$. Corollary 6.1, page 188, is the power $-1$. Watch whether the pole stays inside the green circle.',
    sheet: [
      'Analytic inside and on a simple closed curve: Theorem 6.5, page 183, the integral is $0$.',
      'Same singularity inside two closed curves, analytic between them: Theorem 6.6, page 187, the integrals match.',
      'Only a parametrization: Theorem 6.1, page 172, multiply by $z\'$.',
      '$1/(z-z_0)$ with $z_0$ inside: Corollary 6.1, page 188, $2\\pi i$. Every other integer power is $0$.',
    ],
    summit: 'Analytic inside and on a simple closed curve: Theorem 6.5, page 183, says the integral is $0$.',
    deformSummit: 'Deforming a closed contour through analytic points leaves the integral unchanged.',
  },
  {
    id: '6.4',
    why: '6.3 gives $0$ on a closed curve. Two ends use an antiderivative.',
    next: 'Next camp is 6.5, the Cauchy integral formulas.',
    go: '6.5',
    goLabel: 'Go to 6.5',
    gesture: 'Drag the green bend. The ends stay put, and the integrand is $z$.',
    picture: 'bend',
    read: [
      { pin: 'Theorem 6.8, page 193', href: sectionHref('sec_integration-theorems.html', 'Antideriv_Thm') },
      { pin: 'Theorem 6.9, page 194', href: sectionHref('sec_integration-theorems.html', 'DInt_Thm') },
    ],
    workedPin: 'Theorem 6.9, page 194',
    workedHref: sectionHref('sec_integration-theorems.html', 'DInt_Thm'),
    worked: 'The ends stay at $-1-i$ and $3+i$. An antiderivative of $z$ is $z^{2}/2$.',
    sheet: [
      'Theorem 6.9, page 194: in a simply connected domain, $\\int_{z_0}^{z_1} f = F(z_1)-F(z_0)$.',
      'An analytic integrand does not care which path you draw between the same ends.',
    ],
    summit: 'For an analytic integrand, the integral is the antiderivative at the end minus the antiderivative at the start.',
  },
  {
    id: '6.5',
    why: '6.4 needs an antiderivative. This formula returns the inside value.',
    next: 'Next camp is 6.6, Morera and Liouville.',
    go: '6.6',
    goLabel: 'Go to 6.6',
    gesture: 'Drag the green point. The integrand is $z/(z-z_0)$ on the unit circle.',
    picture: 'cauchy',
    read: [
      { pin: 'Theorem 6.10, page 197', href: sectionHref('sec_cauchy-integral-formulas.html', 'Cauchy_Int_Formula') },
      { pin: 'Theorem 6.12, page 199', href: sectionHref('sec_cauchy-integral-formulas.html', 'Cauchy_Int_Formulas') },
      { pin: 'Example 6.21, page 198', href: sectionHref('sec_cauchy-integral-formulas.html', 'sec_cauchy-integral-formulas-5') },
    ],
    workedPin: 'Theorem 6.10, page 197',
    workedHref: sectionHref('sec_cauchy-integral-formulas.html', 'Cauchy_Int_Formula'),
    worked: 'For $f(z)=z$ on the unit circle, the formula is $\\dfrac{1}{2\\pi i}\\int \\dfrac{z}{z-z_0}\\,dz$. It applies while the green point stays inside.',
    sheet: [
      'Theorem 6.10, page 197: $f(z_0)=\\dfrac{1}{2\\pi i}\\int_C \\dfrac{f(z)}{z-z_0}\\,dz$ when $z_0$ is inside $C$.',
      'Theorem 6.12, page 199, equation (6.48): $f^{(n)}(z_0)=\\dfrac{n!}{2\\pi i}\\int_C \\dfrac{f(z)}{(z-z_0)^{n+1}}\\,dz$. The power in the denominator is $n+1$. Divide by $n!$.',
    ],
    summit: 'The value inside a contour is an integral on the boundary.',
  },
  {
    id: '6.6',
    why: '6.5 bounds a derivative on one circle. Liouville needs every circle.',
    next: 'Next camp is Chapter 7, Taylor and Laurent series.',
    go: 'book',
    goLabel: 'Back to the book',
    gesture: 'Drag the green radius across the circles. When $|f|\\le 1$, purple is the bound $1/R$ on $|f\'|$.',
    picture: 'liouville',
    read: [
      { pin: 'Theorem 6.13, page 203', href: sectionHref('sec_morera-liouville.html', 'Morera_s_Thm') },
      { pin: 'Theorem 6.17, page 205', href: sectionHref('sec_morera-liouville.html', 'Cauchy_Ineqs') },
      { pin: 'Theorem 6.18, page 206', href: sectionHref('sec_morera-liouville.html', 'Liouville_s_Thm') },
    ],
    workedPin: 'Theorem 6.18, page 206',
    workedHref: sectionHref('sec_morera-liouville.html', 'Liouville_s_Thm'),
    worked: 'If $|f|\\le M$ on every circle, Theorem 6.17, page 205, says $|f\'(z_0)|\\le M/R$. One circle is not every circle.',
    sheet: [
      'Theorem 6.13, page 203: if $f$ is continuous in a simply connected domain and every closed contour integrates to $0$, then $f$ is analytic.',
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

function studentBlank(id, prompt, readStep, onGrade) {
  const input = h('input', {
    type: 'text', class: 'ch6-blank', id: `${id}-input`, 'aria-label': 'Your answer', autocomplete: 'off',
  });
  const check = h('button', { type: 'button', class: 'btn', id: `${id}-check` }, 'Check');
  const note = h('p', { class: 'hint-note', id: `${id}-note`, hidden: '' });
  const line = h('p', { class: 'exp-blank', id, 'data-right': 'false' });
  appendRich(line, prompt);
  line.append(input);
  const wrap = h('div', { class: 'ch6-student', id: `${id}-row`, 'data-right': 'false' },
    line, h('div', { class: 'problem-actions' }, check), note);
  let locked = false;
  function grade() {
    if (locked) return;
    const step = readStep();
    const right = matches(step, input.value);
    line.dataset.right = right ? 'true' : 'false';
    wrap.dataset.right = right ? 'true' : 'false';
    note.hidden = false;
    note.replaceChildren();
    appendRich(note, right ? (step.why || '') : (step.miss || 'The value stays covered.'));
    if (right && step.lock !== false) {
      locked = true;
      input.disabled = true;
      check.disabled = true;
    }
    if (onGrade) onGrade();
  }
  check.addEventListener('click', grade);
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') grade(); });
  return wrap;
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
  const path = h('ol', { class: 'chapter-path ch6-path', id: 'chapter-path' });
  const blanks = {};
  const ticksBtn = {};

  function paintStatus() {
    const t = chapterTally(liveSections(), ticks);
    if (t.complete) status.textContent = `Done. ${t.exercisesTicked} of ${t.exerciseTotal} stages.`;
    else status.textContent = `Next is ${t.nextId || '6.1'}. ${t.exercisesTicked} of ${t.exerciseTotal} stages.`;
    for (const node of path.querySelectorAll('.section-node')) {
      const id = node.getAttribute('data-section');
      const spec = CHAPTER_6.sections.find((s) => s.id === id);
      if (!spec || !spec.exercises.length) continue;
      const finished = sectionFinished(spec, ticks);
      node.setAttribute('data-state', finished ? 'done' : (t.nextId === id ? 'next' : 'ahead'));
    }
  }

  function campLine(stage) {
    const line = h('p', { class: 'ch6-next-camp', id: `chapter-section-${slug(stage.id)}-next` });
    appendRich(line, stage.next);
    const go = h('button', {
      type: 'button', class: 'btn btn-primary', id: `chapter-go-${slug(stage.id)}`,
    }, stage.goLabel);
    go.addEventListener('click', () => {
      if (stage.go === 'book') {
        ctx.navigate('book');
        return;
      }
      const node = section.querySelector(`#chapter-section-${slug(stage.go)}`);
      if (node) node.scrollIntoView({ block: 'start' });
    });
    return h('div', { class: 'book-next', id: `chapter-go-row-${slug(stage.id)}` }, line, go);
  }

  const fixed = (answer, accept, miss, why) => () => ({ answer, accept, miss, why });

  for (const stage of STAGES) {
    const scope = `chapter-section-${slug(stage.id)}`;
    const why = h('p', { class: 'section-idea ch6-why', id: `${scope}-why` });
    appendRich(why, stage.why);
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
      blanks.half = studentBlank('ch6-blank-half', 'From $0$ to $\\pi$ the integral is ', fixed(
        '2i', ['2 i', '$2i$'],
        'Integrate $e^{it}$ from $0$ to $\\pi$. The value stays covered.',
        'From $0$ to $\\pi$, the integral is $2i$.',
      ), () => paintAll());
      blanks.full = studentBlank('ch6-blank-full', 'From $0$ to $2\\pi$ the integral is ', fixed(
        '0', ['0+0i'],
        'A full period of $e^{it}$ returns to the start. The value stays covered.',
        'From $0$ to $2\\pi$, the integral is $0$.',
      ), () => paintAll());
      blankHost.append(blanks.half, blanks.full);
    } else if (stage.id === '6.2') {
      blanks.exact = studentBlank('ch6-blank-exact', 'The exact value is ', fixed(
        '\\exp(2+i\\pi/4)-1', ['e^{2+i\\pi/4}-1', 'exp(2+i*pi/4)-1'],
        'Multiply by $z\'(t)$ and integrate in $t$. The value stays covered.',
        'The integral equals $\\exp(2+i\\pi/4)-1$.',
      ), () => paintAll());
      blankHost.append(blanks.exact);
    } else if (stage.id === '6.3') {
      blanks.zero = studentBlank('ch6-blank-zero', 'The integral over the triangle is ', fixed(
        '0', ['0+0i'],
        'The integrand is analytic inside and on the triangle. Theorem 6.5, page 183, is the result. The value stays covered.',
        'Theorem 6.5, page 183, says the integral is $0$.',
      ), () => paintAll());
      blankHost.append(blanks.zero);
    } else if (stage.id === '6.4') {
      blanks.bend = studentBlank('ch6-blank-bend', 'The integral of $z$ is ', fixed(
        '4+2i', ['4+2 i', '4+2\\,i'],
        'Evaluate $z^2/2$ at the two ends and subtract. The value stays covered.',
        '$((3+i)^2-(-1-i)^2)/2=4+2i$.',
      ), () => paintAll());
      blankHost.append(blanks.bend);
    } else if (stage.id === '6.5') {
      blanks.cauchy = studentBlank('ch6-blank-cauchy', 'The formula returns ', fixed(
        'the green point', ['green point', 'z_0', 'f(z_0)', '$z_0$'],
        'Theorem 6.10 returns $f(z_0)$ while the point is inside. Name that point. The words stay covered.',
        'Inside the circle, the formula returns the green point.',
      ), () => paintAll());
      blankHost.append(blanks.cauchy);
    } else {
      blanks.liouville = studentBlank('ch6-blank-liouville', 'If the bound holds on every circle, $f$ is ', fixed(
        'constant', ['a constant', 'Constant', 'A constant'],
        'The bound has to hold on every circle, not one radius. Name what that forces $f$ to be. The word stays covered.',
        'Theorem 6.18, page 206: a bound on every circle forces $f$ to be constant.',
      ), () => paintAll());
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
      why,
      gesture,
      picture,
    ];
    if (stage.id === '6.1') head.push(h('div', { class: 'book-next', id: 'chapter-next-row' }, status));
    const tail = [
      h('p', { class: 'book-label', id: `${scope}-sheet-label` }, 'For the exam'),
      sheet,
      practice,
      summit,
      campLine(stage),
      h('div', { class: 'problem-actions' }, tick),
    ];
    let body;
    if (stage.id === '6.3') {
      const beat = h('p', { class: 'book-label', id: `${scope}-beat` }, 'A pole is the next beat');
      const beatGesture = h('p', { class: 'ch6-gesture', id: `${scope}-deform-gesture` });
      appendRich(beatGesture, 'Drag the green handle. The integrand is $1/z$.');
      const deform = h('div', { class: 'ch6-picture', id: 'ch6-picture-deform' });
      stops.push(mountDeform(deform));
      blanks.pole = studentBlank('ch6-blank-pole', 'The integral of $1/z$ over the green circle is ', () => {
        const where = section.querySelector('#ch6-deform-stage') && section.querySelector('#ch6-deform-stage').dataset.where;
        if (where === 'inside') {
          return {
            answer: '2\\pi i', accept: ['2πi', '2pi i'], lock: false,
            miss: 'The pole is inside the green circle. Corollary 6.1 is the power $-1$. The value stays covered.',
            why: 'The pole is inside, and the power is $-1$, so the integral is $2\\pi i$.',
          };
        }
        if (where === 'outside') {
          return {
            answer: '0', accept: ['0+0i'], lock: false,
            miss: 'The pole has left the green circle. Theorem 6.5 applies. The value stays covered.',
            why: 'The pole is outside, so the integral over the green circle is $0$.',
          };
        }
        return {
          answer: '', accept: [], lock: false,
          miss: 'The pole is on the circle. Move it inside or outside before you write a value.',
          why: '',
        };
      }, () => paintAll());
      const poleHost = h('div', { class: 'exp-blanks', id: `${scope}-pole-blanks` }, blanks.pole);
      const deformSummit = h('p', { class: 'ch6-summit', id: `${scope}-deform-summit` });
      appendRich(deformSummit, stage.deformSummit);
      body = [
        ...head,
        read,
        blankHost,
        summit,
        h('div', { class: 'problem-actions' }, tick),
        beat,
        beatGesture,
        deform,
        poleHost,
        h('p', { class: 'book-label', id: `${scope}-worked-label` }, 'Worked example'),
        sourceTag({ pin: stage.workedPin, href: stage.workedHref }),
        worked,
        deformSummit,
        h('p', { class: 'book-label', id: `${scope}-sheet-label` }, 'For the exam'),
        sheet,
        practice,
        campLine(stage),
      ];
    } else {
      body = [
        ...head,
        read,
        h('p', { class: 'book-label', id: `${scope}-worked-label` }, 'Worked example'),
        sourceTag({ pin: stage.workedPin, href: stage.workedHref }),
        worked,
        blankHost,
        ...tail,
      ];
    }
    path.append(h('li', {
      class: 'section-node', id: scope, 'data-section': stage.id, 'data-state': 'ahead',
    }, ...body));
  }

  function ready(node) {
    return !!(node && node.dataset.right === 'true');
  }

  function paintAll() {
    const real = section.querySelector('#ch6-real-stage');
    const sum = section.querySelector('#ch6-sum-stage');
    const goursat = section.querySelector('#ch6-goursat-stage');
    const bend = section.querySelector('#ch6-bend-stage');
    const cauchy = section.querySelector('#ch6-cauchy-stage');
    const liouville = section.querySelector('#ch6-liouville-stage');
    const phase = real && real.dataset.phase;
    const steps = sum ? Number(sum.dataset.steps) : 0;
    const spot = cauchy && cauchy.dataset.where;
    setTick(ticksBtn['6.1'], ticks['6.1'] === true, phase === 'full' && ready(blanks.half) && ready(blanks.full));
    setTick(ticksBtn['6.2'], ticks['6.2'] === true, steps === 8 && ready(blanks.exact));
    setTick(ticksBtn['6.3'], ticks['6.3'] === true, goursat && goursat.dataset.subdivided === 'true' && ready(blanks.zero));
    setTick(ticksBtn['6.4'], ticks['6.4'] === true, bend && bend.dataset.bent === 'true' && ready(blanks.bend));
    setTick(ticksBtn['6.5'], ticks['6.5'] === true, spot === 'inside' && ready(blanks.cauchy));
    setTick(ticksBtn['6.6'], ticks['6.6'] === true, liouville && liouville.dataset.every === 'true' && ready(blanks.liouville));
    paintStatus();
  }

  function watch(selector) {
    const node = section.querySelector(selector);
    if (!node) return;
    const observer = new MutationObserver(paintAll);
    observer.observe(node, { attributes: true, attributeFilter: ['data-phase', 'data-steps', 'data-where', 'data-holds', 'data-bent', 'data-subdivided', 'data-every'] });
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
  watch('#ch6-goursat-stage');
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
