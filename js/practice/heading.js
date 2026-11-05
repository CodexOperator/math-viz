// The source line already names the theorem, the exercise, and the page.
// The heading is the question.

// A section number such as 4.1 contains a period. A sentence ends at ". ".
const PAGE_CITE = /\b(?:Theorem|Definition|Corollary|Identity|Lemma|Exercise|Figure|§)(?:(?!\.\s)[\s\S]){0,90}?\bpages?\s+\d[\d–-]*/i;

function sentenceAsks(sentence) {
  return /[?]/.test(sentence) || /___/.test(sentence) || /:\s/.test(sentence);
}

function stripPageClause(sentence) {
  return sentence
    .replace(/,\s*pages?\s+\d[\d–-]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.:])/g, '$1')
    .trim();
}

export function questionHeading(prompt, cite) {
  const text = String(prompt || '').trim();
  if (!cite || !cite.ref || !text) return text;
  const parts = text.split(/(?<=[.?!])\s+(?=[A-Z$(§])/);
  const kept = [];
  for (const part of parts) {
    if (PAGE_CITE.test(part) && !sentenceAsks(part)) continue;
    kept.push(PAGE_CITE.test(part) ? stripPageClause(part) : part);
  }
  const next = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
  if (next) return next;
  const stripped = stripPageClause(text);
  return stripped || text;
}
