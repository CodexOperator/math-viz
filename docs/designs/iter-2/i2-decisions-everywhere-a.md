# Design: i2-decisions-everywhere-a (decisions, the move glyph and fresh numbers on addresses, distance, powers, roots, curves)

Goal: `i2-decisions-everywhere-a` (iteration 2, wave 1, kind integration; the first of the three halves of `i2-decisions-everywhere`). Designer: stage 2.
Owns: `js/stations/addresses.js`, `js/stations/distance.js`, `js/stations/powers.js`, `js/stations/roots.js`, `js/stations/curves.js`.
Depends on: `i2-decisions-kit` and `i2-media-core` (both built: `js/core/decisions.js`, `moveglyph.js`, `station-kit.js`, `listen.js`, and the router's values preset are on disk).
Reads: `docs/ARCHITECTURE.md` 3.14, 4, 4.1, 9, 10, 11.1 to 11.4; `docs/STORY.md` sections 3 and 4; `js/core/decisions.js`, `moveglyph.js`, `station-kit.js`, `listen.js`;
`tests/interact/i1-station-*.mjs`, `tests/unit/i1-station-*.test.mjs`, `tests/interact/i1-integration.mjs`, `tests/unit/i1-integration.test.mjs` (the pins).

**How to use this document.** (Fix round 1: section 0.5 lists what changed after the review; where it disagrees with an appendix, 0.5 and the files on disk win.) Sections 1 to 9 are the design. Appendix A is a **reference implementation**: the unified diff of the five station files,
Appendix B the interaction script in full, Appendix C the unit-test file in full. All three were written and run in a scratch copy of the repository
outside the repo (this design file is the only thing written in the repo), against the real kit, the real router and the real `tools/smoke.mjs` in
headless Chromium. Every sentence that says "measured" comes from that run. The builder reproduces the appendices (`patch -p1` applies Appendix A to
the repo root); anything it changes is reported as a deviation. Where a sentence in sections 1 to 9 and the appendix code disagree, the sentence wins
and the disagreement is a bug in the appendix.

---

## 0. Findings that shaped this design (read first)

### 0.1 What is on disk now

1. **The kit is built and matches section 11.** `decisions.chips(problem, { idPrefix })` gives `span.decisions` with `button#<prefix>-address`, `button#<prefix>-names`
   and `span#<prefix>-meaning[role=status][hidden]`; a click toggles the meaning, Escape closes it. `moveGlyph(z, { id, size })` / `updateGlyph(svg, z)` draw and
   redraw the glyph (`aria-label` from `glyphText`, repeated updates are free). `valuesOf(preset, shape)` returns `null` unless the preset is a values preset, else the keys of
   `shape` that are present and valid. `freshNote(problem, preset)` returns `Fresh numbers from the Rehearsal Room. The handout's own answer: <answer.text>` only when
   `preset.problem === problem.id`, else `''`. `problemCard(ctx, problem, options)` builds the kit card (ids `<id>`, `-title`, `-statement`, `-note`, `-decisions`, `-why`, `-answer`, ...).
2. **`valuesOf`'s `'int'` has no range.** `valuesOf({ values: { c: 'x', n: 99 } }, { c: 'complex', n: 'int' })` returns `{ n: 99 }` (measured), so the malformed request of A3 would still set
   n = 99. Every range (`n` 1..12 or 2..12, `|c| <= 100`, a part within 50) is therefore a **shape function** `(v) => cleaned | undefined`, which `valuesOf` accepts (it wraps it in try/catch).
3. **`powers.js` has no problem card in iteration 1** (its header has the `1.3.2` chip and nothing else). Section 9 of ARCHITECTURE says "the existing problem card (or callout)"; for powers
   this design adds one, built with the kit's `problemCard` (ids `powers-problem*`), between the header and the "Pick z and n" panel.
4. **`powers.js` is imported by `staircase.js`** (`stationHeader`, `stationNav`, `h`, `ensureStyle`, `snapNice`, `drawAngleArcs`, `pickSpot`, `tickBoxes`, ... ). Every existing export stays, with its signature; the diff adds exports only.
5. **Baseline, measured:** `npm test` = 858 tests, 853 pass, 5 fail: `I1 the registry: 21 stations ...`, `U3`, `U4`, `U5`, `U10` (they wait for `rehearse.js` and the new home map, wave-1 goals that are not this one). With this goal's diff applied the suite is
   **858 tests (plus the 15 of Appendix C: 873), 868 pass, the same 5 fail**. A4 is "no new failure".
6. **The router.** A `station.request` is read and removed in `render()` right after the station module imports, so a request is used exactly once. `window.__mv.app.navigate(token)` re-mounts when the hash is already the token and otherwise sets it; `#view` carries `data-route`
   and `data-state` (`loading` | `ready` | `error` | `nosuchplace`), which is what the script waits on (`data-route === route && data-state === 'ready'`).
7. **`media/manifest.js` is empty today** (`VIDEOS = []`), so `videoPanel(host, 'two-addresses')` appends nothing yet; the panel appears when `i2-videos-ch1` lands.
8. **Process note for builders:** the session's scratchpad directory is shared by every agent of the workflow; a prototype directory called `proto` was deleted under this designer by another agent mid-run. Use a directory name of your own.

### 0.2 The iteration-1 pins this diff must not disturb (each was found by running the prototype or by reading the tests)

| # | Pin (where) | What it forces |
|---|---|---|
| P1 | `C26` in `tests/unit/i1-station-curves-linear.test.mjs`: the text of `curves.js` between `function threadBadges(ctx) {` and `// The answer: the TeX`, and between `// The answer: the TeX` and `// ---- the station`, must equal the same slices of `linear.js` (which this goal does not own) | the curves chips and note are inserted **from `mount`**, after `renderProblemCard(...)` returns; `renderProblemCard`, `answerBox`, `buildLinks`, `threadBadges`, `buildHeader` are not edited |
| P2 | `I12` (`i1-integration.test.mjs`): `addresses.js` has exactly 1, `curves.js` 2, `distance.js` 1 `h('summary'` / `mk('summary'` | no new `<summary>` in those three files (the chips are buttons) |
| P3 | `U32` (`i1-station-staircase-powers.test.mjs`): `powers.js` contains `grid-template-columns: minmax(0, 1fr)` exactly 3 times and `drawLabel(` exactly once | the powers glyph row is flex, not grid; no `drawLabel(` |
| P4 | `U9`, `U10` (roots): `isPrimitiveRoot(` and `quadraticRoots(` once each in `roots.js`; no `.plane-handle-label` query; `R.initialState(null)` deep-equals the five-key object | the values reader is a **new** exported function `valuesStart`; `initialState` is not edited |
| P5 | `i1-station-roots-principal.mjs`: "the c plane did not move when the callout changed" (1.4.2 callout swapped for the neutral line), and `#roots-problem` text `startsWith('Your own numbers.')` | the slot's invisible copies carry the same chips as the live callout (same height); the neutral callout gets no chips; the fresh-numbers note is **outside** the slot |
| P6 | `I7` (`i1-integration.mjs`): every `button`, `input`, `select`, `textarea`, `summary` under `#view` has an `id`, ghosts included | the ghost chips are buttons with ids of their own (`roots-ghost-<i>-address`, ...); measured: stripping the ids made I7 fail with "controls without an id: button, button, button, button" |
| P7 | `I8`: no duplicate ids; every `a[href]` and tab stop has an id | one chip set per ghost (distinct prefixes); the kit card's scroller has its id |
| P8 | `C25` (curves): no `z-index`, `cv-under`, `window.addEventListener`, `document.addEventListener` in `curves.js`; `C22`: every import is used | none added; the three new imports are used |
| P9 | `I11`: no `\d degrees` in station sources; `I22`: no `z1` / `z2` in a `name`/`label`/`ariaLabel` string | copy uses `°` and subscripts |
| P10 | `i1-station-curves-linear.mjs` `noBraces`: no literal `{` `}` in any text node or `title`/`aria-label` outside `.katex`, `p.mono` and `[id$="-problem-answer"]` | on a **plain** visit nothing new has braces; the fresh note quotes the kit's `answer.text`, which may (1.3.1 has `arg z = {2pi/3 + 2 pi k}`), and only exists after a request |

### 0.3 Where this design differs from the plan text (report, do not edit ARCHITECTURE.md)

| # | Plan text | This design | Why |
|---|---|---|---|
| D1 | "the existing problem card (or callout) gets the chips" | powers gets a new card (kit `problemCard`); every other station keeps its card and receives `#<station>-problem-decisions` and `#<station>-problem-note` inside it | 0.1 item 3 |
| D2 | "the card shows freshNote(...) in a new #<station>-problem-note" | on `roots` the note is a sibling placed right after the callout's slot (or inside the quadratic panel for a quadratic request), not inside `#roots-problem` | the callout is swapped by the first drag; a note inside the slot would make the planes jump mid-drag (P5) |
| D3 | 4.1: distance `{ mode, z1?, z2?, a?, R? }` | `R` is the **radius** (a real number, as the generator sends it, 1.2.1 `{ mode: 'circle', a, R }`); the station keeps its own dot z and puts it at `a + R` straight up when that fits the view, else right, down, left | iteration 1's `st.circle.R` is the dot z |
| D4 | `freshNote` only | the card note is `freshNote(...)` (its short form `Fresh numbers from the Rehearsal Room.` when the preset names another problem or none), then ` Opened with <the numbers>.` | the card prints the handout's statement; without the second sentence the picture (c = -81) and the statement (c = -16) look like a bug |
| D5 | note stays | the note goes when a **preset chip** (or, on distance, a mode that is not the fresh mode) puts other numbers on the screen; a drag keeps it | the note says how the page opened |
| D6 | a values preset is applied | a values preset with **nothing usable** in it is treated as no preset: no note, defaults | A3: the malformed request must not claim fresh numbers |
| D7 | the glyph is a sibling of the readout | it sits **before** the readout in a flex row (`#addresses-readout-row`, `#powers-readout-row`), 2em, in a small bordered tile, with one sentence under the row | measured: 1.1em at the far right of a readout looked detached and was too small to read |
| D8 | chips on "the card" | roots also puts chips on the quadratic panel's own callout (`#roots-quadratic-problem-address`, `-names`): that callout is where 1.4.3 lives | 1.4.3 never owns the big callout |
| D9 | one values helper | `freshText` is written five times (one per station file); the kit should export it (request below) | the kit is not owned by this goal |
| D10 | files | two files are new beyond `owns`, by the loop's convention: `tests/interact/i2-decisions-everywhere-a.mjs` (the criteria name it) and `tests/unit/i2-decisions-everywhere-a.test.mjs` | A1 to A3 name the script; the pure readers need a Node test |
| D11 | fresh numbers fit the view | `distance` and `curves` call `plane.fitTo` when a fresh point lies outside the starting view (never otherwise); `powers` drops a `z` off its fixed plane; `roots` already auto-fits; `addresses` already has `ensureVisible` | generators draw parts up to 5 and the curves plane shows 4.5 |

### 0.4 Measured in the scratch prototype

- `node tools/smoke.mjs --route addresses --script tests/interact/i2-decisions-everywhere-a.mjs --dark --no-shots`: **3/3** (desktop, phone, dark desktop), about 100 s.
- `node --test tests/unit/i2-decisions-everywhere-a.test.mjs`: 15/15. Whole suite: 873 tests, 868 pass, the 5 baseline failures.
- Iteration-1 interaction scripts through `tools/interact-all.mjs` on the prototype (each at desktop, phone and dark desktop): `i1-station-addresses-arithmetic` 27/27, `i1-station-distance-sets` 15/15, `i1-station-curves-linear` 18/18, `i1-station-roots-principal` 18/18, `i1-station-staircase-powers` 12/12 (they include the 320 and 340 px overflow checks and "the c plane did not move when the callout changed"). One earlier run of `distance-sets` failed on the **`sets`** route (`S0 default: the word "all in S" is on the plane`, a label-placement step of a station this goal does not touch) while two other browser jobs were running; the same route passes on the unmodified repository and on the prototype when it runs alone, and the full script passed 15/15 on the rerun, so it is load flakiness: run A4 with `--jobs 1` or alone if it shows. `i1-integration` **cannot pass yet for reasons that are not this goal's**: on the unmodified repository it stops at step I1 (`js/stations/rehearse.js` is missing: HTTP 404 and the under-construction panel) and, with a stub for `rehearse`, at step I3 (`#graph4d` offers no way to the next stop of thread T2). So its I6, I7 and I8 scans (one style of readout; an id on every control, ghosts included; an id on every link and tab stop after the answers are opened; no duplicate id; no `z1`/`z2`/`z0` in a label) were run on the five pages and on `problem-1-3-1` and `problem-1-4-3` with the diff applied, as the last step of the new script (step I-scan, Appendix B): they pass at desktop, phone and dark desktop.
- `node tools/smoke.mjs --dark --no-shots` on the 13 routes of the five stations (5 station routes and the 8 problem routes `1.2.1 1.2.2 1.3.1 1.3.2 1.4.1 1.4.2 1.4.3 1.5.1`): **39/39 checks passed**.
- With a fake manifest entry (`two-addresses`, a `data:` source) the same script passes at desktop and phone and the panel sits in `#addresses-video-host` after the plane; with the real (empty) manifest the host is empty.
- Sizes at desktop and at 390 px (getBoundingClientRect): chips are 44 px tall; the address chip is 195 px wide for `Cartesian, then polar`, 248 for `Cartesian, polar, then back`, 195 for `Polar, then Cartesian`, 77 to 107 for `Polar` / `Cartesian`; the Names chip 121 to 141 px; the glyph tile 44 × 44 px; the roots slot is as tall as its live callout (191 px at desktop, 349 px at 390 px).
- Screenshots of the five stations with fresh numbers, a tapped chip, desktop, phone and dark, were read; the layouts in section 2 are the ones seen.

### 0.5 Fix round 1 (after the review of the delivery): what changed since Appendices A to C

Where this section and an appendix disagree, **this section and the files on disk win**; the appendices are the first delivery.

| # | Finding | Change (files) |
|---|---|---|
| F1 | [major] `tools/smoke.mjs` counts the aborted `two-addresses.mp4` request as `request failed` as soon as the manifest lists the video, so the script failed 0/3 | `tests/interact/i2-decisions-everywhere-a.mjs` exports `expectedErrors = [/^request failed: \S+\/media\/video\/two-addresses\.(?:mp4|vtt)$/]` and nothing wider. Measured: 3/3 at desktop, phone and dark desktop. The harness-wide fix (ignore `net::ERR_ABORTED` on media files in `tools/smoke.mjs`) is a request to its owner (section 9, request 4) |
| F2 | [minor] the fresh note quoted the ASCII answer line (`sqrt(2)`, `2pi/3`, `0 <= t <= 1`, `e^(i ...)`, `{...}`) | every station file has `export function typesetAnswer(text)` (pure; `sqrt(n)` to the radical, `pi` to the pi sign, `<=` `>=` `+-` `->` to their signs, `k = 0..4` to `k = 0, ..., 4`, `z_k` to a subscript k, a set over k to `..., k any integer`) and `freshText` quotes `typesetAnswer(problem.answer.text)`. The note is written with `prose()` (not `textContent`), so `e^(i 2π/3)` and `(x - 1)^2` show raised exponents; `.prose-sup { white-space: nowrap }` keeps a raised exponent on one line. `answer.text` itself (the typeable twin) is untouched. The I6 scan of the script now also runs on the page of every problem, opened with fresh numbers, and holds the notes to no caret, no `+-`, no brace |
| F3 | [minor] the glyph tile was a 1px outlined box (taste lint `[outlined-box]`) | `.ax-readout-row .move-glyph` and `.pw-readout-row .move-glyph`: no border, `background: var(--surface-2)` with the same padding and radius |
| F4 | [minor] a roots, curves or distance card keeps the handout's statement while the planes show fresh numbers | the note now leads with what was opened and says which numbers the quoted answer belongs to (section 5.2): `Fresh numbers from the Rehearsal Room. Opened with c = -81 and n = 4; the handout's own numbers have this answer: ...`. On distance, curves, addresses and powers it sits directly under the statement; on roots it sits directly under the callout, outside the slot (D2), which is unchanged |
| F5 | `i1-integration` and ARCHITECTURE | not owned by this goal; recorded in section 9 (requests 4 and 5) |

---

## 1. Goal restatement, the story thread, what is covered

**The goal.** On the five stations `addresses`, `distance`, `powers`, `roots`, `curves`: (1) every problem card shows the two **decision chips** (Address, Names) from `js/core/decisions.js`, with the one-line meaning on tap; the chips follow the problem the card shows; (2) the station opens with **fresh numbers** when the Rehearsal Room sends a `StationRequest` (a `values` preset), applied through `valuesOf` and the station's own setters, and the card says so; (3) the **move glyph** sits beside `z` (`addresses`) and `zⁿ` (`powers`), redrawn on every state change; (4) `addresses` hosts the `two-addresses` video panel right after its plane. Nothing from iteration 1 moves: every id, readout string and hook stays.

**The story thread.** *A complex number is a move; every problem is settled by two decisions.* The chips put the exam lens (which address, which names) on the problem the student is looking at, so a card on Chapter 1 says in two chips what the whole test says in two questions. The glyph is the one recurring mark of "a number is a move: turn, then stretch", drawn beside the number the station prints; it is the same mark that will sit beside `a`, `f′(z₀)` and `A` on the other half of the work, so Chapter 1 and Chapter 3 share it. Fresh numbers make "same place, new numbers" true: the student rehearses a variant, then opens the station and sees the same picture with those numbers.

**How it shows on screen.**
- Under each problem statement: `[dots Cartesian, then polar] [bars names: home]`; tap one and a one-line meaning appears under it ("The home step only: Arg z in (−π, π], and principal values.").
- Beside the polar readout of `addresses` and `powers`: a small tile with a faint unit circle, an arc (the turn) and a line (the stretch), in `--polar`; its tooltip and `aria-label` read `move: turn 120°, stretch 2`.
- When the page was opened from the Rehearsal Room: a muted line under the statement, "Fresh numbers from the Rehearsal Room. The handout's own answer: ... Opened with z = 2i."
- After the first picture on `addresses`: the "Watch" video panel, once the manifest lists it.

**Problems and topics covered** (the problems these five stations own, `js/data/problems.js`): 1.3.1 (addresses; C→P, home), 1.2.1 (distance; P, none), 1.2.2 (distance; C, none), 1.3.2 (powers; C→P→C, any), 1.4.1 (roots; P, all), 1.4.2 (roots; P→C, all), 1.4.3 (roots; C, all), 1.5.1 (curves; C, none). Topics: T1.1 and T1.3 (addresses), T1.2 (distance, including the triangle inequality, which has no problem and so no chips), T1.4 (powers, roots), T1.5 (curves). The other assignment refs of the goal (1.5.2, 2.x, 3.x, P1 to P7) belong to the stations of `i2-decisions-everywhere-b` and `-c`.

---

## 2. UX

### 2.1 Wireframes

Only the changed regions are drawn. `[...]` is a chip, `(...)` a text, `~` a line that wraps.

**addresses, desktop (two columns from 70rem), opened with fresh numbers and the Names chip tapped**

```
+- Problem 1.3.1 --------------------------------------------------------------+  #addresses-problem
| Write z = -1 + i sqrt3 in polar form ... What is Arg(z)?                      |  #addresses-problem-statement
| Fresh numbers from the Rehearsal Room. The handout's own answer: z = 2(cos(..~|  #addresses-problem-note   (empty = hidden)
| [oo Cartesian, then polar] [|||  names: home]                                  |  #addresses-problem-decisions
| | The home step only: Arg z in (-pi, pi], and principal values.               |  #addresses-problem-meaning (hidden until a tap)
| [Cartesian, then polar] You are given the Cartesian address ... (badge + why) |  (iteration 1, unchanged)
| > Show the handout answer                                                     |
+------------------------------------------------------------------------------+
| left column                               | right column                        |
|  Try a point  (-1+i sqrt3)(sqrt3+i)(2i)...|  [Cartesian address] [Polar address]|
|  Grid ...                                 |  ......                             |
|  +- plane ---------+                      |  +----+ +-------------------------+|  #addresses-readout-row
|  |   z . (dashed)  |                      |  |glyph| z = 2i; |z| = 2; Arg z = ..||  glyph #addresses-glyph, readout #addresses-readout
|  +-----------------+                      |  +----+ +-------------------------+|
|  (hint under the plane)                   |  The small picture is the move that |  #addresses-glyph-note
|  +- Watch (2-3 min): Two addresses -----+ |  makes z. Its arc is the turn ...   |
|  | video (only when the manifest lists) | |  [The angle has many names] ...     |
|  +--------------------------------------+ |                                     |  #addresses-video-host holds the panel
```

**addresses, phone (390 px), the same page**

```
Problem 1.3.1
Write z = ... Arg(z)?
Fresh numbers from the
Rehearsal Room. The
handout's own answer: ...
Opened with z = 2i.
[oo Cartesian, then polar]
[||| names: home]            <- wraps: two rows at 358 px
| The home step only: ...
[Cartesian, then polar] Why ...
> Show the handout answer
Try a point ...  Grid ...
(plane 358 px)
(hint)
(video panel, when listed)
Cartesian address (x, y) / Polar address (r, theta)
[glyph] z = 2i; |z| = 2;
        Arg z = 1.571 (pi/2)   <- the readout wraps inside its flex cell
The small picture is the move ...
```

**distance** (callout `#distance-problem`, rebuilt on every mode change): `[badge Problem 1.2.1] statement`, then the note line, then the chips, then `Show the answer`. Two points = 1.2.2 (C, none), circle = 1.2.1 (P, none), triangle = the topic callout (no chips, no note).

**powers** (new card, kit `problemCard`, id `powers-problem`):

```
+- Problem 1.3.2 ------------------------------------------------------------+  #powers-problem
| Use polar form to compute (sqrt3 + i)^10. Express ... x + iy.                |  -statement
| (note, when fresh)                                                           |  -note
| [ooo Cartesian, polar, then back] [|||  names: any]                          |  -decisions  (-address, -names, -meaning)
| Why this address. Powers are native to polar: ...                            |  -why
| > Show the answer                                                            |  -answer, -answer-toggle
+------------------------------------------------------------------------------+
[Pick z and n] [two planes] 
+- readout block ----------------------------------------------------------+
| +----+ +-----------------------------------------------------+            |  #powers-readout-row
| |glyph| | z^n = 512 - 886.81i; |z|^n = 1024; ...             |            |  #powers-glyph, #powers-readout
| +----+ +-----------------------------------------------------+            |
| The small picture is zn as one move: ...                                    |  #powers-glyph-note
| Report the angle as: [n.theta] [home step] [point (x, y)] ...               |
```

**roots, desktop and phone** (the same order; the phone stacks the planes and wraps the chips to two rows). The slot is a grid cell as tall as the tallest of its invisible copies, so the live callout and the neutral line occupy the same height:

```
+- #roots-problem-slot (one cell, as tall as the tallest callout) ----------+
|  #roots-problem  (the live callout)                                       |
|  1.4.2 Find all the 4th roots of -16. Express answers in both forms.      |
|  [oo Polar, then Cartesian] [|||  names: all]   #roots-problem-decisions  |
|  Easy in: [Polar][Cartesian] Find the roots in polar (divide every name.. |
+---------------------------------------------------------------------------+
Fresh numbers from the Rehearsal Room. ... Opened with c = -81 and n = 4.     #roots-problem-note (outside the slot)
[Three things to try]  [Pick c and n: presets, n slider, Re c, Im c]  [c plane | roots plane] ...
+- 1.4.3 The quadratic formula hides a square root ---------------------------+
|  #roots-quadratic-problem: 1.4.3 Use the quadratic formula to solve ...     |
|  [Cartesian] [names: all]     #roots-quadratic-problem-decisions            |
```

**roots**: the callout `#roots-problem` shows, for c = 1, n = 5 or c = -16, n = 4 (or fresh numbers on a handout problem), the statement, then `[Polar] [names: all]` (`#roots-problem-decisions`), then the iteration-1 "Easy in: ..." line. For any other numbers it shows the neutral line and no chips. Directly under its slot: `#roots-problem-note` (empty and hidden unless the page opened with fresh numbers). The quadratic panel's callout `#roots-quadratic-problem` carries `[Cartesian] [names: all]` (`#roots-quadratic-problem-address`, `-names`).

**curves** (`#curves-problem`): `On the test: 1.5.1`, statement, note, chips, the iteration-1 "Easiest in" line, the two `<details>`.

### 2.2 Controls and elements (every new id)

| Station | id | What it is | Behaviour |
|---|---|---|---|
| all five | `<station>-problem-decisions` | `div` holding `decisions.chips(problem, { idPrefix: '<station>-problem' })` | rebuilt whenever the card shows another problem; absent/empty when no problem is shown |
| all five | `<station>-problem-address` | button chip, text `addressLabel(address)` (`Cartesian, then polar`), `data-decision="address"`, `data-value="C->P"` | tap/Enter/Space toggles `#<station>-problem-meaning` with `addressMeaning`; `aria-expanded`; title = the same line |
| all five | `<station>-problem-names` | button chip, text `names: home`, `data-value="home"` | same, with `namesMeaning` |
| all five | `<station>-problem-meaning` | `span[role=status][hidden]` | shows one meaning at a time; Escape hides it and keeps focus on the chip |
| all five | `<station>-problem-note` | `p` (muted, 0.92rem) | text from `freshText`, `''` (hidden by `:empty`) otherwise; cleared by a preset chip; on `roots` it sits outside the slot |
| addresses | `addresses-glyph` | the move glyph of z, 2em, in a tile | `role=img`, `aria-label` `move: turn <deg>°, stretch <r>` or `no move: 0`; redrawn by `render()` |
| addresses | `addresses-readout-row` | flex row: glyph, then `#addresses-readout` | sibling relation is the A2 pin |
| addresses | `addresses-glyph-note` | `p.ax-hint` | one sentence that says what the picture is |
| addresses | `addresses-video-host` | `div` after the hint, inside the left column | `videoPanel(host, 'two-addresses')` appends `section#video-two-addresses` when the manifest lists it |
| powers | `powers-problem` (+ `-title -statement -note -decisions -why -answer -answer-toggle -aha -answer-tex -answer-hint -answer-text -slot`) | the kit's `problemCard` | `setNote` shows or clears the fresh note |
| powers | `powers-glyph`, `powers-readout-row`, `powers-glyph-note` | as addresses, beside zⁿ | glyph shows `m.zn` (the Cartesian route's power); `no move: 0` at z = 0 |
| roots | `roots-problem-decisions`, `roots-problem-address`, `-names`, `-meaning` | chips of the callout | follow the callout |
| roots | `roots-problem-note` | fresh note | outside `#roots-problem-slot` |
| roots | `roots-quadratic-problem-decisions`, `-address`, `-names`, `-meaning` | chips of 1.4.3's callout | static |
| roots | `roots-ghost-0-*`, `roots-ghost-1-*` (`-decisions`, `-address`, `-names`, `-meaning`) | the invisible copies of the slot that stand for the 1.4.1 and 1.4.2 callouts (`aria-hidden`, `inert`); the two neutral copies have no chips | one set of chip ids per ghost; never focusable |
| curves | `curves-problem-decisions`, `-address`, `-names`, `-meaning`, `curves-problem-note` | as above, inserted after `.cv-statement` | static card |
| distance | `distance-problem-decisions`, `-address`, `-names`, `-meaning`, `distance-problem-note` | as above, between the statement and the answer | rebuilt by `renderProblem()` on every mode change |

Existing ids, readouts and hooks: unchanged (A6).

### 2.3 Pointer, touch, keyboard

- **Chips** (kit): a click, tap, Enter or Space toggles the meaning; a second tap hides it; tapping the other chip switches; Escape hides and keeps focus; hover shows the same text as the native tooltip. Tap target 2.75rem tall (`button.chip`). Focus ring from the shared `.chip:focus-visible`.
- **Glyph**: not interactive, not focusable; hover shows the `<title>` (the `aria-label` text).
- **Note and meaning**: text only. The meaning span is a polite live region, so a screen reader hears it when it appears.
- **Everything else** (drag, arrow keys, presets, sliders, typed fields): iteration 1's, unchanged.

### 2.4 States

| State | What the student sees |
|---|---|
| plain visit (no request) | the card with chips, no note; the glyph; defaults |
| opened with fresh numbers | the same, plus the note; the picture shows the new numbers; a preset chip clears the note and loads that preset |
| malformed or empty request | defaults, no note, no error panel, no console error |
| a request for another station | left in the store for that station (router); this station mounts plain |
| roots: numbers match no problem | neutral line "Your own numbers.", no chips (the quadratic panel keeps its chips) |
| distance: triangle mode | the topic callout, no chips |
| z = 0 (addresses, powers) | glyph `no move: 0` (a faint unit circle and a dot-length ray), readouts say "no angle at 0" |
| video not listed | `#addresses-video-host` is empty (zero height) |
| video listed but fails to load | the panel's own error line (kit); the page works |
| unmount | listeners and rAF handles of iteration 1 are released as before; the card of powers is destroyed; a video panel that resolves after unmount removes itself |
| loading | none of its own: the router shows its placeholder while the station module imports |

### 2.5 Copy (plain, direct; the exact strings)

| Where | Text |
|---|---|
| chip texts | from the data and the kit: `Cartesian, then polar`, `Polar`, `Cartesian`, `Cartesian, polar, then back`, `Polar, then Cartesian`; `names: none`, `names: any`, `names: all`, `names: home` |
| meanings | `NAMES_MEANING` and `ADDRESS_MEANING` of the kit, verbatim (section 6.4 lists the five that these stations show) |
| fresh note (fix round 1) | `Fresh numbers from the Rehearsal Room. Opened with <line>; the handout's own numbers have this answer: <typeset answer>.` and, when the problem named in the request is not the one the card shows (or none): `Fresh numbers from the Rehearsal Room. Opened with <line>.` |
| `<line>` | addresses `z = 2i`; distance two/triangle `z₁ = 1 + 5i and z₂ = -2 + i`, circle `centre a = -4 + 3i and radius 4`; powers `z = 1.414 + 1.414i and n = 4`; roots `c = -81 and n = 4` or `a = 1, b = -6 and c = 25`; curves `a segment from 1 + 2i to -1 - 2i` |
| addresses glyph note | `The small picture is the move that makes z. Its arc is the turn, Arg z, and its line is the stretch, \|z\|. A dashed line means the stretch is more than 2.` |
| powers glyph note | `The small picture is zⁿ as one move: its arc is the turn, Arg zⁿ, and its line is the stretch, \|z\|ⁿ. A dashed line means the stretch is more than 2, so the picture stops at its edge.` |
| glyph label | `move: turn 120°, stretch 2`; `no move: 0` |

---

## 3. Visual encoding (design language of CONSTRAINTS)

- **Tokens only.** No literal colour anywhere in the diff. The chips, their dots and the Names marks are the kit's (`--cart` and `--polar` dots on the address chip; Names `none` grey, `any` `--polar` outline, `all` `--polar` filled with the three-step mark, `home` tinted with the middle step solid, `continuous` dashed). The note is `--text-muted` at 0.92rem; the glyph's tile is a 1 px `--border` box on `--surface` with `--radius-sm`.
- **The glyph is polar.** "Turn", "stretch" and "move" are polar words, so the glyph wears `--polar`: faint unit circle (30 % opacity), the arc of Arg (1.6 px), the ray (2 px), dashed when the stretch exceeds the glyph's scale 2. It is drawn once per station, beside the number it describes, never the only carrier of a number (the readout and the explainer carry the digits).
- **Cartesian vs polar on the cards.** The address chip's dots repeat the code (`Cartesian, then polar` has a blue then an orange dot). The existing iteration-1 badge (`Cartesian, then polar` in a tinted box) stays, so a card shows the address twice until the kit's card replaces these cards (out of scope); the chip adds the meaning on tap and the Names decision.
- **Both themes.** Everything is token CSS, so the dark theme needs no extra rule; the script asserts that the glyph's computed colour equals the computed `--polar` in the theme under test (light on desktop and phone, dark on the third run).
- **arg versus Arg.** The glyph shows one turn, Arg (home step), never the set; the `names` chip says which names the question needs. The staircase and ghost windings of iteration 1 carry the set.

---

## 4. Module API

No new module. Each of the five files gains named exports for its pure half (all import-safe in Node; nothing touches the DOM at import time) and edits inside `mount`. Complex numbers are `{ re, im }`. New imports per file are listed first.

### 4.1 `js/stations/addresses.js`

```js
import { chips as decisionChips } from '../core/decisions.js';
import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
import { valuesOf, freshNote } from '../core/station-kit.js';
import { videoPanel } from '../core/listen.js';

export const VALUES_SHAPE                       // frozen { z: (v) => {re, im} | undefined }  both parts finite and within +-100 (the typed fields' range)
export function valuesStart(preset)             // → { z } | null   (null: not a values preset, or no usable z); a fresh copy
export function freshText(problem, preset, opened)   // → string: (freshNote(problem, preset) || 'Fresh numbers from the Rehearsal Room.') with a full stop, then ' Opened with <opened>.'
```
Edits: `problemStrip(prefix, p, noteText = '')` (private) adds `p#<prefix>-problem-note` and `div#<prefix>-problem-decisions` after the statement; `initialZ` takes `valuesStart` first; `mount` builds `glyph`, `readoutRow` (glyph, readout), `glyphNote`, `videoHost`, calls `updateGlyph(glyph, m.z)` in `render()`, clears the note on a preset click, and calls `videoPanel` after the first paint. Hook `window.__mv.addresses` unchanged.

### 4.2 `js/stations/distance.js`

```js
import { chips as decisionChips } from '../core/decisions.js';
import { valuesOf, freshNote } from '../core/station-kit.js';

export const VALUES_SHAPE                       // frozen { mode: MODES, z1, z2, a: z-shape (parts within 50), R: radius-shape (number MIN_RADIUS..20) }
export function circleDot(a, R)                 // → {re, im}: the dot at a + R e^{i phi}, phi = pi/2, 0, -pi/2, pi in that order, the first that sits inside VIEW with 0.6 to spare; else a + iR
export function valuesStart(preset)             // → { mode, two? | circle? | triangle?, radius?, line } | null
export function freshText(problem, preset, opened)
```
`valuesStart` returns the state to copy into `st[mode]` (`circle` is `{ a, R: dot }`). Edits: state seeded from it; `pointsShown`, `inView`, `ensureShown` (mount-level, used at mount and in `setMode` only when a values preset opened the page); `renderProblem()` appends `p#distance-problem-note` and `div#distance-problem-decisions` between the statement and the `<details>`. `modeFromPreset` is unchanged.

### 4.3 `js/stations/powers.js`

```js
import { problemsForStation, problemById } from '../data/problems.js';
import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
import { problemCard, valuesOf, freshNote } from '../core/station-kit.js';

export const VALUES_SHAPE                       // frozen { z: parts within 4.2 (the fixed plane's view), n: integer 1..12 }
export function valuesStart(preset)             // → { z, n } | null   (a missing key keeps the handout's: z = sqrt3 + i, n = 10)
export function freshText(problem, preset, opened)
```
`initialState(preset)` (private) reads `valuesStart` first and sets `tag = 'values'`. `mount` builds `card = problemCard(ctx, problemById('1.3.2'), { id: 'powers-problem' })` (destroyed on unmount), the glyph row and note. Every export of iteration 1 (`sup`, `arcPolyline`, `snapNice`, `pickSpot`, `tickBoxes`, `spotsAround`, `drawAngleArcs`, `cleanC`, `cleanArg`, `tn`, `texCartQ`, `polarTex`, `fmtSmart`, `numExact`, `powerModel`, `cartesianChain`, `chainText`, `logRuler`, `angleText`, `wrapNote`, `powersReadout`, `spiralDescription`, `powersCells`, `THREAD_WORD`, `neighbourLinks`, `h`, `ensureStyle`, `readGhostAlpha`, `plainProse`, `stationHeader`, `stationNav`, `COLUMNS`, `TAU`, `mount`) stays.

### 4.4 `js/stations/roots.js`

```js
import { chips as decisionChips } from '../core/decisions.js';
import { valuesOf, freshNote } from '../core/station-kit.js';

export const VALUES_SHAPE                       // frozen { c: |c| <= C_MAX, n: integer N_MIN..N_MAX, quadratic: {a, b, c} reals within 1000, a != 0 }
export function valuesStart(preset)             // → { state, kind: 'cn' | 'quadratic', callout: '1.4.1' | '1.4.2' | null, line } | null; state has the five keys initialState returns
export function freshText(problem, preset, opened)
```
`{ quadratic }` is accepted when `quadraticModel(a, b, c).ok` and `|d| <= C_MAX`; it sets `quad`, `quadFirst: true`, `c = {d, 0}`, `n = 2` (the same state the 1.4.3 preset loads, with the student's polynomial). `renderProblem(host, p, neutral, lead, idPrefix)` (private) appends `div#<idPrefix>-decisions` between the statement and the "Easy in" line; the slot's ghosts use `roots-ghost-<i>`, the live callout `roots-problem`, the quadratic one `roots-quadratic-problem`. `calloutNow()` returns the fresh problem's callout while `(c, n)` still equal the fresh pair. Hook `window.__mv.roots` unchanged. `initialState` and `PRESETS` unchanged.

### 4.5 `js/stations/curves.js`

```js
import { chips as decisionChips } from '../core/decisions.js';
import { valuesOf, freshNote } from '../core/station-kit.js';

export const VALUES_SHAPE                       // frozen { a, b: parts within 50 }
export function valuesStart(preset)             // → { a, b, line } | null; b is pushed out to MIN_SIZE from a when closer (east when equal)
export function freshText(problem, preset, opened)
```
`mount` inserts `p#curves-problem-note` and `div#curves-problem-decisions` after `.cv-statement` once `renderProblemCard` has returned, seeds `S.memory.segment` from the values, fits the plane when an end is outside it (`showEnds`, also after a preset when a values preset opened the page). `resolvePreset` is unchanged.

### 4.6 Events and lifecycle

No new event, no new `window.__mv` key, no listener on `window` or `document`. Lifecycle additions: `addresses` keeps a `gone` flag so that a `videoPanel` that resolves after `unmount` removes its own section; `powers` pushes `card.destroy` onto its disposers. Everything else is DOM inside the station's `<section>`, removed by the router.

---

## 5. Algorithms

### 5.1 One reader per station (`valuesStart`)

1. `v = valuesOf(preset, VALUES_SHAPE)`. `null` unless `preset.kind === 'values'`; otherwise an object with the valid keys only. **Never read `preset.values` directly** (A6).
2. If `v` has none of the keys the station can apply, return `null` (D6). That is what makes the malformed request of A3 a plain visit.
3. Fill what is missing from the station's defaults (powers: z = √3 + i, n = 10; curves: the handout end; distance: `DEFAULTS[mode]`, radius 3); return fresh copies (`+ 0` removes `-0`).
4. Station specifics:
   - **addresses**: `{ z }`.
   - **distance**: `hasCircle = a or R present`, `hasTwo = z1 or z2 present`; `asked = '1.2.1' → circle, '1.2.2' → two, else null`; `mode = v.mode`, else the one whose keys came when only one kind came, else `asked`, else `two` if `hasTwo`, else `null` (→ return `null`); a mode whose own keys are all missing returns `null`. Circle: `radius = v.R ?? 3`, `dot = circleDot(a, radius)`.
   - **powers**: `z` within ±4.2 in both parts (the left plane does not zoom); `n` an integer 1..12.
   - **roots**: if `quadratic` is valid and `quadraticModel(...).ok` and `|d| <= 100` → the quadratic state (n = 2, c = d, `quadFirst`); else `c` (`|c| <= 100`) and/or `n` (2..12) over the defaults; `callout` is `preset.problem` when it is `'1.4.1'` or `'1.4.2'`, else `null`.
   - **curves**: `a`, `b` over the handout's ends; `b = a + clampSize(b - a)`.

### 5.2 `freshText(problem, preset, opened)` and `typesetAnswer(text)`

(Fix round 1, section 0.5 F2 and F4.)

1. `typesetAnswer(text)` is pure and total (`null` gives `''`). Rules, in order: `sqrt(a)` to the radical (`√a` for digits only, else `√(a)`); `pi` as a word to the pi sign, `2 pi k` to `2πk`; `theta` to `θ`; ` <= `, ` >= `, ` +- `, ` -> ` to their signs; `0..4` to `0, …, 4`; `z_k` to a subscript k; `{... k ...}` to `... , k any integer`. Exponents (`^(...)`, `^2`) are kept for `prose()`.
2. `freshText`: `answer = typesetAnswer(problem.answer.text)` when `freshNote(problem, preset)` is not `''` (the request names this problem), else `''`. Result: `Fresh numbers from the Rehearsal Room. Opened with <opened>; the handout's own numbers have this answer: <answer>.` or, with no answer, `Fresh numbers from the Rehearsal Room. Opened with <opened>.`
3. The caller passes the problem **the card shows** (never the one named in the request), so a mismatch gives the short form.
4. The element is filled with `prose(el, text)`; an empty text empties it (the `:empty` rules hide it).

### 5.3 The chips and the note on each card

- **addresses** (`problemStrip`): after `statement` append `note` (`p#addresses-problem-note`, text `noteText`) and `decisions` (`div#addresses-problem-decisions` > `decisionChips(p, { idPrefix: 'addresses-problem' })`). The badge and the why line stay.
- **distance** (`renderProblem`, called by every `setMode`): for a mode with a problem (`two` → 1.2.2, `circle` → 1.2.1) build `note` (text `freshText(p, ctx.preset, V.line)` iff `V` exists and `V.mode === st.mode`, else `''`) and `decisions` for that problem; append them after the statement. The topic callout gets neither.
- **powers**: `card = problemCard(ctx, problemById('1.3.2'), { id: 'powers-problem' })`; if `V`, `card.setNote(freshText(problem, ctx.preset, 'z = ' + fmtCart(V.z) + ' and n = ' + V.n))`; the card element goes after the header.
- **roots**: `renderProblem(host, p, ..., idPrefix)` appends `div#<idPrefix>-decisions` after the statement when `p` exists (the neutral callout returns before it). `mountSlot` builds one ghost per variant with `idPrefix = roots-ghost-<index>` (only the 1.4.1 and 1.4.2 variants have a problem, so only `roots-ghost-0` and `-1` get chips), so those ghosts are as tall as the live callout and every button in them has an id. The live callout uses `roots-problem`, the quadratic one `roots-quadratic-problem`. `refreshCallout()` re-renders only when the callout key changes (as before), so chips are built at most once per swap.
- **curves**: after `renderProblemCard(problemCard, '1.5.1')`: `cardStatement = problemCard.querySelector('.cv-statement')`; `cardStatement.after(cardNote, cardDecisions)` with the chips inside `cardDecisions`.

### 5.4 The roots callout while the numbers are fresh

1. At mount `fresh = V ? { c, n, callout } : null`.
2. `calloutNow()`: if `fresh && fresh.callout && eq(S.c, fresh.c, 1e-12) && S.n === fresh.n` return `{ key: 'fresh ' + fresh.callout, prob: problemById(fresh.callout) }`; else the iteration-1 rules (1.4.1 for c = 1, n = 5; 1.4.2 for c = -16, n = 4; "from the quadratic"; neutral).
3. The note element is created once (`p.rt-fresh#roots-problem-note`) and placed right after `problemSlot` (or after `quadProblem` inside the quadratic panel when `V.kind === 'quadratic'`). It never moves and is never re-rendered, so the callout swap cannot shift the planes (P5).
4. `applyPreset(key)`: `fresh = null; problemNote.textContent = ''` (D5).

### 5.5 The glyph

1. At mount: `glyph = moveGlyph(zNow, { id: '<station>-glyph', size: '2em' })`; `row = div.<prefix>-readout-row` with children `glyph`, `readout`; the readout element and its text are the ones of iteration 1.
2. In `render()`, right after the readout's `textContent` is written: `updateGlyph(glyph, zForGlyph)` where `zForGlyph` is `m.z` (addresses: the cleaned model point; the origin is `{0, 0}`) or `m.defined ? m.zn : {0, 0}` (powers: the multiplied-out power). `updateGlyph` is a no-op for an unchanged value.
3. The glyph's text is `glyphText(z)`: `turn` is `Arg z` in degrees to one decimal (whole when whole, ASCII minus), `stretch` is `|z|` through the kit's 3-decimal formatter (`1024`, `1.732`, `4×10⁻⁴`); `no move: 0` for the origin.

### 5.6 Fitting the view to fresh numbers

- **distance**: `pointsShown(mode)`: two → `0, z1, z2, z1 − z2`; triangle → `0, z1, z1 + z2, z2`; circle → `a ± r`, `a ± ir` with `r = |dot − a|`. `inView(z)`: `|re − centre.re| <= halfWidth − 0.6` and `|im − centre.im| <= halfHeight − 0.6`, half sizes from `getView()` and `getSize()`. `ensureShown(mode)`: if any point is outside, `plane.fitTo(points, 0.2)` (which also becomes Reset's home). Called once at mount and in `setMode` **only when `V` exists**, so a plain visit never moves the view.
- **curves**: `showEnds()`: points `a, b` (segment) or `a, b, 2a − b` (the other presets); if any is outside the view (margin 0.3) `plane.fitTo([0, ...points], 0.2)`; at mount and in `loadPreset`, only when `V` exists.
- **addresses**: `ensureVisible(S.z, { reset: true })` (iteration 1) already zooms to the point. **powers**: `valuesStart` drops a `z` outside ±4.2. **roots**: `fitViews` already fits to `c` and the roots.

### 5.7 The video panel (addresses)

1. `videoHost = div#addresses-video-host`, placed after the hint paragraph in the left column (after the plane).
2. After the first paint: `videoPanel(videoHost, 'two-addresses').then((panel) => { if (gone && panel) panel.remove(); }, () => {})`; `gone` is set by a disposer. The call resolves with nothing when the manifest has no entry.

### 5.8 Timing, resolution, animation

No new canvas, no new `requestAnimationFrame` loop, no resize or `devicePixelRatio` handling: the glyph is a 24 × 24 SVG whose size is CSS (`2em`), the chips are DOM, the only asynchronous piece is `videoPanel`. Nothing new animates, so reduced motion needs no branch.

---

## 6. Mathematics

### 6.1 Formulas this goal's code uses

- Move of a number: `r = |z| = √(x² + y²)`, `θ = Arg z ∈ (−π, π]`, `Arg(negative real) = π`, `Arg 0` undefined (the glyph says `no move: 0`).
- Glyph (box 24, centre (12, 12), unit circle radius `unitR = 12/2 = 6`): the ray ends at distance `unitR · min(r, 2)` in direction θ (the imaginary axis points up), so `r = 1` ends on the unit circle and `r ≥ 2` on the box edge; `clipped` (dashed ray) iff `r > 2` (to 1e-9 relative); the arc runs on the unit circle from angle 0 to θ, drawn only when `θ ≠ 0`.
- Label: `turn = round(θ · 180/π, 1 decimal)`, `stretch = fmtNum(r, 3)` with the small-number rule.
- Power: `zⁿ = rⁿ e^{inθ}`; `nθ = 5π/3` wraps to `Arg(zⁿ) = nθ − 2πk ∈ (−π, π]`.
- Roots: `z_k = |c|^{1/n} e^{i(Arg c + 2πk)/n}`, `k = 0 … n−1`.
- Quadratic: `a z² + b z + c = 0 ⇔ (z − h)² = d`, `h = −b/2a`, `d = (b² − 4ac)/4a²`, roots `h + s`, `h − s`, `s = principal √d`.
- Segment: `z(t) = a + t(b − a)`, `0 ≤ t ≤ 1`; `z′(t) = b − a`.
- `circleDot(a, R)`: `a + R(cos φ + i sin φ)` for φ in `π/2, 0, −π/2, π`; accepted when `−4 + 0.6 ≤ re ≤ 8 − 0.6` and `−3 + 0.6 ≤ im ≤ 9 − 0.6` (the distance view is [−4, 8] × [−3, 9]); rounded to 1e-12 so that `cos(π/2)` is exactly 0.

### 6.2 Every problem these stations own, solved in both addresses

For each: the **address that makes it easy**, the Cartesian solution, the polar solution, the checked numbers (they are the unit-test expectations of Appendix C, `M1` to `M5`), and what the station shows.

**1.3.1: write z = −1 + i√3 in polar and exponential form; what is Arg z?** (C→P; names: home.) The data is Cartesian and the question asks for the polar address, so convert.
- Cartesian: `r = √((−1)² + (√3)²) = √4 = 2`. `cos θ = x/r = −1/2`, `sin θ = y/r = √3/2`, which is the angle in the second quadrant with reference angle π/3, so `θ = π − π/3 = 2π/3`. (The calculator trap: `arctan(y/x) = arctan(−√3) = −π/3 = −1.047` is in the fourth quadrant, wrong; add π.)
- Polar: read the dot: length 2, direction 120°. `z = 2(cos 2π/3 + i sin 2π/3) = 2e^{i2π/3}`; `Arg z = 2π/3 ≈ 2.094395`; `arg z = {2π/3 + 2πk : k ∈ ℤ}`.
- Check: `2 cos(2π/3) = −1`, `2 sin(2π/3) = √3 = 1.7320508`.
- Station: readout `z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)`; glyph `move: turn 120°, stretch 2`; chips `Cartesian, then polar` / `names: home`.

**1.2.1: sketch |z − (1 + 2i)| = 3.** (P.) "Distance from a is R" is a circle, no algebra.
- Cartesian: `(x − 1)² + (y − 2)² = 9`: centre (1, 2), radius 3.
- Polar: `z = (1 + 2i) + 3e^{iφ}`, `0 ≤ φ < 2π`; every φ is a name for `arg(z − a)` and gives one point at distance 3.
- Checks (distance from (1, 2)): φ = 0 → (4, 2); φ = π/3 → (2.5, 4.598076); φ = π/2 → (1, 5); φ = π → (−2, 2); φ = 3π/2 → (1, −1); each is exactly 3 away.
- Station: readout `circle: center 1 + 2i, radius 3`; the dot z = 1 + 5i; chips `Polar` / `names: none`.

**1.2.2: distance between 4 + 3i and −1 + i.** (C.) A distance is the length of one slide, and a slide is a subtraction.
- Cartesian: `z₁ − z₂ = (4 − (−1)) + (3 − 1)i = 5 + 2i`; `d = √(25 + 4) = √29 = 5.385165`.
- Polar (the long way, as a check): `r₁ = 5`, `θ₁ = atan2(3, 4) = 0.643501`; `r₂ = √2`, `θ₂ = atan2(1, −1) = 3π/4 = 2.356194`; `cos(θ₁ − θ₂) = cos(−1.712693) = −0.141421 = −1/(5√2)`; `d² = r₁² + r₂² − 2r₁r₂ cos(θ₁ − θ₂) = 25 + 2 − 2(5)(√2)(−0.141421) = 27 + 2 = 29`. The slide itself is `√29 e^{i·0.380506}` (`Arg(5 + 2i) = 21.8014°`).
- Station: readout `d = 5.385; z₁ − z₂ = 5 + 2i`; chips `Cartesian` / `names: none`.

**1.3.2: (√3 + i)^10 in Cartesian form.** (C→P→C; names: any, report on the home step.)
- Polar: `r = 2`, `θ = π/6`; `r^10 = 1024`; `10θ = 10π/6 = 5π/3 ≈ 5.235988`, which is not in (−π, π]; subtract 2π: `Arg(z^10) = −π/3`. `z^10 = 1024(cos(−π/3) + i sin(−π/3)) = 1024(1/2 − i√3/2) = 512 − 512√3 i ≈ 512 − 886.810013i`.
- Cartesian (multiply out by squaring): `z² = (3 − 1) + 2√3 i = 2 + 2√3 i`; `z⁴ = (z²)² = (4 − 12) + 8√3 i = −8 + 8√3 i`; `z⁸ = (z⁴)² = (64 − 192) − 128√3 i = −128 − 128√3 i`; `z^10 = z⁸ z² = (−128 − 128√3 i)(2 + 2√3 i) = (−256 + 768) + (−256√3 − 256√3)i = 512 − 512√3 i`. Both routes agree.
- Station: readout `zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)`; glyph `move: turn -60°, stretch 1024` (dashed: 1024 > 2); chips `Cartesian, polar, then back` / `names: any`.

**1.4.1: the 5th roots of unity.** (P; names: all.)
- Polar: `arg 1 = {2πk}`; divide every name by 5: `z_k = e^{2πik/5}`, `k = 0 … 4`, five points 72° apart on the unit circle; k = 5 is k = 0 again.
- Cartesian: `z⁵ = 1 ⇔ (z − 1)(z⁴ + z³ + z² + z + 1) = 0`; divide the quartic by z² and put `t = z + 1/z`: `t² + t − 1 = 0`, `t = (−1 ± √5)/2 = 2cos θ`, so `cos 72° = (√5 − 1)/4 = 0.309017`, `cos 144° = −(√5 + 1)/4 = −0.809017`. This is why the polar address is the easy one.
- Roots: `k=0: 1`; `k=1: 0.309017 + 0.951057i`; `k=2: −0.809017 + 0.587785i`; `k=3: −0.809017 − 0.587785i`; `k=4: 0.309017 − 0.951057i`. Principal args `0, 2π/5, 4π/5, −4π/5, −2π/5`. Primitive (gcd(k, 5) = 1): `false, true, true, true, true`.
- Station: preset `c = 1, n = 5`; chips `Polar` / `names: all`.

**1.4.2: all the 4th roots of −16, in exponential and Cartesian form.** (P→C; names: all.)
- Polar: `|−16| = 16`, `16^{1/4} = 2`; `Arg(−16) = π` (never −π); the names of arg are `π + 2πk`; divide by 4: angles `π/4, 3π/4, 5π/4, 7π/4` (principal `π/4, 3π/4, −3π/4, −π/4`); `z_k = 2e^{i(π/4 + kπ/2)}`.
- Cartesian: `z⁴ = −16 ⇔ (z² − 4i)(z² + 4i) = 0`, `z² = ±4i`, and `(√2 + √2 i)² = 4i`, `(√2 − √2 i)² = −4i`, so `z = ±(√2 + √2 i)` and `±(√2 − √2 i)`.
- Roots: `√2 + √2i = 1.414214 + 1.414214i`; `−√2 + √2i`; `−√2 − √2i`; `√2 − √2i`. Check: `(√2(1 + i))⁴ = 4(1 + i)⁴ = 4(2i)² = −16`.
- Station: `c = -16, n = 4`; readout `c = -16; n = 4; |c|^(1/n) = 2; Arg c = π; roots at (Arg c + 2πk)/n; k = 0..3`; chips `Polar, then Cartesian` / `names: all`.

**1.4.3: solve z² − 4z + 13 = 0.** (C; names: all.)
- Cartesian: `z = (4 ± √(16 − 52))/2 = (4 ± √(−36))/2 = (4 ± 6i)/2 = 2 ± 3i`. Check: `(2 + 3i)² − 4(2 + 3i) + 13 = (−5 + 12i) − (8 + 12i) + 13 = 0`.
- Polar (the root in disguise): complete the square, `(z − 2)² = −9`; `−9 = 9e^{iπ}`, so `z − 2` is one of the two square roots `3e^{iπ/2} = 3i` and `3e^{i3π/2} = −3i`; slide by 2. The roots are a mirror pair across the real axis. `h = 2`, `d = −9`.
- Station: quadratic panel `(z - 2)² = -9; square roots: ±3i; roots: 2 + 3i, 2 - 3i`; chips on `#roots-quadratic-problem`: `Cartesian` / `names: all`.

**1.5.1: parameterise the line from 2 + i to −3 − 3i.** (C; names: none.)
- Cartesian: `z(t) = (2 + i) + t((−3 − 3i) − (2 + i)) = (2 + i) + t(−5 − 4i) = (2 − 5t) + i(1 − 4t)`, `0 ≤ t ≤ 1`. `z(0) = 2 + i`, `z(1) = −3 − 3i`, `z(1/2) = −0.5 − i`.
- Polar: the direction `d = −5 − 4i` has `|d| = √41 = 6.403124` and `Arg d = atan2(−4, −5) = −2.466852` (−141.34°): walk at speed √41 in that direction; the points of the line have no tidy polar addresses, the step does.
- Station: readout at t = 0.5 `t = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1`; chips `Cartesian` / `names: none`.

### 6.3 The fresh-number cases of A3 (hand-checked)

| Station | Request values | On screen | Check |
|---|---|---|---|
| addresses | `z = 2i` | `window.__mv.addresses.state().z = {0, 2}`; readout `z = 2i; \|z\| = 2; Arg z = 1.571 (π/2)` | `r = 2`, `Arg = π/2`; glyph `move: turn 90°, stretch 2` |
| distance | `mode two, z1 = 1 + 5i, z2 = −2 + i` | `d = 5; z₁ − z₂ = 3 + 4i` | `Δ = 3 + 4i`, `√(9 + 16) = 5` |
| powers | `z = √2 + √2 i, n = 4` | `zⁿ = -16; \|z\|ⁿ = 16; nθ = 3.142 (π); home step = 3.142 (π)` | `r = 2`, `θ = π/4`, `4θ = π`, `z⁴ = 16e^{iπ} = −16`; glyph `move: turn 180°, stretch 16` |
| roots | `c = −81, n = 4` | `c = -81; n = 4; \|c\|^(1/n) = 3; Arg c = π; ...` | `81^{1/4} = 3`; roots `3e^{i(π+2πk)/4} = ±3/√2 ± 3i/√2 = ±2.121320 ± 2.121320i` |
| roots (quadratic) | `a = 1, b = −6, c = 25` | quadratic readout `(z - 3)² = -16; square roots: ±4i; roots: 3 + 4i, 3 - 4i`; big picture `c = -16; n = 2` | `disc = 36 − 100 = −64`, `h = 3`, `d = −64/4 = −16`, `√d = 4i`, roots `3 ± 4i` |
| curves | `a = 1 + 2i, b = −1 − 2i`; slider t = 0.5 | `t = 0.5; z(t) = 0; x(t) = 0; y(t) = 0` | `z(0.5) = (1 + 2i) + 0.5(−2 − 4i) = 0` |
| distance (circle) | `mode circle, a = −4 + 3i, R = 4` | `circle: center -4 + 3i, radius 4`, view fitted | the dot `a + 4` = 0 + 3i |

### 6.4 The glyph strings (A2) and the meanings the chips show

| z | Move | `aria-label` |
|---|---|---|
| −1 + i√3 | `r = 2`, `θ = 120°` | `move: turn 120°, stretch 2` |
| 2 | `r = 2`, `θ = 0` | `move: turn 0°, stretch 2` |
| 0 | none | `no move: 0` |
| (√3 + i)^10 = 512 − 886.81i | `r = 1024`, `θ = −60°` | `move: turn -60°, stretch 1024` |
| (√3 + i)² = 2 + 3.464i | `r = 4`, `θ = 60°` | `move: turn 60°, stretch 4` |
| (√3 + i)^12 = 4096 | `r = 4096`, `θ = 0` | `move: turn 0°, stretch 4096` |
| (√2 + √2 i)⁴ = −16 | `r = 16`, `θ = 180°` | `move: turn 180°, stretch 16` |

Meanings (kit text, verbatim): Address `C` "A slide question: add or compare the x and y parts."; `P` "A move question: turn by the angle, stretch by the length."; `C->P` "Read the polar address of the given point, then work there."; `P->C` "Work in polar, then write the answer as x + iy."; `C->P->C` "Convert to polar, do the move, convert back." Names `none` "No angle in the question."; `any` "Any name of the angle works: powers, products, directions, cos and sin."; `all` "Every name gives a different answer: roots take all n steps."; `home` "The home step only: Arg z in (−π, π], and principal values."

---

## 7. Verification plan

Run from the repo root. The three interaction criteria are one script, `tests/interact/i2-decisions-everywhere-a.mjs` (Appendix B); it starts on `#addresses` and visits every other route by `window.__mv.app.navigate`, so a single route is enough, and it runs at desktop, phone and (with `--dark`) dark desktop.

| Criterion | Command | Passes when |
|---|---|---|
| A1 | `node tools/smoke.mjs --route addresses --script tests/interact/i2-decisions-everywhere-a.mjs --dark --no-shots` (step A1) | on `problem-1-3-1`, `problem-1-2-1`, `problem-1-3-2`, `problem-1-4-2`, `problem-1-5-1`: `#<station>-problem-address` has `data-value` = `problemById(id).address` and `#<station>-problem-names` = `.names` (read from `js/data/problems.js`, not from this table); both chips are in `#<station>-problem-decisions`; a tap on `-names` shows `#<station>-problem-meaning` with `namesMeaning(names)` and `aria-expanded="true"`, the address chip switches it, a second tap hides it; on distance the mode chips change the chips (two → `C`/`none`, triangle → none); on roots `#roots-preset-1` gives `P`/`all` (1.4.1), `#roots-preset-i` no chips, and `#roots-quadratic-problem-address` is `C`, `-names` `all`; no duplicate ids; no horizontal overflow |
| A2 | same run (step A2) | `#addresses-glyph` `aria-label` `move: turn 120°, stretch 2`, readout text unchanged `z = -1 + 1.732i; \|z\| = 2; Arg z = 2.094 (2π/3)`, glyph and readout are siblings; after `dragHandle(page, 'addresses-plane-z', {re:2, im:0})` `move: turn 0°, stretch 2`; at z = 0 `no move: 0`; computed colour = `--polar`; `#powers-glyph` `move: turn -60°, stretch 1024` on `problem-1-3-2`, readout unchanged, `move: turn 60°, stretch 4` at n = 2, `move: turn 0°, stretch 4096` at n = 12, `no move: 0` at z = 0 |
| A3 | same run (step A3) | per station the request `{ station, problem, family: problem, values }` then a mount: addresses `state().z = 2i` and `Arg z = 1.571 (π/2)`; distance `d = 5`; powers `/zⁿ = -16\b/`; roots `c = -81; n = 4; \|c\|^(1/n) = 3`; curves `z(t) = 0` at t = 0.5; each `#<station>-problem-note` contains `Fresh numbers` and `Opened with`; the next plain visit has no note and the handout numbers; the malformed `{ c: 'x', n: 99 }` leaves roots at c = 1, n = 5 with an empty note and no console error (the harness fails the route on any); quadratic, partly good, circle and out-of-view cases (section 7.3) |
| A4 | `node tools/interact-all.mjs --jobs 1 i1-station-addresses-arithmetic i1-station-distance-sets i1-station-curves-linear i1-station-roots-principal i1-station-staircase-powers i1-station-branches-graph4d i1-station-powermap-reciprocal i1-station-mappings-cr i1-station-limits-derivative i1-integration`; then `npm test` | the five scripts of this goal's stations exit 0 (27, 15, 18, 18 and 12 checks measured); the scripts of the other halves' stations must not regress (they run unchanged code here); `i1-integration` has the two baseline stops of section 0.4 until `rehearse.js` and the T2 link of `graph4d` land, and nothing else may fail in it; `npm test` shows no failure beyond the 5 baseline ones of section 0.1 item 5; no iteration-1 file is edited (`git status` lists only the five stations, the two new test files and the design) |
| A5 | `node tools/smoke.mjs --dark --no-shots --route addresses,distance,powers,roots,curves,sets,mappings,linear,powermap,principal-root,branches,reciprocal,limits,derivative,cauchy-riemann,problem-1-1-1,problem-1-1-2,problem-1-2-1,problem-1-2-2,problem-1-3-1,problem-1-3-2,problem-1-4-1,problem-1-4-2,problem-1-4-3,problem-1-5-1,problem-1-5-2,problem-2-1-1,problem-2-1-2,problem-2-1-3,problem-2-2-1,problem-2-2-2,problem-2-3-1,problem-2-4-1,problem-2-5-1,problem-3-1-1,problem-3-1-2,problem-3-2-1,problem-P1,problem-P2,problem-P3,problem-P4,problem-P5,problem-P6,problem-P7` (44 routes: the 15 station routes and the 29 `routeFor(id)` routes) | `132/132 checks passed`, zero problems (console errors, page errors, failed requests, horizontal overflow, the under-construction panel); the 13 routes of the five stations measured 39/39 on the prototype |
| A6 | code inspection against Appendix A | the diff adds the chips host, the note, the values branch, the glyph and (addresses only) the `videoPanel` call and removes or renames no element id, readout string or hook (the 20 removed lines are signature or call-site lines of the same statements, listed in 7.4); glyph is a sibling (unit test `P1` and script step A2); `valuesOf` is the only reader (`P1`); no literal colour (`P1`); the custom-`src` chips of A6 are the other halves' (none of these five stations compiles a custom function) |

### 7.1 Unit tests (`tests/unit/i2-decisions-everywhere-a.test.mjs`, Appendix C, `node --test tests/unit/i2-decisions-everywhere-a.test.mjs`)

| Id | Case | Expected |
|---|---|---|
| V1 | every `valuesStart` on `null`, `undefined`, a problem preset, a token preset, `{}` values, junk | `null` |
| V2 | addresses `{ z: 2i }`; `-0`; 101; NaN; a string; a string part | `{ z: {0, 2} }`; `{0, 0}` (no `-0`); `null` ×4; fresh copy each call |
| V3 | `freshText` with the matching problem, a mismatching id, `null`, no preset | starts `Fresh numbers from the Rehearsal Room. The handout's own answer: z = 2(cos(2pi/3)`; ends `. Opened with z = 2i.`; the other three `Fresh numbers from the Rehearsal Room. Opened with z = 2i.` |
| V4 | distance two / circle / keys only / triangle / mode with no numbers / bad mode / radius 0.1 / z1 out of range / missing z2 | mode, state, `line` as in section 5.1; `null`; radius 3 and `null` as written in the test |
| V5 | `circleDot` | `(1,2),3 → 1+5i`; `(−4,3),4 → 0+3i`; `(1,7),3 → 4+7i`; `(7,7),3 → 7+4i`; distance from the centre is R |
| V6 | powers readers | `(√2+√2i, 4)`; z only → n 10; n only → z √3+i; bad n dropped; 2.5 dropped; ±4.2 allowed; 4.3 with n 99 → `null`; n 0 → `null` |
| V7 | roots readers | state `{ c: −81, n: 4, sel: 0, quad: {1,−4,13}, quadFirst: false }`, `kind cn`, `callout 1.4.2`, `line 'c = -81 and n = 4'`; no problem → `callout null`; 1.4.3 → `null`; malformed → `null`; partly good keeps `c = 1`; 101 → `null`; n 1 → `null`; quadratic `(1, −6, 25)` → `quadFirst true`, `c = −16`, `n = 2`; a = 0 → `null`; d = 875 → `null`; a bad quadratic keeps a good c; `initialState(null)` unchanged |
| V8 | curves readers | ends and `line 'a segment from 1 + 2i to -1 - 2i'`; a = b → b = a + 0.2; handout ends kept; 60 → `null` |
| M1 | 1.3.1 through `addressModel`, `addressReadout`, `glyphText` | `r = 2`, `θ = 2π/3`, naive arctan wrong, readout `z = -1 + 1.732i; \|z\| = 2; Arg z = 2.094 (2π/3)`, glyphs of 2, 0 and 2i |
| M2 | 1.2.1, 1.2.2 through `circleStats`, `slideStats`, `readoutText` | circle points at distance 3; `(2.5, 4.598076)`; `slide 5 + 2i`, `d = dPolar = 5.385165`, `Arg 0.380506`, `cross = crossPolar = −1`; both readouts |
| M3 | 1.3.2 through `powerModel`, `powersReadout`, `cartesianChain`, `glyphText` | `1024`, `5π/3`, `−π/3`, one turn removed, `512 − 886.81i`, the squaring chain `2+2√3i`, `−8+8√3i`, `−128−128√3i`; fresh `−16`; glyph strings of section 6.4 |
| M4 | 1.4.1, 1.4.2, 1.4.3, fresh `c = −81` through `rootsModel`, `quadraticModel` | the five unity roots to 1e-9, primitive flags, `cos 72°` and `cos 144°` from `t² + t − 1`; the four roots of −16, principal args `1, 3, −3, −1` times π/4, readout; `Q.d = −9`, `h = 2`, roots `2 ± 3i`, readout; `±3/√2 ± 3/√2 i`; `(1, −6, 25)` |
| M5 | 1.5.1 through `curveAt`, `velocityAt`, `readoutText` | `z(0.5) = −0.5 − i`, ends, velocity `−5 − 4i`, `√41`, `Arg −2.466852`, readouts |
| M6 | the five problems' chips from the data | `1.3.1 C->P/home`, `1.2.1 P/none`, `1.2.2 C/none`, `1.3.2 C->P->C/any`, `1.4.1 P/all`, `1.4.2 P->C/all`, `1.4.3 C/all`, `1.5.1 C/none` |
| P1 | source pins (section 0.2) and the glyph-row markup, `valuesOf(preset, VALUES_SHAPE)` in all five, no `preset.values`, no literal colour in the new CSS | holds |

### 7.2 Interaction-script steps (Appendix B)

1. Start on `#addresses`. `go(route)` = `window.__mv.app.navigate(route)` then wait for `#view[data-route=route][data-state=ready]` and 3 frames. `fresh(station, problem, values)` = `go('nosuchplace')`, `window.__mv.app.request({ station, problem, family: problem, values })`, `go(station)`.
2. **A1**: the loop of the table above, then distance modes, roots presets, the quadratic chips, duplicate-id and overflow checks.
3. **A2**: addresses glyph, sibling test, drag, origin, computed colour; powers glyph at n = 10, 2, 12 and at the origin.
4. **A3**: the five requests with their checks and notes; the plain visit after; the malformed roots request; the malformed requests on the other four; the quadratic; powers with a bad n; distance circle with a fitted view; curves ends −5 + 4i and 5 − 4i inside the plane.
5. **Extras**: a preset clears the note on addresses, powers, curves, roots (a drag does not, and the roots plane does not move when the callout swaps); distance keeps the note per mode; the video host is after the plane and holds `#video-two-addresses` exactly when the manifest lists it; **step I-scan**: the I6, I7 and I8 scans of `i1-integration` on `addresses`, `distance`, `powers`, `roots`, `curves`, `problem-1-3-1`, `problem-1-4-3`; on the phone, the roots page with a meaning open and the quadratic card do not overflow.

### 7.3 What "passing" looks like

`3/3 checks passed across 1 route(s).` with four log lines per run (`A1 ...`, `A2 ...`, `A3 ...`, `extras ...`). A failure names the assertion and the numbers (for example `A3 roots readout: c = 1; n = 5; ...`).

### 7.4 The 20 removed lines of Appendix A (A6)

`problemStrip(prefix, p)` signature and its call; the `addresses-hint` paragraph's closing `)),` (now `}), videoHost),`); `readoutEl,` (twice: replaced by the row); `mode: modeFromPreset(ctx.preset),`; the `problemBox.append(... stmt,` line; the one-name import of `problemsForStation`; the `setZN` preset listener line; the `renderProblem` signature and its last `host.append(head, why)`; the ghost loop (three lines, now `variants.forEach`); `const S = initialState(preset)`; the `renderProblem(quadProblem, ...)` call; the `quadStack.append(...)` line; the two `el.append(...)` lines of roots; the `renderProblem(problemBox, ...)` call. Each is replaced by the same statement plus the addition; no id, readout string or hook disappears.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases.**
- A request for `distance` with only `R` (or only `a`): circle mode, the other key from the handout (`a = 1 + 2i`, `R = 3`).
- Fresh `distance` numbers outside the starting view: fitted once; a mode switch re-fits only when a point of the new mode falls outside the current view.
- `roots`: fresh `c` with `|c| > 100`, `n` outside 2..12, a quadratic with `a = 0` or `|d| > 100` are dropped key by key; a fresh pair on 1.4.1 or 1.4.2 shows that problem's card until a drag or the `n` slider moves `(c, n)` off the pair, then the neutral callout (the note stays); returning to exactly the pair brings the card back.
- `powers` with a fresh `z = 0` is accepted (the shape allows it): readout `zⁿ = 0; |z|ⁿ = 0; nθ and home step: no angle at 0`, glyph `no move: 0`.
- `addresses` with `z = 0`: readout `z = 0; |z| = 0; Arg z: no angle at 0`, glyph `no move: 0`; tiny points print `4×10⁻⁴` in the glyph label too (kit formatter).
- A request that names a problem of another station: the card shows its own problem and the short note.
- The request is consumed at the first mount; a reload or a second visit is plain.
- A preset or `n` chip pressed while the page is fresh: the note is removed (`:empty` hides it, the card shrinks by one block; this is a button press, not a drag).
- `curves`: `a = b` becomes a segment of length 0.2 heading east; fresh ends bigger than 50 are dropped.

**Performance.** `updateGlyph` costs about 0.01 ms per changed value and about nothing for a repeated one (kit measurement), so a 60 fps drag of z is unaffected. Chips are built once per card change: `roots` rebuilds them only when `calloutNow().key` changes (a swap, not a drag); `distance` once per mode change; the other three once at mount. The roots slot's two problem ghosts now carry a chip pair each: four more buttons in the DOM, no visible cost. `fitTo` runs at most once per mount and mode change. No new canvas redraw, no new timer.

**Accessibility.** Chips are buttons with `aria-expanded` and `aria-controls`; the meaning is `role=status` (polite); tap targets 2.75rem; visible focus. The glyph has `role=img` and the whole move in its label; the digits are always in the readout beside it. The fresh note is plain text in reading order (statement, note, chips). The ghosts are `aria-hidden` and `inert`, so a screen reader and the Tab key never reach their chips. Contrast comes from tokens (`--polar` on `--surface` meets the same ratio as every other `--polar` text on the site).

**Reduced motion.** Nothing new animates. The chips' meaning appears instantly; the glyph redraws instantly; the video does not autoplay (kit).

**Phone (390 px, content width 358).** The chips wrap: the decisions block is one row (44 px) on `distance` and `curves` and two rows (96 px) on `addresses`, `powers` and `roots` (measured: `Cartesian, then polar` 195 px + `names: home` 141 px do not fit beside each other once the 8 px gap and the card padding are counted); the note wraps; the readout row is `display:flex` with `min-width: 0` on the readout, so the readout wraps inside its cell and the glyph tile keeps its 32 px; the video panel (when listed) is full width after the plane. Measured: no horizontal overflow on any of the five pages at 390 px with a meaning open and with a fresh note, and at 320 and 340 px for the pages the iteration-1 scripts check.

---

## 9. Out of scope; requests for other owners; risks

**Out of scope** (from the goal): replacing each station's header, card and links with the kit's (the kit's `problemCard` is used only where there was no card: powers); `staircase.js`, `arithmetic.js`, `graph4d.js`, `lab.js`, `home.js`, `problems.js`; editing any iteration-1 test; the move glyph on `a`, `f′(z₀)`, `A` and the custom-`src` chips (other halves); the Listen control; the mapping of the other ten stations.

**Requests for other owners** (record in the result's `requests_for_other_owners`):
1. `js/core/station-kit.js`: export `freshText(problem, preset, opened)` (this design writes it five times) and let `freshNote` accept a values preset whose `problem` is `null` (it returns `''` today).
2. `docs/ARCHITECTURE.md` section 9: add the ids of section 2.2 (`<station>-problem-decisions`, `-note`, `-address`, `-names`, `-meaning`, `addresses-glyph`, `powers-glyph`, `*-readout-row`, `*-glyph-note`, `addresses-video-host`, `powers-problem*`, `roots-quadratic-problem-*`, `roots-ghost-<i>-*`) and the `valuesStart` exports in the stations' lines; 4.1: distance `R` is a radius.
3. `i2-integration`: after the three halves land, re-run `i1-integration`. (Fix round 1: the fresh note is typeset, so its I6 scan may now also run on a page opened with a request; this goal's script does.)
4. `tools/smoke.mjs`: ignore `net::ERR_ABORTED` (and the `requestfailed` of a `/media/video/*.mp4|vtt` request) globally. Headless Chromium has no H.264, the video never loads, and every page that mounts a video panel reports `request failed: .../media/video/<id>.mp4` as soon as the page is left or closed, so plain `node tools/smoke.mjs --route addresses` (A5) and every script need a per-script allowance today. Until then A5 fails on the routes that host a video panel (`addresses`, `problem-1-3-1`, and the stations and problems of the other goals that host one) and on nothing else.
5. `docs/ARCHITECTURE.md` section 9 and `tests/interact/i1-integration.mjs`: not owned here (see request 2; `i1-integration` stops at I3 on `#graph4d`, a station of another goal).

**Risks.**
- The fresh note quotes the typeset form of the kit's `answer.text` (fix round 1). `typesetAnswer` is written five times (like `freshText`, D9) and covers the eight answers of these stations (unit test V3b); a later answer with another ASCII habit (`*`, `inf`) needs a rule added in all five files, or the kit should export one typesetter (request 1).
- `roots` has four more chip buttons in the DOM (the two problem ghosts of the slot, two chips each); `inert` keeps them out of the tab order. A browser without `inert` support would make them tabbable; the project targets current Chromium and the existing ghosts already rely on it.
- `curves.js` carries the new insertions in `mount`; when the kit card replaces the two copies (C26) the insertion becomes the kit's `decisions` option and this code is deleted.
- The glyph tile is a design choice (D7) measured on three viewports; since fix round 1 it is a filled `--surface-2` tile without an outline. If a reviewer prefers the bare 1.1em glyph, the change is two CSS lines and `size: '1.1em'`.
- **Concurrent goals.** Everything above was measured against the repository at the time of writing. Other wave-1 goals are editing `js/app.js`, `css/*.css`, `index.html`, the other stations and some iteration-1 tests in parallel (`git status` already shows them). The five files of this goal are untouched by them, so Appendix A applies cleanly, but the router, the shell and the tokens are shared: re-run A1 to A5 after the merge.
- `videoPanel` is asynchronous: when a video is listed the panel appears a few milliseconds after mount and pushes the right column down on a phone; the host has no reserved height because the manifest is unknown until it loads.

---

## Appendix A. Reference implementation: the diff of the five station files

Unified diff against the repository at the commit this design was written on (`git diff` format without the `diff --git` headers; apply from the repo
root with `patch -p1 < appendix-a.diff`, or copy the hunks). Written and run in a scratch copy; it is **additive** (A6): the removed lines are the ones
listed in section 7.4. Naming: the file-level `valuesStart`, `VALUES_SHAPE` and `freshText` are new exports; nothing exported before is renamed.

```diff
--- a/js/stations/addresses.js
+++ b/js/stations/addresses.js
@@ -17,6 +17,10 @@
 import { compile } from '../core/parse.js';
 import { problemById, problemsForStation, statementParts, addressLabel, addressTones } from '../data/problems.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
+import { videoPanel } from '../core/listen.js';
 
 export const ZERO_EPS = 1e-9;                                  // |z| below this is the origin
 const TWO_PI = 2 * Math.PI;
@@ -29,6 +33,23 @@
   Object.freeze({ id: '1-i', label: '1 + i', z: Object.freeze({ re: 1, im: 1 }) }),
 ]);
 
+// The values preset (ARCHITECTURE 4.1): { z }, both parts within the typed fields' range. A key that is missing or invalid is dropped.
+export const VALUES_SHAPE = Object.freeze({
+  z: (v) => (v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im) && Math.abs(v.re) <= 100 && Math.abs(v.im) <= 100 ? { re: v.re + 0, im: v.im + 0 } : undefined),
+});
+
+/** { z } from a values preset, or null (no values preset, or nothing usable in it). */
+export function valuesStart(preset) {
+  const v = valuesOf(preset, VALUES_SHAPE);
+  return v && v.z ? { z: { re: v.z.re, im: v.z.im } } : null;
+}
+
+/** The note of a card opened with fresh numbers: the kit's sentence (its short form when the problem does not match), then what was opened. */
+export function freshText(problem, preset, opened) {
+  const base = freshNote(problem, preset) || 'Fresh numbers from the Rehearsal Room.';
+  return base.replace(/[.\s]*$/, '.') + ' Opened with ' + opened + '.';
+}
+
 // ---------------------------------------------------------------------------------------------
 // 5.1 Shared pure helpers (copied into arithmetic.js on purpose: one goal owns both files, D11)
 // ---------------------------------------------------------------------------------------------
@@ -301,6 +322,12 @@
 .ax-bottom { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); align-items: start; }
 @media (min-width: 62rem) { .ax-bottom { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } }
 .ax-explain > h2 { margin-bottom: var(--space-2); }
+.ax-problem-note { margin: 0 0 var(--space-2); font-size: 0.92rem; }
+.ax-problem-note:empty { display: none; }
+.ax-decisions { min-width: 0; margin: 0 0 var(--space-2); }
+.ax-readout-row { display: flex; align-items: center; gap: var(--space-2); }
+.ax-readout-row .readout { flex: 1 1 auto; min-width: 0; }
+.ax-readout-row .move-glyph { flex: none; box-sizing: content-box; padding: 4px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); }
 `;
 
 function ensureStyle() {
@@ -360,7 +387,7 @@
 }
 
 // the problem strip: statement, the sentence on which address is native, the handout answer behind a closed details
-function problemStrip(prefix, p) {
+function problemStrip(prefix, p, noteText = '') {
   const tone = (addressTones(p.address)[0] || '--cart').replace(/^--/, '');
   const titleId = prefix + '-problem-title';
   const statement = h('p', { cls: 'ax-problem-statement', id: prefix + '-problem-statement' });
@@ -379,9 +406,13 @@
     tex(texBox, p.answer.tex, { display: true });
     textEl.textContent = p.answer.text;
   });
+  const note = h('p', { cls: 'ax-problem-note muted', id: prefix + '-problem-note', text: noteText });
+  const decisions = h('div', { cls: 'ax-decisions', id: prefix + '-problem-decisions' }, decisionChips(p, { idPrefix: prefix + '-problem' }));
   return h('section', { cls: 'panel ax-problem', 'data-tone': tone, id: prefix + '-problem', 'aria-labelledby': titleId },
     h('h2', { cls: 'panel-title', id: titleId, text: 'Problem ' + p.id }),
     statement,
+    note,
+    decisions,
     h('p', null, h('span', { cls: 'badge', 'data-tone': tone, text: addressLabel(p.address) }), ' ', why),
     details);
 }
@@ -391,6 +422,8 @@
 // ---------------------------------------------------------------------------------------------
 
 function initialZ(preset) {
+  const fresh = valuesStart(preset);
+  if (fresh) return fresh.z;
   if (preset && preset.kind === 'token') {
     const p = PRESETS.find((q) => q.id === preset.token);
     if (p) return { re: p.z.re, im: p.z.im };
@@ -427,7 +460,9 @@
     el.append(stationHeader(ctx,
       'One dot, two ways to say where it is. The Cartesian address says how far across and how far up. The polar address says which way to turn and how far to walk. Drag the dot and watch both change. The dot never moves because of how you describe it.',
       problemsForStation(ctx.station.id)));
-    if (problem) el.append(problemStrip('addresses', problem));
+    const fresh = valuesStart(ctx.preset);
+    if (problem) el.append(problemStrip('addresses', problem, fresh ? freshText(problem, ctx.preset, 'z = ' + fmtCart(fresh.z)) : ''));
+    const problemNote = el.querySelector('[id="addresses-problem-note"]');
 
     const mkInput = (id) => h('input', { cls: 'num', id, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' });
     const mkField = (id, label) => {
@@ -463,6 +498,10 @@
     const planeHost = h('div', { id: 'addresses-plane-host' });
     const noteEl = h('p', { cls: 'ax-note', id: 'addresses-note', 'aria-live': 'polite' });
     const readoutEl = h('div', { cls: 'readout', id: 'addresses-readout' });
+    const glyph = moveGlyph(S.z, { id: 'addresses-glyph', size: '2em' });            // beside the readout, never inside it
+    const readoutRow = h('div', { cls: 'ax-readout-row', id: 'addresses-readout-row' }, glyph, readoutEl);
+    const glyphNote = h('p', { cls: 'ax-hint', id: 'addresses-glyph-note', text: 'The small picture is the move that makes z. Its arc is the turn, Arg z, and its line is the stretch, |z|. A dashed line means the stretch is more than 2.' });
+    const videoHost = h('div', { id: 'addresses-video-host' });
     const stairsHost = h('div', { id: 'addresses-stairs-host' });
     const toStair = h('a', { cls: 'chip', id: 'addresses-to-staircase', href: '#staircase', text: 'See it walk around the origin' });
     const exHost = h('div', { id: 'addresses-ex-host' });
@@ -483,12 +522,14 @@
             h('label', { cls: 'check' }, ghostBox, 'Show other names of the angle'),
             h('label', { cls: 'check' }, snapBox, 'Snap to nice values'))),
         planeHost,
-        h('p', { cls: 'ax-hint', id: 'addresses-hint', text: 'Drag the dot, or Tab to it and use the arrow keys (Shift moves 10 times as far). Snap helps you land on round numbers; turn it off to move freely. The dashed grey ray is the seam: cross it and Arg jumps from π to −π.' })),
+        h('p', { cls: 'ax-hint', id: 'addresses-hint', text: 'Drag the dot, or Tab to it and use the arrow keys (Shift moves 10 times as far). Snap helps you land on round numbers; turn it off to move freely. The dashed grey ray is the seam: cross it and Arg jumps from π to −π.' }),
+        videoHost),
       h('div', { cls: 'ax-right' },
         mkPanel('cart', 'Cartesian address', 'x across, y up. The dashed blue lines.', h('div', { cls: 'ax-fields' }, fx.wrap, fy.wrap)),
         mkPanel('polar', 'Polar address', 'Turn by θ, walk r. The orange ray and arc.', h('div', { cls: 'ax-fields' }, fr.wrap, thetaWrap)),
         noteEl,
-        readoutEl,
+        readoutRow,
+        glyphNote,
         mkPanel('polar', 'The angle has many names',
           'arg z is every angle that reaches the dot: θ + 2πk. Arg z is the one name inside (−π, π]. The dot is the same for all of them.',
           stairsHost, h('p', null, toStair)))));
@@ -620,6 +661,7 @@
       const m = addressModel(S.z);
       lastModel = m;
       readoutEl.textContent = addressReadout(m);
+      updateGlyph(glyph, m.z);
       setField(fx.input, fieldNum(m.x), skipField);
       setField(fy.input, fieldNum(m.y), skipField);
       setField(fr.input, fieldNum(m.r), skipField);
@@ -699,6 +741,7 @@
         for (const f of [fx, fy, fr, ft]) setInvalid(f.input, false);
         render();
         note('Loaded ' + p.label + '.');
+        if (problemNote) problemNote.textContent = '';                  // these are the handout's numbers again
       });
     }
     for (const [id, b] of gridBtns) {
@@ -715,6 +758,10 @@
     // ---- first paint ----
     ensureVisible(S.z, { reset: true });
     render();
+    // the video of this station, right after its first picture; nothing is added until the manifest lists it
+    let gone = false;
+    disposers.push(() => { gone = true; });
+    videoPanel(videoHost, 'two-addresses').then((panel) => { if (gone && panel) panel.remove(); }, () => {});
     const mv = (window.__mv = window.__mv || {});
     mine.hook = {
       state: () => ({ z: { re: S.z.re, im: S.z.im }, r: Math.hypot(S.z.re, S.z.im), theta: isZero(S.z) ? null : Arg(S.z), grid: S.grid, ghosts: S.ghosts, snap: S.snap, userView: S.userView }),
--- a/js/stations/distance.js
+++ b/js/stations/distance.js
@@ -20,6 +20,8 @@
 import { C, add, sub, scale, abs, Arg, wrapArg, argSet, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
 import { problemById, problemsForStation, statementParts, routeFor } from '../data/problems.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
 
 // ---------------------------------------------------------------------------------------------------------------
 // constants (exported and frozen; mount makes fresh copies)
@@ -38,6 +40,49 @@
 export const MODES = Object.freeze(['two', 'circle', 'triangle']);
 
 // ---------------------------------------------------------------------------------------------------------------
+// the values preset (ARCHITECTURE 4.1): { mode, z1?, z2?, a?, R? }; R is the radius (a real number), the station keeps the dot z
+// ---------------------------------------------------------------------------------------------------------------
+
+const zShape = (v) => (v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im) && Math.abs(v.re) <= 50 && Math.abs(v.im) <= 50 ? { re: v.re + 0, im: v.im + 0 } : undefined);
+const radiusShape = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= MIN_RADIUS && v <= 20 ? v : undefined);
+export const VALUES_SHAPE = Object.freeze({ mode: MODES, z1: zShape, z2: zShape, a: zShape, R: radiusShape });
+const CIRCLE_DIRS = Object.freeze([Math.PI / 2, 0, -Math.PI / 2, Math.PI]);       // up first, as the handout's dot 1 + 5i is
+const tidy = (x) => Math.round(x * 1e12) / 1e12 + 0;
+
+/** The dot z on the circle about a of radius R: straight up if it sits inside VIEW with 0.6 to spare, else right, down, left, else up anyway. */
+export function circleDot(a, R) {
+  const [x0, x1] = VIEW.xRange, [y0, y1] = VIEW.yRange, m = 0.6;
+  for (const phi of CIRCLE_DIRS) {
+    const z = { re: tidy(a.re + R * Math.cos(phi)), im: tidy(a.im + R * Math.sin(phi)) };
+    if (z.re >= x0 + m && z.re <= x1 - m && z.im >= y0 + m && z.im <= y1 - m) return z;
+  }
+  return { re: a.re, im: tidy(a.im + R) };
+}
+
+/** { mode, two | circle | triangle, radius, line } from a values preset, or null (no values preset, or nothing usable for the mode). */
+export function valuesStart(preset) {
+  const v = valuesOf(preset, VALUES_SHAPE);
+  if (!v) return null;
+  const hasCircle = !!(v.a || v.R), hasTwo = !!(v.z1 || v.z2);
+  const asked = preset.problem === '1.2.1' ? 'circle' : preset.problem === '1.2.2' ? 'two' : null;
+  const mode = v.mode || (hasCircle && !hasTwo ? 'circle' : hasTwo && !hasCircle ? 'two' : asked || (hasTwo ? 'two' : null));
+  if (!mode || !(mode === 'circle' ? hasCircle : hasTwo)) return null;
+  const copy = (z) => ({ re: z.re, im: z.im });
+  if (mode === 'circle') {
+    const a = v.a || copy(DEFAULTS.circle.a), radius = v.R !== undefined ? v.R : 3;
+    return { mode, circle: { a, R: circleDot(a, radius) }, radius, line: `centre a = ${fmtCart(a)} and radius ${fmtNum(radius, 3)}` };
+  }
+  const z1 = v.z1 || copy(DEFAULTS[mode].z1), z2 = v.z2 || copy(DEFAULTS[mode].z2);
+  return { mode, [mode]: { z1, z2 }, line: `z₁ = ${fmtCart(z1)} and z₂ = ${fmtCart(z2)}` };
+}
+
+/** The note of a card opened with fresh numbers: the kit's sentence (its short form when the problem does not match), then what was opened. */
+export function freshText(problem, preset, opened) {
+  const base = freshNote(problem, preset) || 'Fresh numbers from the Rehearsal Room.';
+  return base.replace(/[.\s]*$/, '.') + ' Opened with ' + opened + '.';
+}
+
+// ---------------------------------------------------------------------------------------------------------------
 // 5.1 shared helpers
 // ---------------------------------------------------------------------------------------------------------------
 
@@ -331,6 +376,9 @@
 .dist-aligned{margin:var(--space-2) 0 0;font-size:.95rem}
 .dist-set{margin:0 0 var(--space-1);font-family:var(--font-mono);font-size:.92rem;overflow-wrap:anywhere}
 .dist-home{color:var(--polar);font-weight:700}
+.dist-note{margin:var(--space-2) 0 0;font-size:.92rem}
+.dist-note:empty{display:none}
+.dist-decisions{min-width:0;margin:var(--space-2) 0 0}
 `;
 
 function ensureStyle() {
@@ -425,14 +473,16 @@
   const listen = (target, type, fn) => { target.addEventListener(type, fn); cleanups.push(() => target.removeEventListener(type, fn)); };
 
   // ---- state (5.2 step 1)
+  const V = valuesStart(ctx.preset);                                          // fresh numbers from the Rehearsal Room, or null
   const st = {
-    mode: modeFromPreset(ctx.preset),
+    mode: V ? V.mode : modeFromPreset(ctx.preset),
     two: { z1: copyZ(DEFAULTS.two.z1), z2: copyZ(DEFAULTS.two.z2) },
     circle: { a: copyZ(DEFAULTS.circle.a), R: copyZ(DEFAULTS.circle.R) },
     triangle: { z1: copyZ(DEFAULTS.triangle.z1), z2: copyZ(DEFAULTS.triangle.z2) },
     snap: true,
     polar: { two: false, circle: true, triangle: true },
   };
+  if (V) for (const m of MODES) if (V[m]) st[m] = V[m].a ? { a: copyZ(V[m].a), R: copyZ(V[m].R) } : { z1: copyZ(V[m].z1), z2: copyZ(V[m].z2) };
 
   // ---- DOM (4.4 step 2)
   const header = buildHeader(ctx, LEDE);
@@ -491,6 +541,19 @@
   });
   const scaleNow = () => plane.getView().scale;
 
+  // Fresh numbers can lie outside the starting view. The view is fitted to what the mode shows, only when a point falls outside it, so a
+  // visit with the station's own numbers never moves it. (Reset then returns to the fitted view: fitTo marks it as home.)
+  const pointsShown = (m) => {
+    if (m === 'circle') { const { a, R } = st.circle, r = abs(sub(R, a)); return [add(a, C(r, 0)), add(a, C(-r, 0)), add(a, C(0, r)), add(a, C(0, -r))]; }
+    const { z1, z2 } = st[m];
+    return m === 'two' ? [C(0, 0), z1, z2, sub(z1, z2)] : [C(0, 0), z1, add(z1, z2), z2];
+  };
+  const inView = (z) => {
+    const v = plane.getView(), sz = plane.getSize(), hw = v.unitsAcross / 2, hh = hw * sz.h / sz.w;
+    return Math.abs(z.re - v.center.re) <= hw - 0.6 && Math.abs(z.im - v.center.im) <= hh - 0.6;
+  };
+  const ensureShown = (m) => { const pts = pointsShown(m); if (!pts.every(inView)) plane.fitTo(pts, 0.2); };
+
   function onZ(which) {
     return (z, info) => {
       const m = st.mode;
@@ -750,8 +813,10 @@
       }
       const eq = h('div', { class: 'tex-scroll dist-answer-tex' }); tex(eq, wrapAnswerTex(p.answer.tex));      // inline mode: KaTeX may break the line, display mode never does
       if (eq.classList.contains('tex-error')) eq.hidden = true;                // no KaTeX: the plain line below carries the answer
+      const note = h('p', { id: 'distance-problem-note', class: 'dist-note muted', text: V && V.mode === st.mode ? freshText(p, ctx.preset, V.line) : '' });
+      const decisions = h('div', { id: 'distance-problem-decisions', class: 'dist-decisions' }, [decisionChips(p, { idPrefix: 'distance-problem' })]);
       problemBox.append(
-        h('span', { class: 'badge', 'data-tone': p.address === 'C' ? 'cart' : 'polar', text: `Problem ${id}` }), ' ', stmt,
+        h('span', { class: 'badge', 'data-tone': p.address === 'C' ? 'cart' : 'polar', text: `Problem ${id}` }), ' ', stmt, note, decisions,
         h('details', { id: 'distance-answer' }, [h('summary', { id: 'distance-answer-toggle', text: 'Show the answer' }), eq, h('p', { class: 'muted mono', text: p.answer.text })]));
     } catch (e) { problemBox.replaceChildren(); }
   }
@@ -779,6 +844,7 @@
   // ---- 5.5 switching mode
   function setMode(m, { announce = true } = {}) {                           // announce: write the polite live region (never for the first, silent mount)
     st.mode = m;
+    if (V) ensureShown(m);
     for (const k of MODES) chipEls[k].setAttribute('aria-pressed', String(k === m));
     hz1.hidden = hz2.hidden = (m === 'circle');
     ha.hidden = hR.hidden = (m !== 'circle');
--- a/js/stations/powers.js
+++ b/js/stations/powers.js
@@ -17,8 +17,10 @@
 import { createStaircase, exactPi, fmtDec } from '../core/staircase.js';
 import { createExplainer } from '../core/explainer.js';
 import { prose, plainProse } from '../core/katex.js';
-import { problemsForStation } from '../data/problems.js';
+import { problemsForStation, problemById } from '../data/problems.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { moveGlyph, updateGlyph } from '../core/moveglyph.js';
+import { problemCard, valuesOf, freshNote } from '../core/station-kit.js';
 
 export const TAU = 2 * Math.PI;
 const PI = Math.PI;
@@ -644,13 +646,40 @@
 .cart-lines { margin: 0; padding-left: 1.6rem; display: grid; gap: var(--space-1); font-family: var(--font-mono); font-size: .9rem; overflow-wrap: anywhere; }
 .cart-line.is-last { font-weight: 700; }
 .pw-plane-caption { margin: var(--space-2) 0 0; font-size: 0.92rem; color: var(--text-muted); }
+.pw-readout-row { display: flex; align-items: center; gap: var(--space-2); }
+.pw-readout-row .readout { flex: 1 1 auto; min-width: 0; }
+.pw-readout-row .move-glyph { flex: none; box-sizing: content-box; padding: 4px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); }
 `;
 
+// ---------------------------------------------------------------------------------------------
+// The values preset (ARCHITECTURE 4.1): { z, n }. z must lie on the left plane (its parts within 4.2: that plane does not zoom), n is 1..12.
+// ---------------------------------------------------------------------------------------------
+
+export const VALUES_SHAPE = Object.freeze({
+  z: (v) => (v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im) && Math.abs(v.re) <= 4.2 && Math.abs(v.im) <= 4.2 ? { re: v.re + 0, im: v.im + 0 } : undefined),
+  n: (v) => (Number.isInteger(v) && v >= 1 && v <= 12 ? v : undefined),
+});
+
+/** { z, n } from a values preset (a missing or invalid key keeps the handout's), or null when nothing in it is usable. */
+export function valuesStart(preset) {
+  const v = valuesOf(preset, VALUES_SHAPE);
+  if (!v || (v.z === undefined && v.n === undefined)) return null;
+  return { z: v.z ? { re: v.z.re, im: v.z.im } : { re: Math.sqrt(3), im: 1 }, n: v.n !== undefined ? v.n : 10 };
+}
+
+/** The note of a card opened with fresh numbers: the kit's sentence (its short form when the problem does not match), then what was opened. */
+export function freshText(problem, preset, opened) {
+  const base = freshNote(problem, preset) || 'Fresh numbers from the Rehearsal Room.';
+  return base.replace(/[.\s]*$/, '.') + ' Opened with ' + opened + '.';
+}
+
 const LEDE = 'A power is one move repeated. z is a move: turn by its angle, stretch by its length. zⁿ is that move done n times, which is why polar is the native address for powers.';
 
 function initialState(preset) {
   const P = { z: { re: Math.sqrt(3), im: 1 }, n: 10, tag: '' };
   if (!preset) return P;
+  const fresh = valuesStart(preset);
+  if (fresh) { P.z = fresh.z; P.n = fresh.n; P.tag = 'values'; return P; }
   if (preset.kind === 'problem') P.tag = `problem-${preset.id}`;
   else if (preset.kind === 'topic') P.tag = `topic-${preset.id}`;
   else if (preset.kind === 'token') {
@@ -681,6 +710,15 @@
     ensureStyle('station-powers', STYLE);
     el.dataset.preset = S0.tag;
 
+    // ---- the problem card (new in iteration 2): the handout's 1.3.2 with its two decision chips; a note when the page opened with fresh numbers ----
+    const V = valuesStart(ctx.preset);
+    const problem = problemById('1.3.2');
+    const card = problem ? problemCard(ctx, problem, { id: 'powers-problem' }) : null;
+    if (card) {
+      disposers.push(() => card.destroy());
+      if (V) card.setNote(freshText(problem, ctx.preset, `z = ${fmtCart(V.z)} and n = ${V.n}`));
+    }
+
     // ---- DOM ----
     const nInput = h('input', { type: 'range', id: 'powers-n', min: 1, max: 12, step: 1, value: P.n });
     const nOutput = h('output', { id: 'powers-n-output', for: 'powers-n', text: `n = ${P.n}` });
@@ -700,6 +738,9 @@
     const spiralDesc = h('p', { cls: 'pw-plane-caption', id: 'powers-spiral-desc' });
     const flatNote = h('p', { cls: 'pw-plane-caption', id: 'powers-flat-note', hidden: true, text: '|z| = 1: every power is on the unit circle, so the ruler is flat. Only the angle changes.' });
     const readoutEl = h('div', { cls: 'readout', id: 'powers-readout' });
+    const glyph = moveGlyph(ZERO, { id: 'powers-glyph', size: '2em' });                  // beside zⁿ, never inside the readout
+    const readoutRow = h('div', { cls: 'pw-readout-row', id: 'powers-readout-row' }, glyph, readoutEl);
+    const glyphNote = h('p', { cls: 'pw-plane-caption', id: 'powers-glyph-note', text: 'The small picture is zⁿ as one move: its arc is the turn, Arg zⁿ, and its line is the stretch, |z|ⁿ. A dashed line means the stretch is more than 2, so the picture stops at its edge.' });
     const reportBtns = new Map();
     const reportRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Report the angle as', id: 'powers-report' });
     for (const [mode, label] of [['ntheta', 'n·θ'], ['home', 'home step'], ['cart', 'point (x, y)']]) {
@@ -722,6 +763,7 @@
     const stairsLink = h('a', { href: '#staircase', text: 'The Staircase' });
     el.append(
       stationHeader(ctx, LEDE),
+      ...(card ? [card.el] : []),
       h('section', { cls: 'panel pw-pick', 'data-tone': 'polar', 'aria-labelledby': 'powers-pick-title' },
         h('h2', { cls: 'panel-title', id: 'powers-pick-title', text: 'Pick z and n' }),
         h('div', { cls: 'row' }, h('span', { cls: 'pw-group-label', text: 'Try one' }), presetRow),
@@ -737,7 +779,8 @@
           h('p', { cls: 'pw-plane-caption', text: 'Dot k is zᵏ: dot k - 1 turned by Arg z and stretched by |z|. Distance from 0 is drawn on a log ruler: every ring is one more stretch by |z|, and the label on a ring is its true distance. Angles are true.' }),
           spiralDesc, flatNote)),
       h('section', { cls: 'panel pw-readout-block', 'data-tone': 'polar', 'aria-label': 'The answer' },
-        readoutEl,
+        readoutRow,
+        glyphNote,
         h('div', { cls: 'row' }, h('span', { cls: 'pw-group-label', text: 'Report the angle as:' }), reportRow),
         angleEl, wrapEl,
         h('div', { cls: 'callout', 'data-tone': 'polar' }, h('p', { text: 'Why polar here? Multiplying adds angles and multiplies lengths, so n copies of one move give nθ and rⁿ. In Cartesian you would multiply out n - 1 times.' }))),
@@ -959,6 +1002,7 @@
       const R = (P.ruler = logRuler(P.z, P.n));
       P.powers = m.defined ? Array.from({ length: m.n - 1 }, (_, i) => ({ k: i + 2, z: pow(P.z, i + 2) })) : [];
       readoutEl.textContent = powersReadout(m);
+      updateGlyph(glyph, m.defined ? m.zn : ZERO);
       readoutEl.dataset.n = String(m.n);
       readoutEl.dataset.turns = String(m.turns);
       nOutput.textContent = `n = ${m.n}`;
@@ -986,7 +1030,7 @@
     }
 
     // ---- listeners (last) ----
-    for (const pb of presetBtns) pb.b.addEventListener('click', () => setZN(pb.z, pb.n));
+    for (const pb of presetBtns) pb.b.addEventListener('click', () => { setZN(pb.z, pb.n); if (card) card.setNote(''); });     // a preset is not the Rehearsal Room's numbers
     const onN = () => { P.n = Number(nInput.value); render(); };
     nInput.addEventListener('input', onN);
     nInput.addEventListener('change', onN);
--- a/js/stations/roots.js
+++ b/js/stations/roots.js
@@ -19,6 +19,8 @@
 import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
 import { problemsForStation, problemById, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
 import { threadLabel, threadLinkPrefix } from '../registry.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
 
 // ---------------------------------------------------------------- constants
 
@@ -376,6 +378,47 @@
   return S;
 }
 
+// ---------------------------------------------------------------- the values preset (ARCHITECTURE 4.1): { c, n } or { quadratic: { a, b, c } }
+
+const isC = (v) => v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im);
+export const VALUES_SHAPE = Object.freeze({
+  c: (v) => (isC(v) && Math.hypot(v.re, v.im) <= C_MAX ? { re: v.re + 0, im: v.im + 0 } : undefined),
+  n: (v) => (Number.isInteger(v) && v >= N_MIN && v <= N_MAX ? v : undefined),
+  quadratic: (v) => (v && typeof v === 'object' && [v.a, v.b, v.c].every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1000) && v.a !== 0 ? { a: v.a + 0, b: v.b + 0, c: v.c + 0 } : undefined),
+});
+
+/**
+ * What a fresh mount is when the Rehearsal Room sent numbers, or null (no values preset, or nothing usable in it):
+ * { state, kind: 'cn' | 'quadratic', callout: '1.4.1' | '1.4.2' | null, line }. state has the shape initialState returns.
+ * { quadratic } needs a != 0 and |d| <= C_MAX (d = (b^2 - 4ac)/4a^2); it opens the quadratic panel first and puts c = d, n = 2 in the big picture.
+ */
+export function valuesStart(preset) {
+  const v = valuesOf(preset, VALUES_SHAPE);
+  if (!v) return null;
+  const S = initialState(null);
+  if (v.quadratic) {
+    const Q = quadraticModel(v.quadratic.a, v.quadratic.b, v.quadratic.c);
+    if (Q.ok && Math.abs(Q.d) <= C_MAX) {
+      S.quad = { a: Q.a, b: Q.b, c: Q.c };
+      S.quadFirst = true;
+      S.c = { re: Q.d, im: 0 };
+      S.n = 2;
+      return { state: S, kind: 'quadratic', callout: null, line: `a = ${fmtNum(Q.a)}, b = ${fmtNum(Q.b)} and c = ${fmtNum(Q.c)}` };
+    }
+  }
+  if (v.c === undefined && v.n === undefined) return null;
+  if (v.c) S.c = v.c;
+  if (v.n !== undefined) S.n = v.n;
+  const callout = preset.problem === '1.4.1' || preset.problem === '1.4.2' ? preset.problem : null;
+  return { state: S, kind: 'cn', callout, line: `c = ${fmtCart(S.c, 3, TINY)} and n = ${S.n}` };
+}
+
+/** The note of a card opened with fresh numbers: the kit's sentence (its short form when the problem does not match), then what was opened. */
+export function freshText(problem, preset, opened) {
+  const base = freshNote(problem, preset) || 'Fresh numbers from the Rehearsal Room.';
+  return base.replace(/[.\s]*$/, '.') + ' Opened with ' + opened + '.';
+}
+
 // ---------------------------------------------------------------- DOM helpers (only called from mount)
 
 function mk(tag, cls, attrs, text) {
@@ -426,6 +469,9 @@
 .rt-actions { margin-top: var(--space-1); }
 .rt-links { margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); }
 .rt-controls .slider-row { margin-top: var(--space-2); }
+.rt-decisions { min-width: 0; margin: var(--space-1) 0 0; }
+.rt-fresh { margin: var(--space-2) 0 0; font-size: .92rem; color: var(--text-muted); overflow-wrap: anywhere; }
+.rt-fresh:empty { display: none; }
 .rt-slot { display: grid; }
 .rt-slot > * { grid-area: 1 / 1; min-width: 0; align-self: start; }
 .rt-slot > .rt-slot-ghost { visibility: hidden; pointer-events: none; }
@@ -478,7 +524,7 @@
   return `c = ${fmtNum(d)} is d, the number from the quadratic panel whose square roots the formula takes, and n = 2. This picture shows those two square roots. Problem 1.4.3 itself is solved in that panel.`;
 }
 
-function renderProblem(host, p, neutral, lead = NEUTRAL_LEAD) {
+function renderProblem(host, p, neutral, lead = NEUTRAL_LEAD, idPrefix = null) {
   host.textContent = '';
   if (!p) {
     delete host.dataset.tone;
@@ -510,17 +556,19 @@
   const reason = mk('span');
   prose(reason, p.addressWhy);
   why.append(group, reason);
-  host.append(head, why);
+  const decisions = mk('div', 'rt-decisions', { id: idPrefix + '-decisions' });                           // the two decisions of this problem
+  decisions.appendChild(decisionChips(p, { idPrefix }));
+  host.append(head, decisions, why);
 }
 
 // A grid cell that holds the live callout on top of an invisible copy of every callout it can show: the cell is as tall as the tallest,
 // at any width, so the planes below keep their place when the numbers change (a drag away from a preset used to move them 167 px).
 function mountSlot(slot, live, variants) {
-  for (const v of variants) {
+  variants.forEach((v, i) => {
     const ghost = mk('div', 'callout rt-slot-ghost', { 'aria-hidden': 'true', inert: '' });
-    renderProblem(ghost, v.p, v.neutral, v.lead);
+    renderProblem(ghost, v.p, v.neutral, v.lead, `roots-ghost-${i}`);      // the ghost's chips are buttons like the live ones (the same height), so they get ids of their own, one set per ghost
     slot.appendChild(ghost);
-  }
+  });
   slot.appendChild(live);
 }
 
@@ -602,7 +650,9 @@
 export function mount(el, ctx) {
   const mv = (window.__mv = window.__mv || {});
   const preset = ctx && ctx.preset ? ctx.preset : null;
-  const S = initialState(preset);
+  const V = valuesStart(preset);                                    // fresh numbers from the Rehearsal Room, or null
+  const S = V ? V.state : initialState(preset);
+  let fresh = V ? { c: { re: S.c.re, im: S.c.im }, n: S.n, callout: V.callout } : null;     // until a preset puts the handout's numbers back
   S.userView = { c: false, z: false };
   S.fitted = { c: NaN, z: NaN };
   S.raise = { mode: 'idle', t: 1, m: 1, k: 0, startedAt: 0 };
@@ -624,6 +674,10 @@
   const { header, chipById } = buildHeader(ctx, 'A number c has a whole staircase of angles: Arg c, Arg c + 2π, Arg c + 4π, and so on. To find its n-th roots, divide every step by n. The first n steps land on n different points. Step n lands on step 0 again, so the roots stop there.');
   const problemBox = mk('div', 'callout', { id: 'roots-problem' });
   const problemSlot = mk('div', 'rt-slot', { id: 'roots-problem-slot' });
+  // The fresh-numbers note is OUTSIDE the slot: the slot is as tall as the tallest callout and the callout follows the numbers, so a note inside it
+  // would let the planes jump when the first drag swaps the callout. It sits under the callout it is about (the quadratic's when c, n came from it).
+  const problemNote = mk('p', 'rt-fresh', { id: 'roots-problem-note' },
+    V ? freshText(problemById(V.kind === 'quadratic' ? '1.4.3' : V.callout), preset, V.line) : '');
   mountSlot(problemSlot, problemBox, [{ p: problemById('1.4.1') }, { p: problemById('1.4.2') }, { p: null, neutral: NEUTRAL_TEXT },
     { p: null, neutral: quadNeutralText(-1234.567), lead: QUAD_LEAD }]);
 
@@ -718,7 +772,7 @@
   const quadPanel = mk('section', 'panel', { id: 'roots-quadratic', 'data-tone': 'cart' });
   quadPanel.appendChild(mk('h2', 'panel-title', null, '1.4.3 The quadratic formula hides a square root'));
   const quadProblem = mk('div', 'callout', { id: 'roots-quadratic-problem' });
-  renderProblem(quadProblem, problemById('1.4.3'));
+  renderProblem(quadProblem, problemById('1.4.3'), undefined, undefined, 'roots-quadratic-problem');
   const quadLede = mk('p', '', null, 'Complete the square and the quadratic turns into a square root. That is the same staircase machine with n = 2, then a slide.');
   const qFields = mk('div', 'rt-fields');
   const qInputs = {};
@@ -747,14 +801,15 @@
   quadGrid.append(quadLeft, quadRight);
   quadError.style.minHeight = '0';
   const quadStack = mk('div', 'rt-stack');
-  quadStack.append(quadProblem, quadLede, qFields, quadHint, quadError, quadReadout, quadGrid);
+  quadStack.append(quadProblem, ...(V && V.kind === 'quadratic' ? [problemNote] : []), quadLede, qFields, quadHint, quadError, quadReadout, quadGrid);
   quadPanel.appendChild(quadStack);
 
   const nav = buildNav(ctx);
 
   // quadratic first for problem 1.4.3, otherwise last (decided by the order of appending, no CSS order)
-  if (S.quadFirst) el.append(header, tryBox, quadPanel, problemSlot, controls, twoPlanes, divide, explain, nav);
-  else el.append(header, problemSlot, tryBox, controls, twoPlanes, divide, explain, quadPanel, nav);
+  const noteInSlot = !(V && V.kind === 'quadratic');                // the note of a quadratic request sits in the quadratic panel instead
+  if (S.quadFirst) el.append(header, tryBox, quadPanel, problemSlot, ...(noteInSlot ? [problemNote] : []), controls, twoPlanes, divide, explain, nav);
+  else el.append(header, problemSlot, ...(noteInSlot ? [problemNote] : []), tryBox, controls, twoPlanes, divide, explain, quadPanel, nav);
 
   // ---- planes, handles, widgets
   const cPlane = createPlane(cHost, { id: 'roots-plane', xRange: [-2, 2], yRange: [-2, 2], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true,
@@ -961,6 +1016,9 @@
 
   // What the callout shows: a review problem, "c is d from the quadratic above", or the neutral line.
   function calloutNow() {
+    if (fresh && fresh.callout && eq(S.c, fresh.c, 1e-12) && S.n === fresh.n) {      // fresh numbers on a handout problem: its card, until the numbers move
+      return { key: 'fresh ' + fresh.callout, prob: problemById(fresh.callout), neutral: NEUTRAL_TEXT, lead: NEUTRAL_LEAD };
+    }
     const prob = activeProblem();
     if (prob) return { key: prob.id, prob, neutral: NEUTRAL_TEXT, lead: NEUTRAL_LEAD };
     if (Q && Q.ok && S.n === 2 && !M.zero && eq(S.c, { re: Q.d, im: 0 }, 1e-9)) return { key: 'quad ' + fmtNum(Q.d), prob: null, neutral: quadNeutralText(Q.d), lead: QUAD_LEAD };
@@ -970,7 +1028,7 @@
     const now = calloutNow();
     if (now.key === lastCallout) return;
     lastCallout = now.key;
-    renderProblem(problemBox, now.prob, now.neutral, now.lead);
+    renderProblem(problemBox, now.prob, now.neutral, now.lead, 'roots-problem');
     const cur = now.prob ? now.prob.id : (S.quadFirst ? '1.4.3' : null);      // on the 1.4.3 deep link the 1.4.3 chip stays current while c and n match no review problem
     for (const [id, chip] of chipById) { if (id === cur) chip.setAttribute('aria-current', 'true'); else chip.removeAttribute('aria-current'); }
   }
@@ -1079,6 +1137,8 @@
   }
   function applyPreset(key) {
     const p = PRESETS[key];
+    fresh = null;                                                    // the handout's numbers (or the station's own) are back: no fresh-numbers note
+    problemNote.textContent = '';
     S.c = { re: p.c.re, im: p.c.im };
     S.n = p.n;
     S.sel = 0;
--- a/js/stations/curves.js
+++ b/js/stations/curves.js
@@ -14,6 +14,8 @@
 import { add, sub, mul, conj, scale, abs, Arg, fromPolar, eq, fmtNum, fmtCart, exactAngle, texAngle } from '../core/complex.js';
 import { THREADS, threadLabel, threadLinkPrefix } from '../registry.js';
 import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { valuesOf, freshNote } from '../core/station-kit.js';
 
 // ---------------------------------------------------------------- constants
 
@@ -326,6 +328,26 @@
 
 const dec = (x) => fmtNum(x, 3);
 
+// ---------------------------------------------------------------- the values preset (ARCHITECTURE 4.1): { a, b }, the ends of the segment
+
+const zShape = (v) => (v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im) && Math.abs(v.re) <= 50 && Math.abs(v.im) <= 50 ? { re: v.re + 0, im: v.im + 0 } : undefined);
+export const VALUES_SHAPE = Object.freeze({ a: zShape, b: zShape });
+
+/** { a, b, line } from a values preset (b is pushed out to MIN_SIZE from a when closer), or null when nothing in it is usable. */
+export function valuesStart(preset) {
+  const v = valuesOf(preset, VALUES_SHAPE);
+  if (!v || (!v.a && !v.b)) return null;
+  const a = v.a || copyZ(PRESET_DEFAULTS.segment.a);
+  const b = add(a, clampSize(sub(v.b || PRESET_DEFAULTS.segment.b, a)));
+  return { a, b, line: `a segment from ${fmtCart(a)} to ${fmtCart(b)}` };
+}
+
+/** The note of a card opened with fresh numbers: the kit's sentence (its short form when the problem does not match), then what was opened. */
+export function freshText(problem, preset, opened) {
+  const base = freshNote(problem, preset) || 'Fresh numbers from the Rehearsal Room.';
+  return base.replace(/[.\s]*$/, '.') + ' Opened with ' + opened + '.';
+}
+
 // 'p + q t' as TeX text
 export function texLinearT(p, q) {
   const pz = Math.abs(p) < 1e-9, qz = Math.abs(q) < 1e-9;
@@ -466,6 +488,9 @@
 }
 
 const STYLE = `
+.cv-fresh { margin: var(--space-2) 0 0; font-size: 0.92rem; overflow-wrap: anywhere; }
+.cv-fresh:empty { display: none; }
+.cv-decisions { min-width: 0; margin: var(--space-2) 0 0; }
 .cv-work{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:start}
 .cv-work>*{min-width:0}
 .cv-stack{display:flex;flex-direction:column;gap:var(--space-3)}
@@ -636,6 +661,17 @@
   const problemCard = mk('section', 'panel', { id: 'curves-problem', 'aria-labelledby': 'curves-problem-title' });
   problemCard.dataset.tone = 'accent';
   const disposeCard = renderProblemCard(problemCard, '1.5.1');
+  // iteration 2: the two decisions of 1.5.1 and, when the page opened with the Rehearsal Room's numbers, a note; both go in after the statement
+  // (renderProblemCard itself is the shared copy of linear.js, held equal by C26, so it is not touched)
+  const V = valuesStart(ctx.preset);
+  const p151 = problemById('1.5.1');
+  const cardNote = mk('p', 'cv-fresh muted', { id: 'curves-problem-note' }, V ? freshText(p151, ctx.preset, V.line) : '');
+  const cardDecisions = mk('div', 'cv-decisions', { id: 'curves-problem-decisions' });
+  const cardStatement = problemCard.querySelector('.cv-statement');
+  if (p151 && cardStatement) {
+    cardDecisions.appendChild(decisionChips(p151, { idPrefix: 'curves-problem' }));
+    cardStatement.after(cardNote, cardDecisions);
+  }
 
   const presetPanel = mk('section', 'panel', { 'aria-labelledby': 'curves-presets-title' });
   presetPanel.appendChild(mk('h2', 'panel-subtitle', { id: 'curves-presets-title' }, 'Choose a curve'));
@@ -732,6 +768,7 @@
     curve: null, cls: null, z: C(0, 0), dz: C(0, 0),
   };
   for (const id of PRESET_IDS) S.memory[id] = { a: copyZ(PRESET_DEFAULTS[id].a), b: copyZ(PRESET_DEFAULTS[id].b) };
+  if (V) S.memory.segment = { a: copyZ(V.a), b: copyZ(V.b) };       // the fresh ends replace the handout's on the segment (the other curves keep their own)
   S.a = copyZ(S.memory[S.preset].a);
   S.b = copyZ(S.memory[S.preset].b);
   S.curve = buildCurve(S.preset, S.a, S.b, S.reversed);
@@ -747,6 +784,17 @@
     interactive: true, maxWidth: 520, legend: true, ariaLabel: 'Complex plane with the curve z(t)',
   });
 
+  // Fresh numbers can lie outside the starting view: fit it to the ends (and the far side of a round curve) when one falls outside, never otherwise.
+  const inView = (z) => {
+    const v = plane.getView(), sz = plane.getSize(), hw = v.unitsAcross / 2, hh = hw * sz.h / sz.w;
+    return Math.abs(z.re - v.center.re) <= hw - 0.3 && Math.abs(z.im - v.center.im) <= hh - 0.3;
+  };
+  const showEnds = () => {
+    const pts = S.preset === 'segment' ? [S.a, S.b] : [S.a, S.b, sub(scale(S.a, 2), S.b)];
+    if (!pts.every(inView)) plane.fitTo([C(0, 0), ...pts], 0.2);
+  };
+  if (V) showEnds();
+
   // overlay (order 60): both addresses of the cursor, under the curve
   plane.addLayer((c, p) => {
     if (!S.addr || !(abs(S.z) > 1e-9)) return;
@@ -930,6 +978,8 @@
     S.reversed = false;                                             // a preset starts un-reversed
     S.a = copyZ(S.memory[id].a);
     S.b = copyZ(S.memory[id].b);
+    if (V) showEnds();
+    cardNote.textContent = '';                                      // a preset is not the Rehearsal Room's numbers
     rebuildHandles();
     setChipsPressed(id);
     setTakeaway(id);
```

## Appendix B. `tests/interact/i2-decisions-everywhere-a.mjs` (run against the diff above: 3/3 at desktop, phone and dark desktop)

```js
// tests/interact/i2-decisions-everywhere-a.mjs: the two decisions, the move glyph and fresh numbers on addresses, distance, powers, roots, curves.
//   node tools/smoke.mjs --route addresses --script tests/interact/i2-decisions-everywhere-a.mjs --dark
// Steps: A1 the chips on every problem card, A2 the move glyph, A3 fresh numbers from a StationRequest, then the extras the design pins
// (ids unique, the video host, the roots slot does not move, a preset takes the note away, the phone fits, the glyph wears --polar).
// The whole run starts on #addresses and visits the other routes by navigation; it runs at desktop, phone and dark desktop.

import { settle, dragHandle, setSlider, clickChip } from './_helpers.mjs';
import { problemById } from '../../js/data/problems.js';
import { namesMeaning, addressMeaning } from '../../js/core/decisions.js';

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
  const attr = (sel, a) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const exists = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);

  // navigate() sets the hash, or re-mounts when it already is the hash; the route and the state tell when the new page is up
  const go = async (route, state = 'ready') => {
    await page.evaluate((r) => window.__mv.app.navigate(r), route);
    await page.waitForFunction(([r, s]) => { const v = document.getElementById('view'); return !!v && v.dataset.route === r && v.dataset.state === s; }, [route, state], { timeout: 15000 });
    await settle(page, 3);
  };
  // what the Rehearsal Room does: write the request, then open the station from a different page so the router really mounts it
  const fresh = async (station, problem, values) => {
    await go('nosuchplace', 'nosuchplace');
    await page.evaluate((req) => window.__mv.app.request(req), { station, problem, family: problem, values });
    await go(station);
  };
  const fits = async (what) => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `${what}: the page scrolls sideways by ${over}px`);
  };
  const noDuplicateIds = async (what) => {
    const dup = await page.evaluate(() => { const seen = new Map(); for (const e of document.querySelectorAll('#view [id]')) seen.set(e.id, (seen.get(e.id) || 0) + 1); return [...seen].filter(([, n]) => n > 1).map(([k]) => k); });
    assert(dup.length === 0, `${what}: duplicate ids ${dup.join(', ')}`);
  };

  // ---------------------------------------------------------------- A1 both chips on every problem card, from the data
  const A1 = [['problem-1-3-1', 'addresses', '1.3.1'], ['problem-1-2-1', 'distance', '1.2.1'], ['problem-1-3-2', 'powers', '1.3.2'],
    ['problem-1-4-2', 'roots', '1.4.2'], ['problem-1-5-1', 'curves', '1.5.1']];
  for (const [route, st, pid] of A1) {
    await go(route);
    const p = problemById(pid);
    const pre = `#${st}-problem`;
    assert((await attr(`${pre}-address`, 'data-value')) === p.address, `A1 ${route}: address chip ${await attr(`${pre}-address`, 'data-value')}, data says ${p.address}`);
    assert((await attr(`${pre}-names`, 'data-value')) === p.names, `A1 ${route}: names chip ${await attr(`${pre}-names`, 'data-value')}, data says ${p.names}`);
    assert(await page.evaluate((s) => { const h = document.getElementById(s); return !!h && h.querySelectorAll('.decision-chip').length === 2; }, `${st}-problem-decisions`), `A1 ${route}: #${st}-problem-decisions holds the two chips`);
    assert((await text(`${pre}-names`)) === `names: ${p.names}`, `A1 ${route}: names chip text`);
    assert((await attr(`${pre}-meaning`, 'hidden')) !== null, `A1 ${route}: the meaning starts hidden`);
    await page.click(`${pre}-names`);
    assert((await text(`${pre}-meaning`)) === namesMeaning(p.names) && (await attr(`${pre}-names`, 'aria-expanded')) === 'true', `A1 ${route}: tap shows "${namesMeaning(p.names)}"`);
    await page.click(`${pre}-address`);
    assert((await text(`${pre}-meaning`)) === addressMeaning(p.address), `A1 ${route}: the address chip switches the meaning`);
    await page.click(`${pre}-address`);
    assert((await attr(`${pre}-meaning`, 'hidden')) !== null, `A1 ${route}: a second tap hides it`);
    await noDuplicateIds(`A1 ${route}`);
    await fits(`A1 ${route}`);
  }
  // the chips follow the active problem
  await go('problem-1-2-1');
  await clickChip(page, 'distance-mode-two');
  assert((await attr('#distance-problem-address', 'data-value')) === 'C' && (await attr('#distance-problem-names', 'data-value')) === 'none', 'A1 distance: the two-point mode shows 1.2.2 (C, none)');
  assert((await page.evaluate(() => document.querySelector('#distance-problem-decisions .decisions').dataset.problem)) === '1.2.2', 'A1 distance: the chips say which problem they belong to');
  await clickChip(page, 'distance-mode-triangle');
  assert(!(await exists('#distance-problem-address')) && !(await exists('#distance-problem-names')), 'A1 distance: the triangle is a topic, so there are no chips');
  await go('problem-1-4-2');
  await clickChip(page, 'roots-preset-1');
  assert((await attr('#roots-problem-address', 'data-value')) === 'P' && (await attr('#roots-problem-names', 'data-value')) === 'all', 'A1 roots: the preset c = 1, n = 5 shows 1.4.1 (P, all)');
  await clickChip(page, 'roots-preset-i');
  assert(!(await exists('#roots-problem-address')), 'A1 roots: c = i, n = 3 matches no problem, so there are no chips');
  assert((await attr('#roots-quadratic-problem-address', 'data-value')) === 'C' && (await attr('#roots-quadratic-problem-names', 'data-value')) === 'all', 'A1 roots: the quadratic panel carries 1.4.3 (C, all)');
  await noDuplicateIds('A1 roots after the callout changed');
  log('A1 chips on the five problem cards, from the data; meaning on tap; they follow distance mode and roots numbers');

  // ---------------------------------------------------------------- A2 the move glyph beside z and zⁿ
  await go('problem-1-3-1');
  assert((await attr('#addresses-glyph', 'aria-label')) === 'move: turn 120°, stretch 2', `A2 addresses glyph: ${await attr('#addresses-glyph', 'aria-label')}`);
  assert((await text('#addresses-readout')) === 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)', `A2 the readout is unchanged: ${await text('#addresses-readout')}`);
  assert(await page.evaluate(() => { const g = document.getElementById('addresses-glyph'), r = document.getElementById('addresses-readout'); return !r.contains(g) && !g.contains(r) && g.parentElement === r.parentElement; }), 'A2 the glyph is a sibling of the readout, not inside it');
  await dragHandle(page, 'addresses-plane-z', { re: 2, im: 0 });
  assert((await attr('#addresses-glyph', 'aria-label')) === 'move: turn 0°, stretch 2', `A2 after the drag to 2: ${await attr('#addresses-glyph', 'aria-label')}`);
  await page.evaluate(() => window.__mv.planes.get('addresses-plane').getHandle('z').set({ re: 0, im: 0 }));
  await settle(page, 3);
  assert((await attr('#addresses-glyph', 'aria-label')) === 'no move: 0' && (await text('#addresses-readout')) === 'z = 0; |z| = 0; Arg z: no angle at 0', 'A2 at 0 the glyph says there is no move');
  const polarColour = await page.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--polar)'; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c; });
  assert((await page.evaluate(() => getComputedStyle(document.getElementById('addresses-glyph')).color)) === polarColour, `A2 the glyph is drawn in --polar (${polarColour}) in ${ctx.label}`);
  await go('problem-1-3-2');
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn -60°, stretch 1024', `A2 powers glyph: ${await attr('#powers-glyph', 'aria-label')}`);
  assert((await text('#powers-readout')) === 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)', `A2 the powers readout is unchanged: ${await text('#powers-readout')}`);
  assert(await page.evaluate(() => { const g = document.getElementById('powers-glyph'), r = document.getElementById('powers-readout'); return !r.contains(g) && g.parentElement === r.parentElement; }), 'A2 the powers glyph is a sibling of the readout');
  await setSlider(page, 'powers-n', 2);
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn 60°, stretch 4', `A2 z² = 2 + 3.464i: ${await attr('#powers-glyph', 'aria-label')}`);
  await setSlider(page, 'powers-n', 12);
  assert((await attr('#powers-glyph', 'aria-label')) === 'move: turn 0°, stretch 4096', `A2 z^12 = 4096: ${await attr('#powers-glyph', 'aria-label')}`);
  await page.evaluate(() => window.__mv.planes.get('powers-plane').getHandle('z').set({ re: 0, im: 0 }));
  await settle(page, 3);
  assert((await attr('#powers-glyph', 'aria-label')) === 'no move: 0', 'A2 powers at z = 0');
  log('A2 glyphs: addresses 120 degrees and stretch 2, then 0 degrees, then none at 0; powers -60 degrees and 1024');

  // ---------------------------------------------------------------- A3 fresh numbers
  const A3 = [
    { st: 'addresses', pid: '1.3.1', values: { z: { re: 0, im: 2 } }, check: async () => {
      const z = await page.evaluate(() => window.__mv.addresses.state().z);
      assert(z.re === 0 && z.im === 2, `A3 addresses z = ${JSON.stringify(z)}`);
      assert((await text('#addresses-readout')).includes('Arg z = 1.571 (π/2)'), `A3 addresses readout: ${await text('#addresses-readout')}`);
    } },
    { st: 'distance', pid: '1.2.2', values: { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } }, check: async () => {
      assert((await text('#distance-readout')).includes('d = 5'), `A3 distance readout: ${await text('#distance-readout')}`);
    } },
    { st: 'powers', pid: '1.3.2', values: { z: { re: Math.SQRT2, im: Math.SQRT2 }, n: 4 }, check: async () => {
      assert(/zⁿ = -16\b/.test(await text('#powers-readout')), `A3 powers readout: ${await text('#powers-readout')}`);
    } },
    { st: 'roots', pid: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 }, check: async () => {
      assert((await text('#roots-readout')).includes('c = -81; n = 4; |c|^(1/n) = 3'), `A3 roots readout: ${await text('#roots-readout')}`);
    } },
    { st: 'curves', pid: '1.5.1', values: { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } }, check: async () => {
      await setSlider(page, 'curves-t', 0.5);
      assert((await text('#curves-readout')).includes('z(t) = 0'), `A3 curves readout: ${await text('#curves-readout')}`);
    } },
  ];
  for (const c of A3) {
    await fresh(c.st, c.pid, c.values);
    await c.check();
    const note = await text(`#${c.st}-problem-note`);
    assert(note && note.includes('Fresh numbers'), `A3 ${c.st}: the card says so: "${note}"`);
    assert(note.includes('Opened with'), `A3 ${c.st}: and says what it opened with: "${note}"`);
    await noDuplicateIds(`A3 ${c.st}`);
    await fits(`A3 ${c.st}`);
  }
  // the request is used once: a plain visit afterwards has the station's own numbers and no note
  await go('nosuchplace', 'nosuchplace');
  await go('addresses');
  assert((await text('#addresses-problem-note')) === '', 'A3 the note is gone on the next plain visit');
  assert((await text('#addresses-readout')).startsWith('z = -1 + 1.732i'), 'A3 and so are the numbers');
  // a malformed request leaves the station on its default, with no note
  await fresh('roots', null, { c: 'x', n: 99 });
  const st = await page.evaluate(() => window.__mv.roots.state());
  assert(st.c.re === 1 && st.c.im === 0 && st.n === 5, `A3 malformed roots request: c = ${JSON.stringify(st.c)}, n = ${st.n}`);
  assert((await text('#roots-readout')).startsWith('c = 1; n = 5;'), 'A3 and the readout says so');
  assert((await text('#roots-problem-note')) === '', 'A3 nothing was applied, so nothing is claimed');
  // the other stations survive the same
  for (const s of ['addresses', 'distance', 'powers', 'curves']) {
    await fresh(s, null, { z: 'x', n: 'y', z1: 3, mode: 'nope', a: null, b: [], R: -1 });
    assert((await text(`#${s}-problem-note`) || '') === '', `A3 ${s}: a malformed request claims no fresh numbers`);
  }
  // the quadratic and the partly good request
  await fresh('roots', '1.4.3', { quadratic: { a: 1, b: -6, c: 25 } });
  assert((await text('#roots-quadratic-readout')).startsWith('(z - 3)² = -16; square roots: ±4i; roots: 3 + 4i, 3 - 4i'), `A3 roots quadratic: ${await text('#roots-quadratic-readout')}`);
  assert((await text('#roots-readout')).startsWith('c = -16; n = 2;') && (await text('#roots-problem-note')).includes('Fresh numbers'), 'A3 roots quadratic: the big picture shows the square roots of d, with the note');
  await fresh('powers', '1.3.2', { z: { re: 1, im: 1 }, n: 99 });
  assert((await text('#powers-readout')).startsWith('zⁿ = ') && (await page.evaluate(() => window.__mv.powers.state().n)) === 10 && (await page.evaluate(() => window.__mv.powers.state().z.re)) === 1, 'A3 powers: a good z with a bad n keeps n = 10');
  await fresh('distance', '1.2.1', { mode: 'circle', a: { re: -4, im: 3 }, R: 4 });
  assert((await text('#distance-readout')) === 'circle: center -4 + 3i, radius 4' && (await text('#distance-problem-note')).includes('Fresh numbers'), `A3 distance circle: ${await text('#distance-readout')}`);
  assert(await page.evaluate(() => { const p = window.__mv.planes.get('distance-plane'), v = p.getView(), s = p.getSize(), a = p.toPixel({ re: -4, im: 3 }); return a.x > 0 && a.x < s.w && a.y > 0 && a.y < s.h && v.center.re < 1.5; }), 'A3 distance: the view was fitted (it moved left of the default centre 2) so the centre -4 + 3i is on the plane');
  await fresh('curves', '1.5.1', { a: { re: -5, im: 4 }, b: { re: 5, im: -4 } });
  assert(await page.evaluate(() => { const p = window.__mv.planes.get('curves-plane'), s = p.getSize(); return [{ re: -5, im: 4 }, { re: 5, im: -4 }].every((z) => { const q = p.toPixel(z); return q.x > 0 && q.x < s.w && q.y > 0 && q.y < s.h; }); }), 'A3 curves: the ends -5 + 4i and 5 - 4i are both on the plane');
  log('A3 fresh numbers on the five stations, the note, one use only, malformed requests, quadratic, fitted views');

  // ---------------------------------------------------------------- extras
  // a preset or a mode puts the handout's numbers back and takes the note away
  await fresh('addresses', '1.3.1', { z: { re: 0, im: 2 } });
  await clickChip(page, 'addresses-preset-sqrt3-i');
  assert((await text('#addresses-problem-note')) === '', 'a preset clears the addresses note');
  await fresh('powers', '1.3.2', { z: { re: 1, im: 1 }, n: 8 });
  await clickChip(page, 'powers-preset-i');
  assert((await text('#powers-problem-note')) === '', 'a preset clears the powers note');
  await fresh('curves', '1.5.1', { a: { re: 1, im: 2 }, b: { re: -1, im: -2 } });
  await clickChip(page, 'curves-preset-circle');
  assert((await text('#curves-problem-note')) === '', 'a preset clears the curves note');
  await fresh('roots', '1.4.2', { c: { re: -81, im: 0 }, n: 4 });
  assert((await text('#roots-problem')).includes('4th roots of') && (await attr('#roots-problem-address', 'data-value')) === 'P->C', 'roots: fresh numbers on 1.4.2 show its card and chips');
  assert(await page.evaluate(() => { const n = document.getElementById('roots-problem-note'); return !document.getElementById('roots-problem').contains(n); }), 'roots: the note is outside the slot, so a swap of the callout cannot move the planes');
  const top0 = await page.evaluate(() => document.querySelector('.plane[data-plane-id="roots-plane"]').getBoundingClientRect().top + window.scrollY);
  await dragHandle(page, 'roots-plane-c', { re: -1, im: 1 });
  assert((await text('#roots-problem')).startsWith('Your own numbers.'), `roots: after the drag the callout is neutral: ${await text('#roots-problem')}`);
  const top1 = await page.evaluate(() => document.querySelector('.plane[data-plane-id="roots-plane"]').getBoundingClientRect().top + window.scrollY);
  assert(Math.abs(top1 - top0) < 1, `roots: the c plane did not move when the callout changed: ${top0} -> ${top1}`);
  assert((await text('#roots-problem-note')).includes('Fresh numbers'), 'roots: a drag keeps the note (only a preset takes it away)');
  await clickChip(page, 'roots-preset-m16');
  assert((await text('#roots-problem-note')) === '', 'roots: a preset clears the note');
  // distance: the note belongs to the mode that was opened
  await fresh('distance', '1.2.2', { mode: 'two', z1: { re: 1, im: 5 }, z2: { re: -2, im: 1 } });
  await clickChip(page, 'distance-mode-circle');
  assert((await text('#distance-problem-note')) === '', 'distance: the circle mode has no fresh numbers, so no note');
  await clickChip(page, 'distance-mode-two');
  assert((await text('#distance-problem-note')).includes('Fresh numbers'), 'distance: and the two-point mode still does');
  // the video host sits after the plane; a panel appears in it only when the manifest lists the video
  await go('addresses');
  const vid = await page.evaluate(async () => {
    const host = document.getElementById('addresses-video-host'), plane = document.getElementById('addresses-plane-host');
    const after = !!host && !!(plane.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING);
    const { loadManifest, videoFor } = await import('./js/core/listen.js');
    const listed = !!videoFor(await loadManifest(), 'two-addresses');
    const panel = document.getElementById('video-two-addresses');
    return { after, listed, panel: !!panel, inside: !!panel && host.contains(panel), empty: !!host && host.children.length === 0 };
  });
  assert(vid.after, 'the video host is after the plane');
  assert(vid.listed ? (vid.panel && vid.inside) : vid.empty, `the video panel is there exactly when the manifest lists it: ${JSON.stringify(vid)}`);
  // the I6, I7 and I8 scans of tests/interact/i1-integration.mjs on these five pages (that script stops earlier today, at the stations of other goals):
  // one style of readout, an id on every control (the ghosts of the roots slot and the new chips included), an id on every link and tab stop after
  // the answers are opened, no duplicate id, no z1 / z2 / z0 in a label or tooltip
  const bad = [
    [/(?<![A-Za-z\\])\d*\.?\d*\s?pi(?![A-Za-z(])/, 'ASCII pi'], [/(?<![A-Za-z0-9_])[zwf]0(?![A-Za-z0-9_])/, 'z0 / w0'], [/\d deg\b/, '"deg"'], [/\d\s?degrees?\b/, '"degrees" (write 90°)'], [/\bsqrt\(/, 'sqrt('],
    [/\b(eps|delta|rho) =/, 'eps / delta / rho'], [/\d[eE]\+\d/, '1.5e+25'], [/NaN|Infinity/, 'NaN / Infinity'], [/ <= | >= /, '<= or >='],
  ];
  for (const route of ['addresses', 'distance', 'powers', 'roots', 'curves', 'problem-1-3-1', 'problem-1-4-3']) {
    await go(route);
    const lines = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('#view .readout, #view .callout, #view p, #view li, #view h2, #view h3, #view label, #view button, #view output, #view figcaption')) {
        if (el.closest('.tex-scroll, .katex, [aria-hidden="true"]') || el.matches('p.muted.mono')) continue;
        if (el.children.length > 6 && !el.matches('.readout')) continue;
        const t = el.innerText;
        if (t && t.length < 600) out.push(t);
      }
      return out;
    });
    for (const line of lines.flatMap((l) => l.split('\n'))) for (const [re, what] of bad) assert(!re.test(line), `I6 ${route} prints ${what}: "${line.slice(0, 120)}"`);
    const loose = await page.evaluate(() => [...document.querySelectorAll('#view button, #view input, #view select, #view textarea, #view summary')].filter((e) => !e.id).map((e) => e.tagName.toLowerCase()));
    assert(loose.length === 0, `I7 ${route}: controls without an id: ${loose.join(', ')}`);
    await page.evaluate(() => { for (const d of document.querySelectorAll('#view details')) d.open = true; });
    await page.waitForTimeout(250);
    const noId = await page.evaluate(() => [...document.querySelectorAll('#view a[href], #view [tabindex]:not([tabindex^="-"]), #view [role="button"]')].filter((e) => !e.id).map((e) => e.tagName.toLowerCase() + ' "' + (e.textContent || '').trim().slice(0, 24) + '"'));
    assert(noId.length === 0, `I8 ${route}: links or tab stops without an id: ${noId.join(', ')}`);
    await noDuplicateIds(`I8 ${route}`);
    const lab = await page.evaluate(() => [...document.querySelectorAll('#view [aria-label], #view [title]')].map((e) => (e.getAttribute('aria-label') || '') + ' | ' + (e.getAttribute('title') || '')).filter((t) => /(?<![A-Za-z0-9_])[zw][012](?![A-Za-z0-9_(])/.test(t)));
    assert(lab.length === 0, `I8 ${route}: a label or tooltip with z1, z2 or z0: ${lab.slice(0, 3).join(' ; ')}`);
  }
  if (phone) {
    await go('problem-1-4-2');
    await page.click('#roots-problem-names');
    await fits('phone: roots with a meaning open');
    await page.click('#roots-quadratic-problem-names');
    await fits('phone: roots quadratic card');
  }
  log('extras: presets take the note away, roots slot stays put, the video host, the I6 I7 I8 scans, the phone');
}
```

## Appendix C. `tests/unit/i2-decisions-everywhere-a.test.mjs` (run against the diff above: 15/15)

```js
// tests/unit/i2-decisions-everywhere-a.test.mjs: the pure half of goal i2-decisions-everywhere-a (addresses, distance, powers, roots, curves).
// The values-preset readers, the fresh-numbers sentence and, for every problem these five stations own, the hand-checked numbers of
// docs/designs/iter-2/i2-decisions-everywhere-a.md section 6, taken through the stations' own models. The DOM half is
// tests/interact/i2-decisions-everywhere-a.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as AD from '../../js/stations/addresses.js';
import * as DS from '../../js/stations/distance.js';
import * as PW from '../../js/stations/powers.js';
import * as RT from '../../js/stations/roots.js';
import * as CV from '../../js/stations/curves.js';
import { glyphText, glyphGeometry } from '../../js/core/moveglyph.js';
import { problemById } from '../../js/data/problems.js';
import { namesMeaning } from '../../js/core/decisions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S3 = Math.sqrt(3), S2 = Math.SQRT2;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const nearZ = (a, b, eps = 1e-9) => near(a.re, b.re, eps) && near(a.im, b.im, eps);
const preset = (values, problem = null) => ({ kind: 'values', station: 'x', problem, family: problem, values });
const C = (re, im = 0) => ({ re, im });

