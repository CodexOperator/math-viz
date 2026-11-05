// The three Chapter 3 pictures. Each has one gesture, at most three controls, and the site's clock.

import { createFrame, createMotion, prefersReducedMotion } from '../core/anim.js';
import { derivativeScene, squareScene, levelScene, clampRect, wrapPi, circleComparePoint, sharedGain, markScale, arcRadius, PLANE_SIZE } from './ch3-math.js';
import { h, appendRich } from '../stations/test2-ui.js';

const NS = 'http://www.w3.org/2000/svg';
const SIZE = PLANE_SIZE;

function svgEl(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

function plane(span) {
  const X = (re) => ((re + span) / (2 * span)) * SIZE;
  const Y = (im) => ((span - im) / (2 * span)) * SIZE;
  return { span, X, Y };
}

function clientMath(stage, span, ev) {
  const rect = stage.getBoundingClientRect();
  const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * SIZE;
  const py = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * SIZE;
  return {
    re: -span + (px / SIZE) * span * 2,
    im: span - (py / SIZE) * span * 2,
  };
}

function leftStage(stage, ev) {
  const rect = stage.getBoundingClientRect();
  return ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom;
}

function dotClient(stage, el) {
  const rect = stage.getBoundingClientRect();
  return {
    x: rect.left + (Number(el.getAttribute('cx')) / SIZE) * rect.width,
    y: rect.top + (Number(el.getAttribute('cy')) / SIZE) * rect.height,
  };
}

function listenMotion(onChange) {
  let media = null;
  try { media = matchMedia('(prefers-reduced-motion: reduce)'); } catch { media = null; }
  if (!media) return () => {};
  const on = () => onChange(media.matches === true);
  if (typeof media.addEventListener === 'function') media.addEventListener('change', on);
  else if (typeof media.addListener === 'function') media.addListener(on);
  return () => {
    if (typeof media.removeEventListener === 'function') media.removeEventListener('change', on);
    else if (typeof media.removeListener === 'function') media.removeListener(on);
  };
}

function axes(stage, span) {
  const { X, Y } = plane(span);
  const hx = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const hy = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  hx.setAttribute('x1', X(-span));
  hx.setAttribute('x2', X(span));
  hx.setAttribute('y1', Y(0));
  hx.setAttribute('y2', Y(0));
  hy.setAttribute('x1', X(0));
  hy.setAttribute('x2', X(0));
  hy.setAttribute('y1', Y(-span));
  hy.setAttribute('y2', Y(span));
  stage.append(hx, hy);
}

function setArrow(line, head, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const show = len >= 4;
  line.setAttribute('visibility', show ? 'visible' : 'hidden');
  head.setAttribute('visibility', show ? 'visible' : 'hidden');
  if (!show) return;
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  const ux = dx / len;
  const uy = dy / len;
  const tip = Math.min(13, Math.max(4, len * 0.55));
  const wing = Math.min(6, tip * 0.46);
  const bx = x2 - ux * tip;
  const by = y2 - uy * tip;
  head.setAttribute('points', `${x2},${y2} ${bx - uy * wing},${by + ux * wing} ${bx + uy * wing},${by - ux * wing}`);
}

function setClaim(claim, scene) {
  if (claim.dataset.text === scene.claim.text) {
    claim.dataset.holds = scene.claim.holds ? 'true' : 'false';
    return;
  }
  claim.dataset.text = scene.claim.text;
  claim.dataset.holds = scene.claim.holds ? 'true' : 'false';
  claim.replaceChildren();
  appendRich(claim, scene.claim.text);
}

function chip(id, label, pressed, onClick) {
  const b = h('button', { type: 'button', class: 'chip', id, 'aria-pressed': pressed ? 'true' : 'false' }, label);
  b.addEventListener('click', onClick);
  return b;
}

function mountShell(parent, id, label) {
  const stage = svgEl('svg', {
    id,
    viewBox: '0 0 480 480',
    tabindex: '0',
    role: 'img',
    'aria-label': label,
  });
  const claim = h('p', { id: `${id}-claim`, class: 'exp-claim' });
  const frame = h('div', { class: 'exp-stage' }, stage);
  const controls = h('div', { class: 'chips', role: 'group', 'aria-label': 'Examples' });
  return { stage, claim, frame, controls };
}

export function mountDerivativePicture(parent) {
  const span = 2.4;
  const { X, Y } = plane(span);
  const shell = mountShell(parent, 'chapter-deriv-stage', 'A tiny step and its image. Play sweeps the direction. Drag the green dot to move the base point.');
  axes(shell.stage, span);
  const arc = svgEl('path', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '4', 'stroke-linecap': 'round' });
  const gLine = svgEl('line', { stroke: 'var(--input)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  const gHead = svgEl('polygon', { fill: 'var(--input)' });
  const pLine = svgEl('line', { stroke: 'var(--output)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  const pHead = svgEl('polygon', { fill: 'var(--output)' });
  const handle = svgEl('circle', { r: '7', fill: 'var(--input)' });
  shell.stage.append(arc, gLine, gHead, pLine, pHead, handle);

  let fn = 'sq';
  let z = { re: 1, im: 1 };
  let phi = 0;
  let reduced = prefersReducedMotion();
  let playing = false;
  let remaining = 0;
  const motion = createMotion();
  const frame = createFrame();
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-deriv-play' }, reduced ? 'Step' : 'Play');
  const sq = chip('chapter-deriv-sq', 'z²', true, () => { fn = 'sq'; paint(); });
  const conj = chip('chapter-deriv-conj', 'conj', false, () => { fn = 'conj'; paint(); });
  shell.controls.append(sq, conj);

  function paint() {
    const scene = derivativeScene(fn, z, phi);
    const shared = sharedGain(z, [scene.h, scene.image], span);
    const gs = markScale(z, scene.h, span, shared, 11);
    const ps = markScale(z, scene.image, span, shared, 11);
    const ox = X(z.re);
    const oy = Y(z.im);
    const gx = X(z.re + gs * scene.h.re);
    const gy = Y(z.im + gs * scene.h.im);
    const px = X(z.re + ps * scene.image.re);
    const py = Y(z.im + ps * scene.image.im);
    setArrow(gLine, gHead, ox, oy, gx, gy);
    setArrow(pLine, pHead, ox, oy, px, py);
    handle.setAttribute('cx', ox);
    handle.setAttribute('cy', oy);
    const turn = scene.turn || 0;
    const radius = Math.abs(turn) > 0.12 ? arcRadius(ox, oy, phi, phi + turn) : 0;
    if (radius) {
      const a0 = phi;
      const a1 = phi + turn;
      const x0 = ox + radius * Math.cos(a0);
      const y0 = oy - radius * Math.sin(a0);
      const x1 = ox + radius * Math.cos(a1);
      const y1 = oy - radius * Math.sin(a1);
      const delta = wrapPi(turn);
      arc.setAttribute('visibility', 'visible');
      arc.setAttribute('d', `M ${x0} ${y0} A ${radius} ${radius} 0 ${Math.abs(delta) > Math.PI ? 1 : 0} ${delta > 0 ? 0 : 1} ${x1} ${y1}`);
    } else {
      arc.setAttribute('visibility', 'hidden');
    }
    sq.setAttribute('aria-pressed', String(fn === 'sq'));
    conj.setAttribute('aria-pressed', String(fn === 'conj'));
    setClaim(shell.claim, scene);
    shell.stage.setAttribute('aria-label', scene.claim.text);
    shell.stage.dataset.fn = fn;
    shell.stage.dataset.probeRe = String(z.re);
    shell.stage.dataset.probeIm = String(z.im);
    shell.stage.dataset.probeAngle = String(phi);
    shell.stage.dataset.holds = scene.claim.holds ? 'true' : 'false';
  }

  function stopPlay() {
    motion.cancel();
    playing = false;
    play.textContent = reduced ? 'Step' : 'Play';
  }

  play.addEventListener('click', () => {
    if (reduced) {
      phi = wrapPi(phi + Math.PI / 2);
      paint();
      return;
    }
    if (playing) {
      stopPlay();
      return;
    }
    if (remaining <= 1e-3) remaining = Math.PI * 2;
    playing = true;
    play.textContent = 'Pause';
    motion.drive((dt) => {
      const step = Math.min(remaining, (dt / 1000) * 0.9);
      phi += step;
      remaining -= step;
      paint();
      if (remaining <= 1e-3) {
        playing = false;
        play.textContent = 'Play';
        return false;
      }
      return true;
    });
  });

  const HIT = 22;
  const PICK = 4;
  let drag = null;
  function onHandle(ev) {
    const dot = dotClient(shell.stage, handle);
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT;
  }
  function place(re, im) {
    return clampRect(re, im, span);
  }
  function moveTo(ev) {
    const p = clientMath(shell.stage, span, ev);
    z = place(p.re, p.im);
  }
  function finishDrag() {
    const id = drag && drag.id;
    drag = null;
    frame.stop();
    if (id == null) return;
    try { shell.stage.releasePointerCapture(id); } catch { /* already released */ }
  }
  function onDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!onHandle(ev)) return;
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false };
    shell.stage.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      shell.stage.style.cursor = onHandle(ev) ? 'grab' : 'default';
      return;
    }
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < PICK) return;
    drag.moved = true;
    stopPlay();
    moveTo(ev);
    if (leftStage(shell.stage, ev)) {
      paint();
      finishDrag();
      return;
    }
    frame.arm(() => paint());
  }
  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) {
      moveTo(ev);
      frame.stop();
      paint();
    }
    finishDrag();
  }
  shell.stage.addEventListener('pointerdown', onDown);
  shell.stage.addEventListener('pointermove', onMove);
  shell.stage.addEventListener('pointerup', onUp);
  shell.stage.addEventListener('pointercancel', onUp);
  shell.stage.addEventListener('keydown', (ev) => {
    const step = ev.shiftKey ? 0.3 : 0.1;
    const d = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    stopPlay();
    z = place(z.re + d[0], z.im + d[1]);
    paint();
  });
  const dropMotion = listenMotion((next) => {
    reduced = next;
    stopPlay();
    paint();
  });
  const observe = h('p', { class: 'book-page', id: 'chapter-deriv-observe' }, 'Drag the green dot. Green is the step. Purple is where it goes. Orange is the turn.');
  const row = h('div', { class: 'ch3-deriv-row', id: 'chapter-deriv-row' }, shell.controls, play);
  parent.append(shell.frame, observe, shell.claim, row);
  paint();
  return function unmount() {
    stopPlay();
    frame.stop();
    dropMotion();
    shell.stage.removeEventListener('pointerdown', onDown);
    shell.stage.removeEventListener('pointermove', onMove);
    shell.stage.removeEventListener('pointerup', onUp);
    shell.stage.removeEventListener('pointercancel', onUp);
  };
}

