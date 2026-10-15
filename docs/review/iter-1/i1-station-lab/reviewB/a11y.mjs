import { clickChip } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { log, assert } = ctx;
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} location.hash = '#lab-2-5-1'; });
  await page.waitForTimeout(1000);
  await clickChip(page, 'lab-tool-probe');
  await clickChip(page, 'lab-view-sphere');
  await page.waitForTimeout(500);
  const scan = () => page.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view a[href], #view [role=tab], #view [tabindex]')) {
      if (e.offsetParent === null && !e.closest('[hidden]') ) {}
      const style = getComputedStyle(e); if (style.display === 'none' || style.visibility === 'hidden') continue;
      const id = e.id;
      const lab = (e.getAttribute('aria-label') || '') + (e.getAttribute('aria-labelledby') ? 'L' : '') + (e.labels && e.labels.length ? 'F' : '') + (e.textContent || '').trim() + (e.getAttribute('title') || '');
      if (e.tagName !== 'A' && (!id || !lab.trim())) out.push({ tag: e.tagName, id, cls: e.className && String(e.className).slice(0, 30), text: (e.textContent || '').trim().slice(0, 20), aria: e.getAttribute('aria-label') });
    }
    return out;
  });
  const bad = await scan();
  log('controls without id or name (side/sphere): ' + JSON.stringify(bad));
  // focus ring: tab through the first 30 stops and check an outline or box-shadow exists
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  let noRing = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); return { id: e.id || e.tagName, ring: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none') }; });
    if (r && !r.ring) noRing.push(r.id);
  }
  log('focus stops without outline or shadow: ' + JSON.stringify(noRing));
}
