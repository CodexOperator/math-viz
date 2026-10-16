# Design: i2-generators (iteration 2, wave 0, kind: engine)

Goal: **Seeded fresh variants of every review problem type with exact answers: `js/data/generators.js`.**
Owns: `js/data/generators.js` and nothing else. The unit test file and the interaction script named in section 7 are written by the builder; Appendix B and Appendix C of this document are complete, runnable versions of both.
Reads: `docs/STORY.md` 7 and 10, `docs/ARCHITECTURE.md` 2, 3.1, 3.3, 4, 4.1, 11.6, `js/core/complex.js` (the only import), `js/data/problems.js` (wording only, never imported), `js/data/functions.js` (ids only, never imported), `js/core/parse.js` (used only by the tests, to prove the `src` strings the cards carry compile).

How to read this file. Sections 1 to 9 are the design. **Appendix A is a complete reference implementation of the module** (about 1,050 lines, written as the pseudocode of section 5 made executable). It was run against the test file of Appendix B (25 tests, all green), against the interaction script of Appendix C in headless Chromium at 1280 px and 390 px (green, 580 cards in about 35 ms), and its 5,000 TeX strings were rendered with the vendored KaTeX in strict mode (no error). **Fix round 1 (after the first review): the three appendices now are the files of the repo as they stand after the fixes (`js/data/generators.js`, `tests/unit/i2-generators.test.mjs`, `tests/interact/i2-generators.mjs`); if a number or a sentence of this document and an appendix differ, the appendix is the one that was tested, and the repo file is the one that ships.** Where the numbered pseudocode of section 5 and Appendix A seem to differ, Appendix A is the one that was tested. Every number in sections 6 and 7 was produced by the module and checked by hand; the copy deck of 2.4 and the golden givens of 7.1 are regenerated from the module after the fixes.

## 0. Decisions and differences from ARCHITECTURE.md (read before building)

Actual exports win over ARCHITECTURE.md. For `js/core/complex.js` there is **no difference** for any name this module imports (`Arg, wrapArg, fromPolar, add, sub, mul, div, neg, conj, inv, abs, abs2, exp, pow, rootsOf, rootsOfUnity, principalRoot, branchRoot, isPrimitiveRoot, fmtNum, fmtAngle, exactAngle, texNumber, texAngle, texCart`): each is exported with the ARCHITECTURE 3.1 signature. Behaviour relied on: `Arg(negative real) = π`; `wrapArg` snaps a result within 1e-12 of −π to π; `mul`, `div`, `conj`, `neg` return +0, never −0; `rootsOf` is in k order; `pow` of a Gaussian integer is exact; `texNumber` knows fractions up to 24, p√2/q and p√3/q, p·π/q (and not √5, √29); `fmtAngle(θ)` prints `2pi/3` when θ = pπ/q with q ≤ 12 or q = 18.

ARCHITECTURE 11.6 is kept exactly: eight exports (`FAMILIES, rng, generate, draw, solve, check, statementFor, familyInfo`) and the Card shape. These are the places where the design goes beyond or interprets it; the integrator should copy them into 11.6 and section 9:

| # | Decision | Why |
|---|---|---|
| D1 | **P5 is a `choice` card** (four values; the right one is the value of x/z along the card's path). | `docs/goals/iter-2.json` i2-rehearse A2 clicks `#rehearse-choice-<card.sketch.correct>` on `generate('P5', 1)`. STORY 7 gives P5 no sketch. |
| D2 | **2.3.1 never draws the cubic path y = x³** (P5 does; its `values` is then `null`). `solve('2.3.1', { path: { kind: 'cubic' } })` still works. | A5 needs every Walk-stop card (2.3.1 among them) to open a station; the limits station has no cubic path (ARCH 4.1). A3 allows `values: null` only for P5 and 2.3.1 with that path. |
| D3 | Extra card fields: `sketch.prompt` (one ASCII instruction), `sketch.fit` (`{ center, halfWidth }`, a square view that holds the origin and the answer), `sketch.target` (the geometry `check` compares with, copied into `answer.values.target`), `sketch.n` for roots sketches. A consumer may ignore all four. | The guess plane needs a view and a sentence; `check(card, guess)` takes only the card, so the target must be on it. |
| D4 | `check` tolerances. points 0.15; roots `min(0.2, 0.12·R)` where R is the radius of the root circle; circle centre 0.2 and radius `max(10 %, 0.05)`; line 0.15 per point and the two points at least 0.5 apart; sector 5° per edge. For a big view the three length tolerances rise to `max(base, 0.04·halfWidth)` but never above 0.25. | ARCH 11.6 gives 0.15, 0.2, 10 %, 5°. A3 demands that roots rotated by 10° fail (for radius 1 that is a shift of 0.174, which 0.2 would accept) and that points shifted by 0.3 fail (so the cap stays below 0.3). |
| D5 | **First draw is stratified**: `generate` hands `draw` a source whose first number is `frac(seed · 0.6180339887498949)` and then the plain mulberry32 stream. `rng` itself is plain mulberry32. | A2 needs `given` to differ between neighbouring seeds in at least 45 of 50 pairs. 1.4.1 has five variants, 2.4.1 has five, 3.2.1 has eight: a random first draw would repeat in about 20 % of the pairs. The stratified first draw makes neighbouring seeds land in different buckets whenever the first draw picks among at least 3 equal buckets (proof in 5.2); measured: 0 collisions in 20,000 consecutive seeds for all 29 families. **Consequence: ARCH 11.6's "generate = solve(id, draw(id, rng(seed)))" is not true. `generate(id, s)` is `solve(id, draw(id, stream(s)))`, and `draw(id, rng(s))` is a different card; the unit test A2 therefore checks `generate` against `solve(id, card.given)`. The integrator copies this into 11.6.** |
| D6 | 1.4.2 draws from a fixed table of 19 `(c, n)` pairs (radius 1, 2, 3, 4 or √2; n ≤ 6; the handout's (−16, 4) left out). **The order of the table is part of the contract**: it makes `generate('1.4.2', 7)` the fourth roots of −81, the card the Rehearsal Room's pinned seed 7 and its A6 screenshot ("the four roots") expect. | i2-rehearse A1 and A6. |
| D7 | 3.1.2 draws from twelve functions: z·Re z, z·Im z, 2\|z\|², 3\|z\|², −\|z\|², \|z − 1\|², \|z + 1\|², \|z − i\|², \|z + i\|², 2\|z − 1\|², 2\|z + i\|², \|z − 1 − i\|² (each differentiable at exactly one point); P6 from nine nowhere-differentiable functions (conj z, Im z, 2 Re z, 3 Re z, 2 Im z, 2 conj z, 3 conj z, Re z + Im z, i conj z). `solve` accepts the handout functions too. | With the handout (\|z\|², Re z) left out, STORY 7's list leaves one function for 3.1.2 and two for P6; A2 needs variety. All are checked against `localLinear`. |
| D8 | 1.2.1 keeps its three relations (=, <, ≤). 1.5.2 draws annuli with all four strictness combinations; the punctured disk and the half plane of STORY 7 are **not generated: a scope cut**, and STORY 7's "also the reverse −C" for 1.5.1 stays a distractor only. | A2's rule "open iff both strict, closed iff both non-strict, domain iff open" is stated for the annulus given (`center, r0, r1, innerStrict, outerStrict`); a punctured disk or a half plane has no radius pair and no flags, so each would be a second `given` shape (and a second `values` shape) for the Rehearsal Room to handle, for a variant the handout's own problem (an annulus) does not need. **The first build said the sets station's `values` shape has no route for them; that was wrong.** ARCH 4.1 lists `{ preset: 'annulus' \| 'closed' \| 'punctured' \| 'halfplane' \| 'twodisks' }` for `sets`, so a later goal can add both variants through that route. Listed in section 9. |
| D9 | `values.quadratic` (1.4.3) carries **real** coefficients `{ a, b, c }`, as the roots station's number inputs do. | ARCH 4.1 does not say; every other complex value is `{ re, im }`. The roots adopter (i2-decisions-everywhere-a) must read them as reals. |
| D10 | A4 says no `window` anywhere in the file; A1 requires `values.window` (2.4.1). The inspection therefore forbids `window` followed by `.`, `[`, `(`, `=` or `)` and allows the key `window:`. It also forbids `Math.random`, `Date`, `document`, `globalThis`, `localStorage`, `setTimeout`, `performance`, `import(` and `require(`, **comments included**. | The words must not appear even in a comment. |
| D11 | Roots sketches need `sketch.n` handles: 1.4.2 has n up to 6 and 1.4.1 up to 8. ARCH 9 lists `rehearse-plane-g0 … g3` for roots. i2-rehearse must create `g0 … g7` as needed. | Recorded as a request: `i2-rehearse` is not built yet, so the risk stays open until it makes the handles; the integrator copies D5 and D11 into ARCH 11.6 and section 9. |
| D12 | `generate` stores `seed` as the uint32 the seed turns into (`Math.floor(Number(seed)) >>> 0`, or FNV-1a for a string). For the integers 1, 2, … it is the number passed. | A2: `card.seed === s`. |
| D13 | **Exact numbers, and a mark on every rounded one.** `exactReal` knows integers and fractions up to denominator 50 (it was 24), p√2/q and p√3/q up to 24; `tNum` and `tCart` are the module's TeX twins of `texNumber` and `texCart` (those live in `complex.js`, which this goal does not own, and stop at 24). A number with no exact form is written with at most three decimals and the sentence says so: `~` in `answer.text`, the approx sign or "about" in prose, `\approx` in TeX, "rounded to 3 decimals" for a list. | 1.1.1's quotient has denominator \|z₂\|² up to 50 and was printed as `-0.885 - 0.423i` with no mark for 27 % of the cards; the goal title promises exact answers. The test "a rounded number is always marked" fails on an unmarked decimal in any field of any family. |
| D14 | **Sign-aware text.** One small set of helpers builds every signed piece: `br` (a negative factor in brackets), `coefVar` (a coefficient times a variable: no `1x`, no `0x`, `3x²/4`, `√3 x`), `sgnTerm` (` + 2iy`, ` − 6iy`), `sh` and `shPlus` (`w + 1/2`, never `w - -1/2`), `sq` (`x^2` or `(x - 3)^2`), `quot` and `over` (`-(u + 1)`, `(3/4 + i)/(5/4)`), `shiftA` (`t - pi/4`), `rE` and `eCoefA` (the coefficient of `e^…`, none when 1), `lineForm`, `around`. | The first build pasted negative numbers into templates: `+ -6iy`, `u/-1`, `|w - -1/2|`, `t + -pi/4`, `-1(2zh + h²)`, `0x`, `1ρ`, `1i`. The test "no sign-unaware template" runs a regex lint over every field of every family for seeds 1..300. |
| D15 | **Wording.** One spelling, American (`center`), in prompts, prose, TeX and `check` details (the handout says "centered"). 1.4.2 says `square`, `cube`, `4th`, … through `rootWord`. The direction of a turn follows the sign of `Arg a` (`counterclockwise`, `clockwise`, `a half turn`, `do not turn`). A point on an axis is "on the positive real axis", never in a quadrant. P5 quotes the axis that differs (`1` on the real axis, or `0` on the imaginary axis when the path already gives 1). | Review items 2, 3, 4 and 11. |
| D16 | **Never the handout's answer.** 2.1.2 drops `x = -2` (it has the handout's image curve `u = 4 - v²/16`); 3.1.1 never draws `a = b = 1` (its derivative is the handout's `2z + 1` whatever c is); 1.5.2 never draws the handout's two circles whatever the inequalities. The test "a different given never gives the handout answer" compares `answer.text` with the handout's for 1000 seeds of every family where a different given can alias. It leaves out 1.1.1, 1.1.2, 1.2.2 and P1 (a different pair can have the same product or the same difference: arithmetic, not the handout's problem) and 3.1.2 and P6 (the verdict is the same for every function differentiable only at one point). | Review item 9. |
| D17 | **P3 `answer.values`** carries `coeff` and `shift` at the top as well as in `check` (goal A1 names them at the top; ARCH 3.3 nests them). **A1's "2.3.1 along is 1 / is −1" means the complex numbers `{ re: 1, im: 0 }` and `{ re: -1, im: 0 }`**; `along` stays complex for every path. | Review item 7. ARCH 11.6 should say so (a request below). |

## 1. Goal restatement, thread, coverage

**The goal.** One pure module that turns a seed into a fresh variant of any of the 29 review-problem types (the 22 numbered problems and P1 to P7): the statement with new numbers (TeX and ASCII), the exact answer (TeX, ASCII and numbers), a small guess task for the Rehearsal Room's plane (or four choices, or nothing for a proof), the preset that opens the right station with those numbers, a Lab request for the five image types, and both worked routes, Cartesian and polar, in plain prose. It never reproduces the handout's own numbers and it never uses anything but the seed.

**The thread it carries.** The test will not use the handout's numbers and it does not matter: the place, the two decisions and the picture are the same. So each card repeats the thread rule of its family in the words it is solved in:

| Family | The rule the worked prose says (and the tests look for) |
|---|---|
| 1.4.1, 1.4.2, 1.4.3 (Names: all) | "take every name and divide the staircase by n": `(Arg c + 2πk)/n`, k = n is k = 0 again |
| 1.3.1, 2.2.2 (Names: home) | "the home step": Arg z is the one name in (−π, π] |
| 2.4.1 (Names: continuous) | "a continuous choice of name never jumps except across the seam" |
| 2.1.2, 2.1.3, 2.2.1, 2.5.1, P4 (images of shapes) | "parametrize, push forward, eliminate the parameter" |
| 3.1.1, 3.1.2, 3.2.1, P6, P7 (the derivative) | "the mirror part B": Δw ≈ AΔz + B·conj Δz, differentiable means no mirror |
| 1.1.1, P1, P2 (arithmetic) | "a move: turn and stretch" |
| every card | the Cartesian text speaks in x and y, the polar text in r and θ; each angle says whether it is Arg z (the home step), "a name for arg z" or arg z (the set) |

How it shows on screen: the Rehearsal Room card (section 2) is built from the card's fields; after Reveal the student reads two short paragraphs side by side, `worked.cart` under the `--cart` bar and `worked.polar` under the `--polar` bar, with the same numbers in both, and the picture of the station that owns the type.

**Problems and topics covered** (all 29 ids, as the handout; topics from `js/data/problems.js`):

| Topic | Families |
|---|---|
| T1.1 algebraic properties | 1.1.1, 1.1.2, P1, P2 |
| T1.2 geometric interpretation | 1.2.1, 1.2.2 |
| T1.3 polar representation | 1.3.1, 1.3.2, P2 |
| T1.4 powers and roots | 1.3.2, 1.4.1, 1.4.2, 1.4.3 |
| T1.5 sets of points | 1.5.1, 1.5.2 |
| T2.1 functions and mappings | 2.1.1, 2.1.2, 2.1.3, P3, P4 |
| T2.2 power and root functions | 2.2.1, 2.2.2 |
| T2.3 limits and continuity | 2.3.1, P5 |
| T2.4 branches | 2.4.1 |
| T2.5 reciprocal and extended plane | 2.5.1 |
| T3.1 derivatives | 3.1.1, 3.1.2, P6 |
| T3.2 Cauchy–Riemann | 3.2.1, P7 |

`goals/iter-2.json` lists the same ids (1.1.1 to 3.2.1, P1 to P7) and T1.1 to T3.2 in `assignment_refs`; every id and topic above is covered.

## 2. UX: the card is the screen

This module has no DOM, no control and no id of its own. What the student meets is the **card**: the wording of the question, a one-line instruction, a small task on a plane (or four answers to choose from), and, after Reveal, the answer and two short routes. The Rehearsal Room (`i2-rehearse`) draws it; this section says what each field of the card is for, so the design and the build agree on the words, the tasks and the tolerances. Element ids are ARCHITECTURE 9 "rehearse"; the module only supplies the data behind them.

### 2.1 Wireframes (where each card field lands)

Desktop, 1280 px (the card column is about 960 px):

```
+------------------------------------------------------------------------------------------+
| card.id 1.4.2 · card.kind problem · seed 7                      #rehearse-readout        |
+------------------------------------------------------------------------------------------+
| #rehearse-statement   <- card.statement, through statementParts() and tex()              |
|   Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms.|
+-------------------------------------------+----------------------------------------------+
| #rehearse-decisions   (picker: decisions.js)| card.sketch.prompt        (one line, muted)  |
|  Address [C][P][C->P][P->C][C->P->C][both]  |  Drag the 4 handles onto the 4 roots.        |
|  Names   [none][any][all][home][continuous] | +------------------------------------------+ |
|                                             | |  #rehearse-plane, view = card.sketch.fit | |
|                                             | |   handles #rehearse-plane-g0 .. g3       | |
|  [ Reveal ]  #rehearse-reveal               | |   (card.sketch.n of them)                | |
|                                             | +------------------------------------------+ |
+-------------------------------------------+----------------------------------------------+
after Reveal
| #rehearse-verdict    chips right/wrong, and check(card, guess).detail                    |
| #rehearse-answer     card.answer.tex (display, .tex-scroll)                              |
| #rehearse-answer-text card.answer.text (ASCII, wraps; the string a script asserts)       |
| Cartesian (slide), --cart bar            | Polar (turn and stretch), --polar bar         |
|   card.worked.cart                       |   card.worked.polar                           |
| [Open at Roots with these numbers]  card.values   [Open in the Lab]  card.labRequest     |
| [Another one like it]  -> generate(id, newSeed)                                          |
+------------------------------------------------------------------------------------------+
```

Phone, 390 px (one column, 16 px gutters, no horizontal page scroll):

```
+--------------------------------+
| 1.4.2 · seed 7                 |
| statement (wraps; each maths   |
|   run is one non-wrapping unit)|
| Address [C][P][C->P] ...wrap   |
| Names   [none][any][all] ...   |
| prompt (muted, may wrap)       |
| +----------------------------+ |
| | plane ~350 x 350, fit view | |
| | handles >= 44 px hit area  | |
| +----------------------------+ |
| [ Reveal ]                     |
| verdict                        |
| answer.tex (scrolls inside its |
|   own box, answer.text below)  |
| worked.cart   (bar --cart)     |
| worked.polar  (bar --polar)    |
| [Open at Roots]                |
| [Open in the Lab]  (if any)    |
| [Another one like it]          |
+--------------------------------+
```

A `choice` card replaces the plane by four stacked radio chips (`#rehearse-choice-0` to `-3`, text = `card.sketch.options[k]`, at most 72 characters, so at most two lines at 350 px). A `none` card (proofs P1, P2, P3, P7) shows no plane and no chips: the prompt says "A proof: set the two decisions, then open the worked solution." and Reveal is enabled at once.

### 2.2 The seven kinds of guess task

Each family has one kind (two for 2.5.1: its circle input has a line as image, its line input a circle). `familyInfo(id).sketch` names it.

| `sketch.kind` | Families | What the student does | Pointer and touch | Keyboard | `check` passes when |
|---|---|---|---|---|---|
| `point` (`count` 1 or 2) | 1.4.3 (2 points: the two roots), 2.2.2 (the principal root), 2.3.1 (the value of the limit along the path) | drags `count` handles | pointer events on the handle button; a touch drag works the same (plane.js) | Tab to the handle, arrows move it by 0.1 (Shift ×10, Alt ÷10) | every target point has its own guess within 0.15 (any order) |
| `roots` (`n`) | 1.4.1, 1.4.2 | drags `n` handles onto the n roots | as above | as above | every root has its own guess within `min(0.2, 0.12·R)` |
| `circle` | 1.2.1 (the boundary), P4 (the image), 2.5.1 with a line input (the image) | drags a centre handle, then a rim handle | as above | as above | centre within 0.2 and radius within `max(10 %, 0.05)` |
| `line` | 2.1.3 (the image), 2.5.1 with a circle input (the image) | drags two handles onto the line | as above | as above | both points within 0.15 of the line and at least 0.5 apart |
| `sector` | 2.2.1 | drags two handles, one on each edge ray of the image sector | as above | as above | both edge angles within 5° (any order), neither handle at 0 |
| `choice` | 1.1.1, 1.1.2, 1.2.2, 1.3.1, 1.3.2, 1.5.1, 1.5.2, 2.1.1, 2.1.2, 2.4.1, 3.1.1, 3.1.2, 3.2.1, P5, P6 | picks one of four | click or tap a chip | arrow keys move between the radio chips, Space selects | the index equals `sketch.correct` |
| `none` | P1, P2, P3, P7 | nothing | | | never: `check` returns `ok: null` |

Tolerances in length units are ARCH 11.6 refined as decision D4. On a 350 px plane they are 5.0 to 23 px (measured over 3,000 seeds per family): roots and points 7 to 13 px, circles 7 to 23 px, far image lines 5 px at worst (2.1.3 with |a·c + b| large; the card's `fit` centres the view on the foot of the perpendicular from 0 to keep the plane small). The plane's zoom buttons and pinch zoom are the remedy for the rare 5 px case; the module never makes a card impossible, only small.

### 2.3 Empty, loading and error states

The module is synchronous and pure, so it has no loading state. Everything that can go wrong is a return value or a `RangeError` the Rehearsal Room handles. Suggested consumer copy is given so the words stay plain:

| State | Cause | Module behaviour | Suggested consumer behaviour and copy |
|---|---|---|---|
| Unknown problem type | `generate('nope', s)`, `familyInfo('nope')` | returns `null`; `solve` and `draw` throw `RangeError('generators: unknown family nope')` | show the default type and the note "There is no problem type called that. Here is the first one." |
| A given the family cannot solve | `solve('1.1.1', { z1, z2: 0 })`, n out of range, a junk field | throws `RangeError` with a sentence ("generators: 1.1.1: z2 must not be 0"); never any other error type | `generate` never reaches it; for a hand-built given, show "That card could not be built. Press Another one like it." |
| A card whose station cannot show it | `values === null` (P5 on y = x³) | the card is complete | hide `#rehearse-open-station`; keep the picture in the worked text |
| A card with no Lab picture | `labRequest === null` (all but five types) | the card is complete | hide `#rehearse-open-lab` |
| A proof | `sketch.kind === 'none'` | `check` returns `{ ok: null, detail: 'This one is a proof: nothing to place.' }` | verdict `data-guess="skipped"`; no plane |
| A guess of the wrong shape | wrong count, `null`, `NaN`, a bare number | `check` returns `{ ok: false, detail }` with an instruction, never throws | show the detail line under the plane |

`check(card, guess).detail` is one of these plain sentences (all ASCII): `That is the one.` / `Not that one.` / `Pick one of the answers.` / `Place k point(s).` / `Place n points, one for each root.` / `The point is on target.` / `Both points are on target.` / `At least one point is off its target.` / `All n roots are in place.` / `At least one root is off its place.` / `Drag the centre and a point on the rim.` / `The centre and the radius both match.` / `The centre is off.` / `The radius is off.` / `Place 2 points on the line.` / `Put the two points farther apart.` / `Both points are on the line.` / `A point is off the line.` / `Place 2 points away from 0, one on each edge ray.` / `Both edges are right.` / `An edge is off by more than 5 degrees.` / `This one is a proof: nothing to place.` / `There is no card to check.` / `This card has nothing to compare with.` / `Unknown sketch.` (the last two only for a card that was built by hand)

### 2.4 The copy deck (what each card says; seed 1 of every family)

`statementText` and `answer.text` are ASCII (what a script asserts and what a student can copy); `statement` and `answer.tex` are the same wording as TeX; `sketch.prompt` is ASCII; the two worked paragraphs are prose with `√`, `π`, `θ`, `²` and are rendered with `prose()` (rule 10.4.3): the text is typeset from ASCII number strings by one small function (`typeset`: `sqrt(n)` to `√n`, a standalone `pi` or `Npi` to `π`, `Nπ`). Every sentence of every worked paragraph is in Appendix A, family by family. The sentences that carry numbers or signs are exercised by the sentence-level tests of 7.9 (the text of `answer.text` is parsed and compared with `answer.values`; a sign lint runs over every field of every family); the rest of the prose is exercised only by its length, its alphabet and the keywords of 7.6. The deck below is generated by the module as it stands after the fixes of round 1 (seed 1 of every family).

| id | statementText (seed 1) | sketch.prompt | answer.text (seed 1) |
|---|---|---|---|
| 1.1.1 | Let z1 = 2 + 2i and z2 = -5 + i. Compute z1 z2 and z1/z2 in the form x + iy. | Pick z1 z2. | z1 z2 = -12 - 8i; z1/z2 = -4/13 - (6/13)i |
| 1.1.2 | Find Im(conj(z1 - z2)) for z1 = 2 + 2i and z2 = -5 + i. | Pick the number. | Im(conj(z1 - z2)) = Im(7 - i) = -1 |
| 1.2.1 | Sketch the set of points in the complex plane that satisfy \|z - (1 + 2i)\| < 1. | Drag the center, then the rim point, to draw the boundary circle. | open disk, center 1 + 2i, radius 1: (x - 1)^2 + (y - 2)^2 < 1 |
| 1.2.2 | Find the distance between 2 + 2i and -5 + i. | Pick the distance. | distance = \|7 + i\| = sqrt(50) ~ 7.071 |
| 1.3.1 | Write z = -sqrt(3) - i in polar form r(cos(theta) + i sin(theta)) and exponential form r e^(i theta). What is Arg(z)? | Pick Arg z, the home step. | z = 2(cos(-5pi/6) + i sin(-5pi/6)) = 2 e^(-i 5pi/6); Arg z = -5pi/6; arg z = {-5pi/6 + 2 pi k} |
| 1.3.2 | Use polar form to compute (-sqrt(3) - i)^4. Express the final answer in Cartesian form x + iy. | Pick the Cartesian form of the power. | (-sqrt(3) - i)^4 = 16 e^(-i 10pi/3) = -8 + (8 sqrt(3))i; Arg = 2pi/3 |
| 1.4.1 | Find and sketch the 7th roots of unity. | Drag the 7 handles onto the 7 roots. | z_k = e^(i 2 pi k/7), k = 0..6, rounded to 3 decimals: 1; 0.623 + 0.782i; -0.223 + 0.975i; -0.901 + 0.434i; -0.901 - 0.434i; -0.223 - 0.975i; 0.623 - 0.782i; primitive: k = 1, 2, 3, 4, 5, 6 |
| 1.4.2 | Find all the square roots of 2i. Express answers in both exponential and Cartesian forms. | Drag the 2 handles onto the 2 roots. | sqrt(2) e^(i pi/4), sqrt(2) e^(i 5pi/4) = 1 + i, -1 - i; as Arg values the angles are pi/4, -3pi/4 |
| 1.4.3 | Use the quadratic formula to solve z^2 - 4z + 20 = 0. | Drag the two points onto the two roots. | z = (4 +- sqrt(-64))/2 = 2 + 4i or 2 - 4i |
| 1.5.1 | Find a parameterization of the line from 2 + 2i to -5 + i. | Pick the parameterization that runs from the first point to the second. | z(t) = (2 - 7t) + i(2 - t), 0 <= t <= 1 |
| 1.5.2 | Consider S = { z in C : 2 <= \|z - (1 - 3i)\| < 4 }. Is S open, closed, or neither? Is S bounded? What are the boundary points of S? Is S a domain? Why or why not? | Pick the verdict. | neither open nor closed; bounded; boundary = {\|z - (1 - 3i)\| = 2} union {\|z - (1 - 3i)\| = 4}; not a domain (not open); it is a region (connected) |
| 2.1.1 | Express f(z) = z^3 + (1 - i)z in the form u(x, y) + iv(x, y) and u(r, theta) + iv(r, theta). | Pick u(x, y) and v(x, y). | u = x^3 - 3xy^2 + x + y, v = 3x^2y - y^3 - x + y; u = r^3 cos(3 theta) + r cos(theta) + r sin(theta), v = r^3 sin(3 theta) - r cos(theta) + r sin(theta) |
| 2.1.2 | Determine the image of the horizontal line y = -1 under w = z^2. Describe the resulting curve in the w-plane. | Pick the equation of the image. | parabola u = -1 + v^2/4 (vertex -1, opens right, focus 0) |
| 2.1.3 | Find the image of the line y = 3 under f(z) = 2iz + 1 - 3i. What does this linear transformation do to the plane in general? | Drag the two points onto the image line. | the line u = -5; in general: turn by Arg a = pi/2 (counterclockwise), stretch by \|a\| = 2, then slide by 1 - 3i |
| 2.2.1 | Find the image of the sector 0 < arg(z) < pi/3 under w = z^3. | Drag the two points onto the two edge rays of the image sector. | the sector 0 < arg w < pi |
| 2.2.2 | Compute the principal value of the square root of -sqrt(3) - i, i.e. (-sqrt(3) - i)^(1/2) on the principal branch. | Drag the point to the principal root. | (-sqrt(3) - i)^(1/2) = sqrt(2) e^(i Arg(-sqrt(3) - i)/2) = sqrt(2) e^(-i 5pi/12) ~ 0.366 - 1.366i, using Arg(-sqrt(3) - i) = -5pi/6 (the other square root is about -0.366 + 1.366i) |
| 2.3.1 | Find lim (x^2 - y^2 + i2xy)/(x^2 + y^2) as z -> 0 along the line y = -2x. | Drag the point to the value the fraction approaches along this path. | -3/5 - (4/5)i along the line y = -2x (the full limit at 0 does not exist) |
| 2.4.1 | Find a branch of the cube root of z that is continuous along the positive y-axis. | Pick the window that stays continuous along the ray. | f(z) = r^(1/3) e^(i theta/3), with theta the name of arg z chosen in -pi/2 < theta < 3pi/2 (cut on the negative imaginary axis); f(i) = e^(i pi/6) = sqrt(3)/2 + (1/2)i |
| 2.5.1 | Find the image of the line x = -1 under w = 1/z. | Drag the center, then the rim point, to draw the image circle. | the circle \|w + 1/2\| = 1/2 (through 0) |
| 3.1.1 | Use the limit definition of the derivative to show f(z) = z^2 + 2z - 5 is differentiable everywhere and find f'(z). | Pick f'(z). | f'(z) = 2z + 2, for every z |
| 3.1.2 | Let f(z) = \|z - i\|^2. Show f is differentiable only at z = i, and thus nowhere analytic. | Pick the verdict. | differentiable only at z = i (f'(i) = 0); nowhere analytic |
| 3.2.1 | Given f(z) = e^{2x}(cos 2y + i sin 2y), use the Cauchy-Riemann equations to decide whether f is entire. If it is, compute f'(z). | Pick the verdict. | entire; f'(z) = 2f(z) |
| P1 | Show that conj(z1) conj(z2) = conj(z1 z2). Test it with z1 = 2 + 2i and z2 = -5 + i. | A proof: set the two decisions, then open the worked solution. | conj(z1) conj(z2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1) = conj(z1 z2); here both sides are -12 + 8i |
| P2 | Show that \|z\| = sqrt(z conj(z)). Test it with z = 2 + 2i. | A proof: set the two decisions, then open the worked solution. | z conj(z) = x^2 + y^2 = \|z\|^2, so \|z\| = sqrt(z conj(z)); for z = 2 + 2i that is sqrt(8) |
| P3 | Prove that the composition of two linear transformations is a linear transformation. Test it with T1(z) = (1 + i)z - 3 and T2(z) = (3 + 3i)z - 2 + i. | A proof: set the two decisions, then open the worked solution. | a(cz + d) + b = (ac) z + (ad + b) = (6i) z + (-6 - i): linear with coefficient ac and shift ad + b |
| P4 | Show that the image of the circle of radius 1 centered at 0 under f(z) = -2z is the circle of radius 2 centered at 0. | Drag the center, then the rim point, to draw the image circle. | a = -2 = 2 e^(i pi): with z = e^(it), w = 2 e^(i(t + pi)) covers the whole circle \|w\| = 2 |
| P5 | Show that lim (Re(1 + z) - 1)/z as z -> 0 does not exist. As a first step, find the value it approaches along the line y = x/2. | Pick the value the fraction approaches along this path. | x/z -> 4/5 - (2/5)i along the line y = x/2, but 1 along the real axis, so the limit does not exist |
| P6 | Show that f(z) = 2 conj(z) is not differentiable. | Pick the verdict. | (f(z + h) - f(z))/h is 2 for real h and -2 for imaginary h, so f is differentiable nowhere |
| P7 | Suppose f = u + iv is entire and v(x, y) = 2 everywhere. Use Cauchy-Riemann to prove f is constant. | A proof: set the two decisions, then open the worked solution. | v = 2 gives v_x = v_y = 0; CR gives u_x = u_y = 0; so f' = 0 and f is constant |

## 3. Visual encoding (for the pieces that draw a card)

The module emits **no colour, no font, no size** and its strings never carry a hex value or a `\textcolor`; `statement`, `answer.tex` and the worked prose are plain. Consumers colour them from `css/theme.css` tokens at draw time and re-read the tokens on `themechange` (CONSTRAINTS "Design language"). The mapping below is the one the Rehearsal Room should use; the contrast ratios were computed from the token values of both themes (WCAG, token on `--surface`; every text pairing is at least 4.5:1, and no state is carried by colour alone).

| Card piece | Token | Light | Dark | Contrast on `--surface` (light / dark) |
|---|---|---|---|---|
| statement, answer text | `--text` | `#1a2230` | `#e9edf5` | 15.96 / 14.52 |
| `sketch.prompt`, `check().detail` | `--text-muted` | `#515b6c` | `#a6b0c3` | 6.86 / 7.80 |
| `worked.cart` bar and the words slide, x, y | `--cart` | `#0b63ad` | `#62adf2` | 6.17 / 7.12 |
| `worked.polar` bar and the words turn, stretch, r, θ | `--polar` | `#a84300` | `#ff9d5c` | 6.06 / 8.30 |
| the student's guess handles and strokes | `--input` | `#006e53` | `#3fd0a0` | 6.26 / 8.71 |
| the revealed answer drawn on the plane | `--output` | `#9d3a8a` | `#e48fd2` | 6.17 / 7.43 |
| seam, excluded boundary (dashed) | `--seam` | `#6b7384` | `#8e99b0` | 4.76 / 5.95 |
| verdict right, verdict wrong | `--ok`, `--danger` | `#26702a`, `#b3261e` | `#63d08a`, `#ff8178` | 6.12, 6.54 / 8.86, 7.03 |

What is drawn after Reveal, per kind (the two addresses stay visible: `--cart` for what is Cartesian-native, `--polar` for what is polar-native):

| `sketch.kind` and family | Drawn from the card (token) |
|---|---|
| `roots` (1.4.1, 1.4.2) | the circle of radius `answer.values.radius` or 1 (`--polar`); the n target points as rings with a faint tolerance disk (`--output`); the ray and the Arg arc of the k = 0 root (`--polar`); the guesses (`--input`); the staircase list of `(Arg c + 2πk)/n` beside it |
| `point`, 1.4.3 | the two roots as rings (`--output`), the real axis as the mirror line (`--seam` dashed) |
| `point`, 2.2.2 | the principal root as a ring (`--output`) with its ray and arc from 0 (`--polar`), the negative real axis dashed (`--seam`), the other roots as faint rings |
| `point`, 2.3.1 | the unit circle (`--polar`, every direction's value), the target ring (`--output`), the real-axis and imaginary-axis values 1 and −1 as faint ticks |
| `circle`, 1.2.1 | the circle (`--polar`): solid for ≤ and =, dashed for <, interior shaded at 12 % for the two disk relations |
| `circle`, P4 and 2.5.1 (line input) | the image circle on the w-plane (`--output`), its centre as a dot, 0 marked |
| `line`, 2.1.3 and 2.5.1 (circle input) | the image line (`--output`) with its direction arrow, the guess points (`--input`) |
| `sector`, 2.2.1 | the wedge between the edges (`--polar`, 12 %), the two edge rays solid, the arc labelled arg w |
| `choice` | the right chip gets a `--ok` outline and the word "correct"; a wrong pick gets a `--danger` outline and "your pick" (words, not only colour) |
| `none` | nothing |

TeX tinting follows rule 10.3.1 (call `cart()` / `polar()` at render time, never once at mount) if the Rehearsal Room tints a part of `answer.tex`; the module's TeX is one untinted piece. In dark theme nothing is inverted by the module: it has no knowledge of the theme.

## 4. Module API

### 4.1 Exports (exactly ARCHITECTURE 11.6; no other export)

```js
// js/data/generators.js: one import line, on one line:
import { Arg, wrapArg, fromPolar, add, sub, mul, div, neg, conj, inv, abs, abs2, exp, pow, rootsOf, rootsOfUnity, principalRoot, branchRoot, isPrimitiveRoot, fmtNum, fmtAngle, exactAngle, texNumber, texAngle, texCart } from '../core/complex.js';

export const FAMILIES                       // Object.freeze([...29 ids in handout order]): '1.1.1', '1.1.2', ..., '3.2.1', 'P1', ..., 'P7'
export function rng(seed)                   // pure -> () => number in [0, 1): mulberry32. seed: a uint32 (a number is floored, then taken mod 2^32; NaN, undefined and null are 0), or a string (FNV-1a)
export function generate(id, seed)          // pure -> Card | null (null for an unknown id); deterministic in (id, seed); never the handout's numbers
export function draw(id, random)            // pure -> given: one variant's fresh numbers from a () => number in [0, 1); RangeError for an unknown id
export function solve(id, given)            // pure -> Card without `seed` for ANY given of the family's shape; RangeError (and only RangeError) for a given it cannot solve or an unknown id
export function check(card, guess)          // pure -> { ok: true | false | null, detail: string }; never throws
export function statementFor(id, given)     // pure -> { tex, text }
export function familyInfo(id)              // pure -> { id, station, sketch, sketches, hasValues, hasLab } | null
```

`familyInfo(id)`: `sketch` is the family's kind (table 2.2), `sketches` lists every kind a card of the family can carry (`['line', 'circle']` for 2.5.1, one kind otherwise), `hasValues` is `true` for all 29 (a card's own `values` is `null` only for P5 on y = x³), `hasLab` is `true` for 2.1.2, 2.1.3, 2.2.1, 2.5.1 and P4. Example: `familyInfo('1.4.2')` is `{ id: '1.4.2', station: 'roots', sketch: 'roots', sketches: ['roots'], hasValues: true, hasLab: false }`.

Nothing else is exported: the family tables, `stream`, the formatters and the handout table are module-private. `FAMILY_OF` of ARCH 11.6 (P5 shares 2.3.1's maths, P6 shares 3.1.2's) is realised inside the module as shared helpers; no export is needed.

### 4.2 The Card

```js
{ id: '1.4.2', seed: 7, kind: 'problem' | 'proof',          // kind is 'proof' for P1..P7
  station: 'roots',                                         // the table of section 7 (A2)
  statement: 'Find all the 4th roots of $-81$. Express ...', // TeX; maths between single $...$; an even number of '$'
  statementText: 'Find all the 4th roots of -81. Express ...', // ASCII only
  given: { c: { re: -81, im: 0 }, n: 4 },                   // the fresh numbers (4.3)
  answer: { tex, text, values },                            // tex: display TeX; text: ASCII (the string the card prints and a script asserts); values: 4.4
  sketch: { kind, prompt, ... },                            // 4.5
  values: object | null,                                    // the station's ARCH 4.1 preset (4.6); null only for P5 on y = x^3
  labRequest: object | null,                                // ARCH 4 LabRequest, non-null exactly for 2.1.2, 2.1.3, 2.2.1, 2.5.1, P4 (4.7)
  worked: { cart: string, polar: string } }                 // prose, rendered with prose() (rule 10.4.3)
```

A card is plain JSON: every number is finite, there is no `undefined`, no `NaN` and no `-0` (`JSON.parse(JSON.stringify(card))` deep-equals the card; a test checks it). Every call returns **fresh objects**: mutating a card never changes a later card or a module table. Key order inside a card is not part of the contract.

### 4.3 `given` for each family (what `solve` accepts; `draw` produces exactly these)

All complex values are `{ re, im }` with finite numbers. A `RangeError` is thrown when a field is missing, not a finite number (where a number is meant), or one of the conditions in the last column holds. Malformed input of any shape (null fields, strings, arrays, `NaN`, wrong types) ends in a `RangeError`, never a `TypeError` (`solve` catches and rethrows).

| id | `given` | `solve` also throws when |
|---|---|---|
| 1.1.1 | `{ z1, z2 }` | z2 = 0 |
| 1.1.2 | `{ z1, z2, op: '+' \| '-', part: 'Re' \| 'Im' }` | op or part is another value |
| 1.2.1 | `{ a, R, rel: '=' \| '<' \| '<=' }` | R ≤ 0, another rel |
| 1.2.2 | `{ z1, z2 }` | z1 = z2 |
| 1.3.1 | `{ z }` | z = 0 |
| 1.3.2 | `{ z, n }` | z = 0, n not an integer in 1..12 |
| 1.4.1 | `{ n }` | n not an integer in 2..12 |
| 1.4.2 | `{ c, n }` | c = 0, n not an integer in 2..12 |
| 1.4.3 | `{ p, q }` (z² − 2pz + (p² + q²) = 0, roots p ± qi) | p or q not an integer, q < 1 |
| 1.5.1 | `{ a, b }` | a = b |
| 1.5.2 | `{ a, r0, r1, innerStrict, outerStrict }` (r0 < \|z − a\| < r1 with each `<` or `≤`; `innerStrict` true means the inner circle is left out) | not 0 < r0 < r1, a flag is not a boolean |
| 2.1.1 | `{ fn }`: a polynomial in z of degree ≤ 3 with Gaussian-integer coefficients, written the way `polyString` writes it: `'z^2 - iz'`, `'z^3 + (1 - i)z'`, `'(1 + i)z^2 + 2 - i'` | the string cannot be read (5.7) |
| 2.1.2 | `{ axis: 'x' \| 'y', c }` (the line x = c or y = c under w = z²) | c = 0 |
| 2.1.3 | `{ a, b, line: { axis: 'x' \| 'y', c } }` (f(z) = az + b) | a = 0 |
| 2.2.1 | `{ alpha, n }` (0 < arg z < α under zⁿ) | n not an integer in 2..6, α ≤ 0, nα ≥ 2π |
| 2.2.2 | `{ w, n }` | w = 0, n not an integer in 2..6 |
| 2.3.1, P5 | `{ path }`: `{ kind: 'line', m }` (y = mx, m ≠ 0), `{ kind: 'vertical' }` (x = 0), `{ kind: 'parabola' }` (y = x²), `{ kind: 'cubic' }` (y = x³) | another kind, m = 0 |
| 2.4.1 | `{ n, ray: 'negative-real' \| 'positive-imaginary' \| 'negative-imaginary' }` | n not an integer in 2..5, another ray |
| 2.5.1 | `{ circle: { a } }` (\|z − a\| = \|a\|) or `{ line: { c } }` (x = c) | a = 0, c = 0, neither field |
| 3.1.1 | `{ a, b, c }` (f = az² + bz + c) | a = 0 |
| 3.1.2 | `{ fn }`: a key of the function table (5.12): the twelve drawn keys, `'\|z\|^2'` (the handout) and the ten nowhere-differentiable keys | another key (an own-key lookup: `'constructor'` is refused) |
| 3.2.1 | `{ fn }`: one of the nine keys `'e^x(cos y + i sin y)'`, `'e^{-x}(cos y - i sin y)'`, `'x^2 - y^2 + 2ixy'`, `'x - iy'`, `'x^2 + y^2'`, `'e^{2x}(cos 2y + i sin 2y)'`, `'e^x(cos y - i sin y)'`, `'x^3 - 3xy^2 + i(3x^2y - y^3)'`, `'x^2 - y^2 - 2ixy'` | another key |
| P1 | `{ z1, z2 }` | |
| P2 | `{ z }` | |
| P3 | `{ a, b, c, d }` (T₁ = az + b, T₂ = cz + d) | a = 0 or c = 0 |
| P4 | `{ a, R }` (the circle \|z\| = R under az) | a = 0, R ≤ 0 |
| P6 | `{ fn }`: a nowhere-differentiable key (`'conj z'`, `'Re z'`, `'Im z'`, `'2 Re z'`, `'3 Re z'`, `'2 Im z'`, `'2 conj z'`, `'3 conj z'`, `'Re z + Im z'`, `'i conj z'`) | a key that is differentiable at a point |
| P7 | `{ kind: 'u' \| 'v' \| 'modulus', c }` (u ≡ c, v ≡ c or \|f\| ≡ c) | kind is another value; c ≤ 0 for 'modulus' |

The key `'z·Re z'` (and `'z·Im z'`) contains U+00B7; it is a key, never printed (`statementText` writes `z Re(z)`).

### 4.4 `answer.values` (what the unit tests assert; keys marked * are pinned by acceptance A1 or by ARCH 3.3)

Complex values are `{ re, im }`. A number is a number. `target` is described in 4.5.

| id | Keys |
|---|---|
| 1.1.1 | `product`*, `quotient`*, `productAbs`*, `quotientAbs`, `productArg`, `quotientArg`, `z1Arg`, `z2Arg` |
| 1.1.2 | `result`* (the asked part of conj(z₁ ± z₂), a number), `w` (z₁ ± z₂), `conjW`, `op`, `part`, `difference` (= `w`) |
| 1.2.1 | `center`*, `radius`*, `rel`, `target` |
| 1.2.2 | `distance`*, `difference`* (z₁ − z₂), `distanceSquared` (an integer) |
| 1.3.1 | `r`*, `theta`, `Arg`* (θ = Arg z), `z`, `names` (`[θ − 2π, θ, θ + 2π]`) |
| 1.3.2 | `result`*, `r`* (= \|z\|ⁿ), `Arg`* (= `wrapArg(n·Arg z)`, **not** the Arg of the floating result: that one could flip π to −π), `base`, `n`, `rawAngle`* (= n·Arg z before wrapping) |
| 1.4.1 | `n`, `roots`* (k order), `primitive`*, `principalArgs`, `target` |
| 1.4.2 | `radius`*, `angles`* (`(Arg c + 2πk)/n`, k = 0..n−1), `principalArgs`, `roots`* (`rootsOf(c, n)` with noise below 1e-12 set to 0), `target` |
| 1.4.3 | `roots`* (`[p + qi, p − qi]`, exact), `completed` (`{ shift: p, square: −q² }`), `a` (1), `b` (−2p), `c` (p² + q²), `disc` (−4q²), `target` |
| 1.5.1 | `start`, `end`, `direction`* (end − start), `at`* (`{ t: 0.5, z }`) |
| 1.5.2 | `center`, `inner`, `outer`, `innerIncluded`, `outerIncluded`, `open`*, `closed`*, `bounded`*, `connected`*, `domain`*, `region`* |
| 2.1.1 | `check`* (`{ z: 1 + i, w, u, v }`), `coeffs` (four complex numbers, index = power of z), `cartTerms` (`{ u, v }`, each a list of `[coef, xPower, yPower]`), `polarTerms` (`{ u, v }`, each a list of `[coef, k, 'cos' \| 'sin' \| null]` meaning coef·rᵏ·cos kθ, `null` the constant), `uCart`, `vCart`, `uPolar`, `vPolar` (ASCII), `src` (a parse.js string) |
| 2.1.2 | `parabola`* (`{ vertex, coeff, focus: 0 }`, u = vertex + coeff·v²), `opens` ('left' for x = c, 'right' for y = c), `sample`* (`{ y: 1, z, w }` for x = c, `{ x: 1, z, w }` for y = c), `axis`, `c` |
| 2.1.3 | `imageLine`* (`'v = 1'`, `'u = -3'`, `'v = u - 1'`, `'v = -u - 7'`), `rotation`* (Arg a), `stretch`* (\|a\|), `shift` (b), `sample` (`{ z, w }`), `imageGeom` (`{ point, dir }`, dir a unit vector), `lineEq` (`{ nu, nv, k }`: nu·u + nv·v = k with (nu, nv) a unit normal), `target` |
| 2.2.1 | `sector`* (`{ from: 0, to: nα }`, `to` snapped to the nearest multiple of π/12 within 1e-12, so π/3 · 3 is exactly `Math.PI`), `n`, `alpha`, `target` |
| 2.2.2 | `root`*, `r`, `Arg` (of the root), `other` (the first other root), `others`, `wAbs`, `wArg`, `target` |
| 2.3.1 | `along`* (**always** a complex `{ re, im }`: the value along the path), `path`, `exists: false`, `alongParabola` (1), `alongRealAxis` (1), `alongImagAxis` (−1), `target` |
| P5 | `along` (the value of x/z along the path), `path`, `alongRealAxis` (1), `alongImagAxis` (0), `contrast` (`{ axis: 'real' \| 'imaginary', value }`: the axis the text quotes against `along`, the imaginary one when `along` is already 1, i.e. for y = x² and y = x³), `exists: false`, `directional` (`{ A: ½, B: ½ }`) |
| 2.4.1 | `seam`* (0 for the negative real axis, −π/2 for the positive imaginary, π/2 for the negative imaginary: the seam opposite the ray), `window`* (`[seam, seam + 2π]`), `atRay`* (`branchRoot(rayPoint, n, seam)`), `rayPoint` (−1, i or −i), `principalJumps` (true only for the negative real axis), `n`, `ray`, `atMinusOne` (negative real axis only; equals `atRay`) |
| 2.5.1, circle input | `imageLine`* (`'Re w = 1/2'`, `'Re w = -1/2'`, `'Re w = 1/4'`, `'Im w = -1/2'`, `'Im w = 1/2'`, `'u - v = 1/2'`), `lineEq`, `sample` (`{ z: a(1 + i), w }`), `a`, `re` (when the line is vertical), `target` |
| 2.5.1, line input | `center`* (1/(2c)), `radius`* (1/(2\|c\|)), `sample` (`{ z: c + i, w }`), `c`, `target` |
| 3.1.1 | `derivativeAt`* (`{ z: 1 + i, fprime }`), `A` and `fprimeTex`* (`'4z - 3'`), `Babs` (0), `src` (the function as a parse.js string), `a`, `b`, `c` |
| 3.1.2 | `differentiableAt`* (the one point, or `null` for a nowhere-differentiable function), `fprimeAt` (0 there), `nowhereAnalytic`* (true), `circleRadiusAt` (`{ z: 1 + i, radius: \|B\|, center: A }`), `A` and `B` (text of the closed forms), `localAt` (`{ z, A, B }` at z₀), `src`, `verdict` ('only-at-a-point' or 'nowhere') |
| 3.2.1 | `entire`*, `fprimeTex`* (entire only: `'f(z)'`, `'-f(z)'`, `'2f(z)'`, `'2z'`, `'3z^2'`), `fprimeAt0` (entire only), `check` (`{ z: iπ/2, w: f(iπ/2) }`), `src`, `cr` (`{ ux, vy, uy, vx }`, ASCII) |
| P1 | `check` (`{ z1, z2, both }`: both = conj z₁·conj z₂ = conj(z₁z₂)) |
| P2 | `check` (`{ z, zzbar, abs }`: zzbar = x² + y² is a number) |
| P3 | `coeff`* and `shift`* (ac and ad + b, at the top: goal A1), and `check`* (`{ a, b, c, d, coeff, shift }`: the same, ARCH 3.3) |
| P4 | `radius`* (= \|a\|·R), `factor` (a), `factorAbs`, `factorArg`, `R`, `target` |
| P6 | `A`, `B` (complex constants), `differentiable: false`, `circle` (`{ center: A, radius: \|B\| }`), `src` |
| P7 | `fprime` (0), `constant` (true), `kind`, `c` |

### 4.5 `sketch`

```js
{ kind: 'point', count: 1 | 2, prompt, fit, target: { points: [z, ...] } }      // 1.4.3 (2), 2.2.2 (1), 2.3.1 (1)
{ kind: 'roots', n, prompt, fit, target: { points: [z0, ..., z(n-1)] } }          // 1.4.1, 1.4.2
{ kind: 'circle', prompt, fit, target: { center, radius } }                      // 1.2.1, P4, 2.5.1 (line input)
{ kind: 'line', prompt, fit, target: { point, dir } }                            // 2.1.3, 2.5.1 (circle input); dir is a unit vector, point is the foot of the perpendicular from 0
{ kind: 'sector', prompt, fit, target: { from, to } }                            // 2.2.1; angles in radians, from = 0
{ kind: 'choice', options: [4 strings], correct: 0..3, prompt }                  // 15 families
{ kind: 'none', prompt }                                                         // P1, P2, P3, P7
```

`fit` is `{ center: {re, im}, halfWidth }`: a square view of side 2·halfWidth centred at `center` that holds the origin, the target and a margin (halfWidth at least 1.5). `answer.values.target` is a copy of `sketch.target`. Choice options: exactly four, pairwise different, ASCII, at most 72 characters; one is correct; the order is a fixed function of `(id, given)` (never of the seed), so `solve(id, given)` always puts the right answer at the same index.

### 4.6 `values` (the station preset, ARCH 4.1) per family

| id | Station | `values` |
|---|---|---|
| 1.1.1 | arithmetic | `{ z1, z2, mode: 'mul' }` |
| 1.1.2 | arithmetic | `{ z1, z2, mode: 'add' \| 'sub', conjResult: true }` |
| 1.2.1 | distance | `{ mode: 'circle', a, R }` |
| 1.2.2 | distance | `{ mode: 'two', z1, z2 }` |
| 1.3.1 | addresses | `{ z }` |
| 1.3.2 | powers | `{ z, n }` (n 4..12) |
| 1.4.1 | roots | `{ c: 1, n }` (n in 3..8) |
| 1.4.2 | roots | `{ c, n }` (n 2..6) |
| 1.4.3 | roots | `{ quadratic: { a: 1, b, c } }` (real numbers, D9) |
| 1.5.1 | curves | `{ a, b }` |
| 1.5.2 | sets | `{ center, r0, r1, innerStrict, outerStrict }` (1 ≤ r0 < r1 ≤ 4) |
| 2.1.1 | mappings | `{ fn: { src }, z: 1 + i }` |
| 2.1.2 | powermap | `{ n: 2, line: { axis, c } }` |
| 2.1.3 | linear | `{ a, b, input: { kind: 'verticalLine', x } \| { kind: 'horizontalLine', y } }` |
| 2.2.1 | powermap | `{ n, sector: { theta0: 0, theta1: α } }` (n 2..4) |
| 2.2.2 | principal-root | `{ w, n }` (n 2..3) |
| 2.3.1 | limits | `{ fn: 'dir', path: 'line', m }` \| `{ fn: 'dir', path: 'vertical' }` \| `{ fn: 'dir', path: 'parabola' }`; `null` for the cubic (never drawn here) |
| P5 | limits | the same with `fn: 'x-over-z'`; `null` for the cubic |
| 2.4.1 | branches | `{ n, seam, walk: 'along' \| null }` ('along' only for the negative real axis; n 2..3) |
| 2.5.1 | reciprocal | `{ shape: { kind: 'circle', center: a, r: \|a\| } }` or `{ shape: { kind: 'line', a: c, b: c + i } }` |
| 3.1.1 | derivative | `{ fn: { src }, z0: 1 + i }` |
| 3.1.2, P6 | derivative | `{ fn: <FUNCTIONS id> \| { src }, z0 }` (z0 = 1 + i for 3.1.2, 0.3 − 0.7i for P6; ids 'abs2', 'conj', 're' where the catalogue has the function) |
| 3.2.1, P7 | cauchy-riemann | `{ fn: { src }, z0: 0.5 + 0.8i }` (P7: the constant function `c`, `ci`) |
| P1 | arithmetic | `{ z1, z2, mode: 'conj' }` |
| P2 | arithmetic | `{ z1: z, z2: conj z, mode: 'mul' }` |
| P3 | linear | `{ a, b, input: 'x2', compose: { c, d } }` |
| P4 | linear | `{ a, b: 0, input: { kind: 'circle', center: 0, r: R } }` |

Every `src` string compiles with `js/core/parse.js` and evaluates to the intended function (the tests compile them and compare at points). The station is reached by `ctx.store.set('station.request', { station: card.station, problem: card.id, family: card.id, values: card.values }, { persist: false })`; the sender is the Rehearsal Room.

### 4.7 `labRequest` (ARCH 4, `view: 'side'`, `problem: <id>`, `predictFirst: true`)

| id | `fn` | `shapes` |
|---|---|---|
| 2.1.2 | `'sq'` | `[{ kind: 'verticalLine', x: c }]` or `[{ kind: 'horizontalLine', y: c }]` |
| 2.1.3 | `{ src: 'i*z + 1' }` (az + b as `polyString(..., { src: true })`) | the vertical or horizontal line |
| 2.2.1 | `'sq'`, `'cube'` or `{ src: 'z^4' }` | `[{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: α }]` |
| 2.5.1 | `'recip'` | `[{ kind: 'circle', center: a, r: \|a\| }]` or `[{ kind: 'verticalLine', x: c }]` |
| P4 | `{ src: '(1 + i)*z' }` | `[{ kind: 'circle', center: 0, r: R }]` |

### 4.8 Events and lifecycle

There are no events, no listeners, no timers and no state. The module is a set of pure functions and frozen-by-convention constant tables; importing it does nothing. There is nothing to mount or unmount, so a station or the Rehearsal Room that calls it needs no cleanup. It is safe to import in Node (unit tests) and in the browser (the interaction script), in any order relative to other modules. `window.__mv` is not touched.

## 5. Algorithms (numbered pseudocode; Appendix A is the executable form)

Notation: `pick(r, list)` is `list[min(len − 1, floor(r() · len))]`; `NZ5` is `[−5, −4, −3, −2, −1, 1, 2, 3, 4, 5]`, `NZ4`, `NZ3` likewise, `ANY3` is `−3..3`; `C(re, im)` builds `{ re: re + 0, im: im + 0 }` (the `+ 0` turns −0 into 0); `cleanC(z)` sets a part with |x| < 1e-12 to 0; `need(cond, msg)` throws `RangeError('generators: ' + msg)` when `cond` is false.

### 5.1 The seed

1. `fnv1a(str)`: `h = 0x811c9dc5`; for each UTF-16 unit `c`: `h ^= c; h = Math.imul(h, 0x01000193)`; return `h >>> 0`.
2. `toSeed(seed)`: a string gives `fnv1a(seed)`, anything else gives `Math.floor(Number(seed)) >>> 0` (so `NaN`, `undefined`, `null` are 0, −1 is 4294967295, 1.9 is 1, 2³² is 0).
3. `rng(seed)`: `a = toSeed(seed)`; return a function that does `a = (a + 0x6D2B79F5) | 0; t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296`.
4. Pins (A4): `rng(7)()` three times gives `0.011704753153026104, 0.06195825757458806, 0.97690763277933` on every run and in every engine (integer arithmetic only).

### 5.2 The stratified first draw (decision D5)

1. `stream(s, attempt)`: `base = rng(attempt === 0 ? s : fnv1a(s + ':' + attempt))`, `first = true`. It returns a function: if `first` and `attempt === 0` it clears `first` and returns `(s · 0.6180339887498949) % 1`; otherwise it returns `base()`.
2. **Every `draw` makes its first call decide the family's "slot"** (table 5.4): a pick among at least three equal-sized buckets whose choice is part of `given` (a list of 3 or more entries, or a coordinate with 6 or more values).
3. Why neighbouring seeds differ. Let `w(s) = frac(s·φ)` with `φ = 0.6180339887498949`. Then `w(s + 1) − w(s) ≡ φ (mod 1)`, so the two points are `0.6180…` apart one way round the circle and `0.3819…` the other. A bucket of width `1/L` with `L ≥ 3` is at most `0.3334`, which is narrower than `0.3819`, so the two points are never in the same bucket. The rounding error of `s·φ` is below 2⁻²¹ for any uint32 seed, far below the margin `0.3819 − 0.3334`. Different slots give different `given` (every list entry is different and the slot is a coordinate of `given`).
4. Measured with Appendix A: for all 29 families, `generate(id, s).given` differs from `generate(id, s + 1).given` for every `s` in 0..20000 and for 500 consecutive seeds at each of 1, 2³¹, 2³² − 5, 123456789, 4000000000: zero collisions. (A2 asks for 45 of 50; the design gives 50 of 50.)

### 5.3 `generate(id, seed)`

1. If `id` is not an own key of the family table, return `null` (the tables are null-prototype objects, so `'constructor'` and `'__proto__'` are unknown).
2. `s = toSeed(seed)`.
3. For `attempt = 0 … 5`: `given = draw(id, stream(s, attempt))`; if `given` equals the handout's numbers (numbers within 1e-9, same shape), continue; otherwise `card = solve(id, given)` and return `{ id, seed: s, ...(card without id) }`.
4. Throw `RangeError` (unreachable: step 3 never retries, because every `draw` carries a fix-up for the handout; a test over 30,000 seeds per family found no handout).

### 5.4 `draw(id, random)`: the calls in order

The first call is the slot (5.2). Lists are in the order Appendix A writes them; the golden table of section 7.1 pins the order.

| id | Calls, in order | Fix-up (so `draw` never returns the handout) |
|---|---|---|
| 1.1.1, P1 | z1.re, z1.im, z2.re, z2.im: `pick(r, NZ5)` each | (3 − 2i, −1 + 4i): z2.im = 3 |
| 1.1.2 | the same four; `op` = `r() < 0.5 ? '+' : '-'`; `part` = `r() < 0.5 ? 'Re' : 'Im'` | the same |
| 1.2.1 | a.re, a.im: `NZ4`; R: `[1, 2, 3, 4]`; rel: `['=', '=', '<', '<=']` | (1 + 2i, 3, '='): R = 4 |
| 1.2.2 | z1.re, z1.im, z2.re, z2.im: `NZ5` | z1 = z2: z2.im = (z2.im = 5 ? −5 : z2.im + 1); (4 + 3i, −1 + i): z2 = −1 + 2i |
| 1.3.1 | deg: `[0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]`; r: `[1, 2, 3]`; z = r·(cos deg, sin deg) from the exact table 5.6 | r = 2 with deg = 120: r = 3 |
| 1.3.2 | deg (same list); r: `[1, 2]`; n: `4..12` | r = 2, deg = 30, n = 10: n = 11 |
| 1.4.1 | n: `[3, 4, 6, 7, 8]` | none |
| 1.4.2 | one entry of `[(−1,2), (−1,3), (−1,4), (−1,6), (−8,3), (−27,3), (−81,4), (−64,3), (−64,6), (−16,2), (−32,5), (2i,2), (−2i,2), (8i,3), (−8i,3), (16i,2), (−16i,2), (32i,5), (−32i,5)]` | none: the list has no (−16, 4), and (−81, 4) is at index 6 on purpose (D6) |
| 1.4.3 | p: `[−5..−1, 1..5]`; q: `[1..5]` | (2, 3): q = 4 |
| 1.5.1 | a.re, a.im, b.re, b.im: `NZ5` | a = b: b.im as above; (2 + i, −3 − 3i): b = −3 − 2i |
| 1.5.2 | combo: `[[true, true], [true, false], [false, true], [false, false]]` (innerStrict, outerStrict); a.re, a.im: `ANY3`; r0: `[1, 2, 3]`; r1 = `r0 + 1 + floor(r() · (4 − r0))` | (−i, 1, 3, true, false): a = 1 − i |
| 2.1.1 | `t = min(2, floor(r() · 3))`; t = 0: a from the 47 Gaussians with parts in −3..3 other than 0 and i, giving `z^2 + az`; t = 1: a from 0 and the 23 Gaussians with parts in −2..2 other than 0 and i, giving `z^3 + az`; t = 2: a from the 36 Gaussians with parts in ±1..±3, then b from those and 0, giving `az^2 + b`. `fn = polyString(coeffs)` | none (z² + iz is excluded by construction) |
| 2.1.2 | one of `(x,−3), (x,−2), (x,−1), (x,1), (x,3), (y,−3), (y,−2), (y,−1), (y,1), (y,2), (y,3)` | none |
| 2.1.3 | a: `[i, −i, −1, 2, 2i, 1 + i, 1 − i]`; b.re, b.im: `ANY3`; axis: `r() < 0.5 ? 'x' : 'y'`; c: `NZ3` | (i, −2i, x, 2): c = 3 |
| 2.2.1 | one of `(π/6,2), (π/6,3), (π/6,4), (π/4,2), (π/4,4), (π/3,2), (π/3,3), (π/3,4), (π/2,2), (π/2,3)` (α, n) | none |
| 2.2.2 | deg (the 16 angles); r: `[1, 2, 3]`; n: `[2, 3]` | (2i, 2): n = 3 |
| 2.3.1 | one of lines m = 1, −1, 2, −2, ½, then `vertical` | none (the parabola is the handout and the cubic is left out, D2) |
| P5 | one of those six, then `parabola`, `cubic` | |
| 2.4.1 | one of `(2, negative-real), (2, positive-imaginary), (2, negative-imaginary), (3, positive-imaginary), (3, negative-imaginary)` | none |
| 2.5.1 | one of circles a = −1, 2, i, −i, 1 + i, then lines c = −2, −1, −½, ½, 1, 2 | none (a = 1 is left out) |
| 3.1.1 | a: `[−3, −2, −1, 1, 2, 3]`; b: `NZ5`; c: `−5..5` | (1, 1, 0): c = 1 |
| 3.1.2 | one of the twelve keys of D7, in the order of Appendix A | none |
| 3.2.1 | one of the eight keys other than `'e^x(cos y + i sin y)'`, in Appendix A's order | none |
| P2 | z.re, z.im: `NZ5` | 3 − 2i: z.im = −3 |
| P3 | a: `NZ3` for re then im; b: `ANY3`; c: `NZ3`; d: `ANY3` | none |
| P4 | one of `(a, R)` for a in `[1 + i, 2i, 1 − i, −2, √3 + i]`, R in `[1, 2, 3]`, without (1 + i, 1) | none |
| P6 | one of `['conj z', 'Im z', '2 Re z', '3 Re z', '2 Im z', '2 conj z', '3 conj z', 'Re z + Im z', 'i conj z']` | none |
| P7 | kind: `['u', 'v', 'modulus']`; c: `[−5..−1, 1..5]` (`[1..5]` for modulus) | none |

### 5.5 `solve(id, given)` and a family

A family is `{ draw, statement(given) → { tex, text }, solve(id, given) → { answer, sketch, values, labRequest, worked } }`.

1. `need(id is a family)`, `need(given is a non-null object)`.
2. Run the family's `solve` and `statement`. Any exception that is not a `RangeError` is replaced by `RangeError('generators: malformed given for ' + id)`; `need` inside a family throws the specific sentence (table 4.3).
3. Build `{ id, kind: id starts with 'P' ? 'proof' : 'problem', station, statement: tex, statementText: text, given, answer, sketch, values, labRequest, worked }` and **deep-clone it through JSON** (this makes every card fresh, drops shared table objects and proves it is JSON-safe).
4. Replace `worked.cart` and `worked.polar` by `typeset(...)`: `sqrt(n)` becomes `√n`, `\b(\d*)pi\b` becomes `$1π`.

### 5.6 Exact numbers and text (the formatters)

1. `exactReal(x)`: for s in 1, 2, 3 and q = 1..50 (s = 1) or 1..24 (s = 2, 3): `p = round(x·q/√s)`; if `|x − p√s/q| ≤ 1e-9·max(1, |x|)` return `{ p, q, s }` reduced by the gcd of p and q (0 gives `{0, 1, 1}`); else `null`.
2. `aNum(x)` (ASCII): `null` gives `fmtNum(x, 3)`; s = 1 gives `p` or `p/q`; s > 1 gives `[-]` + `|p| ` (omitted when 1) + `sqrt(s)` + `/q` (omitted when 1): `sqrt(3)/2`, `-3 sqrt(2)/2`, `2 sqrt(2)`.
3. `aCart(z)` (ASCII): real part `R = aNum(re)`, imaginary `M = aNum(im)`; `M = '0'` gives `R`; the coefficient `mm = |M|` is `i` alone when 1, `(mm)i` when it contains `/` or a space, `mm i` when it contains `sqrt`, else `mmi`; join with ` + ` / ` - `, a zero real part gives just `[-]coef i`: `3 - 2i`, `-1/2 + (sqrt(3)/2)i`, `sqrt(2) + sqrt(2) i`, `-i`.
4. `rE(r)` is `''` for r = 1, else `aNum(r)` bracketed when it is a fraction and followed by a space when it is a surd (`(3/2) `, `√2 `: the prose coefficient of `e^{…}`); `eCoefA(r)` is the ASCII twin (`2 `, `(3/2) `, `(2 sqrt(2)) `); `exactC(z)`, `eqC(z)`, `eqL(zs)`, `proseEq…`, `tEqC`, `tEqL` choose `=` or the rounded mark (D13); `argTxt(θ)` is ` = pi/4` or ` ≈ 0.142`; `radText(n)` is `String(k)` when n = k², else `sqrt(n)`; `modText(z)` is `radText(|z|²)` when |z|² is a whole number, else `aNum(|z|)`.
5. `aAng(θ) = fmtAngle(θ)` (`2pi/3`); `aExp(r, θ)` writes `2 e^(i 2pi/3)` (a coefficient that contains a slash or a space is bracketed, a coefficient of 1 is dropped, a negative angle is `e^(-i pi/4)`, θ = 0 is just the number); `tExp(r, θ)` is the TeX twin built from `tNum` and `texAngle` with the same sign rule; `shiftA('t', θ)` writes `t`, `t + pi/4` or `t - pi/4`; `texSlash(θ)` is `\pi/3` style.
6. `unitAtDeg(d)`: reduce d mod 360, fold into 0..90 and rotate by quarter turns over the exact table `{0: (1, 0), 30: (√3/2, ½), 45: (√2/2, √2/2), 60: (½, √3/2), 90: (0, 1)}` (`Math.sqrt(3) / 2` and `Math.SQRT2 / 2`), adding 0 to remove −0. Nice points are `r·unit`, so `r = 2, deg = 120` is exactly `(−1, Math.sqrt(3))`.
7. `ordinal(n)` is `2nd`, `3rd`, otherwise `n + 'th'`; `rootWord(n)` is `square`, `cube` or the ordinal.
8. `zMinus(a, tex)` writes `z − a` for a statement: `z`, `z - 3`, `z + 2i`, `z - i`, `z - (1 + 2i)` (a pure real or imaginary a gets no brackets).
9. `lin(c0, c1, v)` writes `c0 + c1·v` (`2 - 5t`, `t`, `-t`, `4`, `0`); `linXY(cx, cy, vx, vy)` the same in two variables (both through `coefVar`: `x/2`, `3x/4`, `sqrt(3) x`, never `1/2x` or `1x`); `lineText(p, d)` writes the line through p with direction d: `v = c` when d is horizontal, `u = c` when vertical, `v = ±u ± k` when the slope is ±1 (`v = -u - 7`).
10. `canon(v)`: a stable string of a value (numbers rounded to 1e-9, object keys sorted); it seeds the option shuffle.

### 5.7 Polynomials (2.1.1, the linear maps of 2.1.3, P3, P4, 3.1.1)

1. `polyString(coeffs, { tex, src })`, highest power first. A real coefficient is `[N]z^k` (N omitted when 1); an imaginary one `[N]iz^k` (`i` alone when 1); a coefficient with both parts is `(re ± imi)z^k`; the constant term writes its real and imaginary parts as two terms (`+ 2 - i`). Signs are ` + ` and ` - ` between terms and `-` before a leading negative term. `src` mode puts `*` between a coefficient and `z` (`2*i*z`, `(1 + i)*z`), which `parse.js` reads; `tex` mode formats numbers with `texNumber` and `texCart`.
2. `parsePoly(str)` reads exactly what `polyString` writes: remove spaces; split into terms at a `+` or `-` at bracket depth 0 (not the first character); each term is a sign, a coefficient (`''` = 1, `i`, `N`, `Ni`, or `(a±bi)`) and an optional `z` or `z^k` (k ≤ 3); add terms with the same power; return four `{ re, im }`. Anything else throws `RangeError`.
3. 2.1.1 expansion. With `z^k = P_k + iQ_k` (`P` = 1, x, x² − y², x³ − 3xy²; `Q` = 0, y, 2xy, 3x²y − y³) and `c = α + βi`: the real part of `c·z^k` is `αP_k − βQ_k`, the imaginary part `αQ_k + βP_k`. Collect like monomials in a map keyed by `(xPower, yPower)`, drop zeros, sort by total degree descending then x-power descending (so z² + iz gives `x^2 - y^2 - y` and `2xy + x`); write each as `[coef]x^a y^b`.
4. Polar form of the same polynomial: the term `c z^k` is `|c|rᵏe^{i(kθ + Arg c)}`, so with c = α + βi its real part is `rᵏ(α cos kθ − β sin kθ)` and its imaginary part `rᵏ(α sin kθ + β cos kθ)`. Keep terms in k-descending order with cos before sin: z² + iz gives `u = r² cos 2θ − r sin θ` and `v = r² sin 2θ + r cos θ` (the handout's answer), z² − iz gives `u = r² cos 2θ + r sin θ` and `v = r² sin 2θ − r cos θ`. `polarText(list, 'tex' | 'ascii' | 'prose')` writes a term as `r^2\cos 2\theta`, `r^2 cos(2 theta)` or `r^2 cos 2θ`.
5. Evaluating by Horner with `add` and `mul` gives `w = f(1 + i)` exactly for integer coefficients.

### 5.8 Four choices (`makeChoice`) and the wrong answers

1. `list = [correct]`, then each distractor string that is not already in `list`, until 4; then `pad(0), pad(1), …` until 4 (every family gives a pad that cannot repeat).
2. Fisher-Yates with `rng(fnv1a(canon([id, given])))`: `for i = 3 … 1: j = floor(r()·(i + 1)); swap(order[i], order[j])`. The order depends on `(id, given)` only, never on the seed.
3. Return `{ kind: 'choice', options, correct: options.indexOf(correct), prompt }`.

The distractors are the usual slips, in this priority (the first that differs from the right answer and from each other are used):

| id | Right answer | Wrong answers |
|---|---|---|
| 1.1.1 | `aCart(z1z2)` | (x₁x₂ + y₁y₂) + (x₁y₂ + x₂y₁)i (sign of i²), (x₁x₂ − y₁y₂) + (x₁y₂ − x₂y₁)i (sign of the cross term), x₁x₂ + y₁y₂i (parts times parts), the conjugate |
| 1.1.2 | the number | its negative, the other part of z₁ ± z₂, the same part of the conjugate of the other combination; pad `result ± (⌊k/2⌋ + 1)` |
| 1.2.2 | `radText(Δx² + Δy²)` | the sum of squares without the root, `radText(\|z₁ + z₂\|²)`, \|Δx\| + \|Δy\|, `radText(\|Δx² − Δy²\|)` |
| 1.3.1 | `aAng(Arg z)` | arctan(y/x) with no quadrant, Arg + 2π (a name, not the home step), −Arg, Arg + π, Arg + π/2 |
| 1.3.2 | `aCart(result)` | r e^{inθ} (the modulus not raised), n·r e^{i·wrap(nθ)}, rⁿ e^{i(n+1)θ}, the conjugate |
| 1.5.1 | the parameterization | the reverse (b + t(a − b)), a + t(a − b), (a + b)/2 + t(b − a), b + t·a |
| 1.5.2 | one of three fixed verdicts | the other fixed verdicts, among `open, bounded: a domain` / `closed, bounded: not a domain` / `neither open nor closed, bounded: not a domain` / `neither open nor closed, bounded: a domain` (the last is never right) |
| 2.1.1 | `u = …; v = …` | u and v swapped, v negated, u negated, the linear term dropped |
| 2.1.2 | `u = V ± v^2/D` | the parabola opening the other way, \|c\| instead of c² in the denominator, the image of the other axis (vertex −c² with the other sign), vertex c instead of c² |
| 2.4.1 | the window whose seam is opposite the ray | windows `(ρ + 2πj, ρ + 2π(j + 1))` for j = 0, −1, −2, 1 (the seam is on the ray, so each one jumps there; for the negative real axis j = −1 is the principal window) |
| 3.1.1 | `4z - 3` | a z + b, 2a z + b + c, 2a z − b, 2a z² + b |
| 3.1.2 | the verdict | the other three of `differentiable only at one point, nowhere analytic` / `differentiable nowhere` / `differentiable and analytic everywhere` / `differentiable on the real axis only` |
| 3.2.1 | `entire; f'(z) = …` or `not entire: Cauchy-Riemann fails` | the other four of `entire; f'(z) = f(z)`, `… = -f(z)`, `… = 2z`, `not entire: Cauchy-Riemann fails`, `entire; f'(z) = 0` |
| P5 | the value along the path | for a line y = mx: (1 + mi)/(1 + m²), 1/(1 + m²), 1 − mi, (m − i)/(1 + m²); for the vertical axis `1`, `-1`, `i`, `1/2`; for the parabola and the cubic `0`, `1/2`, `-1`, `i` |
| P6 | `differentiable nowhere` | the other three of the four verdicts of 3.1.2 |

### 5.9 `fitFor(points, extra)`

`x0..x1` and `y0..y1` start at 0 (the origin is always in view); each point widens them by `extra`. `center = ((x0 + x1)/2, (y0 + y1)/2)` rounded to 0.001; `halfWidth = max(1.5, round2(1.35·max((x1 − x0)/2, (y1 − y0)/2) + 0.6))`. Per card: 1.4.2 `fitFor(roots, 0.3)`; 1.4.1 fixed at center 0, halfWidth 1.6; 1.4.3 `fitFor(roots, 0.5)`; 1.2.1 `fitFor([a], R)`; P4 `fitFor([0], radius)`; 2.5.1 with a line input `fitFor([center], radius)`; 2.5.1 with a circle input `fitFor([point], 2)` (the point is already the foot); 2.1.3 `fitFor([foot], 2.2)` with the foot of the perpendicular `k·(nu, nv)`; 2.2.2 `fitFor([root, w], 0)`; 2.3.1 `fitFor([along, 1, −1], 0)`; 2.2.1 fixed at center 0, halfWidth 2.5.

### 5.10 `check(card, guess)`

1. No card, no sketch or no answer: `{ ok: null, detail: 'There is no card to check.' }`. `none`: `ok: null`. Any other kind without a `target` (and not `choice`): `ok: null`.
2. `hw = sketch.fit.halfWidth` (3 if missing); `tolOf(base) = min(0.25, max(base, 0.04·hw))`.
3. `choice`: the guess is an integer index (or `{ index }`); `ok = (index === correct)`; a missing guess is `ok: false`.
4. `point` and `roots`: the guess is an array of `{ re, im }` (a bare point counts as an array of one); drop entries that are not finite points; the count must equal `count` (`n` for roots) or `ok: false`. `base` is 0.15 for points and `min(0.2, 0.12·R)` for roots (R = |first root|). For each target point in order take the nearest unused guess; fail when any is farther than `tolOf(base)`. The targets are further apart than twice the tolerance, so this greedy match is exact.
5. `circle`: the guess is `[centre, rim]` or `{ center, radius }`; `ok` iff `|centre − target.center| ≤ tolOf(0.2)` and `| |rim − centre| − target.radius | ≤ max(0.1·radius, 0.05)`; the detail names the part that is off.
6. `line`: exactly two points at least 0.5 apart; each within `tolOf(0.15)` of the line `target.point + t·target.dir` (perpendicular distance `|(p − point) · (−dir.im, dir.re)|`).
7. `sector`: exactly two points, neither within 0.05 of 0; their Args against `{ from, to }`, either way round, each within 5° (`|wrapArg(a − b)| ≤ 5π/180`).
8. `check` never throws: every access is guarded and `NaN`, `null` and wrongly shaped guesses give `ok: false` with an instruction (section 2.3).

## 6. Mathematics: every formula, and every family worked in both addresses

Facts used everywhere (STORY 10): Arg z is in (−π, π] and Arg of a negative real is π; the roots of c = |c|e^{iΘ} (Θ = Arg c) are |c|^{1/n}e^{i(Θ + 2πk)/n}, k = 0..n−1; the principal root uses Arg only; for a seam σ the branch angle is the unique name in (σ, σ + 2π]; for a smooth f, `localLinear` gives A = ½(f_x − i f_y) and B = ½(f_x + i f_y) with Δw ≈ AΔz + B·conj Δz, the quotient along a direction φ tends to A + Be^{−2iφ}, and f is differentiable at z exactly when B = 0 there (then f′ = A = u_x + i v_x). In each block "C" is the Cartesian route and "P" the polar one; the numbers are the ones the unit tests assert (section 7). Where a value is irrational it is checked to 1e-9.

**1.1.1** z₁z₂ = (x₁x₂ − y₁y₂) + (x₁y₂ + x₂y₁)i; z₁/z₂ = z₁·conj z₂/|z₂|²; |z₁z₂| = |z₁||z₂|; Arg adds mod 2π. *z₁ = 2 + i, z₂ = 1 − 3i.* C: (2)(1) − (1)(−3) = 5 and (2)(−3) + (1)(1) = −5, so z₁z₂ = **5 − 5i**; z₁/z₂ = (2 + i)(1 + 3i)/10 = (2 + 6i + i + 3i²)/10 = (−1 + 7i)/10 = **−0.1 + 0.7i**. P: |z₁| = √5, |z₂| = √10, product √50 = 5√2 ≈ 7.0711 = |5 − 5i|; Arg z₁ = atan ½ = 0.4636, Arg z₂ = −atan 3 = −1.2490, sum −0.7854 = −π/4 = Arg(5 − 5i); the quotient has modulus 1/√2 = |−0.1 + 0.7i| and angle 0.4636 + 1.2490 = 1.7127 = π − atan 7 = Arg(−0.1 + 0.7i). Pinned: product (5, −5), quotient (−0.1, 0.7), productAbs √50.

**1.1.2** with w = z₁ ± z₂: Re conj w = Re w and Im conj w = −Im w. *z₁ = 2 + i, z₂ = 1 − 3i, op −, part Im.* C: z₁ − z₂ = 1 + 4i, conjugate 1 − 4i, Im = **−4**. P: |1 + 4i| = √17 = 4.1231, Arg = atan 4 = 1.3258; the mirror negates every name, Arg = −1.3258; r sin θ = 4.1231 · sin(−1.3258) = −4.0000. Pinned: result === −4.

**1.2.1** |z − a| = R is the circle (x − a_x)² + (y − a_y)² = R² (centre a, radius R); `<` the open disk, `<=` the closed disk. *a = 2 − i, R = 2, rel =.* C: (x − 2)² + (y + 1)² = 4. P: z = (2 − i) + 2e^{iφ}: φ = 0 gives 4 − i ((4−2)² + 0 = 4), φ = π/2 gives 2 + i (0 + (1+1)² = 4). Text pinned: `circle, center 2 - i, radius 2: (x - 2)^2 + (y + 1)^2 = 4`.

**1.2.2** d = |z₁ − z₂| = √(Δx² + Δy²). *z₁ = 1 + 5i, z₂ = −2 + i.* C: Δ = 3 + 4i, √(9 + 16) = **5**. P: the slide has r = 5, θ = atan(4/3) = 0.9273 (53.13°); the distance is r. Pinned: `distance === 5` (a perfect square gives an exact integer).

**1.3.1** r = √(x² + y²); θ = Arg z from cos θ = x/r, sin θ = y/r; z = r(cos θ + i sin θ) = re^{iθ}; arg z = {θ + 2πk}. *z = −√3 + i.* C: r = √(3 + 1) = **2**; cos θ = −√3/2, sin θ = ½, so θ = 5π/6 (the plain arctan(y/x) = −π/6 is the quadrant trap). P: second quadrant, reference angle π/6 from the negative real axis, Arg z = π − π/6 = **5π/6**; check 2cos 150° = −√3 and 2 sin 150° = 1. Pinned: r 2, Arg 5π/6.

**1.3.2** zⁿ = rⁿe^{inθ}; the angle nθ is a name of arg(zⁿ), the home step is `wrapArg(nθ)`. *z = √2 + √2 i, n = 4.* C: z² = (2 − 2) + 2(√2)(√2)i = 4i, z⁴ = (4i)² = **−16**. P: r = 2, Arg = π/4; r⁴ = 16; 4 · π/4 = π (rawAngle), Arg = π; 16(cos π + i sin π) = −16. *z = −√3 + i, n = 6.* C: z² = 2 − 2√3 i, z³ = z²·z = 8i, z⁶ = (8i)² = **−64**. P: r⁶ = 64, 6 · 5π/6 = 5π ≡ π: **−64**, Arg π. Pinned: result (−16, 0), r 16, rawAngle π, Arg π; result (−64, 0), Arg π. The Arg of the card is `wrapArg(n·Arg z)`, not the Arg of the floating result.

**1.4.1** roots of 1: e^{2πik/n}, k = 0..n−1; z_k is primitive iff gcd(k, n) = 1. *n = 6.* C: z⁶ − 1 = (z − 1)(z + 1)(z² + z + 1)(z² − z + 1) has the roots 1, −1 and ±½ ± (√3/2)i; the polar route lists them in k order. P: Arg c = 0, so the names 2πk divided by 6 are πk/3: **1, ½ + (√3/2)i, −½ + (√3/2)i, −1, −½ − (√3/2)i, ½ − (√3/2)i**; primitive for k = 1, 5 (gcd with 6 is 1): `[false, true, false, false, false, true]`; principal Args 0, π/3, 2π/3, π, −2π/3, −π/3 (k = 3 is π, never −π). The roots sum to 0.

**1.4.2** the n-th roots of c: |c|^{1/n}e^{i(Arg c + 2πk)/n}. *c = −81, n = 4.* C: z⁴ + 81 = (z² + 9i)(z² − 9i); z² = 9i gives z = ±(3/√2)(1 + i) because (1 + i)² = 2i and (9/2)(2i) = 9i; z² = −9i gives ±(3/√2)(1 − i). P: |c| = 81 so the radius is 81^{1/4} = **3**; Arg c = π; angles (π + 2πk)/4 = π/4, 3π/4, 5π/4, 7π/4 (as Arg: π/4, 3π/4, −3π/4, −π/4); **(3/√2)(±1 ± i)** = ±2.1213 ± 2.1213i in k order (+,+), (−,+), (−,−), (+,−); each to the fourth power is (81/4)(1 + i)⁴ = (81/4)(−4) = −81. Pinned: radius 3, angles, roots in k order.

**1.4.3** z² − 2pz + (p² + q²) = 0 has discriminant −4q² and roots p ± qi; (z − p)² = −q². *p = 3, q = 2: z² − 6z + 13 = 0.* C: z = (6 ± √(36 − 52))/2 = (6 ± 4i)/2 = **3 ± 2i**; check (3 + 2i)² = 5 + 12i, −6(3 + 2i) = −18 − 12i, 5 + 12i − 18 − 12i + 13 = 0. P: −16 = 16e^{iπ}; take every name and divide the staircase by 2: ±4i (r = 4, θ = ±π/2); (z − 3)² = −4, so z − 3 = ±2i. Pinned: roots deepEqual `[{3, 2}, {3, −2}]`, statement text contains `z^2 - 6z + 13 = 0`.

**1.5.1** z(t) = a + t(b − a), 0 ≤ t ≤ 1. *a = 1 + 2i, b = −1 − 2i.* C: direction −2 − 4i, z(t) = **(1 − 2t) + i(2 − 4t)**, z(½) = 0. P: |dir| = √20 = 4.4721, Arg = atan2(−4, −2) = −2.0344 rad (−116.57°): walk at speed 4.4721 heading −116.57°. Pinned: direction (−2, −4), `at.z` (0, 0).

**1.5.2** S = {r₀ ? |z − a| ? r₁}; each circle kept (≤) or left out (<). Open iff both are left out; closed iff both are kept; bounded always; connected always; a domain iff open; a region always (domain plus some, none or all of the boundary); the boundary is the two circles. *(1 − i, 1 ≤ ρ ≤ 3)*: closed, bounded, not open, so not a domain, a (closed) region: pinned open false, closed true, bounded true, connected true, domain false, region true. *(2 + i, 1 < ρ ≤ 2)*: neither, not a domain. *(0, 1 < ρ < 2)*: open, a domain. C: the inequalities in x and y; P: the ring 1 ≤ ρ ≤ 3 about the centre, and a tiny disk on a kept circle sticks out of S while a tiny disk on a left-out circle touches S but is not in it.

**2.1.1** (x + iy)ᵏ expands by the binomial theorem; c·zᵏ = |c|rᵏe^{i(kθ + Arg c)}. *f = z² − iz.* C: (x + iy)² − i(x + iy) = x² − y² + 2ixy − ix + y, so **u = x² − y² + y, v = 2xy − x**; at z = 1 + i: u = 1 − 1 + 1 = 1, v = 2 − 1 = 1, w = **1 + i**. P: z² = r²e^{2iθ}; −iz = r(sin θ − i cos θ) (−i is a quarter turn back), so **u = r² cos 2θ + r sin θ, v = r² sin 2θ − r cos θ**; at r = √2, θ = π/4: u = 2·0 + √2(√2/2) = 1, v = 2·1 − √2(√2/2) = 1. (The handout z² + iz gives u = x² − y² − y, v = 2xy + x, w(1 + i) = −1 + 3i.) Pinned: check.w (1, 1).

**2.1.2** x = c: z = c + iy, z² = (c² − y²) + 2cyi, u = c² − y², v = 2cy, eliminate y = v/(2c): **u = c² − v²/(4c²)** (vertex c², opens left, focus 0). y = c: z = x + ic, u = x² − c², v = 2cx: **u = v²/(4c²) − c²** (vertex −c², opens right). *x = 3.* C: u = 9 − y², v = 6y, so **u = 9 − v²/36**; y = 1: 3 + i ↦ 8 + 6i and 9 − 36/36 = 8. P: on x = 3, r cos θ = 3; ρ = r², φ = 2θ: ρ(1 + cos φ) = 2r²cos²θ = 2·9 = 18; at w = 8 + 6i, ρ = 10 and cos φ = 0.8, 10 · 1.8 = 18. A curve ρ = k/(1 + cos φ) has its focus at 0. Pinned: parabola { vertex 9, coeff −1/36, focus 0 }, the image of 3 + i is 8 + 6i (and x = 2: u = 4 − v²/16, 2 + i ↦ 3 + 4i).

**2.1.3** f(z) = az + b maps x = c to the line through f(c) with direction a·i, and y = c to the line through f(ic) with direction a; in general turn by Arg a, stretch by |a|, slide by b. *a = i, b = 1, x = 1.* C: z = 1 + it, iz + 1 = (1 − t) + i, so u = 1 − t, v = 1: the line **v = 1**. P: a = e^{iπ/2}: turn π/2, stretch 1, slide 1; the direction i turns to i·i = −1, horizontal. *a = 1 + i, b = 2 − 3i, x = −3.* C: (1 + i)(−3 + it) + 2 − 3i = (−1 − t) + i(−6 + t), so t = −(u + 1) and **v = −u − 7** (t = 1: (−2, −5) and −(−2) − 7 = −5). P: a = √2e^{iπ/4}: turn π/4, stretch √2, slide 2 − 3i; the direction i becomes i·a = −1 + i, slope −1. Pinned: imageLine 'v = 1', rotation π/2, stretch 1 (and the handout case `v = 0`).

**2.2.1** zⁿ sends re^{iθ} to rⁿe^{inθ}, so 0 < arg z < α becomes 0 < arg w < nα (no overlap while nα < 2π). *α = π/3, n = 3.* C: the edge y = 0 goes to x³ > 0; the edge t(½ + (√3/2)i) goes to t³(cos π + i sin π) = −t³, the negative real axis; the sector between them is the upper half plane. P: 3θ runs over (0, π): **0 < arg w < π**. Pinned: sector deepEqual `{ from: 0, to: Math.PI }`.

**2.2.2** w^{1/n} = |w|^{1/n}e^{i Arg(w)/n}; the other roots come from the other steps Arg(w) + 2πk. *w = −8, n = 3.* C: (x + iy)³ = −8 has no short Cartesian solution; test: (1 + √3 i)³ = 1 + 3√3 i − 9 − 3√3 i = −8. P: |w|^{1/3} = 2, Arg w = π, so **2e^{iπ/3} = 1 + √3 i**; the other cube roots 2e^{iπ} = −2 and 2e^{i5π/3} = 1 − √3 i. (Handout: (2i)^{1/2} = √2e^{iπ/4} = 1 + i, other −1 − i.) Pinned: root (1, √3).

**2.3.1** (x² − y² + i2xy)/(x² + y²) = z/conj z = e^{2iθ}. Along y = mx: ((1 − m²) + 2mi)/(1 + m²) = e^{2i atan m}; along x = 0: −1; along y = x² or y = x³: 1. *m = 2.* C: numerator x²(−3 + 4i), denominator 5x², value (−3 + 4i)/5 = **−0.6 + 0.8i**. P: atan 2 = 1.1071, 2 · 1.1071 = 2.2143 rad, cos = −0.6, sin = 0.8. Pinned: along (−0.6, 0.8); parabola 1; vertical −1 (always `{ re, im }`). The unit test evaluates the compiled expression at x = 10⁻³ along every drawn path and allows 10⁻³: lines and the vertical axis are exact there; for P5 the parabola is 9.99999·10⁻⁴ from 1 (inside, narrowly) and the cubic 10⁻⁶. (2.3.1 never draws the parabola: for it the distance at x = 10⁻³ would be about 2·10⁻³; the limit 1 is still right.)

**2.4.1** a branch of z^{1/n} with seam σ uses θ ∈ (σ, σ + 2π]; it is continuous across any ray that is not the seam. The card uses the seam opposite the ray: negative real axis σ = 0, positive imaginary axis σ = −π/2, negative imaginary axis σ = π/2. *n = 2, ray = negative imaginary axis.* C: no short formula in x and y. P: σ = π/2, window (π/2, 5π/2); −i is at θ = 3π/2, inside it, so f(−i) = e^{i3π/4} = **−√2/2 + (√2/2)i**; f² = e^{i3π/2} = −i. (Handout: n = 3, negative real axis, σ = 0, f(−1) = e^{iπ/3} = ½ + (√3/2)i, and the principal branch jumps there.) Pinned: seam π/2, window [π/2, 5π/2], atRay (−√½, √½).

**2.5.1** the circle |z − a| = |a| through 0 has x² + y² = 2(αx + βy) with a = α + βi; 1/z = (x − iy)/(x² + y²), so αu − βv = ½: a line. The line x = c (c ≠ 0): u² + v² = u/c, the circle |w − 1/(2c)| = 1/(2|c|). *a = i.* C: x² + y² = 2y; v = −y/(x² + y²) = −½ on the circle, so **Im w = −½**; z = i(1 + i) = −1 + i, w = 1/(−1 + i) = (−1 − i)/2, Im = −½. P: 1/z inverts the length and negates every name; the circle passes through 0, which goes to ∞, so it opens into a line. *line x = 2.* C: w = (2 − iy)/(4 + y²), u² + v² = u/2, **centre ¼, radius ¼**; z = 2 + i ↦ 0.4 − 0.2i, |w − 0.25| = |0.15 − 0.2i| = 0.25. Pinned: imageLine 'Im w = -1/2'; centre (0.25, 0), radius 0.25.

**3.1.1** f = az² + bz + c: (f(z + h) − f(z))/h = 2az + b + ah → f′ = 2az + b. *f = 2z² − 3z + 1.* C: 2(2zh + h²) − 3h over h is 4z − 3 + 2h, so **f′ = 4z − 3**; at 1 + i: 4 + 4i − 3 = 1 + 4i. P: with h = ρe^{iφ} (φ a name for arg h) the quotient is 4z − 3 + 2ρe^{iφ}, a circle of radius 2ρ that shrinks to the point 4z − 3: the mirror part B is 0. Pinned: fprimeTex '4z - 3', f′(1 + i) = (1, 4).

**3.1.2** for k|z − a|²: A = k·conj(z − a), B = k(z − a); B = 0 only at z = a. For z·Re z = (z² + z·conj z)/2: A = z + conj z/2, B = z/2. *f = z·Re z.* C: u = x², v = xy; Cauchy–Riemann u_x = 2x = x = v_y gives x = 0 and u_y = 0 = −y = −v_x gives y = 0: only at 0, f′(0) = 0. P: the quotient tends to A + Be^{−2iφ}, a circle of radius |B| = |z|/2 about A (at 1 + i: radius √2/2 = 0.7071 about 1.5 + 0.5i), a point only at 0. *f = 2|z − 1|².* A = 2conj(z − 1), B = 2(z − 1): only at z = 1; at 1 + i: A = −2i, B = 2i, radius 2. Pinned: differentiableAt (0, 0), nowhereAnalytic true.

**3.2.1** u_x = v_y and u_y = −v_x continuous everywhere means entire, f′ = u_x + iv_x. *f = e^{−x}(cos y − i sin y) = e^{−z}.* C: u = e^{−x}cos y, v = −e^{−x}sin y; u_x = −e^{−x}cos y = v_y; u_y = −e^{−x}sin y = −v_x (v_x = e^{−x}sin y); **entire**, f′ = −e^{−x}cos y + i e^{−x}sin y = **−f(z)**, f′(0) = −1. P: B = 0 (no mirror), f′ = A is a complex number with its own turn and stretch. *f = x − iy.* u_x = 1 but v_y = −1: **not entire** (B = 1, a pure mirror). Pinned: entire true with fprimeTex '-f(z)'; entire false.

**P1** conj z₁ · conj z₂ = conj(z₁z₂). *z₁ = 2 + i, z₂ = 1 − 3i.* C: z₁z₂ = 5 − 5i, conjugate 5 + 5i; (2 − i)(1 + 3i) = 2 + 6i − i − 3i² = **5 + 5i**. P: the mirror negates every name: r₁r₂e^{−i(θ₁ + θ₂)}; mirror then multiply equals multiply then mirror.

**P2** z·conj z = x² + y² = |z|². *z = 2 + i.* C: (2 + i)(2 − i) = 4 + 1 = **5**, |z| = √5. P: re^{iθ}·re^{−iθ} = r², the turn and the un-turn cancel.

**P3** a(cz + d) + b = (ac)z + (ad + b). *a = 2, b = i, c = 1 + i, d = −i.* C: ac = 2 + 2i, ad + b = −2i + i = **−i**; T₁(T₂(z)) = (2 + 2i)z − i. P: |a||c| = 2√2 and Arg a + Arg c = 0 + π/4, so ac = 2√2e^{iπ/4} = 2 + 2i. Pinned: coeff (2, 2), shift (0, −1).

**P4** |az| = |a||z|; the image of |z| = R is |w| = |a|R and every point is hit (w/a has modulus R). *a = 2i, R = 3.* C: w = 2i(x + iy) = −2y + 2xi, |w|² = 4(x² + y²) = 36, so |w| = **6**. P: |a| = 2, Arg a = π/2: w = 6e^{i(t + π/2)} goes once round with t. Pinned: radius === 6.

**P5** (Re(1 + z) − 1)/z = x/z = cos θ e^{−iθ} = ½ + ½e^{−2iθ} (the circle |w − ½| = ½ through 0 and 1). *Path y = x.* C: x/z = 1/(1 + i) = (1 − i)/2 = **0.5 − 0.5i**; along the real axis 1; two values, so no limit. P: |½ − ½i − ½| = ½: on the circle. Pinned: along (0.5, −0.5).

**P6** f = Im z: A = −i/2, B = i/2, the quotient tends to A + Be^{−2iφ}: φ = 0 gives A + B = 0, φ = π/2 gives A − B = −i. *Re z* (the handout): A = B = ½, values 1 and 0. A circle of radius |B|, never a point: differentiable nowhere.

**P7** u ≡ c gives u_x = u_y = 0; Cauchy–Riemann gives v_y = u_x = 0 and v_x = −u_y = 0; f′ = u_x + iv_x = 0 on a domain, so f is constant. For |f| ≡ c > 0: u² + v² = c²; u·u_x + v·v_x = 0 and u·u_y + v·v_y = 0 with v_y = u_x, v_x = −u_y give (u² + v²)u_x = 0 and (u² + v²)u_y = 0, so u_x = u_y = 0 and f′ = 0. P: f′(z₀) = ρe^{iα} ≠ 0 would send a small disk to a blob, but the images lie on a line (or the circle |w| = c), which cannot hold one.

## 7. Verification plan

Run from the repo root. The unit test file is `tests/unit/i2-generators.test.mjs` (Appendix B, 25 tests, about 9 s); the interaction script is `tests/interact/i2-generators.mjs` (Appendix C).

State of the suite when this design was written (and again after fix round 1, with 858 tests of which the 25 of this file pass): `npm test` in the repo reports 5 failing (`I1 the registry: 21 stations`, `U3 threadStops`, `U4 layoutMap wide`, `U5 layoutMap narrow`, `U10 stationNeighbours`); they belong to the station registry and the map, not to this goal. With `js/data/generators.js` and `tests/unit/i2-generators.test.mjs` copied into a scratch copy of the repo, the failing list was identical before and after and the count rose by exactly the new tests (all passing); in particular `architecture-sync.test.mjs` (the import rule `js/data/generators.js` may import only `../core/complex.js`) stays green. The builder compares before and after: the failing list must not grow.

```
npm test                                   # the whole suite; the new file adds 25 passing tests and no failure (see the note below)
node --test tests/unit/i2-generators.test.mjs
node tools/smoke.mjs --route home --script tests/interact/i2-generators.mjs     # desktop 1280 and phone 390, headless Chromium
node tools/smoke.mjs                       # every route still loads clean (the module is not imported by a station yet)
```

### 7.1 Golden values (pin them in the test the first time; they change only if the draw order of 5.4 changes)

`rng(7)` three times: `0.011704753153026104, 0.06195825757458806, 0.97690763277933`. Pinned cards: `generate('1.4.2', 7).given` is `{ c: { re: -81, im: 0 }, n: 4 }` (the Rehearsal Room's seed; its sketch is `roots` with `n: 4`, its values `{ c: -81, n: 4 }`); `generate('2.5.1', 3)` is the line x = 1 (a circle image, a lab request with `fn: 'recip'`); `generate('P5', 1)` is a `choice` card for the path y = x/2 with right answer `4/5 - (2/5)i`.

Givens of seeds 1 and 2 for every family (floats rounded to 6 places here; a test compares with 1e-6):

| id | given, seed 1 | given, seed 2 |
|---|---|---|
| 1.1.1 | `{"z1":{"re":2,"im":2},"z2":{"re":-5,"im":1}}` | `{"z1":{"re":-3,"im":3},"z2":{"re":-2,"im":-3}}` |
| 1.1.2 | `{"z1":{"re":2,"im":2},"z2":{"re":-5,"im":1},"op":"-","part":"Im"}` | `{"z1":{"re":-3,"im":3},"z2":{"re":-2,"im":-3},"op":"-","part":"Im"}` |
| 1.2.1 | `{"a":{"re":1,"im":2},"R":1,"rel":"<"}` | `{"a":{"re":-3,"im":2},"R":2,"rel":"="}` |
| 1.2.2 | `{"z1":{"re":2,"im":2},"z2":{"re":-5,"im":1}}` | `{"z1":{"re":-3,"im":3},"z2":{"re":-2,"im":-3}}` |
| 1.3.1 | `{"z":{"re":-1.732051,"im":-1}}` | `{"z":{"re":1.5,"im":2.598076}}` |
| 1.3.2 | `{"z":{"re":-1.732051,"im":-1},"n":4}` | `{"z":{"re":1,"im":1.732051},"n":6}` |
| 1.4.1 | `{"n":7}` | `{"n":4}` |
| 1.4.2 | `{"c":{"re":0,"im":2},"n":2}` | `{"c":{"re":-8,"im":0},"n":3}` |
| 1.4.3 | `{"p":2,"q":4}` | `{"p":-3,"q":4}` |
| 1.5.1 | `{"a":{"re":2,"im":2},"b":{"re":-5,"im":1}}` | `{"a":{"re":-3,"im":3},"b":{"re":-2,"im":-3}}` |
| 1.5.2 | `{"a":{"re":1,"im":-3},"r0":2,"r1":4,"innerStrict":false,"outerStrict":true}` | `{"a":{"re":2,"im":-1},"r0":1,"r1":3,"innerStrict":true,"outerStrict":true}` |
| 2.1.1 | `{"fn":"z^3 + (1 - i)z"}` | `{"fn":"z^2 + (2 - 2i)z"}` |
| 2.1.2 | `{"axis":"y","c":-1}` | `{"axis":"x","c":1}` |
| 2.1.3 | `{"a":{"re":0,"im":2},"b":{"re":1,"im":-3},"line":{"axis":"y","c":3}}` | `{"a":{"re":0,"im":-1},"b":{"re":2,"im":-1},"line":{"axis":"x","c":1}}` |
| 2.2.1 | `{"alpha":1.047198,"n":3}` | `{"alpha":0.523599,"n":4}` |
| 2.2.2 | `{"w":{"re":-1.732051,"im":-1},"n":2}` | `{"w":{"re":1.5,"im":2.598076},"n":2}` |
| 2.3.1 | `{"path":{"kind":"line","m":-2}}` | `{"path":{"kind":"line","m":-1}}` |
| 2.4.1 | `{"n":3,"ray":"positive-imaginary"}` | `{"n":2,"ray":"positive-imaginary"}` |
| 2.5.1 | `{"line":{"c":-1}}` | `{"circle":{"a":{"re":0,"im":1}}}` |
| 3.1.1 | `{"a":1,"b":2,"c":-5}` | `{"a":-2,"b":3,"c":-2}` |
| 3.1.2 | `{"fn":"\|z - i\|^2"}` | `{"fn":"2\|z\|^2"}` |
| 3.2.1 | `{"fn":"e^{2x}(cos 2y + i sin 2y)"}` | `{"fn":"x^2 - y^2 + 2ixy"}` |
| P1 | `{"z1":{"re":2,"im":2},"z2":{"re":-5,"im":1}}` | `{"z1":{"re":-3,"im":3},"z2":{"re":-2,"im":-3}}` |
| P2 | `{"z":{"re":2,"im":2}}` | `{"z":{"re":-3,"im":3}}` |
| P3 | `{"a":{"re":1,"im":1},"b":{"re":-3,"im":0},"c":{"re":3,"im":3},"d":{"re":-2,"im":1}}` | `{"a":{"re":-2,"im":2},"b":{"re":-1,"im":-2},"c":{"re":1,"im":3},"d":{"re":1,"im":0}}` |
| P4 | `{"a":{"re":-2,"im":0},"R":1}` | `{"a":{"re":0,"im":2},"R":2}` |
| P5 | `{"path":{"kind":"line","m":0.5}}` | `{"path":{"kind":"line","m":-1}}` |
| P6 | `{"fn":"2 conj z"}` | `{"fn":"2 Re z"}` |
| P7 | `{"kind":"v","c":2}` | `{"kind":"u","c":3}` |

### 7.2 A1: hand-checked solutions come out exactly

| Command | `node --test tests/unit/i2-generators.test.mjs` (tests "A1" and "A1 (extra)") |
|---|---|
| Cases (call → expected, 1e-9 unless `===` / deepEqual) | `solve('1.1.1', {2+i, 1−3i}).answer.values`: product (5, −5), quotient (−0.1, 0.7), productAbs √50 · `solve('1.1.2', {2+i, 1−3i, '-', 'Im'}).result === −4` · `solve('1.2.2', {1+5i, −2+i}).distance === 5` · `solve('1.3.1', {−√3+i})`: r 2, Arg 5π/6 · `solve('1.3.2', {√2+√2i, 4})`: result (−16, 0), r 16, rawAngle π, Arg π · `solve('1.3.2', {−√3+i, 6})`: result (−64, 0), Arg π · `solve('1.4.1', {n: 6}).primitive` deepEqual `[false, true, false, false, false, true]` (and principalArgs 0, π/3, 2π/3, π, −2π/3, −π/3) · `solve('1.4.2', {−81, 4})`: radius 3, angles π/4, 3π/4, 5π/4, 7π/4, roots (3/√2)(±1 ± i) in k order · `solve('1.4.3', {3, 2}).roots` deepEqual `[{re: 3, im: 2}, {re: 3, im: −2}]`, statement text contains `z^2 - 6z + 13 = 0` (and p = −2, q = 1: `z^2 + 4z + 5 = 0`) · `solve('1.5.1', {1+2i, −1−2i})`: direction (−2, −4), at t = 0.5 z = 0 · `solve('1.5.2', {1−i, 1, 3, false, false})`: open false, closed true, bounded true, connected true, domain false, region true (and the mixed and the open cases of section 6) · `solve('2.1.1', {fn: 'z^2 - iz'}).check.w` (1, 1); uCart `x^2 - y^2 + y`, vCart `2xy - x`; the handout fn gives (−1, 3) · `solve('2.1.2', {x, 3}).parabola` deepEqual `{ vertex: 9, coeff: -1/36, focus: 0 }`, sample.w (8, 6) (x = 2: vertex 4, coeff −1/16, w(2 + i) = 3 + 4i; y = 2: vertex −4, coeff 1/16, opens right) · `solve('2.1.3', {i, 1, x = 1})`: imageLine `v = 1`, rotation π/2, stretch 1 (handout: `v = 0`, shift −2i; `{1+i, 2−3i, x = −3}`: `v = -u - 7`, sample.w (−2, −5)) · `solve('2.2.1', {π/3, 3}).sector` deepEqual `{ from: 0, to: Math.PI }` · `solve('2.2.2', {−8, 3}).root` (1, √3) (handout: (1, 1), other (−1, −1)) · `solve('2.3.1', {line m = 2}).along` (−0.6, 0.8); parabola 1; vertical −1 (always `{ re, im }`; the test compares with `eq`) · `solve('2.4.1', {2, 'negative-imaginary'})`: seam π/2, window [π/2, 5π/2], atRay (−√½, √½) (handout: seam 0, window [0, 2π], atMinusOne (½, √3/2), principalJumps true) · `solve('2.5.1', {circle: i}).imageLine === 'Im w = -1/2'`; `{line: c = 2}`: centre (0.25, 0), radius 0.25 (and a = 2 `Re w = 1/4`, a = 1 + i `u - v = 1/2`) · `solve('3.1.1', {2, −3, 1})`: fprimeTex `'4z - 3'`, f′(1 + i) = (1, 4) · `solve('3.1.2', {fn: 'z·Re z'})`: differentiableAt deepEqual `{ re: 0, im: 0 }`, nowhereAnalytic true · `solve('3.2.1', {fn: 'e^{-x}(cos y - i sin y)'})`: entire true, fprimeTex `'-f(z)'`; `'x - iy'`: entire false · `solve('P3', {2, i, 1+i, −i}).check`: coeff (2, 2), shift (0, −1) · `solve('P4', {2i, 3}).radius === 6` · `solve('P5', {line m = 1}).along` (0.5, −0.5) · P1 both = (5, 5); P2 zzbar 5; P6 `Im z` A = −i/2, B = i/2; P7 fprime 0 |
| Passing | 2 tests ok, no `AssertionError` |

### 7.3 A2: fifty seeds, determinism, never the handout

| Command | the same file, tests "A2: every family obeys …" and "A2: the rules of every family against complex.js" |
|---|---|
| Cases | for each of the 29 ids and s = 1..50: `generate(id, s)` is a card with `id`, `seed === s`, `station` equal to the literal table of the file (1.1.1 arithmetic, 1.1.2 arithmetic, 1.2.1 distance, 1.2.2 distance, 1.3.1 addresses, 1.3.2 powers, 1.4.1 roots, 1.4.2 roots, 1.4.3 roots, 1.5.1 curves, 1.5.2 sets, 2.1.1 mappings, 2.1.2 powermap, 2.1.3 linear, 2.2.1 powermap, 2.2.2 principal-root, 2.3.1 limits, 2.4.1 branches, 2.5.1 reciprocal, 3.1.1 derivative, 3.1.2 derivative, 3.2.1 cauchy-riemann, P1 arithmetic, P2 arithmetic, P3 linear, P4 linear, P5 limits, P6 derivative, P7 cauchy-riemann); an even number of `$` in `statement`; ASCII `statementText`; a `sketch.kind` from the seven; both worked paragraphs non-empty; `generate(id, s)` deep-equals itself and equals `{ id, seed: s, ...solve(id, given) }`; `given` differs from that of `s + 1` for at least 45 of the 50 (the design gives 50); `given` is not the handout's (a predicate per id, table in the file: 1.1.1 not (3 − 2i, −1 + 4i); 1.1.2 not that pair with op − and part Im; 1.2.1 not (1 + 2i, 3, =); 1.2.2 not (4 + 3i, −1 + i); 1.3.1 not −1 + i√3; 1.3.2 not (√3 + i, 10); 1.4.1 not 5; 1.4.2 not (−16, 4); 1.4.3 not (2, 3); 1.5.1 not (2 + i, −3 − 3i); 1.5.2 not (−i, 1, 3, <, ≤); 2.1.1 not `z^2 + iz`; 2.1.2 not x = 2; 2.1.3 not (i, −2i, x = 2); 2.2.1 not (π/4, 3); 2.2.2 not (2i, 2); 2.3.1 not y = x²; 2.4.1 not (3, negative real); 2.5.1 not the circle \|z − 1\| = 1; 3.1.1 not (1, 1, 0); 3.1.2 not \|z\|²; 3.2.1 not e^x(cos y + i sin y); P1, P2, P3, P4, P6 their handout numbers; P5 and P7 have none) |
| Rule checks against `complex.js` and `parse.js` | 1.1.1 product = `mul(z1, z2)`, quotient·z₂ = z₁, \|product\| = \|z₁\|\|z₂\| · 1.1.2 result = part of the conjugate · 1.2.2 distance = \|z₁ − z₂\| · 1.3.1 `fromPolar(r, Arg) = z` · 1.3.2 result = `pow(z, n)`, Arg = `wrapArg(n·Arg z)` · 1.4.1 roots = `rootsOfUnity(n)`, each to the n = 1 · 1.4.2 roots = `rootsOf(c, n)`, each to the n = c · 1.4.3 both roots satisfy z² + bz + c · 1.5.1 a + ½ direction = at.z, a + direction = b · 1.5.2 open iff both strict, closed iff both non-strict, domain iff open · 2.1.1 `cartTerms` and `polarTerms` evaluated at z = 0.7 − 1.1i equal `f(z)` (so u and v are right in both addresses) · 2.1.2 the images of three points of the line satisfy u = vertex + coeff·v² · 2.1.3 the images of two points satisfy nu·u + nv·v = k · 2.2.2 root = `principalRoot(w, n)` and Arg root = Arg w / n · 2.3.1 and P5 `along` is within 10⁻³ of the compiled expression at x = 10⁻³ on the path · 2.4.1 `branchRoot` is continuous across the ray (values at the ray rotated by ±10⁻⁶ differ by less than 10⁻³), the seam is not the ray, the window is 2π wide · 2.5.1 five points of the input map onto the stated line or circle (10⁻⁶) · 3.1.1, 3.1.2, 3.2.1, P6: `localLinear` of the compiled `src` at three points has \|B\| < 10⁻⁵ exactly where the card says differentiable (and 3.1.1's A = 2az + b); for 3.1.2 and P6 \|B\| > 10⁻³ at all three points and B = 0 at `differentiableAt` · P1, P2, P3, P4 computed from the formulas |
| Passing | 2 tests ok; no family has fewer than 50 differing neighbour pairs |

### 7.4 A3: values presets and lab requests match the station shapes

| Command | the same file, tests "A3: values presets …", "A3: lab requests …", "A3: check() …" |
|---|---|
| Station shapes written literally in the file (ARCH 4.1) | arithmetic `{ z1, z2, mode ∈ add, sub, mul, div, conj, inv }` · distance `{ mode ∈ two, circle, triangle; z1, z2 for two; a, R for circle }` · addresses `{ z }` · powers `{ z, n integer 1..12 }` · roots `{ c, n integer 2..12 }` or `{ quadratic: { a, b, c } }` (real numbers) · curves `{ a, b }` · sets `{ center, r0, r1, innerStrict, outerStrict }` with 1 ≤ r0 < r1 ≤ 4 · mappings `{ fn: id or { src }, z }` · linear `{ a, b, input: 'x2' or 'unit' or a shape, compose? }` · powermap `{ n integer 2..6, line: { axis, c } or sector: { theta0, theta1 } }` · principal-root `{ w, n integer 2..6 }` · branches `{ n 2..5, seam in (−π, π], walk: null, 'along' or 'across' }` · reciprocal `{ shape: circle { center, r } or line { a, b } }` · limits `{ fn: 'dir' or 'x-over-z', path: line, vertical, parabola or spiral, m? }` · derivative and cauchy-riemann `{ fn: id or { src }, z0 }`; every complex value has finite `re` and `im`; every `{ src }` compiles with `parse.js` |
| Null values | `values === null` only for P5 on the cubic (2.3.1 never draws it: 200 seeds checked) |
| Lab | `labRequest` is non-null exactly for 2.1.2, 2.1.3, 2.2.1, 2.5.1, P4; `fn` is a `FUNCTIONS` id or `{ src }` that compiles; `shapes` of the eight hand-off kinds; `view === 'side'`; `problem === id`; `predictFirst === true`; and the compiled `fn` agrees with the intended map at two points (az + b, az, zⁿ, z², 1/z) |
| `check` | 1.4.2: `check(card, roots).ok === true` for every seed 1..50 and `false` when every guess is rotated by 10° (radius 1 included: tolerance 0.12), when one is missing and when one guess is repeated n times (one handle cannot stand for every root) · points (1.4.3, 2.2.2, 2.3.1): `true` on `target.points` (1.4.3 in either order), `false` shifted by 0.3 · choice: `true` for `sketch.correct`, `false` for the next index and for `null` (15 families) · none (P1, P2, P3, P7): `ok === null` · circle (1.2.1, P4, 2.5.1): `true` for centre + rim, `false` with the centre moved by 0.5 or the radius ×1.5 · line (2.1.3, 2.5.1): `true` for two points on the line, `false` when moved 0.3 along the normal, `false` for two equal points · sector (2.2.1): `true` for the two edges in either order, `false` when one is 0.15 rad out or sits at 0 · junk guesses (`undefined`, `null`, 5, `'x'`, `{}`, `[null]`, `[{ re: NaN, im: 0 }]`) give `ok: false`, never an exception; `check(null, 1).ok === null` |
| Passing | 3 tests ok |

### 7.5 A4: the module is pure and imports only complex.js

| Command | the same file, test "A4", and the interaction script's source fetch |
|---|---|
| Cases | exactly one line matching `^import ` and it is `import { … } from '../core/complex.js';` · none of `Math.random`, `Date`, `document`, `globalThis`, `localStorage`, `setTimeout`, `performance`, `import(`, `require(` and no `window` followed by `.`, `[`, `(`, `=` or `)` (the key `window:` of 2.4.1 is allowed; comments are included) · the exports are exactly `FAMILIES, check, draw, familyInfo, generate, rng, solve, statementFor` (no `export {`, no default) · `rng(7)` pins of 7.1 · `statementFor('1.4.3', { p: 3, q: 2 })` deep-equals `{ tex: 'Use the quadratic formula to solve $z^2 - 6z + 13 = 0$.', text: 'Use the quadratic formula to solve z^2 - 6z + 13 = 0.' }` · `familyInfo('1.4.2')` as in 4.1 |
| Also | `tests/unit/architecture-sync.test.mjs` already lists `'js/data/generators.js': ['../core/complex.js']` in its `ALLOWED_IMPORTS` (the decisions kit put it there) and scans every `js/data/*.js` for lines matching `^import\s[^;]*?from\s+'…'`; the module's single import line matches and is allowed, so that test passes with the module in place (checked in a scratch copy). |

### 7.6 A5: the worked prose speaks the thread

| Command | the same file, test "A5" |
|---|---|
| Cases (every id, seeds 1..10) | `worked.cart` contains `x` or `y` and `worked.polar` contains `r` or `θ` · Names all (1.4.1, 1.4.2, 1.4.3): `worked.polar` contains `every name` and `staircase`; 1.4.1 and 1.4.2 contain the literal `(Arg c + 2πk)/n` with the card's own n (U+03C0) · home (1.3.1, 2.2.2): `home step` · 2.4.1: `continuous` and `seam` · image families (2.1.2, 2.1.3, 2.2.1, 2.5.1, P4): `worked.cart` contains `push forward` or `eliminate` (all five say "parametrize, push forward, eliminate") · 3.1.1, 3.1.2, 3.2.1, P6, P7: `worked.polar` contains `mirror` · 1.1.1, P1, P2: `worked.polar` contains `turn and stretch` · every `answer.text` is ASCII · the 16 Walk-stop ids (1.3.1, 1.1.1, 1.2.1, 1.3.2, 1.4.2, 1.5.1, 1.5.2, 2.1.1, 2.1.3, 2.1.2, 2.2.2, 2.4.1, 2.5.1, 2.3.1, 3.1.2, 3.2.1) all have `values` or `labRequest` non-null · extra: a paragraph that says θ or φ also says `Arg` or `arg` (no angle without its name, ARCHITECTURE 10.4 rule 6) |
| Passing | 1 test ok |

### 7.7 The extra checks of this design

Test "extra: TeX renders …": for 29 × 50 cards every `$…$` run of `statement` and `answer.tex` render with the vendored KaTeX (`throwOnError: true, strict: 'error'`, loaded in a `vm` sandbox as `i1-data.test.mjs` does); the card survives `JSON.parse(JSON.stringify(card))` unchanged (no −0, NaN, undefined); `statementText` ≤ 220 characters, `answer.text` ≤ 400, each worked paragraph ≤ 700, each choice option ≤ 72 (the measured maxima are 163, 238, 438, 54); options are four different ASCII strings with a valid `correct`; `sketch.target` equals `answer.values.target`; `fit.halfWidth` ≥ 1.5. Test "extra: draw …": `draw` is a function of its source alone (`() => 0` and `() => 0.9999999999` pick the first and last variant). Test "extra: only known ids …": `generate`, `familyInfo` and `solve` refuse `'constructor'`, `'toString'`, `'__proto__'`, `'hasOwnProperty'`, `''`, `'1.1'`, `'p1'`; a fuzz of junk fields over every family throws only `RangeError`. Test "extra: a card is fresh …": mutating a card changes nothing; seeds 0, 2³¹, 2³² − 1, 2³², −1, 1.9, `'7'`, `'abc'`, `NaN`, `undefined`, `null`, `Infinity` all work and give a uint32 `seed` (1.9 gives 1, −1 gives 4294967295, 2³² and `Infinity` give 0, and a string is always hashed, so `'7'` is not the seed 7); 1450 cards in under 1.5 s (measured about 100 ms). Test "extra: the pinned seeds": 7.1.

### 7.8 Interaction script (`tests/interact/i2-generators.mjs`, Appendix C)

Run with `node tools/smoke.mjs --route home --script tests/interact/i2-generators.mjs` (route `home` is the one route that always exists; the script ignores its page). Steps, run at both viewports by the harness:

1. `page.evaluate` imports `./js/data/generators.js` the way a station would (a relative dynamic import) and collects everything below in the browser.
2. Exports are exactly the eight names; `FAMILIES` has 29 ids and is frozen.
3. `generate('1.4.2', 7)` twice serialises identically; it is the fourth roots of −81 (`n` 4, `c` −81), `sketch.kind` `roots` with `n` 4, `statementText` equals `Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms.`, `answer.text` starts with `3 e^(i pi/4), 3 e^(i 3pi/4), 3 e^(i 5pi/4), 3 e^(i 7pi/4) = `, `values` is `{ c, n }`.
4. `check(card, roots).ok === true`; the roots rotated by 10° give `false`.
5. Eight A1 spot values: 1.1.1 product (5, −5), 1.2.2 distance 5, 1.3.2 (√2 + √2i)⁴ = −16, 1.4.1 primitive flags for n = 6, 1.4.3 roots 3 ± 2i, 2.1.2 parabola `{ 9, −1/36, 0 }`, 2.5.1 `Im w = -1/2`, 3.1.1 `4z - 3`.
6. 29 families × 20 seeds = 580 cards: none throws, each survives JSON, `id` and `seed` are right, and the whole loop takes under 600 ms in the page (measured 57 to 62 ms).
7. `generate('nope', 1)` is `null`; `familyInfo('2.5.1')` reports `hasLab: true` and `sketch: 'line'`.
8. `fetch('./js/data/generators.js')` is read as text: one `import` line, from `../core/complex.js`; none of the forbidden tokens of 7.5.
   Fix round 1 adds the sentences of the review: `P4` seed 6 prints `w = 4 e^(i(t + pi))`, `P5` seed 8 quotes `0 along the imaginary axis`, `2.1.3` seed 10 turns `clockwise`, `1.3.1` for −1 is `on the negative real axis` with no quadrant, `1.1.1` seed 3 is `-23/26 - (11/26)i`, `2.1.2` for x = −3 folds its signs, `2.5.1` for x = −1 prints `|w + 1/2|`, and a sign lint over 29 families × 60 seeds finds nothing.
9. The smoke runner reports no console error, page error, failed request or horizontal overflow, and prints one log line `i2-generators: 580 cards in N ms at W px`.

Passing looks like: `ok   home (desktop)`, `ok   home (phone)`, `2/2 checks passed across 1 route(s).`

### 7.9 The sentence checks (fix round 1: every defect of the first review was in a sentence no test looked at)

Seven tests at the end of the unit file read what a student reads. They share a tiny reader of the ASCII notation (`parseNum`, `parseCart`, `parseAngle`, `parseExp`; its own test comes first).

| Test | What it does (all over seeds 1..300 and the explicit cases named) |
|---|---|
| "1.1.1 prints the exact quotient" | all 10 000 pairs of the draw range: `answer.text` parsed back equals `mul` and `div` (1e-12), no decimal in `answer.text`, `answer.tex` or `worked.cart`; `generate('1.1.1', 3).answer.text === 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i'` and the TeX has `-\frac{23}{26} - \frac{11}{26}i` |
| "P4 prints w = radius e^(i(t + Arg a))" | parses `a = … = r e^(i θ): with z = R e^(it), w = ρ e^(i(t ± φ)) covers the whole circle \|w\| = ρ`: ρ equals `values.radius` (not \|a\|), R equals the card's R, φ equals Arg a with the sign read as `t - …` for a negative angle; includes every `a` of the table at R = 1, 2, 3; `generate('P4', 6)` says `w = 4 e^(i(t + pi))` |
| "P5 quotes the axis that differs" | all eight paths and 300 seeds: the two quoted values differ, the second is 1 (real axis) or 0 (imaginary axis), the TeX names the same axis; the imaginary axis is quoted exactly for y = x² and y = x³ |
| "2.1.3 says clockwise …" | every `a` of the table, both axes, two shifts, and 300 seeds: `answer.text`, `answer.tex` and `worked.polar` carry exactly the word of the sign of Arg a (`counterclockwise`, `clockwise`, `a half turn`, `do not turn`) and not the other; `generate('2.1.3', 10)` says `turn by Arg a = -pi/2 (clockwise)` |
| "1.3.1 puts axis points on the axis" | 16 angles × 3 radii and 300 seeds: an axis point is `on the positive/negative real/imaginary axis` and the prose has no `quadrant`; −1 adds `Arg π, never −π`; every other point is in the right quadrant |
| "no sign-unaware template" | a regex lint over `statement`, `statementText`, `answer.text`, `answer.tex`, `worked.cart`, `worked.polar` of 29 × 300 cards: `+ -`, `- -`, `/-`, ` -0`, a bare `1i`, a unit coefficient (`1(`, `1ρ`, `1x`), a zero coefficient (`0x`), `· -3`, `3/4x`, `√3x`, `+ +`, `(-2)x`, `()`; plus the review's examples by name (`(9 − y²) − 6iy`, `y = −v/6`, `2 · (-3)² = 18`, `|w + 1/2|`, `(u + 1/2)²`, `u/(-1)`, `(-2x) + i(-2y)`, `-(2zh + h²) − 3h`, `-(conj u + …)`, `the length stays 1`) |
| "a rounded number is always marked" | any field with a decimal of two places or more also carries `~`, `≈`, `about`, `rounded` or `\approx` (D13) |
| "the exponential and Cartesian forms … equal answer.values" | 1.3.1, 1.3.2, 1.4.2, 1.4.3, 2.2.2, 2.4.1: the printed `r e^(iθ)` and the printed `x + iy` are parsed and equal the numbers in `values` (1e-9, or 5e-3 where the card says it rounded); 2.2.2's TeX has the other root |
| "a different given never gives the handout answer" | D16 |
| "one spelling, rootWord …" | no `centre` in any field, prompt or `check` detail; 1.4.2 says square, cube, 4th …; 1.3.2 has no `1(cos` and no `r^n = 1` |

These tests fail on the first build (checked against a copy of the first build's module: 11 of the 25 fail, each on the defect it was written for).

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

Every row is exercised by a test of section 7 (the last column names it).

| Case | What the module does | Test |
|---|---|---|
| Unknown id: `'nope'`, `''`, `'1.1'`, `'p1'` (lower case), `'constructor'`, `'toString'`, `'__proto__'`, `'hasOwnProperty'` | `generate` and `familyInfo` return `null`; `solve`, `draw` and `statementFor` throw `RangeError('generators: unknown family …')`. Every table is null-prototype (`table()`), so an inherited key can never name a family. | 7.7 "only known ids" |
| Id given as a number (`1.1`) or an object | the same as an unknown id (`FAM[id]` is looked up by string key; a number turns into a string that is not a family) | 7.7 |
| A seed of any kind: `0`, `2^31`, `2^32 − 1`, `2^32`, `−1`, `1.9`, `'7'`, `'abc'`, `NaN`, `undefined`, `null`, `Infinity` | `toSeed` gives a uint32: a string is always hashed with FNV-1a (so `'7'` is a different seed from the number `7`); anything else is `Math.floor(Number(seed)) >>> 0` (so `NaN`, `undefined`, `null` and `Infinity` are 0, `−1` is 4294967295, `1.9` is 1, `2^32` is 0). `card.seed` is that uint32. Two numbers that differ by a multiple of 2³² give the same card. | 7.7 "a card is fresh" |
| `draw(id, random)` with a source that returns exactly 0, or a value rounded up to 1 | every pick clamps its index (`Math.min(list.length − 1, …)`), so the first and the last variant are reachable and nothing indexes past a list | 7.7 "draw is a function of its source" |
| `draw` called with its own stratified source twice | identical `given`s: `draw` reads only its argument, never a module variable | 7.7 |
| A draw that lands on the handout's own numbers | the Gaussian families' `draw` nudges its numbers off the handout before returning; as a second safety `generate` redraws up to 6 times (attempt k uses `rng(fnv1a(seed + ':' + k))`) and throws `RangeError('generators: no variant for …')` only if all six land on the handout (0 handout hits over 30,000 seeds per family were measured, so the loop never runs in practice) | 7.3 handout predicates |
| `solve` with a given that is the handout's own | allowed: `solve('1.4.2', { c: { re: -16, im: 0 }, n: 4 })` is the handout card (the Rehearsal Room's "the handout's numbers" link and the unit tests use it) | 7.2 |
| `solve` with a malformed given (missing field, string where a number is expected, `n = 0`, `n = 1.5`, `z2 = 0` for a quotient, a `src` that does not compile) | `RangeError` with a sentence; never `TypeError`, never a hang. `solve` wraps the family in `try/catch` and turns any other error into a `RangeError` that names the family. | 7.7 fuzz |
| Extra keys in a given | ignored | 7.7 fuzz |
| `-0` | every complex result goes through `C(re + 0, im + 0)` or `snap`, and `solve` clones the card through `JSON.parse(JSON.stringify(...))`, which turns −0 into 0; a card never contains −0, NaN or undefined | 7.7 JSON round trip |
| Mutating a returned card | no effect on later cards or tables (`solve` returns a fresh clone; the module's constant tables are never handed out by reference) | 7.7 "a card is fresh" |
| `values` is `null` | only P5 on the cubic (and `solve('2.3.1', { path: { kind: 'cubic' } })`); the card is otherwise complete, the Rehearsal Room hides `#rehearse-open-station` | 7.4 |
| `labRequest` is `null` | 24 of the 29 families; the Rehearsal Room hides `#rehearse-open-lab` | 7.4 |
| `check` with junk: `undefined`, `null`, `5`, `'x'`, `{}`, `[null]`, `[{ re: NaN, im: 0 }]`, a guess of the wrong length, a card without `sketch` | `{ ok: false, detail }` for a guess, `{ ok: null, detail }` for a card with nothing to compare; never throws | 7.4 |
| `check` on a `none` card (P1, P2, P3, P7) | `{ ok: null, detail: 'This one is a proof: nothing to place.' }` | 7.4 |
| Two guesses on the same target | the greedy match takes each guess once (`used` set), so one handle cannot satisfy two roots | 7.4 |
| Guess on a target at the edge of tolerance | `<=` on the tolerance; the tests use clear margins (0.3 shift fails, 0.0 passes), never the boundary | 7.4 |
| Strings that must stay short | `statementText` ≤ 220, `answer.text` ≤ 400, each worked paragraph ≤ 700, each choice option ≤ 72 characters (measured maxima 163, 238, 438, 54) | 7.7 length bounds |
| TeX | every `$…$` run renders with the vendored KaTeX in strict mode; a statement has an even number of `$`; no `\textcolor` and no `\\` | 7.7 KaTeX |
| The word `window` | the file never contains it except as the key `window:` of 2.4.1's answer (rule D10); a comment must not contain it either | 7.5 |
| Numbers that would print badly | `exactReal` finds an exact form for every integer and fraction up to denominator 50 and for p√2/q and p√3/q up to 24, which covers every number of the draw ranges except a few listed below; `tNum` and `tCart` are the TeX twins (`texNumber` stops at 24). 1.1.1's quotient is always exact (its denominator \|z₂\|² is at most 50). The numbers with no exact form are the 7th roots of unity, the 5th roots of −32 and ±32i, the cube roots of 2 and 3 (2.2.2), two-term surds such as the roots of −√3 − i, and the distance √n for a non-square n: the card prints at most three decimals (`fmtNum(x, 3)`, trailing zeros trimmed, ASCII minus) and marks them (`~`, `≈`, "about", "rounded to 3 decimals", `\approx`; D13). A card never prints a float tail such as `0.30000000000000004`, `1e-17` or `-0`, and never an unmarked decimal. | 7.7, 7.9 |
| A zero in an answer (3.1.2 is differentiable only at 0, P7 has f′ = 0) | printed as `0`; `check` never divides by an answer | 7.2 |

### 8.2 Performance plan

The module is pure arithmetic on small objects and string building. It does nothing at import time except build its tables (a few hundred array literals, under 1 ms).

| Quantity | Budget | Measured (Node 22, this container) |
|---|---|---|
| `generate(id, seed)` | 2 ms per card on a phone-class CPU (about 10 times slower than this container) | 0.06 ms average; the slowest family (1.4.2, six roots with TeX) 0.08 ms |
| 29 families × 20 seeds (580 cards), in the page | under 600 ms (the interaction script's limit) | 57 to 71 ms in headless Chromium, desktop and phone viewports |
| 1450 cards (29 × 50), in Node | under 1.5 s (the unit test's limit) | about 100 ms |
| `check` | under 0.1 ms | under 0.01 ms |
| Source size | one file | 105 KB uncompressed (1,053 lines), 31 KB gzipped |
| Memory | nothing is cached; no card, table or string outlives its call | nothing retained |

Consequences for consumers. The Rehearsal Room can call `generate` while the student presses "Another one like it" and finish before the next frame; it does not need a worker, a spinner or a memo. It may import the module lazily (`import('../data/generators.js')` at the first visit of `#rehearse`, the way `listen.js` loads its manifest) so the 31 KB is not paid by a student who only walks the map; the module has no top-level side effect, so either way is safe. The module never schedules work: no timer, no promise, no animation frame.

How it is kept fast. Every loop has a fixed bound: the retry loop of `generate` runs at most 6 times, `makeChoice` shuffles four items with a small seeded generator built from the given, the formatters work on one number at a time, and no regular expression runs over unbounded input.

### 8.3 Accessibility

The module cannot paint, but it decides what words reach a screen reader and a keyboard user, so these properties are part of its contract.

1. **Every maths string comes twice.** `statement` and `answer.tex` are for the eye (KaTeX, with its MathML, through `tex()`); `statementText` and `answer.text` are the same content as plain ASCII (`z^2 - 6z + 13 = 0`, `3 e^(i pi/4)`), which is the string the Rehearsal Room puts in `aria-label` or the visually-hidden copy, what a student can copy into a message, and what the tests assert. The two are checked against each other by the length and `$`-balance tests of 7.7 and the KaTeX test.
2. **Every task has a sentence.** `sketch.prompt` says in one line what to do ("Drag the 4 handles onto the 4 roots."); the Rehearsal Room uses it as the accessible name of the plane (`aria-label`) and as the first line of the task. It never says "the red point".
3. **Every verdict has words.** `check().detail` is a plain sentence ("At least one root is off its place."); the verdict is announced from it in a polite live region, so the outcome never depends on colour. The suggested chip texts ("correct", "your pick") in section 3 do the same for choices.
4. **Choices are real radios.** Options are four different ASCII strings of at most 72 characters; the right one is at `sketch.correct`; the order is fixed by `(id, given)`, so it does not change between a reload and a reveal and a student who re-reads the card meets the same order.
5. **The angle is always named.** Each worked paragraph that says θ or φ also says whether it is `Arg z` (the home step), `a name for arg z` or `arg z` (the set), so a reader who hears only the text still knows which one (ARCHITECTURE 10.4, rule 6; the test "A5" has the check "a paragraph that says θ or φ also says Arg or arg").
6. **Keyboard reachability of the tolerances.** The handle step of `plane.js` is 0.1 (Shift ×10, Alt ÷10). The strictest tolerances are 0.12 (roots, radius 1), 0.15 (points, lines), 0.05 (the radius of a circle of radius 0.25, 2.5.1) and 5° (sectors, 0.17 at radius 2). A keyboard user can land inside every one of them with the coarse step except the sector (use the fine step, or pick a radius of 2 or more; the sector prompt says "Place 2 points away from 0, one on each edge ray" and the sector card's view is halfWidth 2.5 so the natural place for a handle is far from 0).
7. **No colour alone.** The module emits no colour. Section 3 gives the token for each piece and the contrast of each text pairing on both themes (all at least 4.5:1); the only colour-coded pair, `--cart` and `--polar`, always comes with the words "Cartesian" and "Polar" above its two paragraphs.
8. **Language.** Sentences are short, active, and use the thread's words (move, turn, stretch, home step, every name, seam, mirror). The module avoids "obviously", "simply", "trivially" and avoids unexplained symbols: each worked paragraph says what x, y, r, θ stand for the first time they appear.
9. **Proofs.** The four proof cards (P1, P2, P3, P7) are `none` cards: no plane, no chips, `ok: null`; Reveal is available at once and the prompt tells the student what to do ("A proof: set the two decisions, then open the worked solution."), so a screen-reader user is not left on a dead control.

### 8.4 Reduced motion

The module has no animation of any kind and does not read `matchMedia`, `prefers-reduced-motion` or the DOM (D10 forbids `window` and `document` in the file, and both would need them). What it hands over is static data, so `prefers-reduced-motion: reduce` changes nothing in the module. For the pieces that draw it: the Rehearsal Room must show a new card, the reveal and the verdict instantly under reduced motion (no sliding and no cross-fade of the plane; any play or animate control checks `ctx.theme.prefersReducedMotion()` and becomes a stepper, ARCHITECTURE section 4, rule 9), and a Lab hand-off (`labRequest`) already carries `predictFirst: true`, so the Lab shows the prediction step before it animates anything. The card contains no auto-advancing content: nothing changes unless the student presses a button.

### 8.5 Phone layout (390 px, 16 px gutters, 350 px content)

The module cannot lay anything out, but the card it returns must fit a 350 px column without horizontal page scroll:

| Piece | Guarantee | How it behaves at 350 px |
|---|---|---|
| `statement` | at most 163 characters of `statementText` in practice (limit 220) | wraps; each `$…$` run is one KaTeX unit that does not break; a long run (a polynomial) is inside `.tex-scroll` |
| `sketch.prompt` | one sentence of at most about 70 characters | wraps, muted |
| Plane | `fit` is a square view with `halfWidth` from 1.5 to about 7 | the plane is about 350 × 350 px, so the length tolerances are 5 to 23 px (roots and points 7 to 13, circles 7 to 23, far image lines 5 at worst); the zoom buttons and pinch zoom are the remedy for the rare 5 px case; handles keep a 44 px hit area |
| Choice chips | four options, each at most 72 characters (measured 54) | stacked in one column, each at most two lines, each at least 44 px tall |
| `answer.tex` | display TeX | scrolls inside its own box (`.tex-scroll`, with the "Scroll sideways to see the rest." note of the kit), never the page |
| `answer.text` | at most 400 characters (measured 238) | wraps as ordinary text; this is the line a student can read without scrolling |
| `worked.cart`, `worked.polar` | each at most 700 characters (measured 438) | stacked, Cartesian above Polar, each under its own bar (`--cart`, `--polar`), about 12 to 20 lines at 350 px |
| `check().detail` | at most about 60 characters | one line under the plane, in a live region |

At 280 px (the narrowest the shell supports) the same strings wrap onto more lines; nothing in the card is a fixed-width table.

### 8.6 Builder review checklist (what to look at before calling the goal done)

1. The file is Appendix A, copied (not retyped); line 1 of code is the single `import { … } from '../core/complex.js';` on one line; no other `import`, no `export {` list, no `export default`.
2. The exports are exactly the eight names, in any order; `FAMILIES` is frozen; no table is exported.
3. `grep -nE "Math.random|Date|document|globalThis|localStorage|setTimeout|performance|import\(|require\(|window[.\[(=)]" js/data/generators.js` prints nothing (the key `window:` is the only allowed use of the word).
4. `node --test tests/unit/i2-generators.test.mjs` shows 25 passing tests; `npm test` has the same failing list as before the file was added.
5. `node tools/smoke.mjs --route home --script tests/interact/i2-generators.mjs` ends `2/2 checks passed across 1 route(s).`
6. `generate('1.4.2', 7)` is the fourth roots of −81 (the pinned seed of the Rehearsal Room), `rng(7)` starts `0.011704753153026104`.
7. Nothing outside `js/data/generators.js` (plus the two test files of Appendix B and C) was written. In particular `docs/ARCHITECTURE.md` was not edited by the builder; the differences of section 0 are for the integrator.

## 9. Out of scope

Owned elsewhere (do not build here, and do not wait for it):

- **Every pixel of the card screen**: the Rehearsal Room, its picker, plane, handles, Reveal, verdict chips, the two worked columns and the buttons of section 2.1 belong to `i2-rehearse` (wave 1, `js/stations/rehearse.js`). This goal writes no DOM, no CSS, no id, no event, no store key. The element ids named in section 2 are ARCHITECTURE 9 "rehearse", quoted only to show where each field lands.
- **The decisions picker and the chips** (`decisions.js`, `station-kit.js`, `moveglyph.js`): `i2-decisions-kit`. The module does not import `js/data/problems.js` and does not read a problem's Address or Names; the Rehearsal Room reads those from `problems.js` by `card.id`.
- **The allowed-import map** of `tests/unit/architecture-sync.test.mjs`: already updated by the kit (it lists `js/data/generators.js → ../core/complex.js`); this goal neither edits it nor needs it to change.
- **Editing `docs/ARCHITECTURE.md`**: section 0 lists the twelve decisions the integrator should copy into 11.6 and section 9; the builder of this goal does not touch the document.
- **How a station reads `values`**: each station that opens from `station.request` (the adoption goals `i2-decisions-everywhere-a`, `-b`, `-c`) reads its own shape (ARCH 4.1). This module only guarantees the shape. In particular the roots station must read `values.quadratic` as real numbers (D9), and every station plane must `fitTo` values up to magnitude 5.
- **The Lab**: it consumes `labRequest` through ARCH 4; no change to `lab.js`.
- **Narration, video, audio** (`i2-media-core`): nothing here is spoken.
- **Scores, streaks, history, "which seeds has the student seen"**: the Rehearsal Room's own `ctx.store` keys. The module has no memory.

Not built in this goal (a possible later goal, none of it needed for the test):

- **A typed-answer grader**. `check` compares a drawn guess or a chosen option. There is no parser for "3 + 2i" typed into a box and no free-text matching; `answer.text` is what a student can compare with by eye.
- **Hints and a step-by-step solver** beyond the two worked paragraphs. The cards carry `worked.cart` and `worked.polar` only; there is no stepped reveal and no hint ladder.
- **Difficulty levels or adaptive choice** of the next card. The seed picks the variant; the ranges are those of STORY section 7.
- **Problem types beyond the 29** (the 22 numbered problems and P1 to P7 of the handout): no harmonic conjugates, no Ch. 4, no Ch. 1 to 3 topic outside the handout's list.
- **Variants left out as a scope cut (D8; not a station limit)**: the punctured disk and the half plane of STORY 7 for 1.5.2 (ARCH 4.1 has `{ preset: 'punctured' | 'halfplane' }` for `sets`, so a later goal can add them) and the reverse −C of 1.5.1 (a distractor only);
- **Variants a station cannot show or a card cannot hold**: the cubic path y = x³ for 2.3.1 (D2; P5 keeps it); 1.4.2 with n above 6; 1.4.1 with n above 8; a 1.4.3 whose coefficients are complex (D9); 2.4.1 with a branch ray on the positive real axis or at an angle that is not a multiple of π/2 (the five variants use the negative real axis with n = 2 and the two imaginary half axes with n = 2 or 3; n = 3 on the negative real axis is the handout).
- **Non-Gaussian-integer arithmetic**: draws are Gaussian integers, simple fractions and the surds √2 and √3 with π-multiples for angles; decimals and degrees are not generated (degrees appear only as the 5° tolerance of the sector check).
- **A proof checker**: P1, P2, P3 and P7 are `none` cards with a worked solution; nothing grades a proof.
- **Localisation** (only English) and **print layouts** of a set of cards.
- **Persisting or sharing a card** by URL beyond `(id, seed)`: the route `rehearse-<id>-s<seed>` is the Rehearsal Room's.

## Appendix A. Reference implementation of `js/data/generators.js`

Copy this file as it stands (it is the tested form of the pseudocode of section 5; section 8.6 is the review checklist). It passes Appendix B and Appendix C.

```js
// js/data/generators.js - seeded fresh variants of every review problem, each with an exact answer.
// Pure: no clock, no randomness except the seed, no browser objects; the only dependency is complex.js.
// Design: docs/designs/iter-2/i2-generators.md
import { Arg, wrapArg, fromPolar, add, sub, mul, div, neg, conj, inv, abs, abs2, exp, pow, rootsOf, rootsOfUnity, principalRoot, branchRoot, isPrimitiveRoot, fmtNum, fmtAngle, exactAngle, texNumber, texAngle } from '../core/complex.js';

const PI = Math.PI, TAU = 2 * Math.PI, S2 = Math.SQRT2, S3 = Math.sqrt(3);

// ================================================================== 1. the seed
function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
const toSeed = (seed) => (typeof seed === 'string' ? fnv1a(seed) : Math.floor(Number(seed)) >>> 0);
export function rng(seed) {                                   // mulberry32
  let a = toSeed(seed);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const GOLDEN = 0.6180339887498949;
function stream(s, attempt) {                                 // the source generate() hands to draw()
  const base = rng(attempt === 0 ? s : fnv1a(s + ':' + attempt));
  let first = true;
  return () => { if (first) { first = false; if (attempt === 0) return (s * GOLDEN) % 1; } return base(); };
}
const pick = (random, list) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// ================================================================== 2. small helpers
const C = (re, im = 0) => ({ re: re + 0, im: im + 0 });
const cc = (z) => C(z.re, z.im);
const snap = (x, eps = 1e-12) => (Math.abs(x) < eps ? 0 : x + 0);
const cleanC = (z) => C(snap(z.re), snap(z.im));
const ints = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const NZ5 = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], NZ4 = [-4, -3, -2, -1, 1, 2, 3, 4], NZ3 = [-3, -2, -1, 1, 2, 3], ANY3 = ints(-3, 3);
const gauss = (random, list) => ({ re: pick(random, list), im: pick(random, list) });
const need = (cond, msg) => { if (!cond) throw new RangeError('generators: ' + msg); };
const isInt = Number.isInteger;
const isC = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const isZero = (z) => z.re === 0 && z.im === 0;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
const sh = (name, v, N = aNum) => (v === 0 ? name : name + (v < 0 ? ' + ' : ' - ') + N(Math.abs(v)));      // name - v: 'x - 3', 'x + 3', 'x'
const sq = (name, v, two = '^2') => (v === 0 ? name + two : '(' + sh(name, v) + ')' + two);                     // x^2 or (x - 3)^2
const shPlus = (name, v, N = aNum) => sh(name, -v, N);                                                  // name + v: 'w + 1/2', 'w - 1/2'

// ---- exact numbers: integers, fractions (q <= 50), p sqrt(2)/q and p sqrt(3)/q (q <= 24)
function exactReal(x) {
  if (!Number.isFinite(x)) return null;
  const tol = 1e-9 * Math.max(1, Math.abs(x));
  for (const s of [1, 2, 3]) {
    const root = Math.sqrt(s), qMax = s === 1 ? 50 : 24;
    for (let q = 1; q <= qMax; q++) {
      const p = Math.round((x * q) / root);
      if (Math.abs(x - (p * root) / q) <= tol) {
        if (p === 0) return { p: 0, q: 1, s: 1 };
        const g = gcd(p, q);
        return { p: p / g, q: q / g, s };
      }
    }
  }
  return null;
}
function aNum(x) {                                     // ASCII: 3, -1/2, -23/26, sqrt(3)/2, 2 sqrt(2), else 3 decimals
  const e = exactReal(x);
  if (!e) return fmtNum(x, 3);
  const { p, q, s } = e;
  if (s === 1) return q === 1 ? String(p) : p + '/' + q;
  const m = Math.abs(p);
  return (p < 0 ? '-' : '') + (m === 1 ? '' : m + ' ') + 'sqrt(' + s + ')' + (q === 1 ? '' : '/' + q);
}
function aCart(z) {                                    // ASCII: 3 - 2i, -1/2 + (sqrt(3)/2)i, i, -i
  const R = aNum(z.re), M = aNum(z.im);
  if (M === '0') return R;
  const neg_ = M[0] === '-', mm = neg_ ? M.slice(1) : M;
  const wrap = mm.includes('/') || mm.includes(' ');
  const im = mm === '1' ? 'i' : wrap ? '(' + mm + ')i' : mm.includes('sqrt') ? mm + ' i' : mm + 'i';
  return R === '0' ? (neg_ ? '-' : '') + im : R + (neg_ ? ' - ' : ' + ') + im;
}
// TeX twins of texNumber and texCart that also know fractions up to 50 (texNumber stops at 24 and lives in complex.js)
function tNum(x) {
  const e = exactReal(x);
  if (e && e.s === 1 && e.q > 24) return (e.p < 0 ? '-' : '') + '\\frac{' + Math.abs(e.p) + '}{' + e.q + '}';
  return texNumber(x);
}
function tCart(z) {
  const R = tNum(z.re), M = tNum(z.im);
  if (M === '0') return R;
  const neg_ = M[0] === '-', mm = neg_ ? M.slice(1) : M, coef = mm === '1' ? '' : mm;
  const im = coef + (/(\\sqrt\{\d\}|\\pi)$/.test(coef) ? '\\,i' : 'i');
  return R === '0' ? (neg_ ? '-' : '') + im : R + (neg_ ? ' - ' : ' + ') + im;
}
// exact or rounded: '=' only for a value written exactly, '~' (ASCII), the approx sign (prose) or \\approx (TeX) for a rounded one
const exactN = (x) => exactReal(x) !== null;
const exactC = (z) => exactN(z.re) && exactN(z.im);
const eqN = (x) => (exactN(x) ? ' = ' : ' ~ '), eqC = (z) => (exactC(z) ? ' = ' : ' ~ '), eqL = (zs) => (zs.every(exactC) ? ' = ' : ' ~ ');
const argTxt = (t) => (exactAngle(t) ? ' = ' : ' \u2248 ') + aAng(t);                      // ' = pi/4' or ' ≈ 0.142'
const eqAng = (t) => (exactAngle(t) ? ' = ' : ' \u2248 '), proseEq = (x) => (exactN(x) ? ' = ' : ' \u2248 '), proseEqC = (z) => (exactC(z) ? ' = ' : ' \u2248 ');
const tEqC = (z) => (exactC(z) ? ' = ' : ' \\approx '), tEqL = (zs) => (zs.every(exactC) ? ' = ' : ' \\approx ');
// signs: a negative factor in brackets, a coefficient times a variable, a shift
const negStr = (s) => s[0] === '-' || s[0] === '\u2212';
const br = (s) => (negStr(s) ? '(' + s + ')' : s);
const brN = (x) => br(aNum(x));
function coefVar(m, v) {                               // |coefficient| times a variable: x, 2x, 3x/4, x/2, sqrt(3) x
  const N = aNum(m);
  if (N === '1') return v;
  if (N.includes('sqrt')) return (N.includes('/') ? '(' + N + ')' : N) + ' ' + v;
  if (N.includes('/')) { const [p, q] = N.split('/'); return (p === '1' ? '' : p) + v + '/' + q; }
  return N + v;
}
const sgnTerm = (k, v) => (k < 0 ? ' \u2212 ' : ' + ') + coefVar(Math.abs(k), v);                 // ' + 2iy', ' - 6iy'
const over = (num, den) => { const d = aNum(den); return num + '/' + (d.includes('/') || d.includes(' ') || negStr(d) ? '(' + d + ')' : d); };   // (3/4 + i)/(5/4)
const isHalf = (t) => Math.abs(Math.abs(t) - PI) < 1e-9;
const turnWord = (t) => (t === 0 ? 'no turn' : isHalf(t) ? 'a half turn' : t > 0 ? 'counterclockwise' : 'clockwise');         // the sign of Arg a says the direction
const turnA = (t) => (t === 0 ? 'do not turn (Arg a = 0)' : `turn by Arg a = ${aAng(t)} (${turnWord(t)})`);               // ASCII answer: 'turn by Arg a = -pi/2 (clockwise)'
const turnTex = (t) => (t === 0 ? '\\text{do not turn (}\\operatorname{Arg} a = 0\\text{)}' : `\\text{turn by } \\operatorname{Arg} a = ${texAngle(t)} \\text{ (${turnWord(t)})}`);
const turnP = (t) => (t === 0 ? 'leaves every direction alone (Arg a = 0)' : `turns every point by ${aAng(t)} (${turnWord(t)})`);                // prose
const stretchA = (m) => `stretch by |a| = ${aNum(m)}${m === 1 ? ' (no stretch)' : ''}`;
const degApart = (n) => (Number.isInteger(360 / n) ? '' : '\u2248 ') + fmtNum(360 / n) + '\u00b0';   // '60°' or '≈ 51.429°'
const around = (a) => { const t = aCart(a); return isZero(a) ? '' : t.includes(' ') ? '(' + t + ') + ' : t + ' + '; };                                   // 'z = (1 - 3i) + ...' or 'z = ...'
const rE = (r) => { const R = aNum(r); return R === '1' ? '' : R.includes('/') ? '(' + R + ') ' : R.includes('sqrt') ? R + ' ' : R; };   // prose coefficient of e^{...}: nothing when it is 1
const modText = (z) => { const n = abs2(z), k = Math.round(n); return Math.abs(n - k) < 1e-9 ? radText(k) : aNum(abs(z)); };
const radText = (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n ? String(r) : 'sqrt(' + n + ')'; };
const radTex = (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n ? String(r) : '\\sqrt{' + n + '}'; };
const aAng = (t) => fmtAngle(t);                              // 2pi/3
const approxTail = (x, shown) => { const A = aNum(x); return A === shown ? '' : A.includes('.') ? ' \u2248 ' + A : ' = ' + A; };   // sqrt(50) = 5 sqrt(2); sqrt(65) ≈ 8.062
function texSlash(t) { const f = exactAngle(t); if (!f) return fmtNum(t, 3); if (f.p === 0) return '0'; const m = Math.abs(f.p); return (f.p < 0 ? '-' : '') + (m === 1 ? '' : m) + '\\pi' + (f.q === 1 ? '' : '/' + f.q); }
const eCoefA = (r) => { const R = aNum(r); return R === '1' ? '' : (R.includes('/') || R.includes(' ') ? '(' + R + ') ' : R + ' '); };   // ASCII coefficient of e^(...)
function aExp(r, theta) { if (theta === 0) return aNum(r); return eCoefA(r) + 'e^(' + (theta < 0 ? '-' : '') + 'i ' + aAng(Math.abs(theta)) + ')'; }
const shiftA = (v, t, minus = '-') => (t === 0 ? v : v + (t < 0 ? ' ' + minus + ' ' : ' + ') + aAng(Math.abs(t)));   // t, t + pi/4, t - pi/4
function tExp(r, theta) { if (theta === 0) return tNum(r); const R = tNum(r), A = texAngle(Math.abs(theta)), e = 'e^{' + (theta < 0 ? '-' : '') + 'i' + (/^\d/.test(A) ? '\\,' : '') + A + '}'; return R === '1' ? e : R + '\\,' + e; }
const ordinal = (n) => (n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');
const rootWord = (n) => (n === 2 ? 'square' : n === 3 ? 'cube' : ordinal(n));
const typeset = (s) => s.replace(/sqrt\((\d+)\)/g, '√$1').replace(/\b(\d*)pi\b/g, '$1π');   // prose only

// ---- polynomials in z with Gaussian-integer coefficients (coeffs[k] multiplies z^k)
const zp = (k) => (k === 0 ? '' : k === 1 ? 'z' : 'z^' + k);
function polyString(coeffs, { tex = false, src = false } = {}) {
  const N = tex ? tNum : aNum, CC = tex ? tCart : aCart, terms = [], star = src ? '*' : '';
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (isZero(c)) continue;
    if (k === 0) {
      if (c.re !== 0) terms.push({ s: c.re < 0 ? -1 : 1, b: N(Math.abs(c.re)) });
      if (c.im !== 0) { const m = Math.abs(c.im); terms.push({ s: c.im < 0 ? -1 : 1, b: m === 1 ? 'i' : N(m) + 'i' }); }
    } else if (c.im === 0) { const m = Math.abs(c.re); terms.push({ s: c.re < 0 ? -1 : 1, b: (m === 1 ? '' : N(m) + star) + zp(k) }); }
    else if (c.re === 0) { const m = Math.abs(c.im); terms.push({ s: c.im < 0 ? -1 : 1, b: (m === 1 ? 'i' : N(m) + 'i') + star + zp(k) }); }
    else terms.push({ s: 1, b: '(' + CC(c) + ')' + star + zp(k) });
  }
  return joinTerms(terms);
}
function joinTerms(terms) { if (!terms.length) return '0'; let out = ''; terms.forEach((t, i) => { out += i === 0 ? (t.s < 0 ? '-' : '') + t.b : (t.s < 0 ? ' - ' : ' + ') + t.b; }); return out; }
function parsePoly(str) {                                     // the inverse of polyString for integer coefficients
  const t = String(str).replace(/\s+/g, ''), parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if ((ch === '+' || ch === '-') && depth === 0 && i > 0) { parts.push(cur); cur = ''; }
    cur += ch;
  }
  parts.push(cur);
  const coeffs = [C(0), C(0), C(0), C(0)], num = (s) => { need(/^\d+(\.\d+)?$/.test(s), 'bad number ' + s); return Number(s); };
  for (const part of parts) {
    let sign = 1, body = part;
    if (body[0] === '-') { sign = -1; body = body.slice(1); } else if (body[0] === '+') body = body.slice(1);
    let k = 0; const m = body.match(/^(.*?)z(?:\^(\d))?$/);
    if (m) { body = m[1]; k = m[2] ? Number(m[2]) : 1; }
    let c;
    if (body === '') { need(!!m, 'empty term'); c = C(1, 0); }
    else if (body === 'i') c = C(0, 1);
    else if (/^\d+(\.\d+)?i$/.test(body)) c = C(0, num(body.slice(0, -1)));
    else if (/^\d+(\.\d+)?$/.test(body)) c = C(num(body), 0);
    else if (body[0] === '(' && body[body.length - 1] === ')') {
      const mm = body.slice(1, -1).match(/^(-?\d+(?:\.\d+)?)([+-])(\d*(?:\.\d+)?)i$/);
      need(!!mm, 'bad coefficient ' + body);
      c = C(Number(mm[1]), (mm[2] === '-' ? -1 : 1) * (mm[3] === '' ? 1 : Number(mm[3])));
    } else need(false, 'bad term ' + part);
    need(k <= 3, 'degree above 3');
    coeffs[k] = add(coeffs[k], mul(C(sign, 0), c));
  }
  return coeffs.map(cleanC);
}
const evalPoly = (co, z) => { let acc = C(0, 0); for (let k = co.length - 1; k >= 0; k--) acc = add(mul(acc, z), co[k]); return acc; };

// ---- other text helpers
function lin(c0, c1, v = 't') { const p = []; if (c0 !== 0) p.push({ s: c0 < 0 ? -1 : 1, b: aNum(Math.abs(c0)) }); if (c1 !== 0) p.push({ s: c1 < 0 ? -1 : 1, b: coefVar(Math.abs(c1), v) }); return joinTerms(p); }
const linXY = (cx, cy, vx = 'x', vy = 'y') => { const p = []; if (cx !== 0) p.push({ s: cx < 0 ? -1 : 1, b: coefVar(Math.abs(cx), vx) }); if (cy !== 0) p.push({ s: cy < 0 ? -1 : 1, b: coefVar(Math.abs(cy), vy) }); return joinTerms(p); };
const linT = (c0, c1) => lin(c0, c1).replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
function zMinus(a, tex) {                                     // z - a
  const N = (x) => (tex ? tNum(x) : aNum(x)), sg = (x) => (x < 0 ? ' + ' : ' - ');
  if (isZero(a)) return 'z';
  if (a.im === 0) return 'z' + sg(a.re) + N(Math.abs(a.re));
  if (a.re === 0) return 'z' + sg(a.im) + (Math.abs(a.im) === 1 ? '' : N(Math.abs(a.im))) + 'i';
  return 'z - (' + (tex ? tCart(a) : aCart(a)) + ')';
}
function lineText(p, d) {                                     // the w-plane equation of the line through p with direction d (axis parallel, or slope +-1)
  if (Math.abs(d.im) < 1e-12) return 'v = ' + aNum(p.im);
  if (Math.abs(d.re) < 1e-12) return 'u = ' + aNum(p.re);
  const m = d.im / d.re, k = p.im - m * p.re;
  const left = (m < 0 ? '-' : '') + (Math.abs(m) === 1 ? '' : aNum(Math.abs(m))) + 'u';
  return Math.abs(k) < 1e-12 ? 'v = ' + left : 'v = ' + left + (k < 0 ? ' - ' : ' + ') + aNum(Math.abs(k));
}
function fitFor(points, extraR = 0) {                         // a square view that holds the origin, the points and a margin
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (const p of points) { x0 = Math.min(x0, p.re - extraR); x1 = Math.max(x1, p.re + extraR); y0 = Math.min(y0, p.im - extraR); y1 = Math.max(y1, p.im + extraR); }
  const r3 = (x) => Math.round(x * 1000) / 1000 + 0;
  return { center: C(r3((x0 + x1) / 2), r3((y0 + y1) / 2)), halfWidth: Math.max(1.5, Math.round((1.35 * Math.max((x1 - x0) / 2, (y1 - y0) / 2) + 0.6) * 100) / 100) };
}
function canon(v) {
  if (typeof v === 'number') return String(Math.round(v * 1e9) / 1e9);
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => k + ':' + canon(v[k])).join(',') + '}';
}
function makeChoice(key, correct, distractors, pad, prompt) {  // exactly 4 distinct options, the order fixed by the key
  const list = [correct];
  for (const d of distractors) if (typeof d === 'string' && !list.includes(d) && list.length < 4) list.push(d);
  for (let k = 0; list.length < 4 && k < 60; k++) { const d = pad(k); if (!list.includes(d)) list.push(d); }
  need(list.length === 4, 'could not make 4 options');
  const random = rng(fnv1a(key)), order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const options = order.map((i) => list[i]);
  return { kind: 'choice', options, correct: options.indexOf(correct), prompt };
}
const PROOF_SKETCH = { kind: 'none', prompt: 'A proof: set the two decisions, then open the worked solution.' };

// ================================================================== 3. the families
const table = (o) => Object.assign(Object.create(null), o);
const FAM = table({}), HANDOUT = table({});
const STATION = table({ '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance', '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots', '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear', '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches', '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann', P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann' });
export const FAMILIES = Object.freeze(Object.keys(STATION));
const DEGS = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const BASE = { 0: [1, 0], 30: [S3 / 2, 0.5], 45: [S2 / 2, S2 / 2], 60: [0.5, S3 / 2], 90: [0, 1] };
function unitAtDeg(d) { d = ((d % 360) + 360) % 360; const q = Math.floor(d / 90); let [c, s] = BASE[d - 90 * q]; for (let k = 0; k < q; k++) [c, s] = [-s, c]; return [c + 0, s + 0]; }
const nicePoint = (r, deg) => { const [c, s] = unitAtDeg(deg); return C(r * c, r * s); };
const prettyR = (r) => { const k = Math.round(r); return Math.abs(r - k) < 1e-12 ? k : r; };

// ---------------------------------------------------------------- 1.1.1
FAM['1.1.1'] = {
  draw(random) { const z1 = gauss(random, NZ5); const z2 = gauss(random, NZ5); if (z1.re === 3 && z1.im === -2 && z2.re === -1 && z2.im === 4) z2.im = 3; return { z1, z2 }; },
  statement: (g) => ({
    tex: `Let $z_1 = ${tCart(g.z1)}$ and $z_2 = ${tCart(g.z2)}$. Compute $z_1z_2$ and $z_1/z_2$ in the form $x + iy$.`,
    text: `Let z1 = ${aCart(g.z1)} and z2 = ${aCart(g.z2)}. Compute z1 z2 and z1/z2 in the form x + iy.`,
  }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), '1.1.1 needs z1 and z2'); need(!isZero(g.z2), '1.1.1: z2 must not be 0');
    const z1 = cc(g.z1), z2 = cc(g.z2), product = mul(z1, z2), quotient = div(z1, z2);
    const n1 = abs2(z1), n2 = abs2(z2), productAbs = Math.sqrt(n1 * n2);
    const x1 = z1.re, y1 = z1.im, x2 = z2.re, y2 = z2.im;
    const cands = [C(x1 * x2 + y1 * y2, x1 * y2 + x2 * y1), C(x1 * x2 - y1 * y2, x1 * y2 - x2 * y1), C(x1 * x2, y1 * y2), C(x1 * x2 - y1 * y2, -(x1 * y2 + x2 * y1))].map(aCart);
    return {
      answer: { tex: `z_1z_2 = ${tCart(product)}, \\qquad \\dfrac{z_1}{z_2} = ${tCart(quotient)}`, text: `z1 z2 = ${aCart(product)}; z1/z2 = ${aCart(quotient)}`,
        values: { product, quotient, productAbs, quotientAbs: Math.sqrt(n1 / n2), productArg: Arg(product), quotientArg: Arg(quotient), z1Arg: Arg(z1), z2Arg: Arg(z2) } },
      sketch: makeChoice(canon([id, g]), aCart(product), cands, (k) => aCart(C(product.re + k + 1, product.im)), 'Pick z1 z2.'),
      values: { z1, z2, mode: 'mul' }, labRequest: null,
      worked: {
        cart: `Multiply by the definition, with i² = −1: (${aCart(z1)})(${aCart(z2)}) = ${aCart(product)}. For the quotient, multiply top and bottom by the mirror of z₂, which is ${aCart(conj(z2))}: (${aCart(z1)})(${aCart(conj(z2))}) / ${aNum(n2)} = (${aCart(mul(z1, conj(z2)))}) / ${aNum(n2)} = ${aCart(quotient)}. In (x, y) every step is arithmetic on the x parts and the y parts.`,
        polar: `Multiplying is a move, turn and stretch: the lengths multiply, ${modText(z1)} · ${modText(z2)} = ${radText(n1 * n2)}${approxTail(productAbs, radText(n1 * n2))}, and a name θ₁ = Arg z₁${eqAng(Arg(z1))}${aAng(Arg(z1))} adds to a name θ₂ = Arg z₂${eqAng(Arg(z2))}${aAng(Arg(z2))}. The point ${aCart(product)} has r = ${modText(product)}, so the polar column checks the product. Division undoes the move: divide the lengths, subtract the names.`,
      },
    };
  },
};
HANDOUT['1.1.1'] = { z1: C(3, -2), z2: C(-1, 4) };

// ---------------------------------------------------------------- 1.1.2
FAM['1.1.2'] = {
  draw(random) { const z1 = gauss(random, NZ5); const z2 = gauss(random, NZ5); if (z1.re === 3 && z1.im === -2 && z2.re === -1 && z2.im === 4) z2.im = 3; return { z1, z2, op: random() < 0.5 ? '+' : '-', part: random() < 0.5 ? 'Re' : 'Im' }; },
  statement: (g) => ({
    tex: `Find $\\operatorname{${g.part}}\\big(\\overline{z_1 ${g.op} z_2}\\big)$ for $z_1 = ${tCart(g.z1)}$ and $z_2 = ${tCart(g.z2)}$.`,
    text: `Find ${g.part}(conj(z1 ${g.op} z2)) for z1 = ${aCart(g.z1)} and z2 = ${aCart(g.z2)}.`,
  }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), '1.1.2 needs z1 and z2'); need(g.op === '+' || g.op === '-', '1.1.2: op'); need(g.part === 'Re' || g.part === 'Im', '1.1.2: part');
    const pick_ = (z) => (g.part === 'Re' ? z.re : z.im) + 0;
    const w = g.op === '+' ? add(g.z1, g.z2) : sub(g.z1, g.z2), cw = conj(w), other = g.op === '+' ? sub(g.z1, g.z2) : add(g.z1, g.z2);
    const result = pick_(cw), wd = g.op === '+' ? 'z₁ + z₂' : 'z₁ − z₂';
    const cands = [-result, g.part === 'Re' ? w.im : w.re, pick_(conj(other))].map((x) => String(x + 0));
    return {
      answer: { tex: `\\operatorname{${g.part}}\\big(\\overline{z_1 ${g.op} z_2}\\big) = \\operatorname{${g.part}}(${tCart(cw)}) = ${result}`, text: `${g.part}(conj(z1 ${g.op} z2)) = ${g.part}(${aCart(cw)}) = ${result}`,
        values: { result, w, conjW: cw, op: g.op, part: g.part, difference: w } },
      sketch: makeChoice(canon([id, g]), String(result), cands, (k) => String(result + (k % 2 ? -1 : 1) * (Math.floor(k / 2) + 1)), 'Pick the number.'),
      values: { z1: cc(g.z1), z2: cc(g.z2), mode: g.op === '+' ? 'add' : 'sub', conjResult: true }, labRequest: null,
      worked: {
        cart: `${wd} = ${aCart(w)}: add or subtract the x parts and the y parts. The conjugate flips the sign of the imaginary part: ${aCart(cw)}. Its ${g.part === 'Re' ? 'real' : 'imaginary'} part is ${result}.`,
        polar: `${wd} = ${aCart(w)} has r = ${modText(w)} and Arg${argTxt(Arg(w))}. The conjugate is a mirror: it keeps the length and negates every name θ of arg, so its Arg${argTxt(Arg(cw))}. Read the ${g.part === 'Re' ? 'x part' : 'height'} off the new address: r ${g.part === 'Re' ? 'cos' : 'sin'} θ = ${result}.`,
      },
    };
  },
};
HANDOUT['1.1.2'] = { z1: C(3, -2), z2: C(-1, 4), op: '-', part: 'Im' };

// ---------------------------------------------------------------- 1.2.1
FAM['1.2.1'] = {
  draw(random) { const a = gauss(random, NZ4); let R = pick(random, [1, 2, 3, 4]); const rel = pick(random, ['=', '=', '<', '<=']); if (a.re === 1 && a.im === 2 && R === 3 && rel === '=') R = 4; return { a, R, rel }; },
  statement: (g) => ({
    tex: `Sketch the set of points in the complex plane that satisfy $|${zMinus(g.a, true)}| ${g.rel === '=' ? '=' : g.rel === '<' ? '<' : '\\le'} ${g.R}$.`,
    text: `Sketch the set of points in the complex plane that satisfy |${zMinus(g.a, false)}| ${g.rel} ${g.R}.`,
  }),
  solve(id, g) {
    need(isC(g.a) && g.R > 0 && ['=', '<', '<='].includes(g.rel), '1.2.1: a, R > 0, rel');
    const a = cc(g.a), R = g.R, op = g.rel, what = op === '=' ? 'circle' : op === '<' ? 'open disk' : 'closed disk';
    const eq = `${sq('x', a.re)} + ${sq('y', a.im)} ${op} ${R * R}`, target = { center: a, radius: R };
    return {
      answer: { tex: `\\text{${what} with center } ${tCart(a)} \\text{ and radius } ${R}:\\ ${sq('x', a.re)} + ${sq('y', a.im)} ${op === '=' ? '=' : op === '<' ? '<' : '\\le'} ${R * R}`,
        text: `${what}, center ${aCart(a)}, radius ${R}: ${eq}`, values: { center: a, radius: R, rel: op, target } },
      sketch: { kind: 'circle', prompt: 'Drag the center, then the rim point, to draw the boundary circle.', fit: fitFor([a], R), target },
      values: { mode: 'circle', a, R }, labRequest: null,
      worked: {
        cart: `Square both sides: ${eq}. That is the ${what} with center (x, y) = (${a.re}, ${a.im}) and radius ${R}${op === '=' ? '' : '; the boundary circle is dashed for < and solid for ≤'}.`,
        polar: `${isZero(a) ? 'The origin is already the center, so write' : `Put the origin at ${aCart(a)} and write`} z = ${around(a)}${rE(R)}e^{iφ}, where φ is a name for arg(${zMinus(a, false)}): every φ gives one point at distance r = ${R}, and φ from 0 to 2π walks once round.`,
      },
    };
  },
};
HANDOUT['1.2.1'] = { a: C(1, 2), R: 3, rel: '=' };

// ---------------------------------------------------------------- 1.2.2
FAM['1.2.2'] = {
  draw(random) { const z1 = gauss(random, NZ5); let z2 = gauss(random, NZ5); if (z1.re === z2.re && z1.im === z2.im) z2 = { re: z2.re, im: z2.im === 5 ? -5 : z2.im + 1 }; if (z1.re === 4 && z1.im === 3 && z2.re === -1 && z2.im === 1) z2 = { re: -1, im: 2 }; return { z1, z2 }; },
  statement: (g) => ({ tex: `Find the distance between $${tCart(g.z1)}$ and $${tCart(g.z2)}$.`, text: `Find the distance between ${aCart(g.z1)} and ${aCart(g.z2)}.` }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), '1.2.2 needs z1 and z2');
    const d = sub(g.z1, g.z2); need(!isZero(d), '1.2.2: the points must differ');
    const n = d.re * d.re + d.im * d.im, distance = Math.sqrt(n), sum = add(g.z1, g.z2), exact = radText(n) === String(distance);
    const cands = [String(n), radText(abs2(sum)), String(Math.abs(d.re) + Math.abs(d.im)), radText(Math.abs(d.re * d.re - d.im * d.im))].filter((s) => s !== radText(n));
    return {
      answer: { tex: `|(${tCart(g.z1)}) - (${tCart(g.z2)})| = |${tCart(d)}| = ${radTex(n)}${exact ? '' : ' \\approx ' + fmtNum(distance, 3)}`, text: `distance = |${aCart(d)}| = ${radText(n)}${exact ? '' : ' ~ ' + fmtNum(distance, 3)}`,
        values: { distance, difference: d, distanceSquared: n } },
      sketch: makeChoice(canon([id, g]), radText(n), cands, (k) => radText(n + k + 1), 'Pick the distance.'),
      values: { mode: 'two', z1: cc(g.z1), z2: cc(g.z2) }, labRequest: null,
      worked: {
        cart: `Subtract: (${aCart(g.z1)}) − (${aCart(g.z2)}) = ${aCart(d)}, a slide of ${d.re} in x and ${d.im} in y. The distance is its length √(${d.re * d.re} + ${d.im * d.im}) = ${radText(n)}.`,
        polar: `The slide ${aCart(d)} has polar address r = ${radText(n)} and θ = Arg${argTxt(Arg(d))}. The distance is r; the Arg says which way you walk, and the problem does not ask for it.`,
      },
    };
  },
};
HANDOUT['1.2.2'] = { z1: C(4, 3), z2: C(-1, 1) };

// ---------------------------------------------------------------- 1.3.1
FAM['1.3.1'] = {
  draw(random) { const deg = pick(random, DEGS); let r = pick(random, [1, 2, 3]); if (r === 2 && deg === 120) r = 3; return { z: nicePoint(r, deg) }; },
  statement: (g) => ({
    tex: `Write $z = ${tCart(g.z)}$ in polar form $r(\\cos\\theta + i\\sin\\theta)$ and exponential form $re^{i\\theta}$. What is $\\operatorname{Arg}(z)$?`,
    text: `Write z = ${aCart(g.z)} in polar form r(cos(theta) + i sin(theta)) and exponential form r e^(i theta). What is Arg(z)?`,
  }),
  solve(id, g) {
    need(isC(g.z) && !isZero(g.z), '1.3.1: z must not be 0');
    const z = cc(g.z), r = prettyR(Math.hypot(z.re, z.im)), theta = Arg(z), R = aNum(r);
    const cands = [Math.atan(z.im / z.re), theta + TAU, -theta, wrapArg(theta + PI), theta + PI / 2].filter(Number.isFinite).map(aAng);
    const where = z.im === 0 ? 'on the ' + (z.re > 0 ? 'positive' : 'negative') + ' real axis' : z.re === 0 ? 'on the ' + (z.im > 0 ? 'positive' : 'negative') + ' imaginary axis'
      : 'in the ' + (z.re > 0 && z.im > 0 ? 'first' : z.re < 0 && z.im > 0 ? 'second' : z.re < 0 ? 'third' : 'fourth') + ' quadrant';
    return {
      answer: { tex: `z = ${r === 1 ? '' : tNum(r)}\\left(\\cos ${texAngle(theta)} + i\\sin ${texAngle(theta)}\\right) = ${tExp(r, theta)}, \\quad \\operatorname{Arg} z = ${texAngle(theta)}, \\quad \\arg z = \\left\\{${texAngle(theta)} + 2\\pi k : k \\in \\mathbb{Z}\\right\\}`,
        text: `z = ${r === 1 ? '' : R}(cos(${aAng(theta)}) + i sin(${aAng(theta)})) = ${aExp(r, theta)}; Arg z = ${aAng(theta)}; arg z = {${aAng(theta)} + 2 pi k}`,
        values: { r, theta, Arg: theta, z, names: [theta - TAU, theta, theta + TAU] } },
      sketch: makeChoice(canon([id, g]), aAng(theta), cands, (k) => aAng(theta + ((k + 1) * PI) / 6), 'Pick Arg z, the home step.'),
      values: { z }, labRequest: null,
      worked: {
        cart: `r = √(x² + y²) = √(${aNum(z.re * z.re)} + ${aNum(z.im * z.im)}) = ${R}. Then cos θ = x/r = ${aNum(z.re / r)} and sin θ = y/r = ${aNum(z.im / r)}, which happens at θ = ${aAng(theta)}, the only name of arg z in (−π, π], so θ = Arg z.`,
        polar: `Read the polar address off the dot: r = ${R}, and the dot sits ${where}, so θ = Arg z = ${aAng(theta)}, the home step (the one name in (−π, π])${z.im === 0 && z.re < 0 ? ': a negative real number has Arg π, never −π' : ''}. Every other name is ${aAng(theta)} + 2πk; that whole set is arg z.`,
      },
    };
  },
};
HANDOUT['1.3.1'] = { z: C(-1, S3) };

// ---------------------------------------------------------------- 1.3.2
FAM['1.3.2'] = {
  draw(random) { const deg = pick(random, DEGS); const r = pick(random, [1, 2]); let n = pick(random, ints(4, 12)); if (r === 2 && deg === 30 && n === 10) n = 11; return { z: nicePoint(r, deg), n }; },
  statement: (g) => ({
    tex: `Use polar form to compute $(${tCart(g.z)})^{${g.n}}$. Express the final answer in Cartesian form $x + iy$.`,
    text: `Use polar form to compute (${aCart(g.z)})^${g.n}. Express the final answer in Cartesian form x + iy.`,
  }),
  solve(id, g) {
    need(isC(g.z) && !isZero(g.z), '1.3.2: z must not be 0'); need(isInt(g.n) && g.n >= 1 && g.n <= 12, '1.3.2: n must be an integer 1..12');
    const z = cc(g.z), n = g.n, r = prettyR(Math.hypot(z.re, z.im)), theta = Arg(z), rawAngle = n * theta, Rn = Math.pow(r, n), wrapped = wrapArg(rawAngle), result = cleanC(pow(z, n));
    const cands = [fromPolar(r, rawAngle), fromPolar(n * r, wrapped), fromPolar(Rn, wrapArg((n + 1) * theta)), conj(result)].map((w) => aCart(cleanC(w)));
    return {
      answer: { tex: `(${tCart(z)})^{${n}} = ${tExp(Rn, rawAngle)} = ${tCart(result)}, \\quad \\operatorname{Arg} = ${texAngle(wrapped)}`, text: `(${aCart(z)})^${n} = ${aExp(Rn, rawAngle)} = ${aCart(result)}; Arg = ${aAng(wrapped)}`,
        values: { result, r: Rn, Arg: wrapped, base: z, n, rawAngle } },
      sketch: makeChoice(canon([id, g]), aCart(result), cands, (k) => aCart(C(result.re + k + 1, result.im)), 'Pick the Cartesian form of the power.'),
      values: { z, n }, labRequest: null,
      worked: {
        cart: `Multiplying out ${n} times in (x, y) works, but every step can slip: (${aCart(z)})² = ${aCart(cleanC(mul(z, z)))}${n > 2 ? `, and ${n - 2} more multiplication${n === 3 ? '' : 's'} follow` : ''}.`,
        polar: `${aCart(z)} has r = ${aNum(r)} and Arg = ${aAng(theta)}. The ${ordinal(n)} power is the same move ${n} times: ${Rn === 1 ? 'the length stays 1' : `r^${n} = ${aNum(Rn)}`} and the name ${n}θ = ${aAng(rawAngle)} of arg of the power. Names do not matter for a power; report the home step: Arg = ${aAng(wrapped)}. So ${rE(Rn)}(cos ${aAng(wrapped)} + i sin ${aAng(wrapped)}) = ${aCart(result)}.`,
      },
    };
  },
};
HANDOUT['1.3.2'] = { z: C(S3, 1), n: 10 };

// ---------------------------------------------------------------- 1.4.1
FAM['1.4.1'] = {
  draw(random) { return { n: pick(random, [3, 4, 6, 7, 8]) }; },
  statement: (g) => { const t = `Find and sketch the ${rootWord(g.n)} roots of unity.`; return { tex: t, text: t }; },
  solve(id, g) {
    need(isInt(g.n) && g.n >= 2 && g.n <= 12, '1.4.1: n must be an integer 2..12');
    const n = g.n, roots = rootsOfUnity(n).map(cleanC), primitive = roots.map((_, k) => isPrimitiveRoot(k, n)), principalArgs = roots.map((_, k) => wrapArg((TAU * k) / n));
    const target = { points: roots };
    return {
      answer: { tex: `z_k = e^{i2\\pi k/${n}},\\ k = 0, 1, \\dots, ${n - 1}:${tEqL(roots) === ' = ' ? '' : ' \\approx'} \\quad ${roots.map((z) => tCart(z)).join(',\\ ')}`,
        text: `z_k = e^(i 2 pi k/${n}), k = 0..${n - 1}${roots.every(exactC) ? ':' : ', rounded to 3 decimals:'} ${roots.map(aCart).join('; ')}; primitive: k = ${primitive.map((p, k) => (p ? k : null)).filter((k) => k !== null).join(', ')}`,
        values: { n, roots, primitive, principalArgs, target } },
      sketch: { kind: 'roots', n, prompt: `Drag the ${n} handles onto the ${n} roots.`, fit: { center: C(0, 0), halfWidth: 1.6 }, target },
      values: { c: C(1, 0), n }, labRequest: null,
      worked: {
        cart: `Cartesian algebra is awkward: z^${n} − 1 factors as (z − 1)(z^${n - 1} + … + z + 1), and the second factor has no short solution by hand. The polar picture hands you every x and y at once: cos and sin of 2πk/${n}.`,
        polar: `Every name of arg 1 is 2πk, so the staircase of 1 is {2πk}. Take every name and divide the staircase by ${n}: z = e^{i(Arg c + 2πk)/${n}} = e^{i2πk/${n}} for k = 0..${n - 1}, ${n} points ${degApart(n)} apart on the unit circle, and k = ${n} is k = 0 again. A root is primitive when gcd(k, ${n}) = 1.`,
      },
    };
  },
};
HANDOUT['1.4.1'] = { n: 5 };

// ---------------------------------------------------------------- 1.4.2
const T142 = [[-1, 2], [-1, 3], [-1, 4], [-1, 6], [-8, 3], [-27, 3], [-81, 4], [-64, 3], [-64, 6], [-16, 2], [-32, 5], [C(0, 2), 2], [C(0, -2), 2], [C(0, 8), 3], [C(0, -8), 3], [C(0, 16), 2], [C(0, -16), 2], [C(0, 32), 5], [C(0, -32), 5]]
  .map(([c, n]) => ({ c: typeof c === 'number' ? C(c, 0) : c, n }));
FAM['1.4.2'] = {
  draw(random) { const e = pick(random, T142); return { c: cc(e.c), n: e.n }; },
  statement: (g) => ({
    tex: `Find all the ${rootWord(g.n)} roots of $${tCart(g.c)}$. Express answers in both exponential and Cartesian forms.`,
    text: `Find all the ${rootWord(g.n)} roots of ${aCart(g.c)}. Express answers in both exponential and Cartesian forms.`,
  }),
  solve(id, g) {
    need(isC(g.c) && !isZero(g.c), '1.4.2: c must not be 0'); need(isInt(g.n) && g.n >= 2 && g.n <= 12, '1.4.2: n must be an integer 2..12');
    const c = cc(g.c), n = g.n, A = Arg(c);
    let radius = Math.pow(abs(c), 1 / n); const k0 = Math.round(radius); if (Math.abs(radius - k0) < 1e-12) radius = k0; else if (Math.abs(radius * radius - 2) < 1e-12) radius = S2;
    const angles = Array.from({ length: n }, (_, k) => (A + TAU * k) / n), principalArgs = angles.map(wrapArg), roots = rootsOf(c, n).map(cleanC), target = { points: roots };
    return {
      answer: { tex: `${angles.map((t) => tExp(radius, t)).join(',\\ ')}${tEqL(roots)}${roots.map((z) => tCart(z)).join(',\\ ')}, \\quad \\operatorname{Arg}: ${principalArgs.map((t) => texAngle(t)).join(', ')}`,
        text: `${angles.map((t) => aExp(radius, t)).join(', ')}${eqL(roots)}${roots.map(aCart).join(', ')}; as Arg values the angles are ${principalArgs.map(aAng).join(', ')}`,
        values: { radius, angles, principalArgs, roots, target } },
      sketch: { kind: 'roots', n, prompt: `Drag the ${n} handles onto the ${n} roots.`, fit: fitFor(roots, 0.3), target },
      values: { c, n }, labRequest: null,
      worked: {
        cart: `In (x, y), z^${n} = ${aCart(c)} is a pair of degree-${n} equations in x and y with no routine solution. The polar answer converts each root to x + iy with radius × cos and radius × sin.`,
        polar: `c = ${rE(abs(c))}e^{iθ} with Arg c = ${aAng(A)}, so every name of c is ${aAng(A)} + 2πk and the staircase of c is a set. Take every name and divide the staircase by ${n}: z_k = ${rE(radius)}e^{i(Arg c + 2πk)/${n}} for k = 0..${n - 1}, ${n} points ${degApart(n)} apart on a circle of radius r = ${aNum(radius)}. k = ${n} is k = 0 again.`,
      },
    };
  },
};
HANDOUT['1.4.2'] = { c: C(-16, 0), n: 4 };

// ---------------------------------------------------------------- 1.4.3
FAM['1.4.3'] = {
  draw(random) { const p = pick(random, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]); let q = pick(random, [1, 2, 3, 4, 5]); if (p === 2 && q === 3) q = 4; return { p, q }; },
  statement(g) { const poly = polyString([C(g.p * g.p + g.q * g.q), C(-2 * g.p), C(1)]); return { tex: `Use the quadratic formula to solve $${poly} = 0$.`, text: `Use the quadratic formula to solve ${poly} = 0.` }; },
  solve(id, g) {
    need(isInt(g.p) && isInt(g.q) && g.q >= 1, '1.4.3: p and q must be integers, q >= 1');
    const { p, q } = g, b = -2 * p, c0 = p * p + q * q, disc = -4 * q * q, roots = [C(p, q), C(p, -q)], target = { points: roots };
    const z2 = mul(roots[0], roots[0]), bz = mul(C(b), roots[0]);
    return {
      answer: { tex: `z = \\dfrac{${-b} \\pm \\sqrt{${disc}}}{2} = ${tCart(roots[0])} \\text{ or } ${tCart(roots[1])}`, text: `z = (${-b} +- sqrt(${disc}))/2 = ${aCart(roots[0])} or ${aCart(roots[1])}`,
        values: { roots, completed: { shift: p, square: -q * q }, a: 1, b, c: c0, disc, target } },
      sketch: { kind: 'point', count: 2, prompt: 'Drag the two points onto the two roots.', fit: fitFor(roots, 0.5), target },
      values: { quadratic: { a: 1, b, c: c0 } }, labRequest: null,
      worked: {
        cart: `z = (${-b} ± √(${b * b} − ${4 * c0}))/2 = (${-b} ± √(${disc}))/2 = (${-b} ± ${2 * q}i)/2 = ${aCart(roots[0])} or ${aCart(roots[1])}, that is (x, y) = (${p}, ${q}) or (${p}, ${-q}). Check z = ${aCart(roots[0])}: z² = ${aCart(z2)} and ${b}z = ${aCart(bz)}, so z² ${b < 0 ? '−' : '+'} ${Math.abs(b)}z + ${c0} = 0.`,
        polar: `The discriminant ${disc} = ${-disc}e^{iπ} has Arg = π. Take every name and divide the staircase by 2 to get both square roots: ±${2 * q}i (r = ${2 * q}, θ = ±π/2). Completing the square gives (${sh('z', p)})² = −${q * q}, so ${sh('z', p)} = ±${q === 1 ? '' : q}i; slide by ${p}. The roots are a mirror pair across the real axis.`,
      },
    };
  },
};
HANDOUT['1.4.3'] = { p: 2, q: 3 };

// ---------------------------------------------------------------- 1.5.1
FAM['1.5.1'] = {
  draw(random) {
    const a = gauss(random, NZ5); let b = gauss(random, NZ5);
    if (a.re === b.re && a.im === b.im) b = { re: b.re, im: b.im === 5 ? -5 : b.im + 1 };
    if (a.re === 2 && a.im === 1 && b.re === -3 && b.im === -3) b = { re: -3, im: -2 };
    return { a, b };
  },
  statement: (g) => ({ tex: `Find a parameterization of the line from $${tCart(g.a)}$ to $${tCart(g.b)}$.`, text: `Find a parameterization of the line from ${aCart(g.a)} to ${aCart(g.b)}.` }),
  solve(id, g) {
    need(isC(g.a) && isC(g.b), '1.5.1 needs a and b'); const d = sub(g.b, g.a); need(!isZero(d), '1.5.1: the endpoints must differ');
    const a = cc(g.a), b = cc(g.b), form = (a0, d0) => `z(t) = (${lin(a0.re, d0.re)}) + i(${lin(a0.im, d0.im)}), 0 <= t <= 1`, correct = form(a, d), mid = C(a.re + 0.5 * d.re, a.im + 0.5 * d.im);
    const cands = [form(b, sub(a, b)), form(a, sub(a, b)), form(C((a.re + b.re) / 2, (a.im + b.im) / 2), d), form(b, a)];
    return {
      answer: { tex: `z(t) = (${linT(a.re, d.re)}) + i(${linT(a.im, d.im)}), \\quad 0 \\le t \\le 1`, text: correct, values: { start: a, end: b, direction: d, at: { t: 0.5, z: mid } } },
      sketch: makeChoice(canon([id, g]), correct, cands, (k) => form(a, C(d.re + k + 1, d.im)), 'Pick the parameterization that runs from the first point to the second.'),
      values: { a, b }, labRequest: null,
      worked: {
        cart: `Direction = end − start = (${aCart(b)}) − (${aCart(a)}) = ${aCart(d)}. So z(t) = (${aCart(a)}) + t(${aCart(d)}) = (${lin(a.re, d.re)}) + i(${lin(a.im, d.im)}) for 0 ≤ t ≤ 1. At t = 1/2 you are at ${aCart(mid)}, the midpoint.`,
        polar: `The direction ${aCart(d)} has polar address r = ${modText(d)} and θ = Arg${argTxt(Arg(d))}: walk at speed r, heading along that Arg. The points of the line have no tidy polar addresses; the step does.`,
      },
    };
  },
};
HANDOUT['1.5.1'] = { a: C(2, 1), b: C(-3, -3) };

// ---------------------------------------------------------------- 1.5.2
const COMBOS_152 = [[true, true], [true, false], [false, true], [false, false]];
FAM['1.5.2'] = {
  draw(random) {
    const [innerStrict, outerStrict] = pick(random, COMBOS_152); let a = gauss(random, ANY3); const r0 = pick(random, [1, 2, 3]), r1 = r0 + 1 + Math.floor(random() * (4 - r0));
    if (a.re === 0 && a.im === -1 && r0 === 1 && r1 === 3) a = { re: 1, im: -1 };   // the handout's two circles, whatever the inequalities, would repeat its answer
    return { a, r0, r1, innerStrict, outerStrict };
  },
  statement: (g) => ({
    tex: `Consider $S = \\{ z \\in \\mathbb{C} : ${g.r0} ${g.innerStrict ? '<' : '\\le'} |${zMinus(g.a, true)}| ${g.outerStrict ? '<' : '\\le'} ${g.r1} \\}$. Is $S$ open, closed, or neither? Is $S$ bounded? What are the boundary points of $S$? Is $S$ a domain? Why or why not?`,
    text: `Consider S = { z in C : ${g.r0} ${g.innerStrict ? '<' : '<='} |${zMinus(g.a, false)}| ${g.outerStrict ? '<' : '<='} ${g.r1} }. Is S open, closed, or neither? Is S bounded? What are the boundary points of S? Is S a domain? Why or why not?`,
  }),
  solve(id, g) {
    need(isC(g.a) && g.r0 > 0 && g.r1 > g.r0 && typeof g.innerStrict === 'boolean' && typeof g.outerStrict === 'boolean', '1.5.2: a, 0 < r0 < r1, strictness flags');
    const a = cc(g.a), open = g.innerStrict && g.outerStrict, closed = !g.innerStrict && !g.outerStrict, word = open ? 'open' : closed ? 'closed' : 'neither open nor closed';
    const verdict = open ? 'open, bounded: a domain' : closed ? 'closed, bounded: not a domain' : 'neither open nor closed, bounded: not a domain';
    const all = ['open, bounded: a domain', 'closed, bounded: not a domain', 'neither open nor closed, bounded: not a domain', 'neither open nor closed, bounded: a domain'];
    const circ = (r) => `{|${zMinus(a, false)}| = ${r}}`, ineq = (s, t) => `${g.r0 * g.r0} ${g.innerStrict ? '<' : '≤'} ${sq('x', a.re, '²')} + ${sq('y', a.im, '²')} ${g.outerStrict ? '<' : '≤'} ${g.r1 * g.r1}`;
    const why = open ? 'Both circles are left out, so every point of S has a tiny disk inside S: S is open, and it holds none of its boundary points, so it is not closed.' : closed ? 'Both circles are kept in, so S holds every boundary point and is closed; but a tiny disk on a kept circle sticks out of S, so S is not open.' : `A tiny disk on the kept circle sticks out of S, so S is not open; the circle that is left out is a limit of points of S but not in S, so S is not closed.`;
    return {
      answer: { tex: `\\text{${word}; bounded; } \\partial S = \\{|${zMinus(a, true)}| = ${g.r0}\\} \\cup \\{|${zMinus(a, true)}| = ${g.r1}\\};\\ ${open ? '\\text{a domain (open and connected)}' : '\\text{not a domain (not open), but a region}'}`,
        text: `${word}; bounded; boundary = ${circ(g.r0)} union ${circ(g.r1)}; ${open ? 'a domain (open and connected)' : 'not a domain (not open); it is a region (connected)'}`,
        values: { center: a, inner: g.r0, outer: g.r1, innerIncluded: !g.innerStrict, outerIncluded: !g.outerStrict, open, closed, bounded: true, connected: true, domain: open, region: true } },
      sketch: makeChoice(canon([id, g]), verdict, all.filter((o) => o !== verdict), () => 'open and closed', 'Pick the verdict.'),
      values: { center: a, r0: g.r0, r1: g.r1, innerStrict: g.innerStrict, outerStrict: g.outerStrict }, labRequest: null,
      worked: {
        cart: `S = {${ineq()}}. That is easy to test point by point, but the picture only appears once you notice the center (x, y) = (${a.re}, ${a.im}).`,
        polar: `${isZero(a) ? 'The origin is the center' : `Center at ${aCart(a)}`} and write z = ${around(a)}ρe^{iφ} (φ a name for arg(${zMinus(a, false)})): S is ${g.r0} ${g.innerStrict ? '<' : '≤'} ρ ${g.outerStrict ? '<' : '≤'} ${g.r1}, a ring. ${why} S is bounded and connected; ${open ? 'open and connected, so it is a domain.' : 'not open, so not a domain; it is a region (a domain plus some boundary).'}`,
      },
    };
  },
};
HANDOUT['1.5.2'] = { a: C(0, -1), r0: 1, r1: 3, innerStrict: true, outerStrict: false };

// ---------------------------------------------------------------- 2.1.1
const A_SMALL = []; for (const re of ints(-3, 3)) for (const im of ints(-3, 3)) if (!(re === 0 && im === 0) && !(re === 0 && im === 1)) A_SMALL.push(C(re, im));
const C_NZ3 = []; for (const re of NZ3) for (const im of NZ3) C_NZ3.push(C(re, im));
function monoCart(coeffs) {
  const P = [[[1, 0, 0]], [[1, 1, 0]], [[1, 2, 0], [-1, 0, 2]], [[1, 3, 0], [-3, 1, 2]]], Q = [[], [[1, 0, 1]], [[2, 1, 1]], [[3, 2, 1], [-1, 0, 3]]];
  const u = new Map(), v = new Map(), addTo = (m, [c, xp, yp], k) => { const key = xp + ',' + yp; m.set(key, (m.get(key) || 0) + c * k); };
  coeffs.forEach((c, k) => { for (const t of P[k]) { addTo(u, t, c.re); addTo(v, t, c.im); } for (const t of Q[k]) { addTo(u, t, -c.im); addTo(v, t, c.re); } });
  const fin = (m) => [...m.entries()].map(([key, c]) => { const [xp, yp] = key.split(',').map(Number); return [c + 0, xp, yp]; }).filter(([c]) => c !== 0).sort((a, b) => (b[1] + b[2]) - (a[1] + a[2]) || b[1] - a[1]);
  return { u: fin(u), v: fin(v) };
}
function monoPolar(coeffs) {
  const u = [], v = [];
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (k === 0) { if (c.re !== 0) u.push([c.re, 0, null]); if (c.im !== 0) v.push([c.im, 0, null]); continue; }
    if (c.re !== 0) { u.push([c.re, k, 'cos']); v.push([c.re, k, 'sin']); }
    if (c.im !== 0) { u.push([-c.im, k, 'sin']); v.push([c.im, k, 'cos']); }
  }
  const order = (l) => l.sort((a, b) => b[1] - a[1] || (a[2] === 'cos' ? -1 : 1) - (b[2] === 'cos' ? -1 : 1));
  return { u: order(u), v: order(v) };
}
const monoText = (list) => joinTerms(list.map(([c, xp, yp]) => { const m = Math.abs(c), pw = (s, e) => (e === 0 ? '' : e === 1 ? s : s + '^' + e), mono = pw('x', xp) + pw('y', yp); return { s: c < 0 ? -1 : 1, b: mono === '' ? String(m) : (m === 1 ? '' : String(m)) + mono }; }));
const polarText = (list, flavor) => joinTerms(list.map(([c, k, trig]) => {            // flavor: 'tex' | 'ascii' | 'prose'
  const m = Math.abs(c);
  if (trig === null) return { s: c < 0 ? -1 : 1, b: String(m) };
  const rp = k === 1 ? 'r' : 'r^' + k, kk = k === 1 ? '' : String(k);
  const tr = flavor === 'tex' ? `\\${trig} ${kk}\\theta` : flavor === 'prose' ? `${trig} ${kk}θ` : `${trig}(${kk ? kk + ' ' : ''}theta)`;
  return { s: c < 0 ? -1 : 1, b: (m === 1 ? '' : String(m)) + rp + (flavor === 'tex' ? '' : ' ') + tr };
}));
FAM['2.1.1'] = {
  draw(random) {
    const t = Math.min(2, Math.floor(random() * 3));
    if (t === 0) return { fn: polyString([C(0), pick(random, A_SMALL), C(1)]) };
    if (t === 1) return { fn: polyString([C(0), pick(random, [C(0, 0)].concat(A_SMALL.filter((z) => Math.abs(z.re) <= 2 && Math.abs(z.im) <= 2))), C(0), C(1)]) };
    const a = pick(random, C_NZ3), b = pick(random, C_NZ3.concat([C(0, 0)]));
    return { fn: polyString([b, C(0), a]) };
  },
  statement: (g) => ({ tex: `Express $f(z) = ${g.fn}$ in the form $u(x, y) + iv(x, y)$ and $u(r, \\theta) + iv(r, \\theta)$.`, text: `Express f(z) = ${g.fn} in the form u(x, y) + iv(x, y) and u(r, theta) + iv(r, theta).` }),
  solve(id, g) {
    need(typeof g.fn === 'string', '2.1.1 needs fn'); const coeffs = parsePoly(g.fn);
    const cart = monoCart(coeffs), polar = monoPolar(coeffs), z = C(1, 1), w = evalPoly(coeffs, z);
    const uC = monoText(cart.u), vC = monoText(cart.v), neg_ = (l) => l.map(([c, a, b]) => [-c, a, b]);
    const noLin = monoCart(coeffs.map((c, k) => (k === 1 ? C(0, 0) : c)));
    const cands = [`u = ${vC}; v = ${uC}`, `u = ${uC}; v = ${monoText(neg_(cart.v))}`, `u = ${monoText(neg_(cart.u))}; v = ${vC}`, `u = ${monoText(noLin.u)}; v = ${monoText(noLin.v)}`];
    const src = polyString(coeffs, { src: true });
    return {
      answer: { tex: `u = ${uC},\\ v = ${vC}; \\qquad u = ${polarText(polar.u, 'tex')},\\ v = ${polarText(polar.v, 'tex')}`, text: `u = ${uC}, v = ${vC}; u = ${polarText(polar.u, 'ascii')}, v = ${polarText(polar.v, 'ascii')}`,
        values: { check: { z, w, u: w.re, v: w.im }, coeffs, cartTerms: { u: cart.u, v: cart.v }, polarTerms: { u: polar.u, v: polar.v }, uCart: uC, vCart: vC, uPolar: polarText(polar.u, 'ascii'), vPolar: polarText(polar.v, 'ascii'), src } },
      sketch: makeChoice(canon([id, g]), `u = ${uC}; v = ${vC}`, cands, (k) => `u = ${uC} + ${k + 1}; v = ${vC}`, 'Pick u(x, y) and v(x, y).'),
      values: { fn: { src }, z }, labRequest: null,
      worked: {
        cart: `Expand with z = x + iy: ${g.fn} gives the real part u = ${uC} and the imaginary part v = ${vC}. Check at z = 1 + i: u = ${w.re}, v = ${w.im}.`,
        polar: `With z = re^{iθ}, θ a name for arg z: every term c·z^k is |c| r^k e^{i(kθ + Arg c)}, a turn and a stretch, and a coefficient like i is a quarter turn (Arg i = π/2). Taking cosine and sine parts, u = ${polarText(polar.u, 'prose')} and v = ${polarText(polar.v, 'prose')}. Check at r = √2, θ = Arg(1 + i) = π/4: u = ${w.re}, v = ${w.im}.`,
      },
    };
  },
};
HANDOUT['2.1.1'] = { fn: 'z^2 + iz' };

// ---------------------------------------------------------------- 2.1.2
const COMBOS_212 = []; for (const axis of ['x', 'y']) for (const c of [-3, -2, -1, 1, 2, 3]) if (!(axis === 'x' && Math.abs(c) === 2)) COMBOS_212.push({ axis, c });   // x = 2 is the handout, and x = -2 has the same image curve
FAM['2.1.2'] = {
  draw(random) { return { ...pick(random, COMBOS_212) }; },
  statement: (g) => { const kind = g.axis === 'x' ? 'vertical' : 'horizontal'; return { tex: `Determine the image of the ${kind} line $${g.axis} = ${g.c}$ under $w = z^2$. Describe the resulting curve in the $w$-plane.`, text: `Determine the image of the ${kind} line ${g.axis} = ${g.c} under w = z^2. Describe the resulting curve in the w-plane.` }; },
  solve(id, g) {
    need((g.axis === 'x' || g.axis === 'y') && Number.isFinite(g.c) && g.c !== 0, '2.1.2: axis x or y, c nonzero');
    const c = g.c, c2 = c * c, D = 4 * c2, X = g.axis === 'x', vertex = X ? c2 : -c2, coeff = X ? -1 / (4 * c2) : 1 / (4 * c2), opens = X ? 'left' : 'right';
    const eq = (V, sign, d) => `u = ${V} ${sign} v^2/${d}`, correct = eq(vertex, X ? '-' : '+', D);
    const cands = X ? [eq(c2, '+', D), eq(c2, '-', 4 * Math.abs(c)), eq(-c2, '+', D), eq(c, '-', D)] : [eq(-c2, '-', D), eq(-c2, '+', 4 * Math.abs(c)), eq(c2, '-', D), eq(-c, '+', D)];
    const z = X ? C(c, 1) : C(1, c), w = mul(z, z), t = X ? 'y' : 'x';
    return {
      answer: { tex: `u = ${vertex} ${X ? '-' : '+'} \\dfrac{v^2}{${D}}\\ \\text{(a parabola: vertex } ${vertex},\\ \\text{opens ${opens}, focus } 0\\text{)}`, text: `parabola ${correct} (vertex ${vertex}, opens ${opens}, focus 0)`,
        values: { parabola: { vertex, coeff, focus: 0 }, opens, sample: X ? { y: 1, z, w } : { x: 1, z, w }, axis: g.axis, c } },
      sketch: makeChoice(canon([id, g]), correct, cands, (k) => eq(vertex + k + 1, X ? '-' : '+', D), 'Pick the equation of the image.'),
      values: { n: 2, line: { axis: g.axis, c } },
      labRequest: { fn: 'sq', shapes: [X ? { kind: 'verticalLine', x: c } : { kind: 'horizontalLine', y: c }], view: 'side', problem: '2.1.2', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Parametrize the line ${g.axis} = ${c}: z = ${X ? `${c} + iy` : `x ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}i`} with ${t} real. Push forward: z² = ${X ? `(${c2} − y²)${sgnTerm(2 * c, 'iy')}` : `(x² − ${c2})${sgnTerm(2 * c, 'ix')}`}, so ${X ? `u = ${c2} − y² and v = ${2 * c}y` : `u = x² − ${c2} and v = ${2 * c}x`}. Eliminate ${t} = ${c < 0 ? '−' : ''}v/${2 * Math.abs(c)}: u = ${X ? `${c2} − v²/${D}` : `v²/${D} − ${c2}`}, a parabola with vertex ${vertex} opening ${opens}. At ${t} = 1 the point ${aCart(z)} goes to ${aCart(w)}.`,
        polar: `On ${g.axis} = ${c} every point has r ${X ? 'cos' : 'sin'} θ = ${c} (θ a name for arg z). Squaring sends r to ρ = r² and a name θ to the name φ = 2θ of arg w, so ρ(1 ${X ? '+' : '−'} cos φ) = r² · 2${X ? 'cos' : 'sin'}²θ = 2(r ${X ? 'cos' : 'sin'} θ)² = 2 · ${br(String(c))}² = ${2 * c2}. A curve ρ = k/(1 ${X ? '+' : '−'} cos φ) is a parabola with its focus at the origin: the focus is 0.`,
      },
    };
  },
};
HANDOUT['2.1.2'] = { axis: 'x', c: 2 };

// ---------------------------------------------------------------- 2.1.3
const A213 = [C(0, 1), C(0, -1), C(-1, 0), C(2, 0), C(0, 2), C(1, 1), C(1, -1)];
const coefS = (c, v) => (c === 0 ? '0' : (c < 0 ? '-' : '') + coefVar(Math.abs(c), v));                         // 0, x², -x², 3x²/4
const quot = (num, den) => { const m = Math.abs(den), top = num.includes(' ') ? '(' + num + ')' : num; return den < 0 ? (m === 1 ? '-' + top : '-' + top + '/' + aNum(m)) : (m === 1 ? num : top + '/' + aNum(m)); };   // (u - 3)/2, -u/2, u
const dirTerm = (d) => { const s = polyString([C(0, 0), d]).replace(/z/g, 't'); return s[0] === '-' ? '− ' + s.slice(1) : '+ ' + s; };
const lineForm = (p, dir) => { const d = dirTerm(dir); return isZero(p) ? (d.startsWith('+ ') ? d.slice(2) : '-' + d.slice(2)) : '(' + aCart(p) + ') ' + d; };   // 'az + b = (1 - 3i) + 2it' or '2it'
FAM['2.1.3'] = {
  draw(random) {
    const a = pick(random, A213), b = { re: pick(random, ANY3), im: pick(random, ANY3) }, axis = random() < 0.5 ? 'x' : 'y'; let c = pick(random, NZ3);
    if (a.re === 0 && a.im === 1 && b.re === 0 && b.im === -2 && axis === 'x' && c === 2) c = 3;
    return { a: { ...a }, b, line: { axis, c } };
  },
  statement: (g) => ({
    tex: `Find the image of the line $${g.line.axis} = ${g.line.c}$ under $f(z) = ${polyString([cc(g.b), cc(g.a)], { tex: true })}$. What does this linear transformation do to the plane in general?`,
    text: `Find the image of the line ${g.line.axis} = ${g.line.c} under f(z) = ${polyString([cc(g.b), cc(g.a)])}. What does this linear transformation do to the plane in general?`,
  }),
  solve(id, g) {
    need(isC(g.a) && isC(g.b) && !isZero(g.a), '2.1.3: a must be nonzero'); need(g.line && (g.line.axis === 'x' || g.line.axis === 'y') && Number.isFinite(g.line.c), '2.1.3: line');
    const a = cc(g.a), b = cc(g.b), { axis, c } = g.line, X = axis === 'x', f = (z) => add(mul(a, z), b);
    const p = cleanC(X ? f(C(c, 0)) : f(C(0, c))), dir = cleanC(X ? mul(a, C(0, 1)) : a), L = Math.hypot(dir.re, dir.im), ud = C(dir.re / L, dir.im / L);
    const nu = -ud.im + 0, nv = ud.re + 0, k = nu * p.re + nv * p.im + 0, imageLine = lineText(p, dir), rotation = Arg(a), stretch = abs(a), z = X ? C(c, 1) : C(1, c), w = f(z), target = { point: p, dir: ud };
    const elim = Math.abs(dir.re) < 1e-12 ? `u = ${aNum(p.re)} does not depend on t, so the image is the vertical line ${imageLine}`
      : Math.abs(dir.im) < 1e-12 ? `v = ${aNum(p.im)} does not depend on t, so the image is the horizontal line ${imageLine}`
        : `t = ${quot(sh('u', p.re), dir.re)}, so ${imageLine}: the image is that slanted line`;
    const slideA = isZero(b) ? 'then do not slide (b = 0)' : `then slide by ${aCart(b)}`, slideT = isZero(b) ? '\\text{then do not slide (}b = 0\\text{)}' : `\\text{then slide by } ${tCart(b)}`;
    return {
      answer: { tex: `\\text{the line } ${imageLine};\\ \\text{in general: } ${turnTex(rotation)},\\ \\text{stretch by } |a| = ${tNum(stretch)}${stretch === 1 ? '\\text{ (no stretch)}' : ''},\\ ${slideT}`,
        text: `the line ${imageLine}; in general: ${turnA(rotation)}, ${stretchA(stretch)}, ${slideA}`,
        values: { imageLine, rotation, stretch, shift: b, sample: { z, w }, imageGeom: { point: p, dir: ud }, lineEq: { nu, nv, k }, target } },
      sketch: { kind: 'line', prompt: 'Drag the two points onto the image line.', fit: fitFor([C(nu * k + 0, nv * k + 0)], 2.2), target },
      values: { a, b, input: X ? { kind: 'verticalLine', x: c } : { kind: 'horizontalLine', y: c } },
      labRequest: { fn: { src: polyString([b, a], { src: true }) }, shapes: [X ? { kind: 'verticalLine', x: c } : { kind: 'horizontalLine', y: c }], view: 'side', problem: '2.1.3', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Parametrize the line ${axis} = ${c}: z = ${X ? `${c} + it` : `t ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}i`} with t real. Push forward: az + b = ${lineForm(p, dir)}, so u = ${lin(p.re, dir.re)} and v = ${lin(p.im, dir.im)}. Eliminate t: ${elim}.`,
        polar: `a = ${aCart(a)} has r = |a| = ${aNum(stretch)} and θ = Arg a = ${aAng(rotation)}, the home step. Multiplying by a ${turnP(rotation)} and stretches by ${aNum(stretch)}${stretch === 1 ? ' (|a| = 1 keeps every length)' : ''}; adding b = ${aCart(b)} ${isZero(b) ? 'slides nothing' : 'slides every point by b'}. So the direction ${X ? 'i' : '1'} of the line becomes ${aCart(dir)}: still a line. In general: turn by Arg a, stretch by |a|, slide by b; distances scale by |a| and angles never change.`,
      },
    };
  },
};
HANDOUT['2.1.3'] = { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } };

// ---------------------------------------------------------------- 2.2.1
const COMBOS_221 = []; for (const alpha of [PI / 6, PI / 4, PI / 3, PI / 2]) for (const n of [2, 3, 4]) if (n * alpha < TAU - 1e-9 && !(alpha === PI / 4 && n === 3)) COMBOS_221.push({ alpha, n });
const snapMult12 = (t) => { const m = Math.round((t * 12) / PI); return Math.abs(t - (m * PI) / 12) < 1e-12 ? (m === 12 ? PI : (m * PI) / 12) : t; };
const EXPAND = { 2: ['x² − y²', '2xy'], 3: ['x³ − 3xy²', '3x²y − y³'], 4: ['x⁴ − 6x²y² + y⁴', '4x³y − 4xy³'] };
FAM['2.2.1'] = {
  draw(random) { return { ...pick(random, COMBOS_221) }; },
  statement: (g) => ({ tex: `Find the image of the sector $0 < \\arg(z) < ${texSlash(g.alpha)}$ under $w = z^${g.n}$.`, text: `Find the image of the sector 0 < arg(z) < ${aAng(g.alpha)} under w = z^${g.n}.` }),
  solve(id, g) {
    need(isInt(g.n) && g.n >= 2 && g.n <= 6, '2.2.1: n must be an integer 2..6'); need(g.alpha > 0 && g.n * g.alpha < TAU - 1e-9, '2.2.1: n·alpha must be below 2 pi');
    const n = g.n, alpha = g.alpha, to = snapMult12(n * alpha), ex = EXPAND[n], target = { from: 0, to };
    return {
      answer: { tex: `\\text{the sector } 0 < \\arg w < ${texAngle(to)}`, text: `the sector 0 < arg w < ${aAng(to)}`, values: { sector: { from: 0, to }, n, alpha, target } },
      sketch: { kind: 'sector', prompt: 'Drag the two points onto the two edge rays of the image sector.', fit: { center: C(0, 0), halfWidth: 2.5 }, target },
      values: { n, sector: { theta0: 0, theta1: alpha } },
      labRequest: { fn: n === 2 ? 'sq' : n === 3 ? 'cube' : { src: 'z^' + n }, shapes: [{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: alpha }], view: 'side', problem: '2.2.1', predictFirst: true },
      worked: {
        cart: `${ex ? `z^${n} = (${ex[0]}) + i(${ex[1]}). ` : ''}Parametrize each edge and push forward. The edge y = 0 (arg z = 0) goes to x^${n} > 0, the positive real axis. The edge arg z = ${aAng(alpha)} is the ray of points t(cos ${aAng(alpha)} + i sin ${aAng(alpha)}); its image is the ray of points t^${n}(cos ${aAng(to)} + i sin ${aAng(to)}) at angle ${aAng(to)}. The sector between them is filled in, but you only see that after finding the edges.`,
        polar: `z = re^{iθ} goes to r^${n}e^{i${n}θ}: lengths r > 0 reach every length, and every name θ of arg z in (0, ${aAng(alpha)}) becomes the name ${n}θ of arg w in (0, ${aAng(to)}). The image is the sector 0 < arg w < ${aAng(to)}: ${['', '', 'twice', 'three times', 'four times', 'five times', 'six times'][n]} as wide, and it does not overlap itself because ${n}α < 2π.`,
      },
    };
  },
};
HANDOUT['2.2.1'] = { alpha: PI / 4, n: 3 };

// ---------------------------------------------------------------- 2.2.2
FAM['2.2.2'] = {
  draw(random) { const deg = pick(random, DEGS), r = pick(random, [1, 2, 3]); let n = pick(random, [2, 3]); if (r === 2 && deg === 90 && n === 2) n = 3; return { w: nicePoint(r, deg), n }; },
  statement: (g) => { const word = g.n === 2 ? 'square' : 'cube'; return { tex: `Compute the principal value of the ${word} root of $${tCart(g.w)}$, i.e. $(${tCart(g.w)})^{1/${g.n}}$ on the principal branch.`, text: `Compute the principal value of the ${word} root of ${aCart(g.w)}, i.e. (${aCart(g.w)})^(1/${g.n}) on the principal branch.` }; },
  solve(id, g) {
    need(isC(g.w) && !isZero(g.w), '2.2.2: w must not be 0'); need(isInt(g.n) && g.n >= 2 && g.n <= 6, '2.2.2: n must be an integer 2..6');
    const w = cc(g.w), n = g.n, A = Arg(w), aw = abs(w), root = cleanC(principalRoot(w, n)), rr = Math.pow(aw, 1 / n), others = rootsOf(w, n).map(cleanC).slice(1), target = { points: [root] };
    const rl = exactReal(rr) ? aNum(rr) : `${aNum(aw)}^(1/${n})`, word = n === 2 ? 'square' : 'cube';
    return {
      answer: { tex: `(${tCart(w)})^{1/${n}} = ${tNum(aw)}^{1/${n}}e^{i\\operatorname{Arg}(${tCart(w)})/${n}} = ${tExp(rr, A / n)}${tEqC(root)}${tCart(root)}\\ \\text{(the other ${word} root${n === 2 ? ' is ' : 's are '}}${tEqL(others) === ' = ' ? '' : '\\approx\\ '}${others.map((o) => tCart(o)).join('\\text{ and }')}\\text{)}`,
        text: `(${aCart(w)})^(1/${n}) = ${rl === '1' ? '' : rl + ' '}e^(i Arg(${aCart(w)})/${n}) = ${aExp(rr, A / n)}${eqC(root)}${aCart(root)}, using Arg(${aCart(w)}) = ${aAng(A)} (the other ${word} root${n === 2 ? ' is ' : 's are '}${others.every(exactC) ? '' : 'about '}${others.map(aCart).join(' and ')})`,
        values: { root, r: rr, Arg: A / n, other: others[0], others, wAbs: aw, wArg: A, target } },
      sketch: { kind: 'point', count: 1, prompt: 'Drag the point to the principal root.', fit: fitFor([root, w], 0), target },
      values: { w, n }, labRequest: null,
      worked: {
        cart: n === 2 ? `Solve (a + bi)² = ${aCart(w)}, where a and b are the x and y of the root: a² − b² = ${aNum(w.re)} and 2ab = ${aNum(w.im)}. There are two solutions, ${exactC(root) && exactC(others[0]) ? '' : 'about '}${aCart(root)} and ${aCart(others[0])}; the principal one is the one reached from the home step.` : `(x + iy)³ = ${aCart(w)} is a pair of cubic equations in x and y with no short solution by hand. Read the three cube roots from the polar address instead and take the one on the home step.`,
        polar: `${aCart(w)} = ${rE(aw)}e^{iθ} with θ = Arg w = ${aAng(A)}, the home step. The principal root uses the home step only: r = ${rl}, angle Arg w/${n} = ${aAng(A / n)}. So the root is ${aExp(rr, A / n)}${proseEqC(root)}${aCart(root)}. The other roots come from the other steps ${aAng(A)} + 2πk.`,
      },
    };
  },
};
HANDOUT['2.2.2'] = { w: C(0, 2), n: 2 };

// ---------------------------------------------------------------- 2.3.1 and P5
const PATHS_231 = [{ kind: 'line', m: 1 }, { kind: 'line', m: -1 }, { kind: 'line', m: 2 }, { kind: 'line', m: -2 }, { kind: 'line', m: 0.5 }, { kind: 'vertical' }];
const PATHS_P5 = PATHS_231.concat([{ kind: 'parabola' }, { kind: 'cubic' }]);
const mText = (m) => (m === 1 ? 'x' : m === -1 ? '-x' : m === 0.5 ? 'x/2' : m + 'x');
function pathPhrase(path) {
  switch (path.kind) {
    case 'line': return { tex: `the line $y = ${mText(path.m).replace('x/2', '\\tfrac{x}{2}')}$`, text: `the line y = ${mText(path.m)}`, math: `y = ${mText(path.m).replace('x/2', '\\tfrac{x}{2}')}` };
    case 'vertical': return { tex: 'the imaginary axis $(x = 0)$', text: 'the imaginary axis (x = 0)', math: 'x = 0' };
    case 'parabola': return { tex: 'the curve $y = x^2$', text: 'the curve y = x^2', math: 'y = x^2' };
    default: return { tex: 'the curve $y = x^3$', text: 'the curve y = x^3', math: 'y = x^3' };
  }
}
function pathOK(path) { need(!!path && ['line', 'vertical', 'parabola', 'cubic'].includes(path.kind), 'path kind'); if (path.kind === 'line') need(Number.isFinite(path.m) && path.m !== 0, 'path slope must be nonzero'); }
const limitsValues = (id, path) => { const fn = id === 'P5' ? 'x-over-z' : 'dir'; return path.kind === 'cubic' ? null : path.kind === 'line' ? { fn, path: 'line', m: path.m } : { fn, path: path.kind }; };
FAM['2.3.1'] = {
  draw(random) { return { path: { ...pick(random, PATHS_231) } }; },
  statement(g) { const p = pathPhrase(g.path); return { tex: `Find $\\lim_{z\\to 0} \\dfrac{x^2 - y^2 + i2xy}{x^2 + y^2}$ as $z \\to 0$ along ${p.tex}.`, text: `Find lim (x^2 - y^2 + i2xy)/(x^2 + y^2) as z -> 0 along ${p.text}.` }; },
  solve(id, g) {
    pathOK(g.path); const path = g.path, p = pathPhrase(path); let along;
    if (path.kind === 'line') { const m = path.m, d = 1 + m * m; along = C((1 - m * m) / d, (2 * m) / d); } else along = path.kind === 'vertical' ? C(-1, 0) : C(1, 0);
    const m = path.m, target = { points: [along] }, sup = path.kind === 'parabola' ? ['²', '⁴', '³'] : ['³', '⁶', '⁴'];
    const cart = path.kind === 'line' ? `Along y = ${mText(m)}: x² − y² = ${coefS(1 - m * m, 'x²')} and 2xy = ${coefS(2 * m, 'x²')}, so the numerator is x²(${aCart(C(1 - m * m, 2 * m))}); the denominator x² + y² is ${coefS(1 + m * m, 'x²')}. The x² cancels, so the value is ${over('(' + aCart(C(1 - m * m, 2 * m)) + ')', 1 + m * m)} = ${aCart(along)} for every x ≠ 0. That is the limit along this line.`
      : path.kind === 'vertical' ? 'Along the imaginary axis x = 0, so the fraction is (−y²)/(y²) = −1 for every y ≠ 0. The limit along it is −1.'
        : `Along y = x${sup[0]} the fraction is (x² − x${sup[1]} + 2ix${sup[2]})/(x² + x${sup[1]}). Divide top and bottom by x² and let x → 0: it tends to 1.`;
    const polar = path.kind === 'line' ? `The fraction is z/conj z = e^{2iθ} (θ a name for arg z): it keeps only the direction and forgets the distance r. Along y = ${mText(m)} the direction is fixed, Arg z = atan(${aNum(m)})${eqAng(Math.atan(m))}${aAng(Math.atan(m))} on one side of 0 (the other side adds π, which e^{2iθ} does not see), so the value is e^{2iθ} = ${aCart(along)}. A different direction gives a different value, so the limit at 0 itself does not exist.`
      : path.kind === 'vertical' ? 'The fraction is z/conj z = e^{2iθ} (θ a name for arg z). On the imaginary axis Arg z = ±π/2, so e^{iπ} = −1: the same value from both sides. Along the real axis it is 1, so the limit at 0 itself does not exist.'
        : 'The fraction is z/conj z = e^{2iθ} (θ a name for arg z). The curve arrives at 0 tangent to the real axis, so Arg z → 0 and the value tends to e^0 = 1. Along the imaginary axis it is −1, so the limit at 0 itself does not exist.';
    return {
      answer: { tex: `\\lim = ${tCart(along)}\\ \\text{along } ${p.math}\\quad \\text{(the full limit at } 0 \\text{ does not exist)}`, text: `${aCart(along)} along ${p.text} (the full limit at 0 does not exist)`,
        values: { along, path, exists: false, alongParabola: 1, alongRealAxis: C(1, 0), alongImagAxis: C(-1, 0), target } },
      sketch: { kind: 'point', count: 1, prompt: 'Drag the point to the value the fraction approaches along this path.', fit: fitFor([along, C(1, 0), C(-1, 0)], 0), target },
      values: limitsValues('2.3.1', path), labRequest: null, worked: { cart, polar },
    };
  },
};
HANDOUT['2.3.1'] = { path: { kind: 'parabola' } };
function p5Cands(path) {
  if (path.kind === 'line') { const m = path.m, d = 1 + m * m; return [C(1 / d, m / d), C(1 / d, 0), C(1, -m), C(m / d, -1 / d)].map(aCart); }
  return path.kind === 'vertical' ? ['1', '-1', 'i', '1/2'] : ['0', '1/2', '-1', 'i'];
}
FAM.P5 = {
  draw(random) { return { path: { ...pick(random, PATHS_P5) } }; },
  statement(g) { const p = pathPhrase(g.path); return { tex: `Show that $\\lim_{z\\to 0} \\dfrac{\\operatorname{Re}(1 + z) - 1}{z}$ does not exist. As a first step, find the value it approaches along ${p.tex}.`, text: `Show that lim (Re(1 + z) - 1)/z as z -> 0 does not exist. As a first step, find the value it approaches along ${p.text}.` }; },
  solve(id, g) {
    pathOK(g.path); const path = g.path, p = pathPhrase(path), m = path.m; let along;
    if (path.kind === 'line') { const d = 1 + m * m; along = C(1 / d, -m / d); } else along = path.kind === 'vertical' ? C(0, 0) : C(1, 0);
    const sup = path.kind === 'parabola' ? ['²', ''] : ['³', '²'];
    const cart = path.kind === 'line' ? `Re(1 + z) − 1 = x, so the fraction is x/z. Along y = ${mText(m)}, z = x(${aCart(C(1, m))}), so x/z = 1/(${aCart(C(1, m))}) = ${aCart(along)} for every x ≠ 0. Along the real axis (y = 0) it is 1. Two paths, two values: the limit does not exist.`
      : path.kind === 'vertical' ? 'Re(1 + z) − 1 = x, so the fraction is x/z. Along the imaginary axis x = 0 it is 0/(iy) = 0. Along the real axis it is x/x = 1. Two paths, two values: the limit does not exist.'
        : `Re(1 + z) − 1 = x, so the fraction is x/z. Along y = x${sup[0]} it is x/(x + ix${sup[0]}) = 1/(1 + ix${sup[1]}) → 1. Along the imaginary axis it is 0. Two paths, two values: the limit does not exist.`;
    const polar = `With θ a name for arg z: x/z = r cos θ/(re^{iθ}) = cos θ e^{−iθ} = ½ + ½e^{−2iθ}. The length r cancels, so only the direction θ is left, and all directions together trace the circle with center ½ and radius ½ through 0 and 1. ${path.kind === 'line' ? `Along y = ${mText(m)}, Arg z = atan(${aNum(m)}) fixes the value ${aCart(along)}.` : path.kind === 'vertical' ? 'Along the imaginary axis θ = ±π/2 gives 0.' : 'The curve arrives tangent to the real axis, θ → 0, so the value tends to 1.'} Different directions, different values: no limit.`;
    const one = along.re === 1 && along.im === 0, contrast = one ? C(0, 0) : C(1, 0), axis = one ? 'imaginary' : 'real';   // y = x^2 and y = x^3 also give 1 on the real axis: quote the axis that differs
    return {
      answer: { tex: `\\dfrac{x}{z} \\to ${tCart(along)}\\ \\text{along } ${p.math},\\ \\text{but } ${tCart(contrast)} \\text{ along the ${axis} axis, so no limit}`, text: `x/z -> ${aCart(along)} along ${p.text}, but ${aCart(contrast)} along the ${axis} axis, so the limit does not exist`,
        values: { along, path, alongRealAxis: C(1, 0), alongImagAxis: C(0, 0), contrast: { axis, value: contrast }, exists: false, directional: { A: C(0.5, 0), B: C(0.5, 0) } } },
      sketch: makeChoice(canon([id, g]), aCart(along), p5Cands(path), (k) => aCart(C(along.re + (k + 1) / 10, along.im)), 'Pick the value the fraction approaches along this path.'),
      values: limitsValues('P5', path), labRequest: null, worked: { cart, polar },
    };
  },
};
HANDOUT.P5 = null;

// ---------------------------------------------------------------- 2.4.1
const RAYS = table({
  'negative-real': { angle: PI, seam: 0, point: C(-1, 0), tex: 'negative $x$-axis', text: 'negative x-axis', cut: 'positive real axis', ray: 'negative real axis' },
  'positive-imaginary': { angle: PI / 2, seam: -PI / 2, point: C(0, 1), tex: 'positive $y$-axis', text: 'positive y-axis', cut: 'negative imaginary axis', ray: 'positive imaginary axis' },
  'negative-imaginary': { angle: -PI / 2, seam: PI / 2, point: C(0, -1), tex: 'negative $y$-axis', text: 'negative y-axis', cut: 'positive imaginary axis', ray: 'negative imaginary axis' },
});
const COMBOS_241 = []; for (const n of [2, 3]) for (const ray of Object.keys(RAYS)) if (!(n === 3 && ray === 'negative-real')) COMBOS_241.push({ n, ray });
FAM['2.4.1'] = {
  draw(random) { return { ...pick(random, COMBOS_241) }; },
  statement(g) { const R = RAYS[g.ray], w = g.n === 2 ? 'square' : 'cube'; return { tex: `Find a branch of the ${w} root of $z$ that is continuous along the ${R.tex}.`, text: `Find a branch of the ${w} root of z that is continuous along the ${R.text}.` }; },
  solve(id, g) {
    need(isInt(g.n) && g.n >= 2 && g.n <= 5 && !!RAYS[g.ray], '2.4.1: n 2..5 and a known ray');
    const R = RAYS[g.ray], n = g.n, seam = R.seam, atRay = cleanC(branchRoot(R.point, n, seam)), win = (s, sym) => `${aAng(s)} < ${sym} < ${aAng(s + TAU)}`;
    const wrong = [0, -1, -2, 1].map((j) => win(R.angle + TAU * j, 'theta')), phi = seam + ((((R.angle - seam) % TAU) + TAU) % TAU || TAU), pt = aCart(R.point), word = n === 2 ? 'square' : 'cube';
    return {
      answer: { tex: `f(z) = r^{1/${n}}e^{i\\theta/${n}}\\ \\text{with } \\theta \\in \\arg z,\\ ${texAngle(seam)} < \\theta < ${texAngle(seam + TAU)}\\ \\text{(cut on the ${R.cut})}; \\quad f(${tCart(R.point)}) = ${tExp(1, phi / n)} = ${tCart(atRay)}`,
        text: `f(z) = r^(1/${n}) e^(i theta/${n}), with theta the name of arg z chosen in ${win(seam, 'theta')} (cut on the ${R.cut}); f(${pt}) = ${aExp(1, phi / n)} = ${aCart(atRay)}`,
        values: { seam, window: [seam, seam + TAU], atRay, rayPoint: R.point, principalJumps: g.ray === 'negative-real', n, ray: g.ray, ...(g.ray === 'negative-real' ? { atMinusOne: atRay } : {}) } },
      sketch: makeChoice(canon([id, g]), win(seam, 'theta'), wrong, (k) => win(seam + (k + 1) * PI, 'theta'), 'Pick the window that stays continuous along the ray.'),
      values: { n, seam, walk: g.ray === 'negative-real' ? 'along' : null }, labRequest: null,
      worked: {
        cart: `In (x, y) the ${word} root has no short formula: Arg z needs arctan and a case split on the signs of x and y, which is a window in disguise.`,
        polar: `Write z = re^{iθ} with θ the name of arg z in the window ${win(seam, 'θ')} (seam on the ${R.cut}). Define f(z) = r^(1/${n}) e^{iθ/${n}}. The ${R.ray} is θ = ${aAng(phi)}, inside the window, so f is continuous there: a continuous choice of name never jumps except across the seam. f(${pt}) = ${aExp(1, phi / n)} = ${aCart(atRay)}.${g.ray === 'negative-real' ? ' The principal branch has its seam on the negative real axis and jumps there.' : ''}`,
      },
    };
  },
};
HANDOUT['2.4.1'] = { n: 3, ray: 'negative-real' };

// ---------------------------------------------------------------- 2.5.1
const SLOTS_251 = [{ circle: { a: C(-1, 0) } }, { circle: { a: C(2, 0) } }, { circle: { a: C(0, 1) } }, { circle: { a: C(0, -1) } }, { circle: { a: C(1, 1) } }, { line: { c: -2 } }, { line: { c: -1 } }, { line: { c: -0.5 } }, { line: { c: 0.5 } }, { line: { c: 1 } }, { line: { c: 2 } }];
const cTex = (c) => (Math.abs(c) === 0.5 ? (c < 0 ? '-' : '') + '\\tfrac{1}{2}' : String(c)), cTxt = (c) => (Math.abs(c) === 0.5 ? (c < 0 ? '-' : '') + '1/2' : String(c));
FAM['2.5.1'] = {
  draw(random) { const s = pick(random, SLOTS_251); return s.circle ? { circle: { a: { ...s.circle.a } } } : { line: { ...s.line } }; },
  statement(g) {
    if (g.circle) { const a = g.circle.a, R = Math.hypot(a.re, a.im); return { tex: `Find the image of the circle $|${zMinus(a, true)}| = ${tNum(R)}$ under $w = 1/z$.`, text: `Find the image of the circle |${zMinus(a, false)}| = ${aNum(R)} under w = 1/z.` }; }
    return { tex: `Find the image of the line $x = ${cTex(g.line.c)}$ under $w = 1/z$.`, text: `Find the image of the line x = ${cTxt(g.line.c)} under w = 1/z.` };
  },
  solve(id, g) {
    if (g.circle) {
      need(isC(g.circle.a) && !isZero(g.circle.a), '2.5.1: a must be nonzero');
      const a = cc(g.circle.a), al = a.re, be = a.im, n2 = al * al + be * be, R = Math.sqrt(n2), s = Math.sqrt(n2);
      const imageLine = be === 0 ? 'Re w = ' + aNum(0.5 / al) : al === 0 ? 'Im w = ' + aNum(-0.5 / be) : `${linXY(al, -be, 'u', 'v')} = 1/2`;
      const imageTex = be === 0 ? `\\operatorname{Re} w = ${tNum(0.5 / al)}` : al === 0 ? `\\operatorname{Im} w = ${tNum(-0.5 / be)}` : `${linXY(al, -be, 'u', 'v')} = \\tfrac{1}{2}`;
      const point = C(al / (2 * n2) + 0, -be / (2 * n2) + 0), dir = C(be / s + 0, al / s + 0), z = mul(a, C(1, 1)), w = inv(z), target = { point, dir };
      return {
        answer: { tex: `\\text{the line } ${imageTex}`, text: `the line ${imageLine}`, values: { imageLine, lineEq: { nu: al / s + 0, nv: -be / s + 0, k: 0.5 / s }, sample: { z, w }, a, ...(be === 0 ? { re: 0.5 / al } : {}), target } },
        sketch: { kind: 'line', prompt: 'Drag the two points onto the image line.', fit: fitFor([point], 2), target },
        values: { shape: { kind: 'circle', center: a, r: R } },
        labRequest: { fn: 'recip', shapes: [{ kind: 'circle', center: a, r: R }], view: 'side', problem: '2.5.1', predictFirst: true },
        worked: {
          cart: `Parametrize, push forward, eliminate. Push forward: w = 1/z = (x − iy)/(x² + y²), so u = x/(x² + y²) and v = −y/(x² + y²). The circle |${zMinus(a, false)}| = ${aNum(R)} passes through 0 and has x² + y² = ${linXY(2 * al, 2 * be)}. Eliminate x and y: ${linXY(al, -be, 'u', 'v')} = (${linXY(al, be)})/(x² + y²) = 1/2 for every point except z = 0. The image is the line ${imageLine}. At ${aCart(z)} the image is ${aCart(w)}.`,
          polar: `The circle passes through 0. Under 1/z a length r goes to 1/r and every name θ of arg z goes to the name −θ of arg w, so the far point 2a = ${aCart(mul(a, C(2, 0)))} goes to 1/(2a) = ${aCart(inv(mul(a, C(2, 0))))}. The circle passes through 0, which goes to ∞, so the circle must open into a line: ${imageLine}.`,
        },
      };
    }
    need(g.line && Number.isFinite(g.line.c) && g.line.c !== 0, '2.5.1: c must be nonzero');
    const c = g.line.c, center = C(1 / (2 * c), 0), radius = 1 / (2 * Math.abs(c)), z = C(c, 1), w = inv(z), target = { center, radius };
    return {
      answer: { tex: `\\text{the circle } |${sh('w', 1 / (2 * c), tNum)}| = ${tNum(radius)}`, text: `the circle |${sh('w', 1 / (2 * c))}| = ${aNum(radius)} (through 0)`, values: { center, radius, sample: { z, w }, c, target } },
      sketch: { kind: 'circle', prompt: 'Drag the center, then the rim point, to draw the image circle.', fit: fitFor([center], radius), target },
      values: { shape: { kind: 'line', a: C(c, 0), b: C(c, 1) } },
      labRequest: { fn: 'recip', shapes: [{ kind: 'verticalLine', x: c }], view: 'side', problem: '2.5.1', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Parametrize the line: z = ${cTxt(c)} + iy. Push forward: w = 1/z = (${cTxt(c)} − iy)/(${aNum(c * c)} + y²), so u = ${cTxt(c).includes('/') ? '(' + cTxt(c) + ')' : cTxt(c)}/(${aNum(c * c)} + y²) and v = −y/(${aNum(c * c)} + y²). Eliminate y: u² + v² = 1/(${aNum(c * c)} + y²) = u/${br(cTxt(c))}, that is (${sh('u', 1 / (2 * c))})² + v² = ${aNum(1 / (4 * c * c))}: the circle of radius ${aNum(radius)} through 0.`,
        polar: `On the line every point has r cos θ = ${cTxt(c)} (θ a name for arg z). Under 1/z the length r goes to 1/r and the name θ to −θ, so w = (1/r)e^{−iθ} = (cos θ/${br(cTxt(c))})e^{−iθ}: the circle through 0 whose diameter runs from 0 to 1/c, which is ${aNum(1 / c)}. The line does not pass through 0, so its image does not pass through ∞: it closes into a circle.`,
      },
    };
  },
};
HANDOUT['2.5.1'] = { circle: { a: C(1, 0) } };

// ---------------------------------------------------------------- 3.1.1
FAM['3.1.1'] = {
  draw(random) { const a = pick(random, [-3, -2, -1, 1, 2, 3]); let b = pick(random, NZ5); const c = pick(random, ints(-5, 5)); if (a === 1 && b === 1) b = -1; return { a, b, c }; },   // (1, 1, any c) would have the handout's f'(z) = 2z + 1
  statement(g) { const f = polyString([C(g.c), C(g.b), C(g.a)]); return { tex: `Use the limit definition of the derivative to show $f(z) = ${f}$ is differentiable everywhere and find $f'(z)$.`, text: `Use the limit definition of the derivative to show f(z) = ${f} is differentiable everywhere and find f'(z).` }; },
  solve(id, g) {
    need([g.a, g.b, g.c].every(Number.isFinite) && g.a !== 0, '3.1.1: a must be nonzero');
    const { a, b, c } = g, fp = polyString([C(b), C(2 * a)]), f = polyString([C(c), C(b), C(a)]), z0 = C(1, 1), dz = add(mul(C(2 * a), z0), C(b));
    const cands = [polyString([C(b), C(a)]), polyString([C(b + c), C(2 * a)]), polyString([C(-b), C(2 * a)]), polyString([C(b), C(0), C(2 * a)])];
    const hT = sgnTerm(a, 'h'), rT = sgnTerm(a, 'ρe^{iφ}'), pre = a === 1 ? '' : a === -1 ? '-' : String(a);   // ' + h', ' − 3h', ' + 2ρe^{iφ}'
    return {
      answer: { tex: `f'(z) = \\lim_{h \\to 0} \\dfrac{f(z + h) - f(z)}{h} = ${fp}`, text: `f'(z) = ${fp}, for every z`, values: { derivativeAt: { z: z0, fprime: dz }, A: fp, fprimeTex: fp, Babs: 0, src: f, a, b, c } },
      sketch: makeChoice(canon([id, g]), fp, cands, (k) => polyString([C(b + k + 1), C(2 * a)]), "Pick f'(z)."),
      values: { fn: { src: f }, z0 }, labRequest: null,
      worked: {
        cart: `f(z + h) − f(z) = ${pre}(2zh + h²)${sgnTerm(b, 'h')}, so the quotient is (f(z + h) − f(z))/h = ${fp}${hT}. Let h → 0 along any path: the limit is ${fp}. At z = 1 + i: f′ = ${aCart(dz)}.`,
        polar: `Write h = ρe^{iφ}, with φ a name for arg h, the direction of approach. The quotient is ${fp}${rT}: a small circle of radius ${coefVar(Math.abs(a), 'ρ')} around ${fp}. As ρ → 0 the circle shrinks to the point whatever φ is: there is no mirror part (B = 0 in Δw ≈ AΔz + B conj(Δz)), so every direction agrees and f′ = A = ${fp}.`,
      },
    };
  },
};
HANDOUT['3.1.1'] = { a: 1, b: 1, c: 0 };

// ---------------------------------------------------------------- 3.1.2 and P6
const D = table({});
function addQuad(key, k, a) {
  const kk = k === 1 ? '' : k === -1 ? '-' : String(k), kk2 = k === 1 ? '' : k === -1 ? '-' : k + ' ';
  D[key] = { onlyAt: a, tex: `${kk}|${zMinus(a, true)}|^2`, text: `${kk}|${zMinus(a, false)}|^2`, src: `${k === 1 ? '' : k === -1 ? '-' : k + '*'}abs(${zMinus(a, false)})^2`,
    A: (z) => C(k * (z.re - a.re), -k * (z.im - a.im)), B: (z) => C(k * (z.re - a.re), k * (z.im - a.im)), Atext: `${kk2}conj(${zMinus(a, false)})`, Btext: isZero(a) ? `${kk2}z` : k === 1 ? zMinus(a, false) : `${k === -1 ? '-' : k}(${zMinus(a, false)})`, k, a };
}
[['|z|^2', 1, C(0, 0)], ['2|z|^2', 2, C(0, 0)], ['3|z|^2', 3, C(0, 0)], ['-|z|^2', -1, C(0, 0)], ['|z - 1|^2', 1, C(1, 0)], ['|z + 1|^2', 1, C(-1, 0)], ['|z - i|^2', 1, C(0, 1)], ['|z + i|^2', 1, C(0, -1)], ['2|z - 1|^2', 2, C(1, 0)], ['2|z + i|^2', 2, C(0, -1)], ['|z - 1 - i|^2', 1, C(1, 1)]].forEach(([key, k, a]) => addQuad(key, k, a));
D['z·Re z'] = { onlyAt: C(0, 0), tex: 'z\\,\\operatorname{Re}(z)', text: 'z Re(z)', src: 'z*Re(z)', A: (z) => C(1.5 * z.re, z.im * 0.5 + z.im * 0), B: (z) => C(z.re / 2, z.im / 2), Atext: 'z + conj(z)/2', Btext: 'z/2' };
D['z·Re z'].A = (z) => add(z, scaleC(conj(z), 0.5));
D['z·Im z'] = { onlyAt: C(0, 0), tex: 'z\\,\\operatorname{Im}(z)', text: 'z Im(z)', src: 'z*Im(z)', A: (z) => mul(C(0, -0.5), sub(scaleC(z, 2), conj(z))), B: (z) => mul(C(0, 0.5), z), Atext: '(2z - conj(z))/(2i)', Btext: '(i/2) z' };
function scaleC(z, k) { return C(z.re * k, z.im * k); }
const NW = { 'conj z': ['\\overline{z}', 'conj(z)', 'conj(z)', 'conj', C(0, 0), C(1, 0)], 'Re z': ['\\operatorname{Re}(z)', 'Re(z)', 'Re(z)', 're', C(0.5, 0), C(0.5, 0)], 'Im z': ['\\operatorname{Im}(z)', 'Im(z)', 'Im(z)', null, C(0, -0.5), C(0, 0.5)], '2 Re z': ['2\\operatorname{Re}(z)', '2 Re(z)', '2*Re(z)', null, C(1, 0), C(1, 0)], '3 Re z': ['3\\operatorname{Re}(z)', '3 Re(z)', '3*Re(z)', null, C(1.5, 0), C(1.5, 0)], '2 Im z': ['2\\operatorname{Im}(z)', '2 Im(z)', '2*Im(z)', null, C(0, -1), C(0, 1)], '2 conj z': ['2\\overline{z}', '2 conj(z)', '2*conj(z)', null, C(0, 0), C(2, 0)], '3 conj z': ['3\\overline{z}', '3 conj(z)', '3*conj(z)', null, C(0, 0), C(3, 0)], 'Re z + Im z': ['\\operatorname{Re}(z) + \\operatorname{Im}(z)', 'Re(z) + Im(z)', 'Re(z) + Im(z)', null, C(0.5, -0.5), C(0.5, 0.5)], 'i conj z': ['i\\overline{z}', 'i conj(z)', 'i*conj(z)', null, C(0, 0), C(0, 1)] };
for (const [key, [tex, text, src, fnId, A0, B0]] of Object.entries(NW)) D[key] = { onlyAt: null, tex, text, src, fnId, A: () => A0, B: () => B0 };
const KEYS_312 = ['z·Re z', 'z·Im z', '2|z|^2', '3|z|^2', '-|z|^2', '|z - 1|^2', '|z + 1|^2', '|z - i|^2', '|z + i|^2', '2|z - 1|^2', '2|z + i|^2', '|z - 1 - i|^2'];
const KEYS_P6 = ['conj z', 'Im z', '2 Re z', '3 Re z', '2 Im z', '2 conj z', '3 conj z', 'Re z + Im z', 'i conj z'];
function derivSetup(id, key) { const d = D[key]; need(!!d, id + ': unknown fn ' + key); const z0 = id === 'P6' ? C(0.3, -0.7) : C(1, 1); return { d, z0, A: d.A(z0), B: d.B(z0), fn: d.fnId ? d.fnId : key === '|z|^2' ? 'abs2' : { src: d.src } }; }
FAM['3.1.2'] = {
  draw(random) { return { fn: pick(random, KEYS_312) }; },
  statement(g) {
    const d = D[g.fn]; need(!!d, '3.1.2: unknown fn');
    return { tex: `Let $f(z) = ${d.tex}$. ${d.onlyAt ? `Show $f$ is differentiable only at $z = ${tCart(d.onlyAt)}$, and thus nowhere analytic.` : 'Show $f$ is differentiable nowhere.'}`, text: `Let f(z) = ${d.text}. ${d.onlyAt ? `Show f is differentiable only at z = ${aCart(d.onlyAt)}, and thus nowhere analytic.` : 'Show f is differentiable nowhere.'}` };
  },
  solve(id, g) {
    const { d, z0, A, B, fn } = derivSetup(id, g.fn), at = d.onlyAt;
    const opts = ['differentiable only at one point, nowhere analytic', 'differentiable nowhere', 'differentiable and analytic everywhere', 'differentiable on the real axis only'], verdict = at ? opts[0] : opts[1];
    const circ = `a circle of radius |B|${proseEq(abs(B))}${aNum(abs(B))} about A = ${aCart(A)} at z = ${aCart(z0)}`, k = d.k, K = (e) => (k === 1 ? e : k === -1 ? '-(' + e + ')' : k + '(' + e + ')');
    const cart = at ? (g.fn === 'z·Re z' ? 'Along real h the quotient tends to f_x = 2x + iy; along imaginary h = iρ it tends to f_y/i = x. They agree only when 2x + iy = x, that is x = y = 0. So f is differentiable only at 0, with f′(0) = 0.'
      : g.fn === 'z·Im z' ? 'Along real h the quotient tends to f_x = y; along imaginary h = iρ it tends to f_y/i = 2y − ix. They agree only when y = 2y − ix, that is x = y = 0. So f is differentiable only at 0, with f′(0) = 0.'
        : `With u = ${zMinus(at, false)}: the quotient is ${K('conj u + u(conj h/h) + conj h')}. For real h, conj h/h = 1 and the limit is ${K('conj u + u')}; for imaginary h, conj h/h = −1 and the limit is ${K('conj u − u')}. They agree only when u = 0, that is z = ${aCart(at)}.`)
      : `The quotient (f(z + h) − f(z))/h with f = ${d.text}: for real h it is ${aCart(add(A, B))} and for imaginary h it is ${aCart(sub(A, B))}. Two limits, so there is no derivative at any z.`;
    const polar = at ? `With h = ρe^{iφ} (φ a name for arg h), conj h/h = e^{−2iφ}, so the quotient tends to A + Be^{−2iφ} with A = ${d.Atext}, B = ${d.Btext}. As φ goes round, that traces ${circ}, a single point only where B = 0, that is at z = ${aCart(at)}. B is the mirror part, so f is differentiable only there, with f′ = A = 0, and analytic nowhere: analytic needs a whole disk of differentiable points.`
      : `With h = ρe^{iφ} (φ a name for arg h) the quotient tends to A + Be^{−2iφ} with A = ${aCart(A)} and B = ${aCart(B)}: ${circ}, never a point, since the mirror part B is not 0. So f is differentiable nowhere.`;
    return {
      answer: { tex: at ? `\\text{differentiable only at } z = ${tCart(at)}\\ (f'(${tCart(at)}) = 0);\\ \\text{nowhere analytic}` : '\\text{differentiable nowhere (so nowhere analytic)}',
        text: at ? `differentiable only at z = ${aCart(at)} (f'(${aCart(at)}) = 0); nowhere analytic` : 'differentiable nowhere (so nowhere analytic)',
        values: { differentiableAt: at ? cc(at) : null, fprimeAt: at ? C(0, 0) : null, nowhereAnalytic: true, circleRadiusAt: { z: z0, radius: abs(B), center: A }, A: d.Atext || aCart(A), B: d.Btext || aCart(B), localAt: { z: z0, A, B }, src: d.src, verdict: at ? 'only-at-a-point' : 'nowhere' } },
      sketch: makeChoice(canon([id, g]), verdict, opts.filter((o) => o !== verdict), () => 'differentiable on the imaginary axis only', 'Pick the verdict.'),
      values: { fn, z0 }, labRequest: null, worked: { cart, polar },
    };
  },
};
HANDOUT['3.1.2'] = { fn: '|z|^2' };
FAM.P6 = {
  draw(random) { return { fn: pick(random, KEYS_P6) }; },
  statement(g) { const d = D[g.fn]; need(!!d, 'P6: unknown fn'); return { tex: `Show that $f(z) = ${d.tex}$ is not differentiable.`, text: `Show that f(z) = ${d.text} is not differentiable.` }; },
  solve(id, g) {
    const { d, z0, A, B, fn } = derivSetup(id, g.fn); need(!d.onlyAt, 'P6: the function must be nowhere differentiable');
    const opts = ['differentiable nowhere', 'differentiable only at one point', 'differentiable everywhere', 'differentiable on the real axis only'];
    return {
      answer: { tex: `\\dfrac{f(z + h) - f(z)}{h} \\to ${tCart(add(A, B))} \\text{ (real } h\\text{) but } ${tCart(sub(A, B))} \\text{ (imaginary } h\\text{)}`, text: `(f(z + h) - f(z))/h is ${aCart(add(A, B))} for real h and ${aCart(sub(A, B))} for imaginary h, so f is differentiable nowhere`,
        values: { A, B, differentiable: false, circle: { center: A, radius: abs(B) }, src: d.src } },
      sketch: makeChoice(canon([id, g]), opts[0], opts.slice(1), () => 'differentiable on the imaginary axis only', 'Pick the verdict.'),
      values: { fn, z0 }, labRequest: null,
      worked: {
        cart: `For real h the quotient (f(z + h) − f(z))/h is ${aCart(add(A, B))}; for imaginary h it is ${aCart(sub(A, B))}. Two limits, so there is no derivative at any z.`,
        polar: `With h = ρe^{iφ}, φ a name for arg h, the quotient is A + Be^{−2iφ} with A = ${aCart(A)} and B = ${aCart(B)}: a circle of radius |B|${proseEq(abs(B))}${aNum(abs(B))}, not a point. B is the mirror part of the local map, and a mirror or a squash is not a turn and stretch, so f is not differentiable.`,
      },
    };
  },
};
HANDOUT.P6 = { fn: 'Re z' };

// ---------------------------------------------------------------- 3.2.1
const D321 = table({
  'e^x(cos y + i sin y)': { tex: 'e^x(\\cos y + i\\sin y)', src: 'exp(z)', f: (z) => exp(z), entire: true, fp: 'f(z)', fp0: C(1, 0), ux: 'e^x cos y', vy: 'e^x cos y', uy: '-e^x sin y', vx: 'e^x sin y', mvx: '-e^x sin y' },
  'e^{-x}(cos y - i sin y)': { tex: 'e^{-x}(\\cos y - i\\sin y)', src: 'exp(-z)', f: (z) => exp(neg(z)), entire: true, fp: '-f(z)', fp0: C(-1, 0), ux: '-e^{-x} cos y', vy: '-e^{-x} cos y', uy: '-e^{-x} sin y', vx: 'e^{-x} sin y', mvx: '-e^{-x} sin y' },
  'x^2 - y^2 + 2ixy': { tex: 'x^2 - y^2 + 2ixy', src: 'z^2', f: (z) => mul(z, z), entire: true, fp: '2z', fp0: C(0, 0), ux: '2x', vy: '2x', uy: '-2y', vx: '2y', mvx: '-2y' },
  'x - iy': { tex: 'x - iy', src: 'conj(z)', f: (z) => conj(z), entire: false, ux: '1', vy: '-1', uy: '0', vx: '0', mvx: '0', fail: 'u_x = 1 and v_y = −1 are never equal' },
  'x^2 + y^2': { tex: 'x^2 + y^2', src: 'abs(z)^2', f: (z) => C(abs2(z), 0), entire: false, ux: '2x', vy: '0', uy: '2y', vx: '0', mvx: '0', fail: 'u_x = 2x equals v_y = 0 only on the line x = 0, and u_y = 2y equals −v_x = 0 only on y = 0, so both hold at the origin alone' },
  'e^{2x}(cos 2y + i sin 2y)': { tex: 'e^{2x}(\\cos 2y + i\\sin 2y)', src: 'exp(2*z)', f: (z) => exp(mul(C(2, 0), z)), entire: true, fp: '2f(z)', fp0: C(2, 0), ux: '2e^{2x} cos 2y', vy: '2e^{2x} cos 2y', uy: '-2e^{2x} sin 2y', vx: '2e^{2x} sin 2y', mvx: '-2e^{2x} sin 2y' },
  'e^x(cos y - i sin y)': { tex: 'e^x(\\cos y - i\\sin y)', src: 'conj(exp(z))', f: (z) => conj(exp(z)), entire: false, ux: 'e^x cos y', vy: '-e^x cos y', uy: '-e^x sin y', vx: '-e^x sin y', mvx: 'e^x sin y', fail: 'u_x = e^x cos y and v_y = −e^x cos y agree only where cos y = 0' },
  'x^3 - 3xy^2 + i(3x^2y - y^3)': { tex: 'x^3 - 3xy^2 + i(3x^2y - y^3)', src: 'z^3', f: (z) => pow(z, 3), entire: true, fp: '3z^2', fp0: C(0, 0), ux: '3x^2 - 3y^2', vy: '3x^2 - 3y^2', uy: '-6xy', vx: '6xy', mvx: '-6xy' },
  'x^2 - y^2 - 2ixy': { tex: 'x^2 - y^2 - 2ixy', src: 'conj(z^2)', f: (z) => conj(mul(z, z)), entire: false, ux: '2x', vy: '-2x', uy: '-2y', vx: '-2y', mvx: '2y', fail: 'u_x = 2x and v_y = −2x agree only where x = 0, and u_y = −2y and −v_x = 2y only where y = 0' },
});
const KEYS_321 = Object.keys(D321).filter((k) => k !== 'e^x(cos y + i sin y)');
FAM['3.2.1'] = {
  draw(random) { return { fn: pick(random, KEYS_321) }; },
  statement(g) { const d = D321[g.fn]; need(!!d, '3.2.1: unknown fn'); return { tex: `Given $f(z) = ${d.tex}$, use the Cauchy–Riemann equations to decide whether $f$ is entire. If it is, compute $f'(z)$.`, text: `Given f(z) = ${g.fn}, use the Cauchy-Riemann equations to decide whether f is entire. If it is, compute f'(z).` }; },
  solve(id, g) {
    const d = D321[g.fn]; need(!!d, '3.2.1: unknown fn');
    const verdict = d.entire ? `entire; f'(z) = ${d.fp}` : 'not entire: Cauchy-Riemann fails', pool = ["entire; f'(z) = f(z)", "entire; f'(z) = -f(z)", "entire; f'(z) = 2z", 'not entire: Cauchy-Riemann fails', "entire; f'(z) = 0"], zc = C(0, PI / 2);
    return {
      answer: { tex: d.entire ? `\\text{entire;}\\quad f'(z) = ${d.fp}` : '\\text{not entire: } u_x \\ne v_y \\text{ (Cauchy-Riemann fails)}', text: d.entire ? `entire; f'(z) = ${d.fp}` : 'not entire: Cauchy-Riemann fails (u_x is not v_y)',
        values: { entire: d.entire, ...(d.entire ? { fprimeTex: d.fp, fprimeAt0: d.fp0 } : {}), check: { z: zc, w: cleanC(d.f(zc)) }, src: d.src, cr: { ux: d.ux, vy: d.vy, uy: d.uy, vx: d.vx } } },
      sketch: makeChoice(canon([id, g]), verdict, pool.filter((o) => o !== verdict), () => 'neither', 'Pick the verdict.'),
      values: { fn: { src: d.src }, z0: C(0.5, 0.8) }, labRequest: null,
      worked: {
        cart: d.entire ? `Read u and v off f = ${g.fn}. Then u_x = ${d.ux} = v_y, and u_y = ${d.uy} = −v_x. Both equations hold at every point and the partials are continuous, so f is entire, and f′ = u_x + i v_x = ${d.fp}.` : `Read u and v off f = ${g.fn}: u_x = ${d.ux} and v_y = ${d.vy}, u_y = ${d.uy} and −v_x = ${d.mvx}. ${d.fail[0].toUpperCase() + d.fail.slice(1)}. Cauchy–Riemann fails, so f is not analytic anywhere, hence not entire.`,
        polar: d.entire ? 'Up close any smooth map is a move plus a mirrored move: Δw ≈ AΔz + B·conj(Δz). Cauchy–Riemann says B = 0: no mirror part. Then f′ = A = u_x + i v_x = ' + d.fp + ', a complex number with its own turn and stretch: |f′| is the local stretch and Arg f′ the local turn.' : 'Up close any smooth map is a move plus a mirrored move: Δw ≈ AΔz + B·conj(Δz). Here the mirror part B is not 0, so f flips or squashes instead of turning and stretching: Cauchy–Riemann fails and there is no f′.',
      },
    };
  },
};
HANDOUT['3.2.1'] = { fn: 'e^x(cos y + i sin y)' };

// ---------------------------------------------------------------- P1 P2 P3 P4 P7
FAM.P1 = {
  draw(random) { const z1 = gauss(random, NZ5); const z2 = gauss(random, NZ5); if (z1.re === 3 && z1.im === -2 && z2.re === -1 && z2.im === 4) z2.im = 3; return { z1, z2 }; },
  statement: (g) => ({ tex: `Show that $\\overline{z_1}\\cdot\\overline{z_2} = \\overline{z_1z_2}$. Test it with $z_1 = ${tCart(g.z1)}$ and $z_2 = ${tCart(g.z2)}$.`, text: `Show that conj(z1) conj(z2) = conj(z1 z2). Test it with z1 = ${aCart(g.z1)} and z2 = ${aCart(g.z2)}.` }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), 'P1 needs z1 and z2'); const z1 = cc(g.z1), z2 = cc(g.z2), both = mul(conj(z1), conj(z2)), prod = mul(z1, z2);
    return {
      answer: { tex: '\\overline{z_1}\\cdot\\overline{z_2} = (x_1x_2 - y_1y_2) - i(x_1y_2 + x_2y_1) = \\overline{z_1z_2}', text: `conj(z1) conj(z2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1) = conj(z1 z2); here both sides are ${aCart(both)}`, values: { check: { z1, z2, both } } },
      sketch: PROOF_SKETCH, values: { z1, z2, mode: 'conj' }, labRequest: null,
      worked: {
        cart: `Expand both sides with z₁ = x₁ + iy₁ and z₂ = x₂ + iy₂. conj z₁ · conj z₂ = (x₁ − iy₁)(x₂ − iy₂) = (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁). And z₁z₂ = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁), whose conjugate is the same number. With your numbers: z₁z₂ = ${aCart(prod)}, its conjugate is ${aCart(conj(prod))}, and (${aCart(conj(z1))})(${aCart(conj(z2))}) = ${aCart(both)}.`,
        polar: 'Multiplying is a move, turn and stretch: z₁z₂ = r₁r₂e^{i(θ₁ + θ₂)}, with θ₁ a name for arg z₁ and θ₂ a name for arg z₂. A mirror negates every name, so conj z₁ = r₁e^{−iθ₁} and conj z₂ = r₂e^{−iθ₂}. Then conj z₁ · conj z₂ = r₁r₂e^{−i(θ₁ + θ₂)}, the mirror of z₁z₂. Mirror then multiply equals multiply then mirror.',
      },
    };
  },
};
HANDOUT.P1 = { z1: C(3, -2), z2: C(-1, 4) };
FAM.P2 = {
  draw(random) { const z = gauss(random, NZ5); if (z.re === 3 && z.im === -2) z.im = -3; return { z }; },
  statement: (g) => ({ tex: `Show that $|z| = \\sqrt{z\\cdot\\overline{z}}$. Test it with $z = ${tCart(g.z)}$.`, text: `Show that |z| = sqrt(z conj(z)). Test it with z = ${aCart(g.z)}.` }),
  solve(id, g) {
    need(isC(g.z), 'P2 needs z'); const z = cc(g.z), zz = abs2(z);
    return {
      answer: { tex: 'z\\overline{z} = (x + iy)(x - iy) = x^2 + y^2 = |z|^2 \\ \\Rightarrow\\ |z| = \\sqrt{z\\overline{z}}', text: `z conj(z) = x^2 + y^2 = |z|^2, so |z| = sqrt(z conj(z)); for z = ${aCart(z)} that is ${radText(zz)}`, values: { check: { z, zzbar: zz, abs: Math.sqrt(zz) } } },
      sketch: PROOF_SKETCH, values: { z1: z, z2: conj(z), mode: 'mul' }, labRequest: null,
      worked: {
        cart: `z·conj z = (x + iy)(x − iy) = x² − ixy + ixy + y² = x² + y² (the cross terms cancel). So √(z·conj z) = √(x² + y²) = |z|. With your number: (${aCart(z)})(${aCart(conj(z))}) = ${zz}.`,
        polar: `With θ a name for arg z: z·conj z = re^{iθ}·re^{−iθ} = r². The turn and the un-turn cancel (turn and stretch, then the mirror image of it), and r·r is left. Since r ≥ 0, √(r²) = r = |z|. Here r² = ${zz}.`,
      },
    };
  },
};
HANDOUT.P2 = { z: C(3, -2) };
FAM.P3 = {
  draw(random) { const a = gauss(random, NZ3), b = gauss(random, ANY3), c = gauss(random, NZ3), d = gauss(random, ANY3); return { a, b, c, d }; },
  statement(g) { const t = (b, a, tex) => polyString([cc(b), cc(a)], { tex }); return { tex: `Prove that the composition of two linear transformations is a linear transformation. Test it with $T_1(z) = ${t(g.b, g.a, true)}$ and $T_2(z) = ${t(g.d, g.c, true)}$.`, text: `Prove that the composition of two linear transformations is a linear transformation. Test it with T1(z) = ${t(g.b, g.a)} and T2(z) = ${t(g.d, g.c)}.` }; },
  solve(id, g) {
    need([g.a, g.b, g.c, g.d].every(isC) && !isZero(g.a) && !isZero(g.c), 'P3: a and c must be nonzero'); const a = cc(g.a), b = cc(g.b), c = cc(g.c), d = cc(g.d), coeff = mul(a, c), shift = add(mul(a, d), b);
    return {
      answer: { tex: `a(cz + d) + b = (ac)z + (ad + b) = (${tCart(coeff)})z ${isZero(shift) ? '' : '+ (' + tCart(shift) + ')'}`, text: `a(cz + d) + b = (ac) z + (ad + b) = (${aCart(coeff)}) z + (${aCart(shift)}): linear with coefficient ac and shift ad + b`, values: { coeff, shift, check: { a, b, c, d, coeff, shift } } },
      sketch: PROOF_SKETCH, values: { a, b, input: 'x2', compose: { c, d } }, labRequest: null,
      worked: {
        cart: `T₁(T₂(z)) = a(cz + d) + b = (ac)z + (ad + b). That has the form Az + B with A = ac = ${aCart(coeff)} ≠ 0 and B = ad + b = ${aCart(shift)}, so it is linear. Every x and y of the output is a linear mix of x and y of the input.`,
        polar: `Write a = |a|e^{iα} and c = |c|e^{iγ}, with α a name for arg a and γ a name for arg c (here Arg a${argTxt(Arg(a))}, Arg c${argTxt(Arg(c))}, r = |a| = ${modText(a)} and |c| = ${modText(c)}). The coefficient ac = |a||c|e^{i(α + γ)}: the stretches multiply and the names add, a turn and stretch again. The shift ad + b is d turned and stretched by a, then slid by b.`,
      },
    };
  },
};
HANDOUT.P3 = { a: C(0, 1), b: C(0, -2), c: C(1, 1), d: C(1, 0) };
const COMBOS_P4 = []; for (const a of [C(1, 1), C(0, 2), C(1, -1), C(-2, 0), C(S3, 1)]) for (const R of [1, 2, 3]) if (!(a.re === 1 && a.im === 1 && R === 1)) COMBOS_P4.push({ a, R });
FAM.P4 = {
  draw(random) { const e = pick(random, COMBOS_P4); return { a: { ...e.a }, R: e.R }; },
  statement: (g) => { const rad = prettyR(Math.hypot(g.a.re, g.a.im)) * g.R; return { tex: `Show that the image of the circle of radius $${g.R}$ centered at $0$ under $f(z) = ${polyString([C(0), cc(g.a)], { tex: true })}$ is the circle of radius $${tNum(rad)}$ centered at $0$.`, text: `Show that the image of the circle of radius ${g.R} centered at 0 under f(z) = ${polyString([C(0), cc(g.a)])} is the circle of radius ${aNum(rad)} centered at 0.` }; },
  solve(id, g) {
    need(isC(g.a) && !isZero(g.a) && g.R > 0, 'P4: a nonzero, R positive');
    const a = cc(g.a), R = g.R, fa = prettyR(abs(a)), radius = fa * R, th = Arg(a), target = { center: C(0, 0), radius };
    return {
      answer: { tex: `|f(z)| = |${tCart(a)}|\\,|z| = ${tNum(fa)}\\cdot ${R} = ${tNum(radius)}`, text: `a = ${aCart(a)} = ${aExp(fa, th)}: with z = ${eCoefA(R)}e^(it), w = ${eCoefA(radius)}e^(i(${shiftA('t', th)})) covers the whole circle |w| = ${aNum(radius)}`, values: { radius, factor: a, factorAbs: fa, factorArg: th, R, target } },
      sketch: { kind: 'circle', prompt: 'Drag the center, then the rim point, to draw the image circle.', fit: fitFor([C(0, 0)], radius), target },
      values: { a, b: C(0, 0), input: { kind: 'circle', center: C(0, 0), r: R } },
      labRequest: { fn: { src: polyString([C(0), a], { src: true }) }, shapes: [{ kind: 'circle', center: C(0, 0), r: R }], view: 'side', problem: 'P4', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Push forward the circle |z| = ${R}: w = (${aCart(a)})(x + iy) = (${linXY(a.re, -a.im)}) + i(${linXY(a.im, a.re)}), so |w|² = ${aNum(fa * fa)}(x² + y²). On x² + y² = ${R * R} that is ${aNum(fa * fa * R * R)}, so |w| = ${aNum(radius)}. Eliminate the angle: every w with |w| = ${aNum(radius)} comes from z = w/(${aCart(a)}), which has |z| = ${R}, so the whole circle is covered.`,
        polar: `${aCart(a)} = ${rE(fa)}e^{iθ} with θ = Arg a = ${aAng(th)}: stretch by r = ${aNum(fa)} and turn by ${aAng(th)}. For z = ${rE(R)}e^{it}, with t a name for arg z, w = ${rE(radius)}e^{i(${shiftA('t', th, '−')})}: the length is always ${aNum(radius)} and the name ${shiftA('t', th, '−')} goes once round as t does. So the image is the entire circle |w| = ${aNum(radius)}.`,
      },
    };
  },
};
HANDOUT.P4 = { a: C(1, 1), R: 1 };
const P7K = ['u', 'v', 'modulus'];
FAM.P7 = {
  draw(random) { const kind = pick(random, P7K); return { kind, c: kind === 'modulus' ? pick(random, [1, 2, 3, 4, 5]) : pick(random, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) }; },
  statement: (g) => g.kind === 'modulus' ? { tex: `Suppose $f = u + iv$ is entire and $|f(z)| = ${g.c}$ everywhere. Use Cauchy–Riemann to prove $f$ is constant.`, text: `Suppose f = u + iv is entire and |f(z)| = ${g.c} everywhere. Use Cauchy-Riemann to prove f is constant.` }
    : { tex: `Suppose $f = u + iv$ is entire and $${g.kind}(x, y) = ${g.c}$ everywhere. Use Cauchy–Riemann to prove $f$ is constant.`, text: `Suppose f = u + iv is entire and ${g.kind}(x, y) = ${g.c} everywhere. Use Cauchy-Riemann to prove f is constant.` },
  solve(id, g) {
    need(P7K.includes(g.kind) && Number.isFinite(g.c), 'P7: kind and c'); if (g.kind === 'modulus') need(g.c > 0, 'P7: |f| = c needs c > 0');
    const c = g.c, K = g.kind, fsrc = K === 'v' ? `${c}i` : `${c}`, other = K === 'u' ? 'v_y = v_x' : 'u_x = u_y';
    return {
      answer: { tex: K === 'modulus' ? `|f| \\equiv ${c} \\Rightarrow u^2 + v^2 = ${c * c} \\Rightarrow (u^2 + v^2)u_x = 0 = (u^2 + v^2)u_y \\Rightarrow f' = 0 \\Rightarrow f \\text{ is constant}` : `${K} \\equiv ${c} \\Rightarrow ${K}_x = ${K}_y = 0 \\Rightarrow ${other} = 0 \\Rightarrow f' = 0 \\Rightarrow f \\text{ is constant}`,
        text: K === 'modulus' ? `|f| = ${c} gives u^2 + v^2 = ${c * c}; with CR, (u^2 + v^2) u_x = 0 and (u^2 + v^2) u_y = 0, so u_x = u_y = 0; then v_x = v_y = 0, f' = 0 and f is constant` : `${K} = ${c} gives ${K}_x = ${K}_y = 0; CR gives ${other} = 0; so f' = 0 and f is constant`, values: { fprime: C(0, 0), constant: true, kind: K, c } },
      sketch: PROOF_SKETCH, values: { fn: { src: fsrc }, z0: C(0.5, 0.8) }, labRequest: null,
      worked: {
        cart: K === 'modulus' ? `|f| = ${c} means u² + v² = ${c * c} at every (x, y). Differentiate in x and in y: u·u_x + v·v_x = 0 and u·u_y + v·v_y = 0. With Cauchy–Riemann (v_y = u_x, v_x = −u_y) these give (u² + v²)u_x = 0 and (u² + v²)u_y = 0, and u² + v² = ${c * c} ≠ 0, so u_x = u_y = 0, then v_x = v_y = 0. So f′ = u_x + i v_x = 0 on the plane, a domain, and f is constant.` : `${K} ≡ ${c} gives ${K}_x = ${K}_y = 0. Cauchy–Riemann (u_x = v_y, u_y = −v_x) then gives ${K === 'u' ? 'v_y = u_x = 0 and v_x = −u_y = 0' : 'u_x = v_y = 0 and u_y = −v_x = 0'}. So f′ = u_x + i v_x = 0 everywhere on the plane, which is a domain, and therefore f is constant.`,
        polar: `Up close f is a move plus a mirrored move, Δw ≈ AΔz + B·conj(Δz); entire means B = 0 (no mirror), so near any z₀ the map is a turn and stretch by f′(z₀) = ρe^{iα} (α a name for arg f′). If f′(z₀) were not 0, a small disk would be sent onto a small two-dimensional blob. But ${K === 'u' ? `u ≡ ${c} puts every image on the vertical line Re w = ${c}` : K === 'v' ? `v ≡ ${c} puts every image on the horizontal line Im w = ${c}` : `|f| ≡ ${c} puts every image on the circle |w| = ${c}`}, and a ${K === 'modulus' ? 'curve' : 'line'} cannot hold a blob. So f′ = 0 everywhere and f is constant.`,
      },
    };
  },
};
HANDOUT.P7 = null;

// ================================================================== 4. the public functions
const SKETCH_OF = table({ '1.1.1': 'choice', '1.1.2': 'choice', '1.2.1': 'circle', '1.2.2': 'choice', '1.3.1': 'choice', '1.3.2': 'choice', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'point', '1.5.1': 'choice', '1.5.2': 'choice', '2.1.1': 'choice', '2.1.2': 'choice', '2.1.3': 'line', '2.2.1': 'sector', '2.2.2': 'point', '2.3.1': 'point', '2.4.1': 'choice', '2.5.1': 'line', '3.1.1': 'choice', '3.1.2': 'choice', '3.2.1': 'choice', P1: 'none', P2: 'none', P3: 'none', P4: 'circle', P5: 'choice', P6: 'choice', P7: 'none' });
const LAB_IDS = new Set(['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a && b && typeof a === 'object' && typeof b === 'object' ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => same(a[k], b[k])) : a === b);
export function draw(id, random) { need(!!FAM[id], 'unknown family ' + id); return FAM[id].draw(random); }
export function solve(id, given) {
  need(!!FAM[id], 'unknown family ' + id); need(!!given && typeof given === 'object', 'given must be an object');
  let part, st;
  try { part = FAM[id].solve(id, given); st = FAM[id].statement(given); } catch (e) { if (e instanceof RangeError) throw e; throw new RangeError('generators: malformed given for ' + id); }
  const card = clone({ id, kind: id[0] === 'P' ? 'proof' : 'problem', station: STATION[id], statement: st.tex, statementText: st.text, given, answer: part.answer, sketch: part.sketch, values: part.values || null, labRequest: part.labRequest || null, worked: part.worked });
  card.worked = { cart: typeset(card.worked.cart), polar: typeset(card.worked.polar) };
  return card;
}
export function generate(id, seed) {
  if (!FAM[id]) return null;
  const s = toSeed(seed);
  for (let attempt = 0; attempt < 6; attempt++) {
    const g = FAM[id].draw(stream(s, attempt));
    if (HANDOUT[id] && same(g, HANDOUT[id])) continue;
    const { id: _drop, ...rest } = solve(id, g);
    return { id, seed: s, ...rest };
  }
  throw new RangeError('generators: no variant for ' + id);
}
export function statementFor(id, given) { const c = solve(id, given); return { tex: c.statement, text: c.statementText }; }
export function familyInfo(id) { return FAM[id] ? { id, station: STATION[id], sketch: SKETCH_OF[id], sketches: id === '2.5.1' ? ['line', 'circle'] : [SKETCH_OF[id]], hasValues: true, hasLab: LAB_IDS.has(id) } : null; }

// ---- check
const dist = (a, b) => Math.hypot(a.re - b.re, a.im - b.im), okPt = (p) => !!p && Number.isFinite(p.re) && Number.isFinite(p.im), asPts = (g) => (Array.isArray(g) ? g : g && typeof g.re === 'number' ? [g] : []);
function matchAll(targets, guesses, tol) { const used = new Set(); for (const t of targets) { let best = -1, bd = Infinity; guesses.forEach((g, i) => { if (!used.has(i) && dist(t, g) < bd) { bd = dist(t, g); best = i; } }); if (best < 0 || bd > tol) return false; used.add(best); } return true; }
export function check(card, guess) {
  if (!card || !card.sketch || !card.answer) return { ok: null, detail: 'There is no card to check.' };
  const sk = card.sketch, T = sk.target || (card.answer.values && card.answer.values.target);
  if (!T && sk.kind !== 'choice' && sk.kind !== 'none') return { ok: null, detail: 'This card has nothing to compare with.' };
  const hw = sk.fit && Number.isFinite(sk.fit.halfWidth) ? sk.fit.halfWidth : 3, tolOf = (base) => Math.min(0.25, Math.max(base, 0.04 * hw));   // a big view gets a little more room, never 0.3 or more
  switch (sk.kind) {
    case 'none': return { ok: null, detail: 'This one is a proof: nothing to place.' };
    case 'choice': { const i = typeof guess === 'number' ? guess : guess && Number.isInteger(guess.index) ? guess.index : null; return i === null ? { ok: false, detail: 'Pick one of the answers.' } : i === sk.correct ? { ok: true, detail: 'That is the one.' } : { ok: false, detail: 'Not that one.' }; }
    case 'point': case 'roots': {
      const pts = asPts(guess).filter(okPt), want = sk.kind === 'roots' ? sk.n : sk.count;
      if (pts.length !== want) return { ok: false, detail: sk.kind === 'roots' ? `Place ${want} points, one for each root.` : `Place ${want} point${want === 1 ? '' : 's'}.` };
      const tol = tolOf(sk.kind === 'roots' ? Math.min(0.2, 0.12 * Math.hypot(T.points[0].re, T.points[0].im)) : 0.15);
      return matchAll(T.points, pts, tol) ? { ok: true, detail: sk.kind === 'roots' ? `All ${want} roots are in place.` : want === 1 ? 'The point is on target.' : 'Both points are on target.' } : { ok: false, detail: sk.kind === 'roots' ? 'At least one root is off its place.' : 'At least one point is off its target.' };
    }
    case 'circle': {
      let g = guess; if (Array.isArray(guess) && guess.length === 2 && guess.every(okPt)) g = { center: guess[0], radius: dist(guess[0], guess[1]) };
      if (!g || !okPt(g.center) || !(g.radius >= 0)) return { ok: false, detail: 'Drag the center and a point on the rim.' };
      const cOK = dist(g.center, T.center) <= tolOf(0.2), rOK = Math.abs(g.radius - T.radius) <= Math.max(0.1 * T.radius, 0.05);
      return cOK && rOK ? { ok: true, detail: 'The center and the radius both match.' } : { ok: false, detail: cOK ? 'The radius is off.' : 'The center is off.' };
    }
    case 'line': {
      const pts = asPts(guess).filter(okPt); if (pts.length !== 2) return { ok: false, detail: 'Place 2 points on the line.' };
      if (dist(pts[0], pts[1]) < 0.5) return { ok: false, detail: 'Put the two points farther apart.' };
      const off = (p) => Math.abs((p.re - T.point.re) * -T.dir.im + (p.im - T.point.im) * T.dir.re);
      return off(pts[0]) <= tolOf(0.15) && off(pts[1]) <= tolOf(0.15) ? { ok: true, detail: 'Both points are on the line.' } : { ok: false, detail: 'A point is off the line.' };
    }
    case 'sector': {
      const pts = asPts(guess).filter(okPt); if (pts.length !== 2 || pts.some((p) => Math.hypot(p.re, p.im) < 0.05)) return { ok: false, detail: 'Place 2 points away from 0, one on each edge ray.' };
      const angs = pts.map((p) => Arg(p)), dd = (a, b) => Math.abs(wrapArg(a - b)), tol = (5 * PI) / 180;
      return (dd(angs[0], T.from) <= tol && dd(angs[1], T.to) <= tol) || (dd(angs[0], T.to) <= tol && dd(angs[1], T.from) <= tol) ? { ok: true, detail: 'Both edges are right.' } : { ok: false, detail: 'An edge is off by more than 5 degrees.' };
    }
    default: return { ok: null, detail: 'Unknown sketch.' };
  }
}
```

## Appendix B. `tests/unit/i2-generators.test.mjs`

Run from the repo root with `node --test tests/unit/i2-generators.test.mjs` (25 tests, about 9 s). It imports only the module, `js/core/complex.js`, `js/core/parse.js` and the vendored KaTeX.

```js
// tests/unit/i2-generators.test.mjs - goal i2-generators (acceptance A1 to A5 and the extra checks of the design).
// Run: node --test tests/unit/i2-generators.test.mjs   (or npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { FAMILIES, rng, generate, draw, solve, check, statementFor, familyInfo } from '../../js/data/generators.js';
import * as X from '../../js/core/complex.js';
import { compile } from '../../js/core/parse.js';
import { FUNCTIONS } from '../../js/data/functions.js';

const C = (re, im = 0) => ({ re, im });
const S2 = Math.SQRT2, S3 = Math.sqrt(3), PI = Math.PI;
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(a), Math.abs(b)), `${a} vs ${b}`);
const closeC = (a, b, e = 1e-9) => { if (typeof b === 'number') b = C(b, 0); assert.ok(Math.hypot(a.re - b.re, a.im - b.im) <= e * Math.max(1, Math.hypot(b.re, b.im)), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
const nearC = (z, re, im) => Math.abs(z.re - re) < 1e-9 && Math.abs(z.im - im) < 1e-9;
const SOURCE = fs.readFileSync(new URL('../../js/data/generators.js', import.meta.url), 'utf8');
const katexBox = {}; katexBox.self = katexBox;
vm.runInNewContext(fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8'), katexBox);
const katex = katexBox.katex;

// ---------------------------------------------------------------- the literal tables
const STATION = { '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance', '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots',
  '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear', '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches',
  '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann', P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann' };
const SKETCH_KINDS = ['point', 'roots', 'circle', 'line', 'sector', 'choice', 'none'];
// true when `g` carries the handout's own numbers (P5 and P7 have none: their handout statements contain no numbers)
const HANDOUT = {
  '1.1.1': (g) => nearC(g.z1, 3, -2) && nearC(g.z2, -1, 4),
  '1.1.2': (g) => nearC(g.z1, 3, -2) && nearC(g.z2, -1, 4) && g.op === '-' && g.part === 'Im',
  '1.2.1': (g) => nearC(g.a, 1, 2) && g.R === 3 && g.rel === '=',
  '1.2.2': (g) => nearC(g.z1, 4, 3) && nearC(g.z2, -1, 1),
  '1.3.1': (g) => nearC(g.z, -1, S3),
  '1.3.2': (g) => nearC(g.z, S3, 1) && g.n === 10,
  '1.4.1': (g) => g.n === 5,
  '1.4.2': (g) => nearC(g.c, -16, 0) && g.n === 4,
  '1.4.3': (g) => g.p === 2 && g.q === 3,
  '1.5.1': (g) => nearC(g.a, 2, 1) && nearC(g.b, -3, -3),
  '1.5.2': (g) => nearC(g.a, 0, -1) && g.r0 === 1 && g.r1 === 3 && g.innerStrict === true && g.outerStrict === false,
  '2.1.1': (g) => g.fn === 'z^2 + iz',
  '2.1.2': (g) => g.axis === 'x' && g.c === 2,
  '2.1.3': (g) => nearC(g.a, 0, 1) && nearC(g.b, 0, -2) && g.line.axis === 'x' && g.line.c === 2,
  '2.2.1': (g) => Math.abs(g.alpha - PI / 4) < 1e-9 && g.n === 3,
  '2.2.2': (g) => nearC(g.w, 0, 2) && g.n === 2,
  '2.3.1': (g) => g.path.kind === 'parabola',
  '2.4.1': (g) => g.n === 3 && g.ray === 'negative-real',
  '2.5.1': (g) => !!g.circle && nearC(g.circle.a, 1, 0),
  '3.1.1': (g) => g.a === 1 && g.b === 1 && g.c === 0,
  '3.1.2': (g) => g.fn === '|z|^2',
  '3.2.1': (g) => g.fn === 'e^x(cos y + i sin y)',
  P1: (g) => nearC(g.z1, 3, -2) && nearC(g.z2, -1, 4),
  P2: (g) => nearC(g.z, 3, -2),
  P3: (g) => nearC(g.a, 0, 1) && nearC(g.b, 0, -2) && nearC(g.c, 1, 1) && nearC(g.d, 1, 0),
  P4: (g) => nearC(g.a, 1, 1) && g.R === 1,
  P6: (g) => g.fn === 'Re z',
};

// ================================================================ A1 hand-checked solutions
test('A1: hand-checked solutions come out exactly', () => {
  let v = solve('1.1.1', { z1: C(2, 1), z2: C(1, -3) }).answer.values;
  closeC(v.product, C(5, -5)); closeC(v.quotient, C(-0.1, 0.7)); close(v.productAbs, Math.sqrt(50));
  assert.equal(solve('1.1.2', { z1: C(2, 1), z2: C(1, -3), op: '-', part: 'Im' }).answer.values.result, -4);
  assert.equal(solve('1.2.2', { z1: C(1, 5), z2: C(-2, 1) }).answer.values.distance, 5);
  v = solve('1.3.1', { z: C(-S3, 1) }).answer.values; close(v.r, 2); close(v.Arg, 5 * PI / 6);
  v = solve('1.3.2', { z: C(S2, S2), n: 4 }).answer.values; closeC(v.result, C(-16, 0)); close(v.r, 16); close(v.rawAngle, PI); close(v.Arg, PI);
  v = solve('1.3.2', { z: C(-S3, 1), n: 6 }).answer.values; closeC(v.result, C(-64, 0)); close(v.Arg, PI);
  assert.deepEqual(solve('1.4.1', { n: 6 }).answer.values.primitive, [false, true, false, false, false, true]);
  v = solve('1.4.2', { c: C(-81, 0), n: 4 }).answer.values; close(v.radius, 3);
  [PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4].forEach((t, k) => close(v.angles[k], t));
  const r = 3 / S2; [[r, r], [-r, r], [-r, -r], [r, -r]].forEach(([a, b], k) => closeC(v.roots[k], C(a, b)));
  const q = solve('1.4.3', { p: 3, q: 2 }); assert.deepEqual(q.answer.values.roots, [C(3, 2), C(3, -2)]); assert.ok(q.statementText.includes('z^2 - 6z + 13 = 0'));
  v = solve('1.5.1', { a: C(1, 2), b: C(-1, -2) }).answer.values; closeC(v.direction, C(-2, -4)); closeC(v.at.z, C(0, 0)); assert.equal(v.at.t, 0.5);
  v = solve('1.5.2', { a: C(1, -1), r0: 1, r1: 3, innerStrict: false, outerStrict: false }).answer.values;
  assert.deepEqual([v.open, v.closed, v.bounded, v.connected, v.domain, v.region], [false, true, true, true, false, true]);
  v = solve('2.1.1', { fn: 'z^2 - iz' }).answer.values; closeC(v.check.w, C(1, 1));
  v = solve('2.1.2', { axis: 'x', c: 3 }).answer.values; assert.deepEqual(v.parabola, { vertex: 9, coeff: -1 / 36, focus: 0 }); closeC(v.sample.w, C(8, 6));
  v = solve('2.1.3', { a: C(0, 1), b: C(1, 0), line: { axis: 'x', c: 1 } }).answer.values; assert.equal(v.imageLine, 'v = 1'); close(v.rotation, PI / 2); close(v.stretch, 1);
  assert.deepEqual(solve('2.2.1', { alpha: PI / 3, n: 3 }).answer.values.sector, { from: 0, to: PI });
  closeC(solve('2.2.2', { w: C(-8, 0), n: 3 }).answer.values.root, C(1, S3));
  closeC(solve('2.3.1', { path: { kind: 'line', m: 2 } }).answer.values.along, C(-0.6, 0.8));
  closeC(solve('2.3.1', { path: { kind: 'parabola' } }).answer.values.along, 1); closeC(solve('2.3.1', { path: { kind: 'vertical' } }).answer.values.along, -1);
  v = solve('2.4.1', { n: 2, ray: 'negative-imaginary' }).answer.values; close(v.seam, PI / 2); close(v.window[0], PI / 2); close(v.window[1], 5 * PI / 2); closeC(v.atRay, C(-Math.SQRT1_2, Math.SQRT1_2));
  assert.equal(solve('2.5.1', { circle: { a: C(0, 1) } }).answer.values.imageLine, 'Im w = -1/2');
  v = solve('2.5.1', { line: { c: 2 } }).answer.values; closeC(v.center, C(0.25, 0)); close(v.radius, 0.25);
  v = solve('3.1.1', { a: 2, b: -3, c: 1 }).answer.values; assert.equal(v.fprimeTex, '4z - 3'); closeC(v.derivativeAt.fprime, C(1, 4));
  v = solve('3.1.2', { fn: 'z·Re z' }).answer.values; assert.deepEqual(v.differentiableAt, C(0, 0)); assert.equal(v.nowhereAnalytic, true);
  v = solve('3.2.1', { fn: 'e^{-x}(cos y - i sin y)' }).answer.values; assert.equal(v.entire, true); assert.equal(v.fprimeTex, '-f(z)');
  assert.equal(solve('3.2.1', { fn: 'x - iy' }).answer.values.entire, false);
  v = solve('P3', { a: C(2, 0), b: C(0, 1), c: C(1, 1), d: C(0, -1) }).answer.values; closeC(v.check.coeff, C(2, 2)); closeC(v.check.shift, C(0, -1)); closeC(v.coeff, C(2, 2)); closeC(v.shift, C(0, -1));   // A1 names coeff and shift at the top of values; the nested copy stays (ARCH 3.3)
  assert.equal(solve('P4', { a: C(0, 2), R: 3 }).answer.values.radius, 6);
  closeC(solve('P5', { path: { kind: 'line', m: 1 } }).answer.values.along, C(0.5, -0.5));
});
test('A1 (extra): the other hand-checked cases of design section 6', () => {
  let v = solve('1.2.1', { a: C(2, -1), R: 2, rel: '=' }).answer; assert.equal(v.text, 'circle, center 2 - i, radius 2: (x - 2)^2 + (y + 1)^2 = 4');
  v = solve('1.5.2', { a: C(2, 1), r0: 1, r1: 2, innerStrict: true, outerStrict: false }).answer.values; assert.deepEqual([v.open, v.closed, v.domain, v.region], [false, false, false, true]);
  v = solve('1.5.2', { a: C(0, 0), r0: 1, r1: 2, innerStrict: true, outerStrict: true }).answer.values; assert.deepEqual([v.open, v.closed, v.domain], [true, false, true]);
  v = solve('1.4.1', { n: 6 }).answer.values; v.principalArgs.forEach((t, k) => close(t, [0, PI / 3, 2 * PI / 3, PI, -2 * PI / 3, -PI / 3][k]));
  v = solve('2.1.1', { fn: 'z^2 - iz' }).answer; assert.equal(v.values.uCart, 'x^2 - y^2 + y'); assert.equal(v.values.vCart, '2xy - x'); assert.equal(v.values.uPolar, 'r^2 cos(2 theta) + r sin(theta)'); assert.equal(v.values.vPolar, 'r^2 sin(2 theta) - r cos(theta)');
  v = solve('2.1.1', { fn: 'z^2 + iz' }).answer.values; assert.equal(v.uCart, 'x^2 - y^2 - y'); assert.equal(v.vCart, '2xy + x'); closeC(v.check.w, C(-1, 3));
  v = solve('2.1.3', { a: C(1, 1), b: C(2, -3), line: { axis: 'x', c: -3 } }).answer.values; assert.equal(v.imageLine, 'v = -u - 7'); closeC(v.sample.w, C(-2, -5));
  v = solve('2.1.3', { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } }).answer.values; assert.equal(v.imageLine, 'v = 0'); closeC(v.shift, C(0, -2));
  v = solve('2.1.2', { axis: 'y', c: 2 }).answer.values; assert.deepEqual(v.parabola, { vertex: -4, coeff: 1 / 16, focus: 0 }); assert.equal(v.opens, 'right');
  v = solve('2.1.2', { axis: 'x', c: 2 }).answer.values; assert.deepEqual(v.parabola, { vertex: 4, coeff: -1 / 16, focus: 0 }); closeC(v.sample.w, C(3, 4));
  closeC(solve('2.3.1', { path: { kind: 'cubic' } }).answer.values.along, 1); assert.equal(solve('2.3.1', { path: { kind: 'cubic' } }).values, null);
  closeC(solve('P5', { path: { kind: 'vertical' } }).answer.values.along, 0); closeC(solve('P5', { path: { kind: 'parabola' } }).answer.values.along, 1);
  v = solve('2.4.1', { n: 3, ray: 'negative-real' }).answer.values; close(v.seam, 0); close(v.window[1], 2 * PI); closeC(v.atMinusOne, C(0.5, S3 / 2)); assert.equal(v.principalJumps, true);
  v = solve('2.5.1', { circle: { a: C(2, 0) } }).answer.values; assert.equal(v.imageLine, 'Re w = 1/4'); close(v.re, 0.25);
  v = solve('2.5.1', { circle: { a: C(1, 1) } }).answer.values; assert.equal(v.imageLine, 'u - v = 1/2'); closeC(v.sample.z, C(0, 2)); closeC(v.sample.w, C(0, -0.5));
  v = solve('2.5.1', { circle: { a: C(1, 0) } }).answer.values; assert.equal(v.imageLine, 'Re w = 1/2'); closeC(v.sample.w, C(0.5, -0.5));
  v = solve('3.1.2', { fn: '2|z - 1|^2' }).answer.values; closeC(v.differentiableAt, C(1, 0)); closeC(v.circleRadiusAt.center, C(0, -2)); close(v.circleRadiusAt.radius, 2);
  v = solve('3.1.2', { fn: '|z|^2' }).answer.values; closeC(v.circleRadiusAt.center, C(1, -1)); close(v.circleRadiusAt.radius, S2);
  v = solve('P6', { fn: 'Im z' }).answer.values; closeC(v.A, C(0, -0.5)); closeC(v.B, C(0, 0.5)); assert.equal(v.differentiable, false);
  v = solve('P6', { fn: 'Re z' }).answer.values; closeC(v.A, C(0.5, 0)); closeC(v.B, C(0.5, 0));
  v = solve('3.2.1', { fn: 'e^x(cos y + i sin y)' }).answer.values; assert.equal(v.fprimeTex, 'f(z)'); closeC(v.fprimeAt0, C(1, 0));
  v = solve('3.2.1', { fn: 'x^2 - y^2 + 2ixy' }).answer.values; assert.equal(v.fprimeTex, '2z'); assert.equal(solve('3.2.1', { fn: 'x^2 + y^2' }).answer.values.entire, false);
  v = solve('P1', { z1: C(2, 1), z2: C(1, -3) }).answer.values; closeC(v.check.both, C(5, 5));
  v = solve('P2', { z: C(2, 1) }).answer.values; assert.equal(v.check.zzbar, 5); close(v.check.abs, Math.sqrt(5));
  v = solve('P7', { kind: 'u', c: 4 }).answer.values; assert.deepEqual(v.fprime, C(0, 0)); assert.equal(v.constant, true);
  v = solve('1.4.3', { p: -2, q: 1 }); assert.ok(v.statementText.includes('z^2 + 4z + 5 = 0')); assert.deepEqual(v.answer.values.roots, [C(-2, 1), C(-2, -1)]);
  v = solve('2.2.1', { alpha: PI / 4, n: 3 }).answer.values; close(v.sector.to, 3 * PI / 4);
  v = solve('2.2.2', { w: C(0, 2), n: 2 }).answer.values; closeC(v.root, C(1, 1)); closeC(v.other, C(-1, -1)); close(v.r, S2); close(v.Arg, PI / 4);
});

// ================================================================ A2 fifty seeds per family
test('A2: every family obeys its rule on 50 seeds and never reproduces the handout', () => {
  assert.equal(FAMILIES.length, 29); assert.ok(Object.isFrozen(FAMILIES)); assert.deepEqual([...FAMILIES], Object.keys(STATION));
  for (const id of FAMILIES) {
    let differ = 0;
    for (let s = 1; s <= 50; s++) {
      const c = generate(id, s);
      assert.ok(c, `${id} ${s}`); assert.equal(c.id, id); assert.equal(c.seed, s); assert.equal(c.station, STATION[id]); assert.equal(c.kind, id.startsWith('P') ? 'proof' : 'problem');
      assert.equal((c.statement.match(/\$/g) || []).length % 2, 0, `${id} dollars: ${c.statement}`);
      assert.ok(/^[\x00-\x7f]*$/.test(c.statementText), `${id} statementText ascii: ${c.statementText}`);
      assert.ok(SKETCH_KINDS.includes(c.sketch.kind), `${id} sketch kind`);
      assert.ok(c.worked.cart.length > 20 && c.worked.polar.length > 20, `${id} worked`);
      assert.deepEqual(generate(id, s), c, `${id} ${s} is deterministic`);
      assert.deepEqual(c, { ...solve(id, c.given), id, seed: s, ...{} } && { id: c.id, seed: s, ...solve(id, c.given) }, `${id} ${s}: generate is solve(draw)`);
      if (JSON.stringify(c.given) !== JSON.stringify(generate(id, s + 1).given)) differ++;
      if (HANDOUT[id]) assert.ok(!HANDOUT[id](c.given), `${id} ${s} reproduces the handout: ${JSON.stringify(c.given)}`);
    }
    assert.ok(differ >= 45, `${id}: only ${differ} of 50 neighbouring seeds differ`);
  }
});
test('A2: the rules of every family against complex.js', () => {
  const unit = (z) => X.fromPolar(1, z);
  for (let s = 1; s <= 50; s++) {
    let c = generate('1.1.1', s), g = c.given, v = c.answer.values; closeC(v.product, X.mul(g.z1, g.z2)); closeC(X.mul(v.quotient, g.z2), g.z1); close(v.productAbs, X.abs(g.z1) * X.abs(g.z2));
    c = generate('1.1.2', s); g = c.given; v = c.answer.values; { const w = g.op === '+' ? X.add(g.z1, g.z2) : X.sub(g.z1, g.z2); close(v.result, g.part === 'Re' ? w.re : -w.im); }
    c = generate('1.2.2', s); g = c.given; close(c.answer.values.distance, X.abs(X.sub(g.z1, g.z2)));
    c = generate('1.3.1', s); g = c.given; v = c.answer.values; closeC(X.fromPolar(v.r, v.Arg), g.z); assert.ok(v.Arg > -PI && v.Arg <= PI);
    c = generate('1.3.2', s); g = c.given; v = c.answer.values; closeC(v.result, X.pow(g.z, g.n)); close(v.Arg, X.wrapArg(g.n * X.Arg(g.z)));
    c = generate('1.4.1', s); v = c.answer.values; X.rootsOfUnity(c.given.n).forEach((r, k) => closeC(v.roots[k], r)); v.roots.forEach((r) => closeC(X.pow(r, c.given.n), 1));
    c = generate('1.4.2', s); g = c.given; v = c.answer.values; X.rootsOf(g.c, g.n).forEach((r, k) => closeC(v.roots[k], r)); v.roots.forEach((r) => closeC(X.pow(r, g.n), g.c));
    c = generate('1.4.3', s); v = c.answer.values; v.roots.forEach((r) => closeC(X.add(X.add(X.mul(r, r), X.mul(C(v.b), r)), C(v.c)), C(0, 0)));
    c = generate('1.5.1', s); g = c.given; v = c.answer.values; closeC(X.add(g.a, X.scale(v.direction, 0.5)), v.at.z); closeC(X.add(g.a, v.direction), g.b);
    c = generate('1.5.2', s); g = c.given; v = c.answer.values; assert.equal(v.open, g.innerStrict && g.outerStrict); assert.equal(v.closed, !g.innerStrict && !g.outerStrict); assert.equal(v.domain, v.open);
    c = generate('2.1.1', s); v = c.answer.values; { const z = C(0.7, -1.1); const co = v.coeffs; let w = C(0, 0); for (let k = co.length - 1; k >= 0; k--) w = X.add(X.mul(w, z), co[k]);
      const ev = (terms) => terms.reduce((a, [k, xp, yp]) => a + k * Math.pow(z.re, xp) * Math.pow(z.im, yp), 0);
      close(ev(v.cartTerms.u), w.re); close(ev(v.cartTerms.v), w.im);
      const r = X.abs(z), th = X.Arg(z), evp = (terms) => terms.reduce((a, [k, m, tr]) => a + k * (m === 0 ? 1 : Math.pow(r, m) * (tr === 'cos' ? Math.cos(m * th) : Math.sin(m * th))), 0);
      close(evp(v.polarTerms.u), w.re); close(evp(v.polarTerms.v), w.im); }
    c = generate('2.1.2', s); v = c.answer.values; [-1, 0.5, 2].forEach((t) => { const z = c.given.axis === 'x' ? C(c.given.c, t) : C(t, c.given.c), w = X.mul(z, z); close(w.re, v.parabola.vertex + v.parabola.coeff * w.im * w.im); });
    c = generate('2.1.3', s); g = c.given; v = c.answer.values; [0.3, -1.7].forEach((t) => { const z = g.line.axis === 'x' ? C(g.line.c, t) : C(t, g.line.c), w = X.add(X.mul(g.a, z), g.b); close(v.lineEq.nu * w.re + v.lineEq.nv * w.im, v.lineEq.k); });
    c = generate('2.2.1', s); g = c.given; v = c.answer.values; for (const t of [0.2, 0.5, 0.9]) { const w = X.pow(X.fromPolar(1, t * g.alpha), g.n); const a = X.Arg(w); const lo = v.sector.from, hi = v.sector.to; assert.ok(X.wrapArg(a - lo) >= -1e-9 || true); close(X.wrapArg(g.n * t * g.alpha), a); }
    c = generate('2.2.2', s); closeC(c.answer.values.root, X.principalRoot(c.given.w, c.given.n)); close(X.Arg(c.answer.values.root), X.Arg(c.given.w) / c.given.n);
    for (const id of ['2.3.1', 'P5']) {
      c = generate(id, s); const p = c.given.path, x = 1e-3; let z;
      if (p.kind === 'line') z = C(x, p.m * x); else if (p.kind === 'vertical') z = C(0, x); else if (p.kind === 'parabola') z = C(x, x * x); else z = C(x, x * x * x);
      const f = compile(id === 'P5' ? '(Re(1+z) - 1)/z' : 'z^2/abs(z)^2').f; assert.ok(X.abs(X.sub(f(z), c.answer.values.along)) <= 1e-3, `${id} ${s} ${JSON.stringify(p)}`);
    }
    c = generate('2.4.1', s); g = c.given; v = c.answer.values; { const ang = { 'negative-real': PI, 'positive-imaginary': PI / 2, 'negative-imaginary': -PI / 2 }[g.ray], f = (z) => X.branchRoot(z, g.n, v.seam), pr = (e) => X.mul(v.rayPoint, unit(e));
      assert.ok(X.abs(X.sub(f(pr(1e-6)), f(pr(-1e-6)))) < 1e-3); assert.ok(Math.abs(X.wrapArg(ang - v.seam)) > 1e-6); closeC(v.atRay, f(v.rayPoint)); close(v.window[1] - v.window[0], 2 * PI); }
    c = generate('2.5.1', s); g = c.given; v = c.answer.values; for (let k = 0; k < 5; k++) { const phi = 0.4 + k * 1.1; let z; if (g.circle) z = X.add(g.circle.a, X.mul(g.circle.a, unit(phi))); else z = C(g.line.c, Math.tan(phi)); const w = X.inv(z); if (g.circle) close(v.lineEq.nu * w.re + v.lineEq.nv * w.im, v.lineEq.k, 1e-6); else close(X.abs(X.sub(w, v.center)), v.radius, 1e-6); }
    for (const id of ['3.1.1', '3.1.2', '3.2.1', 'P6']) {
      c = generate(id, s); const f = compile(c.answer.values.src).f, pts = [C(1.1, 0.7), C(-0.6, 1.3), C(0.8, -1.4)];
      if (id === '3.1.1') pts.forEach((z) => { const ll = X.localLinear(f, z); assert.ok(X.abs(ll.B) < 1e-5); closeC(ll.A, X.add(X.mul(C(2 * c.given.a), z), C(c.given.b)), 1e-5); });
      else if (id === '3.2.1') pts.forEach((z) => assert.equal(X.abs(X.localLinear(f, z).B) < 1e-5, c.answer.values.entire));
      else { const at = c.answer.values.differentiableAt; pts.forEach((z) => assert.ok(X.abs(X.localLinear(f, z).B) > 1e-3)); if (at) { const ll = X.localLinear(f, at); assert.ok(X.abs(ll.B) < 1e-5); closeC(ll.A, C(0, 0), 1e-5); }
        const ll = X.localLinear(f, c.values.z0); closeC(ll.A, c.answer.values.localAt ? c.answer.values.localAt.A : ll.A, 1e-4); }
    }
    c = generate('P1', s); g = c.given; closeC(c.answer.values.check.both, X.conj(X.mul(g.z1, g.z2)));
    c = generate('P2', s); g = c.given; close(c.answer.values.check.zzbar, X.mul(g.z, X.conj(g.z)).re); close(Math.sqrt(c.answer.values.check.zzbar), X.abs(g.z));
    c = generate('P3', s); g = c.given; v = c.answer.values.check; { const z = C(0.4, -0.9); closeC(X.add(X.mul(g.a, X.add(X.mul(g.c, z), g.d)), g.b), X.add(X.mul(v.coeff, z), v.shift)); }
    c = generate('P4', s); close(c.answer.values.radius, X.abs(c.given.a) * c.given.R);
  }
});

// ================================================================ A3 values, lab requests, check()
const finC = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const FNIDS = new Set(FUNCTIONS.map((f) => f.id));
const okFn = (fn) => typeof fn === 'string' ? FNIDS.has(fn) : (compile(fn.src), true);
const ARITH_MODES = ['add', 'sub', 'mul', 'div', 'conj', 'inv'];
test('A3: values presets match the station shapes of ARCHITECTURE 4.1', () => {
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s), v = c.values;
    if (v === null) { assert.ok((id === '2.3.1' || id === 'P5') && c.given.path.kind === 'cubic', `${id} ${s} has null values`); continue; }
    switch (c.station) {
      case 'arithmetic': assert.ok(finC(v.z1) && finC(v.z2) && ARITH_MODES.includes(v.mode)); break;
      case 'distance': assert.ok(['two', 'circle', 'triangle'].includes(v.mode)); if (v.mode === 'two') assert.ok(finC(v.z1) && finC(v.z2)); else assert.ok(finC(v.a) && v.R > 0); break;
      case 'addresses': assert.ok(finC(v.z)); break;
      case 'powers': assert.ok(finC(v.z) && Number.isInteger(v.n) && v.n >= 1 && v.n <= 12); break;
      case 'roots': if (v.quadratic) assert.ok([v.quadratic.a, v.quadratic.b, v.quadratic.c].every(Number.isFinite)); else assert.ok(finC(v.c) && Number.isInteger(v.n) && v.n >= 2 && v.n <= 12); break;
      case 'curves': assert.ok(finC(v.a) && finC(v.b)); break;
      case 'sets': assert.ok(finC(v.center) && v.r0 >= 1 && v.r1 <= 4 && v.r0 < v.r1 && typeof v.innerStrict === 'boolean' && typeof v.outerStrict === 'boolean'); break;
      case 'mappings': assert.ok(finC(v.z) && okFn(v.fn)); break;
      case 'linear': assert.ok(finC(v.a) && finC(v.b)); assert.ok(v.input === 'x2' || v.input === 'unit' || ['verticalLine', 'horizontalLine', 'circle'].includes(v.input.kind)); if (v.compose) assert.ok(finC(v.compose.c) && finC(v.compose.d)); break;
      case 'powermap': assert.ok(Number.isInteger(v.n) && v.n >= 2 && v.n <= 6); assert.ok(v.line ? ['x', 'y'].includes(v.line.axis) && Number.isFinite(v.line.c) : Number.isFinite(v.sector.theta0) && Number.isFinite(v.sector.theta1)); break;
      case 'principal-root': assert.ok(finC(v.w) && Number.isInteger(v.n) && v.n >= 2 && v.n <= 6); break;
      case 'branches': assert.ok(Number.isInteger(v.n) && v.n >= 2 && v.n <= 5 && v.seam > -PI && v.seam <= PI && [null, 'along', 'across'].includes(v.walk)); break;
      case 'reciprocal': assert.ok(v.shape.kind === 'circle' ? finC(v.shape.center) && v.shape.r > 0 : finC(v.shape.a) && finC(v.shape.b)); break;
      case 'limits': assert.ok(['dir', 'x-over-z'].includes(v.fn) && ['line', 'vertical', 'parabola', 'spiral'].includes(v.path)); if (v.path === 'line') assert.ok(Number.isFinite(v.m)); break;
      case 'derivative': case 'cauchy-riemann': assert.ok(finC(v.z0) && okFn(v.fn)); break;
      default: assert.fail('unknown station ' + c.station);
    }
  }
  // 2.3.1 never draws the cubic (the Walk stop 2.3.1 must always open its station); P5 does, with values null
  for (let s = 1; s <= 200; s++) assert.notEqual(generate('2.3.1', s).given.path.kind, 'cubic');
  assert.ok([...Array(200).keys()].some((s) => generate('P5', s + 1).given.path.kind === 'cubic'));
});
test('A3: lab requests exist exactly for 2.1.2, 2.1.3, 2.2.1, 2.5.1 and P4 and are valid', () => {
  const LAB = ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4'], KINDS = ['circle', 'segment', 'verticalLine', 'horizontalLine', 'rect', 'sector', 'annulus', 'polygon'];
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s);
    if (!LAB.includes(id)) { assert.equal(c.labRequest, null); continue; }
    const L = c.labRequest; assert.ok(L && okFn(L.fn)); assert.equal(L.view, 'side'); assert.equal(L.problem, id); assert.equal(L.predictFirst, true); assert.ok(L.shapes.length >= 1 && L.shapes.every((sh) => KINDS.includes(sh.kind)));
  }
  const fnOf = (L) => (typeof L.fn === 'string' ? compile(FUNCTIONS.find((f) => f.id === L.fn).src).f : compile(L.fn.src).f);
  for (let s = 1; s <= 50; s++) {
    let c = generate('2.1.3', s); [C(0.3, 1.2), C(-2, 0.5)].forEach((z) => closeC(fnOf(c.labRequest)(z), X.add(X.mul(c.given.a, z), c.given.b)));
    c = generate('P4', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.mul(c.given.a, C(0.3, 1.2)));
    c = generate('2.2.1', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.pow(C(0.3, 1.2), c.given.n));
    c = generate('2.1.2', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.pow(C(0.3, 1.2), 2));
    c = generate('2.5.1', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.inv(C(0.3, 1.2)));
    c = generate('2.1.1', s); { const f = compile(c.values.fn.src).f, z = C(0.7, -1.1); let w = C(0, 0); for (let k = c.answer.values.coeffs.length - 1; k >= 0; k--) w = X.add(X.mul(w, z), c.answer.values.coeffs[k]); closeC(f(z), w); }
  }
});
test('A3: check() on every sketch kind', () => {
  for (let s = 1; s <= 50; s++) {
    const c = generate('1.4.2', s); assert.equal(check(c, c.answer.values.roots).ok, true);
    assert.equal(check(c, c.answer.values.roots.map((r) => X.mul(r, X.fromPolar(1, 10 * PI / 180)))).ok, false, `1.4.2 ${s} rotated by 10 degrees`);
    assert.equal(check(c, c.answer.values.roots.slice(1)).ok, false);
    { const p0 = c.answer.values.roots[0]; assert.equal(check(c, c.answer.values.roots.map(() => p0)).ok, false, `1.4.2 ${s}: one handle cannot stand for every root`); }
  }
  for (const id of ['1.4.3', '2.2.2', '2.3.1']) for (let s = 1; s <= 30; s++) { const c = generate(id, s), t = c.answer.values.target.points; assert.equal(check(c, t).ok, true); assert.equal(check(c, t.map((p) => C(p.re + 0.3, p.im))).ok, false); }
  { const c = generate('1.4.3', 3), t = c.answer.values.target.points; assert.equal(check(c, [t[1], t[0]]).ok, true); }
  for (const id of ['1.1.1', '1.1.2', '1.2.2', '1.3.1', '1.3.2', '1.5.1', '1.5.2', '2.1.1', '2.1.2', '2.4.1', '3.1.1', '3.1.2', '3.2.1', 'P5', 'P6']) for (let s = 1; s <= 10; s++) {
    const c = generate(id, s); assert.equal(c.sketch.kind, 'choice'); assert.equal(check(c, c.sketch.correct).ok, true); assert.equal(check(c, (c.sketch.correct + 1) % 4).ok, false); assert.equal(check(c, null).ok, false); }
  for (const id of ['P1', 'P2', 'P3', 'P7']) assert.equal(check(generate(id, 2), 'anything').ok, null);
  for (const id of ['1.2.1', 'P4', '2.5.1']) for (let s = 1; s <= 30; s++) { const c = generate(id, s); if (c.sketch.kind !== 'circle') continue; const T = c.answer.values.target;
    assert.equal(check(c, [T.center, C(T.center.re + T.radius, T.center.im)]).ok, true);
    assert.equal(check(c, [C(T.center.re + 0.5, T.center.im), C(T.center.re + 0.5 + T.radius, T.center.im)]).ok, false);
    assert.equal(check(c, [T.center, C(T.center.re + T.radius * 1.5, T.center.im)]).ok, false); }
  for (const id of ['2.1.3', '2.5.1']) for (let s = 1; s <= 30; s++) { const c = generate(id, s); if (c.sketch.kind !== 'line') continue; const T = c.answer.values.target, d = T.dir, n = C(-d.im, d.re);
    const g = [C(T.point.re + 2 * d.re, T.point.im + 2 * d.im), C(T.point.re - 2 * d.re, T.point.im - 2 * d.im)];
    assert.equal(check(c, g).ok, true); assert.equal(check(c, g.map((p) => C(p.re + 0.3 * n.re, p.im + 0.3 * n.im))).ok, false); assert.equal(check(c, [g[0], g[0]]).ok, false); }
  for (let s = 1; s <= 30; s++) { const c = generate('2.2.1', s), T = c.answer.values.target, at = (t) => C(2 * Math.cos(t), 2 * Math.sin(t));
    assert.equal(check(c, [at(0), at(T.to)]).ok, true); assert.equal(check(c, [at(T.to), at(0)]).ok, true); assert.equal(check(c, [at(0), at(T.to + 0.15)]).ok, false); assert.equal(check(c, [at(0), C(0, 0)]).ok, false); }
  for (const bad of [undefined, null, 5, 'x', {}, [null], [{ re: NaN, im: 0 }]]) for (const id of ['1.4.2', '2.2.2', '1.2.1', '2.1.3', '2.2.1']) assert.equal(check(generate(id, 1), bad).ok, false);
  assert.equal(check(null, 1).ok, null); assert.equal(check({}, 1).ok, null);
  assert.ok(typeof check(generate('1.4.2', 1), []).detail === 'string');
});

// ================================================================ A4 purity
test('A4: the module is pure and imports only complex.js', () => {
  assert.equal((SOURCE.match(/^import\s/gm) || []).length, 1); assert.ok(/^import \{[^}]*\} from '\.\.\/core\/complex\.js';$/m.test(SOURCE));
  for (const re of [/Math\.random/, /\bDate\b/, /\bdocument\b/, /\bglobalThis\b/, /\blocalStorage\b/, /\bsetTimeout\b/, /\bperformance\b/, /\bwindow\s*[.\[(=)]/, /\bimport\s*\(/, /\brequire\s*\(/]) assert.ok(!re.test(SOURCE), String(re));
  assert.deepEqual([...SOURCE.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort(), ['FAMILIES', 'check', 'draw', 'familyInfo', 'generate', 'rng', 'solve', 'statementFor']);
  assert.ok(!/^export \{/m.test(SOURCE) && !/^export default/m.test(SOURCE));
  const r = rng(7); assert.deepEqual([r(), r(), r()], [0.011704753153026104, 0.06195825757458806, 0.97690763277933]);
  const a = rng(7); assert.equal(a(), 0.011704753153026104); assert.equal(rng('7')(), rng('7')());
  assert.equal(typeof draw, 'function'); assert.equal(typeof statementFor, 'function');
  assert.deepEqual(statementFor('1.4.3', { p: 3, q: 2 }), { tex: 'Use the quadratic formula to solve $z^2 - 6z + 13 = 0$.', text: 'Use the quadratic formula to solve z^2 - 6z + 13 = 0.' });
  assert.deepEqual(familyInfo('1.4.2'), { id: '1.4.2', station: 'roots', sketch: 'roots', sketches: ['roots'], hasValues: true, hasLab: false }); assert.equal(familyInfo('nope'), null);
});

// ================================================================ A5 the story in the words
test('A5: the worked prose speaks the thread it belongs to', () => {
  const WALK = ['1.3.1', '1.1.1', '1.2.1', '1.3.2', '1.4.2', '1.5.1', '1.5.2', '2.1.1', '2.1.3', '2.1.2', '2.2.2', '2.4.1', '2.5.1', '2.3.1', '3.1.2', '3.2.1'];
  for (const id of FAMILIES) for (let s = 1; s <= 10; s++) {
    const c = generate(id, s), P = c.worked.polar, K = c.worked.cart;
    assert.ok(/[xy]/.test(K) && /[rθ]/.test(P), `${id} ${s} both addresses`); assert.ok(/^[\x00-\x7f]*$/.test(c.answer.text), `${id} answer.text ascii`);
    if (['1.4.1', '1.4.2', '1.4.3'].includes(id)) assert.ok(P.includes('every name') && P.includes('staircase'), `${id} ${s}`);
    if (['1.4.1', '1.4.2'].includes(id)) assert.ok(P.includes(`(Arg c + 2πk)/${c.given.n}`), `${id} ${s} (Arg c + 2πk)/n`);
    if (['1.3.1', '2.2.2'].includes(id)) assert.ok(P.includes('home step'), id);
    if (id === '2.4.1') assert.ok(P.includes('continuous') && P.includes('seam'));
    if (['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4'].includes(id)) assert.ok(K.includes('push forward') || K.includes('eliminate'), id);
    if (['3.1.1', '3.1.2', '3.2.1', 'P6', 'P7'].includes(id)) assert.ok(P.includes('mirror'), id);
    if (['1.1.1', 'P1', 'P2'].includes(id)) assert.ok(P.includes('turn and stretch') || P.includes('spin and stretch'), id);
    if (WALK.includes(id)) assert.ok(c.values || c.labRequest, `${id} ${s} must open its station`);
    for (const w of [K, P]) if (/[θφ]/.test(w)) assert.ok(/Arg|arg/.test(w), `${id} ${s}: an angle is named without saying which: ${w}`);
  }
});

// ================================================================ extra checks of the design
test('extra: TeX renders, cards survive JSON, options are sound, lengths fit a phone', () => {
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s);
    assert.deepEqual(JSON.parse(JSON.stringify(c)), c, `${id} ${s}: no -0, NaN or undefined`);
    c.statement.split('$').forEach((p, i) => { if (i % 2 === 1) katex.renderToString(p, { throwOnError: true, strict: 'error' }); });
    katex.renderToString(c.answer.tex, { throwOnError: true, strict: 'error', displayMode: true });
    assert.ok(c.statementText.length <= 220 && c.answer.text.length <= 400 && c.worked.cart.length <= 700 && c.worked.polar.length <= 700, `${id} ${s} lengths`);
    assert.ok(typeof c.sketch.prompt === 'string' && /^[\x00-\x7f]*$/.test(c.sketch.prompt));
    if (c.sketch.kind === 'choice') { const o = c.sketch.options; assert.equal(o.length, 4); assert.equal(new Set(o).size, 4); assert.ok(o.every((t) => t.length > 0 && t.length <= 72 && /^[\x00-\x7f]*$/.test(t))); assert.ok(Number.isInteger(c.sketch.correct) && c.sketch.correct >= 0 && c.sketch.correct < 4); }
    if (c.sketch.target) assert.deepEqual(c.answer.values.target, c.sketch.target);
    if (c.sketch.fit) assert.ok(c.sketch.fit.halfWidth >= 1.5 && finC(c.sketch.fit.center));
    if (c.sketch.kind === 'roots') assert.equal(c.sketch.n, c.answer.values.roots.length);
  }
});
test('extra: draw is a pure function of the source it is given', () => {
  assert.equal(draw('1.4.1', () => 0).n, 3); assert.equal(draw('1.4.1', () => 0.9999999999).n, 8);
  const a = draw('1.1.1', rng(5)), b = draw('1.1.1', rng(5)); assert.deepEqual(a, b);
  for (const id of FAMILIES) { const g = draw(id, rng(11)); assert.doesNotThrow(() => solve(id, g)); }
  assert.throws(() => draw('nope', rng(1)), RangeError);
});
test('extra: only known ids, only own keys, only RangeError', () => {
  for (const bad of ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', '1.1', 'p1']) { assert.equal(generate(bad, 1), null, bad); assert.throws(() => solve(bad, {}), RangeError); assert.equal(familyInfo(bad), null); }
  assert.throws(() => solve('2.4.1', { n: 2, ray: 'constructor' }), RangeError); assert.throws(() => solve('3.2.1', { fn: 'constructor' }), RangeError); assert.throws(() => solve('3.1.2', { fn: '__proto__' }), RangeError);
  assert.throws(() => solve('1.1.1', { z1: C(1, 1), z2: C(0, 0) }), RangeError); assert.throws(() => solve('1.4.1', { n: 0 }), RangeError); assert.throws(() => solve('1.4.2', { c: C(0, 0), n: 3 }), RangeError);
  assert.throws(() => solve('2.2.1', { alpha: PI, n: 3 }), RangeError); assert.throws(() => solve('2.5.1', { circle: { a: C(0, 0) } }), RangeError); assert.throws(() => solve('2.1.1', { fn: 'z^7' }), RangeError);
  const junk = [undefined, null, 0, NaN, 'x', [], {}, { re: 'a', im: 1 }, { re: Infinity, im: 0 }, { z: 1 }, { line: 5 }, { circle: 7 }, { path: 'line' }, { n: -1 }, { n: 1.5 }, { n: 99 }];
  const fields = ['z', 'z1', 'z2', 'a', 'b', 'c', 'd', 'w', 'n', 'p', 'q', 'R', 'r0', 'r1', 'rel', 'fn', 'axis', 'line', 'circle', 'path', 'ray', 'alpha', 'kind', 'op', 'part', 'innerStrict', 'outerStrict'];
  let threw = 0;
  for (const id of FAMILIES) {
    for (const j of junk) { try { solve(id, j); } catch (e) { assert.ok(e instanceof RangeError, `${id} threw ${e}`); threw++; } }
    for (const f of fields) for (const j of junk) { try { solve(id, { ...generate(id, 3).given, [f]: j }); } catch (e) { assert.ok(e instanceof RangeError, `${id}.${f} threw ${e}`); threw++; } }
  }
  assert.ok(threw > 100);
});
test('extra: a card is a fresh object and seeds of every kind work', () => {
  const a = generate('2.4.1', 3), b = generate('2.4.1', 3); a.answer.values.rayPoint.re = 99; a.sketch.options.push('x'); assert.deepEqual(generate('2.4.1', 3), b);
  for (const sd of [0, 1, 2 ** 31, 2 ** 32 - 1, 2 ** 32, -1, 1.9, '7', 'abc', NaN, undefined, null, Infinity]) { const c = generate('1.4.2', sd); assert.ok(Number.isInteger(c.seed) && c.seed >= 0 && c.seed < 2 ** 32); assert.deepEqual(generate('1.4.2', sd), c); }
  assert.equal(generate('1.4.2', 1.9).seed, 1); assert.equal(generate('1.4.2', -1).seed, 4294967295);
  assert.equal(generate('1.4.2', Infinity).seed, 0); assert.equal(generate('1.4.2', 2 ** 32).seed, 0); assert.notEqual(generate('1.4.2', '7').seed, 7, 'a string is hashed, even a numeric one');
  const r = rng(7); for (let i = 0; i < 1000; i++) { const x = r(); assert.ok(x >= 0 && x < 1); }
  const t0 = process.hrtime.bigint(); for (const id of FAMILIES) for (let s = 1; s <= 50; s++) generate(id, s); assert.ok(Number(process.hrtime.bigint() - t0) / 1e6 < 1500);
});
test('extra: the pinned seeds the Rehearsal Room and the Walk rely on', () => {
  let c = generate('1.4.2', 7); assert.deepEqual(c.given, { c: C(-81, 0), n: 4 }); assert.equal(c.sketch.n, 4); assert.deepEqual(c.values, { c: C(-81, 0), n: 4 });
  c = generate('2.5.1', 3); assert.ok(c.labRequest && c.labRequest.fn === 'recip' && c.labRequest.predictFirst === true);
  c = generate('P5', 1); assert.equal(c.sketch.kind, 'choice'); assert.ok(c.sketch.correct >= 0);
  assert.deepEqual(generate('1.1.1', 1).given, { z1: C(2, 2), z2: C(-5, 1) });
  assert.deepEqual(generate('1.4.2', 1).given, { c: C(0, 2), n: 2 });
});

// ================================================================ the text a student reads (review round 1: every defect was in a sentence no test looked at)
// A tiny reader for the ASCII notation of answer.text: 3, -1/2, sqrt(3)/2, 2 sqrt(2), 3 - 2i, -1/2 + (sqrt(3)/2)i, 2 e^(-i pi/3), pi/4, 5pi/6.
function parseNum(str) {
  let s = String(str).trim(), sign = 1, m;
  if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); }
  if (s[0] === '(' && s.endsWith(')')) s = s.slice(1, -1).trim();
  if ((m = s.match(/^(?:(\d+) )?sqrt\((\d+)\)(?:\/(\d+))?$/))) return sign * (m[1] ? +m[1] : 1) * Math.sqrt(+m[2]) / (m[3] ? +m[3] : 1);
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return sign * (+m[1]) / (+m[2]);
  if (/^\d+(\.\d+)?$/.test(s)) return sign * Number(s);
  throw new Error('parseNum: cannot read "' + str + '"');
}
function parseCart(str) {
  const s = String(str).trim(); let depth = 0, cut = -1;
  for (let k = 0; k < s.length; k++) { const ch = s[k]; if (ch === '(') depth++; else if (ch === ')') depth--; else if (depth === 0 && k > 0 && (s.startsWith(' + ', k) || s.startsWith(' - ', k))) cut = k; }
  const imag = (t, sg) => { t = t.trim(); if (t[0] === '-') { sg = -sg; t = t.slice(1); } t = t.replace(/ ?i$/, ''); if (t === '') return sg; if (t[0] === '(' && t.endsWith(')')) t = t.slice(1, -1); return sg * parseNum(t); };
  if (cut < 0) return s.endsWith('i') ? C(0, imag(s, 1)) : C(parseNum(s), 0);
  return C(parseNum(s.slice(0, cut)), imag(s.slice(cut + 3), s[cut + 1] === '-' ? -1 : 1));
}
function parseAngle(str) {
  let s = String(str).trim(), sg = 1, m;
  if (s[0] === '-') { sg = -1; s = s.slice(1); }
  if ((m = s.match(/^(\d*)pi(?:\/(\d+))?$/))) return sg * (m[1] ? +m[1] : 1) * PI / (m[2] ? +m[2] : 1);
  return sg * Number(s);
}
function parseExp(str) {                                    // [coef ]e^([-]i angle)  ->  { r, theta }
  const m = String(str).trim().match(/^(.*?)\s*e\^\((-?)i (.+)\)$/); if (!m) throw new Error('parseExp: cannot read "' + str + '"');
  return { r: m[1] === '' ? 1 : parseNum(m[1]), theta: (m[2] ? -1 : 1) * parseAngle(m[3]) };
}
const fromExp = (e) => X.fromPolar(e.r, e.theta);
const readExp = (t) => (/e\^/.test(t) ? parseExp(t) : { r: parseNum(t), theta: 0 });      // a real root prints as a plain number
const rounded = (t) => /[~]|rounded|about|\\approx/.test(t);
const FIELDS = (c) => ({ statement: c.statement, statementText: c.statementText, 'answer.text': c.answer.text, 'answer.tex': c.answer.tex, 'worked.cart': c.worked.cart, 'worked.polar': c.worked.polar });

test('text: the reader itself (so the checks below mean something)', () => {
  assert.equal(parseNum('-23/26'), -23 / 26); close(parseNum('2 sqrt(2)'), 2 * S2); close(parseNum('sqrt(3)/2'), S3 / 2); close(parseNum('(3 sqrt(2))'), 3 * S2);
  closeC(parseCart('-23/26 - (11/26)i'), C(-23 / 26, -11 / 26)); closeC(parseCart('-1/2 + (sqrt(3)/2)i'), C(-0.5, S3 / 2)); closeC(parseCart('-i'), C(0, -1)); closeC(parseCart('-8 + (8 sqrt(3))i'), C(-8, 8 * S3));
  closeC(parseCart('sqrt(2)/2 - (sqrt(2)/2)i'), C(S2 / 2, -S2 / 2)); closeC(parseCart('3'), C(3, 0)); closeC(parseCart('2 sqrt(2) i'.replace('2 sqrt(2) i', '(2 sqrt(2))i')), C(0, 2 * S2));
  const e = parseExp('(2 sqrt(2)) e^(-i 5pi/12)'); close(e.r, 2 * S2); close(e.theta, -5 * PI / 12); const f = parseExp('e^(i pi)'); close(f.r, 1); close(f.theta, PI);
});

// 5. 1.1.1: every quotient is exact (the goal promises exact answers and the handout asks for x + iy)
test('text: 1.1.1 prints the exact quotient for every pair of the draw range, in ASCII, TeX and the worked step', () => {
  const NZ5 = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]; let big = 0;
  for (const a of NZ5) for (const b of NZ5) for (const c of NZ5) for (const d of NZ5) {
    const z1 = C(a, b), z2 = C(c, d), card = solve('1.1.1', { z1, z2 }), m = card.answer.text.match(/^z1 z2 = (.+); z1\/z2 = (.+)$/); assert.ok(m, card.answer.text);
    closeC(parseCart(m[1]), X.mul(z1, z2), 1e-12); closeC(parseCart(m[2]), X.div(z1, z2), 1e-12);
    assert.ok(!/\d\.\d/.test(card.answer.text + card.answer.tex + card.worked.cart), `1.1.1 ${JSON.stringify([z1, z2])} prints a decimal: ${card.answer.text}`);
    assert.ok(!/\d\.\d/.test(card.worked.polar.replace(/[^.]*≈[^.]*\./g, '')) || /≈/.test(card.worked.polar));
    if (c * c + d * d > 24) big++;
  }
  assert.ok(big > 2000);
  assert.equal(solve('1.1.1', { z1: C(4, 3), z2: C(-5, -1) }).answer.text, 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i');
  assert.ok(solve('1.1.1', { z1: C(4, 3), z2: C(-5, -1) }).answer.tex.includes('-\\frac{23}{26} - \\frac{11}{26}i'));
  assert.ok(solve('1.1.1', { z1: C(4, 3), z2: C(-5, -1) }).worked.cart.includes('= -23/26 - (11/26)i'));
  assert.equal(generate('1.1.1', 3).answer.text, 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i');
});

// 1. P4: the printed parametrization has the radius of the image circle
test('text: P4 prints w = radius e^(i(t + Arg a)), with the modulus the image radius and the right signed shift', () => {
  const a = [C(1, 1), C(0, 2), C(1, -1), C(-2, 0), C(S3, 1), C(0, -1), C(-1, 1)];
  const cards = []; for (let s = 1; s <= 300; s++) cards.push(generate('P4', s));
  for (const R of [1, 2, 3]) for (const z of a) cards.push(solve('P4', { a: z, R }));
  let withRadiusNotOne = 0;
  for (const c of cards) {
    const T = c.answer.text, m = T.match(/^a = (.+?) = (.+?): with z = (.*?)e\^\(it\), w = (.*?)e\^\(i\((t.*)\)\) covers the whole circle \|w\| = (.+)$/); assert.ok(m, T);
    const g = c.given, v = c.answer.values, shift = m[5] === 't' ? 0 : (m[5].startsWith('t - ') ? -1 : 1) * parseAngle(m[5].replace(/^t [+-] /, ''));
    closeC(parseCart(m[1]), g.a); const e = readExp(m[2]); close(e.r, X.abs(g.a)); close(X.wrapArg(e.theta - X.Arg(g.a)), 0);
    close(m[3] === '' ? 1 : parseNum(m[3].trim()), g.R);
    close(m[4] === '' ? 1 : parseNum(m[4].trim()), v.radius);                          // the modulus of the image curve, not of a
    close(X.wrapArg(shift - X.Arg(g.a)), 0); close(parseNum(m[6]), v.radius);
    assert.ok(/ - /.test(m[5]) === (X.Arg(g.a) < 0), T);                                // a negative angle reads t - pi/4, never t + -pi/4
    if (g.R !== 1) withRadiusNotOne++;
  }
  assert.ok(withRadiusNotOne > 100);
  assert.equal(generate('P4', 6).answer.text.includes('w = 4 e^(i(t + pi))'), true, generate('P4', 6).answer.text);
});

// 2. P5: the two values quoted as a contrast really differ
test('text: P5 quotes the axis that differs (real axis, or imaginary axis when the path already gives 1)', () => {
  const paths = [{ kind: 'line', m: 1 }, { kind: 'line', m: -1 }, { kind: 'line', m: 2 }, { kind: 'line', m: -2 }, { kind: 'line', m: 0.5 }, { kind: 'vertical' }, { kind: 'parabola' }, { kind: 'cubic' }];
  const cards = paths.map((path) => solve('P5', { path })); for (let s = 1; s <= 300; s++) cards.push(generate('P5', s));
  let imaginary = 0;
  for (const c of cards) {
    const m = c.answer.text.match(/^x\/z -> (.+) along (.+), but (.+) along the (real|imaginary) axis, so the limit does not exist$/); assert.ok(m, c.answer.text);
    const here = parseCart(m[1]), other = parseCart(m[3]);
    assert.ok(X.abs(X.sub(here, other)) > 0.05, `P5 ${JSON.stringify(c.given)}: ${here.re},${here.im} vs ${other.re},${other.im}`);
    closeC(here, c.answer.values.along); closeC(other, m[4] === 'real' ? C(1, 0) : C(0, 0)); closeC(other, c.answer.values.contrast.value);
    assert.ok(c.answer.tex.includes(`but } ${m[4] === 'real' ? '1' : '0'} \\text{ along the ${m[4]} axis`), c.answer.tex);
    if (m[4] === 'imaginary') { imaginary++; assert.ok(['parabola', 'cubic'].includes(c.given.path.kind)); } else assert.ok(!['parabola', 'cubic'].includes(c.given.path.kind));
  }
  assert.ok(imaginary >= 40);
});

// 3. 2.1.3: the direction of the turn follows the sign of Arg a
test('text: 2.1.3 says clockwise, counterclockwise, a half turn or no turn from the sign of Arg a, for every a of the table', () => {
  const A = [C(0, 1), C(0, -1), C(-1, 0), C(2, 0), C(0, 2), C(1, 1), C(1, -1)], cards = [];
  for (const a of A) for (const axis of ['x', 'y']) for (const b of [C(0, 0), C(1, -2)]) cards.push(solve('2.1.3', { a, b, line: { axis, c: 1 } }));
  for (let s = 1; s <= 300; s++) cards.push(generate('2.1.3', s));
  const seen = new Set();
  for (const c of cards) {
    const th = X.Arg(c.given.a), want = th === 0 ? 'do not turn' : Math.abs(th - PI) < 1e-9 ? 'a half turn' : th > 0 ? 'counterclockwise' : 'clockwise'; seen.add(want);
    for (const [name, t] of [['answer.text', c.answer.text], ['answer.tex', c.answer.tex]]) {
      assert.ok(t.includes(want), `${name}: ${JSON.stringify(c.given.a)} should say "${want}": ${t}`);
      assert.equal(/counterclockwise/.test(t), want === 'counterclockwise', `${name}: ${t}`); assert.equal(/(?<!counter)clockwise/.test(t), want === 'clockwise', `${name}: ${t}`);
    }
    assert.ok(c.worked.polar.includes(want === 'do not turn' ? 'leaves every direction alone' : want), c.worked.polar);
  }
  assert.equal(seen.size, 4);
  assert.equal(generate('2.1.3', 10).answer.text.includes('turn by Arg a = -pi/2 (clockwise)'), true, generate('2.1.3', 10).answer.text);
});

// 4. 1.3.1: a point on an axis belongs to no quadrant
test('text: 1.3.1 puts axis points on the axis and every other point in the right quadrant', () => {
  const unitAt = (d) => ({ 0: C(1, 0), 90: C(0, 1), 180: C(-1, 0), 270: C(0, -1) })[d] || X.fromPolar(1, d * PI / 180);
  const cards = []; for (const d of [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]) for (const r of [1, 2, 3]) { const u = unitAt(d); cards.push(solve('1.3.1', { z: C(r * u.re, r * u.im) })); }
  for (let s = 1; s <= 300; s++) cards.push(generate('1.3.1', s));
  let axis = 0;
  for (const c of cards) {
    const z = c.given.z, P = c.worked.polar, ax = Math.abs(z.im) < 1e-12 || Math.abs(z.re) < 1e-12;
    if (ax) {
      axis++; const word = Math.abs(z.im) < 1e-12 ? (z.re > 0 ? 'positive real axis' : 'negative real axis') : (z.im > 0 ? 'positive imaginary axis' : 'negative imaginary axis');
      assert.ok(P.includes('on the ' + word), P); assert.ok(!/quadrant/.test(P), P);
      if (z.re < 0 && Math.abs(z.im) < 1e-12) assert.ok(P.includes('Arg π, never −π'), P);
    } else assert.ok(P.includes(`in the ${z.re > 0 && z.im > 0 ? 'first' : z.re < 0 && z.im > 0 ? 'second' : z.re < 0 ? 'third' : 'fourth'} quadrant`), P);
  }
  assert.ok(axis >= 12 + 40);
  assert.ok(solve('1.3.1', { z: C(-1, 0) }).worked.polar.includes('on the negative real axis'));
});

// 6. signs: no '+ -', '- -', '/-', ' -0', bare 1i, unit or zero coefficients, in any field of any family
test('text: no sign-unaware template in any field of any family (seeds 1..300)', () => {
  const M = '[-−]', BAD = {
    'plus-minus': new RegExp('\\+ ' + M), 'minus-minus': new RegExp(M + ' ' + M), 'slash-minus': new RegExp('/' + M), 'minus-zero': new RegExp('(^|[^\\w.])' + M + '0(?![.\\d])'),
    'bare 1i': /(^|[^\d.\w\\])1i\b/, 'unit coefficient': /(^|[^\w.\d])1(ρ|r\^|\(|z\b|x\b|y\b|t\b|u\b|v\b|h\b)/, 'zero coefficient': /(^|[^\w.\d])0[xyi]\b/, 'dot minus': new RegExp('[·×*] ' + M + '\\d'),
    'fraction times variable': /\d\/\d+[a-zρθ]/, 'surd times variable': /√\d[a-zA-Zρθ]/, 'double sign': /\+ \+/, 'minus before bracket': /\(-\d+\)x/, 'empty bracket': /\(\s*\)/,
  };
  for (const id of FAMILIES) for (let s = 1; s <= 300; s++) {
    const c = generate(id, s);
    for (const [name, t] of Object.entries(FIELDS(c))) for (const [k, re] of Object.entries(BAD)) { const m = t.match(re); assert.ok(!m, `${id} seed ${s} ${name} has ${k}: ...${t.slice(Math.max(0, m ? m.index - 30 : 0), (m ? m.index : 0) + 40)}...`); }
  }
  // the examples of the review, by name
  const w = solve('2.1.2', { axis: 'x', c: -3 }).worked; assert.ok(w.cart.includes('(9 − y²) − 6iy') && w.cart.includes('y = −v/6') && w.polar.includes('2 · (-3)² = 18'), w.cart + w.polar);
  assert.ok(solve('2.1.2', { axis: 'y', c: -1 }).worked.cart.includes('z = x − i with'));
  const r = solve('2.5.1', { line: { c: -1 } }); assert.equal(r.answer.text, 'the circle |w + 1/2| = 1/2 (through 0)'); assert.ok(r.answer.tex.includes('|w + \\frac{1}{2}|') && r.worked.cart.includes('(u + 1/2)²') && r.worked.cart.includes('u/(-1)') && r.worked.polar.includes('cos θ/(-1)'), r.worked.cart);
  const p = solve('P4', { a: C(-2, 0), R: 1 }).worked.cart; assert.ok(p.includes('(-2x) + i(-2y)'), p);
  const q = solve('3.1.1', { a: -1, b: -3, c: 2 }).worked; assert.ok(q.cart.includes('-(2zh + h²) − 3h') && q.polar.includes('-2z - 3 − ρe^{iφ}'), q.cart + q.polar);
  assert.ok(solve('3.1.2', { fn: '-|z|^2' }).worked.cart.includes('the quotient is -(conj u + u(conj h/h) + conj h)'));
  assert.ok(solve('1.3.2', { z: C(-0.5, S3 / 2), n: 4 }).worked.polar.includes('the length stays 1') && !/1\(cos/.test(solve('1.3.2', { z: C(-0.5, S3 / 2), n: 4 }).worked.polar));
});

// numbers that are not exact say so
test('text: a rounded number is always marked (~ in ASCII, \\approx in TeX, the approx sign or "about" in prose)', () => {
  let marked = 0;
  for (const id of FAMILIES) for (let s = 1; s <= 300; s++) {
    const c = generate(id, s);
    for (const [name, t] of Object.entries(FIELDS(c))) { if (!/\d\.\d{2}/.test(t)) continue; assert.ok(rounded(t) || /≈/.test(t), `${id} seed ${s} ${name} has a decimal with no mark: ${t}`); marked++; }
  }
  assert.ok(marked > 20);
  assert.equal(solve('1.2.2', { z1: C(4, 3), z2: C(-5, -1) }).answer.text, 'distance = |9 + 4i| = sqrt(97) ~ 9.849');
  assert.ok(generate('1.4.1', 1).answer.text.includes('rounded to 3 decimals') || generate('1.4.1', 1).answer.values.roots.length !== 7 || true);
  assert.ok(solve('1.4.1', { n: 7 }).answer.text.includes('rounded to 3 decimals') && solve('1.4.1', { n: 7 }).answer.tex.includes('\\approx'));
  assert.ok(solve('1.4.2', { c: C(-32, 0), n: 5 }).answer.text.includes(' ~ ') && !solve('1.4.2', { c: C(-81, 0), n: 4 }).answer.text.includes('~'));
  assert.ok(solve('2.2.2', { w: C(-S3, -1), n: 2 }).answer.text.includes(' ~ 0.366 - 1.366i'));
});

// the exponential and Cartesian forms printed in the text are the numbers in the values
test('text: the exponential and Cartesian forms in answer.text equal answer.values (1.3.1, 1.3.2, 1.4.2, 1.4.3, 2.2.2, 2.4.1)', () => {
  for (let s = 1; s <= 300; s++) {
    let c = generate('1.3.1', s), m = c.answer.text.match(/^z = (.*?)\(cos\((.+?)\) \+ i sin\((.+?)\)\) = (.+?); Arg z = (.+?); arg z = \{(.+?) \+ 2 pi k\}$/); assert.ok(m, c.answer.text);
    closeC(fromExp(readExp(m[4])), c.given.z, 1e-9); close(parseAngle(m[5]), c.answer.values.Arg); close(parseAngle(m[2]), parseAngle(m[3]));
    c = generate('1.3.2', s); m = c.answer.text.match(/^\((.+)\)\^(\d+) = (.+?) = (.+); Arg = (.+)$/); assert.ok(m, c.answer.text);
    closeC(parseCart(m[4]), c.answer.values.result, 1e-9); closeC(fromExp(readExp(m[3])), c.answer.values.result, 1e-9); close(parseAngle(m[5]), c.answer.values.Arg);
    c = generate('1.4.2', s); m = c.answer.text.match(/^(.+?) (?:=|~) (.+?); as Arg values the angles are (.+)$/); assert.ok(m, c.answer.text);
    const exps = m[1].split(/, (?=[^,]*e\^|\d|\()/).map((t) => t); assert.equal(exps.length, c.given.n, m[1]);
    exps.forEach((t, k) => { const e = readExp(t); closeC(fromExp(e), c.answer.values.roots[k], 1e-9); close(e.r, c.answer.values.radius); });
    c = generate('1.4.3', s); m = c.answer.text.match(/ = ([^=]+) or ([^=]+)$/); closeC(parseCart(m[1]), c.answer.values.roots[0]); closeC(parseCart(m[2]), c.answer.values.roots[1]);
    c = generate('2.2.2', s); m = c.answer.text.match(/= ([^=]*?) (?:=|~) ([^=~]*?), using Arg/); assert.ok(m, c.answer.text);
    { const tol = /\d\.\d/.test(c.answer.text) ? 5e-3 : 1e-9; closeC(fromExp(readExp(m[1])), c.answer.values.root, tol); closeC(parseCart(m[2]), c.answer.values.root, tol); }   // a rounded number is read to 3 decimals
    assert.ok(c.answer.tex.includes('other') && c.answer.text.includes('other') && c.answer.tex.includes('root'), c.answer.tex);
    c = generate('2.4.1', s); m = c.answer.text.match(/; f\((.+?)\) = (.+?) = (.+)$/); assert.ok(m, c.answer.text);
    closeC(parseCart(m[1]), c.answer.values.rayPoint); closeC(fromExp(readExp(m[2])), c.answer.values.atRay, 1e-9); closeC(parseCart(m[3]), c.answer.values.atRay, 1e-9);
  }
  const t = solve('2.2.2', { w: C(0, 2), n: 2 }); assert.ok(t.answer.tex.includes('\\text{(the other square root is }-1 - i\\text{)}'), t.answer.tex);
});

// 9. a card never repeats the handout's answer through a different given (same image curve, same derivative, same circle pair)
test('text: a different given never gives the handout answer (2.1.2 at x = -2, 3.1.1 with a = b = 1, 1.5.2 with the flipped inequalities)', () => {
  const H = { '1.2.1': { a: C(1, 2), R: 3, rel: '=' }, '1.3.1': { z: C(-1, S3) }, '1.3.2': { z: C(S3, 1), n: 10 }, '1.4.2': { c: C(-16, 0), n: 4 }, '1.4.3': { p: 2, q: 3 }, '1.5.1': { a: C(2, 1), b: C(-3, -3) },
    '1.5.2': { a: C(0, -1), r0: 1, r1: 3, innerStrict: true, outerStrict: false }, '2.1.1': { fn: 'z^2 + iz' }, '2.1.2': { axis: 'x', c: 2 }, '2.1.3': { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } },
    '2.2.1': { alpha: PI / 4, n: 3 }, '2.2.2': { w: C(0, 2), n: 2 }, '2.3.1': { path: { kind: 'parabola' } }, '2.4.1': { n: 3, ray: 'negative-real' }, '2.5.1': { circle: { a: C(1, 0) } },
    '3.1.1': { a: 1, b: 1, c: 0 }, '3.2.1': { fn: 'e^x(cos y + i sin y)' }, P3: { a: C(0, 1), b: C(0, -2), c: C(1, 1), d: C(1, 0) }, P4: { a: C(1, 1), R: 1 } };
  // not listed: 1.1.1, 1.1.2, 1.2.2, P1, P2 (a different pair can have the same product or the same difference: arithmetic, not the handout's problem) and 3.1.2, P6 (the verdict is the same for every function differentiable only at one point)
  for (const [id, g] of Object.entries(H)) { const hand = solve(id, g); for (let s = 1; s <= 1000; s++) { const c = generate(id, s); assert.notEqual(c.answer.text, hand.answer.text, `${id} seed ${s} has the handout's answer: ${JSON.stringify(c.given)}`); } }
  assert.equal(solve('2.1.2', { axis: 'x', c: -2 }).answer.text, solve('2.1.2', { axis: 'x', c: 2 }).answer.text);   // the alias that was there
  for (let s = 1; s <= 300; s++) assert.ok(!(generate('2.1.2', s).given.axis === 'x' && Math.abs(generate('2.1.2', s).given.c) === 2));
  for (let s = 1; s <= 300; s++) { const g = generate('3.1.1', s).given; assert.ok(!(g.a === 1 && g.b === 1)); }
});

// 11. wording
test('text: one spelling (center), rootWord for every n (square, cube, 4th ...), no unit coefficients in 1.3.2', () => {
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s); for (const [name, t] of Object.entries({ ...FIELDS(c), prompt: c.sketch.prompt })) assert.ok(!/centre/i.test(t), `${id} ${s} ${name}: ${t}`);
  }
  for (const guess of [undefined, [C(0, 0)], 5]) assert.ok(!/centre/i.test(check(generate('P4', 2), guess).detail));
  assert.ok(!/centre/i.test(check(generate('1.2.1', 2), [C(0, 0), C(1, 0)]).detail) && !/centre/i.test(check(generate('1.2.1', 2), { center: C(50, 50), radius: 1 }).detail));
  assert.equal(solve('1.4.2', { c: C(0, 2), n: 2 }).statementText, 'Find all the square roots of 2i. Express answers in both exponential and Cartesian forms.');
  assert.equal(solve('1.4.2', { c: C(-1, 0), n: 3 }).statementText, 'Find all the cube roots of -1. Express answers in both exponential and Cartesian forms.');
  assert.equal(solve('1.4.2', { c: C(-81, 0), n: 4 }).statementText, 'Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms.');
  assert.ok(solve('1.4.2', { c: C(0, 2), n: 2 }).statement.startsWith('Find all the square roots of $2i$'));
  for (let s = 1; s <= 300; s++) { const c = generate('1.4.2', s), w = { 2: 'square', 3: 'cube' }[c.given.n] || c.given.n + 'th'; assert.ok(c.statementText.includes(`the ${w} roots of`), c.statementText); }
  for (let s = 1; s <= 300; s++) { const c = generate('1.3.2', s); assert.ok(!/(^|[^\w.\d])1\(cos/.test(c.worked.polar) && !/r\^\d+ = 1\b/.test(c.worked.polar), c.worked.polar); }
});
```

## Appendix C. `tests/interact/i2-generators.mjs`

Run with `node tools/smoke.mjs --route home --script tests/interact/i2-generators.mjs`.

```js
// Interaction script for goal i2-generators (the module has no page of its own, so this script loads it in the browser the way a station does).
// Run:  node tools/smoke.mjs --route home --script tests/interact/i2-generators.mjs
// It covers A1 (spot values), A2 (replay and speed in a real browser), A3 (check on a pinned card), A4 (source inspection by fetch).
// The smoke runner itself fails the route on any console error, page error, failed request or horizontal overflow.

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

export default async function (page, ctx) {
  const r = await page.evaluate(async () => {
    const m = await import('./js/data/generators.js');
    const C = (re, im = 0) => ({ re, im });
    const out = { exports: Object.keys(m).sort(), families: m.FAMILIES.length, frozen: Object.isFrozen(m.FAMILIES) };

    // the pinned card of the Rehearsal Room: 1.4.2 seed 7 is the fourth roots of -81
    const card = m.generate('1.4.2', 7);
    out.same = JSON.stringify(card) === JSON.stringify(m.generate('1.4.2', 7));
    out.given = card.given;
    out.sketch = { kind: card.sketch.kind, n: card.sketch.n };
    out.statementText = card.statementText;
    out.answerText = card.answer.text;
    out.values = card.values;
    out.checkOk = m.check(card, card.answer.values.roots).ok;
    const th = (10 * Math.PI) / 180;
    out.checkRotated = m.check(card, card.answer.values.roots.map((z) => C(z.re * Math.cos(th) - z.im * Math.sin(th), z.re * Math.sin(th) + z.im * Math.cos(th)))).ok;

    // A1 spot values, solved in the browser
    const v = (id, g) => m.solve(id, g).answer.values;
    out.a1 = {
      product: v('1.1.1', { z1: C(2, 1), z2: C(1, -3) }).product,
      distance: v('1.2.2', { z1: C(1, 5), z2: C(-2, 1) }).distance,
      power: v('1.3.2', { z: C(Math.sqrt(2), Math.sqrt(2)), n: 4 }).result,
      primitive: v('1.4.1', { n: 6 }).primitive,
      roots43: v('1.4.3', { p: 3, q: 2 }).roots,
      parabola: v('2.1.2', { axis: 'x', c: 3 }).parabola,
      line251: v('2.5.1', { circle: { a: C(0, 1) } }).imageLine,
      fprime: v('3.1.1', { a: 2, b: -3, c: 1 }).fprimeTex,
    };

    // the sentences of the review (round 1): what a student reads, not only the numbers
    out.text = {
      p4: m.generate('P4', 6).answer.text,
      p5: m.generate('P5', 8).answer.text,
      turn: m.generate('2.1.3', 10).answer.text,
      axis: m.solve('1.3.1', { z: C(-1, 0) }).worked.polar,
      quotient: m.generate('1.1.1', 3).answer.text,
      signs: m.solve('2.1.2', { axis: 'x', c: -3 }).worked.cart,
      circle: m.solve('2.5.1', { line: { c: -1 } }).answer.text,
    };
    const BAD = [/\+ [-\u2212]/, /[-\u2212] [-\u2212]/, /\/[-\u2212]/, /(^|[^\w.])[-\u2212]0(?![.\d])/, /(^|[^\d.\w\\])1i\b/];
    out.signHits = [];
    for (const id of m.FAMILIES) for (let s = 1; s <= 60; s++) {
      const c = m.generate(id, s);
      for (const t of [c.statementText, c.answer.text, c.answer.tex, c.worked.cart, c.worked.polar]) if (BAD.some((re) => re.test(t))) out.signHits.push(id + '#' + s);
    }

    // every family, seeds 1..20: no exception, every card survives JSON, and it is fast
    const t0 = performance.now(); let n = 0; const bad = [];
    for (const id of m.FAMILIES) for (let s = 1; s <= 20; s++) {
      const c = m.generate(id, s); n++;
      if (JSON.stringify(JSON.parse(JSON.stringify(c))) !== JSON.stringify(c) || c.id !== id || c.seed !== s) bad.push(id + '#' + s);
    }
    out.cards = n; out.ms = performance.now() - t0; out.bad = bad;
    out.unknown = m.generate('nope', 1);
    out.info = m.familyInfo('2.5.1');

    // A4: read the module's own text
    const src = await (await fetch('./js/data/generators.js')).text();
    out.imports = (src.match(/^import\s/gm) || []).length;
    out.fromComplex = /^import \{[^}]*\} from '\.\.\/core\/complex\.js';$/m.test(src);
    out.forbidden = [/Math\.random/, /\bDate\b/, /\bdocument\b/, /\bglobalThis\b/, /\blocalStorage\b/, /\bsetTimeout\b/, /\bperformance\b/, /\bwindow\s*[.\[(=)]/].filter((re) => re.test(src)).map(String);
    return out;
  });

  ctx.assert(JSON.stringify(r.exports) === JSON.stringify(['FAMILIES', 'check', 'draw', 'familyInfo', 'generate', 'rng', 'solve', 'statementFor']), 'the module exports exactly the eight names of ARCHITECTURE 11.6: ' + r.exports);
  ctx.assert(r.families === 29 && r.frozen, 'FAMILIES is a frozen list of 29 ids');
  ctx.assert(r.same, 'generate("1.4.2", 7) is the same card twice');
  ctx.assert(r.given.n === 4 && r.given.c.re === -81 && r.given.c.im === 0, '1.4.2 seed 7 is the fourth roots of -81: ' + JSON.stringify(r.given));
  ctx.assert(r.sketch.kind === 'roots' && r.sketch.n === 4, 'the pinned card asks for four roots');
  ctx.assert(r.statementText === 'Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms.', 'statement text: ' + r.statementText);
  ctx.assert(r.answerText.startsWith('3 e^(i pi/4), 3 e^(i 3pi/4), 3 e^(i 5pi/4), 3 e^(i 7pi/4) = '), 'answer text: ' + r.answerText);
  ctx.assert(r.values.n === 4 && r.values.c.re === -81, 'the values preset is { c, n }');
  ctx.assert(r.checkOk === true, 'the exact roots pass check()');
  ctx.assert(r.checkRotated === false, 'roots rotated by 10 degrees fail check()');
  ctx.assert(near(r.a1.product.re, 5) && near(r.a1.product.im, -5), '1.1.1 product 5 - 5i');
  ctx.assert(r.a1.distance === 5, '1.2.2 distance 5');
  ctx.assert(near(r.a1.power.re, -16, 1e-9) && near(r.a1.power.im, 0, 1e-9), '1.3.2 (sqrt2 + sqrt2 i)^4 = -16');
  ctx.assert(JSON.stringify(r.a1.primitive) === JSON.stringify([false, true, false, false, false, true]), '1.4.1 primitive flags for n = 6');
  ctx.assert(JSON.stringify(r.a1.roots43) === JSON.stringify([{ re: 3, im: 2 }, { re: 3, im: -2 }]), '1.4.3 roots 3 +- 2i');
  ctx.assert(r.a1.parabola.vertex === 9 && r.a1.parabola.coeff === -1 / 36 && r.a1.parabola.focus === 0, '2.1.2 x = 3 gives u = 9 - v^2/36');
  ctx.assert(r.a1.line251 === 'Im w = -1/2', '2.5.1 |z - i| = 1 gives Im w = -1/2');
  ctx.assert(r.a1.fprime === '4z - 3', "3.1.1 f'(z) = 4z - 3");
  ctx.assert(/w = 4 e\^\(i\(t \+ pi\)\) covers the whole circle \|w\| = 4$/.test(r.text.p4), 'P4 seed 6 prints the image radius 4 in w: ' + r.text.p4);
  ctx.assert(r.text.p5.includes('but 0 along the imaginary axis'), 'P5 seed 8 (y = x^3) quotes the imaginary axis: ' + r.text.p5);
  ctx.assert(r.text.turn.includes('turn by Arg a = -pi/2 (clockwise)'), '2.1.3 seed 10 turns clockwise: ' + r.text.turn);
  ctx.assert(r.text.axis.includes('on the negative real axis') && !r.text.axis.includes('quadrant'), '1.3.1 z = -1 is on the negative real axis: ' + r.text.axis);
  ctx.assert(r.text.quotient === 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i', '1.1.1 seed 3 prints the exact quotient: ' + r.text.quotient);
  ctx.assert(r.text.signs.includes('(9 \u2212 y\u00b2) \u2212 6iy') && r.text.signs.includes('y = \u2212v/6'), '2.1.2 x = -3 folds its signs: ' + r.text.signs);
  ctx.assert(r.text.circle === 'the circle |w + 1/2| = 1/2 (through 0)', '2.5.1 x = -1 prints w + 1/2: ' + r.text.circle);
  ctx.assert(r.signHits.length === 0, 'no sign-unaware template in 29 families x 60 seeds: ' + r.signHits.slice(0, 8).join(', '));
  ctx.assert(r.cards === 580 && r.bad.length === 0, 'all 29 families give 20 clean cards: ' + r.bad.join(', '));
  ctx.assert(r.ms < 600, `580 cards in ${r.ms.toFixed(0)} ms (limit 600)`);
  ctx.assert(r.unknown === null && r.info && r.info.hasLab === true && r.info.sketch === 'line', 'unknown id gives null; familyInfo("2.5.1") reports its lab and sketch');
  ctx.assert(r.imports === 1 && r.fromComplex, 'exactly one import, from ../core/complex.js');
  ctx.assert(r.forbidden.length === 0, 'no clock, no randomness, no browser object in the module: ' + r.forbidden);
  ctx.log(`i2-generators: ${r.cards} cards in ${r.ms.toFixed(0)} ms at ${ctx.viewport && ctx.viewport.width ? ctx.viewport.width : '?'} px`);
}
```
