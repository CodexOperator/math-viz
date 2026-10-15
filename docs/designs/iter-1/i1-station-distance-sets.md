# Design: i1-station-distance-sets

Goal id `i1-station-distance-sets` (wave 1, kind station, size M). Owns `js/stations/distance.js` and `js/stations/sets.js`.
Test files this goal ships (named after the goal id, like every wave-0 goal): `tests/unit/i1-station-distance-sets.test.mjs` and
`tests/interact/i1-station-distance-sets.mjs`. Nothing else is created or edited.

Reads: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md` (sections 0, 1, 2 (the entries for stations 4 and 9), 3, 4, 8), `docs/ARCHITECTURE.md`
(3, 4, 5, 8, 9, 10) and the wave-0 sources `js/core/{complex,plane,katex,explainer,theme}.js`, `js/data/problems.js`,
`js/app.js`, `js/registry.js`, `tests/interact/_helpers.mjs`, `tools/smoke.mjs`, `css/{theme,components}.css`.

---

## 0. Reading notes: what is pinned, what this design adds, where it differs

### 0.1 Checked against the source (no difference found)

Every export this goal uses was compared with the code, not only with ARCHITECTURE: `createPlane` and its Plane object
(`addPoint`, `Handle.set`, `addLayer`, `on`, `getView`, `getSize`, `fromPixel`, `toPixel`, `requestDraw`, `destroy`),
`drawSegment`, `drawArc`, `drawCircle`, `drawRay`, `drawDot`, `drawLabel`, `drawSeam`, `drawPolarAddress`, `drawPolygonFill`,
`DASH`, `cssColor` (plane.js); `tex`, `prose`, `cart`, `polar` (katex.js); `createExplainer` with `setRows`, `update`, `destroy`
(explainer.js); `C`, `add`, `sub`, `abs`, `Arg`, `wrapArg`, `argSet`, `fmtNum`, `fmtCart`, `fmtAngle`, `exactAngle`, `texAngle`
(complex.js); `problemById`, `problemsForStation`, `statementParts`, `routeFor` (problems.js). Signatures,
defaults and behaviour match ARCHITECTURE 3.1 to 3.7. Facts from the code that the builder must know:

1. `drawCircle(..., { fill, innerRadius })` strokes **only the outer circle**. An annulus whose two edges have different styles
   (solid, dashed) is therefore drawn as one fill pass with `alpha: 0` (invisible outline) and then one outline pass per edge.
2. `drawArc` and `drawSegment` take no alpha. A faint ghost arc cannot be drawn with them; this design does not need one (arg z is
   shown as a list, section 3.3).
3. `drawLabel` records its box in the plane's label frame, so the labels placed by `drawPolarAddress` at the end of the frame
   dodge it. Labels this design draws with `drawLabel` do not dodge each other: positions are chosen so they cannot meet (5.3).
4. The explainer's footer label is the fixed string `same point:` followed by `agree` / `differ`. It is used as is (the request in 0.4 item 1 is still open after the fix round; the station does not reach into the widget's DOM to change the word).
5. `Handle.set(z, { silent: true })` inside an `onDrag` callback is legal and does not recurse. The plane applies the raw pointer
   position first and then calls `onDrag`, so a station can correct the position inside the callback (used for snapping, 5.2).
6. `addPoint({ snap })` is **not** used: the plane calls `snap` for keyboard nudges too, and a whole-number snap of 6 px swallows
   a 0.1 arrow-key step. Snapping is done in `onDrag`, only when `info.source === 'pointer'`.
7. A dragged handle is clamped to a 10 px inset by the plane, and the zoom buttons sit top right. All default positions and all
   test targets below are away from that corner.

### 0.2 Deliberate deviations from ARCHITECTURE (reviewers: these are decisions, not slips)

| # | ARCHITECTURE says | This design does | Why |
|---|---|---|---|
| D1 | 4.2: no preset opens the station's first problem's state | `#distance` (no preset) opens **two points** (problem 1.2.2), not the circle (1.2.1, the first handout problem) | The thread is "a distance is the length of one slide"; the circle is "all points at one fixed distance", which needs the idea of distance first. The mode chips run two, circle, triangle. `#problem-1-2-1` and `#distance-circle` still open the circle. |
| D2 | 4.3: planes are `<station>-plane` and handles `<plane>-<point>` | same, plus the handle ids `z1 z2 a R` (distance) and `p` (sets) exactly as section 9 names them | no deviation, listed so the builder does not rename them |
| D3 | 10.3.8 native badge per row | each explainer row carries a `native` as the STORY table says (distance 1.2.2 C, 1.2.1 P, triangle mixed; sets 1.5.2 P) | pinned by the problems data (`address: 'C'`, `'P'`, `'P'`) |

### 0.3 Things this design adds that section 9 does not list (so scripts and builders know they exist)

Extra element ids (none of them renames anything in section 9): distance: `distance-snap`, `distance-polar`, `distance-hint`,
`distance-args`, `distance-gauge`, `distance-gauge-legend`, `distance-aligned`, `distance-problem`, `distance-answer`, `distance-why`,
`distance-status`; sets: `sets-snap`, `sets-hint`, `sets-setline`, `sets-eps-value`, `sets-probe-detail`, `sets-boundary`,
`sets-answers`, `sets-<chip>-reason`, `sets-problem`, `sets-answer`, `sets-why`, `sets-key`, `sets-status`.
Route tokens (ARCHITECTURE 3.14 rule 5): `#distance-two`, `#distance-circle`, `#distance-triangle`; `#sets-annulus`, `#sets-closed`,
`#sets-punctured`, `#sets-halfplane`, `#sets-twodisks`. Test hooks: `window.__mv.distance` and `window.__mv.sets` (read-only, 4.1 and 4.2).

### 0.4 Requests to other owners (not done here; recorded so the orchestrator can schedule them)

1. `js/core/explainer.js` (i1-core-widgets): let `spec.sameLabel` replace the fixed word "point" in `same point:`. For a distance the honest
   words are "same distance" and "same size". Until then the footer reads "same point: agree", which is harmless but loose.
2. A shared `js/core/chrome.js` with the station header and the footer links (ARCHITECTURE 4.1 and 4.6) would remove about 60
   duplicated lines per station; eleven stations are being built concurrently, so this goal builds the two blocks locally (4.3).
3. `js/core/plane.js`: pass `{ altKey }` in the `onDrag` info so a station can switch snapping off for one drag. Not needed now: the
   snap checkboxes cover it.

---

## 1. Goal, story thread, problems

### 1.1 Goal restatement

Build two stations, each a module `export function mount(el, ctx) -> unmount`:

* **`distance`, "Length, Distance, Circles"** (registry order 3, thread T1, part I). One complex plane with three modes selected by chips:
  * **two points**: `|z|` is the length of the ray from 0; `|z1 - z2|` is the length of the slide between two draggable points, drawn
    as the slide, its two Cartesian legs and its length; problem **1.2.2**.
  * **a circle**: the set `|z - a| = R` as a circle with a draggable centre `a` and a draggable point on the circle that sets `R`;
    problem **1.2.1**.
  * **triangle inequality**: the triangle 0, z1, z1 + z2 with the three lengths, the live slack `|z1| + |z2| - |z1 + z2|`, the lower
    bound `| |z1| - |z2| |`, and a gauge that puts all of them on one line; topic **T1.2**.
* **`sets`, "Disks, Annuli, Boundaries"** (registry order 8, threads T1 and T3, part II). One plane showing a set S (default
  `1 < |z + i| <= 3`) with a draggable probe point and an epsilon-disk around it, six answer chips (open, closed, bounded,
  connected, domain, region) that are computed from the set, and five presets plus two strictness checkboxes; problem **1.5.2**
  and the second half of topic **T1.5** (epsilon-neighbourhoods, punctured disks, interior / exterior / boundary, open / closed /
  bounded / connected, domain, region). The curve half of T1.5 belongs to `curves`.

Both are static ES modules with no network, no build step, using only the wave-0 engines.

### 1.2 Story thread carried, and how it shows on screen

* **Thread 1, native shapes: a distance is the length of one slide (Cartesian); a circle is the set of points at one distance
  (polar).** On screen: the slide between z1 and z2 is drawn as an **orange** (`--polar`) line, because its length is a polar
  quantity, with its two components as **blue dashed legs** (`--cart`), because the slide is a subtraction in (x, y). The
  explainer's two columns work the same distance both ways: the Cartesian column is a square root of squared differences; the
  polar column is the law of cosines on r1, r2 and the angle between them. A badge on each row says which one is easy.
* **Cross-address identity that makes the two columns agree.** `x1 x2 + y1 y2 = r1 r2 cos(theta1 - theta2)` (both are `Re(z1 conj z2)`). The
  triangle explainer shows it as its own row, so "the two addresses agree" is a computed fact the student watches, not a claim.
* **Thread 2 (arg z, Arg z) in a supporting role.** Wherever an angle appears it is labelled `Arg` and the set is shown as a list
  with the home value highlighted: `arg z1 = { ..., -5.961, 0.322, 6.605, ... }`. The geometric point of that list: the distance
  formula uses `cos(theta1 - theta2)`, and a cosine ignores whole turns, so **every name of the angle gives the same distance**. In the
  triangle mode the slack is zero exactly when `arg z1` and `arg z2` are the same set (equal Arg). The circle's polar address about
  `a` shows `Arg(z - a)` and its set the same way.
* **Thread 1 and 3, tiny disks (sets).** A set is understood by a disk around a point. The probe's disk is shaded by what it
  contains; the same disks return in `limits` (epsilon-delta) and `derivative`. The annulus is polar-native (a condition on the
  distance from -i); the half-plane preset is Cartesian-native (a condition on y), so the two presets teach "pick the address where
  the question is native" by contrast.
* **Not carried here:** time colouring (no motion; the first ramp is in `curves`), input versus output (only the z-plane exists:
  every draggable is `--input`, nothing is `--output`).

### 1.3 Review problems and topics covered

| Id | Statement (handout) | Where | Address |
|---|---|---|---|
| 1.2.1 | Sketch `{ z : \|z - (1 + 2i)\| = 3 }` | `distance`, circle mode (preset `#problem-1-2-1`) | P (circle about `a`) |
| 1.2.2 | Distance between `4 + 3i` and `-1 + i` | `distance`, two-point mode (preset `#problem-1-2-2`) | C (the slide) |
| 1.5.2 | `S = { 1 < \|z + i\| <= 3 }`: open / closed / neither, bounded, boundary points, domain? | `sets`, preset annulus (`#problem-1-5-2`) | P (ring about `-i`) |
| T1.2 | geometric interpretation: vectors, modulus, distance, triangle inequality and the lower bound `\|\|z1\| - \|z2\|\| <= \|z1 +- z2\|` | `distance`, all three modes | C and P |
| T1.5 (part) | epsilon-neighbourhoods and punctured disks; interior, exterior, boundary; open, closed, connected, bounded; domains and regions | `sets` | P |

---

## 2. UX

### 2.1 Wireframes

Legend: `( )` chip, `[x]` checked checkbox, `o` handle, `[ ]` button. Plane sketches are not to scale.

#### 2.1.1 `distance`, desktop (content width about 940 px; two equal columns from 784 px of content width, stacked below)

```
+--------------------------------------------------------------------------------------+
| Length, Distance, Circles                                                  (h1)      |
| A distance is the length of one slide. |z| is the slide from 0 to z, and ...  (lede)  |
| (o) One point, two addresses  [1.2.1] [1.2.2]          (thread badge, problem chips) |
+--------------------------------------------------------------------------------------+
| Problem 1.2.2  Find the distance between 4 + 3i and -1 + i.        > Show the answer |  #distance-problem
+--------------------------------------------------------------------------------------+
| ( Two points )  ( A circle )  ( Triangle inequality )                #distance-modes |
+-------------------------------------------+------------------------------------------+
| +---------------------------------------+ | d = 5.385; z1 - z2 = 5 + 2i              |  #distance-readout
| | Im                         [+][-][Reset]| | Drag z1 and z2. The orange line is ...   |  #distance-hint
| | 9                                     | | [x] Snap to whole numbers                |  #distance-snap
| |                                       | | [ ] Show the polar route (rays, angles)  |  #distance-polar
| |                       o z1            | | +--------------------------------------+ |
| |                     /|  \             | | | arg z1 = { ..., -5.64, 0.644, 6.927 }| |  #distance-args
| |        d = 5.385  /  | Dy = 2         | | | arg z2 = { ..., -5pi/4, 3pi/4, ... } | |
| |                 /    |                | | | A cosine ignores whole turns, so ... | |
| |          o z2 ------- + Dx = 5        | | +--------------------------------------+ |
| |      (-1+i)                           | | (triangle mode only: gauge + aligned)    |
| |  0 .-- (dashed copy of the slide      | |                                          |
| |         0 -> 5 + 2i)             Re   | |                                          |
| +---------------------------------------+ |                                          |
+-------------------------------------------+------------------------------------------+
| The same distance in both addresses                                          (h2)    |
| +-------------+------------------------------------+-------------------------------+ |  #distance-ex
| | Quantity    | Cartesian (slide)                  | Polar (spin-and-stretch)      | |
| | slide z1-z2 | (x1-x2)+i(y1-y2)=(4-(-1))+i(3-1)   | r = 5.385, Arg(z1-z2) = 0.381 | |
| |  easy in C  |   = 5 + 2i                         |                               | |
| | z1          | z1 = 4 + 3i                        | r1 = 5, Arg z1 = 0.644        | |
| | z2          | z2 = -1 + i                        | r2 = 1.414, Arg z2 = 3pi/4    | |
| | distance d  | d = sqrt(5^2 + 2^2) = sqrt(29)     | d = sqrt(25 + 2 - 2(5)(1.414) | |
| |  easy in C  |   = 5.385                          |   cos(-1.713)) = 5.385        | |
| | same point: agree   d = 5.385                      d = 5.385                     | |
| +-------------+------------------------------------+-------------------------------+ |
+--------------------------------------------------------------------------------------+
| [ easy in Cartesian ]  Why this address: The distance between two points is ...      |  #distance-why
+--------------------------------------------------------------------------------------+
| <- Slide, Spin, Stretch, Mirror     Staircase ->      Next: Disks, Annuli, Boundaries|  nav.station-links
+--------------------------------------------------------------------------------------+
```

#### 2.1.2 `distance`, phone (390 px viewport, 358 px content, everything stacked)

```
+--------------------------------+
| Length, Distance, Circles      |
| A distance is the length of ...|
| (o) One point, two addresses   |
| [1.2.1] [1.2.2]                |
+--------------------------------+
| Problem 1.2.2                  |
| Find the distance between      |
| 4 + 3i and -1 + i.             |
| > Show the answer              |
+--------------------------------+
| ( Two points ) ( A circle )    |
| ( Triangle inequality )        |
+--------------------------------+
| +----------------------------+ |  plane 358 x 358 px, 29.8 px per unit
| |                    [+][-]  | |
| |            o z1            | |
| |          /|                | |
| |   o z2 -- +                | |
| | 0 .                        | |
| +----------------------------+ |
| d = 5.385; z1 - z2 = 5 + 2i    |  readout (wraps)
| Drag z1 and z2. The orange ... |
| [x] Snap to whole numbers      |
| [ ] Show the polar route       |
| arg z1 = { ... }  (callout)    |
+--------------------------------+
| The same distance in both      |
| addresses                      |
|  slide z1 - z2   easy in C     |
|  CARTESIAN (SLIDE)             |
|  (x1-x2)+i(y1-y2) = ... = 5+2i |
|  POLAR (SPIN-AND-STRETCH)      |
|  r = 5.385, Arg(z1-z2) = 0.381 |
|  ... (stacked, as the widget   |
|  does at 560 px and below)     |
+--------------------------------+
| why-callout, station links     |
+--------------------------------+
```

The plane starts near the fold on a phone (header plus problem callout plus chips use about 330 px of an 844 px viewport, the plane
358 px, the readout directly under it). That is accepted: the readout is the first block after the plane in the DOM, so it stays in view
while the student drags.

#### 2.1.3 `distance`, what the plane shows in each mode (view x in [-4, 8], y in [-3, 9], 12 units across)

```
TWO POINTS (default z1 = 4+3i, z2 = -1+i)       CIRCLE (default a = 1+2i, dot z = 1+5i, R = 3)
 Im ^                                            Im ^
  5 |                                             5 |        o z (1+5i)       Arg(z-a) = pi/2
  4 |                                             4 |      . | .    <- circle |z-a| = R, solid --polar
  3 |                       o z1                  3 |    .   | R=3  .
  2 |           .- - - - - -'| . (0 -> 5+2i)      2 |   .    o a    .   . . . . seam (dashed, left of a)
  1 |     o z2 - - - - - - - + corner (4,1)       1 |    .         .
  0 +-------------------------> Re                0 +-----.-------.-------------> Re
        orange = d (solid, arrow at z1)          -1 |        ' - '
        blue dashed legs: Dx = 5, Dy = 2

TRIANGLE (default z1 = 3+i, z2 = 1+2i)
 Im ^
  4 |                    . o (z1+z2 = 4+3i)  dot, label "z1 + z2"
  3 |            _ _ _ . / | \ . 
  2 |      o z2 - - - - /- -+- - - -    dashed blue parallelogram 0, z2, z1+z2, z1
  1 |        .      _ /     o z1       orange sides: 0->z1 (|z1|), z1->z1+z2 (|z2|)
  0 +-- 0 ---------------------> Re    thick orange short cut: 0 -> z1+z2 (|z1+z2|)
     dashed ring: circle |w - z1| = |z2| (where the tip can go if z2 turns)
     rings "longest" and "shortest": on the ray through 0 and z1, at |z1|+|z2| and | |z1|-|z2| |
```

Gauge (triangle mode, a DOM element under the readout, 3 px of padding, full side-column width):

```
 the short cut and the detour
 0 [=================================//////////] 5.398          track = |z1| + |z2| (the detour)
                 | lower bound 0.926           ^ fill = |z1 + z2| = 5 (the short cut); hatched = slack
 [#] |z1 + z2| = 5   [|] lower bound 0.926   [/] slack = 0.398   |z1| + |z2| = 5.398
 Almost aligned? no: arg z1 and arg z2 share no angle, so there is slack.            #distance-aligned
```

#### 2.1.4 `sets`, desktop

```
+--------------------------------------------------------------------------------------+
| Disks, Annuli, Boundaries                                                    (h1)    |
| A set is understood one point at a time. Put a tiny disk around a point. ...  (lede) |
| (o)(o) One point, two addresses / A function is a motion ...     [1.5.2]             |
+--------------------------------------------------------------------------------------+
| Problem 1.5.2  Consider S = { z : 1 < |z + i| <= 3 }. Is S open, closed, ...  > Show |  #sets-problem
+--------------------------------------------------------------------------------------+
| ( Annulus ) ( Closed annulus ) ( Punctured disk ) ( Half plane ) ( Two disks )       |  #sets-presets
|  S = { z in C : 1 < |z + i| <= 3 }                                          (KaTeX)  |  #sets-setline
+------------------------------------------+-------------------------------------------+
| +--------------------------------------+ | probe: interior; eps = 0.5                |  #sets-readout
| | Im                     [+][-][Reset] | | p = 2 is in S. The largest disk around    |  #sets-probe-detail
| |          . - - - - - - .   |z|<=4     | | it that stays inside S has radius 0.764.  |
| |       .'   ___________   '.          | | Your disk fits.                           |
| |      .   .'    ___    '.   .  solid   | | Disk radius eps  [-----o-------]  0.5     |  #sets-eps
| |     .   .    .'   '.    .   outer    | | [x] Snap the probe onto an edge           |  #sets-snap
| |     .   .    |  +  |    .   ring     | | [x] Leave out the inner circle            |  #sets-inner-strict
| |     .   .     '. .'    . o p (2)     | | [ ] Leave out the outer circle            |  #sets-outer-strict
| |      .   '.   dashed  .'   <- eps    | | Boundary points: the circle |z + i| = 1   |  #sets-boundary
| |       '.   '-.______.-'  .'    disk  | |  (not in S); the circle |z + i| = 3 (in S)|
| |     c = -i  '-._____.-'              | | Key: solid edge in S, dashed not in S,    |  #sets-key
| |                                Re    | |  green disk all in S, grey none in S,     |
| +--------------------------------------+ |  amber ring: the edge runs through it     |
+------------------------------------------+-------------------------------------------+
| Answers for this set                                                  (#sets-answers)|
|  (Open? no)       The circle |z + i| = 3 belongs to S, but every disk around ... open |
|  (Closed? no)     The circle |z + i| = 1 is a boundary of S that is not in S. ...     |
|  (Bounded? yes)   S fits inside the disk |z| <= 4.                                    |
|  (Connected? yes) S is one piece: you can walk between any two of its points ...      |
|  (Domain? no)     A domain is open and connected. S is not open and connected, so ... |
|  (Region? yes)    S is the domain 1 < |z + i| < 3 plus some of its boundary.          |
+--------------------------------------------------------------------------------------+
| Where is p, and is it in S?   rows: where / test / room around p            #sets-ex |
+--------------------------------------------------------------------------------------+
| why-callout (easy in Polar), station links                                           |
+--------------------------------------------------------------------------------------+
```

#### 2.1.5 `sets`, phone (390 px)

```
+--------------------------------+
| h1, lede, badges, [1.5.2]      |
| Problem 1.5.2 + statement      |
| (Annulus)(Closed annulus)      |
| (Punctured disk)(Half plane)   |
| (Two disks)                    |
| S = { z in C : 1 < |z+i| <= 3 }|  scrolls inside its own box if wide
| +----------------------------+ |  plane 358 x 358, 35.8 px per unit
| |  annulus, probe, eps-disk  | |
| +----------------------------+ |
| probe: interior; eps = 0.5     |
| p = 2 is in S. The largest ... |
| Disk radius eps [----o---] 0.5 |
| [x] Snap the probe onto an edge|
| [x] Leave out the inner circle |
| [ ] Leave out the outer circle |
| Boundary points: ...           |
| key (wraps)                    |
| Answers: six rows, chip above  |
|  its reason, one column        |
| explainer (stacked)            |
| why-callout, station links     |
+--------------------------------+
```

### 2.2 Controls, ids, labels and behaviour

All ids are stable across mounts. Visible labels are plain text; every control has a visible label or an `aria-label`.

#### 2.2.1 `distance`

| Id | Element | Visible label | Behaviour |
|---|---|---|---|
| `distance-modes` | `div.chips[role=group][aria-label="What to look at"]` | none | holds the three mode chips |
| `distance-mode-two` | `button.chip[type=button][aria-pressed]` | "Two points" | `setMode('two')`; exactly one mode chip is `aria-pressed="true"` |
| `distance-mode-circle` | same | "A circle" | `setMode('circle')` |
| `distance-mode-triangle` | same | "Triangle inequality" | `setMode('triangle')` |
| `distance-plane` (plane id) | `div.plane` created by `createPlane`; viewport `#distance-plane-viewport`, canvas `#distance-plane-canvas` | aria-label "Complex plane for distances and circles" | wheel zooms only when focused or Ctrl; drag on empty space pans; `+ - 0` keys zoom and reset |
| `distance-plane-z1` | handle (button) | dot label `z₁` | two and triangle modes. Drag, or arrow keys (0.1; Shift 1; Alt 0.01). Pointer drags snap to whole numbers when `#distance-snap` is on |
| `distance-plane-z2` | handle | dot label `z₂` | same |
| `distance-plane-a` | handle | dot label `a` | circle mode. Moves the whole circle: the dot `R` keeps its offset from `a` and both stay in view |
| `distance-plane-R` | handle | dot label `z` (aria name "z on the circle"; the id keeps the name `R` that section 9 gives it) | circle mode. Sets the radius `R = abs(z - a)`; the radius never goes below 0.25 |
| `distance-snap` | `label.check > input[type=checkbox]` | "Snap to whole numbers" | default checked; pointer drags only; keyboard nudges never snap |
| `distance-polar` | `label.check > input[type=checkbox]` | two: "Show the polar route: rays from 0 and the angles"; circle: "Show the angle at the centre"; triangle: "Show the angles Arg z₁ and Arg z₂" | default per mode: two off, circle on, triangle on; remembered per mode while mounted |
| `distance-readout` | `div.readout` | none | ARCHITECTURE 9 formats (2.5.2); `data-mode` holds the mode |
| `distance-hint` | `p.muted` | none | one sentence on what to touch (2.5.1) |
| `distance-args` | `div.callout[data-tone=polar]` | none | arg z shown as a list with Arg highlighted, plus the one-sentence consequence (3.3, 2.5.4) |
| `distance-gauge` | `div[role=img]` | none | triangle mode only (`hidden` otherwise); `data-slack`, `data-lower`, `data-upper`, `data-sum`; `aria-label` restated on every update |
| `distance-gauge-legend` | `ul` inside the gauge block | none | four swatch items |
| `distance-aligned` | `p` inside the gauge block | none | the verdict on the two arguments, four cases (2.5.4); `data-agree` holds `exact`, `near`, `no` or `zero` |
| `distance-problem` | `div.callout` | "Problem 1.2.2" or "Problem 1.2.1" or "Topic T1.2" | statement through `statementParts`; `<details id="distance-answer">` with the answer (none for the triangle topic) |
| `distance-ex` | explainer id (host `#distance-ex-host`) | headings "Cartesian (slide)" and "Polar (spin-and-stretch)" | rows per mode, 5.7 |
| `distance-why` | `div.callout[data-tone]` | badge "easy in Cartesian" or "easy in Polar" or "easy in both, for different reasons" | the `addressWhy` sentence of the loaded problem, or the triangle sentence |
| `distance-status` | `div.sr-only[aria-live=polite]` | none | restates the readout after a drag ends, a key nudge, or a mode change; never during a drag |

#### 2.2.2 `sets`

