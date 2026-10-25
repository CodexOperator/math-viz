# PLAYGROUND_SPEC: the assembler as an MX grammar (pg/1)

From Matrix Master to Visualizer Assistant and the playground builder, 2026-10-23. Status: decided. Nothing in this file
is a choice left open. The code is real and tested. The Python twins are MX cells in `/workspace/matrix/library`; the JS
twin and its vectors are in `/workspace/matrix/tools/playground/` (copies sit beside this file).

## 0. Decisions in one screen
1. **The assembler is a 6-axis product grammar.** The axes are `map x view x colour x gesture x reveal x path`, giving 4500 raw combinations.
   Ten named rules (R1 to R10) cut that to **750 valid compositions**. Every rule has a one-line "why" that the UI can show.
2. **The picker is a pure function**: `pick(state, seed) -> composition`. It has no randomness, no clock and no model. It
   enumerates the valid set for the learner's level, scores each composition for "exactly one new thing", and breaks
   ties with FNV-1a of `seed|key`. The same state and seed always give the same composition, in Python and JS alike (72/72 vectors).
3. **There is no in-browser LLM in v1.** If a tiny model is ever added, it may only emit JSON that matches the pg/1 schema (§4).
   Its output goes through `check()` (§5.4); a refusal falls back to `pick()`. The model can never produce something that doesn't work.
4. **Six levels, unlocked by touch signals, never by time alone** (except the first 20 s of dwell). Each level adds two to six parts.
   The picker introduces one new part per composition.
5. **The orbit runs until it decides** (math-viz PR #10 semantics). It **Leaves** (escape, or off the window), **Settles** (the
   smallest period p <= 32 whose K newest points per residue sit in a disk of radius R that has stopped moving), or **Stays**
   (cap). R is 4 screen px of the drawing plane by default. That cell is the assembler `settle()` and the vectors.
   The station walker in `js/core/orbit-settle.js` adds one lookahead the cell does not: a real climb toward 1/2, the
   orbit just outside the cusp, looks ahead `CUSP_EXTRA` (40000) steps. If that look escapes, the sentence is Leaves.
   `c = 1/4 + 1e-8` leaves on step 31414. If the look runs out and the start is real under `z² + c` for a real `c` greater
   than 1/4, Exercise 8 already says that `c` is not in the set. The start does not have to be 0: for every real x,
   f(x) − x is at least c − 1/4. The sentence is still Leaves (`reason: cusp`), the same
   opening as the seeds chip for `c = 1/2`, and the closed disk is not Settles. `c = 1/4` itself is the parabolic point.
   The station walker names it parabolic: fixed point 1/2, multiplier 1, the orbit approaches and does not leave.
   A closed disk there is the iteration limit, not an attracting cycle, so the sentence is not Settles, and a watch
   that stops early is not Leaves. The assembler cell still returns Settles for that point, so its vectors hold.
   The basilica is not this climb, so it still settles at the first disk. The lookahead is not extended
   past 40000: a closer `c` would always outlast a longer watch.
6. **Path functions are expressions.** Presets are editable expressions in `t`. Any free name in a typed `c(t)` becomes a
   slider. One parser serves presets and typed input (`study/c-path`, `cPath()`).
7. **Fallback is automatic and silent.** Without WebXR you get the 2D starry void with drag-rotate. The GPU tier gates
   `height` and `split-*`. A frame-time governor lowers `px_scale` before `max_iter` and never swaps the composition.

## 1. The cells (axes) and their ports
Every axis value is a typed cell. The composition wires one cell from each axis:
`path -> map.c|z0`, `map -> field -> colour -> view -> screen`, `gesture -> map|view|path`, `reveal` overlays the result.

| axis | values (level unlocked) | port it fills | type it produces / needs |
|---|---|---|---|
| **map** `z -> f(z)` | `julia` z^2+c (L0) · `mandel` parameter plane, z0=0, pixel=c (L2) · `poly` z^d+c, d in {3,4,5} (L3) · `newton` z - p/p', p=(z-1)(z^2+z+c) (L4) | `map.kind`, `map.c`, `map.d` | produces `field.escape` (julia, poly, mandel) or `field.root` (newton) |
| **view** | `plane` (L0) · `split-param`: left Julia, right its parameter plane with a live c marker (L2) · `sphere`: Riemann sphere (L4) · `split-sphere`: left plane, right sphere (L4) · `height`: 3D height field of the smooth potential (L5) | `view.kind`, `view.window {cx, cy, span}` | needs a field; `height` needs a continuous one |
| **colour** | `smooth` normalised iteration count (L0) · `escape` integer bands (L1) · `trap` distance to a point-or-cross orbit trap (L3) · `basin` which root plus convergence shade (L4) · `curvature` mean curvature of the potential surface (L5) | `colour` | escape/smooth/curvature need `field.escape`; basin needs `field.root`; trap takes either |
| **gesture** | `nudge`: step-sized +/- for zoom, c and z0 (L0) · `drag-c`: touch-drag moves c (L1) · `scrub`: drag along the path's t (L2) · `pinch-zoom`: deep zoom, constant rate (L3) · `ar-place`: place the object in the room (L5, needs WebXR) | `gesture` | drives `map.c`, `view.window` or `path.t` |
| **reveal** | `roll`: the diary roll-in (L0) · `trace`: the orbit of the touched point (L1) · `verdict`: orbit-until-it-decides with Leaves, Settles or Stays readout (L2) | `reveal` | trace and verdict need a point (tap, or z0 path) |
| **path** | `none` (L0) · `c`: c moves along c(t) (L2) · `z0`: the probe point moves along z0(t) (L5) | `path {of, preset, period_s}` | `study.path` (samples plus sliders) |

Presets (with the levels that unlock them): `circle`, `cardioid`, `bulb2` (L2); `segment`, `figure8` (L3); `expr` typed (L5).

