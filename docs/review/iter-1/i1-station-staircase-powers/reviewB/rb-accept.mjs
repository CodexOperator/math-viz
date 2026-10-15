// Review B throwaway: independent acceptance checks for i1-station-staircase-powers (A2, A3, A4), literal to the goal text.
import { dragHandle, dragHandleAround, clickChip, readText, setSlider, settle, parseCart } from '/home/user/math-viz/tests/interact/_helpers.mjs';

const PI = Math.PI;
const parse = (t) => {
  const m = /z = ([^;]+); Arg z = (-?\d+(?:\.\d+)?)[^;]*; laps = (-?\d+)/.exec(t);
  if (!m) throw new Error('cannot parse readout: ' + t);
  return { z: parseCart(m[1]), arg: Number(m[2]), laps: Number(m[3]) };
};

export default async function (page, ctx) {
  const { assert, log } = ctx;
  if (ctx.route === 'staircase') {
    await page.waitForSelector('#staircase-plane-z');
    await settle(page, 3);
    const ro = () => readText(page, '#staircase-readout');
    // ---- A2 literal: radius 1.5, startAngle 0, turns 1, steps 48
    const rec = [];
    await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, startAngle: 0, turns: 1, steps: 48 }, async () => rec.push(parse(await ro())));
    const jumps = [];
    for (let i = 1; i < rec.length; i++) if (Math.abs(rec[i].arg - rec[i - 1].arg) > PI) jumps.push(i);
    assert(jumps.length === 1, `A2 exactly one |dArg| > pi, got ${jumps.length}`);
    const j = jumps[0];
    assert(rec[j - 1].arg > 3.0 && rec[j].arg < -3.0, `A2 jump ${rec[j - 1].arg} -> ${rec[j].arg}`);
    assert(rec[0].arg < 0.2 && Math.abs(rec[0].arg) < 0.2, `A2 start ~0: ${rec[0].arg}`);
    assert(Math.abs(rec[rec.length - 1].arg) < 0.2, `A2 rises back to ~0 at the end: ${rec[rec.length - 1].arg}`);
    let maxOther = 0, maxDz = 0;
    for (let i = 1; i < rec.length; i++) {
      if (i !== j) maxOther = Math.max(maxOther, Math.abs(rec[i].arg - rec[i - 1].arg));
      maxDz = Math.max(maxDz, Math.hypot(rec[i].z.re - rec[i - 1].z.re, rec[i].z.im - rec[i - 1].z.im));
    }
    assert(maxOther < 0.4, `A2 other |dArg| max ${maxOther}`);
    assert(maxDz < 0.3, `A2 max point step ${maxDz}`);
    // independent Arg recomputation from the displayed z (principal)
    let worst = 0;
    for (const r of rec) { const want = Math.atan2(r.z.im, r.z.re); const d = Math.abs(((r.arg - want + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI); worst = Math.max(worst, d); }
    assert(worst < 0.01, `A2 displayed Arg disagrees with atan2 of displayed z by ${worst}`);
    // rises monotonically either side of the jump
    for (let i = 1; i < j; i++) assert(rec[i].arg > rec[i - 1].arg, `A2 Arg rises before jump (step ${i})`);
    for (let i = j + 1; i < rec.length; i++) assert(rec[i].arg > rec[i - 1].arg, `A2 Arg rises after jump (step ${i})`);
    let t = await ro();
    assert(t.includes('laps = 1'), `A2 laps = 1: ${t}`);
    log(`A2 lap: jump at step ${j}: ${rec[j - 1].arg} -> ${rec[j].arg}; max other ${maxOther.toFixed(3)}; max dz ${maxDz.toFixed(3)}; atan2 gap ${worst.toExponential(2)}`);
    // walk
    await clickChip(page, 'staircase-walk');
    await page.waitForFunction(() => /laps = 2/.test(document.getElementById('staircase-readout').textContent), null, { timeout: 15000 });
    log('A2 walk reached laps = 2');
    await page.waitForFunction(() => document.getElementById('staircase-walk').textContent === 'Walk one lap', null, { timeout: 15000 });
    // seam to 0
    await setSlider(page, 'staircase-seam', 0);
    const rec2 = [];
    await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, startAngle: -0.5, turns: 1 / (2 * PI), steps: 48 }, async () => rec2.push(parse(await ro())));
    const big = [];
    for (let i = 1; i < rec2.length; i++) if (Math.abs(rec2[i].arg - rec2[i - 1].arg) > 5) big.push(i);
    assert(big.length === 1, `A2 seam 0: exactly one |d| > 5, got ${big.length}`);
    // and the old place (negative real axis) no longer jumps with seam at 0
    await setSlider(page, 'staircase-seam', -PI);
    // ---- clockwise lap, other radius (extra): laps should go down by one, one jump of the opposite sign
    const rec3 = [];
    const before = parse(await ro()).laps;
    await dragHandleAround(page, 'staircase-plane-z', { radius: 0.8, startAngle: 1.0, turns: -1, steps: 60 }, async () => rec3.push(parse(await ro())));
    const jumps3 = [];
    for (let i = 1; i < rec3.length; i++) if (Math.abs(rec3[i].arg - rec3[i - 1].arg) > PI) jumps3.push(i);
    assert(jumps3.length === 1, `extra clockwise: one jump, got ${jumps3.length}`);
    assert(rec3[jumps3[0] - 1].arg < -3 && rec3[jumps3[0]].arg > 3, `extra clockwise jump direction`);
    const after = parse(await ro()).laps;
    assert(after === before - 1, `extra clockwise laps ${before} -> ${after}`);
    log(`extra clockwise ok: laps ${before} -> ${after}`);
    // ---- A3 literal
    await dragHandle(page, 'staircase-plane-z', { re: -1, im: 1.7320508 });
    await settle(page, 3);
    const li = await page.evaluate(() => ({
      n: document.querySelectorAll('#staircase-stairs li').length,
      home: [...document.querySelectorAll('#staircase-stairs li.is-home')].map((e) => e.textContent),
      k1: document.querySelector('#staircase-stairs li[data-k="1"]')?.textContent,
      km1: document.querySelector('#staircase-stairs li[data-k="-1"]')?.textContent,
      arg: document.getElementById('staircase-stairs-arg')?.textContent,
    }));
    assert(li.n === 7, `A3 7 li, got ${li.n}`);
    assert(li.home.length === 1 && li.home[0].includes('2π/3') && li.home[0].includes('Arg'), `A3 home ${JSON.stringify(li.home)}`);
    assert(li.k1.includes('8π/3'), `A3 k1 ${li.k1}`);
    assert(li.km1.includes('-4π/3'), `A3 k-1 ${li.km1}`);
    assert(/Arg z = 2\.094/.test(li.arg), `A3 arg line ${li.arg}`);
    log(`A3 list: ${JSON.stringify(li)}`);
    // sum: drag z1 and z2 straight to {-1, 1}, no pre-drags
    await dragHandle(page, 'staircase-sumplane-z1', { re: -1, im: 1 });
    await dragHandle(page, 'staircase-sumplane-z2', { re: -1, im: 1 });
    await settle(page, 3);
    const s = await readText(page, '#staircase-sum-readout');
    assert(s.includes('4.712') && s.includes('-1.571') && s.includes('2π'), `A3 sum readout: ${s}`);
    log(`A3 sum: ${s}`);
    // independent: z1=z2=-1+i -> Arg = 3pi/4 each -> sum 3pi/2 = 4.712; product -2i -> Arg -pi/2
    log('A3 ok');
  } else if (ctx.route === 'powers' || ctx.route === 'problem-1-3-2') {
    await page.waitForSelector('#powers-plane-z');
    await settle(page, 3);
    let t = await readText(page, '#powers-readout');
    for (const w of ['512 - 886.81', '|z|^n = 1024', 'n*theta = 5.236', 'home step = -1.047']) assert(t.includes(w), `A4 readout lacks "${w}": ${t}`);
    const same = await readText(page, '#powers-ex-same');
    assert(same.startsWith('same point: agree'), `A4 same: ${same}`);
    await clickChip(page, 'powers-report-home');
    const ang = await readText(page, '#powers-angle');
    assert(ang.includes('-pi/3'), `A4 angle text: ${ang}`);
    await setSlider(page, 'powers-n', 2);
    t = await readText(page, '#powers-readout');
    assert(t.includes('2 + 3.464i'), `A4 n=2: ${t}`);
    await setSlider(page, 'powers-n', 10);
    await clickChip(page, 'powers-cartesian-toggle');
    const lines = await page.evaluate(() => {
      const root = document.getElementById('powers-cartesian');
      return { vis: root && root.offsetParent !== null, li: root ? root.querySelectorAll('li').length : -1, text: root ? root.innerText : '' };
    });
    assert(lines.vis && lines.li >= 9, `A4 cartesian chain lines: ${lines.li}`);
    log(`A4 ok (${ctx.route}); readout=${t.slice(0, 60)}; angle="${ang}"; chain lines=${lines.li}`);
    log(`chain:\n${lines.text}`);
  }
}
