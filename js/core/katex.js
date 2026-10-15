// js/core/katex.js
// Safe KaTeX rendering plus theme-token tinting, so a formula can carry the two-address colour
// code (Cartesian pieces in --cart, polar pieces in --polar).
//
//   tex(el, src, { display, mathml })   render into an element; never throws
//   texToHtml(src, { display, mathml }) the same, as a string
//   tint(src, token)                    `\textcolor{<hex>}{src}` with the token's computed colour
//   cart / polar / input / output       tint shortcuts
//   proseParts / proseToHtml / prose    plain prose with exponent notation (e^{i theta}, r^(1/3)) as text and <sup>
//
// KaTeX is read lazily from globalThis.katex (the classic <script> in index.html), so this module
// imports cleanly in Node and degrades to plain text when KaTeX is missing.
// Imports nothing. No network, no storage, no top-level DOM access.
//
// Design: docs/designs/iter-1/i1-core-widgets.md, sections 4.1 and 5.1.

// Shared macros. KaTeX's built-in \Re and \Im draw fraktur capitals, which is wrong for this course;
// \Arg does not exist; \cj{z} is the conjugate bar.
const MACROS = {
  '\\Re': '\\operatorname{Re}',
  '\\Im': '\\operatorname{Im}',
  '\\Arg': '\\operatorname{Arg}',
  '\\cj': '\\overline{#1}',
};
const CACHE_MAX = 300;
const htmlCache = new Map(); // key: D|I + M|H + src -> html string (LRU by re-insertion)
const colorCache = new Map(); // raw css colour -> '#rrggbb' | 'currentColor'
let probeCtx = null;

// ---------------------------------------------------------------- small helpers

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function clearTexCache() {
  htmlCache.clear();
  colorCache.clear();
}

function getKatex() {
  const k = globalThis.katex;
  return k && typeof k.renderToString === 'function' ? k : null;
}

function normalise(src) {
  return src == null ? '' : String(src);
}

// Precondition: KaTeX is present and src is non-empty. A KaTeX parse error propagates (not cached).
function renderOrThrow(katex, src, display, mathml) {
  const key = (display ? 'D' : 'I') + (mathml ? 'M' : 'H') + src;
  if (htmlCache.has(key)) {
    const hit = htmlCache.get(key);
    htmlCache.delete(key);
    htmlCache.set(key, hit);
    return hit;
  }
  const html = katex.renderToString(src, {
    displayMode: !!display,
    throwOnError: true,
    strict: 'ignore',
    trust: false,
    output: mathml ? 'htmlAndMathml' : 'html',
    macros: { ...MACROS },
    maxExpand: 1000,
  });
  htmlCache.set(key, html);
  if (htmlCache.size > CACHE_MAX) htmlCache.delete(htmlCache.keys().next().value);
  return html;
}

// ---------------------------------------------------------------- rendering

export function texToHtml(src, { display = false, mathml = true } = {}) {
  const s = normalise(src);
  if (s === '') return '';
  const katex = getKatex();
  if (!katex) return escapeHtml(s);
  try {
    return renderOrThrow(katex, s, display, mathml);
  } catch (e) {
    const msg = e && e.message ? e.message : 'TeX error';
    return `<span class="tex-error" title="${escapeHtml(msg)}">${escapeHtml(s)}</span>`;
  }
}

function addClass(el, c) {
  if (el.classList && typeof el.classList.add === 'function') el.classList.add(c);
  else if (typeof el.className === 'string' && !(' ' + el.className + ' ').includes(' ' + c + ' ')) el.className = (el.className ? el.className + ' ' : '') + c;
}
function removeClass(el, c) {
  if (el.classList && typeof el.classList.remove === 'function') el.classList.remove(c);
  else if (typeof el.className === 'string') el.className = el.className.split(/\s+/).filter((x) => x && x !== c).join(' ');
}

export function tex(el, src, { display = false, mathml = true } = {}) {
  if (el == null) return;
  const s = normalise(src);
  try {
    removeClass(el, 'tex-error');
    if (typeof el.removeAttribute === 'function') el.removeAttribute('title');
    if (s === '') {
      el.textContent = '';
      return;
    }
    const katex = getKatex();
    if (!katex) {
      el.textContent = s;
      addClass(el, 'tex-error');
      return;
    }
    try {
      el.innerHTML = renderOrThrow(katex, s, display, mathml);
    } catch (e) {
      el.textContent = s;
      addClass(el, 'tex-error');
      if (typeof el.setAttribute === 'function' && e && e.message) el.setAttribute('title', String(e.message));
    }
  } catch (e) {
    /* a detached or exotic element must not break the caller */
  }
}

// ---------------------------------------------------------------- colour tokens -> something KaTeX accepts
// KaTeX 0.16.11 accepts only #rgb, #rrggbb, six bare hex digits and bare letter names in \textcolor.
// It rejects --token names, the rgb, hsl and oklch functions and 8-digit or 4-digit hex. So tokens are resolved
// here and any non-hex colour is converted through a 1x1 canvas probe.
const HEX_OK = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const NAME_OK = /^[a-z]+$/i;

