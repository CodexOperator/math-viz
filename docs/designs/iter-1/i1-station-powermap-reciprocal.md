# Design: i1-station-powermap-reciprocal

Goal: `js/stations/powermap.js` and `js/stations/reciprocal.js` (wave 1, station, size L).
Owned files: the two modules above, plus (automatically) this file, `tests/unit/i1-station-powermap-reciprocal.test.mjs` and
`tests/interact/i1-station-powermap-reciprocal.mjs`. Nothing else may be edited.
Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md` (threads, stations 12 and 15, section 3 rows 2.1.2, 2.2.1, 2.5.1, section 8),
`docs/ARCHITECTURE.md` (1 to 10), `docs/goals/iter-1.json` (entry `i1-station-powermap-reciprocal`), the wave-0 sources
(`complex.js`, `plane.js`, `katex.js`, `explainer.js`, `staircase.js`, `shapes.js`, `mapping.js`, `three-view.js`, `theme.js`, `app.js`, `registry.js`,
`data/problems.js`, `data/functions.js`), `tests/interact/_helpers.mjs`, `tools/smoke.mjs`, `docs/review/iter-1/wave0-sync.md` and the residue file.

Status of this design: every engine behaviour and every number below that a unit test will assert was checked in Node 22 against the
real wave-0 modules (a throwaway prototype in the session scratchpad, outside the repo, informational only). What was checked:
the pole-gap measurement (section 0, D6), the refinement algorithm (5.3.3), `pushForward` of the line and the sector under z^n (6.2, 6.3),
the polynomial expansions of (x + iy)^n for n = 2..6, all readout strings of 5.2.2, the image formulas of 6.4, the sphere
rotation and the two-reflections identity (6.4.5), and the cost of the heaviest recompute (8.2). Where this document and ARCHITECTURE differ, section 0 says so.

---

## 0. Reading notes: decisions, and what differs from ARCHITECTURE 9

No station module exists yet, so nothing on disk overrides ARCHITECTURE 9 and the signatures in 3. Everything added here is
additive (a station built from ARCHITECTURE alone still passes the acceptance criteria).

| # | Decision | Why |
|---|---|---|
| D1 | Each station exports `mount(el, ctx)` and one extra named export, `internals` (a frozen bag of pure helpers, listed in 4.1 and 4.2). Importing either module in Node must work with no `window`, `document` or `localStorage` (no top-level DOM access). | The unit test file imports `internals` to pin the maths (section 7). `plane.js` does the same with its own `internals`; the router only calls `mount`. |
| D2 | **Hook formats.** `window.__mv.powermapImage` and `window.__mv.reciprocalImage` are plain Arrays of `{ re, im, t }` points, the image of the *current input shape* under the *full* map (morph slider and stage chips do not change them). Each array also carries a property `pieces`: an Array of Arrays of points, one per piece returned by `pushForward`. `powermapImage` holds finite points only (no separators). `reciprocalImage` has one separator entry `{ re: NaN, im: NaN, t: NaN }` between consecutive pieces, so a script that skips non-finite points and splits runs at separators sees exactly the pieces ("every finite point", "no consecutive points in a piece"). | ARCHITECTURE 9 only says "window.__mv.powermapImage" and acceptance A2 and A4 read points from them. A2 reads every point of a multi-piece sector image and takes its Arg, so separators there would make `Arg(NaN)` fail a naive loop. A4 says "finite" and "in a piece", so separators there are expected. |
| D3 | **One clock cursor.** The probe (`#powermap-zplane-p`, `#reciprocal-zplane-p`) *is* the clock cursor: it sits at z(t) on the stroke, dragging it along the stroke sets t, the `#powermap-t` slider sets t, and the w-plane dot is w(t) = f(z(t)). There is no second ring. | One moving thing per plane is easier to follow than a handle plus a ring. It also gives the explainer and the staircase one point to talk about. |
| D4 | **Stroke geometry.** powermap line: `verticalLine(c, { yRange: [-4, 4], n: 128 })`, so y = -4 + 8t exactly and t = 0.625 is y = 1 (z = 2 + i, w = 3 + 4i, the sample in `problems.js`). Sector: `sector({ r0: 0, r1: 2.5, ... })`, probe on its boundary (t by arclength, t = 0.5 is the middle of the arc). | Exact binary t at the default probe, and the default probe is the handed-out sample of problem 2.1.2. |
| D5 | **Extra control ids** beyond ARCHITECTURE 9 (all additive): powermap `#powermap-grid-none`, `#powermap-play`, `#powermap-reset`, `#powermap-gridnote`, `#powermap-fact`, `#powermap-hint`, `#powermap-stairs`, `#powermap-problem`, `#powermap-zplane-p`, `#powermap-wplane-q`; reciprocal `#reciprocal-play`, `#reciprocal-reset`, `#reciprocal-morph`, `#reciprocal-morph-out`, `#reciprocal-morph-help`, `#reciprocal-stage-note`, `#reciprocal-sphere-turn`, `#reciprocal-sphere-play`, `#reciprocal-sphere-note`, `#reciprocal-problem`, `#reciprocal-zplane-p`, `#reciprocal-wplane-q`, handles `#reciprocal-zplane-a` and `-b` for the line preset. | The planner asked for those it listed; a usable station needs these too. Section 9 asks the orchestrator to copy them into ARCHITECTURE 9. |
| D6 | **Near-pole refinement is a station job.** `pushForward` alone cannot meet A4 ("no consecutive points in a piece further apart than 5"): measured on `circle({re:1,im:0}, 1, {n:128})` under `1/z` with `clampRadius: 40` the largest step is **10.19** (n = 256: 6.79, n = 1024: 5.43, n = 4096: 2.13). The cause is geometric: the image step near the pole grows like 1/d², and the engine only subdivides where the image *turns*, but a line image does not turn. So `reciprocal.js` resamples the input stroke on its own parameter before pushing it forward (algorithm 5.3.3, about 260 extra points for the preset circle at clamp 64). Measured result for `|z - 1| = 1`: 2 pieces, largest step **0.98**, `|Re w - 0.5|` at most **1.7e-13**, every point `|w| <= 64`. The base curve still comes from `shapes.circle` and `shapes.segment`, and the images still come from `pushForward`. | A4 and A6 together. An optional `maxImageStep` option in `mapping.js` would make this unnecessary (section 9, iteration 2). |
| D7 | Wording of acceptance A5 ("the inverted circle") is generic. For the first preset, `|z - 1| = 1`, inversion in the unit circle sends a circle *through the centre of inversion 0* to a **line** (Re w = 1/2), so the "invert" stage shows that line, traversed upward (points above the axis stay above). For `|z - 1.5| = 0.5` and `|z| = 1` stage 1 shows a circle. The preset id `circle0` in ARCHITECTURE 9 is read as STORY says ("a circle not through 0"): `|z - 1.5| = 0.5`, the circle with diameter [1, 2], whose image is the circle with diameter [1/2, 1]. | STORY section 2, station 15, lists the four presets in that order; the id `circle0` has no other definition. |
| D8 | **The sphere uses documented `three-view.js` API only**, plus one ordinary THREE property (`.visible` on the LineSegments that `riemannSphere().addCurve` returns). The static input curve is `curveToLine` (flat colour, fixed). The turning copy of the input is the only curve inside `sphere.curves`, so `sphere.setHalfTurn(angle)` turns exactly that copy. Markers are positioned by the rotation formula of 6.4.5, which was checked against a real THREE `Euler(angle, 0, 0)`. | No `import` of three.js, no private members. |
| D9 | `clampRadius` is the ARCHITECTURE 10.5.1 value **rounded up to the next power of two** (`clampFor`, 5.1.2) so that mouse-wheel zoom does not recompute every image on every tick. Never below 40, never below the 10.5.1 value. | Same rule, fewer recomputes. |
| D10 | The readout div carries **exactly** the ARCHITECTURE 9 string and nothing else. Extra sentences (directrix, nearest point, opening) go in a separate `<p id="...-fact">`. | A test that matches the readout exactly still passes. |
| D11 | No `localStorage`, no `ctx.store` use except the one hand-off `lab.request` (written with `{ persist: false }`). State lives in module variables of `mount` and dies with `unmount`. | Deterministic start state for every route; nothing to fail when storage is blocked. |
| D12 | **Snapping.** Everything a script drags to a "nice" point lands exactly on it: the powermap line position `c` snaps to multiples of 0.1; the probe on the line snaps y to multiples of 0.1; sector edges snap to multiples of 5 degrees (pi/36); the reciprocal probe snaps to multiples of 2.5 degrees on a circle (pi/72) and 0.1 along a line; circle centres, radii and line points snap to multiples of 0.1. | The mouse reaches a target within 0.5 px. On the phone (planes about 358 px wide) one pixel is 0.025 units in the powermap z-plane (9 units across) and 0.017 units, nearly 1 degree on a unit circle, in the reciprocal planes (6 units across), so unsnapped values would read "1.013" or "0.5033" instead of "1" and "0.5" and A2 and A4 would fail on the phone. Every snap step (0.1 units, 5 degrees, 2.5 degrees) is more than twice the 0.5 px pointer error at that scale. |
| D13 | `reciprocal` also gets a **morph slider** (`#reciprocal-morph`), because the student asked for the input-to-output "time" picture and acceptance A6 names `morph` for both stations. It morphs *the current stage*: in "1. Invert" from the input to z/\|z\|² (every point slides along its ray); in "2. Mirror" from the stage-1 image to its mirror (the flip across the real axis, edge-on at s = 0.5); in "Both" from the input to 1/z. It uses `morph` for all three. | The stage chips say what the two steps are; the slider lets the student watch them happen. |

---

## 1. Goal, story thread, problems

**Goal.** Two places on the Story Map, both about *polar-native maps*:

- `powermap` (z^n: Fans and Parabolas, registry order 11): the line x = c and the sector a < arg z < b are carried through w = z^n side by side.
  The stroke is drawn with the time ramp on both planes and carried on one clock; a morph slider flows the plane from input to output;
  a Cartesian grid or a polar grid is carried along; a probe point z(t) is explained in both addresses; the angle of w is shown as a
  set with one highlighted step. Defaults to problem 2.1.2 (n = 2, x = 2). Problem 2.2.1 is the preset n = 3, sector 0 < arg z < pi/4.
- `reciprocal` (1/z and the Sphere, registry order 14): a circle or line is carried through w = 1/z, which is drawn as two stages
  (invert in the unit circle, then mirror in the real axis); a probe on the shape runs off to infinity as it nears 0; a Riemann sphere
  shows the same map as a half-turn. Defaults to problem 2.5.1 (the circle |z - 1| = 1).

**Story thread carried.** Thread 1 on functions: *polar-native maps act on the polar address*: (r, theta) goes to (r^n, n theta) and to
(1/r, -theta). That sentence is what the student should see happen, not read: a polar grid goes to a polar grid, a Cartesian grid bends.
Thread 2: the staircase is on screen in `powermap`: n theta is only *one name* of arg w, Arg w is the home step, and a fan that opens
past a full turn is n steps of the staircase landing in one window (which is exactly why roots need every step). Thread 3: input and
output on one clock (the ramp, the cursor, the morph). Circles are polar's native shape: in `reciprocal` circles and lines trade places
because 0 goes to infinity, and the sphere makes infinity a place (the bridge to `graph4d`).

**How it shows on screen.**
- powermap: two square planes, the stroke in green (input) and purple (output), both with the same dark-to-bright ramp, a faint blue or
  orange grid carried along. The probe has its polar address drawn on both planes (ray and solid Arg arc, with one ghost winding so arg is a
  set), the staircase of arg w beside the table. Changing n re-fits the w-plane; raising n on the sector opens the fan until it overlaps itself.
- reciprocal: z-plane and w-plane, the unit circle dashed (the circle of inversion), the stage chips peel 1/z into "slide each point
  along its ray to distance 1/r" and "flip across the real axis", the probe's image shoots off the plane (an edge arrow with |1/p| appears),
  and a sphere on which the same shape turns half a turn about the axis through 1 and -1 until it lies on its image; infinity is the dot at the top.

**Review problems and topics covered** (`assignment_refs`):

| Ref | Where | What the student does |
|---|---|---|
| 2.1.2 image of x = 2 under w = z^2 | `powermap`, line input, n = 2 | pushes the line forward with y as the clock, reads u = 4 - v^2/16, drags c and gets the whole confocal family |
| 2.2.1 image of 0 < arg z < pi/4 under w = z^3 | `powermap`, sector input, n = 3 | watches the fan open to 0 < arg w < 3 pi/4, raises n until it overlaps |
| 2.5.1 image of abs(z - 1) = 1 under w = 1/z | `reciprocal`, preset 1 | sees a circle open into the line Re w = 1/2, drags the probe toward 0 |
| T2.1 functions and mappings (images of sets, elementary maps) | both | images of a line, a sector, a circle |
| T2.2 power and root functions (z^n, images of regions) | `powermap` | the fan, the overlap, the link to roots |
| T2.5 reciprocal map and extended plane (inversion and reflection, infinity, sphere, generalized circles) | `reciprocal` | the two stages, lines and circles trading places, the sphere |

The student should be able to say, for each of the three problems, which address made it easy: 2.1.2 is easiest in Cartesian (put z = 2 + iy and
eliminate y), 2.2.1 and 2.5.1 are easiest in polar (angles multiply; r goes to 1/r and theta to -theta). The explainer's `easy in ...`
badges say so on the rows, and the problem panel prints the route in each address from `problems.js`.

---
## 2. UX

Both stations follow ARCHITECTURE 4 (header, presets, ids, readout, both addresses, links, lifecycle, phone, reduced motion) and the builder
rules of ARCHITECTURE 10. The shell's classes are used as they are (`.panel`, `.chips`/`.chip`, `.slider-row`, `.two-planes`, `.readout`,
`.callout`, `.btn`, `.tex-scroll`, `.station-links`); no station CSS file and no literal colours. The only layout that is not a shell class is
inline and trivial (`style="max-width: 36rem"` on the sphere box). Appendix A gives the markup skeleton of both stations.

### 2.1 powermap

#### 2.1.1 Wireframe, desktop (content column about 1000 px; the two planes are about 480 px squares)

```
+--------------------------------------------------------------------------------------------+
| zⁿ: Fans and Parabolas                                                              <h1>    |
| z^n takes the polar address (r, θ) to (r^n, nθ). So it keeps rays as rays and circles as    |
| circles, and a sector opens into a wider sector. A Cartesian line is not so lucky: the line  |
| x = 2 bends into a parabola.                                                    .station-lede|
| (o) One point, two addresses   (o) The staircase: z, arg z, Arg z   (o) A function is a ...  |
| [2.1.2] [2.2.1]                                                         .problem-chip links |
+--------------------------------------------------------------------------------------------+
| Input    [ Line x = c ]* [ Sector ]       Carry a grid along  [ Cartesian grid ]* [ Polar grid ] [ No grid ]
| Power n  [=o=========]  2                                       [ Reset to problem 2.1.2 ]  |
+-------------------------------------------+------------------------------------------------+
| z-plane: the input                        | w-plane: the output, w = z²                    |
| +---------------------------------------+ | +--------------------------------------------+ |
| |      y                                | | |        v                                   | |
| | grid patch (blue lines)  |  green     | | |  purple parabola u = 4 - v²/16, opens left | |
| | ...............          |  stroke    | | |  its grid images (blue parabolas)          | |
| |        probe z  o--------+  x = 2     | | |        o probe w     focus at 0 (centre)   | |
| |   Arg z arc, r, dashed drops, seam    | | |  Arg w arc + ghost winding, seam           | |
| | [start ===== end]            [+][-][0]| | | [start ===== end]            [+][-][Reset] | |
| +---------------------------------------+ | +--------------------------------------------+ |
|  Drag the green dots to change the shape. | (shown only when the image is off the plane:    |
|  Drag z along the stroke, or slide t.     |  "The image is off this plane. Zoom out.")      |
+-------------------------------------------+------------------------------------------------+
| Blue is the Cartesian grid. It bends: the lines x = c and y = c become two families of      |
| parabolas, all with focus 0, and they still cross at right angles.             #powermap-gridnote
| Time t  [----------o-------]  t = 0.625 (y = 1)   [ Play ]      Morph  [-------------o] s = 1
| x = 2; image: u = 4 - v²/16; focus 0; vertex 4                                 .readout     |
| Focus 0 and directrix u = 8: every point of the parabola is as far from 0 as from that line. |
+--------------------------------------------------------------------------------------------+
| Both addresses, with live numbers                                               .panel      |
| (explainer caption: The same point, worked both ways)                                      |
| +---------+----------------------------------+-----------------------------------------+   |
| |         | Cartesian (slide)                | Polar (spin-and-stretch)                |   |
| | z       | z = 2 + i                        | z = 2.236 e^{i 0.464}  (θ = Arg z)      |   |
| | u       | u = x² - y² = 3                  | u = r² cos 2θ = 3                       |   |
| | v       | v = 2xy = 4                      | v = r² sin 2θ = 4                       |   |
| | w       | w = u + iv = 3 + 4i              | w = r² e^{i 2θ} = 5 e^{i 0.927}   easy  |   |
| | arg w   | Arg w = atan2(v, u) = 0.927      | 2θ = 0.927: a name of arg w; Arg w = 0.927 |   |
| | on curve| c² - v²/(4c²) = 3 = u   easy     | ρ(1 + cos φ) = 2c²:  5(1 + 0.6) = 8     |   |
| | same pt | 3 + 4i               agree       | 5 e^{i 0.927}                           |   |
| +---------+----------------------------------+-----------------------------------------+   |
+--------------------------------------------------------------------------------------------+
| The angle of w: arg w is a set, Arg w is one step of it                          .panel     |
| arg w = { ..., -5.356, 0.927, 7.210, ... }        (staircase widget: 7 rows, home row shaded)|
+--------------------------------------------------------------------------------------------+
| Problem 2.1.2   [Cartesian]    statement (KaTeX)                                 .panel     |
|  [ Cartesian route (blue bar) ]  [ Polar route (orange bar) ]   Why this address: ...        |
|  > Show the answer   (details)                          "This is problem 2.1.2 exactly."     |
| Try this: ...                                                                   .callout    |
| [ Open in the Lab ]                                                                          |
| <- Linear Maps: Spin, Stretch, Slide      T1 next: 1/z and the Sphere   Principal Roots ->   |
+--------------------------------------------------------------------------------------------+
```

#### 2.1.2 Wireframe, phone (390 px; planes are 358 px squares, everything stacks, nothing scrolls sideways)

```
+--------------------------------------+
| zⁿ: Fans and Parabolas               |
| z^n takes the polar address ... (4   |
| lines)                               |
| (o) T1  (o) T2  (o) T3               |
| [2.1.2] [2.2.1]                      |
+--------------------------------------+
| Input                                |
| [Line x = c]* [Sector]               |
| Power n                          2   |
| [=o==============================]   |
| Carry a grid along                   |
| [Cartesian grid]* [Polar grid]       |
| [No grid]                            |
| [ Reset to problem 2.1.2 ]           |
+--------------------------------------+
| z-plane: the input                   |
| +----------------------------------+ |
| |            (358 x 358)           | |
| +----------------------------------+ |
| Drag the green dots ...              |
| w-plane: the output, w = z²          |
| +----------------------------------+ |
| |            (358 x 358)           | |
| +----------------------------------+ |
| Blue is the Cartesian grid. ...      |
| Time t                  t = 0.625 .. |
| [=======o========================]   |
| [ Play ]                             |
| Morph                          s = 1 |
| [==============================o]    |
| x = 2; image: u = 4 - v²/16;         |
| focus 0; vertex 4                    |
| Focus 0 and directrix u = 8: ...     |
+--------------------------------------+
| Both addresses, with live numbers    |
| (caption: The same point, worked...) |
| z                                    |
|   CARTESIAN  z = 2 + i               |
|   POLAR      z = 2.236 e^{i 0.464}   |
| u                                    |
|   CARTESIAN  u = x² - y² = 3         |
|   POLAR      u = r² cos 2θ = 3       |
| ... (columns stack, each cell carries|
|      its heading; explainer does it) |
+--------------------------------------+
| staircase of arg w (full width)      |
| problem panel (routes stacked)       |
| callout, [ Open in the Lab ], links  |
+--------------------------------------+
```

#### 2.1.3 Controls: id, label, behaviour

| id | Element | Visible label | Behaviour |
|---|---|---|---|
| `powermap-input-line` | `button.chip`, `aria-pressed` | "Line x = c" | Selects the line input: `input = 'line'`, `t = 0.625`, shows handle `line`, hides `s0` and `s1`, refits the w-plane (5.2.1), switches the problem panel to 2.1.2. No-op when already selected. |
| `powermap-input-sector` | `button.chip`, `aria-pressed` | "Sector" | Selects the sector input: `t = 0.5`, shows `s0` and `s1`, hides `line`, refits, problem panel to 2.2.1. |
| `powermap-n` | `input[type=range]` min 2, max 6, step 1 | "Power n" | Sets n. Recomputes the stroke image, the grid image and the explainer; refits the w-plane; updates the grid note and the readout. `aria-valuetext` = "n = 3". |
| `powermap-n-out` | `output` for `powermap-n` | the value | text = n. |
| `powermap-grid-cart`, `powermap-grid-polar`, `powermap-grid-none` | `button.chip`, `aria-pressed` (exactly one is true) | "Cartesian grid", "Polar grid", "No grid" | Sets which grid is drawn on the z-plane and carried to the w-plane. |
| `powermap-t` | range 0..1 step 0.005 | "Time t" | Moves the probe along the stroke (line: y = -4 + 8t; sector: along the boundary). Stops Play. `aria-valuetext` = the text of `powermap-t-out`. |
| `powermap-t-out` | `output` | line: `t = 0.625 (y = 1)`; sector: `t = 0.5 (on the arc)`, `(on edge a)`, `(on edge b)` | |
| `powermap-play` | `button.btn` | "Play"; while playing "Pause"; under reduced motion "Step" | Animates t from its value to 1 over 6 s of wall time (restarts at 0 if t is already 1). Reduced motion: each press moves t forward by 0.125 and wraps from 1 to 0; nothing animates. |
| `powermap-morph` | range 0..1 step 0.01, default 1 | "Morph" | s = 0 shows the input plane in the w-plane, s = 1 shows z^n; between, each point is drawn at (1 - s) z + s z^n. The stroke colour blends from `--input` to `--output`. Below 1 the w-plane address overlays are hidden (the dot is not yet at w); the note under the slider reads "Slide to 1 to see w." |
| `powermap-morph-out` | `output` | `s = 1` | |
| `powermap-reset` | `button.btn` | "Reset to problem 2.1.2" or "Reset to problem 2.2.1" (follows the input) | `ctx.navigate('problem-2-1-2' \| 'problem-2-2-1')`: the router re-mounts the station with that preset. |
| `powermap-open-lab` | `button.btn.btn-primary` | "Open in the Lab" | Writes `lab.request` (5.2.9) with `{ persist: false }`, then `ctx.navigate('lab')`. |
| `powermap-zplane` / `powermap-wplane` | planes (`createPlane`) | aria-labels "z-plane, the input" / "w-plane, the output" | Zoom buttons, wheel (when focused), keys as in plane.js. |
| `powermap-zplane-line` | plane handle at (c, 0) | label `c`; aria name "Line position c" | Drag along the real axis; snaps c to multiples of 0.1 in [-3, 3]. Arrow keys move by 0.1, Shift by 1. Shown only for the line input. |
| `powermap-zplane-s0`, `powermap-zplane-s1` | plane handles at the outer corners of the sector, radius 2.5 | labels `a`, `b`; names "Sector edge a", "Sector edge b" | Drag around the circle of radius 2.5; the angle snaps to multiples of 5 degrees (5.2.6). Shown only for the sector input. |
| `powermap-zplane-p` | plane handle, the probe | label `z`; name "Probe z" | Drag along the stroke (5.2.5). Arrow keys nudge it. |
| `powermap-wplane-q` | non-draggable, non-focusable plane handle | label `w`; name "Image w" | Sits at w(t) (at the morphed point when s < 1). |
| `powermap-readout` | `div.readout[role=status][aria-live=off]` | none | The ARCHITECTURE 9 string (5.2.2). |
| `powermap-fact` | `p.muted` | none | The extra sentence of 5.2.2. |
| `powermap-gridnote` | `p.muted` | none | One or two sentences about the carried grid (5.2.2). |
| `powermap-hint` | `p.muted` | none | "Drag the green dots to change the shape. Drag z along the stroke, or slide time t. The w-plane follows." |
| `powermap-wnote` | `p.muted[hidden]` | none | Shown when no point of the image is inside the w-plane view: "The image is off this plane. Zoom out, or press Reset on the plane." |
| `powermap-ex` | explainer container (`createExplainer` id `powermap-ex`) | caption "The same point, worked both ways" | Rows in 5.2.8. |
| `powermap-stairs` | staircase container (`createStaircase` id `powermap-stairs`) | its own | Shows arg w of the probe (5.2.8). |
| `powermap-problem` | `section.panel` | "Problem 2.1.2" (or 2.2.1) | Statement, two routes, answer in a `<details>` (`powermap-answer`), a note that says whether the picture is the problem itself. |
| `powermap-sr` | `div.sr-only[aria-live=polite]` | none | One sentence, rewritten when a drag ends or a control changes (not on every pointer move). |

