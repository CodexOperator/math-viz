# Design: i2-pictures — three pictures that must say what they mean

Goal id `i2-pictures` (wave 1, kind polish, size L). Designer: stage 2. Builder implements this file without guessing.
Binding inputs: `docs/CONSTRAINTS.md`, `docs/goals/iter-2.json` (goal `i2-pictures`), `docs/STORY.md` sections 2 (stations 3, 5, 20), 4, 9 row 6,
`docs/ARCHITECTURE.md` 3.12, 3.5, 3.11, 4.1, 9 (Iteration 2), 10.6, 11.1 to 11.4. Where the built code and ARCHITECTURE differ, the code wins; the differences found
while reading are in section 0.3.

Files this goal owns (and nothing else may be edited): `js/stations/staircase.js`, `js/core/three-view.js`, `js/stations/arithmetic.js`, `js/stations/graph4d.js`,
and the four pairs `tests/{unit,interact}/i1-core-three`, `i1-station-staircase-powers`, `i1-station-addresses-arithmetic`, `i1-station-branches-graph4d`.
The acceptance criteria also name two NEW test files that the `owns` list does not mention: `tests/unit/i2-pictures.test.mjs` and `tests/interact/i2-pictures.mjs`
(the ROUTES row `'i2-pictures': ['staircase', 'problem-1-1-1', 'graph4d']` already exists in `tools/interact-all.mjs`). The builder creates exactly those two files;
this is recorded in section 9 as a request to the orchestrator.

---

## 0. Reading notes (what exists, what differs)

### 0.1 The three faults, from `docs/review/iter-2/before/`

| Picture | Fault seen in the screenshot |
|---|---|
| `staircase` helix | five translucent full-radius helicoid sheets read as a stack of discs; the dashed fibre above the dot reads as "a separate vertical line"; the grid under it is as loud as the picture; at 390 px the beads are tiny on a brown smear |
| `arithmetic` × | the plane is fitted so that the product (14.9 from 0) fits: unitsAcross 21.76, so z₁ and z₂ sit 16 px from 0 and the θ₁, θ₂ arcs (radii 24 px and 38 px) are crushed against the origin |
| `graph4d` | one object, one view: nothing says that the Re surface, the Im surface, the landscape and the domain picture are the same object seen from five places |

### 0.2 Code facts the design relies on (all read from the files)

* `three-view.js`: `argHelix({ z, turns = 2, rMax = 3, seam = -π, tightFrame = false })` returns `{ group, update(z, seam?) }`; today `group.userData` has
  `beads` (5 spheres for turns 2, position in SCENE coordinates `(x, h, -y)`), `floorPoint`, `fibre`, `homeSheet`, `ghostSheet`, `seamRay`, `axis`, and `frameRadius` only with `tightFrame`.
  `update` calls `notify(group)` once (a unit test counts exactly one notification per update). `createView3D` draws a polar floor grid of alpha 0.30 (light) / 0.26 (dark)
  named `grid-polar` inside the group `furniture`, and every view has a "Reset view" button (`.three-reset`) and, unless `hint: false`, a hint.
  Material and colour helpers private to the module: `tokenColor(token)` (a `THREE.Color`), `resolveColor(token)` (display sRGB triple), `notify`, `clampInt`.
* `plane.js`: `createPlane` options `tickLabels`, `interactive`, `maxWidth`, `legend`, `axes`, `axisLabels`; `fitView` floors both spans at 2 and pads by `padding`
  (`fitTo(points, 0.18)` is what `arithmetic` uses); `handle.hidden` is get/set; drawing helpers `drawSegment(..., { arrow, dash, obstacle })`, `drawTimedCurve`, `drawCircle`,
  `drawDot`, `createLabelPlacer`, `registerObstacle`, `DASH`.
* `arithmetic.js`: pure `scenePlan(S, scale) → { prims, fit }` (prims `s-ray-a`, `s-ray-b`, `s-ray-result`, `arc-1`, `arc-2`, `spun`, `s-stretch`, `l-theta1`, `l-theta2`, `l-result`, ...),
  `labelCands(pr)`, `arithmeticModel(S)`, `MODES`, `GRID_FOR`, `DEFAULT`, `initialFor(preset)`, the strip `problemStrip(prefix, p)`, hooks `state()`, `plan()`, `labels()`.
  `scenePlan(...).fit` today includes `M.value` and `M.result` in every mode, which is the fault.
* `staircase.js` imports its drawing kit and `stationHeader`/`stationNav`/`neighbourLinks` from `powers.js`; `powers.js` is owned by `i2-decisions-everywhere-a`, which promises
  "three additions and no removals", so these imports stay exactly as they are and this goal adds no new import from `powers.js`.
* `graph4d.js` is one 969-line station; its pure helpers are named exports; `FUNCS` has `sq`, `sqrt-all`, `cbrt-all`, `recip`, `exp` with fields `f`, `x`, `y`, `clamp`, `n`, `probe`, `angles`.
* `listen.js`: `videoPanel(container, videoId, opts) → Promise<section | null>`, idempotent per container, appends nothing when the manifest has no entry (today `VIDEOS = []`).
* `station-kit.js`: `problemCard(ctx, problem, { id, tone, answer, ... })` makes `#<id>`, `#<id>-decisions`, `#<id>-note`, ...; `valuesOf(preset, shape)`; `freshNote(problem, preset)`
  = `Fresh numbers from the Rehearsal Room. The handout's own answer: <answer.text>`.
* `decisions.js`: `chips(problem, { idPrefix })` → `span.decisions` with `button#<prefix>-address[data-decision="address"][data-value]` and `#<prefix>-names[data-decision="names"][data-value]`.
* `moveglyph.js`: `moveGlyph(z, { scale = 2, size = '1.1em', id })`, `updateGlyph(svg, z)`; `glyphText(5 + 14i) === 'move: turn 70.3°, stretch 14.866'` (checked: atan2(14, 5) = 70.346°, |5 + 14i| = 14.8661).

### 0.3 Differences between ARCHITECTURE and the code that matter here

1. ARCHITECTURE 9 says `plan()` "gains `ruler: { rings, result }`"; the goal's A3 reads `plan().ruler.result` after JSON round-trip in the old script (`JSON.parse(JSON.stringify(...))`), so the ruler object must be plain data (no functions).
2. ARCHITECTURE 9 says the arithmetic main plane "fits z₁, z₂ and the unit circle (never the product)"; the goal text says only "excludes the result". This design does both: the fit is `{0, z₁, z₂, spun, the four unit-circle extremes}`.
3. `tests/unit/architecture-sync.test.mjs` fails for a new export of `three-view.js` that ARCHITECTURE 3.12 does not mention. `helixPoint` is a required new export, so that test is red from the day this goal lands until the integrator adds the line given in section 9 to 3.12. This is known and expected (the planner's notes say the integrator updates 3.12 after `i2-pictures`).
4. Two source-text pins that constrain new code: `i1-station-staircase-powers.test.mjs` U32 requires in `staircase.js` the literals `argHelix({ ... tightFrame: true ... })` (no nested braces), `function teleport(z) {\n stopWalk(false);`, `snap: (p) => (ptr ? snapNice(p, 4 /`, `onDragStart: () => { ptr = true;`, `sumPtr ? snapNice`,
   `.stair-col { ... grid-template-columns: minmax(0, 1fr)`, and `#staircase-helix { aspect-ratio: 5 / 6; }`. `i1-station-branches-graph4d.test.mjs` S4 requires in `graph4d.js` (comments stripped) `domainSphere({ f: F.f })`, `.setFunction(F.f)`, `specToCurves`, `hiddenScale: F.hiddenScale`, `userData.boundRadius`, and forbids the words `SphereGeometry|sphereColor|riemannSphere|srgbToLinear|inverseStereographic` and an import of `sector|annulus|verticalLine` from `shapes.js`. So the shadows build their lines with `specToCurves({ kind: 'verticalLine', ... })`, never `import { verticalLine }`.

---

## 1. Goal restatement, story thread, problems covered

### 1.1 What is built

1. **Staircase**: `argHelix` becomes one thin lit ribbon that winds up at the radius of the point z, the beads ride on it, a grey riser stands at the seam, the floor grid is faint, and there is no
   stack of discs and no vertical fibre. `staircase.js` gets the problem card with the two decision chips, the `values` preset `{ z, seam }`, and the `staircase-roots` video panel.
2. **Arithmetic**: for × and ÷ the main plane frames only the two moves near 0 (so θ₁ and θ₂ stay readable), and a second plane, the **log ruler**, shows where the product (quotient) lands.
   The move glyph sits beside the result; the problem strip gets the two chips and the fresh-numbers note; the `values` preset `{ z1, z2, mode, conjResult }` is read.
3. **4D graph**: five small shadows of the same f (side by side, domain colouring, Re surface, Im surface, modulus landscape) under the big view, the Re and Im ones lit as the sliders pass their angles
   (tap to set the sliders), the two sliders moved into a "Turn the graph" panel directly under the big view so slider and shadows are on one screen; the `shadows-4d` video panel.

### 1.2 The story thread, and how it shows on screen

* Thread 2 seen (STORY station 5): arg z is a staircase. On screen: one ribbon, one winding per turn, height = a name of the angle; the beads are the names of z on every winding; the bright winding is the home window (seam, seam + 2π];
  the grey riser is the seam, one winding tall, and the big bead hops down it when z crosses the seam.
* Thread 1 seen (STORY station 3): multiplying is a move, turn then stretch, even when the product is far away. On screen: the main plane shows the turn (two stacked arcs) at a readable size; the ruler shows the stretch as a step
  outward along the result's ray, drawn so that "× |z₂|" is the same size of step wherever you start (a log ruler turns a product of lengths into a sum of distances).
* Thread 3's closing picture (STORY station 20): "every picture is a shadow of one object". On screen: five captioned shadows under the big view; the one the big view equals right now is outlined and says so in words.

### 1.3 Review problems and topics covered

| Id | Where | What this goal's pictures show |
|---|---|---|
| 1.3.1 (Arg of −1 + i√3) | `staircase` card and helix | z = −1 + i√3, r = 2, Arg z = 2π/3, beads at heights 0.4 + 1.2k |
| 1.1.1 (z₁z₂, z₁/z₂) | `arithmetic` × and ÷ | arcs θ₁ = −0.588, θ₂ = 1.816 readable; the ruler places √221 = 14.866 between the 8 and 16 rings and √(13/17) = 0.874 between the 0.5 and 1 rings |
| 1.1.2 (Im conj(z₁ − z₂)) | `arithmetic` − with mirror | result 4 + 6i, glyph `move: turn 56.3°, stretch 7.211` |
| P1, P2 | `arithmetic` conj, × with z₂ = conj z₁ | glyph of z·conj z = 13: `move: turn 0°, stretch 13` |
| T1.3 polar representation, T2.5, T3.1 | `staircase`, `arithmetic`, `graph4d` | the 4D shadows are the picture behind 1/z (T2.5) and the derivative's local linear map (T3.1) |

---

## 2. UX

Plain, direct copy for a student the night before a test. No emoji. Every control has an id and a label. Fonts and colours come only from tokens.

### 2.1 Staircase (`#staircase`, `#problem-1-3-1`)

#### 2.1.1 Wireframe, desktop (1280 px)

```
+---------------------------------------------------------------------------------------------------+
| The Staircase: z, arg z, Arg z                        [T2 · The staircase] [1.3.1]                |
| One dot, many names for its angle. Drag z around 0 ...                                            |
+---------------------------------------------------------------------------------------------------+
| Problem 1.3.1                                      (#staircase-problem, new, full width)          |
| Write z = −1 + i√3 in polar form r(cos θ + i sin θ) and exponential form re^{iθ}. What is Arg(z)?  |
| [Cartesian, then polar] [names: home]    <- decision chips (#staircase-problem-decisions)         |
| (tap a chip: its one-line meaning appears under it)                                               |
| Why this address. ...                               > Show the answer                             |
+---------------------------------------------------------------------------------------------------+
| Three things, kept apart  (unchanged)                                                             |
+--------------------------------------------+------------------------------------------------------+
| Drag z once around 0 (unchanged)           | Every name for the angle of z (list)                 |
|  plane, readout, window, controls          | Every name lands on the same dot (explainer)         |
+--------------------------------------------+ Why must Arg z jump? (callout)                       |
| Watch (2-3 min): ...  #video-staircase-roots (only if the manifest has it)                         |
+--------------------------------------------+------------------------------------------------------+
| The same staircase, standing up                                                                   |
|  text (muted)                                                                                     |
|  +--------------------------- #staircase-helix (3D view) ---------------------------------+       |
|  |   angle                                                                                  |       |
|  |     |        o  k = 2                                                                    |       |
|  |     |     ___/==== ribbon winding up, bright outer edge                                  |       |
|  |     |    o k = 1                      grey riser (one winding tall) at the seam          |       |
|  |     |  ((O)) big bead = home step, bright winding                                        |       |
|  |   ..|.. faint polar floor rings, axes Re, Im; z is the blue dot on the floor              |       |
|  +------------------------------------------------------------------------------------------+       |
|  caption, helix note                                                                              |
+---------------------------------------------------------------------------------------------------+
| Adding names: Theorem 1.4.14 (unchanged), links                                                   |
+---------------------------------------------------------------------------------------------------+
```

The video panel is a sibling placed after the main panel inside `.stair-col` (the left column), because "after the station's first picture" means after the plane, never before it.

#### 2.1.2 Wireframe, phone (390 px, one column)

```
header | problem card (chips wrap to two lines) | three things | plane panel (plane 358 px square,
readout, window, presets, walk, sliders, seam chips) | [video] | list | explainer | why callout |
helix panel: text, 3D view 358 x 430 (aspect 5/6), caption, note | sum panel | links
```

#### 2.1.3 Controls and behaviour (new or changed only; every iteration-1 id and behaviour stays)

| Element | id | Behaviour |
|---|---|---|
| Problem card | `#staircase-problem` | `station-kit.problemCard(ctx, problemById('1.3.1'), { id: 'staircase-problem', tone: 'polar', answer: 'reveal' })`. Title `Problem 1.3.1`; statement from the data; chips host `#staircase-problem-decisions` holds `decisions.chips(problem, { idPrefix: 'staircase-problem' })` (chips `#staircase-problem-address` value `C->P`, `#staircase-problem-names` value `home`, meaning span `#staircase-problem-meaning`); `#staircase-problem-why`, `#staircase-problem-answer` (`<details>`, summary `#staircase-problem-answer-toggle` "Show the answer"), `#staircase-problem-answer-tex`, `#staircase-problem-answer-text`, `#staircase-problem-note`, `#staircase-problem-slot`. Placed directly after the header (and after the T2.4 topic note when present, before "Three things, kept apart"). |
| Fresh-numbers note | `#staircase-problem-note` | `freshNote(problem, preset)` when `ctx.preset.kind === 'values'` and `preset.problem === '1.3.1'`; when the preset is a values preset with `problem === null` the note reads `Your own numbers.`; otherwise empty (the kit hides an empty note). |
| Helix view | `#staircase-helix` (unchanged), `-helix-reset`, `-helix-hint`, `-helix-fallback` | pointer or touch: drag turns, pinch zooms; keyboard when the view has focus: arrows orbit, + − zoom, 0 resets (all from `createView3D`). |
| Helix note | `#staircase-helix-note` | `p.muted`, `aria-live="polite"`, empty normally; at z = 0 it reads `z is at 0. It has no angle, so there is no ribbon and there are no beads.` |
| Video panel | `#video-staircase-roots` (made by `videoPanel`) | in `#staircase-video-host`, a `div` placed right after the main panel in `.stair-col`; absent (no element) when the manifest has no entry. |

#### 2.1.4 States

* **Empty / z = 0**: the plane says "z = 0 has no angle"; the helix hides ribbon, home strip, riser and beads, keeps the floor point, the axis and the faint floor; `#staircase-helix-note` explains. (Fix round: `render()` passes the point itself, `S.z`, to `helix.update` when the model is undefined; the first build passed `{ re: NaN, im: NaN }`, which also hid the floor point. The interaction script sets z to 0 and asserts it: step 4b.)
* **Loading**: the helix host shows `Loading the 3D view...` until `createView3D` runs (existing text, cleared before the call).
* **Error / no WebGL**: `#staircase-helix-fallback` (existing text) is shown; every other piece works; the video panel is independent of WebGL.
* **A bad values preset** (z missing, not finite, |z| < 0.2, a part beyond ±2.9, a seam not finite): that field falls back to the default (z = −1 + i√3, seam −π); nothing throws.

#### 2.1.5 Copy (exact)

* Helix lead (`p.muted`, replaces the old one): `The dot z stays on the floor. The ribbon is the staircase: one winding for each turn, so a bead's height is its name, a number in arg z. The beads are the names of z, one on every winding, all directly above the dot. The big bead is the home step, on the bright winding. Drag z in the plane and the beads ride up the ribbon together. When z crosses the seam, the big bead hops down the grey riser to the next bead; the set of beads does not change.`
* Helix caption: `Drag to turn the view. The grey wall is the seam, one winding tall; the dashed strip on the floor is the same seam. Five windings are drawn (k = -2 to 2); the list shows seven.`
* View aria label (the `label` option of `createView3D`): `Staircase of arg z as a ribbon: the point z on the floor, one bead on every winding, the home winding bright, a grey riser at the seam`.

### 2.2 Arithmetic (`#arithmetic`, `#problem-1-1-1`)

#### 2.2.1 Wireframe, desktop, mode × with 1.1.1 (z₁ = 3 − 2i, z₂ = −1 + 4i)

```
+-------------------------------------------------------------------------------------------------+
| Slide, Spin, Stretch, Mirror     [T1 · One point, two addresses]   [1.1.1] [1.1.2] [P1] [P2]     |
+-------------------------------------------------------------------------------------------------+
| Problem 1.1.1 (#arithmetic-problem)                                                             |
| Let z₁ = 3 − 2i and z₂ = −1 + 4i. Compute z₁z₂ and z₁/z₂ in the form x + iy.                    |
| [Cartesian] badge  Arg(3 − 2i) and ... why                                                      |
| [Cartesian] [names: none]   <- #arithmetic-problem-decisions (new)                              |
| #arithmetic-problem-note (new, empty unless fresh numbers)        > Show the handout answer     |
+-------------------------------------------------------------------------------------------------+
| Operation: [z₁+z₂][z₁−z₂][z₁×z₂ part 1][z₁÷z₂ part 2][conj z₁][1/z₁] [Load 1.1.1 ...]            |
+---------------------------------------------+---------------------------------------------------+
| main plane #arithmetic-plane (8.2 units)    | [Play: spin, then stretch] [Fit the view]          |
|                                             | The product on a log ruler  (#arithmetic-ruler)   |
|                                             |  +--------------------------------------------+   |
|  z₂ o      o spun                           |  |  rings 1 2 4 8 16 32 (log), z₁ z₂ z₁z₂ dots |   |
|      \   .'  ^ dashed stretch off the top   |  |  rays at true angles, stretch arrow         |   |
|  θ₂ arcs  z₁ o  "z₁ z₂ (see ruler)" at edge |  +--------------------------------------------+   |
|  0 ---------                                |  #arithmetic-ruler-intro, #arithmetic-ruler-desc  |
| hint                                        +---------------------------------------------------+
|                                             | The two points: inputs, checks, mirror chip        |
|                                             | caption, note, [readout] [glyph]  wrap note        |
+---------------------------------------------+---------------------------------------------------+
| The same answer, worked in both addresses (explainer), why callout, two proofs, links           |
+-------------------------------------------------------------------------------------------------+
```

The right column is: the Play and Fit row (`#arithmetic-play-row`), the ruler panel (× and ÷ only), the points panel (inputs, checks, the mirror chip), then caption, note, the readout row, wrap note. For +, −, conj, 1/z the ruler panel is `hidden`. **Fix round:** Play and Fit used to be the last row of the points panel, 600 to 1000 px below the plane at 1280 x 860, so a student who pressed Play watched a plane that had scrolled off; they now sit first in the column, level with the plane (ids `#arithmetic-animate` and `#arithmetic-fit` unchanged; the Tab order is plane handles, Play, Fit, the ruler (nothing), the inputs). The ruler is kept second, not after the points panel: it is the central new picture and has to start beside the plane.

#### 2.2.2 Wireframe, phone (390 px)

```
header | problem strip | operation chips | main plane (358 px square) | hint | Play, Fit |
ruler panel (title, plane 358 px square, intro, desc) | the two points | caption | note | readout + glyph | wrap note |
explainer | why | proofs | links
```

#### 2.2.3 Controls and behaviour (new or changed)

| Element | id | Behaviour |
|---|---|---|
| Decision chips | `#arithmetic-problem-decisions` (div) with `#arithmetic-problem-address`, `#arithmetic-problem-names`, `#arithmetic-problem-meaning` | `decisions.chips(problem, { idPrefix: 'arithmetic-problem' })` appended inside the strip, after the address badge paragraph. The strip's problem is fixed per mount (the route preset or the values preset's problem, else 1.1.1). Tap or focus a chip: its one-line meaning (from `decisions.js`). |
| Fresh-numbers note | `#arithmetic-problem-note` | `p.muted`, `hidden` when empty; `freshNote(problem, preset)` for a values preset whose `problem` is one of 1.1.1, 1.1.2, P1, P2. |
| Ruler panel | `#arithmetic-ruler-panel` (section.panel, `hidden` unless mode is mul or div), title `#arithmetic-ruler-title`, host `#arithmetic-ruler-host` (also `hidden` with the panel), plane id `arithmetic-ruler` (viewport `#arithmetic-ruler-viewport`), intro `#arithmetic-ruler-intro`, description `#arithmetic-ruler-desc` | non-interactive plane (no zoom, no drag, no tab stop); `aria-describedby` points at the description. |
| Move glyph | `#arithmetic-glyph` (the `<svg>`), host span `#arithmetic-glyph-host` | beside the result: `div.ar-readout-row` holds `#arithmetic-readout` and the glyph host as siblings (the glyph is never inside the readout). `updateGlyph(glyph, result)` in every `render()`; the host is `hidden` when the result is undefined (division by 0). aria-label is the glyph's own text, for 1.1.1 `move: turn 70.3°, stretch 14.866`. |
| Off-plane note | `#arithmetic-note` (existing id, new text for × and ÷) | see copy below. |
| Everything else | unchanged | Play, Fit the view, fields, lock, snap, mirror chip, proofs keep their ids and behaviour. |