| Id | Element | Visible label | Behaviour |
|---|---|---|---|
| `sets-presets` | `div.chips[role=group][aria-label="Which set"]` | none | five preset chips |
| `sets-preset-annulus` | `button.chip[aria-pressed]` | "Annulus (1.5.2)" | loads geometry and the default flags of 1.5.2 |
| `sets-preset-closed` | same | "Closed annulus" | same geometry, both edges kept |
| `sets-preset-punctured` | same | "Punctured disk" | `0 < \|z + i\| < 3` |
| `sets-preset-halfplane` | same | "Half plane" | `Im z > 0` |
| `sets-preset-twodisks` | same | "Two disks" | `\|z + 2\| < 1 or \|z - 2\| < 1` |
| `sets-setline` | `div.tex-scroll` | none | the current set in KaTeX; `data-text` holds the ASCII form, for example `1 < \|z + i\| <= 3` |
| `sets-plane` (plane id) | `div.plane`; viewport `#sets-plane-viewport` | aria-label "Complex plane with a set and a probe point" | as the distance plane; a tap (press and release within 3 px, under 500 ms) on empty canvas puts the probe there |
| `sets-plane-p` | handle | dot label `p` (aria name "probe p") | drag or arrow keys (step 0.05; Shift 0.5; Alt 0.005); pointer drags snap onto an edge within 6 px when `#sets-snap` is on |
| `sets-eps` | `input[type=range]` in `.slider-row[data-tone=polar]`, min 0.05, max 2, step 0.05, value 0.5 | "Disk radius ε" with `output#sets-eps-value` | resizes the probe's disk; listens to `input` |
| `sets-snap` | checkbox | "Snap the probe onto an edge when it is close" | default checked |
| `sets-inner-strict` | checkbox | per preset (5.11 item 11): annulus and closed "Leave out the inner circle"; punctured "Leave out the centre point"; halfplane and twodisks disabled, "No inner edge in this set" | checked means the inequality is strict (`<`) |
| `sets-outer-strict` | checkbox | annulus, closed and punctured "Leave out the outer circle"; halfplane "Leave out the edge line"; twodisks "Leave out the circles" | checked means strict |
| `sets-readout` | `div.readout` | none | `probe: interior; eps = 0.5` (word is exactly one of `interior`, `exterior`, `boundary`); `data-kind` holds it |
| `sets-probe-detail` | `p` | none | the sentence about the probe and the largest disk (2.5.7) |
| `sets-boundary` | `p` | none | the boundary edges, each marked in S or not in S |
| `sets-open`, `sets-closed`, `sets-bounded`, `sets-connected`, `sets-domain`, `sets-region` | `button.chip[type=button][data-answer="yes"/"no"][aria-pressed][aria-describedby=<id>-reason]` | "Open? no" etc. | the answer is **computed** from the set; clicking toggles a highlight on the plane (5.9); one highlight at a time |
| `sets-<name>-reason` | `span` | none | the reason sentence (2.5.8) |
| `sets-key` | `div` | none | the legend of the plane's marks |
| `sets-ex` | explainer id (host `#sets-ex-host`) | headings "Cartesian (x, y)" and "Polar (distance ρ from the centre)" | rows where, test, gap |
| `sets-problem`, `sets-why`, `sets-status` | as in distance | | |

### 2.3 Interaction: pointer, touch, keyboard

