// Three Chapter 2 pictures. Each one is a drag: green in the z plane, purple in the w plane.
// Blue is the set you are testing. Orange is the set it lands on.
// The claim is true of one place and false of another. No second control, no clock.

import { createFrame } from '../core/anim.js';
import { h, appendRich } from './test2-ui.js';

const SIZE = 320;
const HIT = 44;
const DOT_R = 14;
const NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

function makeView(cx, cy, half) {
  const span = half * 2;
  return {
    cx, cy, half,
    X: (re) => ((re - (cx - half)) / span) * SIZE,
    Y: (im) => ((cy + half - im) / span) * SIZE,
    R: (radius) => (radius / span) * SIZE,
    re: (px) => (cx - half) + (px / SIZE) * span,
    im: (py) => (cy + half) - (py / SIZE) * span,
    clamp(z) {
      const inset = (DOT_R / SIZE) * half * 2;
      return {
        re: Math.min(cx + half - inset, Math.max(cx - half + inset, z.re)),
        im: Math.min(cy + half - inset, Math.max(cy - half + inset, z.im)),
      };
    },
    inside(z) {
      return Math.abs(z.re - cx) <= half + 1e-9 && Math.abs(z.im - cy) <= half + 1e-9;
    },
  };
}

function axes(view) {
  const x = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '1.5' });
  const y = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '1.5' });
  x.setAttribute('x1', view.X(view.cx - view.half));
  x.setAttribute('x2', view.X(view.cx + view.half));
  x.setAttribute('y1', view.Y(0));
  x.setAttribute('y2', view.Y(0));
  y.setAttribute('y1', view.Y(view.cy - view.half));
  y.setAttribute('y2', view.Y(view.cy + view.half));
  y.setAttribute('x1', view.X(0));
  y.setAttribute('x2', view.X(0));
  return [x, y];
}

function plane(id, label) {
  const svg = svgEl('svg', {
    id, viewBox: `0 0 ${SIZE} ${SIZE}`, tabindex: '0', role: 'img', 'aria-label': label,
  });
  svg.classList.add('ch2-stage');
  return svg;
}

function shade(view, re0, re1, im0, im1, color) {
  const rect = svgEl('rect', { fill: color, opacity: '0.16' });
  const x = view.X(Math.min(re0, re1));
  const y = view.Y(Math.max(im0, im1));
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', String(Math.abs(view.X(re1) - view.X(re0))));
  rect.setAttribute('height', String(Math.abs(view.Y(im0) - view.Y(im1))));
  return rect;
}

function putLine(el, view, re1, im1, re2, im2) {
  el.setAttribute('x1', view.X(re1));
  el.setAttribute('y1', view.Y(im1));
  el.setAttribute('x2', view.X(re2));
  el.setAttribute('y2', view.Y(im2));
}

// Example 2.9, page 50. w = iz + i sends Re z ≥ 1 onto Im w ≥ 2.
export function linearImage(z) {
  return { re: -z.im, im: z.re + 1 };
}

export function linearClaim(z) {
  const holds = z.re >= 1 - 1e-9;
  return {
    holds,
    text: holds
      ? 'On the blue line or to its right, $w = iz+i$ lands on or above $\\operatorname{Im} w = 2$.'
      : 'Left of the blue line, $w = iz+i$ lands below $\\operatorname{Im} w = 2$.',
  };
}

// Example 2.12 and Exercise 1(b), page 59. The line x = 2 maps to u = 4 - v^2/16.
export function squareImage(z) {
  return { re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im };
}

// About two pixels on the w plane at the edge of this window. Wider than that,
// the purple point has left the stroke and the sentence must not say it sits on the curve.
export const POWER_TOLERANCE = 0.02;

export function powerClaim(z) {
  const holds = Math.abs(z.re - 2) <= POWER_TOLERANCE;
  return {
    holds,
    text: holds
      ? 'On the blue line, $w = z^2$ sits on the orange curve.'
      : 'Off the blue line, $w = z^2$ has left the orange curve.',
  };
}

// Example 2.16, page 62. f(z) = conjugate(z), and δ = ε.
export const LIMIT_Z0 = Object.freeze({ re: 1, im: 1 });
export const LIMIT_EPS = 0.75;

export function conjugateImage(z) {
  return { re: z.re, im: -z.im };
}

export function limitClaim(z) {
  const dx = z.re - LIMIT_Z0.re;
  const dy = z.im - LIMIT_Z0.im;
  const dist = Math.hypot(dx, dy);
  if (dist <= 1e-6) {
    return { holds: false, where: 'at', text: 'Definition 2.4 skips $z_0$. Move off it.' };
  }
  if (dist < LIMIT_EPS) {
    return { holds: true, where: 'in', text: 'The image is inside the disk of radius $0.75$. Here $\\delta = \\varepsilon$.' };
  }
  return { holds: false, where: 'out', text: 'The image is outside that disk.' };
}

