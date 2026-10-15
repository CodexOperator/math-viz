# Design: i1-station-mappings-cr

Goal: **Stations `mappings` (z² + iz as u + iv in both addresses, with the morph) and `cauchy-riemann` (Jacobian, CR residuals, A/B parallelograms, u = c).**
Owns: `js/stations/mappings.js`, `js/stations/cauchy-riemann.js`. Wave 1; depends on the shell, math, data, plane, widgets and mapping engines (all built).
Verification files the builder also writes (named by goal id, as every wave-0 goal did): `tests/unit/i1-station-mappings-cr.test.mjs`, `tests/interact/i1-station-mappings-cr.mjs`.

Everything below was checked against the code that exists in the repo today (`js/core/*.js`, `js/data/*.js`, `js/registry.js`, `tests/interact/_helpers.mjs`, `tools/smoke.mjs`). Numbers in section 6 were recomputed with Node against `complex.js` and `parse.js` while writing; the prototype of the pure helpers of section 4 was run on a 3025-point grid (5 functions, 121 points, k = -2..2) and the Cartesian and polar formulas agreed everywhere.

---

## 0. Findings from reading the code (read first)

These are facts the builder must not rediscover the hard way. None contradicts `docs/ARCHITECTURE.md`; each sharpens it.

1. **`js/stations/` does not exist yet.** The builder creates it. `js/registry.js` already lists both modules (`./stations/mappings.js`, `./stations/cauchy-riemann.js`), the routes `#mappings`, `#cauchy-riemann`, `#problem-2-1-1`, `#problem-3-2-1`, `#problem-P7` already resolve to these two stations (`stationForProblem`), and `FUNCTIONS[].stations` already says which chips each station offers: `mappings` offers `sq-plus-iz, sq, linear-i, recip, conj`; `cauchy-riemann` offers `sq-plus-z, exp, conj, re, abs2` (plus the synthetic `const-u` of this design). So the chip lists in ARCHITECTURE 9 equal the catalogue.
2. **Every core module imports cleanly in Node** (checked: `plane`, `explainer`, `katex`, `staircase`, `theme`, `store`, `domaincolor`, `shapes`, `mapping`, `parse`, `complex`, `functions`, `problems`). So a station file may export pure helpers next to `mount`, and the unit test can import the station module directly, **provided the station module has no top-level DOM access** (read `window`, `document`, `localStorage` only inside `mount` and the functions it calls).
3. **`plane.js` applies the `snap` option to keyboard nudges as well as to pointer drags.** A 0.1 grid snap would swallow an Alt+arrow nudge (0.01 snaps back). This design therefore snaps pointer drags itself, in `onDrag`, by calling `handle.set(snapped, { silent: true })` when `info.source === 'pointer'` (section 5.2). `set()` inside an `onDrag` callback is safe: the plane marks `inCallback`, applies the exact `z`, and does not re-enter `onDrag`; the next pointermove recomputes `z` from the pointer, so there is no drift; `endDrag` re-applies `hd.z` (the snapped value) and calls `onDrag({ final: true })` with it.
4. **The harness drags with real pointer events** (`dragHandle` presses at the handle's centre, moves in 12 steps to `planePixel(z)`, releases). The final `z` is within about 1 px of the target (0.011 units at 90 px per unit). The acceptance text in A2 and A3 expects exact values after such a drag (`w = -2`, `A = 1 - i`, `f'(z0) = 0`), so a **pointer drag snaps to a 0.1 grid** (tolerance 0.05, five times the error).
5. **`explainer.js`**: the footer row is `tr#<id>-same`; its `th` holds the text `same point: ` plus `agree`, `differ` or `not checked`, so `textContent` of `#<id>-same` starts with `same point: agree` (the cells follow). `same()` returns an object keyed by the **column keys** and `agree: true | false | null` (`null` prints `not checked`). The first `update()` renders synchronously, later ones once per frame, and 220 ms after the last update one refine pass adds MathML. Cell ids are `<id>-<rowId>-<colKey>` and carry `data-tex`. Custom column keys (`dx`, `dy`) must be used as the keys of the `same()` object.
6. **`texCart` writes `1.6` as `\frac{8}{5}`** and `texNumber(1.4142...)` as `\sqrt{2}`. ARCHITECTURE 10.4.5 forbids showing one quantity as a fraction in the explainer and as a decimal in the readout in the same view. Rule used here: every quantity that also appears in a readout (x, y, u, v, w, A, B, f') is written in the explainer with `fmtNum`/`fmtCart` decimals; quantities that do not appear in a readout (r, θ, the angle of a step) may use the exact forms `texNumber`/`texAngle`.
7. **`plane.js` draws the "start - end" time-ramp pill only for layers made by `addCurve` with `ramp: true`** (not for a custom layer that calls `drawTimedCurve`). The first ramped `addCurve` layer created on a plane decides the pill colour. The CR station uses `addCurve` for the two ramped squares.
8. **`drawArc(ctx, plane, center, radius, from, to)` sweeps from `from` to `to` by linear interpolation**, so a negative `to` draws clockwise. `drawPolarAddress` only draws from the plane origin, so the spin arc on the zoomed w-plane of the CR station (centred on f(z₀), origin off screen) is drawn with `drawArc`, `drawSegment` and `drawLabel`.
9. **`morph(curve, s, f, opts)` runs the adaptive refinement every call**; for the 14 + 15 grid curves of the mappings station a call costs a few milliseconds. The grids depend on `f`, `s` and the w-plane clamp radius only, **not on z**, so dragging the handle never recomputes them.
10. **`smoke.mjs` loads `index.html#<route>` and runs the script once per viewport** (desktop 1280 x 860, phone 390 x 844, and desktop-dark with `--dark`). One script file must therefore serve several routes: it branches on `ctx.route` (section 7).
11. **The router logs `console.error` and shows the "under construction" panel when a station fails to import or throws in `mount`**, and smoke counts that as a failure. So the interaction script must never click `#mappings-open-lab` (it navigates to `#lab`, which may not exist in the wave-1 snapshot the reviewers run); it asserts only that the button exists and is labelled.
12. **`components.css` has no layout class for "explainer next to a list".** Each station injects one small `<style data-for="station-mappings">` / `"station-cauchy-riemann"` block on mount (tokens only, selectors scoped under `#station-<id>`, removed on unmount if this mount added it). Everything else uses the shell classes (`.panel`, `.chips`, `.chip`, `.btn`, `.slider-row`, `.two-planes`, `.readout`, `.callout`, `.badge`, `.tex-scroll`, `.station-links`, `.check`, `.field`).
13. **Hash routes**: `#mappings-sq` style tokens reach the station as `ctx.preset = { kind: 'token', token: 'sq' }` (longest station-id prefix rule), including tokens that contain a hyphen (`#mappings-linear-i`, `#cauchy-riemann-sq-plus-z`).

---

## 1. Goal restatement, story thread, problems and topics covered

### 1.1 What this goal delivers

Two stations of Part III (Motions) and Part IV (Zoom):

- **`mappings` ("A Function Is a Motion")**: the function f(z) = z² + iz drawn as a motion of the plane, with the **same function written twice** (u(x, y) + iv(x, y) and u(r, θ) + iv(r, θ)), each derived live for the current z, a "same point" row that checks both land on w, the **polar and Cartesian address of z and of w drawn on their planes**, an **arg z staircase** that lets the student feed any name of the angle to the polar formula (the answer does not move), and a **morph slider** that carries a Cartesian grid, a polar grid, or both, from the input plane to the output plane. Four other functions (z², iz − 2i, 1/z, conj z) share the same machinery so the student sees which grid each one keeps tidy.
- **`cauchy-riemann` ("Cauchy-Riemann: No Mirror")**: the local linear map at a draggable z₀ drawn as the image of a tiny square, the live Jacobian [[u_x, u_y], [v_x, v_y]], the two CR tests with residuals, the decomposition Δw ≈ A·Δz + B·conj(Δz) drawn as two overlaid parallelograms (A: spin and stretch; B: mirror), f′ read off as u_x + i v_x (= v_y − i u_y), a "two paths" derivation, and the **u = c** mode that is proof P7 (CR forces v constant).

### 1.2 Story thread carried, and how it shows on screen

| Thread | How it appears |
|---|---|
| **T1, one point two addresses (applied to a formula)** | `mappings`: the explainer's left column is Cartesian (`--cart`: x, y, u, v, "slide"), the right column is polar (`--polar`: r, θ, "spin and stretch"). The dot z is drawn once; its Cartesian address (drop lines) and polar address (ray, arc) are drawn on the z-plane, and the same two overlays are drawn on the w-plane at w. `cauchy-riemann`: A and B are complex numbers, each shown in both addresses (A = ½[(u_x + v_y) + i(v_x − u_y)] against A = \|A\|e^{i Arg A}); the Jacobian is the slide view of the local map, "spin by Arg A, stretch by \|A\|" is the move view. |
| **T2, arg vs Arg** | `mappings`: the z-plane and w-plane draw `Arg` as the solid arc and `arg` as ghost windings (`drawPolarAddress` with `ghosts: 1, ghostsNeg: 1`); the seam (negative real axis) is dashed on both planes; the staircase `mappings-stairs` lists the names θ + 2πk of arg z with Arg z highlighted, and **picking a step feeds that name to the polar column, which still lands on the same w**. The lesson: f is a function of the **point**, and a valid polar formula must give the same answer on every name of the angle (cos and sin repeat; a θ/2 would not, which is why roots need branches). `cauchy-riemann`: the spin of A is drawn as a solid arc "Arg A" with one ghost winding "also Arg A + 2π", and the sentence under the picture says every name 0.8 + 2πk spins the square the same way. |
| **T3, a function is a motion; zoom** | `mappings`: s runs from 0 (input) to 1 (output); the dot slides in a straight line (the ramped path, dark at s = 0 and bright at s = 1, with a ring at the current s) and the grids are carried on the same clock; Play animates s. `cauchy-riemann`: a tiny square with the time ramp (dots at t = 0, ¼, ½, ¾ on its corners, arrow at t = 1, so a mirror shows as the ramp running the other way round) is carried to its image; the zoom is literal (the w-plane is centred on f(z₀) and scaled to the size of the image). |

North-star check: the student leaves `mappings` able to say "2.1.1 is the same function in two addresses, and polar works because the formula only uses θ inside cos and sin"; and leaves `cauchy-riemann` able to say "differentiable means the zoomed picture is a spin and a stretch; CR is the statement that the mirror part is zero; if u is constant there is nothing left to be a spin and a stretch, so f′ = 0".

### 1.3 Review problems and topics covered

| Id | Where | What the station does for it |
|---|---|---|
| **2.1.1** f(z) = z² + iz as u + iv in (x, y) and (r, θ) | `mappings` (default chip `sq-plus-iz`, preset `#problem-2-1-1`, z = 1 + i) | Both derivations live; check values u = −1, v = 3 at 1 + i; w = −1 + 3i; any name of the angle gives the same u, v. |
| **3.2.1** f(z) = e^x(cos y + i sin y) is entire; f′ | `cauchy-riemann` (default chip `exp`, preset `#problem-3-2-1`, z₀ = 0.5 + 0.8i) | Jacobian with formulas, both CR lines residual 0.000, f′ = u_x + i v_x = f(z); no B part; "Cartesian address of z is the polar address of w" note. |
| **P7** entire, u ≡ c ⇒ f constant | `cauchy-riemann` (chip `const-u`, preset `#problem-P7`) | u = c fixed, v editable; the four-line proof with live checks; the image of the square squashed onto the line Re w = c. |
| Counter-examples used by the story (not review problems of this goal, but pinned to this station's chips) | `cauchy-riemann` chips `sq-plus-z` (3.1.1), `conj`, `re` (P5, P6), `abs2` (3.1.2) | The same screen shows CR holding or failing and the size of the mirror part \|B\|. |
| Topics **T2.1** (functions and mappings: u + iv in both addresses, images, elementary mappings) and **T3.2** (derivation along horizontal and vertical paths; CR; f′ from partials; consequences) | both | T2.1: the explainer and the morph. T3.2: the "two paths" panel, the CR lines, f′ read off, the u = c consequence (Thm 3.2.13). |

The station that owns 2.1.1 is `mappings`; the ones that own 3.2.1 and P7 are both `cauchy-riemann` (`stationForProblem`). A deep link `#problem-3-2-1` loads fn `exp`, `#problem-P7` loads fn `const-u`.

---

## 2. UX

### 2.1 Wireframes, `mappings`

**Desktop, 1280 x 860.** Content column about 960 px (sidebar 280 px). Planes are square, one per column of `.two-planes`.

```
+--------------------------------------------------------------------------------------------+
| A Function Is a Motion                                                           h1         |
| lede: A function picks up every point of the z-plane and puts it down somewhere on the      |
| w-plane. Drag z and watch w. ...                                                            |
| (o One point, two addresses) (o A function is a motion ...)   [2.1.1]    thread badges, chip |
+--------------------------------------------------------------------------------------------+
| | Problem 2.1.1   Express f(z) = z^2 + iz in the form u(x, y) + iv(x, y) and u(r, th) + ...  |  #mappings-problem
| | [Either address] The problem asks for the same function in both addresses: ...           |  (.callout)
+--------------------------------------------------------------------------------------------+
| Pick a function                                                                  h2         |
| (z^2 + iz*) ( z^2 ) ( iz - 2i ) ( 1/z ) ( conj z )                       #mappings-fn-*      |
| z^2 plus a quarter turn of z. Writing it as u + iv is problem 2.1.1.     #mappings-fn-note   |
+-----------------------------------------+--------------------------------------------------+
| z-plane (input): z = 1 + i              | w-plane (output): w = -1 + 3i                    |
| +-------------------------------------+ | +----------------------------------------------+ |
| | y      blue lines = Cartesian grid  | | | v       the grid carried to s = 1.00          | |
| |  |                                  | | |  |                                            | |
| |  |     (z)  ray r, arc Arg z,       | | |  |         (w) ray, arc Arg w, "also ..." arcs | |
| |  |      drop lines x = 1, y = 1     | | |  |         drop lines u = -1, v = 3            | |
| |--+---------- x   - - seam - -       | | |--+----------- u   - - seam - -                | |
| | [+][-][Reset]                       | | | [+][-][Reset]                                 | |
| +-------------------------------------+ | +----------------------------------------------+ |
| Drag the dot z, or focus it and ...     | The ramped line is the straight path from z to w |
+-----------------------------------------+--------------------------------------------------+
| Watch the plane move                                                              h2        |
| Morph s  [----------------------o] 1.00   [ Play the motion ]                               |
| Carry which grid:  (Cartesian grid)  (Polar grid)                                           |
| s = 0 is the input plane, s = 1 is the output plane. ...                                    |
+--------------------------------------------------------------------------------------------+
| z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3                  #mappings-readout |
+--------------------------------------------------------------+-----------------------------+
| The same function in both addresses                          | Which name of the angle?    |
| +----------+--------------------------+-------------------+ | arg z = { ..., 0.785-2pi,   |
| | Quantity | Cartesian (slide)        | Polar (spin-and-  | |   0.785, 0.785+2pi, ... }   |
| |          |                          | stretch)          | | Arg z = 0.785 (pi/4)        |
| | Expand   | (x+iy)^2+i(x+iy)=...     | (re^i th)^2+...   | | +-------------------------+ |
| | u = Re f | u = x^2-y^2-y = -1       | u = r^2 cos2th... | | | k = 1  pi/4 + 2pi = 9pi/4| |
| | v = Im f | v = 2xy+x = 3            | v = r^2 sin2th... | | | k = 0  Arg z = pi/4  [*]| |
| | At this z| x = 1, y = 1 => w=-1+3i  | r = sqrt2, th=pi/4| | | k =-1  pi/4 - 2pi ...   | |
| |          |                          |  => w = -1 + 3i   | | +-------------------------+ |
| | same point: agree | w = -1 + 3i     | w = -1 + 3i       | | Using th = Arg z + 2pi*0 .. |
| +----------+--------------------------+-------------------+ |                             |
+--------------------------------------------------------------+-----------------------------+
| | Which grid stays tidy? ...                                                  (.callout)   |
| | Why this works: ... Branches, The Staircase                                 (.callout)   |
| [ Draw your own shape in the Lab ]                                      #mappings-open-lab  |
| [<- Disks, Annuli, Boundaries]                         [Linear Maps: Spin, Stretch, Slide ->]|
+--------------------------------------------------------------------------------------------+
```

**Phone, 390 x 844.** One column, 16 px gutters (content 358 px); `.two-planes` stacks (z-plane above w-plane); the explainer stacks Cartesian above Polar inside every row (`explainer.js` does this at 560 px); the staircase panel sits under the explainer.

```
+--------------------------------+
| A Function Is a Motion         |
| lede (wraps)                   |
| (T1) (T3)  [2.1.1]             |
| | Problem 2.1.1 ...            |
| Pick a function                |
| (z^2+iz*)(z^2)(iz-2i)(1/z)     |   chips wrap to 2 rows
| (conj z)                       |
| note                           |
| z-plane (input): z = 1 + i     |
| +----------------------------+ |
| | 358 x 358 canvas           | |
| +----------------------------+ |
| hint                           |
| w-plane (output): w = -1 + 3i  |
| +----------------------------+ |
| | 358 x 358 canvas           | |
| +----------------------------+ |
| Watch the plane move           |
| Morph s  [-------o---] 1.00    |   label above the range under 480 px
| [ Play the motion ]            |
| (Cartesian grid) (Polar grid)  |
| z = 1 + i; w = -1 + 3i; u = -1;|   readout wraps
| v = 3; polar: u = -1; v = 3    |
| The same function ...          |
|  Expand                        |
|   Cartesian (slide)  ...       |
|   Polar (spin-and-stretch) ... |
|  u = Re f   (stacked pairs)    |
|  ...                           |
|  same point: agree             |
| Which name of the angle? ...   |
| callouts, Lab button, links    |
+--------------------------------+
```

### 2.2 Wireframes, `cauchy-riemann`

**Desktop, 1280 x 860.**

```
+--------------------------------------------------------------------------------------------+
| Cauchy-Riemann: No Mirror                                                         h1        |
| lede: Zoom in on one point z0 until f looks like a straight-line map. ...                  |
| (o The derivative ... ) (o One point, two addresses)    [3.2.1] [P7]                        |
+--------------------------------------------------------------------------------------------+
| | Problem 3.2.1   Given f(z) = e^x(cos y + i sin y), use the Cauchy-Riemann equations ...   |  #cauchy-riemann-problem
| | Cartesian. Why: u = e^x cos y and v = e^x sin y: each partial derivative is one line ...  |  (follows the chip)
+--------------------------------------------------------------------------------------------+
| Pick a function                                                                             |
| (e^x(cos y + i sin y)*) ( z^2 + z ) ( conj z ) ( Re z ) ( |z|^2 ) ( u = c )                  |
| f(z) = e^x(cos y + i sin y), which is e^z. u = e^x cos y and v = e^x sin y. ...             |
|  [only for u = c:  c [ 2 ]   v(x, y) [ x + y        ]  (x + y)(y)(x^2)(3)   error line ]     |
+---------------------------------------------+----------------------------------------------+
| z-plane: drag z0                            | w-plane, zoomed on f(z0) = 1.149 + 1.183i    |
| +----------------------------------------+  | +------------------------------------------+ |
| |   y                                    |  | |                                          | |
| |   |       +-+                          |  | |      .--- image of the square (purple,   | |
| |   |       |z0| tiny square, side h     |  | |      /  \  ramped), A part on top (orange)| |
| |---+-------+-+------ x                  |  | |     (    )   dashed green = square as it  | |
| | start [====] end                       |  | |      \  /    was, spin arc "Arg A = 0.8"  | |
| +----------------------------------------+  | | start [====] end                          | |
| Side of the square, h [-----o----] 0.30     | +------------------------------------------+ |
| Drag z0 (steps of 0.1) ...                  | key: [..] square as it was  [--] A part      |
|                                             |      [- -] B part   [==] image  [ ] true img |
|                                             | One grid square is 0.2 wide. ...             |
+---------------------------------------------+----------------------------------------------+
| The Jacobian at z0                           | The two Cauchy-Riemann tests                 |
|   d/dx          d/dy                         | u_x = v_y: 1.149 vs 1.149, residual 0.000 [holds]   |  #cauchy-riemann-cr1
| u [ 1.149      -1.183 ]                      | u_y = -v_x: -1.183 vs -1.183, residual 0.000 [holds]|  #cauchy-riemann-cr2
|   u_x = e^x cos y  u_y = -e^x sin y          | CR holds at every point, and the partials are  |
| v [ 1.183       1.149 ]                      | continuous, so f is entire. f'(z) = ...        |  #cauchy-riemann-verdict
|   v_x = e^x sin y  v_y = e^x cos y           |                                              |
+----------------------------------------------+----------------------------------------------+
| A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)  #cauchy-riemann-readout |
| A spins the square by Arg A = 0.8 rad (45.8 degrees) and stretches it by |A| = 1.649. ...    #cauchy-riemann-move |
+--------------------------------------------------------------------------------------------+
| A and B in both addresses                                                                   |
| +--------------+---------------------------------+-----------------------------------+      |
| | Quantity     | Cartesian (slide)               | Polar (spin-and-stretch)          |      |
| | A (spin and  | A = ((ux+vy)+i(vx-uy))/2 = ...  | A = |A| e^{i Arg A} = 1.649 e^{i 0.8} |   |
| |  stretch)    |                                 |   [easy in Polar]                 |      |
| | B (mirror)   | B = ((ux-vy)+i(vx+uy))/2 = 0    | B = 0   [easy in Cartesian]       |      |
| | f'(z0)       | u_x + i v_x = 1.149 + 1.183i    | |f'| e^{i Arg f'} = 1.649 e^{i 0.8}|     |
| | same point: agree | A = 1.149 + 1.183i         | 1.649 e^{i 0.8} = 1.149 + 1.183i  |      |
| +--------------+---------------------------------+-----------------------------------+      |
+--------------------------------------------------------------------------------------------+
| [ Show how the equations come from two paths ]                    #cauchy-riemann-paths      |
|   (opens) Two paths into z0: explainer cauchy-riemann-ex with columns "Along dx" | "Along i dy" |
| | In the polar address:  |f| = e^x and arg f = y ... (exp) / the P7 blob argument (u = c)     |
| The proof of P7, one line at a time (u = c only): 1. 2. 3. 4. with check marks               |
| [<- The Derivative Is a Move]                                          [The Mapping Lab ->]  |
+--------------------------------------------------------------------------------------------+
```

**Phone, 390 x 844.** Single column in this order: header, problem callout, function chips and note, (const-u controls), z-plane, h slider, w-plane, key, Jacobian, CR lines and verdict, readout and move line, A/B explainer (stacked), paths button and panel, polar note, proof (u = c), links. The Jacobian table is 2 x 2 with cells about 150 px wide. The key list is one item per line.

### 2.3 Controls (every control, id, label, behaviour)

#### `mappings`

| id | element | Visible label / accessible name | Behaviour |
|---|---|---|---|
| `mappings-problem` | `aside.callout` | "Problem 2.1.1" + statement + the address badge (`addressLabel`: "Either address") + `addressWhy` | Shown only while fn is `sq-plus-iz` (the problem's function). Statement from `statementParts(problem.statement)` (prose through `textContent`, maths through `tex()`), `addressWhy` through `prose()`. |
| `mappings-fn-sq-plus-iz` (default), `mappings-fn-sq`, `mappings-fn-linear-i`, `mappings-fn-recip`, `mappings-fn-conj` | `button.chip`, `aria-pressed`, one group `role="group" aria-label="Function"` | `z² + iz`, `z²`, `iz − 2i`, `1/z`, `conj z` (the `label` of the catalogue entry) | Click selects the function (radio behaviour): recompute the image pieces, reset the w-plane view to the function's default (and make it the Reset view), refresh note, readout, explainer, staircase. Does not move z. Arrow keys: not handled specially (each chip is a Tab stop). |
| `mappings-fn-note` | `p.muted` | the catalogue `note` | `prose(el, fn.note)`. |
| `mappings-zplane` / `mappings-wplane` | planes from `createPlane` | aria-labels "z-plane, the input. Drag the point z." and "w-plane, the output of f" | z-plane view [−2.5, 2.5]²; w-plane view [−H, H]² with H from `W_HALF` (section 4.4). Both `grid: 'none'` (the carried grids are the grids), axis labels `['x','y']` / `['u','v']`. Wheel zoom (focus rule), pan, `+ − 0`, Reset: the plane's own. |
| `mappings-zplane-z` | handle (button) | aria-label made by the plane ("z = 1 + 1i; r = 1.414, θ = 0.785 (Arg)"); visible label `z`; colour `--input` | Pointer drag with a 0.1 snap and a clamp of ±6; arrow keys step 0.1, Shift 1, Alt 0.01 (not snapped); Esc during a drag cancels (plane). |
| `mappings-zcap`, `mappings-wcap` | `figcaption` | `z-plane (input): z = <cart>`, `w-plane (output): w = <cart>` | Updated live (text). |
| `mappings-morph` | `input[type=range]` 0..1 step 0.01, default 1 | "Morph s" (label `for`), `aria-valuetext` "s = 0.50, halfway from z to w" | `input` event: `setS(Number(value))`, stops Play. Sets `window.__mv.mappingsMorph` to the number. |
| `mappings-morph-value` | `output` | shows `s.toFixed(2)` | |
| `mappings-play` | `button.btn` | "Play the motion" / "Pause" (while running) / "Step the motion" (reduced motion) | Section 5.3, M-7. |
| `mappings-grid-cart`, `mappings-grid-polar` | `button.chip`, `aria-pressed`, `data-tone="cart"`/`"polar"`, group label "Carry which grid" | "Cartesian grid", "Polar grid" | Independent toggles (both may be on, both may be off). Defaults: Cartesian on, polar off. |
| `mappings-grid-hint` | `p.muted` | "Switch a grid on to see the whole plane move." | Visible only while both grids are off. |
| `mappings-readout` | `div.readout` | none (a text line) | Format of section 5.3, M-8. `data-fn`, `data-s` attributes mirror the state. |
| `mappings-ex` | explainer (`createExplainer`, `id: 'mappings-ex'`) | caption "Same function, two addresses" | Rows `expand`, `u`, `v`, `value`; footer `same`. Section 5.3, M-6. |
| `mappings-stairs` | staircase (`createStaircase`, `id: 'mappings-stairs'`, `kMin: -1`, `kMax: 1`, `label: 'arg z'`, `onPick`) | widget's own | Rows are buttons (`#mappings-stairs-k1`, `-k0`, `-k-1`, each holding a `button.stair-row`); picking sets `state.k`. |
| `mappings-step-note` | `p` | "Using θ = Arg z + 2π·k with k = 0, so θ = π/4." | Live. |
| `mappings-open-lab` | `button.btn` | "Draw your own shape in the Lab" | Section 5.3, M-11. Not clicked by the interaction script. |

Also in the DOM, no id needed: the callouts "Which grid stays tidy?" and "Why this works", and `nav.station-links`.

#### `cauchy-riemann`

| id | element | Label | Behaviour |
|---|---|---|---|
| `cauchy-riemann-problem` | `aside.callout` | "Problem 3.2.1" or "Problem P7" + statement + address line | Follows the active chip: `exp` → 3.2.1, `const-u` → P7, others hidden. |
| `cauchy-riemann-fn-exp` (default), `-fn-sq-plus-z`, `-fn-conj`, `-fn-re`, `-fn-abs2`, `-fn-const-u` | `button.chip`, `aria-pressed`, group "Function" | `e^x(cos y + i sin y)`, `z² + z`, `conj z`, `Re z`, `\|z\|²`, `u = c` | Radio behaviour; recompute everything; z₀ does not move. |
| `cauchy-riemann-fn-note` | `p.muted` | one sentence per function (section 2.5) | |
| `cauchy-riemann-constu` | `div.panel` (hidden unless `const-u`) | title "Choose u and v" | Holds the next five controls. |
| `cauchy-riemann-c` | `input type="number" step="any"` | "c (the constant u)", default 2 | `input`: if it parses to a finite number, set `c` and recompute; otherwise ignore. |
| `cauchy-riemann-v` | `input type="text"` `spellcheck="false" autocomplete="off"` | "v(x, y)", default `x + y` | `input`: `constUFunction(c, text)`; valid → apply; invalid → keep the last valid function, show the message, `aria-invalid="true"`. |
| `cauchy-riemann-vpreset-xy`, `-vpreset-y`, `-vpreset-x2`, `-vpreset-3` | `button.chip` | `x + y`, `y`, `x²`, `3` | Write the text `x + y`, `y`, `x^2`, `3` into `#cauchy-riemann-v` and apply it. |
| `cauchy-riemann-v-error` | `div`, `role="alert"` (hidden when empty) | the parser message, then a two-line caret display | Section 5.4, C-2. |
| `cauchy-riemann-const-status` | `p` | the sentence of section 2.5 | Always contains the literal `f' = 0` and the word `constant` while `const-u` is active. |
| `cauchy-riemann-zplane` / `-wplane` | planes | aria-labels "z-plane. Drag the point z0." and "w-plane, zoomed on f of z0" | z-plane view [−2, 2]², `grid: 'cart'`, labels `['x','y']`; w-plane `interactive: false`, `grid: 'cart'`, labels `['u','v']`, `minUnitsAcross: 0.01`, `maxUnitsAcross: 1e6`; its view is set by the station (section 5.4, C-5). |
| `cauchy-riemann-zplane-z0` | handle | label `z0`, colour `--input` | Same drag rules as `mappings` (0.1 snap on pointer, clamp ±6). |
| `cauchy-riemann-h` | `input type=range` 0.05..0.5 step 0.01, default 0.3 | "Side of the square, h" | `input`: recompute parts. |
| `cauchy-riemann-h-value` | `output` | `h.toFixed(2)` | |
| `cauchy-riemann-true` | `input type=checkbox` in `label.check` | "Also show where f really sends the square" | Default off. Draws the true image (curved for large h) as a thin dotted outline. |
| `cauchy-riemann-key` | `ul` | colour key (section 3) | Items shown only for the parts that are drawn. |
| `cauchy-riemann-wcap` | `figcaption` | "w-plane, zoomed on f(z₀) = 1.149 + 1.183i. One grid square is 0.2 wide." | Live. |
| `cauchy-riemann-jac` | `table` | caption "The Jacobian at z₀" | 2 x 2 cells below. |
| `cauchy-riemann-ux`, `-uy`, `-vx`, `-vy` | `td` | | Text starts with the number (`fmtNum`, 3 decimals), then the formula; `data-value` holds the number as text. |
| `cauchy-riemann-cr1`, `cauchy-riemann-cr2` | `p`, `data-holds="yes"\|"no"` | "u_x = v_y: 1.149 vs 1.149, residual 0.000" / "u_y = -v_x: -1.183 vs -1.183, residual 0.000" | A badge "holds" / "fails" at the end (text inside a `span.badge`, after the line; the line text itself is as quoted). |
| `cauchy-riemann-verdict` | `p` | sentence (section 5.4, C-7) | |
| `cauchy-riemann-readout` | `div.readout` | none | Format of section 5.4, C-7 (and 4.3). |
| `cauchy-riemann-move` | `p` | "A spins the square by Arg A = 0.8 rad (45.8 degrees) and stretches it by \|A\| = 1.649. ..." | Live (section 5.4, C-7). |
| `cauchy-riemann-ab` | explainer `id: 'cauchy-riemann-ab'`, default columns | caption "A and B in both addresses" | Rows `A`, `B`, `fprime`; footer `same`. Cell ids `cauchy-riemann-ab-A-cart`, `-A-polar`, `-B-cart`, `-B-polar`, `-fprime-cart`, `-fprime-polar`. |
| `cauchy-riemann-paths` | `button.btn`, `aria-expanded`, `aria-controls="cauchy-riemann-paths-panel"` | "Show how the equations come from two paths" / "Hide the two paths" | Toggles the panel; starts closed on every mount. |
| `cauchy-riemann-paths-panel` | `div.panel` (`hidden` while closed) | title "Two paths into z₀" | Contains explainer `cauchy-riemann-ex` (columns `dx`, `dy`) and the derivation sentences. |
| `cauchy-riemann-ex` | explainer | caption "Two paths, one limit" | Footer id `cauchy-riemann-ex-same`. |
| `cauchy-riemann-polar-note` | `aside.callout` | "In the polar address" | Visible for `exp` and `const-u` only. |
| `cauchy-riemann-proof` | `ol` inside a panel `cauchy-riemann-proof-panel` | "The proof of P7, one line at a time" | Visible for `const-u` only; items `cauchy-riemann-proof-1` .. `-4`, each with `data-ok="yes"\|"no"`. |

### 2.4 Interaction

**Pointer.** The only draggable things are the two handles (`mappings-zplane-z`, `cauchy-riemann-zplane-z0`); the plane widget owns their hit area (at least 32 px square, larger than the 7 px dot), the pointer capture, the 10 px inset clamp and Esc to cancel. The station adds the 0.1 snap and the ±6 clamp (5.2). Dragging empty canvas pans a plane (mouse) and two-finger drag pans and pinches (touch), also the plane's. The `cauchy-riemann` w-plane is `interactive: false` (no pan, no zoom, no buttons, no keyboard): its view belongs to the station. Chips, slider, checkbox and buttons are native controls.

**Touch.** Identical (pointer events). Chips and buttons are at least 44 px (`button.chip` is 44 px in the shell). The page scrolls normally when the finger starts outside a handle or plane (the plane decides touch-action).

**Keyboard.**

| Key | Where | Result |
|---|---|---|
| Tab / Shift+Tab | page | chips, the z handle, the plane's zoom buttons, slider, grid chips, Play, explainer (not focusable), staircase rows (roving tab stop, one Tab stop for the list), Lab button, links. Order is DOM order (section 2.1). |
| Arrow keys | focused handle | move by 0.1 (Shift 1, Alt 0.01), clamped to ±6; **not snapped** (the exact keyboard value is shown in the readout). |
| Arrow keys | focused plane | pan; `+` `-` `0` zoom and reset (plane's own). |
| Arrow Up / Down, Home, End | focused staircase row | move between steps; Enter or Space picks (the widget's own). |
| Left / Right, Home, End | range input | native; the slider's `input` event is the only hook. |
| Space / Enter | chips, buttons, checkbox | activate. |
| Esc | during a handle drag | cancels the drag (plane). |

### 2.5 States, and the copy (exact text)

#### States

| State | `mappings` | `cauchy-riemann` |
|---|---|---|
| Default | fn `sq-plus-iz`, z = 1 + i, s = 1, Cartesian grid on, k = 0 | fn `exp`, z₀ = 0.5 + 0.8i, h = 0.3, paths closed, true image off |
| Loading | None: `mount` is synchronous (no `await`). The router shows its own placeholder if the module import is slow. | same |
| z = 0 (or z₀ = 0) | z-plane: no ray, no arc (the plane skips them below 6 px). Staircase `update(null)` shows "z = 0 has no angle". Polar value cell: `r = 0, θ undefined`. For `recip` it is the pole (next row). | `abs2` and `re` at 0 are fine (CR holds for \|z\|² at 0). Spin arc is skipped when \|A\| < 1e-9. |
| Pole of the function | `recip` at z = 0: readout `w = undefined (0 is the pole of 1/z)`; w dot, w overlays and the ramped path are not drawn; the footer says `not checked`; grid curves are cut near the pole by the engine. | Not reachable (no pole among the chips); a typed v that is NaN at z₀ gives `A = undefined; \|B\| = undefined; CR holds: no; f' does not exist here`. |
| w off the plane | An arrow at the edge of the w-plane pointing toward w, with the text "w is off the plane". The student can zoom out with the plane's `−`. | The w-plane view always contains f(z₀) (centred on it, then moved a few pixels so no axis hugs an edge: 5.4 C-5b). The view is clamped to 1e6 units for an enormous S, which none of the six chips can reach (the largest S in the z-plane [−6, 6]² is e⁶ ≈ 403, so about 1000 units across); the "(off the scale)" key note of the first draft was dropped as unreachable. |
| Both grids off | Hint "Switch a grid on to see the whole plane move."; the dot still moves. | n/a |
| Invalid typed v | n/a | `#cauchy-riemann-v-error` shows the parser message verbatim and a caret line; `aria-invalid="true"`; the previous valid function stays in force; the readout does not change. |
| KaTeX missing | The explainer degrades to plain text in the cells (class `tex-error`); readout, planes and staircase are unaffected. | same; Jacobian formulas show as plain TeX text |
| No canvas | The plane shows its own note; readout, explainer, staircase still work. | same |
| Reduced motion | `Play` becomes a stepper (5.3, M-7). Nothing else animates. | No autonomous animation exists; nothing changes. |
| Mount error | A throw in `mount` (for example a catalogue entry that does not compile) is caught by the router and shown as "This station is under construction." | same |

#### Copy, `mappings`

- **lede:** "A function picks up every point of the z-plane and puts it down somewhere on the w-plane. Drag z and watch w. The table below writes the same function twice, once in x and y and once in r and θ, and checks that both land on the same point."
- **Pick a function (h2).** Chip labels: `z² + iz`, `z²`, `iz − 2i`, `1/z`, `conj z`.
- **z hint (under the z-plane):** "Drag the dot z, or focus it and use the arrow keys (Shift for big steps, Alt for tiny ones). A drag moves in steps of 0.1 so the numbers stay tidy."
- **w hint (under the w-plane):** "The ramped line is the straight path from z to w that the morph follows: dark at s = 0, bright at s = 1, with a ring at the current s. The seam is the negative real axis, where Arg jumps from π to −π."
- **Motion panel (h2):** "Watch the plane move". Text: "Morph s: 0 is the input plane, 1 is the output plane. In between, every point slides in a straight line from z to f(z)." Group label: "Carry which grid". Chip labels "Cartesian grid", "Polar grid".
- **Derivation panel (h2):** "The same function in both addresses". Text (through `prose`): "Left: expand with z = x + iy. Right: expand with z = re^{iθ}. Each ends in u + iv. The last row checks that both land on the same point."
- **Explainer row labels:** `Expand`, `u = Re f`, `v = Im f`, `At this z`. Column headings are the explainer defaults, "Cartesian (slide)" and "Polar (spin-and-stretch)". Footer label is the explainer's "same point: agree | differ | not checked".
- **Badges:** the `expand` row shows "easy in Polar" for `sq` and `recip` (the native badge of the explainer), none for the others.
- **Staircase panel (h2):** "Which name of the angle?". Text: "z is one point. arg z is every angle that reaches it: θ + 2πk. Arg z is the one in (−π, π]. Pick a step. The polar column uses it, and w does not change, because cos and sin repeat every full turn."
- **Step note:** "Using θ = Arg z + 2π·k with k = 0, so θ = π/4." (the angle through `fmtAngle(θ, { unicode: true })`; for z = 0: "z = 0 has no angle, so there is no step to pick.")
- **Callout "Which grid stays tidy?":** "z² and 1/z act on r and θ, so they carry the polar grid to a polar grid (circles to circles, rays to rays) and bend the Cartesian grid. iz − 2i is a quarter turn and a slide, so it moves both grids rigidly. Switch functions and watch."
- **Callout "Why this works":** "z² + iz uses θ only inside cos and sin, so every name of the angle gives the same w. A formula that divides the angle, like the square root, would give different answers on different steps. That is what a branch is: a choice of one step. See Branches and The Staircase." ("Branches" links to `#branches`, "The Staircase" to `#staircase`.)
- **Lab button:** "Draw your own shape in the Lab".
- **w off screen:** "w is off the plane".
- **Pole readout:** "w = undefined (0 is the pole of 1/z)".

#### Copy, `cauchy-riemann`

- **lede:** "Zoom in on one point z₀ until f looks like a straight-line map. A tiny square becomes a parallelogram. If f is differentiable there, the parallelogram is just the square spun and stretched by one number, f′(z₀). The Cauchy–Riemann equations say that nothing else is left over: no mirror."
- **Function notes** (`#cauchy-riemann-fn-note`):
  - exp: "f(z) = e^x(cos y + i sin y), which is e^z. u = e^x cos y and v = e^x sin y. This is problem 3.2.1."
  - sq-plus-z: "f(z) = z² + z, so u = x² − y² + x and v = 2xy + y. This is the function of problem 3.1.1."
  - conj: "f(z) = conj z, so u = x and v = −y. A pure mirror."
  - re: "f(z) = Re z, so u = x and v = 0. It squashes the plane flat onto the real axis."
  - abs2: "f(z) = |z|², so u = x² + y² and v = 0. The output is always real."
  - const-u: "u is a constant c, and v is whatever you type. This is problem P7: could such an f be entire?"
- **z hint:** "Drag z₀ (steps of 0.1). The small square around it has side h." Slider label: "Side of the square, h". Under the slider: "Shrink h and the picture settles into a clean spin and stretch."
- **w caption:** "w-plane, zoomed on f(z₀) = <cart>. One grid square is <step> wide. The dashed square keeps its original size, so you can see the spin and the stretch."
- **Key items** (`#cauchy-riemann-key`, each with a swatch): "The square as it was (moved to f(z₀), same size)"; "A part: the square spun and stretched by A"; "B part: a mirrored copy, size |B|"; "Image of the square (A part plus B part)"; "Where f really sends the square (curved when h is large)". The A item appears only when \|A\| ≥ 1e-9, the B item only when \|B\| ≥ 1e-6, the last only when the checkbox is on.
- **Jacobian panel (h2 or caption):** "The Jacobian at z₀". Text: "Each cell shows its value at z₀, with the formula underneath. u is the real part of f and v the imaginary part."
- **Tests panel (h2):** "The two Cauchy–Riemann tests".
- **Badge texts:** "holds" (`data-holds="yes"`), "fails" (`"no"`).
- **Verdict** sentences: section 5.4, C-7.
- **Move line:** `A spins the square by Arg A = 0.8 rad (45.8 degrees) and stretches it by |A| = 1.649. Every name 0.8 + 2πk spins it the same way; Arg A is the one in (−π, π].` When B ≠ 0 add: ` The mirror part B has size |B| = 0.943.`; when B = 0: ` There is no mirror part.`; when \|A\| < 1e-9: `A is 0: the spin and stretch part has collapsed to a point.` (Angles in the sentence use `fmtNum`; `45.8` is `fmtNum(deg, 1)`.)
- **A and B panel:** title "A and B in both addresses"; text "A and B are complex numbers, so each has a Cartesian address and a polar address. A in polar is the spin and the stretch."
- **Explainer row labels:** `A (spin and stretch)`, `B (mirror)`, `f′(z₀)`. Native badges: A → polar, B → cart, f′ → cart.
- **Paths button:** "Show how the equations come from two paths" / "Hide the two paths". Panel title: "Two paths into z₀". Text: "Approach z₀ along the real direction (Δz = Δx) and along the imaginary direction (Δz = iΔy). A derivative must be the same from every direction, so the two limits must be the same number. Along Δx the quotient tends to A + B. Along iΔy it tends to A − B. They agree exactly when B = 0." Then: "Match real parts: u_x = v_y. Match imaginary parts: v_x = −u_y."
- **const-u labels:** "c (the constant u)", "v(x, y)"; preset chip labels `x + y`, `y`, `x²`, `3`.
- **Proof panel:** title "The proof of P7, one line at a time". Items:
  1. "u = c, so u_x = 0 and u_y = 0." (suffix: ` At z₀: u_x = 0, u_y = 0.`)
  2. "Cauchy–Riemann says v_y = u_x and v_x = −u_y, so v_y = 0 and v_x = 0." (suffix when it fails: ` Your v has v_x = 1, v_y = 1 here, so it breaks this line.`)
  3. "Then f′ = u_x + i v_x = 0."
  4. "f′ = 0 on a domain (the whole plane), so f is constant (Theorem 3.2.13)."
- **const-status sentences:** section 5.4, C-7.
- **Polar note:** the problem's `routes.polar` through `prose()` (3.2.1 for `exp`, P7 for `const-u`), under the heading "In the polar address".
- **Errors:** parser message verbatim; own messages: "v has to be a real number at every point, because it is the imaginary part of f. Remove the i." and "That expression has no value at some points. Try something like x + y or x^2."

---

## 3. Visual encoding

All colours are tokens read at draw time (`cssColor` inside layers, CSS variables in HTML). Both themes work because nothing is a literal; the checks per theme are in section 7.

### 3.1 The code, as used here

| Thing | Token | Drawn as |
|---|---|---|
| Cartesian address of a point (drop lines, `x = …`, `y = …`), the Cartesian grid, formulas in x and y, the left explainer column | `--cart` | `drawCartAddress`, curves with `family: 'cart'`, `cart(...)` tint, column tone |
| Polar address (ray, `r = …`, arc `Arg z = …`, ghost windings `also …`), the polar grid, formulas in r and θ, the right explainer column, **the A part** (a spin and stretch is the "move") | `--polar` | `drawPolarAddress`, curves with `family: 'polar'`, `polar(...)` tint, `drawArc` for the spin |
| Input (z-plane strokes, the z dot, the tiny square, the ghost square) | `--input` | handle colour, `addCurve` colour |
| Output (w-plane dot and overlays, the image of the square) | `--output` | `drawDot`, `addCurve` colour |
| Time | `--t0`→`--t1` ramp mixed into the stroke by `drawTimedCurve` | the two squares (z-plane and image) with dots at t = 0, ¼, ½, ¾ on the corners and an arrowhead at t = 1; the "start … end" pill |
| Morph dot (between input and output) | `mixColor(cssColor('--input'), cssColor('--output'), s)` | blend; the label `w` only at s ≥ 0.999 |
| Seam (negative real axis) | `--seam` | `drawSeam(ctx, plane, Math.PI)` dashed, labelled "seam", on every plane where Arg is printed (both planes of `mappings`) |
| The **B part** (the mirror, the thing that should be zero) | `--danger`, **dashed** | dashed outline, so the distinction from the orange A part never rests on hue alone |
| The straight path z → w in `mappings` (the morph's own clock) | `--output` with the time ramp | a 33-point `drawTimedCurve` with `ramp: true`, dots at s = 0, ¼, ½, ¾, an arrowhead at w and `cursor: s` (a ring at the current s) |
| The line Re w = c in `cauchy-riemann` | `--seam`, `DASH.guide` | `drawSegment` with `dash: DASH.guide` |
| CR "holds" / "fails" | `--ok` solid border / `--text-muted` dashed border | `span.badge[data-answer="yes"|"no"]`, styled by two rules in the station's own style block that mirror the shell's chip rule (`.chip[data-answer]` only matches `.chip`); shape (solid vs dashed) as well as colour |
| Hue wheel (domain colouring) | not used in these two stations | |

**Time coloring.** In `mappings` time is the morph parameter s: the straight path from z to w carries the ramp (dark at s = 0, bright at s = 1) and a ring marks the current s, so "when" on the path is "how far the plane has moved". The carried grids are **not** ramped, on purpose: a grid has no start and no end, and a ramp on every grid line would hide the family colours of the code above. In `cauchy-riemann` the tiny square on the z-plane and its image on the w-plane both carry the ramp (same t on the same corner), which is how a mirror shows up (the ramp runs the other way round on the B part). Free strokes with a ramp belong to the Lab.

### 3.2 arg as a set, Arg highlighted (the required vocabulary)

- **`mappings`, on both planes:** `drawPolarAddress(ctx, plane, point, { ghosts: 1, ghostsNeg: 1, name: 'z' | 'w' })`. The solid arc ending in an arrowhead is `Arg` (the label "Arg z = 0.785"); the two fainter windings are the other names of arg (labels "also 7.069", "also -5.498"); the point is drawn once (the handle, or the dot at D(s)). On the w-plane the Cartesian address of w is `drawCartAddress` too, but its drop-line labels read `u = -1` and `v = 3` (the axes are u and v, and 2.1.1 is about u(x, y) + iv(x, y), so naming the output's coordinates x and y would blur input and output): see M-5b. The seam is dashed. The staircase beside the explainer lists the same names as rows with the home step `k = 0` highlighted (`Arg z =`), and the picked row outlined.
- **`cauchy-riemann`, on the w-plane:** the spin of A is a solid arc from the direction 0 to the direction Arg A, centred at f(z₀), radius `0.30 * unitsAcross`, arrowhead, with the label "Arg A = 0.8"; **one** fainter winding that turns the same way as the solid arc (to Arg A + 2π when Arg A ≥ 0, to Arg A − 2π when Arg A < 0; section 5.4, C-6), radius 1.12 times larger and drawn at the `--ghost-alpha` opacity. The two texts "Arg A = 0.8" and "also 7.083" form one block of two lines (14 px apart, as in plane.js's Arg block) beside the middle of the arc; the first draft put "also" at the end of the winding, which for a small Arg A is the same spot as "Arg A" and printed the two over each other. It is skipped when \|A\| < 1e-9 (no direction). Note the words: the arc is `Arg A`, never `arg A`, because it is one number; "every name 0.8 + 2πk" is the set.
- No place in either station writes an equation with `arg` as if it were a number.

### 3.3 Input versus output

z-plane strokes and the handle are `--input` (green); w-plane strokes are `--output` (purple). The grids are the exception, by rule 10.5.3: coloured by family (`--cart`, `--polar`) on **both** planes so the student sees which family went where; the plane titles say input and output. The z-plane is on the left (top on phone), labelled `z = x + iy`; the w-plane on the right (below), `w = u + iv`.

### 3.4 Both themes

- **Light:** `--cart #0b63ad`, `--polar #a84300`, `--input #006e53`, `--output #9d3a8a`, `--danger #b3261e`, `--seam #6b7384`, surface white. The polar orange and the danger red are close in hue, so every B-part mark is dashed and the key shows the dash.
- **Dark:** `--cart #62adf2`, `--polar #ff9d5c`, `--input #3fd0a0`, `--output #e48fd2`, `--danger #ff8178`, surface `#151c2b`. Ramp ends `--t0 #5c7498` → `--t1 #f3f6fb` are both at least 3:1 against the dark surface (shell contract).
- HTML parts (chips, key swatches, badges, callouts, the Jacobian table) use CSS variables only. KaTeX in the explainer is tinted with the baked hex of the token at render time (`cart()`, `polar()`), re-rendered by the explainer on `themechange`. KaTeX outside the explainer (Jacobian formulas, the problem statement, the proof) is **not** tinted with `\textcolor`; it inherits `color` from CSS (`.cr-cart` sets `color: var(--cart)`), so nothing needs re-rendering on a theme change.
- Canvas drawing re-reads tokens every frame; the planes redraw on `themechange` themselves.

---

## 4. Module API

### 4.1 Conventions that hold for both files

- ES modules, relative imports only. **No top-level DOM or `window` access** (so `tests/unit` can import the files in Node). `window.__mv` is touched only inside `mount`, as `const mv = (window.__mv = window.__mv || {})`.
- Imports, `js/stations/mappings.js`:

```js
import { fnById } from '../data/functions.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { compile } from '../core/parse.js';
import { toPolar, abs, sub, fmtNum, fmtCart, fmtAngle, texNumber, texAngle } from '../core/complex.js';
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawTimedCurve, drawDot,
         mixColor, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { cartGrid, polarGrid } from '../core/shapes.js';
import { morph } from '../core/mapping.js';
```

- Imports, `js/stations/cauchy-riemann.js` (acceptance A5 pins the first two lines):

```js
import { jacobian, localLinear, toPolar, abs, mul, conj, fromPolar, fmtNum, fmtCart, texAngle } from '../core/complex.js';
import { compile, ParseError } from '../core/parse.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { createPlane, drawCartAddress, drawArc, drawSegment, drawLabel, drawDot, drawPolygonFill, drawTimedCurve,
         DASH, niceGridStep } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { rect } from '../core/shapes.js';
import { pushForward } from '../core/mapping.js';
```

  `cauchy-riemann.js` does not use `drawSeam`, `drawPolarAddress`, `mixColor`, the staircase widget or `fnById` (no principal value is read off a plane there; the spin of A is drawn by hand with `drawArc`).

- Every function documented below is a **named export** (pure ones) so the unit test can call it; `mount` is the only one that touches the DOM. Nothing is exported as default.
- Station contract (ARCHITECTURE 4): `export function mount(el, ctx)` returns `unmount()`. Both `mount`s are synchronous (no `await`), so there is no loading state. `unmount` is idempotent.
- Events consumed: handle `onDrag` (plane), `wplane.on('viewchange', cb)` (mappings only), DOM `input`/`click`/`change` on the station's own controls, the staircase's `onPick`. Events produced: none. No custom DOM events. No `window`/`document` listeners at all (planes, explainers and the staircase own theirs), so unmount has nothing to remove there.
- Store: only `ctx.store.set('lab.request', request, { persist: false })` in `mappings` (the Lab hand-off). Nothing is read from or persisted to the store; `localStorage` is never touched by these stations.
- Test hooks (ARCHITECTURE 10.7: add to `window.__mv`, never replace; delete in `unmount`):
  - `mappings`: `mv.mappingsMorph` (a **number**, the current s; written on every change, including by `setSlider`), and `mv.mappings = { state() }` where `state()` returns `{ fn, z: {re, im}, k, s, grids: { cart, polar }, pieces: <number of drawn w-plane pieces>, wView: { center, unitsAcross } }`.
  - `cauchy-riemann`: `mv.cauchyRiemann = { state(), parts() }`; `state()` returns `{ fn, z0, side, holds, holds1, holds2, absB, report }`; `parts()` returns `{ fz0, ghost, A, B, image, truth }`, the five polylines (arrays of `{re, im, t}`) most recently handed to the w-plane (`truth` is `null` unless the checkbox is on).

### 4.2 `js/stations/mappings.js`

```js
export const MAPPING_FN_IDS = Object.freeze(['sq-plus-iz', 'sq', 'linear-i', 'recip', 'conj']);   // chip order
export const MAPPING_DEFAULTS = Object.freeze({ fnId: 'sq-plus-iz', z: Object.freeze({ re: 1, im: 1 }), s: 1, k: 0 });
export const W_HALF = Object.freeze({ 'sq-plus-iz': 8, sq: 8, 'linear-i': 5, recip: 4, conj: 3 });  // w-plane view is [-H, H]^2
export const Z_HALF = 2.5;                    // z-plane view is [-2.5, 2.5]^2
export const GRID_HALF = 1.5;                 // the carried grids cover [-1.5, 1.5]^2 and the disk of radius 1.5
export const Z_LIMIT = 6;                     // |x| and |y| of the dot are clamped to this
export function uvCartesian(fnId, x, y)       // → { u, v } in (x, y); both NaN at a pole; RangeError for an id not in MAPPING_FN_IDS
export function uvPolar(fnId, r, theta)       // → { u, v } in (r, theta); theta may be ANY name of arg z; both NaN at a pole (r = 0 for 1/z)
export function bothAddresses(fnId, z, k = 0) // → Model (below); k is an integer, the step of the staircase
export function mappingReadout(fnId, z)       // → "z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3"
export function snapTenth(z, limit = Z_LIMIT) // → { re, im } rounded to multiples of 0.1, clamped to [-limit, limit], never -0
export function clampRadiusFor(view, size)    // → Math.max(40, 3 * max(halfW, halfH) + hypot(view.center)); view = { center, unitsAcross }, size = { w, h }
export function gridCurves()                  // → { cart: Curve[14], polar: Curve[15] } from shapes.cartGrid / shapes.polarGrid (parameters in 5.3, M-3)
export function withCartLabels(c2, names)     // → a canvas context for drawCartAddress that prints "u = ..." / "v = ..." (names = { x: 'u', y: 'v' }) where plane.js prints "x = ..." / "y = ..." (5.3, M-5b)
export function thetaTex(m)                   // → TeX of the angle shown in the polar "At this z" cell: "Arg z = π/4" for k = 0, "Arg z + 2π = π/4 + 2π = 9π/4" for k = 1, "undefined" at z = 0
export function mount(el, ctx)                // → unmount
```

`Model` (returned by `bothAddresses`):

```js
{ fnId, z: {re, im}, x, y,                     // the Cartesian address
  r, theta,                                    // the polar address: r = |z|, theta = Arg z (0 when z = 0)
  k, thetaK,                                   // the picked step and the name used: thetaK = theta + 2 pi k
  zero: boolean,                               // z = 0 exactly (theta is then a convention, not an angle)
  cart:  { u, v, w: {re, im} },                // from uvCartesian(fnId, x, y)
  polar: { u, v, w: {re, im} },                // from uvPolar(fnId, r, thetaK)
  direct: {re, im},                            // compile(fnById(fnId).src).f(z): the truth both columns must match
  pole: boolean,                               // direct is not finite
  agree: true | false | null }                 // |cart.w - polar.w| and |cart.w - direct| <= 1e-9 * max(1, |direct|); null when any of the three is not finite
```

The catalogue entries used (`fnById(id)`): `label`, `note`, `src`, `cart.u`, `cart.v`, `polar.u`, `polar.v` (TeX), all non-null for the five ids.

**Module-private data** (section 5.3 shows the TeX strings):

```js
const UV = { 'sq-plus-iz': { c: (x, y) => ..., p: (r, t) => ... }, sq: {...}, 'linear-i': {...}, recip: {...}, conj: {...} };   // the hand formulas
const EXPAND = { <fnId>: { cart: '<TeX>', polar: '<TeX>' } };
const EXPAND_NATIVE = { sq: 'polar', recip: 'polar' };
```

### 4.3 `js/stations/cauchy-riemann.js`

```js
export const CR_FN_IDS = Object.freeze(['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u']);   // chip order
export const CR_EPS = 1e-3;                   // "CR holds" iff both residuals are below this (A5)
export const ZERO_EPS = 1e-9;                 // a complex number smaller than this is 0 (no direction, no polar address)
export const B_VISIBLE = 1e-6;                // the B part is drawn and the key lists it when |B| >= this
export const Z_HALF = 2;                      // z-plane view is [-2, 2]^2
export const Z_LIMIT = 6;                     // |x| and |y| of z0 are clamped to this
export const CR_FUNCTIONS = Object.freeze({   // see 4.3.1
  exp: {...}, 'sq-plus-z': {...}, conj: {...}, re: {...}, abs2: {...}, 'const-u': {...} });
export function crReport(f, z0)               // → Report (below)
export function crReadout(report)             // → "A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)"  or  "...; CR holds: no; f' does not exist here"
export function crLines(report)               // → { cr1: "u_x = v_y: 1.149 vs 1.149, residual 0.000", cr2: "u_y = -v_x: -1.183 vs -1.183, residual 0.000" }
export function crVerdict(fnId, report, z0)   // → one sentence (5.4, C-7)
export function constStatus(report, c, vAtZ0, everywhere)   // → the const-u sentence (5.4, C-7); always contains "f' = 0" and "constant"
export function constUFunction(c, vSrc)       // → { ok: true, f, vSrc } | { ok: false, message, position, length }  (position and length are null for the two own messages)
export function squareCurve(z0, side)         // → Curve: shapes.rect(z0 - (1+i)h/2, z0 + (1+i)h/2, { nPerSide: 8 }); 33 points, closed, ccw from the min corner, t = 0, 1/4, 1/2, 3/4, 1 on the corners
export function localImages(f, z0, side, report, { withTruth = false, clampRadius = 40 } = {})   // → { fz0, ghost, A, B, image, truth }
export function wViewFor(report, side, fz0)   // → { center: fz0, unitsAcross } | null when fz0 is not finite
export const AXIS_CLEAR = { left: 36, right: 20, top: 22, bottom: 22 };   // px kept between an axis that is in the view and the nearest edge (5.4, C-5b)
export function keepAxesClear(view, size)     // → the view with its centre moved just enough that no axis in the view is within AXIS_CLEAR of an edge; same unitsAcross; `view` itself when size is unknown
export function abRows()                      // → the three rows of the A/B explainer (A, B, f'); exported for the unit test of the "undefined" cells
export const abSame                           // → (s) => { cart, polar, agree } the footer of the A/B explainer
export function snapTenth(z, limit = Z_LIMIT) // identical to the one in mappings.js (copied: stations do not import each other)
export function mount(el, ctx)                // → unmount
```

`Report` (returned by `crReport`; all numbers are unrounded):

```js
{ finite: boolean,                    // every partial is a finite number
  jac: { ux, uy, vx, vy },            // from complex.jacobian(f, z0)  (central differences, h = 1e-5)
  A: {re, im}, B: {re, im},           // from complex.localLinear(f, z0), each part with |part| < ZERO_EPS set to 0 (so A = 0 prints as 0 and has no angle)
  absA, absB,                         // |A|, |B|
  spin: number | null,                // Arg A, or null when absA < ZERO_EPS
  res1, res2,                         // |u_x - v_y| and |u_y + v_x|
  holds1, holds2, holds,              // res < CR_EPS; holds = holds1 && holds2
  fprime: {re, im} | null }           // { re: u_x, im: v_x } (cleaned like A) when holds, else null
```

When `finite` is false: `holds*` are `false`, `fprime` is `null`, `A` and `B` are `{ re: NaN, im: NaN }`, `res1`, `res2`, `absA`, `absB` are `NaN`, `spin` is `null`.

#### 4.3.1 `CR_FUNCTIONS`

One entry per chip. `f` for the five that have a `src` is `compile(src).f`, obtained lazily inside `mount` (a module that compiles at import time would parse at every unit-test import; harmless but keep the table pure data plus the `formulas` closures).

```js
{ id: 'exp', chipLabel: 'e^x(cos y + i sin y)', src: 'exp(z)', problem: '3.2.1', everywhere: 'yes',
  uTex: 'e^{x}\\cos y', vTex: 'e^{x}\\sin y',
  partials: { ux: 'e^{x}\\cos y', uy: '-e^{x}\\sin y', vx: 'e^{x}\\sin y', vy: 'e^{x}\\cos y' },     // TeX shown under the numbers
  formulas: (x, y) => ({ ux: Math.exp(x) * Math.cos(y), uy: -Math.exp(x) * Math.sin(y), vx: Math.exp(x) * Math.sin(y), vy: Math.exp(x) * Math.cos(y) }),
  fprimeTex: 'e^{x}\\cos y + i\\,e^{x}\\sin y = f(z)' }
{ id: 'sq-plus-z', chipLabel: 'z² + z', src: 'z^2 + z', problem: '3.1.1', everywhere: 'yes',
  uTex: 'x^{2}-y^{2}+x', vTex: '2xy+y',
  partials: { ux: '2x+1', uy: '-2y', vx: '2y', vy: '2x+1' },
  formulas: (x, y) => ({ ux: 2*x + 1, uy: -2*y, vx: 2*y, vy: 2*x + 1 }),
  fprimeTex: '(2x+1) + 2y\\,i = 2z + 1' }
{ id: 'conj', chipLabel: 'conj z', src: 'conj(z)', problem: null, everywhere: 'no',
  uTex: 'x', vTex: '-y', partials: { ux: '1', uy: '0', vx: '0', vy: '-1' },
  formulas: () => ({ ux: 1, uy: 0, vx: 0, vy: -1 }) }
{ id: 're', chipLabel: 'Re z', src: 'Re(z)', problem: null, everywhere: 'no',
  uTex: 'x', vTex: '0', partials: { ux: '1', uy: '0', vx: '0', vy: '0' },
  formulas: () => ({ ux: 1, uy: 0, vx: 0, vy: 0 }) }
{ id: 'abs2', chipLabel: '|z|²', src: 'abs(z)^2', problem: '3.1.2', everywhere: 'origin',
  uTex: 'x^{2}+y^{2}', vTex: '0', partials: { ux: '2x', uy: '2y', vx: '0', vy: '0' },
  formulas: (x, y) => ({ ux: 2*x, uy: 2*y, vx: 0, vy: 0 }) }
{ id: 'const-u', chipLabel: 'u = c', src: null, problem: 'P7', everywhere: 'depends',
  uTex: 'c', vTex: null /* the typed text */, partials: { ux: '0', uy: '0', vx: null, vy: null } /* null = "numeric" */,
  formulas: null }
```

The Jacobian cells print the **numeric** value from `jacobian()` first and the TeX of `partials` underneath (`u_x = <tex>`); for `const-u`, `ux` and `uy` print `u_x = 0`, `u_y = 0` and `vx`, `vy` print `v_x = numeric` and `v_y = numeric` (plain text, because the station has no symbolic differentiation). `formulas` are used **only by the unit test**, to prove the displayed TeX is the textbook form (it must equal the numeric Jacobian to 1e-6 at several points).

### 4.4 Data structures, sizes, defaults (one table)

| Name | Value | Used for |
|---|---|---|
| `Z_HALF` | mappings 2.5, cauchy-riemann 2 | z-plane `xRange = yRange = [-Z_HALF, Z_HALF]` |
| `W_HALF` | `sq-plus-iz` 8, `sq` 8, `linear-i` 5, `recip` 4, `conj` 3 | mappings w-plane view; image of the grid square [-1.5, 1.5]² under z² + iz stays within \|w\| ≤ 6.6 |
| `GRID` | `cartGrid({ xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], step: 0.5, n: 96 })` (14 curves), `polarGrid({ rMax: 1.5, rings: 3, rays: 12, n: 96 })` (15 curves) | carried grids |
| plane `maxWidth` | 560 | both stations |
| `STYLE.grid` | `{ width: 1.5, dots: false, arrow: false, ramp: false, alpha: 0.85 }` + `color` by family | grid pieces on both planes |
| Play duration | 2400 ms for a full 0 → 1 run, ease-in-out | mappings |
| `side` | default 0.3, range 0.05 to 0.5, step 0.01 | CR slider |
| CR w-plane `unitsAcross` | `clamp(5 * side * max(1, absA + absB), 0.01, 1e6)` with `absA` = \|A\|, `absB` = \|B\| | CR |
| CR spin arc radius | `0.30 * unitsAcross` (units); ghost arc `1.12` times that | CR |
| Everywhere test (const-u) | the 25 points {−2, −1, 0, 1, 2}² | `everywhere` flag |

### 4.5 Lifecycle

`mount(el, ctx)` (both stations), in this order (details in 5.3 and 5.4):

1. `mv` handle; read the preset; build state.
2. Inject the style block; build the DOM inside `el` (never outside it).
3. Create planes, handle, layers; create explainers and (mappings) the staircase.
4. Wire controls (`addEventListener` on elements the station owns; these die with the DOM).
5. First compute and render (`updateAll()`), synchronous.
6. Register the hooks on `mv`. No window or document listeners exist, so there is nothing to attach last.
7. Return `unmount`.

`unmount()`: `cancelAnimationFrame` for the image and play loops, `clearTimeout` for any pending timer, unsubscribe `wplane.on('viewchange')`, `explainer.destroy()` for each explainer, `staircase.destroy()`, `plane.destroy()` for each plane (this also removes the handle), remove the injected `<style>` if this mount added it, delete `mv.mappingsMorph` / `mv.mappings` / `mv.cauchyRiemann`, set a `destroyed` flag that every callback checks first (a pending rAF or a late `input` event after unmount must do nothing), and clear `el.textContent`? **No**: the router empties `#view` itself; the station only removes what it created outside `el` (the style block and the `mv` hooks).

---

## 5. Algorithms

Conventions for the pseudocode: JS-like; `el(tag, className)` is `document.createElement` plus `className`; text is always set with `textContent`, KaTeX with `tex(el, src)`, prose-with-exponents with `prose(el, text)`; `innerHTML` is never given anything that is not constant markup. `destroyed` is a flag set by `unmount`; every callback starts with `if (destroyed) return`. `clamp(v, lo, hi)` is the obvious one. All helper functions below are private to their file unless section 4 exports them (the two files duplicate the few shared helpers; stations do not import each other).

### 5.1 Shared helpers (both files)

**H-1 `injectStyle(forName, css)`**

1. `const head = document.head; if (head.querySelector('style[data-for="' + forName + '"]')) return null;`
2. `const s = el('style'); s.setAttribute('data-for', forName); s.textContent = css; head.appendChild(s); return s;`
3. `unmount` removes `s` when it is not `null`.

The CSS is token-only, every selector starts with `#station-mappings` or `#station-cauchy-riemann`, and covers only: the grid layouts named below (`.mp-derive`, `.mp-controls`, `.cr-main`, `.cr-two`), the Jacobian table, the colour key swatches, the `.cr-cart` colour (`color: var(--cart)`), `.cr-num` / `.cr-sym` sizes, the `pre.cr-caret` block, and the proof list marks. Breakpoints: `@media (max-width: 72rem)` collapses `.mp-derive` to one column (the explainer needs at least 560 px, which a 1.7fr / 1fr split gives at a 1280 px viewport, about 600 px). `.cr-main` and `.cr-two` are `repeat(auto-fit, minmax(min(100%, 22rem), 1fr))` grids. No literal colours, no `!important`, no restyling of shell classes.

**H-2 `buildHeader(ctx, ledeText)`**

1. `header = el('header', 'station-header')`; `h1 = el('h1')`, `h1.textContent = ctx.station.title` (the only `h1` on the page).
2. `lede = el('p', 'station-lede')`, `textContent = ledeText`.
3. `badges = el('ul', 'thread-badges')`; for each `tid` in `ctx.station.threads`: `li = el('li', 'thread-badge')`, `li.dataset.thread = tid`, `li.textContent = ctx.threads.find(t => t.id === tid).title`.
4. `chips = el('div', 'chips')`, `aria-label="Problems on this page"`; for each `p` of `problemsForStation(ctx.station.id)`: `a = el('a', 'chip problem-chip')`, `a.href = '#' + routeFor(p.id)`, `a.textContent = p.id`, `a.title = p.aha`.
5. Append in the order `h1, lede, badges, chips`.

**H-3 `renderProblemCallout(box, problemId)`** (box is the `aside.callout`; `problemId` may be `null`)

1. `box.textContent = ''`; `const p = problemId && problemById(problemId); if (!p) { box.hidden = true; return; }`.
2. `head = el('p')`; `strong = el('strong')`, `strong.textContent = 'Problem ' + p.id`; `head.append(strong, ' ')`; for each `part` of `statementParts(p.statement)`: `span = el('span')`; if `part.math` then `tex(span, part.text)` else `span.textContent = part.text`; `head.append(span)`.
3. `why = el('p', 'muted')`; `badge = el('span', 'badge')`, `badge.textContent = addressLabel(p.address)` ("Cartesian" for 3.2.1 and P7, "Either address" for 2.1.1); `const tones = addressTones(p.address); if (tones.length === 1) badge.dataset.tone = tones[0].replace(/^--/, '')` (a code with two tones gets the neutral badge); `whySpan = el('span')`, `prose(whySpan, p.addressWhy)`; `why.append(badge, ' ', whySpan)`.
4. `box.append(head, why); box.hidden = false`.

**H-4 `buildStationLinks(ctx)`**

1. `const list = ctx.stations; const i = list.findIndex(s => s.id === ctx.station.id);` `nav = el('nav', 'station-links')`, `aria-label="Neighbouring places"`; `const seen = new Set();`.
2. `function add(st, dir, thread)`: `if (!st) return; const key = dir + ':' + st.id; if (seen.has(key)) return; seen.add(key); a = el('a', 'station-link'); a.dataset.dir = dir; if (thread) { a.dataset.thread = thread; a.title = (dir === 'prev' ? 'Previous' : 'Next') + ' on thread ' + thread; } a.href = '#' + st.id; a.textContent = st.title; nav.appendChild(a);`
3. `add(list[i - 1], 'prev'); add(list[i + 1], 'next');` then for each `t` in `ctx.station.threads`: `add(nearest station before i whose threads include t, 'prev', t)` and the same after for `'next'`. (For both stations the thread neighbours coincide with the order neighbours, so only two links appear; the code stays general.)
4. The "Draw your own shape in the Lab" button (mappings only) is a sibling above the nav, not inside it.

**H-5 Number helpers** (private): `f3 = (x) => fmtNum(x, 3)`; `fixed3 = (x) => Number.isFinite(x) ? (Math.abs(x) < 5e-4 ? 0 : Math.abs(x)).toFixed(3) : 'undefined'` (always three decimals, never `-0.000`: it is used for non-negative quantities, `|B|` and the residuals, and the fixed width is deliberate so `0.000` reads "zero to display precision" and the acceptance strings `|B| = 0.000` and `|B| = 0.5` (a prefix of `0.500`) both match); `cxTex = (z) => Number.isFinite(z.re) && Number.isFinite(z.im) ? fmtCart(z) : '\\text{undefined}'` (an ASCII string such as `-1 + 3i` is valid TeX math); `numTex = (x) => Number.isFinite(x) ? fmtNum(x) : '\\text{undefined}'`.

### 5.2 Pointer handling: snapping, clamping, hit testing (both files)

There is **no custom hit testing and no custom canvas pointer code**: the draggable is the plane's handle button (hit area `max(2 * radius + 18, 32)` px, keyboard focusable, pointer capture, 10 px inset clamp, Esc to cancel). The station's part is the callback:

```
function snapTenth(z, limit = 6) {                      // exported; identical in both files
  const q = (v) => clamp(Math.round(v * 10) / 10, -limit, limit) + 0;     // + 0 turns -0 into 0
  return { re: q(z.re), im: q(z.im) };
}

function onHandleDrag(z, info) {                         // used as the handle's onDrag in both stations
  if (destroyed) return;
  let zz;
  if (info.source === 'pointer') zz = snapTenth(z);                 // 0.1 grid, clamp 6
  else zz = { re: clamp(z.re, -6, 6) + 0, im: clamp(z.im, -6, 6) + 0 };   // keyboard and api: exact, clamped
  if (zz.re !== z.re || zz.im !== z.im) handle.set(zz, { silent: true });    // moves the dot to the snapped place; no re-entry
  state.z = zz;                                          // (state.z0 in cauchy-riemann)
  updateAll();                                           // 5.3 M-10 (mappings) or 5.4 C-10 (cauchy-riemann)
}
```

Why this is enough: the plane calls `onDrag` after every pointermove with the raw `z` (from the pointer and the grab offset, not from the previous snapped `z`, so there is no drift), `set(..., { silent: true })` replaces the dot's `z` with the snapped one before the callback returns, and on release `endDrag` re-applies the snapped `z` and calls `onDrag({ final: true, source: 'pointer' })` with it, which `snapTenth` leaves unchanged. Test: a harness drag to (0, 1) ends with `data-re = 0` and `data-im = 1` exactly.

### 5.3 `mappings`

**M-1 State and preset**

1. `const state = { fnId: 'sq-plus-iz', z: { re: 1, im: 1 }, k: 0, s: 1, grids: { cart: true, polar: false }, playing: false };`
2. `const p = ctx.preset;` if `p && p.kind === 'token' && MAPPING_FN_IDS.includes(p.token)` then `state.fnId = p.token`. A problem preset (`2.1.1`), a topic preset, an unknown token and no preset all keep the defaults (the default **is** problem 2.1.1's state: z = 1 + i, f = z² + iz).
3. `fCache = new Map()`; `getF(id) = fCache.get(id) || (fCache.set(id, compile(fnById(id).src).f), fCache.get(id))`. A throw here propagates out of `mount` (the router shows the under-construction panel).

**M-2 The model** (pure; exported as `uvCartesian`, `uvPolar`, `bothAddresses`)

```
const UV = {
  'sq-plus-iz': { c: (x, y) => ({ u: x*x - y*y - y,  v: 2*x*y + x }),
                  p: (r, t) => ({ u: r*r*Math.cos(2*t) - r*Math.sin(t),  v: r*r*Math.sin(2*t) + r*Math.cos(t) }) },
  sq:           { c: (x, y) => ({ u: x*x - y*y,  v: 2*x*y }),
                  p: (r, t) => ({ u: r*r*Math.cos(2*t),  v: r*r*Math.sin(2*t) }) },
  'linear-i':   { c: (x, y) => ({ u: -y,  v: x - 2 }),
                  p: (r, t) => ({ u: -r*Math.sin(t),  v: r*Math.cos(t) - 2 }) },
  recip:        { c: (x, y) => { const d = x*x + y*y; return d === 0 ? { u: NaN, v: NaN } : { u: x/d, v: -y/d }; },
                  p: (r, t) => r === 0 ? { u: NaN, v: NaN } : { u: Math.cos(t)/r, v: -Math.sin(t)/r } },
  conj:         { c: (x, y) => ({ u: x,  v: -y }),
                  p: (r, t) => ({ u: r*Math.cos(t),  v: -r*Math.sin(t) }) },
};
uvCartesian(id, x, y): if (!UV[id]) throw new RangeError('mappings: unknown function ' + id); return UV[id].c(x, y);
uvPolar(id, r, theta): same with .p.

function bothAddresses(fnId, z, k = 0) {
  const x = z.re, y = z.im;
  const { r, theta } = toPolar(z);                    // theta = Arg z, 0 for z = 0
  const thetaK = theta + 2 * Math.PI * k;
  const c = uvCartesian(fnId, x, y), p = uvPolar(fnId, r, thetaK);
  const wC = { re: c.u, im: c.v }, wP = { re: p.u, im: p.v };
  const direct = compile(fnById(fnId).src).f({ re: x, im: y });    // parse.js caches compiled sources (64 entries), so this is cheap
  const fin = (w) => Number.isFinite(w.re) && Number.isFinite(w.im);
  const tol = 1e-9 * Math.max(1, fin(direct) ? abs(direct) : 1);
  const agree = fin(wC) && fin(wP) && fin(direct) ? (abs(sub(wC, wP)) <= tol && abs(sub(wC, direct)) <= tol) : null;
  return { fnId, z: { re: x, im: y }, x, y, r, theta, k, thetaK, zero: x === 0 && y === 0,
           cart: { u: c.u, v: c.v, w: wC }, polar: { u: p.u, v: p.v, w: wP }, direct, pole: !fin(direct), agree };
}
```

Pole behaviour: `recip` at z = 0: `c` and `p` return NaN pairs, `direct` is `{NaN, NaN}` (`inv(0)`), so `pole = true` and `agree = null`.

**M-3 Grids and the image pieces**

1. `gridCurves()` (exported, memoised once per module): `cart = cartGrid({ xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], step: 0.5, n: 96 })` (14 curves, kinds `cart-x`, `cart-y`, `family: 'cart'`), `polar = polarGrid({ rMax: 1.5, rings: 3, rays: 12, n: 96 })` (15 curves, `family: 'polar'`).
2. State kept by the station: `zCurves = []` (static input curves for the z-plane), `wPieces = []` (the carried pieces), `imageDirty = false`, `imageRaf = 0`.
3. `scheduleImage()`: `imageDirty = true; if (!imageRaf) imageRaf = requestAnimationFrame(() => { imageRaf = 0; rebuildImage(); });`. Called from: `setFn`, grid toggles, `setS`, the w-plane `viewchange` handler. **Not** called from a handle drag.
4. `rebuildImage()`:
   1. `if (destroyed || !imageDirty) return; imageDirty = false;`
   2. `const g = gridCurves(); const sources = []; if (state.grids.cart) sources.push(...g.cart); if (state.grids.polar) sources.push(...g.polar);`
   3. `const f = getF(state.fnId); const clamp = clampRadiusFor(wplane.getView(), wplane.getSize());`
   4. `wPieces = []; for (const c of sources) for (const piece of morph(c, state.s, f, { clampRadius: clamp })) wPieces.push(piece);`
   5. `zCurves = sources;` then `zplane.requestDraw(); wplane.requestDraw();` and update `gridHint.hidden = sources.length > 0`.
5. The w-plane `viewchange` handler: `(v) => { scheduleImage(); }` (covers zoom, pan, resize and the station's own `setView`). It is registered after the first `setFn` so the first build happens once. Guard against a feedback loop: `rebuildImage` never calls `setView`.

**M-4 DOM and planes**

1. Order inside `el`: `buildHeader`, `problemBox` (`aside.callout#mappings-problem`), fn panel (`section.panel`: `h2.panel-title` "Pick a function", `div.chips#mappings-fn-chips[role=group][aria-label="Function"]` with five `button.chip`, `p.muted#mappings-fn-note`), `div.two-planes` with two `div.panel`s (each: a `figure` holding a `div` host for the plane and then the `figcaption` `#mappings-zcap` / `#mappings-wcap`, which is the last child as HTML5 requires; then the hint `p.muted` outside the figure), motion panel (`section.panel` with `div.mp-controls` holding the slider row, the Play button and the grid chips), `div.readout#mappings-readout`, `div.mp-derive` (panel with the explainer host + panel with the staircase host and the step note), the two callouts, the Lab button, `buildStationLinks`.
2. Fn chips: `for id of MAPPING_FN_IDS`: `b = el('button', 'chip')`; `b.type = 'button'`; `b.id = 'mappings-fn-' + id`; `b.textContent = fnById(id).label`; `b.setAttribute('aria-pressed', String(id === state.fnId))`; click → `setFn(id)`.
3. Planes:

```
zplane = createPlane(zHost, { id: 'mappings-zplane', xRange: [-2.5, 2.5], yRange: [-2.5, 2.5], grid: 'none',
                              axisLabels: ['x', 'y'], maxWidth: 560, ariaLabel: 'z-plane, the input. Drag the point z.' });
const H = W_HALF[state.fnId];
wplane = createPlane(wHost, { id: 'mappings-wplane', xRange: [-H, H], yRange: [-H, H], grid: 'none',
                              axisLabels: ['u', 'v'], maxWidth: 560, ariaLabel: 'w-plane, the output of f' });
handle = zplane.addPoint({ id: 'z', z: state.z, label: 'z', color: '--input', step: 0.1, onDrag: onHandleDrag });
```

4. **Creation order inside `mount`** (it matters for `order` ties and for the legend pill): planes, handle, the five layers of M-5 (z grids 10, z overlays 30, w grids 10, `wPath` 25, w overlays 30), the explainer (`exHost`), the staircase, the controls' listeners, then `setFn(state.fnId, { initial: true })`, `setS(state.s)`, `updateAll()`, then `wplane.on('viewchange', ...)`, then the hooks on `mv`.
5. `setFn(id, { initial })`: `state.fnId = id`; set `aria-pressed` on the chips; `prose(noteEl, fnById(id).note)`; `const H = W_HALF[id]; wplane.setView({ center: { re: 0, im: 0 }, unitsAcross: 2 * H }); wplane.setHome();` (Reset returns to this); show or hide the problem callout (`renderProblemCallout(problemBox, id === 'sq-plus-iz' ? '2.1.1' : null)`); `explainer.update` is done by `updateAll`; `scheduleImage()`; `if (!initial) updateAll()`.

**M-5 Drawing layers**

All layers are added once with `plane.addLayer(draw, { order })` and read live state, so a change only needs `plane.requestDraw()`. A layer that throws is disabled by the plane, so keep them total.

```
const GRID_STYLE = { width: 1.5, dots: false, arrow: false, ramp: false, alpha: 0.85 };
const colorFor = (c) => (c.family === 'polar' ? '--polar' : '--cart');

zplane.addLayer((ctx, pl) => {                                    // order 10: the input grids
  for (const c of zCurves) drawTimedCurve(ctx, pl, c.points, { ...GRID_STYLE, color: colorFor(c), closed: !!c.closed });
}, { order: 10 });

zplane.addLayer((ctx, pl) => {                                    // order 30: seam and the two addresses of z
  drawSeam(ctx, pl, Math.PI);
  drawCartAddress(ctx, pl, state.z);
  drawPolarAddress(ctx, pl, state.z, { ghosts: 1, ghostsNeg: 1, name: 'z' });
}, { order: 30 });

wplane.addLayer((ctx, pl) => {                                    // order 10: the carried pieces
  for (const piece of wPieces) drawTimedCurve(ctx, pl, piece.points, { ...GRID_STYLE, color: colorFor(piece), closed: !!piece.closed });
}, { order: 10 });

wplane.addLayer((ctx, pl) => {                                    // order 30: seam, w's addresses, the moving dot
  const m = model;                                                // the Model of the current state, set by updateAll()
  drawSeam(ctx, pl, Math.PI);
  if (m.pole) return;
  const w = m.direct;
  drawCartAddress(withCartLabels(ctx, { x: 'u', y: 'v' }), pl, w);     // drop lines u = Re w, v = Im w (M-5b)
  drawPolarAddress(ctx, pl, w, { ghosts: 1, ghostsNeg: 1, name: 'w' });
  const s = state.s, D = { re: (1 - s) * m.z.re + s * w.re, im: (1 - s) * m.z.im + s * w.im };      // the moving dot, on the path
  drawDot(ctx, pl, D, { color: mixColor(cssColor('--input'), cssColor('--output'), s), radius: 6, label: s >= 0.999 ? 'w' : '' });
  drawOffscreen(ctx, pl, w, 'w is off the plane');
}, { order: 30 });

// the path z -> w on the morph clock: a ramped curve (dark at s = 0, bright at s = 1) with a ring at the current s.
// An addCurve layer, so the plane also prints the "start ... end" pill. Created after the grid layer, before the overlay layer.
wPath = wplane.addCurve({ id: 'path', points: [], color: '--output', ramp: true, width: 2.5, dots: true, arrow: true, cursor: state.s, order: 25 });
// updateAll():  const hide = model.pole || abs(sub(model.direct, model.z)) <= 1e-9;  wPath.hidden = hide;
//               if (!hide) wPath.update(Array.from({ length: 33 }, (_, i) => ({ re: model.z.re + (model.direct.re - model.z.re) * i / 32,
//                                                                              im: model.z.im + (model.direct.im - model.z.im) * i / 32, t: i / 32 })));
// setS():       wPath.setCursor(v);
```

`updatePath(m)` is the first three comment lines above as a function (hide the path at a pole or when z = w, else hand it the 33 points); `wPath` is a `let` in the scope of `mount`.

`drawOffscreen(ctx, pl, w, text)` (private):

1. `const size = pl.getSize(), p = pl.toPixel(w); if (!(Number.isFinite(p.x) && Number.isFinite(p.y))) return; if (p.x >= 0 && p.x <= size.w && p.y >= 0 && p.y <= size.h) return;`
2. `const cx = size.w / 2, cy = size.h / 2, dx = p.x - cx, dy = p.y - cy, m = 16;`
3. `const tx = dx === 0 ? Infinity : ((dx > 0 ? size.w - m : m) - cx) / dx; const ty = dy === 0 ? Infinity : ((dy > 0 ? size.h - m : m) - cy) / dy; const t = Math.min(tx, ty);` the point `q = { x: cx + dx * t, y: cy + dy * t }` is on the inset rectangle along the line from the centre to w.
4. `ctx.save();` fill a triangle (tip 9 px, base 12 px) at `q` pointing along `(dx, dy)` normalised, colour `cssColor('--output')`; draw the text `text` 14 px toward the centre from `q`, `ctx.font = '12px ' + getComputedStyle(document.body).fontFamily`, `fillStyle = cssColor('--text')`, with a 3 px `--surface` stroke halo behind it (`strokeText` then `fillText`), `textAlign` chosen from the sign of `dx` (left edge: `'left'`, right edge: `'right'`, otherwise `'center'`); `ctx.restore();`

**M-6 Explainer rows** (the cells are TeX strings; call `cart()` / `polar()` **inside** the row functions)

```
const EXPAND = {
  'sq-plus-iz': { cart: String.raw`(x+iy)^{2}+i(x+iy)=x^{2}-y^{2}+2ixy+ix-y`,
                  polar: String.raw`(re^{i\theta})^{2}+i\,re^{i\theta}=r^{2}e^{2i\theta}+re^{i(\theta+\pi/2)}` },
  sq:           { cart: String.raw`(x+iy)^{2}=x^{2}-y^{2}+2ixy`,                polar: String.raw`(re^{i\theta})^{2}=r^{2}e^{2i\theta}` },
  'linear-i':   { cart: String.raw`i(x+iy)-2i=-y+i(x-2)`,                        polar: String.raw`i\,re^{i\theta}-2i=re^{i(\theta+\pi/2)}-2i` },
  recip:        { cart: String.raw`\dfrac{1}{x+iy}=\dfrac{x-iy}{x^{2}+y^{2}}`,   polar: String.raw`\dfrac{1}{re^{i\theta}}=\dfrac{1}{r}\,e^{-i\theta}` },
  conj:         { cart: String.raw`\overline{x+iy}=x-iy`,                        polar: String.raw`\overline{re^{i\theta}}=re^{-i\theta}` },
};
const EXPAND_NATIVE = { sq: 'polar', recip: 'polar' };

function thetaTex(m) {                      // the name of the angle in use, with its history when k != 0
  if (m.zero) return String.raw`\text{undefined}`;
  const home = texAngle(m.theta);
  if (m.k === 0) return home;
  return `${home} ${m.k > 0 ? '+' : '-'} ${2 * Math.abs(m.k)}\\pi = ${texAngle(m.thetaK)}`;       // \frac{\pi}{4} + 2\pi = \frac{9\pi}{4}
}

rows = [
  { id: 'expand', label: 'Expand', native: (s) => EXPAND_NATIVE[s.fnId] || null,
    cart:  (s) => cart(EXPAND[s.fnId].cart),
    polar: (s) => polar(EXPAND[s.fnId].polar) },
  { id: 'u', label: 'u = Re f',
    cart:  (s) => cart(`u = ${fnById(s.fnId).cart.u} = ${numTex(s.m.cart.u)}`),
    polar: (s) => polar(`u = ${fnById(s.fnId).polar.u} = ${numTex(s.m.polar.u)}`) },
  { id: 'v', label: 'v = Im f',
    cart:  (s) => cart(`v = ${fnById(s.fnId).cart.v} = ${numTex(s.m.cart.v)}`),
    polar: (s) => polar(`v = ${fnById(s.fnId).polar.v} = ${numTex(s.m.polar.v)}`) },
  { id: 'value', label: 'At this z',
    cart:  (s) => cart(String.raw`x = ${fmtNum(s.m.x)},\ y = ${fmtNum(s.m.y)}\ \Rightarrow\ u = ${numTex(s.m.cart.u)},\ v = ${numTex(s.m.cart.v)},\ w = ${cxTex(s.m.cart.w)}`),
    polar: (s) => polar(String.raw`r = ${s.m.zero ? '0' : texNumber(s.m.r)},\ \theta = ${thetaTex(s.m)}\ \Rightarrow\ u = ${numTex(s.m.polar.u)},\ v = ${numTex(s.m.polar.v)},\ w = ${cxTex(s.m.polar.w)}`) },
];
same = (s) => ({ cart: cart(`w = ${cxTex(s.m.cart.w)}`), polar: polar(`w = ${cxTex(s.m.polar.w)}`), agree: s.m.agree });
explainer = createExplainer(exHost, { id: 'mappings-ex', title: 'Same function, two addresses', rows, same });
```

The state handed to `explainer.update` is `{ fnId, m }` (`m` = the current Model). Number format: **decimals** (`fmtNum`, `fmtCart`) for x, y, u, v, w (they also appear in the readout, rule 10.4.5); **exact forms** (`texNumber`, `texAngle`) for r and θ (not in the readout). The `u` and `v` rows show the catalogue's TeX for the formula and the number the formula gives at the current z (for polar: at the current step θ_k). The angle in the polar "At this z" cell always says which angle it is (`thetaTex`): `θ = Arg z = π/4` at k = 0, `θ = Arg z + 2π = π/4 + 2π = 9π/4` at k = 1, never a bare `π/4`.

**M-5b The labels of w's Cartesian address (fix round)**

plane.js's `drawCartAddress` hard-codes `x = …` and `y = …` and has no option to rename them. On the w-plane the readout, the axes and problem 2.1.1 all say u and v, so those labels must too. Switching the labels off (`{ labels: false }`) and printing `drawLabel` text instead was considered and rejected: `drawLabel` places a label where it is told and does no collision handling, while plane.js's own placement moves each drop-line label to the cheapest free spot around the tick labels, the axes, the ray and the other labels (visible in the shots near the origin and for an off-centre w, where "x = −0.47" and "y = 0.54" sit clear of everything). So `withCartLabels(ctx, names)` wraps the canvas context in a `Proxy` that forwards everything to the real context and rewrites only the strings passed to `fillText` and `strokeText` that start with `x = ` or `y = `. Placement is still plane.js's. `U-F1` draws through the wrapper with plane.js itself and a canvas-like fake (whose methods reject a Proxy as `this`, as a real canvas does), so a plane.js change that stops the wrapper working fails the test. The clean fix is a `labelNames` option on `drawCartAddress` (10.2); when it exists the wrapper goes away.

**M-7 Morph slider and Play timing**

```
const DURATION_MS = 2400;
setS(s, { fromPlay = false } = {}) {
  if (destroyed) return;
  const v = Number.isFinite(s) ? Math.min(1, Math.max(0, s)) : state.s;
  state.s = v;
  if (!fromPlay && state.playing) stopPlay();                       // a hand on the slider stops Play
  if (Math.abs(Number(slider.value) - v) > 1e-9) slider.value = String(v);
  out.textContent = v.toFixed(2);
  slider.setAttribute('aria-valuetext', v === 0 ? 's = 0, the input plane' : v === 1 ? 's = 1, the output plane' : 's = ' + v.toFixed(2));
  mv.mappingsMorph = v;                                             // a number
  wPath.setCursor(v);                                               // the ring on the ramped path
  scheduleImage();
  wplane.requestDraw();                                             // the dot depends on s
}
slider 'input' handler: setS(Number(slider.value));        // the 'change' event needs no handler

startPlay():
  if (prefersReducedMotion()) { stepMotion(); return; }
  if (state.playing) { stopPlay(); return; }
  playFrom = state.s >= 0.999 ? 0 : state.s;
  if (state.s >= 0.999) setS(0, { fromPlay: true });
  state.playing = true; playBtn.textContent = 'Pause';
  playT0 = performance.now();
  playRaf = requestAnimationFrame(tick);
tick(now):
  playRaf = 0;
  if (destroyed || !state.playing) return;
  const span = DURATION_MS * (1 - playFrom);
  const u = span <= 0 ? 1 : Math.min(1, Math.max(0, (now - playT0) / span));   // rAF timestamps can precede performance.now() by a few ms
  const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;  // ease in-out
  setS(playFrom + (1 - playFrom) * e, { fromPlay: true });
  if (u >= 1) { stopPlay(); setS(1, { fromPlay: true }); } else playRaf = requestAnimationFrame(tick);
stopPlay(): cancelAnimationFrame(playRaf); playRaf = 0; state.playing = false;
            playBtn.textContent = prefersReducedMotion() ? 'Step the motion' : 'Play the motion';
stepMotion(): const stops = [0, 0.25, 0.5, 0.75, 1]; const nxt = stops.find((v) => v > state.s + 1e-9); setS(nxt === undefined ? 0 : nxt);
```

At mount the Play button label is `prefersReducedMotion() ? 'Step the motion' : 'Play the motion'`. Reduced motion is read at click time too, so a change in the OS setting while the page is open takes effect on the next click. Changing the function while playing does not stop Play (the image just follows).

**M-8 Readout and captions** (`updateReadout(m)`)

1. `readout.textContent = mappingReadout(state.fnId, state.z)` (exported; the same string a unit test checks). The format is exactly:
   `z = <fmtCart z>; w = <fmtCart w>; u = <fmtNum u>; v = <fmtNum v>; polar: u = <fmtNum u>; v = <fmtNum v>` where `w` is `direct`, `u`, `v` are the Cartesian formula values and the last two are the polar formula values (at k = 0; the readout does not depend on the staircase pick, because the point of the pick is that nothing changes).
   Pole: `z = 0; w = undefined (0 is the pole of 1/z); u = undefined; v = undefined; polar: u = undefined; v = undefined`.
2. `readout.dataset.fn = state.fnId; readout.dataset.s = state.s.toFixed(2);`
3. Captions: `zcap.textContent = 'z-plane (input): z = ' + fmtCart(z)`; `wcap.textContent = 'w-plane (output): w = ' + (m.pole ? 'undefined' : fmtCart(m.direct))`.

**M-9 Staircase and step note**

1. `stairs = createStaircase(stairsHost, { id: 'mappings-stairs', kMin: -1, kMax: 1, label: 'arg z', onPick: (k) => { state.k = k; stairs.setPicked(k); updateAll(); } });` then `stairs.setPicked(state.k)`.
2. In `updateAll`: `stairs.update(m.zero ? null : m.theta)` (pass `Arg`, not `thetaK`: the widget anchors to the home step) and `stairs.setPicked(state.k)`.
3. Step note: `m.zero ? 'z = 0 has no angle, so there is no step to pick.' : 'Using θ = Arg z + 2π·k with k = ' + state.k + ', so θ = ' + fmtAngle(m.thetaK, { unicode: true }) + '.'`.

**M-10 Event flow, `updateAll()`**

```
function updateAll() {
  if (destroyed) return;
  model = bothAddresses(state.fnId, state.z, state.k);
  updateReadout(model);
  explainer.update({ fnId: state.fnId, m: model });
  stairs.update(model.zero ? null : model.theta); stairs.setPicked(state.k);
  stepNote.textContent = ...;
  updatePath(model);                                    // wPath.hidden / wPath.update(...) as in M-5
  zplane.requestDraw(); wplane.requestDraw();
}
```

Triggers: handle drag (`onHandleDrag`), `setFn`, `onPick`, mount. `setS`, grid toggles and `viewchange` only schedule the image and request draws (the readout and the explainer do not depend on s or the grids). Grid chip click: `state.grids[which] = !state.grids[which]; chip.setAttribute('aria-pressed', ...); scheduleImage();`.

**M-11 Lab hand-off** (`#mappings-open-lab` click)

```
const request = { fn: state.fnId,
                  shapes: [ { kind: 'rect', a: { re: -1.5, im: -1.5 }, b: { re: 1.5, im: 1.5 } },
                            { kind: 'circle', center: { re: 0, im: 0 }, r: 1 } ],
                  view: 'morph', problem: state.fnId === 'sq-plus-iz' ? '2.1.1' : null, predictFirst: false };
ctx.store.set('lab.request', request, { persist: false });
ctx.navigate('lab');
```

**M-12 Resolution, theme, performance**

- Canvas size and devicePixelRatio belong to the plane (`ResizeObserver`, DPR capped by the plane). The station never sets a canvas size; it sets only `maxWidth: 560`.
- Theme: the planes redraw on `themechange` by themselves and re-read tokens; the explainer re-renders its tinted cells; HTML uses CSS variables. The station subscribes to nothing.
- Frame budget: a handle drag costs one `bothAddresses` (two small formulas and one compiled `f`), one readout write, one explainer update (coalesced to a frame), one staircase update, two `requestDraw`. A slider move costs one `morph` per grid curve (at most 29) in the next animation frame, coalesced. Targets: pointer drag at 60 fps; `lastDrawMs` of either plane below 16 ms in desktop Chromium at both grids on; image rebuild below 6 ms.

**M-13 Teardown**: section 4.5.

### 5.4 `cauchy-riemann`

**C-1 State and preset**

1. `const state = { fnId: 'exp', z0: { re: 0.5, im: 0.8 }, side: 0.3, c: 2, vSrc: 'x + y', showTrue: false, paths: false, f: null, constU: null };` (`constU` is the last valid `constUFunction` result; `f` the function in force).
2. Preset: `p.kind === 'problem'` → id `'3.2.1'` loads `exp`; `'P7'` loads `const-u`; `p.kind === 'token'` and `CR_FN_IDS.includes(p.token)` loads that function; anything else keeps the defaults.
3. `setFn(id)`: `state.fnId = id; state.f = id === 'const-u' ? state.constU.f : compile(CR_FUNCTIONS[id].src).f;` and show/hide `#cauchy-riemann-constu`, `#cauchy-riemann-proof-panel`, `#cauchy-riemann-polar-note`; `renderProblemCallout(problemBox, ['3.2.1', 'P7'].includes(CR_FUNCTIONS[id].problem) ? CR_FUNCTIONS[id].problem : null)` (so `sq-plus-z` (3.1.1) and `abs2` (3.1.2) show no callout: those problems belong to the derivative station); set the chips' `aria-pressed`; `prose` the note; `recompute('fn')`.
4. `state.constU` is initialised at mount: `constUFunction(state.c, state.vSrc)` (always valid for the default text).

**C-2 `constUFunction(c, vSrc)` and its errors**

```
const SAMPLES = [ { re: 0.3, im: 0.7 }, { re: -1.1, im: 0.4 }, { re: 1.7, im: -0.9 }, { re: 0.5, im: 0.8 } ];
const MSG_REAL = 'v has to be a real number at every point, because it is the imaginary part of f. Remove the i.';
const MSG_UNDEFINED = 'That expression has no value at some points. Try something like x + y or x^2.';
function constUFunction(c, vSrc) {
  let compiled;
  try { compiled = compile(String(vSrc)); }
  catch (e) { if (e instanceof ParseError) return { ok: false, message: e.message, position: e.position, length: e.length }; throw e; }
  for (const p of SAMPLES) {
    const w = compiled.f(p);
    if (!Number.isFinite(w.re) || !Number.isFinite(w.im)) return { ok: false, message: MSG_UNDEFINED, position: null, length: null };
    if (Math.abs(w.im) > 1e-9) return { ok: false, message: MSG_REAL, position: null, length: null };
  }
  const g = compiled.f;
  return { ok: true, vSrc: String(vSrc), f: (z) => ({ re: c, im: g(z).re }) };
}
```

`compile` is cached by source, so calling it on every keystroke is cheap. **The `v` input handler:**

1. `const r = constUFunction(state.c, vInput.value);`
2. `if (r.ok)`: `state.constU = r; state.vSrc = r.vSrc; errorBox.hidden = true; errorBox.textContent = ''; vInput.removeAttribute('aria-invalid'); if (state.fnId === 'const-u') { state.f = r.f; recompute('v'); }`.
3. else: `vInput.setAttribute('aria-invalid', 'true'); errorBox.hidden = false;` build the content with DOM calls: a `p` with `r.message`; if `r.position !== null`, a `pre.cr-caret` whose `textContent` is `vInput.value + '\n' + ' '.repeat(r.position) + '^'.repeat(Math.max(1, r.length))`. Do **not** call `recompute` (the readout keeps the last valid function; this is tested).
4. The `c` input handler: `const c = Number(cInput.value); if (cInput.value.trim() === '' || !Number.isFinite(c)) return; state.c = c; state.constU = constUFunction(c, state.vSrc); if (state.constU.ok && state.fnId === 'const-u') { state.f = state.constU.f; recompute('c'); }`. (`state.vSrc` is always the last valid text.)
5. A `vpreset-*` chip click: `vInput.value = text; vInput.dispatchEvent(new Event('input'))`, so the same code path runs.

**C-3 `crReport(f, z0)`** (exported; pure)

```
const clean = (z) => ({ re: Math.abs(z.re) < ZERO_EPS ? 0 : z.re, im: Math.abs(z.im) < ZERO_EPS ? 0 : z.im });
function crReport(f, z0) {
  const jac = jacobian(f, z0);                       // { ux, uy, vx, vy } (from complex.js: the Jacobian is NOT recomputed by hand)
  const { A, B } = localLinear(f, z0);               // f(z0 + dz) ~ f(z0) + A dz + B conj(dz)
  const finite = [jac.ux, jac.uy, jac.vx, jac.vy, A.re, A.im, B.re, B.im].every(Number.isFinite);
  if (!finite) return { finite: false, jac, A: { re: NaN, im: NaN }, B: { re: NaN, im: NaN }, absA: NaN, absB: NaN, spin: null,
                        res1: NaN, res2: NaN, holds1: false, holds2: false, holds: false, fprime: null };
  const res1 = Math.abs(jac.ux - jac.vy), res2 = Math.abs(jac.uy + jac.vx);
  const holds1 = res1 < CR_EPS, holds2 = res2 < CR_EPS, holds = holds1 && holds2;
  const Ac = clean(A), Bc = clean(B), absA = abs(Ac), absB = abs(Bc);
  return { finite: true, jac, A: Ac, B: Bc, absA, absB, spin: absA < ZERO_EPS ? null : toPolar(Ac).theta,
           res1, res2, holds1, holds2, holds, fprime: holds ? clean({ re: jac.ux, im: jac.vx }) : null };
}
```

`f'` is **u_x + i v_x** from the Jacobian (the textbook form; A5), and the `fprime` explainer row and the path panel show `v_y − i u_y` beside it. `A` agrees with `f'` when CR holds (to 1e-10); the readout prints A from `localLinear` and `f'(z0)` from `ux + i vx`, which is why both appear.

**C-4 `squareCurve` and `localImages`** (exported; pure)

```
function squareCurve(z0, side) {
  const h = side / 2;
  return rect({ re: z0.re - h, im: z0.im - h }, { re: z0.re + h, im: z0.im + h }, { nPerSide: 8 });   // 33 points, closed
}
function localImages(f, z0, side, report, { withTruth = false, clampRadius = 40 } = {}) {
  const raw = f(z0); const fz0 = { re: raw.re, im: raw.im };               // f may return a bare real in principle; compile().f does not
  const sq = squareCurve(z0, side), { A, B } = report;
  const out = { fz0, ghost: [], A: [], B: [], image: [], truth: null };
  for (const p of sq.points) {
    const dz = { re: p.re - z0.re, im: p.im - z0.im };
    const a = mul(A, dz), b = mul(B, conj(dz));
    out.ghost.push({ re: fz0.re + dz.re, im: fz0.im + dz.im, t: p.t });
    out.A.push({ re: fz0.re + a.re, im: fz0.im + a.im, t: p.t });
    out.B.push({ re: fz0.re + b.re, im: fz0.im + b.im, t: p.t });
    out.image.push({ re: fz0.re + a.re + b.re, im: fz0.im + a.im + b.im, t: p.t });
  }
  if (withTruth) out.truth = pushForward(sq, f, { clampRadius });          // pieces; may be several, never throws
  return out;
}
```

Facts the test pins (section 6): with `B = 0` the `A` and `image` arrays are identical; the `B` array collapses onto `fz0`; the `A` array corner at t = 0 for `exp` at 0.5 + 0.8i with side 0.3 is `1.153782 + 0.833011i`.

**C-5 `wViewFor(report, side, fz0)`**

```
if (!report.finite || !Number.isFinite(fz0.re) || !Number.isFinite(fz0.im)) return null;
const S = Math.max(1, report.absA + report.absB);
return { center: { re: fz0.re, im: fz0.im }, unitsAcross: clamp(5 * side * S, 0.01, 1e6) };
```

**C-5b `keepAxesClear(view, size)`** (fix round)

The view above is centred on f(z₀), so for exp at 0.5 + 0.8i the v axis (Re w = 0) falls 15 px from the left edge and the u axis (Im w = 0) 9 px from the bottom edge, exactly where plane.js prints the v tick numbers (a column at the left) and the u tick numbers (a row along the bottom): the axis line struck through them ("0:4"). For a negative imaginary part the u axis lands near the top and strikes the axis names `u` and `v` instead. `keepAxesClear` moves the centre (never the zoom) by just enough that an axis that is inside the view is at least `AXIS_CLEAR` px from the nearest edge (left 36, right 20, top 22, bottom 22); an axis outside the view needs nothing. The shift is at most 36 px horizontally and 22 px vertically. `recompute` calls `wplane.setView(keepAxesClear(view, wplane.getSize()))` and keeps `view` as `intendedView`; a `viewchange` listener with `reason === 'resize'` re-applies it to `intendedView` when the plane is resized (the plane reports a nominal size before it is measured). The plane owner is also asked to knock tick labels out near an edge (10.2), which would make this a belt and braces measure.

Why: the image of a square of side h has every point within `(|A| + |B|) h / sqrt(2)` of its centre, which is below a quarter of `5 h S`; the dashed ghost (side h) stays visible when S ≥ 1 and the image is smaller than the ghost when S < 1.

**C-6 Drawing layers** (creation order matters: the first ramped `addCurve` on a plane sets the legend pill colour and layers with equal `order` draw in creation order)

*z-plane*:

1. `zSquare = zplane.addCurve({ id: 'square', points: squareCurve(state.z0, state.side).points, color: '--input', ramp: true, width: 2, dots: true, arrow: true, closed: true, order: 100 })`.
2. `zplane.addLayer((ctx, pl) => { drawCartAddress(ctx, pl, state.z0); }, { order: 30 })`.
3. The handle `z0` (`addPoint({ id: 'z0', z: state.z0, label: 'z0', color: '--input', step: 0.1, onDrag: onHandleDrag })`).

*w-plane* (`interactive: false`, `grid: 'cart'`, `axisLabels: ['u', 'v']`, `minUnitsAcross: 0.01`, `maxUnitsAcross: 1e6`, `maxWidth: 560`). In the layers below, `c` means `parts.fz0` and `view` means `pl.getView()`:

1. `wImage = wplane.addCurve({ id: 'image', points: [], color: '--output', ramp: true, width: 4, dots: true, arrow: true, closed: true, order: 100 })`, created **first** (its points arrive with the first `recompute`).
2. Layer `order: 20` (under the image), draws in this order:
   - the ghost square: `drawPolygonFill(ctx, pl, parts.ghost, { color: '--input', alpha: 0.06 })`, then `drawTimedCurve(ctx, pl, parts.ghost, { color: '--input', width: 1.5, dash: DASH.guide, dots: false, arrow: false, ramp: false, closed: true, alpha: 0.85 })`;
   - when `state.showTrue` and `parts.truth`: for each piece, `drawTimedCurve(ctx, pl, piece.points, { color: '--text-muted', width: 1.25, dash: [2, 3], dots: false, arrow: false, ramp: false, closed: !!piece.closed })`;
   - when `state.fnId === 'const-u'`: the line Re w = c: `v = pl.getView(), sz = pl.getSize(), halfH = (v.unitsAcross / 2) * sz.h / sz.w`; `drawSegment(ctx, pl, { re: c, im: v.center.im - halfH }, { re: c, im: v.center.im + halfH }, { color: '--seam', dash: DASH.guide, width: 1.5 })` and `drawLabel(ctx, pl, { re: c, im: v.center.im + 0.85 * halfH }, 'Re w = ' + fmtNum(c), { color: '--text-muted', dx: 6, dy: 0 })`.
3. Layer `order: 110` (above the image):
   - the A part: `drawPolygonFill(ctx, pl, parts.A, { color: '--polar', alpha: 0.10 })`, then `drawTimedCurve(ctx, pl, parts.A, { color: '--polar', width: 1.5, dots: false, arrow: false, ramp: false, closed: true, alpha: 0.95 })` (skipped when `report.absA < ZERO_EPS`);
   - the B part, only when `report.absB >= B_VISIBLE`: `drawTimedCurve(ctx, pl, parts.B, { color: '--danger', width: 2, dash: DASH.excluded, dots: false, arrow: false, ramp: false, closed: true })`;
   - when both A and B are below their thresholds the image is a point: `drawDot(ctx, pl, parts.fz0, { color: '--output', radius: 4 })`;
   - the spin arc, when `report.spin !== null`: `R = 0.30 * view.unitsAcross`; `drawSegment(ctx, pl, c, { re: c.re + R, im: c.im }, { color: '--polar', dash: DASH.guide, width: 1 })` (the reference direction); if `Math.abs(report.spin) > 0.02` `drawArc(ctx, pl, c, R, 0, report.spin, { color: '--polar', arrow: true, width: 2.5 })`; then **one** ghost winding that turns the same way: `end = report.spin + (report.spin >= 0 ? 2 : -2) * Math.PI`, drawn at radius `1.12 * R` with `ctx.save(); ctx.globalAlpha = ghostAlpha; drawArc(ctx, pl, c, 1.12 * R, 0, end, { color: '--polar', arrow: false, width: 1.25 }); ctx.restore();` (`ghostAlpha = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ghost-alpha')) || 0.35`) (built as a polyline, see the build notes). Then the two labels, one block anchored at `mid = c + R (cos(spin/2), sin(spin/2))`: `drawLabel(ctx, pl, mid, 'Arg A = ' + fmtNum(report.spin), { color: '--polar', dx: 6, dy: -6 })` and `drawLabel(ctx, pl, mid, 'also ' + fmtNum(end), { color: '--polar', dx: 6, dy: 8 })`. The arc is `Arg A` (one number); the ghost is another name of arg A.
4. Updates go through `zSquare.update(points)` and `wImage.update(points)`; the two plain layers read `parts`, `report` and `state` live.

**C-7 Text builders** (all exported except the DOM writers)

*Readout* (`crReadout`) and *lines* (`crLines`) are exactly as in section 4.3. The readout's pieces: `A = <fmtCart A>`, `|B| = <fixed3 absB>`, `CR holds: yes|no`, then `f'(z0) = <fmtCart fprime> (u_x + i v_x)` or `f' does not exist here`. When the report is not finite: `A = undefined; |B| = undefined; CR holds: no; f' does not exist here`. The two lines write `fmtNum(-jac.vx)` for the "−v_x" side (never `-0`), and the residual with `fixed3`.

*Badge and attributes*: `cr1El.dataset.holds = report.holds1 ? 'yes' : 'no'`, same for `cr2El` with `holds2`; each line is the `<line text>`, a space, then `span.badge[data-answer]` whose text is `holds` or `fails`; the station's style block draws `data-answer="yes"` with a solid `--ok` border and `"no"` with a dashed `--text-muted` border. The line text is its own text node, so `textContent` of `#cauchy-riemann-cr1` **starts with** the line text.

*Verdict* (`crVerdict(fnId, report, z0)`): by function id, a single sentence (ASCII apostrophes and `|z|^2`, so tests can match):

- `exp`: holds → `CR holds at every point, and the partials are continuous, so f is entire. f'(z) = u_x + i v_x = e^x cos y + i e^x sin y = f(z).`
- `sq-plus-z`: holds → `CR holds at every point, so f is entire. f'(z) = u_x + i v_x = (2x + 1) + 2y i = 2z + 1.`
- `conj`: `CR fails at every point: u_x = 1 but v_y = -1. conj z is a pure mirror (A = 0, B = 1), so it is differentiable nowhere.`
- `re`: `CR fails at every point: u_x = 1 but v_y = 0. Re z squashes the plane onto a line (A = B = 1/2), so it is differentiable nowhere.`
- `abs2`: if `abs(z0) < ZERO_EPS`: `At z0 = 0 both equations hold: f'(0) = 0. But they hold at no other point, so there is no disk around 0 where f is differentiable: |z|^2 is differentiable at 0 and analytic nowhere.` else: `CR fails here: it needs u_x = 2x = 0 and u_y = 2y = 0, so x = 0 and y = 0. It holds only at z = 0, so |z|^2 is differentiable only at 0 and analytic nowhere.`
- `const-u`: `report.holds ? 'CR holds at this point: both tests read 0 = 0.' : 'CR fails at this point, so f has no derivative here.'` (the long sentence lives in the const-status line).
- If `!report.finite` for any function: `f is not defined near this point, so there is nothing to test.`

*Const status* (`constStatus(report, c, vAtZ0, everywhere)`; `everywhere` is true when CR holds at all 25 points of {−2..2}²; `vAtZ0 = state.f(z0).im`):

- holds and everywhere: `With u = <c> we get u_x = u_y = 0. CR then forces v_x = v_y = 0, so f' = 0 and f is constant. Your v does that everywhere: f = <fmtCart({re: c, im: vAtZ0})>, a constant.`
- holds, not everywhere: `CR holds at this z0, but not at every point (drag z0 to see it fail). An entire f needs CR everywhere. There, u_x = u_y = 0 forces v_x = v_y = 0, so f' = 0 and f is constant. This v is not constant, so this f is not entire.`
- fails: `With u = <c> we get u_x = u_y = 0, so CR would force v_x = v_y = 0, f' = 0 and f constant. This v has v_x = <fmtNum vx> and v_y = <fmtNum vy> here, so CR fails: no entire function has this u and this v.`
- not finite: `v has no value at this point. Drag z0 somewhere else.` plus nothing else (the only case where the two substrings are not required).

`<c>` is `fmtNum(c)`.

*Move line* (`#cauchy-riemann-move`):

```
if (!report.finite) text = 'f is not defined near this point.';
else if (report.spin === null) text = 'A is 0: the spin and stretch part has collapsed to a point.' + (report.absB >= B_VISIBLE ? ' The mirror part B has size |B| = ' + fixed3(report.absB) + '.' : '');
else text = 'A spins the square by Arg A = ' + fmtNum(report.spin) + ' rad (' + fmtNum(report.spin * 180 / Math.PI, 1) + ' degrees) and stretches it by |A| = ' + fixed3(report.absA)
          + '. Every name ' + fmtNum(report.spin) + ' + 2πk spins it the same way; Arg A is the one in (−π, π].'
          + (report.absB >= B_VISIBLE ? ' The mirror part B has size |B| = ' + fixed3(report.absB) + '.' : ' There is no mirror part.');
```

*Proof list* (const-u only), `#cauchy-riemann-proof-1..4`: item text and `data-ok`:

1. `u = c, so u_x = 0 and u_y = 0. At z0: u_x = 0, u_y = 0.` → `yes` always.
2. `Cauchy–Riemann says v_y = u_x and v_x = −u_y, so v_y = 0 and v_x = 0.` + (holds ? `` : ` Your v has v_x = <fmtNum vx>, v_y = <fmtNum vy> here, so it breaks this line.`) → `yes` iff `report.holds`.
3. `Then f′ = u_x + i v_x = 0.` → `yes` iff `report.holds`.
4. `f′ = 0 on a domain (the whole plane), so f is constant (Theorem 3.2.13).` → `yes` iff `report.holds && everywhere`.

Each `li` shows a leading mark drawn by CSS from `data-ok` (a filled circle for `yes`, an empty dashed ring for `no`), never colour alone.

*Jacobian cells*: for `key` in `ux, uy, vx, vy`: `td.dataset.value = numTextOf(report.jac[key])` (`fmtNum`, or `undefined`); the `span.cr-num` shows that text; `span.cr-sym` shows `tex(span, key[0] + '_' + key[1] + ' = ' + (CR_FUNCTIONS[fnId].partials[key] ?? '\\text{numeric}'))`, re-rendered only when the function changes (cache key `fnId`).

*Captions*: `#cauchy-riemann-wcap`: `w-plane, zoomed on f(z₀) = <fmtCart fz0>. One grid square is <niceGridStep(view.unitsAcross)> wide. The dashed square keeps its original size, so you can see the spin and the stretch.`

*Key list*: items `ghost`, `A` (only if `absA >= ZERO_EPS`), `B` (only if `absB >= B_VISIBLE`), `image`, `truth` (only if `showTrue`), each `li` with a `span.cr-swatch[data-kind]` styled by the same stroke (ghost: dashed `--input`; A: solid `--polar`; B: dashed `--danger`; image: solid thick `--output`; truth: dotted `--text-muted`).

**C-8 Explainers**

*`cauchy-riemann-ab`* (default columns, caption "A and B in both addresses"):

```
const texPolarDec = (z) => {                 // r e^{i theta} with a decimal r and an exact-or-decimal angle (never a fraction for r: 10.4.5)
  const p = toPolar(z), R = fmtNum(p.r);
  if (R === '0') return '0';
  const T = texAngle(p.theta);
  if (T === '0') return R;
  const neg = T[0] === '-', absT = neg ? T.slice(1) : T, sp = /^\d/.test(absT) ? '\\,' : '';
  const e = `e^{${neg ? '-' : ''}i${sp}${absT}}`;
  return R === '1' ? e : `${R}\\,${e}`;
};
rows = [
  { id: 'A', label: 'A (spin and stretch)', native: 'polar',
    cart:  (s) => cart(String.raw`A = \dfrac{(u_x+v_y)+i\,(v_x-u_y)}{2} = ${cxTex(s.r.A)}`),
    polar: (s) => polar(s.r.absA < ZERO_EPS ? 'A = 0' : String.raw`A = |A|\,e^{i\,\mathrm{Arg}A} = ${texPolarDec(s.r.A)}`) },
  { id: 'B', label: 'B (mirror)', native: 'cart',
    cart:  (s) => cart(String.raw`B = \dfrac{(u_x-v_y)+i\,(v_x+u_y)}{2} = ${cxTex(s.r.B)}`),
    polar: (s) => polar(s.r.absB < ZERO_EPS ? 'B = 0' : String.raw`B = |B|\,e^{i\,\mathrm{Arg}B} = ${texPolarDec(s.r.B)}`) },
  { id: 'fprime', label: 'f′(z₀)', native: 'cart',
    cart:  (s) => cart(s.r.fprime ? String.raw`f'(z_0) = u_x + i\,v_x = ${cxTex(s.r.fprime)}` : String.raw`f'(z_0)\ \text{does not exist}`),
    polar: (s) => polar(!s.r.fprime ? String.raw`f'(z_0)\ \text{does not exist}`
                        : abs(s.r.fprime) < ZERO_EPS ? String.raw`f'(z_0) = 0`
                        : String.raw`f'(z_0) = |f'|\,e^{i\,\mathrm{Arg}f'} = ${texPolarDec(s.r.fprime)}`) },
];
same = (s) => ({ cart: cart(String.raw`A = ${cxTex(s.r.A)}`),
                 polar: polar(s.r.absA < ZERO_EPS ? 'A = 0' : String.raw`${texPolarDec(s.r.A)} = ${cxTex(fromPolar(s.r.absA, s.r.spin))}`),
                 agree: s.r.finite ? true : null });
```

The state handed to `update` is `{ r: report }` (plus anything else the rows need). The `same` row shows the Euler dictionary at work: the polar address of A converted back to Cartesian is A.

*`cauchy-riemann-ex`* (the two paths; columns `dx` and `dy`, both tone `--cart`; caption "Two paths, one limit"):

```
columns = [ { key: 'dx', heading: 'Along Δx (horizontal)', tone: '--cart' }, { key: 'dy', heading: 'Along iΔy (vertical)', tone: '--cart' } ];
const dxv = (r) => clean({ re: r.jac.ux, im: r.jac.vx });          // u_x + i v_x
const dyv = (r) => clean({ re: r.jac.vy, im: -r.jac.uy });         // v_y - i u_y
rows = [
  { id: 'step',  label: 'Step',     dx: () => cart(String.raw`\Delta z = \Delta x`), dy: () => cart(String.raw`\Delta z = i\,\Delta y`) },
  { id: 'quot',  label: 'Quotient', dx: () => cart(String.raw`\dfrac{f(z_0+\Delta x)-f(z_0)}{\Delta x}\ \to\ u_x+i\,v_x`),
                                   dy: () => cart(String.raw`\dfrac{f(z_0+i\Delta y)-f(z_0)}{i\,\Delta y}\ \to\ v_y-i\,u_y`) },
  { id: 'limit', label: 'At z₀',    dx: (s) => cart(String.raw`u_x+i\,v_x = ${cxTex(dxv(s.r))}`),
                                   dy: (s) => cart(String.raw`v_y-i\,u_y = ${cxTex(dyv(s.r))}`) },
];
same = (s) => ({ dx: cart(cxTex(dxv(s.r))), dy: cart(cxTex(dyv(s.r))), agree: s.r.finite ? s.r.holds : null });
```

The footer verdict is `agree` exactly when `report.holds` (both residuals below 1e-3), so it is `differ` for `u = c` with v = x + y at any z₀ and `agree` for `exp` at any z₀. Both explainers are updated on every `recompute`; the paths one is flushed (`flush()`) when its panel is opened.

**C-9 DOM and planes**

1. Order inside `el`: `buildHeader`, `problemBox` (`aside.callout#cauchy-riemann-problem`), fn panel (chips group, note, `#cauchy-riemann-constu`), `div.cr-main` (two `div.panel`s: z-plane figure, then the `h` slider row and the hint; w-plane figure with `figcaption#cauchy-riemann-wcap` as its last child, then the key list and the checkbox; each figure is only the plane and its caption), `div.cr-two` (Jacobian panel; tests panel with `cr1`, `cr2`, `verdict`), `div.readout#cauchy-riemann-readout`, `p#cauchy-riemann-move`, panel with the `ab` explainer, `button#cauchy-riemann-paths` and its panel with the `ex` explainer, `aside#cauchy-riemann-polar-note`, `section#cauchy-riemann-proof-panel`, `buildStationLinks`.
2. Planes:

```
zplane = createPlane(zHost, { id: 'cauchy-riemann-zplane', xRange: [-2, 2], yRange: [-2, 2], grid: 'cart', axisLabels: ['x', 'y'], maxWidth: 560,
                              ariaLabel: 'z-plane. Drag the point z0.' });
wplane = createPlane(wHost, { id: 'cauchy-riemann-wplane', xRange: [-1, 1], yRange: [-1, 1], grid: 'cart', axisLabels: ['u', 'v'], maxWidth: 560,
                              interactive: false, minUnitsAcross: 0.01, maxUnitsAcross: 1e6, ariaLabel: 'w-plane, zoomed on f of z0' });
handle = zplane.addPoint({ id: 'z0', z: state.z0, label: 'z0', color: '--input', step: 0.1, onDrag: onHandleDrag });
```

3. The slider: `input` → `state.side = Number(slider.value); out.textContent = state.side.toFixed(2); recompute('side')`. The checkbox: `change` → `state.showTrue = checkbox.checked; recompute('true')`.
4. The Jacobian table (ids are the test hooks; the number span comes **first** so `textContent` starts with the number):

```
<table class="cr-jac" id="cauchy-riemann-jac">
  <caption>The Jacobian at z₀</caption>
  <thead><tr><td></td><th scope="col">∂/∂x</th><th scope="col">∂/∂y</th></tr></thead>
  <tbody>
    <tr><th scope="row">u</th>
        <td id="cauchy-riemann-ux" data-value="1.149"><span class="cr-num cr-cart">1.149</span><span class="cr-sym cr-cart">u_x = e^x cos y (rendered by tex())</span></td>
        <td id="cauchy-riemann-uy" data-value="-1.183">…</td></tr>
    <tr><th scope="row">v</th>
        <td id="cauchy-riemann-vx" data-value="1.183">…</td>
        <td id="cauchy-riemann-vy" data-value="1.149">…</td></tr>
  </tbody>
</table>
```

   Bracket marks at the left and right of the numeric block come from CSS borders on the first and last cells; the table is `table-layout: fixed; width: 100%`.
5. `#cauchy-riemann-constu` (`div.panel[hidden]` unless `const-u`): `h3` "Choose u and v"; `div.field` with `label[for=cauchy-riemann-c]` "c (the constant u)" and `input#cauchy-riemann-c[type=number][step=any][value=2]`; `div.field` with `label[for=cauchy-riemann-v]` "v(x, y)" and `input#cauchy-riemann-v[type=text][value="x + y"][spellcheck=false][autocomplete=off]`; `div.chips` with the four `vpreset` chips; `div#cauchy-riemann-v-error[role=alert][hidden]`; `p#cauchy-riemann-const-status`. The proof panel `section#cauchy-riemann-proof-panel[hidden]` holds `ol#cauchy-riemann-proof` with four `li#cauchy-riemann-proof-1 .. -4`.
6. The key list `ul#cauchy-riemann-key` is rebuilt (cheap, four items) inside `writeText` only when the set of visible items changes.

**C-10 `recompute(reason)`** (the one update path; called on mount, fn change, drag, slider, checkbox, v and c edits)

```
function recompute(reason) {
  if (destroyed) return;
  const f = state.f, z0 = state.z0;
  report = crReport(f, z0);
  const raw = f(z0);
  const fz0 = { re: raw.re, im: raw.im };
  const view = wViewFor(report, state.side, fz0);
  const U = view ? view.unitsAcross : wplane.getView().unitsAcross;
  const clampRadius = Math.max(40, 3 * U + (Math.hypot(fz0.re, fz0.im) || 0));
  parts = localImages(f, z0, state.side, report, { withTruth: state.showTrue, clampRadius });
  if (view) { intendedView = view; wplane.setView(keepAxesClear(view, wplane.getSize())); }   // no-op when unchanged; emits viewchange (the plane redraws itself); C-5b
  zSquare.update(squareCurve(z0, state.side).points);
  wImage.update(parts.image);
  if (state.fnId === 'const-u') everywhere = checkEverywhere(f);          // 25 points; only when f changed (reason 'fn', 'v', 'c'), cached otherwise
  writeText(report, fz0);                             // readout, cr lines, badges, verdict, move line, captions, Jacobian, key, const status, proof
  exAB.update({ r: report }); exPaths.update({ r: report });
  zplane.requestDraw(); wplane.requestDraw();
  mv.cauchyRiemann is read lazily (state(), parts() closures over the live variables).
}
```

`checkEverywhere(f)`: `for x of [-2,-1,0,1,2] for y of [-2,-1,0,1,2]: if (!crReport(f, {re: x, im: y}).holds) return false; return true;`. It runs once per function, v or c change, not on drags.

**C-11 Paths toggle**: `btn.addEventListener('click', () => { state.paths = !state.paths; panel.hidden = !state.paths; btn.setAttribute('aria-expanded', String(state.paths)); btn.textContent = state.paths ? 'Hide the two paths' : 'Show how the equations come from two paths'; if (state.paths) exPaths.flush(); });` starts closed (`state.paths = false`, `panel.hidden = true`, `aria-expanded="false"`).

**C-12 Teardown**: section 4.5.

---

## 6. Mathematics

Everything here is hand-derived first and then checked numerically against `complex.js` and `parse.js` (Node 22). Each value is a unit-test expectation (tolerance 1e-9 unless noted; the finite-difference values of the CR station use 1e-6, the readout strings are compared exactly).

### 6.1 Formulas used

**Two addresses of z.** z = x + iy = r e^{iθ}; x = r cos θ, y = r sin θ; r = √(x² + y²); θ ∈ arg z = { Arg z + 2πk : k ∈ ℤ }; Arg z ∈ (−π, π]. A function f has a Cartesian form u(x, y) + iv(x, y) and a polar form u(r, θ) + iv(r, θ); the polar form must give the same u, v for every θ ∈ arg z, because it is a formula for the value at the **point**.

**Double angle** (the bridge between the two forms for z²): cos 2θ = (x² − y²)/r², sin 2θ = 2xy/r².

**Local linear form** (complex.js `localLinear`): with f_x = u_x + i v_x and f_y = u_y + i v_y, and Δx = (Δz + conj Δz)/2, Δy = (Δz − conj Δz)/(2i):

Δw ≈ f_x Δx + f_y Δy = A Δz + B conj(Δz), A = ½(f_x − i f_y) = ½[(u_x + v_y) + i(v_x − u_y)], B = ½(f_x + i f_y) = ½[(u_x − v_y) + i(v_x + u_y)].

**B = 0 ⇔ CR.** B = 0 means u_x − v_y = 0 and v_x + u_y = 0, that is u_x = v_y and u_y = −v_x. Then A = u_x + i v_x = v_y − i u_y = f′(z₀). The Jacobian [[u_x, u_y], [v_x, v_y]] is then [[a, −b], [b, a]] with a = u_x, b = v_x, which is "multiply by a + ib": spin by Arg(a + ib), stretch by |a + ib|.

**Two paths.** Δz = Δx (so conj Δz = Δz): the quotient tends to A + B = f_x = u_x + i v_x. Δz = iΔy (so conj Δz = −Δz): it tends to A − B = −i f_y = v_y − i u_y. Equal iff B = 0.

**Images of the tiny square** (side h, corners z₀ ± h/2 ± ih/2, dz = z − z₀): the A part is f(z₀) + A dz (a square, same orientation, side |A|h, turned by Arg A); the B part is f(z₀) + B conj(dz) (a square of side |B|h, **reversed orientation**, because conj reverses it); the image is their sum f(z₀) + A dz + B conj(dz), a parallelogram. The spin of the A part is Arg A (one number); any Arg A + 2πk turns it identically.

**Tolerances in the station**: CR holds iff both residuals |u_x − v_y| and |u_y + v_x| are below 10⁻³ (finite differences with h = 10⁻⁵ have errors below 10⁻⁹ for these functions); a complex number below 10⁻⁹ in modulus is zero (no direction).

### 6.2 Problem 2.1.1: f(z) = z² + iz as u + iv, in both addresses

**Cartesian (the slide view, native for the sum).** Put z = x + iy.

- z² = (x + iy)² = x² + 2ixy + i²y² = (x² − y²) + i(2xy).
- iz = i(x + iy) = ix + i²y = −y + ix.
- Add: f(z) = (x² − y² − y) + i(2xy + x).

So **u = x² − y² − y** and **v = 2xy + x**.

**Polar (the move view, native for each term).** Put z = r e^{iθ}.

- z² = r² e^{2iθ} = r²(cos 2θ + i sin 2θ).
- i = e^{iπ/2}, so iz = r e^{i(θ + π/2)} = r(cos(θ + π/2) + i sin(θ + π/2)) = r(−sin θ + i cos θ).
- Add: f(z) = (r² cos 2θ − r sin θ) + i(r² sin 2θ + r cos θ).

So **u = r² cos 2θ − r sin θ** and **v = r² sin 2θ + r cos θ**.

**They are the same function.** x² − y² = r² cos 2θ, 2xy = r² sin 2θ, y = r sin θ, x = r cos θ. Every θ + 2πk gives the same cos 2θ, sin 2θ, sin θ, cos θ, hence the same u, v: the polar form is valid on every name of arg z (the staircase pick).

**Which address is easy?** z² and iz are each one move (polar: double the angle and square the length; add a quarter turn), but the **+** between them is a slide (Cartesian). That is why the problem asks for both and why neither column is badged "native" for the `sq-plus-iz` expand row.

**Hand-checked values** (u, v by the Cartesian formula; by the polar formula with θ = Arg z and, in brackets, with another name):

| z | (x, y) | r | Arg z | u | v | w = u + iv | direct check |
|---|---|---|---|---|---|---|---|
| 1 + i | (1, 1) | √2 = 1.414213562 | π/4 | 1 − 1 − 1 = **−1** | 2 + 1 = **3** | **−1 + 3i** | (1+i)² = 2i; i(1+i) = −1 + i; sum −1 + 3i. Polar: r² = 2, cos(π/2) = 0, sin(π/2) = 1, sin(π/4) = cos(π/4) = √2/2: u = 0 − √2·√2/2 = −1; v = 2 + √2·√2/2 = 3. (k = 1: θ = 9π/4, same.) |
| i | (0, 1) | 1 | π/2 | 0 − 1 − 1 = **−2** | 0 + 0 = **0** | **−2** | i² + i·i = −1 − 1 = −2. Polar: cos π = −1, sin(π/2) = 1: u = −1 − 1 = −2; sin π = 0, cos(π/2) = 0: v = 0. (A2: drag to i gives w = −2.) |
| 2 − i | (2, −1) | √5 = 2.236067977 | −0.4636476090 | 4 − 1 + 1 = **4** | −4 + 2 = **−2** | **4 − 2i** | (2−i)² = 3 − 4i; i(2−i) = 1 + 2i; sum 4 − 2i. Polar: cos 2θ = 3/5, sin 2θ = −4/5, sin θ = −1/√5, cos θ = 2/√5: u = 5·(3/5) − √5·(−1/√5) = 3 + 1 = 4; v = 5·(−4/5) + √5·(2/√5) = −4 + 2 = −2. |
| −1 | (−1, 0) | 1 | π (never −π) | 1 − 0 − 0 = **1** | 0 − 1 = **−1** | **1 − i** | (−1)² + i(−1) = 1 − i. Polar: θ = π: cos 2π = 1, sin π = 0: u = 1; sin 2π = 0, cos π = −1: v = −1. Name −π or 3π: same to 1e-15. |
| −1 + i | (−1, 1) | √2 | 3π/4 | 1 − 1 − 1 = **−1** | −2 − 1 = **−3** | **−1 − 3i** | (−1+i)² = −2i; i(−1+i) = −1 − i; sum −1 − 3i. Polar: cos(3π/2) = 0, sin(3π/4) = √2/2: u = 0 − 1 = −1; sin(3π/2) = −1, cos(3π/4) = −√2/2: v = −2 − 1 = −3. |
| 0.3 + 0.4i | (0.3, 0.4) | 0.5 | 0.9272952180016123 | 0.09 − 0.16 − 0.4 = **−0.47** | 0.24 + 0.3 = **0.54** | **−0.47 + 0.54i** | cos 2θ = −0.28, sin 2θ = 0.96, sin θ = 0.8, cos θ = 0.6: u = 0.25(−0.28) − 0.5(0.8) = −0.07 − 0.4 = −0.47; v = 0.25(0.96) + 0.5(0.6) = 0.24 + 0.3 = 0.54. |
| 0 | (0, 0) | 0 | (none; Arg 0 = 0 by convention) | **0** | **0** | **0** | f(0) = 0. |

### 6.3 The other four chips of `mappings` (values for the unit tests)

All are checked by the same pair of formulas as in `UV` (section 5.3, M-2). u + iv:

| fn | formula | u(x, y), v(x, y) | u(r, θ), v(r, θ) | z = i | z = 1 + i | z = 2 − i |
|---|---|---|---|---|---|---|
| `sq` | z² | x² − y², 2xy | r² cos 2θ, r² sin 2θ | **−1** | **2i** | **3 − 4i** |
| `linear-i` | iz − 2i = i(z − 2) | −y, x − 2 | −r sin θ, r cos θ − 2 | **−1 − 2i** | **−1 − i** | **1** |
| `recip` | 1/z = conj z / \|z\|² | x/(x² + y²), −y/(x² + y²) | cos θ / r, −sin θ / r | **−i** | **0.5 − 0.5i** | **0.4 + 0.2i** |
| `conj` | conj z | x, −y | r cos θ, −r sin θ | **−i** | **1 − i** | **2 + i** |

Hand checks: `sq` at 2 − i: (2−i)² = 4 − 4i + i² = 3 − 4i. `linear-i` at 2 − i: i(2−i) − 2i = 2i + 1 − 2i = 1; polar: −r sin θ = −√5·(−1/√5) = 1, r cos θ − 2 = 2 − 2 = 0. `recip` at 2 − i: (2 + i)/5 = 0.4 + 0.2i; polar: cos θ / r = (2/√5)/√5 = 2/5, −sin θ / r = (1/√5)/√5 = 1/5. `recip` at 0 is the pole (NaN pair, `pole = true`, `agree = null`). Polar-native functions (the story): `sq` and `recip` carry circles to circles (r ↦ r², r ↦ 1/r) and rays to rays (θ ↦ 2θ, θ ↦ −θ); `linear-i` is a turn by π/2 and a slide by −2i; `conj` is a mirror.

### 6.4 Problem 3.2.1: f(z) = e^x(cos y + i sin y) is entire; f′

**Cartesian (native: CR is stated in x, y).**

- u = e^x cos y, v = e^x sin y.
- u_x = e^x cos y, u_y = −e^x sin y, v_x = e^x sin y, v_y = e^x cos y.
- CR1: u_x = v_y (the same expression). CR2: u_y = −v_x: −e^x sin y = −(e^x sin y). Both hold at **every** point.
- All four partials are continuous on ℝ² (products and compositions of continuous functions), so by Thm 3.2.6 f is differentiable at every point: f is **entire** (Def 3.1.5).
- f′(z) = u_x + i v_x = e^x cos y + i e^x sin y = f(z). (Equivalently v_y − i u_y = e^x cos y + i e^x sin y.)

**Polar (the move view of the same fact).** |f| = e^x and a name of arg f is y (any y + 2πk): the Cartesian address (x, y) of z is the polar address (e^x, y) of w = f(z). Write f = e^{U + iV} with U = ln|f| = x and V = y a continuous choice of arg f. CR for (U, V): U_x = 1 = V_y and U_y = 0 = −V_x, so f′ = f·(U_x + iV_x) = f·(1 + 0i) = f. As a move: f′ = f spins by Arg f′ = y and stretches by |f′| = e^x.

**Hand-checked numbers at z₀ = 0.5 + 0.8i** (e^0.5 = 1.6487212707, cos 0.8 = 0.6967067093, sin 0.8 = 0.7173560909):

| quantity | value | check |
|---|---|---|
| u_x = v_y | **1.148675** (readout 1.149) | 1.6487212707 × 0.6967067093 |
| u_y = −v_x | **−1.182720** (readout −1.183) | −1.6487212707 × 0.7173560909 |
| residuals | 0.000, 0.000 (below 1e-10) | |
| f′(z₀) = u_x + i v_x | **1.148675 + 1.182720i**, readout `1.149 + 1.183i` | equals f(z₀) |
| A | 1.148675 + 1.18272i | f′ |
| B, \|B\| | 0, readout `0.000` | no mirror part |
| \|A\|, Arg A | 1.6487213 = e^0.5, **0.8** (45.8366 degrees) | A = e^{0.5} e^{0.8i} |

More points: z₀ = 0: f′ = 1 (u_x = 1, v_x = 0); z₀ = iπ/2: u_x = e⁰ cos(π/2) = 0, v_x = e⁰ sin(π/2) = 1, f′ = i = f(iπ/2) (the same check as `problems.js` `3.2.1.check`); z₀ = 1 + i: f′ = 1.468694 + 2.287355i (e cos 1, e sin 1 = 2.7182818 × 0.5403023 and × 0.8414710).

### 6.5 Problem P7: u ≡ c entire ⇒ f constant

**Cartesian.** u ≡ c ⇒ u_x = u_y = 0. CR: v_y = u_x = 0 and v_x = −u_y = 0. So f′ = u_x + i v_x = 0 everywhere on ℝ², a domain (open and connected), so f is constant (Thm 3.2.13); here v_x = v_y = 0 on a connected set makes v constant too: f ≡ c + i·(constant).

**Polar (the move view).** If f′(z₀) = ρ e^{iα} ≠ 0, a small disk around z₀ is spun by α and stretched by ρ: its image is a small disk, a two-dimensional blob. But u ≡ c puts every value on the vertical line Re w = c, which holds no blob. So ρ = 0 at every z₀: f′ ≡ 0, f constant. In the A/B picture: with u = c, A = ½(v_y + i v_x) and B = ½(−v_y + i v_x), and the image of any dz is A dz + B conj dz with real part ½[(v_y dx − v_x dy) + (−v_y dx + v_x dy)] = 0: the image of the square is always a **vertical segment on Re w = c**, never a blob. A spun-and-stretched square needs B = 0 and A ≠ 0; but B = 0 forces v_y = 0 and v_x = 0, and then A = 0 as well. So with u constant, B = 0 happens only when everything collapses to a point, which is exactly "f′ = 0".

**Hand-checked numbers (c = 2, z₀ = 0.5 + 0.8i):**

| v | (v_x, v_y) | CR1: u_x vs v_y | CR2: u_y vs −v_x | A | B, \|B\| | verdict |
|---|---|---|---|---|---|---|
| x + y | (1, 1) | 0 vs 1, residual 1 (fails) | 0 vs −1, residual 1 (fails) | 0.5 + 0.5i | −0.5 + 0.5i, 0.7071 | not analytic anywhere; image of the square is the segment u = 2, v from 1.0 to 1.6 |
| y | (0, 1) | 0 vs 1, residual 1 (fails) | 0 vs 0, residual 0 (holds) | 0.5 | −0.5, 0.5 | fails |
| x² | (2x, 0) = (1, 0) at z₀ | 0 vs 0 (holds) | 0 vs −1, residual 1 (fails) | 0.5i | 0.5i, 0.5 | fails here; CR2 needs v_x = 2x = 0, so it holds only on the line x = 0, not on a disk |
| 3 (a constant) | (0, 0) | 0 vs 0 (holds) | 0 vs 0 (holds) | 0 | 0, 0 | holds everywhere: f′ = 0, f = 2 + 3i, constant |

(v = x + y at z₀: f(z₀) = 2 + 1.3i; the image square corners at t = 0, ¼, ½, ¾, 1 are 2 + 1.0i, 2 + 1.3i, 2 + 1.6i, 2 + 1.3i, 2 + 1.0i: a segment traced up and back.)

### 6.6 The counter-examples on the chips (A3 and the verdict lines)

At z₀ = 0.5 + 0.8i unless stated. A, B from `localLinear`; the textbook partials in the second column.

| fn | (u_x, u_y, v_x, v_y) | CR1 (res) | CR2 (res) | A | B | \|B\| | holds | f′ |
|---|---|---|---|---|---|---|---|---|
| `exp` | (1.148675, −1.18272, 1.18272, 1.148675) | holds (0.000) | holds (0.000) | 1.149 + 1.183i | 0 | 0.000 | yes | 1.149 + 1.183i |
| `sq-plus-z` | (2x + 1, −2y, 2y, 2x + 1) = (2, −1.6, 1.6, 2) | holds | holds | 2 + 1.6i (= 2z₀ + 1) | 0 | 0.000 | yes | 2 + 1.6i |
| `conj` | (1, 0, 0, −1) | fails (2.000) | holds (0.000) | 0 | 1 | 1.000 | no | none |
| `re` | (1, 0, 0, 0) | fails (1.000) | holds (0.000) | 0.5 | 0.5 | 0.500 | no | none |
| `abs2` | (2x, 2y, 0, 0) = (1, 1.6, 0, 0) | fails (1.000) | fails (1.600) | 0.5 − 0.8i (= conj z₀) | 0.5 + 0.8i (= z₀) | 0.943 | no | none |
| `abs2` at 1 + i | (2, 2, 0, 0) | fails (2.000) | fails (2.000) | **1 − i** | 1 + i | **1.414** | no | none |
| `abs2` at 0 | (0, 0, 0, 0) | holds | holds | 0 | 0 | **0.000** | **yes** | **0** |
| `re` at 0 or anywhere | (1, 0, 0, 0) | fails (1.000) | holds | 0.5 | 0.5 | **0.500** | no | none |
| `conj` at 1 + i | (1, 0, 0, −1) | fails | holds | 0 | 1 | 1.000 | no | none |
| `exp` at 0 | (1, 0, 0, 1) | holds | holds | 1 | 0 | 0.000 | yes | 1 |
| `sq-plus-z` at 1 + i | (3, −2, 2, 3) | holds | holds | 3 + 2i | 0 | 0.000 | yes | 3 + 2i (the `derivativeAt` of problem 3.1.1) |

Derivations: |z|² = z·conj z has ∂f/∂z = conj z = A and ∂f/∂conj z = z = B (STORY). Re z = (z + conj z)/2, A = B = ½. conj z: A = 0, B = 1. Because the mirror part has size |B|: conj z is all mirror, Re z is half spin-and-stretch plus half mirror (it squashes), |z|² has a mirror part of size |z|, which is 0 only at z = 0 (so CR holds only there: differentiable at 0, analytic nowhere).

### 6.7 Exact strings (unit-test expectations)

`crReadout(crReport(f, z0))`:

| function, z₀ | string |
|---|---|
| exp, 0.5 + 0.8i | `A = 1.149 + 1.183i; \|B\| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)` |
| sq-plus-z, 0.5 + 0.8i | `A = 2 + 1.6i; \|B\| = 0.000; CR holds: yes; f'(z0) = 2 + 1.6i (u_x + i v_x)` |
| conj, 0.5 + 0.8i | `A = 0; \|B\| = 1.000; CR holds: no; f' does not exist here` |
| re, 0.5 + 0.8i | `A = 0.5; \|B\| = 0.500; CR holds: no; f' does not exist here` |
| abs2, 0.5 + 0.8i | `A = 0.5 - 0.8i; \|B\| = 0.943; CR holds: no; f' does not exist here` |
| abs2, 1 + i | `A = 1 - i; \|B\| = 1.414; CR holds: no; f' does not exist here` |
| abs2, 0 | `A = 0; \|B\| = 0.000; CR holds: yes; f'(z0) = 0 (u_x + i v_x)` |
| re, 0 | `A = 0.5; \|B\| = 0.500; CR holds: no; f' does not exist here` |
| const-u (c = 2, v = x + y), 0.5 + 0.8i | `A = 0.5 + 0.5i; \|B\| = 0.707; CR holds: no; f' does not exist here` |
| const-u (v = 3), 0.5 + 0.8i | `A = 0; \|B\| = 0.000; CR holds: yes; f'(z0) = 0 (u_x + i v_x)` |
| const-u (v = x^2), 0.5 + 0.8i | `A = 0.5i; \|B\| = 0.500; CR holds: no; f' does not exist here` |
| const-u (v = y), 0.5 + 0.8i | `A = 0.5; \|B\| = 0.500; CR holds: no; f' does not exist here` |

(`|B|` is the literal two characters pipe-B-pipe; the backslashes above only protect the Markdown table.)

`crLines`:

| function, z₀ | cr1 | cr2 |
|---|---|---|
| exp, 0.5 + 0.8i | `u_x = v_y: 1.149 vs 1.149, residual 0.000` | `u_y = -v_x: -1.183 vs -1.183, residual 0.000` |
| sq-plus-z, 0.5 + 0.8i | `u_x = v_y: 2 vs 2, residual 0.000` | `u_y = -v_x: -1.6 vs -1.6, residual 0.000` |
| conj, 0.5 + 0.8i | `u_x = v_y: 1 vs -1, residual 2.000` | `u_y = -v_x: 0 vs 0, residual 0.000` |
| re, 0.5 + 0.8i | `u_x = v_y: 1 vs 0, residual 1.000` | `u_y = -v_x: 0 vs 0, residual 0.000` |
| abs2, 0.5 + 0.8i | `u_x = v_y: 1 vs 0, residual 1.000` | `u_y = -v_x: 1.6 vs 0, residual 1.600` |
| abs2, 1 + i | `u_x = v_y: 2 vs 0, residual 2.000` | `u_y = -v_x: 2 vs 0, residual 2.000` |
| abs2, 0 | `u_x = v_y: 0 vs 0, residual 0.000` | `u_y = -v_x: 0 vs 0, residual 0.000` |
| const-u (v = x + y), 0.5 + 0.8i | `u_x = v_y: 0 vs 1, residual 1.000` | `u_y = -v_x: 0 vs -1, residual 1.000` |

`mappingReadout(fnId, z)`:

| fn, z | string |
|---|---|
| sq-plus-iz, 1 + i | `z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3` |
| sq-plus-iz, i | `z = i; w = -2; u = -2; v = 0; polar: u = -2; v = 0` |
| sq, i | `z = i; w = -1; u = -1; v = 0; polar: u = -1; v = 0` |
| linear-i, i | `z = i; w = -1 - 2i; u = -1; v = -2; polar: u = -1; v = -2` |
| recip, i | `z = i; w = -i; u = 0; v = -1; polar: u = 0; v = -1` |
| conj, i | `z = i; w = -i; u = 0; v = -1; polar: u = 0; v = -1` |
| sq-plus-iz, 2 − i | `z = 2 - i; w = 4 - 2i; u = 4; v = -2; polar: u = 4; v = -2` |
| sq-plus-iz, −1 | `z = -1; w = 1 - i; u = 1; v = -1; polar: u = 1; v = -1` |
| sq-plus-iz, 0.3 + 0.4i | `z = 0.3 + 0.4i; w = -0.47 + 0.54i; u = -0.47; v = 0.54; polar: u = -0.47; v = 0.54` |
| sq-plus-iz, 0 | `z = 0; w = 0; u = 0; v = 0; polar: u = 0; v = 0` |
| recip, 0 | `z = 0; w = undefined (0 is the pole of 1/z); u = undefined; v = undefined; polar: u = undefined; v = undefined` |

(The `v = 0` of the `i` rows is the polar value 1.2e-16 printed through `fmtNum`, which gives `0`, never `-0`.)

### 6.8 The picture numbers (CR station, exp at z₀ = 0.5 + 0.8i, side 0.3)

f(z₀) = 1.148675 + 1.182720i. Corners (t = 0, ¼, ½, ¾) of the square: dz = −0.15 − 0.15i, 0.15 − 0.15i, 0.15 + 0.15i, −0.15 + 0.15i.

| t | A part = f(z₀) + A dz (= image, since B = 0) | true image f(z₀ + dz) | distance |
|---|---|---|---|
| 0 | 1.153782 + 0.833011i | 1.129697 + 0.858800i | 0.0353 |
| ¼ | 1.498384 + 1.187827i | 1.524931 + 1.159259i | 0.0390 |
| ½ | 1.143568 + 1.532430i | 1.114238 + 1.558131i | 0.0390 |
| ¾ | 0.798966 + 1.177613i | 0.825448 + 1.154292i | 0.0353 |

Hand check of the first row: A dz = (1.148675 + 1.18272i)(−0.15)(1 + i) = −0.15[(1.148675 − 1.18272) + i(1.148675 + 1.18272)] = −0.15(−0.034045 + 2.331395i) = 0.005107 − 0.349709i; add f(z₀): 1.153782 + 0.833011i. The side of the image square is |A|h = 1.6487213 × 0.3 = 0.494616; the distance between the t = 0 and t = ¼ corners is √(0.344602² + 0.354816²) = 0.494616. The error between linear and true image is second order, about |f″||dz|²/2 = 1.65 × 0.045/2 ≈ 0.037 at h = 0.3 and four times smaller each time h halves.

View: S = max(1, 1.6487 + 0) = 1.6487213; unitsAcross = 5 × 0.3 × 1.6487213 = **2.473082**; `niceGridStep(2.473082) = 0.2`. For `const-u` (v = x + y) at z₀: S = max(1, 0.7071 + 0.7071) = 1.41421, unitsAcross = **2.121320**. For `abs2` at 1 + i, h = 0.3: S = 2.828427, unitsAcross = **4.242641**. For `conj`: A = 0, B = 1: S = 1, unitsAcross = **1.5**.

### 6.9 Snap and clamp

`snapTenth({ re: 0.04, im: 0.96 }) = { re: 0, im: 1 }`; `snapTenth({ re: -0.04, im: -0.0049 })` gives `{ re: 0, im: 0 }` with `Object.is(re, -0) === false`; `snapTenth({ re: 9.9, im: -7.3 }) = { re: 6, im: -6 }`; `snapTenth({ re: 0.31, im: -0.74 }) = { re: 0.3, im: -0.7 }`; `snapTenth({ re: 0.26, im: 1.24 }) = { re: 0.3, im: 1.2 }`. The test avoids exact ties such as 0.15, where `Math.round` goes up for positive and toward zero for negative numbers.

---

## 7. Verification plan

All commands run from the repo root. Screenshots go under `docs/review/iter-1/i1-station-mappings-cr/shots` (inside `docs/review/`, as the contract allows). Node 22 (`node --test` needs the quoted glob for the whole suite).

### 7.0 Order of work and the one-line summary

```
npm test                                                                  # all unit tests, including the new file
node --test tests/unit/i1-station-mappings-cr.test.mjs                    # this goal's unit tests alone
node tools/smoke.mjs --route mappings,cauchy-riemann,problem-2-1-1,problem-3-2-1,problem-P7 --dark --out docs/review/iter-1/i1-station-mappings-cr/shots     # A1
node tools/smoke.mjs --route problem-2-1-1 --script tests/interact/i1-station-mappings-cr.mjs --dark --out docs/review/iter-1/i1-station-mappings-cr/shots    # A2
node tools/smoke.mjs --route problem-3-2-1 --script tests/interact/i1-station-mappings-cr.mjs --dark --out docs/review/iter-1/i1-station-mappings-cr/shots    # A3 (+ A4 screenshots)
node tools/smoke.mjs --route problem-P7   --script tests/interact/i1-station-mappings-cr.mjs --dark --out docs/review/iter-1/i1-station-mappings-cr/shots    # P7 suite
```

The same script file serves all three routes (and also `mappings` and `cauchy-riemann`, which have the same default state as their first problem): it branches on `ctx.route` (7.2). Each run executes at desktop 1280 x 860, phone 390 x 844 and, with `--dark`, desktop dark: three checks per route.

### 7.1 A1: routes and deep links load clean (smoke)

- **Command:** `node tools/smoke.mjs --route mappings,cauchy-riemann,problem-2-1-1,problem-3-2-1,problem-P7 --dark`
- **Passing looks like:** fifteen lines starting with `ok  ` (5 routes x desktop, phone, desktop-dark), last line `15/15 checks passed across 5 route(s).`, exit code 0. No `console.error`, no page error, no failed request, no external request, `horizontal overflow` never printed, no router error panel (`[data-station-error]`), `#view` not empty.
- **What commonly breaks it:** a typo in an import path (router shows the under-construction panel and `console.error`s); an explainer or readout wider than 358 px (horizontal overflow at 390 px: give flex and grid children `min-width: 0`, wrap the `pre.cr-caret` in `overflow-x: auto`, never set a fixed pixel width on a plane host); a `window` access at module top level (breaks the Node import in the unit test, not smoke); a KaTeX string that throws (the wrapper degrades, but a malformed `\begin` would still print `tex-error` text).
- **Also check by eye in the screenshots of this run** (they are the A4 and theme evidence): `problem-2-1-1--desktop.png`, `--phone.png`, `--desktop-dark.png` and the same for `problem-3-2-1` and `problem-P7`.

### 7.2 The shared interaction script `tests/interact/i1-station-mappings-cr.mjs`

Structure (the builder writes it; each helper used is in `tests/interact/_helpers.mjs`):

```js
import { dragHandle, clickChip, readText, setSlider, settle, handleZ, nums, parseCart } from './_helpers.mjs';

export default async function (page, ctx) {
  const { route, assert, log, shot } = ctx;
  if (route === 'problem-2-1-1' || route === 'mappings') return mappingsSuite(page, ctx);
  if (route === 'problem-3-2-1' || route === 'cauchy-riemann') return crSuite(page, ctx);
  if (route === 'problem-P7') return p7Suite(page, ctx);
  log(`i1-station-mappings-cr: no suite for route ${route}`);
}
```

Helpers inside the file:

```js
// text of a cell, with the invisible MathML operators and whitespace removed, plus its data-tex without whitespace
const cell = (page, id) => page.evaluate((id) => { const el = document.getElementById(id);
  return el ? { text: el.textContent.replace(/[\s\u2061-\u2064\u200b]/g, ''), tex: (el.dataset.tex || '').replace(/\s/g, '') } : null; }, id);
const has = (c, glyph, texGlyph) => !!c && (c.text.includes(glyph) || c.tex.includes(texGlyph === undefined ? glyph : texGlyph));
const attr = (page, sel, a) => page.evaluate(([s, a]) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; }, [sel, a]);
// window.__mv values are read inline: await page.evaluate(() => window.__mv.mappingsMorph)
```

`has(c, '2θ', '2\\theta')` is the robust form of "rendered text has 2θ": the HTML half of KaTeX renders `cos 2θ` as adjacent glyphs, the MathML half may insert an invisible function-application character, and the `data-tex` carries the source `\cos 2\theta`; accepting either removes a timing dependence on the 220 ms MathML refine pass.

### 7.3 A2: 2.1.1, both forms evaluated at 1 + i agree at −1 + 3i

**Unit tests** (`tests/unit/i1-station-mappings-cr.test.mjs`, the mappings half; every one imports `js/stations/mappings.js` directly):

| id | what | expected |
|---|---|---|
| U-M1 | `uvCartesian(id, x, y)` against `compile(fnById(id).src).f({ re: x, im: y })` for the five ids, x, y ∈ {−2.5, −2, …, 2.5} (11 x 11 points), poles skipped | `\|u − w.re\| ≤ 1e-12·max(1, \|w\|)` and the same for `v`/`w.im` at every point (the formulas in `UV` are the textbook ones) |
| U-M2 | `uvPolar(id, r, Arg z + 2πk)` against the same, k ∈ {−2, −1, 0, 1, 2} | tolerance `1e-9·max(1, \|w\|)` at every point: **the polar formula is valid on every name of arg z** |
| U-M3 | `bothAddresses('sq-plus-iz', z, 0)` and `(…, 1)` for the seven points of 6.2 | `r`, `theta`, `cart.u`, `cart.v`, `polar.u`, `polar.v`, `direct` as in the table (1e-9); `agree === true`; `theta` of −1 is `Math.PI` exactly; `thetaK` = `theta + 2π` for k = 1 |
| U-M4 | pole and zero | `bothAddresses('recip', {0, 0})`: `pole === true`, `agree === null`, `cart.u` is NaN; `bothAddresses('sq-plus-iz', {0, 0})`: `zero === true`, `direct` = {0, 0}, `agree === true` |
| U-M5 | the other four ids at i, 1 + i, 2 − i | table 6.3 (`direct` and `cart.w`, 1e-9), `agree === true` |
| U-M6 | `mappingReadout` | the eleven strings of 6.7, compared with `assert.equal` |
| U-M7 | `snapTenth` | 6.9 cases; `Object.is(snapTenth({re: -0.04, im: 0}).re, -0) === false` |
| U-M8 | `clampRadiusFor` | `({ center: {0,0}, unitsAcross: 16 }, { w: 500, h: 500 }) = 40`; `({ center: {0,0}, unitsAcross: 40 }, { w: 400, h: 200 }) = 60`; same with center {10, 0}: `70` |
| U-M9 | `gridCurves()` | 14 curves of family `'cart'` with every point inside [−1.5, 1.5]² (1e-9); 15 of family `'polar'` with `hypot ≤ 1.5 + 1e-9`; the object is memoised (two calls return the same arrays) |
| U-M10 | data coupling | `problemById('2.1.1').answer.values.check` equals `bothAddresses('sq-plus-iz', {1,1})` (`z`, `w`, `u`, `v`); for the five ids `fnById(id).cart` and `.polar` are non-null with string `u` and `v` (the station reads them); `MAPPING_FN_IDS` as a set equals `FUNCTIONS.filter(f => f.stations.includes('mappings')).map(f => f.id)` |
| U-M11 | static source check | `js/stations/mappings.js` read as text, `//` and `/* */` comments stripped: no `alert(`, `confirm(`, `prompt(`, `window.open`, `window.print`, `document.write`, `http://`, `https://`, `localStorage`, `innerHTML =` whose right side is not a string literal |

**Interaction script, `mappingsSuite`** (route `problem-2-1-1` or `mappings`; the exact expectations of acceptance A2 are marked **A2**):

1. `await settle(page, 3)`. Assert `#station-mappings` exists, `#mappings-fn-sq-plus-iz` has `aria-pressed="true"`, `#mappings-problem` text contains `Problem 2.1.1`.
2. **A2** `readout = await readText(page, '#mappings-readout')`: assert it contains `w = -1 + 3i`, `u = -1`, `v = 3`, and (stronger) equals `z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3`.
3. **A2** cells: `c = cell('mappings-ex-u-cart')` has `x`, `y`, `2`; `cell('mappings-ex-u-polar')` has `r` and `has(c, '2θ', '2\\theta')`; likewise `mappings-ex-v-cart` (has `x`, `y`, `2`) and `mappings-ex-v-polar` (has `r`, `2\\theta`); `mappings-ex-value-cart` data-tex contains `-1` and `3`; `mappings-ex-value-polar` data-tex contains `\sqrt{2}` and `\frac{\pi}{4}`.
4. **A2** `same = await readText(page, '#mappings-ex-same')`: `same.startsWith('same point: agree')`, and `attr('#mappings-ex-same', 'data-agree') === 'true'`.
5. **A2** `z = await dragHandle(page, 'mappings-zplane-z', { re: 0, im: 1 })`: assert `Math.abs(z.re) < 1e-9 && Math.abs(z.im - 1) < 1e-9` (the snap works); readout contains `w = -2` and equals `z = i; w = -2; u = -2; v = 0; polar: u = -2; v = 0`; `#mappings-ex-same` still starts `same point: agree`; `#mappings-zcap` contains `z = i`.
6. The staircase (not in A2; carries the arg/Arg thread): `await page.click('#mappings-stairs-k1 button')`; `settle`. Assert the readout is **unchanged**, `#mappings-step-note` contains `k = 1`, `cell('mappings-ex-value-polar').tex` contains `2\pi`, `#mappings-ex-same` still agrees. Click `#mappings-stairs-k0 button` and assert `k = 0` again.
7. **A2** `await clickChip(page, 'mappings-fn-sq')`: readout contains `w = -1` and equals `z = i; w = -1; u = -1; v = 0; polar: u = -1; v = 0`; `#mappings-fn-sq` has `aria-pressed="true"` and `#mappings-fn-sq-plus-iz` has `"false"`; `#mappings-problem` is hidden (`hidden` attribute); the `expand` row now carries the native badge: `document.querySelector('[data-row="expand"] .ex-native').textContent === 'easy in Polar'`.
8. `await clickChip(page, 'mappings-fn-recip')`: readout `z = i; w = -i; u = 0; v = -1; polar: u = 0; v = -1`. Then `dragHandle(page, 'mappings-zplane-z', { re: 0, im: 0 })`: readout contains `undefined (0 is the pole of 1/z)`, `#mappings-ex-same` starts `same point: not checked`, `#mappings-stairs-arg` text is non-empty (the widget's undefined state for z = 0). Then `clickChip('mappings-fn-sq-plus-iz')` and `dragHandle` back to `{ re: 1, im: 1 }`; readout equals the step 2 string.
9. **A2** `r1 = await setSlider(page, 'mappings-morph', 1)`: `r1 === 1` and `await page.evaluate(() => window.__mv.mappingsMorph) === 1` (a number, strict equality).
10. `await setSlider(page, 'mappings-morph', 0.5)`: `mappingsMorph === 0.5`, `#mappings-morph-value` text `0.50`, `window.__mv.mappings.state().pieces > 0`. Record `p0 = state().pieces`. Click `#mappings-grid-polar`: `aria-pressed="true"` and `state().pieces > p0`. Click both grid chips (both are now off): `state().pieces === 0`, `#mappings-grid-hint` not hidden. Click `#mappings-grid-cart` back on (the default).
11. Performance guard (soft): click `#mappings-grid-polar` on again and `setSlider(..., 0.5)`, so both grids are on at s = 0.5; read `window.__mv.planes.get('mappings-wplane').getStats().lastDrawMs`; `ctx.log` it and assert `< 100` (a guard against an accidental O(n²) loop, not a benchmark: headless CI machines are slow). Then click `#mappings-grid-polar` off again and `setSlider(..., 1)`.
12. Play: `await clickChip(page, 'mappings-play')`; within 1500 ms `mappingsMorph` is strictly between 0 and 1 (poll with `page.waitForFunction(() => { const s = window.__mv.mappingsMorph; return s > 0 && s < 1; }, null, { timeout: 1500 })`), and by 4000 ms equals 1 (`waitForFunction(() => window.__mv.mappingsMorph === 1, null, { timeout: 4000 })`); `#mappings-play` text is `Play the motion` again. Then `await page.emulateMedia({ reducedMotion: 'reduce' })`; click Play: `mappingsMorph === 0` (the stepper wraps from 1 to 0), label `Step the motion` after the click; click again: `0.25`. Restore `await page.emulateMedia({ reducedMotion: 'no-preference' })`, `setSlider(..., 1)`.
13. Lab button: `#mappings-open-lab` exists with text `Draw your own shape in the Lab`. **Not clicked** (finding 11).
14. Unmount cleanup: `await page.evaluate(() => { location.hash = '#cauchy-riemann'; })`, `await page.waitForSelector('#station-cauchy-riemann', { timeout: 5000 })`, `settle(page, 3)`; assert `window.__mv.mappingsMorph === undefined`, `window.__mv.mappings === undefined`, `!window.__mv.planes.has('mappings-zplane')`, `document.querySelectorAll('style[data-for="station-mappings"]').length === 0`, `document.querySelectorAll('style[data-for="station-cauchy-riemann"]').length === 1`. Navigate back (`location.hash = '#mappings'`) and assert the mirror image. (Both stations belong to this goal, so neither is a missing-module error.)
15. `await shot('end')`; `log('i1-station-mappings-cr: mappings suite ok')`.

**Passing looks like:** the smoke line `ok   problem-2-1-1 (desktop)`, `(phone)` and `(desktop-dark)` with no problems listed, and the log line.

### 7.4 A3: 3.2.1 holds everywhere with f′ = f; |z|², conj z, Re z fail; P7 forces f′ = 0

**Unit tests** (the CR half of the same file):

| id | what | expected |
|---|---|---|
| U-C1 | ids | `CR_FN_IDS` as a set equals `FUNCTIONS.filter(f => f.stations.includes('cauchy-riemann')).map(f => f.id)` plus `'const-u'`; chip order is `exp, sq-plus-z, conj, re, abs2, const-u` |
| U-C2 | the textbook partials | for each of `exp, sq-plus-z, conj, re, abs2` and each of the points 0.5 + 0.8i, 1 + i, −1.2 + 0.3i, 0, −0.5 + 0.5i, 2 − 1.5i: `CR_FUNCTIONS[id].formulas(x, y)` equals `jacobian(compile(src).f, z)` to **1e-6** in all four entries |
| U-C3 | `crReport` on the table of 6.6 | `jac` entries (1e-6), `A`, `B` (1e-6), `absB` (1e-6), `holds1`, `holds2`, `holds`, `fprime` (null or the value to 1e-6); `exp` at z₀: `holds === true`, `res1 < 1e-9`, `res2 < 1e-9`, `fprime` = {1.148675, 1.18272} (1e-6), `absA` = e^0.5 (1e-6), `spin` = 0.8 (1e-6); `conj`: `A` exactly `{ re: 0, im: 0 }` (cleaned), `spin === null` |
| U-C4 | strings | `crReadout` and `crLines` for every row of 6.7 (`assert.equal`) |
| U-C5 | `constUFunction` | valid for `x + y`, `3`, `x^2`, `y`: `ok === true` and `f({0.5, 0.8})` equals {2, 1.3}, {2, 3}, {2, 0.25}, {2, 0.8} for c = 2; invalid `x +`: `ok === false`, `message` equals the message thrown by `compile('x +')`, `position` an integer ≥ 0, `length ≥ 1`; `x + i*y`: `message` equals the "has to be a real number" text; `1/0`: the "no value at some points" text, `position === null`; `sqrt(x)` (complex at x = −1.1) gives the "real" message |
| U-C6 | `squareCurve(z0, 0.3)` at 0.5 + 0.8i | 33 points, `closed`, `points[0]` = 0.35 + 0.65i with t = 0, `points[8]` = 0.65 + 0.65i (t = 0.25), `points[16]` = 0.65 + 0.95i (t = 0.5), `points[24]` = 0.35 + 0.95i (t = 0.75), `points[32]` equals `points[0]`, t = 1 |
| U-C7 | `localImages` for exp at 0.5 + 0.8i, side 0.3 | `fz0` = 1.148675 + 1.18272i; indices 0, 8, 16, 24 of `A` equal the four rows of 6.8 (1e-6); `image` equals `A` pointwise (1e-12); every `B` point within 1e-12 of `fz0` (B was cleaned to 0); `ghost[0]` = `fz0` + (−0.15 − 0.15i); with `withTruth: true`, `truth[0].points[0]` = 1.129697 + 0.8588i (1e-5). For const-u (c = 2, v = x + y): `A[0]` = 2 + 1.15i, `B[0]` = 2 + 1.15i, `image[0]` = 2 + 1.0i (1e-9); every `image` point has `re` = 2 (1e-9) and `im` in [1.0, 1.6] (1e-9) |
| U-C8 | `wViewFor` | exp: `unitsAcross` = 2.473082 (1e-5), `center` = `fz0`; const-u: 2.121320; abs2 at 1 + i: 4.242641; conj at 0.5 + 0.8i: 1.5; `wViewFor` with `fz0 = {NaN, NaN}` is `null`; `side = 0.05` with A = 1: 0.25 |
| U-C9 | sentences | `crVerdict('abs2', r(0), 0)` contains `f'(0) = 0` and `analytic nowhere`; `crVerdict('abs2', r(z0), z0)` contains `holds only at z = 0`; `crVerdict('conj', …)` contains `pure mirror`; `crVerdict('exp', …)` contains `entire` and `= f(z)`; `constStatus` for `v = x + y` contains `f' = 0`, `constant`, `v_x = 1`; for `v = 3` with `everywhere = true` contains `f' = 0`, `constant`, `2 + 3i`; for `v = x^2` at 0 + 0.8i (CR holds there) with `everywhere = false` contains `not entire`; for `v = x^2` at 0.5 + 0.8i (CR fails) contains `no entire function` |
| U-C10 | not finite | `crReport(() => ({ re: NaN, im: NaN }), {0, 0})`: `finite === false`, `holds === false`, `crReadout` = `A = undefined; \|B\| = undefined; CR holds: no; f' does not exist here` |
| U-C11 | data coupling | `problemById('3.2.1').answer.values.fprimeAt0` equals `crReport(exp, 0).fprime` (1e-9); `check.z` = iπ/2 gives `fprime` ≈ {0, 1} (1e-9); `problemById('P7').answer.values.fprime` equals `{0, 0}` and `crReport(const-u v = 3, any z).fprime` equals it |
| U-C12 | **A5 static inspection** | `js/stations/cauchy-riemann.js` read as text: matches `/import\s*\{[^}]*\bjacobian\b[^}]*\blocalLinear\b[^}]*\}\s*from\s*'\.\.\/core\/complex\.js'/`, matches `/import\s*\{[^}]*\bcompile\b[^}]*\}\s*from\s*'\.\.\/core\/parse\.js'/`, contains `const CR_EPS = 1e-3`, contains the strings `u_x + i v_x` and `v_y - i u_y`; the same comment-stripped forbidden-API scan as U-M11 |
| U-C13 | snap | same cases as U-M7 |

**Interaction script, `crSuite`** (route `problem-3-2-1` or `cauchy-riemann`; **A3** marks the exact acceptance expectations):

1. `settle(page, 3)`. Assert `#cauchy-riemann-fn-exp` has `aria-pressed="true"`; `#cauchy-riemann-problem` contains `Problem 3.2.1`; `#cauchy-riemann-paths` has `aria-expanded="false"` and `#cauchy-riemann-paths-panel` is hidden; the w-plane is not interactive (`document.querySelector('#cauchy-riemann-wplane-viewport').classList.contains('is-static')`).
2. **A3** `#cauchy-riemann-cr1` and `#cauchy-riemann-cr2` have `data-holds="yes"`; `readText('#cauchy-riemann-cr1')` starts with `u_x = v_y: 1.149 vs 1.149, residual 0.000` and cr2 with `u_y = -v_x: -1.183 vs -1.183, residual 0.000`.
3. **A3** `r = await readText(page, '#cauchy-riemann-readout')` equals `A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)`; and, numerically, `parseCart` of the text between `f'(z0) = ` and ` (u_x` is within 0.001 of 1.149 + 1.183i.
4. Jacobian: `nums(text('#cauchy-riemann-ux'))[0]` is 1.149, `-uy` −1.183, `vx` 1.183, `vy` 1.149 (±0.001); each `data-value` is the same number as text.
5. Geometry via the hook: `p = window.__mv.cauchyRiemann.parts()` has 33 points per array; `max |A[i] − image[i]| < 1e-9`; `max |B[i] − fz0| < 1e-9`; the image is not just a translate of the ghost: `|image[8] − image[0]|` (0.4946) differs from `|ghost[8] − ghost[0]|` (0.3) by more than 0.1. `state().holds === true`.
6. `#cauchy-riemann-verdict` contains `entire` and `f(z)`. `#cauchy-riemann-ab-A-polar` data-tex contains `0.8` (Arg A) and `#cauchy-riemann-ab-fprime-cart` data-tex contains `1.149`; `#cauchy-riemann-ab-same` starts `same point: agree`; `#cauchy-riemann-move` contains `Arg A = 0.8` and `There is no mirror part`.
7. **A3** `await clickChip(page, 'cauchy-riemann-fn-abs2')`; `await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 1, im: 1 })` returns exactly (1, 1); `r` equals `A = 1 - i; |B| = 1.414; CR holds: no; f' does not exist here` (so it contains `A = 1 - i`, `|B| = 1.414`, `does not exist`); `document.querySelectorAll('[data-holds="no"]').length === 2`; the hook's `parts().B` is **not** collapsed (max distance from `fz0` above 0.1); `#cauchy-riemann-key` text contains `B part`; `#cauchy-riemann-problem` is hidden (abs2's problem 3.1.2 belongs to the derivative station).
8. **A3** `await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0, im: 0 })`: `r` equals `A = 0; |B| = 0.000; CR holds: yes; f'(z0) = 0 (u_x + i v_x)` (contains `|B| = 0.000` and `f'(z0) = 0`); verdict contains `analytic nowhere`.
9. **A3** `await clickChip(page, 'cauchy-riemann-fn-re')`: `r` contains `|B| = 0.5` (it reads `|B| = 0.500`) and `document.querySelector('[data-holds="no"]')` exists (CR1 fails, CR2 holds, so exactly one of the two lines carries `no`).
10. **A3** `await clickChip(page, 'cauchy-riemann-fn-const-u')`: `#cauchy-riemann-const-status` contains `f' = 0` and `constant`; `#cauchy-riemann-constu` visible; `#cauchy-riemann-problem` contains `Problem P7`; `#cauchy-riemann-polar-note` visible.
11. **A3** `await clickChip(page, 'cauchy-riemann-paths')`: `aria-expanded="true"`, panel visible; `readText('#cauchy-riemann-ex-same').startsWith('same point: differ')` (u = c with v = x + y). `await clickChip(page, 'cauchy-riemann-fn-exp')`: `readText('#cauchy-riemann-ex-same').startsWith('same point: agree')`. Click the paths button again: `aria-expanded="false"`, panel hidden.
12. Slider: `await setSlider(page, 'cauchy-riemann-h', 0.05)`: `#cauchy-riemann-h-value` is `0.05`; at z₀ = 0 for `exp` (A = 1): `window.__mv.planes.get('cauchy-riemann-wplane').getView().unitsAcross` within 1e-6 of 0.25; `ghost` side length 0.05 (`|ghost[8] − ghost[0]|`). Set it back to 0.3.
13. `await dragHandle(page, 'cauchy-riemann-zplane-z0', { re: 0.5, im: 0.8 })` returns exactly (0.5, 0.8) and the readout equals the step 3 string again.
14. True image: `await page.check('#cauchy-riemann-true')`: `parts().truth` is non-null and `#cauchy-riemann-key` contains `really sends`; `page.uncheck`.
15. Keyboard: `await page.focus('#cauchy-riemann-zplane-z0'); await page.keyboard.press('ArrowRight')`: `handleZ(...).re` is 0.6 within 1e-9 and the readout still reads `CR holds: yes`; press ArrowLeft to return.
16. Unmount cleanup mirrors the mappings suite (navigate to `#mappings`: `window.__mv.cauchyRiemann === undefined`, planes unregistered, style block count).
17. `await shot('end')`; `log('i1-station-mappings-cr: cauchy-riemann suite ok')`.

**P7 suite** (`p7Suite`, route `problem-P7`):

1. `#cauchy-riemann-fn-const-u` pressed at load; `#cauchy-riemann-problem` contains `Problem P7`; const-status contains `f' = 0` and `constant`; readout equals `A = 0.5 + 0.5i; |B| = 0.707; CR holds: no; f' does not exist here`; `#cauchy-riemann-proof-1 .. -4` have `data-ok` = `yes, no, no, no`.
2. `await page.fill('#cauchy-riemann-v', '3')`; `settle`: readout equals `A = 0; |B| = 0.000; CR holds: yes; f'(z0) = 0 (u_x + i v_x)`; all four proof items `data-ok="yes"`; const-status contains `2 + 3i`; `#cauchy-riemann-v-error` hidden.
3. `await page.fill('#cauchy-riemann-v', 'x +')`: `#cauchy-riemann-v-error` visible and non-empty, contains a `pre.cr-caret`; `#cauchy-riemann-v` has `aria-invalid="true"`; readout **unchanged** (still the `v = 3` string).
4. `await page.fill('#cauchy-riemann-v', 'x + i*y')`: error text contains `real`; readout unchanged.
5. `await clickChip(page, 'cauchy-riemann-vpreset-x2')`: `#cauchy-riemann-v` value `x^2`; readout equals `A = 0.5i; |B| = 0.500; CR holds: no; f' does not exist here`; error hidden; `aria-invalid` removed.
6. `await clickChip(page, 'cauchy-riemann-vpreset-xy')`; `parts().image` all have `re` = 2 within 1e-9 (the image is a segment on Re w = c); `await page.fill('#cauchy-riemann-c', '5')`: all `re` = 5 within 1e-9, readout unchanged (`A` does not depend on c).
7. `await shot('end')`; log.

**Passing looks like:** `ok` for the three viewports of each route with no problems listed.

### 7.5 A4: the "no mirror" picture sits beside the textbook forms (screenshot review)

- **Command:** `node tools/smoke.mjs --route problem-3-2-1 --dark --out docs/review/iter-1/i1-station-mappings-cr/shots` (screenshots are full-page: `problem-3-2-1--desktop.png`, `--phone.png`, `--desktop-dark.png`; the script run of 7.4 adds `--end` variants). Read them with an image tool.
- **Checklist for `problem-3-2-1--desktop.png` (all must be visible at once or by scrolling the one full-page image):**
  1. z-plane: a small square (side 0.30) drawn with the time ramp (dark to light, dots on four corners, arrowhead) around the handle `z0`, the Cartesian drop lines `x = 0.5`, `y = 0.8`, the ramp pill "start ... end".
  2. w-plane: a **diamond-like square rotated about 45.8 degrees and about 1.65 times larger than the dashed green original** (side 0.49 against 0.30), purple ramped border with an orange line on top of it (the A part coincides with the image), **no red dashed shape** (no visible B part), the orange arc "Arg A = 0.8" from a dashed horizontal reference line, a fainter outer arc "also 7.083".
  3. The key list lists "square as it was", "A part", "Image of the square" and **not** "B part".
  4. The Jacobian table shows `1.149`, `-1.183`, `1.183`, `1.149` with the formulas `u_x = e^x cos y` etc. under the numbers.
  5. The two lines read `u_x = v_y: 1.149 vs 1.149, residual 0.000` and `u_y = -v_x: -1.183 vs -1.183, residual 0.000`, each with a solid "holds" badge.
  6. The readout line `A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)` and the move line "A spins the square by Arg A = 0.8 rad (45.8 degrees) and stretches it by |A| = 1.649 ... There is no mirror part."
  7. The A and B explainer with "A (spin and stretch)" badged "easy in Polar" and `B = 0`, `f'(z0) = u_x + i v_x`.
  8. The problem callout quotes problem 3.2.1 with the statement rendered (KaTeX) and the "Cartesian" badge in `--cart` blue.
  9. Nothing overlaps unreadably (labels `Arg A` and `also 7.083` may sit near the image but must be legible); no horizontal scroll.
- **Same checklist at phone width** (`--phone.png`): single column, planes about 358 px square, explainer stacked.
- **Dark theme** (`--desktop-dark.png`): the orange and red must both be visible against `#151c2b`; the dashed shapes keep their dashes; the ramp ends are legible.
- For contrast, also capture `#problem-3-2-1` after the script's abs2 step if the reviewer wants the "with mirror" picture: z₀ = 1 + i, `abs2`: A part (orange square turned −45 degrees, side 1.41h), B part (red dashed, mirrored, side 1.41h), image a degenerate segment on the real axis.

### 7.6 A5: partials and A/B come from complex.js; formulas are the textbook ones (code inspection)

Reviewer commands and expected results:

```
grep -n "from '../core/complex.js'" js/stations/cauchy-riemann.js        # one import line that names jacobian and localLinear
grep -n "from '../core/parse.js'" js/stations/cauchy-riemann.js          # one import line that names compile (and ParseError)
grep -n "jacobian(\|localLinear(" js/stations/cauchy-riemann.js          # called in crReport, nowhere else
grep -n "CR_EPS" js/stations/cauchy-riemann.js                           # const CR_EPS = 1e-3; used for holds1 and holds2 only
grep -n "u_x + i v_x\|v_y - i u_y" js/stations/cauchy-riemann.js         # f' displayed as u_x + i v_x in the readout; v_y - i u_y in the explainer
grep -n "numericPartials\|2 \* h\|1e-5" js/stations/cauchy-riemann.js                 # prints nothing: the station never differentiates numerically itself
```

Pass criteria: the Jacobian and A, B are never computed by hand in the station (only by `jacobian` and `localLinear`); `holds` is `res1 < CR_EPS && res2 < CR_EPS` with the **unrounded** residuals; `fprime` is `{ re: jac.ux, im: jac.vx }`; the explainer's `dy` column uses `jac.vy` and `-jac.uy`; the TeX under the Jacobian cells equals the formulas of 4.3.1 (and unit test U-C2 ties them to the numeric Jacobian). Test U-C12 automates the first four lines.

### 7.7 Further checks before handing over (not tied to one criterion)

1. `npm test`: the previous 287 tests still pass plus the new file; no test touches `window`.
2. Both themes: run `node tools/smoke.mjs --route problem-2-1-1 --dark --out <dir>` and look at `problem-2-1-1--desktop-dark.png`: grids, overlays, ramp, explainer tints readable.
3. Phone: look at `problem-2-1-1--phone.png` and `problem-P7--phone.png`: no horizontal scroll (also machine-checked by smoke), chips wrap, the readout wraps, the explainer stacks.
4. Keyboard only: Tab to the handle, arrow keys move it, Shift+arrow moves 1 unit, Alt+arrow 0.01 (not snapped); chips and slider reachable; the staircase list is one tab stop.
5. Memory: mount and unmount each station five times in one page (navigate `#mappings` ↔ `#cauchy-riemann`): `window.__mv.planes.size` returns to 0 on a station-free route such as `#nosuchplace` and never grows; no growth in `document.querySelectorAll('canvas').length`.
6. Reduced motion: emulate `reducedMotion: 'reduce'` and reload `#mappings`: the Play button reads `Step the motion` from the start.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| Case | `mappings` | `cauchy-riemann` |
|---|---|---|
| z = 0 | no ray or arc (the plane skips below 6 px), staircase `update(null)`, polar cell says `θ undefined`; `w = f(0)`; `agree` still true for finite f(0) | `abs2`, `re`, `conj`, `exp` all fine at 0; the verdict for `abs2` switches to the "holds only here" sentence |
| Pole (`1/z` at 0) | `pole`, `w = undefined (0 is the pole of 1/z)`, no w dot or overlays, footer `not checked`, pieces cut by the engine | not reachable; a typed v with no value at z₀ gives the `undefined` readout and `finite: false` |
| z on the negative real axis | `Arg = π` (never −π); ghosts at π ± 2π; `uvPolar` with θ = π and −π agree to 1e-15 | n/a |
| w off the plane | edge arrow and text; Reset (the plane's) or zooming out brings it back | the w-plane is centred on f(z₀) by construction |
| z beyond ±6 | clamped by `snapTenth` / the keyboard clamp (the plane's own 10 px inset clamp applies first on screen) | same |
| Keyboard values off the 0.1 grid (z = 0.01 + 0i) | exact; readout prints `0.01`; explainer decimals; the next pointer drag snaps again | same |
| Changing the function during Play | Play continues; pieces follow; the w-plane view resets to the new function's default | n/a |
| Both grids off | hint shown, only the dot, path and overlays remain | n/a |
| Zoom or pan the w-plane while s < 1 | `viewchange` schedules a rebuild with a new `clampRadius` | w-plane is static |
| Very small \|A\| (conj: A = 0) | n/a | no spin arc and no A part; the image is the B part (a mirrored square); text "A is 0 ..." |
| A = B = 0 (u = c, v = 3) | n/a | image is a point: a dot at f(z₀); key shows only the ghost and "image"; text says no spin |
| Huge stretch (exp at x = 6, \|A\| = 403) | n/a | unitsAcross = 605; the ghost square is a dot-sized dash (0.05% of the width) and the key still lists it; no overflow, no NaN |
| h at 0.05 or 0.5 | n/a | view 0.25 to 4.1 units across at S = 1.65 (`5 h S`); the square on the z-plane is 12 px to 120 px wide at 480 px plane width |
| Invalid or complex v | n/a | message, caret line, `aria-invalid`, previous function kept (section 5.4, C-2) |
| `c` field empty or "-" | n/a | ignored until it parses to a finite number |
| `true image` with large S | n/a | `clampRadius = max(40, 3U + \|f(z₀)\|)` so nothing is dropped except true poles (none among the chips) |
| KaTeX missing | explainer cells show the TeX source with `tex-error`; everything else works | same; the Jacobian formulas show as TeX source |
| Theme change while open | planes and explainer re-read tokens; no station code runs | same |
| Window resize or rotation | planes resize themselves (ResizeObserver), `viewchange` with reason `resize` rebuilds the image once | same; w-plane keeps its station-set view |
| Unmount during Play or with a pending rAF | `destroyed` flag; `cancelAnimationFrame`; callbacks return at once | same for the one pending `scheduleImage`-like frames (CR has none) |

### 8.2 Performance plan

- No loops outside `requestAnimationFrame`. Two rAF users in `mappings`: the coalesced image rebuild (one per frame at most) and Play. `cauchy-riemann` has none of its own: every update is synchronous work inside a pointer or input handler (a handful of function evaluations), and the planes and explainers coalesce their own redraws.
- `mappings`, per handle move: 1 model (3 formula evaluations), 1 readout write, 1 explainer update (coalesced to a frame; 4 rows, 2 columns, a cold first render under 100 ms), 1 staircase update, 2 `requestDraw`. The grids are **not** recomputed.
- `mappings`, per slider tick: one `morph` per source curve (up to 14 + 15) in the next frame; each curve has 97 points (adaptive subdivision at most `maxDepth` 4); the budget is 6 ms for the whole rebuild and 16 ms for the plane draw with both grids on (≈ 2.9 k points drawn per plane). If a machine is slower the work simply spreads over more frames (coalesced), it never queues.
- `cauchy-riemann`, per drag: `jacobian` (4 evaluations), `localLinear` (4), 33 x 4 point maps, optional `pushForward` of 33 points, 2 explainer updates, a few text writes, 2 draws: well under 3 ms. `checkEverywhere` (25 reports, 200 evaluations) runs only when the function, `v` or `c` changes.
- Draw cost: `drawTimedCurve` on 29 curves of 97 points per plane per frame is a few hundred microseconds per curve; no per-frame allocation in the layers beyond what the plane helpers do.
- Resolution management: planes own the canvas size, devicePixelRatio (capped by the plane) and `ResizeObserver`; the stations never size a canvas. `maxWidth: 560` keeps the two planes the same size in the two-column grid.
- Memory: every `addEventListener` is on a node the station created (freed with the DOM), the three `window.__mv` entries are deleted on unmount, the `<style>` block is removed, planes and explainers are destroyed.

### 8.3 Accessibility

- Every control has a stable id and a visible label (chips and buttons have text; the slider has a `label for`; inputs have labels; the Lab button has text). The handles carry the plane's aria-label with both addresses ("z = 1 + 1i; r = 1.414, θ = 0.785 (Arg)") and announce changes through the plane's live region.
- Colour is never the only code: A part solid / B part dashed; holds solid badge with "holds" / fails dashed badge with "fails"; proof items have a filled mark / dashed ring; `Arg` is a solid arc and the other names are fainter and labelled "also …".
- Focus: the shell's 3 px `--focus` ring on every control; the staircase's roving focus; Tab order = reading order.
- The readouts are plain text a screen reader can read; the figures have `figcaption`s; canvases are `aria-hidden` (the plane's choice) and everything on them is also in text (readout, explainer, key, move line, verdict).
- The slider has `aria-valuetext`. The paths button has `aria-expanded` and `aria-controls`. The invalid-v message is `role="alert"`. Chips are real `button`s with `aria-pressed`.
- Contrast: all text uses shell tokens (the shell pins their contrast); the canvas strokes use the token colours at alpha ≥ 0.85 except deliberate ghosts (the `--ghost-alpha` windings are labelled in text).
- Motion: nothing flashes; Play is user-started; see 8.4.
- Language: plain sentences, no emoji.

### 8.4 Reduced motion

`mappings`: the only animation is Play. With `prefers-reduced-motion: reduce` (read through `ctx.theme.prefersReducedMotion()` at mount and at every click) the button reads "Step the motion" and each press jumps s to the next of 0, 0.25, 0.5, 0.75, 1 (wrapping to 0 after 1); the slider still works continuously (it is user-driven, not autonomous). `cauchy-riemann`: nothing is animated, so there is nothing to change. No CSS transition or animation is added by either station.

### 8.5 Phone layout (390 px)

- One column; `.two-planes` stacks z-plane then w-plane; each plane is the host width (358 px) up to `maxWidth` and square (aspect 1).
- No horizontal scroll: every grid child gets `min-width: 0`; `.readout` wraps (`overflow-wrap: anywhere`, shell rule); the explainer stacks Cartesian above Polar per row below 560 px (its own media query and width observer); wide TeX cells wrap or scroll inside their cell (`overflow-wrap: anywhere` in the explainer's cell CSS); `pre.cr-caret` has `overflow-x: auto`; the Jacobian table is `table-layout: fixed; width: 100%` with 2 columns of about 150 px, the formula under each number wraps.
- Controls: chips wrap onto several lines (44 px high); `.slider-row` puts the label above the range under 480 px; the staircase panel sits under the explainer; the Lab button and station links are full width.
- Handles keep their 32 px hit area; a drag near the plane edge is clamped 10 px inside; the zoom buttons stay at the top right and the dot is raised above them if it is parked there (plane behaviour).
- The z-plane holds z within ±2.5 (mappings) or ±2 (cauchy-riemann) in the initial view; zoom out with `−` for more room.

---

## 9. Out of scope

- The **direction circle** (the quotient (f(z₀ + ρe^{iφ}) − f(z₀))/(ρe^{iφ}) over all φ, centre A, radius |B|) and the microscope ring: they belong to `derivative` and `limits`. This design uses only the two special directions φ = 0 and φ = π/2 (the "two paths" panel) and the tiny square.
- **Symbolic differentiation.** The textbook partials of the five presets are hard-coded TeX (tied to the numeric Jacobian by a unit test); for `u = c` the partials of the typed v are numeric only.
- CR in polar coordinates (u_r = v_θ/r, v_r = −u_θ/r) is not shown; the polar side of this station is "A and B as moves" and, for `exp`, the log form (|f| = e^x, arg f = y).
- The limit-definition derivation of 3.1.1 and 3.1.2 (station `derivative`), the image of lines and sectors under z² and z³ (`powermap`), the reciprocal and the sphere (`reciprocal`), the Lab's free drawing, the domain colouring, 3D views and the 4D graph.
- Persistence: nothing is saved to the store or `localStorage`; the problem index's progress ticks are another goal's.
- Narration, audio and video (the media track); the stations work without them.
- Any change to shared engines, `components.css`, `registry.js`, `data/*`: requests are listed in section 10.

---

## 10. Decisions taken where the spec was silent, requests for other owners, risks

### 10.1 Decisions (so reviewers can tell design from accident)

1. **Pointer drags snap to a 0.1 grid, keyboard moves do not** (finding 3 and 4): needed for the exact values A2 and A3 assert, and good for hand-checking. Clamp ±6 on both.
2. **`|B|` and the residuals print with exactly three decimals** (`0.000`, `0.500`, `1.414`), unlike `A` and `f′`, which trim zeros via `fmtCart`. This is the only format that satisfies both acceptance strings `|B| = 0.000` and `|B| = 0.5` as substrings.
3. **The image drawn on the w-plane is the local linear image** (A part plus B part), so with B = 0 the A part coincides with it exactly (A4); where f really sends the square is an optional dotted overlay.
4. **The w-plane of `cauchy-riemann` is zoomed on f(z₀)** with `unitsAcross = 5 h max(1, |A| + |B|)`; the dashed ghost square keeps its true size, so spin and stretch read as differences against it.
5. **The B part is red and dashed** (`--danger`, `DASH.excluded`) because the light-theme orange and red are close.
6. **Default grid is Cartesian only** in `mappings` (less clutter, the polar grid is one click away); both can be on.
7. **The staircase is a picker** (`kMin −1`, `kMax 1`): the polar column uses the chosen name, w does not change, and the readout deliberately does not depend on the pick.
8. **The problem callout follows the active chip** (`sq-plus-iz` → 2.1.1; `exp` → 3.2.1; `const-u` → P7; others none).
9. **Extra ids and hooks beyond ARCHITECTURE 9** (all listed in 2.3 and 4.1); none replaces a documented one. Worth copying into section 9 of ARCHITECTURE after the build: `mappings-play`, `-morph-value`, `-zcap`, `-wcap`, `-grid-hint`, `-problem`, `-fn-note`, `-stairs*`, `-step-note`; `cauchy-riemann-problem`, `-fn-note`, `-constu`, `-c`, `-v`, `-vpreset-*`, `-v-error`, `-const-status`, `-h-value`, `-true`, `-key`, `-wcap`, `-jac`, `-verdict`, `-move`, `-ab`, `-paths-panel`, `-polar-note`, `-proof*`; hooks `mv.mappings`, `mv.cauchyRiemann`.
10. **The `paths` panel starts closed on every mount**, so the toggle id is a deterministic test hook.

### 10.2 Requests for other owners

- `docs/ARCHITECTURE.md` (planner): after the build, copy the new ids and hooks of 10.1 item 9 into section 9, and note in section 3.5 that `snap` applies to keyboard nudges too (finding 3). No code change is required for this goal.
- `js/core/plane.js` (plane owner, optional, later): let `snap` receive the drag `source`, so a station can snap pointer drags without the `onDrag` + `set` pattern. Not needed now.
- A shared `js/core/station-chrome.js` (header, thread badges, problem chips, station links, problem callout) would remove the four duplicated helpers H-2 to H-4 across all eleven stations. Not needed for this goal; each station builds its own.
- `js/core/plane.js` (plane owner, fix round): (a) a `labelNames: { x, y }` option on `drawCartAddress`, so the w-plane can print `u = …` and `v = …` without the context wrapper of M-5b; (b) knock out or offset tick labels (and axis names) when an axis lies within about 14 px of the edge, so a view centred near the origin does not strike a number through (the station works around it with `keepAxesClear`, C-5b).
- `js/data/problems.js` (data owner, fix round): the `3.2.1` `routes.polar` note (shown in `#cauchy-riemann-polar-note`) writes "∂(arg f)/∂y" and "∂(arg f)/∂x", differentiating the set arg f as if it were a number. ARCHITECTURE 10.4.6 says to say "a continuous choice of arg f"; reword it so (or write V = y for the harmonic conjugate). The station renders the data as it is.
- `js/stations/lab.js` (Lab owner): the `LabRequest` of M-11 uses only documented shape kinds (`rect`, `circle`) and FUNCTIONS ids that the Lab offers (`sq-plus-iz`, `sq`, `linear-i`, `recip`, `conj`).

### 10.3 Risks

| Risk | Mitigation or check |
|---|---|
| `handle.set(snapped, { silent: true })` inside `onDrag` behaves differently from the reading of `plane.js` above | Test step 5 of the mappings suite and step 7 of the CR suite assert exact final values after real pointer drags; if they fail, fall back to passing `snap: snapTenth` to `addPoint` and accept that Alt-arrow nudges snap back |
| Many labels on the w-plane of `mappings` (Cartesian address, polar address with two ghosts, seam, dot label) collide | The plane's label placer avoids collisions; if a screenshot shows a collision, drop `ghostsNeg` on the w-plane first |
| The explainer's cells are wide on a phone | Rows are short by design (one equation each); the explainer stacks and wraps; check `problem-2-1-1--phone.png` |
| `morph` at small s with `recip` near 0 draws a stray segment | The engine cuts at the clamp radius; the grid never includes 0 for the Cartesian lines except the axes, which pass through the pole and are cut; verified visually at s = 0.05 for `recip` |
| KaTeX renders `\Rightarrow` and `\text{...}` inside a tinted `\textcolor` group | Standard KaTeX; the explainer test in wave 0 renders tinted groups; check `data-tex` cells for `tex-error` in the screenshot |
| Reviewers run the script while `lab.js` or `home.js` is still missing | The script never clicks the Lab button and navigates only between this goal's two stations |
| `Math.round`-based snap gives an asymmetric tie result | Ties are measure-zero in a drag; tests avoid them |

---

## 11. Build notes (iteration 1, builder)

Built as designed; every id, hook, string and number of sections 2, 4 and 6 is as written, and the unit and interaction tests assert them. The deviations, each the smallest that works:

1. **Fainter winding of Arg A (5.4 C-6).** The design wrapped `drawArc` in `ctx.globalAlpha = --ghost-alpha`. `plane.js` `applyStroke` resets `globalAlpha` to 1 on every stroke, so the winding came out at full strength (a heavy circle that read as an unexplained shape). The ghost winding is now a 25 to 97 point polyline drawn with `drawTimedCurve(..., { ramp: false, alpha: ghostAlpha })`, which does take an alpha. The solid Arg A arc still uses `drawArc`. No new imports.
2. **No "start ... end" pill on the zoomed w-plane (`legend: false`).** Because the view is centred on f(z0), the u and v axes sit on the plane's edges and the pill landed on their tick labels. The z-plane keeps its pill. The key item for the image now reads "Image of the square (A part plus B part), dark to light as t runs from 0 to 1", so the ramp is still explained in words. Tests only match "B part" and "really sends" in the key.
3. **`window.__mv.mappings.state()` flushes the coalesced grid rebuild first**, so `pieces` is never one frame stale when a script reads it right after a click.
4. **Layout.** In `mappings` the left cell of `.mp-derive` is a plain block (h2, lead, explainer) rather than a `.panel`: a panel's padding would make the explainer's own width fall under its 560 px stacking threshold at a 1280 px viewport. In `cauchy-riemann` the Jacobian panel has no separate h2 (the table caption is the heading) and the A/B panel has no h2 (the explainer caption "A and B in both addresses" is the heading).
5. `bothAddresses` rounds `k` to an integer (the staircase only sends integers; this keeps `thetaK` honest for a stray caller).

Verification run: `npm test` (403 tests, 24 of them in `tests/unit/i1-station-mappings-cr.test.mjs`); `node tools/smoke.mjs --route mappings,cauchy-riemann,problem-2-1-1,problem-3-2-1,problem-P7 --dark` (15/15); the interaction script on all five routes (3 viewports each); screenshots in `docs/review/iter-1/i1-station-mappings-cr/shots/`. Also checked by hand: Alt and Shift arrow nudges are exact (z = 1.01 + i), five mount and unmount cycles leave 2 canvases, 2 planes and one style block, the reduced-motion label shows from load, a typed v that is undefined at z0 (1/x at x = 0) gives the "undefined" readout without a console error, and 1/z with both grids at s = 0.5 and at the pole.

### 11.1 Fix round (reviewer findings 1 to 9)

Changes, in the order of the review:

1. **Major: the w-plane's drop-line labels read u and v.** `mappings.js` draws w's Cartesian address through `withCartLabels(c2, { x: 'u', y: 'v' })` (M-5b). Deviation from the suggested fix: the review proposed `{ labels: false }` plus `drawLabel` text; that gives up plane.js's collision-aware placement (it keeps the drop-line labels off the tick labels, the ray and the other labels, as the near-origin and off-centre shots show) for fixed positions, so the labels are renamed at the canvas instead and plane.js still places them. The request for a `labelNames` option is in 10.2. Tested by `U-F1`.
2. **Minor: undefined cells.** `abRows` and `abSame` test `!report.finite` first for the A, B and polar cells, so v = 1/x at x = 0 shows `A = undefined` in both columns and no polar form of NaN (`U-F3`; P7 step 7 of the interaction script types exactly that). The f′ polar cell already read "does not exist" (its `fprime` is null when the report is not finite) and is covered by the same test.
3. **Minor: axes on the edge of the zoomed w-plane.** `keepAxesClear` (C-5b), applied in `recompute` and again on a plane resize. It also covers the top and right edges (negative imaginary part: the u axis struck the axis names), which the review did not list. `U-F4` and the CR suite (default view and z₀ = 0.5 − 0.8i) check it. The plane-side request is in 10.2.
4. **Minor: crowded spin labels.** "Arg A = …" and "also …" are one two-line block beside the middle of the arc (C-6), checked at Arg A = 0.1 (z₀ = 1.9 + 0.1i), 0.8, −0.8 and −0.785. Not changed: the crowding near the origin of the `mappings` w-plane, where "r = 3.162", the drop-line label and the dense grid meet. That placement is plane.js's, and it already moves each label to the cheapest free spot; the grid under it is the thing being shown. Reported, not fixed.
5. **Minor: which angle.** `thetaTex` says `θ = Arg z = π/4` at k = 0 and `θ = Arg z + 2π = π/4 + 2π = 9π/4` at k = 1 (`U-F2`, and the mappings suite checks the rendered cell).
6. **Minor, data owner:** the `3.2.1` polar note wording is a request in 10.2; no change in this goal's files.
7. **Minor: "(off the scale)".** Dropped from the design (2.5): the view cannot reach 1e6 units with the six chips, so the line was dead text.
8. **Minor: figcaption position.** In both stations each card is a `div.panel` holding a `figure` (plane host, then `figcaption` last) and then the hint, slider row, key and checkbox outside the figure; the look is unchanged. The interaction script checks every figure of both stations.
9. **Process.** Section 11 and this section are appended to this file although it is not in the goal's `owns` list; the orchestrator allowed edits to it for this round. The earlier "403 of 403" claim counted only the suite as it stood then. After this round `npm test` runs 616 tests, all passing (28 of them in `tests/unit/i1-station-mappings-cr.test.mjs`); re-run it after integration.

Verification run: `npm test` (616 pass); `node tools/smoke.mjs --route mappings,cauchy-riemann,problem-2-1-1,problem-3-2-1,problem-P7 --dark --out docs/review/iter-1/i1-station-mappings-cr` (15/15); the interaction script on all five routes at three viewports each (`--out .../script`); screenshots read: both w-planes in light, dark and phone, exp at 0.5 + 0.8i, 0.5 − 0.8i, 1.9 + 0.1i and −1 + 0.5i, |z|² at 1 + i and 0, and the mappings w-plane at 1 + i, near 0, off the plane and on the real axis.
