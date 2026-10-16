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
| `loadedText(shape)` | `-> string` | `Now on the page: circle |z - i| = 1.` (`describeShape`) |

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
- Polar: window (π/2, 5π/2]; −i has θ = 3π/2 (it is 3π/2 − π/2 = π counterclockwise from the seam, the middle of the window). f = 1^{1/2} e^{i 3π/4} = cos 135° + i sin 135° = −0.707 + 0.707i. Check: (−0.707 + 0.707i)² = −2(0.707)² i = −i ✓. The principal square root of −i is 0.707 − 0.707i, the negative of this one: the two branches disagree here, and the seam is the reason.
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

Hand checks: the probe 2i lies on |z − i| = 1 (distance 1) and 1/p = −0.5i has Im = −0.5 ✓; (0.25 − 0.25i) has Re 0.25 ✓; for the line, |0.4 − 0.2i − 0.25| = √(0.15² + 0.2²) = √0.0625 = 0.25 ✓; for centre 1 + i: 0.1464 − (−0.3536) = 0.5 ✓.
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
- Polar: h̄/h = e^{−2iφ}: the quotient tends to z̄ + z e^{−2iφ}, the circle with centre z̄ = 1 − i and radius |z| = 1.414. φ = 0 gives (1 − i) + (1 + i) = 2 ✓; φ = π/2 gives (1 − i) − (1 + i) = −2i ✓. f′ exists only at z = 0, where it is 0 (centre 0, radius 0); nowhere analytic.
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

Check for Im z: A + B = 0 (real h: Im h = 0) and A − B = −i (imaginary h = iρ: ρ/(iρ) = −i) ✓. Every one of these has `|B| > 0`, so the glyph is hidden and the caption is the "No single move here" sentence.

### 6.8 Problem 3.2.1 (cauchy-riemann; Cartesian, names: none)

*Handout: f = e^x(cos y + i sin y) at z₀ = 0.5 + 0.8i.*
- Cartesian: u = e^x cos y, v = e^x sin y. u_x = e^x cos y = v_y; u_y = −e^x sin y = −v_x. Both hold everywhere, partials continuous: entire. f′ = u_x + i v_x = f(z). At 0.5 + 0.8i: e^{0.5} = 1.64872, cos 0.8 = 0.69671, sin 0.8 = 0.71736, so f′ = 1.149 + 1.183i.
- Polar (of the output): |f| = e^x, y is a name of arg f; log f = x + iy and CR for it is 1 = 1 and 0 = 0, so f′/f = 1.
- Move of A = f′: |A| = e^{0.5} = 1.649; Arg A = y = 0.8 rad = 45.8°. Glyph `move: turn 45.8°, stretch 1.649`. Readout `A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)`.

