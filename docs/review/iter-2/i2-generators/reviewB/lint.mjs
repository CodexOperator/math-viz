import * as m from '../../../../../js/data/generators.js';
const PATS = {
  'plus-minus': /\+ [-−]/, 'minus-minus': /[-−] [-−]/, 'slash-neg': /\/[-−]/, 'minus-zero': /(^|[^\w.])[-−]0(?![.\d])/, 'unit-i': /(^|[^\d.\w\\√])1i\b/,
  'plus-zero-i': /[+-] 0i/, 'plus-0': /\+ 0(?![.\d\w])/, 'minus-0': /[-−] 0(?![.\d\w])/, 'zero-x': /(^|[^\d.\w])0[xy]/, 'one-x': /(^|[^\d.\w\\])1[xyrzt]\b/, 'one-dot': /(^|[^\d.\w])1 ?[·*] ?[A-Za-z\d(]/, 'dot-one': /[A-Za-z\d)] ?[·*] ?1(?![\d.])/,
  'over-one': /\/1(?![\d.\w])/, 'pow-one': /\^1(?![\d.])/, 'pow-zero': /\^0(?![\d.])/, 'e-i-0': /e\^\(i ?0\)/, 'double-space': /  /, 'paren-single-num': /\(\d+\)(?![\^\w(])/, 'minus-paren-neg': /\(-[\d.]+\)\(/,
  'sqrt1': /sqrt\(1\)/, 'unicode-minus-in-ascii': null,
  'plus-plus': /\+ \+/, 'dangling-op': /[+\-*/] ?[)]/, 'neg-exponent-unbracketed': /\^-/, 'ones-i': /\(1i\)|1 i\b/, 'i-one': /\bi1\b/,
};
const counts = {}; const ex = {};
const FIELDS = (c) => ({ statementText: c.statementText, answerText: c.answer.text, tex: c.answer.tex, statementTex: c.statement, cart: c.worked.cart, polar: c.worked.polar });
for (const id of m.FAMILIES) for (let s = 1; s <= 400; s++) {
  const c = m.generate(id, s); const F = FIELDS(c);
  for (const [fname, text] of Object.entries(F)) for (const [pn, re] of Object.entries(PATS)) { if (!re) continue;
    if (fname === 'statementTex' || fname === 'tex') { if (['double-space','plus-minus','minus-minus','slash-neg'].includes(pn) === false && !['minus-zero','unit-i','plus-zero-i','plus-0','minus-0','zero-x','one-x','over-one','pow-one','pow-zero','sqrt1','plus-plus'].includes(pn)) continue; }
    const mm = re.exec(text); if (mm) { const k = `${pn} | ${id} | ${fname}`; counts[k] = (counts[k] || 0) + 1; if (!ex[k]) ex[k] = `#${s}: ...${text.slice(Math.max(0, mm.index - 40), mm.index + 40).replace(/\n/g, ' ')}...`; } }
  if (/[^\x00-\x7f]/.test(c.statementText + c.answer.text)) { const k = 'non-ascii | ' + id; counts[k] = (counts[k] || 0) + 1; }
}
for (const [k, n] of Object.entries(counts).sort()) console.log(String(n).padStart(4), k, ' e.g. ', ex[k] || '');
console.log('families x fields with hits:', Object.keys(counts).length);
