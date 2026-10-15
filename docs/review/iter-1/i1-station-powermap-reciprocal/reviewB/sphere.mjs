// Review B: the sphere frame at many widths, light and dark, with the pole projected independently.
import fs from 'node:fs';
import { setSlider } from '../../../../../tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  const out = 'docs/review/iter-1/i1-station-powermap-reciprocal/reviewB/sphere';
  fs.mkdirSync(out, { recursive: true });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    for (const [w, h] of [[1600, 900], [1280, 860], [900, 800], [640, 800], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(500);
      const el = await page.$('#reciprocal-sphere');
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      const info = await page.evaluate(() => {
        const v = window.__mv.views3d.get('reciprocal-sphere');
        const W = v.canvas.clientWidth, H = v.canvas.clientHeight;
        v.camera.updateMatrixWorld(true);
        let marker = null;
        v.scene.traverse((o) => { if (o.name === 'sphere-infinity') marker = o; });
        const px = (o) => { const p = o.position.clone(); o.getWorldPosition(p); p.project(v.camera); return { x: Math.round((p.x + 1) / 2 * W), y: Math.round((1 - p.y) / 2 * H) }; };
        const dot = marker && marker.children.find((o) => o.isMesh);
        const label = marker && marker.children.find((o) => o.userData && o.userData.text);
        return { W, H, dot: dot && px(dot), label: label && px(label), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      ctx.log(`${theme} ${w}: ${JSON.stringify(info)}`);
      const box = await (await page.$('#reciprocal-sphere')).screenshot({ path: `${out}/sphere-${theme}-${w}.png` });
    }
  }
}
