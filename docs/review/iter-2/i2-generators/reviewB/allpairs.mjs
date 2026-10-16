import * as m from '../../../../../js/data/generators.js';
import { Z, mul, div, near, evalExpr, texToAscii } from './calc.mjs';
let n = 0, bad = 0;
for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) for (let c = -5; c <= 5; c++) for (let d = -5; d <= 5; d++) {
  if ((c === 0 && d === 0) || (a === 0 && b === 0)) continue; n++;
  const z1 = Z(a, b), z2 = Z(c, d); const card = m.solve('1.1.1', { z1, z2 }); const P = mul(z1, z2), Q = div(z1, z2);
  const t = /^z1 z2 = (.*); z1\/z2 = (.*)$/.exec(card.answer.text);
  const mm = /^z_1z_2 = (.*), *\\qquad *\\dfrac\{z_1\}\{z_2\} = (.*)$/.exec(card.answer.tex);
  let okk = t && mm;
  if (okk) { try { okk = near(evalExpr(t[1]), P) && near(evalExpr(t[2]), Q) && near(evalExpr(texToAscii(mm[1])), P) && near(evalExpr(texToAscii(mm[2])), Q); } catch (e) { okk = false; } }
  // the cart worked prose: last "= A - Bi." exact quotient appears
  const w = card.worked.cart; const q = /= ([^=]*?)\. In \(x, y\)/.exec(w); if (okk && q) { try { okk = near(evalExpr(q[1]), Q); } catch (e) { okk = false; } } else okk = false;
  if (!okk) { bad++; if (bad < 6) console.log('BAD', a, b, c, d, card.answer.text, '|', card.answer.tex, '|', w); }
}
console.log('1.1.1 all pairs', n, 'bad', bad);