export function mountSquarePicture(parent) {
  const span = 2.6;
  const drawScale = 0.62;
  const { X, Y } = plane(span);
  const shell = mountShell(parent, 'chapter-square-stage', 'A tiny square and its image. Drag the green corner.');
  axes(shell.stage, span);
  const inn = svgEl('polygon', { fill: 'none', stroke: 'var(--input)', 'stroke-width': '3' });
  const out = svgEl('polygon', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '3' });
  const mark = svgEl('circle', { r: '7', fill: 'var(--input)' });
  const imageMark = svgEl('circle', { r: '6', fill: 'var(--output)' });
  shell.stage.append(inn, out, imageMark, mark);
  let mode = 'turn';
  let theta = 0;
  const frame = createFrame();
  const turn = chip('chapter-square-turn', 'Turn', true, () => { mode = 'turn'; paint(); });
  const stretch = chip('chapter-square-stretch', 'Stretch', false, () => { mode = 'stretch'; paint(); });
  shell.controls.append(turn, stretch);

  function pts(list) {
    return list.map(([x, y]) => `${X(drawScale * x)},${Y(drawScale * y)}`).join(' ');
  }
  function paint() {
    const scene = squareScene(mode, theta);
    inn.setAttribute('points', pts(scene.corners));
    out.setAttribute('points', pts(scene.image));
    mark.setAttribute('cx', X(drawScale * scene.corners[0][0]));
    mark.setAttribute('cy', Y(drawScale * scene.corners[0][1]));
    imageMark.setAttribute('cx', X(drawScale * scene.image[0][0]));
    imageMark.setAttribute('cy', Y(drawScale * scene.image[0][1]));
    turn.setAttribute('aria-pressed', String(mode === 'turn'));
    stretch.setAttribute('aria-pressed', String(mode === 'stretch'));
    setClaim(shell.claim, scene);
    shell.stage.setAttribute('aria-label', scene.claim.text);
    shell.stage.dataset.mode = mode;
    shell.stage.dataset.probeAngle = String(theta);
    shell.stage.dataset.holds = scene.claim.holds ? 'true' : 'false';
  }
  function thetaUnder(ev) {
    const p = clientMath(shell.stage, span, ev);
    return Math.atan2(p.im, p.re) - Math.PI / 4;
  }
  const HIT = 22;
  const PICK = 4;
  let drag = null;
  function onHandle(ev) {
    const dot = dotClient(shell.stage, mark);
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT;
  }
  function onDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!onHandle(ev)) return;
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false };
    shell.stage.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      shell.stage.style.cursor = onHandle(ev) ? 'grab' : 'default';
      return;
    }
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < PICK) return;
    drag.moved = true;
    theta = thetaUnder(ev);
    frame.arm(() => paint());
  }
  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) {
      theta = thetaUnder(ev);
      frame.stop();
      paint();
    }
    drag = null;
    try { shell.stage.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  }
  shell.stage.addEventListener('pointerdown', onDown);
  shell.stage.addEventListener('pointermove', onMove);
  shell.stage.addEventListener('pointerup', onUp);
  shell.stage.addEventListener('pointercancel', onUp);
  shell.stage.addEventListener('keydown', (ev) => {
    const d = { ArrowRight: 0.15, ArrowLeft: -0.15 }[ev.key];
    if (d === undefined) return;
    ev.preventDefault();
    theta += ev.shiftKey ? d * 2 : d;
    paint();
  });
  const observe = h('p', { class: 'book-page', id: 'chapter-square-observe' }, 'Drag the green corner. Green is the tiny square. Purple is its image.');
  parent.append(shell.frame, observe, shell.claim, shell.controls);
  paint();
  return function unmount() {
    frame.stop();
    shell.stage.removeEventListener('pointerdown', onDown);
    shell.stage.removeEventListener('pointermove', onMove);
    shell.stage.removeEventListener('pointerup', onUp);
    shell.stage.removeEventListener('pointercancel', onUp);
  };
}

