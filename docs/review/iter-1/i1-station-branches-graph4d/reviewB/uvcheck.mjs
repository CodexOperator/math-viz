import fs from 'node:fs';
import path from 'node:path';
import { clickChip, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
const OUT = path.resolve('docs/review/iter-1/i1-station-branches-graph4d/reviewB/uvcheck');
fs.mkdirSync(OUT, { recursive: true });
export default async function (page, ctx) {
  if (ctx.route !== 'graph4d' || ctx.label !== 'desktop') return;
  await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
  const loc = page.locator('#graph4d-view');
  await loc.scrollIntoViewIfNeeded();
  const take = async (name) => { await settle(page, 10); await page.waitForTimeout(600); await loc.screenshot({ path: path.join(OUT, name + '.png') }); };
  const st = () => page.evaluate(() => { const g = window.__mv.graph4d; return { uv: g.uv, yv: g.yv, mode: g.mode, version: g.version, ro: document.getElementById('graph4d-readout').textContent }; });
  await clickChip(page, 'graph4d-fn-cbrt-all');
  ctx.log('after preset: ' + JSON.stringify(await st()));
  await take('a-uv0');
  await setSlider(page, 'graph4d-uv', Math.PI / 2);
  ctx.log('after uv=90: ' + JSON.stringify(await st()));
  await take('b-uv90');
  await setSlider(page, 'graph4d-uv', Math.PI);
  ctx.log('after uv=180: ' + JSON.stringify(await st()));
  await take('c-uv180');
  await setSlider(page, 'graph4d-yv', Math.PI / 2);
  ctx.log('after yv=90: ' + JSON.stringify(await st()));
  await take('d-yv90');
  const v = await page.evaluate(() => { const view = window.__mv.views3d.get('graph4d-view'); const out = []; view.scene.traverse((o) => { if (o.isMesh && o.geometry) { const p = o.geometry.attributes.position; out.push({ name: o.name, n: p.count, first: [p.getX(0), p.getY(0), p.getZ(0)].map((x) => +x.toFixed(3)), mid: [p.getX(1000), p.getY(1000), p.getZ(1000)].map((x) => +x.toFixed(3)) }); } }); return out; });
  ctx.log(JSON.stringify(v));
}