**Pointer.** Handles are dragged with pointer events (mouse, pen, touch). The planes pan with a drag on empty space and zoom with the wheel
only after the plane has focus (plane.js `wheel: 'focus'`), so the page keeps scrolling over a plane. Two fingers pan and pinch a plane.
**Touch.** Same handles and sliders, 32 px hit squares around 14 px dots, 44 px chips and sliders (shell). **Keyboard.** Tab order is: input chips, n slider, grid chips,
reset, z-plane (zoom keys), line / s0 / s1 handles, probe, w-plane, time slider, play, morph slider, then the explainer, the staircase, the answer
`<details>`, the Lab button and the links. A focused handle moves with the arrow keys (Shift x10, Alt /10); sliders with the arrow keys, Home and End.
There are no station-level shortcuts, so nothing can clash with the plane's `+`, `-`, `0` and arrow keys.

#### 2.1.4 Empty, loading and error states

- **Loading.** Nothing loads asynchronously. `powermap.js` does not import `three-view.js` (no 3D here), so the router's own "Loading..." placeholder
  (after 150 ms) is the only loading state. KaTeX is a classic `defer` script that runs before the module scripts, so `window.katex` exists when a station mounts; if it is missing anyway, the explainer cells and the problem panel show plain text (katex.js degrades, nothing throws).
- **Empty.** There is no empty input: c = 0 is a valid line (its image collapses onto the negative real axis; readout in 5.2.2); a zero-length
  stroke cannot happen (sector width is at least 5 degrees). z = 0 happens at the two ends of the sector boundary: the probe sits at the origin, the
  explainer's angle cells say "z = 0 has no angle" and the staircase shows its undefined state (`update(null)`).
- **Image off the plane.** `powermap-wnote` (above).
- **Errors.** `flush()` runs inside `try/catch`; on a throw the station logs `console.error('[powermap] ...', err)` once, shows a `.callout[data-tone="polar"]`
  with `id="powermap-error"` and the text "Something went wrong drawing this picture. The numbers below may be out of date. Reload the page to start again.",
  and keeps the controls alive. A layer that throws inside `plane.js` is disabled by the plane, which prints its own note.
- **Unknown preset token** (for example `#powermap-xyz`): the default state (problem 2.1.2), no message.

#### 2.1.5 Copy (plain, direct; ASCII minus in readouts, real minus allowed in labels and prose)

| Where | Text |
|---|---|
| lede | `z^n takes the polar address (r, θ) to (r^n, nθ). So it keeps rays as rays and circles as circles, and a sector opens into a wider sector. A Cartesian line is not so lucky: the line x = 2 bends into a parabola.` (set with `prose()` so `z^n` and `r^n` get superscripts) |
| z-plane caption | `z-plane: the input` (the word "z-plane" in `.tone-input`) |
| w-plane caption | `w-plane: the output, w = z^n` with the current n written as `w = z^3` (`.tone-output` on "w-plane") |
| gridnote, Cartesian, n = 2 | `Blue is the Cartesian grid. It bends: the lines x = c and y = c become two families of parabolas, all with focus 0, and they still cross at right angles.` |
| gridnote, Cartesian, n > 2 | `Blue is the Cartesian grid. It bends into curves that still cross at right angles.` |
| gridnote, polar | `Orange is the polar grid. It survives: the circle r = k becomes the circle of radius k^n, and the ray at angle θ becomes the ray at angle nθ. z^n covers the plane n times, so the rays at θ and θ + 2π/n land on the same ray.` with the real n substituted (n = 2 reads "radius k^2" and "θ + π") |
| gridnote, none | empty |
| morph help | `0 shows the input plane. 1 shows w = z^n.` (muted, under the morph slider); when s < 1 and the overlays are hidden: `Slide to 1 to see w.` |
| staircase intro | `z^n multiplies the angle by n. The number nθ is one name for the angle of w, but arg w is every name: nθ + 2πk. Arg w is the one in (-π, π]. When nθ passes π, Arg w jumps by 2π and the set arg w does not move.` followed by the link `What is arg versus Arg? Open the staircase.` (`href="#staircase"`) |
| callout, line input | `Try this. Drag the dot on the real axis to x = 1, then x = 3: the parabolas all share the focus 0. Then drag it to x = -2: the same parabola again, because z and -z have the same square, so z^2 covers the plane twice.` |
| callout, sector input | `Try this. Raise n to 6: the fan opens to 270 degrees. Now drag the upper corner to 90 degrees: 6 times 90 is more than a full turn, so the fan lies on top of itself, and two different sectors of z land on the same points of w. Roots run this backwards, which is why they need every step of the staircase.` with a link on "roots" to `#roots` |
| problem note, exact | `This is problem 2.1.2 exactly (n = 2, x = 2).` / `This is problem 2.2.1 exactly (n = 3, 0 < arg z < π/4).` |
| problem note, changed | `You changed the input. The problem itself is n = 2, x = 2.` / `... n = 3, 0 < arg z < π/4.` |
| answer summary | `Show the answer` |
| hint | as in the table above |
| sr sentence, line | `Line x equals 2, power 2. Image: the parabola u = 4 minus v squared over 16, focus 0.` |
| sr sentence, sector | `Sector from 0 to 0.785 radians, power 3. Image: the sector from 0 to 2.356 radians.` plus ` It overlaps itself.` when it does |

### 2.2 reciprocal

#### 2.2.1 Wireframe, desktop

```
+--------------------------------------------------------------------------------------------+
| 1/z and the Sphere                                                                  <h1>    |
| 1/z does two things to the polar address: it inverts the length (r becomes 1/r) and it      |
| mirrors the angle (θ becomes -θ). Because 0 goes to infinity, a circle through 0 must open  |
| into a line. And on the Riemann sphere, 1/z is just a half-turn.                            |
| (o) One point, two addresses   (o) A function is a motion ...                               |
| [2.5.1]                                                                                     |
+--------------------------------------------------------------------------------------------+
| Shape  [ |z − 1| = 1 ]* [ Line Re z = 1 ] [ |z − 1.5| = 0.5 (misses 0) ] [ |z| = 1 ]         |
| Stage  [ 1. Invert ] [ 2. Mirror ] [ Both: 1/z ]*    Morph [------------o] s = 1  [ Reset to problem 2.5.1 ]|
+-------------------------------------------+------------------------------------------------+
| z-plane: the input                        | w-plane: w = 1/z                               |
| +---------------------------------------+ | +--------------------------------------------+ |
| |         y                             | | |        v                                   | |
| |   circle |z-1| = 1 (green ramp)       | | |   |   purple line Re w = 1/2 (ramp)        | |
| |   through 0, unit circle dashed       | | |   |   unit circle dashed, inverted ghost   | |
| |   o c   o r   probe p                 | | |   |   dot 1/p, edge arrow when off-plane   | |
| | [start ===== end]            [+][-][0]| | | [start ===== end]            [+][-][Reset] | |
| +---------------------------------------+ | +--------------------------------------------+ |
| Drag p along the shape. Take it toward 0  | Stage text (one sentence per stage)             |
| and watch 1/p run off to infinity.        | [ Run p along the shape ]                       |
+-------------------------------------------+------------------------------------------------+
| shape: circle |z - 1| = 1; image: line Re w = 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; |1/p| = 0.707|
| (nearHint, only when relevant)                                                              |
+--------------------------------------------------------------------------------------------+
| Both addresses, with live numbers     rows: p, Stage 1 invert, Stage 2 mirror, 1/p, On image  |
+--------------------------------------------------------------------------------------------+
| The same map on the Riemann sphere                                                          |
| +-------------------------------+   Turn the sphere [----o------] 0 degrees  [ Turn ]       |
| |   ∞ (north pole, the top)     |   Green: the input. Purple: the same curve turned.         |
| |   sphere, graticule, curves   |   (note text)                                              |
| +-------------------------------+                                                           |
+--------------------------------------------------------------------------------------------+
| Problem 2.5.1 panel; callout "Why a line?"; [ Open in the Lab ]; links                      |
+--------------------------------------------------------------------------------------------+
```

#### 2.2.2 What the w-plane shows in each stage (preset 1, circle |z - 1| = 1; "ramp" is dark to bright)

```
 invert (stage 1 only)             mirror (stage 2 only)              both (1/z, the default)
 +-----------------------+         +-----------------------+          +-----------------------+
 |    |  inverted line   |         |    |  ghost (inverted)|          |    |  ghost, faint    |
 |    |  Re w = 1/2      |         |    |  solid: mirrored |          |    |  solid: 1/z      |
 |    |  ramp runs UP    |         |    |  ramp runs DOWN  |          |    |  ramp runs DOWN  |
 |  (  )  unit circle    |         |  ---+--- real axis    |          |  (  )  unit circle,   |
 |   dashed, bold        |         |  emphasised (mirror)  |          |   faint dashed        |
 |   dot at p/|p|²       |         |  vertical connectors  |          |  hollow j(p), line to |
 |   (above stays above) |         |  inverted -> mirrored |          |  filled 1/p           |
 +-----------------------+         +-----------------------+          +-----------------------+
```

#### 2.2.3 Wireframe, phone (390 px)

```
+--------------------------------------+
| 1/z and the Sphere                   |
| lede (5 lines), badges, [2.5.1]      |
+--------------------------------------+
| Shape                                |
| [|z − 1| = 1]* [Line Re z = 1]       |
| [|z − 1.5| = 0.5 (misses 0)]         |
| [|z| = 1]                            |
| Stage                                |
| [1. Invert] [2. Mirror] [Both: 1/z]* |
| Morph                          s = 1 |
| [==============================o]   |
| [ Reset to problem 2.5.1 ]           |
+--------------------------------------+
| z-plane: the input   (358 x 358)     |
| Drag p along the shape. ...          |
| w-plane: w = 1/z     (358 x 358)     |
| stage sentence                       |
| [ Run p along the shape ]            |
| readout (wraps)                      |
+--------------------------------------+
| explainer (stacked cells)            |
| sphere (358 x 268), slider, button   |
| sphere note, problem panel, callout, |
| [ Open in the Lab ], links           |
+--------------------------------------+
```

#### 2.2.4 Controls: id, label, behaviour

| id | Element | Visible label | Behaviour |
|---|---|---|---|
| `reciprocal-preset-circle1` | `button.chip`, `aria-pressed` | "\|z − 1\| = 1" | Loads circle c = 1, r = 1, probe at 1 + i, stage unchanged. `title`: "Image: the line Re w = 1/2". |
| `reciprocal-preset-line` | chip | "Line Re z = 1" | Line through 1 - 1.5i and 1 + 1.5i, probe at 1 + i (s = 1). Image: circle through 0, centre 0.5, radius 0.5. |
| `reciprocal-preset-circle0` | chip | "\|z − 1.5\| = 0.5 (misses 0)" | Circle c = 1.5, r = 0.5, probe at 1.5 + 0.5i. Image: circle centre 0.75, radius 0.25. |
| `reciprocal-preset-unit` | chip | "\|z\| = 1" | Circle c = 0, r = 1, probe at i. Image: circle \|w\| = 1. |
| `reciprocal-stage-invert`, `-mirror`, `-both` | chips (exactly one pressed) | "1. Invert", "2. Mirror", "Both: 1/z" | Chooses what the w-plane shows (2.2.2). Default `both`. |
| `reciprocal-stage-note` | `p` under the w-plane | stage sentence (2.2.6) | |
| `reciprocal-morph` | range 0..1 step 0.01, default 1 | "Morph" | Morphs the current stage (D13): `s = 0` shows the stage's input, `s = 1` its result, between each point is drawn at (1 - s) z + s f(z); the stroke colour blends from `--input` to `--output`; the address overlays, the ghost dot and the connectors are hidden below 1. |
| `reciprocal-morph-out` | `output` | `s = 1` | |
| `reciprocal-morph-help` | `p.muted` | one sentence per stage (2.2.6) | |
| `reciprocal-play` | `button.btn` | "Run p along the shape" / "Pause" / reduced motion "Step p" | Moves the probe once along the whole shape in 8 s (circle: one lap; line: from s = -8 to 8). Reduced motion: each press moves p by 15 degrees (circle) or 1 unit (line); nothing animates. |
| `reciprocal-reset` | `button.btn` | "Reset to problem 2.5.1" | `ctx.navigate('problem-2-5-1')` (re-mounts with preset 1). |
| `reciprocal-zplane`, `reciprocal-wplane` | planes | "z-plane, the input", "w-plane, the output" | views fixed to [-3, 3] squared; the user may zoom. |
| `reciprocal-zplane-c`, `reciprocal-zplane-r` | handles (circle shapes only) | labels `c`, `r`; names "Circle centre", "Circle radius point" | `c`: drag anywhere, snaps to 0.1, clamped to [-3, 3] on both axes. `r`: sits on the circle at a fixed bearing (initially -45 degrees); dragging sets r = distance from c, snapped to 0.1 in [0.1, 3], the bearing follows the pointer. |
| `reciprocal-zplane-a`, `reciprocal-zplane-b` | handles (line shapes only) | labels `a`, `b`; names "Line point a", "Line point b" | Each snaps to 0.1; the line passes through both; a move that would make a = b is refused. |
| `reciprocal-zplane-p` | handle, the probe | label `p`; name "Probe p" | Snapped to the shape (5.3.5). |
| `reciprocal-wplane-q` | non-draggable handle | label `1/p`; name "Image 1/p" | At 1/p; hidden at p = 0 and in the invert stage. |
| `reciprocal-readout` | `div.readout` | none | Exactly the ARCHITECTURE 9 string. |
| `reciprocal-hint` | `p.muted` | none | "Drag p along the shape. Take it toward 0 and watch 1/p run off to infinity." |
| `reciprocal-wnote` | `p.muted[hidden]` | none | Same rule and words as `powermap-wnote`. |
| `reciprocal-near` | `p.muted[hidden]` | none | When 0 < \|\|c\|^2 - r^2\| < 0.3 max(1, r^2): "This circle nearly passes through 0, so its image is a huge circle. Make it pass through 0 exactly and the image becomes a line." |
| `reciprocal-ex` | explainer | caption "The same point, worked both ways" | Rows in 5.3.7. |
| `reciprocal-sphere` | 3D container (`createView3D`), 4:3 | label "Riemann sphere, 3D view" | Orbit by drag (three-view). |
| `reciprocal-sphere-turn` | range 0..1 step 0.01 | "Turn the sphere" | angle = 180 degrees x value. Output `reciprocal-sphere-turn-out`: "0 degrees" ... "180 degrees". `aria-valuetext` the same. |
| `reciprocal-sphere-play` | button | "Turn" / "Pause" / reduced motion "Jump" | Animates the slider 0 to 1 over 3 s (or 1 to 0 when at 1). Reduced motion: jumps to the other end. |
| `reciprocal-sphere-note` | `p` | text in 2.2.6 | |
| `reciprocal-problem` | `section.panel` | "Problem 2.5.1" | As `powermap-problem`, with `reciprocal-answer`. |
| `reciprocal-open-lab` | `button.btn.btn-primary` | "Open in the Lab" | 5.3.10. |
| `reciprocal-sr` | `div.sr-only[aria-live=polite]` | none | "Circle |z - 1| = 1 under 1/z becomes the line Re w = 0.5." |

**Pointer, touch, keyboard.** As in 2.1.3. Extra: the probe is snapped to the shape on every move, so a drag that leaves the shape slides along
it; the sphere is orbited with a drag (one finger on touch), zoomed with the wheel after it has focus, and driven from the keyboard by three-view
(arrows orbit, `+` and `-` zoom, `0` resets). The sphere slider and button are ordinary controls, so the half-turn works without the pointer.

#### 2.2.5 Empty, loading and error states

- **Loading.** The sphere box initially contains the text `Loading the sphere...`, removed just before `createView3D` (builder rule 10.6.2). Everything else
  is synchronous. `reciprocal.js` imports `three-view.js` (and with it three.js, about 0.7 MB), so on a slow connection the router's own placeholder shows first.
- **No WebGL.** `view.unavailable` is true: the three-view status message is already printed; the station disables `reciprocal-sphere-turn` and
  `reciprocal-sphere-play` (`disabled`), and replaces `reciprocal-sphere-note` with `This browser cannot draw the 3D sphere. The two planes above show the same map.`
  Nothing else changes.
- **p = 0.** The probe may sit exactly on 0 (circle 1, angle 180 degrees). The readout says `1/p = inf; |1/p| = inf`, the explainer cells for the
  four rows below `p` say `p = 0 goes to the point at infinity: there is no finite point to show.`, the `1/p` handle is hidden, the sphere marker goes to the north pole.
- **Image off the plane.** `reciprocal-wnote` and the edge arrow (5.3.8).
- **Errors.** Same as powermap (`#reciprocal-error`, same text).
- **Unknown preset token:** default state (preset 1, stage both). Tokens understood: `circle1`, `line`, `circle0`, `unit`, `invert`, `mirror`, `both`.

#### 2.2.6 Copy

| Where | Text |
|---|---|
| lede | `1/z does two things to the polar address: it inverts the length (r becomes 1/r) and it mirrors the angle (θ becomes −θ). Because 0 goes to infinity, a circle through 0 must open into a line. And on the Riemann sphere, 1/z is just a half-turn.` |
| z-plane caption | `z-plane: the input` |
| w-plane caption | stage invert: `w-plane after stage 1 (invert)`; mirror: `w-plane after stage 2 (mirror)`; both: `w-plane: w = 1/z` |
| stage note, invert | `Stage 1, invert in the unit circle: every point slides along its own ray from 0 to distance 1/r. Inside the dashed circle goes outside and outside goes in; points above the real axis stay above it.` |
| stage note, mirror | `Stage 2, mirror in the real axis: u + iv becomes u − iv. Nothing else moves. The faint curve is stage 1, the solid curve is the result, and the dashed segments are the mirror.` |
| stage note, both | `Both stages, 1/z = conj(z)/|z|². Length r becomes 1/r and angle θ becomes −θ. Follow the dark end of the ramp: it goes to the mirror image of where inversion put it.` |
| morph help, invert | `0 shows the input. 1 shows every point slid along its ray to distance 1/r.` |
| morph help, mirror | `0 shows the result of stage 1. 1 shows it flipped across the real axis. At 0.5 the flip is edge-on.` |
| morph help, both | `0 shows the input. 1 shows w = 1/z.` |
| near hint | as in the table above |
| sphere intro | `Project the plane onto a sphere from its north pole. The point at infinity is the north pole, the dot at the top, so a line is a circle through the north pole. In the plane 1/z is invert, then mirror; on the sphere those are two mirror images (across the equator, which is the unit circle, and across the real-axis circle), and together they are one half-turn about the axis through 1 and −1.` |
| sphere note | `Green is the input shape, fixed. Purple is the same curve, turned by the slider. At 180 degrees it lies exactly on the image of the shape under 1/z. The dot at the top is ∞. See the sphere as one shadow of the 4D graph.` with the last sentence a link to `#graph4d` |
| callout | `Why a circle through 0 must become a line. The point 0 goes to infinity, so the image has a point at infinity. A circle never goes to infinity, but a curve that leaves the plane in both directions and comes back from the other side is a line. Away from 0 nothing is lost: on the circle |z − 1| = 1, z = 2cos θ e^{iθ} and 1/z = 1/2 − (i/2) tan θ, whose real part never moves.` |
| problem note | `This is problem 2.5.1 exactly.` / `You changed the shape. The problem itself is the circle |z − 1| = 1.` |
| sr sentence | `Shape: circle |z - 1| = 1. Under 1/z it becomes the line Re w = 0.5.` (the two descriptions of the readout) |
| hint, reduced-motion note | none |

### 2.3 Shared parts (both stations; the code is duplicated, 5.1)

- **Header** (ARCHITECTURE 4.1): `<header class="station-header">` with the `<h1>` (set with `prose(h1, ctx.station.title)`, so `z^n` gets its superscript), the lede,
  `<ul class="thread-badges">` with one `<li class="thread-badge" data-thread="T1">` per entry of `ctx.station.threads` (text = the `THREADS` title), and a `<div class="chips">` of
  `<a class="chip problem-chip" href="#problem-2-1-2" title="<aha>">2.1.2</a>`, one per problem of `problemsForStation(ctx.station.id)`, with the route from `routeFor(id)`.
  powermap shows 2.1.2 and 2.2.1; reciprocal shows 2.5.1. The aha in `title` is `problem.aha` (plain text; its exponent notation is cosmetic in a tooltip).
- **Problem panel** (`#powermap-problem`, `#reciprocal-problem`): `<h2 class="panel-title">Problem 2.1.2</h2>`, a `.badge[data-tone=cart|polar]` with `addressLabel(p.address)` and
  the tone from `addressTones(p.address)[0]` ("Cartesian" for 2.1.2, "Polar" for 2.2.1 and 2.5.1), the statement through `statementParts(p.statement)` (text parts with `textContent`, math parts with
  `tex(span, part.text)`), the aha as one muted sentence, then two `.callout` boxes: `data-tone="cart"` headed "Cartesian route" with `prose(el, p.routes.cart)`, and `data-tone="polar"` headed "Polar route"
  with `prose(el, p.routes.polar)` (they stack below 560 px), then "Why this address: " plus `prose(el, p.addressWhy)`, then
  `<details id="powermap-answer"><summary>Show the answer</summary>` containing `tex(box, p.answer.tex, { display: true })` inside a `.tex-scroll` box and `p.answer.text` as a muted line
  (the wrap-friendly fallback; ARCHITECTURE 10.4.2). The note line (exact or changed) is last.
- **Links** (`<nav class="station-links" aria-label="Neighbouring places">`): `a.station-link[data-dir="prev"]` and `[data-dir="next"]` for the previous and next entry by registry `order`
  (powermap: `#linear` and `#principal-root`; reciprocal: `#branches` and `#limits`), then one line per thread of the station, `<span class="thread-badge" data-thread="T1">`
  followed by up to two links to the previous and next station that shares that thread (computed by `neighbourLinks`, 5.1.6). Expected for powermap: T1 `#linear`, `#reciprocal`; T2 `#roots`, `#principal-root`;
  T3 `#linear`, `#reciprocal`. For reciprocal: T1 `#powermap`, `#derivative`; T3 `#powermap`, `#limits`. Extra cross-links in the prose: powermap to `#staircase` and `#roots`; reciprocal to `#graph4d`.
  Every `href` is a route (10.1.1).
- **The Lab button** (`#<station>-open-lab`): `ctx.store.set('lab.request', request, { persist: false }); ctx.navigate('lab')`, with the request built by `labRequest` (5.2.9, 5.3.10).

---
## 3. Visual encoding (tokens only, so both themes work)

Nothing below is a literal colour. Canvas code names tokens (`'--input'`) and `plane.js` resolves them at draw time and again after `themechange`;
the only colours the stations compute are the morph blend and the sphere's static input line, both from `ctx.theme.cssVar(...)` and recomputed in the theme handler.
KaTeX tints (`cart()`, `polar()`) are called inside the explainer row functions at render time (builder rule 10.3.1), and the explainer re-renders by itself on
`themechange`. The sphere's meshes carry their own `themeRefresh` (three-view).

### 3.1 Marks

