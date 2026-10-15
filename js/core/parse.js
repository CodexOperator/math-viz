// js/core/parse.js - a tiny f(z) language ("z^2 + iz", "(1+i)z", "z^(1/3)",
// "(x^2 - y^2 + 2ixy)/(x^2 + y^2)") turned into a ParseError, an AST, pretty TeX and a fast
// closure-compiled evaluator.
//
// Pure module: its only import is ./complex.js, it touches no DOM, and its only state is a
// bounded compile cache. It never builds code from text (closures only), so it is safe under a
// strict Content Security Policy. Both source files are pure ASCII: non-ASCII characters the
// tokenizer accepts are written as \uXXXX escapes.
//
// Grammar (whitespace anywhere is ignored; names are case-sensitive):
//   formula    := expression END
//   expression := term { ('+' | '-') term }                 left-associative
//   term       := unary { ('*' | '/') unary | implicit }    left-associative, same level as * and /
//   implicit   := power   (taken only when the next token is a variable, a constant, a function
//                          name or '('; a number is never the right factor of an implicit product)
//   unary      := '-' unary | '+' unary | power
//   power      := atom [ '^' unary ]                        right-associative, signed exponent allowed
//   atom       := NUMBER | CONST | VAR | FUNC '(' expression ')' | '(' expression ')'
//   CONST := i | e | pi      VAR := z | x | y      (x = Re z, y = Im z)
//   FUNC  := conj Re Im abs arg Arg exp log sqrt sin cos
//
// Design: docs/designs/iter-1/i1-core-math.md (sections 4.3, 5.8, 2.3)

import { add, sub, mul, div, neg, conj, pow, powc, exp, log, sqrt, sin, cos, abs, Arg, fmtNum } from './complex.js';

// ----- private constants --------------------------------------------------------------------

const MAX_LEN = 400;
const MAX_DEPTH = 80;
const CACHE_MAX = 64;

// Names longest first, so the first hit at a position is the longest.
const NAMES = ['conj', 'sqrt', 'abs', 'arg', 'Arg', 'exp', 'log', 'sin', 'cos', 'Re', 'Im', 'pi', 'i', 'e', 'z', 'x', 'y'];
const FUNCS = new Set(['conj', 'Re', 'Im', 'abs', 'arg', 'Arg', 'exp', 'log', 'sqrt', 'sin', 'cos']);
const CONSTS = new Set(['i', 'e', 'pi']);
const VARS = new Set(['z', 'x', 'y']);

const MINUS_CHARS = '-\u2212\u2013\u2014';
const TIMES_CHARS = '*\u00d7\u00b7\u22c5\u2219';
const DIVIDE_CHARS = '/\u00f7';
const PI_CHAR = '\u03c0';
const ROOT_CHAR = '\u221a';
const LETTER_RUN = /^[A-Za-z\u03c0]+/;
const NUMBER_AT = /^(\d+\.?\d*|\.\d+)/;

const CONTROL_WORD_END = /\\[A-Za-z]+$/;
const LETTER_START = /^[A-Za-z]/;
// Characters that print as nothing, or only as a mark on the character before them.
const HIDDEN_CHAR = /^[\p{C}\p{Z}\p{M}]$/u;

const NAME_LIST = 'z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos';

// ----- ParseError ---------------------------------------------------------------------------

/** The only error the parser throws: a sentence a student can read, plus where it went wrong. */
export class ParseError extends Error {
  constructor(message, position, length = 1) {
    super(message);
    this.name = 'ParseError';
    this.position = position;
    this.length = Math.max(1, length);
  }
}

// ----- tokenizer ----------------------------------------------------------------------------

function tok(type, value, pos, end, text) {
  return { type, value, pos, end, text };
}

