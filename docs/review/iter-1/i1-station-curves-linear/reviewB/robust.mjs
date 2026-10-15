import { settle, clickChip, setSlider } from '../../../../../tests/interact/_helpers.mjs';
const T = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
export default async function (page, ctx) {
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(500); await settle(page, 3); };
  const ovf = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const h1 = () => page.evaluate(() => [...document.querySelectorAll('h1')].map((e) => e.textContent));
  // 1. token and topic routes
  for (const h of ['#curves-circle', '#curves-square', '#curves-eight', '#curves-arc', '#curves-bogus', '#topic-T1-5', '#topic-T2-1', '#linear-stroke', '#linear-p4', '#linear-compose', '#linear-bogus', '#problem-1-5-1', '#problem-2-1-3', '#problem-P3', '#problem-P4', '#curves', '#linear']) {
    await go(h);
    const st = await page.evaluate(() => (window.__mv.curves ? 'curves:' + window.__mv.curves.state().preset : window.__mv.linear ? 'linear:' + window.__mv.linear.state().preset + '/' + window.__mv.linear.state().input : 'none'));
    const note = await page.evaluate(() => (document.getElementById('curves-note') && !document.getElementById('curves-note').hidden ? document.getElementById('curves-note').textContent : '') + (document.getElementById('linear-note-token')?.textContent || ''));
    ctx.log(`${h}: ${st} h1=${JSON.stringify(await h1())} overflow=${await ovf()} ${note ? 'note=' + note : ''}`);
    ctx.assert((await h1()).length === 1, h + ' exactly one h1');
    ctx.assert((await ovf()) <= 0, h + ' overflow');
  }
  // 2. leak check: hooks removed after leaving
  await go('#home');
  const left = await page.evaluate(() => ({ c: !!window.__mv.curves, l: !!window.__mv.linear, li: !!window.__mv.linearImage, planes: [...(window.__mv.planes?.keys?.() || [])] }));
  ctx.log('after leaving: ' + JSON.stringify(left));
  ctx.assert(!left.c && !left.l && !left.li, 'hooks removed on unmount');
  ctx.assert(!left.planes.some((p) => /^(curves|linear)/.test(p)), 'planes destroyed: ' + left.planes);
  // 3. widths
  for (const w of [320, 360, 375, 414]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const h of ['#curves', '#problem-1-5-1', '#problem-2-1-3', '#problem-P3', '#problem-P4']) {
      await go(h);
      await page.evaluate(() => { for (const id of ['curves-problem-working', 'curves-problem-answer', 'linear-problem-working', 'linear-problem-answer']) { const e = document.getElementById(id); if (e) e.open = true; } });
      await page.waitForTimeout(300);
      const o = await ovf();
      if (o > 0) { const who = await page.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('#view *')].filter((e) => e.getBoundingClientRect().right > W + 1 && !e.closest('.tex-scroll, .katex-display, pre, .explainer-scroll, .scroll-x, [style*="overflow"]')).slice(0, 4).map((e) => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right)); }); ctx.log(`w=${w} ${h}: overflow ${o}: ${JSON.stringify(who)}`); }
      ctx.assert(o <= 0, `w=${w} ${h}: horizontal page overflow ${o}`);
    }
  }
  await page.setViewportSize(ctx.viewport?.width ? { width: ctx.viewport.width, height: ctx.viewport.height || 800 } : { width: 1280, height: 800 });
  // 4. play
  await go('#problem-1-5-1');
  await clickChip(page, 'curves-play');
  await page.waitForTimeout(1500);
  let t1 = await page.evaluate(() => window.__mv.curves.state().t);
  ctx.log('after 1.5s of play t=' + t1 + ' button=' + await T(page, '#curves-play'));
  ctx.assert(t1 > 0.15 && t1 < 0.5, 'play advances t');
  await clickChip(page, 'curves-play'); // pause
  const tp = await page.evaluate(() => window.__mv.curves.state().t); await page.waitForTimeout(400);
  ctx.assert(tp === await page.evaluate(() => window.__mv.curves.state().t), 'pause holds');
  ctx.log('paused label=' + await T(page, '#curves-play'));
  await clickChip(page, 'curves-play'); await page.waitForTimeout(5600);
  ctx.log('after finish: t=' + await page.evaluate(() => window.__mv.curves.state().t) + ' label=' + await T(page, '#curves-play'));
  // linear play
  await go('#problem-2-1-3');
  await clickChip(page, 'linear-play'); await page.waitForTimeout(800);
  ctx.log('linear mid-play stage=' + await page.evaluate(() => window.__mv.linear.state().stage) + ' label=' + await T(page, '#linear-play'));
  await page.waitForTimeout(4500);
  ctx.log('linear after play stage=' + await page.evaluate(() => window.__mv.linear.state().stage) + ' label=' + await T(page, '#linear-play'));
  // 5. reduced motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go('#problem-1-5-1');
  ctx.log('reduced: curves play label=' + await T(page, '#curves-play'));
  await clickChip(page, 'curves-play'); await settle(page, 3);
  ctx.log('reduced: after 1 step t=' + await page.evaluate(() => window.__mv.curves.state().t));
  ctx.assert(await page.evaluate(() => window.__mv.curves.state().t) === 0.25, 'reduced steps by 1/4');
  await go('#problem-2-1-3');
  ctx.log('reduced: linear play label=' + await T(page, '#linear-play'));
  await clickChip(page, 'linear-play'); await settle(page, 3);
  ctx.log('reduced: linear stage after click=' + await page.evaluate(() => window.__mv.linear.state().stage));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}