function mountPair(parent, opts) {
  const zView = opts.zView;
  const wView = opts.wView;
  const zSvg = plane(`${opts.id}-stage`, opts.aria);
  const wSvg = plane(`${opts.id}-image`, opts.imageAria);
  wSvg.setAttribute('tabindex', '-1');
  zSvg.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown');

  for (const node of axes(zView)) zSvg.append(node);
  for (const node of axes(wView)) wSvg.append(node);
  opts.drawZ(zSvg, zView);
  opts.drawW(wSvg, wView);

  const green = svgEl('circle', { r: String(DOT_R), fill: 'var(--input)' });
  const purple = svgEl('circle', { r: String(DOT_R), fill: 'var(--output)' });
  zSvg.append(green);
  wSvg.append(purple);

  const claim = h('p', { id: `${opts.id}-claim`, class: 'ch2-claim', 'aria-live': 'polite' });
  const maps = h('div', { class: 'ch2-maps', id: `${opts.id}-maps` },
    h('figure', { class: 'ch2-plane' }, zSvg, h('figcaption', { class: 'book-page' }, 'z plane')),
    h('figure', { class: 'ch2-plane' }, wSvg, h('figcaption', { class: 'book-page' }, 'w plane')));
  parent.append(maps, claim);

  let z = { re: opts.start.re, im: opts.start.im };
  let claimText = '';
  const frame = createFrame();

  function paint() {
    const here = zView.clamp(z);
    z = here;
    const w = opts.image(here);
    const spoken = opts.claim(here);
    green.setAttribute('cx', zView.X(here.re));
    green.setAttribute('cy', zView.Y(here.im));
    const finite = w && Number.isFinite(w.re) && Number.isFinite(w.im);
    // A pole is not a point of the plane. Parking the dot at the view centre
    // would put 1/0 at the centre of the orange circle.
    if (!finite) {
      purple.setAttribute('opacity', '0');
    } else {
      const shown = wView.inside(w) ? w : wView.clamp(w);
      purple.setAttribute('cx', wView.X(shown.re));
      purple.setAttribute('cy', wView.Y(shown.im));
      purple.setAttribute('opacity', wView.inside(w) ? '1' : '0.45');
    }
    if (spoken.text !== claimText) {
      claimText = spoken.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
    claim.dataset.holds = spoken.holds ? 'true' : 'false';
    zSvg.dataset.re = String(here.re);
    zSvg.dataset.im = String(here.im);
    zSvg.dataset.holds = spoken.holds ? 'true' : 'false';
    if (opts.onClaim) opts.onClaim(spoken.holds === true);
  }

  function snap(next) {
    const p = zView.clamp(next);
    if (opts.snapRe == null) return p;
    if (Math.abs(p.re - opts.snapRe) <= (opts.snapTol || 0.2)) return { re: opts.snapRe, im: p.im };
    return p;
  }

  function at(ev) {
    const rect = zSvg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * SIZE;
    const py = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * SIZE;
    return snap({ re: zView.re(px), im: zView.im(py) });
  }

  function onDot(ev) {
    const rect = zSvg.getBoundingClientRect();
    const cx = Number(green.getAttribute('cx'));
    const cy = Number(green.getAttribute('cy'));
    const x = rect.left + (cx / SIZE) * rect.width;
    const y = rect.top + (cy / SIZE) * rect.height;
    return Math.hypot(ev.clientX - x, ev.clientY - y) <= HIT;
  }

  let drag = null;
  function onDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!onDot(ev)) return;
    drag = { id: ev.pointerId };
    zSvg.style.cursor = 'grabbing';
    zSvg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }
  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      zSvg.style.cursor = onDot(ev) ? 'grab' : 'default';
      return;
    }
    z = at(ev);
    frame.arm(paint);
  }
  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    z = at(ev);
    drag = null;
    zSvg.style.cursor = onDot(ev) ? 'grab' : 'default';
    frame.stop();
    paint();
    try { zSvg.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  }
  zSvg.addEventListener('pointerdown', onDown);
  zSvg.addEventListener('pointermove', onMove);
  zSvg.addEventListener('pointerup', onUp);
  zSvg.addEventListener('pointercancel', onUp);
  zSvg.addEventListener('keydown', (ev) => {
    // The unshifted step has to clear the snap band (0.2), or an arrow
    // from the line lands back on the line and the false claim never shows.
    const step = ev.shiftKey ? 0.45 : 0.28;
    const move = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (!move) return;
    ev.preventDefault();
    z = snap({ re: z.re + move[0], im: z.im + move[1] });
    frame.stop();
    paint();
  });

  paint();

  return function unmount() {
    frame.stop();
    zSvg.removeEventListener('pointerdown', onDown);
    zSvg.removeEventListener('pointermove', onMove);
    zSvg.removeEventListener('pointerup', onUp);
    zSvg.removeEventListener('pointercancel', onUp);
  };
}