// Split a run of letters into known names (greedy, longest first). Returns null if it fails.
function segment(run, ignoreCase) {
  const out = [];
  let p = 0;
  while (p < run.length) {
    if (run[p] === PI_CHAR) { out.push({ name: 'pi', pos: p, end: p + 1 }); p += 1; continue; }
    let hit = null;
    for (let n = 0; n < NAMES.length; n++) {
      const name = NAMES[n];
      const piece = run.slice(p, p + name.length);
      if (piece.length === name.length && (ignoreCase ? piece.toLowerCase() === name.toLowerCase() : piece === name)) {
        hit = name;
        break;
      }
    }
    if (hit === null) return null;
    out.push({ name: hit, pos: p, end: p + hit.length });
    p += hit.length;
  }
  return out;
}

function tokenize(src) {
  if (typeof src !== 'string') throw new ParseError('Type a formula in z, for example z^2 + i z.', 0, 1);
  if (src.length > MAX_LEN) throw new ParseError('That formula is too long (more than ' + MAX_LEN + ' characters).', MAX_LEN, 1);
  const toks = [];
  let p = 0;
  while (p < src.length) {
    const ch = src[p];
    if (/\s/.test(ch)) { p += 1; continue; }

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      const m = NUMBER_AT.exec(src.slice(p));
      if (!m) throw new ParseError('A "." must have digits next to it, like 0.5.', p, 1);
      const end = p + m[0].length;
      if (src[end] === '.') throw new ParseError('This number has two decimal points.', end, 1);
      const value = parseFloat(m[0]);
      if (!Number.isFinite(value)) throw new ParseError('That number is too big.', p, m[0].length);
      toks.push(tok('num', value, p, end, m[0]));
      p = end;
      continue;
    }

    if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === PI_CHAR) {
      const run = LETTER_RUN.exec(src.slice(p))[0];
      let parts = segment(run, false);
      if (parts === null) {
        const loose = segment(run, true);
        if (loose !== null) {
          const fixed = loose.map((s) => s.name).join('');
          throw new ParseError('I don\'t know the name "' + run + '". Names are case-sensitive; did you mean "' + fixed + '"?', p, run.length);
        }
        throw new ParseError('I don\'t know the name "' + run + '". You can use ' + NAME_LIST + '.', p, run.length);
      }
      for (let k = 0; k < parts.length; k++) {
        const s = parts[k];
        const type = FUNCS.has(s.name) ? 'func' : (CONSTS.has(s.name) ? 'const' : 'var');
        toks.push(tok(type, s.name, p + s.pos, p + s.end, src.slice(p + s.pos, p + s.end)));
      }
      p += run.length;
      continue;
    }

    if (ch === '*' && src[p + 1] === '*') {
      toks.push(tok('op', '^', p, p + 2, '**'));
      p += 2;
      continue;
    }
    if (ch === '+') { toks.push(tok('op', '+', p, p + 1, ch)); p += 1; continue; }
    if (MINUS_CHARS.indexOf(ch) >= 0) { toks.push(tok('op', '-', p, p + 1, ch)); p += 1; continue; }
    if (TIMES_CHARS.indexOf(ch) >= 0) { toks.push(tok('op', '*', p, p + 1, ch)); p += 1; continue; }
    if (DIVIDE_CHARS.indexOf(ch) >= 0) { toks.push(tok('op', '/', p, p + 1, ch)); p += 1; continue; }
    if (ch === '^') { toks.push(tok('op', '^', p, p + 1, ch)); p += 1; continue; }
    if (ch === '\u00b2' || ch === '\u00b3') {
      toks.push(tok('op', '^', p, p + 1, ch));
      toks.push(tok('num', ch === '\u00b2' ? 2 : 3, p, p + 1, ch === '\u00b2' ? '2' : '3'));
      p += 1;
      continue;
    }
    if (ch === '(') { toks.push(tok('lparen', '(', p, p + 1, ch)); p += 1; continue; }
    if (ch === ')') { toks.push(tok('rparen', ')', p, p + 1, ch)); p += 1; continue; }

    // Step by code point, so an emoji is one whole character of length 2 (never a lone surrogate half).
    const cp = String.fromCodePoint(src.codePointAt(p));
    if (cp === '|') throw new ParseError('Bars are not supported. Use abs(z) for the modulus, like abs(z - 1).', p, 1);
    if (cp === ROOT_CHAR) throw new ParseError('The root sign is not supported. Use sqrt(z) for a square root, like sqrt(z + 1).', p, 1);
    if (HIDDEN_CHAR.test(cp)) {
      const hex = cp.codePointAt(0).toString(16).toUpperCase();
      throw new ParseError('There is a hidden character (U+' + '0000'.slice(hex.length) + hex + ') here that I can\'t read. Delete it and retype that part of the formula.', p, cp.length);
    }
    throw new ParseError('I don\'t understand the character "' + cp + '". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ).', p, cp.length);
  }
  toks.push(tok('eof', null, src.length, src.length, ''));
  return toks;
}

