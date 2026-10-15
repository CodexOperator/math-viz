import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const r = await page.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view a[href], #view [tabindex]')) {
      const id = e.id || '';
      const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.textContent || e.title || '').trim().replace(/\s+/g, ' ');
      const lb = e.getAttribute('aria-labelledby'); const lbt = lb ? (document.getElementById(lb)?.textContent || '') : '';
      if (!(name || lbt)) out.push('NO NAME: ' + e.tagName + '#' + id + '.' + e.className);
      if (!id && e.tagName !== 'A') out.push('NO ID: ' + e.tagName + ' "' + name.slice(0, 30) + '"');
    }
    // dupe ids
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) out.push('DUP IDS: ' + [...new Set(dup)].join(','));
    // focus outline: tab through first controls
    return out;
  });
  ctx.log('a11y findings: ' + JSON.stringify(r));
}
