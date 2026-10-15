import * as X from '../../../../../js/core/complex.js';
import * as P from '../../../../../js/core/parse.js';
import fs from 'node:fs';
const mod = { exports: {} };
new Function('module', 'exports', 'self', fs.readFileSync('/home/user/math-viz/vendor/katex/katex.min.js', 'utf8'))(mod, mod.exports, undefined);
const katex = mod.exports;
let seed = 987654321; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
const FUN = ['conj', 'Re', 'Im', 'abs', 'arg', 'Arg', 'exp', 'log', 'sqrt', 'sin', 'cos'];
const G = { conj: X.conj, exp: X.exp, log: X.log, sqrt: X.sqrt, sin: X.sin, cos: X.cos, Re: w => ({ re: w.re, im: 0 }), Im: w => ({ re: w.im, im: 0 }), abs: w => ({ re: X.abs(w), im: 0 }), arg: w => ({ re: X.Arg(w), im: 0 }), Arg: w => ({ re: X.Arg(w), im: 0 }) };
// AST gen
function gen(d) {
  const r = rnd();
  if (d <= 0 || r < .25) {
    const k = rnd();
    if (k < .3) return { t: 'num', v: pick([0, 1, 2, 3, 5, 0.5, 1.25, 2.5, 0.1, 7, 10]) };
    if (k < .55) return { t: 'var', n: pick(['z', 'z', 'x', 'y']) };
    return { t: 'const', n: pick(['i', 'e', 'pi', 'i', 'pi']) };
  }
  if (r < .40) return { t: 'neg', a: gen(d - 1) };
  if (r < .55) return { t: 'call', n: pick(FUN), a: gen(d - 1) };
  return { t: 'bin', op: pick(['+', '-', '*', '/', '^', 'imp', 'imp', '^', '*']), l: gen(d - 1), r: gen(d - 1) };
}
const lvl = n => n.t === 'bin' ? (n.op === '+' || n.op === '-' ? 1 : n.op === '^' ? 4 : 2) : n.t === 'neg' ? 3 : 5;
const par = (s, ok) => ok ? s : '(' + s + ')';
function pr(n) {
  switch (n.t) {
    case 'num': return String(n.v);
    case 'var': return n.n;
    case 'const': return n.n;
    case 'neg': return '-' + par(pr(n.a), lvl(n.a) >= 3);
    case 'call': return n.n + '(' + pr(n.a) + ')';
    case 'bin': {
      const op = n.op;
      if (op === '+' || op === '-') return pr(n.l) + pick([' ', '']) + op + pick([' ', '']) + par(pr(n.r), lvl(n.r) >= 2) ;
      if (op === '^') return par(pr(n.l), lvl(n.l) >= 5) + '^' + par(pr(n.r), lvl(n.r) >= 3);
      const L = par(pr(n.l), lvl(n.l) >= 2);
      if (op === '*' || op === '/') return L + pick([' ', '']) + op + pick([' ', '']) + par(pr(n.r), lvl(n.r) >= 3);
      // implicit: right must be power-level and start with letter or (
      let R = par(pr(n.r), lvl(n.r) >= 4);
      if (!/^[A-Za-z(]/.test(R)) R = '(' + R + ')';
      return L + pick(['', ' ', '']) + R;
    }
  }
}
// normalise: AST "imp" evaluates as '*'
function ev(n, z) {
  switch (n.t) {
    case 'num': return { re: n.v, im: 0 };
    case 'var': return n.n === 'z' ? z : n.n === 'x' ? { re: z.re, im: 0 } : { re: z.im, im: 0 };
    case 'const': return n.n === 'i' ? { re: 0, im: 1 } : { re: n.n === 'e' ? Math.E : Math.PI, im: 0 };
    case 'neg': return X.neg(ev(n.a, z));
    case 'call': return G[n.n](ev(n.a, z));
    case 'bin': {
      const a = ev(n.l, z), b = ev(n.r, z);
      switch (n.op) { case '+': return X.add(a, b); case '-': return X.sub(a, b); case '*': case 'imp': return X.mul(a, b); case '/': return X.div(a, b); default: return b.im === 0 && Number.isInteger(b.re) ? X.pow(a, b.re) : X.powc(a, b); }
    }
  }
}
// ---- mini TeX interpreter
function evTex(s, z) {
  const toks = [];
  let p = 0;
  while (p < s.length) {
    const c = s[p];
    if (c === ' ') { p++; continue; }
    if (c === '\\') {
      if (s[p + 1] === ',') { p += 2; continue; }
      const m = /^\\[A-Za-z]+/.exec(s.slice(p)); if (!m) throw new Error('bad cmd at ' + p + ' in ' + s);
      toks.push(m[0]); p += m[0].length; continue;
    }
    if (/[A-Za-z]/.test(c) && toks[toks.length - 2] === '\\operatorname') { const m = /^[A-Za-z]+/.exec(s.slice(p)); toks.push(m[0]); p += m[0].length; continue; }
    if (/[0-9.]/.test(c)) { const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(p)); toks.push({ num: parseFloat(m[0]) }); p += m[0].length; continue; }
    toks.push(c); p++;
  }
  let i = 0;
  const peek = () => toks[i];
  const eat = t => { if (toks[i] !== t) throw new Error(`expected ${t} got ${JSON.stringify(toks[i])} in ${s}`); i++; };
  const startsFactor = t => t !== undefined && (typeof t === 'object' || (typeof t === 'string' && (/^[zxyei]$/.test(t) || ['\\pi', '\\frac', '\\left', '\\overline', '\\sqrt', '\\sin', '\\cos', '\\log', '\\arg', '\\operatorname'].includes(t))));
  function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = toks[i++]; const w = term(); v = o === '+' ? X.add(v, w) : X.sub(v, w); } return v; }
  function term() { if (peek() === '-') { i++; return X.neg(term()); } if (peek() === '+') { i++; return term(); } return prod(); }
  function prod() { let v = factor(); for (;;) { if (peek() === '\\cdot') { i++; v = X.mul(v, factor()); } else if (startsFactor(peek())) v = X.mul(v, factor()); else return v; } }
  function factor() {
    const b = base();
    if (peek() === '^') { i++; let e; if (peek() === '{') { i++; e = expr(); eat('}'); } else e = base(); return e.im === 0 && Number.isInteger(e.re) ? X.pow(b, e.re) : X.powc(b, e); }
    return b;
  }
  function grp() { eat('{'); const v = expr(); eat('}'); return v; }
  function base() {
    const t = toks[i++];
    if (typeof t === 'object') return { re: t.num, im: 0 };
    switch (t) {
      case 'z': return z; case 'x': return { re: z.re, im: 0 }; case 'y': return { re: z.im, im: 0 };
      case 'e': return { re: Math.E, im: 0 }; case 'i': return { re: 0, im: 1 }; case '\\pi': return { re: Math.PI, im: 0 };
      case '\\frac': { const a = grp(); const b = grp(); return X.div(a, b); }
      case '\\overline': return X.conj(grp());
      case '\\sqrt': return X.sqrt(grp());
      case '\\left': { const o = toks[i++]; const v = expr(); eat('\\right'); const c = toks[i++]; if (o === '(' && c === ')') return v; if (o === '|' && c === '|') return { re: X.abs(v), im: 0 }; throw new Error('delims'); }
      case '\\sin': case '\\cos': case '\\log': case '\\arg': {
        const a = parenArg(); return { '\\sin': X.sin, '\\cos': X.cos, '\\log': X.log, '\\arg': G.arg }[t](a);
      }
      case '\\operatorname': { eat('{'); const nm = toks[i++]; eat('}'); const a = parenArg(); return G[nm](a); }
      default: throw new Error('unexpected ' + JSON.stringify(t) + ' in ' + s);
    }
  }
  function parenArg() { eat('\\left'); eat('('); const v = expr(); eat('\\right'); eat(')'); return v; }
  const v = expr(); if (i !== toks.length) throw new Error('trailing ' + JSON.stringify(toks.slice(i)) + ' in ' + s);
  return v;
}
let bad = 0, tested = 0, texTested = 0; const fail = (...a) => { bad++; if (bad < 25) console.log('FAIL', ...a); };
const close = (a, b) => { if (!Number.isFinite(a.re) || !Number.isFinite(a.im) || Math.abs(a.re) > 1e5 || Math.abs(a.im) > 1e5) return true; const e = Math.hypot(a.re - b.re, a.im - b.im); return e <= 1e-8 * Math.max(1, Math.hypot(a.re, a.im)); };
const zs = [{ re: .7, im: -.4 }, { re: -1.3, im: .9 }, { re: .31, im: 1.7 }, { re: -.5, im: -.25 }, { re: 2.1, im: .05 }];
for (let it = 0; it < 60000; it++) {
  const ast = gen(1 + Math.floor(rnd() * 4));
  const src = pr(ast);
  if (src.length > 300) continue;
  let comp;
  try { comp = P.compile(src); } catch (e) { fail('compile threw', src, e.message); continue; }
  tested++;
  for (const z of zs) {
    const exp = ev(ast, z); const got = comp.f(z);
    if (!close(exp, got)) { fail('value mismatch', src, JSON.stringify(z), JSON.stringify(exp), JSON.stringify(got)); break; }
  }
  // TeX
  let t;
  try { t = P.toTex(src); katex.renderToString(t, { throwOnError: true, strict: 'error' }); } catch (e) { fail('toTex/katex', src, t, e.message); continue; }
  if (t !== comp.tex) fail('compile.tex != toTex', src);
  texTested++;
  for (const z of zs) {
    let v; try { v = evTex(t, z); } catch (e) { fail('texeval threw', src, t, e.message); break; }
    const exp = ev(ast, z);
    if (!close(exp, v)) { fail('TeX value mismatch', src, '=>', t, JSON.stringify(z), JSON.stringify(exp), JSON.stringify(v)); break; }
  }
  // uses
  const uses = new Set(); (function c(n) { if (n.t === 'var') uses.add(n.n); else if (n.t === 'neg' || n.t === 'call') c(n.a); else if (n.t === 'bin') { c(n.l); c(n.r); } })(ast);
  if ([...uses].sort().join() !== [...comp.uses].sort().join()) fail('uses', src, [...uses], [...comp.uses]);
}
console.log('parsed+evaluated', tested, 'tex checked', texTested, 'bad', bad);
