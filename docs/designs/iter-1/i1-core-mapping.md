# Design: i1-core-mapping

Files owned: `js/core/shapes.js`, `js/core/mapping.js`, `js/core/domaincolor.js`.
Deliverables also named by the goal and this design: `tests/unit/i1-core-mapping.test.mjs`,
`tests/interact/i1-core-mapping.mjs`.
Status: iteration 1, design v1 (Designer, stage 2). Wave 0 (engine, no cross-imports).

> **Residue cleanup (iteration 1).** shapes.js gained `SHAPE_LIMITS` (every builder is capped: 20000 segments, 200 rings or rays, 200000 points, and an angle beyond 1e6 radians is taken modulo 2π, so `sector` no longer loops on a huge angle) and `specToCurves(spec)` (the one table from a Lab shape spec to its curves); mapping.js gained the option `maxImageStep` for `pushForward`, `pushForwardAll` and `morph`. domaincolor.js is unchanged. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

**How to read this file.** Sections 4 and 5 are the contract and the algorithms. Sections 6 and 7
are the numbers the tests assert. Every number in sections 6 and 7 was checked twice: by hand, and by
running a throwaway prototype of the pseudocode in section 5 (not committed) against every acceptance
case in the goal. Where the goal text and this design differ, the differences are listed in 1.4 with
the reason; this file is what the builder implements and what Review A checks against.

**Existing code surveyed.** `js/core/` and `js/data/` do not exist yet. Only `js/registry.js` and
`tools/smoke.mjs` exist, and neither is read by this goal. There is therefore no actual export list
to reconcile with ARCHITECTURE 3.9, 3.10, 3.11; those signatures are followed exactly and every
addition is marked **ADD** (optional, backward compatible, safe for other goals to ignore).

---

## 1. Goal, story thread, review coverage

### 1.1 Goal restatement

Build three engines that the Lab and six stations share:

1. `shapes.js` turns every shape the student can draw or pick (segment, circle, rectangle, polygon,
   lines, rays, grids, sector, annulus, brush stroke) into a **timed curve**: a list of points
   `{re, im, t}` with `t` running 0 to 1. It also reverses, resamples and classifies curves
   (closed, simple, smooth, piecewise smooth, orientation, corners).
2. `mapping.js` carries a curve through a function. `pushForward(curve, f)` returns the image
   pieces, **each image point keeping the t of the input point it came from**, subdividing where the
   map bends a curve and **cutting the curve where the image runs off to infinity** so a pole never
   draws a line across the plane. `morph(curve, s, f)` is the same stroke at `(1 - s)z + s f(z)`.
3. `domaincolor.js` paints a function onto pixels: **hue = angle of w, lightness = size of w**,
   faint rings at |w| = 2^k, reduced resolution while dragging and a refine when idle, plus the colour
   wheel legend.

Nothing here draws a station UI, builds a plane, or touches three.js.

### 1.2 Story thread this carries, and how it shows on screen

Thread 3 (a function is a motion). A brush stroke is z(t). `pushForward` carries each point with
its time to f(z(t)), so the stroke on the z-plane and its image on the w-plane are one clock:
"when" matches "where", dot for dot. `morph` slides the whole stroke from input to output.
When the image goes through infinity, the stroke is cut and the time cursor disappears: the student
sees "it went through infinity" instead of a false line.

Thread 1 (two addresses). Each shape knows which address it is native to and says so in `family`:
`'cart'` for the lines x = c, y = c and axis-aligned rectangles, `'polar'` for circles, rays,
sectors, annuli, `null` for neutral shapes. Pushed-forward pieces keep `family`, so the Cartesian grid
and the polar grid keep their colours (`--cart`, `--polar`) on the w-plane. Under z² the polar
grid stays a polar-looking grid and the Cartesian grid bends: that is "pick the address that
respects the map", visible without a word.

Thread 2 (the staircase). `hueOf` is periodic: θ, θ + 2π, θ - 2π all give the same colour. So
**the colour of a point is arg w as a whole set**, and the plain function w = z has no seam at all.
A seam appears only when you colour a function that picks a step, for example the principal square
root: there Arg w jumps by π across the negative real axis and you see a sharp colour edge. The
legend copy says this in plain words and the verification proof sheet puts `z` and principal
`sqrt(z)` side by side.

On screen (through the host stations; this goal has no screen of its own):

| Host | What the student sees from this goal |
|---|---|
| `curves` | the segment 2 + i to -3 - 3i with its ramp; `pointAt` moves the cursor; `reverse` flips the ramp; `classify` fills the chips (smooth, piecewise, closed, simple, positive) |
| `linear` | x = 2 and the unit circle pushed through iz - 2i and (1 + i)z, ramp preserved |
| `powermap` | x = 2 becomes the parabola; the sector 0 < arg z < π/4 fans open under z³; cart and polar grids carried and morphed |
| `reciprocal` | the circle \|z - 1\| = 1 becomes the line Re w = 1/2, cut at the pole; the cursor leaves through infinity |
| `lab` | any drawn stroke, grids, sectors, annuli; side-by-side, morph and **domain colouring** views; the wheel legend |

### 1.3 Review problems and topics covered

| Id | Statement (short) | Engine fact pinned by tests | Station that shows it |
|---|---|---|---|
| 1.5.1 | parameterize the line 2 + i to -3 - 3i | `segment`: z(t) = (2 - 5t) + i(1 - 4t); `pointAt(c, .5) = -0.5 - i` | curves |
| 2.1.2 | image of x = 2 under w = z² | `pushForward(verticalLine(2), z²)`: u = 4 - v²/16 and \|w\| + u = 8 (focus 0, directrix u = 8) | powermap, lab |
| 2.1.3 | image of x = 2 under iz - 2i | image lies on v = 0, w = -y; the map is a quarter turn about 1 - i | linear, lab |
| 2.2.1 | image of 0 < arg z < π/4 under z³ | sector pushed through z³ stays inside 0 <= arg w <= 3π/4, \|w\| <= 8 | powermap, lab |
| 2.5.1 | image of \|z - 1\| = 1 under 1/z | Re w = 1/2 on every kept point; 2 pieces, 254 of 257 points; `pointOnPieces(.25) = 0.5 - 0.5i` | reciprocal, lab |
| P4 | (1 + i)z sends the unit circle to the circle of radius √2 | every image point \|w\| = √2, Arg w = θ + π/4 (wrapped) | linear, lab |
| T1.5 | sets of points: curves, orientation, simple/closed/smooth | `classify` of circle, rectangle, bow-tie, L-shape, figure-eight; `reverse` flips orientation | curves, sets |
| T2.1 | functions and mappings, images of sets | `pushForward`, `pushForwardAll`, `morph` on shapes and grids | mappings, linear, powermap, lab |
| T2.2 | power functions, images of regions | sector under z³; unit circle under z³ (refinement) | powermap |
| T2.5 | 1/z = inversion then mirror | unit circle under 1/z: \|w\| = 1, Arg w = -θ, orientation becomes -1 | reciprocal |

### 1.4 Differences from, and additions to, the goal text and ARCHITECTURE