export function mountLinear(parent, hooks) {
  const zView = makeView(1, 0, 2.5);
  const wView = makeView(0, 2, 2.6);
  const turn = svgEl('path', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5' });
  const cut = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2.5' });
  const imageLine = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '2.5' });
  return mountPair(parent, {
    id: 'ch2-linear',
    aria: 'Domain plane. The shaded side is Re z at least 1. The orange arc is a quarter turn. Drag the green point.',
    imageAria: 'Image plane for w = i z + i. The shaded side is Im w at least 2. Purple is the image.',
    zView, wView,
    start: { re: 1.6, im: 0.3 },
    image: linearImage,
    claim: linearClaim,
    onClaim: hooks && hooks.onClaim,
    drawZ(svg, view) {
      svg.append(shade(view, 1, view.cx + view.half, view.cy - view.half, view.cy + view.half, 'var(--cart)'));
      const r = view.R(0.55);
      turn.setAttribute('d', `M ${view.X(0.55)} ${view.Y(0)} A ${r} ${r} 0 0 0 ${view.X(0)} ${view.Y(0.55)}`);
      putLine(cut, view, 1, view.cy - view.half, 1, view.cy + view.half);
      svg.append(turn, cut);
    },
    drawW(svg, view) {
      svg.append(shade(view, view.cx - view.half, view.cx + view.half, 2, view.cy + view.half, 'var(--polar)'));
      putLine(imageLine, view, view.cx - view.half, 2, view.cx + view.half, 2);
      svg.append(imageLine);
    },
  });
}

export function mountPower(parent, hooks) {
  const zView = makeView(1.7, 0, 1.5);
  const wView = makeView(3, 0, 8);
  const cut = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2.5' });
  const curve = svgEl('polyline', {
    fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5', 'stroke-linejoin': 'round',
  });
  return mountPair(parent, {
    id: 'ch2-power',
    aria: 'Domain plane. Drag the green point. The blue line is x = 2.',
    imageAria: 'Image plane. The orange curve is the image of that line under z squared. Purple is z squared.',
    zView, wView,
    snapRe: 2,
    start: { re: 2, im: 0.5 },
    image: squareImage,
    claim: powerClaim,
    onClaim: hooks && hooks.onClaim,
    drawZ(svg, view) {
      putLine(cut, view, 2, view.cy - view.half, 2, view.cy + view.half);
      svg.append(cut);
    },
    drawW(svg, view) {
      const pts = [];
      for (let v = -6; v <= 6.01; v += 0.25) {
        const u = 4 - (v * v) / 16;
        pts.push(`${view.X(u)},${view.Y(v)}`);
      }
      curve.setAttribute('points', pts.join(' '));
      svg.append(curve);
    },
  });
}

export function mountLimit(parent, hooks) {
  const zView = makeView(LIMIT_Z0.re, LIMIT_Z0.im, 2);
  const wView = makeView(LIMIT_Z0.re, -LIMIT_Z0.im, 2);
  const disk = svgEl('circle', { fill: 'none', stroke: 'var(--cart)', 'stroke-width': '2.5' });
  const eps = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5' });
  const z0 = svgEl('circle', { r: '3.5', fill: 'var(--cart)' });
  const w0 = svgEl('circle', { r: '3.5', fill: 'var(--polar)' });
  return mountPair(parent, {
    id: 'ch2-limit',
    aria: 'Domain plane. Drag the green point toward 1 + i. The blue circle has radius 0.75.',
    imageAria: 'Image plane for the conjugate. The orange circle has radius 0.75 about 1 - i. Purple is the conjugate.',
    zView, wView,
    start: { re: LIMIT_Z0.re + 0.35, im: LIMIT_Z0.im + 0.2 },
    image: conjugateImage,
    claim: limitClaim,
    onClaim: hooks && hooks.onClaim,
    drawZ(svg, view) {
      disk.setAttribute('cx', view.X(LIMIT_Z0.re));
      disk.setAttribute('cy', view.Y(LIMIT_Z0.im));
      disk.setAttribute('r', view.R(LIMIT_EPS));
      z0.setAttribute('cx', view.X(LIMIT_Z0.re));
      z0.setAttribute('cy', view.Y(LIMIT_Z0.im));
      svg.append(disk, z0);
    },
    drawW(svg, view) {
      eps.setAttribute('cx', view.X(LIMIT_Z0.re));
      eps.setAttribute('cy', view.Y(-LIMIT_Z0.im));
      eps.setAttribute('r', view.R(LIMIT_EPS));
      w0.setAttribute('cx', view.X(LIMIT_Z0.re));
      w0.setAttribute('cy', view.Y(-LIMIT_Z0.im));
      svg.append(eps, w0);
    },
  });
}

