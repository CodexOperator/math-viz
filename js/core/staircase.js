// js/core/staircase.js
// The arg / Arg staircase as a list.
//
//   arg z  = the whole set of names of the angle: { Arg z + 2*pi*k : k is any integer }  (ghost steps)
//   Arg z  = the one step that falls inside the home window (seam, seam + 2*pi]            (highlighted)
//
// The point z itself is not in this widget (it lives on the plane). Rows are anchored to the home
// step: row k shows Arg + 2*pi*k, k = 0 is always the home step, and update(theta) accepts any
// representative of the angle, so onPick(k) always means "k steps above Arg".
//
// Options of createStaircase beyond id/kMin/kMax/seam/label/onPick:
//   homeLabel  the name the home row, the readout and the notes use for the home step. Default: label with a
//              leading "arg" turned into "Arg" ("arg z" -> "Arg z"). A station whose window is not the principal
//              one passes "chosen θ" so the set line can keep saying "arg z = { ... }".
//   showK      true prints "k = n" at the start of every row.
//   compact    true for a narrow host: smaller type, tighter rows, no decimal column.
//
// Imports nothing (it carries its own tiny exact-pi formatter). No top-level DOM access, so the pure
// helpers import cleanly in Node. Design: docs/designs/iter-1/i1-core-widgets.md, sections 2.2, 3, 4.3, 5.3.

const TWO_PI = 2 * Math.PI;
const PI_CH = 'π'; // the character pi
const MAX_ROWS = 25;
const SEAM_SNAP = 1e-9; // the tolerance exactPi uses to print a multiple of pi, so homeStep and the text agree

// ---------------------------------------------------------------- pure helpers

export function argSteps(theta, kMin = -2, kMax = 2) {
  if (!Number.isFinite(theta)) return [];
  const out = [];
  for (let k = Math.ceil(kMin); k <= Math.floor(kMax); k++) out.push({ k, theta: theta + TWO_PI * k });
  return out;
}

// The representative of theta in (seam, seam + 2pi]; k is the number of turns added to theta to reach it.
// A representative within 1e-9 of the seam is on the seam (float noise: 13 * Math.PI lands a hair above -pi), so
// it is the top step, exactly seam + 2pi; one within 1e-9 below the top is the top step too. That is the tolerance
// exactPi prints with, so the window (seam, seam + 2pi] and the text never disagree.
export function homeStep(theta, seam = -Math.PI) {
  let k = Math.floor((seam + TWO_PI - theta) / TWO_PI);
  let t = theta + TWO_PI * k;
  if (t <= seam) {
    // rounding guard: enforce the half-open window exactly
    k += 1;
    t += TWO_PI;
  } else if (t > seam + TWO_PI) {
    k -= 1;
    t -= TWO_PI;
  }
  if (t - seam < SEAM_SNAP) {
    k += 1;
    t = seam + TWO_PI;
  } else if (seam + TWO_PI - t < SEAM_SNAP) {
    t = seam + TWO_PI;
  }
  return { k, theta: t };
}

// "2π/3", "-π/3", "π", "0", "14π/3" when x is p·π/q (q <= 12, |p| <= 240) within 1e-9; otherwise null.
export function exactPi(x, { maxQ = 12, maxP = 240, tol = 1e-9 } = {}) {
  if (!Number.isFinite(x)) return null;
  if (Math.abs(x) < tol) return '0';
  const r = x / Math.PI;
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(r * q);
    if (p === 0 || Math.abs(p) > maxP) continue;
    if (Math.abs(r * q - p) < tol) {
      const a = Math.abs(p);
      const num = a === 1 ? PI_CH : `${a}${PI_CH}`;
      return `${p < 0 ? '-' : ''}${num}${q === 1 ? '' : '/' + q}`;
    }
  }
  return null;
}

