// Shared shell registry. One line per chapter.
// A chapter loop adds its own line and does not edit the others.
// `module` is the page the router imports for #chapter-N. The same file may
// serve more than one chapter (Chapters 4 and 5 both use the book page).
// Opening a chapter also means its number is listed here. The drawer and the
// roadmap stop at SHELL_LAST_CHAPTER. Later chapters stay in the book data.

export const SHELL_LAST_CHAPTER = 7;

export const CHAPTER_MODULES = Object.freeze({
  4: './stations/book.js',
  5: './stations/book.js',
});

export const OPEN_CHAPTER_NUMBERS = Object.freeze(
  Object.keys(CHAPTER_MODULES).map(Number).sort((a, b) => a - b),
);
