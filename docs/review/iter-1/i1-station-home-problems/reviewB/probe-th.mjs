export default async function (page, ctx) {
  if (ctx.route !== 'home') return;
  await page.waitForSelector('#home-map a.map-station');
  const r = await page.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('#view th, #view path')) {
      const b = e.getBoundingClientRect();
      if (b.width > 0 && b.right > document.documentElement.clientWidth + 1) {
        let anc = e, chain = [];
        while (anc && anc !== document.body) { const cs = getComputedStyle(anc); chain.push(`${anc.tagName}.${(anc.getAttribute('class')||'').slice(0,30)}[ox=${cs.overflowX}]`); anc = anc.parentElement; }
        out.push({ tag: e.tagName, text: (e.textContent||'').trim().slice(0, 30), right: Math.round(b.right), cw: document.documentElement.clientWidth, chain: chain.slice(0,8) });
      }
    }
    return out;
  });
  ctx.log(JSON.stringify(r));
}