// ----- parser -------------------------------------------------------------------------------

/** Parse a formula into an AST of plain objects; throws ParseError with a message a student can read. */
export function parse(src) {
  const toks = tokenize(src);
  if (toks.length === 1) throw new ParseError('Type a formula in z, for example z^2 + i z.', 0, 1);
  let i = 0;
  let depth = 0;

  const peek = () => toks[i];
  const enter = () => {
    depth += 1;
    if (depth > MAX_DEPTH) throw new ParseError('This formula is nested too deeply.', toks[i].pos, 1);
  };

  function unexpected(t) {
    if (t.type === 'num') {
      throw new ParseError('I did not expect the number "' + t.text + '" here. Put the number first (2z, not z2) or use * between them.', t.pos, t.end - t.pos);
    }
    if (t.type === 'rparen') throw new ParseError('This ")" has no matching "(".', t.pos, 1);
    throw new ParseError('I did not expect "' + t.text + '" here.', t.pos, Math.max(1, t.end - t.pos));
  }

  function close(lp) {
    const t = peek();
    if (t.type === 'rparen') { i += 1; return; }
    if (t.type === 'eof') throw new ParseError('This "(" is never closed. Add a ")" at the end.', lp.pos, 1);
    unexpected(t);
  }

  function expression() {
    enter();
    let left = term();
    while (peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = toks[i++].value;
      left = { type: 'bin', op, left, right: term() };
    }
    depth -= 1;
    return left;
  }

  function term() {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t.type === 'op' && (t.value === '*' || t.value === '/')) {
        i += 1;
        left = { type: 'bin', op: t.value, left, right: unary() };
      } else if (t.type === 'var' || t.type === 'const' || t.type === 'func' || t.type === 'lparen') {
        left = { type: 'bin', op: '*', implicit: true, left, right: power() };
      } else {
        return left;
      }
    }
  }

  function unary() {
    const t = peek();
    if (t.type === 'op' && t.value === '-') {
      i += 1;
      enter();
      const arg = unary();
      depth -= 1;
      return { type: 'neg', arg };
    }
    if (t.type === 'op' && t.value === '+') {
      i += 1;
      return unary();
    }
    return power();
  }

  function power() {
    const base = atom();
    const t = peek();
    if (t.type === 'op' && t.value === '^') {
      i += 1;
      enter();
      const right = unary();
      depth -= 1;
      return { type: 'bin', op: '^', left: base, right };
    }
    return base;
  }

  function atom() {
    const before = toks[i - 1];
    const t = toks[i];
    if (t.type !== 'eof') i += 1;
    switch (t.type) {
      case 'num': return { type: 'num', value: t.value };
      case 'const': return { type: 'const', name: t.value };
      case 'var': return { type: 'var', name: t.value };
      case 'func': {
        const lp = peek();
        if (lp.type !== 'lparen') {
          throw new ParseError('"' + t.value + '" needs brackets around its input, like ' + t.value + '(z).', t.pos, t.end - t.pos);
        }
        i += 1;
        const arg = expression();
        close(lp);
        return { type: 'call', name: t.value, arg };
      }
      case 'lparen': {
        const inner = expression();
        close(t);
        return inner;
      }
      case 'rparen':
        if (before && before.type === 'lparen') {
          throw new ParseError('There is nothing between this "(" and ")". Put a formula inside the brackets.', before.pos, t.end - before.pos);
        }
        // "(z+)": the ")" has a partner, the operand after the operator is what is missing.
        if (before && before.type === 'op') {
          throw new ParseError('Something is missing between "' + before.text + '" and this ")". Put a number or a variable there.', t.pos, 1);
        }
        throw new ParseError('This ")" has no matching "(".', t.pos, 1);
      case 'eof':
        throw new ParseError('The formula stops too early. Something is missing after "' + (before ? before.text : '') + '".', t.pos, 1);
      default:
        throw new ParseError('A formula can\'t have "' + t.text + '" here. I expected a number, a variable or "(".', t.pos, Math.max(1, t.end - t.pos));
    }
  }

  const ast = expression();
  if (peek().type !== 'eof') unexpected(peek());
  return ast;
}

