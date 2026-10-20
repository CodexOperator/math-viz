// One step-size control, and the rule that lets a tiny step still move.
//
// A station that walks a quantity (an orbit, a path, a Newton correction) keeps
// the simulation quantum separate from the picture. The quantum can be 0.00001.
// Each displayed frame advances many quanta, then draws once. The loop stops
// when the frame has spent its time budget, so a fine step cannot freeze the tab.
//
// The control is one group: a log slider and a text box that set the same number.
// Typing commits on Enter or blur. An invalid entry puts the previous number back
// and shows a hint. The number is written in plain notation (0.00001, not 1e-5).

export const STEP_MIN = 1e-5;
export const FRAME_BUDGET_MS = 8;

export function clampStep(step, min = STEP_MIN, max = 1) {
  const s = Number(step);
  if (!Number.isFinite(s) || s <= 0) return null;
  return Math.min(max, Math.max(min, s));
}

// Plain decimal, no exponent. Powers of ten down to 1e-8 stay exact.
export function formatStep(step) {
  const s = Number(step);
  if (!Number.isFinite(s)) return '';
  const sign = s < 0 ? '-' : '';
  const a = Math.abs(s);
  if (a === 0) return '0';
  const exp = Math.round(-Math.log10(a));
  if (exp >= 1 && exp <= 8 && Math.abs(a - 10 ** -exp) <= a * 1e-8) {
    return sign + '0.' + '0'.repeat(exp - 1) + '1';
  }
  const digits = a >= 1 ? 4 : Math.min(8, Math.ceil(-Math.log10(a)) + 2);
  let text = a.toFixed(digits);
  if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
  return sign + text;
}

export function stepToUnit(step, min = STEP_MIN, max = 1) {
  const s = clampStep(step, min, max);
  if (s == null) return 0;
  const lo = Math.log10(min);
  const hi = Math.log10(max);
  if (hi === lo) return 0;
  return (Math.log10(s) - lo) / (hi - lo);
}

export function unitToStep(unit, min = STEP_MIN, max = 1) {
  const lo = Math.log10(min);
  const hi = Math.log10(max);
  const u = Math.min(1, Math.max(0, Number(unit) || 0));
  return 10 ** (lo + u * (hi - lo));
}

// How many quanta fit in this frame if the quantity should move `ratePerSec`
// units per second. The count is a wish; runSubsteps may stop earlier.
export function substepsForFrame({
  dtMs = 16.7,
  step = 0.08,
  ratePerSec = 0.5,
  maxCount = 20000,
} = {}) {
  const quantum = Math.max(STEP_MIN, Number(step) || STEP_MIN);
  const dt = Math.max(0, Math.min(Number(dtMs) || 0, 50));
  const want = (ratePerSec * dt) / 1000;
  let count = Math.floor(want / quantum + 1e-9);
  if (count < 1) count = want > 0 ? 1 : 0;
  count = Math.min(count, maxCount);
  return { count, quantum, advanced: count * quantum };
}

// Run `body` up to `count` times. Every 32nd call, stop if `budgetMs` is spent.
// `body` returns false to finish early. Returns how many calls ran.
export function runSubsteps(count, body, budgetMs = FRAME_BUDGET_MS, now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
  const cap = Math.max(0, count | 0);
  const start = now();
  const budget = Math.max(0, Number(budgetMs) || 0);
  let n = 0;
  for (; n < cap; n++) {
    if (n > 0 && (n & 31) === 0 && now() - start >= budget) break;
    if (typeof body === 'function' && body(n) === false) {
      n += 1;
      break;
    }
  }
  return n;
}

// Closed form of adding `step` until `target`. Use this when the step is a pure
// increment, so a frame does not walk a hundred thousand additions to draw one mark.
export function quantize(target, step, min = STEP_MIN) {
  const q = Math.max(min, Number(step) || min);
  const t = Number(target) || 0;
  if (t <= 0) return 0;
  const n = Math.floor(t / q + 1e-9);
  return n * q;
}