*Fresh examples (z₀ as the request says; 0.5 + 0.8i unless noted):*
- e^{−z} at z₀ = 0: u = e^{−x} cos y, v = −e^{−x} sin y. u_x = −e^{−x} cos y = v_y ✓; u_y = −e^{−x} sin y, v_x = e^{−x} sin y, so u_y = −v_x ✓. f′ = u_x + i v_x = −e^{−x} cos y + i e^{−x} sin y = −e^{−z}; at 0: −1. Polar: log f = −z, ln|f| = −x, V = −y: ∂(−x)/∂x = −1 = ∂(−y)/∂y ✓, so f′/f = −1. Move of −1: turn 180°, stretch 1: `move: turn 180°, stretch 1`. Readout `A = -1; |B| = 0.000; CR holds: yes; f′(z₀) = -1 (u_x + i v_x)`. The 25-point check holds: `CR holds at z₀ and at all 25 points of the grid x, y = -2 to 2, so f looks entire. ... f′(z₀) = -1.`
- z² at 0.5 + 0.8i: u = x² − y², v = 2xy: u_x = 2x = 1 = v_y ✓; u_y = −2y = −1.6 = −v_x ✓; f′ = 1 + 1.6i, |·| = √3.56 = 1.887, Arg = arctan 1.6 = 1.012 rad = 58.0°: `move: turn 58°, stretch 1.887`.
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
| derivative custom 2z² − 3z + 1 at 1 + i, readout and glyph | `z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i` and `move: turn 76°, stretch 4.123` |
| derivative 3.1.2 at 1 + i | `z₀ = 1 + i; A = 1 - i; |B| = 1.414; f′(z₀) does not exist (circle radius 1.414)`, glyph hidden |
| derivative 3.1.2 at 0 | `z₀ = 0; A = 0; |B| = 0.000; f′(z₀) = 0`, glyph `no move: 0` |
| derivative P6 | glyph hidden; caption `No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.` |
| cauchy-riemann 3.2.1 | glyph `move: turn 45.8°, stretch 1.649`; readout `A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)` |
| cauchy-riemann conj z | glyph `no move: 0`; readout `A = 0; |B| = 1.000; CR holds: no; f′ does not exist here` |
| cauchy-riemann \|z\|² | glyph `move: turn -58°, stretch 0.943` |
| cauchy-riemann custom exp(−z) at 0 | glyph `move: turn 180°, stretch 1`; `f′(z₀) = -1` |
| branches `{ n: 2, seam: π/2 }` | `seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2` |
| reciprocal circle centre i | `shape: circle |z - i| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; |1/p| = 0.5` |
| reciprocal line Re z = 2 | `shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; |1/p| = 0.447` |
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
| `problem-3-1-1` | `move: turn 33.7°, stretch 3.606`; `data-r` 3.606, `data-theta` 0.588 | `z₀ = 1 + i; A = 3 + 2i; |B| = 0.000; f′(z₀) = 3 + 2i` |
| the same, drag z₀ to 2 | `move: turn 0°, stretch 5` | starts `z₀ = 2; A = 5;` |
| `problem-P6` | hidden | caption `No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.` |
| P6, click `#derivative-fn-sq-plus-z` (z₀ = 0.3 − 0.7i) | `move: turn -41.2°, stretch 2.126` | |
| `problem-3-1-2` | hidden | |
| 3.1.2, click `#derivative-z0-origin` | `no move: 0`, shown | `z₀ = 0; A = 0; |B| = 0.000; f′(z₀) = 0`; caption starts `f′(z₀) = 0: the zero move.` |
| 3.1.2 at 0, click `#derivative-fn-recip` | hidden | caption `f is undefined at z₀, so there is no move to show.` |
| `problem-3-2-1` | `move: turn 45.8°, stretch 1.649` | `A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)` |
| click `#cauchy-riemann-fn-conj` | `no move: 0` | `A = 0; |B| = 1.000; CR holds: no; f′ does not exist here` |
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
| reciprocal | `2.5.1`, circle centre i, r 1 | readout `shape: circle |z - i| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; |1/p| = 0.5`; note has `Fresh numbers` and `Now on the page: circle |z - i| = 1.`; banner visible; chips `P`; the two sentences separate |
| reciprocal | click `#reciprocal-preset-circle1` | note is `This is problem 2.5.1 exactly.`; banner hidden |
| reciprocal | line Re z = 2 | readout `shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; |1/p| = 0.447` |
| reciprocal | circle centre 2, r 2 | readout `shape: circle |z - 2| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; |1/p| = 0.354`; the plane shows x from 0 to 4 (`toPixel` of 4 and of 0 are inside the plane) |
| reciprocal | circle centre (9, 9), r 50 | default readout `shape: circle |z - 1| = 1; image: line Re w = 0.5;`; banner hidden |
| limits | `2.3.1`, `{ fn: 'dir', path: 'line', m: 2 }` | readout `path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no`; `#limits-path-line` pressed; `#limits-m` is 2; note has `Now on the page: g = z²/|z|², way in: y = 2x.`; click `#limits-path-vertical` hides the note; click `#limits-path-line` shows it again (the slope is still 2); `setSlider('limits-m', 1)` hides it |
| limits | `P5`, `{ fn: 'x-over-z', path: 'vertical' }` | readout starts `path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5;`; chips `P`, `any`; note |
| limits | `2.3.1`, parabola | `limit along this path: 1;` |
| limits | `{ fn: 'dir', path: 'cubic' }` | `#limits-path-parabola` pressed; note says `way in: y = x²` (a path the station cannot draw is dropped, the note says what is on the page) |
| derivative | `3.1.1`, `{ fn: { src: '2z^2 - 3z + 1' }, z0: 1 + i }` | readout `z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i`; `#derivative-fn-custom` pressed, hook `fnId === 'custom'`; glyph `move: turn 76°, stretch 4.123`; note contains `Fresh numbers` and `f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.`; chips `C`, `none`, card says `Problem 3.1.1`; `#derivative-custom-note` starts `Custom function from the Rehearsal Room:`; `#derivative-custom-error` hidden; click `#derivative-fn-abs2` -> note hidden and card 3.1.2; click `#derivative-fn-custom` -> note and 3.1.1 return |
| derivative | `3.1.2`, `{ fn: 'abs2', z0: 1 + i }` | `z₀ = 1 + i; A = 1 - i; |B| = 1.414; f′(z₀) does not exist (circle radius 1.414)`; no `#derivative-fn-custom`; glyph hidden |
| derivative | `{ fn: { src: '2z +' }, z0: 1 + i }` | `#derivative-custom-error` visible and contains the parser's sentence exactly as `compile('2z +')` throws it (`The formula stops too early. Something is missing after "+".`); hook `fnId === 'sq-plus-z'`; no custom chip |
| derivative | `{ fn: 'sq-plus-z', z0: 4 + 3i }` | `toPixel(4 + 3i)` is inside the z-plane (the view was panned) |
| derivative | `{ z0: 'x', fn: 7 }` (the malformed request of the goal text, for a station of this goal) | default function and z₀ (`z₀ = 1 + i;`), note and error hidden, no `console.error` |
| cauchy-riemann | `3.2.1`, `{ fn: { src: 'exp(-z)' }, z0: 0 }` | readout contains `CR holds: yes` and `f′(z₀) = -1`; glyph `move: turn 180°, stretch 1`; `#cauchy-riemann-fn-custom` pressed; note contains `Fresh numbers` and `f(z) = exp(-z), at z₀ = 0.`; chips `C`, `none`; `#cauchy-riemann-custom-check` starts `CR holds at z₀ and at all 25 points of the grid`; `#cauchy-riemann-fn-note` starts `Custom function from the Rehearsal Room:`; `#cauchy-riemann-verdict` still written; click `#cauchy-riemann-fn-conj` -> card and check hidden; click `#cauchy-riemann-fn-custom` -> card returns |
| cauchy-riemann | `{ fn: { src: 'conj(z)' }, z0: 0.5 + 0.8i }` | `A = 0; |B| = 1.000; CR holds: no; f′ does not exist here`; check starts `CR fails at z₀ (u_x = 1 but v_y = -1)` |
| cauchy-riemann | `P7`, `{ fn: { src: '3' }, ... }` | check contains `f is constant`; card says `Problem P7`; names `none` |
| cauchy-riemann | `{ fn: { src: 'z^' } }` | `#cauchy-riemann-custom-error` visible with `Something is missing after "^"`; `#cauchy-riemann-fn-exp` pressed |
| cauchy-riemann | `{ fn: 'cube', z0: 3 }` | `#cauchy-riemann-fn-custom` pressed (z³ opens as custom); z₀ stays 0.5 (3 is outside the z-plane) |