| preset | expression in t in [0,1) | sliders (value, min, max) |
|---|---|---|
| circle | `x + i*y + r*cis(2*pi*t)` | x (0,-2,2) y (0,-2,2) r (0.7885,0,2) |
| cardioid | `s*(cis(2*pi*t)/2 - cis(4*pi*t)/4)` (s=1 is the main cardioid's edge) | s (0.98,0.5,1.2) |
| bulb2 | `-1 + r*cis(2*pi*t)` (r=0.25 is the period-2 bulb's edge) | r (0.24,0,0.5) |
| segment | `x0 + i*y0 + (x1 - x0 + i*(y1 - y0))*(1 - cos(2*pi*t))/2` (ping-pong) | x0 -0.75, y0 0.1, x1 -0.75, y1 0.6 (each -2..2) |
| figure8 | `x + r*sin(2*pi*t) + i*(y + r*sin(4*pi*t)/2)` | x (-0.5,-2,2) y (0,-2,2) r (0.6,0,2) |

**Typed c(t) grammar** (the same for presets and typed input):
```
expr  := term (('+'|'-') term)*          term := unary (('*'|'/') unary)*
unary := ('-'|'+') unary | atom ('^' unary)?          (right-assoc power; integer |n|<=16 by repeated product)
atom  := number | 't' | 'i' | 'pi' | 'e' | name | fn '(' expr ')' | '(' expr ')'
fn    := sin | cos | exp | cis | conj | abs | re | im              (cis(x) = e^{ix})
name  := [a-z][a-z0-9_]{0,7}  -> a free variable = one slider, default {value 0.5, min -2, max 2, step 0.01}
```
Limits: 120 characters, at most 6 free variables, explicit `*` (`2t` is refused with "multiply with *: 2*t"), and a non-finite
sample is refused. Sliders appear in first-use order. A preset's slider ranges widen to include a typed value.

## 2. Legal compositions: rules R1 to R10
A composition is legal when no rule fires. Caps (`xr`, `webgl2`, `gpu`) come from the learner state.

| rule | fires when | why (shown to the learner when a proposal is refused) |
|---|---|---|
| R1 | colour=basin and map!=newton, or map=newton and colour not in {basin, trap} | basin is Newton-only, and Newton takes only basin or trap (nothing escapes) |
| R2 | view=height and colour not in {smooth, curvature, trap} | height needs a continuous field (escape counts make stairs) |
| R3 | view=split-param and map not in {julia, poly} | the parameter pane pairs a Julia set with its c (not mandel or newton) |
| R4 | gesture=drag-c and map=mandel | in the Mandelbrot plane every pixel is a c |
| R5 | gesture=pinch-zoom and view in {sphere, height} | sphere and height have no window to zoom |
| R6 | (gesture=scrub) xor (path!=none) | scrub needs a path, and a path is driven by scrub |
| R7 | path=c and map=mandel | a c-path needs a map with one c |
| R8 | path=z0 and reveal=roll | z0 only matters for one orbit: trace or verdict |
| R9 | gesture=ar-place and (view not in {sphere, height} or not caps.xr) | AR places a 3D sphere/height and needs WebXR |
| R10 | view=height and (not webgl2 or gpu<1), or view=split-* and gpu<1 | GPU budget: height needs WebGL2 and gpu>=1; split needs gpu>=1 |

Raw combinations rejected by each rule (with full caps; a combination can break several): R1 1350, R2 360, R3 450, R4 225,
R5 360, R6 2700, R7 375, R8 500, R9 540, R10 0 (R10 bites only on weak devices). Valid compositions per level are 1, 8, 42, 162, 381 and 750.

**Compatibility matrices.** The pairwise tables below give the number of valid full compositions containing each pair. ✗ R*n* means that rule always
rejects the pair; "(combined)" means no single rule does, but every completion breaks one (e.g. split-param needs
julia/poly while basin needs newton). These tables are generated from the code (§7.3), not hand-written.
| map \ view | plane | split-param | sphere | split-sphere | height |
|---|---|---|---|---|---|
| **julia** | 56 | 56 | 56 | 56 | 42 |
| **poly** | 56 | 56 | 56 | 56 | 42 |
| **mandel** | 32 | ✗ R3 | 32 | 32 | 24 |
| **newton** | 28 | ✗ R3 | 28 | 28 | 14 |

| map \ colour | smooth | escape | trap | basin | curvature |
|---|---|---|---|---|---|
| **julia** | 70 | 56 | 70 | ✗ R1 | 70 |
| **poly** | 70 | 56 | 70 | ✗ R1 | 70 |
| **mandel** | 32 | 24 | 32 | ✗ R1 | 32 |
| **newton** | ✗ R1 | ✗ R1 | 56 | 42 | ✗ R1 |

| view \ colour | smooth | escape | trap | basin | curvature |
|---|---|---|---|---|---|
| **plane** | 36 | 36 | 50 | 14 | 36 |
| **split-param** | 28 | 28 | 28 | ✗ (combined) | 28 |
| **sphere** | 36 | 36 | 50 | 14 | 36 |
| **split-sphere** | 36 | 36 | 50 | 14 | 36 |
| **height** | 36 | ✗ R2 | 50 | ✗ R2 | 36 |

| gesture \ view | plane | split-param | sphere | split-sphere | height |
|---|---|---|---|---|---|
| **nudge** | 42 | 24 | 42 | 42 | 30 |
| **drag-c** | 30 | 24 | 30 | 30 | 21 |
| **scrub** | 58 | 40 | 58 | 58 | 41 |
| **pinch-zoom** | 42 | 24 | ✗ R5 | 42 | ✗ R5 |
| **ar-place** | ✗ R9 | ✗ R9 | 42 | ✗ R9 | 30 |

| gesture \ map | julia | poly | mandel | newton |
|---|---|---|---|---|
| **nudge** | 57 | 57 | 45 | 21 |
| **drag-c** | 57 | 57 | ✗ R4 | 21 |
| **scrub** | 95 | 95 | 30 | 35 |
| **pinch-zoom** | 36 | 36 | 24 | 12 |
| **ar-place** | 21 | 21 | 21 | 9 |

| path \ map | julia | poly | mandel | newton |
|---|---|---|---|---|
| **none** | 171 | 171 | 90 | 63 |
| **c** | 57 | 57 | ✗ R7 | 21 |
| **z0** | 38 | 38 | 30 | 14 |

| path \ reveal | roll | trace | verdict |
|---|---|---|---|
| **none** | 165 | 165 | 165 |
| **c** | 45 | 45 | 45 |
| **z0** | ✗ R8 | 60 | 60 |

Why these rules and not others (opinions, so the builder doesn't relitigate):
- **Newton and trap are allowed.** Trap colouring of Newton orbits is one of the prettiest easy wins. Newton with smooth or escape is
  refused because, under Newton, nothing escapes; a "smooth" Newton picture would just be a slow-convergence shade, and that is basin's job.
- **`mandel` with `sphere` and `height` is allowed.** The parameter sphere and the potential mountain of M are both honest
  pictures; `mandel` is excluded only where a single c is required (R4, R7, R3).
- **pinch-zoom is plane-only** (split panes zoom their plane pane). On the sphere and the height field, pinch means orbit the camera,
  and that is built into the view, not a gesture cell.
- **A path implies scrub (R6)**. The loop also plays by itself at `period_s`. Scrub is the gesture that makes t touchable,
  so the learner always has the knob that matches what moves.

## 3. Rendering semantics per cell (what the builder implements)
- **Field.** For julia/poly/mandel: iterate to `budget.max_iter`, bail at |z|>R_b with R_b=2 for escape colouring and R_b=256 for
  smooth, curvature and height (smooth needs a big bailout). Smooth value `nu = n + 1 - log(log|z_n|)/log(d)`. Potential
  `G = log|z_n| / d^n`. For newton: iterate until |z - root| < 1e-6 (max `budget.max_iter`); output (root index, n).
- **Colours.** `escape`: band = n mod 16 into a 16-step palette. `smooth`: palette(nu/32). `trap`: min over the orbit of
  min(|z - 0|, |Re z|, |Im z|), shaded exp(-8d). `basin`: hue by root index (3 roots, 120 deg apart), value 1 - n/40.
  `curvature`: mean curvature of the surface h=G computed by finite differences on the pixel grid, signed and diverging
  palette (blue concave, orange convex), clamped at the 95th percentile.
- **sphere.** Inverse stereographic projection with the north pole = infinity. **Infinity is mapped to 0**: the sphere starts
  oriented so that infinity faces the camera, which puts it at the screen centre, so the basin of infinity is the cap you see
  first. Drag rotates; double-tap toggles to the z=0 pole. Shade with the same colour cell per texel (sample z on a lat/long grid of
  512x256 at gpu 2, 256x128 at gpu 1).
- **height.** A 256x256 grid (128x128 at gpu 1), z = min(G, 2) * 0.6, normal-lit, with the colour cell as albedo.
- **split-param.** Left: Julia at c. Right: the Mandelbrot plane (multibrot for poly d) with a ring at c; dragging the ring is
  drag-c. **split-sphere**: left plane, right sphere, with a shared colour cell and window marker.
- **Deep zoom (pinch-zoom).** The zoom rate is constant at 2^(1/2) per second while pinched (span halves every 2 s), centred on
  the pinch midpoint; release stops it. Nudge zoom = one step of 2^(1/4). float32 GPU shaders down to span 2e-5; below that,
  switch to a float64 CPU worker in 64x64 tiles at px_scale 0.5; hard floor at span 1e-12 with "deep as it goes".
  `max_iter` grows with depth: `budget.max_iter + 64*log2(3.2/span)`, capped at 4096.
- **Nudge sizes.** Zoom is x2^(+-1/4). For c and z0, the step is span/64 along re or im (four buttons, or arrow keys). The path's t step is 1/64.
- **reveal `roll` (the Riddle's diary roll-in).** The shape writes itself onto the void. Over 2.4 s, pixels appear in order of
  their escape time n (low n first, ink bleeding outward), via a uniform `u_reveal in [0,1]` with alpha =
  smoothstep(u - 0.08, u, n/maxN). Then a 0.6 s ink-settle (blur 2 px to 0). On every new composition the old one
  "sinks" (alpha to 0 over 0.8 s, scale 0.97) before the new one rolls in, which is the diary's "answer appears" beat.
- **reveal `trace`.** On tap, draw the orbit polyline (first 256 points) with fading dots. It uses `settle()` with `keep=256`.
- **reveal `verdict`.** On tap (or each path sample), run `settle()` and show the site's sentence: `Leaves. ...`,
  `Settles. Period p. ...` or `Stays. ...` (math-viz `orbitSentence()`). Along a c-path, the verdicts become a colour strip under the scrub bar (`study/orbit-settle` with a
  path gives exactly these rows).

**Orbit until it decides** (= math-viz `js/core/orbit-settle.js` `orbitUntil`, merged in PR #10 at b500525; the MX cell and
`playground.js` agree with it on every z^2+c vector). `settle(spec)` walks z_0, z_1, ... and after each new point z_n checks:
(a) z_n not finite, or `escape_r != null and |z_n|^2 > escape_r^2` -> **Leaves** (`reason: escape`);
(b) z_n outside the window by more than 5% (`|re - centre.re| > 1.05 * units_across/2`, same for im with the aspect) -> **Leaves**
    (`reason: screen`);
(c) if R is set and there are at least K points: for p = 1..min(32, floor(points/K)), the FIRST p with |z_n - z_(n-p)| <= R is
    tested, and only that p (no larger p is tried on this step). It **Settles** (`reason: cluster`, period p) when, for every
    residue r < p, the K newest points of that residue lie within R of their mean (one disk per residue: a fixed point is 1
    disk, a p-cycle is p disks), AND that mean has moved at most R/16 (a quarter of a screen pixel) from the mean of the K
    points of the same residue before them. That needs 2pK points. A crawl that is still walking has not landed;
(d) after `max_points` steps -> **Stays** (`reason: cap`), with `period` = the smallest p <= 32 whose return is within R (or null).
A separated 2-cycle (c = -1: 0 <-> -1) **Settles with period 2**, two disks. If both points fit in one disk (R >= 1 there), p = 1
closes first and it reads period 1; zooming shrinks R and splits it. When places of a p > 1 cycle are closer than 3R the row
has `overlap: true` (the site's "Zoom to the clusters").
Defaults: `K 5` (an integer in 2..64; out of range is rejected in MX, exit 2, and throws in `playground.js`; the site's input
box writes it back into range), `escape_r 2` (null for newton), `max_points max(800, 32*K)`, window `{center [0,0],
units_across 4, width_px 640, height_px = width_px}` (the site's plane: 4 units on its 640 px max width).
**R** is world units. Left out, it is 4 px of the window: `R = 4 * units_across / width_px` (0.025 at the default window); the app
recomputes it whenever the window changes until the learner types a radius, and a typed radius does not follow zoom
(clearing the box follows the screen again). `R <= 0` or `null`, or `window: null` with R left out, means **no clustering**:
only escape, the screen and the cap end the walk. For mandel the probe point is c and z0 = 0; a z0 path moves the probe point.
**critical_period** is the theorem line, reported on every row beside the verdict and never used for it: the orbit of 0
under z^2+c (julia, mandel, poly d=2; null for newton and d>2), 240 steps, tolerance 1e-3, at most 32; 0 = escaped, null = no
cycle. It can disagree on a slow approach: the bulb2 strip settles as period 2 on screen while the theorem line names 8 or 6.
Reference results (vectors, default window): c=-1 Settles at n=19, period 2 (n=7 at K=2). The rabbit c=-0.123+0.745i Settles at
n=29, period 3. c=-0.75 (parabolic 2-cycle) Settles at n=180, period 2: its disks already fit by n=20, but the centres are
still walking. Mandel c=0.3 Leaves at 12; c=0.4 at 7. Newton from 0.3+0.9i Settles at 16, period 1. c=0.25 Settles at 56,
period 1. R=0 on c=-1: Stays at 800.

## 4. Output schema (pg/1): what pick() emits and what a tiny model may emit
Example (vector `pick[9]`, level 4, seed 7):
```json
{
 "v": "pg/1",
 "key": "julia/sphere/trap/scrub/verdict/c",
 "level": 4,
 "seed": 7,
 "map": {
  "kind": "julia",
  "c": [
   -1,
   0
  ],
  "d": 2
 },
 "view": {
  "kind": "sphere",
  "window": {
   "cx": 0,
   "cy": 0,
   "span": 3.2
  }
 },
 "colour": "trap",
 "gesture": "scrub",
 "reveal": "verdict",
 "path": {
  "of": "c",
  "preset": "segment",
  "period_s": 12
 },
 "settle": {
  "escape_r": 2,
  "K": 5,
  "r_px": 4,
  "max_points": null
 },
 "budget": {
  "px_scale": 1,
  "max_iter": 512,
  "fps_floor": 30,
  "xr": false
 }
}
```
JSON Schema (draft 2020-12). Use it as the constrained-decoding grammar for any model; enums are the whole space.
```json
{"$id": "pg/1", "type": "object", "additionalProperties": false,
 "required": ["v", "key", "level", "seed", "map", "view", "colour", "gesture", "reveal", "path", "settle", "budget"],
 "properties": {
  "v": {"const": "pg/1"}, "key": {"type": "string", "pattern": "^[a-z0-9-]+(/[a-z0-9-]+){5}$"},
  "level": {"type": "integer", "minimum": 0, "maximum": 9}, "seed": {"type": "integer"},
  "map": {"type": "object", "additionalProperties": false, "required": ["kind", "c", "d"], "properties": {
    "kind": {"enum": ["julia", "poly", "mandel", "newton"]},
    "c": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2}, "d": {"enum": [2, 3, 4, 5]}}},
  "view": {"type": "object", "additionalProperties": false, "required": ["kind", "window"], "properties": {
    "kind": {"enum": ["plane", "split-param", "sphere", "split-sphere", "height", "chordal", "split-chordal", "slice", "split-slice", "excess", "bend", "unity", "split-unity"]},
    "theta": {"type": "number", "minimum": 0, "maximum": 1},
    "window": {"type": "object", "required": ["cx", "cy", "span"], "properties": {"cx": {"type": "number"},
      "cy": {"type": "number"}, "span": {"type": "number", "exclusiveMinimum": 0}}}}},
  "colour": {"enum": ["smooth", "escape", "trap", "basin", "curvature"]},
  "gesture": {"enum": ["nudge", "drag-c", "scrub", "pinch-zoom", "ar-place"]},
  "reveal": {"enum": ["roll", "trace", "verdict"]},
  "path": {"oneOf": [{"type": "null"}, {"type": "object", "additionalProperties": false, "required": ["of", "preset", "period_s"],
    "properties": {"of": {"enum": ["c", "z0"]}, "preset": {"enum": ["circle", "cardioid", "bulb2", "segment", "figure8", "expr"]},
      "expr": {"type": "string", "maxLength": 120}, "vars": {"type": "object"}, "period_s": {"type": "number", "minimum": 2}}}]},
  "settle": {"type": "object", "required": ["escape_r", "K", "r_px", "max_points"], "properties": {
    "escape_r": {"type": ["number", "null"]}, "K": {"type": "integer", "minimum": 2, "maximum": 64},
    "r_px": {"const": 4}, "max_points": {"type": ["integer", "null"], "minimum": 1}}},
  "budget": {"type": "object", "required": ["px_scale", "max_iter", "fps_floor", "xr"], "properties": {
    "px_scale": {"enum": [0.5, 0.75, 1]}, "max_iter": {"enum": [128, 256, 512]}, "fps_floor": {"const": 30}, "xr": {"type": "boolean"}}}}}
```
The schema bounds the shape; **R1 to R12 and the level lock are enforced by `check()`**, which runs after any model. A schema-valid
but rule-breaking proposal is refused with the rule ids, and the app calls `pick()` instead. `key` is
`map/view/colour/gesture/reveal/path` with path in `none|c|z0`.

## 5. The picker
### 5.1 Learner state (`study.learner.state`)
```json
{"signals": {"taps": 0, "drags": 0, "pinches": 0, "nudges": 0, "scrubs": 0, "traces": 0, "verdicts": 0,
             "dwell_s": 0, "max_zoom": 1, "sessions": 1},
 "caps": {"xr": false, "webgl2": true, "gpu": 1},
 "history": ["julia/plane/smooth/nudge/roll/none"]}
```
Counters are cumulative across sessions (localStorage `pg.state.v1`). `history` holds composition keys, newest last; keep the last 32.
`max_zoom` = 3.2/span at its deepest. `traces` and `verdicts` count reveals the learner triggered by tapping, not
auto-plays. `gpu` is 0, 1 or 2 from §6.

### 5.2 Levels and unlocks
| level | name | adds | unlock rule (all signals cumulative; `any` = one of them is enough) |
|---|---|---|---|
| 0 | watch | julia, plane, smooth, nudge, roll, path none | start |
| 1 | touch | escape, drag-c, trace | any: taps>=1, dwell_s>=20 |
| 2 | walk | mandel, split-param, scrub, verdict, path c; presets circle, cardioid, bulb2 | all: drags>=3, traces>=1 |
| 3 | dive | poly, trap, pinch-zoom; presets segment, figure8 | all: scrubs>=2, verdicts>=2 |
| 4 | turn | newton, sphere, split-sphere, basin | any: pinches>=3, max_zoom>=1000 |
| 5 | shape | height, curvature, ar-place, path z0, typed expr | all: sessions>=2, history>=12 |
The level is the number of consecutive unlock rules satisfied from L1 upward, so it is monotone and never skips a rule.

### 5.3 Choosing the next composition (pure)
```
L = level(state); U = parts unlocked at L; V = [k in product(AX restricted to U) if no rule fires] (fixed axis order)
seen = parts in history[-32:]; recent = parts in history[-8:]            (a part = "axis:value"; path rides with scrub)
score(k) = (10 if new==1 else 0 if new==0 else -5*(new-1))  + 2*|parts(k) - recent|  - 20*[key(k) in history[-3:]]
           where new = |parts(k) - seen|
pick = argmin over V of (-score, fnv1a32(seed + "|" + key), key)
fill: c = C_LIST[map][fnv1a32(seed|key|c) mod len], d = 3 + fnv(seed|key|d) mod 3 (poly), preset = unlocked presets
      [fnv(seed|key|p) mod len], window = WIN[map], settle defaults, budget from caps.gpu
```
Call it with `seed = fnv1a32(learnerId) + history.length`, so ties rotate turn by turn while a replay with the same
state reproduces exactly. Trigger it when the learner taps "next", after 45 s idle on a composition, and right
after a level unlock. Never call it mid-gesture.
Simulated progression (seed 7, gpu 1, no XR; one more signal threshold met every 2 picks), the first 14 picks in order:
```
 0 L0 julia/plane/smooth/nudge/roll/none          7 L2 julia/split-param/smooth/drag-c/verdict/none
 1 L1 julia/plane/smooth/nudge/trace/none         8 L2 julia/split-param/smooth/scrub/verdict/c
 2 L1 julia/plane/escape/nudge/trace/none         9 L3 julia/split-param/trap/scrub/roll/c
 3 L1 julia/plane/smooth/drag-c/trace/none       10 L3 julia/split-param/trap/pinch-zoom/roll/none
 4 L1 julia/plane/smooth/drag-c/roll/none        11 L4 julia/split-sphere/escape/nudge/trace/none
 5 L2 julia/split-param/smooth/nudge/trace/none  12 L4 julia/sphere/trap/scrub/verdict/c
 6 L2 mandel/plane/escape/nudge/trace/none       13 L5 poly/sphere/smooth/nudge/verdict/none
```
Each pick after the first adds at most one unseen part (a test enforces this).

### 5.4 check(proposal, state)
This returns `[]` (valid) or the reasons: `"<axis>=<v> is locked at level L"`, `"... is not in the grammar"`, or the rule ids.
The MX cell exits 2 with the rule texts. The app then shows the "why" once (it's a teaching moment) and plays `pick()`.

## 6. Performance and fallback
**Capability probe (once per session):** `xr = await navigator.xr?.isSessionSupported("immersive-ar")`. `webgl2 = !!canvas.getContext("webgl2")`.
`gpu` comes from a 300 ms micro-benchmark: render the L0 composition at 512x512 with max_iter 256 and time the median of 5 frames.
That is <8 ms -> 2, <25 ms -> 1, else 0. A missing WebGL means gpu 0 and a CPU worker renderer at 256 px with only plane views
(R10 already removes height and split).
**Budget per tier** (`comp.budget`): px_scale 0.5/0.75/1, max_iter 128/256/512, fps_floor 30.
**Governor:** if two consecutive frames take >33 ms, step px_scale down one notch (1 -> 0.75 -> 0.5), then max_iter x0.75 down to
96, then pause `roll` animation polish (blur). It never swaps the composition or the view. It restores one notch after 3 s
of <20 ms frames.
**Starry void:** a static 2000-star field (seeded by fnv(learnerId)) drawn once to an offscreen canvas, with a 0.02 rad/s
parallax drift on device tilt where available. It is always the background. Without XR, `ar-place` is never picked (R9). The sphere
and height still show in the void with drag-rotate.
**WebXR (gpu 2 and xr):** `immersive-ar` with hit-test. `ar-place` puts the sphere (radius 15 cm) or the height tile (30 cm) on the
first hit. Render at px_scale 0.5 inside XR regardless of tier. Leaving XR returns to the void with the same composition.
**Battery and visibility:** pause the RAF on `visibilitychange`, and cap at 30 fps when `navigator.getBattery` reports <20%.

## 7. How this maps onto MX (study/* and viz/* stay in sync)
### 7.1 Cells (all owned by `visualizer`, ungated, pure, no reads, prov trust 0.8)
| cell | kind | ports | step | exit codes |
|---|---|---|---|---|
| `study/c-path` | action | in `shape: study.path.spec`, `n?: number` -> out `path: study.path` | `library/study/steps/c_path.py` (7 KB) | 0 ok · 2 bad expr (the fix on stderr: "multiply with *: 2*t") · 4 every output a flag (undeclared hand-fed input) |
| `study/orbit-settle` | action | in `orbit: study.orbit.spec`, `path?: study.path` -> out `verdicts: table.verdict` | `library/study/steps/orbit_settle.py` (8 KB) | 0 · 2 (e.g. "mandel has no single c to move") · 4 |
| `viz/playground-pick` | action | in `state: study.learner.state`, `seed?: number`, `propose?: viz.playground.comp` -> out `comp: viz.playground.comp`, `qa: qa.report` | `library/viz/steps/playground_pick.py` (8.1 KB, under the 8 KB cap) | 0 · 2 proposal refused with rule texts, or a missing `signals` key (shape check) · 4 |
| `viz/playground-grammar` | knowledge | out `value: viz.grammar` (axes, levels, unlock, rules with why and reject counts, per-level counts) | body written by `tools/playground_grammar.py --write` | n/a |

Chain proven by `mx hop`: `study/c-path -> study/orbit-settle` (a c-loop to a verdict strip). Its route is recorded as ok.
`mx pick --from study/c-path --to table.verdict` finds it. Shapes for the hand-fed `study.path.spec`, `study.orbit.spec` and
`study.learner.state` are checked before hop 1 (`mx/shapes.py`).

### 7.2 Trust
The math is deterministic, so each cell's own floor is 0.8 (primary, machine-computed). Out trust is the lowest trust consumed: a hand-fed
spec without `#trust=...,src=...` counts as 0 and the run exits 4, so the verdict shows as a flag, as for any undeclared
input. A spec the site generates from its own registry should be fed with `#trust=0.8,src=math-viz registry`. A tiny model's
proposal enters at its declared trust (cap 0.6 without a src) and is never above the picker's 0.8.

### 7.3 One source, three mirrors (the sync rule)
- **Python steps are the source.** `viz/playground-grammar`'s body must equal `tools/playground_grammar.py`'s output, which
  is derived from the step (test `test_grammar_cell_equals_the_step`).
- **`tools/playground/test_vectors.json`** is produced by `tools/playground_vectors.py` from the steps (test checks it's current).
- **`tools/playground/playground.js`** must reproduce every vector (`node check_vectors.mjs`, 72/72; the test runs it). Complex
  mul, div and integer power copy CPython's operation order, so the results match to the bit, not just approximately.
- Any change to rules, levels or presets means: edit the step, run `tools/playground_grammar.py --write` and
  `tools/playground_vectors.py`, mirror the change in `playground.js`, and run the suite. A station or explainer that cites a verdict on the site
  should get it from `study/orbit-settle`, so the film or station text and the live widget agree.

### 7.4 Getting it onto the site
The playground ships as a station through the existing path. The builder makes a PR into gh-pages
(`js/stations/playground.js` plus `js/core/playground.js`, the reference module verbatim) and `study/add-station` stages it,
then `study/ship-pr` (gated) queues it. The Mandelbrot explainer stations should import `settle()` and `cPath()` from the same
module rather than re-implementing them.

## 8. Reference implementation (drop-in)
Files (copies beside this spec; canonical in `/workspace/matrix/tools/playground/`):
- `playground.js`, an ES module of about 12.7 KB (about 4 KB gzipped) with no deps and no DOM. Exports `AX, LEVELS, UNLOCK, RULES, PRESETS, fnv, key,
  level, unlocked, combos, broken, pick, check, parse, ev, cPath, settle`.
- `test_vectors.json`: 7 level, 14 pick, 8 check, 10 path (3 errors), 23 settle (1 error) and 3 path-settle vectors.
- `check_vectors.mjs`: `node check_vectors.mjs` -> `72/72 vectors match`, exit 0.

Usage in the station:
```js
import {pick, check, cPath, settle} from "../core/playground.js";
const st = loadState();                                   // §5.1, from localStorage
const comp = pick(st, fnv(learnerId) + st.history.length);
renderer.show(comp);                                      // §3; roll-in reveal first
st.history.push(comp.key); saveState(st);
// c-on-a-path loop: sliders come from path.vars, live evaluation from path.at(t)
const path = cPath({preset: comp.path?.preset ?? "cardioid"}, 256);
const win = {center: view.center, units_across: view.unitsAcross, width_px: size.w, height_px: size.h};   // R = 4 px of it
const strip = path.samples.map((c) => settle({...comp.settle, map: comp.map.kind, d: comp.map.d, window: win}, c).verdict);
// tap with reveal=verdict
const v = settle({...comp.settle, map: comp.map.kind, c: comp.map.c, d: comp.map.d, window: win, R: typedR}, null, tappedZ, 256);
badge(v.verdict === "Settles" ? `Settles. Period ${v.period}.` : v.verdict === "Leaves" ? `Leaves. Step ${v.n}.` : `Stays. Stopped after ${v.n} steps.`);
```
Selected vectors (input -> expected):
| fn | input | expected |
|---|---|---|
| level | `{signals:{taps:4,drags:3,traces:1}}` | 2 |
| pick | empty state, seed 0 / seed 7 | `julia/plane/smooth/nudge/roll/none`, c [-0.4, 0.6] / [-0.7269, 0.1889] |
| check | mandel + drag-c at level 5 | `["R4"]` |
| check | julia/sphere/smooth/pinch-zoom/roll + path z0 | `["R5","R6","R8"]` |
| check | julia/height at gpu 0 | `["R10"]` |
| cPath | `{expr:"a + r*cis(2*pi*t)", vars:{r:0.3}}`, n=4 | sliders a (0.5), r (0.3); samples [0.8,0],[0.5,0.3],[0.2,0],[0.5,-0.3] |
| cPath | `{expr:"2t"}` | error "multiply with *: 2*t" |
| settle | julia c=[-1,0] (default window, K 5) | Settles, cluster, n 19, period 2 (2 disks), critical 2 |
| settle | julia c=[-1,0], K 2 | Settles, n 7, period 2 |
| settle | julia c=[-1,0], R 1.2 | Settles, period 1 (both points in one disk) |
| settle | julia c=[-1,0], R 0 / null / window null | Stays, cap, n 800, period null |
| settle | julia c=[-0.75,0] | Settles, n 180, period 2 (a slow crawl: no early settle) |
| settle | julia c=[-0.75,0], window 0.4 units | Leaves, screen, n 1 |
| settle | julia c=[-0.123,0.745] | Settles, n 29, period 3 |
| settle | julia c=[-1,0], K 1 | error "K must be an integer in [2, 64]" (cell exit 2, JS throws) |
| settle | mandel c=[0.3,0] | Leaves, escape, n 12, critical 0 |
| settle | newton c=[1,0] z0=[0.3,0.9] | Settles, n 16, period 1, critical null |
| path-settle | julia + bulb2 (r 0.24), n 8 | all Settle, period 2; critical_period 2, 2, 8, 6, 2, 6, 8, 2 (the theorem line disagrees on the slow approach) |

## 9b. Batch 3 (still pg/1, still no model)

These sit on top of §1–§8. L0–L5 and their 750 compositions are unchanged. A seventh level is the only new unlock.

- **Touch flash.** `flashPick(point, level)` is pure. The touch is `c`, clamped to [−1.6, 1.6]. The level chooses the map from the maps unlocked there, by FNV-1a of `level|re|im`. The page rolls that shape in with the diary ink (§3 `roll`), then fades it. The stars are what remains, and the name stays: the map is a link to its station, so the first touch still has a door after the ink is gone. `prefers-reduced-motion` shows the finished shape and fades it without the roll. A trace or a verdict tap still probes. On a chordal picture a tap names the distance instead of flashing, because a flash would cover the sheet. Every other tap, and a WebXR `select`, is this flash. `signals.flashes` counts them.
- **Level 6, metric.** Unlocks when `flashes >= 1` and `history >= 16`, both required, after L5. One flash is enough: the void has answered. Four was a quota, and it made the caption name the distance before the picture existed. History stays 16 so the shape chapter, escape as height, is on screen before this view. It adds views `chordal` and `split-chordal`. The sheet is the extended plane. Inside the inscribed circle, height is the distance on the book's sphere of diameter 1, `|z−c| / (√(1+|z|²) √(1+|c|²))`, coloured by the same field as the plane. The orange corners are the point at infinity: one point, and the height there is finite. That colour is not shaded, so it is the same ink as the corners of the plane. That is the north pole, the same point 1/z sends 0 to. The page does not print a letter for the distance. The book never writes one. The plane beside the sheet uses the same chart, so a tap is the same point. Pinch scales the finite part. The corners stay. R5 also refuses pinch-zoom on `chordal`. R9 allows `ar-place` on `chordal` when `caps.xr`. R10 treats `chordal` like `height` (WebGL2 and gpu ≥ 1). No exercise in Howell & Mathews numbers this distance. The page cites §2.5, Figure 2.5.2 [PDF Figure 2.22, page 73], Exercise 14 for the coordinates only, and says the exercise for the distance is missing.
- **Cusp.** `settle()` now agrees with the page at the real cusp. `c = 1/4` still Settles at n = 56, period 1. `c = 1/4 + 1e-9` is Leaves, `reason: cusp`, n = 40056, `critical_period` 0 (Exercise 8: a real c greater than 1/4 is not in the set). `c = 1/4 + 1e-8` Leaves by escape at n = 31414. The basilica is not that climb.
- **WebXR.** `requestImmersive` asks for `immersive-ar` or `immersive-vr`, feature-detected. A refused or missing session keeps the void and the line "No headset session. The shape stays in the void." A session that opens binds controller and hand `select` to the same flash. Where `XRWebGLLayer` exists, the session is presented. Where it does not, the session still lives and select still flashes, so the path can be smoked without a headset. The page keeps that sentence in view the whole time, not only after a failed click. A session with no picture says "No headset picture. The shape stays in the void. A trigger still writes the shape."

## 9c. Batch 4 (still pg/1, still no model)

L0–L6 and their compositions are unchanged. Two levels sit after the metric. The picker still adds one new part at a time. §2's rejection totals are the original six-view grammar. Its per-level counts through L5 still hold on this grammar, because the new views are locked until L7.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468 for L0–L8. L6 is the chordal expansion (1094). L7 is 1262. L8 is 1468. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592. The lone `slice` is in that last jump: it does not ask for a GPU. `split-slice` still does, by R10. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354.

- **Level 7, family.** Unlocks when `metrics >= 2` and `flashes >= 3` and `history >= 20`, all required, after L6. `metrics` counts a tap that names the chordal distance. Two readings, three flashes, and twenty pictures: the distance has been used, and the shape chapter is still ahead of this one. It adds views `slice` and `split-slice`. A number `theta` in [0, 1] is the plane. `φ = theta · π/2`. A pixel `w` is the point `z = w sin φ`, `c = c₀ sin φ + w cos φ`. At 0 the walk starts at 0 and the pixel is c: the set of c. At 1, c is the pinned value and the pixel is z: the Julia set. The window centre slides by `-0.55 cos φ`, so the set of c is framed, and a Julia set sits on 0. `split-slice` draws that picture beside a card. The card turns from a floor (the set of c) to a wall (the Julia set). The card paints the word schematic. It is a picture of the angle. It is not a projection that drops one coordinate of R⁴ and pretends the missing axis is still on the screen. R11: the slice is only `julia` or `poly`. The Mandelbrot set is already the θ = 0 end. Newton is not zᵈ + c. R12: colour `curvature` is the bend of a height field, and these views are not that surface. Pinch still zooms the slice; the bake stays on the CPU, at most 160 pixels on the long side, so a phone does not run a second GPU pass. R10 still requires gpu ≥ 1 for `split-slice`, because the name starts with `split`. The lone `slice` works with no GPU.
- **Level 8, bend.** Unlocks when `slices >= 2` and `history >= 24`, both required, after L7. `slices` counts a turn of the plane (the slider when it is let go, Shift and an arrow, or a drag of the card that moves the angle). The bend cannot open before the family, because the level walk does not skip a rule. It adds views `excess` and `bend`. The picture is the book's sphere of diameter 1, centre (0, 0, 1/2). The triangle opens on 0, 1, and i: three right angles, excess π/2, area π/8. The radius is 1/2, so excess / area = 4 on every triangle that is not flat. Dragging a corner changes the excess and the area; the ratio stays 4. That is the constant curvature. `bend` puts the stereographic plane beside the sphere. The straight triangle in the plane has angle sum π. The images of the great circles are circles, which is Exercise 2. The wash is the area scale `1/(1+|z|²)²`: 1 at 0, and it dies at the pole. R5 refuses pinch on `excess` and `bend`. They are drawings, not a second framebuffer, so R10 does not ask for a GPU. A tap picks a corner. It does not flash. Arrow keys move that corner. They do not move c. The letter c stays the parameter of the map, and the triangle does not use it. The wash on the plane is labelled area scale, so it is not read as the curvature colour of the escape height.
- **Citations, checked against the open-edition PDF and the HTML.** §2.5, Figure 2.5.2 [PDF Figure 2.22, page 73]: the sphere, the centre, the north pole. Exercise 14: the coordinates. Exercise 2: lines and circles via the sphere. Chapter 9 introduction (`ch_conformal-mapping-2.html`): stereographic projection keeps angles. Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. The course map stops before Chapter 9. No exercise numbers the angle sum, and the page says so. The wash is the area scale of the chart, and no exercise numbers that scale. §4.2, Exercise 4, is the disk at c = 0. Figure 4.2.13 [PDF Figure 4.6, page 114] and Example 4.2.16 are the set of c. Exercise 10 is the cardioid. The planes between those two pictures are not in the book, and the page says so. The slice cuts (z, c). The 4D graph of w = f(z) is a different four numbers, x, y, u, v, on the Test 1 map with the mappings. It is not Chapter 4, and the page says so. The card is a schematic of the angle, not a dropped coordinate of R⁴. Lab and the 4D graph stay on the Test 1 map: their problems are book chapters 2 and 3, and part V of that map is the diary and the index. The switch still says Test 1 is Chapters 1 to 3. Book Chapter 4 is the Test 2 map.
- **WebXR, again.** Support is `isSessionSupported === true` for `immersive-ar` and `immersive-vr`, and only in a secure context, and only when `requestSession` exists. Anything else is the standing line, and the button stays hidden. A session object without `addEventListener` is a rejection, not a session. Presentation still requires `XRWebGLLayer`. Without it, select still flashes and the line says there is no headset picture.

## 9d. Batch 5 (still pg/1, still no model)

L0–L8 and their compositions are unchanged. One level sits after the bend. The picker still adds one new part at a time.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524 for L0–L9. L9 is 1524. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620. The lone `unity` is in that last jump: it does not ask for a GPU. `split-unity` still does, by R10, because the name starts with `split`. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410.

- **Cusp, any real start.** `settle()` used to call a real start past the cusp Settles when the start was not 0 and the lookahead ran out. f(x) − x = (x − 1/2)² + (c − 1/4) is at least c − 1/4 for every real x, so every real start leaves. `c = 1/4 + 1e-9` with z0 = 0 is still Leaves, `reason: cusp`, n = 40056. The same c with z0 = 0.2 is Leaves, cusp, n = 40056. z0 = 0.4 is Leaves, cusp, n = 40050. `c = 1/4` with z0 = 0.4 still Settles, n = 50, period 1. The basilica and the parabolic 2-cycle are not that climb. The station walker uses the same test. The sentence is unchanged.
- **Bend, the letter.** A c-path on `excess` or `bend` writes c into the formula and into the verdict strip. It does not bake again, and it does not paint the letter c on the triangle. Arrow keys still move the marked corner and leave c where it is. The triangle does not use c.
- **Level 9, roots.** Unlocks when `bends >= 2` and `history >= 28`, both required, after L8. `bends` counts a committed corner move: a pad click, an arrow that is not a repeat, or a drag of a corner that is let go. The roots cannot open before the bend, because the level walk does not skip a rule. It adds views `unity` and `split-unity`. The map is Newton, and the polynomial is z^d − 1 with d in {3, 4, 5}. That degree is a fill, not an axis. R13: these views are Newton only. A Julia or a power map is a different colouring. R1 still chooses the colour, basin or trap. Curvature stays refused, because these pictures are not a height field. The right pane of `split-unity` is the set of c for z^d + c, the critical orbit, smooth escape, and the orange ring at c. That pane is not a basin colouring: R1 forbids basin on a power map, so the view owns the colour. Pinch zooms the basins. The power window stays put. The bake stays on the CPU, at most 160 pixels on the long side. A tap on a basin names the root. It does not flash. A tap on the power pane sets c. At level 9, a touch whose hash picks Newton flashes `unity` in basin colour, degree 3, 4, or 5. Every other map still flashes the plane.
- **Citations for this picture, checked against lines already in the repo.** Equation 1.5.5, Chapter 1 §5, is the d-th roots of 1. The link is the roots-of-unity anchor. §4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3] colour z³ + 1. This picture colours z^d − 1, the same sign as the Newton station. Example 4.2.1 [PDF Example 4.7] and Exercise 3 are the cubic Newton line. Exercises 1 and 2 are the half-planes. No exercise numbers the coloured basins. No exercise numbers a higher power. No figure in the repo colours the basins of degree 4 or 5. The right pane is not Figure 4.2.13. The page says each of those gaps.
- **WebXR, again.** The headset-free smoke is unchanged: a session with no picture stays in the void, and select still flashes. `XRWebGLLayer` is still what presents a picture. This batch did not run that path on a real headset.

## 9e. Batch 6 (still pg/1, still no model)

L0–L9 and their compositions are unchanged. One level sits after the roots. The picker still adds one new part at a time. The diary is a view, not a forced next picture: until a roots picture is in the remembered list, the picker can still introduce that picture first.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608 for L0–L10. L10 is 1608. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662. The lone `diary` is in that last jump: it does not ask for a GPU. `split-diary` still does, by R10, because the name starts with `split`. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494.

- **Level 10, diary.** Unlocks when `roots >= 2` and `history >= 32`, both required, after L9. `roots` counts a basin the walk actually lands on, and a committed change of the degree. A start that does not land does not count. History is the remembered list, and the page keeps 32. The index of Julia sets cannot open before the roots. It adds views `diary` and `split-diary`. The map is Julia. R14 refuses any other map. R15 refuses `basin` and `curvature`. R1 already refuses `basin` on Julia, and R10 refuses the split when gpu is 0. The window is framed on the set of c, centre −0.6, span 3.2. The Julia pane, when the view is split, keeps the fixed window centre 0, span 3.2. A pinch zooms only the index. Touch or drag a point c in the set. On release, or on a tap, `flashPick` at level 10 or above returns `julia/plane/smooth` of that c, clamped to [−1.6, 1.6]. The page rolls that Julia set in with the same diary ink, then the stars return. Inside, the orbit of 0 has not left and the Julia set is one piece. Outside, it has left and the set is dust. That sentence is Theorem 4.2.11. A real c greater than 1/4 is Outside, and the badge says the index writes dust, and Leaves, by Exercise 8. The page does not run the 40000-step walk on a drag. The assembler vectors already lock that walk. The badge uses a 96-step critical orbit, and the exact real test. c = 1/4 still settles. The caption names the orange ring as this c. A touch writes that Julia set across the void. The standing badge points at the ring and names the boundary at 1/4, so the outside case is that boundary and not a broken picture. While the Julia set is the picture, the badge says the colour is how fast the walk leaves. A crowded colour past the cusp is the set come apart, and the index writes dust. The diary flash skips the blur settle. The roll is still 2.4 s, then the stars return. Arrow keys move c and do not flash. Enter or Space writes the marked c back. The lone picture wears T1, T2, and F1. F2 is the split’s other pane, the Julia set. F3 stays on the roots picture. The diary’s colour is the fate of the orbit of 0.
- **The roots picture on the GPU.** `unity` and `split-unity` bake in a second fragment shader when WebGL2 is present. Degree 4 and 5 still stripe the extra roots: one root, two inks. The power pane stays smooth, with the orange ring at c. If that shader does not compile, the CPU bake remains, capped at 160 pixels on the long side. `dataset.bake` says `gpu` or `cpu`.
- **The cusp is the diary, not the basins.** The roots picture asks which root Newton finds. A real start past 1/4 is a fact about the set of c. The diary shows that cusp. Touching past it flashes a dust Julia set.
- **First screen.** Thread badges sit under the caption, in the header, the way a Test 1 station puts its threads under the lede. They are on the first screen at 1280 and at 390. They do not cover the basins. On a wide window the chips wrap inside the caption’s measure. Under 480px they are one sideways row, so the picture keeps its height. The footer still opens with the formula, the badge, and the citation. On the roots picture and on the diary, the citation starts with “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” The book line follows.
- **One route rule.** `mapForcedByRoute` lives in `js/core/map-route.js` on this site, and the same file lives in `kit/template/js/core/map-route.js` for a site the kit scaffolds. The two copies match. The live router imports the `js/` copy: Cloudflare Pages strips `kit/`, and that import is what starts the home page. The kit router and `js/app.js` are wrappers. A shared station forces the first map listed on the thread token. T1–T3 list `test1`. F1–F3 list `test2`. The kit does not contain this course’s token test.
- **Citations for the diary, checked against lines already in the repo.** Figure 4.2.13 [PDF Figure 4.6, page 114] is the set of c. Example 4.2.16 [PDF Example 4.11] is the disk |c| ≤ 1/4. Theorem 4.2.11 [PDF Theorem 4.9] is one piece exactly when the orbit of 0 stays bounded, and dust once it leaves. Exercise 4 is the disk at c = 0. Exercise 8 is a real c bigger than 1/4. Exercise 10 is the cardioid. The book does not number the set of c as an index that writes the Julia set back. The page says so.
- **WebXR, again.** The diary is a plane. A missing session keeps the standing line “No headset session. The shape stays in the void.” Select still flashes. At level 10, or while the diary owns the flash, that flash is the Julia set of the touched c. This batch did not run that path on a real headset.

## 9f. Batch 7 (still pg/1, still no model)

L0–L10 and their compositions are unchanged. One level sits after the diary. The picker still adds one new part at a time.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608, 1650 for L0–L11. L11 is 1650. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662, 704. `twins` is in that last jump on every tier: the name does not start with `split`, so R10 does not hide it when gpu is 0. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494, 1536.

- **Level 11, twins.** Unlocks when `writes >= 2` and `history >= 36`, both required, after L10. `writes` counts a diary write-back: a tap or a released drag on the diary that rolls the Julia set of the marked c. A tap on the twins does not. The page remembers 48 pictures, so 36 can be reached. `pick()` still scores only the last 32, so older pick vectors stay put. It adds the view `twins`. The map is Julia. R16 refuses any other map. R17 refuses `basin` and `curvature`. The opening c is the seahorse valley, and the window is that neighborhood, centre that c, span 0.045. The Julia pane starts at centre 0, span 2.6. Neither pane is an assembler field. `fill()` does not emit them, so L0–L10 picks stay byte-identical. The standing picture is that neighborhood beside the Julia set. The caption, the two questions, and the citation say so. They do not call this picture the diary index. A tap, Enter, or Space stays with the two panes. The Julia set is already beside the neighborhood, so this picture does not roll the diary’s write-back. A drag moves c with the neighborhood, and the Julia pane follows. Letting go leaves that picture. Arrow keys move c and do not flash. Two chips: The twin restores the seahorse, The copy jumps to the period-3 centre on the real antenna, about span 0.48. The antenna badge says pinch in. A pinch there, once the span is under 0.16, names the small copy, and the citation says the book does not number it. The Julia pane at that centre is the Julia set, not the copy. L11 is a view on the playground station, the same way L7 through L10 are. It is not its own Story Map stop.
- **The set of c follows the hand.** On the diary and on the roots split, the window is no longer a fixed frame. A pinch or a wheel zooms the pane under the pointer toward that point. Dragging the ring moves c, and the window keeps c in the middle 70%. Shift and a drag pans the window and leaves c. The Julia pane has its own window. `+` and `−` use the pane last touched.
- **The cusp, on the station walk.** `c = 1/4` with a real start is `reason: parabolic`, multiplier 1. The sentence says the fixed point is 1/2, the orbit approaches and does not leave, and this is not Settles. `c = 1/4 + 1e-9` stays Leaves, reason cusp. Inside the cardioid, `c = 0.2499` still Settles. The assembler `settle()` is unchanged, so `c = 1/4` there is still Settles, n = 50, period 1, for the locked vector. The diary badge uses the same words, with the snap tightened from `1e-4` to `1e-12`, so an attracting point near 1/4 is not called the cusp.
- **The header wraps above 480px.** Thread badges sit on their own full-width row. On a wide window they wrap inside the caption’s measure, the way a Test 1 lede wraps, so F3 and F2 stay on the glass at a tablet width. Under 480px the visible text is the id (`T1`, `F2`, `F3`), the accessible name stays the full thread label, and the row stays one line. That line scrolls, with a fade, only if it still overflows. The five chips of the roots split fit on a phone. The citation on the roots picture, the diary, and the twins still opens with “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” That sentence stays the first text node, and it stays on one line.
- **Citations for the twin, checked against lines already in the repo.** Theorem 4.2.11 [PDF Theorem 4.9] is one piece exactly when the orbit of 0 stays bounded. Exercise 10 is the main cardioid. Figure 4.2.13 is the set of c. The book does not number the local resemblance of the set of c to the Julia set at that c, and it does not number a small copy found by zooming. The page says so. The seahorse point is not an exercise number.
- **WebXR, again.** Twins is a plane. A missing session keeps the standing line. This batch did not run a headset.

## 9g. Batch 8 (still pg/1, still no model)

This section replaces the 9f sentence that left `settle()` at Settles for `c = 1/4`.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608, 1650, 1692 for L0–L12. L12 is 1692. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662, 704, 746. `bulbs` is in that last jump on every tier: the name does not start with `split`, so R10 does not hide it when gpu is 0. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494, 1536, 1578. L0–L11 counts are unchanged.

- **Level 12, bulbs.** Unlocks when `twins >= 2` and `history >= 40`, both required, after L11. `twins` counts a jump from The twin to The copy, or back, when c actually changes. The page remembers 48 pictures, so 40 can be reached. `pick()` still scores only the last 32. It adds the view `bulbs`. The map is Julia. R18 refuses any other map. R19 refuses `basin` and `curvature`. The opening c is the period-3 bulb above the cardioid. The window frames the set of c: centre −0.6, span 3.2. The Julia pane is a page window, centre 0, span 2.6, and `fill()` does not emit it. A touch or a hover on the set of c sets c to the point under the hand. The attracting cycle of the orbit of 0 lights on the Julia pane, one point at a time, over the same 2.4 s as the diary roll. The place that is on is orange, the same mark as the ring. The places that are waiting stay green, and they stay opaque, so the cycle reads on the set. Reduced motion holds every point steady, in that same orange, with no turn. The caption names that period as the orbit of 0. It does not say the set writes back. The overlay draws the ring on the marked bulb, with the period numerals. The bake does not draw a second ring under it. The opening badge says the numerals are the periods, and it names The Cardioid and the Period, because that door sits under the citation. Three chips jump to period 1 (c = 0), period 2 (c = −1), and period 3. They are the same pill as a Test 1 preset, pressed in the orange of this c. A tap, Enter, or Space stays with the period. The diary is where a touch writes a set back. Pinch zooms only the set of c. The Julia pane stays on the cycle. The footer doors are the Story Map, Powers, Julia, the Mandelbrot set, the orbit of 0, the disk, and The Cardioid and the Period. That last door names Theorem 4.2.20 and the orbit this picture lights.
- **The phone.** Twins and bulbs stay side by side under 480px. The kicker and the actions share a row, the caption takes the next, and the thread ids stay one row. The footer is not shortened: the chips and the chapter sentence, “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.”, stay on the first screen. The hint says “The right pane” because these two pictures do not stack.
- **The Julia pane on twins.** It opens at centre 0, span 2.6. Centre stays 0, the critical point. When the neighborhood span drops below the seahorse span 0.045, the Julia span becomes `max(0.2, 2.6 * mandelSpan / 0.045)`. Zooming out, including the copy chip at span 0.48, leaves it at 2.6. The small-copy sentence is at span under 0.16, which is still wider than 0.045, so the copy is named while the Julia pane is still the whole set. A deeper pinch past seahorse scale tightens the Julia pane. A pinch on the Julia pane itself still zooms that pane until the next neighborhood zoom, which resets the centre to 0 and recomputes the span. Bulbs does not follow: the cycle has to stay in the frame.
- **The cusp, in the assembler.** `settle()` at `c = 1/4` with a real quadratic start is Parabolic, reason `parabolic`, period 1, `critical_period` 1. The critical orbit (`z0 = 0`) closes at n = 56. `z0 = 0.4` closes at n = 50. `z0 = 0.2` closes at n = 56. `c = 0.2499` still Settles. The basilica still Settles. `c = 1/4 + 1e-9` still Leaves, reason cusp. The diary badge and the station walk already used this word. The bulbs picture uses it too: fixed point 1/2, multiplier 1, the orbit approaches and does not fall in, a closed disk is the iteration limit, not Settles, Exercise 8. At c = −0.75, `settle()` and the cardioid stop still say Settles, period 2, because a screen disk closes while the two places are walking into the parabolic point −1/2, multiplier −1. The bulbs badge says that, and it says the disk closed before the landing. It does not call the landing Settles.
- **Not Story Map stops.** L11 stays off the map. The local resemblance and the small copy are unnumbered in the book, and the map already has the Mandelbrot set and the cardioid (Theorem 4.2.20). L12 stays off the map for the same reason: the rotation-number order of the bulbs, and the period-doubling cascade along the real axis, are not numbered. The registry says so. Neither view is a Next stop.
- **Citations for the bulbs, checked against lines already in the repo.** Theorem 4.2.20 [PDF Theorem 4.11] is the attracting fixed point, the main cardioid. Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10] name that point. Figure 4.2.13 [PDF Figure 4.6, page 114] draws the bulbs. Exercise 10 is the main cardioid. Theorem 4.2.11 [PDF Theorem 4.9] is one piece exactly when the orbit of 0 stays bounded. Exercise 8 is a real c bigger than 1/4, and the parabolic landing at c = 1/4. The book does not number the rotation-number ordering of the bulbs, and it does not number the period-doubling cascade. The citation says so. The badge says so again when the picture is the period-5 bulb between periods 2 and 3, and when the picture is the real doubling at period 4 or 8. No theorem number is invented for either.

## 9h. Batch 9 (still pg/1, still no model)

This section replaces the 9g sentence that left `settle()` at Settles for `c = −0.75`.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608, 1650, 1692, 1734 for L0–L13. L13 is 1734. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662, 704, 746, 788. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494, 1536, 1578, 1620. L0–L12 counts are unchanged. `cascade` adds 42 compositions on every tier. The name does not start with `split`, so R10 does not hide it when gpu is 0.

- **Julia colour, decoupled.** The Julia pane stays centre 0, span 2.6, except when twins-follow shrinks it (`max(0.2, 2.6 * mandelSpan / 0.045)` once the neighborhood is tighter than 0.045). Bulbs and the cascade do not follow. The iteration budget is no longer one number. The set of c keeps `iterCount()`, which still grows when that window shrinks. The Julia pane uses `juliaIterCount()`: base 512 at span 2.6, and extra iterations only when that Julia span itself shrinks. The GPU bake writes the Julia budget as `u_iter2`, and the Julia loop tests that uniform itself. A pinch of the set of c can retint the set of c. It does not retint the Julia pane. The roll composites with blending, and the bake turns blending off before it writes the texture. Left on, a low escape-alpha was mixed with the previous picture, so the Julia pane brightened when the other pane was redrawn. The CPU fallback caps the Julia pane on its own budget as well.
- **Phone targets.** On twins, bulbs, and the cascade, under 480px, the header actions are 44px tall and the header’s vertical padding on that row is 0. The stage must not sit lower than it did at 38px. The thread badges stay at least 44px.
- **settle() at the two real points.** `c = −0.75` with the critical orbit, with the parabolic point `z0 = −1/2`, and with a complex start `[0.2, 0.2]` is Parabolic, reason `parabolic`, period 1, `critical_period` 1. The repeller `z0 = 3/2` still Settles, period 1. `c = −1` at the default radius, at `R = 1.2`, at `R = 3.2`, at `R = 4`, and at `z0 = 0.2` with `R = 4`, is Settles, reason `cluster`, period 2, `critical_period` 2. It is not a bare fixed point. `c = 1/4` is unchanged: Parabolic, period 1.
- **WebXR, still untried.** No headset has been run. The button stays hidden unless a secure context reports `isSessionSupported` for immersive-ar or immersive-vr. A refused session keeps the line “No headset session. The shape stays in the void.” A session without an XR layer keeps “No headset picture.” The page adds “A headset was not used to check this page.” and sets `data-xr-proof="untried"`. A green smoke run is not a headset session.
- **Story Map, Next, and the door row.** L11, L12, and L13 stay off the Story Map and off the site Next chain. The book does not number the local resemblance, the small copy, the rotation-number order, or the period-doubling cascade, and the map already has the Mandelbrot set and the cardioid (Theorem 4.2.20). Inventing stops would be a false citation. The playground Next is the assembler’s `advance()`, and these views unlock by the signals in §9f–9h, not by a station. The door row stays under the citation, in document order. Moving it above the citation pushes “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” off the glass at 390×844. The doors are how you leave for the numbered stops: Story Map, Powers, Julia, the Mandelbrot set, the orbit of 0, the disk, and the cardioid.
- **Level 13, the real cascade.** Unlocks when `doubles >= 2` and `history >= 44`, both required, after L12. `doubles` counts a real-axis step from period 1 to 2, 2 to 4, or 4 to 8, on the bulbs or on the cascade. The page remembers 56 pictures, so 44 can be reached. `pick()` still scores only the last 32. It adds the view `cascade`. The map is Julia. R20 refuses any other map. R21 refuses `basin` and `curvature`. The opening c is −1, the superattracting period-2 centre, so two places are already apart. The window frames the real interval from the tip to the cusp: centre −0.875, span 2.25. The Julia pane is a page window, centre 0, span 2.6, and `fill()` does not emit it. The left pane is the real orbit of 0 for c in [−2, 1/4], drawn on the overlay, with a bar for that real slice and the active period’s band marked. It is not a second bake of the set of c. The right pane is the Julia set at that real c, and the attracting cycle lights there the way the bulbs light: orange for the place that is on, green for the places that wait, over 2.4 s. Reduced motion holds every point steady. Drag, hover, or the arrow keys walk c along the real axis and clamp it to [−2, 1/4]. Pinch does not zoom either pane. A tap, Enter, or Space does not flash the diary. Four chips: the cardioid at c = 0, period 2 at c = −1, the period-4 centre, and the accumulation near c = −1.4012. The badge at c = −1 says period 2, two places, not a fixed point. At c = −0.75 it says parabolic. At the accumulation it says the book does not number the point.
- **Citations carried from lines already in the repo.** This batch did not re-fetch the open-edition PDF. The numbers below are the ones §9g and `js/data/textbook.js` already use. The owner should confirm the anchors still match the open edition. Theorem 4.2.20 [PDF Theorem 4.11] is the attracting fixed point, the main cardioid. Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10] name that point. Figure 4.2.13 [PDF Figure 4.6, page 114] draws the bulbs. Exercise 10 is the main cardioid. Theorem 4.2.11 [PDF Theorem 4.9] is one piece exactly when the orbit of 0 stays bounded. Exercise 8 is a real c bigger than 1/4, and the parabolic landing at c = 1/4. Exercise 4 is the disk at c = 0. The book does not number the period-doubling cascade, and it does not number the accumulation near c = −1.4012. That value is a numerical landmark in the assembler (`FEIGENBAUM`). No theorem number was invented for it.

## 9i. Batch 10 (still pg/1, still no model)

This section replaces the §9h sentences that left the door row under the citation, left L11–L13 off the Story Map and off Next, left the repeller at `z0 = 3/2` as Settles, and left the accumulation as a number with no picture.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608, 1650, 1692, 1734, 1776 for L0–L14. L14 is 1776. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662, 704, 746, 788, 830. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494, 1536, 1578, 1620, 1662. L0–L13 counts are unchanged. `rays` adds 42 compositions on every tier. The name does not start with `split`, so R10 does not hide it when gpu is 0.

- **The door row.** `#places` is above `#cite`. On a phone it is one line, 44px, and it scrolls sideways, so the stage stays 326px and the chapter sentence still starts on the glass. From 1100px up the doors wrap onto a second line. One line there cut “When c Is 0, a Disk” and hid the cardioid. The footer is already at its cap, so the stage stays.
- **Story Map and Next.** Four rooms sit after the paper, part J, thread F2, orders 18–21: `pg-twin` (`#twins`), `pg-bulbs` (`#bulbs`), `pg-cascade` (`#cascade`), `pg-rays` (`#rays`). Next from the paper opens them in that order. The cardioid’s next is still the seeds. The night-before plan does not add them. Harmonic and the assembler stay off Next. A hash on `playground.html` opens that picture even when the assembler has not unlocked it. `pick()` still refuses the view until the signal is earned.
- **Leave.** On a phone the button reads Leave. The accessible name stays Leave session, Leave AR, or Leave VR. The box is 44px and does not wrap the header.
- **The repeller.** `settle()` at `c = −0.75`, `z0 = 3/2`, quadratic, is Stays, reason `repeller`, n 9, period 1, `critical_period` 1. The parabolic root `z0 = −1/2` stays Parabolic. The page already said Stays, because the multiplier is not below 1. The tip is the same kind of landing. `c = −2`, `z0 = 0` is Stays, reason `repeller`, n 11, period 1, `critical_period` 1. `z0 = 2` is Stays, n 9, period 1. The multiplier is 4. A start at `z0 = 3` still Leaves. The cusp `c = 1/4` stays Parabolic. `c = −1` stays Settles, period 2.
- **The births and the ratio.** Ticks at `c = −0.75` (2), `c = −1.25` (4), and `c = −1.3680989393912582` (8). The pile stays a triangle at the accumulation. The first visible ratio is about 4.23. The next gap, not ticked, is about 4.55. Later ratios approach about 4.669. The book does not number that limit. The period-8 badge says four places becoming eight, multiplier −1, the place holds, and it is not an attracting period 8.
- **Level 14, two real rays.** Unlocks when `lands >= 2` and `history >= 48`, both required, after L13. `lands` counts an arrival at the cusp or the tip that is a change from the other end, on the cascade or by the ray chips. The page remembers 56 pictures. `pick()` still scores only the last 32. The view is `rays`. The map is Julia. R22 refuses any other map. R23 refuses `basin` and `curvature`. The opening c is the cusp, `[0.25, 0]`. The window frames the set of c: centre −0.6, span 3.2. The Julia pane is a page window, centre 0, span 2.6, and `fill()` does not emit it. Angle 0 is the real half-line `c > 1/4`, landing at the cusp. Angle 1/2 is the real half-line `c < −2`, landing at the tip. No complex ray is drawn. Pinch does not zoom. A tap does not flash the diary.
- **WebXR, still untried.** No headset has been run. The fallback lines and `data-xr-proof="untried"` stay. A green smoke run is not a headset session.

## 9j. Batch 11 (still pg/1, still no model)

This section replaces the §9i sentences that left the door row scrolling below 1100px, left the Julia pane at span 2.6 when the tip is on a phone, left period 16 off the ticks, pointed Chapter 1 §4 at the product figure, and drew no complex ray.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608, 1650, 1692, 1734, 1776, 1818 for L0–L15. L15 is 1818. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662, 704, 746, 788, 830, 872. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494, 1536, 1578, 1620, 1662, 1704. L0–L14 counts are unchanged. `pole` adds 42 compositions on every tier. The name does not start with `split`, so R10 does not hide it when gpu is 0.

- **The door row.** The set-of-c pictures (the diary, the twin, the bulbs, the cascade, the rays, and the pole) wrap at every width. Below 1100px the visible label is short and the accessible name stays the full station title. The disk and the cardioid stay inside that row down to about 390px, with no sideways scroll. The roots split stays one line. A second line there pushes “Test 1 is Chapters 1 to 3. Test 2 is Chapter 4.” off the glass. Below 1100px its visible labels are short, so more of that one line fits before it scrolls.
- **The tip on a phone.** The stored Julia span stays 2.6, and `__pg.juliaSpan` reports that. At c = −2, if the pane cannot hold [−2, 2] with a small margin, the picture uses a wider span. A wide pane already holds both ends, so it stays at 2.6. The Julia pane at the tip marks both −2 and 2.
- **Period 16.** It is a tick, the same kind as 2, 4, and 8: eight places becoming sixteen, multiplier −1, the place holds, not an attracting period 16. The book does not number the hinge. The numeral stacks above a crowded neighbour. Period 32 sits in the pile, so it is not a tick.
- **The argument.** The rays citation opens on HTML Figure 1.4.1, `fig_ch-01-15`, the polar picture. Definition 1.4.6 opens on the equation anchor `Arg_z`. The product stays Figure 1.4.13, `fig_ch-01-17`. The open-edition PDF calls the polar picture Figure 1.15, printed page 22, and calls Arg z Definition 1.11, printed page 23.
- **One complex landing.** Angles 1/3 and 2/3 both land at the period-2 bulb root c = −3/4. The pair is a third chip on the rays picture. Both strokes are bright together, because one landing has two angle-addresses. The real rays stay exact half-lines.
- **Level 15, the pole.** Unlocks when `meets >= 2` and `history >= 52`, both required, after L14. `meets` counts an arrival at c = −3/4 on the rays view that comes from a real landing, then a leave, then a return. The first sight only marks the place. The page remembers 56 pictures. `pick()` still scores only the last 32. The view is `pole`. The map is Julia. R24 refuses any other map. R25 refuses `basin` and `curvature`. The opening c is the pair, [−0.75, 0]. The caption there is one landing, two angles, both leaving the north pole. On the cusp and the tip it is one landing, two addresses, both leaving the north pole. The left pane places each ray with the coordinates from §2.5, Exercise 14 (HTML id `x2_5_20`), on the sphere of Figure 2.5.2. The chordal distance and the angle sum stay on their own pictures. The right pane is the Julia set at the landing. The citation keeps the landing sentences and leaves off the general-c gap. Figure 1.4.1 is PDF Figure 1.15, printed page 22. Definition 1.4.6 is PDF Definition 1.11, printed page 23. A hash `#pole` opens the picture even when the assembler has not unlocked it. Newton basins and the curvature view were already levels. The missing picture was the rays leaving the one point the rest of the site calls infinity.
- **Story Map and Next.** Five rooms sit after the paper, part J, thread F2, orders 18–22. `pg-pole` (`#pole`) follows `pg-rays`. The cardioid’s next is still the seeds. The night-before plan does not add these rooms. Harmonic and the assembler stay off Next.
- **WebXR, still untried.** No headset has been run. The pole is a canvas picture, so the lesson does not depend on a session. The fallback lines and `data-xr-proof="untried"` stay. A green smoke run is not a headset session.

## 9k. Batch 12 (still pg/1, still no model)

This section replaces the §9j sentences that left a few pixels under the twin’s chapter sentence, left non-set-of-c door rows scrolling below 1100px, left complex-ray tails outside the L14 window, left the period-16 plate touching the period-8 plate, left “north pole” off the pair and cusp badges, left the tip ray short with the angle 1/2 label under the pole label, and left the two addresses of one point as a caption rather than a picture.

Valid compositions with full caps `{xr: true, webgl2: true, gpu: 2}` are 1, 8, 42, 162, 381, 750, 1094, 1262, 1468, 1524, 1608, 1650, 1692, 1734, 1776, 1818, 1860 for L0–L16. L16 is 1860. With no headset, no WebGL2, and gpu 0 the same walk is 1, 8, 24, 90, 195, 302, 302, 386, 592, 620, 662, 704, 746, 788, 830, 872, 914. With WebGL2 and gpu 1, and no headset, the walk is 1, 8, 42, 162, 381, 678, 980, 1148, 1354, 1410, 1494, 1536, 1578, 1620, 1662, 1704, 1746. L0–L15 counts are unchanged. `join` adds 42 compositions on every tier. The name does not start with `split`, so R10 does not hide it when gpu is 0.

- **Twin phone.** At about 390px the twin footer grows to `min(54dvh, 25.6rem)` and keeps padding under the citation. The chapter sentence is one line, and about 60px of the citation sits under it. The stage stays at least 260px.
- **Door rows.** Set-of-c rows wrap, with `overflow-x: hidden`. Below 1100px the visible label is short. The roots row is the one that was already on the last line of the glass: on a phone its seven short names fit one line, and on a wide window the full names wrap to two lines. The questions and the badge give that sentence its line back. A phone does not scroll a door row sideways, and the page does not scroll sideways. The set-of-c rows still hold the disk and the cardioid.
- **Complex rays.** A complex sample that would leave the L14 window is clipped to that window, and the outer twelfth of the window fades the stroke to nothing. The landing dot stays at full strength. The real half-lines still run to the pane edge. `raysIndexWindow` is unchanged, so the cusp and the tip stay inside.
- **Period numerals.** Birth 16 shifts left of its tick before it lifts, and birth 8 can shift right. Plate rectangles keep about a 10px gap. The tick stays at the true c. Period 32 stays in the pile.
- **Pole badges.** On the pole, the cusp badge still says “Angle 0 lands here” and says “It leaves the north pole” in the place of the unnumbered-ray sentence. The pair badge still says “land here together” and “two angles” and says “They leave the north pole.” The rays-view badges keep the unnumbered-ray sentence. The tip badge already said the ray leaves the north pole. The citation still says the book does not number external rays.
- **Tip ray.** The sphere is turned to yaw 0.4 and tilt 0.5, and every stroke starts on the north pole itself. c = −2 is near infinity on this sphere, so the stroke is still shorter than the cusp ray. The angle 1/2 name sits about three quarters of the way along the drawn stroke, to the left of the landing, not on the samples piled at the pole. The pole name stays above or beside the dot and does not drop under it.
- **Level 16, the join.** Unlocks when `joins >= 2` and `history >= 56`, both required, after L15. `joins` counts a change of landing on the pole. The first landing only marks. The page remembers 60 pictures. `pick()` still scores only the last 32. The view is `join`. The map is Julia. R26 refuses any other map. R27 refuses `basin` and `curvature`. The opening c is −1 + i√3. The left pane is the set of c with Arg drawn from the positive real axis, Figure 1.4.1 and Definition 1.4.6. The right pane is the Julia set of that c, Theorem 4.2.11. A touch on the left pane moves c and the Julia set follows. Pinch does not zoom. Enter and Space do not flash. Chips are Polar, i, Zero, and Pair. At c = 0 the length is 0 and Arg is not defined, Exercise 4. At the pair the addresses are −3/4 and Arg π. When |c| is large, the finite addresses climb toward the north pole, Figure 2.5.2 and Exercise 14. The stored assembler window is `{cx: -0.75, cy: 0.35, span: 4.2}`. The painted window is computed so the set and −1 + i√3 both sit in the pane. A hash `#join` opens the picture even when the assembler has not unlocked it.
- **Why this picture.** Newton basins were already a level, and the curvature view was already a level. The site’s name is one point with two addresses. L16 is the persistent split that says both addresses and writes the Julia set of that same point, instead of flashing the diary and letting the stars return.
- **Story Map and Next.** Six rooms sit after the paper, part J, thread F2, orders 18–23. `pg-join` (`#join`, title The Join) follows `pg-pole`. The cardioid’s next is still the seeds. The night-before plan does not add these rooms. Harmonic and the assembler stay off Next.
- **WebXR, still untried.** No headset has been run. `data-xr-proof` stays `untried`. The fallback lines stay: “No headset session. The shape stays in the void.” and “A headset was not used to check this page.” The join is a canvas picture, so the lesson does not depend on a session. A green smoke run is not a headset session.

## 9. Builder checklist
1. Vendor `playground.js` as `js/core/playground.js` and keep `check_vectors.mjs` in `tools/` with the vectors, run in CI.
2. Implement the renderer per §3 for the L0 composition first (julia, plane, smooth, nudge, roll), then one level at a time.
   Each level is shippable alone.
3. Wire signals (§5.1) at the gesture handlers, never from timers except `dwell_s`.
4. Capability probe and governor (§6) before any 3D view.
5. Explainer stations reuse `settle()` and `cPath()`; c-on-a-path loops use `cPath(...).at(t)` for live frames and
   `samples` for the verdict strip.
6. If the playground grows a new axis value, propose it to Matrix Master as a step change (Python first, then the vectors, then JS),
   never JS-only.
