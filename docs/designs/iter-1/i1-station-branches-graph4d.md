# Design: i1-station-branches-graph4d, `js/stations/branches.js` and `js/stations/graph4d.js`

Designer: stage 2, iteration 1. Owner of: `js/stations/branches.js`, `js/stations/graph4d.js`. Auto-owned by this
goal (the builder writes them): `tests/unit/i1-station-branches-graph4d.test.mjs` and
`tests/interact/i1-station-branches-graph4d.mjs`.
Binding inputs: `docs/CONSTRAINTS.md`, `docs/ARCHITECTURE.md` 3, 4, 5, 8, 9 (section "i1-station-branches-graph4d") and 10,
goal `i1-station-branches-graph4d` in `docs/goals/iter-1.json`, `docs/STORY.md` (stations 14 and 20, Thread 2).

Several things below were measured in throwaway prototypes in headless Chromium with the smoke launch flags
(`--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`) and in Node. They are marked **[measured]**.
Every number in sections 6 and 7 was computed twice: by the repository's `js/core/complex.js` and by an independent
Python `cmath` script, and the 2.4.1 values were also checked by hand. They become unit-test expectations: do not
change a test to match the code without re-deriving the number here.

---

## 0. What exists today, and differences from ARCHITECTURE and the planner

`js/stations/` does not exist yet (the other wave-1 stations are being built concurrently from ARCHITECTURE). Everything
this goal imports exists and was read. The exports used, with the signature that matters:

| Module | Used exports (actual names; all match ARCHITECTURE 3, no drift found) |
|---|---|
| `../core/complex.js` | `branchRoot(c, n, seam)`, `branchArg(z, seam)`, `Arg`, `fromPolar`, `principalRoot`, `mul`, `inv`, `exp`, `pow`, `sub`, `abs`, `eq`, `fmtNum`, `fmtCart`, `fmtAngle(theta, { unicode })`, `texAngle` |
| `../core/plane.js` | `createPlane`, `drawSeam`, `drawRay`, `drawPolygonFill`, `drawDot`, `drawLabel`, `drawSegment`, `drawTimedCurve`, `drawCartAddress`, `drawPolarAddress`, `DASH`, `cssColor` |
| `../core/three-view.js` | `createView3D`, `riemannSurfaceRoot`, `riemannPoint`, `graph4D`, `modulusLandscape`, `riemannSphere`, `createMarker`, `curveToLine`, `disposeObject`, `rotate4`, `project4to3`, `inverseStereographic`, `srgbToLinear`, `hiddenRampCss`, `toScene`, `THREE` (graph4d: a `Group` and the sphere mesh, see 5.B.2 and 5.B.6; branches: `Group`, `TubeGeometry`, `MeshBasicMaterial` for the overlay tubes, see 5.A.9) |
| `../core/staircase.js` | `createStaircase` (`update`, `setSeam`, `setLabel`, `setPicked`, `destroy`) |
| `../core/explainer.js` | `createExplainer` (`update`, `flush`, `setRows`, `destroy`) |
| `../core/katex.js` | `tex`, `cart`, `polar`, `prose` |
| `../core/domaincolor.js` | `colorOf`, `drawColorWheel`, `DOMAIN_LEGEND` |
| `../core/shapes.js` | `circle`, `segment`, `rect`, `polygon`, `verticalLine`, `horizontalLine`, `sector`, `annulus` (only to read Lab strokes) |
| `../data/problems.js`, `../data/functions.js` | `problemById`, `problemsForStation`, `routeFor`, `statementParts`, `fnById` |

Differences between this design and ARCHITECTURE 4 / 9 / the planner's acceptance text. Each is deliberate and is
listed so that Review A and Review B do not read them as drift:

| # | ARCHITECTURE / planner says | This design | Why |
|---|---|---|---|
| D1 | ARCH 4 rule 2: no preset means "the station's first problem's state". | `#branches` (no preset) opens on the **principal** seam (-pi). Only `#problem-2-4-1` loads seam 0. | ARCH 9 says "default -pi" and acceptance A2 starts "on --route branches (seam -pi)". The student first sees the failure (the principal branch jumps), then fixes it. |
| D2 | A2: "readout has `0.5 - 0.8`" after dragging z to -1 - 0.05i. | The value there is `0.515 - 0.858i` (sections 6.4 and 6.5). The literal text `0.5 - 0.8` cannot appear with three-decimal formatting. The script checks the regular expression `/0\.5\d* - 0\.8\d*i/` and the parsed numbers. | The planner's text is shorthand. See risk R1. |
| D3 | ARCH 9: `#branches-n (2..5, default 3)`. | A range slider with `step="1"`, plus an `<output id="branches-n-value">`. | Same ids and range; the control type was not specified. |
| D4 | ARCH 9: walk status is "continuous" or "jumps at the negative real axis". | Exactly those two strings, plus `jumps at the seam` when the jump is found away from the negative real axis (seam near but not on it, for example 2.9). Idle and running states are `No walk yet. Press a walk button.` and `walking...`. | "At the negative real axis" would be false for a seam at 2.9 rad. |
| D5 | ARCH 9: readout `seam = <angle>; window (<s>, <s+2pi>]; z = <cart>; z^(1/n) on this branch = <polar> = <cart>`. | Same, then `; chosen theta = <beta>; Arg z = <Arg>` appended (section 4.4). | The student must see which name of the angle the branch uses and that it is not always Arg z. |
| D6 | ARCH 9: `#branches-seam` slider -pi..pi. | Radians, `min=-pi`, `max=pi`, `step="any"`. Magnets snap to -pi, -pi/2, 0, pi/2, pi within 0.02 rad. The far right is the seam at pi with window (pi, 3pi]: the same ray as the far left but the **next of the n branches** (monodromy, section 6.1 item 7). | Makes exact seams reachable by dragging and turns a quirk into a lesson. |
| D7 | ARCH 9 lists no staircase, explainer, probe or answer ids for these stations. | Added: `branches-ex`, `branches-stairs`, `branches-pick`, `branches-load-2-4-1`, `branches-answer*`, `graph4d-plane`, `graph4d-ex`, `graph4d-strokes*`, `graph4d-spin`, `graph4d-angles-reset`, `graph4d-legend*`, `graph4d-axes`, `graph4d-note`. | CONSTRAINTS: every computation has a two-column explainer; every angle says arg or Arg; strokes are lifted. |
| D8 | ARCH 9: `window.__mv.graph4d.vertexCount`. | `vertexCount` = total vertices of the **4D graph meshes of the current function**, in every mode (landscape and sphere do not change it); `shownVertexCount` is what is drawn. Also `window.__mv.branches.state()`. | A4 compares counts after chips; the count must not depend on a toggle. |
| D9 | ARCH 9: toggles `#graph4d-landscape`, `#graph4d-sphere`. | Pressed-state buttons (`aria-pressed`), mutually exclusive. Moving a 4D slider, pressing Spin or Angles to 0 switches both off (no dead controls). | A disabled slider is a dead end; switching back is what the student means. |
| D10 | STORY 20: "a sphere toggle wraps the domain onto the Riemann sphere". | Defined as domain colouring on the sphere: the point on the sphere is z, the colour is w (hue = Arg w, brightness = |w|). One small mesh (and the `Group` that holds the graph meshes) is built with the `THREE` re-export (5.B.2, 5.B.6); `riemannSphere()` supplies graticule and labels. | `three-view.js` has no coloured sphere builder. Request 2 of Appendix C. |
| D11 | ARCH 9: "lifts store key `lab.strokes` when present". | The Lab has landed: it stores an array of clean specs, one per shape (`state.shapes.map(s => s.spec)`). `extractShapes` (5.B.10) reads that, and still accepts a bare list of points, `{ points }`, `{ curve: { points } }` and `{ shapes: [...] }`. It counts **shapes**, not curves (a Lab sector is one shape drawn with eight curves), caps shapes and total points, and names what it leaves out (a `cartGrid` lifts nothing). | See risk R3 and Appendix D (fix round 1, item 4). |

---

## 1. Goal restatement, story thread, problems covered

**Goal.** Two stations, both on Thread 2 (the staircase) and the bridge into the 4D picture.

1. **`branches` (Station 14, "Branches and Cuts").** The cube root with a **movable seam**. Two planes: the z-plane
   shows the dashed seam, the point z, and the angle the branch chose; the w-plane shows the **wedge** (a third of a
   turn) the branch lands in. Two **test walks** (along and across the negative real axis) are classified by a computed
   rule as "continuous" or "jumps". Below: the arg/Arg staircase with the home window moved to the seam, the two-column
   explainer (the cube-root equation worked in x, y and in r, theta), and a 3D **Riemann surface** of z^(1/n) with the
   two edges of the window drawn over the seam.
2. **`graph4d` (Station 20, "The 4D Graph").** The graph {(x, y, u, v)} of w = f(z) shown as a 3D shadow chosen by two
   angles of rotation in R^4 (uv and yv), the hidden coordinate painted as colour. Presets: z^2, sqrt z with both roots,
   z^(1/3) with all three roots (the Riemann surface appears by itself), 1/z, e^z. Two more shadows: the modulus landscape
   and domain colouring on the Riemann sphere. A probe point shows the same point in both addresses.

**Story thread carried.** Thread 2, "a branch is a continuous choice of step; the seam is where the choice must jump",
at full depth in `branches`; then Thread 3's closing picture ("every view is a shadow of one 4D graph") in `graph4d`.
The point z is drawn once; the set arg z is the faint arcs and the staircase list; Arg z is named every time it can differ
from the chosen angle.

**How it shows on screen.**

- `branches`: drag the seam (or press a chip) and the dashed ray turns; the wedge on the w-plane turns with it (it starts at
  angle sigma/n). Press "Walk across the negative real axis" with the principal seam and the ring jumps from one edge of
  the wedge to the other: the status says `jumps at the negative real axis` and a dashed red chord marks the leap. Move the
  seam to the positive real axis and the same walk is smooth: `continuous`. That contrast is the answer to 2.4.1.
- `graph4d`: turn the uv slider by 90 degrees and the Re surface becomes the Im surface (readout `(x, y, -v) with u as
  colour`). Press "z^(1/3), all roots" and three sheets appear over every point; at uv = 90 degrees they stack like a spiral staircase
  without crossing: the staircase made solid.

**Review problems and topics covered.**

| Item | Where | How |
|---|---|---|
| **2.4.1** Find a branch of the cube root of z that is continuous along the negative x-axis | `branches` (owner), `#problem-2-4-1` | Seam 0, window 0 < theta <= 2pi, f(-1) = e^{i pi/3} = 0.5 + 0.866i. Both worked forms in section 6.4. |
| T2.4 Multiple-valued functions and branches (branches, cuts, branch points, where a branch is continuous) | `branches` | Seam = cut, 0 = branch point, walks = continuity test. |
| T2.2 Power and root functions (images of regions, principal roots) | `branches` (wedge), `graph4d` (z^(1/n), z^2) | The wedge is the image of the plane under one branch. |
| T2.5 Reciprocal map and extended plane | `graph4d` | 1/z preset and the Riemann sphere shadow. |
| T3.1 Derivatives (context) | `graph4d` | e^z and z^2 graphs are smooth surfaces; the Re and Im surfaces are two sides of one object. |
| Student's request: "glimpse this weird 4D-ish structure" | `graph4d` | The two 4D rotations, the hidden coordinate as colour, spin. |

Not owned here: the principal-root station (2.2.2), the Lab UI, the reciprocal station's own sphere.

---

## 2. UX

### 2.1 `branches`

#### 2.1.1 Wireframe, desktop (content column about 968 px; planes about 478 px each)

```
+------------------------------------------------------------------------------------------+
| Branches and Cuts                                                      (h1)              |
| ( T2 The staircase: z, arg z, Arg z )  [ 2.4.1 ]                                          |
| The cube root has three values at every point. A branch picks one ... Move the seam ...   |
+------------------------------------------------------------------------------------------+
| .panel  #branches-controls                                                               |
| Where do you put the seam?                                                               |
| ( Principal: negative real axis ) ( Positive real axis ) ( Negative imaginary axis )      |
| Seam angle   [=====o==============================]   -pi (-180 deg)                      |
| Root (n)     [==o==========]   3                                                         |
| The seam is the negative real axis. Walk across it and the value jumps.   (aria-live)    |
+------------------------------------------------------------------------------------------+
| #branches-planes (.two-planes)                                                           |
| +--------------------------------+   +--------------------------------+                  |
| |window (-pi, pi]          [+][-]|   |                          [+][-]|                  |
| |also -3.605, 8.961        [Rst] |   |      shaded wedge        [Rst] |                  |
| |            y|                  |   |           v|  /                |                  |
| |  seam  - - -+- - - - x         |   |            | /  . w            |
| |            z o  theta=2.678    |   |  . . . . . +/------ u          |
| |                                |   |   (grey dots = other roots)    |                  |
| +--------------------------------+   +--------------------------------+                  |
| z-plane (input). Drag the dot...      w-plane (output). The shaded wedge...              |
+------------------------------------------------------------------------------------------+
| .panel #branches-walks                                                                   |
| [ Walk along the negative real axis ] [ Walk across the negative real axis ]              |
| No walk yet. Press a walk button.                                (#branches-walk-status)  |
| Along: from -2 to -0.5 on the axis. Across: from -1 + 0.5i down to -1 - 0.5i.             |
+------------------------------------------------------------------------------------------+
| #branches-readout   seam = -pi; window (-pi, pi]; z = -1 + 0.5i; z^(1/3) on ... = ...    |
+------------------------------------------------------------------------------------------+
| .two-planes (working)                                                                    |
| +------------------------------------------+  +----------------------------------------+ |
| | explainer "branches-ex"                  |  | staircase "branches-stairs"            | |
| |  z | the equation | all 3 roots | ...    |  |  arg z = { ... }   Arg z = 2.678       | |
| |  same point: agree                       |  |  rows k = 2..-2, shaded home row       | |
| +------------------------------------------+  |  #branches-pick text                  | |
|                                               +----------------------------------------+ |
+------------------------------------------------------------------------------------------+
| .panel #branches-surface-panel                                                           |
| The three sheets of the cube root                                                        |
| +------------------------------------------------------------+                           |
| | #branches-surface (3D, 4:3)                    [Reset view] |   colour bar: Re w       |
| +------------------------------------------------------------+                           |
+------------------------------------------------------------------------------------------+
| .panel #branches-problem  Problem 2.4.1: statement, [Set up problem 2.4.1],               |
|   Cartesian route bar | polar route bar,  [Show the answer]                              |
+------------------------------------------------------------------------------------------+
| nav.station-links  [<- Principal Roots] [Reciprocal ->] [The 4D Graph ->] [The Staircase] |
+------------------------------------------------------------------------------------------+
```

#### 2.1.2 Wireframe, phone (390 px; content 358 px; everything in one column)

```
+----------------------------------+
| Branches and Cuts                |
| (T2 ...) [2.4.1]                 |
| lede ...                         |
+----------------------------------+
| Where do you put the seam?       |
| ( Principal: negative real axis )|
| ( Positive real axis )           |
| ( Negative imaginary axis )      |
| Seam angle            -pi (-180) |
| [==o=========================]   |
| Root (n)                       3 |
| [==o=========]                   |
| note ...                         |
+----------------------------------+
| z-plane (358 x 358)              |
| caption                          |
| w-plane (358 x 358)              |
| caption                          |
+----------------------------------+
| [Walk along ...]                 |
| [Walk across ...]                |
| status / detail                  |
| readout (wraps)                  |
+----------------------------------+
| explainer (stacked: Cartesian    |
|   cell above polar cell)         |
| staircase                        |
| 3D surface (358 x 268)           |
| problem panel                    |
| links (wrap)                     |
+----------------------------------+
```

#### 2.1.3 Controls: id, element, label, behaviour

All ids are stable across mounts. Every control has a visible label or an `aria-label`.

| Id | Element | Visible label | Behaviour |
|---|---|---|---|
| `branches-seam-principal` | `button.chip`, `type="button"`, `aria-pressed` | "Principal: negative real axis" | `setSeam(-pi)`. Pressed when the seam equals -pi (within 1e-9). |
| `branches-seam-positive` | `button.chip` | "Positive real axis" | `setSeam(0)`. This is the answer to 2.4.1. |
| `branches-seam-negimag` | `button.chip` | "Negative imaginary axis" | `setSeam(-pi/2)`. |
| `branches-seam` | `input[type=range]` in `.slider-row`, `min="-3.141592653589793"`, `max="3.141592653589793"`, `step="any"` | "Seam angle" | `input` event: `setSeam(seamFromSlider(Number(value)))` (magnets, 5.A.4). Arrow keys move 1 percent of the range (about 3.6 degrees). `aria-valuetext` = the output text. |
| `branches-seam-value` | `output for="branches-seam"` | (none) | `fmtAngle(seam, {unicode: true})` then ` (` degrees `)`, for example `-π (-180°)`, `0 (0°)`, `π/2 (90°)`, `0.5 (29°)`. |
| `branches-n` | `input[type=range]`, `min=2 max=5 step=1 value=3` | "Root (n)" | `setN(n)`: rebuilds the surface, wedge, explainer row labels, clears the walk. |
| `branches-n-value` | `output for="branches-n"` | | The integer. |
| `branches-seam-note` | `p`, `aria-live="polite"` | | One sentence about the negative real axis (4.5), plus a transient sentence when a seam move makes the value jump. |
| `branches-zplane-z` | plane handle (a `button.plane-handle`, made by `createPlane`) | "z" | Drag, arrow keys (0.1; Shift 1; Alt 0.01). Pointer drags snap to the 0.05 lattice with a small magnet (5.A.3). Focus returns to the handle and any walk is cancelled. |
| `branches-walk-along` | `button.btn` | "Walk along the negative real axis" | `startWalk('along')`. |
| `branches-walk-across` | `button.btn` | "Walk across the negative real axis" | `startWalk('across')`. |
| `branches-walk-status` | `p`, `role="status"`, `data-state` = `idle` / `walking` / `continuous` / `jumps` | | The strings in 2.1.6. |
| `branches-walk-detail` | `p.muted` | | One sentence (2.1.6). |
| `branches-readout` | `div.readout` | | Section 4.4 format. |
| `branches-ex-*` | explainer `branches-ex` | | Table `#branches-ex-table`, footer `#branches-ex-same` (`data-agree`). |
| `branches-stairs-*` | staircase `branches-stairs` | | `#branches-stairs-arg`, `-set`, `-window`, `-list`, rows `#branches-stairs-k<k>` (buttons). |
| `branches-pick` | `p`, `aria-live="polite"` | | Which root the picked step gives (2.1.6). |
| `branches-surface` | `div` made the 3D view by `createView3D` (`view.id === 'branches-surface'`) | aria-label "3D view of the Riemann surface of the n-th root" | Orbit, zoom, Reset view (all built in). |
| `branches-surface-legend` | `div` | | Colour bar `hiddenRampCss()` with a border, label "Colour is Re w". |
| `branches-load-2-4-1` | `button.btn` | "Set up problem 2.4.1" | `applyProblem()`: seam 0, n 3, z = -1 (5.A.11). |
| `branches-answer-toggle` | `button.btn`, `aria-expanded`, `aria-controls="branches-answer"` | "Show the answer" / "Hide the answer" | Toggles `#branches-answer`. |
| `branches-answer` | `div`, `hidden` until opened | | `problemById('2.4.1').answer.tex` in `.tex-scroll` (display), then `answer.text`, then the two route bars (`.br-routes`, tones cart and polar). |
| `branches-link-*` | `a.station-link` | titles as in 4.6 | Section 4.6. |

#### 2.1.4 Pointer, touch and keyboard

- **Dot z.** Pointer: drag (mouse, touch, pen) through `createPlane`; the hit area is at least 32 px (44 px on coarse
  pointers). Keyboard: the focused handle moves with the arrow keys. The zoom buttons and the wheel (`wheel: 'focus'`) work
  as in the plane widget; the page scrolls normally on touch outside the handle.
- **Seam.** Chips and slider as above. The seam is not draggable on the canvas (a ray is hard to grab on a phone); the
  slider is the control.
- **Walks.** Buttons only. A pointer or key move of z cancels a running walk (status back to `No walk yet...`). Seam
  and n changes also cancel it.
- **Staircase rows.** Buttons with roving focus (the widget): arrow Up/Down, Home, End move; Enter or Space picks.
- **3D view.** The built-in controls (drag to orbit, wheel after focus, pinch, arrow keys when the view has focus).
- **Tab order.** Header links, seam chips, seam slider, n slider, handle z (plane first, then its zoom buttons), the w-plane
  zoom buttons, walk buttons, staircase rows (the explainer is not focusable), 3D view, problem buttons, links.

#### 2.1.5 Empty, loading, error states

| State | What the student sees |
|---|---|
| Loading | The router shows its own `Loading...` after 150 ms. The station mounts synchronously, so nothing station-specific is shown while loading. |
| z at 0 | Readout `... z = 0; z^(1/3) on this branch = 0 (the branch point: all 3 roots meet here)`. The z-plane draws no ray or arcs, the staircase shows its "not defined" state, the w-plane shows only the wedge and a dot at 0, the explainer's `eq` row says `At z = 0 the three roots meet in 0. This is the branch point.` and the other cells are empty. |
| No WebGL | `createView3D` prints its own message in `#branches-surface`; `view.unavailable` is true. Everything else works (the surface panel keeps its caption and adds: `The flat pictures above show the same thing.`). |
| `z` far out (|z| > 2) | The 3D markers, fibre and floor marker are hidden and the caption line under the 3D view says `z is farther out than the surface drawn here (radius 2).` |
| Seam passes over z | Note (3.5 s, `aria-live`): `The seam just passed over z, so the branch switched to the next root.` |
| Walk running | Status `walking...`, detail `The ring is the test point. Your own point z stays where you left it.` |
| Reduced motion | The walk jumps to its end state (status final at once). |
| Station error | The router's under-construction panel (not this station's job). |

#### 2.1.6 Copy (exact strings; plain, for the night before a test)

`n` below is the current root; `rootName(n)` is `square`, `cube`, `fourth`, `fifth`; `fractionName(n)` is `half`, `third`,
`quarter`, `fifth`. Prose with exponents goes through `prose(el, text)`.

