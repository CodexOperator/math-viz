# Design: i2-decisions-everywhere-c (the two decisions, the move glyph and fresh numbers on branches, reciprocal, limits, derivative, cauchy-riemann)

Goal: `i2-decisions-everywhere-c` (iteration 2, wave 1, kind integration, size L). Designer: stage 2.
Owns: `js/stations/branches.js`, `js/stations/reciprocal.js`, `js/stations/limits.js`, `js/stations/derivative.js`, `js/stations/cauchy-riemann.js`.
Plus the two files named after the goal by the loop's convention (the kit's design did the same; neither exists yet and neither moves a pin):
`tests/interact/i2-decisions-everywhere-c.mjs` (the acceptance criteria name it) and `tests/unit/i2-decisions-everywhere-c.test.mjs` (the pure helpers).
Reads: `docs/ARCHITECTURE.md` 3.14, 4, 4.1, 9, 10, 11.1 to 11.4; `docs/STORY.md` sections 0, 1 (Thread 3), 3, 4; `docs/designs/iter-2/i2-decisions-kit.md`;
`js/core/decisions.js`, `moveglyph.js`, `station-kit.js`, `listen.js`; the five station files; `tests/interact/i1-station-*.mjs`, `tests/unit/i1-station-*.test.mjs`,
`tests/interact/i1-integration.mjs`, `tests/unit/i1-integration.test.mjs` for the pins named in section 0.2.

**How to use this document.** Sections 1 to 9 are the design. Appendix A holds the pure helpers in full (they were run in a scratch copy outside the repo against
the real modules; this design file is the only thing written in the repo). Appendix B is the unit test file, Appendix C the interaction script. The DOM edits are given
as exact edit lists in section 5, because the five files are iteration-1 code that must keep every id, readout string and hook. Where a sentence in sections 1 to 9
and the appendix code disagree, the sentence wins and the disagreement is a bug in the appendix.

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

### 0.4 Computed in the scratch run (everything quoted as a value below comes from here)

A scratch script outside the repo imported the real modules (`complex.js`, `parse.js`, the five stations' exported helpers, `station-kit.js`) and computed every readout,
glyph label, grid check and request outcome that sections 6 and 7 quote; Appendix A's helpers were run against the case table of Appendix B. The derivative generalisation
(D14) was run on a scratch copy of `derivative.js` with `compiledFn` patched as section 4.4 says: `microscope`, `buildReadout`, `verdictText`, `ringFit`, `derivativeRows`,
`ringImage` all run unchanged on a custom reference (`'2z^2 - 3z + 1'` at 1 + i reads `z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i`). The interaction script
(Appendix C) cannot run before the build; its expected strings are the ones computed here.

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

The fresh note is `freshNote(problem, preset) + ' ' + loaded`, where `loaded` is the sentence "Now on the page: ..." of the station. The banner (branches, reciprocal) is
`'Fresh numbers from the Rehearsal Room. ' + loaded + ' The handout problem is at the bottom of the page.'`

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
