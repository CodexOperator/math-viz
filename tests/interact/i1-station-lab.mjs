// tests/interact/i1-station-lab.mjs: the Mapping Lab (acceptance criteria A2 to A5 of goal i1-station-lab).
//   node tools/smoke.mjs --route lab --script tests/interact/i1-station-lab.mjs --dark
// Design: docs/designs/iter-1/i1-station-lab.md, Appendix A. Runs at desktop, phone and dark desktop.

import { clickChip, planePixel, readText, setSlider, settle } from './_helpers.mjs';

const VIEWS = ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d'];
const pause = (page, ms) => page.waitForTimeout(ms);
const lab = (page, name) => page.evaluate((n) => window.__mv.lab[n](), name);
const nowhere = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function go(page, hash, ms = 900) {
  await page.evaluate((hh) => { location.hash = hh; }, hash);
  await pause(page, ms);
}

async function dragOn(page, planeId, a, b, steps = 8) {
  const p = await planePixel(page, planeId, a);
  const q = await planePixel(page, planeId, b);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps });
  await page.mouse.up();
  await settle(page, 3);
}

// The 3D view's framing: the largest |NDC| (1 is the frame's edge) over the vertices of the meshes in the scene, and of the
// curves too on the sphere (they all lie on it). More than 1 means the picture is cut off by its frame.
const framing = (page, withLines) => page.evaluate((lines) => {
  const view = [...window.__mv.views3d.values()].find((v) => v.camera && v.renderer && !v.unavailable);
  if (!view) return null;
  const cam = view.camera;
  cam.updateMatrixWorld(true);
  const V = cam.matrixWorldInverse.elements, P = cam.projectionMatrix.elements;
  let worst = 0, n = 0;
  view.scene.traverse((o) => {
    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!pos || o.visible === false || !(o.isMesh || (lines && o.isLine))) return;
    o.updateWorldMatrix(true, false);
    const M = o.matrixWorld.elements;
    const step = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < pos.count; i += step) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (![x, y, z].every(Number.isFinite)) continue;
      const wx = M[0] * x + M[4] * y + M[8] * z + M[12], wy = M[1] * x + M[5] * y + M[9] * z + M[13], wz = M[2] * x + M[6] * y + M[10] * z + M[14];
      const vx = V[0] * wx + V[4] * wy + V[8] * wz + V[12], vy = V[1] * wx + V[5] * wy + V[9] * wz + V[13];
      const vz = V[2] * wx + V[6] * wy + V[10] * wz + V[14], vw = V[3] * wx + V[7] * wy + V[11] * wz + V[15];
      const cx = P[0] * vx + P[4] * vy + P[8] * vz + P[12] * vw, cy = P[1] * vx + P[5] * vy + P[9] * vz + P[13] * vw;
      const cw = P[3] * vx + P[7] * vy + P[11] * vz + P[15] * vw;
      worst = Math.max(worst, Math.abs(cx / cw), Math.abs(cy / cw));
      n++;
    }
  });
  return { worst: Number(worst.toFixed(3)), n };
}, !!withLines);