Pointer, touch, keyboard: the ruler plane has no interaction of its own. Dragging z₁ or z₂ on the main plane moves both pictures live (the ruler redraws every `render()`).
Keyboard: arrow keys on a handle move it (existing); Tab never lands on the ruler.

#### 2.2.4 States

* **× or ÷ with a result that is 0** (a factor is 0) **or undefined** (÷ by 0): the ruler panel stays visible, rings are not drawn, the plane shows one word `no log distance for 0`, and `#arithmetic-ruler-desc` reads `The result is 0, and 0 is not on a log ruler.` (÷ by 0: `z₂ is 0, so the quotient is undefined.`). The glyph shows `no move: 0`, or is hidden for undefined.
* **Result inside the main plane** (small products, most quotients): the result handle and the iteration-1 label stay as they were; `#arithmetic-note` is empty; the ruler still shows the same product.
* **Result outside the main plane**: the result handle is `hidden`, the dashed stretch is cut at the plane edge with an arrowhead, the word `z₁ z₂ (see ruler)` sits at the cut, and `#arithmetic-note` says where it is.
* **Loading / error**: none (synchronous). A bad typed value keeps the iteration-1 field error.
* **Hidden → shown**: when the ruler panel becomes visible the plane's own `ResizeObserver` redraws it; the draw layer returns at once when `plane.getSize().w < 2`.

#### 2.2.5 Copy (exact)

* Ruler title: `The product on a log ruler` (÷: `The quotient on a log ruler`).
* Ruler intro (`rulerIntro(plan, mode)`): `Distance from 0 is drawn on a log scale: each ring is twice the one inside it, so multiplying is a step outward of the same size from anywhere. Directions are true.` For powers of ten: `each ring is ten times the one inside it`. For ÷ the clause after the colon is `so dividing is a step inward of the same size from anywhere.`
* Ruler description (`rulerDescription`), for 1.1.1 ×: `Rings at 1, 2, 4, 8, 16, 32. |z₁| = 3.606 and |z₂| = 4.123, so |z₁z₂| = 3.606 × 4.123 = 14.866: between the 8 ring and the 16 ring, in direction 70.3°.`
  For 1.1.1 ÷: `Rings at 0.25, 0.5, 1, 2, 4, 8, 16. |z₁| = 3.606 and |z₂| = 4.123, so |z₁/z₂| = 3.606 ÷ 4.123 = 0.874: between the 0.5 ring and the 1 ring, in direction -137.7°.`
  (A result exactly on a ring says `on the 8 ring`.)
* Ruler word when nothing can be drawn: `no log distance for 0`.
* `#arithmetic-note`, × or ÷ with the result off the plane: `The product is 14.866 from 0, too far to draw here. It is on the ruler.` (÷: `The quotient is … from 0 …`). For +, −, conj, 1/z the iteration-1 sentence stays: `The result is off the picture. Let go and the view will zoom out to fit it.`
* Plane word at the cut: `z₁ z₂ (see ruler)` (÷: `z₁ / z₂ (see ruler)`); with the mirror toggle on, the words keep their iteration-1 text (`conj(z₁ × z₂)`, `z₁ × z₂`) with no suffix.

### 2.3 The 4D graph (`#graph4d`)

#### 2.3.1 Wireframe, desktop (1280 px, two columns)

```
+---------------------------------------------------------------------------------------------------+
| The 4D Graph                                  [T2 ...] [T3 ...]                                   |
+--------------------------------------------------+------------------------------------------------+
| #graph4d-view-panel (figure.panel)               | #graph4d-controls (panel)                      |
|  3D view #graph4d-view (square, <= 520)          |  Function: [z²][√z, both roots][z^(1/3)..][1/z][e^z]
+--------------------------------------------------+  Other shadows: [Modulus landscape][Riemann sphere]
| #graph4d-turn (panel) "Turn the graph"           |  #graph4d-readout, axes sentence, legend, note |
|  uv angle ----o--- 0°   yv angle ----o--- 0°     |                                                |
|  [Spin] [Angles to 0]  small text                |                                                |
+--------------------------------------------------+                                                |
| #graph4d-shadows (panel) "Five shadows of one graph"                                              |
|  lede: ... every picture is a shadow ...                                                          |
|  +---------------- side (2 columns) ----------------+ +-- domain --+                              |
|  | [z-plane 150] -> [w-plane 150]                   | | colouring  |                              |
|  | Side by side. ...                                | | Domain ... |                              |
|  +--------------------------------------------------+ +------------+                              |
|  +-- re (outlined when lit) --+ +-- im --+ +-- landscape --+                                       |
|  | small Re surface           | | small  | | small         |                                       |
|  | Re surface. Height is u... | | ...    | | ...           |                                       |
|  +----------------------------+ +--------+ +---------------+                                       |
+---------------------------------------------------------------------------------------------------+
| #graph4d-video-host: Watch (2-3 min) (if any)  (fix round: the video is last in the column)         |
+---------------------------------------------------------------------------------------------------+
| probe row (plane + explainer), shapes from the Lab, links                                         |
+---------------------------------------------------------------------------------------------------+
```

Left column order: view panel, turn panel, shadows, video host. The controls panel is the right column, one row tall. At 1280 the sliders (turn panel) and the three tappable shadows are on one 860 px screen (the interaction script asserts this, with the video present). **Fix round:** the first build put the video host between the turn panel and the shadows ("the video after the first picture"); once `shadows-4d` was in `media/manifest.js` the panel (299 px with the "did not load" text, taller with a working video) pushed the shadows 300 px or more below the sliders and the central teaching move (slide the angle, watch the shadow light up) needed a scroll between cause and effect. "Slider and shadows on one screen" overrides "video after the first picture": the video is secondary and goes after the shadows.

#### 2.3.2 Wireframe, phone (390 px, one column)

```
header | view (358 square) | Turn the graph (two sliders, Spin, Angles to 0, small text) |
Five shadows (2 columns, shown as re | im, landscape | domain, side spanning both: see 10.1 deviation 1) |
Function chips + Other shadows chips + readout + axes + legend + note | [video] | probe plane | explainer | Lab shapes | links
```

The function chips come after the shadows on a phone, and the video after the chips (fix round: it was between the sliders and the shadows). This is a deliberate trade: the sliders and the shadows must be near each other, and z² is the default function. The shadows lede names the chips: see copy.

#### 2.3.3 Controls and behaviour (new or moved)

| Element | id | Behaviour |
|---|---|---|
| Turn panel | `#graph4d-turn` | `section.panel` holding the two slider rows (ids unchanged: `#graph4d-uv`, `#graph4d-yv`, outputs `#graph4d-uv-value`, `#graph4d-yv-value`), `#graph4d-spin`, `#graph4d-angles-reset`, and the small text. Moved out of `#graph4d-controls`; no id, text or behaviour changes. |
| View panel | `#graph4d-view-panel` | the existing `figure.panel` around `#graph4d-view`; `#graph4d-view` keeps its parent panel (a unit test pins "parent panel wider than the view at 900 px"). |
| Shadows panel | `#graph4d-shadows` | `section.panel` with `h2#graph4d-shadows-title`, `p#graph4d-shadows-lede`, the grid `div#graph4d-shadows-grid`, `p#graph4d-shadows-note` (roots only), `p#graph4d-shadows-status` (role status, visually hidden). Exactly five `figure[data-shadow]` children of the grid, in this order and with these ids: `#graph4d-shadow-side`, `-domain`, `-re`, `-im`, `-landscape`; `data-shadow` is `side`, `domain`, `re`, `im`, `landscape`; `data-active` is `true` or `false` on every one. |
| Side figure | `#graph4d-shadow-side` | two hosts `#graph4d-shadow-z-host`, `#graph4d-shadow-w-host` with planes `graph4d-shadow-z` (the z-plane) and `graph4d-shadow-w` (the w-plane), non-interactive. |
| Domain figure | `#graph4d-shadow-domain` | `canvas#graph4d-shadow-domain-canvas`, at most 160 × 160 CSS px, `createDomainColoring`. |
| Re, Im, landscape figures | `#graph4d-shadow-re`, `-im`, `-landscape` | each has a 3D host `#graph4d-shadow-re-view`, `-im-view`, `-landscape-view` (a `createView3D` container, so `window.__mv.views3d` has these keys) and an overlay `button.g4-shadow-btn` with ids `#graph4d-shadow-re-show`, `-im-show`, `-landscape-show`. |
| Tap a shadow | click anywhere on the `re`, `im` or `landscape` figure, or press its button | `re`: `setAngles({ uv: 0, yv: 0 })`; `im`: `setAngles({ uv: π/2, yv: 0 })`; `landscape`: `setMode('landscape')`, a second tap `setMode('graph')`. Instant, no animation (so reduced motion needs no special case). After the change `showBigView()` calls `#graph4d-view-panel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })`: the shadows sit below the big view, so the effect of a tap may be off screen; `nearest` is the least scroll that shows the whole view and does nothing when it is already visible; `auto` is an instant jump (never smooth), so reduced motion needs no special case. `side` and `domain` are not tappable (no button, no handler, no scroll). |
| Lit state | `data-active` on each figure; `aria-pressed` on each button; a visible `span.g4-lit` text `on the big view now` | recomputed synchronously in `updateTexts()`; see algorithm 5.5. |
| Video panel | `#video-shadows-4d` | in `#graph4d-video-host`, the last item of the left column (desktop) and after the function chips (phone), so it never sits between a slider and the shadows it lights; absent without a manifest entry. |

Pointer / touch / keyboard: the small 3D hosts and canvases have `pointer-events: none` (the overlay button is the target); the 3D hosts are `tabindex="-1"`; the three buttons are real tab stops; Enter and Space activate them. The sliders keep keyboard steps of the browser's range input.

#### 2.3.4 States

