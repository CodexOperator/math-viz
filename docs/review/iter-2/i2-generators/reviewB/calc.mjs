// Independent reader/evaluator for the cards' ASCII text. Written from scratch by reviewer B; does not import complex.js.
export const Z = (re, im = 0) => ({ re, im });
export const add = (a, b) => Z(a.re + b.re, a.im + b.im);
export const sub = (a, b) => Z(a.re - b.re, a.im - b.im);
export const mul = (a, b) => Z(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return Z((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
export const cj = (a) => Z(a.re, -a.im);
export const ab = (a) => Math.hypot(a.re, a.im);
export const arg = (a) => Math.atan2(a.im, a.re);
export const ex = (a) => Z(Math.exp(a.re) * Math.cos(a.im), Math.exp(a.re) * Math.sin(a.im));
export const neg = (a) => Z(0 - a.re, 0 - a.im);
export const near = (a, b, e = 1e-9) => Math.abs(a.re - b.re) <= e && Math.abs(a.im - b.im) <= e;
export function cpow(a, b) {
  if (b.im === 0 && Number.isInteger(b.re) && b.re >= 0 && b.re <= 40) { let r = Z(1); for (let k = 0; k < b.re; k++) r = mul(r, a); return r; }
  if (a.re === 0 && a.im === 0) return Z(0);
  const L = Z(Math.log(ab(a)), arg(a)); return ex(mul(b, L));
}
const FUNCS = new Set(['sqrt', 'cos', 'sin', 'atan', 'conj', 'Re', 'Im', 'abs', 'exp', 'Arg']);
function tokenize(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; t.push({ k: 'n', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
    if (/[A-Za-z]/.test(c)) {
      const m = /^(theta|sqrt|cos|sin|atan|conj|Arg|Re|Im|pi|exp)/.exec(s.slice(i));
      if (m) { t.push({ k: 'id', v: m[1] }); i += m[1].length; } else { t.push({ k: 'id', v: c }); i++; }
      continue;
    }
    if ('+-*/^(){}|'.includes(c)) { t.push({ k: 'op', v: c === '{' ? '(' : c === '}' ? ')' : c }); i++; continue; }
    throw new Error('char ' + JSON.stringify(c) + ' in ' + s);
  }
  return t;
}
export function evalExpr(src, vars = {}) {
  const tk = tokenize(src); let p = 0;
  const peek = () => tk[p];
  const isOp = (v) => tk[p] && tk[p].k === 'op' && tk[p].v === v;
  const startsFactor = (inAbs) => { const x = tk[p]; if (!x) return false; if (x.k === 'n' || x.k === 'id') return true; if (x.k === 'op' && x.v === '(') return true; if (x.k === 'op' && x.v === '|' && !inAbs) return true; return false; };
  function expr(inAbs) { let a = term(inAbs); while (isOp('+') || isOp('-')) { const o = tk[p++].v; const b = term(inAbs); a = o === '+' ? add(a, b) : sub(a, b); } return a; }
  function term(inAbs) {
    let a = unary(inAbs);
    for (;;) {
      if (isOp('*')) { p++; a = mul(a, unary(inAbs)); }
      else if (isOp('/')) { p++; a = div(a, unary(inAbs)); }
      else if (startsFactor(inAbs)) a = mul(a, power(inAbs));
      else break;
    }
    return a;
  }
  function unary(inAbs) { if (isOp('-')) { p++; return neg(unary(inAbs)); } if (isOp('+')) { p++; return unary(inAbs); } return power(inAbs); }
  function power(inAbs) { const a = atom(inAbs); if (isOp('^')) { p++; const b = isOp('-') ? (p++, neg(atom(inAbs))) : atom(inAbs); return cpow(a, b); } return a; }
  function atom(inAbs) {
    const x = tk[p++]; if (!x) throw new Error('unexpected end in ' + src);
    if (x.k === 'n') return Z(x.v);
    if (x.k === 'op' && x.v === '(') { const a = expr(false); if (!isOp(')')) throw new Error('missing ) in ' + src); p++; return a; }
    if (x.k === 'op' && x.v === '|') { const a = expr(true); if (!isOp('|')) throw new Error('missing | in ' + src); p++; return Z(ab(a)); }
    if (x.k === 'id') {
      const v = x.v;
      if (v === 'pi') return Z(Math.PI);
      if (v === 'i') return Z(0, 1);
      if (FUNCS.has(v)) {
        let a;
        if (isOp('(')) { p++; a = expr(false); if (!isOp(')')) throw new Error('missing ) in ' + src); p++; }
        else { a = power(inAbs); while (startsFactor(inAbs) && !isOp('(')) a = mul(a, power(inAbs)); }
        switch (v) { case 'sqrt': return cpow(a, Z(0.5)); case 'cos': return Z(Math.cos(a.re)); case 'sin': return Z(Math.sin(a.re)); case 'atan': return Z(Math.atan(a.re)); case 'conj': return cj(a); case 'Re': return Z(a.re); case 'Im': return Z(a.im); case 'abs': return Z(ab(a)); case 'exp': return ex(a); case 'Arg': return Z(arg(a)); }
      }
      if (v === 'e' && !('e' in vars)) return Z(Math.E);
      if (v in vars) return vars[v];
      throw new Error('unknown identifier ' + v + ' in ' + src);
    }
    throw new Error('bad token ' + JSON.stringify(x) + ' in ' + src);
  }
  const r = expr(false); if (p !== tk.length) throw new Error('trailing tokens in ' + src); return r;
}
export const tryEval = (src, vars) => { try { return evalExpr(src, vars); } catch (e) { return null; } };
// TeX -> ascii-ish expression (enough for the cards' formulas)
export function texToAscii(t) {
  let s = t;
  s = s.replace(/\\left|\\right|\\,|\;|\\!|\\quad|\\qquad|\\displaystyle|\\mathrm|\\text/g, (m) => (m === '\\text' || m === '\\mathrm') ? '' : ' ');
  s = s.replace(/\\textcolor\{[^}]*\}/g, '');
  s = s.replace(/\\cdot|\\times/g, '*').replace(/\\pi/g, 'pi').replace(/\\theta/g, 'theta').replace(/\\cos/g, 'cos').replace(/\\sin/g, 'sin').replace(/\\arctan/g, 'atan');
  s = s.replace(/\\operatorname\{([^}]*)\}/g, '$1');
  for (let k = 0; k < 8; k++) { s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)').replace(/\\overline\{([^{}]*)\}/g, 'conj($1)').replace(/\\bar\{([^{}]*)\}/g, 'conj($1)'); }
  s = s.replace(/\\mathbb\{C\}/g, 'C').replace(/\\approx/g, '~').replace(/−/g, '-');
  return s;
}
