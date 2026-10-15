import * as P from '../../../../../js/core/parse.js';
const cases = ['z +', 'foo(z)', '(z+)', 'sin(z+)', '(z*)', 'z^(2+)', ')(', 'z)', '2z)', '(z))', '()', '(', 'z)(', 'sin z', 'sin', 'Z', 'Sin(z)', 'z2', '2..5', '1.2.3', '.', '|z|', '√z', 'z​+1', 'z ́', '😀', 'z+\ud83d', 'z × 2', 'z − 1', 'z²', '', '   ', 'z^', 'z^^2', '*z', 'z**2', 'z***2', 'a', 'theta', 'θ', 'πz', 'abs(z', 'abs()', '1e5', 'z.', '1/', '/z', 'z/ /z', 'z++', 'z--', 'z+-', 'e^', 'i i', '2 3', 'z 2', 'x(y', 'conjz', 'arg z', 'Arg(z)(', 'z\n+1', 'x'.repeat(401), '('.repeat(100) + 'z' + ')'.repeat(100), '-'.repeat(300)+'z', 'z^'.repeat(100)+'z'];
for (const c of cases) {
  try { const a = P.parse(c); console.log(JSON.stringify(c.length > 40 ? c.slice(0, 12) + '...' : c).padEnd(22), 'OK', P.toTex(c).slice(0, 60)); }
  catch (e) {
    const isPE = e instanceof P.ParseError;
    console.log(JSON.stringify(c.length > 40 ? c.slice(0, 12) + '...' : c).padEnd(22), isPE ? 'PE' : 'NON-PE ' + e.constructor.name, `pos=${e.position} len=${e.length}`, JSON.stringify(e.message).slice(0, 160));
    if (isPE) { if (!(Number.isInteger(e.position) && e.position >= 0 && e.position <= c.length)) console.log('   !! position out of range'); if (!(e.length >= 1)) console.log('   !! bad length'); if (/[\ud800-\udfff]/.test(e.message) && !/😀/.test(e.message)) console.log('   !! lone surrogate in message'); }
  }
}
// non-string
for (const bad of [undefined, null, 5, {}, []]) { try { P.compile(bad); console.log('compile OK?!', bad); } catch (e) { console.log('non-string', JSON.stringify(bad), e instanceof P.ParseError ? 'PE' : 'NON-PE ' + e.constructor.name); } }
