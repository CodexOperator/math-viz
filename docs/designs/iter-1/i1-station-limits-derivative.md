# Design: i1-station-limits-derivative

Stations `limits` (`js/stations/limits.js`) and `derivative` (`js/stations/derivative.js`).
Designer: stage 2, iteration 1. Binding inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md`,
`docs/ARCHITECTURE.md` (sections 3, 4, 5, 8, 9, 10), the goal entry in `docs/goals/iter-1.json`, and the wave-0 code
(`complex.js`, `parse.js`, `plane.js`, `katex.js`, `explainer.js`, `staircase.js`, `functions.js`, `problems.js`, `app.js`,
`tests/interact/_helpers.mjs`, `tools/smoke.mjs`). Every number in this file was recomputed with the real modules
(`localLinear`, `directionalQuotients`, `compile`, `fmtCart`, ...) in Node; the TeX strings were rendered with the vendored
KaTeX with `throwOnError: true`.

> **Residue cleanup (iteration 1).** Every word on every plane of both stations goes through the plane's `createLabelPlacer` in a layer above the curves (order 120; the curves are `obstacle: true`), and `drawLabel` is no longer imported; the derivative's z0 handle has no DOM word (`label: ''`, `symbol: 'z0'`) and the word `z0` is drawn on the canvas, because the ring is larger than any side of the handle's own word can clear; `+`, `-` and the keys on the z-plane keep z0 where it is on screen and the wheel keeps it inside a 40 px inset; the reference ray of the spin arc is drawn at alpha 0.6 (D6 is applied); the quotient plane's polar words are `polarWords` (`r = ...` and one line `Arg A = ... (also ..., ...)`); the copy says "z-plane" and "w-plane", not "left" and "right" (the planes stack on a phone); `ensureStationStyle()` is reference counted; the ε-δ footer reads `same radius` or `same comparison`; the `state()` of both stations carries `words`. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

Reading order for the builder: section 4 (what to export), section 5 (algorithms), section 2.5 (copy), section 6 (maths and test
values), section 7 (the tests you must write). Section 2 is the picture; section 3 is the colour rules.

---

## 1. Goal restatement, story thread, coverage

### 1.1 The goal in one paragraph

Two stations that are one idea at two zoom levels.

- `limits` (Chapter 2, topic T2.3): walk into the puncture z = 0 along a path of your choice and watch the value g(z) on the
  w-plane. For both test functions g depends **only on the direction you arrive from**, so the values from all directions fill a
  **circle** ("the circle of directional values"). A limit exists only if that circle is a single point. A small epsilon-delta
  panel makes "close enough" concrete.
- `derivative` (Chapter 3, topic T3.1): put z0 under a microscope. A ring of 12 direction arrows around z0 is carried by f; the
  image of the ring is a ring (spun and scaled) exactly when f is differentiable. A third panel plots the difference quotient for
  every direction: it traces a circle with centre A and radius |B|, and f'(z0) exists exactly when that circle is a single point
  (B = 0). The two stations draw the same circle with the same helper (`drawDirectionCircle`, exported by `derivative.js`).

### 1.2 Story thread carried

Thread 3 (motion and zoom), "a limit exists when the circle of directional values is a point", with Thread 1 (two addresses) and
Thread 2 (arg versus Arg) running through every panel.

| Idea | Where it is on the screen |
|---|---|
| One point, two addresses | Both explainers (`limits-ex`, `derivative-ex`) have a Cartesian column and a polar column with live numbers. Cartesian is the "two paths, two numbers" address (x real, y imaginary: the textbook solution of 2.3.1, P5, 3.1.2, P6). Polar is the "one circle" address (h = rho e^{i phi}, z = r e^{i theta}). The problem card says which address makes each problem easy and why (from `problems.js`). |
| The point z, the set arg z, the chosen Arg z | `limits`: the point z(t) is drawn once on the z-plane with its **Arg z** arc (solid). The value g(t) is drawn once on the w-plane with its polar address: **Arg g** solid arc, **ghost windings** "also ..." for the set arg g, and a **staircase** widget (`limits-stairs`, label "arg g") whose home row is Arg g. g = e^{2 i theta} doubles the angle, so the opposite approach (theta + 180 degrees) lands on the same point: two different names in arg z, one point g. `derivative`: the direction of the step is drawn as one solid arc "Arg h"; the quotient's polar address (A, with Arg A the spin of the derivative) is drawn on the quotient plane with ghost windings "also ...". |
| Input versus output as time | Both stations draw the z-side stroke in `--input` and its image in `--output` with the time ramp (dark to light). `limits`: the ramp is the walk toward 0 (arrowhead at the arrival), a cursor rides both planes on one clock; a Walk button plays it. `derivative`: the ring is a tiny circle z0 + rho e^{2 pi i s}, its image is the same ramp carried by f, so a reversed order (conj z) is visible as a reversed ramp. |
| Zoom | `limits`: the toggle "Zoom in as you get close" keeps the z-plane window proportional to \|z(t)\|. Along y = x^2 the curve flattens onto the real axis (the tangent direction decides the limit); the spiral stays a spiral at every zoom (the direction never settles). `derivative`: the ring size slider is the microscope power; both planes share one scale; the quotient circle collapses as rho shrinks (button "Shrink the ring"). |
| Both stations are one picture | Same dashed circle, same dots, same colours; each links to the other (`limits-to-derivative`, `derivative-to-limits`). P5 and P6 are literally the same circle (centre 1/2, radius 1/2): the P5 function is the difference quotient of Re z at 0. |

### 1.3 Review problems and topics covered

| Id | Statement (handout) | Station | Address that makes it easy | Preset |
|---|---|---|---|---|
| 2.3.1 | lim (x^2 - y^2 + i2xy)/(x^2 + y^2) as z -> 0 along y = x^2 | `limits` | Polar (z/conj z = e^{2 i theta}) | `#problem-2-3-1`: g = z^2/abs(z)^2, path y = x^2 |
| P5 | Show lim (Re(1 + z) - 1)/z does not exist | `limits` | Polar (x/z = cos theta e^{-i theta}) | `#problem-P5`: g = (Re(1+z) - 1)/z, path line y = 0 |
| 3.1.1 | limit definition: z^2 + z is differentiable everywhere, find f'(z) | `derivative` | Cartesian (expand (z + h)^2) | `#problem-3-1-1`: f = z^2 + z, z0 = 1 + i |
| 3.1.2 | f(z) = abs(z)^2 differentiable only at 0, nowhere analytic | `derivative` | Polar (h = rho e^{i phi}) | `#problem-3-1-2`: f = abs(z)^2, z0 = 1 + i, hint "drag z0 to 0" |
| P6 | Show f(z) = Re(z) is not differentiable | `derivative` | Either | `#problem-P6`: f = Re z, z0 = 0.3 - 0.7i |

Topics: T2.3 (limits: showing a limit does not exist by approaching along different curves, and the epsilon-delta picture) and T3.1
(limit definition, differentiable versus continuous via conj z, analytic versus differentiable at a point via abs(z)^2,
singular point via 1/z, chain of chips z^3 and e^z as sanity checks).

### 1.4 Differences between `ARCHITECTURE.md` and the code that matter here

The code wins. Nothing below contradicts the signatures in ARCHITECTURE section 3; these are behaviours the builder must know.

1. `drawPolarAddress` returns without drawing anything when the ray 0 -> z is shorter than 6 px (z "nearly 0"), arc and labels
   included. The `limits` z-plane is always about a point near 0, so it draws its own direction mark (ray, arc, label) with
   `drawRay`, `drawArc`, `drawLabel` (section 5, L7). On the w-plane and the quotient plane `drawPolarAddress` is fine.
2. `createPlane` defaults `minUnitsAcross: 0.5` and `maxUnitsAcross: 200`. `limits-zplane` needs `minUnitsAcross: 0.02` (zoom
   toward 0); `derivative-dcplane` needs `maxUnitsAcross: 1e6` (the quotient of 1/z near the pole is in the hundreds).
3. `directionalQuotients` and `localLinear` exist exactly as in ARCHITECTURE 3.1. `directionalQuotients` throws `RangeError` for
   `rho <= 0`; the station must never call it at a pole (section 5, D2).
4. ARCHITECTURE 9 says the epsilon-delta "disks on both planes". The main pair of planes shows paths into 0 for g, so the
   epsilon-delta demo gets its own small pair of planes (`limits-ed-zplane`, `limits-ed-wplane`).
5. ARCHITECTURE 9 gives `#limits-t (1 -> 0)` and `#derivative-phi` without ranges or units. This design fixes them: `limits-t`
   is the distance parameter t in [0.01, 1] (z(t) -> 0 as t -> 0), `derivative-phi` is Arg h in degrees, -180 to 180.
6. `explainer` rows take `native: 'cart' | 'polar' | (state) => 'cart' | 'polar' | null`; the first update renders synchronously
   and the first KaTeX render is the expensive one (about 230 ms under a 4x throttle for six rows plus a staircase), so the
   epsilon-delta explainer's first `update` is deferred by one `requestAnimationFrame` (section 5, L1).
7. The staircase widget **relabels** at the seam, it does not slide (ARCHITECTURE 10.3.7). The copy never promises a sliding list.
8. There is no Lab hand-off for these stations (ARCHITECTURE 4.6 asks for it only for stations with an image problem).

### 1.5 What a prototype of this design showed

Before handing over, both stations were prototyped from this design in a scratch folder outside the repository (about 150 lines each: real `createPlane`,
`addCurve`, `addLayer`, `createExplainer`, `createStaircase`, the real `complex.js` numerics, vendored KaTeX; not delivered). They were screenshot-reviewed at
1280 and 390 px, light and dark, for f = z^2 + z, |z|^2, conj z, 1/z (at 0 and at 0.5 with a clipped ring), g paths (parabola, line, spiral, follow-zoom) and both
epsilon-delta demos. Everything in sections 4 to 6 was run as code against the numbers of section 6.4 (all passed), and 1638 explainer cell strings (every function,
direction and path) rendered in KaTeX without error. What the prototype changed in this design (all already folded into the text):

a. The quotient ring of 1/z at z0 = 0.5 with rho = 0.25 leaves the quotient plane when the window is sized from |A| + |B| + rho alone: use `qMax` too (D7).
b. The default ring size is 0.2, not 0.15: at 0.15 the twelve 3 px tip dots on a 17 px ring touch each other and look like a bead chain; at 0.2 with 2.4 px dots
   the spokes read, and the 12 quotient dots still hide under the 6.5 px solid point.
c. The chosen-direction label beside the arrow ran under the zoom buttons for z0 = 1 + i; it now sits below the ring. The w-plane labels sit outside the image ring.
d. Drawing the highlight dot after the solid f'(z0) point made the point look orange; the order is now dots, highlight, solid point.
e. The wedge label "Arg z = ..." sat on the real-axis guide and the tick labels once the point was near the axis (follow zoom, parabola); it now sits just beyond the ray.
f. Three "easy in ..." badges in a row on the derivative explainer were noise; two remain. At an undefined point the footer must say "not checked", not "agree".
g. `drawPolarAddress` really does nothing within 6 px of 0 (1.4a), and `drawArc` takes ascending angles (min, max) correctly for negative angles.

---

## 2. UX

### 2.1 Page anatomy and wireframes

Both stations follow ARCHITECTURE 4: a `<header class="station-header">` first (one `<h1>`, the lede, thread badge, problem
chips with the aha in `title`), then the station body, then `<nav class="station-links">` last. Section headings are `<h2>`
(panels) and `<h3>` (plane boxes). All layout uses shell classes (`.panel`, `.chips`, `.chip`, `.slider-row`, `.two-planes`,
`.readout`, `.callout`, `.btn`) plus a few `ld-` classes injected once (section 2.6).

#### `limits`, desktop (content column about 870 px)

```
+------------------------------------------------------------------------------------+
| Limits: Every Direction Must Agree                                      <h1>       |
| g(z) has no value at z = 0, but we can ask what it is heading for. ...  lede       |
| (o) Motion and zoom                                                     thread     |
| [2.3.1] [P5]                                                            problem chips
+------------------------------------------------------------------------------------+
| Choose a function and a way in                                  panel (tone input) |
| Function   ( z^2/|z|^2  2.3.1 ) ( (Re(1 + z) - 1)/z  P5 )               chips       |
|   Forgets the length and keeps twice the angle: z^2/|z|^2 = e^(2i theta). Not ...  |
| Way into 0 ( Line y = mx ) ( Line x = 0 ) ( Curve y = x^2 ) ( Spiral )   chips      |
| Slope m      |------o-----------------------|                 m = 1 (angle 45 deg)|
| Distance t   |--------------o---------------|                          t = 0.45   |
| [ Walk toward 0 ]  ( Zoom in as you get close )                                    |
| Colours: green = what you do in the z-plane, purple = what g does to it, ...       |
+------------------------------------------------------------------------------------+
| Problem 2.3.1   Find lim ... along the curve y = x^2.      (Polar)  why-sentence   |  callout
+----------------------------------------+-------------------------------------------+
| z-plane: the way in                    | w-plane: the value g(z)                   |
| +------------------------------------+ | +---------------------------------------+ |
| |        polar grid                  | | |  dashed circle of directional values  | |
| |   o  hollow dot at 0               | | |  dots on it, trace (dark to light),   | |
| |      path (dark to light) + cursor | | |  cursor, ring at "limit along path",  | |
| |   Arg z arc, direction ray         | | |  Arg g arc + ghost windings           | |
| +------------------------------------+ | +---------------------------------------+ |
| Dark to light is the walk toward 0 ... | Dark to light is the same walk seen ...   |
+----------------------------------------+-------------------------------------------+
| path: y = x^2; value at t: 0.548 + 0.836i; limit along this path: 1; set of ...    |  readout
| This curve arrives at 0 tangent to the real axis, so ...                           |  path note
+------------------------------------------------------------------------------------+
| The same computation in both addresses                                 explainer   |
| Quantity            | Cartesian (slide)         | Polar (spin-and-stretch)         |
| The function        | (x^2-y^2)/(x^2+y^2)+i...  | e^(2 i theta)         [easy in Polar] |
| At this t           | z = ..., g = ...          | z = r e^(i..), g = ...           |
| Limit on this path  | (1-x^2+2ix)/(1+x^2) -> 1  | e^(2i alpha*), alpha* = 0 = 1    |
| All directions      | u^2 + v^2 = 1             | w = 0 + 1 e^(2 i theta)          |
| Is there a limit?   | 1 != -1                   | radius 1 > 0: no limit           |
| same point: agree   | g = 0.548 + 0.836i        | g = e^(i 0.99)                   |
+------------------------------------------------------------------------------------+
| The angle of g: arg g and Arg g                          staircase (3 rows)        |
+------------------------------------------------------------------------------------+
| No limit at 0. Along the real axis g is 1. Along the imaginary axis g is -1. ...   |  verdict
+------------------------------------------------------------------------------------+
| Epsilon and delta: how close is close enough                          panel        |
| ( z^2 at 1: a limit exists ) ( z^2/|z|^2 at 0: no limit )                          |
| Target radius epsilon  |---o------------|                              eps = 0.5   |
| +--------------------------------+  +-------------------------------------------+ |
| | z-plane: delta-disk about 1    |  | w-plane: epsilon-disk about 1, image of   | |
| +--------------------------------+  | the delta-circle touching it              | |
|                                     +-------------------------------------------+ |
| eps = 0.5; largest delta = 0.225                                       readout     |
| (explainer: f(1 + h) - 1 | worst step | error there | same point)                  |
| Near 1, z^2 stretches distances by 2 ...                                callout    |
+------------------------------------------------------------------------------------+
| < Previous: 1/z and the Sphere        Next: The Derivative Is a Move >   station-links |
+------------------------------------------------------------------------------------+
```

#### `limits`, phone (about 390 px; one column, 16 px gutters, no horizontal scroll)

```
+--------------------------------+
| Limits: Every Direction ...    |
| lede (wraps)                   |
| (o) Motion and zoom            |
| [2.3.1] [P5]                   |
+--------------------------------+
| Choose a function and a way in |
| Function                       |
| ( z^2/|z|^2 2.3.1 )            |
| ( (Re(1 + z) - 1)/z P5 )       |
| note                           |
| Way into 0                     |
| ( Line y = mx ) ( Line x = 0 ) |
| ( Curve y = x^2 ) ( Spiral )   |
| Slope m               m = 1 .. |   label and output on one line,
| |------o-----------------|     |   slider full width underneath
| Distance t             t = 0.45|   (.slider-row stacks under 30rem)
| |--------------o-----------|   |
| [ Walk toward 0 ]              |
| ( Zoom in as you get close )   |
+--------------------------------+
| Problem 2.3.1 card             |
+--------------------------------+
| z-plane: the way in            |
| [ square plane, 358 px ]       |
| caption                        |
| w-plane: the value g(z)        |
| [ square plane, 358 px ]       |
| caption                        |
+--------------------------------+
| readout (wraps)                |
| path note                      |
+--------------------------------+
| explainer, stacked: Cartesian  |
| cell above Polar cell per row  |
+--------------------------------+
| staircase                      |
| verdict                        |
| epsilon-delta panel (stacked)  |
| links                          |
+--------------------------------+
```

#### `derivative`, desktop

```
+------------------------------------------------------------------------------------+
| The Derivative Is a Move                                                <h1>       |
| Put z0 under a microscope. Close up, a differentiable f turns the ring ... lede    |
| (o) Motion and zoom   (o) Addresses                                     badges     |
| [3.1.1] [3.1.2] [P6]                                                    problem chips
+------------------------------------------------------------------------------------+
| Pick a function and a point                                     panel (tone output)|
| Function ( z^2 + z 3.1.1 ) ( |z|^2 3.1.2 ) ( conj z ) ( Re z P6 ) ( z^3 ) ( e^z ) ( 1/z ) |
| Ring size rho   |----o------------|                                 rho = 0.2      |
| Direction h     |--------o--------|                      Arg h = 0 deg (0)         |
|   Arg h is the home name of the direction. Any phi + 360k deg points the same way..|
| [ Shrink the ring ] [ Turn the direction once ] [ Move z0 to 0 ]                   |
| (3.1.2 only) Try this: drag z0 toward 0. ...                                       |
| Colours: ...                                                                       |
+------------------------------------------------------------------------------------+
| Problem 3.1.1 card                                                                 |
+----------------------------------------+-------------------------------------------+
| z-plane: a ring of directions around z0| w-plane: the ring after f                 |
| +------------------------------------+ | +---------------------------------------+ |
| |  cart grid, z0 handle (green),     | | |  centred on f(z0), same scale,        | |
| |  ring of 12 spokes (dark to light),| | |  image ring + 12 image spokes,        | |
| |  highlighted spoke at Arg h        | | |  dashed linear prediction, spin arc   | |
| +------------------------------------+ | +---------------------------------------+ |
| caption                                | caption                                   |
+----------------------------------------+-------------------------------------------+
| Difference quotients: dw/dz, one dot   | The same computation in both addresses    |
| per direction                          |  Quantity | Cartesian | Polar             |
| +------------------------------------+ |  Quotient / Limit / Verdict / same point  |
| | polar grid, ray to A + Arg A arc,  | |                                           |
| | dashed circle (A, |B|), 72 dots,   | |                                           |
| | solid f'(z0) point when |B| ~ 0    | |                                           |
| +------------------------------------+ |                                           |
| Close up, dw = A dz + B conj(dz) ...   |                                           |
+----------------------------------------+-------------------------------------------+
| z0 = 1 + i; A = 3 + 2i; |B| = 0.000; f'(z0) = 3 + 2i                       readout   |
| Every direction gives the same number: f'(z0) = 3 + 2i. ...                verdict   |
+------------------------------------------------------------------------------------+
| < Previous: Limits ...      Next: Cauchy-Riemann: No Mirror >                      |
+------------------------------------------------------------------------------------+
```

#### `derivative`, phone

Same order, one column: header, controls (chips wrap to three rows; sliders stacked label-over-range; three buttons wrap), problem
card, z-plane, w-plane, quotient plane, readout, explainer (stacked cells), verdict, links. Three square planes of about 358 px
are about 1100 px of scrolling: acceptable, and each plane has its caption directly under it so the student never has to
scroll back up to know what a picture is.

### 2.2 Controls

All ids are stable across mounts and prefixed by the station id. Every control has a visible label or an `aria-label`.
Chips are `<button type="button" class="chip" aria-pressed="true|false">` inside `<div class="chips" role="group"
aria-labelledby="...">`; exactly one chip per group is pressed.

#### `limits`

