export default async function (page, ctx) {
  const { route, log } = ctx;
  if (route === 'problem-2-2-2' || route === 'principal-root') {
    log(JSON.stringify(await page.evaluate(() => window.__mv.principalRoot.state())));
    log('picknote: ' + await page.evaluate(() => document.querySelector('#principal-root-pick-note')?.textContent));
  } else {
    log(JSON.stringify(await page.evaluate(() => window.__mv.roots.state())));
  }
}