function pathOf(stage, span, branch) {
  const { X, Y } = plane(span);
  const d = branch.map(([x, y], i) => `${i ? 'L' : 'M'} ${X(x)} ${Y(y)}`).join(' ');
  const node = svgEl('path', { d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  stage.append(node);
  return node;
}

function uBranches(c, limit) {
  if (Math.abs(c) < 0.04) {
    return [[[-limit, -limit], [limit, limit]], [[-limit, limit], [limit, -limit]]];
  }
  const n = 36;
  const branches = [];
  if (c > 0) {
    for (const sign of [1, -1]) {
      const branch = [];
      for (let i = 0; i <= n; i += 1) {
        const y = -limit + (2 * limit * i) / n;
        const x = sign * Math.sqrt(y * y + c);
        if (Math.abs(x) <= limit + 0.05) branch.push([x, y]);
      }
      if (branch.length > 1) branches.push(branch);
    }
  } else {
    for (const sign of [1, -1]) {
      const branch = [];
      for (let i = 0; i <= n; i += 1) {
        const x = -limit + (2 * limit * i) / n;
        const y = sign * Math.sqrt(x * x - c);
        if (Math.abs(y) <= limit + 0.05) branch.push([x, y]);
      }
      if (branch.length > 1) branches.push(branch);
    }
  }
  return branches;
}

function vBranches(k, limit) {
  if (Math.abs(k) < 0.04) {
    return [[[-limit, 0], [limit, 0]], [[0, -limit], [0, limit]]];
  }
  const n = 28;
  const branches = [];
  for (const sign of [-1, 1]) {
    const branch = [];
    for (let i = 1; i <= n; i += 1) {
      const x = sign * (0.12 + (limit - 0.12) * (i / n));
      const y = k / (2 * x);
      if (Math.abs(y) <= limit) branch.push([x, y]);
    }
    if (branch.length > 1) branches.push(branch);
  }
  return branches;
}

function circleBranch(r2, limit) {
  const r = Math.sqrt(Math.max(0, r2));
  if (!(r > 0.05) || r > limit + 0.2) return [];
  const n = 64;
  const branch = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (2 * Math.PI * i) / n;
    branch.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return [branch];
}

function stroke(node, color, width, opacity) {
  node.setAttribute('stroke', color);
  node.setAttribute('stroke-width', width);
  if (opacity) node.setAttribute('opacity', opacity);
  return node;
}

export function mountLevelPicture(parent) {
  const span = 2.15;
  const shell = mountShell(parent, 'chapter-level-stage', 'Level curves. Drag the green point. Orange is u. Purple is the other family.');
  axes(shell.stage, span);
  const faint = svgEl('g', { id: 'chapter-level-faint' });
  const live = svgEl('g', { id: 'chapter-level-live' });
  const point = svgEl('circle', { r: '7', fill: 'var(--input)' });
  shell.stage.append(faint, live, point);
  let mode = 'conj';
  let faintFor = '';
  let z = { re: 1, im: 0.45 };
  const frame = createFrame();
  const conj = chip('chapter-level-conj', 'Conjugates', true, () => { mode = 'conj'; paint(); });
  const circles = chip('chapter-level-circles', 'Circles', false, () => {
    mode = 'circles';
    z = circleComparePoint(z);
    paint();
  });
  shell.controls.append(conj, circles);

  function drawFaint() {
    faint.replaceChildren();
    const limit = span - 0.04;
    const uGrid = [-2, -1, 1, 2];
    const vGrid = mode === 'circles' ? [0.4, 1, 2, 3.2] : [-2, -1, 1, 2];
    for (const c of uGrid) {
      for (const branch of uBranches(c, limit)) {
        stroke(pathOf(faint, span, branch), 'var(--polar)', '1.25', '0.45');
      }
    }
    for (const c of vGrid) {
      const branches = mode === 'circles' ? circleBranch(c, limit) : vBranches(c, limit);
      for (const branch of branches) {
        stroke(pathOf(faint, span, branch), 'var(--output)', '1.25', '0.4');
      }
    }
    faintFor = mode;
  }

  function paint() {
    if (faintFor !== mode) drawFaint();
    const scene = levelScene(mode, z.re, z.im);
    live.replaceChildren();
    const limit = span - 0.04;
    for (const branch of uBranches(scene.u, limit)) {
      stroke(pathOf(live, span, branch), 'var(--polar)', '3');
    }
    const curves = mode === 'circles' ? circleBranch(scene.v, limit) : vBranches(scene.v, limit);
    for (const branch of curves) {
      stroke(pathOf(live, span, branch), 'var(--output)', '3');
    }
    const { X, Y } = plane(span);
    point.setAttribute('cx', X(z.re));
    point.setAttribute('cy', Y(z.im));
    conj.setAttribute('aria-pressed', String(mode === 'conj'));
    circles.setAttribute('aria-pressed', String(mode === 'circles'));
    setClaim(shell.claim, scene);
    shell.stage.setAttribute('aria-label', scene.claim.text);
    shell.stage.dataset.mode = mode;
    shell.stage.dataset.probeRe = String(z.re);
    shell.stage.dataset.probeIm = String(z.im);
    shell.stage.dataset.holds = scene.claim.holds ? 'true' : 'false';
  }

  const HIT = 22;
  const PICK = 4;
  let drag = null;
  function onHandle(ev) {
    const dot = dotClient(shell.stage, point);
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT;
  }
  function place(re, im) {
    const next = clampRect(re, im, span);
    if (Math.hypot(next.re, next.im) < 0.12) return { re: 0, im: 0 };
    return next;
  }
  function moveTo(ev) {
    const p = clientMath(shell.stage, span, ev);
    z = place(p.re, p.im);
  }
  function finishDrag() {
    const id = drag && drag.id;
    drag = null;
    frame.stop();
    if (id == null) return;
    try { shell.stage.releasePointerCapture(id); } catch { /* already released */ }
  }
  function onDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!onHandle(ev)) return;
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false };
    shell.stage.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      shell.stage.style.cursor = onHandle(ev) ? 'grab' : 'default';
      return;
    }
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < PICK) return;
    drag.moved = true;
    moveTo(ev);
    if (leftStage(shell.stage, ev)) {
      paint();
      finishDrag();
      return;
    }
    frame.arm(() => paint());
  }
  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) {
      moveTo(ev);
      frame.stop();
      paint();
    }
    finishDrag();
  }
  shell.stage.addEventListener('pointerdown', onDown);
  shell.stage.addEventListener('pointermove', onMove);
  shell.stage.addEventListener('pointerup', onUp);
  shell.stage.addEventListener('pointercancel', onUp);
  shell.stage.addEventListener('keydown', (ev) => {
    const step = ev.shiftKey ? 0.3 : 0.1;
    const d = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (!d) return;
    ev.preventDefault();
    z = place(z.re + d[0], z.im + d[1]);
    paint();
  });
  const observe = h('p', { class: 'book-page', id: 'chapter-level-observe' }, 'Drag the green point. Orange is a level of u. Purple is the other family.');
  parent.append(shell.frame, observe, shell.claim, shell.controls);
  paint();
  return function unmount() {
    frame.stop();
    shell.stage.removeEventListener('pointerdown', onDown);
    shell.stage.removeEventListener('pointermove', onMove);
    shell.stage.removeEventListener('pointerup', onUp);
    shell.stage.removeEventListener('pointercancel', onUp);
  };
}