export function principalSqrt(z) {
  const r = Math.hypot(z.re, z.im);
  if (r < 1e-12) return { re: 0, im: 0 };
  const half = Math.atan2(z.im, z.re) / 2;
  const root = Math.sqrt(r);
  return { re: root * Math.cos(half), im: root * Math.sin(half) };
}

// Example 2.21, pages 68–69: the two limits are the approaches to a negative
// real number, where Arg is near π from above and near −π from below.
// Anywhere in the left half-plane is not “near π”.
export function branchClaim(z) {
  const arg = Math.atan2(z.im, z.re);
  const nearAxis = z.re < -0.05 && Math.hypot(z.re, z.im) > 0.15;
  if (nearAxis && z.im > 0 && Math.PI - arg <= 0.55) {
    return { holds: true, text: 'Above the cut, Arg $z$ is near $\\pi$, and the principal square root is in the upper half-plane.' };
  }
  if (nearAxis && z.im < 0 && arg + Math.PI <= 0.55) {
    return { holds: false, text: 'Below the cut, Arg $z$ is near $-\\pi$, and the principal square root is in the lower half-plane.' };
  }
  if (nearAxis && Math.abs(z.im) <= 0.08) return { holds: false, text: 'On the negative real axis, Arg jumps.' };
  return { holds: false, text: 'Off the cut, Arg does not jump. Cross the blue ray.' };
}

export function mountBranch(parent, hooks) {
  const zView = makeView(-0.6, 0, 1.8);
  const wView = makeView(0, 0, 1.6);
  const cut = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '3', 'stroke-dasharray': '7 5' });
  const imageCut = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '2.5', 'stroke-dasharray': '7 5' });
  return mountPair(parent, {
    id: 'ch2-branch',
    aria: 'Domain plane. The dashed blue ray is the negative real axis. Drag the green point across it.',
    imageAria: 'Image plane of the principal square root. The dashed orange line is the imaginary axis. Purple is the square root.',
    zView, wView,
    start: { re: -1.1, im: 0.45 },
    image: principalSqrt,
    claim: branchClaim,
    onClaim: hooks && hooks.onClaim,
    drawZ(svg, view) {
      putLine(cut, view, view.cx - view.half, 0, 0, 0);
      svg.append(cut);
    },
    drawW(svg, view) {
      putLine(imageCut, view, 0, view.cy - view.half, 0, view.cy + view.half);
      svg.append(imageCut);
    },
  });
}

export function reciprocal(z) {
  const d = z.re * z.re + z.im * z.im;
  if (d < 1e-8) return { re: NaN, im: NaN };
  return { re: z.re / d, im: -z.im / d };
}

export function recipClaim(z) {
  const d = z.re * z.re + z.im * z.im;
  if (d < 1e-6) return { holds: false, text: 'At $0$, $1/z$ is not a point of the plane.' };
  if (Math.abs(z.re - 1) <= 1e-9) return { holds: true, text: 'On the blue line, $1/z$ sits on the orange circle.' };
  return { holds: false, text: 'Off the blue line, $1/z$ has left the orange circle.' };
}

export function mountReciprocal(parent, hooks) {
  const zView = makeView(1, 0, 1.8);
  const wView = makeView(0.5, 0, 1.25);
  const cut = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2.5' });
  const circle = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5' });
  return mountPair(parent, {
    id: 'ch2-recip',
    aria: 'Domain plane. Drag the green point. The blue line is x = 1.',
    imageAria: 'Image plane of 1 over z. The orange circle is the image of that line. Purple is 1 over z.',
    zView, wView,
    snapRe: 1,
    start: { re: 1, im: 0.45 },
    image: reciprocal,
    claim: recipClaim,
    onClaim: hooks && hooks.onClaim,
    drawZ(svg, view) {
      putLine(cut, view, 1, view.cy - view.half, 1, view.cy + view.half);
      svg.append(cut);
    },
    drawW(svg, view) {
      circle.setAttribute('cx', view.X(0.5));
      circle.setAttribute('cy', view.Y(0));
      circle.setAttribute('r', view.R(0.5));
      svg.append(circle);
    },
  });
}
