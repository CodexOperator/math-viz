export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  const want = route === 'roots' ? ['roots-plane','roots-plane-c','roots-n','roots-preset-1','roots-preset-m16','roots-preset-i','roots-preset-2i','roots-stairs','roots-list','roots-root-0','roots-readout','roots-raise','roots-quadratic','roots-qa','roots-qb','roots-qc','roots-quadratic-readout','roots-ex','roots-problem-slot']
    : ['principal-root-plane','principal-root-plane-w','principal-root-n','principal-root-stairs','principal-root-readout','principal-root-ex','principal-root-sweep','principal-root-sweep-readout','principal-root-zoom','principal-root-problem-slot'];
  if (route !== 'roots' && route !== 'principal-root') return;
  const missing = await page.evaluate((want) => want.filter((id) => !document.getElementById(id) && !document.querySelector(`[data-plane-id="${id}"]`) && !document.querySelector(`[data-explainer-id="${id}"]`) && !document.querySelector(`[data-staircase-id="${id}"]`)), want);
  log('missing: ' + JSON.stringify(missing));
  // accessibility: every button / input / select / [role=button] in #view has a name and an id
  const bad = await page.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view [role="button"], #view a[href]')) {
      if (e.closest('[inert]') || e.closest('[aria-hidden="true"]')) continue;
      const name = (e.getAttribute('aria-label') || e.textContent || '').trim() || (e.labels && e.labels.length ? e.labels[0].textContent.trim() : '') || e.getAttribute('title') || '';
      const lab = e.id && document.querySelector(`label[for="${e.id}"]`);
      if (!name && !lab) out.push('noname:' + e.tagName + '#' + e.id);
      if (!e.id && e.tagName !== 'A') out.push('noid:' + e.tagName + ' ' + (e.getAttribute('aria-label') || e.textContent || '').slice(0, 30));
    }
    return out;
  });
  log('a11y: ' + JSON.stringify(bad));
  // focusable but hidden/inert slot copies
  const slotFocusable = await page.evaluate(() => [...document.querySelectorAll('[id$="-problem-slot"] a, [id$="-problem-slot"] button')].filter((e) => !e.closest('[inert]') ).map((e) => e.textContent.trim().slice(0, 30)));
  log('focusable in slot (live copy only): ' + JSON.stringify(slotFocusable));
  // theme tokens: no inline literal colours in station DOM
  const lit = await page.evaluate(() => [...document.querySelectorAll('#view [style]')].map((e) => e.getAttribute('style')).filter((s) => /#[0-9a-f]{3,6}|rgb\(|hsl\(/i.test(s)).slice(0, 5));
  log('inline literal colours: ' + JSON.stringify(lit));
  assert(missing.length === 0, 'missing ids ' + missing);
}
