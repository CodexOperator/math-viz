# Design: i2-decisions-everywhere-b (the two decisions, the move glyph, fresh numbers and the video panel on sets, mappings, linear, powermap, principal-root)

Goal: `i2-decisions-everywhere-b` (iteration 2, wave 1, kind integration). Designer: stage 2.
Owns: `js/stations/sets.js`, `js/stations/mappings.js`, `js/stations/linear.js`, `js/stations/powermap.js`, `js/stations/principal-root.js`.
Deliverables that are not station files and that this design names because the acceptance criteria require them (the loop's naming convention, like the kit's):
`tests/interact/i2-decisions-everywhere-b.mjs` (A1 to A3, named by the goal) and `tests/unit/i2-decisions-everywhere-b.test.mjs` (new, pure helpers only; it moves no iteration-1 pin). Request for the orchestrator: add the unit file to the goal's ownership.
Reads: `docs/ARCHITECTURE.md` 3.14, 4, 4.1, 9, 10, 11.1 to 11.4; `docs/STORY.md` sections 3 and 4; `js/core/{decisions,moveglyph,station-kit,listen}.js`; the five station files; the iteration-1 tests that pin them.

**How to use this document.** Sections 1 to 9 are the design. Appendix A is a tested reference implementation of the pure polynomial helpers of `mappings.js` (written and run in a scratch directory outside the repo against the real `parse.js` and `complex.js`; every number in section 6 and 7 that says "measured" comes from those runs). Appendix B is the builder's order of work and the id inventory. Where a sentence in sections 1 to 9 and the appendix code disagree, the sentence wins.

---

## 0. Findings that shaped this design (read first)

### 0.1 What is on disk now

