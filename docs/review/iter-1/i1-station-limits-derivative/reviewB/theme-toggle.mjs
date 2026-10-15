export default async function (page, ctx) {
  if (ctx.viewport?.name && ctx.viewport.name !== 'desktop') return;
  const sample = () => page.evaluate(() => {
    const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
    const out = {};
    for (const [id, p] of window.__mv.planes) if (/^(limits|derivative)-/.test(id)) out[id] = hash(p.canvas.toDataURL());
    const tex = [...document.querySelectorAll('#view [data-tex]')].map((e) => e.dataset.tex).join('|');
    const katexColors = [...document.querySelectorAll('#view .katex [style*="color"]')].map((e) => e.style.color);
    return { out, texHash: hash(tex), katexColors: [...new Set(katexColors)].slice(0, 6) };
  });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.evaluate(() => document.dispatchEvent(new Event('themechange')));
  await page.waitForTimeout(600);
  const a = await sample();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => document.dispatchEvent(new Event('themechange')));
  await page.waitForTimeout(600);
  const b = await sample();
  ctx.log('light: ' + JSON.stringify(a));
  ctx.log('dark: ' + JSON.stringify(b));
  for (const id of Object.keys(a.out)) ctx.assert(a.out[id] !== b.out[id], `plane ${id} did not redraw on theme change`);
  ctx.assert(JSON.stringify(a.katexColors) !== JSON.stringify(b.katexColors) || a.texHash !== b.texHash, 'explainer tints did not change with the theme');
}
