export default async function (page, ctx) {
  await page.evaluate(async () => {
    const g = await import('./js/core/moveglyph.js');
    const host = document.createElement('div'); host.id = 'rb-g'; host.style.cssText = 'display:flex;gap:18px;flex-wrap:wrap;padding:12px;background:var(--surface);align-items:flex-end';
    document.getElementById('view').append(host);
    const zs = [{ re: -1, im: Math.sqrt(3) }, { re: 1, im: 0 }, 0, { re: 3, im: 0.5 }, { re: 0, im: -2 }, { re: -Math.SQRT2, im: -Math.SQRT2 }, { re: 3, im: -2 }];
    for (const z of zs) { const cell = document.createElement('div'); cell.style.cssText = 'text-align:center;font-size:12px;max-width:120px'; cell.append(g.moveGlyph(z, { size: '110px' }), document.createElement('br'), g.glyphText(z)); host.append(cell); }
    const line = document.createElement('p'); line.id = 'rb-inline'; line.style.fontSize = '1.1rem'; line.append('z = −1 + 1.732i ', g.moveGlyph({ re: -1, im: Math.sqrt(3) }), '  and 1.1em in a sentence: 3 − 2i ', g.moveGlyph({ re: 3, im: -2 })); host.append(line);
  });
  await page.locator('#rb-g').screenshot({ path: `docs/review/iter-2/i2-decisions-kit/reviewB/glyph/glyph-${ctx.label}.png` });
}