export function traceOf(points) {
  const pts = [];
  for (const p of points || []) {
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
    const prev = pts[pts.length - 1];
    if (prev && Math.hypot(p.re - prev.re, p.im - prev.im) < 1e-9) continue;
    pts.push({ re: p.re, im: p.im });
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].re - pts[i - 1].re, pts[i].im - pts[i - 1].im));
  return { pts, cum, total: cum.length ? cum[cum.length - 1] : 0 };
}

export function pointOnTrace(trace, dist) {
  const pts = trace && trace.pts;
  if (!pts || !pts.length) return { re: 0, im: 0 };
  const cum = trace.cum;
  const total = trace.total;
  const d = Math.max(0, Math.min(total, Number(dist) || 0));
  if (d <= 0) return { re: pts[0].re, im: pts[0].im };
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i += 1;
  const span = cum[i] - cum[i - 1];
  const t = span > 1e-12 ? (d - cum[i - 1]) / span : 0;
  return {
    re: pts[i - 1].re + (pts[i].re - pts[i - 1].re) * t,
    im: pts[i - 1].im + (pts[i].im - pts[i - 1].im) * t,
  };
}

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) n.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
}

// Mount the one step group. `onChange(step)` fires when the number commits.
// The text box and the slider always show the same committed number.
export function mountStepControl(host, opts = {}) {
  const min = opts.min > 0 ? opts.min : STEP_MIN;
  const max = opts.max > min ? opts.max : 1;
  const id = opts.id || 'step';
  let step = clampStep(opts.value == null ? Math.min(max, 0.08) : opts.value, min, max);
  const range = el('input', {
    type: 'range', id: `${id}-slider`, min: '0', max: '1000', step: '1',
    value: String(Math.round(stepToUnit(step, min, max) * 1000)),
    'aria-label': opts.label || 'Step size',
    'aria-valuemin': String(min), 'aria-valuemax': String(max), 'aria-valuenow': String(step),
  });
  const text = el('input', {
    type: 'text', id: `${id}-text`, inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false',
    value: formatStep(step), 'aria-label': `${opts.label || 'Step size'} as a number`,
  });
  const hint = el('p', { class: 'step-hint', id: `${id}-hint`, hidden: true });
  const readout = el('span', { class: 'step-readout', id: `${id}-readout` }, `step ${formatStep(step)}`);
  const root = el('fieldset', { class: 'step-control', id, 'data-step': formatStep(step) },
    el('legend', { class: 'step-label' }, opts.legend || 'Step'),
    range, text, readout, hint);
  if (host) host.append(root);

  function paint() {
    range.value = String(Math.round(stepToUnit(step, min, max) * 1000));
    range.setAttribute('aria-valuenow', String(step));
    text.value = formatStep(step);
    readout.textContent = `step ${formatStep(step)}`;
    root.dataset.step = formatStep(step);
  }
  function emit() {
    if (typeof opts.onChange === 'function') opts.onChange(step);
  }
  function setStep(next, notify = true) {
    const s = clampStep(next, min, max);
    if (s == null) return false;
    step = s;
    hint.hidden = true;
    paint();
    if (notify) emit();
    return true;
  }
  range.addEventListener('input', () => {
    step = unitToStep(Number(range.value) / 1000, min, max);
    hint.hidden = true;
    text.value = formatStep(step);
    readout.textContent = `step ${formatStep(step)}`;
    root.dataset.step = formatStep(step);
    range.setAttribute('aria-valuenow', String(step));
    emit();
  });
  function commit() {
    const raw = String(text.value).trim().replace(/\u2212/g, '-').replace(/^\+/, '');
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0) {
      hint.hidden = false;
      hint.textContent = `Use a number from ${formatStep(min)} to ${formatStep(max)}.`;
      paint();
      return;
    }
    const next = clampStep(n, min, max);
    const clamped = Math.abs(next - n) > n * 1e-6 && Math.abs(next - n) > 1e-12;
    step = next;
    hint.hidden = !clamped;
    if (clamped) hint.textContent = `Kept inside ${formatStep(min)} to ${formatStep(max)}.`;
    paint();
    emit();
  }
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  });
  text.addEventListener('blur', commit);

  return {
    root, range, text, hint, readout,
    get() { return step; },
    set: setStep,
    destroy() { root.remove(); },
  };
}
