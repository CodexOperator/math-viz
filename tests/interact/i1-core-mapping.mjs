// Interaction script for goal i1-core-mapping (engine: shapes.js, mapping.js, domaincolor.js).
//
//   node tools/smoke.mjs --route nosuchplace --script tests/interact/i1-core-mapping.mjs --dark
//
// The engines have no screen of their own. This script imports them inside the page, builds a
// temporary proof sheet (#cm-fixture), asserts on pixels and on info(), takes a screenshot, and
// removes the sheet again, also when an assertion fails (try/finally below). It uses only
// page.evaluate, page.waitForTimeout and the ctx helpers.

export default async function (page, ctx) {
  try {
    await run(page, ctx);
  } finally {
    await restore(page).catch(() => {}); // never mask the assertion that failed
  }
}

// Remove the proof sheet and show what the router put in the main column again.
function restore(page) {
  return page.evaluate(() => {
    document.getElementById('cm-fixture')?.remove();
    for (const child of Array.from(document.querySelectorAll('[data-cm-was-display]'))) {
      child.style.display = child.dataset.cmWasDisplay;
      delete child.dataset.cmWasDisplay;
    }
    delete window.__cm;
  });
}

async function run(page, ctx) {
  const { assert, log, shot } = ctx;

  // ---- 1. load the modules in the page ------------------------------------
  const names = await page.evaluate(async () => {
    const o = location.origin;
    const [dc, sh, mp] = await Promise.all(
      ['domaincolor', 'shapes', 'mapping'].map((n) => import(`${o}/js/core/${n}.js`)),
    );
    const cm = { dc, sh, mp };
    cm.px = (id, i, j) => Array.from(document.getElementById(id).getContext('2d').getImageData(i, j, 1, 1).data);
    window.__cm = cm;
    return { dc: Object.keys(dc).sort(), sh: Object.keys(sh).sort(), mp: Object.keys(mp).sort() };
  });
  const need = {
    dc: ['colorOf', 'createDomainColoring', 'drawColorWheel', 'hueOf', 'lightnessOf'],
    sh: ['annulus', 'cartGrid', 'circle', 'classify', 'freehand', 'horizontalLine', 'pointAt', 'polarGrid', 'polygon',
      'ray', 'rect', 'resample', 'reverse', 'sector', 'segment', 'verticalLine'],
    mp: ['bounds', 'lift', 'morph', 'morphPoint', 'pushForward', 'pushForwardAll'],
  };
  for (const k of Object.keys(need)) {
    for (const n of need[k]) assert(names[k].includes(n), `${k} exports ${n}`);
  }

  // ---- 2. build the fixture -----------------------------------------------
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'cm-fixture';
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;padding:12px;box-sizing:border-box;max-width:100%;'
      + 'background:var(--bg);color:var(--text);font:13px/1.3 var(--font, system-ui, sans-serif);';
    const mk = (id, w, h, caption, cssW) => {
      const fig = document.createElement('figure');
      fig.style.cssText = 'margin:0;max-width:100%;';
      const cv = document.createElement('canvas');
      cv.id = id;
      cv.width = w;
      cv.height = h;
      cv.style.width = `${cssW || w}px`;
      cv.style.maxWidth = '100%';
      cv.style.border = '1px solid var(--border)';
      cv.style.display = 'block';
      const cap = document.createElement('figcaption');
      cap.textContent = caption;
      cap.style.cssText = 'max-width:200px;margin-top:4px;color:var(--text-muted);';
      fig.append(cv, cap);
      box.append(fig);
      return cv;
    };
    mk('cm-dc-id', 200, 200, 'f(z) = z. Colours wrap once round a black centre. No seam.');
    mk('cm-dc-sqrt', 200, 200, 'f = principal sqrt(z). Sharp colour edge on the negative real axis.');
    mk('cm-wheel', 96, 96, 'The colour key: hue is the angle of w, brightness is the size of w.');
    mk('cm-curves', 260, 340, 'x = 2 (input) and its image under z^2. Same ramp, same dots at t = 0, 1/4, 1/2, 3/4, 1.');
    mk('cm-seam', 200, 200, 'A rectangle around 0 (blue) and its image under the principal sqrt (orange): two pieces, cut at the seam, no line across it.');
    // Sit in the main column (the shell's fixed navigation would cover a body-level sheet) and hide
    // what the router put there for the duration of the script, so the proof sheet is what shows.
    const host = document.getElementById('view') || document.body;
    for (const child of Array.from(host.children)) {
      child.dataset.cmWasDisplay = child.style.display || '';
      child.style.display = 'none';
    }
    host.append(box);
  });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `the proof sheet does not overflow horizontally (${overflow}px)`);

  const pixels = (id, pts) => page.evaluate(([i, p]) => p.map(([x, y]) => window.__cm.px(i, x, y)), [id, pts]);
  const maxCh = (p) => Math.max(p[0], p[1], p[2]);
  const minCh = (p) => Math.min(p[0], p[1], p[2]);

  const identityChecks = async (label) => {
    const [c0, right, top, left, bottom] = await pixels('cm-dc-id', [[100, 100], [190, 100], [100, 10], [10, 100], [100, 190]]);
    assert(maxCh(c0) < 80, `${label}: centre is dark ${c0}`);
    assert(right[0] > right[1] && right[0] > right[2], `${label}: +1 side is red ${right}`);
    assert(top[1] > top[0] && top[1] > top[2], `${label}: +i side is yellow-green ${top}`);
    assert(left[0] < left[1] && left[0] < left[2], `${label}: -1 side is cyan ${left}`);
    assert(bottom[2] > bottom[0] && bottom[0] > bottom[1], `${label}: -i side is violet ${bottom}`);
    return [c0, right, top, left, bottom];
  };

  // ---- 3. identity colouring, pixels --------------------------------------
  const info3 = await page.evaluate(() => {
    const cv = document.getElementById('cm-dc-id');
    const d = window.__cm.dc.createDomainColoring(cv, { f: (z) => z, xRange: [-2, 2], yRange: [-2, 2] });
    window.__cm.dcId = d;
    d.setQuality('idle');
    d.render();
    return { info: d.info(), label: cv.getAttribute('aria-label'), role: cv.getAttribute('role'), state: cv.dataset.dcState };
  });
  assert(info3.info.mode === 'idle' && info3.info.width === 200 && info3.info.height === 200 && info3.info.state === 'ready',
    `idle info ${JSON.stringify(info3.info)}`);
  assert(info3.role === 'img' && /Domain colouring/.test(info3.label || ''), 'the colouring canvas is labelled');
  assert(info3.state === 'ready', 'dataset.dcState is ready');
  const base = await identityChecks('idle');
  log(`identity pixels centre ${base[0]} right ${base[1]} top ${base[2]} left ${base[3]} bottom ${base[4]}`);

  // ---- 4. no seam for z, a seam for principal sqrt ------------------------
  await page.evaluate(() => {
    const cv = document.getElementById('cm-dc-sqrt');
    const psqrt = (z) => {
      const r = Math.sqrt(Math.hypot(z.re, z.im));
      const th = Math.atan2(z.im, z.re) / 2;
      return { re: r * Math.cos(th), im: r * Math.sin(th) };
    };
    const d = window.__cm.dc.createDomainColoring(cv, { f: psqrt, xRange: [-2, 2], yRange: [-2, 2] });
    window.__cm.dcSq = d;
    d.render('idle');
  });
  const sumDiff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const [idUp, idDn] = await pixels('cm-dc-id', [[10, 99], [10, 101]]);
  const [sqUp, sqDn] = await pixels('cm-dc-sqrt', [[10, 99], [10, 101]]);
  assert(sumDiff(idUp, idDn) <= 30, `identity has no seam: ${idUp} vs ${idDn}`);
  assert(sumDiff(sqUp, sqDn) >= 300, `principal sqrt has a seam: ${sqUp} vs ${sqDn}`);
  log(`seam: identity ${sumDiff(idUp, idDn)}, sqrt ${sumDiff(sqUp, sqDn)}`);

  // ---- 5. reduced while dragging, refined when idle -----------------------
  const dragStart = await page.evaluate(() => {
    const d = window.__cm.dcId;
    window.__cm.t0 = performance.now();
    d.render('drag');
    return d.info();
  });
  assert(dragStart.mode === 'drag' && dragStart.width === 60 && dragStart.height === 60,
    `drag render is reduced: ${JSON.stringify(dragStart)}`);
  assert(dragStart.pending === true, 'a refine is pending after a drag render');
  const pendingFlag = await page.evaluate(() => document.getElementById('cm-dc-id').dataset.dcPending);
  assert(pendingFlag === '1', 'dataset.dcPending is set while a refine is pending');
  let landed = null;
  for (let k = 0; k < 150 && !landed; k++) {
    await page.waitForTimeout(20);
    const s = await page.evaluate(() => ({ info: window.__cm.dcId.info(), now: performance.now(), t0: window.__cm.t0 }));
    if (s.info.mode === 'idle' && !s.info.pending) landed = { info: s.info, elapsed: s.now - s.t0 };
  }
  assert(landed, 'the refine landed within 3 s');
  assert(landed.elapsed >= 100, `refine waits for idle: landed after ${Math.round(landed.elapsed)} ms`);
  assert(landed.info.width === 200 && landed.info.height === 200, `refined size ${landed.info.width}x${landed.info.height}`);
  const refined = await identityChecks('refined');
  for (let i = 0; i < 5; i++) {
    for (let c = 0; c < 3; c++) {
      assert(Math.abs(refined[i][c] - base[i][c]) <= 1, `refined pixel ${i} equals the first idle pixel`);
    }
  }
  log(`refine landed after ${Math.round(landed.elapsed)} ms`);

  const rearm = await page.evaluate(async () => {
    const d = window.__cm.dcId;
    const modes = [];
    for (let k = 0; k < 5; k++) {
      d.render('drag');
      await new Promise((r) => setTimeout(r, 40));
      modes.push(d.info().mode);
    }
    return modes;
  });
  assert(rearm.every((m) => m === 'drag'), `five drag renders 40 ms apart keep the refine waiting: ${rearm}`);
  let settled = null;
  for (let k = 0; k < 150 && !settled; k++) {
    await page.waitForTimeout(20);
    const s = await page.evaluate(() => window.__cm.dcId.info());
    if (s.mode === 'idle' && !s.pending) settled = s;
  }
  assert(settled && settled.width === 200, 'the refine lands after the last drag render');

  // ---- 6. setFunction and setView ----------------------------------------
  const pole = await page.evaluate(() => {
    const d = window.__cm.dcId;
    d.setFunction((z) => { const q = z.re * z.re + z.im * z.im; return q === 0 ? { re: NaN, im: NaN } : { re: z.re / q, im: -z.im / q }; });
    d.render('idle');
    return window.__cm.px('cm-dc-id', 100, 100);
  });
  assert(minCh(pole) >= 120, `a pole is white-ish: ${pole}`);
  const view = await page.evaluate(() => {
    const d = window.__cm.dcId;
    d.setFunction((z) => z);
    d.setView({ xRange: [0, 4], yRange: [-2, 2] });
    d.render('idle');
    return [window.__cm.px('cm-dc-id', 5, 100), window.__cm.px('cm-dc-id', 195, 100)];
  });
  assert(maxCh(view[0]) < 140, `near 0 is dark: ${view[0]}`);
  assert(view[1][0] > 200 && view[1][0] > view[1][1] + 60, `near 4 is bright red: ${view[1]}`);
  await page.evaluate(() => {
    const d = window.__cm.dcId;
    d.setView({ xRange: [-2, 2], yRange: [-2, 2] });
    d.render('idle');
  });

  // ---- 7. the wheel ------------------------------------------------------
  const wheel = await page.evaluate(() => {
    const cv = document.getElementById('cm-wheel');
    window.__cm.dc.drawColorWheel(cv, { size: 96 });
    const s = cv.width / 96;
    const at = (x, y) => Array.from(cv.getContext('2d').getImageData(Math.round(x * s), Math.round(y * s), 1, 1).data);
    return {
      width: cv.width, dpr: window.devicePixelRatio,
      corner: at(0, 0), centre: at(48, 48), red: at(71, 47), yg: at(47, 24), cyan: at(24, 47), violet: at(47, 71), rim: at(93, 47),
      role: cv.getAttribute('role'), label: cv.getAttribute('aria-label'),
    };
  });
  assert(wheel.width === Math.round(96 * Math.min(2, wheel.dpr || 1)), `wheel backing size ${wheel.width}`);
  assert(wheel.corner[3] === 0, 'wheel corner is transparent');
  assert(maxCh(wheel.centre) < 40, `wheel centre is dark ${wheel.centre}`);
  assert(wheel.red[0] > wheel.red[1] && wheel.red[0] > wheel.red[2], `wheel right is red ${wheel.red}`);
  assert(wheel.yg[1] > wheel.yg[0] && wheel.yg[1] > wheel.yg[2], `wheel top is yellow-green ${wheel.yg}`);
  assert(wheel.cyan[0] < wheel.cyan[1] && wheel.cyan[0] < wheel.cyan[2], `wheel left is cyan ${wheel.cyan}`);
  assert(wheel.violet[2] > wheel.violet[0] && wheel.violet[0] > wheel.violet[1], `wheel bottom is violet ${wheel.violet}`);
  assert(minCh(wheel.rim) > 150, `wheel rim is bright ${wheel.rim}`);
  assert(wheel.role === 'img' && /angle/.test(wheel.label || ''), 'the wheel has role img and a label that says angle');

  // ---- 8. engine numbers in the browser -----------------------------------
  const nums = await page.evaluate(() => {
    const { sh, mp } = window.__cm;
    const sq = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
    const inv = (z) => { const d = z.re * z.re + z.im * z.im; return d === 0 ? { re: NaN, im: NaN } : { re: z.re / d, im: -z.im / d }; };
    const par = mp.pushForward(sh.verticalLine(2), sq);
    const parErr = Math.max(...par[0].points.map((p) => Math.abs(p.re - (4 - p.im * p.im / 16))));
    const pole = mp.pushForward(sh.circle({ re: 1, im: 0 }, 1, { n: 256 }), inv);
    const flat = pole.flatMap((p) => p.points);
    const unit = mp.pushForward(sh.circle(0, 1), inv);
    return {
      parLen: par[0].points.length, parErr, poleCount: pole.length, poleN: flat.length,
      poleErr: Math.max(...flat.map((p) => Math.abs(p.re - 0.5))),
      at25: mp.pointOnPieces(pole, 0.25), at50: mp.pointOnPieces(pole, 0.5),
      orient: sh.classify(unit[0]).orientation,
    };
  });
  assert(nums.parLen === 129 && nums.parErr < 1e-6, `parabola: ${nums.parLen} points, error ${nums.parErr}`);
  assert(nums.poleCount === 2 && nums.poleN === 254 && nums.poleErr < 1e-6, `circle through the pole: ${nums.poleCount} pieces, ${nums.poleN} points`);
  assert(Math.abs(nums.at25.re - 0.5) < 1e-9 && Math.abs(nums.at25.im + 0.5) < 1e-9, 'pointOnPieces(.25) = 0.5 - 0.5i');
  assert(nums.at50 === null, 'pointOnPieces(.5) is null (the image is at infinity)');
  assert(nums.orient === -1, 'unit circle under 1/z runs clockwise');

  // a branch cut is cut: the principal square root of a loop around 0 has a seam, not a chord
  const seam = await page.evaluate(() => {
    const { sh, mp } = window.__cm;
    const psqrt = (z) => {
      const r = Math.sqrt(Math.hypot(z.re, z.im));
      const th = Math.atan2(z.im, z.re) / 2;
      return { re: r * Math.cos(th), im: r * Math.sin(th) };
    };
    const out = mp.pushForward(sh.rect({ re: -1, im: -0.8 }, { re: 1, im: 0.8 }), psqrt);
    let chord = 0;
    for (const pc of out) {
      for (let k = 1; k < pc.points.length; k++) {
        chord = Math.max(chord, Math.hypot(pc.points[k].re - pc.points[k - 1].re, pc.points[k].im - pc.points[k - 1].im));
      }
    }
    const line = mp.pushForward(sh.verticalLine(-1, { yRange: [-2, 2] }), psqrt);
    return { pieces: out.length, closed: out.map((pc) => pc.closed), chord, linePieces: line.length };
  });
  assert(seam.pieces === 2 && seam.closed.every((c) => c === false), `rect around 0 under sqrt: ${seam.pieces} open pieces`);
  assert(seam.chord < 0.2, `no chord across the seam (longest step ${seam.chord.toFixed(3)})`);
  assert(seam.linePieces === 2, 'x = -1 under the principal sqrt is cut in two');

  // ---- 9. proof sheet -------------------------------------------------------
  await page.evaluate(() => {
    const { sh, mp } = window.__cm;
    const cv = document.getElementById('cm-curves');
    const g = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const tok = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const input = tok('--input', '#2563eb');
    const output = tok('--output', '#d97706');
    const muted = tok('--text-muted', '#666666');
    const text = tok('--text', '#111111');
    const surface = tok('--surface', '#ffffff');
    const OX = 140;
    const OY = 170;
    const S = 10;
    const X = (x) => OX + S * x;
    const Y = (y) => OY - S * y;
    g.fillStyle = surface;
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = muted;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, Y(0));
    g.lineTo(cv.width, Y(0));
    g.moveTo(X(0), 0);
    g.lineTo(X(0), cv.height);
    g.stroke();
    g.font = '11px system-ui, sans-serif';
    // labels get a halo in the surface colour so a line under them never makes them unreadable
    const label = (txt, x, y, color) => {
      g.lineJoin = 'round';
      g.lineWidth = 3.5;
      g.strokeStyle = surface;
      g.strokeText(txt, x, y);
      g.fillStyle = color;
      g.fillText(txt, x, y);
    };
    label('u', cv.width - 10, Y(0) - 4, muted);
    label('v', X(0) + 4, 10, muted);

    const ramp = (pts, color) => {
      g.strokeStyle = color;
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      for (let k = 1; k < pts.length; k++) {
        g.globalAlpha = 0.25 + 0.75 * pts[k].t;
        g.beginPath();
        g.moveTo(X(pts[k - 1].re), Y(pts[k - 1].im));
        g.lineTo(X(pts[k].re), Y(pts[k].im));
        g.stroke();
      }
      g.globalAlpha = 1;
    };
    const dot = (p, color, r) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(X(p.re), Y(p.im), r, 0, 2 * Math.PI);
      g.fill();
      g.strokeStyle = surface;
      g.lineWidth = 1.5;
      g.stroke();
    };
    const line = sh.verticalLine(2);
    const img = mp.pushForward(line, (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im }));
    ramp(line.points, input);
    for (const pc of img) ramp(pc.points, output);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      dot(sh.pointAt(line, t), input, 3.5);
      dot(mp.pointOnPieces(img, t), output, 3.5);
    }
    // the focus at the origin, and the pair z = 2 + i (t = 0.625), w = 3 + 4i
    g.strokeStyle = text;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(X(0), Y(0), 4, 0, 2 * Math.PI);
    g.stroke();
    label('focus 0', X(0) - 46, Y(0) + 15, text);
    const z = sh.pointAt(line, 0.625);
    const w = mp.pointOnPieces(img, 0.625);
    dot(z, text, 4.5);
    dot(w, text, 4.5);
    label('z = 2 + i', X(z.re) - 58, Y(z.im) - 6, text);
    label('w = 3 + 4i', X(w.re) + 9, Y(w.im) + 4, text); // right of the curve, clear of the image
    label('t = 0', X(2) - 36, Y(-4) + 12, text);
    label('t = 1', X(2) - 36, Y(4) + 4, text);
    window.__cm.proof = { z, w };
  });
  // the seam figure: the loop around 0 and its image in two pieces, the cut ends ringed
  await page.evaluate(() => {
    const { sh, mp } = window.__cm;
    const cv = document.getElementById('cm-seam');
    const g = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const tok = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const input = tok('--input', '#2563eb');
    const output = tok('--output', '#d97706');
    const muted = tok('--text-muted', '#666666');
    const text = tok('--text', '#111111');
    const surface = tok('--surface', '#ffffff');
    const S = 68;
    const X = (x) => 100 + S * x;
    const Y = (y) => 100 - S * y;
    g.fillStyle = surface;
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = muted;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, Y(0));
    g.lineTo(cv.width, Y(0));
    g.moveTo(X(0), 0);
    g.lineTo(X(0), cv.height);
    g.stroke();
    const psqrt = (z) => {
      const r = Math.sqrt(Math.hypot(z.re, z.im));
      const th = Math.atan2(z.im, z.re) / 2;
      return { re: r * Math.cos(th), im: r * Math.sin(th) };
    };
    const loop = sh.rect({ re: -1, im: -0.8 }, { re: 1, im: 0.8 });
    const pieces = mp.pushForward(loop, psqrt);
    const stroke = (pts, color, w) => {
      g.strokeStyle = color;
      g.lineWidth = w;
      g.lineJoin = 'round';
      g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(X(p.re), Y(p.im)) : g.moveTo(X(p.re), Y(p.im))));
      g.stroke();
    };
    stroke(loop.points, input, 2);
    for (const pc of pieces) stroke(pc.points, output, 2.5);
    for (const pc of pieces) {
      for (const p of [pc.points[0], pc.points[pc.points.length - 1]]) {
        g.fillStyle = surface;
        g.strokeStyle = text;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(X(p.re), Y(p.im), 3.5, 0, 2 * Math.PI);
        g.fill();
        g.stroke();
      }
    }
    window.__cm.seamPieces = pieces.length;
  });
  const pair = await page.evaluate(() => window.__cm.proof);
  assert(Math.abs(pair.z.re - 2) < 1e-9 && Math.abs(pair.z.im - 1) < 1e-9, 'proof sheet z = 2 + i at t = 0.625');
  assert(Math.abs(pair.w.re - 3) < 1e-9 && Math.abs(pair.w.im - 4) < 1e-9, 'proof sheet w = 3 + 4i at t = 0.625');
  await shot('proof-sheet');

  // ---- 10. destroy ------------------------------------------------------------
  const gone = await page.evaluate(async () => {
    const d = window.__cm.dcId;
    d.render('drag');
    d.destroy();
    const a = d.info();
    let threw = false;
    let rendered = null;
    try { rendered = d.render(); d.destroy(); } catch (e) { threw = true; }
    const cv = document.createElement('canvas');
    cv.width = 100;
    cv.height = 100;
    const fresh = window.__cm.dc.createDomainColoring(cv, { f: (z) => z, xRange: [-1, 1], yRange: [-1, 1] });
    fresh.render('drag');
    fresh.destroy();
    await new Promise((r) => setTimeout(r, 400));
    return { destroyed: a.destroyed, pending: a.pending, threw, rendered, freshPending: fresh.info().pending, freshState: fresh.info().state, dsPending: cv.dataset.dcPending };
  });
  assert(gone.destroyed === true && gone.pending === false, 'destroy() clears pending');
  assert(gone.threw === false && gone.rendered === false, 'render after destroy returns false and does not throw');
  assert(gone.freshPending === false && gone.freshState === 'destroyed' && gone.dsPending === undefined,
    'destroy during a pending refine leaves no timer');
}