// ---------------------------------------------------------------- the readers: one preset, five stations
test('V1 no values preset, no numbers: every reader says null', () => {
  for (const M of [AD, DS, PW, RT, CV]) {
    assert.equal(M.valuesStart(null), null);
    assert.equal(M.valuesStart(undefined), null);
    assert.equal(M.valuesStart({ kind: 'problem', id: '1.3.1' }), null);
    assert.equal(M.valuesStart({ kind: 'token', token: 'roots' }), null);
    assert.equal(M.valuesStart(preset({})), null, 'an empty values object has nothing to apply');
    assert.equal(M.valuesStart(preset({ nonsense: 1, __proto__: { z: C(1, 1) } })), null);
  }
});

test('V2 addresses: { z } with both parts within 100', () => {
  assert.deepEqual(AD.valuesStart(preset({ z: C(0, 2) }, '1.3.1')), { z: C(0, 2) });
  assert.deepEqual(AD.valuesStart(preset({ z: C(-0, 0) })), { z: C(0, 0) }, 'zero is allowed, and never -0');
  assert.equal(Object.is(AD.valuesStart(preset({ z: C(-0, 0) })).z.re, 0), true);
  assert.equal(AD.valuesStart(preset({ z: C(101, 0) })), null);
  assert.equal(AD.valuesStart(preset({ z: { re: NaN, im: 1 } })), null);
  assert.equal(AD.valuesStart(preset({ z: 'x' })), null);
  assert.equal(AD.valuesStart(preset({ z: { re: '1', im: 2 } })), null);
  const out = AD.valuesStart(preset({ z: C(1, 2) }));
  out.z.re = 9;
  assert.equal(AD.valuesStart(preset({ z: C(1, 2) })).z.re, 1, 'a fresh copy every call');
});

