// Review B: dump readout, explainer TeX, why/wrap notes for the current route.
import { settle, readText } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  const { route, log, assert } = ctx;
  await settle(page, 6);
  const out = await page.evaluate(() => {
    const tx = (el) => { const a = el.querySelector('annotation[encoding="application/x-tex"]'); return a ? a.textContent : el.textContent.trim(); };
    const cells = {};
    document.querySelectorAll('[id$="-table"] td[id], [id$="-table"] tr[id]').forEach((el) => { if (el.id && el.tagName === 'TD') cells[el.id] = tx(el); });
    const q = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
    return {
      readout: q('#arithmetic-readout') || q('#addresses-readout'),
      note: q('#arithmetic-note') || q('#addresses-note'), wrap: q('#arithmetic-wrap-note'), why: q('#arithmetic-why'),
      problem: q('#arithmetic-problem') || q('#addresses-problem'),
      chip: [...document.querySelectorAll('.problem-chip')].map((c) => c.textContent + '->' + c.getAttribute('href')),
      pressed: [...document.querySelectorAll('[aria-pressed="true"]')].map((b) => b.id),
      sameAgree: [...document.querySelectorAll('tr.ex-same')].map((r) => r.id + '=' + r.dataset.agree),
      cells,
    };
  });
  log(JSON.stringify(out, null, 1));
}