* **No WebGL** (`view.unavailable` of the big view): the three small 3D hosts are not created; each of the `re`, `im`, `landscape` figures shows `p.muted` `needs WebGL`; `data-active` and the buttons still work (they only set angles and modes).
* **Function with no finite values at a point** (1/z at 0): the small surfaces and the colouring show the usual grey; nothing special.
* **Root presets** (`sqrt-all`, `cbrt-all`): the small pictures show the principal root only; `#graph4d-shadows-note` reads `The small pictures show the principal root only (z^(1/n) with the cut on the negative real axis). The big view shows every root.` (exponents through `prose`). For single-valued functions the note is `hidden`.
* **No Lab shapes**: the side shadow carries the two lines through the probe; with Lab shapes (`lifted.shapes.length > 0`) it also carries them (z in `--input`, their images in `--output`), and the side caption gains the sentence `So is your Lab drawing.` (fix round: the first wording, `Your Lab drawing is carried too.`, repeated "carried too" after the base caption's `The lines through z are carried too.`)

#### 2.3.5 Copy (exact)

* `h2#graph4d-shadows-title`: `Five shadows of one graph`.
* `p#graph4d-shadows-lede`: `The graph needs four numbers, so every picture is a shadow of it. These five are the same f, seen five ways. The outlined one is what the big view shows right now. Tap the Re, Im or landscape one to turn the big view to it. Change the function with the chips beside the view (below it on a phone).`
* Captions (title in `<strong>`, then one line): side `Side by side` / `Two flat shadows: where z is, and where f sends it. The lines through z are carried too.`; domain `Domain colouring` / `The z-plane painted with w: hue is the angle of w, brightness its length.`; re `Re surface` / `Height is u. Colour is v.`; im `Im surface` / `Height is v. Colour is u.`; landscape `Modulus landscape` / `Height is |w|. Colour is the angle of w.`
* Lit text: `on the big view now`.
* Status (live) when the active shadow changes to a named one: `The big view now shows the Re surface.` / `... the Im surface.` / `... the modulus landscape.`; nothing is announced when it becomes `null`.
* Turn panel heading: `Turn the graph`. The small text under the sliders is the existing one: `uv turns u into v: at 90° the Re surface becomes the Im surface. yv turns y into v: at 90° input and output swap roles.`
* Aria labels: `#graph4d-shadow-re-view` `Re surface of the current function: height u, colour v`, `-im-view` `Im surface of the current function: height v, colour u`, `-landscape-view` `Modulus landscape of the current function: height |w|, colour the angle of w`; buttons `Show the Re surface in the big view` / `Show the Im surface in the big view` / `Show the modulus landscape in the big view`; domain canvas (set by `createDomainColoring`).

---

## 3. Visual encoding (both themes; tokens only)

Colours are read from CSS custom properties at build time and again in `themeRefresh()` (GL) or at draw time (canvas). No literal colour appears outside `FALLBACK_TOKENS` (the existing Node fallback table).
Mixing is done in display sRGB (as `plane.js mixColor` and `rampRgb` do), then converted with `new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace)`; the vertex colour attribute holds the converted (linear) values.

### 3.1 Helix (hand-checked contrast against `--surface`)

| Part | Colour | Opacity / render | Light (`--polar #a84300`, `--surface #fff`, `--text #1a2230`) | Dark (`--polar #ff9d5c`, `--surface #151c2b`, `--text #e9edf5`) |
|---|---|---|---|---|
| Ribbon, inner edge (all windings, the "ghost" ones) | `lerp(--polar, --surface, 0.30)` | 0.90, renderOrder 0, depthWrite false | (194, 123, 77): 3.36 : 1 | (185, 118, 77): 4.68 : 1 |
| Ribbon, outer edge (the lit edge) | `lerp(--polar, --text, 0.25)` | same mesh | (133, 59, 12): darker rim, 8.0 : 1 | (250, 177, 130): brighter rim, 9.5 : 1 |
| Home strip, inner edge | `--polar` | 1.0, renderOrder 1, depthWrite false | 6.1 : 1 | 8.3 : 1 |
| Home strip, outer edge | `lerp(--polar, --text, 0.45)` | same mesh | darker rim | brighter rim |
| Riser wall | `--seam` | opacity 0.38, renderOrder 2, depthWrite false, DoubleSide | grey wall | grey wall |
| Riser outline (`LineLoop` child) | `--seam` | opacity 0.95 | | |
| Floor rings and rays | `--polar` | opacity 0.14 (light) / 0.10 (dark), depthWrite false, renderOrder -1 | | |
| Beads k ≠ 0 | `--polar` | 0.85, renderOrder 3, Lambert shading | | |
| Home bead (k = 0) | `lerp(--polar, --text, 0.35)` | 1.0, renderOrder 3, radius ×1.7 | | |
| Floor point (z) | `--cart` | unchanged: opacity 1, depthTest false, renderOrder 4 | | |
| Seam strip on the floor, axis | unchanged (`--seam`, `--text-muted`) | | | |

The ribbon is a flat radial strip (a strip of the helicoid at radius |z|), so every height rule of iteration 1 still holds exactly. The ghost inner colour is chosen so the dim windings clear 3 : 1 in both themes (the first guess, a 45 percent mix, gave 2.5 : 1 in the light theme and was rejected).
The builder confirms the two ratios by computing them from the real tokens in the unit test (section 7, A1 extra case).

### 3.2 Arithmetic

Unchanged token use on the main plane (`--polar` arcs and rays, `--input` z₁ and z₂, `--output` result). Ruler plane: rings `--polar` width 1 alpha 0.28 (the unit ring, when it is one of the rings, `DASH.guide` alpha 0.5); z₁ and z₂ rays and dots `--input` (rays width 1.5 alpha 0.7); result ray: solid `--polar` width 3 up to the spun dot, then `DASH.guide` `--polar` width 2 with an arrowhead to the result; spun dot hollow `--polar`; result dot `--output` radius 6; ring words `--text-muted`; point words as the main plane. Move glyph: the kit's own style (`color: var(--polar)`).

### 3.3 4D shadows

Figure border `1px solid var(--border)`, radius `var(--radius-sm)`, background `var(--surface)`; the lit figure `outline: 3px solid var(--accent); outline-offset: 2px` plus the text `on the big view now` (not colour alone). Keyboard focus on a shadow button is a different ring: `outline: 3px dashed var(--focus); outline-offset: 6px` (outside the lit ring and dashed, because the button covers the figure and the global solid ring was drawn in the same place and nearly the same colour as the lit one). Side planes: cart grid, z dot `--input`, w dot `--output`, the two probe lines `--cart` (family cart) at width 2.5 (the 1.5 px axes of a 130 px plane read as the same thing at the same weight), Lab shapes `--input` / `--output` at 1.5. The planes print no axis names of their own: the layer prints `x y` / `u v` after the lines through `createLabelPlacer`, which steps a name aside from a line it would touch (the plane's own `y` sat under the horizontal probe line at z = 0.6 + 0.8i). The figures and the mathematical hosts carry `data-ui="math"`. Surfaces: `reImSurface` hidden ramp (purple negative, green zero, yellow positive, same as the big view), `modulusLandscape` hue = Arg w (the same wheel). Domain canvas: `domaincolor.js` colours (data, identical in both themes).

---

## 4. Module APIs

### 4.1 `js/core/three-view.js`

New export (the only new export; section 9 gives the ARCHITECTURE line):

```js
export function helixPoint(r, phi, pitch = HELIX_PITCH)    // pure → [x, y, h] in the maths frame: [r cos φ, r sin φ, pitch·φ/2π]
```

`argHelix` keeps its signature `argHelix({ z = { re: 1, im: 1 }, turns = 2, rMax = 3, seam = -Math.PI, tightFrame = false } = {})` and its return `{ group, update(z, seam?) }`.
`rMax` now sizes only the floor rings, the seam strip, the axis reach and `frameRadius`; the ribbon's radius is |z|.

`group.userData` after this goal (`group.name === 'arg-helix'`, `kind: 'arg-helix'`, `frame: true`):

| key | value |
|---|---|
| `turns`, `rMax`, `pitch`, `seam` | as before (`seam` follows `update`) |
| `beads` | array of `2·turns + 1` spheres, index `k + turns`; position in scene coordinates `(x, h, -y)`, exactly `fromScene(bead.position) = helixPoint(|z|, θ_home + 2πk)` (θ_home is the unique angle in `(seam, seam + 2π]`) |
| `ribbon` | `THREE.Mesh`, name `helix-ribbon`: the whole staircase, **windowed by the seam** (fix round): `φ ∈ [seam − 2π·turns, seam + 2π·(turns + 1)]`, which is `2π(2·turns + 1)` long (so the vertex count does not depend on the seam) and at the default seam −π is exactly `[−(2·turns + 1)π, (2·turns + 1)π]`; radial half-width `W = min(0.28, 0.6·|z|)` around radius |z| at height `pitch·φ/2π`. The beads are at `θ_home + 2πk`, `k = −turns..turns`, `θ_home ∈ (seam, seam + 2π]`, so every bead is inside this window for every seam; the first build wrote the ribbon over `[−(2·turns + 1)π, +(2·turns + 1)π]` whatever the seam, and for seam 0 or −π/2 a home angle above π put the top bead beyond the ribbon's end |
| `ghostSheet` | the same object as `ribbon` (its y range is `[pitch·(seam − 2π·turns)/2π, pitch·(seam + 2π(turns + 1))/2π]`: `±pitch·(turns + 1/2)` at the default seam, which is what the iteration-1 pin checks; see 10.2 for the seam-0 value) |
| `homeSheet` | `THREE.Mesh`, name `helix-home`: the home winding only, `φ ∈ [seam, seam + 2π]`, half-width `min(0.35, 0.8·|z|)`, same radius; its position attribute is rewritten in place on every update (same attribute instance), y range exactly `[pitch·seam/2π, pitch·(seam + 2π)/2π]` |
| `riser` | `THREE.Mesh`, name `helix-riser`, one child `THREE.LineLoop` (the outline); `riser.position` (scene frame) is the centre of the wall: `(r cos σ, pitch·(σ/2π + 1/2), -r sin σ)` with σ the seam and r = |z|; `rotation.y = σ`; `scale.x` = the home half-width |
| `floor` | `THREE.LineSegments`, name `helix-floor`: rings r = 1 … ⌊rMax⌋ (128 segments each) and 12 rays of length rMax, `--polar`, alpha as in 3.1 |
| `floorPoint`, `seamRay`, `axis` | as before |
| `ribbonRadius` | the radius the ribbon and riser currently use: `|z|`, or the last defined value (initially 1) while z is 0 or not finite |
| `frameRadius` | only with `tightFrame`: `hypot(rMax, pitch·(turns + 1/2))` (4.2426 for the defaults), unchanged |
| `fibre` | **removed** (`undefined`) |
| `themeRefresh()` | recolours ribbon and home vertex colours and every material of the group |

Events: none. Lifecycle: `argHelix` builds geometry and materials; `view.add(group)` mounts it; `view.dispose()` (or `disposeObject(group)`) frees everything, including the riser's outline and the floor (they are children, so the module's recursive dispose covers them).
`update` notifies the views exactly once (`notify(group)`), as the iteration-1 test requires.

### 4.2 `js/stations/staircase.js`

New pure named exports (Node-importable; the module has no top-level DOM access):

```js
export function parseStaircaseValues(preset)   // → { z: {re, im}, seam: number } | null
```
`null` unless `preset` is a values preset. Otherwise `valuesOf(preset, { z: 'complex', seam: 'real' })`; `z` is accepted only if finite, `|re| ≤ 2.9`, `|im| ≤ 2.9` and `hypot ≥ 0.2` (else the default `{ re: -1, im: √3 }`); `seam` is accepted if finite and then passed through `normSeam` (else `-π`).
`mount(el, ctx) → unmount` keeps its contract. New imports: `problemCard`, `valuesOf`, `freshNote` from `../core/station-kit.js`; `problemById` from `../data/problems.js`; `videoPanel` from `../core/listen.js`; `helixPoint` is not needed in the station.

Hook `window.__mv.staircase` is unchanged: `{ state() → { z, seam, home, principal, laps, picked, walking }, tracker }`.

### 4.3 `js/stations/arithmetic.js`

New pure named exports:

```js
export function fitPoints(S)                       // → {re, im}[]: the points the main plane is fitted to (S = { mode, z1, z2, conjResult })
export function rulerPlan(z1, z2, mode)            // → { rings: number[], base: 2 | 10, marks: Mark[], result: number, ok: boolean, lo: number, hi: number }
export function rulerRho(r, rings)                 // → number: the ruler radius (plane units, in [0.12, 0.92]) of the length r
export function rulerIntro(plan, mode)             // → string
export function rulerDescription(plan, S)          // → string (S = { mode, z1, z2 })
export function exitPoint(p0, p1, w, h, inset = 12)// → { x, y, t, clipped } | null (canvas pixels)
export function parseArithmeticValues(preset)      // → { z1, z2, mode, conjResult, lockConj, hint, problem } | null
```

`Mark = { kind: 'ring' | 'value', id?: 'z1' | 'z2' | 'result', r: number, label: string }`. `rulerPlan` returns plain JSON-safe data (no functions) because interaction scripts round-trip `plan()` through JSON.
`scenePlan(S, scale)` keeps its signature and its prims; only `scenePlan(...).fit` changes: it is `fitPoints(S)`.
Existing exports (`MODES`, `applyMode`, `arithmeticModel`, `arithmeticReadout`, `arithmeticRows`, `arithmeticCells`, `whyText`, `wrapNote`, `proofsModel`, `labelCands`, `phasesFor`, `pointAt`, `travelerAt`, `snapPoint`, `latticeStep`, `parseComplexField`, `texNum`, `texDen`, ...) are unchanged.

Hook `window.__mv.arithmetic`: `state()` unchanged; `labels()` unchanged; `plan()` now returns `{ ...lastMainPlan, ruler }` with `ruler = { shown: boolean, ...rulerPlan(S.z1, S.z2, S.mode) }`, computed in `render()` (so it is right at mount, before the first frame's layer runs).

### 4.4 `js/stations/graph4d.js`

New pure named exports:

```js
export const SHADOW_IDS                              // frozen ['side', 'domain', 're', 'im', 'landscape']
export function shadowActive({ uv, yv, mode })       // → 're' | 'im' | 'landscape' | null
export function shadowAngles(id)                     // → { uv, yv } | null: 're' → { 0, 0 }, 'im' → { π/2, 0 }, others null
export function shadowSquare(F)                      // → { xRange, yRange }: the square about the centre of F.x × F.y with half-side max(span)/2
export function shadowWExtent(F)                     // → number e: the w-plane is [-e, e]²
export function shadowCaption(id)                    // → { title, line } (the copy of 2.3.5)
```

Hook `window.__mv.graph4d` gains `shadows() → { active: 're' | 'im' | 'landscape' | null, lifted: number }` where `lifted = lifted.shapes.length` (the Lab shapes carried in the side shadow). Existing getters unchanged.
Lifecycle in `unmount`: dispose the three small views (`view.dispose()`), `dc.destroy()`, destroy the two small planes, remove the shadow meshes (`disposeObject`), cancel any pending rAF, remove the new listeners and hook member (all in one `try` block each, as the existing code does).

---

## 5. Algorithms (numbered pseudocode)

### 5.1 `helixPoint` and constants (three-view.js)

```
const RIBBON_PER_TURN = 48           // samples per winding
const RIBBON_HALF = 0.28             // ribbon radial half-width cap
const HOME_HALF = 0.35               // home strip radial half-width cap
const FLOOR_ALPHA = { light: 0.14, dark: 0.10 }
const RISER_FILL = 0.38, RISER_LINE = 0.95

helixPoint(r, phi, pitch = HELIX_PITCH):
  1. return [ r*cos(phi), r*sin(phi), pitch*phi/TAU ]
```

### 5.2 `argHelix` build and update

Build (once):

```
 1. K = clampInt(turns, 1, 8, 2); rMax = rMax > 0 ? rMax : 3; curSeam = finite(seam) ? seam : -PI
    H = HELIX_PITCH*(K + 0.5); nR = RIBBON_PER_TURN*(2K + 1)          // 240 for K = 2
 2. ribbonPos = Float32Array(3*2*(nR + 1))         // 482 vertices for K = 2: 2*48*(2K+1) + 2
    ribbonCol = Float32Array(same length)          // colours, even vertex = inner edge, odd = outer edge
    ribbonIdx: for i in 0..nR-1: [2i, 2i+1, 2i+2,  2i+1, 2i+3, 2i+2]   // Uint16Array(6*nR)
    ribbon = Mesh(geometry(position, color, index), MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.90, depthWrite: false, side: DoubleSide }))
    ribbon.name = 'helix-ribbon'; ribbon.renderOrder = 0; ribbon.frustumCulled = false
 3. homePos = Float32Array(3*2*49); homeCol same; homeIdx for i in 0..47; homeSheet = Mesh(... opacity 1.0, depthWrite false, DoubleSide); name 'helix-home'; renderOrder 1; frustumCulled = false
 4. riser: geometry = 4 vertices (x ±1, y ±pitch/2, z 0), 2 triangles; material MeshBasicMaterial({ color: --seam, transparent, opacity: RISER_FILL, depthWrite false, DoubleSide });
    outline = LineLoop(same 4 corners, LineBasicMaterial({ color: --seam, transparent, opacity: RISER_LINE, depthWrite false }));
    riser.add(outline); riser.name = 'helix-riser'; riser.renderOrder = 2; outline.renderOrder = 2; frustumCulled = false on both
 5. floor: pairs = for r in 1..floor(rMax): 128 segments (a0 = TAU*i/128, a1 = TAU*(i+1)/128) in the scene frame (x = r cos a, y = 0, z = -r sin a);
           plus 12 rays from the origin to rMax*(cos a, 0, -sin a), a = TAU*m/12.  LineSegments with LineBasicMaterial({ color: --polar, transparent, opacity: FLOOR_ALPHA[theme], depthWrite false });
    floor.name = 'helix-floor'; renderOrder = -1; frustumCulled = false
 6. axis, seamRay, floorPoint: exactly as today (axis dashed text-muted from -H to H; seamRibbon(curSeam, rMax); floorPoint sphere 0.15, transparent, depthTest false, renderOrder 4)
 7. beads: for k = -K..K: SphereGeometry(0.12, 14, 10), MeshLambertMaterial({ color, transparent: true, opacity: home ? 1 : 0.85 }); scale home 1.7; renderOrder 3; names helix-bead-home / helix-bead-<k>
 8. group.add(ribbon, homeSheet, riser, floor, axis, seamRay, floorPoint, ...beads); group.userData = { kind, frame: true, turns: K, rMax, pitch, seam: curSeam,
      beads, floorPoint, homeSheet, ghostSheet: ribbon, ribbon, riser, floor, seamRay, axis, ribbonRadius: 1, [frameRadius if tightFrame], themeRefresh }
 9. paintColours(): see 5.2.2
10. update(z, curSeam); return { group, update }
```

`fibre` does not exist: no dashed segment above the point.

#### 5.2.1 `update(zz, newSeam)`

```
 1. if finite(newSeam) && newSeam !== curSeam: curSeam = newSeam; group.userData.seam = newSeam
 2. ok = zz && finite(zz.re) && finite(zz.im)
 3. r = ok ? hypot(zz.re, zz.im) : NaN;  defined = ok && r >= 1e-9
 4. floorPoint.visible = ok
    for b of beads: b.visible = defined
    ribbon.visible = homeSheet.visible = riser.visible = defined
 5. if defined: group.userData.ribbonRadius = r         // else keep the last value (initially 1)
 6. rr = group.userData.ribbonRadius
    writeStrip(ribbonPos, nR, rr, min(RIBBON_HALF, 0.6*rr), curSeam - TAU*K, curSeam + TAU*(K + 1))   -> position.needsUpdate; computeBoundingBox(); computeBoundingSphere()
        // windowed by the seam: the beads (step 8) are at thetaHome + TAU*k with thetaHome in (curSeam, curSeam + TAU], so they all lie inside it
    writeStrip(homePos, 48, rr, min(HOME_HALF, 0.8*rr), curSeam, curSeam + TAU)      -> same three calls
    placeRiser(rr, curSeam, min(HOME_HALF, 0.8*rr))
    seamRay: if the seam changed, rewrite it exactly as today (writeSeamRibbon + bounds)
 7. if !ok: notify(group); return
 8. a = atan2(zz.im, zz.re); t = a - curSeam; t -= TAU*floor(t/TAU); if t === 0: t = TAU; thetaHome = curSeam + t      // unique angle in (seam, seam + 2pi]
    for k = -K..K: beads[k + K].position.set(zz.re, HELIX_PITCH*(thetaHome + TAU*k)/TAU, -zz.im)
        // positions are written even while hidden (z = 0): the iteration-1 pin on bead heights at the origin still holds
    floorPoint.position.set(zz.re, 0, -zz.im)
 9. notify(group)

writeStrip(P, n, r, W, phi0, phi1):
  for i in 0..n:
    phi = phi0 + (phi1 - phi0)*i/n;  c = cos(phi); s = sin(phi); h = HELIX_PITCH*phi/TAU
    P[6i + 0..2] = ( (r - W)*c, h, -(r - W)*s )          // inner vertex 2i
    P[6i + 3..5] = ( (r + W)*c, h, -(r + W)*s )          // outer vertex 2i+1

placeRiser(r, sigma, W):
  riser.position.set(r*cos(sigma), HELIX_PITCH*(sigma/TAU + 0.5), -r*sin(sigma))
  riser.rotation.y = sigma
  riser.scale.set(W, 1, 1)
  riser.userData.angle = sigma
```

Why `rotation.y = sigma`: a rotation about the scene Y axis by σ sends the local +x axis to `(cos σ, 0, -sin σ)`, which is the maths direction at angle σ in the scene frame `(x, h, -y)`; so the wall's width lies along the seam ray and its height is vertical. The wall spans heights `pitch·σ/2π` (the foot, where the home winding starts) to `pitch·(σ + 2π)/2π` (the top, where it ends): one winding.
When z crosses the seam counter-clockwise, the home bead's height drops by one winding minus the little arc moved: it hops from the top of the riser to its foot.

Per-update cost: 482 + 98 vertices rewritten, three bounding computations: well under 0.1 ms; no allocation (the arrays are reused).

#### 5.2.2 Colours

```
paintColours():
  polar = resolveColor('--polar'); surf = resolveColor('--surface'); text = resolveColor('--text')      // display sRGB triples
  mix = (a, b, t) => a.map((v, i) => v*(1 - t) + b[i]*t)
  toLinear = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace)
  ghostIn = toLinear(mix(polar, surf, 0.30));  ghostOut = toLinear(mix(polar, text, 0.25))
  homeIn  = toLinear(polar);                   homeOut  = toLinear(mix(polar, text, 0.45))
  for i in 0..nR:  vertex 2i := ghostIn;  vertex 2i+1 := ghostOut          -> color.needsUpdate
  for i in 0..48:  vertex 2i := homeIn;   vertex 2i+1 := homeOut           -> color.needsUpdate
  riser.material.color, outline.material.color := tokenColor('--seam')
  floor.material.color := tokenColor('--polar'); floor.material.opacity := isDark() ? FLOOR_ALPHA.dark : FLOOR_ALPHA.light
  beads: k != 0 color := tokenColor('--polar'); home bead color := toLinear(mix(polar, text, 0.35))
  floorPoint := tokenColor('--cart'); axis := tokenColor('--text-muted'); seamRay := tokenColor('--seam')
```

`themeRefresh()` = `paintColours()`; `createView3D`'s `setBackgroundFromTheme` calls it on a theme change (it already traverses the scene and calls every `userData.themeRefresh`).

#### 5.2.3 Draw order

`floor` (-1), `ribbon` (0), `homeSheet` (1), `riser` and outline and `seamRay` (2), beads (3), `floorPoint` (4, depthTest false). The iteration-1 contract "the floor point is drawn after every sheet and every bead" holds, so the point still reads `--cart` from every camera angle (the S18 pixel probe).

### 5.3 Staircase station

```
 1. initialState(preset): keep as is, and add:  if preset.kind === 'values': v = parseStaircaseValues(preset); S.z = v.z; S.seam = v.seam; S.tag = 'values'
 2. build the problem card:  card = problemCard(ctx, problemById('1.3.1'), { id: 'staircase-problem', tone: 'polar', answer: 'reveal' })
      note = preset is values and preset.problem === '1.3.1' ? freshNote(problem, preset)
           : preset is values and preset.problem === null     ? 'Your own numbers.' : ''
      card.setProblem(problem, { note })
    el.append(stationHeader(ctx, LEDE), ...(topicNote ? [topicNote] : []), card.el, key panel, grid, ...)       // order as in 2.1.1: the T2.4 note (only on #topic-T2-4) comes first, then the card
 3. videoHost = h('div', { id: 'staircase-video-host' }) appended right after the main panel inside the left .stair-col; add  #staircase-video-host:empty { display: none; }  to STYLE (an empty host must not add a grid gap)
 4. buildHelix():
      view = createView3D(helixHost, { label: <aria label of 2.1.5>, axisLabels: ['Re', 'Im', 'angle'], grid: false, gridSize: 6, cameraPosition: [4.6, 2.4, 5.6] })
      helix = argHelix({ z: S.z, turns: 2, rMax: 3, seam: S.seam, tightFrame: true })      // one line, no nested braces (the source pin)
      view.add(helix.group); view.fitTo(helix.group, { padding: 1.0 })
 5. render(): unchanged, plus  helixNote.textContent = m.defined ? '' : '<z = 0 sentence>'
 6. after first paint:
      videoPanel(videoHost, 'staircase-roots').then((p) => { if (S.destroyed && p) p.remove(); }).catch(() => {})
 7. copy of the helix section and caption: 2.1.5; CSS: add .stair-helix-note { margin: var(--space-1) 0 0; font-size: 0.92rem; color: var(--text-muted); min-height: 1.4em; } to STYLE
 8. unmount: nothing new to free beyond view.dispose() (already pushed to disposers); the video promise is guarded by S.destroyed
```

`cameraPosition` is raised from `[4.6, 1.9, 5.6]` (14.7° elevation) to `[4.6, 2.4, 5.6]` (18.3°): a flat ribbon is edge-on at 0°, so a little height keeps its width visible; the vertical screen span of the bead column falls by `cos 18.3° / cos 14.7° = 0.982`, so the phone pin `spanY ≥ 140` keeps its margin. (`fitTo` re-positions the camera along this direction, so only the direction matters.)

### 5.4 Arithmetic

#### 5.4.1 `fitPoints(S)`

```
 1. M = arithmeticModel(S)
 2. if M.undefinedResult: return [Z0, S.z1, S.z2]                                  // the iteration-1 behaviour (a unit test pins "includes the origin")
 3. pts = [Z0, S.z1]; if M.binary: pts.push(S.z2)
 4. switch S.mode:
      'mul', 'div':  spun = mul(S.z1, expi(sgn * Arg(S.z2))) with sgn = +1 for mul and -1 for div;      // z1 turned by the angle of z2, the heavy ring of the picture
                     pts.push(spun, {1,0}, {-1,0}, {0,1}, {0,-1})                                       // the unit circle's four extremes; NEVER M.value or M.result
      'add', 'sub':  pts.push(M.value, M.result)
      'conj':        pts.push(M.value, M.result)
      'inv':         pts.push(scale(S.z1, 1/|z1|^2), M.value, M.result)                                  // as before
 5. return pts
```

`scenePlan` sets `fit = fitPoints(S)` (it no longer builds `fit` itself). `refit()` and `settleView()` call `plane.fitTo(scenePlan(S, scale).fit, 0.18)` exactly as today.

Hand check for 1.1.1 ×: points 0, (3, -2), (-1, 4), (1.2127, 3.3955), (±1, 0), (0, ±1): x in [-1, 3], y in [-2, 4]; `fitView` (spans 4 and 6, both ≥ 2): centre (1, 1), `unitsAcross = max(4·1.36, 6·1.36) = 8.160` on a square plane. The product's y = 14 maps above the canvas: `toPixel({re: 5, im: 14}).y` = size/2 − (14 − 1)·size/8.16 = −1.093·size, which is negative (the product is above the canvas).
For ÷ the box is x in [-2.668, 3], y in [-2.425, 4]: centre (0.166, 0.787), 8.738 (unchanged from iteration 1, because the quotient (-0.647, -0.588) was already inside).

#### 5.4.2 Main plane layer (changes inside the existing `mainLayer`)

```
 1. sc = plane.getView().scale; plan = scenePlan(S, sc); lastPlan = plan; { w, h } = plane.getSize(); if w < 2: return
 2. clip = null
    if S.mode in {mul, div} and not M.undefinedResult:
        box = viewBox()                                             // the existing helper: { cx, cy, halfW, halfH } in units
        off = abs(M.value.re - box.cx) > box.halfW - inset_u or abs(M.value.im - box.cy) > box.halfH - inset_u     // inset_u = 12 px / sc
        if off: spunPx = plane.toPixel(plan 'spun' prim .z); vPx = plane.toPixel(M.value)
                clip = exitPoint(spunPx, vPx, w, h, 12)             // null when spun itself is outside (cannot happen: spun is in the fit)
 3. draw every prim as today, except:
      prim 's-stretch' with clip && clip.clipped: drawSegment(c, plane, pr.a, plane.fromPixel(clip.x, clip.y), { color: pr.token, width: pr.width, dash: DASH.guide, arrow: true, obstacle: true })
 4. words: for each label prim:
      if clip && pr.id === 'l-result' (and not M.conjResult): anchor = plane.fromPixel(clip.x, clip.y);
            text = pr.text + ' (see ruler)';  cands = labelCands({ ...pr, z: anchor, out: unit screen direction of the stretch })
      else if clip && (pr.id === 'l-result' or 'l-pre') and M.conjResult: anchor = the exitPoint of (origin pixel -> toPixel(pr.z)); text unchanged
      else unchanged
    the θ words stay soft, the answer is not soft (unchanged); 'placed' records every id
 5. result handle: resultHandle.hidden = off(M.result)  (any mode); the handle stays exact (silent set) when visible
 6. traveller dot as today
```

`exitPoint(p0, p1, w, h, inset)`:

```
 1. x0 = inset, x1 = w - inset, y0 = inset, y1 = h - inset
 2. if p0.x < x0 or p0.x > x1 or p0.y < y0 or p0.y > y1: return null
 3. dx = p1.x - p0.x; dy = p1.y - p0.y; t = 1
 4. if dx > 0: t = min(t, (x1 - p0.x)/dx)  else if dx < 0: t = min(t, (x0 - p0.x)/dx)
 5. if dy > 0: t = min(t, (y1 - p0.y)/dy)  else if dy < 0: t = min(t, (y0 - p0.y)/dy)
 6. return { x: p0.x + t*dx, y: p0.y + t*dy, t, clipped: t < 1 }
```

`updateNote()`: for × and ÷ with `offPicture(M)` the text is the new sentence of 2.2.5 (it no longer says the view will zoom out); for the other modes the iteration-1 sentence. `refit()` is still called on mode change, preset load, Fit the view, and `settleView()` after a final drag.

#### 5.4.3 `rulerPlan(z1, z2, mode)`

```
 1. EMPTY = { rings: [], base: 2, marks: [], result: NaN, ok: false, lo: NaN, hi: NaN }
 2. if mode is not 'mul' and not 'div': return EMPTY
 3. r1 = |z1|; r2 = |z2|
    result = mode === 'mul' ? r1*r2 : (r2 < 1e-9 ? NaN : r1/r2)
 4. if result is not finite: return EMPTY                              // result NaN; marks []
 5. if r1 < 1e-9 or r2 < 1e-9 or result < 1e-9: return { ...EMPTY, result }   // result 0: not drawable on a log ruler
 6. radii = [r1, r2, result]; lo = min(radii)/2; hi = 2*max(radii)
 7. e0 = floor(log2(lo) + 1e-12); e1 = ceil(log2(hi) - 1e-12)
    if e1 - e0 + 1 <= 8: base = 2, rings = [2**e for e in e0..e1]
    else: e0 = floor(log10(lo) + 1e-12); e1 = ceil(log10(hi) - 1e-12); base = 10; rings = [Number('1e' + e) for e in e0..e1]
 8. marks = rings.map(r => ({ kind: 'ring', r, label: fmtNum(r, 3, { tiny: true }) }))
          ++ [ { kind: 'value', id: 'z1', r: r1, label: '|z₁| = ' + val(r1) },
               { kind: 'value', id: 'z2', r: r2, label: '|z₂| = ' + val(r2) },
               { kind: 'value', id: 'result', r: result, label: (mode === 'mul' ? '|z₁z₂| = ' : '|z₁/z₂| = ') + val(result) } ]
              where val(x) = fmtNum(x, 3, { tiny: true })      // fix round: the same scale as the ring words (z₁ = 0.01 + 0.02i, z₂ = 0.03 − 0.01i: |z₁z₂| = 7.071×10⁻⁴, not 0.001)
 9. return { rings, base, marks, result, ok: true, lo: rings[0], hi: rings[rings.length - 1] }

rulerRho(r, rings):  RHO0 = 0.12, RHO1 = 0.92
  return RHO0 + (RHO1 - RHO0) * (ln r - ln rings[0]) / (ln rings[last] - ln rings[0])      // rings has at least 2 entries when ok

rulerIntro(plan, mode):
  step = plan.base === 2 ? 'twice' : 'ten times'
  tail = mode === 'mul' ? 'so multiplying is a step outward of the same size from anywhere.' : 'so dividing is a step inward of the same size from anywhere.'
  return 'Distance from 0 is drawn on a log scale: each ring is ' + step + ' the one inside it, ' + tail + ' Directions are true.'

rulerDescription(plan, S):
  if !plan.ok: S.mode === 'div' and |z2| < 1e-9 ? 'z₂ is 0, so the quotient is undefined.' : 'The result is 0, and 0 is not on a log ruler.'
  rings text = plan.rings.map(label).join(', ')
  lower = largest ring <= result (within 1e-9 relative), upper = smallest ring >= result
  place = |lower - result| <= 1e-9*result ? 'on the ' + label(lower) + ' ring' : 'between the ' + label(lower) + ' ring and the ' + label(upper) + ' ring'
  deg = fmtNum(Arg(result complex) in degrees, 1)
  op = S.mode === 'mul' ? ' × ' : ' ÷ '
  return 'Rings at ' + ringsText + '. |z₁| = ' + label(r1) + ' and |z₂| = ' + label(r2) + ', so ' + (mul ? '|z₁z₂|' : '|z₁/z₂|') + ' = ' + label(r1) + op + label(r2) + ' = ' + label(result) + ': ' + place + ', in direction ' + deg + '°.'      // fix round: label(x) = fmtNum(x, 3, { tiny: true }), the function of the ring words and of val above
```

#### 5.4.4 Ruler plane layer (draw order and words)

```
 1. plane = createPlane(rulerHost, { id: 'arithmetic-ruler', xRange: [-1, 1], yRange: [-1, 1], grid: 'none', axes: false, interactive: false, legend: false, maxWidth: 520,
                                     ariaLabel: 'The product on a log ruler: distance from 0 is a log scale, directions are true' });  plane.el.setAttribute('aria-describedby', 'arithmetic-ruler-desc')
 2. layer(c, pl):  if pl.getSize().w < 2 or !shown: return;  R = lastRuler;  put = createLabelPlacer(c, pl)
      if !R.ok: put('no log distance for 0', [{ x: w/2, y: h/2, align: 'center' }]); return
      for ring in R.rings: drawCircle(c, pl, Z0, rulerRho(ring, R.rings), { color: '--polar', width: 1, alpha: ring === 1 ? 0.5 : 0.28, dash: ring === 1 ? DASH.guide : null })
      th1 = Arg(z1), th2 = Arg(z2), thR = Arg(M.value), P(r, th) = fromPolar(rulerRho(r, rings), th)
      drawSegment(Z0 -> P(r1, th1), '--input', 1.5, alpha 0.7);  same for z2
      spun = P(r1, thR)
      drawSegment(Z0 -> spun, '--polar', 3);  drawSegment(spun -> P(result, thR), '--polar', 2, DASH.guide, arrow: true)
      dots: z1, z2 filled '--input' r 5; spun hollow '--polar' (drawCircle 5 px); result filled '--output' r 6; registerObstacle at each dot (radius 9)
      words (put with labelCands): 'z₁' at P(r1, th1), 'z₂' at P(r2, th2), 'z₁z₂' / 'z₁/z₂' at the result dot
      ring words: for ring in rings: put(label, ringSpots(rho(ring))), optional for all but the lowest, the highest and the one equal to 1
 3. ringSpots(rho): [{ z: {re: 0, im: -rho}, dx: -5, dy: 4, align: 'right' }, same with dx: 5 / 'left'] then, for k = 1..8, points on the ring at angle -PI/2 ± 0.3k, dx 0, dy 4, 'center'
      // the same idea as powers.js ringSpots; extracted here, not imported (powers.js is not this goal's file)
```

#### 5.4.5 Render additions

```
 render():  (after the existing lines)
   lastRuler = { shown: mode in {mul, div}, ...rulerPlan(S.z1, S.z2, S.mode) }
   rulerPanel.hidden = rulerHost.hidden = !lastRuler.shown;  el.dataset.ruler = lastRuler.shown ? 'shown' : 'hidden'
   rulerTitle.textContent = S.mode === 'div' ? 'The quotient on a log ruler' : 'The product on a log ruler'
   if shown: rulerIntro.textContent = rulerIntro(lastRuler, S.mode); rulerDesc.textContent = rulerDescription(lastRuler, S)
   updateGlyph(glyph, M.undefinedResult ? { re: NaN, im: NaN } : M.result); glyphHost.hidden = M.undefinedResult
   rulerPlane.requestDraw()
```

#### 5.4.6 Values preset

```
parseArithmeticValues(preset):
 1. v = valuesOf(preset, { z1: 'complex', z2: 'complex', mode: MODES, conjResult: 'bool' }); if v === null: return null
 2. ok = (z) => Math.abs(z.re) <= 100 && Math.abs(z.im) <= 100
    start = { z1: copy(DEFAULT.z1), z2: copy(DEFAULT.z2), mode: DEFAULT.mode }
    if v.z1 && ok(v.z1): start.z1 = v.z1;  if v.z2 && ok(v.z2): start.z2 = v.z2;  if v.mode: start.mode = v.mode
 3. if start.mode === 'div' and |start.z2| < 1e-9: start.z2 = copy(DEFAULT.z2)          // a division by zero is not a usable preset
    if start.mode === 'inv' and |start.z1| < 1e-9: start.z1 = copy(DEFAULT.z1)
 4. conjResult = v.conjResult === true and BINARY.has(start.mode)
 5. problem = preset.problem if it is one of '1.1.1', '1.1.2', 'P1', 'P2', else null
    lockConj = start.mode === 'mul' and problem === 'P2' and eq(start.z2, conj(start.z1), 1e-9)
    hint = problem === '1.1.1' and start.mode === 'mul' ? '1.1.1' : null
 6. return { z1, z2, mode, conjResult, lockConj, hint, problem }
```

`mount` uses it: `const fresh = parseArithmeticValues(ctx.preset)`; when not null it replaces `initialFor(...)`; `stripId` is `fresh.problem` when set (else the iteration-1 rule); the note is `freshNote(problemById(stripId), ctx.preset)` for a values preset whose `problem === stripId`.
The strip gets, after the address-badge paragraph: `div#arithmetic-problem-decisions` containing `decisions.chips(p, { idPrefix: 'arithmetic-problem' })`, and `p#arithmetic-problem-note.muted` (hidden when empty).

#### 5.4.7 DOM order and styles (arithmetic)

```
 .ar-main > .ar-left  : planeHost, p#arithmetic-hint                               (the hint says `The purple dot is the result; when it is too far to draw, it is on the ruler.` for × and ÷ and the iteration-1 sentence otherwise)
 .ar-main > .ar-right : div#arithmetic-play-row.ar-actions [ #arithmetic-animate, #arithmetic-fit ],
                        section#arithmetic-ruler-panel.panel.ar-ruler [ h2#arithmetic-ruler-title.panel-title, div#arithmetic-ruler-host, p#arithmetic-ruler-intro.ar-ruler-note, p#arithmetic-ruler-desc.ar-ruler-note ],
                        the two-points panel (fields, checks, div.ar-actions [ #arithmetic-conj-result ]), captionEl, noteEl, doneEl,
                        div.ar-readout-row [ readoutEl, span#arithmetic-glyph-host.ar-glyph-host [ svg#arithmetic-glyph ] ],
                        wrapEl
 STYLE additions (tokens only, inside the existing STYLE string):
   .ar-ruler                    { min-width: 0; }
   .ar-ruler[hidden], #arithmetic-ruler-host[hidden] { display: none; }
   .ar-ruler-note               { margin: var(--space-1) 0 0; font-size: 0.92rem; color: var(--text-muted); }
   .ar-readout-row              { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
   .ar-readout-row > .readout   { flex: 1 1 14rem; min-width: 0; }
   .ar-glyph-host               { flex: none; display: inline-flex; align-items: center; font-size: 1.6rem; }   /* the glyph is 1.1em of this: about 28 px, the same mark as everywhere */
   .ar-glyph-host[hidden]       { display: none; }
   .ar-problem .decisions       { margin: var(--space-1) 0; }
 The glyph is built once: glyph = moveGlyph(M.result, { id: 'arithmetic-glyph' }) and updated with updateGlyph in render().
```

### 5.5 4D graph

#### 5.5.1 Pure helpers

```
shadowActive({ uv, yv, mode }):
 1. if mode === 'landscape': return 'landscape';  if mode === 'sphere': return null
 2. near = (a, target) => abs(wrapToPi(a - target)) <= 10° + 1e-9       // wrapToPi into (-pi, pi]; angles in radians, 10° = 0.174533
 3. if !near(yv, 0): return null
 4. if near(uv, 0): return 're';  if near(uv, PI/2) or near(uv, 3*PI/2): return 'im';  return null
shadowAngles(id):  're' -> { uv: 0, yv: 0 };  'im' -> { uv: PI/2, yv: 0 };  else null
shadowSquare(F):   cx = (F.x[0] + F.x[1])/2; cy = (F.y[0] + F.y[1])/2; half = max(F.x[1] - F.x[0], F.y[1] - F.y[0])/2
                   return { xRange: [cx - half, cx + half], yRange: [cy - half, cy + half] }
shadowWExtent(F):  sample f on the 13 x 13 grid of F.x x F.y (the rectangle, not the square); m = max(|u|, |v|) over finite samples, capped at F.clamp
                   e = the smallest of [1, 1.5, 2, 3, 4, 6, 8] that is >= 1.1*m  (8 when none)
```

Hand-checked values: `shadowSquare(FUNCS.sq)` = `[-1, 1]²`; `shadowSquare(FUNCS.exp)`: `cx = -0.65, cy = 0, half = 3.14159` gives `xRange [-3.7916, 2.4916]`, `yRange [-π, π]`.
`shadowWExtent`: `sq` m = 2 (at (1, 1)) so 2.2, e = 3; `sqrt-all` m = 1.5538 (at (−2, ±2) the imaginary part is √((2.828 + 2)/2) = 1.554) so 1.71, e = 2; `cbrt-all` m = 1.366 (checked on the 13 × 13 grid) so 1.50, e = 2; `recip` m = 3 (the cap; nearest samples to 0 give 3 or more) so 3.3, e = 4; `exp` m = e^1.2 = 3.320 so 3.65, e = 4.

#### 5.5.2 Building the shadows (`buildShadows(id)`, called from `buildFunction` and once at first paint)

```
 1. F = FUNCS[id]; sq = shadowSquare(F); e = shadowWExtent(F)
 2. dispose the previous small meshes; keep the three views, the two planes and the domain-colouring object alive across functions (only their content changes)
 3. if bigView.unavailable: fill each of the re / im / landscape hosts with  p.muted 'needs WebGL'  and return (the rest below still runs for side and domain)
 4. views are created ONCE at first paint:  reView = createView3D(host, { grid: false, axes: false, hint: false, label: <aria>, cameraPosition: [3, 3, 4] })   // tabindex="-1" set on the host first
        reView.controls.enabled = false;  autoRotate stays false (the default)
    meshes per function:
        reMesh = reImSurface({ f: F.f, xRange: F.x, yRange: F.y, nx: 24, ny: 24, part: 're', clamp: F.clamp })
        imMesh = reImSurface({ ..., part: 'im' })
        landMesh = modulusLandscape({ f: F.f, xRange: F.x, yRange: F.y, nx: 24, ny: 24, clamp: 6 })
        view.add(mesh); view.fitTo(mesh, { padding: 1.1 })
 5. domain:  dc = created once with createDomainColoring(canvas, { f: F.f, xRange: sq.xRange, yRange: sq.yRange, quality: { idle: 1, drag: 1 }, maxPixels: { idle: 25600, drag: 25600 } });
             on a function change: dc.setFunction(F.f); dc.setView({ xRange: sq.xRange, yRange: sq.yRange });
             size the canvas: canvas.width = canvas.height = Math.round(min(160, canvas.clientWidth)) (set again from a ResizeObserver); dc.render('idle')
 6. side: planes zPlane (id 'graph4d-shadow-z'), wPlane (id 'graph4d-shadow-w'), both
        createPlane(host, { interactive: false, legend: false, axes: true, tickLabels: false, grid: 'cart', maxWidth: 160, xRange/yRange: sq (z) or [-e, e] (w), axisLabels: ['x','y'] / ['u','v'] })
        a layer on each reads shadowState = { zPieces, wPieces, labZ, labW, z, w }; both call plane.requestDraw() after refreshShadows()
 7. refreshShadows()  (called from buildFunction, refreshProbe, and once at start)
        zl = [ specToCurves({ kind: 'horizontalLine', y: probe.im, xRange: F.x, n: 96 })[0], specToCurves({ kind: 'verticalLine', x: probe.re, yRange: F.y, n: 96 })[0] ]
        wPieces = pushForwardAll(zl, F.f, { clampRadius: max(40, 3*e) })
        z = probe, w = F.f(probe) (the principal value);  draw: zl with drawTimedCurve('--cart', ramp false, dots false, arrow false, width 1.5), wPieces likewise
        Lab shapes: labZ = strokes.map(timed) in '--input', labW = pushForwardAll(labZ, F.f, ...) in '--output'; labW is recomputed only when the function changes (cached by fn id)
 8. caption note and the lit state: updateShadowActive()  (5.5.3)
```

Notes: `specToCurves` options `xRange`, `yRange`, `n` are builder options it passes through ("a spec may carry any option of its builder under the option's own name"); the call returns a `Curve[]` of one curve for a line kind. A "timed" copy of a Lab stroke adds `t = i/(n - 1)` to each cleaned point (the cleaned lists have no `t`).
The shadows read `FUNCS[id].f`, so the root presets show the principal root; `#graph4d-shadows-note` says so.

#### 5.5.3 The lit state

```
 updateShadowActive():                           // called at the end of updateTexts(), so every slider event, preset, mode change and tap updates it synchronously
   next = shadowActive({ uv: state.uv, yv: state.yv, mode: state.mode })
   for id of SHADOW_IDS: fig.dataset.active = String(id === next);  litSpan.hidden = !(id === next)
   buttons: re.aria-pressed = (next === 're'); im: (next === 'im'); landscape: (next === 'landscape')
   if next !== state.shadow: state.shadow = next; if next: statusEl.textContent = 'The big view now shows the ' + {re: 'Re surface', im: 'Im surface', landscape: 'modulus landscape'}[next] + '.'
   hook.shadows() = { active: next, lifted: lifted.shapes.length }
 tap handlers (on the figure, delegated; the button's click bubbles to it):
   're' / 'im':  a = shadowAngles(id); setAngles({ uv: a.uv, yv: a.yv })            // setAngles already returns to graph mode and updates texts
   'landscape':  setMode(state.mode === 'landscape' ? 'graph' : 'landscape')
```

At the start (z², uv = yv = 0): `active = 're'`, so `#graph4d-shadow-re[data-active="true"]` and `-im` `"false"`. The root presets start at uv = 90°, so `active = 'im'` there.

#### 5.5.4 Layout

```
 DOM (inside #station-graph4d):  header, #graph4d-grid.two-planes.g4-grid > [ div.g4-left > [ figure#graph4d-view-panel.panel > #graph4d-view,  section#graph4d-turn.panel,  section#graph4d-shadows.panel,  div#graph4d-video-host ],
                                                                              section#graph4d-controls.panel ],  probe row, strokes panel, links
 CSS (inside the existing STYLE string, ids under #station-graph4d):
   .g4-grid                      { grid-template-columns: minmax(0, 1fr); align-items: start; }
   @media (min-width: 67.5rem)   { .g4-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
   .g4-left                      { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); min-width: 0; }
   @media (max-width: 67.49rem)  { .g4-left { display: contents; } #graph4d-view-panel { order: 1 } #graph4d-turn { order: 2 } #graph4d-shadows { order: 3 } #graph4d-controls { order: 4 } #graph4d-video-host { order: 5 } }
   .g4-shadow-btn:focus-visible  { outline: 3px dashed var(--focus); outline-offset: 6px; }
   #graph4d-shadows-grid         { display: grid; gap: var(--space-2); grid-template-columns: repeat(3, minmax(0, 1fr)); }
   #graph4d-shadow-side          { grid-column: span 2; }
   @media (max-width: 30rem)     { #graph4d-shadows-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }     /* side spans both: 1 + 2 + 2 */
   .g4-shadow                    { position: relative; margin: 0; padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); min-width: 0; }
   .g4-shadow[data-active="true"]{ outline: 3px solid var(--accent); outline-offset: 2px; }
   #graph4d-shadows .three-view  { aspect-ratio: 1 / 1; min-height: 0; max-width: 160px; margin-inline: auto; pointer-events: none; }
   #graph4d-shadows .three-reset { display: none; }
   .g4-shadow-btn                { position: absolute; inset: 0; background: transparent; border: 0; cursor: pointer; }   /* keeps the global focus ring */
   .g4-shadow-canvas             { display: block; width: 100%; max-width: 160px; aspect-ratio: 1 / 1; margin-inline: auto; pointer-events: none; }
   .g4-side-pair                 { display: flex; gap: var(--space-1); }  .g4-side-pair > div { flex: 1 1 0; min-width: 0; }
   .g4-lit                       { font-size: 0.82rem; font-weight: 700; color: var(--text); }
   #graph4d-video-host:empty     { display: none; }                      /* no manifest entry: no empty grid row */
```

The breakpoint `67.5rem` (1080 px) matches the width at which the old auto-fit grid became two columns (content at least 2 × 23.25 rem + gap), so at 900 px the grid is one column as the iteration-1 pin expects, and at 1280 it is two.
The `#graph4d-view` square rule (`aspect-ratio: 1 / 1; max-width: 520px`) is unchanged.

---

## 6. Mathematics

All values below were worked by hand and re-checked by a second route; they become unit-test expectations (tolerance 1e-9 unless marked).

### 6.1 The helix

* Height of a point of the staircase: `h(φ) = pitch·φ/2π`, pitch 1.2, so one full turn adds 1.2.
* Home angle for seam σ: the unique θ in (σ, σ + 2π] congruent to Arg z. For σ = −π: θ_home = Arg z (Arg is in (−π, π]); for σ = 0: θ_home = Arg z if Arg z > 0 else Arg z + 2π (and 2π for a point on the positive real axis).
* Bead k is `helixPoint(|z|, θ_home + 2πk)`; as scene coordinates `(z.re, h, −z.im)`.
* The ribbon passes through `helixPoint(|z|, φ)` at every sample φ_j = (seam − 2πK) + j·2π/48 (at the default seam −π that is −(2K+1)π + j·2π/48): the midpoint of its two vertices j is exactly that point. A bead is at `φ = θ_home + 2πk ∈ (seam − 2πK, seam + 2π(K + 1)]`, so it lies on the ribbon for every seam (a lower-half-plane z with the seam at 0: θ_home = Arg z + 2π, the top bead at φ = Arg z + 6π < 6π = seam + 2π(K + 1)). Between samples the chord lies within `r(1 − cos 3.75°) = 0.0021·r` of the helix (0.009 at r = 4.2), less than the half-width 0.28 and the bead radius 0.12.
* Counts for K = 2: samples 240; ribbon vertices `2·48·5 + 2 = 482`; ribbon indices 1440; home strip vertices 98, indices 288; floor vertices `3 rings · 128 · 2 + 12 · 2 = 792`.
* Riser: foot height `pitch·σ/2π`, top `pitch·(σ + 2π)/2π` (a winding tall); centre height `pitch·(σ/2π + 1/2)`; for σ = −π: foot −0.6, top +0.6, centre 0.

Worked, problem 1.3.1: z = −1 + i√3.
* **Cartesian address**: (x, y) = (−1, 1.7320508). r = √(x² + y²) = √(1 + 3) = 2. x < 0 and y > 0 (second quadrant), so Arg z = π − atan(y/|x|) = π − atan(√3) = π − π/3 = 2π/3 = 2.0943951.
* **Polar address**: (r, θ) = (2, 2π/3). Back: 2 cos(2π/3) = −1; 2 sin(2π/3) = √3 (checks out). Exponential form 2e^{i2π/3}; polar form 2(cos 2π/3 + i sin 2π/3); arg z = { 2π/3 + 2πk }.
* **Helix** (K = 2, seam −π, so θ_home = 2π/3): bead heights `1.2·(1/3 + k)` = −2.0, −0.8, **0.4**, 1.6, 2.8 for k = −2 … 2 (matches the iteration-1 pin). Bead k = 0 at scene `(−1, 0.4, −1.7320508)`; ribbon radius 2.
* Which address is easy: Cartesian reads the position, polar reads the move; the decisions are Address `C->P` and Names `home` (the one name in (−π, π]).

Worked, A1's case: z = 1 + i. r = √2 = 1.4142136, Arg = π/4. Bead heights `1.2·(1/8 + k)` = −2.25, −1.05, **0.15**, 1.35, 2.55. `fromScene(bead_k.position)` = `helixPoint(√2, π/4 + 2πk)` = `[1, 1, 0.15 + 1.2k]`.
After `update({ re: −1, im: 0 })`: Arg = π (a negative real is π, the top of the window), bead k = 0 at `helixPoint(1, π)` = `[−1, 1.2e-16, 0.6]`; heights 0.6 + 1.2k = −1.8, −0.6, 0.6, 1.8, 3.0. The riser is at `(−1, 0, 1.2e-16)` in scene coordinates (x negative, |y| < 1e-9 after `fromScene`), foot −0.6, top 0.6, so the big bead at height 0.6 sits at the top of the riser: one step counter-clockwise past the seam it hops to −0.6 + ε.
`helixPoint(1, 2π)[2]` = 1.2 (1e-12).

### 6.2 Arithmetic (problem 1.1.1, 1.1.2, P1, P2), both addresses

Given z₁ = 3 − 2i, z₂ = −1 + 4i.

**Polar addresses.** r₁ = √13 = 3.6055513; θ₁ = Arg z₁ = atan2(−2, 3) = −0.5880026 (−33.69°). r₂ = √17 = 4.1231056; θ₂ = Arg z₂ = atan2(4, −1) = π − atan 4 = 3.1415927 − 1.3258177 = 1.8157750 (104.04°).

**1.1.1 product.**
* Cartesian (Def 1.2.4): x = 3·(−1) − (−2)·4 = −3 + 8 = 5; y = 3·4 + (−1)·(−2) = 12 + 2 = 14. z₁z₂ = **5 + 14i**; |·| = √(25 + 196) = √221 = 14.8660687; Arg = atan2(14, 5) = atan 2.8 = 1.2277724 (70.346°).
* Polar: r = r₁r₂ = √13·√17 = √221 = 14.8660687; angle θ₁ + θ₂ = −0.5880026 + 1.8157750 = 1.2277724 (checks out), inside (−π, π], so no wrap. Back: 14.866·cos 1.22777 = 14.866 × 0.336336 = 5.000 (checks out); 14.866 · sin 1.22777 = 14.866 × 0.941742 = 14.000 (checks out).
* Ruler: rings (base 2) 1, 2, 4, 8, 16, 32; ρ(r) = 0.12 + 0.16·log₂ r: ρ(|z₁|) = 0.12 + 0.16 × 1.85022 = 0.41604; ρ(|z₂|) = 0.12 + 0.16 × 2.04373 = 0.44700; ρ(|z₁z₂|) = 0.12 + 0.16 × 3.89395 = 0.74303. Check: (ρ(|z₁z₂|) − 0.12) = 0.62303 = (0.41604 − 0.12) + (0.44700 − 0.12) = 0.29604 + 0.32700 = 0.62304 (checks out) (a product of lengths is a sum of ruler distances). The result lies between the 8 ring (log₂ = 3) and the 16 ring (log₂ = 4): 3.894 ∈ (3, 4) (checks out).
* Move glyph of the result: turn 70.346° → `70.3`, stretch `14.866` (three decimals): `move: turn 70.3°, stretch 14.866`.

**1.1.1 quotient.**
* Cartesian: z₁·conj(z₂)/|z₂|² = (3 − 2i)(−1 − 4i)/17; real part 3·(−1) − (−2)·(−4) = −3 − 8 = −11; imaginary part 3·(−4) + (−1)·(−2)... careful: (3 − 2i)(−1 − 4i) = −3 − 12i + 2i + 8i² = −3 − 8 − 10i = −11 − 10i. So z₁/z₂ = **−11/17 − (10/17)i** = −0.6470588 − 0.5882353i. |·| = √(121 + 100)/17 = √221/17 = 0.8744746 = √(13/17) (since 221/289 = 13/17 (checks out)).
* Polar: r = r₁/r₂ = √13/√17 = √(13/17) = 0.8744746; angle θ₁ − θ₂ = −0.5880026 − 1.8157750 = −2.4037776 (−137.73°), inside (−π, π]. Check: atan2(−10, −11) = −(π − atan(10/11)) = −(3.1415927 − 0.7378150) = −2.4037777 (checks out).
* Ruler (base 2): the smallest radius is the quotient 0.8744746, so lo = 0.8744746/2 = 0.4372373, hi = 2 × 4.1231056 = 8.2462113; e0 = floor(log₂ 0.4372373) = floor(−1.1935) = −2, e1 = ceil(log₂ 8.2462113) = ceil(3.0437) = 4; rings 0.25, 0.5, 1, 2, 4, 8, 16 (7 rings). ρ(r) = 0.12 + 0.8·(log₂ r + 2)/6: ρ(0.8744746) = 0.12 + 0.8 × (−0.19351 + 2)/6 = 0.12 + 0.8 × 0.30108 = 0.36087. The quotient lies between the 0.5 ring and the 1 ring.
* Glyph: turn −137.7°, stretch 0.874: `move: turn -137.7°, stretch 0.874`.

**1.1.2.** z₁ − z₂ = (3 − (−1)) + (−2 − 4)i = **4 − 6i** (Cartesian, two slides); conj = **4 + 6i**; Im(conj(z₁ − z₂)) = **6**. Polar: |4 − 6i| = √52 = 7.2111026; Arg(4 − 6i) = atan2(−6, 4) = −0.9827937 (−56.31°); the mirror turns θ into −θ: Arg(4 + 6i) = +0.9827937; Im = r sin θ = 7.2111026 × 0.8320503 = 6.0000 (checks out). Readout `result = 4 + 6i; |result| = 7.211; Arg = 0.983`; glyph `move: turn 56.3°, stretch 7.211`.

**P1.** Cartesian: conj z₁ · conj z₂ = (3 + 2i)(−1 − 4i) = −3 − 12i − 2i − 8i² = 5 − 14i; conj(z₁z₂) = conj(5 + 14i) = 5 − 14i (checks out). Polar: conj z₁ = √13 e^{+i0.5880}, conj z₂ = √17 e^{−i1.8158}; product √221 e^{i(0.5880 − 1.8158)} = √221 e^{−i1.2278}; conj(√221 e^{i1.2278}) = √221 e^{−i1.2278} (checks out) (a mirror negates every name, and −θ₁ − θ₂ = −(θ₁ + θ₂)).

**P2.** z = z₁: z·conj z = 3² + (−2)² = 13; √13 = 3.6055513 = |z| (checks out). Polar: re^{iθ}·re^{−iθ} = r² = 13; √(r²) = r. Glyph of the product 13: `move: turn 0°, stretch 13`.

**Fresh numbers (the A3 values case).** z₁ = 1 + 2i, z₂ = 2 − i, mode ×: (1)(2) − (2)(−1) = 2 + 2 = 4; (1)(−1) + (2)(2) = −1 + 4 = 3; result **4 + 3i**, readout `result = 4 + 3i; |result| = 5; Arg = 0.644`; polar: r₁ = √5, r₂ = √5, product 5; θ₁ = 1.1071487, θ₂ = −0.4636476, sum 0.6435011 = atan2(3, 4) (checks out).

### 6.3 The shadows and the lit windows

The 4D graph is {(x, y, u, v)}. `rotate4` turns the u–v plane by uv: `u′ = u cos(uv) − v sin(uv)`, `v′ = u sin(uv) + v cos(uv)`; then the y–v plane by yv. `project4to3` keeps `(x, y′, u′)` and paints `v′`.
* uv = 0: height u, colour v: the Re surface. uv = π/2: `u′ = −v`, `v′ = u`: the Im surface turned upside down (height −v, colour u). uv = 3π/2: `u′ = v`: the Im surface the right way up. uv = π: height −u: the Re surface upside down, which is not one of the five shadows (so `active` is `null`).
* Active windows: `re` when |uv mod 2π| ≤ 10° and |yv mod 2π| ≤ 10° (both measured to the nearest multiple of 2π); `im` when uv is within 10° of 90° or 270° and yv within 10° of 0.
* Worked example for z² at z = 0.6 + 0.8i: u = x² − y² = 0.36 − 0.64 = −0.28, v = 2xy = 0.96, |w| = √(0.0784 + 0.9216) = 1, Arg w = 2·Arg z = 2 × 0.9272952 = 1.8545904 (polar rule ρ = r² = 1, φ = 2θ). Big view at uv = π/2: displayed height −v = −0.96, colour u = −0.28.
* Domain colouring: hue = Arg w / 2π (red at 0, counter-clockwise), lightness `1 − 1/(1 + √|w|)` (existing); landscape height |w|, colour = hue of Arg w.

### 6.4 Resolution and sizes (exact)

| Quantity | Value |
|---|---|
| Ribbon vertices (turns K) | `2·48·(2K + 1) + 2` (482 for K = 2, 1634 for K = 8) |
| Ribbon radial half-width | `min(0.28, 0.6 r)` |
| Home strip half-width | `min(0.35, 0.8 r)` |
| Ruler radii | `ρ ∈ [0.12, 0.92]` in a plane `[-1, 1]²` |
| Small surfaces | `nx = ny = 24` (576 vertices each, 3 views) |
| Domain canvas | at most 160 × 160 CSS px, device pixel ratio 1 |
| Small planes | `maxWidth 160` each |

---

## 7. Verification plan

Run from the repo root. The harness runs desktop (1280 × 860) and phone (390 × 844) itself; add `--dark` for the dark desktop.

### A1 — the helix is a ribbon with the beads on it (unit)

`node --test tests/unit/i2-pictures.test.mjs` (Node, no DOM; `three-view.js` imports in Node). Cases and expected values:

1. `h = argHelix({ z: {re: 1, im: 1}, turns: 2 })`: `h.group.userData.ribbon.isMesh === true`; `userData.fibre === undefined`; `userData.riser` exists and `isMesh`; `userData.ghostSheet === userData.ribbon`; `userData.homeSheet.isMesh`; `userData.floor` exists; `userData.beads.length === 5`.
2. For k = −2 … 2: `fromScene(beads[k + 2].position.toArray())` within 1e-6 of `helixPoint(Math.SQRT2, Math.PI/4 + 2*Math.PI*k)` = `[1, 1, 0.15 + 1.2k]`.
3. `h.update({ re: -1, im: 0 })`: bead k = 0 within 1e-6 of `helixPoint(1, Math.PI)` = `[-1, 1.2e-16, 0.6]`; all bead heights `[-1.8, -0.6, 0.6, 1.8, 3.0]`.
4. `Math.abs(helixPoint(1, 2*Math.PI)[2] - HELIX_PITCH) < 1e-12`; `helixPoint(2, 0)` = `[2, 0, 0]`; `helixPoint(1, Math.PI/2)` has x within 1e-12 of 0 and y = 1, h = 0.3.
5. Riser: `p = fromScene(riser.position.toArray())` has `p[0] < 0` and `|p[1]| < 1e-9`, `p[2]` within 1e-9 of 0 (centre height for seam −π); `riser.rotation.y === -Math.PI`; after `h.update({re: 1, im: 1}, Math.PI/2)` the riser position is `fromScene` = `[~0, 1.41421356, 1.2*(0.25 + 0.5)]` = `[≈0, 1.4142136, 0.9]` (x within 1e-9 of 0), `rotation.y === Math.PI/2`.
6. Counts: `ribbon.geometry.attributes.position.count === 482` (turns 2); for turns 3: `2*48*7 + 2 = 674`; `homeSheet` count 98; index counts 1440 and 288; `floor` position count 792.
7. Ribbon on the helix: for j in 0..240 the midpoint of ribbon vertices 2j, 2j+1 (scene → maths) is within 1e-5 (float32) of `helixPoint(Math.SQRT2, -5*Math.PI + j*2*Math.PI/48)` (default seam −π); every ribbon vertex has radius `hypot(x, z)` within `[r - 0.28 - 1e-5, r + 0.28 + 1e-5]` with r = √2 (thin: no disc); `userData.ribbonRadius` within 1e-12 of √2.
8. Y pins (the old ones still hold): home y range `[-0.6, 0.6]` for seam −π and `[0, 1.2]` after `update(.., 0)` with the same attribute instance; `ghostSheet` y range `±HELIX_PITCH*3.5` within 1e-5 for turns 3 at seam −π, and `[−3·1.2, 4·1.2]` after `update(.., 0)` (the ribbon follows the seam: 10.2).
8b. **Fix round: every bead is on the ribbon for every seam.** For turns 2 and 3, seams −π, 0, −π/2, π/2, π/3, 2.5 and z in every quadrant (including 2 − 1.5i, −1 − i, 1 + i, 2.5 − 2i): the ribbon's first and last vertex heights are `pitch·(seam − 2π·turns)/2π` and `pitch·(seam + 2π(turns + 1))/2π` (1e-5, float32); every bead's height is inside that range, its radius is |z| (1e-9) and its distance to the ribbon's midline (interpolated at the bead's height) is at most `0.00215·|z|` (the chord error `r(1 − cos 3.75°)`) and at most the half-width; the same after `update(−z, seam + 1)`. The reviewer's case z = 2 − 1.5i, seam 0: bead heights −1.323, −0.123, 1.077, 2.277, 3.477 and a ribbon top above 3.477 (it was 3.0). The interaction script repeats this on the live view at seams 0, −π/2, π/2, −π with z = 2 − 1.5i (route `staircase`, step 4a).
9. Hidden cases: `update({re: NaN, im: 0})` hides beads, ribbon, riser, homeSheet and floorPoint; `update({re: 0, im: 0})` hides beads, ribbon, riser, homeSheet and keeps `floorPoint.visible`, and the bead heights are still `[-2.4, -1.2, 0, 1.2, 2.4]` for seam −π (the iteration-1 pin); `update({re: 1, im: 1})` shows them again.
10. `notify` once: the existing "auto redraw" test still counts 1 per update.
11. Contrast (extra): compute from the fallback tokens (`FALLBACK_TOKENS`) the ghost inner colour `lerp(--polar, --surface, 0.30)` and assert contrast against `--surface` ≥ 3.0 in both the light and the dark table (3.36 and 4.68 are expected from the real CSS tokens; with the fallback table the builder asserts ≥ 3.0).
12. `Object.keys` of the module still has `argHelix` with the same default signature; `helixPoint.length === 2`.

### A2 — the helix reads as a staircase at phone width in the dark theme (screenshot review)

`node tools/smoke.mjs --route staircase --dark --out docs/review/iter-2/i2-pictures` then read `staircase--desktop-dark.png` and `staircase--phone.png`. Pass means: one continuous ribbon winding upward with a visibly brighter edge; the five beads sit on the ribbon (none on a separate vertical line: there is no dashed fibre); the big bead's grey riser is visible at the seam (or, from the camera's side, its outline); the floor rings are faint (they must not compete with the ribbon); no stack of translucent discs; the point z is a `--cart` dot on the floor. In the interaction script `ctx.shot('helix')` is taken after `view.renderNow()` and a scroll of the helix into view (a view off screen draws nothing).

