# Design: i1-station-home-problems (the Map and the Problem Index)

Goal id `i1-station-home-problems`, wave 1, kind station. Owns `js/stations/home.js` and `js/stations/problems.js`.
Reads `docs/ARCHITECTURE.md` 3, 4, 5, 8, 9, 10 and `js/core/{complex,plane,katex,explainer,staircase,theme,store}.js`, `js/registry.js`,
`js/data/problems.js`, `css/components.css`. Depends on i1-shell, i1-data, i1-core-plane, i1-core-widgets (all built).
Designer: stage 2. Every number in this document was recomputed with `js/core/complex.js` and the real data modules on 2026-10-15
(scratch prototypes of the pure helpers, section 5, were run against the real registry and `PROBLEMS`); the expected values in
sections 6 and 7 are copied from those runs.

> **Residue cleanup (iteration 1).** `WIDE_MIN` is 712 (the collision sweep is clean from 712 up); the part captions sit at `y - 44`; the finder also searches a low-weight `detail` field and reads `142` as `1.4.2`; its no-match sentence echoes at most 40 characters of the query; a statement's closing punctuation stays with the maths before it (`statementNodes`, `appendStatement`); the plain-text `<details>` has a drawn chevron; the demo's problem line and caption are true whatever the dot does and name roles instead of colours; and `#home-demo-plane`, `#home-demo-ex` and `#home-demo-stairs` are element ids of the three hosts. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

The builder also creates the goal's two test files (the goal's own verification, same pattern as the wave-0 goals):
`tests/unit/i1-station-home-problems.test.mjs` and `tests/interact/i1-station-home-problems.mjs`. They are listed in section 7.

---

## 0. Findings that shaped this design (read first)

Each finding was checked against the code or data on disk. Where a finding contradicts ARCHITECTURE.md, the code and this file win.

1. **The registry, not the STORY, says which stations a thread passes through.** `STATIONS[].threads` gives T1 = 15 stops, T2 = 11 stops,
   T3 = 13 stops, and all three start at `home` (order 0) and end at `problems` (order 20):
   - T1: home, addresses, arithmetic, distance, powers, roots, sets, mappings, linear, powermap, reciprocal, derivative, cauchy-riemann, lab, problems
   - T2: home, addresses, staircase, powers, roots, powermap, principal-root, branches, lab, graph4d, problems
   - T3: home, curves, sets, mappings, linear, powermap, reciprocal, limits, derivative, cauchy-riemann, lab, graph4d, problems

   STORY section 2 draws shorter lines (its T1 skips roots, sets, derivative, cauchy-riemann). ARCHITECTURE section 5 says the map is
   drawn from the registry, so the map is built from `THREADS` and `STATIONS[].threads` and nothing else. A unit test pins the three lists.
2. **A `#problem-<id>` route never lands on the index.** `stationForProblem` skips `problems`, so `#problem-1-4-2` mounts `roots` with
   `preset { kind: 'problem', id: '1.4.2' }`. A card therefore links `#problem-1-4-2` and the link text says `roots`; the index itself is
   only `#problems`. Acceptance A2 and A4 both name that link, so **exactly one `<a>` per card (and per finder result) has that href**
   (the id badge on a card is a `<span>`, never a second link).
3. **`problemsForStation('problems')` returns all 29**, so ARCHITECTURE 4.1's "one problem chip per owned problem" would put 29 chips in the
   index header above the 29 cards. The index header has thread badges only. `home` owns no problem, so it has none either.
4. **`drawPolarAddress` already draws the `Arg z = ...` label and the `also ...` labels** for the ghost windings (ARCHITECTURE 3.5), and
   `drawSeam` labels the seam. The home demo calls the helpers; it draws no angle text itself.
5. **A plane handle drags in continuous plane units and the harness drags by pixels.** Moving a mouse to the pixel of (2, 1) lands within
   about 0.01 units of it, so a readout such as `z = 2.004 + 0.997i` would fail acceptance A3 (`"2 + i"`). The demo handle therefore
   snaps to a 0.05 grid (`snapToGrid`); the presets are set exactly (`handle.set` does not snap).
6. **Wave-1 stations are built in parallel**, so `js/stations/roots.js` and the others may not exist when this goal's script runs. The
   interaction script stubs every station module except `home.js` and `problems.js` with `page.route`, so its navigation checks never depend
   on another goal (section 7).
7. **The router has already put `section.station` in the document when `mount` runs**, so `clientWidth` can be measured synchronously.
   The router has already scrolled and focused (rule 10.1.2: the station must not), and it empties `#view` before the next route, so a station
   that leaves DOM behind is harmless but one that leaves listeners or observers is not.
8. **The wave-0 reviews set the rules for cards** (ARCHITECTURE 10.4): statements through `statementParts` (prose by text node, maths by
   `tex`), `answer.tex` as a `display` formula inside `.tex-scroll` with a scroll hint and `answer.text` as the wrapping fallback, prose
   through `prose()`, `routes.cart` under a `--cart` bar and `routes.polar` under a `--polar` bar, address chip text from `addressLabel`,
   tints from `addressTones`, proofs filter = `chapter === 0`.
9. **SVG legend swatches must not be `path.thread-line`.** Acceptance A2 counts exactly three of those on the page. Swatches use `<line>`.
10. **`css/components.css` is owned by the shell.** Station CSS is injected as `<style data-for="home">` and `<style data-for="problems">`
    (tokens only, class names prefixed `home-`, `finder-`, `problems-`, `pc-`, `map-`), exactly as the widget modules inject theirs. The
    shell classes used here are `.panel`, `.card`, `.card-grid`, `.chips`, `.chip`, `.btn`, `.check`, `.field`, `.readout`, `.two-planes`,
    `.callout`, `.badge`, `.thread-badge`, `.station-links`, `.station-link`, `.tex-scroll`, `.place-list`, `.muted`, `.mono`, `.row`.
