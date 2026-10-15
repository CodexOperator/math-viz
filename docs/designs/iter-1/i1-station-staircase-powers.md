# Design: i1-station-staircase-powers

Status: iteration 1, wave 1, designer (stage 2). Goal spec: the entry `i1-station-staircase-powers` in
`docs/goals/iter-1.json` (binding). Owns `js/stations/staircase.js` and `js/stations/powers.js`. Every number in
sections 6 and 7 was recomputed with the real `js/core/complex.js` and `js/core/staircase.js` (scratch scripts, not
committed) and every TeX string in section 5 was rendered with the vendored KaTeX 0.16.11 with `throwOnError: true`
(172 strings over 17 states, 0 errors). The builder implements from this file; where this file and a core module
disagree, the core module's real behaviour wins and the difference is listed in section 10.

> **Residue cleanup (iteration 1).** The readouts say `nθ`, `zⁿ` and `|z|ⁿ`; the helix is `argHelix({ tightFrame: true })` with beads 1.5 times larger on a phone; the spiral plane has no axes or tick marks and its words go through the placer; a magnet snap acts on pointer drags only (arrow keys move by exactly their step); the faint nθ ring on the spiral is dashed; a preset chip stops the Walk; the sum panel's lists are `compact`; the staircase and powers grids use `minmax(0, 1fr)`; small and huge numbers print the same way in the readout and the explainer (`2.441×10⁻⁴`). Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

---

## 0. Reading notes: what is pinned, what this design adds, what differs from ARCHITECTURE

**Pinned (do not change).** Plane ids and handle ids: `staircase-plane` / `#staircase-plane-z`, `staircase-sumplane` /
`#staircase-sumplane-z1`, `-z2`, `powers-plane` / `#powers-plane-z`. Stair list host `#staircase-stairs` (k -3..3, so 7
`li`), the sum lists `#staircase-s1`, `#staircase-s2`, `#staircase-s12`. Readouts `#staircase-readout`,
`#staircase-sum-readout`, `#powers-readout` in the formats of ARCHITECTURE 9 (with the one change in D2 below). Controls
`#staircase-walk`, `#staircase-seam`, `#staircase-helix`, `#powers-n` (1..12, default 10), `#powers-report-ntheta`, `-home`,
`-cart`, explainer `powers-ex` (rows `rn`, `ntheta`, `wrapped`, `result` plus the "same point" footer
`#powers-ex-same`), panel `#powers-cartesian` with `#powers-cartesian-toggle`. Imports named by acceptance A6.

**Differences found while reading the code and the docs (decisions).**

- **D1. The seam slider's default.** ARCHITECTURE 9 says `#staircase-seam` is "(-pi..pi, default pi)". The slider's value
  is the *angle of the seam ray*, and the window of home steps is `(seam, seam + 2π]` (that is how the shared widget
  `createStaircase.setSeam` and `argHelix.update(z, seam)` read it). Value `π` would give the window `(π, 3π]`, which is
  not the principal `Arg`. Acceptance A2 needs `Arg` to rise from about 0 past 3.0 and drop to below -3.0 at the start, so
  the default window is `(-π, π]`. Decision: the slider has `min = -π`, `max = π`, `step = π/12` (15°); the state stores the seam
  normalised into `[-π, π)` by `normSeam` (so a slider value of `π` means the same ray and the same window as `-π`: the
  negative real axis, the principal choice). The default value attribute is `-π`. `setSlider("staircase-seam", 0)` (A2)
  is a grid value and gives the window `(0, 2π]`.
- **D2. `n*theta` versus `n·theta`.** ARCHITECTURE 9 prints the powers readout as `n·theta = <v>` (middle dot). Acceptance A4
  asserts the substring `n*theta = 5.236`. The goal spec is binding and plain ASCII is the readout rule, so the readout
  uses `n*theta`. (The sum readout keeps `differ by <k>·2π` exactly as ARCHITECTURE 9 has it; A3 only asserts `2π`.)
- **D3. Extra ids this design adds** (all prefixed by the station id, all listed in sections 2.3, 2.8 and 4.4):
  staircase: `-preset-131`, `-preset-neg`, `-preset-1i`, `-reset`, `-turn`, `-turn-output`, `-seam-output`, `-seam-principal`,
  `-seam-positive`, `-seam-negimag`, `-turn-note`, `-window`, `-cut-note`, `-topic-note`, `-live`, `-walk-status`, `-helix-fallback`,
  `staircase-ex`, `staircase-sum-ex`. powers: `-preset-1-3-2`, `-preset-1i`, `-preset-i`, `-angle` (the "angle text" A4 reads),
  `-wrapnote`, `-n-output`, `powers-spiral` (second plane), `-spiral-desc`, `-flat-note`, `-cartesian-list`, `-chain-empty`, `powers-stairs`. None of them replaces a pinned id.
- **D4. The spiral of acceptance A5.** A5 says "the plane auto-fits or an inset shows z^10". With z = √3 + i the dots are at
  distance 2, 4, 8, ..., 1024: z^10 is 512 times farther out than z, so one linear plane cannot show ten distinct dots
  (an auto-fit to z^10 leaves z to z^6 inside a ten-pixel disk). This design keeps the left plane `powers-plane` at true
  scale for z (draggable, the move), and adds a second, static plane `powers-spiral` that draws z, z^2, ..., z^n on a
  **log ruler**: dot k sits on ring k, rings are equally spaced, ring k is labelled with its true distance `|z|^k`
  (2, 4, 8, ..., 1024), angles are true. That is "an inset that shows z^10", it shows ten dots turned 30 degrees each, and
  the doubling is explicit in the ring labels. The screenshot reviewer should accept it as the A5 picture.
- **D5. Rows versus beads.** The stair list shows `k = -3..3` (A3 needs 7 `li`). The 3D helix draws beads for `k = -2..2`
  (`turns: 2`): with `turns: 3` the helix is so tall that beads are 3 px across at phone width. The list is the complete
  set; the helix is the picture.
- **D6. Problem 1.3.1 lives in `addresses`.** `problems.js` says `station: 'addresses', alsoAt: ['staircase']`, so
  `#problem-1-3-1` routes to `addresses` (registry `stationForProblem`). The staircase station still carries 1.3.1: its
  header has the chip `1.3.1`, its default state is the problem's point, and it accepts the preset `{kind: 'problem', id:
  '1.3.1'}` and the token `#staircase-1-3-1` (same state), so a link from `addresses` to "see all the names" can use
  `#staircase-1-3-1`.
- **D7. "Arg z" always means the home step of the window on screen.** When the student moves the seam the list, the
  readout and the plane all keep the words `Arg z` (acceptance A2 parses `Arg z = <v>` while the seam is at 0), and the
  window is printed beside them (`#staircase-window`). The principal `Arg z` is the window `(-π, π]`; any other window is
  "a choice of home step" and the copy says so. This keeps the three pictures in agreement.
- **D8. `laps` counts net seam crossings**, as ARCHITECTURE 9 says ("net counterclockwise seam crossings since mount"). One
  full lap crosses the seam once, so it adds 1; a half turn through a moved seam also adds 1; going back subtracts.
- **D9. Test files.** `owns` lists only the two station modules, but CONSTRAINTS and the process require unit tests and an
  interaction script per goal. The builder creates `tests/unit/i1-station-staircase-powers.test.mjs` (section 7.4) and
  `tests/interact/i1-station-staircase-powers.mjs` (section 7.5). To make the unit tests possible the two station modules
  export pure helpers next to `mount` (section 4). The station contract only needs `mount`; extra exports are harmless
  (`tests/unit/architecture-sync.test.mjs` only reads the core modules of ARCHITECTURE section 3).
- **D10. Shared helpers live in `powers.js`.** `staircase.js` imports a small kit from `./powers.js` (angle arcs with a
  label block, `snapNice`, number-to-TeX helpers). Both files belong to this goal. The direction matters: `powers.js` has no
  heavy imports, while `staircase.js` imports `three-view.js` (three.js), so the powers page never downloads three.js.

> Superseded in residue cleanup: the readout is `zⁿ = <cart>; |z|ⁿ = <r>; nθ = <v> (<exact>); home step = <Arg> (<exact>)`, and acceptance A4 was reworded to match. The sum readout is `Arg z₁ + Arg z₂ = <v> (<exact>); Arg(z₁z₂) = <w> (<exact>); differ by <k>·2π`.

**What the core modules really export (checked against the source, matches ARCHITECTURE sections 3.1, 3.5, 3.6, 3.7, 3.8,
3.12, 3.13).** `createStaircase(container, { id, kMin, kMax, seam, label, onPick })` appends `div.staircase-wrap` into
`container`; ids inside are `${id}-set`, `-arg`, `-window`, `-list`, `-k<k>`, `-note`; `update(null)` is the z = 0 state; the list
relabels, it does not slide. `createPlane(...)` handles: `onDrag(z, { final, source })` with source `'pointer'`,
`'keyboard'` or `'api'`; `handle.set(z, { silent })`; `snap` is applied to pointer and keyboard moves; a plane with
`interactive: false` still has draggable handles (the handle listeners do not depend on it) but no zoom buttons, no pan, no
wheel and `touch-action: auto` on the canvas. `argHelix({ z, turns, rMax, seam })` returns `{ group, update(z, seam) }`,
`group.userData.beads[k + turns]` is bead k. `createExplainer(...)` columns accept `tint: true`; `same(state)` returns
`{ cart, polar, agree }`.

---

## 1. Goal, story thread, problems

### 1.1 Restatement

Build two stations.

1. **`staircase` ("The Staircase: z, arg z, Arg z")** is the hub of Thread 2 and the direct answer to the student's own
   question: *the difference between a number's args, what defines it in polar form, and the number itself as it sits on the
   Cartesian plane.* One draggable point z on a plane; beside it the list of every name for its angle; below them, the 3D
   staircase. One drag once around the origin makes `Arg z` jump from π to -π while the point and the set of names do not
   jump. A "Walk" button does the lap for you and counts it, a slider moves the seam (the first look at a branch cut), a 3D
   helix shows the same fact standing up, and a second panel shows Theorem 1.4.14, `arg(z1 z2) = arg z1 + arg z2` as sets.
2. **`powers` ("Powers: Spin n Times")** answers problem 1.3.2, `(√3 + i)^10` in Cartesian form, by showing a power as one
   move done n times: z, z^2, ..., z^n as a spiral of dots, the polar column doing the work (`r^n`, `nθ`), and the final
   angle wrapped onto the home step, with the Cartesian multiplication chain shown on request so the cost of the other
   address is visible.

### 1.2 The story thread this carries, and how it shows on screen

| Spine line (STORY section 0) | What the student sees here |
|---|---|
| Place and move (Thread 1) | `powers`: z is a move (turn Arg z, stretch \|z\|); the left plane draws that one move, the right plane draws it n times. The explainer rows carry the badge "easy in Polar". |
| The staircase (Thread 2) | `staircase`: three marks kept apart on every picture. The point z is one blue dot, drawn once. arg z is the faint arcs, the whole list and the beads. Arg z is the solid arc, the shaded row and the big bead. |
| Any step works for powers (Thread 2, T1.4) | `powers`: nθ is one name of arg(z^n); the staircase list beside the spiral outlines the row where nθ landed and shades the home row. "Wrap" means "go to the shaded row". |
| The cut (T2.4 preview) | `staircase`: the seam slider. Move the cut and the jump moves with it; z and arg z do not change. |
| Time | The Walk draws its path with the time ramp (dark at the start, bright at the end), the same ramp every mapping station uses. |

### 1.3 Review problems and topics covered

| Ref | Covered where | What the student does there |
|---|---|---|
| **1.3.2** `(√3 + i)^10` | `powers` (primary; the preset `#problem-1-3-2`) | Sees z = √3 + i (r = 2, Arg = π/6), scrubs n to 10, reads `1024 e^{i5π/3}`, sees 5π/3 wrapped to -π/3, reads `512 - 512√3 i`, opens the Cartesian chain (9 lines) to see the same answer the long way. |
| **1.3.1** `-1 + i√3` in polar and exponential form, `Arg z` | `staircase` (second home; default state) | The default point is -1 + i√3: `Arg z = 2π/3`, `arg z = {2π/3 + 2πk}`, `z = 2 e^{i2π/3}`; the explainer shows that the name k = 1, `2 e^{i8π/3}`, lands on the same `-1 + √3 i`. |
| **T1.3** polar representation, `arg` versus `Arg`, exponential form | both | The staircase list, the arcs, the explainer rows. |
| **T1.4** powers (the powers half; roots belong to `roots`) | `powers` | `z^n = r^n e^{inθ}`; the wrap. |
| **T2.4** multiple-valued functions and branches (first look: the cut) | `staircase` (the seam slider, the `#topic-T2-4` preset) | The cut as the place where a one-number-per-point choice must jump; moving it moves the jump. The cube-root problem 2.4.1 itself belongs to `branches`. |
| Thm 1.4.14 | `staircase` (sum panel) | Drag z1 and z2: the third list shows `Arg z1 + Arg z2` as one of the names of `arg(z1 z2)`. |

Not covered here (see section 9): roots (`roots`), the principal root (`principal-root`), the continuity walk and the Riemann
surface (`branches`), 2.1.x mappings.

---

## 2. UX

Page order, top to bottom, is the same on both stations: header, (notes), the main interactive block, readout and controls,
explainer, secondary pictures, links. Shell classes are used as they are (`.station-header`, `.panel`, `.chips`/`.chip`,
`.btn`, `.slider-row`, `.readout`, `.callout`, `.two-planes`, `.station-links`; ARCHITECTURE 10.1.6). Anything the shell
does not give (the three-marks strip, the two-column main grid, the sum row, the chain list) is a handful of rules in one
`<style data-for="station-staircase">` or `<style data-for="station-powers">` injected once from a template literal that uses
only tokens (section 3.6).

### 2.1 `staircase`: wireframe, desktop (content width at least 900 px)

```
+--------------------------------------------------------------------------------------------+
| The Staircase: z, arg z, Arg z                                    (-)(T2) The staircase...   |
| One dot, many names for its angle. Drag z around 0 and watch what moves and what does not.   |
| [1.3.1]                                                                                      |
+--------------------------------------------------------------------------------------------+
| (only on #topic-T2-4)  Topic T2.4, branches. This station shows the first piece: the cut...  |
+--------------------------------------------------------------------------------------------+
| Three things, kept apart                                                                     |
| (o) z                    | ((( arg z                       | )   Arg z                       |
|  The point. One dot on   |  The set of all names for its   |  One name from that set: the    |
|  the plane, drawn once.  |  angle: Arg z + 2*pi*k ...      |  one in the shaded window ...   |
+--------------------------------------------------------------------------------------------+
| Drag z once around 0                                                                         |
| Drag the dot once around the origin, counterclockwise. The dot moves smoothly. When it ...   |
| +-----------------------------------+  +--------------------------------------------------+ |
| |            Im                     |  | Every name for the angle of z                    | |
| |             |   . z               |  | arg z = { 2pi/3 + 2pi k : k is any integer }     | |
| |            ((( arcs: solid +      |  | Arg z = 2.094 (2pi/3)                            | |
| |  seam ------+--------- Re  faint  |  | Shaded step: the home window (-pi, pi]. ...      | |
| |             |                     |  |  .                                               | |
| |             |                     |  |  [ 2pi/3 + 6pi = 20pi/3        ~ 20.944 ]  k = 3  | |
| +-----------------------------------+  |  ...                                             | |
| z = -1 + 1.732i; Arg z = 2.094         |  [ Arg z = 2pi/3                ~ 2.094 ]  k = 0  | |
|   (2pi/3); laps = 0                    |  (shaded band, bold)                              | |
| Home window: (-pi, pi]. This is the    |  ...                                             | |
| usual choice ...                       |  [ 2pi/3 - 6pi = -16pi/3       ~ -16.755 ] k = -3 | |
| Try a point: (-1+i sqrt3) (-2) (1+i)   |  .                                               | |
| [Walk one lap] [Start over]            |  note: Seam crossed: Arg z dropped by 2pi. ...   | |
| Turn z around 0  [----o------]  120    +--------------------------------------------------+ |
| Where the seam goes [o--------] 180... |  One address, many names (explainer)             | |
| (Negative real axis)(Positive ...)(..) |  rows: address | chosen name | same point: agree | |
|                                        |  Pick a row in the list. Its polar form ...      | |
|                                        |  [callout] Why must Arg z jump? ...              | |
+-----------------------------------+----+--------------------------------------------------+ |
| The same staircase, standing up                                                              |
| text ...                         +------------------------------------+                      |
|                                  |   3D helix (4:3), Reset button     |                      |
|                                  +------------------------------------+  caption             |
+--------------------------------------------------------------------------------------------+
| Adding names: Theorem 1.4.14                                                                 |
| paragraph, paragraph                                                                         |
| +-----------------------------+                                                              |
| | sum plane (z1, z2, z1 z2,   |                                                              |
| | angle arcs stacked)         |                                                              |
| +-----------------------------+                                                              |
| [ arg z1 list ]    +    [ arg z2 list ]    =    [ arg(z1 z2) list ]                         |
| Arg z1 + Arg z2 = 4.712 (3pi/2); Arg(z1 z2) = -1.571 (-pi/2); differ by 1·2pi                |
| Multiplying two points (explainer: z1, z2, z1 z2, angle  and  same point)                    |
+--------------------------------------------------------------------------------------------+
| <- Length, Distance, Circles                                   Powers: Spin n Times ->       |
| Staircase thread:  <- One Point, Two Addresses                 Powers: Spin n Times ->       |
+--------------------------------------------------------------------------------------------+
```

The main block is a two-column grid (`.stair-grid`): column A holds the plane, the readout, the window line, the presets and the
controls; column B holds the stair list, the explainer and the "Why must Arg z jump?" callout. The grid collapses to one
column below 900 px of content width. In the sum panel the plane is on its own row (at most 480 px wide); under it the three
lists sit in a five-cell grid (`list`, `+`, `list`, `=`, `list`) that collapses to one column on phone, with the operators
centred between the lists; then the readout, then the explainer at full width.

### 2.2 `staircase`: wireframe, phone (390 px, content width 358 px)

```
+--------------------------------+
| ≡ (shell header)               |
| The Staircase: z, arg z, Arg z |
| lede (3 lines)                 |
| (T2) badge   [1.3.1]           |
| Three things, kept apart       |
| (o) z   The point. ...         |
| ((( arg z  The set ...         |
| )  Arg z  One name ...         |
| Drag z once around 0           |
| intro paragraph                |
| +----------------------------+ |
| | plane 358 x 358            | |
| |   (no zoom buttons)        | |
| +----------------------------+ |
| z = -1 + 1.732i; Arg z = 2.094 |
|  (2pi/3); laps = 0             |
| Home window: (-pi, pi]. ...    |
| Try a point                    |
| [-1+i sqrt3 (1.3.1)] [-2 (on   |
|  the seam)] [1 + i]            |
| [Walk one lap]  [Start over]   |
| Turn z around 0         120    |
| [-------o-----------------]    |
| This slider is the total turn. |
| Where the seam goes   180, ... |
| [o------------------------]    |
| [Negative real axis (usual)]   |
| [Positive real axis]           |
| [Negative imaginary axis]      |
| Every name for the angle of z  |
| (stair list, 7 rows, 2.5 rem)  |
| One address, many names        |
| (explainer, cells stacked)     |
| callout: Why must Arg z jump?  |
| The same staircase, ...        |
| [3D helix 358 x 269]           |
| Adding names ...               |
| [sum plane 358 x 358]          |
| [arg z1 list]  +               |
| [arg z2 list]  =               |
| [arg(z1 z2) list]              |
| readout, explainer (stacked)   |
| nav links (stacked)            |
+--------------------------------+
```

### 2.3 `staircase`: controls, element by element

| id | Element | Label (exact) | Behaviour |
|---|---|---|---|
| `staircase-plane-z` | handle `<button>` made by the plane (blue dot, DOM label `z`) | aria-label from the plane: "z = -1 + 1.732i; r = 2, θ = 2.094 (Arg)" | Drag, or arrow keys (step 0.1, Shift ×10, Alt ÷10). Pointer and keyboard moves pass through `snapNice` (4 px magnet to a nice point, section 5.1.2). Starts a manual interaction: stops a running Walk (`onDragStart`). |
| `staircase-preset-131` | `button.chip` | `-1 + i√3 (problem 1.3.1)` | `z := -1 + i√3`, exact (not snapped). A teleport: no laps counted, trail cleared, `picked` kept. |
| `staircase-preset-neg` | `button.chip` | `-2 (on the seam)` | `z := -2`. Arg z = π exactly. |
| `staircase-preset-1i` | `button.chip` | `1 + i` | `z := 1 + i`. |
| `staircase-walk` | `button.btn.btn-primary` | `Walk one lap` (running: `Stop walking`; reduced motion: `Step 30° counterclockwise`) | Section 5.2 F. Needs `\|z\| ≥ 0.2`. Escape stops it. |
| `staircase-walk-status` | `<p aria-live="polite">` under the buttons | empty, then e.g. `One lap done. Arg z jumped once. laps = 2.` | Result of the last walk or step. |
| `staircase-reset` | `button.btn` | `Start over` | Default z, seam `-π`, `picked = null`, `laps = 0`, trail cleared, walk stopped. |
| `staircase-turn` | `input[type=range]`, `min = -4π`, `max = 4π`, `step = π/36` (5°), `value = Arg z` | `Turn z around 0` | The total turn (an unwrapped member of arg z). Setting it puts z at `\|z\| e^{i·value}` and counts seam crossings between the old and the new unwrapped angle. Disabled (the native `disabled` property) when z = 0. |
| `staircase-turn-output` | `<output for="staircase-turn">` | `120°` | The unwrapped angle in whole degrees, updated on every move (not clamped to the slider range). |
| `staircase-turn-note` | `<p class="muted">` | `This slider is the total turn. The dot only shows the angle modulo 360°.` | Static. |
| `staircase-seam` | `input[type=range]`, `min = -π`, `max = π`, `step = π/12`, default `-π` | `Where the seam goes` | The angle of the seam ray, in 15° steps. Value is normalised by `normSeam` (`π` means `-π`). Calls `stairs.setSeam`, `helix.update(z, seam)`, redraws the plane. Not a crossing. |
| `staircase-seam-output` | `<output for="staircase-seam">` | `180°, the negative real axis` | `seamLabel(seam)`. |
| `staircase-seam-principal` / `-positive` / `-negimag` | three `button.chip` in a `role="group"` labelled "Seam presets" | `Negative real axis (usual)`, `Positive real axis`, `Negative imaginary axis` | Set the seam to `-π`, `0`, `-π/2`. `aria-pressed="true"` on the one equal to the current seam. |
| `staircase-stairs` | host `<div>` for `createStaircase` (id `staircase-stairs`, k -3..3, `onPick`) | widget text | Row buttons: click or Enter/Space picks step k (outlines it, `aria-pressed`), click again unpicks. Arrow keys, Home, End move between rows (core). |
| `staircase-readout` | `div.readout` | `z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0` | Updated synchronously on every change. Attributes `data-arg`, `data-seam`, `data-laps` for tests. |
| `staircase-window` | `<p>` | see 2.6 | Names the window next to the readout (D7). |
| `staircase-cut-note` | `div.callout[data-tone="polar"]`, `hidden` unless seam ≠ `-π` | see 2.6 | Explains a moved cut. |
| `staircase-topic-note` | `div.callout`, only when `ctx.preset` is the topic T2.4 | see 2.6 | |
| `staircase-live` | `<p class="sr-only" aria-live="polite">` | empty | Receives the walk-finished message and "z is at 0" messages for screen readers. |
| `staircase-ex` | explainer (`createExplainer`, id `staircase-ex`) | caption `One address, many names` | Section 5.2 B (`stairCells`) and C. `#staircase-ex-same` footer. **Superseded in residue cleanup:** this is the widget id: the elements are `staircase-ex-table`, `staircase-ex-same` and `staircase-ex-<row>-<col>`, and `#staircase-ex` does not exist (script step S1 asserts both). The same holds for `staircase-sum-ex` and `powers-ex`. |
| `staircase-helix` | host `<div>` for `createView3D` (id `staircase-helix`) | aria label from the view: "Staircase helix: ..." | Orbit by drag, keyboard when focused (core). |
| `staircase-helix-fallback` | `<p class="callout">`, `hidden` unless WebGL is unavailable | see 2.6 | |
| `staircase-sumplane-z1`, `-z2` | handles of the plane `staircase-sumplane` | labels `z₁`, `z₂` | Drag, arrows, `snapNice` with `{ polar: false }` (Cartesian lattice only, section 5.1.2). |
| `staircase-s1`, `staircase-s2`, `staircase-s12` | hosts for three `createStaircase` (k -1..1, no `onPick`) | widget text | Fed by `sumModel`. |
| `staircase-sum-readout` | `div.readout` | `Arg z1 + Arg z2 = 4.712 (3π/2); Arg(z1 z2) = -1.571 (-π/2); differ by 1·2π` | Updated on every change of z1 or z2. |
| `staircase-sum-ex` | explainer | caption `Multiplying two points` | Rows z1, z2, prod, angle; footer `#staircase-sum-ex-same`. |

