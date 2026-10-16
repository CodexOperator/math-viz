// Review B throwaway: edge-case requests on the five stations: no console error, no overflow, a sensible note.
import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { assert, log } = ctx;
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const hash = async (route, state = 'ready') => {
    await page.evaluate((r) => { location.hash = r; }, route);
    await page.waitForFunction(([r, s]) => { const v = document.getElementById('view'); return !!v && v.dataset.state === s && v.dataset.route === r; }, [route, state], { timeout: 20000 });
    await settle(page, 3);
  };
  const cases = [
    ['addresses', '1.3.1', { z: { re: 0, im: 0 } }, ['#addresses-readout', '#addresses-glyph']],
    ['addresses', '1.3.1', { z: { re: 100, im: -100 } }, ['#addresses-readout']],
    ['addresses', '1.3.1', { z: { re: 101, im: 0 } }, ['#addresses-readout']],
    ['addresses', null, { z: { re: 1e-12, im: 0 } }, ['#addresses-readout']],
    ['powers', '1.3.2', { z: { re: 0, im: 0 }, n: 5 }, ['#powers-readout', '#powers-glyph']],
    ['powers', '1.3.2', { z: { re: 4.2, im: -4.2 }, n: 12 }, ['#powers-readout', '#powers-glyph']],
    ['powers', '1.3.2', { z: { re: 5, im: 0 }, n: 3 }, ['#powers-readout']],
    ['powers', '1.3.2', { n: 1 }, ['#powers-readout']],
    ['roots', '1.4.1', { c: { re: 0, im: 0 }, n: 3 }, ['#roots-readout']],
    ['roots', '1.4.1', { c: { re: 1, im: 0 }, n: 12 }, ['#roots-readout']],
    ['roots', '1.4.1', { n: 2 }, ['#roots-readout']],
    ['roots', '1.4.3', { quadratic: { a: 0, b: 1, c: 1 } }, ['#roots-readout']],
    ['roots', '1.4.3', { quadratic: { a: 2, b: -4, c: 2 } }, ['#roots-quadratic-readout', '#roots-readout']],
    ['roots', '1.4.3', { quadratic: { a: 1, b: 0, c: 1e6 } }, ['#roots-quadratic-readout', '#roots-readout']],
    ['distance', '1.2.1', { mode: 'circle', R: 0.25 }, ['#distance-readout']],
    ['distance', '1.2.1', { mode: 'circle', a: { re: 40, im: -40 }, R: 20 }, ['#distance-readout']],
    ['distance', '1.2.2', { mode: 'two', z1: { re: 0, im: 0 }, z2: { re: 0, im: 0 } }, ['#distance-readout']],
    ['distance', '1.2.2', { mode: 'triangle', z1: { re: 3, im: 0 }, z2: { re: 0, im: 4 } }, ['#distance-readout']],
    ['distance', null, { mode: 'two', z1: { re: 3, im: 0 } }, ['#distance-readout']],
    ['curves', '1.5.1', { a: { re: 1, im: 1 }, b: { re: 1, im: 1 } }, ['#curves-readout']],
    ['curves', '1.5.1', { a: { re: 50, im: 50 }, b: { re: -50, im: -50 } }, ['#curves-readout']],
    ['curves', '1.5.1', { a: { re: 51, im: 0 }, b: { re: 0, im: 0 } }, ['#curves-readout']],
  ];
  for (const [st, pid, values, sels] of cases) {
    await hash('nosuchplace', 'nosuchplace');
    await page.evaluate((req) => window.__mv.app.request(req), { station: st, problem: pid, family: pid, values });
    await hash(st);
    const out = [];
    for (const s of sels) out.push(s + '=' + (await page.evaluate((q) => { const e = document.querySelector(q); return e ? (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 110) : 'MISSING'; }, s)));
    const note = (await text(`#${st}-problem-note`)) || '';
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    log(`${st} ${JSON.stringify(values)} -> ${out.join(' | ')} | note:${note ? 'yes' : 'no'}${over > 1 ? ' OVERFLOW ' + over : ''}`);
    assert(over <= 1, `overflow ${over} for ${st} ${JSON.stringify(values)}`);
    assert(!out.some((o) => o.endsWith('MISSING')) , `missing ${out.join(' | ')}`);
    assert(!out.some((o) => /NaN|undefined|Infinity/.test(o)), `bad number: ${out.join(' | ')}`);
  }
  assert(errors.length === 0, 'console errors: ' + errors.slice(0, 3).join(' | '));
}