| Mark | Token and call | Style | Plane |
|---|---|---|---|
| powermap input stroke (line x = c, or the sector boundary) | `--input`, `plane.addCurve({ ramp: true, width: 3, dots: true, arrow: true })` | time ramp `--t0` to `--t1` mixed at weight 0.65 (plane.js), dots at t = 0, 1/4, 1/2, 3/4, arrowhead at t = 1; the "start / end" pill appears on the z-plane | z |
| sector interior rays and arcs | `--input`, `drawTimedCurve` width 1.25, alpha 0.8, ramp, no dots, no arrow | thin | z |
| sector fill | `drawPolygonFill` with `--input`, alpha 0.12 | | z |
| powermap image stroke, interior curves, fan fill | the same three marks with `--output` | identical ramp, so "when" matches "where" | w |
| carried Cartesian grid | `--cart` (by `curve.family === 'cart'`), width 1, alpha 0.4, `ramp: false`, no dots | flat colour, so the grid never competes with the stroke for the ramp | both |
| carried polar grid | `--polar` (by `curve.family === 'polar'`), same style | | both |
| probe z (clock cursor) | handle colour `--input`, radius 7 | filled dot with DOM label `z` | z |
| probe w | handle colour `--output`, radius 6, not draggable | label `w` | w |
| Cartesian address of the probe (powermap, line input only) | `drawCartAddress(ctx, plane, z)`, `--cart` | dashed drop lines to both axes with "x = ..." and "y = ..." (dashed, so it is not colour alone) | z, and w when s = 1 |
| Polar address of the probe | `drawPolarAddress(ctx, plane, z, { ghosts, ghostsNeg, name })`, `--polar` | solid ray labelled r, solid arc labelled `Arg z = ...` (the one highlighted step), ghost windings at `--ghost-alpha` (0.35) labelled `also ...` (the rest of the set arg) | z (one ghost), w (ghosts up to the step that is n theta, 5.2.4) |
| the seam | `drawSeam(ctx, plane, Math.PI)`, `--seam`, dashed, label "seam" | on every plane that shows a principal value | z, w in both stations (Arg of the probe and of its image are shown) |
| morph blend (powermap w-plane stroke) | `mixColor(cssVar('--input'), cssVar('--output'), s)` passed as the curve colour | green at s = 0, purple at s = 1 | w |
| edge arrow for an image off the plane | triangle in `--output` at the plane's edge plus `drawLabel` "\|w\| = 25.9" | 5.3.8 | w |
| reciprocal: circle of inversion (unit circle) | `drawCircle(ctx, plane, 0, 1, { color: '--polar', dash: DASH.guide, width: 2 })` | dashed (bold in stage 1, faint otherwise); a circle is polar's native shape | z (faint), w |
| reciprocal: mirror line (real axis), stage 2 | `drawSegment` across the view, `--cart`, `DASH.cart`, width 2, label "mirror (real axis)" | the Cartesian operation (negate y) | w |
| reciprocal: stage-1 image | `--output`; solid width 3 in the invert view, alpha 0.45 width 2 in the mirror view, alpha 0.3 width 1.5 dashed in the both view | ghost of stage 1 | w |
| reciprocal: connectors, mirror and both views | `drawSegment`, `--cart`, `DASH.cart`, from j(p) to 1/p, and four more at t = 1/8, 3/8, 5/8, 7/8 (mirror view only) | vertical, because the mirror only changes the sign of v | w |
| reciprocal: morph blend | `mixColor(cssVar('--input'), cssVar('--output'), s)` as the colour of the morphing pieces when s < 1 | green at s = 0, purple at s = 1 | w |
| sphere: static input curve | `curveToLine(triples, '--input')`, lifted 1.008 above the sphere | flat colour, fixed | sphere |
| sphere: turning copy | `sphere.addCurve(points, '--output')` (time ramp and dots come with it), turned by `sphere.setHalfTurn` | hidden at angle 0 (`line.visible = false`) | sphere |
| sphere: markers | `createMarker({ color: '--input' })` at z, `createMarker({ color: '--output' })` at 1/z (turning) | radius 0.045 | sphere |
| sphere: infinity | `sphere.markInfinity(true)`, built-in "∞" label at the top | north pole | sphere |

**Cartesian versus polar.** Blue (`--cart`) is everything Cartesian: grid lines x = c and y = c, drop lines, the mirror line, the "slide" columns of the explainer.
Orange (`--polar`) is everything polar: rays, arcs, the circles of the polar grid, the circle of inversion, the "spin-and-stretch" column.
**arg versus Arg.** The solid arc is `Arg`: one highlighted step. The faint windings with "also ..." are the rest of the set `arg`; the staircase beside the explainer lists the same set
with the home window shaded; the point itself is drawn once. **Input versus output.** Green `--input` on the z side and purple `--output` on the w side, each plane captioned with its letter.
**Time.** Lightness along the stroke, quarter dots, arrowheads, the start/end pill, the same ramp on both planes. **Hue as argument** (domain colouring) is not used by these two stations.

### 3.2 Contrast and the two themes

Token values and contrast ratios are those of `docs/designs/iter-1/i1-shell.md` 3.1 (all marks are at least 3:1 on `--surface` in both themes): `--input` 6.26 (light) and 8.71 (dark),
`--output` 6.17 and 7.43, `--cart` 6.17 and 7.12, `--polar` 6.06 and 8.30, `--seam` 4.76 and 5.95, ramp ends `--t0` 17.32 and 3.57, `--t1` 3.86 and 15.72. The ghost alpha is the token
`--ghost-alpha` (0.35 in both themes). The faint grid (alpha 0.4 of a 6:1 colour on `--surface`) is meant to recede; the stroke, the image and the probe are the only full-strength marks.
The review must read screenshots in both themes (`--dark` on the smoke command): check that the "also ..." words, the seam label and the edge-arrow label stay readable in dark.

---

## 4. Module API

### 4.1 `js/stations/powermap.js`

```js
export function mount(el, ctx)      // → unmount(); synchronous (returns the function itself, not a promise)
export const internals              // frozen bag of pure helpers; tests only (D1). Stations must not use another station's internals.
```

Imports (all relative): `../core/complex.js` (`pow`, `wrapArg`, `Arg`, `fromPolar`, `toPolar`, `eq`, `abs`, `fmtNum`, `fmtCart`, `fmtAngle`, `exactAngle`),
`../core/plane.js` (`createPlane`, `drawCartAddress`, `drawPolarAddress`, `drawSeam`, `drawTimedCurve`, `drawPolygonFill`, `drawDot`, `drawLabel`, `mixColor`, `DASH`),
`../core/shapes.js` (`verticalLine`, `sector`, `cartGrid`, `polarGrid`, `pointAt`), `../core/mapping.js` (`pushForward`, `pushForwardAll`, `morph`, `morphPoint`, `bounds`),
`../core/katex.js` (`tex`, `cart`, `polar`, `prose`), `../core/explainer.js` (`createExplainer`), `../core/staircase.js` (`createStaircase`),
`../data/problems.js` (`problemById`, `problemsForStation`, `routeFor`, `statementParts`, `addressLabel`, `addressTones`). It does **not** import `three-view.js`, `theme.js` or `store.js` (`ctx.theme` and `ctx.store` are injected).

```js
// State (module variable of mount; plain object; nothing else is persisted)
State = {
  input: 'line' | 'sector',
  n: 2 | 3 | 4 | 5 | 6,
  c: number,               // multiple of 0.1 in [-3, 3]; the line is x = c
  aStep: number, bStep: number,   // integers; the sector is aStep*π/36 < arg z < bStep*π/36; 1 <= bStep - aStep <= 71
  grid: 'cart' | 'polar' | 'none',
  t: number,               // [0, 1]: the probe's time on the stroke
  s: number,               // [0, 1]: morph, 1 = the full map
  playing: boolean,
}
PRESETS.problem212 = { input: 'line',   n: 2, c: 2, aStep: 0, bStep: 9, grid: 'cart',  t: 0.625, s: 1, playing: false }
PRESETS.problem221 = { input: 'sector', n: 3, c: 2, aStep: 0, bStep: 9, grid: 'polar', t: 0.5,   s: 1, playing: false }
```

`internals` (every function is pure and deterministic; signatures are the contract of the unit tests in section 7):

```js
presetFor(preset)                 // ctx.preset | null → fresh State. 5.2.1.
snapC(x)                          // → nearest multiple of 0.1 in [-3, 3], rounded with toFixed(1) so 1 is 1, never 1.0000000000000002
stepOf(angle)                     // → Math.round(angle / (π/36))
unwrapStep(prev, k)               // → k + 72 * Math.round((prev - k) / 72): the representative of k (mod 72) nearest to prev
constrainSteps({ aStep, bStep }, moving)   // moving 'a' | 'b' → new { aStep, bStep } with 1 <= bStep - aStep <= 71 (the moving end is clamped, the other never moves)
overlaps(a, b, n)                 // → n * (b - a) > 2π + 1e-9
angText(x)                        // → '0.785 (pi/4)' | '0' | '1.134': fmtNum(x), then ' (' + fmtAngle(x) + ')' when exactAngle(x) exists and differs from the decimal text
lineReadout(c, n)                 // → the ARCHITECTURE 9 line string (5.2.2)
sectorReadout(a, b, n)            // → the ARCHITECTURE 9 sector string
lineFact(c, n), sectorFact(a, b, n)        // → the sentence for #powermap-fact
gridNote(grid, n)                 // → the sentence for #powermap-gridnote
cartesianExpansion(n)             // n = 2..6 → { u: 'x^2 - y^2', v: '2xy' } etc.: Re and Im of (x + iy)^n by the binomial theorem, KaTeX-safe ASCII
fitHalfExtent(input, n, c)        // → half extent H of the w-plane view (5.2.1)
clampFor(view, size)              // → number: 5.1.2
nearestOnPolyline(points, z)      // points {re, im, t}[] → { t, z: {re, im}, d } the nearest point on the polyline and its interpolated t
probeOf(state, stroke?)           // → { z, t }; line: z = c + i(-4 + 8t); sector: shapes.pointAt(boundary, t)
derive(state, stroke?)            // → { mode, n, z, zero, r, theta, w, rho, nTheta, argW, k, wPolar, agree, where }, see 5.2.4
ghostCounts(nTheta, argW)         // → { up, down }: 5.2.4
neighbourLinks(stations, station) // → { prev, next, threads: [{ thread, prev, next }] } (station ids or null): 5.1.6
labRequest(state)                 // → LabRequest (ARCHITECTURE 4): 5.2.9
flatten(pieces, withBreaks)       // → Array of {re, im, t} with a .pieces property: 5.1.5
edgeIndicator(P, size, inset)     // → { x, y, ux, uy } | null: the arrow for an image that left the plane (5.1.7)
anyInView(pieces, view, size)     // → boolean (5.1.3)
srText(state)                     // → the sentence for #powermap-sr
```

**Data structures.** A curve, a piece and a point are exactly those of `shapes.js` and `mapping.js` (`{ points: {re, im, t}[], closed, family, kind, ... }`). The station keeps, per mount:
`stroke` (Curve), `extras` (Curve[], sector only), `zGrid` (Curve[]), `imgStroke`, `imgExtras`, `imgGrid` (pieces at the current clamp), `morphStroke`, `morphExtras`, `morphGrid` (pieces at the current s < 1),
`usedClamp`, and the layer and handle objects.

**Events consumed.** Handle `onDrag(z, { final, source })` for `line`, `s0`, `s1`, `p`; `wplane.on('viewchange', ...)`; DOM `click` on chips and buttons; DOM `input` on the three sliders (and `change`, which behaves the same);
`ctx.theme.onThemeChange`; one `requestAnimationFrame` loop per animation. **Events produced.** None. The station only writes the DOM, the two planes, the explainer, the staircase, `window.__mv` and (on a click) the store key `lab.request`.

### 4.2 `js/stations/reciprocal.js`

```js
export function mount(el, ctx)      // → unmount(); synchronous
export const internals              // as above
```

Imports: `complex.js` (`inv`, `conj`, `abs`, `sub`, `Arg`, `wrapArg`, `fromPolar`, `toPolar`, `eq`, `fmtNum`, `fmtCart`, `fmtAngle`, `exactAngle`), `plane.js` (as above plus `drawCircle`, `drawSegment`), `shapes.js` (`circle`, `segment`, `pointAt`),
`mapping.js` (`pushForward`, `morph`, `morphPoint`, `pointOnPieces`), `katex.js`, `explainer.js`, `data/problems.js`, and `three-view.js` (`createView3D`, `riemannSphere`, `createMarker`, `curveToLine`, `stereographic`, `disposeObject`). It does not import three.js itself.

```js
Shape = { kind: 'circle', c: {re, im}, r: number, bearing: number }      // bearing: the angle at which the `r` handle sits on the circle
      | { kind: 'line', a: {re, im}, b: {re, im} }                       // the line through a and b
Probe = { phi: number }           // circle: p = c + r e^{i phi}, phi in [0, 2π)
      | { s: number }             // line: p = m + s u, where u = (b - a)/|b - a| and m is the point of the line nearest 0; s in [-8, 8]
State = { preset: 'circle1' | 'line' | 'circle0' | 'unit' | 'custom', shape: Shape, probe: Probe, stage: 'invert' | 'mirror' | 'both', s: number /* morph [0,1], 1 = the stage's result */, turn: number /* sphere [0,1] */, playing: boolean, turning: boolean }
PRESETS = {
  circle1: { shape: { kind: 'circle', c: {re: 1,   im: 0}, r: 1,   bearing: -π/4 }, probe: { phi: π/2 } },   // p = 1 + i
  line:    { shape: { kind: 'line', a: {re: 1, im: -1.5}, b: {re: 1, im: 1.5} },    probe: { s: 1 } },       // p = 1 + i
  circle0: { shape: { kind: 'circle', c: {re: 1.5, im: 0}, r: 0.5, bearing: -π/4 }, probe: { phi: π/2 } },   // p = 1.5 + 0.5i
  unit:    { shape: { kind: 'circle', c: {re: 0,   im: 0}, r: 1,   bearing: -π/4 }, probe: { phi: π/2 } },   // p = i
}
```

`internals`:

```js
presetFor(preset)                 // ctx.preset | null → fresh State (5.3.1)
snapGrid(x)                       // nearest multiple of 0.1, toFixed(1) clean
describeShape(shape)              // → 'circle |z - 1| = 1' | 'circle |z| = 1' | 'line Re z = 1' | 'line Im z = 1' | 'line through <a> and <b>'
describeImage(shape)              // → { kind: 'line' | 'circle' | 'line0', text, ... } (5.3.4)
imageResidual(shape, w)           // → number >= 0: distance of w from the described image curve (0 on it)
isThroughOrigin(shape)            // → boolean
nearHint(shape)                   // → boolean: 0 < | |c|² - r² | < 0.3 max(1, r²)
invertPoint(z)                    // stage 1: z/|z|²; {NaN, NaN} for z = 0
mirrorPoint(z)                    // stage 2: conj
refineSamples(zOf, base, f, opts) // 5.3.3 → points {re, im, t}[]
strokeOf(shape, clamp)            // → { curve, zOf }: the refined, shapes-compatible Curve and its parametrisation (5.3.2)
probeOf(shape, probe)             // → { z, t }
snapProbe(shape, z)               // → Probe (5.3.5)
rotateMaths(P, angle)             // [X, Y, Z] → [X, Y cos a - Z sin a, Y sin a + Z cos a] (6.4.5)
sphereTriples(points, lift)       // [{re, im}] → [[lift X, lift Y, lift Z]] by stereographic
edgeIndicator(P, size, inset)     // pixel P outside [inset, w - inset] x [inset, h - inset] → { x, y, ux, uy } the arrow tip and direction, or null when inside (5.3.8)
readoutText(shape, p)             // → the ARCHITECTURE 9 string
clampFor, neighbourLinks, labRequest, flatten, srText, anyInView    // as in powermap (edgeIndicator is listed above)
```

### 4.3 `window.__mv` hooks (ARCHITECTURE 10.7: never replace `window.__mv`; delete in `unmount`)

```js
const mv = (window.__mv = window.__mv || {});
// powermap
mv.powermapImage       = flatten(imgStroke.concat(imgExtras), false)   // finite points only; .pieces = Array of Array of {re, im, t}
mv.powermapGridImage   = flatten(imgGrid, false)                        // same shape, for the carried grid
mv.powermapMorph       = { s, pieces }                                  // pieces actually drawn on the w-plane (morph pieces when s < 1, else the images)
// reciprocal
mv.reciprocalImage     = flatten(finalPieces, true)                     // separators { re: NaN, im: NaN, t: NaN } between pieces; .pieces
mv.reciprocalStages    = { stage, inverted, final }                     // inverted and final are Array<{ points: Array<{re, im, t}>, closed }>, exactly what pushForward returns (so pieces[0].points[0], unlike reciprocalImage.pieces[0][0])
mv.reciprocalMorph     = { s, stage, pieces }                           // pieces actually drawn for the stage (morph pieces when s < 1)
mv.reciprocalSphere    = { turn, available: boolean }                   // available = !view.unavailable
```
The arrays are replaced (not mutated) after every recompute of the images, so a script that reads `window.__mv.powermapImage` after `settle()` sees the state of the last flush. They exist from the end of `mount` onward.

### 4.4 Lifecycle

`mount(el, ctx)` order: resolve the preset; build the DOM (Appendix A); create the explainer, the staircase (powermap) or the sphere (reciprocal), the two planes, layers, handles; wire the controls; run `flushNow()` once (everything is on screen
and the hooks exist when `mount` returns); subscribe to the theme; **last**, attach any window or document listener (there are none beyond the theme subscription). Return `unmount`.
`unmount()` must: set `dead = true` (every callback checks it first); `cancelAnimationFrame` the flush and the play loops; `plane.destroy()` both planes (this also removes their handles and unregisters them from `window.__mv.planes`);
`explainer.destroy()`; `staircase.destroy()`; `view.dispose()` (reciprocal; also `disposeObject` on the static input line); unsubscribe the theme; `delete window.__mv.<hooks>` (`powermapImage`, `powermapGridImage`, `powermapMorph`; `reciprocalImage`, `reciprocalStages`, `reciprocalMorph`, `reciprocalSphere`); clear `el` with `el.replaceChildren()`.
It must be safe to call twice and must not throw when a plane or the view failed to build (each cleanup is individually guarded, as the router already wraps `unmount` in try/catch).
A late `onDrag`, `viewchange` or rAF callback after `unmount` returns at its first line.

---
## 5. Algorithms

Pseudocode is JavaScript-flavoured and exact enough to type in. `fmtNum`, `fmtCart`, `fmtAngle`, `exactAngle` are the `complex.js` ones (ASCII minus, 3 decimals, trailing zeros trimmed).
"Silent" means `handle.set(z, { silent: true })`. Helper names that are not in `internals` are local to `mount`.

### 5.1 Shared helpers (the same code is typed into both files; stations may not import each other)

**5.1.1 Scheduling.** One flush per animation frame; discrete events flush at once.
```
let rafId = 0, dead = false
const dirty = { stroke: true, grid: true, view: true, images: true, morph: true, probe: true, sphere: true }   // reciprocal uses shape/sphere/probe only
function schedule()  { if (dead || rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; flush(); }); }
function flushNow()  { if (dead) return; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } flush(); }
// continuous input (pointermove of a drag, slider while dragging, the play loops): mark dirty, call schedule()
// discrete input (chip, preset, drag `final`, slider `change`, keyboard nudge): mark dirty, call flushNow()
// readout, fact, t output, sr text and aria-valuetext are written synchronously by the event handler (cheap string work), so a script that reads them one frame later is safe.
```

**5.1.2 `clampFor(view, size)`** (ARCHITECTURE 10.5.1, rounded up to a power of two so wheel zoom does not recompute on every tick).
```
halfW = view.unitsAcross / 2
halfH = halfW * size.h / size.w
raw   = Math.max(40, 3 * Math.max(halfW, halfH) + Math.hypot(view.center.re, view.center.im))
return 2 ** Math.ceil(Math.log2(raw))
// clampFor({center:{0,0}, unitsAcross: 36}, {w:480,h:480}) = 64      (raw 54)
// clampFor({center:{0,0}, unitsAcross: 6},  {w:480,h:480}) = 64      (raw 40)
// clampFor({center:{0,0}, unitsAcross: 610.3515625}, {w:480,h:480}) = 1024   (raw 915.5)
```
`usedClamp` remembers the value the current images were computed with; the w-plane `viewchange` handler (and the start of every flush) compares `clampFor(...)` with it and marks the images dirty when they differ.

**5.1.3 `anyInView(pieces, view, size)`** (drives `*-wnote`): `halfW, halfH` as above; return `true` as soon as some point has `|re - view.center.re| <= halfW && |im - view.center.im| <= halfH`; `false` for no pieces. Show the note when it returns `false`.

**5.1.4 Curve pools.** Pieces change in number as the shape changes, so each plane keeps a pool of `plane.addCurve` layers and never removes any.
```
function syncPool(plane, pool, pieces, style, idPrefix) {
  for (let i = 0; i < pieces.length; i++) {
    if (!pool[i]) pool[i] = plane.addCurve({ id: idPrefix + i, points: pieces[i].points, order: 100, ...style });
    else          pool[i].update(pieces[i].points);
    pool[i].set({ closed: !!pieces[i].closed, ...style });          // style keys: color, width, alpha, dots, arrow, dash, ramp
    pool[i].hidden = false;
  }
  for (let j = pieces.length; j < pool.length; j++) { pool[j].update([]); pool[j].hidden = true; }
}
```
A pool never exceeds 12 layers in these stations (powermap 8 pieces, reciprocal 2 pieces per stage).

**5.1.5 `flatten(pieces, withBreaks)`** (the hooks).
```
const out = []
pieces.forEach((pc, i) => {
  if (withBreaks && i > 0 && out.length) out.push({ re: NaN, im: NaN, t: NaN })
  for (const p of pc.points) if (Number.isFinite(p.re) && Number.isFinite(p.im)) out.push({ re: p.re, im: p.im, t: p.t })
})
out.pieces = pieces.map((pc) => pc.points.filter((p) => Number.isFinite(p.re) && Number.isFinite(p.im)).map((p) => ({ re: p.re, im: p.im, t: p.t })))
return out
```

**5.1.6 `neighbourLinks(stations, station)`.**
```
sorted = [...stations].sort((a, b) => a.order - b.order)
i = sorted.findIndex((s) => s.id === station.id)
threads = station.threads.map((tid) => {
  same = sorted.filter((s) => s.threads.includes(tid)); k = same.findIndex((s) => s.id === station.id)
  return { thread: tid, prev: same[k - 1] ? same[k - 1].id : null, next: same[k + 1] ? same[k + 1].id : null }
})
return { prev: sorted[i - 1] ? sorted[i - 1].id : null, next: sorted[i + 1] ? sorted[i + 1].id : null, threads }
// powermap: prev linear, next principal-root; T1 linear/reciprocal; T2 roots/principal-root; T3 linear/reciprocal
// reciprocal: prev branches, next limits; T1 powermap/derivative; T3 powermap/limits
```
Render with `ctx.stations` (the registry array) and titles from the entries.

**5.1.7 `edgeIndicator(P, size, inset)`** (the arrow for an image that left the plane).
```
if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) return null                 // direction unknown (the image is the point at infinity)
const { w, h } = size
if (P.x >= inset && P.x <= w - inset && P.y >= inset && P.y <= h - inset) return null
const dx = P.x - w / 2, dy = P.y - h / 2, L = Math.hypot(dx, dy)
const k = Math.min(dx !== 0 ? (w / 2 - inset) / Math.abs(dx) : Infinity, dy !== 0 ? (h / 2 - inset) / Math.abs(dy) : Infinity)
return { x: w / 2 + dx * k, y: h / 2 + dy * k, ux: dx / L, uy: dy / L }
// edgeIndicator({x: 900, y: 200}, {w: 400, h: 400}, 14) = { x: 386, y: 200, ux: 1, uy: 0 }
// edgeIndicator({x: 200, y: 200}, {w: 400, h: 400}, 14) = null
```
Drawing it (inside the w-plane overlay layer): the triangle with tip `(x, y)`, base centre `(x - 11 ux, y - 11 uy)` and half-width 6 along `(-uy, ux)`, filled with `cssColor('--output')` (read via `getComputedStyle(document.documentElement).getPropertyValue('--output')` at draw time), then `drawLabel(ctx, plane, plane.fromPixel(x - 22 ux, y - 22 uy), '|w| = ' + fmtNum(abs(w)), { color: '--output', dx: 0, dy: 0, align: 'center' })`.

**5.1.8 Animation helper** (both play buttons and the sphere turn).
```
function animate(ms, step) {                         // step(u) with u in [0, 1]; returns cancel()
  let id = 0, t0 = 0
  const tick = (now) => { if (dead) return; if (!t0) t0 = now; const u = Math.min(1, (now - t0) / ms); step(u); id = u < 1 ? requestAnimationFrame(tick) : 0 }
  id = requestAnimationFrame(tick)
  return () => { if (id) cancelAnimationFrame(id); id = 0 }
}
```
Reduced motion is read at click time with `ctx.theme.prefersReducedMotion()`; when true no animation is ever started.

**5.1.9 Problem panel, links, Lab button, SR text.** As in 2.3. `renderProblem(host, id, exactNow)` clears `host` and rebuilds it; it is called on mount and when the input mode changes (powermap) and refreshes only the note line otherwise.
Each control handler ends with `scheduleSr()`: `clearTimeout(srTimer); srTimer = setTimeout(() => { if (!dead) sr.textContent = srText(st); }, 250)`; `unmount` clears the timer.

### 5.2 powermap