const pointsOf = (page) => page.evaluate(() => window.__mv.lab.images().flatMap((pc) => pc.points.map((p) => ({ re: p.re, im: p.im, t: p.t }))));

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;

  // ---------------- A2: a drawn rectangle through z^2, six views, undo and clear ----------------
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await go(page, 'home', 400);
  await go(page, 'lab', 900);
  assert((await lab(page, 'shapes')).length === 0, 'A2: the Lab opens blank');

  await clickChip(page, 'lab-tool-rect');
  await dragOn(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  const rect = await page.evaluate(() => {
    const s = window.__mv.lab.shapes();
    const p = s[0].points;
    return {
      n: s.length,
      worst: Math.max(...p.map((q) => Math.abs(Math.max(Math.abs(q.re - 1), Math.abs(q.im - 1)) - 0.5))),
      t0: p[0].t, t1: p[p.length - 1].t, mono: p.every((q, i) => i === 0 || q.t >= p[i - 1].t),
    };
  });
  assert(rect.n === 1, `A2: one shape after the drag, got ${rect.n}`);
  assert(rect.worst < 1e-6, `A2: rectangle corners are exact, worst ${rect.worst}`);
  assert(rect.t0 === 0 && rect.t1 === 1 && rect.mono, 'A2: t spans 0..1');

  await clickChip(page, 'lab-fn-sq');
  const img = await page.evaluate(async () => {
    const { pointAt } = await import('./js/core/shapes.js');
    const L = window.__mv.lab;
    const sh = L.shapes()[0];
    const pieces = L.images();
    let n = 0, worst = 0;
    for (const pc of pieces) {
      for (const p of pc.points) {
        const z = pointAt(sh, p.t);
        worst = Math.max(worst, Math.hypot(z.re * z.re - z.im * z.im - p.re, 2 * z.re * z.im - p.im));
        n++;
      }
    }
    return { pieces: pieces.length, n, worst };
  });
  assert(img.pieces >= 1 && img.n > 0 && img.worst < 1e-6, `A2: images are z^2 of the shape on the same clock: ${JSON.stringify(img)}`);

  for (const v of VIEWS) {
    await clickChip(page, `lab-view-${v}`);
    await pause(page, 400);
    assert((await lab(page, 'view')) === v, `A2: view() is ${v}`);
    const n3 = await page.evaluate(() => (window.__mv.views3d ? window.__mv.views3d.size : 0));
    assert(n3 <= 1, `A2: at most one 3D view alive in ${v}, got ${n3}`);
    if (['landscape', 'sphere', 'graph4d'].includes(v)) {
      const noGl = await page.evaluate(() => { const n = document.getElementById('lab-webgl-note'); return !!n && !n.hidden; });
      assert(noGl || n3 === 1, `A2: the 3D view exists in ${v}`);
    } else assert(n3 === 0, `A2: no 3D view in ${v}, got ${n3}`);
    assert((await nowhere(page)) <= 1, `A2: no horizontal overflow in ${v}`);
    if (v === 'domain') {
      const st = await page.evaluate(() => document.getElementById('lab-zplane-dc')?.dataset.dcState);
      assert(st === 'ready', `A2: the z-plane domain canvas is ready, got ${st}`);
    }
    if (['landscape', 'sphere', 'graph4d'].includes(v) && n3 === 1) {
      const fr = await framing(page, v === 'sphere');
      assert(fr && fr.n > 0 && fr.worst <= 1 && fr.worst > 0.5, `A5: the ${v} picture is whole in its frame and not tiny: ${JSON.stringify(fr)}`);
    }
    if (['domain', 'landscape', 'sphere', 'graph4d'].includes(v)) await shot(`tab-${v}`);
  }
  await clickChip(page, 'lab-view-side');
  await setSlider(page, 'lab-t', 0.5);
  assert((await readText(page, '#lab-readout')).includes('t = 0.5'), 'A2: readout shows t = 0.5');

  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 0, 'A2: undo gives 0 shapes');
  await dragOn(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  assert((await lab(page, 'shapes')).length === 1, 'A2: draw again gives 1 shape');
  await clickChip(page, 'lab-clear');
  assert((await lab(page, 'shapes')).length === 0, 'A2: clear gives 0 shapes');
  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 1, 'A2: undo after clear brings the shape back');
  await clickChip(page, 'lab-clear');

  // ---------------- the other tools draw what their hints say ----------------
  const toolCase = async (tool, a, b, check) => {
    await clickChip(page, `lab-tool-${tool}`);
    assert((await page.getAttribute(`#lab-tool-${tool}`, 'aria-pressed')) === 'true', `${tool}: the chip is pressed`);
    await dragOn(page, 'lab-zplane', a, b);
    const spec = await page.evaluate(() => { const s = window.__mv.lab.shapes(); return s.length ? s[s.length - 1].spec : null; });
    assert(spec && check(spec), `${tool}: ${JSON.stringify(spec)}`);
    await clickChip(page, 'lab-clear');
  };
  await toolCase('line', { re: -1, im: -1 }, { re: 1, im: 1 }, (s) => s.kind === 'segment' && s.a.re === -1 && s.b.im === 1);
  await toolCase('circle', { re: 0, im: 0 }, { re: 1.5, im: 0 }, (s) => s.kind === 'circle' && s.r === 1.5 && s.center.re === 0);
  await toolCase('annulus', { re: 0, im: 0 }, { re: 2, im: 0 }, (s) => s.kind === 'annulus' && s.r1 === 2 && s.r0 === 1);
  await toolCase('cartgrid', { re: -1, im: -1 }, { re: 1, im: 1 }, (s) => s.kind === 'cartGrid' && s.xRange[0] === -1 && s.yRange[1] === 1);
  // the polar rectangle: from the origin to 1.5 + 1.5i draws exactly the preset sector r in [0, 2], theta in [0, pi/4]
  await toolCase('sector', { re: 0, im: 0 }, { re: 1.5, im: 1.5 }, (s) => s.kind === 'sector' && s.r0 === 0 && Math.abs(s.r1 - 2) < 1e-9 && Math.abs(s.theta0) < 1e-9 && Math.abs(s.theta1 - Math.PI / 4) < 1e-9);
  await toolCase('polargrid', { re: 0, im: 0 }, { re: 1.5, im: 1.5 }, (s) => s.kind === 'sector' && s.grid === true && s.fillRays >= 1);
  await toolCase('brush', { re: -2, im: -1 }, { re: 2, im: 1 }, (s) => s.kind === 'freehand' && s.points.length >= 2);
  // a click with a press-drag tool draws nothing
  await clickChip(page, 'lab-tool-rect');
  const c0 = await planePixel(page, 'lab-zplane', { re: 2, im: 2 });
  await page.mouse.click(c0.x, c0.y);
  await settle(page, 2);
  assert((await lab(page, 'shapes')).length === 0, 'a click draws nothing');
  // polygon: three clicks and Close
  await clickChip(page, 'lab-tool-polygon');
  for (const z of [{ re: -1, im: -1 }, { re: 1, im: -1 }, { re: 0, im: 1 }]) {
    const q = await planePixel(page, 'lab-zplane', z);
    await page.mouse.click(q.x, q.y);
    await pause(page, 420);
  }
  await clickChip(page, 'lab-polygon-close');
  const poly = await page.evaluate(() => { const s = window.__mv.lab.shapes(); return s.length ? s[0].spec : null; });
  assert(poly && poly.kind === 'polygon' && poly.vertices.length === 3, `polygon: ${JSON.stringify(poly)}`);
  assert(/Last shape: polygon, closed, simple, positive/.test(await readText(page, '#lab-shape-info')), 'the shape info classifies the polygon');
  await clickChip(page, 'lab-clear');

  // a half-drawn polygon is abandoned by a preset, Clear, Undo and Escape: no phantom dashed preview stays on either plane
  const halfPolygon = async () => {
    await clickChip(page, 'lab-tool-polygon');
    for (const z of [{ re: -1, im: -1 }, { re: 1, im: -1 }]) {
      const q = await planePixel(page, 'lab-zplane', z);
      await page.mouse.click(q.x, q.y);
      await pause(page, 420);
    }
    const q = await planePixel(page, 'lab-zplane', { re: 0, im: 1 });
    await page.mouse.move(q.x, q.y, { steps: 3 });          // the rubber band
    await pause(page, 150);
    const d = await lab(page, 'draft');
    assert(d.active && d.tool === 'polygon' && d.corners === 2 && d.curves === 1 && d.out >= 1, `a half-drawn polygon shows a dashed preview and its image: ${JSON.stringify(d)}`);
  };
  const noDraft = async (what) => {
    await pause(page, 150);
    const d = await lab(page, 'draft');
    assert(!d.active && d.curves === 0 && d.out === 0 && !d.closeEnabled, `${what}: the half-drawn polygon is gone from both planes: ${JSON.stringify(d)}`);
  };
  await halfPolygon(); await clickChip(page, 'lab-preset-unit'); await noDraft('a preset');
  await halfPolygon(); await clickChip(page, 'lab-clear'); await noDraft('Clear');
  assert((await lab(page, 'shapes')).length === 0, 'Clear emptied the Lab');
  await halfPolygon(); await clickChip(page, 'lab-undo'); await noDraft('Undo');
  assert((await lab(page, 'shapes')).length === 1, 'Undo brought the preset back');
  await halfPolygon(); await page.keyboard.press('Escape'); await noDraft('Escape');
  await clickChip(page, 'lab-clear');

  // the empty-state pills step aside for the probe, so they never cover its labels
  await clickChip(page, 'lab-tool-brush');
  assert((await page.isVisible('#lab-zempty')) && (await page.isVisible('#lab-wempty')), 'the empty pills show on a blank Lab');
  await clickChip(page, 'lab-tool-probe');
  assert(!(await page.isVisible('#lab-zempty')) && !(await page.isVisible('#lab-wempty')), 'the empty pills are hidden while the probe is on');
  await clickChip(page, 'lab-probe-off');
  assert((await page.isVisible('#lab-zempty')) && (await page.isVisible('#lab-wempty')), 'and come back when the probe is hidden');
  await clickChip(page, 'lab-tool-brush');

  // ---------------- A3: presets and the parser ----------------
  const arg = (pts, lo, hi) => page.evaluate(async ({ pts, lo, hi }) => {
    const { Arg } = await import('./js/core/complex.js');
    return Math.max(...pts.map((p) => Math.max(lo - Arg(p), Arg(p) - hi, 0)));
  }, { pts, lo, hi });

  await go(page, 'lab-2-5-1');
  let ro = await readText(page, '#lab-readout');
  assert(ro.includes('1/z') && ro.includes('shapes: 1'), `A3: 2.5.1 readout: ${ro}`);
  let pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => Math.abs(p.re - 0.5) < 1e-6), 'A3: 2.5.1 image is Re w = 1/2');
  assert((await page.evaluate(() => document.getElementById('lab-problem')?.dataset.problem)) === '2.5.1', 'A3: the problem panel for 2.5.1 appears by itself');
  assert((await page.getAttribute('#lab-check', 'data-ok')) === 'true', 'A3: the 2.5.1 check passes');

  await go(page, 'lab-2-1-2');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z^2'), `A3: 2.1.2 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => Math.abs(p.re - (4 - (p.im * p.im) / 16)) < 1e-6), 'A3: 2.1.2 image is u = 4 - v^2/16');

  await go(page, 'lab-2-1-3');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('iz - 2i'), `A3: 2.1.3 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => p.im === 0), 'A3: 2.1.3 image is the real axis');

  await go(page, 'lab-2-2-1');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z^3'), `A3: 2.2.1 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && (await arg(pts, -1e-6, (3 * Math.PI) / 4 + 1e-6)) <= 1e-6, 'A3: 2.2.1 image has Arg in [0, 3 pi/4]');

  await go(page, 'lab-P4');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('(1+i)z'), `A3: P4 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => Math.abs(Math.hypot(p.re, p.im) - Math.SQRT2) < 1e-6), 'A3: P4 image has |w| = sqrt 2');

  await page.fill('#lab-fn-src', 'z^2 + iz');
  await page.click('#lab-fn-apply');
  await settle(page, 3);
  assert((await readText(page, '#lab-readout')).includes('z^2 + iz'), 'A3: typed function is in the readout');
  assert((await readText(page, '#lab-fn-error')) === '', 'A3: no error for z^2 + iz');
  await page.fill('#lab-fn-src', 'z +');
  await page.click('#lab-fn-apply');
  await settle(page, 3);
  const expected = await page.evaluate(async () => { const { compile } = await import('./js/core/parse.js'); try { compile('z +'); return ''; } catch (e) { return e.message; } });
  assert((await readText(page, '#lab-fn-error')) === expected && expected !== '', 'A3: parser message shown verbatim');
  assert(await page.evaluate(() => !!document.querySelector('#lab-fn-echo mark')), 'A3: the bad part is marked');
  assert((await readText(page, '#lab-readout')).includes('z^2 + iz'), 'A3: a bad formula leaves f unchanged');
  const chip = await page.evaluate(() => { const e = document.getElementById('lab-preset-circle1'); return { p: e.dataset.problem, href: e.querySelector('a') && e.querySelector('a').getAttribute('href') }; });
  assert(chip.p === '2.5.1' && chip.href === '#problem-2-5-1', `A3: preset chip links: ${JSON.stringify(chip)}`);

  // the centre of every preset group is on its load button, so clicking the group loads the preset and does not follow the link
  const hits = await page.evaluate(() => {
    const out = {};
    for (const g of document.querySelectorAll('.lab-preset')) {
      g.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = g.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const b = hit && hit.closest('button');
      out[g.id] = b ? b.id : hit && hit.closest('a') ? 'the link' : String(hit && hit.tagName);
    }
    return out;
  });
  const keys = ['x2', 'circle1', 'unit', 'sector', 'annulus', 'segment'];
  assert(Object.keys(hits).length === 6 && keys.every((k) => hits['lab-preset-' + k] === `lab-preset-${k}-load`), `A4: every preset group's centre is its load button: ${JSON.stringify(hits)}`);
  const NO_CHECK = 'There is no numeric check for this problem. The picture is the evidence.';
  for (const k of keys) {
    const hash0 = await page.evaluate(() => location.hash);
    await clickChip(page, `lab-preset-${k}`);
    await pause(page, 150);
    const after = await page.evaluate(() => ({ hash: location.hash, lab: !!(window.__mv && window.__mv.lab), shapes: window.__mv.lab ? window.__mv.lab.shapes().length : -1,
      problem: document.getElementById('lab-problem')?.dataset.problem, check: document.getElementById('lab-check')?.textContent }));
    const want = { x2: '2.1.2', circle1: '2.5.1', unit: 'P4', sector: '2.2.1', annulus: '1.5.2', segment: '1.5.1' }[k];
    assert(after.hash === hash0 && after.lab && after.shapes === 1 && after.problem === want, `A4: clicking the ${k} preset loads it in place: ${JSON.stringify(after)}`);
    if (k === 'annulus' || k === 'segment') assert(after.check === NO_CHECK, `A4: ${want} says it has no numeric check, got "${after.check}"`);
    else assert(/^Checked on your picture/.test(after.check) , `A4: ${want} is checked, got "${after.check}"`);
  }

  // an unknown token gives the blank Lab with a sentence
  await go(page, 'lab-nonsense', 700);
  assert((await lab(page, 'shapes')).length === 0, 'an unknown token gives the blank Lab');
  assert((await readText(page, '#lab-start-notice')).includes('nonsense'), 'an unknown token says so');

  // ---------------- A4: predict first and the hand-off ----------------
  await go(page, 'lab', 900);
  await clickChip(page, 'lab-predict');
  await clickChip(page, 'lab-preset-unit');
  const hid = await page.evaluate(() => { const w = document.getElementById('lab-wplane-wrap'); return w.offsetParent === null || w.getAttribute('aria-hidden') === 'true'; });
  assert(hid, 'A4: the w-plane wrapper is hidden while predicting');
  assert(await page.isVisible('#lab-reveal'), 'A4: Reveal is visible');
  assert(await page.isVisible('#lab-guess-wrap'), 'A4: the guess pad is visible');
  // the problem panel gives away no answer words while the image is hidden, on the presets the student is most likely to use
  // (P4's statement is the handout's "show that", so it already names the radius √2: its answer words are the rest.)
  const ANSWER_WORDS = { unit: /spin|stretch|45|1\.41|carries/i, circle1: /\bline\b|1\/2|Re ?w/i, x2: /parabola|4\s*[-−]\s*v/i, sector: /3\s*π\s*\/\s*4|135|wedge/i };
  const panelState = () => page.evaluate(async () => {
    const box = document.getElementById('lab-problem');
    const shown = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && e.offsetParent !== null; };
    const { problemById } = await import('./js/data/problems.js');
    const p = problemById(box.dataset.problem);
    const text = box.innerText.replace(/\s+/g, ' ');
    const frags = [p.addressWhy, p.aha, p.answer.text, p.routes.cart, p.routes.polar].filter((x) => typeof x === 'string').map((x) => x.replace(/\s+/g, ' ').slice(0, 24)).filter((x) => !/[$\\^_{}]/.test(x));
    return { id: box.dataset.problem, text, why: shown('lab-problem-why'), wait: shown('lab-problem-why-wait'), ways: shown('lab-problem-ways'), answer: shown('lab-problem-answer'),
      copied: frags.filter((f) => text.includes(f)) };
  });
  for (const k of ['unit', 'circle1', 'x2', 'sector']) {
    await clickChip(page, `lab-preset-${k}`);
    const ps = await panelState();
    assert(!ps.why && ps.wait && !ps.ways && !ps.answer, `A4: ${ps.id} while predicting hides the why-line, the ways and the answer: ${JSON.stringify(ps)}`);
    assert(ps.copied.length === 0, `A4: ${ps.id} shows no text of its answer while predicting: ${JSON.stringify(ps.copied)}`);
    assert(!ANSWER_WORDS[k].test(ps.text), `A4: ${ps.id} panel text has no answer words while predicting: "${ps.text}"`);
    assert(await page.evaluate(() => [...document.querySelectorAll('.problem-chip')].every((a) => !a.hasAttribute('title') || a.closest('.lab-preset'))), 'A4: the header problem chips carry no answer tooltip while predicting');
  }
  await clickChip(page, 'lab-preset-unit');
  await clickChip(page, 'lab-tool-probe');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z = 1 + i') && !ro.includes('-> w'), `A4: the probe does not leak w while predicting: ${ro}`);
  assert(ro.includes('image hidden (predict first)'), 'A4: the readout says the image is hidden');
  await dragOn(page, 'lab-gplane', { re: -1, im: -1 }, { re: 1, im: 1 });
  assert((await page.evaluate(() => window.__mv.lab.state().guess.length)) === 1, 'A4: one guess stroke');
  await shot('predict');
  await clickChip(page, 'lab-reveal');
  assert(await page.isVisible('#lab-wplane-wrap'), 'A4: the w-plane is visible after Reveal');
  assert(!(await page.isVisible('#lab-reveal')), 'A4: Reveal is gone after Reveal');
  assert((await readText(page, '#lab-readout')).includes('-> w'), 'A4: the readout shows w after Reveal');
  const shownAfter = await page.evaluate(() => { const s = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && e.offsetParent !== null; }; return { why: s('lab-problem-why'), wait: s('lab-problem-why-wait') }; });
  assert(shownAfter.why && !shownAfter.wait, 'A4: after Reveal the why-line is back');
  assert((await page.evaluate(() => document.activeElement && document.activeElement.id)) === 'lab-wplane-viewport', 'A4: Reveal in the side view moves focus to the w-plane');
  // Reveal in a 3D view: focus lands inside the 3D wrapper, not on the body
  await clickChip(page, 'lab-predict');
  await clickChip(page, 'lab-predict');
  await clickChip(page, 'lab-view-landscape');
  assert(await page.isVisible('#lab-reveal'), 'A4: Reveal is back after toggling Predict first');
  await clickChip(page, 'lab-reveal');
  assert(await page.evaluate(() => { const w = document.getElementById('lab-view3d-wrap'); return !w.hidden && w.contains(document.activeElement); }), 'A4: Reveal in the landscape view moves focus to the 3D wrapper');
  await clickChip(page, 'lab-view-side');
  await clickChip(page, 'lab-predict');          // predict off again
  assert(!(await page.evaluate(() => window.__mv.lab.state().predict)), 'A4: Predict first is off again');

  await page.evaluate(() => {
    localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'sphere', problem: '2.5.1', predictFirst: false }));
    location.hash = '#home';
  });
  await pause(page, 500);
  await page.evaluate(() => { location.hash = '#lab'; });
  await pause(page, 1200);
  assert((await lab(page, 'view')) === 'sphere', 'A4: request view');
  assert((await lab(page, 'shapes')).length === 1, 'A4: request shape');
  assert((await readText(page, '#lab-readout')).includes('1/z'), 'A4: request function');
  assert((await page.evaluate(() => localStorage.getItem('mv:lab.request'))) === null, 'A4: the request is consumed');
  assert((await page.evaluate(() => document.getElementById('lab-problem')?.dataset.problem)) === '2.5.1', 'A4: the problem panel is for 2.5.1');
  const fr1 = await framing(page, true);
  assert(fr1 && fr1.n > 0 && fr1.worst <= 1 && fr1.worst > 0.5, `A5: the whole sphere (the north pole is infinity, where Re w = 1/2 closes) is in its frame: ${JSON.stringify(fr1)}`);
  await shot('sphere-request');
  for (const v of ['landscape', 'graph4d']) {
    await clickChip(page, `lab-view-${v}`);
    await pause(page, 600);
    const fr = await framing(page, false);
    assert(fr && fr.n > 0 && fr.worst <= 1 && fr.worst > 0.5, `A5: 2.5.1 in the ${v} view is whole in its frame: ${JSON.stringify(fr)}`);
    await shot(`${v}-request`);
  }
  // a request whose problem does not match its drawing: the check says so; a hint-only problem says it has no check
  await page.evaluate(() => {
    localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'sq', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'side', problem: '2.5.1', predictFirst: false }));
    location.hash = '#home';
  });
  await pause(page, 400);
  await go(page, 'lab', 900);
  assert((await readText(page, '#lab-check')).startsWith('The check runs only on the exact drawing from the problem. Yours is different.'), 'A4: a checked problem with another drawing says the check does not apply');

  // ---------------- A5: domain colouring, hue = argument ----------------
  await go(page, 'lab-P4');
  await clickChip(page, 'lab-fn-sq');
  await clickChip(page, 'lab-view-domain');
  await page.waitForFunction(() => { const c = document.getElementById('lab-zplane-dc'); return c && c.dataset.dcState === 'ready' && !c.dataset.dcPending; }, null, { timeout: 8000 });
  const hues = await page.evaluate(() => {
    const plane = window.__mv.planes.get('lab-zplane');
    const cx = document.getElementById('lab-zplane-dc').getContext('2d');
    const out = [];
    for (let k = 0; k < 8; k++) {
      const z = { re: 1.5 * Math.cos((k * Math.PI) / 4), im: 1.5 * Math.sin((k * Math.PI) / 4) };
      const q = plane.toPixel(z);
      const [r, g, b] = cx.getImageData(Math.round(q.x), Math.round(q.y), 1, 1).data;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let hh = d === 0 ? NaN : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh /= 6;
      if (hh < 0) hh += 1;
      out.push(hh);
    }
    return out;
  });
  const want = [0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75];
  hues.forEach((hh, k) => {
    const d = Math.abs(hh - want[k]);
    assert(Math.min(d, 1 - d) < 0.03, `A5: hue at ${k * 45} degrees is ${hh.toFixed(3)}, want ${want[k]}`);
  });
  assert(await page.isVisible('#lab-wheel'), 'A5: the wheel legend is visible');
  await shot('domain');

  // ---------------- probe, clock, reduced motion ----------------
  await clickChip(page, 'lab-view-side');
  await clickChip(page, 'lab-tool-probe');
  assert(await page.isVisible('#lab-zplane-probe'), 'the probe dot appears');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z = 1 + i -> w = 2i'), `probe line: ${ro}`);
  await page.waitForFunction(() => { const e = document.getElementById('lab-ex-same'); return e && e.dataset.agree; }, null, { timeout: 4000 });
  const same = await page.evaluate(() => document.getElementById('lab-ex-same')?.dataset.agree);
  assert(same === 'true', 'explainer footer agrees');
  assert((await readText(page, '#lab-angle-story')).includes('2 * Arg z'), 'the angle story is there');
  await shot('probe');
  await clickChip(page, 'lab-play');
  await pause(page, 600);
  assert((await lab(page, 't')) !== 0.4, 'play moves the clock');
  await clickChip(page, 'lab-play');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pause(page, 200);
  assert((await readText(page, '#lab-play')) === 'Step', 'reduced motion: Play becomes Step');
  const nextStep = (t) => { const k = Math.floor(t * 10 + 1e-9) + 1; return k > 10 ? 0 : k / 10; };
  const t0 = await lab(page, 't');
  await clickChip(page, 'lab-play');
  const t1 = await lab(page, 't');
  assert(Math.abs(t1 - nextStep(t0)) < 1e-9, `reduced motion: one press is one step (${t0} to ${t1})`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // ---------------- persistence, the 40-shape cap, the Move tool, undo of a preset ----------------
  await go(page, 'lab-2-1-2');
  await go(page, 'home', 400);
  await go(page, 'lab', 900);
  assert((await lab(page, 'shapes')).length === 1, 'the drawing comes back from the store after a visit elsewhere');
  await clickChip(page, 'lab-preset-unit');
  assert((await lab(page, 'fn')).id === 'linear-1i', 'a preset picks its function');
  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes'))[0].spec.kind === 'verticalLine', 'undo brings back the shape the preset replaced');
  await page.evaluate(() => {
    const shapes = Array.from({ length: 40 }, (_, i) => ({ kind: 'verticalLine', x: -4 + i * 0.2 }));
    localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'sq', shapes, view: 'side' }));
    location.hash = '#home';
  });
  await pause(page, 400);
  await go(page, 'lab', 1000);
  assert((await lab(page, 'shapes')).length === 40, 'a request of 40 shapes loads');
  await clickChip(page, 'lab-tool-rect');
  await dragOn(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  assert((await lab(page, 'shapes')).length === 40, 'the 41st shape is refused');
  assert((await readText(page, '#lab-notice')).includes('40 shapes'), 'and the notice says why');
  await clickChip(page, 'lab-tool-pan');
  assert(!(await page.evaluate(() => window.__mv.planes.get('lab-zplane').isDrawMode())), 'the Move tool turns draw mode off');
  const before = await page.evaluate(() => window.__mv.planes.get('lab-zplane').getView().center.re);
  const m0 = await planePixel(page, 'lab-zplane', { re: 0, im: 3 });
  await page.mouse.move(m0.x, m0.y);
  await page.mouse.down();
  await page.mouse.move(m0.x + 60, m0.y, { steps: 6 });
  await page.mouse.up();
  await settle(page, 3);
  const after = await page.evaluate(() => window.__mv.planes.get('lab-zplane').getView().center.re);
  assert(Math.abs(after - before) > 0.1, 'the Move tool pans the z-plane');
  assert((await lab(page, 'shapes')).length === 40, 'panning draws nothing');
  await clickChip(page, 'lab-clear');

  // ---------------- every function in every view: no errors, no NaN on the page ----------------
  const FN_IDS = ['sq', 'cube', 'zn', 'sqrt', 'cbrt', 'cbrt-seam', 'linear-i', 'linear-1i', 'recip', 'exp', 'sq-plus-iz', 'sq-plus-z', 'conj', 're', 'abs2', 'dir', 'x-over-z'];
  await go(page, 'lab-2-5-1');
  await clickChip(page, 'lab-tool-probe');
  const noNaN = async (what) => assert(!(await page.evaluate(() => document.body.innerText.includes('NaN'))), `no NaN on the page: ${what}`);
  for (const v of VIEWS) {
    await clickChip(page, `lab-view-${v}`);
    const ids = v === 'side' ? FN_IDS : ['sq', 'recip', 'exp', 'cbrt-seam'];
    for (const id of ids) {
      await clickChip(page, `lab-fn-${id}`);
      await pause(page, v === 'side' ? 60 : 250);
      const pressed = await page.getAttribute(`#lab-fn-${id}`, 'aria-pressed');
      assert(pressed === 'true', `${id} is pressed in ${v}`);
      await noNaN(`${id} in ${v}`);
    }
  }
  await clickChip(page, 'lab-view-sphere');
  for (const k of ['z', 'w', 'both']) { await clickChip(page, `lab-sphere-${k}`); await pause(page, 100); }
  await clickChip(page, 'lab-view-graph4d');
  await setSlider(page, 'lab-4d-uv', 1.5708);
  await setSlider(page, 'lab-4d-yv', 0.9);
  assert((await readText(page, '#lab-4d-readout')).includes('a mix of u and v'), 'the 4D readout follows the sliders');
  await setSlider(page, 'lab-4d-uv', 0);
  await setSlider(page, 'lab-4d-yv', 0);
  assert((await readText(page, '#lab-4d-readout')).includes('u = Re w'), 'and returns to the Re surface');
  await clickChip(page, 'lab-view-morph');
  await clickChip(page, 'lab-morph-play');
  await pause(page, 500);
  assert((await lab(page, 's')) > 0.5, 'Play morph moves s');
  await clickChip(page, 'lab-view-side');
  // the w-plane auto-fit switches off when the student zooms it and comes back on Reset
  await clickChip(page, 'lab-fn-sq');
  await page.evaluate(() => document.getElementById('lab-wplane-zoom-in').click());
  await settle(page, 3);
  assert(await page.isVisible('#lab-wfit-note'), 'zooming the w-plane turns auto-fit off and says so');
  await page.evaluate(() => document.getElementById('lab-wplane-zoom-reset').click());
  await settle(page, 4);
  assert(!(await page.isVisible('#lab-wfit-note')), 'Reset turns auto-fit back on');
  // a typed function with a pole: the cursor hides in the gap, the readout never says NaN
  await page.fill('#lab-fn-src', '1/(z - 1)');
  await page.click('#lab-fn-apply');
  await settle(page, 3);
  await noNaN('1/(z - 1)');
  assert((await readText(page, '#lab-readout')).includes('f = 1/(z - 1)'), 'a typed function is read back exactly as typed');
  assert((await nowhere(page)) <= 1, 'no horizontal overflow at the end');
  log('lab checks passed');
}
