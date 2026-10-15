// Independent reviewer script: follows acceptance A2, A3, A5 literally (not the builder's script).
import { readText, setSlider, clickChip, settle, dragHandleAround, handleZ, parseCart } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { route, assert, shot, log } = ctx;
  if (route === 'problem-1-4-2') {
    await page.waitForSelector('#roots-list li');
    const ro = await readText(page, '#roots-readout');
    log('readout: ' + ro);
    assert(ro.includes('c = -16'), 'readout c = -16');
    assert(ro.includes('|c|^(1/n) = 2'), 'readout |c|^(1/n) = 2');
    const want = ['1.414 + 1.414i', '-1.414 + 1.414i', '-1.414 - 1.414i', '1.414 - 1.414i'];
    for (let k = 0; k < 4; k++) {
      const t = await readText(page, `#roots-root-${k}`);
      log(`root ${k}: ${t}`);
      assert(t.includes(want[k]), `#roots-root-${k} has ${want[k]}`);
    }
    assert((await readText(page, '#roots-root-0')).includes('pi/4'), 'root-0 has pi/4');
    assert((await readText(page, '#roots-root-1')).includes('3pi/4'), 'root-1 has 3pi/4');
    // stricter: "pi/4" should be a whole token in root 0 (not just substring of 3pi/4, 5pi/4, 7pi/4)
    const t0 = await readText(page, '#roots-root-0');
    assert(/(^|[^0-9])pi\/4/.test(t0), 'root-0 has bare pi/4: ' + t0);
    const all = await page.$$eval('#roots-list li', (e) => e.length);
    assert(all === 4, 'four li in #roots-list (descendant count), got ' + all);
    await page.evaluate(() => { location.hash = '#problem-1-4-1'; });
    await page.waitForTimeout(600);
    let lis = await page.$$eval('#roots-list li', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    log('1.4.1 lis: ' + JSON.stringify(lis));
    assert(lis.length === 5, 'five li, got ' + lis.length);
    assert(lis[1].includes('0.309 + 0.951i'), 'root-1 0.309 + 0.951i');
    assert((await readText(page, '#roots-root-1')).includes('0.309 + 0.951i'), '#roots-root-1');
    assert((await readText(page, '#roots-root-2')).includes('-0.809 + 0.588i'), '#roots-root-2');
    assert(lis.filter((t) => t.includes('primitive')).length === 4, 'exactly four primitive, got ' + lis.filter((t) => t.includes('primitive')).length);
    await setSlider(page, 'roots-n', 6);
    lis = await page.$$eval('#roots-list li', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    log('n=6 lis: ' + JSON.stringify(lis));
    assert(lis.length === 6, 'six li');
    assert(lis.filter((t) => t.includes('primitive')).length === 2, 'n = 6: exactly two primitive, got ' + lis.filter((t) => t.includes('primitive')).length);
    // global li check, in case the verifier uses plain 'li'
    const g = await page.$$eval('#view li', (els) => els.filter((e) => e.textContent.includes('primitive')).length);
    log('global #view li containing primitive: ' + g);
  }
  if (route === 'problem-1-4-3') {
    await page.waitForSelector('#roots-quadratic-readout');
    let q = await readText(page, '#roots-quadratic-readout');
    log('quadratic: ' + q);
    for (const s of ['(z - 2)^2 = -9', '3i', '2 + 3i', '2 - 3i']) assert(q.includes(s), `"${s}" in readout`);
    // set #roots-qc to 8 via real change event
    await page.evaluate(() => { const e = document.getElementById('roots-qc'); e.value = '8'; e.dispatchEvent(new Event('change', { bubbles: true })); });
    await settle(page, 3);
    q = await readText(page, '#roots-quadratic-readout');
    log('after qc=8: ' + q);
    assert(q.includes('(z - 2)^2 = -4'), '(z - 2)^2 = -4');
    assert(q.includes('2 + 2i'), '2 + 2i');
    // also with keyboard-typed fill (input+change)
    await page.fill('#roots-qc', '13'); await settle(page, 3);
    q = await readText(page, '#roots-quadratic-readout');
    assert(q.includes('2 + 3i') && q.includes('(z - 2)^2 = -9'), 'back at 13: ' + q);
    await page.fill('#roots-qc', '8'); await settle(page, 3);
    q = await readText(page, '#roots-quadratic-readout');
    assert(q.includes('(z - 2)^2 = -4') && q.includes('2 + 2i') && q.includes('2 - 2i'), 'fill 8: ' + q);
  }
  if (route === 'problem-2-2-2') {
    await page.waitForSelector('#principal-root-readout');
    const r = await readText(page, '#principal-root-readout');
    log('readout: ' + r);
    for (const s of ['w = 2i', 'Arg w = 1.571', 'pi/4', '= 1 + i']) assert(r.includes(s), `"${s}" in readout`);
    await page.waitForTimeout(500);
    const same = await readText(page, '#principal-root-ex-same');
    log('same: ' + same);
    assert(same.startsWith('same point: agree'), 'ex-same starts "same point: agree"');
    const samples = [];
    await dragHandleAround(page, 'principal-root-plane-w', { radius: 2, startAngle: Math.PI / 2, turns: 1, steps: 48 }, async (pg, angle, i) => {
      const w = await handleZ(pg, 'principal-root-plane-w');
      const t = await readText(pg, '#principal-root-readout');
      const m = /Arg w = (-?\d+(?:\.\d+)?)/.exec(t);
      const rootStr = t.split(' = ').pop();
      const root = parseCart(rootStr);
      // independent expected principal root from w
      const A = Math.atan2(w.im, w.re), R = Math.sqrt(Math.hypot(w.re, w.im));
      const exp = { re: R * Math.cos(A / 2), im: R * Math.sin(A / 2) };
      samples.push({ i, angle, w, arg: m ? Number(m[1]) : NaN, root, exp, t });
    });
    log('samples ' + samples.length);
    let jumps = 0, maxOther = 0, mism = 0;
    for (let i = 1; i < samples.length; i++) {
      const d = Math.hypot(samples[i].root.re - samples[i - 1].root.re, samples[i].root.im - samples[i - 1].root.im);
      if (d > 1.5) jumps++; else maxOther = Math.max(maxOther, d);
    }
    for (const s of samples) {
      const e = Math.hypot(s.root.re - s.exp.re, s.root.im - s.exp.im);
      if (e > 0.01) { mism++; log('MISMATCH ' + JSON.stringify(s)); }
    }
    log(`jumps=${jumps} maxOther=${maxOther.toFixed(3)} mismatches=${mism}`);
    assert(jumps === 1, 'exactly one jump >1.5, got ' + jumps);
    assert(maxOther < 0.4, 'others < 0.4, got ' + maxOther);
    assert(mism === 0, 'all readout roots match independent principal root');
    const nearN = samples.filter((s) => Math.abs(s.arg + 3.0) < 0.15), nearP = samples.filter((s) => Math.abs(s.arg - 3.0) < 0.15);
    log(`near -3: ${nearN.length}, near +3: ${nearP.length}`);
    assert(nearN.length > 0 && nearN.every((s) => s.root.im < 0), 'near Arg w = -3 root im negative');
    assert(nearP.length > 0 && nearP.every((s) => s.root.im > 0), 'near Arg w = +3 root im positive');
    log('sweep readout after drag: ' + (await readText(page, '#principal-root-sweep-readout')));
    await clickChip(page, 'principal-root-sweep');
    const red = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    log('reduced=' + red);
    if (red) { for (let i = 0; i < 12; i++) await clickChip(page, 'principal-root-sweep'); }
    await page.waitForFunction(() => document.querySelector('#principal-root-sweep-readout').textContent.includes('jumps'), null, { timeout: 12000 });
    log('sweep readout: ' + (await readText(page, '#principal-root-sweep-readout')));
    assert((await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'sweep readout has jumps');
  }
}