| # | Item | Goal / ARCHITECTURE says | This design does | Why |
|---|---|---|---|---|
| X1 | `angleTol` | subdivide while the image turns by more than `angleTol` | subdivide at a vertex when `\|turn in w\| - \|turn in z\| > angleTol` | corners of the input (rectangles) turn 90° and must not be subdivided forever; keeps the identity map reproducing its input exactly; conformal maps preserve corner angles so only real distortion triggers a split |
| X2 | `maxJump` | break if `\|Δw\| > maxJump · median step` | a step is a candidate when its **stretch** `\|Δw\|/\|Δz\|` exceeds `maxJump ·` its median. It is cut by one of two rules. **(a) Pole leap:** the path reverses direction (turn > π/2) at every end of the step that has a neighbour. **(b) Teleport (fix round 1):** the stretch exceeds `maxJump²` times the stretch of every neighbouring step (a run end has one neighbour; a neighbour whose input does not move is no information) | (a) the line Re w = 1/2 near the pole has huge but perfectly straight steps and must not be cut; a pole leap is a long step with reversals on both ends. (b) A branch jump (principal sqrt, cube root, z^(2/3) across the negative axis) is a teleport, not a reversal: the path carries on in the same direction, so (a) never sees it and the cursor would slide along a false chord. Near a pole the stretch changes smoothly (ratio between neighbours is at most `maxJump` for a legitimate step, exactly 3 for M4's `segment(-1, 1, {n: 3})`), so the factor must be `maxJump²`, not `maxJump` |
| X3 | clamp edge | break where \|w\| > `clampRadius` or not finite | same, **and segments touching a dropped sample are never subdivided** | the goal's test requires "fewer points than the input" for circle(1,1) under 1/z |
| X4 | closed curves | `closed` flag, `classify` tests \|z(1) - z(0)\| | a closed curve stores its first point again as its last point (exact copy, `t = 1`) | makes `classify` and the plane close the loop without special cases |
| X5 | **ADD** `Curve.family` | not in the Curve typedef | `'cart' \| 'polar' \| null` | teaches the native address; colours grids |
| X6 | **ADD** `Curve.reversed`, `Curve.source` | – | `reverse` sets `reversed`; push-forward pieces carry `source = input id` | host bookkeeping |
| X7 | **ADD** shapes | – | `curveLength(curve)`; option `n` for `sector` and `annulus` | arc density |
| X8 | **ADD** mapping | – | `pointOnPieces(pieces, t)`; `PUSH_DEFAULTS`; option `maxPoints` | cursor that can vanish at infinity; runaway guard |
| X9 | **ADD** domaincolor | – | `colorXY`, `rangesFromView`, `DOMAIN_LEGEND`; `colorOf(w, out, rings)`; `render(mode)`; `info()`; option `maxPixels` | hot loop without allocation; square units; shared copy; testability; pixel budget |
| X10 | short curves | – | a curve with fewer than 16 segments is subdivided evenly to 16 segments before pushing forward | a 2-point stroke has no interior vertex and could never be refined |
| X11 | `classify.orientation` | sign of the signed area (closed curves only) | the sign of the signed area for a **simple** closed curve; 0 for every curve that crosses itself, and for open curves | positive orientation (interior on the left) is defined only for simple closed curves; a limacon with an inner loop would otherwise report a meaningless +1 |
| X12 | `morph(c, 0, f)` id | "equals c" | the one-piece copy keeps all metadata and, when the input has an id, gets `id = <id>~0` (and `source = <id>`), the same id as every piece at s > 0 | a host that keys DOM, style or cache by piece id sees one id along the whole slider |

Request to the orchestrator: update ARCHITECTURE 3.9 to 3.11 with X1 to X12 (it is the shared
contract; this design file is the only place they are written down for now). The exact text for 3.10
(rule X2 b) and 3.9 (X11) is under "Requests for other owners" at the end of section 9.

---

## 2. UX

### 2.1 What this goal ships

No controls and no route. Three pure or near-pure modules. Its "UX" is therefore (a) what the
modules draw and say, which host stations must reproduce faithfully, (b) the host contract for the
legend and the domain-colouring layer, (c) the proof sheet that the interaction script builds
temporarily in the page so reviewers can see the engines work.

### 2.2 Wireframes

**(A) Host surface: the Lab, Domain colouring view, desktop (1280).** Owned by the Lab goal; shown so
the builder knows how the three modules are meant to be stacked.

```
+----------------------------------------------------------------------------------------+
| The Mapping Lab        f(z) = z^2 + i z      [Side] [Morph] [Domain*] [3D] [Sphere] [4D]  |
+------------------------------------------+---------------------------------------------+
| z-plane   z = x + iy                     | w-plane   w = u + iv                         |
| +--------------------------------------+ | +-----------------------------------------+ |
| | <canvas #lab-dc>  f painted on the   | | | <canvas #lab-dc-w> plain colour wheel   | |
| |  z-plane (createDomainColoring)      | | |  (a second DC with f = identity)        | |
| | <canvas plane, transparent bg> on top| | | image strokes on top (--output)         | |
| |  axes, strokes: halo + --input       | | |                                         | |
| +--------------------------------------+ | +-----------------------------------------+ |
+------------------------------------------+---------------------------------------------+
| [wheel 96]  Colour key                                                                 |
|             Colour is the angle of w. Brightness is the size of w.   [More details v]   |
+----------------------------------------------------------------------------------------+
```

**(B) Same surface, phone (390).** Planes stack, legend goes below, wheel 80 px.

```
+--------------------------------+
| Mapping Lab  [Domain v]        |
+--------------------------------+
| z-plane                        |
| +----------------------------+ |
| | DC canvas + plane overlay  | |
| |        358 x 358           | |
| +----------------------------+ |
| w-plane                        |
| +----------------------------+ |
| | colour wheel DC + images   | |
| +----------------------------+ |
| [wheel 80] Colour is the angle |
|  of w. Brightness is the size  |
|  of w.   [More details v]      |
+--------------------------------+
```

**(C) Proof sheet built by `tests/interact/i1-core-mapping.mjs` (desktop; flex-wrap, so on the
390 px phone the five figures simply stack; the fifth, `#cm-seam` 200 x 200, wraps below: a
rectangle around 0 and its image under the principal sqrt in two pieces with the cut ends ringed).**

```
#cm-fixture  (appended to <body>, removed at the end of the script)
+-----------------+-----------------+-------------+--------------------------+
| #cm-dc-id 200x200| #cm-dc-sqrt     | #cm-wheel   | #cm-curves  260 x 340    |
| f(z) = z         | 200x200         | 96 x 96     | x = 2 (input) and its    |
| no seam          | f = principal   | wheel key   | image under z^2, same    |
|                  | sqrt(z): seam   |             | ramp; dots at t = 0, 1/4 |
|                  | on the negative |             | 1/2, 3/4, 1; focus at 0  |
|                  | real axis       |             |                          |
| figcaption       | figcaption      | figcaption  | figcaption               |
+-----------------+-----------------+-------------+--------------------------+
```

### 2.3 Controls

The modules own none. Host contract (ids are recommendations owned by the host goals; the engines
never create them):

| Id (host) | Element | Label / accessible name | Behaviour |
|---|---|---|---|
| `<station>-dc` | `<canvas>` carrying the domain colouring | `aria-label` = default text in 2.6 unless the host sets its own | decorative layer under the plane canvas; host sets `pointer-events: none`; never focusable |
| `<station>-wheel` | `<canvas>` from `drawColorWheel` | `role="img"`, `aria-label` = `DOMAIN_LEGEND.aria` (set by the function when absent) | static; host redraws it on `themechange` (the outline reads `--border`) |
| `<station>-legend` | container for wheel + caption | caption = `DOMAIN_LEGEND.short` | always visible |
| `<station>-legend-details` | `<details>` | summary "More about the colours" | lists `DOMAIN_LEGEND.details`; native keyboard support |

Proof-sheet ids (test scaffolding, owned by this goal's script): `cm-fixture`, `cm-dc-id`,
`cm-dc-sqrt`, `cm-wheel`, `cm-curves`, `cm-seam`.

### 2.4 Pointer, touch, keyboard

None inside the modules. Recommended host pattern while the student drags a handle or a slider
(this is what keeps domain colouring at 30 fps):

```
on every change, coalesced to one call per animation frame:
    dc.setFunction(f) / dc.setView({xRange, yRange}) as needed
    dc.render('drag')          // quick, reduced resolution; auto-refines 120 ms after the last call
on first paint and after a resize:
    dc.render('drag')          // never a synchronous full-resolution first paint
```

Touch needs nothing extra: the host's plane already uses pointer events; the colouring just follows.
The DC canvas and the wheel never take focus.

### 2.5 Empty, loading and error states

| Situation | Module behaviour | What the host shows |
|---|---|---|
| `freehand([])`, `polygon([])` | returns a curve with `points: []`; `classify` returns the degenerate answer | "Draw something on the z-plane." |
| 1-point curve into `pushForward` | returns `[]` | nothing |
| f throws, returns NaN or Infinity at a sample | that sample is dropped, curve is cut there; never throws | the curve simply has a gap |
| f missing (DC) | canvas filled mid-grey, `canvas.dataset.dcState = "no-function"`, `info().state = "no-function"` | `DOMAIN_LEGEND.noFunction` |
| canvas has 0 width or height (hidden tab) | `render()` returns `false`, state `"hidden"`; resumes at the next `render()` after the host resizes | nothing |
| no 2D context | `render()` returns `false`, state `"no-context"` | host may show "This browser cannot draw the colouring." |
| refine in progress | `canvas.dataset.dcPending = "1"` and `info().pending === true` until the sharp frame lands (about 0.1 to 0.8 s). The flag and `pending` always agree: when the 120 ms timer fires and there is nothing to sharpen (the function was removed, or the canvas has 0 size, e.g. a hidden Lab tab) both clear at once | optional text `DOMAIN_LEGEND.refining`, hidden when pending clears |
| after `destroy()` | `render()` returns `false`, state `"destroyed"`, no timers left | – |
| `createDomainColoring(null, ...)`, `drawColorWheel(null)` | throws `TypeError` (programmer error: the only two throws in the three modules) | – |
| `null` or `undefined` curve, options, view or `out` anywhere else | never throws: a missing curve is an empty curve (`reverse`, `resample`: empty curve; `morph`, `pushForward`: `[]`), missing options mean the defaults, `rangesFromView(undefined, w, h)` is x from -4 to 4. A `points` value that is not an array reads as no points. A points array that holds non-points (`[null]`) is out of contract and may throw | – |

### 2.6 Copy text (exact strings; export them as `DOMAIN_LEGEND`)

Plain, direct, for a student the night before a test. No emoji.

```
title:        "Colour key"
short:        "Colour is the angle of w. Brightness is the size of w."
plane:        "Each point z is painted with the colour of f(z)."
aria:         "Colour key for domain colouring. The colour is the angle of w: red along the positive real axis, then yellow-green at i, cyan at -1 and violet at -i, going counter-clockwise. The brightness is the size of w: black at 0, medium at 1, white far away."
details: [
  "Colour = the angle of w (arg w). Red is the positive real axis. Going counter-clockwise you pass yellow-green (i), cyan (-1) and violet (-i).",
  "Every step of the staircase, θ + 2πk, has the same colour. So the colour shows arg w as a whole set, and the plain function w = z has no seam.",
  "Brightness = the size of w (|w|). Black is w = 0, medium is |w| = 1, white is very large. Faint rings mark |w| = 1/4, 1/2, 1, 2, 4, 8 ...",
  "Black spots are zeros of f. White spots are poles.",
  "A sharp jump in colour (not just in brightness) is a seam: the angle of w jumps there. The principal square root has one along the negative real axis."
]
noFunction:   "Pick a function to colour the plane."
refining:     "Sharpening the picture..."
canvasLabel:  "Domain colouring of f. Colour shows the angle of w = f(z), brightness shows its size."
```

Curve `label` strings (plain text, ASCII minus, three decimals, used by hosts for readouts and
`aria-label`s; formatting rule in 5.1):

```
segment          "segment from 2 + i to -3 - 3i"
circle           "circle, center 0, radius 1"            arc: "arc of circle, center 0, radius 1"
rect             "rectangle from -1 - i to 1 + i"
polygon          "polygon, 4 vertices"                    open: "polyline, 3 vertices"
verticalLine     "x = 2"        horizontalLine "y = -1"
ray              "ray at angle 0.785 rad"
freehand         "freehand stroke"
grid members     "x = -2" ... "y = 2"; "circle r = 0.5" ... ; "ray at angle 0.524 rad"
sector parts     "sector boundary", "sector ray", "sector arc"
annulus parts    "inner circle", "outer circle", "ring", "ray"
```

---

## 3. Visual encoding (both themes)

Everything below is data that hosts turn into colour; the engines themselves draw colours only in
`domaincolor.js`.

### 3.1 Cartesian versus polar

| `curve.family` | Meaning | Host draws with | Examples |
|---|---|---|---|
| `'cart'` | native to Cartesian (slides) | `--cart` (grid-like use) | verticalLine, horizontalLine, rect, cartGrid |
| `'polar'` | native to polar (turn and stretch) | `--polar` | circle, ray, polarGrid, sector, annulus |
| `null` | neutral | `--input` on the z-plane, `--output` on the w-plane | segment, polygon, freehand |

A drawn shape the student owns (a stroke in the Lab) is `--input` on the z-plane and `--output` on
the w-plane regardless of family. `family` colours **grids and presets** (cartGrid, polarGrid,
sector/annulus fills), where the point of the picture is which grid survives the map. Pieces from
`pushForward` and `morph` keep `family`, `kind` and `label`.

### 3.2 arg drawn as a set, Arg highlighted

Domain colouring is the one picture where the set arg w is the colour itself:

* `hueOf(w) = (Arg w / 2π) mod 1`. Every θ + 2πk gives the same hue, so the whole staircase of w
  has one colour. Verified in test D1 (periodicity) and D4 (no seam for the identity).
* A seam (a hue jump) shows exactly where a function **chooses** a step: principal `sqrt(z)` has
  the jump of 0.5 in hue (0.25 to 0.75) across the negative real axis. Test D4 pins it.
* The wheel legend shows the hue circle once, with the four anchor angles in the copy: red 0,
  yellow-green π/2, cyan π, violet -π/2.

### 3.3 Input versus output and time

* The engines guarantee `t`. Every output point carries the `t` of the input point it came from
  (subdivision midpoints carry the mean of their parents). Pieces come back in increasing t.
  Hosts feed pieces to `plane.addCurve({ points: piece.points, ramp: true, color: '--output' })`,
  so the plane's `--t0` to `--t1` lightness ramp, the quarter dots and the arrowhead land on the
  same t on both planes.
* Morph: the host blends the stroke colour with `mixColor('--input', '--output', s)`; the engine
  only supplies positions.
* Cursor at t: `pointAt(inputCurve, t)` on the z-plane and `pointOnPieces(pieces, t)` on the
  w-plane. The second returns `null` when t falls in a cut (the image is at infinity): the host
  hides the cursor.

### 3.4 Domain colouring encoding (identical in both themes; it is data)

| Quantity | Rule |
|---|---|
| hue | `h = atan2(im, re) / 2π`, `+1` if negative, `0` if the result is 1; red at +1, 0.125 orange-yellow (1 + i), 0.25 yellow-green (i), 0.5 cyan (-1), 0.625 blue (-1 - i), 0.75 violet (-i) |
| lightness | `lightnessOf(w) = 1 - 1/(1 + sqrt\|w\|)`: 0 at 0, 1/3 at 1/4, 1/2 at 1, 2/3 at 4, 3/4 at 9, tends to 1 |
| rings | multiply lightness by `0.88 + 0.12 · frac(log2 \|w\|)`: a one-sided step at every \|w\| = 2^k, brightest just below the step; `rings = false` removes it |
| saturation | 0.8 (fixed) |
| non-finite | mid grey `[128, 128, 128]` |
| w = 0 | black `[0, 0, 0]` |

Per theme: the colouring does not change. The page chrome around it does: the DC canvas gets
`border: 1px solid var(--border)` from the host (the far field is near white and would melt into a
light page; the zeros are near black and would melt into a dark page). The wheel's outline ring is
drawn with `--border`, read at draw time with `getComputedStyle(document.documentElement)`
(fallback `#888888` when the token is empty) and redrawn by the host on `themechange`. Strokes over
a colouring (host rule): a 3 px halo in `--surface` at 0.85 alpha under a 2 px line in `--text`,
which stays legible on every hue in both themes.

---

## 4. Module API

All three modules are ES modules with **no imports**. `shapes.js` and `mapping.js` never reference
`document`, `window`, `localStorage`, `requestAnimationFrame`, `getComputedStyle`. `domaincolor.js`
touches the DOM and timers only inside `createDomainColoring` and `drawColorWheel`; its top level is
pure so it imports cleanly in Node. A complex number is `{re, im}` everywhere. Where a function takes a
complex argument, a bare number is also accepted and means `{re: x, im: 0}` (internal `toC`); results
are always objects. Functions never mutate their arguments.

### 4.1 `js/core/shapes.js`

```js
// Curve (every builder returns this; pushForward pieces are Curves too)
// { id?: string, kind: string, points: {re, im, t}[], closed: boolean,
//   family: 'cart' | 'polar' | null,          // ADD
//   label?: string, reversed?: true,           // ADD reversed
//   source?: string }                          // set on push-forward pieces: the input curve's id
// Invariants: t is non-decreasing along points; t = 0 at the first point and 1 at the last
// (for builder output); a closed curve's last point is an exact copy of its first (t = 1).
// Every `n` below is a number of SEGMENTS, so a curve has n + 1 points.

export function segment(a, b, { n = 64 } = {})
export function circle(center, r, { n = 128, from = 0, to = 2 * Math.PI, orientation = +1 } = {})
export function rect(a, b, { nPerSide = 32 } = {})
export function polygon(vertices, { closed = true, nPerSide = 32 } = {})
export function verticalLine(x, { yRange = [-4, 4], n = 128 } = {})
export function horizontalLine(y, { xRange = [-4, 4], n = 128 } = {})
export function ray(angle, { rMin = 0, rMax = 4, n = 96 } = {})
export function cartGrid({ xRange = [-2, 2], yRange = [-2, 2], step = 0.5, n = 96 } = {}) // -> Curve[]
export function polarGrid({ rMax = 2, rings = 4, rays = 12, n = 96 } = {})                // -> Curve[]
export function sector({ r0 = 0, r1 = 2, theta0, theta1, fill = true, fillRays = 4, fillArcs = 3, n = 48 } = {}) // -> Curve[]  (n is ADD)
export function annulus({ center = {re: 0, im: 0}, r0, r1, fill = true, fillRings = 2, fillRays = 8, n = 96 } = {}) // -> Curve[] (n is ADD)
export function freehand(samples, { minDist = 0.01 } = {})
export function reverse(curve)
export function resample(curve, n)
export function pointAt(curve, t)                       // -> {re, im}
export function classify(curve)                         // -> { closed, simple, smooth, piecewiseSmooth, orientation, corners }
export function curveLength(curve)                      // ADD -> number, sum of segment lengths
```

Kind, family, closed, point counts (with defaults):

| builder | `kind` | `family` | `closed` | points |
|---|---|---|---|---|
| segment | `'segment'` | null | false | n + 1 = 65 |
| circle | `'circle'` | `'polar'` | true iff abs(abs(to - from) - 2π) < 1e-9 | n + 1 = 129 |
| rect | `'rect'` | `'cart'` | true | 4·nPerSide + 1 = 129 |
| polygon | `'polygon'` | null | = `closed` (false when < 2 vertices) | closed: V·nPerSide + 1; open: (V - 1)·nPerSide + 1 |
| verticalLine | `'verticalLine'` | `'cart'` | false | n + 1 = 129 |
| horizontalLine | `'horizontalLine'` | `'cart'` | false | 129 |
| ray | `'ray'` | `'polar'` | false | n + 1 = 97 |
| cartGrid | `'cart-x'` (first), `'cart-y'` | `'cart'` | false | n + 1 = 97 each; default 9 + 9 = 18 curves; ids `gx<i>`, `gy<j>` |
| polarGrid | `'polar-ring'` (first), `'polar-ray'` | `'polar'` | rings true | rings radius rMax·j/rings, j = 1..rings; rays at 2πk/rays, k = 0..rays-1; default 4 + 12 = 16 curves; ids `gr<j>`, `gk<k>` |
| sector | `'sector-boundary'` (first), `'sector-ray'`, `'sector-arc'` | `'polar'` | boundary true | boundary r0 = 0: 3n + 1 = 145; r0 > 0: 4n + 1 = 193; fills n + 1 = 49; default 1 + 4 + 3 = 8 curves; ids `boundary`, `ray<k>`, `arc<k>` |
| annulus | `'annulus-inner'`, `'annulus-outer'` (first two), `'annulus-ring'`, `'annulus-ray'` | `'polar'` | circles true | circles n + 1 = 97; rays 33; default 2 + 2 + 8 = 12 curves; ids `inner`, `outer`, `ring<k>`, `ray<k>` |
| freehand | `'freehand'` | null | false | after the minDist filter |

Options normalisation: an options argument that is `null`, `undefined` or not an object means "no options".
`n` and `nPerSide` go through `intOpt(v, default, min)` (`Math.floor`, minimum
1; circle minimum 8); non-finite values fall back to the default. `r < 0` is treated as `|r|`.
`yRange`/`xRange` are sorted ascending so t always runs up/right. Unknown options are ignored.

`classify(curve)` result definitions (thresholds are constants in 5.1): `closed` is
`|z(last) - z(first)| < 1e-9`; `simple` is "no two non-adjacent segments touch" (touching counts, so
a crossing that falls exactly on a vertex is still found); `smooth` is "no turning angle above 20°";
`piecewiseSmooth` is `smooth` or "at most 12 corners"; `corners` counts turning angles above 20° (for a
closed curve the join at the start point counts); `orientation` is the sign of the signed area for a
**simple** closed curve (+1 counter-clockwise, -1 clockwise, 0 when the area is below 1e-12, when the curve is open, and
when it is not simple: only a simple closed curve has an inside, so a self-crossing curve reports 0 whatever its signed area; hosts need no extra check).
Degenerate curves (fewer than 2 distinct points, or total length below 1e-12) classify as
`{ closed: false, simple: true, smooth: true, piecewiseSmooth: true, orientation: 0, corners: 0 }`.

Lifecycle: stateless. Nothing to mount or clean up.

### 4.2 `js/core/mapping.js`

```js
export const PUSH_DEFAULTS = Object.freeze({ maxJump: 3, clampRadius: 40, maxDepth: 4, angleTol: 0.08, maxPoints: 20000 }); // ADD
export function pushForward(curve, f, opts = {})         // -> Curve[]
export function pushForwardAll(curves, f, opts = {})     // -> Curve[]
export function morph(curve, s, f, opts = {})            // -> Curve[]
export function morphPoint(z, w, s)                      // -> {re, im}
export function bounds(curves)                           // -> { xRange: [min, max], yRange: [min, max] } | null
export function lift(curve, f)                           // -> { re, im, t, w: {re, im} }[]
export function pointOnPieces(pieces, t)                 // ADD -> {re, im} | null
```

* `f` is `(z: {re, im}) => {re, im}` (what `parse.compile(src).f` returns). A bare number result is
  read as a real value. Anything throwing, non-finite or malformed is read as "no value".
  `f` receives a fresh copy of the point; it may keep it.
* `opts` (all optional, validated to the defaults when invalid): `maxJump` (> 1), `clampRadius`
  (> 0, `Infinity` allowed), `maxDepth` (integer 0 to 8), `angleTol` (> 0), `maxPoints` (>= 16, ADD:
  refinement stops, not the curve, when the sample count would exceed it).
* **Hosts must size `clampRadius` to the w-plane they show**: use about 3 times the larger
  half-extent of the w-plane's current view, never below 40. Under the default 40, `exp(z)` on x = 4
  (|w| = 54.6) would come back empty.
* Output pieces: `{ id?, source?, kind, family, label, points: {re, im, t}[], closed }` with
  `id = input.id + '~' + pieceIndex` and `source = input.id` (both undefined if the input has no id).
  `closed` is true only when the input is closed **and** there is exactly one piece containing every
  sample. Pieces have at least 2 points, are ordered by t, and never share a sample.
* `morph(curve, s, f)`: `s` is clamped to [0, 1], NaN means 0. `s === 0` returns a one-piece copy of
  the input curve without evaluating `f` (so poles and `|z| > clampRadius` cost nothing; when the input has an
  id the copy has `id = id + '~0'` and `source = id`, the same id as every piece at s > 0, X12; a missing curve gives `[]`); `s === 1`
  returns `pushForward(curve, f, opts)`; otherwise the same pipeline runs on
  `g(z) = (1 - s) z + s f(z)` (clamp and breaks apply to `g`).
* `morphPoint(z, w, s)`: `s === 0` returns a copy of z, `s === 1` a copy of w, else the blend (a missing point is `{NaN, NaN}`).
* **Seams and cuts.** The image is cut (a new piece starts) wherever the path leaves the plane (clamp, not finite), at a pole
  leap (rule X2 a) and at a teleport such as the jump of a principal root across the negative real axis (rule X2 b). So a loop
  around 0 under the principal square root comes back as 2 pieces with `closed: false`, and `pointOnPieces` returns `null`
  for the t values that fall in the gap, exactly as at a pole: the w-plane cursor jumps (or hides) instead of sliding along a chord.
* **Accuracy near a pole.** Refined points are chord midpoints of the input polyline (5.2 step 4), not points of the true curve.
  For an analytic curve sampled coarsely near a pole the image wobbles: `circle(1, 1, {n})` under `1/z` with an odd small `n`
  puts image points off the line Re w = 1/2 by 0.13 to 0.17 (n = 17, 31, 33, 63), a visible kink at the line ends; at the default
  n = 128 or 256 the error is 0, and `circle(1.05, 1)` is off by about 1% of the image radius. Hosts draw circles near a pole with n >= 128 (the builders' default).
* `bounds(curves)`: accepts an array of curves, or a single curve; ignores non-finite points; returns
  raw extents (the host pads); `null` when no finite point exists.
* `lift(curve, f)`: input points with `w = f(z)`; `w` is `{re: NaN, im: NaN}` where f has no value;
  no clamping, no cutting (the 3D views do their own).
* `pointOnPieces(pieces, t)`: linear interpolation inside the piece whose `[first t, last t]` contains
  t; `null` when none does.

Lifecycle: stateless; no caches, no globals. Calls are synchronous and allocation-bounded by
`maxPoints`.

### 4.3 `js/core/domaincolor.js`

```js
export function hueOf(w)                    // -> number in [0, 1)
export function lightnessOf(w)              // -> number in [0, 1] (NaN for NaN input)
export function colorOf(w, out = [0, 0, 0], rings = true)   // -> out = [r, g, b], integers 0..255  (rings is ADD)
export function colorXY(x, y, out = [0, 0, 0], rings = true) // ADD: same as colorOf, no object needed (hot loop)
export function createDomainColoring(canvas, {
  f, xRange, yRange,
  quality = { idle: 1, drag: 0.3 }, rings = true,
  maxPixels = { idle: 1.5e6, drag: 1.2e5 }                   // ADD
}) -> DC
//  DC: { setFunction(f), setView({ xRange, yRange }), setQuality('idle' | 'drag'),
//        render(mode?) -> boolean,              // mode is ADD; return value is ADD
//        info() -> { mode, width, height, pending, destroyed, renders, state },   // ADD
//        destroy() }
export function drawColorWheel(canvas, { size = 96 } = {})
export function rangesFromView({ center, scale }, widthCss, heightCss)  // ADD -> { xRange, yRange }
export const DOMAIN_LEGEND  // ADD: the strings of 2.6
```

* `hueOf` and `lightnessOf` accept `{re, im}` or a number. Non-finite input gives hue 0 and
  lightness NaN (for NaN) or 1 (for +/-Infinity components).
* `colorOf` returns the **same `out` array** it was given (new array when omitted or when `out` is not an object), filled with
  integers. `rings` defaults to true. A huge modulus never gives NaN: above about 1.3e154 the squared modulus overflows,
  so `colorXY` uses `Math.hypot`, and an infinite modulus gets ring factor 1 (rings off: white; rings on: the usual
  2^k ring tint, as at 1e150).
* `createDomainColoring` (throws `TypeError` unless `canvas.getContext` is a function):
  * The visible `canvas` is the host's; its backing size (`canvas.width/height`, device pixels) is
    set by the host. The DC reads it on every render and never resizes it. Recommended host backing
    size: CSS size at device-pixel-ratio 1 (the colouring is smooth; this is 4 to 9 times cheaper on
    retina and phone screens).
  * `xRange = [xmin, xmax]`, `yRange = [ymin, ymax]` (y up); reversed pairs are sorted; a missing range
    defaults to [-4, 4]. They must have the same aspect as the canvas for square units; get them with
    `rangesFromView(plane.getView(), cssW, cssH)`. A partial `quality` or `maxPixels` object is merged over
    the defaults.
  * `setFunction`, `setView` only store; they do not draw. `setQuality(mode)` sets the mode for later
    renders; `'idle'` also cancels a pending refine.
  * `render(mode?)` is synchronous and draws at the given (or current) mode, and, if that mode is
    `'drag'`, arms the 120 ms refine. Returns true when it drew.
  * The idle refine runs in row bands across animation frames (about 8 ms of work per frame) and
    swaps in the sharp frame once, at the end.
  * `info().width/height` are the offscreen size of the last completed draw; `mode` is the current
    mode; `pending` is true while a refine is armed or running; `state` is `'ready' | 'no-function' |
    'hidden' | 'no-context' | 'destroyed'`; `renders` counts completed draws.
  * `destroy()` is idempotent: clears the timer, cancels the frame request, drops the offscreen
    canvas and image data; the visible canvas keeps its last pixels.
* `rangesFromView(view, w, h)`: a missing or unusable `view` (or a `scale` that is not a positive number) means centre 0
  and 8 units across (x from -4 to 4); a missing size means 1 CSS pixel.
* `drawColorWheel(null)` throws `TypeError`, like `createDomainColoring(null)`.
* `drawColorWheel` sizes the canvas itself: backing `round(size · min(devicePixelRatio, 2))`,
  CSS `size` px, draws the wheel and the outline, sets `role="img"` and `aria-label`
  (`DOMAIN_LEGEND.aria`) if the canvas has neither `aria-label` nor `aria-hidden`.
* The module sets `canvas.dataset.dcState` and, while refining, `canvas.dataset.dcPending = "1"`.
  If the canvas has neither `aria-label` nor `aria-hidden`, it gets `role="img"` and
  `aria-label = DOMAIN_LEGEND.canvasLabel` once.

Events: none are dispatched. Theme: the colouring is theme independent; hosts call `drawColorWheel`
again on `themechange`. Lifecycle for a station: `createDomainColoring` in `mount`, `dc.destroy()` in
`unmount`; no window or document listeners are ever added.

---

## 5. Algorithms

Constants: `TAU = 2π`; closed tolerance `1e-9`; touch/orientation epsilon `1e-12`; corner angle
`20° = 0.349066 rad`; `piecewiseSmooth` corner limit 12; `classify` simple-test segment cap 1000.

### 5.1 shapes.js

Helpers (private):

```
toC(v)          number -> {re: v, im: 0}; object -> {re: +v.re, im: +v.im}; else {NaN, NaN}
lerp(a, b, u)   a === b ? a : a*(1 - u) + b*u        // exact at u = 0 and u = 1, exact for constants
intOpt(v, d, min)   Number.isFinite(v) ? Math.max(min, Math.floor(v)) : d
num(x)          String(Math.round(x*1000)/1000), with "-0" -> "0"
cx(z)           re = num(z.re), imAbs = num(|z.im|), neg = z.im < 0
                if imAbs == "0"            -> re
                imS = imAbs == "1" ? "i" : imAbs + "i"
                if re == "0"               -> (neg ? "-" : "") + imS
                else                        -> re + (neg ? " - " : " + ") + imS
withT(pts)      cum[k] = cumulative Euclidean length; total = cum[last]
                t[k] = total > 0 ? cum[k]/total : (pts.length > 1 ? k/(pts.length-1) : 0)
polyline(V, n)  pts = [copy of V[0]]; for each edge a -> b: for j = 1..n: u = j/n; push lerp point
                return withT(pts)         // corners are exact vertices; closing vertex is exact
```

Builders:

1. **segment(a, b, {n})**: for k = 0..n, u = k/n: `{re: lerp(A.re,B.re,u), im: lerp(A.im,B.im,u), t: u}`.
2. **circle(center, r, {n, from, to, orientation})**: `span = to - from`; `full = abs(abs(span) - TAU) < 1e-9`;
   `o = orientation < 0 ? -1 : +1`; for k = 0..n: `u = k/n`, `th = from + o*span*u`,
   point `(C.re + R cos th, C.im + R sin th, t = u)`. If `full`, replace point n by an exact copy of
   point 0 with `t = 1`. `closed = full`.
3. **rect(a, b, {nPerSide})**: `x0,x1` = min/max of the real parts, `y0,y1` of the imaginary parts;
   `V = [(x0,y0), (x1,y0), (x1,y1), (x0,y1), (x0,y0)]`; `polyline(V, nPerSide)`; closed. Counter-clockwise
   from the min corner. t is arclength, so a square has corners at t = 0, 1/4, 1/2, 3/4, 1.
4. **polygon(vertices, {closed, nPerSide})**: map `toC`; if `closed` and more than 1 vertex and the last
   equals the first (< 1e-12) drop the last; if closed append the first as the final vertex;
   `polyline`. `closed` result = `closed && vertices >= 2`. 0 vertices: empty curve. 1 vertex: one point, t = 0.
5. **verticalLine(x, {yRange, n})**: sort range; points `(x exactly, lerp(y0,y1,k/n), t = k/n)`.
   **horizontalLine** mirrors it. **ray(angle, {rMin, rMax, n})**: `r = lerp(rMin, rMax, u)`,
   point `(r cos angle, r sin angle, u)`.
6. **cartGrid**: sort ranges; `step <= 0` -> 0.5; `nx = clamp(round((x1-x0)/step), 1, 200)`, same for y;
   vertical lines first: for i = 0..nx, `x = lerp(x0, x1, i/nx)` (so the last line is exactly x1), each a
   `verticalLine` with kind `'cart-x'`, id `gx<i>`; then horizontal lines i = 0..ny, kind `'cart-y'`,
   id `gy<j>`.
7. **polarGrid**: rings first: for j = 1..rings, `circle(0, rMax*j/rings, {n})`, kind `'polar-ring'`, id
   `gr<j>`; then for k = 0..rays-1 `ray(TAU*k/rays, {rMin: 0, rMax, n})`, kind `'polar-ray'`, id `gk<k>`.
8. **sector({r0, r1, theta0, theta1, ...})** (`n` has minimum 1, as in 4.1): if `r0 > r1` swap; while `theta1 <= theta0` add TAU to
   `theta1`; clamp `theta1 - theta0` to at most TAU. Boundary (one closed curve, index 0, id `boundary`)
   as points in order: ray at theta0 from r0 to r1 (n + 1 points); arc at r1 from theta0 to theta1 (n
   more points, skipping the shared first); ray at theta1 from r1 down to r0 (n more); if `r0 > 0` also
   the arc at r0 from theta1 back to theta0 (n more). Then set the last point to an exact copy of the
   first. `t` by arclength (`withT`). When `fill`: `fillRays` curves at angles
   `lerp(theta0, theta1, k/(fillRays+1))`, k = 1..fillRays, each a ray from r0 to r1 (n + 1 points),
   ids `ray<k>`; then `fillArcs` arcs at radii `lerp(r0, r1, k/(fillArcs+1))`, k = 1..fillArcs, from
   theta0 to theta1 (n + 1 points), ids `arc<k>`. Angles use `lerp` so the first point of every arc and
   ray at theta0 is exact (important: with theta0 = 0 no point ever gets a negative angle).
9. **annulus({center, r0, r1, ...})**: swap if `r0 > r1`. Curve 0 `inner` = `circle(C, r0, {n})`,
   curve 1 `outer` = `circle(C, r1, {n})`, then `fillRings` circles at `lerp(r0, r1, k/(fillRings+1))`
   (ids `ring<k>`), then `fillRays` radial segments at angles `TAU*k/fillRays`, k = 0..fillRays-1, from
   `C + r0 e^{iθ}` to `C + r1 e^{iθ}` with 32 segments (ids `ray<k>`). Both circles are counter-clockwise.
10. **freehand(samples, {minDist})**: map `toC`, skip non-finite; keep the first sample; keep a later
    sample when its distance to the last kept is `>= minDist`; finally, if the last input sample was not
    kept and differs from the last kept by more than 1e-12, append it (so the stroke ends where the
    pointer ended; the last step may be shorter than minDist). `withT`. Zero samples: empty curve; one
    sample: one point, t = 0.
11. **reverse(curve)**: copy of the curve (all metadata), `points` reversed, each `t = 1 - t`,
    `reversed = !curve.reversed`. A missing curve gives an empty curve (no `reversed` flag).
12. **pointAt(curve, t)**: empty curve -> `{NaN, NaN}`; non-finite t -> 0; one point -> that point;
    `t <= first.t` -> first point; `t >= last.t` -> last point; otherwise binary-search the largest i
    with `P[i].t <= t`, `u = (t - P[i].t)/(P[i+1].t - P[i].t)` (if the t gap is not positive return
    `P[i]`), return `lerp` of both coordinates.
13. **resample(curve, n)**: `n = intOpt(n, 64, 1)`; for k = 0..n, `u = k/n`, point `pointAt(curve, u)` with
    `t = u`; if `curve.closed`, point n is an exact copy of point 0. Keeps metadata. Corners that fall
    between samples are cut. A curve with no points (or a missing curve) resamples to an empty curve, not to NaN points.
14. **curveLength**: sum of `hypot` over consecutive points.

Every builder also sets `kind`, `family`, `closed`, `label` (and `id` where the table in 4.1 lists one).
Labels: segment `segment from <cx a> to <cx b>`; circle `circle, center <cx c>, radius <num r>` (a partial
arc: `arc of circle, center ..., radius ...`); rect `rectangle from <cx min corner> to <cx max corner>`;
polygon `polygon, <V> vertices` (open: `polyline, <V> vertices`; V = 1 reads `1 vertex`); verticalLine `x = <num x>`;
horizontalLine `y = <num y>`; ray `ray at angle <num angle> rad`; freehand `freehand stroke`; cartGrid
members keep the line labels; polarGrid rings `circle r = <num r>`, polarGrid rays keep the ray label;
sector parts `sector boundary` / `sector ray` / `sector arc`; annulus parts `inner circle` /
`outer circle` / `ring` / `ray`.

`classify(curve)`:

```
raw = points with finite re and im
if raw.length < 2                              -> degenerate
closed = hypot(raw.last - raw.first) < 1e-9
V = raw with consecutive points closer than 1e-12 removed
if closed and V.length > 1: remove V's last point (it is the start again)
len = sum of segment lengths of V (open) ; if V.length < 2 or len < 1e-12 -> degenerate
N = V.length ; edges = closed ? N : N - 1        // closed edges wrap: V[i] -> V[(i+1) % N]

turn(i) = atan2(cross(d1, d2), dot(d1, d2)),  d1 = V[i] - V[i-1], d2 = V[i+1] - V[i]   (indices cyclic when closed)
vertices checked: closed -> 0..N-1 ; open -> 1..N-2
corners = count of |turn| > 20 deg ;  smooth = corners == 0 ;  piecewiseSmooth = smooth or corners <= 12

orientation (simple closed curves only; 0 when not closed or not simple):
                           A = 1/2 * sum(V[i].re*V[i+1].im - V[i+1].re*V[i].im) cyclic;
                           |A| < 1e-12 -> 0 ; else sign(A)

simple:  W = V, or, when edges > 1000, every ceil(N/1000)-th vertex (documented approximation: a loop smaller than
         the decimation step can be missed; hosts classify on pointerup, not on every pointermove)
         box[e] = bounding box of edge e grown by 1e-12 (four Float64Arrays)
         for i in 0..E-1, for j in i+2..E-1:
             if box[i] and box[j] do not overlap: continue    // four comparisons reject almost every pair
             skip the pair (0, E-1) when closed           // they share the start vertex
             if segmentsTouch(W[i]->W[i+1], W[j]->W[j+1]) then simple = false, stop
```

`segmentsTouch(p1,p2,p3,p4)` (inclusive; this is what finds the bow-tie, whose crossing falls on
sampled vertices of both chains):

```
e = 1e-12
if the bounding boxes of the two segments (each grown by e) do not overlap -> false
orient(a,b,c) = (b.re-a.re)*(c.im-a.im) - (b.im-a.im)*(c.re-a.re)
d1 = orient(p3,p4,p1); d2 = orient(p3,p4,p2); d3 = orient(p1,p2,p3); d4 = orient(p1,p2,p4)
if ((d1 > e and d2 < -e) or (d1 < -e and d2 > e)) and ((d3 > e and d4 < -e) or (d3 < -e and d4 > e)) -> true   // proper crossing
if |d1| <= e and p1 lies in the e-grown bounding box of p3p4 -> true      // touching / collinear overlap
same for d2 with p2, d3 with p3 (box of p1p2), d4 with p4
else false
```

### 5.2 mapping.js

Private helpers:

```
resolve(opts)   start from PUSH_DEFAULTS; take each known key from opts when Number(v) is not NaN;
                maxDepth = clamp(floor, 0, 8); angleTol <= 0 -> default; clampRadius <= 0 -> default;
                maxJump <= 1 -> default; maxPoints < 16 -> default
evalSafe(f, z)  if f is not a function -> NaN pair
                try  w = f({re: z.re, im: z.im}); if typeof w == 'number' w = {re: w, im: 0}
                     if w is not an object or re/im not finite -> NaN pair; else copy {re, im}
                catch -> NaN pair
turn(ax, ay, bx, by) = atan2(ax*by - ay*bx, ax*bx + ay*by)       // signed turning angle
sample(z, t, g)  w = g(z); ok = finite(w) and hypot(w.re, w.im) <= clampRadius
                 return { z, t, w, ok }
```

`run(curve, g, o)` is the shared pipeline (`pushForward` uses `g = z => evalSafe(f, z)`; `morph` uses the
blend):

1. **Guard.** If `curve.points` has fewer than 2 points return `[]`.
2. **Densify.** `m = points.length - 1`. If `m < 16`: `k = ceil(16 / m)`; replace each segment by k equal
   parts (positions and t by `lerp`), keeping the final point. (A 2-point stroke becomes 16 segments.)
3. **Samples.** `S[i] = sample({re, im} of point i, t, g)`; `depth[i] = 0` for each of the `S.length - 1`
   segments.
4. **Refine loop** (at most `maxDepth` rounds because every split raises that segment's depth):

```
repeat
    split = [false] * (S.length - 1); any = false
    for i in 1 .. S.length-2:
        if S[i-1].ok and S[i].ok and S[i+1].ok and bend(i) > angleTol:
            for s in (i-1, i):
                if depth[s] < maxDepth and S[s].ok and S[s+1].ok: split[s] = true; any = true
    if not any: stop
    if S.length + count(split) > maxPoints: stop            // runaway guard, result stays valid
    rebuild: for each segment, push S[i]; if split[i]: push sample(midpoint, mean t, g) and set both
             halves' depth to depth + 1; finally push the last sample
until stop

bend(i): z1 = S[i].z - S[i-1].z, z2 = S[i+1].z - S[i].z, w1 = S[i].w - S[i-1].w, w2 = S[i+1].w - S[i].w
         if any of |z1|, |z2|, |w1|, |w2| < 1e-12 -> 0
         return |turn(w1, w2)| - |turn(z1, z2)|
```

   The midpoint is the chord midpoint (average of the two endpoint positions), a point of the polyline,
   not of an underlying smooth curve; the resulting error is at most the polyline's own sagitta times
   |f'| and is accepted. A midpoint may itself be not-ok (cut); then neither half is split again.
   Segments next to a not-ok sample are never split (X3).
5. **Runs.** Walk S in order; a not-ok sample ends the current run. Runs contain only ok samples.
6. **Median stretch.** For every consecutive pair in every run with `|Δz| >= 1e-15`:
   `stretch = |Δw| / |Δz|`; collect those greater than 0; sort ascending; `med = values.length >= 3 ?
   values[floor(length/2)] : 0`.
7. **Leaps** (poles crossed between two ok samples that the refinement could not resolve, and branch jumps). For each run,
   for each step k (between run[k] and run[k+1]; `stretch(k) = |Δw|/|Δz|`, or 0 when `|Δz| < 1e-15`):
   if `med > 0` and `stretch(k) > maxJump * med`, the step is a candidate:

   **Rule (b), teleport (tested first).** `before = stretch(k-1)` if k >= 1, `after = stretch(k+1)` if k + 2 < run.length;
   a neighbour whose `|Δz| < 1e-15` is skipped (no information). If at least one neighbour remains and
   `stretch(k) > maxJump² * before` and `stretch(k) > maxJump² * after` for every neighbour that remains, break the run
   between k and k + 1 and go to the next step. (A run end has one neighbour; a 2-point run has none and is never cut by (b).)

   **Rule (a), pole leap.** Otherwise `ends = 0`, `reverses = true`; if k >= 1 and the previous step has length > 1e-15:
   `ends++`, and if `|turn(prev, step)| <= π/2` then `reverses = false`; if k + 2 < run.length and the
   next step has length > 1e-15: `ends++`, and if `|turn(step, next)| <= π/2` then `reverses = false`.
   If `ends > 0 and reverses`, break the run between k and k + 1 (start a new piece).

   Why two rules: a pole leap goes out and comes back (the path reverses at both ends), a branch jump lands somewhere else and
   carries on in the same direction (no reversal), so only (b) sees it. Why `maxJump²` and not `maxJump`: next to a pole the
   stretch of a legitimate step differs from its neighbour's by at most about `maxJump` (M4's `segment(-1, 1, {n: 3})` is
   exactly 3), while a jump of the image of size |Δw| over one input step `Δz` has a stretch of `|Δw|/|Δz|`, which is orders
   of magnitude above its neighbours'. Measured: 3200 random smooth strokes (segments, circles, rectangles, spirals) under
   z², z³, e^z, sin z, 1/z, 1/z², the Joukowski map and conj, with and without rule (b): identical piece counts every time.
8. **Pieces.** Drop pieces with fewer than 2 samples. Each becomes a Curve with points
   `{re: s.w.re, im: s.w.im, t: s.t}`, `kind`, `family` (`?? null`) and `label` copied from the input,
   `source = curve.id`, `id = curve.id + '~' + index` when the input has an id.
   `closed = curve.closed and exactly one piece and that piece contains all S samples`.
   Pieces are in t order because runs are in sample order.

`pushForward(curve, f, opts)`: if `f` is not a function return `[]`; else `run(curve, z => evalSafe(f, z),
resolve(opts))`. `pushForwardAll(curves, f, opts)`: concatenation of `pushForward(c, f, opts)`.

`morph(curve, s, f, opts)`:

```
s = Number(s); s = finite(s) ? clamp(s, 0, 1) : 0
if s == 0: return [ copy of curve: points copied {re, im, t}, all metadata, source = curve.id,
                    id = curve.id + '~0' when the curve has an id ]   // no evaluation, no clamp; null curve -> []
if s == 1: return pushForward(curve, f, opts)
return run(curve, z => morphPoint(z, evalSafe(f, z), s), resolve(opts))   // NaN blend is not ok, so it is cut
```

`bounds`, `lift`, `pointOnPieces`: as in 4.2 (single pass loops; `pointOnPieces` does a binary search
inside the piece whose t range contains t, using the same interpolation as `pointAt`; duplicate the
five lines of interpolation, because wave-0 modules do not import each other).

### 5.3 domaincolor.js

**Pure colour.**

```
hueOf(w):      x, y = parts (number -> y = 0); non-finite -> 0
               h = atan2(y, x) / TAU ; if h < 0: h += 1 ; if h >= 1: h = 0 ; return h     // guards -1e-17 -> 1
lightnessOf(w): m = hypot(x, y) ; NaN -> NaN ; return 1 - 1/(1 + sqrt(m))                    // Infinity -> 1
colorXY(x, y, out, rings):
    if x or y not finite: out = [128, 128, 128]; return
    m2 = x*x + y*y ; if m2 == 0: out = [0, 0, 0]; return
    m = finite(m2) ? sqrt(m2) : hypot(x, y)         // x*x + y*y overflows above about 1.3e154
    l = 1 - 1/(1 + sqrt(m))
    if rings: lg = log2(m) ; if finite(lg): l *= 0.88 + 0.12 * (lg - floor(lg))      // infinite modulus: factor 1
    h = atan2(y, x)/TAU ; if h < 0: h += 1 ; if h >= 1: h = 0
    a = 0.8 * min(l, 1 - l) ; h12 = h * 12
    channel(n): k = (n + h12) % 12 ; return l - a * max(-1, min(k - 3, 9 - k, 1))
    out[0] = floor(255*channel(0) + 0.5) ; out[1] = floor(255*channel(8) + 0.5) ; out[2] = floor(255*channel(4) + 0.5)
colorOf(w, out, rings) = colorXY(re(w), im(w), out, rings)
rangesFromView(view, W, H) = { xRange: [cx - W/(2 scale), cx + W/(2 scale)],
                              yRange: [cy - H/(2 scale), cy + H/(2 scale)] }
               // view missing or scale not a positive number: centre 0, scale = W/8 (x from -4 to 4)
```

**Pixel budget and size.**

```
targetSize(mode):
    cw = canvas.width ; ch = canvas.height ; if cw < 1 or ch < 1 -> null (state 'hidden')
    q  = clamp(quality[mode], 0.05, 1)
    qe = min(q, sqrt(maxPixels[mode] / (cw * ch)))
    W = max(1, ceil(cw * qe)) ; H = max(1, ceil(ch * qe))
```
When `cw*ch*q*q <= maxPixels[mode]` this is exactly `ceil(w*q) x ceil(h*q)` of the goal text; the cap only
bites on large canvases (1.2e5 offscreen pixels while dragging is about 20 ms of work; 1.5e6 when idle
is about 0.25 s, spread over frames).

**Draw.**

```
ensureBuffers(W, H): if offscreen missing or size differs: off = document.createElement('canvas'); off.width = W; off.height = H
                     offCtx = off.getContext('2d'); img = offCtx.createImageData(W, H)      // reused until the size changes
fillRows(r0, r1):
    dx = (xmax - xmin)/W ; dy = (ymax - ymin)/H ; zin = {re: 0, im: 0} ; tmp = [0, 0, 0]
    for j in r0..r1-1: zin.im = ymax - (j + 0.5)*dy                   // row 0 is the top, y up
        for i in 0..W-1: zin.re = xmin + (i + 0.5)*dx                  // pixel centres
            w = safeCall(fn, zin)        // try/catch; typeof fn != 'function' -> NaN; reads w.re, w.im immediately
            colorXY(w.re, w.im, tmp, rings)
            p = (j*W + i)*4 ; img.data[p..p+2] = tmp ; img.data[p+3] = 255
blit(): ctx = canvas.getContext('2d') ; ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.imageSmoothingEnabled = (W < canvas.width or H < canvas.height) ; ctx.imageSmoothingQuality = 'low'
        offCtx.putImageData(img, 0, 0) ; ctx.drawImage(off, 0, 0, W, H, 0, 0, canvas.width, canvas.height)
        lastW = W ; lastH = H ; renders++ ; canvas.dataset.dcState = 'ready'
render(mode?):
    if destroyed -> false
    if mode given: current = mode
    cancelRefine()                                 // an explicit render supersedes a pending or unfinished refine
    ctx = canvas.getContext('2d') ; if none -> state 'no-context' -> return false
    if canvas.width < 1 or canvas.height < 1 -> state 'hidden' -> return false
    if typeof fn != 'function': fill the whole canvas rgb(128,128,128) ; state 'no-function' ; return true
    (W, H) = targetSize(current)
    ensureBuffers(W, H) ; fillRows(0, H) ; blit()
    if current == 'drag': armRefine()              // timer = setTimeout(startRefine, 120)
    return true
```

**Refine (idle, time-sliced).**

```
startRefine():                       // fires 120 ms after the last drag render
    timer = null ; if destroyed return ; current = 'idle'
    (W, H) = targetSize('idle')
    if no size or typeof fn != 'function': finish() ; return        // nothing to sharpen: clear the flag armRefine set
    ensureBuffers(W, H) ; canvas.dataset.dcPending = '1'            // info().pending is true from here (job is set below)
    if document.hidden: fillRows(0, H) ; blit() ; finish() ; return       // no frames while hidden
    job = { row: 0, H } ; rafId = requestAnimationFrame(stepJob)
stepJob():
    if no job or destroyed return
    t0 = performance.now()
    do { r1 = min(H, job.row + 16) ; fillRows(job.row, r1) ; job.row = r1 }
    while (job.row < H and performance.now() - t0 < 8)                    // at least one 16-row band per frame
    if job.row >= H: blit() ; finish() else rafId = requestAnimationFrame(stepJob)
finish(): job = null ; rafId = 0 ; delete canvas.dataset.dcPending
cancelRefine(): clearTimeout(timer) ; timer = null ; if rafId: cancelAnimationFrame(rafId) ; rafId = 0 ; job = null ; delete canvas.dataset.dcPending
setQuality(mode): current = mode ; if mode == 'idle': cancelRefine()          // 'drag' leaves a pending refine alone
destroy(): destroyed = true ; cancelRefine() ; off = img = offCtx = null ; state 'destroyed'    // idempotent
info(): { mode: current, width: lastW, height: lastH, pending: (timer != null or job != null), destroyed, renders, state }
```

Recommended host first paint: `dc.render('drag')`, then let the refine land.

**Wheel.**

```
drawColorWheel(canvas, {size = 96}):
    dpr = min(2, devicePixelRatio || 1) ; px = round(size * dpr)
    canvas.width = canvas.height = px ; canvas.style.width = canvas.style.height = size + 'px'
    R = px/2 ; Rw = R - 1.5*dpr ; img = ctx.createImageData(px, px)
    for each pixel (i, j): dx = i + 0.5 - R ; dy = R - (j + 0.5)             // y up
        d = hypot(dx, dy)
        alpha = clamp(Rw + 0.5 - d, 0, 1) ; if alpha == 0: transparent pixel
        rho = min(d / Rw, 1 - 1e-9) ; ang = atan2(dy, dx)
        m = (rho / (1 - rho))^2                          // chosen so lightnessOf = rho exactly
        colorXY(m cos ang, m sin ang, tmp, true) ; write tmp with alpha*255
    putImageData ; stroke a circle of radius Rw, line width dpr, colour = computed '--border' (fallback '#888888')
    role / aria-label as in 4.3
```
The wheel therefore shows exactly what the colouring shows: black centre, `|w| = 1` at half radius (a visible ring step
there), white rim, hue by angle with red to the right.

### 5.4 Implementation traps (read before coding)

1. Closed curves: last point is an exact copy of the first. Never rely on `cos(2π)` rounding.
2. `lerp` must return `a` when `a === b`, and must hit `b` exactly at `u = 1`.
3. Do not subdivide toward a clamp boundary and do not subdivide next to a dropped sample: the
   "fewer points than the input" test (254 < 257) fails otherwise.
4. Refinement compares the image turn with the input turn. Comparing with a bare threshold would
   subdivide rectangle corners to depth 4 and break `morph(c, 0, f)` and the identity map.
5. The bow-tie crossing lies exactly on sampled vertices of both edges; the intersection test must be
   inclusive. A strict proper-crossing test reports it as simple.
6. `hueOf`: a tiny negative angle plus 1 rounds to exactly 1; guard `h >= 1`.
7. `morph` shortcuts at s = 0 and s = 1 are part of the contract (poles at s = 0, exact equality at 1).
8. No `Math.hypot` in the pixel loop (it is slow); use `Math.sqrt(x*x + y*y)` as in `colorXY`, and fall back to `Math.hypot`
   only when that sum is not finite (|w| above about 1.3e154); otherwise the ring term becomes NaN and the pixel paints black.
9. The sector's first point of every arc/ray at `theta0 = 0` must have `im = +0` exactly (use `lerp`
   angles and `r * Math.sin(0)`); the test requires `0 <= Arg`.
10. `render('drag')` must re-arm the 120 ms timer on every call; the refine must never run while a
    newer drag render is the latest call.

---

## 6. Mathematics

Notation: z = x + iy = r e^{iθ}, w = u + iv = ρ e^{iψ}. Every value below is exact or rounded to the
digits shown and is asserted in section 7.

### 6.1 Formulas used

| Topic | Formula |
|---|---|
| Parameterized segment | z(t) = (1 - t) a + t b, 0 <= t <= 1 |
| Polar address | r = √(x² + y²), θ = atan2(y, x) = Arg z in (-π, π]; z = r(cos θ + i sin θ) |
| Power | zⁿ = rⁿ e^{inθ}: (r, θ) -> (rⁿ, nθ) |
| Cube and square in Cartesian | z² = (x² - y²) + 2xy i; z³ = (x³ - 3xy²) + (3x²y - y³) i |
| Reciprocal | 1/z = conj z / \|z\|² = (1/r) e^{-iθ}: inversion in the unit circle, then mirror |
| Linear map | az + b = (\|a\| e^{i arg a}) z + b: spin by arg a, stretch by \|a\|, slide by b |
| Fixed point of az + b (a ≠ 1) | z* = b / (1 - a) |
| Signed area (orientation) | A = ½ Σ (xₖ yₖ₊₁ - xₖ₊₁ yₖ); A > 0 counter-clockwise |
| Domain colour | hue = (Arg w / 2π) mod 1; lightness = 1 - 1/(1 + √\|w\|) |
| Parabola, focus 0 | ρ = d - u with directrix u = d, vertex d/2 |

### 6.2 1.5.1 Parameterize the line from 2 + i to -3 - 3i

**Cartesian (native).** d = (-3 - 3i) - (2 + i) = -5 - 4i. z(t) = (2 + i) + t(-5 - 4i) =
(2 - 5t) + i(1 - 4t), 0 <= t <= 1. So x(t) = 2 - 5t, y(t) = 1 - 4t. A slide that grows with t.

**Polar (shown to see why it is the wrong address here).** r(t)² = (2 - 5t)² + (1 - 4t)² = 41t² - 28t + 5;
θ(t) = Arg z(t) = atan2(1 - 4t, 2 - 5t). The line misses 0 (it crosses the imaginary axis at
t = 0.4 where y = -0.6), so it has a closest approach at t = 14/41 with r² = 9/41, r_min = 3/√41.
The curve meets the real axis only at t = 1/4, at x = 0.75 > 0, so it never crosses the negative real
axis and θ(t) is continuous on [0, 1] (no jump of Arg).

| t | z(t) Cartesian | r | θ = Arg |
|---|---|---|---|
| 0 | 2 + i | √5 = 2.236068 | 0.463648 |
| 1/4 | 0.75 | 0.75 | 0 |
| 0.4 | -0.6i | 0.6 | -π/2 = -1.570796 |
| 14/41 = 0.341463 (closest approach) | 12/41 - (15/41) i = 0.292683 - 0.365854i | 3/√41 = 0.468521 | -0.896055 |
| 1/2 | -0.5 - i | √1.25 = 1.118034 | -2.034444 |
| 1 | -3 - 3i | 3√2 = 4.242641 | -3π/4 = -2.356194 |

Which address: Cartesian (a linear function of t); the polar form needs a square root and an arctangent.
Engine: `segment(2+i, -3-3i)` has 65 points; `pointAt(c, .25) = 0.75`, `pointAt(c, .4) = -0.6i`,
`pointAt(c, .5) = -0.5 - i`; `reverse` starts at -3 - 3i with t = 0.

### 6.3 2.1.2 Image of x = 2 under w = z²

**Cartesian.** z = 2 + iy, so z² = (4 - y²) + 4y i: u = 4 - y², v = 4y. Eliminate y = v/4:
**u = 4 - v²/16**, a parabola with vertex 4 opening left; v² = -16(u - 4) so 4p = -16, focus at 4 - 4 = 0.

**Polar.** x = 2 is r cos θ = 2, r = 2 sec θ, -π/2 < θ < π/2. Then ρ = r² = 4 sec² θ, ψ = 2θ, so
ρ = 4/cos²(ψ/2) = 8/(1 + cos ψ), i.e. ρ + ρ cos ψ = 8, i.e. **ρ + u = 8**: every image point is as far from
0 as from the line u = 8 (focus 0, directrix u = 8). The same computation for x = c gives the confocal family
ρ + u = 2c².

Engine on `verticalLine(2, {yRange: [-4, 4]})` (129 points, y = -4 + 8k/128):

| index k | y | w = (4 - y²) + 4y i | check |
|---|---|---|---|
| 0 | -4 | -12 - 16i | \|w\| = 20 = 8 - (-12) |
| 16 | -3 | -5 - 12i | \|w\| = 13 = 8 + 5 |
| 64 | 0 | 4 | \|w\| = 4 = 8 - 4 |
| 80 (t = 0.625) | 1 | 3 + 4i | \|w\| = 5 = 8 - 3 |
| 128 | 4 | -12 + 16i | \|w\| = 20 |

All 129 points satisfy `|u - (4 - v²/16)| < 1e-6` and `|ρ + u - 8| < 1e-9`. One piece, no
refinement (the image turns at most 0.031 rad per step), `t` strictly increasing.
`bounds` of the image: xRange [-12, 4], yRange [-16, 16].

### 6.4 2.1.3 Image of x = 2 under f(z) = iz - 2i

**Cartesian.** z = 2 + iy: iz = 2i - y, so f = -y + 0i: **the real axis, v = 0**, traversed from w = 4 (y = -4) to
w = -4 (y = 4).

**Polar / motion.** a = i = e^{iπ/2} (spin 90° counter-clockwise, stretch 1), b = -2i. In general the map is a
**rotation by 90° counter-clockwise about its fixed point** z* = b/(1 - a) = -2i/(1 - i) = 1 - i, because
f(z) - z* = i(z - z*): |w - z*| = |z - z*| and arg(w - z*) = arg(z - z*) + π/2. Check: f(1 - i) =
i(1 - i) - 2i = 1 - i. Line check: z - z* = 1 + i(y + 1), times i = -(y + 1) + i, plus z* = -y + 0i. ✓

Engine: first image point 4 + 0i, last -4 + 0i, index 64 -> 0; `|Im w| < 1e-9` everywhere; for every point,
`w - (1 - i) = i (z - (1 - i))` within 1e-9. Sample from the handout data: z = 2 + 3i -> -3.

### 6.5 2.2.1 Image of the sector 0 < arg z < π/4 under w = z³

**Polar (native).** (r, θ) -> (r³, 3θ). θ in (0, π/4) gives 3θ in (0, 3π/4); r³ takes every positive value. Image: the open
sector **0 < arg w < 3π/4**. It does not overlap itself because 3·(π/4) < 2π.

**Cartesian.** z³ = (x³ - 3xy²) + (3x²y - y³) i. On the edge y = 0: w = x³ > 0 (the positive real axis). On the edge
y = x: u = -2x³, v = 2x³, so v = -u > 0: the ray at 3π/4. An interior ray at angle θ lands at angle 3θ.

Engine on `sector({r1: 2, theta0: 0, theta1: π/4})` (8 curves; the boundary has 145 points): every image
point has `-1e-9 <= Arg w <= 3π/4 + 1e-9` and `|w| <= 8 + 1e-9`. Specific values (all curves come back
unrefined, one piece each; the boundary stays one **closed** piece):

| input | image |
|---|---|
| boundary index 48, z = 2 | w = 8 |
| boundary index 96, z = 2e^{iπ/4} = √2 + √2 i | w = 8e^{i3π/4} = -4√2 + 4√2 i = -5.656854 + 5.656854i |
| arcs `arc1..3` (r = 0.5, 1, 1.5) | circles of radius 0.125, 1, 3.375 |
| rays `ray1..4` (angle θ = (π/4)·k/5 = πk/20, k = 1..4, i.e. 9°, 18°, 27°, 36°) | rays at angle 3θ = 3πk/20: 0.471239, 0.942478, 1.413717, 1.884956 (27°, 54°, 81°, 108°) |

### 6.6 2.5.1 Image of |z - 1| = 1 under w = 1/z

**Polar (shows why).** z = 1 + e^{iθ} = 2 cos(θ/2) e^{iθ/2}, so r = 2 cos(θ/2), Arg z = θ/2 for -π < θ < π; the point
θ = ±π is z = 0. Then 1/z = e^{-iθ/2}/(2 cos(θ/2)) = ½ - (i/2) tan(θ/2): real part ½ always, imaginary part runs over
all reals. In polar form ρ cos ψ = ½. The circle passes through the centre of inversion, so it must open into a line.

**Cartesian (verifies).** |z - 1|² = 1 is x² + y² = 2x. Then u = x/(x² + y²) = x/(2x) = ½ (x ≠ 0). Sample z = 1 + i: w = (1 - i)/2 = 0.5 - 0.5i.

Engine on `circle({re:1,im:0}, 1, {n: 256})` under 1/z: samples 127, 128, 129 (the three nearest to z = 0) have |z| = 2 sin(π/256) = 0.02454,
about 1e-16, and 0.02454, so |w| = 40.74, about 8e15 and 40.74: all above the clamp 40, dropped. Sample 126 has |z| = 0.049082,
w = 0.5 - 20.3677i, |w| = 20.373878 (the largest kept); sample 130 mirrors it. Result: **2 pieces**, t ranges [0, 0.4921875] and [0.5078125, 1], 127 points each, **254 of 257 points**; every point
has `|Re w - 0.5| < 1e-6` (measured 4.8e-15); `pointOnPieces(pieces, 0.25) = 0.5 - 0.5i` (k = 64: z = 1 + i), `pointOnPieces(pieces, 0.5) = null`.

### 6.7 P4 (1 + i)z sends |z| = 1 onto |w| = √2

**Polar (native).** 1 + i = √2 e^{iπ/4}, so w = √2 e^{i(θ + π/4)}: |w| = √2 and the angle shifts by 45° (spin 45°, stretch √2). Onto: for |w| = √2,
z = w/(1 + i) has |z| = √2/√2 = 1.
**Cartesian.** w = (x - y) + (x + y) i; |w|² = (x - y)² + (x + y)² = 2(x² + y²) = 2.

Engine on `circle(0, 1)` (n = 128) under (1 + i)z: one closed piece of 129 points; `| |w| - √2 | < 1e-9`; `Arg w_k = wrapArg(θ_k + π/4)` with
θ_k = 2πk/128. Values: k = 0: 1 + i; k = 16 (z = e^{iπ/4}): √2 i = 0 + 1.414214i; k = 32 (z = i): -1 + i; k = 96 (z = -i): 1 - i (Arg -π/4 = wrap(7π/4)).

### 6.8 T2.5 1/z is inversion followed by a mirror

`circle(0, 1)` under 1/z: each point stays at radius 1 (inversion fixes the unit circle) and its angle is negated (mirror): `Arg w_k = -θ_k`
modulo 2π, so the image is the unit circle run **clockwise**: `classify(image).orientation = -1`. The inside of the unit circle is
swapped with the outside, which is why the curve's orientation reverses while the map stays conformal.
Values: k = 32 -> -i; k = 64 -> -1; k = 96 -> +i.

### 6.9 T1.5 classification and orientation (hand-checked)

| Curve | closed | simple | smooth | piecewise | corners | orientation | why |
|---|---|---|---|---|---|---|---|
| segment | no | yes | yes | yes | 0 | 0 | open |
| `circle(0, 1)` n = 128 | yes | yes | yes | yes | 0 | +1 | turning 2π/128 = 2.8° each |
| `circle(0, 1, {orientation: -1})` and `reverse(circle)` | yes | yes | yes | yes | 0 | -1 | area -π |
| `rect(-1-i, 1+i)` | yes | yes | no | yes | 4 | +1 | 90° corners, area +4 |
| bow-tie (-1-i, 1+i, 1-i, -1+i) | yes | **no** | no | yes | 4 | 0 | crosses at 0; not simple, so 0 (the two triangles of area ±1 also cancel) |
| lopsided bow-tie (0, 2+2i, 3, 3i) | yes | **no** | no | yes | 4 | 0 | not simple, so 0 although the lobes' areas do not cancel (signed area +1.5) |
| limacon with an inner loop (r = 1/2 + cos θ) | yes | **no** | yes | yes | 0 | 0 | not simple, so 0 whatever the signed area (it is +) |
| L-shape (0, 2, 2+i, 1+i, 1+2i, 2i) | yes | yes | no | yes | 6 | +1 | area 3 |
| open polyline (0, 1, 1+i) | no | yes | no | yes | 1 | 0 | one 90° corner |
| half circle `circle(0, 1, {from: 0, to: π})` | no | yes | yes | yes | 0 | 0 | |
| freehand figure-eight (sin t, sin t cos t) | yes | **no** | yes | yes | 0 | 0 | self-crossing: not simple, so 0 |
| sector boundary (r0 = 0, π/4) | yes | yes | no | yes | 3 | +1 | corners at 0 and at both arc ends |

### 6.10 Domain colouring values (hand-checked, rings on, tolerance +/-1 per channel)

`colorXY` computes l = lightnessOf · (0.88 + 0.12 frac(log2 \|w\|)), a = 0.8 min(l, 1 - l), and the channels
`(r, g, b)` = l - a·clamp(·) by hue as in 5.3. Worked example w = 1 + i: \|w\| = √2, lightness 0.543214, frac(log2 √2) = 0.5, factor 0.94,
l = 0.510621, a = 0.391500, hue 0.125 (h12 = 1.5): r = l + a = 0.9021 -> 230; g = l + a/2 = 0.7063 -> 180;
b = l - a = 0.1191 -> 30.

| w | hue | lightnessOf | colorOf (rings on) | colorOf (rings off) |
|---|---|---|---|---|
| 1 | 0 | 0.5 | [202, 22, 22] | [230, 25, 25] |
| i | 0.25 | 0.5 | [112, 202, 22] | [128, 230, 25] |
| -1 | 0.5 | 0.5 | [22, 202, 202] | [25, 230, 230] |
| -i | 0.75 | 0.5 | [112, 22, 202] | [128, 25, 230] |
| 2 | 0 | 0.585786 | [230, 33, 33] | [234, 65, 65] |
| 0.5 | 0 | 0.414214 | [167, 19, 19] | [190, 21, 21] |
| 4 | 0 | 0.666667 | [234, 65, 65] | [238, 102, 102] |
| 1 + i | 0.125 | 0.543214 | [230, 180, 30] | [232, 185, 45] |
| -1 - i | 0.625 | 0.543214 | [30, 80, 230] | [45, 92, 232] |
| 0 | 0 | 0 | [0, 0, 0] | [0, 0, 0] |
| NaN or Infinity | 0 | NaN / 1 | [128, 128, 128] | [128, 128, 128] |

Also: lightnessOf(1/4) = 1/3, lightnessOf(9) = 0.75, lightnessOf(1e12) = 0.999999.
The colour of 2 has channel sum 296, the colour of 0.5 has 205 (brighter outside).

Seam facts (tolerance in D4): the colours at -1 + 0i and at -1 - 1e-12 i are equal ([22, 202, 202]). The principal square root of -4 + 1e-12 i is
about +2i (hue 0.25, colour [131, 230, 33]); of -4 - 1e-12 i it is about -2i (hue 0.75, colour [131, 33, 230]): a colour jump of 394 summed over channels,
while the points themselves are 2e-12 apart.

---

## 7. Verification plan

Commands, from the repo root:

```
node --test tests/unit/i1-core-mapping.test.mjs          # all unit cases below
node --test "tests/unit/*.test.mjs"                       # whole unit suite
node tools/smoke.mjs --route nosuchplace --script tests/interact/i1-core-mapping.mjs --dark --out docs/review/iter-1/i1-core-mapping
```
Notes: (1) `npm test` currently runs `node --test tests/unit/`, which on Node 22 tries to load the directory as a module and
exits 1 before running a single test; the working form is the quoted glob above, and `package.json` (not owned by this goal)
should use it (request under section 9). (2) `tools/smoke.mjs` joins `--out` onto the repo root, so pass a repo-relative path;
an absolute path creates a copy of that path inside the repo.
The interaction script needs the shell (`i1-shell`: `index.html`, router) to exist so the harness can load a page; it does not
use any route's content and does not depend on any other wave-0 module. Until the shell has landed, the unit tests are the
verification; the script is run by Review B in the integrated tree.

The unit test file imports only the three modules (no `complex.js`) and defines these local helpers so it is self-contained:
`inv(z)` (`d = re² + im²`; `d === 0` gives `{NaN, NaN}`, else `{re/d, -im/d}`), `sq`, `cube`, `mulBy(a)`,
`abs`, `Arg = atan2(im, re)`, `wrap(θ)` into (-π, π], `near(a, b, e = 1e-9)`, `all(pieces)` (flat points).
Tolerance is 1e-9 unless stated. Counts are exact.

### 7.1 A1: shapes (unit_test)

| Id | Call | Expected |
|---|---|---|
| S1 | `segment(2+i, -3-3i)` | 65 points; first `{2, 1, t: 0}` exactly; last `{-3, -3, t: 1}` exactly; `pointAt(c, .5) = -0.5 - i`; `pointAt(c, .25) = 0.75 + 0i`; `pointAt(c, .4) = -0.6i`; label `"segment from 2 + i to -3 - 3i"`; family null; closed false |
| S2 | `segment(0, 1, {n: 4})`; numbers as complex | t = [0, .25, .5, .75, 1], re = same; `segment(2, 5)` accepted |
| S3 | `circle(0, 1)` | 129 points, last equals first exactly; every `abs(z) - 1 < 1e-12`; classify `{closed: true, simple: true, smooth: true, piecewiseSmooth: true, orientation: 1, corners: 0}`; `circle(0, 1, {orientation: -1})` orientation -1; partial `circle(0, 1, {from: 0, to: π})` closed false; family `'polar'` |
| S4 | `rect(-1-i, 1+i)` | 129 points; every point `max(abs(re), abs(im)) = 1` (1e-12); points 0, 32, 64, 96, 128 = (-1,-1), (1,-1), (1,1), (-1,1), (-1,-1) exactly; t at index 32 = 0.25; classify `{closed: true, simple: true, smooth: false, piecewiseSmooth: true, corners: 4, orientation: 1}`; `rect(1+i, -1-i)` gives identical points |
| S5 | `polygon([-1-i, 1+i, 1-i, -1+i])` | classify simple false, closed true, orientation 0, corners 4. L-shape polygon: simple true, orientation +1, corners 6, 193 points. `polygon([0, 1, 1+i], {closed: false})`: 65 points, closed false, corners 1, orientation 0 |
| S6 | `reverse` | `reverse(segment(2+i, -3-3i)).points[0] = {-3, -3, t: 0}`; every reversed point k has `t = 1 - original[n-k].t`; `classify(reverse(circle(0,1))).orientation = -1`; `reverse(reverse(c))` points equal c's; `reversed` flag toggles |
| S7 | `verticalLine(2, {yRange: [-4, 4]})` | 129 points; `re === 2` for all; im from -4 to 4 strictly increasing and t = (im + 4)/8; label `"x = 2"`; family `'cart'`; `yRange: [4, -4]` gives the same points. `horizontalLine(-1, {xRange: [-2, 2]})` label `"y = -1"`, im = -1 |
| S8 | `ray(π/4, {rMax: 2})` | first (0, 0), last (√2, √2) within 1e-12, 97 points, family `'polar'` |
| S9 | `sector({r1: 2, theta0: 0, theta1: π/4})` | 8 curves; kinds in order boundary, 4 rays, 3 arcs; boundary closed with 145 points; every point of every curve has `0 <= Arg <= π/4 + 1e-9` (no negative angles) and `abs <= 2 + 1e-9`; `fill: false` gives 1 curve; with `r0: 1`: boundary 193 points, every point `abs >= 1 - 1e-9`, classify corners 4; `theta1 <= theta0` is normalised by adding 2π |
| S10 | `annulus({center: -i, r0: 1, r1: 3})` | 12 curves; curve 0 id `inner`: every `abs(abs(z + i) - 1) < 1e-9`; curve 1 id `outer`: radius 3; both closed with 97 points; fill rings at radius 5/3 and 7/3; 8 rays of 33 points; `r0 > r1` swapped |
| S11 | grids | `cartGrid()` 18 curves, first 9 kind `'cart-x'` with re = -2 + 0.5 i, last 9 `'cart-y'`, each 97 points, family `'cart'`, last vertical line re = 2 exactly; `polarGrid()` 16 curves: 4 rings of radius 0.5, 1, 1.5, 2 (closed), 12 rays 30° apart, family `'polar'`; `cartGrid({step: 0})` falls back to 0.5 |
| S12 | `freehand` | `[0, 0.005, 0.02, 0.021, 1]` with minDist 0.01 keeps re = [0, 0.02, 1]; always keeps the last sample; t by arclength (0.02/1 for the middle one); `freehand([])` has 0 points; `freehand([1+i])` has one point at t = 0; non-finite samples skipped |
| S13 | `resample`, `pointAt` | `resample(segment(0, 1), 4)` t = [0, .25, .5, .75, 1], 5 points; `resample(circle(0,1), 32)` stays closed with last = first; `pointAt` clamps t < 0 and t > 1, NaN -> first point; empty curve -> `{NaN, NaN}`; `curveLength(rect(-1-i,1+i))` = 8 |
| S14 | degenerate and robust classify | `segment(1+i, 1+i)` and `{points: []}` classify as the degenerate answer; freehand figure-eight `{sin t, sin t cos t}`, t in [0, 2π], 200 samples, minDist 0.001: closed true, simple false |
| S15 | purity | the source text of `shapes.js` and `mapping.js` (comments stripped) contains no `import` statement and none of `document`, `window`, `localStorage`, `requestAnimationFrame`, `getComputedStyle`; `domaincolor.js` has no `import` statement |
| S16 | orientation needs a simple curve | a limacon with an inner loop (`r = 1/2 + cos θ`, 400 samples): closed true, simple false, orientation 0 (also reversed); `circle` +1, clockwise circle -1, `reverse(rect)` -1; the lopsided bow-tie `0, 2+2i, 3, 3i` (signed area +1.5): simple false, orientation 0 |
| S17 | labels, sector `n`, missing arguments | `polygon([1+i]).label` = `"polyline, 1 vertex"`, two vertices `"polyline, 2 vertices"`; `sector({..., n: 1})` boundary has 3n + 1 = 4 points and `n: 0` also 4; every builder accepts `null` and `undefined` options (default point counts and curve counts); `reverse(null)`, `reverse(undefined)`, `resample(null, 5)`, `resample` of an empty curve all have `points: []`; `classify`, `pointAt`, `curveLength`, `reverse`, `resample` do not throw for `undefined, null, 5, 'x', {}, []` |
| S18 | classify speed | a simple 5000-point circle, a 5001-point rectangle and a 5000-point spiral each classify as simple in under 60 ms (median of 5; about 2 ms measured, the margin is for slow CI); a 6000-point figure-eight is not simple and has orientation 0 even though the test runs on a decimated copy |

### 7.2 A2: mapping (unit_test)

| Id | Call | Expected |
|---|---|---|
| M1 | `pushForward(circle(0,1), inv)` | 1 piece, `closed` true, 129 points; every `abs(\|w\| - 1) < 1e-9`; `Arg w_k = -θ_k` mod 2π (use `wrap` of the difference) for all k; `classify(piece).orientation = -1`; t array equals the input's; points 32, 64, 96 are -i, -1, +i |
| M2 | `pushForward(circle(1, 1, {n: 256}), inv)` | exactly 2 pieces; t ranges [0, 0.4921875] and [0.5078125, 1]; 127 points each; 254 total, and 254 < 257; every point finite, `abs(re - 0.5) < 1e-6`, `\|w\| <= 40` (max 20.373878 +/- 1e-5); `pointOnPieces(pieces, .25) = 0.5 - 0.5i` (1e-9); `pointOnPieces(pieces, .5) = null`; pieces' `source` equals the input id when set |
| M3 | `pushForward(segment(-1, 1), inv)` | 2 pieces; 32 + 32 points; first piece ends at -32 + 0i (z = -1/32), second starts at +32; max `\|w\|` 32 |
| M4 | other samplings of the real segment | `segment(-1, 1, {n: 63})`: 2 pieces, 62 points; `segment(-1, 1, {n: 3})`: 2 pieces of 9 points, first ends at w = -9 (z = -1/9, after the 16-segment densification), second starts at +9; `segment(-1, 2, {n: 1})` (pole between samples): >= 2 pieces, every piece one-signed (all re < 0 or all re > 0), none `> 40` |
| M5 | leap rule | `segment(-1, 1.07, {n: 16})` with `{maxDepth: 0}`: 2 pieces, first ends at w = 1/(-0.094375) = -10.596026, second starts at 1/0.035 = 28.571429 (both within 1e-5); with default options: 2 pieces, each one-signed |
| M6 | legitimate big steps are not cut | `pushForward(verticalLine(2), cube, {clampRadius: 1e6})`: 1 piece, 129 points; default options: 1 piece, 89 points, t range [0.15625, 0.84375], max `\|w\| < 40` (39.32); identity map on a freehand stroke with one long flick (points `(0.01k, 0)` for k = 0..19, then `(0.19, 3)`, then `(0.2, 0)`, then `(0.2 + 0.01k, 0.001)` for k = 0..19, `minDist` 0.001): 1 piece, all 42 points kept (a long step with reversals, but its stretch equals the median, so it is not a pole leap) |
| M7 | 2.1.2: `pushForward(verticalLine(2), sq)` | 1 piece, 129 points; every `abs(u - (4 - v²/16)) < 1e-6` and `abs(\|w\| + u - 8) < 1e-9`; t strictly increasing and equal to input t; point 0 = -12 - 16i, 16 = -5 - 12i, 64 = 4, 80 = 3 + 4i (t = 0.625), 128 = -12 + 16i; `bounds` = xRange [-12, 4], yRange [-16, 16] |
| M8 | P4: `pushForward(circle(0,1), mulBy(1+i))` | 1 closed piece, 129 points; every `abs(\|w\| - √2) < 1e-9`; `Arg w_k = wrap(θ_k + π/4)`; points 0, 16, 32, 96 = 1 + i, √2 i, -1 + i, 1 - i |
| M9 | 2.1.3: `pushForward(verticalLine(2), z => iz - 2i)` | 1 piece; every `abs(im) < 1e-9`; first = 4, last = -4, index 64 = 0; re = -y; every point `w - (1 - i) = i(z - (1 - i))` within 1e-9 |
| M10 | 2.2.1: `pushForwardAll(sector({r1: 2, theta0: 0, theta1: π/4}), cube)` | 8 pieces (one per curve), boundary piece closed with 145 points, every other piece 49 points (no refinement); all points `-1e-9 <= Arg w <= 3π/4 + 1e-9`, `\|w\| <= 8 + 1e-9`; boundary point 48 = 8, point 96 = -5.656854 + 5.656854i; arcs have radii 0.125, 1, 3.375; interior rays: each point with `\|w\| > 1e-9` has `Arg w = 3πk/20` (k = 1..4) |
| M11 | morph | `rect(0.5+0.5i, 1.5+1.5i)`, `sq`: `morph(c, 0, sq)` = 1 piece with the same 129 points, same t, closed true (exact); `morph(c, 1, sq)` equals `pushForward(c, sq)` pointwise (JSON-equal points); `morph(c, 0.5, sq)`: 129 points each `= (z + z²)/2` within 1e-12 with the input t; `s = -1` behaves as 0, `s = 2` as 1, `s = NaN` as 0; `morph(circle(0,1), 0, inv)` still returns the full circle |
| M12 | `morphPoint` | `(1+i, 3, 0)` = 1 + i exactly; `(1+i, 3, 1)` = 3 exactly; `(1+i, 3, .25)` = 1.5 + 0.75i |
| M13 | refinement | `pushForward(circle(0,1), cube)`: 1 closed piece, 257 points (> 129), all `abs(\|w\| - 1) < 2e-3` (measured 9.0e-4, the chord-midpoint error); `{maxDepth: 0}`: exactly 129; `{maxPoints: 130}`: exactly 129; `pushForward(c, z => z)` for rect, circle, polygon returns the identical points (JSON-equal) in 1 piece |
| M14 | batch and metadata | `pushForwardAll(cartGrid(), sq)`: 18 pieces, ids `gx0~0` ... with `source` `gx0` ..., kinds `'cart-x'` / `'cart-y'`, family `'cart'`; `pushForwardAll(polarGrid(), sq)`: 16 pieces, ring r = 1 image has radius 1 +/- 1e-9; `cartGrid()` under `inv`: 18 curves -> 20 pieces (the two lines through 0 split) |
| M15 | `bounds`, `lift`, `pointOnPieces` | `bounds([])` null; `bounds` ignores NaN points; accepts a single curve; `lift(segment(0, 1, {n: 2}), sq)` w at t = .5 is 0.25; `lift(segment(-1, 1, {n: 2}), inv)[1].w` is `{NaN, NaN}`; `pointOnPieces([], .3)` null |
| M17 | a branch cut is a teleport | `verticalLine(-1, {yRange: [-2, 2]})` under the principal `sqrt`, cube root and `z^(2/3)`: exactly 2 pieces, longest step inside any piece under 0.2 (measured 0.01 to 0.02; was a 2.00 chord), first t = 0, last t = 1, pieces in t order, `pointOnPieces` is null inside the gap and non-null at t = 1/4 and 3/4; the slanted segment `-3-i` to `-1+i` under the cube root: 2 pieces, no chord; 18 strokes through -1 at angles 5 to 175 degrees under `sqrt`: 2 pieces each, longest step under 0.5 (was one piece with a 2.83 chord) |
| M18 | a loop around 0 loses its seam | `rect(-1-0.8i, 1+0.8i)`, `rect(-1-i, 1+i)` (a sample exactly on the cut) and `circle(0, 1)` under the principal `sqrt`: 2 pieces, both `closed: false`, no step over 0.2; `circle(2, 1)` under `sqrt`: 1 closed piece; `verticalLine(1)` and `verticalLine(-1, {yRange: [1, 2]})`: 1 piece; the identity map on a rectangle around 0 and the cube root on a rectangle in the right half plane: 1 piece |
| M19 | rule (b) never cuts a smooth image | 6 maps (z², z³, e^z, sin z, identity, a rotation) x 40 pseudo-random strokes (segments, circles, rectangles, vertical lines), `clampRadius: 1e9`: exactly 1 piece each; `circle(1.05, 1)` under `1/z`: 1 piece; `cartGrid()` under `1/z`: 20 pieces (M14) |
| M11b | morph ids | `morph(g, 0, sq)`, `morph(g, 0.4, sq)`, `morph(g, 1, sq)` for a grid line `gx0` all carry `id = 'gx0~0'` and `source = 'gx0'`; the s = 0 points still equal the input's; an input without an id gets no id or source; `morph(null, ·, ·)` and `pushForwardAll(null, ·)` are `[]`; `bounds()` is null; `lift(null, f)` is `[]`; `morphPoint(undefined, w, .5)` is NaN, not a throw |
| M16 | robustness | f throws -> `[]`; f returns NaN -> `[]`; f returns bare number 5 -> real image 5; f not a function -> `[]`; 1-point curve -> `[]`; empty curve -> `[]`; `clampRadius: Infinity` on `cube` keeps 129 points; `clampRadius: 10` keeps 25; input curve and points are never mutated (deep-equal before/after) |

### 7.3 A3: colour convention (unit_test)

| Id | Case | Expected |
|---|---|---|
| D1 | `hueOf` | 1 -> 0; i -> 0.25; -1 -> 0.5; -i -> 0.75 (1e-12); 1 + i -> 0.125; -1 - i -> 0.625; `hueOf({re: 1, im: -1e-17})` is 0 and every result is `< 1`; `hueOf({NaN, 0}) = 0`; periodic: for θ in {0.3, 1.7, 3.0, -2.2} and k in {-2, 1, 2}, hue of `(cos(θ + 2πk), sin(θ + 2πk))` equals hue of `(cos θ, sin θ)` within 1e-12 |
| D2 | `lightnessOf` | 0 -> 0; 1 -> 0.5; 4 -> 2/3; 9 -> 0.75; 1/4 -> 1/3; 1e12 > 0.999; Infinity -> 1; NaN -> NaN |
| D3 | `colorOf` table of 6.10 | every row within +/-1 per channel, rings on and off; `colorOf(1)`: r > g and r > b; `colorOf(i)`: g >= r and g > b; `colorOf({NaN, 0})` is three equal values in [100, 160] (it is 128); `colorOf(2)` channel sum > `colorOf(0.5)` channel sum |
| D4 | seam | `colorOf(-1 + 0i)` and `colorOf({-1, -1e-12})` equal within 1; with local principal `sqrt` (`√\|z\| e^{i Arg z / 2}`): `colorOf(sqrt({-4, 1e-12}))` and `colorOf(sqrt({-4, -1e-12}))` differ by more than 300 summed over channels |
| D5 | `colorXY`, `out` reuse | `colorXY(x, y)` equals `colorOf({re: x, im: y})` for 50 pseudo-random points; `colorOf(w, out)` returns the very `out` array; two calls with no `out` return distinct arrays |
| D6 | `rangesFromView` | `{center: 0, scale: 100}, 800, 600` -> x [-4, 4], y [-3, 3]; center 1 + i -> x [-3, 5], y [-2, 4] |
| D7 | `DOMAIN_LEGEND` | all string fields non-empty; `details` has 5 entries; `aria` contains "angle" and "size" |
| D8 | purity and misuse | importing `domaincolor.js` in Node succeeds; `createDomainColoring(null, {})` throws `TypeError`; `drawColorWheel` is a function |
| D9 | huge modulus | `colorXY` at (1e155, 0), (1e200, 1e200), (-1e300, 0), (0, 1e154), (1.7e308, 1.7e308), (-1.7e308, 1.7e308): integers in 0..255, never NaN; rings off every channel >= 250 (white); rings on every channel >= 195 (the 2^k ring tint, as at 1e150); `colorOf` equals `colorXY`; `lightnessOf(1e200 + 1e200i) > 0.999999` |
| D10 | missing arguments | `colorXY(1, 0, null)` and `colorOf(1, undefined, undefined)` equal the default calls; `rangesFromView(undefined, 400, 300)` is x [-4, 4], y height 6, finite; `rangesFromView({center: 1, scale: 0}, 160, 80)` falls back to scale 20; `createDomainColoring(undefined)` and `drawColorWheel(null)` throw `TypeError` |
| D11 | no throw anywhere else | every exported function of the three modules except the two canvas ones, called with every combination of `undefined, null, NaN, Infinity, 'x', 0, 5, -1, true, {}, [], [1], a function, {re: 1}, {points: null}, {points: 5}, {points: []}` for its first two arguments and `undefined, null, {}, 3` for its third (more than 5000 calls): none throws |

### 7.4 A4: domain colouring renders reduced while dragging and refines when idle

Code inspection checklist (Review A and B), then the in-browser script below proves it:

* `createDomainColoring` keeps an offscreen `<canvas>` created lazily in `ensureBuffers` with size
  `ceil(canvas.width * qe) x ceil(canvas.height * qe)`, `qe = min(quality[mode], sqrt(maxPixels[mode]/(w*h)))`
  (equals `quality[mode]` for any canvas under the pixel caps).
* `render` fills an `ImageData` calling `colorXY` once per offscreen pixel, then `drawImage` scales to the visible canvas.
* `render('drag')` arms `setTimeout(startRefine, 120)` and re-arms it on every call; the refine runs in row bands
  under an 8 ms budget per frame; `destroy()` clears the timeout and cancels the frame request.
* No `window`/`document`/`requestAnimationFrame` outside `createDomainColoring` and `drawColorWheel`; no `import`.
* The module adds no window or document listeners.
* `startRefine` clears `dataset.dcPending` (through `finish()`) on every early return, so the flag and `info().pending` agree
  (unit test "A4 the pending flag clears when the refine has nothing to do": function set to null after a drag render; canvas resized to 0 after a drag render, then resized back and rendered again).

### 7.5 Interaction script `tests/interact/i1-core-mapping.mjs`

Run: `node tools/smoke.mjs --route nosuchplace --script tests/interact/i1-core-mapping.mjs --dark` (desktop 1280, phone 390, desktop-dark). It must
pass at all three. `export default async function (page, ctx)`; uses only `page.evaluate`, `page.waitForTimeout`,
`ctx.assert`, `ctx.shot`, `ctx.log`. No dependency on `_helpers.mjs` or any station.

1. **Load the modules in the page.** `await page.evaluate(async () => { const o = location.origin; const [dc, sh, mp] =
   await Promise.all(['domaincolor', 'shapes', 'mapping'].map(n => import(o + '/js/core/' + n + '.js'))); window.__cm = { dc, sh, mp }; return {...} })`.
   Assert the export names include: dc `colorOf, createDomainColoring, drawColorWheel, hueOf, lightnessOf`; sh `annulus, cartGrid, circle,
   classify, freehand, horizontalLine, pointAt, polarGrid, polygon, ray, rect, resample, reverse, sector, segment, verticalLine`; mp `bounds, lift,
   morph, morphPoint, pushForward, pushForwardAll`. (Console errors are caught by the harness.)
2. **Build the fixture** (inside `page.evaluate`): `div#cm-fixture` with `display: flex; flex-wrap: wrap; gap: 12px; padding: 12px;
   box-sizing: border-box; max-width: 100%`, appended to `#view` with the router's own children hidden (B5). Five `<figure>`s with `figcaption`: `canvas#cm-dc-id`
   (width = height = 200, `style.width = '200px'`), `canvas#cm-dc-sqrt` (same), `canvas#cm-wheel`, `canvas#cm-curves` (260 x 340: wide enough for the
   `w = 3 + 4i` label to sit to the right of the image curve) and `canvas#cm-seam` (200 x 200).
   The script body runs inside `try { ... } finally { restore }`: the fixture is removed and the router's children are shown again even when an assertion fails.
   Canvases get `style.maxWidth = '100%'`.
3. **Identity colouring, pixels.** `dcId = createDomainColoring(cm-dc-id, { f: z => z, xRange: [-2, 2], yRange: [-2, 2] })`; call `dcId.setQuality('idle')`,
   `dcId.render()`; `info()` = `{ mode: 'idle', width: 200, height: 200, state: 'ready' }`. Read pixels with `getImageData(i, j, 1, 1)`:
   (100, 100) is dark: max channel < 80 (measured [48, 5, 37]); (190, 100) red: r > g and r > b (measured [233, 55, 56]); (100, 10) yellow-green:
   g > r and g > b ([144, 233, 54]); (10, 100) cyan: r < g and r < b ([54, 232, 233]); (100, 190) violet: b > r > g ([145, 55, 233]).
4. **No seam for z, a seam for principal sqrt.** `dcSq` with `f = z => principal sqrt` (inline polar formula) on `cm-dc-sqrt`, same ranges, render idle. Compare
   pixels (10, 99) and (10, 101) (just above and below the negative real axis): for identity the summed channel difference is <= 30 (measured 4);
   for sqrt it is >= 300 (measured 409: [128, 229, 25] against [129, 25, 229]).
5. **Reduced while dragging, refine when idle.** `dcId.render('drag')`; immediately `info()` = `{ mode: 'drag', width: ceil(200 * 0.3) = 60, height: 60 }`
   and `pending === true`. Record `performance.now()`; poll every 20 ms until `info().mode === 'idle' && !info().pending` (timeout 3000 ms):
   elapsed >= 100 ms and width = height = 200 again; the three pixel tests of step 3 still hold (identical values). Then call `dcId.render('drag')` five
   times 40 ms apart (well inside the 120 ms delay): after each call `info().mode === 'drag'` (the timer keeps being re-armed); after the last call wait until idle again.
6. **setFunction and setView.** `dcId.setFunction(z => 1/z)` (guard the exact pole), `render('idle')`: centre pixel (100, 100) is bright, min channel >= 120
   (measured [245, 225, 164]): a pole is white, a zero is black. Then `dcId.setFunction(z => z)`, `dcId.setView({ xRange: [0, 4], yRange: [-2, 2] })`, render
   idle: pixel (5, 100) has max channel < 140 (measured [112, 12, 21]) and pixel (195, 100) has r > 200 and r > g + 60 (measured [238, 100, 100]).
7. **Wheel.** `drawColorWheel(cm-wheel, { size: 96 })`. At device-pixel-ratio 1: `canvas.width === 96`. Pixels (alpha from `getImageData`):
   (0, 0) alpha 0; (48, 48) max channel < 40 (measured [7, 1, 5]); (71, 47) red r > g and r > b ([206, 27, 23]); (47, 24) g > r and g > b ([111, 206, 23]);
   (24, 47) r < g and r < b ([23, 206, 202]); (47, 71) b > r > g ([111, 23, 206]); (93, 47) bright, min channel > 150 ([248, 193, 193]); the canvas has
   `role="img"` and an `aria-label` containing "angle".
8. **Engine numbers in the browser.** Parabola: `pushForward(verticalLine(2), z2)` has 129 points and max `|u - (4 - v²/16)| < 1e-6`. Circle through the pole: `pushForward(circle(1,1,{n:256}), inv)` has 2 pieces, 254 points, max
   `|Re - 0.5| < 1e-6`, `pointOnPieces(.25)` = 0.5 - 0.5i, `pointOnPieces(.5)` = null. Unit circle under `1/z`: `classify(piece).orientation === -1`.
   Seam: `pushForward(rect(-1-0.8i, 1+0.8i), principal sqrt)` has exactly 2 pieces, both `closed === false`, longest step under 0.2;
   `pushForward(verticalLine(-1, {yRange: [-2, 2]}), principal sqrt)` has 2 pieces.
9. **Proof sheet.** Draw on `cm-curves` (scale 10 px/unit, origin at pixel (140, 170): `px = 140 + 10x`, `py = 170 - 10y`; axes in `--text-muted`):
   the input line x = 2 (`verticalLine(2)`) and its image (`pushForward` under z²) as polylines; `--input` and `--output` read with `getComputedStyle`
   (fallbacks `#2563eb` and `#d97706`); segment alpha = 0.25 + 0.75 t stands in for the plane's lightness ramp; dots at t = 0, 1/4, 1/2, 3/4, 1 on both
   curves; mark the focus at the origin and the pair z = 2 + i (t = 0.625) and w = 3 + 4i (its label sits to the right of the dot, clear of the image curve).
   On `cm-seam` (scale 68 px/unit, origin at (100, 100)): the input rectangle `-1-0.8i` to `1+0.8i` in `--input` and its two image pieces under the principal sqrt in
   `--output`, the four piece ends ringed. Then `await ctx.shot('proof-sheet')`.
10. **Destroy.** `dcId.destroy()`: `info().destroyed === true`, `info().pending === false`; `dcId.render()` returns false and does not throw; a second `destroy()` does not throw.
    On a fresh DC: `render('drag')` then `destroy()` at once; `waitForTimeout(400)`; the canvas shows no console error (harness) and `info().pending === false`.
11. **Clean up.** (Runs in the `finally` block, so also after a failed assertion.) Remove `#cm-fixture`, restore the router's children, `delete window.__cm`.

**What passing looks like.** The harness prints `ok   nosuchplace (desktop)`, `(phone)` and `(desktop-dark)`, no `console.error`, no page error, no horizontal overflow; screenshots
`docs/review/shots/nosuchplace--<view>--proof-sheet.png` show (reviewer checks): the wheel with red on the right, yellow-green on top, cyan on the left,
violet below and a dark centre brightening to white; the identity colouring with the colours wrapping once around a black centre and **no radial seam**; the sqrt
colouring with the same colours wrapping once over half the circle and a **sharp colour edge along the negative real axis**; the parabola and its input line with matching
ramps dark at the bottom (t = 0) and bright at the top (t = 1), the dots at the same t on both, the vertex at u = 4 and the focus at the origin;
the `w = 3 + 4i` label clear of the curve; the seam figure with the rectangle's image in two pieces (rings at the cut: near +i and -i) and no line across the gap.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

* Shapes: zero-length or one-point curves, negative radii, reversed ranges, `n` of 0 or NaN, sector with `theta1 <= theta0` or a span over 2π, annulus with `r0 > r1`, polygon with a
  duplicated closing vertex, freehand of 0 or 1 samples, non-finite samples: all handled as written in 4.1 and 5.1; none throw.
* Curves with non-monotone `t` are out of contract (builders never produce them); `pushForward` does not sort.
* `pushForward`: poles on a sample (NaN or Infinity), between samples (refinement then clamp, then the leap rule), at the start or end of a closed curve (one piece, `closed`
  false), curve entirely outside the clamp (`[]`), `f` that throws, a stroke of 1 or 2 points (densified to 16 segments), huge curves (stop at `maxPoints`).
* `morph` at s = 0 never evaluates f; at s = 1 equals `pushForward`; between, the blend is cut where it is not finite or exceeds the clamp, at pole leaps and at teleports (X2).
* Branch cuts: a stroke that crosses the negative real axis under a principal root (`sqrt`, `z^(1/3)`, `z^(2/3)`, all angles of crossing), a rectangle or circle around 0
  under `sqrt`: the image has 2 pieces, `closed: false`, no chord across the jump; the cursor has no position in the gap (`pointOnPieces` null) like at a pole.
* Missing arguments: see 2.5; only `createDomainColoring(null)` and `drawColorWheel(null)` throw.
* `domaincolor`: w = 0 is black, non-finite grey, huge modulus white, canvas 0 x 0 skipped, f throwing at some pixels grey at those pixels, `setView` reversed ranges sorted,
  `destroy` during a refine, `render` after `destroy`, `document.hidden` during a refine (synchronous fallback).
* Chord midpoints are on the polyline, not on a smooth curve: an input circle of n points gives refined image points off the true image by at most about 1e-3 at n = 128 under z³
  (measured 9.0e-4); acceptable for drawing, and tests do not depend on it. Near a pole the effect is larger for coarse input: `circle(1, 1, {n})` under `1/z` with n = 17, 31, 33
  or 63 has image points 0.13 to 0.17 off the line Re w = 1/2 (a kink at the line's ends); n = 128 and 256 give 0, and `circle(1.05, 1)` about 1% of the image radius.
  Hosts use the builders' default n (128) or more for a circle near a pole.
* `colorXY` with |w| above about 1.3e154: the squared modulus overflows, so the module uses `Math.hypot` there; the result is white with rings off and the ring-tinted near white with rings on, never NaN.

### 8.2 Performance plan

> Superseded in residue cleanup: re-measured in the residue cleanup (Node 22.22, median of 20 warm runs, p90 in brackets): `classify` of a simple 5000-point circle 2.1 ms (4.3), first call 13 ms; `pushForward` of a 5000-point stroke 6.5 ms (11.6) under z³ and 4.1 ms (6.9) under 1/z; `pushForwardAll(cartGrid + polarGrid)`, 34 curves, **5.4 ms (6.1), above the 3 ms budget in the table** (a third of a 16.7 ms frame; the stations that carry both grids measured 2 to 3 ms of draw time at s = 0.5); `morph` of a 5000-point stroke 2.7 ms (3.0), well under the 11 ms in the table. Nothing depends on the figures; the budget of the grid row is 6 ms.

| Operation | Budget | Measured / basis |
|---|---|---|
| Build any default shape or grid | under 1 ms | arrays of a few hundred points |
| `classify` | simple curves of 5000 points: about 2 ms warm, about 10 ms the first call (JIT); worst case about 20 to 35 ms | measured in Node: simple 5000-point circle 1.5 to 2.2 ms (first call 10 ms), 5001-point rectangle 1.3 ms, 5000-point spiral 2.1 ms, non-simple curves exit early (0.5 ms). The all-pairs test is O(edges²), so above 1000 segments it runs on a decimated copy (cap 1000, was 3000); a four-comparison bounding-box reject (arrays built once) throws out almost every pair. The worst case is a contrived simple curve whose edge boxes all overlap (5000 parallel diagonals): 19 ms warm, 35 ms first call. Before the fix round a simple 5000-point circle took 124 ms (rectangle 80, spiral 90); the earlier "7 ms" was true only for non-simple curves. Hosts classify on pointerup, not on every pointermove |
| `pushForward` of one 5000-point stroke | under 20 ms | measured 8 to 16 ms in Node for z³ and 1/z |
| `pushForwardAll(cartGrid + polarGrid)` | under 3 ms | measured 2.5 ms per 34-curve set |
| `morph` per frame | same as `pushForward`, no caches | 11 ms for a 5000-point stroke; hosts coalesce to one call per animation frame |
| Domain colouring, drag | at most 1.2e5 offscreen pixels, about 15 to 25 ms | `colorXY` inner loop is about 145 ns per pixel with a simple f (measured), so 30 fps on a mid laptop |
| Domain colouring, idle refine | at most 1.5e6 offscreen pixels (about 0.25 s of work) in 8 ms bands per frame | never blocks input |
| Memory | one offscreen canvas and one `ImageData` (up to 6 MB), reused | freed in `destroy()` |

Resolution management: host keeps the DC canvas at CSS size and device-pixel-ratio 1; the DC picks the offscreen size from `quality` and `maxPixels`; `drawImage` scales with
smoothing when upscaling. Resizing is the host's job: set `canvas.width/height`, then `render('drag')`. Hosts size `clampRadius` to the w-plane view (4.2).
No busy loops; the only frame loop is the idle refine and it stops itself.

### 8.3 Accessibility

* The canvases are not accessible content. The wheel and the DC canvas get `role="img"` with the labels of 2.6 unless the host opted out with its own `aria-label` or `aria-hidden`.
* Every number a student needs is also in the host's readout text (explainers and readouts are the hosts' job); the engines supply `label` strings for shapes.
* Colour is never the only cue: brightness rings and the zero/pole convention are in the copy; hue is redundant with the readout of Arg.
* Hue plus lightness is distinguishable for common colour-vision differences because lightness also varies with |w|; the legend states both channels in words.
* The `<details>` legend and any host buttons keep native keyboard behaviour and visible focus (host's CSS).

### 8.4 Reduced motion

No animation is autonomous. The idle refine swaps one frame in place with no fade, so it is not motion. `morph` is a pure function of s; whether s animates is the host's decision
and the host must honour `prefers-reduced-motion` (stepper instead of autoplay).

### 8.5 Phone layout

The modules have no layout. For hosts: DC canvas width 100% of the container, height from the plane's aspect, backing size at CSS pixels; wheel 80 px on screens under 560 px
(96 px otherwise); legend below the planes; no horizontal overflow at 390 px. The proof sheet wraps its four figures with `flex-wrap` and `max-width: 100%` and is checked at 390 px.

---

## 9. Out of scope

The Lab UI and tools; plane drawing; three.js surfaces and the Riemann sphere; the function parser; KaTeX; explainers; per-station control ids; videos and narration; any persistence
(localStorage) of shapes; sharing a morph cache between frames (an optional later optimisation: precompute the s = 1 sample set once and interpolate for sliders); Riemann-surface or
branch-cut-aware colouring (the sqrt seam shown in the proof sheet is just the function's own jump).

### Requests for other owners (not done here; for the orchestrator)

0. (fix round 1) `package.json` (no goal owns it): change the `test` script to `node --test "tests/unit/*.test.mjs"`; `node --test tests/unit/` exits 1 on Node 22
   before running any test. `docs/CONSTRAINTS.md` ("npm test - runs `node --test tests/unit/`") should say the same.
   `docs/ARCHITECTURE.md` 3.10, replace the `maxJump` comment by: `maxJump = 3 /* a step is a candidate when |Δw|/|Δz| > maxJump · median; it is cut when the path
   reverses (turn > π/2) at both ends (pole leap), or when its stretch is > maxJump² · the stretch of every neighbouring step (teleport: a branch jump of a principal root,
   which does not reverse) */`. And add under 3.10: `A loop around 0 under a principal root comes back as 2 open pieces; pointOnPieces is null in the gap.`
   `docs/ARCHITECTURE.md` 3.9, `classify`: `orientation: sign of the signed area for a simple closed curve; 0 for open curves and for every curve that crosses itself`.
   `docs/ARCHITECTURE.md` 3.10, `morph`: `morph(c, 0, f)` keeps the piece id `<id>~0`. 3.11: `colorOf` never returns NaN (a huge modulus is white or ring-tinted).

1. `i1-core-plane` (plane.js): when `options.background` is `'transparent'`, clear instead of filling, so the plane can sit over a domain-colouring canvas; accept curves that carry
   `closed` and ignore unknown properties (`family`, `source`, `label`, `kind`).
2. `i1-core-math` / ARCHITECTURE owner: record X1 to X10 of section 1.4 in ARCHITECTURE 3.9 to 3.11, and the host rule for `clampRadius` (4.2).
3. Lab and mapping-station designers: use `pointOnPieces` for the w-plane cursor (it is `null` in a pole gap and in a seam gap), `curve.family` for grid colours, `rangesFromView(plane.getView(), w, h)` for the DC ranges,
   and `dc.render('drag')` for every drag, slider and first paint.

---

## 10. Builder notes (as built, iteration 1)

Everything above was built as written. The expected values of sections 6 and 7 were reproduced exactly by
the real modules (254 of 257 points, 257 points for the refined z^3 circle, 89 points under the default clamp,
colour table of 6.10, seam sum 394 in Node and 409 in the browser, browser pixels [48, 5, 37], [233, 55, 56], ...).
Small differences, each backwards compatible:

| # | What | Why |
|---|---|---|
| B1 | `createDomainColoring` snapshots `{fn, view, rings}` when a refine starts, and `startRefine` does nothing when there is no function | a `setFunction` or `setView` call in the middle of a time-sliced refine can no longer mix two frames into one |
| B2 | `render('drag')` sets `canvas.dataset.dcPending = "1"` when it arms the 120 ms timer (5.3 set it only at `startRefine`) | `dataset.dcPending` and `info().pending` now agree for the whole wait, as 2.5 says |
| B3 | `reverse` deletes `reversed` when it toggles back to false instead of storing `false` | `reverse(reverse(c))` is deep-equal to `c` |
| B4 | `classify` computes orientation from the signed area for every closed curve, as in 5.1 (a self-crossing curve whose lobes do not cancel reports +1 or -1; hosts that want "positive orientation" must also check `simple`) | followed the design literally; the figure-eight and bow-tie of 6.9 do report 0. **Superseded in fix round 1 (F6, X11): orientation is now 0 for every curve that is not simple, so hosts need no extra check** |
| B5 | The interaction script mounts `#cm-fixture` inside `#view` (the router's own children are hidden for the length of the script and restored at the end) and asserts no horizontal overflow with the fixture present | a body-level sheet lands under the shell's fixed sidebar on desktop; the harness measures overflow only before the script runs |
| B6 | The unit file also tests the DC with a stub canvas and a stub `document` (idle size, drag size 60 x 60, 120 ms refine, re-arming, pixel cap, hidden tab, destroy, wheel pixels) | A4 is verifiable in Node, not only in the browser |

### Fix round 1 (review A and goal review)

Ten findings. Items 1 to 10 of the reviewer's list, in order:

| # | Finding | What was done |
|---|---|---|
| F1 | major: a branch jump is cut inconsistently (principal sqrt gave one piece with a 2.00 chord; z^(1/3) 2 pieces; z^(2/3) never; rectangle around 0 `closed: true` with a false chord; 18 angled strokes 1 piece with a 2.83 chord) | `mapping.js run()`: rule (b), teleport (X2, 5.2 step 7): a candidate step is also cut when its stretch exceeds `maxJump²` times the stretch of every neighbouring step. Factor `maxJump` (3) would falsely cut M4's `segment(-1, 1, {n: 3})` (ratio exactly 3), so it is `maxJump²`. Verified on the real code: every case above is now 2 pieces with no chord (longest step 0.01 to 0.06); 3200 random smooth strokes under 8 maps give identical piece counts with and without rule (b). Tests M17, M18, M19; the interaction script now draws the seam and asserts it |
| F2 | `npm test` fails on Node 22 | not this goal's file: request 0 in section 9. The glob form passes |
| F3 | `dcPending` stuck at '1' when the refine finds nothing to do | `startRefine` calls `finish()` on both early returns. Test "A4 the pending flag clears when the refine has nothing to do" |
| F4 | `colorXY(1e155, 0)` and `colorXY(1e200, 1e200)` returned NaN with rings on | `Math.hypot` when `x*x + y*y` is not finite; ring factor skipped when `log2(m)` is not finite. D9 |
| F5 | simple 5000-point curves took 80 to 124 ms, not 7 ms | the all-pairs test now rejects by bounding box before the call (2 ms warm for a simple 5000-point circle) and the decimation cap is 1000 edges. The figures in 8.2 are corrected; hosts classify on pointerup. S18 |
| F6 | orientation of a self-crossing curve was a meaningless +1 or -1 | `classify` returns 0 unless the curve is closed and simple (X11, 4.1, 5.1, 6.9). B4 is superseded. S16 |
| F7 | `reverse(null)`, `resample(null, 5)`, `morph(null, 0, f)`, `cartGrid(null)`, `polarGrid(null)`, `rangesFromView(undefined)` threw | guarded everywhere: every builder takes `null` options, a missing curve is an empty curve, `colorXY` accepts a bad `out`, `rangesFromView` falls back to x from -4 to 4, `resample` of an empty curve is empty (it used to be NaN points), `points` that is not an array reads as none. `drawColorWheel(null)` now throws an explicit `TypeError`, like `createDomainColoring(null)`; the sentence in 2.5 names both. D10, D11, S17 |
| F8 | `morph(c, 0, f)` kept the input id, every other s gave `id~0` | the s = 0 copy gets `id = <id>~0` too (X12). M11b |
| F9 | chord-midpoint wobble near a pole for coarse circles | recorded in 4.2 and 8.1 (informational; hosts use n >= 128) |
| F10 | nits | interaction script: body in `try { } finally { restore }`; polygon label `1 vertex`; sector `n` minimum 1 as in 4.1 (it was 2); the `w = 3 + 4i` proof-sheet label moved right of the dot (the figure is 260 px wide). S17 |

Not changed: nothing was declined. `package.json` and ARCHITECTURE.md are not owned by this goal; the exact edits are in "Requests for other owners".