function readToken(name) {
  try {
    if (typeof globalThis.getComputedStyle !== 'function') return '';
    const root = globalThis.document && globalThis.document.documentElement;
    return String(globalThis.getComputedStyle(root).getPropertyValue(name) || '').trim();
  } catch (e) {
    return '';
  }
}

function toHex(raw) {
  if (colorCache.has(raw)) return colorCache.get(raw);
  let out = 'currentColor';
  try {
    const doc = globalThis.document;
    if (doc && typeof doc.createElement === 'function') {
      if (!probeCtx) probeCtx = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillStyle = '#010203';
      probeCtx.fillStyle = raw;
      if (probeCtx.fillStyle !== '#010203') {
        // the assignment was accepted
        probeCtx.fillRect(0, 0, 1, 1);
        const d = probeCtx.getImageData(0, 0, 1, 1).data;
        if (d[3] > 0) out = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch (e) {
    /* keep currentColor */
  }
  colorCache.set(raw, out);
  return out;
}

// '#rrggbb' | '#rgb' | a colour name | 'currentColor'. Never throws.
export function texColor(tokenOrColor) {
  const v = String(tokenOrColor == null ? '' : tokenOrColor).trim();
  const raw = v.startsWith('--') ? readToken(v) : v;
  if (!raw) return 'currentColor';
  if (HEX_OK.test(raw) || NAME_OK.test(raw)) return raw;
  return toHex(raw);
}

// Call at render time (inside a row function), never cached at mount, so a theme change recolours it.
export function tint(src, token) {
  return `\\textcolor{${texColor(token)}}{${src}}`;
}
export const cart = (src) => tint(src, '--cart');
export const polar = (src) => tint(src, '--polar');
export const input = (src) => tint(src, '--input');
export const output = (src) => tint(src, '--output');

// ---------------------------------------------------------------- prose with exponent notation
// The prose in js/data/*.js (aha, addressWhy, routes, topic summaries, function notes) writes exponents the way the
// handout and STORY do: e^{i(theta + pi/2)}, r^(1/3), e^x, 2^1. Set with textContent those show as literal braces and
// carets. proseParts splits a string into plain runs and superscript runs; proseToHtml and prose render the runs as
// text and <sup>. The rules, in order, for a '^' that has a non-space character before it:
//   X^{...}   the (nested) braces enclose the exponent        X^(...)  the (nested) brackets enclose it; the brackets are dropped
//   X^n       one optionally signed number (digits, one dot) or one letter: e^x, 2^10, z^-1, e^theta
// Anything else (no base, no closing bracket, nothing after it) stays a literal '^'. Inside an exponent text is kept as
// typed (no nested superscripts); subscripts such as u_x are left as typed too.
const EXPONENT_ATOM = /^[+\-\u2212]?(?:\d+(?:\.\d+)?|[A-Za-z\u0370-\u03ff])/;

// Index of the bracket that closes the one at text[open], or -1.
function closingBracket(text, open, openCh, closeCh) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === openCh) depth++;
    else if (c === closeCh && --depth === 0) return i;
  }
  return -1;
}

export function proseParts(text) {
  const s = text == null ? '' : String(text);
  const out = [];
  let plain = '';
  const flush = () => {
    if (plain !== '') out.push({ sup: false, text: plain });
    plain = '';
  };
  let i = 0;
  while (i < s.length) {
    if (s[i] === '^' && i > 0 && !/\s/.test(s[i - 1])) {
      const next = s[i + 1];
      let inner = null;
      let last = -1; // index of the last character the exponent uses
      if (next === '{' || next === '(') {
        const close = closingBracket(s, i + 1, next, next === '{' ? '}' : ')');
        if (close > 0) {
          inner = s.slice(i + 2, close);
          last = close;
        }
      } else if (next !== undefined) {
        const m = EXPONENT_ATOM.exec(s.slice(i + 1, i + 24));
        if (m) {
          inner = m[0];
          last = i + m[0].length;
        }
      }
      if (inner !== null && inner !== '') {
        flush();
        out.push({ sup: true, text: inner });
        i = last + 1;
        continue;
      }
    }
    plain += s[i];
    i++;
  }
  flush();
  return out;
}

export function proseToHtml(text) {
  return proseParts(text)
    .map((p) => (p.sup ? `<sup class="prose-sup">${escapeHtml(p.text)}</sup>` : escapeHtml(p.text)))
    .join('');
}

// Everything in the output is escaped except the <sup> tags this function writes, so untrusted text is safe here.
export function prose(el, text) {
  if (el == null) return;
  try {
    el.innerHTML = proseToHtml(text);
  } catch (e) {
    /* a detached or exotic element must not break the caller */
  }
}
