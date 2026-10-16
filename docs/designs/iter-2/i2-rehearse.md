# Design: i2-rehearse (iteration 2, wave 1, kind: station)

Station `rehearse`, route `#rehearse`, registry order 20 (`problems` is 21). Owner of `js/stations/rehearse.js` and of the two integration test files
(`tests/unit/i1-integration.test.mjs`, `tests/interact/i1-integration.mjs`). The new test files named by the acceptance criteria,
`tests/unit/i2-rehearse.test.mjs` (A3) and `tests/interact/i2-rehearse.mjs` (A1, A2, A6), are created by this goal too: no other goal owns those names
(the `owns` list names only the legacy files that are edited; every iteration-2 goal writes its own `i2-*` tests the same way, see `i2-generators`).

This file is binding for the builder. Where it says "exactly", a test or a script reads the string. Everything else is the builder's choice within the
constraints of `docs/CONSTRAINTS.md`.

---

## 0. Decisions, and where the code differs from `docs/ARCHITECTURE.md` (read before building)

Actual exports win over ARCHITECTURE. I read `js/data/generators.js`, `js/core/decisions.js`, `js/core/station-kit.js`, `js/core/plane.js`, `js/core/explainer.js`,
`js/core/katex.js`, `js/stations/problems.js`, `js/app.js`, `js/registry.js`, `tests/interact/_helpers.mjs` and `tools/smoke.mjs` as they are today.

| # | Finding or decision | Consequence for the build |
|---|---|---|
| D1 | **The kit's `problemCard` cannot draw a fresh card**: it renders `problemById(id).statement`, the handout text. The rehearsal statement is `card.statement` (TeX with `$...$`). | The statement is rendered with `statementParts(card.statement)` and `appendStatement(host, parts)` from `js/stations/problems.js` (same non-wrapping punctuation rule as the index). `station-kit.header` and `station-kit.links` are used as they are. |
| D2 | **`decisions.picker` is built and its words differ from ARCH 9.** The status line is `Address: wrong. It is "Polar, then Cartesian". <meaning>` (not `Names: wrong (it is all: ...)`). Address chip ids are `rehearse-decisions-address-<slug>` with slugs `c`, `p`, `c-p`, `p-c`, `c-p-c`, `both`; names chips `rehearse-decisions-names-none|any|all|home|continuous` and show the bare code (`all`). A chip press toggles (press the pressed one again to clear). `mark({ address, names, expected })` takes booleans or `null`. | A1 asserts `#rehearse-decisions-status` *contains* `Address: wrong`; that holds. Do not re-implement the picker. |
| D3 | **Cards carry fields ARCH 11.6 does not list**: `sketch.prompt` (one ASCII instruction), `sketch.fit` (`{ center, halfWidth }`, guess kinds only), `sketch.target` (also in `answer.values.target`), `sketch.n` for roots, `familyInfo(id).sketches`. A `choice` or `none` card has **no** `fit`. `generate('P5', s)` is a `choice` card (D1 of i2-generators). Roots cards have `n` up to 8 (1.4.1) and 6 (1.4.2). | The guess plane view is `sketch.fit`. The picture view of a `choice`/`none` card comes from `pictureOf(card)` (section 5.8). Handle ids `g0 ... g{n-1}` are made for any n up to 12. |
| D4 | **`check(card, guess)` takes**: roots and point: an array of `{re, im}` (any order); circle: `[centre, rim]` or `{ center, radius }`; line: `[p, q]`; sector: `[s0, s1]`; choice: an integer index; none: anything (returns `ok: null`). | `state.guess` holds exactly those shapes (section 4.4). |
| D5 | **One card changes in place.** `#rehearse-another`, a type chip and `#rehearse-next-type` regenerate the card in the same mounted station and keep the address bar in step with `history.replaceState(history.state, '', '#rehearse-<idKey>-s<seed>')` (inside try/catch; no `hashchange`, so the router does not remount). A first mount that had no seed in its token does the same replace, so a reload or Back returns to the same card. | A2 reads `data-seed` straight after the click, so the update must be synchronous. Back from `#roots` lands on the pinned card, not a new one. |
| D6 | **The Rehearsal Room is always "predict first".** Nothing on the card names the place before Reveal: no station title, no problem section name, no tooltip with it. `#rehearse-place` is `hidden` until Reveal (A1). | Type chips carry only the id and the counts. |
| D7 | **Reveal never blocks.** It is enabled from the start. An unset decision or a skipped guess is allowed; it simply does not count as right (section 5.7). | A2 reveals with no guess; A1 reveals with no decisions. |
| D8 | **`verdict()` is tri-state**: `address`, `names`, `guess` are `true` (right), `false` (wrong) or `null` (not set / skipped); `right` is a boolean. The DOM attributes map `true` to `right`, `false` to `wrong`, `null` to `skipped`. | Matches A3 (`address false, right false`) and A1/A2 (`data-guess 'right' / 'skipped'`). |
| D9 | **The explainer holds numbers; the prose goes beside it.** `card.worked.cart/.polar` contain `e^{iθ}`, `r^10` and so on, which an explainer `{ text }` cell would print literally. They are shown through `prose()` in `#rehearse-worked-cart` and `#rehearse-worked-polar` (ARCH 9). The explainer rows are numeric TeX built by the pure `explainerData(card)` (section 5.9). | Every explainer cell is KaTeX; a unit test renders all of them with `strict: 'error'`. |
| D10 | **One plane id, two lives.** `createPlane(host, { id: 'rehearse-plane' })` is the guess plane; at Reveal it is destroyed and a new, static plane with the same id draws the picture (the guess handles become rings). A `choice`/`none` card has no plane before Reveal (its host is `hidden`) and gets the picture plane at Reveal. | `window.__mv.planes.get('rehearse-plane')` is always the current one. |
| D11 | **Display text is typeset.** `check().detail`, `sketch.prompt` and the four choice options are ASCII (`5 degrees`, `2pi/3`, `sqrt(50)`, `<=`, `z1`). Page rules (`tests/interact/i1-integration.mjs` I6 and I8) forbid exactly those on screen. A pure `typeset(text)` (section 5.15) converts them; `answer.text` (muted mono, `p.muted.mono`) stays ASCII on purpose (A1 compares it with `card.answer.text`). | Tested in `i2-rehearse.test.mjs` R11. |
| D12 | **The Walk bar's check is `click` on `#rehearse-reveal`.** The Walk takes the id of the click target's nearest ancestor-or-self with an id, so `#rehearse-reveal` is a `<button>` with a text child and no child that has an id. Its route is `rehearse-1-4-2` (a fresh seed). | Do not nest an element with an id inside the button. |
| D13 | **`js/app.js` router facts used**: a hash `#rehearse-<rest>` arrives as `ctx.preset = { kind: 'token', token: '<rest>' }` (case of the token preserved: `rehearse-p5-s3` gives `p5-s3`); `ctx.navigate(token)` re-renders when the hash is the same; `takeStationRequest` consumes `station.request` for the station about to mount (the Rehearsal Room only writes it). `architecture-sync` scans only `js/core`, `js/data`, `js/app.js`, `js/registry.js` for imports, so a station may import any module. | |
| D14 | **Test-file ownership.** `tests/unit/i2-rehearse.test.mjs` and `tests/interact/i2-rehearse.mjs` are new files of this goal (see the top). `tools/interact-all.mjs` already has the row `'i2-rehearse': ['rehearse', 'rehearse-1-4-2-s7', 'rehearse-2-5-1-s3', 'rehearse-P5-s1']`; the script must dispatch on `ctx.route`. | |
| D15 | **The integration tests are updated and, where a pin reads the exact source text of a file another wave-1 goal rewrites, relaxed to the invariant it protects** (section 7.4). I12 (summary counts), I19 (lab source lines), I21 and I23 (problems.js source lines) are the four. | Otherwise the other goals' rewrites turn this goal's acceptance A4 red for reasons that are not about the story. |