| Id | Element and label | Behaviour |
|---|---|---|
| `limits-fn-dir` | chip "z^2/\|z\|^2" with tag "2.3.1" (label from `fnById('dir').label`) | selects g = z^2/abs(z)^2; rebuilds curves and circle; problem card shows 2.3.1 |
| `limits-fn-x-over-z` | chip "(Re(1 + z) - 1)/z" with tag "P5" | selects g = (Re(1+z) - 1)/z; problem card shows P5 |
| `limits-fn-note` | `<p>` rendered with `prose()` from `fn.note` | text under the function chips |
| `limits-path-line` | chip "Line y = mx" | path = line at slope m; shows the slope row |
| `limits-path-vertical` | chip "Line x = 0" | path = the imaginary axis (slope infinite); hides the slope row |
| `limits-path-parabola` | chip "Curve y = x^2" | path = y = x^2 (default for 2.3.1); hides the slope row |
| `limits-path-spiral` | chip "Spiral" | path = r = 1.6 t, angle 4 ln(1/t); hides the slope row |
| `limits-m` | `<input type="range" min="-3" max="3" step="0.05">` in `#limits-m-row`, label "Slope m"; output `#limits-m-out` "m = 1 (angle 45 deg)" | sets m; the row is `hidden` unless path = line (the element always exists so a script can set it) |
| `limits-t` | `<input type="range" min="0.01" max="1" step="0.01">`, label "Distance t"; output `#limits-t-out` "t = 0.45" | sets t; any input pauses the walk |
| `limits-play` | `<button class="btn btn-primary">` "Walk toward 0" / "Pause" | animates t from the current value (or 1 when t is at most 0.011) down to 0.01 in about 6.5 s at constant speed; under reduced motion it is a stepper "Step closer" |
| `limits-follow` | chip (aria-pressed) "Zoom in as you get close" | when on, the z-plane window is centred on 0 with width 2.6 \|z(t)\| (clamped to [0.05, 4]); any manual pan, zoom or Reset of the z-plane turns it off |
| `limits-problem` | `<aside class="callout">` | the problem for the current function (statement via `statementParts`, address chip, `addressWhy`) |
| `limits-readout` | `<div class="readout">` | the plain-text line scripts read (section 2.5) |
| `limits-path-note` | `<p class="callout">` | one or two sentences about this path |
| `limits-verdict` | `<div class="callout" data-exists="no">` | the conclusion sentence |
| `limits-status` | `<p class="sr-only" role="status" aria-live="polite">` | screen-reader summary, updated 400 ms after the last change |
| `limits-ed-fn-sq` | chip "z^2 at 1: a limit exists" | epsilon-delta demo f = z^2, z0 = 1, w0 = 1 (default) |
| `limits-ed-fn-dir` | chip "z^2/\|z\|^2 at 0: no limit" | demo g at z0 = 0 with target w0 = 1 |
| `limits-eps` | `<input type="range" min="0.05" max="1.5" step="0.05">` (default 0.5), label "Target radius epsilon"; output `#limits-eps-out` "eps = 0.5" | sets epsilon |
| `limits-epsdelta` | `<div class="readout">` | "eps = 0.5; largest delta = 0.225" or "eps = 0.5; no delta works" |
| `limits-ed-note` | `<p class="callout">` | explanation, depends on the demo |
| `limits-to-derivative` | `<a class="station-link" data-dir="next" href="#derivative">` | next link, doubles as the cross-link |

Planes: `limits-zplane`, `limits-wplane`, `limits-ed-zplane`, `limits-ed-wplane` (ids of the plane objects; the DOM ids are the
plane's own: `limits-zplane-viewport`, `limits-zplane-canvas`). Explainers: `limits-ex`, `limits-ed-ex`. Staircase: `limits-stairs`
(so `limits-stairs-set`, `limits-stairs-arg`, `limits-stairs-list` exist). There are no draggable handles in `limits`.

#### `derivative`

| Id | Element and label | Behaviour |
|---|---|---|
| `derivative-fn-sq-plus-z` | chip "z^2 + z", tag "3.1.1" (default) | f = z^2 + z |
| `derivative-fn-abs2` | chip "\|z\|^2", tag "3.1.2" | f = abs(z)^2 |
| `derivative-fn-conj` | chip "conj z" | f = conj(z) |
| `derivative-fn-re` | chip "Re z", tag "P6" | f = Re(z) |
| `derivative-fn-cube` | chip "z^3" | f = z^3 |
| `derivative-fn-exp` | chip "e^z" | f = exp(z) |
| `derivative-fn-recip` | chip "1/z" | f = 1/z (pole at 0) |
| `derivative-zplane-z0` | the draggable handle of `derivative-zplane` (green, label "z0") | drag, touch-drag or arrow keys; snapped to the 0.05 grid (section 5, D1) so that readouts show tidy numbers |
| `derivative-rho` | `<input type="range" min="0.02" max="0.5" step="0.01">` (default 0.2), label "Ring size rho"; output `#derivative-rho-out` "rho = 0.2" or "rho = 0.5 (clipped to 0.25 near the pole)" | sets the ring radius |
| `derivative-phi` | `<input type="range" min="-180" max="180" step="5">` (default 0), label "Direction of the step h"; output `#derivative-phi-out` "Arg h = 60 deg (pi/3)" | sets the highlighted direction (home name Arg h) |
| `derivative-shrink` | `<button class="btn">` "Shrink the ring" | animates rho down to 0.02 over 3.5 s (geometric); reduced motion: steps rho through 0.5, 0.3, 0.2, 0.1, 0.05, 0.02 and back to 0.5, label "Shrink the ring (one step)" |
| `derivative-sweep` | `<button class="btn">` "Turn the direction once" | animates Arg h from -180 to 180 deg over 6 s; reduced motion: +30 deg per click, label "Turn the direction (30 deg step)" |
| `derivative-z0-origin` | `<button class="btn">` "Move z0 to 0" | puts z0 at 0 (keyboard-friendly version of "drag to 0") |
| `derivative-hint` | `<p class="callout" data-tone="polar">` | visible only for f = abs(z)^2: "Try this: drag z0 toward 0. The circle shrinks with it, and at z0 = 0 it is a single point." |
| `derivative-problem` | `<aside class="callout">` | problem card for the current function: 3.1.1, 3.1.2 or P6; hidden for conj, z^3, e^z, 1/z |
| `derivative-readout` | `<div class="readout">` | the plain-text line (section 2.5) |
| `derivative-verdict` | `<div class="callout">` with `data-exists` set to `yes`, `no` or `undefined` | the conclusion |
| `derivative-ab-note` | `<p class="ld-note">` under the quotient plane | the A and B sentence |
| `derivative-status` | `<p class="sr-only" role="status" aria-live="polite">` | screen-reader summary, 300 ms after the last change |
| `derivative-to-limits` | `<a class="station-link" data-dir="prev" href="#limits">` | previous link, doubles as the cross-link |

Planes: `derivative-zplane` (handle `z0`), `derivative-wplane`, `derivative-dcplane`. Explainer: `derivative-ex` (rows `quotient`,
`limit`, `verdict`, footer `derivative-ex-same`).

### 2.3 Interaction

#### Pointer and touch

- **Handle `z0`** (derivative): `plane.addPoint` handles pointer capture, 32 px minimum hit area, clamping to a 10 px inset. Dragging
  updates the model on every pointer move (`onDrag`). On touch the canvas uses `touch-action: pan-x pan-y`, so a one-finger
  swipe that starts on empty plane scrolls the page and a drag that starts on the handle moves the point.
- **Planes** (limits z and w, derivative z) are interactive: wheel zoom only when focused or Ctrl/Cmd held (`wheel: 'focus'`),
  drag on empty space pans, two-finger pinch zooms, buttons + / - / Reset in the corner. `derivative-wplane`,
  `derivative-dcplane`, `limits-ed-zplane`, `limits-ed-wplane` are `interactive: false` (the station owns their view).
  - `derivative`: zooming the z-plane also sets the w-plane's `unitsAcross` (same scale lock); panning the z-plane changes
    nothing on the w-plane (it is always centred on f(z0)).
  - `limits`: a manual zoom, pan or Reset of `limits-zplane` switches `limits-follow` off.
- **Sliders** are native range inputs (44 px high, drag or touch-drag). Only the `input` event is handled (a script's
  `setSlider` fires `input` then `change`; handling both is harmless but unnecessary).
- **Chips and buttons**: click, tap, Enter, Space.
- **Nothing else is draggable.** There is no custom hit testing in either station: no ring-dragging, no clicking on dots. (Recorded
  as out of scope in section 9.)

#### Keyboard

- Tab order follows the DOM: header problem chips, function chips, path chips, sliders, buttons, then planes (tabindex 0, from
  `createPlane`; `+`, `-`, `0` and arrow keys act on a focused interactive plane) and the `z0` handle.
- **Handle `z0`**: arrow keys move it by 0.05 (Shift: 0.5; Alt would be 0.005 but the snap rounds it back, so Alt does nothing);
  Escape during a pointer drag restores the start position (plane behaviour). The handle's `aria-label` announces both
  addresses ("z0 = 1 + 1i; r = 1.414, theta = 0.785 (Arg)").
- **Sliders**: arrows move by one step, PageUp and PageDown by ten steps, Home and End to the ends. `limits-t` Home is 0.01 and End
  is 1.
- `limits-play`, `derivative-shrink`, `derivative-sweep`: a running animation stops on any input to the slider it drives, on
  `unmount`, and when the document is hidden (rAF stops by itself).

#### Reduced motion

`ctx.theme.prefersReducedMotion()` is checked **when a button is pressed** (so a mid-session OS change takes effect) and at
mount for the button labels. With reduced motion: `limits-play` steps t through 1, 0.6, 0.35, 0.2, 0.1, 0.05, 0.02, 0.01 and
back to 1; `derivative-shrink` and `derivative-sweep` step as in the table above; nothing animates by itself. The plane zoom of
`limits-follow` is an instant `setView` (no tween) in both modes.

### 2.4 States: empty, loading, error

| State | When | What the student sees |
|---|---|---|
| Loading | the router's 150 ms placeholder, then the mount completes synchronously | nothing extra: both stations build the whole DOM, create the planes and call `explainer.update` before returning from `mount` (the epsilon-delta explainer's first update is one frame later; until then its table shows its placeholder dashes) |
| Empty | `derivative`, f = 1/z and z0 = 0 (or any z0 at a pole) | readout "z0 = 0; f is undefined at z0 (1/z has a pole at 0)"; planes keep the handle only; `derivative-verdict` (data-exists="undefined") says "1/z has no value at 0, so there is nothing to zoom into. Drag z0 away from 0."; explainer cells show "no value here"; **no number is NaN or Infinity anywhere** |
| Empty | `limits`, g = 0 on a path (x/z along x = 0) | `limits-stairs` is `update(null)` ("no angle at 0"); the w-plane draws no Arg g arc (the helper skips \|g\| below 6 px) |
| Error: no canvas | the plane shows its own message ("This picture needs canvas drawing ...") | the numbers beside the plane keep working |
| Error: a layer throws | the plane disables that layer and shows its note | station layer code guards every non-finite value (section 8) |
| Error: KaTeX missing | `katex.js` falls back to plain text | explainer cells show the TeX source with class `tex-error`; readouts and verdicts are unaffected |
| Error: station module fails | router panel "This station is under construction." | not this design's job |

### 2.5 Copy (exact text)

Plain, direct, for a student the night before the test. No emoji. Unicode math symbols are used in prose; readouts are ASCII.
Text that carries exponents (`e^{...}`) goes through `prose()`.

#### `limits`

| Element | Text |
|---|---|
| `<h1>` | `ctx.station.title` ("Limits: Every Direction Must Agree") |
| lede | "g(z) has no value at z = 0, but we can ask what it is heading for. Choose a way in and watch g(z) on the right. Both functions here only read the direction you arrive from, so every direction gives a point on one circle. A limit exists only if that circle is a single point." **Superseded in residue cleanup:** the limits lede says "watch g(z) in the w-plane" (the planes stack on a phone, so "on the right" is wrong). |
| thread badge | "Motion and zoom" (title attribute: `THREADS` T3 title) |
| controls panel title | "Choose a function and a way in" |
| function group label | "Function" |
| `limits-fn-note` | `prose(el, fnById(fnId).note)`; for `x-over-z` a second sentence follows: `It is also the difference quotient of Re z at 0, the circle of problem P6 (A = ${fmtNum(A.re)}, B = ${fmtNum(B.re)}).` with `{ A, B } = localLinear(Re, 0)` (so "A = 0.5, B = 0.5") |
| path group label | "Way into 0" |
| path chips | "Line y = mx", "Line x = 0", "Curve y = x²", "Spiral" |
| slope label and output | "Slope m"; `m = ${fmtNum(m)} (angle ${deg} deg)`; `deg` is `fmtNum(atan(m) * 180 / pi, 1)` |
| t label and output | "Distance t"; `t = ${fmtNum(t, 2)}`; below the slider in muted text: "1 is far, 0.01 is very close. t never reaches 0: g has no value there." |
| buttons | "Walk toward 0" / "Pause"; reduced motion: "Step closer"; chip "Zoom in as you get close" |
| colour key (`<p class="ld-key">`) | `<span class="tone-input">Green</span> is where you walk in the z-plane. <span class="tone-output">Purple</span> is what g does to it. <span class="tone-polar">Orange</span> is a direction or a circle (polar). Dark to light is time.` |
| z box heading, caption | "z-plane: the way in"; "Dark to light is the walk toward 0. The hollow dot is 0, where g has no value. The orange arc is Arg z, the direction you arrive from." |
| w box heading, caption | "w-plane: the value g(z)"; "Dark to light is the same walk, seen through g. The dashed circle holds the value from every direction. The ring marks the limit along this path." |
| z-plane puncture label | "g undefined at 0" |
| w-plane limit label | `limit ${fmtCart(L)}` |
| explainer title | "The same computation in both addresses" |
| explainer row labels | "The function", "At this t", "Limit on this path", "All directions", "Is there a limit?" |
| staircase panel title and line | `<h3>`: "The angle of g: arg g and Arg g"; `<p class="ld-note">`: "The value g is one point. Its angle has many names, the set arg g; the highlighted row is the one name Arg g in (-π, π]. Because g uses 2θ, coming in from the opposite side changes θ by a half-turn but g not at all." |
| path note, line | `Every point of this line has direction ${a} deg, so g is the same number all the way in: ${fmtCart(L)}. Coming in from the other side (${a + 180 wrapped to (-180, 180]} deg) gives the same number: the formula uses 2θ, and an extra half-turn is a full turn in 2θ.` |
| path note, vertical | same sentence with 90 deg and the other side -90 deg |
| path note, parabola | `This curve arrives at 0 tangent to the real axis, so its direction tends to 0 deg. Close to 0 it looks like the real axis, so g tends to the real-axis value: ${fmtCart(L)}. Switch on "Zoom in as you get close" to watch the curve flatten.` |
| path note, spiral | "The spiral keeps turning as it shrinks, so its direction never settles and g keeps going round the circle. There is no limit along this path. Zoom in: a spiral looks the same at every zoom." |
| verdict (no limit) | `No limit at 0. Along the real axis g is ${fmtCart(Lr)}. Along the imaginary axis g is ${fmtCart(Li)}. Different numbers, so no single value is being approached. The values from all directions fill the circle with centre ${fmtCart(c)} and radius ${fmtNum(r)}. A limit would need that circle to be one point.` |
| verdict (limit exists; unreachable with the two functions, kept for completeness) | "Every direction gives the same value, so the limit exists." |
| `limits-status` | `Path ${desc}. Limit along this path ${L or "does not exist"}. The limit at 0 does not exist.` |
| epsilon-delta panel title | "Epsilon and delta: how close is close enough" |
| epsilon-delta intro | "A limit w0 means: whatever target radius ε you pick around w0, there is a radius δ around z0 so that every z inside the δ-disk (except z0 itself) lands inside the ε-disk." |
| ed chips | "z² at 1: a limit exists", "z²/\|z\|² at 0: no limit" |
| epsilon slider label, output | "Target radius ε"; `eps = ${fmtNum(eps, 2)}` |
| ed z box heading, caption (sq) | "z-plane: the δ-disk about 1"; "The disk is the largest that works for this ε." |
| ed w box heading, caption (sq) | "w-plane: the ε-disk about 1"; "The curve is where the edge of the δ-disk goes. It touches the ε-disk at one point and stays inside." |
| ed z box caption (dir) | "A punctured disk about 0. Any radius will do; the picture is the same." |
| ed w box caption (dir) | "The edge of the disk is sent onto the whole unit circle. The thick part is outside the ε-disk." (the outside part is drawn thicker and in `--danger`: width as well as colour carries it) |
| ed note (sq) | "The target disk around w = 1 has radius ε. The largest δ that works is √(1 + ε) − 1. When ε is small, δ is about ε/2, because near 1 the map z² stretches distances by \|f′(1)\| = 2. Halve the target and you halve the room you have." |
| ed note (dir) | "Target: a disk of radius ε around 1. But every punctured disk around 0, however small, is sent onto the whole unit circle, and that circle sticks out of the target (the far point −1 is 2 away from 1). No δ works for any ε below 2, so 1 is not the limit. The same happens for every other target." |
| readouts | `limits-epsdelta`: `eps = ${fmtNum(eps, 2)}; largest delta = ${fmtNum(delta)}` or `eps = ${fmtNum(eps, 2)}; no delta works` |
| explainer rows (ed) | sq: "f(1 + h) − 1", "Worst step", "Error there"; dir: "g(z) − 1", "Worst direction", "Error there" |
| links | previous "Previous: 1/z and the Sphere" (from the registry title); next (`limits-to-derivative`): "Next: The Derivative Is a Move" with a muted second line "the circle shrinks to a point" |

The readout of `limits-readout` (ASCII, one line, exactly this shape; `;` separates fields):

```
path: <desc>; value at t: <cart>; limit along this path: <cart | none (keeps circling)>; set of directional limits: circle center <cart> radius <num>; limit exists: <no | yes>
```

`<desc>`: line -> `y = 0` (m = 0), `y = x` (m = 1), `y = -x` (m = -1), else `y = ${fmtNum(m)}x`; vertical -> `x = 0`; parabola -> `y = x^2`;
spiral -> `spiral into 0`. `<cart>` is `fmtCart(z, 3)`; `<num>` is `fmtNum(r, 3)`. Example (default state of `#problem-2-3-1`):

```
path: y = x^2; value at t: 0.548 + 0.836i; limit along this path: 1; set of directional limits: circle center 0 radius 1; limit exists: no
```

#### `derivative`

| Element | Text |
|---|---|
| `<h1>` | `ctx.station.title` ("The Derivative Is a Move") |
| lede | "Put z0 under a microscope. Close up, a differentiable f turns the ring on the left into a ring on the right, spun and scaled by one number, f′(z0). The lower plane plots the difference quotient for every direction: a circle with centre A and radius \|B\|. The derivative exists exactly when that circle is a single point." **Superseded in residue cleanup:** the lede now says "turns the ring in the z-plane into a ring in the w-plane ... The quotient plane, below the other two, plots ...", and the quotient caption says "Same scale as the z-plane ... the ring in the z-plane"; the limits lede says "watch g(z) in the w-plane". |
| thread badges | "Motion and zoom", "Addresses" |
| controls panel title | "Pick a function and a point" |
| function group label | "Function" |
| ρ label, output | "Ring size ρ"; `rho = ${fmtNum(rho, 2)}`; clipped: `rho = ${fmtNum(rho, 2)} (clipped to ${fmtNum(rhoEff, 3)} near the pole)` |
| φ label, output | "Direction of the step h"; `Arg h = ${deg} deg (${exact or decimal + " rad"})` |
| φ note (`<p class="ld-note">`) | "Arg h is the home name of the direction. Any φ + 360°k points the same way, and e^{−2iφ} does not care which name you use." |
| buttons | "Shrink the ring", "Turn the direction once", "Move z0 to 0" |
| hint (abs2 only) | "Try this: drag z0 toward 0. The circle shrinks with it, and at z0 = 0 it is a single point." |
| colour key | `<span class="tone-input">Green</span> is the ring you put in. <span class="tone-output">Purple</span> is what f does to it. <span class="tone-polar">Orange</span> is a direction or a circle (polar). <span class="tone-cart">Blue</span> is a position (Cartesian). Dark to light is the direction φ, like time.` |
| z box heading, caption | "z-plane: a ring of directions around z0"; "Twelve steps h = ρe^{iφ} out of z0. Dark to light goes once round, counterclockwise. The orange arrow is the direction you chose." |
| w box heading, caption | "w-plane: the ring after f"; "Same scale as the left plane, centred on f(z0), so the size of this ring compared with the left one is the stretch. Dashed: what a pure A·h + B·conj(h) would do." |
| w-plane spin label (differentiable and \|A\| at least 0.05) | `spin Arg f′ = ${fmtNum(argA deg, 2)} deg` (canvas text; the radian value is in the verdict) |
| quotient plane heading, caption | "Difference quotients: Δw/Δz, one dot per direction"; "Each dot is (f(z0 + h) − f(z0))/h for one direction. The dashed circle has centre A and radius \|B\|." |
| `derivative-ab-note` | "Close up, Δw ≈ A·Δz + B·conj(Δz): a spin-and-stretch plus a mirrored spin-and-stretch. The quotient is A + B·e^{−2iφ}, so when the direction goes round once the dot goes round twice, the other way. Cauchy–Riemann says B = 0." |
| explainer title | "The same computation in both addresses" |
| explainer row labels | "Difference quotient", "Limit as the ring shrinks", "Does the derivative exist?" |
| verdict, defined and B = 0 | `Every direction gives the same number: f′(z0) = ${fmtCart(A)}. Under the microscope the ring comes out as a ring again, spun by Arg f′ = ${fmtNum(argA, 3)} (${fmtNum(argA deg, 2)} deg) and scaled by ${fmtNum(absA, 3)}. That is multiplication by one complex number.` If \|A\| < 0.001: "f′(z0) = 0: the ring collapses to a point, so there is no direction left to turn." |
| verdict, B not 0, kind 'flat' | `The directions disagree. The quotient goes round a circle of radius \|B\| = ${absB 3 dp} centred at A = ${fmtCart(A)}, so there is no single number f′(z0). Under the microscope the ring is squashed flat onto a line.` |
| verdict, kind 'mirrored' | same first two sentences, then "Under the microscope the ring comes out as a ring again, but the order of the arrows is reversed: it has been mirrored, not spun." |
| verdict, kind 'ellipse' | same first two sentences, then "Under the microscope the ring is stretched into an ellipse, not a ring." |
| extra sentence, f = conj z | appended: "conj z is continuous (the image ring still shrinks to a point with the ring), but it is differentiable nowhere." |
| extra sentence, f = abs(z)^2 and B not 0 | appended: "\|z\|² is differentiable only at 0. Analytic needs a whole disk of differentiable points, and every disk around 0 contains points where this circle has positive radius, so \|z\|² is analytic nowhere." |
| extra sentence, f = abs(z)^2 at z0 = 0 | "At 0 the quotient is conj(h), whose size is ρ: the circle of dots shrinks to the point 0 with ρ. So f′(0) = 0. Drag z0 one step away and the circle comes back." |
| extra sentence, f = Re z | appended: "This is the same circle as problem P5 on the Limits station: centre 1/2, radius 1/2, at every z0." |
| extra sentence, B not 0 | appended link in the verdict: `<a href="#cauchy-riemann">The same test as Cauchy–Riemann</a>` |
| verdict, undefined | "1/z has no value at 0, so there is nothing to zoom into. Drag z0 away from 0." |
| `derivative-status` | `z0 = ${fmtCart(z0)}. ${exists ? "f′(z0) = " + fmtCart(A) + ". Differentiable here." : "No derivative here: the quotient circle has radius " + absB3 + "."}` |
| links | previous (`derivative-to-limits`): "Previous: Limits: Every Direction Must Agree"; next: "Next: Cauchy–Riemann: No Mirror" |