1. **The kit exists and is the iteration-2 kit.** `js/core/decisions.js` (`chips`, `namesMeaning`, ...), `js/core/moveglyph.js` (`moveGlyph`, `updateGlyph`, `glyphText`), `js/core/station-kit.js` (`valuesOf`, `freshNote`, ...) and `js/core/listen.js` (`videoPanel`) are built and Node-importable (no DOM at import). The router already turns `station.request` into `ctx.preset = { kind: 'values', station, problem, family, values }` (deep-frozen) and `window.__mv.app` has `request(req)` and `preset()`.
2. **`media/manifest.js` exists and has no entries** (`VIDEOS = []`), so `videoPanel(host, 'motion-time')` resolves `null` today and the page must be identical to iteration 1 (no element, no layout change). A request for a missing manifest is a `console.warn`, never an error.
3. **`freshNote(problem, preset)` returns `''` unless `preset.kind === 'values'` and `preset.problem === problem.id`**, and otherwise `Fresh numbers from the Rehearsal Room. The handout's own answer: <answer.text>` (the kit's wording D5; the plan text in ARCHITECTURE 4.1 says "the handout's are ..."). The code wins.
4. **`valuesOf(preset, shape)` returns `null` for a preset that is not a values preset and `{}` for a values preset with no usable key.** "Something was applied" therefore means `vals !== null && Object.keys(vals).length > 0`.
5. **The five stations build their own problem card** (they are not rebuilt on the kit's `problemCard`: that is out of scope). So the card gets two additions inside the existing DOM, not a new card.
6. **Baseline measured:** `node tools/smoke.mjs --route sets,mappings,linear,powermap,principal-root,problem-2-1-3,problem-P3 --no-shots`: 14/14 ok. `npm test`: 858 tests, 853 pass, 5 fail (exactly the known red wave-1 pins: `I1 the registry`, `U3`, `U4`, `U5`, `U10`; none concerns these stations). A finished build must leave exactly those five red or fewer.
7. **The design adds no literal colour, no inline style and no `summary` element**; the baselines the iteration-1 tests pin are in 0.3.

### 0.2 Where this design differs from the plan text (report, do not edit ARCHITECTURE.md or the goal)

| # | Plan text | This design | Why |
|---|---|---|---|
| D1 | Goal A1 table: `problem-2-1-3` (linear) is `'P'`, `'any'` | The chips show what `js/data/problems.js` says: 2.1.3 is `'both'`, `'any'` (STORY section 3 row 2.1.3: "P for the motion, C for the line"). The script reads the data (as the goal says) and only **logs** a mismatch with the goal's table. | The goal itself says the table is cross-checked, not trusted. |
| D2 | "a new `#<station>-problem-note`" on every card | `#powermap-problem-note` **already exists** (the "This is problem 2.1.2 exactly" line, not pinned by any iteration-1 test). It is kept as the one note element: it holds the fresh-numbers sentence while the page shows the Rehearsal Room's numbers, and the old sentence otherwise. The other four stations get a new `p#<station>-problem-note`. | One id per meaning; no duplicate. |
| D3 | 4.1 shapes: powermap `line: { axis: 'x' \| 'y', c }` | The iteration-1 station can draw only a vertical line. The generator sends `y = c` too (family 2.1.2, `COMBOS_212`), and a station that opened `x = 2` for a `y = 3` card would print a wrong picture under a "fresh numbers" note. So the station gains a **horizontal line** (state field `axis`, default `'x'`), described in 5.5. | Math correctness is non-negotiable (CONSTRAINTS). |
| D4 | 4.1 shapes: sets `{ center, r0, r1, innerStrict, outerStrict }` | `buildSet(id, flags, params)` gains an optional third argument; the plane view, the probe start and the bounding-disk cap follow the set (5.2). The handout set and every preset are byte-identical to iteration 1. | A centre like 3 + 3i with r1 = 4 reaches |z| = 8.24, outside the iteration-1 view of 5. |
| D5 | 4.1: mappings `fn: { src }` "shown as a custom chip" | A `custom` function needs u(x, y), v(x, y), u(r, θ), v(r, θ) for the explainer. For a polynomial in z of degree at most 6 (everything the generator sends) they are **derived** from the parse tree (5.3, Appendix A); any other formula (`exp(z)`, `1/z`) gets the numbers-only table. | The student's table must show both addresses for the numbers it was sent. |
| D6 | goal text: "Fifteen stations ..." and the A-criteria for fifteen | Scope is **five** stations (the orchestrator split). Of the three additions: chips, note and values on all five; the glyph only on `linear` (`#linear-glyph`); the video panel only on `mappings` (`motion-time`). The glyph hosts `#addresses-glyph`, `#powers-glyph`, `#derivative-glyph`, `#cauchy-riemann-glyph` and the `two-addresses` / `zoom-cr` panels belong to goals a and c. | `docs/goals/iter-2.json` deliverable. |
| D7 | `interact-all` table rows `i2-adopt-ch1` / `i2-adopt-ch2-3` (ARCHITECTURE 8) | The script is `i2-decisions-everywhere-b` and names its route in its header (`--route sets`); `tools/interact-all.mjs` already reads routes from the header. | The table rows are stale names of the plan. |
| D8 | ARCHITECTURE 11.3: cards built with `problemCard` | Not used here (out of scope in the goal). The note/decisions DOM added to each card follows the kit's id scheme (`<station>-problem-decisions`, `-address`, `-names`, `-meaning`, `-note`) so a later rebuild on `problemCard` keeps the ids. | Out of scope: "Replacing each station's header, card and links with the kit's". |
| D9 | The request's `problem` field (the goal does not say what a request naming another station's problem does) | The `problem` of the request may be `null` or a problem the station does not own; the station then uses its own default problem for the note (5.1, R3). | `cleanRequest` in `app.js` already nulls an unknown problem. |

### 0.3 Pins this design must not move (iteration-1 tests that read these five files; none is edited)

| Pin | Where | What it forces |
|---|---|---|
| **C26** (`tests/unit/i1-station-curves-linear.test.mjs`) | `linear.js` text from `function threadBadges(ctx) {` to `// The answer: the TeX`, and from `// The answer: the TeX` to `function chipRow(`, must equal the same text of `curves.js` (after `curves`/`linear` and `cv-`/`ln-` are folded) | **Do not edit `threadBadges`, `buildHeader`, `answerBox`, `renderProblemCard`, `buildLinks`** and put every new function of `linear.js` **after `function chipRow(`**. The chips and the note are added to the card **from outside** (`decorateCard`, 5.4). Goal a must not edit the same regions of `curves.js` either (flag in risks). |
| **C22** | `linear.js` imports | Every name imported must be used in the file body. |
| **L17** | `linear.js` | The text must contain no `.t = ...` assignment (`/\.t\s*=[^=]/`) and no `t: i / n` pattern. Name fields `clock`, `stage`, never write `x.t = `. |
| **L20** | `linear.js` order | `mv.linear = hook` before `wplane.on('viewchange'` before the single `window.addEventListener('scroll', onPageScroll` and `sizeWatch = new ResizeObserver(onResize)`, all before `return function unmount()`; one scroll listener. |
| **L22** | `linear.js` | `createLabelPlacer(c, p)` appears exactly twice; no `FIXED_LABEL`, `labelOffset`, `drawLabel`; the `@media (max-width:30rem){...#station-linear .ln-caption{min-height:3.2em}` and `@media (max-width:21rem){#station-linear .ln-caption{min-height:4.8em}}` rules stay as written, and no `@` appears between them; no `.ln-caption{...font-size:.84rem}`. New CSS goes **before** the first `@media`. |
| **I12** (`i1-integration.test.mjs`) | `linear.js`, `powermap.js`, `sets.js` | The number of `mk('summary'` / `h('summary'` is exactly 2, 1, 1 and each has an id. **Add no `<details>` or `<summary>` to these three files.** |
| powermap pins (`i1-station-powermap-reciprocal.test.mjs`) | `powermap.js` | no `#hex`, `rgb(`, `hsl(` anywhere in the file (comments included: do not write `#fab`, `#bad`, `#cab` style text); the only `.style.x` or `style="..."` allowed is `aspectRatio` (**none exists, add none**); the lines `addPoint({ id: 's0'...`, `'s1'`, `'line'` each carry `zOrder: 1,` on the same line; the probe `addPoint({ id: 'p'` block has no `zOrder`; `drawCartAddress(c2, pl, s.wPolar, { names: ['u', 'v'] })` verbatim; no `labels: false`, no `drawUVNames`, no `el.setAttribute('aria-label'`; the first `mk('a', 'station-link'` is followed within 700 characters by `const t = mk('span');`, `prose(t, ...s.title)`, `a.appendChild(t)` (**add no `mk('a', 'station-link'` earlier in the file**); `pm.labRequest(presetFor(null))` is exactly `{ fn: 'sq', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.2', predictFirst: false }`; `presetFor` and `PRESETS` are unchanged (deepEqual pins). |
| mappings pins (`i1-station-mappings-cr.test.mjs`) | `mappings.js` | `MAPPING_FN_IDS` is exactly the five ids (**the custom function is not an id of this list**); `W_HALF[id] > 0` for each; no `alert(`, `confirm(`, `prompt(`, `window.open`, `window.print`, `document.write`, `http://`, `https://`, `localStorage` after comment stripping, and every `innerHTML = ` has a string literal on its right; `drawCartAddress(c2, pl, w, { names: { x: 'u', y: 'v' } })` verbatim; `GRID_STYLE = { ... obstacle: true ... }`; the first `mk('a', 'station-link'` block still has `const label = mk('span');`, `prose(label, ... st.title)`, `a.appendChild(label)`; `thetaTex`, `bothAddresses(fnId, z, k)`, `uvCartesian`, `uvPolar` (RangeError for an unknown id), `explainerRows()` keep their behaviour. |
| principal-root pins (`i1-station-roots-principal.test.mjs`) | `principal-root.js` | still imports `principalRoot` and `rootsOf` from `../core/complex.js`; **no literal `0.309`, `0.951`, `0.809`, `0.588`, `1.414`, `1.732`, `Math.SQRT2` anywhere in the file, comments included** (this document quotes them for the builder's tests; the file must not); no `re: <digits>.<3+ digits>` literal; no `(document\|window).` at top level before `export function mount`; still has `showK: true`, `createLabelPlacer`; none of `arcRadiusPx: 0`, `segAlpha`, `tagStairRows`, `rt-krow`; `Object.keys(PRESETS)` stays `['2i', 'm1', 'm1cube']`. |
| sets pins (`i1-station-distance-sets.test.mjs`, script S0 to S14) | `sets.js` | `buildSet(id, flags)` for the five ids is unchanged (the new third argument defaults to the old numbers); `presetFromContext` returns exactly `{ id }`; the card text still contains `1.5.2` and, after any change of the set, `You changed the set`; `#sets-answer` details (id kept) etc. |
| integration scripts (`i1-integration.mjs`, steps I4 to I8) | all five | every `button`, `input`, `select`, `textarea`, `summary` in `#view` has an id (the chips of the kit do; a ghost copy must use `meaning: false`, which makes spans); no duplicate ids; no ASCII `pi`, `z0`, `deg`, `eps`, `<=` or `>=` in the visible text of a station in its default state; no `[zw][012]` in an `aria-label` or `title`; at z = 0 the polar cell of `mappings` says `no angle at 0`; the readout formats of every station stay. |
| `I11` | all stations | no `\d degrees` (the word after a digit) in a non-comment line. |
| principal-root layout (`i1-station-roots-principal.mjs`) | callout slot | the plane below the problem callout **does not move** when the callout changes between 2.2.2 and the neutral line (slot height = tallest variant). |
| mappings callout (`i1-station-mappings-cr.mjs`) | `#mappings-problem` | hidden when the function is not the handout's. |

### 0.4 Decisions this design makes

1. **One recipe on five cards.** Each existing card gets `p#<station>-problem-note` (hidden while empty) and `div.row#<station>-problem-decisions` holding `decisions.chips(problem, { idPrefix: '<station>-problem' })`, placed directly under the statement. A `data-fresh="true|false"` attribute on the card says whether the numbers on the page are the Rehearsal Room's.
2. **The card keeps the handout's statement.** The note carries the kit's `freshNote(...)` and one more sentence, `This page opened on <what the page now shows>.`, so the student never has to compare a statement with a picture on trust.
3. **When the note goes.** sets: while the set equals the one sent (otherwise the iteration-1 "You changed the set" text, chips hidden). mappings: while the function on the page is the one sent. linear: until a preset chip is pressed. powermap: while the input, n and the line or sector still equal what was sent (otherwise the iteration-1 sentence). principal-root: while w and n equal what was sent (then the neutral line, in the same slot).
4. **Partial or bad values.** What is valid is applied, the rest is the station's default. If nothing valid is left the station opens exactly as before, with **no note**, no message and no console output (the one exception is a bad mappings formula, which says why: 2.5).
5. **Custom function = a polynomial analysis, not a new engine.** `mappings.js` gets `polyCoefficients`, `cartTerms`, `polarTerms` (Appendix A) and a `customSpec(src)`; `bothAddresses` and `mappingReadout` take the spec as an optional last argument, so there is still one code path.
6. **Horizontal line in `powermap`**, **parameterised annulus in `sets`**, **custom shape in `linear`** (a fourth chip `#linear-input-custom`), all additive and all defaulting to iteration 1.
7. **The glyph beside the readout, as a flex sibling.** In `linear` the readout moves one level down into `div#linear-readrow` next to the glyph; the glyph is never inside `#linear-readout`.

---

## 1. Goal restatement, the story thread, the problems covered

**Goal.** On the five stations `sets`, `mappings`, `linear`, `powermap`, `principal-root` (three of them with several problem cards: `linear` 2.1.3, P3, P4; `powermap` 2.1.2, 2.2.1; the others one each), (a) show both decision chips (Address, Names) on every problem card, with the one-line meaning on tap; (b) open with the Rehearsal Room's numbers when `ctx.preset.kind === 'values'` and say so on the card; (c) show the move glyph beside `a` on `linear`; (d) host the `motion-time` video panel after the two planes of `mappings` (absent until the manifest has it). Nothing from iteration 1 moves: every id, readout string and hook stays.

**Story thread carried.** Spine line 1 and line 3: *a complex number is a move* and *a function moves every point at once*. The glyph beside `a` on `linear` is the same mark as beside z on `addresses` and beside f′ on `derivative`: `a` in `az + b` is one turn and one stretch, drawn once, so "the derivative is a move" is one recurring picture from Chapter 1 to Chapter 3. The chips are the exam lens: every card says *which address* and *which names*, so a student in the test asks the two questions before touching a formula. "Open with fresh numbers" is the promise of the Rehearsal Room: **same place, new numbers**.

**How it shows on screen.** Under the statement of every card, one row: an Address chip (tinted `--cart` or `--polar` dots) and a Names chip (`names: none | any | all | home | continuous`, with its small staircase mark). Tap one: a one-line meaning appears under the row. If the page was opened by the Rehearsal Room, a muted line says `Fresh numbers from the Rehearsal Room. ...` and `This page opened on ...`. On `linear`, a 2rem glyph (unit circle, the arc of Arg a, a ray of length |a|, in `--polar`) sits to the left of the readout and redraws as `a` is dragged. On `mappings`, when a video exists, a "Watch" panel sits between the planes and the morph controls.

**Review problems and topics covered** (the five stations' share of `assignment_refs`): 1.5.2 (`sets`: address P, names none), 2.1.1 (`mappings`: both, any), 2.1.2 (`powermap`: C, none), 2.2.1 (`powermap`: P, any), 2.1.3 (`linear`: both, any), P3 (`linear`: C, none), P4 (`linear`: P, any), 2.2.2 (`principal-root`: P, home); topics T1.5 (sets of points), T2.1 (functions and mappings), T2.2 (power and root functions). The remaining refs of the goal belong to goals a and c.

---

## 2. UX

### 2.1 What every card gets (the one recipe)

```
+--------------------------------------------------------------------------+
| <existing badge / title and the handout statement>                       |
| p#X-problem-note        muted; hidden unless the page opened on fresh    |
|                         numbers                                          |
| div#X-problem-decisions (class row)                                      |
|   span.decisions > button#X-problem-address  button#X-problem-names      |
|                    span#X-problem-meaning[role=status][hidden]           |
| <existing why / answer / routes ...>                                     |
+--------------------------------------------------------------------------+
X = sets | mappings | linear | powermap | principal-root
```

The note is `hidden` while it is empty on sets, mappings, linear and principal-root. On powermap the note element already exists and is always on screen: it holds the iteration-1 sentence ("This is problem 2.1.2 exactly ..." or "You changed the input ...") when the numbers are not the Rehearsal Room's, and the fresh-numbers sentence when they are.

Behaviour of the chips is the kit's (not re-specified here): a click, tap, Enter or Space on a chip shows its meaning in `#X-problem-meaning` and sets `aria-expanded="true"` on that chip; a second press, or the other chip, closes or switches it; Escape closes it and keeps focus. A chip has `title` = its meaning (hover). `data-value` is the code (`P`, `both`, ...; `none`, `any`, ...).

### 2.2 Wireframes

**sets, desktop (card; 1280 px) and phone (390 px)**

```
desktop                                                                       phone
+----------------------------------------------------------------------+   +----------------------------+
|[Problem 1.5.2] Consider S = { z in C : 1 < |z + i| <= 3 }. Is S open, |   |[Problem 1.5.2] Consider S  |
|closed, or neither? ... Why or why not?                               |   |= { z in C : 1 < |z + i| <= |
|Fresh numbers from the Rehearsal Room. The handout's own answer: ...  |   |3 }. Is S open, closed ...  |
|This page opened on the set 1 ≤ |z - (1 - i)| ≤ 3.                    |   |Fresh numbers from the      |
|(o Polar) (|| names: none)                                            |   |Rehearsal Room. The handout |
|| No angle in the question.            <- only after a tap            |   |own answer: ... This page   |
|> Show the answer                                                     |   |opened on the set ...       |
+----------------------------------------------------------------------+   |(o Polar) (|| names: none)|
                                                                           |> Show the answer           |
mode 'yours' (set changed): badge "Your set" and the sentence "You         +----------------------------+
changed the set. ..." exactly as in iteration 1, no note, no chips.
```

**mappings, desktop**

```
+----------------------------------------------------------------------+
| Problem 2.1.1  Express f(z) = z^2 + iz in the form u(x, y) + iv(x, y) ... |
| Fresh numbers from the Rehearsal Room. ... This page opened on f(z) =     |
| z^2 - iz at z = 1 + i.                                               |
| (o o Either address) (names: any)  [meaning]                         |
| (badge) Why this address ...                                         |
+----------------------------------------------------------------------+
Pick a function
(z² + iz) (z²) (iz − 2i) (1/z) (conj z) (custom: z^2 - iz)   <- #mappings-fn-custom, only when a formula was sent
The formula the Rehearsal Room sent. The table below expands it in x and y and in r and θ.   <- #mappings-fn-note
[callout #mappings-fn-problem  only on a bad formula: lead + verbatim parse message]
+-- z-plane --------------+  +-- w-plane --------------+
+-------------------------+  +-------------------------+
#mappings-video-host  ->  [Watch (2–3 min): ...]   (hidden, so it takes no space and no flex gap, until the manifest has motion-time)
Watch the plane move ...
```

**linear, readout row (desktop and phone; the card is the recipe of 2.1 under `#linear-problem-statement`'s paragraph)**

```
The numbers panel (right column of "Choose a and b"; below it on a phone)
+------+------------------------------------------------------------+
| (@)  | a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i |   div#linear-readrow (flex)
+------+------------------------------------------------------------+
 #linear-glyph (svg, 2rem)        #linear-readout   (siblings)
```

The glyph is a faint unit circle, an arc from the positive real axis to Arg a, and a ray of length min(|a|, 2) / 2 of the box radius (dashed when |a| > 2), all `--polar`. At a = 0 it is the circle alone and its label reads `no move: 0`.

**powermap, desktop (card is `section.panel#powermap-problem`, at the bottom of the page)**

```
Problem 2.1.2
[Address badge] Determine the image of the vertical line x = 2 under w = z². ...
p#powermap-problem-note   Fresh numbers ... This page opened on the line x = 3 under w = z^2.
                          (or the iteration-1 sentence: "This is problem 2.1.2 exactly (n = 2, x = 2)." /
                           "You changed the input. The problem itself is n = 2, x = 2.")
div#powermap-problem-decisions  (o Cartesian) (names: none)
<aha> <routes> <why> <details#powermap-answer>
```

**principal-root, desktop (callout inside the fixed-height slot)**

```
+--[ slot: as tall as the tallest of the three ghost variants ]----------+
| 2.2.2 Compute the principal value of the square root of 2i ...        |
| p#principal-root-problem-note  Fresh numbers ... This page opened on  |
|                                w = -8 with n = 3.                     |
| div#principal-root-problem-decisions  (o Polar) (names: home)        |
| Easy in: [Polar]  Principal roots are defined with Arg: ...           |
+-----------------------------------------------------------------------+
variants (aria-hidden ghosts, same height): handout card, fresh card with the longest note, neutral line.
```

### 2.3 Controls (every new or changed control)

| id | element | label (visible) | behaviour |
|---|---|---|---|
| `#sets-problem-address`, `#sets-problem-names` | kit chips (buttons) | `Polar`; `names: none` | tap shows `#sets-problem-meaning`; only while the card is in mode `handout` or `fresh` |
| `#sets-problem-note` | `p.muted` | the fresh sentence | hidden unless mode `fresh` |
| `#sets-problem-decisions` | `div.row` | none | holds the chips |
| `#mappings-problem-*` | same four | `Either address`; `names: any` (the text is `addressLabel('both')`) | card visible only when the function is `sq-plus-iz` or `custom` |
| `#mappings-fn-custom` | `button.chip` in `#mappings-fn-chips` | `custom: <src, at most 24 characters, then …>`; `title` = the whole formula | present only when a valid formula was sent; `aria-pressed`; a press shows the custom function again |
| `#mappings-fn-problem` | `div.callout[data-tone="accent"][role="alert"]` | lead + message | only for a bad formula; hidden by the first function chip press |
| `#mappings-fn-error-lead`, `#mappings-fn-error` | `p` in the callout | see 2.6 | `#mappings-fn-error`'s `textContent` is exactly `err.message` of `parse.js` |
| `#mappings-video-host` | `div[hidden]` after the two planes | none | receives the video panel (`#video-motion-time`, built by `listen.js`); `hidden` is removed when the panel arrives (fix round 1) |
| `#linear-problem-*` | same four, inserted by `decorateCard` | | follow the active preset (2.1.3, P3, P4) |
| `#linear-glyph` | `svg.move-glyph[role=img]` | `aria-label` = `move: turn 90°, stretch 1` | redrawn on every flush with `updateGlyph(glyph, S.a)` |
| `#linear-readrow` | `div` (flex) | none | parent of `#linear-glyph` and `#linear-readout` |
| `#linear-input-custom` | `button.chip` appended to `#linear-inputs` | `The line x = 1` / `The line y = -2` / `The circle \|z\| = 3` | present only when a shape was sent; selects it; `aria-pressed` |
| `#powermap-problem-decisions`, `-address`, `-names`, `-meaning` | kit chips | | follow the input: line gives 2.1.2, sector gives 2.2.1 |
| `#powermap-input-line` | existing chip | `Line x = c`, or `Line y = c` while `axis` is `'y'` | unchanged behaviour (a toggle with the sector chip) |
| `#principal-root-problem-*` | kit chips + note | | follow `activeProblem()`; the neutral line has none |

### 2.4 Pointer, touch and keyboard

* Chips: pointer, touch and keyboard exactly as the kit (button semantics). No chip is a drag target. Tab order is statement, chips, answer.
* The glyph is not interactive and not focusable (`focusable="false"`); its meaning is in its `aria-label` and `<title>` (hover).
* Everything else (planes, handles, sliders) is unchanged, so the iteration-1 keyboard maps stay: handles move with the arrows (Shift ×10, Alt ÷10).
* The horizontal-line handle (`#powermap-zplane-line` when `axis` is `'y'`) sits at (0, c) on the imaginary axis; a pointer drag snaps `c` to 0.1 and clamps to [-3, 3]; arrow keys move it 0.1 (Alt 0.01 does nothing by design, as for the vertical line); it keeps `zOrder: 1`.

### 2.5 States

| State | What the student sees |
|---|---|
| Normal visit | the card with chips; no note (`hidden`), `data-fresh="false"` |
| Fresh numbers | the note under the statement; `data-fresh="true"`; the picture already shows the new numbers |
| Fresh numbers, then the student changes the thing | sets: "You changed the set ..." (no chips); powermap: the iteration-1 sentence; principal-root: the neutral line; mappings: the card hides on another chip; linear: note stays until a preset chip is pressed |
| Nothing valid in the request | exactly the default page, no note, no message, no console output |
| Part of the request valid | the valid part applied, the note says what the page opened on |
| Bad formula (`mappings` only) | `#mappings-fn-problem` with the lead and the parse message verbatim; the page opened on `z² + iz`; any valid `z` is still applied; no custom chip |
| Video loading | `listen.js` owns it (`data-state="loading"`, then `ready` or the error line); the host is hidden before the manifest answers (no jump, and no extra flex gap: a zero-height `div` is still a flex child and would add a second 24 px gap) |
| No manifest entry | `#mappings-video-host` stays empty and `hidden`; the page equals iteration 1 (the gap between the two planes and the motion panel is one flex gap, 24 px) |
| No WebGL / no KaTeX | unchanged: none of the additions needs either (chips and the glyph are DOM and SVG; a note is plain text) |

### 2.6 Copy (plain, direct; ASCII minus; no emoji; every string below is exact)

* Note, all five: `<freshNote(...)>` + (a full stop if the kit's text does not end in one) + one space + the sentence of its station:
  * sets: `This page opened on the set 1 ≤ |z - (1 - i)| ≤ 3.` (the real signs of `describeSet(set).text`)
  * mappings: `This page opened on f(z) = z^2 - iz at z = 1 + i.` (the formula as the Rehearsal Room typed it; ` at z = <fmtCart(z)>` is left out when no z was sent; a catalogue id sends `f(z) = <fnById(id).src>`)
  * linear: `This page opened on a = i, b = 1 and the line x = 1.` (`a = <fmtCart(a)>, b = <fmtCart(b)> and <the shape label with a lower-case first letter>`; P3 adds ` The composition panel opened on c = 1 + i and d = 1.` when `compose` was sent)
  * powermap: `This page opened on the line x = 3 under w = z^2.` / `... the line y = -1 under w = z^2.` / `... the sector 0 < arg z < π/6 under w = z^2.`
  * principal-root: `This page opened on w = -8 with n = 3.`
* mappings, the formula note `#mappings-fn-note` for a custom function:
  * polynomial: `The formula the Rehearsal Room sent. The table below expands it in x and y and in r and θ, and checks that both land on the same w.`
  * anything else: `The formula the Rehearsal Room sent. It has no short expansion in x and y, so the table shows the numbers at your z.`
* mappings, bad formula: lead `The Rehearsal Room sent a formula I could not read, so the page opened on z² + iz instead.` and the message of `parse.js` untouched (for example `The formula stops too early. Something is missing after "+".`).
* linear chip labels: `The line x = 1`, `The line y = -2`, `The circle |z| = 3`, `The circle |z - (1 + i)| = 2`, `The circle |z + 1| = 1`, `The circle |z + i| = 2` (centre 0 prints `|z|`).
* powermap, the line chip `Line y = c`; the "Try this" callout for a horizontal line: `Try this. Drag the dot on the imaginary axis to y = 1, then y = 3: the parabolas all share the focus 0 and open to the right. Then drag it to y = -2: the same parabola again, because z and -z have the same square, so z^2 covers the plane twice.`; the lede for a horizontal line: the iteration-1 lede with `the line y = 2` in place of `the line x = 2`.
* No other new visible words. The chips' words are the kit's.

---

## 3. Visual encoding (design language of docs/CONSTRAINTS.md; both themes)

All colours are tokens already used by the kit or the shell; **no literal colour, no inline style** is added (powermap and sets have none and must stay without; `mappings.js`, `linear.js` already carry a few `style.x = ...` for layout and add none).

| Element | Encoding | Light and dark |
|---|---|---|
| Address chip | kit: dots `--cart` / `--polar` (two dots for a two-address problem) | tokens switch with `data-theme`; contrast is the kit's (checked in its design) |
| Names chip | kit: `none` muted, `any` `--polar` outline, `all` `--polar` filled, `home` `--polar` tint, `continuous` dashed; the small staircase mark | same |
| Meaning line | kit: `--surface-2` block with a `--polar` left bar | same |
| Note | `p.muted` (`--text-muted` on the card surface) | the shell's muted token already meets 4.5:1 in both themes |
| Card tone | unchanged (`data-tone` of the iteration-1 card); `data-fresh` has **no** style of its own (it is a hook for scripts and a later iteration) | |
| Move glyph | `.move-glyph { color: var(--polar) }` from `moveglyph.js` (injected once); unit circle at 30 % opacity, arc 1.6 stroke, ray 2 stroke, dashed ray when |a| > 2 | stroke is `currentColor`, so both themes |
| `a` in the polar hue | the handle `a` on `#linear-ab` is already `--polar`; the glyph repeats it: spin and stretch are polar words | |
| Custom function chip | an ordinary `.chip` (the shell); pressed state is the shell's `aria-pressed` style | |
| Error callout | `.callout[data-tone="accent"]` (left bar `--accent`), text `--text` | |
| Horizontal line | the same `--input` stroke, ramp and dots as the vertical one (the plane's `addCurve` with the shape's `t`); its image uses `--output` | |
| Custom shapes in `linear` | `--input` (circle and lines are plain shapes; the carried grid keeps its own tones) | |
| Video panel | `listen.js`'s own (`.panel.video-panel`, `data-tone="accent"`) | |

---

## 4. Module API

Nothing here removes or renames an export, an id, a readout string or a hook. Every new export is pure unless it says otherwise. No module imports another station.

### 4.0 Imports added (the aliasing matters: four of the five files already have a local called `chips`)

```js
import { chips as decisionChips } from '../core/decisions.js';
import { valuesOf, freshNote } from '../core/station-kit.js';
// linear.js only:
import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
// mappings.js only:
import { videoPanel } from '../core/listen.js';
import { compile, parse, toTex, ParseError } from '../core/parse.js';   // replaces `import { compile } from '../core/parse.js'`
// shapes: linear.js and powermap.js add `horizontalLine` to their existing `../core/shapes.js` import
// mappings.js adds `fromPolar` to its existing `../core/complex.js` import
```

Every import must be used (C22 for `linear.js`; good practice for the rest). `mappings.js` imports `parse` and `toTex` because `customSpec` uses them; `ParseError` for the message check.

### 4.1 `js/stations/sets.js`

```js
export const RING_LIMITS = Object.freeze({ rMin: 0.25, rMax: 4, centerMax: 5 });
export const SETS_VALUES_SHAPE = Object.freeze({ center: 'complex', r0: 'real', r1: 'real', innerStrict: 'bool', outerStrict: 'bool', preset: PRESET_IDS });   // after PRESET_IDS
export function buildSet(id, flags = {}, params = null)   // EXTENDED. params: { center: {re, im}, r0, r1 } | null; read only for 'annulus' and 'closed'
export function setFromValues(clean)       // clean = valuesOf(...) → { id, flags: { innerStrict, outerStrict }, params: { center, r0, r1 } | null } | null
export function viewHalfFor(an)            // an = analyse(set) → integer >= 5: the half-width of the square view that holds the set and the bounding disk
export function probeStartFor(set)         // → { re, im }: the middle of the first ring on the real direction; { re: 2, im: 0 } if the first cell is not a bounded ring
export function boundCapFor(half)          // → Math.max(BOUND_MAX, half + 1.5): the largest radius the bounding-disk handle can set
export const PROBE_MARGIN = 0.25           // fix round 1: how far inside the view's edge the probe's whole dot must sit
export function probeInView(p, half)       // fix round 1 → p itself (same object) while |re| and |im| <= half - PROBE_MARGIN, else { re: 2, im: 0 }
export function whyAboutSet(set)           // fix round 1 → null for the handout ring (its own addressWhy shows) and for a half plane; else the sentence about this set
export function cardModeOf(set, freshSet)  // → 'fresh' | 'handout' | 'yours'
export function openedOnSet(set)           // → 'This page opened on the set 1 ≤ |z - (1 - i)| ≤ 3.'
```

State (inside `mount`, additions in **bold**): `{ presetId, flags, **params**, set, an, p, eps, snap, chip, cls, boundR, **half**, **fresh** }` with `params: null | { center, r0, r1 }`, `half: number`, `fresh: null | { set }`.
Hook: `window.__mv.sets.state()` keeps every key and adds `card: 'fresh' | 'handout' | 'yours'` and `half`. Lifecycle: unchanged (the chips have element listeners only).

### 4.2 `js/stations/mappings.js`

```js
export const CUSTOM_ID = 'custom';                             // NOT part of MAPPING_FN_IDS
export const MAPPINGS_VALUES_SHAPE = Object.freeze({ fn: (v) => string-id | { src } | undefined, z: 'complex' });   // 5.3
export function polyCoefficients(ast)      // pure → [{re, im}] (index = power of z, trailing zeros trimmed) | null; null unless a polynomial in z of degree <= 6
export function cartTerms(coeffs)          // pure → { u: [{ c, px, py }], v: [...] }: u(x, y) and v(x, y) as terms, ordered by total degree then by px, both descending
export function polarTerms(coeffs)         // pure → { u: [{ c, k, trig }], v: [...] }: trig is 'cos' | 'sin' | 'const'; ordered by k descending, cos before sin
export function texCartTerms(terms)        // pure → 'x^{2} - y^{2} + y'
export function texPolarTerms(terms)       // pure → 'r^{2}\cos 2\theta + r\sin\theta'
export function evalCartTerms(terms, x, y) // pure → number
export function evalPolarTerms(terms, r, t) // pure → number
export function customSpec(src)            // → Spec; throws ParseError (message for the student, verbatim)
export function customHalf(f)              // pure → 3 | 4 | 5 | 8 | 12 | 20 | 30: the half-width of the w-plane view for f
export function customRows()               // → explainer rows for a custom function (ids expand, u, v, value)
export function customChipLabel(src)       // pure → 'custom: z^2 - iz' (longer than 24 characters: the first 23 plus '…')
export function openedOnFn(fnLabelSrc, z)  // pure → 'This page opened on f(z) = z^2 - iz at z = 1 + i.' (z may be null)
export function bothAddresses(fnId, z, k = 0, spec = null)   // EXTENDED: spec from customSpec replaces the catalogue tables
export function mappingReadout(fnId, z, spec = null)         // EXTENDED likewise
// Spec = { id: 'custom', src, tex, f, coeffs | null, c: (x, y) => { u, v }, p: (r, t) => { u, v }, cartTex: { u, v } | null, polarTex: { u, v } | null, half }
```

State additions: `custom: Spec | null`, `freshFn: string | null`, `fnError: string`. `state.fnId` is a catalogue id or `'custom'`. Hook: `window.__mv.mappings.state()` adds `custom: src | null`. Lifecycle: the video panel promise is guarded (5.3 step 12); `unmount` is otherwise unchanged.

### 4.3 `js/stations/linear.js`

```js
export const LINE_X_RANGE = Object.freeze([-5, 5]);            // the drawn part of a horizontal line (the vertical one keeps LINE_Y_RANGE)
export const LINEAR_VALUES_SHAPE = Object.freeze({ a: 'complex', b: 'complex', input: shapeFromValue, compose: composeFromValue });
export function shapeFromValue(v)          // pure → 'x2' | 'unit' | { kind: 'verticalLine', x } | { kind: 'horizontalLine', y } | { kind: 'circle', center, r } | undefined
export function composeFromValue(v)        // pure → { c, d } | undefined
export function shapeCurve(shape)          // pure → Curve (verticalLine / horizontalLine / circle from shapes.js), null for anything else
export function inputLabel(input, shape)   // pure → 'The line x = 2' | 'The unit circle' | 'Your own stroke' | shapeLabel(shape)
export function shapeLabel(shape)          // pure → 'The line x = 1', 'The circle |z - (1 + i)| = 2' ...
export function keyFromValues(clean, preset)   // pure → '2.1.3' | 'P3' | 'P4'
export function exceedsView(points, halfW, halfH, margin = 0.3)   // pure → boolean
export function openedOnLinear(a, b, label, compose)   // pure → 'This page opened on a = i, b = 1 and the line x = 1.'
export function labRequest({ a, b, input, shape })     // EXTENDED: `shape` is read only when input === 'custom'
```

State additions: `S.shape: null | shape` (remembered even after a preset chip is pressed), `S.input` may be `'custom'`. Hook: `window.__mv.linear.state()` adds `shape` (a copy or `null`). Lifecycle: no new listener and no new timer (the order pinned by L20 is untouched).

### 4.4 `js/stations/powermap.js` (new keys of the frozen `internals`; `mount` unchanged in signature)

```js
internals.VALUES_SHAPE                      // { n: (v) => int 2..6 | undefined, line: (v) => { axis, c } | undefined, sector: (v) => { aStep, bStep } | undefined }
internals.valuesState(clean, preset)        // pure → state | null (a state like presetFor's, plus `axis`)
internals.openedOn(st)                      // pure → 'This page opened on the line x = 3 under w = z^2.'
internals.X_RANGE                           // [-4, 4], the drawn part of a horizontal line
// EXTENDED (the old calls behave as before): strokeFor(state), probeOf(state, stroke), derive(state, stroke) (adds `axis`),
//   lineReadout(c, n, axis = 'x'), lineFact(c, n, axis = 'x'), srText(state), tText(s), labRequest(state), ledeFor(input, axis = 'x'),
//   rowsFor(mode, axis = 'x')
```

State additions: `st.axis: 'x' | 'y'` (default `'x'`, set in `mount` after `presetFor`, never in `PRESETS`), `fresh: null | { input, n, c, axis, aStep, bStep }` (module-local to `mount`). No new hook.

### 4.5 `js/stations/principal-root.js`

```js
export const PRINCIPAL_VALUES_SHAPE = Object.freeze({ w: (v) => {re, im} with |w| <= W_MAX | undefined, n: (v) => int N_MIN..N_MAX | undefined });
export function stateFromValues(clean)     // pure → { w, n, sel } | null (null when neither w nor n is usable)
export function openedOnPrincipal(w, n)    // pure → 'This page opened on w = -8 with n = 3.'
```

State additions: `S.fresh: null | { w, n }`. Hook: `window.__mv.principalRoot.state()` adds `fresh: boolean`. `renderProblem(host, p, neutral, opts = {})` gets a fourth argument `{ note, ghost, ghostIndex }` (module-private). Lifecycle unchanged.

---

## 5. Algorithms

### 5.1 Shared recipes (each station inlines them; they are four short functions, not a module)

```
R1  decisionsRow(problem, prefix, ghost = false):                  // → div.row
      row = div(class 'row', id ghost ? none : prefix + '-decisions')
      row.append(decisionChips(problem, ghost ? { idPrefix: prefix, meaning: false } : { idPrefix: prefix }))
      return row
R2  noteWith(problemId, opened):                                    // → string ('' when the id is unknown)
      base = freshNote(problemById(problemId), { kind: 'values', problem: problemId })
      if base == '': return ''
      return (base ends with '.' ? base : base + '.') + ' ' + opened
R3  problemAsked(preset, owned, fallback):                          // which problem the note is about
      return preset && typeof preset.problem == 'string' && owned.includes(preset.problem) ? preset.problem : fallback
        owned/fallback: sets ['1.5.2']/'1.5.2'; mappings ['2.1.1']/'2.1.1'; linear ['2.1.3','P3','P4']/'2.1.3' (but see 5.4: the
        key); powermap ['2.1.2','2.2.1']/by input; principal-root ['2.2.2']/'2.2.2'
R4  applied(vals):  return vals !== null && Object.keys(vals).length > 0
```

Rules for every station: (1) read the preset **only** through `valuesOf(ctx.preset, SHAPE)` (never `preset.values`); (2) `preset.problem`, `preset.kind` and `preset.family` may be read directly (they are not values); (3) a value that is not valid is dropped by the shape function (return `undefined`), never throws; (4) never write to the store, never call `console` for a bad request.

### 5.2 sets.js

**5.2.1 `buildSet(id, flags = {}, params = null)`**

```
RING_DEFAULT = { center: C(0, -1), r0: 1, r1: 3 }                        // the handout's numbers, in one place
DEFS.annulus.cells = (f, pr) => [ring(copyC(pr.center), pr.r0, pr.r1, f.innerStrict, f.outerStrict)]
DEFS.closed.cells  = the same
DEFS.punctured / halfplane / twodisks: cells unchanged (a second argument is ignored)
buildSet(id, flags, params):
   def = DEFS[id] || DEFS.annulus;  preset = DEFS[id] ? id : 'annulus'
   f = { innerStrict: ..., outerStrict: ... }                              // exactly as before
   pr = (params && (preset == 'annulus' || preset == 'closed')) ? params : RING_DEFAULT
   return { preset, flags: f, innerApplies: def.innerApplies, outerApplies: true, cells: def.cells(f, pr) }
```
`JSON.stringify(cells)` of the handout set is byte-identical to iteration 1 (`sameSet` relies on it); `copyC` is `({re, im}) => ({ re: re + 0, im: im + 0 })`.

**5.2.2 `setFromValues(clean)`** (tested)

```
if clean == null: return null
if clean.preset (one of PRESET_IDS): return { id: clean.preset, flags: defaultFlags(clean.preset), params: null }
{ center, r0, r1 } = clean
if center missing or r0 or r1 undefined: return null
if not (r0 >= RING_LIMITS.rMin and r1 > r0 and r1 <= RING_LIMITS.rMax): return null
if |center.re| > RING_LIMITS.centerMax or |center.im| > RING_LIMITS.centerMax: return null
return { id: 'annulus',
         flags: { innerStrict: clean.innerStrict ?? true, outerStrict: clean.outerStrict ?? false },    // the handout's flags when none were sent
         params: { center: copyC(center), r0, r1 } }
```
`id` is `'annulus'` for every ring (the two checkboxes carry the flags; `closed` and `annulus` differ only in default flags and share `BOX_LABELS`).

**5.2.3 `viewHalfFor(an)`**: `an.bounded ? Math.max(5, Math.ceil(an.boundingRadius + 0.4)) : 5`. Measured: handout (R = 4) gives 5; the A3 set about 1 − i (R = 4.414) gives 5; centre 3 + 3i with r1 = 4 (R = 8.243) gives 9; punctured, two disks, half plane give 5.

**5.2.4 `probeStartFor(set)`**: `cell = set.cells[0]`; if `cell.kind != 'ring'` or `hi` is not finite: `C(2, 0)`; else `{ re: cell.c.re + (cell.lo + cell.hi) / 2 + 0, im: cell.c.im + 0 }`. Used only when `state.params` is not null (a values ring); the handout and the presets keep `p = C(2, 0)` (pinned by S0: `ρ = 2.236`).

**5.2.5 `boundCapFor(half)`**: `Math.max(BOUND_MAX, half + 1.5)`. For half = 5 it is exactly `BOUND_MAX` (6.5), so iteration 1 is unchanged; for half = 9 it is 10.5.

**5.2.6 `cardModeOf(set, freshSet)`**: `if (freshSet && sameSet(set, freshSet)) return 'fresh'; return sameSet(set, buildSet('annulus')) ? 'handout' : 'yours'`.

**5.2.7 `mount` changes, in order**

1. Replace the first lines of `mount` (the `presetFromContext` read and the `state` literal) by:
   ```
   vals = valuesOf(ctx.preset, SETS_VALUES_SHAPE)                  // null unless a values preset
   fromVals = vals ? setFromValues(vals) : null
   startId = fromVals ? fromVals.id : presetFromContext(ctx.preset).id
   state = { presetId: startId, flags: fromVals ? { ...fromVals.flags } : defaultFlags(startId), params: fromVals ? fromVals.params : null,
             set: null, an: null, p: C(2, 0), eps: 0.5, snap: true, chip: null, cls: null, boundR: null, half: 5, fresh: null }
   state.set = buildSet(state.presetId, state.flags, state.params)
   state.an = analyse(state.set)
   state.half = viewHalfFor(state.an)
   if (fromVals && state.params) state.p = probeStartFor(state.set)
   state.fresh = fromVals ? { set: state.set } : null
   state.boundR = boundStart(state.an)
   state.cls = classifyPoint(state.set, state.p)
   ```
2. `createPlane(planeHost, { ..., xRange: [-state.half, state.half], yRange: [-state.half, state.half], ... })` (was `VIEW.xRange` / `VIEW.yRange`; the exported `VIEW` stays).
3. Bounding-disk handle: in its `snap`, replace `Math.min(BOUND_MAX, ...)` by `Math.min(boundCapFor(state.half), ...)`.
4. New inner function `refit()`: `H = viewHalfFor(state.an); if (H !== state.half) { state.half = H; plane.setView({ center: C(0, 0), unitsAcross: 2 * H }); plane.setHome(); q = probeInView(state.p, H); if (q !== state.p) { hp.set(q, { silent: true }); state.p = { re: q.re, im: q.im }; recompute({ set: false }); } }`. Call it at the end of `loadPreset(id)` (after `recompute({ set: true })`). Do not call it from `onStrict` (ticking an edge does not change the reach) or from a probe move.
   **Fix round 1.** A ring from a request can start the probe far out (the middle of a ring about 3 + 3i is (6, 3)), and a preset chip then shrinks the view back to 5: without the `probeInView` lines the probe sat outside the plane with the readout saying `probe: exterior`. `probeInView` keeps the probe while its whole dot is inside the new view (`PROBE_MARGIN` 0.25 units from the edge) and otherwise sends it to the handout's start `C(2, 0)`, which every view holds; `recompute({ set: false })` then reclassifies it against the new set, so the readout, the sentence under the plane and the explainer follow. It runs only when the half-width changes, so a probe the student dragged near the edge of an unchanged view is left alone.
5. `loadPreset(id)`: add `state.params = null` before `buildSet`; `buildSet(id, state.flags)` unchanged otherwise.
6. `onStrict()`: `state.set = buildSet(state.presetId, state.flags, state.params)`.
7. `renderProblem()` (replaces the function; `renderWhy`, `updateChips`, ... unchanged):
   ```
   problemBox.replaceChildren()
   try {
     p = problemById('1.5.2'); if (!p) return
     mode = cardModeOf(state.set, state.fresh && state.fresh.set)
     problemBox.dataset.fresh = String(mode == 'fresh')
     if (mode == 'yours') {
        problemBox.dataset.tone = 'accent'
        problemBox.append(badge 'Your set', ' You changed the set. The six answers below follow your set, not the handout\'s.')   // verbatim iteration 1
        return
     }
     problemBox.dataset.tone = 'polar'
     stmt, eq, details#sets-answer as before
     note = h('p', { id: 'sets-problem-note', class: 'muted', hidden: mode != 'fresh' })
     setText(note, mode == 'fresh' ? noteWith(problemAsked(ctx.preset, ['1.5.2'], '1.5.2'), openedOnSet(state.set)) : '')
     problemBox.append(badge 'Problem 1.5.2', ' ', stmt, note, h('div', { id: 'sets-problem-decisions', class: 'row' }, [decisionChips(p, { idPrefix: 'sets-problem' })]), details)
   } catch (e) { problemBox.replaceChildren() }
   ```
   (`h` skips an attribute whose value is `false`, so `hidden: false` writes nothing and `hidden: true` writes `hidden=""`.)
8. Hook `state()`: add `card: cardModeOf(state.set, state.fresh && state.fresh.set)` and `half: state.half`.

Unchanged: the explainer, `probeSentence`, the answers list, `#sets-readout` (`probe: interior; ε = 0.5`), every id.

**5.2.8 `renderWhy()` (fix round 1; this design first left it unchanged).** The box under the plane quoted the handout (`"1 < |z + i| ≤ 3" is a condition on the distance from -i`) for every polar set, so a ring from a request about 3 + 3i sat under a sentence about -i. `whyAboutSet(set)` returns `null` while the one cell is the handout's ring (centre -i, from 1 to 3, any edge flags): the problem's own `addressWhy` shows as before. For any other ring it returns `"<describeSet text>" is a condition on the distance from <centre>, so centre the polar picture at <centre> and the set is a ring.` (`a disk` when the inner radius is 0, `a disk with its centre left out` when that edge is open; the centre reads `the origin`, `-i`, `1 - i`, `3 + 3i`). For two or more ring cells it says `... is one condition on the distance from each of <c1> and <c2>, so centre a polar picture at each of them and the set is two disks.` A half plane keeps its Cartesian sentence. The two presets that were already wrong in iteration 1 (the punctured disk and the two disks quoted the handout) get a true sentence by the same function. The badge (`easy in Polar`) and the closing `Try the half plane: there the roles swap.` do not change.

### 5.3 mappings.js

**5.3.1 The polynomial analysis** is Appendix A (tested): `polyCoefficients(ast)`, `cartTerms`, `polarTerms`, `texCartTerms`, `texPolarTerms`, `evalCartTerms`, `evalPolarTerms`, `customHalf`.

**5.3.2 `customSpec(src)`**

```
s = String(src)
compiled = compile(s)                      // throws ParseError: let it through, the caller shows err.message
f = compiled.f
coeffs = polyCoefficients(parse(s))        // parse cannot throw after compile succeeded
if coeffs:
    ct = cartTerms(coeffs); pt = polarTerms(coeffs)
    c = (x, y) => ({ u: evalCartTerms(ct.u, x, y), v: evalCartTerms(ct.v, x, y) })
    p = (r, t) => ({ u: evalPolarTerms(pt.u, r, t), v: evalPolarTerms(pt.v, r, t) })
    cartTex = { u: texCartTerms(ct.u), v: texCartTerms(ct.v) };  polarTex = { u: texPolarTerms(pt.u), v: texPolarTerms(pt.v) }
else:
    c = (x, y) => { w = f({ re: x, im: y }); return { u: w.re, v: w.im } }
    p = (r, t) => { w = f(fromPolar(r, t));  return { u: w.re, v: w.im } }       // the same function through the polar address
    cartTex = polarTex = null
return { id: CUSTOM_ID, src: s.trim(), tex: toTex(s), f, coeffs, c, p, cartTex, polarTex, half: customHalf(f) }
```

**5.3.3 `bothAddresses` and `mappingReadout` (extended).** Add the fourth parameter `spec = null` to `bothAddresses` and the third to `mappingReadout`; inside, three substitutions and nothing else:

```
c      = spec ? spec.c(x, y)     : uvCartesian(fnId, x, y)
p      = spec ? spec.p(r, thetaK) : uvPolar(fnId, r, thetaK)
direct = spec ? spec.f({ re: x, im: y }) : compile(fnById(fnId).src).f({ re: x, im: y })
```
`mappingReadout(fnId, z, spec)` passes `spec` to `bothAddresses`; its `wText` rule is unchanged (the pole sentence stays for `recip` only; a custom pole prints `undefined`). `uvCartesian` and `uvPolar` still throw `RangeError` for an unknown id (pinned): a custom function never goes through them.

**5.3.4 `customRows()`** returns four rows with the ids of the catalogue rows (`expand`, `u`, `v`, `value`), so cell ids such as `#mappings-ex-value-polar` exist for a custom function too:

```
expand: cart  (s) => cart(T`${s.spec.tex}\ \text{with } z = x + iy`)
        polar (s) => polar(T`${s.spec.tex}\ \text{with } z = re^{i\theta}`)
u:      cart  (s) => cart(s.spec.cartTex  ? `u = ${s.spec.cartTex.u} = ${numTex(s.m.cart.u)}`   : T`u = \operatorname{Re} f = ${numTex(s.m.cart.u)}`)
        polar (s) => polar(s.spec.polarTex ? `u = ${s.spec.polarTex.u} = ${numTex(s.m.polar.u)}` : T`u = \operatorname{Re} f = ${numTex(s.m.polar.u)}`)
v:      the same with v
value:  explainerRows().find((r) => r.id === 'value')            // reused untouched (it reads only s.m)
```
`state` given to the explainer: `{ fnId, m, spec }` (`spec` is `null` for a catalogue id; the catalogue rows ignore it).

**5.3.5 `customChipLabel(src)`**: `s = src.trim(); 'custom: ' + (s.length > 24 ? s.slice(0, 23) + '…' : s)`. Measured: `z^2 - iz` gives `custom: z^2 - iz`; the 29-character `(1 + 2i)*z^2 + (3 - 3i)*z + 1` gives `custom: (1 + 2i)*z^2 + (3 - 3i)…`; a 24-character source is not cut.

**5.3.6 `openedOnFn(srcText, z)`**: `'This page opened on f(z) = ' + srcText + (z ? ' at z = ' + fmtCart(z) : '') + '.'`. For a catalogue id `srcText = fnById(id).src`, for custom `spec.src`.

**5.3.7 `mount` changes, in order**

1. After `const preset = ...`: read the values.
   ```
   vals = valuesOf(preset, MAPPINGS_VALUES_SHAPE)
   custom = null; fnError = ''; gotFn = false; gotZ = false; freshZ = null
   if vals && vals.fn !== undefined:
        if typeof vals.fn == 'string': state.fnId = vals.fn; gotFn = true
        else try { custom = customSpec(vals.fn.src); state.fnId = CUSTOM_ID; gotFn = true }
             catch (err) { fnError = err instanceof ParseError ? err.message : 'I could not read that formula.' }
   if vals && vals.z: state.z = { re: clamp(vals.z.re, -Z_LIMIT, Z_LIMIT) + 0, im: clamp(vals.z.im, -Z_LIMIT, Z_LIMIT) + 0 }; gotZ = true; freshZ = { re: state.z.re, im: state.z.im }
   state.freshFn = (gotFn || gotZ) ? state.fnId : null
   ```
   `preset.kind === 'token'` (an id on a catalogue chip) keeps working: it is read first, the values after.
2. `getF(id)`: `id === CUSTOM_ID ? custom.f : compile(fnById(id).src).f` (the existing cache keeps catalogue entries). The existing line `getF(state.fnId)` stays (it still throws for a catalogue entry that does not compile).
3. `halfOf(id) = id === CUSTOM_ID ? custom.half : W_HALF[id]`; use it for `H0` and in `setFn`.
4. `specNow() = state.fnId === CUSTOM_ID ? custom : null`; pass it to `bothAddresses(state.fnId, state.z, state.k, specNow())` (in `mount` and `updateAll`), to `mappingReadout(state.fnId, state.z, specNow())` (in `updateReadout`) and as `spec` in `explainer.update({ fnId, m, spec })`.
5. Function chips: after the loop over `MAPPING_FN_IDS`, `if (custom) { b = mk('button', 'chip', { type: 'button', id: 'mappings-fn-custom', 'aria-pressed': String(state.fnId === CUSTOM_ID), title: custom.src }); lab = mk('span'); prose(lab, customChipLabel(custom.src)); b.appendChild(lab); fnButtons.set(CUSTOM_ID, b); fnChips.appendChild(b) }`. The existing `for (const [id, b] of fnButtons) b.addEventListener('click', () => setFn(id))` then covers it (it runs after this point).
6. Error callout: `fnProblem = mk('div', 'callout', { id: 'mappings-fn-problem', role: 'alert', 'data-tone': 'accent' })` with `p#mappings-fn-error-lead` (text: the lead of 2.6) and `p#mappings-fn-error` (`textContent = fnError`); `hidden` when `fnError === ''`; appended to `fnPanel` after `fnNote`. The click handler of every function chip hides it (`fnProblem.hidden = true`) before `setFn(id)`.
7. `setFn(id, { initial })`: `fnNote` text is `fnById(id).note` for a catalogue id and the custom note of 2.6 for `CUSTOM_ID` (`custom.coeffs ? polynomial sentence : numbers-only sentence`); `explainer.setRows(id === CUSTOM_ID ? customRows() : explainerRows())` (skip on the first call: the explainer is created in `mount` with `state.fnId === CUSTOM_ID ? customRows() : explainerRows()`); **never call `fnById(CUSTOM_ID)`**: it returns `null` for an id that is not in the catalogue, so a `.src`, `.note` or `.label` read on it is a TypeError. Every place that reads a catalogue field branches on `CUSTOM_ID` first (the chip loop over `MAPPING_FN_IDS` never sees it); `renderProblemCallout(problemBox, cardProblemId(), { fresh })` with
   ```
   cardProblemId() = (state.fnId === 'sq-plus-iz' || state.fnId === CUSTOM_ID) ? '2.1.1' : null
   fresh = state.freshFn !== null && state.fnId === state.freshFn
   ```
8. `renderProblemCallout(box, problemId, { fresh = false } = {})` keeps its body and adds, between the statement paragraph and the "why" paragraph: `p#mappings-problem-note.muted` (`hidden` unless `fresh`; text `noteWith(problemAsked(preset, ['2.1.1'], '2.1.1'), openedOnFn(srcText, gotZ ? freshZ : null))`) and `div.row#mappings-problem-decisions` holding `decisionChips(p, { idPrefix: 'mappings-problem' })`; `box.dataset.fresh = String(fresh)`; the box is hidden (`box.hidden = true`) when `problemId` is null, as before.
   `srcText` is `custom.src` when `state.freshFn === CUSTOM_ID`, else `fnById(state.freshFn).src`; `freshZ` is the z the request carried (the copy taken in step 1; `null` when the request had no z).
9. Lab hand-off: `fn: state.fnId === CUSTOM_ID ? { src: custom.src } : state.fnId`; `problem: state.fnId === 'sq-plus-iz' ? '2.1.1' : null` (unchanged).
10. Hook: `mv.mappings.state()` adds `custom: custom ? custom.src : null`.
11. Video host: `videoHost = mk('div', '', { id: 'mappings-video-host' })`, placed in `el.append(...)` **between `twoPlanes` and `motionPanel`**. **Fix round 1:** `videoHost.hidden = true` at creation. An empty `div` is still a flex child of `.station` (gap 24 px), so with no manifest entry the planes and the motion panel were 48 px apart instead of iteration 1's 24 px.
12. After `el.append(...)` and the planes exist (right after `flushImage()` at the end of the first render): 
    ```
    videoPanel(videoHost, 'motion-time').then((panel) => { if (destroyed) { if (panel) panel.remove() } else if (panel) videoHost.hidden = false }, () => {})
    ```
    (`videoPanel` never rejects after its own checks; the second callback swallows `assertElement` and any other surprise so a failure can never reach the console as an error.) The panel's own CSS and listeners belong to `listen.js`.

Nothing else changes: `drawCartAddress(c2, pl, w, { names: { x: 'u', y: 'v' } })`, `GRID_STYLE`, `buildStationLinks` and the whole morph machinery are untouched.

### 5.4 linear.js

**5.4.1 Pure additions** (all placed before `threadBadges`, i.e. in the "inputs, grids, images" and "text" sections, except `decorateCard`, which goes after `chipRow`):

```
shapeFromValue(v):
   if v === 'x2' or v === 'unit': return v
   if not an object: return undefined
   if v.kind == 'verticalLine'   and finite v.x and |v.x| <= 5:  return v.x === 2 ? 'x2' : { kind: 'verticalLine',   x: v.x + 0 }
   if v.kind == 'horizontalLine' and finite v.y and |v.y| <= 4:  return { kind: 'horizontalLine', y: v.y + 0 }
   if v.kind == 'circle' and finite center.re, center.im with |.| <= 4 and finite r with 0 < r <= 4:
        return (center is 0 and r === 1) ? 'unit' : { kind: 'circle', center: { re: center.re + 0, im: center.im + 0 }, r: r + 0 }
   return undefined
composeFromValue(v): v with finite v.c.re, v.c.im, v.d.re, v.d.im → { c: copy, d: copy } else undefined
shapeCurve(shape):
   vertical   → verticalLine(shape.x, { yRange: LINE_Y_RANGE, n: 128 })
   horizontal → horizontalLine(shape.y, { xRange: LINE_X_RANGE, n: 128 })
   circle     → circle(C(shape.center.re, shape.center.im), shape.r, { n: 128 })
   else null
absAbout(c): zero → '|z|'; real → '|z - 2|' or '|z + 2|'; imaginary → '|z - 2i|' or '|z + i|' (a coefficient 1 prints 'i'); else '|z - (' + fmtCart(c) + ')|'
shapeLabel(shape): vertical → 'The line x = ' + fmtNum(x); horizontal → 'The line y = ' + fmtNum(y); circle → 'The circle ' + absAbout(center) + ' = ' + fmtNum(r)
inputLabel(input, shape): 'x2' → 'The line x = 2'; 'unit' → 'The unit circle'; 'stroke' → 'Your own stroke'; 'custom' → shapeLabel(shape)
keyFromValues(clean, preset):
   asked = preset && typeof preset.problem == 'string' ? preset.problem : null
   if asked in PRESETS: return asked
   if clean.compose: return 'P3'
   if clean.input == 'unit' or (clean.input is an object with kind 'circle'): return 'P4'
   return '2.1.3'
exceedsView(points, halfW, halfH, margin = 0.3): points.some(p => |p.re| > halfW - margin or |p.im| > halfH - margin)
openedOnLinear(a, b, label, compose):
   'This page opened on a = ' + fmtCart(a) + ', b = ' + fmtCart(b) + ' and ' + lowerFirst(label) + '.'
   + (compose ? ' The composition panel opened on c = ' + fmtCart(compose.c) + ' and d = ' + fmtCart(compose.d) + '.' : '')
labRequest({ a, b, input, shape }): as before, plus
   shapes = input == 'x2' ? [...] : input == 'unit' ? [...] : input == 'custom' && shape ? [ labShape(shape) ] : []
   labShape(shape) = the shape itself ({ kind: 'verticalLine', x } | { kind: 'horizontalLine', y } | { kind: 'circle', center, r }) copied
   problem = (input == 'x2' && fn == 'linear-i') ? '2.1.3' : (input == 'unit' && fn == 'linear-1i') ? 'P4' : null     // unchanged: custom never claims a problem
```
`STAGE_HALF = Object.freeze({ w: 5.4, h: 4.5 })` is a new module constant; it must equal the `stageOpts` ranges (comment says so).

**5.4.2 `decorateCard(host, problemId, note)`** (after `chipRow`; the locked regions are not touched):

```
function decorateCard(host, problemId, note) {
  host.dataset.fresh = String(note !== '')
  p = problemById(problemId); statement = host.querySelector('.ln-statement')
  if (!p || !statement) return                                   // renderProblemCard hid the host for an unknown id
  noteEl = mk('p', 'muted', { id: 'linear-problem-note' }); noteEl.textContent = note; noteEl.hidden = note === ''
  row = mk('div', 'row', { id: 'linear-problem-decisions' }); row.appendChild(decisionChips(p, { idPrefix: 'linear-problem' }))
  statement.after(noteEl, row)
}
```
`renderProblemCard` (locked) still builds title, statement, why line, working and answer; `decorateCard` runs after every call of it. The `renderProblemCard` call sites are two: the mount (first card) and `loadPreset`.

**5.4.3 `mount` changes, in order**

1. Values and key:
   ```
   vals = valuesOf(ctx.preset, LINEAR_VALUES_SHAPE); gotValues = applied(vals)
   { key: key0, input: input0, unknown } = resolvePreset(ctx.preset)        // a values preset resolves to ('2.1.3', 'x2', null)
   startKey = gotValues ? keyFromValues(vals, ctx.preset) : key0
   P0 = PRESETS[startKey]
   startInput = P0.input (or input0 when not gotValues, as before); startShape = null
   if vals && vals.input !== undefined:  if typeof vals.input == 'string': startInput = vals.input  else: startInput = 'custom'; startShape = vals.input
   ```
   (`P0.input` for key `P4` is `'unit'`, for `P3` and `2.1.3` it is `'x2'`; `input0` equals it for a non-values preset.)
2. `S`: `a: copyZ(vals && vals.a ? vals.a : P0.a)`, `b` likewise, `c`, `d` from `vals.compose` when present (else `COMPOSE_DEFAULTS`), `input: startInput`, `shape: startShape`, `clock: startInput === 'stroke' ? 0.5 : P0.t`, `grid: P0.grid`, rest as before.
3. After `cInput`/`dInput` are created: when `vals && vals.compose`, `cInput.value = fmtCart(S.c); dInput.value = fmtCart(S.d)` (ASCII, which `parseConstant` reads back).
4. Card: `disposeCard = renderProblemCard(card, P0.card)`, then `decorateCard(card, P0.card, gotValues ? noteWith(problemAsked(ctx.preset, ['2.1.3', 'P3', 'P4'], startKey), openedOnLinear(S.a, S.b, inputLabel(S.input, S.shape), vals && vals.compose ? { c: S.c, d: S.d } : null)) : '')`. (The note is about the key the page opened on: `problemAsked` falls back to `startKey`, not to `'2.1.3'`.)
5. The `custom` chip: right after `inputsRow` is created: `if (S.shape) { b = mk('button', 'chip', { type: 'button', id: 'linear-input-custom', 'aria-pressed': 'false' }, shapeLabel(S.shape)); inputsRow.buttons.set('custom', b); inputsRow.wrap.querySelector('.chips').appendChild(b) }`. The existing loops over `inputsRow.buttons` (setChips, click listeners) cover it. `setInput('custom')` is the existing function: it sets `S.input`, turns draw mode off (`kind === 'stroke'` is false) and flushes.
6. `flush()`: `S.inCurve = S.input === 'stroke' ? S.stroke : S.input === 'custom' ? shapeCurve(S.shape) : inputCurve(S.input)`.
7. Glyph row (`readPanel` is built before the glyph; `S.a` exists):
   ```
   glyph = moveGlyph(S.a, { size: '2rem', id: 'linear-glyph' })
   readRow = mk('div', 'ln-readrow', { id: 'linear-readrow' }); readRow.append(glyph, readout)
   readPanel.append(readRow, zeroNote, stairsHost, stairsNote)        // was readPanel.append(readout, zeroNote, stairsHost, stairsNote)
   ```
   and in `flush()`, right after `prose(readout, readoutText(S.a, S.b))`: `updateGlyph(glyph, S.a)` (a cached no-op when `a` did not change).
8. `loadPreset(key)`: after `renderProblemCard(card, p.card)` add `decorateCard(card, p.card, '')`. (`S.shape` and the custom chip stay; `S.input` becomes `p.input`.)
9. Fit: right after the first `flushNow()` (still before the hooks, so L20 holds):
   ```
   if (gotValues && S.inCurve) {
      pts = S.inCurve.points.concat(S.pieces.flatMap((pc) => pc.points))
      if (exceedsView(pts, STAGE_HALF.w, STAGE_HALF.h)) { fitBoth(); flushNow() }
   }
   ```
10. `labBtn` click: `labRequest({ a: S.a, b: S.b, input: S.input, shape: S.shape })`.
11. Hook: `state()` adds `shape: S.shape ? JSON.parse(JSON.stringify(S.shape)) : null`.
12. CSS (inside `STYLE`, before the first `@media`): `.ln-readrow{display:flex;align-items:flex-start;gap:var(--space-2)}` `.ln-readrow .readout{flex:1 1 auto;min-width:0}` `.ln-readrow .move-glyph{flex:none;margin-top:.15rem}`.

Source hygiene (pins): no `.t =`, no second `createLabelPlacer(c, p)`, no `mk('summary'`, no code added between `function threadBadges(ctx) {` and `function chipRow(`.

### 5.5 powermap.js

**5.5.1 The horizontal line.** Constant `X_RANGE = [-4, 4]` next to `Y_RANGE`. Replace the stated lines only (the rest of the file is untouched):

```
strokeFor(state):  line → state.axis === 'y' ? horizontalLine(state.c, { xRange: X_RANGE, n: 128 }) : verticalLine(state.c, { yRange: Y_RANGE, n: 128 })
probeOf(state):    line → state.axis === 'y' ? { z: { re: X_RANGE[0] + 8 * state.t, im: state.c }, t } : { z: { re: state.c, im: Y_RANGE[0] + 8 * state.t }, t }
derive(...):       where = line ? (state.axis === 'y' ? 'x = ' + fmtNum(z.re) : 'y = ' + fmtNum(z.im)) : whereSector(...)
                   the returned object gains  axis: state.axis === 'y' ? 'y' : 'x'
lineReadout(c, n, axis = 'x'):
   axis y: n = 2 and c = 0 → 'y = 0; image: the positive real axis (u ≥ 0, v = 0), the parabola has collapsed; focus 0; vertex 0'
           n = 2           → 'y = ' + c + '; image: u = v²/' + 4c² + ' - ' + c² + '; focus 0; vertex ' + (-c²)
           else            → 'image of y = ' + c + ' under z^' + n
   axis x: unchanged
lineFact(c, n, axis = 'x'):
   axis y: n = 2, c = 0 → 'The line y = 0 is the real axis. Squaring sends x to x², so it lands on the positive real axis, twice over.'
           n = 2         → 'Focus 0 and directrix u = ' + (-2c²) + ': every point of the parabola is as far from 0 as from that line.'
           c = 0, n even → 'The line y = 0 is the real axis. Its power ' + n + ' stays on the real axis, covered twice over.'
           c = 0         → 'The line y = 0 is the real axis. Its power ' + n + ' stays on the real axis and covers it once.'
           else          → 'Nearest point of the image to 0: the image of the point ' + c + 'i, at distance ' + |c|^n + ' from 0.'
   axis x: unchanged
srText(state): axis y: head 'Line y equals ' + c + ', power ' + n + '. '; n = 2, c = 0 → head + 'Image: the positive real axis, covered twice.';
               n = 2 → head + 'Image: the parabola u = v squared over ' + 4c² + ' minus ' + c² + ', focus 0.'; else head + 'Image: the curve z to the power ' + n + ' of that line.'
tText(s): line → 't = ' + t + ' (' + (s.axis === 'y' ? 'x' : 'y') + ' = ' + (-4 + 8t) + ')'
labRequest(state): the line shape is state.axis === 'y' ? { kind: 'horizontalLine', y: state.c } : { kind: 'verticalLine', x: state.c };
                   problem '2.1.2' only when the input is a line with axis !== 'y', n = 2, c = 2 (otherwise as before)
ledeFor(input, axis = 'x'): the line sentence ends 'the line y = 2 bends into a parabola.' for 'y'
rowsFor(mode, axis = 'x'): the 'test' row for a line with axis y:
   cart  n != 2 → { text: 'No short formula: eliminating x from a degree-' + n + ' polynomial is the hard way.' }
         c = 0  → { text: 'y = 0: the parabola has collapsed onto the positive real axis.' }
         else   → cart(T`\dfrac{v^2}{4c^2} - c^2 = ${fmtNum(v²/(4c²) - c²)} = u`)
   polar zero  → { text: c = 0 ? 'z = 0 is on the line y = 0 but has no angle.' : 'z = 0 is not on the line.' }
         n = 2  → polar(T`\rho(1 - \cos\varphi) = 2c^2:\ ${rho}(1 - ${par(cos argW)}) = ${rho(1 - cos argW)} = ${2c²}`)
         else   → polar(T`\rho\sin^{${n}}\theta = c^{${n}}:\ ${fmtNum(rho * sin(theta) ** n)} = ${fmtNum(c ** n)}`)
   the x rows are unchanged; `native` stays (s) => (s.n === 2 ? 'cart' : 'polar')
```
`par(x)`, `TX`, `T` are the file's existing helpers. Every changed function keeps its old result for a state with no `axis` or `axis: 'x'` (the iteration-1 unit tests call them that way).

**5.5.2 Values.**

```
VALUES_SHAPE = {
  n:      (v) => Number.isInteger(v) && v >= 2 && v <= 6 ? v : undefined,
  line:   (v) => v && (v.axis === 'x' || v.axis === 'y') && Number.isFinite(v.c) && Math.abs(v.c) <= 3 ? { axis: v.axis, c: snapC(v.c) } : undefined,
  sector: (v) => { if (!v || !finite(v.theta0) || !finite(v.theta1)) return undefined
                   a = stepOf(v.theta0); b = stepOf(v.theta1)
                   if |v.theta0 - a * STEP| > 1e-6 or |v.theta1 - b * STEP| > 1e-6 or b - a < 1 or b - a > 71: return undefined
                   return { aStep: a, bStep: b } } }
valuesState(clean, preset):                    // pure
   if clean == null: return null
   wantSector = !!preset && preset.problem === '2.2.1'
   input = null
   if clean.sector and (wantSector or not clean.line): input = 'sector'
   else if clean.line: input = 'line'
   if input == null and clean.n === undefined: return null
   if input == null: input = wantSector ? 'sector' : 'line'
   st = { ...presetFor({ kind: 'problem', id: input == 'sector' ? '2.2.1' : '2.1.2' }), input }
   if clean.n !== undefined: st.n = clean.n
   if input == 'line' and clean.line:     st.c = clean.line.c; st.axis = clean.line.axis
   if input == 'sector' and clean.sector: st.aStep = clean.sector.aStep; st.bStep = clean.sector.bStep
   if !st.axis: st.axis = 'x'
   return st
openedOn(st): line   → 'This page opened on the line ' + st.axis + ' = ' + fmtNum(st.c) + ' under w = z^' + st.n + '.'
              sector → 'This page opened on the sector ' + angWord(a) + ' < arg z < ' + angWord(b) + ' under w = z^' + st.n + '.'
   angWord(x) = exactAngle(x) ? fmtAngle(x, { unicode: true }) : (exactStep36(x) || fmtNum(x))
```
`snapC` is the file's own (nearest 0.1 in [-3, 3]); `STEP`, `stepOf`, `presetFor` too.

**5.5.3 `mount` changes, in order**

1. `vals = valuesOf(ctx && ctx.preset, VALUES_SHAPE); fromVals = vals ? valuesState(vals, ctx.preset) : null; st = fromVals || presetFor(ctx && ctx.preset); if (!st.axis) st.axis = 'x'; fresh = fromVals ? { input: st.input, n: st.n, c: st.c, axis: st.axis, aStep: st.aStep, bStep: st.bStep } : null`.
2. The template needs no change (the card is built in JS by `renderProblem`, step 7). `syncLede` calls `ledeFor(st.input, st.axis)`; `explainer = createExplainer(..., rows: rowsFor(st.input, st.axis))`; `setInput` calls `explainer.setRows(rowsFor(kind, st.axis))`.
3. Handles: the `line` handle starts at `st.axis === 'y' ? { re: 0, im: st.c } : { re: st.c, im: 0 }`; its `snap` is `(z) => (st.axis === 'y' ? { re: 0, im: snapC(z.im) } : { re: snapC(z.re), im: 0 })`; its `onDrag` sets `st.c = st.axis === 'y' ? z.im : z.re`. **Keep the whole `addPoint({ id: 'line', ... zOrder: 1, ...` statement's first line as it is** (the pin reads `[^\n]*zOrder: 1,` on that line). The probe `hP`: initial `z` as before; `snap` for a line is `st.axis === 'y' ? { re: clampTenth(z.re, X_RANGE), im: st.c } : { re: st.c, im: clampTenth(z.im, Y_RANGE) }` with `clampTenth(v, [lo, hi]) = Math.max(lo, Math.min(hi, Number((Math.round(v / 0.1) * 0.1).toFixed(1)) + 0))`; its `onDrag` sets `st.t = st.axis === 'y' ? (z.re - X_RANGE[0]) / 8 : (z.im - Y_RANGE[0]) / 8`. No `zOrder` on the probe.
4. `syncProbe`: the readout and the fact call `lineReadout(st.c, st.n, st.axis)` and `lineFact(st.c, st.n, st.axis)`; `hLine` is placed with `hLine.set(st.axis === 'y' ? { re: 0, im: st.c } : { re: st.c, im: 0 }, { silent: true })` when `st.c` changed from outside (only on mount: the handle is the source of `st.c` afterwards, as in iteration 1).
5. `syncControls`: `ui.inLine.textContent = st.axis === 'y' ? 'Line y = c' : 'Line x = c'`.
6. `renderNotice`: for a line, `prose(p, st.axis === 'y' ? TRY_LINE_Y : TRY_LINE)`.
7. `renderProblem` (replaces the function):
   ```
   id = st.input === 'line' ? '2.1.2' : '2.2.1'
   exact = st.input === 'line' ? (st.n === 2 && st.c === 2 && st.axis !== 'y') : (st.n === 3 && st.aStep === 0 && st.bStep === 9)
   if shownProblem !== id:
        shownProblem = id; p = problemById(id); ui.problem.textContent = ''; if !p return
        h2 'Problem ' + p.id; head (badge + statement); aha; routes; why; det#powermap-answer      // as before
        note = mk('p', 'muted', { id: 'powermap-problem-note' })
        decisions = mk('div', 'row', { id: 'powermap-problem-decisions' }); decisions.appendChild(decisionChips(p, { idPrefix: 'powermap-problem' }))
        ui.problem.append(h2, head, note, decisions, aha, routes, why, det)         // the note moves up from the last place
   note = ui.problem.querySelector('#powermap-problem-note')
   freshNow = fresh !== null and st.input === fresh.input and st.n === fresh.n and
              (st.input === 'line' ? st.c === fresh.c and st.axis === fresh.axis : st.aStep === fresh.aStep and st.bStep === fresh.bStep)
   the = id === '2.1.2' ? 'n = 2, x = 2' : 'n = 3, 0 < arg z < π/4'
   text = freshNow ? noteWith(problemAsked(ctx.preset, ['2.1.2', '2.2.1'], id), openedOn(st))
        : exact ? 'This is problem ' + id + ' exactly (' + the + ').' : 'You changed the input. The problem itself is ' + the + '.'
   if note.textContent !== text: note.textContent = text
   ui.problem.dataset.fresh = String(freshNow)
   ```
   `problemAsked(..., id)` falls back to the card's own id; if the request named the other problem the note is still about the card on the page.
8. The Lab hand-off uses the extended `labRequest(st)`.

### 5.6 principal-root.js

```
PRINCIPAL_VALUES_SHAPE = {
  w: (v) => v && Number.isFinite(v.re) && Number.isFinite(v.im) && Math.hypot(v.re, v.im) <= W_MAX ? { re: v.re + 0, im: v.im + 0 } : undefined,
  n: (v) => Number.isInteger(v) && v >= N_MIN && v <= N_MAX ? v + 0 : undefined }
stateFromValues(clean):
   if clean == null or (clean.w === undefined and clean.n === undefined): return null
   base = PRESETS['2i']
   n = clean.n !== undefined ? clean.n : base.n
   return { w: clean.w ? { re: clean.w.re, im: clean.w.im } : { re: base.w.re, im: base.w.im }, n, sel: 1 }
openedOnPrincipal(w, n): 'This page opened on w = ' + fmtCart(w, 3, { tiny: true }) + ' with n = ' + n + '.'
```

**mount changes, in order**

1. `vals = valuesOf(preset, PRINCIPAL_VALUES_SHAPE); fromVals = vals ? stateFromValues(vals) : null; S = fromVals || initialState(preset); S.fresh = fromVals ? { w: { re: S.w.re, im: S.w.im }, n: S.n } : null` (the next lines `S.userView = false; ...` stay).
2. `renderProblem(host, p, neutral, opts = {})`:
   ```
   host.textContent = ''
   if !p: ... neutral card exactly as before; return
   tones, head as before
   kids = [head]
   if opts.ghost:
        if opts.note: kids.push(mk('p', 'muted', null, opts.note))
        row = mk('div', 'row'); row.appendChild(decisionChips(p, { idPrefix: 'principal-root-ghost-' + opts.ghostIndex, meaning: false }))
   else:
        note = mk('p', 'muted', { id: 'principal-root-problem-note' }, opts.note || ''); note.hidden = !opts.note; kids.push(note)
        row = mk('div', 'row', { id: 'principal-root-problem-decisions' }); row.appendChild(decisionChips(p, { idPrefix: 'principal-root-problem' }))
   kids.push(row); why as before
   host.append(...kids, why)
   ```
   (A ghost keeps no id on its note and uses `meaning: false`, so its chips are spans: no duplicate id, no id-less button.)
   **Fix round 1.** A span chip is 36 px tall (`.chip` min-height 2.25rem) and the live button chip is 44 px (`button.chip` min-height `var(--tap)`), so every ghost was 8 px shorter than the card it stands in for, and the plane moved 8 px for the longest numbers and at 320 px. The station's CSS now has `.rt-slot-ghost .decision-chip { min-height: var(--tap); }`, which makes the two heights equal at every width.
3. `mountSlot(slot, live, variants, neutral)`: `variants` becomes a list of `{ p, note }`; for index i: `renderProblem(ghost, v.p, neutral, { note: v.note, ghost: true, ghostIndex: i })`. In `mount`: `mountSlot(problemSlot, problemBox, [{ p: problemById('2.2.2'), note: '' }, { p: problemById('2.2.2'), note: noteWith('2.2.2', openedOnPrincipal({ re: -28.284, im: -28.284 }, 6)) }, { p: null, note: '' }], NEUTRAL_TEXT)`. The sample numbers are the longest a card can print (|w| at most 40, n at most 6), so the slot is as tall as the tallest real state.
4. `activeProblem()` returns `{ p, fresh }`:
   ```
   if S.fresh and eq(S.w, S.fresh.w) and S.n === S.fresh.n: return { p: problemById('2.2.2'), fresh: true }
   return eq(S.w, { re: 0, im: 2 }) && S.n === 2 ? { p: problemById('2.2.2'), fresh: false } : { p: null, fresh: false }
   ```
5. `refreshProblem()`:
   ```
   if S.sweep.mode !== 'idle': return
   { p, fresh } = activeProblem(); key = p ? (fresh ? 'fresh' : p.id) : null
   if key === lastProblemId: return
   lastProblemId = key
   renderProblem(problemBox, p, NEUTRAL_TEXT, { note: fresh ? noteWith(problemAsked(preset, ['2.2.2'], '2.2.2'), openedOnPrincipal(S.fresh.w, S.fresh.n)) : '' })
   problemBox.dataset.fresh = String(fresh)
   for each [id, chip] of chipById: aria-current "true" iff p && id === p.id      // as before
   ```
6. Hook: `state()` adds `fresh: S.fresh !== null && eq(S.w, S.fresh.w) && S.n === S.fresh.n`.

`principalReadout`, `pickNote`, `trapNote`, the sweep and the plane are untouched.

---

## 6. Mathematics

### 6.1 Formulas used

* **Ring membership** (sets). For a ring `lo (<|≤) |z − c| (<|≤) hi` write ρ = |z − c| and φ for a name of arg(z − c). The test uses only ρ (so every name φ gives the same answer). Distance to the edges: |ρ − lo| and |ρ − hi|; the largest ε with the open disk D_ε(p) on one side of every edge is ε_max = min(|ρ − lo|, |ρ − hi|) (0 on an edge). Open iff no edge is in S; closed iff every edge is in S; bounded iff every cell is a ring with finite `hi`; connected iff there is one cell; domain = open and connected; region = connected (a domain plus some, none or all of its boundary).
* **Bounding radius and view.** R = max over cells of (|c| + hi) (the farthest point of S from 0 is at distance |c| + hi along the ray from 0 through c); the square view has half-width H = max(5, ⌈R + 0.4⌉).
* **Polynomial in z, both addresses** (mappings, custom function). z = x + iy, z = re^{iθ}. (x + iy)^k = Σ_{j=0..k} C(k, j) x^{k−j} (iy)^j with i^j = 1, i, −1, −i for j = 0, 1, 2, 3 (mod 4). For c = a + bi: Re(c z^k) = a Re z^k − b Im z^k and Im(c z^k) = a Im z^k + b Re z^k. In polar, c z^k = r^k (a + bi)(cos kθ + i sin kθ), so u_k = r^k (a cos kθ − b sin kθ), v_k = r^k (a sin kθ + b cos kθ); the constant term (k = 0) is a + bi. Because θ appears only inside cos and sin, every name θ + 2πk of arg z gives the same u and v.
* **Lines under z²** (powermap, n = 2). x = c: z = c + iy ↦ u = c² − y², v = 2cy; eliminating y = v/(2c): u = c² − v²/(4c²). y = c: z = x + ic ↦ u = x² − c², v = 2cx; x = v/(2c): u = v²/(4c²) − c². Polar: r cos θ = c and (ρ, φ) = (r², 2θ) give ρ(1 + cos φ) = 2r² cos²θ = 2c²; r sin θ = c gives ρ(1 − cos φ) = 2r² sin²θ = 2c². Both curves are parabolas with the focus at 0: vertex c² and directrix u = 2c² for x = c (opens left); vertex −c² and directrix u = −2c² for y = c (opens right). For c = 0 the parabola collapses: x = 0 maps to the negative real axis (iy ↦ −y²), y = 0 to the positive real axis (x ↦ x²), each covered twice.
* **Sector under zⁿ** (powermap). (r, θ) ↦ (rⁿ, nθ), so 0 < arg z < α maps onto 0 < arg w < nα; it overlaps itself exactly when nα > 2π.
* **Linear map** (linear). f(z) = az + b is a spin by Arg a, a stretch by |a| and a slide by b. A line through p with direction d goes to the line through f(p) with direction ad. A circle |z − z₀| = R goes to |w − f(z₀)| = |a|R. Composition: a(cz + d) + b = (ac)z + (ad + b), with |ac| = |a||c| and Arg(ac) ≡ Arg a + Arg c (mod 2π); the home step is `wrapArg` of the sum.
* **Principal root** (principal-root). w^{1/n} = |w|^{1/n} e^{i Arg(w)/n}; the other roots are |w|^{1/n} e^{i(Arg w + 2πk)/n}, k = 1, ..., n − 1. A negative real w with odd n has a real root (k = (n − 1)/2) that is not the principal one.
* **Glyph.** turn = Arg a in degrees (one decimal unless whole; `0` for a = 2), stretch = |a| (three decimals, trimmed); `no move: 0` at a = 0.

### 6.2 Worked solutions, both addresses (every number hand-checked; those marked "measured" were also run)

**Problem 1.5.2 (sets; address P, names none; easy in polar because the set is one inequality in ρ).**

*Handout:* S = {z : 1 < |z + i| ≤ 3}.
* Cartesian: 1 < x² + (y + 1)² ≤ 9. Test p = 2: 2² + (0 + 1)² = 5, and 1 < 5 ≤ 9, so p is in S.
* Polar about c = −i: write z + i = ρe^{iφ}; S is 1 < ρ ≤ 3. p − c = 2 + i, ρ = √5 = 2.236, 1 < 2.236 ≤ 3: interior. ε_max = min(√5 − 1, 3 − √5) = min(1.236, 0.764) = **0.764** (measured 0.7639320225).
* Open: no (the circle ρ = 3 is in S and every disk around a point of it leaves S). Closed: no (the circle ρ = 1 is a boundary of S that is not in S). Bounded: yes, |z| ≤ |z + i| + |−i| ≤ 3 + 1 = 4 (R = |c| + 3 = **4**, reached at −4i). Boundary: {|z + i| = 1} ∪ {|z + i| = 3}. Connected: yes. Domain: no (not open). Region: yes (the domain 1 < ρ < 3 plus the outer circle).

*Fresh (goal A3):* S = {1 ≤ |z − (1 − i)| ≤ 3}, centre 1 − i, both edges kept.
* Cartesian: 1 ≤ (x − 1)² + (y + 1)² ≤ 9. Polar about c = 1 − i: 1 ≤ ρ ≤ 3.
* Probe start p = c + (1 + 3)/2 = 3 − i: Cartesian (3 − 1)² + (−1 + 1)² = 4, 1 ≤ 4 ≤ 9; polar ρ = 2, ε_max = min(2 − 1, 3 − 2) = **1**: interior.
* Open **no**, closed **yes**, bounded yes (R = |1 − i| + 3 = √2 + 3 = **4.414213562373095**), connected yes, domain **no**, region yes (the domain 1 < ρ < 3 plus all of its boundary). View half H = ⌈4.814⌉ = **5**.

*Second fresh set (view check):* centre 3 + 3i, 2 < ρ < 4: probe start 6 + 3i, ρ = 3, ε_max = 1; open yes, closed no, domain yes; R = 3√2 + 4 = **8.242640687119286**, H = ⌈8.643⌉ = **9**.

**Problem 2.1.1 (mappings; address both, names any).**

*Handout:* f(z) = z² + iz.
* Cartesian: (x + iy)² + i(x + iy) = x² − y² + 2ixy + ix − y, so **u = x² − y² − y, v = 2xy + x**.
* Polar: i = e^{iπ/2}, so f = r²e^{2iθ} + re^{i(θ + π/2)}: **u = r² cos 2θ − r sin θ, v = r² sin 2θ + r cos θ** (θ any name of arg z).
* Check z = 1 + i: Cartesian u = 1 − 1 − 1 = −1, v = 2 + 1 = 3; polar r² = 2, θ = π/4: u = 2·cos(π/2) − √2·sin(π/4) = 0 − 1 = −1, v = 2·sin(π/2) + √2·cos(π/4) = 2 + 1 = 3. w = **−1 + 3i** both ways.

*Fresh (goal A3):* f(z) = z² − iz (coefficients [0, −i, 1]).
* Cartesian: **u = x² − y² + y, v = 2xy − x** (−iz = −ix + y). Polar: −i = e^{−iπ/2}: **u = r² cos 2θ + r sin θ, v = r² sin 2θ − r cos θ**.
* z = 1 + i: u = 1 − 1 + 1 = 1, v = 2 − 1 = 1; polar u = 0 + 1 = 1, v = 2 − 1 = 1. w = **1 + i**. At z = −1 (r = 1, θ = π, or π + 2π): u = 1 − 0 + 0 = 1, v = 0 + 1 = 1 (polar u = cos 2π + sin π = 1, v = sin 2π − cos π = 1), w = **1 + i** (= (−1)² − i(−1)).
* Other formulas the generator sends (z = 1 + i): **z³ + (2 − i)z**: u = x³ − 3xy² + 2x + y, v = 3x²y − y³ − x + 2y, w = **1 + 3i** (by hand (1 + i)³ = −2 + 2i, (2 − i)(1 + i) = 3 + i, sum 1 + 3i); polar u = r³ cos 3θ + 2r cos θ + r sin θ, v = r³ sin 3θ − r cos θ + 2r sin θ. **(1 + 2i)z² + 1 − 3i**: u = x² − 4xy − y² + 1, v = 2x² + 2xy − 2y² − 3, w = **−3 − i** ((1 + 2i)(2i) = −4 + 2i, plus 1 − 3i); polar u = r² cos 2θ − 2r² sin 2θ + 1, v = 2r² cos 2θ + r² sin 2θ − 3.
* A formula with no polynomial form, **exp(z)** at 1 + i: w = e(cos 1 + i sin 1) = **1.469 + 2.287i** (measured); the table shows Re f and Im f as numbers.

**Problem 2.1.2 (powermap; address C, names none; easy in Cartesian: parametrize the line, push forward, eliminate the parameter).**

*Handout:* x = 2 under w = z². Cartesian: z = 2 + iy ↦ w = (4 − y²) + 4iy, so u = 4 − y², v = 4y; y = v/4 gives **u = 4 − v²/16**: a parabola, vertex 4 (at y = 0, z = 2, w = 4), opens left, focus 0, directrix u = 8. Polar: r cos θ = 2 and (ρ, φ) = (r², 2θ): ρ(1 + cos φ) = 2r² cos²θ = 8, i.e. √(u² + v²) + u = 8, so u² + v² = (8 − u)² and v² = 64 − 16u, the same parabola. Sample y = 1: z = 2 + i ↦ 3 + 4i, and 4 − 16/16 = 3 (checked).

*Fresh (goal A3):* x = 3: u = 9 − y², v = 6y, **u = 9 − v²/36**, vertex 9, directrix u = 18; polar ρ(1 + cos φ) = 2·9 = 18. Sample y = 1: 3 + i ↦ 8 + 6i, 9 − 36/36 = 8 (checked). Readout (measured): `x = 3; image: u = 9 - v²/36; focus 0; vertex 9`.

*Fresh, horizontal:* y = 2: z = x + 2i ↦ (x² − 4) + 4ix, u = x² − 4, v = 4x, **u = v²/16 − 4**, vertex −4 (opens right), directrix u = −8; polar r sin θ = 2: ρ(1 − cos φ) = 2r² sin²θ = 8. Sample x = 1: 1 + 2i ↦ −3 + 4i; ρ = 5, cos φ = −3/5, 5(1 + 0.6) = 8 (checked); u = 16/16 − 4 = −3 (checked). Readout (measured): `y = 2; image: u = v²/16 - 4; focus 0; vertex -4`. For y = −1: `y = -1; image: u = v²/4 - 1; focus 0; vertex -1`; for y = 3: `y = 3; image: u = v²/36 - 9; focus 0; vertex -9`.

**Problem 2.2.1 (powermap; address P, names any; easy in polar: zⁿ multiplies the angle).**

*Handout:* 0 < arg z < π/4 under w = z³. Polar: (r, θ) ↦ (r³, 3θ): every name θ in (0, π/4) becomes the name 3θ in (0, 3π/4), every length is reached: **0 < arg w < 3π/4**. Cartesian: z³ = (x³ − 3xy²) + i(3x²y − y³). Edge y = 0, x > 0: u = x³ > 0, v = 0 (the positive real axis). Edge y = x, x > 0: u = x³ − 3x³ = −2x³, v = 3x³ − x³ = 2x³, the ray v = −u with u < 0, angle 3π/4 ((1 + i)³ = −2 + 2i (checked)). The sector between is filled. Readout: `sector 0 < arg z < 0.785 (π/4); image: 0 < arg w < 2.356 (3π/4)`.

*Fresh:* 0 < arg z < π/6 under w = z²: **0 < arg w < π/3**. Cartesian: edge y = x/√3: u = x² − x²/3 = 2x²/3, v = 2x·x/√3 = 2x²/√3, v/u = √3, angle 60° = π/3 (checked). Readout (measured): `sector 0 < arg z < 0.524 (π/6); image: 0 < arg w < 1.047 (π/3)`. With α = π/2 and n = 3: `sector 0 < arg z < 1.571 (π/2); image: 0 < arg w < 4.712 (3π/2)` (270°, no overlap since 3α < 2π).

**Problem 2.1.3 (linear; address both, names any).**

*Handout:* x = 2 under f(z) = iz − 2i. Cartesian: z = 2 + iy, iz − 2i = 2i − y − 2i = −y: u = −y, v = 0, **the real axis v = 0**. Polar: a = i = e^{iπ/2}, |a| = 1: the line x = 2 passes through 2 with direction i; the spin sends the direction to i·i = −1 and 2 to 2i; the slide −2i puts the line through 0 with direction −1, the real axis. In general: a quarter turn counterclockwise, no stretch, then a slide by −2i. Sample z = 2 + 3i ↦ −3 (checked). Readout: `a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i`.

*Fresh (goal A3):* a = i, b = 1, x = 1: z = 1 + iy ↦ i(1 + iy) + 1 = (1 − y) + i: **v = 1** (u = 1 − y), the horizontal line through f(1) = 1 + i with direction a·i = −1. Sample y = 2: 1 + 2i ↦ −1 + i (checked). Readout (measured): `a = i = e^(i 1.571); b = 1; spin 90°, stretch 1, slide 1`; glyph `move: turn 90°, stretch 1`.

*Fresh, horizontal:* a = 1 + i, b = 0, y = 2: z = x + 2i ↦ (1 + i)(x + 2i) = (x − 2) + i(x + 2): u = x − 2, v = x + 2, **v = u + 4**; polar: a = √2e^{iπ/4}, the direction 1 becomes (1 + i), the point f(2i) = −2 + 2i; (checked) (−2 + 4 = 2). Sample x = 1: 1 + 2i ↦ −1 + 3i, 3 = −1 + 4 (checked). Readout (measured): `a = 1 + i = 1.414 e^(i 0.785); b = 0; spin 45°, stretch 1.414, slide 0`; glyph `move: turn 45°, stretch 1.414`.

**Problem P3 (linear; address C, names none).**

*Handout:* a = i, b = −2i, c = 1 + i, d = 1. Cartesian: a(cz + d) + b = (ac)z + (ad + b); ac = i(1 + i) = −1 + i, ad + b = i − 2i = −i. Polar: Arg a = π/2, Arg c = π/4, spins add to 3π/4 (already the home step), |a||c| = 1·√2 = √2 = |−1 + i| (checked); ad + b = i·1 − 2i = −i. Readout (measured): `ac = -1 + i; ad + b = -i`.

*Fresh:* a = 1 + i, b = 1, c = 2i, d = −1: ac = (1 + i)(2i) = −2 + 2i, ad + b = −(1 + i) + 1 = −i. Polar: Arg a + Arg c = π/4 + π/2 = 3π/4, |a||c| = √2·2 = 2√2 = |−2 + 2i| (checked). Check at z = 1: cz + d = 2i − 1, a(cz + d) = (1 + i)(−1 + 2i) = −1 + 2i − i + 2i² = −3 + i, plus b = 1 gives −2 + i; (ac)z + (ad + b) = −2 + 2i − i = −2 + i (checked). Readout (measured): `ac = -2 + 2i; ad + b = -i`.

**Problem P4 (linear; address P, names any).**

*Handout:* (1 + i)z on |z| = 1. Cartesian: w = (x − y) + i(x + y), u² + v² = 2(x² + y²) = 2: the circle |w| = √2; every point is hit, z = w/(1 + i) = w(1 − i)/2 and |z| = |w|/√2 = 1. Polar: 1 + i = √2e^{iπ/4}, z = e^{it} ↦ √2e^{i(t + π/4)}, a stretch by √2 and a spin by 45° (it covers the circle once). Readout: `a = 1 + i = 1.414 e^(i 0.785); b = 0; spin 45°, stretch 1.414, slide 0`.

*Fresh:* a = 2i, circle |z| = 3: Cartesian w = 2i(x + iy) = −2y + 2ix, u² + v² = 4(x² + y²) = 36: the circle |w| = **6**; polar 2i = 2e^{iπ/2}, w = 6e^{i(t + π/2)}. Readout (measured): `a = 2i = 2 e^(i 1.571); b = 0; spin 90°, stretch 2, slide 0`; glyph `move: turn 90°, stretch 2`. The image has radius 6, beyond the default view (|x| ≤ 5.4, |y| ≤ 4.5), so the planes refit (5.4.3 step 9).

**Problem 2.2.2 (principal-root; address P, names home).**

*Handout:* (2i)^{1/2}. Polar: |2i| = 2, Arg(2i) = π/2 (the home step); root = 2^{1/2} e^{i(π/2)/2} = √2e^{iπ/4} = **1 + i**; the other root is the step k = 1: √2e^{i5π/4} = −1 − i. Cartesian: (a + bi)² = 2i gives a² − b² = 0 and 2ab = 2, so a = b = ±1; the principal one is the one reached from the home step, 1 + i. Readout (measured): `w = 2i; n = 2; |w| = 2; Arg w = 1.571 (π/2); w^(1/n) = 1.414 e^(i π/4) = 1 + i`.

*Fresh (goal A3):* w = −8, n = 3. Polar: |w| = 8, Arg w = π (not −π), principal root 8^{1/3} e^{iπ/3} = **2e^{iπ/3} = 1 + √3 i = 1 + 1.732i**; the other roots 2e^{iπ} = −2 (k = 1, the real root: not principal) and 2e^{i5π/3} = 1 − √3 i (k = 2). Cartesian: (a + bi)³ = −8 gives a³ − 3ab² = −8 and b(3a² − b²) = 0: b = 0 gives a = −2 (the trap), b² = 3a² gives a = 1, b = ±√3: the long way, a cubic. Readout (measured): `w = -8; n = 3; |w| = 8; Arg w = 3.142 (π); w^(1/n) = 2 e^(i π/3) = 1 + 1.732i`; the trap note (measured): `-8 is a negative real number and n = 3 is odd, so it has a real root, -2. That root is not the principal one. The principal root uses Arg w = π and lands at angle π/3: 1 + 1.732i.` With w = 2i and n = 3: `w = 2i; n = 3; |w| = 2; Arg w = 1.571 (π/2); w^(1/n) = 1.26 e^(i π/6) = 1.091 + 0.63i`.

### 6.3 The numbers the tests assert (summary)

| What | Value |
|---|---|
| ε_max at p = 2, handout set | 0.7639320225002102 (3 decimals 0.764) |
| ε_max at p = 3 − i, A3 set | 1 |
| R of the A3 set | 4.414213562373095 (view half 5) |
| R of the 3 + 3i, 2 < ρ < 4 set | 8.242640687119286 (view half 9; probe start 6 + 3i) |
| w of z² − iz at 1 + i and at −1 | 1 + i both |
| w of z³ + (2 − i)z at 1 + i | 1 + 3i |
| w of (1 + 2i)z² + 1 − 3i at 1 + i | −3 − i |
| w of exp(z) at 1 + i | 1.469 + 2.287i |
| powermap readouts | `x = 3; image: u = 9 - v²/36; focus 0; vertex 9`; `y = 2; image: u = v²/16 - 4; focus 0; vertex -4`; `y = -1; image: u = v²/4 - 1; focus 0; vertex -1` |
| sector readouts | `sector 0 < arg z < 0.524 (π/6); image: 0 < arg w < 1.047 (π/3)`; `... 0 < arg z < 1.571 (π/2); image: 0 < arg w < 4.712 (3π/2)` |
| linear readouts and glyphs | A3: `... spin 90°, stretch 1, slide 1`, `move: turn 90°, stretch 1`; P4 fresh: `a = 2i = 2 e^(i 1.571); b = 0; spin 90°, stretch 2, slide 0`, `move: turn 90°, stretch 2`; a = 1 + i: `move: turn 45°, stretch 1.414`; a = 0: `no move: 0` |
| P3 fresh | `ac = -2 + 2i; ad + b = -i` |
| principal root of −8, n = 3 | `2 e^(i π/3) = 1 + 1.732i`; real root −2 |

---

## 7. Verification plan

### 7.1 Unit tests: `tests/unit/i2-decisions-everywhere-b.test.mjs` (new; `node --test tests/unit/i2-decisions-everywhere-b.test.mjs`)

Imports: `* as SETS`, `* as MAP`, `* as LIN`, `* as PM` (`PM = (await import('../../js/stations/powermap.js')).internals`), `* as PR`; `valuesOf`, `freshNote` from the kit; `parse` from `parse.js`. Helper `vp(values, problem = null) = { kind: 'values', station: 'x', problem, family: problem, values }` and `near(a, b, eps = 1e-9)`.

| Id | Call | Expected |
|---|---|---|
| S1 | `JSON.stringify(SETS.buildSet('annulus').cells)` | `[{"kind":"ring","c":{"re":0,"im":-1},"lo":1,"hi":3,"loStrict":true,"hiStrict":false}]` (the iteration-1 set, unchanged) |
| S2 | `SETS.buildSet('closed', { innerStrict: false, outerStrict: false }, { center: {re: 1, im: -1}, r0: 1, r1: 3 })` | `cells` deepEqual `[{ kind: 'ring', c: {re: 1, im: -1}, lo: 1, hi: 3, loStrict: false, hiStrict: false }]`; `describeSet(...).ascii` is `1 <= |z - (1 - i)| <= 3`, `.text` is `1 ≤ |z - (1 - i)| ≤ 3` |
| S3 | `analyse` of S2's set | `open` false, `closed` true, `bounded` true, `connected` true, `domain` false, `region` true, `boundingRadius` near 4.414213562373095 (1e-12) |
| S4 | `buildSet('twodisks', {}, { center: {re: 5, im: 5}, r0: 1, r1: 2 })` against `buildSet('twodisks')` | equal JSON (params are ignored by the other presets) |
| S5 | `SETS.setFromValues(valuesOf(vp({...A3 values}), SETS.SETS_VALUES_SHAPE))` | `{ id: 'annulus', flags: { innerStrict: false, outerStrict: false }, params: { center: {re: 1, im: -1}, r0: 1, r1: 3 } }` |
| S6 | the same without flags | flags `{ innerStrict: true, outerStrict: false }` |
| S7 | `{ preset: 'punctured' }` | `{ id: 'punctured', flags: { innerStrict: true, outerStrict: true }, params: null }` |
| S8 | each of `{ preset: 'nope' }`, `r0: 3, r1: 2`, `r1: 5`, `r0: 0.1`, centre `6 + 0i`, `{ center: 'x', r0: 99 }`, `{}` | `null` (and `valuesOf` of the malformed one is `{ r0: 99 }`) |
| S9 | `valuesOf({ kind: 'problem', id: '1.5.2' }, SETS.SETS_VALUES_SHAPE)` and `valuesOf(vp({ zzz: 1 }), ...)` | `null` and `{}` |
| S10 | `SETS.viewHalfFor(analyse(set))` for the handout, the A3 set, 3 + 3i with 2 < ρ < 4 (both strict), `halfplane`, `twodisks`, `punctured` | 5, 5, 9, 5, 5, 5 |
| S11 | `SETS.probeStartFor` of the A3 set; of the 3 + 3i set | `{ re: 3, im: -1 }`; `{ re: 6, im: 3 }`; a set whose first cell is a half plane gives `{ re: 2, im: 0 }` |
| S12 | `SETS.boundCapFor(5)`, `(9)`, `(3)` | 6.5, 10.5, 6.5 |
| S13 | `SETS.cardModeOf(A3 set, A3 set)`, `(buildSet('annulus'), null)`, `(buildSet('closed'), null)`, `(buildSet('annulus'), buildSet('annulus'))` | `'fresh'`, `'handout'`, `'yours'`, `'fresh'` |
| S14 | `SETS.openedOnSet(A3 set)` | `This page opened on the set 1 ≤ |z - (1 - i)| ≤ 3.` |
| S15 | `classifyPoint(A3 set, {re: 3, im: -1})` | `kind: 'interior'`, `epsMax` 1 |
| M1 | `MAP.polyCoefficients(parse('z^2 - iz'))` | `[{re:0,im:0}, {re:0,im:-1}, {re:1,im:0}]` (re and im to 1e-12) |
| M2 | `polyCoefficients(parse(src))` for `exp(z)`, `1/z`, `z^7`, `Re(z)`, `x*z`, `z^-1`, `z^2/z` | all `null` |
| M3 | `texCartTerms(cartTerms(coeffs).u)` and `.v`, `texPolarTerms(polarTerms(coeffs).u)` and `.v` for `z^2 - iz` | `x^{2} - y^{2} + y`, `2xy - x`, `r^{2}\cos 2\theta + r\sin\theta`, `r^{2}\sin 2\theta - r\cos\theta` |
| M4 | the same for `z^2 + iz` | `x^{2} - y^{2} - y`, `2xy + x`, `r^{2}\cos 2\theta - r\sin\theta`, `r^{2}\sin 2\theta + r\cos\theta` |
| M5 | `z^3 + (2 - i)*z` | `x^{3} - 3xy^{2} + 2x + y`, `3x^{2}y - y^{3} - x + 2y`, `r^{3}\cos 3\theta + 2r\cos\theta + r\sin\theta`, `r^{3}\sin 3\theta - r\cos\theta + 2r\sin\theta` |
| M6 | `(1 + 2i)*z^2 + 1 - 3i` | `x^{2} - 4xy - y^{2} + 1`, `2x^{2} + 2xy - 2y^{2} - 3`, `r^{2}\cos 2\theta - 2r^{2}\sin 2\theta + 1`, `2r^{2}\cos 2\theta + r^{2}\sin 2\theta - 3` |
| M7 | `2z^2 - 3`; `0.5z^2 + z` | `2x^{2} - 2y^{2} - 3`, `4xy`; `0.5x^{2} - 0.5y^{2} + x`, `xy + y` |
| M8 | `const m = MAP.bothAddresses('custom', {re: 1, im: 1}, 0, MAP.customSpec('z^2 - iz'))` | `cart.u` 1, `cart.v` 1, `polar.u` near 1, `polar.v` near 1 (1e-9), `direct` `{re: 1, im: 1}`, `agree` true; with `k = 1`: `thetaK` near 0.7853981633974483 + 2π, same u, v |
| M9 | `MAP.mappingReadout('custom', z, spec)` for (`z^2 - iz`, 1 + i), (`z^2 - iz`, −1), (`z^3 + (2 - i)*z`, 1 + i), (`(1 + 2i)*z^2 + 1 - 3i`, 1 + i), (`exp(z)`, 1 + i), (`1/z`, 0), (`z^2 - iz`, 0) | `z = 1 + i; w = 1 + i; u = 1; v = 1; polar: u = 1; v = 1`; `z = -1; w = 1 + i; u = 1; v = 1; polar: u = 1; v = 1`; `z = 1 + i; w = 1 + 3i; u = 1; v = 3; polar: u = 1; v = 3`; `z = 1 + i; w = -3 - i; u = -3; v = -1; polar: u = -3; v = -1`; `z = 1 + i; w = 1.469 + 2.287i; u = 1.469; v = 2.287; polar: u = 1.469; v = 2.287`; `z = 0; w = undefined; u = undefined; v = undefined; polar: u = undefined; v = undefined`; `z = 0; w = 0; u = 0; v = 0; polar: u = 0; v = 0` |
| M10 | consistency: for `sq-plus-iz`, `sq`, `linear-i` (their `fnById(id).src`) at 12 points (±1, ±2 on each part, and 0): `customSpec(src).c(x, y)` against `uvCartesian(id, x, y)` and `customSpec(src).p(r, t)` against `uvPolar(id, r, t)` | equal to 1e-12 |
| M11 | `MAP.customHalf(compile(src).f)` for `z^2 - iz`, `z`, `z^3`, `z^3 + (2 - i)*z`, `exp(z)`, `1/z`, `(3 + 3i)*z^2 + 3 + 3i` | 8, 3, 12, 20, 8, 3, 30 |
| M12 | `MAP.customChipLabel` of `z^2 - iz`, of a 24-character source, of `(1 + 2i)*z^2 + (3 - 3i)*z + 1` | `custom: z^2 - iz`; the source whole; `custom: (1 + 2i)*z^2 + (3 - 3i)…` |
| M13 | `MAP.openedOnFn('z^2 - iz', {re: 1, im: 1})`; `(…, null)` | `This page opened on f(z) = z^2 - iz at z = 1 + i.`; `This page opened on f(z) = z^2 - iz.` |
| M14 | `MAP.MAPPINGS_VALUES_SHAPE.fn` on `'sq'`, `{ src: 'z^2' }`, `{ src: '  ' }`, `'nope'`, `'custom'`, `5`, `null` | `'sq'`, `{ src: 'z^2' }`, `undefined` ×5 |
| M15 | `MAP.customSpec('z^2 +')` and `MAP.customSpec('2z3')` | both throw `ParseError` with the messages `The formula stops too early. Something is missing after "+".` and `I did not expect the number "3" here. Put the number first (2z, not z2) or use * between them.` |
| M16 | unchanged paths: `MAP.bothAddresses('sq-plus-iz', {re: 1, im: 1}, 0)` deepEquals the call with a fourth argument `null`; `MAP.mappingReadout('sq-plus-iz', {re: 1, im: 1})` | `z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3`; `MAP.uvCartesian('custom', 1, 1)` still throws `RangeError`; `MAP.MAPPING_FN_IDS` has 5 entries and no `'custom'` |
| L1 | `LIN.shapeFromValue` on `'x2'`, `'unit'`, `{kind:'verticalLine', x: 2}`, `{kind:'verticalLine', x: 1}`, `{kind:'horizontalLine', y: -2}`, `{kind:'circle', center: {re: 0, im: 0}, r: 1}`, `{kind:'circle', center: {re: 1, im: 1}, r: 2}` | `'x2'`, `'unit'`, `'x2'`, `{kind:'verticalLine', x: 1}`, `{kind:'horizontalLine', y: -2}`, `'unit'`, `{kind:'circle', center:{re:1,im:1}, r: 2}` |
| L2 | `shapeFromValue` on `{kind:'verticalLine', x: 6}`, `{kind:'horizontalLine', y: 4.5}`, `{kind:'circle', center:{re:0,im:0}, r: 0}`, `r: 5`, centre `{re: 5, im: 0}`, `'stroke'`, `7`, `null`, `{kind:'ray'}` | all `undefined` |
| L3 | `LIN.shapeCurve({kind:'horizontalLine', y: 2})` | 129 points, first `{re: -5, im: 2, t: 0}`, last `{re: 5, im: 2, t: 1}`, `kind` `'horizontalLine'`; `shapeCurve({kind:'verticalLine', x: 1})` first `{re: 1, im: -4, t: 0}`, last `{re: 1, im: 4, t: 1}`; a circle of radius 3 about 0 has 129 points, closed, first `{re: 3, im: 0, t: 0}`; `shapeCurve(null)` is `null` |
| L4 | `LIN.shapeLabel` | `The line x = 1`; `The line y = -2`; `The circle |z| = 3`; `The circle |z - (1 + i)| = 2`; `The circle |z + 1| = 1`; `The circle |z + i| = 2` |
| L5 | `LIN.inputLabel('x2')`, `('unit')`, `('stroke')`, `('custom', shape)` | `The line x = 2`, `The unit circle`, `Your own stroke`, the shape label |
| L6 | `LIN.keyFromValues` | `({}, vp problem 'P4')` gives `'P4'`; `({ compose: {...} }, null)` gives `'P3'`; `({ input: 'unit' }, null)` and a circle shape give `'P4'`; `({ input: 'x2' }, null)` gives `'2.1.3'`; `({}, problem 'nope')` gives `'2.1.3'` |
| L7 | `LIN.exceedsView(points, 5.4, 4.5)` for the image of x = 1 under iz + 1 (extent 5, 4), the image of y = 2 under (1 + i)z (extent 6, 6), the circle of radius 3 under 2iz (extent 6, 6) | false, true, true |
| L8 | `LIN.openedOnLinear({re:0,im:1}, {re:1,im:0}, 'The line x = 1', null)`; with `{ c: {re: 0, im: 2}, d: {re: -1, im: 0} }` | `This page opened on a = i, b = 1 and the line x = 1.`; the same plus ` The composition panel opened on c = 2i and d = -1.` |
| L9 | `LIN.labRequest({ a: i, b: {re: 1, im: 0}, input: 'custom', shape: {kind:'verticalLine', x: 1} })`; and the old three-key call `{ a: i, b: {re: 0, im: -2}, input: 'x2' }` | `{ fn: { src: '(i)*z + (1)' }, shapes: [{ kind: 'verticalLine', x: 1 }], view: 'side', problem: null, predictFirst: false }`; the old result unchanged: `{ fn: 'linear-i', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.3', predictFirst: false }` |
| L10 | `valuesOf(vp({ a: 'x', input: 7, compose: 3 }), LIN.LINEAR_VALUES_SHAPE)` | `{}` |
| P1 | `PM.valuesState(valuesOf(p, PM.VALUES_SHAPE), p)` for `{ n: 2, line: { axis: 'x', c: 3 } }` | `input: 'line'`, `n: 2`, `c: 3`, `axis: 'x'`, `aStep: 0`, `bStep: 9`, `grid: 'cart'`, `t: 0.625` |
| P2 | `{ n: 2, line: { axis: 'y', c: -1 } }` | `input: 'line'`, `c: -1`, `axis: 'y'` |
| P3 | `{ n: 2, sector: { theta0: 0, theta1: Math.PI / 6 } }` with problem `'2.2.1'` | `input: 'sector'`, `n: 2`, `aStep: 0`, `bStep: 6`, `grid: 'polar'`, `t: 0.5` |
| P4 | `{ sector: { theta0: 0, theta1: Math.PI / 2 } }`; `{ n: 4 }`; `{ n: 4 }` with problem `'2.2.1'` | sector with `n: 3`, `bStep: 18`; line with `n: 4`; sector with `n: 4` |
| P5 | `{ n: 99 }`; `{ n: 2, sector: { theta0: 0, theta1: 0.1 } }` (off the 5-degree lattice) ; `{ line: { axis: 'z', c: 1 } }` | `null`; a state equal to the default line state with `n: 2`; `null` |
| P6 | `PM.openedOn(state)` for the three states above | `This page opened on the line x = 3 under w = z^2.`; `... the line y = -1 under w = z^2.`; `... the sector 0 < arg z < π/6 under w = z^2.` |
| P7 | with `st = { ...PM.presetFor(null), c: 2, axis: 'y' }`: `PM.lineReadout(2, 2, 'y')`, `(-1, 2, 'y')`, `(3, 2, 'y')`, `(0, 2, 'y')`, `(2, 3, 'y')`; and `lineReadout(2, 2)` | `y = 2; image: u = v²/16 - 4; focus 0; vertex -4`; `y = -1; image: u = v²/4 - 1; focus 0; vertex -1`; `y = 3; image: u = v²/36 - 9; focus 0; vertex -9`; `y = 0; image: the positive real axis (u ≥ 0, v = 0), the parabola has collapsed; focus 0; vertex 0`; `image of y = 2 under z^3`; `x = 2; image: u = 4 - v²/16; focus 0; vertex 4` |
| P8 | `PM.lineFact(2, 2, 'y')`, `(-1, 2, 'y')`, `(2, 3, 'y')` | `Focus 0 and directrix u = -8: every point of the parabola is as far from 0 as from that line.`; `Focus 0 and directrix u = -2: ...`; `Nearest point of the image to 0: the image of the point 2i, at distance 8 from 0.` |
| P9 | `PM.strokeFor(st)[0]` for `st` with `axis: 'y'`, `c: 2` and `PM.derive(st, stroke)` at `t = 0.625` | first point `{re: -4, im: 2, t: 0}`, last `{re: 4, im: 2, t: 1}`; `z` = `{re: 1, im: 2}`, `w` = `{re: -3, im: 4}`, `where` `x = 1`, `axis` `'y'`, `rho` near 5, `argW` near 2.214297435588181; the same for `y = 3`: `z` 1 + 3i, `w` −8 + 6i, `rho` near 10 |
| P10 | `PM.tText(derive(st))`, `PM.srText(st)`, `PM.labRequest(st)` for the y = 2 state | `t = 0.625 (x = 1)`; `Line y equals 2, power 2. Image: the parabola u = v squared over 16 minus 4, focus 0.`; `{ fn: 'sq', shapes: [{ kind: 'horizontalLine', y: 2 }], view: 'side', problem: null, predictFirst: false }` |
| P11 | iteration-1 calls with no `axis` | `PM.labRequest(PM.presetFor(null))` still deepEquals `{ fn: 'sq', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.2', predictFirst: false }`; `PM.tText(PM.derive(PM.presetFor(null)))` is `t = 0.625 (y = 1)` |
| P12 | `PM.rowsFor('line', 'y').find((r) => r.id === 'test')` evaluated at a state with `n: 2`, `c: 2` at `z = 1 + 2i` | the polar cell (a string) includes `\rho(1 - \cos\varphi) = 2c^2` and the cart cell includes `\dfrac{v^2}{4c^2} - c^2 = -3 = u` |
| R1 | `PR.stateFromValues(valuesOf(vp({ w: {re: -8, im: 0}, n: 3 }), PR.PRINCIPAL_VALUES_SHAPE))` | `{ w: {re: -8, im: 0}, n: 3, sel: 1 }` |
| R2 | `{ n: 3 }`; `{ w: {re: 1, im: 1} }`; `{ w: {re: 41, im: 0}, n: 99 }`; `{ w: 'x' }`; `{}` | `{ w: {re: 0, im: 2}, n: 3, sel: 1 }`; `{ w: {re: 1, im: 1}, n: 2, sel: 1 }`; `null`; `null`; `null` |
| R3 | `PR.openedOnPrincipal({re: -8, im: 0}, 3)`; with `{re: 0.0004, im: 0.0004}`, n 2 | `This page opened on w = -8 with n = 3.`; `This page opened on w = 4×10⁻⁴ + 4×10⁻⁴i with n = 2.` |
| R4 | `PR.principalReadout(PR.principalModel({re: -8, im: 0}, 3))` | `w = -8; n = 3; |w| = 8; Arg w = 3.142 (π); w^(1/n) = 2 e^(i π/3) = 1 + 1.732i` |
| H1 | source scan of the five station files (`fs.readFileSync`) | none contains `/preset\.values/`; each contains `valuesOf(`; none matches `/#[0-9a-fA-F]{3,8}\b\|rgba?\(\|hsl\(/`; `sets.js` and `powermap.js` contain no `/\.style\.\w+\|style="/`; `linear.js` has no `/\.t\s*=[^=]/`, exactly 2 `mk('summary'`, exactly 2 `createLabelPlacer(c, p)`; `powermap.js` has 1 `mk('summary'` and exactly one `mk('a', 'station-link'`; `sets.js` has 1 `h('summary'`; `principal-root.js` contains none of `0.309`, `0.951`, `0.809`, `0.588`, `1.414`, `1.732`, `Math.SQRT2`; `videoPanel(` appears in `mappings.js` only; `moveGlyph(` in `linear.js` only; `decisionChips(` in all five |
| H2 | the iteration-1 pure exports | `Object.keys(PR.PRESETS)` is `['2i', 'm1', 'm1cube']`; `MAP.MAPPING_FN_IDS` unchanged; `SETS.presetFromContext(null)` deepEquals `{ id: 'annulus' }`; `SETS.defaultFlags('annulus')` deepEquals `{ innerStrict: true, outerStrict: false }` |

All of these are written and run against the reference code of Appendix A and the prototypes before they went into this table; the builder's code must give the same values.

### 7.2 Interaction script: `tests/interact/i2-decisions-everywhere-b.mjs`

Header (the second line is what `tools/interact-all.mjs` reads):

```
// tests/interact/i2-decisions-everywhere-b.mjs: the two decisions, the move glyph, fresh numbers and the video panel on sets, mappings, linear, powermap, principal-root.
//   node tools/smoke.mjs --route sets --script tests/interact/i2-decisions-everywhere-b.mjs --dark
export const expectedErrors = [/motion-time/];     // only step V2 can provoke a line, a routed (empty) video file
```
The default export runs once per viewport on the route `sets` (`if (ctx.route !== 'sets') return`), at desktop, phone and dark desktop, and visits the other stations through the router. Helpers: `settle`, `dragHandle`, `clickChip`, `handleZ` from `_helpers.mjs`; `problemById`, `addressLabel` from `js/data/problems.js`; `namesMeaning`, `addressMeaning`, `namesLabel` from `js/core/decisions.js`.

* `go(route, station)`: `window.__oldSection = document.querySelector('#view > section'); window.__mv.app.navigate(route)`, then wait until `#view > section` is a different node, `#view[data-state=ready]` and `#view[data-station=<station>]`; then 350 ms and `settle(page, 3)`. (A same-hash navigation re-mounts; the section identity makes the wait exact.)
* `sendFresh(req)`: `window.__mv.app.request(req); window.__mv.app.navigate(req.station)`, the same wait plus `window.__mv.app.preset().kind === 'values'`.
* `noOverflow(tag)`: `scrollWidth - clientWidth <= 1`.

| Step | What it does | What passing looks like |
|---|---|---|
| **A1** | for `[problem-1-5-2, sets, 1.5.2]`, `[problem-2-1-1, mappings, 2.1.1]`, `[problem-2-1-3, linear, 2.1.3]`, `[problem-2-1-2, powermap, 2.1.2]`, `[problem-2-2-2, principal-root, 2.2.2]`: `go`; read `problemById(id)`; log (never assert) a difference from the goal's table (2.1.3: table `P`, data `both`) | `#<s>-problem-address[data-value] === p.address`, `#<s>-problem-names[data-value] === p.names`, their `textContent` is `addressLabel(p.address)` and `namesLabel(p.names)`; both are inside `#<s>-problem-decisions` inside `#<s>-problem` (and outside `#<s>-readout`); `#<s>-problem-meaning` is hidden. Click `-names`: the meaning is visible, equals `namesMeaning(p.names)`, `aria-expanded="true"`; click again: hidden. Click `-address`: meaning equals `addressMeaning(p.address)`. `noOverflow`. |
| **A1b** | chips follow the active problem: linear presets P3 then P4 then 2.1.3; powermap `powermap-input-sector` then `powermap-input-line`; mappings `mappings-fn-sq` then `mappings-fn-sq-plus-iz`; sets tick `#sets-outer-strict` then untick; principal-root `window.__mv.principalRoot.setW(1, 1)` then `setW(0, 2)` | linear: data-values equal `problemById('P3')`'s (`C`, `none`), `P4`'s (`P`, `any`), then 2.1.3's (`both`, `any`), and `#linear-problem-title` names the problem. powermap: 2.2.1's (`P`, `any`) then 2.1.2's (`C`, `none`). mappings: `#mappings-problem` is `hidden` on `sq` and visible with the chips on `sq-plus-iz`. sets: with the box ticked `#sets-problem` text includes `You changed the set` and `#sets-problem-address` does not exist; unticked, the chips are back with the same values. principal-root: at w = 1 + i the callout text starts `Your own numbers.`, `#principal-root-problem-address` does not exist, and **the plane's top (`.plane[data-plane-id="principal-root-plane"]`) moved by less than 1 px**; at 2i the chips are back and the plane is where it was. **Fix round 1:** the chips of the ghost cards are as tall as the live card's (`.rt-slot-ghost .decision-chip` and `#principal-root-problem .decision-chip` have the same `getBoundingClientRect().height`), and the plane's top stays within 1 px of the handout page's for a fresh card of each kind (the fresh example w = -8, n = 3; the longest numbers -28.2 - 28.2i, n = 6; a tiny w = -1.2e-4, n = 3; the handout numbers sent fresh) at the run's own width and, on the phone run, at 320 px (`page.setViewportSize`, restored afterwards); an open names meaning on the handout card does not move it either. |
| **A2** | `go('problem-2-1-3', 'linear')`; read `#linear-glyph`; then drag, preset and hook steps | `aria-label === 'move: turn 90°, stretch 1'`; the glyph is an `svg` with `role="img"`, `parentElement` equals `#linear-readout`'s `parentElement` and `#linear-readout` does not contain it; the readout text starts `a = i` and includes `spin 90°, stretch 1, slide -2i` (unchanged). `dragHandle(page, 'linear-ab-a', { re: 1, im: 1 })`: label `move: turn 45°, stretch 1.414`, `data-r="1.414"`, `data-theta="0.785"`, readout includes `spin 45°, stretch 1.414`. `window.__mv.planes.get('linear-ab').getHandle('a').set({ re: 0, im: 0 })`: label `no move: 0` and the zero note is visible. `clickChip('linear-preset-P4')`: `move: turn 45°, stretch 1.414`; `clickChip('linear-preset-P3')`: `move: turn 90°, stretch 1`. The glyph's computed `color` equals the computed `color` of a probe element with `color: var(--polar)` (token in both themes). On the phone: the glyph's right edge is at or left of the readout's left edge plus 1 and the row has no overflow. |
| **A3** | `sendFresh` for the five "Fresh (goal A3)" requests of 6.2 (sets 1 ≤ |z − (1 − i)| ≤ 3; mappings z² − iz at 1 + i; linear a = i, b = 1 on x = 1; powermap n = 2, x = 3; principal-root w = −8, n = 3), each in the request shape of the goal's section 4.1 | per station, all of: `#<s>-problem-note` text includes `Fresh numbers` **and** `This page opened on`; `#<s>-problem[data-fresh="true"]`; the chips exist with the data-values of the problem; and the state of the goal: **sets** `#sets-closed[data-answer="yes"]`, `#sets-open[data-answer="no"]`, `window.__mv.sets.state()` has `card: 'fresh'`, `p` `{re: 3, im: -1}`, `flags` both false, `half` 5, `#sets-setline[data-text] === '1 <= |z - (1 - i)| <= 3'`, `#sets-boundary` text `Boundary points: the circle |z - (1 - i)| = 1 (in S); the circle |z - (1 - i)| = 3 (in S).`; **mappings** readout includes `w = 1 + i`, `#mappings-fn-custom[aria-pressed="true"]` with `title` `z^2 - iz`, every other fn chip `aria-pressed="false"`, `#mappings-ex-u-cart[data-tex]` includes `x^{2} - y^{2} + y`, `#mappings-ex-v-cart` includes `2xy - x`, `#mappings-ex-u-polar` includes `r^{2}\cos 2\theta + r\sin\theta`, `window.__mv.mappings.state().custom === 'z^2 - iz'`, `#mappings-fn-note` includes `The formula the Rehearsal Room sent.`; **linear** readout includes `spin 90°`, `state()` has `input: 'custom'`, `shape: { kind: 'verticalLine', x: 1 }`, `#linear-input-custom[aria-pressed="true"]` with text `The line x = 1`, glyph `move: turn 90°, stretch 1`, and **every point of `window.__mv.linearImage` has `im` within 1e-9 of 1** (the image is the line v = 1); **powermap** readout includes `x = 3; image: u = 9 - v²/36`, **every point of `window.__mv.powermapImage` satisfies `|re - (9 - im²/36)| < 1e-6`**; **principal-root** readout includes `w^(1/n) = 2 e^(i π/3) = 1 + 1.732i`, `state()` has `n: 3`, `sel: 1`, `fresh: true`, `#principal-root-trap` is visible and includes `real root, -2`, `#principal-root-pick-note` includes `step k = 1`. `noOverflow` after each. |
| **A3b** | the note goes when the student changes the thing | sets: tick `#sets-outer-strict`: text `You changed the set`, no note; mappings: `clickChip('mappings-fn-sq')` hides the card, `clickChip('mappings-fn-custom')` shows it again with the note; linear: `clickChip('linear-preset-2-1-3')` leaves `#linear-problem-note` hidden and `data-fresh="false"`, the custom chip still there and not pressed, then `clickChip('linear-input-custom')` presses it again; powermap: drag `#powermap-zplane-line` to x = 1: the note reads `You changed the input. The problem itself is n = 2, x = 2.` (and `data-fresh="false"`), then back to 3: the fresh note returns; principal-root: `setW(1, 1)` gives the neutral line, `setW(-8, 0)` with n 3 (via `setN(3)`) gives the fresh note again. |
| **A3c** | more fresh cases | sets 3 + 3i, 2 < ρ < 4, strict: `#sets-open` yes, `#sets-domain` yes, `window.__mv.planes.get('sets-plane').getView().unitsAcross === 18`, `state().half === 9`, `p` `{re: 6, im: 3}`, `bound.R` 4. mappings: `fn: 'sq'` (catalogue id): `#mappings-fn-sq` pressed, no `#mappings-fn-custom`, `#mappings-problem` hidden; `{ src: 'exp(z)' }`: readout `z = 1 + i; w = 1.469 + 2.287i; u = 1.469; v = 2.287; polar: u = 1.469; v = 2.287`, `#mappings-fn-note` includes `no short expansion`; **bad** `{ src: 'z^2 +' }` with `z: {re: 2, im: 0}`: `#mappings-fn-error` text equals the message obtained in the page from `compile('z^2 +')` (and is `The formula stops too early. Something is missing after "+".`), no `#mappings-fn-custom`, readout `z = 2; w = 4 + 2i; u = 4; v = 2; polar: u = 4; v = 2`, and a press of `mappings-fn-sq` hides `#mappings-fn-problem`. linear: P3 `{ a: 1 + i, b: 1, input: 'x2', compose: { c: 2i, d: -1 } }`: `#linear-compose-readout` text `ac = -2 + 2i; ad + b = -i`, `#linear-compose-c` value `2i`, `#linear-compose-d` value `-1`, chips of P3 (`C`, `none`); P4 `{ a: 2i, b: 0, input: circle r 3 }`: readout includes `spin 90°, stretch 2, slide 0`, glyph `move: turn 90°, stretch 2`, every `linearImage` point has modulus 6 within 1e-6, and `window.__mv.planes.get('linear-zplane').getView().unitsAcross > 10.8` (the planes were refit); horizontal `{ a: 1 + i, b: 0, input: { kind: 'horizontalLine', y: 2 } }`: chip `The line y = 2`, every image point has `im - re` within 1e-9 of 4. powermap: y-axis `{ n: 2, line: { axis: 'y', c: 2 } }`: readout includes `y = 2; image: u = v²/16 - 4; focus 0; vertex -4`, `#powermap-input-line` text `Line y = c`, handle `#powermap-zplane-line` at (0, 2), every `powermapImage` point satisfies `|re - (im²/16 - 4)| < 1e-6`; sector `{ n: 2, sector: { theta0: 0, theta1: Math.PI / 6 } }` with problem `2.2.1`: readout includes `sector 0 < arg z < 0.524 (π/6); image: 0 < arg w < 1.047 (π/3)`, chips (`P`, `any`). principal-root: `{ w: 2i, n: 3 }`: readout includes `w^(1/n) = 1.26 e^(i π/6) = 1.091 + 0.63i`. **Fix round 1 (sets):** on that far ring `#sets-why` names `|z - (3 + 3i)|` and `3 + 3i` and not `|z + i|`, and the probe handle is inside the canvas; after `#sets-preset-annulus` `state()` is `half 5`, `p (2, 0)`, `kind 'interior'`, `card 'handout'`, the handle is inside the canvas, `#sets-readout` is `probe: interior; ε = 0.5`, `#sets-probe-detail` starts `p = 2 is in S.`, `#sets-plane-p` reads (2, 0) and `#sets-why` quotes `|z + i|` again; a probe dragged to about (1, 1) in the 9-wide view stays there when `#sets-preset-punctured` shrinks the view (and that preset's why box says `a disk with its centre left out`); ticking an edge of the far ring neither refits nor moves the probe (`half 9`, `p (6, 3)`). |
| **M** | malformed requests: sets `{ center: 'x', r0: 99 }`, mappings `{ fn: 5, z: 'x' }`, linear `{ a: 'x', input: 7, compose: 3 }`, powermap `{ n: 99, line: { axis: 'z', c: 'x' } }`, principal-root `{ w: 'x', n: 99 }` | the harness sees no console error; `#<s>-problem-note` is empty or absent (powermap: the iteration-1 sentence, no `Fresh numbers`); `data-fresh="false"`; the default readouts: sets `probe: interior; ε = 0.5` and `state().card === 'handout'`; mappings `z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3`; linear includes `b = -2i; spin 90°`; powermap `x = 2; image: u = 4 - v²/16`; principal-root starts `w = 2i; n = 2`. |
| **V1** | `go('mappings', 'mappings')` with the real manifest | `#mappings-video-host` exists between the w-plane figure and `#mappings-morph` (document order). If `media/manifest.js` has no `motion-time` entry: no `#video-motion-time`, the host has no children and height 0. If it has one: the panel is inside the host, after both planes and before the morph slider. **Fix round 1:** a second pass reloads with `**/media/manifest.js` routed to an empty `VIDEOS` list: the host is `hidden` and the distance from the bottom of `.two-planes` to the top of the motion panel equals the flex `row-gap` of their parent (24 px), as in iteration 1; in V2 the host is not `hidden` once the panel is in it. |
| **V2** | `page.route` (registered after the harness's) for `**/media/manifest.js` (200, `text/javascript`, a `VIDEOS` array with one `motion-time` entry: `src: 'media/video/motion-time.mp4'`, `captions: 'media/video/motion-time.vtt'`, `seconds: 150`, `narrated: false`, `music: false`; `SITE_AUDIO = {}`), `**/media/video/motion-time.mp4` (200, `video/mp4`, empty) and `.vtt` (200, `text/vtt`, `WEBVTT`); `page.reload()`; wait for ready | `#video-motion-time` is a child of `#mappings-video-host`, follows `#mappings-wplane-viewport` and precedes `#mappings-morph` in document order; the `<video>` has `controls`, `playsinline`, `preload="metadata"` and a `<track kind="captions" default>`; leaving to `#home` and coming back gives one panel, not two; leaving removes it. |
| **U** | for each of the five: `go` to the station then `go('home', 'home')` | `window.__mv.sets`, `.mappings`, `.linear`, `.powermapImage` and `.principalRoot` are all `undefined`; no `#video-motion-time` left; the planes of the station are gone from `window.__mv.planes`. |

Phone-only checks inside the steps: the chips row wraps (its `scrollWidth` is at most its `clientWidth` + 1); the custom chip never makes the page scroll sideways (a 24-character formula); on principal-root the ghost cards are `aria-hidden` and `inert`.

### 7.3 Criterion by criterion

| Criterion | Command | Passing looks like |
|---|---|---|
| **A1** | `node tools/smoke.mjs --route sets --script tests/interact/i2-decisions-everywhere-b.mjs --dark --no-shots` (steps A1, A1b) | `3/3 checks passed across 1 route(s).` (desktop, phone, desktop-dark) and exit code 0 |
| **A2** | the same run (step A2; the other four glyph checks of the goal text belong to goals a and c) | same |
| **A3** | the same run (steps A3, A3b, A3c, M) | same |
| **A4** | `node tools/interact-all.mjs i1-station-addresses-arithmetic i1-station-distance-sets i1-station-curves-linear i1-station-roots-principal i1-station-staircase-powers i1-station-branches-graph4d i1-station-powermap-reciprocal i1-station-mappings-cr i1-station-limits-derivative i1-integration`, then `node --test tests/unit/i1-station-distance-sets.test.mjs tests/unit/i1-station-curves-linear.test.mjs tests/unit/i1-station-powermap-reciprocal.test.mjs tests/unit/i1-station-mappings-cr.test.mjs tests/unit/i1-station-roots-principal.test.mjs tests/unit/i1-integration.test.mjs tests/unit/i2-decisions-everywhere-b.test.mjs`, then `npm test` | `10/10 interaction scripts passed.`; the unit files pass; `npm test` fails only the five known red wave-1 pins (`git diff --stat` shows no iteration-1 test file touched by this goal; other goals of the iteration edit their own files) |
| **A5** | `node tools/smoke.mjs --dark --no-shots --route sets,mappings,linear,powermap,principal-root,problem-1-5-2,problem-2-1-1,problem-2-1-2,problem-2-1-3,problem-2-2-1,problem-2-2-2,problem-P3,problem-P4` (mine); at integration the goal's full command: `--route` with the 29 problem routes (`problem-1-1-1, problem-1-1-2, problem-1-2-1, problem-1-2-2, problem-1-3-1, problem-1-3-2, problem-1-4-1, problem-1-4-2, problem-1-4-3, problem-1-5-1, problem-1-5-2, problem-2-1-1, problem-2-1-2, problem-2-1-3, problem-2-2-1, problem-2-2-2, problem-2-3-1, problem-2-4-1, problem-2-5-1, problem-3-1-1, problem-3-1-2, problem-3-2-1, problem-P1 ... problem-P7`) and the fifteen station routes (`addresses, distance, powers, roots, curves, sets, mappings, linear, powermap, principal-root, branches, reciprocal, limits, derivative, cauchy-riemann`) | `39/39 checks passed across 13 route(s).` for mine (13 routes × 3 viewports); `132/132` for the full list, zero problem lines |
| **A6** | code inspection (the checklist of Appendix B.3) and the source-scan test H1 of 7.1 | every line of B.3 true |

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

* **A request is consumed once.** The router removes `station.request` when it mounts the station; a reload or a second visit is the default page (no note). A request for another station waits in the store until that station mounts (router behaviour, not ours).
* **Same numbers as the handout.** A fresh set or state equal to the handout's still shows the fresh note (the request said so); the chips are the same either way.
* **`-0`.** Every complex value from `valuesOf` is `{ re: v.re + 0, im: v.im + 0 }`; shapes add `+ 0`; no `-0` reaches a readout.
* **sets.** Centre up to 5 on each part, 0.25 ≤ r0 < r1 ≤ 4 (outside: the whole request is ignored). View half up to 12. The bounding-disk handle is capped by `boundCapFor(half)`; ticking an edge keeps the student's disk (`sameReach` as in iteration 1). A preset chip refits the view only when the half-width differs. The `half-plane` preset ignores `params`.
* **mappings.** A pole at the chosen z (`1/z` at 0): `w = undefined`, the explainer value row prints `\text{undefined}`, the polar cell says `no angle at 0` (the existing row). A formula that uses `x` or `y` (`x*z`) compiles but has no polynomial form: numbers-only table. Degree above 6, `z^-1`, `Re(z)`, `exp(z)`: numbers-only. A 400-character formula is a `ParseError` ("too long") and is shown verbatim. `fn: 'custom'` is not an id: ignored. A huge `customHalf` (30) keeps the grids drawable (the morph clamp follows the view). Coefficients that are not integers print three-decimal numbers (`0.5x^{2}`). The explainer rows switch with `setRows`; the cell ids stay.
* **linear.** `a = 0` is accepted (zero note, glyph `no move: 0`). `input: 'stroke'` as a string is invalid. A circle with centre away from 0 is a custom shape. `compose` with `c = 0` is accepted (the composition note turns red as in iteration 1). A shape beyond the view triggers one `fitBoth()` at mount; a zoom the student sets later is kept. The custom chip stays after a preset chip so the student can come back.
* **powermap.** `c = 0` on either axis is the collapsed parabola (texts above). `n = 6` with `c = 3` needs a w-plane half-width of 1166 (`fitHalfExtent`, within `maxUnitsAcross: 5000`). A sector whose `n·(b − a)` exceeds a full turn says `(overlaps itself)` as before. A request that names the other problem than the input it carries: the note is about the card on the page. The Reset button still navigates to the handout problem (the way back from a fresh y-line).
* **principal-root.** `w = 0` is accepted (zero state; the fresh card reads `w = 0 with n = 2`). `|w| > 40` rejects `w` (no clamp message at mount). A sweep in progress freezes the card (as in iteration 1) and refreshes when it ends. The slot's three ghost variants are as tall as the tallest real card at 1280, 390 and 320 px (no layout shift while the numbers change: tested by the plane-top check of A1b for the handout, the neutral line, the fresh example, the longest numbers and a tiny w, at 390 and 320 px on the phone run and at 1280 on the desktop run). **An open meaning is the one exception, and it is on purpose.** Tapping a chip opens `.decision-meaning` inside the card; on the handout card there is slack in the slot (the ghost of the fresh note is taller than the handout card) so nothing moves, but on a fresh card with a long note the card is as tall as the slot and the meaning grows it by one to three lines (10 px to 57 px, measured). Reserving that line in the ghost would add a permanent blank band of the same height under every handout card, which already carries 95 px of slack at 1280 and 200 px at 390, so the design accepts a shift on a tap the student made. A tap is not a drag: the plane does not move while w is dragged. The one drag that could notice it is a drag that leaves the fresh numbers while a meaning is still open (the card goes neutral, the meaning closes and the plane moves back up); that is rare and the next pointer move re-reads the plane's position, so it is accepted.
* **Video.** `videoPanel` resolving after `unmount` removes the panel it appended; a second mount does not duplicate (listen.js returns the existing child). A manifest that fails to load is a `console.warn` only.
* **Storage.** None of the additions reads or writes `localStorage` or the store (the existing Lab hand-off still writes `lab.request`).

### 8.2 Performance plan

* Per card: `decisionChips` builds two buttons and one span (about 0.12 ms cold, measured in the kit's design); the note is one `textContent`. `renderProblem` of sets and principal-root already rebuilds the card; the extra cost is the chips (and in principal-root one more ghost, the fresh variant, with a KaTeX statement, about 1.5 ms cold at mount only; the card refresh on a drag is skipped while the key is unchanged).
* `customSpec` is O(d²) in the degree (d at most 6) plus 76 evaluations for `customHalf` (about 0.1 ms); `cartTerms` and `polarTerms` run once per formula, never per frame; the per-frame cost of a custom function equals that of a catalogue one (a sum of at most about 12 terms for u, v in each address).
* `updateGlyph` is a cached no-op when `a` is unchanged and about 0.01 ms when it changes; it runs inside the existing per-frame `flush` (no new rAF loop).
* No new `window` or `document` listener, no timer, no `ResizeObserver`. The only new async work is the manifest promise (one dynamic import, cached by `listen.js`).
* Drag budgets are unchanged: 60 fps on 2D drags (the horizontal line reuses the vertical line's pipeline).

### 8.3 Accessibility

* Every new control has an id and a visible label: the chips are native buttons with `aria-expanded` and `aria-controls` (kit); `#linear-input-custom` and `#mappings-fn-custom` are `button.chip` with `aria-pressed` and the same visible words as their `title`.
* The meaning line is `role="status"`; the note is static text (no live region, so loading the page stays quiet); the bad-formula callout is `role="alert"` (read once, at mount).
* The glyph is `role="img"` with `aria-label` (`move: turn 90°, stretch 1`) and a `<title>`; it is not focusable and never the only carrier: the readout beside it says the same in numbers.
* Focus is not moved on mount (ARCHITECTURE 10.1.2). Tab order: statement, the two chips, then the existing controls. Escape closes an open meaning (kit).
* Colour never carries a fact alone: the chips say the words (`Polar`, `names: home`), the glyph has its label, the note is text.
* No `[zw][012]` in any label or title; no ASCII `pi`, `<=`, `z0` in default-state text (I6); the fresh note may quote `answer.text`, which is ASCII by design (a typeable form), and appears only on a fresh page.

### 8.4 Reduced motion

Nothing new animates. The glyph redraws immediately; the video is started by the student; the existing Play, stage and sweep buttons keep their stepper form under `prefers-reduced-motion` (unchanged code).

### 8.5 Phone layout (390 px)

* The decisions row wraps (`.row` is `flex-wrap`; the kit's `.decisions` wraps and its meaning line takes `flex: 1 1 100%`); a chip's `max-width: 100%` keeps a long word inside the card.
* The fresh note wraps; for 1.5.2 and 2.2.2 the kit's string is about 180 characters, six to eight lines at 390 px (measured on a similar card in a scratch page). That height is reserved in the principal-root slot by its ghosts.
* `#linear-readrow` is a flex row: the 2rem glyph, then the readout with `min-width: 0` (so a long readout wraps beside the glyph and never pushes the page).
* The custom chips are cut to 24 characters (`title` carries the whole formula), so the chip row never exceeds the card width.
* The video host is an empty block until the manifest answers; the panel is 16:9 and width 100% (listen.js).
* No horizontal scroll: asserted by `noOverflow` after every step of the script at 390 px.

---

## 9. Out of scope

* Replacing each station's header, problem card and links with the kit's `header`, `problemCard`, `links` (the kit's card stays for the Rehearsal Room and for a later iteration).
* `staircase.js`, `arithmetic.js`, `graph4d.js`, `lab.js`, `home.js`, `problems.js`, and the ten other stations of goals a and c; their glyph hosts (`#addresses-glyph`, `#powers-glyph`, `#derivative-glyph`, `#cauchy-riemann-glyph`) and their video panels (`two-addresses`, `zoom-cr`).
* Editing any iteration-1 test or script (if a pin must move, stop and report it).
* The Listen control, the Walk, the Rehearsal Room itself, `docs/ARCHITECTURE.md`, `js/registry.js`, `media/manifest.js` (generated).
* A control to switch the powermap line between x = c and y = c, an editor for the custom shape of `linear`, an editor for the formula of `mappings` (the Lab has the formula field).
* Changing what the answer details say or the ahas (tests pin the wording).

---

## Appendix A. Reference implementation of the polynomial helpers (`mappings.js`)

Written and run in a scratch directory against the real `js/core/parse.js` and `js/core/complex.js`; every output in 7.1 M1 to M9 comes from it. Place it in `mappings.js` after `gridCurves` and before the explainer text; it needs `fmtNum` (already imported) and `fromPolar` added to the `complex.js` import for `customSpec`.

```js
const MAX_DEG = 6;
const cx = (re, im = 0) => ({ re, im });
const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const cMul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const isZ = (c) => Math.abs(c.re) < 1e-12 && Math.abs(c.im) < 1e-12;
function pAdd(p, q, sign = 1) { const n = Math.max(p.length, q.length), out = []; for (let k = 0; k < n; k++) out.push(cAdd(p[k] || cx(0), cMul(cx(sign), q[k] || cx(0)))); return out; }
function pMul(p, q) { const out = Array.from({ length: p.length + q.length - 1 }, () => cx(0)); p.forEach((a, i) => q.forEach((b, j) => { out[i + j] = cAdd(out[i + j], cMul(a, b)); })); return out; }
function pTrim(p) { const out = p.slice(); while (out.length > 1 && isZ(out[out.length - 1])) out.pop(); return out; }

// AST of parse.js -> coefficients, index = power of z; null unless a polynomial in z of degree <= 6.
export function polyCoefficients(ast) {
  const go = (n) => {
    switch (n.type) {
      case 'num': return [cx(n.value)];
      case 'const': return n.name === 'i' ? [cx(0, 1)] : n.name === 'e' ? [cx(Math.E)] : [cx(Math.PI)];
      case 'var': return n.name === 'z' ? [cx(0), cx(1)] : null;
      case 'neg': { const a = go(n.arg); return a && a.map((c) => cx(-c.re, -c.im)); }
      case 'call': return null;
      case 'bin': {
        if (n.op === '^') {
          const k = n.right.type === 'num' ? n.right.value : NaN;
          if (!Number.isInteger(k) || k < 0 || k > MAX_DEG) return null;
          const b = go(n.left); if (!b) return null;
          let out = [cx(1)]; for (let i = 0; i < k; i++) out = pMul(out, b);
          return out.length - 1 > MAX_DEG ? null : out;
        }
        const a = go(n.left), b = go(n.right); if (!a || !b) return null;
        if (n.op === '+') return pAdd(a, b, 1);
        if (n.op === '-') return pAdd(a, b, -1);
        if (n.op === '*') { const out = pMul(a, b); return out.length - 1 > MAX_DEG ? null : out; }
        if (n.op === '/') { const tb = pTrim(b); if (tb.length !== 1 || isZ(tb[0])) return null; const d = tb[0], m = d.re * d.re + d.im * d.im; const inv = cx(d.re / m, -d.im / m); return a.map((c) => cMul(c, inv)); }
      }
    }
    return null;
  };
  const p = go(ast);
  if (!p) return null;
  const t = pTrim(p);
  return t.length - 1 > MAX_DEG ? null : t;
}

const I_RE = [1, 0, -1, 0], I_IM = [0, 1, 0, -1];
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };

// u(x, y), v(x, y): terms { c, px, py }, ordered by total degree then by px, both descending.
export function cartTerms(coeffs) {
  const u = new Map(), v = new Map();
  const bump = (m, px, py, c) => { const key = px + ',' + py; m.set(key, (m.get(key) || 0) + c); };
  coeffs.forEach((c, k) => {
    if (isZ(c)) return;
    for (let j = 0; j <= k; j++) {
      const b = binom(k, j), re = I_RE[j % 4], im = I_IM[j % 4];
      bump(u, k - j, j, b * (c.re * re - c.im * im));
      bump(v, k - j, j, b * (c.re * im + c.im * re));
    }
  });
  const list = (m) => [...m].map(([key, c]) => { const [px, py] = key.split(',').map(Number); return { c, px, py }; })
    .filter((t) => Math.abs(t.c) >= 1e-12).sort((a, b) => (b.px + b.py) - (a.px + a.py) || b.px - a.px);
  return { u: list(u), v: list(v) };
}

// u(r, t), v(r, t): terms { c, k, trig } with trig 'cos' | 'sin' | 'const', ordered by k descending, cos before sin.
export function polarTerms(coeffs) {
  const u = new Map(), v = new Map();
  const bump = (m, k, trig, c) => { const key = k + ',' + trig; m.set(key, (m.get(key) || 0) + c); };
  coeffs.forEach((c, k) => {
    if (isZ(c)) return;
    if (k === 0) { bump(u, 0, 'const', c.re); bump(v, 0, 'const', c.im); return; }
    bump(u, k, 'cos', c.re); bump(u, k, 'sin', -c.im);
    bump(v, k, 'sin', c.re); bump(v, k, 'cos', c.im);
  });
  const list = (m) => [...m].map(([key, c]) => { const [k, trig] = key.split(','); return { c, k: Number(k), trig }; })
    .filter((t) => Math.abs(t.c) >= 1e-12).sort((a, b) => b.k - a.k || (a.trig === 'cos' ? -1 : 1) - (b.trig === 'cos' ? -1 : 1));
  return { u: list(u), v: list(v) };
}

const dec3 = (x) => fmtNum(x, 3);
function joinTex(items) {                                    // items: [{ c, mono }]
  let out = '';
  for (const { c, mono } of items) {
    if (!(Math.abs(c) >= 1e-9)) continue;
    const m = Math.abs(c), body = (Math.abs(m - 1) < 1e-9 && mono !== '' ? '' : dec3(m)) + mono;
    out += out === '' ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body;
  }
  return out === '' ? '0' : out;
}
const pw = (s, e) => (e === 0 ? '' : e === 1 ? s : `${s}^{${e}}`);
export const texCartTerms = (terms) => joinTex(terms.map((t) => ({ c: t.c, mono: pw('x', t.px) + pw('y', t.py) })));
export const texPolarTerms = (terms) => joinTex(terms.map((t) => ({ c: t.c, mono: t.trig === 'const' ? '' : pw('r', t.k) + `\\${t.trig}` + (t.k === 1 ? '' : ' ' + t.k) + '\\theta' })));
export const evalCartTerms = (terms, x, y) => terms.reduce((s, t) => s + t.c * Math.pow(x, t.px) * Math.pow(y, t.py), 0);
export const evalPolarTerms = (terms, r, th) => terms.reduce((s, t) => s + t.c * (t.trig === 'const' ? 1 : Math.pow(r, t.k) * (t.trig === 'cos' ? Math.cos(t.k * th) : Math.sin(t.k * th))), 0);

const HALF_LADDER = [3, 4, 5, 8, 12, 20, 30];
// The half-width of the w-plane view: 1.2 times the largest finite |f| over 3 rings x 24 directions and the 4 corners of the carried grid, rounded up the ladder.
export function customHalf(f) {
  let m = 0;
  const take = (z) => { const w = f(z); const a = Math.hypot(w.re, w.im); if (Number.isFinite(a) && a < 1e6) m = Math.max(m, a); };
  for (const r of [0.5, 1, 1.5]) for (let j = 0; j < 24; j++) take({ re: r * Math.cos(2 * Math.PI * j / 24), im: r * Math.sin(2 * Math.PI * j / 24) });
  for (const x of [-1.5, 1.5]) for (const y of [-1.5, 1.5]) take({ re: x, im: y });
  if (m === 0) return 8;
  const need = 1.2 * m;
  return HALF_LADDER.find((v) => v >= need) ?? HALF_LADDER[HALF_LADDER.length - 1];
}
```

Notes for the builder: `Math.pow(0, 0)` is 1 in JavaScript, which is what the terms need at x = 0 or y = 0; the `sort` keeps the order written in M3 to M7; `polyCoefficients` returns a fresh array each call; `cartTerms` and `polarTerms` never mutate `coeffs`. Do not write the literals `0.309`, `0.951` ... in `principal-root.js` (this appendix is for `mappings.js`).

---

## Appendix B. For the builder

### B.1 Order of work

1. Pure helpers and their tests first: `polyCoefficients`... (Appendix A), `setFromValues`, `viewHalfFor`, `probeStartFor`, `boundCapFor`, `cardModeOf`, `openedOn*`, `shapeFromValue`..., `valuesState`, `stateFromValues`; write `tests/unit/i2-decisions-everywhere-b.test.mjs` from 7.1 and make it pass (`node --test tests/unit/i2-decisions-everywhere-b.test.mjs`).
2. `sets.js` (5.2), then `principal-root.js` (5.6), then `powermap.js` (5.5), then `mappings.js` (5.3), then `linear.js` (5.4: the most pinned file, last). After each file: `node --test` of its iteration-1 unit file and `node tools/interact-all.mjs <its i1 script>`.
3. `tests/interact/i2-decisions-everywhere-b.mjs` (7.2) and the full verification of 7.3.
4. Report: every deviation from this document (with the reason), `requests_for_other_owners` (below), and the ids moved (none).

### B.2 Requests for other owners (do not edit these files)

* Orchestrator: add `tests/unit/i2-decisions-everywhere-b.test.mjs` to this goal's files.
* Planner / integrator: `docs/ARCHITECTURE.md` section 9 ("Iteration 2") should list the ids of B.4 and say that `#powermap-problem-note` is an existing id kept; correct goal A1's table (2.1.3 is `both`, `any`); `tools/interact-all.mjs` ROUTES rows `i2-adopt-ch1` / `i2-adopt-ch2-3` are stale names (the script header supplies the route).
* Goal a (curves.js) must not edit the C26-locked regions of `curves.js` (or both files would drift); nothing else is shared.

### B.3 Code-inspection checklist (A6)

1. `git diff --stat` names only the five station files, and `git status --short` adds only the new unit file and the new interaction script (other goals' files are not this goal's business).
2. In each of the five files the diff adds: the chips host and the note (5.2.7 step 7, 5.3.7 step 8, 5.4.2, 5.5.3 step 7, 5.6 step 2), the values branch (`valuesOf(` once per file), and (linear) the glyph, (mappings) the `videoPanel(` call; and **removes or renames no element id, readout string or hook key** (`git diff | grep '^-'` shows only lines the design says change).
3. `grep -n "preset\.values" js/stations/{sets,mappings,linear,powermap,principal-root}.js` finds nothing.
4. `grep -c "valuesOf(" ...` is at least 1 in each; `grep -n "decisionChips(" ...` shows each station (principal-root in one function, called for the live card and for the ghosts).
5. The glyph is a sibling of the readout: `readRow.append(glyph, readout)` and no `readout.append(glyph)` (linear.js only).
6. The custom-formula chip compiles through `compile` (inside `customSpec`) and shows `err.message` verbatim in `#mappings-fn-error`; nothing else is concatenated into that element.
7. `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(" js/stations/{sets,mappings,linear,powermap,principal-root}.js` finds nothing; `grep -nE "\.style\.|style=\"" js/stations/powermap.js js/stations/sets.js` finds nothing; `grep -c "mk('summary'" js/stations/linear.js` is 2, `powermap.js` 1, `grep -c "h('summary'" js/stations/sets.js` is 1.
8. In `linear.js` the text between `function threadBadges(ctx) {` and `function chipRow(` is byte-identical to `git show HEAD:js/stations/linear.js` (C26), and every new function is after `function chipRow(`.
9. `principal-root.js` contains none of the forbidden number literals (7.1 H1).
10. Every import is used (C22 for linear; by reading for the rest).

### B.4 Id inventory (new ids; all unique per page)

| Station | New ids |
|---|---|
| sets | `sets-problem-note`, `sets-problem-decisions`, `sets-problem-address`, `sets-problem-names`, `sets-problem-meaning` |
| mappings | `mappings-problem-note`, `mappings-problem-decisions`, `mappings-problem-address`, `mappings-problem-names`, `mappings-problem-meaning`, `mappings-fn-custom`, `mappings-fn-problem`, `mappings-fn-error-lead`, `mappings-fn-error`, `mappings-video-host` (and `video-motion-time`, `-title`, `-summary`, `-player`, `-error` from `listen.js`) |
| linear | `linear-problem-note`, `linear-problem-decisions`, `linear-problem-address`, `linear-problem-names`, `linear-problem-meaning`, `linear-glyph`, `linear-readrow`, `linear-input-custom` |
| powermap | `powermap-problem-decisions`, `powermap-problem-address`, `powermap-problem-names`, `powermap-problem-meaning` (`powermap-problem-note` already existed) |
| principal-root | `principal-root-problem-note`, `principal-root-problem-decisions`, `principal-root-problem-address`, `principal-root-problem-names`, `principal-root-problem-meaning`; ghosts carry `principal-root-ghost-<i>-address` and `-names` (spans, `aria-hidden`, `inert`) |

New attributes: `data-fresh="true|false"` on `#sets-problem`, `#mappings-problem`, `#linear-problem`, `#powermap-problem`, `#principal-root-problem`. New hook keys: `sets.state().card` and `.half`, `mappings.state().custom`, `linear.state().shape`, `principalRoot.state().fresh`.

---

## Appendix C. Build notes (what the builder did differently, and why)

Everything in sections 1 to 9 was built as written. These are the places where the code differs from the text, each the smallest change that works.

1. **The note is always about the card on the page.** `problemAsked(preset, owned, fallback)` (R3) is not a function in the code: sets, mappings, powermap and principal-root call `noteWith(<the card's own problem id>, opened)` and linear calls it with the card key it opened on (`P0.card`). The visible text is the same in every case the design lists; the only case that differs is a request that names the other problem than the card on the page, where the design's own sentence in 5.5.3 says the note is about the card on the page.
2. **principal-root: the longest ghost note is built from a computed number.** The design writes `{ re: -28.284, im: -28.284 }` as a literal; the iteration-1 pin `no re: <digits>.<3+ digits> literal` forbids it. The code uses `-W_MAX / Math.hypot(1, 1)` for both parts (the same number, 40 at 45 degrees).
3. **mappings: the table's rows change only when the kind of table changes, and the explainer gets the new state first.** `explainer.setRows` re-renders with the last state it was given, and a cell function that reads a state of the other kind makes the explainer log a console error. So `setFn` calls `explainer.update(new state)` and then `setRows(...)`, and only when a typed formula is selected after a catalogue function or the reverse (never between two catalogue functions). `customRows()` cells also return `null` when the state carries no spec.
4. **mappings: the numbers-only tables turn an infinite value into NaN**, so a pole prints `undefined` (as the catalogue does) and never `inf`.
5. **linear: `stageOpts` is written from `STAGE_HALF`** (`[-STAGE_HALF.w, STAGE_HALF.w]`), so the view and the fit test cannot drift apart.
6. **Interaction script: the three V2 routes stay for the rest of the run.** The page keeps the manifest it loaded (listen.js caches it), so unrouting the video files would turn the next visit into a real 404 and a console line with no file name for `expectedErrors` to match.
7. **Unit file: four more tests than 7.1 lists**: L11 (the numbers of the worked linear examples), P13 (the three sector readouts), H1b (the glyph is a sibling and no new function sits inside the C26 block) and H1c (the bad-formula message is shown untouched); S15 also checks the handout's eps_max at p = 2 (0.7639320225002102).
8. **Measured:** `npm test`: 1111 tests, 1 red (`ARCHITECTURE 3.12`, `helixPoint` in `js/core/three-view.js`, another goal's file). `node tools/smoke.mjs --dark` on the 13 routes of 7.3 A5: 39/39. The interaction script: 3/3 (desktop, phone, desktop-dark), about 2.5 minutes under load.

### Fix round 1 (after the review against this design)

The reviewer found five things; this is what was done about each and where the text above changed.

1. **sets: the probe stranded outside the plane (major).** Built as the reviewer suggested, with `C(2, 0)` rather than the nearest in-view point: `probeInView(p, half)` (5.2.7 step 4) is pure, tested (S16) and used by `refit()`, which then calls `recompute({ set: false })` so the readout, the sentence and the explainer follow the probe. A1/A3c of the interaction script presses `#sets-preset-annulus` from the far ring and asserts the state, the handle's place in the canvas and the readout, and that a probe the student dragged inside the smaller view is not moved.
2. **Outside the five files: the Playwright harness aborts the H.264 request of the motion-time video (major).** Not changed here (`tools/smoke.mjs`, `tools/interact-all.mjs` and `media/manifest.js` are not owned by this goal). Recorded under `requests_for_other_owners` of the build report. This script keeps ignoring `/motion-time/` through `expectedErrors`, as before.
3. **principal-root: ghost chips 8 px shorter than the live ones (minor).** Fixed in the station's CSS (5.6 step 2). The extended A1b check covers a fresh card at 390 and 320 px (and 1280 on the desktop run). The reviewer's case (d), an open meaning on a fresh card, is **not** reserved: it would add a permanent blank band of up to 57 px under every handout card, so section 8.1 now says what is true (a tap may grow the card; a drag never moves the plane).
4. **mappings: an empty video host added a second 24 px gap (minor).** The host is `hidden` until the panel arrives (5.3 steps 11 and 12); V1 measures the gap against the flex `row-gap` with an empty manifest.
5. **sets: the why box quoted the handout for a far ring (minor).** New pure `whyAboutSet(set)` (5.2.8, tested in S17). It also gives the punctured disk and the two disks a true sentence, which iteration 1 left quoting the handout (no iteration-1 test reads that text).

