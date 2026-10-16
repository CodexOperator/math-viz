export const expectedErrors = [/media\/audio\/site\/staircase\/intro/, /Failed to load resource/, /media\/audio\/site\/staircase\/nope/];
export default async function (page, ctx) {
  const { assert, log } = ctx;
  await page.evaluate(async () => {
    const L = await import(new URL('./js/core/listen.js', location.href).href);
    const host = document.createElement('div'); host.id = 'revB'; document.getElementById('view').appendChild(host);
    const M = { VIDEOS: [], SITE_AUDIO: { staircase: { clips: [{ id: 'intro', text: 't', src: 'media/audio/site/staircase/intro.mp3' }] } } };
    window.__l = await L.listenControl(host, 'staircase', { manifest: M });
    window.__ev = [];
    window.__l.el.addEventListener('listen:stop', e => window.__ev.push(e.detail.reason));
  });
  await page.click('#staircase-listen');
  await page.waitForFunction(() => document.getElementById('staircase-listen').dataset.state === 'error', null, { timeout: 5000 });
  const a = await page.evaluate(() => ({ st: document.getElementById('staircase-listen').dataset.state, pr: document.getElementById('staircase-listen').getAttribute('aria-pressed'), txt: (document.getElementById('staircase-listen-error')||{}).textContent, n: document.querySelectorAll('#staircase-listen-error').length, ev: window.__ev.slice(), mark: document.querySelector('#staircase-listen .listen-mark').textContent }));
  log(JSON.stringify(a));
  assert(a.st === 'error' && a.pr === 'false' && a.n === 1, 'error state shown once');
  await page.click('#staircase-listen');
  await page.waitForFunction(() => window.__ev.length >= 2 || document.getElementById('staircase-listen').dataset.state === 'error', null, { timeout: 5000 });
  await page.waitForTimeout(500);
  const b = await page.evaluate(() => ({ st: document.getElementById('staircase-listen').dataset.state, n: document.querySelectorAll('#staircase-listen-error').length, ev: window.__ev.slice() }));
  log(JSON.stringify(b));
  assert(b.st === 'error' && b.n === 1, 'retry returns to error, one line');
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(ov <= 1, 'no overflow');
  await page.evaluate(() => { window.__l.destroy(); document.getElementById('revB').remove(); });
}
