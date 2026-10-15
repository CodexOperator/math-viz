import fs from 'node:fs';
export default async function (page, ctx) {
  const t = await page.evaluate(() => document.querySelector('#view').innerText);
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href') + ' | ' + a.textContent.trim().slice(0, 50)));
  const ids = await page.evaluate(() => [...document.querySelectorAll('#view [id]')].filter((e) => /^(button|input|a)$/i.test(e.tagName) || e.getAttribute('role')).map((e) => e.tagName.toLowerCase() + '#' + e.id + (e.getAttribute('aria-label') || e.labels?.[0]?.textContent ? ' label=' + (e.getAttribute('aria-label') || e.labels[0].textContent.trim().slice(0, 30)) : ' NOLABEL')));
  const unlabeled = ids.filter((x) => x.includes('NOLABEL') && !x.startsWith('a#'));
  fs.writeFileSync(`/home/user/math-viz/docs/review/iter-1/i1-station-limits-derivative/reviewB/text-${ctx.route}-${ctx.viewport?.name || ctx.viewport}.txt`, t + '\n\nHREFS\n' + hrefs.join('\n') + '\n\nCONTROLS\n' + ids.join('\n') + '\n\nUNLABELED\n' + unlabeled.join('\n'));
  const emoji = /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(t);
  ctx.assert(!emoji, 'emoji in text');
}