### 2.4 `staircase`: interaction

- **Pointer, mouse and pen.** Press the dot, move, release. The dot follows with the grab offset kept. The plane is static
  (`interactive: false`): no wheel zoom, no pan, no zoom buttons, so the origin and the seam never leave the picture.
- **Touch.** The dot has `touch-action: none` (core), a 44 px hit area on coarse pointers. A finger that lands on empty canvas
  scrolls the page (the static canvas has `touch-action: auto`), so the plane never traps a scroll on a phone. The sliders
  and chips are native controls at least 44 px high.
- **Keyboard.** Tab order follows the DOM: presets, the dot, Walk, Start over, Turn, Seam, seam chips, the list rows (one
  tab stop, arrows inside), then the helix (focusable group), then the sum dots. Arrow keys on a dot nudge it; Escape during
  a pointer drag puts it back (core). Turn: arrows ±5°, Home -720°, End 720°. Seam: arrows ±15°. List rows: Up/Down/Home/End
  move, Enter or Space picks. Escape anywhere inside the station stops a running walk (one `keydown` listener on the
  station section, removed in `unmount`).
- **Screen readers.** The dot announces both addresses (core aria-label). The readout is not live (it changes up to 60 times
  a second). The list widget announces a seam crossing through its own polite note. `#staircase-live` announces the end of a
  walk and the z = 0 state.
- **Order of events during a drag.** Every `onDrag` call runs the same pipeline (5.2 D, `onZ` then `render`): track laps, update the list,
  readout, explainer, helix, request a plane redraw. Nothing is smoothed or eased: the readout prints the exact `Arg` of the
  current position, so the jump is a jump.

### 2.5 `staircase`: states

| State | What shows |
|---|---|
| Default | z = -1 + i√3, window (-π, π], laps 0, no trail, nothing picked, Walk enabled. |
| z = 0 (dot dragged onto the origin) | Plane: the text `z = 0 has no angle` at the origin, no arcs. List: the widget's own undefined state (`update(null)`, shows em dashes). Readout `z = 0; Arg z = undefined; laps = <n>`. Helix: beads hidden (`update` with a NaN z). Walk and Turn disabled. `#staircase-window` shows the zero text. Explainer cells show `{ text: 'z = 0 has no angle' }` and the footer reads "not checked". Tracker invalidated (no laps counted across 0). **Superseded in residue cleanup:** the Walk button is not disabled at z = 0 (script S10 clicks it and reads the status "Move z away from 0 first, then walk."); Turn is not walked from 0 either. Design inconsistency (a) of the staircase-powers request is resolved in favour of the script and the code. |
| Seam moved | `#staircase-cut-note` visible, `#staircase-window` names the new window, the chip for that seam pressed (or none), list relabelled, helix home sheet and seam strip moved. |
| Walking | Button reads `Stop walking`; the dot circles; the trail grows with the time ramp; the pipeline runs every frame. |
| Picked step | The row outlined (core), the plane draws that arc emphasised, the helix bead k enlarged, the explainer shows k. |
| Loading | None for the 2D parts (everything is synchronous). The helix host holds the text `Loading the 3D view...` until `createView3D` returns, which is within the same task; the text is removed first (ARCHITECTURE 10.6.2). |
| Error: no WebGL | The core view prints its own message in the host; the station also shows `#staircase-helix-fallback` and never calls `view` methods that need a renderer. Plane and list are unaffected. |
| Error: no canvas | The plane prints its own note (core). The list and readout still work. |
| Error: KaTeX missing | The explainers show the TeX source as text (core degrades). |
| Unknown token (`#staircase-xyz`) | Default state, no message (the router already accepted the route). |
| Reduced motion | Walk becomes a stepper (section 8.4). |

### 2.6 `staircase`: copy (exact strings; plain, direct; ASCII minus; no emoji)

| Where | Text |
|---|---|
| lede | One dot, many names for its angle. Drag z around 0 and watch what moves and what does not. |
| topic note (T2.4 only) | Topic T2.4, branches. This station shows the first piece: the cut. With the seam on the negative real axis, Arg z jumps there. Move the seam to 0° and Arg z is continuous across the negative real axis, but it now jumps across the positive real axis. `Branches and Cuts` (link to `#branches`) has the full story. |
| strip heading | Three things, kept apart |
| strip: z | **z.** The point. One dot on the plane, drawn once. It never splits and it never jumps. |
| strip: arg z | **arg z.** The set of all names for its angle: Arg z + 2πk for every whole number k. The faint arcs, and the whole list. |
| strip: Arg z | **Arg z.** One name from that set: the one in the shaded window (-π, π]. The solid arc, and the highlighted row. |
| main title | Drag z once around 0 |
| main intro | Drag the dot once around the origin, counterclockwise. The dot moves smoothly. When it crosses the dashed seam, the highlighted name Arg z drops by 2π and the list relabels. The set arg z never changes. |
| list heading | Every name for the angle of z |
| window, principal | Home window: (-π, π]. This is the usual choice, so the highlighted name is the principal Arg z. |
| window, moved | Home window: (0, 2π]. You moved the cut, so the highlighted name is the home step for this window, not the principal Arg z. (the interval comes from `windowText(seam)`) |
| window, z = 0 | z is at 0. Every direction reaches 0, so arg 0 is not defined. Drag z away from 0. |
| cut note | You moved the cut. z did not move and arg z did not change. Only the window that picks the home step did. A branch of arg is a continuous choice of home step on one side of the cut. `Branches and Cuts` (link) has more. |
| why callout, title | Why must Arg z jump? |
| why callout, body | One trip around 0 adds a full turn, 2π, to the angle. Arg z has to be a single number for each point, so it cannot keep climbing. Somewhere it must drop back by 2π. That place is the seam. Roots, principal values and branch cuts later in the course all come from this one fact. |
| presets label | Try a point |
| walk status, done | One lap done. Arg z jumped once. laps = 2. (the number is `laps`; "jumped once" is always true for a full lap) |
| walk status, too close | Move z away from 0 first, then walk. |
| walk status, step | Step 5 of 12. (after the twelfth: `One lap done. laps = 2.`) |
| turn note | This slider is the total turn. The dot only shows the angle modulo 360°. |
| seam presets label | Seam presets |
| helix title | The same staircase, standing up |
| helix text | The dot z stays on the floor. Above it is one bead for each name in arg z, and the height of a bead is its angle. The big bead is the home step. Drag z in the plane: all the beads rise together, and at the seam the big bead hops down to the next bead while the beads themselves stay put. |
| helix caption | Drag to turn the view. The dashed strip on the floor is the seam. The helix shows five steps (k = -2 to 2); the list shows seven. |
| helix fallback | The 3D picture needs WebGL, which is switched off here. The plane and the list show the same thing. |
| explainer caption | One address, many names |
| explainer hint | Pick a row in the list. Its polar form lands on the same point. |
| sum title | Adding names: Theorem 1.4.14 |
| sum text 1 | Multiplying adds angles. Take any name of z₁ and any name of z₂. Their sum is a name of z₁z₂, and every name of z₁z₂ comes this way. That is arg(z₁z₂) = arg z₁ + arg z₂ as sets. Drag z₁ and z₂. |
| sum text 2 | The home steps Arg z₁ + Arg z₂ can land outside (-π, π]. Then Arg(z₁z₂) is that sum minus a whole number of turns, and the sum shows up as a higher row of the third list (outlined). |
| sum list labels | arg z₁ , arg z₂ , arg(z₁z₂) (the widgets' `label` option) |
| sum zero | One of the points is 0, so the product is 0 and has no angle. |
| sum explainer caption | Multiplying two points |
| nav, previous / next | the registry titles of `order - 1` and `order + 1` (here Length, Distance, Circles and Powers: Spin n Times) |
| nav, thread | `Earlier on the staircase thread:` / `Later on the staircase thread:` followed by the neighbour's title (here One Point, Two Addresses and Powers: Spin n Times) |

### 2.7 `powers`: wireframe, desktop

```
+--------------------------------------------------------------------------------------------+
| Powers: Spin n Times                                         (T1) (T2) badges                |
| A power is one move repeated. z is a move: turn by its angle, stretch by its length. ...     |
| [1.3.2]                                                                                      |
+--------------------------------------------------------------------------------------------+
| Pick z and n                                                                                 |
| Try: [√3 + i, n = 10 (problem 1.3.2)] [1 + i, n = 8] [i, n = 4]                              |
| Power n  [-----------------o--]   n = 10                                                     |
+--------------------------------------------------------------------------------------------+
| One move: z                           | The same move, n times                               |
| +-----------------------------------+ | +--------------------------------------------------+ |
| |   Im   . z^2 (4 e^{i pi/3})       | | |  rings (log ruler)   10 .  9 .                   | |
| |    |  . z    (o) z handle         | | |   . 8 ... spiral of dots 1..10 (z = 1st dot)     | |
| | ---+--------- Re   dashed unit    | | |  ((( arcs: solid Arg z^n, faint n*theta          | |
| |    |        circle                | | |  --- seam                                        | |
| +-----------------------------------+ | +--------------------------------------------------+ |
| caption                               | caption; "10 dots. Each is the one before ..."       |
+--------------------------------------------------------------------------------------------+
| z^n = 512 - 886.81i; |z|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)          |
| Report the angle as: [n·θ] [home step] [point (x, y)]                                        |
| n*theta = 5pi/3 (5.236 rad): one name of arg(z^n), not the home step                         |
| The spiral crosses the seam 1 time, so nθ = 5π/3 is 1 full turn above the home step -π/3 ... |
+--------------------------------------------------------------------------------------------+
| The same answer, two ways                                                                    |
| z      | √3 + i                          | 2 e^{iπ/6}                    |                      |
| stretch| sqrt(512²+(-886.81)²) = 1024    | r^n = 2^10 = 1024  [easy in Polar]                   |
| spin   | atan2(-886.81, 512) = -π/3      | nθ = 10·π/6 = 5π/3 [easy in Polar]                   |
| home   | atan2 gives it directly: -π/3   | 5π/3 - 2π = -π/3   [easy in Polar]                   |
| z^n    | 512 - 512√3 i                   | 1024(cos(-π/3) + i sin(-π/3)) = 512 - 512√3 i        |
| same point: agree | 512 - 512√3 i        | 1024 e^{-iπ/3}                                       |
+--------------------------------------------------------------------------------------------+
| Where nθ sits on the staircase   | stair list (k -2..2): home row shaded, row k = 1 outlined  |
+--------------------------------------------------------------------------------------------+
| [Try it in Cartesian]   (opens a panel with n - 1 lines, here 9)                             |
+--------------------------------------------------------------------------------------------+
| nav                                                                                          |
```

Phone: one column, in this order: header, "Pick z and n" (chips, slider), "One move: z" plane (358 px), "The same move, n
times" plane (358 px) with its caption, readout and report chips, explainer (cells stacked, Cartesian above polar), the
stair list, the Cartesian toggle, links.

### 2.8 `powers`: controls, element by element

| id | Element | Label (exact) | Behaviour |
|---|---|---|---|
| `powers-plane-z` | handle on plane `powers-plane` (blue dot, DOM label `z`) | core aria-label | Drag or arrows (step 0.1). `snapNice` magnet. |
| `powers-preset-1-3-2` | `button.chip` | `√3 + i, n = 10 (problem 1.3.2)` | `z := √3 + i` exactly, `n := 10`. |
| `powers-preset-1i` | `button.chip` | `1 + i, n = 8` | `z := 1 + i`, `n := 8` (answer 16: one full turn removed). |
| `powers-preset-i` | `button.chip` | `i, n = 4` | `z := i`, `n := 4` (answer 1). |
| `powers-n` | `input[type=range]` min 1 max 12 step 1, default 10 | `Power n` | Sets n; updates every picture. |
| `powers-n-output` | `<output for="powers-n">` | `n = 10` | |
| `powers-readout` | `div.readout` | `z^n = 512 - 886.81i; \|z\|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)` | Updated synchronously on every change. `data-n`, `data-turns` attributes. |
| `powers-report-ntheta` / `-home` / `-cart` | three `button.chip`, `role="group"` labelled "Report the angle as", `aria-pressed` | `n·θ`, `home step`, `point (x, y)` | Choose what `#powers-angle` says and which staircase row is outlined (5.3). Default `n·θ`. |
| `powers-angle` | `<p class="readout">` ("angle text") | see 2.10 | Plain ASCII (`pi`), so a script can read `-pi/3`. |
| `powers-wrapnote` | `<p>` | see 2.10 | Says how many turns were removed. |
| `powers-ex` | explainer, id `powers-ex`, caption `The same answer, two ways` | Rows `base`, `rn`, `ntheta`, `wrapped`, `result`; footer `#powers-ex-same` | Section 5.3 I. |
| `powers-spiral` | static plane (no handles) | aria-label `Powers of z on a log ruler` | Section 5.3 G. `window.__mv.planes.get('powers-spiral')`. |
| `powers-spiral-desc` | `<p class="muted">` | see 2.10 | Text equivalent of the spiral (also `aria-describedby` of the plane). |
| `powers-stairs` | host for `createStaircase` (id `powers-stairs`, k -2..2, label `arg(zⁿ)`) | widget text | Fed `home`; outlined row from the report mode. |
| `powers-cartesian-toggle` | `button.btn` with `aria-expanded`, `aria-controls="powers-cartesian"` | `Try it in Cartesian` / `Hide the Cartesian working` | Shows or hides the panel. |
| `powers-cartesian` | `div.panel`, `hidden` until toggled | title `Multiplying out, one step at a time` | Holds `<ol id="powers-cartesian-list">` with `n - 1` `li.cart-line`. |
| `powers-cartesian-list` | `<ol class="cart-lines">` inside the panel | none | `n - 1` `li.cart-line` (`data-k` = 2..n), the last one with class `is-last`. |
| `powers-chain-empty` | `<p>` inside the panel, `hidden` unless n = 1 | `n = 1: there is nothing to multiply.` | |
| `powers-flat-note` | `<p class="muted">` under the spiral, `hidden` unless the ruler is flat | `\|z\| = 1: every power is on the unit circle, so the ruler is flat. Only the angle changes.` | |

### 2.9 `powers`: interaction and states

Interaction is the same as the staircase's for the dot and the sliders: drag or arrow keys; the plane is static (no zoom,
pan or buttons; page scroll works on touch); `n` moves with arrow keys, Home, End. The toggle button is a disclosure
(Enter and Space).

| State | What shows |
|---|---|
| Default (`#powers`, `#problem-1-3-2`, `#topic-T1-4`, `#powers-1-3-2`) | z = √3 + i exactly, n = 10, report `n·θ`, Cartesian panel closed. |
| z = 0 | Left plane: `z = 0 has no angle`. Spiral plane: `z = 0: every power is 0` at the centre. Readout `z^n = 0; \|z\|^n = 0; n*theta = undefined; home step = undefined`. Explainer cells `{ text: 'z = 0 has no angle' }`, footer "not checked". Stairs `update(null)`. Chain lines are all `0`. |
| `\|z\| = 1` (within 1e-3) | The ruler is flat: one ring, all dots on it, caption note `\|z\| = 1: every power is on the unit circle, so the ruler is flat. Only the angle changes.` |
| `\|z\| < 1` | The spiral runs inward (dot k at ring `0.92 - 0.06k`), ring labels are the true small distances (`0.5`, `0.25`, ...; `2.44e-4` for tiny ones). |
| n = 1 | One dot. `wrapnote` says there is nothing to wrap, chain panel says `n = 1: there is nothing to multiply.` |
| Report mode | Chips set `aria-pressed`; see 5.3. |
| Reduced motion | Nothing on this station moves by itself, so there is nothing to change. |
| Error states | As the staircase's (no canvas, no KaTeX). No WebGL is used. |

### 2.10 `powers`: copy (exact strings)

| Where | Text |
|---|---|
| lede | A power is one move repeated. z is a move: turn by its angle, stretch by its length. zⁿ is that move done n times, which is why polar is the native address for powers. |
| pick title | Pick z and n |
| presets label | Try one |
| left title / caption | One move: z / z turns the plane by Arg z and stretches it by \|z\|. Drag z. The dashed circle has radius 1. |
| right title / caption | The same move, n times / Dot k is zᵏ: dot k - 1 turned by Arg z and stretched by \|z\|. Distance from 0 is drawn on a log ruler: every ring is one more stretch by \|z\|, and the label on a ring is its true distance. Angles are true. |
| spiral desc | 10 dots. Each is the one before it turned by 30° and stretched by 2. z¹⁰ is at distance 1024 in direction -60°. (flat ruler: `... turned by 30° and not stretched.`; z = 0: `z is 0, so every power is 0.`) |
| flat note | \|z\| = 1: every power is on the unit circle, so the ruler is flat. Only the angle changes. |
| report label | Report the angle as: |
| angle text, `n·θ` | `n*theta = 5pi/3 (5.236 rad): one name of arg(z^n), not the home step` |
| angle text, home | `home step = -pi/3 (-1.047 rad): Arg(z^n), 1 full turn removed` (`no turns removed`; `2 full turns added` when n·θ is below the home step) |
| angle text, point | `as a point: (x, y) = (512, -886.81); its angle is atan2(y, x) = -pi/3` |
| wrap note, j = 0 | nθ is already in (-π, π], so there is nothing to wrap. |
| wrap note, j ≠ 0 | The spiral crosses the seam 1 time, so nθ = 5π/3 is 1 full turn above the home step -π/3. Same direction, different name. (`above` or `below`; `times` and `turns` when plural) |
| explainer caption | The same answer, two ways |
| explainer hint | Cartesian: multiply out. Polar: one stretch, one spin, one wrap. |
| row labels | z · stretch · spin · home step · zⁿ |
| stairs title | Where nθ sits on the staircase |
| stairs text | arg(zⁿ) is the whole set of names for the angle of zⁿ. nθ is one of them. Arg(zⁿ) is the home step, the shaded row. The outlined row is where nθ landed. Why wrap? Any name of the angle reaches the same point, and Arg picks the one in (-π, π]. See `The Staircase` (link to `#staircase`). |
| toggle | Try it in Cartesian / Hide the Cartesian working |
| chain title | Multiplying out, one step at a time |
| chain intro | Each line multiplies the last result by z. It works. It also takes n - 1 lines, and one slip ruins everything after it. Polar did the same job with a stretch, a spin and a wrap. |
| chain, n = 1 | n = 1: there is nothing to multiply. |
| chain line | `z^3 = (2 + 3.464i)(1.732 + i) = 8i` (plain text, `fmtCart`) |
| zero | z is 0, so every power of z is 0. Drag z away from 0. |
| callout after readout (`data-tone="polar"`) | Why polar here? Multiplying adds angles and multiplies lengths, so n copies of one move give nθ and rⁿ. In Cartesian you would multiply out n - 1 times. |

---

## 3. Visual encoding (both themes)

Rule for everything below: no literal colour in station code. Planes and 3D read tokens at draw time from the core helpers;
the station's own canvas drawing calls `cssColor('--token')` (exported by `plane.js`) at draw time, and the one number it
caches (`--ghost-alpha`, default 0.35) is re-read in a `ctx.theme.onThemeChange` callback that also calls
`plane.requestDraw()`. Explainer columns use `tint: true`, so the Cartesian and polar colours are applied by CSS and no baked
hex colour sits in any TeX string (which also means a theme change needs no re-render of the formulas).

### 3.1 The two-address code, as used here

| Thing | Token | How it is drawn | Why |
|---|---|---|---|
| The point z (handle dot on every plane, the floor point of the helix) | `--cart` | 14 px dot with a `--surface` ring (core handle), DOM label `z` | z is a place: one Cartesian address |
| The drop lines of z to the axes | `--cart` | dashed 5/4, 1.5 px, small foot dots (core `drawCartAddress`, `labels: false`) | "one address" |
| Polar grid, rays and circles | `--polar` | core, alpha 0.20 (light) / 0.28 (dark) | the polar address's natural shapes |
| The ray from 0 to z, its label `r = ...` | `--polar` ray 2 px; label `--text` | local drawing (5.2) | the length |
| **Arg z** (the home step) | `--polar` | **solid arc**, 3 px, alpha 1, arrowhead, label `Arg z = 2π/3` | the one name we agreed to use |
| **arg z** (the other names) | `--polar` at `--ghost-alpha` | **faint arcs** `k = +1, -1` (and the picked k), 1.5 px, a small arrowhead, labels `also 8π/3`, `also -4π/3` | the whole set, drawn as windings |
| The picked step | `--polar` | its arc 3 px alpha 1, its row outlined, its bead enlarged | "this name reaches the same dot" |
| The seam | `--seam` (grey) | dashed 8/5, 2 px, label `seam` (core `drawSeam`) | where Arg jumps |
| Walk trail | `--cart` base, time ramp `--t0` to `--t1` | 3 px, no dots, no arrow (`addCurve`), plane's own "start - end" pill | time, same ramp as every mapping station |
| z² ... zⁿ on the left powers plane | `--polar` | 4 px dots with labels `z²`, `z³`, ... | results of the polar move |
| z, z², ..., zⁿ on the spiral plane | z (k = 1) `--cart`, k ≥ 2 `--polar`, k = 0 (the number 1) hollow `--text-muted` | dots 6 / 4.5 / 7 px (zⁿ larger, with a `--surface` ring), spiral line `--polar` 2 px alpha 0.6, rings `--polar` 1 px alpha 0.28 | |
| The product z₁z₂ on the sum plane | `--polar` | 5 px dot, label `z₁z₂` | multiplying is polar-native |

Input versus output colours (`--input`, `--output`) are not used: no function is mapped on these two stations. The
dot you drag is z, a place, so it is `--cart`.

### 3.2 arg is a set, Arg is the one highlighted step, the point is drawn once

| Picture | The point z | The set arg z | The chosen Arg z |
|---|---|---|---|
| Staircase plane | one dot (the handle); the drop lines end on it | faint arcs `k = ±1` with `also ...` labels, plus the picked one | solid arc with the label `Arg z = ...` |
| Stair list (core widget) | not in the list | all 7 rows `Arg z + 2πk` and the set line `arg z = { ... : k is any integer }` | the shaded row, bold, prefix `Arg z =` |
| Helix | one `--cart` sphere on the floor | one bead per step along the dashed fibre, 55 % opacity | the big bead, 100 % opacity, on the 50 % home sheet (ghost sheet 18 %) |
| Sum lists | the product is on the sum plane only | rows of each list | shaded home row; the outlined row of the third list is where `Arg z₁ + Arg z₂` sits |
| Powers, left plane | the handle | not drawn (the set is on the stair list) | core `drawPolarAddress`: solid arc and `Arg z = ...` |
| Powers, spiral plane | the dots are the powers, not extra copies of z | the faint arc for nθ (when it differs from the home step), label `n·θ = 5π/3` | solid arc, label `Arg zⁿ = -π/3` |
| Powers stair list | not in the list | rows of `arg(zⁿ)` | shaded home row; the outlined row is where nθ landed |