Deliberate limits (also in section 9): no new generator rule, no change to a station (the values preset is the adopters' job), no change to `plane.js`.

---

## 1. Goal restatement, the thread, coverage

**The goal.** A station where the student rehearses *any* of the 29 review-problem types on a fresh variant, in the order the story teaches:
1. read the statement with new numbers;
2. **say the two decisions first** (Address, Names) with the shared picker;
3. **make a guess** on a small plane (drag points, a circle, a line, a sector) or pick one of four answers (or, for a proof, nothing);
4. press **Reveal**: a verdict for the chips and the guess, the answer (TeX and ASCII), the **same numbers worked in both addresses** (a two-column explainer plus two short routes in prose), the **picture the station would draw, with these numbers** (roots on their circle with the k = 0 Arg arc and the staircase of steps; the circle or line image; the fan; the point with both addresses), and two exits: **open the station with these numbers** and (for the five image types) **open the Lab with predict-first on**;
5. **Another one like it**, or the type you need most; a score per type is kept (`rehearse.scores`) and a right card ticks the problem (`progress`).

**The thread it carries.** *Same place, new numbers.* The test will not use the handout's numbers and it does not matter: the place, the two decisions and the picture are the same.
All three threads run through this one page.

| Thread (docs/STORY.md section 0) | Where it shows on the Rehearsal screen |
|---|---|
| T1 One point, two addresses (a number is a move; pick the native address) | the **Address** row of the picker is set *before* the plane is touched; the same-place line names the native address; the explainer is Cartesian left or top and polar right or below, with the "easy in Polar/Cartesian" badge on the native row; every picture draws the point or shape with `--cart` for what is Cartesian-native and `--polar` for what is polar-native |
| T2 The staircase (a turn has many names; arg z is the staircase, Arg z the home step) | the **Names** row (`none / any / all / home / continuous`) is the second decision; for roots the picture shows the n roots on their circle, the k = 0 root with its Arg arc, and the list of steps `(Arg c + 2πk)/n` ("k = n is k = 0 again"); every angle on the card says whether it is Arg (the home step) or a name of arg |
| T3 A function moves every point at once; differentiable means one move up close | the image types (2.1.2, 2.1.3, 2.2.1, 2.5.1, P4) draw the image in the w-plane (`--output`) and open the Lab predict-first; the derivative types draw the direction circle (centre A, radius \|B\|) so "differentiable = the circle is a point" is the picture |

**Problems and topics covered.** All 29 review problems as *types* (1.1.1 to 3.2.1 and P1 to P7) and all 12 topics (T1.1 to T3.2). Every type has: a generator card (`js/data/generators.js`), a picture recipe (section 5.8 and Appendix A), explainer rows (section 5.9 and Appendix B) and a score cell. `problemsForStation('rehearse')` and `topicsForStation('rehearse')` list all 29 and all 12 (registry and data already do).

**What changes elsewhere because this goal lands:** the registry already lists the station (22 stations); the home map reads `rehearse.scores` (i2-home-index-deck); the index links `#rehearse-<idKey>` (same goal); the Walk's stop 21 clicks `#rehearse-reveal`; `tests/unit/i1-integration.test.mjs` and `tests/interact/i1-integration.mjs` move from 21 to 22 stations.

---

## 2. UX

### 2.1 The page, top to bottom

One column on a phone; on a wide screen the card has two columns (decisions on the left, the guess plane on the right). The types and the scores come **after** the card, so the card is the first thing a student sees (the default route opens one at once).

Desktop, 1280 px (content about 1000 px). Before Reveal:

```
+------------------------------------------------------------------------------------------+
| The Rehearsal Room                       [T1 · One point, two addresses][T2 · ..][T3 · ..] |  kit header
| The test will not use the handout's numbers, and it does not matter. Same place, new ...  |  #rehearse-lede
+------------------------------------------------------------------------------------------+
| #rehearse-note   (only for an unknown token or a fallback; otherwise absent)               |
+------------------------------------------------------------------------------------------+
| #rehearse-card  data-problem="1.4.2" data-seed="7" data-revealed="false" data-kind="roots" |
|  Card for type 1.4.2                                                    #rehearse-card-title|
|  #rehearse-statement                                                                      |
|    Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms. |
|  #rehearse-place   [hidden until Reveal]                                                  |
|  +---------------------------------------------+ +---------------------------------------+ |
|  | #rehearse-decisions   (decisions.picker)    | | #rehearse-prompt                       | |
|  |  The two decisions                          | |  Drag the 4 handles onto the 4 roots.   | |
|  |  Address [C][P][C→P][P→C][C→P→C][C or P]    | |  +-----------------------------------+ | |
|  |  Names   [none][any][all][home][continuous] | |  | #rehearse-plane-host              | | |
|  |  #rehearse-decisions-status (empty)         | |  |  plane "rehearse-plane", square   | | |
|  +---------------------------------------------+ |  |  handles g0 g1 g2 g3 in a tray    | | |
|  [ Reveal ] #rehearse-reveal                     |  |  along the bottom edge            | | |
|  #rehearse-reveal-hint                           |  +-----------------------------------+ | |
|                                                  |  #rehearse-handle-hint                 | |
|                                                  +---------------------------------------+ |
+------------------------------------------------------------------------------------------+
|  [ Another one like it ] #rehearse-another   [ The type I need most: 1.1.1 ] #rehearse-next-type |
|  #rehearse-readout   type 1.4.2; seed 7; decisions: not set; guess: none; revealed: no     |
+------------------------------------------------------------------------------------------+
| Pick a type  #rehearse-types-panel                                                        |
|  Chapter 1 #rehearse-group-1  [1.1.1 0/0][1.1.2 0/0] ... [1.5.2 0/0]                      |
|  Chapter 2 #rehearse-group-2  [2.1.1 0/0] ...                                             |
|  Chapter 3 #rehearse-group-3  [3.1.1 0/0][3.1.2 0/0][3.2.1 0/0]                           |
|  Proofs    #rehearse-group-P  [P1 0/0] ... [P7 0/0]                                       |
+------------------------------------------------------------------------------------------+
| Your score  #rehearse-scores   Nothing rehearsed yet.   [29 small cells #rehearse-score-*]  |
+------------------------------------------------------------------------------------------+
| nav#rehearse-links   [prev: The 4D Graph][next: The Problem Index][T1 previous: The Mapping Lab] |
+------------------------------------------------------------------------------------------+
```

After Reveal (the card keeps its place; the plane becomes the picture, the **result** section opens under the task, the Reveal button says "Revealed"):

```
|  #rehearse-place  This card lives at  [Roots: Divide the Staircase]. The handout's version is [problem 1.4.2]. |
|  +--------------------------------------------+ +----------------------------------------+ |
|  | picker rows marked:  Address ✓ right        | | #rehearse-prompt (unchanged)            | |
|  |                      Names   ✓ right        | |  picture plane: circle r = 3, 4 roots,  | |
|  | #rehearse-decisions-status                  | |  k = 0 ray and Arg arc, seam, your      | |
|  +--------------------------------------------+ |  guess as rings                         | |
|  [ Revealed ] (disabled)                         |  #rehearse-picture-caption              | |
|  #rehearse-result                                +----------------------------------------+ |
|   #rehearse-verdict  data-address="right" data-names="right" data-guess="right" data-right="true"
|     Right. Both decisions and your guess are correct.                                      |
|     Guess: All 4 roots are in place.      Score for 1.4.2: 1 right of 1 tried.             |
|   #rehearse-same-place  Same place, new numbers. The handout's 1.4.2 is settled the same way: Address Polar, then Cartesian. Names all. |
|   The aha.  <problem.aha>                                                                  |
|   The answer                                                                               |
|     #rehearse-answer (.tex-scroll)      <answer.tex, display>                              |
|     #rehearse-answer-text (p.muted.mono)  <answer.text, ASCII>                            |
|   #rehearse-steps-title   The steps of arg c, each divided by 4                            |
|     #rehearse-steps  k = 0: (π + 0)/4 = π/4 (45°)   k = 1: (π + 2π)/4 = 3π/4 (135°) ...    |
|   #rehearse-ex-host  explainer "rehearse-ex": Cartesian | Polar, rows, footer same         |
|   #rehearse-worked-cart  (bar --cart)        #rehearse-worked-polar  (bar --polar)         |
|   [ Open at Roots with these numbers ] #rehearse-open-station   [ Open in the Lab (predict first) ] #rehearse-open-lab |
```

Phone, 390 px (16 px gutters, content 358 px, one column, nothing wider than the viewport). Before Reveal, then after:

```
+--------------------------------+      +--------------------------------+
| The Rehearsal Room             |      | ... (card as before Reveal)    |
| [T1][T2][T3] (wrap)            |      | This card lives at [Roots...]. |
| lede                           |      | Address ✓ right  Names ✓ right |
| Card for type 1.4.2            |      | +----------------------------+ |
| statement (wraps)              |      | | picture plane 358 x 358     | |
| The two decisions              |      | +----------------------------+ |
|  Address [C][P][C→P]..(wrap)   |      | caption                        |
|  Names [none][any][all]..(wrap)|      | [ Revealed ]                   |
| Drag the 4 handles onto ...    |      | verdict (headline, guess line) |
| +----------------------------+ |      | same place, aha                |
| | plane 358 x 358            | |      | The answer (scrolls inside its |
| |  handles in a bottom tray  | |      |   own box) + ASCII line        |
| +----------------------------+ |      | The steps (ol)                 |
| Arrow keys move a focused dot..|      | explainer: Cartesian ABOVE     |
| [ Reveal ]                     |      |   polar (stacks at 560 px)     |
| hint                           |      | worked Cartesian               |
| [ Another one like it ]        |      | worked polar                   |
| [ The type I need most: 1.1.1 ]|      | [ Open at Roots ... ]          |
| readout                        |      | [ Open in the Lab ... ]        |
| Pick a type (chips wrap)       |      | [ Another one like it ] ...    |
| Your score                     |      +--------------------------------+
| links                          |
+--------------------------------+
```

At 390 px the two-column grid of the card is one column (`@media (min-width: 70rem)` turns it into two). The explainer stacks Cartesian above polar by its own rule (560 px).

### 2.2 Every control (ids, labels, behaviour)

Ids not in ARCH 9 are marked (new). Every control has a stable id, a visible label or an `aria-label`, and a visible focus ring (the shell's `.btn` and `.chip`).

| id | Element and label | Behaviour |
|---|---|---|
| `rehearse-card` | `<article class="panel">`, `aria-labelledby="rehearse-card-title"`; attributes `data-problem`, `data-seed`, `data-revealed="true\|false"`, `data-kind` (`roots`, `point`, `circle`, `line`, `sector`, `choice`, `none`), `data-station` (new), `data-tone` (`cart`, `polar`, `accent`) | the one card on screen; attributes change in place on every new card |
| `rehearse-card-title` (new) | `<h2>` "Card for type 1.4.2" | |
| `rehearse-statement` | `<p tabindex="-1">`; statement with maths typeset | receives focus when a new card replaces the old one (not on mount) |
| `rehearse-place` | `<p hidden>`; after Reveal: "This card lives at <a id=rehearse-place-link>Roots: Divide the Staircase</a>. The handout's version is <a id=rehearse-handout-link>problem 1.4.2</a>." (links are `#roots` and `#problem-1-4-2`) | hidden until Reveal and again hidden when a new card replaces the old one |
| `rehearse-decisions` | the `decisions.picker({ idPrefix: 'rehearse-decisions', onPick })` fieldset; chips `rehearse-decisions-address-c\|p\|c-p\|p-c\|c-p-c\|both`, `rehearse-decisions-names-none\|any\|all\|home\|continuous`, status `rehearse-decisions-status` | press a chip to set, press it again to clear; Left, Right, Home, End move between chips of a row (the kit does this); `onPick` updates the readout; locked (`disable(true)`) after Reveal; `reset()` on a new card |
| `rehearse-prompt` (new) | `<p class="muted">`; `typeset(card.sketch.prompt)` | for guess kinds it is also the plane's `aria-label` and the radio group's `aria-labelledby` |
| `rehearse-plane-host` (new) | `<div>` holding the plane | hidden (`hidden`) for `choice` and `none` until Reveal |
| plane `rehearse-plane` (handles `rehearse-plane-g0 ... g{n-1}` for point and roots; `-c`, `-r` for a circle; `-a`, `-b` for a line; `-s0`, `-s1` for a sector) | `createPlane(host, { id: 'rehearse-plane', interactive: false, ... })` (section 5.5) | drag with mouse or finger (pointer events), or Tab to a handle and use the arrow keys (step, Shift x10, Alt /10). A drag marks the guess as made. |
| `rehearse-handle-hint` (new) | `<p class="muted">` "Arrow keys move a focused dot by 0.1. Shift is ten times that, Alt is a tenth." (0.1 is an example: the number is the handles' step, `niceStep(hw)` of 5.5, and the sentence is built with it) | only when the plane has handles |
| `rehearse-choice` | `<div role="radiogroup" aria-labelledby="rehearse-prompt">`, chips `rehearse-choice-0 ... -3` (`<button type="button" role="radio" aria-checked>`, text = `typeset(option)` through `prose()`) | click or tap selects; Space and Enter select; Arrow keys move focus **and** select (roving tabindex: the selected chip, or the first, is the one tab stop); selecting again does not clear. Hidden for every kind but `choice`. |
| `rehearse-reveal` | `<button type="button" class="btn btn-primary">` "Reveal" | once per card; then disabled and reading "Revealed". No child element has an id (D12) |
| `rehearse-reveal-hint` (new) | `<p class="muted">` | "Set both decisions before you touch the plane. A card counts as right when both decisions are right and your guess is right or skipped." |
| `rehearse-result` (new) | `<section hidden>` holding the verdict, the same-place line, the aha, the answer, the steps, the explainer host, the two worked routes and the open buttons | `hidden` until Reveal; hidden and emptied again when a new card replaces the old one |
| `rehearse-verdict` | `<div role="status" tabindex="-1" hidden>`; attributes `data-address`, `data-names`, `data-guess` (`right\|wrong\|skipped`), `data-right` (`true\|false`) | filled at Reveal; receives focus then (scrolls into view) |
| `rehearse-verdict-head`, `rehearse-verdict-guess`, `rehearse-score-note` (new) | `<p>`s inside the verdict | section 2.5 |
| `rehearse-same-place` (new) | `<p>` | after Reveal |
| `rehearse-aha` (new) | `<p>` "The aha. ..." through `prose()` | after Reveal |
| `rehearse-picture-caption` | `<p class="muted">` under the plane | which station's picture this is, and one sentence on how to read it (Appendix A) |
| `rehearse-steps-title`, `rehearse-steps` (new) | `<h3>` and `<ol>` with `<li id="rehearse-step-<k>" data-k="<k>">` | only for 1.4.1, 1.4.2, 2.2.2 (section 5.8.3) |
| `rehearse-answer` | `<div class="tex-scroll" tabindex="0" role="group" aria-label="Answer, scrolls sideways if it is wide">` with `card.answer.tex` as display maths | the iteration-1 pattern; `rehearse-answer-hint` (new) "Scroll sideways to see the rest." shown only while it overflows |
| `rehearse-answer-text` | `<p class="muted mono">` whose text is exactly `card.answer.text` | A1 reads `textContent.trim()` |
| `rehearse-ex-host` (new), explainer `rehearse-ex` | `createExplainer(host, { id: 'rehearse-ex', ... })`; table `rehearse-ex-table`, footer `rehearse-ex-same` with `data-agree`, cells `rehearse-ex-<row>-cart\|polar` | built at Reveal, destroyed on a new card |
| `rehearse-worked-cart`, `rehearse-worked-polar` | `<section>` with an `<h3>` and a `<p>` rendered by `prose(p, card.worked.cart\|polar)`; `data-tone="cart\|polar"` (4 px bar) | after Reveal |
| `rehearse-open-station` | `<button type="button" class="btn">` "Open at Roots with these numbers" (the station's short title through `titleSpan`, one span) | writes `station.request` from `requestFor(card)` with `{ persist: false }`, then `ctx.navigate(card.station)`; `hidden` when `requestFor(card)` is `null`, with `rehearse-open-note` (new) saying why |
| `rehearse-open-lab` | `<button type="button" class="btn">` "Open in the Lab (predict first)" | writes `lab.request` from `labRequestFor(card)` (always `predictFirst: true`), `{ persist: false }`, then `ctx.navigate('lab')`; `hidden` when `card.labRequest` is `null` |
| `rehearse-another` | `<button type="button" class="btn">` "Another one like it" | new seed, same type, section 5.4; the new card differs from the old one in its statement when the family has more than one variant |
| `rehearse-next-type` | `<button type="button" class="btn btn-quiet">` "The type I need most: 2.4.1" | `pickType(scores)`; its label is rewritten whenever the scores change |
| `rehearse-readout` | `<div class="readout" role="status">` | exact format in section 5.14 |
| `rehearse-types-panel` (new), `rehearse-types` | `<section class="panel">` with `<h2>` "Pick a type"; `rehearse-types` is the chip host | |
| `rehearse-group-1`, `-2`, `-3`, `-P` | `<div role="group" aria-labelledby=...>` with a small heading | chapter 1 (11 chips), chapter 2 (8), chapter 3 (3), proofs (7) |
| `rehearse-type-<idKey>` | `<button type="button" class="chip">` text `1.4.2` and a count `1/2`; `aria-pressed` on the current type; `data-tried`, `data-right`; `aria-label="Type 1.4.2: 1 right of 2 tried"` | opens a card of that type on a fresh seed, in place |
| `rehearse-scores` | `<section class="panel">` with `<h2>` "Your score"; `rehearse-score-line` (new) text; `<progress id="rehearse-score-bar">` (new); 29 cells | |
| `rehearse-score-<idKey>` | `<span role="img" aria-label="1.4.2: 1 right of 2 tried" data-tried data-right>` (a small square: filled when right >= 1, outlined when tried >= 1, empty otherwise) | not a tab stop |
| `rehearse-score-storage` (new) | `<p class="muted" hidden>` | shown when `store.set` returned `false` |
| `rehearse-error` (new) | `<div class="callout" role="alert" hidden>` | section 2.4 |
| kit links `rehearse-links`, `rehearse-link-graph4d` (`data-dir="prev"`), `rehearse-link-problems` (`data-dir="next"`), `rehearse-link-lab` (`data-dir="prev"`, `data-thread="T1"`) | `station-kit.links(ctx)` | A4: the threads reach the index through these |

Ids the kit already uses on this page and the station must **not** reuse: `rehearse-header`, `rehearse-title`, `rehearse-lede`, `rehearse-threads`, `rehearse-links`, `rehearse-link-*`.
No two elements may share an id after any sequence of cards (I8 scans for duplicates): every per-card element is rebuilt in place, never cloned.

### 2.3 Pointer, touch and keyboard

- **Pointer and touch.** A handle is a plane-owned button: pointer events, so a finger drags it. Planes made here are `interactive: false`, so a one-finger drag on empty canvas scrolls the page (`touch-action: auto`) and a handle drag (`touch-action: none` on the handle) never scrolls it. The plane clamps a drag to a 10 px inset.
- **Keyboard.** Tab order on a guess card: the picker (the first chip of each row that is pressed, else the first; Left, Right, Home, End inside a row), then the handles in id order (g0, g1, ...), then Reveal, then Another, then Next type, then the type chips, then the links. On a choice card the radio group is one tab stop. After Reveal the verdict takes focus; the next Tab goes to the answer box (it scrolls), then the open buttons.
- **Screen readers.** The plane's `aria-label` is the prompt; each handle announces its address through `describe` ("Root guess 2 of 4: z = 1 + i; r = 1.414, θ = 0.785 (π/4, Arg)"; at the origin "no angle at 0"). The picture plane's `aria-label` is the caption. The verdict is a status region and gets focus. The readout is a status region too but is not announced on every drag: it is `aria-live="off"` while the card is unrevealed (set `aria-live="polite"` only after Reveal).

### 2.4 Empty, loading, error and odd states

| State | What the page shows |
|---|---|
| Loading | none needed: the module and the generators are synchronous, KaTeX renders inside `tex()`. The router's own "Loading..." placeholder covers the module fetch. If `window.katex` is missing the maths shows as plain TeX text (`tex()` degrades) and nothing breaks. |
| First visit, `#rehearse` | the type with the fewest rights (1.1.1 on a fresh store) on a fresh seed; the URL becomes `#rehearse-1-1-1-s<seed>` (D5). `#rehearse-score-line` says "Nothing rehearsed yet. The first card is the type you need most." |
| Unknown token (`#rehearse-nonsense`, `#rehearse-1-4-9`, `#rehearse-1-4-2-s99999999999`) | the default card as above, and `#rehearse-note` (a `.callout`): `There is no card called "nonsense". Here is the type you need most.` (the token is truncated to 24 characters with `...`; set with `textContent`). Never the under-construction panel. |
| `generate` returns `null` or throws | `#rehearse-error` shows "I could not make a card for type 1.4.2. Press Another one like it." and the card keeps its previous content (or, at mount, the first type that works is tried; the error stays visible). `console.warn`, never `console.error`. |
| `card.values === null` (P5 on y = x³) | `#rehearse-open-station` is `hidden`; `#rehearse-open-note` says "The station cannot draw this variant, so there is no button. The picture above is what it would show." |
| `card.labRequest === null` (24 of 29 types) | `#rehearse-open-lab` is `hidden`, no note. |
| A proof (`none`) | no plane, no choice chips; the prompt reads "A proof: set the two decisions, then open the worked solution." (generator copy); Reveal is enabled at once; the verdict's guess line is absent and `data-guess="skipped"`. |
| Storage blocked or full | everything works from memory; after the first score write that returns `false`, `#rehearse-score-storage` reads "Scores last until you close this page: your browser is not keeping them." |
| Stored scores damaged | `sanitizeScores` keeps only known ids with non-negative integers (`right` is clamped to `tried`); the rest is dropped without a message. |
| No WebGL needed | none of the pictures use three.js. |
| Reduced motion | no animation on the page except two CSS fade-ins (step list, picture) that are off under `prefers-reduced-motion: reduce`. Nothing here plays; no stepper is needed. |
| Theme change while open | the planes redraw (they listen themselves; the station also calls `plane.requestDraw()` from `ctx.theme.onThemeChange`), the explainer re-renders, the picker and chips are CSS. |

### 2.5 The copy (plain, direct, the night before the test)

No emoji. Names and constants are typeset (`π`, `θ`, `z₁`, `≤`). The words in quotation marks are exact (a script or a test may read them); the rest is guidance.

- `h1` (registry title): "The Rehearsal Room".
- Lede: "The test will not use the handout's numbers, and it does not matter. Same place, new numbers: say the two decisions, make your guess, then see the worked answer in both addresses."
- Card title: "Card for type 1.4.2".
- Reveal hint: "Set both decisions before you touch the plane. A card counts as right when both decisions are right and your guess is right or skipped."
- Handle hint: "Arrow keys move a focused dot by 0.1. Shift is ten times that, Alt is a tenth." (the 0.1 is the handles' step for this card)
- Buttons: "Reveal", "Revealed", "Another one like it", "The type I need most: 2.4.1", "Open at Roots with these numbers", "Open in the Lab (predict first)".
- Place: "This card lives at Roots: Divide the Staircase. The handout's version is problem 1.4.2."
- Verdict head, built by `verdictSentence(v, kind)` (pure, section 5.7):
  - right, guess right: "Right. Both decisions and your guess are correct."
  - right, guess skipped, card has a guess task: "Right on both decisions. You skipped the guess."
  - right, proof card: "Right on both decisions."
  - not right: "Not yet." then (if some part is wrong) " Check the Address, the Names and your guess." (the parts that are `false`, in that order, joined with commas and "and"), then (if some decision is unset) " You did not set the Address." / " You did not set the Names." / " You did not set the Address or the Names.", then " The picture and both worked routes are below."
  - Examples: "Not yet. Check the Names. The picture and both worked routes are below." / "Not yet. You did not set the Address or the Names. The picture and both worked routes are below."
- Guess line: "Guess: " plus `typeset(check(card, guess).detail)` (for example "Guess: All 4 roots are in place."; for a sector "Guess: An edge is off by more than 5°."); when skipped: "Guess: skipped."; for a `choice` that was wrong add " The answer is: <typeset option>."
- Score note: "Score for 1.4.2: 1 right of 1 tried."
- Same place: "Same place, new numbers. The handout's 1.4.2 is settled the same way: Address Polar, then Cartesian. Names all." (`addressLabel(problem.address)` and `problem.names`; the sentence says "Names none" for a type with no angle.)
- Aha line: "The aha. " + `problem.aha` (through `prose()`).
- Section heads: "The answer", "Pick a type", "Your score", and for steps: "The steps of arg c, each divided by 4" (1.4.1, 1.4.2) or "The names of arg w, each divided by 2" (2.2.2; the k = 0 row ends "(the principal root: the home step only)").
- Step rows: `k = 0: (π + 0)/4 = π/4 (45°)`, `k = 1: (π + 2π)/4 = 3π/4 (135°)`, `k = 2: (π + 4π)/4 = 5π/4 (225°)`, `k = 3: (π + 6π)/4 = 7π/4 (315°)`; the list ends with the line "k = 4 is k = 0 again." For c = 1 (Arg c = 0): `k = 1: (0 + 2π)/5 = 2π/5 (72°)`.
- Chip counts: `1/2` is rights over tries; the score line: "Right at least once: 3 of 29 types. Cards tried: 5."
- Notes: the unknown token note, the error, the open-note, the storage note (section 2.4).

### 2.6 What each kind of card asks (the guess tasks)

| `sketch.kind` | Families | Handles and ids | Start positions (section 5.5) | Drawn live while guessing | What `guess` holds |
|---|---|---|---|---|---|
| `roots` | 1.4.1, 1.4.2 | `g0 ... g{n-1}`, no word beside them | a tray along the bottom edge | nothing but the dots | the n handle points |
| `point` | 1.4.3 (2), 2.2.2 (1), 2.3.1 (1) | `g0 ...` | tray | nothing | the 1 or 2 handle points |
| `circle` | 1.2.1, P4, 2.5.1 (line input) | `c` (word "centre") and `r` (word "rim") | centre lower left, rim 0.4 of the half width to its right | the circle through `r` about `c` in `--input`, dashed, with the radius segment | `[c, r]` |
| `line` | 2.1.3, 2.5.1 (circle input) | `a`, `b` (words "point 1", "point 2") | two points in the lower part | the line through `a` and `b`, extended to the plane edge, in `--input` | `[a, b]` |
| `sector` | 2.2.1 | `s0`, `s1` (words "edge 1", "edge 2") | two points at radius 0.6 of the half width at angles that miss both target edges by more than 20° | the two rays from 0 through the handles (not the wedge: either side could be meant) | `[s0, s1]` |
| `choice` | 1.1.1, 1.1.2, 1.2.2, 1.3.1, 1.3.2, 1.5.1, 1.5.2, 2.1.1, 2.1.2, 2.4.1, 3.1.1, 3.1.2, 3.2.1, P5, P6 | none; four radio chips | none selected | | the chosen index |
| `none` | P1, P2, P3, P7 | none | | | `null` |

A guess is *made* when any handle has moved (a pointer drag, a key nudge or `handle.set`) or a choice is selected. Until then `guess` is `null` and Reveal records "skipped".

---

## 3. Visual encoding (docs/CONSTRAINTS.md "Design language", both themes)

Every colour is a token from `css/theme.css`. Canvas drawing reads the token at draw time (the plane's helpers accept `'--polar'` as a colour string and drop their cache on `themechange`); DOM and CSS use `var(--polar)`. **No literal colour appears in `rehearse.js`** (a unit test scans for `#rgb`/`#rrggbb` outside the route strings). Ratios are WCAG against `--surface` (token values from `css/theme.css`; light / dark).

| What | Token | Contrast on `--surface` | Notes |
|---|---|---|---|
| statement, answer, headings, body | `--text` | 15.96 / 14.52 | |
| prompt, hints, captions, counts, `answer.text` | `--text-muted` | 6.86 / 7.80 | |
| everything Cartesian: drop lines, the Cartesian cell column, `worked.cart` bar, the "slide", segments of a line image's Cartesian pieces, the answer of the cart-native types (1.1.x, 1.2.2, 1.5.1, 1.4.3 axis) | `--cart` | 6.17 / 7.12 | explainer column tint `--cart`; badge "easy in Cartesian" |
| everything polar: rings, rays, the Arg arc, roots, sectors, the Polar column, `worked.polar` bar | `--polar` | 6.06 / 8.30 | explainer column tint `--polar`; badge "easy in Polar" |
| **the student's guess**: handles, live circle/line/rays, the rings at Reveal | `--input` | 6.26 / 8.71 | a *ring* (stroke only) means "your guess" |
| **the image on the w-plane** (2.1.2, 2.1.3, 2.5.1, P4, the check point's w) and the given shapes' images | `--output` | 6.17 / 7.43 | a *filled dot* means "the answer" |
| the given shape on the z-plane (the input circle of P4, the input sector of 2.2.1) | `--input`, dashed | | `DASH.guide` |
| seam, excluded circle, guides, the principal cut | `--seam`, dashed (`DASH.seam`, `DASH.excluded`, `DASH.guide`) | 4.76 / 5.95 | never the only carrier: each dashed thing has a word |
| reference points (0, 1, −1, the foot of a perpendicular) | `--text-muted`, a *muted ring* | 6.86 / 7.80 | |
| verdict right / wrong | `--ok` / `--danger` | 6.12 / 8.86 and 6.54 / 7.03 | always with a word and a mark: "✓ right", "✗ wrong" (the picker draws its own), never colour alone |
| miss connector (guess to its nearest answer) | `--ok` if within the tolerance, else `--warn` | 6.04 / 8.75 | thin dashed segment |
| card top bar (`data-tone`) | `--cart`, `--polar` or `--border-strong` (accent) | | from the problem's address: one tone when the address uses one native address, otherwise accent |

**Marks that carry meaning (no colour needed):** filled dot = the answer; ring = your guess; muted ring = a reference point; dashed = a guide, a seam or an excluded boundary; the `k = 0` root is larger (radius 6, others 5) and has the Arg arc and the word `k = 0`.

**Shape language (the station's vocabulary, ARCH 10.1.7):** the point z is drawn once; its Cartesian address is dashed drop lines (`drawCartAddress`, `--cart`); its polar address is the ray with `r` and the Arg arc (`drawPolarAddress`, `--polar`); `arg z` appears as faint extra windings (`ghosts`) only where the family is about names (1.3.1) or in the step list (roots); the seam (`drawSeam`) is on every plane where Arg or a principal value matters (1.3.1, 1.3.2, 1.4.x, 2.2.2, 2.4.1).

**Typography.** `var(--font)` for text, `var(--font-mono)` for the ASCII answer and the readout (the shell's `.mono`, `.readout`), `var(--font-display)` only for the h1/h2 that the shell styles. No web font link. Sizes: statement 1.1rem; prompt and hints 0.9rem; the type-chip count 0.78rem.

**Both themes.** Nothing is inverted in code. A dark-theme screenshot of the revealed 1.4.2 card (`--dark` run, `docs/review/iter-2/i2-rehearse/rehearse-1-4-2-s7--desktop-dark--revealed.png`) is reviewed with the light ones.

### 3.1 The station's CSS (token-only; injected once as `<style data-for="rehearse">`, every rule prefixed `rh-` or `#rehearse-`)

```css
.rh-layout, .rh-card, .rh-task, .rh-guess, .rh-result, .rh-worked, .rh-open { min-width: 0; }
.rh-layout { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
.rh-card { display: grid; gap: var(--space-3); border-top: 4px solid var(--tone, var(--border-strong)); }
.rh-card[data-tone="cart"] { --tone: var(--cart); }
.rh-card[data-tone="polar"] { --tone: var(--polar); }
.rh-card > * { min-width: 0; margin: 0; }
.rh-statement { font-size: 1.1rem; overflow-wrap: anywhere; }
.rh-task { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 70rem) { .rh-task { grid-template-columns: minmax(0, 22rem) minmax(0, 1fr); } }
.rh-guess { display: grid; gap: var(--space-2); justify-items: start; }
#rehearse-plane-host { width: 100%; max-width: 460px; }            /* the plane sets its own aspect ratio (1) */
.rh-choice { display: grid; gap: var(--space-2); width: 100%; max-width: 32rem; }
.rh-choice .chip { justify-content: flex-start; text-align: left; white-space: normal; min-height: var(--tap); }
.rh-choice .chip[aria-checked="true"] { border-color: var(--input); box-shadow: 0 0 0 2px var(--input); }
.rh-choice .chip[aria-checked="true"]::before { content: "\25CF\00a0"; color: var(--input); }
.rh-choice .chip[data-mark="right"] { border-color: var(--ok); box-shadow: 0 0 0 2px var(--ok); }
.rh-choice .chip[data-mark="right"]::after { content: "\00a0\2713 correct"; color: var(--ok); font-weight: 600; }
.rh-choice .chip[data-mark="wrong"] { border-color: var(--danger); border-style: dashed; }
.rh-choice .chip[data-mark="wrong"]::after { content: "\00a0\2717 your pick"; color: var(--danger); font-weight: 600; }
.rh-verdict { padding: var(--space-2) var(--space-3); border-left: 4px solid var(--border-strong); background: var(--surface-2); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.rh-verdict[data-right="true"] { border-left-color: var(--ok); }
.rh-verdict[data-right="false"] { border-left-color: var(--danger); border-left-style: dashed; }
.rh-verdict p { margin: 0 0 var(--space-1); }
.rh-verdict-head { font-weight: 700; }
.rh-worked { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
.rh-route { padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.rh-route[data-tone="cart"] { --tone: var(--cart); }
.rh-route[data-tone="polar"] { --tone: var(--polar); }
.rh-route h3 { margin: 0 0 var(--space-1); font-size: 0.95rem; }
.rh-route p { margin: 0; overflow-wrap: anywhere; }
.rh-steps { margin: 0; padding-left: 1.4rem; display: grid; gap: var(--space-1); }
.rh-steps li[data-home="true"] { font-weight: 700; color: var(--polar); }
.rh-open { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.rh-after { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rh-types { display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr)); }
.rh-type { flex-direction: column; align-items: center; gap: 0; padding-block: var(--space-1); }
.rh-type .rh-count { font-size: 0.78rem; color: var(--text-muted); }
.rh-type[aria-pressed="true"] .rh-count { color: inherit; }
.rh-cells { display: flex; flex-wrap: wrap; gap: 4px; }
.rh-cell { width: 0.9rem; height: 0.9rem; border: 2px solid var(--border-strong); border-radius: 3px; display: inline-block; }
.rh-cell:not([data-tried="0"]) { border-color: var(--polar); }
.rh-cell:not([data-right="0"]) { background: var(--ok); border-color: var(--ok); }
@media (prefers-reduced-motion: no-preference) {
  .rh-steps li { animation: rh-in 240ms ease both; animation-delay: calc(var(--k, 0) * 90ms); }
  @keyframes rh-in { from { opacity: 0; transform: translateY(4px); } }
}
```

`.panel`, `.chips`, `.chip`, `.btn`, `.callout`, `.readout`, `.tex-scroll`, `.muted`, `.mono` come from the shell and are not restyled. The `.rh-cell` states are redundant with the text in `aria-label`; the filled/outlined/empty squares differ in fill and outline, not only hue.

---

## 4. Module API (`js/stations/rehearse.js`)

### 4.1 Imports (relative only; no network; no globals read at import time)

```js
import { generate, check, FAMILIES } from '../data/generators.js';
import { PROBLEMS, problemById, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { picker } from '../core/decisions.js';
import { header, links, titleSpan } from '../core/station-kit.js';
import { createPlane, drawCartAddress, drawPolarAddress, drawCircle, drawRay, drawSegment, drawArc, drawDot, drawSeam, drawPolygonFill,
         createLabelPlacer, sideCands, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose } from '../core/katex.js';
import { segment } from '../core/shapes.js';
import { compile } from '../core/parse.js';
import { Arg, wrapArg, abs, add, sub, mul, div, conj, pow, fromPolar, rootsOf, branchArg, localLinear, jacobian, eq,
         fmtNum, fmtCart, fmtAngle, texNumber, texAngle, texCart, texPolar } from '../core/complex.js';
import { idKey, sanitizeProgress, setTicked, appendStatement, shortTitle } from './problems.js';
import { THREADS } from '../registry.js';      // only if the header needs it; the kit reads ctx.threads itself
```

`idKey`, `sanitizeProgress`, `setTicked` are imported, never copied (the goal's `reads`). `appendStatement` and `shortTitle` are pinned by the iteration-1 unit tests and by `tests/interact/i2-decisions-kit.mjs`, so they stay. `js/stations/problems.js` is rewritten by i2-home-index-deck in the same wave: if a name has moved when this is built, import from the module that now owns it and write the move in the build note.
No import is dynamic. The file has no top-level DOM access, so Node imports it (I1 of the integration test does).

### 4.2 Exports

All of these are **pure** (no DOM, no clock, no store) except `mount`. Signatures are exact.

```js
export const SCORES_KEY = 'rehearse.scores';                 // store key, persisted: { [id]: { tried, right, last } }
export const TYPE_ORDER                                      // frozen array of the 29 ids in handout order (= PROBLEMS.map(p => p.id) = FAMILIES order)
export function parseToken(token)                            // → { id, seed | null } | null
export function pickType(scores)                             // → id: the type with the lowest right count, ties in handout order
export function sanitizeScores(raw)                          // → a clean { [id]: { tried, right, last } } (known ids, non-negative integers, right <= tried)
export function recordScore(scores, id, right, now = 0)      // → a NEW scores object with tried + 1, right + (right ? 1 : 0), last = now
export function scoreSummary(scores)                         // → { typesRight, tried, total }  (types with right >= 1, sum of tried, 29)
export function typeGroups()                                 // → [{ key: '1' | '2' | '3' | 'P', title, ids }] in order: Chapter 1 (11), Chapter 2 (8), Chapter 3 (3), Proofs (7)
export function freshSeed(now, counter)                      // → uint32: ((now >>> 0) ^ Math.imul(counter + 1, 0x9E3779B1)) >>> 0
export function nextCard(id, prev, now, counter)             // → Card | null: a card of type id on a new seed, not the statement of prev when the family has another variant
export function requestFor(card)                             // → { station, problem, family, values } | null
export function labRequestFor(card)                          // → card.labRequest with predictFirst: true | null
export function verdict(card, picks, guess)                  // → { address, names, guess, right }  (tri-state booleans, see 5.7)
export function verdictSentence(v, kind)                     // → the headline sentence of 2.5
export function startGuess(card)                             // → [{ id, z, label, name }]: the handles of the guess plane with their start positions ([] for choice and none)
export function matchGuesses(targets, guesses)               // → [{ target, guess: {re, im} | null, dist }] greedy nearest matching, as check() does it
export function fitView(points, extra = 0)                   // → { center: {re, im}, halfWidth }: a square view that holds the origin, the points and a margin
export function pictureOf(card)                              // → { view, items, caption, alt, station }  (5.8, Appendix A)
export function explainerData(card)                          // → { rows, same, sameLabel }  (5.9, Appendix B)
export function stepList(card)                               // → { title, rows: [{ k, text, home }], footer } | null  (1.4.1, 1.4.2, 2.2.2)
export function typeset(text)                                // → display text: ASCII problem notation to typeset symbols (5.15)
export function readoutText(state)                           // → the #rehearse-readout string (5.14)
export function mount(el, ctx)                               // → unmount()   (mount.length === 2; mount may be sync)
```

Rules for the exports: none mutates its arguments; none throws on a card produced by `generate`; `pictureOf`, `explainerData`, `stepList`, `startGuess` also work on a card produced by `solve(id, given)` (it has no `seed`); every number they return is finite.

### 4.3 Types

```js
// Scores: { '1.4.2': { tried: 2, right: 1, last: 1760000000000 }, ... }  (only types that were revealed)
// Picture:  { view: { center: {re, im}, halfWidth }, items: Item[], caption: string, alt: string, station: string }
// Item (all fields plain data, JSON-safe; tone is one of 'cart' 'polar' 'input' 'output' 'seam' 'ok' 'warn' 'danger' 'text' 'muted'):
//   { k: 'dot',      z, tone, label?, size = 5, ring? }                 a filled dot (ring: true = stroke only), label placed by the label placer
//   { k: 'circle',   center, r, tone, dash?, label? }
//   { k: 'disk',     center, r, tone, alpha = 0.12 }                    fill only
//   { k: 'annulus',  center, r0, r1, innerIncluded, outerIncluded, tone }
//   { k: 'wedge',    from, to, rMax, tone, alpha = 0.12 }               fill only, from the origin
//   { k: 'ray',      angle, from?, tone, dash?, alpha?, label? }
//   { k: 'seam',     angle, label = 'seam', muted? }
//   { k: 'segment',  a, b, tone, arrow?, dash?, alpha?, label? }
//   { k: 'line',     point, dir, tone, dash?, label? }                  infinite, drawn through point +- dir * span
//   { k: 'arc',      center, r, from, to, tone, arrow?, label? }        counterclockwise, radians, r in plane units
//   { k: 'polygon',  points, tone, dash?, alpha? }                      closed polyline
//   { k: 'curve',    points: [{re, im, t}], tone, ramp }                a timed curve (plane.addCurve)
//   { k: 'cartAddr', z, names? }                                        drawCartAddress ({ names: ['u', 'v'] on w-plane pictures })
//   { k: 'polarAddr', z, name = 'z', ghosts = 0, ghostsNeg = 0 }       drawPolarAddress
// ExplainerData: { rows: [{ id, label, cart: TeX | null, polar: TeX | null, native: 'cart' | 'polar' | null, num: number | {re, im} | null }],
//                  same: { cart: TeX, polar: TeX, agree: boolean }, sameLabel: string }
// State (inside mount, exposed by the hook as a copy):
//   { id, seed, card, picks: { address, names }, guess, touched, choice, revealed, verdict, detail }
```

### 4.4 State and the guess shapes

`state.guess` is exactly what `check(card, guess)` takes (D4): roots and point: `{re, im}[]` in handle order; circle: `[c, r]`; line: `[a, b]`; sector: `[s0, s1]`; choice: an integer; otherwise `null`. It is `null` until a guess is *made* (a handle moved or a chip chosen). `guessNow()` reads the live handle positions (copies) so a drag never goes stale.

### 4.5 Events

| Source | Handler |
|---|---|
| picker `onPick(decision, value)` | `state.picks[decision] = value`; update the readout |
| each handle `onDrag(z, { final })` | `state.touched = true`; update the readout; `plane.requestDraw()` |
| choice chip click / key | select, update `aria-checked`, roving tabindex, `state.choice = k`, readout |
| `#rehearse-reveal` click | `reveal()` (5.7) |
| `#rehearse-another` click | `showCard(nextCard(state.id, state.card, Date.now(), counter++), { focus: true })` |
| `#rehearse-next-type` click | `showCard(nextCard(pickType(scores), null, Date.now(), counter++), { focus: true })` |
| `#rehearse-type-<idKey>` click | `showCard(nextCard(id, null, Date.now(), counter++), { focus: true })` |
| `#rehearse-open-station` click | `ctx.store.set('station.request', requestFor(card), { persist: false }); ctx.navigate(card.station)` |
| `#rehearse-open-lab` click | `ctx.store.set('lab.request', labRequestFor(card), { persist: false }); ctx.navigate('lab')` |
| `ctx.theme.onThemeChange` | `plane && plane.requestDraw()` |
| `ResizeObserver` on the answer box | show or hide `#rehearse-answer-hint` |

The station adds **no** `window` or `document` listener (no keyboard shortcut), so unmount has none to remove.

### 4.6 Store keys

| Key | Read | Written | Format |
|---|---|---|---|
| `rehearse.scores` | at mount, and re-read at every Reveal (another tab may have changed it) | at Reveal, persisted (`store.set(SCORES_KEY, next)`; a `false` return shows `#rehearse-score-storage`) | `{ [id]: { tried, right, last } }` |
| `progress` | at Reveal | at Reveal when the card is right: `store.set('progress', setTicked(sanitizeProgress(store.get('progress', {})), id, true))`; never unticks; never written otherwise | `{ [id]: true }` |
| `station.request` | never | `{ persist: false }`, by "Open at ..." | StationRequest (ARCH 4.1) |
| `lab.request` | never | `{ persist: false }`, by "Open in the Lab" | LabRequest (ARCH 4) |

A visit that reveals nothing writes nothing (ARCH 10.1.9).

### 4.7 The test hook

```js
const mv = (window.__mv = window.__mv || {});
mv.rehearse = {
  card:  () => state.card,                                   // the Card (same object generate returned)
  state: () => ({ id, seed, picks: { address, names }, guess: <copy or null>, revealed }),
  generate: (id, seed) => generate(id, seed),                // pure; changes nothing on the page
  scores: () => sanitizeScores(store.get(SCORES_KEY, {})),
  mountMs,                                                   // performance.now() spent in mount
};
```

The hook is set at the end of `mount` and deleted (`delete window.__mv.rehearse`) in `unmount`. `window.__mv` is never replaced.

### 4.8 Lifecycle

`mount(el, ctx)`: build the header (`header(ctx, { lede, chips: false })`), the note and error callouts, the card skeleton, the after-row, the readout, the types, the scores and the links; read `ctx.preset` (5.3); build the first card with `showCard`; inject the style once; set the hook last; return `unmount`.
`unmount()`: `disposed = true`; `plane.destroy()` (if any); `explainer.destroy()` (if any); `pickerInstance.destroy()`; `observer.disconnect()`; unsubscribe the theme listener; clear the focus timer; `delete window.__mv.rehearse`. Everything is idempotent and safe to call twice. The style tag is left in the head (like the core modules').

---

## 5. Algorithms (numbered pseudocode; the numbers in the code comments should match)

Notation: `z = {re, im}`; `hw` = a view's half width in plane units; `round3(x) = Math.round(x * 1000) / 1000 + 0` (never `-0`); `clean(z)` sets any part with |part| < 1e-9 to `0` (so `-0` and 3e-14 never reach a formatter); `tn = texNumber`, `ta = texAngle`, `tc(z) = texCart(clean(z))`, `tp(z) = texPolar(clean(z))` (from `complex.js`).

### 5.1 `parseToken(token)`

```
1. if typeof token !== 'string' return null; t = token.trim(); if t === '' or t.length > 40 return null
2. m = /^(.+?)(?:-[sS](\d{1,10}))?$/.exec(t)            // lazy id, optional "-s<digits>" at the very end
3. dotted = m[1].replace(/-/g, '.')                       // '1-4-2' -> '1.4.2'; 'P5' -> 'P5'; 'p5' -> 'p5'
4. found = [dotted, dotted.toUpperCase()].map(problemById).find(Boolean); if !found return null
5. seed = m[2] === undefined ? null : Number(m[2]); if seed !== null and seed > 4294967295 return null
6. return { id: found.id, seed }
```
Table (A3): `'1-4-2-s7'` gives `{ id: '1.4.2', seed: 7 }`; `'P5'` gives `{ id: 'P5', seed: null }`; `'p5-s3'` gives `{ id: 'P5', seed: 3 }`; `'nonsense'`, `'1-4-9'`, `''`, `'1-4-2-s'`, `'1-4-2-s7-x'`, `'s7'`, `'1-4-2-s99999999999'` give `null`; `'2-5-1-s007'` gives `{ id: '2.5.1', seed: 7 }`; `'1-4-2-S7'` gives seed 7.

### 5.2 Scores, `pickType`, groups

```
sanitizeScores(raw):
  out = {}; if raw is not a plain object return out
  for id of TYPE_ORDER:  e = raw[id]; if e is not an object continue
     tried = nn(e.tried); right = min(nn(e.right), tried); last = Number.isFinite(e.last) && e.last >= 0 ? e.last : 0
     if tried === 0 continue                               // right > 0 with tried 0 is damage
     out[id] = { tried, right, last }
  nn(x) = Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0
recordScore(scores, id, right, now):
  s = sanitizeScores(scores); if id is not in TYPE_ORDER return s
  e = s[id] ?? { tried: 0, right: 0, last: 0 }
  s[id] = { tried: e.tried + 1, right: e.right + (right ? 1 : 0), last: Number.isFinite(now) ? now : 0 }; return s
pickType(scores):
  s = sanitizeScores(scores); best = TYPE_ORDER[0]; low = s[best] ? s[best].right : 0
  for id of TYPE_ORDER: r = s[id] ? s[id].right : 0; if r < low { best = id; low = r }       // strict <: ties keep the earlier id
  return best
scoreSummary(scores): typesRight = count of ids with right >= 1; tried = sum of tried; total = 29
typeGroups(): chapter 1 -> key '1' "Chapter 1"; 2 -> '2' "Chapter 2"; 3 -> '3' "Chapter 3"; chapter 0 (proof) -> 'P' "Proofs"; ids in handout order
```
Expected (A3): `pickType({}) === '1.1.1'`; `pickType({ '1.1.1': { tried: 1, right: 1, last: 1 } }) === '1.1.2'`; all 29 right once except `'2.4.1'` (tried 1, right 0) gives `'2.4.1'`; all 29 right once gives `'1.1.1'`; a type with `tried: 5, right: 0` loses to nothing: it ties with the untouched ones and the earliest id wins.

### 5.3 `mount(el, ctx)`

```
1. t0 = performance.now(); disposed = false; store = ctx.store (every call wrapped in try/catch, memory fallback = the store's own)
2. scores = sanitizeScores(get(SCORES_KEY, {}))
3. injectStyleOnce('rehearse', CSS)                                      // section 3.1
4. build the static DOM (section 2.2): header via kit header(ctx, { lede: LEDE, chips: false }); #rehearse-note and #rehearse-error (hidden);
   .rh-layout > article#rehearse-card ...; .rh-after; #rehearse-readout; the types panel; the scores panel; links = kit links(ctx)
5. pickerInstance = picker({ idPrefix: 'rehearse-decisions', onPick: (decision, value) => { state.picks[decision] = value; refreshReadout(); } })
   put pickerInstance.el into .rh-task's left column
6. the opening card:
     tokenStr = ctx.preset && ctx.preset.kind === 'token' ? ctx.preset.token : null
     parsed = tokenStr === null ? null : parseToken(tokenStr)
     unknown = tokenStr !== null && parsed === null
     id = parsed ? parsed.id : pickType(scores)
     card = parsed && parsed.seed !== null ? generate(id, parsed.seed) : nextCard(id, null, Date.now(), counter++)
     if !card:   // cannot happen for a known id; defend anyway
         for each candidate in TYPE_ORDER (starting after id): card = nextCard(candidate, null, Date.now(), counter++); if card break
         show #rehearse-error with the text of 2.4 (console.warn once)
     showCard(card, { focus: false })
     if unknown: #rehearse-note.textContent = `There is no card called "${shorten(tokenStr, 24)}". Here is the type you need most.`; show it
7. buildTypes(); refreshTypes(); refreshScores(); refreshNext()
8. observer = new ResizeObserver(refreshAnswerHint) on #rehearse-answer (guarded: typeof ResizeObserver === 'function')
9. offTheme = ctx.theme.onThemeChange(() => plane && plane.requestDraw())
10. window.__mv.rehearse = hook (4.7); mountMs = performance.now() - t0
11. return unmount (4.8)
```
No `scrollTo`, no focus move (ARCH 10.1.2). `shorten(s, n)` is `s.length > n ? s.slice(0, n - 3) + '...' : s`.

### 5.4 `showCard`, `nextCard`, seeds, the address bar

```
freshSeed(now, counter) = ((now >>> 0) ^ Math.imul(counter + 1, 0x9E3779B1)) >>> 0
nextCard(id, prev, now, counter):
  for attempt in 0..11:
     seed = freshSeed(now + attempt, counter + attempt)
     if prev and seed === prev.seed continue
     card = generate(id, seed); if !card return null
     if !prev or card.statement !== prev.statement or attempt === 11 return card
  return generate(id, ((prev ? prev.seed : 0) + 1) >>> 0)               // every attempt hit prev.seed: practically never
showCard(card, { focus }):
  1. dispose the old card's pieces: plane.destroy(); explainer.destroy(); pickerInstance.reset(); pickerInstance.disable(false); clear the choice chips, steps, answer, worked, ex host
  2. state = { id: card.id, seed: card.seed, card, picks: { address: null, names: null }, guess: null, touched: false, choice: null, revealed: false, verdict: null, detail: '' }
  3. problem = problemById(card.id); kind = card.sketch.kind
  4. #rehearse-card attributes: data-problem = id, data-seed = seed, data-revealed = 'false', data-kind = kind, data-station = card.station, data-tone = toneOf(problem)
       toneOf(p): tones = set of addressTones(p.address) minus '--'; size 1 -> that tone ('cart' or 'polar'); else 'accent'
  5. title "Card for type <id>"; statement: replaceChildren(); appendStatement(statementEl, statementParts(card.statement))
  6. hide and empty: #rehearse-place, #rehearse-result, #rehearse-verdict (remove its data-* attributes), #rehearse-open-note, #rehearse-score-storage keeps its state
  7. #rehearse-prompt.textContent = typeset(card.sketch.prompt)
  8. buildGuessUi(card)                                                    // 5.5 and 5.6
  9. reveal button: disabled = false, textContent = 'Reveal'
 10. refreshTypes(); refreshNext(); refreshReadout(); the readout aria-live = 'off'
 11. syncUrl(card)
 12. if focus: statementEl.focus()                                         // students only; never on mount
syncUrl(card): hash = '#rehearse-' + idKey(card.id) + '-s' + card.seed
   try { if (location.hash !== hash) history.replaceState(history.state, '', hash) } catch (e) { /* sandboxed: leave the bar alone */ }
```
Another one: `showCard(nextCard(state.id, state.card, Date.now(), counter++), { focus: true })`. A type chip or Next type: `showCard(nextCard(id, null, ...), { focus: true })`.
Why `replaceState` and not `navigate` (D5): the click handler must finish with the new card on screen so `data-seed` and `data-revealed` are right the moment the click returns; `replaceState` does not fire `hashchange`.

### 5.5 The guess plane (kinds `roots`, `point`, `circle`, `line`, `sector`)

```
buildGuessUi(card):
  kind = card.sketch.kind
  hide #rehearse-choice, #rehearse-plane-host, #rehearse-handle-hint; clear the host
  if kind in { roots, point, circle, line, sector }:
     fit = card.sketch.fit ?? { center: {re: 0, im: 0}, halfWidth: 3 }; cx, cy, hw from fit
     plane = createPlane(host, { id: 'rehearse-plane', xRange: [cx - hw, cx + hw], yRange: [cy - hw, cy + hw],
                                 grid: gridFor(problem), axes: true, axisLabels: axisFor(card.id), interactive: false, controls: false, legend: false,
                                 aspect: 1, maxWidth: 460, tickLabels: true, ariaLabel: typeset(card.sketch.prompt) })
     step = niceStep(hw)
     for spec of startGuess(card):
        handles.push(plane.addPoint({ id: spec.id, z: spec.z, color: '--input', label: spec.label, name: spec.name, radius: 8, step, draggable: true,
                                      onDrag: (z, info) => { state.touched = true; refreshReadout(); } }))
     plane.addLayer(drawGuessLayer, { order: 20 })
     host.hidden = false; handleHint.hidden = false; handleHint.textContent = `Arrow keys move a focused dot by ${step}. Shift is ten times that, Alt is a tenth.`
  if kind === 'choice': buildChoice(card.sketch.options) (5.6); #rehearse-choice.hidden = false
gridFor(p): tones = new Set(addressTones(p.address)); tones.size === 2 -> 'both'; tones.has('--polar') -> 'polar'; else 'cart'
axisFor(id): ['2.1.1','2.1.2','2.1.3','2.2.1','2.3.1','2.5.1','3.1.1','3.1.2','3.2.1','P4','P5','P6','P7'].includes(id) ? ['u', 'v'] : ['Re', 'Im']
niceStep(hw): the first of [0.5, 0.25, 0.1, 0.05] that is <= hw / 16, else 0.05
```
`tickLabels` stays true. The plane is `interactive: false` (no zoom buttons, no wheel capture, the page scrolls over it); `controls`/`legend` are off because the guess plane has neither.

**`startGuess(card)`** (pure, deterministic; section 2.6 table gives the roles). Fractions are of `hw` from the view centre `(cx, cy)`: `at(fx, fy) = { re: round3(cx + fx * hw), im: round3(cy + fy * hw) }`.

```
roots, point:  n = roots ? sketch.n : sketch.count; targets = sketch.target.points
  slots(n, fy):  n === 1 ? [at(0, fy)] : for i in 0..n-1: at(-0.72 + 1.44 * i / (n - 1), fy)
  candidates: A = slots(n, -0.8); B = slots(n, +0.8);
              C (only n >= 2) = first ceil(n/2) slots of slots(ceil(n/2), -0.8) then the other floor(n/2) of slots(floor(n/2), -0.55) with the x positions of a row of floor(n/2)
  choose the first candidate with:  min over (start, target) of |start - target| >= 0.15 * hw   and   min over start pairs >= 0.12 * hw   and   check(card, start points).ok !== true
  else candidate A
  ids 'g0'...; label ''; names: roots -> `Root guess ${k + 1} of ${n}`; point -> count === 1 ? 'Your point' : `Point guess ${k + 1} of ${count}`
circle:  candidates (centre, rim) = [(-0.5, -0.45), (-0.1, -0.45)], [(0.5, -0.45), (0.1, -0.45)], [(-0.5, 0.45), (-0.1, 0.45)], [(0.5, 0.45), (0.1, 0.45)]
  choose the first with check(card, [c, r]).ok !== true and |c - target.center| >= 0.3 * hw; else the first
  ids 'c', 'r'; labels 'centre', 'rim'; names 'Centre of your circle', 'Rim point of your circle'
line:    candidates = [(-0.6, -0.6), (0.6, -0.6)], [(-0.6, 0.6), (0.6, 0.6)], [(-0.6, -0.6), (-0.6, 0.6)], [(0.6, -0.6), (0.6, 0.6)]
  choose the first with check(card, [a, b]).ok !== true and both points >= 0.2 * hw from the target line (|(p - target.point) x target.dir|); else the first
  ids 'a', 'b'; labels 'point 1', 'point 2'; names 'First point on your line', 'Second point on your line'
sector:  radius 0.6 * hw about the ORIGIN; candidate angle pairs in degrees: (60, 160), (-50, 110), (120, 250), (200, 300)
  choose the first whose two angles are each > 20 degrees from both target edges (target.from, target.to; angular distance via wrapArg) and > 25 degrees from each other; else the first
  ids 's0', 's1'; labels 'edge 1', 'edge 2'; names 'First edge of your sector', 'Second edge of your sector'
choice, none: []
```
(`x` in the line test is the 2-D cross product.) The generator's `check` is called with the candidate as a guess, so a start can never be a right answer, and no start lies within 15 % of the view from an answer point.

**The live layer** `drawGuessLayer(ctx, plane)` (plane layer, order 20; does nothing once `state.revealed`):
```
pts = handles.map(h => h.z)
circle: R = |pts[1] - pts[0]|; drawCircle(ctx, plane, pts[0], R, { color: '--input', dash: DASH.guide, fill: '--input', fillAlpha: 0.06, width: 2 }); drawSegment(ctx, plane, pts[0], pts[1], { color: '--input', dash: DASH.guide, width: 1.5 })
line:   d = pts[1] - pts[0]; if |d| > 1e-9: u = d / |d|; L = 4 * view span; drawSegment(ctx, plane, pts[0] - u L, pts[1] + u L, { color: '--input', dash: DASH.guide, width: 1.5 })
sector: for p of pts with |p| > 1e-6: drawRay(ctx, plane, Arg(p), { color: '--input', width: 1.5 })
roots, point: nothing (the handles are the guess)
```
A layer that throws is disabled by the plane (it shows a note), so the layer never reads `state.card` after a card change: it closes over the card it was made for.

### 5.6 The choice group

```
buildChoice(options):                    // exactly 4 strings (generators guarantee it)
  for k in 0..3: chip = button#rehearse-choice-k.chip, type=button, role=radio, aria-checked=false, tabindex = k === 0 ? 0 : -1
       content: ONE <span> filled by prose(span, typeset(options[k]))      // exponents (v^2) raised, ASCII notation typeset
  select(k): state.choice = k; each chip i: aria-checked = String(i === k), tabindex = i === k ? 0 : -1; refreshReadout()
  click on chip k: select(k)
  keydown on a chip k (the group handles it):
     ArrowDown, ArrowRight: j = (k + 1) % 4; chips[j].focus(); select(j)
     ArrowUp, ArrowLeft:    j = (k + 3) % 4; chips[j].focus(); select(j)
     Home: j = 0; End: j = 3 (focus and select)
     Enter, Space: select(k); preventDefault
  all of those preventDefault (the page must not scroll on an arrow key)
```
After Reveal: every chip `aria-disabled="true"`, `tabindex="-1"` except the selected or the correct one; the correct chip gets `data-mark="right"` (CSS adds "✓ correct"); a wrong selected chip gets `data-mark="wrong"` ("✗ your pick").

### 5.7 Reveal, the verdict, the score

```
verdict(card, picks, guess):
  p = problemById(card.id); if !p return { address: null, names: null, guess: null, right: false }
  picks = picks ?? {}
  address = picks.address == null ? null : picks.address === p.address
  names   = picks.names   == null ? null : picks.names   === p.names
  g = guessResult(card, guess)
  right = address === true && names === true && g !== false
  return { address, names, guess: g, right }
guessResult(card, guess):
  if guess == null return null; if Array.isArray(guess) and guess.length === 0 return null
  if card.sketch.kind === 'none' return null
  r = check(card, guess); return r.ok === null ? null : r.ok === true
```
`guess` is `null`/`undefined` for "no guess" (a plane whose handles were never touched, a choice never selected, a proof).

```
reveal():
  if state.revealed return
  1. guess = (kind is a plane kind and !state.touched) or (kind is choice and state.choice === null) or kind is none ? null : guessNow()
        guessNow: plane kinds -> handles.map(h => ({ re: h.z.re, im: h.z.im })) ; choice -> state.choice
  2. v = verdict(card, state.picks, guess); detail = guess === null ? '' : typeset(check(card, guess).detail)
  3. state.revealed = true; state.guess = guess; state.verdict = v; state.detail = detail
  4. scoring: fresh = sanitizeScores(get(SCORES_KEY, {})); next = recordScore(fresh, card.id, v.right, Date.now()); wrote = set(SCORES_KEY, next); scores = next
        if v.right: set('progress', setTicked(sanitizeProgress(get('progress', {})), card.id, true))
        if wrote === false: show #rehearse-score-storage
  5. pickerInstance.mark({ address: v.address, names: v.names, expected: { address: p.address, names: p.names } }); pickerInstance.disable(true)
  6. #rehearse-card data-revealed = 'true'; reveal button: textContent 'Revealed', disabled
  7. the verdict element: data-address = word(v.address), data-names = word(v.names), data-guess = word(v.guess), data-right = String(v.right); remove hidden;
        head.textContent = verdictSentence(v, kind); guess line: kind === 'none' ? hidden : textContent = guess === null ? 'Guess: skipped.' : 'Guess: ' + detail (+ ' The answer is: ' + typeset(correct option) + '.' when kind is choice and v.guess === false)
        score note: `Score for ${id}: ${scores[id].right} right of ${scores[id].tried} tried.`
        word(x) = x === true ? 'right' : x === false ? 'wrong' : 'skipped'
  8. place: "This card lives at " + a#rehearse-place-link(href '#' + card.station, titleSpan(station.title)) + ". The handout's version is " + a#rehearse-handout-link(href '#problem-' + idKey(id), 'problem ' + id) + ".";  hidden = false
        same place + aha lines; choice chips marked
  9. the picture (5.8): destroy the guess plane; make the picture plane in the host (host.hidden = false); caption text
 10. the step list (5.8.3) when stepList(card) is not null
 11. answer: tex(answerBox, card.answer.tex, { display: true }); answerText.textContent = card.answer.text; refreshAnswerHint()
 12. explainer (5.9): data = explainerData(card); explainer = createExplainer(exHost, { id: 'rehearse-ex', title: 'The same numbers in both addresses',
        columns: [{ key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true, short: 'Cartesian' }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true, short: 'Polar' }],
        rows: data.rows.map(r => ({ id: r.id, label: r.label, cart: () => r.cart, polar: () => r.polar, native: r.native })), same: () => data.same, sameLabel: data.sameLabel }); explainer.update(card)
 13. worked: prose(workedCartP, card.worked.cart); prose(workedPolarP, card.worked.polar)
 14. exits: req = requestFor(card); openStation.hidden = !req; if req: replace its content with ONE span "Open at " + titleSpan(shortTitle(station.title)) text + " with these numbers"; else show #rehearse-open-note
        lab = labRequestFor(card); openLab.hidden = !lab
 15. #rehearse-result.hidden = false; the readout aria-live = 'polite'; refreshReadout(); refreshTypes(); refreshScores(); refreshNext()
 16. verdictEl.focus()                                                    // tabindex -1; scrolls the verdict into view
```
The Reveal button never has a child element with an id (D12). A second press is ignored (the button is disabled; `reveal()` also returns at once).

### 5.8 The picture

**5.8.1 `fitView(points, extra = 0)`** (the same rule as the generators' `fitFor`, so a guess plane and its picture share a view):
```
x0 = x1 = y0 = y1 = 0                                   // the origin is always held
for p of points with finite parts: x0 = min(x0, p.re - extra); x1 = max(x1, p.re + extra); y0 = min(y0, p.im - extra); y1 = max(y1, p.im + extra)
half = max((x1 - x0) / 2, (y1 - y0) / 2)
return { center: { re: round3((x0 + x1) / 2), im: round3((y0 + y1) / 2) }, halfWidth: max(1.5, Math.round((1.35 * half + 0.6) * 100) / 100) }
```
`fitView([{re: 1, im: 1}, {re: 0, im: 2}], 0)` is `{ center: { re: 0.5, im: 1 }, halfWidth: 1.95 }` (the generated 2.2.2 view).

**5.8.2 `pictureOf(card)`** returns `{ view, items, caption, alt, station }`: `view = card.sketch.fit` for the five guess kinds, otherwise `fitView(<the fit points of the recipe>, <extra>)`; `items` per Appendix A (ordered: fills, then lines, then addresses, then dots; labels are placed last by the drawer); `caption` and `alt` the one sentence of Appendix A (`alt` equals `caption`); `station = card.station`. All numbers come from `card.given`, `card.answer.values` and `card.sketch.target`, never from the DOM.

**Far points (the rule that keeps small numbers readable).** Five families have an answer that can be much farther from 0 than the numbers it is made of: 1.1.1 (the product, up to length 50), 1.1.2 (z₁ ± z₂), P1 (both products), P2 (z · conj z, up to 50) and P3 (ac and ad + b). Their recipes in Appendix A list *anchor* points (always in the view) and *flexible* points (marked `~`). The view is `fitView(anchors + flexible + baseline, extra)` where `baseline` is the four points (±1.2, 0), (0, ±1.2) for P1 only. **While `halfWidth > 9` and a flexible point remains, the flexible point of largest modulus leaves the fit and is marked far.** A far point is not drawn as a dot: it becomes a `ray` from 0 at its Arg (tone of the dot, label `<name> is off this picture: length <fmtNum(r)>`) and an `arc` from 0 to its Arg at radius 0.5 · halfWidth (tone polar, arrow, label `Arg = <fmtAngle(Arg, { unicode: true })>`); a segment or an address that mentions a far point is dropped. Measured over 400 seeds each: the final halfWidth is at most 8.97, and a far point occurs on 321 of 400 cards of 1.1.1 and on most cards of P1; so most of these pictures are rays plus a label, and say so.

**5.8.3 `stepList(card)`** (ids 1.4.1, 1.4.2, 2.2.2; `null` otherwise):
```
c = id === '1.4.1' ? 1 : card.given.c  (2.2.2: card.given.w);  n = card.given.n;  base = Arg(c)  (0 for c = 1)
name = id === '2.2.2' ? 'w' : 'c';  A = fmtAngle(base, { unicode: true })          // 'π', '0', 'π/2', '-π/2', or a 3-decimal number
for k in 0..n-1:  theta = (base + 2π k) / n                                       // a NAME of an angle, not wrapped
   text = `k = ${k}: (${A} + ${k === 0 ? '0' : 2 * k + 'π'})/${n} = ${fmtAngle(theta, { unicode: true })} (${fmtNum(theta * 180 / π, 3)}°)`
   2.2.2 only: append k === 0 ? ' (the principal root: the home step only)' : ' (another root)'
   home = (k === 0)
title  = id === '2.2.2' ? `The names of arg w, each divided by ${n}` : `The steps of arg c, each divided by ${n}`
footer = `k = ${n} is k = 0 again.`
```
Worked check (1.4.2, c = −81, n = 4): `A = 'π'`; rows `k = 0: (π + 0)/4 = π/4 (45°)`, `k = 1: (π + 2π)/4 = 3π/4 (135°)`, `k = 2: (π + 4π)/4 = 5π/4 (225°)`, `k = 3: (π + 6π)/4 = 7π/4 (315°)`. (1.4.1, n = 5): `k = 1: (0 + 2π)/5 = 2π/5 (72°)`, `k = 4: (0 + 8π)/5 = 8π/5 (288°)`.

**5.8.4 Drawing the picture.** At Reveal, `host.replaceChildren()`, then
```
plane = createPlane(host, { id: 'rehearse-plane', xRange: [cx - hw, cx + hw], yRange: [cy - hw, cy + hw], grid: gridFor(problem), axes: true, axisLabels: axisFor(id),
                            interactive: false, controls: false, aspect: 1, maxWidth: 460, tickLabels: true, ariaLabel: pic.alt })
for each item with k === 'curve': plane.addCurve({ id: 'rehearse-curve-' + i, points: item.points, color: token(item.tone), ramp: item.ramp !== false, arrow: true, dots: true })   // legend true when ramped
plane.addLayer(drawPicture, { order: 10 })
if the guess is points or a circle/line/sector: plane.addLayer(drawGuessRings, { order: 20 })
```
`token(tone)`: `cart` `--cart`, `polar` `--polar`, `input` `--input`, `output` `--output`, `seam` `--seam`, `ok` `--ok`, `warn` `--warn`, `danger` `--danger`, `text` `--text`, `muted` `--text-muted`.

```
drawPicture(ctx, plane):                         // never throws; unknown item kinds are skipped
  A. fills:   disk -> drawCircle({ fill: token, fillAlpha: alpha, alpha: 0 })  (no outline); wedge -> drawPolygonFill over the origin and the arc points (>= 24 points per half turn);
              annulus -> drawCircle(centre, r1, { color, fill: token, fillAlpha: 0.12, innerRadius: r0, dash: outerIncluded ? null : DASH.excluded }) then drawCircle(centre, r0, { color, dash: innerIncluded ? null : DASH.excluded })
  B. lines in item order, every one with obstacle: true so the words of pass E keep clear of it (ARCH 10.2.8): circle (drawCircle), ray (drawRay), seam (drawSeam; muted: color '--seam' with alpha 0.6), segment (drawSegment),
              line (drawSegment between point -/+ dir * span, span = 4 * 2 * hw + |point|), arc (drawArc), polygon (drawSegment pairs, closed)
  C. addresses: cartAddr -> drawCartAddress(ctx, plane, z, { color: '--cart', names }) ; polarAddr -> drawPolarAddress(ctx, plane, z, { color: '--polar', name, ghosts, ghostsNeg })
  D. dots: filled -> drawDot(ctx, plane, z, { color: token, radius: size }) ; ring -> a stroked circle of radius size + 1 at plane.toPixel(z), lineWidth 2 (state saved and restored)
  E. words (last, so they see every line): place = createLabelPlacer(ctx, plane); for each item with a label, in item order, place.put(label, cands, { color: token, knockout: true })
       dot: [{ z, dx: 8, dy: -8, align: 'left' }, { z, dx: -8, dy: -8, align: 'right' }, { z, dx: 8, dy: 16, align: 'left' }, { z, dx: -8, dy: 16, align: 'right' }]
       circle: four spots on the circumference at 45, 135, 225, 315 degrees, offset 8 px outward
       segment: sideCands(plane, a, b);  ray and line: a spot at 0.75 of the way to the view edge;  arc: the point at the mid angle, 8 px outward
drawGuessRings(ctx, plane):                      // after Reveal, the student's guess, over the answer
  roots, point: pairs = matchGuesses(target.points, guess); for each pair with a guess: drawSegment(target, guess, { color: pair.dist <= tol ? '--ok' : '--warn', dash: DASH.guide, width: 1.5 }); then a ring of radius 8 in '--input' at every guess point
         tol = min(0.25, max(base, 0.04 * hw)) with base = roots ? min(0.2, 0.12 * |target[0]|) : 0.15     (generators' tolerance, D4 of i2-generators)
  circle: the student's circle dashed in '--input' and rings at its two handles; line: the student's line dashed; sector: the two student rays dashed
```
The picture plane is drawn once and redrawn on resize and theme change by the plane itself; there is no animation loop.

### 5.9 `explainerData(card)`

A pure switch on `card.id`. It returns `{ rows, same, sameLabel }`; each row is `{ id, label, cart, polar, native, num }`: `cart` and `polar` are TeX strings (or `null`: an empty cell), `native` is `'cart'`, `'polar'` or `null`, `num` is the number the row stands for (a real number or `{ re, im }`) so tests do not parse TeX. `same` is the footer: `{ cart: TeX, polar: TeX, agree: boolean }` where **`cart` is the value reached by the Cartesian route and `polar` the value reached by the polar route, computed independently from `card.given` and `card.answer.values`, and `agree` is true exactly when they are equal to `1e-8 · max(1, |value|)` and equal to the card's own answer**. The routes for every family are in Appendix B and were prototyped over 120 seeds of every family (3,480 cards, zero disagreements). Rules for the TeX:

- Only `\operatorname`, `\dfrac`, `\tfrac`, `\overline`, `\text{ASCII}`, `\left ... \right`, `\cdot`, `\mapsto`, `\pm`, `\le`, `\neq`, `\to`, `\approx`, `\cos`, `\sin`, `\pi`, `\theta`, `\varphi`, `\rho`: no `\textcolor` (the columns tint the cells), no custom macro (`\Arg` is avoided: write `\operatorname{Arg}`), no non-ASCII character inside TeX. A unit test renders every cell with `strict: 'error'`.
- A negative number inside a square is bracketed: `sq(x) = x < 0 ? '\\left(' + tn(x) + '\\right)^2' : tn(x) + '^2'`.
- A radius or length with no exact form in `texNumber` (√13, √221, √29) is a three-decimal number: `texNumber` already falls back; never write `0.000`.
- `texExp(r, theta)` (local) is `r\,e^{i\theta}` with `r` omitted when it is 1, `theta` printed by `texAngle` (a name, not wrapped, for roots), and a minus written as `e^{-i...}`.
- An angle says which it is in the row label: "Arg c (the home step)", "a name for arg c", "arg z (the set)".

### 5.10 `matchGuesses(targets, guesses)`

```
used = new Set(); out = []
for t of targets: best = -1; bd = Infinity
   guesses.forEach((g, i) => { if (!used.has(i)) { d = hypot(t.re - g.re, t.im - g.im); if (d < bd) { bd = d; best = i; } } })
   if best >= 0 used.add(best)
   out.push({ target: t, guess: best >= 0 ? guesses[best] : null, dist: best >= 0 ? bd : Infinity })
return out
```
It is the same greedy matching `check()` uses, so a pair drawn "within tolerance" is exactly what `check` accepts.

### 5.11 The types and the score strip

```
buildTypes(): for g of typeGroups(): div#rehearse-group-<g.key>[role=group][aria-labelledby=rehearse-group-<g.key>-title]; h3#rehearse-group-<g.key>-title (g.title); div.rh-types;
   for id of g.ids: button#rehearse-type-<idKey(id)>.chip.rh-type[type=button]; children: <span>id</span><span class="rh-count"></span> (spans have no ids)
refreshTypes(): for each chip: e = scores[id] ?? { tried: 0, right: 0 }; data-tried = e.tried; data-right = e.right; count span = `${e.right}/${e.tried}`;
   aria-label = `Type ${id}: ${e.right} right of ${e.tried} tried`; aria-pressed = String(id === state.id)
refreshScores(): s = scoreSummary(scores); #rehearse-score-line = s.tried === 0 ? 'Nothing rehearsed yet. The first card is the type you need most.' : `Right at least once: ${s.typesRight} of ${s.total} types. Cards tried: ${s.tried}.`
   progress#rehearse-score-bar value = s.typesRight (max 29); each span#rehearse-score-<idKey>: data-tried, data-right, aria-label `${id}: ${right} right of ${tried} tried`, title the same
refreshNext(): #rehearse-next-type.textContent = `The type I need most: ${pickType(scores)}`
```
A click on a type chip is `showCard(nextCard(id, null, Date.now(), counter++), { focus: true })`.

### 5.12 Resolution, resize, and the plane's life

The plane owns the canvas: it is devicePixelRatio aware, observes its own size and redraws on resize and theme change. The station adds no canvas, no resize listener and no `requestAnimationFrame` loop. The host `#rehearse-plane-host` is `width: 100%; max-width: 460px` and the plane `aspect: 1`, so the square is 358 px at 390 px, 460 px on a wide screen; the picture plane at Reveal is created in the same host with the same options, so the card does not jump. Views are in plane units, so a rotation or a window resize keeps every handle where it was in the maths.

### 5.13 Focus rules

Mount moves no focus. After a student action that replaces the card (`Another`, a type chip, `Next type`), focus goes to `#rehearse-statement` (so a screen reader reads the new card from its top). After Reveal, focus goes to `#rehearse-verdict` (the Reveal button is now disabled and the guess handles are gone, so nothing may be left focused on a removed node). Both targets have `tabindex="-1"`: reachable by script and by a click, never a tab stop.

### 5.14 `readoutText(state)`

```
state = { id, seed, picks: { address, names }, count (handles in the plane, 0 for none/choice), touched, choice, revealed }
dec = (picks.address == null && picks.names == null) ? 'not set'
      : `${picks.address == null ? '?' : addressLabel(picks.address, { short: true })} / ${picks.names == null ? '?' : picks.names}`
g   = choice != null ? `choice ${choice}` : (touched && count > 0) ? `${count} point${count === 1 ? '' : 's'}` : 'none'
return `type ${id}; seed ${seed}; decisions: ${dec}; guess: ${g}; revealed: ${revealed ? 'yes' : 'no'}`
```
Examples: `type 1.4.2; seed 7; decisions: not set; guess: none; revealed: no` (A1); after the two chips and four drags `type 1.4.2; seed 7; decisions: P→C / all; guess: 4 points; revealed: no`; `type P5; seed 1; decisions: P / any; guess: choice 3; revealed: no`; after Reveal `... revealed: yes`. `P→C` is `addressLabel('P->C', { short: true })`.

### 5.15 `typeset(text)`

```
s = String(text ?? '')
1. s = s.replace(/sqrt\(([^()]+)\)/g, (m, a) => /^\d+$/.test(a) ? '√' + a : '√(' + a + ')')
2. s = s.replace(/\b(\d*)pi\b/g, '$1π')
3. s = s.replace(/\btheta\b/g, 'θ')
4. s = s.replace(/ <= /g, ' ≤ ').replace(/ >= /g, ' ≥ ').replace(/ \+- /g, ' ± ').replace(/ -> /g, ' → ')
5. s = s.replace(/(\d)\s?degrees?\b/g, '$1°')
6. s = s.replace(/(?<![A-Za-z0-9_])([zw])([012])(?![A-Za-z0-9_(])/g, (m, v, d) => v + '₀₁₂'[Number(d)])
return s
```
Expected: `typeset('Pick z1 z2.') = 'Pick z₁ z₂.'`; `typeset('sqrt(50) ~ 7.071') = '√50 ~ 7.071'`; `typeset('-5pi/6 < theta < 3pi/2') = '-5π/6 < θ < 3π/2'`; `typeset('0 <= t <= 1') = '0 ≤ t ≤ 1'`; `typeset('An edge is off by more than 5 degrees.') = 'An edge is off by more than 5°.'`; `typeset('2 e^(i pi/4)') = '2 e^(i π/4)'`; `typeset('sqrt(a + b)') = '√(a + b)'`; `typeset('T1(z) and pipe') = 'T1(z) and pipe'`; `typeset(null) = ''`. It is applied to `card.sketch.prompt`, `check().detail`, the four options and the "The answer is" line; **not** to `answer.text` (D11).

### 5.16 Hit testing

There is none to write: the plane's DOM handles are buttons with pointer events, drag clamping and keyboard nudging (ARCH 3.5). The station only chooses where the handles start (5.5) so that no start covers another handle or an answer point, which `dragHandle` needs (it fails when the handle's centre is covered).

---

## 6. Mathematics

The station computes very little itself (the generators own the answers). What it computes is: the address bar and scores (no maths), the starting positions of the handles, the view of every picture, the polar reading of lines and circles, and the numbers of the explainer. Every formula below was prototyped against `generate(id, seed)` for all 29 families and 120 seeds each (explainer routes: 3,480 cards, 0 disagreements; start positions: 2,000 guess cards, 0 failures; picture containment: 5,800 cards, 0 failures). Every number below was checked by hand and by computer.

### 6.1 Formulas

1. **Roots.** For c ≠ 0 and n ≥ 2: r = \|c\|^(1/n), θ_k = (Arg c + 2πk)/n (a *name*, not wrapped), z_k = r e^{iθ_k} = r cos θ_k + i r sin θ_k, k = 0 … n − 1; z_k^n = c; k = n gives k = 0 again. Principal root (2.2.2): k = 0 only, θ_0 = Arg(w)/n.
2. **Quadratic (1.4.3).** z² + bz + c = 0, disc = b² − 4c. Completing the square: (z − p)² = −q² with p = −b/2, q² = c − p²; z − p = ±q i; roots p ± qi (a mirror pair across the real axis). Polar: disc = \|disc\| e^{iπ} (Arg = π for disc < 0), its square roots are \|disc\|^(1/2) e^{±iπ/2}.
3. **Line (2.1.3 image, 2.5.1 image of a circle).** Unit normal (nu, nv) and k with nu·u + nv·v = k (the card's `lineEq`), **normalised so that k ≥ 0** (flip the signs of nu, nv, k when k < 0; when k = 0 flip so that nv > 0, or nv = 0 and nu > 0). Polar reading: r cos(θ − α) = k with α = Arg(nu + i nv); when k = 0 the line is the two rays θ = α + π/2 and θ = α − π/2 (the card's direction and its opposite). The foot of the perpendicular is (nu k, nv k), the distance from 0 is k.
4. **Circle.** \|z − a\| = R: (x − a_x)² + (y − a_y)² = R². Polar about the origin (law of cosines): r² − 2 r \|a\| cos(θ − Arg a) + \|a\|² = R²; for a = 0 simply r = R; when the circle passes through 0 (\|a\| = R) it is r = 2R cos(θ − Arg a).
5. **Reciprocal (2.5.1).** w = 1/z = (1/r) e^{−iθ} = conj z/\|z\|². The circle \|z − a\| = \|a\| goes to the line Re(a·w) = 1/2: nu = Re a/\|a\|, nv = −Im a/\|a\|, k = 1/(2\|a\|). The line x = c (c ≠ 0) goes to the circle \|w − 1/(2c)\| = 1/(2\|c\|) through 0. A circle through 0 becomes a line because 0 goes to ∞; a line that misses 0 becomes a circle through 0.
6. **Fan (2.2.1).** z = r e^{iθ} ↦ r^n e^{inθ}: the sector 0 < arg z < α becomes 0 < arg w < nα (stated with arg, because nα may exceed π). Edge check: (e^{iα})^n = e^{inα}; its Arg is wrapArg(nα), which equals nα only when nα ≤ π.
7. **Parabola (2.1.2).** x = c: z = c + iy, z² = (c² − y²) + 2cy i, so u = c² − v²/(4c²); y = c: u = v²/(4c²) − c². Focus at 0 for every c. Polar: ρ(1 + cos φ) = 2c² (x = c) and ρ(1 − cos φ) = 2c² (y = c), with ρ = \|w\| and φ a name of arg w.
8. **Limits (2.3.1, P5).** z/conj z = e^{2iθ} (θ a name for arg z); along y = mx, θ = atan m, so the value is e^{2i atan m} = ((1 − m²) + 2mi)/(1 + m²); along x = 0 it is −1; along y = x² or y = x³ it tends to 1. P5: x/z = cos θ e^{−iθ} = ½ + ½ e^{−2iθ}: along y = mx it is 1/(1 + mi); along x = 0 it is 0; along y = x², x³ it tends to 1; all directions together fill the circle \|w − ½\| = ½.
9. **Direction circle (3.1.1, 3.1.2, 3.2.1, P6).** (f(z₀ + h) − f(z₀))/h → A + B e^{−2iφ} for h = ρe^{iφ}, A = ½(f_x − i f_y), B = ½(f_x + i f_y). Real h (φ = 0): A + B; imaginary h (φ = π/2): A − B; centre A, radius \|B\|. Differentiable at z₀ iff B = 0 iff u_x = v_y and u_y = −v_x; then f′(z₀) = A = u_x + i v_x, of length \|f′\| (the local stretch) and Arg f′ (the local turn).
10. **View.** `fitView(points, extra)`: half = max(half-extent in x, in y) over the points and the origin, each point grown by `extra`; halfWidth = max(1.5, round((1.35 · half + 0.6) · 100)/100); centre = round3 of the middle of the box. **Far points** (5.8.2): while halfWidth > 9, the flexible point of largest modulus leaves the fit and is drawn as a ray with a label.
11. **Start positions.** Fractions of the half width from the view centre: tray rows at −0.8 and +0.8 (and a split tray at −0.8 and −0.55), x from −0.72 to +0.72; circle (−0.5, −0.45) with rim (−0.1, −0.45) and its mirror images; ten line pairs (5.5); sector angle pairs (60°, 160°), (−50°, 110°), (120°, 250°), (200°, 300°) at radius 0.6 hw. A start is accepted only when `check` fails on it and it keeps its clearance from the answer (5.5).
12. **Tolerances for the miss lines** (the generators' D4): point 0.15; roots min(0.2, 0.12 · R); each capped into [base, 0.25] with base raised to 0.04 · hw on a big view; circle centre 0.2 and radius max(10 %, 0.05); line 0.15 per point; sector 5°.
13. **Scores.** right ⇔ address = P's address ∧ names = P's names ∧ guess ≠ wrong; `tried` += 1 and `right` += (right ? 1 : 0) per revealed card.
14. **Seeds.** `freshSeed(now, counter) = ((now >>> 0) ^ Math.imul(counter + 1, 0x9E3779B1)) >>> 0`, in [0, 2³² − 1]; `generate` stores the seed as that uint32 (`card.seed === seed`).

### 6.2 The three pinned cards, worked in both addresses

**(a) `generate('1.4.2', 7)`: the 4th roots of −81** (the card of A1 and A6; `given = { c: −81, n: 4 }`; address P→C, names all).
- *Polar (native).* \|c\| = 81, Arg c = π (a negative real has Arg π, not −π). r = 81^(1/4) = 3. θ_k = (π + 2πk)/4: π/4, 3π/4, 5π/4, 7π/4 (the home steps of these names are π/4, 3π/4, −3π/4, −π/4). z_k = 3 e^{iθ_k}. k = 4 gives θ = 9π/4 = π/4 + 2π: the same point as k = 0.
- *Cartesian.* 3 cos(π/4) = 3 sin(π/4) = 3√2/2 = 2.1213203436, so z₀ = 2.1213 + 2.1213i, z₁ = −2.1213 + 2.1213i, z₂ = −2.1213 − 2.1213i, z₃ = 2.1213 − 2.1213i.
- *Check (hand).* (2.1213 + 2.1213i)² = 2.1213²(1 − 1) + 2·2.1213²·i = 9i; (9i)² = −81 ✓. Polar: (3e^{iπ/4})⁴ = 81 e^{iπ} = −81 ✓.
- *On the screen:* radius cell Cartesian `\left(\sqrt{(-81)^2 + 0^2}\right)^{1/4} = 3`, polar `\left|c\right|^{1/4} = 81^{1/4} = 3` (same 3); first root `\frac{3\sqrt{2}}{2} + \frac{3\sqrt{2}}{2}i` and `3\,e^{i\frac{\pi}{4}}`; footer `-81` and `-81`, `agree`. View: centre 0, halfWidth 3.87 (the card's `fit`). Start handles (5.5, tray A): g0 (−2.786, −3.096), g1 (−0.929, −3.096), g2 (0.929, −3.096), g3 (2.786, −3.096) (computed from 0.8 · 3.87 = 3.096 and 0.72 · 3.87 = 2.786, 0.24 · 3.87 = 0.929). Tolerance for roots: min(0.2, 0.12 · 3 = 0.36) = 0.2; 0.04 · 3.87 = 0.155 is smaller, so it stays 0.2.
- Step list: `k = 0: (π + 0)/4 = π/4 (45°)`, `k = 1: (π + 2π)/4 = 3π/4 (135°)`, `k = 2: (π + 4π)/4 = 5π/4 (225°)`, `k = 3: (π + 6π)/4 = 7π/4 (315°)`; footer `k = 4 is k = 0 again.`

**(b) `generate('2.5.1', 3)`: the image of the line x = 1 under w = 1/z** (`given = { line: { c: 1 } }`, sketch kind `circle`, `fit = { centre 0.5, halfWidth 1.5 }`; address P, names any; `labRequest.fn = 'recip'`).
- *Cartesian.* z = 1 + iy ↦ w = (1 − iy)/(1 + y²): u = 1/(1 + y²), v = −y/(1 + y²), so u² + v² = 1/(1 + y²) = u: (u − ½)² + v² = ¼, the circle of centre ½ and radius ½ through 0. Sample z = 1 + i ↦ w = (1 − i)/2 = 0.5 − 0.5i ✓ ((0.5 − 0.5)² + 0.25 = 0.25 ✓).
- *Polar.* On the line r cos θ = 1, so w = (1/r) e^{−iθ} has modulus cos θ and the name −θ: ρ = cos φ (φ = −θ): the circle through 0 with diameter 1 along the real axis: ρ = 2 · ½ · cos(φ − 0) ✓ (formula 4 with R = ½, Arg a = 0). Sample: z = √2 e^{iπ/4} ↦ (1/√2) e^{−iπ/4} = 0.7071 e^{−iπ/4} = 0.5 − 0.5i ✓.
- *On the screen:* picture = the circle (`--output`), its centre dot, the hollow origin labelled `0 = 1/∞`, the sample dot w. Explainer rows `centre`, `radius`, `equation`, `sample`. Open at Reciprocal (`values = { shape: { kind: 'line', a: 1, b: 1 + i } }`), open in the Lab with predict first.

**(c) `generate('P5', 1)`: the value of x/z along y = x/2** (`given = { path: { kind: 'line', m: 0.5 } }`, sketch `choice` with `correct = 3`, options `["4/5 + (2/5)i", "4/5", "1 - (1/2)i", "4/5 - (2/5)i"]`; address P, names any).
- *Cartesian.* z = x(1 + 0.5i), so x/z = 1/(1 + 0.5i) = (1 − 0.5i)/1.25 = 0.8 − 0.4i ✓ (4/5 − (2/5)i).
- *Polar.* θ = atan 0.5 = 0.46365; cos θ e^{−iθ} = 0.89443 (0.89443 − 0.44721 i) = 0.8 − 0.4i ✓. Real axis: 1; imaginary axis: 0; the other-axis value the card names is 1 (the real axis).
- *On the screen:* four radio chips (no plane before Reveal); after Reveal the circle `\|w − ½\| = ½` dashed, the three values as dots and rings, both addresses of the value.

### 6.3 Every handout problem, worked in both addresses (the numbers the unit tests pin)

For each of the 29 problems: the handout's own numbers, the Cartesian route, the polar route, and the `num` the explainer rows carry (test R8 builds the card with `solve(id, HANDOUT[id])` and compares to 1e-9; the complex ones are given as `re, im` and, in brackets, `r, Arg`).

| id | Cartesian route (numbers) | Polar route (numbers) | Pinned `num` |
|---|---|---|---|
| 1.1.1 | (3−2i)(−1+4i) = (−3+8) + (12+2)i = 5+14i; (3−2i)(−1−4i)/17 = (−3−12i+2i+8i²)/17 = (−11−10i)/17 | r₁ = √13 = 3.606, Arg z₁ = −0.588; r₂ = √17 = 4.123, Arg z₂ = 1.816; product r = √13·√17 = √221 = 14.866, Arg = 1.228; quotient r = √(13/17) = 0.874, Arg = −2.404 | product 5+14i (14.866, 1.228); quotient −0.647059−0.588235i (0.874, −2.404); length 14.866069 |
| 1.1.2 | z₁−z₂ = (3+1) + (−2−4)i = 4−6i; conjugate 4+6i; Im = 6 | 4−6i has r = √52 = 7.211, Arg −0.983; the conjugate negates it: Arg +0.983; r sin θ = 7.211·0.8321 = 6 | w 4−6i; mirror 4+6i; part 6 |
| 1.2.1 | (x−1)² + (y−2)² = 9: centre 1+2i, radius 3 | centre 1+2i = √5 e^{i1.107}; r² − 2√5 r cos(θ − 1.107) + 5 = 9; check 4+2i (r² = 20, θ = 0.4636, cos(−0.6435) = 0.8): 20 − 16 + 5 = 9 ✓ | centre 1+2i (2.236, 1.107); radius 3 |
| 1.2.2 | (4+3i)−(−1+i) = 5+2i; distance √(25+4) = √29 = 5.385 | 5+2i: r = 5.385, Arg = 0.381 | slide 5+2i; length 5.385165 |
| 1.3.1 | r = √(1+3) = 2; x/r = −½, y/r = √3/2 | the dot is in the second quadrant: Arg z = π − π/3 = 2π/3; z = 2e^{i2π/3}; arg z = {2π/3 + 2πk} | point −1+1.732051i (2, 2.094395); length 2; arg 2.094395 |
| 1.3.2 | (√3+i)² = 2+2√3i; ⁴ = −8+8√3i; ⁸ = −128−128√3i; ¹⁰ = ⁸·² = 512−512√3i = 512−886.81i | r = 2, Arg = π/6: 2¹⁰e^{i10π/6} = 1024e^{i5π/3}; wrap 5π/3−2π = −π/3: 1024(½ − (√3/2)i) | base 1.732051+i (2, 0.523599); power 512−886.810013i (1024, −1.047198); wrap −1.047198 |
| 1.4.1 | z⁵−1 = (z−1)(z⁴+z³+z²+z+1): no short solution | r = 1, Arg 1 = 0, θ_k = 2πk/5: 1; 0.309+0.951i; −0.809+0.588i; −0.809−0.588i; 0.309−0.951i | radius 1; arg 0; first 1; check 1 |
| 1.4.2 | (√2+√2i)² = 4i, (4i)² = −16 ✓; roots ±√2±√2i | \|−16\| = 16, r = 16^(1/4) = 2, Arg = π, θ_k = (π+2πk)/4 = π/4, 3π/4, 5π/4, 7π/4 | radius 2; arg π (3.141593); first 1.414214+1.414214i (2, 0.785398); check −16 |
| 1.4.3 | disc = 16−52 = −36; z = (4 ± 6i)/2 = 2 ± 3i | disc = 36e^{iπ}; square roots 6e^{±iπ/2} = ±6i; (z−2)² = −9, z−2 = ±3i | disc −36; sqrt 6i; root1 2+3i (3.606, 0.983); root2 2−3i (3.606, −0.983) |
| 1.5.1 | direction (−3−3i)−(2+i) = −5−4i; z(t) = (2−5t) + i(1−4t); t = ½: −0.5−i | step −5−4i = 6.403e^{−i2.467}: walk at speed 6.403 heading −2.467 | start 2+i; step −5−4i (6.403, −2.467); mid −0.5−i |
| 1.5.2 | 1 < x² + (y+1)² ≤ 9 | centre −i; ρ = \|z+i\|: 1 < ρ ≤ 3; inner circle left out, outer kept | centre −i (1, −π/2) |
| 2.1.1 | (1+i)² + i(1+i) = 2i + i − 1 = −1+3i: u = x²−y²−y = −1, v = 2xy+x = 3 | r = √2, θ = π/4: u = r²cos2θ − r sinθ = 0 − 1 = −1, v = r²sin2θ + r cosθ = 2 + 1 = 3 | z 1+i; w −1+3i (3.162, 1.893); u −1; v 3 |
| 2.1.2 | z = 2+iy: z² = (4−y²) + 4iy; u = 4 − v²/16; y = 1: 3+4i (4 − 16/16 = 3 ✓) | ρ(1+cosφ) = 8; 3+4i: ρ = 5, cosφ = 3/5: 5·1.6 = 8 ✓ | curve vertex 4; sample 3+4i (5, 0.927); focus 0 |
| 2.1.3 | z = 2+iy: i(2+iy) − 2i = −y: u = −y, v = 0: the real axis | a = i: turn π/2, stretch 1, slide −2i; the line's direction i becomes i·i = −1; foot of the perpendicular 0, k = 0 | point 0; direction −1 (1, π); equation k = 0 |
| 2.2.1 | edge y=0 ↦ x³>0; edge t(1+i)/√2 ↦ t³(−1+i)/√2: angle 3π/4 | arg z ∈ (0, π/4) ↦ 3·arg ∈ (0, 3π/4) | edge0 0; edge1 2.356194; opening 2.356194 |
| 2.2.2 | (a+bi)² = 2i: a²−b² = 0, 2ab = 2: ±(1+i) | \|2i\| = 2, Arg = π/2: √2e^{iπ/4} = 1+i (principal); the other root from k = 1: −1−i | w 2i; root 1+i (1.414, 0.785); step 0.785398; others −1−i |
| 2.3.1 | y = x²: (1 − x² + 2ix)/(1 + x²) → 1 | z/conj z = e^{2iθ}; the curve is tangent to the real axis, θ → 0: value 1; real axis 1, imaginary axis −1 | along 1; real 1; imag −1 |
| 2.4.1 | no short formula (Arg needs arctan and a case split) | window 0 < θ < 2π (cut on the positive real axis); z = −1 is at θ = π: f = e^{iπ/3} = ½ + (√3/2)i | ray π (3.141593); value 0.5+0.866025i (1, 1.047198) |
| 2.5.1 | w = (x−iy)/(x²+y²); on \|z−1\| = 1: x²+y² = 2x, so u = ½; z = 1+i ↦ ½−½i | z = 2cosθ e^{iθ} ↦ (1/(2cosθ))e^{−iθ}: Re w = ½; 1+i = √2e^{iπ/4} ↦ 0.707e^{−iπ/4} | point 0.5 (foot); direction i (1, π/2); equation k = 0.5 (α = 0); sample 0.5−0.5i (0.707, −0.785) |
| 3.1.1 | (f(z+h)−f(z))/h = 2z+1+h → 2z+1; at 1+i: 3+2i | A = 3+2i = 3.606e^{i0.588}, B = 0: the circle is a point | value 3+2i (3.606, 0.588); circle radius 0 |
| 3.1.2 | quotient = conj z + h̄ + z h̄/h; at 1+i: real h → 2, imaginary h → −2i | A = 1−i, B = 1+i: centre 1−i, radius √2 = 1.414; two different values 2 and −2i | A 1−i (1.414, −0.785); B 1+i (1.414, 0.785); radius 1.414214 |
| 3.2.1 | u = e^x cos y, v = e^x sin y: u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y; f′ = u_x + iv_x = f; at 0.5+0.8i: 1.149+1.183i | f′ = e^x e^{iy}: stretch e^x = 1.649, turn y = 0.8; B = 0 | A 1.148675+1.182720i (1.649, 0.8) to 1e-6; fprime the same |
| P1 | (3+2i)(−1−4i) = −3−12i−2i−8i² = 5−14i = conj(5+14i) | mirror negates every name: Arg conj(z₁z₂) = −1.228 | prod 5+14i; mirror 5−14i; both 5−14i (14.866, −1.228) |
| P2 | (3−2i)(3+2i) = 9+4 = 13 | r e^{iθ}·r e^{−iθ} = r² = 13; r = √13 = 3.606 | z 3−2i (3.606, −0.588); zzbar 13; abs 3.605551 |
| P3 | i(c·1+d) + b with c = 1+i, d = 1, b = −2i: ac = i(1+i) = −1+i; ad+b = i−2i = −i | a = e^{iπ/2}, c = √2e^{iπ/4}: ac = √2e^{i3π/4} (names add, stretches multiply) | a i (1, π/2); c 1+i (1.414, 0.785); coeff −1+i (1.414, 2.356); shift −i (1, −π/2) |
| P4 | (1+i)(x+iy): w² = 2(x²+y²) = 2 on x²+y² = 1: \|w\| = √2; z = 1 ↦ 1+i | 1+i = √2e^{iπ/4}: stretch √2, turn π/4 | a 1+i; radius 1.414214; turn 0.785398; sample 1+i |
| P5 (path y = x) | x/z = 1/(1+i) = (1−i)/2 | θ = π/4: cosθ e^{−iθ} = 0.707e^{−iπ/4} = 0.5−0.5i; real axis 1; imaginary axis 0 | along 0.5−0.5i (0.707, −0.785); contrast 1 |
| P6 (Re z) | real h: 1; imaginary h: 0 | A = B = ½: centre ½, radius ½ | A 0.5; B 0.5; real 1; imag 0; radius 0.5 |
| P7 (u = 3) | u_x = u_y = 0, CR: v_y = v_x = 0, so f′ = u_x + iv_x = 0 | f′ = 0: stretch 0, no turn; f is constant | fprime 0 |

Rows not listed carry `num: null` (text rows: `set`, `all`, `equation` of 1.2.1, `map`, `formula`, `partials`, `verdict`, `radii`, `window`, `circle`, `kind`).

---

## 7. Verification plan

### 7.1 Commands (run from the repo root)

| Criterion | Command | Passing |
|---|---|---|
| A1 | `node tools/smoke.mjs --route rehearse-1-4-2-s7 --script tests/interact/i2-rehearse.mjs --dark --out docs/review/iter-2/i2-rehearse` | 3 checks ok (desktop, phone, desktop-dark), exit 0; the script prints its step lines |
| A2 | `node tools/smoke.mjs --route rehearse-2-5-1-s3,rehearse-P5-s1,rehearse --script tests/interact/i2-rehearse.mjs --dark --no-shots` | 9 checks ok |
| A3 | `node --test tests/unit/i2-rehearse.test.mjs` | all tests pass |
| A4 | `node --test tests/unit/i1-integration.test.mjs` and `node tools/smoke.mjs --route home --script tests/interact/i1-integration.mjs --dark --no-shots` | all pass (the walk reaches `rehearse` on all three threads) |
| A5 | `node tools/smoke.mjs --route rehearse,rehearse-1-4-2-s7,rehearse-2-5-1-s3,rehearse-P5-s1,rehearse-nonsense --dark` | 15 checks, no console error, page error, failed request, overflow or under-construction panel |
| A6 | the screenshot of A1: `docs/review/iter-2/i2-rehearse/rehearse-1-4-2-s7--phone--revealed.png` (and `--desktop--` and `--desktop-dark--`), read with the image tool | section 7.5 |
| all | `npm test`, `node tools/interact-all.mjs i2-rehearse i1-integration` | green |

### 7.2 Unit tests: `tests/unit/i2-rehearse.test.mjs` (A3 and the pure pieces)

The file imports `../../js/stations/rehearse.js` (no DOM), `../../js/data/generators.js`, `../../js/data/problems.js`, `../../js/core/complex.js`; it loads KaTeX with the `vm.runInNewContext` idiom of `tests/unit/i2-generators.test.mjs`. Handout givens (`HANDOUT`) are written out in the file exactly as in section 6.3 and Appendix B.

| Test | What it asserts (expected values) |
|---|---|
| R1 `parseToken` | the table of 5.1: `'1-4-2-s7'` is `{ id: '1.4.2', seed: 7 }`; `'P5'` is `{ id: 'P5', seed: null }`; `'p5-s3'` is `{ id: 'P5', seed: 3 }`; `'nonsense'`, `'1-4-9'`, `''`, `'1-4-2-s'`, `'1-4-2-s7-x'`, `'s7'`, `'1-4-2-s99999999999'` are `null`; `'2-5-1-s007'` seed 7; every one of the 29 ids round-trips: `parseToken(idKey(id) + '-s5').id === id` |
| R2 `pickType` and scores | `pickType({}) === '1.1.1'`; with `'1.1.1': { tried: 1, right: 1, last: 1 }` it is `'1.1.2'`; all 29 right once except `'2.4.1'` (tried 1, right 0) gives `'2.4.1'`; all 29 right once gives `'1.1.1'`; `{ '1.1.1': { tried: 9, right: 0, last: 0 } }` still gives `'1.1.1'`; `sanitizeScores` drops unknown ids, negative and fractional counts, clamps `right` to `tried`, drops `tried: 0`; `recordScore` returns a new object and adds 1 / 1 or 1 / 0; `scoreSummary` of two types right and 5 tried is `{ typesRight: 2, tried: 5, total: 29 }`; `typeGroups()` has keys `1 2 3 P` with 11, 8, 3, 7 ids |
| R3 `requestFor` and `labRequestFor` | `requestFor(generate('1.4.2', 7))` deep-equals `{ station: 'roots', problem: '1.4.2', family: '1.4.2', values: card.values }` (the values are `{ c: { re: -81, im: 0 }, n: 4 }`); for all 29 families × 20 seeds it is a plain object whose `station` is a registry id and whose `values` is a plain object, except `solve('P5', { path: { kind: 'cubic' } })` and `solve('2.3.1', { path: { kind: 'cubic' } })`, whose `values` is `null`, so `requestFor(...) === null`; `requestFor(null) === null`; `labRequestFor(generate('2.5.1', 3))` equals the card's `labRequest` with `predictFirst: true` and `fn: 'recip'`; it is `null` for the 24 families without a lab picture |
| R4 `verdict` | with `card = generate('1.4.2', 7)` and `roots = card.answer.values.roots`: `verdict(card, { address: 'P->C', names: 'all' }, roots)` is `{ address: true, names: true, guess: true, right: true }`; `verdict(card, { address: 'C', names: 'all' }, roots)` has `address: false, right: false`; names wrong gives `names: false, right: false`; no guess (`null`) with both right gives `guess: null, right: true`; a wrong guess (roots rotated by 10°) gives `guess: false, right: false`; unset picks give `null` and `right: false`; a `none` card (`generate('P1', 3)`) with right picks and `guess: null` is right; a choice card: the correct index is right, another index is wrong; `verdict` returns exactly the four keys |
| R5 `verdictSentence` | the examples of 2.5: right with guess: "Right. Both decisions and your guess are correct."; right, skipped: "Right on both decisions. You skipped the guess."; proof: "Right on both decisions."; `{ address: true, names: false, guess: null }` gives "Not yet. Check the Names. The picture and both worked routes are below."; `{ address: null, names: null, guess: null }` gives "Not yet. You did not set the Address or the Names. The picture and both worked routes are below."; `{ address: false, names: false, guess: false }` gives "Not yet. Check the Address, the Names and your guess. The picture and both worked routes are below." |
| R6 `startGuess` | for every family with a guess task × seeds 1..200 (2,000 cards): the number of handles is `n` (roots), `count` (point), 2 (circle, line, sector); ids are `g0…`, `c r`, `a b`, `s0 s1`; every start lies within 0.95 of the half width from the view centre in both axes; `check(card, startPoints).ok !== true`; for roots and points no start is within 0.15 · hw of a target point and no two starts within 0.12 · hw; for circle the centre start is at least 0.3 · hw from the target centre; for line both starts at least 0.2 · hw from the target line; for sector both angles more than 20° from both target edges and 25° apart; `startGuess(generate('1.4.2', 7))` is g0 (−2.786, −3.096), g1 (−0.929, −3.096), g2 (0.929, −3.096), g3 (2.786, −3.096); `startGuess` of a choice and of a proof card is `[]` |
| R7 `pictureOf` | for all 29 families × seeds 1..200 (5,800 cards): `items` non-empty; every item kind is in the vocabulary of 4.3; every number is finite; `view.halfWidth` is at least 1.5 and at most 9 (the far-point rule of 5.8.2 guarantees it for the five families that need it; the guess views of the generators are at most 8.7; the fixed view of 2.4.1 is 1.8); every `dot`, `cartAddr`, `polarAddr` point lies within 0.97 of the half width of the view centre, every `circle`, `disk`, `annulus` has its four extreme points within the view; the five guess kinds use `card.sketch.fit` as the view; `caption === alt` and ends with a full stop; far points (a flexible point outside the view) appear as a `ray` with a label that contains "off this picture"; `pictureOf(generate('1.4.2', 7))` has a `circle` of radius 3 at 0, four `dot` items with labels `k = 0` to `k = 3` at the card's roots, one `polarAddr` for root 0, and the view `{ center: { re: 0, im: 0 }, halfWidth: 3.87 }`; `fitView([{ re: 1, im: 1 }, { re: 0, im: 2 }], 0)` is `{ center: { re: 0.5, im: 1 }, halfWidth: 1.95 }`; `fitView([], 0)` is `{ center: { re: 0, im: 0 }, halfWidth: 1.5 }` |
| R8 `explainerData`, handout | for each of the 29 handout cards (section 6.3, built with `solve(id, HANDOUT[id])`): row ids and labels as in Appendix B, every `num` within 1e-9 of the pinned value (3.2.1 within 1e-6), `same.agree === true`, `native` as in Appendix B |
| R9 `explainerData`, all seeds | for all 29 families × seeds 1..120 (3,480 cards): `same.agree === true`; row ids unique; 2 to 5 rows; every cell is `null` or a non-empty string; every non-null cell and both `same` cells render with `katex.renderToString(cell, { throwOnError: true, strict: 'error' })` and contain no `NaN`, `undefined` or `Infinity`; every `num` is `null` or finite; a point at the origin prints `\text{no angle at } 0` in its polar cell |
| R10 `stepList` | `stepList(generate('1.4.2', 7))` has the title "The steps of arg c, each divided by 4", rows `k = 0: (π + 0)/4 = π/4 (45°)` … `k = 3: (π + 6π)/4 = 7π/4 (315°)` (`home: true` only for k = 0), footer "k = 4 is k = 0 again."; `stepList(solve('1.4.1', { n: 5 }))` row 1 is `k = 1: (0 + 2π)/5 = 2π/5 (72°)`; for 2.2.2 with w = 2i, n = 2: `k = 0: (π/2 + 0)/2 = π/4 (45°) (the principal root: the home step only)` and `k = 1: (π/2 + 2π)/2 = 5π/4 (225°) (another root)`; `null` for every other family |
| R11 `typeset` | the examples of 5.15 |
| R12 `matchGuesses`, `freshSeed`, `nextCard` | the greedy pairs for a rotated set of roots match `check`'s verdict (every pair within tolerance iff `check().ok`); `freshSeed(1760000000000, 0)` is a uint32 and differs from `freshSeed(1760000000000, 1)`; `nextCard('1.4.2', generate('1.4.2', 7), 1760000000000, 0)` is a card of type 1.4.2 whose `seed !== 7` and whose `statement !== prev.statement`; for P5 (eight variants) 50 successive `nextCard` calls never repeat the previous statement |
| R13 `readoutText` | `type 1.4.2; seed 7; decisions: not set; guess: none; revealed: no`; with `address: 'P->C', names: 'all'`, 4 handles touched: `type 1.4.2; seed 7; decisions: P→C / all; guess: 4 points; revealed: no`; one handle: `guess: 1 point`; `choice: 3` gives `guess: choice 3`; only an address: `decisions: P / ?`; `revealed: yes` |
| R14 module hygiene | `js/stations/rehearse.js` exists and exports `mount` with `length === 2` and every name of 4.2; the source has no `innerHTML`, no `alert(`, `confirm(`, `prompt(`, `window.open`, `Math.random`, `fetch(`, `localStorage`, `console.error`, the literal text `rehearse-reveal` appears in the source (the Walk design's U7 test searches for it), no `#rgb` or `#rrggbb` literal (outside route strings), no `\d degrees`, no old link wording of I6b, `thread-badge` only together with `threadLabel(`, no `label:` or `name:` string with `z1`/`z2` (I22); it imports `idKey`, `sanitizeProgress`, `setTicked` from `./problems.js` and defines none of the three; importing the module in Node does not throw |

### 7.3 Interaction script: `tests/interact/i2-rehearse.mjs`

Run by `node tools/smoke.mjs --route <id> --script tests/interact/i2-rehearse.mjs` at desktop 1280×860 and phone 390×844 (and `--dark`). The script is one default export that dispatches on `ctx.route`; a fresh browser context per run means a fresh store. Imports: `dragHandle`, `clickChip`, `settle`, `readText` from `./_helpers.mjs`. Helpers inside the script: `getCard(id, seed)` is `page.evaluate(({ id, seed }) => import('./js/data/generators.js').then(m => m.generate(id, seed)), ...)`; `attr(sel, name)`; `visible(sel)`; `noOverflow()` asserts `document.documentElement.scrollWidth <= window.innerWidth + 1`.

**Route `rehearse-1-4-2-s7` (A1, A6):**
1. `#rehearse-card[data-problem="1.4.2"][data-seed="7"][data-revealed="false"]` exists; `#rehearse-place` is hidden; `#rehearse-readout` contains `type 1.4.2; seed 7` and `revealed: no` and `decisions: not set; guess: none`; `#rehearse-plane-g0` to `-g3` exist and `-g4` does not; `#rehearse-choice` is hidden; `noOverflow()`.
2. `const card = await getCard('1.4.2', 7)`; `card.given` is `{ c: { re: -81, im: 0 }, n: 4 }`.
3. `clickChip('rehearse-decisions-address-p-c')`, `clickChip('rehearse-decisions-names-all')`; the readout contains `decisions: P→C / all`.
4. for k in 0..3: `await dragHandle(page, 'rehearse-plane-g' + k, card.answer.values.roots[k])`; the readout contains `guess: 4 points`; `shot('guessed')`.
5. `clickChip('rehearse-reveal')`. Then: `#rehearse-verdict` has `data-address="right"`, `data-names="right"`, `data-guess="right"`, `data-right="true"`; `#rehearse-answer-text` `textContent.trim() === card.answer.text`; `#rehearse-place` is visible and contains `Roots`; `#rehearse-ex-same[data-agree="true"]`; `#rehearse-open-station` is visible and its text contains `Roots`; `#rehearse-steps li` count is 4; `#rehearse-plane-g0` is gone; `window.__mv.planes.get('rehearse-plane')` exists; `#rehearse-score-1-4-2` has `data-tried="1"` and `data-right="1"`; `JSON.parse(localStorage.getItem('mv:progress'))['1.4.2'] === true`; the explainer cell `#rehearse-ex-radius-cart` and `#rehearse-ex-radius-polar` both have `data-tex` ending in `= 3`; `noOverflow()`; `shot('revealed')`.
6. click `#rehearse-open-station`; `page.waitForFunction(() => location.hash === '#roots', null, { timeout: 800 })`; `await page.evaluate(() => window.__mv.app.preset())` deep-equals `{ kind: 'values', station: 'roots', problem: '1.4.2', family: '1.4.2', values: card.values }`.
7. `await page.evaluate(() => { location.hash = 'rehearse-1-4-2-s7'; })`, wait for the card again; `clickChip('rehearse-decisions-address-c')`; `clickChip('rehearse-reveal')`; `#rehearse-verdict` has `data-address="wrong"`, `data-names="skipped"`, `data-guess="skipped"`, `data-right="false"`; `#rehearse-decisions-status` contains `Address: wrong`; `#rehearse-score-1-4-2` now `data-tried="2"`, `data-right="1"`.
8. Keyboard (new mount `location.hash = 'rehearse-1-4-1-s2'`): focus `#rehearse-plane-g0`, read `data-re`, press `ArrowRight`, the value grew by the plane step (`> 0`), the readout says `guess: <n> points` with n = `generate('1.4.1', 2).sketch.n` (4); Shift+ArrowUp moves ten times as far.

**Route `rehearse-2-5-1-s3` (A2):** pick `rehearse-decisions-address-p`, `rehearse-decisions-names-any`; `clickChip('rehearse-reveal')` with no guess: `data-guess="skipped"`, `data-address="right"`, `data-names="right"`, `data-right="true"`; `#rehearse-open-lab` is visible; the explainer footer `#rehearse-ex-same[data-agree="true"]`; `#rehearse-place` contains `1/z and the Sphere`; click `#rehearse-open-lab`: `location.hash === '#lab'` and, within 1500 ms, `window.__mv.lab.fn().id === 'recip'` and `window.__mv.lab.answerHidden() === true`.

**Route `rehearse-P5-s1` (A2):** `#rehearse-choice-0` to `-3` exist with `role="radio"`; `#rehearse-plane-host` is hidden and `#rehearse-plane-g0` does not exist; `const card = generate('P5', 1)`; click `#rehearse-choice-${card.sketch.correct}` (3); it has `aria-checked="true"`, the others `false`; pick `rehearse-decisions-address-p`, `rehearse-decisions-names-any`; the readout says `guess: choice 3`; reveal: `data-address`, `data-names`, `data-guess` all `right`; `#rehearse-score-P5[data-right="1"][data-tried="1"]`; `JSON.parse(localStorage.getItem('mv:rehearse.scores')).P5.right === 1`; `JSON.parse(localStorage.getItem('mv:progress')).P5 === true`; the correct chip has `data-mark="right"`; click `#rehearse-another`: `#rehearse-card` `data-seed` is not `1`, `data-revealed` is `false`, `#rehearse-verdict` is hidden, `#rehearse-decisions-address-p` has `aria-pressed="false"`, `location.hash` matches `/^#rehearse-P5-s\d+$/`; keyboard on the choice group: Tab to the group, ArrowDown moves the selection.

**Route `rehearse` (A2):** `#rehearse-card[data-problem="1.1.1"]`; `#rehearse-type-1-1-1[aria-pressed="true"]`; `#rehearse-score-line` text is "Nothing rehearsed yet. The first card is the type you need most."; `#rehearse-next-type` text contains `1.1.1`; click `#rehearse-type-2-4-1`: the card is `2.4.1` with a new seed and `location.hash` matches `/^#rehearse-2-4-1-s\d+$/`; `noOverflow()`; the picker is `#rehearse-decisions` and the card has no plane (`data-kind="choice"`).

`export const expectedErrors = []`; the script ends with `log('i2-rehearse: all steps passed')`.

### 7.4 Edits to the integration tests (A4)

**`tests/unit/i1-integration.test.mjs`**
- `I1`: title "the registry: 22 stations ..."; `assert.equal(STATIONS.length, 22)`; `order runs 0..21`; `assert.equal(ids[20], 'rehearse')`, `assert.equal(ids[21], 'problems')`, `assert.equal(ids[ids.length - 1], 'problems')`; the existing loop already asserts every module exists, exports `mount` and has `mount.length === 2`; add `assert.ok(fs.existsSync(path.join(ROOT, 'js/stations/rehearse.js')))`.
- Import `META_STATIONS` from `../../js/registry.js`. `I3`: for a station in `META_STATIONS` (`rehearse`, `problems`) `listed` is all 29 ids and `expected` is `problemsForStation(s.id)` (29): `if (META_STATIONS.includes(s.id)) { assert.equal(listed.size, 29); continue; }` with `listed` built from `s.problems` for both (the registry gives `rehearse` all 29), so no special case remains for `'problems'` alone.
- `I4`: after `assert.equal(members[members.length - 1].id, 'problems', ...)` add `assert.equal(members[members.length - 2].id, 'rehearse', ...)` for each thread (all three threads run through the Rehearsal Room); the walked list is the thread's stations in order, now including `rehearse`.
- `I5`: unchanged.
- **Relaxed pins** (D15), each keeps its invariant and drops the exact source text of a file another wave-1 goal rewrites:
  - `I12`: for each file in the list, `withId === made` (every `<summary>` that is built has an id) and `made >= 1` only for `lab.js`, `problems.js`, `sets.js`, `linear.js`, `curves.js`; drop the exact counts (the kit builds the answer `<details>`, so a station that adopts it builds fewer).
  - `I19`: the four `src.includes(...)` greps on `lab.js` become `src.includes('no angle at 0')` and `src.includes('not checked')` (the lines they pinned move when the Lab is rewritten); the behaviour is covered by the Lab's own tests.
  - `I21`: `assert.match(read('js/stations/problems.js'), /-final/)`, a regular expression that matches the text `-final`, instead of the exact template.
  - `I23`: `prob.includes('titleSpan(')` and `prob.includes('Start at')` instead of the two exact lines.
- Add `I24`: `js/stations/rehearse.js` exports `parseToken`, `pickType`, `requestFor`, `verdict` and `mount`, and `parseRoute('#rehearse-1-4-2-s7')` is `{ station: 'rehearse', preset: { kind: 'token', token: '1-4-2-s7' }, raw: 'rehearse-1-4-2-s7' }`; `parseRoute('#rehearse-nonsense').station === 'rehearse'`.

**`tests/interact/i1-integration.mjs`**
- Header comments and log lines: "20 stations" and "21 stations" become "22".
- `I3`: unchanged logic (it uses `STATIONS` and `THREADS`); add, when `at === 'rehearse'`: `assert(await page.evaluate(() => !!document.querySelector('#rehearse-links #rehearse-link-graph4d[data-dir="prev"]') && !!document.querySelector('#rehearse-links #rehearse-link-problems[data-dir="next"]')), 'I3 the Rehearsal Room links back to graph4d and on to the index')`; and when the page before it is `graph4d` or `lab`, the existing "page offers the next stop" assertion covers `href="#rehearse"` (request in section 9 for `graph4d`).
- `I1` (menu) and `I7` (every control has an id) and `I8` (links and tab stops have ids, no duplicates, no `z1`/`z2` in `aria-label`/`title`) run over all 22 stations with no change: the page must satisfy them (every button of the station has an id, every anchor has an id, every `aria-label` and `title` is typeset).
- `I6`: unchanged; the page's text must not contain ASCII `pi`, `sqrt(`, `<=`, `degrees`, `z0`, `NaN` (D11).
- `I4` (29 deep links) is unchanged: `#problem-<id>` still lands on the owning station.

### 7.5 What passing looks like (A6 screenshot review)

`rehearse-1-4-2-s7--phone--revealed.png` (390 px wide, full page) shows, top to bottom: the two picker rows with "✓ right" on both, the picture plane with a **dark orange (light: `#a84300`; dark: `#ff9d5c`) circle of radius 3**, four filled orange dots labelled `k = 0` to `k = 3` at 45°, 135°, 225°, 315°, a **ray and a solid Arg arc to the k = 0 root** with `r = 3` and `Arg z = π/4`, the faint dashed seam on the negative real axis, four **green rings** on the dots (the guess), the caption; the verdict with `Right.`; the answer box and its ASCII line; the step list with four rows `k = 0 ... k = 3` and "k = 4 is k = 0 again."; the explainer **stacked, Cartesian above Polar**, rows radius (`= 3` in both), Arg c, first root, all roots, check, footer `same c: agree`; the two worked routes; the two buttons. Nothing is cut at the right edge; no horizontal scrollbar; text at least 16 px; the plane at least 350 px wide; the Reveal button reads "Revealed". The dark screenshot has the same content on `--bg #0d121c` with `--polar #ff9d5c` and `--input #3fd0a0`.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| `#rehearse-p5-s3` (lower case) | `parseToken` reads `P5`; the bar is rewritten to `#rehearse-P5-s3` |
| a seed above 2³² − 1, a non-digit seed, an unknown id | unknown-token note and the default card |
| Reveal with nothing set | all `skipped`, `right: false`, a score try is recorded |
| Reveal pressed twice (double click) | the second call returns at once; one try is recorded |
| A handle dragged and put back exactly where it started | `touched` stays true (the student did act); the guess is the start positions and is judged |
| Only some roots moved | the n handle positions are the guess; `check` says "At least one root is off its place." |
| Another card pressed after Reveal | the old plane, explainer, steps and worked routes are destroyed; ids are never duplicated |
| `Another one` on a family with few variants (the fewest is 5) | `nextCard` returns the 12th attempt even if the statement repeats |
| Unmount during a drag | `plane.destroy()` removes its listeners; no timer is pending |
| n = 12 roots (`solve('1.4.1', { n: 12 })`) | 12 handles in a split tray (rows at −0.8 and −0.55), step list of 12 rows, explainer `all` row wraps |
| The hash changes to another route while mounted | the router unmounts: everything of 4.8 runs |
| Back from a station | the pinned `#rehearse-<id>-s<seed>` mounts a fresh unrevealed card with the same numbers; scores are the stored ones |
| `window.katex` missing | cells render as plain TeX text with class `tex-error`; the page works |
| `history.replaceState` throws (sandboxed artifact) | caught; the bar is left alone; every control still works |
| Stored `rehearse.scores` is not an object / has junk | `sanitizeScores` returns `{}` or the clean part |
| P5 or 2.3.1 on y = x³ (`values: null`) | no station button, the note of 2.4 |
| The student switches theme after Reveal | planes redraw, explainer re-renders, no state is lost |
| A card whose answer is a very small or very large number | the explainer uses `texNumber` (`2.44\times 10^{-4}`); the picture's far points become labelled rays |

### 8.2 Performance plan

- Generating a card is synchronous and takes about a millisecond (`generate` is pure; `nextCard` makes at most 12 attempts). `mountMs` target: under 60 ms on a desktop, under 150 ms under a 4× CPU throttle.
- Reveal builds one plane, one explainer (at most 5 rows, KaTeX inline), one answer box and two prose paragraphs: about 30 ms; the explainer's first render is synchronous, later renders coalesce.
- The guess layer draws at most 12 dots plus one circle, line or two rays per frame: it never allocates per frame beyond its few points; drag redraws are the plane's (60 fps target).
- No timers, no `requestAnimationFrame` loop, no `setInterval`; the only observer is one `ResizeObserver` on the answer box.
- The unit tests run the 5,800-card picture sweep and the 3,480-card explainer sweep in under 10 s (no DOM, no KaTeX in the picture sweep; KaTeX only in the explainer sweep).

### 8.3 Accessibility

Every control has a stable id and a visible label or `aria-label`. The statement is real text (KaTeX with MathML). The picker is a `fieldset` with a `legend` (the kit's); chip state is `aria-pressed`; its marks are words ("✓ right", "✗ wrong") as well as colour. The choice group is a `radiogroup` with roving tabindex, `aria-checked`, arrow keys, and words ("✓ correct", "✗ your pick") as well as colour. The plane's `aria-label` is the prompt; each handle announces its address (`name`: "Root guess 2 of 4: z = 1 + i; r = 1.414, θ = 0.785 (π/4, Arg)"); handles are keyboard operable (arrows, Shift ×10, Alt ÷10). The picture plane's `aria-label` is the caption; everything it draws is also said in the explainer, the step list and the answer, so nothing is only a picture. The verdict is a status region and takes focus on Reveal; the readout is polite only after Reveal. Contrast of every text and mark is at least 4.5:1 in both themes (section 3); focus rings are the shell's. Targets are at least 44 px (`--tap`): buttons, chips, choice chips; the handle's hit area is the plane's.

### 8.4 Reduced motion

Nothing plays or slides. Two decorative CSS fade-ins (the step list rows, 90 ms apart) exist only under `@media (prefers-reduced-motion: no-preference)`. Reveal, a new card and the picture appear at once either way. There is no animate or play control, so no stepper is needed (ARCH rule 9).

### 8.5 Phone layout (390 px; 16 px gutters; 358 px content)

One column. The decisions picker wraps its chips; the plane is 358 × 358 with handles in a bottom tray 0.8 · hw below the centre, so about 36 px above the bottom edge; the choice chips are full width and wrap (two lines at most for a 72-character option); the answer box scrolls inside itself (`.tex-scroll`) with the hint; the ASCII answer wraps (`overflow-wrap: anywhere`); the explainer stacks Cartesian above polar at 560 px and below; the two worked routes stack; the buttons are full width in a flex-wrap row; the type chips are a grid of `minmax(4.5rem, 1fr)` (5 per row); every grid track that holds a plane, table or long line is `minmax(0, 1fr)` with `min-width: 0` children (ARCH 10.1.8). The Walk bar (when on) pads `#view`; the plane is never covered. The interaction script asserts `scrollWidth <= innerWidth + 1` before and after Reveal at 390 px.

---

## 9. Out of scope, requests for other owners, risks

**Out of scope** (as `docs/goals/iter-2.json` says, and what else this design leaves alone):
- Changing the generators (any rule error found while building goes to the generators' owner as a request; none was found: 3,480 cards agreed with the explainer routes).
- Making a station accept the values preset (`ctx.preset.kind === 'values'`): i2-decisions-everywhere-a/-b/-c and the Lab (i2-lab-diary). This goal only writes `station.request` and checks the router hands it over unchanged (A1).
- The home map dots from `rehearse.scores` (i2-home-index-deck); the deck's "Rehearse this" links.
- The Walk bar and its checks (i2-walk-shell); the video panel and Listen control (the station has none).
- `plane.js` changes (a placer that returns its box, tiered label placement); the labels here use the existing placer.
- A "predict first" switch: the Rehearsal Room is always predict-first.
- Spaced repetition, streaks, history of seeds, sharing a card by anything more than `(id, seed)` in the hash.
- Punctured-disk and half-plane variants of 1.5.2 (the generators' D8 scope cut).

**Requests for other owners (`requests_for_other_owners`):**
1. **i2-pictures (`js/stations/graph4d.js`)**: `buildLinks` still lists `{ id: 'problems', dir: 'next' }`. The registry order puts `rehearse` between `graph4d` and `problems`, so the next link of `graph4d` must be `{ id: 'rehearse', dir: 'next' }` (T2 and T3 both walk `graph4d` to `rehearse`). Without it `tests/interact/i1-integration.mjs` I3 fails on T2 and T3 at `graph4d`.
2. **i2-home-index-deck (`js/stations/problems.js`)**: keep these exports (the Rehearsal Room imports them): `idKey`, `sanitizeProgress`, `setTicked`, `appendStatement`, `shortTitle` (the first three are named by this goal's `reads`; the last two are pinned by `tests/unit/i1-station-home-problems.test.mjs` U19b and `tests/interact/i2-decisions-kit.mjs`). The index's links `#rehearse-<idKey>` land on `#rehearse-1-4-2` (a fresh seed) and work as they are.
3. **Integrator (`docs/ARCHITECTURE.md`)**: promote the pure exports of 4.2 into a section 3 entry for `js/stations/rehearse.js` (the sync test only reads `js/core`, so it is optional); add the ids this design introduced beyond ARCH 9: `rehearse-card-title`, `rehearse-plane-host`, `rehearse-prompt`, `rehearse-handle-hint`, `rehearse-reveal-hint`, `rehearse-verdict-head`, `rehearse-verdict-guess`, `rehearse-score-note`, `rehearse-same-place`, `rehearse-aha`, `rehearse-steps-title`, `rehearse-steps`, `rehearse-step-<k>`, `rehearse-answer-hint`, `rehearse-ex-host`, `rehearse-place-link`, `rehearse-handout-link`, `rehearse-open-note`, `rehearse-note`, `rehearse-error`, `rehearse-types-panel`, `rehearse-group-<key>-title`, `rehearse-score-line`, `rehearse-score-bar`, `rehearse-score-storage`; the hook's `mountMs`; and the three notes of this design that differ from ARCH: the picker's status wording (D2), the in-place card change with `replaceState` (D5), `verdict`'s tri-state result (D8).
4. **ARCH 11.6 text (i2-generators' decision D3)**: the Card has `sketch.prompt`, `sketch.fit`, `sketch.target`, `sketch.n`; a `choice` or `none` card has no `fit` (this design computes the picture view itself).

**Risks:**
- **R1 `problems.js` is rewritten in the same wave.** If `appendStatement` or `shortTitle` moves, the station fails to import and the router shows the under-construction panel for every rehearse route (A5 red). Mitigation: request 2, and the build note names the import line; `tests/unit/i2-rehearse.test.mjs` R14 imports the module in Node, so `npm test` fails at once.
- **R2 The integration tests grep other stations' source.** The four relaxed pins (7.4) remove the known ones; the others (I14 sets.js, I15 `lab.checkProblem`, I16 to I18 internals of mappings, linear, graph4d, I20 roots and principal-root source lines) read files that wave-1 goals only extend. If one of them fails after the wave, the cause is that goal's rewrite, not this design: the integrator relaxes the pin the same way.
- **R3 `check()` tolerance versus drag precision on a phone.** Roots and points allow 7 to 13 px, circles 7 to 23 px, a far image line (2.1.3) down to 5 px (i2-generators section 2.2). The plane has no zoom here (`interactive: false`); a student who cannot place a handle precisely can Reveal without a guess. If review finds the 5 px case too hard, the fix is the generator's `fit` or a zoomable guess plane (iteration 3), not this module's logic.
- **R4 Handle hit areas overlap in a dense tray** (n = 8 at 358 px: about 30 px apart). Every handle of a roots card is interchangeable, so a mis-grab does no harm; the interaction script drags g0 to g{n−1} in order and the starts keep clearance from the answers, so `dragHandle`'s "covered" check passes. Recorded because a station that labels its handles would need a different tray.
- **R5 `history.replaceState` in the claude.ai artifact iframe.** It may throw a `SecurityError`; the code catches it and the station is fully usable (a reload then opens a new random card). The Walk and the index links are unaffected.
- **R6 The Lab and station adoption land after this goal in the same wave.** A2's lab check (`window.__mv.lab.fn().id === 'recip'`, `answerHidden() === true`) reads iteration-1 hooks that exist today; the lab-diary goal must keep them. If it renames one, A2 fails at that line; the script names the hook in its message.
- **R7 First-visit `#rehearse` rewrites the address bar** to a pinned seed (D5). A student who bookmarks `#rehearse` gets a new bookmark target on every visit; acceptable, and the unpinned Walk route `rehearse-1-4-2` still opens a fresh card each time it is chosen from the bar.

---

## Appendix A. Picture recipes (what `pictureOf(card)` returns for each family)

Notation. Items are the vocabulary of 4.3, in drawing order inside the list (the drawer reorders by pass: fills, lines, addresses, dots, words). `v = card.answer.values`, `g = card.given`, `T = card.sketch.target`, `hw` = the view's half width, `ang(θ) = fmtAngle(θ, { unicode: true })`, `num(x) = fmtNum(x, 3)`. `Dot(z, tone, 'label', size = 5)`; `Ring(z, tone, 'label')` is a dot with `ring: true`; `Cart(z, names?)` and `Polar(z, 'name', ghosts, ghostsNeg)` are the two address items; `Circle(c, r, tone, dash, 'label')`; `Disk(c, r, tone)`; `Annulus(c, r0, r1, innerIncluded, outerIncluded, tone)`; `Wedge(from, to, rMax, tone)`; `Ray(angle, tone, { dash, alpha }, 'label')`; `Seam(angle, 'label')`; `Seg(a, b, tone, { arrow, dash, alpha }, 'label')`; `Line(point, dir, tone, 'label')`; `Arc(c, r, from, to, tone, arrow, 'label')`; `Poly(points, tone, dash)`; `Curve(points, tone)`. A point name followed by `~` is **flexible** (5.8.2: it may become a far point). A guess family's view is `card.sketch.fit`; every other view is `fitView(fit points, extra)` of the line "view". Axis names: `u, v` for the families of `axisFor` (5.5), `Re, Im` otherwise.

**Guess families (view = `card.sketch.fit`)**

| id | Items | Caption (exact; `n`, `ρ` filled in) |
|---|---|---|
| 1.4.1, 1.4.2 | `Seam(π)`; `Circle(0, ρ, polar, -, 'r = ' + num(ρ))` with `ρ = v.radius ?? 1`; `Poly(T.points, polar, dash, alpha 0.5)`; `Ray(Arg(T.points[k]), polar, { alpha 0.35 })` for k = 1 … n−1; `Polar(T.points[0], 'z')`; `Dot(T.points[k], polar, 'k = ' + k, k === 0 ? 6 : 5)` for k = 0 … n−1 | "The n roots sit on one circle of radius ρ, 360°/n apart. The root with the Arg arc is the step k = 0." (360/n printed with up to 2 decimals: `90°`, `72°`, `51.43°`; n and ρ as numbers) |
| 1.4.3 | `Line((p, 0), i, seam, 'axis of the pair')` with `p = v.completed.shift`; `Seg((p, 0), root_1, polar, { arrow })`, `Seg((p, 0), root_2, polar, { arrow })`; `Cart(root_1)`; `Dot((p, 0), cart, 'p = ' + num(p))`; `Dot(root_1, polar, 'z = ' + fmtCart(root_1))`; `Dot(root_2, polar, 'z = ' + fmtCart(root_2))` | "Complete the square: slide by p, then go up or down by q. The two roots are a mirror pair across the real axis." |
| 2.2.2 | `Seam(π)`; `Seg(0, g.w, input, { alpha 0.6 })`; `Dot(g.w, input, 'w')`; `Ring(o, muted, '')` for every `o` of `v.others`; `Polar(v.root, 'z')`; `Dot(v.root, polar, 'principal root', 6)` | "Principal means the home step only: halve Arg w. The faint rings are the other roots, from the other steps." |
| 2.3.1 | `Circle(0, 1, polar, dash, 'every direction')`; `Ring((1, 0), muted, 'real axis: 1')`; `Ring((-1, 0), muted, 'imaginary axis: -1')`; `Cart(v.along)`; `Polar(v.along, 'w')`; `Dot(v.along, polar, 'this path', 6)` | "The fraction equals e^(2iθ): it remembers only the direction, not the distance. Each way in lands on the unit circle at twice the angle." |
| 1.2.1 | if `v.rel !== '='`: `Disk(v.center, v.radius, polar)`; `Circle(v.center, v.radius, polar, v.rel === '<', null)`; `Seg(v.center, v.center + v.radius, polar, { arrow }, 'R = ' + v.radius)`; `Cart(v.center)`; `Dot(v.center, cart, 'a')` | `=`: "The set is every point one stretch R from the centre a: a circle, with no algebra." `<`: the same and " Dashed means the circle itself is left out." `<=`: the same and " The solid circle is part of the set." |
| P4 | `Circle(0, g.R, input, dash, '|z| = ' + g.R)`; `Circle(0, v.radius, output, -, '|w| = ' + num(v.radius))`; `Dot((g.R, 0), input, 'z')`; `Polar(a·R, 'w')` with `a·R = mul(g.a, (g.R, 0))`; `Dot(a·R, output, 'w', 6)` | "Multiplying by a stretches every length by the modulus of a and turns every name by Arg a. The dashed circle is the input; the solid one is the image." |
| 2.5.1, circle target (the card's line input) | `Circle(T.center, T.radius, output, -, 'image')`; `Dot(T.center, cart, 'centre')`; `Ring(0, muted, '0 = 1/∞')`; `Dot(v.sample.w, output, 'w')` | "A line that misses 0 closes into a circle through 0, because ∞ goes to 0." |
| 2.5.1, line target (the card's circle input) | `Line(T.point, T.dir, output, v.imageLine)`; `Seg(0, T.point, polar, { dash }, 'distance ' + num(\|T.point\|))`; `Ring(0, muted, '0')`; `Dot(v.sample.w, output, 'w')` | "A circle through 0 opens into a line, because 0 goes to ∞. The dashed segment is the distance from 0 to the line." |
| 2.1.3 | `Line(T.point, T.dir, output, v.imageLine)`; `Seg(0, T.point, polar, { dash }, 'distance ' + num(\|T.point\|))` only when \|T.point\| > 1e-9; `Seg(0, b, cart, { arrow }, 'slide b')` and `Dot(b, cart, 'b = f(0)')` only when b ≠ 0 (`b = v.shift`); `Dot(v.sample.w, output, 'w')` | "A line goes to a line: turn by Arg a, stretch by the modulus of a, slide by b. The dashed segment is the distance from 0 to the image line." |
| 2.2.1 | `Wedge(0, v.sector.to, 0.9 · hw, polar)`; `Ray(0, polar, -, 'arg w = 0')`; `Ray(v.sector.to, polar, -, 'arg w = ' + ang(v.sector.to))`; `Arc(0, 0.55 · hw, 0, v.sector.to, polar, arrow, 'n α')` (written `3α`, `2α`, `4α` from `v.n`); `Wedge(0, g.alpha, 0.55 · hw, input, alpha 0.08)`; `Ray(g.alpha, input, { dash }, 'arg z = ' + ang(g.alpha))` | "Every name of arg z is multiplied by n, so the fan opens n times wider: from α to nα." (n, α, nα as numbers: "from π/4 to 3π/4") |

**Families with a computed view** (`fitView(points, extra)`; `~` flexible)

| id | View (points; extra) | Items | Caption |
|---|---|---|---|
| 1.1.1 | anchors `g.z1, g.z2, v.quotient`; flexible `v.product~`; extra 0.4 | `Dot(g.z1, input, 'z₁')`; `Dot(g.z2, input, 'z₂')`; `Dot(v.quotient, polar, 'z₁/z₂')`; `Cart(v.product~)`, `Polar(v.product~, 'z₁z₂')`, `Dot(v.product~, cart, 'z₁z₂', 6)` | "The product z₁z₂ has length r₁r₂ and turns by both names added. The quotient z₁/z₂ undoes z₂: lengths divide, names subtract." |
| 1.1.2 | anchors `g.z1, g.z2`; flexible `v.w~`, `v.conjW~`; extra 0.4 | `Dot(g.z1, input, 'z₁')`; `Dot(g.z2, input, 'z₂')`; `Dot(v.w~, cart, 'z₁ ' + v.op + ' z₂')`; `Dot(v.conjW~, polar, 'conjugate')`; `Seg(v.w, v.conjW, seam, { dash }, 'mirror')` and `Cart(v.conjW)` only when both are near | "Two slides, then a mirror across the real axis: the imaginary part changes sign, the length does not." |
| 1.2.2 | `g.z1, g.z2`; 0.5 | `Seg(g.z2, g.z1, cart, { arrow }, num(v.distance))`; `Seg(g.z2, (g.z1.re, g.z2.im), cart, { dash })`; `Seg((g.z1.re, g.z2.im), g.z1, cart, { dash })`; `Dot(g.z1, input, 'z₁')`; `Dot(g.z2, input, 'z₂')` | "The distance is the length of one slide: across Δx, up Δy, then the straight line between the two points." |
| 1.3.1 | `v.z`, and (±1.1 r, 0), (0, ±1.1 r) with r = v.r; 0.3 | `Seam(π)`; `Cart(v.z)`; `Polar(v.z, 'z', 1, 1)`; `Dot(v.z, polar, 'z', 6)` | "z is one dot. The ray and the solid arc are its polar address, Arg z, the home step; the faint arcs are other names in arg z." |
| 1.3.2 | `v.base` and (±1.3 r, 0), (0, ±1.3 r) with r = \|v.base\|; 0.3 | `Seam(π)`; `Ray(wrapArg(k · Arg(v.base)), polar, { alpha 0.35 })` for k = 2 … n−1; `Ray(v.Arg, polar, -, 'z' + sup(n) + ': Arg = ' + ang(v.Arg))`; `Arc(0, 0.6 · hw, 0, v.Arg, polar, arrow, '')`; `Polar(v.base, 'z')`; `Dot(v.base, input, 'z', 6)`; when \|v.r − 1\| < 1e-9: `Dot(v.result, cart, 'z' + sup(n))` | \|r\| = 1: "Each power turns by the same Arg again and the length stays 1. The solid ray is zⁿ: wrap its angle onto the home step." otherwise: "Each power turns by the same Arg again. The solid ray is zⁿ: wrap its angle onto the home step. Its length rⁿ = <num(v.r)> is far outside this picture." (`sup(n)` writes n in Unicode superscript digits, `zⁿ` in the caption as `z` plus `sup(n)`) |
| 1.5.1 | `v.start, v.end`; 0.5 | `Curve(segment(v.start, v.end, { n: 64 }).points, cart)`; `Dot(v.start, input, 't = 0')`; `Dot(v.end, output, 't = 1')`; `Dot(v.at.z, polar, 't = ½')` | "z(t) is the start plus t times the step: a slide that grows with time. Dark is t = 0, light is t = 1." |
| 1.5.2 | the four extreme points of `Circle(v.center, v.outer)`; 0.3 | `Annulus(v.center, v.inner, v.outer, v.innerIncluded, v.outerIncluded, polar)`; `Dot(v.center, cart, 'a')` | "A solid circle belongs to the set and a dashed one does not. Open needs both circles dashed; closed needs both solid." |
| 2.1.1 | `v.check.z, v.check.w`; 0.5 | `Dot(v.check.z, input, 'z')`; `Seg(v.check.z, v.check.w, output, { dash, arrow })`; `Cart(v.check.w, ['u', 'v'])`; `Polar(v.check.w, 'w')`; `Dot(v.check.w, output, 'w', 6)` | "The check point z goes to w = f(z). Both formulas give the same u and v there." |
| 2.1.2 | the points (u_min, 0), (u_max, 0), (0, 4), (0, −4) of the curve below and `v.sample.w`; 0.4 | `Curve(points, output)` with 129 points, parameter v from −4 to 4: x = c: `(c² − v²/(4c²), v)`, y = c: `(v²/(4c²) − c², v)`, t = (v + 4)/8; `Ring(0, muted, 'focus 0')`; `Dot((v.parabola.vertex, 0), cart, 'vertex ' + num(v.parabola.vertex))`; `Dot(v.sample.w, output, 'w')` | "Push the line forward with the clock t, then eliminate t: the image is a parabola, and its focus is 0." |
| 2.4.1 | fixed view `{ center: 0, halfWidth: 1.8 }` | `Seam(π, 'principal cut')` drawn muted when \|wrapArg(v.seam − π)\| > 1e-9; `Seam(v.seam, 'cut')`; `Ray(Arg(v.rayPoint), polar, -, 'the ray')`; `Arc(0, 0.75, v.seam, v.seam + 2π − 0.05, polar, arrow, 'window of names')`; `Dot(v.rayPoint, polar, 'z')` | "The window of names runs once round, starting just after the cut. The ray lies inside the window, so the branch does not jump there; the principal cut would." |
| 3.1.1 | `v.derivativeAt.fprime`; 0.4 | `Cart(fp)`; `Polar(fp, 'f′')`; `Dot(fp, polar, 'f′(z₀)', 6)` with `fp = v.derivativeAt.fprime` | "f′(z₀) is one complex number. Its length is the local stretch and its Arg is the local turn. The circle of directions is a single point." |
| 3.1.2, P6 | `A + B, A − B, A ± \|B\|` (both axes); 0.3; (`A, B` = `v.localAt.A, .B` for 3.1.2 and `v.A, .B` for P6) | `Circle(A, \|B\|, polar, -, 'radius ' + num(\|B\|))`; `Seg(A + B, A − B, cart, { dash })`; `Dot(A, cart, 'A')`; `Dot(A + B, cart, 'real h')`; `Dot(A − B, cart, 'imaginary h')`; `Ring(0, muted, '')` | "As the direction of h turns, the quotient runs round this circle. A point would mean differentiable; a circle means a mirror part, so f is not differentiable here." |
| 3.2.1 | `A ± \|B\|` (both axes), `A`; 0.3; `A, B` from `localLinear(compile(v.src).f, card.values.z0)` | entire (\|B\| < 1e-6): `Cart(A)`, `Polar(A, 'f′')`, `Dot(A, polar, 'f′(z₀)', 6)`; not entire: the items of 3.1.2 | entire: "No mirror part: the circle of directions is the single point f′(z₀) = A, a move with its own turn and stretch." not entire: "A mirror part: the circle of directions has radius \|B\|, so there is no single f′." |
| P1 | anchors none; flexible `prod~` (= `mul(z1, z2)`), `both~` (= `v.check.both`); baseline (±1.2, 0), (0, ±1.2); 0.4 | `Dot(prod~, cart, 'z₁z₂')`; `Dot(both~, polar, 'conj z₁ · conj z₂')`; `Seg(prod, both, seam, { dash }, 'mirror')` when both near; `Polar(prod~, 'z₁z₂')`, `Polar(both~, 'mirror')` when near | "Mirror then multiply lands on the mirror of the product: the two dots are reflections across the real axis, with opposite Args." |
| P2 | anchor `v.check.z`; flexible `(v.check.zzbar, 0)~`; 0.4 | `Polar(v.check.z, 'z')`; `Dot(v.check.z, input, 'z')`; `Seg(0, (N, 0), polar, { arrow })` and `Dot((N, 0), polar, 'z conj z = ' + N)` with N = v.check.zzbar (a far point becomes a ray along the real axis with the same label) | "Turn by Arg z, then turn back: the angles cancel and r · r is left, on the positive real axis. That is the modulus squared." |
| P3 | anchors `g.a, g.c`; flexible `v.coeff~`, `v.shift~`; 0.4 | `Seg(0, g.a, polar, -, 'a')`; `Seg(0, g.c, polar, -, 'c')`; `Seg(0, v.coeff~, polar, { arrow }, 'ac')`; `Dot(g.a, input, 'a')`; `Dot(g.c, input, 'c')`; `Dot(v.coeff~, polar, 'ac', 6)`; `Dot(v.shift~, cart, 'ad + b')` | "Compose two moves and you get one move: the stretches multiply and the names add. The slide is ad + b." |
| P5 | `v.along`, (1, 0), (0, 0), (0.5, ±0.5); 0.2 | `Circle((0.5, 0), 0.5, polar, dash, 'every direction')`; `Ring((1, 0), muted, 'real axis: 1')`; `Ring((0, 0), muted, 'imaginary axis: 0')`; `Cart(v.along)`; `Dot(v.along, polar, 'this path', 6)` | "x/z is cos θ times e^(−iθ): it depends on the direction θ. This circle holds every value, and each path picks one point of it. Different paths, different values: no limit." |
| P7 | `kind` u or v: (±c, 0), (0, ±c); modulus: the four extreme points of the circle of radius c; extra 1.0 | u: `Line((c, 0), i, output, 'Re w = ' + c)`; v: `Line((0, c), 1, output, 'Im w = ' + c)`; modulus: `Circle(0, c, output, -, '\|w\| = ' + c)`; `Ring(0, muted, '0')` | "Every value of f lies on this line (or circle). An entire map with a nonzero f′ would fill a small disk, so f′ = 0 and f is constant." |

All labels use the plane's label placer (5.8.4 pass E). A `Seam` is drawn by `drawSeam` with its label; a `Ray` extends to the plane edge. Far points follow 5.8.2.

---

## Appendix B. Explainer rows (`explainerData(card)`), family by family

TeX is written with single backslashes; double them in JavaScript strings. Helpers (local to the module; `complex.js` provides `texCart`, `texPolar`, `texNumber`, `texAngle`):

```
clean(z)      each part with |part| < 1e-9 becomes 0                        tn = texNumber    ta = texAngle
tc(z)   = texCart(clean(z))            tp(z) = |z| < 1e-9 ? '0\ (\text{no angle at } 0)' : texPolar(clean(z))
tcOrN(z) = |z.im| < 1e-12 ? tn(clean(z).re) : tc(z)
sq(x)   = x < 0 ? '\left(' + tn(x) + '\right)^2' : tn(x) + '^2'
shifted(name, v) = v === 0 ? name : '(' + name + (v < 0 ? ' + ' : ' - ') + tn(|v|) + ')'          // (x - 2), (y + 3), x
texExp(r, θ) = (r === 1 ? '' : tn(r) + '\,') + 'e^{' + (θ < 0 ? '-' : '') + 'i\,' + ta(|θ|) + '}'   // θ = 0 gives just tn(r)
ptRow(id, label, z, native)  -> { id, label, cart: tc(z), polar: tp(z), native, num: z }
lenRow(id, label, z, native) -> cart '\sqrt{' + sq(z.re) + ' + ' + sq(z.im) + '} = ' + tn(|z|); polar 'r = ' + tn(|z|); num |z|
angRow(id, label, z, native) -> |z| < 1e-9: both '\text{no angle at } 0', num null; else cart '\operatorname{atan2}(' + tn(z.im) + ',\ ' + tn(z.re) + ') = ' + ta(Arg z); polar '\operatorname{Arg} = ' + ta(Arg z); num Arg z
same(cartZ, polarZ, target?, extraOk = true) = { cart: tcOrN(cartZ), polar: tcOrN(polarZ), agree: extraOk && eq(cartZ, polarZ, 1e-8 * max(1, |cartZ|)) && (target === undefined || eq(cartZ, target, 1e-8 * max(1, |target|))) }
texLinear(nu, nv, k) = the equation nu·u + nv·v = k with a coefficient of ±1 written bare, zero terms left out ('u = \frac{1}{2}', 'v = 0', '-u + v = 1')
```
The **row table** gives `id` (the cell ids are `rehearse-ex-<id>-cart|polar`), `label` (the row heading, plain text with Unicode), `native`, the cells and `num`. `sameLabel` is the footer word ("same product" gives the footer "same product: agree"). Routes in `same` are those of the prototype: each is computed from `card.given` and `card.answer.values` by the *named address's own method*, never by reading the other column.

```
1.1.1  sameLabel 'same product'
  product  "z₁z₂"         cart  (tc(z1))(tc(z2)) = tc(product)                    polar  tp(product)                 native cart   num product
  quotient "z₁/z₂"        cart  \dfrac{tc(z1)}{tc(z2)} = tc(quotient)             polar  tp(quotient)                native cart   num quotient
  length   "length of z₁z₂"  cart  \sqrt{sq(product.re) + sq(product.im)} = tn(productAbs)    polar  r_1 r_2 = tn(|z1|)\cdot tn(|z2|) = tn(productAbs)   native polar   num productAbs
  same     cartZ (x1x2 - y1y2, x1y2 + x2y1) from the parts; polarZ fromPolar(|z1||z2|, Arg z1 + Arg z2); target v.product
1.1.2  sameLabel 'same conjugate'
  w        "z₁ ± z₂" (the op of the card)   ptRow(w) native cart
  mirror   "its conjugate"  cart  \overline{tc(w)} = tc(conjW)    polar  tp(conjW)     native cart   num conjW
  part     "Re or Im of the conjugate"  cart  \operatorname{Im}\left(tc(conjW)\right) = tn(result)   polar  r\sin\theta = tn(|w|)\sin\left(ta(Arg conjW)\right) = tn(result)     (Re: \operatorname{Re}, \cos)   native cart   num result
  same     cartZ (w.re, -w.im); polarZ fromPolar(|w|, -Arg w); target conjW
1.2.1  sameLabel 'same circle'
  centre   "centre a"       ptRow(center) null
  radius   "radius R"       cart  \sqrt{shifted('x', a.re)^2 + shifted('y', a.im)^2} = tn(R)       polar  \left|z - \left(tc(a)\right)\right| = tn(R)     native polar   num R
  equation "the relation"   cart  shifted('x', a.re)^2 + shifted('y', a.im)^2 REL tn(R^2)        polar  |a| < 1e-9 ? 'r REL tn(R)' : 'r^2 - 2r\cdot tn(|a|)\cos\left(\theta - ta(Arg a)\right) + tn(|a|^2) REL tn(R^2)'     native polar   num null
        REL is '=', '<' or '\le' from v.rel ('<=' gives '\le')
  same     the point p = a + R: cartZ (x²+y² form) C((p.re-a.re)^2 + (p.im-a.im)^2); polarZ C(r_p^2 - 2 r_p |a| cos(θ_p - Arg a) + |a|^2) with (r_p, θ_p) the polar address of p; target C(R^2)
1.2.2  sameLabel 'same distance'
  slide    "z₁ − z₂"        ptRow(difference) native cart
  length   "distance"       lenRow(difference) native cart                      num distance
  same     cartZ C(sqrt(dx^2 + dy^2)); polarZ C(r of the difference); target C(distance)
1.3.1  sameLabel 'same point'
  point    "z"              ptRow(z) null
  length   "r"              lenRow(z) native polar
  arg      "Arg z (the home step)"  angRow(z) native polar
  set      "arg z (the set)"  cart null    polar  \arg z = \left\{ ta(theta) + 2\pi k : k \in \mathbb{Z} \right\}   native polar   num null
  same     cartZ z; polarZ fromPolar(r, theta); target z
1.3.2  sameLabel 'same power'
  base     "z"              ptRow(base) null
  power    "zⁿ"             cart  (tc(base))^{n} = tc(result)     polar  tn(|base|)^{n}\,e^{i\,n\cdot ta(Arg base)} = texExp(v.r, rawAngle)     native polar   num result
  wrap     "angle, wrapped onto the home step"   cart null   polar  n\theta = ta(rawAngle) \;\to\; \operatorname{Arg} = ta(v.Arg)    native polar   num v.Arg
  same     cartZ the n-fold Cartesian product base·base·…; polarZ fromPolar(|base|^n, n·Arg base); target result
1.4.1, 1.4.2  sameLabel 'same c'     (c = 1 for 1.4.1, g.c for 1.4.2; n = g.n; r = v.radius ?? 1; A = Arg c)
  radius   "radius"         cart  \left(\sqrt{sq(c.re) + sq(c.im)}\right)^{1/n} = tn(r)      polar  \left|c\right|^{1/n} = tn(|c|)^{1/n} = tn(r)     native polar   num r
  arg      "Arg c (the home step)"   cart  \operatorname{atan2}(tn(c.im),\ tn(c.re)) = ta(A)    polar  \operatorname{Arg}\,c = ta(A)    native polar   num A
  first    "first root, k = 0"       cart  tc(root_0)       polar  texExp(r, A/n)       native polar   num root_0
  all      "all n roots"             cart  root_k (k = 0 … n-1) as tc, joined by ',\ '     polar  texExp(r, (A + 2πk)/n) for k = 0 … n-1, joined by ',\ '    native polar   num null
  check    "each root to the power n"  cart  \left(tc(root_0)\right)^{n} = tc(c)     polar  tn(r)^{n}\,e^{i\,n\cdot ta(A/n)} = tc(c)      native null   num c
  same     cartZ the n-fold Cartesian product root_0·…·root_0; polarZ fromPolar(r^n, n·(A/n)); target c;
           extraOk: every root_k to the n equals c AND root_k equals fromPolar(r, (A + 2πk)/n), to 1e-9
1.4.3  sameLabel 'same value of the polynomial'     (a, b, c, disc, roots from v; q = g.q)
  disc     "discriminant"   cart  sq(b) - 4\cdot tn(a)\cdot tn(c) = tn(disc)       polar  tn(disc) = tn(-disc)\,e^{i\pi}    native cart   num disc
  sqrt     "square roots of the discriminant"  cart  \pm\sqrt{tn(disc)} = \pm tn(2q)\,i    polar  tn(2q)\,e^{i\frac{\pi}{2}},\ tn(2q)\,e^{i\frac{3\pi}{2}}    native polar   num {0, 2q}
  root1    "z = (−b + √disc)/2"    ptRow(roots[0]) native cart
  root2    "z = (−b − √disc)/2"    ptRow(roots[1]) native cart
  same     cartZ roots[0]^2 + b roots[0] + c (Cartesian); polarZ fromPolar(r^2, 2θ) + fromPolar(|b| r, θ + (b < 0 ? π : 0)) + c with (r, θ) the polar address of roots[0]; target C(0)
1.5.1  sameLabel 'same endpoint'
  start    "start"          ptRow(start) native cart
  step     "step = end − start"   ptRow(direction) native cart
  mid      "z(½)"           ptRow(at.z) native cart
  same     cartZ start + direction; polarZ start + fromPolar(|direction|, Arg direction); target end
1.5.2  sameLabel 'same ring'
  centre   "centre a"       ptRow(center) null
  radii    "the two circles"   cart  tn(r0^2) LI shifted('x', a.re)^2 + shifted('y', a.im)^2 LO tn(r1^2)     polar  tn(r0) LI \rho LO tn(r1)      native polar   num null
        LI is '\le' when v.innerIncluded else '<'; LO is '\le' when v.outerIncluded else '<'
  verdict  "open, closed, domain"   cart  \text{WORD; DOMAIN; bounded}    polar  \partial S = \{\rho = tn(r0)\} \cup \{\rho = tn(r1)\}     native polar   num null
        WORD is 'open', 'closed' or 'neither open nor closed' (v.open, v.closed); DOMAIN is 'a domain' or 'not a domain' (v.domain)
  same     p = a + (r0 + r1)/2: cart '\text{inside}' or '\text{outside}' by the Cartesian inequality; polar the same by ρ; agree when both are inside (target 1)
2.1.1  sameLabel 'same w'
  z        "check point z"  ptRow(check.z) null
  w        "w = f(z)"       ptRow(check.w) null
  u        "u"              cart  u = v.uCart = tn(check.u)        polar  u = polarTermsTex(polarTerms.u) = tn(check.u)     native null   num check.u
  v        "v"              cart  v = v.vCart = tn(check.v)        polar  v = polarTermsTex(polarTerms.v) = tn(check.v)     native null   num check.v
  same     cartZ C(evalCartTerms(cartTerms.u, x, y), evalCartTerms(cartTerms.v, x, y)) at z = check.z; polarZ C(evalPolarTerms(polarTerms.u, r, θ), evalPolarTerms(polarTerms.v, r, θ)) at (r, θ) = polar address of z; target check.w
        evalCartTerms(list, x, y) = Σ c·x^xp·y^yp over [c, xp, yp]; evalPolarTerms(list, r, θ) = Σ (trig === null ? c : c·r^k·(trig === 'cos' ? cos kθ : sin kθ)) over [c, k, trig]
        polarTermsTex(list): terms joined by ' + ' / ' - ', each |c| (omitted when 1) + 'r' or 'r^{k}' + '\cos' or '\sin' + ' kθ' (k omitted when 1); a [c, 0, null] term is tn(|c|)
2.1.2  sameLabel 'same w'      (c = v.c; X = v.axis === 'x'; D = 4c^2)
  curve    "image curve"    cart  u = tn(vertex) (X ? '-' : '+') \dfrac{v^2}{tn(D)}         polar  \rho\,\left(1 (X ? '+' : '-') \cos\varphi\right) = tn(2c^2)     native cart   num vertex
  sample   "a point goes to"  cart  (tc(z))^2 = tc(w)            polar  tp(z) \mapsto r^2 e^{i\,2\theta} = tp(w)        native cart   num w
  focus    "focus"          cart  \left(0,\ 0\right)             polar  \rho = 0\ (\text{the pole})        native null   num 0
  same     cartZ C(z.re^2 - z.im^2, 2 z.re z.im); polarZ fromPolar(r^2, 2θ); target sample.w
2.1.3  sameLabel 'same w'       (T, lineEq from v; normalised line of 6.1 item 3: nu, nv, k ≥ 0, α = Arg(nu + i nv); a = g.a, b = g.b)
  point    "foot of the perpendicular from 0"   ptRow(T.point) null
  direction "direction of the line"   ptRow(T.dir) null
  equation "the line"       cart  texLinear(nu, nv, k)       polar  k > 1e-9 ? r\cos\left(\theta - ta(α)\right) = tn(k) : \theta = ta(Arg T.dir)\ \text{or}\ ta(wrapArg(Arg T.dir + π))      native cart   num k
  map      "a and b"        cart  a = tc(a),\ b = tc(b)       polar  a = tp(a),\ \text{slide } b = tc(b)       native polar   num null
  same     z = sample.z: cartZ a·z + b by the parts; polarZ fromPolar(|a||z|, Arg a + Arg z) + b; target sample.w
2.2.1  sameLabel 'same edge'    (α = g.alpha, n = g.n, to = v.sector.to)
  edge0    "edge arg z = 0"   cart  \text{the ray } y = 0,\ x > 0 \;\mapsto\; x^{n} > 0       polar  \arg z = 0 \;\mapsto\; \arg w = n\cdot 0 = 0      native polar   num 0
  edge1    "edge arg z = α"   cart  \left(\cos ta(α) + i\sin ta(α)\right)^{n} = tc(w1)       polar  1^{n}\,e^{i\,n\cdot ta(α)} = e^{i\,ta(to)}        native polar   num to      (w1 = the n-fold Cartesian product of e^{iα})
  opening  "opening of the fan"   cart  \operatorname{Arg}\,w_1 = ta(wrapArg(to))\ \text{(the home step only)}      polar  n\alpha = ta(to)\ \text{(a name for arg } w\text{)}      native polar   num to
  same     cartZ w1; polarZ fromPolar(1, nα); target fromPolar(1, to); extraOk |wrapArg(to − Arg w1)| < 1e-9
2.2.2  sameLabel 'same w'       (w = g.w, n = g.n)
  w        "w"              ptRow(w) null
  root     "principal root"  ptRow(v.root) native polar
  step     "Arg w ÷ n (the home step, divided)"   cart null    polar  \dfrac{\operatorname{Arg} w}{n} = \dfrac{ta(Arg w)}{n} = ta(Arg w / n)      native polar   num v.Arg (= Arg w / n)
  others   "the other roots (steps k ≥ 1)"   cart  v.others as tc, joined by ',\ '     polar  v.others as tp, joined by ',\ '      native polar   num v.others[0]
  same     cartZ root^n (Cartesian product); polarZ (fromPolar(|w|^{1/n}, Arg w / n))^n; target w; extraOk root equals that polar root to 1e-9
2.3.1  sameLabel 'same value'   (θ = path direction: line m -> atan m; vertical -> π/2; parabola, cubic -> 0)
  along    "value along this path"   cart  line: \dfrac{tc(C(1 - m^2, 2m))}{tn(1 + m^2)} = tc(along); vertical: \dfrac{-y^2}{y^2} = -1; parabola, cubic: \lim_{x \to 0} = 1    polar  e^{2i\theta} = e^{i\,ta(2θ)} = tc(along)     native polar   num along
  real     "along the real axis"        cart  1      polar  e^{i\,0} = 1       native polar   num 1
  imag     "along the imaginary axis"   cart  -1     polar  e^{i\pi} = -1      native polar   num -1
  same     cartZ the Cartesian value at z = 1 + m i (line), z = i (vertical), 1 (curves); polarZ fromPolar(1, 2θ); target along
2.4.1  sameLabel 'same value'   (σ = v.seam, n = v.n, rayPoint, φ = branchArg(rayPoint, σ))
  window   "window of names for arg z"   cart null   polar  ta(σ) < \theta < ta(σ + 2π)      native polar   num null
  ray      "the ray"        cart  z = tc(rayPoint)      polar  \theta = ta(φ)\ \text{(inside the window)}       native polar   num φ
  value    "f on the ray"   cart  tc(atRay)             polar  texExp(|rayPoint|^{1/n}, φ/n) = tc(atRay)        native polar   num atRay
  same     cartZ the one of the n roots of rayPoint whose Arg lies in (σ/n, (σ + 2π)/n]; polarZ fromPolar(|rayPoint|^{1/n}, φ/n); target atRay; extraOk exactly one root lies in the wedge
2.5.1  sameLabel 'same w'       (sample = v.sample; for the card's line input the target is a circle, for its circle input a line)
  circle input -> line target:   point "foot of the perpendicular from 0" ptRow(T.point); direction ptRow(T.dir);
        equation "the line"  cart texLinear(nu, nv, k)   polar r\cos\left(\theta - ta(α)\right) = tn(k)   native polar   num k;
        sample "a point goes to"  cart \dfrac{1}{tc(z)} = tc(w)    polar \dfrac{1}{tp(z)} = tp(w)    native polar   num w
  line input -> circle target:   centre ptRow(T.center); radius  cart \dfrac{1}{2\left|tn(c)\right|} = tn(T.radius)   polar \rho = tn(T.radius)   num T.radius;
        equation  cart (shifted('u', T.center.re))^2 + v^2 = tn(T.radius^2)   polar r = tn(2 T.radius)\cos\left(\theta - ta(Arg T.center)\right)   native polar   num null;  sample as above
  same     cartZ conj(z)/|z|^2 by the parts; polarZ fromPolar(1/r, -θ); target sample.w
3.1.1  sameLabel 'same f′'      (z0 = v.derivativeAt.z, fp = v.derivativeAt.fprime; L = localLinear(compile(v.src).f, z0))
  formula  "f′(z)"          cart  f'(z) = v.A       polar  A + B\,e^{-2i\varphi}\ \text{with}\ B = 0      native cart   num null
  value    "f′(z₀) at z₀ = 1 + i" (z0 printed with fmtCart)   ptRow(fp) native cart
  circle   "circle of directions"   cart  \text{radius } \left|B\right| = 0     polar  \text{one point: } A = tp(fp)     native polar   num 0
  same     cartZ fp; polarZ L.A; target fp; extraOk |L.B| < 1e-6
3.1.2  sameLabel 'same radius'  (A, B = v.localAt.A, .B; z = v.localAt.z; rad = |B|; L = localLinear(compile(v.src).f, z))
  A        "A, the move"    ptRow(A) native polar
  B        "B, the mirror part"   ptRow(B) native polar
  two      "real h and imaginary h"   cart  tc(A + B)\ \text{ and }\ tc(A - B)    polar  A + B\,e^{-2i\varphi}\ \text{at}\ \varphi = 0\ \text{and}\ \tfrac{\pi}{2}    native null   num null
  radius   "radius of the circle of directions"   cart  \tfrac{1}{2}\left|(A + B) - (A - B)\right| = tn(rad)    polar  \left|B\right| = tn(rad)    native polar   num rad
  same     cartZ C(|(A + B) − (A − B)|/2); polarZ C(|B|); target C(v.circleRadiusAt.radius); extraOk L.A equals A and L.B equals B to 1e-6
3.2.1  sameLabel 'same verdict' (z0 = card.values.z0; f = compile(v.src).f; J = jacobian(f, z0); L = localLinear(f, z0); crCart = |J.ux − J.vy| + |J.uy + J.vx|; crPolar = |L.B|)
  partials "partials at z₀"   cart  u_x = texAscii(v.cr.ux),\ v_y = texAscii(v.cr.vy);\ u_y = texAscii(v.cr.uy),\ v_x = texAscii(v.cr.vx)    polar  A = tp(L.A),\ \left|B\right| = tn(crPolar)     native cart   num null
  A        "A, the move, at z₀"   ptRow(L.A) null
  verdict  "u_x = v_y and u_y = −v_x?"   cart  (crCart < 1e-6 ? '\text{holds}' : '\text{fails}'): \left|u_x - v_y\right| + \left|u_y + v_x\right| = tn(crCart)     polar  \left|B\right| = tn(crPolar)\ \text{so there is } (v.entire ? 'no' : 'a')\ \text{mirror part}     native cart   num null
  fprime   "f′(z₀)"         entire: cart  f'(z) = v.fprimeTex   polar tp(L.A)   num L.A;   not entire: cart \text{no } f'   polar \text{no single move}   num null     native cart
  same     cart tn(crCart); polar tn(crPolar); agree: (crCart < 1e-6) === (crPolar < 1e-6) and both equal v.entire         (texAscii turns 'cos' and 'sin' into '\cos' and '\sin')
P1     sameLabel 'same number'
  prod     "z₁z₂"           ptRow(mul(z1, z2)) null
  mirror   "conj(z₁z₂)"     ptRow(conj(mul(z1, z2))) native polar
  both     "conj z₁ · conj z₂"   cart  (tc(conj z1))(tc(conj z2)) = tc(both)    polar  tp(conj z1)\cdot tp(conj z2) = tp(both)     native polar   num both
  same     cartZ C(x1x2 − y1y2, −(x1y2 + x2y1)); polarZ fromPolar(r1 r2, −(θ1 + θ2)); target both
P2     sameLabel 'same number'
  z        "z"              ptRow(z) null
  zzbar    "z · conj z"     cart  (tc(z))(tc(conj z)) = x^2 + y^2 = tn(N)      polar  r e^{i\theta}\cdot r e^{-i\theta} = r^2 = tn(N)      native polar   num N (= v.check.zzbar)
  abs      "the modulus"    lenRow(z) native polar        (num |z|)
  same     cartZ C(x^2 + y^2); polarZ C(r^2); target C(N)
P3     sameLabel 'same value'  (a, b, c, d, coeff, shift from v.check)
  a        "a"              ptRow(a) null
  c        "c"              ptRow(c) null
  coeff    "ac"             cart  (tc(a))(tc(c)) = tc(coeff)      polar  tp(a)\cdot tp(c) = tp(coeff)       native cart   num coeff
  shift    "ad + b"         cart  (tc(a))(tc(d)) + tc(b) = tc(shift)      polar  tp(shift)       native cart   num shift
  same     at z = 1: cartZ a(c·1 + d) + b by the parts; polarZ coeff·1 + shift; target coeff + shift
P4     sameLabel 'same w'      (a = g.a, R = g.R, radius = v.radius)
  a        "a"              ptRow(a) null
  radius   "radius of the image"   cart  \sqrt{tn(|a|^2)\cdot tn(R^2)} = tn(radius)    polar  \left|a\right| R = tn(|a|)\cdot tn(R) = tn(radius)     native polar   num radius
  turn     "Arg a (the turn)"      cart null   polar  \operatorname{Arg}\,a = ta(Arg a)     native polar   num Arg a
  sample   "z = R goes to aR"      cart  tn(R) \mapsto (tc(a))\,tn(R) = tc(aR)     polar  tn(R) \mapsto tn(|a| R)\,e^{i\,ta(Arg a)}     native polar   num aR
  same     cartZ a·R by the parts; polarZ fromPolar(|a| R, Arg a); target aR
P5     sameLabel 'same value'  (θ = path direction as in 2.3.1; θc = 0 for the real axis, π/2 for the imaginary axis)
  along    "value along this path"   cart  line: \dfrac{1}{tc(C(1, m))} = tc(along); vertical: 0; parabola, cubic: \lim_{x \to 0}\dfrac{1}{1 + ix} = 1     polar  \cos ta(θ)\,e^{-i\,ta(θ)} = tc(along)     native polar   num along
  contrast "value along the other axis"   cart tc(contrast.value)    polar  \cos ta(θc)\,e^{-i\,ta(θc)} = tc(contrast.value)     native polar   num contrast.value
  circle   "every direction"   cart  \left|w - \tfrac{1}{2}\right| = \tfrac{1}{2}     polar  \tfrac{1}{2} + \tfrac{1}{2}\,e^{-2i\theta}     native polar   num null
  same     cartZ the Cartesian value (div(1, 1 + m i); 0; 1); polarZ fromPolar(cos θ, −θ); target along
P6     sameLabel 'same radius'  (A, B = v.A, v.B; rad = |B|; L = localLinear(compile(v.src).f, card.values.z0))
  A, B     ptRow(A) null; ptRow(B) null
  real     "real h"         cart  A + B = tc(A + B)     polar  A + B\,e^{0} = tp(A + B)       native null   num A + B
  imag     "imaginary h"    cart  A - B = tc(A - B)     polar  A + B\,e^{-i\pi} = tp(A - B)   native null   num A − B
  radius   "radius of the circle of directions"   cart  \tfrac{1}{2}\left|(A + B) - (A - B)\right| = tn(rad)   polar  \left|B\right| = tn(rad)    native polar   num rad
  same     as 3.1.2 with target C(v.circle.radius)
P7     sameLabel 'same f′'
  kind     "what is constant"   u: cart u(x, y) = tn(c)   polar \operatorname{Re}\,w = tn(c)\ \text{(a vertical line)};   v: cart v(x, y) = tn(c)   polar \operatorname{Im}\,w = tn(c)\ \text{(a horizontal line)};   modulus: cart u^2 + v^2 = tn(c^2)   polar \left|w\right| = tn(c)\ \text{(a circle)}      native null   num c
  fprime   "f′ = u_x + i v_x"   cart  u_x + i\,v_x = 0 + 0\,i = 0     polar  \left|f'\right| = 0:\ \text{no stretch, no turn}      native cart   num 0
  same     cartZ C(0); polarZ C(0); target C(0)     (the proof's conclusion, not a computation: agree is true by construction and the row says so)
```

Row ids are the first column; the table of 6.3 pins every `num`. `native: null` rows get no badge.