The readout of `derivative-readout` (ASCII, one line):

```
z0 = <cart>; A = <cart>; |B| = <3 decimals>; f'(z0) = <cart>
z0 = <cart>; A = <cart>; |B| = <3 decimals>; f'(z0) does not exist (circle radius <3 decimals>)
z0 = <cart>; f is undefined at z0 (1/z has a pole at 0)
```

`|B|` is always `absB.toFixed(3)` ("0.000", "0.300", "1.414"), never `fmtNum`. Examples:

```
z0 = 1 + i; A = 3 + 2i; |B| = 0.000; f'(z0) = 3 + 2i
z0 = 1 + i; A = 1 - i; |B| = 1.414; f'(z0) does not exist (circle radius 1.414)
z0 = 0; A = 0; |B| = 0.000; f'(z0) = 0
z0 = 0; A = 0.5; |B| = 0.500; f'(z0) does not exist (circle radius 0.500)
```

#### Problem card (both stations)

`<aside class="callout" data-tone="accent" id="<station>-problem">`: `<p class="ld-problem-title">Problem 3.1.2</p>`, the statement
(`statementParts`: prose parts as text, math parts with `tex(span, part.text)`), `<p>` with the address chip(s)
(`addressLabel(p.address)`, tones from `addressTones`) and `prose(el, p.addressWhy)`. Map: dir -> 2.3.1, x-over-z -> P5,
sq-plus-z -> 3.1.1, abs2 -> 3.1.2, re -> P6; no problem for conj, cube, exp, recip (the card is `hidden`). The answers stay on the
problem index (no reveal here).

### 2.6 DOM skeleton and station CSS

```
section.station#station-<id>
  header.station-header
    h1
    p.station-lede
    ul.thread-badges > li.thread-badge[data-thread="T3"]  (title = THREADS title)
    div.chips > a.chip.problem-chip[href="#problem-2-3-1"][title=aha] ...
  div.panel[data-tone]#<id>-controls
    h2.panel-title
    div.ld-block > span.ld-label#<id>-fn-label + div.chips[role=group][aria-labelledby=<id>-fn-label] > button.chip ...
    ...sliders as .slider-row (label[for], input[type=range], output)...
    div.ld-actions > button.btn ...
    p.ld-key
  aside.callout#<id>-problem
  div.two-planes
    div.ld-box > h3 + div#<id>-zhost (the plane appends itself) + p.ld-caption
    div.ld-box > h3 + div#<id>-whost + p.ld-caption
  div.readout#<id>-readout
  ...
  nav.station-links
```

Station CSS (tokens only, injected once as `<style data-for="station-limits-derivative">` by the exported `ensureStationStyle()`
of `derivative.js`; both `mount`s call it):

```
.ld-block { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
.ld-label { color: var(--text-muted); font-size: 0.88rem; font-weight: 600; }
.ld-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: var(--space-2) 0; }
.ld-box { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.ld-box > h3 { margin: 0; font-size: 1.05rem; }
.ld-caption, .ld-note, .ld-key { margin: 0; color: var(--text-muted); font-size: 0.9rem; max-width: 62ch; }
.ld-lower { display: grid; gap: var(--space-3); align-items: start;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 23.25rem), 1fr)); }
.ld-lower > * { min-width: 0; }
.ld-tag { margin-left: 0.4rem; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.78rem; }
.ld-problem-title { margin: 0 0 var(--space-1); font-weight: 700; }
.ld-stairs { max-width: 28rem; }
```

`.ld-` rules never set a colour literal. `[hidden]` wins over every `display` rule above because `css/theme.css` has a global `[hidden] { display: none !important; }`; the builder still checks
that `#limits-m-row[hidden]` is not displayed.

---

## 3. Visual encoding

All canvas colours are read from the CSS custom properties at draw time (`cssColor('--token')` exported by `plane.js`, or the
plane helpers that take tokens) and re-read on every redraw; the planes redraw themselves on `themechange`. Station code contains
no colour literal (no `#rrggbb`, `rgb(`, `hsl(`), except values returned by `rampColor`. The explainer columns tint their cells with
their own tone, so no manual `\textcolor` is needed.

### 3.1 Tokens and contrast against `--surface` (both themes)

| Token | Light | Contrast on `#ffffff` | Dark | Contrast on `#151c2b` |
|---|---|---|---|---|
| `--cart` | `#0b63ad` | 6.17 | `#62adf2` | 7.12 |
| `--polar` | `#a84300` | 6.06 | `#ff9d5c` | 8.30 |
| `--input` | `#006e53` | 6.26 | `#3fd0a0` | 8.71 |
| `--output` | `#9d3a8a` | 6.17 | `#e48fd2` | 7.43 |
| `--danger` | `#b3261e` | 6.54 | `#ff8178` | 7.03 |
| `--ok` | `#26702a` | 6.12 | `#63d08a` | 8.86 |
| `--text` | `#1a2230` | 15.96 | `#e9edf5` | 14.52 |
| `--t0` (time start) | `#101a30` | 17.32 | `#5c7498` | 3.57 |
| `--t1` (time end) | `#6d83a6` | 3.86 | `#f3f6fb` | 15.72 |

Every graphic mark is at least 3.5:1 against the plane background in both themes. Information is never carried by colour alone:
the dashed circle is dashed, the limit is a ring, the "outside" part of an image is drawn thicker as well as red, labels name
every mark.

### 3.2 Which colour means what in these stations