The words on the canvas are always `Arg z = ...` for the solid arc and `also ...` for each faint arc. Nothing on screen
shows the set `arg z` as if it were a number (ARCHITECTURE 10.4.6).

### 3.3 Both themes

- **Contrast of text on `--surface`** (from the shell's table): `--polar` 6.06 (light) and 8.30 (dark), `--cart` 6.17 and
  7.12, `--text-muted` 6.86 and 7.80, `--seam` 4.76 and 5.95. All canvas text sits on a 3 px `--surface` halo (core), which is
  what keeps the arc labels readable over the polar grid and the faint arcs.
- **Faint arcs** are decorative at alpha 0.35 (every faint arc has a text label and a list row that carry the same
  information). The solid arc, the ray and the dots are full alpha.
- **The helix** is built by core code with theme-refresh hooks (`themeRefresh`, called on `themechange`); nothing to do in the
  station except not caching colours.
- **Dark theme** keeps the same shapes, the same alphas and the same dash patterns; only the tokens change. The seam
  stays the grey `--seam` (6.55 on `--bg`), the trail ramp runs from `--t0` (`#5c7498`) to `--t1` (`#f3f6fb`) in dark and from
  `#101a30` to `#6d83a6` in light.
- A theme toggle redraws the planes (core), the explainers and the stair lists re-render themselves, the 3D view refreshes
  its materials. The station only re-reads `--ghost-alpha` and asks the planes to redraw.

### 3.4 The three marks of the strip (inline SVG, tokens through `style`)

Three small `<svg aria-hidden="true" viewBox="0 0 44 28">` marks, one per item of "Three things, kept apart". No literal colours.

1. **z:** a circle, `cx 22, cy 14, r 6`, `style="fill: var(--cart); stroke: var(--surface); stroke-width: 2"`.
2. **arg z:** three concentric arcs about `(8, 24)`, radii 6, 10 and 14, each sweeping 50° from the horizontal, `style="fill: none;
   stroke: var(--polar); stroke-width: 1.9; opacity: var(--ghost-alpha)"`.
3. **Arg z:** one arc about `(8, 24)`, radius 10, 50° sweep, `stroke: var(--polar); stroke-width: 2.8`, ending in a small filled triangle
   (`fill: var(--polar)`).

### 3.5 The log-ruler spiral (the picture that carries 1.3.2)

Plane `powers-spiral`: `xRange = yRange = [-1, 1]`, so one plane unit is half the canvas width. Ring k (k = 0..n) has radius
`rho_k = 0.2 + 0.06 k` when `|z| > 1`, `0.92 - 0.06 k` when `|z| < 1`, and `0.56` for every k when `|z|` is within 1e-3 of 1
(flat ruler). The ruler is fixed (it does not rescale when n changes), so scrubbing n makes the spiral grow outward and no
dot jumps. Dot k sits at angle `k·θ` on ring k (true angle). The k-th ring label is the true distance `|z|^k`, printed with
`fmtSmart` (3 decimals, `2.44e-4` when below 5e-4). Labels are drawn for every ring when `n ≤ 6` and for every second ring
(plus the last) when `n > 6`, just below the origin along the negative imaginary axis, `--text-muted`, 11 px. Default state,
n = 10: rings at 0.2, 0.26, ..., 0.8; labels 4, 16, 64, 256, 1024 (rings 2, 4, 6, 8, 10); dot 1 is z at angle 30°, dot 6
is on the seam (`z⁶ = -64`), dots 7 to 10 are past the seam at -150°, -120°, -90°, -60°.

### 3.6 Station CSS (token-only, injected once per station)

The builder writes these rules (names are free, behaviour is not). All colours are `var(--token)`, all spacing `var(--space-n)`,
no fixed widths above the phone's 358 px.

```
/* staircase */
.stair-grid { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .stair-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); align-items: start; } }
.stair-col { display: grid; gap: var(--space-3); min-width: 0; }
.stair-key { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.stair-key li { display: flex; gap: var(--space-2); align-items: flex-start; }
.stair-key svg { flex: none; width: 44px; height: 28px; }
.stair-controls { display: grid; gap: var(--space-2); }
.stair-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.stair-sum-lists { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .stair-sum-lists { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; } }
.stair-op { text-align: center; font: 700 1.6rem/1 var(--font-display); color: var(--text-muted); }
/* powers */
.cart-lines { margin: 0; padding-left: 1.6rem; display: grid; gap: var(--space-1); font-family: var(--font-mono); font-size: .9rem; overflow-wrap: anywhere; }
.cart-line.is-last { font-weight: 700; }
```

The two-plane row of `powers` uses the shell's `.two-planes`. Planes are created with `maxWidth: 520`.

---

## 4. Module API

Both files are native ES modules with relative imports only. Neither touches `document` or `window` at import time (the
unit tests import them in Node). The router only needs `mount`; the other exports exist for the unit tests and for sharing.

### 4.1 `js/stations/powers.js`

Imports (exactly these names; unused ones are a code-review finding):

```js
import { Arg, wrapArg, fromPolar, mul, pow, abs, eq, fmtNum, fmtCart, fmtAngle, texNumber, texAngle } from '../core/complex.js';
import { createPlane, drawPolarAddress, drawCircle, drawSegment, drawDot, drawLabel, drawSeam, cssColor, DASH } from '../core/plane.js';
import { createStaircase, exactPi, fmtDec } from '../core/staircase.js';
import { createExplainer } from '../core/explainer.js';
import { problemsForStation } from '../data/problems.js';
```

```js
export function mount(el, ctx)                  // → unmount(); synchronous; el is the empty <section class="station">

// ---- shared kit (also imported by staircase.js)
export const TAU                                // 2π
export function sup(k)                          // 10 → '¹⁰', 2 → '²', -3 → '⁻³' (Unicode superscript digits and minus); non-integers: String(k)
export function arcPolyline(cx, cy, R, from, to, stepPx = 3)     // → [{ x, y }] canvas pixels (y down); math angles, counterclockwise positive; n = max(2, ceil(|to - from|·R / stepPx)) segments; the sweep may exceed 2π (it is a spiral of constant radius, drawn over itself)
export function snapNice(z, tol, { polar = true, cart = true, rStep = 0.5, aStep = Math.PI / 12, cStep = 0.5 } = {})   // → a fresh {re, im}: the nearest nice point within tol (plane units), else a copy of z
export function pickSpot(candidates, size, obstacles, bounds)    // → the chosen candidate (the first of least cost); candidates [{ x, y, align }], size { w, h }, obstacles { boxes: [{ x0, y0, x1, y1 }], segs: [{ a: {x, y}, b: {x, y} }] }, bounds { w, h }
export function drawAngleArcs(ctx, plane, spec)                  // draws arcs about the origin and one label block; spec in 5.1
export function cleanC(z)                       // zero a part that is below 1e-9 of |z| (float noise): → fresh {re, im}
export function cleanArg(z)                     // Arg(z), but a value within 1e-9 above -π is returned as π
export function tn(x)                           // number → TeX with no fractions: integer, p√2/q, p√3/q, p·π/q forms as texNumber gives them, otherwise a 3-decimal decimal; |x| ≥ 1e6 or 0 < |x| < 1e-3 → '3.941\times 10^{6}'
export function texCartQ(z)                     // Cartesian TeX built from tn (and cleanC): '512 - 512\sqrt{3}\,i', '1.5 - 1.5i', '-2'; non-finite → '\text{undefined}'
export function polarTex(r, theta)              // r e^{iθ} for the GIVEN θ (not reduced): '2\,e^{i\frac{\pi}{6}}', 'e^{-i\frac{\pi}{3}}', '1.5'; r = 0 → '0'; θ = 0 → just r
export function fmtSmart(x)                     // fmtNum(x), but 0 < |x| < 5e-4 → x.toExponential(2) ('2.44e-4')
export function numExact(x)                    // fmtDec(x) plus ' (exact)' when exactPi(x) exists and differs from it: '5.236 (5π/3)', '3.142 (π)', '1.893', '0'

// ---- powers-specific pure functions
export function powerModel(z, n)                // → PowerModel (4.3)
export function cartesianChain(z, n)            // → [{ k, prev, factor, value }] for k = 2..n; each value = mul(prev, z); [] for n < 2
export function chainText(line, z)              // → 'z^3 = (2 + 3.464i)(1.732 + i) = 8i'
export function logRuler(z, n)                  // → Ruler (4.3)
export function angleText(model, mode)          // mode 'ntheta' | 'home' | 'cart' → the #powers-angle string (2.10)
export function wrapNote(model)                 // → the #powers-wrapnote string (2.10)
export function powersReadout(model)            // → 'z^n = 512 - 886.81i; |z|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)'
export function powersCells(model)              // → { base, rn, ntheta, wrapped, result, same }, each { cart: TeX, polar: TeX } (same also has agree); or null when model.defined is false
export function spiralDescription(model)        // → the #powers-spiral-desc string (2.10)
```

### 4.2 `js/stations/staircase.js`

Imports (acceptance A6 inspects the first two lines):

```js
import { Arg, argSet, branchArg, wrapArg, fromPolar, mul, abs, eq, fmtCart, fmtNum, fmtAngle, texAngle } from '../core/complex.js';
import { createStaircase, windowText, argReadout, exactPi, fmtDec } from '../core/staircase.js';
import { createPlane, drawSeam, drawCartAddress, drawSegment, drawLabel, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createView3D, argHelix } from '../core/three-view.js';
import { problemsForStation } from '../data/problems.js';
import { TAU, arcPolyline, drawAngleArcs, snapNice, pickSpot, tn, texCartQ, polarTex, cleanC, cleanArg, numExact } from './powers.js';
```

```js
export function mount(el, ctx)                  // → unmount(); synchronous

export function normSeam(v)                     // → seam in [-π, π): within 1e-6 of a multiple of π/12 → that exact multiple; ≥ π - 1e-9 → -π; < -π or non-finite → -π
export function seamLabel(seam)                 // '180°, the negative real axis' (for -π), '0°, the positive real axis', '90°, the positive imaginary axis', '-90°, the negative imaginary axis', otherwise '75°'
export function stairModel(z, seam = -Math.PI, { kMin = -3, kMax = 3 } = {})   // → StairModel (4.3)
export function createLapTracker()              // → LapTracker (4.3)
export function sumModel(z1, z2)                // → SumModel (4.3)
export function readoutText(model, laps)        // 'z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0'
export function sumReadoutText(sm)              // 'Arg z1 + Arg z2 = 4.712 (3π/2); Arg(z1 z2) = -1.571 (-π/2); differ by 1·2π'
export function windowNote(model, seam)         // the #staircase-window string (2.6)
export function stairCells(model, k)            // → { address, name, same } each { cart, polar } (same also has agree); null when model.defined is false
export function sumCells(sm)                    // → { z1, z2, prod, angle, same } each { cart, polar } (same also has agree); null when sm.defined is false
export function neighbourLinks(stations, threads, stationId)   // → { prev, next, byThread: [{ thread, title, prev, next }] } (5.2 L)
```

### 4.3 Data structures

```js
// PowerModel   (powerModel(z, n); z any {re, im}, n an integer 1..12; a non-integer n is rounded, clamped to 1..12)
{ defined: boolean,         // false when |z| < 1e-9 or z is not finite; then r = 0, rn = 0, zn = znPolar = {0, 0}, theta = ntheta = home = argZn = NaN, turns = 0, agree = null
  z, n,
  r,                        // |z|
  theta,                    // Arg z, in (-π, π]
  rn,                       // r^n  (Math.pow)
  ntheta,                   // n·theta, NOT reduced (a name of arg(z^n))
  home,                     // wrapArg(ntheta): the home step, in (-π, π], π (never -π) on the seam
  turns,                    // round((ntheta - home) / 2π): how many full turns were removed (negative: added)
  zn,                       // pow(z, n): the Cartesian route (n - 1 multiplications by squaring)
  znPolar,                  // fromPolar(rn, home): the polar route, converted back
  agree,                    // eq(zn, znPolar, 1e-9 · max(1, rn))
  argZn }                   // cleanArg(zn): what atan2 says about the multiplied-out answer

// Ruler        (logRuler(z, n))
{ mode: 'out' | 'in' | 'flat',      // |z| > 1 + 1e-3, |z| < 1 - 1e-3, otherwise flat
  rho(t),                           // ring radius in plane units for a real index t: out: 0.2 + 0.06 t, in: 0.92 - 0.06 t, flat: 0.56
  rings: [{ k, r, rho }],           // k = 0..n, r = |z|^k, rho = rho(k)
  dots:  [{ k, rho, angle, p }] }   // angle = k·theta (unwrapped), p = fromPolar(rho, angle) in plane units

// StairModel   (stairModel(z, seam))
{ defined: boolean,                 // false when |z| < 1e-9 or z is not finite
  z, seam, r,
  principal,                        // Arg z in (-π, π]            (NaN when undefined)
  home,                             // branchArg(z, seam): the step in (seam, seam + 2π]
  k0,                               // round((home - principal) / 2π): 0 or 1
  steps: [{ k, theta }],            // k = kMin..kMax, theta = home + 2πk, taken from argSet(z, { kMin: kMin - 1, kMax: kMax + 1 }) at index k + k0
  window }                          // windowText(seam), e.g. '(-π, π]'

// LapTracker   (createLapTracker())
{ begin(theta),                     // start tracking at principal angle theta; counts nothing
  invalidate(),                     // forget the position (z at or near 0); the next update() starts again and counts nothing
  update(theta, seam),              // pointer or keyboard move to principal angle theta; → crossings counted (integer, +1 per counterclockwise seam crossing)
  moveTo(phi, seam),                // set the UNWRAPPED angle directly (Walk, Turn); → crossings counted between the old and the new unwrapped angle
  reset(),                          // laps = 0, phi = null
  get laps(), get phi() }           // phi: the unwrapped angle, or null

// SumModel     (sumModel(z1, z2))
{ defined, z1, z2, r1, r2,
  a, b,                             // Arg z1, Arg z2
  sum,                              // a + b (not reduced)
  product,                          // cleanC(mul(z1, z2))
  c,                                // cleanArg(product): Arg(z1 z2)
  j }                               // round((sum - c) / 2π), in {-1, 0, 1}: how many turns the sum is above the home step

// Station state (private to mount; the test hook exposes a copy)
{ z, seam, picked: null | integer, walking: null | { ... }, trail: [{ re, im, t }], stepCount, reduced, destroyed }
```

### 4.4 Test hooks and DOM contract

`window.__mv` is never replaced (`const mv = (window.__mv = window.__mv || {})`, ARCHITECTURE 10.7.1); hooks are deleted in
`unmount`.

- `mv.staircase = { state() → { z, seam, home, principal, laps, picked, walking }, tracker }`, and the planes register
  themselves in `mv.planes` under `staircase-plane` and `staircase-sumplane`; the 3D view in `mv.views3d` under `staircase-helix`.
- `mv.powers = { state() → { z, n, report, model }, ruler() }`, planes `powers-plane` and `powers-spiral`.
- Station root: the router's `<section class="station" id="station-<id>" data-station="<id>">`; the station adds `data-preset` (`''`,
  `problem-1.3.2`, `topic-T2.4`, `token-1-3-1`, ...).

The ids of every control are in sections 2.3 and 2.8. Element-id patterns the widgets generate (core): plane `staircase-plane-viewport`,
`staircase-plane-canvas`, handle `staircase-plane-z`; stair widgets `<id>-set`, `-arg`, `-window`, `-list`, `-k<k>`, `-note`
(for example `#staircase-stairs-arg`, `#staircase-stairs-k-1`); explainers `<id>-table`, `<id>-<row>-<col>`, `<id>-same`,
`<id>-same-<col>` (for example `#powers-ex-rn-polar`); the 3D view `staircase-helix-canvas`, `-reset`, `-hint`, `-status`.

### 4.5 Events and lifecycle

`mount(el, ctx)` order (listeners last, ARCHITECTURE 10.1.4):

1. Read `ctx.preset` and build the initial state (5.2 A / 5.3 A).
2. Inject the station style once (`style[data-for="station-staircase"]` or `-powers`).
3. Build the static DOM into `el`: header (`h1` = `ctx.station.title`, lede, one thread badge per `ctx.station.threads`
   entry from `ctx.threads`, one `a.chip.problem-chip` per `problemsForStation(ctx.station.id)` with `title` = the aha), the
   notes, the panels, the controls, the link nav.
4. Create the widgets in this order: planes, stair widgets, explainers, then (staircase only) the 3D view.
5. Wire control listeners (`input`, `change`, `click`) on elements inside `el`.
6. Run the first `render()` synchronously (5.2 D, 5.3 D) so nothing is ever shown empty.
7. Last: `const offTheme = ctx.theme.onThemeChange(...)`, the `keydown` listener on `el` (Escape stops a walk), the test hooks.

Events consumed: plane handle `onDrag(z, { final, source })`, `onDragStart`; stair widget `onPick(k)`; DOM `input`/`change`/`click`;
`requestAnimationFrame` (Walk only); theme change. Events produced: none beyond DOM updates. The station never navigates.

`unmount()` does, in this order, each inside its own `try`: set `destroyed = true`; cancel the walk's animation frame; `offTheme()`;
remove the `keydown` listener; `stairs.destroy()` for every stair widget; `explainer.destroy()` for every explainer; `plane.destroy()`
for every plane; `view.dispose()` (staircase); delete `mv.staircase` / `mv.powers`; drop the DOM references. After `destroyed`
every callback returns at once (a late rAF, a late `onDrag` from a dying plane). The injected `<style>` stays (core widgets do the same).

### 4.6 What the station reads from `ctx`

`ctx.station` (title, threads), `ctx.stations` (neighbour links), `ctx.threads` (badge tones and titles), `ctx.preset` (5.2 A),
`ctx.theme.prefersReducedMotion()` (read at the moment of each click, never cached) and `ctx.theme.onThemeChange`. Not used: `ctx.store`
(these stations keep nothing between visits, so no storage can fail), `ctx.navigate` (every link is an `href`).

---

## 5. Algorithms

Conventions. `TAU = 2π`. `clamp(v, lo, hi)`. Pixel space is canvas CSS pixels, y down. A "math angle" is counterclockwise
positive; the pixel position of math angle φ at radius R about pixel origin O is `(O.x + R cos φ, O.y - R sin φ)`. `ZERO = {re: 0, im: 0}`.
`plane.toPixel`, `plane.fromPixel`, `plane.getSize()` and `plane.getView().scale` are the core ones. "Draw" steps run inside a
plane layer (`plane.addLayer(draw, { order })`), where the plane has already saved the context, so no `ctx.save()` pairing
is needed except where a step says so.

### 5.1 The shared kit (`powers.js` exports)

**5.1.1 `arcPolyline(cx, cy, R, from, to, stepPx = 3)`**

1. `n = max(2, ceil(abs(to - from) * R / stepPx))`.
2. For `i = 0..n`: `a = from + (to - from) * i / n`; push `{ x: cx + R cos a, y: cy - R sin a }`.
3. Return the points. (A sweep above 2π simply overwrites itself; `ctx.arc` is never used because it clips a sweep at one full turn.)

**5.1.2 `snapNice(z, tol, opts)`** (a magnet, not a grid)

1. `best = null`, `bestD = Infinity`. Helper `consider(c)`: skip it when `hypot(c.re, c.im) < 1e-9` (never snap onto 0); `d = hypot(c.re - z.re, c.im - z.im)`;
   if `d <= tol && d < bestD` then `best = c`, `bestD = d`.
2. If `opts.polar` and `r = hypot(z.re, z.im) > 1e-9`: `r2 = round(r / rStep) * rStep`; if `r2 >= rStep`: `t2 = round(atan2(z.im, z.re) / aStep) * aStep`; `consider(fromPolar(r2, t2))`.
3. If `opts.cart`: `consider({ re: round(z.re / cStep) * cStep + 0, im: round(z.im / cStep) * cStep + 0 })` (the `+ 0` turns -0 into 0).
4. Return `best` as a fresh object, or `{ re: z.re, im: z.im }`.
5. Callers pass `tol = 4 / plane.getView().scale` (a 4 px reach, whatever the zoom), and the plane applies it to pointer and keyboard moves
   (`addPoint({ snap })`). Why: it lets the student land exactly on `-1 + i√3`, `√3 + i`, `1 + i` or `-1 + i` and read `2π/3`, `π/6`,
   `π/4`, `3π/4` instead of `2.0957`, and it makes the interaction scripts (which drag to a pixel) deterministic.
   Nodes: polar lattice `r` a multiple of 0.5, angle a multiple of 15°; Cartesian lattice, both parts multiples of 0.5. The Walk and the Turn slider
   use `handle.set`, which never snaps.

**5.1.3 `pickSpot(candidates, size, obstacles, bounds)`**

1. For each candidate `c` in order, its box is `x0 = c.align === 'left' ? c.x : c.align === 'right' ? c.x - size.w : c.x - size.w / 2`, `x1 = x0 + size.w`,
   `y0 = c.y - 11`, `y1 = y0 + size.h`.
2. `cost = 100 * (number of obstacle boxes the box overlaps) + 25 * (number of obstacle segments that cross the box) + 100 * (1 if any side of the box is
   outside [2, bounds.w - 2] x [2, bounds.h - 2] else 0)`. A segment crosses a box when the Liang-Barsky clip of the segment to the box is non-empty.
3. Return the first candidate with the least cost (stop early at cost 0), with its box attached (`c.box`). The caller pushes `c.box` into
   `obstacles.boxes` so the next label avoids it.

**5.1.4 `drawAngleArcs(ctx, plane, spec)`**

`spec = { home: { theta, text }, ghosts: [{ theta, text, emphasis }], radiusPx, stepPx = 8, obstacles, ghostAlpha = 0.35, color = '--polar', labels = true }`.

1. `O = plane.toPixel(ZERO)`; return if not finite.
2. For each ghost `g` with index `i` (0-based, in the given order): `R = radiusPx + stepPx * (i + 1)`; stroke `arcPolyline(O.x, O.y, R, 0, g.theta)` with colour
   `cssColor(color)`, width `g.emphasis ? 3 : 1.5`, alpha `g.emphasis ? 1 : ghostAlpha`; if `abs(g.theta) * R >= 14` add a filled arrowhead (7 px long, 5 px wide, tip on the last
   point, direction along the arc: `(-s sin θ, -s cos θ)` in pixel space with `s = sign(θ)`), alpha `min(0.5, alpha * 1.6)` (1 when emphasised).
3. The home arc: `arcPolyline(O.x, O.y, radiusPx, 0, home.theta)`, width 3, alpha 1, same arrowhead rule, full alpha.
4. If `labels`: lines are `[home.text, ...ghosts.slice(0, 3).map(g => g.text)]`. `size = { w: 6.6 * (longest line length) (6.1 when the plane is narrower than 420 px), h: 14 * lines + 2 }`.
   `Rout = radiusPx + stepPx * ghosts.length + 14`, `bis = home.theta / 2`. Candidates: for `dist` in `[Rout, Rout + 20]`, for `dAng` in degrees
   `[0, 35, -35, 70, -70, 110, -110, 150, -150, 180]`: `phi = bis + dAng * π / 180`; `{ x: O.x + dist cos phi, y: O.y - dist sin phi, align: cos phi >= 0 ? 'left' : 'right' }`.
   (Distance-major order: every angle is tried at `Rout` before any is tried farther out.)
5. `pick = pickSpot(candidates, size, obstacles, plane.getSize())`; `obstacles.boxes.push(pick.box)`. For line `i`:
   `drawLabel(ctx, plane, plane.fromPixel(pick.x, pick.y), line, { color: i === 0 ? color : '--text-muted', dx: 0, dy: 14 * i, align: pick.align })`
   (`drawLabel` clamps into the canvas and gives the text its `--surface` halo; the first line, the home label, is in the polar colour, the `also` lines in muted text).

**5.1.5 Number and TeX helpers** (exact behaviour; every string was rendered with KaTeX)

