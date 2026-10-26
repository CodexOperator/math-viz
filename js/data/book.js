// The course text used for Test 2 citations.
// Howell & Mathews, Complex Analysis, 202 Updated Edition (471 pages, CC BY 4.0).
// The numbers on the page are that edition. The links still open the HTML edition.

export const BOOK = Object.freeze({
  title: 'Complex Analysis',
  authors: 'Russell W. Howell and John H. Mathews',
  short: 'Howell & Mathews',
  licence: 'CC BY 4.0',
  home: 'https://complexanalysis.org/',
  html: 'https://complexanalysis.org/web/root-1-2-2.html',
  pdf: 'https://complexanalysis.org/howell-complex-analysis-web.pdf',
  attribution: 'From Howell & Mathews, Complex Analysis, 202 Updated Edition, complexanalysis.org, CC BY 4.0.',
});

export function sectionHref(file, hash) {
  const base = `https://complexanalysis.org/web/${file}`;
  return hash ? `${base}#${hash}` : base;
}
