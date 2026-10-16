// Review B throwaway: clipped screenshots of the new elements (card + chips + note, readout row + glyph) at the viewport the run uses.
import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const hash = async (route, state = 'ready') => {
    await page.evaluate((r) => { location.hash = r; }, route);
    await page.waitForFunction(([r, s]) => { const v = document.getElementById('view'); return !!v && v.dataset.state === s && v.dataset.route === r; }, [route, state], { timeout: 20000 });
    await settle(page, 4);
  };
  const clip = async (name, sels) => {
    const box = await page.evaluate((ss) => {
      const rs = ss.map((s) => document.querySelector(s)).filter(Boolean).map((e) => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height }; });
      if (!rs.length) return null;
      const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y)), x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
      return { x: Math.max(0, x0 - 8), y: Math.max(0, y0 - 8), width: x1 - x0 + 16, height: y1 - y0 + 16 };
    }, sels);
    if (!box) { ctx.log('no box for ' + name); return; }
    await page.screenshot({ path: `${process.cwd()}/docs/review/iter-2/i2-decisions-everywhere-a/reviewB/clips/${ctx.label}--${name}.png`, fullPage: true, clip: box });
  };
  const fresh = async (station, problem, values) => {
    await hash('nosuchplace', 'nosuchplace');
    await page.evaluate((req) => window.__mv.app.request(req), { station, problem, family: problem, values });
    await hash(station);
  };
  await hash('problem-1-3-1');
  await clip('addresses-card', ['#addresses-problem']);
  await clip('addresses-readout', ['#addresses-readout-row', '#addresses-glyph-note']);
  await fresh('addresses', '1.3.1', { z: { re: 0, im: 2 } });
  await clip('addresses-fresh-card', ['#addresses-problem']);
  await hash('problem-1-3-2');
  await clip('powers-card', ['#powers-problem']);
  await clip('powers-readout', ['#powers-readout-row', '#powers-glyph-note']);
  await fresh('powers', '1.3.2', { z: { re: Math.SQRT2, im: Math.SQRT2 }, n: 4 });
  await clip('powers-fresh-readout', ['#powers-readout-row']);
  await hash('problem-1-4-2');
  await clip('roots-card', ['#roots-problem']);
  await fresh('roots', '1.4.2', { c: { re: -64, im: 0 }, n: 3 });
  await clip('roots-fresh-card', ['#roots-problem', '#roots-problem-note']);
  await hash('problem-1-2-1');
  await clip('distance-card', ['#distance-problem-box', '#distance-problem-decisions']);
  await fresh('distance', '1.2.1', { mode: 'circle', a: { re: -4, im: 3 }, R: 4 });
  await clip('distance-fresh-card', ['#distance-problem-decisions', '#distance-problem-note']);
  await hash('problem-1-5-1');
  await clip('curves-card', ['#curves-problem']);
  await fresh('curves', '1.5.1', { a: { re: -5, im: 4 }, b: { re: 5, im: -4 } });
  await clip('curves-fresh-card', ['#curves-problem']);
}