- `cleanC(z)`: `m = hypot(z.re, z.im)`; each part with `abs(part) < 1e-9 * m` becomes `0`. (Removes `1.2e-15 i` from `2 e^{i5π}`.)
- `cleanArg(z)`: `a = Arg(z)`; `a < -π + 1e-9 ? π : a`. (A product that lands on the negative real axis can carry a tiny negative imaginary part, and `Arg` then reads
  `-π`; the home step is `π`.)
- `tn(x)`: non-finite → `texNumber(x)`. If `abs(x) >= 1e6` or `0 < abs(x) < 1e-3`: `e = floor(log10(abs(x)))`, return `` `${fmtNum(x / 10^e, 3)}\times 10^{${e}}` ``.
  Else `t = texNumber(x)`; if `t` starts with `\frac{` or `-\frac{` and contains neither `\sqrt` nor `\pi` return `fmtNum(x, 3)` (fractions become decimals, so the
  explainer and the readout agree, ARCHITECTURE 10.4.5), else `t`. Examples: `tn(1.5) = 1.5`, `tn(1/3) = 0.333`, `tn(√3) = \sqrt{3}`, `tn(512·√3) = 512\sqrt{3}`, `tn(1.5·√2) = \frac{3\sqrt{2}}{2}`, `tn(3.941e6) = 3.941\times 10^{6}`, `tn(2.44e-4) = 2.44\times 10^{-4}`.
- `texCartQ(z)`: not finite → `\text{undefined}`; `z = cleanC(z)`; `R = tn(re)`, `M = tn(im)`; `M = '0'` → `R`; `neg = M[0] === '-'`; `coef = abs part of M, '' when it is '1'`;
  `im = coef + (coef ends with \sqrt{d} or \pi ? '\,i' : 'i')`; `R = '0'` → `(neg ? '-' : '') + im`; else `R + (neg ? ' - ' : ' + ') + im`.
- `polarTex(r, theta)`: `R = tn(r)`, `Th = texAngle(theta)`; `R = '0'` → `'0'`; `Th = '0'` → `R`; `neg = Th[0] === '-'`, `ab = Th without the sign`, `sp = ab starts with a digit ? '\,' : ''`;
  `e = 'e^{' + (neg ? '-' : '') + 'i' + sp + ab + '}'`; return `R === '1' ? e : R + '\,' + e`.
