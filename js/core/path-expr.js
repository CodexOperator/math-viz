// A path c(t) typed as plain math. No eval, no Function.
//
// Complex arithmetic, the name t, i, pi, e, and exp, sin, cos, abs, arg, conj.
// Any other name is a real variable. The station gives each one a slider.

const FUNCS = new Set(['exp', 'sin', 'cos', 'abs', 'arg', 'conj']);
const RESERVED = new Set(['t', 'i', 'pi', 'e', ...FUNCS]);

function fail(hint, at) {
  return { ok: false, hint, at: at || 0, ast: null, vars: [] };
}

function tokenize(src) {
  const s = String(src).replace(/\u2212/g, '-').replace(/\u00d7/g, '*').replace(/\u03c0/g, 'pi');
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i += 1; continue; }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push({ t: ch, i });
      i += 1;
      continue;
    }
    if (ch === '.' || (ch >= '0' && ch <= '9')) {
      const m = /^(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
      if (!m) return { error: fail('A number here is unfinished.', i) };
      const n = Number(m[0]);
      if (!Number.isFinite(n)) return { error: fail('That number is too large.', i) };
      tokens.push({ t: 'num', v: n, i });
      i += m[0].length;
      continue;
    }
    if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_') {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
      tokens.push({ t: 'id', v: m[0], i });
      i += m[0].length;
      continue;
    }
    return { error: fail(`“${ch}” is not part of a path. Use + − * / ^, t, i, pi, and exp, sin, cos, abs, arg, conj.`, i) };
  }
  tokens.push({ t: 'end', i: s.length });
  return { tokens };
}

function parseTokens(tokens) {
  let k = 0;
  const peek = () => tokens[k];
  const eat = () => tokens[k++];

  function primary() {
    const tok = peek();
    if (!tok || tok.t === 'end') return fail('The formula ends early.', tok ? tok.i : 0);
    if (tok.t === 'num') {
      eat();
      return { ok: true, ast: { op: 'num', re: tok.v, im: 0 } };
    }
    if (tok.t === '(') {
      eat();
      const inner = expr();
      if (!inner.ok) return inner;
      if (peek().t !== ')') return fail('A parenthesis is still open.', peek().i);
      eat();
      return inner;
    }
    if (tok.t === 'id') {
      eat();
      if (FUNCS.has(tok.v)) {
        if (peek().t !== '(') return fail(`${tok.v} needs parentheses: ${tok.v}(…)`, tok.i);
        eat();
        const args = [];
        if (peek().t !== ')') {
          for (;;) {
            const a = expr();
            if (!a.ok) return a;
            args.push(a.ast);
            if (peek().t === ',') { eat(); continue; }
            break;
          }
        }
        if (peek().t !== ')') return fail(`${tok.v} is missing a closing parenthesis.`, peek().i);
        eat();
        if (args.length !== 1) return fail(`${tok.v} takes one input.`, tok.i);
        return { ok: true, ast: { op: 'call', name: tok.v, arg: args[0] } };
      }
      if (tok.v === 't') return { ok: true, ast: { op: 't' } };
      if (tok.v === 'i') return { ok: true, ast: { op: 'num', re: 0, im: 1 } };
      if (tok.v === 'pi') return { ok: true, ast: { op: 'num', re: Math.PI, im: 0 } };
      if (tok.v === 'e') return { ok: true, ast: { op: 'num', re: Math.E, im: 0 } };
      if (RESERVED.has(tok.v)) return fail(`“${tok.v}” is not a variable.`, tok.i);
      return { ok: true, ast: { op: 'var', name: tok.v } };
    }
    return fail('Expected a number, t, or a name.', tok.i);
  }

  function startsPrimary(tok) {
    return tok && (tok.t === 'num' || tok.t === 'id' || tok.t === '(');
  }

  function unary() {
    if (peek().t === '-') {
      const at = eat().i;
      const u = unary();
      if (!u.ok) return u;
      return { ok: true, ast: { op: 'neg', arg: u.ast, at } };
    }
    if (peek().t === '+') { eat(); return unary(); }
    let p = primary();
    if (!p.ok) return p;
    // 2i, 2pi, 2t, )(, and a number beside a name: multiply, do not invent a name.
    while (startsPrimary(peek())) {
      const q = primary();
      if (!q.ok) return q;
      p = { ok: true, ast: { op: 'mul', a: p.ast, b: q.ast } };
    }
    return p;
  }

  function power() {
    const u = unary();
    if (!u.ok) return u;
    if (peek().t !== '^') return u;
    eat();
    const v = power();
    if (!v.ok) return v;
    return { ok: true, ast: { op: 'pow', a: u.ast, b: v.ast } };
  }

  function term() {
    let left = power();
    if (!left.ok) return left;
    while (peek().t === '*' || peek().t === '/') {
      const op = eat().t;
      const right = power();
      if (!right.ok) return right;
      left = { ok: true, ast: { op, a: left.ast, b: right.ast } };
    }
    return left;
  }

  function expr() {
    let left = term();
    if (!left.ok) return left;
    while (peek().t === '+' || peek().t === '-') {
      const op = eat().t;
      const right = term();
      if (!right.ok) return right;
      left = { ok: true, ast: { op, a: left.ast, b: right.ast } };
    }
    return left;
  }

  const out = expr();
  if (!out.ok) return out;
  if (peek().t !== 'end') return fail('There is extra text after the formula.', peek().i);
  return out;
}