| Place | Text |
|---|---|
| Lede (`.station-lede`; `ledeText(n)`, rewritten when the root slider moves) | `The ${rootName(n)} root has ${countName(n)} values at every point. A branch picks one of them at every point. You cannot pick without a jump all the way around 0, so every branch has a seam: a ray where the pick must jump. Move the seam and see where the jump is.` (`countName(n)`: `two`, `three`, `four`, `five`; at n = 3 this is the sentence the design first had.) |
| Controls group label | `Where do you put the seam?` |
| Chips | `Principal: negative real axis` / `Positive real axis` / `Negative imaginary axis` |
| Sliders | `Seam angle` / `Root (n)` |
| Seam note, cut on the negative real axis (seam = -pi or pi) | `The seam is the negative real axis. Walk across it and the value jumps.` |
| Seam note, otherwise | `The negative real axis is inside the window, not on its edge, so the value is continuous at every point of it.` |
| Seam note extra, seam = pi exactly | ` The window is (pi, 3pi]: the same cut as at the far left, but this is the next of the ${n} branches. Turning the seam once around 0 changes the branch.` |
| Seam passed over z | `The seam just passed over z, so the branch switched to the next root.` |
| z-plane caption | `z-plane (input). Drag the dot. The dashed ray is the seam. The solid arc is the one angle this branch uses (the chosen theta). The faint arcs are the other names of the same angle: together they are the set arg z.` |
| w-plane caption | `w-plane (output). The shaded wedge is where this branch can land: one ${fractionName(n)} of a turn. Solid edge: included. Dashed edge: not included. ` + `Grey dots: the other ${n - 1} roots of z.`; at n = 2 (one other root) `Grey dot: the other root of z.` (pure `wCaptionText(n)`, test T15) |
| z-plane drawn text, top left | line 1 `window (` + `fmtAngle(seam, {unicode:true})` + `, ` + `fmtAngle(seam + 2pi, {unicode:true})` + `]`; line 2 `also ` + the two neighbouring names of the angle (beta - 2pi, beta + 2pi, decimals or exact) |
| Chosen-angle label | `θ = ` + `fmtAngle(beta, {unicode:true})` |
| Walk buttons | `Walk along the negative real axis` / `Walk across the negative real axis` |
| Walk status | idle `No walk yet. Press a walk button.`; running `walking...`; `continuous`; `jumps at the negative real axis`; `jumps at the seam` |
| Walk detail, idle | `Along: from -2 to -0.5 on the axis. Across: from -1 + 0.5i down to -1 - 0.5i.` |
| Walk detail, running | `The ring is the test point. Your own point z stays where you left it.` |
| Walk detail, continuous | `Largest step between neighbouring samples: ${maxStep}. The value moves smoothly. The readout follows the test point; drag z to take it back.` |
| Walk detail, jumps | `The value leaps by ${maxStep} between two neighbouring samples: from one root to the next. The readout follows the test point; drag z to take it back.` |
| Explainer title | `The root of z, worked two ways` |
| Explainer row labels | `z`, `the equation`, `all ${n} roots`, `this branch`, `check: w to the ${n}` |
| Staircase caption (under it) | `The whole list is the set arg z: every name of the angle of z. The shaded row is the one this branch uses. It is Arg z only when the window is (-π, π].` (The pick line under the list says "Click a step to see the root it gives.") |
| Staircase set line (the widget's `.stair-set`) | `arg z = { <home> + 2πk : k is any integer }` for **every** seam. The widget names the set after its home row, so with a seam other than -pi it would say `θ = { ... }`; the station rewrites a leading `θ` of that line (and of the crossing note, "The set arg z did not move") to `arg z` after each update, until `staircase.js` takes a separate `homeLabel` (Appendix C, request 1). The home row says `Arg z = ...` at seam -pi and `θ = ...` otherwise. |
| Pick, nothing picked | `Click a step to see the root it gives.` |
| Pick, picked | `Step k = ${k} is ${angle}. It gives the root ${cart}, root number ${j} of ${n}. Steps k and k + ${n} give the same root.` (k = 0: `Step k = 0 is the angle this branch uses. It gives this branch's value ${cart}.`) |
| Surface panel title | `The ${n} sheets of the ${rootName(n)} root` |
| Surface caption | `Height is Im w and colour is Re w. Going once around 0 takes you to the next sheet; going ${n} times brings you home. The beads over z are the ${n} roots of z, drawn through the sheets so that you see them all; the large one is this branch's value. The two curves on the surface are the edges of this branch's window over the seam: it starts at the dashed one and ends on the solid one. The short vertical line joins them: when z crosses the seam, the branch has to jump along it.` |
| Surface far-out line | `z is farther out than the surface drawn here (radius 2).` |
| Surface no-WebGL line | `The flat pictures above show the same thing.` |
| Problem panel title | `Problem 2.4.1` |
| Problem hint | `Before you press anything: where would you put the seam so that the negative real axis is not on it? Then press the buttons to check.` |
| Problem buttons | `Set up problem 2.4.1` / `Show the answer` / `Hide the answer` |
| Route bar headings | `In x and y (Cartesian)` / `In r and theta (polar)`; bodies `problem.routes.cart` / `problem.routes.polar` through `prose()`. The bars are inside `#branches-answer`: the polar route states the whole answer (the window 0 < theta < 2pi and f(-1) = e^{i pi/3}), so they appear with it, under the formula, and not above the hint (fix round 2, item 5). |
| Station links | the four links of 4.6 |

### 2.2 `graph4d`

#### 2.2.1 Wireframe, desktop

```
+------------------------------------------------------------------------------------------+
| The 4D Graph                                                                (h1)         |
| ( T2 ) ( T3 )                                                                            |
| The graph of w = f(z) has four coordinates: x, y, u, v. ...                              |
+------------------------------------------------------------------------------------------+
| #graph4d-grid (.two-planes)                                                              |
| +----------------------------------+  +------------------------------------------------+ |
| | #graph4d-view  (3D, 4:3)         |  | .panel #graph4d-controls                       | |
| |                                  |  | Function                                       | |
| |      (surface with viridis       |  | (z^2) (sqrt z, both roots) (z^(1/3), all roots)| |
| |       colour, wire, axes)        |  | (1/z) (e^z)                                    | |
| |                      [Reset view]|  | Other shadows                                  | |
| |                                  |  | ( Modulus landscape ) ( Riemann sphere )       | |
| |  hint ...                        |  | uv angle  [==o=======]  0 deg                  | |
| +----------------------------------+  | yv angle  [o=========]  0 deg                  | |
|                                       | [ Spin ]  [ Angles to 0 ]                      | |
|                                       | readout: showing (x, y, u) with v as colour;.. | |
|                                       | axes: Right is x. Away is y. Up is u. Colour v.| |
|                                       | legend: [purple----green----yellow]            | |
|                                       | note (function note, prose)                    | |
|                                       +------------------------------------------------+ |
+------------------------------------------------------------------------------------------+
| .two-planes                                                                              |
| +--------------------------------+  +----------------------------------------------+     |
| | domain plane "graph4d-plane"   |  | explainer "graph4d-ex": z, what f does,      |     |
| | probe handle z, domain box     |  | w = f(z), other roots, the point of the graph|     |
| +--------------------------------+  +----------------------------------------------+     |
+------------------------------------------------------------------------------------------+
| .panel #graph4d-strokes   Shapes from the Lab: 3.   [ Show them on the graph ]           |
+------------------------------------------------------------------------------------------+
| nav.station-links                                                                        |
+------------------------------------------------------------------------------------------+
```

Phone: one column in the order header, 3D view (358 x 268), controls (chips wrap, sliders stack label above range),
readout, axes line, legend, note, domain plane (358 x 358), explainer (stacked cells), strokes panel, links.

#### 2.2.2 Controls

| Id | Element | Visible label | Behaviour |
|---|---|---|---|
| `graph4d-fn-sq` | `button.chip`, `aria-pressed` | `z²` | `setFunction('sq')`; moves the sliders to the preset's angles (table below); keeps the current mode. Default on load. |
| `graph4d-fn-sqrt-all` | `button.chip` | `√z, both roots` | `setFunction('sqrt-all')` |
| `graph4d-fn-cbrt-all` | `button.chip` | `z^(1/3), all roots` | `setFunction('cbrt-all')` |
| `graph4d-fn-recip` | `button.chip` | `1/z` | `setFunction('recip')` |
| `graph4d-fn-exp` | `button.chip` | `e^z` | `setFunction('exp')` |
| `graph4d-landscape` | `button.chip`, `aria-pressed` | `Modulus landscape` | `setMode('landscape')`, or back to `graph` if already on. Readout contains `|w|`. |
| `graph4d-sphere` | `button.chip`, `aria-pressed` | `Riemann sphere` | `setMode('sphere')`, or back to `graph`. |
| `graph4d-uv` | `input[type=range]`, `min=0 max=6.283185307179586 step=any value=0` | `uv angle` | `input`: `setAngles({uv: snapAngle(v)})`; switches the mode back to `graph`. |
| `graph4d-uv-value` | `output` | | `deg + '°'`, for example `90°`. |
| `graph4d-yv` | `input[type=range]`, same range | `yv angle` | same, for yv. |
| `graph4d-yv-value` | `output` | | |
| `graph4d-spin` | `button.btn`, `aria-pressed` | `Spin` / `Stop spinning`; under reduced motion `Turn 45 degrees` | Starts a continuous uv rotation (16 s per turn); under reduced motion each press adds 45 degrees. Returns to `graph` mode. |
| `graph4d-angles-reset` | `button.btn` | `Angles to 0` | uv = yv = 0, stops spinning, returns to `graph` mode. |
| `graph4d-readout` | `div.readout` | | Section 4.4. |
| `graph4d-axes` | `p` | | One sentence naming the axes and the colour (copy below). |
| `graph4d-legend` | `div` containing `#graph4d-legend-bar` (a `div` with `background: hiddenRampCss()` and a 1 px `--border-strong` border) or `#graph4d-legend-wheel` (a canvas from `drawColorWheel`, size 72), and `#graph4d-legend-text` | | Which legend shows depends on the mode. |
| `graph4d-note` | `p` | | The function's `note` (from `fnById`, through `prose()`) plus the preset hint (copy below). |
| `graph4d-view` | `div` made the 3D view | aria-label `3D view of the graph of w = f(z)` | Built-in controls. |
| `graph4d-plane-z` | plane handle of plane `graph4d-plane` | `z` | The probe. Drag or arrow keys. Not snapped. |
| `graph4d-ex-*` | explainer `graph4d-ex` | | `#graph4d-ex-table`, footer `#graph4d-ex-same`. |
| `graph4d-strokes` | `div.panel` | | Section 2.2.5. |
| `graph4d-strokes-toggle` | `button.btn`, `aria-pressed` | `Show them on the graph` / `Hide them` | Shows or hides the lifted curves. Absent when there are no strokes. |
| `graph4d-link-*` | `a.station-link` | | Section 4.6. |

**Preset angles** (a preset sets the function and these angles, uv then yv; the current mode, graph, landscape or sphere, is kept):

| Preset | uv | yv | Why |
|---|---|---|---|
| `sq` | 0 | 0 | The Re surface, the saddle x² - y². |
| `sqrt-all` | 90° | 0 | Shows `(x, y, -v)`: the Im surface, where the sheets stack without crossing. |
| `cbrt-all` | 90° | 0 | The three sheets stack like a spiral staircase. |
| `recip` | 0 | 0 | The pole shows as a wall. |
| `exp` | 0 | 0 | The Re surface e^x cos y. |

#### 2.2.3 Pointer, touch and keyboard

- 3D view: drag to orbit, pinch to zoom, arrow keys when it has focus, `0` or Reset view (all built in). The wheel zooms only
  after the view has focus (so the page still scrolls on a phone).
- Sliders and chips: native. Slider arrow keys move 1 percent of the range.
- Probe handle: drag or arrow keys; the marker beads in the 3D view follow.
- No hit testing on the 3D canvas (nothing is clickable in it).

#### 2.2.4 Empty, loading, error states

| State | What the student sees |
|---|---|
| No WebGL (`view.unavailable`) | The view's own message. The axes line says `The 3D picture needs WebGL, and your browser has it switched off. The point and the numbers below still work.` All controls still work and update the readout and the probe numbers; nothing is drawn in 3D. |
| Pole (1/z, probe at 0) | Explainer `w` row: `f is not defined at 0 (the pole)`; probe beads hidden. |
| Clamped vertices | Drawn grey (library behaviour). The legend text for `recip` says `Grey is where |u| or |v| passes 3 and the picture is cut off.` |
| Probe outside the drawn domain | Allowed. The beads are drawn anyway if finite; the domain box on the plane shows where the mesh ends. |
| No strokes | Strokes panel text: `No shapes from the Lab yet. Draw something in the Lab and come back: it will appear here as a curve on the graph.` and a link `#lab`. |

#### 2.2.5 Strokes panel copy

- N is the number of shapes the Lab has (one per entry of `lab.strokes`), not the number of curves. With strokes and nothing left out: `The Lab has ${N} shape${N === 1 ? '' : 's'}. They are drawn on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used.`
- With some left out (M drawn): `The Lab has ${N} shapes. ${M} of them ${M === 1 ? 'is' : 'are'} drawn on the graph as curves in 4D: ... principal root is used. Left out: 1 grid (grids stay in the Lab); 2 more shapes (the graph keeps at most 20 shapes and 4000 points); 1 shape that cannot be drawn here.` (each clause only when its count is not 0)
- Nothing drawable: `The Lab has 1 shape. It cannot be drawn on the graph. Left out: ...` (`None of them can be drawn on the graph.` for N > 1).
- Without any: the empty-state text above.

#### 2.2.6 Copy (exact strings)

| Place | Text |
|---|---|
| Lede | `The graph of w = f(z) has four coordinates: x, y, u, v. You can only see three at a time, so one of them is painted as colour. The two sliders turn the whole graph inside 4D. Every other picture on this site is one shadow of this one object.` |
| Function group label | `Function` |
| Mode group label | `Other shadows` |
| Slider help (under the two sliders, `.muted`) | `uv turns u into v: at 90 degrees the Re surface becomes the Im surface. yv turns y into v: at 90 degrees input and output swap roles.` |
| Axes line, graph mode | `Right is x. Away is ${y'}. Up is ${u'}. Colour is ${hidden}.` where the three names come from `shownNames` (6.6); y' is `y` unless yv is not 0 |
| Axes line, landscape | `Right is x. Away is y. Up is |w|. Colour is the angle of w.` |
| Axes line, sphere | `The point on the sphere is z, with infinity at the top. Colour is w.` |
| Mode note (landscape or sphere) | `Move a slider to go back to the 4D graph.` (appended to the axes line) |
| Legend text, graph mode | `Colour is the hidden coordinate (${hidden}): purple is negative, green is 0, yellow is positive.` |
| Legend text, `recip` extra | ` Grey is where |u| or |v| passes 3 and the picture is cut off.` |
| Legend text, landscape | `Height is |w|. Colour is the angle of w: the same hues as the wheel.` |
| Legend text, sphere | `${DOMAIN_LEGEND.short} Each point of the sphere is painted with the colour of f at that point.` |
| Note, `sq` | `${note} One smooth surface. At uv = 90 degrees it is the saddle of 2xy, upside down, instead of x² - y².` |
| Note, `sqrt-all` | `${note} Both roots are drawn. At uv = 0 the two sheets pass through each other along the negative real axis. Set uv to 90 degrees: they stack like a spiral staircase and no longer cross. Walk once around the middle and you end up on the other sheet.` |
| Note, `cbrt-all` | `${note} All three roots are drawn. At uv = 0 two of the sheets cross along the negative real axis. Set uv to 90 degrees: the three sheets stack like a spiral staircase and no longer cross. Three laps around the middle bring you home.` |
| Note, `recip` | `${note} The pole at 0 runs off to infinity, so the middle is cut off. Try the Riemann sphere: there the pole is just a point.` |
| Note, `exp` | `${note} As y goes up, (u, v) goes round a circle of radius e^x, so the graph winds like a helix.` |
| Probe panel hint (above the plane, `.muted`) | `Drag z. The beads on the graph are the point (x, y, u, v) over it.` |
| Explainer title | `One point of the graph, two addresses` |
| Explainer row labels | `z`, `what f does`, `w = f(z)`, `the other roots` (only for the root presets), `the point of the graph` |
| Strokes panel title | `Shapes from the Lab` |

---

## 3. Visual encoding

Tokens only. No literal colour appears in station code. Canvas colours are read at draw time through
`cssColor('--token')` (exported by `plane.js`) or through the drawing helpers, which re-read them on `themechange`; the 3D
objects follow the theme by themselves. Both themes use the same code. Colour is never the only cue: each row also names a
shape or a line style.

### 3.1 `branches`, z-plane (input side)

| Element | Token and shape | Notes for both themes |
|---|---|---|
| Plane grid | `grid: 'polar'`: circles and rays in `--polar` at low alpha (plane widget) | The window and the seam are angle ideas, so the polar grid is the native one. |
| Axes and tick labels | `--cart` (plane widget) | The real axis is both a Cartesian axis and, for the principal branch, the seam. |
| Seam (cut) | `--seam`, 2.5 px, `DASH.seam`, label `seam`. Drawn over a 7 px `--surface` stroke along the same ray, so the axis line is **erased** under the dashes: the cut looks cut. | The negative real axis keeps its solid axis line when it is not the seam (acceptance A3). |
| Point z | the plane's handle: filled `--input` dot with halo, DOM label `z` | z is drawn once. |
| Ray 0 to z | `--polar`, 2 px solid | "Walk r." |
| **Chosen angle** | `--polar`, 3 px solid arc from angle 0 to beta (clockwise when beta < 0) at radius 24 px, label `θ = <beta>` (`--polar`, weight 600, 3 px `--surface` halo). The label is placed by `chooseLabelSpot` (5.A.5): at the middle of the angle, 8 px outside the arc, unless that box touches the ray, the handle's dot, the handle's label `z` or a tick label; then 0.4 and 0.8 rad either side along the arc, then the same angles outside all three arcs, then inside the arc. It is drawn with `drawLabel`, which records it in the plane's label frame, so the plane places the `seam` label (last) around it. | The one highlighted step. It is Arg z only when the window is (-pi, pi]. |
| Other names of the angle (set arg z) | `--polar`, 1.5 px arcs from 0 to beta - 2pi and beta + 2pi, radii 33 px and 42 px (ordered by absolute size, shortest inside), alpha `--ghost-alpha` (0.35); no labels | Their values are the second line of the top-left text and the staircase list. |
| Top-left text | `--text-muted`, 12 px: `window (a, b]` and `also c, d` | |
| Walk path | `drawTimedCurve`, `--input`, time ramp `--t0` to `--t1` (dark to bright), dots at t = 0, 1/4, 1/2, 3/4, arrowhead at the end | Revealed progressively while walking; complete afterwards. |
| Walker (test point) | hollow ring: 2.5 px `--input` stroke, `--surface` fill, radius 6 | A ring, not a dot, so it is never taken for the draggable z. |

### 3.2 `branches`, w-plane (output side)

| Element | Token and shape | Notes |
|---|---|---|
| Wedge | polygon from 0 over angles (sigma/n, sigma/n + 2pi/n], radius 6 (clipped by the canvas), fill `--output` at alpha 0.14 | "A third of a turn" for n = 3. |
| Closed edge (angle sigma/n + 2pi/n) | `--output`, 2.5 px solid | Included (the value of a point **on** the seam lands here). |
| Open edge (angle sigma/n) | `--output`, 2 px, `DASH.excluded` | Not included. Same convention as `sets`. |
| Other wedge boundaries (the n - 1 other seams of the partition) | `--seam`, 1 px, `DASH.guide` | The plane is split into n equal fans; each branch lands in one. |
| Other roots of z | `--text-muted` dots, radius 3.5 | The n - 1 values this branch did not choose. |
| Value w | `--output` dot, radius 6, label `w`; its polar address by `drawPolarAddress(..., { name: 'w' })` in `--polar` (ray, arc, `r = ...`, `Arg w = ...`) | Arg w is the principal angle of w; the readout gives the chosen angle theta/n separately. |
| Picked root (from the staircase) | `--polar` ring, radius 10, around the chosen root | |
| Walk image | `drawTimedCurve`, `--output`, same time ramp; one curve per continuous piece | The image uses the identical ramp so "when" matches "where". |
| Jump chord | `--danger`, 2 px, `DASH.guide`, label `jump` at its midpoint | Only when the walk jumps and only after the walker has passed the jump. |
| Walker value | hollow ring, `--output`, radius 6 | |

### 3.3 `branches`, 3D surface

| Element | Encoding |
|---|---|
| Surface (`riemannSurfaceRoot({ n, rMax: 2, nr: 24, nTheta: 48, part: 'im' })`) | Height = Im w, colour = Re w on the viridis ramp (data colours, identical in both themes), wire in `--text-muted` (library). Legend: a bar with `hiddenRampCss()` and a 1 px `--border-strong` border, text `Colour is Re w: purple is negative, green is 0, yellow is positive.` (the dark end is low contrast on a dark surface, hence the border). |
| Floor grid and axes | `grid: 'polar'` (`--polar`), x and y axes `--cart`, height axis `--text-muted`, axis labels `x`, `y`, `Im w`. |
| Seam on the floor | dashed thin tube from 0 to 2 at angle sigma, `--seam`, radius 0.011 (render order 2, under the edges). |
| Window edges | two tubes over the seam: at unwrapped angle sigma (the start of the window: **dashed**, 4 samples on, 3 off) and at sigma + 2pi (the end: **solid**), heights t^(1/n) sin(sigma/n) and t^(1/n) sin((sigma + 2pi)/n), `--output` (the colour of the branch's wedge on the w-plane, which is dashed there at the same edge), radius 0.016. Dashed = not included, solid = included, as on the w-plane. |
| The jump | a short `--danger` tube at the rim (t = 2) joining the two edge end points; zero-length (skipped) when the two heights are equal. |
| The point z on the floor | marker, `--cart`, radius 0.08 (z drawn once, in the Cartesian colour, as in the helix) |
| Fibre | thin tube over z, `--text-muted`, radius 0.009, from the lowest to the highest bead. |
| The n beads (roots of z) | marker radius 0.11 `--output` for this branch's value (k = 0), radius 0.08 `--text-muted` for the others. |
| Depth | The sheets are opaque and the other beads, the floor marker, the fibre and the edges sit behind or inside them, so **all of the above are drawn with `depthTest = false`**, `depthWrite = false` and a render order after the surface (floor line 2, edges and fibre 3, jump and floor marker 4, beads 5, this branch's bead 6). A WebGL line is one pixel wide, which is why the lines are thin tubes (`tubeLine`, `MeshBasicMaterial`, `TubeGeometry`). They show through the sheets on purpose: they are annotations of where things are over z, not objects on a sheet. |

### 3.4 `graph4d`

| Element | Encoding |
|---|---|
| 4D graph meshes | Position = three of the four rotated coordinates; colour = the fourth on the viridis ramp (value 0 is the middle, teal); wire in `--text-muted`; clamped vertices are mixed with neutral grey (library). |
| Axes and floor | `grid: true` (Cartesian, `--cart`), axes `--cart` for x and y, `--text-muted` for the height axis; labels `x`, `y`, `h`. |
| Probe beads | marker `--text` for the principal value, `--text-muted` for the other roots; radius 7 px and 5.5 px **on screen** (the marker has radius 1 and is scaled by `pxUnit`, the world size of one CSS pixel at the camera target, measured each time the view is framed); one set of beads per probe, drawn once per value. **Depth rule (fix round 2, item 1):** the sheets and the sphere are opaque, so every bead is drawn with `depthTest = false`, `depthWrite = false`, `transparent = true` and a render order after the meshes (5 for the other roots, 6 for the principal value): all the roots show in the 3D picture whatever lies in front, as the beads of the `branches` surface do (3.3). `createBead(k)` builds one (test G15). In sphere mode a bead on the far hemisphere is drawn at 40 percent opacity (`onBeforeRender`: the dot product of its position with the camera position is less than its squared length), so that it reads as "behind" although nothing hides it. |
| Lab strokes | lines in `--input` (they are z-plane strokes lifted onto the graph). |
| Modulus landscape | `modulusLandscape`: height = |w|, hue = Arg w with the library's `argColor` (same hue convention as the domain-colouring wheel). Legend: `drawColorWheel` (size 72) and the text in 2.2.6. |
| Riemann sphere | `riemannSphere()` graticule and labels (`--polar` parallels and meridians, `--cart` real and imaginary great circles, infinity marker at the top), its translucent body hidden, plus one coloured sphere mesh: colour = domain colouring of f (`colorOf(w, out, false)`: hue = Arg w, brightness = |w|). The flat floor grid and axes are hidden in this mode. |
| Domain plane | `grid: 'cart'`, probe handle `--input`, domain box (the rectangle the mesh covers) as a `--input` dashed outline (`DASH.guide`), the probe's Cartesian address (drop lines, `--cart`) and polar address (ray and arc, `--polar`), and for the root presets the seam (negative real axis, `--seam`, `drawSeam`) because the principal root jumps there. |
| Explainer | the shared two columns: `--cart` left, `--polar` right. |

### 3.5 arg versus Arg, input versus output, time

- **arg versus Arg.** In `branches` the solid arc, the staircase's shaded row, the readout field `chosen theta` and the
  w-plane's `Arg w` are four views of the same choice; `Arg z` appears by name in the readout and, with the principal
  window, as the staircase's home row. The faint rings and the staircase list are the set arg z. The staircase label is
  `arg z` (so its home row reads `Arg z = ...`) only when the seam is exactly -pi; otherwise it is `θ` (so it never claims
  that a step outside (-pi, pi] is Arg z). The set line over the list says `arg z = { ... }` in both cases (the set does not depend on the seam; only the
  chosen step does), and the z-plane caption names the faint arcs as the set arg z. In `graph4d` the probe row says `θ = Arg z` and the root rows say
  `φ = Arg z / n` for the principal root and `φ + 2πk/n` for the others.
- **Input versus output.** z-plane strokes and the handle are `--input`, w-plane strokes and the value dot are `--output`.
  The z-plane is on the left (top on a phone) and labelled `z-plane (input)`; the w-plane `w-plane (output)`.
- **Time.** Walk paths and their images carry the same `--t0` to `--t1` ramp, with quarter dots and an arrowhead.

---

## 4. Module API

### 4.1 Files

| File | Contents |
|---|---|
| `js/stations/branches.js` | `mount`, pure helpers (4.2). Imports: `../core/complex.js`, `../core/plane.js`, `../core/three-view.js`, `../core/staircase.js`, `../core/explainer.js`, `../core/katex.js`, `../data/problems.js`. **No top-level DOM access**, so Node can import the file for the unit tests. |
| `js/stations/graph4d.js` | `mount`, pure helpers (4.3). Imports: `../core/complex.js`, `../core/plane.js`, `../core/three-view.js`, `../core/explainer.js`, `../core/katex.js`, `../core/domaincolor.js`, `../core/shapes.js`, `../data/functions.js`. No top-level DOM access. |
| `tests/unit/i1-station-branches-graph4d.test.mjs` | Section 7.2. |
| `tests/interact/i1-station-branches-graph4d.mjs` | Section 7.3. One script for the three routes `branches`, `graph4d`, `problem-2-4-1`; it branches on `ctx.route`. |

### 4.2 `js/stations/branches.js`

```js
export const SEAM_CHIPS = Object.freeze({ principal: -Math.PI, positive: 0, negimag: -Math.PI / 2 });
export const DEFAULT_Z = Object.freeze({ re: -1, im: 0.5 });   // opening point
export const PROBLEM_Z = Object.freeze({ re: -1, im: 0 });     // the point of problem 2.4.1
export const WALK_N = 60;            // segments: a walk has WALK_N + 1 = 61 samples (acceptance A5: at least 40)
export const WALK_MS = 1600;         // animation time of a walk (acceptance A2 polls for 3 s)
export const JUMP_FRACTION = 0.5;    // a walk "jumps" iff max |step| > JUMP_FRACTION * max |value|

export function seamFromSlider(v)    // number -> number in [-pi, pi]. Clamps; within 0.02 of -pi, -pi/2, 0, pi/2 or pi returns that EXACT value
                                     //   (Chromium rounds a step="any" range value to 15 digits, so exact seams only ever come from here); non-finite -> -pi
export function windowText(seam)     // '(' + fmtAngle(seam) + ', ' + fmtAngle(seam + 2pi) + ']'   e.g. '(-pi, pi]', '(0, 2pi]', '(1, 7.283]'
export function magnetZ(z, scale)    // pointer-drag snap. scale = pixels per unit (plane.getView().scale). Each coordinate goes to the nearest
                                     //   multiple of 0.05 (computed as Math.round(v / 0.05) / 20 + 0, never -0) when it is within
                                     //   min(0.02, 3 / max(scale, 1)) of it; otherwise it is returned unchanged.
export function walkPoints(kind, N = WALK_N)
                                     // 'along'  -> z_k = {re: -2 + 1.5 k/N, im: 0}                 (-2 -> -0.5 on the negative real axis)
                                     // 'across' -> z_k = {re: -1, im: 0.5 - k/N}                    (-1 + 0.5i -> -1 - 0.5i, crossing at k = N/2)
                                     // k = 0..N, so N + 1 plain {re, im} points; any other kind -> 'along'
export function classifyWalk(points, values)
                                     // values[k] = branch value at points[k]. Over consecutive pairs (finite values only):
                                     //   maxStep = max |values[k+1] - values[k]|, at = that k;  maxAbs = max |values[k]|
                                     //   jumps = maxStep > JUMP_FRACTION * maxAbs
                                     // -> { jumps, maxStep, maxAbs, at: jumps ? at : -1, where }
                                     //   where = null unless jumps; else the midpoint m of points[at], points[at + 1]:
                                     //   'negative real axis' if |m.im| < 0.02 and m.re < 0, else 'seam'
export function branchAt(z, n, seam)
                                     // z = 0 (|z| < 1e-9): { has: false, z, n, seam }
                                     // else { has: true, z, n, seam, r: |z|, beta: branchArg(z, seam), w: branchRoot(z, n, seam),
                                     //        rho: r^(1/n), phi: beta / n, roots: [fromPolar(rho, (beta + 2 pi k) / n) for k = 0..n-1], argz: Arg(z) }
export function polarText(rho, phi)  // 'e^(i pi/3)', '1.038 e^(i 0.893)', 'e^(-i 1.031)', '2': coefficient dropped when fmtNum(rho) is '1';
                                     //   the angle part dropped when fmtAngle(|phi|) is '0'; angle through fmtAngle (exact pi form when it exists)
export function readoutText(model)   // section 4.4
export function staircaseLabel(seam) // 'arg z' when |seam + pi| < 1e-9, else the single character 'θ' (U+03B8)
export function negAxisStatus(seam)  // 'edge' when | |seam| - pi | < 1e-9, else 'inside'
export function wedgeOf(seam, n)     // { from: seam / n, to: seam / n + 2 pi / n }
export function powerParts(n)        // { re, im }: TeX of Re (u + iv)^n and Im (u + iv)^n, n = 2..5 (binomial expansion, section 6.2)
export function rootName(n)          // 'square' | 'cube' | 'fourth' | 'fifth' (other n: n + '-th')
export function fractionName(n)      // 'half' | 'third' | 'quarter' | 'fifth'
export function seamNote(seam, n)    // the steady sentence of 2.1.6 (cut on the axis / inside the window, plus the extra for seam = pi)
export function countName(n)         // 'two' | 'three' | 'four' | 'five' (other n: String(n))
export function ledeText(n)          // the lede of 2.1.6 in the words of the chosen root
export function chooseLabelSpot({ O, Z, th, rPx, width, avoid })   // 5.A.5: { x, y, align } for the chosen-angle label
export function labelObstacles(toPixel, Z)   // 5.A.5: the rectangles the label keeps clear of (the handle's dot, its label `z`, the tick labels), in pixels
export function wCaptionText(n)      // the w-plane caption of 2.1.6 (one grey dot at n = 2)
export function mount(el, ctx)       // -> unmount(); may be sync
```

Data structures (private to `mount`):

```js
state = {
  seam, n,                              // numbers
  z,                                    // {re, im}: the handle's z (updated from onDrag), the truth for the handle
  focus: 'handle' | 'walker',           // which point the readout, explainer, staircase, arcs and 3D follow
  walk: { kind: 'along' | 'across' | null, state: 'idle' | 'walking' | 'continuous' | 'jumps',
          pts: [{re, im}], vals: [{re, im}], cls: null | classifyWalk result, t: 0..1, startMs, raf: 0 },
  pick: null | integer,                 // staircase row k picked, or null
  noteTimer, jumpNote: '',              // the transient "seam passed over z" sentence
}
```

### 4.3 `js/stations/graph4d.js`

```js
export const FUNC_ORDER = ['sq', 'sqrt-all', 'cbrt-all', 'recip', 'exp'];
export const FUNCS       // { [id]: { id, label, fnId, n, f, x: [x0, x1], y: [y0, y1], nx, ny, clamp, probe: {re, im}, angles: {uv, yv} } }
                         //   fnId = id in data/functions.js: sq -> 'sq', sqrt-all -> 'sqrt', cbrt-all -> 'cbrt', recip -> 'recip', exp -> 'exp'
                         //   n = number of values at each z (1, 2, 3); f = the principal value z -> {re, im} (principalRoot for the root presets)
                         //   sq:       x [-1, 1],        y [-1, 1],   nx 49, ny 49, clamp 6, probe 0.6 + 0.8i
                         //   sqrt-all: x [-2, 2],        y [-2, 2],   nx 49, ny 49, clamp 6, probe -1 + 0.5i
                         //   cbrt-all: x [-2, 2],        y [-2, 2],   nx 49, ny 49, clamp 6, probe -1 + 0.5i
                         //   recip:    x [-2, 2],        y [-2, 2],   nx 50, ny 50, clamp 3, probe 0.6 + 0.8i
                         //   exp:      x [-2.5, 1.2],    y [-pi, pi], nx 49, ny 49, clamp 6, probe 0.5 + 1i
                         //   angles (uv, yv): sq (0, 0), sqrt-all (pi/2, 0), cbrt-all (pi/2, 0), recip (0, 0), exp (0, 0)     (the table in 2.2.2)
                         //   label: 'z²', '√z, both roots', 'z^(1/3), all roots', '1/z', 'e^z'
export function snapAngle(a)       // number -> number: within 0.02 of a multiple of pi/2 returns the exact multiple (k * Math.PI / 2); non-finite -> 0
export function degText(a)         // Math.round(a * 180 / Math.PI) + '°'   (U+00B0), e.g. '90°', '360°'
export function shownNames(uv, yv) // -> { y, u, hidden }: names of the displayed second axis, displayed height and hidden colour coordinate (6.6)
export function readoutText({ mode = 'graph', uv = 0, yv = 0 })   // section 4.4
export function sheetFn(n, k, half)// the sheet function for the all-roots presets (6.7): (z) -> {re, im}; half = 'upper' | 'lower'
export function meshSpecs(id)      // -> [{ f, xRange, yRange, nx, ny, clamp, tag }]: the graph4D calls for preset id (one for single-valued,
                                   //    2n half-plane pieces for the root presets, ny = (FUNCS ny - 1) / 2 + 1 = 25 each); [] for an unknown id
export function totalVertices(id)  // sum of nx * ny over meshSpecs(id)
export function probeValues(id, z) // -> { r, theta, w, wc, rule, wp, agree } (6.8); w = FUNCS[id].f(z), wc = the Cartesian-formula value or null (cube root),
                                   //    rule = { rho, phi }, wp = fromPolar(rule.rho, rule.phi), agree = eq(w, wp, 1e-9) && (!wc || eq(w, wc, 1e-9))
export const STROKE_LIMITS         // { shapes: 20, curves: 80, curvePoints: 400, totalPoints: 4000 }
export function extractShapes(value)    // 5.B.10: any value -> { shapes: [{ kind, curves: [[{re, im}]] }], left: [{ kind, why }], total, points, curveCount }
export function leftOutText(left)       // 'Left out: 1 grid (grids stay in the Lab); ...' or ''
export function strokesPanelText(info)  // the sentence of the strokes panel (2.2.5)
export function createBead(k)           // one probe bead (k = 0: the principal value): a marker of radius 1, no depth test, no depth write, render order 6 (k = 0) or 5
export function probeModelFor(id, z)    // the explainer model of the probe: { id, z, v, defined, others }
export function probeRows(id)           // the explainer rows (pure; a row reads the MODEL, never the id of another preset)
export function liftPoint(f, z, uv, yv, clamp)   // -> [X, Y, H] maths triple of the rotated point, or [NaN, NaN, NaN] when w is not finite or |u| or |v| > clamp
export function sphereColor(f, p, out = [0, 0, 0])   // p = [X, Y, Z] a unit vector in the plane frame; z = inverseStereographic(p); w = f(z) (NaN when z is infinite or f throws);
                                   //    returns colorOf(w, out, false): [r, g, b] 0..255, grey [128, 128, 128] for a non-finite w
export function mount(el, ctx)     // -> unmount()
```

Data structures (private to `mount`):

```js
state = { fn: 'sq', mode: 'graph' | 'landscape' | 'sphere', uv, yv, spinning: false, strokesOn: true, probe: {re, im} }
objects = { group, graphs: [graph4D result], landscape: Mesh | null, sphere: { rs: riemannSphere result, mesh: Mesh } | null,
            beads: [Marker], strokeLines: [Line], dcWheel: canvas | null }
```

### 4.4 Readout formats (plain text, ASCII minus, three decimals; the degree sign U+00B0 is the one non-ASCII character)

`branches` (`#branches-readout`):

```
seam = <fmtAngle(seam)>; window <windowText(seam)>; z = <fmtCart(z)>; z^(1/<n>) on this branch = <polarText(rho, phi)> = <fmtCart(w)>; chosen theta = <fmtAngle(beta)>; Arg z = <fmtAngle(argz)>
seam = <...>; window <...>; z = 0; z^(1/<n>) on this branch = 0 (the branch point: all <n> roots meet here)
```

Examples (exact strings, section 7.2 test T8):

```
seam = -pi; window (-pi, pi]; z = -1; z^(1/3) on this branch = e^(i pi/3) = 0.5 + 0.866i; chosen theta = pi; Arg z = pi
seam = -pi; window (-pi, pi]; z = -1 + 0.5i; z^(1/3) on this branch = 1.038 e^(i 0.893) = 0.651 + 0.808i; chosen theta = 2.678; Arg z = 2.678
seam = 0; window (0, 2pi]; z = -1 - 0.5i; z^(1/3) on this branch = 1.038 e^(i 1.202) = 0.374 + 0.968i; chosen theta = 3.605; Arg z = -2.678
```

`graph4d` (`#graph4d-readout`):

```
graph:      showing (x, <y'>, <u'>) with <hidden> as colour; uv = <degText(uv)>, yv = <degText(yv)>
landscape:  showing (x, y, |w|) with arg w as colour (hue); move a slider to go back to the 4D graph
sphere:     showing the Riemann sphere: the point is z, the colour is w (hue = arg w, brightness = |w|); move a slider to go back to the 4D graph
```

where `shownNames(uv, yv)` gives `y'`, `u'`, `hidden` (6.6): `showing (x, y, u) with v as colour; uv = 0°, yv = 0°` at the start and
`showing (x, y, -v) with u as colour; uv = 90°, yv = 0°` at uv = 90 degrees.

### 4.5 The steady seam note

`seamNote(seam, n)`: when `negAxisStatus(seam) === 'edge'` the first sentence of the table in 2.1.6 (cut on the negative real axis),
and when the seam is exactly pi append the extra sentence; otherwise the "inside the window" sentence. The transient "seam just
passed over z" sentence is appended for 3.5 s after a seam move that changed beta by more than pi (compare `branchArg` before
and after for the focus point).

### 4.6 Header and links

Header (same pattern as the other stations): `header.station-header` holding `h1` = `ctx.station.title`, `p.station-lede`, `div.thread-badges` with one
`span.thread-badge[data-thread = t]` per `t` in `ctx.station.threads` (text `${t} ${title of t in ctx.threads}`), and `div.chips` with one
`a.chip.problem-chip[href = '#' + routeFor(id)]` per `problemsForStation(ctx.station.id)` (text the problem id; `title` = `problem.aha` with each `^{x}` rewritten as `^(x)`, since a
`title` is plain text). `branches` gets the chip `2.4.1`; `graph4d` has no problem chips. The chip of 2.4.1 carries `aria-current="true"` when the 2.4.1 preset is active.

Links: `nav.station-links[aria-label = "Neighbouring places"]` holding `a.station-link[href = '#' + id]` with the ids and texts below. They are **static** lists (the
Story's thread paths), not computed from the registry: the registry also lists the Lab on T2 and T3, which would make the computed T2 successor of `branches` the Lab and hide the
bridge to `graph4d` that the Story promises. Titles come from `ctx.stations` by id; a link whose station is missing is skipped. Every `href` is a route (rule 10.1.1).

```
branches: prev      principal-root  text = its title                                      data-dir="prev"
          next      reciprocal      text = its title                                      data-dir="next"
          graph4d                   text = 'T2 next: ' + title (The 4D Graph)             data-thread="T2"      the same surface in four dimensions
          staircase                 text = 'The Staircase: what is arg versus Arg?'       data-thread="T2"      the hub of Thread 2 (ARCH 5)
graph4d:  prev      lab             text = its title                                      data-dir="prev"
          next      problems        text = its title                                      data-dir="next"
          branches                  text = 'T2 previous: ' + title (Branches and Cuts)    data-thread="T2"      the Riemann surface in 3D, with the seam
          reciprocal                text = 'T3 related: ' + title (1/z and the Sphere)    data-thread="T3"      the sphere, where 1/z is a half-turn
```

Ids: `<station>-link-<target id>`.

### 4.7 Events and lifecycle

Mount order (both stations): build DOM, create widgets, wire controls, apply the preset, first `refresh()`, **then** attach
anything global. These stations attach no `window` or `document` listeners at all (the widgets own their observers), so unmount has
nothing of that kind to remove.

Listeners and handles created, and what `unmount()` does with each:

| Created | `unmount()` |
|---|---|
| plane `zPlane`, `wPlane` (branches) / `plane` (graph4d) | `plane.destroy()` |
| `createExplainer`, `createStaircase` | `destroy()` |
| `createView3D` | remove overlay objects and `disposeObject` them, then `view.dispose()` |
| plane handle callbacks (`onDrag`, `onDragStart`) | removed with the plane |
| chip, slider, button listeners on elements inside `el` | removed with the DOM when the router empties `#view`; additionally set a `disposed` flag that every callback checks first |
| walk loop (`requestAnimationFrame`) | `cancelAnimationFrame(state.walk.raf)` |
| angle coalescing `requestAnimationFrame` (graph4d) | `cancelAnimationFrame` |
| `view.onFrame(cb)` for spin (graph4d) | call the unsubscribe function |
| `ctx.theme.onThemeChange(cb)` | call the unsubscribe function |
| timers (`noteTimer`) | `clearTimeout` |
| `window.__mv.branches` / `window.__mv.graph4d` | `delete` the property (never replace `window.__mv`) |

### 4.8 Test hooks

```js
const mv = (window.__mv = window.__mv || {});
mv.branches = { state() -> { seam, n, z: {re, im}, focus, beta, w, walk: { kind, state, maxStep, at, where }, pick, unavailable } };
mv.graph4d  = { get fn, get mode, get uv, get yv, get spinning,
                get vertexCount,        // sum of mesh.userData.vertexCount of the 4D graph meshes of the current function, in every mode
                get shownVertexCount,   // the vertices of what is drawn now (graph meshes, landscape mesh or sphere mesh)
                get meshCount, get version,
                get strokeCount,        // curves drawn on the graph (a Lab sector is one shape and eight curves)
                get shapeCount,         // shapes the Lab has (the number the strokes panel states)
                get liftedShapeCount,   // shapes drawn on the graph (the rest are named in the panel)
                get unavailable, get probe /* {z, values} */ };
```

`branches` ids that scripts use: `#branches-zplane-z`, `#branches-seam-*`, `#branches-walk-*`, `#branches-readout`. `graph4d` ids:
`#graph4d-fn-*`, `#graph4d-uv`, `#graph4d-yv`, `#graph4d-landscape`, `#graph4d-sphere`, `#graph4d-readout`, `#graph4d-view`.
The 3D views are also in `window.__mv.views3d` under `branches-surface` and `graph4d-view` (library).

---

## 5. Algorithms

Pseudocode is JavaScript-flavoured and meant to be implemented as written. `TAU = 2 * Math.PI`. Every drawing function reads
`state` when it runs (planes redraw on `requestDraw()`), never a copy made at mount. Every DOM write uses `textContent`,
`prose(el, text)` or `tex(el, src)`; never `innerHTML` with text that did not go through one of those. TeX below is shown without `String.raw` (the real code writes every TeX string with `String.raw`, so backslashes survive), uses
`\quad`, `\,` and `\ ` (backslash space) as spacing, and decimals for values (rule 10.4.5: the readout is decimal, so the
explainer shows decimals for the same quantities).

### 5.A `branches`

#### 5.A.1 `mount(el, ctx)`

```
mount(el, ctx):
  disposed = false
  theme = ctx.theme                    // the layer functions below receive the 2D context under the name ctx, so they reach the theme API through this
  init = { seam: -PI, n: 3, z: DEFAULT_Z }
  p = ctx.preset
  if p && p.kind === 'problem' && p.id === '2.4.1':        init = { seam: 0, n: 3, z: PROBLEM_Z }
  else if p && p.kind === 'token' && p.token in SEAM_CHIPS: init.seam = SEAM_CHIPS[p.token]        // #branches-principal | -positive | -negimag
  // anything else (a topic preset, an unknown token) opens the default state

  1. Build the DOM of 2.1.1 inside el (header, controls panel, planes, walks panel, readout, working grid, surface panel,
     problem panel, links). Header: h1 = ctx.station.title; lede; thread badges for ctx.station.threads (class thread-badge,
     data-thread, text from ctx.threads); problem chips from problemsForStation('branches') -> <a class="chip problem-chip"
     href="#" + routeFor(id) title=problem.aha>id</a>.
  2. zPlane = createPlane(zHost, { id: 'branches-zplane', xRange: [-2.5, 2.5], yRange: [-2.5, 2.5], grid: 'polar',
        axisLabels: ['x', 'y'], maxWidth: 520, ariaLabel: 'z-plane, the input. Drag the point z.' })
     wPlane = createPlane(wHost, { id: 'branches-wplane', xRange: [-2, 2], yRange: [-2, 2], grid: 'polar',
        axisLabels: ['u', 'v'], maxWidth: 520, ariaLabel: 'w-plane, the value of the branch.' })
  3. nudging = false                                          // true while the handle is moved by the keyboard (5.A.3)
     zHandle = zPlane.addPoint({ id: 'z', z: init.z, color: '--input', label: 'z', step: 0.1,
        snap: (z) => (nudging ? z : magnetZ(z, zPlane.getView().scale)),
        onDragStart: () => interrupt(),
        onDrag: (z, info) => { state.z = z; if (info.source !== 'api') interrupt(); refresh() } })
     capture-phase keydown listener on zHandle.el sets nudging = true; keyup and pointerdown listeners set it false
  4. zPlane.addLayer(drawZ, { order: 10 }); wPlane.addLayer(drawW, { order: 10 })     // 5.A.5, 5.A.6
  5. ex = createExplainer(exHost, { id: 'branches-ex', title: 'The root of z, worked two ways', rows: rows(init.n), same })   // 5.A.8
     stairs = createStaircase(stairsHost, { id: 'branches-stairs', kMin: -2, kMax: 2, seam: init.seam,
        label: staircaseLabel(init.seam), onPick: (k) => { state.pick = k; refresh() } })
  6. view = createView3D(surfaceHost /* id 'branches-surface' */, { grid: 'polar', gridSize: 6, axisLabels: ['x', 'y', 'Im w'],
        label: '3D view of the Riemann surface of the n-th root' })       // clear any text in surfaceHost first (rule 10.6.2)
     buildSurface()                                                      // 5.A.9
  7. wire: chips, seam slider, n slider, walk buttons, load button, answer toggle (5.A.10, 5.A.11)
  8. state.seam = init.seam; state.n = init.n; state.z = init.z; state.focus = 'handle'; walk idle; pick null
     sync controls (slider.value, outputs, chips aria-pressed), setStatus('idle')
  9. unsubTheme = ctx.theme.onThemeChange(() => { zPlane.requestDraw(); wPlane.requestDraw(); refresh() })
 10. mv.branches = { state }                                            // 4.8
 11. refresh()
 12. return unmount                                                     // 4.7
```

#### 5.A.2 The model and `refresh()`

```
focusZ(): return state.focus === 'walker' ? walkerZ(state.walk) : state.z

refresh():
  if disposed return
  m = branchAt(focusZ(), state.n, state.seam)
  readout.textContent = readoutText(m)
  noteEl.textContent = seamNote(state.seam, state.n) + (state.jumpNote ? ' ' + state.jumpNote : '')
  seamValueEl.textContent = fmtAngle(state.seam, { unicode: true }) + ' (' + Math.round(state.seam * 180 / PI) + '°)'
  seamSlider.setAttribute('aria-valuetext', seamValueEl.textContent)
  nValueEl.textContent = String(state.n)
  ex.update(m)                                        // coalesced by the widget
  stairs.update(m.has ? m.beta : null)                // any representative of the angle is accepted; null at 0
  stairs.setPicked(state.pick)
  pickEl.textContent = pickText(m)                    // copy 2.1.6
  update3D(m)                                         // 5.A.9
  zPlane.requestDraw(); wPlane.requestDraw()
```

`pickText(m)`: if `state.pick === null || !m.has` the "nothing picked" sentence; else with `k = state.pick`, `j = ((k % n) + n) % n`,
`angle = fmtAngle(m.beta + TAU * k)`, `cart = fmtCart(fromPolar(m.rho, (m.beta + TAU * k) / m.n))`: the "picked" sentence of 2.1.6 (the
`k = 0` variant when `k === 0`).

`interrupt()`: if `state.walk.state === 'walking'` then `clearWalk()` (cancels the loop, sets idle, focus back to the handle, status
back to idle); else set `state.focus = 'handle'` (a finished walk stays drawn; only the readout goes back to the handle).

#### 5.A.3 The handle's magnet

`magnetZ(z, scale)`:

```
tol = Math.min(0.02, 3 / Math.max(scale, 1))                       // units: 0.02 at the usual 70..100 px per unit, 3 px when zoomed far in
g = (v) => { m = Math.round(v / 0.05) / 20 + 0; return Math.abs(v - m) <= tol ? m : v }     // + 0 turns -0 into 0
return { re: g(z.re), im: g(z.im) }
```

Why it exists (and why the keyboard bypasses it): a real pointer drag lands on a pixel, so without a magnet z would be
`-1.004 + 0.006i` and the readout could never show `e^(i pi/3) = 0.5 + 0.866i`; the lattice makes exact points reachable
(acceptance A2 drags to -1 and to -1 - 0.05i). Arrow-key nudges (0.1, Shift 1, Alt 0.01) are exact and are **not** snapped, hence
the `nudging` flag; the plane calls `snap` for both pointer and keyboard moves and gives it no source argument. At the usual view
the magnet's capture radius is 0.02 units (1.4 to 1.9 px) around each lattice node, so the drag still feels continuous.

#### 5.A.4 `setSeam`, `setN`, `clearWalk`

```
setSeam(sigma, source):                      // source: 'chip' | 'slider' | 'api'
  sigma = Math.min(PI, Math.max(-PI, sigma))
  before = branchAt(state.z, state.n, state.seam)           // the jump note is about the handle's z, not the walker
  state.seam = sigma
  clearWalk()                                // focus = 'handle'
  if source !== 'slider': seamSlider.value = String(sigma)        // never fight the user's thumb; the slider rounds to 15 digits, state is the truth
  for chip of chips: chip.setAttribute('aria-pressed', String(Math.abs(chip.seam - sigma) < 1e-9))
  stairs.setSeam(sigma); stairs.setLabel(staircaseLabel(sigma))
  after = branchAt(state.z, state.n, sigma)
  if before.has && after.has && Math.abs(after.beta - before.beta) > PI: showJumpNote()      // sets state.jumpNote, clears it after 3500 ms
  rebuildSeamOverlays()                      // 5.A.9
  refresh()

onSeamSliderInput(): setSeam(seamFromSlider(Number(seamSlider.value)), 'slider')

setN(n):
  n = clamp(Math.round(n), 2, 5); if n === state.n return
  state.n = n; state.pick = null; clearWalk()
  ex.setRows(rows(n)); buildSurface(); update captions that name the root and its fraction (rootName, fractionName)
  refresh()

clearWalk():
  cancelAnimationFrame(state.walk.raf)
  state.walk = { kind: null, state: 'idle', pts: [], vals: [], cls: null, t: 0, startMs: 0, raf: 0 }
  state.focus = 'handle'
  setStatus('idle', 'No walk yet. Press a walk button.', 'Along: from -2 to -0.5 on the axis. Across: from -1 + 0.5i down to -1 - 0.5i.')

showJumpNote():
  state.jumpNote = 'The seam just passed over z, so the branch switched to the next root.'
  clearTimeout(noteTimer); noteTimer = setTimeout(() => { state.jumpNote = ''; refresh() }, 3500)
```

`seamFromSlider(v)`: `if (!Number.isFinite(v)) return -PI; s = clamp(v, -PI, PI); for nice of [-PI, -PI/2, 0, PI/2, PI]: if (Math.abs(s - nice) <= 0.02) return nice; return s`.

#### 5.A.5 The z-plane layer `drawZ(ctx, plane)`

```
sigma = state.seam; m = branchAt(focusZ(), state.n, sigma)
// 1. the seam, drawn as a cut: erase the axis line under it, then dash over it
drawRay(ctx, plane, sigma, { color: '--surface', width: 7 })
drawSeam(ctx, plane, sigma, { label: 'seam', width: 2.5 })
// 2. corner text (top left, 10 px in, 12 px font, --text-muted, textBaseline top, family theme.cssVar('--font'))
line1 = 'window (' + fmtAngle(sigma, { unicode: true }) + ', ' + fmtAngle(sigma + TAU, { unicode: true }) + ']'
line2 = m.has ? 'also ' + fmtAngle(m.beta - TAU, { unicode: true }) + ', ' + fmtAngle(m.beta + TAU, { unicode: true }) : null
// 3. the walk path, progressive (see 5.A.7): drawTimedCurve(ctx, plane, visiblePts, { color: '--input', ramp: true, dots: true, arrow: walk.t >= 1 })
// 4. if m.has: ray and angle set
O = plane.toPixel({ re: 0, im: 0 }); Z = plane.toPixel(m.z)
names = [-1, 0, 1].map(k => ({ k, th: m.beta + TAU * k })).sort((a, b) => Math.abs(a.th) - Math.abs(b.th))     // shortest arc innermost
ghostAlpha = Number(theme.cssVar('--ghost-alpha')) || 0.35
for (i, nm of names):
  rPx = 24 + 9 * i
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([])
  ctx.strokeStyle = cssColor('--polar'); ctx.lineWidth = nm.k === 0 ? 3 : 1.5; ctx.globalAlpha = nm.k === 0 ? 1 : ghostAlpha
  M = Math.max(8, Math.ceil(Math.abs(nm.th) / 0.1))
  polyline over j = 0..M of (O.x + rPx * cos(nm.th * j / M), O.y - rPx * sin(nm.th * j / M))
  ctx.restore()
  if nm.k === 0: halo text 'θ = ' + fmtAngle(nm.th, { unicode: true }) (600 12px --polar, 3 px --surface halo) at chooseLabelSpot({ O, Z, th: nm.th, rPx, width: measureText, avoid: labelObstacles(plane, Z) })
ray: stroke O -> Z, --polar, 2 px, alpha 1
// 5. the walker ring when state.walk.kind !== null and focus === 'walker': a ring at walkerZ (2.5 px --input stroke, --surface fill, radius 6)
```

`chooseLabelSpot` (pure, exported, tested by T14) tries, in order, the middle of the angle at radius rPx + 8, then that angle plus or minus 0.4 and 0.8 rad, then inside the arc
(centred, radius 14 px), and returns the first box (text width x 14 px) that touches neither a sampled point of the ray O to Z nor a rectangle of `avoid`; if none is free, the one with the fewest hits.
`labelObstacles(toPixel, Z)` (pure, exported, used by T14 too) gives the rectangles of the handle's dot (a 24 px square: dot, ring and halo), of the handle's label `z`
(up and to the right of the dot) and of the plane's tick labels (the number, its tick mark and some air: every 0.5 up the y axis, left of it; every 0.5 along the x axis, under it).
Fix round 2, item 2: with the seam on the positive real axis and z near it or near the origin (z = 0.2 + 0.15i; z = 1 + 0.05i on a phone) every place next to the arc is taken by the dot,
the ray and the `z` label, so the list of places gained the same five angles at radius rPx + 26 (outside all three arcs) before the inside place. The label is drawn with `drawLabel`
(anchor at the origin plus a pixel offset), which records its box in the plane's label frame; `drawSeam` queues the `seam` label and places it at the end of the frame, so it now goes around
the `theta` label (it slides along the seam or to the other side) instead of being drawn on top of it. The seam label is therefore not in `avoid`. Results: theta = pi (problem 2.4.1) puts the label just right of the y axis above the arc, clear of the tick label `0.5`; the default point (theta = 2.678) keeps the natural place.
(The first build moved the label 0.45 rad when its middle was near the y axis and still ran into `0.5` at theta = pi: Appendix D, fix round 1, item 5.)
A prototype of exactly this layer (seam mask, three arcs, corner text) was rendered at 1100 and 390 px in both themes and read well
**[measured]**; the two ghost labels collided when they were attached to the arcs (both ends lie on the ray of z), which is why only the chosen arc
is labelled and the ghosts are listed in the corner text.

#### 5.A.6 The w-plane layer `drawW(ctx, plane)`

```
sigma = state.seam; n = state.n; m = branchAt(focusZ(), n, sigma); { from, to } = wedgeOf(sigma, n)
poly = [{ re: 0, im: 0 }] + for i = 0..24: { re: 6 cos(a), im: 6 sin(a) } with a = from + (to - from) * i / 24
drawPolygonFill(ctx, plane, poly, { color: '--output', alpha: 0.14 })
for j = 1..n-1: drawRay(ctx, plane, from + TAU * j / n, { color: '--seam', dash: DASH.guide, width: 1 })       // the other seams of the partition
drawRay(ctx, plane, from, { color: '--output', dash: DASH.excluded, width: 2 })                                  // open edge
drawRay(ctx, plane, to,   { color: '--output', width: 2.5 })                                                     // closed edge
image of the walk (5.A.7): drawTimedCurve per piece, jump chord and label (the label `jump`, via drawLabel, 30 percent along the chord from the end that is farther from w, so it does not sit in the cluster of r and Arg w that the polar address puts at the middle of the chord; drawLabel records it in the label frame and the polar address, placed after this layer, goes around it)
if m.has:
  for k = 1..n-1: drawDot(ctx, plane, m.roots[k], { color: '--text-muted', radius: 3.5 })                         // the roots not chosen
  if state.pick !== null: j = mod(state.pick, n); ring radius 10, --polar, 2 px, around m.roots[j] (j = 0 is m.w)
  drawPolarAddress(ctx, plane, m.w, { name: 'w' })
  drawDot(ctx, plane, m.w, { color: '--output', radius: 6, label: 'w' })
else: drawDot(ctx, plane, { re: 0, im: 0 }, { color: '--output', radius: 6, label: 'w' })
walker value ring (when focus === 'walker'): ring at branchRoot(walkerZ, n, sigma)
```

With `drawPolarAddress` the arc and label name **Arg w**, the principal angle of w. It differs from the chosen `theta/n` only when n = 2
and the window is high (for example n = 2, seam 2: theta/n can exceed pi); the readout prints the chosen `theta/n` inside `polarText`.

#### 5.A.7 Walks

```
startWalk(kind):
  cancelAnimationFrame(state.walk.raf)
  w = state.walk
  w.kind = kind
  w.pts  = walkPoints(kind)                                            // 61 points (>= 40, acceptance A5)
  w.vals = w.pts.map(z => branchRoot(z, state.n, state.seam))         // the branch values, from complex.js
  w.cls  = classifyWalk(w.pts, w.vals)                                 // the status is COMPUTED from the samples
  w.t = 0; w.state = 'walking'; state.focus = 'walker'
  setStatus('walking', 'walking...', 'The ring is the test point. Your own point z stays where you left it.')   // SYNCHRONOUSLY, before any frame
  if ctx.theme.prefersReducedMotion(): w.t = 1; finishWalk(); return
  w.startMs = performance.now(); w.raf = requestAnimationFrame(tick)
  refresh()

tick(now):
  if disposed || w.state !== 'walking': return
  w.t = Math.min(1, (now - w.startMs) / WALK_MS)                       // WALK_MS = 1600
  if w.t >= 1: finishWalk() else { w.raf = requestAnimationFrame(tick); refresh() }

finishWalk():
  w.t = 1; w.raf = 0
  if w.cls.jumps:
    w.state = 'jumps'
    text = w.cls.where === 'negative real axis' ? 'jumps at the negative real axis' : 'jumps at the seam'
    detail = 'The value leaps by ' + fmtNum(w.cls.maxStep) + ' between two neighbouring samples: from one root to the next. The readout follows the test point; drag z to take it back.'
  else:
    w.state = 'continuous'; text = 'continuous'
    detail = 'Largest step between neighbouring samples: ' + fmtNum(w.cls.maxStep) + '. The value moves smoothly. The readout follows the test point; drag z to take it back.'
  setStatus(w.state, text, detail)
  refresh()

walkerZ(w):  w.kind === 'across' ? { re: -1, im: 0.5 - w.t } : { re: -2 + 1.5 * w.t, im: 0 }      // exact; equals walkPoints(kind)[k] at t = k / 60

visible prefix at time t: m = Math.floor(w.t * WALK_N); pts[0..m] plus the exact walker point; each point carries t = k / WALK_N (the exact one carries w.t)
image pieces at time t: take vals[0..m] plus the exact current value; if w.cls.jumps and m >= w.cls.at + 1: split into
   piece A = vals[0..at] and piece B = vals[at + 1..m] + current; draw the dashed chord between vals[at] and vals[at + 1] with the label 'jump' at its midpoint
setStatus(state, text, detail): statusEl.textContent = text; statusEl.dataset.state = state; detailEl.textContent = detail
```

The two walks and why they teach: `along` stays on one side of the axis (every point has Arg = pi, the top of the principal window), so it
is smooth for every seam, even the principal one: **a restriction can be continuous when the function is not**. The honest test is
`across`: the principal seam makes it jump (largest step 1.729 against a threshold of 0.519), seam 0 makes it smooth (largest step 0.0056).

#### 5.A.8 Explainer rows

`rows(n)`, with `pp = powerParts(n)`; every row function takes the model `m` and returns a TeX string (tinted with `cart()`/`polar()` at render time) or `{ text }`:

| Row id (label) | Cartesian cell | Polar cell | `native` |
|---|---|---|---|
| `z` (`z`) | `x = ${fmtNum(z.re)},\ y = ${fmtNum(z.im)}` | `r = ${fmtNum(r)},\ \theta = ${texAngle(beta)}\ \text{(chosen)}`; at 0: `{ text: 'No angle at 0.' }` | none |
| `eq` (`the equation`) | `${pp.re} = ${fmtNum(z.re)},\quad ${pp.im} = ${fmtNum(z.im)}`; at 0: `{ text: 'At z = 0 the roots meet in 0. This is the branch point.' }` | `\rho^{${n}} = ${fmtNum(r)},\quad ${n}\varphi = ${texAngle(beta)} + 2\pi k` | `'polar'` |
| `roots` (`all ${n} roots`) | the n values `fmtCart(roots[k])` joined by `;\quad` | `\rho = ${fmtNum(rho)},\quad \varphi = ` the n angles `texAngle((beta + TAU * k) / n)` joined by `,\ ` | `'polar'` |
| `pick` (`this branch`) | `w = ${fmtCart(w)}` | `k = 0:\ w = ${fmtNum(rho)}\,e^{i${texAngle(phi)}}` | `'polar'` |
| `check` (`check: w to the ${n}`) | `(${fmtCart(w)})^{${n}} = ${fmtCart(pow(w, n))}` | `${fmtNum(rho ** n)}\,e^{i${texAngle(n * phi)}}` | none |

`same(m)`: `{ cart: cart(fmtCart(pow(m.w, m.n))), polar: polar(fmtNum(m.r) + '\,e^{i' + texAngle(m.beta) + '}'), agree: eq(pow(m.w, m.n), m.z, 1e-9) }`.
At z = 0 return all cells `null` and `agree: true`. The Cartesian column is the point of the station: **the cube root in x and y is a coupled
cubic system**; the polar column splits it into one easy equation for the length and one for the angle, with the staircase's `+ 2πk` visible.
A prototype of these five rows rendered correctly (KaTeX, both themes, stacked on a phone) **[measured]**.

#### 5.A.9 The 3D surface

```
buildSurface():
  remove and dispose the old surface, beads, floor marker, fibre, seam lines, jump line (view.remove(obj); disposeObject(obj))
  surface = riemannSurfaceRoot({ n: state.n, rMax: 2, nr: 24, nTheta: 48, part: 'im' }); surface.name = 'riemann-root'
  surface.userData.frameRadius = hypot(rMax, rMax^(1/n))          // the surface is a disc: frame the ball that holds it, not its box (fix round 2, item 6)
  view.add(surface); view.fitTo(surface, { padding: 1.12 })
  // everything below is drawn on top of the opaque surface: onTop(obj, order) sets renderOrder and depthTest = depthWrite = false on its materials
  floorMarker = onTop(createMarker({ color: '--cart', radius: 0.08 }), 4); name 'branches-floor-marker'
  fibre = tubeLine([[0, 0, 0], [0, 0, 0.01]], '--text-muted', { radius: 0.009, order: 3 }); name 'branches-fibre'
  beads = [for k in 0..n-1] onTop(createMarker({ color: k === 0 ? '--output' : '--text-muted', radius: k === 0 ? 0.11 : 0.08 }), k === 0 ? 6 : 5); name 'branches-bead-' + k
  edgeLo = tubeLine(edgePoints(seam), '--output', { radius: 0.016, dash: [4, 3] }); name 'branches-seam-edge-lo'     // the window starts here: not included
  edgeHi = tubeLine(edgePoints(seam + TAU), '--output', { radius: 0.016 });          name 'branches-seam-edge-hi'     // the window ends here: included
  floorLine = tubeLine(floorPoints(), '--seam', { radius: 0.011, dash: [2, 1], order: 2 }); name 'branches-seam-floor'
  jump = tubeLine([edgePoints(seam)[40], edgePoints(seam + TAU)[40]], '--danger', { radius: 0.013, order: 4 }); name 'branches-seam-jump'
  view.add each of them

tubeLine(points, token, { radius, dash, order }):   // a THREE.Group of TubeGeometry meshes (one per dash), one MeshBasicMaterial { transparent, depthTest: false, depthWrite: false }
  userData.update(points) rebuilds the tubes; userData.themeRefresh() re-reads the token (the view calls it on a theme change)
  a run shorter than 1e-4 is skipped (no direction); dash = [on, off] in samples: runs of on + 1 points, step on + off

edgePoints(theta) = for i = 0..40: t = 2 i / 40; p = riemannPoint({ n: state.n, part: 'im' }, t, theta); [p[0], p[1], p[2]]
floorPoints() = for i = 0..20: t = 2 i / 20; [t cos(seam), t sin(seam), 0]
rebuildSeamOverlays(): edgeLo, edgeHi, floorLine, jump .userData.update(...) with the new seam

update3D(m):
  show = m.has && m.r <= 2
  for obj of [floorMarker, fibre, ...beads]: obj.visible = show
  farEl.textContent = (m.has && m.r > 2) ? 'z is farther out than the surface drawn here (radius 2).' : ''
  if !show: view.requestRender(); return          // visibility is not a library mutator
  floorMarker.userData.setPosition([m.z.re, m.z.im, 0])
  hs = []
  for k in 0..n-1: p = riemannPoint({ n: m.n, part: 'im' }, m.r, m.beta + TAU * k); beads[k].userData.setPosition([p[0], p[1], p[2]]); hs.push(p[2])
  fibre.userData.update([[m.z.re, m.z.im, Math.min(0, ...hs)], [m.z.re, m.z.im, Math.max(0, ...hs)]])
```

`riemannPoint({ n, part: 'im' }, r, theta)` returns `[x, y, height, other]` with `theta` unwrapped, and the height is periodic in
`theta` with period `2 pi n`, so a bead at `beta + 2 pi k` lies exactly on the mesh for any `beta`, negative or not. A prototype with a
3-sheet surface, floor marker, 3 beads, fibre and both window edges rendered correctly in both themes **[measured]** (about 4 ms to build
all overlays; `riemannSurfaceRoot` n = 3: 3625 vertices, n = 5: 6025 vertices, 12 ms).

#### 5.A.10 Chips, sliders, buttons

```
chips: click -> setSeam(chip.seam, 'chip')
seam slider: 'input' -> setSeam(seamFromSlider(Number(value)), 'slider')
n slider: 'input' -> setN(Number(value))
walk buttons: click -> startWalk('along' | 'across')
```

#### 5.A.11 The problem panel

```
p = problemById('2.4.1'); if (!p) skip the panel
statement: for part of statementParts(p.statement): part.math ? tex(span, part.text) : span.textContent = part.text
routes: two bars (.callout with data-tone 'cart' / 'polar'): heading 'In x and y (Cartesian)' + prose(el, p.routes.cart); 'In r and theta (polar)' + prose(el, p.routes.polar);
  the bars are NOT in the panel until the answer is opened: the polar route gives the window and f(-1), i.e. the whole answer; they are appended to #branches-answer after the formula and its text
#branches-load-2-4-1 click: applyProblem()
applyProblem():
  if state.n !== 3: nSlider.value = '3'; setN(3)
  state.z = PROBLEM_Z; zHandle.set(PROBLEM_Z, { silent: true })
  setSeam(0, 'api')
answer toggle: aria-expanded true/false; the answer container is hidden until opened; when first opened render
  tex(texBox, p.answer.tex, { display: true }) inside .tex-scroll, then a <p class="muted"> with p.answer.text as the wrapping fallback, then the two route bars
```

### 5.B `graph4d`

#### 5.B.1 `mount(el, ctx)`

```
mount(el, ctx):
  disposed = false
  init = { fn: 'sq', mode: 'graph' }
  p = ctx.preset
  if p && p.kind === 'token': if FUNCS[p.token]: init.fn = p.token;  else if p.token === 'landscape' or 'sphere': init.mode = p.token
  state = { fn: init.fn, mode: 'graph', uv: FUNCS[init.fn].angles.uv, yv: FUNCS[init.fn].angles.yv, spinning: false, strokesOn: true, probe: FUNCS[init.fn].probe }
  1. Build the DOM of 2.2.1 (header; grid with the 3D host #graph4d-view and the controls panel; probe row; strokes panel; links).
  2. view = createView3D(viewHost /* id 'graph4d-view' */, { grid: true, gridSize: 5, axisLabels: ['x', 'y', 'h'], label: '3D view of the graph of w = f(z)' })
  3. probePlane = createPlane(planeHost, { id: 'graph4d-plane', xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], grid: 'cart', axisLabels: ['x', 'y'],
        maxWidth: 420, ariaLabel: 'Domain plane. Drag the probe point z.' })
     probeHandle = probePlane.addPoint({ id: 'z', z: state.probe, color: '--input', label: 'z', step: 0.1,
        onDrag: (z) => { state.probe = z; refreshProbe() } })
     probePlane.addLayer(drawProbe, { order: 10 })
  4. ex = createExplainer(exHost, { id: 'graph4d-ex', title: 'One point of the graph, two addresses', rows: probeRows(state.fn), same })
  5. strokes = extractStrokes(readStore(ctx.store, 'lab.strokes'))           // try/catch inside; never throws
  6. buildFunction(state.fn)                                                 // 5.B.2 (graph meshes, probe plane view, rows, strokes, texts)
  7. wire chips, toggles, sliders, spin, reset, strokes toggle
  8. if init.mode !== 'graph': setMode(init.mode)
  9. unsubTheme = ctx.theme.onThemeChange(() => { if (dcWheel) drawLegendWheel(); probePlane.requestDraw(); refreshProbe() })
 10. mv.graph4d = { ...getters of 4.8 }
 11. refreshAll(); return unmount
```

#### 5.B.2 Building a function

```
buildFunction(id):
  F = FUNCS[id]
  disposeGraph(); disposeLandscape(); disposeSphere()                         // each: g.dispose() / disposeObject(...), view.remove(...)
  group = new THREE.Group(); group.name = 'graph4d-group'
  graphs = meshSpecs(id).map(s => graph4D({ f: s.f, xRange: s.xRange, yRange: s.yRange, nx: s.nx, ny: s.ny, clamp: s.clamp, angles: { uv: state.uv, yv: state.yv } }))
  for g of graphs: group.add(g.mesh)
  S = graphs[0].mesh.userData.hiddenScale                                      // equal for all pieces (they all reach the corner |z| = sqrt 2 R)
  group.userData = { frame: true, frameRadius: S }                             // the 4D graph after any rotation stays inside the ball of radius S
  view.add(group); group.visible = (state.mode === 'graph')
  if state.mode === 'graph': fitView(group, fitGraph(S))   // fitView = view.fitTo + pxUnit (the world size of a CSS pixel at the camera target, for the beads). frameRadius = S: the camera never has to follow the sliders; fitGraph(S) = max(1.08, 2.6 / S): the floor grid is gridSize 4 (x and y in [-2, 2], height axis 2, its label 2.35), so the label stays in the picture (fix round 2, item 6: it was max(1.2, 3.1 / S) with gridSize 5)
  probePlane.fitTo([{ re: F.x[0], im: F.y[0] }, { re: F.x[1], im: F.y[1] }], 0.12); probeHandle.set(state.probe, { silent: true })
  ex.setRows(probeRows(id))
  rebuild beads: n beads = createBead(k) (3.4: no depth test, no depth write, render order 5 / 6; sized 7 px / 5.5 px by updateBeads), names 'graph4d-probe-' + k, added to the view
  rebuild stroke lines from `strokes` (curveToLine, '--input', names 'graph4d-stroke-' + i), added to the view
  state.version++
```

`graph4D` is called once per piece. For the root presets `meshSpecs` returns the 2n half-plane pieces of 6.7 (`upper` pieces over `y` in `[0, R]`, `lower` pieces over
`y` in `[-R, 0]`, 49 by 25 vertices each), so that no triangle ever bridges the seam. Measured: `graph4D` x 6 builds in 8 to 11 ms
(first call 58 ms with JIT warm-up), `setAngles` x 6 in 6 to 9 ms in Node and 4 ms in the browser, for 7350 vertices
**[measured]**; sixty frames per second is possible, and angle changes are coalesced to one `setAngles` per frame anyway.

`setFunction(id)`:

```
state.fn = id; F = FUNCS[id]
state.uv = F.angles.uv; state.yv = F.angles.yv; state.probe = F.probe       // a preset sets the function and its angles; the MODE is kept
sync sliders and outputs
buildFunction(id)
if state.mode === 'landscape': buildLandscape(); show it
if state.mode === 'sphere':    buildSphere(); show it
chips aria-pressed (exactly one true); note, legend, axes, readout texts (5.B.7)
refreshAll()
```

#### 5.B.3 Angles (coalesced) and the readout

```
setAngles(patch):                                         // patch: { uv?, yv? }, values already snapped by the caller
  if patch.uv !== undefined: state.uv = patch.uv;  if patch.yv !== undefined: state.yv = patch.yv
  if state.mode !== 'graph': setMode('graph')             // moving a slider means "show me the 4D graph"
  sync sliders (value = String(angle)) and outputs (degText)
  updateTexts()                                           // readout, axes line, legend text: synchronous, so a script sees them at once
  scheduleApply()

scheduleApply(): if (!applyRaf) applyRaf = requestAnimationFrame(() => { applyRaf = 0; applyNow() })
applyNow(): for g of graphs: g.setAngles({ uv: state.uv, yv: state.yv }); updateBeads(); updateStrokes(); state.version++

slider 'input':  setAngles({ uv: snapAngle(Number(uvSlider.value)) })       // yv likewise. Never read exactness back from the slider (15-digit rounding)
```

`updateTexts()` sets `#graph4d-readout` to `readoutText(state)`, the axes line, the legend text and the note (copy 2.2.6).

#### 5.B.4 Modes

```
setMode(m):                                               // 'graph' | 'landscape' | 'sphere'
  if m === state.mode: return
  state.mode = m
  if m === 'landscape' && !landscape: buildLandscape()
  if m === 'sphere' && !sphere: buildSphere()
  group.visible = (m === 'graph'); if landscape: landscape.visible = (m === 'landscape'); if sphere: sphere.rs.group.visible = (m === 'sphere')
  furniture = view.scene.getObjectByName('furniture'); if furniture: furniture.visible = (m !== 'sphere')
  if m !== 'graph' && state.spinning: stopSpin()          // Spin and the sliders call setMode('graph') themselves before they act
  chips: landscape.aria-pressed = (m === 'landscape'); sphere.aria-pressed = (m === 'sphere')
  fit: fitView(m === 'graph' ? group : m === 'landscape' ? landscape : sphere.rs.group, m === 'graph' ? fitGraph(S) : m === 'sphere' ? 1.25 : 1.0)    // view.fitTo, then the pixel size of the beads (5.B.8)
  legend (bar or wheel), axes line, readout, beads (5.B.8), strokes visibility
  view.requestRender()                                    // visibility toggles are not library mutators
toggle chip click: setMode(state.mode === target ? 'graph' : target)
```
`furniture` is the library's group of floor grid, axes and axis labels (`view.scene.getObjectByName('furniture')` found it in a prototype). Hiding it in sphere mode leaves only the sphere's own graticule and labels;
a prototype of the landscape (1/z, hue = Arg w, the pole as a tall spike) and of the sphere (1/z) rendered correctly in the dark theme **[measured]**.

#### 5.B.5 The landscape

```
buildLandscape(): landscape = modulusLandscape({ f: F.f, xRange: F.x, yRange: F.y, nx: F.nx, ny: F.ny, clamp: 6 }); landscape.visible = false; view.add(landscape)
```
For the root presets `F.f` is the principal root; all n roots have the same modulus, so the landscape is one surface and only its colour (hue) differs between
roots; the legend text says so through the function note. `shownVertexCount` = `landscape.userData.vertexCount`.

#### 5.B.6 The sphere

```
buildSphere():
  rs = riemannSphere({ radius: 1 }); body = rs.group.getObjectByName('sphere-body'); if (body) body.visible = false
  geo = new THREE.SphereGeometry(1, 96, 64)                      // unit radius: the pole vertices have exactly Z = +-1
  pos = geo.getAttribute('position'); col = new Float32Array(pos.count * 3); rgb = [0, 0, 0]
  for i in 0..pos.count-1:
    X = pos.getX(i); Y = -pos.getZ(i); Z = pos.getY(i)           // scene (sx, sy, sz) = plane frame (X, Z, -Y), the riemannSphere convention
    sphereColor(F.f, [X, Y, Z], rgb)                              // inverseStereographic, f, colorOf(w, out, false); grey for a non-finite w (the north pole vertex, a pole of f)
    col[3i] = srgbToLinear(rgb[0] / 255); col[3i + 1] = srgbToLinear(rgb[1] / 255); col[3i + 2] = srgbToLinear(rgb[2] / 255)
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); mesh.scale.setScalar(0.996); mesh.name = 'graph4d-domain-sphere'
  rs.group.add(mesh); rs.group.visible = false; view.add(rs.group); sphere = { rs, mesh }
```
6305 vertices, 7 to 13 ms to build **[measured]**. A prototype rendered 1/z and z^(1/3) on this sphere in the light theme; for the principal cube root only a third of the
hue wheel appears (red to magenta), which is the picture of "this branch lands in one wedge". `shownVertexCount` = 6305.

#### 5.B.7 Names, axes line, legend, note

```
shownNames(uv, yv): c1 = cos uv, s1 = sin uv, c2 = cos yv, s2 = sin yv
   coefficient triples over (y, u, v):  y' = (c2, -s2 s1, -s2 c1);  u' = (0, c1, -s1);  hidden = (s2, c2 s1, c2 c1)
   name(co): the entries with |c| > 0.02;  exactly one entry and ||c| - 1| <= 0.02  -> (c < 0 ? '-' : '') + symbol;
             none -> '0';  otherwise: join of ('-' | ' - ' | ' + ' | '') + |c|.toFixed(2) + symbol  (leading '+' omitted)
```
Table: (uv, yv) = (0, 0): `y`, `u`, `v`; (90, 0): `y`, `-v`, `u`; (180, 0): `y`, `-u`, `-v`; (270, 0): `y`, `v`, `-u`; (0, 90): `-v`, `u`, `y`; (90, 90): `-u`, `-v`, `y`;
(45, 0): `y`, `0.71u - 0.71v`, `0.71u + 0.71v`. Section 6.6 proves them against `rotate4`.

The axes line and legend text come from the copy table (2.2.6) by mode; the legend shows the viridis bar in `graph` mode and a colour wheel in the other two.
`drawLegendWheel()`: `drawColorWheel(canvas, { size: 72 })`, called when the mode changes to landscape or sphere and again on `themechange`.

#### 5.B.8 The probe: plane layer, beads, explainer

```
drawProbe(ctx, plane):
  F = FUNCS[state.fn]; z = probeHandle.z
  stroke the domain box [F.x] x [F.y] with drawSegment x4, '--input', DASH.guide, width 1.5          // where the mesh ends
  if F.n > 1: drawSeam(ctx, plane, PI, { label: 'seam' })                                           // the principal root jumps here
  drawCartAddress(ctx, plane, z); drawPolarAddress(ctx, plane, z, { name: 'z' })

values(): v = probeValues(state.fn, state.probe)          // principal value w, Cartesian-formula value wc, polar rule, agree flag
beadPositions(mode):                                      // an array of maths triples, one per value of f at z (F.n of them)
  graph:     for each value w_k:  project4to3(rotate4([x, y, w_k.re, w_k.im], { uv: state.uv, yv: state.yv }))
  landscape: [x, y, |w_0|]   (principal only)
  sphere:    p = rs.project(z) (a THREE.Vector3 in scene coordinates);  fromScene([p.x, p.y, p.z])
  values w_k = fromPolar(rho, (theta + TAU * k) / n)  (k = 0..n-1) for the root presets, w for the single-valued ones; theta = Arg z
refreshProbe(): ex.update(modelForExplainer()); updateBeads(); a non-finite value (1/z at 0) hides the beads; probePlane.requestDraw()
updateBeads(): for each bead k: position = beadPositions()[k] (hidden when missing or not finite); scale = BEAD_PX[k === 0 ? 0 : 1] * pxUnit (a marker of radius 1 is scaled to 7 px or 5.5 px on screen)
pxUnit: world units per CSS pixel at the camera target = 2 * |camera - target| * tan(fov / 2) / viewHost.clientHeight, measured by fitView() right after each view.fitTo() (so a wheel zoom makes the beads grow
        and a probe move does not undo it); 0.0125 until the view is laid out and when there is no WebGL
bead depth (fix round 2, item 1): createBead(k) sets depthTest = depthWrite = false on the material (transparent: true, render order 5, principal value 6). Reason: the sheets (cbrt: three, sqrt: two) and the
        sphere are opaque, so with a depth test only the top bead was visible (1 of 3 for z^(1/3), 1 of 2 for sqrt z) and, on the Riemann sphere, the default probe (Im > 0) sat on the back hemisphere
        (scene z = -0.8) and could not be seen at all until z was dragged below the axis or the sphere was turned. The "other roots" row of the explainer has to have something to point at.
        Sphere mode only: onBeforeRender fades a bead on the far hemisphere to BEAD_BEHIND = 0.4 opacity (dot(position, camera) < |position|^2), the one cue that it is on the back.
```

Explainer rows (`probeRows(id)`; `v = probeValues`, decimals through `fmtNum` / `fmtCart`, angles through `texAngle`):

| Row id (label) | Cartesian cell | Polar cell | `native` |
|---|---|---|---|
| `z` (`z`) | `x = ${fmtNum(x)},\ y = ${fmtNum(y)}` | `r = ${fmtNum(r)},\ \theta = \operatorname{Arg} z = ${texAngle(theta)}` | none |
| `rule` (`what f does`) | per function, static TeX: sq `u = x^{2} - y^{2},\quad v = 2xy`; sqrt-all `u = \sqrt{(|z| + x)/2},\quad v = \operatorname{sgn}(y)\sqrt{(|z| - x)/2}`; cbrt-all `\text{no short formula in } x, y`; recip `u = \dfrac{x}{x^{2} + y^{2}},\quad v = \dfrac{-y}{x^{2} + y^{2}}`; exp `u = e^{x}\cos y,\quad v = e^{x}\sin y` | sq `\rho = r^{2},\quad \varphi = 2\theta`; sqrt-all `\rho = \sqrt{r},\quad \varphi = \theta/2`; cbrt-all `\rho = r^{1/3},\quad \varphi = \theta/3`; recip `\rho = 1/r,\quad \varphi = -\theta`; exp `\rho = e^{x},\quad \varphi = y` | `'polar'` except exp (none: for e^z the Cartesian address of z is the polar address of w) |
| `w` (`w = f(z)`) | `u = ${fmtNum(u)},\ v = ${fmtNum(v)}` from `wc` (cbrt-all: `u + iv = ${fmtCart(w)}`) | `\rho = ${fmtNum(rule.rho)},\ \varphi = ${texAngle(rule.phi)}` | none |
| `others` (`the other roots`; only when `F.n > 1`) | the other n - 1 values, `fmtCart`, joined by `;\quad` | `\varphi + 2\pi k/${n},\ k = 1 \ldots ${n - 1}: ` the angles `texAngle((theta + TAU * k)/n)` | none |
| `point` (`the point of the graph`) | `(x, y, u, v) = (${x}, ${y}, ${u}, ${v})` decimals | `(r, \theta, \rho, \varphi) = (${r}, ${theta}, ${rho}, ${phi})` decimals | none |

`same`: cart `w = ${fmtCart(v.wc || v.w)}`, polar `w = ${fmtNum(rho)}\,e^{i${texAngle(phi)}}`, `agree = v.agree` (so the Cartesian formula and the polar rule are
checked against each other, and against `f` itself). Undefined cells at a pole or at 0: `{ text: 'f is not defined at 0 (the pole)' }` in the `w` row, `null` elsewhere,
`agree: true`.

#### 5.B.9 Spin and reset

```
startSpin():
  if ctx.theme.prefersReducedMotion() || view.unavailable: setAngles({ uv: snapAngle((state.uv + PI / 4) % TAU) }); return        // the button is a 45-degree stepper
  if state.spinning: return
  state.spinning = true; spinBtn.setAttribute('aria-pressed', 'true'); spinBtn.textContent = 'Stop spinning'
  setMode('graph')
  tick = 0
  unsubFrame = view.onFrame((dt) => {
    state.uv = (state.uv + dt * TAU / 16) % TAU                            // 16 s per turn
    uvSlider.value = String(state.uv); applyNow()
    if (++tick % 6 === 0) { updateTexts(); uvOut.textContent = degText(state.uv) }     // text and output about ten times a second
  })
stopSpin(): state.spinning = false; if (unsubFrame) unsubFrame(); unsubFrame = null; spinBtn text 'Spin', aria-pressed false; updateTexts()
Spin button click: state.spinning ? stopSpin() : startSpin()
Angles to 0 click: stopSpin(); setAngles({ uv: 0, yv: 0 })
```
The `onFrame` callback is registered only while spinning, because a registered callback keeps the 3D loop rendering every frame. A slider `input` while spinning calls `stopSpin()` first.
The button label under reduced motion is `Turn 45 degrees`, set at mount and re-evaluated on each press.

#### 5.B.10 Strokes from the Lab

```
extractShapes(value):                                       // never throws; wrapped in try/catch
  entries = []                                               // one per STORE ENTRY that is a shape
  gather(v, depth):                                          // depth <= 3
    v is an array:
      if v.length > 0 and every element is a point {re, im}: entries.push({ kind: 'stroke', lists: [v] }); return      // one stroke given as a list of points
      for item of v: e = entryOf(item); if e: entries.push(e); else if item is a plain object: gather(item, depth + 1)
    v is an object: for key of ['shapes', 'strokes', 'curves']: if Array.isArray(v[key]) { gather(v[key], depth + 1); return }
                    e = entryOf(v); if e: entries.push(e)
  entryOf(item):
    array of points                       -> { kind: 'stroke', lists: [item] }
    item.kind === 'cartGrid'              -> { kind, lists: [], skip: 'grid' }                 // a grid is dozens of lines: it stays in the Lab
    item.points is an array               -> { kind: item.kind || 'stroke', lists: [item.points] }            // freehand, or a Curve from shapes.js
    item.curve.points is an array         -> { kind: item.kind || 'stroke', lists: [item.curve.points] }
    item.kind is a string                 -> { kind, lists: shapeCurves(item).map(c => c.points) }           // a Lab spec; unknown kind -> []
    else null
  shapeCurves(s): circle -> [circle(s.center || 0, s.r)], segment, rect, polygon, verticalLine (yRange [-4, 4]), horizontalLine (xRange [-4, 4]),
                  sector -> sector({ r0, r1, theta0, theta1 })  (boundary + 4 fill rays + 3 fill arcs = 8 curves), annulus -> annulus({ center, r0, r1 })  (inner, outer, 2 rings, 8 rays = 12 curves);
                  any other kind or a throw -> []
  cleanPoints(points): finite points only (drop NaN), fewer than 2 -> null; stride = ceil(n / 400); keep i % stride === 0 and the last point
  shapes = []; left = []; points = 0; curveCount = 0
  for e of entries:
    e.skip                                         -> left.push({ kind, why: e.skip })                  // 'grid'
    curves = e.lists.map(cleanPoints).filter(Boolean); none -> left.push({ kind, why: 'unreadable' })
    shapes.length >= 20 || curveCount + curves.length > 80 || points + (points of curves) > 4000 -> left.push({ kind, why: 'limit' })   // a shape is drawn whole or not at all
    else shapes.push({ kind, curves }); points += ...; curveCount += ...
  return { shapes, left, total: entries.length, points, curveCount }
```

`total` is the number the strokes panel states ("The Lab has N shapes": one per store entry, whatever the entry is drawn with); `strokes` in `mount` is the flat list of the drawn curves
(`shapes.flatMap(s => s.curves)`), one `curveToLine` each. The numbers (derived from `shapes.js`): circle 129 points (128 segments); sector 8 curves, 145 + 7 x 49 = 488 points; annulus 12 curves,
4 x 97 + 8 x 33 = 652 points; segment 65 points; the five Lab presets together are 5 shapes, 23 curves, 488 + 652 + 65 + 3 + 129 = 1337 points (the first build capped the **curves** at 20 and lost the last three shapes).

Lift and draw:

```
liftPoint(f, z, uv, yv, clamp): w = f(z); if !finite(w) || |w.re| > clamp || |w.im| > clamp: return [NaN, NaN, NaN]
                                 return project4to3(rotate4([z.re, z.im, w.re, w.im], { uv, yv }))
liftStroke(pts) = pts.map(z => liftPoint(F.f, z, state.uv, state.yv, F.clamp))          // curveToLine breaks the line at a non-finite triple
updateStrokes(): visible = state.strokesOn && state.mode === 'graph' && strokes.length > 0
                 for (line, pts) of zip(strokeLines, strokes): line.visible = visible; if visible: line.userData.update(liftStroke(pts))
```

The panel (`#graph4d-strokes`) text is `strokesPanelText(extractShapes(...))` (2.2.5); the toggle is created only when at least one shape is drawn; otherwise the link to the Lab is shown.

#### 5.B.11 Resolution, redraw and cost

All canvases are the widgets' own: the planes handle `devicePixelRatio` and resize through `ResizeObserver`; the 3D view caps its pixel ratio at 2 and its
pixel budget at 2.1 million, renders on demand, and pauses off screen. The station owns one canvas, the 72 px legend wheel (redrawn on mode change and on `themechange`).
Mesh sizes: 2401 to 7350 vertices for the graph, 2401 to 2500 for the landscape, 6305 for the sphere.

### 5.C Shared details

- **Theme change**: both stations subscribe through `ctx.theme.onThemeChange`; planes, explainers and the 3D view also re-theme themselves. Canvas layers use `cssColor` at draw time, so the redraw is enough.
- **Reduced motion** is read when an action starts (`ctx.theme.prefersReducedMotion()`), not at mount, so changing the system setting takes effect on the next press.
- **Styling.** No new stylesheet file and no edit of `css/components.css`. Use the shell classes (`.panel`, `.chips`, `.chip`, `.btn`, `.slider-row`, `.readout`, `.callout`, `.two-planes`, `.station-links`, `.muted`, `.tex-scroll`; catalogue in `i1-shell.md` 2.6). The few things no class gives are set with a `style` attribute that uses tokens only: the colour bars (`#branches-surface-legend` and `#graph4d-legend-bar`: `height: 12px; width: min(100%, 240px); border: 1px solid var(--border-strong); border-radius: 6px; background: ` + `hiddenRampCss()`), and the hidden state of `#branches-answer` (the `hidden` attribute). If a builder prefers a rule block, it injects one `<style data-for="branches">` (or `"graph4d"`) once, with tokens only, as the widgets do.
- **No `innerHTML`** with dynamic text; **no `scrollTo`**, no `focus()` on mount (rule 10.1.2); no `alert`/`confirm`/`prompt`; `localStorage` is not used (only `ctx.store.get('lab.strokes')`, inside try/catch).

---

## 6. Mathematics

Notation: `Arg z` in (-pi, pi]; `arg z = { Arg z + 2 pi k : k in Z }` (a set); sigma is the seam angle; `n` the root.

### 6.1 Branches of the n-th root

1. **The chosen name.** For a seam sigma, `theta_sigma(z)` is the one element of `arg z` in the window `(sigma, sigma + 2 pi]`:
   `theta_sigma = Arg z + 2 pi (floor((sigma - Arg z) / (2 pi)) + 1)` (this is `branchArg(z, sigma)`, with a guard for rounding). For sigma = -pi
   it is `Arg z`. A point **on** the seam ray (`Arg z = sigma` mod 2 pi) gets the closed end `sigma + 2 pi`.
2. **The branch.** `f_sigma(z) = |z|^(1/n) e^{i theta_sigma(z) / n}` and `f_sigma(0) = 0` (this is `branchRoot(z, n, sigma)`). Then `f_sigma(z)^n = |z| e^{i theta_sigma} = z`.
3. **All n values at z.** `w_k = |z|^(1/n) e^{i (theta_sigma + 2 pi k) / n}`, k = 0..n-1; `w_0 = f_sigma(z)`, `w_{k+n} = w_k`. They are the vertices of a regular n-gon on the
   circle of radius `|z|^(1/n)`, one `2 pi / n` apart. Dividing the staircase `theta + 2 pi k` by n is what spreads the copies into n points.
4. **The wedge.** `arg f_sigma(z) = theta_sigma / n` lies in `(sigma/n, sigma/n + 2 pi/n]`, so `f_sigma` maps `C minus {0}` one-to-one onto the wedge
   `W = { rho e^{i phi} : rho > 0, sigma/n < phi <= sigma/n + 2 pi/n }`, with inverse `w -> w^n`. For n = 3 the wedge is a third of a turn: `(0, 2 pi/3]` for sigma = 0
   and `(-pi/3, pi/3]` for sigma = -pi. The other n - 1 wedges of the partition are `W` turned by `2 pi j / n`: the images of the other branches with the same seam.
5. **Continuity and the jump.** `f_sigma` is continuous on `C` minus the closed ray `{ t e^{i sigma} : t >= 0 }`. Just counterclockwise of the ray the angle `theta` is
   close to sigma, so the value's angle is `sigma/n`; just clockwise of it theta is close to `sigma + 2 pi`, so the value's angle is `sigma/n + 2 pi/n`. The jump is
   multiplication by `e^{2 pi i / n}`, of size `|Delta| = 2 |w| sin(pi / n)`: for |w| = 1 and n = 2, 3, 4, 5 that is 2, 1.7320508, 1.4142136, 1.1755705.
6. **The negative real axis (problem 2.4.1).** Its points have `Arg = pi`. `pi` is strictly inside `(sigma, sigma + 2 pi)` exactly when `-pi < sigma < pi`. So for every seam
   except sigma = +-pi the negative real axis is **interior** to the window and `f_sigma` is continuous at each of its points, with `f_sigma(-r) = r^(1/n) e^{i pi / n}`. For sigma = -pi
   the axis is the seam and `f` jumps across it; for sigma = pi it is also the seam, with the value `r^(1/n) e^{i 3 pi / n}`.
7. **Monodromy.** `f_{sigma + 2 pi} = e^{2 pi i / n} f_sigma`. Turn the seam once around 0 (the slider from -pi to pi) and the branch you are on has become the next of the n branches that
   share that seam. At z = -1, n = 3: sigma = -pi gives `e^{i pi/3} = 0.5 + 0.866i`; sigma = pi gives `e^{i pi} = -1`.
8. **A seam passing over z.** For fixed z, `theta_sigma(z)` is constant while sigma moves, then jumps by `+2 pi` the moment sigma passes `Arg z` (upward), so the value is multiplied by
   `e^{2 pi i / n}`: "the seam passed over z, so the branch switched to the next root" (the transient note in 2.1.6).
9. **The Riemann surface.** `S_n = { (z, w) : w^n = z }`. Parametrise by `(r, theta)`, `theta` in `[0, 2 pi n)`: `z = r e^{i theta}`, `w = r^(1/n) e^{i theta / n}`. It is drawn as the point
   `(r cos theta, r sin theta, Im w)` coloured by `Re w`. Going once around 0 raises theta by 2 pi and lands on the next sheet; n times returns to the start. The branch `f_sigma` lives on
   the strip `theta in (sigma, sigma + 2 pi]`, one n-th of the surface. Over the seam ray the strip has two edges, at theta = sigma and at theta = sigma + 2 pi, at heights
   `t^(1/n) sin(sigma / n)` and `t^(1/n) sin((sigma + 2 pi) / n)`; the vertical gap between them is the jump of the height `Im w`.
10. **Walk test.** Sample `z_k` (61 points); `v_k = f_sigma(z_k)`; `maxStep = max_k |v_{k+1} - v_k|`; `maxAbs = max_k |v_k|`; the walk **jumps** iff `maxStep > 0.5 maxAbs`. A smooth walk has
    steps of order (path length / 60) / (3 |z|^(2/3)), here 0.005 to 0.013; a jump has a step of at least about `|w|` (here 1.73); the threshold `0.5 maxAbs` (0.52 to 0.63)
    sits a factor of about 40 above the largest smooth step and about 2.7 below the smallest jump.

### 6.2 The Cartesian form of the equation

Writing `w = u + iv` and `w^n = x + iy`, the binomial theorem gives
`x = Re (u + iv)^n = sum over even j of C(n, j) (-1)^{j/2} u^{n-j} v^j` and `y = Im (u + iv)^n = sum over odd j of C(n, j) (-1)^{(j-1)/2} u^{n-j} v^j`:

| n | `Re (u + iv)^n` | `Im (u + iv)^n` |
|---|---|---|
| 2 | `u^{2} - v^{2}` | `2uv` |
| 3 | `u^{3} - 3uv^{2}` | `3u^{2}v - v^{3}` |
| 4 | `u^{4} - 6u^{2}v^{2} + v^{4}` | `4u^{3}v - 4uv^{3}` |
| 5 | `u^{5} - 10u^{3}v^{2} + 5uv^{4}` | `5u^{4}v - 10u^{2}v^{3} + v^{5}` |

(these are the exact strings `powerParts(n)` returns). A coupled polynomial system in u and v: no short Cartesian formula for the root, which is the content of
`problems.js` 2.4.1 `routes.cart` ("a window in disguise").

### 6.3 What each address is good at here

Polar is native: the equation splits into `rho^n = r` (one real equation) and `n phi = theta + 2 pi k` (one angle equation, with the staircase visible); picking a branch is choosing
a window for theta. Cartesian is the check: cube the answer by repeated multiplication and compare with z (the explainer's `check` row and its `same point` footer).

### 6.4 Worked solution of 2.4.1, both addresses (hand-checked)

**Problem.** Find a branch of the cube root of z that is continuous along the negative x-axis.

**Polar form.**

1. Write `z = r e^{i theta}` with `theta` any element of `arg z`. A branch of `z^(1/3)` is `f(z) = r^(1/3) e^{i theta / 3}` where, at every z, one `theta` from `arg z` is chosen and the
   choice is continuous.
2. The negative real axis is `theta = pi` (mod 2 pi). For `f` to be continuous **across** it, `pi` must be strictly inside the window of allowed theta, not at an end.
   Choose the window `0 < theta <= 2 pi`: `pi` is in the middle. The seam is the positive real axis (`theta = 0` and `2 pi` are the same ray).
3. Answer: `f(z) = r^(1/3) e^{i theta / 3}` with `theta` the name of `arg z` in `(0, 2 pi]`. At `z = -1` (r = 1, theta = pi): `f(-1) = e^{i pi/3} = cos 60 degrees + i sin 60 degrees
   = 1/2 + (sqrt 3 / 2) i = 0.5 + 0.866025i`.
4. Continuity check at -1. From above, `z = -1 + 0.05i`: `Arg z = 3.091634`, `theta = 3.091634` in the window, `f = 0.514566 + 0.857936i`. From below, `z = -1 - 0.05i`: `Arg z = -3.091634`,
   `theta = Arg z + 2 pi = 3.191551`, `f = 0.485712 + 0.874595i`. Both are within 0.034 of `0.5 + 0.866025i`, and the distance between them, 0.0333, is `|dz| / (3 |z|^(2/3))
   = 0.1 / 3`: continuous.
5. Why the principal window `(-pi, pi]` fails: from above `theta -> pi`, `f -> e^{i pi/3}`; from below `theta -> -pi`, `f -> e^{-i pi/3}`. At `-1 +- 0.05i` the values are
   `0.514566 + 0.857936i` and `0.514566 - 0.857936i`, a gap of 1.7159, which tends to `|e^{i pi/3} - e^{-i pi/3}| = 2 sin(pi/3) = sqrt 3 = 1.7320508`.

**Cartesian form.**

1. Let `w = u + iv` with `w^3 = z = x + iy`: `u^3 - 3uv^2 = x` and `3u^2 v - v^3 = y`. Every `z != 0` has three solutions.
2. At `z = -1` (x = -1, y = 0): the second equation is `v (3u^2 - v^2) = 0`. If `v = 0` then `u^3 = -1`, so `w = -1`. If `v^2 = 3 u^2` then `u^3 - 9 u^3 = -8 u^3 = -1`, so `u = 1/2`
   and `v = +-sqrt 3 / 2`. The three roots are `-1`, `1/2 + (sqrt 3 / 2) i`, `1/2 - (sqrt 3 / 2) i`. Check the second root: `u^3 - 3uv^2 = 1/8 - 3 (1/2)(3/4) = 1/8 - 9/8 = -1`,
   `3u^2 v - v^3 = 3 (1/4)(sqrt 3/2) - 3 sqrt 3 / 8 = 0`.
3. A branch is a rule that picks one root at every z, continuously. Pick the root whose angle lies in the wedge `(sigma/3, sigma/3 + 2 pi/3]`. For sigma = 0 that is `(0 degrees, 120 degrees]`: of the
   three roots of -1 (angles 180, 60, -60 = 300 degrees) only `1/2 + (sqrt 3 / 2) i` (60 degrees) qualifies. So `f(-1) = 1/2 + (sqrt 3 / 2) i`, the same value.
4. The three roots of z depend continuously on z (they are simple roots of a cubic), so for z near -1 the root inside `(0, 120]` stays near 60 degrees and the pick never changes: continuous.
   With the principal wedge `(-60, 60]` the root at 60 degrees is on the closed edge at z = -1, but for `z = -1 - 0.05i` the roots are at 60.96, 180.96 and -59.04 degrees, so the pick is the
   one at -59.04 degrees: the pick jumps from the root near +60 to the root near -60 as z crosses the axis.

**Which address made it easy, and why.** Polar: a branch is a window for theta, the seam is where the window starts, and the question reduces to "is pi inside it". In Cartesian you
must already know the angle to choose the root (the "case split on signs of x and y" of the handout's route text).

### 6.5 Branch values, hand-checked (unit-test expectations; n = 3 unless stated; tolerance 1e-9)

| z | seam | window | `beta` (chosen theta) | `w = f(z)` |
|---|---|---|---|---|
| -1 | -pi | (-pi, pi] | pi | 0.5 + 0.866025403784i |
| -1 + 0.05i | -pi | | 3.09163425787 | 0.514565843061 + 0.857936263954i |
| -1 - 0.05i | -pi | | -3.09163425787 | 0.514565843061 - 0.857936263954i |
| -1 + 0.5i | -pi | | 2.67794504459 | 0.651122738962 + 0.808242861906i |
| -1 | 0 | (0, 2pi] | pi | 0.5 + 0.866025403784i |
| -1 + 0.05i | 0 | | 3.09163425787 | 0.514565843061 + 0.857936263954i |
| -1 - 0.05i | 0 | | 3.19155104931 | 0.485711677882 + 0.874595223987i |
| -1 - 0.5i | 0 | | 3.60524026259 | 0.374397481357 + 0.968010263876i |
| -8 | 0 | | pi | 1 + 1.73205080757i (= 2 e^{i pi/3}) |
| 1 | 0 | | 2 pi | -0.5 + 0.866025403784i (= e^{i 2pi/3}) |
| i | 0 | | pi/2 | 0.866025403784 + 0.5i (= e^{i pi/6}) |
| -i | 0 | | 3 pi/2 | i (= e^{i pi/2}; check i^3 = -i) |
| -1 | pi | (pi, 3pi] | 3 pi | -1 (monodromy: the other branch at -1) |

Hand checks: `-8`: `8^(1/3) = 2`, angle `pi/3`, `2 (1/2 + (sqrt 3/2) i) = 1 + sqrt 3 i`. `1` with seam 0: it sits on the seam so it takes the closed end `2 pi`, giving `e^{i 2 pi/3} = -1/2 + (sqrt 3/2) i`
(a cube root of 1, not the real one). `-i`: `Arg = -pi/2`, add `2 pi` to get `3 pi/2`, `e^{i pi/2} = i`, and `i^3 = -i` as required.

Walk numbers (61 samples, n = 3):

| Seam | Walk | jumps | maxStep | maxAbs | at | where |
|---|---|---|---|---|---|---|
| -pi | across | true | 1.72930663431 | 1.03789081556 | 30 | negative real axis |
| 0 | across | false | 0.00555535553474 | 1.03789081556 | -1 | none |
| -pi/2 or pi/2 | across | false | 0.00555535553474 | 1.03789081556 | -1 | none |
| pi | across | true | 1.72930663431 | 1.03789081556 | 30 | negative real axis |
| 3.1 | across | true | 1.72979118997 | 1.03789081556 | 27 | seam |
| 2.9 | across | true | 1.74587606930 | 1.03789081556 | 15 | seam |
| any | along | false | 0.0130137970282 | 1.25992104989 | -1 | none |

Index 30 is the sample `z = -1` (exactly, `0.5 - 30/60 = 0`) against the next one, `-1 - 0.01667i`.

### 6.6 The 4D graph and its rotations

The graph of `w = f(z)` is `G_f = { (x, y, u, v) : u + iv = f(x + iy) }`. `rotate4(p, { uv, yv })` rotates in the u-v plane by uv and then in the y-v plane by yv, and the
view shows `(x, y', u')` with `v'` as colour (`project4to3`):

```
u1 = u cos(uv) - v sin(uv);   v1 = u sin(uv) + v cos(uv)                 (first rotation)
y' = y cos(yv) - v1 sin(yv);  v' = y sin(yv) + v1 cos(yv)                (second rotation); u' = u1
so  y' = c2 y - s2 s1 u - s2 c1 v,   u' = c1 u - s1 v,   v' = s2 y + c2 s1 u + c2 c1 v        (c1 = cos uv, s1 = sin uv, c2 = cos yv, s2 = sin yv)
```

At uv = 90 degrees `(u', v') = (-v, u)`: the Re surface `(x, y, u)` becomes `(x, y, -v)`, the Im surface seen from below: the same object. At yv = 90 degrees `(y', v') = (-v, y)`: output
and input swap roles. The names are `shownNames(uv, yv)` (a coefficient is "1" when within 0.02 of +-1 and ignored when below 0.02):

| uv | yv | shown `(x, y', u')` | colour (hidden) |
|---|---|---|---|
| 0 | 0 | `(x, y, u)` | `v` |
| 90 | 0 | `(x, y, -v)` | `u` |
| 180 | 0 | `(x, y, -u)` | `-v` |
| 270 | 0 | `(x, y, v)` | `-u` |
| 0 | 90 | `(x, -v, u)` | `y` |
| 90 | 90 | `(x, -u, -v)` | `y` |
| 45 | 0 | `(x, y, 0.71u - 0.71v)` | `0.71u + 0.71v` |

Each row was checked against `rotate4` on the point `(0.3, -0.7, 1.1, 0.4)`: for (uv, yv) = (pi/2, 0), `rotate4 = (0.3, -0.7, -0.4, 1.1)`, which is `(x, y, -v)` with `u = 1.1` as colour; for
(0, pi/2), `(0.3, -0.4, 1.1, -0.7)`, which is `(x, -v, u)` with `y = -0.7` as colour; for (0.7, 1.3), `(0.3, -1.16485, 0.58364, -0.40309)` from both the library and the coefficients.

**Framing.** `|(x, y', u')| <= |(x, y, u, v)| <= S` for every rotation, where `S = hiddenScale` of the mesh (the largest 4-norm over the grid). So the graph always fits in the ball of radius S; the
group's `userData.frameRadius = S` frames it once and the camera never needs to move when an angle changes. `S`: sq 2.449490 (= sqrt 6: the corner z = 1 + i has `|z|^2 = 2`, `|w|^2 = 4`), sqrt-all 3.290658,
cbrt-all 3.162278, recip 4.246173, exp 4.725757.

### 6.7 The all-roots presets: why 2n half-plane pieces, and why they glue

`graph4D` draws a graph over a rectangle grid with one value per point. The n values of `z^(1/n)` are n different functions; the principal one is discontinuous across the negative real axis, and a
grid cell that straddles the axis would be drawn as a bridge between the two sides. So each sheet is drawn over a rectangle that does **not** straddle the real axis:

```
sheetFn(n, k, half)(z):  r = |z|;  if r = 0 -> 0
   theta = half === 'upper' ? atan2(im, re)                                         // in [0, pi]  for im >= 0 (atan2(+0, -1) = pi)
                            : (im === 0 && re < 0 ? -pi : atan2(im, re))             // in [-pi, 0] for im <= 0
   return r^(1/n) e^{i (theta + 2 pi k) / n}
pieces: for half in [upper, lower], k = 0..n-1:  graph4D over x in [-R, R], y in [0, R] (upper) or [-R, 0] (lower), 49 x 25 vertices
```

Gluing along the real axis: at `x > 0` both halves have `theta = 0`, so `U_k(x) = L_k(x)`. At `x < 0`: `U_k(x) = |x|^(1/n) e^{i (pi + 2 pi k)/n}` and `L_{k+1}(x) = |x|^(1/n) e^{i (-pi + 2 pi (k+1))/n}`
are the same number, so the upper piece k joins the lower piece `(k + 1) mod n` across the negative axis. Together the 2n pieces cover each of the n values over every z exactly once, and their edges coincide
as point sets: a continuous n-sheeted surface with no bridge. Checked numerically: the largest mismatch between glued edges is 0 and the largest `|w^3 - z|` over all pieces is `5.8e-15`.
Vertex counts: n = 2 gives 4 pieces, `4 x 49 x 25 = 4900`; n = 3 gives 6 pieces, `6 x 49 x 25 = 7350`; the single-valued presets give 2401 (sq), 2500 (recip: 50 x 50, an even grid so no vertex lands on the pole at 0)
and 2401 (exp). **7350 / 2401 = 3.06 >= 3**, which is what acceptance A4 needs.

What the picture shows. Over the negative real axis the pieces pair up as `U_k = L_{k+1}`, with angles `(pi + 2 pi k)/n`; their heights there are `Re = |x|^(1/n) cos((pi + 2 pi k)/n)` and
`Im = |x|^(1/n) sin((pi + 2 pi k)/n)`. For n = 3 the three pairs have `Re` factors 0.5, -1, 0.5 (two coincide: in the `(x, y, Re w)` view two different sheets pass through the same curve) and
`Im` factors 0.866, 0, -0.866 (all different: in the `(x, y, -Im w)` view the sheets stack like a spiral staircase and never cross). For n = 2 all four edges have `Re = 0`, and `Im` is +1 or -1 times
`|x|^(1/2)`. That is why the root presets start at uv = 90 degrees: the same surface, shown without the self-crossing.

### 6.8 Probe values (unit-test expectations; tolerance 1e-9)

| fn | z | `r` | `theta = Arg z` | `w = f(z)` | rule `(rho, phi)` |
|---|---|---|---|---|---|
| sq | 0.6 + 0.8i | 1 | 0.927295218 | -0.28 + 0.96i (Cartesian: 0.36 - 0.64, 2 (0.6)(0.8)) | (1, 1.854590436) |
| sq | 1 + i | 1.414213562 | 0.785398163 | 2i (Cartesian: 1 - 1, 2) | (2, pi/2) |
| sqrt-all | -1 + 0.5i | 1.118033989 | 2.677945045 | 0.242934136 + 1.029085514i | (1.057371263, 1.338972522) |
| sqrt-all | 2i | 2 | pi/2 | 1 + i | (1.414213562, pi/4) |
| cbrt-all | -1 + 0.5i | 1.118033989 | 2.677945045 | 0.651122739 + 0.808242862i | (1.037890816, 0.892648348) |
| cbrt-all | -1 | 1 | pi | 0.5 + 0.866025404i | (1, pi/3) |
| recip | 0.6 + 0.8i | 1 | 0.927295218 | 0.6 - 0.8i | (1, -0.927295218) |
| exp | 0.5 + i | 1.118033989 | 1.107148718 | 0.890807904 + 1.387351111i | (1.648721271, 1) |

Hand checks: `(0.6 + 0.8i)^2 = 0.36 - 0.64 + 0.96i`. For sqrt at `-1 + 0.5i`, the Cartesian formula gives `u = sqrt((1.118034 - 1)/2) = 0.242934`, `v = sqrt((1.118034 + 1)/2) = 1.029086`, the same as the polar rule.
`e^{0.5 + i} = e^{0.5} (cos 1 + i sin 1) = 1.648721 (0.540302 + 0.841471 i)`. The explainer's `same point` footer is `agree` for all of them (the Cartesian formula, the polar rule and `f` itself match).
Lift (`liftPoint`, f = z^2, z = 1 + i, so `(x, y, u, v) = (1, 1, 0, 2)`): uv = 0, yv = 0 gives `[1, 1, 0]`; uv = pi/2 gives `[1, 1, -2]`; yv = pi/2 gives `[1, -2, 0]`; f = 1/z at z = 0.01 with clamp 3 gives `[NaN, NaN, NaN]`.

### 6.9 The sphere shadow

A vertex of the unit sphere geometry at scene position `(sx, sy, sz)` is the plane-frame point `(X, Y, Z) = (sx, -sz, sy)` (the `riemannSphere` convention: scene `(X, Z, -Y)`), and the point of the plane
below it is `z = (X + iY) / (1 - Z)` (`inverseStereographic`; `Z = 1` is the north pole, the point at infinity, painted grey). The vertex colour is `colorOf(f(z), out, false)`: hue `Arg w / 2 pi`, lightness `1 - 1/(1 + sqrt|w|)`.
Pinned colours (`sphereColor(f, p)`, f = 1/z): at `p = stereographic(1) = (1, 0, 0)`, `w = 1`, colour `[230, 25, 25]` (red); at `stereographic(-1)`, `w = -1`, `[25, 230, 230]` (cyan); at `stereographic(i)`,
`w = -i`, `[128, 25, 230]` (violet); at the south pole (z = 0, a pole of 1/z) and the north pole: `[128, 128, 128]` (grey). For the principal cube root at `stereographic(-1)`: `w = e^{i pi/3}`, `[230, 230, 25]`.
Because the principal cube root has `|Arg w| <= pi/3`, only a third of the hue wheel (red through yellow and magenta) appears on its sphere, and the seam is a jump of hue along the negative real axis.

---

## 7. Verification plan

### 7.1 Commands (from the repo root)

```
npm test                                                                   # runs every unit test, including the new file
node --test tests/unit/i1-station-branches-graph4d.test.mjs                # this goal's tests only
node tools/smoke.mjs --route branches,graph4d,problem-2-4-1 --dark --wait 1500                                   # A1
node tools/smoke.mjs --route branches --script tests/interact/i1-station-branches-graph4d.mjs                    # A2 (desktop and phone)
node tools/smoke.mjs --route branches --script tests/interact/i1-station-branches-graph4d.mjs --dark             # A2, dark
node tools/smoke.mjs --route problem-2-4-1 --script tests/interact/i1-station-branches-graph4d.mjs --dark --out docs/review/iter-1/i1-station-branches-graph4d     # A3 shots
node tools/smoke.mjs --route graph4d --script tests/interact/i1-station-branches-graph4d.mjs --dark              # A4 (desktop, phone, dark)
grep -nE "branchRoot|branchArg|riemannSurfaceRoot|createView3D|graph4D|WALK_N|JUMP_FRACTION" js/stations/branches.js js/stations/graph4d.js     # A5
```

### 7.2 Unit tests, `tests/unit/i1-station-branches-graph4d.test.mjs` (Node `node:test`; imports `js/stations/branches.js`, `js/stations/graph4d.js`, `js/core/*.js`, `js/data/*.js`)

Both station modules must import in Node without a DOM (test **T0**: `await import(...)` does not throw and exports `mount` as a function).

| Id | Case | Expected |
|---|---|---|
| T1 | `windowText(-Math.PI)`, `(0)`, `(-Math.PI/2)`, `(Math.PI/2)`, `(Math.PI)`, `(1)`, `(0.5)` | `(-pi, pi]`, `(0, 2pi]`, `(-pi/2, 3pi/2]`, `(pi/2, 5pi/2]`, `(pi, 3pi]`, `(1, 7.283]`, `(0.5, 6.783]` |
| T2 | `seamFromSlider(v)` for v = 0.004, -3.14, `Number('-3.14159265358979')`, 1.57, 1, 3.138, -1.55, 0.021, NaN, 9, -9 | `0`, `-Math.PI`, `-Math.PI`, `Math.PI/2`, `1`, `Math.PI`, `-1.55`, `0.021`, `-Math.PI`, `Math.PI`, `-Math.PI` (the snapped ones are `===` the exact constants) |
| T3 | `magnetZ` | `({re:-0.9985, im:0.004}, 96)` gives `{-1, 0}`; `({-1.0071, -0.0489}, 71.6)` gives `{-1, -0.05}`; `({0.5237, 0.1}, 96)` unchanged; `({-0.003, -0.003}, 96)` gives `{0, 0}` and `Object.is(r.im, -0) === false`; `({0.004, 0}, 1000)` unchanged (tolerance 3 px = 0.003) |
| T4 | `branchAt(z, 3, seam)` values of 6.5 | beta and w within 1e-9 for all 13 rows; `w^3 = z` within 1e-12 for each; `roots.length === 3` and `roots[0]` equals `w`; `branchAt({re:0, im:0}, 3, 0).has === false` |
| T5 | `walkPoints('across')`, `('along')` | length 61; across: first `{-1, 0.5}`, `[30]` is `{-1, 0}` with `Object.is(im, 0)`, last `{-1, -0.5}`; along: first `{-2, 0}`, last `{-0.5, 0}`, `[1].re` equals -1.975 to 1e-12; `walkPoints('x')` equals `walkPoints('along')`; `walkPoints('across', 40).length === 41` |
| T6 | `classifyWalk(walkPoints(kind), pts.map(z => branchRoot(z, 3, seam)))` | the walk table of 6.5 (jumps, maxStep to 1e-9, at, where; seams -pi, 0, -pi/2, pi/2, pi, 3.1, 2.9 for `across`, and every seam for `along`); `classifyWalk([], [])` gives `{jumps:false, maxStep:0, maxAbs:0, at:-1, where:null}` |
| T7 | jump sizes: `abs(sub(branchRoot(-1, n, -pi), branchRoot({-1, -1e-12}, n, -pi)))`, n = 2..5 | `2 sin(pi/n)` within 1e-9: 2, 1.7320508, 1.4142136, 1.1755705 |
| T8 | `readoutText(branchAt(...))` | the twelve exact strings R1 to R12 of Appendix A |
| T9 | `polarText`, `staircaseLabel`, `negAxisStatus`, `wedgeOf` | `polarText(1, -Math.PI/3) === 'e^(-i pi/3)'`; `(1.0379, 0.893) === '1.038 e^(i 0.893)'`; `(2, 0) === '2'`; `(1.000416, -1.031) === 'e^(-i 1.031)'`; `(0.5, Math.PI) === '0.5 e^(i pi)'`; `staircaseLabel(-Math.PI) === 'arg z'`, `(0)` and `(-3.1)` give `'θ'`; `negAxisStatus(-Math.PI)` and `(Math.PI)` give `'edge'`, `(0)` and `(3.1)` give `'inside'`; `wedgeOf(0, 3)` is `{from: 0, to: 2*Math.PI/3}`, `wedgeOf(-Math.PI, 3)` is `{from: -Math.PI/3, to: Math.PI/3}` |
| T10 | `powerParts(n)` | the four rows of 6.2 exactly |
| T11 | `rootName`, `fractionName`, `seamNote` | `rootName(2..5)` = square, cube, fourth, fifth; `fractionName(2..5)` = half, third, quarter, fifth; `seamNote(-Math.PI, 3)` contains `negative real axis` and `jumps`; `seamNote(0, 3)` contains `inside the window`; `seamNote(Math.PI, 3)` also contains `(pi, 3pi]` and `next of the 3 branches` |
| T12 | data coupling: `problemById('2.4.1').answer.values` | `seam === 0`; `window` equals `[0, 2*Math.PI]`; `atMinusOne` equals `branchAt({-1, 0}, 3, 0).w` within 1e-9; `principalJumps === classifyWalk(...across, principal).jumps` |
| G1 | `totalVertices(id)` and `meshSpecs(id).length` | sq 2401 (1 piece), sqrt-all 4900 (4), cbrt-all 7350 (6), recip 2500 (1), exp 2401 (1); `totalVertices('cbrt-all') >= 3 * totalVertices('sq')`; `meshSpecs('nope')` is `[]` |
| G2 | pieces of `meshSpecs('cbrt-all')` | six specs, each `nx 49`, `ny 25`, `xRange [-2, 2]`; three with `yRange [0, 2]` and three with `[-2, 0]`; building them with `graph4D` gives `vertexCount` 1225 each and equal `hiddenScale` (3.162278 within 1e-6) |
| G3 | `sheetFn` | for n = 3, all k, both halves, 400 grid points: `abs(sub(pow(sheetFn(...)(z), 3), z)) < 1e-12`; gluing: for 49 x in [-2, 2] and k = 0..2, `sheetFn(3, k, 'upper')({x, 0})` equals `sheetFn(3, k, 'lower')` for x >= 0 and `sheetFn(3, (k + 1) % 3, 'lower')` for x < 0 (to 1e-12) |
| G4 | `shownNames` | the seven rows of 6.6, as `{ y, u, hidden }`; consistency with `rotate4` on `[0.3, -0.7, 1.1, 0.4]` for (pi/2, 0), (0, pi/2) and (0.7, 1.3) using the coefficient formulas of 6.6 (1e-12) |
| G5 | `readoutText` | `{uv:0, yv:0}`: `showing (x, y, u) with v as colour; uv = 0°, yv = 0°`; `{uv: Math.PI/2}`: `showing (x, y, -v) with u as colour; uv = 90°, yv = 0°`; `{uv: Math.PI}`: `showing (x, y, -u) with -v as colour; uv = 180°, yv = 0°`; `{uv: 0, yv: Math.PI/2}`: `showing (x, -v, u) with y as colour; uv = 0°, yv = 90°`; `{mode: 'landscape'}` contains `|w|`; `{mode: 'sphere'}` contains `Riemann sphere` |
| G6 | `snapAngle`, `degText` | `snapAngle(1.57) === Math.PI/2`, `(3.14) === Math.PI`, `(6.28) === 2*Math.PI`, `(4.72) === 3*Math.PI/2`, `(0.01) === 0`, `(0.7) === 0.7`, `(0.03) === 0.03`, `(NaN) === 0`; `degText(Math.PI/2) === '90°'`, `(2*Math.PI) === '360°'` |
| G7 | `probeValues(id, z)` | the eight rows of 6.8 (to 1e-9) and `agree === true` each; `wc === null` for cbrt-all |
| G8 | `liftPoint` | the four cases of 6.8 |
| G9 | `extractShapes` | `null` and `'junk'`: `total` 0; `[pts]` 1 shape of 1 curve; the bare list `pts` 1; `[{points: pts}, {points: pts}]` 2; `[{curve: {points: pts}}]` 1; `{shapes: [circle]}` 1 shape, 1 curve, 129 points; `[{kind:'freehand', points: pts}]` 1 shape `freehand`; `[pts, 5, null, {foo: 1}]` total 1. **A Lab sector is 1 shape with 8 curves and 488 points; an annulus is 1 shape, 12 curves, 652 points.** The five Lab presets (sector, annulus, segment, freehand, circle): 5 shapes, 23 curves, 1337 points, nothing left out. `[circle, cartGrid]`: total 2, 1 drawn, `left = [{ kind: 'cartGrid', why: 'grid' }]`. `[{kind:'weird'}, circle with r NaN, null, 7]`: total 2, both `unreadable`. A stroke of 1000 points is cut to 334 points keeping the first and the last (`re` 0 and 0.999). A list with one NaN point drops it (3 of 4 kept). |
| G9b | the caps | `STROKE_LIMITS` is `{ shapes: 20, curves: 80, curvePoints: 400, totalPoints: 4000 }`. 30 strokes of 400 points: 10 drawn (4000 points), 20 left out (`limit`). 30 strokes of 100 points: 20 drawn (2000 points; the shape cap comes first), 10 left out. 40 circles (the Lab's maximum): 20 drawn, total 40. Twelve sectors: 8 drawn (8 x 488 = 3904 <= 4000; a ninth would make 4392), 64 curves, 4 left out: a shape is drawn whole or not at all. |
| G9c | `strokesPanelText`, `leftOutText` | The sentences of 2.2.5: `[circle]` gives the one-circle sentence; `[sector]` says `The Lab has 1 shape.`; `[sector, annulus]` says `The Lab has 2 shapes.`; `[circle, sector, cartGrid]`: `The Lab has 3 shapes. 2 of them are drawn ... Left out: 1 grid (grids stay in the Lab).`; `[grid]`: `The Lab has 1 shape. It cannot be drawn on the graph. Left out: 1 grid (grids stay in the Lab).`; 22 circles: `The Lab has 22 shapes. 20 of them are drawn ... Left out: 2 more shapes (the graph keeps at most 20 shapes and 4000 points).` |
| G13 | `probeRows` x `probeModelFor` | No row cell of any preset throws on the model of any other preset (5 models x 4 points, including z = 0 and z = -1, x (3 presets with 4 rows + 2 root presets with 5 rows) x 2 columns = 880 cells): the explainer redraws new rows with the old model first. The cube-root `w` row prints `u + iv = 0.651 + 0.808i` at z = -1 + 0.5i, and so does the `sq` row given that model (the guard is the model's `wc`, not the row's id). |
| G14 | the `w` row, polar cell | Root presets: `\rho = 1.038, \varphi = \operatorname{Arg} z / 3 = 0.893` at z = -1 + 0.5i (cube root); `\operatorname{Arg} z / 2` for the square root; single-valued presets have no `Arg z / n`. |
| T13 | `ledeText`, `countName` | `The cube root has three values at every point.`, `The square root has two ...`, `The fourth root has four ...`, `The fifth root has five ...`. |
| T14 | `chooseLabelSpot` | For theta = pi, the default point, near pi/2, below the axis, theta = -pi, a small angle and theta = 3pi, on a plane of 86 px per unit with the origin at (233, 235): the label box overlaps none of the tick-label or handle-label rectangles. An unobstructed angle (1.4) keeps the natural place: 8 px outside the arc at 0.7 rad, left aligned. Fix round 2: the list is the station's own `labelObstacles(toPixel, Z)` (the handle's dot too) and the cases `0.2 + 0.15i`, `1 + 0.05i`, `0.1 + 0.1i`, `0.3 - 0.05i` are added; every case also checks that the ray from the origin to z does not run through the label. |
| G10 | `FUNCS` against the data | for each id: `fnById(FUNCS[id].fnId)` exists and its `stations` includes `'graph4d'`; `FUNC_ORDER` equals the five ids; the angles of `sqrt-all` and `cbrt-all` are `{uv: Math.PI/2, yv: 0}` |
| G11 | `sphereColor(inv, p)` | the five pinned colours of 6.9 (exact integers) |
| T15 | `wCaptionText(n)` | `n = 2`: ends `Grey dot: the other root of z.` and contains `one half of a turn`, never `1 roots`; `n = 3, 4, 5`: ends `Grey dots: the other ${n - 1} roots of z.` |
| G15 | `createBead(k)` | k = 0, 1, 2: name `graph4d-probe-k`; `depthTest === false`, `depthWrite === false`, `transparent === true`, `renderOrder >= 5`; the principal bead has the higher render order. |

All numbers above are in 6.5 to 6.9 and Appendix A; none is a floating-point coincidence (each was recomputed independently).

### 7.3 Interaction script, `tests/interact/i1-station-branches-graph4d.mjs`

One file, one `export default async function (page, ctx)` that dispatches on `ctx.route` (`branches`, `graph4d`, `problem-2-4-1`; any other route logs and returns). Imports from `./_helpers.mjs`:
`dragHandle, clickChip, readText, setSlider, settle, parseCart, nums`. No `expectedErrors`. It must pass at 1280 x 860 (light and `--dark`) and at 390 x 844.

```js
async function waitText(page, selector, re, timeout = 3000) {
  await page.waitForFunction(({ selector, src }) => { const el = document.querySelector(selector); return !!el && new RegExp(src).test(el.textContent); },
    { selector, src: re.source }, { timeout });
  return readText(page, selector);
}
```

**Route `branches`** (the state on load is the principal seam):

1. `await page.waitForSelector('#branches-zplane-z')`. `r = readText('#branches-readout')`: assert it contains `seam = -pi`, `window (-pi, pi]`, `z = -1 + 0.5i`. Assert `window.__mv.branches.state().seam === -Math.PI`.
2. `await clickChip(page, 'branches-walk-across')`. Assert the status is `walking...` right after the click (the click handler set it synchronously; skip this check if the page reports reduced motion). `t = await waitText('#branches-walk-status', /jumps/)`: assert `jumps at the negative real axis`, `data-state="jumps"`, and `state().walk.maxStep > 1.5`. **(A2: "jumps")**
3. `await clickChip(page, 'branches-seam-positive')`. `r = readText(readout)`: assert it contains `window (0, 2pi]` (or `(0, 6.283]`) and `seam = 0`; assert `#branches-seam-positive` has `aria-pressed="true"` and the status is back to `No walk yet.` (the seam change clears the walk).
4. `await clickChip(page, 'branches-walk-across')`; `await waitText(status, /continuous/)`; assert `state().walk.maxStep < 0.05`. **(A2: "continuous")**
5. `await clickChip(page, 'branches-walk-along')`; `await waitText(status, /continuous/)`. **(A2: "walk-along continuous")**
6. `z = await dragHandle(page, 'branches-zplane-z', { re: -1, im: 0 })`; assert `z.re === -1 && z.im === 0` (exact: the magnet). `r = readText(readout)`: assert it contains `0.5 + 0.866i` and `pi/3`. **(A2)**
7. `await clickChip(page, 'branches-seam-principal')`; assert the readout still contains `0.5 + 0.866i` and now `seam = -pi`. **(A2)**
8. `await dragHandle(page, 'branches-zplane-z', { re: -1, im: -0.05 })`; `r = readText(readout)`: assert `/0\.5\d* - 0\.8\d*i/.test(r)`; `m = r.match(/= (-?[\d.]+ [+-] [\d.]+i); chosen theta/)`; `w = parseCart(m[1])`; assert `0.51 < w.re < 0.52` and `-0.86 < w.im < -0.85`. **(A2: "0.5 - 0.8")**
9. Extras (not in the planner's list, they guard the design): `setSlider(page, 'branches-seam', -Math.PI / 2)`: readout contains `seam = -pi/2` and `window (-pi/2, 3pi/2]`, `#branches-seam-negimag` is pressed. `setSlider(page, 'branches-n', 4)`: readout contains `z^(1/4)`; set it back to 3. `await clickChip(page, 'branches-stairs-k1')`: `#branches-pick` matches `/Step k = 1/`. Drag z to `{re: 0, im: 0}`: readout contains `the branch point`. `window.__mv.views3d.get('branches-surface')` exists; unless `unavailable`, its scene has an object named `riemann-root`. `await clickChip(page, 'branches-load-2-4-1')`: readout contains `seam = 0` and `z = -1`; click `branches-answer-toggle`: `#branches-answer` is no longer hidden. `await ctx.shot('after-walk')`.

**Route `graph4d`**:

1. `r = readText('#graph4d-readout')`: assert it contains `(x, y, u)` and `v as colour`. **(A4)**
2. `await setSlider(page, 'graph4d-uv', Math.PI / 2)`; `r = readText(readout)`: assert `/\(x, y, -?v\)/.test(r)`, it contains `u as colour` and `uv = 90°`. **(A4)**
3. `await clickChip(page, 'graph4d-fn-sq')`; `n1 = await page.evaluate(() => window.__mv.graph4d.vertexCount)` (assert 2401); `await clickChip(page, 'graph4d-fn-cbrt-all')`; `n3 = ...` (assert 7350); assert `n3 >= 3 * n1`. **(A4)**
4. `await clickChip(page, 'graph4d-landscape')`; `r = readText(readout)`: assert it contains `|w|`; `#graph4d-landscape` has `aria-pressed="true"`; `window.__mv.graph4d.mode === 'landscape'`. **(A4)**
5. Extras: `clickChip('graph4d-sphere')`: readout contains `Riemann sphere`, `mode === 'sphere'`, the landscape chip is no longer pressed, `shownVertexCount === 6305`, `vertexCount === 7350` still. `setSlider('graph4d-yv', Math.PI / 2)`: mode is `graph` again and the readout contains `uv = 90°, yv = 90°`. `clickChip('graph4d-angles-reset')`: readout contains `uv = 0°, yv = 0°`. Spin: `clickChip('graph4d-spin')`, wait 400 ms, assert `Number(await page.inputValue('#graph4d-uv')) > 0.05` (skip under reduced motion), click again to stop, assert `mv.graph4d.spinning === false`. Probe: `dragHandle(page, 'graph4d-plane-z', { re: 0.5, im: 0.5 })`; `#graph4d-ex-same` has `data-agree="true"`. Strokes: `await page.evaluate(() => localStorage.setItem('mv:lab.strokes', JSON.stringify([{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }])))`, `await page.reload()`, wait for `#graph4d-readout`, assert `window.__mv.graph4d.strokeCount === 1` and `#graph4d-strokes` contains `The Lab has 1 shape.`; then the Lab's own format with a sector, an annulus, a circle and a grid: `shapeCount === 4`, `liftedShapeCount === 3`, `strokeCount === 21` (8 + 12 + 1), the panel says `The Lab has 4 shapes.`, `3 of them are drawn` and `Left out: 1 grid`; finally `localStorage.removeItem('mv:lab.strokes')`. Presets: after `cbrt-all`, click `sq, exp, recip, sqrt-all, cbrt-all, recip, cbrt-all, sq, cbrt-all` with a `console` listener on the page: no `error` message (the first build logged `[explainer graph4d-ex] w/cart: Cannot read properties of null (reading 're')` on `cbrt-all` then any other preset), `#graph4d-ex-w-cart` has `u + iv = ` and `#graph4d-ex-w-polar` has `Arg} z / 3`. Chips: the `<sup>` of the `e^z` chip is inside a `span` that is the only child of the button, has `vertical-align: super` and its centre is more than 1.5 px above the centre of the label; the gap between the `1/3` of the cube-root chip and the following comma is under 3 px. The legend wheel canvas is `aria-hidden`. branches: the lede says `The square root has two values at every point.` at n = 2 and the surface title says `square root`; `#branches-stairs-set` starts with `arg z = {` at seam -pi/2 (home row `θ = `) and at the principal seam (home row `Arg z = `); the beads, the floor marker, the fibre, the floor line and both edges of the surface have `depthTest === false`, the start edge has at least 3 dashes and the end edge is one piece. `await ctx.shot('cbrt-all-uv90')` after selecting `cbrt-all` (the preset angle is 90 degrees).

Fix round 2 additions to the script: **branches**, at n = 2 `#branches-wcap` contains `Grey dot: the other root of z.` (and not `1 roots`), back at n = 3 `Grey dots: the other 2 roots of z.`; before "Show the answer" no `.callout` of `#branches-problem` is visible and the visible text does not contain the window or `e^{i pi/3}`; after the toggle `#branches-answer` shows the cart and the polar bar; screenshots `label-seam0-small` (z = 0.2 + 0.15i, seam 0) and `label-seam0-right` (z = 1 + 0.05i). **graph4d**, on the `z^(1/3), all roots` preset: three beads `graph4d-probe-0..2`, each with `depthTest === false`, `depthWrite === false`, `visible`, render order >= 5 and a radius on screen of at least 4 px (scale / (2 d tan(fov / 2) / canvas height)); in Riemann-sphere mode, where the default probe is on the back hemisphere, the three beads are still visible with `depthTest === false`; screenshots `cbrt-beads` and `sphere-beads`.

**Route `problem-2-4-1`** (acceptance A3): wait for `#branches-readout`; assert it contains `seam = 0`, `window (0, 2pi]`, `z = -1`, `0.5 + 0.866i`, `pi/3`; `state().seam === 0 && state().n === 3`; `await ctx.shot('a3')` (desktop, phone, dark). The screenshot is read by Review B (7.4).

### 7.4 Acceptance criteria

| Id | Method | Command | What passing looks like |
|---|---|---|---|
| A1 | smoke | `node tools/smoke.mjs --route branches,graph4d,problem-2-4-1 --dark --wait 1500` | Nine `ok` lines (three routes, desktop, phone, desktop-dark), exit 0: no console error, no page error, no failed or external request, no horizontal overflow at 390 px, no router error panel. WebGL warnings are `warning`, not `error`. |
| A2 | interaction script | the `branches` steps of 7.3 | All assertions pass at the three viewports; the walk polls finish in under 2 s (the walk takes 1.6 s); the readout after step 6 contains `0.5 + 0.866i` and `pi/3`; after step 8 it contains `0.515 - 0.858i`. |
| A3 | screenshot review | the `problem-2-4-1` run | In the desktop and dark shots: the z-plane shows a **dashed seam along the positive real axis** with the label `seam` and the axis line erased under the dashes, the negative real axis solid and uncut, the dot z on it at -1, the solid arc `θ = π`, the faint rings, and the top-left text `window (0, 2π]`; the w-plane shows a **shaded wedge from angle 0 to 120 degrees**, solid on the 120-degree edge and dashed on the 0-degree edge, with the value dot at 60 degrees (`Arg w = π/3`) inside it and two grey dots (the other roots). In the full-page shot the surface panel shows the three-sheet surface. On the phone shot the planes are stacked, 358 px wide, no overflow. |
| A4 | interaction script | the `graph4d` steps of 7.3 | Readouts as listed; `vertexCount` 2401 then 7350 (ratio 3.06); the landscape readout contains `|w|`. |
| A5 | code inspection | the `grep` of 7.1 plus reading the files | `branches.js` imports `branchRoot` and `branchArg` from `../core/complex.js` and `riemannSurfaceRoot` and `createView3D` from `../core/three-view.js`; branch values come only from `branchRoot` and `branchArg` (no hand-written arctangent window); `startWalk` builds 61 samples (`WALK_N = 60`) and `classifyWalk` reports `jumps` iff `maxStep > 0.5 * maxAbs` (`JUMP_FRACTION`); the status string is derived from `classifyWalk`, not set by the button; `graph4d.js` imports `createView3D` and `graph4D` from `../core/three-view.js`. |

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| z = 0 (reachable: the lattice has a node there) | `branchAt` gives `has: false`; readout, explainer, staircase (`update(null)`), arcs and 3D beads handle it (2.1.5). `graph4d`: the 1/z probe at 0 shows `f is not defined at 0 (the pole)` and hides the beads. |
| z exactly on the seam | The closed end of the window is used (`beta = sigma + 2 pi`); the w dot lands on the closed (solid) wedge edge. Example: seam 0, z = 1 gives `e^{i 2pi/3}`. |
| Seam slider jitter | The magnets make the five exact seams easy to land on; everything else is a plain float. State is the truth, never the slider's string (it is rounded to 15 digits). |
| Seam = pi | Same ray as -pi, next branch: `z = -1` gives `-1`. The seam note says so. |
| n changes while a walk runs or a root is picked | `setN` clears the walk and the pick, rebuilds the surface, the explainer rows and the captions. |
| The user drags z during a walk | `interrupt()` cancels the walk (status back to idle) and gives the readout back to z. |
| Route change or unmount during a walk | `cancelAnimationFrame`; `disposed` guards every callback. |
| Theme flip mid-walk | Planes and views re-theme; the walk continues. |
| `|z| > 2` | Beads and fibre hidden, the far-out line shown. The planes and the explainer still work. |
| `ctx.preset` is a topic or an unknown token | Default state. |
| Arrow-key nudges near a lattice node | Exact (not snapped): `nudging` flag; Alt moves 0.01. |
| Plane zoomed in | The magnet radius shrinks to 3 px; zoomed far out the lattice is finer than a pixel and the magnet is effectively off. |
| `graph4d`: slider at its maximum (2 pi) | `snapAngle(2 pi) = 2 pi`: readout `360°`; the spin wraps at 2 pi to 0. |
| `graph4d`: a function chip while spinning, or in landscape or sphere mode | Spin continues; the mode is kept; the landscape and sphere are rebuilt for the new function. |
| `graph4d`: strokes with NaN, huge or malformed points, or an unknown store format | `extractShapes` drops NaN points, reports an unreadable shape as left out, and never throws; at worst the panel says there are none. A stroke point where `|u|` or `|v|` exceeds the clamp breaks the drawn line there. |
| `graph4d`: exp near the right edge | `|w|` up to `e^1.2 = 3.32`: no clamping (clamp 6). |
| `graph4d`: root presets at the origin and along the real axis | All 2n pieces share the vertex at 0; the gluing of 6.7 makes the seam invisible. |
| WebGL missing, or the context lost | `view.unavailable`: the library prints the message; both stations keep every other control and number working (no control is disabled for this reason). |

### 8.2 Performance plan

- One `refresh()` per state change; planes redraw through `requestDraw()` (one rAF per burst); the explainer coalesces to one render per frame; the staircase updates its text synchronously (cheap).
- `branches`: per frame while dragging z or walking: 1 branch evaluation, n + 1 marker moves, one 2-point line update, two plane redraws. The surface is rebuilt only when n changes (12 ms at n = 5).
- `graph4d`: angle changes are coalesced to one `setAngles` per piece per frame (7350 vertices: 4 ms in the browser **[measured]**); the spin callback exists only while spinning; the landscape and sphere meshes are built lazily and dropped on a function change; strokes are limited to 4000 points in total and 400 per stroke.
- Targets: 60 fps on z drag (2D); at least 30 fps for 3D at the default sizes (graph meshes 2401 to 7350 vertices, sphere 6305).
- Memory: every `disposeObject` / `dispose()` on function change, n change and unmount.

### 8.3 Accessibility

- Every control has a visible label or `aria-label`; chips are real buttons with `aria-pressed`; the toggles and Spin use `aria-pressed`; the answer button uses `aria-expanded` and `aria-controls`.
- Live regions (`aria-live="polite"`): `#branches-seam-note`, `#branches-pick`, `#branches-walk-status` (`role="status"`). The readouts are not live (the plane handle announces its own address while dragged).
- The handles are focusable buttons with the plane widget's address labels; arrow keys move them; the staircase rows are buttons with roving focus; sliders are native.
- Colour is never the only cue: the seam is dashed and labelled, the open wedge edge is dashed and the closed edge solid, the chosen arc is thicker than the ghosts and labelled, the walker is a ring and z a dot, the jump chord is dashed and labelled `jump`, the explainer columns are headed `Cartesian` and `Polar`.
- Contrast: all colours are theme tokens (checked in the shell goal); the viridis legend bar has a border because its dark end is low contrast on the dark surface.
- The 3D views are `role="group"` with an `aria-label` (library); everything they show also exists as numbers: the readout, the probe numbers and the explainer in `graph4d`; the readout, the explainer and the planes in `branches`.
- Focus is never moved on mount; every focus ring comes from the shell's styles.

### 8.4 Reduced motion

Read through `ctx.theme.prefersReducedMotion()` at action time. Walks jump to their final state (path, image, chord and status complete at once; the status is still computed). Spin becomes a stepper (`Turn 45 degrees`). The 3D view's damping and auto-rotate are already off (library). No other motion exists (the staircase's pulse is disabled by its own media query).

### 8.5 Phone layout (390 px, content 358 px)

One column everywhere. Planes `width: 100%` (358 x 358, `maxWidth` 520 px only caps desktop); `.two-planes` stacks below about 760 px; the 3D views are 358 x 268 (4:3, minimum height 220); chips wrap; `.slider-row` puts the label above the range below 480 px; the readout wraps (`white-space: pre-wrap`, `overflow-wrap: anywhere`); the explainer stacks its cells (a prototype at 390 px had no horizontal overflow **[measured]**); the staircase is a narrow list; the corner text of the z-plane is 12 px and fits (the plane widget also shrinks its own labels below 420 px); handles have a 44 px hit area on coarse pointers; walk buttons are 44 px high and wrap their text. The smoke harness checks `document.documentElement.scrollWidth - clientWidth <= 1` for every route at 390 px.

---

## 9. Out of scope

- The Lab UI, its drawing tools, and the format of `lab.strokes` (this goal only reads it, tolerantly).
- The principal-root station and its sweep (2.2.2), the reciprocal station's own sphere and its half-turn, the staircase station's helix.
- A second seam, branch points other than 0, other multi-valued functions (log, powers with non-integer exponents), the n-th roots of numbers other than the point z.
- Selecting a branch other than "the first branch for this seam" on the slider (only the monodromy end at seam = pi shows the next one).
- Editing `css/components.css`, `js/registry.js`, `js/core/*` (see the requests in Appendix C).
- Narration, video, audio (media track), `localStorage` persistence of this station's state.
- A graph of arbitrary parsed functions (the Lab's 4D view); graph4d offers five presets.

---

## Appendix A: expected values in one place

Readout strings (test T8), `readoutText(branchAt(z, n, seam))`:

```
R1  (-1,        3, -pi)   seam = -pi; window (-pi, pi]; z = -1; z^(1/3) on this branch = e^(i pi/3) = 0.5 + 0.866i; chosen theta = pi; Arg z = pi
R2  (-1+0.5i,   3, -pi)   seam = -pi; window (-pi, pi]; z = -1 + 0.5i; z^(1/3) on this branch = 1.038 e^(i 0.893) = 0.651 + 0.808i; chosen theta = 2.678; Arg z = 2.678
R3  (-1-0.05i,  3, -pi)   seam = -pi; window (-pi, pi]; z = -1 - 0.05i; z^(1/3) on this branch = e^(-i 1.031) = 0.515 - 0.858i; chosen theta = -3.092; Arg z = -3.092
R4  (-1,        3, 0)     seam = 0; window (0, 2pi]; z = -1; z^(1/3) on this branch = e^(i pi/3) = 0.5 + 0.866i; chosen theta = pi; Arg z = pi
R5  (-1-0.5i,   3, 0)     seam = 0; window (0, 2pi]; z = -1 - 0.5i; z^(1/3) on this branch = 1.038 e^(i 1.202) = 0.374 + 0.968i; chosen theta = 3.605; Arg z = -2.678
R6  (-i,        3, 0)     seam = 0; window (0, 2pi]; z = -i; z^(1/3) on this branch = e^(i pi/2) = i; chosen theta = 3pi/2; Arg z = -pi/2
R7  (1,         3, 0)     seam = 0; window (0, 2pi]; z = 1; z^(1/3) on this branch = e^(i 2pi/3) = -0.5 + 0.866i; chosen theta = 2pi; Arg z = 0
R8  (0,         3, 0)     seam = 0; window (0, 2pi]; z = 0; z^(1/3) on this branch = 0 (the branch point: all 3 roots meet here)
R9  (-1,        3, pi)    seam = pi; window (pi, 3pi]; z = -1; z^(1/3) on this branch = e^(i pi) = -1; chosen theta = 3pi; Arg z = pi
R10 (0.5-0.5i,  3, -pi/2) seam = -pi/2; window (-pi/2, 3pi/2]; z = 0.5 - 0.5i; z^(1/3) on this branch = 0.891 e^(-i pi/12) = 0.861 - 0.231i; chosen theta = -pi/4; Arg z = -pi/4
R11 (-1,        2, -pi)   seam = -pi; window (-pi, pi]; z = -1; z^(1/2) on this branch = e^(i pi/2) = i; chosen theta = pi; Arg z = pi
R12 (-1+0.5i,   5, 1)     seam = 1; window (1, 7.283]; z = -1 + 0.5i; z^(1/5) on this branch = 1.023 e^(i 0.536) = 0.879 + 0.522i; chosen theta = 2.678; Arg z = 2.678
```

Corner text of the z-plane (`fmtAngle(x, {unicode: true})`): seam 0, z = -1: `window (0, 2π]` and `also -π, 3π`; seam -pi, z = -1 + 0.5i: `window (-π, π]` and `also -3.605, 8.961`;
seam 0, z = -1 - 0.5i: `window (0, 2π]` and `also -2.678, 9.888`.

graph4d: `vertexCount` sq 2401, sqrt-all 4900, cbrt-all 7350, recip 2500, exp 2401; `shownVertexCount` landscape 2401 (sq), 2500 (recip), sphere 6305; `hiddenScale`: 2.449490, 3.290658, 3.162278, 4.246173, 4.725757;
1/z landscape (clamp 6, 50 x 50) has 12 clamped vertices; the sphere geometry has `(96 + 1)(64 + 1) = 6305` vertices.

## Appendix B: build order and reviewer checklist

Build order:

1. Pure helpers of `branches.js` and tests T0 to T12; pure helpers of `graph4d.js` and tests G1 to G11 (these fix every number before any DOM exists).
2. `branches.js` `mount`: DOM, planes and layers, handle with magnet, readout; then the staircase and explainer; then the walks; then the 3D surface; then the problem panel and links.
3. `graph4d.js` `mount`: single-valued presets with `graph4D` and angles; the readout; then the root presets (`meshSpecs`); then landscape, sphere, spin; then the probe, explainer and strokes.
4. `tests/interact/i1-station-branches-graph4d.mjs`; run all commands of 7.1 at desktop, phone and dark; read the screenshots (A3) and fix.
5. Build notes: add any deviation at the end of this file (Appendix D, written by the builder).

Reviewer checklist (Review A, build against this design): the ids of 2.1.3 and 2.2.2 exist; the copy of 2.1.6 and 2.2.6; readout formats (4.4) for R1 to R12 and G5; the magnet (T3); the walk status strings and `data-state`; the seam mask and the dashed/solid wedge edges (3.1, 3.2); the staircase label rule (`arg z` only at -pi); the 2n half pieces (G2, G3); `vertexCount` semantics (D8); mode switching by sliders (D9); the sphere built from `inverseStereographic` with unit-radius vertices (6.9); no `innerHTML` of dynamic text; every listener and rAF removed in `unmount`; `window.__mv` extended, never replaced; nothing in `js/core`, `css` or the registry edited.
Review B (delivery against the goal): run the acceptance commands; look at the A3 screenshots in both themes and at 390 px; check the 2.4.1 numbers in the readout against 6.4.

## Appendix C: risks, requests to other owners, deviations to copy into ARCHITECTURE

Risks:

- **R1.** The planner's A2 text "readout has `0.5 - 0.8`" cannot be satisfied literally: at `z = -1 - 0.05i` the value is `0.515 - 0.858i` (three decimals), which does not contain the substring `0.5 - 0.8`. The script checks the regular expression `/0\.5\d* - 0\.8\d*i/` and the parsed numbers. A reviewer who insists on the literal substring will see a failure that no correct implementation can avoid.
- **R2.** A pointer drag only lands on exact points because of the 0.05 magnet (T3). If a later change removes the magnet, `dragHandle(..., {re: -1, im: 0})` stops giving exactly `e^{i pi/3}` and A2 fails.
- **R3.** (Resolved in fix round 1.) The Lab stores `lab.strokes` as an array of clean specs, one per shape. The first build counted drawn curves, so one Lab sector read "8 shapes", an annulus "12", and a sector plus an annulus used the whole 20-curve budget. `extractShapes` counts one shape per store entry and caps shapes and points.
- **R4.** The hidden-coordinate colours of the root presets use only the middle of the viridis ramp (|hidden| <= 1.41 against a scale of 3.16) because `graph4D` scales by the 4-norm bound; the shape still reads from lighting and wire, and the legend states the meaning, but a larger colour contrast would need a `hiddenScale` option in `three-view.js` (request below).
- **R5.** The sphere shadow and the group of graph meshes use the `THREE` re-export (a `Group` and one `SphereGeometry` mesh). If `three-view.js` later changes its re-export, `graph4d.js` is the one station to update.
- **R6.** The staircase widget derives its home-row label from `label` by replacing a leading `arg` with `Arg`, so a non-principal seam uses the label `θ`; its set line then read "θ = { ... }" and its note "The set θ did not move.", which blurs the set arg z with the chosen step on the very page that carries 2.4.1. Fixed here for now by rewriting the leading `θ` of the set line and the note to `arg z` (2.1.6); the proper fix is request 1 below.
- **R7.** 3D under software GL is slow in the smoke run; each station creates exactly one WebGL context (the router unmounts the previous station first).

Requests to other owners (do not edit those files here):

1. `js/core/staircase.js` (`i1-core-widgets`), **priority**: an optional `homeLabel` (for example `'chosen θ'`) separate from `label`, so the set line can always say `arg z = { ... }` while the home row says `chosen θ = ...` when the window is not (-π, π]. The station then drops `nameTheSet()` (its rewrite is a no-op once the widget does this) and passes `label: 'arg z', homeLabel: seam === -π ? 'Arg z' : 'chosen θ'`.
2. `js/core/three-view.js` (`i1-core-three`): optional `hiddenScale` for `graph4D` (and `riemannSurfaceRoot`) to widen the colour range; a `domainSphere({ f })` builder (coloured sphere) to replace the `THREE` use in `graph4d.js`.
3. `js/registry.js` (planner): `stationForTopic('T2.4')` returns `staircase` (it lists T2.4 first), so `#topic-T2-4` never reaches `branches`; consider listing T2.4 only on `branches` or ordering the topic list.
4. `i1-station-lab`: store `lab.strokes` as an array of `{ kind, ... }` shapes (the LabRequest kinds) or of Curve objects with `points`.

Deviations to copy into ARCHITECTURE 9 after the build: the extended readouts (4.4), the added ids (D7), the `window.__mv.branches` and `graph4d` hooks (4.8), the token presets `#branches-principal|positive|negimag` and `#graph4d-<function id>|landscape|sphere`.

## Appendix D: build notes (written by the builder)

Built in iteration 1. Everything in sections 2 to 8 is implemented as written (every id of 2.1.3 and 2.2.2, the copy of 2.1.6
and 2.2.6, the readouts of 4.4, the 2n half-plane pieces, the magnet, the computed walk status, the hooks of 4.8). The unit file has
the 27 cases of 7.2 (T0 to T12 and G1 to G11, plus three guards: T4b, T6b, G12); all numbers are the design's own literals, not code
output, and the key ones were re-derived once more with Python `cmath` during the build (walk table, 13 branch values, jump sizes).
The interaction script is exactly 7.3 and passes at 1280 x 860 (light and `--dark`) and at 390 x 844. `npm test`: 473 of 473.

Small differences from the design, all found by reading the screenshots:

| # | Design | Built | Why |
|---|---|---|---|
| B1 | 2.1.6: staircase caption ends "Click a row to see the root it gives." | The caption stops after "...only when the window is (-pi, pi]." | The line right under it (`#branches-pick`) already says "Click a step to see the root it gives." and the two read as a stutter. |
| B2 | 5.A.8: polar cells `${rho}\,e^{i...}` with `texAngle` | `polarTex(rho, phi)`: the coefficient is dropped when it prints as 1 (as `polarText` does for the readout), the sign goes in front of the i, a decimal gets a thin space after the i, and a fraction in the exponent is written `\pi/3` | `1\,e^{i\frac{\pi}{3}}` rendered with a pointless "1" and a fraction too small to read inside a superscript. The same helper is used in `graph4d`'s `same` row. |
| B3 | 5.A.5: the chosen-angle label sits at half the angle | If the half angle is within 0.3 of the y axis (|cos| < 0.3) the label moves 0.45 rad along the arc | For theta = pi (problem 2.4.1) the label landed on the y-axis tick "0.5". |
| B4 | 5.B.4: `view.fitTo(..., { padding: 1.0 })` in every mode | Sphere mode uses padding 1.25 (`FIT_SPHERE`) | The infinity marker and the sphere's labels sit outside its radius and were clipped at the top edge. |
| B5 | not specified | `#station-graph4d .chip sup { font-size: 0.85em }` in the station's injected style | `prose()` emits a plain `<sup class="prose-sup">` and nothing styles it, so `e^z` read as "e z" in a chip. A site-wide rule would be better (request below). |
| B6 | 2.2.5: strokes panel with no strokes shows the text and "a link #lab" | The link is `a.chip#graph4d-strokes-lab` with the text "Open the Lab" | The design gave no text. |

No deviation changes a number, an id, a readout string, a hook or an acceptance criterion.

Measured in the build: `graph4D` x 6 pieces and the first draw are well inside the 30 fps target in software GL; every route mounts and
unmounts cleanly (checked by navigating home, branches, graph4d, branches, roots, graph4d, home: `window.__mv.branches` and `.graph4d`
are deleted, `window.__mv.views3d` is empty, the injected `<style data-for="branches|graph4d">` tags are removed, no console error; the
only console output is the software-GL "GPU stall" warning). Reduced motion (checked with the browser flag): a walk finishes at once
with its status computed, Spin becomes "Turn 45 degrees". Keyboard: Alt+Arrow moves the point by exactly 0.01 (the magnet is bypassed),
a plain arrow by exactly 0.1.

Requests for other owners (in addition to those of Appendix C, which still stand): add a `sup.prose-sup { font-size: 0.85em }` rule to
`css/components.css` (shell goal) so superscripts from `prose()` are readable in chips and buttons; copy the added ids (D7), hooks
(4.8), extended readouts (4.4) and token presets (`#branches-principal|positive|negimag`, `#graph4d-<function id>|landscape|sphere`)
into ARCHITECTURE section 9.

### Fix round 1 (reviewer findings 1 to 12)

A reviewer checked the first build against this design and found twelve issues. What was done, and what was not:

| # | Finding | Fix | Check |
|---|---|---|---|
| 1 | The `e^z` and `z^(1/3)` chips read "e z" and "z 1/3 , all roots": a bare `<sup>` inside the `display: inline-flex` `.chip` button is its own flex item, so `vertical-align` does nothing and the flex gap opens before the comma. B5 only changed the font size. | The label goes into one `<span class="g4-chip-label">` (`prose(span, label)`), so the `<sup>` is inline text inside a single flex item. B5 stays, as `font-size: 0.8em; line-height: 0` on `.chip sup`. | Screenshot `fix1/g4-controls-*`; the script checks that the sup is inside the only child span, `vertical-align: super`, and its centre is more than 1.5 px above the label's centre, and that the exponent-to-comma gap is under 3 px. |
| 2 | `setRows` redraws at once with the previous model; the cube root's model has `wc = null` but the `sq`, `sqrt`, `recip`, `exp` rows read `s.v.wc.re`: `console.error [explainer graph4d-ex] w/cart: Cannot read properties of null` on cbrt-all to anything. | The `w` row guards on the model (`s.v.wc ? u = .., v = .. : u + iv = ..`). `buildFunction` calls `ex.update(probeModel())` before `ex.setRows(...)`, so the redraw meets the new model. `probeModelFor` and `probeRows` are now pure exports. | G13 (880 cells, every preset's rows against every preset's model); the script switches presets in the order `sq, exp, recip, sqrt-all, cbrt-all, recip, cbrt-all, sq, cbrt-all` and fails on any console error. Verified to fail on the first build's code. |
| 3 | At the default camera only one bead is visible: the other beads, the floor marker, the fibre and the edges are depth-tested behind the opaque surface; the two 1 px grey edges cannot be told apart. | `onTop()` (no depth test, no depth write, render order after the surface) for the markers; `tubeLine()` for the fibre, the edges, the floor line and a new jump line, drawn as thin tubes so they keep a width. The edges are `--output`, **dashed at the start of the window, solid at its end** (the convention of the w-plane wedge); a `--danger` line at the rim joins them. The caption names them by line style. See 3.3 and 5.A.9. | Screenshots `fix1/b-surface-*`, `branches--*--end.png` and the `problem-2-4-1--*--a3.png` pages in light and dark, desktop and phone; the script checks `depthTest === false` on every overlay, at least 3 dashes on the start edge and one solid piece on the end edge. |
| 4 | The strokes panel counts curves ("The Lab has 8 shapes" for one sector) and the 20-curve cap drops shapes after a sector plus an annulus; `cartGrid` is silent. | `extractShapes` (5.B.10): one shape per store entry, curves grouped by shape, caps on shapes (20), curves (80) and points (4000), a shape drawn whole or not at all, and `left` says what is not drawn (`grid`, `limit`, `unreadable`). `strokesPanelText` words it; new hooks `shapeCount`, `liftedShapeCount` (`strokeCount` stays the number of curves). G9 re-derived (2.2.5, G9, G9b, G9c). | Unit G9, G9b, G9c; the script stores the Lab's own specs (sector, annulus, circle, grid): 4 shapes, 3 drawn, 21 curves, "Left out: 1 grid". |
| 5 | The label `θ = π` still runs into the y-axis tick `0.5` at theta = pi. | `chooseLabelSpot` (5.A.5) with `labelObstacles`: the label goes to the first of several places whose box touches neither the ray, the handle's label nor a tick label. | T14; screenshots `fix1/b-z-pi-*`, `b-z-halfpi-*`, `b-z-neghalfpi-*`, `b-z-default-*` at 1280 and 390, light and dark. |
| 6 | The staircase set reads `θ = { π + 2πk : k is any integer }` on every page with a seam other than -pi, 2.4.1 included. | `js/core/staircase.js` is not this goal's file. Meanwhile `nameTheSet()` rewrites a leading `θ` of the widget's set line and of its crossing note to `arg z` after each update (a no-op once the widget does it itself); the z-plane caption names the faint arcs as the set arg z; the staircase caption says the whole list is the set arg z. Request 1 of Appendix C is now the priority one. | The script checks `#branches-stairs-set` starts with `arg z = {` at seam -pi/2 (home row `θ = `) and at the principal seam (home row `Arg z = `). |
| 7 | The lede always says "cube root has three values". | `ledeText(n)` and `countName(n)`; rewritten in `setN`. | T13; the script at n = 2 and back at 3. |
| 8 | The vertical axis and its label `h` are clipped in the root presets and the uv = 0 views. | The floor grid is `gridSize: 5` (axis 2.5, label 2.85, still covers x and y in [-2, 2]); the graph is framed with `padding = max(1.2, 3.1 / S)` (`fitGraph`) so the axis and its label are inside the ball being framed, also for `z^2` (S = 2.45). | Screenshots `fix1/g4-*`: `h` is visible for all five presets and for cbrt at uv = 0, light and dark. |
| 9 | The legend wheel canvas has no `aria-hidden`. | Added. | The script reads the attribute. |
| 10 | Without WebGL the button says "Spin" but steps 45 degrees. | `spinLabel()` is `Turn 45 degrees` when `reduced() || view.unavailable`, set after the view exists and in `stopSpin`. | Code; the label under reduced motion was already checked in the first build. |
| 11 | `aria-current="true"` stays on the 2.4.1 chip after the seam moves away from 0. | **Not changed.** The chip marks the page: `aria-current` means "the current item of this set (here, the problem this route is about)", and the route is still `#problem-2-4-1` whatever the student does with the seam; the same chip is marked the same way on the other problem pages. Updating it from the state would announce "not current" on a page whose address and heading are still 2.4.1. | |
| 12 | The root presets' `w` row should say `φ = Arg z / n`. | The polar cell of the `w` row reads `ρ = 1.038, φ = Arg z / 3 = 0.893` for the root presets (single-valued presets unchanged). | G14. |

Also in this round: the chosen-angle label of `branches` was the only canvas text that could touch the axis labels; the 3D overlay tubes follow the theme through `userData.themeRefresh` (checked in dark). B3 of the first build (move 0.45 rad when the middle is near the y axis) is replaced by `chooseLabelSpot` and no longer applies. The unit file now has 33 cases in this goal.


### Fix round 2 (reviewer findings 1 to 9)

A second review (Review A, round 2) checked the fix-round-1 build against this design and found one major and eight minor issues. What was done, and what was not:

| # | Finding | Fix | Check |
|---|---|---|---|
| 1 (major) | In `graph4d` the probe beads are depth-tested while the sheets and the sphere are opaque: with the all-roots presets only the top bead shows (1 of 3 for z^(1/3), 1 of 2 for sqrt z), 5 to 7 px wide; in Riemann-sphere mode the default probe (Im > 0) is on the back hemisphere and cannot be seen. The same defect was fixed for `branches` in round 1 (finding 3) and not here. | `createBead(k)`: no depth test, no depth write, transparent, render order after the meshes (5, principal 6), as `onTop()` in `branches`. Sized in screen pixels (7 px and 5.5 px radius, `pxUnit` measured when the view is framed) instead of 0.08 and 0.055 world units (a 5 to 7 px speck). In sphere mode a bead on the far hemisphere is faded to 40 percent so that "behind" is still readable. Design 3.4, 5.B.2, 5.B.8 carry the depth rule. | Unit G15; the script checks, for `graph4d-probe-0..2` on the cube-root preset and in sphere mode, `depthTest === false`, `depthWrite === false`, visible, render order >= 5 and a radius on screen >= 4 px; screenshots `fix2/*cbrt-beads*`, `*sphere-beads*`. |
| 2 | The chosen-angle label `theta = 0.644` is half hidden by the handle's dot and by the `seam` label at z = 0.2 + 0.15i (desktop and phone); at z = 1 + 0.05i on a phone it sits against the `z` label. | `labelObstacles` (now pure and exported) includes the handle's dot; `chooseLabelSpot` tries the same angles outside all three arcs before the inside place; the label is drawn with `drawLabel`, which records its box in the plane's label frame, so the plane places the `seam` label (last) around it. | T14 (four new points, a ray check for every case); screenshots `fix2/*label-seam0-*`. |
| 3 | At n = 2 the w-plane caption reads "the other 1 roots of z". | `wCaptionText(n)`: `Grey dot: the other root of z.` at n = 2 (one dot too). Design copy 2.1.6 changed. | T15; the script at n = 2 and back at 3. |
| 4 | `nameTheSet()` rewrites only a leading theta; at z = 0 the widget still says "so theta is not defined" and the list's aria-label says theta. | `nameTheSet()` now also rewrites that sentence of the window line and the list's `aria-label` to `arg z`. (The crossing note "Seam crossed: theta rose by 2pi. The set arg z did not move." is already as intended: the first theta is the chosen step, the second word is the set.) The proper fix stays request 1 of Appendix C (`homeLabel` in `staircase.js`, priority): `nameTheSet()` is to be deleted when it lands. | Code; the script reads the set line at two seams. |
| 5 | The hint asks the student to predict the seam, but the polar route bar right under it states the window and f(-1): "Show the answer" reveals nothing new. | The two route bars are inside `#branches-answer` (after the formula and its text); the hint ends "Then press the buttons to check." The route text itself is `js/data/problems.js` (not this goal's file). | The script: no `.callout` visible in `#branches-problem` before the toggle, the visible text has neither the window nor `e^{i pi/3}`; after the toggle the cart and polar bars are visible. |
| 6 | The graph4d surface fills about 200 px of a 434 x 326 canvas (the camera frames the whole 4D ball of radius S); the branches surface on a phone is about 230 px of 358 x 268. | graph4d: floor grid `gridSize: 4` (x and y in [-2, 2]; label at 2.35), `FIT_GRAPH = 1.08` and `AXIS_REACH = 2.6` (was 1.2 and 3.1), and the view is square (`aspect-ratio: 1 / 1`) at 1060 px and wider, where the left column is 434 px wide beside a much taller controls column. The ball of radius S is still framed whole, so the picture never needs to follow the sliders. branches: the surface sets `userData.frameRadius = hypot(2, 2^(1/n))` (the surface is a disc; its box corners are empty), `padding: 1.12`, `gridSize: 5`. | Screenshots `fix2/*` (desktop, phone, both themes). |
| 7 | In the w-plane after a jumping walk, `Arg w` sits over the dashed jump chord and next to the `jump` label. | The `jump` label moves to 30 percent along the chord from the end that is farther from w, and is drawn with `drawLabel` so that the polar address (placed after this layer) goes around it. The `Arg w` label may still meet the thin chord (a plane helper cannot register a segment); both stay legible. | Screenshots `fix2/*principal-jumps*`. |
| 8 | A2's literal text "readout has 0.5 - 0.8". | **No change** (design R1): the value at -1 - 0.05i is 0.515 - 0.858i; the script checks `/0\.5\d* - 0\.8\d*i/` and the parsed numbers. | |
| 9 | `npm test` failures in `i1-station-curves-linear` (L14) and `i1-station-powermap-reciprocal` (U35). | Not this goal's files; no change here (see the build report). In this build's runs the full suite was 648 of 648. | |