### A3 — interaction script `tests/interact/i2-pictures.mjs`

`node tools/smoke.mjs --route problem-1-1-1 --script tests/interact/i2-pictures.mjs [--dark]`, and the same with `--route graph4d` and `--route staircase`. The default export branches on `ctx.route`. Helpers from `_helpers.mjs`: `clickChip`, `readText`, `setSlider`, `settle`, `dragHandle`. Wait with `page.waitForFunction`, never fixed sleeps longer than the 600 ms the spec names.

**Route `problem-1-1-1`** (mode ×, z₁ = 3 − 2i, z₂ = −1 + 4i):
1. `#arithmetic-ruler-host` is visible (`isVisible`), its bounding width ≥ 280 and ≤ the viewport width.
2. `window.__mv.arithmetic.plan().ruler.result` within 1e-6 of `Math.sqrt(221)`; `ruler.rings` deep-equals `[1, 2, 4, 8, 16, 32]`; `ruler.ok === true`; `ruler.shown === true`.
3. `p = window.__mv.planes.get('arithmetic-plane')`: `p.getView().unitsAcross <= 12` (expected 8.16 within 1e-3 at a square plane); `p.toPixel({ re: 5, im: 14 }).y < 0`.
4. `window.__mv.arithmetic.labels()['l-theta1'] === true` and `['l-theta2'] === true` and `['l-result'] === true`, at both viewports. (If `l-theta1` cannot be placed at 390 px, raise the θ words' `maxCost` for the first and last candidate rings in `labelCands` before touching any pin; do not drop the word.)
5. `#arithmetic-glyph` exists and its `aria-label` is exactly `move: turn 70.3°, stretch 14.866`.
6. `#arithmetic-problem-decisions` contains `.decision-chip[data-decision="names"][data-value="none"]`; `#arithmetic-problem-address` has `data-value` equal to `problemById('1.1.1').address` (read in-page from `js/data/problems.js`).
7. `#arithmetic-ruler-desc` text equals the description of 2.2.5 for ×.
8. Click `#arithmetic-mode-div`: `plan().ruler.result` within 1e-6 of `Math.sqrt(13/17)` (0.8744746); `ruler.rings` deep-equals `[0.25, 0.5, 1, 2, 4, 8, 16]`; `#arithmetic-glyph` aria-label `move: turn -137.7°, stretch 0.874`; `labels()` all three true.
9. Click `#arithmetic-mode-add`: `#arithmetic-ruler-host` is not visible (`isVisible` false) and `plan().ruler.shown === false`; `p.toPixel({ re: 2, im: 2 })` is inside the canvas (`0 ≤ x ≤ w`, `0 ≤ y ≤ h`); `getView().unitsAcross` within 1e-3 of 8.16. Click mul again: the ruler is visible again.
10. Values preset: `window.__mv.app.request({ station: 'arithmetic', problem: '1.1.1', family: '1.1.1', values: { z1: {re:1, im:2}, z2: {re:2, im:-1}, mode: 'mul' } })`; navigate away and back (`location.hash = '#home'`, wait for `#view[data-station="home"]`, then `location.hash = '#arithmetic'`; setting the same hash would not fire `hashchange`); after the mount, `window.__mv.arithmetic.state().z1` within 1e-9 of 1 + 2i, `#arithmetic-readout` contains `result = 4 + 3i`, `#arithmetic-problem-note` contains `Fresh numbers`.
11. `ctx.shot('mul')` and `ctx.shot('ruler')` for review.

**Route `graph4d`:**
1. `#graph4d-shadows` has exactly five `figure[data-shadow]` whose `data-shadow` values in order are `side, domain, re, im, landscape`; `#graph4d-shadows-lede` text contains `every picture is a shadow`.
2. At the start `#graph4d-shadow-re` has `data-active="true"` and `#graph4d-shadow-im` has `data-active="false"`; `window.__mv.graph4d.shadows()` deep-equals `{ active: 're', lifted: 0 }` (the script first runs `localStorage.removeItem('mv:lab.strokes')` and reloads the route, so the count is 0 whatever an earlier run stored).
3. `setSlider(page, 'graph4d-uv', Math.PI / 2)`: `-im` active, `-re` not, `shadows().active === 'im'`; `setSlider(page, 'graph4d-uv', Math.PI)`: `shadows().active === null` and every figure `data-active="false"`; `setSlider(page, 'graph4d-uv', 3 * Math.PI / 2)`: `'im'`.
4. `clickChip(page, 'graph4d-shadow-re')` (a click on the figure): `Number(#graph4d-uv value)` within 0.02 of 0 and `-re` active again; click `#graph4d-shadow-im`: uv within 0.02 of π/2 and `-im` active; `#graph4d-readout` contains `uv = 90°`.
5. `#graph4d-shadow-landscape` click: `window.__mv.graph4d.mode === 'landscape'` and `shadows().active === 'landscape'`; click it again: mode `graph`.
6. Resources: `[...window.__mv.views3d.keys()].filter((k) => k.startsWith('graph4d-shadow')).length <= 3` and equals 3 when WebGL is available; each of those hosts and `#graph4d-shadow-domain-canvas` has `clientWidth <= 160` and `clientHeight <= 160`; `#graph4d-shadow-z-viewport` and `-w-viewport` exist.
7. Layout: at width ≥ 1080 `#graph4d-shadows` left edge equals `#graph4d-view-panel` left edge and its top is below the turn panel; `#graph4d-uv` and `#graph4d-shadow-re` are both inside the viewport after `scrollIntoView` of the shadows with a scroll of at most 400 px from the top. At width ≤ 480 the figures `re` and `im` are in two columns (their `left` values differ and their `top` values are equal only for domain/re), `#graph4d-shadow-side` width ≥ 0.9 × the grid width, and `document.documentElement.scrollWidth <= clientWidth`.
8. Presets: `clickChip(page, 'graph4d-fn-sqrt-all')`: `shadows().active === 'im'` (that preset starts at uv = 90°) and `#graph4d-shadows-note` is visible; `clickChip(page, 'graph4d-fn-sq')`: `'re'` and the note is hidden.
9. Disposal: navigate to `#home` and wait; `window.__mv.views3d` has no key starting with `graph4d`, `window.__mv.planes` has no key starting with `graph4d`.
10. Video: `#video-shadows-4d` is absent while the manifest has no `shadows-4d` entry (the script reads the manifest in the page to decide, so it stays correct when videos are rendered).
11. `ctx.shot('shadows')` after `renderNow()` of the three small views.

**Route `staircase`:**
1. `#staircase-problem-decisions` contains `.decision-chip[data-decision="names"][data-value="home"]`; `#staircase-problem-address` has `data-value` `C->P`; clicking `#staircase-problem-names` shows `#staircase-problem-meaning` with `The home step only: Arg z in (−π, π], and principal values.`
2. `#video-staircase-roots` is absent while the manifest has no `staircase-roots` entry (in-page manifest check as above).
3. Helix (skip when `view.unavailable`; then assert `#staircase-helix-fallback` is visible): via `window.__mv.views3d.get('staircase-helix')` and `v.scene.getObjectByName('arg-helix')`: `userData.ribbon.isMesh`, `userData.fibre === undefined`, `userData.riser` truthy, `beads.length === 5`; each bead's height `y` within 1e-9 of `1.2 * (state().home + 2πk) / 2π` and its radius `hypot(x, z)` within 1e-9 of `hypot(state().z)`; `ribbonRadius` the same; no Mesh in the group other than spheres and `helix-seam` has a vertex farther than `r + 0.36 + 1e-4` from the axis.
4. The hop: `setSlider(page, 'staircase-turn', Math.PI - 0.1)` then `Math.PI + 0.1`: the k = 0 bead's `position.y` before is > 0 and after is < 0 and the drop is between 0.9 and 1.4 (the pitch 1.2 less a small arc).
5. Values preset: `window.__mv.app.request({ station: 'staircase', problem: '1.3.1', family: '1.3.1', values: { z: {re: 0, im: 2} } })`, navigate away and back to `#staircase`; after 600 ms `window.__mv.staircase.state().z` within 1e-9 of `{ re: 0, im: 2 }` and `#staircase-problem-note` contains `Fresh numbers`; `state().home` within 1e-9 of π/2.
6. Phone only (`ctx.viewport.width <= 480`): the home bead's projected radius ≥ 6.5 px (home bead radius 0.12 × 1.7 × 1.5 world units projected with the view's camera and canvas size) and the vertical screen span of the five beads ≥ 140 px (the iteration-1 S9 check also runs).

