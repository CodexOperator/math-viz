# Residue group C2: report

Owner files: `js/core/three-view.js`, `js/core/shapes.js`, `js/core/mapping.js`, `js/core/domaincolor.js` and their tests
(`tests/unit/i1-core-three.test.mjs`, `tests/unit/i1-core-mapping.test.mjs`, `tests/interact/i1-core-three.mjs`,
`tests/interact/i1-core-mapping.mjs`). No other file was edited, except the two new files named in section 6. Nothing was committed.
`domaincolor.js` needed no change: no entry touches it.

## 1. Totals

- `C2.json` (9 entries): 8 fixed, 1 resolved without a code change (entry 8: `renderNow()` already exists; documented and now tested).
  Entries 3 and 4 (numbered from 0, as below) are the same request and were done once.
- `wave0-sync.md` "left" entries that touch my files (12): 8 fixed (82, 90, 100, 101, 102, 103, 104, 105), 2 verified passing now that the home
  station exists (107, 111), 2 declined (85, 108; reasons below).
- Every API change is opt-in: with no new option a caller gets what it got before. Behaviour changes with no API change are listed in section 4.
- Tests: 23 new unit tests (9 three, 14 mapping), 7 new interaction steps (S23 to S29) and a changed S1 in the three script, a new cap/spec
  step and a corrected proof sheet in the mapping script. Every new test was mutation-checked (a deliberate bug in the source fails it).

## 2. Dispositions: `C2.json`

| # | Entry | Disposition |
|---|---|---|
| 0 | lab: export `specToCurves`, cap n / rings / rays / sector angles | **Fixed.** `shapes.js` exports `specToCurves(spec)` and `SHAPE_LIMITS`; every builder is capped (section 3.1). A parity test builds the Lab's own presets and the freehand, cartGrid, rect, polygon and horizontalLine kinds through `lab.js` and through `specToCurves` and requires identical curves. |
| 1 | lab: sphere stroke mixes too strongly toward `--t0` (polar curves brown) | **Fixed as an option.** `addCurve(..., { rampWeight })`. The default stays 0.65 (an old caller is unchanged, so the Lab still looks brown until it passes `rampWeight`; 0.3 keeps `--polar` orange, tested by pixels and by value). Request to the Lab owner below. |
| 2 | lab: `frameRadius` should include the infinity label; padding 1.0 clips about 3 percent | **Part 1 fixed as an option**: `riemannSphere({ frameLabels: true })` gives `frameRadius` 1.2 R; default stays R (the Lab, reciprocal and graph4d pad 1.25 themselves and would shrink by 17 percent if the default moved). At padding 1.0 the label is inside from a 220 px view up, glyph included (pixel test, hint on and off, three sizes). **Part 2 not reproducible as a defect**: with the default frame the ball at `padding: 1.0` has a largest projected |NDC| of 1.000 (6 cases: three sizes, hint on and off; S27 asserts it): an exact fit, tangent to the narrower side. What clips is what lies outside the framed ball: the label (centre at NDC 1.11 to 1.17 in the height-limited views without `frameLabels`), curves 0.4 percent above the sphere, the 1 px line's own width. Pinned by test S27 and documented in 3.12 (patch). |
| 3 | branches-graph4d: `hiddenScale` for `graph4D` and `riemannSurfaceRoot`; `domainSphere({ f })` | **Fixed.** `graph4D({ hiddenScale })`, `setHiddenScale(s)`, `userData.boundRadius`; `riemannSurfaceRoot({ hiddenScale })`; `domainSphere` (section 3.3). |
| 4 | branches-graph4d: same, still open | **Fixed** (same work as 3). |
| 5 | powermap-reciprocal: `maxImageStep` on `pushForward` / `morph` | **Fixed** (section 3.2). See the caveat there: the new samples are chord midpoints. |
| 6 | powermap-reciprocal: fat line / tube for sphere curves and `curveToLine` | **Fixed.** `addCurve(..., { lineWidth })` and `curveToLine(..., { lineWidth })`, world units, six-sided tube. |
| 7 | powermap-reciprocal: keep rendering, or expose `renderNow()`, off screen, or document | **Resolved without code.** `renderNow()` is already on every View and draws whatever the visibility; an off-screen view deliberately draws nothing by itself (S14 pins it, and it is what keeps six views on a page cheap). Declined: rendering off screen. Added test S25 (off screen: no frame from `requestRender` or a mutator, exactly one from `renderNow()`, canvas holds the picture) and the sentence for 3.12 (patch). |
| 8 | powermap-reciprocal: fat lines with a lightness ramp | **Fixed** by entry 6: the tube carries the same `--t0` to `--t1` time ramp, ring by ring, with `rampWeight` applying (tested by value). |

