import { settle, readText, clickChip, dragHandle, dragHandleAround } from '../../../../../tests/interact/_helpers.mjs';
async function typeChange(page, id, text) {
  await page.evaluate(({ id, text }) => { const el = document.getElementById(id); el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, { id, text });
  await settle(page, 4);
}
const val = (page, id) => page.evaluate((i) => document.getElementById(i).value, id);
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  const ok = (c, m) => { log((c ? 'PASS ' : 'FAIL ') + m); assert(c, m); };
  if (route !== 'addresses') return;
  await settle(page, 6);
  // Cartesian sweep against independent atan2
  const pts = [[-1, 1.732], [3, -2], [-1, 4], [0, 2], [-16, 0], [-0.5, -0.5], [1, 1], [0, -3], [-2, -0.001], [5, 0], [-2, 3.4641]];
  let bad = 0;
  for (const [x, y] of pts) {
    await typeChange(page, 'addresses-x', String(x)); await typeChange(page, 'addresses-y', String(y));
    const st = await page.evaluate(() => window.__mv.addresses.state());
    const r = Math.hypot(x, y); let th = Math.atan2(y, x); if (th <= -Math.PI) th = Math.PI;
    const okz = Math.abs(st.z.re - x) < 1e-9 && Math.abs(st.z.im - y) < 1e-9 && Math.abs(st.r - r) < 1e-9 && Math.abs(st.theta - th) < 1e-9;
    const ro = await readText(page, '#addresses-readout');
    const fmt = (v) => (Math.round(v * 1000) / 1000).toString();
    const wantArg = 'Arg z = ' + fmt(th);
    const okr = ro.includes('|z| = ' + fmt(r)) && ro.includes(wantArg);
    const agree = await page.evaluate(() => document.getElementById('addresses-ex-same').dataset.agree);
    if (!(okz && okr && agree === 'true')) { bad++; ok(false, `(${x},${y}) state ${JSON.stringify(st)} readout "${ro}" want |z|=${fmt(r)} ${wantArg} agree=${agree}`); }
  }
  ok(bad === 0, 'cartesian sweep of ' + pts.length + ' points: readout, Arg in (-pi, pi], agree footer');
  // polar typing: r then theta
  await clickChip(page, 'addresses-preset-1-i');
  const polarCases = [[2, '8pi/3', -1, Math.sqrt(3)], [3, '-pi', -3, 0], [1, 'pi', -1, 0], [5, '7*pi/4', 5 * Math.cos(7 * Math.PI / 4), 5 * Math.sin(7 * Math.PI / 4)], [2, '4pi/3', -1, -Math.sqrt(3)]];
  for (const [r, th, x, y] of polarCases) {
    await typeChange(page, 'addresses-r', String(r)); await typeChange(page, 'addresses-theta', th);
    const st = await page.evaluate(() => window.__mv.addresses.state());
    ok(Math.abs(st.z.re - x) < 1e-9 && Math.abs(st.z.im - y) < 1e-9, `polar (${r}, ${th}) -> z = ${JSON.stringify(st.z)} want (${x.toFixed(4)}, ${y.toFixed(4)})`);
    log('   readout: ' + (await readText(page, '#addresses-readout')) + ' | theta field ' + (await val(page, 'addresses-theta')) + ' | note: ' + (await readText(page, '#addresses-note')));
  }
  // -16 specifics
  await clickChip(page, 'addresses-preset-m16');
  log('m16 readout: ' + (await readText(page, '#addresses-readout')) + ' | stairs arg: ' + (await readText(page, '#addresses-stairs-arg')));
  const stairRows = await page.evaluate(() => [...document.querySelectorAll('[id^="addresses-stairs-k"]')].map((e) => e.id + ': ' + e.textContent.trim()));
  log('stair rows: ' + JSON.stringify(stairRows));
  const view = await page.evaluate(() => window.__mv.planes.get('addresses-plane').getView());
  log('m16 view: ' + JSON.stringify(view));
  // origin
  await typeChange(page, 'addresses-r', '0');
  log('origin readout: ' + (await readText(page, '#addresses-readout')) + ' | note: ' + (await readText(page, '#addresses-note')));
  ok((await readText(page, '#addresses-readout')).includes('Arg z = undefined'), 'z = 0 has undefined Arg');
  log('forms at origin: ' + (await readText(page, '#addresses-forms')).slice(0, 200));
  await typeChange(page, 'addresses-r', '2');
  log('after r=2 again: ' + (await readText(page, '#addresses-readout')));
  // seam crossing by dragging around a circle
  await clickChip(page, 'addresses-preset-sqrt3-i');
  const args = [];
  await dragHandleAround(page, 'addresses-plane-z', { radius: 2, startAngle: 2.8, turns: 0.15, steps: 40 }, async (pg) => { args.push((await pg.evaluate(() => window.__mv.addresses.state().theta))); });
  const jumps = args.filter((v, i) => i && Math.abs(v - args[i - 1]) > 3).length;
  log('seam sweep thetas min/max: ' + Math.min(...args).toFixed(3) + '/' + Math.max(...args).toFixed(3) + ' jumps ' + jumps);
  ok(jumps === 1 && Math.max(...args) <= Math.PI + 1e-9 && Math.min(...args) > -Math.PI, 'crossing the seam makes Arg jump once and stay in (-pi, pi]');
  // ghosts toggle and grid
  await clickChip(page, 'addresses-grid-both');
  const d1 = await page.evaluate(() => window.__mv.addresses.drawn());
  await page.evaluate(() => { const b = document.getElementById('addresses-ghosts'); b.click(); });
  await settle(page, 3);
  const d2 = await page.evaluate(() => window.__mv.addresses.drawn());
  log('ghosts drawn on/off: ' + JSON.stringify(d1) + ' / ' + JSON.stringify(d2));
  ok(d1.pos >= 1 && d2.pos === 0, 'ghost windings can be turned off');
  // handle label
  const lab = await page.evaluate(() => document.getElementById('addresses-plane-z').getAttribute('aria-label'));
  log('handle label: ' + lab);
  // unmount
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !(window.__mv && window.__mv.addresses)), 'addresses hook deleted on unmount');
}
