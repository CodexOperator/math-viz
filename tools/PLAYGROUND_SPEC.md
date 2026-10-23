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
   `c = 1/4 + 1e-8` leaves on step 31414. If the look runs out and the orbit is 0 under `z² + c` for a real `c` greater
   than 1/4, Exercise 8 already says that `c` is not in the set. The sentence is still Leaves (`reason: cusp`), the same
   opening as the seeds chip for `c = 1/2`, and the closed disk is not Settles. `c = 1/4` itself is the parabolic point
   and still Settles. The basilica is not that climb, so it still settles at the first disk. The lookahead is not extended
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
  "level": {"type": "integer", "minimum": 0, "maximum": 5}, "seed": {"type": "integer"},
  "map": {"type": "object", "additionalProperties": false, "required": ["kind", "c", "d"], "properties": {
    "kind": {"enum": ["julia", "poly", "mandel", "newton"]},
    "c": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2}, "d": {"enum": [2, 3, 4, 5]}}},
  "view": {"type": "object", "additionalProperties": false, "required": ["kind", "window"], "properties": {
    "kind": {"enum": ["plane", "split-param", "sphere", "split-sphere", "height"]},
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
The schema bounds the shape; **R1 to R10 and the level lock are enforced by `check()`**, which runs after any model. A schema-valid
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
