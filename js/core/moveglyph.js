// js/core/moveglyph.js: the move glyph, a 1.1em inline SVG that sits beside a complex number.
// A number is a move (turn, then stretch); the glyph draws that move: a faint unit circle, the arc of Arg z (the turn),
// and a ray whose length is the stretch. Colours are tokens only (the host gives it color: var(--polar), and the style
// below does the same by default). Imports nothing; no DOM access at import time (glyphGeometry and glyphText are pure).
//
// Design: docs/designs/iter-2/i2-decisions-kit.md sections 4.2 and 5.2.

const SVG_NS = 'http://www.w3.org/2000/svg';
const BOX = 24;
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

// ---------------------------------------------------------------- pure helpers

function asComplex(z) {
  if (typeof z === 'number') return { re: z, im: 0 };
  if (z && typeof z === 'object') return { re: Number(z.re), im: Number(z.im) };
  return { re: NaN, im: NaN };
}

function strip(s) {
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

// fmtNum(x, 3, { tiny: true }) of complex.js, kept here because this module imports nothing.
function fmt3(x) {
  if (x !== x) return 'undefined';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  const a = Math.abs(x);
  if (a >= 1e15 || (a > 1e-9 && a < 1e-3)) {
    const [m, e] = x.toExponential(3).split('e');
    return strip(m) + '×10' + [...String(Number(e))].map((ch) => SUP[ch]).join('');
  }
  return strip(x.toFixed(3));
}

const n3 = (v) => String(Math.round(v * 1000) / 1000 + 0);

export function glyphGeometry(z, { scale = 2, box = 24 } = {}) {
  const { re, im } = asComplex(z);
  const sc = Number.isFinite(scale) && scale > 0 ? scale : 2;      // a bad option falls back to the default
  const bx = Number.isFinite(box) && box > 0 ? box : 24;
  const half = bx / 2;
  const unitR = half / sc;
  const centre = { x: half, y: half };
  if (!Number.isFinite(re) || !Number.isFinite(im)) return { r: NaN, theta: 0, unitR, rayEnd: centre, arc: null, clipped: false };
  const r = Math.hypot(re, im);
  if (r === 0) return { r: 0, theta: 0, unitR, rayEnd: centre, arc: null, clipped: false };
  let theta = Math.atan2(im, re);
  if ((im === 0 && re < 0) || theta <= -Math.PI) theta = Math.PI;
  theta += 0;
  const ux = re / r;
  const uy = im / r;
  const len = unitR * Math.min(r, sc);
  const rayEnd = { x: half + len * ux, y: half - len * uy };
  const arc = Math.abs(theta) < 1e-9 ? null : {
    start: { x: half + unitR, y: half },
    end: { x: half + unitR * ux, y: half - unitR * uy },
    large: false,
    sweep: theta > 0 ? 0 : 1,
  };
  return { r, theta, unitR, rayEnd, arc, clipped: r > sc * (1 + 1e-9) };   // a length of 2 that arrives as 2.0000000000000004 is not clipped
}

export function glyphText(z) {
  const g = glyphGeometry(z);
  if (g.r !== g.r) return 'no move: undefined';
  if (g.r === 0) return 'no move: 0';
  const d = Math.round((g.theta * 180 / Math.PI) * 10) / 10;
  const deg = d === 0 ? '0' : Number.isInteger(d) ? String(d) : d.toFixed(1);
  return `move: turn ${deg}°, stretch ${fmt3(g.r)}`;
}

// ---------------------------------------------------------------- DOM (browser only)

const STYLE = `
.move-glyph { display: inline-block; flex: none; vertical-align: -0.2em; overflow: visible; color: var(--polar); }
.move-glyph .glyph-unit { fill: none; stroke: currentColor; stroke-width: 1; opacity: 0.3; }
.move-glyph .glyph-arc { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.move-glyph .glyph-ray { stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.move-glyph[data-clipped="true"] .glyph-ray { stroke-dasharray: 3 1.6; }
`;

function needDocument(who) {
  if (typeof document === 'undefined') throw new TypeError(`${who} needs a document`);
}

function ensureStyle() {
  const head = document.head;
  if (!head || head.querySelector('style[data-for="moveglyph"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'moveglyph');
  s.textContent = STYLE;
  head.appendChild(s);
}

const svgEl = (tag) => document.createElementNS(SVG_NS, tag);
const last = new WeakMap(); // svg -> the key of what it shows now, so a repeated update costs nothing

function put(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function draw(svg, z, scale) {
  const c = asComplex(z);
  const key = `${c.re}|${c.im}|${scale}`;
  if (last.get(svg) === key) return svg;
  last.set(svg, key);
  const g = glyphGeometry(z, { scale });
  const text = glyphText(z);
  put(svg, 'aria-label', text);
  put(svg, 'data-r', fmt3(g.r));
  put(svg, 'data-theta', fmt3(g.theta));
  put(svg, 'data-scale', String(scale));
  put(svg, 'data-clipped', String(g.clipped));
  const title = svg.querySelector('title');
  if (title && title.textContent !== text) title.textContent = text;
  put(svg.querySelector('.glyph-unit'), 'r', n3(g.unitR));
  const ray = svg.querySelector('.glyph-ray');
  put(ray, 'x2', n3(g.rayEnd.x));
  put(ray, 'y2', n3(g.rayEnd.y));
  let arc = svg.querySelector('.glyph-arc');
  if (g.arc) {
    if (!arc) {
      arc = svgEl('path');
      arc.setAttribute('class', 'glyph-arc');
      svg.insertBefore(arc, ray);
    }
    const a = g.arc;
    put(arc, 'd', `M ${n3(a.start.x)} ${n3(a.start.y)} A ${n3(g.unitR)} ${n3(g.unitR)} 0 ${a.large ? 1 : 0} ${a.sweep} ${n3(a.end.x)} ${n3(a.end.y)}`);
  } else if (arc) {
    arc.remove();
  }
  return svg;
}

export function moveGlyph(z, { scale = 2, size = '1.1em', id = null } = {}) {
  needDocument('moveGlyph');
  ensureStyle();
  const svg = svgEl('svg');
  svg.setAttribute('class', 'move-glyph');
  svg.setAttribute('role', 'img');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${BOX} ${BOX}`);
  svg.setAttribute('focusable', 'false');
  if (id) svg.setAttribute('id', id);
  const unit = svgEl('circle');
  unit.setAttribute('class', 'glyph-unit');
  unit.setAttribute('cx', String(BOX / 2));
  unit.setAttribute('cy', String(BOX / 2));
  const ray = svgEl('line');
  ray.setAttribute('class', 'glyph-ray');
  ray.setAttribute('x1', String(BOX / 2));
  ray.setAttribute('y1', String(BOX / 2));
  svg.append(svgEl('title'), unit, ray);
  return draw(svg, z, scale);
}

export function updateGlyph(svg, z, { scale } = {}) {
  if (!svg || !svg.classList || !svg.classList.contains('move-glyph')) throw new TypeError('updateGlyph needs the element moveGlyph returned');
  const s = scale === undefined ? Number(svg.getAttribute('data-scale')) || 2 : scale;
  return draw(svg, z, s);
}