**Pointer (mouse and pen).** Handles are the plane's `button`s with `touch-action: none` and a hit area of at least 32 px (the plane
raises it to the 44 px `--tap` on coarse pointers). A drag sets the position through the plane; `onDrag` then snaps (distance: whole
numbers within 6 CSS px; sets: onto an edge within 6 CSS px) and moves the dot with `Handle.set(z, { silent: true })`. The pixel tolerance is
read from `plane.getView().scale` on every call, so snapping follows zoom. Dragging empty canvas pans (the plane's job). In `sets`
a press and release on empty canvas that moves at most 3 px (the plane's own pan threshold) and lasts under 500 ms is a **tap**: the
probe jumps there, through the same edge snapping as a drag.

**Touch.** Identical, through pointer events. A single-finger drag that starts on empty canvas scrolls the page (the plane's
`touch-action: pan-x pan-y`); a two-finger pinch zooms the plane. The tap rule above gives a phone user a precise way to put the probe where a
finger cannot: tap, then fine-tune with the arrow keys of a connected keyboard, or turn the snap off and drag. Handle dots are 14 px
with a 44 px hit area on coarse pointers. Two handles that end up on top of each other (the whole-number snap makes that easy) stay reachable: Tab and the arrow keys move either one.

**Keyboard.** Tab order: skip link, nav, then in the station: problem chips in the header, `Show the answer` summary, the mode (or preset) chips, the plane (focus stop; `+ - 0` and arrows
pan and zoom it), the visible handles in DOM order (`z1`, `z2`, `a`, `R`; `p`), the checkboxes, the slider, the answer chips, the explainer
(no stops), the links. A focused handle moves with the arrow keys by its step (distance 0.1, sets 0.05; Shift ten times, Alt a tenth);
**keyboard moves never snap**, so a keyboard user can leave a whole number or an edge. Chips are native buttons (Space and Enter). The
`#sets-eps` slider is a native range (arrows, Home, End, PageUp, PageDown). Escape during a pointer drag restores the start (the plane's behaviour). Every control
shows the shell's `:focus-visible` ring.

### 2.4 Empty, loading and error states

| State | What the student sees | Cause and handling |
|---|---|---|
| Loading | the router's "Loading..." line if the module import takes over 150 ms; otherwise nothing | `mount` is synchronous (no await), so the station appears in one step; no skeleton is needed |
| KaTeX missing | explainer cells and the set line show the TeX source in the monospace error style; readouts, answers and chips are unaffected | `tex()` degrades by itself; every number a test or a student needs is also in plain text |
| Canvas unavailable | the plane shows its own note "This picture needs canvas drawing... The numbers beside it still work." | plane.js; nothing to do here |
| A drawing layer throws | the plane disables that layer and shows "Part of this picture could not be drawn. The numbers beside it are still right." | plane.js; every layer is written to never throw on finite input (5.3, 5.9) |
| Zero distance (`z1 = z2`) | readout `d = 0; z1 - z2 = 0`; no legs, no arrow; the polar cell says "The slide is 0, so it has no direction." | `slideStats` returns `theta: null` |
| A point at 0 | the polar cell says "r = 0. A point at the origin has no direction, so Arg is not defined here." and the arg list says "0 has no direction: every angle reaches it." | `Arg(0) = 0` is a convention; the copy does not repeat it as a fact |
| Radius would be 0 | the dot is pushed out to 0.25 along its last direction | `R`'s `onDrag` |
| Problem data missing (`problemById` returns null) | the problem callout is simply not rendered | the callout is built inside try/catch |
| Router passes an unknown token | the station opens in its default state, no message | `modeFromPreset` and `presetFromContext` fall back |
| Reload or navigation | state is in memory only (nothing is written to `ctx.store`); the default state returns | by design: both stations are one-minute exercises |

### 2.5 Copy (exact strings; static text may use Unicode math symbols, every generated number uses `fmtNum` / `fmtCart` with an ASCII minus)

#### 2.5.1 distance: lede, hints

* **Lede** (`p.station-lede`): "A distance is the length of one slide. |z| is the slide from 0 to z, and |z₁ − z₂| is the slide from z₂ to z₁. Drag the points and read the length off both addresses. A circle is every point at one fixed distance from a centre."
* **Hint, two points:** "Drag z₁ and z₂. The orange line is the distance. The blue dashed legs are the slide across and up. The dashed orange arrow is the same slide moved to start at 0, so its length is |z₁ − z₂|."
* **Hint, circle:** "Drag the centre a to move the circle. Drag the dot z to change the radius. Every point of the circle is exactly R from a, and nothing needs expanding."
* **Hint, triangle:** "Drag z₁ and z₂. The two orange sides are |z₁| and |z₂|. The thick one is the short cut |z₁ + z₂|. Line the points up and the short cut is as long as the detour. The dashed ring shows where the tip can go if z₂ turns."
* **Mode chip labels:** "Two points", "A circle", "Triangle inequality".

#### 2.5.2 distance: readout (ARCHITECTURE 9, exact)

* two: `d = <fmtNum(d)>; z1 - z2 = <fmtCart(slide)>` → `d = 5.385; z1 - z2 = 5 + 2i`
* circle: `circle: center <fmtCart(a)>, radius <fmtNum(R)>` → `circle: center 1 + 2i, radius 3`
* triangle: `|z1| + |z2| = <a>; |z1 + z2| = <b>; slack = <a - b>; lower bound ||z1| - |z2|| = <c>` →
  `|z1| + |z2| = 5.398; |z1 + z2| = 5; slack = 0.398; lower bound ||z1| - |z2|| = 0.926` (slack clamped at 0 so rounding never prints `-0`).

#### 2.5.3 distance: problem callout, why-callout

* Two points: badge "Problem 1.2.2", the statement of `problemById('1.2.2')`; `<summary>`: "Show the answer"; inside: `p.answer.tex` in `.tex-scroll` in **inline** mode with every `\text{...}` phrase cut into words by `wrapAnswerTex` (`\text{a b}` becomes `\text{a}\ \allowbreak \text{b}`), so KaTeX can break the line and the answer wraps inside the callout at any width (display mode never breaks a line: the 1.5.2 answer ran off the callout on the desktop and scrolled on the phone); if KaTeX is missing the TeX line is hidden; `p.answer.text` is always shown as the plain fallback line.
* Circle: the same with 1.2.1.
* Triangle: badge "Topic T1.2", text: "The triangle inequality: |z₁ + z₂| ≤ |z₁| + |z₂|, and ||z₁| − |z₂|| ≤ |z₁ + z₂|. No handout problem asks for it directly; it is the reason a distance behaves like a length."
* Why, two points: badge "easy in Cartesian", text `problemById('1.2.2').addressWhy`, then: "In polar the same distance needs both angles and a cosine. It works, and it is a good check, but it is the long way round."
* Why, circle: badge "easy in Polar", text `problemById('1.2.1').addressWhy`, then: "In Cartesian you square both sides and recognise the equation of a circle. That is fine for checking one point, and it hides the picture."
* Why, triangle: badge "easy in both, for different reasons", text: "The length of one arrow is polar: read r. The sum is a slide, so add in Cartesian. The reason the inequality is true is polar: the cross term is r₁r₂ cos(θ₁ − θ₂), and a cosine is never more than 1."

#### 2.5.4 distance: arg callout and aligned verdict

Built from `argSet(z, { kMin: -1, kMax: 1 })` and `fmtAngle(theta, { unicode: true })`; the home value (k = 0) is wrapped in `<strong>`:

* two: line 1 `arg z₁ = { …, a₋₁, **a₀**, a₊₁, … }` and `arg z₂ = { … }` on one line each; line 2: "Arg z₁ and Arg z₂ (bold) are the home names. The polar route uses cos(θ₁ − θ₂), and a cosine ignores whole turns, so any names give the same distance."
* circle: line 1 `arg(z − a) = { …, −3π/2, **π/2**, 5π/2, … }`; line 2: "Arg(z − a) (bold) is the home name. Every name φ + 2πk reaches the same point of the circle; the point is drawn once."
* triangle: `#distance-args` holds the two lists only. The verdict is `#distance-aligned`, in the gauge block (never in both places), one of:
  * exact (|wrapArg(Arg z₁ − Arg z₂)| < 1e-9): "Same direction: arg z₁ and arg z₂ are the same set of angles, so cos(θ₁ − θ₂) = 1 and the slack is 0."
  * near (< 0.0175 rad, 1 degree): "Nearly the same direction (within 1 degree): the two sets of angles almost coincide, so the slack is almost 0."
  * different: "Different directions: arg z₁ and arg z₂ share no angle, so cos(θ₁ − θ₂) is less than 1 and there is slack."
  * zero (a point is 0): "One of the points is 0, which has no direction. The slack is 0 for a trivial reason."
* A zero point replaces its list with "arg 0: 0 has no direction, every angle reaches it."

#### 2.5.5 distance: gauge

Title "The short cut and the detour". Legend items, in order: "|z₁ + z₂| = 5 (the short cut)", "lower bound ||z₁| − |z₂|| = 0.926", "slack = 0.398", "|z₁| + |z₂| = 5.398 (the detour)". `aria-label`: "Lengths on one line: the sum is 5 long, the detour 5.398, so the slack is 0.398; the sum can never be shorter than 0.926."

#### 2.5.6 sets: lede, presets, hints, checkbox labels

* **Lede:** "A set is understood one point at a time. Put a tiny disk around a point. All of the disk in S: interior point. None of it: exterior point. Every disk, however small, has both: boundary point. Open, closed, bounded, connected and domain are all sentences about those disks."
* **Hint:** "Drag the probe p, or tap anywhere to put it there. Change the disk radius ε. Drag p onto a circle: it snaps to the edge, and then no disk is small enough, however small you make it."
* **Preset chips:** "Annulus (1.5.2)", "Closed annulus", "Punctured disk", "Half plane", "Two disks".
* **Set line (KaTeX) and `data-text` (ASCII):** annulus `S = \{\, z \in \mathbb{C} : 1 < |z + i| \le 3 \,\}` / `1 < |z + i| <= 3`; closed `1 \le |z + i| \le 3`; punctured `0 < |z + i| < 3`; half plane `\operatorname{Im} z > 0` / `Im z > 0`; two disks `|z + 2| < 1 \ \text{or}\ |z - 2| < 1`.
* **Checkbox labels:** see the table in 2.2.2. A disabled inner box also gets the visible hint "No inner edge in this set" and `aria-disabled`.
* **Slider label:** "Disk radius ε".
* **Key (`#sets-key`)**, four items with swatches drawn from tokens: "Solid edge: the edge is in S." "Dashed edge: the edge is not in S." "Green disk: all of it is in S." "Grey disk: none of it is in S." "Amber ring, two tones: the edge of S runs through the disk."

#### 2.5.7 sets: the probe sentence (`#sets-probe-detail`)

Let `P = fmtCart(p)`, `E = fmtEps(epsMax)` (`fmtEps(x)` is `fmtNum(x, 3)` except below 0.001, where it is `x.toExponential(1)`; `0` stays `0`, and so does anything under `TOL = 1e-9`: a probe snapped onto an edge is about 4.4e-16 from it, and classification calls that point ON the edge, so every printed radius says 0 there),
`e = fmtNum(eps, 3)`:

* interior, disk fits: "p = P is in S. The largest disk around it that stays inside S has radius E. Your disk (ε = e) fits."
* interior, disk too big: "p = P is in S. The largest disk around it that stays inside S has radius E. Your disk (ε = e) is too big: it sticks out of S. Make it no bigger than E and it fits."
* exterior, disk misses: "p = P is not in S. The largest disk around it that misses S has radius E. Your disk (ε = e) misses S."
* exterior, too big: "p = P is not in S. The largest disk around it that misses S has radius E. Your disk (ε = e) is too big: it reaches S. Make it no bigger than E and it misses."
* boundary: "p = P is on EDGE. Every disk around p, however small, contains points of S and points not in S. That is what a boundary point is. p itself IN."
  where `EDGE` is `edgeText(edge)` (2.5.9) and `IN` is "is in S" or "is not in S".
* Disk label on the canvas: "all in S", "none in S", "in and out".

#### 2.5.8 sets: reasons (exact templates; `LIST` is the edge texts of the relevant edges joined with " and ", 2.5.9; `M` is `fmtNum(boundingRadius, 3)`)

* open yes: "No boundary point is in S, so every point of S has a small disk around it that stays inside S."
* open no: "LIST belongs to S, but every disk around a point there sticks out of S. So S is not open."
* closed yes: "S contains every one of its boundary points."
* closed no: "LIST is a boundary of S that is not in S. So S is not closed."  (plural: "are boundaries of S that are not in S")
* bounded yes: "S fits inside the disk |z| <= M."
* bounded no: "S runs off to infinity: no disk contains it."
* connected yes: "S is one piece: you can walk between any two of its points without leaving S."
* connected no: "S is N separate pieces. A path from one to the other must leave S."
* domain: "A domain is open and connected. S is OPEN and CONNECTED, so it IS a domain." with OPEN = "open" or "not open", CONNECTED = "connected" or "not connected", IS = "is" or "is not".
* region yes: "A region is a domain plus some, none or all of its boundary points. S is the domain INTERIOR plus WHICH of its boundary." with INTERIOR = `describeSet(interiorOf(set)).ascii`, the inequality of the interior of S (every edge made strict, a centre that is in S kept: `1 < |z + i| < 3` for the annulus), WHICH = "none", "some" or "all"
* region no: "A region is one connected piece. S is N pieces, so it is not a region."

#### 2.5.9 sets: edge text (used by the boundary line and the reasons)

* circle: "the circle |z + i| = 3" (centre text from `absZMinus(c)`, 5.8) with the radius `fmtNum(r)`.
* point (the puncture): "the point z = -i" (`fmtCart(c)`).
* line: "the line Im z = 0" for the upper half-plane (`Im z = <fmtNum(d)>`).
* `#sets-boundary`: "Boundary points: " + `EDGE (in S)` / `EDGE (not in S)` joined with "; " + "." For no edges: "S has no boundary points."

#### 2.5.10 shared links text

* distance footer extras: `#sets` "Next: Disks, Annuli, Boundaries. Which points are inside, outside, or on a circle?" and `#arithmetic` "Back: adding is a slide".
* sets footer extras: `#distance-circle` "The circle again: |z − a| = R" and `#limits` "The same tiny disks come back as epsilon and delta".

---

## 3. Visual encoding (both themes)

Every colour is a token from `css/theme.css`, read at draw time with `cssColor('--token')` (canvas) or used as `var(--token)` (DOM). Nothing
here is theme-specific in code: the tokens change, the code does not. Contrast of each token on `--surface` (WCAG 2.x, from the shell design 3.1):
`--polar` 6.06 light and 8.30 dark; `--cart` 6.17 and 7.12; `--input` 6.26 and 8.71; `--ok` 6.12 and 8.86; `--warn` 6.04 and 8.75;
`--seam` 4.76 and 5.95. Every line and ring below is at least 3:1 (graphics) and every text label at least 4.5:1, in both themes. Text labels on the
canvas are drawn by `drawLabel`, which adds a 3 px `--surface` halo.

### 3.1 The two-address code in `distance`

| Mark | Token | Style | Meaning |
|---|---|---|---|
| draggable dots z₁ z₂ a z | `--input` | the plane's 14 px dot with halo | what the student moves (z-plane input) |
| slide z₂ → z₁ (hypotenuse) | `--polar` | solid 3.5 px, arrowhead at z₁ | the length d is a polar quantity |
| legs Δx and Δy | `--cart` | dashed `DASH.cart` (5, 4), 2 px | the slide in coordinates; dashed so colour is not the only cue |
| right-angle marker at the corner | `--cart` | solid 1.5 px, size min(8 px, 30 percent of the shorter leg) | the legs meet at 90 degrees, so Pythagoras |
| the slide moved to start at 0 | `--polar` | `DASH.guide` (3, 4), 1.75 px, arrowhead; a 3.5 px dot at the tip | same length, now a ray from 0, so `\|z\|` and `\|z₁ − z₂\|` are the same idea |
| text Δx, Δy | `--cart` | `drawLabel` | |
| text d, `z₁ − z₂ = ...` | `--polar` | `drawLabel` | |
| polar route (checkbox) | `--polar` | `drawPolarAddress` for each point: solid ray, solid Arg arc, `r = ...` and `Arg z₁ = ...` labels; arc radii 26 px and 40 px; no ghost windings | the polar address; **Arg** is the arc, drawn solid |
| the seam (checkbox on, two and triangle modes; from `a` in circle mode) | `--seam` | `drawSeam` or `drawRay(... from: a)` dashed `DASH.seam` (8, 5), 2 px, label "seam" | any plane that shows a principal value draws the seam |
| circle `\|z − a\| = R` | `--polar` | solid 3 px, no fill (the set is the circle, not the disk) | a polar-native shape |
| radius a → z | `--polar` | solid 2 px, label `R = 3` | |
| reference direction from `a` (circle, polar checkbox on) | `--cart` | dashed `DASH.cart`, 1.5 px, length 1.2 R to the right | the real direction the angle is measured from |
| triangle sides 0 → z₁ and z₁ → z₁ + z₂ | `--polar` | solid 2.5 px, arrowheads | the two detour lengths |
| triangle short cut 0 → z₁ + z₂ | `--polar` | solid 4.5 px, arrowhead | thicker = the shortcut; the weight, not a colour, says which side is which |
| parallelogram completion edges 0 → z₂ and z₂ → z₁ + z₂ | `--cart` | dashed `DASH.cart`, 1.5 px | adding is a slide: z₂ slid along z₁ |
| the ring `\|w − z₁\| = \|z₂\|` | `--polar` | dashed `DASH.guide`, 1.5 px | where z₁ + z₂ can be if z₂ turns |
| "longest" and "shortest" markers | `--polar` | 4 px ring (`drawCircle` with `fill: '--surface'`, `fillAlpha: 1`), 2 px; text label | the extreme lengths of the sum |
| the sum point z₁ + z₂ | `--polar` | `drawDot`, radius 4.5, label "z₁ + z₂" | |

### 3.2 `sets`

| Mark | Token | Style | Meaning |
|---|---|---|---|
| shading of S | `--polar` | fill alpha 0.16 | the set; a polar-native region |
| an edge that is in S | `--polar` | **solid** 2.5 px | included boundary |
| an edge that is not in S | `--polar` | **dashed** `DASH.excluded` (6, 5), 2.5 px | excluded boundary |
| the puncture (a point edge) | `--polar` | not in S: hollow ring, radius 5 px, `--surface` fill; in S: filled dot | the same solid / open convention for a point |
| probe `p` | `--input` | the plane's dot, label `p` | what the student moves |
| ε-disk, all in S | `--ok` | fill alpha 0.28, 2 px ring, text "all in S" | interior evidence |
| ε-disk, none in S | `--seam` | fill alpha 0.22, 2 px ring, text "none in S" | exterior evidence |
| ε-disk, both | `--warn` | 3 px ring; inside the ring the part in S is filled `--ok` alpha 0.32 and the part not in S `--seam` alpha 0.30 (canvas clip); text "in and out" | the third look: boundary evidence; two tones, an amber ring and a word, so it is not a colour-only cue |
| ray from the centre `c` to `p` (ring sets) | `--polar` | solid 1.5 px, label `ρ = 2.236`; a 5 px plus at `c` with label `c = -i` | the polar address about the centre |
| drop line from `p` to the edge (half plane) | `--cart` | dashed `DASH.cart`, label `y = 2` | the Cartesian address; the half plane is a condition on y |
| chip highlight (open, closed, domain) | `--warn` | the matching edges redrawn 8 px wide at alpha 0.30 | "the edges that decide this answer" |
| bounding disk (chip bounded) | `--seam` | dashed `DASH.guide`, 2 px, label `\|z\| ≤ 4` | S fits inside this disk |
| piece labels (chips connected, domain, region) | `--text` | `drawLabel` "piece 1", "piece 2" | the connected components |

The two ring edges, the fill and the disk overlap on purpose: the fill is below the edges, the edges below the disk, the disk below the
probe (a DOM button). Order numbers are in 5.3.

### 3.3 arg versus Arg, in these two stations

* `Arg` is **drawn** only when the polar checkbox is on: the solid arc from the positive real direction (from 0, or from `a`) to the ray, labelled
  `Arg z₁ = 0.322`, `Arg(z − a) = π/2`. The point is drawn once. The seam is drawn whenever an Arg arc is on the plane.
* `arg` is **listed** with the home value highlighted, in `#distance-args`: `{ …, -5.961, **0.322**, 6.605, … }` (bold, `--polar`, via the
  `dist-home` class). The CONSTRAINTS rule allows "a list" as the set form. No ghost windings are drawn on the plane because two points
  each with two ghost circles around the origin would hide the triangle; the list carries the set.
* In the explainer every angle is written `\Arg ...` ("Arg z₁ = ...", "Arg(z₁ − z₂) = ..."); the name `θ₁ − θ₂` in the law of cosines is
  introduced as "any names of the angles" in the arg callout, never as a number.
* In `sets` the only angle is `φ = Arg(p − c)` in the explainer's polar column, written with `\Arg`, with the words "φ is free": the ring
  condition ignores the angle, so every name, indeed every angle, gives the same answer.

### 3.4 Input versus output, and time

* Input versus output: both stations have one plane, the z-plane. All draggables are `--input` (green). Nothing is `--output`; the Lab, the mapping
  stations and `limits` introduce purple.
* Time colouring: not used. Nothing in either station moves on a clock, and `curves` (registry order 7) is where the ramp is introduced. The
  circle in circle mode is a plain `--polar` line (no ramp, no dots, no arrowhead), so it is not mistaken for a parametrised curve.

### 3.5 Tokens and the CSS this goal injects

`distance.js` and `sets.js` each inject one `<style data-for="distance">` / `<style data-for="sets">` (idempotent: `document.head.querySelector`
first), as the widgets do. Tokens only; classes prefixed `dist-` and `sets-`; the shell's classes are used and not restyled. The text of the two blocks:

```css
/* shared shape, repeated in both files with the prefix changed */
.dist-layout{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));align-items:start}
.dist-layout>*{min-width:0}
.dist-side{display:flex;flex-direction:column;gap:var(--space-3)}
.dist-explainer h2,.sets-explainer h2{margin-bottom:var(--space-2)}

/* distance only */
.dist-gauge-block{padding:var(--space-2) var(--space-3);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}
.dist-gauge-track{position:relative;height:1.5rem;margin:var(--space-2) 0;border:1.5px solid var(--border-strong);border-radius:var(--radius-sm);
  background:repeating-linear-gradient(135deg,var(--border-strong) 0 1px,transparent 1px 6px),var(--surface-2);overflow:visible}
.dist-gauge-fill{position:absolute;top:0;bottom:0;left:0;width:0;border-radius:calc(var(--radius-sm) - 2px) 0 0 calc(var(--radius-sm) - 2px);background:var(--polar)}
.dist-gauge-low{position:absolute;top:-5px;bottom:-5px;left:0;width:3px;margin-left:-1.5px;background:var(--text)}
.dist-gauge-legend{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-3);margin:0;padding:0;list-style:none;font-size:.9rem}
.dist-sw{display:inline-block;width:.9rem;height:.9rem;margin-right:.35rem;vertical-align:-.1em;border:1.5px solid var(--border-strong)}
.dist-sw[data-k="sum"]{background:var(--polar);border-color:var(--polar)}
.dist-sw[data-k="low"]{width:3px;border:0;background:var(--text)}
.dist-sw[data-k="slack"]{background:repeating-linear-gradient(135deg,var(--border-strong) 0 1px,transparent 1px 4px)}
.dist-set{margin:0 0 var(--space-1);font-family:var(--font-mono);font-size:.92rem;overflow-wrap:anywhere}
.dist-home{color:var(--polar);font-weight:700}

/* sets only */
.sets-answer-list{display:grid;gap:var(--space-2);margin:0;padding:0;list-style:none}
.sets-answer-list li{display:grid;grid-template-columns:minmax(9rem,11rem) minmax(0,1fr);gap:var(--space-1) var(--space-3);align-items:start}
@media (max-width:36rem){.sets-answer-list li{grid-template-columns:minmax(0,1fr)}}
.sets-reason{color:var(--text);font-size:.97rem}
.sets-key{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr));gap:var(--space-1) var(--space-3);margin:0;padding:0;list-style:none;font-size:.9rem}
.sets-sw{display:inline-block;width:1.6rem;height:.9rem;margin-right:.4rem;vertical-align:-.1em;box-sizing:border-box}
.sets-sw[data-k="solid"]{height:0;border-top:3px solid var(--polar)}
.sets-sw[data-k="dashed"]{height:0;border-top:3px dashed var(--polar)}
.sets-sw[data-k="in"]{border:2px solid var(--ok);border-radius:50%;width:.9rem}
.sets-sw[data-k="out"]{border:2px solid var(--seam);border-radius:50%;width:.9rem}
.sets-sw[data-k="both"]{border:3px solid var(--warn);border-radius:50%;width:.9rem;background:linear-gradient(90deg,var(--ok) 50%,var(--seam) 50%)}
```

There are no transitions and no animations, so nothing needs a `prefers-reduced-motion` branch.

---

## 4. Module API

Both files are plain ES modules. **Top level has no DOM access** (no `document`, `window`, `localStorage`), so `import { ... } from '../../js/stations/sets.js'` works in
Node for the unit tests. The pure helpers are exported (this goal may not create other js files). Imports are relative only.

### 4.1 `js/stations/distance.js`

```js
import { createPlane, drawSegment, drawArc, drawCircle, drawDot, drawLabel, drawRay, drawSeam, drawPolarAddress, DASH, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, cart, polar } from '../core/katex.js';
import { C, add, sub, scale, abs, Arg, expi, wrapArg, argSet, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
import { problemById, problemsForStation, statementParts, routeFor } from '../data/problems.js';

// ---- constants (all exported, all frozen)
export const VIEW      = { xRange: [-4, 8], yRange: [-3, 9] };       // 12 x 12 units, square plane
export const DEFAULTS  = {                                            // fresh copies are made on mount; never mutate these
  two:      { z1: C(4, 3), z2: C(-1, 1) },                            // problem 1.2.2
  circle:   { a: C(1, 2), R: C(1, 5) },                               // problem 1.2.1: R is the DOT z, radius abs(z - a) = 3, straight above a
  triangle: { z1: C(3, 1), z2: C(1, 2) },                             // |z1 + z2| = 5, slack 0.398, an angle of pi/4 between them
};
export const SNAP      = { step: 1, px: 6 };                          // whole-number magnet for pointer drags
export const MIN_RADIUS = 0.25;
export const NEAR_ANGLE = 0.0175;                                     // rad, "within 1 degree"
export const MODES      = ['two', 'circle', 'triangle'];

// ---- pure helpers (Node-testable)
export function slideStats(z1, z2)
//  -> { dx, dy, slide: {re: dx, im: dy}, d, D,                        D = dx^2 + dy^2, d = Math.sqrt(D)
//       theta: number | null,                                          Arg(slide), null when d < 1e-12
//       r1, r2, t1, t2,                                                |z1|, |z2|, Arg z1, Arg z2 (Arg 0 = 0)
//       dtheta,                                                        t1 - t2 (NOT wrapped: any name works)
//       cosd,                                                          Math.cos(dtheta)
//       cross,                                                         x1 x2 + y1 y2
//       crossPolar,                                                    r1 r2 cosd
//       dPolar }                                                       sqrt(max(0, r1^2 + r2^2 - 2 crossPolar))
export function circleStats(a, z)
//  -> { off: sub(z, a), R: abs(off), phi: number | null,              phi = Arg(z - a), null when R < 1e-12
//       D: R^2 }
export function triangleStats(z1, z2)
//  -> { r1, r2, sum, b, up, lo, slack,                                 sum = z1 + z2, b = |sum|, up = r1 + r2, lo = |r1 - r2|, slack = max(0, up - b)
//       t1, t2, dtheta, cosd, cross, crossPolar,
//       lo2, up2, b2,                                                  (r1 - r2)^2, (r1 + r2)^2, b^2
//       bPolar,                                                        sqrt(max(0, r1^2 + r2^2 + 2 crossPolar))
//       agree }                                                        agreement(...), below
export function agreement(t1, t2, r1, r2)
//  -> 'zero' (r1 or r2 < 1e-12) | 'exact' (|wrapArg(t1 - t2)| < 1e-9) | 'near' (< NEAR_ANGLE) | 'no'
export function magnet(z, scale, { step = SNAP.step, px = SNAP.px } = {})
//  -> z itself (same object) or a new {re, im} on the lattice; never returns -0
export function keepBothInView(a, off, view, size)
//  view = plane.getView(), size = plane.getSize(); -> {re, im}: the closest a such that a and a + off are both inside the view with a 14 px margin;
//  an axis on which no such a exists is left unclamped
export function modeFromPreset(preset)
//  { kind: 'problem', id: '1.2.1' } -> 'circle'; '1.2.2' -> 'two'; { kind: 'token', token: 'two' | 'circle' | 'triangle' } -> that;
//  everything else (null, a topic, an unknown token) -> 'two'
export function readoutText(state)                  // the ARCHITECTURE 9 strings of 2.5.2 for state.mode
export function argLists(state)
//  -> [{ label: 'arg z₁', zero: boolean, items: [{ text: '0.322', home: boolean }] }]   (items k = -1, 0, 1; text = fmtAngle(theta, { unicode: true }))
//     two: z1 and z2; circle: z - a; triangle: z1 and z2
export function rowsFor(mode)                       // explainer rows (5.7); each cell function returns null when state.mode !== mode
export function explainerSame(state)                // { cart, polar, agree } for the footer row (5.7)

// ---- the station
export function mount(el, ctx) -> unmount           // synchronous; returns a function
```

**`state`** (module-private, but its shape is what `rowsFor`, `readoutText`, `argLists` and `explainerSame` read, so tests build it by hand):

```js
{ mode: 'two' | 'circle' | 'triangle',
  two:      { z1: {re, im}, z2: {re, im} },
  circle:   { a: {re, im}, R: {re, im} },        // R is the dot's position, not the radius
  triangle: { z1: {re, im}, z2: {re, im} },
  snap: boolean,                                  // #distance-snap
  polar: { two: boolean, circle: boolean, triangle: boolean } }   // #distance-polar per mode
```

**Hook:** `window.__mv.distance = { state: () => deep copy of state, stats: () => the stats object of the current mode, mode: () => state.mode }`
(created with `const mv = (window.__mv = window.__mv || {})`; deleted in unmount). Nothing reads it in production.

**Events consumed.** Plane: handle `onDrag(z, { final, source })` (4 handles), nothing else. DOM: `click` on 3 mode chips; `change` on 2 checkboxes. Theme and store: **not** subscribed.
Nothing is emitted. `ctx.navigate` is not used (all links are plain `href="#route"`).

### 4.2 `js/stations/sets.js`

```js
import { createPlane, drawSegment, drawCircle, drawLabel, drawPolygonFill, DASH, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, cart, polar } from '../core/katex.js';
import { C, add, sub, scale, abs, Arg, fromPolar, fmtNum, fmtCart, exactAngle, texAngle } from '../core/complex.js';
import { problemById, problemsForStation, statementParts, routeFor } from '../data/problems.js';

export const TOL   = 1e-9;                                            // a point this close to an edge is ON it
export const VIEW  = { xRange: [-5, 5], yRange: [-5, 5] };
export const PRESET_IDS = ['annulus', 'closed', 'punctured', 'halfplane', 'twodisks'];
export const CHIP_IDS   = ['open', 'closed', 'bounded', 'connected', 'domain', 'region'];
export const SNAP_PX = 6;

// ---- the set model
// Set  = { preset, flags: { innerStrict, outerStrict }, innerApplies, outerApplies, cells: Cell[] }
// Cell = { kind: 'ring', c: {re, im}, lo: number >= 0, hi: number | Infinity, loStrict: boolean, hiStrict: boolean }       lo (<|<=) |z - c| (<|<=) hi
//      | { kind: 'half', point: {re, im}, normal: {re, im} /* unit */, strict: boolean }                                    (z - point) . normal (>|>=) 0
// Edge = { kind: 'circle', c, r, included, role: 'inner' | 'outer', cell: number }
//      | { kind: 'point',  c,    included: false, role: 'inner', cell }                                                      the puncture
//      | { kind: 'line',   point, dir /* unit */, normal, included, role: 'outer', cell }
export function buildSet(presetId, flags = {})          // unknown id -> annulus; missing flags -> that preset's defaults (5.8)
export function edgesOf(set)                            // Edge[] in cell order, inner before outer
export function contains(set, z)                        // boolean; a point within TOL of an edge counts as that edge's `included`
export function nearestEdge(set, z)                     // { edge, dist } | null (no edges)
export function projectToEdge(edge, z)                  // the closest point of the edge: {re, im}
export function classifyPoint(set, z)
//  -> { kind: 'interior' | 'exterior' | 'boundary', inS: boolean, edge: Edge | null, dist: number, epsMax: number }
//     epsMax: largest eps for which the open disk D_eps(z) stays on one side; 0 for a boundary point; Infinity when the set has no edges
export function diskStatus(set, z, eps)                 // 'in' | 'out' | 'both'
export function snapToEdge(set, z, tol)                 // {re, im} on the nearest edge when dist <= tol, else null
export function analyse(set)
//  -> { open, closed, bounded, connected, domain, region: boolean, pieces: number, edges: Edge[], included: Edge[], excluded: Edge[], boundingRadius: number | null }
export function describeSet(set)                        // { ascii, tex }
export function edgeText(edge)                          // 2.5.9
export function boundaryText(set)                       // the #sets-boundary sentence
export function reasons(set, an)                        // { open, closed, bounded, connected, domain, region }: the 2.5.8 sentences
export function fmtEps(x)                               // 2.5.7
export function absZMinus(c)                            // '|z|', '|z + i|', '|z - 2|', '|z - (1 + 2i)|'
export function presetFromContext(preset)               // { id } from ctx.preset: problem '1.5.2' -> annulus; token in PRESET_IDS -> it; else annulus
export function rowsFor(set)                            // explainer rows (5.10); every cell function returns null when the set is of the other shape
export function explainerSame(state)                    // { cart, polar, agree } for the footer row

export function mount(el, ctx) -> unmount
```

**`state`** read by `rowsFor` and `explainerSame`: `{ set, p: {re, im}, eps: number, cls: classifyPoint(set, p) }`. The station keeps more (checkbox state, chip highlight) in a
private object.

**Hook:** `window.__mv.sets = { state: () => ({ preset, flags, p, eps, kind, cls, analysis }), classify: (re, im) => classifyPoint(state.set, { re, im }), highlight: () => the chip id or null }`;
removed in unmount.

**Events consumed.** Plane: `onDrag` of handle `p`; `plane.on('pointerdown')` and `plane.on('pointerup')` for the tap (the two unsubscribe functions are kept). DOM: `click` on 5 preset chips and 6
answer chips; `change` on 2 strict checkboxes and the snap checkbox; `input` on the slider. Theme and store: not subscribed.

### 4.3 The two blocks both stations build locally

`buildHeader(ctx, lede)` returns `<header class="station-header">`:

1. `h1` text `ctx.station.title`.
2. `p.station-lede` text `lede`.
3. `ul.thread-badges`, one `li > span.thread-badge[data-thread="T1"]` per id in `ctx.station.threads`, text = the title of that entry in `ctx.threads`.
4. `div.chips[role="group"][aria-label="Problems in this station"]`, one `a.chip.problem-chip[href="#problem-1-2-1"]` per problem of `problemsForStation(ctx.station.id)`
   (text = the id, `title` = the problem's `aha`; the href is `'#' + routeFor(id)`, with `routeFor` imported from problems.js).

`buildLinks(ctx, extras)` returns `<nav class="station-links" aria-label="Where next">`:

1. Sort `ctx.stations` by `order`. `prev` and `next` are the neighbours of `ctx.station`. Links `a.station-link[data-dir="prev"|"next"][href="#<id>"]` with text = title.
2. For each thread id `t` of the station: the previous and next station in order whose `threads` include `t`; add `a.station-link[data-thread=t][href]` unless that station is already linked.
3. Then `extras`: `[{ href: '#sets', text }]` rendered as `a.station-link`.

All text comes through `textContent`; the only `innerHTML` in either file is through `prose()` / `tex()` / `texToHtml`.

### 4.4 Lifecycle

`mount(el, ctx)` (synchronous):

1. Read the preset (`modeFromPreset(ctx.preset)` or `presetFromContext(ctx.preset)`), build the state from fresh copies of the defaults.
2. Inject the style block, build the DOM into `el` (header, problem callout, chips, layout, explainer host, why callout, links, live region), all through a local `h(tag, attrs, children)`.
3. `createPlane`, `addPoint`, `addLayer`, `createExplainer`.
4. Wire controls. Call `setMode(st.mode, { announce: false })` once (distance) or `recompute({ set: true })` (sets) so every readout is filled; the polite live region is **not** written by this first call (a screen reader would read the readout out on page load).
5. Create the `window.__mv` hook.
6. Return `unmount`.

`unmount()`:

1. `cleanups.splice(0).forEach(fn => fn())`. The array holds: every `removeEventListener` for the chips, checkboxes and slider; the two `plane.on` unsubscribe functions (sets).
2. `explainer.destroy()` and `plane.destroy()` (which removes the handles, listeners, observers and the `window.__mv.planes` entry).
3. `delete window.__mv.distance` / `window.__mv.sets` if it is still this station's.
4. Do not touch `window.scrollTo`, focus, history, the store or the theme. The `<style data-for>` block stays (idempotent).

There are no window or document listeners, no timers, no `requestAnimationFrame` loops of this station's own (the plane and explainer own theirs), so nothing else can leak.

---

## 5. Algorithms

All code below was prototyped in a scratch file against the real `complex.js`, `katex.js` and the vendored KaTeX (every TeX string renders with no error for
the default, zero, negative and boundary inputs listed in section 6), and the epsilon-disk claim of 5.8 was checked by sampling (230 400 sample points, 0 failures). The pure functions can be
copied as written. `T` is `String.raw`, so TeX backslashes are written once.

### 5.1 Shared helpers (each file defines its own copy; they are 15 lines)

```js
const T  = String.raw;
const n  = (x) => fmtNum(x, 3);                                         // decimal, ASCII minus, trailing zeros trimmed
const sg = (x) => (n(x)[0] === '-' ? `(${n(x)})` : n(x));              // negative numbers go in brackets inside powers and differences
const sq = (x) => `${sg(x)}^2`;
const ang = (t) => { const e = exactAngle(t); return e && e.p !== 0 ? T`${texAngle(t)} \approx ${n(t)}` : n(t); };   // "\frac{3\pi}{4} \approx 2.356" or "0.644"
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const shift = (v, c) => (Math.abs(c) < 5e-10 ? v : c > 0 ? `(${v} - ${n(c)})` : `(${v} + ${n(-c)})`);   // shift('y', -1) is "(y + 1)"
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };   // never write an unchanged node while a drag streams
function h(tag, attrs = {}, kids = []) {                                // tiny DOM builder; text goes through textContent, never innerHTML
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v; else if (k === 'text') node.textContent = v; else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(kids)) if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}
```

### 5.2 `distance`: creation, state, drag handling

1. `st = { mode: modeFromPreset(ctx.preset), two: copy(DEFAULTS.two), circle: copy(DEFAULTS.circle), triangle: copy(DEFAULTS.triangle), snap: true, polar: { two: false, circle: true, triangle: true } }`. `copy` clones the `{re, im}` objects.
2. Build the DOM (4.4 step 2). The plane host is `h('div', { id: 'distance-plane-host' })`, the first child of `.dist-layout`.
3. `plane = createPlane(host, { id: 'distance-plane', xRange: VIEW.xRange, yRange: VIEW.yRange, grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], maxWidth: 560, wheel: 'focus', ariaLabel: 'Complex plane for distances and circles' })`.
4. Four handles, all created at mount, the inactive ones hidden by `setMode`:
   ```js
   const hz1 = plane.addPoint({ id: 'z1', z: st.two.z1,     color: '--input', label: 'z₁', name: 'z1', step: 0.1, onDrag: onZ('z1') });
   const hz2 = plane.addPoint({ id: 'z2', z: st.two.z2,     color: '--input', label: 'z₂', name: 'z2', step: 0.1, onDrag: onZ('z2') });
   const ha  = plane.addPoint({ id: 'a',  z: st.circle.a,   color: '--input', label: 'a',  name: 'centre a', step: 0.1, onDrag: onA });
   const hR  = plane.addPoint({ id: 'R',  z: st.circle.R,   color: '--input', label: 'z',  name: 'z on the circle', step: 0.1, onDrag: onR });
   ```
   The plane gives each button the id `distance-plane-z1` etc. and an aria-label with both addresses ("z1: z = 4 + 3i; r = 5, θ = 0.644 (Arg)").
5. The drag callbacks. **`info.source` is `'pointer'` for a mouse or touch drag, `'keyboard'` for an arrow key, `'api'` for `Handle.set` without `silent`**; only `'pointer'` snaps.
   ```js
   const scaleNow = () => plane.getView().scale;
   function onZ(which) {
     return (z, info) => {
       const m = st.mode; if (m === 'circle') return;                       // the handle is hidden then; a stray call is ignored
       const hd = which === 'z1' ? hz1 : hz2;
       if (info.source === 'pointer' && st.snap) z = magnet(z, scaleNow());
       if (z.re !== hd.z.re || z.im !== hd.z.im) hd.set(z, { silent: true });   // put the dot on the snapped point
       st[m][which] = { re: z.re, im: z.im };
       refresh(info.final);
     };
   }
   function onA(z, info) {                                                  // moving the centre moves the whole circle
     if (st.mode !== 'circle') return;
     if (info.source === 'pointer' && st.snap) z = magnet(z, scaleNow());
     const off = sub(st.circle.R, st.circle.a);                              // the radius vector, kept
     z = keepBothInView(z, off, plane.getView(), plane.getSize());
     ha.set(z, { silent: true });
     st.circle.a = { re: z.re, im: z.im };
     st.circle.R = add(z, off);
     hR.set(st.circle.R, { silent: true });
     refresh(info.final);
   }
   function onR(z, info) {                                                  // the dot z sets the radius
     if (st.mode !== 'circle') return;
     if (info.source === 'pointer' && st.snap) z = magnet(z, scaleNow());
     const a = st.circle.a, v = sub(z, a), len = abs(v);
     if (len < MIN_RADIUS) {                                                // never a zero radius: push out along the last direction
       const last = sub(st.circle.R, a), ll = abs(last), dir = len > 1e-9 ? scale(v, 1 / len) : (ll > 1e-9 ? scale(last, 1 / ll) : C(1, 0));
       z = add(a, scale(dir, MIN_RADIUS));
     }
     hR.set(z, { silent: true });
     st.circle.R = { re: z.re, im: z.im };
     refresh(info.final);
   }
   ```
   `Handle.set` inside an `onDrag` callback does not recurse (`silent`), and the plane re-reads the handle's position on the next pointer move from the pointer, not from the handle, so snapping never accumulates.
6. `magnet` and `keepBothInView` (pure, tested):
   ```js
   export function magnet(z, scale, { step = SNAP.step, px = SNAP.px } = {}) {
     if (!(scale > 0)) return z;
     const q = { re: Math.round(z.re / step) * step + 0, im: Math.round(z.im / step) * step + 0 };     // + 0 turns -0 into 0
     return Math.hypot(z.re - q.re, z.im - q.im) * scale <= px ? q : z;
   }
   export function keepBothInView(a, off, view, size) {
     const half = view.unitsAcross / 2, halfH = half * size.h / size.w, m = 14 / view.scale;             // 14 px margin, in units
     const xmin = view.center.re - half + m, xmax = view.center.re + half - m;
     const ymin = view.center.im - halfH + m, ymax = view.center.im + halfH - m;
     const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
     const reLo = xmin - Math.min(0, off.re), reHi = xmax - Math.max(0, off.re);                           // a and a + off both inside
     const imLo = ymin - Math.min(0, off.im), imHi = ymax - Math.max(0, off.im);
     return { re: reLo <= reHi ? clamp(a.re, reLo, reHi) : a.re, im: imLo <= imHi ? clamp(a.im, imLo, imHi) : a.im };
   }
   ```
   `magnet` at 30 px per unit (the phone, 358 px over 12 units): the snap disc has radius 0.2 units, so about 13 percent of the plane is "sticky"; at 38 px per unit (the desktop, 460 px) the radius is 0.16 units and about 8 percent is sticky; the rest is free.

### 5.3 `distance`: drawing layers

Three layers are added at mount; each starts with `const m = st.mode` and returns at once when the mode does not draw it. `sc = plane.getView().scale` (px per unit); `O = C(0, 0)`.

**Layer `guides` (order 10).**
* triangle: with `z1, z2 = st.triangle`, `s = add(z1, z2)`, `r2 = abs(z2)`:
  1. `drawSegment(ctx, plane, O, z2, { color: '--cart', dash: DASH.cart, width: 1.5 })` and `drawSegment(ctx, plane, z2, s, { color: '--cart', dash: DASH.cart, width: 1.5 })`: the parallelogram.
  2. if `r2 > 1e-9`: `drawCircle(ctx, plane, z1, r2, { color: '--polar', dash: DASH.guide, width: 1.5 })`.
* circle with the polar checkbox on: with `a`, `k = circleStats(a, st.circle.R)`:
  1. `drawSegment(ctx, plane, a, add(a, C(1.2 * k.R, 0)), { color: '--cart', dash: DASH.cart, width: 1.5 })` (the real direction the angle starts from).
  2. `drawRay(ctx, plane, Math.PI, { color: '--seam', dash: DASH.seam, width: 2, from: a })` (the seam of Arg(z − a)) and `drawLabel(ctx, plane, add(a, C(-1.15 * k.R, 0)), 'seam', { color: '--seam', dy: -8, align: 'center' })`.

**Layer `main` (order 20).**

*Two points.* `k = slideStats(z1, z2)`.
1. If `k.d >= 1e-9`:
   1. `corner = C(z1.re, z2.im)` (across first, then up). `drawSegment(z2 → corner, { color: '--cart', dash: DASH.cart, width: 2 })` if `|k.dx| > 1e-9`; `drawSegment(corner → z1, same)` if `|k.dy| > 1e-9`.
   2. If both legs exist: `rightAngle(ctx, plane, corner, z2, z1)`:
      ```js
      function rightAngle(ctx, plane, corner, a, b) {                         // a small square at the corner, between the two legs
        const Cp = plane.toPixel(corner), A = plane.toPixel(a), B = plane.toPixel(b);
        const la = Math.hypot(A.x - Cp.x, A.y - Cp.y), lb = Math.hypot(B.x - Cp.x, B.y - Cp.y);
        if (la < 14 || lb < 14) return;
        const s = Math.min(8, 0.3 * la, 0.3 * lb), ua = { x: (A.x - Cp.x) / la, y: (A.y - Cp.y) / la }, ub = { x: (B.x - Cp.x) / lb, y: (B.y - Cp.y) / lb };
        ctx.save(); ctx.strokeStyle = cssColor('--cart'); ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(Cp.x + s * ua.x, Cp.y + s * ua.y); ctx.lineTo(Cp.x + s * (ua.x + ub.x), Cp.y + s * (ua.y + ub.y)); ctx.lineTo(Cp.x + s * ub.x, Cp.y + s * ub.y); ctx.stroke(); ctx.restore();
      }
      ```
   3. `drawSegment(z2 → z1, { color: '--polar', width: 3.5, arrow: true })`.
   4. `drawSegment(O → k.slide, { color: '--polar', dash: DASH.guide, width: 1.75, arrow: true })`; `drawDot(ctx, plane, k.slide, { color: '--polar', radius: 3.5 })`.
2. Labels (`drawLabel` registers its box, so the polar-address labels placed at the end of the frame dodge these):
   * `'Δx = ' + n(k.dx)` at the midpoint of leg 1 (`C((z1.re + z2.re) / 2, z2.im)`), `{ color: '--cart', align: 'center', dx: 0, dy: k.dy >= 0 ? 16 : -8 }` (below the horizontal leg when z₁ is above z₂, else above); skipped if that leg is absent.
   * `'Δy = ' + n(k.dy)` at the midpoint of leg 2 (`C(z1.re, (z1.im + z2.im) / 2)`), `{ color: '--cart', dy: 4, dx: k.dx >= 0 ? 10 : -10, align: k.dx >= 0 ? 'left' : 'right' }` (on the outside of the right angle); skipped if absent.
   * `'d = ' + n(k.d)` at the midpoint `mid` of the hypotenuse: let `v` be the unit screen vector from `plane.toPixel(corner)` to `plane.toPixel(mid)` (if the corner coincides with the midpoint, `v = { x: 0, y: -1 }`); `{ color: '--polar', align: 'center', dx: 18 * v.x, dy: 18 * v.y }` (on the side away from the corner, so the label never sits between the legs).
   * `'z₁ − z₂ = ' + fmtCart(k.slide)` at `k.slide`, `{ color: '--polar', dx: 8, dy: -8, align: 'left' }`.
3. If `k.d < 1e-9`: only `drawLabel(ctx, plane, z1, 'd = 0', { color: '--polar', dx: 10, dy: 18 })`.

*Circle.* `a = st.circle.a`, `Rp = st.circle.R`, `k = circleStats(a, Rp)`.
1. `drawCircle(ctx, plane, a, k.R, { color: '--polar', width: 3 })` (no fill).
2. `drawSegment(ctx, plane, a, Rp, { color: '--polar', width: 2 })`.
3. Label `'R = ' + n(k.R)` at the midpoint of the radius; with `u` the unit screen vector from `a` to `Rp` and the perpendicular `(−u.y, u.x)`: `{ color: '--polar', align: 'center', dx: 14 * (−u.y), dy: 14 * u.x }`.

*Triangle.* `z1, z2 = st.triangle`, `t = triangleStats(z1, z2)`, `s = t.sum`.
1. Sides: `drawSegment(O → z1, { color: '--polar', width: 2.5, arrow: true })`; `drawSegment(z1 → s, { color: '--polar', width: 2.5, arrow: true })`; `drawSegment(O → s, { color: '--polar', width: 4.5, arrow: true })`.
2. The extremes: `u = t.r1 > 1e-9 ? scale(z1, 1 / t.r1) : C(1, 0)`, `far = scale(u, t.up)`, `near = scale(u, t.r1 - t.r2)` (negative when z₂ is the longer one, which puts the marker on the far side of 0, as it should). For each: `drawCircle(ctx, plane, pt, 4 / sc, { color: '--polar', width: 2, fill: '--surface', fillAlpha: 1 })`. Labels `'longest'` at `far` `{ color: '--polar', dx: 0, dy: -10, align: 'center' }` and `'shortest'` at `near` `{ color: '--polar', dx: 0, dy: 18, align: 'center' }`.
3. `drawDot(ctx, plane, s, { color: '--polar', radius: 4.5, label: 'z₁ + z₂', labelOffset: { dx: 8, dy: -8 } })`.
4. Side labels, with `sideLabel(a, b, away, text, flip)`: `midZ = scale(add(a, b), 0.5)` (plane coordinates); in screen pixels `nrm` is the unit perpendicular of `plane.toPixel(a) → plane.toPixel(b)`, flipped so that `dot(nrm, toPixel(midZ) − toPixel(away)) >= 0` (the label goes on the side away from the triangle's third vertex); `if (flip) nrm = −nrm`; then `drawLabel(ctx, plane, midZ, text, { color: '--polar', align: 'center', dx: 14 * nrm.x, dy: 14 * nrm.y })`. **Collinear tie-break:** when `|dot(nrm, toPixel(midZ) − toPixel(away))| < 2` (the aligned case, all three sides on one line) the two detour labels use `flip = false` and the short-cut label `flip = true`, so the three labels fall on both sides of the line and do not overlap. Applied to: `|z₂| = n(r2)` on `z1 → s` away from `O`; `|z₁| = n(r1)` on `O → z1` away from `s`; `|z₁ + z₂| = n(b)` on `O → s` away from `z1`. When the polar checkbox is on, the `|z₁|` and `|z₂|` labels are skipped (the `r = ...` labels of the polar address say the same), `|z₁ + z₂|` is always drawn.

**Layer `polar` (order 30), only when `st.polar[m]`.**
* two and triangle: `drawPolarAddress(ctx, plane, z1, { name: 'z₁', arcRadiusPx: 26 })`, `drawPolarAddress(ctx, plane, z2, { name: 'z₂', arcRadiusPx: 40 })` (no ghosts), then `drawSeam(ctx, plane, Math.PI, { label: 'seam' })`.
* circle: with `k.phi !== null`: `arcPx = Math.min(26, 0.6 * k.R * sc)`; `drawArc(ctx, plane, a, arcPx / sc, 0, k.phi, { color: '--polar', width: 2.5, arrow: true })`; then
  `drawLabel(ctx, plane, add(a, scale(expi(k.phi / 2), (arcPx + 18) / sc)), 'Arg(z − a) = ' + fmtAngle(k.phi, { unicode: true }), { color: '--polar', dx: 0, dy: 0, align: Math.cos(k.phi / 2) >= 0 ? 'left' : 'right' })`
  (`expi` is imported from complex.js).

### 5.4 `distance`: refresh, readout, arg lists, gauge

```js
function refresh(final) {
  const m = st.mode;
  setText(readout, readoutText(st)); readout.dataset.mode = m;
  explainer.update(st);                                   // the live object: rows read it when the coalesced render runs
  renderArgs();
  if (m === 'triangle') updateGauge();
  plane.requestDraw();
  if (final) status.textContent = readoutText(st);        // the polite live region: after a drag ends, a key nudge or a mode change only
}
```

```js
export function readoutText(s) {                                           // exactly 2.5.2
  if (s.mode === 'two')    { const k = slideStats(s.two.z1, s.two.z2);  return `d = ${n(k.d)}; z1 - z2 = ${fmtCart(k.slide)}`; }
  if (s.mode === 'circle') { const k = circleStats(s.circle.a, s.circle.R); return `circle: center ${fmtCart(s.circle.a)}, radius ${n(k.R)}`; }
  const t = triangleStats(s.triangle.z1, s.triangle.z2);
  return `|z1| + |z2| = ${n(t.up)}; |z1 + z2| = ${n(t.b)}; slack = ${n(t.slack)}; lower bound ||z1| - |z2|| = ${n(t.lo)}`;
}
export function argLists(s) {                                              // the set arg z as a list, the home value marked
  const subjects = s.mode === 'circle' ? [['arg(z − a)', sub(s.circle.R, s.circle.a)]]
    : s.mode === 'two' ? [['arg z₁', s.two.z1], ['arg z₂', s.two.z2]] : [['arg z₁', s.triangle.z1], ['arg z₂', s.triangle.z2]];
  return subjects.map(([label, z]) => (Math.hypot(z.re, z.im) < 1e-12
    ? { label, zero: true, items: [] }                                     // a point at 0 has no direction
    : { label, zero: false, items: argSet(z, { kMin: -1, kMax: 1 }).map((e) => ({ text: fmtAngle(e.theta, { unicode: true }), home: e.k === 0 })) }));
}
```

`renderArgs()` builds `#distance-args` only when its key (`JSON.stringify(lists) + verdictKey`) changed:
1. for each list one `p.dist-set`: the label, ` = { …, `, the items joined by `, ` with the home item in `<strong class="dist-home">`, `, … }`; a zero list prints `${label}: 0 has no direction, every angle reaches it.`
2. then, for two and circle, one `p` with the sentence of 2.5.4. The triangle shows no sentence here: its verdict lives in `#distance-aligned`.
3. `args.replaceChildren(...)`.

`updateGauge()` (triangle only; `t = triangleStats(...)`):
1. `fillPct = t.up > 1e-9 ? 100 * Math.min(1, t.b / t.up) : 0` and `lowPct = t.up > 1e-9 ? 100 * Math.min(1, t.lo / t.up) : 0`; `fillEl.style.width = fillPct + '%'`; `lowEl.style.left = lowPct + '%'`.
2. `gauge.dataset.slack/lower/upper/sum` = `n(...)` of each; `gauge.setAttribute('aria-label', 'Lengths on one line: the sum is ' + n(t.b) + ' long, the detour ' + n(t.up) + ', so the slack is ' + n(t.slack) + '; the sum can never be shorter than ' + n(t.lo) + '.')`.
3. The four legend `li` texts per 2.5.5 (`setText`).
4. `setText(aligned, VERDICT[t.agree])` with the four sentences of 2.5.4; `aligned.dataset.agree = t.agree`.

`renderProblem()` and `renderWhy()` (both rebuild their box from scratch on a mode change; nothing else touches them):

```js
const TOPIC_TEXT = 'The triangle inequality: |z₁ + z₂| ≤ |z₁| + |z₂|, and ||z₁| − |z₂|| ≤ |z₁ + z₂|. No handout problem asks for it directly; it is the reason a distance behaves like a length.';
const TRIANGLE_WHY = 'The length of one arrow is polar: read r. The sum is a slide, so add in Cartesian. The reason the inequality is true is polar: the cross term is r₁r₂ cos(θ₁ − θ₂), and a cosine is never more than 1.';
const WHY_EXTRA = {
  two:    'In polar the same distance needs both angles and a cosine. It works, and it is a good check, but it is the long way round.',
  circle: 'In Cartesian you square both sides and recognise the equation of a circle. That is fine for checking one point, and it hides the picture.',
};
const problemIdOf = (m) => (m === 'two' ? '1.2.2' : m === 'circle' ? '1.2.1' : null);

function renderProblem() {
  problemBox.replaceChildren();
  const id = problemIdOf(st.mode);
  try {
    if (!id) { problemBox.append(h('span', { class: 'badge', 'data-tone': 'accent', text: 'Topic T1.2' }), ' ', TOPIC_TEXT); return; }
    const p = problemById(id);
    if (!p) return;                                                          // data missing: no callout, no error
    const stmt = h('span');
    for (const part of statementParts(p.statement)) {
      if (part.math) { const m = h('span'); tex(m, part.text); stmt.append(m); } else stmt.append(part.text);
    }
    const eq = h('div', { class: 'tex-scroll dist-answer-tex' }); tex(eq, wrapAnswerTex(p.answer.tex));      // inline mode: KaTeX may break the line, display mode never does
    if (eq.classList.contains('tex-error')) eq.hidden = true;                // no KaTeX: the plain line below carries the answer
    problemBox.append(
      h('span', { class: 'badge', 'data-tone': p.address === 'C' ? 'cart' : 'polar', text: `Problem ${id}` }), ' ', stmt,
      h('details', { id: 'distance-answer' }, [h('summary', { text: 'Show the answer' }), eq, h('p', { class: 'muted mono', text: p.answer.text })]));
  } catch (e) { problemBox.replaceChildren(); }
}

function renderWhy() {
  const m = st.mode, tone = m === 'two' ? 'cart' : m === 'circle' ? 'polar' : 'accent';
  const badge = m === 'two' ? 'easy in Cartesian' : m === 'circle' ? 'easy in Polar' : 'easy in both, for different reasons';
  whyBox.replaceChildren(); whyBox.dataset.tone = tone;
  const body = h('span');
  const p = problemIdOf(m) && problemById(problemIdOf(m));
  if (m === 'triangle') body.textContent = TRIANGLE_WHY; else if (p) prose(body, p.addressWhy);
  whyBox.append(h('span', { class: 'badge', 'data-tone': tone, text: badge }), ' ', body, ' ', WHY_EXTRA[m] || '');
}
```

### 5.5 `distance`: switching mode

`setMode(m, { announce = true } = {})` (also called once at mount, with `announce: false`):
1. `st.mode = m`; for each chip `chip.setAttribute('aria-pressed', String(chip.dataset.mode === m))`.
2. Handles: `hz1.hidden = hz2.hidden = (m === 'circle')`; `ha.hidden = hR.hidden = (m !== 'circle')`. Positions: for `two` or `triangle` `hz1.set(st[m].z1, { silent: true })` and `hz2.set(st[m].z2, { silent: true })`; for `circle` `ha.set(st.circle.a, ...)` and `hR.set(st.circle.R, ...)`.
3. Polar checkbox: `polarBox.checked = st.polar[m]`; `polarLabel.textContent = POLAR_LABEL[m]` with `POLAR_LABEL = { two: 'Show the polar route: rays from 0 and the angles', circle: 'Show the angle at the centre', triangle: 'Show the angles Arg z₁ and Arg z₂' }`.
4. Text blocks: `setText(hint, HINT[m])` (`HINT` is the three sentences of 2.5.1), `renderProblem()`, `renderWhy()`; gauge block `hidden = (m !== 'triangle')`.
5. Explainer: `explainer.update(st)` **first**, then `explainer.setRows(rowsFor(m))`. (`update` stores the new state; `setRows` then rebuilds and renders at once with it. The other order would hand the new rows the old mode's state.)
6. `refresh(announce)`: the live region is written for a mode change, never for the silent first call at mount.

The checkbox handlers: `snapBox` `change` sets `st.snap`; `polarBox` `change` sets `st.polar[st.mode]` and calls `plane.requestDraw()`.

### 5.6 `distance`: the pure functions (exact)

```js
export function slideStats(z1, z2) {
  const dx = z1.re - z2.re, dy = z1.im - z2.im, D = dx * dx + dy * dy, d = Math.sqrt(D);
  const r1 = Math.hypot(z1.re, z1.im), r2 = Math.hypot(z2.re, z2.im), t1 = Arg(z1), t2 = Arg(z2);
  const dtheta = t1 - t2, cosd = Math.cos(dtheta), cross = z1.re * z2.re + z1.im * z2.im, crossPolar = r1 * r2 * cosd;
  return { dx, dy, slide: C(dx, dy), d, D, theta: d < 1e-12 ? null : Arg(C(dx, dy)), r1, r2, t1, t2, dtheta, cosd, cross, crossPolar,
           dPolar: Math.sqrt(Math.max(0, r1 * r1 + r2 * r2 - 2 * crossPolar)) };
}
export function circleStats(a, z) {
  const off = sub(z, a), R = abs(off);
  return { off, R, phi: R < 1e-12 ? null : Arg(off), D: R * R };
}
export function agreement(t1, t2, r1, r2) {
  if (r1 < 1e-12 || r2 < 1e-12) return 'zero';
  const w = Math.abs(wrapArg(t1 - t2));
  return w < 1e-9 ? 'exact' : w < NEAR_ANGLE ? 'near' : 'no';
}
export function triangleStats(z1, z2) {
  const r1 = Math.hypot(z1.re, z1.im), r2 = Math.hypot(z2.re, z2.im), sum = add(z1, z2), b = Math.hypot(sum.re, sum.im);
  const up = r1 + r2, lo = Math.abs(r1 - r2), t1 = Arg(z1), t2 = Arg(z2), dtheta = t1 - t2, cosd = Math.cos(dtheta);
  const cross = z1.re * z2.re + z1.im * z2.im, crossPolar = r1 * r2 * cosd;
  return { r1, r2, sum, b, up, lo, slack: Math.max(0, up - b), t1, t2, dtheta, cosd, cross, crossPolar,
           lo2: lo * lo, up2: up * up, b2: b * b, bPolar: Math.sqrt(Math.max(0, r1 * r1 + r2 * r2 + 2 * crossPolar)), agree: agreement(t1, t2, r1, r2) };
}
export function modeFromPreset(p) {
  if (!p) return 'two';
  if (p.kind === 'problem') return p.id === '1.2.1' ? 'circle' : 'two';
  if (p.kind === 'token' && MODES.includes(p.token)) return p.token;
  return 'two';
}
```
`Arg(C(0, 0))` is 0 by the convention of complex.js; every consumer first tests the modulus (`agreement`, the zero branches of the rows and of `argLists`) and never prints that 0 as a fact.

### 5.7 `distance`: explainer rows, footer, and the zero guards

`createExplainer(host, { id: 'distance-ex', rows: rowsFor(st.mode), same: explainerSame })` with the default two columns. Every cell function is wrapped by `on(mode, fn)`, which returns `null` (an empty cell, shown as a dash) when the state is another mode's, so a stale render during a mode switch cannot throw. A cell that is prose, not TeX, is the object `{ text }`:

```js
const on = (mode, fn) => (s) => (s.mode === mode ? fn(s) : null);          // a stale call from another mode gets an empty cell, never a throw
const ZERO_TEXT = { text: 'r = 0. A point at the origin has no direction, so Arg is not defined here.' };

const rowsTwo = [
  { id: 'slide', label: 'slide z₁ − z₂', native: 'cart',
    cart: on('two', (s) => {
      const { z1, z2 } = s.two, k = slideStats(z1, z2);
      return cart(T`(x_1 - x_2) + i\,(y_1 - y_2) = (${n(z1.re)} - ${sg(z2.re)}) + i\,(${n(z1.im)} - ${sg(z2.im)}) = ${fmtCart(k.slide)}`);
    }),
    polar: on('two', (s) => {
      const k = slideStats(s.two.z1, s.two.z2);
      return k.theta === null ? { text: 'The slide is 0, so it has no direction.' } : polar(T`r = ${n(k.d)},\ \Arg(z_1 - z_2) = ${ang(k.theta)}`);
    }) },
  { id: 'z1', label: 'z₁ in both addresses',
    cart: on('two', (s) => cart(T`z_1 = ${fmtCart(s.two.z1)}`)),
    polar: on('two', (s) => { const k = slideStats(s.two.z1, s.two.z2); return k.r1 < 1e-12 ? ZERO_TEXT : polar(T`r_1 = ${n(k.r1)},\ \Arg z_1 = ${ang(k.t1)}`); }) },
  { id: 'z2', label: 'z₂ in both addresses',
    cart: on('two', (s) => cart(T`z_2 = ${fmtCart(s.two.z2)}`)),
    polar: on('two', (s) => { const k = slideStats(s.two.z1, s.two.z2); return k.r2 < 1e-12 ? ZERO_TEXT : polar(T`r_2 = ${n(k.r2)},\ \Arg z_2 = ${ang(k.t2)}`); }) },
  { id: 'dist', label: 'distance d', native: 'cart',
    cart: on('two', (s) => {
      const k = slideStats(s.two.z1, s.two.z2);
      return cart(T`d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2} = \sqrt{${sq(k.dx)} + ${sq(k.dy)}} = \sqrt{${n(k.D)}} = ${n(k.d)}`);
    }),
    polar: on('two', (s) => {
      const k = slideStats(s.two.z1, s.two.z2);
      if (k.r1 < 1e-12 || k.r2 < 1e-12) return { text: `A point is at 0, so there is no angle between the rays. The distance is just the length of the other point: ${n(k.d)}.` };
      return polar(T`d = \sqrt{r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_1 - \theta_2)} = \sqrt{${n(k.r1 * k.r1)} + ${n(k.r2 * k.r2)} - 2(${n(k.r1)})(${n(k.r2)})\cos(${n(k.dtheta)})} = ${n(k.dPolar)}`);
    }) },
];

const rowsCircle = [
  { id: 'set', label: 'all z with |z − a| = R', native: 'polar',
    cart: on('circle', (s) => {
      const a = s.circle.a, k = circleStats(a, s.circle.R);
      return cart(T`(x - x_0)^2 + (y - y_0)^2 = R^2:\ ${shift('x', a.re)}^2 + ${shift('y', a.im)}^2 = ${n(k.R)}^2 = ${n(k.D)}`);
    }),
    polar: on('circle', (s) => {
      const a = s.circle.a, k = circleStats(a, s.circle.R);
      return polar(T`z = a + R\,e^{i\varphi} = (${fmtCart(a)}) + ${n(k.R)}\,e^{i\varphi},\ 0 \le \varphi < 2\pi`);
    }) },
  { id: 'pt', label: 'the dot z',
    cart: on('circle', (s) => cart(T`z = ${fmtCart(s.circle.R)}`)),
    polar: on('circle', (s) => {
      const k = circleStats(s.circle.a, s.circle.R);
      return k.phi === null ? { text: 'z is the centre, so z − a has no direction.' }
        : polar(T`z - a = ${fmtCart(k.off)} = ${n(k.R)}\,e^{i\varphi},\ \varphi = \Arg(z - a) = ${ang(k.phi)}`);
    }) },
  { id: 'check', label: 'distance from a', native: 'polar',
    cart: on('circle', (s) => {
      const k = circleStats(s.circle.a, s.circle.R);
      return cart(T`|z - a| = \sqrt{${sq(k.off.re)} + ${sq(k.off.im)}} = \sqrt{${n(k.D)}} = ${n(k.R)}`);
    }),
    polar: on('circle', (s) => polar(T`|z - a| = |${n(circleStats(s.circle.a, s.circle.R).R)}\,e^{i\varphi}| = ${n(circleStats(s.circle.a, s.circle.R).R)}`)) },
];

const rowsTriangle = [
  { id: 'lens', label: 'lengths |z₁|, |z₂|', native: 'polar',
    cart: on('triangle', (s) => {
      const { z1, z2 } = s.triangle, t = triangleStats(z1, z2);
      return cart(T`|z_1| = \sqrt{${sq(z1.re)} + ${sq(z1.im)}} = ${n(t.r1)},\quad |z_2| = \sqrt{${sq(z2.re)} + ${sq(z2.im)}} = ${n(t.r2)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return t.agree === 'zero' ? ZERO_TEXT : polar(T`r_1 = ${n(t.r1)},\ \Arg z_1 = ${ang(t.t1)};\quad r_2 = ${n(t.r2)},\ \Arg z_2 = ${ang(t.t2)}`);
    }) },
  { id: 'cross', label: 'cross term c', native: 'cart',
    cart: on('triangle', (s) => {
      const { z1, z2 } = s.triangle, t = triangleStats(z1, z2);
      return cart(T`c = x_1x_2 + y_1y_2 = ${sg(z1.re)}\cdot${sg(z2.re)} + ${sg(z1.im)}\cdot${sg(z2.im)} = ${n(t.cross)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return t.agree === 'zero' ? { text: 'A point is at 0, so there is no angle between them. The cross term is 0.' }
        : polar(T`c = r_1r_2\cos(\theta_1 - \theta_2) = ${n(t.r1)}(${n(t.r2)})\cos(${n(t.dtheta)}) = ${n(t.crossPolar)}`);
    }) },
  { id: 'len', label: 'length of the sum', native: 'cart',
    cart: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return cart(T`|z_1 + z_2| = \sqrt{(x_1 + x_2)^2 + (y_1 + y_2)^2} = \sqrt{${sq(t.sum.re)} + ${sq(t.sum.im)}} = ${n(t.b)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return polar(T`|z_1 + z_2| = \sqrt{r_1^2 + r_2^2 + 2c} = \sqrt{${n(t.r1 * t.r1)} + ${n(t.r2 * t.r2)} + 2(${n(t.crossPolar)})} = ${n(t.bPolar)}`);
    }) },
  { id: 'ineq', label: 'the inequality', native: 'polar',
    cart: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return cart(T`\big||z_1| - |z_2|\big| \le |z_1 + z_2| \le |z_1| + |z_2|:\ ${n(t.lo)} \le ${n(t.b)} \le ${n(t.up)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return t.agree === 'zero' ? { text: 'A point is at 0, so the sum is the other point and the slack is 0.' }
        : polar(T`-1 \le \cos(\theta_1 - \theta_2) = ${n(t.cosd)} \le 1\ \Rightarrow\ ${n(t.lo2)} \le |z_1 + z_2|^2 = ${n(t.b2)} \le ${n(t.up2)}`);
    }) },
];
export function rowsFor(mode) { return mode === 'circle' ? rowsCircle : mode === 'triangle' ? rowsTriangle : rowsTwo; }
```
Footer:
```js
export function explainerSame(s) {
  if (s.mode === 'two') {
    const q = slideStats(s.two.z1, s.two.z2);
    return { cart: cart(T`d = ${n(q.d)}`), polar: polar(T`d = ${n(q.dPolar)}`), agree: close(q.d, q.dPolar) };
  }
  if (s.mode === 'circle') {
    const q = circleStats(s.circle.a, s.circle.R), rc = Math.sqrt(q.off.re ** 2 + q.off.im ** 2);       // rc: the Cartesian route, sqrt of the squares
    return { cart: cart(T`R = ${n(rc)}`), polar: polar(T`R = ${n(q.R)}`), agree: close(rc, q.R) };
  }
  const t = triangleStats(s.triangle.z1, s.triangle.z2);
  return { cart: cart(T`|z_1 + z_2| = ${n(t.b)}`), polar: polar(T`|z_1 + z_2| = ${n(t.bPolar)}`), agree: close(t.b, t.bPolar) };
}
```
Verified output at the defaults (these strings, with the colour wrapper removed, are what `data-tex` holds):

| Cell | TeX (default state) |
|---|---|
| `distance-ex-slide-cart` | `(x_1 - x_2) + i\,(y_1 - y_2) = (4 - (-1)) + i\,(3 - 1) = 5 + 2i` |
| `distance-ex-slide-polar` | `r = 5.385,\ \Arg(z_1 - z_2) = 0.381` |
| `distance-ex-z2-polar` | `r_2 = 1.414,\ \Arg z_2 = \frac{3\pi}{4} \approx 2.356` |
| `distance-ex-dist-cart` | `d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2} = \sqrt{5^2 + 2^2} = \sqrt{29} = 5.385` |
| `distance-ex-dist-polar` | `d = \sqrt{r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_1 - \theta_2)} = \sqrt{25 + 2 - 2(5)(1.414)\cos(-1.713)} = 5.385` |
| circle `set-cart` | `(x - x_0)^2 + (y - y_0)^2 = R^2:\ (x - 1)^2 + (y - 2)^2 = 3^2 = 9` |
| circle `pt-polar` | `z - a = 3i = 3\,e^{i\varphi},\ \varphi = \Arg(z - a) = \frac{\pi}{2} \approx 1.571` |
| triangle `cross-cart` | `c = x_1x_2 + y_1y_2 = 3\cdot1 + 1\cdot2 = 5` |
| triangle `cross-polar` | `c = r_1r_2\cos(\theta_1 - \theta_2) = 3.162(2.236)\cos(-0.785) = 5` |
| triangle `len-polar` | `\|z_1 + z_2\| = \sqrt{r_1^2 + r_2^2 + 2c} = \sqrt{10 + 5 + 2(5)} = 5` |
| triangle `ineq-cart` | `\big\|\|z_1\| - \|z_2\|\big\| \le \|z_1 + z_2\| \le \|z_1\| + \|z_2\|:\ 0.926 \le 5 \le 5.398` |
| triangle `ineq-polar` | `-1 \le \cos(\theta_1 - \theta_2) = 0.707 \le 1\ \Rightarrow\ 0.858 \le \|z_1 + z_2\|^2 = 25 \le 29.142` |

(In every table of this document a `\|` inside a code span stands for the pipe character; the strings, and every test expectation, contain a plain `|`.)

### 5.8 `sets`: the set model (exact code; this is the part A5 inspects)

```js
const ring = (c, lo, hi, loStrict, hiStrict) => ({ kind: 'ring', c, lo, hi, loStrict, hiStrict });
const half = (point, normal, strict) => ({ kind: 'half', point, normal, strict });
const DEFS = {
  annulus:   { cells: (f) => [ring(C(0, -1), 1, 3, f.innerStrict, f.outerStrict)], flags: { innerStrict: true,  outerStrict: false }, innerApplies: true  },
  closed:    { cells: (f) => [ring(C(0, -1), 1, 3, f.innerStrict, f.outerStrict)], flags: { innerStrict: false, outerStrict: false }, innerApplies: true  },
  punctured: { cells: (f) => [ring(C(0, -1), 0, 3, f.innerStrict, f.outerStrict)], flags: { innerStrict: true,  outerStrict: true  }, innerApplies: true  },
  halfplane: { cells: (f) => [half(C(0, 0), C(0, 1), f.outerStrict)],              flags: { innerStrict: false, outerStrict: true  }, innerApplies: false },
  twodisks:  { cells: (f) => [ring(C(-2, 0), 0, 1, false, f.outerStrict), ring(C(2, 0), 0, 1, false, f.outerStrict)],
                                                                                   flags: { innerStrict: false, outerStrict: true  }, innerApplies: false },
};
export function buildSet(id, flags = {}) {
  const def = DEFS[id] || DEFS.annulus, preset = DEFS[id] ? id : 'annulus';
  const f = { innerStrict: def.innerApplies ? (flags.innerStrict ?? def.flags.innerStrict) : def.flags.innerStrict,
              outerStrict: flags.outerStrict ?? def.flags.outerStrict };
  return { preset, flags: f, innerApplies: def.innerApplies, outerApplies: true, cells: def.cells(f) };
}
```
Well-formedness (asserted in the unit tests, not at runtime): every ring has `0 <= lo < hi`; ring cells are pairwise separated (`|c1 - c2| > hi1 + hi2`: for two disks, 4 > 2); a half-plane preset has one cell. This is what lets `connected` and `region` be derived by counting.

```js
export function edgesOf(set) {
  const out = [];
  set.cells.forEach((cell, i) => {
    if (cell.kind === 'ring') {
      if (cell.lo > 0)      out.push({ kind: 'circle', c: cell.c, r: cell.lo, included: !cell.loStrict, role: 'inner', cell: i });
      else if (cell.loStrict) out.push({ kind: 'point', c: cell.c, included: false, role: 'inner', cell: i });      // 0 < |z - c|: the puncture
      if (Number.isFinite(cell.hi)) out.push({ kind: 'circle', c: cell.c, r: cell.hi, included: !cell.hiStrict, role: 'outer', cell: i });
    } else {
      out.push({ kind: 'line', point: cell.point, dir: C(-cell.normal.im, cell.normal.re), normal: cell.normal, included: !cell.strict, role: 'outer', cell: i });
    }
  });
  return out;
}
export function contains(set, z) {                               // a point within TOL of an edge counts as that edge: its `included` decides
  return set.cells.some((cell) => {
    if (cell.kind === 'ring') {
      const d = Math.hypot(z.re - cell.c.re, z.im - cell.c.im);
      return (cell.loStrict ? d > cell.lo + TOL : d >= cell.lo - TOL) && (cell.hiStrict ? d < cell.hi - TOL : d <= cell.hi + TOL);
    }
    const s = (z.re - cell.point.re) * cell.normal.re + (z.im - cell.point.im) * cell.normal.im;
    return cell.strict ? s > TOL : s >= -TOL;
  });
}
const edgeDist = (e, z) =>
  e.kind === 'circle' ? Math.abs(Math.hypot(z.re - e.c.re, z.im - e.c.im) - e.r)
  : e.kind === 'point' ? Math.hypot(z.re - e.c.re, z.im - e.c.im)
  : Math.abs((z.re - e.point.re) * e.normal.re + (z.im - e.point.im) * e.normal.im);
export function nearestEdge(set, z) {
  let best = null;
  for (const e of edgesOf(set)) { const d = edgeDist(e, z); if (!best || d < best.dist) best = { edge: e, dist: d }; }
  return best;
}
export function projectToEdge(e, z) {
  if (e.kind === 'point') return { re: e.c.re, im: e.c.im };
  if (e.kind === 'circle') {
    const vx = z.re - e.c.re, vy = z.im - e.c.im, L = Math.hypot(vx, vy);
    return L < 1e-12 ? { re: e.c.re + e.r, im: e.c.im } : { re: e.c.re + vx * e.r / L, im: e.c.im + vy * e.r / L };
  }
  const t = (z.re - e.point.re) * e.dir.re + (z.im - e.point.im) * e.dir.im;
  return { re: e.point.re + e.dir.re * t, im: e.point.im + e.dir.im * t };
}
export function classifyPoint(set, z) {
  const ne = nearestEdge(set, z), inS = contains(set, z);
  if (!ne) return { kind: inS ? 'interior' : 'exterior', inS, edge: null, dist: Infinity, epsMax: Infinity };
  if (ne.dist <= TOL) return { kind: 'boundary', inS: ne.edge.included, edge: ne.edge, dist: ne.dist, epsMax: 0 };
  return { kind: inS ? 'interior' : 'exterior', inS, edge: ne.edge, dist: ne.dist, epsMax: ne.dist };
}
export function diskStatus(set, z, eps) {
  const c = classifyPoint(set, z);
  if (c.kind === 'boundary') return 'both';
  return eps <= c.epsMax + 1e-12 ? (c.inS ? 'in' : 'out') : 'both';
}
export function snapToEdge(set, z, tol) { const ne = nearestEdge(set, z); return ne && ne.dist <= tol ? projectToEdge(ne.edge, z) : null; }
export function analyse(set) {
  const edges = edgesOf(set), included = edges.filter((e) => e.included), excluded = edges.filter((e) => !e.included);
  const pieces = set.cells.length, bounded = set.cells.every((c) => c.kind === 'ring' && Number.isFinite(c.hi));
  const open = included.length === 0, closed = excluded.length === 0, connected = pieces === 1;
  return { open, closed, bounded, connected, domain: open && connected, region: connected, pieces, edges, included, excluded,
           boundingRadius: bounded ? Math.max(...set.cells.map((c) => Math.hypot(c.c.re, c.c.im) + c.hi)) : null };
}
```

Why each derived value is right (so the code is a derivation, not a table):

* **open** is "no boundary point belongs to S". The boundary of S is exactly the union of its edges (each edge has S on one side and not-S on the other, by construction), so S is open iff no edge is `included`.
* **closed** is "S contains all its boundary points": iff every edge is `included`.
* **bounded**: every ring cell has a finite outer radius (a half plane does not). The bounding radius `|c| + hi` is the triangle inequality: `|z| <= |z - c| + |c| <= hi + |c|`.
* **connected**: each cell is connected (an annulus, a punctured disk, a disk, a half plane) and the cells are pairwise separated, so S has exactly `cells.length` pieces.
* **domain** is `open && connected` (the sheet's definition). **region** (a domain plus some, none or all of its boundary points): the interior of S is the open cells, a domain exactly when there is one cell, and S lies between the interior and its closure by construction, so `region` is `connected`.
* **epsMax**: for a point off every edge, the open disk `D_eps(p)` stays on `p`'s side of the nearest edge iff `eps <= dist`, and no edge is nearer than the nearest, so the disk stays entirely in S (interior) or entirely out of S (exterior) iff `eps <= dist`. For `eps > dist` the disk crosses the nearest edge; every edge here has S on one side and not-S on the other (for a puncture the disk contains the missing centre), so the disk contains both. A boundary point is within `TOL` of an edge: every disk, however small, contains both.

`snapToEdge(set, z, tol)` is called with `tol = SNAP_PX / plane.getView().scale`, so the snap follows zoom. After the snap the point is on the circle to within 1e-12, far inside `TOL = 1e-9`.

Text builders (all pure):

```js
export function absZMinus(c) {
  const z0 = (x) => Math.abs(x) < 1e-12;
  if (z0(c.re) && z0(c.im)) return '|z|';
  if (z0(c.im)) return c.re > 0 ? `|z - ${fmtNum(c.re)}|` : `|z + ${fmtNum(-c.re)}|`;
  if (z0(c.re)) { const k = fmtNum(Math.abs(c.im)), t = k === '1' ? 'i' : `${k}i`; return c.im > 0 ? `|z - ${t}|` : `|z + ${t}|`; }
  return `|z - (${fmtCart(c)})|`;
}
export function describeSet(set) {
  const parts = set.cells.map((cell) => {
    if (cell.kind === 'ring') {
      const zc = absZMinus(cell.c), loOp = cell.loStrict ? '<' : '<=', hiOp = cell.hiStrict ? '<' : '<=';
      return cell.lo === 0 && !cell.loStrict ? `${zc} ${hiOp} ${fmtNum(cell.hi)}` : `${fmtNum(cell.lo)} ${loOp} ${zc} ${hiOp} ${fmtNum(cell.hi)}`;
    }
    return `Im z ${cell.strict ? '>' : '>='} ${fmtNum(cell.point.im)}`;          // the half-plane preset (normal i)
  });
  const ascii = parts.join(' or ');
  return { ascii, tex: ascii.replace(/<=/g, '\\le ').replace(/>=/g, '\\ge ').replace(/Im z/g, '\\operatorname{Im} z').replace(/ or /g, '\\ \\text{or}\\ ') };
}
export function interiorOf(set) {                                  // the interior of S as a set: edges leave S, a centre that is in S stays
  return { ...set, cells: set.cells.map((c) => (c.kind === 'ring' ? { ...c, loStrict: c.lo > 0 ? true : c.loStrict, hiStrict: true } : { ...c, strict: true })) };
}
export function edgeText(e) {
  if (e.kind === 'circle') return `the circle ${absZMinus(e.c)} = ${fmtNum(e.r)}`;
  if (e.kind === 'point')  return `the point z = ${fmtCart(e.c)}`;
  return `the line Im z = ${fmtNum(e.point.im)}`;
}
export function boundaryText(set) {
  const es = edgesOf(set);
  return es.length ? `Boundary points: ${es.map((e) => `${edgeText(e)} (${e.included ? 'in S' : 'not in S'})`).join('; ')}.` : 'S has no boundary points.';
}
export function reasons(set, an) {                                 // the 2.5.8 templates
  const list = (es) => es.map(edgeText).join(' and '), one = (es) => es.length === 1;
  return {
    open: an.open ? 'No boundary point is in S, so every point of S has a small disk around it that stays inside S.'
      : `${list(an.included)} ${one(an.included) ? 'belongs' : 'belong'} to S, but every disk around a point there sticks out of S. So S is not open.`,
    closed: an.closed ? 'S contains every one of its boundary points.'
      : `${list(an.excluded)} ${one(an.excluded) ? 'is a boundary of S that is not in S' : 'are boundaries of S that are not in S'}. So S is not closed.`,
    bounded: an.bounded ? `S fits inside the disk |z| <= ${fmtNum(an.boundingRadius)}.` : 'S runs off to infinity: no disk contains it.',
    connected: an.connected ? 'S is one piece: you can walk between any two of its points without leaving S.'
      : `S is ${an.pieces} separate pieces. A path from one to the other must leave S.`,
    domain: `A domain is open and connected. S is ${an.open ? 'open' : 'not open'} and ${an.connected ? 'connected' : 'not connected'}, so it ${an.domain ? 'is' : 'is not'} a domain.`,
    region: an.region
      ? `A region is a domain plus some, none or all of its boundary points. S is the domain ${describeSet(interiorOf(set)).ascii} plus ${an.included.length === 0 ? 'none' : an.excluded.length === 0 ? 'all' : 'some'} of its boundary.`
      : `A region is one connected piece. S is ${an.pieces} pieces, so it is not a region.`,
  };
}
export const fmtEps = (x) => (Math.abs(x) < TOL ? '0' : x < 0.001 ? x.toExponential(1) : fmtNum(x, 3));      // under TOL (rounding noise on an edge point) is a 0
export function presetFromContext(p) {
  if (p && p.kind === 'problem' && p.id === '1.5.2') return { id: 'annulus' };
  if (p && p.kind === 'token' && PRESET_IDS.includes(p.token)) return { id: p.token };
  return { id: 'annulus' };
}
```

### 5.9 `sets`: drawing layers

State used by the layers: `state.set`, `state.p`, `state.eps`, `state.cls` (re-computed on every probe or set change), `state.chip`, `an = state.an`. `sc = plane.getView().scale`. Layers, in order:

| Order | Name | Draws |
|---|---|---|
| 10 | `fill` | S shaded |
| 20 | `halo` | the highlight of the selected chip |
| 30 | `bound` | the bounding disk when the chip is `bounded` |
| 40 | `edges` | every edge, solid or dashed |
| 50 | `guides` | the radius ray and centre marker, or the drop line |
| 60 | `disk` | the epsilon-disk and its word |
| 70 | `pieces` | "piece n" labels when the chip is `connected`, `domain` or `region` |

1. **`fill`**: for each cell. Ring: `drawCircle(ctx, plane, c, hi, { color: '--polar', fill: true, fillAlpha: 0.16, innerRadius: lo > 0 ? lo : null, alpha: 0 })` (alpha 0 hides this pass's outline: the edges are drawn by `edges`). Half plane: `poly = clipRectHalf(visibleRect(), point, normal)` then `drawPolygonFill(ctx, plane, poly, { color: '--polar', alpha: 0.16 })`:
   ```js
   function visibleRect() {                                                  // the canvas rectangle in plane coordinates, grown by 20 px
     const { w, h } = plane.getSize(), m = 20;
     return [plane.fromPixel(-m, -m), plane.fromPixel(w + m, -m), plane.fromPixel(w + m, h + m), plane.fromPixel(-m, h + m)];
   }
   function clipRectHalf(rect, q0, nrm) {                                    // Sutherland-Hodgman against one half plane (z - q0) . nrm >= 0
     const side = (z) => (z.re - q0.re) * nrm.re + (z.im - q0.im) * nrm.im, out = [];
     for (let i = 0; i < 4; i++) {
       const A = rect[i], B = rect[(i + 1) % 4], sa = side(A), sb = side(B);
       if (sa >= 0) out.push(A);
       if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push({ re: A.re + t * (B.re - A.re), im: A.im + t * (B.im - A.im) }); }
     }
     return out;
   }
   ```
2. **`strokeEdge(ctx, plane, e, { color, width, alpha = 1, dash = null })`** (shared by `halo` and `edges`):
   * circle: `drawCircle(ctx, plane, e.c, e.r, { color, width, alpha, dash })`.
   * line: `L = 4 * plane.getView().unitsAcross`; `A = plane.toPixel(add(e.point, scale(e.dir, L)))`, `B = plane.toPixel(add(e.point, scale(e.dir, -L)))`; with `ctx.save()`: `globalAlpha = alpha`, `lineWidth = width`, `strokeStyle = cssColor(color)`, `setLineDash(dash ? Array.from(dash) : [])`, `beginPath`, `moveTo(A)`, `lineTo(B)`, `stroke()`, `ctx.restore()`. (`drawSegment` has no alpha, so the halo needs this.) The anchor of the half-plane preset is the origin, which is inside the view; an anchor far outside the view would need the foot of the view centre on the line instead.
   * point: a 5 px ring `ctx.arc(P.x, P.y, 5, ...)` stroked the same way (halo use only).
3. **`halo`** (only when `state.chip` is `open` or `domain`, edges = `an.included`; or `closed`, edges = `an.excluded`): for each, `strokeEdge(ctx, plane, e, { color: '--warn', width: 8, alpha: 0.30 })`; a point edge uses width 5 and radius 9 px.
4. **`bound`** (chip `bounded` and `an.bounded`): `drawCircle(ctx, plane, C(0, 0), an.boundingRadius, { color: '--seam', dash: DASH.guide, width: 2 })` and `drawLabel(ctx, plane, fromPolar(an.boundingRadius, Math.PI / 4), '|z| ≤ ' + fmtNum(an.boundingRadius), { color: '--seam', dx: 6, dy: -6 })` (`fromPolar` from complex.js).
5. **`edges`**: for each edge `e` of `an.edges`: circle and line `strokeEdge(ctx, plane, e, { color: '--polar', width: 2.5, dash: e.included ? null : DASH.excluded })`; point: `drawCircle(ctx, plane, e.c, 5 / sc, { color: '--polar', width: 2.5, fill: e.included ? '--polar' : '--surface', fillAlpha: 1 })` (hollow when not in S, filled when in S).
6. **`guides`**:
   * ring sets: `ci` = the cell with the smallest `|p - c|` (first on a tie); `c = set.cells[ci].c`; `rho = abs(sub(p, c))`. If `rho * sc >= 8`: `drawSegment(ctx, plane, c, p, { color: '--polar', width: 1.5 })` and a label `'ρ = ' + fmtNum(rho)` at the midpoint with the same perpendicular rule as the radius label of the distance station (`14 px`). Then the centre marker: with `P = plane.toPixel(c)`, `ctx.save()` a 2 px `--polar` plus of 5 px arms, `ctx.restore()`, and `drawLabel(ctx, plane, c, 'c = ' + fmtCart(c), { color: '--polar', dx: 8, dy: 18 })`.
   * half plane: `foot = C(p.re, 0)`; if `abs(p.im) * sc >= 10`: `drawSegment(ctx, plane, p, foot, { color: '--cart', dash: DASH.cart, width: 1.5 })` and `drawLabel(ctx, plane, mid, 'y = ' + fmtNum(p.im), { color: '--cart', dx: 8, dy: 4 })`.
7. **`disk`**: `status = diskStatus(set, p, eps)`; `P = plane.toPixel(p)`, `Rpx = eps * sc`.
   ```js
   function fillDisk(ctx, P, R, token, alpha) { ctx.globalAlpha = alpha; ctx.fillStyle = cssColor(token); ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, 2 * Math.PI); ctx.fill(); }
   function ringDisk(ctx, P, R, token, width) { ctx.globalAlpha = 1; ctx.lineWidth = width; ctx.strokeStyle = cssColor(token); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, 2 * Math.PI); ctx.stroke(); }
   // status 'in':   fillDisk(--ok, 0.28), ringDisk(--ok, 2)
   // status 'out':  fillDisk(--seam, 0.22), ringDisk(--seam, 2)
   // status 'both': ctx.save(); ctx.clip(regionPath(), 'evenodd'); fillDisk(--ok, 0.32); ctx.restore();
   //                ctx.save(); ctx.clip(complementPath(), 'evenodd'); fillDisk(--seam, 0.30); ctx.restore();
   //                ringDisk(--warn, 3)
   function regionPath() {                                                  // S as a Path2D in pixels; even-odd gives rings; cells are disjoint so the union is right
     const path = new Path2D();
     for (const cell of set.cells) {
       if (cell.kind === 'ring') {
         const C0 = plane.toPixel(cell.c), ro = cell.hi * sc, ri = cell.lo * sc;
         path.moveTo(C0.x + ro, C0.y); path.arc(C0.x, C0.y, ro, 0, 2 * Math.PI);
         if (cell.lo > 0) { path.moveTo(C0.x + ri, C0.y); path.arc(C0.x, C0.y, ri, 0, 2 * Math.PI); }
       } else {
         clipRectHalf(visibleRect(), cell.point, cell.normal).forEach((z, i) => { const q = plane.toPixel(z); i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y); });
         path.closePath();
       }
     }
     return path;
   }
   function complementPath() { const { w, h } = plane.getSize(), path = new Path2D(); path.rect(-10, -10, w + 20, h + 20); path.addPath(regionPath()); return path; }
   ```
   Then the word: `{ in: 'all in S', out: 'none in S', both: 'in and out' }[status]` through `drawLabel(ctx, plane, p, word, { color: statusToken, dx: 0.72 * Rpx + 8, dy: -0.72 * Rpx - 8 })`, where `statusToken` is `'--ok'`, `'--seam'`, `'--warn'`. The drawing code reads no theme: all five tokens are resolved by `cssColor` per frame.
8. **`pieces`** (chip `connected`, `domain` or `region`): for each cell `i`, `anchor(cell)`: ring `add(c, fromPolar((lo + hi) / 2, 3 * Math.PI / 4))` (for `lo = 0`, radius `hi / 2`); half `add(add(point, scale(normal, 1.5)), scale(dir, -1.5))` where `dir = C(-normal.im, normal.re)`. `drawLabel(ctx, plane, anchor, an.pieces === 1 ? 'one piece' : 'piece ' + (i + 1), { color: '--text', align: 'center', dx: 0, dy: 0 })`.

### 5.10 `sets`: explainer rows

`createExplainer(host, { id: 'sets-ex', columns: [{ key: 'cart', heading: 'Cartesian (x, y)', tone: '--cart' }, { key: 'polar', heading: 'Polar (distance ρ from the centre)', tone: '--polar' }], rows: rowsFor(state.set), same: explainerSame })`.
Row ids are `where`, `test`, `gap`. When the preset changes between a ring set and the half plane, call `explainer.update(state)` and then `explainer.setRows(rowsFor(state.set))` (same order as 5.5 step 5). The row functions read the live `state` (`s.set`, `s.p`, `s.cls`), never a captured copy, and check the set's shape (`s.set.cells[0].kind`) so a stale call returns `null`.

```js
const OR = T`\ \text{or}\ `;
function ringFrag(cell, p, i, many) {                                         // one ring cell, evaluated at the probe p
  const dx = p.re - cell.c.re, dy = p.im - cell.c.im, D = dx * dx + dy * dy, rho = Math.sqrt(D);
  const loOp = cell.loStrict ? '<' : '\\le', hiOp = cell.hiStrict ? '<' : '\\le', hasLo = !(cell.lo === 0 && !cell.loStrict);
  const rn = many ? `\\rho_${i + 1}` : '\\rho';
  const lo2 = hasLo ? `${n(cell.lo * cell.lo)} ${loOp} ` : '', lo1 = hasLo ? `${n(cell.lo)} ${loOp} ` : '';
  return { D, rho, off: sub(p, cell.c), name: many ? `c_${i + 1}` : 'c',
    sym:  `${lo2}${shift('x', cell.c.re)}^2 + ${shift('y', cell.c.im)}^2 ${hiOp} ${n(cell.hi * cell.hi)}`,   // Cartesian inequality, symbols
    num:  `${lo2}${n(D)} ${hiOp} ${n(cell.hi * cell.hi)}`,                                                   // ... with the probe's numbers
    psym: `${lo1}${rn} ${hiOp} ${n(cell.hi)}`,                                                               // polar inequality, symbols
    pnum: `${lo1}${n(rho)} ${hiOp} ${n(cell.hi)}` };                                                         // ... with the probe's numbers
}
const frags = (s) => s.set.cells.map((c, i) => ringFrag(c, s.p, i, s.set.cells.length > 1));
const verdict = (s) => T`\Rightarrow\ \text{${contains(s.set, s.p) ? 'in S' : 'not in S'}}`;
const nearestCell = (s) => (s.cls.edge ? s.cls.edge.cell : 0);               // the cell that owns the nearest edge
const gapTerms = (s) => {                                                     // |rho - r| for every edge of that cell (a puncture counts as r = 0)
  const ci = nearestCell(s), f = frags(s)[ci];
  return edgesOf(s.set).filter((e) => e.cell === ci).map((e) => T`|${n(f.rho)} - ${n(e.kind === 'point' ? 0 : e.r)}|`).join(T`,\ `);
};

const onRing = (fn) => (s) => (s.set.cells[0].kind === 'ring' ? fn(s) : null);        // a stale call with the other shape gets an empty cell
const onHalf = (fn) => (s) => (s.set.cells[0].kind === 'half' ? fn(s) : null);

function ringRows() {
  return [
    { id: 'where', label: 'where is p?',
      cart:  onRing((s) => cart(T`p = ${fmtCart(s.p)}`)),
      polar: onRing((s) => polar(frags(s).map((f, i) => (f.rho < 1e-9
        ? T`\text{p is }${f.name}\text{: no direction}`
        : T`${f.name} = ${fmtCart(s.set.cells[i].c)}:\ p - ${f.name} = ${fmtCart(f.off)} = ${n(f.rho)}\,e^{i\varphi},\ \Arg(p - ${f.name}) = ${ang(Arg(f.off))}`)).join(T`;\ `))) },
    { id: 'test', label: 'is p in S?', native: 'polar',
      cart:  onRing((s) => { const f = frags(s); return cart(`${f.map((x) => x.sym).join(OR)}:\\ ${f.map((x) => x.num).join(OR)}\\ ${verdict(s)}`); }),
      polar: onRing((s) => { const f = frags(s); return polar(`${f.map((x) => x.psym).join(OR)}:\\ ${f.map((x) => x.pnum).join(OR)}\\ ${verdict(s)}`); }) },
    { id: 'gap', label: 'room around p', native: 'polar',
      cart:  onRing((s) => { const f = frags(s)[nearestCell(s)]; return cart(T`\rho = \sqrt{${n(f.D)}} = ${n(f.rho)};\ \varepsilon_{\max} = \min(${gapTerms(s)}) = ${fmtEps(s.cls.epsMax)}`); }),
      polar: onRing((s) => polar(T`\varepsilon_{\max} = \min(${gapTerms(s)}) = ${fmtEps(s.cls.epsMax)}`)) },
  ];
}
export function rowsFor(set) { return set.cells[0].kind === 'ring' ? ringRows() : halfRows(); }
```

The `where` row of the polar column prints the polar address **about each centre**, `\Arg(p - c)`, with `\varphi` left free: the ring condition ignores the angle, which is the point of the row. In the twodisks case the two fragments are joined with `;\ ` and named `c_1`, `c_2`. The puncture case `p = c` prints "p is c: no direction" (as `\text{p is }c\text{: no direction}`: KaTeX rejects an underscore inside `\text{}`, so the name stays outside it).

Half-plane rows (the set is `Im z > 0`; the polar column works about the origin):

```js
function halfRows() {
  return [
{ id: 'where', label: 'where is p?',
  cart:  onHalf((s) => cart(T`p = ${fmtCart(s.p)}`)),
  polar: onHalf((s) => (Math.hypot(s.p.re, s.p.im) < 1e-9 ? polar(T`\text{p is the origin: no direction}`) : polar(T`r = ${n(Math.hypot(s.p.re, s.p.im))},\ \Arg p = ${ang(Arg(s.p))}`))) },
{ id: 'test', label: 'is p in S?', native: 'cart',
  cart:  onHalf((s) => { const op = s.set.cells[0].strict ? '>' : '\\ge'; return cart(T`y ${op} 0:\ ${n(s.p.im)} ${op} 0\ ${verdict(s)}`); }),
  polar: onHalf((s) => { const op = s.set.cells[0].strict ? '>' : '\\ge', r = Math.hypot(s.p.re, s.p.im), th = Arg(s.p);
                         return polar(T`r\sin\theta ${op} 0:\ ${n(r)}\sin(${n(th)}) = ${n(s.p.im)} ${op} 0\ ${verdict(s)}`); }) },
{ id: 'gap', label: 'room around p', native: 'cart',
  cart:  onHalf((s) => cart(T`\varepsilon_{\max} = |y| = ${n(Math.abs(s.p.im))}`)),
  polar: onHalf((s) => { const r = Math.hypot(s.p.re, s.p.im), th = Arg(s.p); return polar(T`\varepsilon_{\max} = r\,|\sin\theta| = ${n(r)}\cdot|\sin(${n(th)})| = ${n(Math.abs(r * Math.sin(th)))}`); }) },
  ];
}
```

The footer, one function for both shapes. The two routes are computed separately so the `agree` flag is a real check (Cartesian: take the square root first; polar: the modulus of the offset is already `rho`):

```js
export function explainerSame(s) {
  const clean = (x) => (Math.abs(x) < TOL ? 0 : x);                // a probe snapped onto an edge is 4.4e-16 from it, not 0
  let eC, eP;
  if (s.set.cells[0].kind === 'half') {
    const r = Math.hypot(s.p.re, s.p.im), th = Arg(s.p);
    eC = Math.abs(s.p.im);                                        // |y|
    eP = Math.abs(r * Math.sin(th));                              // r |sin theta|
  } else {
    const ci = nearestCell(s), f = frags(s)[ci];
    const radii = edgesOf(s.set).filter((e) => e.cell === ci).map((e) => (e.kind === 'point' ? 0 : e.r));
    eC = Math.min(...radii.map((r) => Math.abs(Math.sqrt(f.D) - r)));      // Cartesian route: sqrt(D) first
    eP = Math.min(...radii.map((r) => Math.abs(abs(f.off) - r)));          // polar route: rho is the modulus of p - c
  }
  eC = clean(eC); eP = clean(eP);
  const known = s.cls && Number.isFinite(s.cls.epsMax) ? clean(s.cls.epsMax) : eC;      // what the readout and the gap row say
  return { cart: cart(T`\varepsilon_{\max} = ${fmtEps(eC)}`), polar: polar(T`\varepsilon_{\max} = ${fmtEps(eP)}`), agree: close(eC, eP) && close(eC, known) };
}
```

(`nearestCell` and `frags` read `s.cls`, `s.set` and `s.p`, so the footer needs the same state object as the rows. `agree` is a three-way check: the two routes agree with each other and with `cls.epsMax`, the number the readout and the gap row print.) The `where` row shows an angle through `niceAngle`: an angle within 1e-6 rad of `p pi / q` (q at most 12) is written as that exact angle, because a pointer-placed probe is never exactly on one (an edge snap keeps the pointer's direction, which is a few 1e-7 off `pi/2` for a drag to `2i`), and three decimals cannot show the difference. Prose that is not TeX: the `where` row prints `\text{...}` for the "no direction" cases, never a bare string, because a bare string in a cell is TeX.

Verified strings (default probe `p = 2`, annulus):

| Cell | TeX |
|---|---|
| `sets-ex-test-cart` | `1 < x^2 + (y + 1)^2 \le 9:\ 1 < 5 \le 9\ \Rightarrow\ \text{in S}` |
| `sets-ex-test-polar` | `1 < \rho \le 3:\ 1 < 2.236 \le 3\ \Rightarrow\ \text{in S}` |
| `sets-ex-where-polar` | `c = -i:\ p - c = 2 + i = 2.236\,e^{i\varphi},\ \Arg(p - c) = 0.464` |
| `sets-ex-gap-cart` | `\rho = \sqrt{5} = 2.236;\ \varepsilon_{\max} = \min(\|2.236 - 1\|,\ \|2.236 - 3\|) = 0.764` |
| `sets-ex-gap-polar` | `\varepsilon_{\max} = \min(\|2.236 - 1\|,\ \|2.236 - 3\|) = 0.764` |
| on the outer circle, `p = 2i`, test-cart | `1 < x^2 + (y + 1)^2 \le 9:\ 1 < 9 \le 9\ \Rightarrow\ \text{in S}` |
| on the inner circle, `p = 0`, test-cart | `1 < x^2 + (y + 1)^2 \le 9:\ 1 < 1 \le 9\ \Rightarrow\ \text{not in S}` |

### 5.11 `sets`: interaction pipeline

State: `state = { presetId, flags: { innerStrict, outerStrict }, set, an, p: C(2, 0), eps: 0.5, snap: true, chip: null, cls }`.

1. **Mount.** `{ id } = presetFromContext(ctx.preset)`; `state.presetId = id`; `state.flags = { ...buildSet(id).flags }`; `state.set = buildSet(id, state.flags)`.
   `plane = createPlane(host, { id: 'sets-plane', xRange: VIEW.xRange, yRange: VIEW.yRange, grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], maxWidth: 560, wheel: 'focus', ariaLabel: 'Complex plane with a set and a probe point' })`.
   `hp = plane.addPoint({ id: 'p', z: state.p, color: '--input', label: 'p', name: 'probe p', step: 0.05, onDrag: onProbe })`. Seven layers (5.9), then the explainer, then `recompute({ set: true })`.
2. **The probe pipeline.**
   ```js
   function applyProbe(z, info) {                                  // info: { final, source: 'pointer' | 'keyboard' | 'tap' | 'api' }
     if ((info.source === 'pointer' || info.source === 'tap') && state.snap) {
       const q = snapToEdge(state.set, z, SNAP_PX / plane.getView().scale);
       if (q) z = q;
     }
     if (z.re !== hp.z.re || z.im !== hp.z.im) hp.set(z, { silent: true });
     state.p = { re: z.re, im: z.im };
     recompute({ set: false });
     if (info.final) status.textContent = readout.textContent + '. ' + detail.textContent;
   }
   function onProbe(z, info) { applyProbe(z, info); }               // a function declaration, so it exists when addPoint({ onDrag: onProbe }) runs
   ```
3. **`recompute({ set })`** (the order matters: the explainer rows read `state.cls`, so it is computed before anything renders):
   1. if `set`: `state.an = analyse(state.set)`.
   2. always: `state.cls = classifyPoint(state.set, state.p)`.
   3. if `set`: `updateSetline()`; `updateChips()` (each answer chip: `data-answer`, the `.sets-a` word, the reason span); `updateBoundary()`; `updateCheckboxes()` (labels, `disabled`, `checked`); `updatePresetPressed()`; `renderProblem()`; `renderWhy()`; then `explainer.update(state)` **and then** `explainer.setRows(rowsFor(state.set))`.
   4. always: `setText(readout, 'probe: ' + state.cls.kind + '; eps = ' + fmtNum(state.eps, 3))`; `readout.dataset.kind = state.cls.kind`; `setText(detail, probeSentence(state))` (2.5.7); `explainer.update(state)` (a no-op duplicate after step 3, coalesced); `plane.requestDraw()`.
4. **Presets.** `loadPreset(id)`: `state.presetId = id`, `state.flags = { ...DEFS[id].flags }`, `state.set = buildSet(id, state.flags)`, `recompute({ set: true })`, announce. A preset chip is `aria-pressed` iff `sameSet(state.set, buildSet(id))` where `sameSet = (a, b) => JSON.stringify(a.cells) === JSON.stringify(b.cells)` (`Infinity` serialises the same on both sides). So ticking "Leave out the outer circle" on the 1.5.2 annulus leaves no chip pressed (it is the open annulus, which has no chip), and un-ticking "Leave out the inner circle" as well makes **Closed annulus** pressed.
5. **Strict boxes.** `change` on `#sets-inner-strict` sets `state.flags.innerStrict = box.checked`; on `#sets-outer-strict` sets `outerStrict`; then `state.set = buildSet(state.presetId, state.flags)` and `recompute({ set: true })`. A disabled box (`!set.innerApplies`) is `checked = false`, `disabled = true`, `aria-disabled = "true"`, with its label "No inner edge in this set".
6. **Answer chips.** `click`: `state.chip = state.chip === id ? null : id`; every answer chip `aria-pressed = String(chip.id === 'sets-' + state.chip)`; `plane.requestDraw()`. The highlight stays when the preset changes (it is recomputed from the new set).
7. **Slider.** `input`: `state.eps = Number(slider.value)`; `setText(epsOut, fmtNum(state.eps, 3))`; `recompute({ set: false })`.
8. **Snap box.** `change`: `state.snap = box.checked`.
9. **Tap.**
   ```js
   let down = null;
   const offDown = plane.on('pointerdown', (e) => { down = e.isPrimary ? { id: e.pointerId, px: e.px, py: e.py, t: performance.now() } : null; });
   const offUp   = plane.on('pointerup', (e) => {
     if (!down || e.pointerId !== down.id) return;
     const moved = Math.hypot(e.px - down.px, e.py - down.py), dt = performance.now() - down.t;
     down = null;
     if (moved <= 3 && dt < 500) applyProbe(e.z, { final: true, source: 'tap' });
   });
   const offCancel = plane.on('pointercancel', () => { down = null; });
   ```
   The three unsubscribe functions go into `cleanups`.
10. **`probeSentence(state)`** builds the 2.5.7 strings from `state.cls` and `diskStatus(state.set, state.p, state.eps)`; `E = fmtEps(cls.epsMax)`; `P = fmtCart(state.p)`. Status `'both'` for an interior or exterior point means "your disk is too big", the boundary case never reaches the "too big" wording.

11. **Checkbox labels** (`updateCheckboxes()`; `null` means the box is disabled, unchecked, and shows "No inner edge in this set"):
    ```js
    const BOX_LABELS = {
      annulus:   ['Leave out the inner circle', 'Leave out the outer circle'],
      closed:    ['Leave out the inner circle', 'Leave out the outer circle'],
      punctured: ['Leave out the centre point', 'Leave out the outer circle'],
      halfplane: [null, 'Leave out the edge line'],
      twodisks:  [null, 'Leave out the circles'],
    };
    ```
    The label key is `state.presetId`, so after the student's own ticking the labels still belong to the geometry on screen. `box.checked` is set from `state.flags`; a disabled box also gets `aria-disabled="true"`.
12. **`renderProblem()` and `renderWhy()`** (rebuilt by `recompute({ set: true })`):
    ```js
    function renderProblem() {
      box.replaceChildren();
      try {
        const p = problemById('1.5.2');
        if (!p) return;
        if (!sameSet(state.set, buildSet('annulus'))) {                      // the student changed the set: say so, show no handout statement
          box.append(h('span', { class: 'badge', 'data-tone': 'accent', text: 'Your set' }), ' You changed the set. The six answers below follow your set, not the handout\'s.');
          return;
        }
        const stmt = h('span');
        for (const part of statementParts(p.statement)) { if (part.math) { const m = h('span'); tex(m, part.text); stmt.append(m); } else stmt.append(part.text); }
        const eq = h('div', { class: 'tex-scroll sets-answer-tex' }); tex(eq, wrapAnswerTex(p.answer.tex));     // inline mode: KaTeX may break the line, display mode never does
        if (eq.classList.contains('tex-error')) eq.hidden = true;               // no KaTeX: the plain line below carries the answer
        box.append(h('span', { class: 'badge', 'data-tone': 'polar', text: 'Problem 1.5.2' }), ' ', stmt,
          h('details', { id: 'sets-answer' }, [h('summary', { text: 'Show the answer' }), eq, h('p', { class: 'muted mono', text: p.answer.text })]));
      } catch (e) { box.replaceChildren(); }
    }
    function renderWhy() {
      const half = state.set.cells[0].kind === 'half', tone = half ? 'cart' : 'polar', p = problemById('1.5.2');
      why.replaceChildren(); why.dataset.tone = tone;
      const body = h('span');
      if (half) body.textContent = 'Im z > 0 is one condition on y, so Cartesian is the easy address here. Polar about any centre would be the long way round.';
      else if (p) prose(body, p.addressWhy);
      why.append(h('span', { class: 'badge', 'data-tone': tone, text: half ? 'easy in Cartesian' : 'easy in Polar' }), ' ', body,
        half ? '' : ' Try the half plane: there the roles swap.');
    }
    ```
    `sameSet(a, b)` is `JSON.stringify(a.cells) === JSON.stringify(b.cells)`.

### 5.12 Timing, resolution, hit testing

* **Animation timing.** None. No `requestAnimationFrame`, `setTimeout` or `setInterval` is started by either station (the plane's redraw and the explainer's render are coalesced by those widgets, one per frame). The tap uses `performance.now()` differences only.
* **Resolution management.** There is no canvas of our own. All drawing is in CSS pixels on the plane's context, which the plane has already scaled by `devicePixelRatio` (capped at 3, and below 16 million device pixels). The `Path2D` clip of the epsilon-disk is built per frame from `plane.toPixel`, so it follows resize and zoom with no cache to invalidate. The DOM gauge is resolution independent.
* **Hit testing.** (1) Handles are `button`s: the browser does it (circular hit area, 32 px, 44 px on coarse pointers). (2) Snapping in distance: nearest lattice point, `hypot(dz) * scale <= 6`. (3) Snapping in sets: `nearestEdge` then `dist <= 6 / scale`. (4) The tap: pointer movement `<= 3` px and duration `< 500` ms on empty canvas. Nothing else on the canvas is hit-tested: the circle in distance and the edges in sets are not draggable.
* **Cost.** One pointer move costs: one `onDrag` (a few `Math.hypot` and a `Handle.set`), one `requestDraw` (the plane draws once per frame: about 10 canvas calls per layer, a `Path2D` of at most 4 arcs), one `explainer.update` (up to 10 KaTeX renders in the fast no-MathML mode, adaptively throttled by the widget), a few `textContent` writes guarded by `setText`. The 220 ms MathML refine pass runs once after the drag.

---

## 6. Mathematics

### 6.1 Formulas used

Notation: `z = x + iy = r e^{iθ}`, `r = |z| = √(x² + y²)`, `θ = Arg z` (one number in (−π, π]), `arg z = { θ + 2πk }` (a set).

| # | Formula | Where it is used |
|---|---|---|
| F1 | `\|z\| = √(x² + y²) = r`: the length of the arrow from 0 to z | rays, `r` labels, rows `z1`, `z2`, `lens` |
| F2 | `d = \|z₁ − z₂\| = √((x₁ − x₂)² + (y₁ − y₂)²)`: the length of the slide `z₁ − z₂ = (x₁ − x₂) + i(y₁ − y₂)` | two-point mode, Cartesian column |
| F3 | `d² = r₁² + r₂² − 2 r₁ r₂ cos(θ₁ − θ₂)` (law of cosines on the triangle 0, z₂, z₁) | two-point mode, polar column |
| F4 | `c := x₁x₂ + y₁y₂ = Re(z₁ \overline{z₂}) = r₁ r₂ cos(θ₁ − θ₂)`: `z₁ \overline{z₂} = (x₁x₂ + y₁y₂) + i(y₁x₂ − x₁y₂)` in Cartesian and `r₁r₂ e^{i(θ₁ − θ₂)}` in polar | the bridge between the two columns (row `cross`); why F2 and F3 agree |
| F5 | `\|z₁ + z₂\|² = \|z₁\|² + \|z₂\|² + 2c` (expand `(z₁ + z₂)(\overline{z₁} + \overline{z₂})`); and `\|z₁ − z₂\|² = \|z₁\|² + \|z₂\|² − 2c` | rows `len`, `dist` |
| F6 | **Triangle inequality.** `\|c\| ≤ \|z₁ \overline{z₂}\| = r₁r₂` (because `\|Re w\| ≤ \|w\|`), so `(r₁ − r₂)² ≤ \|z₁ + z₂\|² ≤ (r₁ + r₂)²`, i.e. `\| \|z₁\| − \|z₂\| \| ≤ \|z₁ + z₂\| ≤ \|z₁\| + \|z₂\|`. In polar this is `−1 ≤ cos(θ₁ − θ₂) ≤ 1` | row `ineq` |
| F7 | **Equality.** `\|z₁ + z₂\| = \|z₁\| + \|z₂\|` iff `c = r₁r₂` iff `cos(θ₁ − θ₂) = 1` iff `θ₁ − θ₂ ∈ 2πℤ` iff **`arg z₁ = arg z₂` as sets** (for nonzero z₁, z₂) iff `z₂ = λ z₁` with `λ ≥ 0`. The lower bound is attained iff `cos = −1` (opposite directions) | the aligned verdict; the gauge |
| F8 | **The ring of the sum.** `z₁ + z₂` lies on the circle `\|w − z₁\| = r₂`. The points of a circle nearest to and farthest from a point outside it lie on the line through the centre, so `\|w\|` ranges over `[ \| r₁ − r₂ \|, r₁ + r₂ ]`: F6 again, geometrically | the dashed ring and the two markers |
| F9 | **Circle.** `\|z − a\| = R` ⟺ `(x − x₀)² + (y − y₀)² = R²` ⟺ `z = a + R e^{iφ}` for some φ; `φ` and `φ + 2πk` give the same point; `φ ∈ [0, 2π)` walks once around | circle mode |
| F10 | **Tiny disks.** `p` is *interior* to S iff some open disk `D_ε(p) = {\|z − p\| < ε}` lies in S; *exterior* iff some disk misses S; *boundary* iff every disk contains points of S and points not in S | sets |
| F11 | **Distance to an edge.** circle `\|z − c\| = r`: `\| \|p − c\| − r \|` (that is `\|ρ − r\|` with `ρ = \|p − c\|`); a single point `c`: `ρ`; a line with unit normal `n` through `q`: `\| (p − q) · n \|` | `nearestEdge` |
| F12 | **Largest disk.** For `p` off every edge, `ε_max = dist(p, nearest edge)`: `D_ε(p)` stays on one side iff `ε ≤ ε_max` | `classifyPoint`, `diskStatus` |
| F13 | **Topology words.** open ⟺ no boundary point is in S; closed ⟺ every boundary point is in S; bounded ⟺ S ⊂ some disk `\|z\| ≤ M` (for a ring, `M = \|c\| + hi`, by `\|z\| ≤ \|z − c\| + \|c\|`); connected ⟺ one piece; domain = open and connected; region = domain plus some, none or all of its boundary points | `analyse` |

F6 in words for the student: "The sum's length is at most the detour, and at least the difference; the cosine is why."

### 6.2 Worked solutions (hand-checked; every number is a unit-test expectation)

#### 6.2.1 Problem 1.2.2: distance between `4 + 3i` and `−1 + i`

**Cartesian (the native address).** `z₁ − z₂ = (4 − (−1)) + (3 − 1)i = 5 + 2i`. `d = |5 + 2i| = √(5² + 2²) = √29 = 5.385164807134504`.

**Polar (the check).**
`r₁ = |4 + 3i| = √(16 + 9) = 5`; `θ₁ = Arg(4 + 3i) = atan2(3, 4) = 0.6435011087932844` (36.8699 degrees).
`r₂ = |−1 + i| = √2 = 1.4142135623730951`; `θ₂ = Arg(−1 + i) = 3π/4 = 2.356194490192345` (135 degrees; second quadrant).
`θ₁ − θ₂ = −1.7126933813990606` (−98.1301 degrees).
`cos(θ₁ − θ₂) = cos θ₁ cos θ₂ + sin θ₁ sin θ₂ = (4/5)(−√2/2) + (3/5)(√2/2) = −√2/10 = −0.14142135623730953`.
`d² = r₁² + r₂² − 2 r₁ r₂ cos(θ₁ − θ₂) = 25 + 2 − 2(5)(√2)(−√2/10) = 27 + 2 = 29`, so `d = √29`. ✓ both addresses give `√29 ≈ 5.385`.
Cross term: `c = x₁x₂ + y₁y₂ = 4(−1) + 3(1) = −1`, and `r₁ r₂ cos(θ₁ − θ₂) = 5√2 (−√2/10) = −1`. ✓ (F4).
Other names: replace `θ₁` by `θ₁ + 2π`: `θ₁ − θ₂ + 2π = 4.5704919`, `cos = −0.14142135623730953`: the same `d`. (The set statement, as the station prints it: `arg z₁ = { …, -5.64, 0.644, 6.927, … }`, `arg z₂ = { …, -5π/4, 3π/4, 11π/4, … }`.)
The slide's own polar address: `r = √29`, `Arg(5 + 2i) = atan2(2, 5) = 0.3805063771123649` (21.8014 degrees): the distance is `r`, the angle says which way you walk.

| Quantity | Value |
|---|---|
| `z₁ − z₂` | `5 + 2i` |
| `D = d²` | 29 |
| `d` | 5.385164807134504 |
| `r₁`, `r₂` | 5, 1.4142135623730951 |
| `θ₁`, `θ₂` | 0.6435011087932844, 2.356194490192345 |
| `θ₁ − θ₂` | −1.7126933813990606 |
| `cos(θ₁ − θ₂)` | −0.14142135623730953 |
| `c` (cross term) | −1 |
| `Arg(z₁ − z₂)` | 0.3805063771123649 |

#### 6.2.2 Problem 1.2.1: `|z − (1 + 2i)| = 3`

**Polar (the native address).** "Distance from `a = 1 + 2i` equals 3" is the definition of a circle: centre `1 + 2i`, radius 3. Written from the centre, `z = a + 3e^{iφ}`, `φ ∈ [0, 2π)`:

| φ | `z = (1 + 2i) + 3e^{iφ}` | `(x − 1)² + (y − 2)²` |
|---|---|---|
| 0 | `4 + 2i` | 9 |
| π/2 | `1 + 5i` | 9 |
| π | `−2 + 2i` | 9 |
| 3π/2 | `1 − i` | 9 |
| π/4 | `(1 + 3/√2) + (2 + 3/√2)i = 3.1213203 + 4.1213203i` | 9 |
| π/6 | `(1 + 3√3/2) + (2 + 3/2)i = 3.5980762 + 3.5i` | 9 |

**Cartesian (the check, and a longer road).** Square both sides: `(x − 1)² + (y − 2)² = 9`, a circle with centre `(1, 2)` and radius 3. The whole-number points on it are the four in the table (`a² + b² = 9` has only `(±3, 0)` and `(0, ±3)` as integer solutions). The origin is inside the circle: `|0 − a| = √5 = 2.236 < 3`.
Dragging the dot `z` to `1 + 6i` makes `R = |1 + 6i − (1 + 2i)| = |4i| = 4`.
The angle at the default dot: `z − a = 3i`, `Arg(3i) = π/2`, and `arg(z − a) = { …, −3π/2, π/2, 5π/2, … }`: every name `φ + 2πk` reaches the same point of the circle.

#### 6.2.3 Problem 1.5.2: `S = { 1 < |z + i| ≤ 3 }`

**Polar (native).** Centre the picture at `c = −i` and write `z = −i + ρ e^{iφ}`. Then `S` is `1 < ρ ≤ 3` with `φ` free: a ring. Its edges are the circle `ρ = 1` (**not** in S, because the inequality is strict) and the circle `ρ = 3` (**in** S).

**Cartesian (the check).** `1 < x² + (y + 1)² ≤ 9`. Test a point: `p = 2`: `x² + (y + 1)² = 4 + 1 = 5`, `1 < 5 ≤ 9`: in S. Polar: `p − c = 2 + i`, `ρ = √5 = 2.2360679775`, `1 < 2.236 ≤ 3`: in S, `Arg(2 + i) = 0.4636476090008061`.

The answers, each with its reason from F10 to F13:

| Question | Answer | Reason (hand check) |
|---|---|---|
| boundary points | the circle `\|z + i\| = 1` (not in S) and the circle `\|z + i\| = 3` (in S) | near a point with `ρ = 1`, points with `ρ` just below 1 are not in S and points just above are; the same at `ρ = 3` |
| open? | **no** | `p = 2i` has `ρ = \|2i + i\| = 3`, so `p ∈ S`, but every disk `D_ε(2i)` contains points with `ρ > 3` (for example `2i + (ε/2)i`, which has `ρ = 3 + ε/2`), and those are not in S |
| closed? | **no** | `p = 0` has `ρ = \|0 + i\| = 1`, so `p ∉ S`, yet the points `i/n` are in S (`ρ = 1 + 1/n`) and converge to `0`: a boundary point missing from S |
| bounded? | **yes** | `\|z\| ≤ \|z + i\| + \|−i\| ≤ 3 + 1 = 4`, by the triangle inequality of 6.1 (F6): S lies in `\|z\| ≤ 4` |
| connected? | **yes** | join two points by an arc of a circle about `−i` (that changes `φ`) and a radial segment (that changes `ρ`): the path stays in `1 < ρ ≤ 3` |
| domain? | **no** | a domain is open and connected; S is connected but not open |
| region? | **yes** | S is the domain `1 < \|z + i\| < 3` plus its outer circle, which is part of the closure |

Exact answer as the handout wants it: neither open nor closed; bounded; `∂S = {|z + i| = 1} ∪ {|z + i| = 3}`; not a domain (not open); a region. These are `problemById('1.5.2').answer.values`, which the unit test compares with `analyse(buildSet('annulus'))` key by key.

#### 6.2.4 Topic T1.2: the triangle, four states (default `z₁ = 3 + i`, `z₂ = 1 + 2i`)

| State | `z₁`, `z₂` | `\|z₁\|` | `\|z₂\|` | `z₁ + z₂` | `\|z₁ + z₂\|` | `\|z₁\| + \|z₂\|` | slack | lower bound | `c` | `cos(θ₁ − θ₂)` | `θ₁ − θ₂` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| default | `3 + i`, `1 + 2i` | 3.1622776601683795 (√10) | 2.23606797749979 (√5) | `4 + 3i` | 5 | 5.39834563766817 | 0.39834563766816977 | 0.9262096826685897 | 5 | 0.7071067811865476 | −0.7853981633974483 (−π/4) |
| aligned | `1 + i`, `2 + 2i` | 1.4142135623730951 | 2.8284271247461903 | `3 + 3i` | 4.242640687119286 (3√2) | 4.242640687119286 | **0** | 1.4142135623730951 | 4 | 1 | 0 |
| perpendicular | `1 + i`, `−2 + 2i` | 1.4142135623730951 | 2.8284271247461903 | `−1 + 3i` | 3.1622776601683795 (√10) | 4.242640687119286 | 1.0803630269509061 | 1.4142135623730951 | 0 | 6.1e−17 (0) | −1.5707963267948966 (−π/2) |
| opposite | `1 + i`, `−1 − i` | 1.4142135623730951 | 1.4142135623730951 | `0` | 0 | 2.8284271247461903 | 2.8284271247461903 | 0 | −2 | −1 | ±π |

By hand, default: `|z₁ + z₂| = |4 + 3i| = 5` (the 3-4-5 triangle). `c = 3·1 + 1·2 = 5`; `r₁r₂ = √10 √5 = √50 = 7.0710678`; `cos = 5/7.0710678 = 0.70710678 = √2/2`, so `θ₁ − θ₂ = ±π/4`: check `atan(1/3) − atan(2) = 0.3217506 − 1.1071487 = −0.7853981`. `|z₁ + z₂|² = 10 + 5 + 2(5) = 25`. Aligned: `1 + i` and `2 + 2i` have `Arg = π/4` both: `arg z₁ = arg z₂ = { …, −7π/4, π/4, 9π/4, … }` (the same list), `slack = √2 + 2√2 − 3√2 = 0`.
For the default, the sum's length range is `[0.926, 5.398]` and the bounds `(r₁ − r₂)² = 0.8578643762690497`, `(r₁ + r₂)² = 29.142135623730958`.

#### 6.2.5 The five presets and their flag variants: answers computed by the model (the unit test asserts each row)

| Set (preset, flags) | `describeSet(...).ascii` | edges (in S?) | open | closed | bounded | connected | domain | region | bounding radius |
|---|---|---|---|---|---|---|---|---|---|
| annulus (inner strict, outer not) | `1 < \|z + i\| <= 3` | inner no, outer yes | no | no | yes | yes | no | yes | 4 |
| annulus, outer strict ("open annulus") | `1 < \|z + i\| < 3` | no, no | yes | no | yes | yes | yes | yes | 4 |
| closed annulus | `1 <= \|z + i\| <= 3` | yes, yes | no | yes | yes | yes | no | yes | 4 |
| punctured disk | `0 < \|z + i\| < 3` | point −i no, outer no | yes | no | yes | yes | yes | yes | 4 |
| punctured, centre kept (inner not strict) | `\|z + i\| < 3` | outer no | yes | no | yes | yes | yes | yes | 4 |
| punctured, centre kept and outer kept | `\|z + i\| <= 3` | outer yes | no | yes | yes | yes | no | yes | 4 |
| punctured, outer kept | `0 < \|z + i\| <= 3` | point no, outer yes | no | no | yes | yes | no | yes | 4 |
| half plane | `Im z > 0` | line no | yes | no | no | yes | yes | yes | none |
| half plane, edge kept | `Im z >= 0` | line yes | no | yes | no | yes | no | yes | none |
| two disks | `\|z + 2\| < 1 or \|z - 2\| < 1` | 2 circles, no | yes | no | yes | no (2 pieces) | no | no | 3 |
| two disks, circles kept | `\|z + 2\| <= 1 or \|z - 2\| <= 1` | 2 circles, yes | no | yes | yes | no | no | no | 3 |

(Computed by running the model of 5.8 over every row; `region` is the number of pieces being 1, as 5.8 explains. The bounding radius of the two disks is `|±2| + 1 = 3`.)

#### 6.2.6 Probe classification, hand-checked (annulus 1.5.2 unless noted)

`ρ = |p + i|`; `ε_max` is the distance to the nearest of the circles `ρ = 1`, `ρ = 3`.

| Probe `p` | `ρ` | kind | in S | `ε_max` | By hand |
|---|---|---|---|---|---|
| `0` | 1 | **boundary** (inner) | no | 0 | `\|0 + i\| = 1` exactly: on the dashed circle |
| `2i` | 3 | **boundary** (outer) | yes | 0 | `\|2i + i\| = 3`: on the solid circle |
| `i` | 2 | interior | yes | 1 | `min(\|2 − 1\|, \|2 − 3\|) = 1` |
| `3 + 3i` | 5 | exterior | no | 2 | `\|3 + 4i\| = 5`; `\|5 − 3\| = 2` |
| `2` | 2.2360679775 | interior | yes | 0.7639320225002102 | `3 − √5` (smaller than `√5 − 1 = 1.236`) |
| `−i` (the hole's centre) | 0 | exterior | no | 1 | the nearest edge is the inner circle, distance `\|0 − 1\| = 1` |
| `1 − i` | 1 | **boundary** (inner) | no | 0 | `\|1 − i + i\| = 1` |
| `−4i` | 3 | **boundary** (outer) | yes | 0 | `\|−4i + i\| = \|−3i\| = 3` |
| `2 + i` | 2.8284271247461903 | interior | yes | 0.1715728752538097 | `3 − 2√2`: close to the outer circle |

The disk at `i`: `ε ≤ 1` fits ("all in S"), `ε = 1.05` straddles. The disk at `3 + 3i`: `ε ≤ 2` misses, `ε = 2.05` reaches the ring. The disk at `2 + i`: `ε = 0.15` fits, `ε = 0.2` straddles although `p` is interior: **interior means some disk fits, not every disk**. Other sets: punctured disk centre `−i`: boundary, not in S, `ε_max = 0` (with the centre kept, the same point is interior with `ε_max = 3`); half plane `2` (on the real axis): boundary, not in S for `Im z > 0` and in S for `Im z >= 0`; `2 + i`: interior, `ε_max = 1`; `2 − 3i`: exterior, `ε_max = 3`. Two disks: `2`: interior, `ε_max = 1`; `0`: exterior, `ε_max = 1`; `3`: boundary (`|3 − 2| = 1`), not in S; `−2 + 0.5i`: interior, `ε_max = 0.5`.

### 6.3 Tolerances

Unit tests compare distances, lengths and slacks to `1e-12`, classifications exactly, snapped points to `1e-12`, `ε_max` to `1e-12`. Readout strings are compared exactly (they are `fmtNum` three-decimal strings). The explainer's `agree` uses `1e-9` relative.

---

## 7. Verification plan

Run everything from the repo root (`/home/user/math-viz`). The harness serves the repo itself, blocks Google Fonts, runs desktop 1280×860 and phone 390×844 (plus desktop-dark with `--dark`), and fails on any console error, page error, failed request, external request, horizontal overflow or router error panel.

### 7.1 Acceptance criteria

| Id | Command | Expected |
|---|---|---|
| A1 | `node tools/smoke.mjs --route distance,sets,problem-1-2-1,problem-1-2-2,problem-1-5-2 --dark --out /tmp/i1-ds-a1` | `15/15 checks passed across 5 route(s).` (5 routes × desktop, phone, desktop-dark), exit 0. Then read `/tmp/i1-ds-a1/distance--desktop.png`, `sets--phone.png`, `problem-1-5-2--desktop-dark.png` with the image tool: the plane is drawn, nothing is clipped, no "under construction" panel |
| A1b (deep links) | `node tools/smoke.mjs --route distance-two,distance-circle,distance-triangle,sets-annulus,sets-closed,sets-punctured,sets-halfplane,sets-twodisks --dark --out /tmp/i1-ds-a1b` | `24/24 checks passed across 8 route(s).`; each opens in the mode or preset its token names (the same tokens are also asserted by steps D3b and S12 of the scripts, which change the hash on a mounted page) |
| A2 | `node tools/smoke.mjs --route problem-1-2-2 --script tests/interact/i1-station-distance-sets.mjs --out /tmp/i1-ds-a2` | `2/2 checks passed across 1 route(s).` (desktop and phone). Steps D0 to D13 of 7.5 (D3b included) |
| A3 | `node tools/smoke.mjs --route problem-1-5-2 --script tests/interact/i1-station-distance-sets.mjs --out /tmp/i1-ds-a3` | `2/2 checks passed across 1 route(s).` Steps S0 to S13 of 7.5 |
| A4 | the same command as A3 with `--dark` and `--out docs/review/iter-1/i1-station-distance-sets` | `3/3 checks passed`; the script calls `ctx.shot('probe-inner')` right after the probe lands on the inner circle, producing `problem-1-5-2--desktop--probe-inner.png`, `--phone--probe-inner.png`, `--desktop-dark--probe-inner.png`. Review with the image tool against the checklist in 7.3 |
| A5 | `node --test tests/unit/i1-station-distance-sets.test.mjs` (cases U-S1 to U-S19) and the inspection checklist 7.2 | all tests pass; every checklist line holds |
| all | `npm test` | the existing tests still pass (287 at the time of writing) plus the new file; no other test file changes |

### 7.2 A5 code-inspection checklist (`js/stations/sets.js`)

1. A set is data: `buildSet(id, flags)` returns `{ preset, flags, innerApplies, outerApplies, cells }` with `ring` and `half` cells whose inequalities are the booleans `loStrict`, `hiStrict`, `strict` (this is the `{center, r, op}` form of the acceptance text).
2. `edgesOf`, `contains`, `nearestEdge`, `classifyPoint`, `diskStatus`, `analyse`, `reasons`, `describeSet` take the set only. `grep -n "annulus\|punctured\|halfplane\|twodisks" js/stations/sets.js` hits only `DEFS`, `PRESET_IDS`, the preset chip labels, `presetFromContext` and `loadPreset`: none of `analyse`, `classifyPoint`, `reasons`, `describeSet`, `rowsFor` mentions a preset id.
3. `open`, `closed` come from the `included` flags of `edgesOf`; `bounded` from the cells' `hi`; `connected` and `region` from `cells.length`; `domain` is the expression `open && connected`.
4. Both strict checkboxes call `buildSet(state.presetId, state.flags)` and then `recompute({ set: true })`, which re-runs `analyse` and rewrites every chip, reason, the set line, the boundary line and the explainer rows.
5. The chips' `data-answer` is written from `analyse` output (`an[id] ? 'yes' : 'no'`), never from a table keyed by preset.
6. No colour literal appears in either file (grep `#[0-9a-fA-F]{3,8}` and `rgb(` return nothing outside comments); every canvas colour goes through `cssColor('--token')`; the injected CSS uses `var(--token)` only.
7. No `innerHTML` except through `prose`, `tex`, `texToHtml`; no `alert`, `confirm`, `prompt`, `window.open`, `localStorage` (the stations use no storage at all); no network.
8. `unmount` removes everything 4.4 lists (plane, explainer, `plane.on` unsubscribes, DOM listeners, `window.__mv` hook).

### 7.3 A4 screenshot checklist (`probe-inner`, both themes, both viewports)

* The annulus is shaded lightly in orange; the **inner circle is dashed**, the **outer circle is solid**; both are `--polar`.
* The probe `p` (green dot, label `p`) sits **on the inner circle** at `0` (top of the inner circle); its disk of radius 0.5 is drawn with an **amber ring**, the part inside the annulus tinted green and the part inside the hole tinted grey, and the word "in and out" beside it. This is the third look, different from the orange of S, the all-green disk and the all-grey disk.
* Readout reads `probe: boundary; eps = 0.5`; the detail sentence names "the circle |z + i| = 1" and says "p itself is not in S".
* Light and dark: the dashed inner circle, the amber ring and the "in and out" word are all visible against the plane surface; the shading does not hide the grid. On the phone the plane is 358 px square, no label runs off the canvas, nothing overflows horizontally.
* The six answer chips below show open no, closed no, bounded yes, connected yes, domain no, region yes, with dashed borders on the "no" chips (the shell's `data-answer` styling).

### 7.4 Unit test cases (`tests/unit/i1-station-distance-sets.test.mjs`, node:test, imports from `../../js/stations/distance.js` and `sets.js`; tolerance 1e-12 unless stated)

**distance**

| Id | Call | Expected |
|---|---|---|
| U-D1 | `slideStats(C(4,3), C(-1,1))` | `dx 5`, `dy 2`, `D 29`, `d` = `Math.sqrt(29)` (5.385164807134504), `slide {5, 2}`, `theta` 0.3805063771123649, `r1 5`, `r2` 1.4142135623730951, `t1` 0.6435011087932844, `t2` 2.356194490192345, `dtheta` −1.7126933813990606, `cosd` −0.14142135623730953, `cross −1`, `crossPolar` −1, `dPolar` equals `d` |
| U-D2 | for `k` in −2..2: `Math.sqrt(r1² + r2² − 2 r1 r2 cos(dtheta + 2πk))` for U-D1 | equals `d` to 1e-9 (every name of the angles gives the same distance) |
| U-D3 | `slideStats(C(2,2), C(2,2))` | `d 0`, `theta` null, no NaN anywhere |
| U-D4 | `circleStats(C(1,2), C(1,5))`; `circleStats(C(1,2), C(1,6))`; `circleStats(C(1,2), C(1,2))` | `R 3`, `phi` π/2, `off {0, 3}`, `D 9`; `R 4`; `R 0`, `phi` null |
| U-D5 | for φ in {0, π/6, π/4, π/2, π, 3π/2}: `z = C(1 + 3 cos φ, 2 + 3 sin φ)`; `circleStats(a, z)` | `R` = 3 and `(z.re − 1)² + (z.im − 2)² = 9` to 1e-12 |
| U-D6 | `triangleStats(C(3,1), C(1,2))` | `r1` 3.1622776601683795, `r2` 2.23606797749979, `sum {4, 3}`, `b 5`, `up` 5.39834563766817, `lo` 0.9262096826685897, `slack` 0.39834563766816977, `cross 5`, `crossPolar 5`, `dtheta` −0.7853981633974483, `cosd` 0.7071067811865476, `lo2` 0.8578643762690497, `up2` 29.142135623730958, `b2 25`, `bPolar 5`, `agree 'no'` |
| U-D7 | `triangleStats(C(1,1), C(2,2))` | `slack 0` (abs < 1e-12), `b` = `up` = 4.242640687119286, `lo` 1.4142135623730951, `cross 4`, `cosd 1`, `agree 'exact'` |
| U-D8 | `triangleStats(C(1,1), C(-2,2))` | `slack` 1.0803630269509061, `b` 3.1622776601683795, `cross 0` (abs < 1e-12), `agree 'no'` |
| U-D9 | `triangleStats(C(1,1), C(-1,-1))` | `b 0`, `slack` 2.8284271247461903, `lo 0`, `cosd −1`, `cross −2` |
| U-D10 | 2000 random pairs in [−5, 5]² | `lo ≤ b + 1e-12`, `b ≤ up + 1e-12`, `slack ≥ 0`, `\|cross − crossPolar\| < 1e-9`, `\|b − bPolar\| < 1e-9` |
| U-D11 | `z1` random, `z2 = k·z1` for `k ∈ {0.3, 1, 7}`; then `z2 = k·z1·e^{0.1 i}` | slack < 1e-12 and `agree 'exact'`; slack > 1e-6 and `agree 'no'` or `'near'` |
| U-D12 | `agreement(0.5, 0.5, 1, 1)`; `(0.5, 0.51, 1, 1)`; `(0.5, 0.52, 1, 1)`; `(π, −π + 1e-12, 1, 1)`; `(0, 1, 0, 1)` | `'exact'`, `'near'`, `'no'`, `'exact'` (wrap), `'zero'` |
| U-D13 | `magnet(C(0.1,0.9), 30)`; `magnet(C(0.3,0.5), 30)`; `magnet(C(3.18,1), 30)`; `magnet(C(3.21,1), 30)`; `magnet(C(-0.04,0.02), 30)` | `{0, 1}`; the same object back; `{3, 1}`; the same object back; `{0, 0}` with `Object.is(re, 0)` true (no −0); `magnet(z, 0)` and `magnet(z, NaN)` return `z` |
| U-D14 | `keepBothInView(C(7.9,8.9), C(0,3), {center: C(2,3), unitsAcross: 12, scale: 30}, {w: 360, h: 360})`; with `off = C(20, 0)` | `{re: 7.5333333333, im: 5.5333333333}`; the `re` axis is left unclamped (a is returned with its own `re`) |
| U-D15 | `modeFromPreset` on `{kind:'problem', id:'1.2.1'}`, `'1.2.2'`, `{kind:'token', token:'triangle'}`, `{kind:'token', token:'nope'}`, `{kind:'topic', id:'T1.2'}`, `null` | `'circle'`, `'two'`, `'triangle'`, `'two'`, `'two'`, `'two'` |
| U-D16 | `readoutText` of the default state in each mode | `d = 5.385; z1 - z2 = 5 + 2i`; `circle: center 1 + 2i, radius 3`; `\|z1\| + \|z2\| = 5.398; \|z1 + z2\| = 5; slack = 0.398; lower bound \|\|z1\| - \|z2\|\| = 0.926` |
| U-D17 | `argLists` for `z = −1 + i`; for `3 + i`; for `1 + i` and `2 + 2i` | texts `['-5π/4', '3π/4', '11π/4']` (ASCII minus) with `home` on the middle one; `['-5.961', '0.322', '6.605']`; two identical lists |
| U-D18 | every cell of `rowsFor('two' / 'circle' / 'triangle')` over the 5 sample states of the scratch run (default, zeros, negatives, equal points, opposite points), rendered with `texToHtml` after installing KaTeX with `vm.runInThisContext` | no `tex-error`; `rowsFor('two')[k].cart({ mode: 'circle', ... })` is `null`; `explainerSame(...).agree` is `true` for all of them |
| U-D19 | the TeX of the default state (table in 5.7) | contains the substrings `5 + 2i`, `\sqrt{29}`, `5.385`, `\frac{3\pi}{4} \approx 2.356`, `(x - 1)^2 + (y - 2)^2 = 3^2 = 9`, `0.926 \le 5 \le 5.398`, `0.858 \le \|z_1 + z_2\|^2 = 25 \le 29.142` |
| U-D20 | `problemById('1.2.2').answer.values` and `('1.2.1')` against the stats | `distance` = `d` (1e-12), `difference` = `slide`, `center` = `a`, `radius` = `R` |

**sets**

| Id | Call | Expected |
|---|---|---|
| U-S1 | `edgesOf(buildSet('annulus'))` | two circle edges on `c = −i`: `{role:'inner', r:1, included:false}`, `{role:'outer', r:3, included:true}` |
| U-S2 | `analyse(buildSet('annulus'))` | `open false, closed false, bounded true, connected true, domain false, region true, pieces 1, boundingRadius 4`; and for each key in `problemById('1.5.2').answer.values` that is one of `open closed bounded connected domain region`, the values are equal; `innerIncluded` equals the inner edge's `included`, `outerIncluded` the outer's, `inner` and `outer` equal the radii, `center` equals `{0, -1}` |
| U-S3 | the 11 rows of 6.2.5 | each `analyse` row and each `describeSet(...).ascii` as in the table |
| U-S4 | for every preset × all four flag combinations | `domain === (open && connected)`; `closed === excluded.length === 0`; `open === included.length === 0`; `analyse` called twice returns deep-equal results |
| U-S5 | `classifyPoint(buildSet('annulus'), p)` for `0`, `2i`, `i`, `3+3i`, `2`, `−i`, `1−i`, `−4i`, `2+i` | the table of 6.2.6: kind, `inS`, `epsMax` (to 1e-12) |
| U-S6 | `diskStatus(annulus, p, ε)` for `(i, 0.5)`, `(i, 1)`, `(i, 1.05)`, `(3+3i, 0.5)`, `(3+3i, 2)`, `(3+3i, 2.05)`, `(0, 0.05)`, `(2+i, 0.15)`, `(2+i, 0.2)` | `'in'`, `'in'`, `'both'`, `'out'`, `'out'`, `'both'`, `'both'`, `'in'`, `'both'` |
| U-S7 | punctured disk: `classifyPoint(buildSet('punctured'), C(0,-1))`; `buildSet('punctured', {innerStrict: false})` | `boundary`, `edge.kind 'point'`, `inS false`, `epsMax 0`; `interior`, `epsMax 3` |
| U-S8 | half plane: `classifyPoint` for `2`, `2+i`, `2−3i`; strict and non-strict | boundary (not in S; in S with `outerStrict: false`); interior, `epsMax 1`; exterior, `epsMax 3` |
| U-S9 | two disks: `2`, `0`, `3`, `−2+0.5i` | interior 1; exterior 1; boundary (not in S); interior 0.5 |
| U-S10 | `snapToEdge(annulus, C(0.001, 0.002), 0.05)`; `(C(0.5, 0.5), 0.05)`; `(C(0, 2.03), 0.05)` | a point with `\|q + i\| = 1` to 1e-12; `null`; `{0, 2}` to 1e-12 |
| U-S11 | for the 12 (preset, flags) rows used in the scratch run, 400 random points in [−5, 5]² each | for every non-boundary point: 48 samples on the circle of radius `0.999 ε_max` all have `contains(...) === inS`; and the point just beyond the nearest edge (or, for a puncture, the centre itself) has `contains(...) !== inS` (0 failures in the scratch run of 230 400 samples) |
| U-S12 | `describeSet` for the 12 rows; `tex` of each wrapped as `S = \{\, z \in \mathbb{C} : ... \,\}` rendered by KaTeX | the ASCII strings of 6.2.5; no `tex-error` |
| U-S13 | `reasons(annulus, analyse(annulus))` | `open` contains `the circle \|z + i\| = 3` and `So S is not open.`; `closed` contains `the circle \|z + i\| = 1` and `So S is not closed.`; `bounded` equals `S fits inside the disk \|z\| <= 4.`; `domain` equals `A domain is open and connected. S is not open and connected, so it is not a domain.`; `region` contains `1 < \|z + i\| < 3 plus some of its boundary` |
| U-S14 | `reasons` for twodisks, punctured, halfplane, closed | twodisks `connected`: `S is 2 separate pieces. A path from one to the other must leave S.`, `region`: `A region is one connected piece. S is 2 pieces, so it is not a region.`; punctured `region` contains `0 < \|z + i\| < 3 plus none of its boundary`; halfplane `bounded`: `S runs off to infinity: no disk contains it.`; closed `region` contains `plus all of its boundary` |
| U-S15 | `boundaryText` for annulus, punctured, halfplane | `Boundary points: the circle \|z + i\| = 1 (not in S); the circle \|z + i\| = 3 (in S).`; `Boundary points: the point z = -i (not in S); the circle \|z + i\| = 3 (not in S).`; `Boundary points: the line Im z = 0 (not in S).` |
| U-S16 | `presetFromContext` on `{kind:'problem', id:'1.5.2'}`, `{kind:'token', token:'twodisks'}`, `{kind:'token', token:'zzz'}`, `null` | `annulus`, `twodisks`, `annulus`, `annulus` |
| U-S17 | every cell of `rowsFor(set)` for the 7 (preset, flags) rows over ten probes, with the 5.10 `state = { set, p, eps, cls }` | no throw, no `null`, no `tex-error`; `explainerSame(state).agree` true |
| U-S18 | the TeX of the default state (table in 5.10) | contains `1 < x^2 + (y + 1)^2 \le 9:\ 1 < 5 \le 9`, `1 < \rho \le 3:\ 1 < 2.236 \le 3`, `\min(\|2.236 - 1\|,\ \|2.236 - 3\|) = 0.764` with plain bars; the probe on the inner circle has `1 < 1 \le 9\ \Rightarrow\ \text{not in S}` |
| U-S19 | `fmtEps` | `0 → '0'`, `0.0005 → '5.0e-4'`, `0.7639320225002102 → '0.764'`, `1 → '1'`; `4.44e-16`, `1.1e-16`, `9.9e-10 → '0'`; `2e-9 → '2.0e-9'` |
| U-S20 | the footer and the `where` row on probes snapped onto an edge (the values a real drag to `2i`, `0` and `-4i` leaves behind), on the half plane, two disks and the puncture | both footer cells are exactly `\varepsilon_{\max} = 0`, `agree` true, no exponent anywhere; the gap row ends `= 0`; `where` prints `\frac{\pi}{2} \approx 1.571` for `p - c = 3i` and `i`, `-\frac{\pi}{2}` for `-3i`; a generic angle, or one 1e-3 off `pi/2`, stays a decimal |
| U-S21 | a probe 5e-6 outside the inner circle; a state whose `cls.epsMax` disagrees | footer `\varepsilon_{\max} = 5.0e-6` on both sides, `agree` true; the lying state gives `agree` false |
| U-D21 | the triangle footer | cart and polar both read `\|z_1 + z_2\| = 5` (and `= 0` for the opposite pair), `agree` true |
| U-D22 / U-S22 | `wrapAnswerTex` on both files | `\text{a b} = 1` becomes `\text{a}\ \allowbreak \text{b} = 1`; no `\text` means no change; the three handout answers render without `tex-error` and keep their words in order |
| (placer) | `segmentHitsBox` against a reference Liang-Barsky on 6000 random cases, both files; `makePlacer` with a stub canvas and plane in both files; `sideCands` | the same answers; the first free spot wins, blocked spots are skipped, an `optional` word is left out when nothing is free and a `maxCost` word tolerates a crossing line but not a label; spots outside the plane.js clamp margins are never taken while another is free; measured and drawn font are one string; near spots on the preferred side come first, 40 px spots only after every near one |

### 7.5 Interaction script (`tests/interact/i1-station-distance-sets.mjs`)

One file, two routes. It branches on `ctx.route`; any other route logs that it has no steps (the load itself is the check). It imports only from `./_helpers.mjs`. It never weakens an assertion to pass: numbers that depend on pixels are compared with a tolerance **and** the snapped values are asserted exactly, because the station snaps.

```js
import { dragHandle, clickChip, readText, setSlider, settle, handleZ, planePixel } from './_helpers.mjs';

export default async function (page, ctx) {
  const { route, log, assert, shot } = ctx;
  const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: expected ${b} (+-${tol}), got ${a}`);
  const text = (sel) => readText(page, sel);
  const attr = (sel, name) => page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, name]);
  const noOverflow = async (when) => assert(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, `horizontal overflow ${when}`);
  const slackOf = (t) => Number(/slack = (-?[\d.]+)/.exec(t)[1]);
  const draws = () => page.evaluate((id) => window.__mv.planes.get(id).getStats().draws, 'distance-plane');
  if (route === 'problem-1-2-2') return distanceSteps();
  if (route === 'problem-1-5-2') return setsSteps();
  return log(`no interaction steps for route ${route}`);
  // ... distanceSteps and setsSteps below
}
```

**distanceSteps (A2)**

| Step | Action | Assertion |
|---|---|---|
| D0 | wait for `#distance-plane-z1` | `#distance-mode-two` has `aria-pressed="true"`; `#distance-gauge` is `hidden`; `#distance-problem` text contains `1.2.2`; `#distance-status` is empty (nothing is announced while the page loads); with `#distance-answer` open the TeX answer line does not scroll sideways (`answerFits`: the `.tex-scroll` box and any `.katex-display` in it have `scrollWidth <= clientWidth + 1`) |
| D1 | read `#distance-readout` | equals `d = 5.385; z1 - z2 = 5 + 2i` (so it contains `5.385` and `5 + 2i`) |
| D2 | `handleZ` of `distance-plane-z1`, `-z2` | `4, 3` and `-1, 1` (1e-9) |
| D3 | read `data-tex` of `#distance-ex-dist-cart`, `#distance-ex-dist-polar`; `data-agree` of `#distance-ex-same` | cart contains `\sqrt{29}` and `5.385`; polar contains `5.385`; `data-agree === 'true'`; the 4 rows exist (`#distance-ex-slide-cart`, `-z1-`, `-z2-`, `-dist-`) |
| D3b | the token deep links: set `location.hash` to `#distance-triangle`, wait 600 ms; then `#distance-circle`; then `#distance-two` | after each: the chip of that mode is `aria-pressed="true"` and the others are not; the readout starts `|z1| + |z2|`, `circle:` and `d =` respectively; the explainer has the rows of that mode |
| D4 | `page.evaluate(() => { location.hash = '#problem-1-2-1'; })`, wait 600 ms | `#distance-readout` equals `circle: center 1 + 2i, radius 3` (so it contains `center 1 + 2i` and `radius 3`); circle chip pressed; `#distance-plane-z1` has the `hidden` attribute; `#distance-ex-set-cart` `data-tex` contains `(x - 1)^2 + (y - 2)^2 = 3^2 = 9`; the 1.2.1 answer line fits (`answerFits`) |
| D5 | `dragHandle(page, 'distance-plane-R', { re: 1, im: 6 })` | the returned handle position is `1, 6` exactly (lattice snap; tolerance 1e-9); readout equals `circle: center 1 + 2i, radius 4` (contains `radius 4`) |
| D6 | `shot('circle')` | |
| D7 | `clickChip(page, 'distance-mode-triangle')` | readout equals `\|z1\| + \|z2\| = 5.398; \|z1 + z2\| = 5; slack = 0.398; lower bound \|\|z1\| - \|z2\|\| = 0.926`; `#distance-gauge` visible with `data-slack="0.398"`; `#distance-aligned` has `data-agree="no"`; both footer cells (`#distance-ex-same-cart`, `-polar`) read `|z_1 + z_2| = 5`; `#distance-status` now holds the readout (a mode change is announced) |
| D8 | `dragHandle` z1 to `{1, 1}`, then z2 to `{2, 2}` | `slackOf(readout) < 0.02` (it is exactly 0 because of the snap: assert `=== 0` as well); `#distance-aligned` `data-agree === 'exact'` and its text starts `Same direction`; `#distance-args` contains two identical `{ ... }` lists (the two `.dist-set` texts after the label are equal) |
| D9 | `dragHandle` z2 to `{-2, 2}` | `slackOf(readout) > 1` (1.080); `data-agree === 'no'`; the gauge's `data-slack` is `1.08` |
| D10 | focus `#distance-plane-z2`, press `ArrowRight` | `handleZ` re is `-1.9` (a keyboard move is not snapped); readout slack changed |
| D11 | `#distance-polar` is checked by default in triangle mode: `page.uncheck('#distance-polar')`, then `page.check('#distance-polar')` | `draws()` (the plane's draw counter) increases after each change; `st.polar.triangle` follows the box (read through `window.__mv.distance.state().polar.triangle`) |
| D12 | `clickChip(page, 'distance-mode-two')` | `handleZ` of z1 is `4, 3` again (state is per mode); readout `d = 5.385; z1 - z2 = 5 + 2i`; the explainer has the 4 `two` rows again |
| D12b | `dragHandle` z1 onto z2 `{-1, 1}`; then z1 to `{0, 0}`; then back to `{4, 3}` | readout `d = 0; z1 - z2 = 0`, then starts `d = 1.414`; `shot('same-point')`, `shot('z1-zero')` (the words move clear of the handles) |
| D13 | `noOverflow('after all steps')`; `shot('triangle')` taken earlier at D8 | |

**setsSteps (A3, A4)**

| Step | Action | Assertion |
|---|---|---|
| S0 | wait for `#sets-plane-p` | `data-answer` of `#sets-open`, `-closed`, `-bounded`, `-connected`, `-domain`, `-region` is `no`, `no`, `yes`, `yes`, `no`, `yes`; `#sets-setline` has `data-text="1 < \|z + i\| <= 3"`; `#sets-preset-annulus` pressed; `#sets-boundary` text contains `\|z + i\| = 1` and `\|z + i\| = 3`; `#sets-inner-strict` checked, `#sets-outer-strict` not; `#sets-status` is empty at load; the 1.5.2 answer line fits (`answerFits`) |
| S1 | `dragHandle(page, 'sets-plane-p', { re: 0, im: 0 })` | readout contains `probe: boundary`; the handle position satisfies `abs(hypot(re, im + 1) - 1) < 1e-9` (edge snap); both footer cells end `\varepsilon_{\max} = 0}` (no `4.4e-16`), `#sets-ex-same` has `data-agree="true"`, the `where` row contains `\frac{\pi}{2}`; `shot('probe-inner')` |
| S2 | drag to `{ re: 0, im: 2 }` | readout contains `probe: boundary`; `hypot(re, im + 1)` is 3 within 1e-9; `#sets-probe-detail` contains `p itself is in S`; the footer cells say 0 and the `where` row names `\frac{\pi}{2}` for `p - c = 3i` |
| S3 | drag to `{ re: 0, im: 1 }`, then `{ re: 3, im: 3 }` | `probe: interior` then `probe: exterior`; the readout never contains the other two words |
| S4 | `page.check('#sets-outer-strict')` | `data-answer`: open `yes`, closed `no`, domain `yes`, region `yes`; `data-text` is `1 < \|z + i\| < 3`; no preset chip pressed |
| S5 | `page.uncheck('#sets-outer-strict')` | back to S0's answers; `#sets-preset-annulus` pressed again |
| S6 | `clickChip` `sets-preset-closed`, then `sets-preset-punctured`, `sets-preset-halfplane`, `sets-preset-twodisks` | closed: closed `yes`, open `no`; punctured: open `yes`, domain `yes`, boundary text contains `the point z = -i`; half plane: bounded `no`, domain `yes`, `#sets-inner-strict` disabled; twodisks: connected `no`, domain `no`, region `no`, open `yes`; then `sets-preset-annulus` restores S0; `shot('twodisks-probe-at-centre')` (p = 2 is the centre of the right disk) and, on the punctured disk with p dragged onto `-i`, `shot('punctured-probe-at-centre')` |
| S7 | `setSlider(page, 'sets-eps', 1.5)` | returns 1.5; readout contains `eps = 1.5`; `#sets-eps-value` is `1.5` |
| S8 | `planePixel(page, 'sets-plane', { re: 1, im: -2 })` then `page.mouse.click(x, y)` (a tap on empty canvas) | `handleZ` near `1, -2` (0.05); readout contains `probe: interior` |
| S9 | `clickChip` `sets-bounded` | `aria-pressed="true"`; `window.__mv.sets.highlight() === 'bounded'`; click again: `null` |
| S10 | with the snap **on**, drag `p` to `{ re: 0, im: 0.1 }` (0.1 above the top of the inner circle: 3.6 px on the phone, 4.6 px on the desktop, both inside the 6 px snap); then `page.uncheck('#sets-snap')` and drag `p` to the same point again; then `page.check('#sets-snap')` | first readout contains `probe: boundary` (it snapped onto the circle: `hypot(re, im + 1)` is 1 within 1e-9); second readout contains `probe: interior`, and `window.__mv.sets.classify(re, im)` of the handle's position (read with `handleZ`) has `kind 'interior'` and `0.05 < epsMax < 0.15`: the snap is a choice, not a limit |
| S11 | `window.__mv.sets.classify(0, 0)` | `kind 'boundary'`, `inS false`, `epsMax 0` |
| S12 | the token deep links: set `location.hash` to `#sets-twodisks`, wait 600 ms; then `#sets-halfplane`, `#sets-punctured`, `#sets-closed`, `#sets-annulus` | after each: that preset chip is `aria-pressed="true"` and the others are not; `data-answer` of `#sets-connected` is `no` for twodisks and `yes` for the rest; `#sets-setline` `data-text` is `|z + 2| < 1 or |z - 2| < 1`, `Im z > 0`, `0 < |z + i| < 3`, `1 <= |z + i| <= 3`, `1 < |z + i| <= 3` |
| S13 | `noOverflow('after all steps')` | |

The script exports no `expectedErrors`: it provokes none. `tools/smoke.mjs` runs it at 1280×860 and 390×844 (and desktop-dark with `--dark`) on fresh pages.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| `z1 = z2` (distance 0) | no legs, no arrow, label `d = 0`; readout `d = 0; z1 - z2 = 0`; the explainer polar cell says the slide has no direction; `dPolar = 0` |
| A point at 0 | `Arg(0) = 0` is never printed as a fact: the polar cells show the zero text; `agreement` is `'zero'`; the arg list reads "0 has no direction" |
| Radius shrinks to the minimum | `R` is held at 0.25 along its last direction; the label says `R = 0.25` |
| `a` dragged to the edge of the view | `keepBothInView` stops `a` where `R`'s dot would leave the view (14 px margin); if the radius vector is longer than the view, that axis is left alone and `R` may leave the view (the zoom buttons and `Reset` recover it) |
| Zoom or pan | handles follow (the plane); the lattice snap and the edge snap use the live scale, so the pixel tolerance stays 6 px; layers redraw on `viewchange` (the plane requests the draw) |
| Resize or rotation | the plane's `ResizeObserver` redraws and re-measures; the explainer re-stacks at 560 px by itself |
| Collinear triangle sides (the aligned case) | the three side labels sit on one line; `sideLabel` puts the `\|z₁ + z₂\|` label on the **opposite** side from the other two when the perpendicular test is within 2 px of 0, so the three labels do not overlap |
| `z1`, `z2` handles on top of each other | the plane stacks them (later handle on top); both stay reachable with Tab and arrow keys |
| Probe exactly on an edge by arithmetic (half plane preset with the default probe `2`, on the real axis) | classified `boundary` (distance exactly 0); the snap is not needed |
| Probe at 1e-6 from an edge (snap off, or a key nudge) | `interior` or `exterior` with `ε_max` printed in exponent form (`1.0e-6`), never `0` |
| Strict box toggled while the probe is on an edge | the probe stays; its kind may change (an included edge point becomes "in S" or not) and the readout word stays `boundary` |
| Switching preset while the probe is somewhere | the probe stays where it is, so the same point can be compared across sets; the probe may land on a new edge (the puncture) and is then `boundary` |
| ε larger than the whole picture | the disk is clipped by the canvas; the status and sentence still follow the numbers |
| KaTeX missing | 2.4 |
| Hash changes while mounted | the router unmounts and remounts; nothing leaks (7.2 item 8) |
| Two stations in one page (never happens) | style blocks are idempotent, ids are prefixed; `window.__mv.distance` and `.sets` are distinct keys |

### 8.2 Performance plan

* Target: 60 fps while dragging on the 2D planes (CONSTRAINTS). Per pointer move this goal does: one `onDrag` (a few `Math.hypot`, one `Handle.set`), a `refresh` that is mostly `setText` guards, one `plane.requestDraw`, one `explainer.update`. The plane draws at most once per frame; each layer is at most about 15 canvas calls; the sets disk uses one `Path2D` of at most four arcs and two clips.
* The explainer re-renders at most 10 cells per frame (distance two: 4 rows × 2 + footer 2), without the MathML half while dragging, and refines 220 ms after the last update; the widget's adaptive throttle protects the main thread. Keep every cell's TeX under about 90 characters of numbers and symbols (the longest, the polar `dist` cell, is about 110): KaTeX wraps at the `=` signs, and no `\sqrt{}` group is wider than about 280 px.
* The builder measures, with `plane.getStats().lastDrawMs` after a 12-step drag, and expects under 3 ms per draw on a desktop and under 8 ms with a 4× CPU throttle on the phone viewport. If the sets disk is slower than that, cache `regionPath()` by `(set, view)` key; do not cache by anything else.
* Fix round 1 (review item 6, 4x throttle on the phone view, 40-step drags with the snap off): median draw 4 to 6 ms and 90th percentile 6 to 9 ms for the two-point and triangle planes with the polar route on, and for the sets disks; at 1x the median is 1.0 to 1.7 ms. Split by layer at 4x, the word layer is the largest share (distance `labels` 1.6 to 2.7 ms, sets order 60 0.9 to 1.8 ms; the rest is the plane's grid and fills): about 0.2 ms per placed word for the candidate loops, 0.1 ms per measured word and 0.1 ms per drawn word. What was done: `segmentHitsBox` builds no arrays and each line's bounding box is computed once; the tick-number boxes, the sets edge polylines and measured text widths are cached (by view and size, by set and view, by font and text); candidates that cannot beat the best so far stop early; the font family is read once and passed to `drawLabel`, so `plane.js` no longer reads it per word. The budget of 8 ms is met by the median and missed by the 90th percentile in the two heaviest states (polar route on, four to eight words); the remaining cost is native text drawing in the plane's own `drawText` (stroke halo plus fill per word), which this goal cannot change.
* No timers, no rAF loops of this goal's own, no offscreen canvases, no layout reads inside `onDrag` except `plane.getView()` and `plane.getSize()` (cached by the plane).

### 8.3 Accessibility

* Every control is a native element with a visible label: chips and answer chips are `button`s with `aria-pressed`; checkboxes are `label.check > input`; the slider is a native range with a visible `label` and an `output`. Handles are the plane's `button`s: their `aria-label` announces **both addresses** ("z1: z = 4 + 3i; r = 5, θ = 0.644 (Arg)"), refreshed while dragging and after a key nudge; the plane announces the final label through its own polite region.
* The canvas is `aria-hidden`; everything it shows is also in text: the readout, the explainer, the arg lists, the gauge's `aria-label`, the answer chips with their reasons (`aria-describedby`), the boundary line, the probe sentence. A screen-reader user gets the whole station from the text.
* `#distance-status` and `#sets-status` (`aria-live="polite"`, visually hidden) receive the readout (and, in sets, the probe sentence) when a drag ends, after a key nudge, after a tap, a preset change and a mode change; never on every pointer move.
* Colour is never the only cue: orange line versus blue **dashed** legs; solid versus **dashed** edges; "all in S" / "none in S" / "in and out" words; yes/no words on the chips plus the shell's solid or dashed chip borders; the triangle's short cut is thicker, not a different colour.
* Focus: the shell's 3 px `:focus-visible` ring on every control; handles show the plane's ring on the dot; Tab order in 2.3; no focus is moved on mount or on mode change (the clicked chip keeps focus). Keyboard moves are never snapped, so a keyboard user is not trapped on a whole number or an edge.
* Contrast: every token pair listed in section 3 is at least 3:1 (graphics) and 4.5:1 (text) in both themes, from the shell's table. The `--warn` ring is paired with a word and two tones.
* Targets: handles are at least 32 px (44 px on coarse pointers), chips and checkboxes at least 44 px (`--tap`).

### 8.4 Reduced motion

Neither station has an animation, an autoplay or a timed transition, so `prefers-reduced-motion` needs no branch: nothing moves unless the student moves it. The gauge changes width instantly (no CSS transition). The plane's own 80 ms handle scale is already disabled under reduced motion by the plane. `ctx.theme.prefersReducedMotion()` is not called.

### 8.5 Phone layout (390 px; content 358 px)

* Everything stacks in this order: header, problem callout, chips, **plane (358 × 358 px, 29.8 px per unit in distance, 35.8 in sets), readout, hint, checkboxes, args or answers**, explainer (stacked, the widget does it at 560 px and below), why callout, links.
* `.chips` wrap; the three distance chips take two rows, the five sets presets three. `.sets-answer-list` is one column (chip above its reason below 36 rem). `#sets-setline` and every wide formula scroll inside their own box. The gauge legend wraps. No element has a fixed width above the content width; the plane is `max-width: 100%`.
* The plane stays at the default `touch-action: pan-x pan-y`, so a swipe that starts on the plane scrolls the page; the handles capture touch themselves. The tap-to-place rule in `sets` is the way to put the probe somewhere a thumb cannot reach precisely.
* The zoom buttons sit top right; every default handle position and the test targets avoid that corner at both widths (checked: the highest handle target is `3 + 3i` in `sets`, 80 percent across and 20 percent down, clear of the buttons' column on desktop and overlapping its edge by at most 2 px on the phone, where the plane raises the handle above the buttons).

---

## 9. Out of scope

* Curve parametrisation (`curves`, problem 1.5.1), limits and epsilon-delta (`limits`): `sets` only plants the disk; the circle in `distance` is not drawn as a timed curve.
* Any animation, autoplay or "spin z₂ once" control (a stepper under reduced motion would be needed; held for a later iteration).
* A "predict first" cover for the six answers; the answers are always visible, and the student is told to try first.
* Draggable radii or centres of the sets, free-form shapes, intersections and unions the student builds; the model (5.8) assumes cells that are pairwise separated, and `region = connected` rests on that. A later iteration that lets the student build overlapping cells must replace the `pieces` count by a real component computation.
* Orientation of closed curves, the Jordan curve theorem, accumulation points as a separate idea (they appear only inside the reasons).
* The Lab hand-off (no image problem lives here), narration and video, persistence of any state in `ctx.store`, deep links with numbers (`#distance-2+3i` and the like; routes are bare tokens).
* Ghost windings on the plane for `arg z` (the list form is used instead, 3.3), a staircase widget in these two stations (the lists are three items each; the staircase belongs to `staircase`, `roots`, `principal-root`, `branches`).
* Editing any file other than the two station files, the unit test file and the interaction script.

---

## 10. Notes for reviewers, builders and the orchestrator

1. **Where the numbers come from.** Section 6 was computed by running the model code of 5.6 and 5.8 and the row code of 5.7 and 5.10 against the real `complex.js` and `katex.js` and the vendored KaTeX: 140 distance cells and 560 sets cells, five and seven states each (default, zero, negative, equal, opposite), produced no TeX error, no throw, an empty cell for every stale-mode call, and `agree = true` in every footer; 230 400 sampled points confirmed the epsilon-disk claim with 0 failures. The code blocks in 5.2 to 5.10 are meant to be copied; the drawing pseudocode in 5.3 and 5.9 is prose with the helper calls named, and is not run.
2. **Decisions worth a second look.** (a) D1: the bare `#distance` opens on two points. (b) Whole-number snapping for pointer drags in `distance` and edge snapping in `sets`, both switchable, never applied to the keyboard. (c) `region` is `connected` under the cell model, documented in 5.8. (d) The `--warn` ring plus a two-tone fill for "in and out"; if a reviewer finds the amber too close to `--polar` in the light theme, the fix is the word and the two tones, not another token. (e) The hint under the plane in each mode is one sentence, the arg list is the only place the set `arg z` is written.
3. **Risks.** (i) The longest explainer cell (polar `dist`) is about 110 characters; if it wraps badly at the narrow desktop widths (560 to 700 px), split it into two rows (`dist` and `distcheck`), do not shrink the font. (ii) The `Path2D` clip of the disk can show a hairline seam where the green and grey fills meet at the edge of S; it is under the amber ring's stroke only partly, accept it unless a screenshot shows it clearly. (iii) On a phone the plane starts near the fold (2.1.2). (iv) `window.__mv.planes` registration happens in the plane; both stations' scripts rely on it through `dragHandle`.
4. **For the integrator.** Nothing in `registry.js`, `index.html`, `css/` or any core module changes. The two requests in 0.4 are wishes, not blockers. After this goal lands, the home map's links to `#distance` and `#sets`, the problem index's links `#problem-1-2-1`, `#problem-1-2-2`, `#problem-1-5-2`, and the topic links `#topic-T1-2` (which resolves to `distance`) all open real stations.

---

## 11. As built (builder notes, iteration 1)

Everything in sections 2 to 9 was built as written except the items below. Each was found by looking at the screenshots of the real stations in
all three views (desktop, phone, desktop dark) and is the smallest change that fixes what was seen. The pure functions (5.6, 5.8, 5.10 and the
text builders) are as designed and are pinned by `tests/unit/i1-station-distance-sets.test.mjs` (U-D1 to U-D20, U-S1 to U-S19, plus helpers).

| # | Design said | Built | Why (seen in a screenshot) |
|---|---|---|---|
| B1 | 5.3: labels at fixed offsets (side labels 14 px off their line, "longest" 10 px above, and so on); `drawPolarAddress` writes the `r = ...` and `Arg = ...` labels | Every word on the plane is placed by a per-file label placer (`makePlacer`, `sideCands`, `segmentHitsBox`, exported for tests). A label takes the design's preferred spot when it is free, otherwise the next free spot, otherwise the least bad one. "Free" means: inside the canvas, clear of the zoom buttons, clear of every visible handle (with its own label), clear of the dots, clear of the drawn lines (sides, legs, parallelogram, Arg arcs, seam, and in `sets` the edges and the radius ray) and clear of the earlier labels. In `distance` the words are a layer of their own (`labels`, order 40) and `drawPolarAddress` is called with `labels: false`, so the station writes `r = ...` and `Arg z = ...` itself with the same text. In `sets` the words are written at the end of the disk layer (order 60) and the piece labels in layer 70, so the seven layers of 5.9 are kept | With fixed offsets the default triangle (both polar addresses on) printed `\|z₁ + z₂\| = 5` over the z₂ handle and `shortest` over `r = 3.162`; the aligned triangle printed `longest` over `z₁ + z₂`; in `sets` `none in S` ran under the zoom buttons when the probe was top right, and `ρ = 1` sat under the disk fill |
| B2 | 5.3 triangle: side labels `\|z₁\|` and `\|z₂\|` are skipped when the polar checkbox is on (the `r` labels say the same) | They are always drawn; with the polar checkbox on the station adds only the two `Arg z = ...` labels (no `r = ...`) | The `r` labels now come from the station, and one length label per side is clearer than two |
| B3 | 5.3: the dots at the longest and shortest points always carry their own ring and word | When the sum IS the longest point (the points are lined up) or the shortest (opposite), there is one dot with the merged label `z₁ + z₂ (longest)` or `z₁ + z₂ (shortest)` | The ring and the dot coincide, and the two words overprinted |
| B4 | 5.9 item 4: the bounding-disk word sits at angle π/4 | at 3π/4, right-aligned | the word hid under the zoom buttons |
| B5 | 5.9 item 8: half-plane piece label at `point + 1.5 normal - 1.5 dir` | candidate spots at `point + a normal + b dir` taken in order (the first is two and a half units up and left), clear of the probe disk | the label sat on the probe at the default probe `2 + 1.5i` |
| B6 | 5.9 item 2: the half-plane edge is drawn from the anchor `point` outwards | drawn from the foot of the view centre on the line, so a panned view still shows it | the design's own remark ("an anchor far outside the view would need the foot of the view centre") made the rule instead of the footnote |
| B7 | 5.8 `describeSet`: `<=` becomes `\le ` (with a trailing space) | `\le` without it | the string already has a space there; the TeX was `\le  3`. The unit test U-S12 compares the exact string |
| B8 | 4.1: the gauge block is hidden outside triangle mode | both `#distance-gauge` and its block are `hidden` | the id table (2.2.1) says the gauge itself is `hidden` |
| B9 | 4.1 / 4.2 exports | extra exports: `segmentHitsBox` (both files), `probeSentence`, `interiorOf`, `defaultFlags` (sets) | the label geometry and the sentences are pure and are tested |

Measured (8.2): median plane draw 0.6 to 1.1 ms on the desktop view and 0.6 to 1.0 ms on the phone view at normal speed; at 4x CPU throttle on the
phone view the median is 2.6 to 3.9 ms and the 90th percentile at most 7.6 ms (budget 8 ms). The label placer adds no measurable cost, and the
`Path2D` cache suggested in 8.2 was not needed.

Not done, as in section 0.4 (requests to other owners): `explainer.sameLabel`, a shared `chrome.js`, `altKey` in the plane's `onDrag` info. One more is
added: the label placer (about 50 lines) is now duplicated in `distance.js` and `sets.js`; a shared helper in `plane.js` that also knows the plane's own
label frame would remove the copy and let the plane's seam and axis labels take part in the same placement.

---

## 12. Fix round 1 (review findings, iteration 1)

A reviewer checked the build against this design and sent ten findings. What was done, finding by finding. Every change is in `distance.js`, `sets.js`, this
file and the two test files; nothing else was touched.

| # | Finding | Result |
|---|---|---|
| 1 (major) | `sets` footer printed `4.4e-16` on one side and `0` on the other at a snapped boundary probe; the `where` row printed `1.571` instead of `pi/2 approx 1.571` | Fixed. `fmtEps` prints `0` under `TOL`; `explainerSame` cleans both routes the same way and now also checks them against `cls.epsMax` (5.10); the `where` row writes an angle within 1e-6 rad of `p pi / q` as that exact angle (`niceAngle`). The pointer noise is real, not rounding in the code: a drag to `2i` leaves `re = -2.6e-7` after the edge snap, so `Arg(p - c)` is `pi/2` plus 8.7e-8, which the old 1e-9 test of `exactAngle` rejected (the suggested 1e-12 would not have helped). U-S19, U-S20, U-S21 and the interaction steps S1 and S2 pin it |
| 2 | phone default of 1.2.2: `z1 - z2 = 5 + 2i` struck through by the hypotenuse and touching `d = 5.385` | Fixed. More spots for that word (above and below the dashed arrow's tip, then along the arrow on either side), and a word that is secondary (`optional`) is left out rather than drawn over a line or another word. It now sits under the dashed arrow |
| 3 | degenerate states overprint (`d = 0` on the handle ring; `z1 = 0` stacks four words; `c =` and `rho =` on the probe disk) | Fixed in the cases listed. `d = 0` is placed by the placer clear of both handles; `sideCands` has a 40 px ring after the near spots and nine spots around a zero-length side; secondary words (`Δx`, `Δy`, `z₁ − z₂ = ...`, `r = ...`, `seam`, `longest`, `shortest`, `z₁ + z₂`, `ρ`, `y`) are dropped when no clean spot exists (`longest` and `shortest` tolerate up to two crossing lines, because their rings sit on the sides); under 12 px `ρ` is not written; `c =` goes just outside the probe disk when the disk covers the centre (and is dropped if even that is crowded, as for two disks with the probe at 2); the ring words are placed before the `Arg` words, which have many places to go. Tick numbers on the axes are now obstacles (cost 2) |
| 4 | the placer measured with `system-ui` but `drawLabel` used the site font and clamped differently | Fixed. The placer reads the `--font` token once, measures with that exact string and passes the same string to `drawLabel` as `font`; it rejects the spots `plane.js` would clamp (4 px side margins, baseline between 14 and `h - 4`), so no word is moved after it was placed; placed words are kept 2 px apart. The shared placer stays a request (0.4), now also covering the tick boxes |
| 5 | footer says `same point:` for a distance; triangle footer polar cell had no left-hand side | Half done. The polar cell now reads `|z1 + z2| = 5` (5.7, U-D21). The label needs `explainer.js` (not owned): request 0.4 item 1 stays open, and the station does not edit the widget's DOM |
| 6 | draw time at 4x CPU throttle above 8 ms at the 90th percentile | Partly. See 8.2: the median is inside the budget, the 90th percentile is not in the two heaviest states. The word layer is 1 to 3 ms of it and is mostly native text drawing (`drawText` strokes a halo and fills each word); the allocation and loop savings listed in 8.2 are in, with no visible change in the measured numbers beyond the noise (about plus or minus 1 ms at 4x between runs). A real gain needs the plane to cache text widths and fonts, or a station-owned offscreen layer for the static marks |
| 7 | STORY station 9 says the student drags a bounding closed disk until it contains S; the build shows a fixed bounding disk for the Bounded chip | Left as designed for iteration 1 (the disk is computed from the set, which is what the answer needs). Note for the next unifier: if the drag is wanted, add a draggable radius handle on the Bounded highlight and a verdict "contains S / does not" computed with the same `boundingRadius` model; `analyse` already returns the number to compare with |
| 8 | the 1.5.2 TeX answer line clipped on the desktop, scrolling on the phone | Fixed in the stations without touching `problems.js`: `wrapAnswerTex` cuts each `\text{...}` phrase into words and the line is rendered inline with `white-space: normal`, so KaTeX breaks it at spaces and at relations; no horizontal scroll at 1280 or 390 px (interaction step `answerFits`, which fails on the old display-mode code). The plain line below is unchanged |
| 9 | stacked handles: the lower one cannot be grabbed with the mouse | Not changed, as the design accepts (2.3): the top handle can be dragged away, which uncovers the other, and Tab and the arrow keys reach either one. Raising the last grabbed handle would not make the lower one reachable, only change which one is on top |
| 10 | the polite live region may be filled on page load | Fixed in `distance` (`setMode(m, { announce })`, silent first call; the other writes are a drag end, a key nudge and a mode change). `sets` never wrote it at load; both are asserted empty at load in D0 and S0 |

Tests after the round: 56 in `tests/unit/i1-station-distance-sets.test.mjs` (the file's own count; the whole suite is 646, all passing), and the interaction script passes
at 1280, 390 and the dark desktop. Screenshots of the degenerate states (`same-point`, `z1-zero`, `twodisks-probe-at-centre`, `punctured-probe-at-centre`) are in
`docs/review/iter-1/i1-station-distance-sets/`.
