# Design: i1-station-curves-linear

Files owned: `js/stations/curves.js`, `js/stations/linear.js`.
Deliverables also named by this design (the builder writes them, they are not "owned" source):
`tests/unit/i1-station-curves-linear.test.mjs`, `tests/interact/i1-station-curves-linear.mjs`.
Status: iteration 1, design v1 (Designer, stage 2). Wave 1 (stations compose the wave-0 engines).

**How to read this file.** Sections 4 and 5 are the contract and the algorithms. Section 6 holds every
number the tests assert, worked in both addresses. Every value in sections 5 and 6 was checked twice:
by hand, and by running a throwaway prototype of the pseudocode (not committed) against the real
`complex.js`, `shapes.js` and `mapping.js`. Where this file and the goal text differ, section 1.4 lists
the difference and the reason; this file is what the builder implements and Review A checks against.

---

## 1. Goal, story thread, review coverage

### 1.1 Goal restatement

Build two stations, each a module `export function mount(el, ctx) -> unmount`:

1. **`curves` ("Curves and Time").** A curve z(t), 0 <= t <= 1, drawn with the time ramp (dark at t = 0,
   bright at t = 1, quarter dots, arrowhead at t = 1) and a cursor at z(t). Five presets (line segment,
   circle, figure eight, square, half circle), a time scrubber with play, reverse (-C), orientation flip,
   five classification chips (smooth, piecewise smooth, closed, simple, positive orientation), draggable
   defining points, and a two-column explainer that writes the same curve in Cartesian and in polar.
   Problem 1.5.1 (`z(t) = (2 - 5t) + i(1 - 4t)`) is the default state.
2. **`linear` ("Linear Maps: Spin, Stretch, Slide").** `f(z) = az + b` with draggable `a` and `b`, shown in
   three stages (spin by Arg a, stretch by |a|, slide by b) on a stage slider; three inputs (the line x = 2,
   the unit circle, a stroke the student draws), a carried grid, a followed point (time t), a composition
   panel `f(g(z))` with `g(z) = cz + d`. Problems 2.1.3, P3 and P4 are its presets.

Both stations are built only from wave-0 engines: `plane.js`, `explainer.js`, `staircase.js`, `katex.js`,
`shapes.js`, `mapping.js`, `complex.js`, `parse.js` (composition inputs only), `data/problems.js`.

### 1.2 Story thread this carries, and how it shows on screen

**Thread 3 begins (time).** `curves` is the first place the student meets the time ramp: a curve is a point
that moves, and lightness (dark to bright) is the clock. `linear` carries the identical ramp onto the
w-plane: every image point keeps the t of the input point it came from (`pushForward` keeps `t`), so "when"
matches "where", dot for dot. A circle looks the same after a spin; the quarter dots, which carry the
time, show that it turned. That is the whole idea of Thread 3 in one picture.

**Thread 1 (two addresses) runs through both.**

| Where | Cartesian address (`--cart`, blue) | Polar address (`--polar`, orange) |
|---|---|---|
| `curves`, line segment | `z(t) = z0 + t(z1 - z0)`: a slide that grows with t. Easy. | The step `z1 - z0` has a tidy polar address (length 6.403, heading -2.467 rad); the points of the line do not. Clumsy. |
| `curves`, circle | needs cos and sin | `z0 + R e^{i(phi + 2 pi t)}`: a spin that grows with t. Easy. |
| `curves`, figure eight | a messy fraction of cos and sin | `r^2 = R^2 cos 2 theta`: one line. Easy. |
| `linear`, the numbers a and b | b is a **slide** (dashed blue drop lines) | a is a **spin and stretch** (orange ray and arc) |
| `linear`, the formula | `u = -y, v = x - 2` | `f(r e^{i theta}) = r e^{i(theta + pi/2)} - 2i` |

The two stations say the same sentence from two sides: **every curve in `curves` is `a + (b - a) L(t)`, a
standard curve L(t) that has been spun and stretched by (b - a) and slid by a**, which is exactly the linear
map `az + b` of the second station. The link between them is drawn on screen (a callout and a route link in
each station).

**Thread 2 (arg vs Arg) shows up wherever an angle is written.**

- In `curves`, the polar address of the cursor is `r` and **`Arg z(t)`** (one number in (-pi, pi]); the
  optional address overlay draws faint extra arcs, the other names, the set `arg z(t)`.
- In `linear`, the spin is "by Arg a", and the control plane draws `a` with its ghost windings (`arg a` as a
  set) while a staircase widget lists them. Spinning by 90 degrees or by 90 degrees plus a full turn moves
  the plane exactly the same way: the plane cannot tell the names apart, only the home step is written down.

### 1.3 Review problems and topics covered

| Id | Statement (short) | Where | What the student touches | Pinned values (section 6) |
|---|---|---|---|---|
| 1.5.1 | parameterize the line from 2 + i to -3 - 3i | `curves` (default) | drags both ends, scrubs t, reverses | `z(t) = (2 - 5t) + i(1 - 4t)`; `z(1/2) = -1/2 - i`; direction `-5 - 4i` |
| 2.1.3 | image of x = 2 under iz - 2i; what the map does in general | `linear` (default) | stage slider 0 to 3, the grid, drags a and b | image is the real axis, `w = -y`; a quarter turn about `1 - i` |
| P3 | the composition of two linear maps is linear | `linear` composition panel | types c and d | `ac = -1 + i`, `ad + b = -i` |
| P4 | `(1 + i)z` sends the unit circle to the circle of radius sqrt 2 | `linear` (preset) | stage slider, dots rotate | `\|w\| = sqrt 2` everywhere, spin 45 degrees |
| T1.5 | curves (smooth, piecewise smooth, closed, simple, orientation) | `curves` | presets, reverse, flip | classification table 6.4 |
| T2.1 | elementary mappings: rotation, magnification, translation, linear transformations | `linear` | stages, a, b | stage maps 6.7 |

### 1.4 Existing code surveyed, and differences from ARCHITECTURE and the goal text

`js/core/*`, `js/data/*`, `js/app.js`, `js/registry.js`, `css/*`, `tests/interact/_helpers.mjs` and
`tools/smoke.mjs` exist (wave 0). `js/stations/` does not exist yet. Every export name used below was
checked against the source and matches ARCHITECTURE 3.x. Facts from the source that change how the builder
must write things:

