// Review B: width sweep of the real rendered map (label overlap, strand through label, ellipsis, overflow).
import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  if (ctx.route === 'home') {
    await page.waitForSelector('#home-map a.map-station');
    const widths = [320, 360, 390, 414, 600, 700, 759, 760, 820, 900, 1024, 1100, 1280, 1440, 1920];
    const rows = [];
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 });
      await settle(page, 6);
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const svg = document.getElementById('home-map');
        const texts = [...svg.querySelectorAll('text.map-label, text.map-part')].map((t) => {
          const b = t.getBBox();
          return { s: t.textContent.trim(), x: b.x, y: b.y, w: b.width, h: b.height };
        });
        const ov = [];
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 0.5 && oy > 0.5) ov.push([a.s, b.s]);
        }
        const hits = new Set();
        for (const p of svg.querySelectorAll('path.thread-line')) {
          const L = p.getTotalLength();
          for (let d = 0; d < L; d += 2) {
            const q = p.getPointAtLength(d);
            for (const t of texts) if (q.x > t.x - 1 && q.x < t.x + t.w + 1 && q.y > t.y - 1 && q.y < t.y + t.h + 1) hits.add(p.getAttribute('data-thread') + '~' + t.s);
          }
        }
        // station pills vs labels of other stations
        const pills = [...svg.querySelectorAll('rect.node-pill')].map((p) => { const b = p.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height, st: p.closest('a').getAttribute('data-station') }; });
        const labelPill = [];
        for (const a of svg.querySelectorAll('a.map-station')) {
          const st = a.getAttribute('data-station');
          const t = a.querySelector('text.map-label').getBBox();
          for (const p of pills) if (p.st !== st && t.x < p.x + p.w && t.x + t.width > p.x && t.y < p.y + p.h && t.y + t.height > p.y) labelPill.push([st, p.st]);
        }
        const vb = svg.viewBox.baseVal;
        const outside = texts.filter((t) => t.x < -0.5 || t.x + t.w > vb.width + 0.5).map((t) => t.s);
        const ellipsis = texts.filter((t) => t.s.includes('…')).map((t) => t.s);
        const doc = document.documentElement;
        return { mode: svg.getAttribute('data-mode'), hostW: document.getElementById('home-map-host').clientWidth, ov: ov.slice(0, 4), hits: [...hits].slice(0, 4), outside, ellipsis, labelPill, pageOverflow: doc.scrollWidth - doc.clientWidth };
      });
      rows.push({ w, ...r });
      log(`W=${w}: ${JSON.stringify(r)}`);
    }
    const bad = rows.filter((r) => r.ov.length || r.hits.length || r.outside.length || r.ellipsis.length || r.labelPill.length || r.pageOverflow > 1);
    assert(bad.length === 0, `map clean at every width: ${JSON.stringify(bad.map((b) => ({ w: b.w, ov: b.ov, hits: b.hits, outside: b.outside, ellipsis: b.ellipsis, lp: b.labelPill, po: b.pageOverflow })))}`);
    await page.setViewportSize({ width: 760, height: 900 });
    await settle(page, 6);
    await page.evaluate(() => document.getElementById('home-map').scrollIntoView({ block: 'start' }));
    await shot('map-760');
    await page.setViewportSize({ width: 1024, height: 900 });
    await settle(page, 6);
    await page.evaluate(() => document.getElementById('home-map').scrollIntoView({ block: 'start' }));
    await shot('map-1024');
  }
}