function collectVars(ast, out) {
  if (!ast) return;
  if (ast.op === 'var' && !out.includes(ast.name)) out.push(ast.name);
  if (ast.arg) collectVars(ast.arg, out);
  if (ast.a) collectVars(ast.a, out);
  if (ast.b) collectVars(ast.b, out);
}

export function parsePath(src) {
  const text = String(src == null ? '' : src).trim();
  if (!text) return fail('Type a formula in t. A circle is cx + cy*i + r*exp(2*pi*i*t).');
  const lex = tokenize(text);
  if (lex.error) return lex.error;
  const parsed = parseTokens(lex.tokens);
  if (!parsed.ok) return parsed;
  const vars = [];
  collectVars(parsed.ast, vars);
  return { ok: true, ast: parsed.ast, vars, hint: '', at: 0 };
}

function cadd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
function csub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
function cmul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
function cdiv(a, b) {
  const d = b.re * b.re + b.im * b.im;
  if (!(d > 0) || !Number.isFinite(d)) return null;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function cexp(z) {
  const e = Math.exp(z.re);
  if (!Number.isFinite(e)) return null;
  return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) };
}
function clog(z) {
  const r = Math.hypot(z.re, z.im);
  if (!(r > 0)) return null;
  return { re: Math.log(r), im: Math.atan2(z.im, z.re) };
}
function csin(z) {
  return { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) };
}
function ccos(z) {
  return { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) };
}
function cpow(a, b) {
  if (a.re === 0 && a.im === 0) {
    if (b.im !== 0 || b.re <= 0) return null;
    return { re: 0, im: 0 };
  }
  const log = clog(a);
  if (!log) return null;
  return cexp(cmul(b, log));
}

function ev(ast, t, env, err) {
  switch (ast.op) {
    case 'num': return { re: ast.re, im: ast.im };
    case 't': return { re: t, im: 0 };
    case 'var': {
      const v = env[ast.name];
      const n = Number(v);
      return { re: Number.isFinite(n) ? n : 0, im: 0 };
    }
    case 'neg': {
      const a = ev(ast.arg, t, env, err);
      return a && { re: -a.re, im: -a.im };
    }
    case '+': {
      const a = ev(ast.a, t, env, err); const b = ev(ast.b, t, env, err);
      return a && b && cadd(a, b);
    }
    case '-': {
      const a = ev(ast.a, t, env, err); const b = ev(ast.b, t, env, err);
      return a && b && csub(a, b);
    }
    case 'mul':
    case '*': {
      const a = ev(ast.a, t, env, err); const b = ev(ast.b, t, env, err);
      return a && b && cmul(a, b);
    }
    case '/': {
      const a = ev(ast.a, t, env, err); const b = ev(ast.b, t, env, err);
      if (!a || !b) return null;
      const q = cdiv(a, b);
      if (!q) { err.hint = 'Division by zero at this t.'; return null; }
      return q;
    }
    case 'pow': {
      const a = ev(ast.a, t, env, err); const b = ev(ast.b, t, env, err);
      if (!a || !b) return null;
      const q = cpow(a, b);
      if (!q || !Number.isFinite(q.re) || !Number.isFinite(q.im)) {
        err.hint = 'That power is not a finite complex number at this t.';
        return null;
      }
      return q;
    }
    case 'call': {
      const a = ev(ast.arg, t, env, err);
      if (!a) return null;
      if (ast.name === 'exp') {
        const q = cexp(a);
        if (!q) { err.hint = 'exp ran off to infinity at this t.'; return null; }
        return q;
      }
      if (ast.name === 'sin') return csin(a);
      if (ast.name === 'cos') return ccos(a);
      if (ast.name === 'abs') return { re: Math.hypot(a.re, a.im), im: 0 };
      if (ast.name === 'arg') return { re: Math.atan2(a.im, a.re), im: 0 };
      if (ast.name === 'conj') return { re: a.re, im: -a.im };
      err.hint = `Unknown function ${ast.name}.`;
      return null;
    }
    default:
      err.hint = 'This formula could not be read.';
      return null;
  }
}

// env maps each variable name to a real number. t is in [0, 1).
export function evalPath(ast, t, env) {
  const err = { hint: '' };
  const z = ev(ast, Number(t) || 0, env || {}, err);
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) {
    return { ok: false, hint: err.hint || 'This t did not give a finite complex number.', z: null };
  }
  return { ok: true, z, hint: '' };
}

// A sensible slider span for a name the formula introduced.
export function rangeFor(name, value) {
  const n = String(name || '').toLowerCase();
  const v = Number.isFinite(value) ? value : 0;
  let min = -2;
  let max = 2;
  if (n === 'k' || n === 'n' || n === 'p') { min = 0; max = 8; }
  else if (n === 'r' || n === 's' || n === 'a' || n === 'b' || n.startsWith('r')) { min = 0; max = 2; }
  if (v < min) min = v;
  if (v > max) max = v;
  if (max <= min) max = min + 1;
  return { min, max };
}
