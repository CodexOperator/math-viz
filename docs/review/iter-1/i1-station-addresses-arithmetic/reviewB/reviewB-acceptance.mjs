// Review B throwaway script: runs the acceptance "how" text for A2 and A4 literally, plus extra probes.
//   node tools/smoke.mjs --route problem-1-3-1 --script <this> --dark --out <dir>
//   node tools/smoke.mjs --route problem-1-1-1 --script <this> --dark --out <dir>
import { dragHandle, clickChip, readText, settle, nums, parseCart, handleZ } from '../../../../../tests/interact/_helpers.mjs';

const val = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? el.value : null; }, sel);

async function typeAndChange(page, id, text) {
  // real keyboard: focus, select all, type, then Tab (which fires change), like a student would
  const loc = page.locator('[id="' + id + '"]');
  await loc.scrollIntoViewIfNeeded();
  await loc.click({ clickCount: 3 });
  await page.keyboard.press('Control+A');
  await page.keyboard.type(text);
  await page.keyboard.press('Tab');
  await settle(page, 4);
}

async function typeChangeEvents(page, id, text) {
  // exactly what the acceptance says: (change events)
  await page.evaluate(({ id, text }) => {
    const el = document.getElementById(id);
    el.value = text;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { id, text });
  await settle(page, 4);
}

export default async function (page, ctx) {
  const { route, assert, log, shot } = ctx;
  const ok = (cond, msg) => { log((cond ? 'PASS ' : 'FAIL ') + msg); assert(cond, msg); };
  const has = async (sel, ...subs) => { const t = await readText(page, sel); for (const s of subs) ok(t.includes(s), `${sel} has ${JSON.stringify(s)} (text: ${JSON.stringify(t.slice(0, 160))})`); return t; };

  if (route === 'problem-1-3-1') {
    await settle(page, 4);
    // ---- A2 literal ----
    await has('#addresses-readout', '|z| = 2', '2.094', '2pi/3');
    await has('#addresses-ex-theta-polar', '2π');
    const same = await readText(page, '#addresses-ex-same');
    ok(same.startsWith('same point: agree'), `#addresses-ex-same starts "same point: agree" (text: ${JSON.stringify(same)})`);
    await shot('a2-start');

    const fin = await dragHandle(page, 'addresses-plane-z', { re: 2, im: 1 });
    log('drag landed at ' + JSON.stringify(fin));
    await has('#addresses-readout', '2.236', '0.464');
    const x = parseFloat(await val(page, '#addresses-x'));
    const r = parseFloat(await val(page, '#addresses-r'));
    ok(Math.abs(x - 2) <= 0.05, `#addresses-x value ${x} within 2 +- 0.05`);
    ok(Math.abs(r - 2.236) <= 0.01, `#addresses-r value ${r} within 2.236 +- 0.01`);
    const same2 = await readText(page, '#addresses-ex-same');
    ok(same2.startsWith('same point: agree'), `after drag: ${same2}`);
    await shot('a2-after-drag');

    await typeChangeEvents(page, 'addresses-x', '-16');
    await typeChangeEvents(page, 'addresses-y', '0');
    await has('#addresses-readout', 'Arg z = 3.142', 'pi');
    log('after typing readout: ' + (await readText(page, '#addresses-readout')));
    await shot('a2-typed-m16');

    // ---- extras: real keyboard path, wrap note, exact-values typing ----
    await clickChip(page, 'addresses-preset-m1-sqrt3i');
    await typeAndChange(page, 'addresses-x', 'sqrt(3)');
    await typeAndChange(page, 'addresses-y', '1');
    const ro = await readText(page, '#addresses-readout');
    ok(/z = 1\.732 \+ i; \|z\| = 2; Arg z = 0\.524 \(pi\/6\)/.test(ro), 'typed sqrt(3), 1 -> ' + ro);
    await typeAndChange(page, 'addresses-theta', '8pi/3');
    const note = await readText(page, '#addresses-note');
    log('wrap note: ' + note);
    ok(/home step/i.test(note), 'typing 8pi/3 shows the home-step note');
    log('readout after 8pi/3: ' + (await readText(page, '#addresses-readout')));
    // negative r refused
    await typeAndChange(page, 'addresses-r', '-3');
    log('negative r note: ' + (await readText(page, '#addresses-note')));
    // garbage
    await typeAndChange(page, 'addresses-x', 'abc(');
    log('garbage note: ' + (await readText(page, '#addresses-note')));
    return;
  }

  if (route === 'arithmetic') {
    await settle(page, 4);
    // ---- A5: ctx.shot("add") and ctx.shot("mul") ----
    await clickChip(page, 'arithmetic-mode-add');
    await settle(page, 6);
    const planAdd = await page.evaluate(() => JSON.parse(JSON.stringify(window.__mv.arithmetic.plan())));
    log('add prims: ' + planAdd.prims.map((p) => p.id).join(','));
    const st = await page.evaluate(() => window.__mv.arithmetic.state());
    log('add state: ' + JSON.stringify(st));
    await has('#arithmetic-readout', '2 + 2i');
    // headings in the explainer
    const heads = await page.evaluate(() => [...document.querySelectorAll('#arithmetic-ex-table th')].map((e) => e.textContent.trim()).slice(0, 8));
    log('add explainer headings/cols: ' + JSON.stringify(heads));
    await shot('add');

    await clickChip(page, 'arithmetic-mode-mul');
    await settle(page, 6);
    const planMul = await page.evaluate(() => JSON.parse(JSON.stringify(window.__mv.arithmetic.plan())));
    log('mul prims: ' + planMul.prims.map((p) => p.id + (p.type === 'arc' ? `[${p.from.toFixed(3)}->${p.to.toFixed(3)} r${p.radiusPx.toFixed(1)}]` : '')).join(','));
    await has('#arithmetic-readout', '5 + 14i');
    const t = await readText(page, '#arithmetic-ex-table');
    ok(t.includes('Polar (spin-and-stretch)'), 'explainer heading "Polar (spin-and-stretch)" present');
    await shot('mul');
    // wrap-note case: z2 squared (z1 = z2 = -1 + 4i)
    return;
  }

  if (route === 'problem-1-1-1') {
    await settle(page, 4);
    // ---- A4 literal ----
    await has('#arithmetic-readout', '5 + 14i', '14.866');
    const same = await readText(page, '#arithmetic-ex-same');
    ok(same.startsWith('same point: agree'), `#arithmetic-ex-same starts "same point: agree" (text: ${JSON.stringify(same)})`);
    await shot('a4-mul');

    await clickChip(page, 'arithmetic-mode-div');
    const rd = await readText(page, '#arithmetic-readout');
    log('div readout: ' + rd);
    ok(rd.includes('-0.647'), 'div readout includes literal "-0.647"');
    const lit = rd.includes('-0.588');
    log('literal "-0.588" present? ' + lit + ' ; nums = ' + JSON.stringify(nums(rd)) + ' ; parseCart(result part) = ' + JSON.stringify(parseCart(rd.split(';')[0].replace('result = ', ''))));
    ok(nums(rd).some((n) => Math.abs(n + 0.588) < 5e-4), 'div readout contains -0.588 as a signed number (nums)');
    const sameDiv = await readText(page, '#arithmetic-ex-same');
    ok(sameDiv.startsWith('same point: agree'), 'div: ' + sameDiv);
    await shot('a4-div');

    await clickChip(page, 'arithmetic-mode-sub');
    await has('#arithmetic-readout', '4 - 6i');
    await shot('a4-sub');

    // documented way of conjugating the difference: the toggle
    await clickChip(page, 'arithmetic-conj-result');
    await has('#arithmetic-readout', '4 + 6i');
    log('sub+mirror readout: ' + (await readText(page, '#arithmetic-readout')));
    const imRow = await readText(page, '#arithmetic-ex-im-cart').catch(() => '');
    log('Im row (cart cell): ' + imRow);
    await shot('a4-sub-mirror');

    // what the literal chip does after sub
    await clickChip(page, 'arithmetic-mode-conj');
    log('after clicking mode-conj following sub+mirror: ' + (await readText(page, '#arithmetic-readout')) + ' toggle pressed=' + (await page.getAttribute('#arithmetic-conj-result', 'aria-pressed')));

    // back in mul, drag z2 to (1, 0)
    await clickChip(page, 'arithmetic-mode-mul');
    const fin = await dragHandle(page, 'arithmetic-plane-z2', { re: 1, im: 0 });
    log('z2 landed at ' + JSON.stringify(fin));
    await has('#arithmetic-readout', '3 - 2i');
    const sameMul = await readText(page, '#arithmetic-ex-same');
    ok(sameMul.startsWith('same point: agree'), 'mul after drag: ' + sameMul);
    await shot('a4-mul-z2-1');
    return;
  }
}