### A4 — the ruler plan and the fit plan are pure and right (unit)

`node --test tests/unit/i2-pictures.test.mjs` (arithmetic.js imports in Node):

1. `rulerPlan({re:3, im:-2}, {re:-1, im:4}, 'mul')`: `result` within 1e-9 of `Math.sqrt(221)`; `rings` deep-equals `[1, 2, 4, 8, 16, 32]`; `base === 2`; `rings[0] <= min(|z1|, |z2|, result)/2` and `rings.at(-1) >= 2*max(...)`; `marks.filter(m => m.kind === 'ring').map(m => m.label)` deep-equals `['1', '2', '4', '8', '16', '32']`; value marks `|z₁| = 3.606`, `|z₂| = 4.123`, `|z₁z₂| = 14.866`; `ok === true`; the object survives `JSON.parse(JSON.stringify(...))` unchanged.
2. `'div'`: `result` within 1e-9 of `Math.sqrt(13/17)`; `rings` deep-equals `[0.25, 0.5, 1, 2, 4, 8, 16]`.
3. `rulerPlan(z1, {re:0, im:0}, 'div')`: `Number.isNaN(result)`, `marks` deep-equals `[]`, `rings` `[]`, `ok === false`. `rulerPlan({re:0, im:0}, z2, 'mul')`: `result === 0`, `rings` `[]`, `marks` `[]`, `ok === false`. `rulerPlan(z1, z2, 'add')`: `Number.isNaN(result)`, `ok === false`.
4. Powers of ten: `rulerPlan({re: 0.001, im: 0}, {re: 100, im: 0}, 'mul')`: `base === 10`, `rings` deep-equals `[1e-4, 1e-3, 1e-2, 1e-1, 1, 10, 100, 1000]`, `result` within 1e-12 of 0.1.
5. A result on a ring: `rulerPlan({re: 2, im: 0}, {re: 2, im: 0}, 'mul')`: `result === 4`; `rings` `[1, 2, 4, 8]`; `rulerDescription` contains `on the 4 ring`.
6. `rulerRho`: for the 1.1.1 × plan, `rulerRho(1, rings)` = 0.12 (1e-12), `rulerRho(32, rings)` = 0.92, `rulerRho(|z₁|, rings)` = 0.41604 (1e-4), `rulerRho(|z₂|, rings)` = 0.44700 (1e-4), `rulerRho(result, rings)` = 0.74303 (1e-4), and `rho(result) − 0.12` equals `(rho(|z₁|) − 0.12) + (rho(|z₂|) − 0.12)` within 1e-12.
7. `rulerDescription` × equals the string of 2.2.5 exactly; ÷ equals the ÷ string exactly; `rulerIntro(plan, 'mul')` starts `Distance from 0 is drawn on a log scale: each ring is twice` and for the ten-power plan contains `ten times`.
8. `fitPoints({ mode: 'mul', z1: Z1, z2: Z2, conjResult: false })` has no point within 1e-9 of (5, 14); it contains Z0, z₁, z₂, the spun point (1.2126781, 3.3954988) (1e-6) and the four unit extremes; `fitPoints({ mode: 'add', ... })` contains (2, 2); `scenePlan(S, 20).fit` deep-equals `fitPoints(S)` for all six modes. `fitView(fitPoints(S111 mul), 400, 400, 0.18)` = centre (1, 1), unitsAcross 8.160 (1e-3); ÷: (0.166, 0.787, 8.738); add: (1, 1, 8.160).
9. `exitPoint({x: 100, y: 100}, {x: 100, y: -500}, 200, 200)` = `{ x: 100, y: 12, t: 0.146667, clipped: true }` (1e-6); inside segment gives `t === 1`, `clipped === false`; start outside gives `null`.
10. `parseArithmeticValues({ kind: 'values', station: 'arithmetic', problem: '1.1.1', family: '1.1.1', values: { z1: {re: 1, im: 2}, z2: {re: 2, im: -1}, mode: 'mul' } })` = z₁ 1 + 2i, z₂ 2 − i, mode `mul`, `conjResult false`, `lockConj false`, `hint '1.1.1'`; `{ mode: 'div', z2: {re: 0, im: 0} }` falls back to the default z₂ (−1 + 4i); `mode: 'sub', conjResult: true` with problem `1.1.2` keeps the mirror; `mode: 'conj', conjResult: true` drops it (not binary); a z₁ with `re: 101` falls back; a non-values preset returns `null`. P2: `z2 = conj z1` with `problem: 'P2'` sets `lockConj true`.
11. Also run the existing `arithmeticModel` sweep U24 (it calls `scenePlan(S, 20)` for all 1200 states: `fitPoints` must not throw).