## 3. API changes (exact)

### 3.1 `js/core/shapes.js`

- NEW `export const SHAPE_LIMITS = Object.freeze({ maxN: 20000, maxCount: 200, maxPoints: 200000, maxAngle: 1e6 })`.
  - `maxN`: most segments of one curve (every `n`, and `nPerSide` per side, and `resample(curve, n)`).
  - `maxCount`: most rings, rays, `fillRays`, `fillArcs`, `fillRings` of one builder. (`cartGrid` already stopped at 201 lines each way.)
  - `maxPoints`: most points one builder returns in total. A builder with many curves lowers its `n` to fit (`polarGrid`, 200 rings, 200 rays,
    `n` 1e9 gives 497 segments per curve; 200 rays and rings at the default `n` 96 is far below it) and a polygon lowers its `nPerSide`.
  - `maxAngle`: an angle beyond 1e6 radians is taken modulo 2 pi; a `circle` sweep or `sector` sweep beyond it is one turn.
- NEW `export function specToCurves(spec)` returns `Curve[]`. `spec` is `{ kind, ...fields }`:
  `segment {a, b}`, `verticalLine {x}`, `horizontalLine {y}`, `ray {angle}`, `rect {a, b}`, `circle {center, r}`, `polygon {vertices}`,
  `sector {r0, r1, theta0, theta1, fillRays, fillArcs}`, `annulus {center, r0, r1}`, `freehand {points}`, `cartGrid {xRange, yRange, step}`,
  `polarGrid {rMax, rings, rays}` (the Lab's ten kinds plus `ray` and `polarGrid`).
  - A missing field is the builder's default; a spec may carry any option of its builder under its own name (`n`, `nPerSide`, `yRange`, `fill`, ...).
  - Differs from calling the builder bare in two places: `freehand` uses `minDist` 0 unless the spec has one (the points were thinned when drawn);
    `circle` without `center` is centred at 0 (what graph4d does).
  - Returns the builder's own ids (`boundary`, `ray1`, `arc1`, `inner`, `gx0`, ...); a single-curve kind has no id. Unknown kind, non-object, or a field no
    builder can read gives `[]`; never throws; `__proto__`, `toString` and the like find nothing. Fresh objects every call.
- Builders `segment`, `circle`, `rect`, `polygon`, `verticalLine`, `horizontalLine`, `ray`, `cartGrid`, `polarGrid`, `sector`, `annulus`, `resample`: **no signature change**.
  Behaviour change only above the caps; `sector` replaced its `while (th1 <= th0) th1 += TAU` loop by one step (`th1 += TAU * (floor((th0 - th1) / TAU) + 1)`):
  196 ordinary angle pairs give the same boundary and fills as before (compared to 1e-11), and the one-turn cases are bit for bit equal.
  `sector({ theta0: 1e17, theta1: 1e17 })`, `({ theta0: 2e16, theta1: 0 })` and `({ theta0: 1e10, theta1: 0 })` now take 1 to 5 ms (the last took 1.2 s; the first never returned).
  `segment(0, 1, { n: 3e6 })` is 10 ms, `polarGrid({ rings: 2e5, rays: 2e5, n: 1e9 })` 95 ms (rings 2e5 alone took 9 s).

### 3.2 `js/core/mapping.js`

- NEW option `maxImageStep` in the `opts` of `pushForward`, `pushForwardAll` and `morph`. Not a `PUSH_DEFAULTS` key (`PUSH_DEFAULTS` is unchanged, five keys).
  Default: off. A value that is not a positive finite number (0, negative, NaN, Infinity, a string, null) is off, and the output is then identical to before (tested).
  - A segment whose image step `|w(b) - w(a)|` is longer than the option is bisected in z, like a bend: at most `maxDepth` times (default 4, so
    raise `maxDepth` to 8 with it), never next to a dropped sample, and while `maxPoints` allows.
  - Measured on `|z - 1| = 1` under `1/z` (128 segments): largest step 10.19 without; 1.20 with `{ maxImageStep: 1 }`; 1.0 or less with
    `{ maxImageStep: 1, maxDepth: 8 }`; same two pieces, same cuts. `morph(c, s, f, opts)` at s = 0.1, 0.5, 0.9 goes from 1.06, 5.12, 9.18 to under 0.5 at `{ maxImageStep: 0.5, maxDepth: 8 }`.
  - **Caveat for the reciprocal station**: the new sample is the chord midpoint, so it lies on the input polyline, not on the circle the polyline stands for, and
    `1/z` magnifies that near the pole. The image stays within 0.0625 of the line Re w = 1/2 at 128 segments (0.01 at 512); the plain `pushForward`
    has exact points but a long chord. `refineSamples` in `reciprocal.js` samples the true circle and is more accurate near the pole; the option is a
    cheap bound on the step, not a replacement for that.

### 3.3 `js/core/three-view.js`

All five signature lines below change in `docs/ARCHITECTURE.md` 3.12 (see section 6); `architecture-sync.test.mjs` compares them.

```js
riemannSphere({ radius = 1, frameLabels = false } = {})
  // frameLabels: userData.frameRadius = 1.2 * radius instead of radius (the labels at 1.14 R inside the frame ball)
  addCurve(points, color = '--input', options)          // options { lineWidth = 0, rampWeight = 0.65 }
  // lineWidth: world units (diameter), capped at radius / 2. > 0: six-sided tube, returns THREE.Mesh (MeshBasicMaterial, vertex colours,
  //            DoubleSide, renderOrder 2) instead of THREE.LineSegments; the time ramp runs along it; a gap in the stroke is a gap in the tube.
  //            Not a positive number: the one-pixel line, as before.
  // rampWeight: clamped to 0..1; weight of the --t0 to --t1 ramp in the stroke colour (dots too). 0.65 is the old value.
  // userData.lineWidth and userData.rampWeight hold the values used.
curveToLine(points3, color = '--output', options)       // options { lineWidth = 0 }: > 0 returns a THREE.Mesh tube (flat colour); update(points3) still edits in place; userData.lineWidth
graph4D({ f, xRange, yRange, nx, ny, angles, clamp, wire, hiddenScale } = {})
  // hiddenScale: default automatic (largest 4D norm), else a positive number: ramp spans [-hiddenScale, hiddenScale], ends clipped.
  // new method setHiddenScale(s): number > 0 fixes it, null or anything else returns to automatic. Both survive setAngles and setFunction.
  // userData.hiddenScale = scale used for colours (as before when automatic); NEW userData.boundRadius = the automatic one, the ball that holds the graph
  // under every rotation. graph4d.js uses hiddenScale as its frameRadius: with a fixed scale it must read boundRadius instead.
riemannSurfaceRoot({ n, rMax, nr, nTheta, part, wire, hiddenScale } = {})   // default rMax^(1/n) (the old value); NEW userData.hiddenScale
argHelix({ z, turns, rMax, seam, tightFrame = false } = {})                // tightFrame: userData.frameRadius = hypot(rMax, HELIX_PITCH * (turns + 1/2)) = 4.24 for the defaults (box half-diagonal is 5.20)
domainSphere({ f, radius = 1, nLon = 96, nLat = 64, color = domainColor, frameLabels = false } = {})   // NEW export
  // -> { ...riemannSphere(...), mesh, setFunction(g) }. Body hidden; mesh 'domain-sphere' at 0.996 R, userData.vertexCount = (nLon + 1)(nLat + 1);
  // nLon 3..256, nLat 2..256. Default colour = domaincolor.js colorOf(w, out, false) to its 8-bit rounding (unit test and pixel test S29);
  // the north pole (z = infinity) is grey; color(w, z) -> [r, g, b] in 0..1 overrides; a throwing or invalid callback gives neutral grey.
```

`three-view.js` still imports only three.js and OrbitControls (the colour formula is duplicated, with a test holding it equal to `domaincolor.js`).

## 4. Behaviour changes with no API change (all in `three-view.js`)

- Time dots on the sphere are round (a 32 px disc texture with `alphaTest`; squares only without a DOM). Wave 0 entry 105.
- The hint hides on a pointer press, on a key the view handles (arrows, `+`, `-`, `0`, Home) and on a wheel that zooms the view (container focused or Ctrl/Cmd).
  A wheel that only scrolls the page, Tab, Shift and keys the view ignores leave it. Entry 103.
- A resize while the hint is visible measures the room it takes again, so the picture follows a hint that re-wraps; once the hint is hidden the shift stays. Entry 104.
- `renderNow()` while the context is lost clears `needsRender`, so the loop goes dormant (42 animation frames in 700 ms before, none now). Entry 101.
- The Reset button's `aria-label` is `Reset view to its starting angle` (was `Reset the 3D view to its starting angle`): it now starts with the visible text. Entry 102.
  `docs/designs/iter-1/i1-core-three.md` line 139 still shows the old string (design doc, not mine).

## 5. Wave 0 "left" entries touching my files

| # | Entry | Disposition |
|---|---|---|
| 82 | `sector` hangs on huge angles; builders accept huge n | Fixed (3.1). |
| 85 | design table of performance figures (`i1-core-mapping.md` 8.2) | Declined: a design document, not an owned file, and nothing depends on the figures. |
| 90 | proof-sheet captions in `tests/interact/i1-core-mapping.mjs` | Fixed. The seam figure now rings only the two cut ends (it also rang the loop's start, which is continuous) and marks the loop start with a filled dot; the check counts rings. The `t = 0` and `t = 1` labels moved off the v axis (and `t = 1` off the `w` label). Looked at in a screenshot. |
| 100 | no `frameRadius` for the helix | Fixed as an option, `argHelix({ tightFrame: true })` (default keeps the box framing, so `staircase.js` is unchanged until it opts in). |
| 101 | loop awake while the context is lost | Fixed (4). Test S24. |
| 102 | Reset `aria-label` does not contain the visible text | Fixed (4). S1 now also asserts containment. |
| 103 | hint hides on any wheel or key | Fixed (4). Test S23, 11 cases. |
| 104 | hint inset stale after a resize | Fixed (4). Test S26. |
| 105 | square time dots | Fixed (4). Pixel test in S28 (fill ratio and corners). |
| 107, 111 | home route scripts fail until the home station exists | Verified: `node tools/smoke.mjs --route home --script tests/interact/i1-core-three.mjs` passes 2/2. |
| 108 | the builder edited the three design doc | Declined: process, and a design document; the orchestrator accepts or reverts it. |

## 6. Needed from others

1. **`docs/ARCHITECTURE.md` (orchestrator / group D).** I may not edit it, and `tests/unit/architecture-sync.test.mjs` fails until it matches the code
   (new exports must be mentioned in their section, signatures must match). The 11 edits are in `docs/review/iter-1/residue/C2-architecture.patch`
   (`git apply docs/review/iter-1/residue/C2-architecture.patch`; `git apply --check` passes on the current tree). They cover 3.9 (`SHAPE_LIMITS`,
   `specToCurves`, the caps paragraph that used to say the builders are uncapped), 3.10 (`maxImageStep`) and 3.12 (the five signatures, `domainSphere`,
   the option text, hint rule, round dots, Reset name, off-screen and `renderNow()`, resize, context loss, "padding 1.0 is an exact fit").
   Verified on a scratch copy: with the patch the 3.9 and 3.12 sync tests pass.
2. `js/stations/lab.js`: replace its table by `specToCurves` from `shapes.js` (parity test exists; keep `roles` and the id prefix in the Lab); build the sphere
   with `riemannSphere({ frameLabels: true })` and `fitTo(group, { padding: 1.0 })`; pass `{ rampWeight: 0.3 }` to `addCurve` for `--polar` strokes.
3. `js/stations/graph4d.js`: `domainSphere({ f })` for `buildSphere` (drops `THREE.SphereGeometry`, `sphereColor` and the mesh code); `hiddenScale` for the root
   presets (about 1.5), framing by `mesh.userData.boundRadius`; `specToCurves` instead of `shapeCurves`, which also lifts the Lab's `freehand` and `cartGrid` kinds.
4. `js/stations/reciprocal.js`: `sphere.addCurve(points, token, { lineWidth: 0.022, rampWeight: 0 })` replaces `tubeGroup` (same 0.011 radius, flat colour);
   leave `rampWeight` at its default to carry the time ramp. `frameLabels: true` replaces the 1.25 padding. `js/stations/staircase.js`: `argHelix({ tightFrame: true })`.

## 7. Known limits

- Tubes have six sides and open ends; a sharp corner pinches the cross-section a little (finite, no gap). 20000-point strokes build in well under a second and switch to 32-bit indices.
- `maxImageStep` is bounded by `maxDepth` (at most 8) and places chord midpoints (3.2).
- `frameLabels` frames the label's text, not its transparent sprite margin: in a 220 px view the sprite's empty top rim can pass the edge, the glyph does not (S27 checks the glyph and the border pixels).
- `specToCurves`'s `circle` with no `center` is the origin; the Lab never produces that (its `cleanSpec` drops a spec without one).

## 8. Verification

- `npm test`: 718 tests, 712 pass, 6 fail, all six in `architecture-sync.test.mjs`. Two (3.9, and 3.12 twice) are the ARCHITECTURE patch above; the other three are not mine
  (3.3 `addressLabel` signature in `js/data/problems.js`, 3.5 `drawCartAddress`'s signature and the `LABEL_COST` export in `plane.js`: other groups' code, same cause). On a scratch copy of the tree with
  the C2 patch applied: 718 tests, 715 pass, the same three of other groups fail. Before my changes the suite was 662 of 662.
- `node tools/smoke.mjs --dark --route lab,graph4d,branches,powermap,reciprocal,staircase,mappings`: 21/21 (desktop, phone, dark desktop). Looked at the lab, graph4d and
  reciprocal screenshots (dark): the reciprocal sphere keeps its tubes, pole dot and infinity label; lab and graph4d unchanged.
- `node tests/interact/i1-core-three.mjs` (standalone, desktop and phone): S0 to S29 pass. `node tools/smoke.mjs --route home --script tests/interact/i1-core-three.mjs`: 2/2.
- `node tools/smoke.mjs --route nosuchplace --script tests/interact/i1-core-mapping.mjs --dark`: 3/3.
- Station scripts, all `--dark` (desktop, phone, dark desktop): lab 3/3, branches and graph4d 6/6, problem-2-1-2, problem-2-2-1, problem-2-5-1, powermap and reciprocal 15/15.
