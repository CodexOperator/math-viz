# S4 residue report: roots, principal-root, branches, graph4d (iteration 1)

Group S4 owns `js/stations/roots.js`, `principal-root.js`, `branches.js`, `graph4d.js`, their two unit test files
(`tests/unit/i1-station-roots-principal.test.mjs`, `tests/unit/i1-station-branches-graph4d.test.mjs`) and the two interaction scripts
(`tests/interact/i1-station-roots-principal.mjs`, `tests/interact/i1-station-branches-graph4d.mjs`). Nothing else in the repository was edited.
`docs/ARCHITECTURE.md` was not touched (it already describes the core options used here). Nothing was committed.

## 1. Counts

| | |
|---|---|
| Entries in `residue/S4.json` | 28 |
| Fixed | 22 |
| Part fixed, the rest declined with a reason | 3 (entries 4, 21, 26) |
| Declined | 3 (entries 12, 17, 23) |
| Core adoptions done | 13 of 13 that apply (section 3; three more are not needed and are listed there) |
| Unit tests | 11 new and 4 rewritten (T9, G9, G9c, G11) in my two files, which now run 26 + 40 tests (were 20 + 35); `npm test`: 774 pass, 0 fail (718 before the cleanup started) |
| Interaction scripts | roots-principal: 18/18, branches-graph4d: 9/9 (desktop 1280, phone 390, desktop dark) |
| Smoke, `--dark`, the 9 routes asked for | 27/27 |

Every new check was mutation-tested: 33 deliberate breakages of the four stations (each one a fix put back the old way) were applied one at a time and
every one is caught by at least one unit or interaction check. Four survived the first version of the scripts and led to better checks: the big-number
message in principal-root (the field held a value that was clamped again, so nothing was tested), the 520 px cap of the graph4d view (the desktop view is
only 434 px wide, so it is now tested at 900 px), and the raise word and "slide by" word (the mutation was being run on the wrong route).

## 2. Disposition of every entry of `S4.json` (numbered from 0, in file order)