11. **Differences between ARCHITECTURE.md and the code** (the code was used): ARCHITECTURE 3.15 says `chapter: 0 | 1 | 2 | 3` but `lab` and
    `graph4d` have `chapter: 4` (this design never uses a station's chapter); ARCHITECTURE 9 gives addresses a `|z| =` readout but the
    acceptance for home asks for `r = 2.236`, so the home readout says `r`; `PART_TITLES` lives in `js/app.js` and stations do not import
    `app.js`, so `home.js` keeps its own five captions and a unit test checks they still start with the `PART_TITLES` titles; ARCHITECTURE 9 says the demo plane is
    `home-demo` but the handle it names, `#home-demo-plane-z`, only exists for a plane whose id is `home-demo-plane` (a handle id is `<plane id>-<point id>`), so the plane id is
    `home-demo-plane`; ARCHITECTURE 9 names the store key `progress` but not its value, which this design defines as `{ [id]: true }`.
12. **Cost notes.** KaTeX is cold on first use (the widgets design measured 229 ms for a 6-row explainer plus a 7-row staircase at 4x CPU
    throttle). The home demo explainer has 2 rows. The index renders 29 statements synchronously (about 90 small formulas); section 8 gives
    the budget and the fall-back (chunked rendering) if it is exceeded.

---

## 1. Goal restatement, story thread, coverage

### 1.1 What is built

- **`#home` (The Map).** The first screen of the site. In order: a header with two buttons; a finder ("Where is that problem?"); a hero row
  with one draggable dot (left) and, beside it, its two addresses as a readout and all of its names as the arg / Arg staircase (right); the
  two-column working of the same dot under it (full width, so the Cartesian and polar columns sit side by side); the four-line spine of the
  whole test; the map of all 21 stations with the three thread lines, a thread legend and a problem-progress line; the night-before study
  plan; the links out.
- **`#problems` (The Problem Index).** All 29 review problems and proofs as cards in handout order, each with the statement, the place it
  lives, the address that makes it easy and why, the one-sentence aha, and the answer (plus the full Cartesian and polar working) behind a
  reveal; chapter / proof / not-ticked filters; ticks that persist; a predict-first mode; a strip that shows how the 29 split between
  Cartesian, polar and both; and the 12 syllabus topics as a checklist with station links.

### 1.2 Story thread carried, and how it shows on screen

- **The story is only a story if the map exists.** `home` draws the 21 stations as one path with **T1 in `--cart`, solid**, **T2 in
  `--polar`, dashed**, **T3 in `--output`, solid**, as three parallel strands. A filled dot on a strand means the thread stops there
  (T2's stops are hollow rings, so colour is never the only cue). Under each place sit small circles, one per review problem it owns
  (29 in all); they fill with `--ok` when the student ticks that problem in the index. "The exam is 29 dots on a path they have walked"
  is literal.
- **One point, two addresses, on the very first screen.** The home demo is one dot. Blue dashed drop lines (`--cart`) say where it sits;
  the orange ray and solid arc (`--polar`) say how to reach it; faint orange windings (the helper's `also ...` ghosts) are the other names
  of the turn; the dashed grey negative real axis is the seam. Beside it the staircase widget lists `arg z` as a set with `Arg z` as the
  one highlighted step, and the dot is drawn once. The student sees the distinction the assignment asks about before reading any copy.
- **`problems` is the exam-eve pass** (STORY section 6, step 5): "say the station, the address, the aha, then reveal the answer; tick it".
  The address chip carries the two-colour code (`addressTones`), the route that is native to the address is marked "easy here", and the
  balance strip shows the whole test as 10 Cartesian, 12 polar and 7 mixed (section 6.4) so the student sees that the two addresses split
  the exam almost evenly.

### 1.3 Review problems and topics covered

All 29 problems and 12 topics in `assignment_refs`, as cards and as map dots (the data module owns the text; this goal renders it):

- Chapter 1: 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.3.1, 1.3.2, 1.4.1, 1.4.2, 1.4.3, 1.5.1, 1.5.2
- Chapter 2: 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.3.1, 2.4.1, 2.5.1
- Chapter 3: 3.1.1, 3.1.2, 3.2.1
- Proofs: P1, P2, P3, P4, P5, P6, P7
- Topics: T1.1 to T1.5, T2.1 to T2.5, T3.1, T3.2

The home demo is itself a worked instance of problem **1.3.1** (the dot starts at z = -1 + i sqrt(3)); section 6 gives the full Cartesian and polar
working for every problem, hand-checked, as the unit-test expectations.

---

## 2. UX

### 2.1 Wireframes

Desktop, `#home` at 1280 x 860 (content column about 950 px; the sidebar at the left is the shell's):

```
+--------------------------------------------------------------------------------------------+
| The Map                                                                      <h1>          |
| Test 1 is not 29 recipes. It is one picture, seen from different sides. Drag the dot,      |
| read the four lines, then find your problem on the map.                                    |
| (o T1 One point, two addresses) (o T2 The staircase) (o T3 A function is a motion)         |
| [ Start with One Point, Two Addresses ]  [ Open the problem index ]                        |
+--------------------------------------------------------------------------------------------+
| Where is that problem?                                                #home-finder-panel   |
| Type a problem number or a word                                                            |
| [ 1.4.2, P3, circle, roots of unity                                       ]  #home-finder  |
| Try a number like 1.4.2 or P3, or a word from the question.   (1.4.2) (P3) (circle) (branch)|
| 1 match                                                                                    |
| [1.4.2] Find all the 4th roots of -16. Express answers in both ...            roots  >     |
+---------------------------------------+----------------------------------------------------+
| Drag the dot                #home-demo| Its two addresses, and all its names  #home-names  |
| One point. Blue says where it sits... | z = -1 + 1.732i; r = 2; Arg z = 2.094 (2pi/3)      |
| +-----------------------------------+ | arg z = { 2.094 + 2*pi*k : k an integer }          |
| |  Im                               | |  #home-readout                                     |
| |   |   . also 4.4 (ghost arc)      | |  arg z = { 2pi/3 + 2pi k : k is any integer }      |
| |   |  /  Arg z = 2.094             | |  Arg z = 2.094 (2pi/3)                             |
| |   | /_ r = 2                      | |  +--------------------------------------------+    |
| |---O-------------- Re   seam ----- | |  | 2pi/3 + 2pi = 8pi/3          k = 1   ~ 8.378|    |
| |   |  x = -1 / y = 1.732           | |  |> Arg z = 2pi/3 (shaded home) k = 0   ~ 2.094|    |
| +-----------------------------------+ |  | 2pi/3 - 2pi = -4pi/3         k = -1  ~-4.189|    |
| Try: (-1 + i sqrt3) (1 + i) (-2)      |  +--------------------------------------------+    |
|                                       | Climbing a step changes the name of the angle,     |
|                                       | not the dot. Arg z is the one name in (-pi, pi].   |
|                                       | Problem 1.3.1 is this dot: -1 + 1.732i ... [1.3.1] |
+---------------------------------------+----------------------------------------------------+
| The same dot, written both ways                                         #home-working      |
|  Quantity           | Cartesian (slide)           | Polar (spin-and-stretch)               |
|  The address        | (x, y) = (-1, 1.732)        | (r, Arg z) = (2, 2.094 (2pi/3))        |
|  Get it from other  | x = r cos t = -1            | r = sqrt(x^2 + y^2) = 2                |
|                     | y = r sin t = 1.732         | Arg z = atan2(y, x) = 2.094            |
|  same point         | z = -1 + 1.732i             | z = 2 e^{i 2.094}            [ agree ]  |
+--------------------------------------------------------------------------------------------+
| The whole test in four lines                                              #home-spine      |
| A complex number is a PLACE and a MOVE. A function is a motion of the whole plane.         |
| The derivative is the move you see when you zoom into the motion.                          |
| | 1 Place and move | 2 The staircase | 3 Motion and time | 4 Zoom |   (4 columns)        |
| | text ...         | text ...        | text ...          | text ... |                     |
| | (addresses)      | (staircase)     | (mappings)        | (derivative)                    |
| | (arithmetic)     | (roots)         | (powermap)(lab)   | (cauchy-riemann)                |
+--------------------------------------------------------------------------------------------+
| The map                                                                                    |
| Each place is a stop. The three lines are the story threads ...                            |
| [ ---- T1 One point, two addresses ] [ - - T2 The staircase ] [ ---- T3 A function ...]    |
|  I . The point (Ch 1)                                                                      |
|     0       1        2        3        4        5        6                                |
|   [=]-----[=]-----[=]-----[=]-----[=]-----[=]-----[=]--+     (three strands, one per      |
|   The Map  One Pt.  Slide..  Length.. The Stair. Powers  Roots |      thread; dots = stops)  |
|              o       oooo      oo               o      ooo     |                           |
|  III . Motions (Ch 2) cont.  <--- row 2 runs right to left ---+  II . Curves and sets (Ch 1)|
|   ...                                                                                      |
| Ticked 0 of 29 problems. Open the problem index.                                           |
+--------------------------------------------------------------------------------------------+
| A night-before plan (about two hours)                                                      |
|  1. ... 2. ... 3. ... 4. ... 5. ... 6. ...                                                 |
+--------------------------------------------------------------------------------------------+
| [ -> One Point, Two Addresses ] [ T3 starts at Curves and Time ] [ The Problem Index ]      |
+--------------------------------------------------------------------------------------------+
```

Phone, `#home` at 390 x 844 (single column, 16 px gutters, content width 358):

```
+------------------------------+
| The Map                      |
| Test 1 is not 29 recipes ... |
| (T1 ...) (T2 ...) (T3 ...)   |
| [ Start with One Point, ... ]|
| [ Open the problem index    ]|
+------------------------------+
| Where is that problem?       |
| [ 1.4.2, P3, circle, ...   ] |
| (1.4.2) (P3) (circle)(branch)|
| results (stacked rows,       |
|  each row = one link)        |
+------------------------------+
| Drag the dot                 |
| caption                      |
| [ plane 358 x 358 ]          |
| (-1+i sqrt3) (1 + i) (-2)    |
+------------------------------+
| Its two addresses, and all   |
| its names                    |
| z = ...; r = ...; Arg z = ...|
| arg z = { ... }              |
| staircase (3 rows) + note    |
| Problem 1.3.1 is this dot    |
+------------------------------+
| The same dot, written both   |
| ways (explainer, STACKED:    |
|  Cartesian above polar)      |
+------------------------------+
| The whole test in four lines |
| 1 ... 2 ... 3 ... 4 ...      |
| (stacked, one idea per block)|
+------------------------------+
| The map                      |
| (T1 ---)                     |
| (T2 - -)   legend chips wrap |
| (T3 ---)                     |
|  I . The point (Ch 1)        |
|  [=] 0 The Map               |
|   |                          |
|  [=] 1 One Point, Two Addr.  |
|   |  o                       |
|  ... 21 rows, 48 px each ... |
|  II . Curves and sets (Ch 1) |
+------------------------------+
| plan, links                  |
+------------------------------+
```

Desktop, `#problems` at 1280 x 860:

```
+--------------------------------------------------------------------------------------------+
| The Problem Index                                                              <h1>        |
| Every problem and proof from the handout is a card. Read the question, say the place, the  |
| address and the aha out loud, then reveal the answer. Tick a card when it feels easy.      |
| (o T1 ...) (o T2 ...) (o T3 ...)                                                           |
+--------------------------------------------------------------------------------------------+
| [=========-----------] 12 of 29 ticked                          [ Clear all ticks ]        |
| (All 29) (Chapter 1 (11)) (Chapter 2 (8)) (Chapter 3 (3)) (Proofs (7))  (Not ticked yet 17)|
| [x] Predict first: hide the place, the address and the aha until I reveal  [Hide all answers]|
| Showing 29 of 29.                                                                          |
+--------------------------------------------------------------------------------------------+
| Which address makes each question easy?                                                    |
| [##][##][##][##][##] ... 29 squares in handout order (blue / orange / split)               |
| Blue: Cartesian is easiest (10). Orange: polar is easiest (12). Split: you use both (7).   |
+--------------------------------------------------------------------------------------------+
| Chapter 1                                                                                  |
| +-----------------------------------------+  +-----------------------------------------+   |
| | [1.1.1] Algebraic Properties...  T1 [ ]Got it | [1.1.2] ...                          |   |
| | Let z1 = 3 - 2i and z2 = -1 + 4i. ...   |  | Find Im( ... )                          |   |
| | Lives at [arithmetic] Slide, Spin, ...  |  | ...                                     |   |
| | (C) Cartesian  The angles of ... not nice|  |                                         |   |
| | The aha. Multiply by the definition ... |  |                                         |   |
| | [ Show the answer ]                     |  | [ Show the answer ]                     |   |
| +-----------------------------------------+  +-----------------------------------------+   |
| ... (2 columns; a revealed card grows, neighbours do not stretch)                          |
+--------------------------------------------------------------------------------------------+
| Topics: the syllabus checklist                                                             |
| [T1.1 Algebraic properties ... stations, problems, [ ] I can explain this] ... x12         |
+--------------------------------------------------------------------------------------------+
| [ <- The 4D Graph ] [ T1: The Mapping Lab ] [ The Map ]                                    |
+--------------------------------------------------------------------------------------------+
```

A revealed card (inside `.answer`, built on first reveal):

```
| Answer                                                                    |
| z_k = e^{i 2 pi k / 5}, k = 0..4: 1, 0.309 + 0.951i, ...   (scrolls sideways; hint below) |
| Scroll sideways to see the rest.                                           |
| > Plain text version                                                       |
| |  In Cartesian (slide)                |  <- blue bar    [easy here] if native |
| |  Cartesian algebra is awkward here ...                                    |
| |  In polar (spin and stretch)         |  <- orange bar  [easy here] if native |
| |  The staircase of 1 is the angles 2 pi k ...                              |
```

Phone `#problems`: single column; the tools panel stacks (progress bar, filter chips wrap, predict checkbox, hide-all button); balance strip wraps to two rows of squares; cards one per row; answer formulas scroll sideways inside their box; the two routes stack (Cartesian above polar).

### 2.2 Controls (every control, its id, label and behaviour)

**home**

| id | element | label | behaviour |
|---|---|---|---|
| `home-start` | `a.btn.btn-primary` | `Start with {addresses title}` | `href="#addresses"` |
| `home-open-problems` | `a.btn` | `Open the problem index` | `href="#problems"` |
| `home-finder` | `input[type=search]` | label (visible) `Type a problem number or a word`; placeholder `1.4.2, P3, circle, roots of unity` | filters on every `input` event, synchronously; Enter goes to the first result; ArrowDown moves into the results; Escape clears |
| `home-finder-try-1-4-2`, `-p3`, `-circle`, `-branch` | `button.chip` | `1.4.2`, `P3`, `circle`, `branch` | fills the input with the label, renders results, keeps focus on the input |
| `home-finder-status` | `p[role=status]` | (text) | `1 match`, `N matches`, `Showing 8 of N matches`, or empty |
| `home-finder-results` | `ul` | | one `li.finder-result` per match, one `a` per `li` |
| `home-finder-more` | `a` (hidden unless truncated) | `N more are not shown. Browse them all in the problem index.` | `href="#problems"` |
| `home-demo` | `section.panel` (left hero cell) | heading `Drag the dot` | holds the caption, the plane, the presets |
| `home-names` | `section.panel` (right hero cell) | heading `Its two addresses, and all its names` | holds the readout, the staircase, `home-stairs-note`, the problem line |
| `home-working` | `section.panel` (full width) | heading `The same dot, written both ways` | holds the explainer |
| `home-spine` | `section.panel` (full width) | heading `The whole test in four lines` | `home-spine-line` (the epigraph), `home-spine-1` to `home-spine-4` (`li`, `data-thread`) |
| `home-demo-plane` | plane (`createPlane`), element `#home-demo-plane-viewport`, canvas `#home-demo-plane-canvas` | aria-label `Demo plane for the point z. Drag the dot or use the arrow keys.` (the plane appends its key help) | pan and zoom as the plane's defaults (`+`, `-`, `0`, wheel when focused) **Superseded in residue cleanup:** the host element carries the id `home-demo-plane` too (exactly one element). |
| `home-demo-plane-z` | the plane's handle button | `z` (the plane builds the aria-label with both addresses) | pointer / touch drag, arrow keys (0.1; Shift 1; Alt does nothing because of the snap), snaps to a 0.05 grid |
| `home-demo-preset-m1-sqrt3i` | `button.chip` | `-1 + i√3` (U+2212 and U+221A in the label) | `handle.set({ re: -1, im: sqrt(3) })` exactly; `aria-pressed` while z equals it |
| `home-demo-preset-1-i` | `button.chip` | `1 + i` | `handle.set({ re: 1, im: 1 })` |
| `home-demo-preset-neg2` | `button.chip` | `-2 (on the seam)` | `handle.set({ re: -2, im: 0 })`; `Arg z = pi`, the seam is under the dot |
| `home-readout` | `div.readout` | (text) | two lines, section 5.9 |
| `home-demo-problem` | `p.muted` | the problem line (2.5) | built from `problemById('1.3.1')`; contains the link below |
| `home-demo-link-1-3-1` | `a.chip.problem-chip` | `1.3.1` | `href="#problem-1-3-1"` |
| `home-demo-ex` | explainer host (`createExplainer`, id `home-demo-ex`) | rows `address`, `convert` + footer `same` | updates on every drag; ids `home-demo-ex-address-cart`, `-address-polar`, `-convert-cart`, `-convert-polar`, `home-demo-ex-same` **Superseded in residue cleanup:** the host element carries this id (exactly one element). |
| `home-demo-stairs` | staircase host (`createStaircase`, id `home-demo-stairs`) | list label `arg z` | `update(Arg z)` on every drag; `update(null)` at z = 0; internals `#home-demo-stairs-set`, `-arg`, `-window`, `-list`, `-k-1`, `-k0`, `-k1` **Superseded in residue cleanup:** the host element carries this id (exactly one element). |
| `home-stairs-note` | `p.muted` | `Climbing a step changes the name of the angle, not the dot. Arg z is the one name in (-π, π].` | static |
| `home-legend` | `div.chips[role=group]` aria-label `Story threads` | | holds the three buttons below |
| `home-thread-T1`, `-T2`, `-T3` | `button.chip[aria-pressed]` | `T1 · One point, two addresses`, `T2 · The staircase`, `T3 · A function is a motion` (the part of `THREADS[].title` before `:` or `;`) | pressing lights that thread's stops and dims the rest; pressing again clears; `title` = the thread summary |
| `home-thread-note` | `p[role=status]` | (text) | `Tap a thread to light up its stops. Tap it again to see them all.` or the thread summary |
| `home-map` | `svg` | `aria-label` `Map of the {n} places in story order, with three story threads.` | holds 21 `a.map-station` and 3 `path.thread-line` |
| `home-map-host` | `div` | | the element whose width decides wide or narrow |
| `home-map-fallback` | `ul.place-list` | | shown only if drawing the map threw; plain list of the 21 places |
| `home-progress` | `p` | `Ticked {n} of {total} problems.` + link | reads the store key `progress` at mount |
| `home-plan` | `section`, `ol` rows `home-plan-1` to `-6` | | links only |
| `home-link-next`, `home-link-thread-T3`, `home-link-problems` | `a.station-link` | | in `nav.station-links` |

Presets also exist as route tokens: `#home-T1`, `#home-T2`, `#home-T3` mount home with that thread already lit (`ctx.preset.kind === 'token'`).

**problems**

| id | element | label | behaviour |
|---|---|---|---|
| `problems-progress` | `p[role=status]` | `{n} of 29 ticked` | updates on every tick |
| `problems-progress-bar` | `progress` | (labelled by `problems-progress`) | `value = n`, `max = 29` |
| `problems-clear` | `button.btn.btn-quiet` | `Clear all ticks`; armed: `Click again to clear all ticks` | two clicks within 4 s clear problems and topics (no `confirm`) |
| `problems-filters` | `div.chips[role=group]` aria-label `Show` | | |
| `problems-filter-all`, `-1`, `-2`, `-3`, `-P` | `button.chip[aria-pressed]` | `All (29)`, `Chapter 1 (11)`, `Chapter 2 (8)`, `Chapter 3 (3)`, `Proofs (7)` | exactly one is pressed; shows the matching cards |
| `problems-filter-todo` | `button.chip[aria-pressed]` | `Not ticked yet (N)` | toggle; combines (AND) with the chapter chip |
| `problems-predict` | `input[type=checkbox]` in `label.check` | `Predict first: hide the place, the address and the aha until I reveal` | persisted; hides `.pc-hint` of cards that are not revealed |
| `problems-hide-all` | `button.btn.btn-quiet` | `Hide all answers` | closes every open answer; disabled when none is open |
| `problems-count` | `p[role=status]` | `Showing {k} of 29.` (adds the filter name) | updates on every filter change |
| `problems-balance` | `div[role=img]` | aria-label `29 problems in handout order: 10 easiest in Cartesian, 12 in polar, 7 use both.` | 29 `span.pb-cell`, no interaction |
| `problems-deck` | `div` | | holds `section#problems-group-1`, `-2`, `-3`, `-P` |
| `problems-card-<k>` | `article.card.problem-card[data-problem]` | | `k` = id with dots as dashes (`1-4-2`, `P3`) |
| `problems-tick-<k>` | `input[type=checkbox]` in `label.check` | `Got it` (+ sr-only `(problem 1.4.2)`) | persists to store key `progress` |
| `problems-reveal-<k>` | `button.btn.reveal[aria-expanded][aria-controls]` | `Show the answer` / `Hide the answer` | builds `.answer` on first press, toggles `hidden` |
| `problems-answer-<k>` | `div.answer[hidden]` | | built lazily |
| `problems-empty` | `p.callout[hidden]` | `No cards match these filters.` + button `problems-show-all` (`Show all`) | |
| `problems-topics` | `section` | | 12 `article.panel.topic-card[data-topic]` |
| `problems-topic-<T1-4>` | the topic card | | `T1.4` becomes `T1-4` |
| `problems-topic-tick-<T1-4>` | checkbox | `I can explain this` | persists to `progress` under the topic id |

Route tokens: `#problems-1`, `-2`, `-3`, `-P` (case-insensitive), `-todo`, `-all` set the filters on mount (`ctx.preset.kind === 'token'`).

### 2.3 Interaction

**Pointer and touch.** The demo handle and plane are the shared widget (pointer events, `touch-action: none` on the handle, pinch and
two-finger pan on touch, the zoom buttons). Map stations are SVG links: tap or click anywhere in a station's cell (the transparent hit
rectangle is a whole column wide in the wide layout and a whole row, at least 44 px tall, in the narrow one). Legend and filter chips are
buttons of at least 44 px (`button.chip` in the shell is `--tap` high). Finder results are links that fill the row.

**Keyboard.**
- Tab order on home follows the DOM: start buttons, finder input, try chips, results, plane (a focusable group), handle, presets, the problem link,
  (the readout, staircase and explainer are read-only), spine links, legend buttons, the 21 station links in story order, plan links, footer links.
- Handle: arrows move 0.1 (Shift 1.0); the plane announces both addresses. Plane: `+`, `-`, `0`, arrows pan when the plane itself is focused.
- Finder: typing filters; `ArrowDown` from the input focuses the first result link; `ArrowDown` / `ArrowUp` move between result links;
  `ArrowUp` on the first returns to the input; `Enter` in the input follows the first result (`ctx.navigate(route)`); `Escape` clears the field
  and keeps focus in it.
- Map: each station is a link (`Tab` / `Shift+Tab`, `Enter`). Focus is drawn on the cell (a 2.5 px `--focus` outline on the hit rectangle).
- Problems: filter chips and the predict box are normal controls; each card has the tick, then the station link(s), then the reveal button;
  `Enter` or `Space` on the reveal button toggles; focus stays on the button.

**What follows what.** Dragging: `onDrag` is the single update path (readout, explainer, staircase, preset chips, plane redraw).
Presets call `handle.set`, which calls `onDrag` with `source: 'api'`. Resizing: the map relayouts in one rAF when its host width changes by
at least one pixel. Ticking (on `problems`) writes the store immediately; `home` reads it on mount.

### 2.4 States

| State | home | problems |
|---|---|---|
| Loading | none visible: `mount` is synchronous (the router's own `Loading...` shows if the module import is slow) | none: synchronous |
| Empty | finder with no text: the hint line and the try chips, no results list, no status; zero progress reads `Ticked 0 of 29 problems.` | filter or todo with no match: `problems-empty` shown, the groups hidden, count `Showing 0 of 29.`; progress 0 |
| Error | (a) map throws while drawing: `home-map-fallback` list shown with `The picture of the map could not be drawn. Here are the places as a list.`, the rest of the page is unaffected; (b) `createPlane` throws: the demo panel shows `The demo could not start in this browser. The rest of the page still works.` instead of the plane and the presets; the readout, staircase and explainer still render the starting dot; (c) KaTeX missing: `tex()` degrades to the source text (class `tex-error`), nothing else changes | KaTeX missing: statements and answers show the TeX source (the plain-text version stays readable); a card whose `buildAnswer` throws shows `This answer could not be drawn. Plain text: {answer.text}`; storage blocked: ticks work until reload |
| z at 0 (demo) | readout `z = 0; r = 0; Arg z is not defined at 0` and a second line; staircase shows its undefined state; the polar helper draws nothing; explainer polar cells say `Arg z is not defined at 0` | |
| Reduced motion | no animation exists on either route; hover and focus transitions are cut by the global CSS rule | same |

### 2.5 Copy (exact text)

Plain, direct, for a student the night before a test. No emoji. `{...}` is filled from data at runtime; never typed.

**home**

- Page title (router): `The Map`.
- Lede: `Test 1 is not {PROBLEMS.length} recipes. It is one picture, seen from different sides. Drag the dot, read the four lines, then find your problem on the map.`
- Thread badges: `T1 · One point, two addresses`, `T2 · The staircase`, `T3 · A function is a motion` (title before `:` or `;`).
- Buttons: `Start with {stationById('addresses').title}`, `Open the problem index`.
- Finder: heading `Where is that problem?`; label `Type a problem number or a word`; placeholder `1.4.2, P3, circle, roots of unity`; hint
  `Try a number like 1.4.2 or P3, or a word from the question.`; no match
  `Nothing matches "{query}". Try a problem number such as 2.5.1 or P4, or a word from the question.`; status `1 match`, `{n} matches`,
  `Showing {limit} of {n} matches`; truncated link `{n - limit} more are not shown. Browse them all in the problem index.`
- Finder row: `{id}` then the statement (maths typeset) then `{where}`, where `{where}` is the station id (`roots`) for a problem, the station id for
  a place, and the first station that teaches it for a topic.
- Demo: heading `Drag the dot`; caption
  `One point. Blue says where it sits: across by x, then up by y. Orange says how to reach it: turn, then walk r. The solid arc is Arg z. The faint arcs are other names for the same turn; together they are the set arg z. The grey dashed line is the seam, where Arg z jumps.`
  Presets label `Try:`; chips `-1 + i√3`, `1 + i`, `-2 (on the seam)`.
- Problem line: `Problem 1.3.1 is this dot: {fmtCart(z)}. Its polar address is r = {fmtNum(r)}, Arg z = {fmtAngle(Arg)}.` from `problemById('1.3.1').answer.values`.
- Readout (two lines, section 5.9): `z = 2 + i; r = 2.236; Arg z = 0.464` / `arg z = { 0.464 + 2*pi*k : k an integer }`.
- Names panel (right hero cell): heading `Its two addresses, and all its names`; the readout; the staircase (its own text: `arg z = { ... }`, `Arg z = ...`, the home window, three rows);
  the note `Climbing a step changes the name of the angle, not the dot. Arg z is the one name in (-π, π].`; then the problem line.
- Working panel (full width): heading `The same dot, written both ways`; explainer row labels `The address` and `Get it from the other`; column headings are the widget's defaults
  (`Cartesian (slide)`, `Polar (spin-and-stretch)`); footer `same point`.
- Spine: heading `The whole test in four lines`; epigraph (three lines, "place" tinted `--cart`, "move" tinted `--polar` on line 1):
  `A complex number is a place and a move.` / `A function is a motion of the whole plane.` / `The derivative is the move you see when you zoom into the motion.`
  The four ideas (title, text, chips; the text goes through `prose()`):
  1. `Place and move` — `A point has a place (slide x across, then y up) and a move (turn by θ, then stretch by r). Adding composes places; multiplying composes moves. Pick the address where the question is easy.` Chips: addresses, arithmetic.
  2. `The staircase` — `A move has many names: θ, θ + 2π, θ − 2π, and so on. That whole set is arg z. Arg z is the one name in (−π, π]. The point z itself never changes.` Chips: staircase, roots.
  3. `Motion and time` — `A function picks up every point and puts it down somewhere. A stroke is carried along on one clock. z^n, z^(1/n) and 1/z work directly on the polar address.` Chips: mappings, powermap, lab.
  4. `Zoom` — `Up close, a differentiable map is a single spin-and-stretch. Cauchy–Riemann says there is no mirror part. conj z, Re z and |z|² fail because they flip or squash.` Chips: derivative, cauchy-riemann.
  Chip text is `shortTitle(stationById(id).title)`; ideas 1 to 4 carry `data-thread` T1, T2, T3, T3; each idea's `h3` starts with a `span.home-spine-num` holding `1` to `4` (the list itself has `list-style: none`).
- Map: heading `The map`; intro `Each place is a stop. The three lines are the story threads: a dot on a line means that thread stops there. The small circles under a place are its review problems; they fill in when you tick them in the problem index.`;
  thread note `Tap a thread to light up its stops. Tap it again to see them all.`; progress `Ticked {n} of {PROBLEMS.length} problems.` with link `Open the problem index`.
  Part captions: `I · The point (Ch 1)`, `II · Curves and sets (Ch 1)`, `III · Motions (Ch 2)`, `IV · Zoom (Ch 3)`, `V · The diary and the index` (plus ` cont.` when the part continues on the next row).
- Plan: heading `A night-before plan (about two hours)`; the six steps, station names filled from the registry:
  1. `Read the four lines above and say them out loud. (5 min)`
  2. `Walk Part I, from {addresses} to {roots}. At each place do the one thing it asks, then say which address made the problem easy. (30 min)` Chips: addresses, arithmetic, distance, staircase, powers, roots.
  3. `Walk Parts II to IV, from {curves} to {cauchy-riemann}. At {limits} and {derivative}, make the direction circle shrink to a point by hand: that is all of Chapter 3. (45 min)` Chips: curves, sets, mappings, linear, powermap, principal-root, branches, reciprocal, limits, derivative, cauchy-riemann.
  4. `Predict in the Lab. Load a preset such as x = 2 under z², draw your guess on the w-plane, then reveal. (20 min)` Chips: lab and the tokens `#lab-2-1-2`, `#lab-2-2-1`, `#lab-2-5-1`, `#lab-P4` (chip text `2.1.2`, `2.2.1`, `2.5.1`, `P4`).
  5. `Do the problem index pass. For each card say the place, the address and the aha, then reveal the answer and tick it. Anything that is not instant, go back and touch it. (20 min)` Chip: problems.
  6. `Morning of the test: read the four lines again, then open {staircase} and drag the point around the origin until the jump in Arg z feels obvious. (10 min)` Chip: staircase.
  (5 + 30 + 45 + 20 + 20 + 10 = 130 minutes.)
- Links: next `{addresses title}`; `T3 starts at {curves title}`; `{problems title}`.

> Superseded in residue cleanup: the sentence echoes the first 40 characters of the query and an ellipsis (`FINDER_ECHO_MAX`); the search itself still reads 80. `.finder-empty` has `min-width: 0` and `overflow-wrap: anywhere`.

> Superseded in residue cleanup: the caption names the roles: "Its Cartesian address says where it sits ... Its polar address says how to reach it ...", tinted by `--cart` and `--polar`, and "The dashed seam line" replaces "The grey dashed line".

> Superseded in residue cleanup: the line is "The starting dot is problem 1.3.1: -1 + 1.732i. Its polar address is r = 2, Arg z = 2pi/3." so it stays true whatever the dot does.

**problems**

- Page title (router): `The Problem Index`.
- Lede: `Every problem and proof from the handout is a card. Read the question, say the place, the address and the aha out loud, then reveal the answer. Tick a card when it feels easy.`
- Progress `{n} of {total} ticked`; buttons `Clear all ticks` / `Click again to clear all ticks`; filters as in 2.2; predict
  `Predict first: hide the place, the address and the aha until I reveal`; `Hide all answers`; count `Showing {k} of {total}.` or `Showing {k} of {total}: {filter}.`
- Balance: heading `Which address makes each question easy?`; legend `Blue: Cartesian is easiest ({cart}). Orange: polar is easiest ({polar}). Split: you use both ({both}).`
- Group headings: `Chapter 1`, `Chapter 2`, `Chapter 3`, `Proof examples`.
- Card: tick `Got it`; place line `Lives at` {station chip `roots`} {muted station title} and, when `alsoAt` is not empty, `Also at` {chips};
  address line {address chip text from `addressLabel(code)`} {`addressWhy` as prose}; aha line `The aha.` {`aha` as prose}; predict note (only while predict is on and
  the card is closed) `Say it first: which place, which address, what is the aha?`; reveal `Show the answer` / `Hide the answer`.
- Answer: labels `Answer`, scroll hint `Scroll sideways to see the rest.`, `Plain text version`, `In Cartesian (slide)`, `In polar (spin and stretch)`, badge `easy here`
  on the single native route.
- Topics: heading `Topics: the syllabus checklist`; intro `Tick a topic when you could explain it to a friend without looking.`; card parts `Where to learn it`,
  `Problems`, button `Start at {first station title}` (`href="#topic-T1-4"`), tick `I can explain this`.
- Links: `{graph4d title}` (previous), `T1: {lab title}` (thread neighbour not already shown), `{home title}`.

---

## 3. Visual encoding

### 3.1 The two-address code, where it appears

| Where | Cartesian (`--cart`) | Polar (`--polar`) |
|---|---|---|
| Demo plane | dashed drop lines to both axes with `x = ...` and `y = ...` (from `drawCartAddress`); the faint Cartesian grid lines | solid ray with `r = ...`, solid arc with `Arg z = ...`, ghost windings `also ...` (from `drawPolarAddress`); the faint polar grid (circles, rays every 30 degrees) |
| Demo explainer | left column heading and cells tinted `--cart`; formulas wrapped with `cart(...)` | right column tinted `--polar`; formulas wrapped with `polar(...)` |
| Spine | the word `place` and idea 1's chip tone `cart` | the word `move`, idea 2's chip tone `polar` |
| Map | strand T1 (solid, filled stops) | strand T2 (dashed, hollow ring stops); T3 is `--output` (solid, filled) |
| Problem cards | the Cartesian route bar and heading; address dots | the polar route bar and heading; address dots |
| Balance strip | blue cells = Cartesian is easiest | orange cells = polar is easiest; split cells = both |

### 3.2 arg as a set, Arg highlighted, the point drawn once

- Plane: the point is the one handle dot. `drawPolarAddress(..., { ghosts: 1, ghostsNeg: 1 })` draws the single solid arc (`Arg z`) and one
  fainter winding above (`also theta + 2pi`) and one below (`also theta - 2pi`), each labelled `also ...` (the set).
- Staircase widget (`kMin: -1, kMax: 1`): the set line `arg z = { 2π/3 + 2πk : k is any integer }`, the highlighted `Arg z = ` row (k = 0, the
  shaded home band), and the two ghost rows. The note under it says climbing a step changes the name, not the dot.
- Readout line 2 writes the set; line 1 writes the one `Arg z`.
- Cards: no raw angle is ever shown without `arg` or `Arg` in the surrounding text of this goal's own copy; problem prose is the data's.

### 3.3 Input versus output, time

`--input` and `--output` mark z-plane and w-plane strokes; neither route draws a mapping. The demo dot is `--text` (it is the point, not a stroke).
T3 is drawn in `--output` because the thread is "a function is a motion", with the same hue the w-plane uses elsewhere. The time ramp (`--t0`
to `--t1`) is not used: nothing here has a clock. The map legend does not claim one.

### 3.4 Both themes

Every colour is a token resolved by CSS (`fill: var(--text)`), so the SVG map and the cards follow `data-theme` and `prefers-color-scheme` without a
redraw. The plane and explainer re-read tokens on `themechange` themselves. Computed contrast of the marks the map relies on (WCAG, ratio against
`--surface`, the panel the map sits on; the lowest value against `--bg` or `--surface-2` is in brackets):

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--cart` | 6.17 (5.04) | 7.12 (6.25) | T1 strand and stops |
| `--polar` | 6.06 (4.95) | 8.30 (7.28) | T2 strand and ring stops |
| `--output` | 6.17 (5.04) | 7.43 (6.52) | T3 strand and stops |
| `--ok` | 6.12 (5.00) | 8.86 (7.77) | ticked problem dots, `data-answer` yes |
| `--text-muted` | 6.86 (5.60) | 7.80 (6.85) | numbers, part captions, hollow dots |
| `--border-strong` | 4.14 (3.38) | 4.33 (3.80) | station pills (graphics need 3:1) |

All are at least 4.95 for coloured marks and at least 3.38 for the pill outline, in both themes.

### 3.5 Station CSS (injected; tokens only; every rule is prefixed)

The builder writes these rules in a template literal, injected once as `<style data-for="home">` (and `data-for="problems"`), removed in `unmount`.

home:

```
.home-epigraph p { margin: 0 0 var(--space-1); font-family: var(--font-display); font-size: 1.2rem; }
.home-epigraph .tone-cart { color: var(--cart); font-weight: 700 }  .home-epigraph .tone-polar { color: var(--polar); font-weight: 700 }
.home-spine-list { margin: var(--space-3) 0 0; padding: 0; list-style: none; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)) }   /* 4 across at 950 px, stacked on a phone */
.home-spine-list li { padding-left: var(--space-3); border-left: 4px solid var(--tone, var(--border-strong)); min-width: 0 }   /* li[data-thread] sets --tone */
.home-spine-list h3 { margin: 0 0 var(--space-1) }  .home-spine-list p { margin: 0 0 var(--space-2) }
.home-spine-num { margin-right: var(--space-1); font-family: var(--font-mono); color: var(--tone) }
.finder-results { margin: var(--space-2) 0 0; padding: 0; list-style: none; display: grid; gap: var(--space-1) }
.finder-result a { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr) auto; gap: var(--space-2); align-items: center; min-height: var(--tap);
                    padding: var(--space-1) var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface);
                    color: var(--text); text-decoration: none }