A malformed request is sent to `derivative` and `reciprocal` (D5): `roots` belongs to another goal.

### 7.5 A4, A5, A6

**A4.** The i1 scripts and units above must pass with no edit. Within this goal's five stations the pins are those of section 0.2; the unit tests S6 and S7 re-check the source-level ones (no hex, `rgb(`, only `.style.aspectRatio` in reciprocal, `releaseStationStyle();` last, the `prose(verdictEl, ...)` line, `CR_FN_IDS`). `i1-integration` includes the Rehearsal Room (`js/stations/rehearse.js`, another wave-1 goal); until that file exists the script stops at I1.
In the scratch run (with a stub `rehearse.js`, not part of this design), the steps I4 to I8 of `i1-integration` (all 29 deep links, every in-page link, readout style, ids on every control, no duplicate ids) were run on both viewports with the patch applied: `i1-integration: all steps passed`, desktop and phone. I1 to I3 only walk the menu and the thread links and do not look at the five stations' content.

**A5.** The smoke command of 7.1. The scratch run: 34 routes (29 problem routes and 5 station routes) on desktop, phone and dark desktop, zero problems.

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

In the scratch copy, which has no `rehearse.js` and no `videos/`, 9 of 882 unit tests fail: the registry/menu tests that count 21 stations and open `rehearse` (`I1 the registry`, `U3`, `U4`, `U5`, `U10 stationNeighbours`), and three media tests (`U1`, `U2` palette, `U10 the narration is wired`) that read files wave 0 and other goals own;
a tenth, `C2-1 rect and polygon: nPerSide is capped`, fails only when the whole suite runs at once (it passes alone, 70/70, and does not import any of the five stations). None of the nine touches the five stations. In the real repo they pass once those goals land.

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