| # | Entry | Disposition |
|---|---|---|
| 0 | graph4d: lift the Lab's `cartGrid` | **Fixed.** `shapeCurves` now calls `specToCurves` (shapes.js), which knows every kind the Lab stores, and a grid is lifted as its vertical and horizontal lines with 48 segments each (the Lab's 96 would put a 24 by 24 grid over the 4000-point budget; each line is bent by f, 48 still follows it). The "Left out: 1 grid (grids stay in the Lab)" text is gone. Unit G9 (grid counts, the biggest Lab grid fits with room), G9c; interaction script (4 Lab shapes, 31 curves, every grid line has finite vertices). |
| 1 | roots: the "Arg z_k = ..." block, far from the root, across the real axis (sign misread), on the circle and n-gon | **Fixed for the cases listed, one limit stays.** The z-layer now tells the plane's placer about the circle, the n-gon (one polyline), the rays of the other roots, the dashed step-n ray and the real axis (cost 90, a word is 100: the axis through "Arg z3 = 3.029" reads as a minus sign, which is worse than a ray through a word). The review's c = -1 + i, n = 7, k = 3 now puts the block below the axis; in the 1.4.2 views the block sits in the open sector between rays. On a plane narrower than 420 px the block has two lines (the negative winding is dropped), which removes the third line that was crossed by a ray at 390 px (entry 9). Checked by script: no line of the block is cut by y = 0 at n = 7 on all three viewports, and the line count is 3 or 2 by plane width. **Limit:** the block's candidate spots are the plane's own (a ring of 36 spots around the origin, `drawPolarAddress`), so in a crowded plane it can still sit on the far side of the origin from its arc (1.4.2 k = 0), and at 390 px with n >= 7 an 80 px block has no free spot at all (an eval over 77 states: 0 axis cuts and 0 overprints at desktop width; at 390 px 5 states overprint another word or dot, one of them c = -1 + i, n = 7, k = 3, where the block now covers the x label instead of being cut by the axis). A station-drawn block would need `createLabelPlacer` to say where it put a word; request 3 below. |
| 2 | principal-root: three collisions | **Fixed.** (1) `w = -1, n = 3`: the core's word placer (C1) already puts "w" and "k = 1" side by side; a regression check now pins it. (2) `w = 0`: "0: every root" goes through `createLabelPlacer` and steps around the handle and its "w". (3) "angle Arg w / n = ..." goes through the placer with eight spots around the principal root, so it is no longer under w's ring (w = 1.97 - 0.34i); "r = 2" at w = 2i is clear of the tick numbers (C1's tick rule; pinned). Interaction script. |
| 3 | roots: `k = 0, 1, ..., 1`; "slide by 2" on the arrow; "z^4 = c" on the handle "c" | **Fixed.** `kListTex(n)` writes the list out for n <= 3 ("k = 0, 1", "k = 0, 1, 2") and abbreviates from 4. "slide by h" goes through the placer with `sideCands` beside its arrow, and the circle, arrows and dots are obstacles. The raised root's word goes through the placer (the last power lands on c, whose own dot and word are an obstacle). Pixel checks in the interaction script (the word box against the arrow segment, the handle word and dot). |
| 4 | roots: the neutral callout leaves 60 to 100 px blank; the neutral line on the 1.4.3 deep link says the numbers match nothing | **Wording fixed; blank space declined.** When c is d of the quadratic and n = 2 (the 1.4.3 deep link, and after "Show the square roots of d in the big picture") the callout reads "From the quadratic. c = -9 is d, ... This picture shows those two square roots. Problem 1.4.3 itself is solved in that panel." and it follows the quadratic as the student edits a, b, c. Declined: the reserved height is the whole point of the slot (a drag away from a preset used to move the planes 167 px, and the interaction script pins "the plane did not move when the callout changed"); a shorter slot for the neutral line brings that jump back. The new variant has its own invisible copy in the slot, so the height rule still holds. |
| 5 | roots, principal-root: `tagStairRows` injects into the widget's markup | **Fixed.** Both stations pass `showK: true` to `createStaircase`; the injection, `.rt-krow` and its CSS are deleted. Roots also passes `compact: true` from 8 roots on (a 13-row list in a half-width column at 390 px cut the rows off at "-3pi/4 + 24pi = 9..."); the checks read `.stair-k`. |
| 6 | the big-number message goes when the student moves to the other field | **Fixed in both stations.** An `input` event that re-reads the same already-clamped value keeps the message; the first edit that changes c (or w), a preset, or a drag back into range ends it. Interaction scripts (both stations). |
| 7 | roots quadratic panel: decimals beside fractions | **Fixed.** `quadraticModel` has `exact` (a, b and c whole numbers); `quadRows` and `quadSame` use `numOf`/`cartOf` like the roots explainer. a = 0.5, b = -3.7, c = 12.25 now reads `(-3.7)^2 - 4(0.5)(12.25) = -10.81`, `z = 3.7 + 3.288i`. Whole numbers keep every exact cell (pinned string for 1, -4, 13). Unit U10, interaction script. |
| 8 | roots 1.4.3: the polar column of the check row is a Cartesian substitution of the other root | **Fixed.** The row now puts the same root into the equation twice: `(1)(2 + 3i)^2 + (-4)(2 + 3i) + (13) = 0` and `(1)(2 + 3 e^{i pi/2})^2 + (-4)(2 + 3 e^{i pi/2}) + (13) = 0`; the verdict covers both roots and the row is labelled "same root" (C3's `sameLabel`). The polar angle is the one that really is the first root (for a < 0 the formula's first root is h minus the principal square root, so it is Arg(d)/2 + pi; found while testing, pinned for ten quadratics). |
| 9 | roots plane overlaps: the 390 px "also -7pi/4" crossed by the k = 2 ray; n = 12 "r" label clipped and "x" on "0, 12" | **Fixed.** Entry 1 (two-line block on a phone, obstacles). n = 12, c = 0.3 - 0.7i: the r label is inside the plane and the x label is off the word "0, 12" at all three viewports (checked). |
| 10 | principal-root far w: the roots pile up and their words overprint; w's labels at the edge in the roots-only view | **Fixed.** When the roots are closer than 12 px (`2 rho sin(pi/n) * scale`) the words of the ghost roots are dropped with `setLabel('')` and come back when the view zooms in; "principal" keeps its word. In the roots-only view w's cartesian and polar labels are skipped while w is outside the picture. |
| 11 | principal-root: `e^{i -2.214}`; roots n = 2 `k = 0, 1, ..., 1` | **Fixed.** Both footers use `texExp(1, theta)`, which puts the sign in front of the i (`e^{-i 2.214}`); the k list is entry 3. Unit U10 over 15 states. |
| 12 | principal-root mounts with the ghost root (k = 1) selected | **Declined.** The design pins it (docs/designs i1-station-roots-principal.md 7.1: the presets select step 1 so that "this root is not the principal root" is on the first screen, and `w = -1, n = 3` needs it for the real-root picture). The readout and the check row already show 1 + i, and the pick note answers 2.2.2 in one click on the solid dot. The design doc should say it is deliberate (section 5). |
| 13 | branches: "r = 1.038" touches the dashed chord | **Fixed.** The chord is drawn with `drawSegment(..., { obstacle: true })` (C1), so the plane's own labels keep clear. Interaction script: after the principal jump no "r =", "Arg w =" or "also" box meets the chord. |
| 14 | branches: "continuous" along the negative axis says "The value moves smoothly" | **Fixed.** `continuousDetail(maxStep, kind, seam)`: for a walk along the axis when the axis is the edge of the window it says "Every point of this walk sits on the closed end of the window, so it never meets the jump. Walk across to test the cut." Every other walk keeps the plain sentence. Unit T11b (also proves every sample has one angle) and interaction script. |
| 15 | branches: the caption "It is Arg z only when the window is (-pi, pi]" | **Fixed.** "With the window (-π, π] that row is always Arg z. With any other window it is Arg z only for some points of the plane." |
| 16 | branches: "z^(1/3) on this branch = 1 = 1" | **Fixed.** The Cartesian part is skipped when it prints the same as the polar part. Unit T8b (also over a grid of points and seams: never "= a = a"). |
| 17 | branches: the widget shows "Arg z = undefined" under "arg z is not defined here" | **Declined.** The line is `js/core/staircase.js`'s copy (C3's file). With `homeLabel` the set line, the window sentence and the aria-label now say arg z, but the widget still prints `<home name> = undefined` at z = 0. Request 1 below. |
| 18 | branches: `nameTheSet()` rewrites widget text after every update | **Fixed.** `createStaircase({ label: 'arg z', homeLabel })` and `setHomeLabel` on a seam change; `nameTheSet` is deleted. `staircaseLabel` is replaced by `STAIRCASE_SET_LABEL` and `staircaseHomeLabel(seam)` ('Arg z' for the principal window, else 'chosen θ'). Interaction script: the z = 0 set line, window sentence and list label, the home line at three seams, the crossing note "Seam crossed: Arg z dropped by 2π. The set arg z did not move." |
| 19 | graph4d: `phi = Arg z / 3 = 0` at z = 0 | **Fixed.** At r < 1e-9 the prefix is dropped (`phi = 0`). Interaction script (ten arrow steps to exactly 0). |
| 20 | graph4d: "The Lab has 1 shape. They are drawn" | **Fixed.** "It is drawn" when the Lab has one shape and it is drawn. Unit G9c, interaction script. |
| 21 | graph4d: the view is square at every width (660 to 700 px tall at 768 to 1024; empty column at 1280) | **Part fixed.** The square view is capped at 520 px and centred, so the stacked layout no longer pushes the controls below the fold (checked at 900 px and on the phone; mutation-tested). Declined: the empty area under the 434 px view at 1280 px. The grid is two columns there and the view is as wide as its column; filling the area means a taller non-square view (the 4D ball is framed for a square) or a sticky panel that fights the sticky header, for a cosmetic gain. |
| 22 | branches: the 3D surface on a phone is small, beads tight | **Fixed.** On `(max-width: 600px)` (the media query of the square view) the surface is fitted with padding 1.04 instead of 1.12 and the beads are 1.5 times larger (radius 4.1 and 5.7 px become 6.2 and 8.5 at n = 3, a little more with the tighter fit). Interaction script measures bead radii and how much of the view the frame ball fills. |
| 23 | branches: spec A2's "0.5 - 0.8" cannot appear | **Declined.** Nothing to change in code: the readout is right (`e^(-i 1.031) = 0.515 - 0.858i`, T8 pins the whole string) and the interaction script already uses `/0\.5\d* - 0\.8\d*i/` and the exact bounds. The wording is in the design document (section 5). |
| 24 | graph4d: "Set uv to 90 degrees" after the preset already did | **Fixed.** "This preset starts at uv = 90 degrees, where the three sheets stack like a spiral staircase and do not cross. Drag uv back to 0 and two of the sheets cross along the negative real axis." (and the two-sheet version). |
| 25 | branches: "r = 1.038" touches the chord (duplicate of 13) | **Fixed**, see 13. |
| 26 | graph4d: the 1/z surface is small in its view | **Part fixed.** 1/z now sets `hiddenScale: 3` (the clamp), so its colours use the whole ramp. Declined: a tighter frame. The frame is `boundRadius`, the ball that holds the graph under every rotation (about 4.2 for 1/z, from the spike where u and v are both clamped to 3), and the sliders rotate the graph, so a smaller ball would cut the spike at uv = 45 degrees. A smaller clamp would change the preset (and the legend's "3"). |
| 27 | branches: the staircase workaround (duplicate of 18) | **Fixed**, see 18. |

## 3. Core changes adopted

| Source | Adopted in |
|---|---|
| C1 `registerObstacle`, `obstacle` option: circle, n-gon, rays, dashed ray, real axis | roots z-plane; quadratic plane (circle, arrows, dots) |
| C1: drop `drawPolarAddress(labels: false, arcRadiusPx: 0)` | roots: `drawSegment(..., { obstacle: true })` for the rays of the other roots |
| C1 `alpha` on `drawSegment` | `segAlpha` deleted in roots and principal-root |
| C1 `createLabelPlacer`, `sideCands` | roots (raise labels, "slide by", "0: every root"), principal-root ("0: every root", "angle Arg w / n") |
| C1 `Handle.setLabel` | root words in roots and principal-root (no more editing `.plane-handle-label`); principal-root hides ghost words when crowded |
| C1 `drawSegment(..., { obstacle: true })` for the dashed chord | branches |
| C3 `showK` | roots, principal-root |
| C3 `compact` | roots from 8 roots on |
| C3 `homeLabel`, `setHomeLabel`; drop `nameTheSet()` | branches |
| C3 `sameLabel` | roots quadratic panel ("same root") |
| C2 `domainSphere({ f })`, `setFunction` | graph4d (the `THREE.SphereGeometry`, `sphereColor`, mesh code and the rebuild on every preset are gone; the sphere is recoloured in place) |
| C2 `hiddenScale`, `boundRadius` | graph4d: sqrt 1.7, cube root 1.5, 1/z 3; frame = largest `boundRadius` of the pieces |
| C2 `specToCurves` | graph4d (also lifts `cartGrid`, `ray`, `polarGrid`) |
| not adopted | `riemannSphere({ frameLabels })` (graph4d's own 1.25 padding frames the labels and the rule is cosmetic), `argHelix({ tightFrame })` (staircase.js), `compact` in principal-root (at most six rows) |

## 4. API and export changes in my files (for the design docs; none is in ARCHITECTURE)

- roots.js: new exports `kListTex`, `quadNeutralText`, `QUAD_LEAD`, `COMPACT_FROM_N`; `quadraticModel` returns `exact`; `quadSame` shows one root in two addresses.
- branches.js: `staircaseLabel` removed; new exports `STAIRCASE_SET_LABEL`, `staircaseHomeLabel`, `continuousDetail`.
- graph4d.js: `sphereColor` removed (the library's `domainSphere` is the colouring; its colours are pinned against `colorOf` in G11); `FUNCS` entries may carry `hiddenScale`; `STROKE_LIMITS` unchanged; `leftOutText` no longer has a 'grid' reason.
- Station ids, plane ids, control ids and readout formats of ARCHITECTURE section 9 are unchanged. One text changed that a test may read: the roots quadratic check row says "same root: agree".

## 5. Requests for other owners and doc changes

1. `js/core/staircase.js` (C3, iteration 2): at z = 0 hide the "Arg z = undefined" line or say "no angle" (entry 17).
2. `docs/designs/iter-1/i1-station-roots-principal.md` 7.1: say that `sel = 1` for the presets is deliberate (entry 12); describe the quadratic check row as one root in two addresses; the callout variant "From the quadratic.".
3. `js/core/plane.js` (C1, iteration 2): let `createLabelPlacer`'s `put` return where it put a word (or take a `lines` array) so a station can place a multi-line block such as the Arg block itself; that would close the limit of entry 1 (a station-drawn block could also search spots outside the circle and in the corners).
4. `docs/designs/iter-1/i1-station-branches-graph4d.md`: Appendix A, spec A2: "readout has 0.5 - 0.8" becomes the regex `/0\.5\d* - 0\.8\d*i/` (entry 23); section 2.2.5 copy ("They are drawn" becomes "It is drawn" for one shape; grids are lifted, so the "Left out: 1 grid" sentence and unit test G9c's old strings are gone); the NOTE_EXTRA copy of the two root presets; the caption of the staircase panel; the phone fit (padding 1.04, beads 1.5 times).
5. `docs/ARCHITECTURE.md`: nothing required. Section 9 may add that the graph4d view is capped at 520 px.

## 6. Verification

| check | result |
|---|---|
| `npm test` | 774 tests, 774 pass (718 before; the other fixers were adding tests at the same time; my two files run alone: 26 and 40) |
| `node tools/smoke.mjs --dark --route roots,principal-root,branches,graph4d,problem-1-4-1,problem-1-4-2,problem-1-4-3,problem-2-2-2,problem-2-4-1` | 27/27 (no console error, page error, failed request or overflow) |
| `tests/interact/i1-station-roots-principal.mjs`, routes roots, principal-root, problem-1-4-1, -1-4-2, -1-4-3, problem-2-2-2, `--dark` | 18/18 (desktop, phone, desktop dark) |
| `tests/interact/i1-station-branches-graph4d.mjs`, routes branches, graph4d, problem-2-4-1, `--dark` | 9/9 |
| screenshots read (light and dark, desktop and phone) | roots c = -1 + i n = 7 k = 3, c = -16 k = 0 and k = 2, n = 12, the raise, the quadratic plane, the staircase at n = 5 and n = 12 (phone); principal-root m1cube, w = 0, w = 1.97 - 0.34i, 2i, far w and the roots-only view; branches planes after the principal jump, the surface (desktop and phone), the staircase; graph4d z², sqrt, cube root, 1/z, e^z, the sphere (z and 1/z), the grid strokes, light and dark |

How the label work was judged: a battery of 77 states (the presets at every k and 60 seeded random c, n, k) read every `fillText` of the root plane
and every handle box; at 1280 px no Arg block was cut by the axis or printed over another word or dot, at 390 px none was cut by the axis and 5 overprinted
(entry 1). The checks that stay in the scripts are the specific cases the reviewers named.