.finder-result a:hover { background: var(--surface-2) }
.finder-result .fr-id { font-family: var(--font-mono); font-weight: 700 }
.finder-result .fr-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden }
.finder-result .fr-where { font-family: var(--font-mono); color: var(--text-muted) }
@media (max-width: 30rem) { .finder-result a { grid-template-columns: 3.5rem minmax(0, 1fr) } .finder-result .fr-where { grid-column: 2 } }
.home-map-host { width: 100%; min-width: 0 }
.home-map { display: block; width: 100%; height: auto; overflow: hidden }
.home-map .thread-line { fill: none; stroke: var(--tone); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round }
.home-map .thread-line[stroke-dasharray] { stroke-linecap: butt }
.home-map .node-pill { fill: var(--surface); stroke: var(--border-strong); stroke-width: 1.5 }
.home-map a.map-station:hover .node-pill { fill: var(--surface-2) }
.home-map a.map-station[aria-current="page"] .node-pill { stroke: var(--text); stroke-width: 3 }
.home-map a.map-station { cursor: pointer; outline: none }
.home-map a.map-station .hit { fill: transparent; stroke: none }
.home-map a.map-station:focus-visible .hit { stroke: var(--focus); stroke-width: 2.5 }
.home-map .stop { fill: var(--tone); stroke: var(--surface); stroke-width: 1.5 }
.home-map .stop[data-thread="T2"] { fill: var(--surface); stroke: var(--tone); stroke-width: 2.5 }
.home-map .pdot { fill: none; stroke: var(--text-muted); stroke-width: 1.4 }  .home-map .pdot.is-done { fill: var(--ok); stroke: var(--ok) }
.home-map .map-num { fill: var(--text-muted); font: 600 11px var(--font-mono) }
.home-map .map-label { fill: var(--text); font: 600 12.5px var(--font) }  .home-map[data-mode="narrow"] .map-label { font-size: 13.5px }
.home-map .map-part { fill: var(--text-muted); font: 700 12px var(--font) }
.home-map .is-dim { opacity: 0.3 }  .home-map .thread-line.is-dim { opacity: 0.18 }
.home-map[data-focus="T1"] .stop:not([data-thread="T1"]), .home-map[data-focus="T2"] .stop:not([data-thread="T2"]),
.home-map[data-focus="T3"] .stop:not([data-thread="T3"]) { opacity: 0.25 }
.home-swatch .swatch-line { stroke: var(--tone); stroke-width: 3; stroke-linecap: round }
.home-plan { margin: 0; padding-left: 1.4rem; display: grid; gap: var(--space-3) }
.home-plan .chips { margin-top: var(--space-1) }
```

problems:

```
.problems-group h2 { margin: var(--space-4) 0 var(--space-2) }
.problems-deck .card-grid { align-items: start }
.pc-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) }
.pc-title { flex: 1 1 12rem; margin: 0; font-size: 1rem; font-family: var(--font) }
.pc-id { font-family: var(--font-mono); font-weight: 700 }
.pc-section { color: var(--text-muted); font-weight: 500 }
.pc-statement { overflow-wrap: anywhere }
.pc-hint p { margin: 0 0 var(--space-1) }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-hint { display: none }
.pc-predict-note { display: none; margin: 0 }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-predict-note { display: block }
.addr { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700 }
.addr-dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--tone) }   /* span[data-tone] sets --tone */
.pc-final { overflow-x: auto; max-width: 100% }
.pc-route { padding: var(--space-1) var(--space-2); border-left: 4px solid var(--tone) }        /* [data-route=cart] -> --cart, polar -> --polar */
.pc-route[data-route="cart"] { --tone: var(--cart) }  .pc-route[data-route="polar"] { --tone: var(--polar) }
.pc-route h4 { margin: 0 0 var(--space-1); color: var(--tone) }
.pc-routes { display: grid; gap: var(--space-2); grid-template-columns: 1fr }   /* always stacked: a card is narrower than 560 px except on a one-column tablet, where stacked still reads well */
.pb-grid { display: flex; flex-wrap: wrap; gap: 4px }
.pb-cell { width: 1.1rem; height: 1.1rem; border-radius: 3px; background: var(--tone) }
.pb-cell[data-kind="cart"] { --tone: var(--cart) }  .pb-cell[data-kind="polar"] { --tone: var(--polar) }
.pb-cell[data-kind="both"] { background: linear-gradient(90deg, var(--cart) 50%, var(--polar) 50%) }
.topic-card { display: flex; flex-direction: column; gap: var(--space-2); border-top: 4px solid var(--tone, var(--border-strong)) }   /* article[data-thread] sets --tone */
```

The cards use the shell's `.card`; the topic cards use `.panel` plus `.topic-card` (so a visible `.card` count under a chapter filter is the
problem cards only, and a filtered view has exactly the cards of that filter).

---

## 4. Module API

### 4.1 `js/stations/home.js`

Imports (relative only):

```js
import { STATIONS, THREADS, stationById, stationForTopic } from '../registry.js';
import { PROBLEMS, TOPICS, problemById, routeFor, topicRoute, statementParts } from '../data/problems.js';
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, cart as tintCart, polar as tintPolar, prose } from '../core/katex.js';
import { C, Arg, abs, eq, fromPolar, fmtCart, fmtNum, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
import { sanitizeProgress, countTicked, stationNeighbours, shortTitle, shortThreadTitle, PROGRESS_KEY } from './problems.js';   // same goal; problems.js is the leaf module
```

No top-level DOM access (the module imports in Node).

```js
export function mount(el, ctx)                 // -> unmount(); synchronous; el is the empty <section class="station">
export const WIDE_MIN = 760                    // container width (px) at or above which the map is wide
export const GEOM                              // frozen { PADX: 24, COLS: 7, TOP: 64, PITCH: 156, BOTTOM: 100, LANE: 9, PILL_W: 26, PILL_H: 40, CHAR_W: 6.6,
                                               //          N_AXIS: 32, N_PITCH: 48, N_PART_H: 30, N_TOP: 8, N_BOTTOM: 12 }
export const PART_LABELS                       // { I: 'The point (Ch 1)', II: 'Curves and sets (Ch 1)', III: 'Motions (Ch 2)', IV: 'Zoom (Ch 3)', V: 'The diary and the index' }
export { shortTitle }                          // re-exported from problems.js (defined once there): text before the first ':' trimmed; whole title when there is none; '' for a non-string
export { shortThreadTitle }                    // re-exported from problems.js: text before the first ':' or ';' trimmed
export function wrapLabel(text, maxChars, maxLines = 3)   // greedy lines; breaks after a hyphen; ellipsis on the last line when cut; [] for ''
export function layoutMap(stations = STATIONS, width = 360, threads = THREADS, problems = PROBLEMS)   // pure geometry, 5.2
export function threadStops(stations, threadId)          // station ids in order whose threads include threadId
export function normalizeQuery(q)                        // 5.5
export function buildSearchItems(problems = PROBLEMS, stations = STATIONS, topics = TOPICS)   // 5.5
export function searchItems(query, items, { limit = 8 } = {})   // -> { query, total, results: [{ kind, id, route, score }] }
export function snapToGrid(z, perUnit = 20)              // round both parts to 1/perUnit; never -0
export function angleText(theta)                         // '2.094 (2pi/3)', '3.142 (pi)', '0.464', '0'
export function homeReadout(z)                           // the two-line readout text, 5.9
```

`window.__mv.home = { layout: () => 'wide' | 'narrow', demo: () => ({ re, im }), search: (q) => string[] /* result ids */, mountMs: number }`; the property is
created with `const mv = (window.__mv = window.__mv || {})` and deleted in `unmount` only if it is still this mount's object.

### 4.2 `js/stations/problems.js`

Imports:

```js
import { STATIONS, THREADS, stationById } from '../registry.js';
import { PROBLEMS, TOPICS, problemById, topicById, problemsForTopic, routeFor, topicRoute, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { tex, prose } from '../core/katex.js';
```

```js
export function mount(el, ctx)                 // -> unmount(); synchronous
export const PROGRESS_KEY = 'progress'         // store key; value { [problemId or topicId]: true }, persisted
export const PREDICT_KEY = 'problems.predict'  // store key; boolean, persisted
export const FILTER_KEY = 'problems.filter'    // store key; { chapter: 'all' | '1' | '2' | '3' | 'P', todo: boolean }, memory only ({ persist: false })
export function idKey(id)                      // '1.4.2' -> '1-4-2', 'P3' -> 'P3', 'T1.4' -> 'T1-4'
export function shortTitle(title)              // text before the first ':' trimmed; whole title when there is none; '' for a non-string (home.js re-exports it)
export function shortThreadTitle(title)        // text before the first ':' or ';' trimmed (thread badges and legend chips; home.js re-exports it)
export function sanitizeProgress(raw)          // -> { [id]: true } keeping only known problem or topic ids with a true value; an array of ids is accepted; anything else -> {}
export function countTicked(progress, problems = PROBLEMS)   // how many problems (not topics) are ticked
export function setTicked(progress, id, on)    // -> a new sanitised object with id added (on) or removed; an unknown id changes nothing
export function filterMatches(problem, chapterKey)           // 'all' true; 'P' chapter 0 or kind proof; '1' | '2' | '3' by problem.chapter
export function filterCounts(problems = PROBLEMS)            // -> { all, '1', '2', '3', P }
export function parseProblemsToken(token)      // -> { chapter, todo } from '1' '2' '3' 'p' 'P' 'todo' 'all'; anything else -> { chapter: 'all', todo: false }
export function addressBalance(problems = PROBLEMS)          // -> { cart, polar, both } by the set of addressTones
export function stationNeighbours(stations, id)              // -> { prev, next, thread: { T1: { prev, next }, ... } } as station ids or null
```

`window.__mv.problems = { visible: () => string[] /* ids of problem cards not hidden, DOM order */, progress: () => object, filter: () => ({ chapter, todo }), mountMs: number }`.

### 4.3 Data structures

```js
// MapGeometry (layoutMap)
{ mode: 'wide' | 'narrow', width, height, rows, colW /* null when narrow */,
  nodes: [{ id, order, part, row, col, dir /* +1 or -1 travel direction on its row */, x, y,
            pill: { x, y, w, h }, num: { x, y, anchor, text },
            label: { x, y, anchor, lines: string[] },
            dots: [{ problem, x, y }], hit: { x, y, w, h } }],
  parts: [{ part, text, cont, x, y, anchor, node }],
  threads: [{ id, d /* SVG path data */, dash: boolean, first, last /* orders */, lane, stops: [{ station, x, y }] }] }

// SearchItem (buildSearchItems)
{ kind: 'problem' | 'station' | 'topic', id, key /* lower-case id used for id queries */, route, rank /* order in its own list */,
  station?: string, f: { /* lower-case searchable fields, 5.5 */ } }

// Progress (store key 'progress'): { '1.1.1': true, 'P3': true, 'T1.4': true }   // only true values are stored
```

### 4.4 Events and store keys

- DOM: `input`, `keydown` (finder); `click` (chips, buttons, results are links); the plane's `onDrag(z, { final, source })`.
- The map host's `ResizeObserver`; if `ResizeObserver` is missing, one `window` `resize` listener (attached last, removed in unmount).
- `problems` adds one `window` `resize` listener (attached last) to recompute scroll hints of open answers.
- Store: home reads `progress`; problems reads and writes `progress`, reads and writes `problems.predict`, reads and writes `problems.filter` with `{ persist: false }`.
  Neither station subscribes to the store (they are never mounted together).
- No custom DOM events.

### 4.5 Lifecycle

home `mount(el, ctx)`: inject style; build, in DOM order, the header, the finder panel, the hero (demo panel, names panel), the working panel, the spine panel, the map panel, the plan and the
links; create the plane, the staircase and the explainer (each in its own try/catch, section 5.6); render the finder hint; lay out and draw the map; apply `ctx.preset` (thread token); set
`window.__mv.home` (with `mountMs`); create the `ResizeObserver` **last**; return `unmount`.
home `unmount()`: `observer.disconnect()` (or remove the window listener); `cancelAnimationFrame(relayoutRaf)`; `plane.destroy()`, `explainer.destroy()`,
`stairs.destroy()`; remove the injected `<style>`; delete `window.__mv.home` if ours. No timers exist.

problems `mount(el, ctx)`: inject style; read store; build header; tools; balance; deck (29 cards, groups); topics; links; apply preset or stored filter;
set `window.__mv.problems` (with `mountMs` measured around the build); attach the `resize` listener **last**; return `unmount`.
problems `unmount()`: remove the `resize` listener; `clearTimeout(armTimer)`; remove the style; delete the hook if ours. Elements go with `#view`.

---

## 5. Algorithms

All pure helpers below were prototyped and run against the real registry and data on 2026-10-15; the expected values in section 7 are their output.

### 5.1 Shared helpers (defined once in `problems.js`, the leaf module; `home.js` imports them)

```
shortTitle(t):       s = typeof t === 'string' ? t : ''; i = s.indexOf(':'); return (i > 0 ? s.slice(0, i) : s).trim()
shortThreadTitle(t): String(t).split(/[:;]/)[0].trim()
idKey(id):           String(id).replace(/\./g, '-')
```

`wrapLabel(text, maxChars, maxLines = 3)`:

1. `words` = `String(text ?? '').trim().split(/\s+/)` without empties.
2. `pieces` = for every word, split after each hyphen (`word.match(/[^-]+-|[^-]+$|-/g) || [word]`); the first piece of a word has `join: false`, every later
   piece has `join: true` (no space is inserted before it).
3. Greedy: `cur = ''`; for each piece, `cand = cur === '' ? piece.t : cur + (piece.join ? '' : ' ') + piece.t`; if `cand.length <= maxChars || cur === ''` then `cur = cand`
   else push `cur` and start a new line with `piece.t`. Push the last non-empty `cur`.
4. If there are more than `maxLines` lines, keep the first `maxLines` and replace the last by `last.slice(0, max(1, maxChars - 1))` with trailing spaces and hyphens removed plus `…`.

### 5.2 `layoutMap(stations, width, threads, problems)` (pure; sections 2 and 3 describe what it draws)

1. `list` = stations sorted by `order`. `W = max(280, round(width) || 360)`. `mode = W >= WIDE_MIN ? 'wide' : 'narrow'`.
2. Lane offset of thread index `k` (0 for T1): `s_k = ((threads.length - 1) / 2 - k) * LANE` (so +9, 0, -9; positive means the left of the direction of travel).
3. `owned(id)` = ids of problems whose `station === id`, in data order.
4. **Wide.** `colW = (W - 2*PADX) / COLS`; `maxChars = floor((colW - 12) / CHAR_W)`. For station index `i`: `row = floor(i / COLS)`, `c = i % COLS`,
   `dir = row even ? +1 : -1`, `col = dir > 0 ? c : COLS - 1 - c` (row 2 runs right to left, so the end of a row and the start of the next share a column),
   `x = PADX + colW*(col + 0.5)`, `y = TOP + PITCH*row`. `turn = c === COLS - 1 && i + 1 < list.length` (the last station of a row that has a next row).
   Node parts: `pill` = `x - 13, y - 20, 26, 40`; `num` at `(x, y - 27)` anchor middle; `label` at `(x, y + 36)` anchor middle with
   `lines = wrapLabel(shortTitle(title), turn ? min(maxChars - 4, 14) : maxChars)` (turn nodes get narrower labels so the U-turn never touches them);
   `dots[j]` at `(x + (j - (n - 1)/2) * 10, y + 84)`; `hit` = `x - colW/2, y - 34, colW, 126`.
   A part caption is emitted for a station that starts a part or sits in column 0 of its row (`c === 0`): text `"{part} · {PART_LABELS[part]}"` plus `" cont."`
   when the part did not start at this station, at `(x - dir*12, y - 50)` with `anchor = dir > 0 ? 'start' : 'end'` (so the caption extends away from the U-turn).
   `rows = ceil(n / COLS)`, `height = TOP + PITCH*(rows - 1) + BOTTOM`.
5. **Narrow.** `y = N_TOP`. For each station: if it starts a part, emit a caption `"{part} · {PART_LABELS[part]}"` at `(78, y + 20)` anchor start (builder change, section 11: it was x 16, where the strands ran through the text) and `y += N_PART_H`;
   `cy = y + N_PITCH/2`; node at `x = N_AXIS`; `pill` = `x - 16, cy - 17, 32, 34`; `num` at `(70, cy - 4)` anchor end; `label` at `(78, cy - 4)` anchor start, one line
   (`shortTitle`); `dots[j]` at `(82 + 10*j, cy + 12)`; `hit` = `0, cy - 24, W, 48`; `y += N_PITCH`. `height = y + N_BOTTOM`.
6. **Threads.** For thread `k` with lane `s`: `members` = stations whose `threads` include the id, in order; `first`/`last` = the smallest / largest `order` among them (empty
   members give `d: ''`). The strand visits every node with `order` in `[first, last]` (not only members): lane point `P = wide ? (x, y - dir*s) : (x - s, y)` (in the
   narrow layout the lane offset runs west, so T1 is the westmost strand). Path data `M{P0}` then `L{P}` for each next node, rounded to 2 decimals with no trailing zeros.
   Wide only, between a node and the next node on a different row: `right = (row is even)`, `xT = x + dir*(PILL_W/2 + 6)`, `sign = right ? +1 : -1`,
   `rx = colW/2 - 8 + sign*s`, `ry = PITCH/2 + sign*s`, then append `L{xT} {y - dir*s}A{rx} {ry} 0 0 {right ? 1 : 0} {xT} {nextY - nextDir*s}` (a half ellipse; the end point
   is exactly `2*ry` below the start, which the elliptical arc needs). `stops[]` = the lane points of the members. `dash = !!thread.dash`.
7. Validation (done offline by the designer, repeated by a unit test): for every `W` from 760 to 1160 in steps of 4 no label, number, caption or dots box (width estimated at 7.0 px
   per character, a safety margin of 6 percent over `CHAR_W`) overlaps another or leaves `[0, W]`, and no sampled point of any U-turn ellipse enters one.

> Superseded in residue cleanup: the sweep runs from `WIDE_MIN` = 712.

> Superseded in residue cleanup: the caption baseline is `y - 44` (about 24 px under the previous row's problem dots and 19 px over its own station number).

> Superseded in residue cleanup: `WIDE_MIN` is 712 (the sweep of `validateWide` in 4 px steps is clean from 712 and fails just below, where two part captions overlap), so windows of about 1074 px and up get the serpentine map. A wide map for 1024 to 1073 px needs shorter part names or a cut station title and is left to iteration 2.

### 5.3 Drawing the map (`renderMap(geom)`)

1. `svg = #home-map` (class `home-map`; its host `#home-map-host` has class `home-map-host`); set `viewBox="0 0 {W} {H}"`, `width`/`height` attributes removed (CSS gives `width: 100%; height: auto`), `data-mode` (`wide` or `narrow`, read by the CSS), `role="group"`, `aria-label`.
   `svg.replaceChildren()`. Remember `document.activeElement`'s `data-station` if it is inside the svg.
2. Children in this order (all via `createElementNS('http://www.w3.org/2000/svg', ...)`):
   `g.map-parts` (one `text.map-part` per caption, `x`, `y`, `text-anchor`);
   `g.map-strands` (one `path.thread-line` per thread: `d`, `data-thread`, and **for a thread with `dash` the attribute `stroke-dasharray="8 6"` set on the element itself**,
   not in a stylesheet, so a script can read it; none on the others);
   `g.map-stations` (21 anchors).
3. Each anchor: `a.map-station` with `data-station`, `data-threads` (the space-separated thread ids), `href="#{id}"`, `role="link"`, `tabindex="0"`, `aria-label`
   (`"{title}. Place {order}. Problems: {ids or none}{, k of n ticked}. Threads: {ids}."`), and `aria-current="page"` for `home`. Children in this order:
   `title` (the same text), `rect.hit` (`rx = 8`), `rect.node-pill` (`rx = 12`), one `circle.stop` per member thread (`data-thread`, `r = 4.5`, at that thread's lane point),
   `text.map-num` (the order), `text.map-label` (one `tspan` per line: first `x`/`y`, later lines `x` and `dy="14.5"`), then one `circle.pdot` per owned problem
   (`data-problem`, `r = 3.2`, `aria-hidden="true"`, class `is-done` when ticked).
   Narrow labels: estimate `est = chars * 7.2`; if it exceeds `W - 78 - 8`, set `textLength` to that value and `lengthAdjust="spacingAndGlyphs"`.
4. Restore focus to the anchor with the remembered `data-station`, if any (`focus({ preventScroll: true })`).
5. Apply the thread focus (5.4) and the problem progress (`paintProgress`).
6. All of this is wrapped in try/catch; on a throw show `#home-map-fallback` (a `ul.place-list` of 21 `a.place-link`) and hide the svg.

`relayout()`: `w = round(host.clientWidth)`; if `w < 1` use 360; if `w === lastW` return; `lastW = w`; `geom = layoutMap(STATIONS, w)`; `renderMap(geom)`. The observer callback only calls
`scheduleRelayout()`, which sets `relayoutRaf = requestAnimationFrame(relayout)` once (no loop: `relayout` changes the svg height but not the host width, and an unchanged width returns early).
`paintProgress()`: `progress = sanitizeProgress(ctx.store.get(PROGRESS_KEY, {}))`; toggle `is-done` on each `circle.pdot` by `data-problem`; update `#home-progress`.

### 5.4 Thread focus and the legend

Legend button DOM (three, in `THREADS` order): `button.chip#home-thread-{id}[type=button][data-thread={id}][aria-pressed=false][title={summary}]` containing `svg.home-swatch[viewBox="0 0 36 10"][width=36][height=10][aria-hidden=true][focusable=false]`
with one `line.swatch-line[x1=1 y1=5 x2=35 y2=5]` (plus `stroke-dasharray="6 4"` when `thread.dash`) and a `span` with `{id} · {shortThreadTitle(title)}`. A swatch is a `<line>`, never a `path.thread-line`.


State `focusThread` (`null` or `'T1' | 'T2' | 'T3'`), initialised from `ctx.preset` (`kind: 'token'`, token matching `/^t[123]$/i`, upper-cased).
`setFocus(t)`: `focusThread = (t === focusThread) ? null : t`; `svg.dataset.focus = focusThread || ''` (attribute removed when null); every `a.map-station` gets
`is-dim` when `focusThread` is set and its `data-threads` does not include it; every `path.thread-line` whose `data-thread !== focusThread` gets `is-dim`; each legend button
`aria-pressed` = `String(btn.dataset.thread === focusThread)`; `#home-thread-note` = the thread's `summary` through `prose()` or the default hint. The map is re-rendered on a layout
change, so `renderMap` reapplies this at its end.

### 5.5 The finder

`normalizeQuery(q)`:

1. `s = String(q ?? '').toLowerCase()`; map U+2212, U+2013, U+2014 to `-`; strip a leading `#`.
2. Strip a leading `problem`, `problems` or `prob` and the separators after it when a digit, `p` or `t` follows (`/^\s*(?:problems?|prob)[\s\-_.:#]*(?=[0-9pt])/`).
3. Replace each of `\ { } ^ _ $` with a space; collapse whitespace; trim.
4. If `s` is only digits and separators (`/^[0-9][0-9\s,._-]*$/`), replace each run of separators with `.` and drop a leading `.` (`1 4 2`, `1,4,2`, `1-4-2` give `1.4.2`; `1.4.` stays `1.4.`).
   Else if it is `p` or `t` then digits and separators (`/^[pt][\s._-]*[0-9][0-9\s,._-]*$/`), keep the letter and normalise the rest the same way (`p 3`, `p.3` give `p3`; `t 1 4` gives `t1.4`).
5. If `s` is exactly `cr`, return `cauchy riemann`. Return `s`.

`buildSearchItems(problems, stations, topics)` (lower-case fields; `plain(st)` = `statementParts(st)` texts joined with spaces, then `\ { } ^ _ $` replaced by spaces, whitespace collapsed, lower-cased):

- problem: `key = id.toLowerCase()`, `route = routeFor(id)`, `rank` = index; `f = { section, text: plain(statement), aha, why: addressWhy, where: station id + ' ' + station title, topic: its topic titles joined }`.
- station: `key = id`, `route = id`; `f = { id, title, summary }`.
- topic: `key = id.toLowerCase()`, `route = topicRoute(id)`; `f = { title, summary, covers: covers joined }`.

Weights `W`: problem `{ where: 30, section: 20, text: 15, topic: 12, aha: 10, why: 5 }`; station `{ id: 50, title: 40, summary: 8 }`; topic `{ title: 40, summary: 8, covers: 8 }`. Kind order for ties: problem, station, topic.

`searchItems(query, items, { limit = 8 })`:

1. `q = normalizeQuery(query)`; empty gives `{ query: '', total: 0, results: [] }`.
2. **Id query** (`/^(?:\d+(?:\.\d+){0,2}\.?|p\d*|t\d*(?:\.\d*)?)$/`): over problems and topics only: score 1000 when `key === q` without a trailing `.`; score 800 when `key.startsWith(q)` and
   (`q` ends with `.`, or `q` is `p`, `t`, `p<digits>`, `t<digits>`, or `key.charAt(q.length) === '.'`); otherwise no match.
3. **Word query:** tokens = `q.split(' ')` that contain a letter or digit. An item matches when **every** token matches some field. A field matches a token when `field.indexOf(token) >= 0`;
   tokens of length 2 or less must also start at a word start (index 0 or after a non-alphanumeric character). Field score = field weight, plus 5 when the match is at a word start; when the station `id` field equals the token exactly the
   score is the weight plus 50 instead (so `roots` scores 100 on the station `roots`). Item score = sum over tokens of the best field score.
4. Sort by score descending, then kind order, then `rank`. `total` = number of matches; `results` = the first `limit`.

> Superseded in residue cleanup: a low-weight field `detail` (the two routes and the plain answer, weight 3, word starts of three letters or more only) is searched after every other field: it adds matches at the end and never reorders what the other fields found. `normalizeQuery('142')` is `1.4.2` (three digits only).

`renderFinder(value)`:

1. `res = searchItems(value, items, { limit: 8 })`; `results.replaceChildren()`; `more.hidden = true`.
2. Empty query: show `#home-finder-hint`, status text empty, return. Otherwise hide the hint.
3. `total === 0`: status `''`, append `li.finder-empty` with the no-match sentence (query inserted as a text node), return.
4. For each result append `li.finder-result[data-kind][data-id]` containing one `a[href="#{route}"]` with: `span.fr-id` (problem id, `topic id`, or the word `place`), `span.fr-text`
   (problem: `statementParts` text nodes and `tex()` spans; station: the title; topic: the title), `span.fr-where` (problem: its station id; station: its id; topic: `stationForTopic(id).id`).
5. Status: `1 match`, `{total} matches`, or `Showing {limit} of {total} matches`; if `total > limit` unhide `#home-finder-more` with the truncated sentence.

Keyboard and chips (all listeners are on the input, the results list or the chips, so nothing needs removing):

```
input 'input'   -> renderFinder(input.value)
input 'keydown' -> links = [...results.querySelectorAll('a')]
                   ArrowDown and links.length : preventDefault(); links[0].focus()
                   Enter     and links.length : preventDefault(); ctx.navigate(links[0].getAttribute('href').slice(1))
                   Escape                     : input.value = ''; renderFinder('')            // focus stays in the input
results 'keydown' -> links = [...results.querySelectorAll('a')]; i = links.indexOf(document.activeElement)
                   ArrowDown : preventDefault(); links[Math.min(i + 1, links.length - 1)].focus()
                   ArrowUp   : preventDefault(); (i <= 0 ? input : links[i - 1]).focus()
try chip 'click' -> input.value = chip label; renderFinder(input.value); input.focus()
```

### 5.6 The demo plane, readout, explainer and staircase

`snapToGrid(z, perUnit)`: `f(v) = Math.round(v*perUnit)/perUnit`, then `r === 0 ? 0 : r`. (`round(x*20)/20` is exact for multiples of 0.05; `round(x/0.05)*0.05` is not.)

Creation (each part in its own try/catch; on a throw the panel text of section 2.4 replaces that part):

1. `plane = createPlane(planeHost, { id: 'home-demo-plane', xRange: [-3.5, 3.5], yRange: [-3.5, 3.5], grid: 'both', axisLabels: ['Re', 'Im'], maxWidth: 460, ariaLabel: 'Demo plane for the point z. Drag the dot or use the arrow keys.' })`.
2. `handle = plane.addPoint({ id: 'z', z: START, label: 'z', color: '--text', radius: 8, step: 0.1, snap: (z) => snapToGrid(z, 20), onDrag: (z) => setDemoZ(z) })` with
   `START = { re: -1, im: Math.sqrt(3) }` (taken from `problemById('1.3.1').answer.values.z`).
3. `plane.addLayer((ctx2d, p) => { const z = handle.z; drawSeam(ctx2d, p, Math.PI); drawCartAddress(ctx2d, p, z); drawPolarAddress(ctx2d, p, z, { ghosts: 1, ghostsNeg: 1, name: 'z' }); })`.
4. `stairs = createStaircase(stairsHost, { id: 'home-demo-stairs', kMin: -1, kMax: 1, label: 'arg z' })`.
5. `ex = createExplainer(exHost, spec)` with the rows of 5.7.
6. `setDemoZ(START)`.

`setDemoZ(z)`: copy `z` into `state.z`; `readout.textContent = homeReadout(z)`; `stairs.update(abs(z) < 1e-9 ? null : Arg(z))`; `ex.update({ z })`; for each preset chip set
`aria-pressed = String(eq(z, preset.z, 1e-9))`; `plane.requestDraw()`.

### 5.7 The demo explainer

`createExplainer(exHost, { id: 'home-demo-ex', rows, same })`; columns default (`cart`, `polar`). `n(v) = fmtNum(v, 3)`. State is `{ z }`; each function computes `r = abs(z)`,
`theta = Arg(z)`, `zero = r < 1e-9`. Tints are applied inside the functions (rule 10.3.1).

- Row `{ id: 'address', label: 'The address', native: null }`
  - `cart: ({ z }) => tintCart('(x,\\ y) = (' + n(z.re) + ',\\ ' + n(z.im) + ')')`
  - `polar: ({ z }) => zero ? { text: 'Arg z is not defined at 0' } : tintPolar('(r,\\ \\Arg z) = (' + n(r) + ',\\ ' + n(theta) + ')' + (exactAngle(theta) && fmtAngle(theta) !== n(theta) ? '\\ \\left(' + texAngle(theta) + '\\right)' : ''))`
- Row `{ id: 'convert', label: 'Get it from the other', native: null }`
  - `cart: ({ z }) => zero ? tintCart('x = 0,\\ y = 0') : tintCart('\\begin{array}{l} x = r\\cos\\theta = ' + n(z.re) + ' \\\\ y = r\\sin\\theta = ' + n(z.im) + ' \\end{array}')`
  - `polar: ({ z }) => zero ? { text: 'r = 0; Arg z is not defined at 0' } : tintPolar('\\begin{array}{l} r = \\sqrt{x^2 + y^2} = ' + n(r) + ' \\\\ \\Arg z = \\operatorname{atan2}(y,\\ x) = ' + n(theta) + ' \\end{array}')`
- `same: ({ z }) => ({ cart: tintCart('z = ' + fmtCart(z)), polar: zero ? tintPolar('z = 0') : tintPolar('z = ' + n(r) + '\\,e^{i\\,' + n(theta) + '}'), agree: eq(z, zero ? C(0, 0) : fromPolar(r, theta), 1e-9) })`.

The theta in the polar cells is always `Arg z` (the helper writes `\Arg z`), never a bare `\theta` for a raw angle; the Cartesian cell's `\theta` is the same number, labelled by the row above.

### 5.8 Resolution and size management

- Plane: `createPlane` measures its own canvas (ResizeObserver, device pixel ratio capped by the plane). The station never touches canvas size. Plane `maxWidth: 460` makes it
  about 430 px in the left hero cell (cell width minus the panel padding) and the full content width (358 at 390) on a phone.
- Map: SVG user units equal CSS pixels (`viewBox` = host width x computed height, drawn at `width: 100%`), so text is never scaled; the layout is recomputed from the host width (5.3).
- Explainer: stacks by its own rule at 560 px or less. It sits in the full-width working panel (about 915 px of inner width on desktop), so the Cartesian and polar columns are
  side by side there and stacked on a phone; that is why the working panel is not one of the two hero cells (a hero cell is about 430 px).
- The map is rebuilt only when the host width changes by at least one pixel; the rebuild is one rAF.

### 5.9 `homeReadout(z)` and `angleText(theta)`

```
angleText(theta): d = fmtNum(theta); a = fmtAngle(theta); return a !== d ? d + ' (' + a + ')' : d      // '2.094 (2pi/3)', '3.142 (pi)', '0.464', '0'
homeReadout(z):
  if z is missing or a part is not finite: return 'z is not set'
  r = abs(z)
  if r < 1e-9: return 'z = 0; r = 0; Arg z is not defined at 0\narg z is not defined at 0'
  theta = Arg(z)
  return 'z = ' + fmtCart(z) + '; r = ' + fmtNum(r) + '; Arg z = ' + angleText(theta) + '\narg z = { ' + fmtNum(theta) + ' + 2*pi*k : k an integer }'
```

### 5.10 Problems: building the deck

`mount`:

1. `progress = sanitizeProgress(ctx.store.get(PROGRESS_KEY, {}))`; `predict = ctx.store.get(PREDICT_KEY, false) === true`;
   `filter = { chapter: 'all', todo: false }` merged from `ctx.store.get(FILTER_KEY)` if it is an object with a known `chapter`, then overridden by `parseProblemsToken(ctx.preset.token)` when
   `ctx.preset && ctx.preset.kind === 'token'`.
2. Build header, tools panel, balance panel, deck, empty message, topics, links (DOM outlines in 2.1 and 2.2).
3. The deck is `div#problems-deck.problems-deck` with `data-predict="{predict}"` (kept in step with the checkbox). For each group `1`, `2`, `3`, `P` (heading texts in 2.5) append the group `section#problems-group-{g}.problems-group` with an `h2` and a `.card-grid`; for each problem `p` of `PROBLEMS` (handout order) whose
   `filterMatches(p, g)` is true (group `P` is `chapter === 0`; groups `1` to `3` by `p.chapter`) append `buildCard(p)`.
4. `applyFilters()`; `renderBalance()`; `renderProgress()`; record `mountMs = performance.now() - t0`.

`buildCard(p)` (DOM per 2.1; `k = idKey(p.id)`):

1. `article.card.problem-card` with `id="problems-card-{k}"`, `data-problem`, `data-chapter` (`p.chapter`), `data-kind`, `data-thread`, `data-address`, `data-station`, `data-revealed="false"`, `aria-labelledby` the title.
2. Head: `h3.pc-title#problems-card-{k}-title` with `span.badge.pc-id` (the id) and `span.pc-section` (`p.section`); `span.thread-badge[data-thread]` (text = thread id); the tick `label.check` with `input#problems-tick-{k}[type=checkbox]` (`checked = progress[p.id] === true`)
   and `span` `Got it` plus an sr-only `(problem {id})`.
3. Statement: `div.pc-statement`; for each part of `statementParts(p.statement)`: text parts by `document.createTextNode`, maths parts by `span` + `tex(span, part.text)`.
4. `div.pc-hint`: place line (`Lives at`, `a.chip.station-chip[href="#{routeFor(p.id)}"][data-station]` whose text is the station **id**, a muted span with the station title, and when `p.alsoAt.length`, a `span.pc-also` holding `Also at` plus one `a.chip[href="#{id}"]`
   per entry); address line (`span.addr[data-code]` holding one `span.addr-dot[data-tone]` per entry of `addressTones(code)` mapped to `cart`/`polar`, then the text `addressLabel(code)`; then `prose(why, p.addressWhy)`); aha line (`strong` `The aha.` and `prose(span, p.aha)`).
5. `p.pc-predict-note` (copy in 2.5) and `button.btn.reveal#problems-reveal-{k}[type=button][aria-expanded=false][aria-controls=problems-answer-{k}]` with `Show the answer`.
6. `div.answer#problems-answer-{k}[hidden][data-answer-for]` (empty until the first reveal).
7. Listeners: tick `change` -> `setTick(p.id, checked)`; reveal `click` -> `toggleReveal(p)`.

`toggleReveal(p)`: if `answer.hidden`: if not built, `buildAnswer(p, answer)` inside try/catch (on a throw put the error sentence of 2.4 and `p.answer.text`); `answer.hidden = false`; `card.dataset.revealed = 'true'`;
`btn.setAttribute('aria-expanded', 'true')`; label `Hide the answer`; `updateScrollHint(answer)`; `updateHideAll()`. Otherwise the reverse.

`buildAnswer(p, box)`: `h4.pc-label` `Answer`; `div.tex-scroll.pc-final[tabindex=0][role=group][aria-label='Answer, scrolls sideways if it is wide']` containing `div` rendered by `tex(div, p.answer.tex, { display: true })`;
`p.pc-scroll-hint.muted[hidden]` with the hint; `details.pc-plain` with `summary` `Plain text version` and `p.mono` = `p.answer.text`; `div.pc-routes` with two `section.pc-route[data-route]` (`h4` with the heading, the `easy here` badge
on the single native route; `prose(p, p.routes.cart)` / `prose(p, p.routes.polar)`). Native routes = the set of `addressTones(p.address)` mapped to `cart`/`polar`; a badge only when the set has exactly one member.

> Superseded in residue cleanup: the summary reads "Plain text version (wraps to fit)" and `.pc-plain summary::before` draws the shell's chevron (it turns when open).

`updateScrollHint(answer)`: `hint.hidden = !(final.scrollWidth > final.clientWidth + 1)`; run on reveal and (one rAF, coalesced) on window `resize` for every open answer.

`setTick(id, on)`: `progress = setTicked(progress, id, on)`; `Object.keys(progress).length ? ctx.store.set(PROGRESS_KEY, progress) : ctx.store.remove(PROGRESS_KEY)`; `renderProgress()`; the card is **not** re-filtered
(so ticking under `Not ticked yet` does not make the card vanish under the pointer; it is hidden by the next filter change).

`renderProgress()`: `n = countTicked(progress)`; `#problems-progress` = `{n} of 29 ticked`; `progress` element `value = n`; the todo chip label `Not ticked yet ({29 - n})`.

`applyFilters()`: for each problem card `visible = filterMatches(p, filter.chapter) && (!filter.todo || progress[p.id] !== true)`; `card.hidden = !visible`; a group is hidden when all its cards are; `#problems-count` text; `#problems-empty.hidden = (visible count > 0)`;
chip `aria-pressed` states (`problems-filter-{chapter}` and `-todo`); `ctx.store.set(FILTER_KEY, filter, { persist: false })`.

`clearTicks()`: first press sets `armed = true`, label `Click again to clear all ticks`, `armTimer = setTimeout(disarm, 4000)`; second press within the time: `progress = {}`, `ctx.store.remove(PROGRESS_KEY)`, uncheck every tick (problems and topics), `renderProgress()`, `disarm()`.

`renderBalance()`: `b = addressBalance(PROBLEMS)`; the container `#problems-balance` has class `pb-grid`; for each problem in handout order a `span.pb-cell[data-kind]` (`kind` = `cart`, `polar` or `both`; `title` = `{id}: {addressLabel(code)}`), the container `aria-label` per 2.2, the legend text of 2.5 with the three counts.

Topic card (`buildTopicCard(t)`): `article.panel.topic-card#problems-topic-{idKey(t.id)}[data-topic][data-thread]`; `h3` `{t.id} · {t.title}` and the thread badge; `p` `prose(t.summary)`; `ul` of `prose(li, cover)`; `Where to learn it` with `a.chip[href="#{stationId}"]` per `t.stations` entry
(text `shortTitle(stationById(id).title)`); `Problems` with `a.chip.problem-chip[href="#{routeFor(id)}"]` per `problemsForTopic(t.id)`; `a.btn[href="#{topicRoute(t.id)}"]` `Start at {first station title}` (first = `t.stations[0]`); tick `input#problems-topic-tick-{idKey}` (`I can explain this`),
persisted under the topic id in the same `progress` object.

### 5.11 Station links (both stations)

`nb = stationNeighbours(STATIONS, ctx.station.id)`; candidates in order: previous (`data-dir="prev"`), next (`data-dir="next"`), then for each thread of the station in registry order its thread-previous and thread-next
(`data-thread`); skip a candidate with no target and any candidate whose target id is already linked; for `home` append the index link; for `problems` append the home link. Each is `a.station-link[href="#{id}"]` with the station title
(thread links prefixed `T3 starts at ` for home; `T1: ` for problems; ids `home-link-next`, `home-link-thread-T3`, `home-link-problems`; `problems-link-prev`, `problems-link-thread-T1`, `problems-link-home`).

`stationNeighbours(stations, id)`: sort by `order`; `prev`/`next` are the neighbours in that list; for each thread of the station, `members` = the stations whose `threads` include it and `thread[t]` = the neighbours inside `members`.

### 5.12 Hit testing, animation timing, event cost

- **Hit testing.** There is no custom hit-test code. Map stations are SVG `<a>` elements; the transparent `rect.hit` (drawn first inside the anchor, `fill: transparent`, so it still receives pointer events)
  is the target: a whole column by 126 px in the wide layout, a whole row (full width by 48 px) in the narrow one, so a tap never has to find the 26 px pill. The plane's handle has its own hit area (the plane
  sets `max(2 r + 18, 32)` px, so 34 px for the radius 8 used here, above the 24 px minimum of WCAG 2.2) and its own drag clamp; the canvas itself leaves vertical page scrolling to the browser on touch
  (`touch-action: pan-x pan-y`), so a thumb can scroll past the plane. Finder rows, chips and cards are ordinary links and buttons.
- **Animation timing.** Nothing is animated and nothing runs on a clock except: the plane's and explainer's own coalesced rAF redraws, one rAF for a map relayout, and one 4000 ms `setTimeout` that
  disarms `Clear all ticks`. `unmount` cancels the rAF and the timeout.
- **Event cost.** `onDrag` runs on every pointer move: it must do no DOM reads (no `getBoundingClientRect`, no `clientWidth`), only the writes in 5.6. The finder re-renders on every input event and may
  rebuild at most 8 rows; ticking writes one small JSON object.

---

## 6. Mathematics

### 6.1 Formulas used by this goal's own pictures

- Polar from Cartesian: `r = sqrt(x^2 + y^2)`; `theta = Arg z = atan2(y, x)` in `(-pi, pi]` (`Arg` of a negative real is `pi`, of 0 is undefined in the UI).
- Cartesian from polar: `x = r cos(theta)`, `y = r sin(theta)`; `z = r e^{i theta}`.
- The set `arg z = { theta + 2 pi k : k integer }`; the ghost windings the plane draws are `k = +1` and `k = -1`; the staircase rows are `Arg z + 2 pi k` for `k = -1, 0, 1`.
- Snap: `round(20 v) / 20` per part (a 0.05 grid).
- Map: `colW = (W - 48) / 7`; `x = 24 + colW (col + 1/2)`; `y = 64 + 156 row`; lane `s_k = (1 - k) * 9` for `k = 0, 1, 2`; turn ellipse `rx = colW/2 - 8 +- s`, `ry = 78 +- s` (end points `2 ry` apart).
- Search scores: 1000 and 800 for ids; field weights of 5.5.
- Balance: `cart` when the set of tones is `{--cart}`, `polar` when `{--polar}`, `both` when it has two members.

### 6.2 Demo values (the presets and the acceptance drag), recomputed

| z | Cartesian address | r | Arg z | exact | readout line 1 |
|---|---|---|---|---|---|
| -1 + i sqrt(3) | (-1, 1.732) | 2 | 2.094 | 2pi/3 | `z = -1 + 1.732i; r = 2; Arg z = 2.094 (2pi/3)` |
| 1 + i | (1, 1) | 1.414 (= sqrt(2)) | 0.785 | pi/4 | `z = 1 + i; r = 1.414; Arg z = 0.785 (pi/4)` |
| -2 | (-2, 0) | 2 | 3.142 | pi | `z = -2; r = 2; Arg z = 3.142 (pi)` |
| 2 + i (the acceptance drag) | (2, 1) | 2.236 (= sqrt(5)) | 0.464 | none | `z = 2 + i; r = 2.236; Arg z = 0.464` |
| 0 | (0, 0) | 0 | undefined | | `z = 0; r = 0; Arg z is not defined at 0` |

Hand check of the acceptance row: `r = sqrt(2^2 + 1^2) = sqrt(5) = 2.2360680`; `Arg = atan2(1, 2) = atan(0.5) = 0.4636476`, which is not a rational multiple of pi, so no parenthesis; `2.236 cos(0.4636) = 2.000`, `2.236 sin(0.4636) = 1.000`.
Staircase rows for 2 + i: `0.464 - 2π`, `0.464`, `0.464 + 2π`; for -1 + i sqrt(3): `2π/3 - 2π = -4π/3`, `2π/3`, `2π/3 + 2π = 8π/3`; for -2: `π - 2π = -π`, `π`, `π + 2π = 3π`.

### 6.3 Worked solutions of all 29 problems, in both addresses (the card content; unit-test expectations)

Each block is recomputed with `complex.js` (decimals to the digits shown). "C" is the Cartesian working, "P" the polar working.

**1.1.1** `z1 = 3 - 2i`, `z2 = -1 + 4i`.
C: `z1 z2 = (3)(-1) + (3)(4i) + (-2i)(-1) + (-2i)(4i) = -3 + 12i + 2i - 8i^2 = 5 + 14i`. `z1/z2 = (3 - 2i)(-1 - 4i) / ((-1)^2 + 4^2) = (-3 - 12i + 2i + 8i^2)/17 = (-11 - 10i)/17 = -0.6471 - 0.5882i`.
P: `r1 = sqrt(13) = 3.6056`, `Arg z1 = -0.5880`; `r2 = sqrt(17) = 4.1231`, `Arg z2 = 1.8158`. Product: `r = sqrt(221) = 14.8661`, angle `-0.5880 + 1.8158 = 1.2278 = atan2(14, 5)`: it checks. Quotient: `r = sqrt(13/17) = 0.8745 = sqrt(221)/17`, angle `-0.5880 - 1.8158 = -2.4038 = atan2(-10, -11)`: it checks.
Easy in: Cartesian. Values: product `(5, 14)`, quotient `(-11/17, -10/17)`, `|z1 z2| = sqrt(221)`.

**1.1.2** `z1 - z2 = (3 + 1) + (-2 - 4)i = 4 - 6i`; `conj = 4 + 6i`; `Im = 6`.
P: `|4 - 6i| = sqrt(52) = 7.2111`, `Arg = -0.9828`; the conjugate has `Arg = +0.9828`; `Im = 7.2111 sin(0.9828) = 6.000`. Value `6`.

**1.2.1** `|z - (1 + 2i)| = 3`.
C: `(x - 1)^2 + (y - 2)^2 = 9`, centre `(1, 2)`, radius 3. P: `z = (1 + 2i) + 3 e^{i phi}`, `phi = 0` gives `4 + 2i`, `phi = pi/2` gives `1 + 5i`, both at distance 3. Easy in: polar (the native shape).

**1.2.2** `(4 + 3i) - (-1 + i) = 5 + 2i`; `|5 + 2i| = sqrt(29) = 5.3852`.
P: the slide `5 + 2i` has `r = sqrt(29)` and `Arg = atan(2/5) = 0.3805 rad = 21.80 degrees`; the distance is `r`. Easy in: Cartesian.

**1.3.1** `z = -1 + i sqrt(3)`.
C: `r = sqrt(1 + 3) = 2`; `cos t = -1/2`, `sin t = sqrt(3)/2`, so `t = 2pi/3`. P: second quadrant, reference angle `pi/3`, `t = pi - pi/3 = 2pi/3 = 2.0944`; `Arg z = 2pi/3`; `arg z = { 2pi/3 + 2 pi k }`;
`z = 2(cos(2pi/3) + i sin(2pi/3)) = 2 e^{i 2pi/3}`; check `2 cos 120 degrees = -1`, `2 sin 120 degrees = 1.732`. Values `r = 2`, `Arg = 2pi/3`.

**1.3.2** `(sqrt(3) + i)^10`.
C (the long way): `(sqrt(3) + i)^2 = 2 + 2 sqrt(3) i`; `^4 = -8 + 8 sqrt(3) i`; `^8 = -128 - 128 sqrt(3) i`; `^10 = (^8)(^2) = (-128)(2) + (-128)(2 sqrt(3) i) + (-128 sqrt(3) i)(2) + (-128 sqrt(3) i)(2 sqrt(3) i) = -256 - 512 sqrt(3) i + 768 = 512 - 512 sqrt(3) i`.
P: `r = 2`, `Arg = pi/6`. Tenth power: `r = 2^10 = 1024`; angle `10 pi/6 = 5pi/3` (a name of arg, not Arg), subtract `2 pi`: home step `-pi/3`;
`1024 (cos(-pi/3) + i sin(-pi/3)) = 512 - 512 sqrt(3) i = 512 - 886.8100 i`. Values `result = (512, -886.8100)`, `r = 1024`, `Arg = -pi/3`, `rawAngle = 5pi/3 = 5.2360`.

**1.4.1** 5th roots of unity.
C: `z^5 - 1 = (z - 1)(z^4 + z^3 + z^2 + z + 1)`; the quartic does not factor over the reals by inspection. P: `z_k = e^{i 2 pi k / 5}`, `k = 0..4`:
`1`, `0.3090 + 0.9511i`, `-0.8090 + 0.5878i`, `-0.8090 - 0.5878i`, `0.3090 - 0.9511i`; `Arg` values `0, 1.2566, 2.5133, -2.5133, -1.2566` (= `0, 2pi/5, 4pi/5, -4pi/5, -2pi/5`); `k = 5` returns to `k = 0`.
Primitive: `gcd(k, 5) = 1` for `k = 1..4`, so all but `1`. `cos 72 degrees = (sqrt(5) - 1)/4 = 0.3090`.

**1.4.2** 4th roots of `-16`.
C: `z^4 + 16 = (z^2 - 4i)(z^2 + 4i)`; `z^2 = 4i` gives `z = +-sqrt(2)(1 + i)`; `z^2 = -4i` gives `z = +-sqrt(2)(1 - i)`.
P: `-16 = 16 e^{i pi}`; steps `pi + 2 pi k`; divide by 4: radius `16^{1/4} = 2`, angles `pi/4 + k pi/2`: `pi/4, 3pi/4, 5pi/4, 7pi/4`; Cartesian `2 cos 45 degrees = sqrt(2) = 1.4142`:
`(1.4142, 1.4142)`, `(-1.4142, 1.4142)`, `(-1.4142, -1.4142)`, `(1.4142, -1.4142)`; as `Arg`: `pi/4, 3pi/4, -3pi/4, -pi/4`. Check: `(2 e^{i pi/4})^4 = 16 e^{i pi} = -16`; each root to the 4th power is `-16` (to 1e-9).

**1.4.3** `z^2 - 4z + 13 = 0`.
C: `z = (4 +- sqrt(16 - 52))/2 = (4 +- sqrt(-36))/2 = (4 +- 6i)/2 = 2 +- 3i`; check `(2 + 3i)^2 - 4(2 + 3i) + 13 = (-5 + 12i) - 8 - 12i + 13 = 0`.
P: `-36 = 36 e^{i pi}`, principal root `6 e^{i pi/2} = 6i`, the other `-6i`; completing the square `(z - 2)^2 = -9`, `z - 2 = +-3i` (length 3, angle `+-pi/2`): a mirror pair about the real axis. Values `roots = (2, 3), (2, -3)`, `completed = { shift: 2, square: -9 }`.

**1.5.1** line from `2 + i` to `-3 - 3i`.
C: direction `(-3 - 3i) - (2 + i) = -5 - 4i`; `z(t) = (2 + i) + t(-5 - 4i) = (2 - 5t) + i(1 - 4t)`, `0 <= t <= 1`; `t = 0` gives `2 + i`, `t = 1/2` gives `-0.5 - i`, `t = 1` gives `-3 - 3i`.
P: the direction `-5 - 4i` has `r = sqrt(41) = 6.4031` and `Arg = atan2(-4, -5) = -2.4669 rad = -141.34 degrees`. Values `start = (2, 1)`, `end = (-3, -3)`, `direction = (-5, -4)`, `at(0.5) = (-0.5, -1)`.

**1.5.2** `S = { 1 < |z + i| <= 3 }`.
C: `S = { 1 < x^2 + (y + 1)^2 <= 9 }`, centre `(0, -1)`. P: `z = -i + rho e^{i phi}`, `1 < rho <= 3`, `phi` free: a ring. Not open (a point with `rho = 3` is in S, every disk around it leaves S); not closed (points with `rho = 1` are limits of S but not in S);
bounded (`|z + i| <= 3`); boundary = both circles; connected but not open, so not a domain; it is a region. Values `center = (0, -1)`, `inner = 1` (excluded), `outer = 3` (included), `open = false`, `closed = false`, `bounded = true`, `connected = true`, `domain = false`, `region = true`.

**2.1.1** `f(z) = z^2 + iz`.
C: `(x + iy)^2 + i(x + iy) = x^2 - y^2 + 2ixy + ix - y`; `u = x^2 - y^2 - y`, `v = 2xy + x`. P: `z = r e^{i theta}` (theta = Arg z): `z^2 = r^2 (cos 2 theta + i sin 2 theta)`, `iz = r(-sin theta + i cos theta)`;
`u = r^2 cos 2 theta - r sin theta`, `v = r^2 sin 2 theta + r cos theta`. Check at `z = 1 + i` (`r = sqrt(2)`, `theta = pi/4`): C `u = 1 - 1 - 1 = -1`, `v = 2 + 1 = 3`; P `u = 2 cos(pi/2) - sqrt(2) sin(pi/4) = 0 - 1 = -1`, `v = 2 sin(pi/2) + sqrt(2) cos(pi/4) = 2 + 1 = 3`; both `-1 + 3i`.

**2.1.2** image of `x = 2` under `w = z^2`.
C: `z = 2 + iy` (y is the clock), `z^2 = (4 - y^2) + 4iy`; `u = 4 - y^2`, `v = 4y`; eliminate `y = v/4`: `u = 4 - v^2/16` (vertex 4, opens left, focus 0). Check `y = 1`: `2 + i` goes to `3 + 4i`, and `4 - 16/16 = 3`.
P: on `x = 2`, `r = 2 sec(theta)`, `theta` in `(-pi/2, pi/2)`; squared: `rho = 4 sec^2(theta)` at `phi = 2 theta`, so `rho (1 + cos phi) = 4 sec^2(theta) * 2 cos^2(theta) = 8`: a conic with a focus at the origin (vertex `rho = 4` at `phi = 0`).

**2.1.3** image of `x = 2` under `f(z) = iz - 2i`.
C: `z = 2 + iy` gives `i(2 + iy) - 2i = 2i - y - 2i = -y`: real, every real value: the real axis `v = 0` (`z = 2 + 3i` gives `-3`).
P: `iz - 2i = i(z - 2)`: slide left 2, then multiply by `i = e^{i pi/2}` (adds `pi/2` to every angle, keeps every length): in general a counterclockwise quarter turn about 0 followed by a slide by `-2i` (equivalently a quarter turn about the fixed point `1 - i`).
Values `rotation = pi/2`, `shift = (0, -2)`, `sample z = (2, 3)` to `(-3, 0)`.

**2.2.1** image of `0 < arg z < pi/4` under `w = z^3`.
C: `z^3 = (x^3 - 3xy^2) + i(3x^2 y - y^3)`; edge `y = 0` goes to `x^3` (positive real axis); edge `y = x` goes to `x^3 (-2 + 2i)` (direction 135 degrees). P: `r e^{i theta}` goes to `r^3 e^{3 i theta}`: `0 < 3 theta < 3pi/4` and `r^3` covers `(0, infinity)`.
Image: the sector `0 < arg w < 3pi/4` (135 degrees, three times as wide; `3pi/4 < 2 pi`, so no overlap). Values `sector = (0, 3pi/4)`, `n = 3`.

**2.2.2** principal `(2i)^{1/2}`.
C: `(a + bi)^2 = 2i` gives `a^2 - b^2 = 0`, `2ab = 2`, so `a = b = +-1`: `+-(1 + i)`; the principal one has positive real part. P: `|2i| = 2`, `Arg(2i) = pi/2` (the home step); `sqrt(2) e^{i pi/4} = sqrt(2)(cos 45 degrees + i sin 45 degrees) = 1 + i`; the other root from the step `pi/2 + 2 pi`: `sqrt(2) e^{i 5pi/4} = -1 - i`.
Values `root = (1, 1)`, `r = sqrt(2)`, `Arg = pi/4`, `other = (-1, -1)`.

**2.3.1** limit of `(x^2 - y^2 + 2ixy)/(x^2 + y^2)` along `y = x^2`.
C: `(x^2 - x^4 + 2i x^3)/(x^2 + x^4) = (1 - x^2 + 2ix)/(1 + x^2)`; `x = 0.1` gives `0.9802 + 0.1980i`, `x = 0.01` gives `0.9998 + 0.0200i`, `x = 0.001` gives `0.999998 + 0.002i`: it tends to `1`. Along the real axis `1`; along the imaginary axis `z = iy` gives `-y^2/y^2 = -1`: different values, no full limit.
P: the fraction is `z^2/|z|^2 = z/conj z = e^{2 i theta}`; `y = x^2` arrives tangent to the real axis (`theta -> 0`), so `e^0 = 1`; `theta = pi/2` gives `e^{i pi} = -1`. Values `alongParabola = 1`, `alongRealAxis = (1, 0)`, `alongImagAxis = (-1, 0)`, `exists = false`.

**2.4.1** a branch of `z^{1/3}` continuous on the negative real axis.
C: no short formula (a case split on the signs of x and y is a window in disguise). P: choose the window `0 < theta < 2 pi` (seam on the positive real axis): `f(z) = r^{1/3} e^{i theta/3}`; the negative real axis is `theta = pi`, inside the window, so `f` is continuous there:
`f(-1) = e^{i pi/3} = 0.5 + 0.8660i`; the principal branch (`-pi < theta <= pi`) jumps from `e^{i pi/3}` to `e^{-i pi/3} = 0.5 - 0.8660i` across that axis (`branchRoot(-1 - 1e-12 i, 3, -pi)` is within 1e-9 of that).
Values `seam = 0`, `window = (0, 2 pi)`, `atMinusOne = (0.5, 0.8660)`, `principalJumps = true`.

**2.5.1** image of `|z - 1| = 1` under `w = 1/z`.
C: `w = (x - iy)/(x^2 + y^2)`; on the circle `x^2 + y^2 = 2x`, so `u = x/(2x) = 1/2` (for `z != 0`) and `v = -y/(2x)` takes every real value: the line `Re w = 1/2`. Check `z = 1 + i` (on the circle, `|i| = 1`): `1/z = (1 - i)/2 = 0.5 - 0.5i`.
P: the circle is `r = 2 cos theta` (`-pi/2 < theta < pi/2`); `1/z` has length `1/r` and angle `-theta`: `w = e^{-i theta}/(2 cos theta) = 1/2 - (i/2) tan(theta)`; real part stuck at `1/2`, `tan theta` sweeps all reals; the circle passes through 0, which goes to infinity, so it opens into a line.
Values `imageLine = Re w = 1/2`, `re = 0.5`, `sample z = (1, 1)` to `(0.5, -0.5)`.

**3.1.1** `f(z) = z^2 + z`.
C: `(f(z + h) - f(z))/h = (2zh + h^2 + h)/h = 2z + 1 + h`, which tends to `2z + 1`; at `z = 1 + i`: `f' = 3 + 2i`. P: with `h = rho e^{i phi}` the quotient is `2z + 1 + rho e^{i phi}`: a small circle of radius `rho` around `2z + 1` that shrinks to that point whatever `phi` is. Values `derivativeAt = { z: (1, 1), fprime: (3, 2) }`, `A = 2z + 1`, `|B| = 0`.

**3.1.2** `f(z) = |z|^2`.
C: the quotient is `conj z + z (conj h / h) + conj h`; real `h` gives limit `conj z + z = 2x`; imaginary `h` gives `conj z - z = -2iy`; equal only when `x = y = 0`. P: `h = rho e^{i phi}` gives `conj h / h = e^{-2 i phi}`, so the quotient tends to `conj z + z e^{-2 i phi}`: a circle with centre `conj z` and radius `|z|`, a point only when `z = 0`.
At `z = 1 + i`: centre `1 - i`, radius `sqrt(2)` (`localLinear` gives `A = 1 - i`, `B = 1 + i`). So differentiable only at 0, with `f'(0) = 0`; nowhere analytic (no disk of differentiable points). Values `circleRadiusAt = { z: (1, 1), radius: sqrt(2), center: (1, -1) }`.

**3.2.1** `f(z) = e^x (cos y + i sin y)`.
C: `u = e^x cos y`, `v = e^x sin y`; `u_x = e^x cos y = v_y`, `u_y = -e^x sin y = -v_x`; both hold at every point and the partials are continuous, so `f` is entire; `f' = u_x + i v_x = e^x cos y + i e^x sin y = f(z)`.
P: `|f| = e^x` and a continuous choice of `arg f` is `y`: the Cartesian address of `z` becomes the polar address of `w`; CR for `log f` reads `1 = 1` and `0 = 0`. Check `z = i pi/2`: `f = e^0 (cos(pi/2) + i sin(pi/2)) = i`, so `w = (0, 1)`; `f'(0) = 1`. Values `entire = true`, `fprimeAt0 = (1, 0)`.

**P1** `conj z1 conj z2 = conj(z1 z2)`.
C: `(x1 - i y1)(x2 - i y2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1)`, and `z1 z2 = (x1 x2 - y1 y2) + i(x1 y2 + x2 y1)` has that conjugate. P: `conj z1 = r1 e^{-i t1}`, `conj z2 = r2 e^{-i t2}`; the product `r1 r2 e^{-i(t1 + t2)}` is the conjugate of `r1 r2 e^{i(t1 + t2)}`.
Check `z1 = 3 - 2i`, `z2 = -1 + 4i`: both sides `5 - 14i`.

**P2** `|z| = sqrt(z conj z)`.
C: `(x + iy)(x - iy) = x^2 + y^2`. P: `r e^{i t} r e^{-i t} = r^2`; `r >= 0` so `sqrt(r^2) = r`. Check `z = 3 - 2i`: `z conj z = 9 + 4 = 13`, `sqrt(13) = 3.6056 = |z|`.

**P3** composition of linear maps is linear.
C: `a(cz + d) + b = (ac) z + (ad + b)`, linear with coefficient `ac` (nonzero when `a, c != 0`) and shift `ad + b`. P: `ac = |a||c| e^{i(alpha + gamma)}` (stretches multiply, spins add); the shift is `d` spun and stretched by `a`, then slid by `b`.
Check `a = i`, `b = -2i`, `c = 1 + i`, `d = 1`: `ac = i(1 + i) = -1 + i`; `ad + b = i - 2i = -i`; at `z = 0.3 + 0.7i`: `a(cz + d) + b = -1 - 1.4i` and `(ac) z + (ad + b) = (-1 + i)(0.3 + 0.7i) - i = -1 - 0.4i - i = -1 - 1.4i`.

**P4** `(1 + i) z` maps the unit circle onto `|w| = sqrt(2)`.
C: `w = (x - y) + i(x + y)`; `|w|^2 = (x - y)^2 + (x + y)^2 = 2(x^2 + y^2) = 2`; every `w` with `|w| = sqrt(2)` comes from `z = w/(1 + i)`, which has `|z| = 1`. P: `1 + i = sqrt(2) e^{i pi/4}`; `z = e^{i t}` goes to `sqrt(2) e^{i(t + pi/4)}`: constant length `sqrt(2)`, angle once around.
Values `radius = sqrt(2)`, `factor = (1, 1)`, `|factor| = sqrt(2)`, `Arg factor = pi/4`.

**P5** `lim_{z->0} (Re(1 + z) - 1)/z` does not exist.
C: `Re(1 + z) - 1 = x`, the fraction is `x/z`; along the real axis `x/x = 1`; along the imaginary axis `0/(iy) = 0`. P: `x/z = cos(theta) e^{-i theta} = 1/2 + (1/2) e^{-2 i theta}` (a circle with centre `1/2`, radius `1/2` through 0 and 1); `theta = 0` gives `1`, `theta = pi/2` gives `0`.
Values `alongRealAxis = (1, 0)`, `alongImagAxis = (0, 0)`, `exists = false`, `A = B = 1/2`.

**P6** `Re z` is not differentiable.
C: the quotient is `Re(h)/h`: `1` for real `h`, `0` for imaginary `h`; CR: `u = x`, `v = 0`, `u_x = 1 != 0 = v_y`. P: `h = rho e^{i phi}` gives `cos(phi) e^{-i phi} = 1/2 + (1/2) e^{-2 i phi} = A + B e^{-2 i phi}` with `A = B = 1/2`: a circle, not a point; `Re` flattens the plane onto the real axis, which no spin-and-stretch does.

**P7** entire `f = u + iv` with `u = c` is constant.
C: `u_x = u_y = 0`; CR gives `v_y = u_x = 0` and `v_x = -u_y = 0`; so `f' = u_x + i v_x = 0` on the plane (a domain), so `f` is constant. P: a nonzero `f'(z0) = rho e^{i alpha}` would spin by `alpha` and stretch by `rho`, sending a small disk onto a two-dimensional blob, but `u = c` puts every image on the line `Re w = c`.
Values `fprime = (0, 0)`, `constant = true`.

### 6.4 Counts and structure the pages display

| Quantity | Value | Source |
|---|---|---|
| Problems | 29 (11 in Chapter 1, 8 in Chapter 2, 3 in Chapter 3, 7 proofs) | `filterCounts` |
| Topics | 12 | `TOPICS.length` |
| Stations on the map | 21 (orders 0 to 20); parts of 7, 2, 7, 2, 3 | registry |
| Thread stops | T1 15, T2 11, T3 13 | registry, section 0 |
| Problems owned per station (the dots) | addresses 1, arithmetic 4, distance 2, powers 1, roots 3, curves 1, sets 1, mappings 1, linear 3, powermap 2, principal-root 1, branches 1, reciprocal 1, limits 2, derivative 3, cauchy-riemann 2; home, staircase, lab, graph4d, problems 0 (total 29) | `p.station` |
| Address balance | Cartesian 10 (1.1.1, 1.1.2, 1.2.2, 1.4.3, 1.5.1, 2.1.2, 3.1.1, 3.2.1, P3, P7); polar 12 (1.2.1, 1.4.1, 1.5.2, 2.2.1, 2.2.2, 2.3.1, 2.4.1, 2.5.1, 3.1.2, P2, P4, P5); both 7 (1.3.1, 1.3.2, 1.4.2, 2.1.1, 2.1.3, P1, P6) | `addressBalance` |
| Plan minutes | 5 + 30 + 45 + 20 + 20 + 10 = 130 | section 2.5 |

---

## 7. Verification plan

All commands run from the repository root. `node tools/smoke.mjs` runs each route at desktop (1280 x 860), phone (390 x 844) and, with `--dark`, desktop with the dark colour scheme.

### 7.1 Files the builder produces

- `js/stations/home.js`, `js/stations/problems.js` (owned).
- `tests/unit/i1-station-home-problems.test.mjs` (unit, Node, no browser).
- `tests/interact/i1-station-home-problems.mjs` (one script, `export default async function (page, ctx)`, branching on `ctx.route`; imports `./_helpers.mjs`).

### 7.2 Acceptance criteria

**A1. Both routes load clean.**
- Command: `node tools/smoke.mjs --route home,problems --dark`
- Pass: `6/6 checks passed across 2 route(s)`, exit code 0 (3 views x 2 routes: no console error, page error, failed request, external request, router error panel, empty view, or horizontal overflow).
- Also read the screenshots in `docs/review/shots/` (`home--desktop.png`, `home--phone.png`, `home--desktop-dark.png`, the same for `problems`) and check: the plane is square and not clipped; the map has no overlapping labels and no label touching a turn; the T2 strand is visibly dashed; phone map rows are 48 px apart with the numbers aligned; the dark theme keeps all three strands distinguishable; no text is cut at 390 px.

**A2. The map shows every station once with three thread lines; the finder reaches a problem.**
- Command: `node tools/smoke.mjs --route home --script tests/interact/i1-station-home-problems.mjs --dark`
- Unit tests (`npm test`, file `tests/unit/i1-station-home-problems.test.mjs`):
  - U1 `shortTitle`: `'Roots: Divide the Staircase'` -> `'Roots'`; `'1/z and the Sphere'` -> same; `'z^n: Fans and Parabolas'` -> `'z^n'`; `''`, `null`, `undefined` -> `''`; `shortThreadTitle`: the three registry titles -> `'One point, two addresses'`, `'The staircase'`, `'A function is a motion'`.
  - U2 `wrapLabel`: `('Cauchy-Riemann', 13)` -> `['Cauchy-', 'Riemann']`; `('Cauchy-Riemann', 18)` -> `['Cauchy-Riemann']`; `('One Point, Two Addresses', 18)` -> `['One Point, Two', 'Addresses']`; `('Slide, Spin, Stretch, Mirror', 13)` -> `['Slide, Spin,', 'Stretch,', 'Mirror']`; `('The Derivative Is a Move', 13)` -> `['The', 'Derivative Is', 'a Move']`; `('', 10)` -> `[]`; `('aaa bbb ccc ddd eee', 3, 2)` -> `['aaa', 'bb…']`.
  - U3 `threadStops(STATIONS, t)`: T1 = `home, addresses, arithmetic, distance, powers, roots, sets, mappings, linear, powermap, reciprocal, derivative, cauchy-riemann, lab, problems` (15); T2 = `home, addresses, staircase, powers, roots, powermap, principal-root, branches, lab, graph4d, problems` (11); T3 = `home, curves, sets, mappings, linear, powermap, reciprocal, limits, derivative, cauchy-riemann, lab, graph4d, problems` (13).
  - U4 `layoutMap(STATIONS, 1000)`: `mode 'wide'`, `height 476`, `rows 3`, `colW 136`; node x for orders 0, 6, 7, 13, 14, 20 = `92, 908, 908, 92, 92, 908`; y for rows = `64, 220, 376`; `nodes.length 21`; `parts` texts = `I · The point (Ch 1)`, `II · Curves and sets (Ch 1)`, `III · Motions (Ch 2)`, `III · Motions (Ch 2) cont.`, `IV · Zoom (Ch 3)`, `V · The diary and the index`, anchors `start, end, end, start, start, start`;
    exactly 3 threads, `dash` only for T2, stops 15 / 11 / 13, `first 0`, `last 20` for all; the T2 path equals `M92 64L228 64L364 64L500 64L636 64L772 64L908 64L927 64A60 78 0 0 1 927 220L908 220L772 220L636 220L500 220L364 220L228 220L92 220L73 220A60 78 0 0 0 73 376L92 376L228 376L364 376L500 376L636 376L772 376L908 376`; T1 starts `M92 55` and T3 starts `M92 73`;
    the arithmetic node has `label.lines = ['Slide, Spin,', 'Stretch, Mirror']` and 4 dots at x `349, 359, 369, 379`, y 148; the branches node (a turn node) has `['Branches and', 'Cuts']`.
    `layoutMap(STATIONS, 760)`: `colW 101.714...`, `x0 74.857...`; `layoutMap(STATIONS, 759)`: `mode 'narrow'`.
  - U5 `layoutMap(STATIONS, 358)`: `mode 'narrow'`, `height 1178`, every node `x 32`, y for orders 0, 7, 14, 20 = `62, 428, 794, 1142`, parts at `y 28, 394, 520, 886, 1012` x 78, T1 path starts `M23 62` and ends `L23 1142`, T3 `M41 62`, T2 `M32 62`; the arithmetic node label is one line `['Slide, Spin, Stretch, Mirror']`; `layoutMap(STATIONS, 288)` has the same height 1178.
  - U6 no-collision sweep (the algorithm is `validateWide` in Appendix A.5; it passes for every `W = 760, 764, ..., 1160`): build one box per label (width = longest line x 7.0 px, centred or anchored by `label.anchor`, from `y - 11` to `y + 14.5 (lines - 1) + 4`), per order number (16 x 13 px), per part caption (characters x 7.0 px, extending from `x` in the direction of `anchor`, `y - 11` to `y + 3`) and per dots row; assert no two boxes overlap, no box leaves `[0, W]`, and no point sampled every `pi/40` along any U-turn ellipse (centre `(sx, (sy + ey)/2)`, radii `rx`, `ry`, on the side the sweep flag gives) falls inside a box padded by 2 px or outside `[0, W]`.
  - U7 `normalizeQuery`: `'1.4.2'` -> `'1.4.2'`; `'  Problem 1.4.2 '`, `'#problem-1-4-2'`, `'1 4 2'`, `'1,4,2'`, `'1-4-2'` -> `'1.4.2'`; `'problem-P3'`, `'Problem P3'`, `'prob p3'`, `'P3'`, `'p 3'`, `'p.3'` -> `'p3'`; `'1.4.'` and `'1-4-'` -> `'1.4.'`; `'T1.4'`, `'t 1 4'` -> `'t1.4'`; `'CIRCLE'` -> `'circle'`; `'z^2'` -> `'z 2'`; `'1/z'` -> `'1/z'`; `'x = 2'` -> `'x = 2'`; `'cr'`, `'CR'` -> `'cauchy riemann'`; `''`, `null`, `undefined` -> `''`; `'1..4'` -> `'1.4'`; `'−16'` -> `'-16'`.
  - U8 `searchItems(q, buildSearchItems())` (kind:id order of `results`, `total`):
    `'1.4.2'` -> `problem:1.4.2` score 1000, total 1; `'1.4'` and `'1.4.'` -> `1.4.1, 1.4.2, 1.4.3` (800 each), total 3; `'1'` -> total 11, first `1.1.1`; `'p3'` -> `P3` (1000), total 1; `'p'` -> `P1..P7`, total 7; `'t1.4'` -> `topic:T1.4` (1000); `'t'` -> total 12;
    `'roots'` -> `station:roots` (100), `station:principal-root` (45), `topic:T1.4` (45), `problem:1.4.1`, `1.4.2`, `1.4.3`, `2.2.2` (35 each), `1.3.2` (17), total 8; `'circle'` -> first `station:distance` (45) then `1.2.1`, `1.2.2` (35), total 15;
    `'branch'` -> `station:branches` (55), `topic:T2.4` (45), `problem:2.4.1` (35), `problem:2.2.2` (20), total 4; `'cr'` -> `station:cauchy-riemann` (110), `topic:T3.2` (90), `problem:3.2.1`, `problem:P7` (70 each), `problem:P6` (20), total 5;
    `'derivative'` -> `station:derivative` (100) first, total 8; `'unity'` -> `problem:1.4.1` (20), `topic:T1.4` (13), total 2; `'principal root'` -> `station:principal-root` (110), `problem:2.2.2` (70), `topic:T2.2` (58), total 3; `'lab'` -> `station:lab` (100), total 1;
    `'zzzz'`, `''`, `'9.9.9'`, `'p9'` -> total 0, `results: []`; `'problem-1-4-2'` equals `'1.4.2'` results; `limit` is honoured (`'roots'` with `limit: 3` has 3 results and total 8).
  - U9 route fields: every problem result `route === routeFor(id)` (`'problem-1-4-2'`), every station result `route === id`, every topic result `route === topicRoute(id)` (`'topic-T1-4'`).
  - U10 `stationNeighbours(STATIONS, 'home')` -> `{ prev: null, next: 'addresses', thread: { T1: { prev: null, next: 'addresses' }, T2: { prev: null, next: 'addresses' }, T3: { prev: null, next: 'curves' } } }`; for `'problems'` -> `{ prev: 'graph4d', next: null, thread: { T1: { prev: 'lab', next: null }, T2: { prev: 'graph4d', next: null }, T3: { prev: 'graph4d', next: null } } }`; for `'roots'` -> `{ prev: 'powers', next: 'curves', thread: { T2: { prev: 'powers', next: 'powermap' }, T1: { prev: 'powers', next: 'sets' } } }`; unknown id -> `{ prev: null, next: null, thread: {} }`.
  - U11 `PART_LABELS`: each starts with the matching `PART_TITLES[part].title` from `js/app.js` (drift guard).
- Interaction script steps (route `home`; the script first installs the stub, below):
  1. Stub: `await page.route('**/js/stations/*.js', (route) => /\/(home|problems)\.js(\?|$)/.test(route.request().url()) ? route.fallback() : route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export function mount(el){ el.textContent = "stub"; return function(){}; }' }))`. Then `page.reload()` and wait for `#home-map a.map-station`.
  2. `ids = page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id))`. Assert `#home-map a.map-station` count is 21; the set of `data-station` equals `ids`; every anchor `getAttribute('href') === '#' + data-station`; the anchors are in registry order.
  3. Assert `#home-map path.thread-line` count is 3 and `data-thread` values are `T1, T2, T3`; the T2 path's `getAttribute('stroke-dasharray')` is non-empty and not `none` (and its computed `stroke-dasharray` is not `none`); the T1 and T3 paths have no `stroke-dasharray` attribute; every path has a non-empty `d` starting `M`.
  4. Assert stops: `#home-map circle.stop[data-thread="T1"]` count 15, `T2` 11, `T3` 13; `#home-map circle.pdot` count 29; `window.__mv.home.layout()` equals `'wide'` when `#home-map-host` is at least 760 px wide, else `'narrow'`.
  5. `page.fill('#home-finder', '1.4.2')`; assert `#home-finder-results a[href="#problem-1-4-2"]` count is exactly 1, its text includes `roots`, `#home-finder-status` text is `1 match`, `window.__mv.home.search('1.4.2')` deep-equals `['1.4.2']`.
  6. Click that link; assert `location.hash === '#problem-1-4-2'` (the stub station is mounted; `#view[data-station]` is `roots`). `page.goBack()`; wait for the home map again (a fresh mount: 21 anchors).
  7. `page.fill('#home-finder', 'p3')`, `page.keyboard.press('Enter')`; assert `location.hash === '#problem-P3'`; go back. `page.fill('#home-finder', 'zzzz')`: results empty and a `.finder-empty` with text containing `Nothing matches`; clear with `Escape`: input value `''`, hint visible.
  8. Legend: click `#home-thread-T2`; assert `#home-map[data-focus="T2"]`, `#home-thread-T2[aria-pressed="true"]`, `.map-station.is-dim` count is 10 (the stations not on T2), `path.thread-line.is-dim` count 2; click again: `data-focus` absent, no `is-dim`.
  9. Station click: click `a.map-station[data-station="roots"]`; assert `location.hash === '#roots'`; go back.
  10. Progress dots: `page.evaluate(() => localStorage.setItem('mv:progress', JSON.stringify({ '1.1.1': true, 'P3': true, 'T1.4': true, 'bogus': true })))`; reload; assert `circle.pdot.is-done` count is 2 (`1.1.1`, `P3`), `#home-progress` text includes `2 of 29`.
  11. Relayout (desktop only, `ctx.viewport.width >= 1000`): `page.setViewportSize({ width: 700, height: 860 })`; wait two frames; assert `window.__mv.home.layout() === 'narrow'` and still 21 anchors and 3 thread paths; restore `1280` and assert `'wide'`.
  12. Preset token: `page.goto(<base>/index.html#home-T2)` (use `new URL(page.url()).origin`); assert `#home-map[data-focus="T2"]`.
  13. `ctx.shot('home-final')`.
- Pass: every assertion holds at desktop, phone and dark; the harness reports no console error (the stub avoids 404s from unbuilt stations).

**A3. The home demo shows both addresses of one dragged point.**
- Command: same script (the `home` route).
- Unit tests: U12 `snapToGrid({ re: 2.003, im: 0.998 })` -> `{ re: 2, im: 1 }`; `({ re: -1.02, im: 1.74 })` -> `{ re: -1, im: 1.75 }`; `({ re: -0.01, im: 0.02 })` -> `{ re: 0, im: 0 }` with `Object.is(re, 0)`; `({ re: 1.7320508, im: 0.025 })` -> `{ re: 1.75, im: 0.05 }`; `({ re: 3.49, im: -3.49 })` -> `{ re: 3.5, im: -3.5 }`.
  U13 `homeReadout`: `{ re: 2, im: 1 }` -> `'z = 2 + i; r = 2.236; Arg z = 0.464\narg z = { 0.464 + 2*pi*k : k an integer }'`; `{ re: -1, im: Math.sqrt(3) }` -> `'z = -1 + 1.732i; r = 2; Arg z = 2.094 (2pi/3)\narg z = { 2.094 + 2*pi*k : k an integer }'`; `{ re: -2, im: 0 }` -> `'z = -2; r = 2; Arg z = 3.142 (pi)\narg z = { 3.142 + 2*pi*k : k an integer }'`; `{ re: 1, im: 1 }` -> `'z = 1 + i; r = 1.414; Arg z = 0.785 (pi/4)\narg z = { 0.785 + 2*pi*k : k an integer }'`; `{ re: 0, im: 0 }` -> `'z = 0; r = 0; Arg z is not defined at 0\narg z is not defined at 0'`; `{ re: NaN, im: 1 }` -> `'z is not set'`; none of them contains `NaN`.
  U14 `angleText`: `Math.PI` -> `'3.142 (pi)'`; `0` -> `'0'`; `-Math.PI/3` -> `'-1.047 (-pi/3)'`; `0.4636476` -> `'0.464'`; `2*Math.PI/3` -> `'2.094 (2pi/3)'`.
- Script steps (a second block of the same script, after the A2 block):
  1. `z = await dragHandle(page, 'home-demo-plane-z', { re: 2, im: 1 })`; assert `|z.re - 2| < 1e-9` and `|z.im - 1| < 1e-9`.
  2. `t = await readText(page, '#home-readout')`; assert it includes `2.236`, `0.464`, `r = 2.236`, and `2 + i` (or `2 + 1i`), and does not include `NaN`; its second line includes `arg z = {`.
  3. Explainer: `#home-demo-ex-address-cart[data-tex]` includes `2` and `1`; `#home-demo-ex-address-polar[data-tex]` includes `2.236` and `0.464`; `#home-demo-ex-same[data-agree="true"]`.
  4. Staircase: `#home-demo-stairs-arg` text is `Arg z = 0.464`; `#home-demo-stairs-set` text includes `arg z`; `#home-demo-stairs-k0` has class `is-home`; three `li` rows in `#home-demo-stairs-list`.
  5. Handle label: `readHandleLabel` includes `r = 2.236` (the plane's own both-address label).
  6. Click `#home-demo-preset-neg2`: readout includes `Arg z = 3.142 (pi)`, `#home-demo-preset-neg2[aria-pressed="true"]`; click `#home-demo-preset-m1-sqrt3i`: readout includes `2.094 (2pi/3)` and `-1 + 1.732i`; the staircase row `#home-demo-stairs-k1` text includes `8π/3`.
  7. Keyboard (the preset `-1 + i√3` is active and exact): `page.focus('#home-demo-plane-z')`, press `ArrowRight`; the plane adds 0.1 and then the 0.05 snap applies to both parts, so `handleZ` is `{ re: -0.9, im: 1.75 }` and the readout is `z = -0.9 + 1.75i; r = 1.968; Arg z = 2.046` (first line); press `ArrowUp`: `handleZ` is `{ re: -0.9, im: 1.85 }` and the first line is `z = -0.9 + 1.85i; r = 2.057; Arg z = 2.024`.
  8. Origin: `dragHandle(page, 'home-demo-plane-z', { re: 0, im: 0 })`; readout includes `not defined at 0` and not `NaN`; `#home-demo-stairs-arg` text is `Arg z: no angle at 0`; `#home-demo-ex-same` exists; then click the first preset to restore.
  9. Phone: the same calls work (the plane is 358 px square; the handle is clear of the zoom buttons for these targets).
- Pass: all assertions hold at desktop, phone and dark, with no console error.

**A4. Every problem is a card with a hidden answer; filters and ticks work and persist.**
- Command: `node tools/smoke.mjs --route problems --script tests/interact/i1-station-home-problems.mjs --dark`
- Unit tests: U15 `filterCounts()` -> `{ all: 29, '1': 11, '2': 8, '3': 3, P: 7 }`; `filterMatches` for (`3.1.1`, `'3'`) true, (`P6`, `'3'`) false, (`P6`, `'P'`) true, (`1.4.2`, `'1'`) true, any problem with `'all'` true.
  U16 `parseProblemsToken`: `'3'` -> `{ chapter: '3', todo: false }`; `'p'` and `'P'` -> `{ chapter: 'P', todo: false }`; `'todo'` -> `{ chapter: 'all', todo: true }`; `'all'`, `'zzz'`, `undefined` -> `{ chapter: 'all', todo: false }`.
  U17 `sanitizeProgress`: `{ '1.1.1': true, zzz: true, 'T1.4': true, '1.4.2': false, P3: 1 }` -> `{ '1.1.1': true, 'T1.4': true }`; `['1.1.1', 'P3', 'x']` -> `{ '1.1.1': true, P3: true }`; `null`, `'abc'`, `42` -> `{}`. `countTicked({ '1.1.1': true, 'T1.4': true })` -> 1; `countTicked({})` and `countTicked(null)` -> 0. `setTicked({ '1.1.1': true }, 'P3', true)` -> `{ '1.1.1': true, P3: true }`; `setTicked({ '1.1.1': true }, '1.1.1', false)` -> `{}`; `setTicked({}, 'nope', true)` -> `{}`.
  U18 `idKey('1.4.2')` -> `'1-4-2'`; `idKey('P3')` -> `'P3'`; `idKey('T1.4')` -> `'T1-4'`.
  U19 `addressBalance()` -> `{ cart: 10, polar: 12, both: 7 }`, summing to 29.
- Script steps (route `problems`, stubs installed as in A2, then reload):
  1. Counts: `.problem-card` is 29, `.topic-card` is 12; each card has exactly 1 `input[type=checkbox]` and exactly 1 `a[href="#problem-{id}"]` (id with dashes); `#problems-deck .problem-card` ids are in handout order (`1.1.1` first, `P7` last); `window.__mv.problems.visible().length` is 29.
  2. Card `1.4.2`: `#problems-answer-1-4-2` has `hidden` and `offsetParent === null`; `#problems-reveal-1-4-2[aria-expanded="false"]`.
  3. Click `#problems-reveal-1-4-2`: the answer's `offsetParent !== null`, `aria-expanded="true"`, the button text is `Hide the answer`; its text includes `2`, (`π` or `pi`) and (`√2` or `sqrt`); it contains `.pc-route[data-route="cart"]` and `.pc-route[data-route="polar"]`. The `easy here` badge: address `P->C` has two tones, so card `1.4.2` has **no** `.badge` inside its routes; reveal `1.4.3` (address `C`): exactly one badge, inside its `cart` route; reveal `2.2.1` (address `P`): exactly one badge, inside its `polar` route.
  4. The card's station link: `#problems-card-1-4-2 a[href="#problem-1-4-2"]` text includes `roots` (and there is exactly one); card `1.4.2` has no `.pc-also` element; card `1.3.1` has a `.pc-also` element with an `a[href="#staircase"]`.
  5. Click again: the answer is hidden. Reveal `1.5.2` and `1.4.2` at the current viewport and assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (no page overflow; a formula box may scroll). For `1.4.2` on a phone, `.pc-scroll-hint` is visible.
  6. Filters: click `#problems-filter-3`: visible `.problem-card` count (those with `offsetParent !== null`) is 3 with `data-problem` in `3.1.1, 3.1.2, 3.2.1`; only `#problems-group-3` is visible; `#problems-count` text is `Showing 3 of 29: Chapter 3.`; `#problems-filter-3[aria-pressed="true"]` and `#problems-filter-all[aria-pressed="false"]`. Then `-P` gives 7 (`P1..P7`), `-1` gives 11, `-2` gives 8, `-all` gives 29.
  7. Ticks: click `#problems-filter-all`, then `check` `#problems-tick-1-1-1`; assert checked, `#problems-progress` text is `1 of 29 ticked`, `JSON.parse(localStorage.getItem('mv:progress'))` equals `{ "1.1.1": true }`. `page.reload()`, wait 800 ms; `#problems-tick-1-1-1` is still checked and `#problems-progress` still says `1 of 29 ticked`.
  8. Todo: click `#problems-filter-todo`: visible count 28 and `#problems-card-1-1-1` hidden; the chip label is `Not ticked yet (28)`; click it again: 29. With the todo filter on, ticking `#problems-tick-1-1-2` does not hide the card at once (still visible) and the chip label becomes `Not ticked yet (27)`.
  9. Predict: check `#problems-predict`: `#problems-card-1-4-2 .pc-hint` has `offsetParent === null` and `.pc-predict-note` is visible; reveal the card: `.pc-hint` visible; uncheck predict: the hints are visible on a closed card again. Then check predict and `page.reload()`: it is still checked and `localStorage.getItem('mv:problems.predict')` is `'true'`; uncheck it (the value becomes `'false'`).
  10. Hide all: reveal two cards; `#problems-hide-all` is enabled; click it: both answers hidden and the button is disabled.
  11. Clear: click `#problems-clear` once: label `Click again to clear all ticks`; wait 4.2 s: the label reverts (no clear); click twice quickly: `#problems-progress` is `0 of 29 ticked`, `localStorage.getItem('mv:progress')` is `null`, no checkbox is checked.
  12. Preset token: `location.hash = '#problems-3'`, wait; visible count 3 and `#problems-filter-3[aria-pressed="true"]`; then `location.hash = '#problems-P'` shows 7 cards; then `'#problems-todo'` leaves the todo chip pressed (`#problems-filter-todo[aria-pressed="true"]`) with the All chip pressed.
  13. Statements: card `1.5.2` has at least one `.katex` in `.pc-statement` and the statement text contains `bounded` and no `$`; card `1.1.1` has exactly 5 `.katex` elements in `.pc-statement` (its statement has five maths parts); topics: `#problems-topic-T1-4 a[href="#powers"]` and `a[href="#roots"]` exist, `a[href="#problem-1-4-2"]` exists inside the topic card, `a[href="#topic-T1-4"]` text includes `powers`; `#problems-topic-tick-T1-4` toggles and persists (`mv:progress` includes `"T1.4": true`) without changing the problem count.
  14. Balance: `#problems-balance .pb-cell` count 29 and the counts of `[data-kind="cart"]`, `polar`, `both` are 10, 12, 7; `#problems-balance` `aria-label` includes `10 easiest in Cartesian`.
  15. `ctx.shot('problems-final')` with two answers open.
- Pass: all hold at desktop, phone and dark with no console error and no page overflow.

**A5. Cards and map come from the data modules.**
- Method: code inspection plus U20, a unit test that reads the two source files as text:
  - `js/stations/problems.js` contains the import path `'../data/problems.js'` and uses `addressLabel`, `addressTones`, `statementParts`, `routeFor`; `js/stations/home.js` contains `'../registry.js'` and `'../data/problems.js'` and uses `THREADS`, `STATIONS`, `PROBLEMS`.
  - For every problem, none of `p.statement`, `p.answer.tex`, `p.answer.text`, `p.aha`, `p.addressWhy`, `p.routes.cart`, `p.routes.polar` occurs as a substring of either source file; for every station none of `s.summary`, and none of `s.title` when it is at least 14 characters long, occurs in `home.js` or `problems.js` (the copy in section 2.5 deliberately avoids them: the buttons, plan and links are built from `stationById(...).title`). Before searching, drop comment lines (lines whose first non-space characters are `//`, `/*` or `*`) so a comment cannot fail the test.
  - Neither file contains `alert(`, `confirm(`, `prompt(`, `window.open`, `innerHTML` (all text goes through `textContent`, `prose`, `tex`, `createTextNode`; if the builder needs `innerHTML` for the static spine it must pass every string through `proseToHtml` or `escapeHtml`, and U20 then asserts the file contains no `innerHTML` outside lines that mention `proseToHtml` or `escapeHtml`).
  - Neither file contains an absolute URL (`/https?:\/\//`) other than the SVG namespace string `http://www.w3.org/2000/svg`.
- U21 math cross-check (the independent recomputation of section 6.3): from `complex.js` compute and compare with `problemById(id).answer.values` to 1e-9 (1e-6 for 1.3.2): `mul(3-2i, -1+4i)` = `(5, 14)`; `div(...)` = `(-11/17, -10/17)`; `abs(product)` = `sqrt(221)`; `Arg(product) = Arg z1 + Arg z2` (1.227772...); `im(conj(sub(z1, z2)))` = 6; `abs(sub(4+3i, -1+i))` = `sqrt(29)`; `Arg(-1 + i sqrt(3))` = `2pi/3` and `abs` = 2; `pow(sqrt(3)+i, 10)` = `(512, -512 sqrt(3))`, `Arg` = `-pi/3`; `rootsOfUnity(5)` each `z^5 = 1` and primitive flags `[false, true, true, true, true]`; `rootsOf(-16, 4)` each `z^4 = -16` and equal to `(+-sqrt(2), +-sqrt(2))`; `quadraticRoots(1, -4, 13)` = `(2, 3), (2, -3)`; `add((2,1), scale((-5,-4), 0.5))` = `(-0.5, -1)`; the 2.1.1 check `z^2 + iz` at `1 + i` = `(-1, 3)`; `pow((2,1), 2)` = `(3, 4)`; `i*(2 + 3i) - 2i` = `(-3, 0)`; `principalRoot(2i, 2)` = `(1, 1)` and the other root `(-1, -1)`; 2.3.1 along `y = x^2` at `x = 0.001` is within `3e-3` of 1 (the value is `0.999998 + 0.002i`); `branchRoot(-1, 3, 0)` = `(0.5, sqrt(3)/2)`; `inv((1, 1))` = `(0.5, -0.5)`; `localLinear(z^2 + z, 1 + i).A` = `(3, 2)` with `|B| < 1e-6`; `localLinear(|z|^2, 1 + i)` = `A (1, -1)`, `B (1, 1)` (1e-8); `exp((0, pi/2))` = `(0, 1)`; P1 both sides `(5, -14)`; P2 `z conj z = 13`; P3 check `(-1, -1.4)` on both forms; P4 `abs((1+i) e^{it}) = sqrt(2)`; P5 and P6 `localLinear(Re z, z0)` = `A = B = 0.5`.

### 7.3 Other checks before handing over

- `npm test` passes with the new file (all earlier tests unchanged; the previous total was 287 and the new file adds about 21 tests).
- `node tools/smoke.mjs --route home,problems --dark --script tests/interact/i1-station-home-problems.mjs` passes (the script runs the home block on `home` and the problems block on `problems`).
- Re-run `node tools/smoke.mjs --route home --script tests/interact/i1-core-math.mjs --no-shots` and `... i1-core-three.mjs` (they were waiting for `home.js`; they must end `2/2`).
- Accessibility spot check with the keyboard only: reach every control on both routes, operate the demo handle with arrows, run the finder with Enter, operate a card (tick, reveal, hide).
- Contrast: confirm in a dark screenshot that the T2 hollow stops, the dashed strand and the `--ok` filled dots read.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

- **z = 0 in the demo** (a drag to the origin snaps to 0): readout, explainer and staircase use their undefined text (5.7, 5.9); `drawPolarAddress` draws nothing for a ray under 6 px; the seam and drop lines still draw.
- **z on the seam** (`-2`): `Arg z = pi` (not `-pi`); the set line shows `π + 2πk`; the helper labels the arc `Arg z = π`; the dashed seam runs under the dot.
- **z at the plane edge**: the plane clamps a drag to a 10 px inset; the grid range is [-3.5, 3.5], so the arc labels have room; the zoom buttons sit top right and the initial dot is far from them.
- **A drag beyond the plane or a keyboard walk off it**: the plane clamps; the snap keeps values on the 0.05 grid; `homeReadout` never prints more than three decimals.
- **Map width**: below 280 px the layout uses 280 (the svg clips, the page does not overflow); a width of 0 (hidden or not laid out) uses 360; fractional widths round; the observer ignores a change under one pixel.
- **Browser zoom or a small laptop**: the layout switches at 760 px of host width, so zooming in moves a wide map to the narrow one with no code path of its own.
- **User text size**: SVG text is in pixels, so a larger browser font size does not grow it (page zoom does); the narrow label has `textLength` as a guard, the wide layout is validated for a 6 percent wider font.
- **Finder**: leading and trailing spaces, upper case, a pasted `#problem-1-4-2`, `1-4-2`, `1 4 2`, `p3`, `P 3`, Unicode minus; a query that is only punctuation (`=`) has no tokens and returns nothing; very long input is cut to 80 characters before searching; a query matching 200 items still renders at most 8 rows.
- **Finder result rendering** never sets `innerHTML`; the query appears in the no-match sentence through a text node.
- **Storage**: `ctx.store` already tolerates blocked storage; ticks then last for the page's life; `progress` with unknown ids, `false` values or a non-object is sanitised; a tick of an id that is not a problem or topic is ignored.
- **Concurrent route changes**: `unmount` runs before the next mount; the pending relayout rAF is cancelled; `window.__mv.home` is deleted only if still this mount's.
- **Router quirk**: a link to the route already showing fires no `hashchange`; the map's own anchor for `home` is `aria-current="page"` and harmless.
- **`#problems` without KaTeX** (blocked script): statements and answers show their TeX source in the `tex-error` style; the plain-text answer remains.
- **A statement with no maths** or a statement that starts with maths: `statementParts` handles both (alternating parts, empty parts dropped).
- **Duplicate anchors**: topic cards also link `#problem-<id>` (so the page has two anchors with that href: the card's and the topic's); every script scopes to `#problems-card-<k>`.
- **A revealed answer then a filter change**: the answer stays open (state lives on the card); `Hide all answers` uses the open set, not the visible set.
- **Predict on, then reveal, then predict off**: `data-revealed` is independent of the predict flag; the hint shows when either is true.

### 8.2 Performance plan

- Drag path (60 fps target): `onDrag` does one `homeReadout` string, one `staircase.update` (3 rows), one `explainer.update` (coalesced to one render per frame by the widget), one `plane.requestDraw()`. No layout reads inside the handler.
- Mount budgets at desktop with an empty cache (measure with `performance.now()`; `window.__mv.problems.mountMs` and a console-free check in the script): home <= 150 ms, problems <= 250 ms. At 4x CPU throttle problems may take about 1 s; if `mountMs` exceeds 300 ms unthrottled, render the statements of cards beyond the first 8 in rAF chunks of 4 cards (the cards and their ids exist immediately, so counts and filters are unaffected). This fallback is allowed but not built unless the budget is missed.
- KaTeX work: the answer and routes are built on first reveal only; finder results re-render at most 8 rows per keystroke (KaTeX caches by string, 300 entries); the explainer has two rows.
- Map: about 21 anchors with about 10 elements each; a rebuild is cheap and happens only when the width changes by at least a pixel.
- No timers except the 4-second arm of `Clear all ticks`; no polling; no rAF loop.

### 8.3 Accessibility

- Landmarks and headings: one `h1` per route (inside `.station-header`), `h2` per panel, `h3` per spine idea, card title and topic title.
- The map is a `role="group"` svg with an accessible name; every station is a real link with an `aria-label` that includes its place number, its problems and how many are ticked, and its threads. Colour is never the only cue: T2 is dashed and its stops are hollow rings, ticked dots are filled and unticked are hollow, the current place has a heavier outline.
- Legend buttons use `aria-pressed`; the thread note is a status region. Filter chips use `aria-pressed`; the predict control is a labelled checkbox; progress is a labelled `progress` element and a status text.
- Cards are `article`s labelled by their title; the reveal button has `aria-expanded` and `aria-controls`; ticks have visible labels with an sr-only problem id; a scrollable formula is a focusable `group` with a name.
- Focus is visible everywhere (global `:focus-visible`; the map draws a ring on the hit rectangle). The router moves focus to `#view` on navigation; the stations never move it.
- The demo handle announces both addresses through the plane's own live region; the readout is plain text and is not a live region (it would announce on every pixel of a drag).
- Target sizes: chips and buttons are 44 px; map cells are at least 44 px high; finder rows are at least 44 px; the demo handle's hit area is 34 px (the plane's rule).

### 8.4 Reduced motion

Neither route contains an animation, autoplay or timer-driven motion. The staircase widget's seam pulse and the shell's transitions are already cut by the widget and by the global `prefers-reduced-motion` rule. Nothing needs a stepper.

### 8.5 Phone layout (390 px)

- Everything is one column; the hero row (`.two-planes`) collapses below about 760 px of container width, and the working and spine panels are full width at every size (the spine's four ideas stack).
- The plane is the content width (358 px) and square; the three presets wrap; the readout wraps (`overflow-wrap: anywhere`, `pre-wrap`).
- The explainer stacks (Cartesian above polar) by its own rule; the staircase is 3 rows.
- Finder rows use a 3.5 rem id column; the station id drops to a second line.
- The map is the narrow layout (21 rows of 48 px plus 5 part captions, 1178 px tall), labels on one line, dots under each label; the legend chips wrap one per line if needed.
- Problem cards are one per row; formulas scroll inside their box; the two routes stack; filter chips wrap; the predict checkbox label wraps.
- No horizontal page scroll at 390 px (the harness fails on any); the widest items (the 1.5.2 statement, the 1.4.2 answer) are checked in the script.

---

## 9. Out of scope

- Videos, narration, the Listen control and anything under the media track (the stations do not read `media/manifest.js`).
- Auto-driven walkthroughs and a "say it out loud" timed quiz (held for a later iteration in STORY section 7).
- Searching inside answers or routes (the finder searches statements, section names, ahas, address reasons, station and topic titles and summaries).
- A Lab hand-off button (neither route has an image problem); the plan links to Lab presets by route token only.
- Spaced repetition, streaks, time tracking, export or sharing of progress; progress is one local object of ticks.
- Editing the registry, the data, `css/components.css`, `index.html`, `js/app.js` or any core module.
- Showing `alsoAt` problems as dots on the map (a dot belongs to the station that owns the problem).
- A cheat-sheet export, printing, or any download (CONSTRAINTS forbids them).

---

## 10. Requests for other owners, risks

### 10.1 Requests for other owners (nothing in this goal blocks on them)

1. **docs/ARCHITECTURE.md section 9 (planner or integrator):** record the store keys (`progress` = `{ [id]: true }` for problems and topics, `problems.predict` boolean persisted, `problems.filter` memory only), the route tokens (`#problems-1|2|3|P|todo|all`, `#home-T1|T2|T3`), and the hooks `window.__mv.home` and `window.__mv.problems`; and the readout format `z = <cart>; r = <r>; Arg z = <theta> (<exact>)` for home.
2. **js/registry.js (planner):** an optional `PARTS` export (`{ I: { title, chapterNote }, ... }`) so that `app.js` (`PART_TITLES`) and `home.js` (`PART_LABELS`) stop duplicating the five part names; until then a unit test (U11) guards against drift.
3. **docs/STORY.md section 2 (unifier):** the thread lines in STORY are shorter than the registry's `threads`; make the two agree (the registry wins in this design: T1 15, T2 11, T3 13 stops).
4. **js/data/problems.js (i1-data owner):** residue entry 39 (angle copy in `routes.*` without `arg` / `Arg`) affects what the cards say; it is a copy edit and does not block this goal.
5. **tools/smoke.mjs:** none needed.

### 10.2 Risks and how the design contains them

| Risk | Containment |
|---|---|
| Acceptance wording is literal: "a link href `#problem-1-4-2` whose text includes `roots`" | Exactly one such anchor per card and per finder result; its text always contains the lower-case station id; the finder row ends with the station id and a card's place chip is the station id. |
| "exactly 3 visible cards" under Chapter 3 could be counted with `.card` rather than `.problem-card` | Topic cards are `.panel.topic-card`, not `.card`, so both counts are 3. Ticking under the todo filter never hides a card until the next filter change. |
| A verifier that ticks card 1.1.1 while Chapter 3 is filtered cannot click a hidden checkbox | The script clicks `#problems-filter-all` first; the filter is memory only, so a reload resets it (the acceptance's reload step starts from All). |
| Pixel-rounded drags make `2.003 + 0.998i` | The demo handle snaps to a 0.05 grid; presets are exact. |
| SVG text width is an estimate (no font measurement) | `CHAR_W 6.6` for layout, a 6 percent wider check in U6, turn-node labels capped, narrow labels guarded by `textLength`; screenshots at 760, 1000 and 1104 px reviewed. |
| `a.map-station` focus in SVG differs by browser | `role="link"` and `tabindex="0"` are set; focus is drawn on the hit rectangle; the narrow rows are 48 px tall. |
| Other wave-1 stations do not exist yet | The script stubs them; the integrator's full smoke covers the real ones. |
| Cold KaTeX on the index | Lazy answers, a measured budget, and a chunked-render fallback (8.2). |
| ResizeObserver loop warnings (residue 66) | The callback only schedules one rAF; the relayout returns early when the width is unchanged. |
| The home plane is busy (both grids, drop lines, ray, three arcs, seam) | Grids are drawn at low alpha by the plane; ghosts limited to one each way; the label placer avoids collisions; if a phone screenshot is unreadable the single change is `grid: 'cart'` (one option). |
| Duplicate `PART_LABELS` | U11 asserts each starts with the `app.js` title. |

---

## Appendix A. Reference algorithms (prototyped and checked on 2026-10-15)

These are the pure helpers of sections 4 and 5 as the designer ran them against the real `js/registry.js` and `js/data/problems.js`. A scratch test file asserted every
expectation of U1 to U19 and U6 against exactly this code and all passed (16 tests, 0 failures). The builder may restructure the code, but each function must return the
same values (the unit tests pin them). Imports shown are the ones the helpers need; the DOM code (sections 5.3 to 5.11) is not in this appendix.

Where each helper lives: `shortTitle`, `shortThreadTitle`, `idKey`, `sanitizeProgress`, `countTicked`, `setTicked`, `filterMatches`, `filterCounts`, `parseProblemsToken`,
`addressBalance`, `stationNeighbours` go in `js/stations/problems.js`; `wrapLabel`, `snapToGrid`, `angleText`, `homeReadout`, `threadStops`, `WIDE_MIN`, `PART_LABELS`, `GEOM`,
`layoutMap`, `normalizeQuery`, `buildSearchItems`, `searchItems` go in `js/stations/home.js`. A.1 below holds both groups (it is one scratch file); split them as listed.

### A.1 Shared and progress helpers

```js
import { STATIONS, THREADS, stationById } from '../registry.js';
import { PROBLEMS, TOPICS, problemById, topicById, routeFor, topicRoute, statementParts, addressTones } from '../data/problems.js';
import { fmtCart, fmtNum, fmtAngle, Arg, abs } from '../core/complex.js';

// ---------- shared
export const idKey = (id) => String(id).replace(/\./g, '-');
export const shortTitle = (t) => { const s = String(t ?? ''); const i = s.indexOf(':'); return (i > 0 ? s.slice(0, i) : s).trim(); };
export function shortThreadTitle(t) { return String(t).split(/[:;]/)[0].trim(); }
export function wrapLabel(text, maxChars, maxLines = 3) {
  const pieces = [];
  for (const w of String(text ?? '').trim().split(/\s+/).filter(Boolean)) {
    (w.match(/[^-]+-|[^-]+$|-/g) || [w]).forEach((t, i) => pieces.push({ t, join: i > 0 }));
  }
  const lines = []; let cur = '';
  for (const p of pieces) {
    const cand = cur === '' ? p.t : cur + (p.join ? '' : ' ') + p.t;
    if (cand.length <= maxChars || cur === '') cur = cand; else { lines.push(cur); cur = p.t; }
  }
  if (cur !== '') lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = keep[maxLines - 1].slice(0, Math.max(1, maxChars - 1)).replace(/[\s-]+$/, '') + '…';
    return keep;
  }
  return lines;
}
// ---------- progress / filters
export function sanitizeProgress(raw) {
  const out = {};
  const put = (k) => { if (typeof k === 'string' && (problemById(k) || topicById(k))) out[k] = true; };
  if (Array.isArray(raw)) raw.forEach(put);
  else if (raw && typeof raw === 'object') for (const k of Object.keys(raw)) if (raw[k] === true) put(k);
  return out;
}
export const countTicked = (progress, problems = PROBLEMS) => problems.filter((p) => progress && progress[p.id] === true).length;
export function setTicked(progress, id, on) { const o = { ...sanitizeProgress(progress) }; if (!(problemById(id) || topicById(id))) return o; if (on) o[id] = true; else delete o[id]; return o; }
export function filterMatches(p, key) { return key === 'all' ? true : key === 'P' ? (p.chapter === 0 || p.kind === 'proof') : String(p.chapter) === key; }
export function filterCounts(problems = PROBLEMS) { const c = { all: problems.length, '1': 0, '2': 0, '3': 0, P: 0 }; for (const p of problems) for (const k of ['1', '2', '3', 'P']) if (filterMatches(p, k)) c[k]++; return c; }
export function parseProblemsToken(token) {
  const t = String(token ?? '').toLowerCase(); const r = { chapter: 'all', todo: false };
  if (t === '1' || t === '2' || t === '3') r.chapter = t; else if (t === 'p') r.chapter = 'P'; else if (t === 'todo') r.todo = true;
  return r;
}
export function addressBalance(problems = PROBLEMS) {
  const b = { cart: 0, polar: 0, both: 0 };
  for (const p of problems) { const s = new Set(addressTones(p.address)); if (s.size >= 2) b.both++; else if (s.has('--cart')) b.cart++; else if (s.has('--polar')) b.polar++; }
  return b;
}
```

### A.2 Demo helpers, thread stops, neighbours

```js
// ---------- demo
export const snapToGrid = (z, perUnit = 20) => { const f = (v) => { const r = Math.round(v * perUnit) / perUnit; return r === 0 ? 0 : r; }; return { re: f(z.re), im: f(z.im) }; };
export function angleText(theta) { const d = fmtNum(theta); const a = fmtAngle(theta); return a !== d ? `${d} (${a})` : d; }
export function homeReadout(z) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return 'z is not set';
  const r = abs(z);
  if (r < 1e-9) return 'z = 0; r = 0; Arg z is not defined at 0\narg z is not defined at 0';
  const th = Arg(z);
  return `z = ${fmtCart(z)}; r = ${fmtNum(r)}; Arg z = ${angleText(th)}\narg z = { ${fmtNum(th)} + 2*pi*k : k an integer }`;
}
// ---------- neighbours
export function stationNeighbours(stations, id) {
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null, thread: {} };
  const out = { prev: i > 0 ? list[i - 1].id : null, next: i + 1 < list.length ? list[i + 1].id : null, thread: {} };
  for (const t of list[i].threads) {
    const members = list.filter((s) => s.threads.includes(t));
    const j = members.findIndex((s) => s.id === id);
    out.thread[t] = { prev: j > 0 ? members[j - 1].id : null, next: j + 1 < members.length ? members[j + 1].id : null };
  }
  return out;
}
export function threadStops(stations, threadId) { return stations.slice().sort((a, b) => a.order - b.order).filter((s) => s.threads.includes(threadId)).map((s) => s.id); }
```

### A.3 Map layout

```js
// ---------- map layout
export const WIDE_MIN = 760;
export const PART_LABELS = { I: 'The point (Ch 1)', II: 'Curves and sets (Ch 1)', III: 'Motions (Ch 2)', IV: 'Zoom (Ch 3)', V: 'The diary and the index' };
export const GEOM = Object.freeze({ PADX: 24, COLS: 7, TOP: 64, PITCH: 156, BOTTOM: 100, LANE: 9, PILL_W: 26, PILL_H: 40, CHAR_W: 6.6, N_AXIS: 32, N_PITCH: 48, N_PART_H: 30, N_TOP: 8, N_BOTTOM: 12 });
export function layoutMap(stations = STATIONS, width = 360, threads = THREADS, problems = PROBLEMS) {
  const K = GEOM;
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const W = Math.max(280, Math.round(Number(width) || 360));
  const mode = W >= WIDE_MIN ? 'wide' : 'narrow';
  const laneOf = (k) => ((threads.length - 1) / 2 - k) * K.LANE;
  const owned = (id) => problems.filter((p) => p.station === id).map((p) => p.id);
  const nodes = [], parts = [];
  let height, colW = null, rows;
  if (mode === 'wide') {
    colW = (W - 2 * K.PADX) / K.COLS;
    const maxChars = Math.floor((colW - 12) / K.CHAR_W);
    list.forEach((s, i) => {
      const row = Math.floor(i / K.COLS), c = i % K.COLS, dir = row % 2 === 0 ? 1 : -1, col = dir > 0 ? c : K.COLS - 1 - c;
      const x = K.PADX + colW * (col + 0.5), y = K.TOP + K.PITCH * row;
      const turn = c === K.COLS - 1 && i + 1 < list.length;
      const ids = owned(s.id);
      nodes.push({ id: s.id, order: s.order, part: s.part, row, col, dir, x, y,
        pill: { x: x - K.PILL_W / 2, y: y - K.PILL_H / 2, w: K.PILL_W, h: K.PILL_H },
        num: { x, y: y - 27, anchor: 'middle', text: String(s.order) },
        label: { x, y: y + 36, anchor: 'middle', lines: wrapLabel(shortTitle(s.title), turn ? Math.min(maxChars - 4, 14) : maxChars) },
        dots: ids.map((pid, j) => ({ problem: pid, x: x + (j - (ids.length - 1) / 2) * 10, y: y + 84 })),
        hit: { x: x - colW / 2, y: y - 34, w: colW, h: 126 } });
      const first = i === 0 || list[i - 1].part !== s.part;
      if (first || c === 0) parts.push({ part: s.part, text: `${s.part} · ${PART_LABELS[s.part]}` + (first ? '' : ' cont.'), cont: !first, x: x - dir * 12, y: y - 50, anchor: dir > 0 ? 'start' : 'end', node: s.id });
    });
    rows = Math.ceil(list.length / K.COLS);
    height = K.TOP + K.PITCH * (rows - 1) + K.BOTTOM;
  } else {
    let y = K.N_TOP; rows = list.length;
    list.forEach((s, i) => {
      if (i === 0 || list[i - 1].part !== s.part) { parts.push({ part: s.part, text: `${s.part} · ${PART_LABELS[s.part]}`, cont: false, x: 78, y: y + 20, anchor: 'start', node: s.id }); y += K.N_PART_H; }
      const cy = y + K.N_PITCH / 2, ids = owned(s.id);
      nodes.push({ id: s.id, order: s.order, part: s.part, row: i, col: 0, dir: 1, x: K.N_AXIS, y: cy,
        pill: { x: K.N_AXIS - 16, y: cy - 17, w: 32, h: 34 },
        num: { x: 70, y: cy - 4, anchor: 'end', text: String(s.order) },
        label: { x: 78, y: cy - 4, anchor: 'start', lines: [shortTitle(s.title)] },
        dots: ids.map((pid, j) => ({ problem: pid, x: 82 + j * 10, y: cy + 12 })),
        hit: { x: 0, y: cy - K.N_PITCH / 2, w: W, h: K.N_PITCH } });
      y += K.N_PITCH;
    });
    height = y + K.N_BOTTOM;
  }
  const f = (v) => Number(v.toFixed(2));
  const out = threads.map((t, k) => {
    const s = laneOf(k);
    const members = list.filter((st) => st.threads.includes(t.id));
    if (!members.length) return { id: t.id, d: '', dash: !!t.dash, stops: [], first: null, last: null, lane: s };
    const first = members[0].order, last = members[members.length - 1].order;
    const lanePt = (n) => (mode === 'wide' ? { x: n.x, y: n.y - n.dir * s } : { x: n.x - s, y: n.y });
    const seq = nodes.filter((n) => n.order >= first && n.order <= last);
    let d = '';
    seq.forEach((n, idx) => {
      const p = lanePt(n);
      d += (idx === 0 ? 'M' : 'L') + `${f(p.x)} ${f(p.y)}`;
      const nxt = seq[idx + 1];
      if (mode === 'wide' && nxt && nxt.row !== n.row) {
        const right = n.row % 2 === 0, xT = n.x + n.dir * (K.PILL_W / 2 + 6), sign = right ? 1 : -1;
        const rx = colW / 2 - 8 + sign * s, ry = K.PITCH / 2 + sign * s;
        d += `L${f(xT)} ${f(n.y - n.dir * s)}A${f(rx)} ${f(ry)} 0 0 ${right ? 1 : 0} ${f(xT)} ${f(nxt.y - nxt.dir * s)}`;
      }
    });
    return { id: t.id, d, dash: !!t.dash, first, last, lane: s, stops: members.map((st) => { const p = lanePt(nodes.find((n) => n.id === st.id)); return { station: st.id, x: p.x, y: p.y }; }) };
  });
  return { mode, width: W, height, rows, colW, nodes, parts, threads: out };
}
```

### A.4 The finder (normaliser, index, search)

```js
const ALIASES = { cr: 'cauchy riemann' };
export function normalizeQuery(q) {
  let s = String(q ?? '').toLowerCase();
  s = s.replace(/[−–—]/g, '-');
  s = s.replace(/^\s*#/, '');
  s = s.replace(/^\s*(?:problems?|prob)[\s\-_.:#]*(?=[0-9pt])/, '');
  s = s.replace(/[\\{}^_$]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (/^[0-9][0-9\s,._-]*$/.test(s)) s = s.replace(/[\s,._-]+/g, '.').replace(/^\./, '');
  else if (/^[pt][\s._-]*[0-9][0-9\s,._-]*$/.test(s)) s = s[0] + s.slice(1).replace(/[\s,_-]+/g, '.').replace(/^\.+/, '');
  if (Object.prototype.hasOwnProperty.call(ALIASES, s)) s = ALIASES[s];
  return s;
}
const ID_Q = /^(?:\d+(?:\.\d+){0,2}\.?|p\d*|t\d*(?:\.\d*)?)$/;
const plain = (st) => statementParts(st).map((x) => x.text).join(' ').replace(/[\\{}^_$]/g, ' ').replace(/\s+/g, ' ').toLowerCase();

export function buildSearchItems(problems = PROBLEMS, stations = STATIONS, topics = TOPICS) {
  const items = [];
  problems.forEach((p, i) => {
    const st = stationById(p.station);
    items.push({ kind: 'problem', id: p.id, key: p.id.toLowerCase(), route: routeFor(p.id), rank: i, station: p.station,
      f: { section: p.section.toLowerCase(), text: plain(p.statement), aha: p.aha.toLowerCase(), why: p.addressWhy.toLowerCase(), where: (st.id + ' ' + st.title).toLowerCase(),
           topic: p.topics.map((t) => (topics.find((x) => x.id === t) || { title: '' }).title.toLowerCase()).join(' ') } });
  });
  stations.forEach((s, i) => items.push({ kind: 'station', id: s.id, key: s.id, route: s.id, rank: i, station: s.id, f: { id: s.id, title: s.title.toLowerCase(), summary: s.summary.toLowerCase() } }));
  topics.forEach((t, i) => items.push({ kind: 'topic', id: t.id, key: t.id.toLowerCase(), route: topicRoute(t.id), rank: i, f: { title: t.title.toLowerCase(), summary: t.summary.toLowerCase(), covers: t.covers.join(' ').toLowerCase() } }));
  return items;
}
const W = { problem: { where: 30, section: 20, text: 15, topic: 12, aha: 10, why: 5 }, station: { id: 50, title: 40, summary: 8 }, topic: { title: 40, summary: 8, covers: 8 } };
const KIND_ORDER = { problem: 0, station: 1, topic: 2 };
const alnum = (c) => /[a-z0-9]/.test(c);
function fieldScore(v, tk, w, isId) {
  const idx = v.indexOf(tk);
  if (idx < 0) return 0;
  const wordStart = idx === 0 || !alnum(v.charAt(idx - 1));
  if (tk.length <= 2 && !wordStart) return 0;
  if (isId && v === tk) return w + 50;
  return wordStart ? w + 5 : w;
}
export function searchItems(query, items, { limit = 8 } = {}) {
  const q = normalizeQuery(query);
  if (!q) return { query: q, total: 0, results: [] };
  const scored = [];
  if (ID_Q.test(q)) {
    const bare = q.replace(/\.$/, '');
    for (const it of items) {
      if (it.kind === 'station') continue;
      let s = 0;
      if (it.key === bare) s = 1000;
      else if (it.key.startsWith(q) && (q.endsWith('.') || /^[pt]\d*$/.test(q) || it.key.charAt(q.length) === '.')) s = 800;
      if (s) scored.push({ it, s });
    }
  } else {
    const toks = q.split(' ').filter((t) => /[a-z0-9]/.test(t));
    if (toks.length) for (const it of items) {
      let total = 0, ok = true;
      for (const tk of toks) {
        let best = 0;
        for (const [k, w] of Object.entries(W[it.kind])) { if (it.f[k]) best = Math.max(best, fieldScore(it.f[k], tk, w, k === 'id')); }
        if (!best) { ok = false; break; }
        total += best;
      }
      if (ok) scored.push({ it, s: total });
    }
  }
  scored.sort((a, b) => b.s - a.s || KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] || a.it.rank - b.it.rank);
  return { query: q, total: scored.length, results: scored.slice(0, limit).map((x) => ({ kind: x.it.kind, id: x.it.id, route: x.it.route, score: x.s })) };
}
```

### A.5 The no-collision check used by U6 (test file only)

```js
function validateWide(W, CW = 7.0) {
  const g = P.layoutMap(STATIONS, W); const K = P.GEOM; const boxes = [];
  for (const n of g.nodes) {
    const w = Math.max(...n.label.lines.map((l) => l.length)) * CW;
    boxes.push({ what: 'label ' + n.id, x0: n.label.x - w / 2, x1: n.label.x + w / 2, y0: n.label.y - 11, y1: n.label.y + 14.5 * (n.label.lines.length - 1) + 4 });
    boxes.push({ what: 'num ' + n.id, x0: n.num.x - 8, x1: n.num.x + 8, y0: n.num.y - 10, y1: n.num.y + 3 });
    if (n.dots.length) boxes.push({ what: 'dots ' + n.id, x0: n.dots[0].x - 4, x1: n.dots[n.dots.length - 1].x + 4, y0: n.dots[0].y - 4, y1: n.dots[0].y + 4 });
  }
  for (const p of g.parts) { const w = p.text.length * CW; boxes.push({ what: 'part ' + p.text, x0: p.anchor === 'start' ? p.x : p.x - w, x1: p.anchor === 'start' ? p.x + w : p.x, y0: p.y - 11, y1: p.y + 3 }); }
  const issues = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) issues.push(`overlap ${a.what} / ${b.what}`); }
  for (const b of boxes) if (b.x0 < 0 || b.x1 > W) issues.push(`outside ${b.what}`);
  for (const t of g.threads) {
    const re = /L([\d.]+) ([\d.]+)A([\d.]+) ([\d.]+) 0 0 (\d) ([\d.]+) ([\d.]+)/g; let m;
    while ((m = re.exec(t.d))) {
      const [sx, sy, rx, ry, sw, ex, ey] = m.slice(1).map(Number); const cx = sx, cy = (sy + ey) / 2, sgn = sw === 1 ? 1 : -1;
      for (let k = 0; k <= 40; k++) { const th = -Math.PI / 2 + Math.PI * k / 40; const x = cx + sgn * rx * Math.cos(th), y = cy + ry * Math.sin(th);
        if (x < 0 || x > W) issues.push(`arc outside ${t.id}`);
        for (const b of boxes) if (x > b.x0 - 2 && x < b.x1 + 2 && y > b.y0 - 2 && y < b.y1 + 2) issues.push(`arc ${t.id} hits ${b.what}`); }
    }
  }
  return [...new Set(issues)];
}
```

---

## 11. Builder notes (as built, iteration 1)

Everything in sections 1 to 8 was built as designed; the 33 unit tests (`tests/unit/i1-station-home-problems.test.mjs`) pin the helpers of Appendix A and the
worked solutions of 6.3, and `tests/interact/i1-station-home-problems.mjs` runs A2, A3 and A4 on both routes (desktop, phone, dark). Differences:

1. **Narrow part captions sit at x 78, not x 16.** In the narrow layout the three strands run at x 23, 32 and 41, straight through a caption that starts at x 16 (seen in the
   phone screenshot: "II . Curves and sets" was struck through by the lines and "IV", "V" were half hidden). The captions now start in the label column (x 78), under the
   place numbers, clear of every strand. `layoutMap` is the only code that changed (one number); the sections 5.2, U5 and A.3 above were edited to match.
2. **One scroll box per answer.** The shell gives `.katex-display` its own `overflow-x: auto`, so inside `.pc-final` the formula scrolled in the inner box and the outer
   box never overflowed (the "Scroll sideways" hint stayed hidden on a phone). `.pc-final .katex-display` is now `max-width: none; overflow: visible`, so `.pc-final` is the
   single scroller and the hint test (`scrollWidth > clientWidth`) is true; the hint is also re-measured after `document.fonts.ready`.
3. **Finder spacing.** An empty status line and an empty results list take no margin (`:empty`), so the finder panel does not end in a blank strip before a query is typed.
4. **Script detail.** The topic start button reads "Start at {first station title}" ("Powers: Spin n Times"), so the check "text includes powers" is case-insensitive.
5. **Measured.** Unthrottled mount time in headless Chromium: home about 80 ms, problems about 40 ms (budgets 150 and 250 ms), so the chunked rendering fall-back of 8.2 was not built.