Staircase and graph4d pure checks in the same file: `parseStaircaseValues({ kind: 'values', values: { z: {re: 0, im: 2}, seam: -Math.PI/2 } })` = `{ z: {0, 2}, seam: -π/2 }`; `z: {re: 9, im: 0}` and `z: {re: 0, im: 0}` and `z: {re: 0.1, im: 0}` fall back to `{ -1, √3 }`; `seam: NaN` falls back to −π; a seam of π normalises to −π (`normSeam`). `shadowActive`: `({uv: 0, yv: 0, mode: 'graph'}) → 're'`; π/2 → `'im'`; 3π/2 → `'im'`; π → `null`; `0.1745` (≈ 10°) → `'re'`; `0.18` → `null`; `{uv: 0, yv: 0.2}` → `null`; `{uv: 2π − 0.1, yv: 0}` → `'re'`; `{uv: 5, yv: 5, mode: 'landscape'}` → `'landscape'`; `mode: 'sphere'` → `null`. `shadowAngles('re')` = `{0, 0}`, `('im')` = `{π/2, 0}`, `('side')` = `null`. `shadowSquare(FUNCS.sq)` = `[-1, 1]²`; `shadowSquare(FUNCS.exp).xRange` = `[-3.7916, 2.4916]` (1e-3). `shadowWExtent`: sq 3, sqrt-all 2, cbrt-all 2, recip 4, exp 4. `SHADOW_IDS` deep-equals the five ids.