test('V3 freshText: the kit sentence, its short form when the problem does not match, then what was opened', () => {
  const p = problemById('1.3.1');
  const full = AD.freshText(p, preset({ z: C(0, 2) }, '1.3.1'), 'z = 2i');
  assert.ok(full.startsWith("Fresh numbers from the Rehearsal Room. The handout's own answer: z = 2(cos(2pi/3)"), full);
  assert.ok(full.endsWith('. Opened with z = 2i.'), full);
  assert.equal(AD.freshText(p, preset({ z: C(0, 2) }, '2.1.1'), 'z = 2i'), 'Fresh numbers from the Rehearsal Room. Opened with z = 2i.');
  assert.equal(AD.freshText(null, preset({ z: C(0, 2) }), 'z = 2i'), 'Fresh numbers from the Rehearsal Room. Opened with z = 2i.');
  assert.equal(AD.freshText(p, null, 'z = 2i'), 'Fresh numbers from the Rehearsal Room. Opened with z = 2i.');
  for (const M of [DS, PW, RT, CV]) assert.equal(M.freshText(null, preset({}), 'q'), 'Fresh numbers from the Rehearsal Room. Opened with q.');
});

test('V4 distance: mode from values.mode, else from which keys came, else from the problem; the circle keeps R as a radius', () => {
  const two = DS.valuesStart(preset({ mode: 'two', z1: C(1, 5), z2: C(-2, 1) }, '1.2.2'));
  assert.equal(two.mode, 'two');
  assert.deepEqual(two.two, { z1: C(1, 5), z2: C(-2, 1) });
  assert.equal(two.line, 'z₁ = 1 + 5i and z₂ = -2 + i');
  const circle = DS.valuesStart(preset({ mode: 'circle', a: C(1, 2), R: 3 }, '1.2.1'));
  assert.equal(circle.mode, 'circle');
  assert.deepEqual(circle.circle.a, C(1, 2));
  assert.deepEqual(circle.circle.R, C(1, 5), 'the dot sits straight above the centre, as the handout dot 1 + 5i does');
  assert.equal(circle.radius, 3);
  assert.equal(circle.line, 'centre a = 1 + 2i and radius 3');
  assert.equal(DS.valuesStart(preset({ a: C(1, 2), R: 3 })).mode, 'circle', 'keys alone decide when mode is missing');
  assert.equal(DS.valuesStart(preset({ z1: C(1, 1) })).mode, 'two');
  assert.equal(DS.valuesStart(preset({ mode: 'triangle', z1: C(3, 1), z2: C(1, 2) })).mode, 'triangle');
  assert.equal(DS.valuesStart(preset({ mode: 'two' })), null, 'a mode with none of its numbers has nothing to apply');
  assert.equal(DS.valuesStart(preset({ mode: 'bogus', z1: 'x' })), null);
  assert.equal(DS.valuesStart(preset({ mode: 'circle', a: C(0, 0), R: 0.1 })).radius, 3, 'a radius below the smallest the station allows is dropped, not clamped');
  assert.deepEqual(DS.valuesStart(preset({ mode: 'two', z1: C(51, 0), z2: C(0, 0) })).two.z1, DS.DEFAULTS.two.z1, 'z1 out of range falls back to the default z1 (4 + 3i)');
  assert.deepEqual(DS.valuesStart(preset({ mode: 'two', z1: C(1, 5) })).two.z2, DS.DEFAULTS.two.z2, 'a missing z2 keeps the default');
});

