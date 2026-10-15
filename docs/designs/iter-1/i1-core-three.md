# Design: i1-core-three, `js/core/three-view.js`

Designer: stage 2, iteration 1. Owner of: `js/core/three-view.js`. Auto-owned by this goal:
`tests/unit/i1-core-three.test.mjs`, `tests/interact/i1-core-three.mjs`.
Binding inputs: `docs/CONSTRAINTS.md`, `docs/ARCHITECTURE.md` 3.12 and 6, goal `i1-core-three` in
`docs/goals/iter-1.json`, `docs/STORY.md` (the 4D "shadows" thread and the staircase thread).

Several numbers below were measured in a throwaway prototype in headless Chromium with the smoke
launch flags (`--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, three.js
r160 from `vendor/three/`). They are marked **[measured]**. Everything else is derived by hand and
cross-checked with a script. These numbers are unit-test expectations; do not "fix" a test to match
code without first re-deriving the number here.

---

## 0. What exists today, and differences from ARCHITECTURE

- `js/core/` is empty. Only `js/registry.js` exists. No existing export to reconcile; build to
  ARCHITECTURE 3.12 exactly (every signature there is kept, nothing renamed).
- `vendor/three/three.module.min.js` is r160 (`THREE.REVISION === '160'`, 416 exports). It imports in
  plain Node with no DOM and no WebGL **[measured]**: `BufferGeometry`, `Mesh`, `MeshLambertMaterial`,
  `LineSegments`, `Points`, `Sprite` (without a texture), `Box3`, `SphereGeometry` all construct and
  work headless. Only `WebGLRenderer` needs a browser. This is what makes the geometry unit-testable.
- `vendor/three/OrbitControls.js` exports `OrbitControls`. Facts used: `update()` returns `true`
  when the camera moved and `false` otherwise (it also applies damping); it sets
  `domElement.style.touchAction = 'none'` in its constructor; `saveState()` / `reset()` exist;
  `dispose()` exists; `touches = { ONE: ROTATE, TWO: DOLLY_PAN }`; `minDistance`, `maxDistance`,
  `autoRotate`, `autoRotateSpeed`, `enableDamping`, `dampingFactor`, `screenSpacePanning` exist.
- Do **not** read or set `renderer.useLegacyLights`: touching it logs a deprecation warning
  **[measured]**. Lighting constants in section 5.0 already account for r160's physical lights.

### Additions to ARCHITECTURE 3.12 (all additive; every spec'd signature is unchanged)

| Addition | Why |
|---|---|
| Frame convention: every object built by this module is already in three.js scene space with the maths coordinates `(x, y, h)` placed at scene `(x, h, -y)` (section 6.1). `curveToLine`, `toScene` and a marker's `setPosition` take maths triples; `riemannPoint` returns one. | ARCHITECTURE leaves the axis mapping open; a wrong choice mirrors the plane, which is fatal for a course on orientation. |
| `View` also has `canvas`, `container`, `id`, `unavailable`, `requestRender()`, `renderNow()`, `fitTo(obj?, opts?)`, `resetCamera()`. ARCHITECTURE's prose already names `requestRender()`. | Stations need to redraw, frame, and reset. |
| `createView3D` options: `axes`, `axisLabels`, `gridSize`, `autoFrame`, `label`, `target`, `hint`, `forceUnavailable`; `grid` also accepts `'cart' \| 'polar' \| 'both' \| false`. | Labelled axes, test hook for the no-WebGL state, framing. |
| `surfaceFromFunction` also accepts `wire` (default `true`) and defaults for `height` and `color`. The returned mesh has a `LineSegments` child named `wire`. | Surfaces read poorly in both themes without a mesh overlay. |
| `riemannSphere()` also returns `curves` (THREE.Group), `setHalfTurn(angle)`, `showAxis(on)`. `argHelix().update(z, seam?)` takes an optional seam. | The 1/z half-turn and the movable seam are stations' needs and must not require importing three. |
| `curveToLine` returns a `THREE.LineSegments` (a `THREE.Line` subclass; `isLine === true`) with `userData.update(points3)`. | Lets lines break at non-finite points and update in place. |
| New exports: `toScene`, `fromScene`, `srgbToLinear`, `hslToRgb`, `argColor`, `hiddenRamp`, `HIDDEN_RAMP_STOPS`, `hiddenRampCss`, `riemannPoint`, `createMarker`, `HELIX_PITCH`, `THREE` (re-export). | Pure helpers for tests; markers and surface points for the `branches` station; `THREE` is an escape hatch because stations must not import three themselves. |
| Auto redraw: every mutator in this module (`setAngles`, `setFunction`, `update`, `addCurve`, `clearCurves`, `setHalfTurn`, `markInfinity`, `showAxis`, marker `setPosition`, line `update`) requests a render on every view the object (or an ancestor) was added to. | Removes the trap where a station forgets `requestRender()` and the picture never changes. |
| Helix ribbon covers `phi` in `[-(2*turns+1)*pi, (2*turns+1)*pi]`, not `[-2*pi*turns, 2*pi*turns]`. | Markers for step `k = ±turns` can have angles up to `±(2*turns+1)*pi`, past the ARCHITECTURE range. |

The orchestrator should copy this table into ARCHITECTURE 3.12 after the build (listed in section 9).

---

## 1. Goal restatement, story thread, problems covered

**Goal.** One module, `js/core/three-view.js`, owns every use of three.js on the site. It provides:

1. exact pure maths: stereographic projection, 4D rotation, projection `R^4 -> R^3`;
2. builders for the surfaces the stories need (modulus landscape, Re/Im surfaces, the 4D graph,
   the Riemann surface of `z^(1/n)`, the helix of `arg`, the Riemann sphere);
3. `createView3D`, a self-managing three.js view (renderer, camera, orbit controls, lights, themed
   grid and axes, render-on-demand loop, resize, theme, touch, keyboard, clean disposal).

It has no stations and no Lab UI. The stations `staircase`, `branches`, `graph4d`, `reciprocal` and
`lab` compose it.

**Story thread carried.** The 4D meta-thread of `docs/STORY.md`: the graph `{(x, y, u, v)}` of
`w = f(z)` is one object that nobody can see, and every 3D picture on the site is a shadow of it.
Plus the staircase thread (T2) made solid, and the sphere that makes infinity a place.

| Helper | The shadow it casts | What the student sees | Thread |
|---|---|---|---|
| `modulusLandscape` | `(x, y, abs(w))`, hue = `Arg w` | height is distance from 0, hue is the angle: the domain colouring lifted into 3D; zeros touch the floor; `z^2` cycles the hue twice around 0 | 4D, T3 |
| `reImSurface` | `(x, y, u)` or `(x, y, v)`, colour = the other part | the Re and Im surfaces; nothing is lost because the hidden part is the colour | 4D |
| `graph4D` | `(x, y, u, v)` rotated by two angles then dropped to 3D | one slider spins the output plane (`uv`), one swaps the roles of input `y` and output `v` (`yv`); the Re surface turns into the Im surface | 4D |
| `riemannSurfaceRoot` | all `n` roots at once as `(x, y, part of r^(1/n) e^(i theta/n))` | `n` sheets meeting at the branch point 0; over `z = -1` the cube-root sheets sit at `Im = 0.866, 0, -0.866` | T2 (2.2.2, 2.4.1) |
| `argHelix` | the staircase of `arg z` as a helicoid, one bead per step | the point on the floor, a dashed fibre above it with beads at `theta + 2 pi k`, the home bead bigger; crossing the seam moves which bead is home | T2 (1.3.1) |
| `riemannSphere` | stereographic image of the plane | `infinity` is the north pole; the polar grid is latitude and longitude; `1/z` is a half-turn about the axis through `1` and `-1` | T1, T3 (2.5.1) |

**Review problems and topics covered.** `assignment_refs` of the goal: **2.4.1** (branch of the cube
root continuous on the negative real axis: the three-sheet surface and the seam) and **2.5.1** (image
of `|z - 1| = 1` under `1/z`: the half-turn on the sphere). Topics T2.2, T2.4, T2.5 and the T3.1
context (the 4D graph). Supporting worked values used as test expectations: 1.3.1 (helix beads),
2.2.2 (the `n = 2` surface over `2i`), `z^2` as `u + iv` (4D graph). Worked in both addresses in
section 6.

---

## 2. UX

This is an engine, so the "UX" is the behaviour of the 3D view a station mounts and the controls
`createView3D` puts inside its container. Stations own all text outside the container (legends,
readouts). The module owns the strings below.

### 2.1 Wireframe, desktop (container about 560 x 420)

```
+----------------------------------------------------------------------+
|                                                          [ Reset view ]|   <- #<id>-reset
|                      h                                               |
|                      |        .-~~~~~-.                              |
|                      |     .-'  the    '-.         surface, lit,     |
|          y           |    /  surface      \        vertex colours,   |
|           \          |___/________________\___     mesh lines        |
|            \        /                                               |
|             +------+--------> x     floor grid (--cart), axes        |
|                                                                      |
| Drag to turn. Click the view, then scroll to zoom.                   |   <- #<id>-hint
| Arrow keys turn, + and - zoom, 0 resets.                             |      (fades after first use)
+----------------------------------------------------------------------+
```

### 2.2 Wireframe, phone (container 358 x 268, i.e. 390 minus two 16px gutters)

```
+--------------------------------------+
|                       [ Reset view ] |
|            h                         |
|            |    .-~~-.               |
|            |  .'      '.             |
|       y    | /          \            |
|        \___|/____________\___ x      |
|                                      |
| Swipe sideways to turn. Pinch to     |
| zoom. Swipe up or down to scroll.    |
+--------------------------------------+
```

### 2.3 Controls inside the container

`uid` is `container.id` if it has one (stations use ids like `graph4d-view`), otherwise
`three-view-<n>` with `n` counting up per page. No element's id depends on anything else.

| Element | id | Label / copy | Behaviour |
|---|---|---|---|
| Container | `uid` | `aria-label` = `options.label` (default `3D view`), `role="group"`, `aria-roledescription="3D view"`, `tabindex="0"`, `aria-describedby="uid-hint"` (only when the hint exists; with `hint: false` there is no hint element and no `aria-describedby`) | Gets keyboard focus; handles keys (2.4). Click gives it focus. |
| Canvas | `uid-canvas` | `aria-hidden="true"` | Pointer input goes to OrbitControls. |
| Reset button | `uid-reset` | visible text `Reset view`; `aria-label` `Reset the 3D view to its starting angle` | `type="button"`; calls `resetCamera()`. Min height 36px (40px when the pointer is coarse). |
| Hint | `uid-hint` | text in 2.6 | `pointer-events: none`; gets `data-hidden="true"` on the first pointerdown, keydown or wheel inside the container (it stays in the DOM so `aria-describedby` keeps working). |
| Status | `uid-status` | text in 2.6 | `role="status"`; only present in the unavailable and context-lost states. |
| Axis labels | (inside the canvas, sprites) | `options.axisLabels`, default `['x', 'y', 'h']` | Not focusable; not in the accessibility tree. |

### 2.4 Pointer, touch, keyboard

| Input | Result |
|---|---|
| Mouse left-drag | Orbit (turn the view). |
| Mouse right-drag, or Shift + left-drag | Pan (slide the view). |
| Wheel / trackpad scroll | Zoom **only** when the container has focus, or Ctrl or Cmd is held (a trackpad pinch arrives as Ctrl + wheel). Otherwise the event is not handled and the page scrolls normally. **[measured]**: unfocused wheel leaves the camera alone and `defaultPrevented` stays false; focused wheel zooms (prototype with the default zoom speed: distance 6.000 -> 5.144) and `defaultPrevented` is true. |
| Touch, coarse pointer (`(pointer: coarse)`) | `touch-action: pan-y` on the canvas: a sideways swipe turns the view, an up/down swipe scrolls the page, two fingers pinch-zoom and pan. |
| Touch, fine pointer | `touch-action: none` (OrbitControls default): one finger turns, two fingers zoom and pan. |
| Keys (container focused, event target is the container itself) | Left/Right turn by 0.12 rad (Shift x3). Up/Down tilt by 0.12 rad, clamped to `[0.05, pi - 0.05]`. `+` or `=` zoom in (distance x 0.88), `-` or `_` zoom out (x 1.14). `0` or `Home` reset. Handled keys call `preventDefault`. **[measured]**: ArrowRight changes the azimuth by exactly 0.12; `0` returns the camera to the saved position with error 0. |
| Tab | Container, then the Reset button. Visible focus ring on both (`outline: 2px solid var(--focus)`). |
| Reset button, Enter or Space | `resetCamera()`. |

### 2.5 States

| State | What happens |
|---|---|
| **Empty** | A view with no objects shows only the floor grid, axes, labels and the hint. No error. |
| **Loading** | `createView3D` is synchronous: the first frame renders at the next animation frame. Building a large surface is synchronous in the caller (about 10 ms for 96 x 96). The 670 KB three.js module is what is slow to load; stations should `await import('../core/three-view.js')` after first paint and show their own text `Loading the 3D view...` in the container meanwhile (Appendix B). This module renders nothing for loading. |
| **WebGL unavailable** (detected before any three.js renderer is built, so three.js never logs a console error; also forced by `forceUnavailable: true`) | `createView3D` does **not** throw. The container gets the status text (2.6) and `view.unavailable === true`, `view.renderer/controls/canvas === null`. `add`, `remove`, `requestRender`, `fitTo` etc. are safe no-ops that still keep `scene` consistent. `dispose()` removes the status element. |
| **Context lost** (`webglcontextlost`) | `preventDefault()` on the event so the browser may restore it; show the context-lost status text; stop rendering. On `webglcontextrestored`, remove the text and `requestRender()`. |
| **Off-screen / tab hidden** | No animation frames are scheduled while the container is outside the viewport (IntersectionObserver); one render happens when it becomes visible again. |
| **Zero-size container** | `resize()` ignores sizes under 2 px and keeps the last good size; the observer fires when layout gives a size. `.three-view` CSS gives `aspect-ratio: 4 / 3` and `min-height: 220px` so a container without its own height still has a size. |
| **Error in a frame callback** | Caught, logged once with `console.error('three-view: onFrame callback threw', err)`, and that callback is unsubscribed. The loop keeps running. |
| **Bad input to a builder** | Never throws for numbers: ranges, grid sizes and `clamp` are sanitised (5.6). A function `f` that throws or returns something that is not `{re, im}` yields a grey flagged vertex. |

### 2.6 Copy (exact strings, plain, for a student the night before a test)

| Where | Text |
|---|---|
| Hint, fine pointer | `Drag to turn. Click the view, then scroll to zoom. Arrow keys turn, + and - zoom, 0 resets.` |
| Hint, coarse pointer | `Swipe sideways to turn. Pinch to zoom. Swipe up or down to scroll the page.` |
| Reset button | `Reset view` |
| Unavailable | `This 3D view needs WebGL and your browser has it switched off. The flat pictures on this page show the same thing.` |
| Context lost | `The 3D view paused because the graphics card reset. It should come back on its own. If it does not, reload the page.` |
| Default `aria-label` | `3D view` (stations pass something specific, for example `Modulus landscape of z squared`) |

---

## 3. Visual encoding

CONSTRAINTS: colours come from CSS custom properties read at draw time, both themes, re-read on
theme change. The module reads tokens with `getComputedStyle(document.documentElement)`. It must not
import `theme.js` (wave-0 modules do not import each other). **Data colours are theme-independent**
(the hue wheel and the hidden-coordinate ramp are identical in both themes, exactly as domain
colouring is); only the chrome follows the theme.

### 3.1 The two data colour languages (the legend rule)

| Colour language | Means | Where | Definition |
|---|---|---|---|
| **Hue wheel** | an angle, `Arg w` | `modulusLandscape` (and any future domain-coloured surface) | `hue = (atan2(v, u) / 2 pi) mod 1`, `HSL(hue, 0.8, 0.5)`. Arg 0 = red, `pi/2` = yellow-green, `pi` = cyan, `-pi/2` = violet (same convention as `domaincolor.hueOf`; at `abs(w) = 1` the lightness 0.5 equals domain colouring's, so the colours match the 2D wheel exactly on the unit circle). |
| **Hidden-coordinate ramp** | a real number that is not drawn as a position | `reImSurface` (the other part), `riemannSurfaceRoot` (the other part), `graph4D` (the hidden fourth coordinate) | Five-stop viridis, colour-blind safe, and visibly unlike the hue wheel so the student never confuses "colour is an angle" with "colour is a number". Stops (display sRGB): `0` `#440154` (68,1,84), `0.25` `#3b528b` (59,82,139), `0.5` `#21918c` (33,145,140), `0.75` `#5ec962` (94,201,98), `1` `#fde725` (253,231,37); linear interpolation between stops in display space. `t = 0.5` means value 0. |

Rule for stations: hue wheel always means argument; the ramp always means a signed real number
(blue-purple negative, yellow positive). `hiddenRampCss()` returns
`linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725)` for legends.

Flagged vertices (section 5.6): finite but beyond `clamp` are mixed 60 percent toward neutral grey
`(0.5, 0.5, 0.5)`; non-finite are exactly neutral grey. Stations should say "grey means cut off or
undefined" in their legend.

### 3.2 Chrome tokens

| Element | Token | Light | Dark |
|---|---|---|---|
| Scene background | `options.background` (default `--surface`) | token | token |
| Floor grid (Cartesian lines) | `--cart`, alpha | 0.30 | 0.26 |
| Floor polar grid (rings, rays), when `grid` is `'polar'` or `'both'` | `--polar`, alpha | 0.30 | 0.26 |
| Re axis and Im axis | `--cart`, alpha 0.9 | token | token |
| Height axis | `--text-muted`, alpha 0.9 | token | token |
| Axis labels | `--cart` (x, y), `--text-muted` (h) | token | token |
| Mesh-line overlay on surfaces (`wire`) | `--text-muted`, alpha | 0.30 | 0.35 |
| Sphere body | `--surface-2`, opacity | 0.18 | 0.24 |
| Sphere parallels and meridians (the polar grid) | `--polar`, alpha 0.45; equator alpha 0.9 | token | token |
| Sphere real and imaginary axis great circles | `--cart`, alpha 0.9 | token | token |
| Sphere curve default | `--input` (`addCurve` default); `curveToLine` default `--output` | token | token |
| Time ramp on curves | stroke colour mixed toward `--t0` (t=0) and `--t1` (t=1), weight 0.65 | token | token |
| Helix: ghost helicoid, home sheet, beads | `--polar`; opacity 0.18, 0.50, bead 0.55 (home bead 1.0) | token | token |
| Helix: floor point | `--cart` | token | token |
| Helix: axis and fibre | `--text-muted` dashed | token | token |
| Helix and any surface: seam ray on the floor | `--seam` dashed | token | token |
| Markers (`createMarker`) | caller's token, default `--text` | token | token |
| Overlay chrome (hint, reset button, status) | `--text`, `--text-muted`, `--surface`, `--surface-2`, `--border`, `--focus`, `--radius`, `--font` | tokens | tokens |

Time ramp (same as `plane.js`, ARCHITECTURE 3.5):
`ramp(base, t) = mix(base, mix(t0, t1, t), 0.65)` where `mix(a, b, k) = a (1 - k) + b k`, computed
per channel in display sRGB. `plane.js` is being built concurrently; if its `rampColor` differs
after the build, change this one to match (risk R3).

### 3.3 Shading

All surfaces use `MeshLambertMaterial({ vertexColors: true, side: DoubleSide })`. Lighting: an
ambient light and one directional "headlight" that follows the camera, each with intensity
`0.5 * Math.PI` (r160 physical lights divide diffuse by pi, so ambient + directional = pi gives a
face looking straight at the camera exactly its vertex colour, and a face seen edge-on 50 percent of
it). **[measured]**: a flat red surface `(0.9, 0.1, 0.1)` seen straight on renders at pixel
`(230, 26, 26)`; the same surface with intensities 1 and 1 renders at `(188, 19, 19)`; with vertex
colours not converted to linear it renders `(243, 89, 89)` (washed out). Vertex colour attributes
therefore hold **linear** values (section 5.1); every colour callback and ramp works in display
space.

Dark theme note: the low end of the ramp (`#440154`) is dark on a dark background. The mesh-line
overlay (alpha 0.35 in dark) and shading keep the silhouette readable; the colour itself is data and
is not retuned per theme.

---

## 4. Module API

Single file `js/core/three-view.js`. Imports exactly:

```js
import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
```

No other imports. Top level of the module touches **no** DOM and no WebGL (it must import in Node).
Anything that needs `document` is inside a function and guarded with `HAS_DOM`.

### 4.1 Pure functions (Node-safe, no three.js objects)

```js
export function stereographic(z) -> [X, Y, Z]
```
`z` is `{re, im}` (a finite plain number is accepted as `{re: n, im: 0}`). Plane frame (not scene
frame): `X = 2x/(s+1)`, `Y = 2y/(s+1)`, `Z = (s-1)/(s+1)`, `s = x^2 + y^2`. `z = 0 -> [0, 0, -1]`;
either component `+-Infinity` (neither NaN) -> `[0, 0, 1]`; either NaN -> `[NaN, NaN, NaN]`. For
`hypot(x, y) > 1e7` uses the overflow-safe form (5.5). Every output has unit length.

```js
export function inverseStereographic([X, Y, Z]) -> {re, im}
```
`(X, Y)/(1 - Z)`; if `1 - Z <= 0` returns `{re: Infinity, im: Infinity}`. Does not renormalise.

```js
export function rotate4([x, y, u, v], { uv = 0, yv = 0 } = {}) -> [x', y', u', v']
```
First rotates in the u-v plane by `uv`, then in the y-v plane by `yv`. Convention (pinned by
ARCHITECTURE): `rotate4(p, {uv: pi/2}) = [x, y, -v, u]` and `rotate4(p, {yv: pi/2}) = [x, -v, u, y]`.
Returns a new array; if both angles are exactly 0 it returns a copy of `p` unchanged.

```js
export function project4to3(p4) -> [x, y, u]      // first three entries; new array
```

Additive pure helpers:

```js
export function toScene([x, y, h]) -> [x, h, -y]            // maths -> three.js scene frame
export function fromScene([X, Y, Z]) -> [X, -Z, Y]          // inverse
export function srgbToLinear(c) -> number                    // c in [0,1]
export function hslToRgb(h, s, l) -> [r, g, b]               // all in [0,1]; h wraps
export function argColor(w) -> [r, g, b]                     // display sRGB, hue = Arg w, HSL(hue, 0.8, 0.5)
export function hiddenRamp(t) -> [r, g, b]                   // display sRGB, t clamped to [0,1]; NaN -> 0.5
export const HIDDEN_RAMP_STOPS                               // [[0,[68,1,84]], [0.25,[59,82,139]], ...]
export function hiddenRampCss() -> string
export function riemannPoint({ n = 3, part = 'im' } = {}, r, theta) -> [x, y, h, other]
export const HELIX_PITCH = 1.2                               // height gained per full turn on the helix
export { THREE }                                             // namespace re-export (escape hatch)
```

`riemannPoint`: `x = r cos(theta)`, `y = r sin(theta)`, `rho = r^(1/n)`, `w = rho e^(i theta / n)`,
`h = part === 're' ? Re w : Im w`, `other` = the other part. `theta` is the unwrapped angle in
`[0, 2 pi n)` (any real accepted). Maths frame, not scene frame.

### 4.2 three.js builders (need three, not WebGL; Node-safe)

All returned objects are in scene frame. Objects that should be framed by the camera carry
`userData.frame = true`.

```js
export function surfaceFromFunction({
  f,                         // (z:{re,im}) => {re,im}
  xRange = [-2, 2], yRange = [-2, 2],
  nx = 96, ny = 96,          // integers, sanitised to [2, 512]
  height = (w, z) => Math.hypot(w.re, w.im),
  color = (w, z) => argColor(w),     // [r,g,b] display, 0..1
  clamp = 6,                 // > 0, else 6
  wire = true
}) -> THREE.Mesh
```
Mesh facts (all asserted by tests): `BufferGeometry` with `position` (Float32, itemSize 3, `nx*ny`
entries), `color` (Float32, itemSize 3, linear), `normal`; index with `(nx-1)*(ny-1)*2` triangles;
material `MeshLambertMaterial` with `vertexColors === true`, `side === THREE.DoubleSide`,
`polygonOffset` on. `mesh.userData = { kind: 'surface', nx, ny, xRange, yRange, clamp, frame: true,
flags: Uint8Array(nx*ny), flaggedCount, clampedCount, nonFiniteCount, vertexCount: nx*ny }`.
Flag values: `0` ok, `1` clamped, `2` non-finite. Vertex `k = i + j*nx` is at
`x = x0 + (x1-x0) i/(nx-1)`, `y = y0 + (y1-y0) j/(ny-1)`.

```js
export function modulusLandscape({ f, xRange, yRange, nx, ny, clamp = 6, wire = true }) -> THREE.Mesh
```
Defaults `xRange = yRange = [-2, 2]`, `nx = ny = 96`. `height = Math.hypot(w.re, w.im)`,
`color = argColor(w)`. `mesh.name = 'modulus-landscape'`, `userData.kind = 'modulus-landscape'`.

```js
export function reImSurface({ f, xRange, yRange, nx, ny, part = 're', clamp = 6, wire = true }) -> THREE.Mesh
```
Height = `Re w` or `Im w`. Colour = `hiddenRamp(0.5 + 0.5 * other / S)` where `other` is the other part
and `S = max(1e-9, min(clamp, max finite |other| over the grid))` (two passes over `f`).
`name = 're-surface' | 'im-surface'`.

```js
export function graph4D({ f, xRange, yRange, nx = 64, ny = 64, angles = { uv: 0, yv: 0 }, clamp = 6, wire = true })
  -> { mesh, setAngles({ uv, yv }), setFunction(f), dispose() }
```
Defaults `xRange = yRange = [-2, 2]`. Same grid topology as `surfaceFromFunction`. `setAngles` merges
(missing keys keep their current value), recomputes `position`, `color`, `normal` **in place**
(same attribute objects, `needsUpdate = true`), then auto-requests a render. `setFunction` re-fills
the base 4D points and re-applies the current angles. `dispose()` removes the mesh from its parent
and disposes geometry and materials (including the wire child). `mesh.name = 'graph4d'`,
`mesh.userData = { kind: 'graph4d', nx, ny, vertexCount: nx*ny, angles: {uv, yv}, hiddenScale: S,
version: <increments on every change>, frame: true }`. A station reads
`mesh.geometry.attributes.position.count` for `window.__mv.graph4d.vertexCount`.

```js
export function riemannSurfaceRoot({ n = 3, rMax = 2, nr = 24, nTheta = 48, part = 'im', wire = true } = {})
  -> THREE.Mesh
```
`nTheta` is per turn. Vertex count `(nr+1)*(nTheta*n+1)`, triangles `nr*nTheta*n*2`. `name =
'riemann-root'`, `userData = { kind: 'riemann-root', n, rMax, nr, nTheta, part, frame: true }`.

```js
export function argHelix({ z = {re: 1, im: 1}, turns = 2, rMax = 3, seam = -Math.PI } = {})
  -> { group: THREE.Group, update(z, seam?) }
```
`group.userData = { kind: 'arg-helix', frame: true, turns, rMax, pitch: HELIX_PITCH, seam, beads:
Mesh[2*turns+1] (index 0 is k = -turns), floorPoint: Mesh, fibre: LineSegments, homeSheet: Mesh,
ghostSheet: Mesh }`. `update(z, seam)`: `seam` defaults to the current seam; passing a different
seam also moves the home sheet and the seam ray.

```js
export function riemannSphere({ radius = 1 } = {}) -> {
  group, curves,                              // THREE.Group, THREE.Group (child of group)
  project(z) -> THREE.Vector3,                // scene frame, on the sphere of the given radius
  addCurve(points /* [{re, im, t?}] */, color = '--input') -> THREE.LineSegments,
  clearCurves(), markInfinity(on), setHalfTurn(angle), showAxis(on) }
```
`group.userData = { kind: 'riemann-sphere', frame: true, radius, infinityMarker: Object3D,
axisLine: Line, labels: Sprite[] }`. `markInfinity` defaults to on.

```js
export function curveToLine(points3 /* [[x, y, h], ...] maths frame */, color = '--output')
  -> THREE.LineSegments        // isLine === true
export function createMarker({ color = '--text', radius = 0.06, position = [0, 0, 0] } = {})
  -> THREE.Mesh                // userData.setPosition([x, y, h]) maths frame
export function disposeObject(obj)
```
`disposeObject`: null-safe and idempotent. Detaches `obj` from its parent, then for `obj` and every
descendant disposes `geometry`, every material (arrays too) and every texture on a material
(`map`, `alphaMap`, `emissiveMap`). Does not dispose shared things it cannot see.

### 4.3 The view

```js
export function createView3D(container, {
  background = '--surface',          // a token (starts with --) or any CSS colour
  cameraPosition = [3, 3, 4],        // scene frame
  grid = true,                       // true | 'cart' | 'polar' | 'both' | false  (true = 'cart')
  autoRotate = false,
  axes = true, axisLabels = ['x', 'y', 'h'], gridSize = 8,
  autoFrame = true, label = '3D view', target = [0, 0, 0],
  hint = true, forceUnavailable = false
} = {}) -> View

// View
{ scene, camera, renderer, controls,        // renderer/controls/canvas are null when unavailable
  canvas, container, id, unavailable,
  add(obj) -> obj, remove(obj) -> obj,
  onFrame(cb /* (dt, t, view) => void */) -> unsubscribe,
  start(), stop(),
  requestRender(), renderNow(),
  resize(), fitTo(obj?, { padding = 1.25 } = {}), resetCamera(),
  setBackgroundFromTheme(),
  dispose() }
```

Semantics:
- `createView3D` starts the loop itself (calls `start()`); `start()` and `stop()` are idempotent.
  Throws `TypeError('createView3D: container must be a DOM element')` only when `container` is not a DOM
  element (checked as `container.nodeType === 1`, so the check also works in Node).
- `add(obj)` adds to the scene, registers the view for auto-redraw (5.11), and, when
  `autoFrame` and `obj.userData.frame` and the user has not moved the camera and no object has been
  auto-framed yet, calls `fitTo(obj)`. Returns `obj`.
- `remove(obj)` removes from the scene and deregisters; it does **not** dispose (use `disposeObject`).
- `onFrame` callbacks run every animation frame while at least one is registered (they keep the loop
  awake) and may call `requestRender()`.
- `requestRender()` coalesces: many calls before the next frame produce one render.
- `renderNow()` renders synchronously (also updates the headlight). Used by tests and by stations
  that must grab the canvas right away.
- `fitTo(obj)` frames one object; with no argument it frames the union of every object added with
  `userData.frame`. Also saves the state that `resetCamera()` returns to.
- `resetCamera()` is `controls.reset()` plus a render: back to the state saved at creation or at
  the last `fitTo`.
- `setBackgroundFromTheme()` re-reads every token and recolours the background, the grid, axes,
  labels, and every object whose `userData.themeRefresh` exists. It runs automatically on theme change.
- `dispose()`: section 5.12 step D. Idempotent. After it, every method is a safe no-op.
- Registers in `window.__mv.views3d` (a `Map` keyed by `id`, created if absent) while alive, so
  interaction scripts can find views; removed on dispose.

Events: this module emits none. It listens (and removes on dispose) to: `ResizeObserver`
and `IntersectionObserver` on the container; `themechange` on `document`; a `MutationObserver` on
`<html>` attributes `data-theme`, `class`, `style`; `matchMedia('(prefers-color-scheme: dark)')`
and `matchMedia('(prefers-reduced-motion: reduce)')` change events; `keydown`, `pointerdown` and a
capture-phase `wheel` listener on the container; `webglcontextlost` / `webglcontextrestored` on the
canvas; the controls' `change` and `start` events.

### 4.4 Lifecycle in a station

```
mount:    view = createView3D(box, {...});  mesh = modulusLandscape({...});  view.add(mesh)
update:   g.setAngles({uv});  (auto redraw)           or: view.remove(mesh); disposeObject(mesh); mesh = ...; view.add(mesh)
unmount:  view.dispose()        // disposes everything still in the scene, releases the GL context, removes the canvas
```
Objects belong to the view they were added to; do not add one object to two views.

---

## 5. Algorithms

### 5.0 Constants (module scope, no DOM)

```js
const TAU = 2 * Math.PI;
const HAS_DOM = typeof document !== 'undefined';
const NEUTRAL = [0.5, 0.5, 0.5];           // display sRGB
const CLAMP_MIX = 0.6;                     // flagged-clamped colours: c*(1-0.6) + NEUTRAL*0.6
const LIGHT = { ambient: 0.5 * Math.PI, head: 0.5 * Math.PI };
const SLERP_STEP = 0.08;                   // radians, sphere curve subdivision
const SPHERE_LIFT = 1.004;                 // curves sit 0.4 percent above the sphere
const PIXEL_BUDGET = 2.1e6, PR_MAX = 2;
const FALLBACK_TOKENS = {                  // used only when a token is missing or there is no DOM
  light: { '--surface': '#ffffff', '--surface-2': '#f3f4f6', '--text': '#111827', '--text-muted': '#4b5563',
           '--border': '#d1d5db', '--focus': '#2563eb', '--cart': '#2563eb', '--polar': '#c2410c',
           '--input': '#0f766e', '--output': '#7c3aed', '--seam': '#6b7280', '--t0': '#1e293b', '--t1': '#d97706' },
  dark:  { '--surface': '#111827', '--surface-2': '#1f2937', '--text': '#f3f4f6', '--text-muted': '#9ca3af',
           '--border': '#374151', '--focus': '#60a5fa', '--cart': '#60a5fa', '--polar': '#fb923c',
           '--input': '#2dd4bf', '--output': '#a78bfa', '--seam': '#9ca3af', '--t0': '#64748b', '--t1': '#fde68a' } };
```

### 5.1 Colour helpers

1. `clamp01(c) = Math.min(1, Math.max(0, c))`.
2. `srgbToLinear(c)`: `c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`.
   `(0.5) -> 0.21404114048`, `(0.9) -> 0.78741228940`, `(0.1) -> 0.01002282557`, `(0.8) -> 0.60382733886`.
3. `hslToRgb(h, s, l)`: `h = h - Math.floor(h)` (so `-0` becomes `0`); `c = (1 - |2l - 1|) s`;
   `h6 = h * 6`; `x = c (1 - |h6 mod 2 - 1|)`; `m = l - c/2`; by `Math.floor(h6) % 6`:
   0 `(c,x,0)`, 1 `(x,c,0)`, 2 `(0,c,x)`, 3 `(0,x,c)`, 4 `(x,0,c)`, 5 `(c,0,x)`; add `m` to each.
4. `argColor(w)`: `a = Math.atan2(w.im, w.re)`; `hue = a / TAU`; return `hslToRgb(hue, 0.8, 0.5)`.
   (`atan2(-0, -1) = -pi`, hue `-0.5`, wraps to `0.5`; the same colour as `+pi`. No seam in colour.)
5. `hiddenRamp(t)`: if `t` is NaN use 0.5; `t = clamp01(t)`; `s = 4t`; `i = Math.min(3, Math.floor(s))`;
   `f = s - i`; per channel `(stop[i] + (stop[i+1] - stop[i]) f) / 255`.
6. `mixRgb(a, b, k) = a.map((v, c) => v * (1 - k) + b[c] * k)`.
7. `rampRgb(base, t0, t1, t) = mixRgb(base, mixRgb(t0, t1, t), 0.65)` (display space).
8. `writeLinear(arr, k, rgb)`: `arr[3k + c] = srgbToLinear(clamp01(rgb[c]))` for `c = 0..2`.
9. `tokenColor(spec) -> THREE.Color`: `const [r,g,b] = resolveColor(spec); return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace)`
   (this converts display to the linear working space; use it for every `material.color`, background and light colour).

### 5.2 Scene frame

`toScene([x, y, h]) = [x, h, -y]`, `fromScene([X, Y, Z]) = [X, -Z, Y]`. This is a proper rotation
(determinant +1), so counterclockwise in the plane is counterclockwise seen from above. Equivalent to
rotating a maths-frame group by `-pi/2` about X. Every builder writes positions through `toScene`
(inline in the hot loops: `P[3k] = x; P[3k+1] = h; P[3k+2] = -y`).
**[measured]**: a top-down camera at `(0, 6, 0.001)` shows maths x to the right and maths y up the
screen; triangles `(a, b, c)` and `(b, d, c)` for a grid cell give vertex normals `(0, 1, 0)`.

### 5.3 Grid indices

`buildGridIndex(nu, nv)`: vertex `(i, j)` is `i + j*nu`. For `j = 0..nv-2`, `i = 0..nu-2`:
`a = i + j*nu`, `b = a + 1`, `c = a + nu`, `d = c + 1`; push `a, b, c, b, d, c`. Array type
`Uint16Array` when `nu*nv <= 65535`, else `Uint32Array`. Triangle count `(nu-1)(nv-1)*2`.

`buildWireIndex(nu, nv, stepU, stepV)`: line segments (pairs of indices).
rows `j` where `j % stepV === 0 || j === nv-1`: for `i = 0..nu-2` push `(i + j*nu, i+1 + j*nu)`;
columns `i` where `i % stepU === 0 || i === nu-1`: for `j = 0..nv-2` push `(i + j*nu, i + (j+1)*nu)`.
For a 5 x 5 grid with steps 1: `5*4 + 5*4 = 40` segments, 80 indices. `LineSegments` geometry shares the mesh's
`position` attribute object (so in-place updates reach it) and has its own index.
`wireSteps(n) = Math.max(1, Math.round((n - 1) / 16))` for surfaces; for the Riemann surface root
`stepU = max(1, round(nTheta / 12))` (a spoke every 30 degrees), `stepV = max(1, round(nr / 8))`.
Wire material: `LineBasicMaterial({ transparent: true, opacity: <3.2> })`, `renderOrder = 1`,
`name = 'wire'`, `frustumCulled = false`.

### 5.4 Tokens and colour resolution

```
isDark():
  if !HAS_DOM -> false
  t = documentElement.getAttribute('data-theme')
  if t === 'dark' return true; if t === 'light' return false
  return matchMedia('(prefers-color-scheme: dark)').matches

resolveColor(spec, fallbackToken = '--text') -> [r, g, b] display 0..1:
  if typeof spec !== 'string' -> resolveColor(fallbackToken)
  s = spec.trim()
  css = s
  if s starts with '--':
     css = HAS_DOM ? getComputedStyle(documentElement).getPropertyValue(s).trim() : ''
     if css === '' css = FALLBACK_TOKENS[isDark() ? 'dark' : 'light'][s] ?? FALLBACK_TOKENS[...]['--text']
  cached = tokenCache.get(css); if cached return cached
  rgb = parseCssColor(css)
  tokenCache.set(css, rgb); return rgb

parseCssColor(css):
  if HAS_DOM:
     ctx = shared 1x1 canvas 2d context with { willReadFrequently: true }
     ctx.clearRect(0,0,1,1); ctx.fillStyle = '#010203'; ctx.fillStyle = css; ctx.fillRect(0,0,1,1)
     d = ctx.getImageData(0,0,1,1).data
     if (d[0],d[1],d[2]) === (1,2,3) and css.toLowerCase() !== '#010203' -> invalid -> return [0.5, 0.5, 0.5]
     return [d[0]/255, d[1]/255, d[2]/255]
  else: parse '#rgb' or '#rrggbb' by hand; anything else -> [0.5, 0.5, 0.5]
```
**[measured]**: this canvas route handles `#2563eb`, `rgb()`, `hsl()`, `color-mix(in srgb, ...)` and
`oklch()`; an invalid string leaves the sentinel `(1, 2, 3)`. `tokenCache` is cleared by
`setBackgroundFromTheme`.

### 5.5 Pure maths

```
stereographic(z):
  if typeof z === 'number': z = { re: z, im: 0 }
  x = z.re, y = z.im
  if isNaN(x) or isNaN(y): return [NaN, NaN, NaN]
  if !isFinite(x) or !isFinite(y): return [0, 0, 1]
  h = Math.hypot(x, y)
  if h > 1e7:                         // avoids h*h overflow near 1e154
     q = 1 / h; d = 1 + q*q
     return [2 * (x/h) * q / d, 2 * (y/h) * q / d, (1 - q*q) / d]
  s = h * h
  return [2*x/(s+1), 2*y/(s+1), (s-1)/(s+1)]

inverseStereographic([X, Y, Z]):
  d = 1 - Z
  if !(d > 0): return { re: Infinity, im: Infinity }
  return { re: X / d, im: Y / d }

rotate4([x, y, u, v], { uv = 0, yv = 0 } = {}):
  if uv === 0 and yv === 0: return [x, y, u, v]
  if uv !== 0: c = cos(uv); s = sin(uv); [u, v] = [u*c - v*s, u*s + v*c]
  if yv !== 0: c = cos(yv); s = sin(yv); [y, v] = [y*c - v*s, y*s + v*c]
  return [x, y, u, v]

project4to3(p) = [p[0], p[1], p[2]]
```
The hot loops in `graph4D` inline the same arithmetic with `cos/sin` hoisted out of the loop; a unit
test asserts they equal `project4to3(rotate4(...))`.

### 5.6 `surfaceFromFunction`

1. Sanitise: `nx = clampInt(nx, 2, 512)`, same for `ny`; `xRange`, `yRange` must be arrays of two finite
   numbers else `[-2, 2]`; `clamp = clamp > 0 ? clamp : 6`.
2. `N = nx*ny`; `P = new Float32Array(3N)`, `C = new Float32Array(3N)`, `flags = new Uint8Array(N)`.
3. For `j = 0..ny-1` (`y = y0 + (y1-y0)*j/(ny-1)`), `i = 0..nx-1` (`x = x0 + (x1-x0)*i/(nx-1)`), `k = i + j*nx`:
   ```
   z = { re: x, im: y }
   w = safeEval(f, z)         // try { r = f(z) } catch { r = null }; valid iff r is an object with numeric re and im, else {re: NaN, im: NaN}
   wFinite = isFinite(w.re) && isFinite(w.im)
   h = Number(height(w, z)) (inside try/catch; error -> NaN)
   rgb = color(w, z) (inside try/catch; invalid -> NEUTRAL)
   if h === +Infinity: hh = +clamp, flag = 2
   else if h === -Infinity: hh = -clamp, flag = 2
   else if isNaN(h): hh = 0, flag = 2
   else if |h| > clamp: hh = sign(h) * clamp, flag = 1
   else hh = h, flag = 0
   if !wFinite: flag = 2; rgb = NEUTRAL
   if flag === 1: rgb = mixRgb(rgb, NEUTRAL, CLAMP_MIX)
   if flag === 2: rgb = NEUTRAL
   P[3k] = x;  P[3k+1] = hh;  P[3k+2] = -y
   writeLinear(C, k, rgb);  flags[k] = flag
   ```
4. `geometry = new BufferGeometry()`; `setAttribute('position', new BufferAttribute(P, 3))`, `('color', C, 3)`;
   `setIndex(new BufferAttribute(buildGridIndex(nx, ny), 1))`; `computeVertexNormals()`;
   `computeBoundingBox()`; `computeBoundingSphere()`.
5. Material as in 4.2 (`polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1`).
6. Counts: `clampedCount` = number of flag 1, `nonFiniteCount` = number of flag 2,
   `flaggedCount` = sum. Build `userData` (4.2). If `wire`, add the child (5.3, steps `wireSteps(nx)`,
   `wireSteps(ny)`).
7. `themeRefresh` on the mesh: updates the wire's colour and opacity from `--text-muted` and `isDark()`.

`modulusLandscape(spec)` = `surfaceFromFunction({ ...spec, height: (w) => Math.hypot(w.re, w.im), color: (w) => argColor(w) })`
then set `name` and `userData.kind`.

`reImSurface(spec)`:
```
pass 1: evaluate f over the grid; S = max over finite |other part|; S = max(1e-9, Math.min(clamp, S))
pass 2: surfaceFromFunction({ f, ..., height: (w) => part === 're' ? w.re : w.im,
                              color: (w) => hiddenRamp(0.5 + 0.5 * other(w) / S) })
   where other(w) = part === 're' ? w.im : w.re
```

### 5.7 `graph4D`

```
N = nx*ny
base = new Float32Array(4N)          // x, y, u, v with u and v already clamped
baseFlag = new Uint8Array(N)
fill(f):
  S2 = 0
  for each vertex k (same loops as 5.6):
     w = safeEval(f, z)
     if !finite(w):  u = 0, v = 0, flag = 2
     else: u = w.re, v = w.im, flag = 0
           if |u| > clamp: u = sign(u)*clamp, flag = 1;  same for v
     base[4k..4k+3] = x, y, u, v; baseFlag[k] = flag
     S2 = max(S2, x*x + y*y + u*u + v*v)
  hiddenScale S = max(1e-9, sqrt(S2))                // |hidden| <= norm <= S after any rotation
apply({uv, yv}):
  cu = cos(uv), su = sin(uv), cy = cos(yv), sy = sin(yv)       (when an angle is 0 skip its rotation)
  for each vertex k:
     [x, y, u, v] = base[4k..]
     u1 = u*cu - v*su;  v1 = u*su + v*cu                       // uv rotation
     y1 = y*cy - v1*sy; v2 = y*sy + v1*cy                      // yv rotation
     P[3k] = x;  P[3k+1] = u1;  P[3k+2] = -y1                  // position = toScene([x, y1, u1])
     rgb = hiddenRamp(0.5 + 0.5 * v2 / S)                      // hidden coordinate = v2
     flag 1 -> mix toward NEUTRAL by CLAMP_MIX; flag 2 -> NEUTRAL
     writeLinear(C, k, rgb)
  position.needsUpdate = true; color.needsUpdate = true
  geometry.computeVertexNormals(); (frustumCulled = false; no bounding sphere needed)
  userData.version++; userData.angles = { uv, yv }; notify(mesh)
setAngles(a): angles = { uv: a.uv ?? angles.uv, yv: a.yv ?? angles.yv }; apply(angles)
setFunction(g): fill(g); apply(angles)
dispose(): mesh.removeFromParent(); disposeObject(mesh)
```
The mesh's first build uses the same `apply` with the initial angles. Position is the scene-frame
version of `project4to3(rotate4([x, y, u, v], angles))`.

### 5.8 `riemannSurfaceRoot` and `riemannPoint`

```
riemannPoint({ n = 3, part = 'im' } = {}, r, theta):
  rho = Math.pow(r, 1 / n); a = theta / n
  re = rho * cos(a); im = rho * sin(a)
  return [r * cos(theta), r * sin(theta), part === 're' ? re : im, part === 're' ? im : re]

riemannSurfaceRoot({ n, rMax, nr, nTheta, part }):
  n = clampInt(n, 1, 12); nr = clampInt(nr, 2, 200); nTheta = clampInt(nTheta, 8, 400)
  rMax = rMax > 0 ? rMax : 2
  cols = nTheta * n; nu = cols + 1; nv = nr + 1               // vertex (i, j) = i + j*nu, i along theta, j along r
  S = rMax ** (1 / n)                                          // largest possible |part|
  for j in 0..nr: r = rMax * (j / nr) ** 2                     // quadratic spacing: denser near the branch point
    for i in 0..cols: theta = TAU * n * i / cols
       [x, y, h, other] = riemannPoint({ n, part }, r, theta)
       P[3k] = x; P[3k+1] = h; P[3k+2] = -y
       writeLinear(C, k, hiddenRamp(0.5 + 0.5 * other / S))
  index = buildGridIndex(nu, nv); computeVertexNormals()
  seam fix: for each j, ni = normal(0, j) + normal(cols, j); normalise; assign to both vertices
            (the surface closes after n turns; positions coincide, so this removes a shading crease)
  wire with stepU = max(1, round(nTheta / 12)), stepV = max(1, round(nr / 8))
```
Triangle winding is the same helper; the surface is two-sided, so Lambert flips normals per fragment
and shading is correct from either side.

### 5.9 `argHelix`

"Dashed" below means `LineDashedMaterial({ dashSize: 0.08, gapSize: 0.06 })` plus `line.computeLineDistances()` after every
position change.

```
build(turns, rMax, seam):
  K = turns; phiMax = (2*K + 1) * Math.PI; H = HELIX_PITCH * (K + 0.5)       // half-height of the axis
  ghostSheet: helicoid, phi in [-phiMax, phiMax], 48 steps per turn -> nPhi = (2K+1)*48, rho in [0, rMax] with nRho = 8
       vertex (i, j): phi = -phiMax + 2*phiMax*i/nPhi, rho = rMax*j/nRho
       maths position (rho cos phi, rho sin phi, HELIX_PITCH * phi / TAU) -> toScene
       material MeshLambertMaterial({ color: --polar, transparent: true, opacity: 0.18, depthWrite: false, side: DoubleSide })
  homeSheet: same param, phi in (seam, seam + TAU], 48 steps; opacity 0.50 (positions rewritten in place when update() gets a new seam)
  axis: dashed line from (0,0,-H) to (0,0,+H), --text-muted
  seamRay: dashed line on the floor from 0 to rMax at angle `seam` (maths (rMax cos seam, rMax sin seam, 0)), --seam
  floorPoint: sphere radius 0.09, --cart, at (x, y, 0)
  fibre: dashed line from (x, y, -H) to (x, y, +H), --text-muted
  beads: for k in -K..K: sphere radius 0.07, --polar, opacity 0.55; home bead (k = 0): scale 1.7, opacity 1.0

update(z, newSeam):
  if !isFinite(z.re) or !isFinite(z.im): hide floorPoint, fibre, beads; return
  if newSeam given and differs: rewrite the seam ray and homeSheet positions in place
  a = atan2(z.im, z.re)                                        // Arg, in (-pi, pi]
  t = a - seam; t = t - TAU * Math.floor(t / TAU); if t === 0: t = TAU
  thetaHome = seam + t                                         // the unique angle in (seam, seam + 2 pi]
  for k in -K..K: theta = thetaHome + TAU * k; h = HELIX_PITCH * theta / TAU
      bead[k+K].position = scene(z.re, z.im, h)
  floorPoint.position = scene(z.re, z.im, 0); fibre vertices = scene(z.re, z.im, -H), scene(z.re, z.im, +H)
  fibre.computeLineDistances(); notify(group)
```
Steps for seam `-pi`: `thetaHome = Arg z`. Heights for `z = -1 + i sqrt3` (`Arg = 2 pi/3`):
`h_k = 1.2 (1/3 + k) = 0.4 + 1.2 k`. The jump: `z = -1 + i 1e-9` has `Arg ~ pi` (home bead at `h = 0.6`), `z = -1 - i 1e-9` has
`Arg ~ -pi` (home bead at `h = -0.6`); the bead set is the same set shifted by one step.

### 5.10 `riemannSphere`

```
radius R (default 1)
body: Mesh(SphereGeometry(R, 64, 48), MeshLambertMaterial({ color: --surface-2, transparent: true, opacity: 0.18|0.24, depthWrite: false, side: DoubleSide }))
      (poles on the scene Y axis; north pole is scene (0, R, 0), which is plane (0, 0, R) = infinity)
graticule (the polar grid): in the plane frame (X, Y, Z) then toScene:
   parallels for r in [1/4, 1/2, 1, 2, 4]: Z = (r*r - 1)/(r*r + 1), horizontal radius = 2r/(r*r + 1) (r = 1/2 and 2 are +-0.6 and 0.8)
       128-point LineLoop; colour --polar alpha 0.45; r = 1 (equator) alpha 0.9
   meridians every 30 degrees (12): half great circle from south to north pole, 64 points; --polar alpha 0.45
   real and imaginary axes: the great circles through theta = 0, pi and theta = +-pi/2; --cart alpha 0.9
infinity marker: small sphere (0.05 R) at the north pole + sprite label "∞"; visible by default; markInfinity(on) toggles
labels (browser only; skipped without DOM): sprites "0" at the south pole, "1", "-1", "i", "-i" at the unit circle points
axisLine: dashed line through plane (1,0) and (-1,0) extended to +-1.5 R (scene X axis), --text-muted, hidden by default; showAxis(on)
curves = new Group() (child of group); rotation is the half-turn handle
project(z): [X, Y, Z] = stereographic(z); return new Vector3(R*X, R*Z, -R*Y)
setHalfTurn(angle): curves.rotation.x = angle; curves.updateMatrix(); notify(group)
   (rotation about the scene X axis = the axis through plane points 1 and -1; at angle pi a point with plane coordinates (X, Y, Z)
    lands at (X, -Y, -Z), which is the sphere image of 1/z, section 6.3)
clearCurves(): for each child of curves: disposeObject(child); notify(group)
addCurve(points, color):                     // all curve geometry in scene frame
   hasT = points.length > 0 && every point has finite t
   prev = null; segs = []
   for p of points:
      s = stereographic(p)                     // infinity (an infinite component) -> north pole: the stroke goes over the pole
      if any(isNaN(s)): prev = null; continue  // a gap: lines do not bridge it
      cur = { v: s, t: hasT ? p.t : 0 }
      if prev: subdivide(prev, cur, segs)
      prev = cur
   subdivide(a, b, segs):
      ang = acos(clamp(dot(a.v, b.v), -1, 1))
      if ang > Math.PI - 1e-6: return          // antipodal: break the line rather than draw through the centre
      n = max(1, ceil(ang / SLERP_STEP))
      for m in 0..n-1: s0 = m/n, s1 = (m+1)/n
          segs.push({ p0: slerp(a.v, b.v, s0, ang), p1: slerp(a.v, b.v, s1, ang), t0: lerp(a.t, b.t, s0), t1: lerp(a.t, b.t, s1) })
   slerp(u, v, s, ang) = ang < 1e-9 ? u : (sin((1-s) ang) u + sin(s ang) v) / sin(ang)
   positions: each endpoint (X, Y, Z) -> (R*SPHERE_LIFT*X, R*SPHERE_LIFT*Z, -R*SPHERE_LIFT*Y)
   colours: base = resolveColor(color); per endpoint rgb = hasT ? rampRgb(base, t0rgb, t1rgb, t) : base; writeLinear
   line = new LineSegments(geometry, LineBasicMaterial({ vertexColors: true }))      // renderOrder 2
   dots: if hasT and at least 2 finite points:
        for tk in [0, 0.25, 0.5, 0.75, 1]: z = point of the input polyline at time tk (linear interpolation between the two
           consecutive finite points whose t bracket tk; skip tk if none brackets it); position = project(z) * SPHERE_LIFT
        Points child with PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true }), colours rampRgb(base, ..., tk)
   line.userData = { kind: 'sphere-curve', points, color, themeRefresh }
   curves.add(line); notify(group); return line
```
Slerp keeps every sample at exactly `R * SPHERE_LIFT` from the centre (a chord would dip inside the glass). A unit
test checks this on a quarter-circle given as one 90 degree segment.

### 5.11 Lines, markers, dispose, auto redraw

```
curveToLine(points3, color):
  segments only between consecutive points that are both finite (all three coordinates); a non-finite point breaks the line
  positions scene-frame; LineBasicMaterial({ color: tokenColor(color) }); userData = { kind: 'line', color, update(points3), themeRefresh }
  update(p3): rebuild the index list; if the vertex count is unchanged write positions in place, else replace the attribute
              (dispose the old attribute); notify(line)

createMarker({ color, radius, position }):
  Mesh(SphereGeometry(radius, 16, 12), MeshLambertMaterial({ color: tokenColor(color) })); renderOrder 3
  userData.setPosition([x, y, h]) sets position from toScene and calls notify
  userData.themeRefresh recolours

disposeObject(obj):
  if !obj return
  obj.traverse(o => { geometry?.dispose(); for each material m (array or single): dispose textures (map, alphaMap, emissiveMap), then m.dispose();
                      delete o.userData.__render })
  obj.removeFromParent()

auto redraw:
  attachRender(root, fn): (root.userData.__render ||= new Set()).add(fn)
  detachRender(root, fn): root.userData.__render?.delete(fn)
  notify(obj): for (o = obj; o; o = o.parent) o.userData?.__render?.forEach(fn => fn())
  view.add(obj) calls attachRender(obj, requestRender); view.remove(obj) calls detachRender
```

### 5.12 `createView3D`

**Setup**

1. Node-safe check: `if (!container || typeof container !== 'object' || container.nodeType !== 1) throw new TypeError('createView3D: container must be a DOM element')`
   (do not write `instanceof Element`; `Element` does not exist in Node and the unit test calls `createView3D()` there).
2. Options merged over defaults (4.3). `uid = container.id || 'three-view-' + (++seq)`.
3. `injectStyleOnce()` (5.13). `container.classList.add('three-view')`. Set role, aria attributes, `tabindex="0"` if
   the container has none.
4. `reduced = matchMedia('(prefers-reduced-motion: reduce)')`; `coarse = matchMedia('(pointer: coarse)').matches`.
5. `webglOk()`: if `forceUnavailable` return `false`. Else create a throwaway canvas, try `getContext('webgl2')`
   then `getContext('webgl')` inside try/catch; if a context came back release it
   (`gl.getExtension('WEBGL_lose_context')?.loseContext()`); cache only a `true` result. If `false`: build the
   unavailable view (2.5), register in `__mv.views3d`, return.
6. `renderer = new THREE.WebGLRenderer({ antialias: true })` inside try/catch (a failure falls back to step 5's
   unavailable view). Do not touch `useLegacyLights`. `renderer.setPixelRatio(pr)` is done in `resize()`.
   `canvas = renderer.domElement`; `canvas.id = uid + '-canvas'`; `aria-hidden="true"`; prepend to the container.
   Canvas CSS (from the injected sheet): `position: absolute; inset: 0; width: 100%; height: 100%; display: block;
   cursor: grab` so the canvas can never push the container's size.
7. `scene = new THREE.Scene()`; `camera = new THREE.PerspectiveCamera(45, 4/3, 0.05, 200)`;
   `camera.position.set(...cameraPosition)`.
8. `controls = new OrbitControls(camera, canvas)`; `controls.target.set(...target)`; `enableDamping = !reduced.matches`;
   `dampingFactor = 0.08`; `rotateSpeed = 0.9`; `zoomSpeed = 0.9`; `minDistance = 0.6`; `maxDistance = 60`;
   `screenSpacePanning = true`; `autoRotate = autoRotate && !reduced.matches`; `autoRotateSpeed = 1.0`.
   After construction set `canvas.style.touchAction = coarse ? 'pan-y' : 'none'` (the constructor wrote `none`).
9. Lights: `AmbientLight(0xffffff, LIGHT.ambient)`; `head = DirectionalLight(0xffffff, LIGHT.head)`; add both and
   `head.target` to the scene.
10. Furniture (not framed, never auto-fit): a `Group` named `furniture` with the grid per the `grid` option (below, none when
    `grid === false`), and the axes and axis labels when `axes` is true (independent of `grid`).
    - `L = gridSize / 2`. Cartesian grid: one `LineSegments` with, for `k = -L..L` (integers), the segments
      `(k, -L, 0)-(k, L, 0)` and `(-L, k, 0)-(L, k, 0)` (maths frame, scene-converted), `--cart`, transparent,
      alpha per 3.2, `depthWrite: false`, `renderOrder = -1`. Polar grid: rings `r = 1..L` (128 points each) and rays
      every 30 degrees from 0 to `L`, `--polar`, same material settings.
    - Axes: x from `(-L, 0, 0)` to `(L, 0, 0)` and y from `(0, -L, 0)` to `(0, L, 0)` in `--cart`; h from
      `(0, 0, 0)` to `(0, 0, L)` in `--text-muted`.
    - Labels (only when `HAS_DOM`): `makeLabel(text, token)` draws the text on a 128 x 64 canvas
      (`600 40px var(--font)`, centred, token colour), `CanvasTexture` with `colorSpace = SRGBColorSpace`,
      `Sprite(SpriteMaterial({ map, transparent: true, depthTest: false }))`, scale `(0.6, 0.3, 1)`, placed at
      `(L + 0.35, 0, 0)`, `(0, L + 0.35, 0)`, `(0, 0, L + 0.35)`; `themeRefresh` redraws. Empty label text -> no sprite.
11. Overlays: hint (text per 2.6, hidden when `hint === false`), reset button with the click handler
    `resetCamera`, as children of the container. Hint and button are added after the canvas so they sit above it.
12. `registerListeners()` (below). `window.__mv.views3d.set(uid, view)`.
13. `setBackgroundFromTheme()`; `resize()`; `controls.saveState()`; `start()`; return the view.

**Render loop**

```
state: running = false, visible = true, needsRender = true, rafId = 0, idle = 0, last = 0, disposed = false, userMoved = false

schedule(): if (!rafId && running && visible && !disposed) rafId = requestAnimationFrame(loop)
requestRender(): needsRender = true; idle = 0; schedule()
start(): if disposed return; running = true; resize(); requestRender()
stop(): running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }

loop(now):
  rafId = 0
  if (!running || disposed) return
  dt = Math.min(0.1, (now - last) / 1000); last = now
  changed = controls.update()                       // applies damping and autoRotate; true if the camera moved
  if (changed) { needsRender = true; idle = 0 } else idle++
  for cb of Array.from(frameCbs): try { cb(dt, now / 1000, view) } catch (e) { console.error(...); frameCbs.delete(cb) }
  if (needsRender) renderNow()
  if (frameCbs.size > 0 || needsRender || controls.autoRotate || idle < 45) schedule()
  // otherwise the loop goes dormant: no frames are scheduled until requestRender(), a controls 'change', resize, or visibility

renderNow():
  if (disposed || !renderer) return
  head.position.copy(camera.position); head.target.position.copy(controls.target)
  renderer.render(scene, camera); needsRender = false
```
`controls.addEventListener('change', requestRender)`, `controls.addEventListener('start', () => { userMoved = true; hideHint() })`.
**[measured]** with this loop: 400 ms idle after the first frame produced 0 extra renders; one `requestRender()` produced exactly 1 render.

**Resize**

```
resize():
  if disposed or !renderer return
  w = container.clientWidth, h = container.clientHeight
  if (w < 2 || h < 2) return
  pr = Math.min(window.devicePixelRatio || 1, PR_MAX, Math.max(1, Math.sqrt(PIXEL_BUDGET / (w * h))))
  if (w === lastW && h === lastH && pr === lastPR) return
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false)       // false: do not write canvas.style
  camera.aspect = w / h; camera.updateProjectionMatrix(); requestRender()
```
`ResizeObserver` calls `resize()` through one `requestAnimationFrame` (coalesced). **[measured]**: setting the container to 300 px
wide produced `canvas.width === 300` and `camera.aspect === 1` for a 300 px tall container.

**Auto-frame and `fitTo`**

```
fitTo(obj, { padding = 1.25 } = {}):
  targets = obj ? [obj] : framedObjects (those passed to add() with userData.frame)
  box = new Box3(); for t of targets: box.expandByObject(t)
  if (box.isEmpty() or any non-finite) return
  c = box.getCenter(); size = box.getSize(); R = Math.max(0.5, size.length() / 2)
  vFov = camera.fov * Math.PI / 180; hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
  dist = R * padding / Math.sin(Math.min(vFov, hFov) / 2)
  dir = camera.position - controls.target; if (dir.length() < 1e-6) dir = (0.55, 0.5, 0.67); dir.normalize()
  controls.target.copy(c); camera.position.copy(c).addScaledVector(dir, dist)
  camera.near = Math.max(0.02, dist / 200); camera.far = dist * 20 + 4 * R; camera.updateProjectionMatrix()
  controls.minDistance = dist / 25; controls.maxDistance = dist * 4
  controls.update(); controls.saveState(); requestRender()
```
Example: a landscape whose box is size `(4, 6, 4)` (`z^2` clamped at 6) has `R = 4.1231`, `dist = 13.468` at aspect >= 1.
`add()` calls `fitTo(obj)` for the first flagged object only while `!userMoved`.

**Listeners (all removed in D)**

- `container` `keydown` (2.4): only when `e.target === container`. Uses `Spherical` about `controls.target`;
  sets `userMoved = true`; then `controls.update()` and `requestRender()`. `0`/`Home` -> `resetCamera()`.
- `container` `wheel`, capture, passive: `if (document.activeElement !== container && !e.ctrlKey && !e.metaKey) e.stopPropagation()`.
- `container` `pointerdown`: `hideHint()` (sets `data-hidden="true"`); the container takes focus on click because it has `tabindex`.
- `IntersectionObserver`: `visible = entry.isIntersecting; if (visible) requestRender()`.
- Theme: `document` `themechange`, `MutationObserver(documentElement)`, `matchMedia('(prefers-color-scheme: dark)')`
  change: all call one rAF-debounced `setBackgroundFromTheme()`.
- Reduced motion change: `controls.enableDamping = !m; controls.autoRotate = autoRotate && !m`.
- Canvas `webglcontextlost`: `e.preventDefault()`, `running` stays true but rendering is skipped (`contextLost = true`), show status.
  `webglcontextrestored`: remove status, `contextLost = false`, `requestRender()`.

**`setBackgroundFromTheme()`**

```
tokenCache.clear()
scene.background = tokenColor(options.background)
scene.traverse(o => o.userData?.themeRefresh?.(o))       // furniture, labels, wires, helix, sphere, markers, lines, curves
renderer.setClearColor(scene.background); requestRender()
```
Grid/wire/sphere alpha constants (3.2) are selected with `isDark()` inside each `themeRefresh`.

**D: `dispose()`**

1. `if (disposed) return; disposed = true; stop()`.
2. Disconnect `ResizeObserver`, `IntersectionObserver`, `MutationObserver`; remove all `matchMedia`, `document`, container and
   canvas listeners (keep the exact references used to add them; the capture `wheel` listener must be removed with
   `{ capture: true }`).
3. `controls.dispose()`. Clear `frameCbs`.
4. `scene.traverse`: for every object call `disposeObject`-style disposal of geometry, materials and material textures (labels'
   `CanvasTexture`s included). Then `scene.clear()`.
5. `renderer.dispose(); renderer.forceContextLoss(); canvas.remove()`. **[measured]**: plain `dispose()` leaves the GL context alive and
   24 create/dispose cycles log nine `Too many active WebGL contexts` warnings; with `forceContextLoss()` the same 24 cycles log zero.
6. Remove the hint, reset button, status element; `container.classList.remove('three-view')`; remove the attributes this module set.
7. `window.__mv.views3d.delete(uid)`.
8. Make every public method a no-op (guard with `disposed`).
   **[measured]**: after dispose the container has 0 children and `renderer.info.memory.geometries === 0`, `textures === 0`.

### 5.13 Injected style (once per page, `<style data-for="three-view">`, tokens only, no literal colours)

```css
.three-view { position: relative; width: 100%; aspect-ratio: 4 / 3; min-height: 220px; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.three-view:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.three-view > canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; }
.three-view > canvas:active { cursor: grabbing; }
.three-hint { position: absolute; left: 8px; bottom: 8px; max-width: calc(100% - 16px); padding: 4px 8px;
  font: 12px/1.35 var(--font); color: var(--text-muted); background: var(--surface); border-radius: 6px;
  opacity: 0.92; pointer-events: none; transition: opacity 0.4s; }
.three-hint[data-hidden="true"] { opacity: 0; }
.three-reset { position: absolute; top: 8px; right: 8px; min-height: 36px; padding: 0 12px; font: 600 13px var(--font);
  color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.three-reset:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
@media (pointer: coarse) { .three-reset { min-height: 40px; } }
.three-status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px;
  text-align: center; font: 14px/1.4 var(--font); color: var(--text); background: var(--surface-2); }
@media (prefers-reduced-motion: reduce) { .three-hint { transition: none; } }
```
The standalone check page (7.3) defines the tokens itself, so these rules render the same as in the real app.

---

## 6. Mathematics

### 6.1 The scene frame

A maths point `(x, y, h)` (plane position and height) is drawn at three.js `(X, Y, Z) = (x, h, -y)`. As a matrix
`[[1,0,0],[0,0,1],[0,-1,0]]`, determinant `+1`. Seen from above (camera on +Y), x is right and y is up the screen, so
counterclockwise (increasing argument) looks counterclockwise. A camera at `(3, 3, 4)` looking at the origin sees the maths x axis running
to the right and toward the viewer, and the maths y axis running away and to the right (camera right vector `(0.8, 0, -0.6)`).

### 6.2 Stereographic projection

`z = x + iy`, `s = |z|^2`. `(X, Y, Z) = (2x, 2y, s - 1)/(s + 1)`.
Unit length: `4s + (s-1)^2 = (s+1)^2`. Inverse: `1 - Z = 2/(s+1)`, so `z = (X + iY)/(1 - Z)`;
also `|z|^2 = (1+Z)/(1-Z)`.
Special points: `0 -> (0,0,-1)` south pole; `1 -> (1,0,0)`; `i -> (0,1,0)`; `-1 -> (-1,0,0)`; `-i -> (0,-1,0)`;
`infinity -> (0,0,1)` north pole; the unit circle is the equator `Z = 0`.
Polar grid on the sphere: the circle `|z| = r` is the parallel `Z = (r^2-1)/(r^2+1)` of horizontal radius `2r/(r^2+1)`
(`r = 2`: `Z = 0.6`, radius `0.8`; `r = 1/2`: `Z = -0.6`, radius `0.8`; `r = 4`: `Z = 15/17`; `r = 1/4`: `Z = -15/17`);
the ray `arg z = theta` is the meridian at longitude `theta`.

**Circles and lines are plane sections.** `A(x^2+y^2) + Bx + Cy + D = 0` with `x = X/(1-Z)`, `y = Y/(1-Z)`,
`x^2+y^2 = (1+Z)/(1-Z)` becomes `BX + CY + (A-D)Z + (A+D) = 0`, a plane: every generalized circle is a circle on the sphere.

**Half-turn.** `1/z = (x - iy)/s` has `|1/z|^2 = 1/s`, so
`X' = 2(x/s)/(1/s + 1) = 2x/(1+s) = X`, `Y' = -2y/(1+s) = -Y`, `Z' = (1/s - 1)/(1/s + 1) = (1-s)/(1+s) = -Z`.
So `1/z` is `(X, Y, Z) -> (X, -Y, -Z)`: a rotation by pi about the X axis, the line through the plane points `1` and `-1`. In the scene
frame the X axis is the scene X axis, so `curves.rotation.x = Math.PI` applies `1/z` to a stroke. The fixed points `1` and
`-1` are on the axis; `0` and `infinity` swap.

### 6.3 Worked solution: problem 2.5.1, image of `|z - 1| = 1` under `w = 1/z`

**Cartesian.** `|z-1|^2 = 1` is `(x-1)^2 + y^2 = 1`, i.e. `x^2 + y^2 = 2x`. Put `z = 1/w`, `w = u + iv`:
`x = u/(u^2+v^2)`, `y = -v/(u^2+v^2)`, `x^2+y^2 = 1/(u^2+v^2)`. Then `1/(u^2+v^2) = 2u/(u^2+v^2)`, so **`u = 1/2`**:
the vertical line `Re w = 1/2` (the point `z = 0` goes to infinity and is not on the image).

**Polar.** Points of the circle are `z = 2 cos(t) e^{it}`, `t` in `(-pi/2, pi/2)` (the circle passes through 0). So
`1/z = e^{-it}/(2 cos t) = (cos t - i sin t)/(2 cos t) = 1/2 - (i/2) tan t`. Real part `1/2` for every `t`, imaginary part
`-(tan t)/2` sweeping all of the reals as `t` runs from `-pi/2` to `pi/2`: the whole line `Re w = 1/2`, run downward.

**Hand-checked numbers.**

| t | z | 1/z | stereographic(z) | stereographic(1/z) |
|---|---|---|---|---|
| 0 | 2 | 0.5 | (0.8, 0, 0.6) | (0.8, 0, -0.6) |
| pi/4 | 1 + i | 0.5 - 0.5i | (2/3, 2/3, 1/3) | (2/3, -2/3, -1/3) |
| -pi/4 | 1 - i | 0.5 + 0.5i | (2/3, -2/3, 1/3) | (2/3, 2/3, -1/3) |

Each right-hand column is `(X, -Y, -Z)` of the left: the half-turn. `|1+i|^2 = 2`: `X = 2/3, Z = (2-1)/3 = 1/3`; `|0.5-0.5i|^2 = 0.5`:
`X = 1/1.5 = 2/3`, `Z = (0.5-1)/1.5 = -1/3`.

**On the sphere.** The circle `x^2+y^2-2x = 0` has `A = 1, B = -2, C = 0, D = 0`, so its plane is `-2X + Z + 1 = 0`:
**`2X - Z = 1`** (check: `z = 2`: `1.6 - 0.6 = 1`; `z = 1+i`: `4/3 - 1/3 = 1`; `z = 0`: `0 + 1 = 1`). The line `u = 1/2` is `A = 0, B = 2, D = -1`:
`2X + Z - 1 = 0`, **`2X + Z = 1`** (check `0.5 - 0.5i`: `4/3 - 1/3 = 1`). The half-turn `(X, -Y, -Z)` maps plane `2X - Z = 1` to `2X + Z = 1`.
Both circles pass through the poles: the input through the south pole (z = 0), the image through the north pole (infinity).

### 6.4 Worked solution: problem 2.4.1, a branch of `z^(1/3)` continuous along the negative real axis

**Polar.** `z = r e^{i theta}`, `r > 0`. Choose the angle in a window of width `2 pi` whose seam `sigma` is not on the negative real axis;
with `sigma = 0` the window is `0 < theta < 2 pi`: `f(z) = r^(1/3) e^{i theta/3}`. On the negative real axis `theta = pi` always
(the window contains `pi` in its interior), so `f(-r) = r^(1/3) e^{i pi/3}` and `f` is continuous across it. At `z = -1`:
`f(-1) = e^{i pi/3} = 1/2 + (sqrt3/2) i`. The principal branch (`sigma = -pi`, window `(-pi, pi]`) agrees at `z = -1` exactly
(Arg is `pi`), but just below the axis (`Arg -> -pi`) it gives `e^{-i pi/3} = 1/2 - (sqrt3/2) i`: a jump, so it is not continuous there.

**Cartesian.** Solve `(u + iv)^3 = -1`: `u^3 - 3uv^2 + i(3u^2 v - v^3) = -1`. Imaginary part `v(3u^2 - v^2) = 0`. If `v = 0`: `u = -1`.
If `v^2 = 3u^2`: real part `u^3 - 9u^3 = -8u^3 = -1`, `u = 1/2`, `v = +-sqrt3/2`. The three cube roots of `-1` are `-1`, `1/2 + (sqrt3/2) i`,
`1/2 - (sqrt3/2) i`; the branch with window `(0, 2 pi]` picks the one with angle `pi/3`: `1/2 + (sqrt3/2) i`.

**On the Riemann surface** (`riemannPoint({n: 3, part: 'im'}, 1, theta)`, `theta` on the three sheets over `z = -1`):

| theta | w = e^{i theta/3} | h = Im w | other = Re w | sheet |
|---|---|---|---|---|
| pi | 1/2 + (sqrt3/2) i | 0.8660254038 | 0.5 | the branch `0 < theta < 2 pi` (and principal) |
| 3 pi | -1 | 0 | -1 | the real cube root |
| 5 pi | 1/2 - (sqrt3/2) i | -0.8660254038 | 0.5 | the third sheet |

`x = cos(theta) = -1`, `y = sin(theta) ~ 0` in all three rows. The surface closes after `n = 3` turns (`theta = 6 pi` is `theta = 0`),
and the branch point is the origin where all sheets meet.

### 6.5 Supporting worked values

**1.3.1 / helix.** `z = -1 + i sqrt3`: Cartesian `(-1, 1.7320508)`, `|z| = 2`. Polar `r = 2`, `Arg z = 2 pi/3 = 2.0943951`,
`arg z = {2 pi/3 + 2 pi k}`. Helix beads, `h = HELIX_PITCH * theta/(2 pi) = 1.2 (1/3 + k)`:

| k | theta | h |
|---|---|---|
| -2 | -10 pi/3 = -10.4719755 | -2.0 |
| -1 | -4 pi/3 = -4.1887902 | -0.8 |
| 0 (home) | 2 pi/3 = 2.0943951 | 0.4 |
| 1 | 8 pi/3 = 8.3775804 | 1.6 |
| 2 | 14 pi/3 = 14.6607657 | 2.8 |

Scene position of the home bead: `(-1, 0.4, -1.7320508)`. For `z = 1`: beads at `h = -2.4, -1.2, 0, 1.2, 2.4`. For `z = -1` (`Arg = pi`): `-1.8, -0.6, 0.6, 1.8, 3.0`.
For `z = -1 - 1e-9 i` (`Arg ~ -pi`): `-3.0, -1.8, -0.6, 0.6, 1.8`: the same stack shifted down one step; the home bead jumped from `0.6` to `-0.6`.
With `seam = 0`: `z = 1 + 1e-9 i` has `thetaHome = 1e-9`, home `h ~ 0`; `z = 1 - 1e-9 i` has `thetaHome = 2 pi - 1e-9`, home `h ~ 1.2`: the jump moved to the positive real axis.

**2.2.2 / the `n = 2` surface over `z = 2i`** (`riemannPoint({n: 2, part: 'im'}, 2, theta)`):

| theta | x, y | w = sqrt2 e^{i theta/2} | h = Im w | other = Re w |
|---|---|---|---|---|
| pi/2 (Arg 2i) | (0, 2) | sqrt2 e^{i pi/4} = 1 + i | 1 | 1 |
| pi/2 + 2 pi = 5 pi/2 | (0, 2) | sqrt2 e^{i 5pi/4} = -1 - i | -1 | -1 |

The principal square root `1 + i` is the sheet containing the home step; the other sheet carries `-1 - i`.

**`z^2` as `u + iv`, for the 4D graph.** `f(z) = z^2`. Cartesian: `u = x^2 - y^2`, `v = 2xy`. Polar (`z = r e^{i theta}`):
`u = r^2 cos 2 theta`, `v = r^2 sin 2 theta`. At `z = 1 + i`: Cartesian `u = 1 - 1 = 0`, `v = 2`; polar `r = sqrt2`, `theta = pi/4`,
`r^2 = 2`, `cos(pi/2) = 0`, `sin(pi/2) = 1`, giving `u = 0`, `v = 2`. The 4D point is `(1, 1, 0, 2)`.
With `{uv: pi/2}` it becomes `(1, 1, -2, 0)` (the shown surface is `-v`, hidden coordinate `u = 0`); then with `{yv: pi/2}`
applied after: `y' = y cos - v sin = 1*0 - 0*1 = 0`, `v' = y sin + v cos = 1`, giving `(1, 0, -2, 1)`.

### 6.6 The 4D rotations

`R_uv(a)`: `(u', v') = (u cos a - v sin a, u sin a + v cos a)`. `R_yv(b)`: `(y', v') = (y cos b - v sin b, y sin b + v cos b)`.
`rotate4` applies `R_uv` first, then `R_yv` (order matters; `[1,2,3,4]` with both `pi/2` gives `[1, -3, -4, 2]`, with the order
reversed it would not). Both preserve the Euclidean norm; `R_uv(-a)` inverts `R_uv(a)`.
**Meaning of the `uv` slider.** `u + iv = w`; `R_uv(a)` gives `u' + iv' = e^{ia} w`: the slider multiplies the output by `e^{ia}`, that is, it
spins the w-plane by `a`. The surface drawn at `uv = a` is the graph of `Re(e^{ia} f(z))`, and `a = pi/2` gives `Re(i f) = -Im f`, so the Re
surface turns into (the negative of) the Im surface while the hidden colour becomes `Re f`. Check at `1 + i`, `f = z^2 = 2i`:
`Re(i * 2i) = -2`, matching `(1, 1, -2, 0)` above.
**Meaning of `yv`.** It rotates the input's `y` against the output's `v`; at `pi/2` it swaps their roles (`y' = -v`, `v' = y`).

### 6.7 Lighting, colour and framing numbers

- Lambert diffuse in r160: outgoing = albedo/pi times (ambient irradiance + sum of directional `I cos(angle)`). With ambient `0.5 pi`
  and directional `0.5 pi`: facing the light `1.0` times albedo, edge-on `0.5` times albedo. **[measured]** centre pixel of a flat
  surface `(0.9, 0.1, 0.1)` lit straight on is `(230, 26, 26)`, matching `255 * (0.9, 0.1, 0.1) = (229.5, 25.5, 25.5)`.
- Hue colours `HSL(hue, 0.8, 0.5)`: `Arg 0` `(0.9, 0.1, 0.1)` -> pixel `(230, 26, 26)`; `Arg pi/2` `(0.5, 0.9, 0.1)` -> `(128, 230, 26)`;
  `Arg pi` `(0.1, 0.9, 0.9)` -> `(26, 230, 230)`; `Arg -pi/2` `(0.5, 0.1, 0.9)` -> `(128, 26, 230)`. **[measured]** in four
  quadrants of a top-down render: `(230,26,26)`, `(128,230,26)`, `(26,230,230)`, `(128,26,230)`.
- Frame distance: `dist = R * padding / sin(min(vFov, hFov)/2)`.

---

## 7. Verification plan

### 7.1 Commands

```
node --test tests/unit/i1-core-three.test.mjs          # A1, A2, A3 (geometry), pure helpers
npm test                                               # whole suite; other goals' failures are not this goal's
node tests/interact/i1-core-three.mjs                  # A4, standalone: own server, in-memory page, both viewports, screenshots
node tools/smoke.mjs --route home --script tests/interact/i1-core-three.mjs --out docs/review/iter-1/i1-core-three
                                                       # same checks through the project harness once any route loads clean
```
The standalone command needs no `index.html` and no station, so it works while the other wave-0 goals are still being built.
The harness command is for the integrator (use `--route graph4d` or `--route reciprocal` once those exist; `--dark` adds a dark-theme run).
Screenshots from the standalone command go to `docs/review/iter-1/i1-core-three/` (override with `--out <dir>`).

### 7.2 Unit tests, `tests/unit/i1-core-three.test.mjs` (Node, `node:test`)

Helper `near(a, b, eps)`; vector and scalar versions. All three.js usage is headless. The test file imports
`../../js/core/three-view.js` and must not need `document`.

**A1: stereographic projection is exact and 1/z is the half-turn**

| Case | Expected |
|---|---|
| `stereographic({re:0,im:0})` | `[0, 0, -1]` |
| `stereographic({re:1,im:0})` | `[1, 0, 0]` |
| `stereographic({re:0,im:1})` | `[0, 1, 0]` |
| `stereographic({re:-1,im:0})`, `({re:0,im:-1})` | `[-1,0,0]`, `[0,-1,0]` |
| `stereographic({re:2,im:0})`, `({re:0.5,im:0})` | `[0.8,0,0.6]`, `[0.8,0,-0.6]` |
| `stereographic({re:2,im:1})` | `[2/3, 1/3, 2/3]` (1e-12) |
| `stereographic({re:1,im:1})` | `[2/3, 2/3, 1/3]` |
| `stereographic({re:-1,im:Math.sqrt(3)})` | `[-0.4, 0.6928203230275509, 0.6]` (1e-12) |
| `stereographic({re:1e9,im:0})` | within `1e-8` of `[0,0,1]` (actually `[2e-9, 0, 1]`) |
| `stereographic({re:Infinity,im:0})`, `({re:0,im:-Infinity})` | `[0,0,1]` |
| `stereographic({re:NaN,im:0})` | all three NaN |
| `stereographic(2)` (plain number) | same as `({re:2,im:0})` |
| `inverseStereographic(stereographic({re:2,im:1}))` | `{re:2, im:1}` (1e-12) |
| `inverseStereographic([0,0,1])`, `([0,0,-1])` | `re === Infinity && im === Infinity`; `{re: 0, im: 0}` (compare with `Math.abs(...) < 1e-15`, since `-0` may appear) |
| `inverseStereographic(stereographic({re:-1,im:Math.sqrt(3)}))` | `{-1, 1.7320508075688772}` (1e-12) |
| unit length of `stereographic` for `z` in `{0, 1e-3, 0.4-0.2i, 2+i, -3+0.5i, 1e3, 1e9, 1e200}` | `abs(hypot - 1) < 1e-12` |
| half-turn, `z` in `{2+i, 1+i, 1-i, -3+0.5i, 0.2+7i}`: `s1 = stereographic(z)`, `winv = (x - iy)/(x^2+y^2)`, `s2 = stereographic(winv)` | `s2 = [s1[0], -s1[1], -s1[2]]` (1e-12); for `2+i`, `winv = 0.4-0.2i` |
| circle `abs(z-1) = 1`: 50 points `z = 2cos(t)(cos t, sin t)`, `t` from `-1.5` to `1.5` | every `stereographic(z)` has `abs(2X - Z - 1) < 1e-12` |
| line `Re w = 1/2`: points `0.5 - 0.5 i tan(t)`, same `t` | every `abs(2X + Z - 1) < 1e-12` |
| through `riemannSphere`: `sph = riemannSphere()`; `addCurve` of 100 points `t = -1.2 + 2.4k/99` (`k = 0..99`) of the circle `z = 2cos(t)(cos t, sin t)`, each given `t = k/99`; adjacent points are at most 0.064 rad apart on the sphere (max of `2abs(dz)/(1+abs(z)^2)` with `abs(dz) = 2*dt`), below the 0.08 subdivision step, so **every vertex is an input point** and the plane tests are exact; first check `setHalfTurn(0)`: every vertex (scene to plane with `fromScene`, divided by `1.004`) has `abs(2X - Z - 1) < 1e-9`; then `sph.setHalfTurn(Math.PI)`, `sph.group.updateMatrixWorld(true)`, apply `line.matrixWorld` to each position, convert, divide by `1.004` | `abs(2X + Z - 1) < 1e-9` for all (the half-turn applied to the stroke lands on the image line `Re w = 1/2`) |

**A2: 4D rotation**

| Case | Expected |
|---|---|
| `rotate4([1,2,3,4], {uv: Math.PI/2})` | `[1, 2, -4, 3]` (1e-12) |
| `rotate4(p, {})`, `rotate4(p, {uv:0, yv:0})` | deep-equals `p`, and is a new array (not `===`) |
| `rotate4([1,2,3,4], {yv: Math.PI/2})` | `[1, -4, 3, 2]` (equals `[x, -v, u, y]`) |
| `rotate4([1,2,3,4], {uv: Math.PI/2, yv: Math.PI/2})` | `[1, -3, -4, 2]` (order check) |
| `rotate4([1,1,0,2], {uv: Math.PI/2, yv: Math.PI/2})` | `[1, 0, -2, 1]` |
| `rotate4([0.3,-1.2,2.5,0.8], {uv: 0.7, yv: -1.3})` | norm equals `hypot(0.3,-1.2,2.5,0.8) = 2.9017236257` to 1e-12; result `[0.3, 1.8204304301, 1.3967313184, 1.7507640256]` (1e-9) |
| `rotate4(rotate4(p, {uv: a}), {uv: -a})` for `a = 0.9` | `p` (1e-12) |
| `project4to3([1,2,3,4])` | `[1, 2, 3]`, length 3 |
| `Re(e^{ia} w)` identity: `w = 1.5 - 0.5i`, `a = 0.9`, `rotate4([0,0,1.5,-0.5], {uv: 0.9})[2]` | `1.5 cos 0.9 + 0.5 sin 0.9` (1e-12) |

**A3: surfaces, sphere, disposal (geometry facts, Node)**

| Case | Expected |
|---|---|
| `surfaceFromFunction({f: z => z, nx: 7, ny: 5})` | is `THREE.Mesh`; `position.count === 35`, `color.count === 35`, `position.itemSize === 3`; `index.count === 144` (48 triangles = `6*4*2`); every index `< 35`; `material.vertexColors === true`; `material.side === THREE.DoubleSide`; `userData.vertexCount === 35`; has a child named `wire` that is `LineSegments` |
| wire index count, `nx = ny = 5` | `mesh.getObjectByName('wire').geometry.index.count === 80` (40 segments); with `wire: false` there is no `wire` child |
| modulus landscape of `z^2`, `xRange [-1,1]`, `yRange [0,1]`, `nx 3`, `ny 2` (vertex order `k = i + 3j`) | scene positions `[-1,1,-0], [0,0,-0], [1,1,-0], [-1,2,-1], [0,1,-1], [1,2,-1]` (1e-12; a `-0` equals `0`); colours (display) of vertices 0..5 = `argColor` of `w = 1, 0, 1, -2i, -1, 2i` i.e. hues `0, 0, 0, 0.75, 0.5, 0.25`: `(0.9,0.1,0.1)`, `(0.9,0.1,0.1)`, `(0.9,0.1,0.1)`, `(0.5,0.1,0.9)`, `(0.1,0.9,0.9)`, `(0.5,0.9,0.1)`; the stored `color` attribute holds `srgbToLinear` of those (e.g. vertex 3 = `[0.21404114, 0.01002283, 0.78741229]`) to 1e-7 |
| `argColor` pins | `{re:1,im:0}` -> `[0.9,0.1,0.1]`; `{re:0,im:1}` -> `[0.5,0.9,0.1]`; `{re:-1,im:0}` -> `[0.1,0.9,0.9]`; `{re:0,im:-1}` -> `[0.5,0.1,0.9]`; `{re:-1,im:-0}` (Arg `-pi`) -> `[0.1,0.9,0.9]` (no seam) (1e-9) |
| clamp and flags: `f(z) = 1/z` written by hand (`re = x/s, im = -y/s`, `s = x^2+y^2`) on `[-1,1]^2`, `nx = ny = 5`, `clamp = 1.5`, `modulusLandscape` | vertex 12 (`z = 0`): flag 2, scene height `0`, colour display `[0.5,0.5,0.5]` (linear `0.21404114`); vertices 7, 11, 13, 17 (`abs(z) = 0.5`): flag 1, height `1.5`; `userData.clampedCount === 4`, `nonFiniteCount === 1`, `flaggedCount === 5`; vertex 13 colour (`w = 2`, red, mixed 0.6 to grey) display `[0.66, 0.34, 0.34]` (1e-9) |
| winding: constant `f = () => ({re: 1, im: 0})`, `nx = ny = 3` | every normal `y > 0.999`; every height `1` |
| `reImSurface({f: z^2, part: 'im'})`, `[-1,1]^2`, `nx = ny = 3` | vertex 8 (`z = 1+i`): scene `(1, 2, -1)`, colour display `(33,145,140)/255`; vertex 5 (`z = 1`): scene `(1, 0, -0)`, colour `(253,231,37)/255` |
| `reImSurface({..., part: 're'})` same grid | vertex 8: scene `(1, 0, -1)`, colour `(253,231,37)/255`; vertex 5: scene `(1, 1, -0)`, colour `(33,145,140)/255` |
| `hiddenRamp` pins | `0 -> (68,1,84)/255`, `0.25 -> (59,82,139)/255`, `0.5 -> (33,145,140)/255`, `0.75 -> (94,201,98)/255`, `1 -> (253,231,37)/255`, `0.125 -> (0.2490196078, 0.1627450980, 0.4372549020)`, `NaN -> 0.5` colour, values outside `[0,1]` clamp |
| `riemannPoint({n:3,part:'im'}, 1, Math.PI)` | `[-1, ~0, 0.8660254038, 0.5]` (1e-9) |
| `riemannPoint({n:3,part:'im'}, 1, 3*Math.PI)` | `[-1, ~0, ~0, -1]` |
| `riemannPoint({n:3,part:'im'}, 1, 5*Math.PI)` | `[-1, ~0, -0.8660254038, 0.5]` |
| `riemannPoint({n:2,part:'im'}, 2, Math.PI/2)` | `[~0, 2, 1, 1]`; at `5*Math.PI/2`: `[~0, 2, -1, -1]` |
| `riemannSurfaceRoot()` defaults | `position.count === 3625` (`25*145`); `index.count === 20736` (`24*144*2*3`) |
| `riemannSurfaceRoot({n:2, rMax:1, nr:2, nTheta:4, part:'im'})` | 27 vertices, 96 indices (32 triangles). Vertex `i + 9j`: `(i=1, j=2)` scene `(~0, 0.7071067812, -1)`; `(i=5, j=2)` scene `(~0, -0.7071067812, -1)`; `(i=8, j=2)` equals `(i=0, j=2)` to 1e-12 (the seam closes) at `(1, ~0, ~0)`; vertex `(1,2)` colour = `hiddenRamp(0.5 + 0.5*0.7071067812)` = display `(0.6269017899, 0.8369663015, 0.2852273439)` |
| `graph4D({f: z => z, xRange:[-1,1], yRange:[-1,1], nx:3, ny:3, angles:{uv: Math.PI/2}})` | `mesh.geometry.attributes.position.count === 9`; vertex 8 (`z = 1+i`, point `(1,1,1,1)`) scene `(1, -1, -1)`; colour = `hiddenRamp(0.75)` = `(94,201,98)/255` (`S = 2`, hidden `1`) |
| same, then `setAngles({uv: 0, yv: Math.PI/2})` | vertex 8 scene `(1, 1, 1)` (maths `[1,-1,1]`), same colour; the `position` attribute object is the same instance before and after; `userData.version` increased |
| `graph4D` with `f = z^2`, `setAngles({uv: Math.PI/2, yv: Math.PI/2})` on the same grid | vertex 8 maths `[1, 0, -2]`, scene `(1, -2, -0)` |
| `graph4D` consistency: random angles `(0.7, -1.3)`, `f(z) = z^2`, `nx = ny = 9` | each vertex position equals `toScene(project4to3(rotate4([x,y,u,v], angles)))` (1e-5; positions are float32) |
| `argHelix({z: {re:-1, im: Math.sqrt(3)}})` | `userData.beads.length === 5`; bead heights (scene Y) `-2.0, -0.8, 0.4, 1.6, 2.8` (1e-6); home bead (index 2) scene `(-1, 0.4, -1.7320508)`; `floorPoint` scene `(-1, 0, -1.7320508)` |
| `update({re:1,im:0})` | heights `-2.4, -1.2, 0, 1.2, 2.4` |
| `update({re:-1,im:1e-9})` then `update({re:-1,im:-1e-9})` | home bead height `0.6` then `-0.6` (1e-6) |
| `update({re:1,im:1e-9}, 0)` then `update({re:1,im:-1e-9}, 0)` (seam 0) | home bead height `~0` then `~1.2` |
| `update({re:NaN,im:0})` | beads and fibre hidden, no throw |
| `riemannSphere()`: `project({re:1,im:0})`, `({re:0,im:0})`, `({re:0,im:1})`, `({re:2,im:0})`, `({re:Infinity,im:0})` | scene `(1,0,0)`, `(0,-1,0)`, `(0,0,-1)`, `(0.8,0.6,0)`, `(0,1,0)` (1e-12) |
| `riemannSphere({radius: 2}).project({re:0,im:1})` | `(0, 0, -2)` |
| sphere curves | `addCurve([{re:1,im:0},{re:0,im:1}], '--input')` returns an object with `isLine === true`; `curves.children.length === 1`; the 90 degree arc is subdivided: segment count `ceil((pi/2)/0.08) = 20` (so `position.count === 40`); every vertex has `length = 1.004` (1e-9); `clearCurves()` -> `curves.children.length === 0` and the geometry's `dispose` event fired |
| curve through infinity | `[{re:1e6,im:0},{re:Infinity,im:0},{re:-1e6,im:0}]`: no NaN in positions; the middle vertex is near `(0, 1.004, 0)` |
| gap | `[{re:1,im:0},{re:NaN,im:0},{re:0,im:1},{re:-1,im:0}]` yields segments only for the arc from `i` to `-1` (20 segments, 40 vertices); no vertex has scene `x > 1e-9`, so nothing bridges the NaN gap or reaches the first point `1` |
| time ramp | points with `t` give a `color` attribute whose first and last vertices differ; points without `t` give a uniform colour |
| `markInfinity(false)` / `(true)` | `userData.infinityMarker.visible` false / true |
| `curveToLine([[0,0,0],[1,2,3]], '--cart')` | `isLine === true`; scene positions `(0,0,0), (1,3,-2)`; with a `NaN` point in the middle of four points, only the last pair is a segment; `userData.update(p3)` with the same count keeps the same attribute object |
| `createMarker({position:[1,2,3]})` | `position` equals scene `(1, 3, -2)`; `userData.setPosition([0,0,1])` moves it to `(0, 1, -0)` |
| `toScene`/`fromScene` | `toScene([1,2,3]) = [1,3,-2]`; `fromScene(toScene(p)) = p` |
| `disposeObject` | with a `Group` containing a `Mesh` (geometry and material with a `DataTexture` map): the three `dispose` events fire; the group is detached from its parent; calling it again and `disposeObject(null)` do not throw |
| `srgbToLinear` | `(0) = 0`, `(1) = 1`, `(0.5) = 0.21404114048`, `(0.9) = 0.78741228940`, `(0.04) = 0.04/12.92` |
| module import | `await import('../../js/core/three-view.js')` succeeds in Node; `typeof createView3D === 'function'`; `createView3D()` and `createView3D({})` throw `TypeError`; `typeof document === 'undefined'` during the whole file |

### 7.3 Interaction script, `tests/interact/i1-core-three.mjs`

Structure:

```js
export default async function (page, ctx) { await runChecks(page, ctx.assert, ctx.log, ctx.shot) }   // for tools/smoke.mjs
// run directly: node tests/interact/i1-core-three.mjs [--out dir]
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await standalone()
```

`standalone()` starts a static server on 127.0.0.1 over the repo root (same MIME table as `tools/smoke.mjs`) that also serves
one in-memory page, `/__three-check.html`, containing: the token stylesheet below, `<body>`, nothing else. It loads Playwright the
way `tools/smoke.mjs` does (`import('playwright')`, falling back to the global `npm root -g`), launches Chromium with
`--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, and for each viewport in
`[{1280,860}, {390,844}]` opens the page, attaches `page.on('console')` (collect `error` and the text of `warning`) and
`page.on('pageerror')`, runs `runChecks`, saves screenshots under `--out` (default `docs/review/iter-1/i1-core-three`), and
exits non-zero on any failed assertion, console error or page error.

Token stylesheet for the in-memory page (so the module's CSS and tokens behave as in the app; light and dark):

```css
:root{--bg:#fff;--surface:#fff;--surface-2:#f3f4f6;--text:#111827;--text-muted:#4b5563;--border:#d1d5db;--focus:#2563eb;--cart:#2563eb;--polar:#c2410c;--input:#0f766e;--output:#7c3aed;--seam:#6b7280;--t0:#1e293b;--t1:#d97706;--radius:10px;--font:system-ui,sans-serif}
:root[data-theme=dark]{--bg:#111827;--surface:#111827;--surface-2:#1f2937;--text:#f3f4f6;--text-muted:#9ca3af;--border:#374151;--focus:#60a5fa;--cart:#60a5fa;--polar:#fb923c;--input:#2dd4bf;--output:#a78bfa;--seam:#9ca3af;--t0:#64748b;--t1:#fde68a}
body{background:var(--bg);color:var(--text);margin:0;font-family:var(--font)}
```

`runChecks(page, assert, log, shot)` (works on any page that is served from the repo root, because the module is loaded
inside the page with a relative dynamic import `import('./js/core/three-view.js')`; in harness mode it appends test hosts to
`document.body` and removes them at the end). Each step creates its own host (all hosts are fixed at the top-left, so they
overlap) and removes and disposes it before the next step, except the S1 view which S2 to S6 reuse and S11 disposes. Page-side code runs through `page.evaluate` and stores state on `window.__t3`.
Warnings are collected from `page.on('console')`; the harness itself fails on any `console.error`.

| Step | Do | Pass |
|---|---|---|
| S0 import | `window.__t3 = { m: await import('./js/core/three-view.js') }`; assert the exports listed in 4.1 to 4.3 exist and are functions | all present; `m.THREE.REVISION === '160'` |
| S1 view up | host div `position:fixed; left:0; top:0; width:min(400px,100vw); height:300px; background:#fff; z-index:2147483000`. `view = createView3D(host, { grid:false, axes:false, autoFrame:false, cameraPosition:[0,6,0.001], background:'#ffffff', hint:false })` | `view.unavailable === false`; `view.renderer.getContext()` exists; `host.querySelector('canvas')` exists; `host.getAttribute('role') === 'group'`; `#<id>-reset` exists and has text `Reset view` |
| S2 hue convention | `modulusLandscape` with `f` returning `1, i, -1, -i` for quadrants (x>0,y>0), (x<0,y>0), (x<0,y<0), (x>0,y<0) (all `abs = 1`, so the plane is flat at height 1), `nx = ny = 64`, `wire: false` (a mesh line could land on a sampled pixel), add, `view.renderNow()`, `drawImage` the canvas onto a 2D canvas, read four pixels at the canvas centre plus `(+72, -72)`, `(-72, -72)`, `(-72, +72)`, `(+72, +72)` pixels scaled by `canvas.height/300` (maths x right, maths y up the screen) | Q1 `(230,26,26)`, Q2 `(128,230,26)`, Q3 `(26,230,230)`, Q4 `(128,26,230)` each channel within 8. Proves hue convention, linear vertex colours, lighting normalisation, the scene frame and the camera orientation together |
| S3 on demand | `view.start()`; wait 400 ms twice, reading `view.renderer.info.render.frame`; then `view.requestRender()` and wait 150 ms | idle delta is 0 (allow 1 for a late first frame); the request adds exactly 1 |
| S4 resize | `host.style.width = '300px'`; wait 200 ms | `canvas.width === Math.round(300 * min(dpr, 2))` (300 at dpr 1) and `camera.aspect` within 0.01 of `300/300` |
| S5 theme | record `view.scene.background.getHex()`; set `document.documentElement.dataset.theme = 'dark'` and dispatch `new CustomEvent('themechange', {detail:{theme:'dark'}})` on `document`; wait 100 ms; read again; set `'light'`, dispatch, wait, read | dark value differs from light; the final value equals the first (background was `#ffffff` explicit in S1, so create a second view with `background:'--surface'` for this step) |
| S6 keyboard | focus the host; azimuth `atan2(x - tx, z - tz)` before; dispatch `keydown` `ArrowRight`; after; dispatch `keydown` `0` | azimuth changes by `0.12 +- 0.001`; after `0` the camera position equals the saved position within `1e-6`; the event `defaultPrevented` is true for handled keys |
| S7 pointer and wheel | Node side with `page.mouse`, on its own view with the default camera `[3,3,4]` (blur the page first so nothing is focused): record camera position; `mouse.move` to the canvas, `down`, `move` by (80, 30) in 6 steps, `up`; wheel without focus (add a `window` `wheel` listener recording `defaultPrevented`); click the canvas (focus); wheel again | drag changes the camera position by more than `0.1`; unfocused wheel: distance unchanged and `defaultPrevented === false`; focused wheel: distance decreased by more than `0.05` and `defaultPrevented === true` |
| S8 all helpers render | one view per helper (created with `grid: false, axes: false` so only the object draws), host 400 x 300: `modulusLandscape(z^2)`, `reImSurface(z^2, 'im')`, `riemannSurfaceRoot({n:3})`, `graph4D(z^2)` with `{uv:0.6, yv:0.3}`, `argHelix({z: -1 + i sqrt3, turns: 3})`, `riemannSphere()` with two curves; `renderNow()` each and read the canvas **in the same task** (a WebGL canvas without `preserveDrawingBuffer` is blank once it has been composited) | each canvas has more than 3 percent of pixels that differ from the corner pixel; zero page errors. Auto redraw: on the `graph4D` view read pixels A, call `setAngles({uv: Math.PI/2})` **without** `requestRender()`, wait 150 ms: `renderer.info.render.frame` rose by exactly 1; then `renderNow()` and read pixels B in the same task: more than 1 percent of pixels differ between A and B. Auto-frame: the `modulusLandscape(z^2)` view (auto-framed when added) has `controls.target` equal to the centre of `new THREE.Box3().setFromObject(mesh)` within 1e-6 and `camera.position.distanceTo(controls.target)` within 1 percent of `R * 1.25 / sin(min(vFov, hFov)/2)` with `R = box.getSize().length() / 2` |
| S9 sphere half-turn in the browser | `sph.addCurve` of the same 100 points of `abs(z-1) = 1` as in the A1 unit test (`t = -1.2 + 2.4k/99`, curve time `k/99`), `sph.setHalfTurn(Math.PI)`, `sph.group.updateMatrixWorld(true)`; transform the curve positions by the line's `matrixWorld`, scene to plane, divide by 1.004 | all points satisfy `abs(2X + Z - 1) < 1e-6`; with `setHalfTurn(0)` all satisfy `abs(2X - Z - 1) < 1e-6` |
| S10 no-WebGL state | `createView3D(host2, { forceUnavailable: true })` | no throw; `unavailable === true`; `host2` contains `.three-status` with text beginning `This 3D view needs WebGL`; `view.add(mesh)` and `view.dispose()` do not throw; after dispose `host2.children.length === 0` |
| S11 disposal and contexts | `info = view.renderer.info`; `view.dispose()` twice; then 24 times: create a view in a fresh host, add a `modulusLandscape`, `renderNow()`, `dispose()` | after dispose the host has 0 children, `info.memory.geometries === 0`, `info.memory.textures === 0`; the collected warnings contain no `Too many active WebGL contexts`; `window.__mv.views3d.size === 0` |
| S12 screenshot gallery | build a gallery `div` (`position:absolute; top:0; left:0; width:100%; box-sizing:border-box; padding:16px; background:var(--bg,#fff); z-index:2147483000; display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(min(100%, 340px), 1fr))`) with six labelled cells of height 260: landscape of `z^2`; Im surface of `z^2`; the `n = 3` Riemann surface; the 4D graph of `z^2` at `{uv: 0.6, yv: 0.3}`; the helix at `-1 + i sqrt3` with `turns: 3` and its seam ray; two spheres (input `abs(z-1) = 1` with ramp, and the same with `setHalfTurn(Math.PI)` and `showAxis(true)`). Wait for two frames, then `shot('gallery')`; repeat once with `data-theme="dark"`: `shot('gallery-dark')`. Dispose everything, remove the gallery | files written; the page has no horizontal overflow at 390 wide (`document.documentElement.scrollWidth - clientWidth <= 1`) |

What passing looks like: `node tests/interact/i1-core-three.mjs` prints one `ok` line per step for each viewport and ends with
`i1-core-three: all checks passed`; exit code 0; zero console errors and zero page errors (warnings such as
`GPU stall due to ReadPixels` from the pixel reads are expected and ignored; the only warning text that fails a step is
`Too many active WebGL contexts`). Under `tools/smoke.mjs` the route's own checks run first and the script then adds these.

### 7.4 Criteria

| Id | Method | Passing |
|---|---|---|
| A1 | `node --test tests/unit/i1-core-three.test.mjs` (the A1 block above) | all A1 cases pass; plus S9 in the browser |
| A2 | same file, the A2 block | all A2 cases pass |
| A3 | the A3 unit block plus the reviewer's code inspection checklist (Appendix C) | counts, flags, `vertexColors`, `DoubleSide`, clamp, grey, `hypot` and hue formulas verified in tests and in code |
| A4 | `node tests/interact/i1-core-three.mjs` and the screenshots `gallery` and `gallery-dark` for both viewports | zero console errors, S1 to S12 pass, the build report links the screenshots; reviewer reads them with the image tool: the six helpers are visible, coloured per 3.1, readable in both themes, no overflow at 390 |

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| `f` throws, or returns a non-object, or a NaN component | Grey vertex, flag 2, height 0 (or `+-clamp` if the height callback returns `+-Infinity`). The mesh topology never changes, so `setFunction` can reuse buffers. |
| Poles (`1/z`, `z^2/abs(z)^2` at `z = 0`) | Finite values beyond `clamp` form a plateau at `clamp` mixed toward grey; exact non-finite is grey at height 0 (for `abs(w)`: `+clamp`, since `hypot(Infinity, NaN) = Infinity`). Stations say what grey means. |
| `nx` or `ny` below 2, above 512, or not an integer | Sanitised to `[2, 512]` integers. `nx*ny > 65535` switches the index to `Uint32Array` (WebGL2 in r160). |
| Reversed or equal ranges | A reversed range (`[2,-2]`) works (the grid runs the other way and the winding flips, DoubleSide hides it). An equal range collapses to a line; no crash. Non-finite range entries fall back to `[-2, 2]`. |
| `clamp <= 0` or not a number | Treated as 6. |
| `riemannSurfaceRoot` at `r = 0` | The innermost ring collapses to one point; degenerate triangles have zero-length normals and shade as a dark dot at the branch point. |
| Sphere curve with a segment of angular length at least `pi - 1e-6` | The line breaks there (antipodal points have no unique short arc). |
| Sphere curve points beyond 1e154 | The overflow-safe branch of `stereographic` keeps them on the sphere. |
| Points at exactly `0` or `Infinity` | South pole and north pole. |
| `argHelix` with `z = 0` | `Arg 0 = 0`; beads at `h = 1.2 k`, all on the axis. `z` far outside `rMax`: drawn anyway; the ribbon is just smaller than the radius. `z` with NaN or Infinity: markers hidden. |
| Container detached or zero-size | `resize()` skips; observer fires on layout. |
| `devicePixelRatio` changes while mounted | Picked up at the next `resize()` (no listener for monitor changes). |
| `dispose()` twice, `add()` after `dispose()` | Safe no-ops. |
| An object added to two views | Unsupported; disposal in one view would break the other. |
| Token missing or CSS colour unparsable | `FALLBACK_TOKENS` for tokens; mid-grey for an invalid string. No exception. |
| Frame callback throws | Logged once, unsubscribed, loop continues. |
| Theme change while a surface is mounted | Chrome recolours via `themeRefresh`; data colours do not change. |
| Context lost then restored | Paused with the status text, resumes with `requestRender()`. |
| Many views on one page | Each owns a context; the practical limit is 16; `dispose()` calls `forceContextLoss()` so mount/unmount cycles never accumulate. |

### 8.2 Performance plan

| Item | Budget |
|---|---|
| `surfaceFromFunction` 96 x 96 | 9216 `f` evaluations, about 18,050 triangles; build well under 20 ms in a modern browser; normals once. |
| `riemannSurfaceRoot` default | 3625 vertices, 6912 triangles; build under 5 ms. |
| `graph4D` 64 x 64 `setAngles` | 4096 vertices of rotation plus colour plus normals: about 2 ms; allocation free in the loop (typed arrays, `cos/sin` hoisted, no per-vertex arrays). Slider-driven calls are fine at 60 Hz. |
| Draw calls per view | surface 1, wire 1, floor grid 1, axes 3, label sprites 3, helix about 14, sphere about 20. |
| Frames | On demand only (5.12). A static view schedules no frames. Off-screen views schedule none. Damping settles in 45 idle frames and stops. |
| Pixels | `pr = min(dpr, 2, max(1, sqrt(2.1e6 / (w*h))))`; a 1280 x 860 canvas at dpr 2 renders at about 1.38. Target at least 30 fps for 3D (CONSTRAINTS). |
| Memory | `dispose()` frees geometry, materials, textures, the renderer and the GL context; verified by `info.memory` and the 24-cycle check. |
| No dynamic quality governor in iteration 1 | Keep the code small; the pixel budget is the only adaptive part. |
| Headless swiftshader | Slow but correct; tests assert counts and deltas, never frame rates. |

### 8.3 Accessibility

- The container is a focusable group with `aria-label`, `aria-roledescription="3D view"` and `aria-describedby` pointing at the hint, so a screen
  reader hears how to operate it; the canvas is `aria-hidden`. The picture is not the only carrier of meaning: stations pair it with a
  text readout and the explainer, as CONSTRAINTS requires.
- Everything the mouse does has a keyboard equivalent (2.4). The Reset button is a real `<button>` with a visible label.
- Visible focus ring on the container and the button (`--focus`).
- Colour is never the only channel: in the landscape the height already carries `|w|`, the hue only adds the angle; in the Re/Im surfaces and the 4D graph
  the drawn position carries the shown coordinates, and stations print the numbers in a readout.
- Contrast: hint and button text use `--text` and `--text-muted` on `--surface` and `--surface-2`, which the shell guarantees at AA in both themes.
- Hint text is real DOM text, not drawn in the canvas.

### 8.4 Reduced motion

- `prefers-reduced-motion: reduce` turns off OrbitControls damping and forces `autoRotate` off (also when the preference changes while mounted).
- The hint fade uses no transition. The module starts no animation of its own: all motion is user-driven, or a station's own animation through `onFrame`
  (stations must honour the same preference).

### 8.5 Phone layout (390 px)

- The container is `width: 100%` with `aspect-ratio: 4/3` (about 358 x 268 inside the 16px gutters) and `min-height: 220px`; the canvas is absolutely positioned inside it,
  so it never creates horizontal overflow. The gallery grid collapses to one column below 340 px.
- Coarse pointers use `touch-action: pan-y`: vertical swipes scroll the page, sideways swipes turn the view, two fingers zoom and pan. The hint says so.
- Reset button 40 px high on coarse pointers; hint wraps to at most two lines.
- Pixel ratio is capped at 2 and by the 2.1 million pixel budget, which keeps phone GPUs comfortable.

---

## 9. Out of scope

Station UIs and legends (stations own the readouts, captions and any colour legend; `hiddenRampCss()` is provided); the Lab and its tabs;
2D domain colouring (`domaincolor.js`); the 2D plane (`plane.js`); parsing `f` (`parse.js`); pushing curves through `f` (`mapping.js`; the sphere and
`curveToLine` take points the caller already computed); picking and hover read-outs in 3D (raycasting); animation of the morph or the half-turn
(a station drives `setHalfTurn` and `setAngles` from its own clock); fat lines; text beyond axis sprites; shadows, post-processing, WebGPU, VR;
exporting images or models; a dynamic quality governor; saving the camera across sessions.

Requests for other owners (recorded for the orchestrator, no file outside this goal is edited):
1. `docs/ARCHITECTURE.md` 3.12 should list the additions in section 0 so stations see the frame convention and the extra exports.
2. The integrator should compare `rampRgb` here with `plane.js` `rampColor` for parity once both exist.

---

## Appendix A: expected values (unit-test numbers in one place)

| Quantity | Value |
|---|---|
| `stereographic(0)`, `(1)`, `(i)`, `(-1)`, `(-i)` | `[0,0,-1]`, `[1,0,0]`, `[0,1,0]`, `[-1,0,0]`, `[0,-1,0]` |
| `stereographic(2)`, `(0.5)` | `[0.8,0,0.6]`, `[0.8,0,-0.6]` |
| `stereographic(2+i)`, `(0.4-0.2i)` | `[2/3,1/3,2/3]`, `[2/3,-1/3,-2/3]` |
| `stereographic(1+i)`, `(0.5-0.5i)` | `[2/3,2/3,1/3]`, `[2/3,-2/3,-1/3]` |
| `stereographic(-1+i sqrt3)` | `[-0.4, 0.6928203230, 0.6]` |
| `stereographic(1e9)` | `[2e-9, 0, 1]`, within 1e-8 of the north pole |
| Circle `abs(z-1) = 1` on the sphere | plane `2X - Z = 1`; image line `Re w = 1/2` is plane `2X + Z = 1` |
| `rotate4([1,2,3,4], {uv: pi/2})` | `[1,2,-4,3]` |
| `rotate4([1,2,3,4], {yv: pi/2})` | `[1,-4,3,2]` |
| `rotate4([1,2,3,4], {uv: pi/2, yv: pi/2})` | `[1,-3,-4,2]` |
| `rotate4([1,1,0,2], {uv: pi/2, yv: pi/2})` | `[1,0,-2,1]` |
| `rotate4([0.3,-1.2,2.5,0.8], {uv: 0.7, yv: -1.3})` | `[0.3, 1.8204304301, 1.3967313184, 1.7507640256]`, norm 2.9017236257 |
| `argColor`: Arg 0, pi/2, pi, -pi/2 | `(0.9,0.1,0.1)`, `(0.5,0.9,0.1)`, `(0.1,0.9,0.9)`, `(0.5,0.1,0.9)` |
| Rendered pixels for those four (lit straight on) | `(230,26,26)`, `(128,230,26)`, `(26,230,230)`, `(128,26,230)` [measured] |
| `srgbToLinear(0.5)`, `(0.9)`, `(0.1)`, `(0.8)` | `0.2140411405`, `0.7874122894`, `0.0100228256`, `0.6038273389` |
| `hiddenRamp(0.75)`, `(0.5)`, `(1)`, `(0.125)` | `(94,201,98)/255`, `(33,145,140)/255`, `(253,231,37)/255`, `(0.2490196078, 0.1627450980, 0.4372549020)` |
| `riemannPoint` n=3 at r=1, theta = pi, 3pi, 5pi | h = `0.8660254038`, `0`, `-0.8660254038`; other = `0.5`, `-1`, `0.5` |
| `riemannPoint` n=2 at r=2, theta = pi/2, 5pi/2 | h = `1`, `-1`; other = `1`, `-1` |
| Default `riemannSurfaceRoot` | 3625 vertices, 20736 indices |
| Small root grid (n=2, rMax=1, nr=2, nTheta=4) | 27 vertices, 96 indices; `(i=1,j=2)` scene `(0, 0.7071067812, -1)` |
| Helix at `-1 + i sqrt3`, turns 2 | bead heights `-2.0, -0.8, 0.4, 1.6, 2.8`; home scene `(-1, 0.4, -1.7320508)` |
| Helix at `1`; at `-1`; at `-1 - 1e-9 i` | `-2.4,-1.2,0,1.2,2.4`; `-1.8,-0.6,0.6,1.8,3.0`; `-3.0,-1.8,-0.6,0.6,1.8` |
| Sphere projections (scene frame) | `1 -> (1,0,0)`, `0 -> (0,-1,0)`, `i -> (0,0,-1)`, `2 -> (0.8,0.6,0)`, `infinity -> (0,1,0)` |
| Sphere curve arc `1 -> i` | 20 segments, 40 vertices, every vertex length `1.004` |
| Sphere body | `SphereGeometry(R, 64, 48)`: 3185 vertices |
| 5 x 5 surface wire | 40 segments, 80 indices |
| Clamp example (1/z, `[-1,1]^2`, 5 x 5, clamp 1.5) | clamped vertices 7, 11, 13, 17 (height 1.5); non-finite vertex 12 (height 0, grey); `flaggedCount` 5 |
| Frame distance for a box of size (4, 6, 4) | `R = 4.1231056`, `dist = 13.4677` (padding 1.25, vertical fov 45) |

## Appendix B: how the stations call it (so they never import three.js)

```js
// lazy load after first paint; the container shows "Loading the 3D view..." until it resolves
const T = await import('../core/three-view.js');
const view = T.createView3D(box, { label: 'Modulus landscape of z squared', axisLabels: ['Re z', 'Im z', '|w|'], gridSize: 4 });

// graph4d / lab: the 4D graph and its two sliders
const g = T.graph4D({ f, xRange: [-2, 2], yRange: [-2, 2] });  view.add(g.mesh);
uvSlider.oninput = () => g.setAngles({ uv: +uvSlider.value });          // redraws by itself
// a stroke lifted into the same shadow:
const pts = stroke.map(z => { const w = f(z); return T.project4to3(T.rotate4([z.re, z.im, w.re, w.im], angles)); });
const line = T.curveToLine(pts, '--input');  view.add(line);            // line.userData.update(pts) when angles change

// branches: the three-sheet surface and a marker on the current sheet
const surf = T.riemannSurfaceRoot({ n: 3 });  view.add(surf);
const dot = T.createMarker({ color: '--output' });  view.add(dot);
dot.userData.setPosition(T.riemannPoint({ n: 3, part: 'im' }, r, argUnwrapped + 2 * Math.PI * k).slice(0, 3));

// staircase: the helix; the seam slider passes its angle as the second argument
const helix = T.argHelix({ z, turns: 3 });  view.add(helix.group);       helix.update(z, seam);

// reciprocal: the sphere; 1/z is the half-turn of the strokes
const sph = T.riemannSphere();  view.add(sph.group);  sph.addCurve(circlePoints, '--input');
sph.showAxis(true);  sph.setHalfTurn(s * Math.PI);                       // s from 0 to 1 on the station's own clock
```

## Appendix C: build order and reviewer checklist

**Build order (each step testable before the next).**
1. Pure maths and colour helpers (5.1, 5.2, 5.5), `riemannPoint`; their unit tests (A1, A2).
2. `buildGridIndex`, `surfaceFromFunction`, `modulusLandscape`, `reImSurface`; A3 geometry tests.
3. `riemannSurfaceRoot`, `graph4D`; tests.
4. `curveToLine`, `createMarker`, `disposeObject`, auto-redraw; `riemannSphere`, `argHelix`; tests.
5. `createView3D` core: renderer, camera, controls, lights, loop, resize, dispose, registry; S1 to S4, S10, S11.
6. Furniture, labels, theme refresh, overlays, keyboard, wheel gate, touch action, context events, auto-frame; S5 to S9, S12.
7. Run all commands in 7.1; read the screenshots; record deviations in the build report.

If time forces a cut, drop in this order and record each as a deviation: axis label sprites, the polar floor grid, the sphere labels, `showAxis`. Do **not** cut:
linear vertex colours, the scene frame, `forceContextLoss`, render-on-demand, the unavailable state, or the unit tests.

**Reviewer checklist (A3 code inspection).**
- Imports are exactly the two vendor imports; no DOM or WebGL access at module top level; the file imports in Node.
- `surfaceFromFunction`: `nx*ny` positions and colours; `(nx-1)*(ny-1)*2` triangles; `vertexColors: true`; `DoubleSide`; heights clamped; non-finite grey; flags and counts in `userData`.
- Vertex colour attributes hold **linear** values (`srgbToLinear`), colour callbacks and ramps are display space.
- `modulusLandscape` height is `Math.hypot(w.re, w.im)`; hue is `atan2(w.im, w.re) / (2 pi)` wrapped to `[0, 1)`.
- Positions pass through the `(x, h, -y)` frame everywhere; `curveToLine` and a marker's `setPosition` take maths triples, `riemannPoint` returns one.
- `rotate4` order and signs match section 4.1; `graph4D` updates the same attribute objects in place.
- Every mutator calls `notify`; `view.add` registers `requestRender`.
- `dispose()` removes every listener it added (including the capture-phase `wheel`), disconnects all observers, disposes textures, calls `forceContextLoss()`, and is idempotent.
- No `useLegacyLights` access; no literal colours outside `FALLBACK_TOKENS` and the injected CSS uses only tokens.
- No console output on the happy path.

---

## Appendix D: build notes (written by the builder, iteration 1)

Everything in sections 4 to 8 was built as written, with the differences below. Each one is small, was forced by a
contradiction inside this design or by what the screenshots showed, and is covered by a test.

| # | Where | Design said | Built | Why |
|---|---|---|---|---|
| D1 | 5.8 `riemannSurfaceRoot` | `nTheta = clampInt(nTheta, 8, 400)` | `clampInt(nTheta, 2, 400)` | Section 7.2 and Appendix A require `nTheta: 4` to give 27 vertices and 96 indices; a minimum of 8 makes that impossible. |
| D2 | 7.2 A1, A3 tolerances | sphere-stroke plane residual `< 1e-9`; root-surface positions to 1e-12 | residual `< 1e-6`; positions read from a `BufferAttribute` at 1e-6 (integers and exact doubles stay at 1e-12) | Positions and colours are `Float32Array` (WebGL cannot take doubles); float32 resolution is about 6e-8. The exact identity is still tested to 1e-12 on the pure `stereographic` output. |
| D3 | 7.2 A3 `graph4D` consistency | `z^2` on `[-2,2]^2`, default clamp | same, with `clamp: 10` | The default clamp is 6 and `z^2` reaches 8 at the corners, so those vertices are clamped before rotation (as 5.7 specifies). A second assertion pins the clamp-then-rotate behaviour. |
| D4 | 7.3 S4 | `canvas.width === round(300 * min(dpr, 2))` | `canvas.width === round(host.clientWidth * min(dpr, 2))` | The container has the 1px border from 5.13 (`box-sizing: border-box` added so `width: 100%` cannot overflow a phone), so a 300px container has `clientWidth` 298 and the canvas fills the padding box. The 300 came from a prototype without the border. |
| D5 | 7.3 S8 | landscape box `(4, 6, 4)` | `(4, 5.9991, 4)`; the distance formula is checked exactly | An even 96 point grid has no vertex at `z = 0`, so the lowest height is `2 * 0.0211^2`. |
| D6 | 2.4 keyboard | ArrowRight "changes the azimuth by exactly 0.12" | ArrowRight is `+0.12` (camera orbits to the right), ArrowLeft `-0.12`; the tilt clamp `[0.05, pi - 0.05]` applies only when tilting | First build clamped on every key, which snapped a top-down camera off the pole on the first sideways press. |
| D7 | 5.12 axis labels, 5.10 sphere labels | sprites `scale (0.6, 0.3, 1)` world units | `sizeAttenuation: false`; `applyLabelScales` sets the size on every resize and `add` so the text is about 14 CSS px (sphere labels 12 px), scaled 0.85 to 1.15 by view height | Auto-framing puts the camera 13 to 19 units away, where a 0.6 unit sprite is about 5 px of text. Unreadable at every size. |
| D8 | 5.9 helix bead sizes | floor point radius 0.09, beads 0.07 | floor point 0.15, beads 0.12 (home bead still x1.7) | At the auto-framed distance the beads were 2 to 3 px, and the beads are the point of the picture. |
| D9 | 5.12 `fitTo` | frames by the half-diagonal of the union box | same, except an object may set `userData.frameRadius`; it is then framed as a ball of that radius around its position and merged with the box of the rest | The half-diagonal over-pads a ball by about 1.7: the sphere filled 22 percent of the view. `riemannSphere` sets `frameRadius = radius`, so it fills about 80 percent at padding 1.25. Box-only scenes (all the surfaces) are unchanged: `R = size.length() / 2`, `dist = R * padding / sin(min(vFov, hFov) / 2)`. |
| D10 | 4.2 `reImSurface` | `name` only | also sets `userData.kind` (`'re-surface'` or `'im-surface'`), `userData.part`, `userData.hiddenScale` | Lets a station print the colour scale of the legend. |
| D11 | 5.11 `curveToLine.update` | replace attribute when count changes | also frees the replaced GL buffers (`geometry.dispose()` before the swap, which re-registers on the next render) and writes the index in place when its length is unchanged | A stroke redrawn every pointer move would otherwise leak a buffer per call. |
| D12 | 4.3 `window.__mv` | `views3d` Map created if absent | also creates `__mv.planes` if absent | `plane.js` and this module both create `window.__mv`; whichever loads first must not break the other. (`plane.js` already guards its own.) |

Added checks beyond the S0 to S12 table (all in `tests/interact/i1-core-three.mjs`): S13 context lost and restored,
S14 an off-screen view schedules no frames, S15 `onFrame` (cadence, unsubscribe, a throwing callback is logged once and
dropped), S16 reduced motion (damping and autoRotate off, also on a live change, hint has no transition), S17 coarse pointer
(`touch-action: pan-y`, coarse hint text) and the hint hiding on first pointerdown. Extra unit tests: sanitising and hostile `f`,
`Uint32` indices past 65535 vertices, antipodal sphere segments, `graph4D` clamp-then-rotate, notification counts for every mutator,
no console output on the happy path.

Measured here (Node, cold JIT): `modulusLandscape` 96 x 96 24 ms, `reImSurface` 16 ms, `riemannSurfaceRoot` default 4.6 ms,
`graph4D` 64 x 64 `setAngles` 2.6 ms, `argHelix` 3.7 ms, `riemannSphere` 4.5 ms. In headless swiftshader: idle 0 renders in 800 ms,
24 create/dispose cycles log 0 `Too many active WebGL contexts` warnings and leave `info.memory` at 0.

Notes for the stations (all in the module's own terms, nothing else needs to change):
- `createView3D` puts the canvas first in the container but leaves other children alone; a station that shows
  `Loading the 3D view...` must clear that text before calling it.
- For a tighter fit than the default, call `view.fitTo(obj, { padding: 1.0 })` after `add`; padding below 1 crops.
- `hiddenRampCss()` is the legend gradient; hue wheel always means Arg, the ramp always means a signed real number; grey means cut off or undefined.
- `view.id` is the uid used in `#<id>-reset`, `#<id>-hint`, `#<id>-canvas`; it equals `container.id` when the container has one.
