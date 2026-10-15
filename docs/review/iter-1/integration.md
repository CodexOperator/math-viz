# Integration report, iteration 1

Role: integrator. All goal builds and the residue sweep were finished when this pass began; nothing else was running. Nothing was committed.
The only files not touched are `docs/ASSIGNMENT.md` and `docs/CONSTRAINTS.md`.

## 1. Result

| Check | Before | After |
|---|---|---|
| `npm test` | 774 of 774 | **783 of 783** (new: `tests/unit/i1-integration.test.mjs`, 9 tests; `U12b` in the Lab file; the aha test is now strict against STORY) |
| `node tools/smoke.mjs --dark --out docs/review/iter-1/integration` | 63 of 63 | **63 of 63** (21 routes, desktop, phone, desktop dark; no console error, page error, failed request, overflow or error panel) |
| Interaction scripts (every `tests/interact/*.mjs`, desktop, phone, dark) | not run as a set | see section 6 |
| New story walk `tests/interact/i1-integration.mjs` | none | passes at desktop, phone and dark: menu and header reach all 21 places, the map links to 20, every thread can be walked from `home` to `problems` by the pages' own links, all 29 `#problem-...` links land on their station with the handout answer in the readout, every link on every page is a known route, one readout style on all 21 stations |

The baseline was already clean, so the work was the sweep check, the five residue items, and what the screenshots and the cross-station scans showed.

## 2. The residue sweep: verified, with spot checks

Every one of the 188 entries of `residue/*.json` has a row with a disposition in its report (checked by script: C1 20, C2 9, C3 23, S1 25, S2 27, S3 30, S4 28, S5 21, S6 13; D 26 carry the field in the JSON). The reports' own counts add up.

I re-ran every interaction script of the sweep (the reports quote them as passing) and then checked "marked fixed" claims on the live pages with a scratch script that drives the real DOM. Checked and passing:

| Report | Spot checks (on screen or in a script run) |
|---|---|
| C1 (plane.js) | the ramp weight default 0.4 and the family colours on the Lab planes (`core-three` S28 now compares 0.65, 0.4 and 0.3 by value); the label placer on the arithmetic division view (every theta word placed: `labels()` all true); axis numbers kept off an edge axis on the CR w-plane (screenshot) |
| C2 (three, shapes, mapping) | the sphere framing with `frameLabels` (`core-three` S27, desktop, phone, dark, after fixing a check that only looked for a dark glyph); the 4D graph lifts the Lab's grid (no "grids stay in the Lab" text); the pole cap on the 1/z landscape |
| C3 (core and data) | the z = 0 staircase line; `fmtAngle` q = 18 (powermap 50 and 55 degrees read `5π/18`, `11π/36`); `sup.prose-sup` raise in the Lab and the sidebar; `sameLabel` footers ("same radius", "room around p", "same root") |
| S1 (home, problems, lab) | `142` finds 1.4.2 and `conjugate` finds T1.1, 1.1.2 and P1; the sector gesture and the first-visit example (the interaction script and screenshots); the closing full stop stays with the maths on the cards; **the "Plain text version" chevron: the details sits inside the revealed answer, and the computed chevron is present** |
| S2 (addresses, arithmetic, distance, sets) | the Bounded chip's draggable disk handle `#sets-plane-bound`; stale `aria-invalid` cleared; the tiny-denominator form; the P2 text; readouts typeset |
| S3 (curves, linear, staircase, powers) | no literal braces in the circle takeaway; no sideways scroll at 320 px on staircase and powers; the walk stops when a preset is clicked; the stage caption does not reflow (the viewport shot of `linear` with its sticky bar) |
| S4 (roots, principal, branches, graph4d) | `k = 0, 1` lists; the grids are lifted on graph4d; the neutral callout text on the 1.4.3 deep link; the homeLabel line on branches |
| S5 (powermap, reciprocal, mappings, CR) | one span per neighbour link and a raised exponent (checked in `R9c` and on screen); the CR verdict has real superscripts; the Invert stage arrow; the CR w-plane is centred on f(z₀) |
| S6 (limits, derivative) | the `z₀` word is on the canvas, with no DOM word; 4 clicks of "+" leave z₀ within 1 px of its place; the spin label stays off the arrowhead on a phone; `Arg h = 0°` has no repeated "(0)" |

One claim did not hold: **S5 request 8 (the exponent in the neighbour links) was true for the four stations that had been fixed but not for the links on `roots` and `principal-root`, and the Lab chips** (the item listed in the residue). All three are fixed now, and rule 10.4.8 has no known violation left.

## 3. The five residue items