test('V5 distance: circleDot goes up, then right, down, left, so that the dot stays inside the starting view', () => {
  assert.deepEqual(DS.circleDot(C(1, 2), 3), C(1, 5));
  assert.deepEqual(DS.circleDot(C(-4, 3), 4), C(0, 3), 'up is 7 high but a.re = -4 is on the edge: up fails the margin, right works');
  assert.deepEqual(DS.circleDot(C(1, 7), 3), C(4, 7), 'up leaves the view (10 > 9 - 0.6); right fits');
  assert.deepEqual(DS.circleDot(C(7, 7), 3), C(7, 4), 'up and right leave it: down');
  for (const phi of [0, 1, 2, 3]) { const r = DS.circleDot(C(1, 2), 2 + phi); assert.ok(near(Math.hypot(r.re - 1, r.im - 2), 2 + phi, 1e-9)); }
});

test('V6 powers: z within the plane, n an integer 1..12; a missing key keeps the handout value', () => {
  assert.deepEqual(PW.valuesStart(preset({ z: C(S2, S2), n: 4 }, '1.3.2')), { z: C(S2, S2), n: 4 });
  assert.deepEqual(PW.valuesStart(preset({ z: C(1, 1) })), { z: C(1, 1), n: 10 });
  assert.deepEqual(PW.valuesStart(preset({ n: 7 })), { z: C(S3, 1), n: 7 });
  assert.deepEqual(PW.valuesStart(preset({ z: C(1, 1), n: 99 })), { z: C(1, 1), n: 10 }, 'a bad n is dropped');
  assert.deepEqual(PW.valuesStart(preset({ z: C(1, 1), n: 2.5 })), { z: C(1, 1), n: 10 });
  assert.deepEqual(PW.valuesStart(preset({ z: C(4.2, -4.2), n: 12 })), { z: C(4.2, -4.2), n: 12 });
  assert.equal(PW.valuesStart(preset({ z: C(4.3, 0), n: 99 })), null, 'z off the plane and n off the slider: nothing usable');
  assert.equal(PW.valuesStart(preset({ n: 0 })), null);
});