// ----- toTex --------------------------------------------------------------------------------

// Levels: sum 1, product 2, unary minus 3, power 4, atom 5.
function wrap(child, minLvl) {
  return child.lvl >= minLvl ? child.s : '\\left(' + child.s + '\\right)';
}

// An operand that starts with a minus sign (-z, but also -3x, which is (-3)x) and follows another operator is
// bracketed, so two signs never touch: -(-z), z - (-z), z + (-3x). Everything else keeps the level rule of wrap().
function afterOperator(child, minLvl) {
  const s = wrap(child, minLvl);
  return s.charAt(0) === '-' ? '\\left(' + s + '\\right)' : s;
}

function numTex(v) {
  if (Number.isInteger(v)) return String(v);
  const s = fmtNum(v, 6);
  return s === '0' ? String(v) : s;
}

function tex(node) {
  switch (node.type) {
    case 'num': return { s: numTex(node.value), lvl: 5 };
    case 'const': return { s: node.name === 'pi' ? '\\pi' : node.name, lvl: 5 };
    case 'var': return { s: node.name, lvl: 5 };
    case 'neg': return { s: '-' + afterOperator(tex(node.arg), 3), lvl: 3 };
    case 'bin': {
      const L = tex(node.left);
      const R = tex(node.right);
      switch (node.op) {
        case '+': return { s: L.s + ' + ' + afterOperator(R, 1), lvl: 1 };
        case '-': return { s: L.s + ' - ' + afterOperator(R, 2), lvl: 1 };
        case '/': return { s: '\\frac{' + L.s + '}{' + R.s + '}', lvl: 2 };
        case '^': return { s: wrap(L, 5) + '^{' + R.s + '}', lvl: 4 };
        default: {
          const l = wrap(L, 2);
          const r = wrap(R, 3.5);
          const digitNext = /^[0-9.]/.test(r);
          const join = (node.implicit || node.left.type === 'num') && !digitNext;
          // "\pi" glued to a letter would read as one unknown control word (\piz), so a control
          // word on the left and a letter on the right get a thin space: \pi\,z.
          const gap = CONTROL_WORD_END.test(l) && LETTER_START.test(r) ? '\\,' : '';
          return { s: join ? l + gap + r : l + ' \\cdot ' + r, lvl: 2 };
        }
      }
    }
    default: {
      const a = tex(node.arg).s;
      switch (node.name) {
        case 'conj': return { s: '\\overline{' + a + '}', lvl: 5 };
        case 'abs': return { s: '\\left|' + a + '\\right|', lvl: 5 };
        case 'sqrt': return { s: '\\sqrt{' + a + '}', lvl: 5 };
        case 'exp': return { s: 'e^{' + a + '}', lvl: 4 };
        case 'Re': case 'Im': case 'Arg':
          return { s: '\\operatorname{' + node.name + '}\\left(' + a + '\\right)', lvl: 5 };
        default: return { s: '\\' + node.name + '\\left(' + a + '\\right)', lvl: 5 };
      }
    }
  }
}

