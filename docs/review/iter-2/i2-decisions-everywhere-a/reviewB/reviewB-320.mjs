import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  await page.setViewportSize({ width: 320, height: 700 });
  const hash = async (route, state = 'ready') => {
    await page.evaluate((r) => { location.hash = r; }, route);
    await page.waitForFunction(([r, s]) => { const v = document.getElementById('view'); return !!v && v.dataset.state === s && v.dataset.route === r; }, [route, state], { timeout: 20000 });
    await settle(page, 4);
  };
  const over = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const wide = () => page.evaluate(() => [...document.querySelectorAll('#view *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 && !e.closest('.tex-scroll, canvas, .katex-display') && getComputedStyle(e).position !== 'fixed' && e.getClientRects().length; }).slice(0, 4).map((e) => e.tagName + '#' + e.id + '.' + e.className));
  const reqs = { addresses: ['1.3.1', { z: { re: 0, im: 2 } }], distance: ['1.2.2', { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } }], powers: ['1.3.2', { z: { re: Math.SQRT2, im: Math.SQRT2 }, n: 4 }], roots: ['1.4.2', { c: { re: -81, im: 0 }, n: 4 }], curves: ['1.5.1', { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } }] };
  for (const [st, [pid, values]] of Object.entries(reqs)) {
    await hash(st);
    ctx.assert((await over()) <= 1, `${st} plain at 320: overflow ${await over()} ${JSON.stringify(await wide())}`);
    await hash('nosuchplace', 'nosuchplace');
    await page.evaluate((req) => window.__mv.app.request(req), { station: st, problem: pid, family: pid, values });
    await hash(st);
    ctx.assert((await over()) <= 1, `${st} fresh at 320: overflow ${await over()} ${JSON.stringify(await wide())}`);
    await page.click(`#${st}-problem-names`);
    ctx.assert((await over()) <= 1, `${st} meaning open at 320: overflow ${await over()}`);
    ctx.log(`${st} fits at 320`);
  }
}
