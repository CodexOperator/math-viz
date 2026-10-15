import { clickChip } from '../../../../../tests/interact/_helpers.mjs';
const framing = (page) => page.evaluate(() => {
  const view = [...window.__mv.views3d.values()].find((v) => v.camera && v.renderer && !v.unavailable);
  if (!view) return null;
  const cam = view.camera; cam.updateMatrixWorld(true);
  const V = cam.matrixWorldInverse.elements, P = cam.projectionMatrix.elements;
  let worst = 0, n = 0;
  view.scene.traverse((o) => {
    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (o.isSprite) {
      o.updateWorldMatrix(true, false); const c = o.matrixWorld.elements, x = c[12], y = c[13], z = c[14];
      const vx = V[0]*x+V[4]*y+V[8]*z+V[12], vy = V[1]*x+V[5]*y+V[9]*z+V[13], vz = V[2]*x+V[6]*y+V[10]*z+V[14], vw = V[3]*x+V[7]*y+V[11]*z+V[15];
      const sx = Math.hypot(c[0],c[1],c[2])/2, sy = Math.hypot(c[4],c[5],c[6])/2;
      for (const [dx,dy] of [[-sx,-sy],[sx,-sy],[-sx,sy],[sx,sy]]) {
        const cx = P[0]*(vx+dx)+P[4]*(vy+dy)+P[8]*vz+P[12]*vw, cy = P[1]*(vx+dx)+P[5]*(vy+dy)+P[9]*vz+P[13]*vw, cw = P[3]*(vx+dx)+P[7]*(vy+dy)+P[11]*vz+P[15]*vw;
        worst = Math.max(worst, Math.abs(cx/cw), Math.abs(cy/cw)); n++;
      }
      return;
    }
    if (!pos || o.visible === false || !(o.isMesh || o.isLine)) return;
    o.updateWorldMatrix(true, false); const M = o.matrixWorld.elements;
    const step = Math.max(1, Math.floor(pos.count / 800));
    for (let i = 0; i < pos.count; i += step) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (![x,y,z].every(Number.isFinite)) continue;
      const wx = M[0]*x+M[4]*y+M[8]*z+M[12], wy = M[1]*x+M[5]*y+M[9]*z+M[13], wz = M[2]*x+M[6]*y+M[10]*z+M[14];
      const vx = V[0]*wx+V[4]*wy+V[8]*wz+V[12], vy = V[1]*wx+V[5]*wy+V[9]*wz+V[13], vz = V[2]*wx+V[6]*wy+V[10]*wz+V[14], vw = V[3]*wx+V[7]*wy+V[11]*wz+V[15];
      const cx = P[0]*vx+P[4]*vy+P[8]*vz+P[12]*vw, cy = P[1]*vx+P[5]*vy+P[9]*vz+P[13]*vw, cw = P[3]*vx+P[7]*vy+P[11]*vz+P[15]*vw;
      worst = Math.max(worst, Math.abs(cx/cw), Math.abs(cy/cw)); n++;
    }
  });
  const cv = view.renderer.domElement; const r = cv.getBoundingClientRect();
  return { worst: Number(worst.toFixed(3)), n, w: Math.round(r.width), h: Math.round(r.height) };
});
export default async function (page, ctx) {
  const { assert, log, shot, viewport } = ctx;
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} location.hash = '#lab-2-5-1'; });
  await page.waitForTimeout(1000);
  for (const v of ['sphere', 'landscape', 'graph4d']) {
    await clickChip(page, 'lab-view-' + v); await page.waitForTimeout(500);
    const a = await framing(page);
    log(`${v} at ${viewport.width}: ${JSON.stringify(a)}`);
    // resize to the other size and back
    const other = viewport.width > 600 ? { width: 390, height: 844 } : { width: 1280, height: 860 };
    await page.setViewportSize(other); await page.waitForTimeout(700);
    const b = await framing(page);
    log(`${v} resized to ${other.width}: ${JSON.stringify(b)}`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height }); await page.waitForTimeout(700);
    const c = await framing(page);
    log(`${v} back at ${viewport.width}: ${JSON.stringify(c)}`);
    for (const f of [a, b, c]) assert(f && f.worst <= 1.0 && f.worst > 0.4, `${v} framing ${JSON.stringify(f)}`);
  }
  // large rectangle under z^2 in the landscape: 4 x 4
  await page.evaluate(() => { location.hash = '#lab'; });
  await page.waitForTimeout(900);
  await page.evaluate(() => { localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'sq', shapes: [{ kind: 'rect', a: { re: -4, im: -4 }, b: { re: 4, im: 4 } }], view: 'landscape', predictFirst: false })); location.hash = '#home'; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#lab'; });
  await page.waitForTimeout(1200);
  const d = await framing(page);
  log('big rect landscape ' + JSON.stringify(d));
  assert(d && d.worst <= 1.0, 'big rect landscape framing ' + JSON.stringify(d));
  await shot('bigrect-landscape');
}
