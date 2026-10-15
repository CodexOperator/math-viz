# S1 residue report: home, problems, lab (iteration 1)

Group S1 owns `js/stations/home.js`, `js/stations/problems.js`, `js/stations/lab.js`, `tests/unit/i1-station-home-problems.test.mjs`,
`tests/unit/i1-station-lab.test.mjs`, `tests/interact/i1-station-home-problems.mjs` and `tests/interact/i1-station-lab.mjs`. Nothing else in
the repository was edited, except this file. Nothing was committed and `docs/ARCHITECTURE.md` was not touched (the doc changes it needs are in section 5).

## 1. Totals

`residue/S1.json` has 25 entries (13 home and problems, 9 lab, 1 each for the two requests the lab received).

| | |
|---|---|
| Fixed | 20 (0, 1, 2, 3, 4, 5, 7, 10, 11, 12, 13, 14, 16, 18, 19, 20, 21, 22, 23, 24) |
| Fixed in part, the rest declined with a reason | 3 (8 and 9: the wide map's width; 15: the probe next to 0) |
| Declined | 2 (6: the order in acceptance A4; 17: a red test that is not the Lab's and is green now) |

The numbers are the indices of the entries in file order (0 to 24). Core options adopted: `specToCurves`, `frameLabels` with padding 1.0,
`rampWeight`, `obstacle` and `createLabelPlacer`. Tests: `npm test` 774 of 774. Every new check was mutation-tested (section 6).

## 2. Disposition of every entry of `S1.json`

### home.js and problems.js

| # | Entry | Disposition |
|---|---|---|
| 0 | "Plain text version" `<details>` has no marker | **Fixed.** `.pc-plain summary::before` draws the shell's chevron (it turns when open), and the label now reads "Plain text version (wraps to fit)". Interaction script: the computed `::before` is not `none`, the label, and the chevron turns on open. |
| 1 | The no-match sentence echoes the whole query and a 300-character query widens the page | **Fixed.** `.finder-empty` has `min-width: 0` and `overflow-wrap: anywhere`, and the sentence echoes the first 40 characters and an ellipsis (`FINDER_ECHO_MAX`; the search itself still reads 80). Script: a 300-character query gives 0 px of overflow at 1280 and 390 and the echo is 40 characters. |
| 2 | "Problem 1.3.1 is this dot" is static | **Fixed.** Now "The starting dot is problem 1.3.1: -1 + 1.732i. Its polar address is r = 2, Arg z = 2pi/3." It is true whatever the dot does. |
| 3 | A bare θ in the Cartesian cell of row `convert` | **Fixed.** The cell reads `x = r cos(Arg z)` and `y = r sin(Arg z)`. Script: the cell's `data-tex` has `\Arg z` and no `\theta`. |
| 4 | The plane's name ends `..` | **Fixed.** The string passed to `createPlane` has no final full stop. Script: the aria-label has no `..`. |
| 5 | Wide map captions read as the previous row's | **Fixed.** The caption baseline is `y - 44` (was `y - 50`): about 24 px under the previous row's problem dots and about 19 px over its own station number (the review measured 18 and 25). The unit sweep U6 (no label, number, caption, dots row or U-turn overlaps, every width) still passes, and a new unit test pins `y - 44` and that the caption stays clear above its own number. |
| 6 | Acceptance A4 as worded versus the memory-only chapter filter | **Declined.** Design 10.2 prescribes clicking All first; the filter is memory-only on purpose (a reload shows everything), and the card is reachable the moment the student presses All. Keeping a ticked card visible under another chapter's filter would contradict the filter, so the fix belongs in the acceptance text: "press All, then tick 1.1.1". No code change. |
| 7 | `home-demo-plane`, `home-demo-ex`, `home-demo-stairs` are widget ids, not element ids | **Fixed.** The three host elements carry those ids (checked: exactly one element each, and no duplicate id anywhere on the page). The sub-ids (`#home-demo-plane-z`, `#home-demo-ex-same`, ...) are unchanged. |
| 8 | A 760 px host means a viewport of about 1122 px | **Fixed in part.** `WIDE_MIN` is now **712**. The collision sweep (the unit test's `validateWide`, 4 px steps) is clean from 712 up and fails just below it (two part captions overlap), so 712 is the limit with the present part names; from 700 up no station title is cut by the 3-line limit, at 680 and below "Slide, Spin, Stretch, Mirror" is. Gain: windows of about 1074 px and up (an iPad 10.2 inch in landscape, 1080) now get the serpentine map. **Declined:** a wide map for 1024 to 1073 px (host 662 to 711). It needs shorter part names (`PART_LABELS` must start with the app's `PART_TITLES`, test U11) or a cut station title; a mid layout is a design change for iteration 2. |
| 9 | Same as 8 (second copy of the entry) | **Same disposition as 8.** |
| 10 | `142` finds nothing; `conjugate` finds only topic T1.1 | **Fixed.** `normalizeQuery('142')` is `1.4.2` (three digits only; two and four digits are left alone). A new low-weight field `detail` (the two routes and the plain answer, weight 3, word starts of three letters or more only) is searched after every other field: it adds matches at the end and never reorders what the other fields found (unit test over seven queries). `conjugate` now finds T1.1, 1.1.2 and P1; `circle` goes from 15 to 19 matches, `roots`, `branch`, `cr`, `derivative` and `lab` are unchanged. |
| 11 | The closing full stop of 1.1.2 wraps onto its own line | **Fixed.** `statementNodes()` (pure, exported from problems.js) moves the punctuation that opens the text after a maths part onto that maths part, and `appendStatement()` keeps the pair in one nowrap run. Used by the cards and by the finder results. Unit test: no text is lost for all 29 statements; script: no card has its closing punctuation alone on a line. |
| 12 | The demo caption names colours in words | **Fixed.** It names the roles, "Its Cartesian address says where it sits ... Its polar address says how to reach it ...", tinted by `--cart` and `--polar` through the tokens, and "The dashed seam line" replaces "The grey dashed line". It still names both addresses, the solid arc as Arg z and the faint arcs as the set arg z. |

### lab.js

| # | Entry | Disposition |
|---|---|---|
| 13 | The time ramp washes the family colours | **Fixed.** Cartesian and polar strokes on the three planes and on the sphere pass `rampWeight: FAMILY_RAMP` = **0.3** (the plane default is 0.4; the brush, polygon and line, which have no family, keep it). Measured with the plane's own `rampColor` on the tokens (OKLCH, share of the token's chroma kept at t = 0.1 / 0.5 / 0.9, hue shift): polar light 72 / 70 / 68 percent, 3 degrees (0.4: 61 / 58 / 54); polar dark 63 / 66 / 68 percent, 2 degrees (0.4: 50 / 53 / 58); cart light 83 to 86, cart dark 74 to 85 percent; the lightness climb is 0.08 (0.4: 0.12), so the arrowhead and the t dots are still the time cue. Script, on real canvas pixels in light and dark: the polar circle and the cart rectangle keep at least 55 percent of the token's chroma and stay within 8 degrees of its hue, and the luma still climbs by at least 12 from t = 0.1 to 0.9. At the old 0.65 the polar circle keeps 20 to 31 percent of its chroma and its hue is off by 8 to 24 degrees, and the script fails. |
| 14 | 1/z landscape and 4D graph: a hairline spike over a tiny base | **Fixed.** `landscapeParams` and `graph4dParams` take the function's poles as a third argument; when the drawing comes within 0.35 of a pole and the cap would be above `POLE_CLAMP` = 10, the cap is 10 and `pole: true`. For 2.5.1 the cap is 10 instead of 21.4, so the surface fills the frame (the base is about 130 px wide on a desktop, against the 50 px the review measured), and the legend says "Grey tops are cut off at height 10. Your drawing runs into a pole of f, where the height has no top: that is the spike." Functions with no pole, and bounded ones with a hole (z²/\|z\|²), are unchanged (unit tests). |
| 15 | The probe cannot hit the pole exactly | **Fixed in part.** A probe within 1e-6 of 0 is 0, so "z = 0 -> w = undefined" (script, by `handle.set`; 1e-5 stays a real point). **Declined:** "Arg z = pi at z just above -1 reads as if it were -1". That is `exactAngle` printing pi for a number within its tolerance, which is correct and lives in complex.js. |
| 16 | The sector gesture gives r = 2.0000000000380496 | **Fixed.** `sectorFromCorners` rounds the radii to 9 decimals. Dragging from 0 to 1.5 + 1.5i gives the preset sector bit for bit (`{ r0: 0, r1: 2, theta0: 0, theta1: π/4 }`, script and unit test), so `detectProblem` and the numeric check see 2.2.1 exactly. |
| 17 | `npm test` red because of curves-linear | **Declined.** Not the Lab's file, and already resolved: `npm test` is 774 of 774. |
| 18 | `#lab-fn-tex` can widen the page | **Fixed.** The formula sits in `div.tex-scroll#lab-fn-tex-box`; `#lab-fn-echo` wraps anywhere. Script: sixty factors of `z^2` and a 321-character bad formula both give 0 px of overflow at 1280 and 390. I did not cap the typed length: the scroll box makes it unnecessary. |
| 19 | The function's note gives the answer under Predict first | **Fixed.** While the image is hidden the note line reads "Reveal the image to read what this function does to a shape." and the name and the formula stay; Reveal brings the note back. Script: for the four presets the first 22 characters of the note are nowhere in the visible text of the whole page (not only `#lab-problem`), and the note is back after Reveal. |
| 20 | Stroke colouring needs a per-curve weight | **Fixed** with 13 (plane `rampWeight` per curve, sphere `addCurve` option). |
| 21 | 1/z landscape: the clamp rises to 60 | **Fixed** with 14. |
| 22 | The end of a large image is off the w-plane (blamed on the plane's zoom-out cap) | **Fixed, and the cause was not the plane.** The view was 64.7 units across, far from the plane's 200 cap. `imageBounds` in lab.js dropped points beyond 2.5 times the 90th percentile of \|w\| as "pole spikes", and for the 1.5.1 segment under z³ that is a cap of 58 against a farthest point of 76, so the end of the stroke was left out of the fit. The factor is 4 (the pole circle of 2.5.1 still has its two nearest samples cut). Script: the whole image of the segment under z³ is inside the w-plane. |
| 23 | Request from curves-linear: consume `lab.request` | **Done and verified; one gap closed.** The Lab already consumed and removed the request. Checked in the browser with the three forms (`'linear-i'`, `'linear-1i'`, `{ src: '(1.5 - 0.25i)*z + (0.5)' }`), problems 2.1.3, P4 and null, and `shapes: []` (unit tests U31 and U5, script). The gap: `shapes: []` (a freehand stroke is never handed over) replaced the student's drawing by nothing and wrote that over the stored one. A request without shapes now brings the function only; the drawing is the student's own stored one, or on a first visit the example's circle. |
| 24 | Request from branches-graph4d: `lab.strokes` format | **Done and verified.** The Lab stores an array of Specs (the `LabRequest` shapes plus `freehand`, `cartGrid`, and `fillRays`, `fillArcs`, `grid` on `sector`). Unit test U32 sends every kind the Lab can draw, through JSON, to `graph4d.extractShapes`: all are drawn, none is left out. New convention (section 4): `[]` means the student cleared the Lab; `extractShapes([])` is "no shapes". |

## 3. Core changes adopted (C1 section 6, C2 section 6, C3 "for other owners")

| From | What | In the Lab / home / problems |
|---|---|---|
| C2 | `specToCurves` from shapes.js instead of a private builder table | The Lab's table is gone: its `specToCurves(spec, shapeId)` (still exported, the core-mapping parity test C2-2 uses it) calls shapes.js with the Lab's resolution (`BUILD_OPTIONS`: 64 per segment, 128 per line and circle, 32 a side, 48 and 96 around a ring) and keeps the Lab's ids and roles. The imports `segment`, `circle`, `rect`, `polygon`, `verticalLine`, `horizontalLine`, `sector`, `annulus`, `cartGrid` are gone (unit test U28, and U29 compares 13 specs of every kind with the direct call). |
| C2 | Sphere with `frameLabels: true` at padding 1.0 | `riemannSphere({ radius: 1, frameLabels: true })` and `fitTo(sph.group, { padding: 1.0 })` (was 1.25 by hand). Script: the sphere is whole in its frame (largest \|NDC\| 0.95 on a phone, 1.00 or below on a desktop) and not tiny. With the old call the same check gives 1.14. |
| C2 | `rampWeight` on the sphere's strokes | `sph.addCurve(points, token, { rampWeight: FAMILY_RAMP })` for family strokes. |
| C1 | `rampWeight` per curve, default 0.4 | See 13. |
| C1 | `obstacle` and `createLabelPlacer` where labels collide | The words beside the time cursors (`z(t)`, `w(t)`, `f_s(z(t))`), "your guess" and the probe's `w` come from the placer, with ten spots around the dot, and every primary outline is `obstacle: true`. A dot that is off the plane (the probe's w = 2i on the P4 plane) gets no word pinned to the edge. Script: at six values of t `z(t)` and `w(t)` are at least 1 px clear of the outline (they touched it before: the same check with only the first spot fails with clearance 0). |
| C1 | `handle.setLabel`, `labelSide`, `zOrder`, `names`, `symbol`, `alpha` | Not needed: the home dot and the Lab's probe are the only handles, one per plane. |
| C3 | Copy that says Arg and arg | Cards, the Lab's problem panel and the explainer rows read the data fields, so they follow. U21 (every worked answer recomputed from complex.js, all 29 problems) passes unchanged. |
| C3 | `PARTS` export from registry.js | Declined by C3 itself (iteration 2); `PART_LABELS` in home.js stays and test U11 guards the drift. |
| C3 | `sameLabel`, `homeLabel`, `compact` | Not needed: the home demo is "same point", its staircase is the home step of arg z. |

## 4. Behaviour changes a reader of the Lab must know

* **First visit.** With nothing under `lab.strokes` (and no request, no token), the Lab opens on problem 2.5.1: the circle |z − 1| = 1 under 1/z, with the problem panel, the numeric check ("passes") and a line under the presets saying why ("To start, here is problem 2.5.1 ... Clear it to begin with a blank page, or load another test problem above."). It was a blank page (design D1).
* **`lab.strokes`.** An array of Specs. The example is stored like any drawing, so the 4D graph sees it. Clear stores `[]`, and a Lab with `[]` opens blank: a missing key is the only first visit. Nothing replaces a stored drawing: a stored array is shown as it is (also with an unknown token, which used to wipe it when the student left); unmounting writes only if the drawing changed, so a shape this version cannot draw is not trimmed from the store by a visit. A damaged value (not JSON) counts as a first visit. With storage blocked the Lab still draws the example each time.
* **Still by design:** a click on a preset, `#lab-<token>` and a hand-off that carries shapes replace the drawing and store the new one (the student asked for it; Undo covers the session).
* **An unknown token** (`#lab-nonsense`) says so and shows what a plain visit shows (the stored drawing, a blank one, or the example), where it used to show a blank Lab.

## 5. Documentation changes needed (not made)

`docs/ARCHITECTURE.md`:
* Section 4, point 2, and the D1 request in `D.json` (entries from i1-station-lab): the Lab does **not** open blank. The default state is the 2.5.1 example (not the first problem, 2.1.2, as 4.2 reads). `lab.strokes` is an array of Specs, `[]` means cleared, a missing key means first visit; the Lab writes nothing until the drawing changes; a request without shapes brings a function only; an unknown token shows the stored drawing.
* Section 9 (ids): `lab-fn-tex-box`, `home-demo-caption`; `home-demo-plane`, `home-demo-ex` and `home-demo-stairs` are now element ids (hosts); `lab-start-notice` is shown on a first visit too.
* Section 10.4.1: a statement's closing punctuation stays with the maths before it (`appendStatement` in problems.js is the helper).
* Section 10.6.3 or 3.12: nothing else; `padding: 1.0` with `frameLabels: true` is what the sphere now uses.

`docs/designs/iter-1/i1-station-lab.md`: D1 and acceptance A2 ("opens blank"), the clamp rule (cap 10 at a pole), padding 1.25 for the sphere, stroke ramp 0.65. `docs/designs/iter-1/i1-station-home-problems.md`: `WIDE_MIN` 760 (now 712), caption `y - 50` (now `y - 44`), the searchable fields (add `detail`, three-digit ids), the finder echo (40 characters), 2.2 ids table, the demo caption wording. `docs/STORY.md` section 5 calls the Lab "the student's blank page": now it opens with an example.

## 6. Verification

| check | result |
|---|---|
| `npm test` | **774 of 774** (before the cleanup began the suite was 718 of 718; my two unit files now hold 36 and 38 tests) |
| `node tools/smoke.mjs --dark --route home,problems,lab,lab-2-5-1,lab-2-2-1,lab-P4` | **18/18** (six routes, desktop, phone, desktop dark): no console error, page error, failed request, overflow or router error panel |
| `--route home,problems --script tests/interact/i1-station-home-problems.mjs --dark` | **6/6** (desktop, phone, desktop dark) |
| `--route lab --script tests/interact/i1-station-lab.mjs --dark` | **3/3** (desktop, phone, desktop dark) |
| Screenshots read with the image tool | home, problems, lab, lab-2-5-1, lab-2-2-1 and lab-P4 at desktop, phone and dark (the full-page shots were cropped to the hero, the map, the answer cards, the planes and the 3D views): caption and problem line on the home page, the map captions, the chevron and the statement punctuation on the cards, the first-visit Lab and its notice, the three presets in both themes, the sphere and the landscape of 2.5.1. Everything reads as intended. In the P4 plane `w(t)` sits between two tick numbers on the u axis (clear of the circle, close to the numbers: the placer takes a tick number, cost 8, before a line, cost 25). |

New and changed tests: unit, home and problems U4 and U6 (wide threshold, sweep from `WIDE_MIN`, caption row), U7 and U8 (`142`, `detail`, re-pinned totals), U19b (`statementNodes`), U19c; lab U4b (the example), U12 (new cap), U15 and U15b (poles), U23, U24 (imports, `as` names), U25, U26b, U28 to U32, U27 (note). Interaction: the first-visit block (example, stored, Clear, return, reload, stored drawing, unknown token three ways, damaged value, a shape this version cannot draw, blocked storage), stroke colours on canvas pixels, the cursor words against the outlines at six t, the whole-page predict leak check, long formulas, the probe at 3e-7 and 1e-5, the whole z³ image on the w-plane, a request without shapes (with and without a stored drawing), and the home and problems checks for each item above.

**Mutation checks.** Every new check was shown to fail on a deliberate break, run on a scratch copy of the tree: ramp 0.65, no example, a cleared Lab that gets the example again, an example that replaces a stored drawing, words at the first spot only, the note not hidden, a probe not snapped, radii not rounded, no pole cap, the formula outside its scroll box, an unmount that writes an unchanged drawing, bounds factor 2.5, a request without shapes that replaces the drawing, no `frameLabels` (the sphere check reads 1.14); on home and problems MUTATION_HP.

## 7. Requests for other owners

* None required. For information: item 22 was not the plane's zoom cap, so nothing is needed from plane.js; `graph4d.js` reads the Lab's store as it is (a later switch of its `shapeCurves` to `specToCurves`, C2's suggestion, is its owner's).