| Mark | Plane | Colour | Why |
|---|---|---|---|
| Path into 0 (curve with time ramp, arrowhead at the arrival, cursor ring) | `limits-zplane` | `--input` ramped by `rampColor` | z-plane stroke |
| "Other side" of a line path (thin, dashed, 35 percent alpha) | `limits-zplane` | `--input` | same stroke, other half |
| Arrival-direction guide ray (dashed, long) | `limits-zplane` | `--polar` | a direction is a polar thing |
| Direction mark: solid ray at Arg z, solid arc, label "Arg z = ..." | `limits-zplane` | `--polar` | the polar address of the point; the label says **Arg** |
| Puncture: hollow dot at 0 (surface fill, `--text` outline) and label "g undefined at 0" | `limits-zplane` | `--surface` / `--text` | a hole is not a data colour |
| Polar grid | both limits planes | `--polar` at the plane's grid alpha | the native grid for angles |
| Trace of g along the path (time ramp, same clock as the path) | `limits-wplane` | `--output` ramped | w-plane stroke |
| Circle of directional values (dashed, width 2) | `limits-wplane` | `--polar` | circle, centre and radius |
| Dots on that circle (72, radius 2.2 px, alpha 0.85) | `limits-wplane` | `--output` | values of g |
| Centre marker (a small plus, 5 px arms) | `limits-wplane` | `--cart` | the centre is a position |
| Limit along this path (ring, radius 8 px, width 2.5) and its label | `limits-wplane` | `--output` | a value of g |
| Polar address of g: ray, solid Arg arc, ghost windings "also ..." (set arg g) | `limits-wplane` | `--polar` via `drawPolarAddress` | arg g as a set, Arg g highlighted |
| Staircase rows: ghost steps faint, home step solid | `limits-stairs` | `--polar` (widget's own) | same code as everywhere |
| delta-disk (fill 0.15, outline width 2), its centre | `limits-ed-zplane` | `--input` | z-plane set |
| epsilon-disk (fill 0.12, outline width 2), centre w0 | `limits-ed-wplane` | `--output` | w-plane set |
| Image of the delta-circle: inside the epsilon-disk (width 2.5) / outside (width 4) | `limits-ed-wplane` | `--output` / `--danger` | "colored by what it finds" (STORY section 4, Sets) |
| Touch point of the image with the epsilon-circle (ring radius 7) | `limits-ed-wplane` | `--ok` | the "largest delta" evidence |
| Ring of 12 spokes + ring curve (time ramp is the direction phi) | `derivative-zplane` | `--input` ramped | the stroke put in |
| Spoke tip dots (radius 2.4, 1 px surface halo) | `derivative-zplane` | `rampColor(--input, j/12)` | orientation by lightness |
| z0 handle | `derivative-zplane` | `--input` (the plane's handle colour) | input point |
| Highlighted spoke, its arc at z0 and its label "Arg h = ..." | `derivative-zplane` | `--polar` | the chosen direction, home name Arg h |
| Image ring curve and image spokes + tip dots | `derivative-wplane` | `--output` ramped | the stroke after f |
| Dashed linear prediction w0 + A h + B conj(h) (width 1.5, alpha 0.8, dash [4, 4]) | `derivative-wplane` | `--polar` | "what spin-and-stretch plus mirror would do" |
| Highlighted image spoke and dot | `derivative-wplane` | `--polar` | same direction, other side |
| Spin arc from the +x direction to Arg A at f(z0), label "spin Arg f' = ..." | `derivative-wplane` | `--polar` | spin is an angle |
| f(z0) dot and label | `derivative-wplane` | `--output` | a w-plane point |
| Cartesian grid | `derivative-zplane`, `derivative-wplane` | `--cart` | the local picture is a slide-grid |
| Polar grid, ray 0 -> A, arc to Arg A, ghosts "also ..." | `derivative-dcplane` | `--polar` | f' is read by its polar address: stretch and spin |
| Quotient dots (72) | `derivative-dcplane` | `--output` | values |
| 12 larger quotient dots (radius 3.4) | `derivative-dcplane` | `rampColor(--output, j/12)` | ties dot j to spoke j |
| Dashed circle centre A radius \|B\| (dash [7, 5], width 2) | `derivative-dcplane` | `--polar` | circle |
| Centre cross at A (when no solid point) | `derivative-dcplane` | `--cart` | a position |
| Solid f'(z0) point (radius 6.5, 2 px surface halo) and label "f'(z0)" | `derivative-dcplane` | `--output` | the derivative |
| Two diamonds at A + B ("h real") and A - B ("h imaginary") with labels (when no derivative) | `derivative-dcplane` | `--cart` | the two textbook limits, Cartesian |
| Highlighted quotient q(phi) (radius 5.5, halo) | `derivative-dcplane` | `--polar` | the direction you chose |

### 3.3 arg versus Arg, the point once

- `limits`: the point z(t) is one cursor ring, the value g(t) is one cursor ring. Directions: z-plane shows **Arg z** as the one
  solid arc (home name in (-pi, pi]). w-plane shows Arg g as the solid arc and `ghosts: 1, ghostsNeg: 1` ("also Arg g + 2pi",
  "also Arg g - 2pi") so the set arg g is visible; the staircase beside the explainer lists the same set with the home row
  highlighted. The text never writes "arg" as if it were a number: it says "Arg z" for the home value and "names" for the others.
- `derivative`: the step's direction is the highlighted spoke with an arc labelled **Arg h**; the slider output says
  "Arg h = 60 deg (pi/3)" and the note says any phi + 360k points the same way. The spin of the derivative is **Arg A** (home name),
  drawn on the quotient plane with ghosts "also ...". The seam shows where it must: at slider -180 the output reads `Arg h = 180 deg
  (pi)` (Arg of a negative real is pi, never -pi).

### 3.4 Input versus output, and time

- z-side strokes `--input`, w-side strokes `--output`, always (the quotient plane is neither: its dots are `--output` because they
  are values derived from f, and the circle and the arc are `--polar`).
- Time is lightness along the stroke (`rampColor(base, t)`, 32 bins in `plane.drawTimedCurve`): dark at the start, light at the end
  with an arrowhead at the end. `limits`: the plane's curve time is **`tau(t) = (1 - t)/(1 - 0.01)`**: dark = far (t near 1), light =
  arrival (t = 0.01), arrowhead at 0. The slider/readout variable `t` is the distance parameter (z(t) -> 0 as t -> 0); the ramp is
  progress. Both strokes and both cursors use the same `tau`, so "when" matches "where". `derivative`: the ring's curve time is
  phi / 2pi (dark at phi = 0, light after a full counterclockwise turn); the image uses the same value, so a mirrored image
  (conj z) is a reversed ramp.
- The plane's ramp legend pill ("start ... end") is **on** for the two `limits` planes (it is the walk) and **off** (`legend: false`)
  for the `derivative` planes (the ramp there is direction, not time; the captions say so).

### 3.5 Both themes

Nothing differs in geometry between the themes; only token values. Checks: ramp ends `--t0`/`--t1` are monotone in lightness in both
themes (`rampColor` guarantees it); the ring's dark end is `#5c7498` on `#151c2b` in dark mode (3.57:1, still visible with the 2.5 px
stroke and tip dots that have a surface halo); surface halos (1.5 px) keep dots readable over the dashed circle; canvas labels use the
plane's own text colour with a 3 px surface halo (`drawLabel`).

---

## 4. Module API

Both files are native ES modules. **No top-level DOM access**, no timers, no side effects at import: both import in Node (the unit
tests do). Imports are relative only.

```js
// js/stations/limits.js imports
import { createPlane, drawArc, drawCircle, drawDot, drawLabel, drawPolarAddress, drawRay, DASH, cssColor, rampColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, prose } from '../core/katex.js';
import { Arg, wrapArg, expi, fromPolar, directionalQuotients, localLinear, fmtCart, fmtNum, fmtAngle, exactAngle, texAngle, toPolar } from '../core/complex.js';
import { compile } from '../core/parse.js';
import { fnById } from '../data/functions.js';
import { problemsForStation, problemById, routeFor } from '../data/problems.js';
import { drawDirectionCircle, ensureStationStyle, buildStationLinks, renderProblemCard, createAnimator,
         compiledFn, texDecCart, texDecPolar, stackTex, angleText } from './derivative.js';
// js/stations/derivative.js imports the same core modules (not limits.js)
```

`limits.js` imports `directionalQuotients` and `localLinear` from `../core/complex.js` **and uses them** (section 5, L4): the P5 circle is
`directionalQuotients(Re, 0, ...)` and the P5 note quotes `localLinear(Re, 0)`; this is what the A5 code inspection looks for.
`derivative.js` uses both in `microscope`.

### 4.1 `js/stations/derivative.js` exports

```js
// ---- constants ----
export const FUNCTION_IDS;        // ['sq-plus-z', 'abs2', 'conj', 're', 'cube', 'exp', 'recip']   chip order
export const PROBLEM_FOR_FN;      // { 'sq-plus-z': '3.1.1', abs2: '3.1.2', re: 'P6' }  (limits.js adds its own map)
export const EXISTS_EPS;          // 1e-3: |B| below this means "the circle is a point"
export const RHO;                 // { min: 0.02, max: 0.5, step: 0.01, def: 0.2 }
export const Z0_SNAP;             // 0.05
export const DEFAULT_Z0;          // { re: 1, im: 1 }   (frozen)
export const N_QUOTIENTS;         // 72  directions in the quotient plane
export const N_SPOKES;            // 12  arrows in the ring
export const N_RING;              // 96  samples of the ring curve (a multiple of N_SPOKES)

// ---- pure helpers (Node-testable) ----
export function snapZ0(z)                                   // -> { re, im } on the 0.05 grid; never -0
export function compiledFn(fnId)                            // -> (z) => {re, im}: compile(fnById(fnId).src).f, cached per id; throws RangeError for an unknown id
export function effectiveRho(fnId, z0, rho)                 // -> min(rho, 0.5 * distance to the nearest pole); 0 at a pole; rho when there are no poles
export function quotientAt(f, z0, rho, phi)                 // -> { re, im } = (f(z0 + h) - f(z0)) / h, h = rho e^{i phi}; any phi
export function microscope(fnId, z0, rho, { m = 72 } = {})  // -> Model (below)
export function ringImage(f, z0, rho, n = 96)               // -> { ring: Pt[n+1], image: Pt[n+1] }, t = k / n; image points may be {NaN, NaN}
export function linearImage(model, n = 96)                  // -> Pt[n+1]: f0 + A rho e^{i phi_k} + B rho e^{-i phi_k}; [] when !model.defined
export function ringFit(model, n = 96)                      // -> { re, im } = (1/n) sum_k (f(z0 + h_k) - f0) e^{-i phi_k} / rho_eff; equals A for analytic f; null when !defined
export function localMapAxes(A, B)                          // -> { major, minor, flipped, kind }: kind 'point' | 'ring' | 'flat' | 'mirrored' | 'ellipse'
export function dcHalfFor(need, current = null)             // -> half-extent from the ladder 1.5 * 2^k with hysteresis (below)
export function angleText(phi)                              // -> 'pi/3' | '-5pi/6' | '0' | '0.087 rad' (exact form when exactAngle finds one, else decimals + ' rad')
export function buildReadout(model)                         // -> the derivative-readout line (section 2.5)
export function verdictText(model)                          // -> { text: string, kind: 'ring' | 'point' | 'flat' | 'mirrored' | 'ellipse' | 'undefined' }
export function quotientTex(fnId)                           // -> { cart, polar }: symbolic TeX of the simplified quotient (section 5, D8)
export function stackTex(...lines)                          // -> '\begin{array}{l}' + lines.join('\\') + '\end{array}'
export function texDecCart(z, digits = 3)                   // -> fmtCart(z) as TeX; words 'undefined' / 'inf' wrapped in \text{}
export function texDecPolar(z, digits = 3)                  // -> decimal modulus, exact-or-decimal angle: '3.606\,e^{i\,0.588}', '1.414\,e^{i\frac{\pi}{4}}', '0', '1', 'e^{i\pi}'

// ---- shared UI helpers (limits.js imports these) ----
export function drawDirectionCircle(ctx, plane, spec)       // spec: { A, B, quotients, bigEvery = 0, highlight = null, point = false, pointLabel = "f′(z₀)", centreLabel = null, marks = [] }
export function ensureStationStyle()                        // injects <style data-for="station-limits-derivative"> once (idempotent, no-op without a DOM)
export function buildStationLinks(ctx)                      // -> <nav class="station-links"> (section 5, S2)
export function renderProblemCard(host, problemId)          // fills (or hides) the <aside>; problemId may be null
export function createAnimator()                            // -> { run(ms, onFrame(p), onDone?), cancel(), get running }

// ---- the station ----
export function mount(el, ctx)                              // -> unmount()
```

**Pt**: `{ re: number, im: number, t: number }`, `t` non-decreasing in `[0, 1]` (plane curves accept it as is).

**Model** (returned by `microscope`; every field is finite or `null`, never NaN):

```js
{ fnId, z0: {re, im}, rho,                 // rho as requested
  rhoEff,                                  // effective ring radius (0 when undefined)
  defined,                                 // false at a pole, or when f(z0) is not finite
  f0: {re, im} | null,
  A: {re, im} | null, B: {re, im} | null,  // from localLinear(f, z0)
  absA: number | null, absB: number | null,
  qMax: number | null,                     // the largest |q| over the quotients (they can swing far from A when the ring is large, 1/z)
  exists,                                  // defined && absB < EXISTS_EPS
  fprime: {re, im} | null,                 // A when exists
  quotients: [{ phi, q }] ,                // directionalQuotients(f, z0, rhoEff, m); [] when undefined
  axes: { major, minor, flipped, kind } | null }
```

`localMapAxes(A, B)`: `major = |A| + |B|`, `minor = abs(|A| - |B|)`, `flipped = |A| < |B| - 1e-9`; `kind`: `'point'` when `major < 1e-6`;
otherwise `'ring'` when `|B| < EXISTS_EPS`; otherwise `'flat'` when `minor <= 0.02 * major`; otherwise `'mirrored'` when `flipped`;
otherwise `'ellipse'`. (This is the shape of the image of a small circle under h -> A h + B conj(h): an ellipse with semi-axes
`major` and `minor`, traversed in the same sense when `|A| > |B|` and the opposite sense when `|A| < |B|`.)

`dcHalfFor(need, current)`: ladder `1.5 * 2^k` (1.5, 3, 6, 12, ...). If `need` is not a positive finite number return `current ?? 1.5`.
If `current` is null, or `need > current`, or `need < current / 4`, return the smallest ladder value `>= need`; otherwise return
`current`. The caller passes `need = 1.3 * Math.max(|A| + |B| + rhoEff, qMax)`.

### 4.2 `js/stations/limits.js` exports

```js
export const FN_IDS;              // ['dir', 'x-over-z']
export const PATH_IDS;            // ['line', 'vertical', 'parabola', 'spiral']
export const PROBLEM_FOR_FN;      // { dir: '2.3.1', 'x-over-z': 'P5' }
export const T_MIN;               // 0.01
export const R_LINE;              // 1.6   (line, vertical and spiral start at distance 1.6)
export const X_PARABOLA;          // 1.2   (the parabola starts at x = 1.2: 1.2 + 1.44i)
export const SPIRAL_K;            // 4     (angle 4 ln(1/t))
export const N_SAMPLES;           // 360
export const N_DIRECTIONS;        // 72
export const EPS;                 // { min: 0.05, max: 1.5, step: 0.05, def: 0.5 }

export function tau(t)                                      // (1 - t) / (1 - 0.01): ramp time of the walk
export function tSamples(n = 360)                           // [1 ... 0.01], n + 1 values, geometric
export function pathPoint(path, t, { m = 1 } = {})          // -> { re, im }
export function pathCurve(path, { m = 1, n = 360 } = {})    // -> Pt[] with t = tau(t_k)
export function imageCurve(f, pts)                          // -> Pt[]: f(p) with the same t
export function pathDirection(path, { m = 1 } = {})         // -> radians | null (spiral)
export function pathDescription(path, m)                    // -> 'y = x^2' ...
export function directionalValue(fnId, alpha)               // -> { re, im }: closed form of the value on the ray at angle alpha
export function directionalValues(fnId, m = 72)             // -> [{ alpha, w }] numeric (P5 via directionalQuotients of Re at 0)
export function directionalCircle(fnId, { m = 72 } = {})    // -> { center, radius, maxDev, values }
export function pathLimit(fnId, path, { m = 1 } = {})       // -> { exists: boolean, value: { re, im } | null }
export function epsDelta(mode, eps)                         // -> { mode, eps, delta: number | null, touch: { re, im } | null, fits: boolean }
export function buildReadout(S)                             // -> the limits-readout line (section 2.5)
export function mount(el, ctx)                              // -> unmount()
```

**State** `S` (what `buildReadout` and the explainer read; `window.__mv.limits.state()` returns a JSON copy):

```js
{ fnId, path, m, t, follow, playing,
  z: {re, im}, g: {re, im},               // current point and value
  alphaStar: number | null,               // arrival direction
  limit: { exists, value },               // along this path
  circle: { center, radius, maxDev },     // of fnId (values omitted from the copy)
  circleExists: boolean,                  // radius < 1e-6
  real: {re, im}, imag: {re, im},         // value along the real / imaginary axis (the two witnesses)
  edMode: 'sq' | 'dir', eps, delta }
```

### 4.3 Events

| Source | Event | Handler |
|---|---|---|
| `derivative-zplane` handle `z0` | `onDrag(z, { final, source })` | `state.z0 = snapZ0(z)`, `refreshModel()` (every pointer move) |
| `derivative-zplane` | `on('viewchange', v)` | `wplane.setView({ unitsAcross: v.unitsAcross })` (all reasons; no loop because the w-plane is not interactive and has no listener) |
| `limits-zplane` | `on('viewchange', v)` | if `v.reason` is `'pan'`, `'zoom'` or `'reset'` and `follow` is on: `follow = false`, update the chip. `'set'` (our own) and `'resize'` are ignored |
| controls | `click` on chips and buttons, `input` on sliders | as in section 2.2 |
| `createExplainer`, `createStaircase`, planes | none subscribed | they update when the station calls them |

No window or document listeners and no store keys are used. Nothing bakes a theme colour into a string held across frames, so the
stations do not subscribe to `themechange` (planes and explainers handle it themselves).

### 4.4 Lifecycle

`mount(el, ctx)` (synchronous; returns `unmount`):

1. `ensureStationStyle()`.
2. Read `ctx.preset` into the initial state (section 5, L1 / D1).
3. Build the DOM of section 2.6 inside `el` only (`el` is the router's empty `<section class="station">`).
4. Create planes (`createPlane(host, { id, ... })`), layers (`plane.addLayer`), curves (`plane.addCurve`), the handle (`plane.addPoint`).
5. Create the explainer(s) and the staircase in their hosts.
6. Attach control listeners.
7. First full refresh (synchronous): the first `explainer.update` renders at once, so the table is never seen empty.
8. `window.__mv = window.__mv || {}; mv.limits = { state }` (or `mv.derivative = { state }`).
9. Return `unmount`. **No `scrollTo`, no `scrollIntoView`, no focus change on mount** (ARCHITECTURE 10.1.2).

`unmount()` (idempotent, never throws):

1. `destroyed = true` (late rAF callbacks check it and return).
2. `animator.cancel()`; clear the status debounce timer; cancel the deferred first-update rAF of the epsilon-delta explainer.
3. Unsubscribe plane `viewchange` listeners.
4. `plane.destroy()` for every plane (z, w, dc / ed-z, ed-w), `explainer.destroy()` for every explainer, `staircase.destroy()`.
5. `delete window.__mv.limits` (or `derivative`) if present.
6. Do not touch `window.__mv.planes` (`plane.destroy()` unregisters its own entry).

### 4.5 `window.__mv` hooks

```js
window.__mv.limits     = { state() }   // JSON copy of S plus { zView: { center, unitsAcross }, curves: { path: n, trace: n } }
window.__mv.derivative = { state() }   // { fnId, z0, rho, rhoEff, phi, defined, A, B, absB, exists, fprime, dcHalf, fit, kind,
                                       //   spokes: 12, zUnits, wUnits }
```

Both are created with `const mv = (window.__mv = window.__mv || {})` (never replace `__mv`). Planes are registered by `createPlane` in
`window.__mv.planes`: ids `limits-zplane`, `limits-wplane`, `limits-ed-zplane`, `limits-ed-wplane`, `derivative-zplane`,
`derivative-wplane`, `derivative-dcplane`.

---

## 5. Algorithms

Conventions: `ZERO = { re: 0, im: 0 }`; `clamp(x, lo, hi)`; angles in radians unless a name ends in `Deg`; `hypot` is `Math.hypot`; every
drawing function below is the body of a `plane.addLayer((ctx, plane) => ...)` callback (CSS pixels; `plane.toPixel`,
`plane.getView().scale` is px per unit). Every layer first returns when its inputs are not finite. Layer `order` values are
ascending draw order (grid and axes first, curves default 100, handles are DOM above everything).

### 5.1 Shared pieces (in `derivative.js`)

**S1. `drawDirectionCircle(ctx, plane, spec)`** (the one circle drawing; used by `derivative-dcplane` and `limits-wplane`)

```
spec = { A, B, quotients: [{phi, q}], bigEvery = 0, highlight = null, point = false, pointLabel = "f'(z0)" (with the prime and subscript glyphs),
         centreLabel = null, marks = [{ z, label }] }
1. if A or B is not finite: return.            r = hypot(B.re, B.im)
2. if r >= EXISTS_EPS: drawCircle(ctx, plane, A, r, { color: '--polar', dash: [7, 5], width: 2 })      // centre A, radius |B|
3. for each {q} in quotients with finite pixel: ctx.save(); globalAlpha = 0.85; fill a circle radius 2.2 px, colour cssColor('--output'); restore
4. if bigEvery > 0: n = quotients.length; for (i = 0, j = 0; i < n; i += bigEvery, j++):
       colour = rampColor(cssColor('--output'), j / (n / bigEvery));  fill a surface-coloured circle radius 4.9, then the dot radius 3.4
5. for each mark {z, label}: a diamond (square rotated 45 deg, half-diagonal 6 px, 2 px stroke cssColor('--cart'), fill cssColor('--surface'));
       drawLabel(ctx, plane, z, label, { color: '--cart', dx: 10, dy: -10 })
6. if highlight is finite: a surface halo (radius 7) then a dot radius 5.5, cssColor('--polar')              // BEFORE the solid point, so the point stays on top
7. if point: drawDot(ctx, plane, A, { color: '--output', radius: 6.5, label: pointLabel, labelOffset: { dx: 10, dy: -10 } })
   else: a plus sign at A (arms 5 px, width 2, cssColor('--cart')); if centreLabel: drawLabel(ctx, plane, A, centreLabel, { color: '--cart', dx: 8, dy: 16 })
```

The solid point (step 7) is drawn **after** the dots (step 3) and after the highlight (step 6), so at the default state a ring of dots of radius 6 px sits under the
6.5 px solid point and its 1.5 px halo: one solid purple point with at most a faint beaded rim, which is the picture A4 asks for ("dots collapsed onto one solid point
labelled f'(z0)"). With the highlight drawn last (the first prototype) the orange chosen-direction dot sat on top of the point and spoiled it.

**S2. `buildStationLinks(ctx)`** returns `<nav class="station-links" aria-label="Where next">`

```
sorted = [...ctx.stations].sort((a, b) => a.order - b.order); i = index of ctx.station.id in sorted
links = new Map()                                   // target id -> { st, dir, threads: Set }
add(st, dir, thread = null): if (!st) return; entry = links.get(st.id) or create { st, dir, threads: new Set() }; if (thread) entry.threads.add(thread)
add(sorted[i - 1], 'prev');  add(sorted[i + 1], 'next')              // registry neighbours first (they win ties)
for tid of ctx.station.threads:
   before = last s in sorted[0 .. i-1] with s.order > 0 and s.threads.includes(tid)        // 'home' is on every thread: skip it
   after  = first s in sorted[i+1 ..]  with s.threads.includes(tid)
   add(before, 'prev', tid); add(after, 'next', tid)
for each entry: a = <a class="station-link" href="#<st.id>" data-dir="<dir>" data-thread="<tids joined by space>">
   text = (dir === 'prev' ? 'Previous: ' : 'Next: ') + st.title
   id:  ctx.station.id === 'limits' && st.id === 'derivative' ? 'limits-to-derivative'
      : ctx.station.id === 'derivative' && st.id === 'limits' ? 'derivative-to-limits'
      : `${ctx.station.id}-link-${st.id}`
   the two cross-links get a muted second line: "the circle shrinks to a point" (limits -> derivative), "the circle of directional values" (derivative -> limits)
```

**S3. `renderProblemCard(host, problemId)`**: `host.replaceChildren()`; `p = problemId && problemById(problemId)`; if none: `host.hidden = true` and return.
Else `host.hidden = false` and append: `<p class="ld-problem-title">Problem ${p.id}</p>`; `<p>` with the statement (`statementParts(p.statement)`: `math: false`
parts as text nodes, `math: true` parts as `<span>` filled by `tex(span, part.text)`); `<p>` with a `<span class="badge" data-tone="...">`
holding `addressLabel(p.address)` (tone: the first of `addressTones(p.address)` without its `--`), a space, then a `<span>` filled by
`prose(span, p.addressWhy)`.

**S4. `createAnimator()`**

```
let raf = 0, token = 0
run(ms, onFrame, onDone): cancel(); const my = ++token, t0 = performance.now()
    const tick = (now) => { if (my !== token) return; const p = clamp((now - t0) / ms, 0, 1); onFrame(p);
                            if (p < 1) raf = requestAnimationFrame(tick); else { raf = 0; if (onDone) onDone(); } }
    raf = requestAnimationFrame(tick)
cancel(): token++; if (raf) cancelAnimationFrame(raf); raf = 0
get running(): raf !== 0
```

**S5. TeX helpers**: `stackTex(...lines) = '\\begin{array}{l}' + lines.join('\\\\') + '\\end{array}'`; `texDecCart(z)`: `s = fmtCart(z, 3)`; if `s` is
`'undefined'` or `'inf'` return `'\\text{' + s + '}'` else `s` (the ASCII form is valid TeX: "3 - 2i", "0.5", "-i"). `texDecPolar(z)`:

```
p = toPolar(z) (z not finite -> '\\text{undefined}');  R = fmtNum(p.r, 3);  if R === '0' return '0'
T = texAngle(p.theta, 3)  // '\\frac{\\pi}{4}', '-\\frac{\\pi}{3}', '0', or a decimal such as '0.588'
if T === '0' return R
neg = T[0] === '-';  absT = neg ? T.slice(1) : T;  sp = /^\d/.test(absT) ? '\\,' : ''
e = 'e^{' + (neg ? '-' : '') + 'i' + sp + absT + '}'
return R === '1' ? e : R + '\\,' + e
```

These two are decimal forms **on purpose**: the readout shows decimals, so the explainer must not show fractions for the same quantity
(ARCHITECTURE 10.4.5). `texAngle` is allowed for angles (exact form when there is one, matching the readout's parenthesis).

**S6. `buildReadout`, text helpers**: `angleText(phi) = exactAngle(phi) ? fmtAngle(phi) : fmtNum(phi) + ' rad'`; `degText(rad, d) = fmtNum(rad * 180 / Math.PI, d)`;
`angleLabel(theta)` (canvas label): `exactAngle(theta) ? fmtNum(theta) + ' (' + fmtAngle(theta) + ')' : fmtNum(theta)`.

### 5.2 `limits` algorithms

**L1. `mount`**

```
1. ensureStationStyle()
2. st = { fnId: 'dir', path: 'parabola', m: 1, t: 0.45, follow: false, playing: false, edMode: 'sq', eps: 0.5 }
   p = ctx.preset
   if p.kind === 'problem':  '2.3.1' -> defaults;  'P5' -> fnId 'x-over-z', path 'line', m 0
   if p.kind === 'token':    tok = p.token.toLowerCase(); PATH_IDS has tok -> st.path = tok; FN_IDS has tok -> st.fnId = tok; anything else: defaults, no error
   if p.kind === 'topic' or no preset: defaults (the first problem's state)
3. build the DOM of 2.6; fill header (title, lede, badge, problem chips from problemsForStation('limits'): <a class="chip problem-chip" href="#problem-<dashes>" title=aha>)
4. zplane  = createPlane(zHost, { id: 'limits-zplane', xRange: [-2, 2], yRange: [-2, 2], grid: 'polar', axisLabels: ['Re', 'Im'],
                                  minUnitsAcross: 0.02, maxWidth: 460, ariaLabel: 'z-plane: paths into 0' })
   wplane  = createPlane(wHost, { id: 'limits-wplane', xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], grid: 'polar', axisLabels: ['u', 'v'],
                                  maxWidth: 460, ariaLabel: 'w-plane: values of g along the path' })
   zplane layers: 'other-side' (order 10), 'guide' (20), 'puncture' (50), 'direction' (60)         (L7)
   wplane layers: 'circle' (10), 'limit' (30), 'address' (60)                                      (L8)
   zCurve = zplane.addCurve({ id: 'path',  points: [], color: '--input',  ramp: true, width: 3, dots: true, arrow: true })
   wCurve = wplane.addCurve({ id: 'trace', points: [], color: '--output', ramp: true, width: 3, dots: true, arrow: true })
5. stairs = createStaircase(stairsHost, { id: 'limits-stairs', kMin: -1, kMax: 1, label: 'arg g' })
   ex = createExplainer(exHost, { id: 'limits-ex', title: 'The same computation in both addresses', columns: COLS (tint: true),
                                  rows: LIMITS_ROWS, same: (s) => ({ cart: texDecCart(s.g), polar: texDecPolar(s.g), agree: true }) })
   edZ, edW = createPlane(..., { id: 'limits-ed-zplane' | 'limits-ed-wplane', interactive: false, legend: false, maxWidth: 380 })
   edEx = createExplainer(edExHost, { id: 'limits-ed-ex', ... })      // NOT updated yet
6. wire controls (2.2): chips, sliders, buttons; zplane.on('viewchange', ...) (4.3)
7. refreshFn() ; refreshPath() ; refreshState() ; edRefresh({ deferExplainer: true }) ; renderProblemCard(...)
   edFrame = requestAnimationFrame(() => { if (!destroyed) edEx.update(edState()) })
8. mv.limits = { state }; return unmount
```

`COLS = [ { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true } ]`.

**L2. Path and sampling**

```
tau(t) = (1 - t) / (1 - T_MIN)                                  // 0 at t = 1, 1 at t = 0.01
tSamples(n = 360) = [ exp(ln(T_MIN) * k / n) for k = 0..n ]     // 1 down to 0.01, geometric: dense near 0 where the spiral turns fastest
pathPoint(path, t, { m }):
   'line':     a = atan(m);               return { re: R_LINE * t * cos a, im: R_LINE * t * sin a }
   'vertical': return { re: 0, im: R_LINE * t }
   'parabola': x = X_PARABOLA * t;        return { re: x, im: x * x }
   'spiral':   th = SPIRAL_K * ln(1 / t); return { re: R_LINE * t * cos th, im: R_LINE * t * sin th }
   other: throw RangeError
pathDirection(path, { m }) = line: atan(m); vertical: pi / 2; parabola: 0; spiral: null
pathCurve(path, { m, n }) = tSamples(n).map((t) => ({ ...pathPoint(path, t, { m }), t: tau(t) }))
imageCurve(f, pts) = pts.map((p) => { w = f(p); return { re: w.re, im: w.im, t: p.t } })     // f is never evaluated at 0: |z| >= 0.012 on every path
```

Smallest |z| on a path is 0.012 (parabola at t = 0.01), so the compiled `g` (which is 0/0 at exactly 0) is never evaluated at the puncture.
`g` stays finite on every path.

**L3. Derived state** (`deriveState(st)` runs on every state change; it is cheap)

```
f = compiledFn(st.fnId)
z = pathPoint(st.path, st.t, { m: st.m });  g = f(z)
alphaStar = pathDirection(st.path, { m: st.m });  limit = pathLimit(st.fnId, st.path, { m: st.m })
circle = circleCache.get(st.fnId) or compute directionalCircle(st.fnId) and store (once per function)
real = directionalValue(st.fnId, 0);  imag = directionalValue(st.fnId, Math.PI / 2)
circleExists = circle.radius < 1e-6
return { ...st, z, g, alphaStar, limit, circle, circleExists, real, imag, delta: epsDelta(st.edMode, st.eps).delta }
```

**L4. The circle of directional values**

```
directionalValue(fnId, a):      'dir'      -> { re: cos 2a,           im: sin 2a }            // e^{2ia}
                                'x-over-z' -> { re: (1 + cos 2a) / 2, im: -sin(2a) / 2 }      // 1/2 + (1/2) e^{-2ia} = cos a e^{-ia}
directionalValues(fnId, m = 72):
   if fnId === 'x-over-z':      // g IS the difference quotient of Re at 0 (problem P6's circle)
        return directionalQuotients(RE, ZERO, 1e-3, m).map(({ phi, q }) => ({ alpha: phi, w: q }))     // RE = compile('Re(z)').f
   else for j in 0..m-1: alpha = 2 pi j / m;  w = g({ re: 1e-3 cos alpha, im: 1e-3 sin alpha });  push { alpha, w }
directionalCircle(fnId, { m = 72 }):
   values = directionalValues(fnId, m)
   center = mean of the w's;  radius = mean of |w - center|;  maxDev = max | |w - center| - radius |
   return { center, radius, maxDev, values }          // maxDev < 1e-9 for both functions (they ARE circles)
pathLimit(fnId, path, { m }): path === 'spiral' ? { exists: false, value: null }
                                                 : { exists: true, value: directionalValue(fnId, pathDirection(path, { m })) }
```

P5 extra: `const { A, B } = localLinear(RE, ZERO)` gives `A = B = 0.5` (to 1e-9) and feeds the second sentence of `limits-fn-note` for `x-over-z`:
" It is also the difference quotient of Re z at 0, the circle of problem P6 (A = 0.5, B = 0.5)." (numbers from `fmtNum`).

**L5. Refreshes**

```
refreshFn():   chips aria-pressed; prose(fnNote, fnById(st.fnId).note + (x-over-z ? P6 sentence : '')); renderProblemCard(card, PROBLEM_FOR_FN[st.fnId])
refreshPath(): chips aria-pressed; m row hidden unless path === 'line';
               pts = pathCurve(st.path, { m: st.m });  zCurve.update(pts);  wCurve.update(imageCurve(f, pts))
refreshState():
   S = deriveState(st)
   zCurve.setCursor(tau(st.t));  wCurve.setCursor(tau(st.t))
   if st.follow: zplane.setView({ center: ZERO, unitsAcross: clamp(2.6 * hypot(S.z.re, S.z.im), 0.05, 4) })
   zplane.requestDraw(); wplane.requestDraw()
   readout.textContent = buildReadout(S);  tOut.textContent = 't = ' + fmtNum(st.t, 2);  mOut.textContent = 'm = ' + fmtNum(st.m) + ' (angle ' + fmtNum(atan(st.m) * 180 / PI, 1) + ' deg)'
   pathNote.textContent = pathNoteText(S);  verdict.textContent = verdictTextLimits(S); verdict.dataset.exists = S.circleExists ? 'yes' : 'no'
   stairs.update(hypot(S.g.re, S.g.im) < 1e-9 ? null : Arg(S.g))
   ex.update(S)           // while st.playing: only if 50 ms have passed since the last explainer update, plus always on the last frame
   scheduleStatus()       // debounce 400 ms: limits-status.textContent = ...
```

Typing a new `m` or switching path calls `refreshPath()` then `refreshState()`; a new `t` calls only `refreshState()` (curves are not rebuilt).
`pathNoteText(S)`: line or vertical -> the "line" sentence with `a = degText(alphaStar, 0)` and the other side `degText(wrapArg(alphaStar + PI), 0)`;
parabola -> the parabola sentence with `fmtCart(S.limit.value)`; spiral -> the spiral sentence (section 2.5). `verdictTextLimits(S)` -> section 2.5
verdict with `S.real`, `S.imag`, `S.circle.center`, `S.circle.radius`.

**L6. Explainer rows** (`LIMITS_ROWS`; ids are safe; `T = texDecCart`, `P = texDecPolar`; the TeX below was rendered by the vendored KaTeX)

| row id, label | native | Cartesian cell | Polar cell |
|---|---|---|---|
| `fn`, "The function" | `'polar'` | dir: `\dfrac{x^2-y^2}{x^2+y^2}+i\,\dfrac{2xy}{x^2+y^2}`; x-over-z: `\dfrac{x^2}{x^2+y^2}-i\,\dfrac{xy}{x^2+y^2}` | dir: `e^{2i\theta}`; x-over-z: `stackTex('\cos\theta\,e^{-i\theta}', '=\tfrac12+\tfrac12\,e^{-2i\theta}')` |
| `now`, "At this t" | null | `stackTex('z = ' + T(s.z), 'g = ' + T(s.g))` | `stackTex('z = ' + P(s.z), 'g = ' + P(s.g))` |
| `limit`, "Limit on this path" | `'polar'` | see below | see below |
| `circle`, "All directions" | `null` | dir: `u^2+v^2=1`; x-over-z: `\left(u-\tfrac12\right)^2+v^2=\tfrac14` | dir: `w = 0 + 1\cdot e^{2i\theta}`; x-over-z: `w = 0.5 + 0.5\,e^{-2i\theta}` |
| `verdict`, "Is there a limit?" | `null` | `stackTex('\text{real axis: } ' + T(s.real), '\text{imaginary axis: } ' + T(s.imag), T(s.real) + '\neq ' + T(s.imag))` | `stackTex('\text{radius } r = ' + fmtNum(s.circle.radius) + ' > 0', '\Rightarrow\ \text{no limit}')` |

`limit` row, by path (L = `s.limit.value`, `a = texAngle(s.alphaStar)`):

| path | Cartesian | Polar |
|---|---|---|
| line, dir | `stackTex('\dfrac{1-m^2+2im}{1+m^2},\ m=' + fmtNum(s.m), '= ' + T(L))` | `stackTex('e^{2i\alpha^{*}},\ \alpha^{*}=' + a, '= ' + T(L))` |
| line, x-over-z | `stackTex('\dfrac{1}{1+im},\ m=' + fmtNum(s.m), '= ' + T(L))` | `stackTex('\cos\alpha^{*}\,e^{-i\alpha^{*}},\ \alpha^{*}=' + a, '= ' + T(L))` |
| vertical, dir | `stackTex('\dfrac{-y^2}{y^2}', '= ' + T(L))` | same polar cell as the line (alpha* = pi/2) |
| vertical, x-over-z | `stackTex('\dfrac{0}{iy}', '= ' + T(L))` | same as the line |
| parabola, dir | `stackTex('\dfrac{1-x^2+2ix}{1+x^2}', '\to ' + T(L) + '\quad(x\to 0)')` | same polar cell with alpha* = 0 |
| parabola, x-over-z | `stackTex('\dfrac{1}{1+ix}', '\to ' + T(L) + '\quad(x\to 0)')` | same |
| spiral | `\text{no limit: g keeps going round}` | `\text{the angle never settles}` |

**L7. z-plane layers**

```
'other-side' (order 10): if path is 'line' or 'vertical': b = pathPoint(path, 1, { m }); draw the segment from ZERO to (-b.re, -b.im):
      colour cssColor('--input'), globalAlpha 0.35, width 1.5, dash DASH.guide                    // "the same value comes in from this side too"
'guide' (order 20): if alphaStar !== null: drawRay(ctx, plane, alphaStar, { color: '--polar', dash: DASH.guide, width: 1.5 })
'puncture' (order 50): p = plane.toPixel(ZERO): fill a circle radius 5 with cssColor('--surface'), stroke 2 px cssColor('--text');
      drawLabel(ctx, plane, ZERO, 'g undefined at 0', { color: '--text', dx: -10, dy: -14, align: 'right' })      // upper left: the path comes in from the right and the tick labels are below
'direction' (order 60): theta = Arg(S.z); R = 30 / plane.getView().scale
      drawRay(ctx, plane, theta, { color: '--polar', width: 1.5 })
      drawArc(ctx, plane, ZERO, R, Math.min(0, theta), Math.max(0, theta), { color: '--polar', width: 2.5 })       // ascending angles on purpose
      la = theta + (theta >= 0 ? 0.45 : -0.45)                          // just BEYOND the ray, away from the real axis (a wedge label sat on the axis guide and the tick labels)
      drawLabel(ctx, plane, fromPolar((30 + 18) / scale, la), 'Arg z = ' + angleLabel(theta), { color: '--polar', dx: 0, dy: 0, align: cos(la) >= 0 ? 'left' : 'right' })
```

(`drawPolarAddress` is not used on this plane: it draws nothing when the ray is shorter than 6 px, which is exactly the interesting case.)

**L8. w-plane layers**

```
'circle' (order 10): drawDirectionCircle(ctx, plane, { A: S.circle.center, B: { re: S.circle.radius, im: 0 },
                        quotients: circle.values.map(({ alpha, w }) => ({ phi: alpha, q: w })), centreLabel: 'centre' })
'limit' (order 30): if S.limit.exists: P = plane.toPixel(S.limit.value): stroke a ring radius 8 px, width 2.5, cssColor('--output');
                    drawLabel(ctx, plane, S.limit.value, 'limit ' + fmtCart(S.limit.value), { color: '--text', dx: 12, dy: 18 })
'address' (order 60): if hypot(S.g) >= 1e-9: drawPolarAddress(ctx, plane, S.g, { ghosts: 1, ghostsNeg: 1, name: 'g' })
```

**L9. Follow zoom**: on chip press: `st.follow = !st.follow`; on: `refreshState()` applies the window; off: `zplane.resetView()` (listener ignores the
resulting `'reset'` because `follow` is already false). While on, every `refreshState` sets the window as in L5, so Walk zooms in by itself.

**L10. Walk**

```
walk():
   if st.playing: stopWalk(); return
   if ctx.theme.prefersReducedMotion(): STEP_TS = [1, 0.6, 0.35, 0.2, 0.1, 0.05, 0.02, 0.01]; next = first value below st.t - 1e-9, else 1; setT(next); return
   if st.t <= T_MIN + 0.001: setT(1)
   from = st.t;  ms = Math.max(800, 6500 * (from - T_MIN) / (1 - T_MIN));  st.playing = true;  playBtn.textContent = 'Pause'
   animator.run(ms, (p) => setT(from + (T_MIN - from) * p), () => { st.playing = false; playBtn.textContent = 'Walk toward 0'; refreshState() })
stopWalk(): animator.cancel(); st.playing = false; playBtn.textContent = 'Walk toward 0'
setT(v): st.t = clamp(v, T_MIN, 1); tSlider.value = String(st.t) (a display value, the slider rounds to its step; st.t is not rounded); refreshState()
tSlider 'input' handler: stopWalk(); setT(Number(tSlider.value))
```

**L11. Epsilon-delta**

```
edModel = epsDelta(mode, eps):  'sq':  delta = sqrt(1 + eps) - 1;  touch = { re: 1 + eps, im: 0 };  fits = true
                                'dir': delta = null;                touch = null;                     fits = false
views:   sq:  edZ.setView({ center: { re: 1, im: 0 }, unitsAcross: 1.6 });  dir: edZ.setView({ center: ZERO, unitsAcross: 1.6 });  edW.setView({ center: { re: 0.75, im: 0 }, unitsAcross: 4.4 })
radius shown in the z-plane:  r = mode === 'sq' ? delta : 0.4                                     // dir: "any radius will do"
image of the z-circle:  129 points phi = 2 pi k / 128:   sq: u = 1 + r e^{i phi}, w = mul(u, u)   dir: w = g(r e^{i phi}) with the compiled dir function
inside_k = hypot(w_k.re - 1, w_k.im) <= eps + 1e-9
ed z layer:  drawCircle(ctx, plane, z0, r, { color: '--input', fill: true, fillAlpha: 0.15, width: 2 });
             sq: drawDot(ctx, plane, { re: 1, im: 0 }, { color: '--input', radius: 4, label: 'z0 = 1' });
             dir: hollow dot at 0 (as 'puncture') with label 'g undefined at 0'
ed w layer:  drawCircle(ctx, plane, { re: 1, im: 0 }, eps, { color: '--output', fill: true, fillAlpha: 0.12, width: 2 }); drawDot(ctx, plane, { re: 1, im: 0 }, { color: '--output', radius: 4, label: 'w0 = 1' });
             the image polyline in runs of equal inside_k: inside runs cssColor('--output') width 2.5, outside runs cssColor('--danger') width 4;
             sq: a ring radius 7 in cssColor('--ok') at touch, drawLabel(ctx, plane, touch, 'touches here', { color: '--text', dx: 8, dy: 24 })   // below, clear of the 'w0 = 1' label
readout:     sq:  'eps = ' + fmtNum(eps, 2) + '; largest delta = ' + fmtNum(delta);    dir: 'eps = ' + fmtNum(eps, 2) + '; no delta works'
explainer rows (edEx.setRows on a mode change, then update):
   sq:  fz    "f(1 + h) - 1"  cart: `2h+h^2=(2a+a^2-b^2)+i\,(2b+2ab)`           polar: `h\,(2+h),\quad h=\delta e^{i\varphi}`
        worst "Worst step"    cart: `h=a+ib=${fmtNum(delta)}+0i`                  polar: `|h|=${fmtNum(delta)},\ \operatorname{Arg}h=0`
        err   "Error there"   cart: `|2h+h^2|=${fmtNum(delta * (2 + delta))}`     polar: `\delta\,|2+\delta|=\delta(2+\delta)=${fmtNum(delta * (2 + delta))}`
        same: cart `\varepsilon=${fmtNum(eps, 2)}`, polar `\varepsilon=${fmtNum(eps, 2)}`, agree = |delta (2 + delta) - eps| < 1e-9
   dir: fz    "g(z) - 1"      cart: `\dfrac{x^2-y^2}{x^2+y^2}-1+i\,\dfrac{2xy}{x^2+y^2}`   polar: `e^{2i\theta}-1`
        worst "Worst direction" cart: `z=iy:\ g=-1`                               polar: `\theta=\tfrac{\pi}{2}:\ e^{i\pi}=-1`
        err   "Error there"   cart: `|g-1|=|-1-1|=2`                              polar: `|e^{i\pi}-1|=2`
        same: cart `\text{error } 2 > \varepsilon`, polar `\text{error } 2 > \varepsilon`, agree = true
note: sq or dir sentence of 2.5
```

The "worst step" claim is exact: for `|h| = delta` the error is `|h||2 + h| <= delta (2 + delta)` with equality when `arg h = arg 2 = 0`
(the triangle inequality is tight when the arguments agree). This is why the image curve touches the epsilon-circle at `w = 1 + eps`.

**L12. `buildReadout(S)`**

```
'path: ' + pathDescription(S.path, S.m)
+ '; value at t: ' + fmtCart(S.g)
+ '; limit along this path: ' + (S.limit.exists ? fmtCart(S.limit.value) : 'none (keeps circling)')
+ '; set of directional limits: circle center ' + fmtCart(S.circle.center) + ' radius ' + fmtNum(S.circle.radius)
+ '; limit exists: ' + (S.circleExists ? 'yes' : 'no')
pathDescription: line -> m === 0 ? 'y = 0' : m === 1 ? 'y = x' : m === -1 ? 'y = -x' : 'y = ' + fmtNum(m) + 'x';  vertical -> 'x = 0';  parabola -> 'y = x^2';  spiral -> 'spiral into 0'
```

### 5.3 `derivative` algorithms

**D1. `mount`**

```
1. ensureStationStyle()
2. st = { fnId: 'sq-plus-z', z0: { re: 1, im: 1 }, rho: 0.2, phiDeg: 0, dcHalf: null }
   p = ctx.preset
   problem '3.1.1' -> defaults; '3.1.2' -> fnId 'abs2'; 'P6' -> fnId 're', z0 = { re: 0.3, im: -0.7 }
   token: FUNCTION_IDS has token -> fnId = token (z0 stays 1 + i); anything else, topic, none: defaults
3. DOM, header with problemsForStation('derivative')
4. zplane  = createPlane(zHost,  { id: 'derivative-zplane',  xRange: [-2, 2], yRange: [-2, 2], grid: 'cart',  axisLabels: ['Re', 'Im'], legend: false, maxWidth: 460, ariaLabel: 'z-plane: ring of directions around z0' })
   wplane  = createPlane(wHost,  { id: 'derivative-wplane',  xRange: [-2, 2], yRange: [-2, 2], grid: 'cart',  axisLabels: ['u', 'v'],   legend: false, maxWidth: 460, interactive: false, ariaLabel: 'w-plane: the ring after f' })
   dcplane = createPlane(dcHost, { id: 'derivative-dcplane', xRange: [-6, 6], yRange: [-6, 6], grid: 'polar', axisLabels: ['Re', 'Im'], legend: false, maxWidth: 460, interactive: false, maxUnitsAcross: 1e6, ariaLabel: 'Difference quotients, one per direction' })
   z0 handle: zplane.addPoint({ id: 'z0', z: st.z0, color: '--input', label: 'z0', name: 'z0', radius: 7, step: 0.05, snap: snapZ0, onDrag: (z) => { st.z0 = snapZ0(z); refreshModel(); } })   // Superseded in residue cleanup: the handle is now `label: ''`, `name: 'z0'`, `symbol: 'z0'` and the word `z0` is drawn by the placer at ring radius + 8 px
   zRing = zplane.addCurve({ id: 'ring',  points: [], color: '--input',  ramp: true, width: 2.5, dots: false, arrow: true })
   wRing = wplane.addCurve({ id: 'image', points: [], color: '--output', ramp: true, width: 2.5, dots: false, arrow: true })
   layers: zplane 'spokes' (20), 'highlight' (60); wplane 'linear' (10), 'spokes' (20), 'highlight' (60), 'f0' (70); dcplane 'address' (10), 'circle' (20)    (D5-D7)
5. ex = createExplainer(exHost, { id: 'derivative-ex', title: ..., columns: COLS (tint: true), rows: [quotient, limit, verdict], same })
6. wire controls; zplane.on('viewchange', (v) => wplane.setView({ unitsAcross: v.unitsAcross }))
7. refreshFn(); refreshModel();   // refreshModel builds everything and calls ex.update(...) once
8. mv.derivative = { state }; return unmount
```

`snapZ0(z)`: `{ re: Math.round(z.re * 20) / 20 + 0, im: Math.round(z.im * 20) / 20 + 0 }` (the `+ 0` turns -0 into 0).
The snap is on purpose: it makes the numbers in the readout tidy (z0 = 0.35 - 0.7i, not 0.3517 - 0.6983i) and it makes the interaction
tests exact: a script that drags the handle to {0.5, -1} lands on exactly 0.5 - i because the pixel error (at most about 0.017
units on the phone) is far below the snap radius (0.025).

**D2. `microscope(fnId, z0, rho, { m = 72 })`**

```
f = compiledFn(fnId);  fn = fnById(fnId)
poleDist = min over fn.poles of hypot(z0.re - p.re, z0.im - p.im)       // Infinity when there are none
if poleDist < 1e-9: return { fnId, z0, rho, rhoEff: 0, defined: false, f0: null, A: null, B: null, absA: null, absB: null, qMax: null, exists: false, fprime: null, quotients: [], axes: null }
rhoEff = Math.min(rho, 0.5 * poleDist)                                   // "rho is relative to |z0| near poles": the ring never reaches the pole
f0 = f(z0);  if f0 is not finite: return the undefined model (defined: false)
{ A, B } = localLinear(f, z0)                                            // step 1e-5, central differences
quotients = directionalQuotients(f, z0, rhoEff, m)                       // rhoEff > 0 here, so no RangeError
absA = hypot(A);  absB = hypot(B);  exists = absB < EXISTS_EPS;  fprime = exists ? A : null;  axes = localMapAxes(A, B)
qMax = max over quotients of hypot(q.re, q.im)
```

`effectiveRho(fnId, z0, rho)` is the same two lines (`poleDist`, `rhoEff`) as a separate pure function (returns 0 at a pole). For 1/z at z0 = 0.5: `0.25` when rho
is 0.3 or more; 0.1 when rho is 0.1.

**D3. `quotientAt(f, z0, rho, phi)`**: `h = { re: rho cos phi, im: rho sin phi }`; `div(sub(f(add(z0, h)), f(z0)), h)` (complex.js). It equals
`directionalQuotients(...)` at the grid angles (pinned by a test) and is used for the highlighted direction and the explainer's live value.

**D4. Ring and its image**

```
ringImage(f, z0, rho, n = 96): for k = 0..n: phi = 2 pi k / n; z = z0 + rho e^{i phi}; ring.push({ ...z, t: k / n }); w = f(z); image.push({ re: w.re, im: w.im, t: k / n })
        // t = phi / 2 pi; the first and last points coincide (a closed curve stored as a copy of its first point); a pole-free ring never gives NaN
linearImage(model, n = 96): for k = 0..n: h = rhoEff e^{i phi_k}; w = f0 + A h + B conj(h); { re, im, t: k / n }
ringFit(model, n = 96): (1 / n) * sum over k = 0..n-1 of (f(z0 + h_k) - f0) e^{-i phi_k} / rhoEff        // = A for every function in the catalogue (the h^2, h-bar and higher terms average out)
spoke j (j = 0..11) is index 8 j of ring and image                       (N_RING / N_SPOKES = 8)
```

**D5. z-plane layers**

```
'spokes' (order 20): for j in 0..11: seg from z0 to ring[8 j]: colour = rampColor(cssColor('--input'), j / 12), width 2;
        a tip dot at ring[8 j]: surface halo radius 3.4, then radius 2.4, same colour                      // no arrowheads: at rho = 0.02 the spokes are 2 px long; bigger dots touch each other at rho = 0.15
'highlight' (order 60): phi = wrapArg(st.phiDeg * PI / 180);  tip = z0 + rhoEff e^{i phi};
        drawSegment(ctx, plane, z0, tip, { color: '--polar', width: 3, arrow: true });
        rArc = Math.max(0.5 * rhoEff, 14 / scale);  drawArc(ctx, plane, z0, rArc, Math.min(0, phi), Math.max(0, phi), { color: '--polar', width: 2 });
        label BELOW the ring (not beside the arc: z0 = 1 + i sits next to the zoom buttons and a label beside the arrow ran under "Reset"):
            drawLabel(ctx, plane, z0, 'Arg h = ' + degText(phi, 0) + ' deg', { color: '--polar', dx: 0, dy: rhoEff * scale + 22, align: 'center' })
        // drawn only when defined; the whole layer returns when !defined
(the ring curve is the zRing curve layer, order 100, drawn above the spokes; the handle is DOM above everything)
```

**D6. w-plane layers** (the window follows f(z0), the scale follows the z-plane)

```
refreshModel: if defined: wplane.setView({ center: model.f0 })            // unitsAcross is set by the z-plane viewchange mirror
'linear' (order 10): polyline through linearImage(model) in cssColor('--polar'), width 1.5, globalAlpha 0.8, dash [4, 4]
'spokes' (order 20): for j: seg from f0 to image[8 j], colour rampColor(cssColor('--output'), j / 12), width 1.5, tip dot radius 2.6 with a 1 px halo
'highlight' (order 60): wphi = f(z0 + rhoEff e^{i phi}); seg f0 -> wphi (width 3, cssColor('--polar')) and a dot radius 4.5 at wphi
        if model.exists and absA >= 0.05:  argA = Arg(A);  rSpin = 26 / scale;
            a faint reference ray: segment from f0 to f0 + (40 / scale) in the +x direction (dash DASH.guide, cssColor('--polar'), alpha 0.6);
            drawArc(ctx, plane, f0, rSpin, Math.min(0, argA), Math.max(0, argA), { color: '--polar', width: 2.5 });
            lr = Math.max(rSpin + 14 / scale, (ringPx + 14) / scale)           // outside the image ring, never on its spokes
            drawLabel(ctx, plane, f0 + lr e^{i argA / 2}, 'spin Arg f′ = ' + degText(argA, 2) + ' deg', { color: '--polar', dx: 0, dy: 0, align: cos(argA / 2) >= 0 ? 'left' : 'right' })
'f0' (order 70): drawDot(ctx, plane, f0, { color: '--output', radius: 4 });
        drawLabel(ctx, plane, f0, 'f(z0) = ' + fmtCart(f0), { color: '--text', dx: 0, dy: ringPx + 18, align: 'center' })       // below the image ring, not on its spokes
ringPx = the largest pixel distance from toPixel(f0) to toPixel(image[k]) over the finite image points (computed inside the layer; drawLabel's clamp keeps a label inside the canvas when the ring is huge)
```

**D7. Quotient plane**

```
refreshModel: half = dcHalfFor(1.3 * Math.max(absA + absB + rhoEff, qMax), st.dcHalf);  if half !== st.dcHalf: st.dcHalf = half; dcplane.setView({ center: ZERO, unitsAcross: 2 * half })
'address' (order 10): if defined: drawPolarAddress(ctx, plane, model.A, { ghosts: 1, ghostsNeg: 1, name: model.exists ? "f′" : 'A' })   // ray 0 -> A, solid arc "Arg A", faint windings "also ..."
'circle' (order 20): if defined: drawDirectionCircle(ctx, plane, { A: model.A, B: model.B, quotients: model.quotients, bigEvery: 6,
                        highlight: quotientAt(f, z0, rhoEff, phi), point: model.exists,
                        marks: model.exists ? [] : [ { z: A + B, label: 'h real: ' + fmtCart(A + B) }, { z: A - B, label: 'h imaginary: ' + fmtCart(A - B) } ] })
```

For the default state (`f = z^2 + z`, `z0 = 1 + i`, `rho = 0.2`): `need = 1.3 (3.606 + 0 + 0.2) = 4.95` (and `qMax = 3.806`), so `half = 6`, the plane is 12 units across,
30 px per unit on a 360 px plane; A = 3 + 2i is at pixel (270, 120); the ring of dots has radius 6 px. Why `qMax` and not only `|A| + |B| + rho`: for 1/z at z0 = 0.5 with
rho clipped to 0.25 the quotients swing from -2.67 to -8 while A = -4, and the ring would otherwise run off the plane (found in the prototype, section 1.5).

**D8. Explainer rows** (`T = texDecCart`, `P = texDecPolar`; state `s = { model, phi, q, native }`, `q = quotientAt(...)`, `native` = `'cart'` for
`sq-plus-z`, `'polar'` for `abs2`, else `null`). When `!s.model.defined` every cell is `{ text: 'no value here' }` and `same` returns `{ cart: '\text{no value}', polar: '\text{no value}', agree: null }` (the footer then reads "not checked", not "agree"). Only the `quotient` and `limit` rows carry the "easy in ..." badge (three identical badges in a row were noise in the prototype).

`quotientTex(fnId)` (symbolic, h = a + ib in the Cartesian cell and h = rho e^{i phi} in the polar cell):

| fnId | cart | polar |
|---|---|---|
| `sq-plus-z` | `2z_0+1+h` | `2z_0+1+\rho e^{i\varphi}` |
| `abs2` | `\overline{z_0}+z_0\,\dfrac{\overline{h}}{h}+\overline{h}` | `\overline{z_0}+z_0e^{-2i\varphi}+\rho e^{-i\varphi}` |
| `conj` | `\dfrac{\overline{h}}{h}` | `e^{-2i\varphi}` |
| `re` | `\dfrac{\operatorname{Re}h}{h}` | `stackTex('\cos\varphi\,e^{-i\varphi}', '=\tfrac12+\tfrac12e^{-2i\varphi}')` |
| `cube` | `3z_0^{2}+3z_0h+h^{2}` | `3z_0^{2}+3z_0\rho e^{i\varphi}+\rho^{2}e^{2i\varphi}` |
| `exp` | `e^{z_0}\,\dfrac{e^{h}-1}{h}` | `e^{z_0}\,\dfrac{e^{\rho e^{i\varphi}}-1}{\rho e^{i\varphi}}` |
| `recip` | `-\dfrac{1}{z_0\,(z_0+h)}` | `-\dfrac{1}{z_0\,(z_0+\rho e^{i\varphi})}` |

Rows (`L = A + B e^{-2i phi}`, the limit along the current direction):

| id, label | native | Cartesian cell | Polar cell |
|---|---|---|---|
| `quotient`, "Difference quotient" | `s.native` | `stackTex(quotientTex.cart, '= ' + T(q))` | `stackTex(quotientTex.polar, '= ' + P(q))` |
| `limit`, "Limit as the ring shrinks" | `s.native` | `stackTex('h\ \text{real: } u_x+iv_x = ' + T(A + B), 'h\ \text{imaginary: } v_y-iu_y = ' + T(A - B))` | `stackTex('A+B\,e^{-2i\varphi}', '=' + P(L), '\text{circle: centre } A,\ \text{radius } \lvert B\rvert')` |
| `verdict`, "Does the derivative exist?" | `null` | `stackTex('u_x+iv_x \overset{?}{=} v_y-iu_y', T(A + B) + (exists ? '=' : '\neq ') + T(A - B))` | `stackTex('\lvert B\rvert = ' + absB.toFixed(3), exists ? '\text{a point: yes}' : '\text{a circle, not a point}')` |
| footer `same` | | `'A = ' + T(A)` | `'A = ' + P(A)`, `agree: true` |

Why these cells: the Cartesian column is the textbook's **two paths** (real h gives f_x = u_x + i v_x, imaginary h gives -i f_y = v_y - i u_y, and
they must agree); the polar column is the **one circle** (all directions at once). They are two views of the same fact: the two textbook
limits are the two diametrically opposite points A + B and A - B of the circle.

**D9. Readout and verdict**: `buildReadout(model)` and `verdictText(model)` as in section 2.5. `verdictText` returns `kind` = `'undefined'` when `!defined`; `'point'`
when `exists` and `absA < 0.001`; `'ring'` when `exists`; otherwise `axes.kind` (`'flat' | 'mirrored' | 'ellipse'`). When `!exists` the station appends
`<a href="#cauchy-riemann">The same test as Cauchy-Riemann</a>` after the text (an element, not part of `verdictText`).

**D10. Animations**

```
shrink():  if reduced motion: STEP_RHO = [0.5, 0.3, 0.2, 0.1, 0.05, 0.02]; next = first value below st.rho - 1e-9, else 0.5; setRho(next); return
           animator.cancel(); r0 = st.rho <= 0.0205 ? 0.5 : st.rho;  animator.run(3500, (p) => setRho(r0 * Math.pow(0.02 / r0, p)))      // geometric: constant zoom rate
sweep():   if reduced motion: setPhiDeg(wrapDeg(st.phiDeg + 30)); return                                                              // wrapDeg maps into (-180, 180]
           animator.cancel(); animator.run(6000, (p) => setPhiDeg(-180 + 360 * p))
setRho(v): st.rho = clamp(v, 0.02, 0.5); rhoSlider.value = String(st.rho); refreshModel()
setPhiDeg(d): st.phiDeg = d; phiSlider.value = String(d); refreshPhi()            // refreshPhi: highlight, explainer row values, outputs, draw
rho and phi slider 'input' handlers: animator.cancel(); then set from the slider
Move z0 to 0: animator.cancel(); handle.set({ re: 0, im: 0 }, { silent: true }); st.z0 = { re: 0, im: 0 }; refreshModel()
```

**D11. `refreshModel()` (every change of f, z0 or rho)**

```
model = microscope(st.fnId, st.z0, st.rho)
if model.defined:  { ring, image } = ringImage(f, st.z0, model.rhoEff); zRing.update(ring); wRing.update(image); wplane.setView({ center: model.f0 }); dcHalf logic (D7)
else:              zRing.update([]); wRing.update([])
rhoOut.textContent = 'rho = ' + fmtNum(st.rho, 2) + (model.defined && model.rhoEff < st.rho - 1e-9 ? ' (clipped to ' + fmtNum(model.rhoEff, 3) + ' near the pole)' : '')
readout.textContent = buildReadout(model);  { text, kind } = verdictText(model);  verdict.textContent = text (+ link); verdict.dataset.exists = !model.defined ? 'undefined' : model.exists ? 'yes' : 'no'
hint.hidden = st.fnId !== 'abs2'
refreshPhi()                       // q at the current phi, ex.update({ model, phi, q, native }), phiOut, draw all three planes
scheduleStatus()                   // debounce 300 ms
```

`refreshFn()` (on a chip press): chips `aria-pressed`, `renderProblemCard(card, PROBLEM_FOR_FN[st.fnId] || null)`, then `refreshModel()`.

**D12. `unmount`**: section 4.4.

---

## 6. Mathematics

### 6.1 Formulas used

1. **Polar form and the doubling** (both limits functions). z = r e^{i theta}, r = |z| > 0.
   - dir: g(z) = (x^2 - y^2 + 2ixy)/(x^2 + y^2) = z^2/|z|^2 = r^2 e^{2i theta}/r^2 = e^{2i theta}.
   - x-over-z: g(z) = (Re(1+z) - 1)/z = x/z = r cos(theta)/(r e^{i theta}) = cos(theta) e^{-i theta} = 1/2 + (1/2) e^{-2i theta}.
   Both depend only on theta, so g is constant on every ray, and on a whole line through 0 (theta and theta + pi give the same value because
   e^{2i(theta + pi)} = e^{2i theta}).
2. **Directional circle.** dir: {e^{2i alpha}} = unit circle (centre 0, radius 1). x-over-z: {1/2 + (1/2) e^{-2i alpha}} = circle centre 1/2, radius 1/2
   (through 0 at alpha = pi/2 and 1 at alpha = 0). The limit exists iff the circle is a single point (radius 0).
3. **Limit along a path with a tangent direction.** If z(t) -> 0 with Arg z(t) -> alpha*, then g(z(t)) -> G(alpha*) because g = G(theta) is continuous in
   theta. If Arg z(t) does not converge (the spiral), g(z(t)) keeps moving round the circle and has no limit.
4. **Cartesian paths.** Line y = m x (x > 0): z = x(1 + im). dir: (x^2(1 - m^2) + 2i m x^2)/(x^2(1 + m^2)) = (1 - m^2 + 2im)/(1 + m^2) = e^{2i atan m}.
   x-over-z: x/(x(1 + im)) = 1/(1 + im) = (1 - im)/(1 + m^2). Curve y = x^2: dir: (1 - x^2 + 2ix)/(1 + x^2); x-over-z: x/(x + i x^2) = 1/(1 + ix).
5. **Epsilon-delta for z^2 at z0 = 1.** With h = z - 1: f(1 + h) - 1 = 2h + h^2 = h(2 + h), so |f - 1| = |h||2 + h| <= |h|(2 + |h|) with equality iff
   arg h = arg 2 = 0 (triangle inequality tight). The disk |h| < delta maps into the disk |w - 1| < eps iff delta (2 + delta) <= eps, so the largest
   delta is delta(eps) = sqrt(1 + eps) - 1, and the image of the edge circle touches the eps-circle at w = 1 + eps. For small eps, delta ~ eps/2 = eps/|f'(1)|.
   For g = e^{2i theta} at 0: every punctured disk maps onto the whole unit circle, whose farthest point from 1 is -1 at distance 2, so no delta works for eps < 2.
6. **Local linear form (Wirtinger).** With h = a + ib small: f(z0 + h) ~ f(z0) + f_x a + f_y b, a = (h + conj h)/2, b = (h - conj h)/(2i), hence
   f(z0 + h) ~ f(z0) + A h + B conj(h), **A = (f_x - i f_y)/2, B = (f_x + i f_y)/2** (`localLinear` returns exactly these).
7. **The quotient circle.** For h = rho e^{i phi}: (A h + B conj h)/h = A + B conj(h)/h = **A + B e^{-2i phi}**. As phi goes round once, e^{-2i phi} goes round twice, clockwise:
   a circle of centre A and radius |B|. The exact quotient is that plus O(rho). f'(z0) exists iff the circle is a point iff B = 0, and then f'(z0) = A.
8. **The two textbook limits.** h real (phi = 0): A + B = f_x = u_x + i v_x. h imaginary (phi = pi/2, e^{-i pi} = -1): A - B = -i f_y = v_y - i u_y. They agree iff B = 0,
   i.e. (u_x - v_y) + i(v_x + u_y) = 0, i.e. u_x = v_y and u_y = -v_x (Cauchy-Riemann).
9. **Image of the ring.** The image of the unit circle under h -> A h + B conj h is an ellipse with semi-axes |A| + |B| and ||A| - |B||, traversed in the same sense when
   |A| > |B| and in the opposite sense when |A| < |B|. B = 0: a circle of radius |A|, rotated by Arg A (a spin by Arg A and a stretch by |A|).
   |A| = |B|: a segment (flat). A = 0: a circle traversed backwards (mirror).
10. **The ring fit.** (1/n) sum_k (f(z0 + h_k) - f0) e^{-i phi_k}/rho = A + (terms with e^{i m phi}, m != 0) averaging to 0 = A exactly (for the catalogue), used as a test.

### 6.2 Worked solutions, both addresses, with checked numbers

#### 2.3.1 lim (x^2 - y^2 + i2xy)/(x^2 + y^2) as z -> 0 along y = x^2   (answer: 1; the full limit does not exist)

**Cartesian (two numbers).** On y = x^2: numerator x^2 - x^4 + 2i x^3, denominator x^2 + x^4 = x^2(1 + x^2). The quotient is (1 - x^2 + 2ix)/(1 + x^2) for x != 0.
Let x -> 0: real part (1 - x^2)/(1 + x^2) -> 1, imaginary part 2x/(1 + x^2) -> 0. So the value tends to **1**. Checks: x = 0.5 gives (0.75 + i)/1.25 = **0.6 + 0.8i**;
x = 0.1 gives 0.980198 + 0.198020i; x = 0.012 gives 0.999712 + 0.023997i. For contrast, along the x-axis the quotient is x^2/x^2 = 1 and along the y-axis it is -y^2/y^2 = -1, so
1 != -1 and the **limit at 0 does not exist**. Along y = m x it is (1 - m^2 + 2im)/(1 + m^2): m = 0 -> 1, m = 1 -> i, m = -1 -> -i, m = 2 -> -0.6 + 0.8i, m = 3 -> -0.8 + 0.6i.

**Polar (one circle).** z = r e^{i theta}: the quotient is z^2/|z|^2 = e^{2i theta}. Along y = x^2, theta(x) = atan(x) -> 0 (the curve arrives tangent to the real axis), so e^{2i theta} -> e^0 = **1**.
Check: x = 0.5, theta = atan 0.5 = 0.4636476 rad (26.565 deg), 2 theta = 0.9272952 rad (53.130 deg), e^{2i theta} = cos 53.13 deg + i sin 53.13 deg = **0.6 + 0.8i**. The set of all directional values
is {e^{2i alpha}} = the unit circle: **centre 0, radius 1**, not a point, so no limit. Line values: alpha = 45 deg -> e^{i pi/2} = i; alpha = 30 deg (m = 0.57735) -> e^{i pi/3} = 0.5 + 0.866i;
vertical alpha = 90 deg -> e^{i pi} = -1. Staircase: arg g = {2 theta + 2 pi k}; theta and theta + pi differ by a half turn, 2 theta by a full turn, so one point g.

**Which address.** Polar: the fraction "forgets the length and keeps twice the angle", which Cartesian hides inside (x^2 - y^2)/(x^2 + y^2).

#### P5 Show lim (Re(1 + z) - 1)/z does not exist   (answer: 1 along the real axis, 0 along the imaginary axis)

**Cartesian.** Re(1 + z) - 1 = x, so the fraction is x/(x + iy). y = 0: x/x = **1**. x = 0: 0/(iy) = **0**. 1 != 0, so no limit. Along y = m x: 1/(1 + im) = (1 - im)/(1 + m^2):
m = 1 -> 0.5 - 0.5i, m = -1 -> 0.5 + 0.5i, m = 2 -> **0.2 - 0.4i**, m = 3 -> 0.1 - 0.3i. Along y = x^2: 1/(1 + ix) -> 1 (x = 0.5: 0.8 - 0.4i; x = 0.1: 0.990099 - 0.099010i).

**Polar.** x/z = r cos(theta)/(r e^{i theta}) = cos(theta) e^{-i theta} = 1/2 + (1/2) e^{-2i theta}: circle **centre 1/2, radius 1/2**, through 1 (theta = 0) and 0 (theta = pi/2).
theta = 45 deg: 1/2 + (1/2)e^{-i pi/2} = 0.5 - 0.5i. The same circle as P6 (A = B = 1/2), because (Re(1 + z) - 1)/z is the difference quotient of Re at 0.

#### 3.1.1 Use the limit definition to show f(z) = z^2 + z is differentiable everywhere and find f'(z)   (answer: f'(z) = 2z + 1)

**Cartesian (expand).** (f(z + h) - f(z))/h = ((z + h)^2 + (z + h) - z^2 - z)/h = (2zh + h^2 + h)/h = **2z + 1 + h** -> 2z + 1 as h -> 0 by any route (the direction of h does not appear).
At z0 = 1 + i: f'(z0) = **3 + 2i**; f(z0) = (1 + i)^2 + 1 + i = 2i + 1 + i = **1 + 3i**. At z0 = 0.5 - i: f' = 2(0.5 - i) + 1 = **2 - 2i**, f(z0) = -0.25 - 2i.

**Polar (h = rho e^{i phi}).** The quotient is (2z + 1) + rho e^{i phi}: a circle of **radius rho around the centre A = 2z + 1**. As rho -> 0 it shrinks to the point 2z + 1 whatever phi is, so B = 0 and f' = A.
At z0 = 1 + i, rho = 0.15: q(0) = 3.15 + 2i, q(90 deg) = 3 + 2.15i, q(180 deg) = 2.85 + 2i (at the default rho = 0.2: 3.2 + 2i, 3 + 2.2i, 2.8 + 2i). Spin and stretch: |A| = sqrt 13 = **3.606**, Arg A = atan2(2, 3) = **0.588 rad = 33.69 deg**
(not an exact multiple of pi, so the explainer's polar cell shows the decimal `3.606 e^{i 0.588}`). The ring of radius 0.15 about 1 + i becomes (to first order) a ring of radius 0.541 about 1 + 3i, rotated by 33.69 deg; the first spoke's
image is f(1.15 + i) - f(1 + i) = 0.4725 + 0.3i (length 0.5597 = 3.73 rho, direction 32.41 deg: the rho^2 term, which vanishes with rho).

**Which address.** Cartesian: expand (z + h)^2; no direction needed.

#### 3.1.2 Let f(z) = |z|^2. Show f is differentiable only at z = 0, and thus nowhere analytic   (answer: f'(0) = 0, nowhere else)

**Cartesian (two paths).** (|z + h|^2 - |z|^2)/h = (z conj h + conj z h + |h|^2)/h = **conj z + z (conj h/h) + conj h**. h real: conj h/h = 1, limit conj z + z = **2x**. h = is imaginary: conj h/h = -1, limit
conj z - z = **-2iy**. They agree only if 2x = -2iy, a real number equal to an imaginary one, i.e. x = y = 0. At z0 = 1 + i: 2 versus -2i. At z0 = 0.3: 0.6 versus 0. At z0 = 0 the quotient is conj h -> 0 from every direction,
so f'(0) = 0. Analytic at z0 needs differentiable on a disk about z0; every disk contains points other than 0, where f is not differentiable, so f is **analytic nowhere**.

**Polar (h = rho e^{i phi}).** conj h/h = e^{-2i phi}, so the quotient tends to **conj z + z e^{-2i phi}**: a circle of centre A = conj z and radius |B| = |z|. At z0 = 1 + i: **centre 1 - i, radius sqrt 2 = 1.414**.
phi = 0 -> (1 - i) + (1 + i) = 2; phi = 90 deg -> (1 - i) - (1 + i) = -2i; phi = 45 deg -> (1 - i) + (1 + i)(-i) = 2 - 2i. With rho = 0.15 the actual quotients are 2.15, -2.15i, 2.106 - 2.106i (the extra conj h = rho e^{-i phi}).
The circle is a single point only when |z| = 0. The ring's image is flat: f is real, so the image ring is the segment on the real axis from 2.0225 - 2 sqrt2 (0.15) = 1.598 to 2.0225 + 0.424 = 2.447.

**Which address.** Polar: with h = rho e^{i phi} the direction is the variable and the circle falls out.

#### P6 Show f(z) = Re(z) is not differentiable   (answer: the quotient is 1 along real h and 0 along imaginary h, at every z0)

**Cartesian.** (Re(z + h) - Re z)/h = Re(h)/h. h real: **1**. h imaginary: 0/(is) = **0**. 1 != 0: no derivative anywhere. (Cauchy-Riemann: u = x, v = 0, u_x = 1 != 0 = v_y.)

**Polar.** Re(h)/h = rho cos(phi)/(rho e^{i phi}) = cos(phi) e^{-i phi} = **1/2 + (1/2) e^{-2i phi}**, independent of z0 and rho: **A = B = 1/2**, circle of centre 1/2 and radius 1/2. At the preset z0 = 0.3 - 0.7i: A = 0.5, |B| = 0.500, f(z0) = 0.3.
Flat image: Re maps the ring to the segment [0.3 - rho, 0.3 + rho] on the real axis ("a squash, not a spin-and-stretch").

### 6.3 Other chips (sanity values the station must show)

| f, z0 | f(z0) | A | B | abs B | f'(z0) |
|---|---|---|---|---|---|
| `conj z`, any | conj z0 | 0 | 1 | 1.000 | does not exist (pure mirror: the image ring is a ring with reversed order) |
| `z^3`, 1 + i | -2 + 2i | 6i | 0 | 0.000 | 6i (\|A\| = 6, Arg A = pi/2) |
| `e^z`, 0 | 1 | 1 | 0 | 0.000 | 1 |
| `e^z`, 1 + i | 1.469 + 2.287i | 1.469 + 2.287i | 0 | 0.000 | e^{1+i}: \|A\| = e = 2.718, Arg A = 1 |
| `1/z`, 0.5 | 2 | -4 | 0 | 0.000 | -4 (ring clipped to rho = 0.25 when rho >= 0.3) |
| `1/z`, 1 + i | 0.5 - 0.5i | 0.5i | 0 | 0.000 | 0.5i |
| `1/z`, 0 | undefined | | | | undefined (message, no NaN) |
| `abs(z)^2`, 0 | 0 | 0 | 0 | 0.000 | 0 |
| `abs(z)^2`, 0.3 | 0.09 | 0.3 | 0.3 | 0.300 | does not exist (circle radius 0.300) |
| `abs(z)^2`, 0.5 - i | 1.25 | 0.5 + i | 0.5 - i | 1.118 | does not exist |
| `Re z`, 0 / 0.3 - 0.7i / 1 + i | 0 / 0.3 / 1 | 0.5 | 0.5 | 0.500 | does not exist |
| `z^2 + z`, 0.5 - i | -0.25 - 2i | 2 - 2i | 0 | 0.000 | 2 - 2i |
| `z^2 + z`, 0 | 0 | 1 | 0 | 0.000 | 1 |

### 6.4 Expected values collected for the unit tests

(All to 1e-9 unless a tolerance is shown; `fmt` rows are exact strings.)

| Quantity | Expected |
|---|---|
| `pathPoint('line', 0.5, { m: 1 })` | (0.565685, 0.565685), 1e-6 |
| `pathPoint('line', 1, { m: 0 })` | (1.6, 0) |
| `pathPoint('line', 0.25, { m: -2 })` | (0.178885, -0.357771), 1e-6 |
| `pathPoint('vertical', 0.5)` | (0, 0.8) |
| `pathPoint('parabola', 0.5)`, `(1)`, `(0.45)`, `(0.01)` | (0.6, 0.36), (1.2, 1.44), (0.54, 0.2916), (0.012, 0.000144) |
| `pathPoint('spiral', 1)`, `(0.5)`, `(0.01)` | (1.6, 0), (-0.746150, 0.288549), (0.014551, -0.006654), 1e-6 |
| `pathDirection` | line m=1: pi/4; line m=-2: atan(-2) = -1.107149; vertical: pi/2; parabola: 0; spiral: null |
| `tau(1)`, `tau(0.01)`, `tau(0.45)` | 0, 1, 0.555556 (1e-6) |
| `tSamples()` | length 361; first 1; last 0.01 (1e-12); strictly decreasing; ratio of neighbours constant 0.987289 (1e-6) |
| `dir` value at `pathPoint('parabola', 0.5 / 1.2)` (x = 0.5) | 0.6 + 0.8i (1e-12) |
| `dir` value at x = 0.1 and x = 0.012 | 0.980198 + 0.198020i; 0.999712 + 0.023997i (1e-6) |
| `dir` value on a line, `m` = 0, 1, -1, 2, 3 | 1; i; -i; -0.6 + 0.8i; -0.8 + 0.6i; vertical -1 |
| `pathLimit('dir', ...)` | parabola: 1; line m=1: i; m=0: 1; m=-1: -i; m=2: -0.6 + 0.8i; vertical: -1; spiral: `{ exists: false, value: null }` |
| `pathLimit('x-over-z', ...)` | parabola: 1; line m=0: 1; m=1: 0.5 - 0.5i; m=2: 0.2 - 0.4i; m=-1: 0.5 + 0.5i; vertical: 0; spiral: none |
| `x-over-z` value at `pathPoint('parabola', 0.5 / 1.2)` and x = 0.1 | 0.8 - 0.4i; 0.990099 - 0.099010i (1e-6) |
| `directionalCircle('dir')` | center (0, 0) within 1e-12; radius 1 within 1e-9; maxDev < 1e-9; 72 values |
| `directionalCircle('x-over-z')` | center (0.5, 0) within 1e-9; radius 0.5 within 1e-9; maxDev < 1e-9 |
| `localLinear(Re, 0)` | A = B = 0.5 within 1e-9 |
| `epsDelta('sq', e).delta` | e = 0.05: 0.024695; 0.1: 0.048809; 0.25: 0.118034; 0.5: 0.224745; 1: 0.414214 (= sqrt 2 - 1); 1.5: 0.581139 (1e-6) |
| `epsDelta('sq', e)` brute force | max over 100000 points of the edge circle of abs((1 + h)^2 - 1) equals eps (1e-6) at phi = 0; touch = (1 + eps, 0) |
| `epsDelta('dir', e)` | delta null, touch null, fits false; the image of any punctured circle is the unit circle (\|g\| = 1 within 1e-12) |
| default `buildReadout` (dir, parabola, t = 0.45) | `path: y = x^2; value at t: 0.548 + 0.836i; limit along this path: 1; set of directional limits: circle center 0 radius 1; limit exists: no` |
| P5 preset readout (x-over-z, line m = 0, t = 0.45) | `path: y = 0; value at t: 1; limit along this path: 1; set of directional limits: circle center 0.5 radius 0.5; limit exists: no` |
| `microscope('sq-plus-z', 1 + i, 0.15)` | A = 3 + 2i; absB < 1e-6; exists; fprime = 3 + 2i; f0 = 1 + 3i; quotients[0].q = 3.15 + 2i; quotients[18].q = 3 + 2.15i; quotients[36].q = 2.85 + 2i; axes.kind 'ring'; absA = 3.605551 |
| `microscope('sq-plus-z', 1 + i, 0.2)` (the default ring) | quotients[0].q = 3.2 + 2i; quotients[18].q = 3 + 2.2i; quotients[36].q = 2.8 + 2i; qMax = 3.805502 (1e-6; the largest of the 72 sampled directions, 35 degrees); `1.3 * Math.max(absA + absB + rhoEff, qMax)` = 4.947 and `dcHalfFor` of it is 6 |
| `microscope('sq-plus-z', 0.5 - i, 0.15)` | A = 2 - 2i; fprime 2 - 2i; f0 = -0.25 - 2i |
| `microscope('recip', 0.5, 0.5)` | rhoEff 0.25; A = -4; qMax = 8 (1e-9, at phi = 180 deg: -1/(0.5 * 0.25)); `dcHalfFor(1.3 * 8)` = 12 (the window the ring needs) |
| `microscope('conj', 0, 0.2)` and `('re', 0, 0.2)` | qMax = 1; `dcHalfFor(1.3 * Math.max(1.2, 1))` = 3 |
| `microscope('abs2', 1 + i, 0.15)` | A = 1 - i; B = 1 + i; absB = 1.414214; exists false; quotients[0].q = 2.15; quotients[18].q = -2.15i; quotients[9].q = 2.106066 - 2.106066i (1e-6); axes: major 2.828427, minor 0, kind 'flat' |
| `microscope('abs2', 0.3, ...)` | A = 0.3; B = 0.3; absB = 0.3; A + B = 0.6; A - B = 0 |
| `microscope('abs2', 0, ...)` | A = 0; B = 0; exists true; absA 0; axes.kind 'point' |
| `microscope('re', 0.3 - 0.7i, rho)` for rho in {0.05, 0.15, 0.5} | A = B = 0.5; every quotient equals 0.5 + 0.5 e^{-2i phi} (1e-9) |
| `microscope('conj', 0, ...)`, `(1 + i)` | A = 0, B = 1, absB = 1, axes major 1, minor 1, flipped true, kind 'mirrored' |
| `microscope('cube', 1 + i, ...)`; `('exp', 0)`; `('exp', 1 + i)`; `('recip', 0.5)`; `('recip', 1 + i)` | A = 6i; A = 1; A = 1.468694 + 2.287355i (1e-6); A = -4; A = 0.5i; all B = 0 |
| `effectiveRho('recip', 0.5, rho)` | rho 0.5 -> 0.25; 0.3 -> 0.25; 0.1 -> 0.1; at z0 = 0 -> 0; at z0 = 0.05 and rho 0.15 -> 0.025; `effectiveRho('abs2', anything, 0.15)` -> 0.15 |
| `microscope('recip', 0, 0.15)` | defined false, rhoEff 0, A null, quotients [] and no throw |
| `ringImage(f, 1 + i, 0.15)` for `z^2 + z` | ring[0] = 1.15 + i; image[0] = 1.4725 + 3.3i (1e-12); ring[24] = 1 + 1.15i (index 8 j with j = 3); length 97; first and last points equal; t[k] = k / 96 |
| `ringFit(microscope(...))` | equals A within 1e-9 for the seven functions at 1 + i (not at poles) |
| `quotientAt(f, z0, rho, phi)` | equals `directionalQuotients(f, z0, rho, 72)[j].q` for phi = 2 pi j / 72 (1e-12) |
| `localMapAxes` | `(3+2i, 0)`: major = minor = 3.605551, kind 'ring'; `(1 - i, 1 + i)`: 2.828427 / 0 / 'flat'; `(0, 1)`: 1 / 1 / flipped / 'mirrored'; `(2, 1)`: 3 / 1 / not flipped / 'ellipse'; `(0, 0)`: 'point' |
| `dcHalfFor` | (4.883, null) -> 6; (3.871, 6) -> 6; (1.495, 6) -> 1.5; (7.995, 6) -> 12; (520, null) -> 768; (NaN, 6) -> 6; (0, null) -> 1.5 |
| `snapZ0` | (0.49, -0.99) -> (0.5, -1); (-0.01, 0.02) -> (0, 0) with `Object.is(re, 0)`; (0.3, 0) stays 0.3 |
| `buildReadout` | `z0 = 1 + i; A = 3 + 2i; \|B\| = 0.000; f'(z0) = 3 + 2i`; abs2 at 1 + i: `z0 = 1 + i; A = 1 - i; \|B\| = 1.414; f'(z0) does not exist (circle radius 1.414)`; abs2 at 0: `z0 = 0; A = 0; \|B\| = 0.000; f'(z0) = 0`; re at 0: `z0 = 0; A = 0.5; \|B\| = 0.500; f'(z0) does not exist (circle radius 0.500)`; recip at 0: `z0 = 0; f is undefined at z0 (1/z has a pole at 0)` |
| `angleText` | `0` -> '0'; pi/3 -> 'pi/3'; -5 pi/6 -> '-5pi/6'; pi -> 'pi'; 5 deg -> '0.087 rad' |
| `texDecCart` | 3 + 2i -> '3 + 2i'; 0.5 -> '0.5'; -i -> '-i'; NaN -> '\\text{undefined}' |
| `texDecPolar` | 3 + 2i -> '3.606\\,e^{i\\,0.588}'; 1 + i -> '1.414\\,e^{i\\frac{\\pi}{4}}'; 0 -> '0'; 1 -> '1'; -1 -> 'e^{i\\pi}'; 0.5 -> '0.5' |
| `verdictText` kinds | sq-plus-z 1 + i: 'ring'; abs2 1 + i: 'flat'; re: 'flat'; conj: 'mirrored'; abs2 at 0: 'point'; recip at 0: 'undefined' |

---

## 7. Verification plan

Files the builder writes (tests are not in `owns`; every goal ships its own, as in wave 0):
`js/stations/limits.js`, `js/stations/derivative.js`, `tests/unit/i1-station-limits-derivative.test.mjs`,
`tests/interact/i1-station-limits-derivative.mjs`. Nothing else is edited. Suggested build order: pure helpers and their unit tests first
(`derivative.js` helpers, then `limits.js` helpers), then `derivative.mount`, then `limits.mount`, then the interaction script.

### 7.1 Unit tests (`npm test`, file `tests/unit/i1-station-limits-derivative.test.mjs`)

Imports the two station modules directly in Node (they have no top-level DOM access). Groups and expected values are in section 6.4; summary:

| Group | Cases (expected values in 6.4) |
|---|---|
| `limits paths` | `pathPoint` table, `pathDirection`, `tau`, `tSamples` (length, ends, strictly decreasing, constant ratio), `imageCurve` keeps `t`, the smallest `abs(pathPoint)` over all four paths and t in [0.01, 1] is at least 0.012 (so `g` is never evaluated at 0), every image point of `dir` and `x-over-z` along every path is finite and `abs(g) <= 1` |
| `limits values` | compiled `dir` and `x-over-z` along parabola and lines equal the closed forms of 6.1 (1e-9); the 3-4-5 case x = 0.5 gives exactly 0.6 + 0.8i; `pathLimit` table; `directionalValue` equals the numeric `directionalValues` entries; `directionalCircle` centre, radius, maxDev for both functions; `localLinear(Re, 0)` gives A = B = 0.5 |
| `limits eps-delta` | `epsDelta` table; brute-force maximum; touch point; dir mode has `delta === null` |
| `limits readout` | `buildReadout` for the two presets (strings in 6.4) and for spiral (`limit along this path: none (keeps circling)`), vertical dir (`path: x = 0; ...limit along this path: -1`), line m = 1 (`path: y = x; ...limit along this path: i`), line m = 0.5 (`path: y = 0.5x`) |
| `derivative model` | `microscope` rows of 6.4 for the seven functions at the listed points; `fprime` null when `!exists`; quotients length 72; the undefined model for `recip` at 0 has no NaN (`JSON.stringify` contains neither `NaN` nor `null` where a number is expected except the documented nulls) |
| `derivative quotient circle` | for `abs2` at 1 + i, rho 0.15: `abs(q(phi) - (A + B e^{-2i phi})) = rho` (1e-9) for all 72 directions; for `sq-plus-z`: `abs(q - A) = rho`; for `re`: `q = 0.5 + 0.5 e^{-2i phi}` for rho 0.05, 0.15, 0.5 |
| `derivative rho and poles` | `effectiveRho` table; `quotientAt` equals `directionalQuotients` entries (1e-12) |
| `derivative ring` | `ringImage` indices, closed curve, image[0]; `linearImage` equals `ringImage` image within `rho^2 * 2` for `sq-plus-z` and exactly (1e-12) for a linear f (use `iz - 2i` through `compile`); `ringFit` equals A (1e-9) for all seven functions at 1 + i |
| `derivative axes and ladder` | `localMapAxes`, `dcHalfFor`, `snapZ0`, `verdictText` kinds, `angleText` |
| `tex and readout helpers` | `texDecCart`, `texDecPolar`, `stackTex`, `quotientTex` (every entry renders with `globalThis.katex` absent: they are strings; and, when run with the vendored KaTeX loaded in the test, `renderToString(..., { throwOnError: true })` does not throw for every cell string of 5.2 L6 and 5.3 D8 with sample numbers), `buildReadout` strings of 6.4 |
| `inspection` (A5, reads the two source files as text) | both files import `directionalQuotients` and `localLinear` from `'../core/complex.js'`; `derivative.js` contains `export function drawDirectionCircle`; `limits.js` imports it from `'./derivative.js'` and calls it; both files contain `effectiveRho` use (derivative) and no `Math.random`; no hex colour literal and no `rgb(`, `rgba(`, `hsl(` or `hsla(` call outside comments (the colour rule); no `alert(`, `confirm(`, `prompt(`, `window.open`, `scrollTo`, `scrollIntoView`, `innerHTML` (all text goes through `textContent`, `tex()` or `prose()`); every `import` specifier starts with `./` or `../` |

Pass: `npm test` is green with these added; `node --test tests/unit/i1-station-limits-derivative.test.mjs` is green on its own.

### 7.2 Acceptance criteria

#### A1 (smoke): routes and deep links load clean

Command (from the repo root):

```
node tools/smoke.mjs --route limits,derivative,problem-2-3-1,problem-P5,problem-3-1-1,problem-3-1-2,problem-P6 --dark
```

Passing: 21 of 21 checks (7 routes x desktop 1280x860, phone 390x844, desktop-dark), exit code 0, no console error, page error, failed local request,
external request, horizontal overflow, router error panel or empty `#view`. The first step of the interaction script also asserts, for each deep link, that
`document.querySelector('#view').dataset.station` is `limits` for `limits`, `problem-2-3-1`, `problem-P5` and `derivative` for the other four, and
`dataset.state === 'ready'`.

#### A2 (interaction script): 2.3.1 and P5 path limits, the directional circle, delta shrinks with epsilon

Command: `node tools/smoke.mjs --route problem-2-3-1 --script tests/interact/i1-station-limits-derivative.mjs --dark`. The script is one default export that
branches on `ctx.route` (below). Helpers come from `./_helpers.mjs`: `clickChip`, `dragHandle`, `readText`, `setSlider`, `settle`, `parseCart`.
`ro = () => readText(page, '#limits-readout')`; `ctx.assert(cond, message)` throws a readable failure.

Route `problem-2-3-1` (also run unchanged for route `limits`, whose default state is the same):

```
 0. station = await page.evaluate(() => document.querySelector('#view').dataset.station); assert 'limits'
    planes = await page.evaluate(() => [...window.__mv.planes.keys()]); assert it includes 'limits-zplane' and 'limits-wplane'
 1. r = await ro(); assert /y = x\^2|y = x²/.test(r); assert r.includes('limit along this path: 1');
    assert r.includes('circle center 0 radius 1'); assert r.includes('limit exists: no')
    assert (await readText(page, '#limits-verdict')) includes 'No limit at 0'
 2. await clickChip(page, 'limits-path-line'); await setSlider(page, 'limits-m', 1);
    r = await ro(); assert r.includes('limit along this path: i'); assert r.includes('path: y = x')
    await setSlider(page, 'limits-m', 0); r = await ro(); assert r.includes('limit along this path: 1'); assert r.includes('path: y = 0')
    await setSlider(page, 'limits-m', -1); assert (await ro()).includes('limit along this path: -i')
 3. await setSlider(page, 'limits-m', 0); await setSlider(page, 'limits-t', 0.01); r = await ro();
    v = parseCart(/value at t: ([^;]+)/.exec(r)[1]); L = parseCart(/limit along this path: ([^;]+)/.exec(r)[1]);
    assert Math.hypot(v.re - L.re, v.im - L.im) < 0.05                                   (value at t within 0.05 of the path limit)
    await clickChip(page, 'limits-path-parabola'); await setSlider(page, 'limits-t', 0.01); r = await ro();
    v = parseCart(...); assert Math.hypot(v.re - 1, v.im) < 0.05                          (x = 0.012: 0.9997 + 0.024i)
    await setSlider(page, 'limits-t', 1); r = await ro(); v = parseCart(...);
    assert |v - (-0.18 + 0.984i)| < 0.01                                                  (x = 1.2: (1 - 1.44 + 2.4i)/2.44)
 4. await page.evaluate(() => { location.hash = '#problem-P5'; }); await page.waitForTimeout(600);
    assert station still 'limits'; r = await ro(); assert r.includes('circle center 0.5 radius 0.5'); assert r.includes('limit along this path: 1');
    await setSlider(page, 'limits-m', 0); assert (await ro()).includes('limit along this path: 1')
    await clickChip(page, 'limits-path-vertical'); r = await ro(); assert r.includes('limit along this path: 0'); assert r.includes('path: x = 0')
    assert r.includes('limit exists: no')
 5. epsilon-delta: d = async (e) => { await setSlider(page, 'limits-eps', e); return Number(/largest delta = ([0-9.]+)/.exec(await readText(page, '#limits-epsdelta'))[1]); }
    d1 = await d(0.5); d2 = await d(0.1); assert d2 > 0 && d2 < d1; assert Math.abs(d1 - 0.225) < 0.001; assert Math.abs(d2 - 0.049) < 0.001
    await clickChip(page, 'limits-ed-fn-dir'); assert (await readText(page, '#limits-epsdelta')).includes('no delta works'); await clickChip(page, 'limits-ed-fn-sq')
 6. extras: spiral -> assert ro() includes 'limit along this path: none';  assert (await readText(page, '#limits-stairs-set')) is not empty and includes 'arg g'
    follow: await clickChip(page, 'limits-path-parabola'); await setSlider(page, 'limits-t', 0.1); await clickChip(page, 'limits-follow');
            s = await page.evaluate(() => window.__mv.limits.state()); assert s.follow === true; assert s.zView.unitsAcross < 0.5          (2.6 * |z| with |z| = 0.12 is 0.31)
            await clickChip(page, 'limits-follow'); s = ...; assert s.follow === false; assert s.zView.unitsAcross > 3.9
    walk:   await setSlider(page, 'limits-t', 1); await clickChip(page, 'limits-play'); await page.waitForTimeout(300); s = state(); assert s.playing === true && s.t < 1 && s.t > 0.5;
            await clickChip(page, 'limits-play'); s = state(); assert s.playing === false
    text:   body = await page.evaluate(() => document.body.innerText); assert !/NaN|Infinity/.test(body)
    shots:  await ctx.shot('limits-p5')
 7. lifecycle: await page.evaluate(() => { location.hash = '#home'; }); await page.waitForTimeout(400);
    assert await page.evaluate(() => !window.__mv.limits && ![...window.__mv.planes.keys()].some((k) => k.startsWith('limits-')))
```

Route `problem-P5` (run on its own as well): assert station `limits`; readout equals the P5 preset string of 6.4 except the `value at t` (which is `1`);
`limits-fn-x-over-z` has `aria-pressed="true"`; `#limits-problem` text includes "Problem P5"; `circle center 0.5 radius 0.5`; vertical chip gives `limit along this path: 0`;
`limit exists: no`.

Passing looks like: the harness prints `ok   problem-2-3-1 (desktop)`, `(phone)`, `(desktop-dark)` and exits 0.

#### A3 (interaction script): 3.1.1, 3.1.2, P6 on the direction circle

Command: `node tools/smoke.mjs --route problem-3-1-1 --script tests/interact/i1-station-limits-derivative.mjs --dark`. `ro = () => readText(page, '#derivative-readout')`;
`drag = (z) => dragHandle(page, 'derivative-zplane-z0', z)`.

Route `problem-3-1-1` (also run unchanged for route `derivative`):

```
 0. station 'derivative'; planes include 'derivative-zplane', 'derivative-wplane', 'derivative-dcplane'
 1. r = await ro(); assert r.includes('A = 3 + 2i'); assert r.includes('|B| = 0.000'); assert r.includes("f'(z0) = 3 + 2i")
    s = await page.evaluate(() => window.__mv.derivative.state()); assert s.exists === true && s.kind === 'ring' && s.dcHalf === 6 && s.spokes === 12
    assert Math.abs(s.fit.re - 3) < 1e-6 && Math.abs(s.fit.im - 2) < 1e-6                         (the ring's best spin-and-stretch is 3 + 2i)
 2. await drag({ re: 0.5, im: -1 }); assert (await ro()).includes("f'(z0) = 2 - 2i")
 3. await clickChip(page, 'derivative-fn-abs2'); await drag({ re: 1, im: 1 }); r = await ro();
    assert r.includes('A = 1 - i'); assert r.includes('|B| = 1.414'); assert r.includes('does not exist')
    assert (await page.evaluate(() => window.__mv.derivative.state().kind)) === 'flat'
 4. await drag({ re: 0.3, im: 0 }); assert (await ro()).includes('|B| = 0.300')
 5. await drag({ re: 0, im: 0 }); r = await ro(); assert r.includes('|B| = 0.000'); assert r.includes("f'(z0) = 0")
 6. await clickChip(page, 'derivative-fn-re'); r = await ro(); assert r.includes('A = 0.5'); assert r.includes('|B| = 0.500'); assert r.includes('does not exist')
 7. await clickChip(page, 'derivative-fn-conj'); r = await ro(); assert r.includes('A = 0'); assert r.includes('|B| = 1.000')
 8. await clickChip(page, 'derivative-fn-exp'); await drag({ re: 0, im: 0 }); assert (await ro()).includes("f'(z0) = 1")
 9. await clickChip(page, 'derivative-fn-recip');
    r = await ro(); assert r.includes('undefined'); body = innerText; assert !/NaN|Infinity/.test(body);
    assert (await page.evaluate(() => document.querySelector('#derivative-verdict').dataset.exists)) === 'undefined'
    await drag({ re: 0.5, im: 0 }); r = await ro(); assert r.includes("f'(z0) = -4"); body = innerText; assert !/NaN|Infinity/.test(body)
10. extras: setSlider('derivative-rho', 0.5) -> state().rhoEff === 0.25 at recip 0.5 and '#derivative-rho-out' includes 'clipped';
    setSlider('derivative-rho', 0.15); clickChip('derivative-fn-sq-plus-z'); drag to {1, 1};
    setSlider('derivative-phi', 90) -> '#derivative-phi-out' text 'Arg h = 90 deg (pi/2)'; wait 300 ms; '#derivative-ex-quotient-cart' data-tex includes '3 + 2.15i'
    setSlider('derivative-phi', -180) -> 'Arg h = 180 deg (pi)'
    click 'derivative-z0-origin' -> readout includes 'z0 = 0'; click 'derivative-shrink' and wait 4 s: state().rho <= 0.0205
    (reduced-motion variants are covered by emulating it: await page.emulateMedia({ reducedMotion: 'reduce' }) then clicking derivative-shrink once -> state().rho equals the next step below the current)
    ctx.shot('a4-problem-3-1-1')
11. lifecycle: hash '#home'; !window.__mv.derivative; no 'derivative-' plane keys
```

Route `problem-3-1-2`: station `derivative`; readout includes `A = 1 - i`, `|B| = 1.414`, `does not exist`; `#derivative-fn-abs2` pressed; `#derivative-hint` visible; drag to {0, 0}: `f'(z0) = 0`;
`#derivative-verdict` text includes "differentiable only at 0" at z0 = 1 + i (drag back) and "single point" is not asserted. Route `problem-P6`: readout starts `z0 = 0.3 - 0.7i; A = 0.5; |B| = 0.500`, includes `does not exist`;
drag to {1, 1}: still `A = 0.5` and `|B| = 0.500` (the circle is the same at every z0); `#derivative-verdict` includes "problem P5".

Passing: all three viewports `ok`, exit 0.

#### A4 (screenshot review): the ring, its image, and the collapsed quotient dots

Command: `node tools/smoke.mjs --route problem-3-1-1 --dark --out docs/review/iter-1/i1-station-limits-derivative/shots`, then read the three PNGs (`--desktop`, `--phone`, `--desktop-dark`) with the image tool. Review checklist (every item must hold):

1. z-plane: a ring of 12 short spokes (radius about 23 px on the desktop, 18 px on the phone) around the green handle at 1 + i, dark to light counterclockwise, with a tip dot on each spoke and one arrowhead on the ring; one orange highlighted spoke at angle 0, and the label "Arg h = 0 deg" **below** the ring, clear of the zoom buttons.
2. w-plane: the plane is centred on 1 + 3i (label "f(z0) = 1 + 3i"); the image ring is a circle about 3.6 times the size of the ring on the left (both planes show the same units per pixel: the grid squares have the same size), rotated about 33.7 degrees counterclockwise (the first image spoke leans up-right at 32 to 34 degrees), with a dashed orange outline almost on top of it and an orange arc from the horizontal to the first spoke labelled "spin Arg f' = 33.69 deg" (the label sits outside the ring, the label "f(z0) = 1 + 3i" below it, neither on a spoke).
3. Quotient plane: polar grid; the grid labels reach 6; the ray from 0 to (3, 2) with the arc labelled "Arg f' = 0.588" and two fainter "also ..." lines; the 72 purple dots collapsed into one solid purple point (the dots form a ring of 6 px radius under the 6.5 px solid point and its halo, so at most a faint beaded rim shows), labelled "f'(z0)"; the orange chosen-direction dot does not sit on top of the point; **no dashed circle** (|B| < 0.001); no diamonds.
4. Readout reads `z0 = 1 + i; A = 3 + 2i; |B| = 0.000; f'(z0) = 3 + 2i`; the verdict starts "Every direction gives the same number".
5. Dark theme: all marks legible (ring dark end visible, dots have halos, labels readable on the surface); phone: one column, no horizontal scroll, planes square 358 px, no clipped explainer cell text.
6. The programmatic proxies in A3 steps 1 (fit = 3 + 2i, dcHalf = 6) hold, so the picture cannot silently drift from the numbers.

Also take `#problem-3-1-2` and `#problem-2-3-1` screenshots with the same command and check: 3.1.2 shows the dashed circle centred (1, -1) with radius 1.414, two labelled diamonds (2 and -2i), the flat image segment on the real axis and the amber hint; 2.3.1 shows the unit circle with dots, the hollow origin, the path with ramp, the "limit 1" ring at (1, 0), and the Arg g arc with ghosts.

#### A5 (code inspection): shared numerics, one circle drawing, rho relative to |z0|

Commands:

```
grep -n "directionalQuotients\|localLinear" js/stations/limits.js js/stations/derivative.js     # both files import both from '../core/complex.js'; both use them
grep -n "export function drawDirectionCircle" js/stations/derivative.js                          # exactly one definition
grep -n "drawDirectionCircle" js/stations/limits.js                                              # an import from './derivative.js' and a call
grep -n "effectiveRho\|poleDist\|0.5 \*" js/stations/derivative.js                               # the relative clipping of rho near a pole
```

Passing: the output matches the comments; the `inspection` unit group (7.1) enforces the same mechanically.

### 7.3 Order of a full local check

```
npm test
node tools/smoke.mjs --route limits,derivative,problem-2-3-1,problem-P5,problem-3-1-1,problem-3-1-2,problem-P6 --dark
node tools/smoke.mjs --route problem-2-3-1 --script tests/interact/i1-station-limits-derivative.mjs --dark
node tools/smoke.mjs --route problem-P5 --script tests/interact/i1-station-limits-derivative.mjs --dark
node tools/smoke.mjs --route problem-3-1-1 --script tests/interact/i1-station-limits-derivative.mjs --dark
node tools/smoke.mjs --route problem-3-1-2 --script tests/interact/i1-station-limits-derivative.mjs --dark
node tools/smoke.mjs --route problem-P6 --script tests/interact/i1-station-limits-derivative.mjs --dark
node tools/smoke.mjs --route problem-3-1-1 --dark --out docs/review/iter-1/i1-station-limits-derivative/shots      # then read the screenshots
```

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| `limits`, g = 0 (x-over-z on the vertical path, g exactly 0) | `texDecCart` prints `0`, `texDecPolar` prints `0`; `stairs.update(null)`; the w-plane skips the polar address (helper rule) and still draws the cursor and the limit ring at 0 |
| `limits`, Arg g crosses the seam (spiral, or m large) | the plane's dot moves smoothly; the staircase relabels and shows its seam note; the Arg arc label jumps from pi to -pi on the plane, which is exactly the point of the picture |
| `limits`, t = 0.01 and the spiral | \|z\| = 0.016, the cursor is 1 to 2 px from the hollow origin; with "Zoom in" off the point is on top of the puncture marker: acceptable, the readout carries the numbers; "Zoom in" separates them |
| `limits`, follow on and the student zooms or pans by hand | follow turns off (listener on `'pan'`, `'zoom'`, `'reset'`), the chip un-presses, the view stays where the student put it |
| `limits`, hash change during a walk | `unmount` cancels the animator; a late tick is a no-op because the token changed |
| `limits`, very small `unitsAcross` (0.05) | the plane's own grid and tick labels adapt (`niceGridStep`); `drawArc` and `drawLabel` take unit radii computed from `scale`, so they stay 30 px |
| `limits`, slope slider extremes (+-3) | direction 71.57 deg; `R_LINE * t` keeps the point inside the 2-unit view (max \|y\| = 1.52) |
| `derivative`, z0 at a pole | undefined model, handle stays draggable (the plane keeps its last finite `z`; we never call `handle.set` with a non-finite value), no number is formatted |
| `derivative`, z0 within 0.05 of a pole | `rhoEff = 0.5 * poleDist` (0.025 at the grid's nearest point to 0); for 1/z at z0 = 0.05, A = -400 and `need = 1.3 (400 + 0.025)`, so `dcHalf` rises to 768 and the point (-400, 0) is inside the window; the ring of dots is far smaller than a pixel and the solid point shows **Superseded in residue cleanup:** the build keeps the ladder step 1536 for 1/z at z0 = 0.05 (`need` = 1.3 × 800 = 1040 sits in the 1536 step); 768 is the rung for a need of 520 (`dcHalfFor(520, null)`). |
| `derivative`, large \|A\| (z^3 near the corner: 3\|z\|^2 up to 24; e^z up to 12) | the ladder picks 48 or 24; the ring's image can exceed the w-plane window (`abs(A) rho > 2`): it is clipped by the canvas, the readout is still right, and shrinking rho brings it back |
| `derivative`, rho slider at 0.5 on a pole-free function | spokes 45 px; the ring image of `e^z` at 2 + 2i may leave the w window: acceptable |
| `derivative`, drag past the plane edge | the plane clamps to a 10 px inset; z0 never leaves [-2, 2]^2 + view pan |
| `derivative`, z0 at (0, 0) for `abs2` | A = B = 0, `exists`, kind 'point': the dots lie on a circle of radius rho about 0 (the quotient is conj h); the verdict explains that this circle shrinks with rho |
| `derivative`, the modulus of B is numerically 1e-10 | `exists` (threshold 1e-3); the readout prints `0.000` for it; `fprime = A` |
| both, a script drives `input` events faster than frames | all drawing is `requestDraw` (coalesced per frame); explainers coalesce; readouts are synchronous text |
| both, KaTeX absent | explainer cells show TeX source; nothing else changes |

### 8.2 Performance plan

- `limits`: path curves (361 points) and their images (361 `g` evaluations) are rebuilt only on function, path or slope change, not on `t`; a `t` change updates two cursors, redraws two planes, rewrites two output strings, a readout, the staircase, and (at most every 50 ms while walking) two explainer rows. Target: 60 fps on the walk; the redraw of a plane with 361 points, 72 dots and a few layers is well under 3 ms.
- `derivative`: per pointer move: `localLinear` (4 evaluations), `directionalQuotients` (73), `ringImage` (97 + 97 interpolated), `linearImage`, `ringFit` (97): about 400 complex evaluations of a compiled closure, microseconds each; three plane redraws coalesced into one `requestAnimationFrame`; `explainer.update` coalesced and adaptive. Target: 60 fps on drag at desktop and a 4x CPU throttle (phone).
- KaTeX: the first synchronous explainer render dominates (about 230 ms cold at 4x throttle for six rows); `limits` has two explainers: the second (three rows) starts one frame after mount. Explainer cells whose TeX string is unchanged are not rewritten (a drag changes only the numeric rows).
- No `pushForward`, no `morph`: every image here is a direct evaluation of the compiled `f`, so the "pole leap" cut heuristics cannot cut a curve by mistake.
- Resolution: planes own device-pixel-ratio handling (`ResizeObserver`); station layers draw in CSS pixels through `plane.toPixel` each frame and cache no pixel coordinates; `derivative-dcplane` re-windows itself with `setView` only when the ladder value changes (hysteresis, section 4.1), never per frame.
- Memory: curves are updated in place (`update(points)`); arrays are rebuilt per change, not per frame; the `directionalCircle` of each function is cached.

### 8.3 Accessibility

- Every control has an id, a visible label or an `aria-label`; chip groups are `role="group"` with a labelled-by span; `aria-pressed` on chips and the follow toggle; buttons change their text (not only colour) with state ("Pause").
- Focus rings come from the shell (`:focus-visible`); planes are focusable (`createPlane`) and the handle announces both addresses; the arrow keys move it on the 0.05 grid; the "Move z0 to 0" button is the non-drag alternative to the 3.1.2 task.
- Colour is never the only cue (3.1). Contrast of every mark is at least 3.5:1 in both themes.
- Live information has a text equivalent that does not depend on the canvas: the readout, the verdict, the explainer, the staircase, and the `sr-only` `role="status"` lines (debounced 300 to 400 ms so a drag does not flood the screen reader). Readouts themselves are not live regions.
- The explainer is a real `<table>` with headers (widget); the staircase is an ordered list (widget).
- Canvas planes carry `aria-label`s that name what they show; decorative layers are not announced.
- Sliders are native range inputs with 44 px height and visible value outputs (`<output>`).
- Text is plain and short; no emoji; units are written (`deg`, `rad`).

### 8.4 Reduced motion

No animation starts by itself. Every animated control checks `ctx.theme.prefersReducedMotion()` when pressed and becomes a stepper (section 2.3). `limits-follow` changes the view instantly in both modes. The plane's own wheel zoom has no easing. No CSS animation is added by these stations (the shell already zeroes animation durations under `prefers-reduced-motion`).

### 8.5 Phone layout (390 px)

- One column; `.two-planes` and `.ld-lower` use `minmax(min(100%, 23.25rem), 1fr)`, so at 358 px content width a plane is 358 px square and there is no horizontal scroll.
- `.slider-row` stacks the label above the range under 30rem (shell); outputs stay on the label line.
- Chip groups wrap; the long chip "(Re(1 + z) - 1)/z P5" wraps inside its group (`min-width: 0`).
- The explainer stacks Cartesian above Polar below 560 px (widget); the longest cell is three short KaTeX lines (about 290 px).
- Touch: the handle's hit area is at least 32 px; `touch-action: pan-x pan-y` on canvases keeps page scrolling working; two-finger pan and pinch work on interactive planes; sliders are 44 px high.
- Each plane has its caption directly under it, so the student never scrolls back up to learn what a picture is.

---

## 9. Out of scope

- Cauchy-Riemann content beyond a link and the one sentence "Cauchy-Riemann says B = 0": the `cauchy-riemann` station owns u_x = v_y, u_y = -v_x, the Jacobian view and P7.
- Symbolic derivatives beyond the seven-chip catalogue (no differentiation rules, no free-form f(z) field: the Lab owns text input through `parse.js`).
- Limit laws, the epsilon-delta definitions for u(x, y) and for general f(z), limits via real and imaginary parts (Thm 2.3.7), formal continuity (only the sentence about `conj z`).
- Dragging on the ring or on the dots to set the direction; clicking a dot on the circle to choose the matching path; a draggable puncture.
- A Lab hand-off, video or audio narration (the media track adds them later), progress ticks, store keys.
- Other functions in `limits` (only `dir` and `x-over-z`) and other epsilon-delta examples (only z^2 at 1 and g at 0).
- Changing `css/components.css`, `js/registry.js`, `js/data/*`, `js/core/*`: none is needed (see 10.2).

---

## 10. Risks and requests

### 10.1 Risks

1. **Label collisions on canvas.** `drawLabel` is immediate, `drawPolarAddress` labels are queued and placed at the end of the frame, so the custom labels (puncture, limit, spin, "h real") are not collision-checked against the queued ones. Mitigation: few custom labels, each offset to a fixed side, 3 px surface halo; the builder checks the three A4 screenshots at both widths. If a collision appears, move the custom label's `dx`, `dy`, not the design.
2. **`drawPolarAddress` does nothing within 6 px of 0.** Handled by the custom direction mark in `limits-zplane`. On `limits-wplane` and `derivative-dcplane` the same skip is correct (nothing meaningful to draw at 0).
3. **Follow-zoom versus the student's own zoom.** The `viewchange` reasons (`'set'` own, `'pan'`, `'zoom'`, `'reset'` the student's) decide; verify in the build that `setView` emits `'set'` and `resetView()` emits `'reset'` (both are in `plane.js` today).
4. **KaTeX `\begin{array}` in inline mode** renders as an inline block; all 45 strings of this design rendered without error in the vendored KaTeX 0.16.11. Builder: keep each array to three lines.
5. **Snap versus Alt-nudge.** Alt (a tenth of the step) does nothing because of the 0.05 snap. Documented; Shift (x10) works.
6. **Test brittleness of A3.** The expected readouts rely on the 0.05 snap and on `fmtCart`/`.toFixed(3)`; if a builder drops the snap, `f'(z0) = 2 - 2i` becomes `2.01 - 1.99i` on a drag. The unit test for `snapZ0` and the script's `dragHandle` steps pin it.
7. **`limits.js` imports `derivative.js`.** A syntax error in `derivative.js` also takes `limits` down. Accepted: one goal owns both files, and the shared circle drawing is required by A5.
8. **Number formats.** `|B|` is `toFixed(3)` ("0.000") while `A` and `f'` use `fmtCart` (trimmed); this is deliberate and pinned by A3; do not "tidy" it.
9. **Ring too small to see at rho 0.02.** The ring is 2 px at 90 px per unit; the plane's zoom (mirrored to the w-plane) is the microscope. The caption says so; "Shrink the ring" is a demonstration, not a tool for reading values.
10. **ARCHITECTURE section 9 wording.** "disks on both planes" and the `limits-t` and `derivative-phi` definitions are interpreted here (1.4). If the orchestrator prefers a different reading, only section 2.2 changes.

### 10.2 Requests for other owners

None. Every file this design touches is owned by this goal; `css/components.css` is not edited (the few `ld-` rules are injected by `ensureStationStyle`); the registry already lists both stations with the right problems, topics and threads; `functions.js` already lists `derivative` for `sq-plus-z`, `abs2`, `conj`, `re`, `cube`, `exp`, `recip` and `limits` for `dir` and `x-over-z`; `problems.js` already holds the statements, addresses, `addressWhy`, `aha` and values used here.

---

## 11. Build notes (iteration 1)

What the builder changed relative to sections 1 to 10 (all small, none changes a number, id or readout string):

1. **`derivative-zplane` view.** The z-plane starts at `xRange [-1.6, 2.4]`, `yRange [-2, 2]` (still 4 units across, square) instead of `[-2, 2]^2`, so the default z0 = 1 + i is not under the zoom buttons on a phone (at 358 px the ring and its highlighted arrow ran under "Reset"). The w-plane scale is still mirrored from it. Reset returns to this view.
2. **"Arg z" label on `limits-zplane`.** The label is placed by a small search (`argLabelSpot` in `limits.js`): the design's spot (just beyond the ray, away from the real axis) first, then further round and out, taking the first spot whose box touches neither a ray, the path, the "g undefined at 0" label, the zoom buttons nor the canvas edge (tick labels cost a little). On the default parabola the design's spot sat on the path.
3. **Labels that collided in review screenshots.** The quotient-plane diamonds ("h real", "h imaginary") read away from each other (the left one is right-aligned, below-left of its diamond), because for Re z they are one unit apart and the labels overlapped; the "centre" label of the direction circle steps below the tick-label row when the centre is on the real axis away from 0 (P5); `f(z0)` on the derivative w-plane uses how far the image reaches *below* f(z0) (not its radius) and stays off the real-axis tick labels (a flat image, f = Re z or |z|^2, left the label far below); the epsilon-delta w-plane labels the disk "ε-disk about w0 = 1" above its top edge and "touches here" up and to the right of the touch ring.
4. **Extra exports** (all pure, used by the unit tests): `derivativeRows`, `derivativeSame`, `mk`, `buildHeader`, `makeSliderRow` from `derivative.js`; `limitsRows`, `edRows`, `edSame`, `deriveState` from `limits.js`. The tests render every explainer cell string, for every function, direction, path and slope, in the vendored KaTeX with `throwOnError`.
5. **Epsilon-delta rows are state-safe.** Switching the example swaps the explainer rows after the new state has been given to it (the first build rendered the new rows with the old state and logged a console error); the `sq` cells also return empty for a state of the other mode.
6. **`window.__mv.limits.state()`** reports the live control state (`follow`, `playing`, `t`, ...) rather than the state of the last refresh, so a script sees `follow: false` right after the chip is un-pressed.