// Three decimals, trailing zeros trimmed, ASCII minus, "-0" -> "0" (same style as the station readouts).
export function fmtDec(x, digits = 3) {
  if (!Number.isFinite(x)) return 'NaN';
  let s = x.toFixed(digits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

const angle = (x) => exactPi(x) || fmtDec(x);

export function homeLabelFor(label) {
  return String(label).replace(/^arg/, 'Arg');
}

export function windowText(seam) {
  return `(${angle(seam)}, ${angle(seam + TWO_PI)}]`;
}

// One list row: home = home representative, k = steps above it.
//   text: "2π/3 + 2π = 8π/3" when the total has an exact form, else just "0.7 + 2π" (the decimal column beside
//         the row already shows 6.983, so the row never repeats it);
//   dec:  the decimal of the total; full: text plus "= decimal" when text leaves it out (for the accessible name).
export function stepText(home, k) {
  const total = home + TWO_PI * k;
  const dec = fmtDec(total);
  if (k === 0) return { text: angle(home), dec, total, full: angle(home) };
  const base = `${angle(home)} ${k > 0 ? '+' : '-'} ${2 * Math.abs(k)}${PI_CH}`;
  const exact = exactPi(total);
  return exact ? { text: `${base} = ${exact}`, dec, total, full: `${base} = ${exact}` } : { text: base, dec, total, full: `${base} = ${dec}` };
}

function readoutFor(homeName, home) {
  const e = exactPi(home);
  const d = fmtDec(home);
  return `${homeName} = ${d}${e && e !== d ? ` (${e})` : ''}`; // "Arg z = 2.094 (2π/3)"; "Arg z = 0"
}

export function argReadout(label, home) {
  return readoutFor(homeLabelFor(label), home);
}

const wrapPi = (d) => {
  const w = d - TWO_PI * Math.floor((d + Math.PI) / TWO_PI);
  return w === -Math.PI ? Math.PI : w;
};

// +1: crossed the seam counterclockwise (Arg dropped by about 2π); -1: clockwise; 0: no crossing.
export function seamJump(prevHome, nextHome) {
  const d = nextHome - prevHome;
  if (Math.abs(d) > Math.PI) {
    const w = wrapPi(d);
    if (Math.abs(w) < 1.0) return w > 0 ? 1 : -1;
  }
  return 0;
}

// ---------------------------------------------------------------- styles

const CSS = `
.staircase-wrap { --row-h: 2.5rem; font-family: var(--font, inherit); color: var(--text, CanvasText); }
.staircase-wrap[data-dense="true"] { --row-h: 2rem; }
.staircase-wrap .stair-set { margin: 0 0 var(--space-1, .25rem); font-size: .9rem; color: var(--text-muted, GrayText); overflow-wrap: anywhere; }
.staircase-wrap .stair-arg { margin: 0 0 var(--space-2, .5rem); font-weight: 700; border-radius: 4px; }
.staircase-wrap .stair-window { margin: 0 0 var(--space-2, .5rem); font-size: .85rem; color: var(--text-muted, GrayText); }
.staircase-wrap .stair-body { background: var(--surface, Canvas); border: 1px solid var(--border, GrayText); border-radius: var(--radius, 8px); padding: var(--space-1, .25rem) 0; overflow: hidden; }
.staircase-wrap .stair-more { height: 1rem; line-height: 1; text-align: center; font-size: .9rem; color: var(--text-muted, GrayText); }
.staircase-wrap .stair-list { position: relative; }
.staircase-wrap .staircase-home { position: absolute; left: 0; right: 0; top: calc(var(--home-index, 0) * var(--row-h)); height: var(--row-h); pointer-events: none; z-index: 0; }
.staircase-wrap .staircase-home::before { content: ''; position: absolute; inset: 0; background: var(--polar, currentColor); opacity: .12; }
.staircase-wrap .staircase-home::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--polar, currentColor); }
.staircase-wrap[data-home-visible="false"] .staircase-home { display: none; }
.staircase-wrap[data-compact="true"] { --row-h: 2rem; }
.staircase-wrap[data-compact="true"] .stair-set, .staircase-wrap[data-compact="true"] .stair-window, .staircase-wrap[data-compact="true"] .stair-note { font-size: .8rem; }
.staircase-wrap[data-compact="true"] .staircase .stair-row { gap: .35rem; padding: 0 .5rem; font-size: .85rem; }
.staircase-wrap[data-compact="true"] .staircase .stair-dec { display: none; }
.staircase { list-style: none; margin: 0; padding: 0; position: relative; z-index: 1; }
.staircase li { height: var(--row-h); margin: 0; padding: 0; }
.staircase .stair-row { box-sizing: border-box; display: flex; align-items: center; gap: .6rem; width: 100%; height: 100%; margin: 0; padding: 0 .9rem; border: 0; background: none;
  font: inherit; color: var(--text-muted, GrayText); text-align: left; white-space: nowrap; overflow: hidden; }
.staircase button.stair-row { cursor: pointer; }
.staircase button.stair-row:hover { background: var(--surface-2, transparent); }
.staircase button.stair-row:focus-visible { outline: 3px solid var(--focus, Highlight); outline-offset: -3px; border-radius: 4px; }
.staircase li.is-picked button.stair-row:focus-visible { outline-offset: -5px; }
.staircase .stair-mark { flex: none; width: .7rem; height: .7rem; border-radius: 50%; background: var(--polar, currentColor); opacity: var(--ghost-alpha, .45); }
.staircase .stair-k { flex: none; min-width: 3.4ch; font-family: var(--font-mono, monospace); font-size: .8rem; color: var(--text-muted, GrayText); }
.staircase li.is-home .stair-k { color: var(--text, CanvasText); }
.staircase li.is-empty .stair-k { display: none; }
.staircase .stair-text { overflow: hidden; text-overflow: ellipsis; }
.staircase .stair-dec { margin-left: auto; flex: none; font-family: var(--font-mono, monospace); font-size: .8rem; color: var(--text-muted, GrayText); }
.staircase .stair-dec::before { content: '\\2248 '; }
.staircase li.is-home .stair-row { color: var(--text, CanvasText); font-weight: 700; }
.staircase li.is-home .stair-mark { opacity: 1; width: .9rem; height: .9rem; }
.staircase li.is-home .stair-prefix { color: var(--polar, inherit); }
.staircase li.is-picked .stair-row { box-shadow: inset 0 0 0 2px var(--polar, currentColor); border-radius: 4px; }
.staircase li.is-empty .stair-row { justify-content: center; }
.staircase li.is-empty .stair-mark, .staircase li.is-empty .stair-dec { display: none; }
.staircase-wrap .stair-note { margin: var(--space-2, .5rem) 0 0; min-height: 1.4em; font-size: .9rem; color: var(--text, CanvasText); }
.staircase-wrap.is-jump .stair-arg { animation: stair-pulse .9s ease-out 1; }
@keyframes stair-pulse { from { box-shadow: 0 0 0 4px var(--polar, currentColor); } to { box-shadow: 0 0 0 4px transparent; } }
@media (prefers-reduced-motion: reduce) {
  .staircase-wrap.is-jump .stair-arg { animation: none; }
}
`;

function ensureStyle() {
  const doc = globalThis.document;
  if (!doc || !doc.head || typeof doc.createElement !== 'function') return;
  if (doc.head.querySelector('style[data-for="staircase"]')) return;
  const s = doc.createElement('style');
  s.setAttribute('data-for', 'staircase');
  s.textContent = CSS;
  doc.head.appendChild(s);
}

// ---------------------------------------------------------------- the widget

function sanitizeId(s) {
  return String(s).replace(/[^A-Za-z0-9_-]/g, '-');
}

// A home-step name from the caller: a non-empty string, else null (use the name derived from the label).
function cleanName(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function createStaircase(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') throw new TypeError('createStaircase: a container element is required');
  const opts = options || {};
  if (typeof opts.id !== 'string' || opts.id.trim() === '') throw new TypeError('createStaircase: options.id is required');
  ensureStyle();
  const doc = container.ownerDocument || globalThis.document;
  const id = sanitizeId(opts.id);

  let kMin = Math.ceil(Number.isFinite(opts.kMin) ? opts.kMin : -2);
  let kMax = Math.floor(Number.isFinite(opts.kMax) ? opts.kMax : 2);
  if (kMin > kMax) [kMin, kMax] = [kMax, kMin];
  if (kMax - kMin + 1 > MAX_ROWS) {
    console.warn(`[staircase ${id}] ${kMax - kMin + 1} rows requested; showing ${MAX_ROWS}`);
    const lo = Math.max(kMin, Math.min(-12, kMax - (MAX_ROWS - 1)));
    kMin = lo;
    kMax = lo + MAX_ROWS - 1;
  }
  let seam = Number.isFinite(opts.seam) ? opts.seam : -Math.PI;
  let label = opts.label == null ? 'arg z' : String(opts.label);
  let homeOverride = cleanName(opts.homeLabel);
  const showK = opts.showK === true;
  const compact = opts.compact === true;
  const homeName = () => (homeOverride !== null ? homeOverride : homeLabelFor(label));
  const onPick = typeof opts.onPick === 'function' ? opts.onPick : null;
  const homeVisible = kMin <= 0 && kMax >= 0;

  // state
  let theta = null;
  let prevHome = null;
  let jumps = 0;
  let picked = null;
  let tabK = homeVisible ? 0 : kMax;
  let destroyed = false;
  let noteTimer = 0;
  let jumpTimer = 0;

  // ---- static DOM
  const mk = (tag, cls, attrs) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    return n;
  };

  const wrap = mk('div', 'staircase-wrap', {
    'data-stairs': id,
    'data-jumps': '0',
    'data-dense': String(kMax - kMin + 1 > 8),
    'data-home-visible': String(homeVisible),
  });
  if (showK) wrap.setAttribute('data-show-k', 'true');
  if (compact) wrap.setAttribute('data-compact', 'true');
  wrap.style.setProperty('--home-index', String(kMax));
  const setLine = mk('p', 'stair-set', { id: `${id}-set` });
  const argLine = mk('p', 'stair-arg', { id: `${id}-arg` });
  const winLine = mk('p', 'stair-window', { id: `${id}-window` });
  const body = mk('div', 'stair-body');
  const moreTop = mk('div', 'stair-more', { 'aria-hidden': 'true' });
  moreTop.textContent = '⋮';
  const moreBottom = mk('div', 'stair-more', { 'aria-hidden': 'true' });
  moreBottom.textContent = '⋮';
  const listBox = mk('div', 'stair-list');
  const band = mk('div', 'staircase-home', { 'aria-hidden': 'true' });
  const ol = mk('ol', 'staircase', { id: `${id}-list` });
  const note = mk('p', 'stair-note', { id: `${id}-note`, 'aria-live': 'polite' });

  const rows = new Map(); // k -> { li, row, prefix, text, dec }
  for (let k = kMax; k >= kMin; k--) {
    const li = mk('li', '', { id: `${id}-k${k}`, 'data-k': String(k) });
    const row = onPick ? mk('button', 'stair-row', { id: `${id}-k${k}-row`, type: 'button', 'aria-pressed': 'false', tabindex: k === tabK ? '0' : '-1' }) : mk('div', 'stair-row');
    const mark = mk('span', 'stair-mark', { 'aria-hidden': 'true' });
    const prefix = mk('span', 'stair-prefix');
    const text = mk('span', 'stair-text');
    const dec = mk('span', 'stair-dec');
    if (showK) {
      const kTag = mk('span', 'stair-k', { 'data-k-tag': String(k) });
      kTag.textContent = `k = ${k}`;
      row.append(mark, kTag, prefix, text, doc.createTextNode(' '), dec);
    } else {
      row.append(mark, prefix, text, doc.createTextNode(' '), dec);
    }
    li.appendChild(row);
    ol.appendChild(li);
    rows.set(k, { li, row, prefix, text, dec });
  }
  listBox.append(band, ol);
  body.append(moreTop, listBox, moreBottom);
  wrap.append(setLine, argLine, winLine, body, note);
  container.appendChild(wrap);

  // ---- picking and roving focus (only with onPick)
  function setTab(k) {
    tabK = k;
    for (const [rk, r] of rows) r.row.setAttribute('tabindex', rk === k ? '0' : '-1');
  }
  function setPicked(k) {
    if (destroyed) return;
    picked = typeof k === 'number' && rows.has(k) ? k : null;
    for (const [rk, r] of rows) {
      const on = rk === picked;
      r.li.classList.toggle('is-picked', on);
      if (onPick) r.row.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  if (onPick) {
    for (const [k, r] of rows) {
      r.row.addEventListener('click', () => {
        if (destroyed) return;
        setPicked(k);
        setTab(k);
        try {
          onPick(k);
        } catch (e) {
          console.error(`[staircase ${id}] onPick threw`, e);
        }
      });
      r.row.addEventListener('focus', () => {
        if (!destroyed) setTab(k);
      });
      r.row.addEventListener('keydown', (ev) => {
        let to = null;
        if (ev.key === 'ArrowUp') to = k + 1;
        else if (ev.key === 'ArrowDown') to = k - 1;
        else if (ev.key === 'Home') to = kMax;
        else if (ev.key === 'End') to = kMin;
        if (to === null || !rows.has(to)) return;
        ev.preventDefault();
        setTab(to);
        rows.get(to).row.focus();
      });
    }
  }

  // ---- rendering
  function render() {
    const L = homeName();
    const win = windowText(seam);
    ol.setAttribute('aria-label', `Names of the angle ${label}`);
    band.setAttribute('data-window', win);
    wrap.setAttribute('data-window', win);
    wrap.setAttribute('data-seam', String(seam));
    // The shaded band belongs to the home step; with no angle (z = 0) there is no home step, so it is hidden too.
    wrap.setAttribute('data-home-visible', String(homeVisible && theta !== null));
    wrap.style.setProperty('--home-index', String(kMax));

    if (theta === null) {
      setLine.textContent = `${label} is not defined here`;
      argLine.textContent = `${L}: no angle at 0`;
      winLine.textContent = `The point 0 has no angle. Every direction reaches it, so ${label} is not defined.`;
      wrap.setAttribute('data-home-k', '');
      wrap.setAttribute('data-arg', '');
      for (const [k, r] of rows) {
        r.li.classList.remove('is-home');
        r.li.classList.add('is-empty');
        r.li.removeAttribute('aria-current');
        r.prefix.textContent = '';
        r.text.textContent = '—';
        r.dec.textContent = '';
        if (onPick) r.row.setAttribute('aria-label', `step k = ${k}: no angle at 0`);
      }
      return;
    }

    const hs = homeStep(theta, seam);
    const home = hs.theta;
    wrap.setAttribute('data-home-k', String(hs.k));
    wrap.setAttribute('data-arg', String(home));
    setLine.textContent = `${label} = { ${angle(home)} + 2${PI_CH}k : k is any integer }`;
    argLine.textContent = readoutFor(L, home);
    winLine.textContent = `Shaded step: the home window ${win}. ${L} is the step inside it.`;
    for (const [k, r] of rows) {
      const st = stepText(home, k);
      r.li.classList.remove('is-empty');
      r.li.classList.toggle('is-home', k === 0);
      if (k === 0) r.li.setAttribute('aria-current', 'step');
      else r.li.removeAttribute('aria-current');
      r.prefix.textContent = k === 0 ? `${L} = ` : '';
      r.text.textContent = st.text;
      r.dec.textContent = st.dec;
      if (onPick) r.row.setAttribute('aria-label', `step k = ${k}: ${k === 0 ? L + ' = ' : ''}${st.full}`);
    }
  }

  function clearTimers() {
    clearTimeout(noteTimer);
    clearTimeout(jumpTimer);
    noteTimer = 0;
    jumpTimer = 0;
  }

  function update(t) {
    if (destroyed) return;
    theta = typeof t === 'number' && Number.isFinite(t) ? t : null;
    if (theta === null) {
      prevHome = null;
    } else {
      const home = homeStep(theta, seam).theta;
      const dir = prevHome === null ? 0 : seamJump(prevHome, home);
      prevHome = home;
      if (dir !== 0) {
        jumps += 1;
        wrap.setAttribute('data-jumps', String(jumps));
        wrap.setAttribute('data-last-jump', String(dir));
        const L = homeName();
        note.textContent = `Seam crossed: ${L} ${dir > 0 ? 'dropped' : 'rose'} by 2${PI_CH}. The set ${label} did not move.`;
        wrap.classList.remove('is-jump');
        void wrap.offsetWidth; // a second crossing inside 0.9 s restarts the pulse
        wrap.classList.add('is-jump');
        clearTimeout(jumpTimer);
        clearTimeout(noteTimer);
        jumpTimer = setTimeout(() => wrap.classList.remove('is-jump'), 900);
        noteTimer = setTimeout(() => {
          note.textContent = '';
        }, 3500);
      }
    }
    render();
  }

  function setSeam(s) {
    if (destroyed || typeof s !== 'number' || !Number.isFinite(s)) return;
    seam = s;
    prevHome = null; // a window change is not a crossing
    render();
  }

  function setLabel(l) {
    if (destroyed) return;
    label = String(l);
    render();
  }

  function setHomeLabel(l) {
    if (destroyed) return;
    homeOverride = cleanName(l);
    render();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearTimers();
    wrap.remove();
    rows.clear();
  }

  render();
  return { el: container, update, setSeam, setLabel, setHomeLabel, setPicked, destroy };
}
