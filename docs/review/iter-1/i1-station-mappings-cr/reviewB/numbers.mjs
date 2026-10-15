// Review B: recompute every displayed number independently (plain Math, hand formulas) and compare to the page.
import { dragHandle, clickChip, readText, settle, handleZ } from '../../../../../tests/interact/_helpers.mjs';

const C = (re, im) => ({ re, im });
const mulc = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const fmt = (x) => (Math.abs(x) < 5e-4 ? '0' : String(Number(x.toFixed(3))));
const closeTo = (a, b, t = 6e-4) => Math.abs(a - b) <= t;
const parseNum = (s) => Number(s.replace(/[−]/g, '-'));

// ---- mappings hand formulas (Cartesian) and direct complex evaluation (independent of both forms)
const direct = {
  'sq-plus-iz': (z) => { const z2 = mulc(z, z); const iz = C(-z.im, z.re); return C(z2.re + iz.re, z2.im + iz.im); },
  sq: (z) => mulc(z, z),
  'linear-i': (z) => C(-z.im, z.re - 2),
  recip: (z) => { const d = z.re * z.re + z.im * z.im; return C(z.re / d, -z.im / d); },
  conj: (z) => C(z.re, -z.im),
};
const cartUV = {
  'sq-plus-iz': (x, y) => [x * x - y * y - y, 2 * x * y + x],
  sq: (x, y) => [x * x - y * y, 2 * x * y],
  'linear-i': (x, y) => [-y, x - 2],
  recip: (x, y) => { const d = x * x + y * y; return [x / d, -y / d]; },
  conj: (x, y) => [x, -y],
};
const polarUV = {
  'sq-plus-iz': (r, t) => [r * r * Math.cos(2 * t) - r * Math.sin(t), r * r * Math.sin(2 * t) + r * Math.cos(t)],
  sq: (r, t) => [r * r * Math.cos(2 * t), r * r * Math.sin(2 * t)],
  'linear-i': (r, t) => [-r * Math.sin(t), r * Math.cos(t) - 2],
  recip: (r, t) => [Math.cos(t) / r, -Math.sin(t) / r],
  conj: (r, t) => [r * Math.cos(t), -r * Math.sin(t)],
};

function parseReadout(s) {
  // "z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3"
  const m = s.match(/u = (-?[\d.]+); v = (-?[\d.]+); polar: u = (-?[\d.]+); v = (-?[\d.]+)/);
  return m ? m.slice(1).map(Number) : null;
}
function parseCartStr(t) {
  const s = t.replace(/\s+/g, '');
  const m = s.match(/^(-?[\d.]+)?(?:([+-])([\d.]*)i)?$/) || null;
  if (s === 'i') return C(0, 1); if (s === '-i') return C(0, -1);
  if (/^-?[\d.]*i$/.test(s)) { const c = s.slice(0, -1); return C(0, c === '' ? 1 : c === '-' ? -1 : Number(c)); }
  if (m) return C(Number(m[1] ?? 0), m[2] ? (m[2] === '-' ? -1 : 1) * (m[3] === '' ? 1 : Number(m[3])) : 0);
  return null;
}

