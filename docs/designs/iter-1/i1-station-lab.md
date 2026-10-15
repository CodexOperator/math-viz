# Design: i1-station-lab

Goal: `js/stations/lab.js` (wave 1, kind `lab`, size L). The Mapping Lab: the student's "Tom Riddle diary".
Owned file: `js/stations/lab.js`. By the convention of the other goals this design also fixes the two test files the
builder creates next to it: `tests/unit/i1-station-lab.test.mjs` and `tests/interact/i1-station-lab.mjs`. Nothing else may be edited.
Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md` (sections 0 to 5, 8), `docs/ARCHITECTURE.md` (1 to 10),
`docs/goals/iter-1.json` (entry `i1-station-lab`), `docs/PIPELINE.md`, the wave-0 sources `js/core/*.js`, `js/data/*.js`, `js/registry.js`, `js/app.js`,
`index.html`, `css/theme.css`, `css/components.css`, `tools/smoke.mjs`, `tests/interact/_helpers.mjs`, the wave-0 residue and sync notes.

Status of this design. The Lab does not exist yet and no other station exists. Everything numeric in section 6 was computed by running the
shipped core modules (`complex.js`, `parse.js`, `shapes.js`, `mapping.js`, `domaincolor.js`, `three-view.js`, `data/*.js`) in Node 22. Three
behaviours the design leans on were also checked in headless Chromium with throw-away pages (scratch only, nothing in the repo):
(a) a draw-mode plane delivers fractional pointer coordinates (a Playwright drag from `planePixel(0.5, 0.5)` to `planePixel(1.5, 1.5)` reports
`z = 0.4999997 + 0.5000000i` and `1.5000004 + 1.5000001i` at 1280 and 390 wide, so snapping is needed to hit the exact corners of A2);
(b) one `createView3D` can take a modulus landscape, then a Riemann sphere, then a 4D graph (each added and `disposeObject`-ed in turn) and can be disposed and
created again, with no console error; (c) `pushForward(circle |z-1|=1, 1/z, { clampRadius: 1e9 })` returns two pieces that
`joinAcrossInfinity` (5.8) merges into one. Numbers that come from these runs are marked "(run)". Where this document and `ARCHITECTURE.md`
differ, the table in section 0 says why.

---

## 0. Reading notes: what is pinned, what this design adds, what differs from ARCHITECTURE

The goal text, `ARCHITECTURE.md` 4 and 9 and the six acceptance criteria are binding. This design adds the following. Every item is additive
except D1, D6 and D9, which deliberately depart from a sentence in ARCHITECTURE; the reason is given.

| # | Decision | Why |
|---|---|---|
| D1 | **The Lab opens blank** (no shape) unless a `lab.request`, a token preset or stored `lab.strokes` exist. ARCHITECTURE 4.2 says "no preset: the station's first problem" (that would be x = 2 under z^2). | A2 draws one rectangle and then asserts `shapes().length === 1` and, after Undo, `0`. A pre-loaded line would make both wrong. The blank state shows a call to action (the six presets) instead. |
| D2 | **`lab.strokes` is a plain array of Specs**: the `LabRequest.shapes` objects of ARCHITECTURE 4 plus two more kinds (`freehand`, `cartGrid`; `sector` gains optional `fillRays`, `fillArcs`, `grid`). Sections 4.3 and 4.4 pin the format. The `graph4d` station (concurrent goal) reads it. | ARCHITECTURE 9 says only "lifts store key lab.strokes when present". A format both stations agree on has to be written down once; this is the natural one (it already is the request format). The graph4d design reads it tolerantly (section 10). |
| D3 | **Snap to grid is on by default** (`#lab-snap`). Corners, centres and radii land on a lattice of `niceGridStep(unitsAcross)/4` (0.25 at the start view); sector tools snap radius to that step and angle to 15 degrees. The brush is never snapped. | A2 needs the corners of the dragged rectangle to be exactly 0.5 and 1.5 (tolerance 1e-6) and the pointer gave errors of about 4e-7 in the check above (it depends on the viewport and the scale), too close to the tolerance to rely on. It also makes the shapes the student draws exact (a circle of radius 1), which is what a diary for test problems should do. |
| D4 | **Predict first has a guess pad.** While `answerHidden = predict && !revealed`, `#lab-wplane-wrap` is hidden (`hidden` attribute and `aria-hidden="true"`), and `#lab-guess-wrap` (a plane `lab-gplane` the student sketches on, plus `#lab-reveal`) takes its place. After Reveal the sketch is drawn dashed on the w-plane. | STORY 6 step 4: "draw your guess with the brush on the w-plane; reveal". A2/A4 only require the wrapper to be hidden and `#lab-reveal` visible. |
| D5 | **Stroke colour = family colour when the shape is native to an address, else the plane's own token** (`--cart` for lines, rectangles and the Cartesian grid; `--polar` for circles, rays, sectors, annuli and the polar grid; `--input` on the z-plane and `--output` on the w-plane for the brush, polygon and segment). Input versus output is carried by the panel badges (green INPUT, purple OUTPUT), the cursor dots and the morph blend. | ARCHITECTURE 10.5.3 (a MUST) says colour by `curve.family`; CONSTRAINTS says `--input`/`--output` are the z-plane and w-plane strokes in mapping views. Both hold for the Lab this way: a polar-native shape keeps its colour across the map (the image of a circle is an orange curve), the frame says which plane you are looking at. |
| D6 | **Mouse wheel zooms a plane only when it has focus (or with Ctrl/Cmd)** (`wheel: 'focus'`, the plane default). ARCHITECTURE 3.5 says `'always'` "is for the Lab". | `'always'` turns the plane into a scroll trap on a page that is five screens long (the wheel over the picture would never scroll the page). The zoom buttons, `+`/`-`/`0` keys, pinch and Ctrl+wheel stay. A drawn stroke focuses the plane, so the wheel works right after drawing. |
| D7 | **The time cursors are drawn by the Lab** (layers at order 200 using `drawDot`), not by `addCurve({ cursor })`. | `drawTimedCurve` places its cursor at `clamp(t)` on the curve it belongs to. An image *piece* covers only a sub-range of t, so the built-in cursor would sit at a piece end while the image is at a pole. The Lab places the w cursor with `pointOnPieces` and hides it in a gap (ARCHITECTURE 10.5.2), and colours the dots `--input` / `--output`. |
| D8 | **The sphere view pushes forward with `clampRadius: 1e9` and then joins pieces across infinity** (`joinAcrossInfinity`, 5.8). | The default clamp cuts an image 3 degrees short of the north pole and `pushForward` cuts a pole leap, so the line Re w = 1/2 would show a gap at the pole. STORY 5: "the sphere view shows the same stroke going over the pole cleanly". |
| D9 | **Sector and polar-grid tools draw a polar rectangle between two corner points**, with a "Fan from 0" option (`#lab-sector-fan`, on by default): `r0 = 0`, `r1 = max(abs(A), abs(B))`, angles from `Arg A` to `Arg B` (the shorter way round, at most a half turn). The Cartesian-grid tool draws a Cartesian rectangle with grid lines. The rectangle tool is the Cartesian rectangle. | Thread 1 on the tool palette: rectangle and sector are the same gesture in the two addresses. `shapes.sector` is always centred at 0 (a fan or a polar rectangle), so a "centre and two radii" gesture would not map onto it. |
| D10 | **The problem panel is automatic**: `detectProblem(specs, fn)` (5.14) recognises the five handout set-ups (exact shape and function) and shows the statement, both addresses' working, the answer and a numeric check on the picture. A `problem` hint from a request or a preset is honoured until the student edits the drawing or the function. | Success criterion 2 of the assignment (say which address makes it easy and why) and "Every numeric answer shown in the UI must match a hand-checked value" (CONSTRAINTS). |
| D11 | **The w-plane and the morph plane auto-fit** to the image (`imageBounds`, 5.9) after a commit or a function change, until the student pans or zooms that plane; its Reset button fits again. | Under `z^2` the image of the line x = 2 is 40 units wide; under `(1+i)z` the unit circle image is 3 units wide. A fixed w view hides one or the other. |
| D12 | **Extra ids beyond ARCHITECTURE 9** (all prefixed `lab-`, all additive): section 4.6 lists them. Nothing in section 9 is renamed. | The tools, views and 3D legends need controls the planner did not list. |
| D13 | **Defaults**: `fn = sq` (z^2), `view = side`, `t = 0.4`, `s = 0.5`, grid `cart`, tool `brush`, snap on, predict off. | `t = 0.4` keeps the clock ring off the dots drawn at t = 0, 1/4, 1/2, 3/4. The planner's goal text does not fix them. |
| D14 | **Drawing is pointer and touch only in iteration 1.** The keyboard path is the six presets, the function chips and field, the clock, the probe handle (arrow keys) and the tab list. | A keyboard drawing mode (a virtual crosshair) would fight the plane's own arrow-key panning; "shape by numbers" is recorded in section 9 as the first thing to add. |
| D15 | **The 3D view is created per 3D tab and disposed on leaving it** (landscape, sphere and 4D have different axes, grids and labels in `createView3D`). | One WebGL context at a time; verified in Chromium (b above) that dispose and create are clean. |

Differences from ARCHITECTURE that are only wording: the readout adds `; s = <s>` in the morph view and puts the probe on a second line;
`#lab-wplane-wrap` is the "w-plane wrapper" of A4; `window.__mv.lab` has more members than `{ shapes, images, view }`.

---

## 1. Goal, story thread, problems

**Goal.** One station, route `#lab`, that lets the student draw any stroke or shape on the z-plane, pick any function from the test (or type one),
and watch the image appear under f in six views that all run on one clock. It is the place where every "find the image of ..." question is
answered by "draw it, push it forward, read it", and where the four-dimensional graph of `w = f(z)` is walked around instead of imagined.

**Story thread carried (all three meet here).**

- **T1, one point, two addresses.** The tool palette has a Cartesian rectangle and a polar rectangle (sector), a Cartesian grid and a polar grid, side by side.
  Strokes are coloured by the address they are native to (blue = Cartesian, orange = polar). The grid chips draw the Cartesian or the polar grid on every plane, so the
  student sees which grid `z^n` and `1/z` respect and which they bend. The probe shows a point z and its image w with **both addresses of each** in the explainer
  (Cartesian column, polar column, "easy in Polar" badge on the row "what f does to (r, theta)").
- **T2, the staircase.** The probe draws `Arg z` as the solid arc and `arg z` as faint extra windings on the z-plane, and `Arg w` and `arg w` on the w-plane;
  next to them two staircases (`arg z`, `arg w`) with the home step highlighted and a sentence that says how f moved the steps ("3 * Arg z = 9.425 (3pi)
  wraps to Arg w = 3.142 (pi)"). The movable-seam cube root (`#lab-fn-cbrt-seam`) shows a branch cut as a colour jump in domain colouring and as a cut in the image. In domain
  colouring the hue is `arg w` (every step theta + 2 pi k has one colour), so the set `arg` is literally the colour.
- **T3, a function is a motion.** Every stroke carries `t` in [0, 1] and every image point carries the same `t`: dark to bright along both strokes, a clock ring on
  both, a play button, a scrubber, a morph slider `s` for `(1 - s) z + s f(z)`. The 3D views (landscape, sphere, 4D graph) are shadows of one object, the graph
  `{(x, y, u, v)}`; the clock marker rides each of them.

**Review problems covered** (assignment refs of the goal): **2.1.2, 2.1.3, 2.2.1, 2.5.1, P4**; topics **T2.1, T2.2, T2.5** (T1.5 appears through the two shape
presets 1.5.1 and 1.5.2, which load shapes only, and through the one-line shape classification of 4.7).

| Problem | Preset chip (shape, function) | What to look at | Address that makes it easy | The aha the Lab must make visible |
|---|---|---|---|---|
| 2.1.2 image of x = 2 under z^2 | `#lab-preset-x2` (line x = 2, y in [-4, 4]; z^2) | side by side, then the probe on the line | Cartesian, with time: the line is `2 + iy`, y is the clock | the blue line becomes a parabola through 4, the clock runs from -12 - 16i to -12 + 16i through 4 at t = 1/2 |
| 2.1.3 image of x = 2 under iz - 2i | `#lab-2-1-3` or x = 2 then chip `iz - 2i` | side by side; the image is a segment of the real axis | polar for the motion (quarter turn), Cartesian for the line | the whole line lands on v = 0 |
| 2.2.1 image of 0 < arg z < pi/4 under z^3 | `#lab-preset-sector` (fan r in [0, 2]; z^3) | side by side, domain colouring | polar | the fan opens three times wider; hue runs 3 times as fast |
| 2.5.1 image of abs(z - 1) = 1 under 1/z | `#lab-preset-circle1` (circle centre 1 radius 1; 1/z) | side by side, then the sphere | polar | the circle opens into the line Re w = 1/2 because 0 goes to infinity; on the sphere it closes over the pole |
| P4 (1 + i)z, unit circle to radius sqrt 2 | `#lab-preset-unit` (unit circle; (1+i)z) | side by side | polar | spin 45 degrees, stretch sqrt 2, every point of the big circle is hit |
| 1.5.1 line from 2 + i to -3 - 3i (shape only) | `#lab-preset-segment` (segment; keeps your f) | the clock rides `(2 - 5t) + i(1 - 4t)` | Cartesian | a slide that grows with time |
| 1.5.2 annulus 1 < abs(z + i) <= 3 (shape only) | `#lab-preset-annulus` (centre -i, radii 1 and 3; keeps your f) | the ring and its interior rings and rays under f | polar | a ring around -i |

---

## 2. UX

### 2.1 Page anatomy and wireframes

One station, one `<h1>` (the registry title "The Mapping Lab"), top to bottom:

1. `header.station-header`: h1, one-paragraph lede, thread badges T1 T2 T3, five problem chips (2.1.2, 2.1.3, 2.2.1, 2.5.1, P4), each an `<a class="chip problem-chip" href="#problem-2-1-2" title="<aha>">`.
2. `#lab-presets` panel: "Start from a test problem", six preset groups, one-line help, `#lab-start-notice` (unknown preset token).
3. `#lab-bench` (the tool bench): tool chips, tool hint, undo, clear, snap, grid chips, tool options row, `#lab-notice`.
4. `#lab-views` tab list.
5. `#lab-stage` (tab panel): INPUT panel with `#lab-zplane` and OUTPUT panel (w-plane, morph plane, 3D view or guess pad).
6. `#lab-clock`: Play, `#lab-t`, `#lab-s` and Play morph (morph view only), Predict first.
7. `#lab-fnpanel`: function chips (grouped), `#lab-fn-src` field, error line, note on the active function.
8. `#lab-readout` (plain text, what the scripts read).
9. `#lab-problem` (only when a problem is recognised).
10. `#lab-probe-panel` (only when the probe has been used): the two-column explainer and the two staircases.
11. `nav.station-links`.

**Desktop wireframe (main column about 950 px; two planes 463 px wide each).**

```
+--------------------------------------------------------------------------------------------------+
| The Mapping Lab                                                    (o T1) (o T2) (o T3)          |
| Draw on the left. The picture on the right shows where f carries it. Every point keeps its time   |
| t, so you can see which part of your drawing lands where.                                        |
| [2.1.2] [2.1.3] [2.2.1] [2.5.1] [P4]                                                             |
+--------------------------------------------------------------------------------------------------+
| Start from a test problem                                                                        |
| [x = 2 -2.1.2] [|z-1| = 1 -2.5.1] [Unit circle -P4] [Sector 0<arg z<pi/4 -2.2.1]                  |
| [Annulus 1<|z+i|<=3 -1.5.2] [Segment 2+i to -3-3i -1.5.1]                                        |
| Loading one replaces your drawing. Undo brings it back.                                          |
+--------------------------------------------------------------------------------------------------+
| Draw                                                                                             |
| [Brush][Line][Rectangle][Circle][Polygon][Grid][Polar grid][Sector][Ring][Probe][Move]           |
| Rectangle: drag from one corner to the opposite corner.                                          |
| [Undo] [Clear]   [x] Snap to grid     Grid on the planes: [Cartesian][Polar][Both]               |
| (options for the chosen tool, e.g. [x] Fan from 0 | Inner radius ---o--- 0.50 | [Close polygon])  |
+--------------------------------------------------------------------------------------------------+
| View: [Side by side] [Morph] [Domain colouring] [Modulus landscape] [Riemann sphere] [4D graph]  |
+------------------------------------------+-------------------------------------------------------+
| [INPUT] z-plane: where you draw          | [OUTPUT] w-plane: where f sends it                    |
| +--------------------------------------+ | +---------------------------------------------------+ |
| |                          . y          | | |                                                   | |
| |         (rect, snapped)  |   [+][-][R]| | |   (image, same ramp)                    [+][-][R] | |
| |      ----+====+----------+---- x      | | |                                                   | |
| |          |    |          |            | | |                                                   | |
| |  start>--+====+ end      |            | | |  start>---- end                                    | |
| +--------------------------------------+ | +---------------------------------------------------+ |
| Last shape: rectangle, closed, simple,   | Auto-fit is on.  (or: Auto-fit is off. Press Reset on |
| positive (counterclockwise), 4 corners   | the plane to fit again.)                              |
+------------------------------------------+-------------------------------------------------------+
| Time  [> Play]  t [-----o--------] 0.40                    [ ] Predict first                     |
|       (morph view only)  Morph s [-----o----] 0.50   [> Play morph]                              |
+--------------------------------------------------------------------------------------------------+
| Pick f                                                                                           |
| Powers and roots:  (z^2)(z^3)(z^n)  n [--o--] 3   (sqrt z)(z^(1/3))(z^(1/3), movable seam) seam [o] |
| Linear and reciprocal: (iz - 2i)(1 + i)z)(1/z)(e^z)                                             |
| From the problems: (z^2 + iz)(z^2 + z)                                                           |
| Not analytic (they flip or squash): (conj z)(Re z)(|z|^2)(z^2/|z|^2)((Re(1+z) - 1)/z)            |
| Or type your own f(z):  [ z^2 + iz                         ] [Use this function]                 |
| (error sentence, empty when fine)                                                                |
| Squares the length and doubles the angle.                                                        |
+--------------------------------------------------------------------------------------------------+
| f = z^2; shapes: 1; view: side; t = 0.4                                                          |
| z = 1 + i -> w = 2i                                      (second line only when the probe is on) |
+--------------------------------------------------------------------------------------------------+
| Problem 2.5.1 ... (statement) ... [Easiest in: Polar]  > How each address does it  > Answer and check |
+--------------------------------------------------------------------------------------------------+
| Probe: follow one point    [Hide the probe]                                                      |
| explainer (Cartesian | Polar, rows z, w, u, v, f on (r, theta), same point)  | staircase arg z     |
|                                                                              | staircase arg w     |
+--------------------------------------------------------------------------------------------------+
| < Previous place      Next place >        T1 ... T2 ... T3 neighbours                             |
+--------------------------------------------------------------------------------------------------+
```

**Phone wireframe (390 px wide; 16 px gutters; planes 358 px square, stacked; everything wraps, no horizontal page scroll).**

```
+--------------------------------+
| The Mapping Lab                |
| lede (3 lines)                 |
| (T1)(T2)(T3)                   |
| [2.1.2][2.1.3][2.2.1][2.5.1]   |
| [P4]                           |
+--------------------------------+
| Start from a test problem      |
| [x = 2 -2.1.2]                 |
| [|z-1| = 1 -2.5.1]             |
| [Unit circle -P4]  ... (wrap)  |
+--------------------------------+
| Draw                           |
| [Brush][Line][Rectangle][Circ] |
| [Polygon][Grid][Polar grid]    |
| [Sector][Ring][Probe][Move]    |
| hint line                      |
| [Undo][Clear][x] Snap          |
| Grid: [Cart][Polar][Both]      |
+--------------------------------+
| [Side][Morph][Domain]          |
| [Landscape][Sphere][4D]        |
+--------------------------------+
| [INPUT] z-plane                |
| +----------------------------+ |
| |      358 x 358             | |
| +----------------------------+ |
| Tip: your finger draws here;   |
| scroll by touching beside it.  |
| [OUTPUT] w-plane               |
| +----------------------------+ |
| |      358 x 358             | |
| +----------------------------+ |
| [> Play] t [---o---] 0.40      |
| [ ] Predict first              |
| Pick f ... chips wrap ...      |
| f field (full width) [Use]     |
| readout (wraps)                |
| problem / probe panels         |
| (explainer stacks Cartesian    |
|  above Polar below 560 px)     |
+--------------------------------+
```

**Domain view (desktop).** The same stage. The z-plane is painted by f (hue = Arg f(z), brightness = |f(z)|, faint rings), the w-plane is painted by the plain wheel (f = identity), strokes are
drawn black-and-white (`--text` with a `--surface` halo). Under the planes: the legend row.

```
| [INPUT] z-plane, painted by f            | [OUTPUT] w-plane, painted by the plain wheel          |
| (hue runs twice round 0 for z^2)         | (the image on the colours it lands on)                |
+------------------------------------------+-------------------------------------------------------+
| (wheel 96px)  Colour is the angle of f(z). Brightness is its size. Strokes are black and white     |
|               so the colours show through.      > How to read the colours (DOMAIN_LEGEND.details)  |
```

**Predict state (answer hidden).**

```
| [INPUT] z-plane                          | [GUESS] Your guess, in the w-plane                    |
| (the drawing, f chosen)                  | +---------------------------------------------------+ |
|                                          | | (empty plane; draw your guess with the brush)     | |
|                                          | +---------------------------------------------------+ |
|                                          | Sketch what you expect the image to look like, then   |
|                                          | press Reveal. The scale is yours: zoom with + and -.  |
|                                          | [Reveal the image]  [Clear my guess]                  |
```

**3D views.** The OUTPUT panel holds `#lab-view3d` (4:3, `createView3D`), under it the legend: wheel + sentence (landscape), the hidden-ramp gradient + sentence (4D, with the two angle sliders
`#lab-4d-uv`, `#lab-4d-yv` and `#lab-4d-readout`), or the three chips `#lab-sphere-z`, `#lab-sphere-w`, `#lab-sphere-both` (sphere).

### 2.2 Controls (every control, id, label, behaviour)

Naming rule: every id starts `lab-`. Every control has a visible label or an `aria-label`. Chips are `<button type="button" class="chip">` unless said otherwise.

**Presets (`#lab-presets`).** Each of the six is a group `<div class="lab-preset" id="lab-preset-<key>" role="group" data-problem="<id>">` holding a load `<button class="chip" id="lab-preset-<key>-load">`
(flex 1, so the group's centre is on the button) and a link `<a class="chip problem-chip" href="#problem-<id with dashes>">`. A click anywhere on the group that is not on the link loads the preset
(`clickChip(page, 'lab-preset-unit')` clicks the group's centre). Keys: `x2` (label "x = 2", problem 2.1.2), `circle1` ("|z - 1| = 1", 2.5.1), `unit` ("Unit circle", P4), `sector` ("Sector 0 < arg z < pi/4", 2.2.1), `annulus`
("Annulus 1 < |z + i| <= 3", 1.5.2), `segment` ("Segment 2 + i to -3 - 3i", 1.5.1). Loading replaces the drawing (undoable), sets the function when the preset has one (first four), resets
Reveal, moves the clock to the default, resets the z view to the start view, and (on a phone) scrolls the stage into view if its top is below 60 percent of the viewport.

**Tools (`#lab-tools`, `role="group"`, `aria-label="Drawing tools"`).** `aria-pressed` on the chosen one. Exactly one is pressed.

| id | Label | Gesture on the z-plane | Draw mode |
|---|---|---|---|
| `lab-tool-brush` | Brush | press, drag, release: free curve (default tool) | on |
| `lab-tool-line` | Line | press at one end, drag, release at the other: a segment | on |
| `lab-tool-rect` | Rectangle | press at one corner, drag, release at the opposite corner | on |
| `lab-tool-circle` | Circle | press at the centre, drag out, release: radius = distance | on |
| `lab-tool-polygon` | Polygon | click to add corners; click the first corner, double-click, press Enter or `#lab-polygon-close` to close | on |
| `lab-tool-cartgrid` | Grid | drag a rectangle; it fills with vertical and horizontal lines | on |
| `lab-tool-polargrid` | Polar grid | drag between two corners of a polar rectangle; fills with circles and rays | on |
| `lab-tool-sector` | Sector | drag between two corners of a polar rectangle (outline plus a sparse interior) | on |
| `lab-tool-annulus` | Ring | press at the centre, drag out: outer circle; inner circle = ratio x outer | on |
| `lab-tool-probe` | Probe | drag anywhere (or the green dot): the probe z follows; panel appears | on |
| `lab-tool-pan` | Move | drag pans, pinch and Ctrl+wheel zoom | off |

`#lab-tool-hint` (`aria-live="polite"`) shows the hint sentence of the chosen tool (2.5). `title` carries the same sentence.

**Edit row.** `#lab-undo` ("Undo", disabled when the history is empty), `#lab-clear` ("Clear", disabled when there are no shapes), `#lab-snap` (checkbox "Snap to grid", checked),
grid chips `#lab-grid-cart` "Cartesian", `#lab-grid-polar` "Polar", `#lab-grid-both` "Both" (aria-pressed; call `plane.setGrid` on all four planes).

**Tool options row (`#lab-tool-options`, one child visible at a time).** `#lab-sector-fan` (checkbox "Fan from 0", checked; for Sector and Polar grid), `#lab-ring-ratio` (range 0.1 to 0.9, step 0.05, value 0.5, label
"Inner radius as a fraction of the outer", output `#lab-ring-ratio-out`; for Ring), `#lab-polygon-close` (button "Close polygon", enabled with 3 or more corners; for Polygon). `#lab-notice` (`role="status"`) shows transient messages for 5 s.

**Views (`#lab-views`, `role="tablist"`, `aria-label="View"`).** `#lab-view-side` "Side by side", `#lab-view-morph` "Morph", `#lab-view-domain` "Domain colouring", `#lab-view-landscape` "Modulus landscape",
`#lab-view-sphere` "Riemann sphere", `#lab-view-graph4d` "4D graph". Each `role="tab"`, `aria-selected`, `aria-controls="lab-stage"`, roving `tabindex`; Left/Right/Home/End move and activate. `#lab-stage` has
`role="tabpanel"`, `aria-labelledby` the active tab, `data-view`, `data-predict`, `data-revealed`, `data-fn`, `data-shapes`.

**Stage.** INPUT panel `#lab-zpanel`: plane `lab-zplane` (ids from `createPlane`: `lab-zplane-viewport`, `lab-zplane-canvas`, `lab-zplane-zoom-in`, `-zoom-out`, `-zoom-reset`, handle button `lab-zplane-probe`),
domain canvas `#lab-zplane-dc`, empty hint `#lab-zempty`, `#lab-shape-info`. OUTPUT area `#lab-out` holds exactly one visible child: `#lab-wplane-wrap` (side, domain: plane `lab-wplane`, canvas `#lab-wplane-dc`, hint `#lab-wempty`,
note `#lab-wfit-note`), `#lab-morph-wrap` (plane `lab-mplane`), `#lab-view3d-wrap` (container `#lab-view3d`, legend `#lab-view3d-legend`), or `#lab-guess-wrap` (plane `lab-gplane`, `#lab-reveal`, `#lab-guess-clear`).
`#lab-wheel` (canvas) with `#lab-wheel-text` and `#lab-wheel-details` is the legend of the domain and landscape views, `#lab-dc-status` (live) says "Sharpening the picture..." while the domain canvas refines.

**Clock (`#lab-clock`).** `#lab-play` (button: "Play"/"Pause"; "Step" under reduced motion), `#lab-t` (range 0 to 1, step 0.01, label "Time t", output `#lab-t-out`), `#lab-s` (range 0 to 1, step 0.01, label "Morph s", output `#lab-s-out`, visible in
the morph view only), `#lab-morph-play` ("Play morph"; reduced motion: "Show the other end", toggles s between 0 and 1), `#lab-predict` (toggle chip "Predict first", aria-pressed).

**Function panel.** Chips `#lab-fn-<FUNCTIONS id>` for all 15 entries of `FUNCTIONS` (`sq cube recip linear-i linear-1i sq-plus-iz sq-plus-z exp conj re abs2 dir sqrt cbrt x-over-z`), `#lab-fn-zn` ("z^n") with slider `#lab-n` (2 to 8, step 1,
default 3, output `#lab-n-out`, label "Power n"), `#lab-fn-cbrt-seam` ("z^(1/3) with a movable seam") with slider `#lab-seam` (min -3.141592653589793, max 3.141592653589793, step 0.2617993877991494 (15 degrees, so every value is an exact multiple of pi/12 and the output can say "-pi/2"), default -3.141592653589793 (the principal branch), output `#lab-seam-out` showing
`fmtAngle(seam, { unicode: true })`, label "Seam angle"), text field `#lab-fn-src` (label "Or type your own f(z)"), `#lab-fn-apply` ("Use this function"), `#lab-fn-error` (`role="status"`, empty when fine), `#lab-fn-echo` (the typed text with the
bad part underlined; hidden when there is no error), `#lab-fn-note` (the note of the active function). Touching `#lab-n` or `#lab-seam` selects its chip. Exactly one chip is pressed, or none when a typed function is active.

**Readout.** `#lab-readout` (`class="readout"`): see 5.15 for the exact text.

**Problem panel.** `#lab-problem` (`data-problem`), `#lab-problem-statement`, `#lab-problem-why`, `#lab-problem-ways` (details), `#lab-problem-answer` (details), `#lab-problem-answer-tex`, `#lab-check`, link `#lab-problem-link`.

**Probe panel.** `#lab-probe-panel`, `#lab-probe-off` ("Hide the probe"), explainer id `lab-ex` (cells `lab-ex-<row>-<col>`, footer `lab-ex-same`), staircases `lab-stairs-z` and `lab-stairs-w`, `#lab-angle-story`.

**3D extras.** `#lab-sphere-z` ("Your drawing z"), `#lab-sphere-w` ("Its image w"), `#lab-sphere-both` ("Both"); `#lab-4d-uv` (range 0 to 6.2832, step 0.0873, label "Turn the Re surface into the Im surface (u-v angle)"),
`#lab-4d-yv` (label "Swap input and output (y-v angle)"), `#lab-4d-readout`.

**Live region.** `#lab-sr-status` (`.sr-only`, `aria-live="polite"`) receives one short sentence per action ("Rectangle added. 1 shape."; "Loaded problem 2.5.1."; "Undid the last change."; "Image revealed.").

### 2.3 Interaction

**Pointer and touch (all tools except Move).** Events come from `plane.on('pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel')` on `lab-zplane` with `setDrawMode(true)`; only the primary pointer draws
(`e.isPrimary`); a second finger is ignored; `pointercancel` discards the draft. Press-drag-release tools (brush, line, rectangle, circle, cartgrid, polargrid, sector, annulus) commit on `pointerup` and discard a shape smaller than 6 px
(a click draws nothing). The draft is drawn live on the z-plane (dashed `--input`) and its image is pushed forward and drawn live on the output plane (side, domain and morph views), once per animation frame.
Polygon: a click (movement under 6 px) adds a corner; a rubber band follows the pointer; clicking within 12 px of the first corner (3+ corners), a double-click (two clicks within 350 ms and 8 px), Enter or `#lab-polygon-close` closes it; Backspace removes the last corner; Escape cancels.
The probe tool moves the probe to the pointer on press and while dragging; the green dot is also a normal draggable handle. Touch: the plane's canvas has `touch-action: none` in draw mode, so a finger on the picture draws and never scrolls: the page scrolls by touching beside or below
it (a tip line says so on coarse pointers). Move tool: plane default (drag pans, pinch zooms).

**Keyboard.** Tab order follows the DOM order above. Tabs: arrows. Tool chips and every other control are buttons or inputs and work with Enter/Space. The z-plane viewport is focusable (plane default): `+`, `-`, `0` zoom/reset, arrows pan.
The probe handle `#lab-zplane-probe` moves with the arrow keys (Shift x10, Alt /10). Document-level keys (only when focus is on the z-plane viewport or the body, never in a text field): `Escape` cancels a draft, `Enter` closes a polygon draft, `Backspace` removes
its last corner, `Ctrl/Cmd+Z` undoes. `#lab-fn-src`: Enter applies.

**Focus.** The Lab never moves focus by itself (ARCHITECTURE 10.1.2). After Reveal, focus moves to the output that just appeared (the plane viewport, or the 3D wrapper). After Apply with an error, focus stays in the field.

**Clock.** `#lab-play` runs `t` from its current value to 1 in `4 s * (1 - t)`, pauses 0.6 s at 1, then restarts at 0, until paused. Moving `#lab-t` by hand pauses playback. Under reduced motion `#lab-play` is "Step": each press moves t to the next multiple of 0.1
(from 1.0 back to 0). `#lab-morph-play` runs s from 0 to 1 in 2.5 s and stops (reduced motion: toggles 0 and 1).

### 2.4 States

| State | What the student sees |
|---|---|
| Empty (no shapes) | z-plane overlay `#lab-zempty`: "Draw here. Pick a tool above, or load a test problem." Output plane overlay `#lab-wempty`: "Nothing to carry yet. Draw something on the left." Presets panel is the first thing under the header. |
| Shapes but f has no value on them | `#lab-wempty`: "f has no value on your drawing: it is undefined there, or too far away to show." (no image piece, or every point has no value) |
| Predict, not revealed | output hidden, guess pad shown, readout line ends `; image hidden (predict first)`; the probe panel shows only z; the answer details of the problem panel are hidden |
| Parser error | `#lab-fn-error` shows `err.message` verbatim; `#lab-fn-echo` shows the typed text with `err.position`/`err.length` underlined; f unchanged |
| Unknown preset token (`#lab-foo`) | `#lab-start-notice`: "There is no preset called "foo". Here is the blank Lab." and the blank Lab |
| Request partly invalid | `#lab-notice`: "Some shapes from the other page could not be drawn." |
| Too many shapes (40) | `#lab-notice`: "That is 40 shapes. Undo or clear one before adding more." |
| Short stroke | `#lab-notice`: "That stroke was too short to keep." |
| 3D loading | the 3D view is created synchronously on the next animation frame; the wrapper shows the 3D view's own hint; no spinner is needed |
| WebGL unavailable | `three-view` prints its own message in the container; the Lab adds under it: "The 3D view needs WebGL, which this browser has switched off. The flat views still work." |
| Canvas unavailable | the plane's own note (plane.js) |
| Storage blocked | silent: the drawing lives for the page only |
| Domain canvas refining | `#lab-dc-status`: "Sharpening the picture..." |
| Reduced motion | Play is Step; Play morph jumps; nothing else animates |

### 2.5 Copy (exact strings; plain; ASCII minus in generated numbers; the typographic minus and pi are allowed in labels only)

- **h1**: "The Mapping Lab" (registry title).
- **Lede**: "Draw on the left. The picture on the right shows where f carries it. Every point keeps its time t, so you can see which part of your drawing lands where."
- **Presets heading**: "Start from a test problem". Help: "Each button draws the shape from a test question and picks its function. Loading one replaces your drawing; Undo brings it back."
- **Tools heading**: "Draw". Tool hints:
  - Brush: "Brush: press and drag to draw any curve."
  - Line: "Line: drag from one end to the other."
  - Rectangle: "Rectangle: drag from one corner to the opposite corner."
  - Circle: "Circle: drag from the centre outward."
  - Polygon: "Polygon: click to add corners. Click the first corner, double-click or press Enter to close it."
  - Grid: "Grid: drag a rectangle. It fills with vertical and horizontal lines."
  - Polar grid: "Polar grid: drag between two corners of a polar rectangle. It fills with circles and rays."
  - Sector: "Sector: drag between two corners of a polar rectangle: a range of lengths and a range of angles, up to a half turn."
  - Ring: "Ring: drag from the centre outward for the outer circle. The slider sets the inner circle."
  - Probe: "Probe: drag the green dot. It shows z, w = f(z), and both addresses of each."
  - Move: "Move: drag to pan. Pinch or Ctrl and scroll to zoom."
- **Snap**: label "Snap to grid", title "Corners, centres and radii land on a quarter-unit grid, so shapes come out exact. The brush is never snapped."
- **Grid label**: "Grid on the planes". Chips "Cartesian", "Polar", "Both".
- **Fan from 0**: "Fan from 0" with title "On: the sector starts at 0 and opens between the two angles. Off: a polar rectangle between the two lengths."
- **View tab titles** (`title`): Side by side "The z-plane and the w-plane next to each other"; Morph "One plane that slides from z to f(z)"; Domain colouring "Every point painted with the colour of f(z)"; Modulus landscape "Height is the size of f(z)"; Riemann sphere "The plane wrapped onto a sphere; the top point is infinity"; 4D graph "The graph of f in four numbers, shown in 3D".
- **Panel captions**: "z-plane: where you draw" (badge INPUT), "w-plane: where f sends it" (badge OUTPUT), "Morph: (1 - s) z + s f(z)" (badge OUTPUT), "Your guess, in the w-plane" (badge GUESS).
- **Auto-fit note** (`#lab-wfit-note`, only when off): "Auto-fit is off. Press Reset on the plane to fit the picture again."
- **Phone tip** (coarse pointer only): "Tip: your finger draws on the picture. Scroll by touching beside it or below it."
- **Shape info** (`#lab-shape-info`, after a commit): `Last shape: <kind>, <closed|open>, <simple|crosses itself>, <positive (counterclockwise) orientation|negative (clockwise) orientation|no orientation>, <smooth|piecewise smooth, N corners>`; example: "Last shape: rectangle, closed, simple, positive (counterclockwise) orientation, piecewise smooth, 4 corners."
- **Clock**: "Time t", "Play", "Pause", "Step", "Morph s", "Play morph", "Show the other end", "Predict first".
- **Predict**: guess caption above; help "Sketch what you expect the image to look like, then press Reveal. The scale is yours: zoom with + and -."; buttons "Reveal the image" (`#lab-reveal`), "Clear my guess" (`#lab-guess-clear`). Label on the dashed sketch after reveal: "your guess".
- **Function panel**: heading "Pick f"; group titles "Powers and roots", "Linear and reciprocal", "From the problems", "Not analytic (they flip or squash)". Field label "Or type your own f(z)", placeholder "for example z^2 + iz", button "Use this function".
  Field help (`#lab-fn-help`, muted): "You can use z, x, y, i, pi, e, + - * / ^, brackets, and conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos."
  Seam help (shown with the seam chip): "The cube root needs a cut. Move the seam and watch the colours or the image jump."
- **Domain legend**: `DOMAIN_LEGEND.short` + " Your strokes are drawn in black and white so the colours show through." Details summary "How to read the colours" with the five `DOMAIN_LEGEND.details`.
- **Landscape legend**: "Height is the size of f(z). Colour is the angle of f(z), the same hue as domain colouring. Grey tops are cut off at height <H>." (`<H>` = `fmtNum(clamp, 3)`)
- **Sphere legend**: "The plane wrapped onto a sphere. The top point is infinity and the bottom point is 0. Blue strokes are Cartesian shapes and orange strokes are polar ones, for your drawing and for its image. The green dot is z at time t and the purple dot is w = f(z). A brush stroke has no address, so it is drawn green and its image purple." (Strokes keep their address colour, `strokeToken`; only the two time markers and the address-less strokes are green and purple.)
- **4D legend**: "The graph of f is a set of points (x, y, u, v): four numbers. Turning it in the u-v plane changes the Re surface into the Im surface. The 3D picture shows three of the four numbers; the colour is the fourth." Gradient label "hidden number (low to high)". Readout (`#lab-4d-readout`): `showing (x, y, <coord>) with <hidden> as colour; uv = <deg> deg, yv = <deg> deg` where at uv = yv = 0 `<coord>` is `u = Re w` and `<hidden>` is `v = Im w`, otherwise "a mix of u and v" and "the rest".
- **Probe panel**: heading "Probe: follow one point"; button "Hide the probe"; explainer caption "z goes in, w = f(z) comes out"; row labels "z", "w = f(z)", "u = Re w", "v = Im w", "f on (r, theta)"; staircase labels "arg z", "arg w".
- **Problem panel**: heading `Problem <id>`; chip "Easiest in: <addressLabel>" ; summary lines "How each address does it" and "Answer and check on your picture"; link "Open problem <id> on its own page"; check sentences in 5.14.
- **Errors/notices**: as in 2.4.
- **Sr-status**: as in 2.2.

---

## 3. Visual encoding (both themes)

Everything is a token from `css/theme.css`. Canvas code reads tokens at draw time through `cssColor('--token')` (plane layers) or the planes' own helpers, and the planes redraw themselves on `themechange`
(ARCHITECTURE 6). The Lab hard-codes no colour. Token values (for the screenshot review):

| Token | Light | Dark |
|---|---|---|
| `--cart` | #0b63ad | #62adf2 |
| `--polar` | #a84300 | #ff9d5c |
| `--input` | #006e53 | #3fd0a0 |
| `--output` | #9d3a8a | #e48fd2 |
| `--seam` | #6b7384 | #8e99b0 |
| `--t0` / `--t1` (time ramp ends) | #101a30 / #6d83a6 | #5c7498 / #f3f6fb |
| `--text` / `--text-muted` / `--surface` | #1a2230 / #515b6c / #ffffff | #e9edf5 / #a6b0c3 / #151c2b |

| Mark | Encoding | Where |
|---|---|---|
| **Cartesian address** (lines x = c, y = c, rectangles, the Cartesian grid patch, the probe's drop lines and "x = ..., y = ..." labels, the Cartesian column of the explainer, the plane's Cartesian grid) | `--cart`, solid for strokes, dashed drop lines for the probe | z-plane, w-plane, morph, sphere strokes, explainer |
| **Polar address** (circles, sectors, annuli, the polar grid patch, the probe's ray, r label, Arg arc and ghost windings, the polar column, the plane's polar grid) | `--polar` | same |
| **Input** (what you drew when it has no native address: brush, polygon, segment; the draft; the probe point z; the z cursor) | `--input` | z-plane |
| **Output** (the image of those strokes; the probe's w; the w cursor; image draft dashed) | `--output` | w-plane, morph end, sphere |
| **Frames** | panel badges `.badge[data-tone="input"]` "INPUT" (green) and `.badge[data-tone="output"]` "OUTPUT" (purple), `.badge` "GUESS" (neutral); a 4 px top border in the same tone on each panel (`.lab-panel[data-tone]` uses `--tone`) | stage |
| **Time** | each stroke and each image piece is drawn by `plane.addCurve` with `ramp: true`: the base colour mixed toward `--t0` (t = 0, dark) and `--t1` (t = 1, bright) in 32 bins; dots at t = 0, 1/4, 1/2, 3/4 and an arrowhead at t = 1 on primary strokes; the plane draws its own "start ... end" ramp pill (bottom left). The clock ring is a `drawDot` of radius 6 in `--input` (z) or `--output` (w) with a `--surface` halo and the label "z(t)" / "w(t)" on the first primary stroke. The image uses the identical ramp, so "when" matches "where" | z, w, morph, sphere (three-view's own ramp from the same tokens), 3D markers |
| **arg versus Arg** | `drawPolarAddress(ctx, plane, z, { ghosts: 2, ghostsNeg: 1 })`: the solid arc labelled `Arg z = ...` is the one chosen angle in (-pi, pi]; up to three faint extra windings labelled "also ..." (`--ghost-alpha`, at most 0.35) are the other members of the set arg z; the point is drawn once. Same on the w-plane with name `w`. Beside them two staircases (`lab-stairs-z`, `lab-stairs-w`): ghost steps `--polar` at reduced alpha, home step full `--polar`, the home band shaded. In domain colouring the hue is `arg w`: one colour per class theta + 2 pi k | probe on both planes, probe panel, domain view |
| **Seam** | `drawSeam`: dashed `--seam` ray with the word "seam" at angle pi on the z-plane when the probe is on or f is `sqrt`, `cbrt` or the seam function; at the chosen angle sigma for the seam function; at angle pi on the w-plane when the probe is on | z-plane, w-plane |
| **Domain colouring** | hue = `Arg w / 2 pi` (red at the positive real axis, going counterclockwise), lightness `1 - 1/(1 + sqrt(abs(w)))` times the ring factor `0.88 + 0.12 frac(log2 abs(w))`; black at 0, white at infinity; identical in both themes. Strokes: `--text` with a `--surface` halo (4 px wider, alpha 0.9) | domain view (z-plane painted by f, w-plane by the identity) |
| **Wheel legend** | `drawColorWheel(canvas, { size: 96 })`, redrawn on `themechange` (its outline reads `--border`) | domain and landscape legends |
| **Landscape** | `modulusLandscape`: height abs(w), hue = Arg w (plain HSL(hue, 0.8, 0.5), "the same hue" as domain colouring, not the same colour: ARCHITECTURE 10.5.4); lifted strokes `--text`; floor marker `--input`, surface marker `--output`, a thin `--text-muted` drop line between them | landscape view |
| **4D graph** | `graph4D`: the hidden coordinate on the viridis ramp (`hiddenRampCss()` legend with a border and a label, ARCHITECTURE 10.6.7); strokes `--text`; marker `--output` | 4D view |
| **Sphere** | `riemannSphere`: strokes by the same family/input/output tokens; the ramp from `--t0`/`--t1`; markers `--input` (z) and `--output` (w) | sphere view |
| **Draft** (shape being drawn) | dashed (`DASH.guide`) `--input` on the z-plane, dashed `--output` image on the output plane | during a gesture |
| **Guess** | dashed (`DASH.guide`) `--text`, width 2, alpha 0.85, label "your guess" | guess pad, then the w-plane after Reveal |
| **Check sentence** | `--ok` when the check passes (largest error below 1e-6), `--warn` otherwise; plus the words "passes" / "does not pass" so colour is never the only cue | problem panel |
| **Errors** | `--danger` text for `#lab-fn-error`, `text-decoration: underline wavy var(--danger)` on the bad part in `#lab-fn-echo` | function field |

Light/dark specifics. The planes are created with `background: 'transparent'` so a domain canvas can sit under them (ARCHITECTURE 10.2.4); the *host* element of each plane paints `var(--surface)`, which is what the other views see. The halo and the guess
layers use `--surface` and `--text`, so they invert with the theme; the domain colours do not, by design. Every stroke is 2.5 px (primary) or 1.25 px (texture) so it reads at 1x. Colour is never the only cue: INPUT/OUTPUT are words in the badges, the family colours are repeated by
shape (circles and rays against lines), staircases and ghost arcs are labelled in text, the check sentence has words.

---

## 4. Module API

### 4.1 Imports (relative, exactly these; A6 inspects them; every name is used, unit test U25 checks it)

```js
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawDot, drawLabel, cssColor, mixColor, niceGridStep, DASH } from '../core/plane.js';
import { segment, circle, rect, polygon, verticalLine, horizontalLine, sector, annulus, cartGrid, freehand,
         pointAt, resample, classify, curveLength } from '../core/shapes.js';
import { pushForward, pushForwardAll, morph, lift, pointOnPieces } from '../core/mapping.js';   // computeImages loops with pushForward to tag pieces; pushForwardAll serves the bounds probe of 5.9
import { createDomainColoring, drawColorWheel, rangesFromView, DOMAIN_LEGEND } from '../core/domaincolor.js';
import { createView3D, modulusLandscape, riemannSphere, graph4D, createMarker, curveToLine, disposeObject,
         rotate4, project4to3, stereographic, hiddenRampCss } from '../core/three-view.js';
import { Arg, wrapArg, fromPolar, branchRoot, branchArg, fmtNum, fmtCart, fmtAngle, texPolar, texAngle } from '../core/complex.js';
import { compile, ParseError } from '../core/parse.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { fnById } from '../data/functions.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { THREADS, STATIONS } from '../registry.js';
```

`lab.js` does not import `theme.js` or `store.js`: it uses `ctx.theme` and `ctx.store`. The A6 check lists "pushForwardAll/morph/lift"; `pushForwardAll` is used for the *bounds probe* of 5.9 (it returns pieces without our tags, which is all the probe needs).
`three-view.js` imports three.js itself; the Lab never imports `vendor/three`. Importing the Lab in Node must not touch `window` or `document` at module level (the unit tests do it).

### 4.2 Exports

```js
export function mount(el, ctx)  // -> unmount(); synchronous; el is the empty <section class="station" id="station-lab">

// ---- pure, Node-testable (the unit tests in 7.2 call exactly these) ----
export const LAB_LIMITS     // frozen { maxShapes: 40, maxPolygonVertices: 100, maxFreehandPoints: 600, maxRawSamples: 4000, lineSpan: 4, history: 50 }
export const LAB_VIEWS      // frozen ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d']
export const LAB_PRESETS    // frozen array of 6: { key, label, problem, fn: FUNCTIONS id | null, spec: Spec }  keys x2, circle1, unit, sector, annulus, segment (5.3 table)
export const TOKEN_PRESETS  // frozen { '2-1-2': 'x2', '2-1-3': 'x2+linear-i', '2-2-1': 'sector', '2-5-1': 'circle1', 'p4': 'unit' }: value = preset key, or preset key + '+' + the function id that overrides the preset's (keys lower-case; see resolveToken)
export function resolveToken(token)           // string -> { preset: LAB_PRESETS entry, fn: id | null, problem: id } | null; case-insensitive; accepts 'problem-2-5-1' and 'problem-P4' too
export function cleanSpec(spec)               // Spec-ish -> normalised Spec (fresh, finite, clamped to +-1000, no -0) or null when unusable (5.2)
export function specToCurves(spec, shapeId)   // clean Spec -> { curves: Curve[], roles: ('primary' | 'texture')[] }; curve ids are shapeId (one curve) or `${shapeId}.${sub}` (5.2)
export function describeSpec(spec)            // -> 'rectangle', 'circle', 'sector', ... (the word used in notices, shape info and sr-status)
export function parseLabRequest(req)          // unknown -> { fn: FnSpec | null, specs: Spec[], view: string | null, problem: string | null, predictFirst: boolean, dropped: number } (never throws)
export function makeFn(fnSpec)                // FnSpec -> FnState; FnSpec: { id } | { zn: n } | { seam: sigma } | { src }; throws ParseError for a bad { src } (5.4)
export function fnReadoutSrc(fn)              // -> text after "f = " in the readout
export function snapStep(unitsAcross)         // niceGridStep(unitsAcross) / 4
export function snapPoint(z, step)            // lattice snap, no -0, noise removed (toFixed(10))
export function snapPolar(z, rStep, thStep)   // snap length and Arg to multiples; length 0 gives {0, 0}
export function sectorFromCorners(a, b, { fan = true } = {})  // -> { r0, r1, theta0, theta1, degenerate } (5.5)
export function smoothStroke(samples, window = 5)             // moving average, first and last sample exact
export function clampRadiusFor(view, size)    // ARCHITECTURE 10.5.1
export function computeImages(curves, f, { clampRadius = 40, join = false } = {})   // curves -> Piece[] (tagged with curveId); join: 5.8
export function joinAcrossInfinity(pieces, curveById, f)      // Piece[] -> Piece[] (5.8)
export function imageBounds(pieces)           // -> { xRange, yRange, cap } | null: the robust bounds of 5.9
export function detectProblem(specs, fn)      // -> '2.1.2' | '2.1.3' | '2.2.1' | '2.5.1' | 'P4' | null (5.14)
export function checkProblem(id, pieces)      // -> { id, count, maxErr, ok, text } | null (5.14)
export function landscapeParams(curves, f)    // -> { half, clamp, count } (5.11)
export function graph4dParams(curves, f)      // -> { half, clamp, count }
export function liftCurve3(curve, f, params)  // landscape: curve -> maths triples [x, y, h] with [NaN, NaN, NaN] gaps (5.11); params = landscapeParams result
export function liftCurve4(curve, f, params)  // 4D graph: curve -> [x, y, u, v] points (u, v clamped) with null gaps; params = graph4dParams result
export function project4(base4, angles)       // [x, y, u, v][] | null gaps, { uv, yv } -> maths triples via project4to3(rotate4(p, angles)), [NaN, NaN, NaN] for a gap
export function probeNumbers(fn, z)           // -> { z, w, rz, thz, rw, thw, wFinite } (5.13)
export function angleStory(fn, z)             // -> string | null (5.13)
export function readoutText(s)                // s = { fn, shapes, view, t, s, probe, answerHidden } -> the exact readout string (5.15)
```

`Curve`, `Piece` and the complex numbers are exactly those of ARCHITECTURE 3.9 and 3.10 (`{ re, im, t }` points). A `Piece` returned by `computeImages` is a mapping piece plus two fields: `curveId` (the id of the input curve it came from, equal to `piece.source`) and `shapeId`.

### 4.3 Data structures

```js
// Spec: plain JSON, finite numbers, complex numbers as { re, im }.  This is also the LabRequest.shapes format of ARCHITECTURE 4 plus the extras marked +.
{ kind: 'segment', a, b }
{ kind: 'verticalLine', x }                          // spans y in [-4, 4] (LAB_LIMITS.lineSpan), n = 128
{ kind: 'horizontalLine', y }                        // spans x in [-4, 4]
{ kind: 'rect', a, b }
{ kind: 'circle', center, r }
{ kind: 'polygon', vertices: [{ re, im }, ...] }     // closed; 3 to 100 vertices
{ kind: 'sector', r0, r1, theta0, theta1 }           // + optional fillRays, fillArcs (integers 0..24), grid (boolean: a dense polar-grid patch)
{ kind: 'annulus', center, r0, r1 }
{ kind: 'freehand', points: [{ re, im }, ...] }      // + the brush; at most 600 points, already smoothed and thinned
{ kind: 'cartGrid', xRange: [x0, x1], yRange: [y0, y1], step }   // + Cartesian grid patch, step >= span / 24

// ShapeRecord: what `shapes()` returns (one per committed shape)
{ id: 's3', kind: spec.kind, spec, label: 'rectangle',
  curves: Curve[], roles: ('primary' | 'texture')[],        // parallel arrays; curve ids as in 5.2
  points: curves[0].points, closed: curves[0].closed, family: curves[0].family }   // so `pointAt(shape, t)` from shapes.js works on a record

// FnState
{ kind: 'catalog' | 'zn' | 'seam' | 'custom', id: 'sq' | ... | 'zn' | 'cbrt-seam' | null,
  data?,          // the FUNCTIONS entry (catalog only: its cart and polar formulas feed the explainer)
  src,            // parse.js grammar actually compiled ('z^2', 'z^5', 'z^(1/3)' for seam, the typed text for custom)
  f,              // (z) => { re, im } (fresh object each call; accepts a bare real)
  tex, label, note, problems: string[], analytic: boolean | null, poles: { re, im }[],
  n?: number, seam?: number }

// probe: { on: boolean, z: { re, im } }       default z = 1 + i, on = false until the Probe tool is first chosen
// draft: { tool, pointerId, a?, b?, samples?, verts?, hover?, lastUp?: { t, x, y } } | null
```

### 4.4 The store and the hooks

- **Store keys** (via `ctx.store`): `lab.request` is read on mount; if present it is **removed first** (`store.remove`) and then applied (so a throw never replays it). `lab.strokes` is read on mount when there is
  no request and no token preset (`Array.isArray`, every element through `cleanSpec`, at most 40, otherwise ignored) and written after every commit, undo, clear and preset load, and in `unmount`; when
  there are no shapes the key is removed. Both calls are in the store's own try/catch (the Lab adds none of its own around `store.get`/`set`).
  `lab.strokes` format (the interface to `graph4d`): an array of Specs as in 4.3, in drawing order. A reader rebuilds the curves with the builder table of 5.2.
- **`window.__mv.lab`** (set at the end of mount: `const mv = (window.__mv = window.__mv || {}); mv.lab = {...}`; deleted in unmount only if it is still ours):
  `shapes()` (array of ShapeRecord, the live records), `images()` (the w-plane push-forward at s = 1: `Piece[]`, computed on demand with the current w-plane clamp, in any view and in any predict state), `view()` (the view name),
  `fn()` (`{ kind, id, src }`), `t()`, `s()`, `probe()` (`{ on, z, w }`), `answerHidden()`, `stats()` (`{ computes, lastComputeMs, pieces, dcRenders, view3dBuilds, draws }`), `state()` (a shallow copy of the public state, for debugging).
- **Events the Lab subscribes to** (all removed in unmount): `plane.on('pointerdown'|'pointermove'|'pointerup'|'pointercancel')` on `lab-zplane` (tools) and `lab-gplane` (guess brush); `plane.on('viewchange')` on all four planes
  (z: re-render the domain canvas; w and m: clamp changed, and `reason: 'pan' | 'zoom'` turns auto-fit off, `'reset'` turns it on); `document` `keydown`; `onThemeChange` (`ctx.theme.onThemeChange`): redraw the wheel; `matchMedia('(prefers-color-scheme...)')` is not needed (planes and views handle it);
  the reduced-motion preference is read with `ctx.theme.prefersReducedMotion()` when a play control is pressed and at mount, and a `matchMedia('(prefers-reduced-motion: reduce)')` `change` listener (removed in unmount) refreshes the labels of `#lab-play` and `#lab-morph-play`. DOM listeners on the controls are added through one helper `on(target, type, fn)` that records them for removal.

### 4.5 Lifecycle

`mount(el, ctx)` builds the DOM (4.6), injects the station style once, creates the four planes (`lab-zplane`, `lab-wplane`, `lab-mplane`, `lab-gplane`), the explainer and the two staircases, applies the request, token preset, stored strokes or the blank state, applies the first
view, and attaches the `document` listener and `window.__mv.lab` **last** (ARCHITECTURE 10.1.4). It returns `unmount`, which: cancels the play loop, the compute scheduler, the draft frame, the dc-status timer and the notice timer; writes `lab.strokes`; removes every
listener it recorded and the `document` keydown; unsubscribes the plane `on` handlers and the theme callback; destroys the four planes, both domain-colouring instances (`dc.destroy()`), the explainer and both staircases (`destroy()`); `view3d.dispose()`; removes the injected style if this mount added it;
deletes `window.__mv.lab`. It is idempotent (a second call does nothing). `mount` never throws on a bad store value (every store read is validated); if it does throw, the router shows the under-construction panel.

### 4.6 DOM id inventory

Every id of 2.2 plus the plane-generated ones. Ids added beyond ARCHITECTURE 9 (D12): `lab-presets`, `lab-preset-<key>-load`, `lab-start-notice`, `lab-bench`, `lab-tools`, `lab-tool-pan`, `lab-tool-hint`, `lab-snap`, `lab-grid-cart|polar|both`, `lab-tool-options`, `lab-sector-fan`,
`lab-ring-ratio(-out)`, `lab-polygon-close`, `lab-notice`, `lab-views`, `lab-stage`, `lab-zpanel`, `lab-zplane-dc`, `lab-wplane-dc`, `lab-zempty`, `lab-wempty`, `lab-wfit-note`, `lab-shape-info`, `lab-out`, `lab-wplane-wrap`, `lab-morph-wrap`, `lab-view3d-wrap`, `lab-view3d`, `lab-view3d-legend`,
`lab-guess-wrap`, `lab-guess-clear`, `lab-wheel`, `lab-wheel-text`, `lab-wheel-details`, `lab-dc-status`, `lab-clock`, `lab-t-out`, `lab-s-out`, `lab-morph-play`, `lab-fnpanel`, `lab-fns`, `lab-n-out`, `lab-seam-out`, `lab-fn-echo`, `lab-fn-help`, `lab-fn-note`, `lab-problem*`, `lab-check`, `lab-probe-panel`, `lab-probe-off`,
`lab-angle-story`, `lab-sphere-z|w|both`, `lab-4d-uv|yv|readout`, `lab-sr-status`. Plane ids are `lab-zplane`, `lab-wplane`, `lab-mplane`, `lab-gplane`; their generated ids follow ARCHITECTURE 3.5 (`<id>-viewport`, `<id>-canvas`, `<id>-zoom-in|out|reset`, handle `<id>-<point>`).

### 4.7 Styles

One `<style data-for="lab">` is injected on mount (tokens only, no web fonts, no literal colours; plane, explainer, staircase and three-view inject their own). Classes (the builder tunes numbers by looking at screenshots):

- `.lab-preset { display: flex; gap: 0; } .lab-preset > button { flex: 1 1 auto; min-width: 7rem; } .lab-preset > a { flex: none; }` (so the group's centre is on the load button: the button is always wider than the five-character link, whatever the label; a `min-width` of 0 left the short label "x = 2" narrower than its link and the centre click followed the link; the interaction script checks `elementFromPoint` at all six centres at 1280 and 390).
- `.lab-toolbar, .lab-fnrow, .lab-clock { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }`.
- `.lab-stage { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 23.25rem), 1fr)); }` (the `.two-planes` rule; the Lab uses the shell class `two-planes` on the element and adds `.lab-stage` for the extras).
- `.lab-panel { padding: var(--space-2); border: 1px solid var(--border); border-top: 4px solid var(--tone, var(--border-strong)); border-radius: var(--radius); background: var(--surface); } .lab-panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: baseline; }`.
- `.lab-planehost { position: relative; background: var(--surface); border-radius: var(--radius); }` and `.lab-planehost .lab-empty { position: absolute; inset: 0; display: grid; place-items: center; padding: var(--space-3); text-align: center; color: var(--text-muted); pointer-events: none; }`.
- `.lab-dc { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }` (the domain canvases, first child of `plane.el`).
- `.lab-legend { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }`, `.lab-ramp { height: 0.75rem; border: 1px solid var(--border-strong); border-radius: 4px; }` (inline `background` from `hiddenRampCss()`).
- `.lab-fn-group { display: grid; gap: var(--space-1); } .lab-fn-group-title { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }`.
- `.lab-err-mark { text-decoration: underline wavy var(--danger); text-underline-offset: 0.2em; } #lab-fn-error { color: var(--danger); min-height: 1.5em; }`.
- `.lab-check[data-ok="true"] { color: var(--ok); } .lab-check[data-ok="false"] { color: var(--warn); }`.
- `@media (max-width: 30rem) { .lab-clock .slider-row { grid-template-columns: minmax(0, 1fr) auto; } }` (the shell's rule already stacks the range; nothing else is needed).

---

## 5. Algorithms

Conventions: `z = { re, im }`; `view = zplane.getView()` is `{ center, unitsAcross, scale }` (scale = pixels per unit); `size = plane.getSize()` is `{ w, h }` in CSS pixels. Constants:
`CLICK_PX = 6`, `CLOSE_PX = 12`, `DOUBLE_MS = 350`, `DOUBLE_PX = 8`, `MIN_SHAPE_PX = 6`, `BRUSH_MIN_PX = 4`, `BRUSH_WINDOW = 5`, `START_VIEW = { center: {0, 0}, unitsAcross: 9 }` (x and y from -4.5 to 4.5),
`T_PASS = 4` s, `T_HOLD = 0.6` s, `S_PASS = 2.5` s, `T_STEP = 0.1`, `DEFAULT_T = 0.4`, `DEFAULT_S = 0.5`, `ANG_STEP = pi/12` (15 degrees), `LAB_LIMITS` of 4.2.

### 5.1 `mount(el, ctx)`

1. `store = ctx.store`; `reduced = () => ctx.theme.prefersReducedMotion()`. Inject `<style data-for="lab">` if absent (remember whether this mount added it).
2. Build the DOM of 2.1 and 2.2 with a small `h(tag, attrs, children)` helper. Text goes in with `textContent`; prose with `prose(el, text)`; statements with `statementParts` + `tex`; never `innerHTML` (U24 forbids the word).
   Header: from `ctx.station`, `ctx.threads`, `problemsForStation('lab')`. The `a.problem-chip` of each problem gets `title` = `problem.aha` through `setAttribute` and `href = '#' + routeFor(id)`.
3. Create planes, each inside its own `.lab-planehost`: `zplane = createPlane(zHost, { id: 'lab-zplane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'cart', axisLabels: ['x', 'y'], background: 'transparent', ariaLabel: 'z-plane, where you draw' })`,
   `wplane` (`id: 'lab-wplane'`, `axisLabels: ['u', 'v']`, `ariaLabel: 'w-plane, where f sends your drawing'`), `mplane` (`id: 'lab-mplane'`, `axisLabels: ['Re', 'Im']`, `ariaLabel: 'Morph plane'`), `gplane` (`id: 'lab-gplane'`, `axisLabels: ['u', 'v']`,
   `legend: false`, `ariaLabel: 'Your guess, in the w-plane'`); all with `background: 'transparent'`, `wheel: 'focus'`, `maxWidth: 640`. `zplane.setDrawMode(true)`; `gplane.setDrawMode(true)`.
   `probeHandle = zplane.addPoint({ id: 'probe', z: {1, 1}, color: '--input', label: 'z', name: 'probe z', onDrag: (z) => setProbe(z, true) })`; `probeHandle.hidden = true`.
4. Create `explainer = createExplainer(exHost, ...)` (5.13) and `stairsZ`, `stairsW` (`createStaircase(host, { id: 'lab-stairs-z' | 'lab-stairs-w', kMin: -2, kMax: 2, label: 'arg z' | 'arg w', seam: -Math.PI })`); `drawColorWheel(wheelCanvas, { size: 96 })`.
5. Initial state: `state = { shapes: [], history: [], seq: 0, fn: makeFn({ id: 'sq' }), view: 'side', t: DEFAULT_T, s: DEFAULT_S, tool: 'brush', snap: true, grid: 'cart', ringRatio: 0.5, fan: true, predict: false, revealed: false, guess: [],
   probe: { on: false, z: {1, 1} }, hint: null, wAuto: true, mAuto: true, needFit: true, sphereShow: 'both', ang4: { uv: 0, yv: 0 }, n: 3, seam: -Math.PI, draft: null, versions: { shapes: 0, fn: 0 } }`.
6. **Boot** (first match wins):
   a. `req = store.get('lab.request', null)`; if `req`: `store.remove('lab.request')` **first**, then `r = parseLabRequest(req)`; `applyRequest(r)` (5.3).
   b. else `ctx.preset` of kind `token` with `resolveToken(token)` non-null: `applyPreset(entry)`; kind `token` but unknown: show `#lab-start-notice` and stay blank; kind `problem` whose id equals the problem of a `TOKEN_PRESETS` entry: that preset.
   c. else `s = store.get('lab.strokes', null)`; if it is an array: `specs = s.slice(0, 40).map(cleanSpec).filter(Boolean)`; shapes from them (no history).
   d. else blank.
7. `updateChrome()` and `updateReadout()` run synchronously (so a script that reads right after mount sees text); `applyView(state.view)`; `invalidate('shapes', 'fn', 'images', 't', 'view')` schedules the first `flush()`.
8. Wire controls and plane events (all recorded for removal). Last: `document.addEventListener('keydown', onKey)`; `window.__mv.lab = {...}` (4.4). Return `unmount`.

### 5.2 `cleanSpec` and `specToCurves`

`num(x, lim = 1000)`: finite check, clamp to [-lim, lim], add `0` to remove `-0` (no rounding: the presets keep `pi/4` exactly, and a JSON round trip keeps a double exactly). `cz(z)`: a number n is `{ n, 0 }`; an object needs both parts finite; else `null`.

`cleanSpec(spec)` returns a fresh normalised Spec or `null`:

1. Not an object, or `kind` not one of the ten kinds: `null`.
2. `segment`: `a`, `b` through `cz`; `null` if `|a - b| < 1e-9`.
3. `verticalLine` `{ x }`, `horizontalLine` `{ y }`: the number through `num`.
4. `rect`: `a`, `b`; `null` if the width or the height is below `1e-9`.
5. `circle`: `center` through `cz`, `r = Math.abs(num(r))`; `null` if `r < 1e-6`.
6. `polygon`: at most the first 100 vertices through `cz` (any failure: `null`); drop a vertex within `1e-9` of the previous one and a closing vertex equal to the first; fewer than 3 left: `null`.
7. `sector`: `r0, r1` through `Math.abs(num(.))`, swapped when `r0 > r1`; `null` if `r1 - r0 < 1e-9`; `theta0 = num(theta0, 100)`; `d = num(theta1, 100) - theta0`; `d = d - 2 pi floor(d / 2 pi)`; if `d <= 1e-12` then `d = 2 pi`; `theta1 = theta0 + d` (the sweep is in (0, 2 pi], whole turns added or removed without a loop);
   optional `fillRays`, `fillArcs` integers clamped to 0..24 (omitted when absent), `grid = spec.grid === true`.
8. `annulus`: `center`, `r0`, `r1` as for the sector, `r0 >= 1e-6` and `r1 - r0 >= 1e-9` or `null`.
9. `freehand`: at most the first 1500 points through `cz` (any failure: `null`); at least 2 points, not all within `1e-9` of the first, else `null`; more than 600: keep every `ceil(n / 600)`-th point and the last.
10. `cartGrid`: `xRange`, `yRange` each a sorted pair through `num`, each span at least `1e-6` or `null`; `step = num(step)`, `step = max(step, 0.05, (x1 - x0) / 24, (y1 - y0) / 24)` (at most 25 lines per direction).

`specToCurves(spec, shapeId)` (spec already clean). `one(c)` sets `c.id = shapeId`; `many(c, sub)` sets `c.id = shapeId + '.' + sub`. The builder table (all from `shapes.js`):

| kind | call | curves, roles |
|---|---|---|
| `segment` | `segment(a, b, { n: 64 })` | `[one]`, `['primary']` (family `null`) |
| `verticalLine` | `verticalLine(x, { yRange: [-4, 4], n: 128 })` | `[one]`, primary (family `cart`) |
| `horizontalLine` | `horizontalLine(y, { xRange: [-4, 4], n: 128 })` | same |
| `rect` | `rect(a, b, { nPerSide: 32 })` | `[one]`, primary (`cart`, closed) |
| `circle` | `circle(center, r, { n: 128 })` | `[one]`, primary (`polar`, closed) |
| `polygon` | `polygon(vertices, { closed: true, nPerSide: 32 })` | `[one]`, primary (`null`, closed) |
| `sector` | `sector({ r0, r1, theta0, theta1, fill: true, fillRays: spec.fillRays ?? 4, fillArcs: spec.fillArcs ?? 3, n: 48 })` | boundary (`sub = 'boundary'`) primary, every other curve texture (`ray1.., arc1..`) |
| `annulus` | `annulus({ center, r0, r1, fill: true, fillRings: 2, fillRays: 8, n: 96 })` | `inner` and `outer` primary, `ring1.., ray0..` texture |
| `freehand` | `freehand(points, { minDist: 0 })` | `[one]`, primary (`null`); `t` by arclength |
| `cartGrid` | `cartGrid({ xRange, yRange, step, n: 96 })` | all texture (`gx0.., gy0..`), none primary |

The records and `lab.strokes` use only the clean Spec, never the curves, so a restored shape is rebuilt by the same call. `describeSpec`: segment "line", verticalLine "vertical line", horizontalLine "horizontal line", rect "rectangle", circle "circle", polygon "polygon",
sector "sector" (or "polar grid" when `grid`), annulus "ring", freehand "brush stroke", cartGrid "grid".

### 5.3 Presets, tokens and requests

`LAB_PRESETS` (the specs are exact; all clean):

| key | label | problem | fn | spec |
|---|---|---|---|---|
| `x2` | x = 2 | 2.1.2 | `sq` | `{ kind: 'verticalLine', x: 2 }` |
| `circle1` | \|z - 1\| = 1 | 2.5.1 | `recip` | `{ kind: 'circle', center: {1, 0}, r: 1 }` |
| `unit` | Unit circle | P4 | `linear-1i` | `{ kind: 'circle', center: {0, 0}, r: 1 }` |
| `sector` | Sector 0 < arg z < pi/4 | 2.2.1 | `cube` | `{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: pi/4 }` |
| `annulus` | Annulus 1 < \|z + i\| <= 3 | 1.5.2 | `null` (keeps f) | `{ kind: 'annulus', center: {0, -1}, r0: 1, r1: 3 }` |
| `segment` | Segment 2 + i to -3 - 3i | 1.5.1 | `null` | `{ kind: 'segment', a: {2, 1}, b: {-3, -3} }` |

`TOKEN_PRESETS`: `'2-1-2'` is `x2`; `'2-1-3'` is `x2` with fn `linear-i` and problem 2.1.3; `'2-2-1'` is `sector`; `'2-5-1'` is `circle1`; `'p4'` is `unit`. `resolveToken(token)`: lower-case the token; a leading `problem-` is stripped and `P4`/`p4` and
dash-separated ids are read the same way; return `{ preset, fn, problem }` or `null`.

`applyPreset({ preset, fn, problem })`: push the history if there are shapes; `shapes = [buildRecord(clean(preset.spec), nextId())]`; if `fn` (or `preset.fn`) set the function (`makeFn({ id })`, chips and DC updated, hint untouched); `state.hint = problem`; `revealed = false`; `guess = []`; `zplane.setView(START_VIEW)`; `t = DEFAULT_T`; `needFit = true`; `wAuto = mAuto = true`;
persist; invalidate; `#lab-sr-status`: "Loaded problem <id>."

`parseLabRequest(req)`: not an object returns the empty result. `fn`: a string with `fnById(fn)` non-null becomes `{ id }`; an object with a string `src` becomes `{ src: src.slice(0, 400) }`; anything else `null`.
`specs = (Array.isArray(req.shapes) ? req.shapes.slice(0, 40) : []).map(cleanSpec).filter(Boolean)`; `dropped = (count in) - specs.length`. `view = LAB_VIEWS.includes(req.view) ? req.view : null`. `problem = problemById(req.problem) ? req.problem : null`. `predictFirst = req.predictFirst === true`.
`applyRequest(r)`: shapes from `r.specs` with no history; `fn = r.fn ? makeFn(r.fn) (a ParseError falls back to sq and a notice) : sq`; `view = r.view || 'side'`; `hint = r.problem`; `predict = r.predictFirst`; `revealed = false`; `dropped > 0` shows the notice of 2.4; persist the new shapes under `lab.strokes`.

### 5.4 Functions

`makeFn(fnSpec)`:

1. `{ id }`: `d = fnById(id)` (a `RangeError` if unknown); `{ kind: 'catalog', id, data: d, src: d.src, f: compile(d.src).f, tex: d.tex, label: d.label, note: d.note, problems: copy, analytic: d.analytic, poles: copy }`.
2. `{ zn: n }`: `n = clamp(round(n), 2, 8)`; `src = 'z^' + n`; `{ kind: 'zn', id: 'zn', n, src, f: compile(src).f, tex: 'z^{' + n + '}', label: 'z^' + n, note: 'Raises the length to the n-th power and multiplies the angle by n.', problems: [], analytic: true, poles: [] }`.
3. `{ seam: sigma }`: `sigma = clamp(sigma, -pi, pi)`; `f = (z) => branchRoot(z, 3, sigma)`; `{ kind: 'seam', id: 'cbrt-seam', seam: sigma, src: 'z^(1/3)', tex: 'z^{1/3}', label: 'z^(1/3), seam ' + fmtAngle(sigma), note: 'The cube root on the branch whose angle runs through (sigma, sigma + 2 pi]. Move the seam to move the cut.', problems: ['2.4.1'], analytic: true, poles: [] }`.
4. `{ src }`: `c = compile(src.trim())` (throws `ParseError`); `{ kind: 'custom', id: null, src: trimmed, f: c.f, tex: c.tex, label: trimmed, note: 'Your own function.', problems: [], analytic: null, poles: [] }`.

`fnReadoutSrc(fn)`: catalog `d.src`; zn `z^n`; seam `'z^(1/3) [seam at ' + fmtAngle(sigma) + ']'` (the slider only produces multiples of pi/12, so it reads `z^(1/3) [seam at -pi]`, `[seam at -pi/2]`, `[seam at 0]` (run); a seam from a request that is not such a multiple prints its decimal);
custom the trimmed typed text exactly as typed (so "z^2 + iz" stays "z^2 + iz").

Chip state: `pressedId = kind === 'catalog' ? id : kind === 'zn' ? 'zn' : kind === 'seam' ? 'cbrt-seam' : null`; exactly that chip has `aria-pressed="true"`.

Apply (`#lab-fn-apply` click or Enter in `#lab-fn-src`): `src = input.value.trim()`; `try { fn = makeFn({ src }) }` (an empty field gives the parser's own sentence, "Type a formula in z, for example z^2 + i z."); on `ParseError e`: `#lab-fn-error.textContent = e.message` (verbatim), `#lab-fn-echo` shows `src.slice(0, e.position)`, then `<mark class="lab-err-mark">` with `src.slice(e.position, e.position + e.length)` (a non-breaking space when empty, so an error at the end of the text is still marked), then the rest; f unchanged; return.
On any other error: "That could not be read as a function of z." On success: `#lab-fn-error` and echo cleared, `setFn(fn)`. Any `input` event in the field clears the error.

`setFn(fn)`: `state.fn = fn; versions.fn++`; `dcZ.setFunction(fn.f)` if it exists; `hint = null` unless `detectProblem` still matches; `needFit = true`; update chips, `#lab-fn-note` (`prose(el, fn.note)` and a TeX `f(z) = fn.tex` line via `tex`), the seam help visibility; `invalidate('fn', 'images', '3d', 'probe')`; sr-status "f is now <label>."

### 5.5 Snapping, corners and gestures

- `snapStep(unitsAcross) = niceGridStep(unitsAcross) / 4`. At the start view `niceGridStep(9) = 1`, so the step is 0.25; for `unitsAcross` 4.5, 2, 20, 40 it is 0.125, 0.05, 0.5, 1.25 (run).
- `snapPoint(z, step)`: for each part `v`: `q = Math.round(v / step) * step`, `Number(q.toFixed(10)) + 0`.
  Example: `snapPoint({0.4961, 0.5104}, 0.25) = {0.5, 0.5}`; `snapPoint({-0.01, 1.4999}, 0.25) = {0, 1.5}`; `snapPoint({0.07, -0.07}, 0.25) = {0, 0}` (run).
- `snapPolar(z, rStep, thStep)`: `r = |z|`, `th = atan2(im, re)`; `r2 = round(r / rStep) * rStep` (cleaned with `toFixed(10)`); if `r2 === 0` return `{0, 0}`; `th2 = round(th / thStep) * thStep`; `{ re: r2 cos th2, im: r2 sin th2 }` each part `Number(x.toFixed(10)) + 0`.
  Example (run): `snapPolar({1.5, 1.5}, 0.25, pi/12)`: `|(1.5, 1.5)| = 2.1213` rounds to length 2 and the angle 45 degrees is already a multiple of 15 degrees, so the result is `{ re: 1.4142135624, im: 1.4142135624 }` = `2 e^{i pi/4}`; `snapPolar({2.02, 0.05}, 0.25, pi/12) = { re: 2, im: 0 }`.
- `snapZ(z) = state.snap ? snapPoint(z, snapStep(view.unitsAcross)) : copy(z)`; `snapP(z) = state.snap ? snapPolar(z, snapStep(view.unitsAcross), ANG_STEP) : copy(z)`.
- `sectorFromCorners(A, B, { fan })`: `rA = |A|`, `rB = |B|`; `r1 = max(rA, rB)`; `r0 = fan ? 0 : min(rA, rB)`; `thA = Arg A`, `thB = Arg B` (0 at the origin); `d = wrapArg(thB - thA)` in (-pi, pi]; if `d >= 0`: `[theta0, theta1] = [thA, thA + d]` else `[thA + d, thA]`;
  `degenerate = |d| < 1e-9 || r1 - r0 < 1e-9`. Examples (run): `A = 2`, `B = 2 e^{i pi/4}`: fan gives `{ r0: 0, r1: 2, theta0: 0, theta1: 0.7853981633974483 }`; swapping A and B gives the same; non-fan with `A = 1`, `B = 2 e^{i pi/4}`: `r0 = 1, r1 = 2, theta0 = 0, theta1 = pi/4`.
  The whole sector gesture is the polar rectangle between two corners. A corner at the origin has `Arg 0 = 0`, so dragging from the origin to `(1.5, 1.5)` (snapped to `2 e^{i pi/4}`) draws exactly the preset sector `r` in [0, 2], `theta` in [0, pi/4].

**Gestures** (`plane.on` handlers on `zplane`; `view` is read at each event). `scheduleDraft()` marks the draft frame dirty; one rAF recomputes the draft curves and, in the side, domain and morph views, their image (5.8).

1. `onDown(e)`: ignore if `!e.isPrimary` or `state.tool === 'pan'` (the plane emits `pointerdown` in every mode; the guess pad has its own handlers on `lab-gplane`). Probe tool: `draft = { tool: 'probe', pointerId }`, `setProbe(e.z)`, return.
   Brush: `draft = { tool, pointerId, samples: [e.z] }`. Line, rectangle, circle, grid, ring: `a = snapZ(e.z)`; sector, polar grid: `a = snapP(e.z)`; `draft = { tool, pointerId, a, b: a, start: { px: e.px, py: e.py } }`.
   Polygon: `draft = draft || { tool, verts: [], hover: null, lastUp: null }`; `draft.pointerId = e.pointerId`; `draft.down = { px: e.px, py: e.py }`.
2. `onMove(e)`: polygon draft: `draft.hover = snapZ(e.z)` (hover events arrive without a press), `scheduleDraft()`, return. Otherwise only for `e.pointerId === draft.pointerId`: probe: `setProbe(e.z)`; brush: push `e.z` while `samples.length < 4000`; others: `b = snap(e.z)` (`snapP` for sector and polar grid, else `snapZ`).
3. `onUp(e)`: for the pointer of the draft. Brush: `commitBrush` (5.6). Press-drag tools: if `hypot(e.px - start.px, e.py - start.py) < MIN_SHAPE_PX` discard silently; else `b = snap(e.z)` and `spec = specFromDraft(tool, a, b)`; `spec ? commit(spec) : notice`; `draft = null`.
   Polygon: if `hypot(e.px - down.px, e.py - down.py) >= CLICK_PX` it was a drag: ignore. Else `z = snapZ(e.z)`, `closing = verts.length >= 3 && hypot(toPixel(z) - toPixel(verts[0])) <= CLOSE_PX`, `double = lastUp && now - lastUp.t < DOUBLE_MS && hypot(e.px - lastUp.px, e.py - lastUp.py) < DOUBLE_PX`; `lastUp = { t: now, px, py }`;
   if `closing || (double && verts.length >= 3)` then `closePolygon()`; else if `!double` and the point differs from the last vertex by more than 1e-9, push it; enable `#lab-polygon-close` when `verts.length >= 3`.
   Probe: `draft = null`.
4. `onCancel` (pointercancel): `draft = null` (polygon keeps its corners), `scheduleDraft()`.
5. `specFromDraft(tool, a, b)`:
   - line: `{ kind: 'segment', a, b }`.
   - rect: `{ kind: 'rect', a, b }` (the two extents positive).
   - circle: `r = |b - a|`; with snap `r = max(step, round(r / step) * step)`; `{ kind: 'circle', center: a, r }`.
   - cartgrid: `x0, x1 = sorted(a.re, b.re)`, `y0, y1` likewise; `{ kind: 'cartGrid', xRange, yRange, step: max(niceGridStep(view.unitsAcross) / 2, (x1 - x0) / 24, (y1 - y0) / 24) }`.
   - sector: `q = sectorFromCorners(a, b, { fan: state.fan })`; degenerate gives `null`; `{ kind: 'sector', r0, r1, theta0, theta1 }`.
   - polargrid: the same plus `grid: true`, `fillRays = clamp(round((theta1 - theta0) / ANG_STEP) - 1, 1, 24)`, `fillArcs = clamp(round((r1 - r0) / (niceGridStep(view.unitsAcross) / 2)) - 1, 1, 24)`.
   - annulus: `r1 = |b - a|` (snapped like the circle's radius); `r0 = r1 * state.ringRatio` (with snap `max(step, round(r0 / step) * step)`); if `r0 >= r1` return `null`; `{ kind: 'annulus', center: a, r0, r1 }`.
6. `closePolygon()`: fewer than 3 corners: notice "A polygon needs at least 3 corners."; else `commit({ kind: 'polygon', vertices: verts })`; `draft = null`.
7. Draft preview: `previewSpec(draft)` builds the same spec without the size checks; `curves = specToCurves(cleanSpec(spec), 'draft').curves`. The z layer draws them dashed. The image draft is `computeImages(curves.filter primary if the total point count > 3000, f, { clampRadius })`, drawn dashed `--output`.

**Hit testing.** There is no selection or editing of committed shapes. The only hit tests are: the polygon-close test (7, `CLOSE_PX` in screen pixels, using `zplane.toPixel`); click versus drag (`CLICK_PX`); double-click (`DOUBLE_MS`, `DOUBLE_PX`); the probe handle (the plane's own); the preset group click delegation (ignore events whose `target.closest('a')` is set).

### 5.6 The brush

`commitBrush(draft)`: `raw = draft.samples`; fewer than 2: notice "That stroke was too short to keep." `scale = zplane.getView().scale`; `sm = smoothStroke(raw, 5)`; `c = freehand(sm, { minDist: BRUSH_MIN_PX / scale })`; if `c.points.length < 2 || curveLength(c) * scale < 6`: the notice; if `c.points.length > 600`: `c = resample(c, 599)`;
`spec = { kind: 'freehand', points: c.points.map((p) => ({ re: round4(p.re), im: round4(p.im) })) }`; `commit(spec)`.
`smoothStroke(samples, window = 5)`: `half = floor(window / 2)`; for index `i` of `n`: `k = min(half, i, n - 1 - i)`; the output point is the mean of `samples[i - k .. i + k]` (the first and last samples are exact, `k = 0`). (ARCHITECTURE 10.5.5: a 5-point average cut 9 of 300 jittery images where raw samples cut 86.)

### 5.7 Commit, undo, clear, history, persistence

- `commit(spec)`: if `shapes.length >= 40`: notice "That is 40 shapes. Undo or clear one before adding more." and return `false`. `cs = cleanSpec(spec)`; `null`: notice "That shape could not be drawn." Else `pushHistory()`; `rec = buildRecord(cs, 's' + (++seq))`; `shapes.push(rec)`; `afterEdit({ fit: true })`; shape info; sr-status "<Label> added. <n> shape(s)."
- `buildRecord(spec, id)`: `{ curves, roles } = specToCurves(spec, id)`; `{ id, kind: spec.kind, spec, label: describeSpec(spec), curves, roles, points: curves[0].points, closed: curves[0].closed, family: curves[0].family }`.
- `pushHistory()`: push `shapes.slice()` (records are never mutated, so a shallow copy is a snapshot); shift when over 50.
- `undo()`: no history: nothing. Else `shapes = history.pop()`; `afterEdit({ fit: true })`; sr-status "Undid the last change." `clear()`: no shapes: nothing; else `pushHistory(); shapes = []; afterEdit({ fit: true })`; sr-status "Cleared the drawing."
- `afterEdit({ fit })`: `versions.shapes++`; `hint = null` (then `detectProblem` may show a panel); if `fit` then `needFit = true`; `persist()`; `invalidate('shapes', 'images', '3d', 'probe')`; update Undo and Clear `disabled`; update `#lab-shape-info` from `classify(primary curve of the last shape)` when the last shape has a primary curve of 3 or more points, else clear it.
- `persist()`: `shapes.length ? store.set('lab.strokes', shapes.map((s) => s.spec)) : store.remove('lab.strokes')`.
- Undo does not restore the function, the view or the clock: it undoes drawing only.

### 5.8 The compute pipeline

**Scheduler.** `invalidate(...keys)` sets `dirty[key] = true` for `shapes`, `fn`, `images`, `view`, `t`, `s`, `predict`, `probe`, `3d`, `colors`, `draft` and schedules one `requestAnimationFrame(flush)` if none is pending. `flush()` runs these steps and clears the flags:

1. `shapes` dirty: `allCurves = shapes.flatMap(curves)`, `info = Map(curve.id to { role, family, shapeId })`; rebuild the z layers (5.10).
2. `colors` (view entered or left the domain view): rebuild every plane's curve layers and the halo layers.
3. `updateChrome()`: tab state, which wrapper is visible, which legend, `#lab-zempty`/`#lab-wempty`, chips, undo/clear, the problem panel (`detectProblem`), the probe panel.
4. If `!answerHidden()`:
   - side or domain view: if `needFit && wAuto` then `fitW()` (5.9); `pieces = getImages()`; if the image key changed rebuild the w layers.
   - morph view: if `needFit && mAuto` then `fitM()`; `mpieces = getMorph()`; rebuild the morph layers.
   - 3D view: if `shapes`, `fn`, `view` or `3d` is dirty rebuild the content (5.11); if `t` is dirty update the markers.
   `needFit` is cleared once the plane it concerns was visible and fitted.
5. `t`, `s`, `probe`, `draft`: `requestDraw()` on the visible planes (cursor and overlay layers read the state at draw time); `updateReadout()`; `updateProbePanel()` when `probe` or `fn` or `shapes` is dirty; the sr-status line when set.
6. `stats.computes` and `stats.lastComputeMs` are updated whenever `getImages` or `getMorph` actually computes.

**`computeImages(curves, f, { clampRadius, join })`.** `curveById = Map(curves)`; for each curve `c`: `pieces = pushForward(c, f, { clampRadius: join ? 1e9 : clampRadius })` (a throwing `f` is a "no value", handled inside); tag each piece `curveId = piece.source` (the Lab gives every curve an id, so `source` is set) and `shapeId = curveId.split('.')[0]`.
If `join`, `pieces = joinAcrossInfinity(pieces, curveById, f)`. Return the flat list in curve order, each curve's pieces in t order.

**`getImages()`.** `key = shapesVersion + '|' + fnVersion + '|' + round(clampRadiusFor(wplane.getView(), wplane.getSize()))`; if `cache.images.key === key` return the cached pieces; else compute with `clampRadius = clampRadiusFor(...)`.
`clampRadiusFor(view, size)`: `halfW = view.unitsAcross / 2`; `halfH = halfW * size.h / size.w`; `return Math.max(40, 3 * Math.max(halfW, halfH)) + Math.hypot(view.center.re, view.center.im)` (ARCHITECTURE 10.5.1; for a hidden plane `getSize()` gives the nominal 400 x 400, so the result is still valid).
`window.__mv.lab.images()` returns `getImages()` in any view and in any predict state.

**`getMorph()`.** `key = shapesVersion|fnVersion|s rounded to 0.001|clamp of mplane`; pieces = `allCurves.flatMap((c) => morph(c, s, f, { clampRadius })).map(tag)`; `s = 0` returns copies of the curves (ids `<id>~0`), `s = 1` equals `getImages()` for the same clamp.

**`joinAcrossInfinity(pieces, curveById, f)`** (D8): walk the pieces in order, building `out`. For each piece `pc`: if the last piece in `out` has the same `source`, take `a` = its last point and `b = pc.points[0]`; `zmid = pointAt(curveById.get(pc.source), (a.t + b.t) / 2)`; `wm = f(zmid)` (inside try; a throw is "huge");
`hm = |wm|`; `big = max(|a|, |b|)`; if `!Number.isFinite(hm) || hm > 2 * big` then the input between the two pieces passes a pole, so append `pc.points` to the last piece (a geodesic on the sphere then joins the two ends over the pole). Else push a copy of `pc`.
A branch jump (a principal square root across the negative real axis) has `hm` of the same size as `big` and is not joined. Run: the circle `abs(z - 1) = 1` under `1/z` returns 2 pieces of 64 points and joins to 1 piece of 128; the unit circle under `sqrt` stays 2 pieces (69 and 72 points); the line x = 2 under `1/z` stays 1 piece; the imaginary axis (through 0) under `1/z` joins 2 pieces to 1.

### 5.9 Fitting the output planes

`imageBounds(pieces)`: collect every finite point; none: `null`. `rs = sorted |p|`; `q90 = rs[floor(0.9 * (n - 1))]`; `cap = max(4, 2.5 * q90)`; keep the points with `|p| <= cap` (this ignores the few huge points next to a pole); return `{ xRange: [min re, max re], yRange: [min im, max im], cap }` of the kept points.
Run values (with `clampRadius` 40): x = 2 under `z^2`: cap 42.9, x in [-12, 4], y in [-16, 16], all 129 kept; x = 2 under `iz - 2i`: cap 9.06, x in [-4, 4], y in [0, 0]; `abs(z - 1) = 1` under `1/z`: cap 7.31, x in [0.5, 0.5], y in [-6.778, 6.778], 124 of 128 kept;
the unit circle under `(1+i)z`: cap 4, x and y in [-1.414, 1.414]; the sector under `z^3`: cap 20, x in [-5.657, 8], y in [0, 8], 488 of 488.

`fitW()`: `probe = pushForwardAll(allCurves, fn.f, { clampRadius: 1e4 })` (bounds only: with the plane's clamp an image such as `exp(z)` on x = 4, of modulus 54.6, would come back empty and could never be fitted); `b = imageBounds(probe.concat(state.guess))`; if `b`: `wplane.fitTo([{ re: b.xRange[0], im: b.yRange[0] }, { re: b.xRange[1], im: b.yRange[1] }], 0.15)`
(`fitTo` floors each span at 2 units, so a degenerate image such as the real segment of 2.1.3 gets a proper view, and it also becomes the plane's Reset view). `fitM()` is the same with `zCurves` (all input points) and the probe pieces together, on `mplane`.
Flags: `wplane.on('viewchange', v)`: `reason` `'pan'` or `'zoom'` sets `wAuto = false` and shows `#lab-wfit-note`; `'reset'` sets `wAuto = true`, `needFit = true`, hides the note, invalidates `images`; `'fit'`, `'set'` and `'resize'` change nothing about the flag; every change except `'fit'` invalidates `images` (the clamp may have changed). Same for `mplane` with `mAuto`.
Loading a preset or request sets `wAuto = mAuto = true`.

### 5.10 Layers

All layers are `plane.addLayer(draw, { order })` or `plane.addCurve`, read colours with `cssColor(token)` at draw time, and are rebuilt (removed and re-added) only when their inputs change; the clock, the probe and the draft are read by the drawing functions from `state` and need no rebuild.

`curveStyle(role)`: primary `{ width: 2.5, dots: true, arrow: true, alpha: 1, order: 100 }`; texture `{ width: 1.25, dots: false, arrow: false, alpha: 0.75, order: 95 }` (in the domain view widths are +0.5). `strokeToken(family, side)`: `'cart'` gives `--cart`, `'polar'` gives `--polar`, otherwise `--input` for the z-plane and `--output` for the w-plane; in the domain view always `--text`.

1. **z-plane (`zplane`).** Curve layers: for each curve of `allCurves`: `zplane.addCurve({ id, points, color: strokeToken(family, 'z'), ramp: true, closed: curve.closed, cursor: null, ...curveStyle(role) })`. Halo layer (order 90, only in the domain view): for each curve a polyline in `--surface`, width = style width + 4, alpha 0.9, skipping non-finite points.
   Draft layer (order 150): the draft curves dashed (`DASH.guide`) in `--input` (a polygon draft also draws its corners as dots and the rubber band to `hover`). Seam layer (order 160): `drawSeam(ctx, plane, fn.kind === 'seam' ? fn.seam : Math.PI)` when `probe.on` or `fn.id` is `sqrt`, `cbrt`, `cbrt-seam`.
   Cursor layer (order 200): for each primary curve `c` (in 2D views, all primaries), `z = pointAt(c, state.t)`; `drawDot(ctx, plane, z, { color: '--input', radius: 6, label: firstPrimary ? 'z(t)' : undefined })`.
   Probe layer (order 210, when `probe.on`): `drawCartAddress(ctx, plane, z)`; `drawPolarAddress(ctx, plane, z, { ghosts: 2, ghostsNeg: 1, name: 'z' })`.
2. **w-plane (`wplane`).** Curve layers from `pieces`: `info = infoOf(piece.curveId)`; `wplane.addCurve({ id: piece.id, points: piece.points, color: strokeToken(info.family, 'w'), ramp: true, closed: piece.closed, cursor: null, ...curveStyle(info.role) })`; halo as above;
   guess layer (order 120, only after Reveal and when `guess.length`): each guess curve dashed `--text`, width 2, alpha 0.85, plus `drawLabel(ctx, plane, firstPoint, 'your guess')`; draft image layer (order 150); seam layer (order 160) at angle pi when `probe.on`; cursor layer (order 200): for each primary curve `c`, `w = pointOnPieces(piecesOf(c.id), state.t)`; if `w` is null draw nothing (a gap, a pole, a seam) else `drawDot(ctx, plane, w, { color: '--output', radius: 6, label: firstPrimary ? 'w(t)' : undefined })`;
   probe layer (order 210): `w = f(probe.z)`; if finite and not `answerHidden`: `drawCartAddress`, `drawPolarAddress(..., { ghosts: 2, ghostsNeg: 1, name: 'w' })`, `drawDot(ctx, plane, w, { color: '--output', radius: 6, label: 'w' })`.
3. **Morph plane (`mplane`).** Ghost layer (order 80): the input curves and the end images (`getImages()`), dashed, alpha 0.25, in their own colours. Curve layers from `mpieces`: colour `mixColor(cssColor(strokeToken(family, 'z')), cssColor(strokeToken(family, 'w')), s)` (equal ends for family-coloured strokes, green to purple for the rest), re-set with `layer.setColor` when only `s` changed (no rebuild). Cursor layer: `pointOnPieces(piecesOf(c.id), t)` with the same blend colour.
4. **Guess plane (`gplane`).** The guess curves (solid `--text` with a halo) and the draft; brush only: `onDown` starts, `onMove` samples, `onUp` runs `smoothStroke` then `freehand(.., { minDist: 4 / scale })` and appends to `state.guess` (at most 20 strokes; shorter than 6 px is dropped). Guess strokes are never persisted.
5. The grid chips call `setGridAll(g)`, which calls `plane.setGrid(g)` on all four planes and sets `state.grid`.

### 5.11 Domain colouring and the 3D views

**Domain colouring** (5.17 says when the canvases exist). `makeDC(plane, id, f)`: `canvas = h('canvas', { id, class: 'lab-dc' })`; `plane.el.prepend(canvas)`; `dc = createDomainColoring(canvas, { f })`; `refreshDC(plane, canvas, dc)`: `size = plane.getSize()`; `canvas.width = Math.round(size.w)`; `canvas.height = Math.round(size.h)` (device-pixel ratio 1, so the pixel cap never bites);
`dc.setView(rangesFromView(plane.getView(), size.w, size.h))`; `dc.render('drag')` (it refines to full quality 120 ms after the last call). Call `refreshDC` on the plane's every `viewchange` (including `'resize'`), on `setFunction`, and once at creation. `dcZ.setFunction(fn.f)`; the w-plane canvas uses `(w) => w`.
`#lab-dc-status`: after a render call `watchDC()`: set the text "Sharpening the picture..." while `dc.info().pending` and poll every 150 ms (at most 30 times), then clear it.

**Landscape.** `params = landscapeParams(allCurves, f)`:
`ext = max over curve points of max(|re|, |im|)`; `half = min(4.5, max(2, ceil(1.1 * ext / 0.5) * 0.5))`; `H = max |f(p)|` over curve points whose `|f(p)|` is finite and at most 60; `clamp = min(60, max(6, 1.05 * H))`; `count` = the points used.
Run: x = 2 under `z^2`: `half 4.5, clamp 21`; `abs(z - 1) = 1` under `1/z`: `half 2.5, clamp 21.3926`; the unit circle under `(1+i)z`: `half 2, clamp 6`; the sector under `z^3`: `half 2.5, clamp 8.4`.
Build: `mesh = modulusLandscape({ f, xRange: [-half, half], yRange: [-half, half], nx: 96, ny: 96, clamp, wire: true })`; `view3d.add(mesh)`; for each curve `pts3 = liftCurve3(curve, f, params)`; `line = curveToLine(pts3, '--text')`; `view3d.add(line)`; markers: floor `createMarker({ color: '--input', radius: 0.04 * half })`, top `createMarker({ color: '--output', radius: 0.04 * half })`, drop line `curveToLine([[0,0,0],[0,0,0]], '--text-muted')`; `view3d.fitTo(mesh, { padding: 1.05 })`.
`liftCurve3(curve, f, params)`: for each point `p`: `w = f(p)`, `h = |w|`; if `h` is not finite, `h > 60`, `|p.re| > half` or `|p.im| > half` then `[NaN, NaN, NaN]` else `[p.re, p.im, min(h, clamp) + 0.01 * clamp]` (a 1 percent lift so the line does not z-fight with the sheet).
`update3DMarkers()` (on `t`): `c = firstPrimary`; `z = pointAt(c, t)`; `w = f(z)`; if finite and inside: floor `[z.re, z.im, 0]`, top `[z.re, z.im, min(|w|, clamp)]`, drop line `userData.update([[z.re, z.im, 0], [z.re, z.im, min(|w|, clamp)]])`; else hide the three.
`three-view`'s `fitTo` puts the camera at `R * padding / sin(fov / 2)`, so a padding below 1 cuts the picture off by its frame: every Lab padding is at least 1 (unit test U26; the interaction script projects the vertices and asserts `|NDC| <= 1`).
Legend: wheel + the landscape sentence of 2.5 with `fmtNum(clamp, 3)`.

**Sphere.** `sph = riemannSphere({ radius: 1 })`; `view3d.add(sph.group)`; `view3d.fitTo(sph.group, { padding: 1.25 })` (the sphere is framed by its radius, but the infinity label sits at 1.14 radii above the pole, so it needs the room). Curves: for each input curve `sph.addCurve(curve.points, strokeToken(family, 'z'))` (when `sphereShow` is `z` or `both`); images: `computeImages(allCurves, f, { join: true })` and for each piece `sph.addCurve(piece.points, strokeToken(infoOf(piece.curveId).family, 'w'))` (when `w` or `both`).
Markers: `createMarker({ color: '--input', radius: 0.03 })` at `stereographic(z(t)).map((v) => v * 1.02)` and `createMarker({ color: '--output', radius: 0.03 })` at the same for `w(t)`; `stereographic` takes an infinite component to the north pole `[0, 0, 1]`, so a pole needs no special case; only a NaN `w` hides the w marker. `sph.markInfinity(true)`.
Changing `sphereShow` calls `sph.clearCurves()` and re-adds; no other rebuild.

**4D graph.** `params = graph4dParams(allCurves, f)`: `half` as above; `clamp = min(60, max(6, 1.05 * max over finite points with max(|u|, |v|) <= 60 of max(|u|, |v|)))` (run: x = 2 under `z^2`: 16.8; `abs(z - 1) = 1` under `1/z`: 21.3861; the unit circle under `(1+i)z`: 6; the sector under `z^3`: 8.4).
`g4 = graph4D({ f, xRange: [-half, half], yRange: [-half, half], nx: 64, ny: 64, angles: state.ang4, clamp, wire: true })`; `view3d.add(g4.mesh)`; `view3d.fitTo(g4.mesh, { padding: 1.05 })`. For each curve `base4 = liftCurve4(curve, f, params)` (a point `[x, y, u, v]` with `u = clampTo(Re w, clamp)`, `v = clampTo(Im w, clamp)`, or `null` when `w` is not finite, `max(|u|, |v|) > 60` or the point is outside the square),
`line = curveToLine(project4(base4, angles), '--text')`; `project4(base4, a) = base4.map((p) => p ? project4to3(rotate4(p, a)) : [NaN, NaN, NaN])`. Sliders `#lab-4d-uv`, `#lab-4d-yv`: `state.ang4 = { uv, yv }`; `g4.setAngles(state.ang4)`; for every line `line.userData.update(project4(base4, state.ang4))`; marker `createMarker({ color: '--output', radius: 0.04 * half })` at `project4to3(rotate4(p4(z(t)), ang4))`. Angles are radians; the readout shows degrees (`round(rad * 180 / pi)`).
Legend: a gradient bar with `background: hiddenRampCss()`, a border, the label and the sentence of 2.5.

All 3D builds: before adding, `clearObjs3()` removes and `disposeObject`s everything the Lab added (`view3d.remove(o); disposeObject(o)`); `view3d.dispose()` when the view is left (D15). `ensureView3D()`: `view3d = createView3D(el3d, { label, background: '--surface', grid, axes, axisLabels, gridSize, hint: true })` with landscape `grid: 'cart', axes: true, axisLabels: ['x', 'y', '|w|'], gridSize: 2 * half`;
sphere `grid: false, axes: false`; 4D `grid: false, axes: false`. It is created on the animation frame after the tab is shown (it needs a layout size). If `view3d.unavailable`, append the extra sentence of 2.4 once and skip all building.

### 5.12 The clock and the morph

- `setT(v)`: `t = clamp(v, 0, 1)`; `#lab-t.value = t`; `#lab-t-out.textContent = t.toFixed(2)`; `invalidate('t')`. `setS(v)` likewise for `#lab-s`, `#lab-s-out`, `invalidate('s')` (the morph layers only `setColor` and recompute `mpieces`).
- Play: `playing = true; last = null; hold = 0; raf(tick)`. `tick(now)`: `dt = last == null ? 0 : (now - last) / 1000`; `last = now`; if `hold > 0`: `hold -= dt`; when it reaches 0: `setT(0)`; else `setT(min(1, t + dt / T_PASS))` and when `t >= 1`: `hold = T_HOLD`; request the next frame while `playing`. Pause: `playing = false`, cancel the frame; the button label returns to "Play".
  Under reduced motion `#lab-play` reads "Step": each press `setT(nextStep(t))` with `nextStep(t) = (k = floor(t * 10 + 1e-9) + 1) > 10 ? 0 : k / 10` (the next multiple of 0.1 above t, wrapping from 1 to 0: 0.4 gives 0.5, 0.55 gives 0.6, 1 gives 0); no loop ever starts. A user input on `#lab-t` pauses playback.
- Morph play: `ms = { start: now, from: s }`; `tick`: `setS(min(1, (now - start) / (S_PASS * 1000)))` and stop at 1. Reduced motion: `setS(s < 0.5 ? 1 : 0)`.

### 5.13 The probe, the explainer and the staircases

- `setProbe(z, fromHandle)`: `z` finite else ignored; clamp both parts to +-1000; `probe.on = true`; `probe.z = copy`; `probeHandle.hidden = false`; if not `fromHandle`: `probeHandle.set(z, { silent: true })`; show `#lab-probe-panel`; `invalidate('probe')`.
  Choosing the Probe tool the first time shows the handle at `{1, 1}` and the panel; `#lab-probe-off` hides both and sets `probe.on = false`.
- `probeNumbers(fn, z)`: `w = fn.f(z)`; `wFinite = both parts finite`; `rz = |z|`, `thz = Arg(z)`; `rw = wFinite ? |w| : NaN`, `thw = wFinite ? Arg(w) : NaN`; returns `{ z, w, rz, thz, rw, thw, wFinite }`. At `z = 1 + i` (run): `sq` gives `w = 2i, rw = 2, thw = pi/2`; `cube` `-2 + 2i, 2.828427, 3pi/4`; `recip` `0.5 - 0.5i, 0.707107, -pi/4`; `linear-i` `-1 - i, 1.414214, -3pi/4`; `linear-1i` `2i, 2, pi/2`;
  `sq-plus-iz` `-1 + 3i, 3.162278, 1.892547`; `sq-plus-z` `1 + 3i, 3.162278, 1.249046`; `exp` `1.468694 + 2.287355i, 2.718282, 1`; `conj` `1 - i, 1.414214, -pi/4`; `re` `1, 1, 0`; `abs2` `2, 2, 0`; `dir` `i, 1, pi/2`; `sqrt` `1.098684 + 0.45509i, 1.189207, pi/8`; `cbrt` `1.084215 + 0.290515i, 1.122462, pi/12`; `x-over-z` `0.5 - 0.5i, 0.707107, -pi/4`.
- **Explainer** `createExplainer(host, { id: 'lab-ex', title: 'z goes in, w = f(z) comes out', rows, same })` (default columns: Cartesian then polar). Row functions use `cart()`/`polar()` at render time (ARCHITECTURE 10.3.1) and read the state `s = { fn, z, nums, hideW }` passed to `explainer.update(s)` on every probe move, function change and shape edit.
  **One quantity, one form** (ARCHITECTURE 10.4.5): the readout prints Cartesian numbers as decimals (`fmtCart`), so the Cartesian cells use the same decimals (`cart(fmtCart(z))` is valid TeX: `0.5 - 0.5i`), `num = (x) => fmtNum(x, 3)` is used for every `u`, `v` and length value, and a NaN becomes `\text{undefined}`.
  The polar cells use `texPolar` and `texAngle` (exact `\frac{\pi}{4}` and `\sqrt{2}` forms when they exist: the readout shows no polar form, so nothing disagrees). `hideW` makes every row except the first return `null` (an em dash).
  1. `z` ("z"): cart `cart('x + iy = ' + fmtCart(z))`; polar `polar('re^{i\\theta} = ' + texPolar(z) + '\\quad(\\theta = \\operatorname{Arg} z)')`.
  2. `w` ("w = f(z)"): cart `cart(fmtCart(w))`, polar `polar(texPolar(w))` (`texPolar` uses `Arg w`).
  3. `u` ("u = Re w"): cart: catalog with `fn.data.cart` gives `cart(fn.data.cart.u + ' = ' + num(w.re))`, anything else `{ text: 'value ' + num(w.re) }`; polar: catalog `polar(fn.data.polar.u + ' = ' + num(w.re))`, zn `polar('r^{n}\\cos n\\theta = ' + num(w.re))` (with the number `n` written in), seam `polar('r^{1/3}\\cos\\tfrac{\\theta_\\sigma}{3} = ' + num(w.re))`, custom `{ text: 'value ' + num(w.re) }`. (`{ text }` cells are plain prose, ARCHITECTURE 10.3.2.)
  4. `v` ("v = Im w"): the same with `.v`, `\\sin` and `w.im`.
  5. `act` ("f on (r, theta)"): cart `null`; polar `polar(POLAR_ACTION[...](nums))` when the function has an action, else `null`; `native: 'polar'` when it has one. `POLAR_ACTION` (TeX; `rz`, `thz` are `|z|`, `Arg z`):
     `sq`: `(r,\\theta)\\mapsto(r^{2},2\\theta) = (` + num(rz^2) + `,\\ ` + texAngle(2 thz) + `)`; `cube` likewise with 3; `zn` with n; `recip`: `(r,\\theta)\\mapsto(1/r,-\\theta)`; `conj`: `(r,\\theta)\\mapsto(r,-\\theta)`; `linear-i`: `\\text{turn by }\\tfrac{\\pi}{2}\\text{, then slide by }-2i`; `linear-1i`: `(r,\\theta)\\mapsto(\\sqrt{2}\\,r,\\theta+\\tfrac{\\pi}{4})`; `sqrt`: `(r,\\theta)\\mapsto(\\sqrt{r},\\theta/2)`; `cbrt`: `(r,\\theta)\\mapsto(r^{1/3},\\theta/3)`; `seam`: `(r,\\theta_\\sigma)\\mapsto(r^{1/3},\\theta_\\sigma/3)`;
     `exp`: `x+iy\\mapsto(e^{x},\\,y)\\text{ as }(r,\\theta)`; every other function: no action.
  `same: (s) => ({ cart: cart(fmtCart(w)), polar: polar(texPolar(w)), agree })` with `agree = wFinite && |fromPolar(rw, thw) - w| < 1e-9` (not finite gives `agree: false` and `\\text{undefined}` cells).
- **Staircases.** `stairsZ.update(rz > 1e-12 ? thz : null)`; `stairsW.update(nums.wFinite && rw > 1e-12 ? thw : null)` (pass `Arg`, never `n * theta`, ARCHITECTURE 10.3.6); hidden when `answerHidden` (w one).
- **`angleStory(fn, z)`**: `null` if `|z| < 1e-12` or `w` is not finite; `ang(x) = fmtAngle(x) !== fmtNum(x) ? fmtNum(x) + ' (' + fmtAngle(x) + ')' : fmtNum(x)`; `A = Arg z`, `B = Arg w`.
  `sq`, `cube`, `zn` (n = 2, 3, n): `raw = n * A`; if `|raw - B| < 1e-9` then `n + ' * Arg z = ' + ang(raw) + '; it is already in (-pi, pi], so Arg w = ' + ang(B) + '.'` else `n + ' * Arg z = ' + ang(raw) + '; wrapped into (-pi, pi]: Arg w = ' + ang(B) + '.'`.
  `recip`, `conj`: the same with `raw = -A` and the word `-Arg z`. `sqrt`, `cbrt` (n = 2, 3): `'Arg z / ' + n + ' = ' + ang(A / n) + ', and that is Arg w: it never needs wrapping.'`.
  `seam`: `th = branchArg(z, fn.seam)`; `'The seam picks the angle ' + ang(th) + ' for z (the one in (' + fmtAngle(fn.seam) + ', ' + fmtAngle(fn.seam + 2 pi) + ']); divided by 3 it is ' + ang(th / 3) + '.'`. Other functions: `null`. Examples (run values): `cube` at `1 + i`: "3 * Arg z = 2.356 (3pi/4); it is already in (-pi, pi], so Arg w = 2.356 (3pi/4)." ; `cube` at `-1`: "3 * Arg z = 9.425 (3pi); wrapped into (-pi, pi]: Arg w = 3.142 (pi)."; `recip` at `-1`: "-Arg z = -3.142 (-pi); wrapped into (-pi, pi]: Arg w = 3.142 (pi)."

### 5.14 Recognising a problem and checking the picture

`detectProblem(specs, fn)`: `specs.length === 1` and, within 1e-9 on every number:

| spec | fn | problem |
|---|---|---|
| `verticalLine` `x = 2` | catalog `sq` | `2.1.2` |
| `verticalLine` `x = 2` | catalog `linear-i` | `2.1.3` |
| `circle` centre 1, `r = 1` | catalog `recip` | `2.5.1` |
| `circle` centre 0, `r = 1` | catalog `linear-1i` | `P4` |
| `sector` `r0 = 0`, `theta0 = 0`, `theta1 = pi/4`, any `r1 > 0` | catalog `cube` or `zn` with `n = 3` | `2.2.1` |

otherwise `null`. The problem shown is `detectProblem(...) ?? state.hint`. The hint is set by presets and requests (and is how the annulus and segment presets show 1.5.2 and 1.5.1) and cleared by any edit of the shapes or the function. The check runs only when `detectProblem` itself returned that id; otherwise `#lab-check` says "The check runs only on the exact drawing from the problem. Yours is different." for the five checked problems (`CHECKED_PROBLEMS`: 2.1.2, 2.1.3, 2.2.1, 2.5.1, P4) and "There is no numeric check for this problem. The picture is the evidence." for the hint-only ones (1.5.1, 1.5.2)

`checkProblem(id, pieces)`: `pts = every finite point of pieces`; `count = pts.length`; zero: `{ id, count: 0, maxErr: NaN, ok: false, text: 'Nothing to check yet: the image has no points on screen.' }`. The error of a point `w = u + iv`:

- `2.1.2`: `|u - (4 - v^2/16)|`. `2.1.3`: `|v|`. `2.5.1`: `|u - 1/2|`. `P4`: `| |w| - sqrt 2 |`.
- `2.2.1`: `a = |w| < 1e-9 ? 0 : Arg w`; `max(0 - a, a - 3 pi/4, 0)`.

`maxErr = max error`; `ok = maxErr < 1e-6`; `sci(x) = x === 0 ? '0' : x.toExponential(1)`. `text` is `Checked on your picture: ` + the sentence + `. It passes.` or `. It does not pass.`:
`2.1.2` "every point of the image satisfies u = 4 - v^2/16 (<count> points, largest error <sci>)"; `2.1.3` "every point of the image has v = 0, so it lies on the real axis (<count> points, largest |v| <sci>)"; `2.2.1` "every point of the image has Arg w between 0 and 3pi/4 (<count> points, outside by at most <sci>)";
`2.5.1` "every point of the image has Re w = 1/2 (<count> points, largest error <sci>)"; `P4` "every point of the image has |w| = sqrt(2) = 1.414 (<count> points, largest error <sci>)". Run values with the presets and clamp 40: `2.1.2` count 129, error 0; `2.1.3` count 129, error 0; `2.2.1` count 488, error 0; `2.5.1` count 128, error 4.8e-15; `P4` count 129, error 2.2e-16.
`#lab-check[data-ok]` is `"true"` or `"false"`.

The panel (`updateProblemPanel`): hidden when no problem. Else `p = problemById(id)`; `h2` "Problem " + id; statement from `statementParts(p.statement)`; chip "Easiest in: " + `addressLabel(p.address)` with tones `addressTones(p.address)` (class `chip`, `data-tone` from the first tone name without `--`) and `#lab-problem-why` = `prose(p.addressWhy)`;
`#lab-problem-ways`: two blocks, "Cartesian" with `prose(p.routes.cart)` under a `--cart` bar and "Polar" with `prose(p.routes.polar)` under a `--polar` bar (stacked below 560 px); `#lab-problem-answer`: `tex(box, p.answer.tex, { display: true })` inside a `.tex-scroll` with `p.answer.text` as the wrapping fallback line and the `aha`, then `#lab-check`; link `#lab-problem-link` `href="#" + routeFor(id)`.
Both `details` are closed when the panel appears; both are `hidden` while `answerHidden`.

### 5.15 The readout

`readoutText(s)`: `parts = ['f = ' + fnReadoutSrc(s.fn), 'shapes: ' + s.shapes, 'view: ' + s.view, 't = ' + fmtNum(s.t, 3)]`; in the morph view add `'s = ' + fmtNum(s.s, 3)`; when `answerHidden` add `'image hidden (predict first)'`; `line1 = parts.join('; ')`.
If the probe is on: `line2 = 'z = ' + fmtCart(z) + (answerHidden ? '' : ' -> w = ' + fmtCart(w))` and the text is `line1 + '\n' + line2`. `fmtCart` prints `undefined` for a NaN `w`. Examples: `f = z^2; shapes: 1; view: side; t = 0.4`; after `setSlider('lab-t', 0.5)`: `... t = 0.5`; the preset circle: `f = 1/z; shapes: 1; view: side; t = 0.4`;
probe at `1 + i` under `z^2`: `...\nz = 1 + i -> w = 2i`. The readout is updated on every change of `fn`, shape count, view, `t`, `s`, probe and predict state (once per frame during play).

### 5.16 Predict first

`answerHidden() = state.predict && !state.revealed`. `#lab-predict` click: `predict = !predict`; `revealed = false`; `guess = []` when turning on; `aria-pressed`; `invalidate('predict', 'view', 'colors', 'images')`. `#lab-reveal` click: `revealed = true`; `needFit = true` (the w-plane fits the image and the guess together); focus the output that just appeared (the w-plane or morph plane viewport; in a 3D view the `#lab-view3d-wrap` wrapper, `tabindex="-1"`); sr-status "Image revealed.".
Everything the image would give away is suppressed while hidden: the output wrappers (`hidden` + `aria-hidden="true"`), the domain colouring of the z-plane (it would give away `arg f`), the w parts of the probe, readout, explainer and staircases, the problem's answer, ways and why-line (`#lab-problem-why` states what the image is; a neutral line `#lab-problem-why-wait`, "Reveal the image to see why this address is the easy one.", stands in for it), the header problem chips' tooltips (`title` = `aha`, which states the answer), the 3D view (disposed), and the w cursor. `images()` still works for scripts. A preset or request resets `revealed = false` (and sets `predict` only for `predictFirst: true`). Clear my guess (`#lab-guess-clear`): `guess = []`.

### 5.17 Views and chrome

`applyView(v)`: `state.view = v` (must be in `LAB_VIEWS`); tabs: `aria-selected`, `tabindex 0` on the selected and `-1` on the others; `#lab-stage.dataset.view = v`, `aria-labelledby` the tab id; visibility (`hide = answerHidden()`): `#lab-wplane-wrap` shown iff `!hide && (v === 'side' || v === 'domain')`; `#lab-morph-wrap` iff `!hide && v === 'morph'`; `#lab-view3d-wrap` iff `!hide && is3D(v)`; `#lab-guess-wrap` iff `hide`;
`#lab-s` row and `#lab-morph-play` iff `v === 'morph'`; `#lab-wheel` legend row iff `!hide && (v === 'domain' || v === 'landscape')`; sphere chips iff `v === 'sphere'`; 4D sliders iff `v === 'graph4d'`. Domain canvases: created when `v === 'domain' && !hide`, destroyed (`dc.destroy()` and the canvas removed) otherwise.
3D: if `is3D(v) && !hide`: `rafOnce(() => { disposeView3D(); ensureView3D(); build3D(); })` (always a fresh view so axes and grid match the tab); else `disposeView3D()`. Invalidate `colors` (the domain view changes stroke colours), `images`, `3d`, `view`.
The tab list handles `ArrowLeft/ArrowRight/Home/End`: move focus and call `applyView`.
The output caption (`#lab-out-caption`) is short in the 3D views: "Modulus landscape", "Riemann sphere", "4D graph" (the tab labels stay in the tab list; the sentences are in the legends).

### 5.18 Resolution and performance management

- Planes handle device-pixel ratio and resize themselves. The domain canvases are kept at the plane's CSS size with a pixel ratio of 1 and re-rendered with `render('drag')` on every view change (5.11).
- Compute is one `flush` per animation frame, never inside a pointer handler. `pushForward` is called on the committed shapes only when `shapes`, `fn` or the w clamp changed, never on a `t` change. During a gesture only the draft is pushed forward (at most about 3000 points), once per frame.
- Texture counts are capped by `cleanSpec` (25 grid lines per direction, 24 interior rays or arcs); a brush stroke has at most 600 points; at most 40 shapes. In `computeImages` `pushForward`'s own `maxPoints` (20000) bounds the refinement of each curve.
- Layers are rebuilt only when their inputs change; the cursor, probe and draft layers read the state at draw time.
- 3D: landscape 96 x 96 (9216 vertices), 4D 64 x 64 (4096), sphere built-in; one WebGL context at a time; contents rebuilt only for `shapes`, `fn`, tab changes, and the 4D lines are updated in place on an angle change.
- Domain colouring at default size (about 463 x 463) renders in well under a frame in drag quality (at most 1.2e5 pixels) and refines in 8 ms bands.
- Targets: 60 fps while dragging a brush stroke or the probe; at least 30 fps in domain colouring and the 3D views at the default size (CONSTRAINTS).

### 5.19 Keyboard, themes and notices

- `onKey(e)` on `document`: only when `e.target` is the z-plane viewport element or `document.body` and not inside an input, textarea, select or contenteditable: `Escape`: `draft = null`; `Enter`: `closePolygon()` when a polygon draft has 3 or more corners; `Backspace`: remove the last corner of a polygon draft; `Ctrl/Cmd+Z` (no Shift): `undo()` (call `preventDefault`).
- `ctx.theme.onThemeChange(() => drawColorWheel(wheelCanvas, { size: 96 }))`; the explainer re-renders itself; planes and the 3D view follow the theme on their own; the domain data is theme independent.
- `notice(msg)`: set `#lab-notice.textContent = msg` and clear it after 5000 ms (one timer, replaced on the next notice, cleared in unmount). `#lab-sr-status` is set with a short sentence on each action.

---

## 6. Mathematics

Notation: `z = x + iy = r e^{i theta}` with `theta = Arg z` in (-pi, pi] (`atan2(y, x)`; `Arg` of a negative real is `+pi`, of 0 is 0); `arg z = { Arg z + 2 pi k }`; `w = f(z) = u + iv = rho e^{i phi}`, `phi = Arg w`. All values below were computed by running the
shipped modules (Node 22) and checked by hand.

### 6.1 Formulas the Lab uses

1. **Two addresses.** `r = sqrt(x^2 + y^2)`, `theta = atan2(y, x)`, `x = r cos theta`, `y = r sin theta`. `z_1 z_2 = r_1 r_2 e^{i(theta_1 + theta_2)}`: multiplying spins and stretches. Adding slides.
2. **Time.** A stroke is `z(t)`, `0 <= t <= 1`. Its image is `f(z(t))` with the same `t` (pieces keep `t`). `t` is the parameter of the builder: linear for a segment and the vertical line, `angle / 2 pi` for a circle, cumulative arclength over total length for a freehand stroke, a rectangle and a sector boundary.
   The morph is `m_s(z) = (1 - s) z + s f(z)`, `s` in [0, 1] (`m_0 = identity`, `m_1 = f`).
3. **Powers.** `z^n = r^n e^{i n theta}`. A sector `0 < arg z < alpha` goes to `0 < arg w < n alpha` (no overlap while `n alpha < 2 pi`). `Arg(z^n) = wrap(n Arg z)` where `wrap(x) = x - 2 pi k` is the representative in (-pi, pi].
4. **Reciprocal.** `1/z = (1/r) e^{-i theta} = (x - iy)/(x^2 + y^2) = conj z / |z|^2`: invert the length, mirror the angle. `1/0` is the point at infinity.
5. **Linear.** `(1 + i) z = sqrt 2 e^{i pi/4} z`: stretch `sqrt 2`, spin 45 degrees. `i z - 2 i = i (z - 2)`: slide by `-2`, then a counterclockwise quarter turn; equally a quarter turn followed by a slide by `-2i`.
6. **Domain colouring.** `hue(w) = (Arg w / 2 pi) mod 1` (red at `w > 0`, `hue(i) = 1/4`, `hue(-1) = 1/2`, `hue(-i) = 3/4`); lightness `L = (1 - 1/(1 + sqrt|w|)) (0.88 + 0.12 frac(log2 |w|))`, saturation 0.8; black at 0, white at infinity. Every step `theta + 2 pi k` has the same hue.
7. **Stereographic projection.** `(X, Y, Z) = (2x, 2y, |z|^2 - 1) / (|z|^2 + 1)`; `0` is the south pole `(0, 0, -1)`, `infinity` the north pole `(0, 0, 1)`, the unit circle the equator. `stereographic(1/z) = (X, -Y, -Z)`: a half turn about the axis through `1` and `-1`.
   At `z = 2 + i`: `(0.666667, 0.333333, 0.666667)` and for `1/z`: `(0.666667, -0.333333, -0.666667)` (run).
8. **Landscape and 4D graph.** Landscape: `(x, y, |f(z)|)` coloured by `Arg f(z)`. The graph of `f` is `{ (x, y, u, v) }`. `rotate4(p, { uv, yv })`: `u' = u cos(uv) - v sin(uv)`, `v' = u sin(uv) + v cos(uv)`, then `y' = y cos(yv) - v' sin(yv)`, `v'' = y sin(yv) + v' cos(yv)`; the drawn point is `(x, y', u')`, the colour is `v''`.
   With `uv = pi/2`, `(x, y, u, v)` becomes `(x, y, -v, u)`: the Re surface becomes (minus) the Im surface.
9. **A branch of the cube root with seam sigma.** `theta_sigma` is the unique `Arg z + 2 pi k` in `(sigma, sigma + 2 pi]`; `f_sigma(z) = |z|^{1/3} e^{i theta_sigma / 3}`. `f_{-pi}` is the principal cube root. At `z = -1`: `theta_sigma = pi` for both `sigma = -pi` and `sigma = 0`, so `f(-1) = e^{i pi/3} = 0.5 + 0.866025i`; just below the axis, at `-1 - 1e-12 i`, `sigma = -pi` gives `0.5 - 0.866025i` (a jump) and `sigma = 0` gives `0.5 + 0.866025i` (continuous).
10. **Polar rectangle.** The set `{ r e^{i theta} : r0 <= r <= r1, theta0 <= theta <= theta1 }` is to polar coordinates what `{ x0 <= x <= x1, y0 <= y <= y1 }` is to Cartesian ones. `sectorFromCorners` builds it from two corners (5.5).
11. **Orientation.** For a simple closed polygon `A = 1/2 sum (x_i y_{i+1} - x_{i+1} y_i)`; `A > 0` is counterclockwise, positive orientation (interior on the left). `classify` gives `orientation` 1, -1 or 0 (0 for open curves and for curves that cross themselves).
12. **Fitting.** `imageBounds`: `cap = max(4, 2.5 * q90)` where `q90` is the 90th percentile of `|w|`; keep `|w| <= cap`; bounds of those. `clampRadiusFor`: `max(40, 3 * max(halfW, halfH)) + |center|`.
13. **Parabola with a focus.** `u = c^2 - v^2/(4 c^2)` is the image of `x = c` under `z^2` (vertex `c^2`, focus 0, directrix `u = 2 c^2`); in polar form about 0, `rho = 2 c^2 / (1 + cos phi)`.

### 6.2 Worked solutions of the covered problems (both addresses, hand-checked)

For each problem: the set-up the Lab loads, the working in the address that makes it easy and in the other address, the numbers the Lab shows (`z(t)` from `pointAt`, `w(t)` from the compiled `f`), and what the check asserts. `(run)` values are what the code prints.

#### 2.1.2 Image of the line x = 2 under w = z^2

Lab: `#lab-preset-x2` (or `#lab-2-1-2`): `verticalLine(2)` with `y` in [-4, 4], `t = (y + 4) / 8`, `f = z^2`. Address that makes it easy: Cartesian with time (`z = 2 + iy`, `y` is the clock).

- **Cartesian.** `z = 2 + iy`, so `z^2 = (4 - y^2) + 4iy`. Hence `u = 4 - y^2`, `v = 4y`. Eliminate the clock: `y = v/4`, so **`u = 4 - v^2/16`**: a parabola with vertex `4`, opening to the left. Writing it `(u - 4) = -(1/16) v^2` gives focal length `p = 4`, so the focus is `4 - 4 = 0` and the directrix is `u = 8`.
  Check at `y = 1`: `z = 2 + i`, `z^2 = (2 + i)^2 = 4 + 4i + i^2 = 3 + 4i`; `u = 4 - 1 = 3` and `4 - 16/16 = 3`. Distance from `3 + 4i` to the focus 0 is 5; to the directrix `u = 8` is `8 - 3 = 5`.
- **Polar.** On `x = 2`: `r cos theta = 2`, so `r = 2 sec theta`, `theta` in `(-pi/2, pi/2)`, `theta = atan(y/2)`. Squaring: `rho = r^2 = 4 sec^2 theta`, `phi = 2 theta` in `(-pi, pi)`. With `cos phi = 2 cos^2 theta - 1`: `1 + cos phi = 2 cos^2 theta`, so `rho (1 + cos phi) = 4 sec^2 theta * 2 cos^2 theta = 8`, i.e. **`rho = 8 / (1 + cos phi)`**, a conic of eccentricity 1 about the focus 0: a parabola, vertex `rho = 4` at `phi = 0`, opening toward `phi = +-pi`.
  Numbers: `y = 1`: `theta = 0.463648`, `r = sqrt 5 = 2.236068`, `rho = 5`, `phi = 0.927295` (`cos phi = 0.6`, `sin phi = 0.8`), `w = 5 (0.6 + 0.8i) = 3 + 4i`. `y = 2`: `theta = pi/4`, `r = 2 sqrt 2`, `rho = 8`, `phi = pi/2`, `w = 8i`. `y = 4`: `theta = atan 2 = 1.107149`, `r = sqrt 20 = 4.472136`, `rho = 20`, `phi = 2.214297`, `cos phi = -3/5`, `w = 20(-0.6 + 0.8i) = -12 + 16i`. In every case `rho (1 + cos phi) = 8`.
- **The Lab (run).** `t`: 0, 0.25, 0.5, 0.75, 1 gives `z = 2 - 4i, 2 - 2i, 2, 2 + 2i, 2 + 4i` and `w = -12 - 16i, -8i, 4, 8i, -12 + 16i`. At the default `t = 0.4`: `z = 2 - 0.8i`, `w = 3.36 - 3.2i`. `images()`: 1 piece, 129 points, `max |u - (4 - v^2/16)| = 0`. The probe at any `z` on the line shows `rho (1 + cos phi) = 8`.
- **Check** (`checkProblem('2.1.2')`): count 129, `maxErr 0`, passes.

#### 2.1.3 Image of x = 2 under f(z) = iz - 2i, and what the map does

Lab: `#lab-2-1-3` (x = 2 and `f = iz - 2i`), or x = 2 then the chip `iz - 2i` (the panel switches to 2.1.3 by itself). Address: polar for the motion, Cartesian for the line.

- **Cartesian.** `z = 2 + iy`: `i z = 2i + i^2 y = 2i - y`; `i z - 2i = -y`. So `w = -y`: real, and every real number is reached: the image is the **real axis `v = 0`** (here the segment `-4 <= u <= 4`). Sample (from the data): `z = 2 + 3i` gives `w = -3`.
- **Polar.** `i z - 2 i = i (z - 2)`: first slide left by 2 (the line `x = 2` becomes the imaginary axis `z - 2 = iy`), then multiply by `i = e^{i pi/2}`: add 90 degrees to every angle, keep every length. The imaginary axis (direction `i`) turned by `i` has direction `i * i = -1`: the real axis.
  **In general:** a counterclockwise quarter turn about 0 followed by a slide by `-2i` (distances and angles between points never change).
- **The Lab (run).** `t`: 0, 0.25, 0.5, 0.75, 1 gives `w = 4, 2, 0, -2, -4` (all with `v = 0` exactly). `images()`: 1 piece, 129 points, `max |v| = 0`. Check: count 129, `maxErr 0`.

#### 2.2.1 Image of the sector 0 < arg z < pi/4 under w = z^3

Lab: `#lab-preset-sector` (or `#lab-2-2-1`): the fan `r` in [0, 2], `theta` in [0, pi/4], `f = z^3`. Address: polar.

- **Polar.** `z = r e^{i theta}` goes to `r^3 e^{3 i theta}`. The lengths `r > 0` reach every length; the angles `0 < theta < pi/4` become `0 < 3 theta < 3 pi/4`. Since `3 pi/4 < 2 pi` the image does not overlap itself: the **sector `0 < arg w < 3 pi/4`** (three times as wide).
- **Cartesian.** `z^3 = (x^3 - 3 x y^2) + i (3 x^2 y - y^3)`. The edge `y = 0`, `x > 0` goes to `x^3`, the positive real axis. The edge `y = x`, `x > 0` goes to `(x^3 - 3x^3) + i(3x^3 - x^3) = x^3 (-2 + 2i)`, pointing at 135 degrees = `3 pi/4`. Check at `z = 1 + i`: `(1 - 3) + i(3 - 1) = -2 + 2i`, `|w| = 2 sqrt 2 = 2.828427`, `Arg w = 3 pi/4`.
- **The Lab (run).** The boundary (145 points, closed, `corners 3`, positive orientation): `z = 0` at `t = 0`, the corner `z = 2` at `t = 0.359016` (`w = 8`), the corner `z = sqrt 2 + sqrt 2 i` at `t = 0.640984` (`w = 8 e^{i 3 pi/4} = -5.656854 + 5.656854i`), back to 0 at `t = 1`.
  (`t` is cumulative arclength over `4 + pi/2 = 5.570796`, so the corner `t`s are read from the points, not from `2/5.5708 = 0.35902`.) Interior rays at `theta = pi/20, pi/10, 3pi/20, pi/5` (9, 18, 27, 36 degrees) reach `r = 2` at `1.975377 + 0.312869i, 1.902113 + 0.618034i, 1.782013 + 0.907981i, 1.618034 + 1.175571i`, mapped to `7.128052 + 3.631924i, 4.702282 + 6.472136i, 1.251476 + 7.901507i, -2.472136 + 7.608452i`
  (angles 27, 54, 81, 108 degrees, length 8). Interior arcs at `r = 0.5, 1, 1.5` map to the arcs `|w| = 0.125, 1, 3.375` from angle 0 to `3 pi/4`. `2 e^{i pi/8}` maps to `8 e^{i 3 pi/8} = 3.061467 + 7.391036i`. `images()`: 8 pieces, 488 points, all with `Arg w` in `[0, 3 pi/4]` (`Arg 0 = 0`). Check: count 488, `maxErr 0`.

#### 2.5.1 Image of the circle |z - 1| = 1 under w = 1/z

Lab: `#lab-preset-circle1` (or `#lab-2-5-1`): `circle(1, 1)`, `t = alpha / 2 pi` for `z = 1 + e^{i alpha}`, `f = 1/z`. Address: polar.

- **Polar.** The circle passes through 0. In polar coordinates about 0: `|z|^2 = 2 x` gives `r = 2 cos theta`, `theta` in `(-pi/2, pi/2)`, `z = 2 cos theta e^{i theta}`. Then `1/z = e^{-i theta} / (2 cos theta) = (cos theta - i sin theta) / (2 cos theta) = 1/2 - (i/2) tan theta`. The real part is stuck at **1/2** while `tan theta` runs over all reals: the image is the **line `Re w = 1/2`**. The circle passes through 0, which `1/z` sends to infinity, so the circle opens into a line.
- **Cartesian.** `|z - 1|^2 = 1` is `x^2 + y^2 = 2x`. `w = 1/z = (x - iy)/(x^2 + y^2)`: `u = x/(x^2 + y^2) = x/(2x) = 1/2` (for `z != 0`) and `v = -y/(2x)` takes every real value. Cross-check by substituting `z = 1/w`: `|1/w - 1| = 1` becomes `|1 - w| = |w|`: `w` is as far from 1 as from 0, so it lies on the perpendicular bisector `Re w = 1/2`.
- **The Lab (run).** `alpha = 0, pi/2, pi, 3pi/2, 2pi` (`t = 0, 0.25, 0.5, 0.75, 1`): `z = 2, 1 + i, 0, 1 - i, 2`; `w = 0.5, 0.5 - 0.5i, (pole), 0.5 + 0.5i, 0.5`. Also `alpha = pi/3`: `z = 1.5 + 0.866025i`, `|z|^2 = 3 = 2x`, `w = 0.5 - 0.288675i`. In polar form `theta = pi/3` gives `z = 0.5 + 0.866025i` and `w = e^{-i pi/3} = 0.5 - 0.866025i = 1/2 - (i/2)(1.732051)`.
  `images()` at clamp 40: 2 pieces (64 + 64 points; the sample at `t = 0.5` has `|w| = 8.2e15` and is cut), `max |u - 1/2| = 4.8e-15`. In the sphere view the pieces are joined over the pole into one curve of 128 points. At `t = 0.5` the w cursor is hidden (`pointOnPieces` is `null` in the gap). Check: count 128, `maxErr 4.8e-15`.

#### P4 The image of the unit circle under f(z) = (1 + i) z

Lab: `#lab-preset-unit` (or `#lab-P4`): `circle(0, 1)`, `f = (1+i)z`. Address: polar.

- **Polar.** `1 + i = sqrt 2 e^{i pi/4}`. For `z = e^{i s}`: `w = sqrt 2 e^{i (s + pi/4)}`. The length is always `sqrt 2`; the angle `s + pi/4` runs once around as `s` does. So the image is the entire circle `|w| = sqrt 2`.
- **Cartesian.** `w = (1 + i)(x + iy) = (x - y) + i(x + y)`, so `|w|^2 = (x - y)^2 + (x + y)^2 = 2 (x^2 + y^2) = 2` when `x^2 + y^2 = 1`. Every `w` with `|w| = sqrt 2` is reached: `z = w / (1 + i)` has `|z| = |w| / sqrt 2 = 1`.
- **The Lab (run).** `t = 0, 0.25, 0.5, 0.75, 1`: `z = 1, i, -1, -i, 1`; `w = 1 + i, -1 + i, -1 - i, 1 - i, 1 + i`, each `|w| = 1.414213562`. `images()`: 1 piece, 129 points, `max ||w| - sqrt 2| = 2.2e-16`. Check: count 129, `maxErr 2.2e-16`.

#### Shape presets that carry no handout answer here

- **1.5.1** `segment(2 + i, -3 - 3i)`: `z(t) = (2 - 5t) + i(1 - 4t)`; `t = 0.5` gives `-0.5 - i` (run), `t = 0` and `1` the endpoints.
- **1.5.2** `annulus(centre -i, r0 = 1, r1 = 3)`: curves `inner, outer, ring1, ring2, ray0..ray7` (12). `inner` starts at `-i + 1 = 1 - i`, `outer` at `3 - i`. Under `z^2`: `(1 - i)^2 = -2i` and `(3 - i)^2 = 8 - 6i` (run).

### 6.3 Other values the tests pin

- **Domain colouring (A5).** For `f = z^2` at `|z| = 1.5`, angles `k pi/4`, `k = 0..7`: `hueOf(f(z)) = 0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75` (twice round); RGB with rings at `|w| = 2.25`: `(232, 44, 44)`, `(138, 232, 44)`, `(44, 232, 232)`, `(138, 44, 232)` for hues 0, 1/4, 1/2, 3/4. For `z^3`: `0, 0.375, 0.75, 0.125, 0.5, 0.875, 0.25, 0.625` (three turns). `colorOf(1) = [202, 22, 22]` with rings, `lightnessOf(1) = 0.5`.
- **Shape classification (`classify`, run).** Rectangle `0.5 + 0.5i` to `1.5 + 1.5i`: closed, simple, orientation +1, 4 corners, not smooth, piecewise smooth. Circle: closed, simple, +1, 0 corners, smooth. Segment and vertical line: open, orientation 0. Sector boundary: closed, simple, +1, 3 corners.
  Clockwise triangle `0, i, 1`: -1, 3 corners. Self-crossing polygon `0, 1 + i, 1, i`: not simple, orientation 0, 4 corners. A three-point stroke `0, 3 + 4i, 3 + 8i` (freehand, `minDist` 0): open, orientation 0, 1 corner.
- **Landscape and 4D parameters** and **image bounds**: 5.9 and 5.11.
- **Probe numbers** at `1 + i` for the 15 functions: 5.13. The 2.1.1 pair: `z^2 + iz` at `1 + i` has `u = x^2 - y^2 - y = -1`, `v = 2xy + x = 3`, and in polar form `r^2 cos 2 theta - r sin theta = 0 - 1 = -1`, `r^2 sin 2 theta + r cos theta = 2 + 1 = 3`: both columns agree with `w = -1 + 3i`.
- **Angle stories** (5.13) and **readouts** (5.15): the strings are the expected values.
- **Snap and sector corners**: 5.5. **Brush smoothing** of `(0,0), (1,0), (2,5), (3,0), (4,0)` is `(0,0), (1, 1.666667), (2, 1), (3, 1.666667), (4, 0)` (run).
- **Cost** (Node, warm, run): `pushForward` of 34 Cartesian-grid curves under `z^2` 4.8 ms, 24 polar-grid curves 1.4 ms, a 600-point stroke 0.8 ms; both grids plus a stroke under `1/z` 3.2 ms per flush, 6.1 ms for the commit-time double pass.

---

## 7. Verification plan

Run everything from the repo root. The harness runs each route at desktop (1280 x 860) and phone (390 x 844), and `--dark` adds a third desktop run with `prefers-color-scheme: dark`. Interaction scripts must pass at all of them.

| Id | Command | Passes when |
|---|---|---|
| A1 | `node tools/smoke.mjs --route lab,lab-2-5-1,lab-2-2-1,lab-P4 --dark --wait 1500 --out /tmp/lab-a1` | `12/12 checks passed across 4 route(s)`: no console error, page error, failed or external request, horizontal overflow of more than 1 px, router error panel or empty `#view`, at 1280, 390 and dark 1280, for the blank Lab and the three token presets |
| A2, A3, A4, A5 | `node tools/smoke.mjs --route lab --script tests/interact/i1-station-lab.mjs --dark --out /tmp/lab-a2` | `3/3 checks passed across 1 route(s)`, exit code 0, and the screenshots of 7.3 look right |
| A6 | `node --test tests/unit/i1-station-lab.test.mjs` (test U24) plus the inspection list of 7.4 | the import list is present and the forbidden patterns are absent |
| unit | `node --test tests/unit/i1-station-lab.test.mjs`, then `npm test` | the new file passes and the whole suite stays green (287 tests before this goal) |

### 7.1 Acceptance criteria

- **A1 (smoke).** The command above. Before the Lab exists the four routes show the router's under-construction panel and fail; they pass once `js/stations/lab.js` lands. `lab-2-5-1`, `lab-2-2-1` and `lab-P4` load a preset at mount: the readouts are `f = 1/z; shapes: 1; ...`, `f = z^3; ...`, `f = (1+i)z; ...`.
- **A2 (draw a rectangle through z^2, six views, undo and clear).** Script part A2 (Appendix A): blank start; `lab-tool-rect`; drag from `planePixel('lab-zplane', 0.5 + 0.5i)` to `planePixel('lab-zplane', 1.5 + 1.5i)`; `shapes().length === 1`; every point of `shapes()[0].points` has `max(|re - 1|, |im - 1|) = 0.5` within 1e-6 and `t` runs from 0 to 1 (the first point has `t = 0`, the last `t = 1`, non-decreasing);
  `lab-fn-sq`: `images().length >= 1` and every image point equals `pointAt(shape, t)^2` within 1e-6; for each of the six tabs: click, wait 400 ms, `view()` equals the name, no page error, at most one entry in `window.__mv.views3d`, no horizontal overflow; back in `side`: `setSlider('lab-t', 0.5)` gives a readout containing `t = 0.5`;
  `lab-undo` gives 0 shapes; draw again; `lab-clear` gives 0; `lab-undo` brings 1 back.
- **A3 (presets and parser).** Script part A3: `#lab-2-5-1` (readout contains `1/z` and `shapes: 1`; every finite image point `|u - 0.5| < 1e-6`); `#lab-2-1-2` (`z^2`; every point `|u - (4 - v^2/16)| < 1e-6`); `#lab-2-2-1` (`z^3`; every point has `Arg` in `[-1e-6, 3 pi/4 + 1e-6]`, computed with `complex.js` `Arg` inside `page.evaluate`);
  `#lab-P4` (`(1+i)z`; every point `| |w| - sqrt 2 | < 1e-6`); typing `z^2 + iz` into `#lab-fn-src` and `#lab-fn-apply` gives a readout containing `z^2 + iz`, empty `#lab-fn-error`; typing `z +` gives a non-empty `#lab-fn-error` equal to the parser's own message `The formula stops too early. Something is missing after "+".`, a `mark` in `#lab-fn-echo`,
  and the readout still containing `z^2 + iz`; `#lab-preset-circle1` has `data-problem="2.5.1"` and contains `a[href="#problem-2-5-1"]`. Unit tests U5, U11, U14 cover the same numbers without a browser.
- **A4 (predict first and the hand-off).** Script part A4: `lab-predict`, then `lab-preset-unit`: `#lab-wplane-wrap` has `offsetParent === null` (and `aria-hidden="true"`), `#lab-reveal` is visible, `#lab-guess-wrap` is visible; a stroke dragged on `lab-gplane` adds one guess; `lab-reveal`: the wrapper is visible and `#lab-reveal` is not.
  Then `localStorage.setItem('mv:lab.request', ...)` as in the criterion, `location.hash = '#home'`, wait 500 ms, `'#lab'`, wait 1200 ms: `view() === 'sphere'`, `shapes().length === 1`, readout contains `1/z`, `localStorage.getItem('mv:lab.request') === null`, `#lab-problem` has `data-problem="2.5.1"`.
- **A5 (domain colouring screenshot).** Script part A5: `#lab-P4`, `lab-fn-sq`, `lab-view-domain`, wait for `data-dc-pending` to clear, sample the z-plane domain canvas at `1.5 e^{i k pi/4}` (RGB to hue): `0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75` within 0.03 (circular distance), `#lab-wheel` visible, then `ctx.shot('domain')`. The review checklist is 7.3.
- **A6 (code inspection).** 7.4.

### 7.2 Unit tests: `tests/unit/i1-station-lab.test.mjs` (`node:test`, `node:assert/strict`, imports `../../js/stations/lab.js` in Node)

Tolerance 1e-9 unless stated. `z(a, b)` is `{ re: a, im: b }`.

| Id | Call | Expected |
|---|---|---|
| U1 | `LAB_LIMITS`, `LAB_VIEWS`, `LAB_PRESETS` | limits `{ maxShapes: 40, maxPolygonVertices: 100, maxFreehandPoints: 600, maxRawSamples: 4000, lineSpan: 4, history: 50 }`; views in the order `side, morph, domain, landscape, sphere, graph4d`; presets keys `x2, circle1, unit, sector, annulus, segment` with the problems, functions and specs of 5.3; every `spec` survives `cleanSpec` unchanged (deep equal); `fn` ids exist in `FUNCTIONS`; all frozen |
| U2 | `cleanSpec` | circle `r: -1` gives `r: 1`; circle `r: 0` is `null`; rect with zero width is `null`; `{ kind: 'nope' }`, `null`, `42` give `null`; a `NaN` coordinate gives `null`; `1e9` is clamped to 1000; `-0` becomes `0` (`Object.is(x, 0)`); `sector` `{ r0: 2, r1: 0, theta0: 0, theta1: pi/4 }` gives `{ r0: 0, r1: 2, theta0: 0, theta1: pi/4 }`; sector `theta0: 0, theta1: 0` has sweep `2 pi`; `theta1: -pi/2` from `theta0: 0` has sweep `3 pi/2`; sector `fillRays: 99` clamps to 24; polygon `[0, 1, 1 + i, 0]` drops the closing vertex (3 vertices); polygon of 2 vertices is `null`; 150 vertices keep 100; freehand with 700 points keeps at most 600 and ends on the last point; freehand with all points equal is `null`; cartGrid `xRange: [2, -2], yRange: [-2, 2], step: 0.01` gives `xRange: [-2, 2]` and `step = 4/24`; annulus `r0 = 0` is `null` |
| U3 | `specToCurves` | rect `0.5 + 0.5i` to `1.5 + 1.5i` (id `s1`): one curve, id `s1`, 129 points, first point `(0.5, 0.5)`, `t` from 0 to 1, every point at Chebyshev distance 0.5 from `1 + i` within 1e-12, `closed`, family `cart`, role `primary`; circle centre 1 radius 1: 129 points, closed, family `polar`; verticalLine 2: 129 points, `re = 2`, `im` from -4 to 4, family `cart`; sector preset: 8 curves with ids `s1.boundary, s1.ray1..ray4, s1.arc1..arc3`, roles `primary` then 7 `texture`, boundary 145 points and closed; annulus preset: 12 curves, roles primary for `s1.inner` and `s1.outer` only; cartGrid `[-1,1] x [-1,1]`, step 0.5: 10 curves `s1.gx0..gx4, s1.gy0..gy4`, all texture, 97 points each; freehand `0, 3 + 4i, 3 + 8i`: `t` = `0, 5/9, 1` (`0.5556`), length 9; segment preset: `pointAt(shape, 0.5)` is `-0.5 - i`; records: `buildRecord` fields as 5.7 |
| U4 | `resolveToken` | `'2-5-1'` gives `circle1`, fn `recip`, problem `2.5.1`; `'2-1-3'` gives `x2`, fn `linear-i`, problem `2.1.3`; `'P4'` and `'p4'` give `unit`; `'problem-2-2-1'` gives `sector`; `'2-1-2'` gives `x2`, fn `sq`; `'nope'`, `''`, `'2-5-2'` give `null` |
| U5 | `parseLabRequest` | the request of A4 gives `fn: { id: 'recip' }`, one spec `{ kind: 'circle', center: z(1, 0), r: 1 }`, `view: 'sphere'`, `problem: '2.5.1'`, `predictFirst: false`, `dropped: 0`; `{ fn: { src: 'z^2 + iz' } }` gives `{ src }`; `fn: 'nope'` gives `null`; `view: 'cube'` gives `null`; `problem: '9.9.9'` gives `null`; 45 shapes whose first 40 contain 5 invalid ones give 35 specs and `dropped: 5` (the list is cut to 40 first, then cleaned); `null`, `undefined`, `'x'` give the empty result; never throws |
| U6 | `makeFn`, `fnReadoutSrc` | `{ id: 'sq' }`: kind `catalog`, `f(z(1, 1))` is `z(0, 2)`; readout `z^2`; `{ zn: 5 }`: `z^5`, `f(z(1, 1))` is `z(-4, -4)`; `{ zn: 99 }` clamps to 8; `{ seam: 0 }`: readout `z^(1/3) [seam at 0]`, `f(z(-1, 0))` is `z(0.5, 0.866025...)`; `{ seam: -pi }`: readout `z^(1/3) [seam at -pi]`; `{ seam: -pi/2 }`: `[seam at -pi/2]`; `{ src: '  z^2 + iz ' }`: kind `custom`, readout `z^2 + iz`, `f(z(1, 1))` is `z(-1, 3)`; `{ src: 'z +' }` throws `ParseError` with `position 3`, `length 1`, message `The formula stops too early. Something is missing after "+".`; `{ src: 'abs(z)' }` throws with `position 0` and the message `Bars are not supported. Use abs(z) for the modulus, like abs(z - 1).`; `{ id: 'nope' }` throws `RangeError` |
| U7 | `snapStep`, `snapPoint`, `snapPolar` | `snapStep(9) = 0.25`, `snapStep(4.5) = 0.125`, `snapStep(2) = 0.05`, `snapStep(20) = 0.5`, `snapStep(40) = 1.25`; `snapPoint(z(0.4961, 0.5104), 0.25)` is `z(0.5, 0.5)`; `snapPoint(z(-0.01, 1.4999), 0.25)` is `z(0, 1.5)` with `Object.is(re, 0)`; `snapPoint(z(0.07, -0.07), 0.25)` is `z(0, 0)` (no `-0`); `snapPolar(z(1.5, 1.5), 0.25, pi/12)` is `z(1.4142135624, 1.4142135624)` (1e-9); `snapPolar(z(2.02, 0.05), 0.25, pi/12)` is `z(2, 0)`; `snapPolar(z(0.05, 0.05), 0.25, pi/12)` is `z(0, 0)` |
| U8 | `sectorFromCorners` | `A = 2`, `B = 2 e^{i pi/4}`: fan `{ r0: 0, r1: 2, theta0: 0, theta1: pi/4, degenerate: false }`; swapped gives the same; non-fan with `A = 1`, `B = 2 e^{i pi/4}` (snapped): `r0 = 1, r1 = 2`; `A = B` gives `degenerate: true`; `A = 2`, `B = 2 e^{i 3 pi/4}`: `theta0 = 0`, `theta1 = 3 pi/4`; `A = 2`, `B = -2` (half turn): `d = pi`, `theta0 = 0`, `theta1 = pi`; `A = 2 e^{i 0.1}`, `B = 2 e^{-i 0.1}`: `theta0 = -0.1`, `theta1 = 0.1` |
| U9 | `smoothStroke` | `(0,0), (1,0), (2,5), (3,0), (4,0)` gives `(0,0), (1, 5/3), (2, 1), (3, 5/3), (4, 0)`; first and last exact; 2 samples unchanged; a straight line of 9 points unchanged; empty array gives `[]` |
| U10 | `clampRadiusFor` | `{ center: 0, unitsAcross: 9 }`, size 463 x 463: 40; `unitsAcross: 100`: 150; `{ center: 30 + 40i, unitsAcross: 20 }`, size 400 x 200: `max(40, 3 * 10) + 50 = 90`; a size with `h > w` uses `halfH` |
| U11 | `computeImages` (clamp 40 unless noted; curves from `specToCurves` of the presets with ids `s1...`) | `x2` under `sq`: 1 piece, 129 points, `max abs(u - (4 - v^2/16)) = 0`; `x2` under `linear-i`: 1 piece, 129 points, every `im === 0`; `circle1` under `recip`: 2 pieces, 128 points in all, `max abs(u - 0.5) < 1e-9`, no point with `abs(w) > 40`; with `{ join: true }`: 1 piece of 128 points; `unit` under `linear-1i`: 1 piece, 129 points, `max abs(abs(w) - sqrt 2) < 1e-9`; `sector` under `cube`: 8 pieces, 488 points, every `Arg` in `[0, 3 pi/4 + 1e-9]`; every piece has `curveId === source` and `shapeId === 's1'`; `unit` under `sqrt` with `join: true` stays 2 pieces (69 and 72 points); the imaginary axis under `recip` joins 2 pieces into 1 (128 points); a throwing `f` gives `[]` |
| U12 | `imageBounds` (pieces as in U11) | `x2/sq`: `xRange [-12, 4]`, `yRange [-16, 16]`, `cap` 42.852 (1e-3); `x2/linear-i`: `xRange [-4, 4]`, `yRange [0, 0]`; `circle1/recip` (clamp 40): `xRange [0.5, 0.5]`, `yRange [-6.778, 6.778]` (1e-3), 124 of 128 points kept; `unit/linear-1i`: `[-1.414214, 1.414214]` both, `cap` 4; `sector/cube`: `xRange [-5.656854, 8]`, `yRange [0, 8]`; empty list: `null` |
| U13 | `detectProblem` | exact preset specs with the matching functions give `2.1.2`, `2.1.3`, `2.5.1`, `P4`, `2.2.1` (the sector also with `r1: 3` and with `zn: 3`); `x = 2.1` gives `null`; `x2` with `cube` gives `null`; two shapes give `null`; circle centre 1 `r = 1` with `sq` gives `null`; sector `theta1 = pi/3` gives `null` |
| U14 | `checkProblem` (pieces of U11) | `2.1.2`: `count 129`, `maxErr 0`, `ok`, text starts `Checked on your picture: every point of the image satisfies u = 4 - v^2/16 (129 points, largest error 0). It passes.`; `2.1.3`: 129, 0; `2.2.1`: 488, 0; `2.5.1`: 128, `maxErr < 1e-9`, text contains `Re w = 1/2` and `largest error 4.8e-15`; `P4`: 129, `maxErr < 1e-12`, text contains `\|w\| = sqrt(2) = 1.414`; the pieces of a circle centre `1.01` under `recip` fail `2.5.1` (`ok === false`, `maxErr > 1e-3`, text ends `It does not pass.`); empty pieces give `count 0`, `ok false`, `Nothing to check yet: the image has no points on screen.`; an unknown id gives `null` |
| U15 | `landscapeParams`, `graph4dParams` (curves of U11) | `x2/sq`: landscape `{ half: 4.5, clamp: 21 }`, 4D `clamp 16.8`; `circle1/recip`: `half 2.5`, `clamp 21.3926` (1e-3), 4D `21.3861`; `unit/linear-1i`: `half 2`, `clamp 6`; `sector/cube`: `half 2.5`, `clamp 8.4`; no curves: `half 2`, `clamp 6`, `count 0` |
| U16 | `liftCurve3`, `liftCurve4`, `project4` | `x2/sq` first point `(2, -4)`: `[2, -4, 20 + 0.01 * 21]` = `[2, -4, 20.21]`; a point with `abs(w) = 100` (use `f = (z) => z(100, 0)`) gives `[NaN, NaN, NaN]`; a point at `re = 5` with `half = 4.5` gives `[NaN, NaN, NaN]`; `liftCurve4` first point of `x2/sq` is `[2, -4, -12, -16]` (clamp 16.8 keeps `-16`); a `abs(u) = 100` point gives `null`; `project4([[1, 2, 3, 4]], { uv: pi/2, yv: 0 })` is `[[1, 2, -4]]` (1e-9); with `{ uv: 0, yv: 0 }` it is `[[1, 2, 3]]`; a `null` gap gives `[NaN, NaN, NaN]` |
| U17 | `probeNumbers` at `1 + i` | the 15 rows of 5.13 (`w` to 1e-6, `rw`, `thw`); at `z = 0` with `recip`: `wFinite === false`, `rw` and `thw` NaN, `rz = 0`; `thz = 0` |
| U18 | `angleStory` | the strings of 5.13: `cube` at `1 + i`, `cube` at `-1`, `sq` at `-1`, `sq` at `1 + i`, `recip` at `-1`, `recip` at `1 + i`, `sqrt` at `1 + i`, `zn: 5` at `1 + i`, `seam 0` at `-1`, `seam -pi` at `-1` (exact text); `z = 0` gives `null`; `exp` gives `null` |
| U19 | `readoutText` | `f = z^2; shapes: 1; view: side; t = 0.4`; morph adds `; s = 0.5`; hidden adds `; image hidden (predict first)`; probe on at `1 + i` under `sq`: second line `z = 1 + i -> w = 2i`; probe at 0 under `recip`: `z = 0 -> w = undefined`; probe with `answerHidden`: second line `z = 1 + i`; `t = 0.5` prints `t = 0.5`, `t = 1` prints `t = 1`, `t = 0` prints `t = 0`; `shapes: 0` is allowed; no output ever contains `NaN` |
| U20 | `describeSpec` | `rect` "rectangle", `circle` "circle", `segment` "line", `freehand` "brush stroke", `sector` "sector", sector with `grid: true` "polar grid", `annulus` "ring", `cartGrid` "grid", `polygon` "polygon", `verticalLine` "vertical line" |
| U21 | `joinAcrossInfinity` | covered by U11; plus a hand-made pair of pieces of one source whose input midpoint maps to `abs(w) = 1e3` with ends `abs(w) = 20` joins; a pair whose midpoint maps to `abs(w) = 25` with ends 20 does not join; pieces of different sources are never joined |
| U22 | Presets against the data | for each of `x2, circle1, unit, sector` with its function: `detectProblem` equals the preset problem; `problemById(problem)` exists and its `answer.values` agree: `2.1.2` `sample: { z: 2 + i, w: 3 + 4i }`, `2.1.3` `sample: { z: 2 + 3i, w: -3 }`, `2.5.1` `sample: { z: 1 + i, w: 0.5 - 0.5i }`, `P4` `radius: sqrt 2`, `2.2.1` `sector: { from: 0, to: 3 pi/4 }` against the functions evaluated here |
| U23 | module hygiene | importing `lab.js` in Node touches no `window` or `document`; `mount` is a function; the exported names of 4.2 exist |
| U24 | A6 source check | after stripping `//` and `/* */` comments, the file text contains the import lines of 4.1 (each name); contains no `innerHTML`, `alert(`, `confirm(`, `prompt(`, `window.open`, `localStorage`, `sessionStorage`, `http://`, `https://`, `import('http`, `eval(`, `new Function`; no colour literal anywhere, including the one `<style data-for="lab">` template (no `rgb(`, no `hsl(`, no match of `#[0-9a-fA-F]{6}\b` or `#[0-9a-fA-F]{3}\b`) |

### 7.3 Interaction script and screenshots

The script is Appendix A (written for the builder to adapt; keep every assertion). Screenshots it saves (`--out` outside the repo or under `docs/review/iter-1/i1-station-lab/`): `lab--<viewport>--domain`, `--predict`, `--landscape`, `--sphere`, `--graph4d`, `--probe`. Review each at desktop and phone, light and dark:

1. **domain** (A5). z-plane: two full turns of hue round 0, black at the centre, brighter outward, faint rings visible at |w| = 1, 2, 4, 8; the unit circle stroke is white-ish/black with a halo, readable on every colour; the grid is faint; axis labels `x`, `y`; the ramp pill "start ... end" is legible; w-plane: the plain wheel with the image circle of radius 1 (z^2 of the unit circle is the unit circle traversed twice, the arrow and dots show it); wheel legend visible with its sentence; INPUT and OUTPUT badges visible; nothing overlaps.
2. **predict.** The output panel is the guess pad with the help sentence, the Reveal button, no trace of the image anywhere (no domain colours on the z-plane, no w in the readout).
3. **landscape.** A bowl (z^2) coloured by hue with the lifted stroke in `--text` on it, a floor marker and a surface marker; legend text; grey tops only at the corners; on a phone the 3D view is 4:3 and the legend wraps below.
4. **sphere.** The circle |z - 1| = 1 (orange) through the south pole's side and the line Re w = 1/2 (orange) as a closed curve over the north pole with no gap; green input, purple output only for family-null strokes; the chips z / w / both.
5. **graph4d.** The Re surface with viridis colour, the two sliders, the legend gradient with its border; turning `uv` to 90 degrees turns the Re surface into the Im surface.
6. **probe.** Cartesian drop lines (blue), the polar ray and solid Arg arc (orange) with ghost windings, the seam, on both planes; the explainer with `z`, `w`, `u`, `v`, `f on (r, theta)` rows and the badge "easy in Polar"; the footer "same point: agree"; two staircases.

### 7.4 A6 code-inspection checklist (`js/stations/lab.js`)

1. The import block contains `createPlane`, `segment/circle/rect/polygon/verticalLine/horizontalLine/sector/annulus/cartGrid/freehand`, `pushForward` (or `pushForwardAll`), `morph`, `lift`, `createDomainColoring`, `drawColorWheel`, `createView3D`, `modulusLandscape`, `riemannSphere`, `graph4D`, `compile`, `createExplainer`, `createStaircase`, `FUNCTIONS`, `fnById`, `problemById`, `statementParts`.
2. One clock: a single `state.t` drives `plane` layers, markers and the readout; `#lab-t`, `#lab-play` and the morph view all call `setT`; the clock is not reset by a view change (only by a preset load).
3. No `innerHTML` at all (text goes in with `textContent`, `prose()`, `tex()` or DOM nodes), no `alert`, `confirm`, `prompt`, `window.print`, `window.open`, download, iframe, no `localStorage` (the store only), no external URL, no `scrollTo` or `scrollIntoView` on mount, no `focus()` on mount.
4. Every listener added by the Lab is removed in `unmount` (count `addEventListener` against the recorded removals), `document` listener added last; the four planes, two DC instances, explainer, two staircases and the 3D view are destroyed there; `delete window.__mv.lab` guarded by identity.
5. Colours: only tokens (`cssColor('--...')`, `data-tone`, class names); the one style template uses `var(--...)` only.
6. `window.__mv` is never replaced; `mv.lab` has `shapes`, `images`, `view` (and the extras of 4.4).
7. `pushForward`/`morph` are called with `clampRadius` from `clampRadiusFor` (or 1e4 for the bounds probe, 1e9 for the sphere), never the default.
8. The brush smooths before `freehand` and `classify` runs on commit only.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases.**

| Case | Behaviour |
|---|---|
| Zero shapes, any control | everything works; Play runs a clock over nothing; `images()` is `[]`; `#lab-wempty` shown |
| Function undefined on the whole drawing | `#lab-wempty` second sentence of 2.4; the planes show only the z side; 3D views show the surface and no lifted line |
| Probe at 0 under `1/z` | `w` not finite: readout `z = 0 -> w = undefined`; the w-plane overlays are skipped; explainer w cells `\text{undefined}`; `stairsW.update(null)`; the sphere marker goes to the north pole |
| Drawing a brush stroke past the plane edge | pointer capture keeps reporting; coordinates beyond +-1000 are clamped by `cleanSpec`; the stroke is kept |
| Click without drag with a press-drag tool | nothing is drawn, no notice |
| Brush stroke shorter than 6 px or 2 samples | dropped with the "too short" notice |
| 41st shape | refused with the notice; undo or clear first |
| Huge radius or `1e3` coordinates from a request | clamped; shapes outside the view simply sit off-screen; `Reset` on the plane returns |
| Function with huge values (`exp(z)` on x = 4) | the fit pass uses clamp 1e4, then the clamp is `max(40, 3 * half-extent) + abs(center)` (about 210), so the whole curve appears; auto-fit shows `abs(w) = 54.6` |
| Seam function and pole-free images | the principal sqrt cuts the circle into 2 pieces and the w cursor vanishes in the gap; the sphere does not join them (teleport rule) |
| Window resize or phone rotation | the planes' `ResizeObserver` fires `viewchange` `'resize'`; the domain canvas is resized and re-rendered; the 3D view resizes itself |
| Theme toggle | planes and the 3D view repaint themselves; the wheel is redrawn; the explainer re-renders; nothing is rebuilt |
| `localStorage` throws | store falls back to memory; nothing else changes |
| `#lab-foo` | `#lab-start-notice`, blank Lab |
| `lab.request` with an unknown fn or view | those fields are ignored, the rest applies |
| Two quick navigations | the router unmounts the first Lab; every timer and frame is cancelled; a late `flush` checks `unmounted` and returns |
| Preset, Undo, Clear, a request or Escape while a polygon is half drawn | the draft is discarded (`dropDraft()`: `draft = null`, Close disabled, one draft frame clears the dashed preview and its image on both planes) |
| Function or view changed while a shape is half drawn | the dashed image is recomputed for the new f (or dropped in a 3D view) by a draft frame |
| Probe on with nothing drawn | the empty pills `#lab-zempty` and `#lab-wempty` are hidden so they do not cover the probe's labels |
| Predict on, then the student changes view | tabs work; the output stays hidden; the 3D view is not created |
| Tool changed mid-gesture | `draft = null` (the pointer is released by the plane anyway) |
| WebGL missing | the 3D wrappers show three-view's message plus the extra sentence; the rest is unaffected; `window.__mv.views3d` stays empty |

**Performance plan.** Targets from CONSTRAINTS: 60 fps while dragging in 2D, at least 30 fps in domain colouring and 3D at default size. Budget per animation frame: draft or brush frame under 4 ms (one `pushForward` of at most 3000 points, 0.4 to 0.8 ms measured for 600 points);
commit flush under 10 ms (6 ms measured for the heaviest case: two grids and a stroke under `1/z`, with the double pass); play frame: only layer redraws (the plane coalesces draws), no recompute; domain colouring renders at drag quality (at most 1.2e5 pixels) on every view change and refines in 8 ms bands 120 ms after the last call;
3D builds happen on tab entry or a shape or function change, not on `t`; the 4D sliders update positions in place. Memory: the Lab holds at most 40 shapes of at most a few hundred points each, 50 history snapshots of references, and one 3D view. Plane layers are rebuilt only on shape, function, view or clamp changes. No busy loops: every loop is `requestAnimationFrame`.

**Accessibility.** Every control has a label (visible text or `aria-label`); `aria-pressed` on tools, grid chips, function chips, `#lab-predict`, `#lab-snap` is a real checkbox; the view tabs follow the tablist pattern with roving `tabindex`; the stage is a `tabpanel`; statuses (`#lab-notice`, `#lab-fn-error`, `#lab-dc-status`, `#lab-sr-status`) are live regions; planes are focusable groups with their own keyboard help in the `aria-label`; the probe handle announces both addresses (plane behaviour);
focus rings are the shell's `:focus-visible` outline; touch targets are at least 44 px (`.chip` buttons are `--tap`). The explainer and the staircases carry their own accessible text; the colour is never the only cue (3). Drawing itself is pointer-only (D14): the keyboard path to every test picture is the six preset buttons, the function chips and field, the clock and the probe handle; "shape by numbers" is recorded in section 9.
Contrast: stroke colours are the site tokens (3:1 against `--surface` for the ramp ends); the domain view strokes have a halo; the legend text is `--text` on `--surface`.

**Reduced motion.** `ctx.theme.prefersReducedMotion()` true: `#lab-play` is "Step" (adds 0.1, wraps), `#lab-morph-play` toggles s between 0 and 1, no loop starts, the 3D views do not damp or auto-rotate (three-view), smooth scrolling is not used (the one `scrollIntoView` after a preset click passes `behavior: 'auto'`). Domain colouring still refines (it is not motion). `matchMedia` changes relabel the buttons live.

**Phone layout (390 px).** One column; the two planes stack at 358 px square (the shell's `.two-planes` stacks below 760 px); the tool chips wrap (3 rows at 11 tools); the tab list wraps in 2 rows; `#lab-presets` chips wrap one per row or two; sliders use the shell `.slider-row` (the range drops to its own line below 480 px); the function chips wrap in their groups; the text field and the Use button wrap; the readout wraps (`overflow-wrap: anywhere`); the explainer stacks Cartesian above polar below 560 px; the probe panel's staircases stack under the explainer; the 3D view is 4:3 (358 x 268) with its legend below;
`.tex-scroll` holds the problem answer (no page scroll). A tip line says a finger draws. The sticky header is 56 px: `planePixel` scrolls planes to the middle of the viewport, away from it. Overflow is asserted after every tab in Appendix A.

---

## 9. Out of scope

- Re/Im surface tabs beyond the 4D view (goal text); saving, exporting or downloading drawings (goal text, CONSTRAINTS forbids downloads).
- Shape by numbers (a typed-shape form) and keyboard drawing: the first things to add in iteration 2 for keyboard users.
- Selecting, moving, resizing or deleting one committed shape (only undo and clear); filling a region (the interior lines carry it); text labels on the planes.
- The half-turn animation of 1/z on the sphere (lives in `reciprocal`), the Riemann surface of `z^(1/n)` (lives in `branches`/`graph4d`), the microscope (lives in `derivative`).
- `az + b` with draggable `a`, `b` (the text field covers it).
- Persisting the function, the view, the clock or the guess (only the strokes persist).
- Audio narration and videos (the media track); a Listen control.
- Pinch-zoom of the 3D views beyond what `OrbitControls` gives.

---

## 10. Requests to other owners, rules for stations, risks

**Requests (do not edit these files from the Lab goal):**

1. `docs/ARCHITECTURE.md` section 4 (owner: orchestrator): record the `lab.strokes` format (4.3 and 4.4: an array of Specs, `LabRequest.shapes` plus `freehand`, `cartGrid`, and the optional `fillRays`, `fillArcs`, `grid` on `sector`); the Lab opens blank (D1); the wheel mode (D6); section 9: the extra ids of 4.6 and the `window.__mv.lab` extras.
2. `i1-station-branches-graph4d` (owner of `js/stations/graph4d.js`). Its design (read after this one was drafted, `5.B.10 extractStrokes`) already reads `lab.strokes` tolerantly: an array whose items are curves with `points`, or `{ kind }` specs of `circle`, `segment`, `rect`, `polygon`, `verticalLine`, `horizontalLine`, `sector`, `annulus`. That covers every Lab shape except `cartGrid`, which it ignores (its `kind` is unknown and it has no `points`); a `freehand` spec is picked up through its `points`.
   Optional for iteration 2: lift `cartGrid` too, with `cartGrid({ xRange, yRange, step, n: 96 })`. No change is needed for the format of 4.3 to work.
3. `i1-station-powermap-reciprocal`, `i1-station-curves-linear`, `i1-station-mappings-cr` (the "Open in the Lab" buttons). Their designs already send what `detectProblem` recognises (powermap: `verticalLine x: 2` with `sq`, the sector `r0: 0, r1: 2.5, theta0: 0, theta1: pi/4` with `cube`; reciprocal: the circle centre 1 radius 1 with `recip`; linear: `verticalLine x: 2` with `linear-i`, the unit circle with `linear-1i`; mappings: a `rect` and a unit `circle` with `view: 'morph'` and the 2.1.1 hint, which shows the problem panel without a check). Keep it that way: x = 2 as `{ kind: 'verticalLine', x: 2 }`, the circle as `{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }`, the unit circle `center 0, r 1`, the sector `{ kind: 'sector', r0: 0, r1: <any>, theta0: 0, theta1: pi/4 }`, with `fn` as the FUNCTIONS id (`sq`, `cube`, `recip`, `linear-i`, `linear-1i`) and `problem`. Anything else still loads; the problem panel then appears from the `problem` hint without the check.
4. `js/core/shapes.js` (owner `i1-core-mapping`, iteration 2): export `specToCurves(spec)` so `graph4d` and the Lab share one builder table; cap `n`, `rings`, `rays` and normalise `sector` angles without a loop (residue 82; the Lab's `cleanSpec` already shields it).
5. `docs/CONSTRAINTS.md`: nothing.

**Rules this design relies on from ARCHITECTURE 10:** 10.1.1 to 10.1.7, 10.2.1 to 10.2.5, 10.3.1 to 10.3.9, 10.4.1 to 10.4.7, 10.5.1 to 10.5.6, 10.6.1 to 10.6.8, 10.7.1 to 10.7.3, 10.8.1 and 10.8.2.

**Risks.**

1. **Size.** The Lab is one file of roughly 2000 lines. Build order that keeps it testable: pure helpers and their unit tests first (4.2), then the DOM skeleton and planes with the side view, then the tools, then the clock, then domain colouring, then predict, then probe and problem panels, then the three 3D views. Run A1 after each step.
2. **3D visuals are unverified by the designer** (framing, legend sizes, marker sizes, the 4D slider ranges): the screenshots of 7.3 are the review; tune `padding`, marker radii and `gridSize` by looking.
3. **`images()` and refinement.** The A2/A3 equalities hold because `pushForward` refines by linear midpoints of straight input segments. For circles and sectors refinement midpoints are chord midpoints, not points of the arc: A3 checks only exact-on-arc properties on the presets (verified: no refinement fires for the circle under `1/z` or `(1+i)z`). If a later change to `mapping.js` made `pushForward` refine those, the `2.5.1` and `P4` equalities would need the circle sampled finer (`n` 512) or the tolerance relaxed to the chord sagitta; the unit tests U11 would catch it first.
4. **Pointer coordinates.** The 1e-6 tolerance of A2 depends on snapping (D3). If the builder moves the snap default off, A2 fails by 4e-7 to 4e-6 depending on the viewport.
5. **`lab.strokes` format** is a cross-goal interface (request 2). If `graph4d` guessed another format it ignores the Lab's drawing; harmless but a loose end to close in the integrator pass.
6. **Wheel mode D6** departs from ARCHITECTURE 3.5's suggestion; revert to `'always'` only if the integrator finds the focus-only zoom confusing.
7. **Draw mode and phones.** A finger cannot scroll over the planes while a draw tool is on (the Move tool or touching the margin scrolls); the tip line and the Move tool are the mitigation. Review on a real phone (`docs/review/local-notes.md`).
8. **Predict-first leaks.** Several places could leak the image (domain colouring, readout, explainer, 3D, check text); 5.16 lists them; the script asserts the wrapper and the readout.

---

## Appendix A: `tests/interact/i1-station-lab.mjs` (unverified skeleton: the Lab did not exist when this was written; adapt selectors to the build, never weaken an assertion)

```js
// node tools/smoke.mjs --route lab --script tests/interact/i1-station-lab.mjs --dark
import { clickChip, planePixel, readText, setSlider, settle } from './_helpers.mjs';

const VIEWS = ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d'];
const pause = (page, ms) => page.waitForTimeout(ms);
const lab = (page, name) => page.evaluate((n) => window.__mv.lab[n](), name);
const nowhere = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function go(page, hash, ms = 900) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await pause(page, ms);
}

async function dragOn(page, planeId, a, b, steps = 8) {
  const p = await planePixel(page, planeId, a);
  const q = await planePixel(page, planeId, b);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps });
  await page.mouse.up();
  await settle(page, 3);
}

const pointsOf = (page) => page.evaluate(() => window.__mv.lab.images().flatMap((pc) => pc.points.map((p) => ({ re: p.re, im: p.im, t: p.t }))));

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;

  // ---------------- A2 ----------------
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await go(page, 'home', 400);
  await go(page, 'lab', 900);
  assert((await lab(page, 'shapes')).length === 0, 'A2: the Lab opens blank');

  await clickChip(page, 'lab-tool-rect');
  await dragOn(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  const rect = await page.evaluate(() => {
    const s = window.__mv.lab.shapes();
    const p = s[0].points;
    return {
      n: s.length,
      worst: Math.max(...p.map((q) => Math.abs(Math.max(Math.abs(q.re - 1), Math.abs(q.im - 1)) - 0.5))),
      t0: p[0].t, t1: p[p.length - 1].t, mono: p.every((q, i) => i === 0 || q.t >= p[i - 1].t),
    };
  });
  assert(rect.n === 1, `A2: one shape after the drag, got ${rect.n}`);
  assert(rect.worst < 1e-6, `A2: rectangle corners are exact, worst ${rect.worst}`);
  assert(rect.t0 === 0 && rect.t1 === 1 && rect.mono, 'A2: t spans 0..1');

  await clickChip(page, 'lab-fn-sq');
  const img = await page.evaluate(async () => {
    const { pointAt } = await import('./js/core/shapes.js');
    const L = window.__mv.lab; const sh = L.shapes()[0]; const pieces = L.images();
    let n = 0, worst = 0;
    for (const pc of pieces) for (const p of pc.points) {
      const z = pointAt(sh, p.t);
      worst = Math.max(worst, Math.hypot(z.re * z.re - z.im * z.im - p.re, 2 * z.re * z.im - p.im));
      n++;
    }
    return { pieces: pieces.length, n, worst };
  });
  assert(img.pieces >= 1 && img.n > 0 && img.worst < 1e-6, `A2: images are z^2 of the shape on the same clock: ${JSON.stringify(img)}`);

  for (const v of VIEWS) {
    await clickChip(page, `lab-view-${v}`);
    await pause(page, 400);
    assert((await lab(page, 'view')) === v, `A2: view() is ${v}`);
    const n3 = await page.evaluate(() => (window.__mv.views3d ? window.__mv.views3d.size : 0));
    assert(n3 <= 1, `A2: at most one 3D view alive in ${v}, got ${n3}`);
    assert((await nowhere(page)) <= 1, `A2: no horizontal overflow in ${v}`);
    if (v === 'domain') {
      const st = await page.evaluate(() => document.getElementById('lab-zplane-dc')?.dataset.dcState);
      assert(st === 'ready', `A2: the z-plane domain canvas is ready, got ${st}`);
    }
    if (['domain', 'landscape', 'sphere', 'graph4d'].includes(v)) await shot(`tab-${v}`);
  }
  await clickChip(page, 'lab-view-side');
  await setSlider(page, 'lab-t', 0.5);
  assert((await readText(page, '#lab-readout')).includes('t = 0.5'), 'A2: readout shows t = 0.5');

  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 0, 'A2: undo gives 0 shapes');
  await dragOn(page, 'lab-zplane', { re: 0.5, im: 0.5 }, { re: 1.5, im: 1.5 });
  assert((await lab(page, 'shapes')).length === 1, 'A2: draw again gives 1 shape');
  await clickChip(page, 'lab-clear');
  assert((await lab(page, 'shapes')).length === 0, 'A2: clear gives 0 shapes');
  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 1, 'A2: undo after clear brings the shape back');
  await clickChip(page, 'lab-clear');

  // ---------------- A3 ----------------
  const arg = (pts, lo, hi) => page.evaluate(async ({ pts, lo, hi }) => {
    const { Arg } = await import('./js/core/complex.js');
    return Math.max(...pts.map((p) => Math.max(lo - Arg(p), Arg(p) - hi, 0)));
  }, { pts, lo, hi });

  await go(page, 'lab-2-5-1');
  let ro = await readText(page, '#lab-readout');
  assert(ro.includes('1/z') && ro.includes('shapes: 1'), `A3: 2.5.1 readout: ${ro}`);
  let pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => Math.abs(p.re - 0.5) < 1e-6), 'A3: 2.5.1 image is Re w = 1/2');

  await go(page, 'lab-2-1-2');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z^2'), `A3: 2.1.2 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => Math.abs(p.re - (4 - (p.im * p.im) / 16)) < 1e-6), 'A3: 2.1.2 image is u = 4 - v^2/16');

  await go(page, 'lab-2-2-1');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z^3'), `A3: 2.2.1 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && (await arg(pts, -1e-6, (3 * Math.PI) / 4 + 1e-6)) <= 1e-6, 'A3: 2.2.1 image has Arg in [0, 3 pi/4]');

  await go(page, 'lab-P4');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('(1+i)z'), `A3: P4 readout: ${ro}`);
  pts = await pointsOf(page);
  assert(pts.length > 0 && pts.every((p) => Math.abs(Math.hypot(p.re, p.im) - Math.SQRT2) < 1e-6), 'A3: P4 image has |w| = sqrt 2');

  await page.fill('#lab-fn-src', 'z^2 + iz');
  await page.click('#lab-fn-apply');
  await settle(page, 3);
  assert((await readText(page, '#lab-readout')).includes('z^2 + iz'), 'A3: typed function is in the readout');
  assert((await readText(page, '#lab-fn-error')) === '', 'A3: no error for z^2 + iz');
  await page.fill('#lab-fn-src', 'z +');
  await page.click('#lab-fn-apply');
  await settle(page, 3);
  const expected = await page.evaluate(async () => { const { compile } = await import('./js/core/parse.js'); try { compile('z +'); return ''; } catch (e) { return e.message; } });
  assert((await readText(page, '#lab-fn-error')) === expected && expected !== '', 'A3: parser message shown verbatim');
  assert(await page.evaluate(() => !!document.querySelector('#lab-fn-echo mark')), 'A3: the bad part is marked');
  assert((await readText(page, '#lab-readout')).includes('z^2 + iz'), 'A3: a bad formula leaves f unchanged');
  const chip = await page.evaluate(() => { const el = document.getElementById('lab-preset-circle1'); return { p: el.dataset.problem, href: el.querySelector('a') && el.querySelector('a').getAttribute('href') }; });
  assert(chip.p === '2.5.1' && chip.href === '#problem-2-5-1', `A3: preset chip links: ${JSON.stringify(chip)}`);

  // ---------------- A4 ----------------
  await go(page, 'lab', 900);
  await clickChip(page, 'lab-predict');
  await clickChip(page, 'lab-preset-unit');
  const hid = await page.evaluate(() => { const w = document.getElementById('lab-wplane-wrap'); return w.offsetParent === null || w.getAttribute('aria-hidden') === 'true'; });
  assert(hid, 'A4: the w-plane wrapper is hidden while predicting');
  assert(await page.isVisible('#lab-reveal'), 'A4: Reveal is visible');
  await clickChip(page, 'lab-tool-probe');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z = 1 + i') && !ro.includes('-> w'), `A4: the probe does not leak w while predicting: ${ro}`);
  await dragOn(page, 'lab-gplane', { re: -1, im: -1 }, { re: 1, im: 1 });
  assert((await page.evaluate(() => window.__mv.lab.state().guess.length)) === 1, 'A4: one guess stroke');
  await shot('predict');
  await clickChip(page, 'lab-reveal');
  assert(await page.isVisible('#lab-wplane-wrap'), 'A4: the w-plane is visible after Reveal');
  assert(!(await page.isVisible('#lab-reveal')), 'A4: Reveal is gone after Reveal');
  assert((await readText(page, '#lab-readout')).includes('-> w'), 'A4: the readout shows w after Reveal');

  await page.evaluate(() => {
    localStorage.setItem('mv:lab.request', JSON.stringify({ fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'sphere', problem: '2.5.1', predictFirst: false }));
    location.hash = '#home';
  });
  await pause(page, 500);
  await page.evaluate(() => { location.hash = '#lab'; });
  await pause(page, 1200);
  assert((await lab(page, 'view')) === 'sphere', 'A4: request view');
  assert((await lab(page, 'shapes')).length === 1, 'A4: request shape');
  assert((await readText(page, '#lab-readout')).includes('1/z'), 'A4: request function');
  assert((await page.evaluate(() => localStorage.getItem('mv:lab.request'))) === null, 'A4: the request is consumed');
  assert((await page.evaluate(() => document.getElementById('lab-problem')?.dataset.problem)) === '2.5.1', 'A4: the problem panel is for 2.5.1');
  await shot('sphere-request');

  // ---------------- A5 ----------------
  await go(page, 'lab-P4');
  await clickChip(page, 'lab-fn-sq');
  await clickChip(page, 'lab-view-domain');
  await page.waitForFunction(() => { const c = document.getElementById('lab-zplane-dc'); return c && c.dataset.dcState === 'ready' && !c.dataset.dcPending; }, null, { timeout: 8000 });
  const hues = await page.evaluate(() => {
    const plane = window.__mv.planes.get('lab-zplane');
    const cx = document.getElementById('lab-zplane-dc').getContext('2d');
    const out = [];
    for (let k = 0; k < 8; k++) {
      const z = { re: 1.5 * Math.cos((k * Math.PI) / 4), im: 1.5 * Math.sin((k * Math.PI) / 4) };
      const q = plane.toPixel(z);
      const [r, g, b] = cx.getImageData(Math.round(q.x), Math.round(q.y), 1, 1).data;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let h = d === 0 ? NaN : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6; if (h < 0) h += 1;
      out.push(h);
    }
    return out;
  });
  const want = [0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75];
  hues.forEach((h, k) => {
    const d = Math.abs(h - want[k]);
    assert(Math.min(d, 1 - d) < 0.03, `A5: hue at ${k * 45} degrees is ${h.toFixed(3)}, want ${want[k]}`);
  });
  assert(await page.isVisible('#lab-wheel'), 'A5: the wheel legend is visible');
  await shot('domain');

  // ---------------- probe, clock, reduced motion ----------------
  await clickChip(page, 'lab-view-side');
  await clickChip(page, 'lab-tool-probe');
  assert(await page.isVisible('#lab-zplane-probe'), 'the probe dot appears');
  ro = await readText(page, '#lab-readout');
  assert(ro.includes('z = 1 + i -> w = 2i'), `probe line: ${ro}`);
  const same = await page.evaluate(() => document.getElementById('lab-ex-same')?.dataset.agree);
  assert(same === 'true', 'explainer footer agrees');
  await shot('probe');
  await clickChip(page, 'lab-play');
  await pause(page, 600);
  assert((await lab(page, 't')) !== 0.4, 'play moves the clock');
  await clickChip(page, 'lab-play');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pause(page, 200);
  assert((await readText(page, '#lab-play')) === 'Step', 'reduced motion: Play becomes Step');
  const nextStep = (t) => { const k = Math.floor(t * 10 + 1e-9) + 1; return k > 10 ? 0 : k / 10; };
  const t0 = await lab(page, 't');
  await clickChip(page, 'lab-play');
  const t1 = await lab(page, 't');
  assert(Math.abs(t1 - nextStep(t0)) < 1e-9, `reduced motion: one press is one step (${t0} to ${t1})`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert((await nowhere(page)) <= 1, 'no horizontal overflow at the end');
  log('lab checks passed');
}
```

---

## Appendix B: build notes (iteration 1, written by the builder; corrected in the fix round)

Everything in sections 0 to 8 was built as written, except for the places below, where the build differs from this document or a detail the design left open was decided. None changes an id, a readout format, a store key or an acceptance criterion. (This appendix is builder-authored and sits outside the goal's `owns` list; the designer may move it to the build report or drop it.)

1. **U6 expected value.** Section 7.2 U6 lists `{ src: 'abs(z)' }` as throwing "Bars are not supported". `abs(z)` is valid grammar and compiles; the message belongs to the typed text `|z|` (section 6 of the expected values and the goal summary say so). The unit test asserts the throw for `|z|` and that `abs(z)` compiles.
2. **Scheduler.** `flush()` is driven by keys, not by dirty flags: every sync step (`syncZ`, `syncW`, `syncM`, `sync3D`) compares a signature of its inputs (curve ids and styles, the cache key of `getImages` or `getMorph`, the 3D key) and does nothing when it is unchanged. `rebuildShapeData()` runs synchronously inside `afterEdit()`, so `shapes()` and `images()` are current the moment a gesture ends. Curve layers are updated in place (`layer.update(points)`) while the layer signature is unchanged, which keeps a morph-slider drag from rebuilding layers.
3. **Two fit flags.** `needFit` is split into `needFitW` and `needFitM`, so fitting the morph plane does not clear the w-plane's pending fit (and the other way round).
4. **Predict first and the probe.** While the answer is hidden the explainer and the `arg w` staircase are hidden, and the probe panel shows one line with z in both addresses and the `arg z` staircase. (Section 5.16 asked for an explainer with em dashes; a table of dashes read as broken.)
5. **Landscape legend.** The sentence "Height is the size of f(z) ..." is shown once, beside the colour wheel; `#lab-view3d-legend` carries text only for the sphere and the 4D graph.
6. **Typographic preset labels.** `LAB_PRESETS[].label` stays ASCII (tests); the buttons show the typographic labels (minus sign, pi, "<=" as the less-or-equal sign).
7. **3D `fitTo` paddings (the first build's deviation was unsound and is withdrawn).** The first build used 0.8 and 0.85 "because at 1.0 the pictures filled half of their frame". `fitTo` puts the camera at `R * padding / sin(fov / 2)`, so below 1 the picture is cut off by its frame (the Riemann sphere lost the north pole, which is infinity, exactly where the line of 2.5.1 closes). The paddings are now 1.05 (landscape, 4D) and 1.25 (sphere; its infinity label sits at 1.14 radii). Unit test U26 and the interaction script (projected vertices, `|NDC| <= 1`) keep it so.
8. **Empty hints** (`#lab-zempty`, `#lab-wempty`) are a pill (`--surface` background) over the plane, so the axes do not run through the sentence; both are hidden while the probe is on.
9. **`images()`** returns the cached pieces and is recomputed on demand after any edit (`afterEdit` clears the caches), also while the answer is hidden.
10. **Sphere strokes** are drawn by `three-view`'s own ramp from `--t0`, so a polar-family stroke reads dark orange-brown; the family colour is carried by the graticule and by the plane views. The same ramp makes family strokes on the planes dark early in each stroke (the `plane.js` ramp mixes strongly toward `--t0`): the blue/orange address cue is weak in the first quarter. Not changed here; a request for the plane owner is in the build report.
11. **Fix round.** Added: `dropDraft()` (a preset, request, Undo, Clear or Escape abandons a half-drawn shape and clears its dashed preview and image); the problem panel's why-line and the header chips' tooltips wait for Reveal; `CHECKED_PROBLEMS` and the "no numeric check" sentence for 1.5.1 and 1.5.2; short 3D captions; Reveal in a 3D view focuses `#lab-view3d-wrap`; the preset button is `min-width: 7rem`; the sphere legend names the stroke colours as they are drawn; the unused imports (`escapeHtml`, `stationById`, `FUNCTIONS`) are gone; one extra hook `window.__mv.lab.draft()` (`{ active, tool, corners, curves, out, closeEnabled }`) lets the script see the dashed preview.
12. **P4's statement already names the radius.** The handout's P4 is "Show that the image of the circle of radius 1 ... is the circle of radius sqrt 2 ...", so Predict first cannot hide the radius there; it hides the why-line, the ways, the answer and the image.

Requests for other owners are in the build report (the `lab.strokes` format of section 10 is unchanged).
