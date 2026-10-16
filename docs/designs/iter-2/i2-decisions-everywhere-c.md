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
