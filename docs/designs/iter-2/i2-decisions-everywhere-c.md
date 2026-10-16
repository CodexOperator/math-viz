# Design: i2-decisions-everywhere-c (the two decisions, the move glyph and fresh numbers on branches, reciprocal, limits, derivative, cauchy-riemann)

Goal: `i2-decisions-everywhere-c` (iteration 2, wave 1, kind integration, size L). Designer: stage 2.
Owns: `js/stations/branches.js`, `js/stations/reciprocal.js`, `js/stations/limits.js`, `js/stations/derivative.js`, `js/stations/cauchy-riemann.js`.
Plus the two files named after the goal by the loop's convention (the kit's design did the same; neither exists yet and neither moves a pin):
`tests/interact/i2-decisions-everywhere-c.mjs` (the acceptance criteria name it) and `tests/unit/i2-decisions-everywhere-c.test.mjs` (the pure helpers).
Reads: `docs/ARCHITECTURE.md` 3.14, 4, 4.1, 9, 10, 11.1 to 11.4; `docs/STORY.md` sections 0, 1 (Thread 3), 3, 4; `docs/designs/iter-2/i2-decisions-kit.md`;
`js/core/decisions.js`, `moveglyph.js`, `station-kit.js`, `listen.js`; the five station files; `tests/interact/i1-station-*.mjs`, `tests/unit/i1-station-*.test.mjs`,
`tests/interact/i1-integration.mjs`, `tests/unit/i1-integration.test.mjs` for the pins named in section 0.2.

**How to use this document.** Sections 1 to 9 are the design. Everything in it was built once in a scratch copy of the repo outside the repo (the five stations edited, the
unit test and the interaction script added) and run there; this design file is the only thing written in the repo. Appendix A is that patch for the five station files as a
unified diff (`git apply` it from the repo root: it holds the pure helpers and every DOM edit, in context, because the five files are iteration-1 code that must keep every id,
readout string and hook). Appendix B is the unit test file, Appendix C the interaction script, Appendix D the commands and the measured results. Section 5 says the same
thing as numbered steps. Where a sentence in sections 1 to 9 and the appendix code disagree, the sentence wins and the disagreement is a bug in the appendix.

---

## 0. Findings that shaped this design (read first)

### 0.1 What is on disk now

1. **The kit is built and the router already delivers the values preset.** `js/core/decisions.js` (`chips`, `namesMeaning`, ...), `js/core/moveglyph.js` (`moveGlyph`,
   `updateGlyph`, `glyphText`), `js/core/station-kit.js` (`valuesOf`, `freshNote`), `js/core/listen.js` (`videoPanel`) exist, and `js/app.js` passes
   `ctx.preset = { kind: 'values', station, problem, family, values }` (deep-frozen) for a `station.request` made with `window.__mv.app.request(req)`. None of the five
   stations imports any of them yet. Every one of them ignores a preset of kind `values` today (it falls through to the default state), which is why A4 can pass on the
   unchanged stations.
2. **The five cards are built five different ways.** This decides where the chips and the note go (section 5).

   | station | card element | built by | rebuilt when | absent or hidden when |
   |---|---|---|---|---|
   | branches | `section#branches-problem` | `mount`, once | never | never (one problem, 2.4.1) |
   | reciprocal | `section#reciprocal-problem` | `renderProblem()`, once | never | never (one problem, 2.5.1) |
   | limits | `aside#limits-problem.callout` | `renderProblemCard` in `derivative.js` | every function chip click | never (`dir` is 2.3.1, `x-over-z` is P5) |
   | derivative | `aside#derivative-problem.callout` | `renderProblemCard` in `derivative.js` | every function chip click | for `conj`, `cube`, `exp`, `recip` (no problem): `hidden`, and emptied |
   | cauchy-riemann | `aside#cauchy-riemann-problem.callout` | `renderProblemCallout` | every function chip click | unless the function's problem is 3.2.1 or P7: `hidden`, and emptied |

3. **`limits.js` imports `derivative.js`** (`renderProblemCard`, `buildHeader`, `compiledFn`, `mk`, ...) and the two share one `<style data-for="station-limits-derivative">`
   (`ensureStationStyle` / `releaseStationStyle`, reference counted). Both files are owned by this goal, so the shared card renderer is extended once.
4. **`#reciprocal-problem-note` already exists** (iteration 1: "This is problem 2.5.1 exactly." / "You changed the shape. The problem itself is the circle |z − 1| = 1.",
   pinned by `tests/interact/i1-station-powermap-reciprocal.mjs` line 505). The goal text calls the note "new"; for reciprocal it is the same element, extended (D2).
5. **The generators already emit the values of these five stations** (`js/data/generators.js`): branches `{ n, seam, walk: 'along' | null }` with seam in {0, −π/2, π/2};
   reciprocal `{ shape: { kind: 'circle', center, r } }` (centres −1, 2, i, −i, 1 + i, radius |centre|) or `{ shape: { kind: 'line', a: c, b: c + i } }`;
   limits `{ fn, path: 'line', m }` with m in {±1, ±2, ½}, or `path: 'vertical'` or `'parabola'` (a cubic sends no request); derivative `{ fn: <id> | { src }, z0 }`
   (z0 = 1 + i, or 0.3 − 0.7i for P6); cauchy-riemann `{ fn: { src }, z0: 0.5 + 0.8i }` (the P7 variants send a constant `src`, `'3'` or `'3i'`).
6. **The registry gives `derivative` the video `zoom-cr`** and the other four `video: null`. `media/manifest.js` is empty (`VIDEOS = []`), so no panel appears today;
   the panel must also work when the manifest lists it.
7. **`problems.js` already carries `names`** for all 29 problems. The nine this goal covers: 2.4.1 P/continuous, 2.5.1 P/any, 2.3.1 P/any, P5 P/any, 3.1.1 C/none,
   3.1.2 P/any, P6 both/any, 3.2.1 C/none, P7 C/none. The chips read these; nothing is typed per station.

### 0.2 The pins that bind this goal (all from tests that must pass unchanged)

