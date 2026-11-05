// Numbered memory lines. A step break is the space before "2. ", and only
// when a sentence just ended. "page 150." stays on its line. Empty pieces drop.

const STEP_BREAK = /(?<=\.)\s+(?=\d+\.\s)/;

export function recipeLines(memory) {
  return String(memory || '')
    .split(STEP_BREAK)
    .map((part) => part.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

export function recipeSteps(memory) {
  const parts = recipeLines(memory);
  return parts.length > 1 ? parts : null;
}