| # | Fact (source) | Consequence in this design |
|---|---|---|
| S1 | `plane.addPoint` builds the DOM label once; there is no `setLabel`. | On a preset change that changes handle labels, `curves` removes both handles and adds them again with the same ids (`a`, `b`), so `#curves-plane-a` and `#curves-plane-b` stay stable. |
| S2 | `shapes.segment` has `family: null`; `circle`/`rect` have fixed parametrisations by angle or arclength. | `curves` does not use `segment/circle/rect`. It samples one analytic function `z(t)` per preset (section 5.1) so the readout, the explainer and the picture share one source of truth. It uses `shapes.classify` only. `linear` uses `verticalLine`, `circle`, `freehand`, `cartGrid`, `polarGrid`, `curveLength` from `shapes.js` (goal A5). |
| S3 | `classify` marks a corner when the turn exceeds 20 degrees; `orientation` is `+1/-1` for a **simple closed** curve and `0` otherwise. | Presets are sampled with 128 segments, so no smooth preset has a corner (the largest turn between neighbouring segments is 2.81 degrees for the circle, 1.41 for the half circle and 8.43 for the eight at its tips, all under the 20 degree threshold) and the square has exactly 4. The chip `positive` is "yes" only for orientation `+1`; for an open curve or a curve that crosses itself it is "no" with the reason "only a simple closed curve has an orientation" (the goal's A2 pins only the square). |
| S4 | `explainer` catches a throwing cell function, shows `n/a` **and calls `console.error`**; `tools/smoke.mjs` counts every `console.error` as a failure. | Every row function is total: it must return `null` (empty cell) for an empty state (no stroke, z = 0), never throw. |
| S5 | `explainer` columns accept `tint: true` (the whole cell takes the column tone by CSS). KaTeX cannot break a line inside a `\textcolor{}{...}` group. | Cartesian and polar columns use `tint: true`; row functions return plain TeX. `cart()` / `polar()` wrap only **short** pieces in a mixed cell (a centre point inside a polar cell). |
| S6 | `plane.addCurve` draws dots at t = 0, 1/4, 1/2, 3/4 by **linear interpolation of the sampled points**, an arrowhead at the last point, and the ramp legend pill ("start ... end") for the first ramped curve. | `curves` passes 129 sample points (t = k/128). The ring at the cursor can differ from the analytic z(t) by at most 6.0e-4 plane units (the chord sag of a circle with R = 2; 0.03 px at 50 px per unit, so sub-pixel). Readouts use the analytic value. |
| S7 | `createPlane` options: `aspect` defaults to `xSpan / ySpan`; the canvas is never filled, only cleared; a handle drag is clamped to a 10 px inset; `wheel: 'focus'` default. | Stage planes use `xRange [-5.4, 5.4]`, `yRange [-4.5, 4.5]` (aspect 1.2) so two stacked planes fit a 390 px phone screen with the sticky stage bar. |
| S8 | `pushForward` densifies a curve of fewer than 16 segments, keeps `t` on every point, and cuts only on leaps or beyond `clampRadius`. A similarity map never bends, so a line, circle or stroke under `az + b` comes back as exactly 1 piece with the same point count. | `linearImage` has the same number of points as the input curve (129 for the line and the circle). |
| S9 | `tools/smoke.mjs --script` runs the script at **three** viewports when `--dark` is passed (`desktop`, `phone`, `desktop-dark`), after `--wait` ms (800). `ctx.label` is available. | The interaction script must be viewport-independent and dark-safe. |
| S10 | The router maps `#curves-circle` to `ctx.preset = { kind: 'token', token: 'circle' }` and `#problem-P3` to `{ kind: 'problem', id: 'P3' }`; a hash change between two different tokens re-mounts the station. | Section 2 defines the tokens (`curves-<preset>`, `linear-x2`, `linear-unit`, `linear-stroke`, `linear-compose`) and the problem presets. |

**Differences from the goal text.** None in substance. Additions beyond the goal: the `address overlay` toggle,
the `fixed point` (centre of the move) row, the carried grid and the `a` / `b` arrows, the composition
check row, the `Fit both planes` button, the problem card at the top of each station, `window.__mv.curves`
and `window.__mv.linear` (extra test hooks), `#linear-preset-P3` and `#linear-t`, `#linear-play`,
`#curves-play` (the last is in ARCHITECTURE 9). All are marked "ADD" where defined and are safe for other
goals to ignore. `window.__mv.linearImage` is specified exactly in 4.2.4 because the goal names it.

**Small helpers are duplicated** between the two files (problem card, links, TeX helpers). That is on
purpose: a station must not import another station, and this goal owns no shared file.

---

## 2. UX

### 2.1 `curves`: wireframes

Desktop (content column about 950 px at a 1280 px window; two columns when the content is at least 45 rem
wide, which is `repeat(auto-fit, minmax(min(100%, 22rem), 1fr))`):

```
+----------------------------------------------------------------------------------------+
| Curves and Time                                                              (h1)      |
| A curve is a point that moves. z(t) says where the point is at time t ...    (lede)    |
| (o Motion and zoom)   [1.5.1]                                                          |
+----------------------------------------------------------------------------------------+
| ON THE TEST: 1.5.1                                                    #curves-problem  |
| Find a parameterization of the line from 2 + i to -3 - 3i.                             |
| Easiest in [Cartesian] A straight line is start + t x (end - start) ...                |
| > Show the working both ways        > Show the answer                                  |
+----------------------------------------------------------------------------------------+
| Choose a curve                                                                         |
| (Line segment) ( Circle ) ( Figure eight ) ( Square ) ( Half circle )                  |
+-------------------------------------------+--------------------------------------------+
| z-plane.  z = x + iy                      | Walk it the other way                      |
| +---------------------------------------+ | [ Reverse the curve (-C) ] [ Flip the way  |
| | y                                     | |   round ]                                  |
| |   start o  (dark)                     | | [ ] Show both addresses of z(t)            |
| |          \                            | |                                            |
| |           \                           | | What kind of curve is this?                |
| | ----------+\--------- x               | | ( smooth: yes )  z'(t) never jumps ...     |
| |            \  . (ring = z(t))         | | ( piecewise smooth: yes ) ...              |
| |             \ .                       | | ( closed: no )  z(1) is not z(0) ...       |
| |              \. > end (bright)        | | ( simple: yes ) It never crosses itself.   |
| | start ===o=== end                     | | ( positive: no ) Only a simple closed ...  |
| +---------------------------------------+ |                                            |
| Arrow keys move a focused handle ...      |                                            |
| Time t  [-----------o----------]  0.5     |                                            |
| [ Play ]                                  |                                            |
| t = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1                                       |
+-------------------------------------------+--------------------------------------------+
| The curve, written both ways                                                  (h2)     |
| +----------------+----------------------------+---------------------------------+      |
| | Quantity       | Cartesian (slide)          | Polar (spin-and-stretch)        |      |
| | z(t)           | z(t) = (1-t)(2+i)+t(-3-3i) | z(t) = 2.236 e^{i 0.464} + t .. |      |
| |  easy in Cart. |   = (2-5t) + i(1-4t)       |                                 |      |
| | z at this t    | x(t) = -0.5, y(t) = -1     | r = 1.118, Arg z = -2.034       |      |
| | how it moves   | z'(t) = -5 - 4i            | speed 6.403, heading Arg z' ... |      |
| | same point:agree  -0.5 - i                  | 1.118 e^{-i 2.034}              |      |
| +----------------+----------------------------+---------------------------------+      |
| Arg z(t) is the one angle we agreed to use ...                                         |
+----------------------------------------------------------------------------------------+
| (callout) A line is a slide that grows with time ...   Next: Linear maps ->            |
+----------------------------------------------------------------------------------------+
| <- Roots: Divide the Staircase                          Disks, Annuli, Boundaries ->   |
+----------------------------------------------------------------------------------------+
```

Phone (390 px wide, content 358 px, one column, no horizontal scroll). The slider sits directly under the
plane, so once the student scrolls to the plane, the plane (358 px), the slider with Play (about 100 px) and the
readout fit on one screen together (about 560 of the 788 px under the header):

```
+--------------------------------+
| Curves and Time                |
| lede (4 lines)                 |
| (o Motion and zoom) [1.5.1]    |
| [ ON THE TEST 1.5.1 ]          |
|  statement                     |
|  > working   > answer          |
| Choose a curve                 |
| (Line segment) (Circle)        |
| (Figure eight) (Square)        |
| (Half circle)                  |
| z-plane. z = x + iy            |
| +----------------------------+ |
| |        (358 x 358)         | |
| |  o start                   | |
| |   \     . ring             | |
| |    \  .   > end            | |
| | start ===o=== end          | |
| +----------------------------+ |
| Time t [------o-------] 0.5    |
| [ Play ]                       |
| t = 0.5; z(t) = -0.5 - i; ...  |
| Walk it the other way          |
| [Reverse the curve (-C)]       |
| [Flip the way round]           |
| [ ] Show both addresses        |
| What kind of curve is this?    |
| (smooth: yes) z'(t) never ...  |
| ...                            |
| The curve, written both ways   |
|  (explainer stacks: each row   |
|   shows Cartesian above Polar) |
| callout, links                 |
+--------------------------------+
```

### 2.2 `curves`: every control

All ids are stable. "Behaviour" says what happens and what is announced.

| id | Element | Label (visible) | Behaviour |
|---|---|---|---|
| `curves-problem` | `<section class="panel">` | "On the test: 1.5.1" | problem card (2.9) |
| `curves-presets` | `<ul class="chips" role="group" aria-label="Choose a curve">` | "Choose a curve" (a visible `<h2 class="panel-subtitle">` above) | holds the five chips |
| `curves-preset-segment` | `<button class="chip" aria-pressed>` | "Line segment" | loads the segment preset (state below) |
| `curves-preset-circle` | chip | "Circle" | loads the circle preset |
| `curves-preset-eight` | chip | "Figure eight" | loads the figure eight |
| `curves-preset-square` | chip | "Square" | loads the square |
| `curves-preset-arc` | chip | "Half circle" | loads the half circle |
| `curves-plane` (plane id; `#curves-plane-viewport`, `#curves-plane-canvas`) | plane | caption "z-plane. z = x + iy" | the picture; zoom +, -, Reset buttons (plane-owned) |
| `curves-plane-a` | plane handle | segment: "start"; others: "centre" | draggable; a pointer drag is pulled to the 0.5 lattice when within 0.12; keyboard step 0.5 (Shift 5, Alt 0.05), no magnet |
| `curves-plane-b` | plane handle | segment: "end"; others: "start" | draggable, same magnet; never closer than 0.2 to `a` (2.3) |
| `curves-t` | `<input type="range" min=0 max=1 step=0.01 value=0>` | "Time t" | sets `t`; moves the ring; stops play; `aria-valuetext` = "t = 0.5, z = -0.5 - i" |
| `curves-t-out` | `<output for="curves-t">` | (the value, `fmtNum(t, 2)`) | mirrors the slider |
| `curves-play` | `<button class="btn">` | "Play" / "Pause" / "Replay"; under reduced motion "Step by 1/4" | animates t from now to 1 in `PLAY_SECONDS` (5) at constant speed; at t = 1 the label becomes "Replay"; reduced motion: each press moves t to the next multiple of 1/4 (after 1 it wraps to 0) |
| `curves-readout` | `<div class="readout">` | (no label) | `t = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1` (exact format in 4.1.6) |
| `curves-reverse` | `<button class="btn" aria-pressed>` | "Reverse the curve (−C)" | toggles `reversed`: same points, walked backwards; the darker and lighter ends swap, and so do the handle words `start` and `end` (`handleLabels`, 5.1.6); announces "Reversed. z(0) is now -3 - 3i." Always enabled |
| `curves-orient` | `<button class="btn" aria-pressed>` | "Flip the way round" | the same toggle as `curves-reverse` (for a closed curve, reversing **is** flipping the orientation); **enabled only when the curve is simple and closed** (otherwise `disabled` and `title="Only a simple closed curve has an orientation."`); `aria-pressed` is on the button **only while it is enabled** (`true` when clockwise); a disabled toggle has no state to announce, so the attribute is removed (fix round 2) |
| `curves-addresses` | `<input type="checkbox">` in a `<label class="check">` | "Show both addresses of z(t)" | toggles the overlay (2.4, 3) on the plane; default **off** (so the first screenshot shows the ramp clearly) |
| `curves-checks` | `<ul>` | heading "What kind of curve is this?" | five rows, each a chip and a reason |
| `curves-smooth`, `curves-piecewise`, `curves-closed`, `curves-simple`, `curves-positive` | `<span class="chip">` with `data-answer="yes"` or `"no"` | "smooth: yes", "piecewise smooth: no", "closed: yes", "simple: no", "positive: yes" (always `<label>: <yes\|no>`, nothing else inside the chip) | read-only status chips (not buttons); solid border for yes, dashed for no (shared CSS) |
| `curves-smooth-why`, `curves-piecewise-why`, `curves-closed-why`, `curves-simple-why`, `curves-positive-why` | `<span class="cv-why">` | the reason (2.10) | updated with the chip |
| `curves-ex` (explainer id) | `createExplainer` table `#curves-ex-table` | rows `z`, `now`, `vel`; footer `#curves-ex-same` | cells `#curves-ex-z-cart`, `#curves-ex-z-polar`, `#curves-ex-now-cart`, ..., `#curves-ex-vel-polar`, `#curves-ex-same-cart`, `#curves-ex-same-polar` |
| `curves-takeaway` | `<aside class="callout">` | (preset text, 2.10) | static per preset |
| `curves-status` | `<div class="sr-only" role="status" aria-live="polite">` | | debounced (400 ms) one-sentence summaries for screen readers |
| `curves-note` | `<p class="muted" role="status">` (hidden when empty) | | unknown preset token, classification failure |

**State loaded by each preset** (`a` and `b` are the two handle positions; `reversed` is always reset to
false on a preset change; `t` is kept):

| Preset | a | b | Meaning of a, b | Curve |
|---|---|---|---|---|
| `segment` | 2 + i | -3 - 3i | a = start, b = end | `a + (b - a) t` |
| `circle` | 1 + i | 3 + i | a = centre, b = where it starts | `a + (b - a) e^{2 pi i t}`, R = 2 |
| `eight` | 0 | 3 | a = centre, b = right-hand tip | `a + (b - a) L(t)`, L the unit lemniscate |
| `square` | 0 | 1.5 + 1.5i | a = centre, b = a corner | corners `a + (b - a) i^k`, side 3 |
| `arc` | 0 | 3 | a = centre, b = where it starts | `a + (b - a) e^{i pi t}` (half circle, ends at `2a - b`) |

Each preset remembers its own `a` and `b` for the lifetime of the mount (`memory[preset]`), so switching
away and back does not lose a drag.

**Problem and token presets** (`ctx.preset`):

| Preset | State |
|---|---|
| none, `{kind:'problem', id:'1.5.1'}`, `{kind:'topic'}` | `segment`, t = 0 |
| `{kind:'token', token}` where `token` (lower case) is `segment`, `circle`, `eight`, `square`, `arc` | that preset, t = 0 |
| any other token | `segment`, t = 0, and `#curves-note` says: `I do not know a curve called "<token>". Showing the line segment from problem 1.5.1.` (token set with `textContent`, cut to 40 characters) |

### 2.3 `curves`: pointer, touch and keyboard

- **Handles `a`, `b`**: mouse or finger drag (the plane gives them `touch-action: none`, a 32 px hit area,
  44 px on coarse pointers). While dragging, the curve, the chips, the readout and the explainer update on
  every frame (coalesced). Release sets nothing special.
  - Magnet (pointer drags only): `magnet(z)`: if `z` is within 0.12 plane units of a point of the 0.5 lattice, return that
    lattice point; otherwise `z`. This is how a student lands exactly on 2 + i or -3 - 3i. Keyboard nudges are never pulled
    back, so Alt + arrow (0.05) can leave a lattice point.
  - Minimum size: `b`'s `snap` returns `a + clampSize(magnet(z) - a)`; `a`'s `snap` returns `magnet(z)`. Dragging `a`
    carries `b` with it (the shape moves as one piece) for every preset except the segment, where `a` is only the start (5.1.6).
- **Keyboard**: Tab reaches the plane (zoom with + and -, 0 resets, arrows pan when the plane itself is
  focused), then `a`, then `b` (arrow keys nudge by 0.5; Shift 5; Alt 0.05; Escape during a pointer drag
  restores the start), then the chips, slider, buttons in DOM order. The slider uses the native range keys
  (arrows 0.01, PageUp and PageDown 0.1, Home and End).
- **Wheel**: the plane's default (`wheel: 'focus'`): the wheel zooms only when the plane is focused or Ctrl is
  held, so the page scrolls normally on a phone and a trackpad.
- **Two fingers** on the plane pan and pinch (plane-owned). The station adds no gestures.

### 2.4 `curves`: the address overlay (`#curves-addresses`)

When on, a layer under the curve draws, for the cursor point `z = z(t)`:
`drawCartAddress(ctx, plane, z, { color: '--cart', labels: true })` (dashed drop lines labelled `x = ...`,
`y = ...`) and `drawPolarAddress(ctx, plane, z, { color: '--polar', labels: true, ghosts: 1, ghostsNeg: 1,
name: 'z(t)' })` (ray labelled r, solid arc labelled `Arg z(t) = ...`, one faint extra winding above and
one below labelled `also ...`). The label placer keeps the labels off each other and off the handles. A
muted hint under the checkbox: "Blue dashed lines: x and y. Orange ray and arc: r and Arg. Faint arcs: the
other names of the angle, the set arg z(t)." Skipped when `|z| < 1e-9`.

### 2.5 `curves`: states

| State | What the student sees |
|---|---|
| Loading | Nothing to load: `mount` is synchronous, so the router's spinner never shows. The planes draw on their first animation frame after they are measured. |
| Empty | There is no empty state: a curve always exists (handles cannot be dragged closer than 0.2 to each other; `clampSize` guards the formulas). |
| Canvas switched off | The plane shows its own note ("This picture needs canvas drawing ..."). Chips, readout, explainer and checks all still work. |
| KaTeX missing | The explainer shows the TeX text instead (`katex.js` degrades). The readout is unaffected. |
| Unknown token | `#curves-note` message (2.2). The station still works. |
| Classification throws | Each chip shows `?` (`data-answer="no"`) and `#curves-note` says "I could not work out the kind of this curve." (cannot happen with the presets; the try/catch keeps the station alive). |
| Mount throws | The router's "under construction" panel (router-owned). Nothing in this station catches a mount failure. |
| `z = 0` (the curve passes through the origin) | The polar cell of row `now` reads `r = 0, Arg z is undefined`; the overlay is skipped. |
| Reduced motion | `#curves-play` is "Step by 1/4" and never animates. The page never starts any motion by itself. |

### 2.6 `linear`: wireframes

Desktop:

```
+----------------------------------------------------------------------------------------+
| Linear Maps: Spin, Stretch, Slide                                                (h1)  |
| f(z) = az + b treats the whole plane the same way, in three moves ...         (lede)   |
| (o One point, two addresses) (o Motion and zoom)   [2.1.3] [P3] [P4]                   |
+----------------------------------------------------------------------------------------+
| ON THE TEST: 2.1.3                                                    #linear-problem  |
| Find the image of the line x = 2 under f(z) = iz - 2i. What does ...                   |
| Easiest in [Cartesian] [Polar]  The line is easiest in (x, y); what the map does ...   |
| > Show the working both ways        > Show the answer                                  |
+----------------------------------------------------------------------------------------+
| Choose a problem   (2.1.3: the line x = 2)  (P3: two maps in a row)  (P4: the unit circle) |
+---------------------------------------------+------------------------------------------+
| z-plane (input)                             | w-plane (output)                         |
| +-----------------------------------------+ | +--------------------------------------+ |
| | grid (blue lines)   x = 2 line (green)  | | | grid carried (blue)  image (purple)  | |
| | o 0   o 1 (grey arrow)   ghost: none    | | | ghost of the start (dashed green)    | |
| | cursor ring                             | | | orange arrow = a, blue arrow = b     | |
| +-----------------------------------------+ | +--------------------------------------+ |
+---------------------------------------------+------------------------------------------+
| (sticky bar)  Stage [==========o]  3                                                   |
| start               spin            stretch             slide                          |
| [ Play ]  Stage 3 of 3 done: slid by b = -2i. This is f(z) = az + b.                   |
+----------------------------------------------------------------------------------------+
| Shape to move: (The line x = 2) (The unit circle) (Draw my own stroke) [Clear the stroke] |
| Grid to carry along: (Square grid) (Polar grid) (No grid)    [ ] Show the arrows for a and b |
| Follow one point (time t) [------o------]  0.875        [ Fit both planes ]           |
+---------------------------------------------+------------------------------------------+
| Choose a and b                              | a = i = e^(i 1.571); b = -2i;            |
| +-----------------------------------------+ |   spin 90deg, stretch 1, slide -2i       |
| | a (orange dot, ray and arc)             | | arg a: ... -2pi+Arg  Arg a  +2pi ...     |
| | b (blue dot, dashed drop lines)         | | (staircase: three rows, home step solid) |
| +-----------------------------------------+ | Turning by Arg a, or by Arg a plus ...   |
+---------------------------------------------+------------------------------------------+
| One point, followed through f                                                  (h2)    |
| +-----------+-------------------+------------------------+----------------------+      |
| | Quantity  | Cartesian (slide) | Polar (spin-&-stretch) | As a motion          |      |
| | a         | a = i             | |a| = 1, Arg a = 1.571 | spin 90, stretch 1   |      |
| | b         | b = -2i           | |b| = 2, Arg b = ...   | slide by -2i         |      |
| | f(z)      | u = -y, v = x - 2 | f(re^{i th}) = r e^..  | turn, scale, slide   |      |
| | centre    | p = 1 - i         | |p| = 1.414, Arg p ... | the point that stays |      |
| | z(t)      | z = 2 + 3i        | |z| = 3.606, Arg z .. | the dot before       |      |
| | f(z(t))   | w = -3            | |w| = 3, Arg w = pi   | the dot after        |      |
| | same point: agree                                                                |      |
+----------------------------------------------------------------------------------------+
| P3: one map after another                                              #linear-compose |
| Let g(z) = cz + d, then apply f(z) = az + b ...                                        |
| c [1+i]   d [1]        ac = -1 + i; ad + b = -i                                        |
| (explainer: ac | ad + b | check at the followed point)                                 |
+----------------------------------------------------------------------------------------+
| The time ramp, darker early and lighter late, comes from Curves and time.              |
| <- A Function Is a Motion    [ Open in the Lab ]            z^n: Fans and Parabolas -> |
+----------------------------------------------------------------------------------------+
```

Phone (390 px): one column. The two planes stack (each 358 x 298 at aspect 1.2). The **stage bar is sticky at
the bottom of the viewport while the stage block is on screen**, so the student drags the slider and watches
the plane at the same time:

```
+--------------------------------+
| header, lede, badges, chips    |
| [ON THE TEST 2.1.3] (details   |
|   closed)                      |
| (2.1.3) (P3) (P4)              |
| z-plane (input)                |
| +----------------------------+ |
| |        358 x 298           | |
| +----------------------------+ |
| w-plane (output)               |
| +----------------------------+ |
| |        358 x 298           | |
| +----------------------------+ |
|  ... the sticky bar floats     |
| +----------------------------+ |   <- position: sticky; bottom: 0
| | Stage [=======o===]  3     | |      (two rows, about 110 px)
| | [Play] Stage 3 of 3 done:  | |
| |        slid by b = -2i ... | |
| +----------------------------+ |
| Shape to move: chips (wrap)    |
| Grid chips, arrows checkbox    |
| Follow one point, Fit          |
| Choose a and b (square plane)  |
| readout, staircase             |
| explainer (stacked)            |
| composition panel              |
| links                          |
+--------------------------------+
```

### 2.7 `linear`: every control

| id | Element | Label | Behaviour |
|---|---|---|---|
| `linear-problem` | panel | "On the test: 2.1.3" (or P3, P4) | problem card for the selected preset |
| `linear-presets` | chips group | "Choose a problem" | |
| `linear-preset-2-1-3` | chip | "2.1.3: the line x = 2" | a = i, b = -2i, input `x2`, grid cart, stage 3, t = 0.875, card 2.1.3 |
| `linear-preset-P3` | chip | "P3: two maps in a row" | same state as 2.1.3 (a = i, b = -2i, `x2`), c = 1 + i, d = 1, card P3; scrolls `#linear-compose` into view (smooth, or instant under reduced motion) |
| `linear-preset-P4` | chip | "P4: the unit circle" | a = 1 + i, b = 0, input `unit`, grid polar, stage 3, t = 0.125, card P4 |
| `linear-zplane` | plane (aspect 1.2) | caption "z-plane (input)" | the input shape, the carried grid, the cursor, the unit step 0 to 1 |
| `linear-wplane` | plane (aspect 1.2) | caption "w-plane (output)" | the image at the current stage, ghost of the start, the carried grid, the arrows for a and b |
| `linear-stage` | `<input type="range" min=0 max=3 step=0.01 value=3>` | "Stage" | continuous stage s (6.6, 6.7); `aria-valuetext` = the caption; stops play |
| `linear-stage-out` | `<output for="linear-stage">` | | `fmtNum(s, 2)` |
| `linear-stage-caption` | `<p aria-live="off">` | | the caption (2.10); a debounced copy goes to `#linear-status` |
| `linear-play` | button (`title`: "Play the three moves, one after another") | "Play" / "Pause" / "Replay"; reduced motion "Next stage" | animates s from now to 3 at 1.2 s per stage (restarts from 0 when s = 3); reduced motion: each press goes to the next whole stage (3 wraps to 0) |
| `linear-input-x2` | chip `aria-pressed` | "The line x = 2" | input = `verticalLine(2, { yRange: [-4, 4], n: 128 })` |
| `linear-input-unit` | chip | "The unit circle" | input = `circle(0, 1, { n: 128 })` |
| `linear-input-stroke` | chip | "Draw my own stroke" | input = the student's stroke; turns **draw mode** on the z-plane (`setDrawMode(true)`); other inputs turn it off |
| `linear-stroke-clear` | button | "Clear the stroke" | removes the stroke (enabled only with input `stroke`) |
| `linear-stroke-hint` | `<p class="muted" role="status">` | | empty state and phone note (2.11) |
| `linear-grid-cart` / `linear-grid-polar` / `linear-grid-off` | chips (one pressed) | "Square grid" / "Polar grid" / "No grid" | which grid is carried through the stages |
| `linear-vectors` | checkbox | "Show the arrows for a and b" | default on |
| `linear-fit` | button | "Fit both planes" | 5.2.9 |
| `linear-t` | range 0..1 step 0.005 (so 0.875 and 0.125 are exact) | "Follow one point (time t)" | the ring on both planes; the explainer's point rows; disabled with no stroke |
| `linear-t-out` | output | | `fmtNum(t, 3)` |
| `linear-ab` | plane (square, `maxWidth` 360) | caption "Choose a and b" | the control plane; handles `#linear-ab-a` (orange, "a") and `#linear-ab-b` (blue, "b"), pointer magnet 0.5, keyboard step 0.5 |
| `linear-readout` | `.readout` | | `a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i` (4.2.6) |
| `linear-stairs` | `createStaircase` (`label: 'arg a'`, `kMin: -1`, `kMax: 1`) | | ids `#linear-stairs-set`, `-arg`, `-window`, `-list`, `-note` |
| `linear-ex` | explainer, 3 columns, rows `a`, `b`, `f`, `fixed`, `zt`, `wt`, footer `#linear-ex-same` | | cells `#linear-ex-<row>-cart\|polar\|motion` |
| `linear-compose` | panel | "P3: one map after another" | the composition panel |
| `linear-compose-c`, `linear-compose-d` | `<input type="text" inputmode="text" autocomplete="off" spellcheck="false">` | "c" and "d" (visible `<label>`s) | parsed with `parse.js` (5.2.10); defaults `1+i` and `1` |
| `linear-compose-error` | `<p role="alert">` (empty = hidden) | | the parser's message, verbatim |
| `linear-compose-readout` | `.readout` | | `ac = -1 + i; ad + b = -i` |
| `linear-compose-note` | `<p class="ln-compose-note" data-active>` | | always there, so no height changes while a is dragged; `data-active="true"` (emphasised) when a or c is 0 |
| `linear-comp-ex` | explainer, 3 columns, rows `coeff`, `shift`, `check`, footer `#linear-comp-ex-same` | | |
| `linear-offscreen` | `<p class="ln-offscreen" role="status">` | | "The image is off the plane ..."; laid over the bottom of the w-plane (`position:absolute` inside `.ln-wwrap`), not under it, so it cannot push the control plane |
| `linear-open-lab` | `<button class="btn">` in the links nav | "Open in the Lab" | hands over a `LabRequest` (5.2.11) |
| `linear-status` | sr-only live region | | |

**Preset and token table** (`ctx.preset`):

| Preset | a | b | input | grid | stage | t | c | d | card | compose placed |
|---|---|---|---|---|---|---|---|---|---|---|
| none, `problem 2.1.3`, `linear-x2` | i | -2i | `x2` | cart | 3 | 0.875 | 1+i | 1 | 2.1.3 | after the explainer |
| `problem P3`, `linear-compose` | i | -2i | `x2` | cart | 3 | 0.875 | 1+i | 1 | P3 | **right after the card** (before the planes) |
| `problem P4`, `linear-unit` | 1+i | 0 | `unit` | polar | 3 | 0.125 | 1+i | 1 | P4 | after the explainer |
| `linear-stroke` | i | -2i | `stroke` (no stroke yet) | cart | 3 | 0.5 | 1+i | 1 | 2.1.3 | after the explainer |
| any other token | as none | | | | | | | | 2.1.3 | after the explainer; a `<p class="muted" role="status" id="linear-note-token">` says `I do not know a setting called "<token>". Showing problem 2.1.3.` (token set with `textContent`, cut to 40 characters) |

Tokens are compared in lower case; `p3`, `p4`, `2-1-3`, `x2`, `unit`, `stroke`, `compose` are the accepted spellings
(`2-1-3` is the same as the 2.1.3 default).

### 2.8 `linear`: pointer, touch and keyboard

- **Control plane handles** `a` and `b`: drag (mouse, finger), arrow keys (0.5, Shift 5, Alt 0.05). Pointer drags are
  pulled to the 0.5 lattice within 0.12 (keyboard nudges are not), so `a = i`, `a = 1 + i`, `b = -2i` are reachable exactly by dragging. No minimum distance: `a`
  may be dragged to 0 (2.11).
- **Stage slider**: native range keys. While the student drags it the planes update every frame.
- **Draw my own stroke**: with input `stroke` the z-plane is in draw mode (pan by drag is off, so pointer events
  draw; zoom buttons, + and -, and two-finger pinch on touch still work). Press (mouse, finger or pen), drag,
  release: one stroke, replacing the previous one. A press-release shorter than 0.2 plane units in length is
  ignored with a hint. There is **no keyboard way to draw**; the line and the circle work with the keyboard
  (stated in `#linear-stroke-hint` on desktop).
- **Phone note for drawing**: while draw mode is on, a finger on the z-plane draws and does not scroll the page.
  `#linear-stroke-hint` says "Drawing is on: touch outside the left plane to scroll the page."
- **Wheel and two-finger gestures** on both stage planes: plane defaults. The two planes do not follow each
  other's view; `Fit both planes` sets both to the same view.
- **Composition inputs**: ordinary text inputs; every keystroke re-parses.

### 2.9 Problem card (both stations)

One component, built by a local function `renderProblemCard(host, problemId)` in each file:

```
<section class="panel" data-tone="accent" id="<station>-problem" aria-labelledby="<station>-problem-title">
  <h2 class="panel-title" id="<station>-problem-title">On the test: 1.5.1</h2>
  <p class="cv-statement">  statementParts(p.statement): prose -> text node, math -> <span> + tex(span, part.text)  </p>
  <p class="muted">
    <span class="badge" data-tone="cart">Cartesian</span> <span class="badge" data-tone="polar">Polar</span>   (see "Address badges" below)
    Easiest in: <span>addressLabel(p.address)</span>.  <span id="<station>-problem-why"> prose(addressWhy) </span>
  </p>
  <details id="<station>-problem-working"><summary>Show the working both ways</summary>
     <div class="cv-two"> <div data-tone="cart"><h3>Cartesian</h3><p> prose(routes.cart) </p></div>
                          <div data-tone="polar"><h3>Polar</h3><p> prose(routes.polar) </p></div> </div>
  </details>
  <details id="<station>-problem-answer"><summary>Show the answer</summary>
     <div class="tex-scroll cv-final|ln-final" tabindex="0" role="group" aria-label="Answer, scrolls sideways if it is wide"> tex(box, answer.tex, { display: true }) </div>
     <p class="cv-hint|ln-hint" hidden> Scroll sideways to see the rest. </p>
     <p class="muted mono"> answer.text </p>
  </details>
</section>
```

In `curves.js` the layout classes are `cv-statement` and `cv-two`; `linear.js` writes the same rules as `ln-statement` and `ln-two`, and uses `<station>` = `linear`.

**The answer box (fix round 2, ARCHITECTURE 10.4.2).** 21 of the 29 answers are wider than a phone, so the TeX sits in a keyboard-focusable scroller (`tabindex="0"`, `role="group"`,
the aria-label above) with a border so it reads as a box, the plain `answer.text` below it, and the hint `Scroll sideways to see the rest.` between them, shown only while
`scrollWidth > clientWidth + 1`. The scroller is the outer box, not the KaTeX display inside it (`.katex-display` would otherwise scroll by itself, unfocusable, with no way to measure it):
the station CSS gives `.cv-final .katex-display` / `.ln-final .katex-display` `max-width: none; overflow: visible`, as `problems.js` does for `.pc-final`. The box is inside a closed
`details`, so its width is 0 until it is opened: a `ResizeObserver` on the box (not a window listener) refreshes the hint on opening, on a resize and (with `document.fonts.ready`)
when the math font arrives. `renderProblemCard` returns the function that disconnects the observer; `linear` calls it before it draws a new card and in `unmount`, `curves` in `unmount`.
The helper (`answerBox`) is written once per file, because a shared one would need a file this goal does not own (request 8 in 9.2).

The chip row in the header carries the problem's `aha` as its `title`, through `plainProse(text)` (exported, pure): the exponent notation becomes a caret with brackets unless the exponent is one
number or one letter, so `√2e^{iπ/4}` reads `√2e^(iπ/4)` and `2^10` stays `2^10` (ARCHITECTURE 10.4.3: no literal braces).

Address badges: one `<span class="badge" data-tone="cart">Cartesian</span>` for `address` `'C'`, one `<span class="badge" data-tone="polar">Polar</span>` for `'P'`, both (in that order) for
`'both'`, `'C->P'`, `'P->C'` and `'C->P->C'`: the tones come from `addressTones(p.address)` (`'--cart'` becomes `data-tone="cart"`), the badge text is the tone's word. Beside the badges a muted span
reads `Easiest in: ` + `addressLabel(p.address)` (for example `Easiest in: Cartesian, then polar`) and the next sentence is `addressWhy` through `prose(el, text)` (superscripts), never
`innerHTML`. Both `details` are closed on load (they are keyboard-accessible natively). On phone the two
working columns stack (`.cv-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)) }`).

### 2.10 Copy deck (plain, direct, for a student the night before a test)

All strings below are final unless the builder finds one wider than its slot on a 358 px phone, in which
case it shortens the string, never the font.

**`curves`**

| Where | Text |
|---|---|
| h1 | `Curves and Time` (the registry title) |
| lede | `A curve is a point that moves. z(t) says where the point is at time t, from t = 0 to t = 1. Darker means early, lighter means late, and the arrowhead shows which way it goes.` |
| thread badge | `Motion and zoom` (a short form of the T3 registry title; the `title` attribute is the full `THREADS` title and summary) |
| presets heading | `Choose a curve` |
| plane caption | `z-plane. z = x + iy.` |
| plane hint | `Drag the round handles. Arrow keys move a focused handle by 0.5; Shift moves 5, Alt moves 0.05.` |
| slider label | `Time t` |
| play button | `Play`, `Pause`, `Replay`, `Step by 1/4` |
| right panel heading | `Walk it the other way` |
| reverse | `Reverse the curve (−C)`; `title`: `Same points, walked backwards. The darker and lighter ends swap, and so do the words start and end.` |
| orient | `Flip the way round`; disabled `title`: `Only a simple closed curve has an orientation.` |
| addresses checkbox | `Show both addresses of z(t)` |
| addresses hint | `Blue dashed lines: x and y. Orange ray and arc: r and Arg. Faint arcs: the other names of the angle, the set arg z(t).` |
| checks heading | `What kind of curve is this?` |
| explainer heading | `The curve, written both ways` |
| explainer note | `Arg z(t) is the one angle we agreed to use, between -π and π. The faint arcs you get when you show the addresses are the other names: the set arg z(t).` |
| next callout | `Next: send this curve through a function. In Linear maps the same curve, darker early and lighter late, is carried by f(z) = az + b, and the lighter end goes where f sends it.` with a link `Linear maps` to `#linear` |

Chip reasons (each `<span class="cv-why">`; `{n}` is `classify().corners`):

| Chip | yes | no |
|---|---|---|
| smooth | `z'(t) is continuous and never 0, so there are no corners.` | `z'(t) jumps at {n} corner(s).` |
| piecewise smooth | smooth too: `Smooth in one piece, so smooth in pieces too.`; else `Smooth between the {n} corners.` | `Too many corners to count as finitely many smooth pieces.` |
| closed | `z(1) = z(0): it ends where it starts.` | `z(1) is not z(0): it ends somewhere else.` |
| simple | `It never crosses itself.` | `It crosses itself.` |
| positive | `Counterclockwise: the inside is on your left as you walk.` | closed and simple, clockwise: `Clockwise: the inside is on your right, so the orientation is negative.`; otherwise: `Only a simple closed curve has an orientation.` |

Takeaway per preset (`#curves-takeaway`, `data-tone` = the native address; one `<p>` of at most two sentences):

| Preset | Text |
|---|---|
| segment | `A line is a slide that grows with time: start + t(end - start). Cartesian is the natural address here, because x(t) and y(t) are each a straight-line formula in t.` |
| circle | `A circle is a spin that grows with time: centre + R e^{i(φ + 2πt)}. Polar is the natural address: the radius stays R and the angle grows at a steady rate.` |
| eight | `A figure eight crosses itself, so it is not simple. In polar it is one line: r² = R² cos 2θ.` |
| square | `A square has four corners, so z'(t) jumps there: piecewise smooth, not smooth. Each side on its own is a line.` |
| arc | `A half circle is open: it ends somewhere else, so it is not closed. It is the circle's spin, stopped half way.` |

Status sentences (`#curves-status`): preset change `Showing the circle: closed, simple, positive orientation.`
(built from the chips: the words `closed`, `simple`, `positive orientation` appear only for yes answers, and
`not closed`, `not simple`, `no orientation` for no); reverse `Reversed. z(0) is now {z0}.`; slider (debounced)
`t = {t}. z is {z}.`.

**`linear`**

| Where | Text |
|---|---|
| h1 | `Linear Maps: Spin, Stretch, Slide` |
| lede | `f(z) = az + b treats the whole plane the same way, in three moves. Spin by the angle of a. Stretch by the length of a. Slide by b. Drag the stage slider and watch your shape do it.` |
| thread badges | `One point, two addresses` (T1, the registry title) and `Motion and zoom` (T3, a short form of the registry title); each `title` attribute is the full `THREADS` title and summary |
| presets heading | `Choose a problem` |
| plane captions | `z-plane (input)` and `w-plane (output)`, each with a second muted line: `z = x + iy` and `w = u + iv` |
| stage label | `Stage` ; tick words under the slider (aria-hidden): `start`, `spin`, `stretch`, `slide` |
| play | `Play`, `Pause`, `Replay`, `Next stage`; `title`: `Play the three moves, one after another` |
| inputs group | `Shape to move` |
| grid group | `Grid to carry along` |
| vectors checkbox | `Show the arrows for a and b` |
| vectors hint | `Orange arrow: where the step from 0 to 1 goes. That is a. Blue arrow: where 0 goes. That is b.` |
| fit | `Fit both planes` |
| t slider | `Follow one point (time t)` |
| ab heading | `Choose a and b` |
| ab hint | `Drag the orange a: the ray from 0 is its polar address (length and angle). Drag the blue b: the dashed lines are its Cartesian address (across and up).` |
| stairs note | `Turning by Arg a, or by Arg a plus any number of full turns, moves the plane exactly the same way. arg a is every one of those names. Arg a is the one we write down.` |
| explainer heading | `One point, followed through f` |
| compose heading | `P3: one map after another` |
| compose intro | `Let g(z) = cz + d, then apply f(z) = az + b. Is the result still a linear map? Type c and d.` |
| compose note (always shown; emphasised when a or c is 0) | `A linear map needs a ≠ 0. If a or c is 0, the result squashes the whole plane onto one point, so it is not a linear transformation.` |
| compose empty input | `Type a number, for example 1+i.` |
| compose variable | `Use a number here, not z, x or y. For example 1+i or -2i.` |
| compose not finite | `That is not a finite number. Try something like 1+i.` |
| compose parser error | `err.message` from `parse.js`, verbatim |
| stroke hint (draw mode, no stroke, desktop) | `Press and drag on the left plane to draw. Your stroke moves with the plane on the right. (Drawing needs a mouse, finger or pen; the line and the circle work with the keyboard.)` |
| stroke hint (draw mode, phone, `max-width: 30rem`) | `Drawing is on: touch outside the left plane to scroll the page.` appended |
| stroke too short | `That was too short to be a stroke. Press, drag, then let go.` |
| a = 0 note (`#linear-note`, under the readout: beside the control plane on desktop, below it on a phone) | `a = 0 squashes every point onto b, so this is not a one-to-one map. Move a away from 0.` |
| off-screen | `The image is off the plane. Press Fit both planes, or zoom out with the minus button.` |
| back link | `The time ramp, darker early and lighter late, comes from` + link `Curves and time` to `#curves` |
| Lab button | `Open in the Lab` |

Stage captions (`s` is the stage value; `{deg} = fmtNum(spinDeg, 1)`, `{mag} = fmtNum(|a|)`, `{b} = fmtCart(b)`,
`{x} = Math.round(fraction * 100)`):

| Phase | Done (s is a whole number, within 1e-9) | In between |
|---|---|---|
| start (s = 0) | `Stage 0 of 3. Start: the plane as you drew it.` | n/a |
| spin | `Stage 1 of 3 done: turned by Arg a = {deg} degrees.` | `Stage 1 of 3, spinning: {x}% of the turn by Arg a = {deg} degrees.` |
| stretch | `Stage 2 of 3 done: stretched by \|a\| = {mag}.` | `Stage 2 of 3, stretching: {x}% of the way to \|a\| = {mag}.` |
| slide | `Stage 3 of 3 done: slid by b = {b}. This is f(z) = az + b.` (for b = 0: `Stage 3 of 3 done: b = 0, so nothing slid. This is f(z) = az.`) | `Stage 3 of 3, sliding: {x}% of the way along b = {b}.` |

### 2.11 `linear`: states

| State | What the student sees |
|---|---|
| Loading | Synchronous mount; no spinner. |
| Empty (input `stroke`, nothing drawn) | The w-plane shows only the grid; `linearImage` is `[]`; `#linear-t` is disabled; the explainer rows `zt` and `wt` show an empty cell (em dash); `#linear-stroke-hint` shows the empty-state text. |
| `a = 0` | `#linear-note` appears under the readout (never above the control plane); the readout reads `a = 0 (squashes the plane to b); b = ...; spin 0°, stretch 0, slide ...`; stage 2 and 3 collapse the image to one point (drawn as a dot); the fixed-point row says `every point goes to b`; the staircase shows its undefined state (`update(null)`). |
| `a = 1` | The fixed-point row says `none: a = 1 is a pure slide`; stages 1 and 2 do nothing visible (spin 0, stretch 1). |
| Image off the plane | `#linear-offscreen` appears, over the bottom of the w-plane, when **no** image point is inside the w-plane's view. |
| Bad composition input | `#linear-compose-error` shows the message, the input gets `aria-invalid="true"`, the readout and rows keep the **last valid** c and d. |
| `a` or `c` is 0 | `#linear-compose-note` (always present) turns `data-active="true"`: emphasised. |
| Canvas switched off / KaTeX missing | As for `curves`. |
| Unknown token | `#linear-note-token` message; the station shows problem 2.1.3. |
| Reduced motion | `#linear-play` is "Next stage"; no autonomous motion anywhere. |

---

## 3. Visual encoding (both themes)

Every colour is a token from `css/theme.css`, read at draw time by the plane helpers (`'--cart'` is passed as a
string; the station never writes a colour literal) and re-read when the theme changes (the plane redraws on
`themechange`; the explainer re-renders by itself).

### 3.1 Marks, tokens and what they say

| Mark | Token (light / dark) | What it teaches |
|---|---|---|
| `curves`: the curve; `linear`: the input stroke on the z-plane | `--input` `#006e53` / `#3fd0a0` | the input: what you drag or draw |
| `linear`: the image stroke on the w-plane | `--output` `#9d3a8a` / `#e48fd2` | the output |
| time ramp on the curve (dark early, bright late) | `--input` or `--output` mixed 65% toward `--t0` at t = 0 and `--t1` at t = 1 (plane-owned `rampColor`) | time is lightness, so it also reads in grey scale |
| quarter dots at t = 0, 1/4, 1/2, 3/4; arrowhead at t = 1; "start ... end" legend pill | plane-owned (ramp colours with a `--surface` halo) | where in time, and which way |
| cursor ring at t | fill = ramp colour at t, outline `--text`, halo `--surface` | the point "now" |
| Cartesian marks (drop lines, the b slide, the b arrow, grid lines `cart-x`/`cart-y`) | `--cart` `#0b63ad` / `#62adf2` | Cartesian address: dashed, a slide |
| Polar marks (ray, arc, the a arrow, grid rings and rays, circles) | `--polar` `#a84300` / `#ff9d5c` | polar address: solid, a spin-and-stretch |
| `a` handle and the explainer rows for `a` | `--polar` | a is polar-native |
| `b` handle and the explainer rows for `b` | `--cart` | b is Cartesian-native |
| curve handles (`curves-plane-a`, `-b`) | `--input` (plane default) | they define the input |
| ghost of the start shape on the w-plane | `--input`, dashed (`DASH.guide`), alpha 0.45, no ramp | where the shape was |
| orientation marker (arrow toward the inside) | `--accent` `#2f3e5c` / `#cfd8ea` (neutral on purpose) + label in `--text` | orientation is its own idea, not a colour code |
| fixed point marker | `--text` dot, label `--text` | the one point that does not move |
| unit step 0 to 1 on the z-plane | `--text-muted`, arrow | the step whose image is a |
| the third explainer column ("As a motion") | `--output` header bar, plain text | a verbal reading |
| yes/no chips | shared CSS: solid `--ok` border for yes, dashed `--text-muted` for no, and the word | never colour alone |

Colour is never the only cue: time has dots and an arrowhead; Cartesian is dashed and polar is solid on the
planes; yes and no are words; the native address is a badge ("easy in Polar") in the explainer.

### 3.2 The time ramp, measured (acceptance A3)

`rampColor(base, t)` = 0.35 base + 0.65 mix(`--t0`, `--t1`, t). For the curve base `--input` against the plane
background `--surface` (white `#ffffff` in light, `#151c2b` in dark), WCAG contrast:

| t | light colour | light L | light contrast | dark colour | dark L | dark contrast |
|---|---|---|---|---|---|---|
| 0 | `#0a373c` | 0.032 | 12.86 | `#52949b` | 0.254 | 4.93 |
| 1/4 | `#1a484f` | 0.055 | 10.02 | `#6aa9ab` | 0.345 | 6.41 |
| 1/2 | `#295a63` | 0.086 | 7.73 | `#83bebb` | 0.454 | 8.18 |
| 3/4 | `#386b76` | 0.126 | 5.98 | `#9bd4cb` | 0.582 | 10.25 |
| 1 | `#477c89` | 0.175 | 4.67 | `#b4e9db` | 0.729 | 12.64 |

For the image base `--output`: light `#412550` (13.05), `#503663`, `#604776`, `#6f5889`, `#7e699c` (4.77); dark
`#8c7dac` (4.59), `#a493bc`, `#bda8cc`, `#d5bddd`, `#eed2ed` (12.21). Luminance rises monotonically with t in
both themes, and **both ends are at least 3:1 against the plane in both themes** (the lowest is 4.59). In the
light theme "bright" means "lighter than the start", not white: the end is `#477c89`, a mid teal-grey that is
still 4.67:1 on white. The interaction script samples real pixels to confirm this (7.4).

### 3.3 arg drawn as a set, Arg highlighted

| Place | How |
|---|---|
| `curves`, overlay on | `drawPolarAddress(..., { ghosts: 1, ghostsNeg: 1, name: 'z(t)' })`: **one solid arc** labelled `Arg z(t) = ...` and two faint windings labelled `also ...` (alpha at most 0.35: `--ghost-alpha`). The point z(t) is drawn once (the cursor ring). |
| `curves`, explainer row `now` | `\Arg z = -2.034` (a single number, labelled Arg) and the note under the explainer naming the set |
| `linear`, control plane | `drawPolarAddress(ctx, plane, a, { ghosts: 2, ghostsNeg: 1, name: 'a' })`: solid arc `Arg a = ...`, three faint windings; a is drawn once |
| `linear`, staircase `linear-stairs` | `arg a = { ..., Arg a - 2π, Arg a, Arg a + 2π }`, the home row (k = 0) highlighted and prefixed `Arg a =`, the window `(-π, π]` shaded |
| `linear`, stage caption and readout | always `Arg a`, never "arg a = 90°" |

### 3.4 Input versus output, and time on both planes

The z-plane stroke is `--input` and the w-plane stroke is `--output`, both with the same ramp (A5: the w-plane
curve is `plane.addCurve({ ramp: true, points: piece.points })` with the image points' own `t`). The cursor
at the followed `t` is a ring on **both** planes: the dot that was at z(t) is now at f(z(t)). The ghost of the
start (dashed, `--input`) sits under the image, so the move reads as "from here to there".

### 3.5 Layer order (plane `order`, ascending)

| Plane | order | Layer |
|---|---|---|
| `curves-plane` | 60 | address overlay (under the curve) |
| | 100 | the curve (`addCurve`, with `cursor`) |
| | 140 | orientation marker |
| `linear-zplane` | 10 | carried grid, original |
| | 100 | input curve (`addCurve`) |
| | 120 | the stroke being drawn |
| | 150 | marks: unit step, dots at 0 and 1, fixed point |
| `linear-wplane` | 10 | carried grid, image |
| | 50 | ghost of the start (`addCurve`, dashed) |
| | 100 | image pieces (`addCurve`, ramp true) |
| | 150 | arrows for a and b, dots for f(0) and f(1), fixed point |
| `linear-ab` | 0 | address of b (`drawCartAddress`), then arrow 0 to b; address of a (`drawPolarAddress`) |

---

## 4. Module API

Both files: relative imports only; **no top-level access to `window`, `document`, `localStorage` or any browser
global** (so `import('../../js/stations/curves.js')` works in Node for the unit tests; all DOM work is inside
`mount`); one named export `mount(el, ctx)` for the router plus the pure exports below (extra exports are
ignored by the router). `mount` is synchronous and returns `unmount`.

### 4.1 `js/stations/curves.js`

Imports:

```js
import { createPlane, drawCartAddress, drawPolarAddress, drawLabel, drawSegment } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, cart, polar } from '../core/katex.js';
import { classify } from '../core/shapes.js';
import { add, sub, mul, conj, scale, abs, Arg, fromPolar, eq, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
import { STATIONS, THREADS, stationById } from '../registry.js';
import { problemById, problemsForStation, statementParts, addressLabel, addressTones } from '../data/problems.js';
```

#### 4.1.1 Exported constants

```js
export const PRESET_IDS = Object.freeze(['segment', 'circle', 'eight', 'square', 'arc']);
export const PRESET_DEFAULTS = Object.freeze({
  segment: { a: { re: 2, im: 1 },   b: { re: -3, im: -3 } },
  circle:  { a: { re: 1, im: 1 },   b: { re: 3, im: 1 } },
  eight:   { a: { re: 0, im: 0 },   b: { re: 3, im: 0 } },
  square:  { a: { re: 0, im: 0 },   b: { re: 1.5, im: 1.5 } },
  arc:     { a: { re: 0, im: 0 },   b: { re: 3, im: 0 } },
});                                           // deep-frozen
export const CLOSED_PRESETS = Object.freeze({ segment: false, circle: true, eight: true, square: true, arc: false });
export const NATIVE_ADDRESS = Object.freeze({ segment: 'cart', circle: 'polar', eight: 'polar', square: 'cart', arc: 'polar' });
export const SAMPLES = 128;        // segments per curve (129 points)
export const MIN_SIZE = 0.2;       // plane units: the smallest |b - a|
export const PLAY_SECONDS = 5;     // one full pass of t
```

#### 4.1.2 Pure maths (all total: never throw, NaN in gives NaN out)

```js
export function clampSize(d)                  // {re,im} -> {re,im} (fresh)
export function magnet(z)                     // {re,im} -> {re,im}: 0.5-lattice point if within 0.12, else z (fresh)
export function unitCurve(preset, t)          // L(t) -> {re, im}; t clamped to [0, 1]; unknown preset -> {NaN, NaN}
export function unitVelocity(preset, t)       // L'(t) -> {re, im}; one-sided at a square corner (the NEXT side wins)
export function effectiveParams(preset, a, b, reversed = false)   // -> { a, d, conjL }  (see 5.1.3)
export function curveAt(preset, a, b, t, reversed = false)        // -> {re, im} = e.a + e.d * (conjL ? conj(L(t)) : L(t))
export function velocityAt(preset, a, b, t, reversed = false)     // -> {re, im} = e.d * (conjL ? conj(L'(t)) : L'(t))
```

#### 4.1.3 Curve and classification

```js
// Curve (shapes.js contract): { id: 'curve', kind: preset, points: {re, im, t}[], closed, family: null, label, reversed?: true }
export function buildCurve(preset, a, b, reversed = false, n = SAMPLES)
//   n + 1 points, point k at t = k / n; a closed preset stores an exact copy of point 0 as the last point (t = 1);
//   every point is finite; `reversed: true` is set when reversed (documentation only: the points already run backwards).
export function describeCurve(curve)
//   -> { closed, simple, smooth, piecewise, positive, orientation, corners } from shapes.classify:
//      piecewise = classify().piecewiseSmooth; positive = (classify().orientation === 1)
export function classificationTexts(cls, preset)
//   -> { smooth, piecewise, closed, simple, positive }, each { answer: 'yes' | 'no', label, text, why }
//   label: 'smooth', 'piecewise smooth', 'closed', 'simple', 'positive'; text = `${label}: ${answer}`; why = the reason of 2.10
```

#### 4.1.4 Text helpers (exported so the unit test can pin them)

```js
export function readoutText(preset, a, b, reversed, t)      // 4.1.6
export function presetFromToken(token)                      // lower-cased token in PRESET_IDS -> that id; else null
export function resolvePreset(ctxPreset)                    // -> { preset, unknown } per the table in 2.2 (unknown is the token text or null)
export function texLinearT(p, q)                            // 'p + q t' in TeX text (see table in 5.1.9)
export function texParen(z)                                 // '(' + fmtCart(z) + ')'
export function texCoef(z)                                  // a real z prints bare (negative in brackets); otherwise texParen(z)
export function texPolarDec(z)                              // 'r\,e^{i\,theta}' with decimals, see 5.1.9
export function texAngleDual(theta)                         // '0.785 = \frac{\pi}{4}' when exact, else '0.785'
export function explainerState(preset, a, b, reversed, t)   // -> { preset, a, b, reversed, t, e, z, dz }
export function explainerRows()                             // -> rows for createExplainer (5.1.9); cell functions take explainerState(...)
export function explainerSame(s)                            // -> { cart, polar, agree } for the footer row
```

#### 4.1.5 Station state `S` (inside `mount`, never exported)

```js
{ preset: 'segment', a, b,                       // the live handle positions {re, im}
  memory: { segment: { a, b }, circle: { a, b }, ... },   // per-preset positions, filled from PRESET_DEFAULTS
  reversed: false, t: 0, playing: false, addr: false,
  curve: Curve, cls: describeCurve(curve), z: {re, im}, dz: {re, im} }
```

#### 4.1.6 Readout format (exact; tests match on it)

`readoutText(preset, a, b, reversed, t)` = `t = ${fmtNum(t)}; z(t) = ${fmtCart(z)}; x(t) = ${fmtNum(z.re)}; y(t) = ${fmtNum(z.im)}`
with `z = curveAt(preset, a, b, t, reversed)`, `fmtNum`/`fmtCart` at 3 digits, ASCII minus, `-0` printed `0`.
Examples (segment default): `t = 0; z(t) = 2 + i; x(t) = 2; y(t) = 1`, `t = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1`,
`t = 0.25; z(t) = 0.75; x(t) = 0.75; y(t) = 0`.

#### 4.1.7 Events, hooks, lifecycle

- Plane events used: handle `onDrag(z, { final, source })` for `a` and `b`; plane `viewchange` is not used (the
  curve does not depend on the view).
- DOM events: `click` on chips and buttons, `input` on `#curves-t`, `change` on `#curves-addresses`, `click` on
  `#curves-play`. Window and document listeners: **none** (the plane redraws on `themechange` and the explainer re-renders on it, calling the
  row functions again, so tokens and the `cart()`/`polar()` tints refresh without any code here).
- Test hook (ADD): `window.__mv.curves = { state() -> { preset, a, b, reversed, t, playing }, points() -> a copy of the
  displayed points, classification() -> the `describeCurve` result }`. Written with
  `const mv = (window.__mv = window.__mv || {}); mv.curves = {...}`; removed in `unmount`.
- `unmount()`: cancel the play `requestAnimationFrame` and the flush `requestAnimationFrame`; clear the
  status debounce timer; `plane.destroy()` (removes handles and layers); `explainer.destroy()`; `delete window.__mv.curves`; set `destroyed = true` so a late callback returns at once.
- Store: not used. CSS: one `<style data-for="curves">` injected once (4.3).

### 4.2 `js/stations/linear.js`

Imports:

```js
import { createPlane, drawCartAddress, drawPolarAddress, drawTimedCurve, drawSegment, drawDot, drawLabel, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, prose, cart, polar } from '../core/katex.js';
import { verticalLine, circle, freehand, cartGrid, polarGrid, pointAt, curveLength } from '../core/shapes.js';
import { pushForward, pushForwardAll, pointOnPieces } from '../core/mapping.js';
import { compile, ParseError } from '../core/parse.js';
import { add, sub, mul, div, scale, abs, Arg, expi, wrapArg, eq, fromPolar, fmtNum, fmtCart, fmtPolar, fmtAngle, exactAngle, texAngle, ZERO, I } from '../core/complex.js';
import { STATIONS, THREADS } from '../registry.js';
import { problemById, problemsForStation, statementParts, addressLabel, addressTones } from '../data/problems.js';
```

#### 4.2.1 Exported constants

```js
export const PRESETS = Object.freeze({           // deep-frozen
  '2.1.3': { a: {re:0,im:1}, b: {re:0,im:-2}, input: 'x2',   grid: 'cart',  t: 0.875, card: '2.1.3' },
  'P3':    { a: {re:0,im:1}, b: {re:0,im:-2}, input: 'x2',   grid: 'cart',  t: 0.875, card: 'P3' },
  'P4':    { a: {re:1,im:1}, b: {re:0,im:0},  input: 'unit', grid: 'polar', t: 0.125, card: 'P4' },
});
export const STAGE_SECONDS = 1.2;                // per stage when playing
export const LINE_Y_RANGE = Object.freeze([-4, 4]);
export const COMPOSE_DEFAULTS = Object.freeze({ c: { re: 1, im: 1 }, d: { re: 1, im: 0 }, cText: '1+i', dText: '1' });
```

#### 4.2.2 Pure maths

```js
export function stageInfo(s)                    // -> { stage, phase, fraction, done }   (5.2.1)
export function stageMap(a, b, s)               // -> (z) => {re, im}; s clamped to [0, 3]   (5.2.2)
export function fixedPoint(a, b)                // -> b / (1 - a) as {re, im}; null when a = 1 (|1 - a| < 1e-9) or a = 0 (|a| < 1e-9)
export function describeLinear(a, b)            // -> { alpha, spinDeg, stretch, isZero }  alpha = Arg a (0 for a = 0), spinDeg = alpha in degrees, stretch = |a|
export function compose(a, b, c, d)             // -> { A, B, argA, argC, spinSumRad, spinSumDeg, stretchProduct, wrapped }
export function resolvePreset(ctxPreset)        // -> { key: '2.1.3'|'P3'|'P4', input: 'x2'|'unit'|'stroke', unknown: string|null }
export function clampRadiusFor(view, size)      // 10.5.1: max(40, 3 * max(halfW, halfH) + hypot(center))
```

#### 4.2.3 Curves, images, text

```js
export function inputCurve(kind)                // 'x2' -> verticalLine(2, { yRange: [-4, 4], n: 128 }); 'unit' -> circle(0, 1, { n: 128 }); else null
export function gridCurves(kind)                // 'cart' -> cartGrid({ xRange: [-4, 4], yRange: [-4, 4], step: 1, n: 48 });
                                                //  'polar' -> polarGrid({ rMax: 4, rings: 4, rays: 12, n: 96 }); 'off' -> []
export function imagePieces(curve, a, b, s, clampRadius = 40)   // -> pushForward(curve, stageMap(a, b, s), { clampRadius }); [] for a null curve
export function stageCaption(a, b, s)           // 2.10
export function readoutText(a, b)               // 4.2.6
export function composeReadout(a, b, c, d)      // 'ac = -1 + i; ad + b = -i'
export function parseConstant(src)              // -> { ok: true, z } | { ok: false, message }   (5.2.10)
export function labRequest({ a, b, input })     // -> LabRequest (5.2.11)
export function texTerms(terms)                 // [[coef, 'x'], [coef, 'y'], [coef, '']] -> 'x - y', '-y', 'x - 2', '0'
export function texPolarDec(z)                  // as in curves
export function texAngleDual(theta)             // as in curves
export function explainerState(a, b, z)         // -> { a, b, z, w, p, ... } for the main explainer (z may be null)
export function explainerRows()                 // 6 rows (5.2.6)
export function explainerSame(s)                // -> { cart, polar, agree } | null for the footer row
export function composeState(a, b, c, d, z)     // -> { a, b, c, d, z, A, B, lhs, rhs, ... }
export function composeRows()                   // 3 rows (5.2.10)
export function composeSame(s)                  // -> { cart, polar, agree } for the composition footer row
export function mount(el, ctx)
```

#### 4.2.4 `window.__mv.linearImage` (named by the goal; exact contract)

After every recompute the station **assigns a new array** (never mutates the previous one):

```js
const points = pieces.flatMap((pc) => pc.points.map((p) => ({ re: p.re, im: p.im, t: p.t })));   // the MAIN input's image at the current stage
Object.defineProperty(points, 'points', { value: points, enumerable: false });   // so both `linearImage[i]` and `linearImage.points[i]` work
mv.linearImage = points;
```

It holds the points of the image of the input shape (not the grid, not the ghost) at the current stage, in
order, each with its own `t`; `[]` when there is no input (stroke mode before drawing). A script that needs
the numbers inside the page reads `const img = window.__mv.linearImage; const pts = Array.isArray(img) ? img : img.points;`.
Playwright serialises only the indexed items (the non-enumerable `points` is skipped), so
`page.evaluate(() => window.__mv.linearImage)` returns the plain array. Also (ADD):
`window.__mv.linear = { state() -> { preset, a, b, c, d, input, grid, stage, t, playing }, stroke() -> a copy of the stroke
points or null, pieces() -> a copy of the image pieces }`. Both removed in `unmount`.

#### 4.2.5 Station state `S` (inside `mount`)

```js
{ preset: '2.1.3', a, b, c, d, cText, dText, cOk, dOk,
  input: 'x2', stroke: null, drawing: null /* { id, samples } */, grid: 'cart',
  stage: 3, t: 0.875, playing: false, vectors: true,
  inCurve: Curve | null, pieces: Curve[], gridZ: Curve[], gridW: Curve[] }
```

#### 4.2.6 Readout format (exact)

`readoutText(a, b)`: with `info = describeLinear(a, b)`:
`a = ${aText}; b = ${fmtCart(b)}; spin ${fmtNum(info.spinDeg, 1)}°, stretch ${fmtNum(info.stretch)}, slide ${fmtCart(b)}`
where `aText = fmtCart(a) + ' = ' + fmtPolar(a)` for a ≠ 0, and `aText = '0 (squashes the plane to b)'` for `|a| < 1e-9`.
`°` is U+00B0. Examples: `a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i`;
`a = 1 + i = 1.414 e^(i 0.785); b = 0; spin 45°, stretch 1.414, slide 0`;
`a = 0 (squashes the plane to b); b = 1 + i; spin 0°, stretch 0, slide 1 + i`;
`a = -1 = e^(i 3.142); b = 0; spin 180°, stretch 1, slide 0`.

#### 4.2.7 Events and lifecycle

- Plane events: `onDrag` for `linear-ab` handles `a`, `b`; `zplane.on('pointerdown' | 'pointermove' | 'pointerup' |
  'pointercancel', ...)` for drawing (only acts when `S.input === 'stroke'`); `wplane.on('viewchange', ...)` to
  recompute `clampRadius` (and redraw the image); `zplane.on('viewchange')` is not used.
- DOM events: chips (`click`), sliders (`input`), checkbox (`change`), text inputs (`input`), buttons (`click`).
- Window and document listeners: **one**, the page `scroll` listener of the plane keeper (5.2.13), plus a `ResizeObserver` on the station's blocks. Both are attached at the **very end of
  `mount`**, after the hooks are published and after `wplane.on('viewchange')` (ARCHITECTURE 10.1.4: a throw earlier cannot leak them), and removed in `unmount`
  (`window.removeEventListener('scroll', onPageScroll)`, `sizeWatch.disconnect()`). Unit case L20 checks the order in the source. Planes, explainers and the staircase handle `themechange`
  themselves. `curves` has no window or document listener at all (unit C25).
- Timers: one rAF for the flush, one rAF for play, one 400 ms debounce for `#linear-status`.
- `unmount()`: cancel both rAFs and the timer; remove the scroll listener and disconnect the observer; disconnect the answer-box observer; `zplane.destroy()`, `wplane.destroy()`, `abPlane.destroy()`;
  `explainer.destroy()` (both); `stairs.destroy()`; `delete window.__mv.linearImage`
  and `window.__mv.linear`; `destroyed = true`.
- Store: `ctx.store.set('lab.request', request, { persist: false })` only on `#linear-open-lab`.

### 4.3 Injected CSS (tokens only; one `<style>` per station, added once per page, with `data-for`)

`<style data-for="curves">` (also holds the shared problem-card classes `cv-statement`, `cv-two`):

```css
.cv-work{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:start}
.cv-work>*{min-width:0}
.cv-stack{display:flex;flex-direction:column;gap:var(--space-3)}
.cv-caption{margin:0 0 var(--space-1);font-weight:600}
.cv-caption .muted{font-weight:400}
.cv-hint{margin:var(--space-1) 0 0;color:var(--text-muted);font-size:.9rem}
.cv-timebar{display:flex;flex-direction:column;gap:var(--space-2)}
.cv-row{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-3);align-items:center}
.cv-checks{display:grid;gap:var(--space-2);margin:0;padding:0;list-style:none}
.cv-checks li{display:grid;grid-template-columns:minmax(9.5rem,auto) minmax(0,1fr);gap:var(--space-2) var(--space-3);align-items:start}
.cv-checks .chip{cursor:default;justify-content:flex-start;background:var(--surface)}
.cv-checks .chip:hover{background:var(--surface)}
.cv-why{color:var(--text-muted);font-size:.92rem;line-height:1.4}
.cv-statement{font-size:1.05rem}
.cv-two{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))}
.cv-two>div{padding-left:var(--space-2);border-left:4px solid var(--tone,var(--border-strong))}
@media (max-width:30rem){.cv-checks li{grid-template-columns:minmax(0,1fr)}}
```

`<style data-for="linear">`:

```css
.ln-fig{margin:0;min-width:0}
.ln-stage{display:flex;flex-direction:column;gap:var(--space-3)}
.ln-bar{position:sticky;bottom:0;z-index:5;display:grid;gap:var(--space-1);padding:var(--space-2) var(--space-3);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow)}
.ln-slider{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:0 var(--space-2);align-items:start}
.ln-slider>label,.ln-slider>output{line-height:var(--tap)}
.ln-slider>label{font-weight:600}
.ln-slider input[type=range]{display:block;width:100%;min-width:0;height:var(--tap);margin:0;accent-color:var(--accent);cursor:pointer}
.ln-slider output{min-width:2.5em;color:var(--text-muted);font-family:var(--font-mono);font-size:.92rem;text-align:right}
.ln-track{min-width:0}                                   /* the range and the tick words share this one grid column */
.ln-ticks{position:relative;height:1.1rem;margin:-.35rem .5rem 0;color:var(--text-muted);font-size:.8rem;line-height:1.1rem}
.ln-ticks span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}   /* left: 0, 33.3, 66.7, 100% = stages 0..3 */
.ln-bar-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2) var(--space-3);align-items:center}
.ln-wwrap{position:relative}
.ln-offscreen{position:absolute;left:var(--space-2);right:var(--space-2);bottom:var(--space-2);margin:0;padding:var(--space-1) var(--space-2);border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow);font-size:.9rem;line-height:1.35;pointer-events:none}
#linear-compose-readout{overflow-x:auto}
#linear-compose-readout .ln-nw{white-space:nowrap}      /* two halves, split at the semicolon: 'ac = ...;' and 'ad + b = ...' */
.ln-final{padding:var(--space-1);border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2)}
.ln-final .katex-display{max-width:none;overflow:visible;margin:.4em 0}      /* the outer box scrolls, not the display inside it */
.ln-compose-note{margin:var(--space-2) 0;color:var(--text-muted);font-size:.95rem}
.ln-compose-note[data-active="true"]{color:var(--danger);font-weight:600}
.ln-caption{margin:0;font-size:.95rem}
.ln-controls{display:grid;gap:var(--space-3)}
.ln-group{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-3)}
.ln-ab{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));align-items:start}
.ln-ab>*{min-width:0}
.ln-inputs{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:end}
.ln-error{margin:0;color:var(--danger);font-weight:600}
.ln-error:empty{display:none}
.ln-compose[data-active="true"]{outline:3px solid var(--accent);outline-offset:3px}
```
Under `max-width:30rem`: `.ln-ticks{display:none}`, `.ln-fig` padding `--space-2`, `.two-planes` and `.ln-stage` gap `--space-2`,
`.ln-fig figcaption` 1rem, `.ln-bar` gap 0 and padding `--space-1 --space-3` (fix round 1, D7: with these the w-plane ends about 12 px
above the bar once the stage block sits under the header). Fix round 2 adds `#linear-compose-readout .ln-nw { display: block }` (the readout breaks at the semicolon,
always, so its height never changes while a is dragged) and `#station-linear .ln-caption { font-size: .84rem; min-height: 3.1em }`: every caption, at its longest (`Stage 3 of 3 done:
slid by b = -4.123 - 3.456i. This is f(z) = az + b.`, 70 characters), is then two lines at 390 px, and the bar is a constant two lines high at that width (about 96 px, so the w-plane now ends about 16 px above it); at 375 px and below the longest captions can still need a third line (10.2, finding 5).
`curves` adds `.cv-final` (the same as `.ln-final`) and `#station-curves .plane-handle.cv-under:not(:focus-visible):not(.is-dragging):not(.is-above-controls) { z-index: 0 }` (5.1.11).
plus the same `cv-statement` and `cv-two` rules (duplicated in this file's own style element, selectors
prefixed `ln-` instead: `.ln-statement`, `.ln-two`). A phone note: `.ln-bar` has two rows only (`.ln-slider`: label, range, output; then `.ln-bar-row`: the Play button and the
caption) and does **not** use `.slider-row` (which would stack the range on a second line at 30 rem); with a two-line caption it is about 110 px high, so two stacked planes (2 x (298 + 28) px) and the bar fit the 788 px under the header.

---

## 5. Algorithms

Pseudocode is JavaScript-flavoured and precise enough to type in. `clamp(x, lo, hi)` is `Math.min(hi, Math.max(lo, x))`
(NaN stays NaN). `C(re, im)` is `{ re, im }`. All complex helpers are from `complex.js`. Constants: `TAU = 2 * Math.PI`.

### 5.1 `curves`

#### 5.1.1 The standard curves L(t) and their velocities L'(t)

Every curve is `z(t) = a + (b - a) L(t)` for a standard curve `L`; the handles `a` and `b` choose the spin, stretch and
slide. (Segment: `a` start and `b` end, so `L(0) = 0`, `L(1) = 1`. The others: `a` centre and `b` the point where the
curve starts, so `L(0) = 1`.)

| preset | L(t) | L'(t) | L at t = 0, 1/4, 1/2, 3/4, 1 |
|---|---|---|---|
| segment | `t` | `1` | 0, 1/4, 1/2, 3/4, 1 |
| circle | `cos 2πt + i sin 2πt` | `2π(-sin 2πt + i cos 2πt)` | 1, i, -1, -i, 1 |
| arc | `cos πt + i sin πt` | `π(-sin πt + i cos πt)` | 1, 0.7071 + 0.7071i, i, -0.7071 + 0.7071i, -1 |
| eight | `(cos θ + i sin θ cos θ) / (1 + sin² θ)`, θ = 2πt | `2π · dL/dθ`, below | 1, 0, -1, 0, 1 |
| square | `Q(t)`: straight sides through `1, i, -1, -i, 1`, a quarter of the time on each | `4 i^k (i - 1)`, `k = min(3, floor(4t))` | 1, i, -1, -i, 1 |

```
function unitCurve(preset, t):
  u = clamp(t, 0, 1)
  if (!(u >= 0)) return C(NaN, NaN)                          // NaN in, NaN out (and no V[NaN] lookup in 'square')
  switch preset:
    'segment': return C(u, 0)
    'circle':  return C(cos(TAU * u), sin(TAU * u))
    'arc':     return C(cos(PI * u), sin(PI * u))
    'eight':   th = TAU * u; s = sin(th); c = cos(th); D = 1 + s * s
               return C(c / D, s * c / D)
    'square':  k = min(3, floor(4 * u)); f = 4 * u - k
               V = [C(1,0), C(0,1), C(-1,0), C(0,-1), C(1,0)]
               return C(V[k].re + f * (V[k+1].re - V[k].re), V[k].im + f * (V[k+1].im - V[k].im))
    default:   return C(NaN, NaN)

function unitVelocity(preset, t):
  u = clamp(t, 0, 1)
  if (!(u >= 0)) return C(NaN, NaN)
  switch preset:
    'segment': return C(1, 0)
    'circle':  return C(-TAU * sin(TAU * u), TAU * cos(TAU * u))
    'arc':     return C(-PI * sin(PI * u), PI * cos(PI * u))
    'eight':   th = TAU * u; s = sin(th); c = cos(th); c2 = cos(2 * th); D = 1 + s * s
               re = (-s) * D - c * (2 * s * c)            // numerator of dL/dtheta, real part
               im = c2 * D - (s * c) * (2 * s * c)        // numerator, imaginary part
               return C(TAU * re / (D * D), TAU * im / (D * D))
    'square':  k = min(3, floor(4 * u)); ik = [C(1,0), C(0,1), C(-1,0), C(0,-1)][k]
               return scale(mul(ik, C(-1, 1)), 4)         // 4 i^k (i - 1); at a corner the NEXT side wins
    default:   return C(NaN, NaN)
```

Verified by central differences (error below 1e-4 at t = 0.1, 0.3, 0.62, 0.9) for every preset, forward and reversed.

#### 5.1.2 `clampSize` and `magnet`

```
function clampSize(d):
  m = abs(d)
  if (!(m >= 1e-9)) return C(MIN_SIZE, 0)                   // also catches NaN
  if (m < MIN_SIZE) return scale(d, MIN_SIZE / m)           // same direction, length 0.2
  return C(d.re, d.im)

function magnet(z):
  m = C(Math.round(2 * z.re) / 2 + 0, Math.round(2 * z.im) / 2 + 0)     // + 0 turns -0 into 0
  return Math.hypot(z.re - m.re, z.im - m.im) < 0.12 ? m : C(z.re, z.im)
```

#### 5.1.3 `effectiveParams`: reversal as an exact reparametrisation

Reversing a curve is `z(1 - t)`. Writing it as `a' + d' L'(t)` (with `L'` either `L` or its conjugate) keeps one formula for the picture, the readout, the
velocity and the explainer:

```
function effectiveParams(preset, a, b, reversed = false):
  d = clampSize(sub(b, a))
  switch preset:
    'segment': if (!reversed) return { a: C(a.re, a.im), d, conjL: false }
               return { a: add(a, d), d: scale(d, -1), conjL: false }        // starts at the (clamped) end
    'arc':     return { a: C(a.re, a.im), d: reversed ? scale(d, -1) : d, conjL: !!reversed }   // L(1 - t) = -conj(L(t))
    default:   return { a: C(a.re, a.im), d, conjL: !!reversed }              // circle, eight, square: L(1 - t) = conj(L(t))
```

Proof for the closed presets: `L(1 - t)` for the circle is `e^{2πi(1 - t)} = e^{-2πit} = conj L(t)`; for the eight, θ becomes 2π - θ so `sin` flips sign
and `cos` does not: `L(1 - t) = conj L(t)`; for the square the vertex list `1, i, -1, -i` reversed is `1, -i, -1, i`, the conjugates. For the arc,
`e^{iπ(1 - t)} = -e^{-iπt}`.

```
function curveAt(preset, a, b, t, reversed = false):
  e = effectiveParams(preset, a, b, reversed)
  l = unitCurve(preset, t); if (e.conjL) l = conj(l)
  return add(e.a, mul(e.d, l))

function velocityAt(preset, a, b, t, reversed = false):
  e = effectiveParams(preset, a, b, reversed)
  v = unitVelocity(preset, t); if (e.conjL) v = conj(v)
  return mul(e.d, v)
```

Property the unit test pins: for `t` not a multiple of 1/4, `curveAt(p, a, b, t, true)` equals `curveAt(p, a, b, 1 - t, false)` to 1e-12 and
`velocityAt(p, a, b, t, true)` equals `-velocityAt(p, a, b, 1 - t, false)` to 1e-9.

#### 5.1.4 `buildCurve` and `describeCurve`

```
function buildCurve(preset, a, b, reversed = false, n = SAMPLES):
  N = max(8, floor(n))
  pts = []
  for k in 0..N: t = k / N; z = curveAt(preset, a, b, t, reversed); pts.push({ re: z.re, im: z.im, t })
  closed = CLOSED_PRESETS[preset] === true
  if (closed) pts[N] = { re: pts[0].re, im: pts[0].im, t: 1 }                 // exact copy of the first point
  curve = { id: 'curve', kind: preset, points: pts, closed, family: null, label: PRESET_LABEL[preset] }
  if (reversed) curve.reversed = true
  return curve

function describeCurve(curve):
  c = classify(curve)                                   // shapes.js
  return { closed: c.closed, simple: c.simple, smooth: c.smooth, piecewise: c.piecewiseSmooth,
           positive: c.orientation === 1, orientation: c.orientation, corners: c.corners }
```
`PRESET_LABEL` = `{ segment: 'Line segment', circle: 'Circle', eight: 'Figure eight', square: 'Square', arc: 'Half circle' }`.
The classification of the five presets, forward and reversed, is in 6.4 (computed with the real `classify`).

#### 5.1.5 Chips: `classificationTexts`

```
function classificationTexts(cls, preset):
  plural = (n) => `${n} corner${n === 1 ? '' : 's'}`
  yn = (b) => (b ? 'yes' : 'no')
  out.smooth    = { answer: yn(cls.smooth),    label: 'smooth',           why: cls.smooth ? REASON.smoothYes : `z'(t) jumps at ${plural(cls.corners)}.` }
  out.piecewise = { answer: yn(cls.piecewise), label: 'piecewise smooth', why: cls.piecewise ? (cls.smooth ? REASON.pwSmooth : `Smooth between the ${plural(cls.corners)}.`) : REASON.pwNo }
  out.closed    = { answer: yn(cls.closed),    label: 'closed',           why: cls.closed ? REASON.closedYes : REASON.closedNo }
  out.simple    = { answer: yn(cls.simple),    label: 'simple',           why: cls.simple ? REASON.simpleYes : REASON.simpleNo }
  out.positive  = { answer: yn(cls.orientation === 1), label: 'positive',
                    why: cls.orientation === 1 ? REASON.posYes
                       : (cls.closed && cls.simple && cls.orientation === -1) ? REASON.posCw : REASON.posNa }
  for each key: out[key].text = `${out[key].label}: ${out[key].answer}`
```
`REASON` holds the strings of 2.10. If `cls` is `null` (classification failed) every entry is
`{ answer: 'no', label, text: `${label}: ?`, why: '' }`.

#### 5.1.6 Handles

```
// The magnet is for POINTER drags only: a keyboard nudge (Alt = 0.05) must be able to leave a lattice point, so `snap` checks a flag
// that onDragStart sets (pointerdown on the handle) and the final onDrag clears.
S.ptr = false
snapA = (z) => (S.ptr ? magnet(z) : C(z.re, z.im))
snapB = (z) => add(S.a, clampSize(sub(S.ptr ? magnet(z) : z, S.a)))
onDragStartAB = () => { S.ptr = true }
putUnder(which): aHandle.el.classList.toggle('cv-under', which === 'a'); bHandle.el.classList.toggle('cv-under', which === 'b')   // fix round 2
onDragA(z, info):                // z is already snapped by the plane
  if (info && info.final) { S.ptr = false; putUnder('a') }
  if (S.preset !== 'segment') { d = sub(S.b, S.a); S.b = add(z, d); bHandle.set(S.b, { silent: true }) }   // the centre carries the shape
  S.a = C(z.re, z.im); remember(); scheduleFlush(true)
onDragB(z, info): if (info && info.final) { S.ptr = false; putUnder('b') }; S.b = C(z.re, z.im); remember(); scheduleFlush(true)
remember(): S.memory[S.preset] = { a: copy(S.a), b: copy(S.b) }

rebuildHandles():
  aHandle && aHandle.remove(); bHandle && bHandle.remove()
  labels = handleLabels(S.preset, S.reversed)        // segment: ['start','end'], reversed ['end','start']; arc reversed ['centre','end']; closed: ['centre','start']
  aHandle = plane.addPoint({ id: 'a', z: S.a, color: '--input', label: labels[0], name: labels[0], step: 0.5, snap: snapA, onDragStart: onDragStartAB, onDrag: onDragA })
  bHandle = plane.addPoint({ id: 'b', z: S.b, color: '--input', label: labels[1], name: labels[1], step: 0.5, snap: snapB, onDragStart: onDragStartAB, onDrag: onDragB })
```
**One handle on top of the other (fix round 2).** `b` can be dropped on `a` (0.2 apart, `MIN_SIZE`), and the later handle in the DOM would then cover the earlier one for good, so `a`
could only be reached by keyboard. When a drag ends, the handle just let go of gets the class `cv-under` (`z-index: 0`, unless it is dragged, focused by keyboard or over the zoom
buttons); the other one is then on top and can be picked up, and moving it frees the pair. While a handle is dragged plane.js lifts it (`.is-dragging`, `z-index: 3`). A rebuild (preset, Reverse) clears the classes.
The ids stay `a` and `b`, so the buttons are `#curves-plane-a` and `#curves-plane-b` after every rebuild. Dragging the
centre of a circle until `b` would leave the plane is allowed (use zoom out or the Reset button); it is a known
edge, not an error.

#### 5.1.7 Preset switch, reverse, orient

```
loadPreset(id):
  S.preset = id; S.reversed = false                                  // A2: a preset starts un-reversed
  S.a = copy(S.memory[id].a); S.b = copy(S.memory[id].b)
  rebuildHandles(); setChipsPressed(id); setTakeaway(id); reverseBtn.setAttribute('aria-pressed', 'false')   // updateOrientButton() runs in the flush
  scheduleFlush(true); say(statusForPreset())                        // statusForPreset uses the chips after flush
toggleReverse():                                                      // reverse button and orient button
  S.reversed = !S.reversed
  reverseBtn.setAttribute('aria-pressed', String(S.reversed)); updateOrientButton()      // the orient button's aria-pressed follows S.reversed only while it is enabled (fix round 2)
  rebuildHandles()                                                    // the words follow the direction: the handle at z(0) says start, the one at z(1) says end
  scheduleFlush(true)
  say((S.reversed ? 'Reversed. ' : 'Back the original way. ') + 'z(0) is now ' + fmtCart(curveAt(S.preset, S.a, S.b, 0, S.reversed)) + '.')
```
`t` is **not** changed by either (so after Reverse at t = 0.5 the ring stays at parameter 0.5, and for a symmetric
curve at the same place; the script sets t = 0 itself).

#### 5.1.8 Layers

```
// overlay (order 60)
plane.addLayer((c, p) => {
  if (!S.addr || !(abs(S.z) > 1e-9)) return
  drawCartAddress(c, p, S.z, { color: '--cart', labels: true })
  drawPolarAddress(c, p, S.z, { color: '--polar', labels: true, ghosts: 1, ghostsNeg: 1, name: 'z(t)' })
}, { order: 60 })

// orientation marker (order 140): only for a simple closed curve
plane.addLayer((c, p) => {
  if (!S.cls || !S.cls.closed || !S.cls.simple || S.cls.orientation === 0) return
  // fix round 2: the arrow may stand at any t in ORIENT_MARKERS[preset] (circle: 0.375, 0.625, 0.125, 0.875, 0.25, 0.75, 0, 0.5; square: the side
  // midpoints 0.125, 0.625, 0.375, 0.875, then the quarter points); for each: z0 = curveAt(..., tm), v = velocityAt(..., tm)
  u = scale(v, 1 / sp); left = C(-u.im, u.re)                       // i u: 90 degrees to the left of the direction of travel
  dir = S.cls.orientation === 1 ? left : scale(left, -1)            // always toward the INSIDE
  tip = add(z0, scale(dir, 26 / p.getView().scale))                 // 26 px long
  // The label: orientLines(orientation, narrow) = ['inside is', 'on your left|right'] (two lines, 84 x 32 px), or on a plane narrower than 420 px
  // ['inside: left|right'] (one line). The pure placeOrientLabel({ tip, inward, W, H, size, boxes, lines, poly, axes, soft }) tries 16 turns away
  // from the inward direction (0, +-22.5, ... 180 degrees) and 5 pushes (0 to 48 px farther out) and takes the cheapest box: 100 per handle box
  // (handleBox: the dot and its word, mirroring plane.js's rule for where the word sits), the cursor ring or the zoom buttons it touches;
  // 40 if it touches the curve; 60 if a corner of it is outside the curve (poly: the label says "inside"); 6 for an axis or the strip of numbers
  // along an axis; 2 per 45 degrees of turn and 0.1 per px of push. A free straight-on spot costs 0 and is taken at once. The marker with the
  // lowest total (cost + 1.5 per place down the list) wins; the one in use keeps the job unless another is better by more than 3, so the arrow does not
  // jump while a handle is dragged. Drawn centred, line by line, with drawLabel. window.__mv.curves.orient() returns what was drawn (pixels).
  drawSegment(c, p, z0, tip, { color: '--accent', arrow: true, width: 2.5 })
}, { order: 140 })

// the curve
curveLayer = plane.addCurve({ id: 'curve', points: S.curve.points, color: '--input', ramp: true, width: 3, dots: true, arrow: true, closed: false, order: 100 })
```
`closed: false` on purpose: a closed curve already stores its first point as its last.

#### 5.1.9 The explainer (`createExplainer(host, spec)`)

```
spec = { id: 'curves-ex',
  columns: [ { key: 'cart',  heading: 'Cartesian (slide)',        tone: '--cart',  tint: true },
             { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true } ],
  rows: explainerRows(), same: explainerSame }
explainer.update(explainerState(S.preset, S.a, S.b, S.reversed, S.t))         // on every flush
```
`explainerState` = `{ preset, a, b, reversed, t, e: effectiveParams(...), z: curveAt(...), dz: velocityAt(...) }`.
Every cell function returns a TeX string, `{ text }` or `null`, and **never throws** (S4). TeX helpers (exported):

```
dec(x)            = fmtNum(x, 3)                                       // '2', '-0.5', '1.118'
texParen(z)       = '(' + fmtCart(z, 3) + ')'                          // '(2 + i)', '(-3 - 3i)', '(i)', '(2)'
texCoef(z)        = Math.abs(z.im) < 1e-9 ? (z.re >= 0 ? dec(z.re) : '(' + dec(z.re) + ')') : texParen(z)    // '2', '(-3)', '(1.5 + 1.5i)'
texAngleDual(th)  = Math.abs(th) < 1e-12 ? '0' : exactAngle(th) ? dec(th) + ' = ' + texAngle(th) : dec(th)       // '0.785 = \frac{\pi}{4}', '3.142 = \pi', '0.983', '0'
texPolarDec(z):   r = abs(z); if (!(r >= 1e-9)) return '0'
                  th = Arg(z); mag = Math.abs(r - 1) < 1e-9 ? '' : dec(r) + '\\,'
                  if (Math.abs(th) < 1e-12) return mag === '' ? '1' : dec(r)
                  return th < 0 ? `${mag}e^{-i\\,${dec(-th)}}` : `${mag}e^{i\\,${dec(th)}}`
texLinearT(p, q): pz = Math.abs(p) < 1e-9; qz = Math.abs(q) < 1e-9
                  if (pz && qz) return '0'
                  if (qz) return dec(p)
                  qs = Math.abs(Math.abs(q) - 1) < 1e-9 ? 't' : dec(Math.abs(q)) + 't'
                  if (pz) return (q < 0 ? '-' : '') + qs
                  return dec(p) + (q < 0 ? ' - ' : ' + ') + qs
phaseTex(phi, sign, k):  turns = (k === 1 ? '' : String(k)) + '\\pi t'
                  if (Math.abs(phi) < 1e-9) return (sign < 0 ? '-' : '') + turns
                  return dec(phi) + (sign < 0 ? ' - ' : ' + ') + turns
```
Pinned outputs: `texLinearT(2, -5) = '2 - 5t'`, `(1, -4) = '1 - 4t'`, `(-3, 5) = '-3 + 5t'`, `(0, -5) = '-5t'`, `(0, 1) = 't'`, `(0, -1) = '-t'`,
`(3, 0) = '3'`, `(0, 0) = '0'`, `(2, 1) = '2 + t'`, `(2, -1) = '2 - t'`, `(0.5, 0.25) = '0.5 + 0.25t'`. `texPolarDec(C(-5, -4)) = '6.403\\,e^{-i\\,2.467}'`,
`texPolarDec(C(0, 1)) = 'e^{i\\,1.571}'`, `texPolarDec(C(2, 0)) = '2'`, `texPolarDec(C(-1, 0)) = 'e^{i\\,3.142}'`, `texPolarDec(C(0, 0)) = '0'`,
`texParen(C(2, 1)) = '(2 + i)'`, `texAngleDual(Math.PI / 4) = '0.785 = \\frac{\\pi}{4}'`, `texAngleDual(Math.PI) = '3.142 = \\pi'`.

The three rows (`e = s.e`, `A = texParen(e.a)`, `D = texCoef(e.d)`, `sg = e.conjL ? '-' : '+'`, `hasA = abs(e.a) >= 1e-9`):

**Row `z`, label `z(t)`, `native: (s) => NATIVE_ADDRESS[s.preset]`.**

| preset | `cart(s)` | `polar(s)` |
|---|---|---|
| segment | `z(t) = (1 - t)${A} + t${texParen(add(e.a, e.d))} = (${texLinearT(e.a.re, e.d.re)}) + i(${texLinearT(e.a.im, e.d.im)})` | `z(t) = ${texPolarDec(e.a)} + t\cdot ${texPolarDec(e.d)}` (drop `texPolarDec(e.a) + ` when the start is 0) |
| circle | `z(t) = ${hasA ? A + ' + ' : ''}${D}(\cos 2\pi t ${sg} i\sin 2\pi t)` | `z(t) = ${hasA ? cart(A) + ' + ' : ''}${R}e^{i(${phaseTex(Arg(e.d), e.conjL ? -1 : 1, 2)})}` with `R = abs(e.d)` printed as `dec(R) + '\\,'` unless `\|R - 1\| < 1e-9` |
| arc | as circle with `\pi t` in place of `2\pi t` | as circle with `phaseTex(..., 1)` |
| eight | `z(t) = ${hasA ? A + ' + ' : ''}${D}\,\dfrac{\cos 2\pi t ${sg} i\sin 2\pi t\cos 2\pi t}{1 + \sin^2 2\pi t}` | `r^2 = ${dec(R*R)}\cos 2${vt},\ \text{measured from the centre}` where `vt = '\vartheta'` when `\|phi\| < 1e-9`, else `(\vartheta ${phi < 0 ? '+' : '-'} ${dec(Math.abs(phi))})`; `R = abs(e.d)`, `phi = Arg(e.d)` |
| square | `z(t) = ${hasA ? A + ' + ' : ''}${D}\,Q(t),\quad Q:\ ${e.conjL ? '1\to -i\to -1\to i\to 1' : '1\to i\to -1\to -i\to 1'}` | `z(t) = ${hasA ? cart(A) + ' + ' : ''}${dec(R)}\,e^{i\,${dec(phi)}}\,Q(t)` |

Segment default (pinned, because the goal's A2 reads `#curves-ex-z-cart`): `z(t) = (1 - t)(2 + i) + t(-3 - 3i) = (2 - 5t) + i(1 - 4t)`
and polar `z(t) = 2.236\,e^{i\,0.464} + t\cdot 6.403\,e^{-i\,2.467}`. Reversed segment: `z(t) = (1 - t)(-3 - 3i) + t(2 + i) = (-3 + 5t) + i(-3 + 4t)`.
Circle default: cart `z(t) = (1 + i) + 2(\cos 2\pi t + i\sin 2\pi t)`, polar `z(t) = (1 + i) + 2\,e^{i(2\pi t)}` (the `(1 + i)` wrapped in `cart()`). Eight default: cart
`z(t) = 3\,\dfrac{\cos 2\pi t + i\sin 2\pi t\cos 2\pi t}{1 + \sin^2 2\pi t}`. Square default: cart `z(t) = (1.5 + 1.5i)\,Q(t),\quad Q:\ 1\to i\to -1\to -i\to 1`, polar `z(t) = 2.121\,e^{i\,0.785}\,Q(t)`.
Half circle default: cart `z(t) = 3(\cos \pi t + i\sin \pi t)`, polar `z(t) = 3\,e^{i(\pi t)}`; reversed: cart `z(t) = (-3)(\cos \pi t - i\sin \pi t)`, polar `z(t) = 3\,e^{i(3.142 - \pi t)}`.
Eight default: polar `r^2 = 9\cos 2\vartheta,\ \text{measured from the centre}`.

**Row `now`, label `z at this t`.** `cart`: `x(t) = ${dec(z.re)},\ y(t) = ${dec(z.im)}`. `polar`: `|z| < 1e-9` gives
`r = 0,\ \Arg z\ \text{is undefined}`, else `r = ${dec(abs(z))},\ \Arg z = ${dec(Arg(z))}`. (`\Arg` is a predefined macro.)

**Row `vel`, label `how it moves`.** `cart`: `z'(t) = ${fmtCart(dz)}`. `polar`: `null` when `|dz| < 1e-9`, else
`\text{speed } ${dec(abs(dz))},\ \text{heading } \Arg z' = ${dec(Arg(dz))}\ (${fmtNum(Arg(dz) * 180 / Math.PI, 1)}^\circ)`.

**Footer `same`:** `explainerSame(s) = { cart: fmtCart(s.z), polar: texPolarDec(s.z), agree: eq(fromPolar(abs(s.z), Arg(s.z)), s.z, 1e-9) }`.

#### 5.1.10 `flush`, scheduling, play

```
scheduleFlush(curveChanged): if (curveChanged) dirtyCurve = true; if (!rafFlush && !destroyed) rafFlush = requestAnimationFrame(flush)

flush():
  rafFlush = 0; if (destroyed) return
  if (dirtyCurve):
    S.curve = buildCurve(S.preset, S.a, S.b, S.reversed)
    try { S.cls = describeCurve(S.curve); setNote('') } catch (e) { S.cls = null; setNote('I could not work out the kind of this curve.') }
    curveLayer.update(S.curve.points); renderChecks(); updateOrientButton(); dirtyCurve = false
  S.z = curveAt(S.preset, S.a, S.b, S.t, S.reversed); S.dz = velocityAt(S.preset, S.a, S.b, S.t, S.reversed)
  curveLayer.setCursor(S.t)
  if (Number(slider.value) !== S.t) slider.value = String(S.t)
  tOut.textContent = fmtNum(S.t, 2); slider.setAttribute('aria-valuetext', `t = ${fmtNum(S.t)}, z = ${fmtCart(S.z)}`)
  readout.textContent = readoutText(S.preset, S.a, S.b, S.reversed, S.t)
  explainer.update(explainerState(S.preset, S.a, S.b, S.reversed, S.t))
  plane.requestDraw()

renderChecks(): for each of the five keys, set chip.dataset.answer, chip.textContent, why.textContent from classificationTexts
updateOrientButton(): ok = !!S.cls && S.cls.closed && S.cls.simple
                      orientBtn.disabled = !ok; orientBtn.title = ok ? 'Walk the curve the other way round.' : 'Only a simple closed curve has an orientation.'

startPlay():  if (ctx.theme.prefersReducedMotion()) { stepQuarter(); return }
              if (S.t >= 1 - 1e-9) S.t = 0
              S.playing = true; lastTs = null; setPlayLabel('Pause'); rafPlay = requestAnimationFrame(tick)
tick(ts):     if (!S.playing || destroyed) return
              if (lastTs === null) lastTs = ts
              dt = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts
              S.t = Math.min(1, S.t + dt / PLAY_SECONDS); scheduleFlush(false)
              if (S.t >= 1) { stopPlay('Replay'); return }
              rafPlay = requestAnimationFrame(tick)
stopPlay(label = 'Play'): S.playing = false; cancelAnimationFrame(rafPlay); setPlayLabel(ctx.theme.prefersReducedMotion() ? 'Step by 1/4' : label)
stepQuarter(): k = Math.floor(S.t * 4 + 1e-9) + 1; S.t = k > 4 ? 0 : k / 4; scheduleFlush(false)
slider 'input': stopPlay(); S.t = clamp(Number(slider.value), 0, 1); scheduleFlush(false)
```
Under reduced motion the label is `Step by 1/4` from mount. The dt cap (0.1 s) keeps a tab that was in the background from jumping.

#### 5.1.11 `mount(el, ctx)` order

1. `ensureStyle()` (the `data-for="curves"` style, once).
2. `const { preset, unknown } = resolvePreset(ctx.preset)`: problem `1.5.1` or none or topic: `segment`; token: `presetFromToken(token)` or `segment` with `unknown = token`.
3. Build the DOM with `createElement` and constant templates (no untrusted text): header (h1, lede, thread badges, problem chip `<a class="chip problem-chip" href="#problem-1-5-1" title={aha}>1.5.1</a>` via `problemsForStation('curves')`), the problem card (2.9) for `1.5.1`, the preset chips, the `.cv-work` grid, the explainer panel, the takeaway callout, the next callout, the status region, the links nav (5.1.12). `#curves-note` text for `unknown` goes through `textContent`.
4. `plane = createPlane(planeHost, { id: 'curves-plane', xRange: [-4, 5], yRange: [-4, 5], grid: 'cart', axes: true, axisLabels: ['x', 'y'], interactive: true, maxWidth: 520, legend: true, ariaLabel: 'Complex plane with the curve z(t)' })`.
5. Layers and curve (5.1.8); `rebuildHandles()`.
6. `explainer = createExplainer(exHost, spec)`.
7. State `S` (4.1.5) with `S.memory` from `PRESET_DEFAULTS` (deep-copied) and the preset loaded **without** a rAF: call `flush()` once synchronously so the readout and the explainer are never empty.
8. Wire events (chips, buttons, slider, checkbox, play).
9. Hooks `window.__mv.curves`.
10. No window or document listener is needed (the plane and the explainer follow `themechange` themselves); return `unmount`.

#### 5.1.12 Links nav (both stations)

```
buildLinks(ctx):                                     // returns <nav class="station-links" aria-label="Other places">
  cur = ctx.station; list = ctx.stations
  prev = list.find((s) => s.order === cur.order - 1); next = list.find((s) => s.order === cur.order + 1)
  items = []
  if (prev) items.push({ s: prev, dir: 'prev', thread: null })
  if (next) items.push({ s: next, dir: 'next', thread: null })
  for (th of cur.threads):
    p = last of list with order < cur.order and threads.includes(th); n = first with order > cur.order and threads.includes(th)
    if (p && !items.some((i) => i.s.id === p.id)) items.push({ s: p, dir: 'prev', thread: th })
    if (n && !items.some((i) => i.s.id === n.id)) items.push({ s: n, dir: 'next', thread: th })
  each item: <a class="station-link" href="#id" data-dir data-thread? >title</a>
```
For `curves` this gives prev Roots, next Sets (the T3 neighbour is also Sets, so no duplicate). For `linear`: prev Mappings, next Powermap (T1 and T3 neighbours are the same two). `linear` appends `#linear-open-lab` inside the same nav.

### 5.2 `linear`

#### 5.2.1 `stageInfo(s)`

```
function stageInfo(s):
  v = clamp(Number.isFinite(s) ? s : 0, 0, 3)
  if (v <= 1e-9) return { stage: 0, phase: 'start', fraction: 0, done: true }
  phase = v <= 1 ? 'spin' : v <= 2 ? 'stretch' : 'slide'
  fraction = phase === 'spin' ? v : phase === 'stretch' ? v - 1 : v - 2
  return { stage: phase === 'spin' ? 1 : phase === 'stretch' ? 2 : 3, phase, fraction, done: Math.abs(v - Math.round(v)) < 1e-9 }
```
Pinned: `s = 0` gives `{0, 'start', 0, true}`; `0.5` gives `{1, 'spin', 0.5, false}`; `1` gives `{1, 'spin', 1, true}`; `1.25` gives `{2, 'stretch', 0.25, false}`;
`2` gives `{2, 'stretch', 1, true}`; `2.75` gives `{3, 'slide', 0.75, false}`; `3` gives `{3, 'slide', 1, true}`; `NaN` gives the `s = 0` result.

#### 5.2.2 `stageMap(a, b, s)`: the whole plane, one stage at a time

```
function stageMap(a, b, s):
  v = clamp(Number.isFinite(s) ? s : 0, 0, 3)
  alpha = Arg(a)                                         // Arg(0) = 0 by convention
  mag = abs(a)
  if (v <= 1): rot = expi(alpha * v);                    return (z) => mul(rot, z)                    // spin by v * Arg a
  if (v <= 2): k = 1 + (v - 1) * (mag - 1); rs = scale(expi(alpha), k); return (z) => mul(rs, z)       // stretch factor goes 1 -> |a| (linear)
  ub = scale(b, v - 2);                                  return (z) => add(mul(a, z), ub)             // slide goes 0 -> b; at v = 3 it is exactly az + b
```
The three moves are the motion of the *plane*, so every point (the input, the grid, the dots, the unit step) is carried by the same `stageMap`.
At `v = 3` the map is `mul(a, z) + b` exactly (not a polar rebuild), so the final image is exact. The scale factor is interpolated linearly
(`1 + u(|a| - 1)`), not geometrically, so `a = 0` is allowed (the stretch goes to 0).

#### 5.2.3 Inputs, grids, images

```
inputCurve('x2')   = verticalLine(2, { yRange: LINE_Y_RANGE, n: 128 })       // 129 points, point k = 2 + i(-4 + 8k/128), t = k/128
inputCurve('unit') = circle(C(0, 0), 1, { n: 128 })                          // 129 points, closed, point 0 = 1, t = k/128, counterclockwise
inputCurve(other)  = null
gridCurves('cart')  = cartGrid({ xRange: [-4, 4], yRange: [-4, 4], step: 1, n: 48 })     // 9 + 9 curves, family 'cart'
gridCurves('polar') = polarGrid({ rMax: 4, rings: 4, rays: 12, n: 96 })                  // 4 + 12 curves, family 'polar'
gridCurves('off')   = []
imagePieces(curve, a, b, s, clampRadius = 40) = curve ? pushForward(curve, stageMap(a, b, s), { clampRadius }) : []
clampRadiusFor(view, size) = Math.max(40, 3 * Math.max(halfW, halfH) + Math.hypot(view.center.re, view.center.im)),
                             halfW = view.unitsAcross / 2, halfH = halfW * size.h / size.w
```

#### 5.2.4 The planes

```
zplane  = createPlane(zHost, { id: 'linear-zplane', xRange: [-5.4, 5.4], yRange: [-4.5, 4.5], grid: 'none', axes: true, axisLabels: ['x', 'y'],
                               interactive: true, maxWidth: 560, legend: true, ariaLabel: 'z-plane: the input shape' })
wplane  = createPlane(wHost, { id: 'linear-wplane', ..., axisLabels: ['u', 'v'], ariaLabel: 'w-plane: the image under f' })
abPlane = createPlane(abHost, { id: 'linear-ab', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'both', axes: true, axisLabels: ['x', 'y'],
                                interactive: true, maxWidth: 360, legend: false, ariaLabel: 'Choose a and b' })
ptr = false                                                                  // the magnet is for pointer drags only (as in curves, 5.1.6)
snapAB = (z) => (ptr ? magnet(z) : C(z.re, z.im))
aHandle = abPlane.addPoint({ id: 'a', z: S.a, color: '--polar', label: 'a', name: 'a', step: 0.5, snap: snapAB, onDragStart: () => { ptr = true }, onDrag: (z, info) => { if (info.final) ptr = false; S.a = C(z.re, z.im); scheduleFlush({ image: true, compose: true }) } })
bHandle = abPlane.addPoint({ id: 'b', z: S.b, color: '--cart',  label: 'b', name: 'b', step: 0.5, snap: snapAB, onDragStart: () => { ptr = true }, onDrag: (z, info) => { if (info.final) ptr = false; S.b = C(z.re, z.im); scheduleFlush({ image: true, compose: true }) } })
```
`grid: 'none'` on both stage planes is on purpose: the carried grid is drawn by the station, so the w-plane shows only the grid that *moved*.

Control-plane layers (`linear-ab`, order 0): `drawSegment(c, p, ZERO, S.b, { color: '--cart', arrow: true, width: 2 })`; `drawCartAddress(c, p, S.b, { color: '--cart', labels: true })`;
and, unless `abs(S.a) < 1e-9`, `drawPolarAddress(c, p, S.a, { color: '--polar', labels: true, ghosts: 2, ghostsNeg: 1, name: 'a' })`.

Stage-plane layers (draw code):

```
gridLayer(plane, getCurves):                                             // order 10, both stage planes
  plane.addLayer((c, p) => { alpha = ctx.theme.getTheme() === 'dark' ? 0.5 : 0.4
    for (cu of getCurves()) drawTimedCurve(c, p, cu.points, { color: cu.family === 'cart' ? '--cart' : cu.family === 'polar' ? '--polar' : '--text-muted',
                                                              ramp: false, dots: false, arrow: false, width: 1, alpha }) }, { order: 10 })
zCurve  = zplane.addCurve({ id: 'input', points: [], color: '--input', ramp: true, width: 3, dots: true, arrow: true, closed: false, order: 100 })
ghost   = wplane.addCurve({ id: 'ghost', points: [], color: '--input', ramp: false, width: 2, dots: false, arrow: false, dash: DASH.guide, alpha: 0.45, order: 50 })
imageLayers = []                                                          // wplane.addCurve per piece, ramp true, color '--output', width 3, order 100
draftLayer = zplane.addLayer(draw the raw samples of S.drawing as a polyline, '--input', width 2.5, no ramp), { order: 120 }

zMarks (order 150): if (S.vectors) drawSegment(c, p, ZERO, C(1, 0), { color: '--text-muted', arrow: true, width: 2 })
                    drawDot(c, p, ZERO, { color: '--text', radius: 4, label: '0' }); drawDot(c, p, C(1, 0), { color: '--text', radius: 4, label: '1' })
                    if (fp) drawDot(c, p, fp, { color: '--text', radius: 5, label: 'fixed point' })
wMarks (order 150): f = stageMap(S.a, S.b, S.stage); info = stageInfo(S.stage); w0 = f(ZERO); w1 = f(C(1, 0)); done3 = info.stage === 3 && info.done
                    if (S.vectors) { if (abs(w0) > 1e-9) drawSegment(c, p, ZERO, w0, { color: '--cart', dash: DASH.cart, arrow: true, width: 2.5 })
                                     drawSegment(c, p, w0, w1, { color: '--polar', arrow: true, width: 2.5 })
                                     if (done3) { drawLabel(c, p, mid(w0, w1), 'a', { color: '--polar', dx: 6, dy: -6 }); if (abs(w0) > 1e-9) drawLabel(c, p, mid(ZERO, w0), 'b', { color: '--cart', dx: 6, dy: -6 }) } }
                    drawDot(c, p, w0, { color: '--text', radius: 4, label: done3 ? 'f(0)' : '0' }); drawDot(c, p, w1, { color: '--text', radius: 4, label: done3 ? 'f(1)' : '1' })
                    if (fp && done3) drawDot(c, p, fp, { color: '--text', radius: 5, label: 'fixed point' })
```
`fp = fixedPoint(S.a, S.b)`; `mid(u, v) = C((u.re + v.re) / 2, (u.im + v.im) / 2)`.

#### 5.2.5 `flush` (what recomputes when)

```
pending = { input, grid, image, cursor, compose }                         // OR-ed by scheduleFlush(flags)
flush():
  rafFlush = 0; if (destroyed) return
  if (pending.input):  S.inCurve = S.input === 'stroke' ? S.stroke : inputCurve(S.input)
                       zCurve.update(S.inCurve ? S.inCurve.points : []); ghost.update(S.inCurve ? S.inCurve.points : [])
                       tSlider.disabled = !S.inCurve; clearBtn.disabled = !(S.input === 'stroke' && S.stroke); setStrokeHint()
                       pending.image = true
  if (pending.grid):   S.gridZ = gridCurves(S.grid); pending.image = true
  if (pending.image):  clamp = clampRadiusFor(wplane.getView(), wplane.getSize()); f = stageMap(S.a, S.b, S.stage)
                       S.pieces = imagePieces(S.inCurve, S.a, S.b, S.stage, clamp)
                       syncImageLayers(S.pieces)
                       S.gridW = pushForwardAll(S.gridZ, f, { clampRadius: clamp })
                       publishImage(S.pieces)                                  // window.__mv.linearImage (4.2.4)
                       offscreen.hidden = !(S.pieces.length > 0 && noPointInView(S.pieces, wplane))
  cursor:              zCurve.setCursor(S.inCurve ? S.t : null); for (l of imageLayers) l.setCursor(S.inCurve ? S.t : null)
  text:                readout.textContent = readoutText(S.a, S.b); caption.textContent = stageCaption(S.a, S.b, S.stage)
                       stageOut.textContent = fmtNum(S.stage, 2); stageSlider aria-valuetext = caption; tOut.textContent = fmtNum(S.t, 3)
                       note.hidden = !(abs(S.a) < 1e-9); stairs.update(abs(S.a) < 1e-9 ? null : Arg(S.a))
  explainers:          zt = S.inCurve ? pointAt(S.inCurve, S.t) : null
                       exMain.update(explainerState(S.a, S.b, zt)); if (pending.compose || pending.image || pending.cursor) exComp.update(composeState(S.a, S.b, S.c, S.d, zt))
                       composeReadoutEl.textContent = composeReadout(S.a, S.b, S.c, S.d); composeNote.hidden = !(abs(S.a) < 1e-9 || abs(S.c) < 1e-9)
  pending = all false; zplane.requestDraw(); wplane.requestDraw(); abPlane.requestDraw()

syncImageLayers(pieces):
  for i in 0 .. pieces.length - 1: if (imageLayers[i]) imageLayers[i].update(pieces[i].points) else imageLayers.push(wplane.addCurve({ id: 'image' + i, points: pieces[i].points, color: '--output', ramp: true, width: 3, dots: true, arrow: true, closed: false, order: 100 }))
  while (imageLayers.length > pieces.length) imageLayers.pop().remove()
noPointInView(pieces, plane): v = plane.getView(), s = plane.getSize(); halfW = v.unitsAcross / 2; halfH = halfW * s.h / s.w
  return pieces.every((pc) => pc.points.every((p) => Math.abs(p.re - v.center.re) > halfW || Math.abs(p.im - v.center.im) > halfH))
```
The image points are the `pushForward` pieces' own points (each with its own `t`; not resampled, not re-timed): this is goal criterion A5. The ring
at `S.t` is drawn by the plane from the same points (`pointAtT`), and is absent for a piece whose t-range excludes `S.t`.

`zt` uses `shapes.pointAt` (linear interpolation on t). The two defaults, t = 0.875 on the line (vertex 112 of 128) and t = 0.125 on the circle (vertex 16 of 128), are sample vertices, so
`zt` is exact there: `2 + 3i` and `e^{iπ/4} = 0.707 + 0.707i`. Between vertices the unit circle's point is a chord point (at most 3.0e-4 plane units from the exact point), which the
explainer's three decimals show at most as a change in the last digit.

#### 5.2.6 The explainer (main) and the staircase

```
exMain = createExplainer(exHost, { id: 'linear-ex',
  columns: [ { key: 'cart',   heading: 'Cartesian (slide)',        tone: '--cart',   tint: true },
             { key: 'polar',  heading: 'Polar (spin-and-stretch)', tone: '--polar',  tint: true },
             { key: 'motion', heading: 'As a motion',              tone: '--output', short: 'motion' } ],
  rows: explainerRows(), same: explainerSame })
stairs = createStaircase(stairsHost, { id: 'linear-stairs', label: 'arg a', kMin: -1, kMax: 1 })
```
`explainerState(a, b, z)` = `{ a, b, z, w: z ? add(mul(a, z), b) : null, p: fixedPoint(a, b), info: describeLinear(a, b) }`. Rows (`dec`, `texParen`, `texPolarDec`,
`texAngleDual` as in 5.1.9; `deg = fmtNum(x, 1)`; `isZero = abs(a) < 1e-9`):

| row id | label | `cart(s)` | `polar(s)` | `motion(s)` (`{ text }`) | native |
|---|---|---|---|---|---|
| `a` | `a: the multiplier` | `a = ${fmtCart(a)}` | isZero: `a = 0`; else `\|a\| = ${dec(abs(a))},\ \Arg a = ${texAngleDual(Arg(a))}` | isZero: `squash everything onto b`; else `spin by Arg a = ${deg(spinDeg)} degrees, stretch by \|a\| = ${fmtNum(abs(a))}` | `polar` |
| `b` | `b: the shift` | `b = ${fmtCart(b)}` | `abs(b) < 1e-9`: `b = 0`; else `\|b\| = ${dec(abs(b))},\ \Arg b = ${texAngleDual(Arg(b))}` | `abs(b) < 1e-9`: `no slide (b = 0)`; else `slide by ${fmtCart(b)}` | `cart` |
| `f` | `f(z) = az + b` | `u = ${texTerms([[p,'x'],[-q,'y'],[r,'']])},\ v = ${texTerms([[q,'x'],[p,'y'],[s,'']])}` with `p = a.re, q = a.im, r = b.re, s = b.im` | isZero: `f(re^{i\theta}) = ${texParen(b)}`; else `f(re^{i\theta}) = ${m}r\,e^{i${ang}}${abs(b) < 1e-9 ? '' : ' + ' + texParen(b)}` with `m = ''` if `abs(abs(a) - 1) < 1e-9` else `dec(abs(a)) + '\\,'`, and `ang = Math.abs(Arg(a)) < 1e-9 ? '\\theta' : '(\\theta ' + (Arg(a) < 0 ? '- ' : '+ ') + dec(Math.abs(Arg(a))) + ')'` | `turn by ${deg(spinDeg)} degrees, scale by ${fmtNum(abs(a))}` then, for `abs(b) < 1e-9`, `, no slide`, else `, then slide by ${fmtCart(b)}` | none |
| `fixed` | `centre of the move` | `p`: `p = b/(1 - a) = ${fmtCart(p)}`; none: isZero: `\text{every point goes to } b`, else `\text{none: a = 1 is a pure slide}` | `p`: `abs(p) < 1e-9` ? `p = 0` : `\|p\| = ${dec(abs(p))},\ \Arg p = ${texAngleDual(Arg(p))}`; none: `null` | `p`: `the point that does not move: the centre of the spin and the stretch`; none: `''` (empty cell) | none |
| `zt` | `followed point z(t)` | `z`: `z = ${fmtCart(z)}`; no z: `null` | `abs(z) < 1e-9`: `z = 0`; else `\|z\| = ${dec(abs(z))},\ \Arg z = ${texAngleDual(Arg(z))}` | `z`: `the dot before the move`; else `null` | none |
| `wt` | `where f sends it` | `w`: `w = az + b = ${fmtCart(w)}`; no z: `null` | `abs(w) < 1e-9`: `w = 0`; else `\|w\| = ${dec(abs(w))},\ \Arg w = ${texAngleDual(Arg(w))}` | `w`: `the same dot after the move`; else `null` | none |

`explainerSame(s) = s.z ? { cart: fmtCart(s.w), polar: texPolarDec(s.w), agree: eq(fromPolar(abs(s.w), Arg(s.w)), s.w, 1e-9) } : null`.
`texTerms(terms)`: drop terms with `|coef| < 1e-9`; each remaining term is `(coefficient magnitude is 1 and the variable is non-empty ? '' : dec(|coef|)) + variable`;
the first term carries `-` if negative, later terms are joined with ` - ` or ` + `; no terms gives `'0'`. Pinned: `texTerms([[0,'x'],[-1,'y'],[0,'']]) = '-y'`,
`texTerms([[1,'x'],[0,'y'],[-2,'']]) = 'x - 2'`, `texTerms([[1,'x'],[-1,'y'],[0,'']]) = 'x - y'`, `texTerms([[1,'x'],[1,'y'],[0,'']]) = 'x + y'`,
`texTerms([[0,'x'],[0,'y'],[0,'']]) = '0'`, `texTerms([[2,'x'],[-0.5,'y'],[1.5,'']]) = '2x - 0.5y + 1.5'`.

#### 5.2.7 Stroke drawing

```
zplane.on('pointerdown', (e) => {
  if (S.input !== 'stroke' || !e.isPrimary || S.drawing) return
  S.drawing = { id: e.pointerId, samples: [e.z] }; draftLayer: zplane.requestDraw(); hint('')
})
zplane.on('pointermove', (e) => {
  if (!S.drawing || e.pointerId !== S.drawing.id) return
  last = S.drawing.samples[S.drawing.samples.length - 1]
  if (S.drawing.samples.length < 3000 && Math.hypot(e.z.re - last.re, e.z.im - last.im) >= 0.5 / zplane.getView().scale) S.drawing.samples.push(e.z)
  zplane.requestDraw()
})
const end = (e) => {
  if (!S.drawing || e.pointerId !== S.drawing.id) return
  raw = S.drawing.samples; if (e.z) raw = raw.concat([e.z]); S.drawing = null
  c = freehand(raw, { minDist: 0.03 })
  if (c.points.length < 2 || curveLength(c) < 0.2) { hint('That was too short to be a stroke. Press, drag, then let go.'); zplane.requestDraw(); return }
  S.stroke = c; scheduleFlush({ input: true })
}
zplane.on('pointerup', end); zplane.on('pointercancel', end)
```
`setStrokeHint()` shows the empty-state text while `S.input === 'stroke'` and there is no stroke and no override message, and hides it otherwise; the "too short" message is an override that lasts until the next `pointerdown`.
`0.5 / scale` is half a screen pixel in plane units, so the draft follows the pointer closely and the freehand call thins it. `freehand` keeps the last
sample and gives `t` by arclength. `setInput(kind)` sets `S.input`, `zplane.setDrawMode(kind === 'stroke')`, the pressed chips, and
`scheduleFlush({ input: true })`; `#linear-stroke-clear` sets `S.stroke = null`.

#### 5.2.8 Stage play

```
startPlay(): if (ctx.theme.prefersReducedMotion()) { S.stage = nextWhole(S.stage); scheduleFlush({ image: true }); return }
             if (S.stage >= 3 - 1e-9) S.stage = 0
             S.playing = true; lastTs = null; setPlayLabel('Pause'); rafPlay = requestAnimationFrame(tick)
tick(ts):    if (!S.playing || destroyed) return
             if (lastTs === null) lastTs = ts
             dt = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts
             S.stage = Math.min(3, S.stage + dt / STAGE_SECONDS); scheduleFlush({ image: true })
             if (S.stage >= 3) { stopPlay('Replay'); return }
             rafPlay = requestAnimationFrame(tick)
nextWhole(s): k = Math.floor(s + 1e-9) + 1; return k > 3 ? 0 : k
stage slider 'input': stopPlay(); S.stage = clamp(Number(stageSlider.value), 0, 3); scheduleFlush({ image: true })
```

#### 5.2.9 Presets, inputs, grid, vectors, fit

```
loadPreset(key, fromChip = false):
  p = PRESETS[key]; S.preset = key; S.a = copy(p.a); S.b = copy(p.b); S.input = p.input; S.grid = p.grid; S.stage = 3; S.t = p.t
  S.c = copy(COMPOSE_DEFAULTS.c); S.d = copy(COMPOSE_DEFAULTS.d); cInput.value = '1+i'; dInput.value = '1'; clear both errors, cOk = dOk = true
  aHandle.set(S.a, { silent: true }); bHandle.set(S.b, { silent: true })
  setChips(); renderProblemCard(cardHost, p.card); zplane.setDrawMode(false)
  scheduleFlush({ input: true, grid: true, image: true, cursor: true, compose: true })
  if (key === 'P3' && fromChip) composePanel.scrollIntoView({ block: 'start', behavior: ctx.theme.prefersReducedMotion() ? 'auto' : 'smooth' })
fitBoth():
  pts = [C(0,0), C(1,0), S.b, add(S.a, S.b)]
  if (S.inCurve) for (k = 0; k < S.inCurve.points.length; k += 4) { z = S.inCurve.points[k]; pts.push(z, add(mul(S.a, z), S.b)) }
  zplane.fitTo(pts, 0.12); wplane.setView(zplane.getView()); wplane.setHome(); scheduleFlush({ image: true })
```
`aHandle.set(z, { silent: true })` does not call `onDrag`. The grid chips set `S.grid` and flag `grid`; the vectors checkbox sets `S.vectors` and requests a draw.

#### 5.2.10 Composition (P3)

```
parseConstant(src):
  s = String(src == null ? '' : src)
  if (s.trim() === '') return { ok: false, message: 'Type a number, for example 1+i.' }
  let c
  try { c = compile(s) } catch (e) { return { ok: false, message: e instanceof ParseError ? e.message : 'I could not read that. Try something like 1+i.' } }
  if (c.uses.size > 0) return { ok: false, message: 'Use a number here, not z, x or y. For example 1+i or -2i.' }
  z = c.f(C(0, 0))
  if (!(Number.isFinite(z.re) && Number.isFinite(z.im))) return { ok: false, message: 'That is not a finite number. Try something like 1+i.' }
  return { ok: true, z: C(z.re, z.im) }

compose(a, b, c, d):
  A = mul(a, c); B = add(mul(a, d), b); argA = Arg(a); argC = Arg(c); sum = argA + argC
  return { A, B, argA, argC, spinSumRad: sum, spinSumDeg: sum * 180 / Math.PI, stretchProduct: abs(a) * abs(c), wrapped: Math.abs(wrapArg(sum) - sum) > 1e-9 }
composeReadout(a, b, c, d) = `ac = ${fmtCart(A)}; ad + b = ${fmtCart(B)}`

input handler (on 'input' of #linear-compose-c or -d):
  r = parseConstant(input.value)
  if (!r.ok) { errorEl.textContent = r.message; input.setAttribute('aria-invalid', 'true'); S[which + 'Ok'] = false }       // S.c / S.d keep the last valid value
  else { errorEl.textContent = ''; input.removeAttribute('aria-invalid'); S[which] = r.z; S[which + 'Ok'] = true }
  scheduleFlush({ compose: true })
```
If both errors are present the first message is shown (c before d). `composeState(a, b, c, d, z)` = `{ a, b, c, d, z: z || C(1, 0), A, B, info: compose(...), lhs: a(cz + d) + b, rhs: (ac)z + (ad + b) }`.

Compose rows (`explainer id: 'linear-comp-ex'`, same three columns as the main one):

| row id | label | `cart(s)` | `polar(s)` | `motion(s)` | native |
|---|---|---|---|---|---|
| `coeff` | `ac: the new multiplier` | `a c = ${texParen(a)}${texParen(c)} = ${fmtCart(A)}` | `abs(a) < 1e-9 or abs(c) < 1e-9`: `null`; else `\|a\|\|c\|\,e^{i(\Arg a + \Arg c)} = ${dec(abs(a))}\cdot ${dec(abs(c))}\,e^{i(${dec(Arg(a))} + ${dec(Arg(c))})}` | `spins add: ${deg(a)} and ${deg(c)} give ${deg(sum)} degrees. Stretches multiply: ${m(a)} x ${m(c)} = ${m(ac)}.` and, when `wrapped`, ` ${dec(sum)} is past π, so the home step is Arg(ac) = ${dec(wrapArg(sum))}.` (`past -π` for a negative sum; exactly -π reads `is not in (-π, π]`; see D8) | `polar` |
| `shift` | `ad + b: the new shift` | `a d + b = ${texParen(a)}${texParen(d)} + ${texParen(b)} = ${fmtCart(B)}` | `abs(B) < 1e-9`: `ad + b = 0`; else `\|ad + b\| = ${dec(abs(B))},\ \Arg(ad + b) = ${texAngleDual(Arg(B))}` | `Spin and stretch d by a, then slide by b.` | `cart` |
| `check` | `check at one point` | `\text{at } z = ${fmtCart(z)}:\ a(cz + d) + b = ${fmtCart(lhs)},\ \ (ac)z + (ad + b) = ${fmtCart(rhs)}` | `${texPolarDec(lhs)}\ \text{and}\ ${texPolarDec(rhs)}` | `Two moves in a row are one move.` | none |

Footer: `{ cart: fmtCart(lhs), polar: texPolarDec(lhs), agree: abs(sub(lhs, rhs)) < 1e-9 }`. `deg(x)` is `fmtNum(Arg(x) * 180 / Math.PI, 1)`; `m(x)` is `fmtNum(abs(x))`.

#### 5.2.11 The Lab hand-off

```
labRequest({ a, b, input }):
  fn = eq(a, I) && eq(b, C(0, -2)) ? 'linear-i'
     : eq(a, C(1, 1)) && eq(b, ZERO) ? 'linear-1i'
     : { src: `(${fmtCart(a)})*z + (${fmtCart(b)})` }
  shapes = input === 'x2' ? [{ kind: 'verticalLine', x: 2 }]
         : input === 'unit' ? [{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }] : []
  problem = (input === 'x2' && fn === 'linear-i') ? '2.1.3' : (input === 'unit' && fn === 'linear-1i') ? 'P4' : null
  return { fn, shapes, view: 'side', problem, predictFirst: false }
#linear-open-lab click: ctx.store.set('lab.request', labRequest({ a: S.a, b: S.b, input: S.input }), { persist: false }); ctx.navigate('lab')
```
`eq` uses its default 1e-9. A stroke is not handed over (`shapes: []`): the Lab has no freehand shape kind, so the student draws there.
`fmtCart` writes decimals, `i` and an ASCII minus, which is valid `parse.js` input as written; examples `(i)*z + (-2i)`, `(1.5 - 0.25i)*z + (0.5)`.

#### 5.2.12 `mount(el, ctx)` order

1. `ensureStyle()`.
2. `const { key, input, unknown } = resolvePreset(ctx.preset)`; `PRESETS[key]` fills the state; the stage is 3.
3. Build the DOM in the order of the table in 2.7 (`compose placed`): header, card, [compose if P3], presets, stage block (two planes, sticky bar), controls, ab panel, explainer, [compose], back callout, links.
4. Create the three planes, handles, layers (5.2.4), the staircase and both explainers.
5. State `S`; call `flush()` once **synchronously** with every pending flag set, so `window.__mv.linearImage`, the readout and the explainers exist at once.
6. Wire events; hooks (`linearImage` is already published by the first flush; add `window.__mv.linear`).
7. `wplane.on('viewchange', () => scheduleFlush({ image: true }))` (the clamp radius follows the view), then, **last of all** (fix round 2, ARCHITECTURE 10.1.4), the plane keeper's
   `ResizeObserver` and its `window.addEventListener('scroll', onPageScroll, { passive: true })`, and return `unmount`. No theme subscription is needed.

#### 5.2.13 The plane keeper, the composition readout, the dot words (fix rounds 1 and 2)

- **Plane keeper** (fix round 1, finding 2): while `a` or `b` has moved in the last 1.5 s, a size change above the control plane scrolls the page by the same amount, so the plane stays
  under the pointer (Chromium's scroll anchoring does this by itself, Safari has none). `holdAnchor()` runs on every drag step; the `ResizeObserver` (`onResize`) compares the plane's top with the
  place held and calls `window.scrollBy`; the page `scroll` listener (`onPageScroll`) takes over when someone else scrolls. The observer and the listener are attached at the end of `mount` and removed in `unmount`.
- **Composition readout**: `composeReadoutParts(a, b, c, d)` returns `['ac = <cart>;', 'ad + b = <cart>']`; the DOM holds the two as `<span class="ln-nw">` (the first ends with a space), so `textContent`
  is still `ac = ...; ad + b = ...`. On a wide screen the spans are inline and nowrap (one line); under 30 rem they are blocks (two lines, always). Numbers such as `c = 123.456+78.9i` therefore never make the box scroll.
- **Dot words on the w-plane**: `dotWords({ done, same, close })` gives the words for `f(0)` and `f(1)`: `['f(0)', 'f(1)']` (`['0', '1']` before stage 3); when the two image points are the same point
  (`a = 0`: `f` sends everything to `b`) one label, `f(0) = f(1) = b` (`0 = 1` before stage 3); when they are closer than 36 px, one label `f(0), f(1)` (`0, 1`).

---

## 6. Mathematics

Every number below was computed by hand and re-computed with the real `complex.js` and `shapes.js` (prototype in the scratchpad, not
committed). Decimals are rounded to 3 places; the unit tests use the tolerances in section 7.2. Angles are radians unless marked.

### 6.1 Formulas used by `curves`

| # | Formula |
|---|---|
| F1 | A curve is `z(t) = x(t) + i y(t)`, `0 <= t <= 1`; `-C` is `z(1 - t)`. |
| F2 | Segment from `z0` to `z1`: `z(t) = z0 + t(z1 - z0) = (1 - t) z0 + t z1`; `x(t) = x0 + t(x1 - x0)`, `y(t) = y0 + t(y1 - y0)`; `z'(t) = z1 - z0`; length `\|z1 - z0\|`. |
| F3 | Every preset is `z(t) = a + (b - a) L(t)`: `(b - a)` spins by `Arg(b - a)` and stretches by `\|b - a\|`, `a` slides (the linear map of the next station). |
| F4 | Circle: `L(t) = e^{2 pi i t}`, so `z(t) = a + R e^{i(phi + 2 pi t)}` with `R = \|b - a\|`, `phi = Arg(b - a)`; `x = a_x + R cos(phi + 2 pi t)`, `y = a_y + R sin(phi + 2 pi t)`; `z'(t) = 2 pi i (z(t) - a)`: the velocity is the radius vector turned a quarter turn left and stretched by 2 pi; speed `2 pi R`. |
| F5 | Half circle: `L(t) = e^{i pi t}`; speed `pi R`; ends at `2a - b`. |
| F6 | Figure eight (Bernoulli lemniscate): `L(t) = (cos th + i sin th cos th) / (1 + sin^2 th)`, `th = 2 pi t`. It satisfies `\|L\|^2 = cos 2 vartheta` where `vartheta = Arg L` (see 6.5), so `z` satisfies `r^2 = R^2 cos 2(vartheta - phi)` with `r`, `vartheta` measured from the centre `a`, `R = \|b - a\|`, `phi = Arg(b - a)`. It passes through the centre at `t = 1/4` and `t = 3/4`. |
| F7 | Square: vertices `a + (b - a) i^k`, `k = 0..3`, a quarter of the time on each side; side length `R sqrt 2`; `z'` is constant on a side: `4(b - a) i^k (i - 1)`; speed `4 R sqrt 2` (the perimeter). |
| F8 | Smooth: `z'(t)` exists, is continuous and never 0. Piecewise smooth: finitely many smooth pieces. Closed: `z(1) = z(0)`. Simple: no crossing except possibly `z(0) = z(1)`. Positive orientation: for a simple closed curve the signed area `A = 1/2 sum (x_k y_{k+1} - x_{k+1} y_k)` is positive (interior on the left, counterclockwise). |
| F9 | Polar address of the cursor: `r = \|z\| = sqrt(x^2 + y^2)`, `Arg z = atan2(y, x)` in `(-pi, pi]`; the set `arg z = { Arg z + 2 pi k }`; `z = r e^{i Arg z}` for every element. |
| F10 | Reversal as a reparametrisation: closed presets `L(1 - t) = conj L(t)`; half circle `L(1 - t) = -conj L(t)`; segment `L(1 - t) = 1 - t`. |

### 6.2 Problem 1.5.1 in both addresses

**Statement.** Find a parameterization of the line from `2 + i` to `-3 - 3i`.

**Cartesian (a slide that grows with t; this is the native address).**
1. Step: `d = z1 - z0 = (-3 - 3i) - (2 + i) = (-3 - 2) + (-3 - 1)i = -5 - 4i`.
2. `z(t) = z0 + t d = (2 + i) + t(-5 - 4i) = (2 - 5t) + i(1 - 4t)`, `0 <= t <= 1`. Equivalently `z(t) = (1 - t)(2 + i) + t(-3 - 3i)`: expanding, `2 + i - 2t - it - 3t - 3it = (2 - 5t) + i(1 - 4t)`.
3. Checks: `z(0) = 2 + i`; `z(1) = -3 - 3i`; `z(1/2) = -1/2 - i`, which is the midpoint `((2 + i) + (-3 - 3i))/2 = (-1 - 2i)/2`; `z(1/4) = 3/4` (the line crosses the real axis at `x = 0.75`, because `y(t) = 0` at `t = 1/4`); `z(2/5) = -0.6i` (it crosses the imaginary axis at `y = -0.6`, because `x(t) = 0` at `t = 2/5`); `z(3/4) = -1.75 - 2i`.
4. Speed and length: `|z'| = |d| = sqrt(25 + 16) = sqrt 41 = 6.403`, so the segment has length `sqrt 41`.
5. Reversed (`-C`): `z(t) = (-3 + 5t) + i(-3 + 4t)`; `z(0) = -3 - 3i`, `z(1) = 2 + i`, `z'(t) = 5 + 4i`.

**Polar (the step has a tidy address; the points do not).**
1. `z0 = 2 + i`: `r0 = sqrt 5 = 2.236`, `Arg z0 = atan2(1, 2) = 0.464` (26.57 degrees). `z1 = -3 - 3i`: `r1 = 3 sqrt 2 = 4.243`, `Arg z1 = -3 pi/4 = -2.356`.
2. Step `d = -5 - 4i`: `|d| = sqrt 41 = 6.403`, `Arg d = atan2(-4, -5) = -(pi - arctan(4/5)) = -(3.14159 - 0.67474) = -2.467` (-141.34 degrees). So `z(t) = 2.236 e^{i 0.464} + t * 6.403 e^{-i 2.467}`. Check at `t = 1`: `6.403 cos(-2.467) = -5.000`, `6.403 sin(-2.467) = -4.000`, so the sum is `(2 - 5) + (1 - 4)i = -3 - 3i`.
3. The points of the line have no tidy polar address: `r(t)^2 = (2 - 5t)^2 + (1 - 4t)^2 = 41t^2 - 28t + 5`, so `r(1/2) = sqrt 1.25 = 1.118` and `Arg z(1/2) = atan2(-1, -1/2) = -(pi - arctan 2) = -(3.14159 - 1.10715) = -2.034`; the line passes `3/sqrt 41 = 0.469` from the origin at `t = 14/41`. Polar is clumsy for a line; this is the point of the "easy in Cartesian" badge.

The explainer row `z` shows exactly these two forms with live numbers when the segment preset is on.

### 6.3 Values of the five presets (default handles), the numbers the unit tests pin

`z(t)` (tolerance 1e-9; the decimals below are 3-place roundings):

| t | segment (2 + i, -3 - 3i) | circle (centre 1 + i, start 3 + i) | eight (centre 0, tip 3) | square (centre 0, corner 1.5 + 1.5i) | half circle (centre 0, start 3) |
|---|---|---|---|---|---|
| 0 | 2 + i | 3 + i | 3 | 1.5 + 1.5i | 3 |
| 1/8 | 1.375 + 0.5i | 2.414 + 2.414i | 1.414 + i | 1.5i | 2.772 + 1.148i |
| 1/4 | 0.75 | 1 + 3i | 0 | -1.5 + 1.5i | 2.121 + 2.121i |
| 3/8 | 0.125 - 0.5i | -0.414 + 2.414i | -1.414 - i | -1.5 | 1.148 + 2.772i |
| 1/2 | -0.5 - i | -1 + i | -3 | -1.5 - 1.5i | 3i |
| 3/4 | -1.75 - 2i | 1 - i | 0 | 1.5 - 1.5i | -2.121 + 2.121i |
| 1 | -3 - 3i | 3 + i | 3 | 1.5 + 1.5i | -3 |

Exact forms: circle `z(1/8) = 1 + sqrt 2 + (1 + sqrt 2) i`; eight `z(1/8) = sqrt 2 + i` (because `L(1/8) = (sqrt 2/2)(1 + (sqrt 2/2) i)/(3/2) = (sqrt 2 + i)/3`), `z(3/8) = -sqrt 2 - i`, `z(5/8) = -sqrt 2 + i`, `z(7/8) = sqrt 2 - i`;
half circle `z(1/4) = 3 (sqrt 2/2)(1 + i)`.

`z'(t)` (speed, `Arg z'`):

| t | segment | circle | eight | square | half circle |
|---|---|---|---|---|---|
| 0 | -5 - 4i (6.403, -2.467) | 12.566i (12.566 = 4 pi, 1.571) | 18.850i (18.850 = 6 pi, 1.571) | -12 (12, 3.142) | 9.425i (9.425 = 3 pi, 1.571) |
| 1/4 | same | -12.566 (12.566, 3.142) | -9.425 - 9.425i (13.329 = 3 pi sqrt 2, -2.356) | -12i (12, -1.571) | -6.664 + 6.664i (9.425, 2.356) |
| 1/2 | same | -12.566i (12.566, -1.571) | 18.850i (18.850, 1.571) | 12 (12, 0) | -9.425 (9.425, 3.142) |

Square velocities by side (use t values off the corners): `t = 0.1`: -12; `t = 0.3`: -12i; `t = 0.6`: 12; `t = 0.9`: 12i. Reversed defaults (t = 1/2): circle `z' = 12.566i`, eight `-18.850i`,
square `12i`, half circle `9.425` (Arg 0), segment `5 + 4i` (Arg 0.675 = 38.66 degrees).

Cursor in polar (circle, "z at this t", about the origin, not the centre): `z(0) = 3 + i`: `r = 3.162`, `Arg = 0.322`; `z(1/4) = 1 + 3i`: `r = 3.162`, `Arg = 1.249`; `z(1/2) = -1 + i`: `r = 1.414`, `Arg = 2.356 = 3 pi/4`;
`z(3/4) = 1 - i`: `r = 1.414`, `Arg = -0.785 = -pi/4`. Because this circle contains the origin, `Arg z(t)` jumps from `pi` to `-pi` once as t runs (a seam crossing), while the circle's own angle `phi + 2 pi t` grows without a jump:
the same `arg z` versus `Arg z` fact as Thread 2.

### 6.4 Classification of the presets (computed with the real `classify`, 128 segments)

| preset | closed | simple | smooth | piecewise smooth | corners | orientation (forward) | orientation (reversed) | chip `positive` (forward / reversed) |
|---|---|---|---|---|---|---|---|---|
| segment | no | yes | yes | yes | 0 | 0 | 0 | no / no |
| circle | yes | yes | yes | yes | 0 | +1 | -1 | yes / no |
| eight | yes | **no** | yes | yes | 0 | 0 | 0 | no / no |
| square | yes | yes | **no** | yes | 4 | +1 | -1 | yes / no |
| half circle | no | yes | yes | yes | 0 | 0 | 0 | no / no |

This is the goal's A2 table: eight gives `simple` no, `closed` yes; square gives `smooth` no, `piecewise` yes, `positive` yes, and after `#curves-orient` `positive` no.

### 6.5 The eight really is `r^2 = R^2 cos 2 vartheta`

Take `R = 1` (the unit lemniscate). With `s = sin th`, `c = cos th`, `L = c(1 + i s)/(1 + s^2)`, so `u = Re L = c/(1 + s^2)` and `v = Im L = s c/(1 + s^2)`:
`|L|^2 = u^2 + v^2 = c^2 (1 + s^2)/(1 + s^2)^2 = c^2/(1 + s^2)`, and `u^2 - v^2 = c^2 (1 - s^2)/(1 + s^2)^2`. Hence
`cos 2 vartheta = (u^2 - v^2)/(u^2 + v^2) = (1 - s^2)/(1 + s^2)`. Since `c^2 = 1 - s^2`, `|L|^2 = c^2/(1 + s^2) = (1 - s^2)/(1 + s^2) = cos 2 vartheta`. So `|L|^2 = cos 2 vartheta`, and for `z - a = (b - a) L` the
length scales by `R` and the angle gains `phi`: `r^2 = R^2 cos 2(vartheta - phi)`. Numeric: at `t = 1/8`, `z = 1.414 + i`, `r^2 = 3`,
`vartheta = atan2(1, 1.414) = 0.6155`, `9 cos 2(0.6155) = 9 * 0.3333 = 3` (R = 3). The test checks `|r^2 - 9 cos 2 vartheta| < 1e-9` on 200 points with `r > 0.05`, and a rotated and shifted eight
(centre `1 + 0.5i`, `b - a = 3 e^{i pi/6}`) against `r^2 = 9 cos 2(vartheta - pi/6)` to 1e-9.

### 6.6 Formulas used by `linear`

| # | Formula |
|---|---|
| G1 | `f(z) = a z + b`, `a = \|a\| e^{i alpha}` with `alpha = Arg a`, `a != 0`. The motion is: spin by `alpha`, stretch by `\|a\|`, slide by `b`: `f(z) = b + \|a\| e^{i alpha} z`. |
| G2 | Cartesian: `a = p + qi`, `b = r + si`, `z = x + iy`: `u = p x - q y + r`, `v = q x + p y + s`. |
| G3 | Polar: `f(r e^{i theta}) = \|a\| r e^{i(theta + alpha)} + b`: the length is multiplied by `\|a\|`, the angle gains `alpha`. |
| G4 | Fixed point (`a != 1`, `a != 0`): `z* = b/(1 - a)`, and `f(z) - z* = a(z - z*)`: `f` is a spin by `alpha` and a stretch by `\|a\|` **about `z*`**. Proof: `f(z) - z* = az + b - b/(1 - a) = az - ab/(1 - a) = a(z - b/(1 - a))`. |
| G5 | Distances scale by `\|a\|`: `\|f(z1) - f(z2)\| = \|a\|\|z1 - z2\|`; angles between curves and orientation are kept; lines go to lines and circles to circles; `f` of the circle `\|z - c\| = R` is the circle `\|w - f(c)\| = \|a\| R`. |
| G6 | Composition: `f(g(z)) = a(cz + d) + b = (ac) z + (ad + b)`. So `A = ac`, `B = ad + b`; `\|A\| = \|a\|\|c\|`; `Arg A` is `Arg a + Arg c` wrapped onto `(-pi, pi]` (Thm 1.4.14 as sets: `arg(ac) = arg a + arg c`). |
| G7 | Stage maps (5.2.2): `S_s(z) = e^{i alpha s} z` for `0 <= s <= 1`; `(1 + (s - 1)(\|a\| - 1)) e^{i alpha} z` for `1 <= s <= 2`; `a z + (s - 2) b` for `2 <= s <= 3`. Each is continuous at the joins. |
| G8 | The step from 0 to 1: `S_s(0) = (s - 2)^+ b` and `S_s(1) - S_s(0)` is the spun/stretched unit vector; at `s = 3` they are `f(0) = b` and `f(1) - f(0) = a`. |

### 6.7 Stage values

For `a = i`, `b = -2i` (problem 2.1.3), `z = 2 + 3i`: `s = 0`: `2 + 3i`; `s = 0.5`: `e^{i pi/4}(2 + 3i) = -0.707 + 3.536i` (exactly `-0.7071 + 3.5355i`);
`s = 1`: `i(2 + 3i) = -3 + 2i`; `s = 1.5`: `-3 + 2i` (|a| = 1, no stretch); `s = 2`: `-3 + 2i`; `s = 2.5`: `-3 + 2i + 0.5(-2i) = -3 + i`; `s = 3`: `-3 + 2i - 2i = -3`.
The line `x = 2` (`z = 2 + iy`): stage 0: `re = 2`; stages 1 and 2: `w = -y + 2i`, so `im = 2` and `re` runs over `[-4, 4]`; stage 2.5: `im = 1`; stage 3: `w = -y`, `im = 0`.
For `a = 1 + i`, `b = 0` (P4), `z = 1`: `s = 0.5`: `e^{i pi/8} = 0.924 + 0.383i`; `s = 1`: `e^{i pi/4} = 0.707 + 0.707i`; `s = 1.5`: `(1 + 0.5(sqrt 2 - 1)) e^{i pi/4} = 1.2071 * (0.7071 + 0.7071i) = 0.854 + 0.854i`; `s = 2`: `1 + i`; `s = 3`: `1 + i`.
Unit circle: stage 0 and 1: `|w| = 1`; stage 2 and 3: `|w| = sqrt 2 = 1.41421`.

### 6.8 Problem 2.1.3 in both addresses

**Statement.** Find the image of the line `x = 2` under `f(z) = iz - 2i`. What does this linear transformation do to the plane in general?

**Cartesian (the line is a Cartesian shape).** The line is `z = 2 + iy`, `y` in R (this is the time: the station runs `y = -4 + 8t`). Then
`f(z) = i(2 + iy) - 2i = 2i + i^2 y - 2i = -y`. So `w = -y + 0i`: `u = -y`, `v = 0`. Every real number is hit (take `y = -u`), so the image is **the whole real axis, `v = 0`**.
Checks: `z = 2 + 3i` goes to `i(2 + 3i) - 2i = 2i - 3 - 2i = -3`; `z = 2` goes to `0`; `z = 2 - 4i` goes to `4`; `z = 2 + 4i` goes to `-4`. With `u = px - qy + r`, `v = qx + py + s`, `p = 0, q = 1, r = 0, s = -2`:
`u = -y`, `v = x - 2`; on `x = 2`, `v = 0` and `u = -y` (the explainer row `f` shows `u = -y, v = x - 2`).

**Polar (what the map does to the plane).** `iz - 2i = i(z - 2)`: slide left by 2, then multiply by `i = e^{i pi/2}`, which adds `pi/2` (90 degrees) to every angle and keeps every length (`|a| = 1`).
On the line, `z - 2 = iy` has length `|y|` and angle `+-pi/2`; times `i` the angle becomes `pi` (for `y > 0`) or `0` (for `y < 0`): the points land on the negative and positive real axis. In general: **a counterclockwise quarter
turn followed by a slide by `-2i`** (turn about 0 by 90 degrees, then move down 2), or in one move **a quarter turn about the point `1 - i`**: `z* = b/(1 - a) = -2i/(1 - i) = -2i(1 + i)/2 = 1 - i`, and
`f(1 - i) = i(1 - i) - 2i = i + 1 - 2i = 1 - i` (fixed). Distances, angles and orientation are all kept.

On screen: the stage slider at 1 shows the line as `y = 2` (spun about the origin), at 2 nothing more (stretch by 1), at 3 on the real axis. Arg `a = pi/2 = 1.571`, `|a| = 1`, `b = -2i`, centre `1 - i`.

### 6.9 Problem P4 in both addresses

**Statement.** Show that the image of the circle of radius 1 centered at 0 under `f(z) = (1 + i)z` is the circle of radius `sqrt 2` centered at 0.

**Cartesian.** `w = (1 + i)(x + iy) = (x - y) + i(x + y)`. `|w|^2 = (x - y)^2 + (x + y)^2 = 2x^2 + 2y^2 = 2(x^2 + y^2) = 2` on `x^2 + y^2 = 1`, so `|w| = sqrt 2`. Onto: given `w` with `|w| = sqrt 2`,
`z = w/(1 + i) = w(1 - i)/2` has `|z| = sqrt 2 * sqrt 2/2 = 1`, so every point of the big circle is hit.

**Polar.** `1 + i = sqrt 2 e^{i pi/4}`: `|a| = 1.414`, `Arg a = pi/4 = 0.785` (45 degrees). For `z = e^{it}`, `w = sqrt 2 e^{i(t + pi/4)}`: the length is `sqrt 2` for every `t`, the angle `t + pi/4` goes once round as `t` does,
so the image is the whole circle `|w| = sqrt 2`, run counterclockwise (orientation kept). Checks with the station's clock `t` (`z = e^{2 pi i t}`): `t = 0`: `w = 1 + i`; `t = 1/8`: `z = e^{i pi/4}`, `w = sqrt 2 i = 1.414i`; `t = 1/4`: `-1 + i`;
`t = 1/2`: `-1 - i`; `t = 3/4`: `1 - i`. At stage 1 the circle maps onto itself but each dot moves 45 degrees (the dot at `t = 0` goes from `1` to `0.707 + 0.707i`): the time ramp shows the spin on a circle that looks unchanged.

### 6.10 Problem P3 in both addresses

**Statement.** Prove that the composition of two linear transformations is a linear transformation.

**Cartesian (algebra, the native address).** Let `T1(z) = az + b` and `T2(z) = cz + d` with `a, c != 0`. Then `T1(T2(z)) = a(cz + d) + b = acz + ad + b = (ac) z + (ad + b)`. This has the form `Az + B` with `A = ac != 0` and `B = ad + b`, so it is linear.
Numbers (a = i, b = -2i, c = 1 + i, d = 1): `A = i(1 + i) = i + i^2 = -1 + i`; `B = i * 1 + (-2i) = -i`. Check at `z = 2 + 3i`: `g(z) = (1 + i)(2 + 3i) + 1 = (2 + 3i + 2i - 3) + 1 = 5i`; `f(g(z)) = i * 5i - 2i = -5 - 2i`;
`A z + B = (-1 + i)(2 + 3i) - i = (-2 - 3i + 2i + 3i^2) - i = (-5 - i) - i = -5 - 2i`. Equal.

**Polar (the story: spins add, stretches multiply).** `a = 1 * e^{i pi/2}`, `c = sqrt 2 e^{i pi/4}`: `ac = sqrt 2 e^{i(pi/2 + pi/4)} = sqrt 2 e^{i 3pi/4} = -1 + i` (`|ac| = 1.414`, `Arg(ac) = 2.356`, 135 degrees = 90 + 45).
The shift `B = ad + b` is `d` spun and stretched by `a`, then slid by `b`: `ad = i`, `B = i - 2i = -i` (`|B| = 1`, `Arg B = -pi/2`). When the angles add past `pi` the home step is the wrapped sum: `a = -1`, `c = -1`: `Arg a + Arg c = 2 pi`,
`Arg(ac) = Arg(1) = 0`; as sets, `arg(ac) = arg a + arg c` (Thm 1.4.14), but `Arg` is one chosen element (the explainer says so in the motion column).

### 6.11 Strings and cell contents the tests pin

Readouts: curves (segment default) `t = 0; z(t) = 2 + i; x(t) = 2; y(t) = 1`, `t = 0.25; z(t) = 0.75; x(t) = 0.75; y(t) = 0`, `t = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1`,
`t = 0.75; z(t) = -1.75 - 2i; x(t) = -1.75; y(t) = -2`, `t = 1; z(t) = -3 - 3i; x(t) = -3; y(t) = -3`. Linear: `a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i`;
`a = 1 + i = 1.414 e^(i 0.785); b = 0; spin 45°, stretch 1.414, slide 0`; compose `ac = -1 + i; ad + b = -i`.

Explainer cells (TeX source, as in `data-tex`), main linear explainer at 2.1.3, t = 0.875 (`z = 2 + 3i`):
`a`: cart `a = i`, polar `|a| = 1,\ \Arg a = 1.571 = \frac{\pi}{2}`; `b`: cart `b = -2i`, polar `|b| = 2,\ \Arg b = -1.571 = -\frac{\pi}{2}`; `f`: cart `u = -y,\ v = x - 2`, polar `f(re^{i\theta}) = r\,e^{i(\theta + 1.571)} + (-2i)`;
`fixed`: cart `p = b/(1 - a) = 1 - i`, polar `|p| = 1.414,\ \Arg p = -0.785 = -\frac{\pi}{4}`; `zt`: cart `z = 2 + 3i`, polar `|z| = 3.606,\ \Arg z = 0.983`; `wt`: cart `w = az + b = -3`, polar `|w| = 3,\ \Arg w = 3.142 = \pi`;
footer cart `-3`, polar `3\,e^{i\,3.142}`, `agree`. At P4, t = 0.125 (`z = 0.707 + 0.707i`): `f` cart `u = x - y,\ v = x + y`, polar `f(re^{i\theta}) = 1.414\,r\,e^{i(\theta + 0.785)}`; `fixed` cart `p = b/(1 - a) = 0`, polar `p = 0`;
`wt` cart `w = az + b = 1.414i`, polar `|w| = 1.414,\ \Arg w = 1.571 = \frac{\pi}{2}`. Composition explainer at P3 (z = 2 + 3i): `coeff` cart `a c = (i)(1 + i) = -1 + i`, polar `|a||c|\,e^{i(\Arg a + \Arg c)} = 1\cdot 1.414\,e^{i(1.571 + 0.785)}`, motion
`spins add: 90 and 45 give 135 degrees. Stretches multiply: 1 x 1.414 = 1.414.`; `shift` cart `a d + b = (i)(1) + (-2i) = -i`, polar `|ad + b| = 1,\ \Arg(ad + b) = -1.571 = -\frac{\pi}{2}`; `check` cart
`\text{at } z = 2 + 3i:\ a(cz + d) + b = -5 - 2i,\ \ (ac)z + (ad + b) = -5 - 2i`, polar `5.385\,e^{-i\,2.761}\ \text{and}\ 5.385\,e^{-i\,2.761}`, footer `agree`.
Stage captions: see section 5.2 and 2.10; at 2.1.3 `s = 3`: `Stage 3 of 3 done: slid by b = -2i. This is f(z) = az + b.`

---

## 7. Verification plan

All commands run from the repo root. Screenshots go under `docs/review/iter-1/i1-station-curves-linear/` (commit nothing from a scratch directory).

### 7.1 Per acceptance criterion

| Id | Command | Pass looks like |
|---|---|---|
| A1 (routes and deep links load clean) | `node tools/smoke.mjs --route curves,linear,problem-1-5-1,problem-2-1-3,problem-P3,problem-P4 --dark --out docs/review/iter-1/i1-station-curves-linear/smoke` and, for the token routes, `node tools/smoke.mjs --route curves-circle,curves-eight,curves-square,curves-arc,curves-nonsense,linear-x2,linear-unit,linear-stroke,linear-compose,linear-nonsense --out docs/review/iter-1/i1-station-curves-linear/tokens` | exit code 0; each route prints `ok` at `desktop`, `phone` and `desktop-dark`; no console error, page error, failed or external request, no horizontal overflow, no router error panel, `#view` not empty. (Wave-1 sibling stations may still be missing during the build: only the routes named here must pass.) |
| A2 (1.5.1 readouts, reverse, presets, orientation) | `node tools/smoke.mjs --route problem-1-5-1,curves --script tests/interact/i1-station-curves-linear.mjs --dark --out docs/review/iter-1/i1-station-curves-linear/curves` | exit 0 at all three viewports; the script's log lines list every assertion; the steps are in 7.3 |
| A3 (the time ramp is visible in both themes) | `node tools/smoke.mjs --route problem-1-5-1 --dark --out docs/review/iter-1/i1-station-curves-linear/a3`, then read `problem-1-5-1--desktop.png`, `problem-1-5-1--desktop-dark.png`, `problem-1-5-1--phone.png` with the image tool; the script (7.4) also samples real pixels | in both desktop images the segment is darker at (2, 1) and brighter at (-3, -3), the four quarter dots and the arrowhead at (-3, -3) are visible, the "start ... end" pill is legible; the pixel check in 7.4 passes at all three viewports |
| A4 (2.1.3 and P4 images, stages, composition) | `node tools/smoke.mjs --route problem-2-1-3,problem-P3,problem-P4,linear --script tests/interact/i1-station-curves-linear.mjs --dark --out docs/review/iter-1/i1-station-curves-linear/linear` | exit 0 at all three viewports; steps in 7.3 |
| A5 (shared engine, ramp preserved) | code inspection, commands in 7.5 | every grep prints a match; no hand-built `t` in the image path |
| Units (math non-negotiable) | `npm test` (runs `tests/unit/i1-station-curves-linear.test.mjs` with the rest) or `node --test tests/unit/i1-station-curves-linear.test.mjs` | all cases of 7.2 pass |

### 7.2 Unit tests (`tests/unit/i1-station-curves-linear.test.mjs`, `node:test`, no DOM)

The test imports `../../js/stations/curves.js` and `../../js/stations/linear.js` directly (they must not touch the DOM at import). `near(a, b, eps)` is `|a - b| <= eps`;
`nearZ` compares both parts. Random values use a seeded LCG so the file is deterministic.

**`curves.js`**

| Id | What | Expected |
|---|---|---|
| C1 | constants | `PRESET_IDS` = `['segment','circle','eight','square','arc']`; `PRESET_DEFAULTS` as in 4.1.1 and deep-frozen; `SAMPLES` 128; `MIN_SIZE` 0.2; `PLAY_SECONDS` 5; `CLOSED_PRESETS`, `NATIVE_ADDRESS` as in 4.1.1 |
| C2 | segment `curveAt` | for t in {0, 1/8, 1/4, 3/8, 1/2, 3/4, 1}: `(2 - 5t, 1 - 4t)` to 1e-12; pinned `t = 0 -> (2, 1)`, `1/4 -> (0.75, 0)`, `1/2 -> (-0.5, -1)`, `3/4 -> (-1.75, -2)`, `1 -> (-3, -3)` |
| C3 | segment `velocityAt` | `(-5, -4)` for 11 values of t; `abs = sqrt(41)` (1e-12); `Arg = -2.4668517113662407` (1e-12) |
| C4 | segment reversed | `z(0) = (-3, -3)`, `z(1) = (2, 1)`, `z(1/2) = (-0.5, -1)`, `x = -3 + 5t`, `y = -3 + 4t`; velocity `(5, 4)` |
| C5 | circle | the 6.3 column to 1e-9 (`z(1/8) = (1 + sqrt 2, 1 + sqrt 2)`); `\|z - a\| = 2` to 1e-12 on 41 t; velocity `(0, 4 pi)` at 0 and `(-4 pi, 0)` at 1/4; speed `4 pi` everywhere; `z(1) = z(0)` to 1e-12 |
| C6 | half circle | `z(0) = (3, 0)`, `z(1/2) = (0, 3)`, `z(1) = (-3, 0)` to 1e-12; speed `3 pi`; velocity `(0, 3 pi)` at 0 |
| C7 | eight | the 6.3 column; `z(1/8) = (sqrt 2, 1)`; `\|r^2 - 9 cos(2 Arg z)\| < 1e-9` for 200 t with `r > 0.05`; rotated and shifted (centre `1 + 0.5i`, `b - a = 3 e^{i pi/6}`): `\|r^2 - 9 cos(2(Arg(z - a) - pi/6))\| < 1e-9`; velocity `(0, 6 pi)` at 0, `(-3 pi, -3 pi)` at 1/4, `(3 pi, -3 pi)` at 3/4 |
| C8 | square | the 6.3 column; velocity `(-12, 0)` at 0.1, `(0, -12)` at 0.3, `(12, 0)` at 0.6, `(0, 12)` at 0.9, `(0, -12)` at exactly 0.25 (the next side wins); speed 12 for 40 t |
| C9 | reversal property | all five presets, `t` in {0.1, 0.3, 0.6, 0.77}: `curveAt(..., t, true)` equals `curveAt(..., 1 - t, false)` to 1e-12 and `velocityAt(..., t, true)` equals `-velocityAt(..., 1 - t, false)` to 1e-9 |
| C10 | `clampSize` | `(0, 0) -> (0.2, 0)`, `(0.1, 0) -> (0.2, 0)`, `(0, -0.05) -> (0, -0.2)`, `(3, 4) -> (3, 4)` as a **new object**, `NaN -> (0.2, 0)`; `curveAt('segment', a, a, 1)` = `a + (0.2, 0)` |
| C11 | `magnet` | `(1.96, 1.04) -> (2, 1)`; `(0.3, 0.3)` unchanged; `(-0.04, 0.05) -> (0, 0)` with `Object.is(result.re, -0) === false`; `(1.5, 0.5)` unchanged |
| C12 | `buildCurve` | 129 points; `points[k].t === k / 128`; last `t` is exactly 1; all finite; closed presets: `points[128]` has the same `re`, `im` as `points[0]` and `closed === true`; open presets `closed === false`; `reversed: true` flag; `points[0]` and `points[128]` equal `curveAt(..., 0)` and `curveAt(..., 1)` for the open presets |
| C13 | `describeCurve` | the table in 6.4 for all five presets, forward and reversed (square `corners` 4, all others 0) |
| C14 | `classificationTexts` | circle forward: five `yes`, `text` `smooth: yes`, ...; square forward: smooth `no` with `why` `z'(t) jumps at 4 corners.`, piecewise `yes` with `Smooth between the 4 corners.`, positive `yes`; square reversed: positive `no` with `Clockwise: the inside is on your right, so the orientation is negative.`; eight: simple `no` with `It crosses itself.`, positive `no` with `Only a simple closed curve has an orientation.`; segment: closed `no` with `z(1) is not z(0): it ends somewhere else.`; a `null` class gives `smooth: ?` etc. with `answer: 'no'` |
| C15 | `readoutText` | the five strings of 6.11; reversed segment at t = 0: `t = 0; z(t) = -3 - 3i; x(t) = -3; y(t) = -3` |
| C16 | TeX helpers | the pinned outputs of `texLinearT`, `texPolarDec`, `texParen`, `texCoef`, `texAngleDual` in 5.1.9 (`texCoef(C(-3, 0)) = '(-3)'`, `texCoef(C(2, 0)) = '2'`, `texAngleDual(0) = '0'`) |
| C17 | explainer cells | with `explainerState('segment', (2,1), (-3,-3), false, t)`: row `z` cart = `z(t) = (1 - t)(2 + i) + t(-3 - 3i) = (2 - 5t) + i(1 - 4t)`, polar = `z(t) = 2.236\,e^{i\,0.464} + t\cdot 6.403\,e^{-i\,2.467}`; at t = 1/2: `now` cart `x(t) = -0.5,\ y(t) = -1`, polar `r = 1.118,\ \Arg z = -2.034`; `vel` cart `z'(t) = -5 - 4i`, polar `\text{speed } 6.403,\ \text{heading } \Arg z' = -2.467\ (-141.3^\circ)`; `explainerSame` `{ cart: '-0.5 - i', polar: '1.118\,e^{-i\,2.034}', agree: true }`; `native` is `'cart'` for segment and square, `'polar'` for circle, arc, eight; circle cart `z(t) = (1 + i) + 2(\cos 2\pi t + i\sin 2\pi t)`; reversed segment cart `z(t) = (1 - t)(-3 - 3i) + t(2 + i) = (-3 + 5t) + i(-3 + 4t)`; eight default polar `r^2 = 9\cos 2\vartheta,\ \text{measured from the centre}`; **totality**: every cell and `same` function returns a string, `{ text }` or `null` for 5 presets x {forward, reversed} x t in {0, 0.25, 0.5, 1} without throwing and with no `NaN`, `undefined` or `Infinity` in the text; eight at `t = 1/4` (z = 0): `now` polar `r = 0,\ \Arg z\ \text{is undefined}`, `same` `{ cart: '0', polar: '0', agree: true }` |
| C18 | `resolvePreset` and `presetFromToken` | none, problem `1.5.1`, topic -> `{ preset: 'segment', unknown: null }`; token `Circle` -> circle; token `square` -> square; token `nope` -> `{ preset: 'segment', unknown: 'nope' }`; `presetFromToken('')` null |
| C19 | import | `typeof mount === 'function'`, `mount.length === 2`; importing the module in Node does not throw |
| C20 | handle words follow Reverse (fix round 1) | `handleLabels(preset, reversed)`: segment `['start','end']` / reversed `['end','start']`; arc `['centre','start']` / reversed `['centre','end']`; circle, eight, square `['centre','start']` both ways; and for every preset in both directions the handle called `start` is at `curveAt(0)` and the one called `end` at `curveAt(1)` |
| C21 | orientation label placement (fix round 1) | `orientWords(1)` / `(-1)` and the narrow forms `inside: left` / `inside: right`; `placeOrientLabel`: free spot is rank 0, centred under the tip with its top edge 5 px away; a blocked box or a curve through it moves the label to a spot that clears it; the box is always inside the plane |
| C21b | orientation label, round 2 | `orientLines` (two lines wide, one line narrow, left and right); `placeOrientLabel` with `poly`: a free spot is rank 0, a handle box under the tip moves the label to a spot that stays inside the square and clears the box (cost below 40), a polygon too small for the label costs at least 60, an axis or the strip of numbers costs a little (below 40); every marker `t` of `ORIENT_MARKERS.circle` and `.square` has a direction of travel, forward and reversed |
| C22 | no unused imports (fix round 1) | every name imported by `curves.js` and `linear.js` is used in the code |
| C23 | `handleBox` | the word above and right of the dot; left of it near the right edge; below it near the top edge |
| C24 | `plainProse` (both files) | `e^{...}` becomes `e^(...)`, one number or letter stays bare (`2^10`, `e^x`), plain text is unchanged, `''` and `null` give `''` |
| C25 | source inspection, curves | the answer scroller attributes and hint text; `orientBtn.removeAttribute('aria-pressed')`; `xRange: [-4, 5], yRange: [-4, 5]`; `cv-under`; no `window.addEventListener` and no `document.addEventListener` |

**`linear.js`**

| Id | What | Expected |
|---|---|---|
| L1 | constants | `PRESETS` as in 4.2.1, deep-frozen; `STAGE_SECONDS` 1.2; `LINE_Y_RANGE` `[-4, 4]`; `COMPOSE_DEFAULTS` |
| L2 | `stageInfo` | `0 -> {stage 0, 'start', 0, true}`, `0.5 -> {1, 'spin', 0.5, false}`, `1 -> {1, 'spin', 1, true}`, `1.25 -> {2, 'stretch', 0.25, false}`, `2 -> {2, 'stretch', 1, true}`, `2.75 -> {3, 'slide', 0.75, false}`, `3 -> {3, 'slide', 1, true}`, `NaN`, `-1` -> the `0` result, `9` -> the `3` result |
| L3 | `stageMap` numbers | a = i, b = -2i, z = 2 + 3i: s = 0 `(2, 3)`; 0.5 `(-0.7071067811865476, 3.5355339059327378)`; 1, 1.5, 2 `(-3, 2)`; 2.5 `(-3, 1)`; 3 `(-3, 0)` (all 1e-12). a = 1 + i, b = 0, z = 1: 0.5 `(0.9238795325112867, 0.3826834323650898)`; 1 `(0.7071067811865476, 0.7071067811865476)`; 1.5 `(0.8535533905932737, 0.8535533905932736)`; 2 and 3 `(1, 1)`. `stageMap(a, b, 3)(z)` deep-equals `add(mul(a, z), b)` for 20 random values; continuity: `\|S_{1 + 1e-9}(z) - S_1(z)\| < 1e-6` and the same at 2, for random a, b, z; `a = 0` allowed: `stageMap(0, b, 3)(z) = b` |
| L4 | line image (2.1.3) | `imagePieces(inputCurve('x2'), I, C(0,-2), s)`: 1 piece, 129 points; s = 3: all `\|im\| < 1e-12`, `re` min -4 and max 4 (1e-12), point k is `(4 - 8k/128, 0)`, `t = k/128`, point 112 (t = 0.875) is `(-3, 0)`; s = 1 and s = 2: all `\|im - 2\| < 1e-12`; s = 0: all `\|re - 2\| < 1e-12`; point 0 at s = 3 is `(4, 0)` with `t = 0`, point 128 is `(-4, 0)` with `t = 1` |
| L5 | unit circle image (P4) | `imagePieces(inputCurve('unit'), C(1,1), ZERO, s)`: s = 3: 1 piece, `closed === true`, all `\| \|w\| - sqrt 2 \| < 1e-12`, point 0 `(1, 1)`, point 16 (t = 1/8) `(0, sqrt 2)`, point 32 `(-1, 1)`, point 64 `(-1, -1)`, point 96 `(1, -1)`; s = 1: all `\|w\| = 1`, point 0 `(0.7071067811865476, 0.7071067811865476)`; s = 2: all `\|w\| = sqrt 2`, point 0 `(1, 1)` |
| L6 | `fixedPoint` | `(i, -2i) -> (1, -1)`; `(1 + i, 0) -> (0, 0)`; `(2, 1) -> (-1, 0)`; `(1, b) -> null`; `(0, b) -> null`; and `f(z*) = z*` to 1e-12 for 20 random a != 0, 1 |
| L7 | readout strings | the four of 4.2.6 plus the `a = 0` one: `a = 0 (squashes the plane to b); b = 1 + i; spin 0°, stretch 0, slide 1 + i`; `describeLinear(C(1,1), ZERO)` has `spinDeg` 45 (1e-9), `stretch` sqrt 2 |
| L8 | `compose` | `(i, -2i, 1+i, 1)`: `A = (-1, 1)`, `B = (0, -1)`, `spinSumDeg = 135` (1e-9), `stretchProduct = sqrt 2`, `wrapped = false`; `(-1, 0, -1, 1)`: `A = (1, 0)`, `spinSumRad = 2 pi`, `wrapped = true`; `(i, -2i, i, 0)`: `A = (-1, 0)`, `B = (0, -2)`; `composeReadout` strings `ac = -1 + i; ad + b = -i`, `ac = -1; ad + b = -2i`; identity `\|a(cz + d) + b - (Az + B)\| < 1e-12` for 50 random values |
| L9 | `parseConstant` | `1+i -> ok (1, 1)`; `2i -> (0, 2)`; `-i -> (0, -1)`; `0.5-1.25i -> (0.5, -1.25)`; `pi -> ok (3.14159..., 0)`; `'' -> { ok: false, message: 'Type a number, for example 1+i.' }` and the same for `'   '`; `z` and `x+1 -> 'Use a number here, not z, x or y. For example 1+i or -2i.'`; `1/0 -> 'That is not a finite number. Try something like 1+i.'`; `1+ -> 'The formula stops too early. Something is missing after "+".'` (from `parse.js`, verbatim); `abc` -> `ok: false` and a message starting `I don't know the name` |
| L10 | inputs and grids | `inputCurve('x2')`: 129 points, first `(2, -4, t 0)`, last `(2, 4, t 1)`; `inputCurve('unit')`: 129 points, closed, first `(1, 0)`, all `\|z\| = 1` (1e-12); other kinds `null`; `gridCurves('cart')`: 18 curves, all family `cart`; `'polar'`: 16 curves (4 kind `polar-ring`, 12 `polar-ray`); `'off'`: `[]` |
| L11 | `stageCaption` | the seven strings of 5.2 / 2.10 for a = i, b = -2i at s = 0, 0.5, 1, 1.25, 2, 2.75, 3, and `Stage 3 of 3 done: b = 0, so nothing slid. This is f(z) = az.` for P4 at s = 3 |
| L12 | `clampRadiusFor` | `{center 0, unitsAcross 10.8}` with `{w 400, h 333.3}` -> 40; `{unitsAcross 200}` square -> 300; with centre `(50, 0)` -> 350 |
| L13 | `labRequest` | 2.1.3 -> `{ fn: 'linear-i', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.3', predictFirst: false }`; P4 -> `{ fn: 'linear-1i', shapes: [{ kind: 'circle', center: {re:0,im:0}, r: 1 }], view: 'side', problem: 'P4', predictFirst: false }`; `a = 1.5 - 0.25i, b = 0.5, input stroke` -> `{ fn: { src: '(1.5 - 0.25i)*z + (0.5)' }, shapes: [], view: 'side', problem: null, predictFirst: false }`; the `src` compiles with `parse.js` and evaluates to `a z + b` at `z = 1 + i` |
| L14 | `texTerms` and explainer cells | the six `texTerms` cases of 5.2.6; 2.1.3 at `z = 2 + 3i`, P4 at `z = (sqrt2/2)(1 + i)`, `a = 0` at `z = 1`, `a = 1` (b = 0.5) at `z = 1`: every cell string of 6.11 and of the prototype (`a = 0`: row `fixed` cart `\text{every point goes to } b`, polar `null`; `a = 1`: row `fixed` cart `\text{none: a = 1 is a pure slide}`); `explainerSame(state with z null)` is `null` and row `zt` cart is `null`; **totality**: no cell throws and none contains `NaN`, `undefined` or `Infinity`; composition rows at P3 and at the wrapped example (`motion` ends `6.283 is past π, so the home step is Arg(ac) = 0.`) |
| L15 | `resolvePreset` | `undefined -> { key: '2.1.3', input: 'x2', unknown: null }`; problem `P3 -> { key: 'P3', input: 'x2' }`; problem `P4 -> { key: 'P4', input: 'unit' }`; token `stroke -> { key: '2.1.3', input: 'stroke' }`; token `Unit -> P4, unit`; token `compose -> P3, x2`; token `zzz -> { key: '2.1.3', input: 'x2', unknown: 'zzz' }`; problem `1.1.1` (not ours) -> the default with `unknown: null` |
| L16 | import | `typeof mount === 'function'`, `mount.length === 2`, import does not throw in Node |
| L18 | `dotWords` | the six cases: wide apart, close, the same point, each before and at stage 3 (`f(0) = f(1) = b`, `0 = 1`, `f(0), f(1)`, `0, 1`); at `a = 0` the two image points of `stageMap` coincide |
| L19 | `composeReadoutParts` | `['ac = -1 + i;', 'ad + b = -i']` for P3; joined with a space it equals `composeReadout`; long values still give two halves |
| L20 | listeners last (ARCHITECTURE 10.1.4) | in the source of `linear.js`: `mv.linear = hook`, then `wplane.on('viewchange'`, then `new ResizeObserver(onResize)` and `window.addEventListener('scroll'` (once), then `return function unmount()`, whose body removes the listener, disconnects the observer and calls `disposeCard()` |
| L21 | source inspection, linear | the answer scroller attributes and hint text; the back callout sentence `The time ramp, darker early and lighter late, comes from `, never `dark-to-bright`; the phone rule `#linear-compose-readout .ln-nw{display:block}` |
| L17 | source inspection (goal A5) | `fs.readFileSync('js/stations/linear.js', 'utf8')` matches `/import\s*\{[^}]*\bpushForward\b[^}]*\}\s*from\s*'\.\.\/core\/mapping\.js'/`, and the same pattern for each of `verticalLine`, `circle`, `freehand` from `'../core/shapes.js'`; the text contains an `addCurve(` call with `ramp: true` and `color: '--output'`; it contains no `\.t = ` assignment and no `t: k /` or `t: i /` |

### 7.3 Interaction script `tests/interact/i1-station-curves-linear.mjs`

`import { clickChip, readText, setSlider, settle, dragHandle, handleZ, planePixel, parseCart } from './_helpers.mjs';`
`export default async function (page, ctx)` branches on `ctx.route`; it runs unchanged at `desktop`, `phone` and `desktop-dark`. `go(h)` is
`await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(600)`. `has(text, ...parts)` asserts every part is a substring.
`ans(id)` is `page.evaluate((i) => { const e = document.getElementById(i); return e ? { answer: e.dataset.answer, text: e.textContent.trim() } : null; }, id)`.
`img()` is `page.evaluate(() => { const v = window.__mv.linearImage; return Array.isArray(v) ? v.map((p) => ({ re: p.re, im: p.im, t: p.t })) : (v && v.points) || []; })`.

```
default(page, ctx):
  r = ctx.route
  if (r === 'curves' || r === 'problem-1-5-1') return curvesChecks(page, ctx)
  if (r === 'linear' || r === 'problem-2-1-3') return linearChecks(page, ctx)      // also visits P4 and P3
  if (r === 'problem-P4') return p4Checks(page, ctx)
  if (r === 'problem-P3') return p3Checks(page, ctx)
  throw new Error(`no checks written for route ${r}`)
```

**`curvesChecks`** (goal A2, A3):
1. `waitForSelector('#curves-ex-z-cart')`; readout at load: `has(readout, 't = 0;', '2 + i')` (also accept `2 + 1i`).
2. `setSlider(page, 'curves-t', 0.5)`; readout has `-0.5 - i` (or `-0.5 - 1i`), `x(t) = -0.5`, `y(t) = -1`.
3. `await page.waitForTimeout(350)` (the explainer's refine pass); read `{ tex: td.dataset.tex, text: td.textContent }` of `#curves-ex-z-cart`: both contain `2`, `5` and `t`; `tex` contains `(2 - 5t) + i(1 - 4t)`; `#curves-ex-z-polar` `tex` contains `6.403`; `#curves-ex-now-cart` `tex` contains `x(t) = -0.5`; `#curves-ex-same` has `data-agree="true"`.
4. A3 pixel check (7.4) with the cursor at t = 0.5.
5. Reverse: `clickChip('curves-reverse')`, `setSlider('curves-t', 0)`, readout has `-3 - 3i`; click again, `setSlider(0)`, readout has `2 + i`.
6. Preset eight: `clickChip('curves-preset-eight')`; `ans('curves-simple')` is `no` (answer and text contains `no`); `ans('curves-closed')` is `yes`; the orient button is `disabled` (assert `page.isDisabled('#curves-orient')`), because the eight is not simple.
7. Preset square: `smooth` `no`, `piecewise` `yes`, `positive` `yes`, `closed` `yes`, `simple` `yes`; `clickChip('curves-orient')` then `positive` is `no`; click again and it is `yes`; then click `curves-reverse` and `positive` is `no`; click it again to restore.
8. Preset circle: all five `yes`. Preset arc: `closed` `no`, `simple` `yes`, `smooth` `yes`, `positive` `no`, orient disabled.
9. A reverse then a preset change resets: `clickChip('curves-preset-segment')`, `clickChip('curves-reverse')`, `clickChip('curves-preset-square')`: `positive` is `yes` (a preset starts un-reversed).
10. Drag: `clickChip('curves-preset-segment')`; `z = await dragHandle(page, 'curves-plane-b', { re: 1, im: -2 })`; `|z - (1, -2)| < 0.2` (the magnet lands on it exactly); `setSlider('curves-t', 1)`; `parseCart(zFieldOfReadout)` equals `handleZ('curves-plane-b')` within 0.01 (the readout text after `z(t) = `, up to the next `;`). Restore with a drag to `(-3, -3)`.
11. Keyboard: `page.focus('#curves-plane-a')`, press `ArrowRight` twice, `handleZ('curves-plane-a').re` is `3` (from 2) within 1e-6.
12. Address overlay: click the `#curves-addresses` checkbox (`page.check`), `settle(3)`, take `shot('addresses-on')`, uncheck.
13. Token and reduced motion: `go('#curves-circle')`; `ans('curves-closed').answer === 'yes'` and `has(readout, 't = 0;', '3 + i')`; `page.emulateMedia({ reducedMotion: 'reduce' })`; `go('#curves')` (re-mount); `#curves-play` text contains `Step`; `setSlider('curves-t', 0)`; click `curves-play`; readout has `t = 0.25`; reset the media with `emulateMedia({ reducedMotion: 'no-preference' })`; `go('#curves-nonsense')`: `#curves-note` has `I do not know a curve called`, the segment is shown; `go('#problem-1-5-1')`.
14. Performance: `dragHandle(page, 'curves-plane-b', ..., { steps: 60 })` then `getStats().lastDrawMs < 25` for `window.__mv.planes.get('curves-plane')`.
15. Shots: `shot('segment-t0')` after step 1 (before moving anything), `shot('eight')`, `shot('square')`. Final: `document.documentElement.scrollWidth - clientWidth <= 1` (no horizontal overflow after all the interaction).

**`linearChecks`** (goal A4):
1. `waitForSelector('#linear-readout')`; `has(readout, 'a = i', 'b = -2i', 'spin 90', 'stretch 1')`.
2. At load (stage 3): `pts = await img()`: `pts.length === 129`; every `|im| < 1e-6`; `min(re) < -2` and `max(re) > 2`; `pts[0].t === 0`, `pts[128].t === 1`, `t` increasing, `pts[k].t` within 1e-9 of `k/128` (the ramp is preserved); `pts[112]` is `(-3, 0)` within 1e-6.
3. `setSlider('linear-stage', 1)`: every `|im - 2| < 1e-6` and `re` still spans -4..4; caption has `Stage 1 of 3 done`; `shot('stage-1')`.
4. `setSlider('linear-stage', 2)`: every `|im - 2| < 1e-6`; `setSlider('linear-stage', 2.5)`: every `|im - 1| < 1e-6`; `setSlider('linear-stage', 3)`: every `|im| < 1e-6`; `setSlider('linear-stage', 0)`: every `|re - 2| < 1e-6`; back to 3. `shot('stage-3')`.
5. The followed point: `setSlider('linear-t', 0.875)`; `await page.waitForTimeout(350)`; `#linear-ex-zt-cart` `tex` contains `2 + 3i`, `#linear-ex-wt-cart` `tex` contains `-3`; `#linear-ex-same` `data-agree="true"`; `#linear-ex-a-polar` `tex` contains `\frac{\pi}{2}`; `#linear-ex-fixed-cart` `tex` contains `1 - i`.
6. Ramp pixel check on the w-plane (7.4) at stage 3.
7. Drag `a`: `dragHandle(page, 'linear-ab-a', { re: 1, im: 1 })` (the magnet lands exactly on `1 + i`); readout has `a = 1 + i` and `spin 45`; the image is now `f(2 + iy) = (1 + i)(2 + iy) - 2i = (2 - y) + iy`: `pts[0]` (y = -4) is `(6, -4)` and `pts[112]` (y = 3) is `(-1, 3)` within 1e-6, so not every `|im|` is 0;
   then drag `a` back to `(0, 1)`; `handleZ('linear-ab-b')` is still `(0, -2)` within 1e-6 (dragging `a` never moves `b`). Keyboard: focus `#linear-ab-b`, `ArrowDown` once: `handleZ('linear-ab-b').im` is `-2.5`; `ArrowUp` once: back to `-2`.
8. Grid chips: click `linear-grid-polar`, `linear-grid-off`, `linear-grid-cart` (each `aria-pressed="true"` afterwards); `linearImage` is unchanged by grid choice (compare lengths).
9. Stroke: `clickChip('linear-input-stroke')`; `pts = await img()` is `[]`; `#linear-t` is disabled; `#linear-stroke-hint` non-empty. Draw: `p0 = planePixel(page, 'linear-zplane', {re: -2, im: -2})`, `p1 = (re: 0, im: 1)`, `p2 = (re: 2, im: -1)`; `mouse.move(p0)`, `down`, `move(p1, { steps: 12 })`, `move(p2, { steps: 12 })`, `up`; `settle(3)`; `pts = await img()`; `pts.length >= 10`; `st = await page.evaluate(() => window.__mv.linear.stroke())`; `pts[0]` equals `f(st[0])` and the last equals `f(st[last])` within 1e-9 with `f(z) = (-z.im, z.re - 2)`; `pts[0].t === 0`, last `t === 1`. Clear: click `linear-stroke-clear`, `img()` is `[]`. Switch back with `clickChip('linear-input-x2')`: 129 points again. A tap (down and up without moving) leaves the stroke empty and shows `That was too short to be a stroke.`
10. `Fit both planes`: click `#linear-fit`; the two plane elements `#linear-zplane-viewport` and `#linear-wplane-viewport` then report the same `data-units-across` and `data-center-re` / `data-center-im` (within 1e-6). Click the zoom `Reset` button of the w-plane
    (`#linear-wplane-zoom-reset`): its view returns to the fitted view, not to the mount view.
11. P4: `go('#problem-P4')`; `has(readout, 'a = 1 + i', 'stretch 1.414', 'spin 45', 'b = 0')`; `pts`: every `| |w| - 1.414 | < 1e-3` (and `< 1e-9` from sqrt 2); `pts[0]` is `(1, 1)`; `setSlider('linear-stage', 1)`: every `| |w| - 1 | < 1e-9` and `pts[0]` is `(0.7071, 0.7071)` within 1e-6; back to 3; `ans`-style check that `#linear-preset-P4` has `aria-pressed="true"`; `#linear-problem-title` contains `P4`.
12. P3: `go('#problem-P3')`; DOM order: `#linear-compose` precedes `#linear-zplane-viewport` (`compareDocumentPosition`); `page.fill('#linear-compose-c', '1+i')`, `page.fill('#linear-compose-d', '1')`, `settle(3)`; `has(composeReadout, 'ac = -1 + i', 'ad + b = -i')`; wait 350 ms: `#linear-comp-ex-coeff-cart` `tex` contains `-1 + i`; `#linear-comp-ex-same` `data-agree="true"`; invalid input: `fill c '1+'`: `#linear-compose-error` text contains `stops too early`, `#linear-compose-c` has `aria-invalid="true"`, the readout still says `ac = -1 + i`; `fill c '1+i'`: error empty, `aria-invalid` gone; `fill c 'i'`, `fill d '0'`: readout `ac = -1; ad + b = -2i`; `fill c '0'`: `#linear-compose-note` is visible; restore `1+i` and `1`.
13. Back at `go('#problem-2-1-3')`: DOM order: `#linear-compose` follows `#linear-ex-table`. Final overflow check as in curves.
14. Shots: `shot('stage-1')`, `shot('stage-3')`, `shot('p4')`, `shot('p3')`, `shot('stroke')`.

Fix round 2 adds to the script: **curves** `planeTidy` after every preset that matters (segment, eight, square forward and reversed, circle forward and reversed, half circle): the handle words never overlap each other (the `censtart` glitch), and, for the simple closed curves, `window.__mv.curves.orient()` says the label costs less than 40 (it touches no handle word, no part of the curve and is not outside), its box clears the DOM rectangles of the handle words, stays in the plane and no point of the curve lies inside it; `aria-pressed` is absent on a disabled `#curves-orient` and `false`/`true` on an enabled one; `answerHint` (both stations): the answer scroller is focusable and named, and its hint shows exactly while `scrollWidth > clientWidth + 1`; no problem chip title has a brace (and the P4 one reads `√2e^(iπ/4)`); b is dropped on a (0.2 apart) and `elementFromPoint` at a's centre is a's handle (b is then picked up again after a is moved away); **linear** `planeStaysPut` also drags **b** through decimal values (`which: 'b'`; on a phone the caption must keep two lines and the page must not move), the first drag of a goes through a = 0 and takes the `a-zero` shot (one label `f(0) = f(1) = b`), `composeReadoutFits` types `c = 123.456+78.9i`, `d = 4.5678-9.1234i` and checks the readout does not scroll in its box and breaks at the semicolon on a phone only, and the back callout sentence is the copy-deck one.

Fix round 1 adds to the script: **curves** step 5 and step 8 check the handle words (`.plane-handle-label`) before and after Reverse for the segment (swap, and the handle called `start` sits at the readout's z(0), the one called `end` at z(1)), the half circle (b becomes `end`) and the circle (words stay); **linear** `noteLayout` (`#linear-note` after the control plane in the page, `#linear-offscreen` `position:absolute` inside `.ln-wwrap`, `#linear-compose-note` never hidden), `tickPlaces` (each tick word within 6 px of its slider position, desktop only), `stageFits` (phone: the w-plane ends above the sticky bar), and `planeStaysPut` at 2.1.3, P4 and P3: one mouse press that goes through a = 0, out to (4, -4) (image off the plane) and back, with scroll anchoring switched off (as in Safari); the plane's top moves at most 1 px in the viewport (and, at 2.1.3 and P4, also in the page), the handle stays under the pointer to 0.25 units, `#linear-note` shows at a = 0 and (x = 2 presets) `#linear-offscreen` shows at (4, -4). `p3Checks` also checks `#linear-compose-note` `data-active` is `true` for c = 0 and `false` again after.

`p4Checks` is steps 11 alone; `p3Checks` is step 12 alone (both begin with `waitForSelector('#linear-readout')` and assert the preset card title: `#linear-problem-title` contains `P4` or `P3`).

### 7.4 Pixel sampling for A3 (inside the script, both stations)

```
rampCheck(page, planeId, which, ctx):            // which = 'curves' (plane curves-plane, base --input) or 'linear' (plane linear-wplane, base --output)
  r = await page.evaluate(async ({ planeId, which }) => {
    const plane = window.__mv.planes.get(planeId); const cv = plane.canvas; const g = cv.getContext('2d')
    const ratio = cv.width / cv.clientWidth
    const pts = which === 'curves' ? window.__mv.curves.points() : window.__mv.linearImage
    const at = (t) => { for (let i = 0; i + 1 < pts.length; i++) if (pts[i].t <= t && t <= pts[i + 1].t) {
        const u = (t - pts[i].t) / (pts[i + 1].t - pts[i].t); return { re: pts[i].re + u * (pts[i + 1].re - pts[i].re), im: pts[i].im + u * (pts[i + 1].im - pts[i].im) } } }
    const sample = (t) => { const q = plane.toPixel(at(t)), cx = Math.round(q.x * ratio), cy = Math.round(q.y * ratio)
      const d = g.getImageData(cx - 4, cy - 4, 9, 9).data; let best = null
      for (let k = 0; k < d.length; k += 4) if (!best || d[k + 3] > best[3]) best = [d[k], d[k + 1], d[k + 2], d[k + 3]]
      return best }
    const m = await import(location.origin + '/js/core/plane.js')
    const base = which === 'curves' ? '--input' : '--output'
    const want = (t) => m.rampColor(base, (Math.floor(t * 32) + 0.5) / 32)                 // the bin the stroke is drawn in
    return { lo: sample(0.1), hi: sample(0.9), wantLo: want(0.1), wantHi: want(0.9),
             surface: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() }
  }, ...)
  parse "rgb(r, g, b)" and "#rrggbb"; composite each sample over the surface by its alpha
  assert alpha >= 200 for both samples (the stroke was hit)
  assert each channel of the composited colour is within 14 of the wanted colour
  assert luminance(hi) > luminance(lo) + 0.04 and contrast(lo, surface) >= 3 and contrast(hi, surface) >= 3
```
Relative luminance and contrast are the WCAG formulas. The wanted colours (the ramp bins at t = 0.1 and t = 0.9, computed with `rampColor`'s formula): curve base `--input`, light `lo` `rgb(17, 63, 69)` (L 0.041, contrast 11.5 on white),
`hi` `rgb(64, 116, 129)` (L 0.152, contrast 5.2); dark `lo` `rgb(93, 157, 162)` (L 0.290, contrast 5.5 on `#151c2b`), `hi` `rgb(169, 223, 212)` (L 0.660, contrast 11.5). Image base `--output`: light `lo` `rgb(72, 45, 88)`, `hi` `rgb(119, 98, 148)` (contrast 5.3);
dark `lo` `rgb(150, 135, 179)` (5.2), `hi` `rgb(227, 201, 230)`. The check runs with the cursor away from t = 0.1 and 0.9 (the script sets t = 0.5 first), at the three viewports (the dark pass is the dark-theme case). On the `linear` w-plane it samples `linearImage`
at stage 3 with base `--output`.

### 7.5 Code inspection for A5 (and ownership)

The mechanical part of A5 is unit case L17 (in 7.2), which reads `js/stations/linear.js` with `fs` and checks it with regular expressions, so it runs in `npm test` and needs no shell quoting. The human part is these commands:

```
grep -nE "from '\.\./core/mapping\.js'" js/stations/linear.js          # a line whose braces contain pushForward
grep -nE "from '\.\./core/shapes\.js'" js/stations/linear.js           # a line whose braces contain verticalLine, circle, freehand
grep -nE "addCurve\(" js/stations/linear.js                              # the w-plane call has ramp: true and points: pieces[i].points
grep -nE "ramp: *false" js/stations/linear.js                             # only the ghost curve and the grid draw without a ramp
grep -nE "\.t *=|t: *i *\/|t: *k *\/" js/stations/linear.js            # no hand-made t on image points (the input builders own t)
git status --short                                                        # only the four files of this goal (and docs/review output) changed
```
Pass: every `grep` for imports and `addCurve(` matches; the `addCurve` hit for the w-plane image shows `ramp: true` and the piece's own `points`; the last two greps show nothing that builds `t` for an image point.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

**`curves`**

| Case | Behaviour |
|---|---|
| `b` dragged onto `a` (or keyboard-nudged there) | `snapB` (and `clampSize` inside every formula) keeps `\|b - a\| >= 0.2`, in the same direction (east if they coincide). No NaN, no zero-length curve. |
| Centre of a circle, eight, square or half circle dragged so that `b` would leave the plane | allowed (`b` moves with the centre); the picture may leave the view: the zoom buttons and Reset bring it back; nothing is clamped silently. |
| Curve passes through the origin (eight at t = 1/4 and 3/4) | row `now` polar reads `r = 0, Arg z is undefined`; the footer shows `0` and `0`; the overlay is skipped; the readout is unaffected. |
| t = 1 on a closed curve | `z(1)` equals `z(0)` (the stored last point is an exact copy; the analytic `curveAt(1)` agrees to 1e-12). |
| Reverse at a square corner (t = 0.25, 0.5, 0.75) | `z` is continuous; `z'` is the one-sided velocity of the next side. The explainer shows that side's value. |
| Preset switch while playing | play continues; handles are rebuilt; `reversed` resets to false; `t` is kept. |
| Rapid clicks on reverse or orient | idempotent toggles; `aria-pressed` always matches `S.reversed`. |
| Hash change while playing | `unmount` cancels both `requestAnimationFrame` loops and the debounce timer; a late callback returns at once (`destroyed`). |
| Plane zoomed or panned | the curve is computed in plane units, so nothing depends on the view; the orientation marker is 26 px whatever the zoom (`26 / scale`). |
| A very small circle (R = 0.2) | drawn (about 10 px); the orientation marker's tip lies outside the circle; `drawLabel` clamps the text inside the canvas. |
| `localStorage` blocked, `ctx.store` unusable | not used. |
| `window.__mv` already exists | `window.__mv = window.__mv \|\| {}` then `mv.curves = ...`; never replaced. |
| Two mounts in quick succession (the router supersedes a mount) | each mount owns its own closures; the first `unmount` removes only its own hooks (`if (mv.curves === myHook) delete mv.curves`). |

**`linear`**

| Case | Behaviour |
|---|---|
| `a = 0` | readout `a = 0 (squashes the plane to b); ...`; `#linear-note` visible; stages 2 and 3 collapse the shape to the point `b` (drawn as a dot, the ramp has no length); `Arg a` is shown as undefined (`stairs.update(null)`); the fixed-point row says `every point goes to b`. `pushForward` returns one piece of identical points: no exception. |
| `a = 1` | no fixed point (`none: a = 1 is a pure slide`); stages 1 and 2 change nothing; stage 3 is a pure slide. |
| `a` on the negative real axis | `Arg a = pi` (never `-pi`: `complex.js`); spin 180 degrees; the staircase relabels and shows its seam note (staircase-owned). Dragged a hair below the axis, `Arg a` is about `-pi` and the spin reads `-180°`: the whole staircase relabels, the plane's motion is identical (the point of the station). |
| `\|a\|` large, `b` large | the image runs off the plane: `#linear-offscreen` appears when no point is inside the view; `Fit both planes` and the zoom buttons recover; `clampRadius` follows the w-plane view (`>= 40`) so nothing is cut inside the view. |
| Stage slider between whole numbers | the captions and `linearImage` describe the in-between plane; the arrows, the dots at 0 and 1 and the ghost follow. |
| Input changed while playing | the stage keeps playing on the new shape. |
| `stroke` input and no stroke | `linearImage` is `[]`; `#linear-t` disabled; explainer rows `zt`/`wt` empty; the grid still moves. |
| Stroke of 3000 samples | the sample cap stops adding at 3000; `freehand({ minDist: 0.03 })` thins them; `pushForward` cost stays under about 1 ms. |
| Pointer leaves the canvas while drawing | pointer capture (plane-owned) keeps the events; `pointerup` or `pointercancel` finishes the stroke. |
| A second finger while drawing | ignored (`isPrimary` is false); in draw mode the plane does not start its pinch gesture. |
| Zoom or pan after drawing | the stroke lives in plane units and stays where it was drawn. |
| Preset chip while in stroke mode | the preset's input replaces `stroke`; draw mode turns off; the stroke object is kept in memory and returns if the student picks `Draw my own stroke` again (the chip shows it again, no redraw needed). |
| Composition input invalid | message, `aria-invalid`, last valid values kept; readout never shows NaN; a valid keystroke clears it. |
| `a` or `c` is 0 | `#linear-compose-note` visible; rows still compute (`ac = 0`, polar cell empty). |
| View changes of one plane only | `Fit both planes` re-synchronises; `Reset` returns each plane to its own home (the fitted view after a fit). |

### 8.2 Performance plan

- **Budget.** 60 fps while dragging a handle or the stage slider; planes redraw in at most 8 ms typically (plane `getStats().lastDrawMs`), 25 ms under a 4x CPU throttle.
- **One flush per frame.** Every event only writes state and calls `scheduleFlush`; `flush` runs once per animation frame. The sliders can fire 120 `input` events per second; they coalesce.
- **Work per flush.** `curves`: `buildCurve` (129 points), `classify` (about 0.3 ms: bounding-box rejection keeps the all-pairs test cheap), three plane requests. `linear`: one `pushForward` of 129 points (or up to 3000 for a stroke), one `pushForwardAll` of 16 or 18 grid curves of 49 or 97 points (about 1 ms in total), only when a, b, the stage, the input or the grid changed (`pending` flags: moving the followed `t` recomputes nothing but the cursors and the explainers).
- **No throttling of the explainer.** `explainer.update(state)` is called on every flush; the explainer coalesces to one render per frame and widens the gap adaptively (up to 100 ms); the first call is synchronous. Keep to 6 rows (curves 3, linear 6, composition 3).
- **Cold start.** The first `flush` is synchronous inside `mount` so the readout, the explainers and `linearImage` exist at once; KaTeX renders the first explainer in one pass. ARCHITECTURE 10.3.4 reports 229 ms for a cold render of six rows plus a seven-row staircase under a 4x CPU throttle; `linear` has the same order of work (six rows in three columns, a three-row staircase, a second explainer of three rows), so expect up to about 250 ms at 4x and well under 100 ms unthrottled. If the builder measures a first paint above 300 ms at 4x, the composition explainer (it is below the fold) gets its first `update` one animation frame after the first flush instead of inside it; nothing else changes.
- **Resolution management.** The station never creates a canvas: `createPlane` owns device-pixel-ratio handling (cap 3), `ResizeObserver` and the pixel budget. Sampling does not depend on pixel size: curves use 128 segments (the chord sag of a 2 pi / 128 step is `R(1 - cos(pi/128)) = 3.0e-4 R`: 0.075 px for a 250 px radius, 0.6 px for a 2000 px radius, which is a circle of radius 2 at the plane's maximum zoom), grids 48 or 96 segments per line, strokes thinned at 0.03 units.
- **No busy loops.** Play uses `requestAnimationFrame` with a time step capped at 0.1 s (a backgrounded tab does not jump).

### 8.3 Accessibility

- Headings: one `h1` (inside `.station-header`), `h2` for panels, `h3` inside the problem card. Landmarks: each panel is a `<section>` with `aria-labelledby`; the links are a `<nav aria-label="Other places">`.
- Every control has a visible `<label>` or an `aria-label` and a stable id (2.2, 2.7). Chips that choose are `<button aria-pressed>`; the classification chips are plain spans (not in the tab order) so the student is not asked to "press" an answer.
- Sliders have `aria-valuetext` (`t = 0.5, z = -0.5 - i`; the stage caption). `<output>` mirrors the value.
- Planes: the plane group has an `aria-label`; handles are real buttons whose `aria-label` announces both addresses (`start: z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)`); arrow keys move them; Escape cancels a drag.
- Live regions: `#curves-status` and `#linear-status` (polite, debounced 400 ms) give one sentence per change; `#linear-compose-error` is `role="alert"`; the readouts are not live (they change every frame).
- Colour is never the only cue (3.1). Contrast: text tokens are at least 4.5:1; the ramp is at least 4.59:1 at both ends in both themes (3.2).
- Targets: 44 px (`--tap`) for buttons and chips; handle hit areas 32 px, 44 px on coarse pointers (plane-owned).
- Focus: shared focus rings; `details` summaries and sliders keep the browser focus ring; a disabled orient button carries a `title` explaining why.
- Keyboard: `curves` is fully keyboard-operable; `linear` is, except for drawing a stroke (stated on screen). Nothing traps focus.
- The math is also available as text: readouts (plain, ASCII minus), `data-tex` on every explainer cell, `answer.text` in the problem card.

### 8.4 Reduced motion

`ctx.theme.prefersReducedMotion()` is read at mount (labels) and at every press (behaviour), so a live change of the OS setting works. `#curves-play` becomes `Step by 1/4` (t jumps to the next
quarter, wrapping after 1); `#linear-play` becomes `Next stage` (the stage jumps to the next whole number, wrapping after 3). The sliders and handles are the student's own motion and are unaffected. Neither station starts any
motion by itself; neither adds a CSS animation (the staircase's pulse is disabled by its own media query); the `P3` chip scrolls with `behavior: 'auto'`.

### 8.5 Phone layout (390 px)

- One column everywhere: every grid is `repeat(auto-fit, minmax(min(100%, Nrem), 1fr))`, so at 358 px content width every grid falls to a single column and nothing can overflow. Planes are `width: 100%`; the explainer stacks (Cartesian above polar above motion, per row); chips wrap; readouts wrap (`overflow-wrap: anywhere`); long formulas wrap at their operators (S5) or scroll inside `.tex-scroll`.
- `curves`: chips, then the plane (358 x 358), then the slider and Play directly under it, then the readout, then the buttons, then the five checks (chip above reason), then the explainer.
- `linear`: planes at aspect 1.2 (358 x 298) stack; the stage bar is `position: sticky; bottom: 0` inside the stage block, two rows (the slider; then Play and the caption), about 110 px, so the student drags the slider while looking at the planes; it unsticks when the block ends. Stroke mode shows the phone note and the left plane stops scrolling the page while draw mode is on.
- Nothing is smaller than the plane's own 12 px canvas labels; body copy keeps the shell's 17 px.
- The A3 phone screenshot (`problem-1-5-1--phone.png`) must show the plane, the slider and the readout without scrolling more than one screen.

---

## 9. Out of scope, requests for other owners, risks

### 9.1 Out of scope (named by the goal, plus the obvious neighbours)

- `z^n` and `1/z` images (stations `powermap` and `reciprocal`); the Lab's drawing tools and shape kinds beyond one freehand stroke (rectangle, circle, polygon, sector, annulus, undo, persistence, predict-first, other views).
- Any function other than `az + b` (including conjugation, which is a reflection and not a linear map in this course's sense), domain colouring, the 3D views, the Riemann sphere.
- `sets` (open, closed, bounded, domain), the staircase station, branches.
- Narration, video and audio (the media track); no Listen control in these two stations in iteration 1.
- Saving strokes or states (no `localStorage` keys; per-view state is in memory).
- Adaptive refinement of curves at extreme zoom (see 8.2).

### 9.2 Requests for other owners (not edited here)

1. **Planner / ARCHITECTURE 9, line `i1-station-curves-linear`.** Add the extra ids and hooks this design defines: curves `#curves-presets`, `#curves-addresses`, `#curves-checks`, `#curves-<key>-why`, `#curves-status`, `#curves-note`, `#curves-problem`; `window.__mv.curves = { state(), points(), classification() }`; linear `#linear-presets`, `#linear-preset-P3`, `#linear-play`, `#linear-t`, `#linear-grid-cart|polar|off`, `#linear-vectors`, `#linear-fit`, `#linear-stroke-clear`, `#linear-stroke-hint`, `#linear-note`, `#linear-offscreen`, `#linear-compose-error`, `#linear-compose-note`, `#linear-stairs`, `#linear-ex`, `#linear-comp-ex`, `#linear-problem`; `window.__mv.linear = { state(), stroke(), pieces() }`; and the exact `linearImage` contract of 4.2.4 (an array of `{ re, im, t }` with a non-enumerable `points` alias).
2. **ARCHITECTURE 4, "Problem presets per station".** The P3 row should read "composition panel moved to the top, problem card P3, a = i, b = -2i, c = 1 + i, d = 1".
3. **Lab owner (`i1-station-lab`).** `linear` hands over `{ fn: 'linear-i' | 'linear-1i' | { src }, shapes: [...], view: 'side', problem: '2.1.3' | 'P4' | null, predictFirst: false }`; a freehand stroke is never handed over (`shapes: []`). A `{ src }` is written with an explicit `*` (`(1 + i)*z + (0)`) and compiles with `parse.js`.
4. No change is needed to `registry.js`, `theme.css` or `components.css`.
5. **ARCHITECTURE 9, line `i1-station-curves-linear`, linear readout** (fix round 1, review issue 7). The pinned form `a = <cart> = <polar>; ...` should say that the polar part is left out when it only repeats the Cartesian part (`a = 2`, `a = 1`, `a = -1`, not `a = 2 = 2`).
6. **`js/core/plane.js` (core-plane owner).** (a) The address label placer (`r = ...`, `Arg ...`) cannot be told about a curve: it avoids other labels and the ray but may sit on the plotted curve. A way to pass obstacle polylines (or have `addCurve` register them) would fix that. (b) On a 322 px plane the handle label that is flipped away from the zoom column can land on the other handle's label (circle preset: `centre` and `start`). Flip it only when the other side is free, or let the station choose the side. The station no longer shows the glitch on a default preset: the view runs from x = -4 to 5 (D1), so the start handle at x = 3 is far enough from the right edge for its word to stay on its right; plane.js still flips a word that gets close to the edge. When either (a) or (b) is done, D1 can go.
7. **`css/theme.css` (theme owner, optional).** In the light theme the bright end of the time ramp is a mid teal-grey (4.67:1 on white), so the ramp is a subtle gradient. The copy now promises only "darker early, lighter late". A lighter `--t1` (light theme) would make it stronger.
8. **A shared problem-card helper (orchestrator, optional).** `renderProblemCard`, `answerBox`, `plainProse`, `buildLinks` and `threadBadges` are written once in `curves.js` and once in `linear.js` (and `problems.js` has its own scroll hint). A module in `js/core/` or `js/stations/` (for example `problem-card.js`) that every station imports would stop the copies from drifting. This goal owns no such file.

### 9.3 Risks

| # | Risk | Mitigation in this design |
|---|---|---|
| R1 | An explainer cell function throws: the explainer logs `console.error` and `tools/smoke.mjs` fails the route (S4). | Every cell and `same` function is total and unit-tested for 5 presets x 2 directions x 4 times (C17) and the linear edge cases (L14). |
| R2 | KaTeX cannot break a line inside a `\textcolor` group, so a long tinted cell would clip on a phone (S5). | Columns use `tint: true`; `cart()`/`polar()` wrap only short pieces. The builder checks the phone screenshot of the three longest cells (eight, square, composition `check`). |
| R3 | The orientation chip for an open curve says "no": a reviewer may expect "n/a". | The reason line says it plainly and the goal's A2 pins only the square; the chip stays `yes` or `no` so the shared CSS and the goal's reading hold. |
| R4 | Dragging the centre moves `b` off the plane. | Documented edge (8.1); Reset and zoom recover; nothing breaks. |
| R5 | The sticky stage bar could cover a control on a phone. | Playwright centres an element before clicking (`scrollIntoViewIfNeeded`), the bar is only about 110 px and sticks only inside the stage block; the script asserts every click it makes at the phone viewport. |
| R6 | The magnet snaps a drag target the script asked for exactly. | The script's targets are lattice points (1, -2), (1, 1), (0, 1) or it allows 0.2 of tolerance; keyboard steps are 0.5. |
| R7 | `window.__mv.linearImage` read as `.points` by a verifier. | Both forms work (4.2.4); the interaction script reads whichever is present. |
| R8 | P3 DOM re-ordering confuses focus order. | The order is decided once at mount (DOM order equals visual order); nothing is re-ordered afterwards; a chip click scrolls instead. |
| R9 | The `Lab` station (another wave-1 goal) may not exist while this one is verified. | The interaction script never clicks `#linear-open-lab` (the router would log an error for a missing module); the hand-off is covered by the unit test L13. |
| R10 | Two mounts of the same station racing (router supersede). | Each mount's hooks are removed only if they are its own (8.1); `destroyed` guards every callback. |
| R11 | `classify` thresholds change in a later iteration (20 degrees, 12 corners). | The unit test C13 pins the classification of all presets, so a threshold change that flips one fails loudly. |
| R12 | A verifier types `c` and `d` right after the P4 step without reloading a problem route (the goal's A4 text lists P4 before the composition step). | The composition panel composes with the **current** f; after P4 it correctly reads `ac = 2i; ad + b = 1 + i`. The design's own script reloads `#problem-P3` first (7.3 step 12); a verifier must do the same to get `ac = -1 + i`, and the design says so here. |

---

## 10. Build notes (Builder, stage 3)

Built as designed; `npm test` (this goal's 36 cases C1 to C19 and L1 to L17, plus a = 2 in L7), the six-route smoke with `--dark`, the ten token routes, and the interaction script at desktop, phone and desktop-dark all pass. Measured: worst plane draw 18.7 ms while dragging the stage slider at 4x CPU throttle (budget 25 ms), cold mount of `#problem-P3` 220 ms and `#problem-1-5-1` 241 ms at 4x. Small deviations, each found by looking at the screenshots:

| # | Where | Design said | Built | Why |
|---|---|---|---|---|
| D1 | `curves` plane view | `xRange [-4.5, 4.5]`, `yRange [-4.5, 4.5]` (5.1.11 step 4) | `yRange [-4, 5]`; **fix round 2:** `xRange [-4, 5]` too | on a phone the "start" label of the default handle (2, 1) sat under the plane's Reset button, so the view is shifted down half a unit; and the start handle of the circle, the half circle and the eight is at x = 3, 14 px too close to the right edge of a 322 px plane for plane.js to keep its word on the right, so it flipped the word onto the `centre` word (`censtart`). Shifted right half a unit it stays on the right |
| D2 | `curves` handles | default handle radius | `radius: 6` | the arrowhead at t = 1 sits exactly under the `end` handle; a slightly smaller dot lets the tip of the arrowhead show (A3) |
| D3 | `curves` orientation marker | marker at t = 0.375 for every closed preset | t = 0.125 for the square, 0.375 for the circle; **fix round 2:** these are only the first choices of a list (`ORIENT_MARKERS`), and the marker whose label has the clearest spot wins | at t = 0.375 the square's marker sits on the x-axis and its text runs over the `centre` label; on a 3-unit square (144 px) no single marker leaves room for the label next to its tip |
| D4 | `linear` fixed-point label | drawn with the default label offset | `labelOffset { dx: 8, dy: 28 }` | at P4 the fixed point is the origin, and its label hid the `0` and `1` labels |
| D5 | `linear` readout | `a = <cart> = <polar>` | the second part is dropped when it would repeat the first (ARCHITECTURE 9 needs the matching one-line amendment: request 5 in 9.2) | `a = 1` read `a = 1 = 1` and `a = 2` read `a = 2 = 2`; the four pinned strings are unchanged |
| D6 | `linear` off-screen note | shown when pieces exist but none is in view | also shown when `pushForward` returns no piece (every point beyond the clamp radius) | with a = 31 the image was empty and nothing explained why |
| D7 | `linear` stage-bar phone layout | (none; the design's own CSS) | the phone rule `.ln-bar-row { 1 column }` that was drafted was dropped; only the tick words are hidden under 30 rem | with one column the bar was 165 px tall; with the design's two columns the two planes and the bar fit one 844 px screen. **Fix round 1:** that claim was 26 px short (the bar covered the bottom of the w-plane once the block sat under the header); the phone rules in 4.3 now give 12 px of clearance, and the script checks it (`stageFits`). **Fix round 2:** the phone caption is `.84rem` and at least two lines high, which gives about 16 px |
| D8 | `linear` composition motion text | `... is past π, so the home step is Arg(ac) = ...` | the same, with `past -π` when the angle sum is negative | the text must be true for a = c = -i. **Fix round 2 correction:** the sentence "the pinned positive case is unchanged" was false: fix round 1 reworded the positive case as well (`spins add: 90 + 45 = 135 degrees.` became `spins add: 90 and 45 give 135 degrees.`, to avoid `-90 + -90`), and 5.2.10, 6.11 and the tests L8 and L14 now all say the new words. **Fix round 1:** the spins now read `spins add: -90 and -90 give -180 degrees` (no doubled sign), and an angle sum of exactly -π reads `-3.142 is not in (-π, π], so the home step is Arg(ac) = 3.142` (it is on the seam, not past it); only a sum below -π says `is past -π` |
| D9 | `linear` internal state | field `S.t` | field `S.clock` (still reported as `t` by `window.__mv.linear.state()`) | unit case L17 forbids the text `.t =` in `linear.js` (no hand-made t on an image point); `S.t = ...` would match it |
| D10 | `linear` stroke hint | shown only with no stroke | on a phone the "Drawing is on: touch outside the left plane to scroll the page." sentence stays while draw mode is on, with or without a stroke | the page does not scroll under a finger on the left plane in draw mode, and that is true after the first stroke too |

Not changed: `js/registry.js`, `css/*`, `tools/smoke.mjs` and every other file (the design asked for no changes there). The interaction script moves the followed point `t` to 0.5 before sampling the ramp pixels on the w-plane (the cursor ring at 0.875 sits next to the sample at t = 0.9; the design says the same in 7.4). The `Open in the Lab` button is not clicked by the script (the Lab may not exist while this goal is verified; L13 covers the hand-off).

### 10.1 Fix round 1 (Builder, after review A)

Ten findings; each is answered below. Tests: `npm test` (this goal now has C1 to C22 and L1 to L17), the interaction script at desktop, phone and desktop-dark on every route it covers, the six-route smoke with `--dark`.

| # | Finding | What was done |
|---|---|---|
| 1 | major: the handle words do not follow Reverse | `handleLabels(preset, reversed)` (exported, pure) gives the words; `toggleReverse` calls `rebuildHandles`, so after Reverse the segment's handle at (2, 1) says `end` and the one at (-3, -3) says `start`; a reversed half circle's b says `end` (it then starts at 2a - b, where there is no handle); closed curves keep their words. Unit C20 pins the words against `curveAt(0)` and `curveAt(1)` for every preset both ways; the script checks them in the DOM. |
| 2 | major: content above the control plane changes height during a drag | At the source: `#linear-note` moved under the readout (beside the plane on desktop, below it on a phone); `#linear-offscreen` floats over the bottom of the w-plane (`position:absolute`); `#linear-compose-note` is always present and only its emphasis changes (`data-active`); the composition readout does not wrap. What cannot be fixed at the source is retypeset text (at P3 the composition table sits above the plane and is rewritten after every step), so the station also holds the plane in place by hand, like scroll anchoring does for Chromium: while a or b has moved in the last 1.5 s, a ResizeObserver on the station's blocks scrolls the page by any change in the plane's top, measured against the place held at the start of the movement. Measured with scroll anchoring switched off (as in Safari), one press through a = 0 and out to (4, -4): 2.1.3 and P4 move 0.00 px, even in the page, **when a is dragged**; P3 moves 0.2 px (desktop) and 0.4 px (phone) in the viewport, where before the fix it moved 24.8 and 49.6 px; the handle stays within 0.13 units of the pointer. **Correction (fix round 2, finding 5):** "nothing above the plane changes height at all" was only true for a. Dragging **b** at stage 3 on a phone flipped the sticky bar's caption between two and three lines (101 px to 125 px), and the keeper scrolled the page by 24 px each time (the plane stayed within 0.5 px, so the pointer never lost the handle). The build script only dragged a. See 10.2, finding 5. |
| 3 | minor: the phone stage bar covers 26 px of the w-plane | Phone rules in 4.3 (figure padding, gaps, caption size, bar padding): the w-plane now ends 12.6 px above the bar once the block is under the header. D7 corrected. |
| 4 | minor: composition motion text | Reworded (D8). |
| 5 | minor: the orientation label crosses the curve and the handles | `placeOrientLabel` (pure, exported, C21) puts it beside the arrow tip, on the inside if there is room, otherwise turned away from the handles (with their words), the cursor, the zoom buttons and the curve; narrow planes get `inside: left` / `inside: right`. The overlay's own `r = ...` label sits on the curve because the plane's placer cannot be told about the curve: request 6 in 9.2. |
| 6 | minor: tick words are not under the slider | The ticks share the slider's grid column and are placed at 0, 33.3, 66.7 and 100 % of the track (inset by half a thumb); checked within 6 px (`tickPlaces`). |
| 7 | minor: ARCHITECTURE 9 out of sync with D5 | `ARCHITECTURE.md` is not this goal's file: request 5 in 9.2 (one line). |
| 8 | minor: crowded labels on the phone w-plane | On a plane narrower than 400 px the `a` and `b` arrow labels are dropped, and the fixed-point label is `p` (the wide form `fixed point` crossed the input line); the hint under the controls says so. The `b` label is now drawn 30 % along its arrow, not in the middle, where it sat under `f(1)` at 2.1.3 on wider planes too. |
| 9 | minor: light-theme ramp | Copy now says `darker means early, lighter means late` (lede, Reverse hint, the two callouts). The token is the theme owner's: request 7 in 9.2. |
| 10 | minor: unused `polar` import; D1 | Import removed; unit C22 keeps both files free of unused imports. D1 stays: it only goes when plane.js stops flipping handle labels into the circle preset's `centre` label (request 6). |

### 10.2 Fix round 2 (Builder, after review B)

Twelve findings. Tests: `npm test` (this goal now has C1 to C25 and L1 to L21), the interaction script at desktop, phone and desktop-dark on all six routes, the six-route smoke with `--dark`.

| # | Finding | What was done |
|---|---|---|
| 1 | major: the scroll listener and the ResizeObserver are attached in the middle of `mount` | Both moved to the end of `linear.js` `mount`, after the hooks and after `wplane.on('viewchange')`; `unmount` still removes them; 4.2.7, 5.2.12 and 5.2.13 say so; unit L20 reads the order in the source. `curves` has no window or document listener (C25). |
| 2 | minor: the answer box is clipped on a phone, no hint, not focusable | `answerBox` in both files (2.9): focusable named scroller, hint `Scroll sideways to see the rest.` shown only while the TeX is wider than the box, the plain text below. Found while building it: the outer `.tex-scroll` never overflowed, because `.katex-display` inside it had its own `overflow-x: auto`; the station CSS now makes the outer box the scroller (as `problems.js` does) so the hint can be measured and the box can take focus. The script checks it on both stations at both widths (1.5.1 and 2.1.3 scroll at 390 px and fit at 1280 px). A shared helper would need a file this goal does not own: request 8. |
| 3 | minor: `centre` and `start` print on top of each other on the phone circle | The view runs from x = -4 to 5 (D1): the start handle at x = 3 keeps its word on its right, so plane.js does not flip it onto `centre`. The same held for the half circle and the eight (5 px overlap before). The script asserts no two handle words overlap, for every preset. |
| 4 | minor: the orientation label straddles the curve, the axes or the wrong side | Reworked (5.1.8): two short lines on a wide plane (84 x 32 px, the one-line sentence was wider than the 144 px square), one line on a phone; 16 turns and 5 pushes; costs for handles with their words (`handleBox`), the cursor, the zoom buttons, the curve, the outside of the curve, the axes and the numbers along them; the arrow may stand at the best of several places (`ORIENT_MARKERS`). The forward square now has its arrow on the bottom side and the label inside above it, the reversed square its label inside below `centre`, the circles inside beside the arrow. On a 3-unit square at phone size no spot is next to the tip; the label then sits in the middle of the square on the arrow's line. `window.__mv.curves.orient()` and the script check the result for the four cases. |
| 5 | minor: the note "nothing above the plane changes height" was false for b | Corrected in 10.1 (row 2). The script now drags b through decimal values at 2.1.3, P4 and P3 (`planeStaysPut`, `which: 'b'`). It reproduced the finding on a phone (caption 2 and 3 lines, page moved 23.6 px). Fixed at the source rather than reserved: the phone caption is `.84rem` with `min-height: 3.1em` (two lines), and the longest caption (70 characters) is two lines at 390 px, so b moves nothing (0.00 px, in the viewport and the page), and the bar is about 6 px shorter than before, so the w-plane ends 15.7 px above it (was 12.6). A three-line reserve would have cost 21 px of the one-screen fit (D7), so it was not made. Measured caption widths: at 375 px the 70-character caption still wraps to three lines, at 360 px and 340 px so do the 66 and 65-character ones (the others stay at two); there the bar grows by one line when b has long decimals and the plane keeper scrolls the page by that amount, as before (the plane stays within 0.5 px, and the bar grows upwards, away from the finger). |
| 6 | minor: design pinned `spins add: 90 + 45 = 135 degrees.` | 5.2.10 and 6.11 now pin `spins add: 90 and 45 give 135 degrees.`; D8 is corrected. |
| 7 | minor: the back callout said "dark-to-bright" | The copy-deck sentence: `The time ramp, darker early and lighter late, comes from Curves and time.` Unit L21 and the script check it. Request 7 (a lighter light-theme `--t1`) stays open. |
| 8 | minor: `f(0)` and `f(1)` print on top of each other at a = 0 | `dotWords` (5.2.13): one label, `f(0) = f(1) = b`, when the points coincide; `f(0), f(1)` when they are closer than 36 px. Unit L18; the script takes the `a-zero` shot. |
| 9 | minor: `aria-pressed` on a disabled orient button; b on top of a | `updateOrientButton` sets `aria-pressed` only while the button is enabled and removes it otherwise (script and 2.2). The handle just let go of goes underneath (`cv-under`, 5.1.6): after dropping b on a, a can be picked up; the script checks it with `elementFromPoint`. |
| 10 | minor: the composition readout scrolls on a phone | The readout is two spans split at the semicolon; on a phone they are two blocks (two lines, always, so the height does not change during a drag), on a wide screen one line. `c = 123.456+78.9i` no longer scrolls (322 in 322). `textContent` is unchanged. |
| 11 | minor: the P4 chip title shows `√2e^{iπ/4}` | `plainProse` (both files) writes `√2e^(iπ/4)`; unit C24 and the script. |
| 12 | minor: ARCHITECTURE 9 line is out of date (D5) | Not this goal's file: request 5 in 9.2 stays, with the exact line given in the build report for the orchestrator. |