### A5 — the four iteration-1 test pairs stay green

```
node tools/interact-all.mjs i1-core-three i1-station-staircase-powers i1-station-addresses-arithmetic i1-station-branches-graph4d
node --test tests/unit/i1-core-three.test.mjs tests/unit/i1-station-staircase-powers.test.mjs tests/unit/i1-station-addresses-arithmetic.test.mjs tests/unit/i1-station-branches-graph4d.test.mjs
node --test tests/unit/i2-pictures.test.mjs
node tools/smoke.mjs --dark
npm test        # expected red until the integrator edits ARCHITECTURE 3.12: architecture-sync "3.12 exports documented" (helixPoint)
```

**Every changed assertion, and why** (this list is complete; anything else that fails is a bug, not a pin to move):

| File | Assertion | Change | Allowed reason |
|---|---|---|---|
| `tests/unit/i1-core-three.test.mjs`, test `A3 argHelix beads and the jump at the seam` | `assert.equal(u.fibre.visible, false)` | becomes `assert.equal(u.fibre, undefined); assert.equal(u.ribbon.visible, false); assert.equal(u.riser.visible, false)` | `userData.fibre` removed |
| `tests/interact/i1-core-three.mjs`, the seam-strip pixel probe (`for (const o of [u.homeSheet, u.ghostSheet, u.fibre, u.floorPoint, u.axis, ...u.beads]) o.visible = false`) | the list names `u.fibre` (now `undefined`, a TypeError) | becomes `[u.homeSheet, u.ghostSheet, u.riser, u.floor, u.floorPoint, u.axis, ...u.beads]` (`ghostSheet` is the ribbon; the riser and the floor are new and must be hidden so the probe sees only the seam strip) | `userData.fibre` removed (the two new objects follow from the same change) |
| `tests/unit/i1-station-addresses-arithmetic.test.mjs`, test `U28b fit views for the 1.1.1 modes` | `mul: [2, 6, 21.760]` | becomes `mul: [1, 1, 8.160]` (`add`, `sub`, `div`, `conj`, `inv` rows unchanged: div stays `[0.166, 0.787, 8.738]`) | the main plane no longer fits the product |
| `tests/unit/i1-station-branches-graph4d.test.mjs`, `tests/interact/i1-station-branches-graph4d.mjs`, `tests/{unit,interact}/i1-station-staircase-powers.*` | none | none | (graph4d gained the shadows strip and three small views, and the staircase gained a card and a camera: every existing assertion was read and holds; see below) |

Why the other pins hold (read before designing): the helix's `homeSheet` and `ghostSheet` keep their y ranges and attribute identity; bead scene positions are unchanged (`(re, h, -im)`); draw orders of homeSheet, ghostSheet, seamRay, beads stay below the floor point's 4 and the sheets stay `transparent`; `frameRadius` is unchanged; `argHelix({})` default `frameRadius` is still `undefined`; the box of the group is still ±3 × ±3 × ±(turns + 1/2)·1.2 (floor rings reach rMax, the ribbon reaches the same heights), so the hint-room framing test sees no change; the S8 coverage test (`frac > 0.03`) is met by an estimated 10 percent for the 7-winding ribbon; the S18 pixel probe of the floor point still reads `--cart` (ribbon and riser are earlier in the draw order and the point has no depth test); the arithmetic words pins (`['z₁ z₂', 'θ₁', 'θ₂']`, `['z₁ / z₂', 'θ₁', '−θ₂']`) keep their prefixes (the off-plane word is `z₁ z₂ (see ruler)`); `s-stretch` still ends at (5, 14) in the plan (only the drawing is cut); `graph4d`'s `#graph4d-view` parent panel stays wider than the view at 900 px (one column below 1080 px), the 3D view stays square and ≤ 520 px, `vertexCount`, `strokeCount`, probe beads and the readouts are untouched, and its walk check `input` on `#graph4d-uv` still fires. Staircase source-text pins are listed in 0.3 item 4 and are all kept.
The one pin with a thin margin is the phone check `spanY ≥ 140` of the staircase S9 test; the camera direction was chosen to keep 98 percent of its value (5.3). If it fails by a few pixels, lower the camera's y from 2.4 to 2.2 before touching the pin.

### A6 — five shadows beside one object, at both widths (screenshot review)

`node tools/smoke.mjs --route graph4d --dark --out docs/review/iter-2/i2-pictures`, read `graph4d--desktop.png` and `graph4d--phone.png`. Pass means: five captioned small multiples (two tiny planes side by side, a domain-colouring square, two small surfaces, a landscape); the active one outlined and carrying the words `on the big view now`; at 1280 the shadows sit directly under the big view and the turn panel, in the same column, under the sentence containing `every picture is a shadow`; at 390 they form a 2-column grid (side across both columns, then two pairs) with no horizontal overflow (the smoke run reports overflow 0).

### A7 — resources stay bounded (code inspection checklist)