/** Pretty TeX of the parsed formula (fractions, superscripts, \overline{z} for conj); throws ParseError. */
export function toTex(src) {
  return tex(parse(src)).s;
}

// ----- compile ------------------------------------------------------------------------------

const CALLS = {
  conj,
  exp,
  log,
  sqrt,
  sin,
  cos,
  Re: (w) => ({ re: w.re, im: 0 }),
  Im: (w) => ({ re: w.im, im: 0 }),
  abs: (w) => ({ re: abs(w), im: 0 }),
  arg: (w) => ({ re: Arg(w), im: 0 }),
  Arg: (w) => ({ re: Arg(w), im: 0 }),
};

const BINS = { '+': add, '-': sub, '*': mul, '/': div };

function constNode(c) {
  return { f: () => c, c };
}

// build(node) -> { f, c }: f(z) returns { re, im } (possibly a shared object, never mutated);
// c is the constant value when the node does not depend on z, else null.
function build(node) {
  switch (node.type) {
    case 'num': return constNode({ re: node.value, im: 0 });
    case 'const': {
      if (node.name === 'i') return constNode({ re: 0, im: 1 });
      return constNode({ re: node.name === 'e' ? Math.E : Math.PI, im: 0 });
    }
    case 'var': {
      if (node.name === 'z') return { f: (z) => z, c: null };
      if (node.name === 'x') return { f: (z) => ({ re: z.re, im: 0 }), c: null };
      return { f: (z) => ({ re: z.im, im: 0 }), c: null };
    }
    case 'neg': {
      const a = build(node.arg);
      if (a.c !== null) return constNode(neg(a.c));
      const af = a.f;
      return { f: (z) => neg(af(z)), c: null };
    }
    case 'call': {
      const a = build(node.arg);
      const g = CALLS[node.name];
      if (a.c !== null) return constNode(g(a.c));
      const af = a.f;
      return { f: (z) => g(af(z)), c: null };
    }
    default: {
      const L = build(node.left);
      const R = build(node.right);
      const lf = L.f;
      const rf = R.f;
      let f;
      if (node.op === '^') {
        if (R.c !== null && R.c.im === 0 && Number.isInteger(R.c.re)) {
          const n = R.c.re;
          f = (z) => pow(lf(z), n);
        } else if (R.c !== null) {
          const w = R.c;
          f = (z) => powc(lf(z), w);
        } else {
          f = (z) => {
            const w = rf(z);
            const b = lf(z);
            return w.im === 0 && Number.isInteger(w.re) ? pow(b, w.re) : powc(b, w);
          };
        }
      } else {
        const g = BINS[node.op];
        f = (z) => g(lf(z), rf(z));
      }
      if (L.c !== null && R.c !== null) return constNode(f({ re: 0, im: 0 }));
      return { f, c: null };
    }
  }
}

function collectUses(node, set) {
  if (node.type === 'var') set.add(node.name);
  else if (node.type === 'neg' || node.type === 'call') collectUses(node.arg, set);
  else if (node.type === 'bin') { collectUses(node.left, set); collectUses(node.right, set); }
}

const cache = new Map();

/** Compile a formula to { f, src, tex, uses }; f(z) takes { re, im } (or a real number) and returns a fresh { re, im }. */
export function compile(src) {
  if (cache.has(src)) return cache.get(src);
  const ast = parse(src);
  const root = build(ast).f;
  const f = (z) => {
    if (typeof z === 'number') z = { re: z, im: 0 };
    const w = root(z);
    return { re: w.re, im: w.im };
  };
  const uses = new Set();
  collectUses(ast, uses);
  const result = { f, src, tex: tex(ast).s, uses };
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(src, result);
  return result;
}

/** compile(src).f(z): the formula's value at z. */
export function evaluate(src, z) {
  return compile(src).f(z);
}