- `fmtSmart(x)`: `x !== 0 && abs(x) < 5e-4 ? x.toExponential(2) : fmtNum(x)`.
- `numExact(x)`: `d = fmtDec(x)`, `e = exactPi(x)`; return `e && e !== d ? d + ' (' + e + ')' : d`. (`fmtDec` and `exactPi` are the core staircase widget's helpers, so the readout and the list agree to the character.)
- `sup(k)`: map each character of `String(k)` through `0123456789-` to `⁰¹²³⁴⁵⁶⁷⁸⁹⁻`.
- Internal helpers used by the cell builders: `par(x)` = `tn(x)` wrapped in `(...)` when it starts with `-` or contains `\times`; `powTex(R, n)` = `R^{n}` with `\left(R\right)^{n}` unless
  `R` is a plain decimal number (so `(\sqrt{2})^8`, `(4\sqrt{2})^{12}` never read as `4(\sqrt{2}^{12})`); `turnsTex(j)` = `` `${j > 0 ? '-' : '+'} ${abs(j) === 1 ? '' : abs(j) + '\cdot '}2\pi` ``;
  `parenNeg(t)` = `\left(t\right)` when `t` starts with `-`; `sumTex(a, b)` = `` `${texAngle(a)} ${b < 0 ? '-' : '+'} ${texAngle(abs(b))}` `` (never `+ -`).

### 5.2 `staircase.js`

**A. Initial state and presets**

1. `S = { z: {re: -1, im: √3}, seam: -π, picked: null, walking: null, trail: [], stepCount: 0, destroyed: false, ghostAlpha: readGhostAlpha() }`, where `readGhostAlpha()` is
   `parseFloat(ctx.theme.cssVar('--ghost-alpha'))` or 0.35 when that is not a number.
2. Read `ctx.preset`:

| `ctx.preset` | State | Extras |
|---|---|---|
| `null` | default | |
| `{ kind: 'problem', id: '1.3.1' }` or `{ kind: 'token', token: '1-3-1' }` | default (z = -1 + i√3) | `data-preset` set |
| `{ kind: 'topic', id: 'T2.4' }` | `z = -2` (on the seam), seam `-π` | `#staircase-topic-note` shown |
| `{ kind: 'topic', id: 'T1.3' }` | default | |
| `{ kind: 'token', token: 'seam' }` | `z = -2`, seam `-π` | no note |
| `{ kind: 'token', token: 'cut' }` | `z = -2`, seam `0` (the cut moved off the negative real axis: `Arg z = π`, continuous there) | `#staircase-cut-note` shown by the normal rule |
| anything else | default | nothing |

3. Before the first `render()`: `S.model = stairModel(S.z, S.seam)` and `tracker.begin(S.model.principal)` (`invalidate()` when z is 0); `tracker.laps` is 0.

**B. The pure pieces** (all exported; the unit tests of section 7.4 pin them)

*`normSeam(v)`*: not finite → `-π`. `q = π/12`, `m = round(v / q) * π / 12` (multiply first, then divide, so that `m` is bit-for-bit `-Math.PI / 2`, `3 * Math.PI / 4`, and so on); `s = abs(v - m) < 1e-6 ? m : v`; `s >= π - 1e-9` → `s - TAU`; `s < -π` → `-π`; return `s + 0`.

*`seamLabel(seam)`*: `deg = round(seam * 180 / π)`; `abs(deg) === 180` → `deg = 180`; names `{ 180: 'negative real axis', 0: 'positive real axis', 90: 'positive imaginary axis', '-90': 'negative imaginary axis' }`;
return `` `${deg}°` + (name ? `, the ${name}` : '') ``.

*`stairModel(z, seam, { kMin, kMax })`*:

1. `r = abs(z)`. If z is not finite or `r < 1e-9`: return `{ defined: false, z, seam, r: 0, principal: NaN, home: NaN, k0: NaN, steps: [], window: windowText(seam) }`.
2. `principal = Arg(z)`; `home = branchArg(z, seam)`; `k0 = round((home - principal) / TAU)`.
3. `all = argSet(z, { kMin: kMin - 1, kMax: kMax + 1 })`; `steps = for k in kMin..kMax: { k, theta: all.find(s => s.k === k + k0).theta }`. (So row k is the same number as the widget's row k: `home + 2πk`.)
4. Return `{ defined: true, z, seam, r, principal, home, k0, steps, window: windowText(seam) }`.

*`createLapTracker()`* (state `phi = null`, `laps = 0`); `idx(φ, seam) = ceil((φ - seam) / TAU) - 1` is the index of the window `(seam + 2π·idx, seam + 2π·(idx + 1)]` that holds φ (a point on the seam belongs to the lower window, matching `branchArg`):

1. `begin(theta)`: `phi = finite(theta) ? theta : null`.
2. `invalidate()`: `phi = null`.
3. `update(theta, seam)`: if `theta` is not finite: `phi = null`, return 0. If `phi === null`: `phi = theta`, return 0. Else `prev = wrapArg(phi)`, `d = wrapArg(theta - prev)` (the short way round, in (-π, π]),
   `next = phi + d`, `c = idx(next, seam) - idx(phi, seam)`, `phi = next`, `laps += c`, return `c`.
4. `moveTo(phi2, seam)`: if `phi === null`: `phi = phi2`, return 0. Else `c = idx(phi2, seam) - idx(phi, seam)`, `phi = phi2`, `laps += c`, return `c`.
5. `reset()`: `laps = 0`, `phi = null`.

*`sumModel(z1, z2)`*: not finite or `abs(z1) < 1e-9` or `abs(z2) < 1e-9` → `{ defined: false, z1, z2, ... NaN }`. Else `a = Arg(z1)`, `b = Arg(z2)`, `sum = a + b`, `product = cleanC(mul(z1, z2))`,
`c = cleanArg(product)`, `j = round((sum - c) / TAU)`, `r1 = abs(z1)`, `r2 = abs(z2)`.

*`readoutText(model, laps)`*: `` `z = ${fmtCart(model.z)}; ${model.defined ? argReadout('arg z', model.home) : 'Arg z = undefined'}; laps = ${laps}` ``.
`argReadout('arg z', x)` is the core helper: `Arg z = 2.094 (2π/3)`, `Arg z = 0`, `Arg z = 3.142 (π)`.

*`sumReadoutText(sm)`* (uses `numExact` from the kit, which is `fmtDec(x)` plus ` (exact)` when `exactPi(x)` exists and differs from it); defined:
`` `Arg z1 + Arg z2 = ${numExact(sm.sum)}; Arg(z1 z2) = ${numExact(sm.c)}; differ by ${sm.j}·2π` ``; undefined: `Arg z1 + Arg z2 = undefined; Arg(z1 z2) = undefined (one of the numbers is 0)`.

*`windowNote(model, seam)`*: not defined → the z = 0 sentence; `seam === -π` → `` `Home window: ${model.window}. This is the usual choice, so the highlighted name is the principal Arg z.` ``;
else `` `Home window: ${model.window}. You moved the cut, so the highlighted name is the home step for this window, not the principal Arg z.` ``.

*`stairCells(model, k)`* (TeX for the two-row explainer; `k` is the picked step, 0 when nothing is picked): not defined → `null`. Else `r = model.r`, `th = model.home`, `thk = th + TAU * k`,
`zk = cleanC(fromPolar(r, thk))`:

| cell | cart | polar |
|---|---|---|
| `address` | `(x,\ y) = \left(${tn(model.z.re)},\ ${tn(model.z.im)}\right)` | `(r,\ \theta) = \left(${tn(r)},\ ${texAngle(th)} + 2\pi k\right)` |
| `name` | `(x,\ y) = \left(${tn(r)}\cos\left(${texAngle(thk)}\right),\ ${tn(r)}\sin\left(${texAngle(thk)}\right)\right) = \left(${tn(zk.re)},\ ${tn(zk.im)}\right)` | `k = ${k}:\ ${polarTex(r, thk)}` |
| `same` | `texCartQ(model.z)` | `texCartQ(zk)`; `agree = eq(model.z, zk, 1e-9 * max(1, r))` |

For the default point and k = 1 this gives `(x,\ y) = \left(2\cos\left(\frac{8\pi}{3}\right),\ 2\sin\left(\frac{8\pi}{3}\right)\right) = \left(-1,\ \sqrt{3}\right)` and `k = 1:\ 2\,e^{i\frac{8\pi}{3}}`, and both footer cells read `-1 + \sqrt{3}\,i`.

*`sumCells(sm)`* (four rows; `a, b, c, j, r1, r2, product` from the model; `s = sm.sum`):

| row | cart | polar |
|---|---|---|
| `z1` | `texCartQ(z1)` | `polarTex(r1, a)` |
| `z2` | `texCartQ(z2)` | `polarTex(r2, b)` |
| `prod` | `(x_1x_2 - y_1y_2) + i(x_1y_2 + x_2y_1) = ${texCartQ(product)}` | `r_1r_2\,e^{i(\theta_1 + \theta_2)} = ${polarTex(r1 * r2, s)}` |
| `angle` | `\operatorname{Arg}(z_1z_2) = \operatorname{atan2}\left(${tn(product.im)},\ ${tn(product.re)}\right) = ${texAngle(c)}` | `\operatorname{Arg} z_1 + \operatorname{Arg} z_2 = ${sumTex(a, b)} = ${texAngle(s)}` followed, when `j !== 0`, by `` ` = ${texAngle(c)} ${j > 0 ? '+' : '-'} ${abs(j) === 1 ? '' : abs(j) + '\cdot '}2\pi` `` |
| `same` | `texCartQ(product)` | `texCartQ(cleanC(fromPolar(r1 * r2, s)))`; `agree = eq(product, fromPolar(r1 * r2, s), 1e-9 * max(1, r1 * r2))` |

For z1 = z2 = -1 + i the `angle` polar cell is `\operatorname{Arg} z_1 + \operatorname{Arg} z_2 = \frac{3\pi}{4} + \frac{3\pi}{4} = \frac{3\pi}{2} = -\frac{\pi}{2} + 2\pi`.

**C. Construction (inside `mount`, after the DOM is built)**

```
planeZ  = createPlane(planeHost, { id: 'staircase-plane', xRange: [-3, 3], yRange: [-3, 3], grid: 'polar', interactive: false,
                                   legend: true, maxWidth: 560, ariaLabel: 'Complex plane with the point z. Drag z around the origin.' })
handleZ = planeZ.addPoint({ id: 'z', z: S.z, color: '--cart', label: 'z', name: 'z', step: 0.1,
                            snap: (p) => snapNice(p, 4 / planeZ.getView().scale),
                            onDragStart: () => stopWalk(false),
                            onDrag: (z, info) => onZ(z, info) })
trail   = planeZ.addCurve({ id: 'trail', points: [], color: '--cart', ramp: true, dots: false, arrow: false, width: 3, order: 5 })
         planeZ.addLayer(drawMain, { order: 10 })
stairs  = createStaircase(stairsHost, { id: 'staircase-stairs', kMin: -3, kMax: 3, seam: S.seam, label: 'arg z', onPick })
ex      = createExplainer(exHost, { id: 'staircase-ex', title: 'One address, many names', columns: COLUMNS, rows: [ADDRESS_ROW, NAME_ROW], same })
```

`COLUMNS = [{ key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true }]`
(used by all three explainers of this goal). A cell function returns `{ text: 'z = 0 has no angle' }` when the model is undefined. `ADDRESS_ROW =
{ id: 'address', label: 'address', cart: s => cell(s, 'address', 'cart'), polar: s => cell(s, 'address', 'polar'), native: null }`; `NAME_ROW` the same with id `name`, label
`chosen name`; `same: s => { const c = stairCells(s.model, s.k); return c ? { cart: c.same.cart, polar: c.same.polar, agree: c.same.agree } : null; }`
with explainer state `{ model, k }`.

**D. The pipeline: `refresh` (track, then render)**

Two small functions so that a seam move or a pick can re-render without touching the lap count.

```
onZ(z, info):                                   // the handle's onDrag
  1. if (S.destroyed) return
  2. S.z = { re: z.re, im: z.im }
  3. if (info.source === 'pointer' || info.source === 'keyboard'):     // a hand on the dot
       if (S.walking) stopWalk(false)
       if (S.trail.length) clearTrail()
  4. S.model = stairModel(S.z, S.seam)
  5. if (!S.model.defined || S.model.r < 0.06) tracker.invalidate()    // 0.06 units is about 4 px: a pass near 0 is not a lap
     else tracker.update(S.model.principal, S.seam)
  6. render()

teleport(z):                                    // presets, Start over, token presets: put z somewhere without counting a lap
  1. handleZ.set(z, { silent: true });  S.z = copy(z);  S.model = stairModel(S.z, S.seam)
  2. S.model.defined ? tracker.begin(S.model.principal) : tracker.invalidate()
  3. clearTrail();  render()

render():                                       // synchronous, a few DOM writes; called on every pointer move
  1. m = S.model
  2. readout.textContent = readoutText(m, tracker.laps);  readout.dataset.arg = m.defined ? String(m.home) : '';  readout.dataset.seam = String(S.seam);  readout.dataset.laps = String(tracker.laps)
  3. windowLine.textContent = windowNote(m, S.seam);  cutNote.hidden = (S.seam === -Math.PI)
  4. seamOutput.textContent = seamLabel(S.seam);  chips: aria-pressed = (chipSeam === S.seam) for the three presets
  5. phi = tracker.phi;  turn.disabled = !m.defined
     if (m.defined && phi !== null) { turn.value = String(clamp(phi, -4π, 4π)); turnOutput.textContent = Math.round(phi * 180 / π) + '°' }
     else turnOutput.textContent = m.defined ? Math.round(m.principal * 180 / π) + '°' : '-'
  6. stairs.update(m.defined ? m.principal : null)             // the widget relabels at the seam and counts its own data-jumps
  7. ex.update({ model: m, k: S.picked === null ? 0 : S.picked })
  8. helix && helix.update(m.defined ? m.z : { re: NaN, im: NaN }, S.seam)      // NaN hides the beads
  9. refreshWalkLabel();  planeZ.requestDraw()
```

Feed the widget `m.principal`, never `m.home` and never an unwrapped angle: the widget anchors its rows at the home step of its own seam (ARCHITECTURE
10.3.6), and the principal `Arg` is a number that cannot sit within rounding of the window's lower edge by accident.

**E. The plane layer `drawMain(ctx, plane)`** (order 10; read `S.model`, never recompute)

1. `m = S.model`; `{ w, h } = plane.getSize()`; `O = plane.toPixel(ZERO)`.
2. `drawSeam(ctx, plane, S.seam, { label: 'seam' })`.
3. If `!m.defined`: `drawLabel(ctx, plane, ZERO, 'z = 0 has no angle', { dx: 12, dy: -14, color: '--text' })` and return.
4. `drawCartAddress(ctx, plane, m.z, { labels: false })` (the dashed drop lines: one Cartesian address).
5. `drawSegment(ctx, plane, ZERO, m.z, { color: '--polar', width: 2 })` (the ray).
6. `Z = plane.toPixel(m.z)`; `rayPx = hypot(Z.x - O.x, Z.y - O.y)`; `R0 = clamp(0.5 * rayPx, 12, 34)`.
7. Ghost steps: `ks = [1, -1]`; if `S.picked !== null && S.picked !== 0 && !ks.includes(S.picked)` push `S.picked`. Ghost `g` for each `k`:
   `{ theta: m.home + TAU * k, text: 'also ' + fmtAngle(theta, { unicode: true }), emphasis: k === S.picked }`. When `S.picked === 0` the home arc is the picked one: draw it with the
   normal width (it is already full strength) and nothing else changes.
8. Obstacles (pixel space): `boxes = [square(Z, 15), square(O, 10)]`, `segs = [{ a: O, b: Z }, { a: O, b: seamEnd }]` with `seamEnd = (O.x + 2 (w + h) cos S.seam, O.y - 2 (w + h) sin S.seam)`.
9. `drawAngleArcs(ctx, plane, { home: { theta: m.home, text: 'Arg z = ' + fmtAngle(m.home, { unicode: true }) }, ghosts, radiusPx: R0, stepPx: 8, obstacles, ghostAlpha: S.ghostAlpha })`.
10. The r label: text `'r = ' + fmtNum(m.r)`, `size = { w: 6.6 * text.length, h: 16 }`. Candidates: for `t` in `[0.5, 0.4, 0.6, 0.3, 0.7]`, for `side` in `[1, -1]`: point `M = O + t (Z - O)`, normal
    `nu = side * (dy, -dx) / rayPx` with `(dx, dy) = Z - O` (a unit normal of the ray in pixel space); candidate
    `{ x: M.x + 14 nu.x, y: M.y + 14 nu.y + 4, align: 'center' }`. `pick = pickSpot(...)`; `drawLabel(ctx, plane, plane.fromPixel(pick.x, pick.y), text, { color: '--text', dx: 0, dy: 0, align: 'center' })`.
    (Arcs are obstacles through `obstacles.boxes`: `drawAngleArcs` has already pushed its label box, and the r label avoids the ray itself through `segs`.)

`fmtAngle(θ, { unicode: true })` gives `2π/3`, `-π/3`, `π`, `0` when an exact form exists and a 3-decimal number otherwise.

**F. Walk and the stepper**

Constants: `WALK_MS = 4000`, `STEP = π / 6`, `MIN_R = 0.2`, `MAX_R = 2.9`.

```
onWalkClick():
  1. if (S.walking) { stopWalk(true); return }
  2. m = S.model; if (!m.defined || m.r < MIN_R) { walkStatus.textContent = 'Move z away from 0 first, then walk.'; return }
  3. if (ctx.theme.prefersReducedMotion()) { stepOnce(m); return }
  4. r = min(m.r, MAX_R);  phi0 = tracker.phi !== null ? tracker.phi : m.principal;  z0 = copy(m.z)
     clearTrail();  S.walking = { t0: performance.now(), z0, r, phi0, raf: 0 };  refreshWalkLabel();  walkStatus.textContent = ''
     S.walking.raf = requestAnimationFrame(tick)

tick(now):
  1. if (S.destroyed || !S.walking) return
  2. u = clamp((now - S.walking.t0) / WALK_MS, 0, 1)            // linear: the angle advances at a constant rate, so the jump is the only thing that is not smooth
  3. phi = S.walking.phi0 + TAU * u
  4. z = (u >= 1) ? S.walking.z0 : fromPolar(S.walking.r, phi)  // the last frame is the start point exactly
  5. handleZ.set(z, { silent: true });  S.z = z;  S.model = stairModel(z, S.seam)
  6. tracker.moveTo(phi, S.seam);  render()
  7. S.trail.push({ re: z.re, im: z.im, t: u });  if (S.trail.length > 400) S.trail.shift();  trail.update(S.trail)
  8. if (u < 1) S.walking.raf = requestAnimationFrame(tick)  else finishWalk()

finishWalk():  S.walking = null;  refreshWalkLabel()
               msg = 'One lap done. Arg z jumped once. laps = ' + tracker.laps + '.';  walkStatus.textContent = msg;  live.textContent = msg
stopWalk(byUser):  if (!S.walking) return;  cancelAnimationFrame(S.walking.raf);  S.walking = null;  refreshWalkLabel();  if (byUser) walkStatus.textContent = 'Stopped. laps = ' + tracker.laps + '.'

stepOnce(m):                                                   // reduced motion: one click, one 30° step
  1. phi = (tracker.phi !== null ? tracker.phi : m.principal) + STEP;  z = fromPolar(min(m.r, MAX_R), phi)
  2. handleZ.set(z, { silent: true });  S.z = z;  S.model = stairModel(z, S.seam);  tracker.moveTo(phi, S.seam);  render()
  3. S.stepCount = (S.stepCount + 1) % 12;  walkStatus.textContent = S.stepCount === 0 ? 'One lap done. laps = ' + tracker.laps + '.' : 'Step ' + S.stepCount + ' of 12.'
  4. if (S.stepCount === 0) live.textContent = walkStatus.textContent
```

`refreshWalkLabel()`: `S.walking ? 'Stop walking' : ctx.theme.prefersReducedMotion() ? 'Step 30° counterclockwise' : 'Walk one lap'`. While a walk runs the timing is wall-clock
based (`performance.now()` deltas), so a slow frame skips ahead instead of stretching the lap, and `moveTo` counts every seam crossing between two frames however far apart.
A hidden tab pauses `requestAnimationFrame`; on return `u` jumps ahead and the lap finishes on the next frame, correctly counted.

**G. The Turn slider**

```
onTurnInput():
  1. if (S.destroyed || !S.model.defined) return
  2. v = Number(turn.value)                                    // radians, a multiple of 5°, unwrapped
  3. z = fromPolar(S.model.r, v);  stopWalk(false);  clearTrail()
  4. handleZ.set(z, { silent: true });  S.z = z;  S.model = stairModel(z, S.seam);  tracker.moveTo(v, S.seam);  render()
```
`render()` writes `turn.value` back from `tracker.phi` (same number, so no event and no loop). A jump of the slider from 0° to 720° counts two crossings
(`idx(4π) - idx(0)`), which a pointer-style `update` would miss because it only sees the principal angle.

**H. Seam controls**

```
setSeam(v):
  1. s = normSeam(v);  if (s === S.seam) { syncSeamControls(); return }
  2. S.seam = s;  stairs.setSeam(s);                           // a window change is not a crossing (the widget resets its own previous home)
  3. S.model = stairModel(S.z, s)                              // the tracker is NOT touched: moving the cut is not turning
  4. syncSeamControls();  render()
syncSeamControls():  if (normSeam(Number(seamInput.value)) !== S.seam) seamInput.value = String(S.seam)    // never fight the thumb the student is holding
onSeamInput():  setSeam(Number(seamInput.value))               // 'input' and 'change' both call it; it is idempotent
chip clicks:  setSeam(-π) | setSeam(0) | setSeam(-π / 2)
```

**I. Pick, presets, Start over**

> Superseded in residue cleanup: a preset chip also stops a running Walk (`teleport()` starts with `stopWalk(false)`), so the readout after a click is the preset's and the lap count is not left half-counted (script step S14).

```
onPick(k):  S.picked = (S.picked === k) ? null : k;  stairs.setPicked(S.picked);  highlightBead(S.picked);  render()      // render re-feeds the widget, which keeps its picked row
presets:    131 → teleport({ re: -1, im: Math.sqrt(3) });  neg → teleport({ re: -2, im: 0 });  1i → teleport({ re: 1, im: 1 })       // exact, not snapped
reset():    stopWalk(false);  S.seam = -π;  stairs.setSeam(-π);  S.picked = null;  stairs.setPicked(null);  highlightBead(null);  tracker.reset();  S.stepCount = 0
            walkStatus.textContent = '';  teleport({ re: -1, im: Math.sqrt(3) })     // teleport begins the tracker and clears the trail
```

**J. The helix**

```
buildHelix():
  1. helixHost.textContent = ''                                // remove "Loading the 3D view..." first (ARCHITECTURE 10.6.2)
  2. try { view = createView3D(helixHost, { label: 'Staircase helix: the point z lifted to every step of arg z', axisLabels: ['Re', 'Im', 'angle'], grid: 'polar', gridSize: 6 });
           helix = argHelix({ z: S.z, turns: 2, rMax: 3, seam: S.seam });  view.add(helix.group);  view.fitTo(helix.group, { padding: 1.0 })
           if (view.unavailable) showFallback() }
     catch (e) { console.warn('staircase: the 3D view could not start', e); view = null; helix = null; showFallback() }
  3. showFallback(): helixFallback.hidden = false
highlightBead(k):  if (!helix) return
  beads = helix.group.userData.beads                           // beads[kk + 2] is step kk, kk = -2..2
  for kk in -2..2: beads[kk + 2].scale.setScalar(kk === k ? 2.3 : kk === 0 ? 1.7 : 1)
  view.requestRender()                                         // direct scale edits are not covered by the auto-redraw of core mutators
```
Everything else about the helix is automatic: `helix.update(z, seam)` (called in `render`) moves the floor point, the fibre, all beads, the home sheet and the seam strip and
requests a render. After `fitTo` the station does nothing more (ARCHITECTURE 10.6.3): the picture is framed above the hint and stays there when the hint hides.
With `turns: 2` the beads for `k = -2..2` are drawn; the list has seven rows.

**K. The sum panel**

```
planeS = createPlane(sumHost, { id: 'staircase-sumplane', xRange: [-3, 3], yRange: [-3, 3], grid: 'polar', interactive: false, legend: false, maxWidth: 480,
                                ariaLabel: 'Complex plane with the points z1 and z2 and their product' })
h1 = planeS.addPoint({ id: 'z1', z: { re: -1, im: 1 }, color: '--cart', label: 'z₁', name: 'z1', step: 0.1, snap: (p) => snapNice(p, 4 / planeS.getView().scale, { polar: false }), onDrag: (z) => { Z1 = copy(z); sumRefresh() } })
h2 = planeS.addPoint({ id: 'z2', z: { re: 0, im: 1.5 }, ... label: 'z₂', name: 'z2' ... onDrag: (z) => { Z2 = copy(z); sumRefresh() } })
s1  = createStaircase(s1Host,  { id: 'staircase-s1',  kMin: -1, kMax: 1, label: 'arg z₁' })
s2  = createStaircase(s2Host,  { id: 'staircase-s2',  kMin: -1, kMax: 1, label: 'arg z₂' })
s12 = createStaircase(s12Host, { id: 'staircase-s12', kMin: -1, kMax: 1, label: 'arg(z₁z₂)' })
sumEx = createExplainer(sumExHost, { id: 'staircase-sum-ex', title: 'Multiplying two points', columns: COLUMNS, rows: [Z1_ROW, Z2_ROW, PROD_ROW (native 'polar'), ANGLE_ROW (native 'polar')], same })
planeS.addLayer(drawSum, { order: 10 })

sumRefresh():
  1. S2.model = sm = sumModel(Z1, Z2)
  2. sumReadout.textContent = sumReadoutText(sm)
  3. s1.update(abs(Z1) < 1e-9 ? null : Arg(Z1));  s2.update(abs(Z2) < 1e-9 ? null : Arg(Z2));  s12.update(sm.defined ? sm.c : null)
  4. s1.setPicked(sm.defined ? 0 : null);  s2.setPicked(sm.defined ? 0 : null);  s12.setPicked(sm.defined && abs(sm.j) <= 1 ? sm.j : null)
  5. sumEx.update(sm);  planeS.requestDraw()
```
The first call of `sumRefresh()` happens at mount. In the default state `z₁ = -1 + i`, `z₂ = 1.5 i`: `a = 3π/4`, `b = π/2`, `sum = 5π/4`, `c = -3π/4`, `j = 1`, so
row `k = 1` of the third list reads `-3π/4 + 2π = 5π/4`, outlined.

`drawSum(ctx, plane)`:

1. `sm = S2.model`; if `!sm.defined`: `drawLabel(ctx, plane, ZERO, 'a point is 0', { dx: 12, dy: -14 })`; return.
2. `O = plane.toPixel(ZERO)`. The three rays: `drawSegment(ctx, plane, ZERO, z1, { color: '--polar', width: 1.5 })`, the same for `z2`, and `drawSegment(ctx, plane, ZERO, product, { color: '--polar', width: 2.5 })`.
3. Stacked angle arcs about `O` at radius 22 px: arc A from 0 to `a` (width 2, alpha 0.9), then arc B from `a` to `a + b` (width 2, alpha 0.6), both `arcPolyline` strokes in `cssColor('--polar')`. (The picture of "the spin of z₁, then the spin of z₂".)
4. The product: if `max(abs(product.re), abs(product.im)) <= 2.9` draw it with `drawDot(ctx, plane, product, { color: '--polar', radius: 5, label: 'z₁z₂' })`; else compute the point on its ray at the box edge,
   `pe = product * (2.9 / max(abs(product.re), abs(product.im)))`, and `drawLabel(ctx, plane, pe, 'z₁z₂ is off the plane (|z₁z₂| = ' + fmtNum(abs(product)) + ')', { dx: -6, dy: 14, align: 'right' })`.
5. `drawAngleArcs(ctx, plane, { home: { theta: sm.c, text: 'Arg(z₁z₂) = ' + fmtAngle(sm.c, { unicode: true }) }, ghosts: sm.j === 0 ? [] : [{ theta: sm.sum, text: 'a + b = ' + fmtAngle(sm.sum, { unicode: true }), emphasis: false }], radiusPx: 40, stepPx: 8,
   obstacles: { boxes: [square(z1px, 15), square(z2px, 15), square(O, 10)], segs: the three rays }, ghostAlpha: S.ghostAlpha })`.

**L. Preset tokens, neighbours, links**

`neighbourLinks(stations, threads, id)`: `list = stations sorted by order`; `i = list.findIndex(s => s.id === id)`; `prev = list[i - 1] || null`, `next = list[i + 1] || null`; for each thread id `t` of
`list[i].threads`: `members = list.filter(s => s.threads.includes(t))`, `ix = members.findIndex(s => s.id === id)`, `{ thread: t, title: threads.find(x => x.id === t).title, prev: members[ix - 1] || null, next: members[ix + 1] || null }`.
For `staircase`: `prev = distance`, `next = powers`; thread T2: `prev = addresses`, `next = powers`. For `powers`: `prev = staircase`, `next = roots`; T1: `prev = distance`, `next = roots`; T2: `prev = staircase`, `next = roots`.
Markup: `<nav class="station-links" aria-label="Neighbouring places">` with `a.station-link[data-dir="prev"|"next"][href="#<id>"]` for the order neighbours (text is the title) and
`a.station-link[data-thread="T2"][data-dir=...]` for each thread neighbour with the text `Earlier on the <word> thread: <title>` / `Later on the <word> thread: <title>`, where `<word>` comes from the fixed map
`THREAD_WORD = { T1: 'addresses', T2: 'staircase', T3: 'motion' }` and `<title>` is the neighbour's registry title.
Powers adds one link in its body, not in the nav: `The Staircase` (`href="#staircase"`) in the stairs text. The staircase text links to `#branches` in the cut note and the topic note.

### 5.3 `powers.js`

**A. Initial state and presets**

1. `P = { z: {re: √3, im: 1}, n: 10, report: 'ntheta', chainOpen: false, powers: [], destroyed: false, ghostAlpha: readGhostAlpha() }`.
2. `ctx.preset`: `null`, `{ kind: 'problem', id: '1.3.2' }`, `{ kind: 'topic', id: 'T1.3' | 'T1.4' }` and `{ kind: 'token', token: '1-3-2' }` all give the default (z = √3 + i exactly, n = 10).
   `{ kind: 'token', token: '1i' }` gives z = 1 + i, n = 8; `{ kind: 'token', token: 'i' }` gives z = i, n = 4; anything else gives the default.
3. Preset chips call `setZN(z, n)`: `handle.set(z, { silent: true })`; `P.z = copy(z)`; `P.n = n`; `nInput.value = String(n)`; `render()`. The slider calls `P.n = Number(nInput.value); render()`.

**B. `powerModel(z, n)`**

1. `n = clamp(round(n), 1, 12)` (a non-number becomes 10).
2. If `z` is not finite or `abs(z) < 1e-9`: return the undefined model of 4.3 (`defined: false`).
3. `r = abs(z)`; `theta = Arg(z)`; `rn = Math.pow(r, n)`; `ntheta = n * theta`; `home = wrapArg(ntheta)`; `turns = Math.round((ntheta - home) / TAU)`.
   (`wrapArg` snaps a result within 1e-12 of `-π` to `π`, so `z⁶ = -64` reads `π`, never `-π`; checked: `6 · Arg(√3 + i)` is `π + 4e-16` in floating point and `wrapArg` returns exactly `π`.)
4. `zn = pow(z, n)` (the multiplied-out route); `znPolar = fromPolar(rn, home)`; `agree = eq(zn, znPolar, 1e-9 * Math.max(1, rn))`; `argZn = cleanArg(zn)`.

**C. `logRuler(z, n)`**

1. `n` as above; `r = abs(z)`; `theta = Arg(z)`. If `r` is not finite or `< 1e-9`: return `{ mode: 'flat', rho: () => 0.56, rings: [], dots: [] }`.
2. `lr = Math.log(r)`; `mode = lr > 1e-3 ? 'out' : lr < -1e-3 ? 'in' : 'flat'`.
3. `rho(t) = mode === 'out' ? 0.2 + 0.06 t : mode === 'in' ? 0.92 - 0.06 t : 0.56`.
4. `rings = [0..n].map(k => ({ k, r: Math.pow(r, k), rho: rho(k) }))`; `dots = [0..n].map(k => ({ k, rho: rho(k), angle: k * theta, p: fromPolar(rho(k), k * theta) }))`.
   For the default state: `rho(1) = 0.26`, `rho(10) = 0.8`; ring 10 has `r = 1024`; dot 10 has `angle = 10·π/6 = 5π/3` (unwrapped), which is the point at -60°.

**D. `render()`** (synchronous; called on every drag, slider move, chip)

```
  1. m = P.model = powerModel(P.z, P.n);  R = P.ruler = logRuler(P.z, P.n)
  2. P.powers = m.defined ? [2..m.n].map(k => ({ k, z: pow(P.z, k) })) : []
  3. readout.textContent = powersReadout(m);  readout.dataset.n = String(m.n);  readout.dataset.turns = String(m.turns)
  4. nOutput.textContent = 'n = ' + m.n;  if (Number(nInput.value) !== m.n) nInput.value = String(m.n)
  5. angle.textContent = angleText(m, P.report);  wrapNote.textContent = wrapNote(m);  chips: aria-pressed = (chip mode === P.report)
  6. ex.update(m)                                                      // the explainer state is the model itself
  7. stairs.update(m.defined ? m.home : null);  stairs.setPicked(pickedRow(m, P.report))
  8. spiralDesc.textContent = spiralDescription(m);  flatNote.hidden = !(m.defined && R.mode === 'flat')
  9. if (P.chainOpen) buildChain(m)
 10. planeL.requestDraw();  planeS.requestDraw()
```

`pickedRow(m, report)`: `'ntheta'` → `m.defined && abs(m.turns) <= 2 ? m.turns : null`; `'home'` → `m.defined ? 0 : null`; `'cart'` → `null`. (The list has rows `k = -2..2`; the row `k = turns` is the number `home + 2π·turns`,
which is exactly nθ, so the outlined row reads `-π/3 + 2π = 5π/3` in the default state.)

**E. The strings** (`angleText`, `wrapNote`, `spiralDescription`, `powersReadout`)

- `powersReadout(m)`: defined: `` `z^n = ${fmtCart(m.zn)}; |z|^n = ${fmtSmart(m.rn)}; n*theta = ${numExact(m.ntheta)}; home step = ${numExact(m.home)}` ``; undefined: `z^n = 0; |z|^n = 0; n*theta = undefined; home step = undefined`.
- `angleText(m, mode)` (ASCII; `fmtAngle(x)` with its default `unicode: false` prints `5pi/3`, `-pi/3`, `pi`, `0`, else a decimal). Helper `angleRad(x)`: `a = fmtAngle(x)`, `d = fmtNum(x)`; return `a === d ? d + ' rad' : a + ' (' + d + ' rad)'`
  (so `5pi/3 (5.236 rad)` but `20.949 rad`). Undefined: `angle undefined: z is 0`. `'ntheta'`: `turns === 0` →
  `` `n*theta = ${angleRad(ntheta)}: already the home step, Arg(z^n)` ``, else `` `n*theta = ${angleRad(ntheta)}: one name of arg(z^n), not the home step` ``.
  `'home'`: `` `home step = ${angleRad(home)}: Arg(z^n), ${t}` `` with `t = turns === 0 ? 'no turns removed' : abs(turns) + ' full turn' + (abs(turns) === 1 ? '' : 's') + (turns > 0 ? ' removed' : ' added')`.
  `'cart'`: `` `as a point: (x, y) = (${fmtSmart(zn.re)}, ${fmtSmart(zn.im)}); its angle is atan2(y, x) = ${fmtAngle(argZn)}` `` (with `zn = cleanC(m.zn)`).
- `wrapNote(m)`: undefined: empty. `turns === 0`: `nθ is already in (-π, π], so there is nothing to wrap.` Else, with `j = abs(turns)`, `s = j === 1 ? '' : 's'`, `ex(x) = exactPi(x) || fmtDec(x)`:
  `` `The spiral crosses the seam ${j} time${s}, so nθ = ${ex(ntheta)} is ${j} full turn${s} ${turns > 0 ? 'above' : 'below'} the home step ${ex(home)}. Same direction, different name.` ``
- `spiralDescription(m)` (`flat = abs(Math.log(m.r)) <= 1e-3`, the same rule as `logRuler`): undefined: `z is 0, so every power is 0.` `n = 1`: `` `1 dot: z itself, at distance ${fmtSmart(r)} in direction ${fmtNum(theta * 180 / π, 1)}°.` ``. Else
  `` `${n} dots. Each is the one before it turned by ${fmtNum(theta * 180 / π, 1)}° and ${flat ? 'not stretched' : 'stretched by ' + fmtSmart(r)}. z${sup(n)} is at distance ${fmtSmart(rn)} in direction ${fmtNum(home * 180 / π, 1)}°.` ``
  (default: `10 dots. Each is the one before it turned by 30° and stretched by 2. z¹⁰ is at distance 1024 in direction -60°.`).

**F. The left plane layer `drawLeft(ctx, plane)`** (order 10)

1. `drawCircle(ctx, plane, ZERO, 1, { color: '--polar', dash: DASH.guide, width: 1.5, alpha: 0.5 })` (the unit circle, dashed).
2. If `!m.defined`: `drawLabel(ctx, plane, ZERO, 'z = 0 has no angle', { dx: 12, dy: -14 })`; return.
3. `drawDot(ctx, plane, { re: 1, im: 0 }, { color: '--text', radius: 3, label: '1' })` (where the move starts).
4. `drawPolarAddress(ctx, plane, m.z, { ghosts: 0 })`: the ray with `r = ...`, the solid arc and the label `Arg z = ...` (core, with its own label placement).
5. For each `{ k, z }` in `P.powers`: if `abs(z.re) <= 4.2 && abs(z.im) <= 4.2`: `drawDot(ctx, plane, z, { color: '--polar', radius: 4, label: 'z' + sup(k) })`. (Powers outside the view are simply not drawn; the right plane has them.)

**G. The spiral layer `drawSpiral(ctx, plane)`** (order 10)

1. `m = P.model`, `R = P.ruler`, `O = plane.toPixel(ZERO)`, `half = plane.getSize().w / 2` (one plane unit in pixels). If `!m.defined`: `drawLabel(ctx, plane, ZERO, 'z = 0: every power is 0', { dx: 12, dy: -14 })`; return.
2. Rings: if `R.mode === 'flat'`: one ring, `drawCircle(ctx, plane, ZERO, R.rho(0), { color: '--polar', width: 1, alpha: 0.28 })`, labelled `|z| = 1` at `(0, -rho)`. Else for every ring: the same circle; and for every ring with
   `k >= 1 && (m.n <= 6 || k % 2 === 0 || k === m.n)` a label `drawLabel(ctx, plane, { re: 0, im: -ring.rho }, fmtSmart(ring.r), { color: '--text-muted', dx: 4, dy: 12 })`. (Default: labels 4, 16, 64, 256, 1024.)
3. `drawSeam(ctx, plane, Math.PI, { label: 'seam' })`.
4. The continuous spiral: for `t = 0, 0.05, ..., m.n`: pixel of `fromPolar(R.rho(t), t * m.theta)`; stroke the polyline in `cssColor('--polar')`, width 2, alpha 0.6, round joins. (This is the same move done continuously; the dots are its integer times.)
5. The direction of the last power: `drawSegment(ctx, plane, ZERO, R.dots[m.n].p, { color: '--polar', dash: DASH.guide, width: 1 })`.
6. Dots, for `dot` in `R.dots` (`k = 0..n`): `k = 0`: a hollow circle (stroke `--text-muted`, radius 4) with the label `1`; `k = 1` and not the last: `drawDot(ctx, plane, dot.p, { color: '--cart', radius: 6, label: 'z' })`; `1 < k < n`:
   `drawDot(..., { color: '--polar', radius: 4.5, label: String(k) })`; `k = n` with `n >= 2`: `drawDot(..., { color: '--polar', radius: 7, label: 'z' + sup(n) })`; `n = 1`: the `k = 1` rule. Each dot's pixel box `square(plane.toPixel(dot.p), 9)` goes into `obstacles.boxes`.
7. Arcs: `drawAngleArcs(ctx, plane, { home: { theta: m.home, text: 'Arg z' + sup(m.n) + ' = ' + fmtAngle(m.home, { unicode: true }) },
   ghosts: m.turns === 0 ? [] : [{ theta: m.ntheta, text: 'n·θ = ' + fmtAngle(m.ntheta, { unicode: true }), emphasis: P.report === 'ntheta' }],
   radiusPx: Math.max(14, 0.09 * half), stepPx: 7, obstacles: { boxes: dotBoxes, segs: [{ a: O, b: plane.toPixel(R.dots[m.n].p) }] }, ghostAlpha: P.ghostAlpha })`.
   Default state: a solid 60° arc going clockwise to `-π/3` labelled `Arg z¹⁰ = -π/3`, and a faint 300° arc going counterclockwise to `5π/3` labelled `n·θ = 5π/3`, both ending on the same ray: one direction, two names.

> Superseded in residue cleanup: the nθ ghost is never emphasised in the code (`emphasis: false`): the Arg arc is the solid 3 px arc and the nθ ghost a dashed 2 px ring labelled `nθ = 5π/3`, as acceptance A5 says (inconsistency (b) resolved in favour of A5). The staircase plane keeps solid faint ghosts.

**H. The Cartesian chain**

```
cartesianChain(z, n):  prev = z;  out = [];  for k = 2..n: value = mul(prev, z);  out.push({ k, prev, factor: z, value });  prev = value;  return out
chainText(line, z):    'z^' + line.k + ' = (' + fmtCart(line.prev) + ')(' + fmtCart(line.factor) + ') = ' + fmtCart(line.value)
toggle click:          P.chainOpen = !P.chainOpen;  panel.hidden = !P.chainOpen;  toggle.setAttribute('aria-expanded', String(P.chainOpen));
                       toggle.textContent = P.chainOpen ? 'Hide the Cartesian working' : 'Try it in Cartesian';  if (P.chainOpen) buildChain(P.model)
buildChain(m):         lines = cartesianChain(P.z, P.n);  list.replaceChildren(...lines.map((l, i) => li.cart-line[data-k=l.k] with textContent chainText(l, P.z), class is-last on the final one));
                       emptyNote.hidden = lines.length > 0                // 'n = 1: there is nothing to multiply.'
```
The default state produces nine lines (k = 2..10); the first is `z^2 = (1.732 + i)(1.732 + i) = 2 + 3.464i` and the last `z^10 = (-512i)(1.732 + i) = 512 - 886.81i`.

**I. The explainer `powers-ex`**

```
ex = createExplainer(exHost, { id: 'powers-ex', title: 'The same answer, two ways', columns: COLUMNS, rows: [
  { id: 'base',    label: 'z',         cart: s => pc(s, 'base', 'cart'),    polar: s => pc(s, 'base', 'polar'),    native: null },
  { id: 'rn',      label: 'stretch',   cart: ..., polar: ..., native: 'polar' },
  { id: 'ntheta',  label: 'spin',      ..., native: 'polar' },
  { id: 'wrapped', label: 'home step', ..., native: 'polar' },
  { id: 'result',  label: 'zⁿ',        ..., native: 'polar' } ],
  same: s => s.defined ? { cart: texCartQ(s.zn), polar: polarTex(s.rn, s.home), agree: s.agree } : null })
pc(s, row, col) = s.defined ? powersCells(s)[row][col] : { text: 'z = 0 has no angle' }
```

`powersCells(m)`, with `zn = cleanC(m.zn)`, `znp = cleanC(m.znPolar)`, `r, theta, rn, ntheta, home, turns, n, argZn` from the model:

| row | cart (the Cartesian route, read off the multiplied-out answer) | polar (the polar route) |
|---|---|---|
| `base` | `texCartQ(z)` | `polarTex(r, theta)` |
| `rn` | `\sqrt{${par(zn.re)}^{2} + ${par(zn.im)}^{2}} = ${tn(abs(zn))}` | `r^{n} = ${powTex(tn(r), n)} = ${tn(rn)}` |
| `ntheta` | `\operatorname{atan2}\left(${tn(zn.im)},\ ${tn(zn.re)}\right) = ${texAngle(argZn)}` | `n\theta = ${n}\cdot ${parenNeg(texAngle(theta))} = ${texAngle(ntheta)}` |
| `wrapped` | `\text{atan2 gives it directly: } ${texAngle(argZn)}` | `turns === 0` ? `\text{already in } (-\pi, \pi]` : `${texAngle(ntheta)} ${turnsTex(turns)} = ${texAngle(home)}` |
| `result` | `texCartQ(zn)` | `${tn(rn)}\left(\cos\left(${texAngle(home)}\right) + i\sin\left(${texAngle(home)}\right)\right) = ${texCartQ(znp)}` |
| footer `same` | `texCartQ(zn)` | `polarTex(rn, home)` (and `agree = m.agree`) |

Default state, as rendered: `base`: `\sqrt{3} + i` and `2\,e^{i\frac{\pi}{6}}`; `rn`: `\sqrt{512^{2} + (-886.81)^{2}} = 1024` and `r^{n} = 2^{10} = 1024`; `ntheta`: `\operatorname{atan2}\left(-886.81,\ 512\right) = -\frac{\pi}{3}` and
`n\theta = 10\cdot \frac{\pi}{6} = \frac{5\pi}{3}`; `wrapped`: `\text{atan2 gives it directly: } -\frac{\pi}{3}` and `\frac{5\pi}{3} - 2\pi = -\frac{\pi}{3}`; `result`: `512 - 512\sqrt{3}\,i` and
`1024\left(\cos\left(-\frac{\pi}{3}\right) + i\sin\left(-\frac{\pi}{3}\right)\right) = 512 - 512\sqrt{3}\,i`; footer: `512 - 512\sqrt{3}\,i` and `1024\,e^{-i\frac{\pi}{3}}`, verdict `agree`.
The four rows with a `native: 'polar'` get the badge "easy in Polar" and a tinted polar cell: that is the on-screen "say which address makes it easy".

**J. Registration, in `mount`**

```
planeL = createPlane(leftHost, { id: 'powers-plane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'polar', interactive: false, legend: false, maxWidth: 520, ariaLabel: 'Complex plane with the point z. Drag z.' })
handle = planeL.addPoint({ id: 'z', z: P.z, color: '--cart', label: 'z', name: 'z', step: 0.1, snap: (p) => snapNice(p, 4 / planeL.getView().scale), onDrag: (z) => { if (P.destroyed) return; P.z = { re: z.re, im: z.im }; render() } })
planeL.addLayer(drawLeft, { order: 10 })
planeS = createPlane(spiralHost, { id: 'powers-spiral', xRange: [-1, 1], yRange: [-1, 1], grid: 'none', axes: true, tickLabels: false, interactive: false, legend: false, maxWidth: 520, ariaLabel: 'Powers of z on a log ruler' })
planeS.el.setAttribute('aria-describedby', 'powers-spiral-desc');  planeS.addLayer(drawSpiral, { order: 10 })
stairs = createStaircase(stairsHost, { id: 'powers-stairs', kMin: -2, kMax: 2, label: 'arg(zⁿ)' })       // home label becomes 'Arg(zⁿ)'
```

### 5.4 Resolution, timing, and what is not custom

- **Canvas resolution** is the core plane's: backing store `min(devicePixelRatio, 3)`, capped at 16 Mpx, resized by its `ResizeObserver`; every drawing step reads `plane.getSize()` and `plane.toPixel` fresh, so a resize or a phone rotation
  needs nothing from the station. `half` in the spiral layer is re-read on each draw.
- **Redraw** is always `plane.requestDraw()` (one coalesced `requestAnimationFrame` redraw per frame, however many pointer events arrive). The station draws nothing outside a layer.
- **One animation loop** exists in the whole goal: the Walk (at most 4 s, wall-clock timed, cancelled by Stop, Escape, a drag, Start over and `unmount`). Under reduced motion it never starts.
- **Per-event cost** (drag): `stairModel` (one `argSet`), a dozen text writes, `stairs.update` (7 rows), `helix.update` (9 object updates), `ex.update` (coalesced by the core explainer: first render at once, later ones at most one per frame and 100 ms apart on a slow machine) and one plane redraw
  (about 40 stroked polylines of at most 300 points). Nothing allocates per pixel and nothing reads layout inside a handler.
- **Powers**: `render()` does 11 `pow` calls and 5 explainer rows (inside the 6-row budget of ARCHITECTURE 10.3.4); the spiral polyline is `12 / 0.05 = 240` points.

---

## 6. Mathematics

All values below were recomputed with `js/core/complex.js` and `js/core/staircase.js` (`Arg`, `branchArg`, `wrapArg`, `pow`, `mul`, `fmtCart`,
`homeStep`, `stepText`, `argReadout`) and agree with the hand calculation shown. They are the expectations of the unit tests in 7.4.

### 6.1 Formulas used

1. **Two addresses.** `z = x + iy = r e^{iθ}` with `x = r cos θ`, `y = r sin θ`, `r = √(x² + y²) = |z|`, `θ = atan2(y, x)`, and Euler `e^{iθ} = cos θ + i sin θ`.
2. **The set, the number, the window.** `arg z = { θ : z = r(cos θ + i sin θ) } = { Arg z + 2πk : k ∈ ℤ }` (Def 1.4.4); `Arg z` is the one element in `(-π, π]` (Def 1.4.6).
   For a window `(σ, σ + 2π]` the **home step** is `Arg z + 2π·k0` where `k0` is the unique integer with `σ < Arg z + 2π k0 ≤ σ + 2π` (`branchArg(z, σ)`); `σ = -π` is the principal choice.
   The point z is not part of any of these: it is one element of the plane.
3. **The jump is forced.** If `θ(t)` were a continuous choice of an angle of `z(t)` along a loop that goes once around 0 counterclockwise, then `θ(1) - θ(0) = 2π`, yet `θ(1) = θ(0)` for a
   single-valued choice at one point: a contradiction. So a one-number-per-point choice must jump by `2π` somewhere on every loop around 0. The place is the seam, and moving it changes where, not whether.
4. **Counting crossings.** The window index of an unwrapped angle `φ` for seam `σ` is `idx(φ, σ) = ⌈(φ - σ)/2π⌉ - 1` (a point exactly on the seam belongs to the lower window, like `branchArg`);
   moving from `φ` to `φ'` crosses the seam `idx(φ', σ) - idx(φ, σ)` times, counterclockwise positive. `laps` is the running total.
5. **Powers (de Moivre).** `(r e^{iθ})ⁿ = rⁿ e^{inθ}`. Since `e^{i(nθ + 2πm)} = e^{inθ}`, any name of the angle gives the same point, so `arg(zⁿ) = { nθ + 2πk }`. The home step is
   `Arg(zⁿ) = nθ - 2π j` with `j = ⌈(nθ - π)/2π⌉`; the code computes `home = wrapArg(nθ)` and `turns = round((nθ - home)/2π) = j`. Checks: `nθ = 5π/3` gives `j = ⌈1/3⌉ = 1`; `nθ = π` gives `j = 0`
   (so `Arg = π`, never `-π`); `nθ = 2π` gives `j = ⌈1/2⌉ = 1`; `nθ = 3π` gives `j = 1` and `Arg = π`.
6. **Products (Thm 1.4.14, as sets).** `|z₁z₂| = r₁r₂`; `{a + 2πk} + {b + 2πm} = {a + b + 2π(k + m)}`, so `arg(z₁z₂) = arg z₁ + arg z₂` as sets. With `a = Arg z₁`, `b = Arg z₂`:
   `Arg(z₁z₂) = a + b - 2π j`, `j = ⌈(a + b - π)/2π⌉ ∈ {-1, 0, 1}` because `a + b ∈ (-2π, 2π]`.
7. **Log ruler.** Ring `k` is at plane radius `ρ_k = 0.2 + 0.06 k` for `|z| > 1` (so `ρ_0 = 0.2`, `ρ_10 = 0.8`, `ρ_12 = 0.92`), `0.92 - 0.06 k` for `|z| < 1`, `0.56` when `||z| - 1|` is within about 0.1 %. Its label is `|z|^k`.
   Dot `k` is at `ρ_k e^{i k θ}`: true angle, ruler distance. The ruler is a display choice; no number shown on screen depends on it.
8. **Magnet.** `snapNice` moves a dragged point to the nearest of: `r e^{iθ}` with `r` a multiple of `0.5` and `θ` a multiple of `π/12`, or `(x, y)` with both multiples of `0.5`, if within 4 px; never to 0.

### 6.2 Problem 1.3.1 (the staircase default): `z = -1 + i√3`, polar form, exponential form, `Arg z`

**Cartesian route (slide to polar).** `x = -1`, `y = √3`. `r = √((-1)² + (√3)²) = √(1 + 3) = 2`. `cos θ = x/r = -1/2` and `sin θ = y/r = √3/2`. The angle in `(-π, π]` with that cosine and sine is `θ = 2π/3`
(`cos 2π/3 = -1/2`, `sin 2π/3 = √3/2`), about `2.0944`. So `z = 2(cos 2π/3 + i sin 2π/3) = 2 e^{i2π/3}` and `Arg z = 2π/3`.

**Polar route (read it off the dot).** The dot is in the second quadrant. Its angle from the negative real axis is `arctan(√3/1) = π/3` (60°). So `θ = π - π/3 = 2π/3`, and `r = 2` is the length of the ray.
Same answer; here the geometry is faster than the algebra.

**The set.** `arg z = { 2π/3 + 2πk : k ∈ ℤ }`; every name reaches the same dot. The seven rows of the list (`Arg z = 2π/3 = 2.0943951...`):

| k | name `2π/3 + 2πk` | exact | decimal | text of the row (core `stepText`) |
|---:|---|---|---:|---|
| -3 | `2π/3 - 6π` | `-16π/3` | -16.755 | `2π/3 - 6π = -16π/3` |
| -2 | `2π/3 - 4π` | `-10π/3` | -10.472 | `2π/3 - 4π = -10π/3` |
| -1 | `2π/3 - 2π` | `-4π/3` | -4.189 | `2π/3 - 2π = -4π/3` |
| 0 | `2π/3` | `2π/3` | 2.094 | `2π/3` (prefix `Arg z = `) |
| 1 | `2π/3 + 2π` | `8π/3` | 8.378 | `2π/3 + 2π = 8π/3` |
| 2 | `2π/3 + 4π` | `14π/3` | 14.661 | `2π/3 + 4π = 14π/3` |
| 3 | `2π/3 + 6π` | `20π/3` | 20.944 | `2π/3 + 6π = 20π/3` |

**Every name lands on the same point.** `k = 1`: `2(cos 8π/3 + i sin 8π/3)`; `8π/3 = 2π/3 + 2π`, so cosine and sine are those of `2π/3`: `(2 · (-1/2), 2 · (√3/2)) = (-1, √3)`. The explainer prints this
(`(x, y) = (2cos(8π/3), 2sin(8π/3)) = (-1, √3)`, polar `k = 1: 2 e^{i8π/3}`) and the footer says `agree`.

**Where the seam changes the home step (the same z).** `branchArg(z, σ)` for `Arg z = 2π/3 = 120°`:

| seam σ | window | home step | k0 |
|---|---|---|---:|
| -π (principal) | (-π, π] | 2π/3 | 0 |
| -π/2 | (-π/2, 3π/2] | 2π/3 | 0 |
| 0 | (0, 2π] | 2π/3 | 0 |
| π/2 | (π/2, 5π/2] | 2π/3 | 0 |
| 3π/4 (the cut has swept past z) | (3π/4, 11π/4] | 8π/3 = 8.378 | 1 |

### 6.3 Problem 1.3.2: `(√3 + i)^10` in the form `x + iy`

**Polar route (native).** `r = √(3 + 1) = 2`; `tan θ = 1/√3` in the first quadrant, so `θ = π/6` (`Arg z = π/6 = 0.5236`). Then `z^10 = r^10 e^{i10θ} = 2^10 e^{i10π/6} = 1024 e^{i5π/3}`.
`5π/3 = 300°` is not in `(-π, π]`: subtract `2π` once (`j = 1`): `Arg(z^10) = 5π/3 - 2π = -π/3`. (Any name works for the value; `-π/3` is the one Arg picks.) Convert back:
`cos(5π/3) = cos(-π/3) = 1/2`, `sin(5π/3) = sin(-π/3) = -√3/2`, so `z^10 = 1024 (1/2 - i√3/2) = 512 - 512√3 i ≈ 512 - 886.810 i`
(`512√3 = 886.8100134...`).

**Cartesian route (multiply out).** `z² = (√3 + i)² = 3 + 2√3 i + i² = 2 + 2√3 i`. `z⁴ = (2 + 2√3 i)² = 4 + 8√3 i + 12 i² = -8 + 8√3 i`. `z⁸ = (-8 + 8√3 i)² = 64 - 128√3 i + 192 i² = -128 - 128√3 i`.
`z^10 = z⁸ z² = (-128 - 128√3 i)(2 + 2√3 i) = -256 - 256√3 i - 256√3 i - 256·3 i² = (-256 + 768) - 512√3 i = 512 - 512√3 i`. Same point.
Check by modulus and angle: `√(512² + (512√3)²) = 512 √(1 + 3) = 1024` and `atan2(-512√3, 512) = -arctan(√3) = -π/3`; the Cartesian answer reads back to the polar one.
(The panel shows the sequential chain `z^k = z^{k-1} · z`, nine lines; the same number comes out.)

**Which address is easy.** Polar: two one-line facts (`r^n`, `nθ`) and one wrap. Cartesian: nine multiplications, each a chance to slip.

**All twelve powers of `z = √3 + i = 2 e^{iπ/6}`** (the spiral; `turns` is `j`):

| k | `r^k` | `kθ` (unwrapped) | `Arg z^k` (home step) | `turns` | `z^k` exact | `fmtCart` text |
|---:|---:|---|---|---:|---|---|
| 1 | 2 | π/6 | π/6 | 0 | `√3 + i` | `1.732 + i` |
| 2 | 4 | π/3 | π/3 | 0 | `2 + 2√3 i` | `2 + 3.464i` |
| 3 | 8 | π/2 | π/2 | 0 | `8i` | `8i` |
| 4 | 16 | 2π/3 | 2π/3 | 0 | `-8 + 8√3 i` | `-8 + 13.856i` |
| 5 | 32 | 5π/6 | 5π/6 | 0 | `-16√3 + 16i` | `-27.713 + 16i` |
| 6 | 64 | π | π | 0 | `-64` (on the seam) | `-64` |
| 7 | 128 | 7π/6 | -5π/6 | 1 | `-64√3 - 64i` | `-110.851 - 64i` |
| 8 | 256 | 4π/3 | -2π/3 | 1 | `-128 - 128√3 i` | `-128 - 221.703i` |
| 9 | 512 | 3π/2 | -π/2 | 1 | `-512i` | `-512i` |
| 10 | 1024 | 5π/3 | -π/3 | 1 | `512 - 512√3 i` | `512 - 886.81i` |
| 11 | 2048 | 11π/6 | -π/6 | 1 | `1024√3 - 1024i` | `1773.62 - 1024i` |
| 12 | 4096 | 2π | 0 | 1 | `4096` | `4096` |

(`6 · π/6 = π` is the first multiple of the angle that reaches the seam: `z⁶` sits on it, and the spiral is past it from `z⁷` on, which is why `turns` goes from 0 to 1 there.)

The default readout (`n = 10`): `z^n = 512 - 886.81i; |z|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)`. With `n = 2`: `z^n = 2 + 3.464i; |z|^n = 4; n*theta = 1.047 (π/3); home step = 1.047 (π/3)`.
With `n = 6`: `z^n = -64; |z|^n = 64; n*theta = 3.142 (π); home step = 3.142 (π)`.

**Other presets and the wrap cases.**

| z, n | polar | Cartesian | readout |
|---|---|---|---|
| `1 + i`, 8 | `r = √2`, `θ = π/4`, `r^8 = 16`, `nθ = 2π`, home `0`, `turns = 1`: `16 e^{i0} = 16` | `(1+i)² = 2i`, `(2i)² = -4`, `(-4)² = 16` | `z^n = 16; \|z\|^n = 16; n*theta = 6.283 (2π); home step = 0` |
| `i`, 4 | `r = 1`, `θ = π/2`, `nθ = 2π`, home `0`: `1` | `i² = -1`, `(-1)² = 1` | `z^n = 1; \|z\|^n = 1; n*theta = 6.283 (2π); home step = 0` |
| `1 + i`, 10 | `2^5 e^{i10π/4} = 32 e^{i5π/2}`, `5π/2 - 2π = π/2`: `32i` | `(1+i)^8 (1+i)² = 16 · 2i = 32i` | `z^n = 32i; \|z\|^n = 32; n*theta = 7.854 (5π/2); home step = 1.571 (π/2)` |
| `-2`, 3 | `r = 2`, `θ = π`, `nθ = 3π`, home `π` (not `-π`), `turns = 1`: `8 e^{iπ} = -8` | `(-2)³ = -8` | `z^n = -8; \|z\|^n = 8; n*theta = 9.425 (3π); home step = 3.142 (π)` |

### 6.4 Topic T2.4, first look: the cut is where a one-number choice must jump (staircase)

`z = -2 + 0.5i` and `z = -2 - 0.5i` sit on either side of the negative real axis, `2·arctan(1/4) = 0.4900` apart in angle.

| seam | home step of `-2 + 0.5i` | home step of `-2 - 0.5i` | change across the negative real axis |
|---|---:|---:|---|
| `-π` (principal) | 2.8966 (`π - arctan 1/4`) | -2.8966 | **jump** of `-5.7932 = -(2π - 0.4900)` |
| 0 or `-π/2` | 2.8966 | 3.3866 (`2π - 2.8966`) | continuous, change `+0.4900` |

The same pair, on the positive real axis: `2 + 0.5i` and `2 - 0.5i` have principal home steps `0.2450` and `-0.2450` (continuous), and with the seam at 0 they are `0.2450` and `6.0382 = 2π - 0.2450` (a jump of `+5.7932`).
Moving the seam moves the jump from one axis to the other; no choice of seam removes it from every loop around 0 (6.1, item 3). This is the whole of 2.4.1's idea in one picture.

### 6.5 The lap and the jump (acceptance A2 numbers)

A point at radius 1.5 sent once counterclockwise around 0 in 48 equal steps, starting at angle 0, seam `-π`. The principal `Arg` at step `i` is `2π i/48` (0.1309 per step) for `i = 0..24`, reaching exactly `π = 3.142` at `i = 24`
(the point `-1.5`), and is `2π i/48 - 2π` for `i = 25..48`: `-3.011` at `i = 25`, rising to `0` at `i = 48`. The only consecutive difference larger than `π` is between `i = 24` and `i = 25`:
`|Δ| = 2π - 2π/48 = 6.1523`; all others are `0.1309`. `laps` goes `0 → 1` at `i = 25`. Clockwise: `-1`. With the seam at 0 and a sweep of 8 equal steps from angle `-0.5` to `0.5` (step 0.125), the home step goes
`5.783, 5.908, 6.033, 6.158` (that is `2π + angle`), then `6.283` at the point on the positive real axis (it belongs to the window's top end, `(0, 2π]`), then `0.125, 0.25, 0.375, 0.5`:
the one jump is `6.283 → 0.125`, `|Δ| = 6.158 > 5`. (On screen the magnet may nudge individual points by under 2°; the count of jumps does not change.)

### 6.6 Thm 1.4.14 as sets (the sum panel)

| z₁ | z₂ | `a` | `b` | `a + b` | `z₁z₂` | `Arg(z₁z₂)` | `j` | readout |
|---|---|---|---|---|---|---|---:|---|
| `-1 + i` (default) | `1.5i` (default) | 3π/4 = 2.356 | π/2 = 1.571 | 5π/4 = 3.927 | `-1.5 - 1.5i` | -3π/4 = -2.356 | 1 | `Arg z1 + Arg z2 = 3.927 (5π/4); Arg(z1 z2) = -2.356 (-3π/4); differ by 1·2π` |
| `-1 + i` | `-1 + i` (A3) | 3π/4 | 3π/4 | 3π/2 = 4.712 | `-2i` | -π/2 = -1.571 | 1 | `Arg z1 + Arg z2 = 4.712 (3π/2); Arg(z1 z2) = -1.571 (-π/2); differ by 1·2π` |
| `1 + i` | `1 + 2i` | π/4 = 0.785 | arctan 2 = 1.107 | 1.893 | `-1 + 3i` | 1.893 | 0 | `Arg z1 + Arg z2 = 1.893; Arg(z1 z2) = 1.893; differ by 0·2π` |

Hand check of row 2: `(-1 + i)² = 1 - 2i + i² = -2i`; `Arg(-2i) = -π/2`; `3π/2 = -π/2 + 2π`, so the sum is one step above the home step. Of row 1:
`(-1 + i)(1.5i) = -1.5i + 1.5 i² = -1.5 - 1.5i`, in the third quadrant with a 45° reference angle, `Arg = -3π/4`; `5π/4 = -3π/4 + 2π`. Moduli: `√2 · 1.5 = 2.1213 = |-1.5 - 1.5i|`.

---

## 7. Verification plan

Run everything from the repo root. Screenshots go under `docs/review/iter-1/i1-station-staircase-powers/` (the folder is under `docs/review/`, which keeps PNGs out of the commit). Playwright comes from the harness.
Read screenshots with the image tool (A5).

### 7.1 One row per acceptance criterion

| Id | Kind | Exact command | Passing looks like |
|---|---|---|---|
| A1 | smoke | `node tools/smoke.mjs --route staircase,powers,problem-1-3-2,topic-T2-4 --dark --out docs/review/iter-1/i1-station-staircase-powers/smoke` | Twelve `ok` lines (4 routes x desktop, phone, desktop-dark); last line `12/12 checks passed across 4 route(s).`; exit code 0. No line mentions `console.error`, `page error`, `HTTP`, `request failed`, `external request`, `horizontal overflow` or `router showed the station error panel`. |
| A2 | interaction script | `node tools/smoke.mjs --route staircase --script tests/interact/i1-station-staircase-powers.mjs --dark --out docs/review/iter-1/i1-station-staircase-powers/staircase` | `ok staircase (desktop)`, `(phone)`, `(desktop-dark)`, then `3/3 checks passed across 1 route(s).` The script logs `A2 ok` (steps S2, S3, S5 below) at each viewport. |
| A3 | interaction script | the same command (the script covers A2 and A3 on the route `staircase`) | `A3 ok` (steps S6 and S7) at each viewport. |
| A4 | interaction script | `node tools/smoke.mjs --route problem-1-3-2 --script tests/interact/i1-station-staircase-powers.mjs --dark --out docs/review/iter-1/i1-station-staircase-powers/powers` and again with `--route powers` | `3/3 checks passed`, `A4 ok` at each viewport. |
| A5 | screenshot review | `node tools/smoke.mjs --route problem-1-3-2 --dark --out docs/review/iter-1/i1-station-staircase-powers/shots`, then read `problem-1-3-2--desktop.png`, `--phone.png` and `--desktop-dark.png` | The checklist in 7.6 all true. |
| A6 | code inspection | open `js/stations/staircase.js` and `js/stations/powers.js` | The checklist in 7.7 all true. |
| (unit) | unit test | `node --test tests/unit/i1-station-staircase-powers.test.mjs`, then `npm test` | All new tests pass and the 287 existing ones still do. |
| (T2.4) | interaction script | `node tools/smoke.mjs --route topic-T2-4 --script tests/interact/i1-station-staircase-powers.mjs --dark` | `3/3`, `T2.4 ok`. |

The script is one file with a dispatcher on `ctx.route`: `staircase` runs S1 to S12, `powers` and `problem-1-3-2` run P1 to P10, `topic-T2-4` runs T1 to T3, any other route does nothing. It exports no `expectedErrors` (it provokes none).

### 7.2 Binding expected values (the numbers the tests and reviewers use)

| Where | Value |
|---|---|
| 1.3.2, readout at default | `z^n = 512 - 886.81i; \|z\|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)` |
| 1.3.2, n = 2 | readout contains `2 + 3.464i` |
| 1.3.2, n = 6 | `z^n = -64`, `home step = 3.142 (π)` (positive π, on the seam) |
| 1.3.2, chain at n = 10 | 9 `li.cart-line`; first `z^2 = (1.732 + i)(1.732 + i) = 2 + 3.464i`; last `z^10 = (-512i)(1.732 + i) = 512 - 886.81i` |
| 1.3.2, `#powers-ex-same` | text starts `same point: agree` |
| 1.3.2, angle text after the home chip | contains `-pi/3` |
| 1.3.1, default readout | `z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0` |
| 1.3.1, list | 7 `li`; one `.is-home` containing `Arg` and `2π/3`; `li[data-k="1"]` contains `8π/3`; `li[data-k="-1"]` contains `-4π/3`; `#staircase-stairs-arg` matches `/Arg z = 2\.094/` |
| One lap, 48 steps, radius 1.5, seam `-π` | home step 0 → 3.142 at step 24 → -3.011 at step 25 → 0 at step 48; exactly one `abs(Δ) > π` (6.152), all others 0.131; `laps` 0 → 1 at step 25 |
| Walk | `laps = 2` after the Walk that follows the lap; the button reads `Walk one lap` again afterwards |
| Seam 0, sweep -0.5 → 0.5 in 8 steps | exactly one `abs(Δ) > 5` (6.283 → 0.125) |
| Sum panel at z1 = z2 = `-1 + i` | `#staircase-sum-readout` is exactly `Arg z1 + Arg z2 = 4.712 (3π/2); Arg(z1 z2) = -1.571 (-π/2); differ by 1·2π`; `#staircase-sum-ex-same` has `data-agree="true"` |
| z = -2 | `Arg z = 3.142 (π)` |

### 7.3 What each criterion checks, and how it can fail

- **A1** fails on: any 404 or console error at import or mount, a thrown `mount`, a KaTeX parse error that escapes (it only warns, but the harness counts `console.error`), an `import` of a name that
  does not exist (module load error), overflow at 390 px (a fixed-width canvas, a long unbroken readout), a router error panel.
- **A2** fails on: smoothing of `Arg` (no jump), a point that jumps (a handle that snaps too far), a missing `laps` increment, the walk not finishing, the seam slider not changing the window.
- **A3** fails on: the list not anchored at the home step, a list of the wrong size, a magnet that does not land on `-1 + i√3` (the readout would be `2.095`), the sum readout in another format.
- **A4** fails on: a readout in the other format (`n·theta`), wrong wrap, a `same point` row that disagrees, a missing chip or id.

### 7.4 Unit tests: `tests/unit/i1-station-staircase-powers.test.mjs`

Import the two station modules directly (no DOM at import). KaTeX for the rendering test is loaded the way `tests/unit/i1-core-widgets.test.mjs` does it (`vm.runInThisContext` of `vendor/katex/katex.min.js`,
which defines `globalThis.katex`). Tolerance `1e-9` unless stated; `z132 = { re: Math.sqrt(3), im: 1 }`, `z131 = { re: -1, im: Math.sqrt(3) }`, `PI = Math.PI`.

**`powers.js`**

| Id | Case | Expected |
|---|---|---|
| U1 | `powerModel(z132, 10)` | `defined` true; `r` 2; `theta` π/6; `rn` 1024; `ntheta` 5π/3; `home` -π/3; `turns` 1; `zn` ≈ `{512, -512√3}` (within 1e-9 · 1024); `znPolar` the same; `agree` true; `argZn` -π/3 |
| U2 | `powerModel(z132, n)` for n = 1..12 | `turns` = `[0,0,0,0,0,0,1,1,1,1,1,1]`; `home` for n = 7: -5π/6, n = 9: -π/2, n = 11: -π/6; n = 6: `abs(home - PI) < 1e-12` and `home > 0`; n = 12: `abs(home) < 1e-12`; `zn` = (n=2) `{2, 2√3}`, (3) `{0, 8}`, (4) `{-8, 8√3}`, (5) `{-16√3, 16}`, (6) `{-64, 0}`, (7) `{-64√3, -64}`, (8) `{-128, -128√3}`, (9) `{0, -512}`, (10) `{512, -512√3}`, (11) `{1024√3, -1024}`, (12) `{4096, 0}` (each within 1e-9 · r^n) |
| U3 | wrap cases | `(1 + i, 8)`: `rn` 16, `ntheta` 2π, `abs(home) < 1e-12`, `turns` 1, `zn` `{16, 0}`. `(i, 4)`: `zn` `{1, 0}`, `turns` 1. `(1 + i, 10)`: `zn` `{0, 32}`, `ntheta` 5π/2, `home` π/2, `turns` 1. `(-2, 3)`: `home` π (positive), `turns` 1, `zn` `{-8, 0}`. `(-2, 2)`: `home` 0, `zn` `{4, 0}` |
| U4 | undefined and clamps | `powerModel({re: 0, im: 0}, 5)`: `defined` false, `zn` `{0, 0}`, `turns` 0, `agree` null. `powerModel({re: NaN, im: 1}, 3).defined` false. `n` 0 → 1; 13 → 12; 2.6 → 3; NaN → 10 |
| U5 | property, 300 seeded random `z` (`r` in [0.3, 4], angle in (-π, π]) and `n` in 1..12 | `agree` true; `-π < home <= π`; `abs(home + 2π·turns - ntheta) < 1e-9`; `abs(abs(zn) - rn) < 1e-9 · max(1, rn)` |
| U6 | `cartesianChain(z132, 10)` | length 9, `k` = 2..10; `chainText(chain[0], z132)` = `z^2 = (1.732 + i)(1.732 + i) = 2 + 3.464i`; `chainText(chain[8], z132)` = `z^10 = (-512i)(1.732 + i) = 512 - 886.81i`; `fmtCart` of the values = `2 + 3.464i`, `8i`, `-8 + 13.856i`, `-27.713 + 16i`, `-64`, `-110.851 - 64i`, `-128 - 221.703i`, `-512i`, `512 - 886.81i`; last value within 1e-12 relative of `pow(z132, 10)`; `cartesianChain(z132, 1)` = `[]` |
| U7 | `logRuler` | `(z132, 10)`: `mode` 'out'; `rho(0)` 0.2, `rho(1)` 0.26, `rho(10)` 0.8 (1e-12); 11 rings; `rings[10].r` 1024; `dots[10].angle` = 10 · Arg z132; `dots[6].p` ≈ `{-0.56, 0}` (1e-9). `({re: 0.5, im: 0}, 12)`: 'in', `rho(0)` 0.92, `rho(12)` 0.2. `({re: 0, im: 1}, 4)`: 'flat', `rho(2)` 0.56. `({re: 1.0000001, im: 0}, 3)`: 'flat'. `({re: 0, im: 0}, 5)`: 'flat', `rings` `[]` |
| U8 | `powersReadout` | default: `z^n = 512 - 886.81i; \|z\|^n = 1024; n*theta = 5.236 (5π/3); home step = -1.047 (-π/3)`. n = 2: `z^n = 2 + 3.464i; \|z\|^n = 4; n*theta = 1.047 (π/3); home step = 1.047 (π/3)`. n = 6: `z^n = -64; \|z\|^n = 64; n*theta = 3.142 (π); home step = 3.142 (π)`. `(1 + i, 10)`: `z^n = 32i; \|z\|^n = 32; n*theta = 7.854 (5π/2); home step = 1.571 (π/2)`. `(0.5, 12)`: `z^n = 0; \|z\|^n = 2.44e-4; n*theta = 0; home step = 0`. `(0, 5)`: `z^n = 0; \|z\|^n = 0; n*theta = undefined; home step = undefined` |
| U9 | `angleText`, `wrapNote`, `spiralDescription` | default: `'ntheta'` = `n*theta = 5pi/3 (5.236 rad): one name of arg(z^n), not the home step`; `'home'` = `home step = -pi/3 (-1.047 rad): Arg(z^n), 1 full turn removed`; `'cart'` = `as a point: (x, y) = (512, -886.81); its angle is atan2(y, x) = -pi/3`. n = 2: `'ntheta'` = `n*theta = pi/3 (1.047 rad): already the home step, Arg(z^n)`, `'home'` = `home step = pi/3 (1.047 rad): Arg(z^n), no turns removed`. `(-2 + 0.3i, 7)`: `'ntheta'` = `n*theta = 20.949 rad: one name of arg(z^n), not the home step`, `'home'` ends `3 full turns removed`. `wrapNote`: default `The spiral crosses the seam 1 time, so nθ = 5π/3 is 1 full turn above the home step -π/3. Same direction, different name.`; n = 2 `nθ is already in (-π, π], so there is nothing to wrap.`; `(-2 + 0.3i, 7)` `The spiral crosses the seam 3 times, so nθ = 20.949 is 3 full turns above the home step 2.099. Same direction, different name.`. `spiralDescription`: default `10 dots. Each is the one before it turned by 30° and stretched by 2. z¹⁰ is at distance 1024 in direction -60°.`; n = 1 `1 dot: z itself, at distance 2 in direction 30°.`; `(i, 4)` `4 dots. Each is the one before it turned by 90° and not stretched. z⁴ is at distance 1 in direction 0°.`; z = 0 `z is 0, so every power is 0.` |
| U10 | `powersCells(powerModel(z132, 10))` (every string below is exact) | `base`: cart `\sqrt{3} + i`, polar `2\,e^{i\frac{\pi}{6}}`. `rn`: cart `\sqrt{512^{2} + (-886.81)^{2}} = 1024`, polar `r^{n} = 2^{10} = 1024`. `ntheta`: cart `\operatorname{atan2}\left(-886.81,\ 512\right) = -\frac{\pi}{3}`, polar `n\theta = 10\cdot \frac{\pi}{6} = \frac{5\pi}{3}`. `wrapped`: cart `\text{atan2 gives it directly: } -\frac{\pi}{3}`, polar `\frac{5\pi}{3} - 2\pi = -\frac{\pi}{3}`. `result`: cart `512 - 512\sqrt{3}\,i`, polar `1024\left(\cos\left(-\frac{\pi}{3}\right) + i\sin\left(-\frac{\pi}{3}\right)\right) = 512 - 512\sqrt{3}\,i`. `same`: cart `512 - 512\sqrt{3}\,i`, polar `1024\,e^{-i\frac{\pi}{3}}`, `agree` true. `powersCells` of the undefined model is `null`. For `(1 + i, 8)` the polar `rn` cell is `r^{n} = \left(\sqrt{2}\right)^{8} = 16`; for `(-4 + 4i, 12)` it is `r^{n} = \left(4\sqrt{2}\right)^{12} = 1.074\times 10^{9}`; for `(-2 + 0.3i, 7)` the polar `wrapped` cell is `20.949 - 3\cdot 2\pi = 2.099` |
| U11 | `snapNice` with `tol = 0.05` | `(-1.01, 1.73)` → `(-1, √3)` within 1e-9; `(-0.99, 1.012)` → exactly `(-1, 1)`; `(-1.2, 1.2)` unchanged; `(1.5, 0.001)` → exactly `(1.5, 0)`; `(√3 + 0.01, 1.01)` → `(√3, 1)` within 1e-9; `(0.1, 0.05)` with `tol 0.2` unchanged (never onto 0); `(-1.01, 1.73)` with `{ polar: false }` unchanged; `(-0.99, 1.012)` with `{ cart: false }` unchanged. The result is a fresh object |
| U12 | `arcPolyline(0, 0, 10, 0, π/2)` | length `ceil((π/2)·10/3) + 1 = 7`; first `(10, 0)`, last `(0, -10)` (1e-9); every point at radius 10. `arcPolyline(0, 0, 10, 0, -π/2)` last `(0, 10)`. `arcPolyline(0, 0, 10, 0, 5π)`: last point `(-10, 0)` within 1e-9 and length `ceil(5π·10/3) + 1` |
| U13 | `pickSpot` | three candidates, the first overlapping an obstacle box, the second free, the third free: the second is returned and carries `box`; two equal-cost candidates: the first; a candidate with its box outside the bounds costs 100 more |
| U14 | text helpers | `sup(10)` `¹⁰`, `sup(2)` `²`, `sup(-3)` `⁻³`. `tn`: `0` → `0`, `1.5` → `1.5`, `-1.5` → `-1.5`, `√3` → `\sqrt{3}`, `512√3` → `512\sqrt{3}`, `1/3` → `0.333`, `2/3` → `0.667`, `1.5√2` → `\frac{3\sqrt{2}}{2}`, `3.941e6` → `3.941\times 10^{6}`, `2.44e-4` → `2.44\times 10^{-4}`. `texCartQ`: `(1.5, -1.5)` → `1.5 - 1.5i`; `(0, 1.5)` → `1.5i`; `(-1, √3)` → `-1 + \sqrt{3}\,i`; `(512, -512√3)` → `512 - 512\sqrt{3}\,i`; `(-2, 1.2e-15)` → `-2`; `(3.941e6, 8.206e6)` → `3.941\times 10^{6} + 8.206\times 10^{6}i`; `(NaN, 0)` → `\text{undefined}`; `(0, 0)` → `0`. `polarTex`: `(2, π/6)` → `2\,e^{i\frac{\pi}{6}}`; `(1, π/2)` → `e^{i\frac{\pi}{2}}`; `(2, -π/3)` → `2\,e^{-i\frac{\pi}{3}}`; `(1.5, 0)` → `1.5`; `(0, 1)` → `0`; `(2.022, 2.993)` → `2.022\,e^{i\,2.993}`. `cleanArg({re: -64, im: -1e-14})` = π; `cleanArg({re: -64, im: -1e-3})` < 0. `cleanC({re: -2, im: 1.2e-15})` = `{-2, 0}`. `fmtSmart`: `2.44e-4` → `2.44e-4`, `0` → `0`, `1024` → `1024`. `numExact`: `5π/3` → `5.236 (5π/3)`, `π` → `3.142 (π)`, `1.8925` → `1.893`, `0` → `0` |

**`staircase.js`**

| Id | Case | Expected |
|---|---|---|
| U20 | `normSeam` | `0` → 0; `π` → `-π`; `-π` → `-π`; `11π/12 + 1e-9` → exactly `11 * PI / 12`; `-π/2 + 1e-12` → exactly `-PI / 2`; `1.0` → 1.0; `3.0` → 3.0; `-3.2` → `-π`; `NaN` → `-π` |
| U21 | `seamLabel` | `-π` → `180°, the negative real axis`; `0` → `0°, the positive real axis`; `-π/2` → `-90°, the negative imaginary axis`; `π/2` → `90°, the positive imaginary axis`; `5π/12` → `75°`; `-7π/12` → `-105°` |
| U22 | `stairModel(z131, -π)` | `defined` true; `r` 2; `principal` = `home` = 2π/3; `k0` 0; `steps.map(s => s.theta)` = `[-16π/3, -10π/3, -4π/3, 2π/3, 8π/3, 14π/3, 20π/3]` (each 1e-9) with `k` = -3..3; `window` `(-π, π]` |
| U23 | seams | `stairModel(z131, 3π/4)` (via `normSeam(3π/4)`): `home` 8π/3, `k0` 1, `steps[3].theta` (k = 0) 8π/3, `steps[2].theta` (k = -1) 2π/3, `window` `(3π/4, 11π/4]`. `stairModel(z131, σ).home` = 2π/3 for σ in {-π, -π/2, 0, π/2}. `z = -2`: `home` π for σ in {-π, -π/2, 0, π/2}. `z = 2`: `home` 0 for σ = -π and -π/2, `2π` with `k0` 1 for σ = 0 and π/2. `stairModel({re: 0, im: 0}).defined` false with `steps` `[]` |
| U24 | `stairModel` against the core `homeStep(Arg z, σ)` | for 500 seeded random `z` (`r` >= 0.1) and the 24 seams `-π + j·π/12`: `abs(model.home - homeStep(Arg(z), σ).theta) < 1e-9` |
| U25 | `createLapTracker` | (a) begin(0); 48 steps ccw at radius 1.5 from angle 0 with `update(Arg(z), -π)`: `laps` 1, the crossing is returned at step 25 only; (b) the same clockwise: `laps` -1; (c) begin(Arg(1.5)) then 8 steps from `-0.5` to `0.5` with seam 0: `laps` 1; (d) begin(0), `moveTo(4π, -π)`: returns 2 and `laps` 2; (e) begin(0), `moveTo(-2π, -π)`: -1; (f) `invalidate()` then `update(2, -π)` returns 0 and sets `phi` 2; (g) begin(0.2), `update(-3.1, -π)` returns 1 (the short way round from 0.2 to -3.1 is counterclockwise through π, a +2.98 step, so it crosses the seam once); (h) `reset()` clears `laps` and `phi` |
| U26 | `sumModel` | `(-1 + i, 1.5i)`: `a` 3π/4, `b` π/2, `sum` 5π/4, `product` `{-1.5, -1.5}`, `c` -3π/4, `j` 1. `(-1 + i, -1 + i)`: `sum` 3π/2, `product` `{0, -2}`, `c` -π/2, `j` 1. `(1 + i, 1 + 2i)`: `product` `{-1, 3}`, `sum` = `c` = 1.8925468811915387 (1e-9), `j` 0. `(0, 1)`: `defined` false. Property over 500 seeded random pairs: `j` in {-1, 0, 1}; `abs(sum - c - 2π·j) < 1e-9`; `abs(wrapArg(sum) - c) < 1e-9` or both within 1e-9 of π |
| U27 | strings | `readoutText(stairModel(z131, -π), 0)` = `z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0`; `(-2)` → `z = -2; Arg z = 3.142 (π); laps = 0`; `(0)` with laps 3 → `z = 0; Arg z = undefined; laps = 3`; `(2, seam 0)` with laps 1 → `z = 2; Arg z = 6.283 (2π); laps = 1`. `sumReadoutText`: the three rows of 6.6 verbatim, and for an undefined model `Arg z1 + Arg z2 = undefined; Arg(z1 z2) = undefined (one of the numbers is 0)`. `windowNote`: principal `Home window: (-π, π]. This is the usual choice, so the highlighted name is the principal Arg z.`; seam 0 `Home window: (0, 2π]. You moved the cut, so the highlighted name is the home step for this window, not the principal Arg z.`; undefined `z is at 0. Every direction reaches 0, so arg 0 is not defined. Drag z away from 0.` |
| U28 | `stairCells(stairModel(z131, -π), k)` | k = 0: `address` cart `(x,\ y) = \left(-1,\ \sqrt{3}\right)`, polar `(r,\ \theta) = \left(2,\ \frac{2\pi}{3} + 2\pi k\right)`; `name` cart `(x,\ y) = \left(2\cos\left(\frac{2\pi}{3}\right),\ 2\sin\left(\frac{2\pi}{3}\right)\right) = \left(-1,\ \sqrt{3}\right)`, polar `k = 0:\ 2\,e^{i\frac{2\pi}{3}}`; `same` cart and polar `-1 + \sqrt{3}\,i`, `agree` true. k = 1: `name` cart `(x,\ y) = \left(2\cos\left(\frac{8\pi}{3}\right),\ 2\sin\left(\frac{8\pi}{3}\right)\right) = \left(-1,\ \sqrt{3}\right)`, polar `k = 1:\ 2\,e^{i\frac{8\pi}{3}}`, `agree` true. k = -3: `agree` true. Undefined model → `null` |
| U29 | `sumCells(sumModel(-1 + i, -1 + i))` | `z1` cart `-1 + i`, polar `\sqrt{2}\,e^{i\frac{3\pi}{4}}`; `prod` cart `(x_1x_2 - y_1y_2) + i(x_1y_2 + x_2y_1) = -2i`, polar `r_1r_2\,e^{i(\theta_1 + \theta_2)} = 2\,e^{i\frac{3\pi}{2}}`; `angle` cart `\operatorname{Arg}(z_1z_2) = \operatorname{atan2}\left(-2,\ 0\right) = -\frac{\pi}{2}`, polar `\operatorname{Arg} z_1 + \operatorname{Arg} z_2 = \frac{3\pi}{4} + \frac{3\pi}{4} = \frac{3\pi}{2} = -\frac{\pi}{2} + 2\pi`; `same` cart `-2i`, polar `-2i`, `agree` true. For `(1 + i, 1 + 2i)` the `angle` polar cell has no trailing `= ... + 2\pi` |
| U30 | `neighbourLinks(STATIONS, THREADS, id)` with the real registry | `staircase`: `prev.id` `distance`, `next.id` `powers`, `byThread` = one entry `T2` with `prev.id` `addresses`, `next.id` `powers`. `powers`: `prev.id` `staircase`, `next.id` `roots`; `byThread` T1: `prev.id` `distance`, `next.id` `roots`; T2: `prev.id` `staircase`, `next.id` `roots` |
| U31 | KaTeX accepts every string | for the default model, six more states per station (seams 0 and 3π/4 with k = -3, 0, 2; z131, -2, 1.234 - 0.77i; sums `(-1 + i, 1.5i)`, `(1.3 - 0.4i, -2.2 - 1.1i)`; powers `(√3 + i, 6)`, `(0.4 - 0.3i, 12)`, `(3.1 + 2.2i, 12)`, `(-4 + 4i, 12)`), `katex.renderToString(src, { throwOnError: true, strict: 'ignore', macros })` does not throw for any cart or polar cell and any footer cell |

### 7.5 Interaction script: `tests/interact/i1-station-staircase-powers.mjs`

Header and helpers:

```js
import { dragHandle, dragHandleAround, clickChip, readText, setSlider, settle, parseCart } from './_helpers.mjs';
const PI = Math.PI;
const parse = (t) => ({ z: parseCart(/z = ([^;]+);/.exec(t)[1]), arg: Number(/Arg z = (-?\d+(?:\.\d+)?)/.exec(t)[1]), laps: Number(/laps = (-?\d+)/.exec(t)[1]) });
const readout = (page) => readText(page, '#staircase-readout');
export default async function (page, ctx) {
  if (ctx.route === 'staircase') return staircase(page, ctx);
  if (ctx.route === 'powers' || ctx.route === 'problem-1-3-2') return powers(page, ctx);
  if (ctx.route === 'topic-T2-4') return topic(page, ctx);
}
```

**`staircase(page, ctx)`** (every assertion is `ctx.assert(cond, 'message with the numbers')`):

1. **S1 start.** Wait for `#staircase-plane-z`; `settle`. Readout matches `/^z = -1 \+ 1\.732i; Arg z = 2\.094 \(2π\/3\); laps = 0$/`. `#staircase-window` starts `Home window: (-π, π]`. `#staircase-cut-note` is hidden. `ctx.shot('start')`.
2. **S2 one lap (A2).** `rec = []`; `await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, startAngle: 0, turns: 1, steps: 48 }, async () => rec.push(parse(await readout(page))))`.
   Assert: `rec.length === 49`; `abs(rec[0].arg) < 0.05`; `max(arg) > 3.0`; `min(arg) < -3.0`; the indices `i` where `abs(arg[i] - arg[i-1]) > PI` are exactly one, call it `j`, with `rec[j-1].arg > 3.0` and `rec[j].arg < -3.0`; every other `abs(Δ) < 0.4`; every `hypot(z[i] - z[i-1]) < 0.3`; `rec[j-1].laps === 0 && rec[j].laps === 1`; the last readout contains `laps = 1`; the widget's counter `document.querySelector('#staircase-stairs .staircase-wrap').dataset.jumps === '1'`.
3. **S3 walk (A2).** `await clickChip(page, 'staircase-walk')`; `await page.waitForFunction(() => /laps = 2/.test(document.getElementById('staircase-readout').textContent), null, { timeout: 12000 })`; `settle`; the button text is `Walk one lap`; `#staircase-walk-status` contains `One lap done`.
4. **S4 reduced-motion stepper (extra).** `await page.emulateMedia({ reducedMotion: 'reduce' })`; click `#staircase-walk` once (this click performs the first step, and the label changes at the next render): assert the button text is `Step 30° counterclockwise` and `#staircase-walk-status` is `Step 1 of 12.`; click 11 more times; assert `laps = 3` and the status contains `One lap done`; `await page.emulateMedia({ reducedMotion: 'no-preference' })`.
5. **S5 the seam moves the jump (A2).** `await setSlider(page, 'staircase-seam', 0)`; `#staircase-window` contains `(0, 2π]`; `#staircase-cut-note` visible; `#staircase-seam-output` is `0°, the positive real axis`. `rec2 = []`; `await dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, startAngle: -0.5, turns: 1 / (2 * PI), steps: 48 }, ...push parse)` (that is 8 steps from -0.5 to 0.5). Assert exactly one `abs(Δ) > 5`, with `rec2` going from above 5.5 to below 1.
6. **S6 the list (A3).** `await setSlider(page, 'staircase-seam', -PI)` (window back to `(-π, π]`); `await dragHandle(page, 'staircase-plane-z', { re: -1, im: 1.7320508 })`. Assert: `document.querySelectorAll('#staircase-stairs li').length === 7`; exactly one `#staircase-stairs li.is-home`, whose text contains `2π/3` and `Arg`; `#staircase-stairs li[data-k="1"]` text contains `8π/3`; `li[data-k="-1"]` contains `-4π/3`; `#staircase-stairs-arg` matches `/Arg z = 2\.094/`; the readout matches `/Arg z = 2\.094 \(2π\/3\)/`.
7. **S7 the sum (A3).** `await dragHandle(page, 'staircase-sumplane-z1', { re: 1, im: 1 })` (a real move away from the default), then `dragHandle(page, 'staircase-sumplane-z1', { re: -1, im: 1 })` and `dragHandle(page, 'staircase-sumplane-z2', { re: -1, im: 1 })`. `#staircase-sum-readout` text equals `Arg z1 + Arg z2 = 4.712 (3π/2); Arg(z1 z2) = -1.571 (-π/2); differ by 1·2π` (contains `4.712`, `-1.571` and `2π`); `#staircase-sum-ex-same` has `data-agree="true"`; `#staircase-s12 li.is-picked` exists and its text contains `3π/2`.
8. **S8 pick a step.** Click `#staircase-stairs li[data-k="1"] button`. Assert that `li[data-k="1"]` has class `is-picked`, that the data-tex of `#staircase-ex-name-polar` contains `k = 1`, `#staircase-ex-same` has `data-agree="true"`, and that clicking the same row again clears `is-picked`.
9. **S9 the helix.** `window.__mv.views3d.get('staircase-helix')` exists; `#staircase-helix canvas` exists, or (when `view.unavailable`) `#staircase-helix-fallback` is visible. `view.scene.getObjectByName('arg-helix').userData.beads.length === 5`.
10. **S10 z = 0.** `await page.evaluate(() => window.__mv.planes.get('staircase-plane').getHandle('z').set({ re: 0, im: 0 }))`; `settle`. Readout matches `/^z = 0; Arg z = undefined; laps = \d+$/`; `#staircase-stairs-arg` is `Arg z: no angle at 0`; click `#staircase-walk`: `#staircase-walk-status` is `Move z away from 0 first, then walk.`; the helix beads are hidden (`view.scene` traverse not needed: assert only that no console error occurred, which the harness reports).
11. **S11 start over.** `clickChip(page, 'staircase-reset')`: readout matches `/laps = 0$/` and `z = -1 + 1.732i`; `#staircase-seam-output` is `180°, the negative real axis`. `ctx.shot('end')`.
12. Log `A2 ok`, `A3 ok`.

> Superseded in residue cleanup: the script waits for the button label to return to `Walk one lap` before asserting it, because `laps` ticks over at the seam in the middle of the lap (inconsistency (c) resolved).

**`powers(page, ctx)`**

1. **P1 default (A4).** Wait for `#powers-plane-z`; `settle`. The readout contains `512 - 886.81`, `|z|^n = 1024`, `n*theta = 5.236` and `home step = -1.047`. `#powers-ex-same` text starts with `same point: agree`. `window.__mv.planes` has both `powers-plane` and `powers-spiral`. `ctx.shot('start')`.
2. **P2 home chip (A4).** `clickChip(page, 'powers-report-home')`: `#powers-angle` contains `-pi/3` and `1 full turn removed`; `#powers-report-home` has `aria-pressed="true"`. `clickChip(page, 'powers-report-cart')`: `#powers-angle` contains `(512, -886.81)`. `clickChip(page, 'powers-report-ntheta')`: contains `5pi/3`.
3. **P3 n = 2 (A4).** `setSlider(page, 'powers-n', 2)`: readout contains `2 + 3.464i`; `#powers-wrapnote` contains `nothing to wrap`; `#powers-n-output` is `n = 2`.
4. **P4 chain (A4).** `setSlider(page, 'powers-n', 10)`; click `#powers-cartesian-toggle`; `#powers-cartesian` is visible; `document.querySelectorAll('#powers-cartesian li').length === 9`; the first line is `z^2 = (1.732 + i)(1.732 + i) = 2 + 3.464i`; the last ends `= 512 - 886.81i`; the toggle has `aria-expanded="true"` and reads `Hide the Cartesian working`. Click it again: the panel is hidden.
5. **P5 wrap on the seam.** `setSlider(page, 'powers-n', 6)`: readout contains `z^n = -64` and `home step = 3.142 (π)` (not `-3.142`); set n back to 10.
6. **P6 drag.** `dragHandle(page, 'powers-plane-z', { re: 1, im: 1 })`: readout equals `z^n = 32i; |z|^n = 32; n*theta = 7.854 (5π/2); home step = 1.571 (π/2)`; `#powers-ex-same` `data-agree="true"`.
7. **P7 presets.** `clickChip(page, 'powers-preset-1-3-2')`: readout is the P1 readout again and `#powers-n-output` is `n = 10`. `clickChip(page, 'powers-preset-1i')`: readout equals `z^n = 16; |z|^n = 16; n*theta = 6.283 (2π); home step = 0`. `clickChip(page, 'powers-preset-i')`: `z^n = 1`. Back to `powers-preset-1-3-2`.
8. **P8 stairs.** `#powers-stairs li.is-home` text contains `Arg(zⁿ)` and `-π/3`; `#powers-stairs li.is-picked` text contains `5π/3`; `#powers-stairs li` count is 5.
9. **P9 z = 0.** Set the handle to 0 with the same `evaluate`: readout `z^n = 0; |z|^n = 0; n*theta = undefined; home step = undefined`; `#powers-spiral-desc` is `z is 0, so every power is 0.`. Preset 1-3-2 again.
10. **P10 shots and log.** `ctx.shot('end')`; log `A4 ok`.

**`topic(page, ctx)`**

1. **T1.** `#staircase-topic-note` is visible and contains `Topic T2.4`; the readout is `z = -2; Arg z = 3.142 (π); laps = 0`.
2. **T2 the jump on the negative real axis.** `dragHandle(page, 'staircase-plane-z', { re: -2, im: 0.5 })` then `{ re: -2, im: -0.5 }` (both lattice points): the two `Arg` values are `2.897` and `-2.897` (the readout text of each), a difference larger than 5.
3. **T3 the cut moved.** `setSlider(page, 'staircase-seam', 0)`; drag to `(-2, 0.5)` then `(-2, -0.5)`: the `Arg` values are `2.897` and `3.387` (difference 0.49, no jump). Log `T2.4 ok`.

### 7.6 A5, screenshot review checklist (read `problem-1-3-2--desktop.png`, `--phone.png`, `--desktop-dark.png`)

1. The right plane shows ten dots numbered 1 to 10 on a spiral, dot 1 labelled `z` and blue, dots 2 to 9 orange and numbered, dot 10 larger and labelled `z¹⁰`; each dot is about 30° further round than the last; the rings are labelled 4, 16, 64, 256, 1024 (so "twice as far" is readable); dot 6 sits on the dashed seam at the negative real axis and dots 7 to 10 are below it.
2. Near the origin of the same plane: a solid arc going clockwise 60° labelled `Arg z¹⁰ = -π/3` and a faint arc going counterclockwise 300° labelled `n·θ = 5π/3`, ending on the same ray (one direction, two names). Labels are legible and do not sit on the dots.
3. The left plane shows z at about (1.73, 1) with its ray, `r = 2`, the solid arc `Arg z = π/6`, the dashed unit circle, `1` marked, and `z²` at about (2, 3.46).
4. The readout line is exactly the default readout; the three report chips are visible with `n·θ` pressed.
5. The explainer has five rows with "easy in Polar" badges on four of them, the Cartesian column blue and the polar column orange (both themes), a footer `same point: agree`, and no clipped or overflowing TeX at 390 px (cells stacked, Cartesian above polar).
6. The stair list shows five rows; the home row (`Arg(zⁿ) = -π/3`) is shaded and bold; the row `-π/3 + 2π = 5π/3` is outlined.
7. No horizontal scroll at 390 px; both planes are square and at most the content width; the Cartesian panel is closed.
8. Dark theme: the same picture, with text and arcs readable on the dark surface and the faint arc still visible.

For the staircase route (`staircase--desktop.png`, `--phone.png`, `--desktop-dark.png`) the same kind of check: one blue dot, solid arc `Arg z = 2π/3`, two faint arcs `also 8π/3` and `also -4π/3`, the dashed `seam` on the negative real axis, the three-marks strip, the list with the shaded home row, the helix with a big bead, the sum panel with three lists. This is not an acceptance criterion, but the reviewers will look.

### 7.7 A6, code inspection checklist

1. `staircase.js` imports `Arg`, `argSet`, `fmtAngle`, `fmtCart` from `../core/complex.js` and `createStaircase` from `../core/staircase.js`, exactly as in 4.2, and uses each (`Arg` for the principal, `argSet` in `stairModel`, `fmtAngle` in the arc labels, `fmtCart` in `readoutText`).
2. The readout is `readoutText(S.model, tracker.laps)` and `S.model` is `stairModel(S.z, S.seam)` for the current z only: there is no stored previous angle, no `lerp`, no easing, no `setTimeout` or CSS transition on any number the readout, list, arcs or beads use (grep for `lerp`, `ease`, `smooth`, `transition`, `setTimeout`: the only timers are none; the only `requestAnimationFrame` is the Walk's).
3. The jump is drawn, not hidden: the plane layer takes `m.home` straight from `stairModel`, the beads from `helix.update(z, seam)`, the list from `stairs.update(m.principal)`.
4. `powers.js`: the readout string is `powersReadout(model)` with the literal `n*theta`; the polar route (`rn`, `ntheta`, `home`) and the Cartesian route (`pow`, `cartesianChain`) are computed separately and compared with `eq` (`agree`).
5. No literal colour: grep both files for `#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(`: none outside comments. No `alert`, `confirm`, `prompt`, `print`, `window.open`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `eval`, `innerHTML` with anything not produced by `texToHtml`/`escapeHtml`/`prose` (the stations set text with `textContent`).
6. All imports relative (`../core/...`, `../data/...`, `./powers.js`); no bare specifier, no absolute path, no import of `three` (only `../core/three-view.js`).
7. `mount` returns `unmount`; `unmount` destroys the planes, explainers, stair widgets, the 3D view, cancels the animation frame, removes the `keydown` listener, unsubscribes the theme callback, deletes `window.__mv.staircase` / `powers`, and sets `destroyed` first. Window-level listeners: none (the theme subscription is `ctx.theme.onThemeChange`).
8. Every control has the id of section 2; every readout is plain text (`textContent`) with an ASCII minus.
9. `window.__mv` is extended, never replaced.
10. `powers.js` does not import `three-view.js` or `staircase.js`.

### 7.8 Mutation checks the builder should run once

Each of these must make a named test fail: change `wrapArg(ntheta)` to `Arg({ re: Math.cos(ntheta), im: Math.sin(ntheta) })` (U2 n = 6 sees `-π` on the seam); drop the `cleanArg` snap (U14); make the lap tracker use
`floor` instead of `ceil` in `idx` (U25 (a)); make `snapNice` ignore `polar` (U11 and S6); rename the readout `n*theta` to `n·theta` (U8 and P1); set the seam slider default to `π` without `normSeam` (S1/S5: the window would read
`(π, 3π]`); smooth `Arg` with a running average (S2: no `abs(Δ) > π`).

> Superseded in residue cleanup: the first mutation (wrapArg replaced by `Arg` of cos and sin) is an equivalent mutant: `Arg` of complex.js maps −π to π, so U2 cannot see it; the second item (the `cleanArg` snap) is the one that matters. The readout mutation now reads `nθ` against `n*theta`.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| z = 0 exactly (set by `handle.set`, or a script) | Undefined state of 2.5 on both stations. Walk, Turn disabled; chain panel still lists n - 1 lines of zeros. **Superseded in residue cleanup:** the Walk button stays enabled at z = 0 and answers with the status "Move z away from 0 first, then walk." |
| z within 0.06 units of 0 (about 4 px) but not 0 | Everything is defined (`Arg` of a tiny z is fine), but the lap tracker is invalidated, so dragging through the middle never counts a lap. |
| z exactly on the seam (`z = -2`, seam `-π`) | `Arg z = π` (`Arg` of a negative real is `π`), the window is `(-π, π]`, the list's home row reads `π`. One pixel below the axis it reads `-3.14...`: that is the jump, seen at its source. |
| The seam moved through z (`3π/4` and z at 120°) | `branchArg` gives `8π/3`; the list relabels (k = 0 reads `8π/3`); the tracker is untouched. |
| A pointer sample that jumps by more than π | The tracker takes the short way round (`wrapArg` of the difference); exactly π picks counterclockwise. A straight drag through the origin is therefore not a lap. |
| Walk with `\|z\| > 2.9` (plane corners) | The lap runs at radius 2.9 so the dot stays on the canvas; the last frame restores z exactly. `\|z\| < 0.2`: Walk refuses with the status text. |
| Seam moved while the Walk runs | Allowed. `moveTo` uses the current seam on each frame, so crossings are counted against the seam as it is then. |
| Many laps | `laps` is any integer; the Turn slider's thumb stops at ±720° while its output keeps counting. |
| Tab hidden during the Walk | `requestAnimationFrame` pauses; on return `u` is already large and the lap finishes on the next frame; `moveTo` counts the crossing once. |
| Unmount during the Walk | `unmount` cancels the frame and sets `destroyed`; a frame already queued returns at the first line. |
| Window resize or phone rotation | Planes and the 3D view resize themselves (core); layers read `plane.getSize()` on every draw; the explainer re-stacks at 560 px. |
| Theme toggled | Planes redraw (core), explainers and stair widgets re-render (core), the 3D view refreshes its materials (core), the station re-reads `--ghost-alpha` and requests a redraw. |
| KaTeX missing or a cell throws | The core explainer prints the TeX source or `n/a`; nothing else is affected. |
| WebGL missing or the context lost | Fallback text under `#staircase-helix` (2.5); the rest works. |
| Powers: `\|z\|` up to 6.36 (plane corner) and n = 12 | `r^n` up to about 6.6e9: the TeX uses `3.941\times 10^{6}` style numbers above 1e6, the readout prints the integer digits (`fmtNum` switches to exponent form only at 1e15). `eq` uses a relative tolerance. |
| Powers: tiny `r^n` (0.5^12 = 2.44e-4) | `z^n` prints `0` in the readout (3 decimals) and `\|z\|^n = 2.44e-4` beside it; the TeX uses `2.441\times 10^{-4}`. |
| Powers: z real positive (θ = 0) | The spiral runs along the positive real axis; the home arc has zero sweep (nothing drawn); the label block `Arg z¹⁰ = 0` is still placed. |
| Powers: z on the negative real axis | `θ = π`, `nθ = nπ`, home `π` for odd n (never `-π`) and `0` for even n. |
| Float noise in products | `cleanC` and `cleanArg` remove it before it is formatted (`-2 + 1.2e-15 i`, `-64 - 1e-14 i`). |
| Router: unknown token | Default state, no error. |
| Narrow desktop windows (800 to 899 px) | One column, planes at most 560 px wide and centred. |

### 8.2 Performance plan

- Targets: 60 fps while dragging on the 2D planes (the work per pointer event is under about 4 ms: one `argSet`, a dozen text writes, a 7-row list update, nine 3D object updates, one coalesced canvas redraw of about 40 polylines, one
  coalesced explainer render); 60 fps during the Walk (the same work, once per frame); the 3D view renders only when something changed (the core view is render-on-demand), well above 30 fps at default size.
- Nothing is recomputed that did not change: the model is computed once per event and stored in `S.model` / `P.model`; the layers read it. The explainer skips unchanged cells (core). The spiral polyline is 240 points; the powers list is 11 `pow` calls.
- Allocation: a few small arrays per event (the 7-element step list, the candidate list for label placement: at most 20 objects). No per-pixel work, no layout reads in handlers (`getSize` is cached by the plane), no timers except the Walk's frame loop.
- The injected `<style>` is added once per page. The station imports are static; three.js is parsed only on `staircase`.
- Measure once with the plane's own stats: after a 10 s drag, `window.__mv.planes.get('staircase-plane').getStats().lastDrawMs` should be under 8 ms on the CI container (a note in the build report, not a pass criterion).

### 8.3 Accessibility

- **Names and roles.** Every control has an id and a visible label (`label for`, button text) or an `aria-label`. The dots are real `<button>`s from the plane with a live aria-label that says both addresses and Arg. The two chip groups are
  `role="group"` with a label; the pressed state is `aria-pressed`. The Cartesian toggle is a disclosure (`aria-expanded`, `aria-controls`). The 3D helix is a focusable group (core) with keyboard orbit; its text alternative is the
  list beside it and the caption.
- **Not dragging-only.** Everything a drag does has another way: arrow keys on the dot, the Turn slider (continuous angle), the Walk button, the presets; on the sum plane arrow keys and the dots' own labels; `n` is a slider.
- **Live regions.** The readouts are not live (they change at 60 Hz). Polite announcements: the stair widget's seam note (core), `#staircase-live` (end of a walk, a step of 12, z = 0), the plane's own debounced announcement of the dot's position (core).
- **Colour is never the only cue.** Arg is a thick arc with the words `Arg z = ...` and a shaded, bold, prefixed row; arg is faint arcs with `also ...` words and rows; the seam is dashed with the word `seam`; Cartesian is dashed lines and
  the label `x`/`y` only in the readout and explainer; polar is solid; the picked step is outlined with `aria-pressed`; z is a dot with the letter `z`.
- **Contrast.** Text and marks use the shell's tokens, all at least 4.5:1 for text on `--surface` in both themes (section 3.3); faint arcs are decorative.
- **Focus.** Visible focus on every control (shell and core styles); nothing moves focus on mount; after a route change the router focuses `#view`.
- **Language.** Plain sentences, one idea each; numbers always with their exact form when there is one (`2.094 (2π/3)`); no jargon without its picture next to it.
- **Zoom and text size.** Layout uses `rem` and `minmax(0, 1fr)`; at 200 % text size the two-column grid collapses before anything overflows.

### 8.4 Reduced motion

`ctx.theme.prefersReducedMotion()` is read at the moment of each Walk click (never cached; the label is refreshed on every render, so after the OS setting changes it is right at the next interaction).
When it is true: the Walk button reads `Step 30° counterclockwise` and one click moves the dot by 30° (12 clicks make a lap, counted); no `requestAnimationFrame` loop starts; the stair widget's seam pulse is switched off by its own media query; the 3D view has no
damping or auto-rotate (core). Powers has no autonomous motion at all. Nothing needs a "play" control.

### 8.5 Phone layout (390 px wide, content width 358 px, no horizontal scroll)

- One column everywhere (breakpoint 900 px for the staircase grid and the sum lists, the shell's 760 px for `.two-planes`, 560 px for the explainer stack).
- Planes are square at the content width (358 px), `maxWidth` 560 or 520 only matters on desktop. The handle's hit area is 44 px (coarse pointer). Plane label font is 12 px below 420 px (core).
- Stair list rows are 2.5 rem high (the widget is "dense", 2 rem, only above 8 rows): the staircase list is 17.5 rem plus its three text lines, the powers list (5 rows) 12.5 rem, each sum list (3 rows) 7.5 rem.
- Sliders stack label over range under 480 px (shell); chips wrap; buttons are 44 px high; the readout wraps (`white-space: pre-wrap`).
- The explainer stacks Cartesian above polar and breaks long TeX with `overflow-wrap: anywhere` (core). The longest strings are the `result` polar cell of powers (about 70 characters of TeX) and the staircase `name` cart cell: both wrap.
- The helix is 4:3 at the content width (358 x 269), the beads are about 4 px: the list and the plane carry the same information.
- Page length is the cost of the design: about 7 screens on a phone. The order puts the interactive pictures first and the callouts after them.

---

## 9. Out of scope

- **Roots** (`z^n = c`, roots of unity, the quadratic formula): `roots`. The staircase list divided by n is its picture; here the list is not divided.
- **Principal roots and `w^{1/n}`**: `principal-root`. **Branches, the continuity walk along the negative real axis, the cube root and the Riemann surface**: `branches` (and `graph4d`). The seam slider here is the first look only.
- Powers with negative, fractional or complex exponents, `n > 12`, de Moivre for sums and products of different numbers (only `z^n` for one z).
- Any mapping of shapes (`powermap` has `z^n` on lines and sectors), the Lab hand-off (no "Open in Lab" button on these two stations), domain colouring.
- Audio narration, videos, the "listen" control (the media track is separate and optional).
- Remembering anything between visits (no store keys, no localStorage), progress ticks (the problem index owns them).
- An unwrapped-angle strip chart (Arg as a sawtooth against the total turn): a good later addition; the Turn slider and the helix carry the idea now.
- Editing the registry, the shell, the core modules, ARCHITECTURE, or the test helpers.

---

## 10. Requests to other owners, risks, notes for the builder

### 10.1 Requests (the orchestrator schedules these; this goal does not edit them)

1. **`docs/ARCHITECTURE.md` section 9, entry `i1-station-staircase-powers`** (planner): (a) `#staircase-seam` "default π" should read "default -π (π is the same ray, normalised to -π)" (D1); (b) the powers readout is `n*theta` in ASCII (D2); (c) add the ids of D3 and the second plane `powers-spiral`;
   (d) the sum readout and the other formats stay as they are.
2. **`docs/goals/iter-1.json`, goal `i1-station-staircase-powers`**: A5 says "the plane auto-fits or an inset shows z^10"; the design uses the log-ruler spiral plane (D4), please accept that reading (or reword A5). `owns` does not list the unit test and the interaction script that CONSTRAINTS require (D9).
3. **`js/core/plane.js` (later, optional):** a `seam` option for `drawPolarAddress` (so the solid arc ends at `branchArg(z, seam)`) would let `branches` and `principal-root` reuse core code; this goal ships `drawAngleArcs` in `powers.js` instead and can be migrated then.
4. **`js/core/three-view.js` (later, optional):** a pick/highlight API for `argHelix` beads (this goal edits `userData.beads[i].scale` and calls `view.requestRender()`, which works today but is not a documented mutator).
5. **`js/core/staircase.js` (known, wave 0 residue 65):** `homeStep` has no 1e-9 snap at the window edge. This goal never feeds it a value near an edge (it feeds `Arg z`), so it is unaffected.

### 10.2 Risks and how the design handles them

| Risk | Handling |
|---|---|
| Label blocks overlapping dots or the ray on a small plane | `pickSpot` tries 20 candidates against dots, rays, the seam and earlier labels and takes the cheapest; the screenshot review (A5) looks at it. |
| The magnet feels sticky | 4 px reach only, never to the origin, not applied to `handle.set`; the Turn slider and Walk are free. |
| The Walk is slow for a script | 4 s; the script waits up to 12 s. |
| The log ruler read as a linear scale | Caption, ring labels with true distances, the `powers-spiral-desc` sentence, and the true-scale left plane beside it. |
| A reviewer's script reads the powers "angle text" with another selector | The id is `#powers-angle` (D3). If a script needs another selector, add an alias (an element or attribute carrying the same text); do not rename. |
| `n*theta` versus `n·theta` | D2: ASCII, per the goal's acceptance text. |
| Importing `staircase.js` in Node pulls in three.js | The wave-0 three tests already import `three-view.js` in Node; no top-level DOM access anywhere. |
| Readout text depends on core formatting (`argReadout`, `fmtCart`) | The unit tests pin the exact strings, so a change in the core format fails here first. |

### 10.3 Notes for the builder

- Build order that keeps the tree working: (1) `powers.js` pure kit and models with their unit tests; (2) the powers DOM, planes, explainer, stairs; (3) `staircase.js` pure models with unit tests; (4) staircase plane and list; (5) the controls (Walk, Turn, seam);
  (6) helix; (7) sum panel; (8) the interaction script; (9) screenshots in both themes and at 390 px.
- Build the DOM with a tiny `h(tag, attrs, ...children)` helper and `textContent` (never `innerHTML` for copy). Links in copy (`Branches and Cuts`, `The Staircase`) are `<a href="#branches">` nodes inserted by the helper.
- One `ensureStyle(name, css)` per station: query `style[data-for="..."]` first.
- Keep every `S`/`P` mutation inside the small functions of section 5 so that `render()` is the only place that writes the readout, list, explainer, helix and requests a draw.
- When in doubt about a core call, the core file wins over this document; record the difference in the build report.