test('V7 roots: { c, n } within |c| <= 100 and n 2..12, or { quadratic } with a != 0 and |d| <= 100', () => {
  const cn = RT.valuesStart(preset({ c: C(-81, 0), n: 4 }, '1.4.2'));
  assert.deepEqual(cn.state, { c: C(-81, 0), n: 4, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false });
  assert.equal(cn.kind, 'cn'); assert.equal(cn.callout, '1.4.2'); assert.equal(cn.line, 'c = -81 and n = 4');
  assert.equal(RT.valuesStart(preset({ c: C(2, 1), n: 3 })).callout, null, 'no problem named: the usual rule picks the callout');
  assert.equal(RT.valuesStart(preset({ c: C(2, 1) }, '1.4.3')).callout, null, '1.4.3 never owns the big callout');
  assert.equal(RT.valuesStart(preset({ c: 'x', n: 99 })), null, 'the malformed request of A3 leaves roots on c = 1, n = 5');
  assert.deepEqual(RT.valuesStart(preset({ c: 'x', n: 7 })).state.c, C(1, 0));
  assert.equal(RT.valuesStart(preset({ c: C(101, 0) })), null);
  assert.equal(RT.valuesStart(preset({ n: 1 })), null);
  const q = RT.valuesStart(preset({ quadratic: { a: 1, b: -6, c: 25 } }, '1.4.3'));
  assert.equal(q.kind, 'quadratic'); assert.equal(q.state.quadFirst, true); assert.deepEqual(q.state.quad, { a: 1, b: -6, c: 25 });
  assert.deepEqual(q.state.c, C(-16, 0)); assert.equal(q.state.n, 2);
  assert.equal(q.line, 'a = 1, b = -6 and c = 25');
  assert.equal(RT.valuesStart(preset({ quadratic: { a: 0, b: 1, c: 1 } })), null);
  assert.equal(RT.valuesStart(preset({ quadratic: { a: 1, b: -60, c: 25 } })), null, 'd = 875 is beyond what the big picture holds');
  assert.equal(RT.valuesStart(preset({ quadratic: { a: 1, b: 'x', c: 25 } })), null);
  assert.deepEqual(RT.valuesStart(preset({ quadratic: { a: 0, b: 1, c: 1 }, c: C(2, 0), n: 3 })).state.c, C(2, 0), 'a bad quadratic does not stop a good c');
  assert.deepEqual(RT.initialState(null), { c: C(1, 0), n: 5, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false }, 'initialState is untouched');
});

