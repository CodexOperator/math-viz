// The course text used for Test 2 citations.
// Howell & Mathews, Complex Analysis, the free open edition. About 90% likely:
// Test 1 chapters 2 and 3 match sections 2.1–2.5 and 3.1–3.2, and section 4.2
// is the Julia / Newton section the pictures already show. The repo never names a book.

export const BOOK = Object.freeze({
  title: 'Complex Analysis',
  authors: 'Russell W. Howell and John H. Mathews',
  short: 'Howell & Mathews',
  licence: 'CC BY 4.0',
  home: 'https://complexanalysis.org/',
  html: 'https://complexanalysis.org/web/root-1-2-2.html',
  pdf: 'https://complexanalysis.org/howell-complex-analysis-web.pdf',
  attribution: 'From Howell & Mathews, Complex Analysis, complexanalysis.org, CC BY 4.0.',
});

export function sectionHref(file, hash) {
  const base = `https://complexanalysis.org/web/${file}`;
  return hash ? `${base}#${hash}` : base;
}