1. **Sweep:** section 2.
2. **Lab function chips** (`js/stations/lab.js`): every chip label is now one `<span>` holding the `prose()` output. The exponent in `zⁿ`, `eᶻ` and `z^(1/3)` is raised, with no 8 px gap.
3. **Staircase at z = 0** (`js/core/staircase.js`): the line reads `Arg z: no angle at 0` (with a home label, `chosen θ: no angle at 0`), beside the existing "arg z is not defined here" and "The point 0 has no angle ..." lines. The two interaction scripts and four design documents that quoted the old `= undefined` were updated.
4. **Hygiene:** the three applied `C*-architecture*.patch` files are deleted (`git rm`). There was no `*.orig` file and no `tmp/` directory in the repository (the D fixer had already removed `ARCHITECTURE.md.orig`). The `AHA_LABELLED` table and its "or the labelled wording" branch are deleted from `tests/unit/i1-data.test.mjs`; the aha test now compares every sentence to STORY section 3 exactly, except 2.2.2 which is corrected on purpose.
5. **Cross-station consistency:** section 4.

## 4. Cross-station consistency: what the scans found and what changed

I dumped the visible text of all 21 routes and all 29 problem deep links, and a second dump after pressing every button and moving every slider of every station (about 4,200 distinct lines), then searched for the forms a student should not meet. Findings and fixes:

| Finding | Where | Fix |
|---|---|---|
| **π was typeset on six stations and written `pi` on eight** (readouts, notes, the explainer's roots list: `2 e^(i pi/4)`, `Arg c = pi`, `window (-pi, pi]`) | roots, principal-root, branches, powermap, limits, derivative, reciprocal, home, Lab | every readout now uses `fmtAngle(..., { unicode: true })` or a literal `π`: `2π/3`, `window (-π, π]`, `roots at (Arg c + 2πk)/n` |
| `z0`, `w0`, `f'(z0)`, `eps = `, `delta`, `rho = `, `90 deg`, `chosen theta` in readouts and notes | derivative, limits, cauchy-riemann, branches, Lab | `z₀`, `w₀`, `f′(z₀)`, `ε = 0.5; largest δ = 0.225`, `ρ = 0.2`, `90°`, `chosen θ`; headings `In r and θ (polar)`, `f on (r, θ)` |
| a number too big for decimals printed as `1.5e+25` (and `8.529e+25` in the CR readout and `1.0e-4` in the Lab check) | core `fmtNum` (from 1e15), CR, Lab | new `fmtSci` in `js/core/complex.js` (documented in ARCHITECTURE 3.1): `8.529×10²⁵`; `fmtNum` and `texNumber` use it |
| the ASCII answer line under each answer (`the real axis (v = 0) ...`) was a proportional font on six stations and mono on five | addresses, arithmetic, branches, lab, powermap, reciprocal | `muted mono` everywhere (it is the one place `pi` and `sqrt(3)` stay on purpose: what a student can type) |
| thread badges read "T1 · Addresses", "A function is a motion", "T3 A function ..." and "Motion and zoom" depending on the page | 19 stations | one `threadLabel()` in `js/registry.js`: `T2 · The staircase` everywhere; the map legend and the problem index use it too |
| thread links read "Earlier on the staircase thread: ...", "T2 next: ...", "(thread T2)", "Previous: ...", "T3 starts at ...", "T1: ..." and the Lab had none | 17 stations | one `threadLinkPrefix(thread, dir)`: `T2 next: ...`, `T1 previous: ...`; a thread stop that is already the plain neighbour is offered once; story bridges that are not neighbours say `Related: ...`; rule 10.1.10 in ARCHITECTURE |
| **a thread could not be walked**: `branches` linked T2 on to the 4D graph while the registry puts the Lab between them; `graph4d` offered "T2 previous: Branches" although the Lab is the previous T2 stop; `sets` linked to `#distance-circle`, which `parseRoute` rejected for every station except `distance`, as a "route" with a hand-written bridge | branches, graph4d, sets, distance, derivative | `branches` now says `T2 next: The Mapping Lab` and keeps `Related: The 4D Graph`; `graph4d` says `Related:` for the two bridges; `distance` and `sets` link to each other as `Related:` and their prev/next/thread links come from the registry; the integration script walks all three threads with real clicks |
| a station title with an exponent (`zⁿ: Fans and Parabolas`) was plain text in the map, the plan chips and several links | home, problems | `typesetTitle()` (SVG text, Unicode superscripts) and `titleSpan()` (HTML, one span) |
| the Lab opened with its 2.5.1 line framed ±10 so the line Re w = 1/2 sat 4 percent of the half-width from the v axis and read as the axis | Lab | `frameBounds()`: when `imageBounds` had to drop pole spikes the frame holds the bulk (±5); a polynomial image keeps the whole frame |
| "Lives at addresses One Point, Two Addresses Also at staircase" ran together | problem cards | a middle dot before "Also at" |
| the plain-text answer on the two Lab cards, curves and linear still shows `theta` and `pi` | | on purpose (the typed-input idiom); documented |

Arg and arg: I scanned every line that mentions an angle. Every one says `Arg z` (the one value), "a name for arg z" or `arg z` (the set); there is no bare "θ = 1.228 rad" and no place that writes the set as a number. The wording of the handout (`arg z and the principal argument Arg z` on the syllabus card) is accurate.

Deep links `#problem-x-y-z` (all 29): every one lands on its owner with the problem's own card and a readout that shows the handout answer (the `READOUT` table in `i1-integration.mjs`: 1.1.1 `5 + 14i`, 1.3.2 `512 - 886.81i` and `home step = -1.047 (-π/3)`, 1.4.2 `Arg c = π`, 2.1.2 `u = 4 - v²/16`, 2.2.1 `3π/4`, 2.4.1 `0.5 + 0.866i`, 2.5.1 `Re w = 0.5`, 3.2.1 `1.149 + 1.183i`, P3 `-1 + i` and `-i`, and the others). I also looked at the first 1,750 px of all 29 pages: each shows the preset's picture, the statement, and the two columns.

## 5. The story wired together

`js/registry.js` has all 21 stations (unique ids, contiguous story order 0 to 20, every module exists and exports `mount(el, ctx)`: unit test I1). `parseRoute` sends every `#<station>`, `#problem-...`, `#topic-...` and `#<station>-<token>` the app builds to the right station (I2). Each problem is listed by its owner and its `alsoAt` stations and no one else (I3). Each thread starts at `home`, ends at `problems`, and `next` then `next` visits its stations in story order, and `prev` walks it back (I4); the pages' own links do the same on screen (script step I3). No link leaves the registry (I5). The menu, the map and the header title go to every station and back (script I1 and I2, with Back).

## 6. Verification run

Every `tests/interact/*.mjs` script, run with `node tools/smoke.mjs --route <routes> --script <file> --dark --no-shots` at desktop 1280, phone 390 and dark desktop. Results are in section 7 once the last run finished.

Changed scripts, all because a format changed on purpose: `i1-core-widgets` (the z = 0 line), `i1-core-three` (S27's glyph check looked for dark pixels, so it never passed in the dark theme once the label is light; S28 compared the rampWeight with the old default 0.65, which changed to 0.4 in the sweep), `i1-station-home-problems`, `-staircase-powers`, `-roots-principal`, `-branches-graph4d`, `-powermap-reciprocal`, `-limits-derivative` and `-mappings-cr` (π, ε, δ, z₀, f′, `°`, `×10ⁿ` in the pinned readouts). The unit pins moved the same way.

## 7. Final output summary

(see the end of this file)

## 8. What remains, and why it was not fixed here

Larger items stay under "Open for iteration 2" in `docs/review/iter-1/residue/D-report.md`: the plane.js placer that returns the box it chose (and the three requests that follow from it), `arrowInset`, a `PARTS` export, the shared `station-kit`, `chrome` and `problem-card` modules, and a mid-width home map. Items 7, 10 and 12 of that list are now done and marked so there. New items from this pass:

| Where | Problem | Why it waits |
|---|---|---|
| the neighbour-link builders (17 copies), the thread badges and the header chips | the wording is now one function each, but every station still builds its own `<nav>` and header | a shared `chrome.js` is the D-report item 9; the wording is the part a student sees, and it is now tested by `i1-integration` I6b |
| tiny numbers in TeX | `texNumber` writes a number of 1e15 or more as `1.5\times 10^{20}`, but a number below 0.0005 is rounded to `0` by its three decimals (`texNumber(2.44e-4)` is `0`) | the stations that show tiny values (`powers`, `arithmetic`, `sets`) carry their own formatters (`fmtSmart`, `texDen`, `fmtEps`) and test them; moving them into complex.js is a core change for iteration 2 |
| the plain `<a>` Back/Next of `derivative` and `limits` keep a second explanatory line | by design of the S6 goal ("the circle shrinks to a point") | not a consistency fault |
| `docs/designs/iter-1/*.md` still describe readouts in ASCII in places | the designs are history; ARCHITECTURE section 9 and 10.7.2 are the living text and were updated | not edited wholesale |
