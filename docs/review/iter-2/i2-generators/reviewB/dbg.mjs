import { texToAscii, tryEval } from './calc.mjs';
const t = String.raw`z = \dfrac{4 \pm \sqrt{-64}}{2} = 2 + 4i \text{ or } 2 - 4i`;
let s = t.replace(/\\text\{[^{}]*\}/g, ' ; ').replace(/\\dfrac|\\tfrac/g, '\\frac');
console.log(JSON.stringify(s));
console.log(JSON.stringify(texToAscii(s)));
