// Review A probe 2: the router with a values request, on every station and in awkward orders.
export const expectedErrors = [/station "rehearse" failed to load/, /rehearse/i, /Failed to load resource/];
export default async function (page, ctx) {
  const { log, assert } = ctx;
  const wait = (ms) => page.waitForTimeout(ms);
  const state = () => page.evaluate(() => ({ hash: location.hash, preset: window.__mv.app.preset(), view: document.querySelector('#view').dataset.state, station: document.querySelector('#view').dataset.station, err: !!document.querySelector('[data-station-error]'),
    stored: (() => { try { return window.__mv.appStoreProbe ? 1 : 0; } catch (e) { return -1; } })() }));
  const go = async (h, ms = 700) => { await page.evaluate((x) => { location.hash = x; }, h); await wait(ms); };
  const req = (r) => page.evaluate((x) => window.__mv.app.request(x), r);
  const out = {};

  // 1. every station gets a values request for itself: mounts, preset delivered once, no error panel (rehearse is expected to be under construction)
  const ids = await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
  out.each = [];
  for (const id of ids) {
    await go('#home', 250);
    await req({ station: id, problem: null, family: null, values: { z: { re: 1, im: 2 }, n: 3, junk: 'x', fn: 'z', z0: { re: 0, im: 0 } } });
    await go('#' + id, 900);
    const s = await state();
    out.each.push({ id, view: s.view, err: s.err, preset: s.preset && s.preset.kind, station: s.station });
  }
  log('each ' + JSON.stringify(out.each.filter((x) => x.view !== 'ready' || x.preset !== 'values')));

  // 2. a request for another station waits, then is consumed by its station
  await go('#home', 250);
  await req({ station: 'roots', problem: '1.4.2', family: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 } });
  await go('#curves', 700);
  let s = await state(); out.other = s.preset;
  await go('#roots', 700);
  s = await state(); out.then = s.preset && s.preset.values;
  log('other-station waits: ' + JSON.stringify({ curvesPreset: out.other, rootsValues: out.then }));

  // 3. navigate() to the page already shown re-mounts and a request made meanwhile is delivered
  await req({ station: 'roots', problem: null, family: null, values: { c: { re: 16, im: 0 }, n: 4 } });
  await page.evaluate(() => window.__mv.app.navigate('roots'));
  await wait(900);
  s = await state(); out.remount = s.preset && s.preset.values;
  log('remount: ' + JSON.stringify(out.remount));

  // 4. fast supersede: request for roots; go to #lab then immediately #roots
  await go('#home', 250);
  await req({ station: 'roots', problem: null, family: null, values: { c: { re: 1, im: 0 }, n: 5 } });
  await page.evaluate(() => { location.hash = '#lab'; setTimeout(() => { location.hash = '#roots'; }, 5); });
  await wait(1800);
  s = await state(); out.supersede = { station: s.station, preset: s.preset && s.preset.values, view: s.view };
  log('supersede: ' + JSON.stringify(out.supersede));

  // 5. a request for a station that does not exist, or has no module (rehearse): no crash on other pages; what is left behind
  await go('#home', 250);
  await req({ station: 'rehearse', problem: null, family: null, values: { a: 1 } });
  await go('#rehearse', 900);
  s = await state(); out.rehearse = { view: s.view, preset: s.preset };
  await go('#roots', 700);
  s = await state(); out.afterRehearse = { view: s.view, preset: s.preset };
  await go('#rehearse', 900);
  s = await state(); out.rehearse2 = { view: s.view, preset: s.preset };
  log('rehearse: ' + JSON.stringify([out.rehearse, out.afterRehearse, out.rehearse2]));

  // 6. frozen preset; mutation attempt throws in strict mode / is ignored
  await go('#home', 250);
  await req({ station: 'roots', problem: '1.4.2', family: null, values: { c: { re: -16, im: 0 }, n: 4 } });
  await go('#roots', 700);
  out.frozen = await page.evaluate(() => {
    const p = window.__mv.app.preset();
    const f = { top: Object.isFrozen(p), values: Object.isFrozen(p.values), c: Object.isFrozen(p.values.c) };
    try { 'use strict'; p.values.c.re = 5; } catch (e) { f.threw = true; }
    return f;
  });
  log('frozen: ' + JSON.stringify(out.frozen));

  // 7. hostile requests via the store directly: prototype keys, huge numbers, nested arrays, the hash preset beside a request
  await go('#home', 250);
  await page.evaluate(() => window.__mv.app.request(JSON.parse('{"station":"roots","problem":"1.4.2","family":"P1","values":{"__proto__":{"polluted":1},"c":{"re":1e308,"im":-1e308},"n":2}}')));
  await go('#roots', 700);
  out.hostile = await page.evaluate(() => ({ polluted: ({}).polluted, p: window.__mv.app.preset() && Object.keys(window.__mv.app.preset().values), view: document.querySelector('#view').dataset.state }));
  log('hostile: ' + JSON.stringify(out.hostile));

  // 8. request beats #problem-1-4-1 ; no request gives the problem preset; the roots mount shows nothing odd
  await go('#home', 250);
  await req({ station: 'roots', problem: '1.4.2', family: '1.4.2', values: { c: { re: 1, im: 0 }, n: 3 } });
  await go('#problem-1-4-1', 800);
  s = await state(); out.beats = s.preset && s.preset.kind;
  await go('#home', 250);
  await go('#problem-1-4-1', 800);
  s = await state(); out.noReq = s.preset;
  log('request beats hash: ' + out.beats + ' / without: ' + JSON.stringify(out.noReq));
  ctx.out = out;
}
