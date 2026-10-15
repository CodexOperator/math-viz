import { settle } from '/home/user/math-viz/tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await settle(page, 4);
  const r = await page.evaluate(() => {
    const out = [];
    const root = document.getElementById('view') || document.body;
    for (const e of root.querySelectorAll('button, input, a[href], select, textarea, [role="button"], [tabindex]')) {
      const labelled = e.labels && e.labels.length ? [...e.labels].map((l) => l.textContent.trim()).join(' ') : '';
      const name = (e.getAttribute('aria-label') || labelled || e.getAttribute('aria-labelledby') || e.textContent.trim() || e.title || '').trim();
      if (!name) out.push(`${e.tagName}#${e.id}.${e.className} has no accessible name`);
    }
    // contrast-free: check focus-visible outline exists on handle buttons
    const hs = [...root.querySelectorAll('button.plane-handle, .plane-handle')].map((h) => h.id + ':' + (h.getAttribute('aria-label') || '').slice(0, 60));
    const h1 = root.querySelectorAll('h1').length;
    const headings = [...root.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ' ' + h.textContent.trim().slice(0, 40));
    const live = [...root.querySelectorAll('[aria-live]')].map((e) => e.id + '=' + e.getAttribute('aria-live'));
    const pressed = [...root.querySelectorAll('button.chip[aria-pressed]')].map((e) => e.id + '=' + e.getAttribute('aria-pressed'));
    return { out, hs, h1, headings, live, pressed };
  });
  ctx.log(JSON.stringify(r, null, 1));
}