* `graph4d.js` creates exactly four 3D views at run time (the big view, then `graph4d-shadow-re-view`, `-im-view`, `-landscape-view` from one loop); the three small calls pass `grid: false, axes: false, hint: false` and never `autoRotate`; every `reImSurface`/`modulusLandscape` call has `nx: 24, ny: 24`.
* `unmount` disposes the three small views (`view.dispose()`), calls `dc.destroy()`, destroys both small planes, `disposeObject`s the small meshes, cancels rAFs, disconnects the canvas `ResizeObserver`, removes the hook member and the `<style>` (all in the same try/catch style as today); a unit-free interaction check (route graph4d, step 9) proves the registries are empty after leaving.
* The domain canvas is at most 160 × 160 CSS px (`min(160, clientWidth)`), `devicePixelRatio` 1, `maxPixels` 25600.
* The ribbon has `2·48·(2·turns + 1) + 2` vertices (482 for the staircase's turns = 2); the helix frame radius is unchanged (`tightFrame`: 4.2426 for turns 2, rMax 3); `argHelix` allocates its arrays once and reuses them in `update`.
* No literal colour outside canvas or GL code: three-view.js reads tokens through `resolveColor`/`tokenColor` (the existing `FALLBACK_TOKENS` is only the Node fallback); station CSS uses `var(--…)` only; canvases read tokens at draw time.
* `grep -n "#[0-9a-fA-F]\{3,6\}\b" js/stations/staircase.js js/stations/arithmetic.js js/stations/graph4d.js` finds no new literal.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases

* **argHelix**: z = 0 or non-finite (above); |z| tiny (the half-widths scale with r, so the strip narrows instead of crossing the axis); |z| beyond 3 at the corners of the staircase plane (up to 4.2): the ribbon radius follows |z| so the beads still lie on it, and the outer windings may leave the 4.24 frame ball; nothing breaks and orbit or zoom shows them. `turns` 1 to 8 (K = 8: 1634 vertices, a Uint16 index is fine). A seam change with z undefined still rewrites the home strip and riser at the last radius (hidden), so geometry never lags the state.
* **arithmetic**: z₁ or z₂ = 0 in × or ÷ (ruler message); |z| up to 141 (rings 2⁰ … 2⁸ at most, or powers of ten when the count exceeds 8); both factors tiny (rings from 2⁻¹¹ upward; labels use `fmtNum(..., { tiny: true })`); result exactly on a ring (description says `on the 4 ring`); result inside the main plane (no cut, no suffix); the mirror toggle in × or ÷ (hop and words follow the same anchor rule); `lockConj` (P2: result 13 is off the plane; the ruler shows 13 between the 8 and 16 rings); ÷ by 0 (panel visible with the message, glyph host hidden, Play disabled as today).
* **graph4d**: `recip` (grey at the pole in every shadow); `exp` (rectangular domain, square colouring range, w extent 4); root presets (principal root only, note shown, `active` starts `im`); no WebGL (three figures say `needs WebGL`); a function change while a tap-set angle is active (angles are reset by the preset as today, `active` follows); Lab shapes present (side carries them; `lifted` is the shape count); a probe on the pole (`pushForward` cuts, no throw).
* **values presets**: every field validated, defaults on failure, never a throw (sections 5.3, 5.4.6).

### 8.2 Performance plan

* helix `update` is O(580) vertex writes and three bounding computations, no allocation; it runs once per `render()` of the staircase (already once per drag event).
* The shadows are static: sliders, spin and the probe drag do not touch the three small views or the colouring (the big view's `applyNow` is unchanged). Only `refreshShadows()` runs on a probe move (two lines, 96 segments each, `pushForwardAll`, then `requestDraw` on two small planes); Lab-shape images are cached per function.
* Small views are render-on-demand and pause off screen (`createView3D`), so they cost nothing when scrolled away or idle; at most 4 WebGL contexts on the page.
* The ruler plane redraws once per `render()` (about 10 circles, 3 rays, 4 dots, 12 words).
* 60 fps drag target for 2D (arithmetic) and ≥ 30 fps for 3D (the staircase helix) are unaffected: the iteration-1 timing assertions (`lastDrawMs < 50`) stay.

### 8.3 Accessibility

* Every new control has an id and an accessible name (section 2); the three shadow buttons are real buttons with `aria-pressed`; `data-active` plus the visible words `on the big view now` carry the lit state (never colour alone); the status line announces entering Re, Im or landscape.
* The ruler plane has `aria-describedby` → `#arithmetic-ruler-desc`, a full text equivalent of what the plane shows; the move glyph has `role="img"` and the text `move: turn …, stretch …`.
* The helix view keeps the view's group semantics and gets the longer aria label of 2.1.5; the fallback text for no WebGL is unchanged; `#staircase-helix-note` is a polite live region.
* Contrast: ribbon ghost 3.36 : 1 (light) and 4.68 : 1 (dark) against `--surface`, home strip 6.1 : 1 and 8.3 : 1, floor rings are decoration (the axes carry the structure). Focus rings come from the global focus style (the overlay buttons are `position: absolute; inset: 0`, so the ring surrounds the figure).
* Angle words follow rule 10.4.6: the helix copy says "a name, a number in arg z" and "the home step"; the ruler says "direction".

### 8.4 Reduced motion

No new autonomous motion. The helix and shadows are static pictures; a tap on a shadow jumps the sliders instantly; the existing Walk and Play controls keep their steppers. `createView3D` already turns damping off under reduced motion.

### 8.5 Phone layout (390 px)

No horizontal scroll: every new grid track is `minmax(0, 1fr)` and its children `min-width: 0`. Staircase: the helix keeps `#staircase-helix { aspect-ratio: 5 / 6; }` under 30 rem and the beads keep the 1.5× boost; the problem card chips wrap. Arithmetic: ruler plane is the full width (≤ 520), directly after the main plane's hint; the readout row wraps (`flex-wrap`), the glyph stays beside the readout. Graph4d: 2-column shadow grid (side spans 2), thumbnails at most 160 px square, centred; the turn panel directly under the big view; the function chips after the shadows.

---

## 9. Out of scope, and requests to other owners

### 9.1 Out of scope

`powers.js`, `addresses.js`, `branches.js` (owned by `i2-decisions-everywhere`; this goal imports only the same names from `powers.js` as before and never needs to edit it); the Riemann sphere and the Lab's 4D view; rendering the videos (the panels appear when the manifest has entries); the Walk, the Rehearsal Room and the index; the move glyph beside a number on any station other than `arithmetic`; any change to `js/registry.js`, `docs/ARCHITECTURE.md`, `docs/STORY.md`, `js/app.js`, `css/*.css` (all new styles are injected from the station modules, as the architecture asks).

### 9.2 Requests for other owners

1. **Integrator, `docs/ARCHITECTURE.md` 3.12** (needed for `tests/unit/architecture-sync.test.mjs` to go green again; the fix round changes one clause below: the ribbon is windowed by the seam, `[seam − 2π·turns, seam + 2π(turns + 1)]`, same length and vertex count): add, next to the other pure helpers,
   `export function helixPoint(r, phi, pitch = HELIX_PITCH)             // pure → [x, y, h] in the maths frame: [r cos φ, r sin φ, pitch·φ/2π]`
   and replace the `argHelix` comment block with: the staircase over the plane as one thin lit ribbon at radius |z| (flat radial strip of half-width min(0.28, 0.6|z|), `2·48·(2·turns + 1) + 2` vertices, windowed by the seam so every bead lies on it, vertex-coloured: ghost windings dim, a brighter outer edge), the home winding `(seam, seam + 2π]` as a wider bright strip, the beads on the ribbon (one per step k = −turns..turns, the home bead larger), the seam as a grey riser one winding tall plus the dashed floor strip, a faint polar floor; `group.userData` has `beads, floorPoint, homeSheet, ghostSheet (the ribbon), ribbon, riser, floor, seamRay, axis, ribbonRadius, turns, rMax, pitch, seam`; `fibre` is gone. Also section 9 "arithmetic" and "graph4d" id lists need the ids of 2.2.3 and 2.3.3 of this design.
2. **Orchestrator, ownership**: add `tests/unit/i2-pictures.test.mjs` and `tests/interact/i2-pictures.mjs` to this goal's `owns` (the acceptance criteria A1, A3 and A4 name them).
3. **Known red until item 1 is done**: `architecture-sync` for `three-view.js` (`helixPoint` not mentioned in section 3.12). Review B of this goal should not count it against the builder.

---

## 10. Build notes (stage 3: what was built, what differs from sections 1 to 9)

Everything in sections 2 to 8 was built as written except the items below. Each is the smallest change that keeps the design's purpose.

### 10.1 Deviations

| # | Where | What differs | Why |
|---|---|---|---|
| 1 | graph4d, 2.3.1 / 5.5.4 | The five figures stay in DOM order `side, domain, re, im, landscape` (so `figure[data-shadow]` order, ids and `data-active` are exactly as specified), but they are SHOWN in the order re, im, landscape, domain, side by CSS `order` (`#graph4d-shadows-grid`: three columns, side spans two; two columns on a phone: re, im / landscape, domain / side across both). | Measured at 1280 x 860: the turn panel sits at y 767 to 1030 (the header, lede and a 440 px view come first), and with the specified order the Re and Im figures start at y 1505, so a slider and the figure it lights could never be on one screen (the design estimated 560 and 760). With the three tappable figures first they start at y 1248: scrolled so the turn panel is at the top, uv, yv, re, im and landscape are all inside an 860 px window (the interaction script asserts this). The Tab order is unaffected (only re, im and landscape have a button, and their relative order is the same). *(Fix round: this deviation only worked while no video existed. With `shadows-4d` in the manifest the video host, placed between the turn panel and the shadows, put 299 px or more between uv/yv and the figures; the video host now follows the shadows (2.3.1, 5.5.4), and the reordering below still holds. The DOM order of the five figures is kept as specified: reading order and visual order differ, tab order does not; it was weighed again and accepted.)* |
| 2 | graph4d, 5.5.2 | The three small surfaces are built with `wire: false` and framed with `fitTo` padding 0.95 (not 1.1). | At 130 px the wire lines were a dark mesh over the colour; the picture reads as colour only. A tighter padding makes the surface about 15 percent larger in its box. nx = ny = 24 is unchanged (A7). |
| 3 | arithmetic, 5.4.2 | `labelCands(pr, radii = [10, 24, 40])` gained an optional second parameter; the "(see ruler)" word at the cut asks for the radii 10, 24, 40, 64, 90 and 120 and tries two spots below the arrowhead first. | In the fresh-numbers case (1 + 2i)(2 - i) the cut is 12 px from a corner next to the Reset button and every spot within 40 px touched the ray or the hollow ring; the word printed on top of the ring. The default list (and so every iteration-1 pin) is unchanged. |
| 4 | arithmetic, 2.2.4 / A3 | In the fresh-numbers case the product 4 + 3i is OFF the main plane (the two moves are framed in 4.08 units; |4 + 3i| = 5). The note says `The product is 5 from 0, too far to draw here. It is on the ruler.` and the result handle is hidden; the readout and the glyph carry the number. | This is the rule "the fit never includes the result" applied literally; the design's section 6.2 only pins the readout string. The interaction script asserts exactly this. |
| 5 | arithmetic | "Off the plane" for the result handle, the cut and the note of × and ÷ means more than 12 px outside the canvas (the same inset as `exitPoint`), so the arrowhead, the word and the hidden handle always agree. `syncResultHandle()` applies the same 12 px test in every mode (+, −, conj and 1/z too, where nothing is cut: only the note's wording differs, `offPicture` as in iteration 1). *(Fix round: the first text said the other modes kept the iteration-1 view-box test for the handle; the code never did, and the behaviour is fine.)* | One rule for the handle, no 12 px band where the handle and the arrowhead both show. |
| 6 | three-view.js | Beads other than the home bead have opacity 0.85 (iteration 1: 0.55). | The beads now sit on a bright ribbon and read as pale ghosts at 0.55; 0.85 is the design's own number (3.1). Not an assertion of any test. |
| 7 | staircase.js | The view is created with `grid: false` (the faint polar floor is `argHelix`'s own, `userData.floor`). | As specified in 5.3; recorded because the iteration-1 view had `grid: 'polar'`. No test pins the option. |

### 10.2 Changed iteration-1 assertions (the complete list; the design predicted these three and nothing else moved)

| File | Assertion | Change | Reason |
|---|---|---|---|
| `tests/unit/i1-core-three.test.mjs`, `A3 argHelix beads and the jump at the seam` | `u.fibre.visible === false` | `u.fibre === undefined`, `u.ribbon.visible === false`, `u.riser.visible === false` | `userData.fibre` removed |
| `tests/interact/i1-core-three.mjs`, S22 seam-strip probe | the hide list names `u.fibre` | `[u.homeSheet, u.ghostSheet, u.riser, u.floor, u.floorPoint, u.axis, ...u.beads]` | `userData.fibre` removed (the riser and the floor are new and must be hidden for the probe) |
| `tests/unit/i1-station-addresses-arithmetic.test.mjs`, `U28b` | `mul: [2, 6, 21.760]` | `mul: [1, 1, 8.160]` | the main plane no longer fits the product |

No assertion of the staircase, powers, branches or graph4d pairs changed.

### 10.2b Changed assertions of the fix round

| File | Assertion | Change | Reason |
|---|---|---|---|
| `tests/unit/i1-core-three.test.mjs`, `A3 argHelix: the home sheet moves with the seam and the ribbon covers every bead` | after `h.update(C(1, 1), 0)`: `max(ghostSheet y) = HELIX_PITCH * 3.5` | the `3.5` pin is now checked first, at the default seam (max and min `±3.5·pitch`); after the seam moves to 0 the max is `HELIX_PITCH * 4` and the min `-HELIX_PITCH * 3` (turns 3), and every bead height is inside that range | reviewer major 2: the ribbon is windowed by the seam, `[seam − 2π·turns, seam + 2π(turns + 1)]`, so the beads lie on it for every seam. Not one of the three reasons the goal listed in A5; it is the fix the review asked for and the test name already said "the ribbon covers every bead" |
| `tests/unit/i2-pictures.test.mjs`, A1.8 | the same `±3.5·pitch` after `update(.., 0)` | the same split | the same |

New checks of the fix round (no old assertion changed): unit A1.8b and A1.8c (every bead on the ribbon, seams −π, 0, −π/2, π/2, π/3, 2.5, z in every quadrant, turns 2 and 3, and after `update`), A4 tiny lengths in `rulerPlan` and `rulerDescription`; interaction script `i2-pictures`: staircase step 4a (beads inside the ribbon at four seams with z = 2 − 1.5i), 4b (z = 0 keeps the floor point), graph4d step 7 (slider and the three tappable shadows on one screen, now with the video panel present, and the video host after the shadows), arithmetic step 12 (Play and Fit level with the plane, the hint sentence).

### 10.3 Verification record

* `node --test tests/unit/i2-pictures.test.mjs`: 34 tests (A1.1 to A1.13, A4.1 to A4.18, the A7 source checks).
* `node tools/smoke.mjs --route staircase,graph4d --script tests/interact/i2-pictures.mjs --dark` and `--route problem-1-1-1`: all routes pass at 1280, 390 and dark 1280.
* `node tools/interact-all.mjs i1-station-staircase-powers i1-station-addresses-arithmetic i1-station-branches-graph4d`: pass at all three viewports.
* `i1-core-three`: every step that touches the helix (S8, S12, S18, S20, S22, S25, S27) passes, and all other steps pass; S14, S15 and S16 are frame-count steps that failed in some runs while the machine's load average was 16 to 20 (other builders rendering videos) and pass when run alone (`T3_ONLY=S14,S15,S16`). They test `createView3D` scheduling, not the helix.
* `npm test`: green except `architecture-sync` "3.12 exports documented" (`helixPoint`, section 9.2 item 1, expected until the integrator edits ARCHITECTURE) and tests outside this goal.
* No WebGL (Chromium with `--disable-webgl`): graph4d shows `needs WebGL` in the three small figures, a tap on the Im figure still sets uv to 90 degrees, staircase shows its fallback sentence, nothing throws.

---

## 10.4 Fix round (review of stage 4): what was changed, what was not

Smoke baseline: the `shadows-4d` video panel (a `<video preload="metadata">` on an H.264 file) changes what `tools/smoke.mjs` sees on `graph4d`. Playwright's Chromium cannot play H.264 (`canPlayType('video/mp4; codecs="avc1.42E01E"')` is `''`), so it aborts the request (`net::ERR_ABORTED`) and smoke counted it as `request failed: .../media/video/shadows-4d.mp4`, in some runs and not in others. The four interaction scripts of this goal that load a station with a video panel (`i1-station-branches-graph4d`, `i1-station-staircase-powers`, `i1-station-addresses-arithmetic` (the `two-addresses` video of `addresses` and `problem-1-3-1`, rendered by another goal while this one was in review) and `i2-pictures`) now export `expectedErrors = [/request failed: .*\/media\/video\/[\w-]+\.mp4/]`: an aborted request for a video file is allowed, whichever station's video it is; a 404 is still an `HTTP 404` line and still an error. No other error line is allowed. A cleaner fix is for the owner of `tools/smoke.mjs` to ignore `ERR_ABORTED` on media requests; see the request in the build report.

| # | Issue (severity) | Resolution |
|---|---|---|
| 1 | video between slider and shadows (major) | video host moved after the shadows (desktop DOM order) and, on narrow screens, after the function chips (`order` 5); 2.3.1, 2.3.2, 2.3.3, 5.5.4 and deviation 1 updated; the existing "slider and the three tappable shadows are on one screen" assertion passes at 1280 light and dark with the video present |
| 2 | ribbon not windowed by the seam (major) | `update()` writes the ribbon over `[seam − 2π·turns, seam + 2π(turns + 1)]`; 4.1, 5.2, 6.1, 7 A1.8/8b, 9.2 updated; unit tests A1.8b/8c; the interaction check at four seams |
| 3 | A5 red from the video abort (major) | `expectedErrors` above |
| 4 | tap shows no effect off screen (minor) | `showBigView()` after a tap, `scrollIntoView({ block: 'nearest', behavior: 'auto' })` (2.3.3) |
| 5 | DOM order versus visual order of the figures (minor) | kept, as the reviewer accepted; see the note in deviation 1 |
| 6 | focus ring equals lit outline (minor) | dashed `--focus` ring, offset 6 px, outside the lit ring (3.3) |
| 7 | probe lines versus axes, `y` label on the line (minor) | lines at width 2.5; the small planes print their own axis names through the label placer (3.3) |
| 8 | tiny lengths in the ruler labels and description (minor) | `fmtNum(x, 3, { tiny: true })` (5.4.3) |
| 9 | hint says the purple dot is the result (minor) | × and ÷: `The purple dot is the result; when it is too far to draw, it is on the ruler.` (5.4.7) |
| 10 | Play and Fit far below the plane (minor) | first in the right column, level with the plane (2.2.1, 5.4.7) |
| 11 | (1 + 2i)(2 − i) shows the ruler machinery for a modest result (minor, optional) | **not changed.** The rule "the main plane never fits the result" (A3) is what keeps the two arcs readable; a threshold such as "include the result when it is within k times the fitted radius" makes the plane jump between "result drawn" and "result on the ruler" as a drag crosses the threshold, and no k fixes (1 + 2i)(2 − i) (|result| = 5 against a fitted radius of 2.2) without also changing a case the interaction script pins. Recorded as design-literal (deviation 4) |
| 12 | `(see ruler)` word 90 px from the arrowhead on a phone (minor) | **not changed.** Tried candidate slots level with the arrowhead and below it at several offsets: on the 390 px view of 1.1.1 every near slot is taken (the `Im` axis name and the zoom buttons level with the arrowhead, the z₂ name and the dashed stretch below it), so the placer's rule, the nearest slot that touches nothing, picks the top-left corner. The word is the answer's own colour and starts with the answer's name; the note under the plane says where the product is |
| 13 | z = 0 hides the floor point (minor) | the station passes the point itself (2.1.4) |
| 14 | deviation 5 text inaccurate (minor) | corrected (10.1 row 5) |
| 15 | `data-ui` on the new surfaces (minor) | added: `#arithmetic-plane-host`, `#arithmetic-ruler-host`, `#staircase-plane-host`, `#staircase-helix`, `#graph4d-view`, the probe plane host and the five `figure.g4-shadow`; the three 1 px outlined-box lines (shadow card, domain canvas, legend bar) carry `taste-skill-ignore`; `tools/taste.sh lint graph4d.js` now has 0 WARN (its FAILs are the word "shadow" in identifiers, a false positive). `taste.sh inspect` writes to `.taste-skill/` in the repo and was not run: the integrator's |
| 16 | ARCHITECTURE 3.12 (minor, integrator) | not mine; 9.2 item 1 now names the seam-windowed ribbon |
| 17 | `carried too` twice (minor) | `So is your Lab drawing.` (2.3.4, 2.3.5) |

### 10.4b Verification record of the fix round

* `node --test tests/unit/i2-pictures.test.mjs`: 37 tests (A1.8b, A1.8c and A4.7b are new); the four i1 unit files and `i2-pictures`: 187 of 188 on a machine with a load average of 14 to 26, the one miss being the 20 000-point tube timing step of `i1-core-three` ("C2 sphere tubes", `Date.now() - t0 < 3000`), which passes alone and in the next two runs.
* `node tools/smoke.mjs --route staircase,graph4d,problem-1-1-1 --script tests/interact/i2-pictures.mjs --dark --out docs/review/iter-2/i2-pictures`: 9 of 9 (desktop, phone, dark desktop); `graph4d` and `staircase` ignore one and three aborted video requests.
* `node tools/interact-all.mjs i1-station-branches-graph4d` 9/9, `i1-station-staircase-powers` 12/12, `i1-station-addresses-arithmetic` 27/27, `i1-core-three` 3/3, `i2-pictures` 9/9, each run alone (run together under a load average above 20, `i1-core-three` S5 and S14 and one deep-link step failed on timing, and `i1-station-addresses-arithmetic` failed on the `two-addresses` video abort until its script declared it).
* `npm test`: 1130 of 1133; red: `architecture-sync` "3.12 exports documented" (`helixPoint`, 9.2 item 1, the integrator's) and two `zoom-cr` render checks of another goal.