test('V8 curves: { a, b }; b is pushed out to the smallest size, a missing end keeps the handout end', () => {
  const v = CV.valuesStart(preset({ a: C(1, 2), b: C(-1, -2) }, '1.5.1'));
  assert.deepEqual([v.a, v.b], [C(1, 2), C(-1, -2)]); assert.equal(v.line, 'a segment from 1 + 2i to -1 - 2i');
  const same = CV.valuesStart(preset({ a: C(1, 1), b: C(1, 1) }));
  assert.deepEqual(same.b, C(1.2, 1), 'b = a is pushed east by the smallest size 0.2');
  assert.deepEqual(CV.valuesStart(preset({ a: C(0, 0) })).b, C(-3, -3), 'the handout end stays');
  assert.deepEqual(CV.valuesStart(preset({ b: C(0, 0) })).a, C(2, 1));
  assert.equal(CV.valuesStart(preset({ a: C(60, 0), b: 'x' })), null);
});

// ---------------------------------------------------------------- the hand-checked numbers, through the stations' own models
test('M1 1.3.1: -1 + i sqrt 3 has r = 2, Arg = 2 pi/3 (not the arctan of y/x), and its glyph says turn 120, stretch 2', () => {
  const m = AD.addressModel(C(-1, S3));
  assert.ok(near(m.r, 2) && near(m.theta, 2 * Math.PI / 3));
  assert.notEqual(Math.round(Math.atan(m.y / m.x) * 1e6), Math.round(m.theta * 1e6), 'the naive arctan is -pi/3: wrong quadrant');
  assert.equal(AD.addressReadout(m), 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)');
  assert.ok(near(2 * Math.cos(m.theta), -1) && near(2 * Math.sin(m.theta), S3));
  assert.equal(glyphText(m.z), 'move: turn 120°, stretch 2');
  assert.equal(glyphText(C(2, 0)), 'move: turn 0°, stretch 2');
  assert.equal(glyphText(C(0, 0)), 'no move: 0');
  assert.equal(AD.addressReadout(AD.addressModel(C(0, 2))), 'z = 2i; |z| = 2; Arg z = 1.571 (π/2)');
});

