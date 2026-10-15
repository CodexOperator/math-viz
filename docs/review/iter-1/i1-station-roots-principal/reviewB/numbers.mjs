import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
const states = {
  roots: [
    [{re:1,im:0},5,0],[{re:1,im:0},5,3],[{re:-16,im:0},4,2],[{re:0,im:2},2,1],[{re:0,im:1},3,2],[{re:-9,im:0},2,1],
    [{re:0.3,im:-0.7},3,1],[{re:-1,im:1},5,2],[{re:0.5,im:0.5},3,0],[{re:3,im:4},2,1],[{re:-8,im:0},3,2],[{re:0.001,im:0},3,1],[{re:-2,im:-2},6,4]
  ],
  pr: [
    [{re:0,im:2},2,1],[{re:0,im:2},2,0],[{re:-1,im:0},2,1],[{re:-1,im:0},3,1],[{re:-3,im:-4},2,1],[{re:0.3,im:-0.7},3,2],[{re:40,im:0},3,1],[{re:-8,im:0},3,1],[{re:1,im:1},4,3]
  ]
};
export default async function (page, ctx) {
  const { route, log } = ctx;
  if (ctx.viewport && ctx.viewport.width < 600) return;
  const out = [];
  if (route === 'roots') {
    for (const [c, n, k] of states.roots) {
      await page.evaluate(([c, n, k]) => { const r = window.__mv.roots; r.setC(c.re, c.im); r.setN(n); r.select(k); }, [c, n, k]);
      await settle(page, 6);
      await page.waitForTimeout(150);
      const d = await page.evaluate(() => ({
        state: window.__mv.roots.state(),
        readout: document.querySelector('#roots-readout').textContent,
        list: [...document.querySelectorAll('#roots-list > li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
        note: document.querySelector('#roots-pick-note')?.textContent,
        heading: document.querySelector('#roots-ex-heading')?.textContent,
        cells: Object.fromEntries([...document.querySelectorAll('[id^="roots-ex-"][data-tex]')].map((e) => [e.id, e.dataset.tex])),
        same: document.querySelector('#roots-ex-same')?.textContent.slice(0, 40),
      }));
      out.push({ c, n, k, ...d });
    }
  } else if (route === 'principal-root') {
    for (const [w, n, k] of states.pr) {
      await page.evaluate(([w, n, k]) => { const r = window.__mv.principalRoot; r.setW(w.re, w.im); r.setN(n); r.select(k); }, [w, n, k]);
      await settle(page, 6);
      await page.waitForTimeout(150);
      const d = await page.evaluate(() => ({
        state: window.__mv.principalRoot.state(),
        readout: document.querySelector('#principal-root-readout').textContent,
        note: document.querySelector('#principal-root-pick-note')?.textContent,
        trap: document.querySelector('#principal-root-trap')?.textContent,
        cells: Object.fromEntries([...document.querySelectorAll('[id^="principal-root-ex-"][data-tex]')].map((e) => [e.id, e.dataset.tex])),
        same: document.querySelector('#principal-root-ex-same')?.textContent.slice(0, 40),
      }));
      out.push({ w, n, k, ...d });
    }
  }
  const fs = await import('node:fs');
  fs.writeFileSync(`/home/user/math-viz/docs/review/iter-1/i1-station-roots-principal/reviewB/numbers-${route}.json`, JSON.stringify(out, null, 1));
  log('wrote ' + out.length);
}
