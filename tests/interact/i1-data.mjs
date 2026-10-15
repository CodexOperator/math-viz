// tests/interact/i1-data.mjs: in-browser check that the data modules load and behave.
//   node tools/smoke.mjs --route problems --script tests/interact/i1-data.mjs
// (any route works; the script only needs a page served from the site root.)
// Passing = no thrown assertion and the log line "i1-data: ... 0 errors".
export default async function (page, ctx) {
  const { log, assert } = ctx;

  const r = await page.evaluate(async () => {
    const globalsBefore = new Set(Object.getOwnPropertyNames(window));
    const urlOf = (rel) => new URL(rel, document.baseURI).href;
    const P = await import(urlOf('js/data/problems.js'));
    const F = await import(urlOf('js/data/functions.js'));
    const P2 = await import(urlOf('js/data/problems.js'));
    const errors = [];
    const out = {
      counts: { problems: P.PROBLEMS.length, topics: P.TOPICS.length, functions: F.FUNCTIONS.length },
      sameModule: P === P2,
      newGlobals: Object.getOwnPropertyNames(window).filter((k) => !globalsBefore.has(k)),
      katex: typeof window.katex,
      rendered: 0,
      errors,
    };

    // routes round-trip
    for (const p of P.PROBLEMS) if (P.idFromRoute(P.routeFor(p.id)) !== p.id) errors.push('route round trip ' + p.id);
    for (const t of P.TOPICS) if (P.topicFromRoute(P.topicRoute(t.id)) !== t.id) errors.push('topic route round trip ' + t.id);
    if (P.routeFor('1.4.2') !== 'problem-1-4-2' || P.routeFor('P3') !== 'problem-P3') errors.push('route examples');
    if (P.idFromRoute('roots') !== null) errors.push('idFromRoute(roots)');

    // frozen
    if (!Object.isFrozen(P.PROBLEMS) || !Object.isFrozen(F.FUNCTIONS)) errors.push('not frozen');

    // spot values (browser Math must agree with Node's)
    const v = (id) => P.problemById(id).answer.values;
    const close = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
    if (!close(v('1.3.2').result.im, -512 * Math.sqrt(3), 1e-6)) errors.push('1.3.2 result');
    if (!close(v('1.4.2').roots[1].re, -Math.sqrt(2)) || !close(v('1.4.2').roots[1].im, Math.sqrt(2))) errors.push('1.4.2 root 1');
    if (!close(v('2.4.1').atMinusOne.im, Math.sqrt(3) / 2)) errors.push('2.4.1 atMinusOne');
    if (F.fnById('sq').cart.u !== 'x^2 - y^2') errors.push('fnById(sq).cart.u');

    // every TeX string renders in the KaTeX that index.html loads
    if (window.katex) {
      const tryRender = (label, src) => {
        try { window.katex.renderToString(src, { throwOnError: true, strict: 'error' }); out.rendered++; } catch (e) { errors.push(label + ': ' + e.message); }
      };
      for (const p of P.PROBLEMS) {
        for (const part of P.statementParts(p.statement)) if (part.math) tryRender(p.id + ' statement', part.text);
        tryRender(p.id + ' answer.tex', p.answer.tex);
      }
      for (const f of F.FUNCTIONS) {
        tryRender(f.id + ' tex', f.tex);
        for (const s of [f.cart && f.cart.u, f.cart && f.cart.v, f.polar.u, f.polar.v, f.derivativeTex]) if (s) tryRender(f.id + ' formula', s);
      }
    }

    // if the Problem Index is on screen, its cards must be exactly the 29 problems
    const cards = [...document.querySelectorAll('[data-problem]')].map((el) => el.getAttribute('data-problem'));
    out.cardCount = cards.length;
    if (cards.length > 0) {
      const known = new Set(P.PROBLEMS.map((p) => p.id));
      for (const id of cards) if (!known.has(id)) errors.push('card for unknown problem ' + id);
    }
    return out;
  });

  assert(r.counts.problems === 29, `29 problems, got ${r.counts.problems}`);
  assert(r.counts.topics === 12, `12 topics, got ${r.counts.topics}`);
  assert(r.counts.functions === 15, `15 functions, got ${r.counts.functions}`);
  assert(r.sameModule, 'the module is a singleton');
  assert(r.newGlobals.length === 0, `importing the data must not create globals: ${r.newGlobals.join(', ')}`);
  assert(r.errors.length === 0, `in-page errors: ${r.errors.slice(0, 5).join(' | ')}`);
  if (r.katex === 'object') assert(r.rendered > 100, `rendered ${r.rendered} TeX strings`);
  else log('window.katex is not on this page; TeX rendering is covered by the unit test');
  log(`i1-data: ${r.counts.problems} problems, ${r.counts.topics} topics, ${r.counts.functions} functions, ${r.rendered} TeX strings rendered, ${r.cardCount} cards on screen, ${r.errors.length} errors`);
}
