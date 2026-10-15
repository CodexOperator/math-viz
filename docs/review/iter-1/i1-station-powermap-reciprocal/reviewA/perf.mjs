import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await settle(page, 4);
  if (ctx.route === 'problem-2-1-2') {
    const r = await page.evaluate(async () => {
      const set = (id, v) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
      const out = {};
      let t0 = performance.now();
      for (const n of [6, 5, 4, 3, 2, 6]) set('powermap-n', n);
      out.nSlider6x = (performance.now() - t0) / 6;
      // morph sweep with n=6 cart grid, measure frame deltas
      set('powermap-n', 6);
      const deltas = [];
      await new Promise((res) => { let last = performance.now(), i = 0; const tick = (now) => { deltas.push(now - last); last = now; set('powermap-morph', (i % 100) / 100); if (++i < 90) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      deltas.sort((a, b) => a - b);
      out.morphFrameMedian = deltas[Math.floor(deltas.length / 2)]; out.morphFrameP95 = deltas[Math.floor(deltas.length * 0.95)];
      return out;
    });
    ctx.log('perf ' + JSON.stringify(r));
  } else {
    const r = await page.evaluate(async () => {
      const set = (id, v) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
      const deltas = [];
      await new Promise((res) => { let last = performance.now(), i = 0; const tick = (now) => { deltas.push(now - last); last = now; set('reciprocal-morph', (i % 100) / 100); if (++i < 90) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      deltas.sort((a, b) => a - b);
      return { morphFrameMedian: deltas[Math.floor(deltas.length / 2)], p95: deltas[Math.floor(deltas.length * 0.95)] };
    });
    ctx.log('perf ' + JSON.stringify(r));
  }
}