**5.2.1 Presets, fitting the w-plane.**
```
presetFor(preset):
  if (!preset)                             return copy(PRESETS.problem212)
  if (preset.kind === 'problem')           return copy(preset.id === '2.2.1' ? PRESETS.problem221 : PRESETS.problem212)
  if (preset.kind === 'topic')             return copy(preset.id === 'T2.2'  ? PRESETS.problem221 : PRESETS.problem212)
  if (preset.kind === 'token')             return copy(['sector', 'fan'].includes(String(preset.token).toLowerCase()) ? PRESETS.problem221 : PRESETS.problem212)
  return copy(PRESETS.problem212)

fitHalfExtent(input, n, c):
  if (input === 'sector') return 1.25 * 2.5 ** n                    // 7.8125, 19.53125, 48.828125, 122.0703125, 305.17578125 for n = 2..6
  if (n === 2)            return 18                                // shows the stroke image (v up to 16 at c = 2) and the grid patch image
  return Math.max(8, 1.6 * Math.max(Math.abs(c), 1) ** n)          // c = 2: 12.8, 25.6, 51.2, 102.4 for n = 3..6; c = 0: 8

fitW():  H = fitHalfExtent(st.input, st.n, st.c); wplane.setView({ center: { re: 0, im: 0 }, unitsAcross: 2 * H }); wplane.setHome()
```
`fitW()` runs on mount, on a change of n and on a change of input, and never during a drag of `line`, `s0`, `s1` or `p`, with one exception: when the image of the stroke is entirely off the w-plane after a recompute, the flush refits once and recomputes (5.2.11; this happens, for example, when n = 6 and the line is dragged from x = 2 to x = 3, whose nearest point 729 is outside the view fitted for x = 2). The z-plane view is `[-4.5, 4.5]` squared for ever (its `Reset` returns there). The w-plane is created with `maxUnitsAcross: 5000` (the plane default of 200 would clamp the n = 6 views, which are 205 and 610 units across).

