import { clickChip, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  if (route === 'problem-P7') await clickChip(page, 'cauchy-riemann-paths');
  await settle(page, 3);
  const res = await page.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view [tabindex]')) {
      const id = e.id;
      const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.getAttribute('aria-labelledby') || e.textContent || e.title || '').trim();
      const hidden = e.closest('[hidden]') !== null || getComputedStyle(e).display === 'none';
      if (hidden) continue;
      if (!id || !name) out.push(`${e.tagName.toLowerCase()} id="${id}" name="${name.slice(0, 30)}" cls=${e.className}`);
    }
    return out;
  });
  log('controls without id or name: ' + JSON.stringify(res));
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^#[A-Za-z0-9._~-]+$/.test(h)));
  log('non-route hrefs: ' + JSON.stringify(hrefs));
  const ext = await page.evaluate(() => [...document.querySelectorAll('#view [src], #view link')].map((e) => e.src || e.href).filter(Boolean));
  log('src/link in view: ' + JSON.stringify(ext));
  const h1 = await page.evaluate(() => document.querySelectorAll('h1').length);
  log('h1 count: ' + h1);
  assert(h1 === 1, 'one h1');
}