| file | pin (source of the pin) | consequence for the builder |
|---|---|---|
| `derivative.js`, `limits.js` | the first `import {...} from '../core/complex.js';` line must still name `directionalQuotients` and `localLinear`, and both must still be called (`i1-station-limits-derivative` inspection test) | add new imports on **new lines**; do not touch that line |
| `derivative.js`, `limits.js` | the comment-stripped source must not contain `innerHTML`, `scrollIntoView`, `scrollTo`, `Math.random`, `alert(`, `confirm(`, `prompt(`, `window.open`, `document.write`; the stripper removes `//` comments only, **so a `/** */` block comment counts** | build DOM with `mk`, `append`, `textContent`; never write those words, even in a block comment |
| `derivative.js`, `limits.js`, `reciprocal.js` | no `#` followed by 3 to 8 hex digits and a word boundary, no `rgb(`, `rgba(`, `hsl(`, `hsla(` (reciprocal's scan reads the **raw** file, comments included) | no colour in code; do not write words such as `#add`, `#bad`, `#dec-`, `#fade` in a comment or string (`#derivative-readout`, `#cauchy-...`, `#branches-...` are fine: `r`, `u`, `b`+`r` break the hex run) |
| `derivative.js`, `limits.js` | `unmount` ends with `releaseStationStyle();` immediately followed by `};` | every new cleanup goes **before** that line |
| `derivative.js` | no `labelSide` or `zOrder` anywhere; `label: '', name: 'z₀', symbol: 'z₀'` stays; `{ order: 120 }` at least three times; the sentences "ring in the z-plane into a ring in the w-plane", "Same scale as the z-plane" stay | do not touch the planes or the lede |
| `cauchy-riemann.js` | the raw file (comments included) must not contain `numericPartials`, `1e-5` or `2 * h`; must contain `const CR_EPS = 1e-3`, `u_x + i v_x`, `v_y - i u_y`; no `localStorage`, `http://`, `https://`, `alert(`, `confirm(`, `prompt(`, `window.open`, `window.print`, `document.write`; every `innerHTML = ` must be followed by a quote | new copy must avoid those substrings (a comment that explains "central differences with a step of 1e-5" fails) |
| `cauchy-riemann.js` | the line `prose(verdictEl, crVerdict(state.fnId, r, state.z0))` stays word for word and `verdictEl.textContent` never appears; `const main = mk('div', 'two-planes')`; `if (view) wplane.setView(view);`; the import lines for `jacobian`...`localLinear` and `compile` | the custom function's own sentence goes in a **separate element** (section 5.6), not into the verdict call |
| `cauchy-riemann.js` | `CR_FN_IDS` deep-equals `['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u']`; `CR_FUNCTIONS` has exactly those entries (frozen table) | the custom function is **not** added to either; it is a per-mount entry (`entryOf`) |
| `reciprocal.js` | only `.style.aspectRatio` may appear as `.style.<x>`; no `style="` text; exactly one `mk('summary'`; no `\bTHREE\b`; no `el.setAttribute('aria-label'`; `id="reciprocal-play"` before `id="reciprocal-gap"` in the template | hide with the `hidden` attribute and shell classes (`row`, `muted`, `callout`) only |
| `branches.js` | `#branches-problem .callout`: **none visible** before "Show the answer", and the visible panel text must not contain `0 < θ < 2π` or `e^{iπ/3}`; the `createStaircase`/`setHomeLabel`/chord pins of S4 | nothing new in that panel may use the class `callout`; the fresh banner sits **outside** the panel |
| all five | `i1-integration` unit I6b (no "Earlier on the", "Later on the", "(thread T", `'Previous: '`, `'Next: '`, "Back: adding"), I11 (no `\d degrees` in code), I12 (reciprocal keeps exactly one `<summary>`), I22 (no `z1` or `z2` in a `name:`/`label:` string) | new copy uses `°`, `z₀`, `f′` |
| all five | `i1-integration` script I6 (visible text of `p`, `li`, `h2`, `h3`, `label`, `button`, `output`, `figcaption`, `.callout`, `.readout` has no ASCII `pi`, `z0`, `w0`, `f0`, `N deg`, `N degrees`, `sqrt(`, `eps =`, `delta =`, `rho =`, `1.5e+25`, `NaN`, `Infinity`, `chosen theta`, ` <= `, ` >= `), I7 (every `button`, `input`, `select`, `textarea`, `summary` has an id), I8 (no duplicate ids; every link and tab stop has an id; no `z0`, `z1`, `z2` in an `aria-label` or `title`) | every new control has an id; new copy is in the typeset forms; the glyph is not a tab stop |
| all five | the `<style data-for="station-...">` of a station is removed on unmount (the i1 scripts count it) | new CSS goes into the station's own `STYLE` string, not into a new `<style>` |

### 0.3 Where this design differs from the goal text or ARCHITECTURE (report, do not edit ARCHITECTURE.md)

| # | Plan text | This design | Why |
|---|---|---|---|
| D1 | the goal title and `interfaces` speak of fifteen stations, five glyph hosts and three video panels | this goal covers **five** stations: the glyph on `derivative` and `cauchy-riemann` only, the `zoom-cr` panel on `derivative` only; the `addresses`, `powers`, `linear` glyphs and the `addresses`, `mappings` panels belong to goals a and b | the orchestrator split (the `deliverable` text says so) |
| D2 | "a new `#<station>-problem-note`" | for **reciprocal** it is the existing element: extended to say the numbers are fresh, and **kept at its place** at the end of the card; branches, limits, derivative and cauchy-riemann get a new one | iteration 1 owns that id and pins its text; moving or renaming it breaks R4b |
| D3 | "the chips follow the active problem" | derivative, limits and cauchy-riemann rebuild their card on every function change, so the chips are rebuilt then (an open meaning closes); a card that is hidden has no chips | the card is already rebuilt; a second update path would be a second place to go wrong |
| D4 | `renderProblemCard(host, problemId)` | `renderProblemCard(host, problemId, { note = '' } = {})`; chips idPrefix = `host.id`; limits calls a new `syncCard()` from `refreshPath()` too, because the path and the slope decide whether the numbers are still the fresh ones | the signature change is additive; limits' callers pass two arguments today |
| D5 | A3: "a malformed request ({ station:'roots', ... })" | roots is goal a or b's. This goal sends a malformed request to **derivative** and to **reciprocal** (script step 3h) | each goal checks its own stations |
| D6 | A1: `problem-2-1-3 (linear: 'P', 'any')` | `problems.js` says `both`; the script reads the data, as A1 itself says | not this goal's station; noted so nobody "fixes" the data |
| D7 | `freshNote` text | it is `Fresh numbers from the Rehearsal Room. The handout's own answer: <answer.text>` (the kit's D5). `answer.text` is the typeable ASCII twin (it carries `pi`, `sqrt(3)`, `theta`) | the note is shown only in values mode, which no i1 script mounts; it is plain `textContent` in a muted paragraph |
| D8 | `videoPanel(host, 'zoom-cr')` "after its three planes" vs ARCHITECTURE 9 "right after the first picture" | after the row that holds the third plane (`.ld-lower`, which holds the quotient plane and the explainer): the goal's wording wins | the goal text is the binding one; both are "after" |
| D9 | 4.1: branches `seam` in (−π, π] | accepted range is [−π, π]; `seamFromSlider` snaps within 0.02 of the five nice angles | the slider and the chips already use −π (the principal seam) |
| D10 | 4.1: `fn: <FUNCTIONS id>` | an id that has no chip on the page (`sq`, `cube` on cauchy-riemann, `sq`, `cbrt` ... on derivative) opens as a **custom** function with that id's `src`; an id that is not in `FUNCTIONS` is an error line | every catalogue function can be shown; nothing is silently dropped |
| D11 | 11.3 `problemCard` | not used (the kit adoption of headers and cards is out of scope); `decisions.chips(problem, { idPrefix: <card id> })` is called directly and the ids `<card id>-decisions`, `-address`, `-names`, `-meaning`, `-note` are the kit's own names | keeps every iteration-1 id and text, adds the kit's ids |
| D12 | 9: `#derivative-glyph` "hidden with `hidden`" | SVG elements have no reflected `hidden` property, so `svg.hidden = true` sets nothing: the code uses `toggleAttribute('hidden', on)`; `theme.css` has `[hidden] { display: none !important }`, which applies to SVG too | a classic trap; section 5.5 step 4 |
| D13 | the goal says the glyph is a sibling of the readout | the glyph and the readout are two children of one flex row (`div.ld-readout-row` / `div.cr-readout-row`); the readout keeps its id, its class and its text | "never inside it" is checked as `glyph.parentElement === readout.parentElement` |
| D14 | none | `derivative.js` `compiledFn` (and so `microscope`) also accepts a **function reference** `{ id: 'custom', f }` instead of an id string | `microscope('abs2', ...)` and every i1 test keep working; no module-level state (section 4.4) |
| D15 | `freshNote` is shown as the note | the note is `freshNote(...)` made into a sentence (`noteOf`: a full stop added when the kit's text ends without one) followed by "Now on the page: ..." | the screenshot of the first build read "...for every z Now on the page:"; the kit's text is the handout answer, which several problems end with a formula |
| D16 | `freshNote` carries the handout's answer | kept as the kit gives it; **the card therefore shows the handout's answer when the student arrives from the Rehearsal Room** (the answer to the handout problem, not to the fresh numbers) | the kit's D5 chose this; the Rehearsal Room's own flow is "Show the answer" last, and the station note is below the statement; reported in section 9 so the kit owner can drop the answer from `freshNote` without a change here |
| D17 | 4.1 gives no ranges | a requested `m` on limits counts only with `path: 'line'` and only within the slider (\|m\| at most 3); a requested `z₀` on derivative within 5 of 0 (both parts), on cauchy-riemann within the z-plane (both parts at most 2); `n` is 2 to 5; a reciprocal circle needs its centre within 3 of 0 and r from 0.1 to 3 | a request must not put a handle where the student cannot reach it; anything outside is dropped silently and the page opens on its own default |
| D18 | (builder) the fresh record of derivative and cauchy-riemann takes the request's problem whenever `freshNote` gives a line | the note, and so the card's problem override, is made only when the request's own function is on the page: `vals.fn` is present and `fv.error` is null. A request whose function cannot be read (`{ src: '2z +' }`, an unknown id) leaves the default function, shows the error line, applies a valid z₀, and the card follows the function on the page (3.1.1 or 3.2.1) with no note | the first build showed `Problem 3.1.2` and a handout answer about \|z\|² over a picture of z² + z when a 3.1.2 request carried an unreadable source; the script (A3, derivative and cauchy-riemann) now asserts this |

### 0.4 Computed and run in the scratch copy (everything quoted as a value below comes from here)

A scratch copy of the repo outside the repo has the whole design built (Appendix A): the five stations edited, the unit test (Appendix B) and the interaction script (Appendix C) added.
Every readout, glyph label, grid check and request outcome that sections 6 and 7 quote was computed from the real modules (`complex.js`, `parse.js`, the five stations' exported helpers, `station-kit.js`, `decisions.js`, `moveglyph.js`) and then seen on the real pages in headless Chromium at 1280 px, 390 px and in dark mode.
The generalised `compiledFn` (D14) lets `microscope`, `buildReadout`, `verdictText`, `ringFit`, `derivativeRows` and `ringImage` run unchanged on a custom reference (`'2z^2 - 3z + 1'` at 1 + i reads `z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i`).
The results are in Appendix D: the new unit and interaction tests pass, the four i1 scripts for these stations pass unedited, `smoke --dark` is clean on 34 routes, and the unit failures that remain are the eight the pristine files already have.

---

## 1. Goal restatement, story thread, problems and topics

### 1.1 The goal

Every problem card on `branches`, `reciprocal`, `limits`, `derivative` and `cauchy-riemann` shows the two decisions as chips (Address and Names), with the one-line meaning on tap.
The derivative and Cauchy–Riemann stations carry the move glyph beside f′(z₀) and beside A. Each of the five opens with the Rehearsal Room's numbers when it is sent a values
preset, and says so on the card. `derivative` hosts the `zoom-cr` video panel (absent until the manifest lists it). Nothing from iteration 1 moves: no id, readout string or
hook is removed or renamed, and the iteration-1 tests pass without an edit.

### 1.2 The story thread this carries, and how it shows on screen

- **Decisions (Thread 1 and 2, the exam lens).** Under the statement of 2.4.1 the student sees `Polar` and `names: continuous`; under 3.2.1 `Cartesian` and `names: none`.
  Tap `names: continuous` and the line "A choice of name that never jumps: a branch, with a seam where it must." appears. The test becomes "which place, which address,
  which names", not a recipe.
- **The glyph (Thread 3 meets Thread 1).** `derivative` is where the spine's fourth line is said: *differentiable means one move up close.* f′(z₀) is a complex number, so it has
  **two addresses**: the readout gives the Cartesian one (`f′(z₀) = 3 + 2i`), the glyph and its caption give the polar one (`turn 33.7°, stretch 3.606`). The same dotted ray
  and arc the student saw beside z in Chapter 1. When f′ does not exist (|z|², Re z) the glyph disappears and the caption says why: *no single move*. On
  `cauchy-riemann` the glyph sits beside A, the move part of the local map; conj z shows `no move: 0` because A = 0 (a pure mirror).
- **Fresh numbers.** "Same place, new numbers": the Rehearsal Room's "Open at the station" lands the student on the same picture with the fresh numbers already drawn, and the card says so.
- **Video.** "Watch (2–3 min)" with the zoom video, below the three planes of `derivative`, when the file exists.

### 1.3 Problems and topics covered

| problem | station | Address | Names | chips read | topic | thread | what the fresh variant changes |
|---|---|---|---|---|---|---|---|
| 2.4.1 | branches | P | continuous | `Polar`, `names: continuous` | T2.4 | T2 | n, seam (and z on the opposite ray), optional auto-walk |
| 2.5.1 | reciprocal | P | any | `Polar`, `names: any` | T2.5 | T1, T3 | the circle through 0 or the line x = c |
| 2.3.1 | limits | P | any | `Polar`, `names: any` | T2.3 | T3 | the way in (line y = mx, x = 0, y = x²) |
| P5 | limits | P | any | `Polar`, `names: any` | T2.3 | T3 | the same, for x/z |
| 3.1.1 | derivative | C | none | `Cartesian`, `names: none` | T3.1 | T3, T1 | the polynomial and z₀ |
| 3.1.2 | derivative | P | any | `Polar`, `names: any` | T3.1 | T3, T1 | the function (k\|z − a\|², z Re z, ...) |
| P6 | derivative | both | any | `Either address`, `names: any` | T3.1 | T3, T1 | the function (conj z, Im z, 2 Re z, ...) |
| 3.2.1 | cauchy-riemann | C | none | `Cartesian`, `names: none` | T3.2 | T3, T1 | the function (e^{−z}, z², conj z, ...) |
| P7 | cauchy-riemann | C | none | `Cartesian`, `names: none` | T3.2 | T3, T1 | a constant function (u = c) |

The address label text is `addressLabel(code)` (read it from `problems.js`, do not hard-code the table above); the table is what the unit test asserts after reading the data.

---

## 2. UX

### 2.1 Wireframes

Desktop (1280 px), `derivative` on `#problem-3-1-2`, the richest of the five. Everything marked NEW is added; everything else is iteration 1 and does not move.

```
+------------------------------------------------------------------------------------------------+
| The Derivative Is a Move                                                                       |
| (lede ...)   [T3 . A function is a motion] [T1 . One point, two addresses]   (3.1.1)(3.1.2)(P6) |
+------------------------------------------------------------------------------------------------+
| Pick a function and a point                                                                    |
| Function: (z² + z 3.1.1)(|z|² 3.1.2)(conj z)(Re z P6)(z³)(e^z)(1/z)  (custom 3.1.1) <- NEW      |
| Custom function from the Rehearsal Room: f(z) = 2z² − 3z + 1            <- NEW, only with custom |
| [ The function from the Rehearsal Room could not be read ... ]          <- NEW, only on an error |
| Ring size ρ ----o---   Direction of the step h ----o----   [Shrink] [Turn] [Move z₀ to 0]       |
+------------------------------------------------------------------------------------------------+
| Problem 3.1.2                                                    #derivative-problem           |
| Let f(z) = |z|². Show f is differentiable only at z = 0, and thus nowhere analytic.            |
| Fresh numbers from the Rehearsal Room. The handout's own answer: ... Now on the page: ... NEW  |
| (Polar) (names: any)                                              <- NEW  #...-decisions       |
|   | The home step... one line, on tap |                            <- NEW  #...-meaning         |
| [Polar] Pick the address where the question is native ...          (the iteration-1 badge stays)|
+------------------------------------------------------------------------------------------------+
| z-plane: a ring of directions around z₀        | w-plane: the ring after f                     |
+------------------------------------------------------------------------------------------------+
| Difference quotients (the third plane)         | The same computation in both addresses        |
+------------------------------------------------------------------------------------------------+
| Watch (2–3 min): ...                           <- NEW  #derivative-video-host (hidden until   |
|                                                          the manifest lists zoom-cr)           |
+------------------------------------------------------------------------------------------------+
| (glyph) | z₀ = 1 + i; A = 1 - i; |B| = 1.414; f′(z₀) does not exist (circle radius 1.414)       |
|   glyph hidden here (no f′): NEW row #derivative-readout-row                                   |
| No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.  NEW    |
| (verdict)                                                                                      |
| (links)                                                                                        |
+------------------------------------------------------------------------------------------------+
```

The same row on `#problem-3-1-1` (f′ exists):

```
| (@) | z₀ = 1 + i; A = 3 + 2i; |B| = 0.000; f′(z₀) = 3 + 2i                                      |
| As a move: turn Arg f′(z₀) = 0.588 rad (33.7°), stretch |f′(z₀)| = 3.606.                       |
```

(@) is the 2 em glyph: faint unit circle, solid arc from the positive real axis to the ray (the turn), the ray (the stretch; dashed here because 3.606 is more than the glyph's
scale of 2).

Phone (390 px), the same page, top to bottom (one column, no horizontal scroll):

```
+--------------------------------------+
| The Derivative Is a Move             |
| ...lede, badges, (3.1.1)(3.1.2)(P6)  |
| Pick a function and a point          |
| (z²+z)(|z|²)(conj z)(Re z)           |
| (z³)(e^z)(1/z)(custom)               |   chips wrap
| ...sliders, buttons...               |
| Problem 3.1.2                        |
| Let f(z) = |z|². Show ...            |
| Fresh numbers ... (muted, wraps)     |
| (Polar)  (names: any)                |   chips wrap, meaning is a full-width line
| [Polar] Why ...                      |
| z-plane / w-plane / quotient / expl. |   stacked
| Watch (2–3 min) ...                  |   only with a manifest entry
| (@) z₀ = 1 + i; A = 3 + 2i; |B| =... |   readout wraps (overflow-wrap: anywhere)
| As a move: turn Arg f′(z₀) = ...     |
+--------------------------------------+
```

`cauchy-riemann` (desktop and phone differ only in column count): the callout sits where it did, under the header; the readout row is `(@) A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = ...`
followed by the existing `#cauchy-riemann-move` sentence. `limits`: the callout under the controls gains the note and the chips, nothing else. `branches` and `reciprocal`: the card is at the
bottom of the page, so each gets a one-line banner under the header that says the numbers are fresh:

```
| Branches and Cuts                                                                |
| (lede) [T2 . The staircase]  (2.4.1)                                             |
| | Fresh numbers from the Rehearsal Room. Now on the page: the square root, with   |   NEW #branches-fresh
| | its seam at π/2 and z on the ray opposite the seam. The handout problem is at   |   (.callout, outside the card)
| | the bottom of the page.                                                         |
| Where do you put the seam? ...                                                   |
| ...                                                                              |
| Problem 2.4.1                                                    #branches-problem|
| Find a branch of the cube root of z that is continuous along the negative x-axis.|
| Fresh numbers from the Rehearsal Room. ...                       NEW #...-problem-note
| (Polar) (names: continuous)                                      NEW #...-problem-decisions
| Before you press anything: where would you put the seam ...                      |
| [Set up problem 2.4.1] [Show the answer]                                         |
```

### 2.2 Every added control: id, label, behaviour

The kit's chips are `button.chip.decision-chip` (ids and `data-*` below come from `decisions.chips`; the stations only choose `idPrefix` and the host).

| id | where | label | behaviour |
|---|---|---|---|
| `branches-problem-decisions` | in `#branches-problem`, after the statement | (host `div.br-decisions`) | holds the chips; built once |
| `branches-problem-address`, `branches-problem-names` | inside it | `Polar`, `names: continuous` | tap or Enter or Space: shows the meaning in `#branches-problem-meaning`; a second tap hides it; Escape hides it |
| `branches-problem-meaning` | inside it | (a `role="status"` line) | `Work in polar, ...` / `A choice of name that never jumps: ...` |
| `branches-problem-note` | in `#branches-problem`, before the chips | (muted line) | `hidden` and empty unless the numbers on the page are the request's |
| `branches-fresh` | after the header | (callout line) | `hidden` unless the numbers are still the request's |
| `reciprocal-problem-decisions`, `-address`, `-names`, `-meaning` | in `#reciprocal-problem`, after the statement line | `Polar`, `names: any` | as above |
| `reciprocal-problem-note` | existing, same place (end of the card) | (muted line) | iteration-1 sentences, or the fresh note while the shape is the request's |
| `reciprocal-fresh` | after the header | (callout line) | as `branches-fresh` |
| `limits-problem-decisions`, `-address`, `-names`, `-meaning`, `-note` | in `#limits-problem` | `Polar`, `names: any` | rebuilt with the card on every function change |
| `derivative-problem-decisions`, `-address`, `-names`, `-meaning`, `-note` | in `#derivative-problem` | follow the active problem | `3.1.1` Cartesian/none, `3.1.2` Polar/any, `P6` Either address/any |
| `derivative-fn-custom` | in the function chip group, last | `custom` (+ the problem id as a tag) | present only when the request carried a function with no chip; `aria-pressed`; click selects it (the card and note return) |
| `derivative-custom-note` | under the chips | `Custom function from the Rehearsal Room: f(z) = ...` | present (not hidden) only with a custom function |
| `derivative-custom-error` | under the chips | the message | `role="alert"`, `hidden` unless the request's function could not be read |
| `derivative-readout-row` | replaces the bare readout as the child of the station | (flex row) | holds `#derivative-glyph` then `#derivative-readout` |
| `derivative-glyph` | in that row | (the glyph; `aria-label` = `move: turn 33.7°, stretch 3.606`) | updates on every model change; `hidden` attribute when f′ does not exist or f is undefined |
| `derivative-glyph-text` | after the row | the caption (section 2.5) | always present; says what the glyph shows or why it is gone |
| `derivative-video-host` | after `.ld-lower` | (the panel) | `hidden` until `videoPanel` resolves with a panel |
| `cauchy-riemann-problem-decisions`, `-address`, `-names`, `-meaning`, `-note` | in `#cauchy-riemann-problem` | `Cartesian`, `names: none` | 3.2.1 or P7; the callout is hidden for the other functions |
| `cauchy-riemann-fn-custom` | in `#cauchy-riemann-fn-chips`, last | `custom` | as the derivative's |
| `cauchy-riemann-custom-error` | under `#cauchy-riemann-fn-note` | the message | `role="alert"`, `hidden` unless needed |
| `cauchy-riemann-custom-check` | in the tests panel, after `#cauchy-riemann-verdict` | the 25-point check sentence | present only while the custom function is selected |
| `cauchy-riemann-readout-row` | the child of the station that holds the readout | (flex row) | holds `#cauchy-riemann-glyph` then `#cauchy-riemann-readout` |
| `cauchy-riemann-glyph` | in that row | (aria-label `move: turn 45.8°, stretch 1.649` at the 3.2.1 point) | the move of A; `hidden` when f has no value near z₀ |

### 2.3 Pointer, touch, keyboard

- **Chips** are buttons: a tap, a click, Enter or Space toggles the meaning; Escape closes it and keeps focus on the chip; one chip open at a time (the kit's behaviour, D3 of the kit).
  Hover shows the same sentence as the native `title`. Targets are `--tap` (2.75 rem) high from `components.css` (`button.chip`).
- **The glyph** is not interactive and not a tab stop (`focusable="false"` from the kit). Hover or long-press shows its `<title>` (the same words as the aria-label).
- **The custom chip** is a normal function chip: Tab order is the order of the group; Space or Enter selects it; `aria-pressed` follows.
- **Unchanged:** every drag, slider, wheel and key of the five stations. The glyph and the caption follow z₀ on every pointer move, with no throttle (one `updateGlyph` is 0.01 ms, measured by the kit).

### 2.4 Empty, loading and error states

- **No problem for this function** (`derivative` with `conj`, `cube`, `exp`, `recip`; `cauchy-riemann` with `conj`, `re`, `abs2`, `sq-plus-z`): the card is `hidden` and empty, exactly as in
  iteration 1; there are no chips then, and `count('#derivative-problem-address') === 0`.
- **f′ does not exist** (|z|², Re z, conj z away from a fixed point): the derivative glyph is hidden and the caption says `No single move here: ...`. **f undefined at z₀** (1/z at 0):
  the glyph is hidden and the caption says `f is undefined at z₀, so there is no move to show.` On `cauchy-riemann` the glyph is hidden only when f has no value near z₀
  (`report.finite === false`); A = 0 shows `no move: 0`.
- **Loading.** The video panel is the only async piece. `#derivative-video-host` is `hidden` from the first paint; if `videoPanel` resolves with a panel it is shown, if it resolves `null`
  (no manifest entry, the normal case today) nothing happens. A manifest that fails to load gives one `console.warn` from `listen.js` and no panel (never an error).
- **A bad request.** A values preset that `valuesOf` empties, or that has no valid field, leaves the station on its default with **no** note, no banner and no error line. A request with a function
  that cannot be read opens the default function (and any valid z₀) and shows the parser's sentence verbatim in `#derivative-custom-error` / `#cauchy-riemann-custom-error`.
  `console.error` is never called for a bad request.
- **No WebGL** (branches, reciprocal): unchanged (their own fallbacks); nothing added here depends on it.

### 2.5 Copy (every string a student can read; plain and direct, for the night before)

Chips (from the kit): `Polar`, `Cartesian`, `Either address` (derivative P6), `names: none`, `names: any`, `names: continuous`; the meanings are `ADDRESS_MEANING` and `NAMES_MEANING`.

The fresh note is `noteOf(lead, loaded)`, where `lead = freshNote(problem, preset)` (the kit's sentence, which ends with the handout's typeable answer, and that answer may end
without a full stop, for example `the line Re w = 1/2`), `noteOf` adds a full stop to `lead` when it has none, and `loaded` is the sentence "Now on the page: ..." of the station.
The banner (branches and reciprocal only) is `'Fresh numbers from the Rehearsal Room. ' + loaded + ' The handout problem is at the bottom of the page.'`

| station | `loaded` |
|---|---|
| branches | `Now on the page: the {square\|cube\|fourth\|fifth} root, with its seam at {seam, as π/2} and z on the ray opposite the seam.` |
| reciprocal | `Now on the page: {describeShape(shape)}.` (for example `circle \|z - i\| = 1`) |
| limits | `Now on the page: g = {label of the function}, way in: {pathDescription}.` (for example `g = z²/\|z\|², way in: y = 2x.`) |
| derivative | `Now on the page: f(z) = {label, or the source as sent}, at z₀ = {fmtCart(z₀)}.` |
| cauchy-riemann | the same sentence |

The derivative caption under the readout row (`#derivative-glyph-text`), four cases:

| case | text |
|---|---|
| f′ exists, nonzero | `As a move: turn Arg f′(z₀) = 0.588 rad (33.7°), stretch \|f′(z₀)\| = 3.606.` (an exact angle adds ` = π/4` after the radians when that says more than the decimal) |
| f′(z₀) = 0 | `f′(z₀) = 0: the zero move. Every direction is squashed onto the point f(z₀).` |
| no f′ | `No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.` |
| undefined | `f is undefined at z₀, so there is no move to show.` |

The custom-function lines:

| id | text |
|---|---|
| `derivative-custom-note` | `Custom function from the Rehearsal Room: ` then the typeset `f(z) = <toTex(src)>` (plain `f(z) = <src>` if `toTex` throws) |
| `cauchy-riemann-fn-note` (existing element, custom case) | `Custom function from the Rehearsal Room: ` + typeset `f(z) = ...` + `. u and v are read off numerically, so the Jacobian cells say numeric where a textbook formula would go.` |
| `*-custom-error` | `The function from the Rehearsal Room could not be read, so this page opened on its own function. ` + the parser's `err.message` in its own `<span>` |
| `cauchy-riemann-custom-check` | four cases, section 5.6 step 7 (for example `CR fails at z₀ (u_x = 1 but v_y = -1), so f has no derivative here and cannot be entire.`) |

No sentence uses an emoji, `pi`, `z0`, `deg`, `sqrt(`, or "Infinity". Angles are `°` or `π` forms; names are `z₀`, `f′`, `|B|`.

---

## 3. Visual encoding (both themes)

### 3.1 Rules

- **No colour is written in any of the five files.** Every colour is a token from `css/theme.css` (`--text`, `--text-muted`, `--surface`, `--surface-2`, `--accent`, `--polar`, `--cart`, `--danger`),
  redefined for dark mode by the theme file under `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`. The stations add layout rules only, to their own `STYLE` string
  (so the `<style data-for="station-...">` that the i1 scripts count is still removed on unmount). The unit test S6 scans the raw source for `#hex`, `rgb(`, `rgba(`, `hsl(`, `hsla(`.
- **Nothing new relies on colour alone.** Each decision is a word on a chip (`Polar`, `names: any`) before it is a tint; the glyph is a shape (arc, ray) with the same words in its caption; an error
  starts with a sentence ("The function from the Rehearsal Room could not be read ...") and has `role="alert"`; the fresh-numbers line starts with the words "Fresh numbers".
- **No new animation.** The glyph jumps to its new state (no tween); the caption is plain text. The one moving thing a request can start, the branches walk (`walk: 'along' | 'across'`), is the
  station's own, and it keeps its own reduced-motion rule (step 5.2.8).

### 3.2 Every new element, with its tokens and the contrast measured from `theme.css`

Ratios are WCAG 2.x relative-luminance ratios computed from the token values in `theme.css` (script `contrast.mjs` in the scratch run). Text needs 4.5:1, a graphic that carries meaning 3:1.

| element | where | foreground / border | background | light | dark |
|---|---|---|---|---|---|
| decision chips, the meaning line | five problem cards | the kit's own (`.decision-chip`, `.decision-meaning`; the kit measured them) | the card (`--surface`) / `--surface-2` | kit | kit |
| fresh-numbers note, `p.muted` (`#<station>-problem-note`, `.ld-problem-note`, `.cr-problem-note`) | in the card, under the statement | `--text-muted` | `--surface` (the callout or panel) | 6.86 | 7.80 |
| fresh banner `p.callout[data-tone="accent"]` (`#branches-fresh`, `#reciprocal-fresh`) | under the header | text `--text`; the 4 px left border `--accent` | `--surface` | border 10.69 | border 11.89 |
| move glyph (`#derivative-glyph`, `#cauchy-riemann-glyph`) | left of the readout | `color: var(--polar)` (the kit's rule; `currentColor` for the unit circle at opacity 0.3, the arc 1.6, the ray 2) | `--bg` (the row sits on the page) | 5.46 | 9.13 |
| the same glyph inside a card | (a host that wraps it in a surface; not used here, listed for the kit) | `--polar` | `--surface` | 6.06 | 8.30 |
| glyph caption `p.ld-glyph-text` | under the readout row | `--text-muted` | `--bg` | 6.19 | 8.59 |
| custom-function note `p.ld-note` (existing class) | under the function chips | `--text-muted` | `--surface` | 6.86 | 7.80 |
| error blocks `p.ld-error`, `div.cr-error` | under the function chips | text `--text`; 4 px left border `--danger` | `--surface-2` | text 13.05, border 5.34 | text 12.74, border 6.17 |
| custom-check sentence `p.cr-custom-check` | in the tests panel | `--text` (inherited) | `--surface` | 15.96 | 14.52 |
| custom chip | function chip group | the iteration-1 `.chip` states (`aria-pressed`) | | iteration 1 | iteration 1 |

The glyph's unit circle at 0.3 opacity is decoration: the arc, the ray and the caption carry the meaning, so the 3:1 rule is applied to those (both above 4.9:1 on every surface listed, including `--surface-2` at 4.95 light and 7.28 dark).

### 3.3 The glyph in its place

At `size: '2em'` the SVG is 32 by 32 CSS px at the 16 px root (it scales with the text). Scale 2 (the kit's default) means a ray of length 2 reaches the box edge; a longer stretch is clipped to the edge and drawn
dashed (`data-clipped="true"`), so f′(1 + i) = 3 + 2i (stretch 3.606) is a dashed ray at 33.7°; A = 1.149 + 1.183i (stretch 1.649) is a solid ray at 45.8°. The glyph is `focusable="false"` and `role="img"`;
its `<title>` and `aria-label` are the same words (`move: turn 33.7°, stretch 3.606`), and `no move: 0` when the move is zero. While f′ does not exist the SVG carries the `hidden` attribute
(`display: none` from the theme's `[hidden]` rule) and the caption says why.

### 3.4 The CSS that is added (the whole of it; also in Appendix A)

```css
/* derivative.js STYLE (shared with limits.js through renderProblemCard) */
.ld-decisions { margin: var(--space-2) 0; }
.ld-problem-note { margin: var(--space-1) 0; font-size: 0.92rem; overflow-wrap: anywhere; }
.ld-readout-row { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.ld-readout-row > .readout { flex: 1 1 auto; min-width: 0; }
.ld-readout-row > .move-glyph { flex: none; }
.ld-glyph-text { margin: var(--space-1) 0 0; color: var(--text-muted); font-size: 0.92rem; }
.ld-error { margin: var(--space-1) 0 0; padding: var(--space-1) var(--space-2); border-left: 4px solid var(--danger); background: var(--surface-2); font-size: 0.92rem; overflow-wrap: anywhere; }

/* cauchy-riemann.js STYLE (every rule starts with #station-cauchy-riemann) */
.cr-decisions { margin: var(--space-2) 0; }
.cr-problem-note { margin: var(--space-1) 0; font-size: 0.92rem; overflow-wrap: anywhere; }
.cr-readout-row { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.cr-readout-row > .readout { flex: 1 1 auto; min-width: 0; }
.cr-readout-row > .move-glyph { flex: none; }
.cr-custom-check { margin: var(--space-2) 0 0; }
.cr-error { margin: var(--space-2) 0 0; padding: var(--space-1) var(--space-2); border-left: 4px solid var(--danger); background: var(--surface-2); font-size: 0.92rem; overflow-wrap: anywhere; }

/* branches.js STYLE */
#station-branches .br-decisions { margin: var(--space-2) 0; }
```

`limits.js` and `reciprocal.js` add no CSS (limits uses the derivative stylesheet; reciprocal puts the chips in `div.row`, an existing shell class, and the banner is `p.callout`).

### 3.5 Phone (390 px) and dark theme

- The chips are `inline-flex` with `flex-wrap: wrap`; the meaning line is `flex: 1 1 100%`, so it is a full-width line under the chips. A chip's text never forces width (`max-width: 100%`, kit).
- The readout row is a flex row (glyph, then readout); the readout has `min-width: 0` and the iteration-1 `.readout` wraps long lines, so the 2 em glyph and a 60-character readout share the 358 px row without scroll.
  Screenshots at 390 px of `#problem-3-1-1`, `#problem-3-2-1` (glyph row), `#branches` (banner) and `#problem-2-5-1` were read in the scratch run; none overflowed.
- Dark: every token flips in `theme.css`; the glyph's `--polar` goes from `#a84300` to `#ff9d5c` and keeps 9.13:1 on the page. `smoke --dark` captures the five stations; the interaction script runs a `desktop-dark` pass.
- Print and forced colours: not designed here (no print stylesheet in the site).

---

## 4. Module API

No new module. Every addition is inside the five owned files, and every pure helper is an `export` (or, in `reciprocal.js`, a member of the frozen `internals`) so the unit test imports it in Node.
Nothing is imported from another station except what `limits.js` already imports from `derivative.js`. The routes, the registry, the router and the five `window.__mv.<station>` hooks do not change.

### 4.1 Shared contract

**Imports added** (each on its own new line; the pinned `complex.js` lines are not touched):

| file | added import lines |
|---|---|
| `branches.js` | `import { chips as decisionChips } from '../core/decisions.js';` and `import { valuesOf, freshNote } from '../core/station-kit.js';` |
| `reciprocal.js` | the same two |
| `limits.js` | `import { problemById } from '../data/problems.js';` and `import { valuesOf, freshNote } from '../core/station-kit.js';` (the chips come through `renderProblemCard`) |
| `derivative.js` | `compile, ParseError, toTex` from `parse.js` (the existing `compile` line widened); `import { chips as decisionChips } from '../core/decisions.js';` `import { valuesOf, freshNote } from '../core/station-kit.js';` `import { moveGlyph, updateGlyph } from '../core/moveglyph.js';` `import { videoPanel } from '../core/listen.js';` |
| `cauchy-riemann.js` | `toTex` added to the `parse.js` line; `import { fnById } from '../data/functions.js';` and the decisions, station-kit and moveglyph lines as for derivative (no `listen.js`) |

**Kit calls used** (signatures from ARCHITECTURE 11):
`decisionChips(problem, { idPrefix }) -> HTMLElement` (a `span.decisions` of two buttons and the meaning span, ids `${idPrefix}-address`, `-names`, `-meaning`);
`valuesOf(preset, shape) -> object | null` (null unless `preset.kind === 'values'`; otherwise an object holding only the fields that passed their shape, possibly empty);
`freshNote(problem, preset) -> string` (`''` unless the preset is `values` for that problem);
`moveGlyph(z, { size, id }) -> SVGElement`, `updateGlyph(svg, z)`, `glyphText(z)`; `videoPanel(host, id) -> Promise<HTMLElement | null>`.

**The fresh record.** Each station keeps at most one object, set at mount from the request and never changed afterwards:

| station | record | the note is shown while |
|---|---|---|
| branches | `{ n, seam, note, banner }` | `state.n === n` and `\|state.seam - seam\| < 1e-9` (dragging z does not count) |
| reciprocal | `{ key, note, banner }` (`key = shapeKey(shape)`) | `shapeKey(st.shape) === key` (the probe and the bearing do not count) |
| limits | `{ fnId, path, m, note }` | `st.fnId === fnId && st.path === path && (st.path !== 'line' \|\| st.m === m)` |
| derivative | `{ fnId, problem, note }` | `st.fnId === fnId` (z₀ does not count) |
| cauchy-riemann | `state.fresh = { fnId, problem, note }` | `state.fnId === fnId` |

`noteOf(lead, loaded)` (a private one-liner in each of the five files; the kit is another goal's file, so it is repeated rather than shared, section 9):
`(/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded`.

**Lifecycle, all five.** `mount` reads the preset first (values, then problem, then token, as the existing order), builds the DOM, calls the first `refresh` synchronously, then returns `unmount`.
`unmount` keeps its existing steps in order; the only additions are the video element removal in `derivative.js` (before `releaseStationStyle()`, which stays last) and nothing else: the chips, the glyph and the notes are
plain DOM children of the station and go with `el`. No store subscription is added, no listener on `window` or `document`; the chips' listeners are on the chip host (the kit).

**Hooks.** `window.__mv.branches`, `.reciprocal`, `.limits`, `.derivative`, `.cauchyRiemann` are unchanged. The new facts are read from the DOM by the tests (`aria-label` of the glyph, `data-r`, `data-theta`, the note text).

### 4.2 `branches.js`

New exports (pure; Appendix A):

| export | signature | contract |
|---|---|---|
| `VALUES_SHAPE` | frozen `{ n: 'int', seam: 'real', walk: ['along', 'across'] }` | the shape passed to `valuesOf` |
| `unitPoint(angle)` | `number -> { re, im }` | `(cos, sin)` with a part below 1e-12 in size written as `0` (never `-0`, never `-1.8e-16`) |
| `branchesFromValues(vals)` | `object \| null -> null \| { applied, n, seam, z, walk }` | `null` for a non-values preset. `n` valid when an integer in 2..5, else 3. `seam` valid when finite and within π of 0 (+1e-9), then snapped by the station's own `seamFromSlider` (within 0.02 of a nice angle it becomes that angle), else −π. `applied` is true when `n` or `seam` was valid. `z` is `unitPoint(seam + π)` (the ray opposite the seam) when the seam was valid, else the station's `DEFAULT_Z`. `walk` is the request's `'along' \| 'across'` or `null`. |
| `branchesLoaded(n, seam)` | `-> string` | `Now on the page: the square root, with its seam at π/2 and z on the ray opposite the seam.` (`rootName(n)`, `fmtAngle(seam, { unicode: true })`) |

Mount-time state: `fresh`, `walkOnMount`. New DOM: `p#branches-fresh.callout` after the header; in `#branches-problem`: `p#branches-problem-note.muted`, `div#branches-problem-decisions.br-decisions`
(statement, note, chips, hint, buttons, answer box, in that order). `syncFresh()` runs at the end of every `refresh()`.

### 4.3 `reciprocal.js` (members of `internals`)

| member | signature | contract |
|---|---|---|
| `VALUES_SHAPE` | frozen `{ shape: shapeSpec }` | |
| `shapeSpec(v)` | `unknown -> object \| undefined` | the `valuesOf` validator: a circle with centre within 3 of 0 (both parts) and `0.1 <= r <= 3`, or a line through two points at least 0.1 apart, all parts within 3; anything else `undefined`; the result is a clean copy (`cleanZ` drops `-0`) |
| `pickBearing(c, r)` | `-> radians` | where the radius handle sits: the first of `[-π/4, π/4, 3π/4, -3π/4, π/2, -π/2, 0, π]` that puts it on the plane (both parts within 2.8) and off 0 (at least 0.3 away) |
| `pickPhi(c, r)` | `-> [0, 2π)` | where the probe starts: the first of `[π/2, -π/2, π/4, -π/4, 3π/4, -3π/4, 0, π]` that is usable, as an angle in [0, 2π) |
| `frameFor(shape)` | `-> null \| [lo, hi]` | for a circle whose bounding box leaves ±3.2: the two corners to fit the z-plane to; else `null` (lines too) |
| `shapeFromValues(vals)` | `-> null \| state` | a full station state with `preset: 'custom'`, `fromValues: true`, `stage: 'both'`, `s: 1`, `turn: 0` |
| `shapeKey(shape)` | `-> string` | changes with the shape, not with the probe or the bearing |
| `loadedText(shape)` | `-> string` | `Now on the page: circle \|z - i\| = 1.` (`describeShape`) |

`presetFor` gains one line (`values` -> `shapeFromValues(...) || stateOf('circle1')`); a values preset with no valid shape is the handout circle and shows no note. New DOM: `p#reciprocal-fresh.callout[hidden]` (in the template after the header), `div.row#reciprocal-problem-decisions` after the statement line.
`renderProblemNote()` writes the fresh note into the existing `#reciprocal-problem-note` while `shapeKey(st.shape) === fresh.key`, else iteration 1's two sentences; it also sets the banner.

### 4.4 `limits.js` and `derivative.js`

`limits.js` exports:

| export | signature | contract |
|---|---|---|
| `VALUES_SHAPE` | frozen `{ fn: FN_IDS, path: PATH_IDS, m: 'real' }` | the enum arrays are the station's own (`['dir', 'x-over-z']`, and its path ids) |
| `limitsFromValues(vals)` | `-> null \| { applied, fnId, path, m }` | missing or invalid parts are the defaults (`dir`, `parabola`, `m = 1`); `m` counts only with `path === 'line'` and only if finite and \|m\| <= 3; `applied` when `fn` or `path` was valid |
| `limitsLoaded(fnId, path, m)` | `-> string` | `Now on the page: g = z²/\|z\|², way in: y = 2x.` (`fnById(fnId).label`, the station's `pathDescription`) |

`limits.js` new local: `freshOn()`, `cardKey`, `syncCard()` (rebuilds the card only when `(problem, fresh on)` changes; called from `refreshFn()` and at the end of `refreshPath()`).

`derivative.js` exports (the card renderer and the generalised `compiledFn` are shared with limits):

| export | signature | contract |
|---|---|---|
| `VIDEO_ID` | `'zoom-cr'` | |
| `VALUES_SHAPE` | frozen `{ fn: fnSpec, z0: 'complex' }` | `fnSpec`: a string of 1..40 characters -> `{ id }`; an object with a `src` string of 1..400 characters (not blank) -> `{ src }`; anything else dropped |
| `Z0_REQUEST_MAX` | `5` | a requested z₀ has both parts within 5 |
| `customFrom(src)` | `string -> { ok: true, custom: { id: 'custom', src, f, tex } } \| { ok: false, message }` | `compile(src)` from `parse.js`; `tex = toTex(src)` or `null`; `message` is `err.message` when `err instanceof ParseError`, else `The function could not be read.` |
| `derivativeFromValues(vals)` | `-> null \| { applied, fnId, custom, z0, error }` | `fnId` is a chip id or `'custom'`; an id with no chip but in the catalogue opens as custom with that entry's `src`; an id not in the catalogue -> `error: 'This page cannot open the function "<id>".'`; a bad source -> `error: <the parser's sentence>`; `z0` null unless within `Z0_REQUEST_MAX`; the default function is kept when `fn` is unusable, and a valid `z0` still applies |
| `derivativeLoaded(fnId, custom, z0)` | `-> string` | `Now on the page: f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.` (a custom function is written as it was sent) |
| `glyphCaption(model)` | `microscope result -> string` | the four sentences of section 2.5 |
| `compiledFn(fnId)` | `string \| { f } -> function` | a reference object returns its `f`; an object without a function throws `RangeError` |
| `renderProblemCard(host, problemId, { note = '' } = {})` | `-> void` | empties the host; `null` or an unknown id -> `host.hidden = true`, empty, no chips; else statement, `p#<host.id>-note` (hidden when empty), `div#<host.id>-decisions` holding the chips (prefix `host.id`), then the iteration-1 "why" line |

`derivative.js` mount-time state: `fresh`, `custom`, `customError`, `movedZ0`; `ref()` = `custom` when `st.fnId === 'custom'` else the id (what `microscope` and `compiledFn` take). New DOM: `button#derivative-fn-custom`, `p#derivative-custom-note`, `p#derivative-custom-error`,
`div#derivative-readout-row` (glyph, readout), `p#derivative-glyph-text`, `div#derivative-video-host`. `syncGlyph(model)` runs in `refreshModel()` after the readout is written. `showZ0()` (the existing panning helper) runs once after the first refresh when `movedZ0`.

### 4.5 `cauchy-riemann.js`

| export | signature | contract |
|---|---|---|
| `VALUES_SHAPE` | frozen `{ fn: fnSpec, z0: 'complex' }` | as derivative's |
| `customFrom(src)` | as derivative's | |
| `crFromValues(vals)` | `-> null \| { applied, fnId, custom, z0, error }` | a chip id in `CR_FN_IDS` except `const-u`; otherwise as derivative's (`const-u` is a chip of this page, not a catalogue function, so it is an error id); `z0` null unless both parts are within `Z_HALF` (2) |
| `crLoaded(fnId, custom, z0)` | `-> string` | `Now on the page: f(z) = e^x(cos y + i sin y), at z₀ = 0.5 + 0.8i.` (`CR_FUNCTIONS[id].chipLabel`, or the source as sent) |
| `crGridCheck(f, half = 2)` | `-> { ok, failAt, zero, count }` | `crReport` at the 25 integer points x, y in -2..2 (x ascending, then y): `ok` = CR holds at all; `failAt` = the first failure; `zero` = f′ is 0 (below 1e-6) at every point; `count` = 25 |
| `crCustomCheck(report, grid)` | `-> string` | the four sentences of section 5.6 step 7 |

`CR_FN_IDS` and `CR_FUNCTIONS` are untouched (pinned). The custom function is a per-mount entry, `customEntry`, built from `state.custom`: `{ id: 'custom', chipLabel: 'custom', src, problem, everywhere: 'depends', partials: { ux: null, uy: null, vx: null, vy: null } }`,
read through `entryOf(id)`; `getF('custom')` returns `state.custom.f`. New DOM: `button#cauchy-riemann-fn-custom`, `div#cauchy-riemann-custom-error`, `p#cauchy-riemann-custom-check` (after `#cauchy-riemann-verdict`),
`div#cauchy-riemann-readout-row` (glyph, readout). `renderProblemCallout(box, problemId, note = '')` gains the note and the chips (host id prefix `box.id`).

---

## 5. Algorithms (numbered; Appendix A is the exact code)

### 5.1 Shared steps

1. **Read a request.** `vals = valuesOf(ctx.preset, VALUES_SHAPE)`. `null` means "not a values preset": do nothing new. An object (possibly `{}`) means "a values preset": hand it to the station's `...FromValues`.
   Never read `ctx.preset.values` directly (the kit freezes and filters it; unit test S1).
2. **Apply through the station's own state**, not through new setters: the helper returns the fields of the station's existing state object (`init`, `st`, `state`) and mount fills the same variables a problem preset fills.
   Anything missing or invalid keeps the station default. A request with no valid field has `applied === false` and nothing else happens (no note, no banner, no error line).
3. **The note.** `lead = freshNote(problemById(P), preset)` where `P` is the problem the card will show. `lead === ''` (the request is for another problem than the card's) means no note and no banner, but the numbers still apply.
   Else `fresh = { <the identity of the numbers>, note: noteOf(lead, loaded), banner? }`.
4. **Keep it only while true.** Every `refresh` recomputes `on = freshnessTest(fresh, state)` (the table in 4.1) and writes `note` or `''`: set `textContent` and `hidden` only when the text changes (no layout work per pointer move).
   A student who moves the thing the request set (the seam, the way in, the function, the shape) has "your own numbers" and the note goes; a student who puts it back sees it again (script step A3, limits).
5. **The chips.** `renderProblemCard` and `renderProblemCallout` (and branches' and reciprocal's one-time builders) append `div#<card id>-decisions` holding `decisionChips(problem, { idPrefix: <card id> })`. A card that is rebuilt (limits, derivative, cauchy-riemann: on every function change) rebuilds its chips,
   so the chips always name the active problem; a card with no problem is `hidden` and empty, so it has no chips.
6. **A function from a request** (derivative and cauchy-riemann): `spec = vals.fn`.
   a. `spec.id` is a chip id of this page: select it.
   b. `spec.id` is in the catalogue (`fnById`) but has no chip here: `customFrom(known.src)` and select the custom chip (D10).
   c. `spec.id` is not in the catalogue: keep the default function, `error = 'This page cannot open the function "<id>".'`.
   d. `spec.src`: `customFrom(src)`; `ok` selects the custom chip; else keep the default and `error = err.message`, verbatim (`err instanceof ParseError`).
   e. Show `error` in `#<station>-custom-error` (`role="alert"`) as `'The function from the Rehearsal Room could not be read, so this page opened on its own function. '` plus a `span` holding the message. No `console.error`.
7. **The glyph** (`syncGlyph`): `fp` is the move (f′(z₀) on derivative when it exists and f is defined; A on cauchy-riemann when f is finite near z₀). `|fp| < 1e-9` counts as the zero move. `svg.toggleAttribute('hidden', !fp)`; when `fp`, `updateGlyph(svg, fp)`.
   `updateGlyph` skips the DOM work when the move is unchanged (the kit caches the last key), so calling it on every pointer move is free.

### 5.2 `branches.js`

1. `fv = branchesFromValues(valuesOf(preset, VALUES_SHAPE))`.
2. The opening state keeps the iteration-1 order: preset `problem` 2.4.1 (seam 0, n = 3, z = `PROBLEM_Z`) first, then (new) `fv.applied`, then a `token`. So a problem preset can never be shadowed by a request.
3. `fv.applied`: `init = { seam: fv.seam, n: fv.n, z: fv.z }`; `walkOnMount = fv.walk`; `lead = freshNote(problemById('2.4.1'), preset)`; when `lead`: `problemActive = true` (the header marks 2.4.1 as the active problem chip) and
   `fresh = { n, seam, note: noteOf(lead, branchesLoaded(n, seam)), banner: 'Fresh numbers from the Rehearsal Room. ' + loaded + ' The handout problem is at the bottom of the page.' }`.
   The seam is the request's, snapped by `seamFromSlider`; z goes to `unitPoint(seam + π)`, the ray opposite the seam (so the first picture shows a continuous value at a point where the seam is not).
4. Build `freshEl` (`p#branches-fresh.callout[data-tone="accent"][hidden]`), `probNote` (`p#branches-problem-note.muted[hidden]`), `decisionsEl` (`div#branches-problem-decisions.br-decisions` holding `decisionChips(prob, { idPrefix: 'branches-problem' })`).
5. Insert: `el.append(header, freshEl, controls, planes, walks, readout, working, surfPanel)`; the problem panel is `probPanel.append(st, probNote, decisionsEl, hint, row, answerBox)`.
   The banner is **outside** the problem panel and the panel's new paragraphs are not `.callout`: iteration 1 pins "no `#branches-problem .callout` visible before Show the answer".
6. `syncFresh()` at the end of `refresh()`: `on = fresh && state.n === fresh.n && |state.seam - fresh.seam| < 1e-9`; write `probNote` and `freshEl` (`textContent` only on change, then `hidden = !text`).
7. After the first `refresh()` (the readout already shows the request's numbers): `if (walkOnMount) startWalk(walkOnMount)`: the station's own walk. `startWalk` already completes at once under reduced motion, which is the rule the request inherits (script step A3).
8. A bad or empty request (`n` 9, seam `'x'`, walk `'sideways'`) has `applied === false` and the station opens on its defaults (`n = 3`, seam −π, `z = -1 + 0.5i`) with `#branches-fresh` and `#branches-problem-note` hidden.
9. Unmount: unchanged.

### 5.3 `reciprocal.js`

1. `presetFor(preset)`: `values` -> `shapeFromValues(valuesOf(preset, VALUES_SHAPE)) || stateOf('circle1')` (before the `problem`, `topic`, `token` branches, which are not values presets).
2. `shapeFromValues`: a circle gets `bearing = pickBearing(c, r)` and the probe `phi = pickPhi(c, r)`; a line gets `probe: { s: 1 }`; `preset: 'custom'`, `stage: 'both'`, `s: 1`, `turn: 0`, `playing: false`, `fromValues: true`.
   The two pickers walk a fixed list of angles and take the first that keeps the handle on the plane and off 0, so the circle |z + i| = 1 (which passes through 0 at the angle −π/2) starts its probe at π/2, not on the pole.
3. `lead = st.fromValues ? freshNote(problemById('2.5.1'), preset) : ''`; `fresh = { key: shapeKey(st.shape), note: noteOf(lead, loadedText(st.shape)), banner: 'Fresh numbers from the Rehearsal Room. ' + loadedText(st.shape) + ' The handout problem is at the bottom of the page.' }`.
4. `renderProblem()`: after the statement line, `div.row#reciprocal-problem-decisions` holding the chips (prefix `reciprocal-problem`); `#reciprocal-problem-note` keeps its place and id at the end of the card.
5. `renderProblemNote()`: `on = fresh && shapeKey(st.shape) === fresh.key`; the note is `fresh.note` when `on`, else iteration 1's sentence for the preset (`This is problem 2.5.1 exactly.` or `You changed the shape. The problem itself is the circle |z − 1| = 1.`);
   the banner `#reciprocal-fresh` follows `on`. Dragging the probe leaves `on`; dragging a handle or choosing a preset chip ends it.
6. After `syncControls()`: `if (st.fromValues) { const fit = frameFor(st.shape); if (fit) zplane.fitTo(fit, 0.1); }`, so a circle such as |z − 2| = 2 (x from 0 to 4) is wholly in view; the default view is ±3.2.
7. `flushNow()` as before.

### 5.4 `limits.js`

1. `preset.kind === 'values'` is a new `else if` between `problem` and `token`: `fv = limitsFromValues(valuesOf(preset, VALUES_SHAPE))`.
2. `fv.applied`: `st.fnId, st.path, st.m = fv.fnId, fv.path, fv.m`; `lead = freshNote(problemById(PROBLEM_FOR_FN[fv.fnId]), preset)`; when `lead`: `fresh = { fnId, path, m, note: noteOf(lead, limitsLoaded(fnId, path, m)) }`.
3. `freshOn() = fresh && st.fnId === fresh.fnId && st.path === fresh.path && (st.path !== 'line' || st.m === fresh.m)`.
4. `syncCard()` replaces the direct `renderProblemCard(problemBox, PROBLEM_FOR_FN[st.fnId] || null)` call: `key = (PROBLEM_FOR_FN[st.fnId] || '') + '|' + (freshOn() ? 1 : 0)`; when it differs from `cardKey`, rebuild the card with `{ note: freshOn() ? fresh.note : '' }`.
   It is called from `refreshFn()` and at the end of `refreshPath()` (a path or slope change decides whether the numbers are still the request's), so dragging the slope slider does not rebuild the card on every input (the key is unchanged) and a click on the same way in puts the note back.
5. Every limits card has chips (2.3.1 and P5 are the only two problems; there is no `null` problem here).

### 5.5 `derivative.js`

1. `preset.kind === 'values'` (new `else if`): `fv = derivativeFromValues(valuesOf(preset, VALUES_SHAPE))`; `customError = fv.error`; when `fv.applied`: `st.fnId = fv.fnId`, `custom = fv.custom`, `st.z0 = fv.z0` (and `movedZ0 = true`) when given;
   `pid = preset.problem`; `lead = pid is one of 3.1.1, 3.1.2, P6 ? freshNote(problemById(pid), preset) : ''`; `fresh = { fnId: st.fnId, problem: pid, note: noteOf(lead, derivativeLoaded(st.fnId, custom, st.z0)) }`.
   The card therefore shows the request's problem (3.1.1 for a polynomial, 3.1.2 for k\|z − a\|², P6 for the Re/Im/conj family) even when the function is the custom one, which has no entry of its own in `PROBLEM_FOR_FN`.
2. The custom chip: when `custom`, `button#derivative-fn-custom.chip` (text `custom`, a `ld-tag` span with the problem id, `title` = `f(z) = <src>`), `aria-pressed` follows the selection, registered in `fnButtons` under `'custom'` so `refreshFn()`'s loop presses it. The note `p#derivative-custom-note` shows `Custom function from the Rehearsal Room: f(z) = <TeX>` (`tex()` of `toTex(src)`; plain text if `toTex` threw). `p#derivative-custom-error` as 5.1 step 6e.
3. `ref()` (`custom` or the id) is what `microscope`, `compiledFn` and the ring code receive, so the three planes, the explainer and the readout need no change (D14).
   `refreshFn()`: `renderProblemCard(problemBox, freshOn() ? fresh.problem : (PROBLEM_FOR_FN[st.fnId] || null), { note: freshOn() ? fresh.note : '' })`, with `freshOn() = fresh && st.fnId === fresh.fnId`; the iteration-1 chips and `PROBLEM_FOR_FN` are unchanged.
4. **Glyph row.** `readoutRow = div#derivative-readout-row.ld-readout-row` holds `glyph` (`moveGlyph({re:0,im:0}, { size: '2em', id: 'derivative-glyph' })`) then the unchanged `#derivative-readout` (`readoutRow.append(glyph, readout)`): siblings, never nested.
   `syncGlyph(m)`: `fp = m.defined && m.exists ? m.fprime : null`; `|fp| < 1e-9` becomes `{0, 0}`; `glyph.toggleAttribute('hidden', !fp)` (an `SVGElement` has no `hidden` property: `glyph.hidden = ...` would silently do nothing, D12); `if (fp) updateGlyph(glyph, fp)`;
   `#derivative-glyph-text.textContent = glyphCaption(m)`. Called from `refreshModel()` right after `readout.textContent = buildReadout(m)`, so the readout and the glyph never disagree for a frame.
5. `if (movedZ0) showZ0();` once, after the first `refreshFn()`: the station's own helper pans the z-plane when a requested z₀ is outside the opening view (script step A3: z₀ = 4 + 3i).
6. Layout order: `el.append(header, controls, problemBox, twoPlanes, lower, videoHost, readoutRow, glyphText, verdict, status, links)`. `videoHost` (`div#derivative-video-host[hidden]`) comes right after `lower`, the row that holds the third plane.
7. **Video.** After the hook is set: `videoPanel(videoHost, VIDEO_ID).then(p => { if (destroyed) { if (p) p.remove(); return; } if (p) { videoEl = p; videoHost.hidden = false; } }).catch(() => {})`. `videoPanel` resolves `null` while the manifest has no `zoom-cr` entry
   (today: `VIDEOS = []`), so the host stays hidden and empty, and the `.station` flex gap does not leave a hole (a `hidden` element takes no gap).
8. Unmount: `if (videoEl) { videoEl.remove(); videoEl = null; }` goes before the hook removal; `releaseStationStyle();` remains the last statement.

### 5.6 `cauchy-riemann.js`

1. `preset.kind === 'values'` (new `else if`): `fv = crFromValues(valuesOf(preset, VALUES_SHAPE))`; `state.customError = fv.error`; when `fv.applied`: `state.fnId = fv.fnId`, `state.custom = fv.custom`, `state.z0 = fv.z0` if given;
   `lead = preset.problem is 3.2.1 or P7 ? freshNote(problemById(preset.problem), preset) : ''`; `state.fresh = { fnId, problem: preset.problem, note: noteOf(lead, crLoaded(fnId, custom, state.z0)) }`.
2. `getF(id)`: `id === 'custom'` returns `state.custom.f`; `customEntry` (section 4.5) and `entryOf(id)` replace the two places that read `CR_FUNCTIONS[state.fnId]` (`.problem` in `setFn`, `.partials` in `writeJacobian`). `CR_FUNCTIONS` itself is untouched.
3. The custom chip `button#cauchy-riemann-fn-custom` is appended to `#cauchy-riemann-fn-chips` when `state.custom`; `div#cauchy-riemann-custom-error` goes after `#cauchy-riemann-fn-note` (5.1 step 6e).
4. `renderProblemCallout(box, problem, note)`: head, `p#<box.id>-note` (hidden when empty), `div#<box.id>-decisions`, the iteration-1 why line. `setFn` passes `freshOn() ? state.fresh.problem : entryOf(id).problem` and the note, so the card stays hidden for `conj`, `re`, `abs2`, `sq-plus-z` and shows 3.2.1 or P7 as before.
5. The readout row: `readoutRow = div#cauchy-riemann-readout-row.cr-readout-row` holds `glyph` (`moveGlyph(..., { size: '2em', id: 'cauchy-riemann-glyph' })`) then the unchanged `#cauchy-riemann-readout`; the existing `#cauchy-riemann-move` sentence stays under the row.
   `syncGlyph(r)`: `glyph.toggleAttribute('hidden', !r.finite)`; when finite `updateGlyph(glyph, r.A)`: the move of **A** (not f′): conj z has A = 0 and reads `no move: 0` (a pure mirror), \|z\|² at 0.5 + 0.8i has A = 0.5 − 0.8i and reads `move: turn -58°, stretch 0.943`. Called in `writeText(r, fz0)` right after `prose(verdictEl, crVerdict(state.fnId, r, state.z0))`.
6. `writeFnNote(id)`: a chip id keeps `prose(fnNote, FN_NOTES[id])`; `custom` writes `Custom function from the Rehearsal Room: f(z) = <TeX>. u and v are read off numerically, so the Jacobian cells say numeric where a textbook formula would go.`
7. **The custom check.** `p#cauchy-riemann-custom-check` (hidden unless `state.fnId === 'custom'`). `state.grid = crGridCheck(state.f)` is computed once when the custom function is first selected (25 `crReport` calls, 1.2 ms for e^{2z}); `writeText` sets `customCheck.textContent = crCustomCheck(r, state.grid)`:
   a. `!r.finite`: `f has no value near z₀, so there is nothing to test.`
   b. `!r.holds`: `CR fails at z₀ (u_x = 1 but v_y = -1), so f has no derivative here and cannot be entire.` (the first equation that fails: `u_x = …but v_y = …` when the first holds-flag is false, else `u_y = … but -v_x = …`; numbers through the station's `numText`).
   c. `r.holds` but `!grid.ok`: `CR holds at z₀ but fails at -2 - 2i, so f is not differentiable everywhere and is not entire.`
   d. all hold: `CR holds at z₀ and at all 25 points of the grid x, y = -2 to 2, so f looks entire. That is a check at sample points. The proof is the partials: compare u_x with v_y and u_y with -v_x.` then ` f′(z₀) = -1.` or, when f′ is 0 at every point (`grid.zero`), ` f′ is 0 at every point checked, so f is constant (Theorem 3.2.13).`
   The sentence is evidence and says so; it is **not** put into `prose(verdictEl, ...)`, whose line is pinned.
8. `writeJacobian(r)` reads `entryOf(state.fnId).partials`; a custom function has `null` formulas, so each cell reads `u_x = numeric` beside its number (the station's existing rendering of a missing formula).
9. Unmount: unchanged (the glyph, the chips and the notes are children of `el`; there is no listener of ours to remove).

---

## 6. Mathematics

Every number below was computed twice: by hand (the line of algebra is written out) and by the station's own functions in the scratch run; the two agree to the digits shown.
Angles are radians unless a `°` follows. "Cartesian" and "polar" are the two addresses of the problem's own cards (`routes.cart`, `routes.polar` in `problems.js`); each fresh example below gets both.

### 6.1 The facts the five stations share

1. **The local model.** For f = u + iv near z₀: f(z₀ + h) = f(z₀) + A h + B h̄ + o(|h|), with
   A = ½[(u_x + v_y) + i(v_x − u_y)] and B = ½[(u_x − v_y) + i(v_x + u_y)] (partials at z₀).
   Checks: z² gives A = 2z, B = 0; |z|² gives A = z̄, B = z; Re z gives A = B = ½; z̄ gives A = 0, B = 1.
2. **The quotient.** With h = ρe^{iφ}: (f(z₀ + h) − f(z₀))/h → A + B e^{−2iφ} as ρ → 0, because h̄/h = e^{−2iφ}. As φ goes round this is a circle with centre A and radius |B|. f′(z₀) exists iff |B| = 0, and then f′(z₀) = A.
3. **Cauchy–Riemann.** B = 0 ⇔ u_x = v_y and u_y = −v_x. Then f′ = u_x + i v_x (= v_y − i u_y).
4. **The move.** A nonzero complex number w is the move "turn Arg w, stretch |w|". The glyph's words are `move: turn ` + (Arg w in degrees, one decimal, `.0` dropped) + `°, stretch ` + (|w| to 3 decimals, trailing zeros dropped); w = 0 is `no move: 0`; a negative real w has Arg w = +π (turn 180°).
5. **Branch of an n-th root.** A window (σ, σ + 2π] names every nonzero z by exactly one θ ≡ Arg z (mod 2π). The branch is f(z) = r^{1/n} e^{iθ/n}. It is continuous at every z whose ray is not the seam ray σ. Crossing the seam, θ jumps by 2π, so f is multiplied by e^{±2πi/n}.
   z on the ray opposite the seam has θ = σ + π, strictly inside the window.
6. **Inversion.** w = 1/z sends r to 1/r and every name θ of arg z to the name −θ of arg w. A circle |z − c| = |c| (through 0, centre c = a + bi) is r = 2|c| cos(θ − β) (β = Arg c) and goes to the line Re(c w) = a u − b v = ½.
   A line Re z = c is r = c/cos θ and goes to the circle with centre 1/(2c) and radius 1/(2|c|) through 0.
7. **Direction-only limits.** z/z̄ = e^{2iθ} (θ a name of arg z) and x/z = cos θ e^{−iθ} = ½ + ½ e^{−2iθ}: functions of the direction of approach alone. Along y = mx: x/z = 1/(1 + im), and z/z̄ = (1 + im)/(1 − im) = ((1 − m²) + 2im)/(1 + m²).

### 6.2 Problem 2.4.1 (branches; Polar, names: continuous)

*Handout (what the page opens on): cube root, seam 0, z = −1.*
- Cartesian: no short formula. θ needs arctan with a case split on the signs of x and y, which is a window in disguise. At z = −1 (x = −1, y = 0): θ = π in the window (0, 2π], so f(−1) = cos(π/3) + i sin(π/3) = ½ + (√3/2)i = 0.5 + 0.866i.
- Polar: z = re^{iθ}, 0 < θ ≤ 2π, f = r^{1/3} e^{iθ/3}. The negative real axis is θ = π, in the middle of the window, so f is continuous there. The principal branch (window (−π, π]) jumps from e^{iπ/3} to e^{−iπ/3} across that axis (factor e^{−2πi/3}).
- Station readout: `seam = 0; window (0, 2π]; z = -1; z^(1/3) on this branch = e^(i π/3) = 0.5 + 0.866i; chosen θ = π; Arg z = π`.

*Fresh example: n = 2, seam π/2 (the request `{ n: 2, seam: π/2, walk: null }`), z on the opposite ray = −i.*
- Cartesian: z = −i (x = 0, y = −1). Square roots of −i are ±(√2/2)(1 − i). Which one is "the" value needs a rule for θ; the Cartesian formula gives no rule, only the two candidates.
- Polar: window (π/2, 5π/2]; −i has θ = 3π/2 (it is 3π/2 − π/2 = π counterclockwise from the seam, the middle of the window). f = 1^{1/2} e^{i 3π/4} = cos 135° + i sin 135° = −0.707 + 0.707i. Check: (−0.707 + 0.707i)² = −2(0.707)² i = −i (checked). The principal square root of −i is 0.707 − 0.707i, the negative of this one: the two branches disagree here, and the seam is the reason.
- Continuity: points −it (t > 0) have θ = 3π/2 and neighbours θ = 3π/2 ± δ, all inside (π/2, 5π/2): continuous. At the seam point i, values from the two sides are e^{iπ/4} (θ → π/2⁺) and e^{i5π/4} = −e^{iπ/4} (θ → 5π/2⁻): factor e^{2πi/2} = −1, a jump.
- Station readout: `seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2`.

The other generator outputs (all in the scratch run, `n` in {2, 3}; seam in {0, −π/2, π/2}):

| n | seam | z (ray opposite) | θ | f(z) = e^{iθ/n} | readout fragment |
|---|---|---|---|---|---|
| 3 | 0 | −1 | π | e^{iπ/3} = 0.5 + 0.866i | `z^(1/3) on this branch = e^(i π/3) = 0.5 + 0.866i` |
| 2 | 0 | −1 | π | e^{iπ/2} = i | `= e^(i π/2) = i` |
| 3 | −π/2 | i | π/2 | e^{iπ/6} = 0.866 + 0.5i | `= e^(i π/6) = 0.866 + 0.5i` |
| 2 | −π/2 | i | π/2 | e^{iπ/4} = 0.707 + 0.707i | `= e^(i π/4) = 0.707 + 0.707i` |
| 3 | π/2 | −i | 3π/2 | e^{iπ/2} = i | `= e^(i π/2) = i` |
| 2 | π/2 | −i | 3π/2 | e^{i3π/4} = −0.707 + 0.707i | `= e^(i 3π/4) = -0.707 + 0.707i` |

Walks: with seam 0 and `walk: 'along'` (z walks along the negative real axis) the status ends `continuous`; with seam −π and `walk: 'across'` (z crosses the negative real axis) the status ends `jumps at the negative real axis`.

### 6.3 Problem 2.5.1 (reciprocal; Polar, names: any)

*Handout: |z − 1| = 1, centre c = 1.*
- Cartesian: x² + y² = 2x on the circle, so u = x/(x² + y²) = x/(2x) = ½ for every point but z = 0, and v = −y/(2x) takes every real value: the line Re w = ½. At 1 + i the image is (1 − i)/2 = ½ − ½i.
- Polar: r = 2 cos θ, w = e^{−iθ}/(2 cos θ) = ½ − (i/2) tan θ; Re w ≡ ½, and tan θ sweeps ℝ as θ goes through (−π/2, π/2). 0 goes to ∞, so the circle opens into a line.
- Station: `shape: circle |z - 1| = 1; image: line Re w = 0.5; ...; 1/p = 0.5 - 0.5i` (the i1 preset readout).

*Fresh examples (the request's shape; probe at the angle `pickPhi` chooses):* general rule from 6.1 item 6, image line a·u − b·v = ½ for the circle |z − (a + bi)| = |a + bi|. Both addresses give it:
Cartesian: x² + y² = 2(ax + by), w = (x − iy)/(x² + y²), so a u − b v = (ax + by)/(x² + y²) = ½. Polar: with c w = e^{i(β−θ)}/(2 cos(θ − β)) = ½ − (i/2) tan(θ − β), Re(c w) = ½.

| shape | image (formula) | probe p | 1/p | \|1/p\| | readout (as the station prints it) |
|---|---|---|---|---|---|
| circle centre i, r 1 | −v = ½: Im w = −0.5 | 2i (φ = π/2) | −0.5i | 0.5 | `shape: circle \|z - i\| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; \|1/p\| = 0.5` |
| circle centre −i, r 1 | v = ½: Im w = 0.5 | −2i (φ = 3π/2: π/2 would be 0, the pole) | 0.5i | 0.5 | `shape: circle \|z + i\| = 1; image: line Im w = 0.5; p = -2i; 1/p = 0.5i; \|1/p\| = 0.5` |
| circle centre 2, r 2 | 2u = ½: Re w = 0.25 | 2 + 2i | (2 − 2i)/8 = 0.25 − 0.25i | 0.354 | `shape: circle \|z - 2\| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; \|1/p\| = 0.354` |
| circle centre −1, r 1 | −u = ½: Re w = −0.5 | −1 + i | (−1 − i)/2 = −0.5 − 0.5i | 0.707 | `shape: circle \|z + 1\| = 1; image: line Re w = -0.5; p = -1 + i; 1/p = -0.5 - 0.5i; \|1/p\| = 0.707` |
| circle centre 1 + i, r √2 | u − v = ½ | 1 + 2.414i | (1 − 2.414i)/6.828 = 0.146 − 0.354i | 0.383 | `shape: circle \|z - (1 + i)\| = 1.414; image: line 1u - 1v = 0.5; p = 1 + 2.414i; 1/p = 0.146 - 0.354i; \|1/p\| = 0.383` |
| line Re z = 2 (a = 2, b = 2 + i) | circle through 0, centre ¼, radius ¼ | 2 + i | (2 − i)/5 = 0.4 − 0.2i | 0.447 | `shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; \|1/p\| = 0.447` |

Hand checks: the probe 2i lies on |z − i| = 1 (distance 1) and 1/p = −0.5i has Im = −0.5 (checked); (0.25 − 0.25i) has Re 0.25 (checked); for the line, |0.4 − 0.2i − 0.25| = √(0.15² + 0.2²) = √0.0625 = 0.25 (checked); for centre 1 + i: 0.1464 − (−0.3536) = 0.5 (checked).
The line x = c, polar route: r = c/cos θ, so w = cos θ e^{−iθ}/c = (1/c)(½ + ½e^{−2iθ}): centre 1/(2c), radius 1/(2|c|) (the same circle as P5's, scaled).

### 6.4 Problems 2.3.1 and P5 (limits; Polar, names: any)

*2.3.1 handout: g = z²/|z|², along y = x².*
- Cartesian: on y = x²: (x² − x⁴ + 2ix³)/(x² + x⁴) = (1 − x² + 2ix)/(1 + x²) → 1 as x → 0. Along the imaginary axis it is −1, so the full limit does not exist.
- Polar: g = z/z̄ = e^{2iθ}, θ a name of arg z; y = x² arrives tangent to the real axis (θ → 0), so g → e^0 = 1. Real axis 1, positive imaginary axis e^{iπ} = −1: different directions, different values.
- Station: `limit along this path: 1; set of directional limits: circle center 0 radius 1; limit exists: no`.

*Fresh examples (way in `y = mx`, `x = 0`, `y = x²`):*

| way in | Cartesian | Polar (θ = arctan m) | value | readout fragment |
|---|---|---|---|---|
| y = 2x | (x² − 4x² + 4ix²)/(5x²) = (−3 + 4i)/5 | e^{2iθ}: cos 2θ = (1 − 4)/5 = −0.6, sin 2θ = 4/5 = 0.8 | −0.6 + 0.8i | `path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; ...` |
| y = x | (x² − x² + 2ix²)/(2x²) = i | e^{iπ/2} | i | `path: y = x; ...; limit along this path: i` |
| y = −x | −i | e^{−iπ/2} | −i | |
| y = −2x | (−3 − 4i)/5 | e^{−2i·1.107} | −0.6 − 0.8i | |
| y = x/2 | (0.75 + i)/1.25 | cos 2θ = 0.6 | 0.6 + 0.8i | |
| x = 0 | −y²/y² = −1 | θ = π/2: e^{iπ} | −1 | `path: x = 0; value at t: -1; limit along this path: -1` |
| y = x² | → 1 | θ → 0 | 1 | `limit along this path: 1` |

For every way in: `set of directional limits: circle center 0 radius 1; limit exists: no`.

*P5 handout: x/z = (Re(1 + z) − 1)/z, along y = 0 (the page opens with `path: y = 0`).*
- Cartesian: Re(1 + z) − 1 = x, so the fraction is x/z; along the real axis x/x = 1; along the imaginary axis 0/(iy) = 0: two values, no limit.
- Polar: x/z = r cos θ/(re^{iθ}) = cos θ e^{−iθ} = ½ + ½e^{−2iθ}: θ = 0 gives 1, θ = π/2 gives 0; all directions trace the circle centre ½, radius ½, through 0 and 1.
- Fresh (the same x/z; x/z along y = mx is 1/(1 + im) = (1 − im)/(1 + m²)):

| way in | Cartesian | Polar | value | readout fragment |
|---|---|---|---|---|
| y = 2x | x/(x + 2ix) = 1/(1 + 2i) = (1 − 2i)/5 | cos θ e^{−iθ}, tan θ = 2: (1/√5)(1 − 2i)/√5 | 0.2 − 0.4i | `path: y = 2x; value at t: 0.2 - 0.4i; limit along this path: 0.2 - 0.4i; set of directional limits: circle center 0.5 radius 0.5; limit exists: no` |
| y = x | 1/(1 + i) = (1 − i)/2 | ½ + ½e^{−iπ/2} | 0.5 − 0.5i | |
| y = −x | (1 + i)/2 | ½ + ½e^{iπ/2} | 0.5 + 0.5i | |
| y = x/2 | 1/(1 + 0.5i) = (1 − 0.5i)/1.25 | | 0.8 − 0.4i | |
| x = 0 | 0/(iy) = 0 | θ = π/2: cos θ = 0 | 0 | `path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5` |
| y = x² | x/(x + ix²) = 1/(1 + ix) → 1 | θ → 0 | 1 | `limit along this path: 1` |

(A cubic way in, y = x³, is a way the station cannot draw: the generator sends no request for it, `card.values === null`, and the Rehearsal Room hides "Open at the station". 50 of the first 400 seeds of P5 are such cards.)

### 6.5 Problem 3.1.1 (derivative; Cartesian, names: none)

*Handout: f = z² + z at z₀ = 1 + i.*
- Cartesian: (f(z + h) − f(z))/h = (2zh + h² + h)/h = 2z + 1 + h → 2z + 1. At 1 + i: f′ = 3 + 2i.
- Polar: h = ρe^{iφ}: the quotient is 2z + 1 + ρe^{iφ}, a circle of radius ρ about 2z + 1 that shrinks to a point as ρ → 0 whatever φ is (A = 3 + 2i, B = 0).
- As a move: |3 + 2i| = √13 = 3.606; Arg = arctan(2/3) = 0.588 rad = 33.7°. Glyph `move: turn 33.7°, stretch 3.606` (dashed ray: 3.606 > 2). Readout `z₀ = 1 + i; A = 3 + 2i; |B| = 0.000; f′(z₀) = 3 + 2i`.

*Fresh example: f = 2z² − 3z + 1 (`{ fn: { src: '2z^2 - 3z + 1' }, z0: 1 + i }`).*
- Cartesian: f(z + h) − f(z) = 2(2zh + h²) − 3h, so the quotient is 4z − 3 + 2h → 4z − 3. At 1 + i: 4 + 4i − 3 = 1 + 4i.
- Polar: h = ρe^{iφ}: 4z − 3 + 2ρe^{iφ}, a circle of radius 2ρ about 1 + 4i, shrinking to the point.
- Move: |1 + 4i| = √17 = 4.123; Arg = arctan 4 = 1.326 rad = 75.96°, written `76°`. Glyph `move: turn 76°, stretch 4.123`. Readout `z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i`.
- Others: −2z² + 3z − 2 at 1 + i: f′ = −4z + 3 = −1 − 4i: `move: turn -104°, stretch 4.123`; z³ + z: f′ = 3z² + 1 = 1 + 6i at 1 + i (z² = 2i): `move: turn 80.5°, stretch 6.083`.
- Spot checks the script uses: dragging z₀ to 2 for z² + z: f′ = 5, `move: turn 0°, stretch 5` and the readout starts `z₀ = 2; A = 5;`; at 0.3 − 0.7i: f′ = 2z + 1 = 1.6 − 1.4i: |·| = √4.52 = 2.126, Arg = −0.719 rad = −41.2°, `move: turn -41.2°, stretch 2.126`.

### 6.6 Problem 3.1.2 (derivative; Polar, names: any)

*Handout: f = |z|² at z₀ = 1 + i.*
- Cartesian: the quotient is z̄ + z(h̄/h) + h̄. Real h: z̄ + z = 2x = 2. Imaginary h: z̄ − z = −2iy = −2i. They agree only if 2x = −2iy, i.e. x = y = 0.
- Polar: h̄/h = e^{−2iφ}: the quotient tends to z̄ + z e^{−2iφ}, the circle with centre z̄ = 1 − i and radius |z| = 1.414. φ = 0 gives (1 − i) + (1 + i) = 2 (checked); φ = π/2 gives (1 − i) − (1 + i) = −2i (checked). f′ exists only at z = 0, where it is 0 (centre 0, radius 0); nowhere analytic.
- Station: `z₀ = 1 + i; A = 1 - i; |B| = 1.414; f′(z₀) does not exist (circle radius 1.414)`; the glyph is hidden; caption `No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.`. At 0: `z₀ = 0; A = 0; |B| = 0.000; f′(z₀) = 0`, glyph `no move: 0`.

*Fresh examples (f = k|z − a|², `src` `2*abs(z - 1)^2` etc.):* f = k(z − a)(z̄ − ā) has A = k·conj(z − a), B = k(z − a), circle centre A radius |B| = k|z − a|, a point only at z = a.
- 2|z − 1|² at 1 + i: z − a = i, A = 2(−i) = −2i, |B| = 2·1 = 2. Real h: A + B = −2i + 2i = 0; imaginary h: A − B = −4i. Readout `z₀ = 1 + i; A = -2i; |B| = 2.000; f′(z₀) does not exist (circle radius 2.000)`.
- 3|z|² at 1 + i: A = 3(1 − i), |B| = 3·1.414 = 4.243: `A = 3 - 3i; |B| = 4.243`.
- z Re z at 1 + i: A = z + z̄/2 = 1.5 + 0.5i, B = z/2 = 0.5 + 0.5i, |B| = 0.707: `A = 1.5 + 0.5i; |B| = 0.707`. (f′ exists only at 0.)
- |z − (1 + i)|² at its own centre 1 + i: z − a = 0, so A = B = 0 and f′ = 0: the zero move (`no move: 0`), the one fresh variant where the glyph appears on this problem.

### 6.7 Problem P6 (derivative; either address, names: any)

*Handout: f = Re z at z₀ = 0.3 − 0.7i.*
- Cartesian: (Re(z + h) − Re z)/h = Re(h)/h: 1 for real h, 0 for imaginary h. Two limits, so no derivative at any z. CR: u = x, v = 0 give u_x = 1 ≠ 0 = v_y.
- Polar: h = ρe^{iφ}: cos φ e^{−iφ} = ½ + ½e^{−2iφ} = A + Be^{−2iφ}, A = B = ½: the circle through 0 and 1.
- Station: `z₀ = 0.3 - 0.7i; A = 0.5; |B| = 0.500; f′(z₀) does not exist (circle radius 0.500)`; glyph hidden.

*Fresh examples (every z₀ is 0.3 − 0.7i; the circle does not depend on z₀):*

| f | A | B | circle | Cartesian (real h, imaginary h) | readout fragment |
|---|---|---|---|---|---|
| conj z | 0 | 1 | centre 0, radius 1 | h̄/h = 1, −1 | `A = 0; \|B\| = 1.000` |
| Im z | −i/2 | i/2 | centre −i/2, radius ½ | Im h/h = 0 and (ρ)/(iρ) = −i | `A = -0.5i; \|B\| = 0.500` |
| 2 Re z | 1 | 1 | centre 1, radius 1 | 2 and 0 | `A = 1; \|B\| = 1.000` |
| i conj z | 0 | i | centre 0, radius 1 | i and −i | `A = 0; \|B\| = 1.000` |

Check for Im z: A + B = 0 (real h: Im h = 0) and A − B = −i (imaginary h = iρ: ρ/(iρ) = −i) (checked). Every one of these has `|B| > 0`, so the glyph is hidden and the caption is the "No single move here" sentence.

### 6.8 Problem 3.2.1 (cauchy-riemann; Cartesian, names: none)

*Handout: f = e^x(cos y + i sin y) at z₀ = 0.5 + 0.8i.*
- Cartesian: u = e^x cos y, v = e^x sin y. u_x = e^x cos y = v_y; u_y = −e^x sin y = −v_x. Both hold everywhere, partials continuous: entire. f′ = u_x + i v_x = f(z). At 0.5 + 0.8i: e^{0.5} = 1.64872, cos 0.8 = 0.69671, sin 0.8 = 0.71736, so f′ = 1.149 + 1.183i.
- Polar (of the output): |f| = e^x, y is a name of arg f; log f = x + iy and CR for it is 1 = 1 and 0 = 0, so f′/f = 1.
- Move of A = f′: |A| = e^{0.5} = 1.649; Arg A = y = 0.8 rad = 45.8°. Glyph `move: turn 45.8°, stretch 1.649`. Readout `A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)`.

*Fresh examples (z₀ as the request says; 0.5 + 0.8i unless noted):*
- e^{−z} at z₀ = 0: u = e^{−x} cos y, v = −e^{−x} sin y. u_x = −e^{−x} cos y = v_y (checked); u_y = −e^{−x} sin y, v_x = e^{−x} sin y, so u_y = −v_x (checked). f′ = u_x + i v_x = −e^{−x} cos y + i e^{−x} sin y = −e^{−z}; at 0: −1. Polar: log f = −z, ln|f| = −x, V = −y: ∂(−x)/∂x = −1 = ∂(−y)/∂y (checked), so f′/f = −1. Move of −1: turn 180°, stretch 1: `move: turn 180°, stretch 1`. Readout `A = -1; |B| = 0.000; CR holds: yes; f′(z₀) = -1 (u_x + i v_x)`. The 25-point check holds: `CR holds at z₀ and at all 25 points of the grid x, y = -2 to 2, so f looks entire. ... f′(z₀) = -1.`
- z² at 0.5 + 0.8i: u = x² − y², v = 2xy: u_x = 2x = 1 = v_y (checked); u_y = −2y = −1.6 = −v_x (checked); f′ = 1 + 1.6i, |·| = √3.56 = 1.887, Arg = arctan 1.6 = 1.012 rad = 58.0°: `move: turn 58°, stretch 1.887`.
- z³: f′ = 3z² = 3(0.25 − 0.64 + 0.8i) = −1.17 + 2.4i: `move: turn 116°, stretch 2.67`. e^{2z}: f′ = 2e^{2z} = −0.159 + 5.434i: `move: turn 91.7°, stretch 5.437`.
- z̄ (not entire): u = x, v = −y: u_x = 1, v_y = −1 never agree. Readout `A = 0; |B| = 1.000; CR holds: no; f′ does not exist here`; glyph `no move: 0` (A = 0: a pure mirror, B e^{−2iφ} only); check `CR fails at z₀ (u_x = 1 but v_y = -1), so f has no derivative here and cannot be entire.`
- |z|²: A = z̄ = 0.5 − 0.8i, `move: turn -58°, stretch 0.943`; u_x = 2x = 1 but v_y = 0: `CR fails at z₀ (u_x = 1 but v_y = 0), ...`. At z₀ = 0 CR holds at the point but the grid fails first at x = −2, y = −2: `CR holds at z₀ but fails at -2 - 2i, so f is not differentiable everywhere and is not entire.`
- conj(e^z): A = 0, |B| = e^{0.5} = 1.649: `CR fails at z₀ (u_x = 1.149 but v_y = -1.149), ...`.

### 6.9 Problem P7 (cauchy-riemann; Cartesian, names: none)

*Handout: u ≡ c entire, so f is constant (the station's explorer chooses c and a v).*
- Cartesian: u ≡ c gives u_x = u_y = 0. CR: v_y = u_x = 0 and v_x = −u_y = 0. So f′ = u_x + i v_x = 0 on the whole plane, a domain, so f is constant.
- Polar: if f′(z₀) = ρe^{iα} ≠ 0 the map would spin by α and stretch by ρ and send a small disk to a small blob; but u ≡ c puts every image on the line Re w = c, which holds no blob. So f′ = 0.

*Fresh examples (the request sends a constant source, `'3'`, `'3i'`, `'-4'`, `'5i'`, ... with z₀ = 0.5 + 0.8i):* f ≡ c has u_x = u_y = v_x = v_y = 0 everywhere. Readout `A = 0; |B| = 0.000; CR holds: yes; f′(z₀) = 0 (u_x + i v_x)`; glyph `no move: 0`; the 25-point check finds f′ = 0 at all points: `... f′ is 0 at every point checked, so f is constant (Theorem 3.2.13).` Both `3` (u = 3, v = 0) and `3i` (u = 0, v = 3) give the same words.
(For `3i`, u is the constant 0 and v the constant 3: u_x = u_y = 0 still; the statement of P7 asks about u, and the answer is the same: f′ = 0.)

### 6.10 Expected values the verification checks (all from section 6)

| label | value |
|---|---|
| derivative 3.1.1, glyph label | `move: turn 33.7°, stretch 3.606` |
| derivative 3.1.1 at z₀ = 2, glyph label | `move: turn 0°, stretch 5` |
| derivative 3.1.1 at 0.3 − 0.7i (P6 position), glyph label | `move: turn -41.2°, stretch 2.126` |
| derivative custom 2z² − 3z + 1 at 1 + i, readout and glyph | `z₀ = 1 + i; A = 1 + 4i; \|B\| = 0.000; f′(z₀) = 1 + 4i` and `move: turn 76°, stretch 4.123` |
| derivative 3.1.2 at 1 + i | `z₀ = 1 + i; A = 1 - i; \|B\| = 1.414; f′(z₀) does not exist (circle radius 1.414)`, glyph hidden |
| derivative 3.1.2 at 0 | `z₀ = 0; A = 0; \|B\| = 0.000; f′(z₀) = 0`, glyph `no move: 0` |
| derivative P6 | glyph hidden; caption `No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.` |
| cauchy-riemann 3.2.1 | glyph `move: turn 45.8°, stretch 1.649`; readout `A = 1.149 + 1.183i; \|B\| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)` |
| cauchy-riemann conj z | glyph `no move: 0`; readout `A = 0; \|B\| = 1.000; CR holds: no; f′ does not exist here` |
| cauchy-riemann \|z\|² | glyph `move: turn -58°, stretch 0.943` |
| cauchy-riemann custom exp(−z) at 0 | glyph `move: turn 180°, stretch 1`; `f′(z₀) = -1` |
| branches `{ n: 2, seam: π/2 }` | `seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2` |
| reciprocal circle centre i | `shape: circle \|z - i\| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; \|1/p\| = 0.5` |
| reciprocal line Re z = 2 | `shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; \|1/p\| = 0.447` |
| limits `{ dir, line, m: 2 }` | `path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no` |
| limits P5 vertical | `path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5; limit exists: no` |
| freshNote prefix, all nine problems | `Fresh numbers from the Rehearsal Room. ` |

---

## 7. Verification plan

The scope is the five stations (the deliverable's SCOPE paragraph); the acceptance criteria are applied to them only. The commands run from the repo root. Everything below was run in the scratch copy with the Appendix A patch applied; the measured results are in Appendix D.

### 7.1 Commands

| what | command | expected |
|---|---|---|
| pure helpers and source rules (A6, parts of A1, A3) | `node --test tests/unit/i2-decisions-everywhere-c.test.mjs` | 24 tests, all pass |
| the new interaction script (A1, A2, A3, ids and layout) | `node tools/smoke.mjs --route branches --script tests/interact/i2-decisions-everywhere-c.mjs --dark` | `ok branches (desktop)`, `(phone)`, `(desktop-dark)`; `3/3 checks passed` |
| the same through the runner (it reads the route from the script's header) | `node tools/interact-all.mjs i2-decisions-everywhere-c` | exit 0 |
| iteration 1 stays green (A4) | `node tools/interact-all.mjs i1-station-branches-graph4d i1-station-powermap-reciprocal i1-station-limits-derivative i1-station-mappings-cr i1-integration` | exit 0, no edit to those scripts |
| the matching i1 unit files (A4) | `node --test tests/unit/i1-station-branches-graph4d.test.mjs tests/unit/i1-station-powermap-reciprocal.test.mjs tests/unit/i1-station-limits-derivative.test.mjs tests/unit/i1-station-mappings-cr.test.mjs tests/unit/i1-integration.test.mjs` | all pass |
| smoke on every problem route and the five station routes, dark too (A5) | `node tools/smoke.mjs --dark --route problem-1-1-1,problem-1-1-2,problem-1-2-1,problem-1-2-2,problem-1-3-1,problem-1-3-2,problem-1-4-1,problem-1-4-2,problem-1-4-3,problem-1-5-1,problem-1-5-2,problem-2-1-1,problem-2-1-2,problem-2-1-3,problem-2-2-1,problem-2-2-2,problem-2-3-1,problem-2-4-1,problem-2-5-1,problem-3-1-1,problem-3-1-2,problem-3-2-1,problem-P1,problem-P2,problem-P3,problem-P4,problem-P5,problem-P6,problem-P7,branches,reciprocal,limits,derivative,cauchy-riemann` | zero problems |
| the whole unit suite | `node --test tests/unit/*.test.mjs` | no new failure (see 7.6 for the failures that are not this goal's) |

### 7.2 A1: both chips on every card

Script step A1, on `#problem-2-4-1`, `#problem-2-5-1`, `#problem-2-3-1`, `#problem-3-1-2`, `#problem-3-2-1` (the five stations' own problem routes). The expected values are **read from `problemById`**, not from a table, and the table in 1.3 is cross-checked by the unit test K1.

| route | `#<station>-problem-address` `data-value` | `#<station>-problem-names` `data-value`, text |
|---|---|---|
| `problem-2-4-1` (branches) | `P` | `continuous`, `names: continuous` |
| `problem-2-5-1` (reciprocal) | `P` | `any`, `names: any` |
| `problem-2-3-1` (limits) | `P` | `any`, `names: any` |
| `problem-3-1-2` (derivative) | `P` | `any`, `names: any` |
| `problem-3-2-1` (cauchy-riemann) | `C` | `none`, `names: none` |

On each: the chips are inside `#<station>-problem-decisions`; `aria-expanded` is `false` and `#<station>-problem-meaning` hidden to start; a tap on `-names` shows `namesMeaning(names)` with `aria-expanded="true"`; a tap on `-address` switches the line to `addressMeaning(address)`; a second tap on `-address` hides it;
`#<station>-problem-note` has no "Fresh numbers" (no request); no horizontal scroll. Following the active problem:
`limits`: clicking `#limits-fn-x-over-z` -> the card is P5 with its chips (`P`, `any`), clicking `#limits-fn-dir` -> 2.3.1.
`derivative`: `#derivative-fn-sq-plus-z` -> 3.1.1 (`C`, `none`), `#derivative-fn-re` -> P6 (`both`, `any`), `#derivative-fn-abs2` -> 3.1.2 (`P`, `any`); `#derivative-fn-cube` -> `#derivative-problem` hidden and `count('#derivative-problem-address') === 0`.
`cauchy-riemann`: `#cauchy-riemann-fn-const-u` -> P7 (`C`, `none`); `#cauchy-riemann-fn-conj` -> hidden, no chips.
A1 is run at 1280 px and 390 px (the runner runs both), and dark.

### 7.3 A2: the glyph

Script step A2. Every expected value is in section 6.10 and in the unit tests D3, D4 and C2. The glyph is checked as: `aria-label`, tag `svg`, shown (nonzero box) or `hasAttribute('hidden')`, `data-r`, `data-theta`, `focusable="false"`,
sibling of the readout (`glyph.parentElement === readout.parentElement`) and not inside it (`!readout.contains(glyph)`); and the iteration-1 readout string is compared unchanged.

| route and action | glyph | readout (iteration 1's string) |
|---|---|---|
| `problem-3-1-1` | `move: turn 33.7°, stretch 3.606`; `data-r` 3.606, `data-theta` 0.588 | `z₀ = 1 + i; A = 3 + 2i; \|B\| = 0.000; f′(z₀) = 3 + 2i` |
| the same, drag z₀ to 2 | `move: turn 0°, stretch 5` | starts `z₀ = 2; A = 5;` |
| `problem-P6` | hidden | caption `No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.` |
| P6, click `#derivative-fn-sq-plus-z` (z₀ = 0.3 − 0.7i) | `move: turn -41.2°, stretch 2.126` | |
| `problem-3-1-2` | hidden | |
| 3.1.2, click `#derivative-z0-origin` | `no move: 0`, shown | `z₀ = 0; A = 0; \|B\| = 0.000; f′(z₀) = 0`; caption starts `f′(z₀) = 0: the zero move.` |
| 3.1.2 at 0, click `#derivative-fn-recip` | hidden | caption `f is undefined at z₀, so there is no move to show.` |
| `problem-3-2-1` | `move: turn 45.8°, stretch 1.649` | `A = 1.149 + 1.183i; \|B\| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)` |
| click `#cauchy-riemann-fn-conj` | `no move: 0` | `A = 0; \|B\| = 1.000; CR holds: no; f′ does not exist here` |
| click `#cauchy-riemann-fn-abs2` | `move: turn -58°, stretch 0.943` | |
| click `#cauchy-riemann-fn-exp` | `move: turn 45.8°, stretch 1.649` | |

The goal text's A2 also names the addresses, powers and linear glyphs; those stations belong to other goals (D1).

### 7.4 A3: each station opens with the request's numbers and says so

Script step A3 uses `window.__mv.app.request({ station, problem, family: problem, values })` then `window.__mv.app.navigate(station)` and waits for `#view[data-route=<station>][data-state=ready]` (the router calls `valuesOf` at mount).
For each station, the numbers on the page are asserted from the readout the station prints, the note from `#<station>-problem-note`, and "freshness ends" is asserted after the student changes the thing the request set.

| station | request | assertions |
|---|---|---|
| branches | `2.4.1`, `{ n: 2, seam: π/2, walk: null }` | readout `seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2`; `#branches-n` value `2`; `#branches-problem-note` contains `Fresh numbers` and `Now on the page: the square root, with its seam at π/2`; `#branches-fresh` visible and starts `Fresh numbers from the Rehearsal Room.`; the two sentences are separate (`/[^.!?] Now on the page/` does not match); no `.callout` visible inside `#branches-problem`; the header marks 2.4.1; dragging z leaves the note; moving the seam slider hides note and banner |
| branches | `{ n: 3, seam: 0, walk: 'along' }` | `#branches-walk-status` ends `continuous`; hook `walk.kind === 'along'` |
| branches | `{ n: 3, seam: -π, walk: 'across' }` | status `jumps at the negative real axis`; the same under `emulateMedia({ reducedMotion: 'reduce' })` straight away |
| branches | `{ n: 9, seam: 'x', walk: 'sideways' }` | readout starts `seam = -π; window (-π, π]; z = -1 + 0.5i`; banner and note hidden |
| reciprocal | `2.5.1`, circle centre i, r 1 | readout `shape: circle \|z - i\| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; \|1/p\| = 0.5`; note has `Fresh numbers` and `Now on the page: circle \|z - i\| = 1.`; banner visible; chips `P`; the two sentences separate |
| reciprocal | click `#reciprocal-preset-circle1` | note is `This is problem 2.5.1 exactly.`; banner hidden |
| reciprocal | line Re z = 2 | readout `shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; \|1/p\| = 0.447` |
| reciprocal | circle centre 2, r 2 | readout `shape: circle \|z - 2\| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; \|1/p\| = 0.354`; the plane shows x from 0 to 4 (`toPixel` of 4 and of 0 are inside the plane) |
| reciprocal | circle centre (9, 9), r 50 | default readout `shape: circle \|z - 1\| = 1; image: line Re w = 0.5;`; banner hidden |
| limits | `2.3.1`, `{ fn: 'dir', path: 'line', m: 2 }` | readout `path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no`; `#limits-path-line` pressed; `#limits-m` is 2; note has `Now on the page: g = z²/\|z\|², way in: y = 2x.`; click `#limits-path-vertical` hides the note; click `#limits-path-line` shows it again (the slope is still 2); `setSlider('limits-m', 1)` hides it |
| limits | `P5`, `{ fn: 'x-over-z', path: 'vertical' }` | readout starts `path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5;`; chips `P`, `any`; note |
| limits | `2.3.1`, parabola | `limit along this path: 1;` |
| limits | `{ fn: 'dir', path: 'cubic' }` | `#limits-path-parabola` pressed; note says `way in: y = x²` (a path the station cannot draw is dropped, the note says what is on the page) |
| derivative | `3.1.1`, `{ fn: { src: '2z^2 - 3z + 1' }, z0: 1 + i }` | readout `z₀ = 1 + i; A = 1 + 4i; \|B\| = 0.000; f′(z₀) = 1 + 4i`; `#derivative-fn-custom` pressed, hook `fnId === 'custom'`; glyph `move: turn 76°, stretch 4.123`; note contains `Fresh numbers` and `f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.`; chips `C`, `none`, card says `Problem 3.1.1`; `#derivative-custom-note` starts `Custom function from the Rehearsal Room:`; `#derivative-custom-error` hidden; click `#derivative-fn-abs2` -> note hidden and card 3.1.2; click `#derivative-fn-custom` -> note and 3.1.1 return |
| derivative | `3.1.2`, `{ fn: 'abs2', z0: 1 + i }` | `z₀ = 1 + i; A = 1 - i; \|B\| = 1.414; f′(z₀) does not exist (circle radius 1.414)`; no `#derivative-fn-custom`; glyph hidden |
| derivative | `{ fn: { src: '2z +' }, z0: 1 + i }` | `#derivative-custom-error` visible and contains the parser's sentence exactly as `compile('2z +')` throws it (`The formula stops too early. Something is missing after "+".`); hook `fnId === 'sq-plus-z'`; no custom chip |
| derivative | `{ fn: 'sq-plus-z', z0: 4 + 3i }` | `toPixel(4 + 3i)` is inside the z-plane (the view was panned) |
| derivative | `{ z0: 'x', fn: 7 }` (the malformed request of the goal text, for a station of this goal) | default function and z₀ (`z₀ = 1 + i;`), note and error hidden, no `console.error` |
| cauchy-riemann | `3.2.1`, `{ fn: { src: 'exp(-z)' }, z0: 0 }` | readout contains `CR holds: yes` and `f′(z₀) = -1`; glyph `move: turn 180°, stretch 1`; `#cauchy-riemann-fn-custom` pressed; note contains `Fresh numbers` and `f(z) = exp(-z), at z₀ = 0.`; chips `C`, `none`; `#cauchy-riemann-custom-check` starts `CR holds at z₀ and at all 25 points of the grid`; `#cauchy-riemann-fn-note` starts `Custom function from the Rehearsal Room:`; `#cauchy-riemann-verdict` still written; click `#cauchy-riemann-fn-conj` -> card and check hidden; click `#cauchy-riemann-fn-custom` -> card returns |
| cauchy-riemann | `{ fn: { src: 'conj(z)' }, z0: 0.5 + 0.8i }` | `A = 0; \|B\| = 1.000; CR holds: no; f′ does not exist here`; check starts `CR fails at z₀ (u_x = 1 but v_y = -1)` |
| cauchy-riemann | `P7`, `{ fn: { src: '3' }, ... }` | check contains `f is constant`; card says `Problem P7`; names `none` |
| cauchy-riemann | `{ fn: { src: 'z^' } }` | `#cauchy-riemann-custom-error` visible with `Something is missing after "^"`; `#cauchy-riemann-fn-exp` pressed |
| cauchy-riemann | `{ fn: 'cube', z0: 3 }` | `#cauchy-riemann-fn-custom` pressed (z³ opens as custom); z₀ stays 0.5 (3 is outside the z-plane) |

A malformed request is sent to `derivative` and `reciprocal` (D5): `roots` belongs to another goal.

### 7.5 A4, A5, A6

**A4.** The i1 scripts and units above must pass with no edit. Within this goal's five stations the pins are those of section 0.2; the unit tests S6 and S7 re-check the source-level ones (no hex, `rgb(`, only `.style.aspectRatio` in reciprocal, `releaseStationStyle();` last, the `prose(verdictEl, ...)` line, `CR_FN_IDS`). `i1-integration` includes the Rehearsal Room (`js/stations/rehearse.js`, another wave-1 goal); until that file exists the script stops at I1.
In the scratch run (with a stub `rehearse.js`, not part of this design), the steps I4 to I8 of `i1-integration` (all 29 deep links, every in-page link, readout style, ids on every control, no duplicate ids) were run on both viewports with the patch applied: `i1-integration: all steps passed`, desktop and phone. I1 to I3 only walk the menu and the thread links and do not look at the five stations' content.

**A5.** The smoke command of 7.1. The scratch run: 34 routes (the 29 problem routes and the 5 station routes) on desktop, phone and dark desktop: `102/102 checks passed across 34 route(s)`, zero problems.

**A6.** Code inspection checklist (each is also a unit test in Appendix B):

| check | how | test |
|---|---|---|
| every values read goes through `valuesOf`, no `preset.values` | grep each file | S1 |
| the chips are the kit's `chips`, prefix = the card id | grep `decisionChips(` | S2 |
| the glyph is a sibling of the readout; hidden by `toggleAttribute`; `size: '2em'`; only derivative and cauchy-riemann | grep `moveGlyph(`, `readoutRow.append(glyph, readout)` | S3 |
| the video panel is on derivative only, after the planes, removed on unmount | grep `videoPanel(`, the `el.append(...)` order | S4 |
| custom sources compile through `parse.js`; `err.message` verbatim; `role: 'alert'` | grep | S5 |
| no literal colour; no banned call; no `\d degrees`; no `innerHTML` in derivative or limits; reciprocal inline styles only `aspectRatio`; cauchy-riemann forbidden substrings absent; `CR_FN_IDS` and `CR_FUNCTIONS` unchanged | scans | S6 |
| `releaseStationStyle();` last; no iteration-1 id lost (a list per file); the pinned lines present | scans | S7 |
| the diff removes no id or readout string | `git diff` of the five files shows only added lines except: `fnById` import line in cauchy-riemann (new line), `compile` import widened, `renderProblemCard` and `renderProblemCallout` signatures extended, `compiledFn` generalised, `refresh`/`refreshModel`/`refreshFn` bodies extended | review |

### 7.6 Failures that are not this goal's (so nobody chases them)

In the scratch copy, which has no `rehearse.js` and no `videos/`, 8 of the 882 unit tests fail, and the **same 8 fail on the pristine station files** (a second copy with the five files restored from `HEAD`: 8 of 858): the registry and menu tests that count 21 stations and mount `rehearse`
(`I1 the registry`, `U3 threadStops`, `U4 layoutMap wide`, `U5 layoutMap narrow`, `U10 stationNeighbours`) and three media tests (`U1` and `U2` about `palette.py`, `U10 the narration is wired`) that read files wave 0 and other goals own.
One more, `C2-1 rect and polygon: nPerSide is capped`, failed in one full run while other agents were loading the machine and passed in the next full run and alone (70/70); it does not import any of the five stations.
The patch adds 24 tests and no failure. In the real repo the eight pass once the other goals land.

### 7.7 The unit tests (Appendix B), by id

| id | asserts |
|---|---|
| K1 | the nine problems' `address` and `names` are the table of 1.3 |
| B1, B2, B3 | `unitPoint` exact on the axes; `branchesFromValues` for the request of the goal text and every fallback (`{ n: 2, seam: π/2 }` -> `z = -i`; `{}` -> not applied; `seam: 0.01` -> 0); the readout and `branchesLoaded` string |
| R1, R2, R3 | `shapeFromValues` for the five circles and the line with bearing, phi and the exact readout; bad shapes are dropped and `presetFor` gives the default circle; `frameFor`, `shapeKey`, `loadedText` |
| L1 | `limitsFromValues` including the slope rules and the readouts of the requests, `limitsLoaded` |
| D1, D2, D3, D4 | `derivativeFromValues` (custom, chip id, a no-chip catalogue id, an unknown id, the parser's sentence verbatim, junk); a custom reference through `microscope`, `ringFit`, `buildReadout`; the glyph words; `glyphCaption` in its four cases |
| C1, C2, C3, C4 | `crFromValues`; the readouts and glyph words; `crGridCheck` (five entire functions pass, four non-entire fail at −2 − 2i, constants have f′ = 0); `crCustomCheck` in its cases |
| N1 | `freshNote` begins `Fresh numbers from the Rehearsal Room. ` for each of the nine problems and is empty for another problem or a non-values preset |
| S1 to S7 | the source rules of 7.5 |

### 7.8 The interaction script (Appendix C), by step

(1) A1 on the five problem routes, then the chips following the active problem; (2) A2 the glyphs; (3) A3 the five stations' requests, in the order branches, reciprocal, limits, derivative, cauchy-riemann, including reduced motion for the walk, the bad requests, the note joining check (`joined`);
(4) the video host (`#derivative-video-host` is hidden and empty for today's manifest and holds one panel when the manifest lists `zoom-cr`; a panel put into it by `videoPanel(host, 'zoom-cr', { manifest })` sits after the planes); (5) no duplicate id, no control without an id, no horizontal scroll on each of the five stations after all of it.
Screenshots (`ctx.shot`) are taken in steps 2 and 3 and on the phone for the cauchy-riemann glyph row.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases (each is a behaviour of the code in Appendix A, and most have a test)

| case | behaviour |
|---|---|
| the router consumes the request on mount (`store.remove`) | a reload, or Back to the station, opens the station on its own default with no note: "fresh" lasts for the one visit |
| a request for a station that is already open (same hash) | `navigate(station)` remounts it with the new preset (script step A3 sends five branches requests in a row) |
| the request's `problem` is not the card's problem (for example limits with `problem: 'P5'` and `fn: 'dir'`) | `freshNote` is `''`: the numbers apply, there is no note and no banner |
| `values` is `{}` or has no valid field | `applied === false`: defaults, no note, no error line |
| the preset is frozen | every helper copies (`{ re, im }` literals, spread of the shape); nothing mutates `preset` |
| `n` 9, seam `'x'`, `walk: 'sideways'` | each field is judged alone: `n` 9 is out of range (default 3), the seam is not a number (default −π), the walk is not in the enum (null) |
| a seam of −π, π, or one within 0.02 of a nice angle | snapped by `seamFromSlider`; `unitPoint(seam + π)` keeps z exactly on the axis (no 1.8e-16, no −0) |
| a reciprocal circle through 0 whose probe would sit on 0, or a handle off the plane | `pickPhi` and `pickBearing` walk their fixed lists; a circle that leaves the plane gets `zplane.fitTo(frameFor(shape), 0.1)` |
| a reciprocal line with `a` equal to `b` or closer than 0.1, a radius of 0 or 50, a centre at (9, 9) | `shapeSpec` returns `undefined`: the default circle, no note |
| limits `m` with a path other than `line`, or \|m\| above 3 | `m` is dropped (slope 1); the path still applies |
| limits `path: 'spiral'` | valid (the station draws it); the note says `way in: spiral into 0` |
| derivative `fn` is a chip id, a catalogue id with no chip (`sq`, `cbrt`, ...), an unknown id, a `{ src }`, a blank or 401-character `src`, or not a string at all | chip, custom chip with that entry's source, error line, custom chip, silently the default, silently the default |
| a custom source that is not holomorphic (`abs(z)`) or undefined at z₀ (`1/z` at 0) | the planes, readout, verdict and caption say so as for any function; the glyph is hidden; on cauchy-riemann the check says `CR fails ...` or `f has no value near z₀, so there is nothing to test.` |
| a custom source whose `toTex` throws | `f(z) = <src>` as plain text; the page works |
| `z₀` outside the opening view (derivative) or outside the z-plane (cauchy-riemann) | derivative: within 5, then the view is panned (`showZ0`); beyond 5, dropped. cauchy-riemann: beyond 2, dropped |
| a request for P7 with `src` `'3i'` (u = 0, v = 3) | the same words as `'3'`: `f′ = 0`, `f is constant` |
| the student clicks the custom chip after another function | the card and the note come back (the custom chip is in `fnButtons`; `freshOn()` is true again) |
| the video manifest lists `zoom-cr` | one `section#video-zoom-cr` in the host, the host shown; on unmount the panel is removed |
| the video promise resolves after unmount | `destroyed` guard: the panel is removed at once, nothing else touched |
| the video manifest fails to load | `listen.js` warns once and resolves `null`; the host stays hidden |

### 8.2 Performance

Measured in Node on the scratch copy (the browser adds drawing, which the additions do not touch):
`crGridCheck` for e^{2z} (25 `crReport` calls, once per mount when a custom function is selected) 1.19 ms; one `crReport` 0.0075 ms; `customFrom` (compile and `toTex`) 0.14 ms; `microscope` with a custom reference 0.19 ms (iteration 1's cost);
`updateGlyph` is skipped by the kit when the move is unchanged, and the caption is one `textContent` write. `syncFresh`, `syncCard` and `freshOn` are a few comparisons and write the DOM only when the result changes.
Dragging z₀ on derivative therefore costs the iteration-1 work plus about 0.02 ms. The five pages stay inside the 16 ms frame the planes already budget.

### 8.3 Accessibility

- Every new control is a `button` with an id, a visible text label and (chips) `aria-expanded`; every new element has an id (the i1 integration scan asserts "every button, input, select, textarea, summary has an id" and "no duplicate ids", script step 5).
- The chips' meaning line is `role="status"` (the kit), so the sentence is announced on tap. The error lines are `role="alert"` (announced once when present at mount, which is when they appear).
- The glyph is `role="img"` with an `aria-label` of the same words as the caption; it is not a tab stop (`focusable="false"`). The caption is plain text in reading order directly under the readout row, so a screen-reader user hears readout, caption, verdict.
- The fresh-numbers note is plain text in the card, reachable in reading order; the banner on branches and reciprocal is a `p.callout` right under the header, before the controls.
- Colour is never the only signal (3.1); contrast numbers in 3.2.
- Keyboard: Tab order is document order. On derivative the new order is: function chips (custom chip last), sliders and buttons, the card's two decision chips, planes (their handles as before), the links. The chips toggle with Enter or Space and close with Escape, leaving focus on the chip (kit).
- No new `aria-label` or `title` carries `z0`, `z1`, `z2` (i1 integration rule): the glyph's label is `move: ...`, the custom chip's `title` is `f(z) = <src>`.
- Language: sentences are plain and direct; math is typeset (`z₀`, `f′`, `|B|`, `°`, `π`).

### 8.4 Reduced motion

Nothing added animates. The glyph and the caption change instantly. The one motion a request can start is the branches walk; `startWalk` is the station's own and finishes at once when `prefersReducedMotion` is on (script step A3 asserts `jumps at the negative real axis` straight after mount under `emulateMedia({ reducedMotion: 'reduce' })`). The video panel's `<video>` does not autoplay (`preload="metadata"`, controls).

### 8.5 Phone layout (390 px)

One column, no horizontal page scroll (`noOverflow` after every step in both viewports). Chips wrap; the meaning is a full-width line; notes wrap (`overflow-wrap: anywhere`); the readout row keeps the 2 em glyph on its left and lets the readout wrap beside it; the custom chip and the error block wrap with the other function chips.
The banner is a single `p.callout`, three lines at 390 px. The video host is hidden when empty so the flex gap does not add a blank band between the planes and the readout row. Targets: chips are `--tap` (2.75 rem) high from `button.chip`.

---

## 9. Out of scope, requests, and risks

### 9.1 Out of scope

- The other ten stations of the original goal (the orchestrator split gave them to goals a and b): `addresses`, `distance`, `powers`, `roots`, `curves`, `sets`, `mappings`, `linear`, `powermap`, `principal-root`; so also the `#addresses-glyph`, `#powers-glyph`, `#linear-glyph` hosts and the `two-addresses` and `motion-time` video panels. Their A1 to A3 rows are not run here.
- Replacing these five stations' headers, cards and link blocks with the kit's `problemCard`, `header` and `links` (deferred by the goal; the kit offers them to any station a later iteration rebuilds). The chips are added to the cards as they are.
- `staircase.js`, `arithmetic.js`, `graph4d.js`, `lab.js`, `home.js`, `problems.js`, `rehearse.js`, `walk.js` and the kit's own four files (other goals).
- Any edit of an iteration-1 test, of `ARCHITECTURE.md`, of `registry.js`, `app.js`, `problems.js`, `functions.js`, or of `media/manifest.js`. If one of those must move, this design says so below and stops.
- A `listenControl` on any of the five stations (the goal asks for the video panel on derivative only).
- Typing a custom function into the page (the custom chip appears only from a request; `mappings` has the typed box).
- Auto-opening the answer, or hiding the handout answer that `freshNote` carries (D16).

### 9.2 Requests to other owners (nothing in this goal blocks on them)

1. **Kit owner (`station-kit.js`)**: `freshNote` ends with the handout's typeable answer, which for several problems has no full stop (`the line Re w = 1/2`). Each of the five stations repeats a one-line `noteOf` to put a stop before "Now on the page". If `freshNote` returns a complete sentence, `noteOf` can lose its first half; if the kit exported such a joiner the five copies could go. Separately, the note shows the **handout's** answer to a student who arrived from the Rehearsal Room: if that is not wanted, `freshNote` is the one place to change (the station tests assert only the prefix `Fresh numbers from the Rehearsal Room. `).
2. **Integrator (`ARCHITECTURE.md` section 9, "Iteration 2: ids and hooks of the new pieces")**: add these ids (new in this goal; none of the i1 ids moved).
   - `branches-fresh`, `branches-problem-note`, `branches-problem-decisions`, `branches-problem-address`, `branches-problem-names`, `branches-problem-meaning`
   - `reciprocal-fresh`, `reciprocal-problem-decisions`, `reciprocal-problem-address`, `-names`, `-meaning` (and the existing `reciprocal-problem-note`, which now also carries the fresh note)
   - `limits-problem-decisions`, `limits-problem-address`, `-names`, `-meaning`, `limits-problem-note`
   - `derivative-problem-decisions`, `-address`, `-names`, `-meaning`, `derivative-problem-note`, `derivative-fn-custom`, `derivative-custom-note`, `derivative-custom-error`, `derivative-readout-row`, `derivative-glyph`, `derivative-glyph-text`, `derivative-video-host`
   - `cauchy-riemann-problem-decisions`, `-address`, `-names`, `-meaning`, `cauchy-riemann-problem-note`, `cauchy-riemann-fn-custom`, `cauchy-riemann-custom-error`, `cauchy-riemann-custom-check`, `cauchy-riemann-readout-row`, `cauchy-riemann-glyph`
   Also record: the fresh note is shown only while the request's numbers are on the page (the rules in 4.1 here); `renderProblemCard(host, problemId, { note })`; `compiledFn` accepts `{ id: 'custom', f }`; the video panel of derivative sits after `.ld-lower` (the row with the third plane), not after the first plane (D8).
3. **ARCHITECTURE section 4.1 table** (a wording fix for whoever owns it): branches `seam` is accepted within [−π, π] (the slider has −π); limits `m` counts only for `path: 'line'` and within the slider (|m| at most 3); derivative `z0` within 5, cauchy-riemann `z0` within the z-plane (2); reciprocal centre within 3, `r` from 0.1 to 3.
4. **Whoever lands `rehearse.js`**: `i1-integration` (A4) cannot pass before it exists. Nothing in this goal depends on it.

### 9.3 Deviations from the goal text, in one place

D1 (five stations, not fifteen), D2 (reciprocal's note is the existing element), D3 (chips rebuilt with the card), D4 (`renderProblemCard` extended), D5 (the malformed request goes to derivative and reciprocal), D6 (P3's address is `both` in the data), D7, D15, D16 (the note's wording and spoiler), D8 (video after the third plane), D9 (seam range), D10 (a no-chip catalogue id opens as custom), D11 (the kit's `problemCard` is not used), D12 (`toggleAttribute` for the SVG), D13 (the row), D14 (`compiledFn` accepts a reference), D17 (ranges), D18 (builder: no fresh problem card when the request's function could not be read). All in 0.3.

### 9.4 Risks

| risk | what could go wrong | what limits it |
|---|---|---|
| the hidden review's A3 request uses a `problem` that is not the card's problem | no note (`freshNote` is `''` for a mismatch), although the numbers apply | the criterion's own list pairs each station with its problem (2.4.1, 2.5.1, 2.3.1, 3.1.1, 3.2.1); P5, P6, 3.1.2 and P7 are covered by the script too |
| `freshNote` copy changes (the kit owner drops the answer or adds a stop) | `noteOf` still adds a stop only when one is missing; the tests assert only the prefix | `noteOf` is idempotent for a stop-ended lead |
| other wave-1 goals edit `css/components.css`, `js/app.js`, `problems.js` in the meantime | the scratch copy is of the commit at the start of wave 1; shared CSS or router changes could move a pin | the five files import only the kit and the data; the interaction script reads the problem data instead of hard-coding it |
| `i1-integration` cannot run until `rehearse.js` exists | A4 is partly unverifiable in the scratch copy | I4 to I8 (the steps that look at these five stations) were run with a stub and pass on both viewports; the real run is the integrator's |
| a station's `STYLE` string is injected by `injectStyle`/`ensureStationStyle`; two stations share `station-limits-derivative` | a rule added for derivative also applies on limits | the added rules are namespaced (`.ld-*`, `#station-cauchy-riemann ...`) and limits uses only the card ones |
| the scratch directory is shared between agents | generic names (`repo`, `proto`, `helpers.mjs`) in `.../scratchpad/` may have overwritten another agent's files before I moved to a private folder | all of this design's scratch work is under `.../scratchpad/dec-c-3a91/`; the pristine station copies are in `.../dec-c-3a91/orig/`; the five stray files I had put in the shared `orig/` were removed; the repo itself was never written except this file |
| `window.__mv.app.request` and `navigate` are used by the script; the Rehearsal Room uses `ctx.store.set` and `ctx.navigate` | identical effect (the router reads the same key) | script step A3 and the router's own tests |

---

## Appendix A. The patch for the five station files (unified diff)

Apply from the repo root: `git apply docs/designs/iter-2/i2-decisions-everywhere-c.patch` after saving the block below as that file, or paste the block to `git apply -`. It was produced by `git diff` in the scratch copy and checked with `git apply --check` against the working tree at the time of writing (the five files were unmodified; zero rejects).
It is the complete change of the five files: the pure helpers (`branchesFromValues`, `shapeFromValues`, `limitsFromValues`, `derivativeFromValues`, `crFromValues`, `glyphCaption`, `crGridCheck`, `crCustomCheck`, ...), the values branches, the chips, the notes, the glyphs, the custom chips, the video host and the CSS.
No iteration-1 line is removed except where a line is replaced by its extended form (the `parse.js` import lines, the `renderProblemCard` and `renderProblemCallout` signatures, the `el.append(...)` lines, the `refreshFn` call, the `CR_FUNCTIONS[...]` reads, `probPanel.append`, `ui.problem.append`, `renderProblemNote`'s one line, `refreshModel`'s `microscope` and `compiledFn` calls).
The pure helpers, in one place, are the blocks headed "the values preset" in each file; section 4 is their contract and the unit test (Appendix B) their check.

```diff
diff --git a/js/stations/branches.js b/js/stations/branches.js
index b624d6f..4d1d87c 100644
--- a/js/stations/branches.js
+++ b/js/stations/branches.js
@@ -19,6 +19,8 @@ import { createExplainer } from '../core/explainer.js';
 import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
 import { problemById, problemsForStation, routeFor, statementParts } from '../data/problems.js';
 import { threadLabel } from '../registry.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
 
 // ---------------------------------------------------------------- constants
 
@@ -105,6 +107,38 @@ export function classifyWalk(points, values) {
   return { jumps, maxStep, maxAbs, at: jumps ? at : -1, where };
 }
 
+// ---- the values preset (iteration 2): the Rehearsal Room opens this station with fresh numbers (ARCHITECTURE 4.1). Pure.
+// The fresh-numbers line: kit's freshNote (it ends without a full stop when the handout answer does), then what is on the page.
+const noteOf = (lead, loaded) => (/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded;
+export const VALUES_SHAPE = Object.freeze({ n: 'int', seam: 'real', walk: ['along', 'across'] });
+
+// The point of the unit circle at `angle`, exact on the axes (cos(3π/2) is -1.8e-16, not 0) and never -0.
+export function unitPoint(angle) {
+  const c = Math.cos(angle), s = Math.sin(angle);
+  return { re: Math.abs(c) < 1e-12 ? 0 : c, im: Math.abs(s) < 1e-12 ? 0 : s };
+}
+
+// vals: what valuesOf returned for VALUES_SHAPE (an object, maybe empty), or null for any other preset.
+// → null | { applied, n, seam, z, walk }. Anything missing or invalid is the station's default (n = 3, seam = -π, z = DEFAULT_Z).
+// A valid seam also puts the test point z on the ray opposite the seam: the ray this branch is continuous along.
+export function branchesFromValues(vals) {
+  if (!vals) return null;
+  const n = Number.isInteger(vals.n) && vals.n >= 2 && vals.n <= 5 ? vals.n : null;
+  const seam = Number.isFinite(vals.seam) && Math.abs(vals.seam) <= PI + 1e-9 ? seamFromSlider(vals.seam) : null;
+  const applied = n !== null || seam !== null;
+  if (!applied) return { applied: false, n: 3, seam: -PI, z: { re: DEFAULT_Z.re, im: DEFAULT_Z.im }, walk: null };
+  return {
+    applied: true, n: n === null ? 3 : n, seam: seam === null ? -PI : seam,
+    z: seam === null ? { re: DEFAULT_Z.re, im: DEFAULT_Z.im } : unitPoint(seam + PI),
+    walk: vals.walk || null,
+  };
+}
+
+// "Now on the page: the square root, with its seam at π/2 and z on the ray opposite the seam."
+export function branchesLoaded(n, seam) {
+  return 'Now on the page: the ' + rootName(n) + ' root, with its seam at ' + fmtAngle(seam, { unicode: true }) + ' and z on the ray opposite the seam.';
+}
+
 // Everything the readout, explainer, staircase, arcs and 3D need about z on this branch.
 export function branchAt(z, n, seam) {
   const zz = { re: z.re, im: z.im };
@@ -337,6 +371,7 @@ const STYLE = `
 #station-branches .br-cap { margin: var(--space-2) 0 0; font-size: 0.92rem; color: var(--text-muted); }
 #station-branches .br-chips { margin-bottom: var(--space-2); }
 #station-branches .br-note { margin: var(--space-2) 0 0; }
+#station-branches .br-decisions { margin: var(--space-2) 0; }
 #station-branches .br-walk-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); }
 #station-branches .br-walk-row .btn { min-height: var(--tap); }
 #station-branches #branches-walk-status { margin: 0; font-weight: 700; }
@@ -484,10 +519,22 @@ export function mount(el, ctx) {
   // ---- the opening state
   let init = { seam: -PI, n: 3, z: { re: DEFAULT_Z.re, im: DEFAULT_Z.im } };
   let problemActive = false;
+  let fresh = null;                // { n, seam, note, banner } while the numbers on the page are the Rehearsal Room's
+  let walkOnMount = null;          // 'along' | 'across' | null: the walk a request asked for
   const preset = ctx.preset;
+  const fv = branchesFromValues(valuesOf(preset, VALUES_SHAPE));
   if (preset && preset.kind === 'problem' && preset.id === '2.4.1') {
     init = { seam: 0, n: 3, z: { re: PROBLEM_Z.re, im: PROBLEM_Z.im } };
     problemActive = true;
+  } else if (fv && fv.applied) {
+    init = { seam: fv.seam, n: fv.n, z: { re: fv.z.re, im: fv.z.im } };
+    walkOnMount = fv.walk;
+    const lead = freshNote(problemById('2.4.1'), preset);
+    if (lead) {
+      const loaded = branchesLoaded(fv.n, fv.seam);
+      problemActive = true;
+      fresh = { n: fv.n, seam: fv.seam, note: noteOf(lead, loaded), banner: 'Fresh numbers from the Rehearsal Room. ' + loaded + ' The handout problem is at the bottom of the page.' };
+    }
   } else if (preset && preset.kind === 'token' && Object.prototype.hasOwnProperty.call(SEAM_CHIPS, preset.token)) {
     init.seam = SEAM_CHIPS[preset.token];
   }
@@ -501,6 +548,8 @@ export function mount(el, ctx) {
   // ---- DOM
   const header = buildHeader(ctx, ledeText(init.n), problemActive ? '2.4.1' : null);
   const ledeEl = header.querySelector('.station-lede');
+  const freshEl = mk('p', 'callout', { id: 'branches-fresh', 'data-tone': 'accent' });
+  freshEl.hidden = true;
 
   const controls = mk('section', 'panel', { id: 'branches-controls' });
   controls.appendChild(mk('h2', 'panel-title', { id: 'branches-controls-title' }, 'Where do you put the seam?'));
@@ -568,7 +617,7 @@ export function mount(el, ctx) {
 
   // the problem panel
   const prob = problemById('2.4.1');
-  let probPanel = null, loadBtn = null, answerBtn = null, answerBox = null, routes = null;
+  let probPanel = null, loadBtn = null, answerBtn = null, answerBox = null, routes = null, probNote = null;
   if (prob) {
     probPanel = mk('section', 'panel', { id: 'branches-problem' });
     probPanel.appendChild(mk('h2', 'panel-title', null, 'Problem 2.4.1'));
@@ -578,6 +627,10 @@ export function mount(el, ctx) {
       if (part.math) tex(span, part.text); else span.textContent = part.text;
       st.appendChild(span);
     }
+    probNote = mk('p', 'muted', { id: 'branches-problem-note' });
+    probNote.hidden = true;
+    const decisionsEl = mk('div', 'br-decisions', { id: 'branches-problem-decisions' });
+    decisionsEl.appendChild(decisionChips(prob, { idPrefix: 'branches-problem' }));
     const hint = mk('p', 'muted', null, 'Before you press anything: where would you put the seam so that the negative real axis is not on it? Then press the buttons to check.');
     // the two routes state the whole answer (the window and f(-1)), so they wait behind "Show the answer" with it
     routes = mk('div', 'br-routes');
@@ -600,7 +653,7 @@ export function mount(el, ctx) {
     row.append(loadBtn, answerBtn);
     answerBox = mk('div', 'br-answer', { id: 'branches-answer' });
     answerBox.hidden = true;
-    probPanel.append(st, hint, row, answerBox);
+    probPanel.append(st, probNote, decisionsEl, hint, row, answerBox);
   }
 
   const links = buildLinks(ctx, [
@@ -611,7 +664,7 @@ export function mount(el, ctx) {
     { id: 'staircase', thread: 'T2', text: 'The Staircase: what is arg versus Arg?', title: 'The hub of Thread 2' },
   ]);
 
-  el.append(header, controls, planes, walks, readout, working, surfPanel);
+  el.append(header, freshEl, controls, planes, walks, readout, working, surfPanel);
   if (probPanel) el.appendChild(probPanel);
   el.appendChild(links);
 
@@ -985,6 +1038,14 @@ export function mount(el, ctx) {
 
   function degText(a) { return Math.round(a * 180 / PI) + '°'; }
 
+  // The note and the banner say the numbers are fresh only while n and the seam are still the request's (dragging z does not count).
+  function syncFresh() {
+    const on = !!fresh && state.n === fresh.n && Math.abs(state.seam - fresh.seam) < 1e-9;
+    const note = on ? fresh.note : '', banner = on ? fresh.banner : '';
+    if (probNote && probNote.textContent !== note) { probNote.textContent = note; probNote.hidden = !note; }
+    if (freshEl.textContent !== banner) { freshEl.textContent = banner; freshEl.hidden = !banner; }
+  }
+
   function refresh() {
     if (disposed) return;
     const m = branchAt(focusZ(), state.n, state.seam);
@@ -999,6 +1060,7 @@ export function mount(el, ctx) {
     stairs.setPicked(state.pick);
     pickEl.textContent = pickText(m);
     update3D(m);
+    syncFresh();
     zPlane.requestDraw();
     wPlane.requestDraw();
   }
@@ -1089,6 +1151,7 @@ export function mount(el, ctx) {
   };
   mv.branches = hook;
   refresh();
+  if (walkOnMount) startWalk(walkOnMount);
 
   return function unmount() {
     if (disposed) return;
diff --git a/js/stations/cauchy-riemann.js b/js/stations/cauchy-riemann.js
index df10e69..943ff24 100644
--- a/js/stations/cauchy-riemann.js
+++ b/js/stations/cauchy-riemann.js
@@ -10,7 +10,7 @@
 // Design: docs/designs/iter-1/i1-station-mappings-cr.md.
 
 import { jacobian, localLinear, toPolar, abs, mul, conj, fromPolar, fmtNum, fmtSci, fmtCart, texAngle } from '../core/complex.js';
-import { compile, ParseError } from '../core/parse.js';
+import { compile, ParseError, toTex } from '../core/parse.js';
 import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
 import { createPlane, drawCartAddress, drawArc, drawSegment, drawLabel, drawDot, drawPolygonFill, drawTimedCurve,
          segmentHitsBox, DASH, niceGridStep } from '../core/plane.js';
@@ -19,6 +19,10 @@ import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
 import { rect } from '../core/shapes.js';
 import { pushForward } from '../core/mapping.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { fnById } from '../data/functions.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
+import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
 
 // ---------------------------------------------------------------- constants
 
@@ -176,6 +180,89 @@ export function constStatus(report, c, vAtZ0, everywhere) {
   return `With u = ${cs} we get u_x = u_y = 0, so CR would force v_x = v_y = 0, f′ = 0 and f constant. This v has v_x = ${f3(report.jac.vx)} and v_y = ${f3(report.jac.vy)} here, so CR fails: no entire function has this u and this v.`;
 }
 
+// ---------------------------------------------------------------- the values preset (iteration 2; ARCHITECTURE 4.1). Pure.
+
+// The fresh-numbers line: kit's freshNote (it ends without a full stop when the handout answer does), then what is on the page.
+const noteOf = (lead, loaded) => (/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded;
+
+// valuesOf validator for `fn`: an id string, or { src } with a source of at most 400 characters; anything else is dropped.
+function fnSpec(v) {
+  if (typeof v === 'string' && v.length > 0 && v.length <= 40) return { id: v };
+  if (v && typeof v === 'object' && typeof v.src === 'string' && v.src.trim() !== '' && v.src.length <= 400) return { src: v.src };
+  return undefined;
+}
+export const VALUES_SHAPE = Object.freeze({ fn: fnSpec, z0: 'complex' });
+
+/** A source through parse.js: { ok: true, custom: { id: 'custom', src, f, tex } } or { ok: false, message } (the parser's own sentence). */
+export function customFrom(src) {
+  try {
+    const compiled = compile(src);
+    let t = null;
+    try { t = toTex(src); } catch (err) { t = null; }
+    return { ok: true, custom: { id: 'custom', src, f: compiled.f, tex: t } };
+  } catch (err) {
+    return { ok: false, message: err instanceof ParseError ? err.message : 'The function could not be read.' };
+  }
+}
+
+/**
+ * vals: what valuesOf returned for VALUES_SHAPE (maybe empty) or null for any other preset.
+ * → null | { applied, fnId, custom, z0, error }: fnId is a chip id (not 'const-u') or 'custom'; an id with no chip here opens as a custom
+ * function with that catalogue entry's source; an unknown id or an unreadable source leaves the default (exp) and sets `error`; z0 is
+ * null unless both its parts are within the z-plane (Z_HALF).
+ */
+export function crFromValues(vals) {
+  if (!vals) return null;
+  const out = { applied: false, fnId: 'exp', custom: null, z0: null, error: null };
+  const spec = vals.fn;
+  if (spec && spec.id !== undefined) {
+    const known = fnById(spec.id);
+    if (CR_FN_IDS.includes(spec.id) && spec.id !== 'const-u') { out.fnId = spec.id; out.applied = true; }
+    else if (known) {
+      const r = customFrom(known.src);
+      if (r.ok) { out.fnId = 'custom'; out.custom = r.custom; out.applied = true; }
+    } else out.error = 'This page cannot open the function "' + spec.id + '".';
+  } else if (spec && spec.src !== undefined) {
+    const r = customFrom(spec.src);
+    if (r.ok) { out.fnId = 'custom'; out.custom = r.custom; out.applied = true; } else out.error = r.message;
+  }
+  const z0 = vals.z0;
+  if (z0 && Math.abs(z0.re) <= Z_HALF && Math.abs(z0.im) <= Z_HALF) { out.z0 = { re: z0.re, im: z0.im }; out.applied = true; }
+  return out;
+}
+
+/** "Now on the page: f(z) = e^x(cos y + i sin y), at z₀ = 0.5 + 0.8i." (a custom function is written as it was sent) */
+export function crLoaded(fnId, custom, z0) {
+  return 'Now on the page: f(z) = ' + (custom ? custom.src : CR_FUNCTIONS[fnId].chipLabel) + ', at z₀ = ' + fmtCart(z0) + '.';
+}
+
+/** CR at the 25 integer points x, y in -half..half: { ok, failAt (the first failure, x then y ascending), zero (f′ is 0 at every point), count }. */
+export function crGridCheck(f, half = 2) {
+  const out = { ok: true, failAt: null, zero: true, count: 0 };
+  for (let x = -half; x <= half; x++) {
+    for (let y = -half; y <= half; y++) {
+      const r = crReport(f, { re: x, im: y });
+      out.count++;
+      if (!r.holds) { if (out.ok) out.failAt = { re: x, im: y }; out.ok = false; }
+      if (!(r.fprime && Math.hypot(r.fprime.re, r.fprime.im) < 1e-6)) out.zero = false;
+    }
+  }
+  return out;
+}
+
+/** The sentence under the verdict for a custom function: the test at z₀ and the grid check (evidence, not a proof). */
+export function crCustomCheck(report, grid) {
+  if (!report.finite) return 'f has no value near z₀, so there is nothing to test.';
+  if (!report.holds) {
+    const { ux, uy, vx, vy } = report.jac;
+    const which = !report.holds1 ? `u_x = ${numText(ux)} but v_y = ${numText(vy)}` : `u_y = ${numText(uy)} but -v_x = ${numText(-vx)}`;
+    return `CR fails at z₀ (${which}), so f has no derivative here and cannot be entire.`;
+  }
+  if (!grid.ok) return `CR holds at z₀ but fails at ${fmtCart(grid.failAt)}, so f is not differentiable everywhere and is not entire.`;
+  const base = `CR holds at z₀ and at all ${grid.count} points of the grid x, y = -2 to 2, so f looks entire. That is a check at sample points. The proof is the partials: compare u_x with v_y and u_y with -v_x.`;
+  return grid.zero ? base + ' f′ is 0 at every point checked, so f is constant (Theorem 3.2.13).' : base + ` f′(z₀) = ${fmtCart(report.fprime)}.`;
+}
+
 // ---------------------------------------------------------------- u = c
 
 const SAMPLES = [{ re: 0.3, im: 0.7 }, { re: -1.1, im: 0.4 }, { re: 1.7, im: -0.9 }, { re: 0.5, im: 0.8 }];
@@ -397,6 +484,13 @@ const STYLE = `
 #station-cauchy-riemann ol.cr-proof li::before { content: ''; position: absolute; left: 0.1rem; top: 0.35rem; width: 0.85rem; height: 0.85rem; box-sizing: border-box; border-radius: 50%; border: 2px dashed var(--text-muted); }
 #station-cauchy-riemann ol.cr-proof li[data-ok="yes"]::before { border: 2px solid var(--ok); background: var(--ok); }
 #station-cauchy-riemann #cauchy-riemann-paths { align-self: flex-start; }
+#station-cauchy-riemann .cr-decisions { margin: var(--space-2) 0; }
+#station-cauchy-riemann .cr-problem-note { margin: var(--space-1) 0; font-size: 0.92rem; overflow-wrap: anywhere; }
+#station-cauchy-riemann .cr-readout-row { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
+#station-cauchy-riemann .cr-readout-row > .readout { flex: 1 1 auto; min-width: 0; }
+#station-cauchy-riemann .cr-readout-row > .move-glyph { flex: none; }
+#station-cauchy-riemann .cr-custom-check { margin: var(--space-2) 0 0; }
+#station-cauchy-riemann .cr-error { margin: var(--space-2) 0 0; padding: var(--space-1) var(--space-2); border-left: 4px solid var(--danger); background: var(--surface-2); font-size: 0.92rem; overflow-wrap: anywhere; }
 `;
 
 function injectStyle(forName, css) {
@@ -428,7 +522,7 @@ function buildHeader(ctx, ledeText) {
   return header;
 }
 
-function renderProblemCallout(box, problemId) {
+function renderProblemCallout(box, problemId, note = '') {
   box.textContent = '';
   const p = problemId && problemById(problemId);
   if (!p) { box.hidden = true; return; }
@@ -446,7 +540,11 @@ function renderProblemCallout(box, problemId) {
   const whySpan = mk('span');
   prose(whySpan, p.addressWhy);
   why.append(badge, ' ', whySpan);
-  box.append(head, why);
+  const noteEl = mk('p', 'muted cr-problem-note', { id: box.id + '-note' }, note);
+  noteEl.hidden = !note;
+  const decisions = mk('div', 'cr-decisions', { id: box.id + '-decisions' });
+  decisions.appendChild(decisionChips(p, { idPrefix: box.id }));
+  box.append(head, noteEl, decisions, why);
   box.hidden = false;
 }
 
@@ -507,11 +605,24 @@ export function mount(el, ctx) {
   const state = {
     fnId: 'exp', z0: { re: 0.5, im: 0.8 }, side: 0.3, c: 2, vSrc: 'x + y',
     showTrue: false, paths: false, f: null, constU: null,
+    custom: null, fresh: null, grid: null, customError: null,     // the Rehearsal Room's function (iteration 2)
   };
   const preset = ctx && ctx.preset;
   if (preset && preset.kind === 'problem') {
     if (preset.id === '3.2.1') state.fnId = 'exp';
     else if (preset.id === 'P7') state.fnId = 'const-u';
+  } else if (preset && preset.kind === 'values') {
+    const fv = crFromValues(valuesOf(preset, VALUES_SHAPE));
+    if (fv) {
+      state.customError = fv.error;
+      if (fv.applied) {
+        state.fnId = fv.fnId;
+        state.custom = fv.custom;
+        if (fv.z0) state.z0 = fv.z0;
+        const lead = preset.problem === '3.2.1' || preset.problem === 'P7' ? freshNote(problemById(preset.problem), preset) : '';
+        if (lead) state.fresh = { fnId: fv.fnId, problem: preset.problem, note: noteOf(lead, crLoaded(fv.fnId, fv.custom, state.z0)) };
+      }
+    }
   } else if (preset && preset.kind === 'token' && CR_FN_IDS.includes(preset.token)) {
     state.fnId = preset.token;
   }
@@ -521,10 +632,15 @@ export function mount(el, ctx) {
 
   const fCache = new Map();
   const getF = (id) => {
+    if (id === 'custom') return state.custom.f;
     if (!fCache.has(id)) fCache.set(id, compile(CR_FUNCTIONS[id].src).f);
     return fCache.get(id);
   };
   state.constU = constUFunction(state.c, state.vSrc);
+  // the function entry of a chip id, or the one of the custom function (a per-mount entry: CR_FUNCTIONS and CR_FN_IDS stay as they are)
+  const customEntry = state.custom ? { id: 'custom', chipLabel: 'custom', src: state.custom.src, problem: state.fresh ? state.fresh.problem : null, everywhere: 'depends', partials: { ux: null, uy: null, vx: null, vy: null } } : null;
+  const entryOf = (id) => (id === 'custom' ? customEntry : CR_FUNCTIONS[id]);
+  const freshOn = () => !!state.fresh && state.fnId === state.fresh.fnId;
   for (const id of CR_FN_IDS) if (id !== 'const-u') getF(id);   // a catalogue entry that does not compile throws here
 
   const styleEl = injectStyle('station-cauchy-riemann', STYLE);
@@ -545,6 +661,15 @@ export function mount(el, ctx) {
     fnButtons.set(id, b);
     fnChips.appendChild(b);
   }
+  if (state.custom) {
+    const b = mk('button', 'chip', { type: 'button', id: 'cauchy-riemann-fn-custom', 'aria-pressed': String(state.fnId === 'custom'), title: 'f(z) = ' + state.custom.src });
+    b.appendChild(mk('span', '', null, 'custom'));
+    fnButtons.set('custom', b);
+    fnChips.appendChild(b);
+  }
+  const customErr = mk('div', 'cr-error', { id: 'cauchy-riemann-custom-error', role: 'alert' });
+  customErr.hidden = !state.customError;
+  if (state.customError) customErr.append('The function from the Rehearsal Room could not be read, so this page opened on its own function. ', mk('span', 'cr-error-message', null, state.customError));
   const fnNote = mk('p', 'muted', { id: 'cauchy-riemann-fn-note' });
   fnNote.style.margin = 'var(--space-2) 0 0';
 
@@ -568,7 +693,7 @@ export function mount(el, ctx) {
   const constStatusEl = mk('p', '', { id: 'cauchy-riemann-const-status' });
   constStatusEl.style.margin = 'var(--space-2) 0 0';
   constPanel.append(constRow, vChips, vError, constStatusEl);
-  fnPanel.append(fnChips, fnNote, constPanel);
+  fnPanel.append(fnChips, fnNote, customErr, constPanel);
 
   // Each card is a div.panel holding a figure (the plane and its caption: figcaption must be the first or last child of its
   // figure) and then the controls and hints, which are not part of the figure.
@@ -633,10 +758,15 @@ export function mount(el, ctx) {
   const cr2El = mk('p', 'cr-line', { id: 'cauchy-riemann-cr2' });
   const verdictEl = mk('p', '', { id: 'cauchy-riemann-verdict' });
   verdictEl.style.marginBottom = '0';
-  testsPanel.append(cr1El, cr2El, verdictEl);
+  const customCheck = mk('p', 'cr-custom-check', { id: 'cauchy-riemann-custom-check' });
+  customCheck.hidden = true;
+  testsPanel.append(cr1El, cr2El, verdictEl, customCheck);
   two.append(jacPanel, testsPanel);
 
   const readout = mk('div', 'readout', { id: 'cauchy-riemann-readout' });
+  const glyph = moveGlyph({ re: 0, im: 0 }, { size: '2em', id: 'cauchy-riemann-glyph' });
+  const readoutRow = mk('div', 'cr-readout-row', { id: 'cauchy-riemann-readout-row' });
+  readoutRow.append(glyph, readout);                              // the glyph is the readout's sibling, never inside it
   const moveEl = mk('p', '', { id: 'cauchy-riemann-move' });
   moveEl.style.margin = '0';
 
@@ -666,7 +796,7 @@ export function mount(el, ctx) {
   proofPanel.appendChild(proofList);
 
   const links = buildStationLinks(ctx);
-  el.append(header, problemBox, fnPanel, main, two, readout, moveEl, abPanel, pathsBtn, pathsPanel, polarNote, proofPanel, links);
+  el.append(header, problemBox, fnPanel, main, two, readoutRow, moveEl, abPanel, pathsBtn, pathsPanel, polarNote, proofPanel, links);
 
   // ---- planes
   const zplane = createPlane(zHost, { id: 'cauchy-riemann-zplane', xRange: [-Z_HALF, Z_HALF], yRange: [-Z_HALF, Z_HALF], grid: 'cart',
@@ -773,7 +903,7 @@ export function mount(el, ctx) {
   }
 
   function writeJacobian(r) {
-    const partials = CR_FUNCTIONS[state.fnId].partials;
+    const partials = entryOf(state.fnId).partials;
     for (const key of ['ux', 'uy', 'vx', 'vy']) {
       const c = cells[key], txt = numText(r.jac[key]);
       c.td.dataset.value = txt;
@@ -800,6 +930,20 @@ export function mount(el, ctx) {
     });
   }
 
+  // The glyph is the move of A (spin and stretch); A = 0 reads "no move: 0". An SVG has no `hidden` property: toggle the attribute.
+  function syncGlyph(r) {
+    glyph.toggleAttribute('hidden', !r.finite);
+    if (r.finite) updateGlyph(glyph, r.A);
+  }
+
+  function writeFnNote(id) {
+    if (id !== 'custom') { prose(fnNote, FN_NOTES[id]); return; }
+    fnNote.textContent = '';
+    const fSpan = mk('span');
+    if (state.custom.tex) tex(fSpan, 'f(z) = ' + state.custom.tex); else fSpan.textContent = 'f(z) = ' + state.custom.src;
+    fnNote.append('Custom function from the Rehearsal Room: ', fSpan, '. u and v are read off numerically, so the Jacobian cells say numeric where a textbook formula would go.');
+  }
+
   function writeText(r, fz0) {
     readout.textContent = crReadout(r);
     const L = crLines(r);
@@ -807,6 +951,8 @@ export function mount(el, ctx) {
     setLine(cr2El, L.cr2, r.holds2);
     prose(verdictEl, crVerdict(state.fnId, r, state.z0));                // e^x, |z|^2: real superscripts, as the chip note beside it has
     moveEl.textContent = moveText(r);
+    syncGlyph(r);
+    if (state.fnId === 'custom') customCheck.textContent = crCustomCheck(r, state.grid);
     const view = wplane.getView();
     wcap.textContent = 'w-plane, zoomed on f(z₀) = ' + (Number.isFinite(fz0.re) && Number.isFinite(fz0.im) ? fmtCart(fz0) : 'undefined')
       + (onScale(view, wplane.getSize(), fz0)
@@ -866,10 +1012,12 @@ export function mount(el, ctx) {
       prose(body, p.routes.polar);
       polarNote.append(title, body);
     }
-    const problem = CR_FUNCTIONS[id].problem;
-    renderProblemCallout(problemBox, problem === '3.2.1' || problem === 'P7' ? problem : null);
+    const problem = freshOn() ? state.fresh.problem : entryOf(id).problem;
+    renderProblemCallout(problemBox, problem === '3.2.1' || problem === 'P7' ? problem : null, freshOn() ? state.fresh.note : '');
     for (const [fid, b] of fnButtons) b.setAttribute('aria-pressed', String(fid === id));
-    prose(fnNote, FN_NOTES[id]);
+    writeFnNote(id);
+    customCheck.hidden = id !== 'custom';
+    if (id === 'custom' && !state.grid) state.grid = crGridCheck(state.f);
     for (const k of Object.keys(cells)) cells[k].shown = null;
     recompute('fn');
   }
diff --git a/js/stations/derivative.js b/js/stations/derivative.js
index f1560e9..ba3097c 100644
--- a/js/stations/derivative.js
+++ b/js/stations/derivative.js
@@ -18,10 +18,14 @@ import { createExplainer } from '../core/explainer.js';
 import { tex, prose, plainProse } from '../core/katex.js';
 import { Arg, wrapArg, expi, add, sub, mul, div, conj, directionalQuotients, localLinear, fmtCart, fmtNum, fmtAngle, exactAngle,
          texAngle, toPolar } from '../core/complex.js';
-import { compile } from '../core/parse.js';
+import { compile, ParseError, toTex } from '../core/parse.js';
 import { fnById } from '../data/functions.js';
 import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
+import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
+import { videoPanel } from '../core/listen.js';
 
 // ---------------------------------------------------------------- constants
 
@@ -33,6 +37,7 @@ export const Z0_SNAP = 0.05;
 export const DEFAULT_Z0 = Object.freeze({ re: 1, im: 1 });
 export const N_QUOTIENTS = 72;                                   // directions in the quotient plane
 export const N_SPOKES = 12;                                      // arrows in the ring
+export const VIDEO_ID = 'zoom-cr';                               // the registry's video of this station (a panel only when the manifest lists it)
 export const N_RING = 96;                                        // samples of the ring curve (a multiple of N_SPOKES)
 
 const PI = Math.PI;
@@ -51,8 +56,15 @@ export function snapZ0(z) {
 }
 
 const fnCache = new Map();
-/** compile(fnById(fnId).src).f, cached per id; throws RangeError for an unknown id. */
+/**
+ * compile(fnById(fnId).src).f, cached per id; throws RangeError for an unknown id. A custom function reference { id: 'custom', f } (what a request's
+ * own source becomes) is its own f: microscope(), ringFit() and the rest take an id or such a reference alike.
+ */
 export function compiledFn(fnId) {
+  if (fnId && typeof fnId === 'object') {
+    if (typeof fnId.f === 'function') return fnId.f;
+    throw new RangeError('compiledFn: a custom function reference needs an f');
+  }
   if (fnCache.has(fnId)) return fnCache.get(fnId);
   const fn = fnById(fnId);
   if (!fn) throw new RangeError('compiledFn: unknown function id "' + fnId + '"');
@@ -231,6 +243,73 @@ export function verdictText(model) {
   return { text, kind };
 }
 
+// ---------------------------------------------------------------- the values preset (iteration 2; ARCHITECTURE 4.1). Pure.
+
+// The fresh-numbers line: kit's freshNote (it ends without a full stop when the handout answer does), then what is on the page.
+const noteOf = (lead, loaded) => (/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded;
+
+// valuesOf validator for `fn`: an id string, or { src } with a source of at most 400 characters; anything else is dropped.
+function fnSpec(v) {
+  if (typeof v === 'string' && v.length > 0 && v.length <= 40) return { id: v };
+  if (v && typeof v === 'object' && typeof v.src === 'string' && v.src.trim() !== '' && v.src.length <= 400) return { src: v.src };
+  return undefined;
+}
+export const VALUES_SHAPE = Object.freeze({ fn: fnSpec, z0: 'complex' });
+export const Z0_REQUEST_MAX = 5;                                 // a requested z0 has both parts within this
+
+/** A source through parse.js: { ok: true, custom: { id: 'custom', src, f, tex } } or { ok: false, message } (the parser's own sentence). */
+export function customFrom(src) {
+  try {
+    const compiled = compile(src);
+    let t = null;
+    try { t = toTex(src); } catch (err) { t = null; }
+    return { ok: true, custom: { id: 'custom', src, f: compiled.f, tex: t } };
+  } catch (err) {
+    return { ok: false, message: err instanceof ParseError ? err.message : 'The function could not be read.' };
+  }
+}
+
+/**
+ * vals: what valuesOf returned for VALUES_SHAPE (maybe empty) or null for any other preset.
+ * → null | { applied, fnId, custom, z0, error }: fnId is a chip id or 'custom' (then `custom` is the reference); an id the page has no chip
+ * for opens as a custom function with that catalogue entry's source; an unknown id or an unreadable source leaves the default function and
+ * sets `error`; z0 is null unless both its parts are within Z0_REQUEST_MAX. `applied` is true when anything valid came through.
+ */
+export function derivativeFromValues(vals) {
+  if (!vals) return null;
+  const out = { applied: false, fnId: 'sq-plus-z', custom: null, z0: null, error: null };
+  const spec = vals.fn;
+  if (spec && spec.id !== undefined) {
+    const known = fnById(spec.id);
+    if (FUNCTION_IDS.includes(spec.id)) { out.fnId = spec.id; out.applied = true; }
+    else if (known) {
+      const r = customFrom(known.src);
+      if (r.ok) { out.fnId = 'custom'; out.custom = r.custom; out.applied = true; }
+    } else out.error = 'This page cannot open the function "' + spec.id + '".';
+  } else if (spec && spec.src !== undefined) {
+    const r = customFrom(spec.src);
+    if (r.ok) { out.fnId = 'custom'; out.custom = r.custom; out.applied = true; } else out.error = r.message;
+  }
+  const z0 = vals.z0;
+  if (z0 && Math.abs(z0.re) <= Z0_REQUEST_MAX && Math.abs(z0.im) <= Z0_REQUEST_MAX) { out.z0 = { re: z0.re, im: z0.im }; out.applied = true; }
+  return out;
+}
+
+/** "Now on the page: f(z) = z² + z, at z₀ = 1 + i." (a custom function is written as it was sent) */
+export function derivativeLoaded(fnId, custom, z0) {
+  return 'Now on the page: f(z) = ' + (custom ? custom.src : fnById(fnId).label) + ', at z₀ = ' + fmtCart(z0) + '.';
+}
+
+/** The sentence under the readout row: f′(z₀) as a move (its polar address), or why there is no move. */
+export function glyphCaption(model) {
+  if (!model || !model.defined) return 'f is undefined at z₀, so there is no move to show.';
+  if (!model.exists) return 'No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.';
+  const r = hyp(model.fprime);
+  if (r < 1e-9) return 'f′(z₀) = 0: the zero move. Every direction is squashed onto the point f(z₀).';
+  const th = Arg(model.fprime), dec = fmtNum(th), exact = fmtAngle(th, { unicode: true });
+  return 'As a move: turn Arg f′(z₀) = ' + dec + ' rad' + (exactAngle(th) && exact !== dec ? ' = ' + exact : '') + ' (' + fmtNum((th * 180) / PI, 1) + '°), stretch |f′(z₀)| = ' + fmtNum(r) + '.';
+}
+
 // ---------------------------------------------------------------- TeX helpers
 
 /** '\begin{array}{l}' + lines + '\end{array}': a short stack of TeX lines. */
@@ -516,6 +595,13 @@ const STYLE = `
 .ld-chips-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
 .ld-chips-row .chip { min-width: 0; }
 .ld-output-line { margin: 0; }
+.ld-decisions { margin: var(--space-2) 0; }
+.ld-problem-note { margin: var(--space-1) 0; font-size: 0.92rem; overflow-wrap: anywhere; }
+.ld-readout-row { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
+.ld-readout-row > .readout { flex: 1 1 auto; min-width: 0; }
+.ld-readout-row > .move-glyph { flex: none; }
+.ld-glyph-text { margin: var(--space-1) 0 0; color: var(--text-muted); font-size: 0.92rem; }
+.ld-error { margin: var(--space-1) 0 0; padding: var(--space-1) var(--space-2); border-left: 4px solid var(--danger); background: var(--surface-2); font-size: 0.92rem; overflow-wrap: anywhere; }
 `;
 
 let styleUsers = 0;                                              // stations (limits and derivative) that are mounted and use the stylesheet
@@ -620,8 +706,8 @@ export function buildStationLinks(ctx) {
   return nav;
 }
 
-/** Fills (or hides) the problem card <aside>; problemId may be null. */
-export function renderProblemCard(host, problemId) {
+/** Fills (or hides) the problem card <aside>; problemId may be null. The note (the fresh-numbers line, '' for none) and the two decision chips follow the statement; the chip ids start with the host's id. */
+export function renderProblemCard(host, problemId, { note = '' } = {}) {
   host.replaceChildren();
   const p = problemId ? problemById(problemId) : null;
   if (!p) { host.hidden = true; return; }
@@ -639,7 +725,11 @@ export function renderProblemCard(host, problemId) {
   const whySpan = mk('span');
   prose(whySpan, p.addressWhy);
   why.append(badge, ' ', whySpan);
-  host.append(stmt, why);
+  const noteEl = mk('p', 'muted ld-problem-note', { id: host.id + '-note' }, note);
+  noteEl.hidden = !note;
+  const decisions = mk('div', 'ld-decisions', { id: host.id + '-decisions' });
+  decisions.appendChild(decisionChips(p, { idPrefix: host.id }));
+  host.append(stmt, noteEl, decisions, why);
 }
 
 /** One rAF-driven timeline: run(ms, onFrame(p), onDone?), cancel(), running. */
@@ -717,20 +807,38 @@ export function mount(el, ctx) {
   ensureStationStyle();
   const mv = (window.__mv = window.__mv || {});
   const st = { fnId: 'sq-plus-z', z0: { re: DEFAULT_Z0.re, im: DEFAULT_Z0.im }, rho: RHO.def, phiDeg: 0, dcHalf: null };
+  let fresh = null;                // { fnId, problem, note } while the function on the page is the Rehearsal Room's
+  let custom = null;               // the function reference of a request whose function has no chip
+  let customError = null;          // the parser's sentence when the request's function could not be read
+  let movedZ0 = false;             // the request set z0
   const preset = ctx && ctx.preset;
   if (preset && preset.kind === 'problem') {
     if (preset.id === '3.1.2') st.fnId = 'abs2';
     else if (preset.id === 'P6') { st.fnId = 're'; st.z0 = { re: 0.3, im: -0.7 }; }
+  } else if (preset && preset.kind === 'values') {
+    const fv = derivativeFromValues(valuesOf(preset, VALUES_SHAPE));
+    if (fv) {
+      customError = fv.error;
+      if (fv.applied) {
+        st.fnId = fv.fnId;
+        custom = fv.custom;
+        if (fv.z0) { st.z0 = fv.z0; movedZ0 = true; }
+        const pid = preset.problem;
+        const lead = Object.values(PROBLEM_FOR_FN).includes(pid) ? freshNote(problemById(pid), preset) : '';
+        if (lead) fresh = { fnId: st.fnId, problem: pid, note: noteOf(lead, derivativeLoaded(st.fnId, custom, st.z0)) };
+      }
+    }
   } else if (preset && preset.kind === 'token') {
     const tok = String(preset.token).toLowerCase();
     if (FUNCTION_IDS.includes(tok)) st.fnId = tok;
   }
+  const ref = () => (st.fnId === 'custom' ? custom : st.fnId);        // what microscope() and compiledFn() take
 
   let destroyed = false;
   let statusTimer = 0;
   const animator = createAnimator();
   const reduced = () => !!(ctx && ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion());
-  const cur = { model: microscope(st.fnId, st.z0, st.rho), f: compiledFn(st.fnId), ring: [], image: [], linear: [], phi: 0 };
+  const cur = { model: microscope(ref(), st.z0, st.rho), f: compiledFn(ref()), ring: [], image: [], linear: [], phi: 0 };
 
   // ---- DOM
   const header = buildHeader(ctx, 'Put z₀ under a microscope. Close up, a differentiable f turns the ring in the z-plane into a ring in the w-plane, spun and scaled by one number, f′(z₀). The quotient plane, below the other two, plots the difference quotient for every direction: a circle with centre A and radius |B|. The derivative exists exactly when that circle is a single point.');
@@ -751,7 +859,24 @@ export function mount(el, ctx) {
     fnButtons.set(id, b);
     fnChips.appendChild(b);
   }
-  fnBlock.appendChild(fnChips);
+  if (custom) {
+    const b = mk('button', 'chip', { type: 'button', id: 'derivative-fn-custom', 'aria-pressed': String(st.fnId === 'custom'), title: 'f(z) = ' + custom.src });
+    b.appendChild(mk('span', '', null, 'custom'));
+    if (fresh && fresh.problem) b.appendChild(mk('span', 'ld-tag', null, fresh.problem));
+    fnButtons.set('custom', b);
+    fnChips.appendChild(b);
+  }
+  const customNote = mk('p', 'ld-note', { id: 'derivative-custom-note' });
+  customNote.hidden = !custom;
+  if (custom) {
+    const fSpan = mk('span');
+    if (custom.tex) tex(fSpan, 'f(z) = ' + custom.tex); else fSpan.textContent = 'f(z) = ' + custom.src;
+    customNote.append('Custom function from the Rehearsal Room: ', fSpan);
+  }
+  const customErr = mk('p', 'ld-error', { id: 'derivative-custom-error', role: 'alert' });
+  customErr.hidden = !customError;
+  if (customError) customErr.append('The function from the Rehearsal Room could not be read, so this page opened on its own function. ', mk('span', 'ld-error-message', null, customError));
+  fnBlock.append(fnChips, customNote, customErr);
 
   const rhoRow = makeSliderRow('derivative-rho', 'Ring size ρ', { min: RHO.min, max: RHO.max, step: RHO.step, value: st.rho });
   const phiRow = makeSliderRow('derivative-phi', 'Direction of the step h', { min: -180, max: 180, step: 5, value: st.phiDeg });
@@ -802,7 +927,13 @@ export function mount(el, ctx) {
   const verdict = mk('div', 'callout', { id: 'derivative-verdict', 'data-exists': 'yes' });
   const status = mk('p', 'sr-only', { id: 'derivative-status', role: 'status', 'aria-live': 'polite' });
   const links = buildStationLinks(ctx);
-  el.append(header, controls, problemBox, twoPlanes, lower, readout, verdict, status, links);
+  const glyph = moveGlyph({ re: 0, im: 0 }, { size: '2em', id: 'derivative-glyph' });
+  const readoutRow = mk('div', 'ld-readout-row', { id: 'derivative-readout-row' });
+  readoutRow.append(glyph, readout);                              // the glyph is the readout's sibling, never inside it
+  const glyphText = mk('p', 'ld-glyph-text', { id: 'derivative-glyph-text' });
+  const videoHost = mk('div', '', { id: 'derivative-video-host' });
+  videoHost.hidden = true;
+  el.append(header, controls, problemBox, twoPlanes, lower, videoHost, readoutRow, glyphText, verdict, status, links);
 
   // ---- planes and layers
   // The view is 4 units across like the w-plane, shifted right so that the default z0 = 1 + i clears the zoom buttons on a phone.
@@ -975,10 +1106,19 @@ export function mount(el, ctx) {
     zplane.requestDraw(); wplane.requestDraw(); dcplane.requestDraw();
   }
 
+  // The glyph shows f'(z0) as a move; an SVG has no `hidden` property, so the attribute is toggled (theme.css hides [hidden] everywhere).
+  function syncGlyph(m) {
+    let fp = m.defined && m.exists ? m.fprime : null;
+    if (fp && hyp(fp) < 1e-9) fp = { re: 0, im: 0 };              // rounding noise is the zero move, not a turn of some angle
+    glyph.toggleAttribute('hidden', !fp);
+    if (fp) updateGlyph(glyph, fp);
+    glyphText.textContent = glyphCaption(m);
+  }
+
   function refreshModel() {
     if (destroyed) return;
-    const m = (cur.model = microscope(st.fnId, st.z0, st.rho));
-    cur.f = compiledFn(st.fnId);
+    const m = (cur.model = microscope(ref(), st.z0, st.rho));
+    cur.f = compiledFn(ref());
     if (m.defined) {
       const { ring, image } = ringImage(cur.f, st.z0, m.rhoEff);
       cur.ring = ring; cur.image = image; cur.linear = linearImage(m);
@@ -992,6 +1132,7 @@ export function mount(el, ctx) {
     }
     rhoRow.output.textContent = 'ρ = ' + fmtNum(st.rho, 2) + (m.defined && m.rhoEff < st.rho - 1e-9 ? ` (clipped to ${fmtNum(m.rhoEff, 3)} near the pole)` : '');
     readout.textContent = buildReadout(m);
+    syncGlyph(m);
     const v = verdictText(m);
     verdict.textContent = '';
     verdict.appendChild(document.createTextNode(v.text));
@@ -1004,9 +1145,10 @@ export function mount(el, ctx) {
     scheduleStatus();
   }
 
+  const freshOn = () => !!fresh && st.fnId === fresh.fnId;
   function refreshFn() {
     for (const [id, b] of fnButtons) b.setAttribute('aria-pressed', String(id === st.fnId));
-    renderProblemCard(problemBox, PROBLEM_FOR_FN[st.fnId] || null);
+    renderProblemCard(problemBox, freshOn() ? fresh.problem : (PROBLEM_FOR_FN[st.fnId] || null), { note: freshOn() ? fresh.note : '' });
     refreshModel();
   }
 
@@ -1079,6 +1221,7 @@ export function mount(el, ctx) {
 
   // ---- first full refresh (synchronous: the explainer renders at once)
   refreshFn();
+  if (movedZ0) showZ0();                                          // a requested z0 outside the opening view pans the view to it
 
   function stateCopy() {
     const m = cur.model;
@@ -1092,6 +1235,13 @@ export function mount(el, ctx) {
   const hook = { state: stateCopy };
   mv.derivative = hook;
 
+  // The video panel comes after the picture rows and only when the manifest lists it; the host stays hidden until it does.
+  let videoEl = null;
+  videoPanel(videoHost, VIDEO_ID).then((p) => {
+    if (destroyed) { if (p) p.remove(); return; }
+    if (p) { videoEl = p; videoHost.hidden = false; }
+  }).catch(() => {});
+
   return function unmount() {
     if (destroyed) return;
     destroyed = true;
@@ -1106,6 +1256,7 @@ export function mount(el, ctx) {
     originBtn.removeEventListener('click', onOrigin);
     for (const pl of [zplane, wplane, dcplane]) { try { pl.destroy(); } catch (e) { /* already gone */ } }
     try { ex.destroy(); } catch (e) { /* already gone */ }
+    if (videoEl) { videoEl.remove(); videoEl = null; }
     if (window.__mv && window.__mv.derivative === hook) delete window.__mv.derivative;
     releaseStationStyle();
   };
diff --git a/js/stations/limits.js b/js/stations/limits.js
index 904056e..b871f27 100644
--- a/js/stations/limits.js
+++ b/js/stations/limits.js
@@ -18,6 +18,8 @@ import { prose } from '../core/katex.js';
 import { Arg, wrapArg, fromPolar, mul, directionalQuotients, localLinear, fmtCart, fmtNum, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
 import { compile } from '../core/parse.js';
 import { fnById } from '../data/functions.js';
+import { problemById } from '../data/problems.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
 import { drawDirectionCircle, drawDirectionWords, placeWord, ringCands, spotsBeside, ensureStationStyle, releaseStationStyle, buildStationLinks,
          buildHeader, renderProblemCard, createAnimator, compiledFn, texDecCart, texDecPolar, stackTex, makeSliderRow, mk } from './derivative.js';
 
@@ -185,6 +187,28 @@ export function deriveState(st) {
   };
 }
 
+// ---------------------------------------------------------------- the values preset (iteration 2; ARCHITECTURE 4.1). Pure.
+
+// The fresh-numbers line: kit's freshNote (it ends without a full stop when the handout answer does), then what is on the page.
+const noteOf = (lead, loaded) => (/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded;
+
+export const VALUES_SHAPE = Object.freeze({ fn: FN_IDS, path: PATH_IDS, m: 'real' });
+
+// vals: what valuesOf returned for VALUES_SHAPE (maybe empty) or null for any other preset.
+// → null | { applied, fnId, path, m }. Missing or invalid parts are the station's defaults (dir, parabola, m = 1); a slope counts only
+// with the path 'line' and only within the slider (|m| <= 3).
+export function limitsFromValues(vals) {
+  if (!vals) return null;
+  const fnId = vals.fn || null, path = vals.path || null;
+  const m = Number.isFinite(vals.m) && Math.abs(vals.m) <= 3 ? vals.m : null;
+  return { applied: fnId !== null || path !== null, fnId: fnId || 'dir', path: path || 'parabola', m: path === 'line' && m !== null ? m : 1 };
+}
+
+// "Now on the page: g = z²/|z|², way in: y = 2x."
+export function limitsLoaded(fnId, path, m) {
+  return 'Now on the page: g = ' + fnById(fnId).label + ', way in: ' + pathDescription(path, m) + '.';
+}
+
 // ---------------------------------------------------------------- copy
 
 /** '0.785 (pi/4)', '1.571 (pi/2)', '0': the exact form in parentheses only when it says something the decimal does not. */
@@ -314,9 +338,17 @@ export function mount(el, ctx) {
   ensureStationStyle();
   const mv = (window.__mv = window.__mv || {});
   const st = { fnId: 'dir', path: 'parabola', m: 1, t: 0.45, follow: false, playing: false, edMode: 'sq', eps: EPS.def };
+  let fresh = null;                                              // { fnId, path, m, note } while the way in on the page is the Rehearsal Room's
   const preset = ctx && ctx.preset;
   if (preset && preset.kind === 'problem') {
     if (preset.id === 'P5') { st.fnId = 'x-over-z'; st.path = 'line'; st.m = 0; }
+  } else if (preset && preset.kind === 'values') {
+    const fv = limitsFromValues(valuesOf(preset, VALUES_SHAPE));
+    if (fv && fv.applied) {
+      st.fnId = fv.fnId; st.path = fv.path; st.m = fv.m;
+      const lead = freshNote(problemById(PROBLEM_FOR_FN[fv.fnId]), preset);
+      if (lead) fresh = { fnId: fv.fnId, path: fv.path, m: fv.m, note: noteOf(lead, limitsLoaded(fv.fnId, fv.path, fv.m)) };
+    }
   } else if (preset && preset.kind === 'token') {
     const tok = String(preset.token).toLowerCase();
     if (PATH_IDS.includes(tok)) st.path = tok;
@@ -645,6 +677,17 @@ export function mount(el, ctx) {
     }, 400);
   }
 
+  // The card is rebuilt only when what it shows changes: the problem, or whether the numbers are still the request's.
+  const freshOn = () => !!fresh && st.fnId === fresh.fnId && st.path === fresh.path && (st.path !== 'line' || st.m === fresh.m);
+  let cardKey = null;
+  function syncCard() {
+    const on = freshOn();
+    const key = (PROBLEM_FOR_FN[st.fnId] || '') + '|' + (on ? 1 : 0);
+    if (key === cardKey) return;
+    cardKey = key;
+    renderProblemCard(problemBox, PROBLEM_FOR_FN[st.fnId] || null, { note: on ? fresh.note : '' });
+  }
+
   function refreshFn() {
     for (const [id, b] of fnButtons) b.setAttribute('aria-pressed', String(id === st.fnId));
     prose(fnNote, fnById(st.fnId).note);
@@ -652,7 +695,7 @@ export function mount(el, ctx) {
       const { A, B } = localLinear(RE, ZERO);
       fnNote.append(` It is also the difference quotient of Re z at 0, the circle of problem P6 (A = ${fmtNum(A.re)}, B = ${fmtNum(B.re)}).`);
     }
-    renderProblemCard(problemBox, PROBLEM_FOR_FN[st.fnId] || null);
+    syncCard();
   }
 
   function refreshPath() {
@@ -662,6 +705,7 @@ export function mount(el, ctx) {
     const pts = pathCurve(st.path, { m: st.m });
     zCurve.update(pts);
     wCurve.update(imageCurve(f, pts));
+    syncCard();
   }
 
   function refreshState(forceEx = false) {
diff --git a/js/stations/reciprocal.js b/js/stations/reciprocal.js
index be131ed..c89e06b 100644
--- a/js/stations/reciprocal.js
+++ b/js/stations/reciprocal.js
@@ -20,6 +20,8 @@ import { createExplainer } from '../core/explainer.js';
 import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
 import { createView3D, riemannSphere, createMarker, curveToLine, stereographic, disposeObject } from '../core/three-view.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
 
 // ---------------------------------------------------------------- constants
 
@@ -42,9 +44,74 @@ function stateOf(key) {
 
 // ---------------------------------------------------------------- pure helpers (internals)
 
+// ---- the values preset (iteration 2): the Rehearsal Room opens the station with its shape (ARCHITECTURE 4.1). Pure.
+// The fresh-numbers line: kit's freshNote (it ends without a full stop when the handout answer does), then what is on the page.
+const noteOf = (lead, loaded) => (/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded;
+const cleanZ = (z) => (z && Number.isFinite(z.re) && Number.isFinite(z.im) ? { re: z.re + 0, im: z.im + 0 } : null);
+
+// valuesOf validator: a circle (centre and radius inside what the handles reach: centre within 3 of 0, radius 0.1 to 3) or a line
+// through two points at least 0.1 apart, all within 3 of 0. Anything else is dropped.
+function shapeSpec(v) {
+  if (!v || typeof v !== 'object') return undefined;
+  if (v.kind === 'circle') {
+    const c = cleanZ(v.center);
+    if (!c || !Number.isFinite(v.r) || v.r < 0.1 - 1e-9 || v.r > 3 + 1e-9 || Math.abs(c.re) > 3 || Math.abs(c.im) > 3) return undefined;
+    return { kind: 'circle', center: c, r: v.r };
+  }
+  if (v.kind === 'line') {
+    const a = cleanZ(v.a), b = cleanZ(v.b);
+    if (!a || !b || Math.hypot(a.re - b.re, a.im - b.im) < 0.1 || [a.re, a.im, b.re, b.im].some((t) => Math.abs(t) > 3)) return undefined;
+    return { kind: 'line', a, b };
+  }
+  return undefined;
+}
+const VALUES_SHAPE = Object.freeze({ shape: shapeSpec });
+
+// A spot is usable for a handle or the probe when it is on the plane (within 2.8 of 0 in both parts) and not within 0.3 of 0.
+const usableSpot = (z) => Math.abs(z.re) <= 2.8 && Math.abs(z.im) <= 2.8 && Math.hypot(z.re, z.im) >= 0.3;
+const BEARINGS = [-Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, Math.PI / 2, -Math.PI / 2, 0, Math.PI];
+const PROBE_PHIS = [Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, 0, Math.PI];
+const onCircle = (c, r, a) => ({ re: c.re + r * Math.cos(a), im: c.im + r * Math.sin(a) });
+
+// Where the radius handle sits: the first of eight bearings that puts it on the plane and off 0 (the default is -π/4, as the presets have).
+function pickBearing(c, r) {
+  for (const b of BEARINGS) if (usableSpot(onCircle(c, r, b))) return b;
+  return -Math.PI / 4;
+}
+
+// Where the probe starts, as an angle in [0, 2π): π/2 unless that is off the plane or on 0 (the circle |z + i| = 1 passes through 0 there).
+function pickPhi(c, r) {
+  for (const p of PROBE_PHIS) if (usableSpot(onCircle(c, r, p))) return ((p % TWO_PI) + TWO_PI) % TWO_PI;
+  return Math.PI / 2;
+}
+
+// null when the whole circle fits the plane's default view (|x| and |y| of its box within 3.2); else the two corners to fit the z-plane to.
+function frameFor(shape) {
+  if (shape.kind !== 'circle') return null;
+  const lo = { re: shape.c.re - shape.r, im: shape.c.im - shape.r }, hi = { re: shape.c.re + shape.r, im: shape.c.im + shape.r };
+  return [lo.re, lo.im, hi.re, hi.im].every((t) => Math.abs(t) <= 3.2) ? null : [lo, hi];
+}
+
+// vals: what valuesOf returned for VALUES_SHAPE (maybe empty) or null. → null | a state of the station (preset 'custom', fromValues true).
+function shapeFromValues(vals) {
+  if (!vals || !vals.shape) return null;
+  const s = vals.shape;
+  const base = { preset: 'custom', stage: 'both', s: 1, turn: 0, playing: false, turning: false, fromValues: true };
+  if (s.kind === 'circle') {
+    const c = { re: s.center.re, im: s.center.im };
+    return { ...base, shape: { kind: 'circle', c, r: s.r, bearing: pickBearing(c, s.r) }, probe: { phi: pickPhi(c, s.r) } };
+  }
+  return { ...base, shape: { kind: 'line', a: { re: s.a.re, im: s.a.im }, b: { re: s.b.re, im: s.b.im } }, probe: { s: 1 } };
+}
+
+// A string that changes when the shape does (the probe is not part of it): the fresh note lives while it is unchanged.
+const shapeKey = (shape) => (shape.kind === 'circle' ? ['c', shape.c.re, shape.c.im, shape.r].join('|') : ['l', shape.a.re, shape.a.im, shape.b.re, shape.b.im].join('|'));
+const loadedText = (shape) => 'Now on the page: ' + describeShape(shape) + '.';
+
 // ctx.preset | null -> a fresh state.
 function presetFor(preset) {
   if (!preset) return stateOf('circle1');
+  if (preset.kind === 'values') return shapeFromValues(valuesOf(preset, VALUES_SHAPE)) || stateOf('circle1');
   if (preset.kind === 'problem' && preset.id === '2.5.1') return stateOf('circle1');
   if (preset.kind === 'topic' && preset.id === 'T2.5') return stateOf('circle1');
   if (preset.kind === 'token') {
@@ -352,6 +419,7 @@ export const internals = Object.freeze({
   PRESETS, presetFor, snapGrid, describeShape, describeImage, imageResidual, isThroughOrigin, nearHint, invertPoint, mirrorPoint,
   refineSamples, strokeOf, probeOf, snapProbe, rotateMaths, sphereTriples, sphereRuns, joinRuns, mirrorSymmetry, stageNoteFor, poolStyles, rowsFor, edgeIndicator, readoutText, clampFor, neighbourLinks,
   labRequest, flatten, srText, anyInView, lineGeom,
+  VALUES_SHAPE, shapeSpec, shapeFromValues, pickBearing, pickPhi, frameFor, shapeKey, loadedText,
 });
 
 // ---------------------------------------------------------------- explainer rows
@@ -436,6 +504,7 @@ const TEMPLATE = `
   <ul class="thread-badges" id="reciprocal-threads"></ul>
   <div class="chips" id="reciprocal-problem-chips" role="group" aria-label="Problems on this page"></div>
 </header>
+<p class="callout" data-tone="accent" id="reciprocal-fresh" hidden></p>
 <section class="panel" aria-labelledby="reciprocal-controls-title">
   <h2 id="reciprocal-controls-title" class="sr-only">Controls</h2>
   <div class="stack">
@@ -594,6 +663,11 @@ function drawHollowDot(c2, pl, z, radius) {
 export function mount(el, ctx) {
   const mv = (window.__mv = window.__mv || {});
   const st = presetFor(ctx && ctx.preset);
+  const lead = st.fromValues ? freshNote(problemById('2.5.1'), ctx.preset) : '';
+  const fresh = lead ? {
+    key: shapeKey(st.shape), note: noteOf(lead, loadedText(st.shape)),
+    banner: 'Fresh numbers from the Rehearsal Room. ' + loadedText(st.shape) + ' The handout problem is at the bottom of the page.',
+  } : null;
   const station = ctx.station;
   const reduced = () => { try { return !!(ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion()); } catch (e) { return false; } };
   const cssVar = (name) => { try { return ctx.theme.cssVar(name) || cssColor(name); } catch (e) { return cssColor(name); } };
@@ -616,7 +690,7 @@ export function mount(el, ctx) {
     readout: $('reciprocal-readout'), sr: $('reciprocal-sr'), exHost: $('reciprocal-ex'),
     sphereIntro: $('reciprocal-sphere-intro'), sphereHost: $('reciprocal-sphere'), turn: $('reciprocal-sphere-turn'), turnOut: $('reciprocal-sphere-turn-out'),
     turnPlay: $('reciprocal-sphere-play'), sphereNote: $('reciprocal-sphere-note'),
-    problem: $('reciprocal-problem'), notice: $('reciprocal-notice'), lab: $('reciprocal-open-lab'), links: $('reciprocal-links'),
+    fresh: $('reciprocal-fresh'), problem: $('reciprocal-problem'), notice: $('reciprocal-notice'), lab: $('reciprocal-open-lab'), links: $('reciprocal-links'),
   };
 
   prose(ui.title, station.title);
@@ -898,6 +972,8 @@ export function mount(el, ctx) {
       if (part.math) tex(span, part.text); else span.textContent = part.text;
       head.appendChild(span);
     }
+    const dec = mk('div', 'row', { id: 'reciprocal-problem-decisions' });
+    dec.appendChild(decisionChips(p, { idPrefix: 'reciprocal-problem' }));
     const aha = mk('p', 'muted');
     prose(aha, p.aha);
     const routes = mk('div', 'two-planes');
@@ -918,11 +994,14 @@ export function mount(el, ctx) {
     const box = mk('div', 'tex-scroll');
     tex(box, p.answer.tex, { display: true });
     det.append(box, mk('p', 'muted mono', null, p.answer.text));
-    ui.problem.append(head, aha, routes, why, det, mk('p', 'muted', { id: 'reciprocal-problem-note' }));
+    ui.problem.append(head, dec, aha, routes, why, det, mk('p', 'muted', { id: 'reciprocal-problem-note' }));
   }
   function renderProblemNote() {
     const note = ui.problem.querySelector('#reciprocal-problem-note');
-    if (note) note.textContent = st.preset === 'circle1' ? 'This is problem 2.5.1 exactly.' : 'You changed the shape. The problem itself is the circle |z − 1| = 1.';
+    const on = !!fresh && shapeKey(st.shape) === fresh.key;
+    if (note) note.textContent = on ? fresh.note : (st.preset === 'circle1' ? 'This is problem 2.5.1 exactly.' : 'You changed the shape. The problem itself is the circle |z − 1| = 1.');
+    const banner = on ? fresh.banner : '';
+    if (ui.fresh.textContent !== banner) { ui.fresh.textContent = banner; ui.fresh.hidden = !banner; }
   }
 
   // ---- neighbour links
@@ -1181,6 +1260,7 @@ export function mount(el, ctx) {
   renderProblem();
   buildSphere();
   syncControls();
+  if (st.fromValues) { const fit = frameFor(st.shape); if (fit) zplane.fitTo(fit, 0.1); }
   flushNow();
   ui.sr.textContent = srText(st);
 
```

## Appendix B. `tests/unit/i2-decisions-everywhere-c.test.mjs`

Run: `node --test tests/unit/i2-decisions-everywhere-c.test.mjs` (24 tests, all pass in the scratch copy with Appendix A applied).

```js
// tests/unit/i2-decisions-everywhere-c.test.mjs: the pure half of goal i2-decisions-everywhere-c (branches, reciprocal, limits,
// derivative, cauchy-riemann): the values preset helpers, the glyph words, the fresh-numbers notes and the source rules (A6).
// Run: node --test tests/unit/i2-decisions-everywhere-c.test.mjs
// Design: docs/designs/iter-2/i2-decisions-everywhere-c.md, section 7 and Appendix B.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import * as B from '../../js/stations/branches.js';
import * as REC from '../../js/stations/reciprocal.js';
import * as L from '../../js/stations/limits.js';
import * as D from '../../js/stations/derivative.js';
import * as CR from '../../js/stations/cauchy-riemann.js';
import { valuesOf, freshNote } from '../../js/core/station-kit.js';
import { glyphText } from '../../js/core/moveglyph.js';
import { compile } from '../../js/core/parse.js';
import { problemById } from '../../js/data/problems.js';
import { fmtCart } from '../../js/core/complex.js';

const PI = Math.PI;
const c = (re, im = 0) => ({ re, im });
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} vs ${b}`);
const preset = (station, problem, values) => ({ kind: 'values', station, problem, family: problem, values });
const SRC = (f) => fs.readFileSync(new URL(`../../js/stations/${f}`, import.meta.url), 'utf8');
const code = (s) => s.split('\n').map((line) => line.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, '')).join('\n');

// ---------------------------------------------------------------- A1 data: the chips read problems.js

test('K1 the nine problems of this goal carry the decisions the story table gives them', () => {
  const want = {
    '2.4.1': ['P', 'continuous'], '2.5.1': ['P', 'any'], '2.3.1': ['P', 'any'], P5: ['P', 'any'], '3.1.1': ['C', 'none'],
    '3.1.2': ['P', 'any'], P6: ['both', 'any'], '3.2.1': ['C', 'none'], P7: ['C', 'none'],
  };
  for (const [id, [address, names]] of Object.entries(want)) {
    const p = problemById(id);
    assert.equal(p.address, address, id);
    assert.equal(p.names, names, id);
  }
});

// ---------------------------------------------------------------- branches

test('B1 unitPoint is exact on the axes and never -0', () => {
  assert.deepEqual(B.unitPoint(0), c(1, 0));
  assert.deepEqual(B.unitPoint(PI), c(-1, 0));
  assert.deepEqual(B.unitPoint(PI / 2), c(0, 1));
  assert.deepEqual(B.unitPoint(3 * PI / 2), c(0, -1));
  assert.ok(Object.is(B.unitPoint(PI).im, 0) && Object.is(B.unitPoint(3 * PI / 2).re, 0));
  near(B.unitPoint(PI / 4).re, Math.SQRT1_2);
});

test('B2 branchesFromValues: the request of the goal text, and every fallback', () => {
  const run = (values) => B.branchesFromValues(valuesOf(preset('branches', '2.4.1', values), B.VALUES_SHAPE));
  const a = run({ n: 2, seam: PI / 2, walk: null });
  assert.equal(a.applied, true);
  assert.equal(a.n, 2);
  assert.equal(a.seam, PI / 2, 'the seam is exactly π/2');
  assert.deepEqual(a.z, c(0, -1), 'z goes on the ray opposite the seam');
  assert.equal(a.walk, null);
  const b = run({ n: 3, seam: 0, walk: 'along' });
  assert.deepEqual([b.n, b.seam, b.z, b.walk], [3, 0, c(-1, 0), 'along']);
  const d = run({ n: 3, seam: -PI, walk: 'across' });
  assert.deepEqual([d.seam, d.z, d.walk], [-PI, c(1, 0), 'across']);
  assert.equal(run({ seam: 0.01 }).seam, 0, 'within 0.02 of a nice angle it is that angle');
  assert.deepEqual(run({ n: 4 }), { applied: true, n: 4, seam: -PI, z: c(-1, 0.5), walk: null }, 'n alone: the default seam and point');
  for (const bad of [{ n: 9 }, { n: 1 }, { seam: 7 }, { n: 2.5, seam: 'x', walk: 'sideways' }, {}]) {
    const r = run(bad);
    assert.equal(r.applied, false, JSON.stringify(bad));
    assert.deepEqual([r.n, r.seam, r.z, r.walk], [3, -PI, c(-1, 0.5), null], 'the station defaults');
  }
  assert.equal(B.branchesFromValues(valuesOf({ kind: 'problem', id: '2.4.1' }, B.VALUES_SHAPE)), null, 'not a values preset');
});

test('B3 the readout of the request is the one the station prints for that state', () => {
  const m = B.branchAt(c(0, -1), 2, PI / 2);
  assert.equal(B.readoutText(m), 'seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2');
  assert.equal(B.branchesLoaded(2, PI / 2), 'Now on the page: the square root, with its seam at π/2 and z on the ray opposite the seam.');
});

// ---------------------------------------------------------------- reciprocal

const RI = REC.internals;
const recRun = (shape) => RI.shapeFromValues(valuesOf(preset('reciprocal', '2.5.1', { shape }), RI.VALUES_SHAPE));

test('R1 shapeFromValues: the five circles and a line the generators send, with the readout each opens on', () => {
  const rows = [
    [{ kind: 'circle', center: c(0, 1), r: 1 }, -PI / 4, PI / 2, 'shape: circle |z - i| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; |1/p| = 0.5'],
    [{ kind: 'circle', center: c(0, -1), r: 1 }, -PI / 4, 3 * PI / 2, 'shape: circle |z + i| = 1; image: line Im w = 0.5; p = -2i; 1/p = 0.5i; |1/p| = 0.5'],
    [{ kind: 'circle', center: c(2, 0), r: 2 }, 3 * PI / 4, PI / 2, 'shape: circle |z - 2| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; |1/p| = 0.354'],
    [{ kind: 'circle', center: c(-1, 0), r: 1 }, -PI / 4, PI / 2, 'shape: circle |z + 1| = 1; image: line Re w = -0.5; p = -1 + i; 1/p = -0.5 - 0.5i; |1/p| = 0.707'],
    [{ kind: 'circle', center: c(1, 1), r: Math.SQRT2 }, -PI / 4, PI / 2, 'shape: circle |z - (1 + i)| = 1.414; image: line 1u - 1v = 0.5; p = 1 + 2.414i; 1/p = 0.146 - 0.354i; |1/p| = 0.383'],
  ];
  for (const [shape, bearing, phi, readout] of rows) {
    const st = recRun(shape);
    assert.equal(st.preset, 'custom');
    assert.equal(st.fromValues, true);
    near(st.shape.bearing, bearing, 1e-12, 'bearing');
    near(st.probe.phi, phi, 1e-12, 'phi');
    assert.equal(RI.readoutText(st.shape, RI.probeOf(st.shape, st.probe).z), readout);
  }
  const line = recRun({ kind: 'line', a: c(2, 0), b: c(2, 1) });
  assert.deepEqual(line.probe, { s: 1 });
  assert.equal(RI.readoutText(line.shape, RI.probeOf(line.shape, line.probe).z), 'shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; |1/p| = 0.447');
});

test('R2 a bad shape is dropped, so presetFor gives the default circle', () => {
  for (const shape of [{ kind: 'circle', center: c(9, 9), r: 1 }, { kind: 'circle', center: c(0, 0), r: 50 }, { kind: 'circle', center: c(0, 0), r: 0.01 }, { kind: 'ellipse' },
    { kind: 'line', a: c(1, 1), b: c(1, 1.01) }, { kind: 'line', a: c(5, 0), b: c(5, 1) }, null, 'x', 7]) {
    assert.equal(recRun(shape), null, JSON.stringify(shape));
    const st = RI.presetFor(preset('reciprocal', '2.5.1', { shape }));
    assert.equal(st.preset, 'circle1');
    assert.equal(st.fromValues, undefined);
  }
  assert.equal(RI.presetFor(preset('reciprocal', '2.5.1', { shape: { kind: 'circle', center: c(0, 1), r: 1 } })).preset, 'custom');
});

test('R3 frameFor fits the plane only to a circle that leaves it; shapeKey changes with the shape and not with the probe', () => {
  assert.equal(RI.frameFor(recRun({ kind: 'circle', center: c(0, 1), r: 1 }).shape), null);
  assert.deepEqual(RI.frameFor(recRun({ kind: 'circle', center: c(2, 0), r: 2 }).shape), [c(0, -2), c(4, 2)]);
  assert.equal(RI.frameFor(recRun({ kind: 'line', a: c(2, 0), b: c(2, 1) }).shape), null);
  const a = recRun({ kind: 'circle', center: c(0, 1), r: 1 }), b = recRun({ kind: 'circle', center: c(0, 1), r: 1.1 });
  assert.notEqual(RI.shapeKey(a.shape), RI.shapeKey(b.shape));
  assert.equal(RI.shapeKey(a.shape), RI.shapeKey({ ...a.shape, bearing: 1 }), 'the bearing is not part of the key');
  assert.equal(RI.loadedText(a.shape), 'Now on the page: circle |z - i| = 1.');
});

// ---------------------------------------------------------------- limits

test('L1 limitsFromValues and the readouts the requests open on', () => {
  const run = (values) => L.limitsFromValues(valuesOf(preset('limits', '2.3.1', values), L.VALUES_SHAPE));
  assert.deepEqual(run({ fn: 'dir', path: 'line', m: 2 }), { applied: true, fnId: 'dir', path: 'line', m: 2 });
  assert.deepEqual(run({ fn: 'x-over-z', path: 'vertical', m: 5 }), { applied: true, fnId: 'x-over-z', path: 'vertical', m: 1 }, 'a slope counts only on a line');
  assert.deepEqual(run({ path: 'spiral' }), { applied: true, fnId: 'dir', path: 'spiral', m: 1 });
  assert.deepEqual(run({ path: 'line', m: 9 }), { applied: true, fnId: 'dir', path: 'line', m: 1 }, 'a slope outside the slider is dropped');
  assert.deepEqual(run({ fn: 'dir', path: 'cubic' }), { applied: true, fnId: 'dir', path: 'parabola', m: 1 }, 'a path the station cannot draw is dropped');
  assert.equal(run({ m: 2 }).applied, false);
  assert.equal(run({}).applied, false);
  assert.equal(L.limitsFromValues(null), null);
  const state = (fnId, path, m) => L.deriveState({ fnId, path, m, t: 0.45, follow: false, playing: false, edMode: 'sq', eps: 0.5 });
  assert.equal(L.buildReadout(state('dir', 'line', 2)), 'path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no');
  assert.equal(L.buildReadout(state('x-over-z', 'vertical', 1)), 'path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5; limit exists: no');
  assert.match(L.buildReadout(state('dir', 'parabola', 1)), /limit along this path: 1;/);
  assert.match(L.buildReadout(state('x-over-z', 'line', 2)), /limit along this path: 0\.2 - 0\.4i;/);
  assert.equal(L.limitsLoaded('dir', 'line', 2), 'Now on the page: g = z²/|z|², way in: y = 2x.');
  assert.equal(L.limitsLoaded('x-over-z', 'spiral', 1), 'Now on the page: g = (Re(1 + z) − 1)/z, way in: spiral into 0.');
});

// ---------------------------------------------------------------- derivative

const derRun = (values, problem = '3.1.1') => D.derivativeFromValues(valuesOf(preset('derivative', problem, values), D.VALUES_SHAPE));

test('D1 derivativeFromValues: a chip id, a custom source, a catalogue id with no chip, and every failure', () => {
  const a = derRun({ fn: { src: '2z^2 - 3z + 1' }, z0: c(1, 1) });
  assert.deepEqual([a.applied, a.fnId, a.z0, a.error], [true, 'custom', c(1, 1), null]);
  assert.equal(a.custom.id, 'custom');
  assert.equal(a.custom.src, '2z^2 - 3z + 1');
  assert.equal(a.custom.tex, '2z^{2} - 3z + 1');
  assert.equal(typeof a.custom.f, 'function');
  const b = derRun({ fn: 'abs2', z0: c(1, 1) }, '3.1.2');
  assert.deepEqual([b.applied, b.fnId, b.custom], [true, 'abs2', null]);
  const s = derRun({ fn: 'sq' });
  assert.deepEqual([s.applied, s.fnId, s.custom.src, s.z0], [true, 'custom', 'z^2', null], 'sq has no chip: it opens as a custom function');
  const u = derRun({ fn: 'nonsense', z0: c(1, 1) });
  assert.deepEqual([u.applied, u.fnId, u.custom, u.error], [true, 'sq-plus-z', null, 'This page cannot open the function "nonsense".'], 'the valid z0 still applies');
  const bad = derRun({ fn: { src: '2z +' }, z0: c(1, 1) });
  assert.deepEqual([bad.fnId, bad.custom], ['sq-plus-z', null]);
  let message = null;
  try { compile('2z +'); } catch (e) { message = e.message; }
  assert.equal(bad.error, message, 'the parser\'s sentence, verbatim');
  assert.equal(bad.error, 'The formula stops too early. Something is missing after "+".');
  for (const junk of [{ fn: 7, z0: 'x' }, { z0: c(50, 0) }, {}, { fn: { src: '   ' } }, { fn: '' }]) assert.equal(derRun(junk).applied, false, JSON.stringify(junk));
  assert.equal(D.derivativeFromValues(valuesOf({ kind: 'token', token: 'abs2' }, D.VALUES_SHAPE)), null);
  assert.equal(D.derivativeLoaded('custom', a.custom, c(1, 1)), 'Now on the page: f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.');
  assert.equal(D.derivativeLoaded('abs2', null, c(1, 1)), 'Now on the page: f(z) = |z|², at z₀ = 1 + i.');
});

test('D2 a custom function reference runs through microscope, ringFit and the readout like an id', () => {
  const ref = D.customFrom('2z^2 - 3z + 1').custom;
  const m = D.microscope(ref, c(1, 1), 0.2);
  assert.equal(D.buildReadout(m), 'z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i');
  assert.equal(m.exists, true);
  near(m.fprime.re, 1, 1e-9);
  near(m.fprime.im, 4, 1e-9);
  const fit = D.ringFit(m);
  near(fit.re, 1, 1e-9);
  near(fit.im, 4, 1e-9);
  assert.equal(D.buildReadout(D.microscope(D.customFrom('2*abs(z - 1)^2').custom, c(1, 1), 0.2)), 'z₀ = 1 + i; A = -2i; |B| = 2.000; f′(z₀) does not exist (circle radius 2.000)');
  assert.throws(() => D.compiledFn({ id: 'custom' }), RangeError);
  assert.equal(D.compiledFn('abs2')(c(3, 4)).re, 25, 'an id still works');
  assert.equal(D.compiledFn(ref), ref.f);
});

test('D3 the glyph words: the five moves of the goal, and the zero and missing cases', () => {
  const move = (fnRef, z0) => { const m = D.microscope(fnRef, z0, 0.2); return m.defined && m.exists ? glyphText(m.fprime) : null; };
  assert.equal(move('sq-plus-z', c(1, 1)), 'move: turn 33.7°, stretch 3.606', 'f′(1 + i) = 3 + 2i');
  assert.equal(move('sq-plus-z', c(0.3, -0.7)), 'move: turn -41.2°, stretch 2.126');
  assert.equal(move('sq-plus-z', c(2, 0)), 'move: turn 0°, stretch 5');
  assert.equal(move(D.customFrom('2z^2 - 3z + 1').custom, c(1, 1)), 'move: turn 76°, stretch 4.123');
  assert.equal(move('re', c(0.3, -0.7)), null, 'P6: no f′, no glyph');
  assert.equal(move('abs2', c(1, 1)), null);
  assert.equal(move('recip', c(0, 0)), null, 'undefined at the pole');
  assert.equal(glyphText(D.microscope('abs2', c(0, 0), 0.2).fprime), 'no move: 0');
});

test('D4 glyphCaption in its four cases', () => {
  const cap = (id, z0) => D.glyphCaption(D.microscope(id, z0, 0.2));
  assert.equal(cap('sq-plus-z', c(1, 1)), 'As a move: turn Arg f′(z₀) = 0.588 rad (33.7°), stretch |f′(z₀)| = 3.606.');
  assert.equal(cap('sq-plus-z', c(0.3, -0.7)), 'As a move: turn Arg f′(z₀) = -0.719 rad (-41.2°), stretch |f′(z₀)| = 2.126.');
  assert.equal(cap('exp', c(0, 0)), 'As a move: turn Arg f′(z₀) = 0 rad (0°), stretch |f′(z₀)| = 1.', 'an angle of 0 adds no exact form');
  assert.equal(cap('abs2', c(0, 0)), 'f′(z₀) = 0: the zero move. Every direction is squashed onto the point f(z₀).');
  assert.equal(cap('abs2', c(1, 1)), 'No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.');
  assert.equal(cap('recip', c(0, 0)), 'f is undefined at z₀, so there is no move to show.');
  assert.equal(D.glyphCaption(null), 'f is undefined at z₀, so there is no move to show.');
});

// ---------------------------------------------------------------- cauchy-riemann

const crRun = (values, problem = '3.2.1') => CR.crFromValues(valuesOf(preset('cauchy-riemann', problem, values), CR.VALUES_SHAPE));

test('C1 crFromValues: chip ids, custom sources, and the failures', () => {
  const a = crRun({ fn: { src: 'exp(-z)' }, z0: c(0, 0) });
  assert.deepEqual([a.applied, a.fnId, a.z0, a.error, a.custom.src, a.custom.tex], [true, 'custom', c(0, 0), null, 'exp(-z)', 'e^{-z}']);
  assert.deepEqual(crRun({ fn: 'conj' }).fnId, 'conj');
  assert.equal(crRun({ fn: 'const-u' }).applied, false, 'const-u is a chip of the page, not a catalogue function');
  assert.equal(crRun({ fn: 'const-u' }).error, 'This page cannot open the function "const-u".');
  assert.deepEqual([crRun({ fn: 'cube' }).fnId, crRun({ fn: 'cube' }).custom.src], ['custom', 'z^3']);
  assert.equal(crRun({ z0: c(3, 0) }).applied, false, 'z0 outside the z-plane [-2, 2] is dropped');
  assert.deepEqual(crRun({ z0: c(0.5, 0.8) }).z0, c(0.5, 0.8));
  const bad = crRun({ fn: { src: 'z^' } });
  assert.deepEqual([bad.fnId, bad.error], ['exp', 'The formula stops too early. Something is missing after "^".']);
  assert.equal(CR.crFromValues(null), null);
  assert.equal(CR.crLoaded('custom', a.custom, c(0, 0)), 'Now on the page: f(z) = exp(-z), at z₀ = 0.');
  assert.equal(CR.crLoaded('exp', null, c(0.5, 0.8)), 'Now on the page: f(z) = e^x(cos y + i sin y), at z₀ = 0.5 + 0.8i.');
});

test('C2 the readouts and glyph words of the goal text', () => {
  const rep = (src, z0) => CR.crReport(compile(src).f, z0);
  assert.equal(CR.crReadout(rep('exp(-z)', c(0, 0))), 'A = -1; |B| = 0.000; CR holds: yes; f′(z₀) = -1 (u_x + i v_x)');
  assert.equal(glyphText(rep('exp(-z)', c(0, 0)).A), 'move: turn 180°, stretch 1');
  assert.equal(glyphText(rep('exp(z)', c(0.5, 0.8)).A), 'move: turn 45.8°, stretch 1.649', 'problem 3.2.1: A = f(z0)');
  assert.equal(glyphText(rep('conj(z)', c(0.5, 0.8)).A), 'no move: 0', 'a pure mirror: A = 0');
  assert.equal(glyphText(rep('abs(z)^2', c(0.5, 0.8)).A), 'move: turn -58°, stretch 0.943');
  assert.equal(CR.crReadout(rep('conj(z)', c(0.5, 0.8))), 'A = 0; |B| = 1.000; CR holds: no; f′ does not exist here');
});

test('C3 crGridCheck on the 25 integer points', () => {
  const grid = (src) => CR.crGridCheck(compile(src).f);
  for (const src of ['exp(-z)', 'exp(z)', 'z^2', 'z^3', 'exp(2*z)']) assert.deepEqual(grid(src), { ok: true, failAt: null, zero: false, count: 25 }, src);
  for (const src of ['3', '3i']) assert.deepEqual(grid(src), { ok: true, failAt: null, zero: true, count: 25 }, src);
  for (const src of ['conj(z)', 'abs(z)^2', 'conj(exp(z))', 'conj(z^2)']) assert.deepEqual(grid(src), { ok: false, failAt: c(-2, -2), zero: false, count: 25 }, src);
});

test('C4 crCustomCheck in its four cases', () => {
  const at = (src, z0) => { const f = compile(src).f; return CR.crCustomCheck(CR.crReport(f, z0), CR.crGridCheck(f)); };
  assert.equal(at('exp(-z)', c(0, 0)), 'CR holds at z₀ and at all 25 points of the grid x, y = -2 to 2, so f looks entire. That is a check at sample points. The proof is the partials: compare u_x with v_y and u_y with -v_x. f′(z₀) = -1.');
  assert.match(at('3', c(0.5, 0.8)), /f′ is 0 at every point checked, so f is constant \(Theorem 3\.2\.13\)\.$/);
  assert.equal(at('conj(z)', c(0.5, 0.8)), 'CR fails at z₀ (u_x = 1 but v_y = -1), so f has no derivative here and cannot be entire.');
  assert.equal(at('abs(z)^2', c(0, 0)), 'CR holds at z₀ but fails at -2 - 2i, so f is not differentiable everywhere and is not entire.');
  assert.equal(CR.crCustomCheck({ finite: false }, null), 'f has no value near z₀, so there is nothing to test.');
});

// ---------------------------------------------------------------- the fresh note, for the nine problems

test('N1 freshNote says "Fresh numbers" for each problem of this goal, only for that problem', () => {
  for (const id of ['2.4.1', '2.5.1', '2.3.1', 'P5', '3.1.1', '3.1.2', 'P6', '3.2.1', 'P7']) {
    const note = freshNote(problemById(id), preset('x', id, {}));
    assert.ok(note.startsWith('Fresh numbers from the Rehearsal Room. '), `${id}: ${note}`);
    assert.equal(freshNote(problemById(id), preset('x', '1.1.1', {})), '', 'another problem: no note');
    assert.equal(freshNote(problemById(id), { kind: 'problem', id }), '', 'not a values preset: no note');
  }
  assert.equal(fmtCart(c(0, 1)), 'i');
});

// ---------------------------------------------------------------- A6: the source rules

const FILES = ['branches.js', 'reciprocal.js', 'limits.js', 'derivative.js', 'cauchy-riemann.js'];

test('S1 every file reads the preset through valuesOf and never touches preset.values', () => {
  for (const f of FILES) {
    const src = code(SRC(f));
    assert.match(src, /valuesOf\(/, f);
    assert.doesNotMatch(src, /preset\.values|\.preset\.values|ctx\.preset\.values/, `${f}: no direct preset.values access`);
    assert.match(src, /freshNote\(/, f);
    assert.match(src, /import \{[^}]*\bvaluesOf\b[^}]*\} from '\.\.\/core\/station-kit\.js'/, f);
  }
});

test('S2 the chips are the kit\'s, with the card id as the prefix, in every card', () => {
  assert.match(code(SRC('branches.js')), /decisionChips\(prob, \{ idPrefix: 'branches-problem' \}\)/);
  assert.match(code(SRC('reciprocal.js')), /decisionChips\(p, \{ idPrefix: 'reciprocal-problem' \}\)/);
  for (const f of ['derivative.js', 'cauchy-riemann.js']) assert.match(code(SRC(f)), /decisionChips\(p, \{ idPrefix: (host|box)\.id \}\)/, f);
  for (const f of FILES) assert.match(SRC(f), /import \{ chips as decisionChips \} from '\.\.\/core\/decisions\.js'|from '\.\/derivative\.js'/, f);
  assert.doesNotMatch(code(SRC('limits.js')), /decisionChips/, 'limits builds its card through renderProblemCard of derivative.js');
});

test('S3 the glyph is on derivative and cauchy-riemann only, hidden by the attribute, and never inside the readout', () => {
  for (const f of FILES) {
    const src = code(SRC(f));
    const has = /moveGlyph\(/.test(src);
    assert.equal(has, f === 'derivative.js' || f === 'cauchy-riemann.js', `${f}: moveGlyph`);
  }
  for (const f of ['derivative.js', 'cauchy-riemann.js']) {
    const src = code(SRC(f));
    assert.match(src, /glyph\.toggleAttribute\('hidden', /, `${f}: an SVG has no hidden property`);
    assert.doesNotMatch(src, /glyph\.hidden\s*=/, f);
    assert.match(src, /updateGlyph\(glyph, /, f);
    assert.match(src, /readoutRow\.append\(glyph, readout\)/, `${f}: the glyph and the readout are siblings`);
    assert.match(src, /size: '2em'/, f);
  }
  assert.match(code(SRC('derivative.js')), /id: 'derivative-glyph'/);
  assert.match(code(SRC('cauchy-riemann.js')), /id: 'cauchy-riemann-glyph'/);
});

test('S4 the video panel is on derivative only, after the planes, and is removed on unmount', () => {
  for (const f of FILES) assert.equal(/videoPanel\(/.test(code(SRC(f))), f === 'derivative.js', f);
  const d = code(SRC('derivative.js'));
  assert.match(d, /const VIDEO_ID|export const VIDEO_ID/);
  assert.equal(D.VIDEO_ID, 'zoom-cr');
  assert.match(d, /el\.append\(header, controls, problemBox, twoPlanes, lower, videoHost, readoutRow, glyphText, verdict, status, links\)/);
  assert.match(d, /if \(videoEl\) \{ videoEl\.remove\(\); videoEl = null; \}\n\s*if \(window\.__mv && window\.__mv\.derivative === hook\) delete window\.__mv\.derivative;\n\s*releaseStationStyle\(\);\n\s*\};/);
});

test('S5 a bad custom source shows the parser\'s message verbatim, through parse.js', () => {
  for (const f of ['derivative.js', 'cauchy-riemann.js']) {
    const src = code(SRC(f));
    assert.match(src, /import \{[^}]*\bcompile\b[^}]*\bParseError\b[^}]*\} from '\.\.\/core\/parse\.js'/, f);
    assert.match(src, /err instanceof ParseError \? err\.message/, `${f}: the message is err.message`);
    assert.match(src, /role: 'alert'/, f);
  }
});

test('S6 no literal colour, no new inline style, none of the words the i1 pins forbid', () => {
  for (const f of FILES) {
    const raw = SRC(f);
    assert.doesNotMatch(raw, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/, `${f}: a literal colour`);
    const body = code(raw);
    for (const banned of ['alert(', 'confirm(', 'prompt(', 'window.open', 'document.write', 'Math.random', 'scrollTo', 'scrollIntoView']) assert.ok(!body.includes(banned), `${f}: ${banned}`);
    assert.doesNotMatch(body, /\d\s?degrees?\b/, `${f}: write °`);
  }
  for (const f of ['derivative.js', 'limits.js']) assert.ok(!code(SRC(f)).includes('innerHTML'), `${f}: no innerHTML`);
  const rec = SRC('reciprocal.js');
  const styles = [...rec.matchAll(/\.style\.(\w+)|style="([^"]*)"/g)].map((m) => m[1] || m[2]);
  assert.deepEqual(styles.filter((x) => x !== 'aspectRatio'), [], 'reciprocal: only the phone aspect-ratio is an inline style');
  const cr = SRC('cauchy-riemann.js');
  for (const bad of ['numericPartials', '1e-5', '2 * h', 'localStorage']) assert.ok(!cr.includes(bad), `cauchy-riemann.js: ${bad}`);
  assert.deepEqual(CR.CR_FN_IDS, ['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u'], 'the custom function is not a catalogue entry');
  assert.equal(Object.keys(CR.CR_FUNCTIONS).length, 6);
});

test('S7 unmount keeps releaseStationStyle last, and no iteration-1 id, class or readout string went', () => {
  for (const f of ['derivative.js', 'limits.js']) assert.match(code(SRC(f)), /releaseStationStyle\(\);\s*\n\s*\};/, f);
  for (const [f, ids] of Object.entries({
    'branches.js': ['branches-problem', 'branches-load-2-4-1', 'branches-answer-toggle', 'branches-answer', 'branches-readout'],
    'reciprocal.js': ['reciprocal-problem-note', 'reciprocal-readout', 'reciprocal-answer-toggle', 'reciprocal-problem'],
    'limits.js': ['limits-problem', 'limits-readout', 'limits-fn-note'],
    'derivative.js': ['derivative-problem', 'derivative-readout', 'derivative-zhost'],
    'cauchy-riemann.js': ['cauchy-riemann-problem', 'cauchy-riemann-readout', 'cauchy-riemann-fn-note', 'cauchy-riemann-verdict'],
  })) for (const id of ids) assert.ok(SRC(f).includes(id), `${f}: ${id}`);
  assert.match(SRC('cauchy-riemann.js'), /prose\(verdictEl, crVerdict\(state\.fnId, r, state\.z0\)\)/);
  assert.match(SRC('derivative.js'), /ring in the z-plane into a ring in the w-plane/);
});
```

## Appendix C. `tests/interact/i2-decisions-everywhere-c.mjs`

Run: `node tools/smoke.mjs --route branches --script tests/interact/i2-decisions-everywhere-c.mjs --dark` (desktop, phone and dark desktop: `3/3 checks passed`). The header line `--route branches` is what `tools/interact-all.mjs` reads.

```js
// tests/interact/i2-decisions-everywhere-c.mjs: the two decisions, the move glyph and the fresh-numbers preset on the five stations of
// goal i2-decisions-everywhere-c: branches, reciprocal, limits, derivative, cauchy-riemann.
//   node tools/smoke.mjs --route branches --script tests/interact/i2-decisions-everywhere-c.mjs --dark
// (one run: the script moves between the five stations itself; the header names a route for tools/interact-all.mjs)
// Steps: (1) A1 the chips on every card and as the function changes, (2) A2 the glyph beside f′(z₀) and A, (3) A3 each station opened by a
// StationRequest, the note, a bad request, reduced motion, (4) the video host, (5) layout and ids after all of it.
// Design: docs/designs/iter-2/i2-decisions-everywhere-c.md, section 7 and Appendix C.

import { settle, clickChip, readText, setSlider, dragHandle } from './_helpers.mjs';
import { problemById } from '../../js/data/problems.js';
import { namesMeaning, addressMeaning } from '../../js/core/decisions.js';
import { compile } from '../../js/core/parse.js';

const PI = Math.PI;

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---- helpers
  const ready = (route) => page.waitForFunction((r) => { const v = document.getElementById('view'); return !!v && v.dataset.route === r && v.dataset.state === 'ready'; }, route, { timeout: 15000 });
  const go = async (route) => { await ev((r) => window.__mv.app.navigate(r), route); await ready(route); await settle(page, 3); };
  const open = async (station, problem, values) => {
    await ev(({ station, problem, values }) => { window.__mv.app.request({ station, problem, family: problem, values }); window.__mv.app.navigate(station); }, { station, problem, values });
    await ready(station);
    await settle(page, 3);
  };
  const text = (sel) => readText(page, sel);
  const attr = (sel, name) => ev(({ sel, name }) => { const e = document.querySelector(sel); return e ? e.getAttribute(name) : null; }, { sel, name });
  const count = (sel) => ev((s) => document.querySelectorAll(s).length, sel);
  const hidden = (sel) => ev((s) => { const e = document.querySelector(s); return !e || e.hidden || e.hasAttribute('hidden') || e.getBoundingClientRect().width === 0 || getComputedStyle(e).display === 'none'; }, sel);
  const chipsOf = (station) => ev((s) => {
    const a = document.getElementById(s + '-problem-address'), n = document.getElementById(s + '-problem-names');
    return { address: a ? a.dataset.value : null, names: n ? n.dataset.value : null, host: !!(a && a.closest('#' + s + '-problem-decisions')), cardHidden: !!(document.getElementById(s + '-problem') || { hidden: true }).hidden };
  }, station);
  const noOverflow = async (tag) => assert((await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, `${tag}: no horizontal page scroll`);
  const noDupIds = async (tag) => {
    const dup = await ev(() => { const seen = new Map(); for (const e of document.querySelectorAll('[id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `${tag}: duplicate ids ${dup.join(', ')}`);
  };
  const glyphOf = (id, readoutId) => ev(({ id, readoutId }) => {
    const g = document.getElementById(id), r = document.getElementById(readoutId);
    if (!g) return null;
    const box = g.getBoundingClientRect();
    return { label: g.getAttribute('aria-label'), hasHidden: g.hasAttribute('hidden'), shown: box.width > 0 && box.height > 0, tag: g.tagName.toLowerCase(), sibling: g.parentElement === r.parentElement, inside: r.contains(g), r: g.dataset.r, theta: g.dataset.theta, focusable: g.getAttribute('focusable') };
  }, { id, readoutId });

  // ================================================================ (1) A1: the chips
  const CARDS = [['problem-2-4-1', 'branches', '2.4.1'], ['problem-2-5-1', 'reciprocal', '2.5.1'], ['problem-2-3-1', 'limits', '2.3.1'],
    ['problem-3-1-2', 'derivative', '3.1.2'], ['problem-3-2-1', 'cauchy-riemann', '3.2.1']];
  for (const [route, station, pid] of CARDS) {
    await go(route);
    const p = problemById(pid);                                    // the table is read from the data, not trusted
    const c = await chipsOf(station);
    assert(c.address === p.address && c.names === p.names && c.host, `A1 ${route}: chips ${JSON.stringify(c)} vs ${p.address}/${p.names}`);
    assert((await text(`#${station}-problem-address`)).length > 0 && (await text(`#${station}-problem-names`)) === `names: ${p.names}`, `A1 ${route}: the names chip reads "names: ${p.names}"`);
    assert((await attr(`#${station}-problem-names`, 'aria-expanded')) === 'false' && await hidden(`#${station}-problem-meaning`), `A1 ${route}: the meaning starts closed`);
    await clickChip(page, `${station}-problem-names`);
    assert((await text(`#${station}-problem-meaning`)) === namesMeaning(p.names) && !(await hidden(`#${station}-problem-meaning`)), `A1 ${route}: tapping the names chip shows its meaning`);
    assert((await attr(`#${station}-problem-names`, 'aria-expanded')) === 'true', `A1 ${route}: aria-expanded follows the tap`);
    await clickChip(page, `${station}-problem-address`);
    assert((await text(`#${station}-problem-meaning`)) === addressMeaning(p.address), `A1 ${route}: the address chip switches the meaning`);
    await clickChip(page, `${station}-problem-address`);
    assert(await hidden(`#${station}-problem-meaning`), `A1 ${route}: a second tap closes it`);
    assert((await text(`#${station}-problem-note`)).indexOf('Fresh numbers') < 0, `A1 ${route}: no fresh-numbers note without a request`);
    await noOverflow(`A1 ${route}`);
  }
  log('A1: both chips on all five cards, with their meanings');

  // the chips follow the active problem
  await go('problem-2-3-1');
  await clickChip(page, 'limits-fn-x-over-z');
  let c = await chipsOf('limits');
  assert(c.address === problemById('P5').address && c.names === problemById('P5').names && (await text('#limits-problem')).includes('Problem P5'), `A1 limits: P5 chips ${JSON.stringify(c)}`);
  await clickChip(page, 'limits-fn-dir');
  assert((await text('#limits-problem')).includes('Problem 2.3.1'), 'A1 limits: back to 2.3.1');
  await go('problem-3-1-2');
  for (const [chip, pid] of [['sq-plus-z', '3.1.1'], ['re', 'P6'], ['abs2', '3.1.2']]) {
    await clickChip(page, `derivative-fn-${chip}`);
    c = await chipsOf('derivative');
    const p = problemById(pid);
    assert(c.address === p.address && c.names === p.names, `A1 derivative ${chip}: chips ${JSON.stringify(c)} vs ${pid} ${p.address}/${p.names}`);
    assert((await text('#derivative-problem')).includes('Problem ' + pid), `A1 derivative ${chip}: the card is ${pid}`);
  }
  assert(problemById('3.1.1').address === 'C' && problemById('3.1.1').names === 'none', 'A1: 3.1.1 is C / none, as the goal says');
  await clickChip(page, 'derivative-fn-cube');
  assert((await hidden('#derivative-problem')) && (await count('#derivative-problem-address')) === 0, 'A1 derivative: no problem for z³, so no card and no chips');
  await go('problem-3-2-1');
  await clickChip(page, 'cauchy-riemann-fn-const-u');
  c = await chipsOf('cauchy-riemann');
  assert(c.address === problemById('P7').address && c.names === problemById('P7').names && (await text('#cauchy-riemann-problem')).includes('Problem P7'), `A1 cauchy-riemann: P7 chips ${JSON.stringify(c)}`);
  await clickChip(page, 'cauchy-riemann-fn-conj');
  assert((await hidden('#cauchy-riemann-problem')) && (await count('#cauchy-riemann-problem-address')) === 0, 'A1 cauchy-riemann: no card for conj z');
  log('A1: the chips follow the problem as the function changes; no card, no chips when there is no problem');

  // ================================================================ (2) A2: the glyph
  await go('problem-3-1-1');
  let g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g && g.label === 'move: turn 33.7°, stretch 3.606' && g.tag === 'svg' && g.shown && !g.hasHidden, `A2 derivative 3.1.1: ${JSON.stringify(g)}`);
  assert(g.sibling && !g.inside, 'A2 derivative: the glyph is a sibling of the readout, never inside it');
  assert(g.r === '3.606' && g.theta === '0.588' && g.focusable === 'false', `A2 derivative: data-r and data-theta ${JSON.stringify(g)}`);
  assert((await text('#derivative-readout')) === 'z₀ = 1 + i; A = 3 + 2i; |B| = 0.000; f′(z₀) = 3 + 2i', `A2 derivative: the readout is iteration 1's: "${await text('#derivative-readout')}"`);
  assert((await text('#derivative-glyph-text')) === 'As a move: turn Arg f′(z₀) = 0.588 rad (33.7°), stretch |f′(z₀)| = 3.606.', `A2 derivative: the caption "${await text('#derivative-glyph-text')}"`);
  await ctx.shot('derivative-3-1-1-glyph');
  await dragHandle(page, 'derivative-zplane-z0', { re: 2, im: 0 });
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.label === 'move: turn 0°, stretch 5' && (await text('#derivative-readout')).startsWith('z₀ = 2; A = 5;'), `A2 derivative: dragging z₀ to 2 moves the glyph: ${g.label} / ${await text('#derivative-readout')}`);
  await go('problem-P6');
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.hasHidden && !g.shown, `A2 derivative P6: the glyph is hidden (${JSON.stringify(g)})`);
  assert((await text('#derivative-glyph-text')) === 'No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.', 'A2 derivative P6: the caption says why');
  await clickChip(page, 'derivative-fn-sq-plus-z');
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.label === 'move: turn -41.2°, stretch 2.126' && g.shown && !g.hasHidden, `A2 derivative: z² + z at 0.3 - 0.7i: ${JSON.stringify(g)}`);
  await go('problem-3-1-2');
  assert((await glyphOf('derivative-glyph', 'derivative-readout')).hasHidden, 'A2 derivative 3.1.2: no f′ at 1 + i');
  await clickChip(page, 'derivative-z0-origin');
  g = await glyphOf('derivative-glyph', 'derivative-readout');
  assert(g.label === 'no move: 0' && g.shown && (await text('#derivative-readout')) === 'z₀ = 0; A = 0; |B| = 0.000; f′(z₀) = 0', `A2 derivative: |z|² at 0 is the zero move ${JSON.stringify(g)}`);
  assert((await text('#derivative-glyph-text')).startsWith('f′(z₀) = 0: the zero move.'), 'A2 derivative: the zero caption');
  await clickChip(page, 'derivative-fn-recip');
  assert((await glyphOf('derivative-glyph', 'derivative-readout')).hasHidden && (await text('#derivative-glyph-text')) === 'f is undefined at z₀, so there is no move to show.', 'A2 derivative: 1/z at 0 is undefined');
  await noOverflow('A2 derivative');

  await go('problem-3-2-1');
  g = await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout');
  assert(g && g.label === 'move: turn 45.8°, stretch 1.649' && g.shown && g.sibling && !g.inside, `A2 cauchy-riemann 3.2.1: ${JSON.stringify(g)}`);
  assert((await text('#cauchy-riemann-readout')) === 'A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)', `A2 cauchy-riemann: iteration 1's readout "${await text('#cauchy-riemann-readout')}"`);
  await ctx.shot('cauchy-riemann-3-2-1-glyph');
  await clickChip(page, 'cauchy-riemann-fn-conj');
  g = await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout');
  assert(g.label === 'no move: 0' && (await text('#cauchy-riemann-readout')) === 'A = 0; |B| = 1.000; CR holds: no; f′ does not exist here', `A2 cauchy-riemann: conj z is a pure mirror, A = 0: ${g.label}`);
  await clickChip(page, 'cauchy-riemann-fn-abs2');
  assert((await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout')).label === 'move: turn -58°, stretch 0.943', 'A2 cauchy-riemann: |z|² at 0.5 + 0.8i has A = 0.5 - 0.8i');
  await clickChip(page, 'cauchy-riemann-fn-exp');
  assert((await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout')).label === 'move: turn 45.8°, stretch 1.649', 'A2 cauchy-riemann: back on e^z');
  await noOverflow('A2 cauchy-riemann');
  log('A2: the glyph beside f′(z₀) and A, with the iteration-1 readouts unchanged');

  // ================================================================ (3) A3: fresh numbers
  const FRESH = 'Fresh numbers';
  const joined = async (sel, tag) => assert(!/[^.!?] Now on the page/.test(await text(sel)), `${tag}: the handout's answer and "Now on the page" are two sentences`);
  // ---- branches
  await open('branches', '2.4.1', { n: 2, seam: PI / 2, walk: null });
  assert((await text('#branches-readout')) === 'seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2', `A3 branches: "${await text('#branches-readout')}"`);
  assert((await text('#branches-readout')).includes('seam = π/2') && (await ev(() => document.getElementById('branches-n').value)) === '2', 'A3 branches: n and seam are the request\'s');
  assert((await text('#branches-problem-note')).includes(FRESH) && (await text('#branches-problem-note')).includes('Now on the page: the square root, with its seam at π/2'), `A3 branches: the card says so: "${await text('#branches-problem-note')}"`);
  assert(!(await hidden('#branches-fresh')) && (await text('#branches-fresh')).startsWith('Fresh numbers from the Rehearsal Room.'), 'A3 branches: the banner under the header');
  await joined('#branches-problem-note', 'A3 branches');
  assert((await ev(() => [...document.querySelectorAll('#branches-problem .callout')].filter((b) => b.offsetParent !== null).length)) === 0, 'A3 branches: no callout is visible in the problem card before the answer (iteration 1 pins it)');
  assert((await attr('#branches-problem-chips a[aria-current="true"], .station-header a[aria-current="true"]', 'href')) === '#problem-2-4-1', 'A3 branches: the header marks 2.4.1');
  await dragHandle(page, 'branches-zplane-z', { re: 1, im: 1 });
  assert((await text('#branches-problem-note')).includes(FRESH), 'A3 branches: dragging z leaves the note');
  await setSlider(page, 'branches-seam', 0);
  assert((await hidden('#branches-problem-note')) && (await hidden('#branches-fresh')), 'A3 branches: moving the seam ends "fresh"');
  await noOverflow('A3 branches');
  await open('branches', '2.4.1', { n: 3, seam: 0, walk: 'along' });
  await page.waitForFunction(() => document.getElementById('branches-walk-status').dataset.state === 'continuous', null, { timeout: 6000 });
  assert((await text('#branches-walk-status')).startsWith('continuous') && (await ev(() => window.__mv.branches.state().walk.kind)) === 'along', 'A3 branches: the requested walk ran, and is continuous with the seam at 0');
  await open('branches', '2.4.1', { n: 3, seam: -PI, walk: 'across' });
  await page.waitForFunction(() => document.getElementById('branches-walk-status').dataset.state === 'jumps', null, { timeout: 6000 });
  assert((await text('#branches-walk-status')) === 'jumps at the negative real axis', 'A3 branches: across the principal seam it jumps');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open('branches', '2.4.1', { n: 3, seam: -PI, walk: 'across' });
  assert((await text('#branches-walk-status')) === 'jumps at the negative real axis', 'A3 branches, reduced motion: the walk is at its end at once');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open('branches', '2.4.1', { n: 9, seam: 'x', walk: 'sideways' });
  assert((await text('#branches-readout')).startsWith('seam = -π; window (-π, π]; z = -1 + 0.5i') && (await hidden('#branches-fresh')) && (await hidden('#branches-problem-note')), 'A3 branches: a malformed request leaves the default, silently');

  // ---- reciprocal
  await open('reciprocal', '2.5.1', { shape: { kind: 'circle', center: { re: 0, im: 1 }, r: 1 } });
  assert((await text('#reciprocal-readout')) === 'shape: circle |z - i| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; |1/p| = 0.5', `A3 reciprocal: "${await text('#reciprocal-readout')}"`);
  assert((await text('#reciprocal-problem-note')).includes(FRESH) && (await text('#reciprocal-problem-note')).includes('Now on the page: circle |z - i| = 1.'), 'A3 reciprocal: the card says so');
  assert(!(await hidden('#reciprocal-fresh')) && (await chipsOf('reciprocal')).address === 'P', 'A3 reciprocal: banner and chips');
  await joined('#reciprocal-problem-note', 'A3 reciprocal');
  await clickChip(page, 'reciprocal-preset-circle1');
  assert((await text('#reciprocal-problem-note')) === 'This is problem 2.5.1 exactly.' && (await hidden('#reciprocal-fresh')), 'A3 reciprocal: the handout shape ends "fresh"; iteration 1\'s sentence returns');
  await open('reciprocal', '2.5.1', { shape: { kind: 'line', a: { re: 2, im: 0 }, b: { re: 2, im: 1 } } });
  assert((await text('#reciprocal-readout')) === 'shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; |1/p| = 0.447', `A3 reciprocal line: "${await text('#reciprocal-readout')}"`);
  await open('reciprocal', '2.5.1', { shape: { kind: 'circle', center: { re: 2, im: 0 }, r: 2 } });
  assert((await text('#reciprocal-readout')) === 'shape: circle |z - 2| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; |1/p| = 0.354', `A3 reciprocal circle 2: "${await text('#reciprocal-readout')}"`);
  const edge = await ev(() => { const pl = window.__mv.planes.get('reciprocal-zplane'), s = pl.getSize(), a = pl.toPixel({ re: 4, im: 0 }), b = pl.toPixel({ re: 0, im: 0 }); return { w: s.w, ax: a.x, bx: b.x }; });
  assert(edge.ax > 0 && edge.ax < edge.w && edge.bx > 0 && edge.bx < edge.w, `A3 reciprocal: the circle |z - 2| = 2 (x from 0 to 4) fits the plane: ${JSON.stringify(edge)}`);
  await open('reciprocal', '2.5.1', { shape: { kind: 'circle', center: { re: 9, im: 9 }, r: 50 } });
  assert((await text('#reciprocal-readout')).startsWith('shape: circle |z - 1| = 1; image: line Re w = 0.5;') && (await hidden('#reciprocal-fresh')), 'A3 reciprocal: a malformed request leaves the default');
  await noOverflow('A3 reciprocal');

  // ---- limits
  await open('limits', '2.3.1', { fn: 'dir', path: 'line', m: 2 });
  assert((await text('#limits-readout')) === 'path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no', `A3 limits: "${await text('#limits-readout')}"`);
  assert((await attr('#limits-path-line', 'aria-pressed')) === 'true' && Number(await ev(() => document.getElementById('limits-m').value)) === 2, 'A3 limits: the line y = 2x is selected');
  assert((await text('#limits-problem-note')).includes(FRESH) && (await text('#limits-problem-note')).includes('Now on the page: g = z²/|z|², way in: y = 2x.'), `A3 limits: the card says so: "${await text('#limits-problem-note')}"`);
  await joined('#limits-problem-note', 'A3 limits');
  await clickChip(page, 'limits-path-vertical');
  assert(await hidden('#limits-problem-note'), 'A3 limits: another way in ends "fresh"');
  await clickChip(page, 'limits-path-line');
  assert((await text('#limits-problem-note')).includes(FRESH), 'A3 limits: the line y = 2x again (the slope is still 2): the request\'s numbers are on the page again');
  await setSlider(page, 'limits-m', 1);
  assert(await hidden('#limits-problem-note'), 'A3 limits: another slope ends "fresh"');
  await open('limits', 'P5', { fn: 'x-over-z', path: 'vertical' });
  assert((await text('#limits-readout')).startsWith('path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5;'), `A3 limits P5: "${await text('#limits-readout')}"`);
  c = await chipsOf('limits');
  assert(c.address === problemById('P5').address && (await text('#limits-problem-note')).includes(FRESH), 'A3 limits P5: card, chips and note');
  await open('limits', '2.3.1', { fn: 'dir', path: 'parabola' });
  assert((await text('#limits-readout')).includes('limit along this path: 1;'), 'A3 limits: along y = x² the value tends to 1');
  await open('limits', '2.3.1', { fn: 'dir', path: 'cubic' });
  assert((await attr('#limits-path-parabola', 'aria-pressed')) === 'true' && (await text('#limits-problem-note')).includes('way in: y = x²'), 'A3 limits: a path the station cannot draw is dropped, and the note says what is on the page');
  await noOverflow('A3 limits');

  // ---- derivative
  await open('derivative', '3.1.1', { fn: { src: '2z^2 - 3z + 1' }, z0: { re: 1, im: 1 } });
  assert((await text('#derivative-readout')) === 'z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i', `A3 derivative: "${await text('#derivative-readout')}"`);
  assert((await attr('#derivative-fn-custom', 'aria-pressed')) === 'true' && (await ev(() => window.__mv.derivative.state().fnId)) === 'custom', 'A3 derivative: the custom chip is pressed');
  assert((await glyphOf('derivative-glyph', 'derivative-readout')).label === 'move: turn 76°, stretch 4.123', 'A3 derivative: f′(1 + i) = 1 + 4i as a move');
  assert((await text('#derivative-problem-note')).includes(FRESH) && (await text('#derivative-problem-note')).includes('f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.'), `A3 derivative: the card says so: "${await text('#derivative-problem-note')}"`);
  c = await chipsOf('derivative');
  assert(c.address === 'C' && c.names === 'none' && (await text('#derivative-problem')).includes('Problem 3.1.1'), 'A3 derivative: 3.1.1 chips');
  await joined('#derivative-problem-note', 'A3 derivative');
  assert(!(await hidden('#derivative-custom-note')) && (await text('#derivative-custom-note')).startsWith('Custom function from the Rehearsal Room:') && await hidden('#derivative-custom-error'), 'A3 derivative: the custom note, no error');
  await ctx.shot('derivative-custom');
  await clickChip(page, 'derivative-fn-abs2');
  assert((await hidden('#derivative-problem-note')) && (await text('#derivative-problem')).includes('Problem 3.1.2'), 'A3 derivative: another function ends "fresh"');
  await clickChip(page, 'derivative-fn-custom');
  assert((await text('#derivative-problem-note')).includes(FRESH) && (await text('#derivative-problem')).includes('Problem 3.1.1'), 'A3 derivative: the custom chip brings the card and the note back');
  await open('derivative', '3.1.2', { fn: 'abs2', z0: { re: 1, im: 1 } });
  assert((await text('#derivative-readout')) === 'z₀ = 1 + i; A = 1 - i; |B| = 1.414; f′(z₀) does not exist (circle radius 1.414)' && (await count('#derivative-fn-custom')) === 0 && (await glyphOf('derivative-glyph', 'derivative-readout')).hasHidden, 'A3 derivative: a chip id selects its chip; no custom chip; no f′, no glyph');
  let parserMessage = null;
  try { compile('2z +'); } catch (e) { parserMessage = e.message; }
  await open('derivative', '3.1.1', { fn: { src: '2z +' }, z0: { re: 1, im: 1 } });
  assert(!(await hidden('#derivative-custom-error')) && (await text('#derivative-custom-error')).includes(parserMessage), `A3 derivative: a bad source shows the parser's sentence verbatim ("${parserMessage}")`);
  assert((await ev(() => window.__mv.derivative.state().fnId)) === 'sq-plus-z' && (await count('#derivative-fn-custom')) === 0, 'A3 derivative: a bad source leaves the default function');
  await open('derivative', '3.1.1', { fn: 'sq-plus-z', z0: { re: 4, im: 3 } });
  const seen = await ev(() => { const pl = window.__mv.planes.get('derivative-zplane'), s = pl.getSize(), p = pl.toPixel({ re: 4, im: 3 }); return { w: s.w, h: s.h, x: p.x, y: p.y }; });
  assert(seen.x > 0 && seen.x < seen.w && seen.y > 0 && seen.y < seen.h, `A3 derivative: a requested z₀ outside the opening view is panned into it ${JSON.stringify(seen)}`);
  await open('derivative', '3.1.1', { z0: 'x', fn: 7 });                     // the malformed request of the goal text, for a station of this goal
  assert((await ev(() => window.__mv.derivative.state().fnId)) === 'sq-plus-z' && (await text('#derivative-readout')).startsWith('z₀ = 1 + i;') && (await hidden('#derivative-problem-note')) && (await hidden('#derivative-custom-error')), 'A3 derivative: a malformed request leaves the default, silently');
  await noOverflow('A3 derivative');

  // ---- cauchy-riemann
  await open('cauchy-riemann', '3.2.1', { fn: { src: 'exp(-z)' }, z0: { re: 0, im: 0 } });
  const crRead = await text('#cauchy-riemann-readout');
  assert(crRead.includes('CR holds: yes') && crRead.includes('f′(z₀) = -1'), `A3 cauchy-riemann: "${crRead}"`);
  assert((await glyphOf('cauchy-riemann-glyph', 'cauchy-riemann-readout')).label === 'move: turn 180°, stretch 1', 'A3 cauchy-riemann: f′(0) = -1 is a half turn');
  assert((await attr('#cauchy-riemann-fn-custom', 'aria-pressed')) === 'true' && (await text('#cauchy-riemann-problem-note')).includes(FRESH) && (await text('#cauchy-riemann-problem-note')).includes('f(z) = exp(-z), at z₀ = 0.'), `A3 cauchy-riemann: chip and note "${await text('#cauchy-riemann-problem-note')}"`);
  c = await chipsOf('cauchy-riemann');
  assert(c.address === 'C' && c.names === 'none', 'A3 cauchy-riemann: 3.2.1 chips');
  await joined('#cauchy-riemann-problem-note', 'A3 cauchy-riemann');
  assert((await text('#cauchy-riemann-custom-check')).startsWith('CR holds at z₀ and at all 25 points of the grid') && (await text('#cauchy-riemann-fn-note')).startsWith('Custom function from the Rehearsal Room:'), 'A3 cauchy-riemann: the 25-point check and the function note');
  assert((await text('#cauchy-riemann-verdict')).length > 0, 'A3 cauchy-riemann: the iteration-1 verdict is still written');
  await ctx.shot('cauchy-riemann-custom');
  await clickChip(page, 'cauchy-riemann-fn-conj');
  assert((await hidden('#cauchy-riemann-problem')) && (await hidden('#cauchy-riemann-custom-check')), 'A3 cauchy-riemann: another function: no card, no custom check');
  await clickChip(page, 'cauchy-riemann-fn-custom');
  assert(!(await hidden('#cauchy-riemann-problem')) && (await text('#cauchy-riemann-problem-note')).includes(FRESH), 'A3 cauchy-riemann: the custom chip brings the card back');
  await open('cauchy-riemann', '3.2.1', { fn: { src: 'conj(z)' }, z0: { re: 0.5, im: 0.8 } });
  assert((await text('#cauchy-riemann-readout')) === 'A = 0; |B| = 1.000; CR holds: no; f′ does not exist here' && (await text('#cauchy-riemann-custom-check')).startsWith('CR fails at z₀ (u_x = 1 but v_y = -1)'), 'A3 cauchy-riemann: conj z fails, and says where');
  await open('cauchy-riemann', 'P7', { fn: { src: '3' }, z0: { re: 0.5, im: 0.8 } });
  assert((await text('#cauchy-riemann-custom-check')).includes('f is constant') && (await text('#cauchy-riemann-problem')).includes('Problem P7') && (await chipsOf('cauchy-riemann')).names === 'none', 'A3 cauchy-riemann: P7 with a constant function: f′ = 0 everywhere, f is constant');
  await open('cauchy-riemann', '3.2.1', { fn: { src: 'z^' }, z0: { re: 0.5, im: 0.8 } });
  assert(!(await hidden('#cauchy-riemann-custom-error')) && (await text('#cauchy-riemann-custom-error')).includes('Something is missing after "^"') && (await text('#cauchy-riemann-fn-exp')).length > 0 && (await attr('#cauchy-riemann-fn-exp', 'aria-pressed')) === 'true', 'A3 cauchy-riemann: a bad source: the parser\'s sentence, and e^z stays');
  await open('cauchy-riemann', '3.2.1', { fn: 'cube', z0: { re: 3, im: 0 } });
  assert((await attr('#cauchy-riemann-fn-custom', 'aria-pressed')) === 'true' && (await ev(() => window.__mv.cauchyRiemann.state().z0.re)) === 0.5, 'A3 cauchy-riemann: z³ opens as a custom function; z₀ outside the z-plane is dropped');
  await noOverflow('A3 cauchy-riemann');
  log('A3: every station opens with the request\'s numbers, says so, and survives a bad request');

  // ================================================================ (4) the video host of derivative
  await go('derivative');
  const manifest = await import('../../media/manifest.js').catch(() => ({ VIDEOS: [] }));
  const listed = (manifest.VIDEOS || []).some((v) => v.id === 'zoom-cr');
  const place = await ev(() => {
    const host = document.getElementById('derivative-video-host'), lower = document.querySelector('#station-derivative .ld-lower'), dc = document.getElementById('derivative-dchost');
    const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { host: !!host, hidden: host.hidden, children: host.children.length, afterDc: after(dc, host), beforeReadout: after(host, document.getElementById('derivative-readout-row')), prevIsLower: host.previousElementSibling === lower };
  });
  assert(place.host && place.afterDc && place.beforeReadout && place.prevIsLower, `(4) derivative: the video host follows the row of the third plane: ${JSON.stringify(place)}`);
  assert(place.hidden === !listed && place.children === (listed ? 1 : 0), `(4) derivative: the host is ${listed ? 'filled' : 'hidden and empty'} for this manifest: ${JSON.stringify(place)}`);
  const demo = await ev(async () => {
    const L = await import('./js/core/listen.js');
    const M = { VIDEOS: [{ id: 'zoom-cr', title: 'T', summary: 'S', station: 'derivative', src: 'data:video/mp4;base64,AAAA', captions: null, seconds: 150, narrated: false, music: false }], SITE_AUDIO: {} };
    const host = document.getElementById('derivative-video-host');
    const had = host.children.length;
    const p = await L.videoPanel(host, 'zoom-cr', { manifest: M });
    const dc = document.getElementById('derivative-dchost');
    const out = { id: p && p.id, after: !!(dc.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING), had };
    if (had === 0 && p) p.remove();
    return out;
  });
  assert(demo.id === 'video-zoom-cr' && demo.after, `(4) a panel put into the host sits after the planes: ${JSON.stringify(demo)}`);
  await noOverflow('(4) derivative');

  // ================================================================ (5) ids and layout after all of it
  for (const station of ['branches', 'reciprocal', 'limits', 'derivative', 'cauchy-riemann']) {
    await go(station);
    await noDupIds(`(5) ${station}`);
    const loose = await ev(() => [...document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view summary')].filter((e) => !e.id).map((e) => e.tagName.toLowerCase()));
    assert(loose.length === 0, `(5) ${station}: controls without an id: ${loose.join(',')}`);
    await noOverflow(`(5) ${station}`);
  }
  if (phone) await ctx.shot('phone-cauchy-riemann');
  log('(4) the video host, (5) ids and layout');
}
```

## Appendix D. What was run, and the results

All in a scratch copy of the repo at `/tmp/claude-0/-home-user-math-viz/9820ea62-47b0-598f-94da-65a18bf10ac9/scratchpad/dec-c-3a91/repo` (the working tree at the start of wave 1 with Appendix A applied, plus Appendices B and C); the pristine station files are in `.../dec-c-3a91/orig/`; the patch is `.../dec-c-3a91/station-patch.diff`.
The real repo was not written except this file.

| command | result |
|---|---|
| `node --test tests/unit/i2-decisions-everywhere-c.test.mjs` | 24 tests, 24 pass |
| `node --test tests/unit/*.test.mjs` | 882 tests, 874 pass, 8 fail: the same 8 that fail on the pristine files (7.6) |
| `node tools/smoke.mjs --route branches --script tests/interact/i2-decisions-everywhere-c.mjs --dark --no-shots` | `3/3 checks passed` (desktop, phone, desktop-dark) |
| `node tools/interact-all.mjs i1-station-branches i1-station-limits i1-station-mappings i1-station-powermap i2-decisions-everywhere-c` | `i1-station-branches-graph4d 9/9`, `i1-station-mappings-cr 15/15`, `i1-station-limits-derivative 21/21`, `i1-station-powermap-reciprocal 9/9`, `i2-decisions-everywhere-c 3/3`; `5/5 interaction scripts passed` |
| `i1-integration` steps I4 to I8 (a trimmed copy of the script with I1 to I3 removed, and a one-function stub `rehearse.js`, both deleted afterwards) | `i1-integration: all steps passed`, desktop and phone |
| `node tools/smoke.mjs --dark --no-shots --route <29 problem routes + branches,reciprocal,limits,derivative,cauchy-riemann>` | `102/102 checks passed across 34 route(s)` |
| every request the generators make for the nine problems (400 seeds each, 3600 requests) through `valuesOf` and the station's `...FromValues` | all applied, none with an `error`; the only requests that do not apply are the 50 P5 cards with `values: null` (a cubic way in), which are not sent |
| `git apply --check` of the patch against the real working tree | clean |

Counts that the script and tests depend on, from the generators: branches requests are `{ n: 2 or 3, seam: 0 (with walk 'along'), -π/2 or π/2 }`; reciprocal circles have centres −1, 2, i, −i, 1 + i with radius |centre|, or the line x = c; limits `fn` is `dir` or `x-over-z` with a line (m in ±1, ±2, ½), `x = 0` or `y = x²`;
derivative sources are polynomials `±k z^2 ± m z ± n`, the twelve k|z − a|² and z Re z, z Im z functions, and the nine P6 functions (`conj` is sent as the chip id `conj`); cauchy-riemann sources are `exp(2*z)`, `z^2`, `z^3`, `abs(z)^2`, `exp(-z)`, `conj(exp(z))`, `conj(z)`, `conj(z^2)`, and for P7 the constants `1` to `5` and `1i` to `5i` with signs.

## Appendix E. Build notes (builder, stage 3)

Appendix A applied to the working tree with `git apply` (clean; the five station files were unmodified), Appendices B and C copied to `tests/unit/i2-decisions-everywhere-c.test.mjs` and `tests/interact/i2-decisions-everywhere-c.mjs`. One deviation, D18 (section 0.3): two lines in the values branches of `derivative.js` and `cauchy-riemann.js`
(`const vals = valuesOf(...)` kept so the branch can ask whether the request carried a function, and `vals.fn && !fv.error` in front of the `freshNote` call), plus two assertions in the script (an unreadable function for 3.1.2 and for P7). The pure helpers, the unit tests and every expected value are as designed.

