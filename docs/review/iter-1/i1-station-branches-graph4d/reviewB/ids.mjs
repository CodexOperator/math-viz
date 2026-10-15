export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  const ids = ctx.route === 'branches'
    ? ['branches-seam','branches-n','branches-seam-principal','branches-seam-positive','branches-seam-negimag','branches-readout','branches-walk-along','branches-walk-across','branches-walk-status','branches-surface','branches-zplane-z']
    : ['graph4d-view','graph4d-fn-sq','graph4d-fn-sqrt-all','graph4d-fn-cbrt-all','graph4d-fn-recip','graph4d-fn-exp','graph4d-uv','graph4d-yv','graph4d-readout','graph4d-landscape','graph4d-sphere'];
  const r = await page.evaluate((ids) => ids.map((id) => { const e = document.getElementById(id); return e ? { id, tag: e.tagName, min: e.min, max: e.max, step: e.step, label: e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.textContent.slice(0, 30) } : { id, missing: true }; }), ids);
  ctx.log(JSON.stringify(r));
  ctx.log('planes: ' + await page.evaluate(() => [...window.__mv.planes.keys()].join(',')) + ' views: ' + await page.evaluate(() => [...window.__mv.views3d.keys()].join(',')));
}