**5.2.2 Texts** (these are the strings the interaction script and the unit tests assert).
```
lineReadout(c, n):
  if (n === 2 && c === 0)  return 'x = 0; image: the negative real axis (u <= 0, v = 0), the parabola has collapsed; focus 0; vertex 0'
  if (n === 2)             return `x = ${fmtNum(c)}; image: u = ${fmtNum(c*c)} - v²/${fmtNum(4*c*c)}; focus 0; vertex ${fmtNum(c*c)}`      // "v²" is v followed by U+00B2
  return `image of x = ${fmtNum(c)} under z^${n}`
angText(x):   d = fmtNum(x); e = fmtAngle(x); return (exactAngle(x) && e !== d) ? `${d} (${e})` : d          // fmtAngle is ASCII: 'pi/4'
sectorReadout(a, b, n): `sector ${angText(a)} < arg z < ${angText(b)}; image: ${angText(n*a)} < arg w < ${angText(n*b)}` + (overlaps(a, b, n) ? ' (overlaps itself)' : '')
overlaps(a, b, n): n * (b - a) > 2 * Math.PI + 1e-9                       // exactly one full turn (n = 6, width pi/3) does NOT overlap
lineFact(c, n):
  n === 2 && c === 0 → 'The line x = 0 is the imaginary axis. Squaring sends iy to −y², so it lands on the negative real axis, twice over.'
  n === 2            → `Focus 0 and directrix u = ${fmtNum(2*c*c)}: every point of the parabola is as far from 0 as from that line.`
  c === 0, n even    → `The line x = 0 is the imaginary axis. Its power ${n} is a ray of the real axis, run twice (y and −y have the same even power).`
  c === 0, n odd     → `The line x = 0 is the imaginary axis. Its power ${n} stays on the imaginary axis and covers it once.`
  otherwise          → `Nearest point of the image to 0: ${fmtNum(Math.pow(c, n))}, where y = 0.`
sectorFact(a, b, n): `Opening ${fmtNum(b - a)} becomes ${fmtNum(n * (b - a))}: ${n} times wider.` + (overlaps(a, b, n) ? ' That is more than a full turn, so the fan lies on top of itself.' : '')
t output: line → `t = ${fmtNum(t)} (y = ${fmtNum(-4 + 8*t)})`;  sector → `t = ${fmtNum(t)} (${whereSector(t)})`
whereSector(t): L = 2*2.5 + 2.5*(b - a);  tRay = 2.5 / L;  tArcEnd = (2.5 + 2.5*(b - a)) / L          // the boundary is: ray out, arc, ray back, t by arclength
                t < tRay - 1e-9 → 'on edge a';  t <= tArcEnd + 1e-9 → 'on the arc';  else 'on edge b'      // default sector: tRay 0.359, tArcEnd 0.641, so t = 0.5 is 'on the arc'
```
`gridNote(grid, n)`, the staircase intro, the callouts and the other prose are the strings of 2.1.5 (the grid note's `n` is substituted; `2π/n` is written `π`, `2π/3`, `π/2`, `2π/5`, `π/3` for n = 2..6); set with `prose(el, text)`.

**5.2.3 Strokes and grids.**
```
buildStroke():
  if (st.input === 'line') { stroke = verticalLine(st.c, { yRange: [-4, 4], n: 128 }); extras = [] }
  else { cs = sector({ r0: 0, r1: 2.5, theta0: st.aStep * Math.PI/36, theta1: st.bStep * Math.PI/36, fill: true, fillRays: 4, fillArcs: 3, n: 48 })
         stroke = cs[0]; extras = cs.slice(1) }                 // boundary (closed, 145 points, t by arclength), 4 rays, 3 arcs
gridFor(kind):    // memoised per kind, never changes
  'cart'  → cartGrid({ xRange: [-3, 3], yRange: [-3, 3], step: 0.5, n: 96 })      // 13 + 13 curves, family 'cart'
  'polar' → polarGrid({ rMax: 3, rings: 6, rays: 12, n: 96 })                       // 6 + 12 curves, family 'polar'
  'none'  → []
```
`sector` is called with `theta1 > theta0` always (the `constrainSteps` invariant), so it never adds turns and never caps the sweep.

**5.2.4 The probe and the numbers (`probeOf`, `derive`, `ghostCounts`).**
```
probeOf(st, stroke):   line   → { z: { re: st.c, im: -4 + 8 * st.t }, t: st.t }          // analytic, exactly y = -4 + 8t (t = 0.625 gives y = 1)
                       sector → { z: pointAt(stroke, st.t), t: st.t }
derive(st, stroke):
  { z, t } = probeOf(st, stroke)
  r = Math.hypot(z.re, z.im);  zero = r < 1e-9
  theta  = zero ? 0 : Arg(z)                             // Arg z in (-π, π]
  w      = pow(z, st.n)                                  // the Cartesian route: repeated multiplication (exact for Gaussian integers)
  rho    = Math.pow(r, st.n)
  nTheta = st.n * theta                                  // one NAME of arg w; never reduced
  argW   = zero ? 0 : wrapArg(nTheta)                    // the home step (wrapArg turns -π into π)
  k      = zero ? 0 : Math.round((nTheta - argW) / (2 * Math.PI))     // how many full turns above the home step nθ sits
  wPolar = fromPolar(rho, argW)                          // the polar route; this is what the planes and `q` draw (so Arg w is never -π by float noise)
  agree  = zero || eq(w, wPolar, 1e-9 * Math.max(1, rho))
  where  = line ? `y = ${fmtNum(z.im)}` : whereSector(t)          // aRad = st.aStep * π/36, bRad = st.bStep * π/36; line = (st.input === 'line')
  return { mode: st.input, n: st.n, c: st.c, a: aRad, b: bRad, z, zero, r, theta, w, rho, nTheta, argW, k, wPolar, agree, where, t }
ghostCounts(nTheta, argW):  k = Math.round((nTheta - argW) / (2π)); up = k > 0 ? Math.min(k, 6) : 0; down = k < 0 ? Math.min(-k, 6) : 0; if (up + down === 0) up = 1; return { up, down }
```
So on the w-plane the polar address is drawn at `wPolar` with exactly the ghost windings that reach nθ (and at least one ghost, so arg is visibly a set); on the z-plane at `z` with `ghosts: 1`.

**5.2.5 The probe handle (the clock cursor).**
```
p = zplane.addPoint({ id: 'p', z: derive.z, color: '--input', label: 'z', name: 'Probe z', radius: 7, step: 0.1,
  snap: (z) => st.input === 'line'
          ? { re: st.c, im: Math.max(-4, Math.min(4, Number((Math.round(z.im / 0.1) * 0.1).toFixed(1)))) }      // y on the 0.1 grid
          : nearestOnPolyline(stroke.points, z).z,
  onDrag: (z, info) => { stopPlay(); st.t = st.input === 'line' ? (z.im + 4) / 8 : nearestOnPolyline(stroke.points, z).t;
                          dirty.probe = true; info.final ? (flushNow(), scheduleSr()) : schedule() } })
```
`nearestOnPolyline(points, z)`:
```
best = { d2: Infinity, t: 0, z: null }
for (i = 0; i + 1 < points.length; i++) {
  a = points[i]; b = points[i+1]; dx = b.re - a.re; dy = b.im - a.im; L2 = dx*dx + dy*dy
  u = L2 > 0 ? Math.max(0, Math.min(1, ((z.re - a.re)*dx + (z.im - a.im)*dy) / L2)) : 0
  q = { re: a.re + u*dx, im: a.im + u*dy }; d2 = (z.re - q.re)**2 + (z.im - q.im)**2
  if (d2 < best.d2) best = { d2, t: a.t + u * (b.t - a.t), z: q }
}
return { t: best.t, z: best.z, d: Math.sqrt(best.d2) }
```
The handle is added **last** among the z-plane handles, so it is on top and can always be grabbed; at y = 0 it covers the `line` handle (drag the probe away, or Tab to the `line` handle and use the arrow keys).
`syncProbe()` moves `p` with `p.set(derive.z, { silent: true })` and `q` with `q.set(morphPoint(derive.z, derive.wPolar, st.s), { silent: true })`.

**5.2.6 The sector handles.**
```
STEP = Math.PI / 36
cornerAt(k) = { re: 2.5 * Math.cos(k * STEP), im: 2.5 * Math.sin(k * STEP) }
stepOf(angle) = Math.round(angle / STEP)
unwrapStep(prev, k) = k + 72 * Math.round((prev - k) / 72)
constrainSteps({ aStep, bStep }, moving):
  if (moving === 'a') aStep = Math.max(bStep - 71, Math.min(bStep - 1, aStep))
  else                bStep = Math.max(aStep + 1,  Math.min(aStep + 71, bStep))
  return { aStep, bStep }
add s0 and s1 BEFORE the probe:
  zplane.addPoint({ id: 's0', z: cornerAt(st.aStep), color: '--input', label: 'a', name: 'Sector edge a', radius: 6, step: 0.25,
      snap: (z) => cornerAt(stepOf(Math.atan2(z.im, z.re))),
      onDrag: (z, info) => moveEdge('a', z, info) })
  (s1 the same with id 's1', label 'b', name 'Sector edge b', onDrag → moveEdge('b', ...))
moveEdge(which, z, info):
  k    = unwrapStep(which === 'a' ? st.aStep : st.bStep, stepOf(Math.atan2(z.im, z.re)))
  next = constrainSteps(which === 'a' ? { aStep: k, bStep: st.bStep } : { aStep: st.aStep, bStep: k }, which)
  st.aStep = next.aStep; st.bStep = next.bStep
  handle(which).set(cornerAt(which === 'a' ? st.aStep : st.bStep), { silent: true })      // a clamped move puts the dot where the clamp left the edge
  dirty.stroke = true; info.final ? (flushNow(), scheduleSr()) : schedule()
```
The step 0.25 makes one arrow press move the corner by one 5 degree step (at radius 2.5, 0.25 is 5.7 degrees, which snaps to 5). A press along the radius changes nothing (the angle is unchanged).
Worked check (the A2 drag): s1 starts at step 9; the pointer is released at (0, 2): `Math.atan2(2, 0) = pi/2`, `stepOf = round(18.000000000000004...) = 18`, `unwrapStep(9, 18) = 18`, `constrainSteps` leaves 18 (limits 1..71), so `b = 18 * pi/36 = pi/2` and the handle rests at `(1.5e-16, 2.5)`.

**5.2.7 The line handle.**
```
zplane.addPoint({ id: 'line', z: { re: st.c, im: 0 }, color: '--input', label: 'c', name: 'Line position c', radius: 6, step: 0.1,
   snap: (z) => ({ re: snapC(z.re), im: 0 }),
   onDrag: (z, info) => { st.c = z.re; dirty.stroke = true; info.final ? (flushNow(), scheduleSr()) : schedule() } })
snapC(x) = Math.max(-3, Math.min(3, Number((Math.round(x / 0.1) * 0.1).toFixed(1))))        // snapC(2.04) = 2, snapC(2.06) = 2.1, snapC(3.4) = 3, snapC(-3.4) = -3
```
Added before the probe (z-order, 5.2.5). Hidden (`handle.hidden = true`) when the input is the sector; `s0`, `s1` hidden when the input is the line.

**5.2.8 Explainer, staircase.** `createExplainer(host, { id: 'powermap-ex', title: 'The same point, worked both ways', rows: rowsFor(mode), same })` with the default Cartesian and polar columns; `setRows(rowsFor(mode))` when the input changes.
`TX = (r, ang) => fmtNum(r) + '\\,e^{' + (ang < 0 ? '-' : '') + 'i\\,' + fmtNum(Math.abs(ang)) + '}'` (the polar number r e^{i ang}). Row functions call `cart()`, `polar()` at render time.
```
ex = cartesianExpansion(s.n)                       // { u: 'x^3 - 3xy^2', v: '3x^2y - y^3' }
rows (both modes):
 z    label 'z, the point'
      cart:  cart(`z = ${fmtCart(s.z)}`)
      polar: s.zero ? { text: 'z = 0 (the corner).' } : polar(`z = ${TX(s.r, s.theta)}\\ (\\theta = \\Arg z)`)
 u    label 'u = Re w'
      cart:  cart(`u = ${ex.u} = ${fmtNum(s.w.re)}`)
      polar: polar(`u = r^{${s.n}}\\cos ${s.n}\\theta = ${fmtNum(s.w.re)}`)
 v    label 'v = Im w'
      cart:  cart(`v = ${ex.v} = ${fmtNum(s.w.im)}`)
      polar: polar(`v = r^{${s.n}}\\sin ${s.n}\\theta = ${fmtNum(s.w.im)}`)
 w    label 'w = z^n'    native: 'polar'
      cart:  cart(`w = u + iv = ${fmtCart(s.w)}`)
      polar: s.zero ? { text: 'w = 0.' } : polar(`w = r^{${s.n}}e^{i\\,${s.n}\\theta} = ${TX(s.rho, s.nTheta)}`)           // the angle shown is n·theta, not reduced
 argw label 'arg w and Arg w'
      cart:  s.zero ? { text: 'z = 0 has no angle: arg 0 is undefined.' } : cart(`\\Arg w = \\operatorname{atan2}(v, u) = ${fmtNum(s.argW)}`)
      polar: s.zero ? { text: 'z = 0 has no angle: arg 0 is undefined.' }
             : s.k === 0 ? polar(`${s.n}\\theta = ${fmtNum(s.nTheta)} = \\Arg w\\ \\text{(already the home step)}`)
             : polar(`${s.n}\\theta = ${fmtNum(s.nTheta)}\\ \\text{is one name of } \\arg w;\\ \\Arg w = ${s.n}\\theta ${s.k > 0 ? '-' : '+'} ${Math.abs(s.k)}\\cdot 2\\pi = ${fmtNum(s.argW)}`)
rows, line mode, extra row:
 test label 'On the curve?'    native: (s) => s.n === 2 ? 'cart' : 'polar'
      cart:  s.n === 2 ? cart(`c^2 - \\dfrac{v^2}{4c^2} = ${fmtNum(s.c*s.c - s.w.im**2 / (4*s.c*s.c))} = u`)      // c = 0 → { text: 'x = 0: the parabola has collapsed onto the negative real axis.' }
                       : { text: `No short formula: eliminating y from a degree-${s.n} polynomial is the hard way.` }
      polar: s.zero ? { text: 'z = 0 is not on the line.' }          // cannot happen for c != 0; c = 0 and y = 0 puts z at 0
             : s.n === 2 ? polar(`\\rho(1 + \\cos\\varphi) = 2c^2:\\ ${fmtNum(s.rho)}(1 + ${fmtNum(Math.cos(s.argW))}) = ${fmtNum(s.rho * (1 + Math.cos(s.argW)))} = ${fmtNum(2*s.c*s.c)}`)
             : polar(`\\rho\\cos^{${s.n}}(\\varphi/${s.n}) = c^{${s.n}}:\\ ${fmtNum(s.rho * Math.cos(s.nTheta / s.n) ** s.n)} = ${fmtNum(Math.pow(s.c, s.n))}`)       // φ = nθ, the unreduced name
rows, sector mode, extra row:
 test label 'Inside the fan?'  native: 'polar'
      cart:  (valid: -π/2 < a, b < π/2, s.z.re > 1e-9) ? cart(`\\tan a \\le \\dfrac{y}{x} \\le \\tan b:\\ ${fmtNum(Math.tan(a))} \\le ${fmtNum(s.z.im / s.z.re)} \\le ${fmtNum(Math.tan(b))}`)
                                                      : { text: 'Two rays: easier to say with angles.' }
      polar: s.zero ? { text: 'z = 0 is the corner of the fan.' } : polar(`a \\le \\theta \\le b \\Rightarrow ${s.n}a \\le ${s.n}\\theta \\le ${s.n}b:\\ ${fmtNum(s.n*a)} \\le ${fmtNum(s.nTheta)} \\le ${fmtNum(s.n*b)}`)
same: (s) => ({ cart: cart(fmtCart(s.w)), polar: s.zero ? polar('0') : polar(TX(s.rho, s.argW)), agree: s.agree })
```
A row cell that has no sensible content returns `{ text }` (never a bare string: a bare string is TeX). The explainer is updated with `explainer.update(derive(...))` at the end of `syncProbe()`; the staircase with `stairs.update(s.zero ? null : s.argW)`;
`createStaircase(host, { id: 'powermap-stairs', kMin: -3, kMax: 3, label: 'arg w' })`. Rows k = -3..3 cover every name n·theta can take (|n·theta| <= 6π).

**5.2.8b `cartesianExpansion(n)`** (Re and Im of (x + iy)^n, F2).
```
binom(n, k) = n!/(k!(n-k)!)
for k = 0..n:  coef = binom(n, k) * ((k % 4 === 0 || k % 4 === 1) ? 1 : -1)        // i^k = 1, i, -1, -i
               term = { sign: coef < 0 ? '-' : '+', body: (Math.abs(coef) === 1 ? '' : String(Math.abs(coef))) + power('x', n - k) + power('y', k) }
               (k even → u list, k odd → v list);   power(v, 0) = '', power(v, 1) = v, power(v, p) = `${v}^${p}`
join(list) = list.map((t, i) => i === 0 ? (t.sign === '-' ? '-' : '') + t.body : ` ${t.sign} ${t.body}`).join('')
return { u: join(uTerms), v: join(vTerms) }          // n = 2..6 give exactly the strings of test U6
```
The coefficient 1 is always dropped, because a variable always follows it (every term is x^{n-k} y^k with n >= 2).

**5.2.8c `syncProbe()`** (called by every flush).
```
s = derive(st, stroke); lastState = s
p.set(s.z, { silent: true });  q.set(morphPoint(s.z, s.wPolar, st.s), { silent: true })            // q at the morphed point; at s = 1 exactly wPolar
readout.textContent = st.input === 'line' ? lineReadout(st.c, st.n) : sectorReadout(aRad, bRad, st.n)
fact.textContent    = st.input === 'line' ? lineFact(st.c, st.n)    : sectorFact(aRad, bRad, st.n)
prose(gridnote, gridNote(st.grid, st.n));  caption of the w-plane: `w = z^${st.n}` ;  n output and aria-valuetext
tOut.textContent = tText(s);  tSlider.setAttribute('aria-valuetext', tOut.textContent);  if (document.activeElement !== tSlider) tSlider.value = String(st.t)
morphOut.textContent = `s = ${fmtNum(st.s)}`;  morphHelp.textContent = st.s < 0.999 ? 'Slide to 1 to see w.' : '0 shows the input plane. 1 shows w = z^n.'  (with the real n)
explainer.update(s);  stairs.update(s.zero ? null : s.argW)
mv.powermapMorph = { s: st.s, pieces: st.s >= 0.999 ? imgStroke.concat(imgExtras) : morphStroke.concat(morphExtras) }
wnote.hidden = anyInView(st.s >= 0.999 ? imgStroke : morphStroke, wplane.getView(), wplane.getSize())
```

**5.2.9 Lab request.**
```
labRequest(st):
  fn       = st.n === 2 ? 'sq' : st.n === 3 ? 'cube' : { src: `z^${st.n}` }
  shapes   = st.input === 'line' ? [{ kind: 'verticalLine', x: st.c }] : [{ kind: 'sector', r0: 0, r1: 2.5, theta0: st.aStep*π/36, theta1: st.bStep*π/36 }]
  problem  = (st.input === 'line' && st.n === 2 && st.c === 2) ? '2.1.2' : (st.input === 'sector' && st.n === 3 && st.aStep === 0 && st.bStep === 9) ? '2.2.1' : null
  return { fn, shapes, view: 'side', problem, predictFirst: false }
click: ctx.store.set('lab.request', labRequest(st), { persist: false }); ctx.navigate('lab')
```

**5.2.10 Layers (what is drawn, in order; `order` is the plane layer order).**
```
z-plane  (createPlane id 'powermap-zplane', xRange yRange [-4.5, 4.5], grid 'none', axisLabels ['x', 'y'], ariaLabel 'z-plane, the input', maxWidth 560, legend true)
  10   grid        for c of zGrid: drawTimedCurve(ctx, plane, c.points, { color: c.family === 'polar' ? '--polar' : '--cart', width: 1, alpha: 0.4, ramp: false, dots: false, arrow: false })
  20   fill        sector only: drawPolygonFill(ctx, plane, stroke.points, { color: '--input', alpha: 0.12 })
  90   extras      sector only: for c of extras: drawTimedCurve(ctx, plane, c.points, { color: '--input', width: 1.25, alpha: 0.8, ramp: true, dots: false, arrow: false })
  100  stroke      zStroke = plane.addCurve({ id: 'stroke', color: '--input', width: 3, ramp: true, dots: true, arrow: true })       // points and `closed` set in syncCurves
  200  overlays    if (!s.zero) { if (line) drawCartAddress(ctx, plane, s.z); drawPolarAddress(ctx, plane, s.z, { ghosts: 1, name: 'z' }) }; drawSeam(ctx, plane, Math.PI)
w-plane  (id 'powermap-wplane', view from fitW(), maxUnitsAcross 5000, grid 'none', axisLabels ['u', 'v'], ariaLabel 'w-plane, the output', maxWidth 560)
  10   grid        for pc of (st.s >= 0.999 ? imgGrid : morphGrid): the same call as above (colour by pc.family)
  20   fill        sector only, and only if the main piece is closed: drawPolygonFill(ctx, plane, pieces[0].points, { color: '--output', alpha: 0.12 })
  90   extras      the pieces of imgExtras / morphExtras in '--output' (or the morph blend colour), thin
  100  stroke      the pool of 5.1.4 over (st.s >= 0.999 ? imgStroke : morphStroke), colour '--output' when s >= 0.999 else mixColor(cssVar('--input'), cssVar('--output'), s), width 3, ramp, dots, arrow
  200  overlays    if (st.s >= 0.999 && !s.zero) { if (line) drawCartAddress(ctx, plane, s.wPolar); drawPolarAddress(ctx, plane, s.wPolar, { ghosts: up, ghostsNeg: down, name: 'w' }) }
                   drawSeam(ctx, plane, Math.PI); then the edge arrow of 5.1.7 for the position of `q`
```
`syncCurves()` calls `zStroke.update(stroke.points)` and `zStroke.set({ closed: stroke.closed })`, then `syncPool(...)`, then sets the visibility of `powermap-wnote` from `anyInView` and the text of the morph help.
Theme change: recompute the blend colour (`syncCurves()`), `explainer.update(lastState)`, `plane.requestDraw()` on both planes.

**5.2.11 Flush.**
```
computeImages(clamp):       // also sets f; publishHooks() at the end
  f = (z) => pow(z, st.n); o = { clampRadius: clamp }; usedClamp = clamp
  imgStroke = pushForward(stroke, f, o); imgExtras = pushForwardAll(extras, f, o); imgGrid = pushForwardAll(zGrid, f, o); publishHooks()

flush():
  if (dead) return
  try {
    if (dirty.stroke) { buildStroke(); dirty.stroke = false; dirty.images = true; dirty.morph = true; dirty.probe = true }
    if (dirty.grid)   { zGrid = gridFor(st.grid); dirty.grid = false; dirty.images = true; dirty.morph = true }
    if (dirty.view)   { fitW(); dirty.view = false }
    clampNow = clampFor(wplane.getView(), wplane.getSize())
    if (clampNow !== usedClamp) { dirty.images = true; dirty.morph = true }
    if (dirty.images) { computeImages(clampNow)
                        if (!anyInView(imgStroke, wplane.getView(), wplane.getSize())) {        // the image left the plane: refit once, then recompute
                          fitW(); clampNow = clampFor(wplane.getView(), wplane.getSize()); computeImages(clampNow) }
                        dirty.images = false }
    if (dirty.morph)  { if (st.s < 0.999) { o = { clampRadius: usedClamp }; morphStroke = morph(stroke, st.s, f, o); morphExtras = extras.flatMap((c) => morph(c, st.s, f, o)); morphGrid = zGrid.flatMap((c) => morph(c, st.s, f, o)) }
                        dirty.morph = false }
    syncCurves(); syncProbe()          // derive → handles (silent), readout, fact, t output, explainer, staircase, hooks.powermapMorph
    zplane.requestDraw(); wplane.requestDraw()
  } catch (err) { fail(err) }          // console.error once, show #powermap-error
```
`dirty.morph` is also set by every change of `st.s`. At `s = 0` `morph(curve, 0, f)` returns a copy of the input without calling `f`, so the w-plane shows the unmapped shape.
Events: `n` slider → `st.n = +value; dirty.images = dirty.morph = dirty.view = dirty.probe = true` (the stroke itself is unchanged), `flushNow()`. Input chips → `st.input`, `st.t` = 0.625 or 0.5, `dirty.stroke = dirty.view = true`, show/hide handles, `renderProblem`, `setRows`. Grid chips → `st.grid`, `dirty.grid = true`. Morph slider → `st.s`, `dirty.morph = true`, `schedule()`.

### 5.3 reciprocal

**5.3.1 Presets.** `PRESETS` of 4.2. `presetFor(preset)`:
```
if (!preset) return state('circle1')
problem: id === '2.5.1' → state('circle1');   topic: 'T2.5' → state('circle1')
token:   t = String(preset.token).toLowerCase(); ['circle1', 'line', 'circle0', 'unit'].includes(t) → state(t);   ['invert', 'mirror', 'both'].includes(t) → { ...state('circle1'), stage: t }
state(key) = { preset: key, shape: deepcopy(PRESETS[key].shape), probe: deepcopy(PRESETS[key].probe), stage: 'both', s: 1, turn: 0, playing: false, turning: false }
```
Any drag of `c`, `r`, `a` or `b` sets `st.preset = 'custom'`. Clicking a preset chip loads `state(key)` but keeps the current `stage`, `s` and `turn`.

**5.3.2 The stroke.**
```
strokeOf(shape, clamp):
  if (shape.kind === 'circle') {
    base = circle(shape.c, shape.r, { n: 128 })                                    // t = angle/(2π), counter-clockwise from angle 0, closed
    zOf  = (t) => ({ re: shape.c.re + shape.r * Math.cos(2*Math.PI*t), im: shape.c.im + shape.r * Math.sin(2*Math.PI*t) })
  } else {
    a = shape.a; b = shape.b
    d = { re: b.re - a.re, im: b.im - a.im }; L = Math.hypot(d.re, d.im); u = { re: d.re / L, im: d.im / L }
    m = { re: a.re - (a.re*u.re + a.im*u.im) * u.re, im: a.im - (a.re*u.re + a.im*u.im) * u.im }     // the point of the line nearest 0
    P0 = { re: m.re - 8*u.re, im: m.im - 8*u.im }; P1 = { re: m.re + 8*u.re, im: m.im + 8*u.im }
    base = segment(P0, P1, { n: 128 })                                              // t = (s + 8)/16
    zOf  = (t) => ({ re: P0.re + (P1.re - P0.re)*t, im: P0.im + (P1.im - P0.im)*t })
  }
  pts = refineSamples(zOf, base.points, inv, { clamp, maxStep: 1, maxDepth: 12 })
  if (base.closed) pts[pts.length - 1] = { re: pts[0].re, im: pts[0].im, t: 1 }     // a closed curve keeps an exact copy of its first point
  return { curve: { ...base, points: pts, id: 'shape' }, zOf }
```

**5.3.3 `refineSamples(zOf, base, f, { clamp, maxStep = 1, maxDepth = 12 })`** (D6: this is what makes A4 hold).
```
evalAt(t): z = zOf(t); w = f(z); return { t, z, w, ok: Number.isFinite(w.re) && Number.isFinite(w.im) }
mag(p):    p.ok ? Math.hypot(p.w.re, p.w.im) : Infinity
out = [ evalAt(base[0].t) ]
prev = out[0]
for (i = 1; i < base.length; i++) { next = evalAt(base[i].t); bisect(prev, next, 0); prev = next }
bisect(a, b, depth):
  dist    = (a.ok && b.ok) ? Math.hypot(a.w.re - b.w.re, a.w.im - b.w.im) : (a.ok || b.ok) ? Infinity : 0
  bothFar = mag(a) > 1.5 * clamp && mag(b) > 1.5 * clamp
  if (depth < maxDepth && !bothFar && dist > maxStep) { m = evalAt((a.t + b.t) / 2); bisect(a, m, depth + 1); bisect(m, b, depth + 1) }
  else out.push(b)
return out.map((p) => ({ re: p.z.re, im: p.z.im, t: p.t }))
```
Measured with the real engine and `clamp = 64`: circle `|z - 1| = 1`: 393 points in, 2 pieces out (147 points each, `t` in [0, 0.4975] and [0.5025, 1]), largest step 0.983, `|Re w - 0.5|` at most 1.7e-13; circle `|z - (0.6 + 0.8i)| = 1`: 2 pieces, largest step 0.996; line through 0: 2 pieces, 0.989; circles that miss 0 (including `|z| = 1`, `|z - 1.5| = 0.5`, and a circle at distance 0.05 from 0): 1 closed piece, largest step at most 0.93, and no extra points at all for the first two. The recursion depth is at most 12, so the work is bounded (about 260 extra points for the preset circle).

**5.3.4 Descriptions (derived from the geometry, never typed per preset).**
```
describeShape(shape):
  circle: c = shape.c, r = fmtNum(shape.r)
          |c| < 1e-9 → `circle |z| = ${r}`
          c.im === 0 → c.re > 0 ? `circle |z - ${fmtNum(c.re)}| = ${r}` : `circle |z + ${fmtNum(-c.re)}| = ${r}`
          c.re === 0 → c.im > 0 ? `circle |z - ${fmtCart(c)}| = ${r}` : `circle |z + ${fmtCart({ re: 0, im: -c.im })}| = ${r}`
          otherwise  → `circle |z - (${fmtCart(c)})| = ${r}`
  line:   |a.re - b.re| < 1e-9 → `line Re z = ${fmtNum(a.re)}`;  |a.im - b.im| < 1e-9 → `line Im z = ${fmtNum(a.im)}`;  else `line through ${fmtCart(a)} and ${fmtCart(b)}`
describeImage(shape):
  circle: c, r;  D = c.re² + c.im² - r²
    |D| < 1e-9 * Math.max(1, r*r)  →  through 0, so the image is a LINE:   Re(c w) = c.re u - c.im v = 1/2
         |c.im| < 1e-9 → text `line Re w = ${fmtNum(0.5 / c.re)}`
         |c.re| < 1e-9 → text `line Im w = ${fmtNum(-0.5 / c.im)}`
         else          → text `line ${fmtNum(c.re)}u ${c.im < 0 ? '+' : '-'} ${fmtNum(Math.abs(c.im))}v = 0.5`
         return { kind: 'line', text, cx: c.re, cy: c.im, rhs: 0.5 }
    else → a CIRCLE:  m = { re: c.re / D, im: -c.im / D },  R = r / Math.abs(D)
         text = |m| < 1e-9 ? `circle |w| = ${fmtNum(R)}` : `circle center ${fmtCart(m)}, radius ${fmtNum(R)}`
         return { kind: 'circle', text, m, R }
  line (a, b):  u = (b - a)/|b - a|;  cross = a.re*u.im - a.im*u.re                  // signed distance from 0 to the line
    |cross| < 1e-9 → through 0: image is the line through 0 with direction conj(u), angle psi = Arg(conj u) reduced into (-π/2, π/2] by adding or subtracting π
         text: psi = 0 → 'line through 0 (the real axis)';  |psi - π/2| < 1e-9 → 'line through 0 (the imaginary axis)';  else `line through 0, angle ${angText(psi)}`
         return { kind: 'line0', text, psi }
    else → n = (-u.im, u.re); d = a.re*n.re + a.im*n.im; if (d < 0) { n = -n; d = -d }       // unit normal pointing from 0 to the line, h = d > 0
         m = { re: n.re / (2d), im: -n.im / (2d) } (= conj(n)/(2h)),  R = 1/(2d)
         text `circle through 0, center ${fmtCart(m)}, radius ${fmtNum(R)}`;  return { kind: 'circle', text, m, R, through0: true }
imageResidual(shape, w):
  line:   |c.re*w.re - c.im*w.im - 0.5| / |c|
  circle: | |w - m| - R |
  line0:  | w.re*sin(psi) - w.im*cos(psi) |
isThroughOrigin(shape) = describeImage(shape).kind === 'line' || (line shape && describeImage(shape).kind === 'line0')
nearHint(shape): circle only: D = |c|² - r²; 0 < |D| (above the tolerance) && |D| < 0.3 * Math.max(1, r*r)
```
Expected strings are in 6.4 and in unit test U21.

**5.3.5 The probe.**
```
probeOf(shape, probe):  circle → { z: { re: c.re + r*Math.cos(probe.phi), im: c.im + r*Math.sin(probe.phi) }, t: probe.phi / (2π) }
                        line   → { z: { re: m.re + probe.s*u.re, im: m.im + probe.s*u.im }, t: (probe.s + 8) / 16 }
snapProbe(shape, z):    circle → k = Math.round(Math.atan2(z.im - c.im, z.re - c.re) / (π/72));  phi = ((k*π/72) % (2π) + 2π) % (2π);  return { phi }
                        line   → s = (z.re - m.re)*u.re + (z.im - m.im)*u.im;  return { s: Math.max(-8, Math.min(8, Number((Math.round(s / 0.1) * 0.1).toFixed(1)))) }
handle p: reciprocal.addPoint({ id: 'p', z: probeOf(...).z, color: '--input', label: 'p', name: 'Probe p', radius: 7, step: 0.1,
            snap: (z) => probeOf(st.shape, snapProbe(st.shape, z)).z,
            onDrag: (z, info) => { stopPlay(); st.probe = snapProbe(st.shape, z); dirty.probe = true; info.final ? flushNow() : schedule() } })
```
`p` is added **last** (on top). The shape handles are added first: `c`, `r` (circle) or `a`, `b` (line), and are shown or hidden by shape kind.
```
c handle:  snap: (z) => ({ re: clamp3(snapGrid(z.re)), im: clamp3(snapGrid(z.im)) });  onDrag: set shape.c; move `r` silently to c + r e^{i bearing}; preset = 'custom'; dirty.shape = true
r handle:  at c + r e^{i bearing};  snap: (z) => { d = z - c; r2 = Math.max(0.1, Math.min(3, snapGrid(|d|))); ang = atan2(d.im, d.re); return c + r2 e^{i ang} };  onDrag: shape.r = |z - c|; shape.bearing = atan2(z - c); preset = 'custom'
a, b handles: snap: snapGrid on both parts, clamped to [-3, 3];  onDrag: set the point, but if the new a and b are closer than 0.1 refuse (silent-restore the old position);  preset = 'custom'
snapGrid(x) = Number((Math.round(x / 0.1) * 0.1).toFixed(1)); clamp3(x) = Math.max(-3, Math.min(3, x))
```
The probe keeps its `phi` or `s` when the shape changes (it follows the shape).

**5.3.6 Images and stages.**
```
computeImages(clamp):
  usedClamp = clamp; { curve, zOf } = strokeOf(st.shape, clamp); stroke = curve
  final    = pushForward(stroke, inv, { clampRadius: clamp })               // pieces of 1/z
  inverted = pushForward(stroke, invertPoint, { clampRadius: clamp })       // pieces of z/|z|² (stage 1)
  publishHooks()    // reciprocalImage = flatten(final, true); reciprocalStages = { stage, inverted, final }; reciprocalMorph = { s, stage, pieces } is refreshed by syncPools()
invertPoint(z): d = z.re² + z.im²; return { re: z.re / d, im: z.im / d }      // {NaN, NaN} at 0 (0/0)
mirrorPoint(z): { re: z.re, im: -z.im }
```
Pools on the w-plane: `finPool` and `invPool` (5.1.4). Styles by stage:
```
stage 'invert': invPool  { color: '--output', width: 3,   alpha: 1,    dots: true,  arrow: true,  ramp: true }      finPool hidden
stage 'mirror': invPool  { color: '--output', width: 2,   alpha: 0.45, dots: false, arrow: false, ramp: true }      finPool { color: '--output', width: 3, alpha: 1, dots: true, arrow: true, ramp: true }
stage 'both'  : invPool  { color: '--output', width: 1.5, alpha: 0.3,  dots: false, arrow: false, ramp: true, dash: DASH.guide }   finPool as in 'mirror'
```
**Morph (D13).** The stage decides what is morphed and by which map:
```
invert: input [stroke],           f = invertPoint
mirror: input = the `inverted` pieces,   f = mirrorPoint
both:   input [stroke],           f = inv
computeMorph()       // only when st.s < 0.999; o = { clampRadius: usedClamp }
  morphPieces = st.stage === 'mirror' ? inverted.flatMap((pc) => morph(pc, st.s, mirrorPoint, o))
                                      : morph(stroke, st.s, st.stage === 'invert' ? invertPoint : inv, o)
st.s < 0.999:  invPool hidden;  finPool shows morphPieces with { color: mixColor(cssVar('--input'), cssVar('--output'), st.s), width: 3, alpha: 1, dots: true, arrow: true, ramp: true }.
               The unit circle, the mirror line and the labels keep their stage styles; the connectors, the ghost dot, the polar address of the image and the edge arrow are skipped.
pDraw (the dot that follows the probe on the w-plane) = morphPoint(start, end, st.s) with (start, end) = (p, j(p)) for invert, (j(p), 1/p) for mirror, (p, 1/p) for both.
  At s = 1 it is j(p), 1/p, 1/p. The `q` handle sits at pDraw (hidden for invert, where the overlay draws the dot instead, and at p = 0).
At s = 0, `morph` returns a copy of its input without calling f: the w-plane shows the unmapped stroke (invert, both) or the stage-1 image (mirror).
```
At s = 0.5 the mirror morph is edge-on (the vertical line collapses to the point 0.5), which the help text says; `morph` may report a few tiny pieces there and that is fine.

Layers:
```
z-plane (id 'reciprocal-zplane', range [-3, 3] squared, grid 'cart', axisLabels ['x', 'y'], ariaLabel 'z-plane, the input')
  10   unit circle: drawCircle(ctx, plane, { re: 0, im: 0 }, 1, { color: '--polar', dash: DASH.guide, width: 1.5, alpha: stage === 'invert' ? 0.9 : 0.35 })
  100  zStroke = plane.addCurve({ id: 'shape', color: '--input', width: 3, ramp: true, dots: true, arrow: true, closed: stroke.closed })
  200  overlays: drawPolarAddress(ctx, plane, pz, { ghosts: 1, name: 'p' }) (not at p = 0); drawSeam(ctx, plane, Math.PI)
w-plane (id 'reciprocal-wplane', range [-3, 3] squared, grid 'cart', axisLabels ['u', 'v'], ariaLabel 'w-plane, the output')
  10   unit circle: drawCircle(..., { color: '--polar', dash: DASH.guide, width: stage === 'invert' ? 2.5 : 1.5, alpha: stage === 'invert' ? 1 : 0.35 })
       with stage 'invert' the label drawLabel(ctx, plane, { re: -0.75, im: 0.75 }, 'circle of inversion', { color: '--polar' })
  20   stage 'mirror': mirror line: drawSegment(ctx, plane, { re: view.center.re - H, im: 0 }, { re: view.center.re + H, im: 0 }, { color: '--cart', dash: DASH.cart, width: 2 }) with H = view.unitsAcross, plus drawLabel(..., 'mirror (real axis)')
  90   stage 'mirror' and 'both', s >= 0.999: connectors drawSegment(j(z_t), 1/z_t) for the probe, and for t = 1/8, 3/8, 5/8, 7/8 in stage 'mirror' (z_t = pointOnPieces of the stroke; skip a t whose point is in a gap or out of the clamp)
  100  pools as above
  200  overlays: stage 'invert': dot at pDraw (drawDot, '--output', label 'j(p)') and, when s >= 0.999, drawPolarAddress(ctx, plane, jp, { ghosts: 1, name: 'j(p)' });
                stage 'mirror' / 'both' (and only when s >= 0.999): hollow ghost dot at j(p) (drawDot with halo, alpha 0.5), drawPolarAddress(ctx, plane, wDraw, { ghosts: 1, name: '1/p' }); the edge arrow for 1/p when it is off the plane;
                drawSeam(ctx, plane, Math.PI)
  handle q ('1/p'): hidden when stage === 'invert' or p = 0; position pDraw (at s = 1 for mirror and both: wDraw = fromPolar(1/r, wrapArg(-theta)), so Arg(1/p) is never -π by float noise)
```
The `viewchange` handler of the w-plane compares `clampFor` with `usedClamp` (5.1.2) and recomputes the images when it changed; it also refreshes `reciprocal-wnote` (`anyInView` over the pieces of the visible stage).

**5.3.7 Explainer (id `reciprocal-ex`).** State: `{ p, zero, r, theta, jz, mz, w, rho, phi, shape, img }` where `jz = invertPoint(p)`, `mz = mirrorPoint(jz)`, `w = inv(p)`, `rho = 1/r`, `phi = wrapArg(-theta)`, `img = describeImage(shape)`; `zero` is `|p| < 1e-9`.
```
 p    label 'p, the probe'
      cart:  cart(`p = ${fmtCart(s.p)}`)           polar: s.zero ? { text: 'p = 0.' } : polar(`p = ${TX(s.r, s.theta)}\\ (\\theta = \\Arg p)`)
 inv  label 'Stage 1: invert'  native: 'polar'
      cart:  s.zero ? NOINF : cart(`\\dfrac{p}{|p|^2} = \\dfrac{x + iy}{x^2 + y^2} = ${fmtCart(s.jz)}`)
      polar: s.zero ? NOINF : polar(`\\dfrac{1}{r}e^{i\\theta} = ${TX(1 / s.r, s.theta)}`)
 mir  label 'Stage 2: mirror'
      cart:  s.zero ? NOINF : cart(`\\overline{${fmtCart(s.jz)}} = ${fmtCart(s.mz)}`)
      polar: s.zero ? NOINF : polar(`e^{i\\theta} \\to e^{-i\\theta}:\\ ${TX(1 / s.r, -s.theta)}`)
 w    label '1/p'  native: 'polar'
      cart:  s.zero ? NOINF : cart(`\\dfrac{1}{p} = \\dfrac{x - iy}{x^2 + y^2} = ${fmtCart(s.w)}`)
      polar: s.zero ? NOINF : polar(`\\dfrac{1}{r}e^{-i\\theta} = ${TX(s.rho, s.phi)}\\ (\\Arg(1/p) = ${fmtNum(s.phi)})`)
 img  label 'On the image?'
      s.zero → both cells NOINF
      img.kind 'line':   cart:  cart(`c_x u - c_y v = ${fmtNum(c.re*s.w.re - c.im*s.w.im)}\\ (= 0.5)`)
                         polar: polar(`|c|\\,\\rho\\cos(\\varphi + \\alpha) = ${fmtNum(abs(c) * s.rho * Math.cos(s.phi + Arg(c)))}\\ (= 0.5)`)         // c = shape.c, α = Arg c
      img.kind 'circle': cart:  cart(`|w - m| = ${fmtNum(abs(sub(s.w, m)))}\\ (R = ${fmtNum(R)})`)
                         polar: |m| < 1e-9 ? polar(`\\rho = ${fmtNum(s.rho)}\\ (R = ${fmtNum(R)})`)
                                           : polar(`\\rho^2 - 2\\rho|m|\\cos(\\varphi - \\mu) + |m|^2 = ${fmtNum(s.rho**2 - 2*s.rho*abs(m)*Math.cos(s.phi - Arg(m)) + abs(m)**2)}\\ (R^2 = ${fmtNum(R*R)})`)    // μ = Arg m
      img.kind 'line0':  cart:  cart(`u\\sin\\psi - v\\cos\\psi = ${fmtNum(s.w.re*Math.sin(psi) - s.w.im*Math.cos(psi))}\\ (= 0)`)
                         polar: polar(`\\sin(\\varphi - \\psi) = ${fmtNum(Math.sin(s.phi - psi))}\\ (= 0)`)
 same: (s) => s.zero ? { cart: { text: '∞' }, polar: { text: '∞' }, agree: null } : { cart: cart(fmtCart(s.w)), polar: polar(TX(s.rho, s.phi)), agree: eq(s.w, fromPolar(s.rho, s.phi), 1e-9 * Math.max(1, s.rho)) }
NOINF = { text: 'p = 0 goes to the point at infinity: there is no finite point to show.' }
```
(`inv` and `w` are marked easy in polar: length to 1/r, angle to −θ. `mir` carries no badge: negating v and negating θ are equally easy.) `TX` is the helper of 5.2.8, typed into this file too. With `agree: null` the explainer footer reads "not checked".

**5.3.8 Edge arrow and overlays.** `edgeIndicator` of 5.1.7, applied to `wplane.toPixel(w)` with inset 14; skipped when p = 0 (direction unknown) or in stage 'invert' (|j(p)| = 1/r is shown as a dot).

**5.3.9 The sphere.**
```
buildSphere():
  host.textContent = ''                                              // remove "Loading the sphere..."
  view = createView3D(host, { background: '--surface', cameraPosition: [2.6, 2.4, 3.4], grid: false, axes: false, label: 'Riemann sphere, 3D view', hint: true })
  if (view.unavailable) { turnSlider.disabled = playBtn.disabled = true; note.textContent = 'This browser cannot draw the 3D sphere. The two planes above show the same map.'; mv.reciprocalSphere = { turn: 0, available: false }; return }
  sphere = riemannSphere({ radius: 1 }); view.add(sphere.group); sphere.markInfinity(true); sphere.showAxis(true); view.fitTo(sphere.group, { padding: 1.0 })
  markerZ = createMarker({ color: '--input', radius: 0.045 }); markerW = createMarker({ color: '--output', radius: 0.045 }); view.add(markerZ); view.add(markerW)
  staticLine = curveToLine([], '--input'); view.add(staticLine); turning = null
updateSphere():                                                       // from flush, only when the shape changed (dirty.sphere), at most once per frame
  staticLine.userData.update(sphereTriples(stroke.points, 1.008))
  sphere.clearCurves(); turning = sphere.addCurve(stroke.points, '--output')        // the INPUT points: turning them by π gives the image
  applyTurn()
applyTurn():
  a = Math.PI * st.turn
  turning.visible = st.turn > 0.001; sphere.setHalfTurn(a)
  probeZ = probeOf(st.shape, st.probe).z;  P = stereographic(probeZ); markerZ.userData.setPosition(P.map((x) => 1.01 * x)); markerW.userData.setPosition(rotateMaths(P, a).map((x) => 1.01 * x))
rotateMaths([X, Y, Z], a) = [X, Y*Math.cos(a) - Z*Math.sin(a), Y*Math.sin(a) + Z*Math.cos(a)]
sphereTriples(points, lift) = points.map((p) => { S = stereographic(p); return [lift*S[0], lift*S[1], lift*S[2]] })
slider: input → st.turn = +value; applyTurn(); output text `${Math.round(180*st.turn)} degrees`
button: reduced motion → st.turn = st.turn < 0.5 ? 1 : 0 (jump); else dir = st.turn < 0.5 ? 1 : -1; start = st.turn; animate(3000, (u) => { st.turn = start + dir*u (clamped to [0, 1]); slider.value = st.turn; applyTurn() })
```
The turning copy carries the time ramp and dots; at 180 degrees it lies on the image. At p = 0 the marker `markerZ` is at the south pole and `markerW` at the north pole at 180 degrees.
`mv.reciprocalSphere = { turn: st.turn, available: true }` is refreshed in `applyTurn`.

**5.3.10 Lab request.**
```
labRequest(st):
  fn = 'recip'
  shapes = circle → [{ kind: 'circle', center: shape.c, r: shape.r }];  line → [{ kind: 'segment', a: P0, b: P1 }]  (the stroke ends of 5.3.2)
  problem = st.preset === 'circle1' ? '2.5.1' : null;  return { fn, shapes, view: 'side', problem, predictFirst: false }
```

**5.3.11 Flush, play, events.**
```
flush():
  if (dead) return
  try {
    clampNow = clampFor(wplane.getView(), wplane.getSize())
    if (dirty.shape || clampNow !== usedClamp) { computeImages(clampNow); dirty.shape = false; dirty.sphere = true; dirty.morph = true }
    if (dirty.morph) { if (st.s < 0.999) computeMorph(); dirty.morph = false }
    syncPools(); syncProbe()                      // probe numbers, handles (silent), readout, near hint, explainer, wnote, hooks
    if (dirty.sphere && sphere) { updateSphere(); dirty.sphere = false } else if (sphere) applyTurn()
    zplane.requestDraw(); wplane.requestDraw()
  } catch (err) { fail(err) }
play (probe): reduced motion → circle: phi += π/12; line: s += 1 (wrap past the end to the start), flushNow();
              else animate(8000, (u) => { circle: phi = phi0 + 2π u;  line: s = -8 + 16 u; st.probe = ...; dirty.probe = true; flush() }); the button reads "Pause" until it ends; any drag, preset or stage click stops it
stage chips: st.stage = key; update aria-pressed, the stage note, the morph help, the w caption, dirty.morph = dirty.probe = true, flushNow()
morph slider: st.s = +value; dirty.morph = dirty.probe = true; schedule(); output text `s = ${fmtNum(st.s)}`, aria-valuetext the same
preset chips: st = { ...state(key), stage: st.stage, s: st.s, turn: st.turn }; show/hide handles; dirty.shape = dirty.probe = true; flushNow(); renderProblem note
```

---
## 6. Mathematics

Every number below was recomputed in Node against `complex.js` and `mapping.js` (scratch prototype), not only by hand. Angles are radians; `Arg` is in (-π, π]. These are the unit-test expectations of section 7.

### 6.1 Formulas used

| # | Formula | Used for |
|---|---|---|
| F1 | z = x + iy = r e^{iθ}, r = √(x² + y²), θ = Arg z, x = r cos θ, y = r sin θ | both stations, every row |
| F2 | (x + iy)^n = Σ_k C(n,k) x^{n−k} (iy)^k, so u = Σ_{k even} (−1)^{k/2} C(n,k) x^{n−k} y^k and v = Σ_{k odd} (−1)^{(k−1)/2} C(n,k) x^{n−k} y^k | `cartesianExpansion`, explainer rows u and v |
| F3 | z^n = r^n e^{inθ}: ρ = r^n, and nθ is *one name* of arg w; Arg w = wrapArg(nθ) = nθ − 2πk, k = round((nθ − Arg w)/(2π)) | explainer, staircase, ghost windings |
| F4 | Line x = c under z²: u = c² − y², v = 2cy; eliminating y = v/(2c): u = c² − v²/(4c²) (c ≠ 0); focus 0, directrix u = 2c², vertex c²; polar: ρ(1 + cos φ) = 2c², i.e. ρ + u = 2c² | 2.1.2, `lineReadout`, `lineFact` |
| F5 | Line y = d under z²: u = v²/(4d²) − d²; the families x = c and y = d meet at right angles (z² is conformal where 2z ≠ 0) | grid note |
| F6 | Line x = c under z^n, polar: r = c sec θ, so ρ = c^n sec^n θ and φ = nθ: ρ cos^n(φ/n) = c^n with φ the *unreduced* name nθ | explainer row "On the curve?" for n ≥ 3 |
| F7 | Sector a < arg z < b under z^n is the sector n a < arg w < n b of opening n(b − a); it overlaps itself exactly when n(b − a) > 2π | 2.2.1, `sectorReadout`, `overlaps` |
| F8 | 1/z = z̄/|z|² = (x − iy)/(x² + y²) = (1/r) e^{−iθ}; stage 1 j(z) = z/|z|² = (1/r) e^{iθ}; stage 2 conj; 1/z = conj(j(z)) | 2.5.1, explainer |
| F9 | Circle |z − c| = r, D = |c|² − r². D ≠ 0: image is the circle with centre conj(c)/D and radius r/\|D\|. D = 0: image is the line Re(c w) = c_x u − c_y v = 1/2 | `describeImage` |
| F10 | Line through a, b, u = (b − a)/\|b − a\|, n = ± i u the unit normal pointing from 0 to the line, h = distance from 0 to the line. h > 0: image is the circle with centre conj(n)/(2h), radius 1/(2h), through 0. h = 0: image is the line through 0 with direction conj(u) | `describeImage` |
| F11 | Stereographic projection (x, y) ↦ (2x, 2y, \|z\|² − 1)/(\|z\|² + 1); 0 ↦ south pole, ∞ ↦ north pole, unit circle ↦ equator. Stage 1 is (X, Y, Z) ↦ (X, Y, −Z) (reflect in the equator), stage 2 is (X, Y, Z) ↦ (X, −Y, Z), and 1/z is their composition (X, Y, Z) ↦ (X, −Y, −Z): the half-turn about the axis through 1 and −1. The turn by angle a about that axis is (X, Y, Z) ↦ (X, Y cos a − Z sin a, Y sin a + Z cos a) | sphere |

### 6.2 Problem 2.1.2: the image of x = 2 under w = z² (n = 2, c = 2, easiest in Cartesian)

**Cartesian (slide), with y as the clock.**
1. The line is z(y) = 2 + iy. The station draws −4 ≤ y ≤ 4 and sets t = (y + 4)/8.
2. z² = (2 + iy)² = 4 + 4iy + i²y² = (4 − y²) + i(4y). So u = 4 − y² and v = 4y.
3. Eliminate the clock: y = v/4, so **u = 4 − v²/16**. Every real v is reached (y runs over ℝ), so the image is the whole parabola.
4. It is a parabola with vertex (4, 0) (y = 0, z = 2, w = 4) opening toward −u, crossing the v axis at v = ±8 (y = ±2, w = ±8i). Writing v² = −16(u − 4) = 4p(u − 4) with p = −4 puts the focus at (4 + p, 0) = **0** and the directrix at u = 4 − p = **8**.

**Polar (spin-and-stretch).**
1. On x = 2: r cos θ = 2, so r = 2 sec θ for θ in (−π/2, π/2).
2. z² has length ρ = r² = 4 sec²θ and angle φ = 2θ. For this θ range φ lies in (−π, π), so 2θ *is* Arg w here (no wrapping).
3. cos φ = 2cos²θ − 1, so cos²θ = (1 + cos φ)/2 and ρ = 8/(1 + cos φ): **ρ(1 + cos φ) = 8**.
4. ρ cos φ = u, so ρ + u = 8, that is ρ = 8 − u: the distance from w to 0 equals the distance from w to the line u = 8. That is a parabola with focus 0 and directrix u = 8 (vertex u = 4). Squaring, u² + v² = 64 − 16u + u², so v² = 64 − 16u and u = 4 − v²/16, the same curve.
5. General c: ρ(1 + cos φ) = 2c² and u = c² − v²/(4c²), focus 0, directrix u = 2c², vertex c².

**Which address is easy.** Cartesian: put z = 2 + iy, square, eliminate y (two lines). Polar gives the focus for free but needs sec θ and a half-angle identity. For n ≥ 3 the Cartesian elimination is a degree-n polynomial in y, while polar stays one line: ρ cos^n(φ/n) = c^n (with φ = nθ).

**Hand-checked numbers (c = 2, n = 2; w = z²; the last two columns must both hold).**

| y | z | w | u = 4 − v²/16 | \|w\| | \|w\| + u (= 8) |
|---|---|---|---|---|---|
| −4 | 2 − 4i | −12 − 16i | −12 | 20 | 8 |
| −3 | 2 − 3i | −5 − 12i | −5 | 13 | 8 |
| 0 | 2 | 4 | 4 | 4 | 8 |
| **1** | **2 + i** | **3 + 4i** | 3 | 5 | 8 |
| 2 | 2 + 2i | 8i | 0 | 8 | 8 |
| 3 | 2 + 3i | −5 + 12i | −5 | 13 | 8 |
| 4 | 2 + 4i | −12 + 16i | −12 | 20 | 8 |

At z = 2 + i: r = √5 = 2.236, θ = Arg z = atan(1/2) = 0.4636476, ρ = 5, φ = 2θ = 0.9272952, cos φ = 0.6, ρ(1 + cos φ) = 5 × 1.6 = 8 = 2c². Other c: c = 1: z = 1 + i, z² = 2i, u = 1 − 4/4 = 0 (the curve is u = 1 − v²/4, vertex 1, directrix 2); c = 1.5: z = 1.5 + i, z² = 1.25 + 3i, u = 2.25 − 9/9 = 1.25 (curve u = 2.25 − v²/9).
Right angles: the images of x = 2 and y = 1 cross at w = 3 + 4i with tangents d/dy (2 + iy)² = 2i(2 + iy) = −2 + 4i and d/dx (x + i)² = 2(x + i) = 4 + 2i; their dot product is (−2)(4) + (4)(2) = 0.
Two-to-one: z and −z have the same square, so x = −2 gives the same parabola (run the other way); `c = -2` reads `x = -2; image: u = 4 - v²/16; ...`. c = 0: z = iy, z² = −y²: the negative real axis, covered twice.

### 6.3 Problem 2.2.1: the image of 0 < arg z < π/4 under w = z³ (n = 3, a = 0, b = π/4, easiest in polar)

**Polar.** z = r e^{iθ} with r > 0 and 0 < θ < π/4 goes to z³ = r³ e^{i3θ}: the length ρ = r³ takes every positive value and the angle φ = 3θ takes every value in (0, 3π/4). Since 3π/4 < 2π nothing wraps and nothing overlaps: the image is exactly the open sector **0 < arg w < 3π/4**, three times as wide.
**Cartesian.** z³ = (x³ − 3xy²) + i(3x²y − y³). The sector is {0 < y < x}. Its edge y = 0 (x > 0) goes to x³, the positive real axis. Its edge y = x goes to u = x³ − 3x³ = −2x³, v = 3x³ − x³ = 2x³, that is x³(−2 + 2i), the ray at 135° = 3π/4. The image of the sector is the wedge between those edges, {v > 0 and u + v > 0}, but you only know that after the edges are found.

**Hand-checked numbers.**
- Edge z = 1 + i (θ = π/4): z³ = (1 + i)(2i) = −2 + 2i, |w| = 2.828 = (√2)³, Arg w = 3π/4 = 2.356.
- Interior z = 1 + 0.5i (θ = 0.4636476 inside (0, 0.7854)): z² = 0.75 + i, z³ = 0.25 + 1.375i, |w| = 1.3975425 = (√1.25)³, Arg w = 1.3909428 = 3θ, inside (0, 2.356); v > 0 and u + v = 1.625 > 0.
- The default probe (arc middle, t = 0.5): z = 2.5 e^{iπ/8} = 2.310 + 0.957i, r = 2.5, θ = 0.393; w = 15.625 e^{i3π/8} = 5.979 + 14.436i (15.625 cos 67.5° = 5.979, 15.625 sin 67.5° = 14.436); nθ = 1.178 = Arg w, k = 0.
- The images of all 8 curves of `sector({ r1: 2.5, theta1: π/4 })` under z³ (488 points, clamp 200) have Arg in [0, 2.356194490192345] (the corner at 0 counts as 0).
- Opening vs n (a = 0, b = π/4): n = 2: π/2; 3: 3π/4; 4: π; 5: 5π/4; 6: 3π/2 (4.712). None overlaps. With b = π/2 and n = 6 the opening is 3π > 2π: z at θ and θ + π/3 have the same w (6 × π/3 = 2π), and both fit in (0, π/2), so it overlaps (`(overlaps itself)`). With b = π/3 and n = 6 the opening is exactly 2π: the whole plane except a ray, no overlap (readout `... 0 < arg w < 6.283 (2pi)` with no warning).
- Arg versus arg: n = 6, z = 1 + i: θ = π/4, nθ = 3π/2 = 4.712, w = (1 + i)⁶ = (2i)³ = −8i, |w| = 8 = (√2)⁶, **Arg w = −π/2**, so nθ = Arg w + 2π (k = 1). The staircase shows Arg w = −1.571 (−π/2) as the home row and 4.712 (3π/2) as the row k = 1; the w-plane draws one ghost winding. n = 6, θ = 0.6: nθ = 3.6, Arg w = 3.6 − 2π = −2.683185, k = 1. n = 6, θ = π/6: nθ = π, Arg w = π (the top of the window), k = 0; a little more and Arg w jumps to just above −π.

### 6.4 Problem 2.5.1 and the other presets: the image of |z − 1| = 1 under w = 1/z (easiest in polar)

**Cartesian.**
1. w = 1/z = z̄/|z|² = (x − iy)/(x² + y²).
2. On the circle (x − 1)² + y² = 1, so x² + y² = 2x. For every point with x ≠ 0 (that is z ≠ 0): u = x/(x² + y²) = x/(2x) = **1/2**, and v = −y/(2x).
3. With z = 1 + e^{iα}: x = 1 + cos α, y = sin α, v = −sin α/(2(1 + cos α)) = −(1/2) tan(α/2), which takes every real value as α runs over (−π, π). So the image is the whole line **Re w = 1/2**. The point z = 0 (α = π) has no finite image: it goes to ∞.
4. The same thing without coordinates: z = 1/w gives |1/w − 1| = 1, so |1 − w| = |w|: w is as far from 0 as from 1, so it lies on the perpendicular bisector Re w = 1/2.

**Polar.**
1. The circle is r = 2 cos θ for θ in (−π/2, π/2): z = 2 cos θ e^{iθ}.
2. 1/z sends length r to 1/r and angle θ to −θ: w = e^{−iθ}/(2 cos θ) = (cos θ − i sin θ)/(2 cos θ) = **1/2 − (i/2) tan θ**. The real part never moves.
3. In two stages: stage 1 gives (1/r) e^{iθ} = 1/2 + (i/2) tan θ (the same line, run upward), stage 2 mirrors it to 1/2 − (i/2) tan θ (run downward).

**Which address is easy.** Polar: two short lines, and the reason (0 goes to ∞) is visible. Cartesian needs x² + y² = 2x and a parametrisation of v.

**Hand-checked numbers.**

| θ | z = 2 cos θ e^{iθ} | stage 1: z/\|z\|² | 1/z | ½ − (i/2) tan θ |
|---|---|---|---|---|
| 0 | 2 | 0.5 | 0.5 | 0.5 |
| π/4 | 1 + i | 0.5 + 0.5i | 0.5 − 0.5i | 0.5 − 0.5i |
| π/3 | 0.5 + 0.866i | 0.5 + 0.866i | 0.5 − 0.866i | 0.5 − 0.866i |
| −π/4 | 1 − i | 0.5 − 0.5i | 0.5 + 0.5i | 0.5 + 0.5i |
| → π/2 | → 0 | → 0.5 + i∞ | → 0.5 − i∞ | |

(The z = 0.5 + 0.866i row has |z| = 1, so stage 1 leaves it where it is.) Time orientation with z(t) = 1 + e^{2πit}: t = 0 → 2, 1/4 → 1 + i, 1/2 → 0, 3/4 → 1 − i. The image is 0.5, 0.5 − 0.5i, (off the bottom), (back from the top), 0.5 + 0.5i, 0.5: the dark end of the ramp starts at 0.5, runs down off the plane, returns from the top and runs down to 0.5. Stage 1 runs up. `pointOnPieces(final, 0.5)` is `null` (the gap) and `pointOnPieces(final, 0.25)` is 0.5 − 0.5i.
The probe near 0 (snapped to 2.5 degrees on the circle, p = 1 + e^{iφ}, |p| = 2 cos(θ) with θ = φ/2): φ = 167.5° gives p = 0.0237 + 0.2164i (|p| = 0.2177), 1/p = 0.5 − 4.565i, |1/p| = 4.593; φ = 177.5°: |p| = 0.0436, 1/p = 0.5 − 22.915i, |1/p| = 22.920; φ = 180°: p = 0, readout `1/p = inf`. A pointer released at (0.02, 0.2) has bearing 168.47° from the centre (1, 0) and snaps to 167.5°.

**The four presets (what `describeImage` must return, and the readouts they produce at their default probe).**

| Preset | Shape | Image (derived) | Default readout |
|---|---|---|---|
| circle1 | circle, c = 1, r = 1 (through 0: D = 0) | `line Re w = 0.5` | `shape: circle \|z - 1\| = 1; image: line Re w = 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; \|1/p\| = 0.707` |
| line | line through 1 − 1.5i and 1 + 1.5i (Re z = 1; h = 1, n = 1) | `circle through 0, center 0.5, radius 0.5` | `shape: line Re z = 1; image: circle through 0, center 0.5, radius 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; \|1/p\| = 0.707` |
| circle0 | circle, c = 1.5, r = 0.5 (D = 2) | `circle center 0.75, radius 0.25` | `shape: circle \|z - 1.5\| = 0.5; image: circle center 0.75, radius 0.25; p = 1.5 + 0.5i; 1/p = 0.6 - 0.2i; \|1/p\| = 0.632` |
| unit | circle, c = 0, r = 1 (D = −1) | `circle \|w\| = 1` | `shape: circle \|z\| = 1; image: circle \|w\| = 1; p = i; 1/p = -i; \|1/p\| = 1` |

Checks: line preset, z = 1 + iy: 1/z = (1 − iy)/(1 + y²), u² + v² = 1/(1 + y²) = u, so (u − ½)² + v² = ¼. In polar it is r = sec θ, 1/z = cos θ e^{−iθ}, the circle ρ = cos φ. circle0: the real points 1 and 2 go to 1 and 1/2 and the image is symmetric about the real axis, so it has diameter [1/2, 1]; z = 1.5 + 0.5i gives 0.6 − 0.2i, and |0.6 − 0.2i − 0.75| = |−0.15 − 0.2i| = 0.25. unit: e^{iα} goes to e^{−iα}.
More derived descriptions (also pinned): `|z - i| = 1` (c = i, D = 0) gives `line Im w = -0.5`; `|z - (0.6 + 0.8i)| = 1` gives `line 0.6u - 0.8v = 0.5`; `|z + 1| = 1` gives `line Re w = -0.5`; `|z - 2| = 1` gives `circle center 0.667, radius 0.333`; `|z - 1.1| = 1` gives `circle center 5.238, radius 4.762` (and `nearHint` is true); `|z - (1 - i)| = 1` gives `circle center 1 + i, radius 1`; `|z + i| = 0.5` gives `circle center 1.333i, radius 0.667`; `|z| = 2` gives `circle |w| = 0.5`; `line Im z = 1` (through −1 + i and 1 + i) gives `circle through 0, center -0.5i, radius 0.5`; the line through −1 − i and 1 + i gives `line through 0, angle -0.785 (-pi/4)`; the real axis gives `line through 0 (the real axis)`; the imaginary axis `line through 0 (the imaginary axis)`; the line through 2 and 2i gives `circle through 0, center 0.25 - 0.25i, radius 0.354`.
`imageResidual` of the image of 361 stroke points of each of these shapes (points with |z| < 0.02 skipped) is at most 2.3e-15 (relative to max(1, |w|)).

### 6.4.5 The sphere (what the picture must obey)

Stereographic projection (F11). Checked values: z = 1 + i ↦ (2/3, 2/3, 1/3); 1/z = 0.5 − 0.5i ↦ (2/3, −2/3, −1/3), which is the half-turn `rotateMaths(P, π)` of the first. z = 2 − 0.5i ↦ (0.761905, −0.190476, 0.619048), 1/z ↦ (0.761905, 0.190476, −0.619048) = `rotateMaths(P, π)`. z = 0.3 + 0.7i ↦ (0.379747, 0.886076, −0.265823), 1/z ↦ (0.379747, −0.886076, 0.265823). z = 0 ↦ (0, 0, −1) and its half-turn is (0, 0, 1): the north pole, ∞. `rotateMaths([0, 1, 0], π/2) = [0, 0, 1]`: the point i swings up to ∞ on the way.
The two stages as reflections (checked at z = 0.6 + 0.5i, P = (0.7453, 0.6211, -0.2422)): inversion j(z) = z/|z|² gives (0.7453, 0.6211, +0.2422), so it flips Z only, a reflection in the equator (the unit circle); the mirror conj z gives (0.7453, -0.6211, -0.2422), so it flips Y only, a reflection in the great circle through the real axis. Applying both flips Y and Z: (X, Y, Z) becomes (X, -Y, -Z), the half-turn about the axis through 1 and -1. The formula `rotateMaths(P, a)` equals a THREE `Euler(a, 0, 0)` applied to the scene vector (X, Z, -Y) and read back as (x, -z, y), for a in {0, 0.7, π/2, π} (checked to 1e-12 for three points). The fixed points of the half-turn are z = ±1.

---
## 7. Verification plan

All commands run from the repo root. Screenshots go under `docs/review/iter-1/i1-station-powermap-reciprocal/` (ARCHITECTURE 10.8.4); the review reads them with the image-reading tool, desktop, phone and dark.

### 7.1 Acceptance criteria

| id | Command | Passing looks like |
|---|---|---|
| A1 | `node tools/smoke.mjs --route powermap,reciprocal,problem-2-1-2,problem-2-2-1,problem-2-5-1 --dark --wait 1500 --out docs/review/iter-1/i1-station-powermap-reciprocal/smoke` | exit code 0; 15 lines starting `ok` (5 routes x desktop, phone, desktop-dark) and the last line `15/15 checks passed across 5 route(s).`; no console error, page error, failed request, external request, router error panel or horizontal overflow. The router shows the station (not the under-construction panel) on every route. |
| A2 | `node tools/smoke.mjs --route problem-2-1-2 --script tests/interact/i1-station-powermap-reciprocal.mjs --dark --out docs/review/iter-1/i1-station-powermap-reciprocal/a2` | `3/3 checks passed across 1 route(s).` The script (7.3, steps P1 to P11) covers: readout `x = 2` / `u = 4 - v²/16` / `focus 0`; every `window.__mv.powermapImage` point within 1e-6 of u = 4 - v²/16; `dragHandle("powermap-zplane-line", {re:1, im:0})` gives `x = 1` and `u = 1 - v²/4`; after `#problem-2-2-1` the readout has `0 < arg z < 0.785` and `0 < arg w < 2.356` and every image point has Arg in [-1e-6, 3π/4 + 1e-6]; `setSlider("powermap-n", 6)` gives `4.712` and no `(overlaps`; `dragHandle("powermap-zplane-s1", {re:0, im:2})` gives `(overlaps itself)`. Also run `--route problem-2-2-1 --script ...` once (steps P7 to P10 alone). |
| A3 | the A2 run above, `ctx.shot("cart")` and `ctx.shot("polar")` at n = 2 (files `problem-2-1-2--desktop--cart.png`, `...--polar.png`, and the phone and dark variants) | `cart`: the w-plane shows two families of parabolas (blue) crossing at right angles, all opening toward −u or +u and sharing the focus 0, with the purple parabola u = 4 - v²/16 drawn in the dark-to-bright ramp over them; the z-plane shows the square blue grid patch and the green line with the same ramp. `polar`: the w-plane shows concentric orange circles (radii 0.25, 1, 2.25, 4, 6.25, 9 for the rings r = 0.5 .. 3) and orange rays, the same polar grid shape as the z-plane's but with the rays doubled in angle; the ramp on the purple image matches the green input's. Both themes. |
| A4 | `node tools/smoke.mjs --route problem-2-5-1 --script tests/interact/i1-station-powermap-reciprocal.mjs --dark --out docs/review/iter-1/i1-station-powermap-reciprocal/a4` | `3/3 checks passed across 1 route(s).` The script (steps R1 to R10): readout has `line Re w = 0.5`; every finite `window.__mv.reciprocalImage` point has `|Re w - 0.5| < 1e-6`, no step inside a piece is longer than 5 (the real largest step is below 1), no point has `|w| > 64`; `dragHandle("reciprocal-zplane-p", {re:2, im:0})` gives `p = 2` and `1/p = 0.5`; to `{re:1, im:1}` gives `1/p = 0.5 - 0.5i`; to `{re:0.02, im:0.2}` gives a parsed `|1/p|` above 4 (4.593 expected); `clickChip("reciprocal-preset-line")` gives an image text with `circle` and `through 0`; `clickChip("reciprocal-preset-unit")` gives `image: circle |w| = 1`. |
| A5 | the A4 run above, `ctx.shot("invert")` and `ctx.shot("both")` on `#problem-2-5-1` | `invert`: the unit circle dashed and bold in orange on the w-plane, the purple line Re w = 1/2 (stage 1 of the circle through 0 is a line), its ramp running upward (dark at 0.5 on the real axis, brighter going up), the dot at p/\|p\|² = 0.5 + 0.5i above the real axis for p = 1 + i; no mirror line, no connectors. `both`: the same line with the ramp reversed (dark at 0.5, brighter going down), the stage-1 line faint and dashed behind it, a hollow dot at 0.5 + 0.5i joined by a dashed vertical segment to the filled dot at 0.5 − 0.5i (`1/p`), the unit circle faint. Both themes; phone too. |
| A6 | code inspection (commands in 7.5) | Both files import their mapping functions from `../core/mapping.js` (powermap: `pushForward`, `pushForwardAll`, `morph`, `morphPoint`, `bounds` if used; reciprocal: `pushForward`, `morph`, `morphPoint`, `pointOnPieces`) and their shapes from `../core/shapes.js` (powermap: `verticalLine`, `sector`, `cartGrid`, `polarGrid`, `pointAt`; reciprocal: `circle`, `segment`, `pointAt`); every point array handed to a plane comes from those calls; the closed form u = c² − v²/(4c²) appears only in `lineReadout`, `lineFact` and the explainer test row (text), never as a point generator. |

### 7.2 Unit tests (`tests/unit/i1-station-powermap-reciprocal.test.mjs`, `node --test`, pure Node, imports `internals` of both stations)

Tolerance 1e-9 unless stated. "pm" is `powermap.js`'s `internals`, "rc" is `reciprocal.js`'s.

| # | Call | Expected |
|---|---|---|
| U1 | `import('../../js/stations/powermap.js')` and `reciprocal.js` in Node | no throw; `typeof mount === 'function'`; `Object.isFrozen(internals)` |
| U2 | `pm.lineReadout(c, n)` | (2,2): `x = 2; image: u = 4 - v²/16; focus 0; vertex 4`. (1,2): `x = 1; image: u = 1 - v²/4; focus 0; vertex 1`. (1.5,2): `x = 1.5; image: u = 2.25 - v²/9; focus 0; vertex 2.25`. (0.1,2): `x = 0.1; image: u = 0.01 - v²/0.04; focus 0; vertex 0.01`. (-2,2): `x = -2; image: u = 4 - v²/16; focus 0; vertex 4`. (0,2): `x = 0; image: the negative real axis (u <= 0, v = 0), the parabola has collapsed; focus 0; vertex 0`. (2,3): `image of x = 2 under z^3`. (2,4): `image of x = 2 under z^4`. (-2,3): `image of x = -2 under z^3`. (0,3): `image of x = 0 under z^3`. |
| U3 | `pm.sectorReadout(a·π/36, b·π/36, n)` for (a, b, n), one string each | (0, 9, 3): `sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 2.356 (3pi/4)`. (0, 9, 6): `sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 4.712 (3pi/2)` (no `(overlaps`). (0, 18, 6): `sector 0 < arg z < 1.571 (pi/2); image: 0 < arg w < 9.425 (3pi) (overlaps itself)`. (-6, 9, 3): `sector -0.524 (-pi/6) < arg z < 0.785 (pi/4); image: -1.571 (-pi/2) < arg w < 2.356 (3pi/4)`. (0, 9, 2): `sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 1.571 (pi/2)`. (0, 9, 4): `sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 3.142 (pi)`. (0, 9, 5): `sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 3.927 (5pi/4)`. (0, 12, 6): `sector 0 < arg z < 1.047 (pi/3); image: 0 < arg w < 6.283 (2pi)` (no overlap). (0, 13, 6): `sector 0 < arg z < 1.134; image: 0 < arg w < 6.807 (13pi/6) (overlaps itself)`. |
| U4 | `pm.overlaps(a, b, n)` | (0, π/4, 2..6) false; (0, π/2, 6) true; (0, π/3, 6) false (equality); (0, 13π/36, 6) true. |
| U5 | `pm.lineFact(c, n)`, `pm.sectorFact(a, b, n)` | lineFact(2, 2): `Focus 0 and directrix u = 8: every point of the parabola is as far from 0 as from that line.` (1, 2): `Focus 0 and directrix u = 2: every point of the parabola is as far from 0 as from that line.` (0, 2): `The line x = 0 is the imaginary axis. Squaring sends iy to −y², so it lands on the negative real axis, twice over.` (2, 3): `Nearest point of the image to 0: 8, where y = 0.` (-2, 3): `Nearest point of the image to 0: -8, where y = 0.` (1.5, 5): `Nearest point of the image to 0: 7.594, where y = 0.` (0, 3): `The line x = 0 is the imaginary axis. Its power 3 stays on the imaginary axis and covers it once.` (0, 4): `The line x = 0 is the imaginary axis. Its power 4 is a ray of the real axis, run twice (y and −y have the same even power).` sectorFact(0, π/4, 3): `Opening 0.785 becomes 2.356: 3 times wider.` (0, π/2, 6): `Opening 1.571 becomes 9.425: 6 times wider. That is more than a full turn, so the fan lies on top of itself.` |
| U6 | `pm.cartesianExpansion(n)` | n=2 `{u: 'x^2 - y^2', v: '2xy'}`; 3 `{u: 'x^3 - 3xy^2', v: '3x^2y - y^3'}`; 4 `{u: 'x^4 - 6x^2y^2 + y^4', v: '4x^3y - 4xy^3'}`; 5 `{u: 'x^5 - 10x^3y^2 + 5xy^4', v: '5x^4y - 10x^2y^3 + y^5'}`; 6 `{u: 'x^6 - 15x^4y^2 + 15x^2y^4 - y^6', v: '6x^5y - 20x^3y^3 + 6xy^5'}`. Evaluated (after turning `2xy` into `2*x*y`, `x^2` into `x**2`) at x = 0.7, y = -1.3 they equal `pow(0.7 - 1.3i, n)`: n=2 `-1.2 - 1.82i`; 3 `-3.206 + 0.286i`; 4 `-1.8724 + 4.368i`; 5 `4.36772 + 5.49172i`; 6 `10.19664 - 1.833832i` (1e-9). |
| U7 | `pushForward(verticalLine(c, { yRange: [-4, 4], n: 128 }), (z) => pow(z, 2), { clampRadius: 64 })` for c in 0.5, 1, 1.5, 2, 3, -2 | one piece, at least 129 points; every point `|u - (c² - v²/(4c²))| < 1e-9` and `| \|w\| + u - 2c² | < 1e-9`. |
| U8 | `pushForwardAll(sector({ r0: 0, r1: 2.5, theta0: 0, theta1: π/4, fill: true, fillRays: 4, fillArcs: 3, n: 48 }), (z) => pow(z, 3), { clampRadius: 200 })` | 8 pieces, 488 points; every point has Arg in [0, 3π/4 + 1e-9] (the point 0 counts as 0). `pow(1 + 0.5i, 3) = 0.25 + 1.375i`, its Arg is `3 * atan2(0.5, 1) = 1.3909428270024184` (1e-12), its modulus `1.3975424859373684`. `pow(1 + i, 3) = -2 + 2i`. |
| U9 | `pm.derive(state, stroke)` for the default line state (c = 2, n = 2, t = 0.625) | `z = {2, 1}`, `r = 2.23606797749979`, `theta = 0.4636476090008061`, `w = {3, 4}`, `rho = 5`, `nTheta = argW = 0.9272952180016122`, `k = 0`, `zero = false`, `agree = true`, `where = 'y = 1'`. |
| U10 | `pm.derive` for line states with c = 1, n = 6 | t = 0.625 (z = 1 + i): `w = {0, -8}` (1e-12), `rho = 8`, `nTheta = 4.71238898038469`, `argW = -1.5707963267948966`, `k = 1`. t = (tan 0.6 + 4)/8 (θ = 0.6): `nTheta = 3.6`, `argW = -2.683185307179586`, `k = 1`. t = (tan(π/6) + 4)/8 (θ = π/6): `nTheta = π`, `argW = π` (not −π), `k = 0`. |
| U11 | `pm.derive` for the default sector state (t = 0.5, n = 3) | `z = {2.309698831278217, 0.9567085809127245}` (1e-9), `r = 2.5`, `theta = π/8`, `rho = 15.625`, `nTheta = 3π/8 = 1.1780972450961724`, `w = {5.979428630704527, 14.435617695488856}`, `agree = true`, `where = 'on the arc'`. A state with t = 0 (z = 0): `zero = true`, `argW = 0`. |
| U12 | `pm.ghostCounts(nTheta, argW)` | (3.6, -2.683185307179586) `{up:1, down:0}`; (1.391, 1.391) `{up:1, down:0}`; (-3.6, 2.683185307179586) `{up:0, down:1}`; (3π/2, -π/2) `{up:1, down:0}`; (6π, 0) `{up:3, down:0}`. |
| U13 | `pm.fitHalfExtent`, `pm.clampFor` (with `{ center: {0,0}, unitsAcross: 2H }`, size 480 x 480) | line: n=2..6, c=2: H = 18, 12.8, 25.6, 51.2, 102.4 and clamps 64, 64, 128, 256, 512; line c=0, n=3: 8. sector: n=2..6: H = 7.8125, 19.53125, 48.828125, 122.0703125, 305.17578125 and clamps 64, 64, 256, 512, 1024. `clampFor` with unitsAcross 6 is 64; with centre (100, 0) and unitsAcross 6 it is 128. |
| U14 | `pm.snapC`, `pm.stepOf`, `pm.unwrapStep`, `pm.constrainSteps` | `snapC(2.04)=2`, `snapC(2.06)=2.1`, `snapC(3.4)=3`, `snapC(-3.4)=-3`, `snapC(1.0000000000000002)=1`, `snapC(0.949)=0.9`. `stepOf(π/2) = 18`, `stepOf(atan2(2, 0)) = 18`, `stepOf(π/4) = 9`. `unwrapStep(9,18)=18`, `(35,-35)=37`, `(-35,35)=-37`, `(0,-36)=36`. `constrainSteps({aStep:12,bStep:9},'a')={8,9}`, `({aStep:-70,bStep:9},'a')={-62,9}`, `({aStep:0,bStep:0},'b')={0,1}`, `({aStep:0,bStep:80},'b')={0,71}`. |
| U15 | `pm.nearestOnPolyline` | on the line stroke at c = 2: `z = (2.3, 1.04)` gives `t = 0.63`, `z = (2, 1.04)`, `d = 0.3`. On the default sector boundary: `z = 3 e^{iπ/8}` gives `t` within 1e-3 of 0.5 and `d` within 1e-3 of 0.5. |
| U16 | `pm.presetFor` | `null`, `{kind:'problem', id:'2.1.2'}`, `{kind:'topic', id:'T2.1'}`, `{kind:'token', token:'xyz'}` give input line, n 2, c 2, grid cart, t 0.625, s 1. `{kind:'problem', id:'2.2.1'}`, `{kind:'topic', id:'T2.2'}`, `{kind:'token', token:'Sector'}` give input sector, n 3, aStep 0, bStep 9, grid polar, t 0.5. A returned state is a fresh object each call. |
| U17 | `pm.neighbourLinks(STATIONS, powermap)` and `rc.neighbourLinks(STATIONS, reciprocal)` | powermap: prev `linear`, next `principal-root`, T1 `linear`/`reciprocal`, T2 `roots`/`principal-root`, T3 `linear`/`reciprocal`. reciprocal: prev `branches`, next `limits`, T1 `powermap`/`derivative`, T3 `powermap`/`limits`. |
| U18 | `pm.labRequest`, `rc.labRequest` | default line: `{ fn: 'sq', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.2', predictFirst: false }`. default sector: `{ fn: 'cube', shapes: [{ kind: 'sector', r0: 0, r1: 2.5, theta0: 0, theta1: π/4 }], view: 'side', problem: '2.2.1', predictFirst: false }`. n = 4: `fn: { src: 'z^4' }`, `problem: null`. reciprocal circle1: `{ fn: 'recip', shapes: [{ kind: 'circle', center: {re:1, im:0}, r: 1 }], view: 'side', problem: '2.5.1', predictFirst: false }`; preset `custom`: `problem: null`. |
| U19 | `pm.flatten`, `rc.flatten` | two pieces of 3 finite points each: `flatten(pieces, false)` has length 6, `flatten(pieces, true)` has length 7 and entry 3 is `{re:NaN, im:NaN, t:NaN}`; both have `.pieces` of lengths [3, 3]; a non-finite point inside a piece is dropped from both. |
| U20 | `pm.srText`, `rc.srText` | default line state: `Line x equals 2, power 2. Image: the parabola u = 4 minus v squared over 16, focus 0.`; default sector state: `Sector from 0 to 0.785 radians, power 3. Image: the sector from 0 to 2.356 radians.`; reciprocal default: `Shape: circle |z - 1| = 1. Under 1/z it becomes the line Re w = 0.5.` |
| U21 | `rc.describeShape`, `rc.describeImage(...).text`, `rc.readoutText(shape, p)` | The four presets with their default probes, readouts exactly as in the table of 6.4: circle1 at `1 + i`, line at `1 + i`, circle0 at `1.5 + 0.5i`, unit at `i`. `readoutText` at p = 0 on circle1: `shape: circle \|z - 1\| = 1; image: line Re w = 0.5; p = 0; 1/p = inf; \|1/p\| = inf`. The 13 further shapes of 6.4 (the line shapes are given by two points a, b): see the table below this one. |
| U22 | `rc.imageResidual(shape, inv(z))` over 361 points of each shape of U21 with `|z| >= 0.02` | at most 1e-9 times `max(1, |w|)`. |
| U23 | `rc.strokeOf(shape, 64)` then `pushForward(curve, inv, { clampRadius: 64 })` | circle1: 2 pieces; all finite points `|Re w - 0.5| < 1e-6`; the largest distance between consecutive points of a piece is at most 1.0; no point has `|w| > 64`; piece 1 has `t` from 0 to below 0.5, piece 2 from above 0.5 to 1; `pointOnPieces(pieces, 0.5) === null`; `pointOnPieces(pieces, 0.25)` is `0.5 - 0.5i` (1e-9). unit: 1 closed piece, every `|w| = 1`. circle0: 1 closed piece, every point on `|w - 0.75| = 0.25`. line preset: 1 open piece, every point on `|w - 0.5| = 0.5`. Line through 0 (the 45 degree line): 2 pieces, largest step at most 1.0. The same circle1 with plain `shapes.circle(..., { n: 128 })` and no refinement has largest step 10.19 (documents D6; a test may assert `> 5` to prove the refinement is needed). |
| U24 | `rc.refineSamples` on a base whose images never exceed `maxStep` | returns the base points unchanged (same count) for the unit circle and circle0. |
| U25 | `rc.invertPoint`, mirror | `invertPoint(1 + i) = {0.5, 0.5}`; `conj(invertPoint(1 + i)) = inv(1 + i) = {0.5, -0.5}`; `invertPoint(invertPoint(z)) = z` for z = 0.6 + 0.5i; `invertPoint(0)` has NaN parts. |
| U26 | `rc.probeOf`, `rc.snapProbe` | circle1, `{phi: π/2}`: `z = {1, 1}` (re exactly 1, 1e-15). `snapProbe(circle1, {2, 0})` = `{phi: 0}`; `({1, 1})` = `{phi: π/2}`; `({0.02, 0.2})` = `{phi: 167.5·π/180}` and then `1/abs(p) = 4.5927652527905405`; `({0, 0})` has bearing 180 degrees: `{phi: π}` and `probeOf` gives `|p| < 1e-9`. `({0.5, -1})` gives a `phi` in [0, 2π) (negative angles wrap). line preset, `{s: 1}`: `z = {1, 1}`; `snapProbe(line, {1.04, 1.26})` = `{s: 1.3}`; `snapProbe(line, {1, 20})` = `{s: 8}`. |
| U27 | `rc.rotateMaths`, `rc.sphereTriples`, stereographic | `rotateMaths(stereographic(z), π)` equals `stereographic(inv(z))` (1e-12) for z = 1 + i, 2 - 0.5i, 0.3 + 0.7i; for z = 0 it is `[0, 0, 1]`. `rotateMaths([0, 1, 0], π/2) = [0, 0, 1]` (1e-12). `rotateMaths(P, 0) = P`. `sphereTriples([{re:1, im:1}], 1.008)` = `[[0.672, 0.672, 0.336]]` (1e-12: 1.008 times (2/3, 2/3, 1/3)). |
| U28 | `pm.edgeIndicator`, `rc.edgeIndicator` | `({x:900, y:200}, {w:400, h:400}, 14)` = `{x:386, y:200, ux:1, uy:0}`; `({x:200, y:200}, ...)` = `null`; `({x:-300, y:-300}, ...)` = `{x:14, y:14, ux:-0.7071067811865475, uy:-0.7071067811865475}`; `({x:NaN, y:5}, ...)` = `null`. |
| U29 | `rc.nearHint(shape)` | circle (c = 1.1, r = 1): true; (1, 1): false; (1.5, 0.5): false; (1.05, 1): true; (0.5, 1): false; a line: false. |
| U30 | `rc.presetFor` | `null`, problem `2.5.1`, topic `T2.5`, token `xyz`: preset `circle1`, stage `both`, turn 0. Token `LINE`: preset `line`. Token `mirror`: preset `circle1`, stage `mirror`. |
| U31 | `rc.clampFor` | `({center:{0,0}, unitsAcross: 6}, {w:480,h:480}) = 64`. |
| U32 | `morph` of the refined circle1 stroke (`rc.strokeOf`) under `inv`, clamp 64 | s = 0: 1 closed piece whose first point is `(2, 0)`; s = 0.5: 2 pieces, first point `(1.25, 0)` (= 0.5 z + 0.5/z at z = 2); s = 1: equals `pushForward` (2 pieces, first point `(0.5, 0)`). Stage 1 (`invertPoint`) at s = 0.5: first point `(1.25, 0)`. Mirror morph of the stage-1 pieces at s = 0: first point `(0.5, 0)`; at s = 1 the pieces equal the `inv` image pieces. |


**U21, further shapes** (`describeShape` and `describeImage(...).text`, exact strings):

| Shape | `describeShape` | `describeImage(...).text` |
|---|---|---|
| circle, c = i, r = 1 | `circle \|z - i\| = 1` | `line Im w = -0.5` |
| circle, c = 0.6 + 0.8i, r = 1 | `circle \|z - (0.6 + 0.8i)\| = 1` | `line 0.6u - 0.8v = 0.5` |
| circle, c = 2, r = 1 | `circle \|z - 2\| = 1` | `circle center 0.667, radius 0.333` |
| circle, c = 1.1, r = 1 | `circle \|z - 1.1\| = 1` | `circle center 5.238, radius 4.762` |
| circle, c = -1, r = 1 | `circle \|z + 1\| = 1` | `line Re w = -0.5` |
| circle, c = 1 - i, r = 1 | `circle \|z - (1 - i)\| = 1` | `circle center 1 + i, radius 1` |
| circle, c = -i, r = 0.5 | `circle \|z + i\| = 0.5` | `circle center 1.333i, radius 0.667` |
| circle, c = 0, r = 2 | `circle \|z\| = 2` | `circle \|w\| = 0.5` |
| line through -1 + i and 1 + i | `line Im z = 1` | `circle through 0, center -0.5i, radius 0.5` |
| line through -1 - i and 1 + i | `line through -1 - i and 1 + i` | `line through 0, angle -0.785 (-pi/4)` |
| line through -1 and 1 | `line Im z = 0` | `line through 0 (the real axis)` |
| line through -i and i | `line Re z = 0` | `line through 0 (the imaginary axis)` |
| line through 2 and 2i | `line through 2 and 2i` | `circle through 0, center 0.25 - 0.25i, radius 0.354` |


### 7.3 Interaction script (`tests/interact/i1-station-powermap-reciprocal.mjs`)

Run through `tools/smoke.mjs`; it must pass at desktop (1280 x 860), phone (390 x 844) and, with `--dark`, desktop-dark. It imports `dragHandle`, `clickChip`, `readText`, `setSlider`, `settle`, `handleZ` from `./_helpers.mjs` and branches on `ctx.route`:
`powermap` or `problem-2-1-2` runs P1 to P11; `problem-2-2-1` runs P7 to P10 (P7 without the hash change, after a `settle`); `reciprocal` or `problem-2-5-1` runs R1 to R10; any other route throws. A helper `image(name)` reads `window.__mv[name]` into `{ pts: [[re, im]], pieces: [[[re, im]]] }`. `ctx.assert(cond, message)` is used throughout; the script exports no `expectedErrors` (no error is provoked).

Powermap, route `problem-2-1-2`:
1. **P1** `await settle(page, 4)`. The text of `#powermap-readout` contains `x = 2`, matches `/u = 4 - v(²|\^2)\/16/`, contains `focus 0` and `vertex 4`. `#powermap-n-out` is `2`, `#powermap-input-line` has `aria-pressed="true"`, `#powermap-grid-cart` has `aria-pressed="true"`.
2. **P2** `image('powermapImage')`: at least 100 points, all finite, every `|u - (4 - v²/16)| < 1e-6`, exactly 1 piece, the first point is `(-12, -16)` (1e-9) and the last `(-12, 16)`.
3. **P3** The `data-tex` of `#powermap-ex-w-cart` contains `3 + 4i`; `#powermap-ex-argw-polar` contains `0.927`; `#powermap-ex-same` has `data-agree="true"`; the staircase `#powermap-stairs-arg` text contains `0.927`.
4. **P4** `dragHandle(page, 'powermap-zplane-line', { re: 1, im: 0 })`; the readout contains `x = 1` and matches `/u = 1 - v(²|\^2)\/4/`; `handleZ(page, 'powermap-zplane-line')` is `{re: 1, im: 0}` (1e-9); `image('powermapImage')` again satisfies `|u - (1 - v²/4)| < 1e-6`. Then `dragHandle(page, 'powermap-zplane-line', { re: 2, im: 0 })` and the readout contains `x = 2` again.
5. **P5** (A3) `await clickChip(page, 'powermap-grid-cart'); await ctx.shot('cart'); await clickChip(page, 'powermap-grid-polar'); await ctx.shot('polar')`; `#powermap-gridnote` contains `survives` after the second click and `bends` after the first; `window.__mv.powermapGridImage.pieces.length` is 18 for polar and 26 for cart (at n = 2).
6. **P6** `setSlider(page, 'powermap-t', 0.75)`: `#powermap-t-out` contains `y = 2` and the `data-tex` of `#powermap-ex-w-cart` contains `8i`. `setSlider(page, 'powermap-morph', 0)`: `window.__mv.powermapMorph.s === 0` and the first point of its first piece is `(2, -4)` (the unmapped input); `setSlider(page, 'powermap-morph', 1)` restores `s === 1`. `await clickChip(page, 'powermap-play')`: the button reads `Pause`; a second click: it reads `Play` again (the harness does not set reduced motion; no assertion on wall time).
7. **P7** `await page.evaluate(() => { location.hash = '#problem-2-2-1'; }); await page.waitForTimeout(600);` The readout contains `0 < arg z < 0.785` and `0 < arg w < 2.356`; `#powermap-input-sector` has `aria-pressed="true"`; `#powermap-grid-polar` has `aria-pressed="true"`; `image('powermapImage')`: every point has `a = (re === 0 && im === 0) ? 0 : Math.atan2(im, re)` in `[-1e-6, 3π/4 + 1e-6]`, and `pieces.length === 8`.
8. **P8** `setSlider(page, 'powermap-n', 6)`: the readout contains `4.712` and does not contain `(overlaps`; `#powermap-fact` contains `6 times wider`.
9. **P9** `dragHandle(page, 'powermap-zplane-s1', { re: 0, im: 2 })`: the readout contains `(overlaps itself)` and `1.571`; `handleZ(page, 'powermap-zplane-s1')` has `re` within 1e-6 of 0 and `im` within 1e-6 of 2.5.
10. **P10** `await clickChip(page, 'powermap-reset'); await page.waitForTimeout(600);` the readout contains `0 < arg w < 2.356` again and `#powermap-reset` reads `Reset to problem 2.2.1`.
11. **P11** (unmount) `await page.evaluate(() => { location.hash = '#reciprocal'; }); await page.waitForTimeout(600);` (the other station of this goal, so the step does not depend on any station this goal does not own) then `window.__mv.powermapImage === undefined`, `window.__mv.planes.has('powermap-zplane') === false` and `has('powermap-wplane') === false`. Finally, on every route of this script: no duplicate element ids (`new Set(ids).size === ids.length` over `[...document.querySelectorAll('[id]')]`), `document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1`.

Reciprocal, route `problem-2-5-1`:
1. **R1** `settle`; the readout is exactly `shape: circle |z - 1| = 1; image: line Re w = 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; |1/p| = 0.707`; `#reciprocal-stage-both` has `aria-pressed="true"`.
2. **R2** `image('reciprocalImage')`: `pieces.length === 2`; every finite point `|re - 0.5| < 1e-6`; inside each piece, consecutive distance at most 5 (and the script logs the real maximum, below 1); every `|w| <= 64`; the flat array has exactly one separator entry (a point with `re` not finite) and the pieces' point counts add up to `pts.length - 1`.
3. **R3** `dragHandle(page, 'reciprocal-zplane-p', { re: 2, im: 0 })`: readout contains `p = 2` and `1/p = 0.5`. `dragHandle(..., { re: 1, im: 1 })`: contains `1/p = 0.5 - 0.5i`. `dragHandle(..., { re: 0.02, im: 0.2 })`: `Number(/\|1\/p\| = ([0-9.]+)/.exec(readout)[1]) > 4`; take `ctx.shot('near-zero')` (the edge arrow is visible). The plane note `#reciprocal-wnote` is hidden.
4. **R4** `clickChip(page, 'reciprocal-preset-line')`: readout contains `circle` and `through 0` and `image: circle through 0, center 0.5, radius 0.5`; `image('reciprocalImage')` has 1 piece and every point satisfies `|hypot(re - 0.5, im) - 0.5| < 1e-6`. `clickChip(page, 'reciprocal-preset-circle0')`: contains `image: circle center 0.75, radius 0.25`. `clickChip(page, 'reciprocal-preset-unit')`: contains `image: circle |w| = 1`. `clickChip(page, 'reciprocal-preset-circle1')`: back to R1's readout.
5. **R5** (A5) `clickChip(page, 'reciprocal-stage-invert'); await ctx.shot('invert')`: `window.__mv.reciprocalStages.stage === 'invert'`; the first two points of `reciprocalStages.inverted[0].points` go upward (the second point's `im` is greater than the first's, and the first point is `(0.5, 0)`); those of `reciprocalStages.final[0].points` go downward (second point's `im` is less than the first's). `#reciprocal-stage-note` contains `Stage 1`. `clickChip(page, 'reciprocal-stage-mirror')`: note contains `Stage 2`; `clickChip(page, 'reciprocal-stage-both'); await ctx.shot('both')`.
6. **R6** the explainer: `#reciprocal-ex-w-cart` `data-tex` contains `0.5 - 0.5i`; `#reciprocal-ex-inv-cart` contains `0.5 + 0.5i`; `#reciprocal-ex-img-polar` contains `0.5`; `#reciprocal-ex-same` has `data-agree="true"`.
7. **R7** the morph: `setSlider(page, 'reciprocal-morph', 0)`: `window.__mv.reciprocalMorph.s === 0`, the first point of its first piece is `(2, 0)` (the unmapped stroke, stage both); `setSlider(page, 'reciprocal-morph', 0.5)`: `#reciprocal-morph-out` is `s = 0.5`, the first point is `(1.25, 0)`, and `ctx.shot('morph')`; `clickChip(page, 'reciprocal-stage-mirror')` with `setSlider(..., 0)`: the first point is `(0.5, 0)` (the stage-1 image); then `setSlider(..., 1)` and `clickChip(page, 'reciprocal-stage-both')` restore the default.
8. **R8** the sphere: if `window.__mv.reciprocalSphere.available` is false, assert that `#reciprocal-sphere-turn` is disabled and stop this step; else `setSlider(page, 'reciprocal-sphere-turn', 1)`: `#reciprocal-sphere-turn-out` reads `180 degrees` and `window.__mv.reciprocalSphere.turn === 1`; `await ctx.shot('sphere')`; `setSlider(..., 0)`: `0 degrees`. `window.__mv.views3d` has one view (its id is `reciprocal-sphere`).
9. **R9** `clickChip(page, 'reciprocal-play')` twice (start, pause); `clickChip(page, 'reciprocal-reset')`; wait 600 ms; the readout is R1's again.
10. **R10** unmount: `location.hash = '#powermap'` (the other station of this goal), wait 600 ms; `window.__mv.reciprocalImage === undefined`, `window.__mv.reciprocalStages === undefined`, `window.__mv.reciprocalMorph === undefined`, `window.__mv.planes.has('reciprocal-zplane') === false`, `window.__mv.views3d.size === 0`; then the duplicate-id and overflow checks of P11.

### 7.4 Screenshot review checklist (A3, A5; desktop, phone, dark)

- Both planes square; the z-plane left (top on the phone); captions say `z-plane` and `w-plane`.
- The green stroke and the purple image carry the same dark-to-bright ramp (compare the lightness at the start, the middle and the end); the "start / end" pill is on the z-plane.
- powermap `cart`: two parabola families in blue, crossing at right angles; `polar`: concentric orange circles and rays; the active image is drawn over the grid and is the heaviest mark.
- Address overlays: dashed blue drop lines (line input), solid orange ray and solid arc labelled `Arg z = ...` / `Arg w = ...`, a faint second winding labelled `also ...`, the dashed grey `seam` on both planes; labels do not collide with the zoom buttons or with each other.
- reciprocal: the unit circle is dashed orange; in `invert` it is bold; in `both` the stage-1 line is faint and dashed; the connector is vertical.
- Dark: the ghost words, the seam label, the edge-arrow label and the faint grid are readable; no black-on-dark text anywhere in the explainer (tints are tokens).
- Phone: no horizontal scroll; the explainer cells carry their column headings; the sphere is 4:3 and complete.

### 7.5 A6 inspection commands

```
grep -n "core/mapping.js" js/stations/powermap.js js/stations/reciprocal.js              # both import pushForward (powermap also pushForwardAll, morph)
grep -n "core/shapes.js"  js/stations/powermap.js js/stations/reciprocal.js              # verticalLine, sector, cartGrid, polarGrid | circle, segment
grep -n "pushForward(\|pushForwardAll(\|morph(" js/stations/powermap.js js/stations/reciprocal.js
grep -nE "vendor/three|from 'three'" js/stations/*.js                                      # nothing
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(" js/stations/powermap.js js/stations/reciprocal.js   # nothing (the blend uses mixColor and cssVar)
grep -nE "scrollTo|scrollIntoView|alert\(|confirm\(|prompt\(|window\.open|localStorage|document\.cookie" js/stations/powermap.js js/stations/reciprocal.js   # nothing
grep -nE "<a [^>]*href=\"#[a-z]*[^a-z0-9.-]" js/stations/powermap.js js/stations/reciprocal.js   # every href is a route token
```
The reviewer also reads `lineReadout`: the closed form is built there (text) and nowhere else is it used to generate points.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases (each has a defined result; the numbers refer to the sections that implement it)

| # | Case | Result |
|---|---|---|
| E1 | powermap line c = 0 | readout and fact of 5.2.2; the stroke is the imaginary axis; the image is a ray or a line on one axis; the explainer test row's Cartesian cell says the parabola collapsed (n = 2). |
| E2 | negative c | allowed, down to -3; for n = 2 the image equals that of -c (same parabola, run the other way); the fact sentence and the callout say so. |
| E3 | the probe sits at y = 0 on the line handle | the probe is on top (added last); drag it away, or Tab to the line handle and use the arrows. |
| E4 | the sector probe at t = 0 or t = 1 (z = 0) | `derive.zero`: explainer angle cells say `z = 0 has no angle`, `stairs.update(null)`, overlays skip the polar address, `q` sits at 0. |
| E5 | sector width at the limits | width 1 step (5 degrees) and 71 steps (355 degrees) are reachable; `constrainSteps` never gives 0 or 72 steps, so `sector()` never adds a turn or caps the sweep. |
| E6 | an edge handle dragged across the negative real axis | `unwrapStep` keeps the edge continuous (a = 35 steps, pointer at 185 degrees: step 37), so the sector does not flip. |
| E7 | n changes while Play runs | the loop keeps its own t; the image recomputes in the flush; no restart. |
| E8 | morph with s in (0, 1) and n = 6 | morph pieces are cut by `clampRadius` only; at s = 0 `morph` returns the input untouched; the address overlays on the w-plane are hidden for s < 0.999. |
| E9 | the whole image is off the w-plane | powermap refits once (5.2.11); if it is still off (the student zoomed or panned away) `*-wnote` shows (5.1.3). reciprocal never refits; it shows the note. |
| E10 | the probe image is off the w-plane | `q` is clipped by the plane; the edge arrow with `|w| = ...` is drawn (5.1.7). |
| E11 | theme switch while mounted | the planes redraw (plane.js), the explainer re-renders, `syncCurves()` recomputes the morph blend, the sphere refreshes itself. |
| E12 | `prefers-reduced-motion` | 8.4. |
| E13 | route change in the middle of a drag or an animation | `unmount` sets `dead`, cancels the rAF handles and destroys planes; later callbacks return at their first line. |
| E14 | phone rotation or window resize | planes resize themselves and emit `viewchange` (`resize`); the clamp is compared and the images recomputed only if the power-of-two value changed; the sphere view resizes itself. |
| E15 | KaTeX not loaded | the explainer cells and the problem panel show plain text; nothing throws. |
| E16 | no WebGL (reciprocal) | 2.2.5. The rest works. |
| E17 | `localStorage` blocked | never touched. |
| E18 | two quick chip clicks | each click is one synchronous `flushNow()`; the second sees the first's state. |
| E19 | reciprocal p exactly 0 | `1/p = inf`; image rows say so; `q` hidden; sphere marker at the south pole, and at the north pole after the half-turn. |
| E20 | reciprocal line handles a and b closer than 0.1 | the move is refused (the handle springs back); the line never degenerates. |
| E21 | a circle that nearly misses 0 (`nearHint`) | the hint line; if the image circle is larger than the clamp (|D| = 0.01 gives a radius up to 300) its far part is cut by `pushForward`, so the image is an open arc that leaves the plane. |
| E22 | a chip or preset while the probe plays | the play loop is cancelled first. |
| E23 | `ctx.preset` null or an unknown token | the default state of the station (problem 2.1.2, circle1). |
| E24 | wheel over a plane | scrolls the page unless the plane has focus or Ctrl/Cmd is held (plane.js `wheel: 'focus'`). |

### 8.2 Performance plan (numbers from Node 22 against the real modules; the browser adds drawing)

- `pushForwardAll` of the 26-line Cartesian grid under z^2: 3 to 5 ms; the 18-curve polar grid: 1.5 to 4 ms; `morph` of both grids at s = 0.5, n = 6: about 6 ms; the sector (8 curves) and the line: under 1 ms. The worst flush (the n slider, which recomputes the stroke, the extras and the grid) is about 10 ms; a drag of the line handle recomputes only the stroke, under 1 ms. A morph slider move recomputes about 44 curves per frame, at most 8 ms.
- reciprocal: `refineSamples` plus two `pushForward` calls about 1 to 3 ms; the sphere rebuild (`staticLine.userData.update` plus `clearCurves` and `addCurve` on about 300 points) under 2 ms, done at most once per frame and only when the shape changed.
- Draw: one layer per plane for the grid, never one layer per grid curve; the curve pools hold at most 12 layers; grid curves are drawn with `ramp: false` (one path each); nothing is allocated per frame except the arrays handed out by the flush.
- Coalescing: every continuous input marks dirty bits and calls `schedule()` (one `requestAnimationFrame` per frame); discrete input flushes immediately; the explainer coalesces its own renders (one per frame, MathML refined 220 ms after the last update).
- Targets (CONSTRAINTS): 60 fps while dragging in 2D, at least 30 fps while turning the sphere. Check on the throttled-CPU run of the smoke harness that the flush stays under 16 ms on a drag.
- Resolution management: the planes own their canvases, devicePixelRatio and resize (the stations never size a canvas); no domain-colouring canvas is used; the sphere view sizes its renderer from its container with a `ResizeObserver` (three-view); `clampFor` is the only resolution-dependent quantity the stations compute, and it depends on the view's units, not on pixels.

### 8.3 Accessibility

- One `<h1>` (in the header); each panel has an `<h2 class="panel-title">`; the controls row has a visually hidden `<h2>`; the two plane captions are paragraphs tied to their planes through the plane's `ariaLabel`.
- Every control has a visible label or an `aria-label` and a stable id; chips are buttons with `aria-pressed` (exactly one true per group, which the script checks); sliders have a `<label for>` and an `<output>`, plus `aria-valuetext` where the number alone is not enough (`n = 3`, `180 degrees`, `t = 0.625 (y = 1)`).
- Plane handles are buttons announcing both addresses (plane.js: "z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)"); their names are the `name` strings of 4.1 and 4.2. Focus rings are the shell's. Tab order follows the DOM order described in 2.1.3.
- Results are readable without the pictures: the readout, the fact line, the explainer table (real `<table>` with headings) and the staircase list are text. A polite live region (`*-sr`) says what changed after a drag ends or a control changes (debounced 250 ms), so a screen reader is not flooded.
- Colour is never the only cue: dashed drop lines versus solid rays, the quarter dots and arrowheads for time, the `Arg` / `also` labels, the captions with the plane letters, the `easy in Polar` badges. All token colours meet 3:1 on the surface in both themes (3.2).
- Touch: handles have 32 px hit squares, chips and sliders 44 px; no hover-only information; no autoplay; no flashing.
- Zoom: the layout reflows at 200 percent (planes are fluid, the explainer stacks at 560 px).

### 8.4 Reduced motion

`ctx.theme.prefersReducedMotion()` is read when a control is clicked and when the button labels are set. When true: `#powermap-play` becomes "Step" (t moves by 0.125 per press, wrapping from 1 to 0); `#reciprocal-play` becomes "Step p" (15 degrees on a circle, 1 unit on a line); `#reciprocal-sphere-play` becomes "Jump" (turn goes to the other end at once); no rAF loop is ever started; the sphere's `autoRotate` stays false (three-view also turns damping off). Sliders, handles, chips and the morph are manual and work as always. There is no CSS animation in the stations.

### 8.5 Phone layout (390 px)

The station is one column. `.two-planes` (grid, `minmax(min(100%, 23.25rem), 1fr)`) stacks the planes because 23.25 rem is wider than the 358 px content width; each plane is a 358 px square (the plane's `maxWidth: 560` does not bind). Chips wrap; sliders stack label over range (shell rule below 30 rem); the explainer's cells carry their headings (explainer rule at 560 px); the readout wraps (`overflow-wrap: anywhere`); the sphere box is 358 x 268; the problem panel's two routes stack. The script's last step asserts `scrollWidth - clientWidth <= 1` after all interactions at 390 px. Handles must not sit under the zoom buttons (a column at the top-right, about 64 px wide): the defaults are well clear of it (powermap s1 at (1.77, 1.77) of the 4.5 half-width view is at x = 334 of 480 px, the buttons start near 408; reciprocal p at (1, 1) of the 3 half-width view is at x = 320).

---

## 9. Out of scope, and requests for other owners

**Out of scope** (as in the goal, and the rest of the story): free drawing and the brush (the Lab); general Möbius maps and az + b (the `linear` station); inverse functions and one-to-one; z^{1/n}, branches and the Riemann surface (stations `principal-root`, `branches`, `graph4d`); domain colouring, the modulus landscape and the 4D view; narration and video (media track: no `Listen` control is built here); persistence of the student's state; the Lab's "predict first" mode (`predictFirst` is sent false); a conformality overlay (iteration 2 idea in STORY section 7).

**Requests for other owners** (nothing below is edited by this goal):
1. `docs/ARCHITECTURE.md` section 9, `i1-station-powermap-reciprocal`: add the extra ids of D5, the hook formats of D2 and 4.3, the `internals` export, and the reading of `circle0` (D7). Section 3.10: nothing.
2. `js/core/mapping.js` (iteration 2, optional): an option `maxImageStep` that bisects a segment whose image step is longer than the option, so hosts need no near-pole resampling (D6: the plain step is 10.19 at `n = 128` and 5.43 at `n = 1024`, so acceptance A4 cannot be met by raising `n`).
3. `js/core/plane.js` (optional): a way to raise one handle above the others (the probe over the line handle at y = 0 is solved here by add order only).
4. The planner's text of acceptance A5 ("the inverted circle"): for `|z - 1| = 1` stage 1 is a line (D7); the reviewer should read it that way.

---

## Appendix A. Markup skeletons

Static markup only; text from the tables above is set with `textContent` or `prose()`, never by interpolating user input. `$` below means "look up by id once, after the template is inserted". The station root is `el` (a `<section class="station">`).

**powermap**
```html
<header class="station-header">
  <h1 id="powermap-title"></h1>
  <p class="station-lede" id="powermap-lede"></p>
  <ul class="thread-badges" id="powermap-threads"></ul>
  <div class="chips" id="powermap-problem-chips"></div>
</header>
<section class="panel" aria-labelledby="powermap-controls-title">
  <h2 id="powermap-controls-title" class="sr-only">Controls</h2>
  <div class="stack">
    <div class="row" role="group" aria-label="Input shape">
      <span class="field-label">Input</span>
      <div class="chips">
        <button type="button" class="chip" id="powermap-input-line" aria-pressed="true" data-tone="input">Line x = c</button>
        <button type="button" class="chip" id="powermap-input-sector" aria-pressed="false" data-tone="input">Sector</button>
      </div>
    </div>
    <div class="slider-row" data-tone="polar">
      <label for="powermap-n">Power n</label>
      <input type="range" id="powermap-n" min="2" max="6" step="1" value="2" aria-valuetext="n = 2">
      <output id="powermap-n-out" for="powermap-n">2</output>
    </div>
    <div class="row" role="group" aria-label="Grid carried along">
      <span class="field-label">Carry a grid along</span>
      <div class="chips">
        <button type="button" class="chip" id="powermap-grid-cart" aria-pressed="true" data-tone="cart">Cartesian grid</button>
        <button type="button" class="chip" id="powermap-grid-polar" aria-pressed="false" data-tone="polar">Polar grid</button>
        <button type="button" class="chip" id="powermap-grid-none" aria-pressed="false">No grid</button>
      </div>
    </div>
    <div class="row"><button type="button" class="btn" id="powermap-reset">Reset to problem 2.1.2</button></div>
  </div>
</section>
<div id="powermap-error" class="callout" data-tone="polar" hidden></div>
<div class="two-planes">
  <div class="stack">
    <p id="powermap-zcap"><span class="tone-input">z-plane</span>: the input</p>
    <div id="powermap-zhost"></div>
    <p class="muted" id="powermap-hint"></p>
  </div>
  <div class="stack">
    <p id="powermap-wcap"><span class="tone-output">w-plane</span>: the output, w = z^n</p>
    <div id="powermap-whost"></div>
    <p class="muted" id="powermap-wnote" hidden></p>
  </div>
</div>
<p class="muted" id="powermap-gridnote"></p>
<div class="stack">
  <div class="slider-row" data-tone="input">
    <label for="powermap-t">Time t</label>
    <input type="range" id="powermap-t" min="0" max="1" step="0.005" value="0.625">
    <output id="powermap-t-out" for="powermap-t"></output>
  </div>
  <div class="row"><button type="button" class="btn" id="powermap-play">Play</button></div>
  <div class="slider-row" data-tone="output">
    <label for="powermap-morph">Morph</label>
    <input type="range" id="powermap-morph" min="0" max="1" step="0.01" value="1">
    <output id="powermap-morph-out" for="powermap-morph">s = 1</output>
  </div>
  <p class="muted" id="powermap-morph-help"></p>
</div>
<div class="readout" id="powermap-readout" role="status" aria-live="off"></div>
<p class="muted" id="powermap-fact"></p>
<div class="sr-only" id="powermap-sr" aria-live="polite"></div>
<section class="panel" data-tone="polar"><h2 class="panel-title">Both addresses, with live numbers</h2><div id="powermap-ex"></div></section>
<section class="panel" data-tone="polar"><h2 class="panel-title">The angle of w: arg w is a set, Arg w is one step of it</h2><p id="powermap-stairs-intro"></p><div id="powermap-stairs"></div></section>
<section class="panel" id="powermap-problem"></section>
<div class="callout" data-tone="accent" id="powermap-notice"></div>
<div class="row"><button type="button" class="btn btn-primary" id="powermap-open-lab">Open in the Lab</button></div>
<nav class="station-links" aria-label="Neighbouring places" id="powermap-links"></nav>
```
The explainer and the staircase create their own inner ids (`powermap-ex-<row>-<col>`, `powermap-ex-same`, `powermap-stairs-set`, `powermap-stairs-arg`, `powermap-stairs-list`); the planes are created inside `#powermap-zhost` and `#powermap-whost`.

**reciprocal** is the same skeleton with: the controls panel holding two chip groups (`role="group" aria-label="Shape"` with `reciprocal-preset-circle1`, `-line`, `-circle0`, `-unit`, and `aria-label="Stage"` with `reciprocal-stage-invert`, `-mirror`, `-both`) and `#reciprocal-reset`; `#reciprocal-zhost` and `#reciprocal-whost` with `#reciprocal-hint`, `#reciprocal-wnote`, `#reciprocal-stage-note`, a morph slider row (`#reciprocal-morph`, `#reciprocal-morph-out`, `#reciprocal-morph-help`), `#reciprocal-play` and `#reciprocal-near`; `#reciprocal-readout`, `#reciprocal-sr`; the explainer panel `#reciprocal-ex` (panel `<h2>` "Both addresses, with live numbers"; the explainer's own caption keeps "The same point, worked both ways", so the two never repeat each other); a panel "The same map on the Riemann sphere" with the intro paragraph, `<div id="reciprocal-sphere" style="max-width: 36rem">Loading the sphere...</div>`, a slider row (`#reciprocal-sphere-turn`, `#reciprocal-sphere-turn-out`), `#reciprocal-sphere-play`, `#reciprocal-sphere-note`; `#reciprocal-problem`, `#reciprocal-notice`, `#reciprocal-open-lab`, `#reciprocal-links`, `#reciprocal-error`.

## Appendix B. How the builder should order the work

1. `internals` first (all pure functions of 4.1 and 4.2), with the unit test file (7.2) green in Node.
2. `powermap.js`: DOM, planes, strokes, images, hooks; then handles; then the explainer and staircase; then morph, play, the problem panel, links, Lab hand-off; then the interaction script P1 to P11.
3. `reciprocal.js`: DOM, planes, `strokeOf` and images with the stage pools; probe; explainer; then the sphere; then R1 to R10.
4. Run A1 to A6 (7.1), read the screenshots in both themes and on the phone, fix, and re-run. Report any file you could not own under `requests_for_other_owners` (section 9).

---

## 10. As built (iteration 1): deviations and notes

The builder followed sections 1 to 9. Everything below is where the code differs from, or adds to, the text above. Each item is small and sound; none changes a string, id or hook that an acceptance test reads.

| # | Where | What the code does | Why |
|---|---|---|---|
| B1 | `powermap.internals` | Also exports `strokeFor(state)`, `whereSector(t, a, b)`, `tText(s)`; `reciprocal.internals` also exports `lineGeom(shape)`. Both bags are still frozen. | `derive` and `probeOf` need the stroke when none is passed (U11, U15), and the tests read the others. Additive. |
| B2 | `powermap-ex` row `test`, polar cell, `z = 0` | Reads "z = 0 is on the line x = 0 but has no angle." when c = 0 and "z = 0 is not on the line." otherwise (5.2.8 says the second text always). | The origin does lie on the line x = 0, so the design text would be false there. |
| B3 | powermap grid images | The grid image (`imgGrid`) and the morph grid are recomputed only when the grid kind, n, the clamp or the morph value changes (flags `gridImages`, `morphGrid`); a drag of the line handle or of a sector edge recomputes only the stroke and its extras. | 8.2 says a line drag recomputes only the stroke; 5.2.11 as written recomputed the grid too (3 to 5 ms for nothing). Output is identical. |
| B4 | reciprocal, hollow ghost dot (stage mirror and both) | Drawn directly on the canvas as a ring in `--output` over a `--surface` fill at alpha 0.75 (`drawHollowDot`). | `drawDot` has no alpha or hollow option. |
| B5 | reciprocal, connectors | The layer is at order 150 (above the stroke), not 90; the four extra connectors of the mirror view take their end points from `pointOnPieces` on the stage-1 and final pieces, not from `f`. | For |z - 1| = 1 the line Re w = 1/2 is its own mirror image, so a connector under the solid line (order 90) is invisible; above it the dashed vertical segment of A5 shows. `pointOnPieces` keeps the end points on the engine's output (A6). |
| B6 | reciprocal edge arrow | Its label reads `|1/p| = <v>` (powermap: `|w| = <v>`). | 5.1.7 gives only the powermap text. |
| B7 | `animate(ms, step)` | Takes the end-of-run callback in reciprocal (`animate(ms, step, done)`); in powermap the callback is internal. | The play buttons must reset their label when a run finishes. |
| B8 | Plane legends | Both planes of each station show the "start / end" ramp pill (plane default); 3.1 says only the z-plane does. | The same ramp is on both planes; the pill is tiny and sits at the bottom left, clear of everything. |

Observations from the screenshots (desktop, phone, dark; `docs/review/iter-1/i1-station-powermap-reciprocal/`):

- In the mirror view of the first preset the stage-1 ghost, the result and the four connectors all lie on Re w = 1/2 (a vertical line is its own mirror image). The flip is visible in the hollow dot (0.5 + 0.5i) and the filled dot (0.5 - 0.5i) and in the ramp direction; for the presets `|z| = 1` and `|z - 1.5| = 0.5` the dashed connectors fan out clearly.
- In the powermap w-plane at n = 6 the Cartesian grid image is busy by nature; the polar grid at n = 6 is the cleaner picture of "n times round".
- Verified in the browser through `tests/interact/i1-station-powermap-reciprocal.mjs` (P1 to P11, R1 to R10; desktop, phone, dark) and an ad hoc edge-case script (c = 0, z = 0 at the sector corner, n = 6 with x = 3 refit, p = 0 with the sphere, a = b refusal, reduced motion on every play button, theme switch while mounted): no console error, no horizontal overflow.
