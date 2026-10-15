// Review B: acceptance A2 and A3 executed literally, independent of the builder's script.
import { dragHandle, clickChip, readText, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';

const near = (a, b, t = 0.0011) => Math.abs(a - b) <= t;
const norm = (s) => s.replace(/[\s⁡-⁤​]/g, '');

async function cellInfo(page, id) {
  return page.evaluate((id) => { const e = document.getElementById(id); return e ? { text: e.textContent, tex: e.dataset.tex || '' } : null; }, id);
}
async function poll(page, fn, pred, tries = 30) { let v; for (let i = 0; i < tries; i++) { v = await fn(); if (pred(v)) return v; await settle(page, 2); } return v; }

export default async function (page, ctx) {
  const { route, assert, log, shot } = ctx;
  if (route === 'problem-2-1-1') {
    await settle(page, 4);
    let ro = await readText(page, '#mappings-readout');
    log('readout: ' + ro);
    assert(ro.includes('w = -1 + 3i') && ro.includes('u = -1') && ro.includes('v = 3'), 'A2 readout ' + ro);
    // wait for the refine pass (220 ms) so rendered text has MathML
    await page.waitForTimeout(600);
    const uc = await cellInfo(page, 'mappings-ex-u-cart');
    const up = await cellInfo(page, 'mappings-ex-u-polar');
    log('u-cart text: ' + uc.text.replace(/\s+/g, ' ').slice(0, 200));
    log('u-polar text: ' + up.text.replace(/\s+/g, ' ').slice(0, 200));
    const rc = norm(uc.text), rp = norm(up.text);
    assert(rc.includes('x') && rc.includes('y') && rc.includes('2'), 'u cart rendered has x,y,2: ' + rc);
    assert(rp.includes('r') && rp.includes('2θ'), 'u polar rendered has r and 2θ: ' + rp);
    const same = await readText(page, '#mappings-ex-same');
    log('same: ' + same);
    assert(same.startsWith('same point: agree'), 'same starts: ' + same);
    let z = await dragHandle(page, 'mappings-zplane-z', { re: 0, im: 1 });
    ro = await readText(page, '#mappings-readout');
    log('after drag to i: ' + ro);
    assert(ro.includes('w = -2'), 'A2 w=-2: ' + ro);
    await clickChip(page, 'mappings-fn-sq');
    ro = await readText(page, '#mappings-readout');
    log('after chip sq: ' + ro);
    assert(ro.includes('w = -1'), 'A2 chip sq w=-1: ' + ro);
    const r = await setSlider(page, 'mappings-morph', 1);
    const m = await page.evaluate(() => window.__mv.mappingsMorph);
    log('mappingsMorph=' + m + ' type ' + typeof m);
    assert(m === 1, 'A2 mappingsMorph === 1');
    await shot('A2-final');
  }
  if (route === 'problem-3-2-1') {
    await settle(page, 4);
    const holds = async (id) => page.evaluate((id) => document.getElementById(id).dataset.holds, id);
    const readout = () => readText(page, '#cauchy-riemann-readout');
    const parseF = (s) => { const m = s.match(/f'\(z0\) = (-?[\d.]+) ([+-]) ([\d.]+)i/); return m ? { re: Number(m[1]), im: (m[2] === '-' ? -1 : 1) * Number(m[3]) } : null; };
    let ro = await readout(); log('1: ' + ro);
    assert(await holds('cauchy-riemann-cr1') === 'yes' && await holds('cauchy-riemann-cr2') === 'yes', 'cr1/cr2 yes');
    assert(ro.includes('CR holds: yes') && ro.includes('|B| = 0.000'), 'readout CR holds / |B|: ' + ro);
    const f = parseF(ro); assert(f && near(f.re, 1.149) && near(f.im, 1.183), 'f prime ' + JSON.stringify(f));
    log('cr1: ' + await readText(page, '#cauchy-riemann-cr1'));
    log('cr2: ' + await readText(page, '#cauchy-riemann-cr2'));
    await shot('A3-exp');
    await clickChip(page, 'cauchy-riemann-fn-abs2');
    let z = await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 1, im: 1 });
    log('z0 = ' + JSON.stringify(z));
    ro = await readout(); log('2: ' + ro);
    const h1 = await holds('cauchy-riemann-cr1'), h2 = await holds('cauchy-riemann-cr2');
    assert(h1 === 'no' || h2 === 'no', 'some no');
    assert(ro.includes('A = 1 - i') && ro.includes('|B| = 1.414') && ro.includes('does not exist'), 'abs2 at 1+i: ' + ro);
    await shot('A3-abs2');
    z = await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0, im: 0 });
    ro = await readout(); log('3: ' + ro);
    assert(ro.includes('|B| = 0.000') && ro.includes("f'(z0) = 0"), 'abs2 at 0: ' + ro);
    await clickChip(page, 'cauchy-riemann-fn-re');
    ro = await readout(); log('4: ' + ro);
    const hh1 = await holds('cauchy-riemann-cr1'), hh2 = await holds('cauchy-riemann-cr2');
    assert(ro.includes('|B| = 0.5') && (hh1 === 'no' || hh2 === 'no'), 're: ' + ro + ' ' + hh1 + hh2);
    await clickChip(page, 'cauchy-riemann-fn-const-u');
    const cs = await readText(page, '#cauchy-riemann-const-status');
    log('const-status: ' + cs);
    assert(cs.includes("f' = 0") && cs.includes('constant'), 'const status');
    await page.click('#cauchy-riemann-paths'); await settle(page, 4); await page.waitForTimeout(500);
    let sm = await readText(page, '#cauchy-riemann-ex-same'); log('same(const-u): ' + sm);
    assert(sm.startsWith('same point: differ'), 'same differ: ' + sm);
    await clickChip(page, 'cauchy-riemann-fn-exp');
    await page.waitForTimeout(500);
    sm = await poll(page, () => readText(page, '#cauchy-riemann-ex-same'), (t) => t.startsWith('same point: agree'));
    log('same(exp): ' + sm);
    assert(sm.startsWith('same point: agree'), 'same agree: ' + sm);
    await shot('A3-paths');
  }
}
