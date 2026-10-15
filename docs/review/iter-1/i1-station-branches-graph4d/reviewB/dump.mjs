import { dragHandle, clickChip, setSlider, settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  if (ctx.label !== 'desktop') return;
  const dump = async (tag) => {
    await settle(page, 6); await page.waitForTimeout(500);
    const t = await page.evaluate(() => {
      const out = {};
      out.readout = document.querySelector('#branches-readout, #graph4d-readout')?.textContent;
      out.ex = [...document.querySelectorAll('[id$="-cart"],[id$="-polar"]')].filter((e) => /^(branches|graph4d)-ex/.test(e.id)).map((e) => e.id + ' :: ' + (e.dataset.tex || e.textContent));
      out.stairs = document.querySelector('#branches-stairs-list')?.innerText;
      out.set = document.querySelector('#branches-stairs-set')?.textContent;
      out.status = document.querySelector('#branches-walk-status')?.textContent;
      out.zlabel = document.querySelector('#branches-zplane-z')?.getAttribute('aria-label');
      return out;
    });
    ctx.log('--- ' + tag + '\n' + JSON.stringify(t, null, 1));
  };
  if (ctx.route === 'branches') {
    await page.waitForSelector('#branches-readout');
    await dump('default');
    await dragHandle(page, 'branches-zplane-z', { re: 1, im: 1 });
    await dump('z=1+i principal');
    await clickChip(page, 'branches-seam-positive');
    await dump('z=1+i seam0');
    await dragHandle(page, 'branches-zplane-z', { re: -1, im: -1 });
    await dump('z=-1-i seam0');
    await clickChip(page, 'branches-seam-principal');
    await dump('z=-1-i principal');
    await setSlider(page, 'branches-n', 5);
    await dump('n=5 z=-1-i principal');
    await dragHandle(page, 'branches-zplane-z', { re: 0, im: 0 });
    await dump('z=0');
  }
  if (ctx.route === 'graph4d') {
    await page.waitForFunction(() => !!window.__mv && !!window.__mv.graph4d);
    await dump('default');
    await clickChip(page, 'graph4d-fn-cbrt-all');
    await dump('cbrt-all');
    await clickChip(page, 'graph4d-fn-recip');
    await dump('recip');
  }
}