test('M2 1.2.1 and 1.2.2: the circle is every point 3 from 1 + 2i; the distance is |5 + 2i| = sqrt 29 both ways', () => {
  const c = DS.circleStats(C(1, 2), C(1, 5));
  assert.ok(near(c.R, 3) && near(c.phi, Math.PI / 2));
  for (const phi of [0, Math.PI / 3, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) assert.ok(near(Math.hypot(1 + 3 * Math.cos(phi) - 1, 2 + 3 * Math.sin(phi) - 2), 3));
  assert.ok(near(1 + 3 * Math.cos(Math.PI / 3), 2.5) && near(2 + 3 * Math.sin(Math.PI / 3), 4.598076211353316));
  assert.equal(DS.readoutText({ mode: 'circle', circle: { a: C(1, 2), R: C(1, 5) } }), 'circle: center 1 + 2i, radius 3');
  const k = DS.slideStats(C(4, 3), C(-1, 1));
  assert.deepEqual(k.slide, C(5, 2));
  assert.ok(near(k.d, Math.sqrt(29)) && near(k.dPolar, Math.sqrt(29)) && near(k.d, 5.385164807134504));
  assert.ok(near(k.theta, Math.atan2(2, 5)) && near(k.theta, 0.3805063771123649));
  assert.ok(near(k.cross, -1) && near(k.crossPolar, -1) && near(k.cosd, -1 / (5 * S2)));
  assert.equal(DS.readoutText({ mode: 'two', two: { z1: C(4, 3), z2: C(-1, 1) } }), 'd = 5.385; z₁ − z₂ = 5 + 2i');
  assert.equal(DS.readoutText({ mode: 'two', two: { z1: C(1, 5), z2: C(-2, 1) } }), 'd = 5; z₁ − z₂ = 3 + 4i');
});

test('M3 1.3.2: (sqrt 3 + i)^10 = 1024 e^{i 5 pi/3} = 512 - 512 sqrt 3 i, home step -pi/3, and the glyph says turn -60, stretch 1024', () => {
  const m = PW.powerModel(C(S3, 1), 10);
  assert.ok(near(m.rn, 1024) && near(m.ntheta, 5 * Math.PI / 3) && near(m.home, -Math.PI / 3) && m.turns === 1);
  assert.ok(near(m.zn.re, 512, 1e-6) && near(m.zn.im, -512 * S3, 1e-6) && m.agree === true);
  assert.equal(PW.powersReadout(m), 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)');
  assert.equal(glyphText(m.zn), 'move: turn -60°, stretch 1024');
  const chain = PW.cartesianChain(C(S3, 1), 10);
  assert.ok(nearZ(chain[0].value, C(2, 2 * S3), 1e-9) && nearZ(chain[2].value, C(-8, 8 * S3), 1e-9), 'z^2 = 2 + 2 sqrt 3 i, z^4 = -8 + 8 sqrt 3 i');
  assert.ok(nearZ(chain[6].value, C(-128, -128 * S3), 1e-6), 'z^8 = -128 - 128 sqrt 3 i');
  const f = PW.powerModel(C(S2, S2), 4);
  assert.match(PW.powersReadout(f), /^zⁿ = -16; /);
  assert.equal(glyphText(f.zn), 'move: turn 180°, stretch 16');
  assert.equal(glyphText(PW.powerModel(C(S3, 1), 2).zn), 'move: turn 60°, stretch 4');
  assert.equal(glyphText(PW.powerModel(C(S3, 1), 12).zn), 'move: turn 0°, stretch 4096');
});

test('M4 1.4.1, 1.4.2, 1.4.3: the roots, the radius, the principal args, the quadratic, and the fresh c = -81', () => {
  const u = RT.rootsModel(C(1, 0), 5);
  const want = [C(1, 0), C(0.30901699437494745, 0.9510565162951535), C(-0.8090169943749475, 0.5877852522924732), C(-0.8090169943749475, -0.5877852522924732), C(0.30901699437494745, -0.9510565162951535)];
  u.roots.forEach((r, k) => assert.ok(nearZ(r, want[k]), `unity root ${k}`));
  assert.deepEqual(u.primitive, [false, true, true, true, true]);
  assert.ok(near(2 * Math.cos(2 * Math.PI / 5), (Math.sqrt(5) - 1) / 2) && near(2 * Math.cos(4 * Math.PI / 5), -(Math.sqrt(5) + 1) / 2), 'cos 72 and cos 144 from t^2 + t - 1 = 0');
  const m = RT.rootsModel(C(-16, 0), 4);
  assert.ok(near(m.rho, 2) && near(m.Theta, Math.PI));
  const exact = [C(S2, S2), C(-S2, S2), C(-S2, -S2), C(S2, -S2)];
  m.roots.forEach((r, k) => assert.ok(nearZ(r, exact[k]), `root ${k}`));
  assert.deepEqual(m.steps.slice(0, 4).map((s) => Math.round(s.argPoint / Math.PI * 4)), [1, 3, -3, -1], 'principal args pi/4, 3pi/4, -3pi/4, -pi/4');
  assert.equal(RT.rootsReadout(m), 'c = -16; n = 4; |c|^(1/n) = 2; Arg c = π; roots at (Arg c + 2πk)/n; k = 0..3');
  const Q = RT.quadraticModel(1, -4, 13);
  assert.ok(Q.ok && Q.d === -9 && Q.h === 2 && Q.disc === -36);
  assert.ok(nearZ(Q.roots[0], C(2, 3)) && nearZ(Q.roots[1], C(2, -3)) && nearZ(Q.s, C(0, 3)));
  assert.equal(RT.quadraticReadout(Q), '(z - 2)² = -9; square roots: ±3i; roots: 2 + 3i, 2 - 3i');
  const f = RT.rootsModel(C(-81, 0), 4);
  assert.equal(RT.rootsReadout(f).slice(0, 36), 'c = -81; n = 4; |c|^(1/n) = 3; Arg c');
  f.roots.forEach((r, k) => assert.ok(nearZ(r, [C(3 / S2, 3 / S2), C(-3 / S2, 3 / S2), C(-3 / S2, -3 / S2), C(3 / S2, -3 / S2)][k])));
  const fq = RT.quadraticModel(1, -6, 25);
  assert.ok(fq.d === -16 && fq.h === 3 && nearZ(fq.roots[0], C(3, 4)));
  assert.equal(RT.quadraticReadout(fq), '(z - 3)² = -16; square roots: ±4i; roots: 3 + 4i, 3 - 4i');
});

test('M5 1.5.1: z(t) = (2 - 5t) + i(1 - 4t); the midpoint is -0.5 - i; the fresh ends 1 + 2i and -1 - 2i meet at 0', () => {
  const a = C(2, 1), b = C(-3, -3);
  assert.deepEqual(CV.curveAt('segment', a, b, 0.5), C(-0.5, -1));
  assert.deepEqual(CV.curveAt('segment', a, b, 0), C(2, 1));
  assert.deepEqual(CV.curveAt('segment', a, b, 1), C(-3, -3));
  assert.deepEqual(CV.velocityAt('segment', a, b, 0.3), C(-5, -4));
  assert.ok(near(Math.hypot(-5, -4), Math.sqrt(41)) && near(Math.atan2(-4, -5), -2.4668517113662407));
  for (const t of [0, 0.25, 0.5, 1]) assert.ok(nearZ(CV.curveAt('segment', a, b, t), C(2 - 5 * t, 1 - 4 * t)));
  assert.equal(CV.readoutText('segment', a, b, false, 0.5), 't = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1');
  assert.equal(CV.readoutText('segment', C(1, 2), C(-1, -2), false, 0.5), 't = 0.5; z(t) = 0; x(t) = 0; y(t) = 0');
});

test('M6 the decision chips of the five problems are the ones the data says (A1 reads them from here)', () => {
  const want = { '1.3.1': ['C->P', 'home'], '1.2.1': ['P', 'none'], '1.2.2': ['C', 'none'], '1.3.2': ['C->P->C', 'any'], '1.4.1': ['P', 'all'], '1.4.2': ['P->C', 'all'], '1.4.3': ['C', 'all'], '1.5.1': ['C', 'none'] };
  for (const [id, [address, names]] of Object.entries(want)) { const p = problemById(id); assert.deepEqual([p.address, p.names], [address, names], id); }
  assert.equal(namesMeaning('home'), 'The home step only: Arg z in (−π, π], and principal values.');
});

// ---------------------------------------------------------------- the source pins that this goal must not disturb (they are in other tests too; here they fail with this goal's name)
test('P1 source pins of iteration 1 that the additions respect', () => {
  const pow = read('js/stations/powers.js'), cur = read('js/stations/curves.js'), roots = read('js/stations/roots.js'), ad = read('js/stations/addresses.js'), dist = read('js/stations/distance.js');
  assert.equal((pow.match(/grid-template-columns: minmax\(0, 1fr\)/g) || []).length, 3, 'powers.js: U32 counts the three shrinking grids; new CSS uses flex');
  assert.equal((pow.match(/\bdrawLabel\(/g) || []).length, 1, 'powers.js: U32 allows one drawLabel');
  assert.doesNotMatch(cur, /cv-under|z-index/, 'curves.js: C25');
  assert.doesNotMatch(cur, /window\.addEventListener|document\.addEventListener/, 'curves.js: C25');
  assert.equal((roots.match(/isPrimitiveRoot\(/g) || []).length, 1, 'roots.js: U9');
  assert.equal((roots.match(/quadraticRoots\(/g) || []).length, 1, 'roots.js: U9');
  assert.doesNotMatch(roots, /querySelector\('\.plane-handle-label'\)/, 'roots.js: U10');
  for (const [name, src, n] of [['addresses.js', ad, 1], ['curves.js', cur, 2], ['distance.js', dist, 1]]) {
    assert.equal((src.match(/(?:h|mk)\('summary'/g) || []).length, n, `${name}: I12 counts the <summary> toggles (the card of the kit adds none here)`);
  }
  for (const src of [pow, cur, roots, ad, dist]) assert.doesNotMatch(src.replace(/\/\/[^\n]*/g, ''), /\d\s?degrees?\b/, 'I11: the word degrees');
  // the glyph and the readout are siblings (A2): the markup builds a row, never puts the glyph in the readout
  assert.match(ad, /h\('div', \{ cls: 'ax-readout-row', id: 'addresses-readout-row' \}, glyph, readoutEl\)/);
  assert.match(pow, /h\('div', \{ cls: 'pw-readout-row', id: 'powers-readout-row' \}, glyph, readoutEl\)/);
  // valuesOf is the only reader of a values preset (A6): no direct preset.values access
  for (const [name, src] of [['powers.js', pow], ['curves.js', cur], ['roots.js', roots], ['addresses.js', ad], ['distance.js', dist]]) {
    assert.doesNotMatch(src, /preset\.values|ctx\.preset\.values/, `${name}: read a values preset through valuesOf`);
    assert.match(src, /valuesOf\(preset, VALUES_SHAPE\)/, `${name}: valuesOf with the station's shape`);
  }
  // glyphs wear --polar through the shared class, never a literal colour of this goal's own
  assert.doesNotMatch(ad.match(/\.ax-readout-row[^\n]*/g).join('\n') + pow.match(/\.pw-readout-row[^\n]*/g).join('\n'), /#[0-9a-fA-F]{3,6}\b|rgb\(/);
  assert.equal(glyphGeometry(C(-1, S3)).clipped, false);
});
```