export default async function (page, ctx) {
  const { route, assert, log } = ctx;
  let fails = 0;
  const chk = (cond, msg) => { if (!cond) { fails++; log('MISMATCH ' + msg); } };
  if (route === 'mappings') {
    const pts = [[1, 1], [-1, 0.5], [0.5, -1.2], [-2, -2], [0, 1], [1.5, 0], [-0.3, 0.4], [3, -1], [-1, 0]];
    let n = 0;
    for (const id of ['sq-plus-iz', 'sq', 'linear-i', 'recip', 'conj']) {
      await clickChip(page, 'mappings-fn-' + id);
      for (let [x, y] of pts) {
        const zz = await dragHandle(page, 'mappings-zplane-z', { re: x, im: y }); x = zz.re; y = zz.im;
        const ro = await readText(page, '#mappings-readout');
        const got = parseReadout(ro);
        const r = Math.hypot(x, y), t = Math.atan2(y, x);
        const cu = cartUV[id](x, y), pu = polarUV[id](r, t), d = direct[id](C(x, y));
        chk(got && closeTo(got[0], cu[0]) && closeTo(got[1], cu[1]) && closeTo(got[2], pu[0]) && closeTo(got[3], pu[1]), `${id} z=${x},${y}: readout ${ro} vs cart ${cu} polar ${pu}`);
        chk(closeTo(cu[0], d.re, 1e-9) && closeTo(cu[1], d.im, 1e-9), `${id}: hand cart formula disagrees with direct at ${x},${y}`);
        // w in readout
        const wm = ro.match(/w = (.*?); u =/);
        const w = wm ? parseCartStr(wm[1]) : null;
        chk(w && closeTo(w.re, d.re) && closeTo(w.im, d.im), `${id} z=${x},${y}: w "${wm && wm[1]}" vs ${d.re},${d.im}`);
        n++;
        // the same-point footer
        await page.waitForTimeout(30);
      }
    }
    log(`mappings: ${n} (fn, z) combos checked`);
    // the explainer's value cells at 1 + i, k = -1, 0, 1
    await clickChip(page, 'mappings-fn-sq-plus-iz');
    await dragHandle(page, 'mappings-zplane-z', { re: -1, im: 1 });
    for (const k of [-1, 0, 1]) {
      await page.click(`#mappings-stairs-k${k < 0 ? 'm' + (-k) : k} button`).catch(async () => { await page.click(`[id^="mappings-stairs"][id$="${k}"] button`); });
      await settle(page, 3); await page.waitForTimeout(500);
      const tex = await page.evaluate(() => document.getElementById('mappings-ex-value-polar').dataset.tex);
      const note = await readText(page, '#mappings-step-note');
      const ro = await readText(page, '#mappings-readout');
      const same = await readText(page, '#mappings-ex-same');
      log(`z=-1+i k=${k}: ${note} | ${ro} | ${tex} | ${same.slice(0, 20)}`);
      chk(same.startsWith('same point: agree'), 'agree for k=' + k);
    }
  }
  if (route === 'cauchy-riemann') {
    const F = {
      exp: (x, y) => ({ ux: Math.exp(x) * Math.cos(y), uy: -Math.exp(x) * Math.sin(y), vx: Math.exp(x) * Math.sin(y), vy: Math.exp(x) * Math.cos(y) }),
      'sq-plus-z': (x, y) => ({ ux: 2 * x + 1, uy: -2 * y, vx: 2 * y, vy: 2 * x + 1 }),
      conj: () => ({ ux: 1, uy: 0, vx: 0, vy: -1 }),
      re: () => ({ ux: 1, uy: 0, vx: 0, vy: 0 }),
      abs2: (x, y) => ({ ux: 2 * x, uy: 2 * y, vx: 0, vy: 0 }),
      'const-u': () => ({ ux: 0, uy: 0, vx: 1, vy: 1 }),
    };
    const pts = [[0.5, 0.8], [1, 1], [0, 0], [-1, 0.5], [1.9, 0.1], [0.5, -0.8], [-1.5, -1.5], [2, 0], [0, 1.2]];
    let n = 0;
    for (const id of ['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u']) {
      await clickChip(page, 'cauchy-riemann-fn-' + id);
      for (let [x, y] of pts) {
        const zz = await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: x, im: y }); x = zz.re; y = zz.im;
        const j = F[id](x, y);
        const cell = async (k) => parseNum(await page.evaluate((k) => document.getElementById('cauchy-riemann-' + k).dataset.value, k));
        const got = { ux: await cell('ux'), uy: await cell('uy'), vx: await cell('vx'), vy: await cell('vy') };
        for (const k of ['ux', 'uy', 'vx', 'vy']) chk(closeTo(got[k], j[k]), `${id} z0=${x},${y} ${k}: page ${got[k]} vs hand ${j[k]}`);
        const A = C(0.5 * (j.ux + j.vy), 0.5 * (j.vx - j.uy)), B = C(0.5 * (j.ux - j.vy), 0.5 * (j.vx + j.uy));
        const absB = Math.hypot(B.re, B.im);
        const holds = Math.abs(j.ux - j.vy) < 1e-3 && Math.abs(j.uy + j.vx) < 1e-3;
        const ro = await readText(page, '#cauchy-riemann-readout');
        const mB = ro.match(/\|B\| = ([\d.]+)/);
        chk(mB && closeTo(Number(mB[1]), absB), `${id} z0=${x},${y}: |B| ${mB && mB[1]} vs ${absB}`);
        chk(ro.includes('CR holds: ' + (holds ? 'yes' : 'no')), `${id} z0=${x},${y}: holds ${holds} in "${ro}"`);
        const mA = ro.match(/^A = (.*?); \|B\|/);
        const Ap = mA ? parseCartStr(mA[1]) : null;
        chk(Ap && closeTo(Ap.re, A.re) && closeTo(Ap.im, A.im), `${id} z0=${x},${y}: A "${mA && mA[1]}" vs ${A.re},${A.im}`);
        if (holds) {
          const mf = ro.match(/f'\(z0\) = (.*?) \(u_x/);
          const fp = mf ? parseCartStr(mf[1]) : null;
          chk(fp && closeTo(fp.re, j.ux) && closeTo(fp.im, j.vx), `${id} z0=${x},${y}: f' "${mf && mf[1]}" vs ${j.ux},${j.vx}`);
        } else chk(ro.includes('does not exist'), `${id} z0=${x},${y}: not-exist wording`);
        const h1 = await page.evaluate(() => document.getElementById('cauchy-riemann-cr1').dataset.holds);
        const h2 = await page.evaluate(() => document.getElementById('cauchy-riemann-cr2').dataset.holds);
        chk(h1 === (Math.abs(j.ux - j.vy) < 1e-3 ? 'yes' : 'no') && h2 === (Math.abs(j.uy + j.vx) < 1e-3 ? 'yes' : 'no'), `${id} z0=${x},${y}: data-holds ${h1}/${h2}`);
        n++;
      }
    }
    log(`cauchy-riemann: ${n} (fn, z0) combos checked`);
  }
  assert(fails === 0, `${fails} mismatches`);
}
