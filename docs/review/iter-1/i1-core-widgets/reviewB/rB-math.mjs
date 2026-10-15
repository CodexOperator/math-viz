import { exactPi, stepText, homeStep, argReadout, fmtDec } from '../../../../../js/core/staircase.js';
const PI = Math.PI; let bad = 0; const fail = (m) => { bad++; console.log('FAIL', m); };
const parse = (s) => { // "-14π/3" | "π" | "0" | "2π" -> number
  if (s === '0') return 0; const m = s.match(/^(-?)(\d*)π(?:\/(\d+))?$/); if (!m) return NaN;
  return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : +m[2]) * PI / (m[3] ? +m[3] : 1);
};
// 1. every p*pi/q (q<=12, |p|<=240) is labelled, and the label parses back to the same number
let n = 0;
for (let q = 1; q <= 12; q++) for (let p = -240; p <= 240; p++) { if (p === 0) continue; const x = p * PI / q; const s = exactPi(x); n++; if (!s) { fail(`no label for ${p}pi/${q}`); continue; } if (Math.abs(parse(s) - x) > 1e-9) fail(`${p}pi/${q} -> ${s} = ${parse(s)}`); }
console.log('labelled', n, 'multiples of pi/q');
// 2. random decimals are never mislabelled: if a label is returned it must parse back within 1e-9
let labelled = 0; for (let i = 0; i < 200000; i++) { const x = (Math.random() - 0.5) * 100; const s = exactPi(x); if (s) { labelled++; if (Math.abs(parse(s) - x) > 1e-9) fail(`mislabel ${x} -> ${s}`); } }
console.log('random decimals labelled (should be ~0):', labelled);
// 3. stepText: dec equals independent toFixed; exact text value equals total; ASCII minus only
const homes = [2 * PI / 3, -PI / 3, 0, PI / 2, PI, 0.7, -2.5, Math.atan2(Math.sqrt(3), -1), Math.atan2(4, -1), Math.atan2(-2, 3)];
for (const h of homes) for (let k = -12; k <= 12; k++) {
  const r = stepText(h, k), tot = h + 2 * PI * k;
  const want = (Math.abs(tot) < 5e-4 ? '0' : String(+tot.toFixed(3)));
  if (r.dec !== want && !(Math.abs(tot) < 5e-4)) fail(`dec ${h} k=${k}: ${r.dec} vs ${want}`);
  const eq = r.text.split(' = ');
  if (eq.length === 2 && Math.abs(parse(eq[1]) - tot) > 1e-9) fail(`exact tail ${r.text} vs ${tot}`);
  if (/[−–—]/.test(r.text)) fail('non-ascii minus in ' + r.text);
  if (!r.full.startsWith(r.text)) fail('full/text ' + r.full);
}
// 4. Arg values the review problems use (independently computed by hand)
const Arg = (re, im) => { const t = Math.atan2(im, re); return t; };
const cases = [
  ['1.3.1 Arg(-1+i sqrt3) = 2pi/3', Arg(-1, Math.sqrt(3)), '2π/3'],
  ['1.3.2 (sqrt3+i)^10: 10*(pi/6)=5pi/3 -> home -pi/3', homeStep(10 * Math.atan2(1, Math.sqrt(3))).theta, '-π/3'],
  ['2.2.2 Arg(2i) = pi/2', Arg(0, 2), 'π/2'],
  ['1.4.1 Arg(1) = 0', Arg(1, 0), '0'],
  ['Arg(-16) = pi (1.4.2)', Arg(-16, 0), 'π'],
  ['Arg(-1) = pi', Arg(-1, 0), 'π'],
  ['Arg(-1 - 0i) via homeStep(-pi) = pi', homeStep(-PI).theta, 'π'],
  ['1-i: Arg = -pi/4', Arg(1, -1), '-π/4'],
];
for (const [name, x, want] of cases) { const got = exactPi(x); console.log((got === want ? 'ok   ' : 'FAIL ') + name + ' -> ' + got); if (got !== want) bad++; }
console.log(argReadout('arg z', Arg(-1, Math.sqrt(3))), '|', argReadout('arg z', homeStep(5 * PI / 3).theta));
console.log(bad ? bad + ' FAILURES' : 'ALL OK'); process.exit(bad ? 1 : 0);
