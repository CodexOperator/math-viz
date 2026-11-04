// Exam-form checker for Chapter 3 blanks. Spaces, stars, and the order of a
// sum do not matter. A product of factors can be written in either order.

function canon(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '')
    .replace(/\*/g, '')
    .replace(/\\,/g, '')
    .replace(/\\(left|right)/g, '')
    .replace(/[{}]/g, '')
    .replace(/_/g, '')
    .replace(/\((x0|y0|x|y|z0|z)(,(x0|y0|x|y))*\)/g, '');
}

function splitSum(s) {
  const terms = [];
  let depth = 0;
  let sign = '+';
  let buf = '';
  function flush() {
    if (!buf) return;
    const body = buf;
    buf = '';
    terms.push(sign === '-' ? `-${body}` : body);
    sign = '+';
  }
  for (const c of s) {
    if (c === '(') {
      depth += 1;
      buf += c;
    } else if (c === ')') {
      depth = Math.max(0, depth - 1);
      buf += c;
    } else if (depth === 0 && (c === '+' || c === '-') && buf) {
      flush();
      sign = c;
    } else if (depth === 0 && (c === '+' || c === '-') && !buf) {
      sign = c === '-' ? '-' : '+';
    } else {
      buf += c;
    }
  }
  flush();
  return terms;
}

function sumKey(s) {
  const terms = splitSum(s);
  if (terms.length < 2) return null;
  return terms.map((t) => (t.startsWith('-') ? t : `+${t}`)).sort().join('&');
}

function andKey(s) {
  if (!s.includes('and')) return null;
  return s.split('and').map((part) => sumKey(part) || part).sort().join('&&');
}

function factorNorm(fac) {
  const wrapped = fac.match(/^\((.*)\)(\^[0-9]+)?$/);
  if (!wrapped) return fac;
  const inner = sumKey(wrapped[1]) || wrapped[1];
  return `(${inner})${wrapped[2] || ''}`;
}

function factorKey(s) {
  if (s.includes('and')) return null;
  const factors = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '(') {
      let depth = 1;
      let j = i + 1;
      while (j < s.length && depth) {
        if (s[j] === '(') depth += 1;
        else if (s[j] === ')') depth -= 1;
        j += 1;
      }
      let fac = s.slice(i, j);
      if (s[j] === '^') {
        let k = j + 1;
        while (k < s.length && /[0-9]/.test(s[k])) k += 1;
        fac += s.slice(j, k);
        j = k;
      }
      factors.push(factorNorm(fac));
      i = j;
    } else {
      let j = i + 1;
      while (j < s.length && s[j] !== '(') j += 1;
      const chunk = s.slice(i, j);
      if (chunk) factors.push(chunk);
      i = j;
    }
  }
  if (factors.length < 2) return null;
  return factors.sort().join('*');
}

function same(a, b) {
  const left = canon(a);
  const right = canon(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const sumL = sumKey(left);
  const sumR = sumKey(right);
  if (sumL && sumL === sumR) return true;
  const andL = andKey(left);
  const andR = andKey(right);
  if (andL && andL === andR) return true;
  const facL = factorKey(left);
  const facR = factorKey(right);
  return !!(facL && facL === facR);
}

export function answersMatch(answer, accept, given) {
  const wants = [answer, ...(accept || [])];
  return wants.some((want) => same(want, given));
}
