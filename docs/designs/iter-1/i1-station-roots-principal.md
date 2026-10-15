# Design: i1-station-roots-principal

Stations `roots` (`js/stations/roots.js`) and `principal-root` (`js/stations/principal-root.js`).
Designer stage 2, iteration 1, wave 1. Binding inputs: `docs/goals/iter-1.json` (goal spec and acceptance
A1 to A6), `docs/CONSTRAINTS.md`, `docs/ASSIGNMENT.md`, `docs/STORY.md`, `docs/ARCHITECTURE.md` (sections 3, 4, 9, 10)
and the wave-0 code, which wins wherever it differs from ARCHITECTURE (differences are listed in 4.0).

A builder who reads only this file, `CONSTRAINTS.md` and the code of the wave-0 modules named in section 4 should be able to
write both stations, the unit test and the interaction script without guessing. Every number in section 6 has been checked
by running the wave-0 `complex.js` (scratch scripts, not committed) and by hand.

Prototype check. Before this file was finalised a throwaway prototype (scratch files, not committed) built the `roots` page and the `principal-root` plane from the pseudocode below with the real wave-0 modules
and ran it in headless Chromium at 1280 and 390 px, light and dark. It confirmed that: a click, Enter and Space on a non-draggable plane handle select a root; a staircase row, a list button and a root dot all reach `select(k)`;
dragging c updates every readout; the explainer table, KaTeX multi-line cells, the staircase widget and the planes render with no console error and no horizontal overflow. It also changed the design in six places:
multi-line TeX cells use `\begin{array}{l}` (left aligned) and shorter lines (a long angle line was clipped at 390 px); angles in exponents are written `5\pi/4` (the stacked fraction was unreadable); root labels are the plane handles' own
labels (canvas labels ran under the zoom buttons); the two root planes have no zoom buttons; the c-plane seam has no word on it (it landed on the tick labels); the dashed step-n ray runs to 1.4 x the radius (at 1.2 it was hidden by the dot and ring).

Reading note: in the tables a pipe that belongs to the text is written `\|` (Markdown table escaping), so `\|c\|^(1/n)` means the characters `|c|^(1/n)`. Every string that scripts or tests assert on also appears unescaped in a code block (2.7, 7.2) or in a code span outside a table.

Files to create: `js/stations/roots.js`, `js/stations/principal-root.js`, `tests/unit/i1-station-roots-principal.test.mjs`,
`tests/interact/i1-station-roots-principal.mjs`. The goal's `owns` list names only the two station files; the two test
files are the verification deliverables the task asks for and no other goal touches them.

---

## 1. Goal, story thread, problems covered

### 1.1 Restatement

Build two stations.

- **`roots`** ("Roots: Divide the Staircase"): the student gives a number c and a count n. The station draws c once with its
  whole staircase of angles (the set arg c, with Arg c highlighted), divides every step of the staircase by n, and shows the n
  roots as n points of a regular n-gon on the circle of radius |c|^(1/n). Step n lands back on step 0 (drawn ghosted), which is
  why there are exactly n roots. For c = 1 the primitive roots are marked. A raise-to-the-n-th-power animation spirals a chosen
  root back to c. A separate panel solves the quadratic formula as "complete the square, take a square root of d, slide by h".
- **`principal-root`** ("Principal Roots: Stand on the Home Step"): the same picture for one number w, but now only step k = 0
  (the home step, Arg w) makes the principal root w^(1/n); the other n - 1 roots are ghosts from the steps above. A sweep
  animation takes w once around the origin: the principal root turns at 1/n of the speed and jumps when w crosses the seam
  (the negative real axis), where Arg w drops from pi to -pi.

### 1.2 The story thread, and how it shows on screen

Thread 2 (the staircase), applied twice, plus Thread 1 (the two addresses) for the shapes.

| Idea | Where it is drawn |
|---|---|
| The point z is drawn once | `roots`: c is one dot on the c-plane, each root is one dot on the root plane. `principal-root`: w and each root are single dots. |
| The set arg c (the staircase) | the staircase widget (`roots-stairs`, `principal-root-stairs`) and the faint extra windings drawn by `drawPolarAddress(..., { ghosts })` on the plane that holds c or w |
| The number Arg c (the home step) | the solid arc and the highlighted k = 0 row; in `principal-root` the one solid root |
| "Divide every step by n" | staircase row k (angle Arg c + 2 pi k) on the left, `#roots-list` row k (angle divided by n, the point it lands on) on the right, ray k on the root plane carrying the same number k |
| "Step n is step 0 again" | a dashed, fainter ray k = n on the root plane that runs on past root 0, and the note `#roots-wrap-note` |
| A root has two kinds of name | for the selected root the plane draws the home-step arc (Arg of the root as a point) and one ghost winding, so "5pi/4 versus -3pi/4" is seen on the plane, and the list line says both |
| Polar-native shapes | the circle r = \|c\|^(1/n), the rays, the n-gon (`--polar`); Cartesian drop lines for the selected root (`--cart`) |
| Which address makes it easy | explainer rows carry the "easy in Polar" badge for the equation, the angle and the point; the quadratic panel carries "easy in Cartesian" on the formula row and "easy in Polar" on the square root of -36 |
| Time | the raise animation (spiral from the root at power 1 to c at power n, drawn with the time ramp) and the sweep (w around the circle and the root's path in its pieces, one clock, cursor rings) |
| Principal means home step only | `principal-root`: solid versus ghost dots, the dashed seam, the staircase row k = 0, the jump readout |

The north star ("less daunting, a place in one story"): after this station the student should be able to say, for 1.4.1,
1.4.2 and 2.2.2, "this is `roots`: divide the staircase" or "this is `principal-root`: stand on the home step", and for 1.4.3
"complete the square, then it is a square root".

### 1.3 Review problems and topics covered

| Id | Statement (handout) | Station | Preset | Address |
|---|---|---|---|---|
| 1.4.1 | Find and sketch the 5th roots of unity. | roots | c = 1, n = 5 | P |
| 1.4.2 | Find all the 4th roots of -16. Express answers in both exponential and Cartesian forms. | roots | c = -16, n = 4 | P then C |
| 1.4.3 | Use the quadratic formula to solve z^2 - 4z + 13 = 0. | roots | quadratic panel a = 1, b = -4, c = 13 (main picture c = -9, n = 2) | C, with a root in disguise |
| 2.2.2 | Compute the principal value of the square root of 2i, i.e. (2i)^(1/2) on the principal branch. | principal-root | w = 2i, n = 2 | P |

Topics: T1.4 (powers and roots: all n-th roots of unity, primitive roots, solving z^n = c, the quadratic formula in the
complex numbers) and T2.2 (the principal square root and principal n-th root, Def 2.2.1 and 2.2.8). Definitions used:
Def 1.4.4 (arg z as a set), Def 1.4.6 (Arg z), Thm 1.5.4 (n roots), Def 1.5.6 (primitive n-th root).

---

## 2. UX

Words in `monospace` are element ids (without `#`) or literal strings. Copy is plain and direct, written for a student the
night before a test: no emoji, short sentences, the two addresses named out loud. Readouts are ASCII (minus is `-`, angles are
`pi/4`); prose may use the unicode pi.

### 2.1 Page layout, `roots`

Order of blocks (all inside the router's `<section class="station" id="station-roots" data-station="roots">`, a flex column):

1. `header.station-header` (h1, lede, thread badges, problem chips).
2. `div.callout#roots-problem` (the statement of the active review problem; hidden when the state matches no preset).
3. `ol#roots-try` "Three things to try" (inside a `.callout`).
4. `section.panel#roots-controls` "Pick c and n": presets, n slider, Re c and Im c fields, readout.
5. `div.two-planes`: panel with the c-plane (`roots-plane`), panel with the root plane (`roots-zplane`).
6. `section.panel#roots-divide` "Divide the staircase": staircase widget beside the root list; notes; raise button.
7. `section.panel#roots-explain`: heading `roots-ex-heading`, explainer `roots-ex`.
8. `section.panel#roots-quadratic` (1.4.3): inputs, readout, story, small plane, explainer `roots-qex`.
9. `nav.station-links`.

When the preset is problem 1.4.3 or token `quadratic`, block 8 is placed directly after block 3 (decided at mount by the order in
which the blocks are appended; no CSS `order`, no scrolling), so the deep link opens on the quadratic. Otherwise block 8 is last.

Desktop wireframe (content column about 960 px; `.two-planes` gives two columns):

```
+------------------------------------------------------------------------------------+
| Roots: Divide the Staircase                                                  [h1]  |
| A number c has a whole staircase of angles ... (lede, max 62ch)                    |
| (T2 The staircase) (T1 One point, two addresses)       [1.4.1] [1.4.2] [1.4.3]     |
+------------------------------------------------------------------------------------+
|#| 1.4.2  Find all the 4th roots of -16. Express answers in both exponential ...    |  callout, polar bar
|#| Easy in: [Polar] [Cartesian]  Find the roots in polar (divide the angle by 4)... |
+------------------------------------------------------------------------------------+
| Three things to try  1. Drag c around 0 ...  2. Click root k = 2 ...  3. Raise ... |
+------------------------------------------------------------------------------------+
| Pick c and n                                                                       |
| [c = 1, n = 5] [c = -16, n = 4] [c = i, n = 3] [c = 2i, n = 2]                     |
| n (how many roots) [------o---------] 4      Re c [ -16 ]   Im c [ 0 ]             |
| c = -16; n = 4; |c|^(1/n) = 2; Arg c = pi; roots at (Arg c + 2pi k)/n; k = 0..3    |
+-------------------------------------------+----------------------------------------+
| c, the number you give                    | The n roots of c                       |
| +--------------------------------------+  | +------------------------------------+ |
| |  c-plane, view +-20                  |  | |  root plane, view +-3              | |
| |  c at (-16, 0) (green handle)        |  | |  circle r = 2, 4 rays, 4 dots,     | |
| |  solid arc Arg c = pi, faint arcs    |  | |  dashed ray k = 4, n-gon, selected | |
| |  raise spiral (when shown)           |  | |  root with x and y drop lines      | |
| +--------------------------------------+  | +------------------------------------+ |
| Drag c. The point is drawn once. ...      | Each ray is one step divided by n ...  |
+-------------------------------------------+----------------------------------------+
| Divide the staircase                                                               |
| The steps of arg c (highest k first) | ... divided by n: the roots (k = 0 first)    |
| +-----------------------------+ | [k = 0: 2 e^(i pi/4) = 1.414 + 1.414i (Arg pi/4)]|
| |  ...               (k=4)    | | [k = 1: 2 e^(i 3pi/4) = -1.414 + 1.414i (Arg ..)]|
| |  pi + 6pi = 7pi    (k=3)    | | [k = 2: ...                                     ]|
| |  pi + 4pi = 5pi    (k=2)    | | [k = 3: ...                                     ]|
| |  pi + 2pi = 3pi    (k=1)    | | Step 4 gives (Arg c + 8pi)/4 = Arg c/4 + 2pi ... |
| | Arg c = pi         (k=0)    | | [Raise root 0 to the power n]  z^m = ...         |
| +-----------------------------+ |                                                  |
| (staircase note)                | Step 0 is the principal root: Principal Roots    |
| What is arg vs Arg? The Staircase |                                                |
+------------------------------------------------------------------------------------+
| Both addresses, for step k = 0                                                     |
| | quantity | Cartesian (slide)            | Polar (spin-and-stretch)   |            |
| | equation | (x+iy)^4 = -16, x^4-6x^2y^2..| r^4 = 16, 4 theta = pi + 2 pi k |       |
| | length r | sqrt(1.414^2 + 1.414^2) = 2  | |c|^(1/4) = 16^(1/4) = 2   |            |
| | angle    | Arg z0 = pi/4                | theta_0 = (pi + 0)/4 = pi/4 |           |
| | the root | z0 = sqrt2 + sqrt2 i         | z0 = 2 e^(i pi/4)         |            |
| | same point: agree | (sqrt2 + sqrt2 i)^4 = -16 | 2^4 e^(i pi) = -16      |       |
+------------------------------------------------------------------------------------+
| 1.4.3  The quadratic formula hides a square root                                   |
| a [ 1 ] b [ -4 ] c [ 13 ]   (z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i       |
| story text ...                                  | +--------------------+           |
| explainer: discriminant / its square root / the roots | q-plane       |           |
| [Show the square roots of d in the big picture] | +--------------------+           |
+------------------------------------------------------------------------------------+
| [<- Powers: Spin n Times] [Curves and Time ->]  [T2 next: z^n: Fans and Parabolas]  |
+------------------------------------------------------------------------------------+
```

Phone wireframe (390 px wide, 16 px gutters, one column; every block above stacks in the same order):

```
+--------------------------------+
| Roots: Divide the Staircase    |
| lede (wraps)                   |
| (T2 ...) (T1 ...)              |
| [1.4.1] [1.4.2] [1.4.3]        |
| 1.4.2 Find all the 4th roots...|
| Three things to try            |
+--------------------------------+
| Pick c and n                   |
| [c = 1, n = 5] [c = -16, n = 4]|  chips wrap
| [c = i, n = 3] [c = 2i, n = 2] |
| n (how many roots)         4   |
| [==========o==============]    |  slider on its own line (<= 30rem)
| Re c [ -16 ]  Im c [ 0 ]       |
| c = -16; n = 4; |c|^(1/n) = 2; |  readout wraps (pre-wrap)
| Arg c = pi; roots at ...       |
+--------------------------------+
| c, the number you give         |
| +----------------------------+ |
| |   c-plane (square, 358 px) | |
| +----------------------------+ |
| caption                        |
+--------------------------------+
| The n roots of c               |
| +----------------------------+ |
| |   root plane (square)      | |
| +----------------------------+ |
| caption                        |
+--------------------------------+
| Divide the staircase           |
| staircase widget (full width)  |
| note                           |
| roots list (full width buttons)|
| notes, [Raise ...], readout    |
+--------------------------------+
| Both addresses, for step k = 0 |
|  equation                      |
|   Cartesian: ...               |  explainer stacks (<= 560 px)
|   Polar: ...                   |
|  ...                           |
| 1.4.3 quadratic panel ...      |
| [<- Powers] [Curves ->]        |
+--------------------------------+
```

### 2.2 Page layout, `principal-root`

Blocks: header; `div.callout#principal-root-problem` (statement of 2.2.2 when w = 2i, n = 2); `section.panel#principal-root-controls`
(presets, n slider, Re w and Im w, readout); `div.rt-two` with the plane panel (`principal-root-plane`) on the left and a panel on the right
holding the staircase widget, `principal-root-pick-note`, the trap note `principal-root-trap` and the sweep controls; `section.panel#principal-root-explain`
(explainer `principal-root-ex`); `nav.station-links`.

```
+------------------------------------------------------------------------------------+
| Principal Roots: Stand on the Home Step                                      [h1]  |
| lede ...                                  (T2 The staircase)         [2.2.2]       |
+------------------------------------------------------------------------------------+
|#| 2.2.2  Compute the principal value of the square root of 2i ...                  |
|#| Easy in: [Polar]  Principal roots are defined with Arg: take the square root ... |
+------------------------------------------------------------------------------------+
| Pick w and n                                                                       |
| [w = 2i, n = 2] [w = -1, n = 2] [w = -1, n = 3]                                    |
| n (which root) [--o------] 2        Re w [ 0 ]   Im w [ 2 ]                        |
| w = 2i; n = 2; |w| = 2; Arg w = 1.571 (pi/2); w^(1/n) = 1.414 e^(i pi/4) = 1 + i  |
+---------------------------------------------+--------------------------------------+
| w and its roots                             | The steps of arg w                   |
| +----------------------------------------+  | +----------------------------------+ |
| | plane, view +-3.2                      |  | |  pi/2 + 2pi = 5pi/2  (k = 1)     | |
| | w (green handle), solid root, ghost    |  | | Arg w = pi/2 (home, k = 0)       | |
| | root(s), dashed seam on the negative   |  | +----------------------------------+ |
| | real axis, Arg arc and faint windings  |  | pick note: root from step k = 1 ...  |
| +----------------------------------------+  | trap note (when it applies)          |
| caption                                     | Sweep w once around                  |
|                                             | [Sweep w once around the origin]     |
|                                             | No jump yet. ...                     |
+---------------------------------------------+--------------------------------------+
| Both addresses (explainer: w / equation / length / angle / root from step k)       |
+------------------------------------------------------------------------------------+
| [<- z^n: Fans and Parabolas] [Branches and Cuts ->]  [T2 ...]                      |
+------------------------------------------------------------------------------------+
```

The phone layout is the same blocks in one column: plane first, then the staircase panel, then the sweep, then the explainer.

### 2.3 Controls, `roots`

| Id | Element | Visible label | Behaviour |
|---|---|---|---|
| `roots-preset-1` | `button.chip` `aria-pressed` | "c = 1, n = 5" | Loads c = 1, n = 5 (1.4.1), selects step 0, refits both views. |
| `roots-preset-m16` | `button.chip` | "c = -16, n = 4" | Loads c = -16, n = 4 (1.4.2). |
| `roots-preset-i` | `button.chip` | "c = i, n = 3" | Loads c = i, n = 3 (cube roots of i: angles pi/6, 5pi/6, 3pi/2). |
| `roots-preset-2i` | `button.chip` | "c = 2i, n = 2" | Loads c = 2i, n = 2 (the square roots of 2i, which is problem 2.2.2's number). |
| `roots-n` | `input[type=range]` min 2, max 12, step 1 | "n (how many roots)" | Live (`input` event). Rebuilds the staircase widget (rows k = 0..n) and the list, cancels a running raise, clamps the selected step to 0..n. Output `roots-n-out` shows the value. |
| `roots-c-re`, `roots-c-im` | `input[type=number]` step `any` (`.field` > `label`) | "Re c", "Im c" | On `input`: when both fields parse to finite numbers, set c (clamped to \|c\| <= 100) and refit the c-plane. On `change`: if either is invalid, show `roots-c-error` and restore the last good values. While a field has focus it is not overwritten by drags. |
| `roots-c-error` | `p` (`aria-live="polite"`, empty when fine) | | "Type a number, like -16 or 0.5." or "That is a big number. Keeping \|c\| at 100 or less so the picture stays readable." |
| `roots-readout` | `div.readout` | | Plain text, format in 2.7. Not a live region. |
| `roots-status` | `div.sr-only` `role="status"` | | Spoken summary after a preset, n change, typed c, selection or raise (debounced 400 ms). |
| `roots-plane` (plane) | `createPlane` | aria-label "The complex number c" | Hosts handle `roots-plane-c` (see 2.4). |
| `roots-plane-c` | plane handle (button), green `--input`, label "c" | aria-label "c: <cart>; \|c\| = <r>, Arg c = <angle>. Arrow keys move it, Shift moves 10 times as far." | Drag, arrow keys (step 0.1, Shift x10, Alt /10). |
| `roots-zplane` (plane) | `createPlane`, no zoom buttons | aria-label "The n-th roots of c" | Hosts handles `roots-zplane-r0` .. `roots-zplane-r11`. |
| `roots-zplane-r<k>` | non-draggable plane handle (button), purple `--output` | aria-label "Root k of n, from step k = k: <cart>. Press Enter to select it." | Click, tap or Enter/Space selects step k. Handles with k >= n are hidden. |
| `roots-stairs` (staircase widget) | `createStaircase` in `roots-stairs-host` | "Names of the angle arg c" (widget) | Rows k = 0..n, each a button; Arrow Up/Down/Home/End move focus; click or Enter selects step k (k = n is the ghost step). |
| `roots-list` | `ol.rt-list` | "The n roots" (`aria-label`) | One `li#roots-root-<k>` (k = 0..n-1) holding `button#roots-pick-<k>` (`aria-pressed`). Click selects step k. |
| `roots-wrap-note` | `p` | | Why the list stops at n - 1 (2.6). |
| `roots-primitive-note` | `p` | | c = 1: what primitive means. c not 1: "Primitive roots are defined for c = 1 (the roots of unity). Click the c = 1 chip to see them." Never inside the list. |
| `roots-zero-note` | `p` | | Only when c = 0 (2.6). |
| `roots-pick-note` | `p` | | What the selected step gives (templates in 2.6). |
| `roots-raise` | `button.btn` with `data-state` = idle / playing / stepping / done | "Raise root k to the power n" | Animation or stepper, see 5.7. |
| `roots-raise-readout` | `div.readout` | | Text in 2.7. |
| `roots-ex` (explainer) | `createExplainer`, rows `eq` `length` `angle` `point`, footer `roots-ex-same` | | Cell ids `roots-ex-<row>-cart` / `-polar`. |
| `roots-quadratic` | `section.panel` | "1.4.3 The quadratic formula hides a square root" | |
| `roots-qa`, `roots-qb`, `roots-qc` | `input[type=number]` step `any` | "a", "b", "c" (hint: "for a z^2 + b z + c = 0") | `input` and `change` both recompute. Defaults 1, -4, 13. Empty or non-numeric: `roots-quadratic-error` "Type numbers for a, b and c." and the last good result stays. a = 0: readout says "a = 0: not a quadratic (the equation is linear)". |
| `roots-quadratic-readout` | `div.readout` | | `(z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i` |
| `roots-quadratic-story` | `p` | | Sentence built from the numbers (2.6). |
| `roots-qplane` (plane, static) | `createPlane` `interactive: false` | aria-label "Square roots of d, slid by h" | No handles. |
| `roots-qex` (explainer) | rows `disc` `sqrt` `roots`, footer `roots-qex-same` | | |
| `roots-quadratic-load` | `button.btn` | "Show the square roots of d in the big picture" | Sets c = d and n = 2 in the main picture (clamped), selects step 0, announces it; the quadratic panel keeps its inputs. |

DOM shapes (shell classes, no restyling): chips are `div.chips[role="group"][aria-label="Presets"] > button.chip[type="button"][aria-pressed]`; a slider row is
`div.slider-row > label[for], input[type="range"], output[for]`; a number field is `div.field > label[for], input.num[type="number"][step="any"]` inside `div.rt-fields`
(no `inputmode`: the iOS decimal pad has no minus sign, and the plain number pad does); a readout is `div.readout`; every panel is `section.panel` with an `h2.panel-title`; the status regions are `div.sr-only[role="status"]`.
The staircase widget and the explainer each get an empty `div` host (`roots-stairs-host`, `roots-ex-host`, `roots-qex-host`, and `principal-root-stairs-host`, `principal-root-ex-host`).

### 2.4 Pointer, touch and keyboard, `roots`

- **Drag c** (mouse, pen, finger): the handle is the plane's draggable point, so pointer capture, the 10 px inset and touch
  handling are the plane's. Every `onDrag` call updates all text and both planes synchronously (5.3). On release
  (`final: true`, `source: 'pointer'`) c is snapped (5.6). The c-plane view is not refit during or after a drag.
- **Keyboard on c**: arrow keys move c by 0.1 (Shift 1, Alt 0.01). `source: 'keyboard'` is never snapped.
- **Select a root**: click, tap, Enter or Space on a root dot (`roots-zplane-r<k>`), on a staircase row, or on a list button. All
  three call `select(k)`. Tab order: presets, n slider, Re c, Im c, c-plane (the plane itself, then its zoom buttons, then `roots-plane-c`),
  root plane (plane, buttons, then root dots r0..r(n-1)), staircase rows (roving: one tab stop), list buttons, raise button,
  explainer (not focusable), quadratic inputs, the load button, links.
- **Planes**: the wheel zooms only when the plane has focus or Ctrl/Cmd is held (plane default `wheel: 'focus'`), two-finger
  pan and pinch on touch, `+` `-` `0` and arrows on a focused plane. The c-plane has the three zoom buttons (Reset returns to the last fitted view); the root planes (`roots-zplane`, `principal-root-plane`) have none, because in the prototype they covered the root labels near the top right corner. A user pan or zoom
  turns that plane's autofit off until the next preset, typed value or Reset (5.2).
- **Escape** during a handle drag cancels it (the plane does this).
- No window or document listeners are needed; nothing is attached outside `el`.

### 2.5 Controls, `principal-root`

| Id | Element | Visible label | Behaviour |
|---|---|---|---|
| `principal-root-preset-2i` | `button.chip` | "w = 2i, n = 2" | Loads w = 2i, n = 2 (2.2.2), selected step 1. |
| `principal-root-preset-m1` | `button.chip` | "w = -1, n = 2" | w sits on the seam: Arg w = pi, principal root i. |
| `principal-root-preset-m1cube` | `button.chip` | "w = -1, n = 3" | The principal cube root of -1 is not -1. |
| `principal-root-n` | `input[type=range]` min 2, max 6, step 1 | "n (which root)" | Live. Rebuilds the staircase (rows k = 0..n-1), clamps the selected step, cancels a running sweep trace. Output `principal-root-n-out`. |
| `principal-root-w-re`, `principal-root-w-im` | `input[type=number]` | "Re w", "Im w" | As `roots-c-re`/`-im`; clamp \|w\| <= 40; error `principal-root-w-error`. |
| `principal-root-readout` | `div.readout` | | Format in 2.7. |
| `principal-root-status` | `div.sr-only` `role="status"` | | Spoken summary (debounced 400 ms). |
| `principal-root-plane` (plane) | `createPlane`, no zoom buttons | aria-label "The number w and its n-th roots" | Hosts handles `w` and `r0` .. `r5`. |
| `principal-root-plane-w` | draggable handle, green `--input`, label "w" | aria-label "w: <cart>; \|w\| = <r>, Arg w = <angle>. Arrow keys move it." | Drag, arrow keys 0.1 (Shift x10, Alt /10). |
| `principal-root-plane-r<k>` | non-draggable handles, k = 0..5 (k >= n hidden); r0 solid purple, label "principal"; r1.. ghost (class `rt-ghost`, dot at 50% opacity) | aria-label "Principal root: <cart>" / "Root from step k = <k>: <cart>. Press Enter to select it." | Click, tap or Enter selects step k (k = 0 selects the principal root). |
| `principal-root-stairs` (staircase widget) | `createStaircase` in `principal-root-stairs-host`, rows k = 0..n-1 | | Click selects step k. |
| `principal-root-pick-note` | `p` | | Text in 2.6. |
| `principal-root-trap` | `div.callout` | | Only when w is a negative real number and n is odd (2.6). |
| `principal-root-sweep` | `button.btn` with `data-state` = idle / playing / stepping | "Sweep w once around the origin" | 5.11. |
| `principal-root-sweep-readout` | `p` (`aria-live="polite"`) | | "No jump yet. ..." until a seam crossing, then "The root jumps at Arg w = pi: ..." (2.7). Contains the word `jumps` only after a crossing. |
| `principal-root-ex` (explainer) | rows `w` `eq` `length` `angle` `other`, footer `principal-root-ex-same` | | Cell ids `principal-root-ex-<row>-cart` / `-polar`. |

Interaction as for `roots`: drag w (green) or move it with arrows; click a root dot or a staircase row to select its step. Starting a
drag of w while a sweep plays stops the sweep at the current position.

### 2.6 Copy deck (exact strings unless a template is shown)

Templates use `${...}` with the helpers named in 4.3. `A(x)` is `fmtAngle(x)` (ASCII pi), `Z(x)` is `fmtCart(x)`, `N(x)` is `fmtNum(x)`.

**roots**

| Where | Text |
|---|---|
| h1 | Roots: Divide the Staircase |
| lede (`p.station-lede`) | A number c has a whole staircase of angles: Arg c, Arg c + 2π, Arg c + 4π, and so on. To find its n-th roots, divide every step by n. The first n steps land on n different points. Step n lands on step 0 again, so the roots stop there. |
| try list `roots-try` (title "Three things to try") | 1. Drag c once around the origin. The roots turn too, but only 1/n as fast. 2. Click root k = 2. It has two names for its direction: the angle from its step, and its own Arg. They differ by a whole number of turns. 3. Press "Raise". The root spirals out and lands on c. Roots from higher steps wind around more times first. |
| controls title | Pick c and n |
| c panel title / caption (`roots-c-caption`) | c, the number you give / Drag c. The point is drawn once. The solid arc is Arg c. The faint arcs are the other angles in arg c: Arg c + 2π, Arg c + 4π, and so on. The dashed grey ray is the seam, where Arg jumps from π to −π. |
| root panel title / caption (`roots-z-caption`) | The n roots of c / Each ray is one step of the staircase divided by n. The numbers are k. The dashed ray is step n, which is step 0 again, so root 0 is labelled with both. Click a root to look at it. |
| divide panel title; column titles | Divide the staircase; The steps of arg c / ...divided by n: the roots |
| links | "What is arg z, and what is Arg z? The Staircase" (`#staircase`); "Step 0 gives the principal root. Principal Roots" (`#principal-root`) |
| `roots-wrap-note` | `Step ${n} gives (Arg c + ${2*n}pi)/${n} = Arg c/${n} + 2pi, the same ray as step 0. That is why there are exactly ${n} roots.` |
| `roots-primitive-note`, c = 1 | `A root is primitive when the smallest power m with z^m = 1 is m = ${n}. Order d means z^d = 1 first happens at d. There are ${count} primitive roots.` |
| `roots-zero-note` | c = 0: every n-th root of 0 is 0, and 0 has no angle, so there is no staircase to divide. Move c away from 0. |
| `roots-pick-note`, k = 0 | `Step k = 0 is the home step of c. It gives the angle ${A(raw)} and lands on ${Z(z)}. This root is the principal root of c; as a point its Arg is ${A(argPoint)}.` |
| k in 1..n-1, no wrap (raw equals Arg of the point) | `Step k = ${k} gives the angle ${A(raw)} and lands on ${Z(z)}. As a point this root has Arg ${A(argPoint)}: the name from step ${k} is also its home step.` |
| k in 1..n-1, wrap | `Step k = ${k} gives the angle ${A(raw)} and lands on ${Z(z)}. As a point this root has Arg ${A(argPoint)}. So ${A(raw)} and ${A(argPoint)} are two names for one direction: ${A(raw)} is one of the angles in arg z, ${A(argPoint)} is Arg z.` |
| k = n | `Step k = ${n} gives the angle ${A(raw)}, which is ${A(argPoint0)} + 2pi: the same direction as step 0. It lands on ${Z(z0)} again, so there is no new root.` |
| explainer heading `roots-ex-heading` | `Both addresses, for step k = ${k}` |
| raise button label | `Raise root ${j} to the power ${n}` (j = k mod n); reduced motion: `Next power` (after the last power: `Start again`) |
| `roots-raise-readout`, initial | Pick a step, then raise its root to the power n to see it land on c. |
| during or after (power m) | `z^${m} = ${Z(p_m)} (length ${N(rho^m)}, angle ${A(m*raw)})` ; when m = n append ` = c`; when c = 1 and m = n append `. This root has order ${order}: z^${order} = 1 first.` |
| quadratic lede | Complete the square and the quadratic turns into a square root. That is the same staircase machine with n = 2, then a slide. |
| `roots-quadratic-story`, d < 0 | `Completing the square: ${shift}^2 = ${N(d)}. So ${zMinus} is a square root of ${N(d)}. Those are ${Z(s)} and ${Z(-s)}: two points on the circle of radius ${N(\|s\|)}. ${tail}` |
| story, d > 0 | `Completing the square: ${shift}^2 = ${N(d)}. So ${zMinus} is one of the two square roots of ${N(d)}: ${Z(s)} and ${Z(-s)}, two real numbers. ${tail}` |
| story, d = 0 | `Completing the square: ${shift}^2 = 0. So ${zMinus} = 0 and there is only one root, ${Z(r1)}, counted twice.` |
| story helpers | `shift` as in the readout (`(z - 2)`, `(z + 1)` or `z`); `zMinus` is `z - 2`, `z + 1` or `z` (the expression whose square is d); `tail` is `Slide them right by ${N(h)} to get ${Z(r1)} and ${Z(r2)}.` for h > 0, `Slide them left by ${N(-h)} to get ${Z(r1)} and ${Z(r2)}.` for h < 0, and `They are the roots.` for h = 0; `Z(-s)` negates both parts and prints no `-0` |
| quadratic plane caption | Hollow dots: the square roots of d. Dashed arrows: the slide by h. Filled dots: the roots of the quadratic. |
| loaded status | `The big picture now shows the square roots of ${N(d)}.` |

**principal-root**

| Where | Text |
|---|---|
| h1 | Principal Roots: Stand on the Home Step |
| lede | Every number w has n n-th roots, one for each step of its staircase. The principal root uses only the home step: Arg w, the angle in (−π, π]. Drag w. The solid dot is the principal root. The faint dots come from the other steps. Sweep w once around the origin and watch the solid dot jump when w crosses the seam. |
| controls title | Pick w and n |
| plane panel title / caption | w and its roots / Drag w. Solid dot: the principal root, made from Arg w only. Faint dots: the other roots, from the steps above it. Dashed grey ray: the seam, the negative real axis, where Arg w jumps from π to −π. |
| staircase panel title | The steps of arg w |
| `principal-root-pick-note`, k = 0 | `The principal root comes from step k = 0, the home step: angle Arg w / ${n} = ${A(Arg/n)}. It lands on ${Z(P)}.` |
| k >= 1 | `This root comes from step k = ${k}: the angle is (Arg w + ${2*k}pi)/${n} = ${A(raw)}. It lands on ${Z(z)}. It is a root of w, but it is not the principal root.` |
| trap (negative real w, n odd), `principal-root-trap` | `${Z(w)} is a negative real number and n = ${n} is odd, so it has a real root, ${N(-rho)}. That root is not the principal one. The principal root uses Arg w = pi and lands at angle pi/${n}: ${Z(P)}.` |
| sweep panel title; text | Sweep w once around; w goes once around the circle \|w\| = ${N(\|w\|)}. The principal root goes ${n === 2 ? 'half a turn' : '1/' + n + ' of a turn'} and then jumps back, because Arg w drops from π to −π at the seam. |
| sweep button | idle `Sweep w once around the origin`; playing `Stop the sweep`; reduced motion `Step w around (${i} of 12)` with i the next step (after 12: `Sweep again`) |
| sweep readout, before a crossing | `No jump yet. Sweep w once around, or drag it across the negative real axis.` |
| while playing, before a crossing | `Sweeping. The root turns at 1/${n} of the speed of w. No jump yet.` |
| after a crossing | `The root jumps at Arg w = pi: its angle went from ${A(from)} to ${A(to)} (a jump of ${N(2*rho*sin(pi/n))}). Crossings so far: ${count}.` |
| w = 0 | `w = 0: every n-th root of 0 is 0, and 0 has no angle. Move w away from 0.` (sweep disabled) |
| explainer heading | Both addresses |
| invalid number | `Type a number, like 2 or -0.5.` / `That is a big number. Keeping \|w\| at 40 or less so the picture stays readable.` |

Status announcements (`*-status`): after a preset, n change or typed value, roots: `${n} roots of ${Z(c)}: each ${N(rho)} from 0, ${N(360/n, 1)} degrees apart.` (`c is 0: every root is 0.` for 0); principal-root: `Principal root of ${Z(w)} for n = ${n}: ${Z(P)}.` On selection the pick note text; after the raise, the final raise readout; after the quadratic changes, `Roots: ${Z(r1)}, ${Z(r2)}.`

### 2.7 Readout formats (scripts assert on these; ASCII, 3 decimals)

```
roots-readout            c = ${Z(c)}; n = ${n}; |c|^(1/n) = ${N(rho)}; Arg c = ${A(Theta)}; roots at (Arg c + 2pi k)/n; k = 0..${n-1}
   (c = 0)               c = 0; n = ${n}; every root is 0 and Arg c is not defined
roots-list li text       k = ${k}: ${polar} = ${cart} (Arg ${A(argPoint)})     then badges (c = 1 only): "primitive" and "order ${d}", or just "order ${d}"
   polar                 ${R} e^(i ${A(raw)})   with R = N(rho); a coefficient "1" is dropped; a negative angle is written e^(-i ...); angle 0 is written e^(i 0)
roots-quadratic-readout  ${shift}^2 = ${N(d)}; sqrt: +-${Z(s)}; roots: ${Z(r1)}, ${Z(r2)}     e.g. (z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i
   shift                 h > 0: (z - ${N(h)})   h < 0: (z + ${N(-h)})   h = 0: z        then "^2" is appended, so h = 0 reads "z^2 = ..."
   d = 0                 ...; sqrt: 0; roots: ${Z(r1)}, ${Z(r2)}
   a = 0                 a = 0: not a quadratic (the equation is linear)
principal-root-readout   w = ${Z(w)}; n = ${n}; |w| = ${N(|w|)}; Arg w = ${N(Theta)} (${A(Theta)}); w^(1/n) = ${polar} = ${Z(P)}
   (Theta has no exact form)   Arg w = 0.785   (the parenthesis is dropped when A(Theta) equals N(Theta))
   (w = 0)               w = 0; n = ${n}; every root is 0 and Arg w is not defined
```

In `roots-readout` and `principal-root-readout` the letter `n` inside `(1/n)` is literal, as in ARCHITECTURE 9 and the acceptance
text. `N` is `fmtNum` with 3 digits, so `|c|^(1/n) = 2` for 16^(1/4).

### 2.8 Empty, loading and error states

| State | What the student sees |
|---|---|
| Loading | The router shows its own "Loading..." line if the station module takes more than 150 ms to import. The station itself does no asynchronous work: when `mount` returns, every readout, list, staircase, explainer and plane is already filled (the explainer renders its first update synchronously, so its table is never empty). The planes size themselves on the first frame. |
| Empty: c = 0 or w = 0 | Messages in 2.6 and 8.1: no staircase, no roots on the plane, explainer cells show an em dash and the footer says "not checked". The controls keep working. |
| Empty: raise or sweep not started | `roots-raise-readout` says "Pick a step, then raise its root to the power n to see it land on c."; `principal-root-sweep-readout` says "No jump yet. ..." |
| Error: bad typed number | The field gets `aria-invalid="true"` and the sentence in 2.3 or 2.5 appears in the error line; the last good value stays on the planes; the field is restored on `change`. |
| Error: bad quadratic input or a = 0 | `roots-quadratic-error` (not numbers) or the readout line "a = 0: not a quadratic (the equation is linear)"; the last good plane stays (not numbers) or is emptied (a = 0). |
| Error: canvas drawing fails or is blocked | The plane's own note ("Part of this picture could not be drawn. The numbers beside it are still right." or its no-canvas note); everything else is unaffected. |
| Error: KaTeX missing or a TeX string rejected | The cell shows the TeX source (`tex-error`) instead of a red page; with the unit test of 7.0 case 8 this cannot ship. |
| Error: the module itself fails to load | The router's "This station is under construction." panel (shell behaviour). |

---

## 3. Visual encoding

Everything is drawn from tokens (`css/theme.css`): canvas code reads them at draw time through `cssColor('--token')` (exported by
`plane.js`) and the plane redraws itself on `themechange`; the explainer, the staircase widget and the injected CSS use `var(--token)`
and re-tint on their own. The station adds no theme listener. Both themes are checked by screenshot (`--dark`).

### 3.1 The colour code in these two stations

| Thing | Token | Shape cue (colour is never the only cue) |
|---|---|---|
| c (roots) and w (principal-root), the number you drag | `--input` (green) | filled dot with a halo, bold label "c" or "w", draggable |
| the roots, the answers | `--output` (purple) | filled dots; roots-plane dots are numbered k; principal-root ghosts at 50% opacity and smaller |
| ray from 0 to a root; circle r = \|c\|^(1/n); the n-gon; arcs; the staircase rows | `--polar` (orange) | solid ray, solid circle (alpha 0.9), dashed n-gon (alpha 0.35), solid arc for Arg and faint arcs for arg |
| drop lines and the labels "x = ...", "y = ..." of c, w and the selected root; the slide arrows in the quadratic plane | `--cart` (blue) | dashed |
| `arg` as a set | `--polar` at `--ghost-alpha` (plane cap 0.35) | extra windings with arrowheads and "also ..." labels; the staircase list |
| `Arg` the one chosen step | `--polar` solid | solid arc with arrowhead, label "Arg c = ..."; the highlighted k = 0 row with the "Arg c =" prefix |
| the seam | `--seam` | dashed grey ray along the negative real axis with the word "seam" |
| selected root | `--text` | thick ring (3 px, radius 15 px) around the dot, and the row in the list outlined in `--polar` |
| primitive roots (c = 1) | `--text` | thin ring (1.5 px, radius 11 px) and the text badge "primitive" |
| the step n ray | `--polar` | dashed, width 2.5, alpha 0.7, runs to 1.4 x the radius (the plane clips it at its edge) so it clearly sticks out past root 0; a dashed ring on root 0; root 0's label reads "k = 0, n" (for example "k = 0, 4"), so both steps are named where they land |
| time (raise spiral, sweep paths) | base colour mixed toward `--t0` (start) and `--t1` (end) by `plane.addCurve` (`ramp: true`) | dark to bright, quarter dots and an arrowhead (plane), cursor ring at the clock position; the raise adds a dot at every whole power |
| list line, polar part | `--polar` text (class `rt-polar`) | the form "e^(i ...)" |
| list line, Cartesian part | `--cart` text (class `rt-cart`) | the form "x + iy" |
| explainer cells | `cart()` / `polar()` tints at render time | column headings and "easy in Polar" badges (explainer) |
| quadratic plane: square roots of d | stroke `--polar` 2 px, fill `--surface` (hollow) | hollow dots |
| quadratic plane: the roots | `--output` filled | filled dots with their Cartesian label |
| quadratic plane: circle of radius \|s\| | `--polar` dashed | dashed circle |

Input versus output follows the key in the footer ("green is what you drag, purple is what comes out"). The planes are not labelled z-plane
and w-plane in these two stations: the question runs "given c, find the roots", so the given number is on the left or top and the answers
are on the right or below (a deliberate difference from the mapping stations, where z is left).

### 3.2 What is drawn, by layer (back to front)

`roots-plane` (the c-plane): one layer A (order 10) holding items 2 and 3, then the curve (order 40), then the markers layer B (order 50):

1. plane grid (`cart`, faint) and axes (plane).
2. seam (`drawSeam(ctx, plane, Math.PI, { label: false })`: dashed and grey; the word is left off because it landed on the tick labels, and `roots-c-caption` names it).
3. `drawCartAddress(ctx, plane, c)` and `drawPolarAddress(ctx, plane, c, { ghosts: Math.min(n, 6), name: 'c' })`: the ray 0 to c, the solid arc "Arg c = ...", faint windings "also ...". Omitted when c = 0.
4. the raise spiral: a plane curve `raise` (`addCurve`, order 40, base `--polar`, ramp, arrow, width 2.5, cursor at the tip) and the power markers layer (order 50: a dot of radius 4 in `--polar` at every whole power reached, label `z`, `z^2`, ..., and `z^n = c` at the last).
5. DOM handle `roots-plane-c` on top (the plane draws handles last).

`roots-zplane` (the root plane), all of it one layer (order 10) drawn in this order:

1. grid and axes.
2. seam.
3. circle of radius rho around 0 (`drawCircle`, `--polar`, width 2, alpha 0.9). It has no label of its own: the selected root's ray carries "r = 2".
4. the n-gon: dashed segments between consecutive roots (alpha 0.35).
5. the step-n ghost ray and the dashed ring on root 0.
6. rays 0 to root k for k = 0..n-1 (solid, width 2; the selected one width 3.5).
7. primitive rings (c = 1 only) and the selected ring.
8. `drawCartAddress` and `drawPolarAddress(..., { ghosts: 1, ghostsNeg: 1, name: 'z' + subscript(j) })` of the selected root: drop lines, home-step arc "Arg z2 = -3pi/4" (unicode in the plane), and the two neighbouring windings, so the name from the selected step appears as "also 5pi/4".
9. DOM handles `roots-zplane-r<k>` on top. Their labels are the handles' own DOM labels (the plane flips a label to the free side near an edge): `k = 3` for n <= 6 and `3` for larger n; root 0 reads `k = 0, 4` (n <= 6) or `0, 12`. The station rewrites the label text in `update` (5.3 step 3). There are no zoom buttons on this plane (`controls: false`): in the prototype they covered the labels of the roots near the top right corner.

`roots-qplane` (static): grid and axes; circle of radius |s| around 0 (`--polar`, dashed); hollow dots at s and -s; `drawSegment(..., { arrow: true, dash: DASH.cart, color: '--cart' })` from each to its slid copy (only when h is not 0), the label "slide by 2" on the first arrow; filled `--output` dots at the roots with labels "2 + 3i" and "2 - 3i" (`drawDot`).

`principal-root-plane`, back to front (items 1 to 6 are one layer, order 10; the sweep curves are plane curves, order 45; the handles are DOM):

1. grid and axes; the seam.
2. dashed circle |w| in `--input` (alpha 0.45, label "|w| = 2" at the bottom) and dashed circle rho in `--output` (alpha 0.45, label "|w|^(1/2) = 1.414", with the real n).
3. ghost rays 0 to each non-principal root (`--polar`, dashed, alpha 0.5, width 1.5); their labels ("k = 1", ...) are the ghost handles' DOM labels.
4. the principal ray 0 to P (`--polar`, solid, width 3) and its small arc (radius 16 px, `drawPolarAddress(ctx, plane, P, { color: '--polar', labels: false, arcRadiusPx: 16 })`) with the canvas label "angle Arg w / 2 = π/4" beside P (unicode pi, as in every canvas label).
5. `drawCartAddress(ctx, plane, w)` and `drawPolarAddress(ctx, plane, w, { ghosts: 2, ghostsNeg: 1, arcRadiusPx: 30, name: 'w' })`.
6. the selected-root ring (`--text`, 3 px, radius 15 px).
7. sweep trace curves (plane curves): `sweep-w` (base `--input`, ramp, dots, arrow) and `sweep-root-0..2` (base `--output`, ramp), only after a sweep has started and until w is dragged or n changes.
8. DOM handles on top: `principal-root-plane-w`, r0 (solid, radius 8, label "principal"), r1.. (ghost, radius 6).

### 3.3 Typography and sizes

Canvas text is drawn by the plane helpers (13 px, halo in `--surface`, placement avoids other labels). Station DOM text uses `var(--font)`; list text and
readouts use `var(--font-mono)` at 0.9 rem. Tap targets: buttons and chips 44 px (`--tap`); plane handles have a 32 px hit area (44 px on coarse pointers); at
n = 12 on a 326 px phone plane the neighbouring root handles are about 62 px apart, so the hit areas do not overlap.

### 3.4 Both themes

No literal colour appears in either station file except inside CSS fallbacks the widgets already carry. The ghost-ray alpha 0.7, n-gon alpha 0.35, and sweep
guide alpha 0.45 are alphas, not colours. Non-text contrast: the dashed and faint marks are secondary (each is also stated in words: the wrap note, the list, the labels); the
solid marks (rays, circle, dots, rings) take the token colours, which have at least 4.7:1 against `--surface` in both themes (see `i1-shell.md` 3.1).

---

## 4. Module API

### 4.0 Differences from `docs/ARCHITECTURE.md` (the design wins for this goal; the integrator should sync section 9)

1. **Two planes in `roots`.** ARCHITECTURE 9 names one plane `roots-plane` with handle `roots-plane-c`. |c| and |c|^(1/n) differ by a factor of 8 for 1.4.2
   (16 and 2), so one plane cannot show both legibly. This design keeps `roots-plane` and `roots-plane-c` exactly as named (the plane that holds c) and adds a
   second plane `roots-zplane` for the roots, with handles `roots-zplane-r0` .. `roots-zplane-r11`. The raise spiral (radii 2, 4, 8, 16) needs the c-scale plane anyway.
2. Extra controls and ids: `roots-c-re`, `roots-c-im`, `roots-c-error`, `roots-n-out`, `roots-status`, `roots-pick-note`, `roots-wrap-note`, `roots-primitive-note`,
   `roots-zero-note`, `roots-raise-readout`, `roots-quadratic-story`, `roots-quadratic-error`, `roots-quadratic-load`, `roots-qplane`, `roots-qex`, `roots-problem`;
   `principal-root-w-re`, `principal-root-w-im`, `principal-root-w-error`, `principal-root-n-out`, `principal-root-status`, `principal-root-pick-note`, `principal-root-trap`,
   `principal-root-problem`, presets `principal-root-preset-2i`, `-m1`, `-m1cube`. All ids ARCHITECTURE 9 names are kept.
3. `roots-readout` also carries `n = <n>` and `Arg c = <angle>` (the acceptance substrings `c = -16` and `|c|^(1/n) = 2` still appear); `principal-root-readout` also carries `n = <n>`.
4. The list line shows the Arg of the root as a point in parentheses and, for c = 1, the badges `primitive` and `order d` (non-primitive roots show only `order d`, never the word `primitive`, so counting `li` that contain "primitive" is exact).
5. Presets `-i` and `-2i` are fixed here: c = i with n = 3 and c = 2i with n = 2 (ARCHITECTURE left n open). Token presets: `#roots-unity`, `#roots-m16`, `#roots-i`, `#roots-2i`, `#roots-quadratic`; `#principal-root-sweep`, `#principal-root-2i`, `#principal-root-m1`, `#principal-root-m1cube`.
6. Test hooks `window.__mv.roots` and `window.__mv.principalRoot` are added (4.7); ARCHITECTURE 9 lists none for these stations.
7. No zoom buttons on the two root planes (`controls: false`): the prototype showed them covering the labels of roots near the top right corner. The c-plane keeps its buttons. Root labels are the plane handles' own DOM labels, not canvas text.
8. Wave-0 code versus ARCHITECTURE: no difference found in the exports this goal uses (checked: `createPlane`, `addPoint`, `addLayer`, `addCurve`, `setView`, `setHome`, the draw helpers, `createExplainer`, `createStaircase`, `seamJump`, `rootsOf`, `quadraticRoots`, `isPrimitiveRoot`, `fmtAngle`, `texNumber`, `texAngle`, `texCart`, `shapes.circle`, `mapping.pushForward`). Behaviour worth knowing, all verified in the source:
   - a non-draggable plane handle never calls `onDrag` and ignores pointerdown, so selection is a `click` listener on `handle.el` (Enter and Space produce `click` on a `<button>`);
   - `handle.set(z, { silent: true })` is required when a station repositions a handle from its own state (otherwise `onDrag` fires with `source: 'api'`);
   - the plane writes the handle `aria-label` before it calls `onDrag`, so overriding the label inside `onDrag` and straight after `set` wins;
   - the staircase widget shows the unicode pi, plane labels show the unicode pi, readouts show ASCII `pi`; this is expected;
   - `createStaircase` fixes `kMin` and `kMax` at creation, so a change of n destroys and rebuilds it;
   - `pushForward` of a full circle through a principal root returns 2 open pieces whose `t` ranges abut at the seam (verified: radius 2, n = 2, start angle pi/2 gives pieces t in [0, 0.25] and [0.25, 1], 53 and 152 points).

### 4.1 Imports (relative only)

`roots.js`
```js
import { Arg, abs as cabs, sub, add, mul, pow as cpow, sqrt as csqrt, fromPolar, rootsOf, isPrimitiveRoot, quadraticRoots, eq,
         fmtNum, fmtCart, fmtAngle, texNumber, texAngle, texCart } from '../core/complex.js';
import { createPlane, drawCircle, drawSegment, drawLabel, drawDot, drawSeam, drawCartAddress, drawPolarAddress,
         cssColor, niceGridStep, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { problemsForStation, problemById, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
```
`principal-root.js` imports the same list (minus `isPrimitiveRoot`, `quadraticRoots`, `csqrt`, `sub`, `add`, `mul`, `drawDot`) plus `principalRoot` from `complex.js`, `seamJump` from `staircase.js`, `circle` from
`../core/shapes.js` and `pushForward` from `../core/mapping.js`. Neither station imports three.js, `parse.js`, `domaincolor.js`, `store.js` or the other station: the two files are independent, so a failure in one cannot take down the other.
No module-level DOM access: both files import cleanly in Node (the unit test relies on it).

### 4.2 Exports of `roots.js`

```js
export const N_MIN = 2, N_MAX = 12, C_MAX = 100;
export const PRESETS;                                    // frozen: { '1': {c, n, label, problem:'1.4.1'}, 'm16': {...'1.4.2'}, 'i': {...}, '2i': {...} }  (5.1)
export function rootsModel(c, n)                         // pure; Model (4.4); n clamped to 2..12 and rounded; |c| < 1e-9 gives zero: true
export function rootLine(M, k)                           // pure; { k, text, polar, cart, argText, badges: string[], primitive: boolean, order: number | null }
export function rootsReadout(M)                          // pure; the string in 2.7
export function wrapNote(M), primitiveNote(M), pickNote(M, k)   // pure; copy in 2.6
export function quadraticModel(a, b, c)                  // pure; QModel (4.4)
export function quadraticReadout(Q), quadraticStory(Q)   // pure
export function rootsRows()                              // explainer rows; each cell function takes state = { M, k } and returns a TeX string, null, or { text }
export function rootsSame(state)                         // { cart: TeX, polar: TeX, agree: boolean | null }
export function quadRows(), quadSame(Q)                  // the same for the quadratic explainer; state = QModel
export function viewHalfWidths(M)                        // { c: Hc, z: Hz } (5.2)
export function ladderCeil(x, ladder)                    // first entry >= x (with 1e-12 slack), else the last
export function snapToGrid(z, step, tol)                 // each coordinate to the nearest multiple of step when within tol, rounded to 9 decimals
export function raiseSamples(M, k, tEnd, perPower = 32)  // [{ re, im, t, s }]: s from 1 to tEnd; t = (s - 1)/(n - 1) in [0, 1]; point = rho^s e^(i s raw_k)
export function raiseDurationMs(n)                       // clamp(1200 + 700 (n - 1), 2000, 6000)
export function texSlash(theta)                          // texAngle with \frac{p}{q} written p/q, for angles in exponents (5.9)
export function texExp(rho, theta)                       // TeX of rho e^(i theta) keeping the raw angle, exponent in slash form (5.9)
export function polarText(rho, theta)                    // ASCII of the same (2.7)
export function mount(el, ctx)                           // -> unmount; may be sync
```

### 4.3 Exports of `principal-root.js`

```js
export const N_MIN = 2, N_MAX = 6, W_MAX = 40, SWEEP_MS = 5000, SWEEP_STEPS = 12;
export const PRESETS;                                    // { '2i': {w, n:2, sel:1, label, problem:'2.2.2'}, 'm1': {w:-1, n:2, sel:1}, 'm1cube': {w:-1, n:3, sel:1} }
export function principalModel(w, n)                     // pure; PModel (4.4); n clamped to 2..6; |w| < 1e-9 gives zero: true
export function principalReadout(P), pickNote(P, k), trapNote(P)   // pure strings; trapNote returns '' when it does not apply
export function jumpReadout({ n, rho, count, dir })      // pure; the "The root jumps at Arg w = pi: ..." sentence (2.6)
export function sweepTrace(radius, phi0, n, N = 48)      // pure; [{ i, u, w, arg, root }] for i = 0..N, angle phi0 + 2 pi i/N, root = principalRoot(w, n)
export function principalRows(), principalSame(state)    // explainer rows and footer; state = { P, k }
export function viewHalfWidth(P)                         // ladderCeil(1.3 * max(|w|, rho, 1), [2, 3.2, 5, 8, 13, 20, 32, 52])
export function ladderCeil, snapToGrid, texSlash, texExp, polarText   // identical specs and behaviour to roots.js (the unit test compares them)
export function mount(el, ctx)
```

### 4.4 Data structures

```js
// roots Model
{ c, n, zero, mod, rho, Theta,                 // Theta = Arg c (null when zero); rho = mod^(1/n) (0 when zero)
  roots: [{re, im}],                           // length n: rootsOf(c, n) (n zeros when zero)
  steps: [{ k, j, raw, point, argPoint, ghost }],   // k = 0..n: j = k % n, raw = (Theta + 2 pi k)/n (null when zero), point = roots[j],
                                               //   argPoint = Arg(roots[j]) (null when zero), ghost = (k === n)
  isOne,                                       // |c - 1| < 1e-9
  primitive: boolean[], order: (number | null)[], primitiveCount }      // length n; primitive[k] = isOne && isPrimitiveRoot(k, n); order[k] = isOne ? n / gcd(k, n) : null (gcd(0, n) = n so order 1)

// QModel
{ ok, reason,                                  // reason 'a-zero' | 'bad' when !ok
  a, b, c, disc, h, d, s,                      // disc = b^2 - 4ac; h = -b/(2a) + 0; d = disc/(4a^2) + 0; s = csqrt(d) (principal, accepts a bare real)
  roots: [r1, r2],                             // quadraticRoots(a, b, c)  (the formula; a real number can come back as {re, im: 0})
  rootsOfD: [q1, q2],                          // rootsOf(d, 2): the square roots of d as the staircase machine gives them
  double }                                     // disc === 0

// principal-root PModel
{ w, n, zero, mod, rho, Theta, P,              // P = principalRoot(w, n)
  steps: [{ k, raw, point, argPoint }],        // k = 0..n-1, point = rootsOf(w, n)[k]
  jumpDistance,                                // 2 rho sin(pi/n)
  isNegReal, realRoot }                        // isNegReal: re < 0 and |im| <= 1e-12 mod; realRoot = -rho when isNegReal and n is odd, else null

// station state (module-private, one object per mount)
roots: { c, n, sel /* step 0..n */, quad: {a, b, c}, raise: { mode: 'idle'|'playing'|'stepping'|'done', t /* exponent 1..n */, m /* whole power in stepping mode */, k /* step it was started for */, startedAt },
         userView: { c: boolean, z: boolean }, fitted: { c: number, z: number } /* current half-widths; NaN until the first fit */ }
principal-root: { w, n, sel /* step 0..n-1 */, userView: boolean, fitted: number,
         sweep: { mode: 'idle'|'playing'|'stepping', u, phi0, radius, step /* 0..12 */, startedAt, trace: null | { wCurve, pieces } },
         lastArg: number | null, jumps: number, lastJump: { dir, n, rho } | null }
```

### 4.5 Events and wiring

No custom events and no `ctx.store` use (nothing needs to persist; the station must work with storage blocked). DOM listeners, all on elements the station created:

| Source | Event | Effect |
|---|---|---|
| preset chips | `click` | `applyPreset(key)` then `update('preset')` |
| `roots-n` / `principal-root-n` | `input` | set n; rebuild staircase and list; `update('n')` |
| `*-c-re` `*-c-im` / `*-w-re` `*-w-im` | `input`, `change` | `readComplexFields()`; valid: `setNumber(z, 'input')`; `change` with invalid: error text and restore |
| c handle / w handle | `onDragStart`, `onDrag(z, { final, source })` | `onDragStart`: stop raise or sweep. `onDrag`: clamp, `S.c = z`; on `final && source === 'pointer'` snap (5.6); `update('drag')` |
| root handles | `click` on `handle.el` | `select(k)` |
| staircase | `onPick(k)` | `select(k)` |
| list buttons | `click` | `select(k)` |
| `roots-raise` | `click` | `startRaise()` or `stepRaise()` (5.7) |
| `principal-root-sweep` | `click` | `startSweep()`, `stopSweep()` or `stepSweep()` (5.11) |
| quadratic inputs | `input`, `change` | `updateQuadratic()` |
| `roots-quadratic-load` | `click` | `setNumber(Q.d, 'load')`, n = 2 |
| each plane | `plane.on('viewchange', v)` | `pan` or `zoom`: `userView[...] = true`; `reset`: `userView[...] = false` and refit (5.2) |

### 4.6 Lifecycle

`mount(el, ctx)` (synchronous; returns `unmount`):
1. `ensureStyle()` injects `<style data-for="station-roots">` (or `station-principal-root`) once (4.8).
2. Read `ctx.preset` (5.1) to build the initial state; build the block elements (not yet attached).
3. Attach the blocks to `el` in the order of 2.1 (quadratic first for 1.4.3).
4. Create the planes, handles, layers, curves, staircase, explainers (each with the ids of section 2). Put every created object in a `disposables` array.
5. `update('mount')` once, synchronously (all text and the explainer are filled before the first frame; the explainer renders its first update synchronously).
6. Install `window.__mv.<hook>` (4.7). For token `sweep` call `startSweep()` in a `requestAnimationFrame` after mount.
7. Return `unmount`.

`unmount()` (idempotent, `destroyed = true` first so late callbacks return at once): `cancelAnimationFrame` for the raise or sweep loop; `clearTimeout` for the status debounce;
`plane.destroy()` for every plane; `explainer.destroy()` for every explainer; `staircase.destroy()`; `delete window.__mv.roots` (or `principalRoot`) only if it still points at this mount's hook object.
The station creates no window or document listeners, no observers and no timers other than the two above; the router empties `#view`, so DOM nodes need no manual removal.

### 4.7 Test hooks

```js
window.__mv.roots = {                     // never replace window.__mv (10.7); write const mv = (window.__mv = window.__mv || {}); mv.roots = ...
  state() -> { c: {re, im}, n, sel, rho, Theta, roots: [{re, im}], raw: number[] /* k = 0..n */, raise: { mode, m }, view: { c: Hc, z: Hz } },
  setC(re, im), setN(n), select(k), quadratic() -> QModel
}
window.__mv.principalRoot = {
  state() -> { w: {re, im}, n, sel, rho, Theta, root: {re, im}, jumps, sweep: { mode, u } },
  setW(re, im), setN(n), select(k)
}
```
The setters call exactly the same functions as the controls (`setNumber`, `setN`, `select`), so they are a shortcut for scripts, not a second code path.

### 4.8 Station CSS (injected once; tokens only; shared by both stations, class prefix `rt-`)

```css
.rt-two { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); }
.rt-two > * { min-width: 0; }
.rt-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-1); }
.rt-pick { display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .5rem; width: 100%; min-height: var(--tap);
  padding: .35rem .75rem; text-align: left; font: inherit; color: var(--text); background: var(--surface);
  border: 1.5px solid var(--border-strong); border-radius: var(--radius-sm); cursor: pointer; }
.rt-pick:hover { background: var(--surface-2); }
.rt-pick[aria-pressed="true"] { border-color: var(--polar); box-shadow: inset 0 0 0 2px var(--polar); background: var(--surface-2); }
.rt-pick:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.rt-text { font-family: var(--font-mono); font-size: .9rem; min-width: 0; overflow-wrap: anywhere; }
.rt-polar { color: var(--polar); }
.rt-cart { color: var(--cart); }
.rt-badges { display: inline-flex; flex-wrap: wrap; gap: .25rem; }
.plane-handle.rt-ghost .plane-handle-dot { opacity: .5; }
.plane-handle.rt-pickable { cursor: pointer; }
.rt-note { margin: 0; min-height: 1.4em; overflow-wrap: anywhere; }
.rt-try { margin: 0; padding-left: 1.25rem; }
.rt-fields { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-2) var(--space-3); }
.rt-quad { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); }
.rt-quad > * { min-width: 0; }
```
Panels, chips, slider rows, `.readout`, `.callout`, `.badge`, `.field`, `.btn` and `.station-links` come from `components.css` unchanged. Add `data-tone` on callouts and panels as the catalogue says
(`polar` for the problem callout of 1.4.1, 1.4.2 and 2.2.2, `cart` for 1.4.3).

### 4.9 Planes, handles and widgets created (exact options)

```js
createPlane(host, { id: 'roots-plane',  xRange: [-2, 2], yRange: [-2, 2], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true,
                    minUnitsAcross: 1, maxUnitsAcross: 400, aspect: 1, maxWidth: 520, wheel: 'focus', ariaLabel: 'The complex number c' })
createPlane(host, { id: 'roots-zplane', xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true, controls: false,
                    minUnitsAcross: 1, maxUnitsAcross: 100, aspect: 1, maxWidth: 520, wheel: 'focus', ariaLabel: 'The n-th roots of c' })
createPlane(host, { id: 'roots-qplane', grid: 'cart', interactive: false, aspect: 1, maxWidth: 360, ariaLabel: 'Square roots of d, slid by h' })
createPlane(host, { id: 'principal-root-plane', xRange: [-3.2, 3.2], yRange: [-3.2, 3.2], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'], interactive: true, controls: false,
                    minUnitsAcross: 1, maxUnitsAcross: 100, aspect: 1, maxWidth: 560, wheel: 'focus', ariaLabel: 'The number w and its n-th roots' })

cPlane.addPoint({ id: 'c', z: S.c, color: '--input', label: 'c', radius: 8, step: 0.1, name: 'c', onDragStart, onDrag })            // principal-root: id 'w', label 'w'
zPlane.addPoint({ id: 'r' + k, z: ZERO, draggable: false, focusable: true, color: '--output', radius: 7, label: 'k', name: 'root ' + k })    // k = 0..11; label text rewritten in update
plane.addPoint({ id: 'r' + k, z: ZERO, draggable: false, focusable: true, color: '--output', radius: k === 0 ? 8 : 6, label: k === 0 ? 'principal' : 'k', name: 'root ' + k })   // principal-root, k = 0..5

createStaircase(host, { id: 'roots-stairs', kMin: 0, kMax: S.n, label: 'arg c', onPick: select })                  // principal-root: id 'principal-root-stairs', kMax: S.n - 1, label 'arg w'
createExplainer(host, { id: 'roots-ex', rows: rootsRows(), same: rootsSame })                                      // 'roots-qex' with quadRows(), quadSame; 'principal-root-ex' with principalRows(), principalSame
```
The first view of each plane is replaced at once by `setHalf` (5.2); the `xRange` and `yRange` above only fix the aspect ratio and a sane start. Layers and curves are added as in 3.2 and 5.4.
All three planes created in `roots` and the one in `principal-root` register themselves in `window.__mv.planes` under these ids (the interaction scripts and `tests/interact/_helpers.mjs` rely on it).

---

## 5. Algorithms

Conventions: `Z` = `fmtCart`, `N` = `fmtNum`, `A` = `fmtAngle` (ASCII), `clamp(v, lo, hi)`, `ZERO = {re: 0, im: 0}`, `sub(k)` maps the digits of k to the unicode subscripts
(0x2080 + digit), `setText(el, s)` writes `el.textContent = s` only when it differs (so a drag does not rewrite 40 unchanged nodes). Redraws are never called directly:
state changes call `plane.requestDraw()`, which coalesces to one `requestAnimationFrame` repaint per plane.

### 5.1 Initial state from `ctx.preset`

```
PRESETS = { '1':   { c: {re: 1, im: 0},  n: 5, label: 'c = 1, n = 5',   problem: '1.4.1' },
            'm16': { c: {re: -16, im: 0}, n: 4, label: 'c = -16, n = 4', problem: '1.4.2' },
            'i':   { c: {re: 0, im: 1},  n: 3, label: 'c = i, n = 3',   problem: null },
            '2i':  { c: {re: 0, im: 2},  n: 2, label: 'c = 2i, n = 2',  problem: null } }          // inputs only: every root is computed by rootsOf

function initialState(preset):
  S = { c: { ...PRESETS['1'].c }, n: 5, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false, userView: { c: false, z: false }, fitted: { c: NaN, z: NaN }, raise: { mode: 'idle', t: 1, m: 1, k: 0 } }   // no preset = the first problem's state (1.4.1); state objects are copies, never the PRESETS objects
  key = null
  if preset.kind === 'problem': key = { '1.4.1': '1', '1.4.2': 'm16' }[preset.id]
       if preset.id === '1.4.3': S.quadFirst = true; S.c = { re: quadraticModel(1, -4, 13).d, im: 0 }; S.n = 2      // d = -9, the square roots of -9
  if preset.kind === 'token': key = { unity: '1', m16: 'm16', i: 'i', '2i': '2i' }[preset.token]
       if preset.token === 'quadratic': same as problem 1.4.3
  if key: S.c = { ...PRESETS[key].c }; S.n = PRESETS[key].n
  return S                                   // an unknown token falls through to the default; it is not an error
```
`principal-root`: default and problem 2.2.2 and token `2i` give `{ w: 2i, n: 2, sel: 1 }`; token `m1` gives `{ w: -1, n: 2, sel: 1 }`; `m1cube` gives `{ w: -1, n: 3, sel: 1 }`; token `sweep` gives the default and calls `startSweep()` after the first frame.

### 5.2 Views: fit, ladders, user pan and zoom

```
C_LADDER = [2, 3, 4, 6, 8, 12, 20, 32, 50, 80, 125];  Z_LADDER = [1.5, 2, 3, 4, 6, 8, 12, 16];  P_LADDER = [2, 3.2, 5, 8, 13, 20, 32, 52]
ladderCeil(x, L) = first v in L with v >= x - 1e-12, else the last
viewHalfWidths(M) = { c: ladderCeil(1.2 * max(M.mod, 1), C_LADDER), z: ladderCeil(1.3 * M.rho, Z_LADDER) }      // rho = 0 when zero, so 1.5
viewHalfWidth(P)  = ladderCeil(1.3 * max(P.mod, P.rho, 1), P_LADDER)

setHalf(plane, key, H):  plane.setView({ center: ZERO, unitsAcross: 2 * H });  plane.setHome();  fitted[key] = H     // 'set' reason, so it never counts as a user move
fitViews(source):
  { c: Hc, z: Hz } = viewHalfWidths(M)
  if (!userView.c && source !== 'drag' && Hc !== fitted.c) setHalf(cPlane, 'c', Hc)        // never move the plane the pointer is on
  if (!userView.z && Hz !== fitted.z)                      setHalf(zPlane, 'z', Hz)        // a ladder step of the other plane during a c drag is fine
plane.on('viewchange', v): 'pan' or 'zoom' -> userView[key] = true ; 'reset' -> userView[key] = false, fitted[key] = NaN, fitViews('reset')      // only the c-plane can emit 'reset' (the root planes have no buttons; the 0 key still resets them)
preset click, typed value, load button: userView = { c: false, z: false } before update(...);  a change of n: userView.z = false (the root plane has no Reset button, so a new n is its way back to the fitted view)
```
Tables (verified): c = -16, n = 4 gives (20, 3); c = 1, n = 5 gives (2, 1.5); c = 2i, n = 2 gives (3, 2); c = i, n = 3 gives (2, 1.5); c = -9, n = 2 gives (12, 4); c = 100, n = 2 gives (125, 16); c = 0 gives (2, 1.5);
principal-root: w = 2i, n = 2 gives 3.2; w = -1, n = 3 gives 2.

### 5.3 `update(source)` in `roots` (the one pipeline; `source` is one of mount, preset, n, input, load, drag, select)

```
 1  if destroyed: return.  M = rootsModel(S.c, S.n).  S.sel = clamp(S.sel, 0, S.n).
 2  c handle: if source !== 'drag': cHandle.set(M.c, { silent: true }).  Always: cHandle.el.setAttribute('aria-label', cLabel(M)).
 3  for k = 0..11: h = zHandles[k]
        if M.zero or k >= S.n: h.hidden = true
        else: h.hidden = false; h.set(M.roots[k], { silent: true }); h.el.setAttribute('aria-label', `Root ${k} of ${S.n}, from step k = ${k}: ${Z(M.roots[k])}. Press Enter to select it.`)
             h.el.querySelector('.plane-handle-label').textContent = k === 0 ? (S.n <= 6 ? `k = 0, ${S.n}` : `0, ${S.n}`) : (S.n <= 6 ? `k = ${k}` : `${k}`)
    if document.activeElement is a zHandle with k >= S.n: zHandles[S.n - 1].el.focus()
 4  fitViews(source)
 5  text: readout = rootsReadout(M); n output; chip aria-pressed (chip is pressed when eq(S.c, preset.c, 1e-9) && S.n === preset.n);
        wrap note, primitive note (visible rules in 2.6), zero note (shown only when M.zero), c fields (skip the focused one), problem callout
 6  list: if listN !== S.n rebuild the n li; for k in 0..n-1: line = rootLine(M, k); patch li#roots-root-<k> (text node pieces and badges); aria-pressed is true on the button k === S.sel % S.n (5.5)
        when M.zero: the ol is emptied and hidden
 7  staircase: if stairsN !== S.n: rebuildStairs() (destroy, createStaircase(host, { id: 'roots-stairs', kMin: 0, kMax: S.n, label: 'arg c', onPick: select }));
        stairs.update(M.zero ? null : M.Theta);  stairs.setPicked(M.zero ? null : S.sel)
 8  pick note = M.zero ? '' : pickNote(M, S.sel);  setText(heading, `Both addresses, for step k = ${S.sel}`);  explainer.update({ M, k: S.sel })
 9  raise button label and data-state (5.7)
10  cPlane.requestDraw();  zPlane.requestDraw()
11  if source in { preset, n, input, load, select }: announce(status text 2.6)       // debounced 400 ms, status.textContent = '' then the text
```
Cost per drag move: one `rootsModel` (at most 12 roots), 12 `handle.set`, text writes guarded by `setText`, at most 12 list patches, one staircase update (at most 13 rows), one coalesced explainer update, two coalesced redraws. The budget is under 4 ms of script on a 4x throttled CPU.

`rootsModel(c, n)`:
```
n = clamp(round(n), 2, 12); mod = cabs(c); zero = mod < 1e-9
if zero: roots = n copies of ZERO; Theta = null; rho = 0; steps = k 0..n with raw = null, point = ZERO, argPoint = null
else:    Theta = Arg(c); rho = Math.pow(mod, 1 / n); roots = rootsOf(c, n)
         steps[k] = { k, j: k % n, raw: (Theta + 2 * Math.PI * k) / n, point: roots[k % n], argPoint: Arg(roots[k % n]), ghost: k === n }     for k = 0..n
isOne = cabs(sub(c, {re: 1, im: 0})) < 1e-9
primitive[k] = isOne && isPrimitiveRoot(k, n);  order[k] = isOne ? n / gcd(k, n) : null;  primitiveCount = count of primitive
gcd(a, b): Euclid on absolute values; gcd(0, n) = n
```
`rootLine(M, k)` (the list line):
```
st = M.steps[k]; text = `k = ${k}: ${polarText(M.rho, st.raw)} = ${Z(st.point)} (Arg ${A(st.argPoint)})`
badges = M.isOne ? (M.primitive[k] ? ['primitive', `order ${M.order[k]}`] : [`order ${M.order[k]}`]) : []
polarText(rho, theta): R = N(rho); a = A(theta); neg = a starts with '-'; body = `e^(${neg ? '-' : ''}i ${neg ? a.slice(1) : a})`; return R === '1' ? body : `${R} ${body}`
DOM of the li: button.rt-pick > span.rt-text: text node `k = ${k}: `, span.rt-polar(polar), text node ` = `, span.rt-cart(Z), text node ` (Arg ...)` ; then span.rt-badges with one span.badge per badge ('primitive' gets data-tone="polar")
the li textContent therefore reads: "k = 2: 2 e^(i 5pi/4) = -1.414 - 1.414i (Arg -3pi/4)" followed by the badge words
```

### 5.4 Layers

Helpers (module-local):
```
ringPx(ctx, plane, z, rPx, { color, width, alpha = 1, dash = null }):   p = plane.toPixel(z); return if not finite
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = cssColor(color); ctx.lineWidth = width; ctx.setLineDash(dash || [])
    ctx.beginPath(); ctx.arc(p.x, p.y, rPx, 0, 2 * Math.PI); ctx.stroke(); ctx.restore()
segAlpha(ctx, plane, a, b, { color, width, alpha, dash }):   same pattern with moveTo / lineTo (drawSegment cannot take an alpha)
hollowDot(ctx, plane, z, rPx = 6):  fill cssColor('--surface'), stroke cssColor('--polar') 2 px
```
The drawing is organised as follows. `roots-plane`: layer A (`plane.addLayer(cLayerA, { order: 10 })`), the raise curve (`plane.addCurve`, order 40, created lazily, 5.7) and layer B for the raise markers (`addLayer`, order 50). `roots-zplane`: one layer (`zLayer`, order 10). `roots-qplane`: one layer. `principal-root-plane`: one layer (order 10) plus the sweep curves (`addCurve`, order 45, created lazily, 5.11). Each layer body follows the lists in 3.2 in that order:

```
cLayerA(ctx, plane):
  drawSeam(ctx, plane, Math.PI, { label: false })                // the c-plane seam has no word on it (it sat on the tick labels in the prototype); roots-c-caption names it
  if M.zero: return
  drawCartAddress(ctx, plane, M.c)
  drawPolarAddress(ctx, plane, M.c, { ghosts: Math.min(S.n, 6), name: 'c' })

zLayer(ctx, plane):
  drawSeam(ctx, plane, Math.PI, { label: 'seam' })
  if M.zero: drawDot(ctx, plane, ZERO, { color: '--output', radius: 5, label: '0: every root' }); return
  n = M.n; j = S.sel % n; roots = M.roots
  drawCircle(ctx, plane, ZERO, M.rho, { color: '--polar', width: 2, alpha: 0.9 })
  for k = 0..n-1 (only k = 0 when n = 2): segAlpha(roots[k], roots[(k + 1) % n], { color: '--polar', width: 1.5, alpha: 0.35, dash: DASH.guide })      // the n-gon
  tip = fromPolar(1.4 * M.rho, M.steps[n].raw)                                                                                                         // step n: same direction as step 0
  segAlpha(ZERO, tip, { color: '--polar', width: 2.5, alpha: 0.7, dash: DASH.guide });  ringPx(roots[0], 12, { color: '--polar', width: 1.5, alpha: 0.8, dash: DASH.guide })
  for k = 0..n-1: segAlpha(ZERO, roots[k], { color: '--polar', width: k === j ? 3.5 : 2, alpha: 1 })
  if M.isOne: for k with M.primitive[k]: ringPx(roots[k], 11, { color: '--text', width: 1.5 })
  ringPx(roots[j], 15, { color: '--text', width: 3 })
  drawCartAddress(ctx, plane, roots[j])
  drawPolarAddress(ctx, plane, roots[j], { ghosts: 1, ghostsNeg: n <= 6 ? 1 : 0, name: 'z' + sub(j) })     // one fewer line of text when n is large (n = 12 is crowded)
```
The selected root needs at most one positive winding to show its step name: raw is at most 2 pi + pi/n, so Arg = raw or raw - 2 pi, and the ghost "also 5pi/4" is exactly the name from the step.

`principal-root-plane` layer (order 10), top to bottom of 3.2 items 2 to 6, with `P = principalModel(S.w, S.n)`:
```
 drawSeam(ctx, plane, Math.PI, { label: 'seam' });  if P.zero: drawDot(ctx, plane, ZERO, { color: '--output', radius: 5, label: '0: every root' }); return
 drawCircle(ctx, plane, ZERO, P.mod, { color: '--input', width: 1.5, alpha: 0.45, dash: DASH.guide });   drawLabel(ctx, plane, { re: 0, im: -P.mod }, `|w| = ${N(P.mod)}`, { dx: 6, dy: 14, color: '--input' })
 drawCircle(ctx, plane, ZERO, P.rho, { color: '--output', width: 1.5, alpha: 0.45, dash: DASH.guide }); drawLabel(ctx, plane, { re: 0, im: -P.rho }, `|w|^(1/${P.n}) = ${N(P.rho)}`, { dx: 6, dy: 14, color: '--output' })
 for k = 1..n-1: segAlpha(ZERO, P.steps[k].point, { color: '--polar', width: 1.5, alpha: 0.5, dash: DASH.guide })
 segAlpha(ZERO, P.P, { color: '--polar', width: 3, alpha: 1 });  drawPolarAddress(ctx, plane, P.P, { labels: false, arcRadiusPx: 16 })
 drawLabel(ctx, plane, P.P, `angle Arg w / ${n} = ${fmtAngle(P.Theta / n, { unicode: true })}`, { color: '--polar', dx: 10, dy: 18 })
 drawCartAddress(ctx, plane, S.w);  drawPolarAddress(ctx, plane, S.w, { ghosts: 2, ghostsNeg: 1, arcRadiusPx: 30, name: 'w' })
 ringPx(P.steps[S.sel].point, 15, { color: '--text', width: 3 })
```
`roots-plane` layer B (raise markers), only when `S.raise.mode !== 'idle'`:
```
 raw = M.steps[S.raise.k].raw;  last = floor(S.raise.t + 1e-9)
 for m = 1..last: p = fromPolar(Math.pow(M.rho, m), m * raw); drawDot(ctx, plane, p, { color: '--polar', radius: 4, label: m === S.n ? `z^${m} = c` : m === 1 ? 'z' : `z^${m}`, labelOffset: { dx: 6, dy: -6 } })
```
A layer that throws is disabled by the plane and a note is shown; keep every layer pure (read state, draw, no writes).

### 5.5 Hit testing and selection

```
select(k):  k = clamp(Math.round(k), 0, S.n)                      // principal-root: clamp to 0..n-1
            if S.raise.mode !== 'idle' && S.raise.k !== k: cancelRaise()
            S.sel = k; update('select')
root dot:   zHandles[k].el.classList.add('rt-pickable'); zHandles[k].el.addEventListener('click', () => select(k))      // plane gives a 32 px hit area (44 px on coarse pointers) and focus ring; Enter and Space click a button
staircase:  onPick(k) -> select(k)               list:  button#roots-pick-k click -> select(k)
list aria-pressed: li k is pressed when k === S.sel % S.n, except when S.sel === S.n (the ghost step): then root 0 is pressed and the staircase row n is the picked row
```
Hit tests are done by the browser on the handle buttons; there is no pixel arithmetic in the station. At n = 12 neighbouring handles are at least 62 px apart on a phone (radius 120 px, chord 2 * 120 * sin(15 deg)).

### 5.6 Snap on release

```
onDrag(z, { final, source }):
  if |z| > C_MAX: z = scale(z, C_MAX / |z|)                      // roots; principal-root uses W_MAX
  if final && source === 'pointer':
      v = plane.getView();  z2 = snapToGrid(z, niceGridStep(v.unitsAcross), 6 / v.scale)
      if z2.re !== z.re || z2.im !== z.im: handle.set(z2, { silent: true }); z = z2
  S.c = z; update('drag')
snapToGrid(z, step, tol): f(v) = { m = Math.round(v / step) * step; return Math.abs(v - m) < tol ? Number(m.toFixed(9)) : v }; return { re: f(z.re), im: f(z.im) }
```
Snapping happens only on release (so a drag along a circle, as the interaction script does, is not bent) and never for keyboard moves. It is what lets a student land on c = 1 or w = 2i by dragging; the chips and the number fields are the exact routes.

### 5.7 The raise animation (roots)

```
raiseDurationMs(n) = clamp(1200 + 700 * (n - 1), 2000, 6000)                          // n = 4: 3300 ms; n = 12: 6000 ms
raiseSamples(M, k, tEnd, perPower = 32):
   raw = M.steps[k].raw;  n = M.n;  rho = M.rho;  count = tEnd <= 1 ? 1 : Math.max(2, Math.round((tEnd - 1) * perPower) + 1)
   for i in 0..count-1: s = count === 1 ? 1 : 1 + i * (tEnd - 1) / (count - 1)
        push { re: rho^s cos(s * raw), im: rho^s sin(s * raw), t: (s - 1) / (n - 1), s }
startRaise():      // click handler
   if M.zero: return
   if prefersReducedMotion(): return stepRaise()
   if mode === 'playing': return finishRaise()                       // a second click completes at once
   S.raise = { mode: 'playing', k: S.sel, t: 1, startedAt: performance.now() };  lastM = 0;  loopId = requestAnimationFrame(tick)
tick(now):  if destroyed or mode !== 'playing': return
   u = clamp((now - startedAt) / raiseDurationMs(n), 0, 1);  applyRaise(1 + (n - 1) * u)
   if u < 1: loopId = requestAnimationFrame(tick) else mode = 'done'
applyRaise(t):  S.raise.t = t;  pts = raiseSamples(M, S.raise.k, t)
   curve (created lazily on the first call with >= 2 points: cPlane.addCurve({ id: 'raise', points: pts, color: '--polar', ramp: true, dots: true, arrow: true, width: 2.5, order: 40 })): update(pts), hidden = pts.length < 2, setCursor(pts[pts.length - 1].t)
   m = floor(t + 1e-9);  if m !== lastM: lastM = m; setText(raiseReadout, raise line (2.6) for power m)           // the text changes only when a whole power is passed
   cPlane.requestDraw()
stepRaise():   // reduced motion: one whole power per click
   if mode !== 'stepping': S.raise = { mode: 'stepping', k: S.sel, m: 1, t: 1 };  lastM = 0       // from idle or done: start again at the root (power 1)
   S.raise.m += 1;  applyRaise(S.raise.m);  if S.raise.m >= n: S.raise.mode = 'done'     // n - 1 clicks reach power n; the button then reads "Start again"
finishRaise(): cancelAnimationFrame(loopId); applyRaise(n); mode = 'done'
cancelRaise(): cancelAnimationFrame(loopId); mode = 'idle'; curve.hidden = true; setText(raiseReadout, initial text); cPlane.requestDraw()
   called by: onDragStart of c, n change, select to another step, preset, typed c, load, unmount
```
The spiral uses the raw angle theta_k of the step, so at whole powers it lands on `rho^m e^{i m theta_k}` and at power n on `|c| e^{i(Theta + 2 pi k)}`, which is c, after winding k extra turns. The c-plane view contains |c| (5.2), so the spiral is on the page.
For c = 1 the raise readout at power n adds the order of the root ("z^3 = 1 first"), because the spiral touches 1 at m = order.

### 5.8 The quadratic panel

```
quadraticModel(a, b, c):
  if !(isFinite(a) && isFinite(b) && isFinite(c)): return { ok: false, reason: 'bad' }
  if a === 0: return { ok: false, reason: 'a-zero' }
  disc = b*b - 4*a*c;  h = -b / (2*a) + 0;  d = disc / (4*a*a) + 0           // + 0 turns -0 into 0
  s = csqrt({ re: d, im: 0 });  roots = quadraticRoots(a, b, c);  rootsOfD = rootsOf({ re: d, im: 0 }, 2)
  return { ok: true, a, b, c, disc, h, d, s, roots, rootsOfD, double: disc === 0 }
updateQuadratic():
  read the three fields; if any is empty or not finite: show #roots-quadratic-error "Type numbers for a, b and c." and return (the last good result stays)
  clear the error;  Q = quadraticModel(a, b, c)
  if !Q.ok (a = 0): readout "a = 0: not a quadratic (the equation is linear)"; story ''; qex.update(Q); qplane layer draws nothing; return
  readout = quadraticReadout(Q);  story = quadraticStory(Q);  qex.update(Q)
  qPlane.fitTo([Q.rootsOfD[0], Q.rootsOfD[1], Q.roots[0], Q.roots[1], ZERO], 0.3);  qPlane.requestDraw()
```
`roots` come from `quadraticRoots` (the formula, as the problem says) and `rootsOfD` from `rootsOf` (the staircase machine); they are the same two points shifted by h, and the unit test asserts it. The load button sets the main picture to c = d, n = 2.

### 5.9 Explainer rows (TeX; every cell function returns null when `M.zero` / `P.zero` / `!Q.ok`)

Helpers:
```
lines(...ls): ls = ls.filter(Boolean); ls.length === 1 ? ls[0] : `\\begin{array}{l}${ls.join(' \\\\ ')}\\end{array}`         // short lines instead of one long formula: nothing overflows at 390 px
texSlash(theta) = texAngle(theta) with every `\\frac{p}{q}` rewritten as `p/q` (so an exponent reads e^{i 5\\pi/4}, not a tiny stacked fraction); it is used for every angle that sits in an exponent
texExp(rho, theta): R = texNumber(rho); T = texSlash(theta); neg = T starts with '-'; body = neg ? T.slice(1) : T; sp = /^\d/.test(body) ? '\\,' : ''
                    e = `e^{${neg ? '-' : ''}i${sp}${body}}`; return R === '1' ? e : `${R}\\,${e}`        // keeps the raw angle: 5pi/4 stays 5pi/4
eqLines(n, A, B)  (A, B = texNumber(Re), texNumber(Im)):  n = 2: [`x^{2} - y^{2} = A`, `2xy = B`];  n = 3: [`x^{3} - 3xy^{2} = A`, `3x^{2}y - y^{3} = B`];
                  n = 4: [`x^{4} - 6x^{2}y^{2} + y^{4} = A`, `4x^{3}y - 4xy^{3} = B`];  n >= 5: [`\\text{two equations of degree } n \\text{ in } x \\text{ and } y`]
thetaTex(Theta) = Theta === 0 ? '2\\pi k' : `${texAngle(Theta)} + 2\\pi k`
```
`roots-ex` rows, with `state = { M, k }`, `st = M.steps[k]`, `z = st.point`, `j = st.j`, `raw = st.raw`:
```
eq      label 'the equation'   native 'polar'
  cart:  lines(cart(`(x+iy)^{n} = ${texCart(M.c)}`), ...eqLines(n, texNumber(c.re), texNumber(c.im)).map(cart))
  polar: lines(polar(`r^{n} = |c| = ${texNumber(M.mod)}`), polar(`${n}\\theta = ${thetaTex(M.Theta)},\\ k = 0, 1, \\dots, ${n - 1}`))
length  label 'length r'       native null
  cart:  cart(`r = \\sqrt{x^{2}+y^{2}} = \\sqrt{(${N(z.re)})^{2} + (${N(z.im)})^{2}} = ${N(cabs(z))}`)
  polar: polar(`r = |c|^{1/${n}} = ${texNumber(M.mod)}^{1/${n}} = ${N(M.rho)}`)
angle   label 'angle'          native 'polar'
  cart:  cart(`\\operatorname{Arg} z_{${j}} = \\operatorname{atan2}(y, x) = ${texAngle(st.argPoint)}`)
  polar: lines(polar(`\\theta_{${k}} = \\frac{1}{n}\\left(\\operatorname{Arg}c + 2\\pi k\\right)`),
               polar(`= \\frac{1}{${n}}\\left(${texAngle(M.Theta)} + 2\\pi\\cdot ${k}\\right) = ${texAngle(raw)}`),
               turns >= 1 ? polar(`= ${texAngle(st.argPoint)} + ${turns === 1 ? '' : turns + '\\cdot '}2\\pi`) : null)        // turns = round((raw - argPoint)/(2 pi))
point   label 'the root'       native 'polar'
  cart:  cart(`z_{${j}} = x + iy = ${texCart(z)}`)
  polar: polar(`z_{${j}} = r\\,e^{i\\theta_{${k}}} = ${texExp(M.rho, raw)}`)
same footer (rootsSame):  powC = cpow(z, n);  powP = fromPolar(Math.pow(M.rho, n), n * raw);  tol = 1e-9 * Math.max(1, M.mod)
  cart:  cart(`(${texCart(z)})^{${n}} = ${texCart(powC)}`)
  polar: polar(`(${texNumber(M.rho)})^{${n}}\\,e^{i\\,${texSlash(n * raw)}} = ${texCart(powP)}`)        // n * raw = Arg c + 2 pi k: k extra turns
  agree: eq(powC, M.c, tol) && eq(powP, M.c, tol)          // null (not checked) when zero
```
`roots-qex` rows, `Q`:
```
disc   label 'discriminant'  native null
  cart:  cart(`b^{2} - 4ac = (${texNumber(b)})^{2} - 4(${texNumber(a)})(${texNumber(c)}) = ${texNumber(disc)}`)
  polar: polar(disc === 0 ? `0 = 0` : `${texNumber(disc)} = ${texExp(Math.abs(disc), Arg(disc))}`)
sqrt   label 'its square root' native 'polar'
  cart:  cart(disc < 0 ? `\\sqrt{${texNumber(disc)}} = i\\sqrt{${texNumber(-disc)}} = ${texCart(S)}` : `\\sqrt{${texNumber(disc)}} = ${texCart(S)}`)       // S = csqrt(disc)
  polar: polar(disc === 0 ? `\\sqrt{0} = 0` : `\\sqrt{${texNumber(Math.abs(disc))}}\\,e^{i\\,${texSlash(Arg(disc) / 2)}} = ${texCart(S)}`)
roots  label 'the roots'     native 'cart'
  cart:  cart(`z = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{${texNumber(-b)} \\pm ${texCart(S)}}{${texNumber(2 * a)}} = ${texCart(r1)}\\ \\text{or}\\ ${texCart(r2)}`)
  polar: polar(double ? `z = ${texNumber(h)}` : `z = ${shiftTex}${texExp(cabs(S), phi0)}\\ \\text{or}\\ ${shiftTex}${texExp(cabs(S), phi1)}`)
         where phi_k = (Arg(d) + 2 pi k) / 2 for k = 0, 1 (the two steps of d divided by 2: pi/2 and 3pi/2 when d < 0, 0 and pi when d > 0),
         cabs(S) = |d|^(1/2), shiftTex = h === 0 ? '' : `${texNumber(h)} + `
same footer (quadSame): res(r) = a r^2 + b r + c computed with mul and add; tol = 1e-9 * max(1, |a||r|^2 + |b||r| + |c|)
  cart:  cart(`(${texNumber(a)})(${texCart(r1)})^{2} + (${texNumber(b)})(${texCart(r1)}) + (${texNumber(c)}) = ${texCart(res(r1))}`)
  polar: the same line for r2, tinted polar;  agree: |res(r1)| <= tol && |res(r2)| <= tol
```
For `principal-root` (state `{ P, k }`, `st = P.steps[k]`):
```
w       label 'w'                       cart: cart(`w = a + bi = ${texCart(w)}`)      polar: polar(`w = |w|\\,e^{i\\operatorname{Arg}w} = ${texExp(P.mod, P.Theta)}`)
eq      label 'solve z^n = w'  polar    cart:  n === 2 ? lines(cart(`(a+bi)^{2} = ${texCart(w)}`), cart(`a^{2} - b^{2} = ${texNumber(w.re)},\\ 2ab = ${texNumber(w.im)}`), cart(`a + bi = \\pm(${texCart(P.P)})`))
                                               : lines(cart(`(a+bi)^{${n}} = ${texCart(w)}`), cart(`\\text{two equations of degree } ${n}`))
                                        polar: lines(polar(`r^{${n}} = |w| = ${texNumber(P.mod)}`), polar(`${n}\\theta = \\operatorname{Arg}w + 2\\pi k = ${thetaTex(P.Theta)}`))
length  label 'length of the root'      cart: cart(`\\sqrt{a^{2}+b^{2}} = \\sqrt{(${N(P.P.re)})^{2} + (${N(P.P.im)})^{2}} = ${N(P.rho)}`)     polar: polar(`|w|^{1/${n}} = ${texNumber(P.mod)}^{1/${n}} = ${N(P.rho)}`)
angle   label 'angle of the root' polar cart: cart(`\\operatorname{atan2}(b, a) = ${texAngle(Arg(P.P))}`)   polar: polar(`\\frac{1}{n}\\operatorname{Arg}w = \\frac{1}{${n}}\\left(${texAngle(P.Theta)}\\right) = ${texAngle(P.Theta / n)}`)
other   label 'root from step k'        cart: cart(`${texCart(st.point)}`)   polar: lines(polar(`\\theta_{${k}} = \\frac{1}{${n}}\\left(${texAngle(P.Theta)} + 2\\pi\\cdot ${k}\\right) = ${texAngle(st.raw)}`), polar(`\\Rightarrow\\ ${texExp(P.rho, st.raw)}`))
same footer: powC = cpow(P.P, n); powP = fromPolar(Math.pow(P.rho, n), P.Theta);  tol = 1e-9 * max(1, P.mod)
  cart: cart(`(${texCart(P.P)})^{${n}} = ${texCart(powC)}`)    polar: polar(`(${texNumber(P.rho)})^{${n}}\\,e^{i\\,${texSlash(P.Theta)}} = ${texCart(powP)}`)    agree: eq(powC, w, tol) && eq(powP, w, tol)
```
Every one of these strings is rendered through KaTeX in the unit test (7), so a typo shows up as a failing test, not as a red box on the page.

### 5.10 Redraw and resolution management

- All canvases belong to `createPlane`: it sizes the backing store to the CSS size times `devicePixelRatio` (capped by the plane), observes its own size, and
  coalesces `requestDraw()` calls into one repaint per frame. The station creates no canvas and no offscreen buffer, no domain colouring, no WebGL.
- Per-frame cost is O(n) segments plus two `drawPolarAddress` calls per plane, and the plane's label placement is bounded by its own cost model.
  The largest curve is the raise spiral: at most 32 * 11 + 1 = 353 points (n = 12). The sweep trace is a 192-segment circle plus its push-forward (about 200 points).
- A state change writes DOM text only when the string changed (`setText`), patches list rows in place, and calls `explainer.update(state)` (coalesced by the explainer; it renders without MathML while updates stream in and refines 220 ms after the last one).
- The two `requestAnimationFrame` loops (raise, sweep) exist only while an animation runs; each frame does one state update, one curve `update` and one `requestDraw`.
- If the page is hidden mid-animation the loop pauses; on return the next frame advances by at most 5% of the sweep (`u = min(u_raw, u_prev + 0.05)`) so a seam crossing cannot be skipped.

### 5.11 `principal-root` pipeline and sweep

```
principalModel(w, n):  n = clamp(round(n), 2, 6);  mod = cabs(w);  zero = mod < 1e-9
   zero: Theta = null, rho = 0, P = ZERO, steps = k 0..n-1 with point ZERO
   else: Theta = Arg(w);  rho = Math.pow(mod, 1 / n);  P = principalRoot(w, n);  all = rootsOf(w, n)
         steps[k] = { k, raw: (Theta + 2 pi k) / n, point: all[k], argPoint: Arg(all[k]) }
   jumpDistance = 2 * rho * Math.sin(Math.PI / n);  isNegReal = w.re < 0 && Math.abs(w.im) <= 1e-12 * mod;  realRoot = isNegReal && n % 2 === 1 ? -rho : null

update(source):    // mount, preset, n, input, drag, select, sweep
 1  P = principalModel(S.w, S.n);  S.sel = clamp(S.sel, 0, S.n - 1)
 2  wHandle.set(P.w, { silent: true }) unless source is drag; override its aria-label
 3  for k = 0..5: h = rootHandles[k]; hidden if k >= n or zero; else h.set(P.steps[k].point, { silent: true }); label; toggle class 'rt-ghost' on h.el (on for k > 0, off for k = 0); label text: k = 0 keeps "principal", k > 0 reads `k = ${k}`
 4  if !S.userView && source !== 'drag': H = viewHalfWidth(P); if H !== fitted: setHalf(plane, H)
 5  seam crossings: if source is 'drag' or 'sweep' and !P.zero and S.lastArg !== null: dir = seamJump(S.lastArg, P.Theta); if dir !== 0: S.jumps += 1; S.lastJump = { dir, n: P.n, rho: P.rho }
    (a preset, a typed value or an n change is a teleport, never counted: those sources skip the detection)
    always afterwards: S.lastArg = P.zero ? null : P.Theta;   for preset, n, input and mount also S.jumps = 0, S.lastJump = null
 6  text: readout, n output, chips, fields, problem callout, trap note (P.isNegReal && P.n odd), pick note, sweep readout (below)
 7  staircase: rebuild when n changed (kMin 0, kMax n - 1, label 'arg w'); update(P.zero ? null : P.Theta); setPicked(S.sel)
 8  explainer.update({ P, k: S.sel });  plane.requestDraw();  announce for preset, n, input
sweep readout: S.lastJump ? jumpReadout({ ...S.lastJump, count: S.jumps }) : (S.sweep.mode === 'playing' ? 'Sweeping. The root turns at 1/n of the speed of w. No jump yet.' (n substituted) : 'No jump yet. Sweep w once around, or drag it across the negative real axis.')

startSweep():
   if P.zero: return                                          // the button is disabled with the message in 2.6
   if prefersReducedMotion(): return stepSweep()
   if S.sweep.mode === 'playing': return stopSweep()
   S.sweep = { mode: 'playing', phi0: P.Theta, radius: P.mod, startW: copy(S.w), startedAt: performance.now(), u: 0, step: 0, trace: buildTrace(P) }
   S.jumps = 0;  S.lastJump = null;  S.lastArg = P.Theta;  loopId = requestAnimationFrame(tickSweep)
buildTrace(P):
   wCurve = circle(ZERO, P.mod, { from: P.Theta, to: P.Theta + 2 * Math.PI, n: 192 })                  // shapes.circle: t = i/192, closed, starts at w
   pieces = pushForward(wCurve, (z) => principalRoot(z, P.n))                                           // 2 open pieces when the seam is inside the lap (t ranges abut), 1 when w starts on it
   curves 'sweep-w' <- wCurve.points (base '--input', ramp, dots, arrow);  'sweep-root-0..2' <- pieces[i].points (base '--output', ramp); unused ones hidden; created lazily with >= 2 points
tickSweep(now):
   uRaw = clamp((now - startedAt) / SWEEP_MS, 0, 1);  u = Math.min(uRaw, S.sweep.u + 0.05);  S.sweep.u = u
   z = u >= 1 ? copy(startW) : fromPolar(radius, phi0 + 2 * Math.PI * u)
   setW(z, 'sweep')                                           // S.w = z; wHandle.set(z, { silent: true }); update('sweep')
   every trace curve: setCursor(u) (a ring is drawn only on the piece whose t range contains u)
   if u < 1: loopId = requestAnimationFrame(tickSweep) else { mode = 'idle'; every trace curve: setCursor(null) }
stopSweep(): cancelAnimationFrame; mode = 'idle'; cursors null (the trace stays)
stepSweep(): if mode !== 'stepping': init as startSweep with mode 'stepping', step 0, no loop
             step += 1; u = step / SWEEP_STEPS; z = step === 12 ? copy(startW) : fromPolar(radius, phi0 + 2 pi u); setW(z, 'sweep'); cursors u; if step === 12: mode = 'idle' (button reads "Sweep again")
w handle onDragStart: stopSweep(); hide the trace curves (the circle through w is no longer the circle that was swept).   n change and preset: same.
```
The principal root moves at 1/n of the angular speed of w because its angle is `Arg w / n`; the jump at the seam is `2 rho sin(pi/n)` long. `button#principal-root-sweep` carries `data-state` = idle, playing or stepping, and its label follows 2.6.

### 5.12 Header, problem callout, footer, status line (both stations)

```
buildHeader(ctx, ledeText):
  header.station-header > h1 = ctx.station.title;  p.station-lede = ledeText;
    div.thread-badges > span.thread-badge[data-thread = t] with text `${t} ${title of t in ctx.threads}` for every t in ctx.station.threads;
    div.chips > for p of problemsForStation(ctx.station.id): a.chip.problem-chip[href = '#' + routeFor(p.id)][title = p.aha with each ^{x} rewritten ^(x)] text p.id; aria-current="true" on the chip of the active problem
renderProblem(host, p):                       // p = activeProblem() or null
  host.hidden = !p; if !p: return; clear host; host.dataset.tone = addressTones(p.address)[0].slice(2)         // 'cart' or 'polar'
  strong p.id, then for part of statementParts(p.statement): part.math ? tex(span, part.text) : text node(part.text);
  a muted line: the words "Easy in:" and one span.badge[data-tone] per tone of addressTones(p.address) ('--cart' reads "Cartesian", '--polar' reads "Polar"; the group has aria-label addressLabel(p.address));
  then prose(span, p.addressWhy)
activeProblem():  roots: eq(S.c, 1) && S.n === 5 -> problemById('1.4.1');  eq(S.c, -16) && S.n === 4 -> problemById('1.4.2');  else null
                  principal-root: eq(S.w, 2i) && S.n === 2 -> problemById('2.2.2');  else null
                  (the quadratic panel carries its own callout for problemById('1.4.3') at all times)
buildNav(ctx):  list = ctx.stations;  i = index of ctx.station.id
  items: prev = list[i - 1] and next = list[i + 1] (data-dir, text = title);  for every t in ctx.station.threads: the last station before i and the first station after i whose `threads` include t,
         skipping a station already listed as the plain prev or next and skipping 'problems';  text `${t} previous: ${title}` / `${t} next: ${title}`, attribute data-thread = t
  nav.station-links[aria-label = "Neighbouring places"] > a.station-link[href = '#' + station.id]
announce(text):   clearTimeout(statusTimer);  statusTimer = setTimeout(() => { if (!destroyed) { status.textContent = ''; status.textContent = text; } }, 400)
```
For `roots` the neighbours come out as: previous Powers (order 5), next Curves and Time (order 7), T2 next `powermap`, T1 next `sets`. For `principal-root`: previous `powermap`, next `branches`, T2 previous `powermap` (same as previous, skipped), T2 next `branches` (same as next, skipped).

---

## 6. Mathematics

Notation: c (roots) and w (principal-root) are the given numbers, Theta = Arg c or Arg w in (-pi, pi], rho = |c|^(1/n) or |w|^(1/n), raw_k = (Theta + 2 pi k)/n is "the angle from step k".
Arg of a negative real number is pi, never -pi. All decimals below are to 9 places and were produced by the wave-0 `complex.js` and cross-checked by hand.

### 6.1 Every formula the stations use

| Id | Formula | Where |
|---|---|---|
| F1 | z = r e^(i theta) = r (cos theta + i sin theta); x = r cos theta, y = r sin theta; r = sqrt(x^2 + y^2); Arg z = atan2(y, x) in (-pi, pi] | both addresses everywhere |
| F2 | arg z = { Arg z + 2 pi k : k an integer } (a set, Def 1.4.4); Arg z is its one member in (-pi, pi] (Def 1.4.6); the point z is one place | staircase widget, ghost windings |
| F3 | de Moivre: (r e^(i theta))^n = r^n e^(i n theta) | explainer, raise |
| F4 | z^n = c  iff  r^n = \|c\| and n theta is in arg c  iff  r = \|c\|^(1/n) and theta = (Theta + 2 pi k)/n for an integer k | `roots` |
| F5 | z_k = rho e^(i raw_k), k = 0..n-1, are n distinct points; z_(k+n) has angle raw_k + 2 pi, the same point: z_n = z_0 | list, ghost ray |
| F6 | consecutive roots are 2 pi / n apart (360/n degrees); the roots are the vertices of a regular n-gon; their sum is 0 (n >= 2); their product is (-1)^(n+1) c | n-gon, unit-test checks |
| F7 | Arg z_k = raw_k when raw_k <= pi, otherwise raw_k - 2 pi (for 0 <= k <= n, raw_k < 2 pi + pi/n, so one turn is the most that is ever removed) | the "(Arg ...)" in the list and the two names in the pick note |
| F8 | for c = 1: z_k = e^(2 pi i k/n); z_k^m = 1 iff (n / gcd(k, n)) divides m, so the order of z_k is n / gcd(k, n); z_k is primitive (Def 1.5.6) iff gcd(k, n) = 1; there are phi(n) primitive roots (phi = Euler's totient); gcd(0, n) = n so z_0 = 1 has order 1 | badges `primitive`, `order d` |
| F9 | Cartesian expansion: (x + iy)^2 = (x^2 - y^2) + 2xy i; (x + iy)^3 = (x^3 - 3xy^2) + (3x^2 y - y^3) i; (x + iy)^4 = (x^4 - 6x^2 y^2 + y^4) + (4x^3 y - 4x y^3) i | explainer row `eq`, n = 2, 3, 4 |
| F10 | quadratic: a z^2 + b z + c = 0 (a not 0) iff (z + b/2a)^2 = (b^2 - 4ac)/(4a^2) = d; with h = -b/(2a): z = h + s or z = h - s where s is a square root of d; equivalently z = (-b +- sqrt(Delta))/(2a), Delta = b^2 - 4ac, d = Delta/(4a^2) | quadratic panel |
| F11 | square roots of a real d: d > 0: +-sqrt(d); d = 0: 0; d < 0: +-i sqrt(-d). In polar: \|d\|^(1/2) e^(i (Arg d + 2 pi k)/2), k = 0, 1 (angles 0 and pi for d > 0, pi/2 and 3pi/2 for d < 0) | `rootsOfD`, quadratic plane |
| F12 | the roots of a quadratic with real coefficients and Delta < 0 are conjugates (a mirror pair across the real axis) | story text |
| F13 | principal n-th root (Def 2.2.8; n = 2 is Def 2.2.1): w^(1/n) = \|w\|^(1/n) e^(i Arg(w)/n); the n roots are w^(1/n) e^(2 pi i k/n) = \|w\|^(1/n) e^(i (Arg w + 2 pi k)/n); step k = 0 gives the principal root | `principal-root` |
| F14 | the principal root's angle Arg(w)/n lies in (-pi/n, pi/n], so for n = 2 its real part is >= 0 (the principal square root of a negative real number is +i sqrt\|w\|) | pick note, `eq` row |
| F15 | as w goes once counterclockwise around 0 on \|w\| = R, the principal root goes from angle Arg(w_0)/n to pi/n at the seam, jumps to -pi/n, and ends at Arg(w_0)/n: it moves at 1/n of w's angular speed, with one jump of length 2 rho sin(pi/n) (the chord from rho e^(i pi/n) to rho e^(-i pi/n)); the root after the jump is the root from step n - 1 before it | sweep readout |
| F16 | the raise path of the root from step k: z_k^s = rho^s e^(i s raw_k) for real s from 1 to n; at whole s = m it is z_k^m; at s = n it is rho^n e^(i (Theta + 2 pi k)) = \|c\| e^(i Theta) = c, after winding k extra turns | `roots-raise` |
| F17 | Cartesian square-root equations for n = 2: (a + bi)^2 = w iff a^2 - b^2 = Re w and 2ab = Im w; the solutions are +-(principal root) | `principal-root` row `eq` |

The stations call `rootsOf`, `principalRoot`, `quadraticRoots`, `isPrimitiveRoot`, `Arg`, `fromPolar` and the formatters from `complex.js`. They never recompute a root with their own trigonometry
except for the raise path and the sweep path, which are F16 and `fromPolar` (the engine has no continuous-exponent power for a chosen step).

### 6.2 Worked solutions, both addresses

**1.4.1  Find and sketch the 5th roots of unity.**  (c = 1, n = 5; native address: polar)

*Polar.* 1 = 1 e^(i0), so Arg 1 = 0 and arg 1 = {2 pi k}. Write z = r e^(i theta): z^5 = r^5 e^(i 5 theta). Then r^5 = 1 gives r = 1, and 5 theta in {2 pi k} gives theta_k = 2 pi k / 5.
k = 0, 1, 2, 3, 4 give five different points; k = 5 gives 2 pi, the same point as k = 0. They are 72 degrees apart on the unit circle.

| k | angle from step k | z_k = e^(i 2 pi k/5) | Arg of the point | order | primitive |
|---|---|---|---|---|---|
| 0 | 0 | 1 | 0 | 1 | no |
| 1 | 2pi/5 | 0.309016994 + 0.951056516i | 2pi/5 | 5 | yes |
| 2 | 4pi/5 | -0.809016994 + 0.587785252i | 4pi/5 | 5 | yes |
| 3 | 6pi/5 | -0.809016994 - 0.587785252i | -4pi/5 | 5 | yes |
| 4 | 8pi/5 | 0.309016994 - 0.951056516i | -2pi/5 | 5 | yes |

Exact: cos(2pi/5) = (sqrt5 - 1)/4 = 0.309016994, sin(2pi/5) = sqrt(10 + 2 sqrt5)/4 = 0.951056516, cos(4pi/5) = -(sqrt5 + 1)/4 = -0.809016994, sin(4pi/5) = sqrt(10 - 2 sqrt5)/4 = 0.587785252.
Check: each z_k^5 = e^(i 2 pi k) = 1; the real parts sum to 1 + 2(0.309016994) + 2(-0.809016994) = 0; 5 is prime, so gcd(k, 5) = 1 for k = 1..4 and four roots are primitive.

*Cartesian.* z^5 - 1 = (z - 1)(z^4 + z^3 + z^2 + z + 1). Divide the quartic by z^2 and put u = z + 1/z, so z^2 + 1/z^2 = u^2 - 2: u^2 + u - 1 = 0, u = (-1 +- sqrt5)/2 = 0.618034, -1.618034.
For |z| = 1, u = 2 cos theta, so cos theta = (-1 +- sqrt5)/4 = 0.309017 or -0.809017, theta = +-72 deg or +-144 deg, and z = cos theta + i sin theta. The same five numbers, after a trick you must see.
Why polar is easy here: z^5 = 1 asks which angle, repeated five times, makes whole turns. That is a spin question with five equally spaced answers.

**1.4.2  Find all the 4th roots of -16. Express answers in both exponential and Cartesian forms.**  (c = -16, n = 4; polar, then Cartesian)

*Polar.* -16 = 16 e^(i pi), Arg(-16) = pi (not -pi), arg(-16) = {pi + 2 pi k}. z^4 = r^4 e^(i 4 theta): r^4 = 16 gives r = 2; 4 theta = pi + 2 pi k gives theta_k = pi/4 + k pi/2, k = 0..3 (k = 4 gives 9pi/4 = pi/4 + 2 pi, the same point as k = 0).
Exponential form: 2 e^(i pi/4), 2 e^(i 3pi/4), 2 e^(i 5pi/4), 2 e^(i 7pi/4). Cartesian form: 2 cos 45 deg = 2 sin 45 deg = sqrt2 = 1.414213562.

| k | angle from step k | exponential form | Cartesian form | Arg of the point |
|---|---|---|---|---|
| 0 | pi/4 | 2 e^(i pi/4) | sqrt2 + sqrt2 i = 1.414213562 + 1.414213562i | pi/4 |
| 1 | 3pi/4 | 2 e^(i 3pi/4) | -sqrt2 + sqrt2 i | 3pi/4 |
| 2 | 5pi/4 | 2 e^(i 5pi/4) | -sqrt2 - sqrt2 i | -3pi/4 |
| 3 | 7pi/4 | 2 e^(i 7pi/4) | sqrt2 - sqrt2 i | -pi/4 |

The names 5pi/4 and 7pi/4 are in arg z for the points that sit at Arg -3pi/4 and -pi/4: same direction, two names. Check: (sqrt2 + sqrt2 i)^2 = 2(1 + i)^2 = 4i, (4i)^2 = -16; the product of the four roots is 16 = (-1)^5 (-16).

*Cartesian.* z^4 + 16 = (z^2 - 4i)(z^2 + 4i). z^2 = 4i gives z = +-(sqrt2 + sqrt2 i) because (sqrt2 + sqrt2 i)^2 = 4i; z^2 = -4i gives z = +-(sqrt2 - sqrt2 i). Or expand (x + iy)^4 = -16:
x^4 - 6x^2 y^2 + y^4 = -16 and 4x^3 y - 4x y^3 = 0. The second factors as 4xy(x^2 - y^2) = 0; x = 0 or y = 0 gives y^4 = -16 or x^4 = -16, impossible; so x^2 = y^2 and the first becomes -4x^4 = -16, x^2 = 2, x = +-sqrt2, y = +-sqrt2. Four roots again.
It works for n = 4 and is hopeless for n = 5 or 12; the polar route is the same three lines for every n.

**1.4.3  Use the quadratic formula to solve z^2 - 4z + 13 = 0.**  (a = 1, b = -4, c = 13; Cartesian, with a root in disguise)

*Cartesian.* Delta = b^2 - 4ac = 16 - 52 = -36. z = (4 +- sqrt(-36))/2 = (4 +- 6i)/2 = 2 +- 3i. Check: (2 + 3i)^2 - 4(2 + 3i) + 13 = (-5 + 12i) + (-8 - 12i) + 13 = 0.

*Polar (the hidden step).* -36 = 36 e^(i pi). Its principal square root is 6 e^(i pi/2) = 6i; the other square root comes from the next step, 6 e^(i 3pi/2) = -6i. Completing the square gives (z - 2)^2 = -9 = 9 e^(i pi), so z - 2 is a square root of -9:
3 e^(i pi/2) = 3i or 3 e^(i 3pi/2) = -3i (two points on the circle of radius 3, the n = 2 machine with c = -9). Slide them right by 2: z = 2 + 3i or 2 - 3i, a mirror pair because the coefficients are real.
Same machine with c = 8: Delta = 16 - 32 = -16, (z - 2)^2 = -4, z - 2 = +-2i, z = 2 +- 2i. Check: (2 + 2i)^2 - 4(2 + 2i) + 8 = 8i - 8 - 8i + 8 = 0.

**2.2.2  Compute the principal value of the square root of 2i, i.e. (2i)^(1/2) on the principal branch.**  (w = 2i, n = 2; polar)

*Polar.* |2i| = 2 and Arg(2i) = pi/2, the home step. w^(1/2) = |w|^(1/2) e^(i Arg(w)/2) = sqrt2 e^(i pi/4) = sqrt2 (cos 45 deg + i sin 45 deg) = sqrt2 (sqrt2/2 + i sqrt2/2) = 1 + i.
The other square root comes from the step pi/2 + 2 pi: sqrt2 e^(i 5pi/4) = -1 - i. "Principal" means: use the home step only.

*Cartesian.* (a + bi)^2 = 2i gives a^2 - b^2 = 0 and 2ab = 2. So a = +-b and ab = 1, which forces a = b = 1 or a = b = -1 (a = -b would give -a^2 = 1, impossible): the roots are +-(1 + i).
The principal one is the one with positive real part (its angle Arg(w)/2 lies in (-pi/2, pi/2]): 1 + i. Check: (1 + i)^2 = 1 + 2i - 1 = 2i.

*The seam (the sweep).* w = 2 e^(i phi). Just before phi = pi the root is sqrt2 e^(i pi/2) = (0, 1.414); just after, with Arg w = -pi + epsilon, it is sqrt2 e^(-i pi/2) = (0, -1.414): a jump of 2 sqrt2 = 2.828427 (F15). Elsewhere the root turns at half the speed of w:
for 48 steps per lap it moves 0.0925 per step.

### 6.3 Checked values the unit test pins (tolerance 1e-9 unless stated)

`rootsModel`:

| call | pinned values |
|---|---|
| `rootsModel({re:1,im:0}, 5)` | `rho` 1; `Theta` 0; `roots` the five points in the table of 1.4.1; `steps[k].raw` = 0, 2pi/5, 4pi/5, 6pi/5, 8pi/5, and `steps[5].raw` = 2pi with `ghost` true and `point` = root 0; `argPoint` = 0, 2pi/5, 4pi/5, -4pi/5, -2pi/5; `isOne` true; `primitive` = [false, true, true, true, true]; `order` = [1, 5, 5, 5, 5]; `primitiveCount` 4 |
| `rootsModel({re:-16,im:0}, 4)` | `rho` 2; `Theta` pi (exactly `Math.PI`); `roots` = (1.414213562, 1.414213562), (-1.414213562, 1.414213562), (-1.414213562, -1.414213562), (1.414213562, -1.414213562); `raw` = pi/4, 3pi/4, 5pi/4, 7pi/4, 9pi/4; `argPoint` = pi/4, 3pi/4, -3pi/4, -pi/4; `isOne` false; `primitive` all false; `order` all null; `primitiveCount` 0; each root to the 4th power is -16 within 1e-9; product of the roots is 16 within 1e-9; sum is 0 within 1e-9 |
| `rootsModel({re:1,im:0}, 6)` | `primitive` = [false, true, false, false, false, true]; `order` = [1, 6, 3, 2, 3, 6]; `primitiveCount` 2; root 1 = (0.5, 0.866025404); root 3 = (-1, 0) |
| `rootsModel({re:1,im:0}, 12)` | indices with `primitive` true = [1, 5, 7, 11]; `primitiveCount` 4 |
| `rootsModel({re:0,im:1}, 3)` | `rho` 1; roots (0.866025404, 0.5), (-0.866025404, 0.5), (0, -1); `raw` = pi/6, 5pi/6, 3pi/2; `argPoint` = pi/6, 5pi/6, -pi/2 |
| `rootsModel({re:0,im:2}, 2)` | `rho` 1.414213562; roots (1, 1) and (-1, -1); `raw` = pi/4, 5pi/4, 9pi/4 |
| `rootsModel({re:-9,im:0}, 2)` | `rho` 3; roots (0, 3) and (0, -3); `raw` = pi/2, 3pi/2 |
| `rootsModel({re:0,im:0}, 4)` | `zero` true; `rho` 0; `Theta` null; four zero roots; `primitiveCount` 0 |
| `rootsModel({re:1,im:0}, 1).n`, `(…, 99).n`, `(…, 4.6).n` | 2, 12, 5 |
| `rootsModel({re:1+1e-10,im:0}, 5).isOne` and `({re:1.001,im:0}, 5).isOne` | true, false |

Strings (exact):

| call | result |
|---|---|
| `rootLine(M(-16, 4), 0..3).text` | `k = 0: 2 e^(i pi/4) = 1.414 + 1.414i (Arg pi/4)`; `k = 1: 2 e^(i 3pi/4) = -1.414 + 1.414i (Arg 3pi/4)`; `k = 2: 2 e^(i 5pi/4) = -1.414 - 1.414i (Arg -3pi/4)`; `k = 3: 2 e^(i 7pi/4) = 1.414 - 1.414i (Arg -pi/4)`; `badges` [] for all |
| `rootLine(M(1, 5), 0..4)` | `k = 0: e^(i 0) = 1 (Arg 0)` with badges [`order 1`]; `k = 1: e^(i 2pi/5) = 0.309 + 0.951i (Arg 2pi/5)` with [`primitive`, `order 5`]; `k = 2: e^(i 4pi/5) = -0.809 + 0.588i (Arg 4pi/5)`; `k = 3: e^(i 6pi/5) = -0.809 - 0.588i (Arg -4pi/5)`; `k = 4: e^(i 8pi/5) = 0.309 - 0.951i (Arg -2pi/5)` |
| `rootLine(M(1, 6), 2)`, `(…, 3)` | `k = 2: e^(i 2pi/3) = -0.5 + 0.866i (Arg 2pi/3)` with [`order 3`]; `k = 3: e^(i pi) = -1 (Arg pi)` with [`order 2`] |
| `rootLine(M(i, 3), 2).text` | `k = 2: e^(i 3pi/2) = -i (Arg -pi/2)` |
| `rootLine(M(2i, 2), 1).text` | `k = 1: 1.414 e^(i 5pi/4) = -1 - i (Arg -3pi/4)` |
| `rootsReadout(M(-16, 4))` | `c = -16; n = 4; \|c\|^(1/n) = 2; Arg c = pi; roots at (Arg c + 2pi k)/n; k = 0..3` |
| `rootsReadout(M(1, 5))` | `c = 1; n = 5; \|c\|^(1/n) = 1; Arg c = 0; roots at (Arg c + 2pi k)/n; k = 0..4` |
| `rootsReadout(M(-1+i, 5))` | `c = -1 + i; n = 5; \|c\|^(1/n) = 1.072; Arg c = 3pi/4; roots at (Arg c + 2pi k)/n; k = 0..4` |
| `rootsReadout(M(0, 4))` | `c = 0; n = 4; every root is 0 and Arg c is not defined` |
| `wrapNote(M(-16, 4))` | `Step 4 gives (Arg c + 8pi)/4 = Arg c/4 + 2pi, the same ray as step 0. That is why there are exactly 4 roots.` |
| `primitiveNote(M(1, 5))`, `(M(1, 6))`, `(M(-16, 4))` | `A root is primitive when the smallest power m with z^m = 1 is m = 5. Order d means z^d = 1 first happens at d. There are 4 primitive roots.`; same with `m = 6` and `2 primitive roots`; `Primitive roots are defined for c = 1 (the roots of unity). Click the c = 1 chip to see them.` |
| `pickNote(M(-16, 4), 0)` | `Step k = 0 is the home step of c. It gives the angle pi/4 and lands on 1.414 + 1.414i. This root is the principal root of c; as a point its Arg is pi/4.` |
| `pickNote(M(-16, 4), 1)` | `Step k = 1 gives the angle 3pi/4 and lands on -1.414 + 1.414i. As a point this root has Arg 3pi/4: the name from step 1 is also its home step.` |
| `pickNote(M(-16, 4), 2)` | `Step k = 2 gives the angle 5pi/4 and lands on -1.414 - 1.414i. As a point this root has Arg -3pi/4. So 5pi/4 and -3pi/4 are two names for one direction: 5pi/4 is one of the angles in arg z, -3pi/4 is Arg z.` |
| `pickNote(M(-16, 4), 4)` | `Step k = 4 gives the angle 9pi/4, which is pi/4 + 2pi: the same direction as step 0. It lands on 1.414 + 1.414i again, so there is no new root.` |
| `pickNote(M(1, 5), 3)` | `Step k = 3 gives the angle 6pi/5 and lands on -0.809 - 0.588i. As a point this root has Arg -4pi/5. So 6pi/5 and -4pi/5 are two names for one direction: 6pi/5 is one of the angles in arg z, -4pi/5 is Arg z.` |

`quadraticModel` (fields `h`, `d`, `roots`; strings from `quadraticReadout` and `quadraticStory`):

| (a, b, c) | h | d | readout | roots |
|---|---|---|---|---|
| (1, -4, 13) | 2 | -9 | `(z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i` | 2 + 3i, 2 - 3i; `rootsOfD` = 3i, -3i; `disc` -36 |
| (1, -4, 8) | 2 | -4 | `(z - 2)^2 = -4; sqrt: +-2i; roots: 2 + 2i, 2 - 2i` | 2 + 2i, 2 - 2i |
| (1, -4, 3) | 2 | 1 | `(z - 2)^2 = 1; sqrt: +-1; roots: 3, 1` | 3, 1 |
| (1, -4, 4) | 2 | 0 | `(z - 2)^2 = 0; sqrt: 0; roots: 2, 2`; `double` true | 2, 2 |
| (1, 2, 5) | -1 | -4 | `(z + 1)^2 = -4; sqrt: +-2i; roots: -1 + 2i, -1 - 2i` | -1 + 2i, -1 - 2i |
| (2, -8, 26) | 2 | -9 | `(z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i` | the same as (1, -4, 13) |
| (1, 0, 1) | 0 | -1 | `z^2 = -1; sqrt: +-i; roots: i, -i` | i, -i |
| (0, 1, 1) | | | `ok` false, `reason` 'a-zero'; readout `a = 0: not a quadratic (the equation is linear)` | |
| (NaN, 1, 1) | | | `ok` false, `reason` 'bad' | |

For every ok row: `roots` as a set equals `{h + q : q in rootsOfD}` within 1e-9, and `a r^2 + b r + c` is 0 within 1e-9 for both roots.
Stories: (1, -4, 13): `Completing the square: (z - 2)^2 = -9. So z - 2 is a square root of -9. Those are 3i and -3i: two points on the circle of radius 3. Slide them right by 2 to get 2 + 3i and 2 - 3i.`;
(1, 2, 5): `Completing the square: (z + 1)^2 = -4. So z + 1 is a square root of -4. Those are 2i and -2i: two points on the circle of radius 2. Slide them left by 1 to get -1 + 2i and -1 - 2i.`;
(1, 0, 1): `Completing the square: z^2 = -1. So z is a square root of -1. Those are i and -i: two points on the circle of radius 1. They are the roots.`;
(1, -4, 3): `Completing the square: (z - 2)^2 = 1. So z - 2 is one of the two square roots of 1: 1 and -1, two real numbers. Slide them right by 2 to get 3 and 1.`;
(1, -4, 4): `Completing the square: (z - 2)^2 = 0. So z - 2 = 0 and there is only one root, 2, counted twice.`

`principalModel`, strings and sweep:

| call | pinned values |
|---|---|
| `principalModel({re:0,im:2}, 2)` | `rho` 1.414213562; `Theta` pi/2; `P` (1, 1); `steps[0].point` (1, 1), `steps[1].point` (-1, -1); `raw` pi/4, 5pi/4; `argPoint` pi/4, -3pi/4; `jumpDistance` 2.828427125; `isNegReal` false; `realRoot` null |
| `principalModel({re:-1,im:0}, 2)` | `Theta` pi; `P` (0, 1); `steps[1].point` (0, -1); `jumpDistance` 2; `isNegReal` true; `realRoot` null (n is even) |
| `principalModel({re:-1,im:0}, 3)` | `P` (0.5, 0.866025404); `steps[1].point` (-1, 0); `steps[2].point` (0.5, -0.866025404); `jumpDistance` 1.732050808; `isNegReal` true; `realRoot` -1 |
| `principalModel({re:3,im:4}, 2)` | `P` (2, 1); `Theta` 0.927295218 (atan2(4, 3)); `rho` 2.236067977 |
| `principalModel({re:0,im:0}, 2)` | `zero` true; `P` (0, 0) |
| `principalReadout(P(2i, 2))` | `w = 2i; n = 2; \|w\| = 2; Arg w = 1.571 (pi/2); w^(1/n) = 1.414 e^(i pi/4) = 1 + i` |
| `principalReadout(P(-1, 2))` | `w = -1; n = 2; \|w\| = 1; Arg w = 3.142 (pi); w^(1/n) = e^(i pi/2) = i` |
| `principalReadout(P(-1, 3))` | `w = -1; n = 3; \|w\| = 1; Arg w = 3.142 (pi); w^(1/n) = e^(i pi/3) = 0.5 + 0.866i` |
| `principalReadout(P(3+4i, 2))` | `w = 3 + 4i; n = 2; \|w\| = 5; Arg w = 0.927; w^(1/n) = 2.236 e^(i 0.464) = 2 + i` |
| `principalReadout(P(0, 2))` | `w = 0; n = 2; every root is 0 and Arg w is not defined` |
| `pickNote(P(2i, 2), 0)` | `The principal root comes from step k = 0, the home step: angle Arg w / 2 = pi/4. It lands on 1 + i.` |
| `pickNote(P(2i, 2), 1)` | `This root comes from step k = 1: the angle is (Arg w + 2pi)/2 = 5pi/4. It lands on -1 - i. It is a root of w, but it is not the principal root.` |
| `trapNote(P(-1, 3))` | `-1 is a negative real number and n = 3 is odd, so it has a real root, -1. That root is not the principal one. The principal root uses Arg w = pi and lands at angle pi/3: 0.5 + 0.866i.` |
| `trapNote(P(-1, 2))`, `(P(2i, 2))` | `''` and `''` |
| `jumpReadout({ n: 2, rho: Math.SQRT2, count: 1, dir: 1 })` | `The root jumps at Arg w = pi: its angle went from pi/2 to -pi/2 (a jump of 2.828). Crossings so far: 1.` |
| `jumpReadout({ n: 3, rho: 1, count: 2, dir: -1 })` | `The root jumps at Arg w = pi: its angle went from -pi/3 to pi/3 (a jump of 1.732). Crossings so far: 2.` |
| `sweepTrace(2, Math.PI/2, 2, 48)` | 49 samples; `i = 11`: arg 3.010692960, root (0.092493992, 1.411185623); `i = 12`: arg pi, root (0, 1.414213562) within 1e-9; `i = 13`: arg -3.010692960, root (0.092493992, -1.411185623); exactly one consecutive pair with root distance > 1.5, at `i = 13`, distance 2.826912749; the largest other distance is 0.092543541 (< 0.4); the last root equals the first within 1e-9 |

Raise path (`raiseSamples(M(-16, 4), k, 4)` has 97 samples; the samples at index 0, 32, 64, 96 are the whole powers 1, 2, 3, 4):

| k | z^1 | z^2 | z^3 | z^4 (angle n raw_k) |
|---|---|---|---|---|
| 0 | (1.414213562, 1.414213562) | (0, 4) | (-5.656854249, 5.656854249) | (-16, 0), pi |
| 1 | (-1.414213562, 1.414213562) | (0, -4) | (5.656854249, 5.656854249) | (-16, 0), 3pi |
| 2 | (-1.414213562, -1.414213562) | (0, 4) | (5.656854249, -5.656854249) | (-16, 0), 5pi |
| 3 | (1.414213562, -1.414213562) | (0, -4) | (-5.656854249, -5.656854249) | (-16, 0), 7pi |

(tolerance 1e-9 on `re` and `im`; each `t` is 0, 1/3, 2/3, 1; `raiseSamples(M, 0, 1).length` is 1 and `raiseSamples(M, 0, 2.5).length` is 49.)
For c = 1, n = 6, k = 2 the whole powers are -0.5 + 0.866025404i, -0.5 - 0.866025404i, 1, -0.5 + 0.866025404i, -0.5 - 0.866025404i, 1: the spiral hits 1 at power 3 (order 3) and again at 6.

Helpers:

| call | result |
|---|---|
| `viewHalfWidths(M)` for (-16, 4), (1, 5), (2i, 2), (i, 3), (-9, 2), (100, 2), (0, 4) | `{c, z}` = (20, 3), (2, 1.5), (3, 2), (2, 1.5), (12, 4), (125, 16), (2, 1.5) |
| `viewHalfWidth(P)` for (2i, 2), (-1, 3), (0.0001i, 2) | 3.2, 2, 2 |
| `ladderCeil(2.6, [1.5, 2, 3, 4])`, `ladderCeil(3, …)`, `ladderCeil(99, …)` | 3, 3, 4 |
| `snapToGrid({re:1.04,im:0.02}, 0.5, 0.06)` | (1, 0) |
| `snapToGrid({re:0.97,im:0.52}, 0.5, 0.06)` | (1, 0.5) |
| `snapToGrid({re:0.9,im:0.3}, 0.5, 0.06)` | (0.9, 0.3) (nothing within tolerance) |
| `snapToGrid({re:-0.03,im:1.97}, 0.5, 0.06)` | (0, 2) (and `0`, never `-0`: assert `Object.is(re, 0)`) |
| `raiseDurationMs(n)` for 2, 4, 8, 12 | 2000, 3300, 6000, 6000 |
| `polarText(2, 5*Math.PI/4)`, `(1, 0)`, `(1, -Math.PI/4)`, `(Math.SQRT2, Math.PI/4)` | `2 e^(i 5pi/4)`, `e^(i 0)`, `e^(-i pi/4)`, `1.414 e^(i pi/4)` |
| `texSlash(5*Math.PI/4)`, `(-3*Math.PI/4)`, `(Math.PI)`, `(0.5)` | `5\pi/4`, `-3\pi/4`, `\pi`, `0.5` |
| `texExp(2, 5*Math.PI/4)`, `(1, -Math.PI/4)`, `(Math.SQRT2, Math.PI/4)`, `(1, 0)`, `(3, 0.5)` | `2\,e^{i\,5\pi/4}`, `e^{-i\pi/4}`, `\sqrt{2}\,e^{i\pi/4}`, `e^{i\,0}`, `3\,e^{i\,0.5}` |
| `snapToGrid`, `ladderCeil`, `texSlash`, `texExp`, `polarText` exported by both stations | give identical results on the table above (the two copies must not drift) |

(`raiseDurationMs(2)` is 1200 + 700 = 1900, clamped up to 2000; `raiseDurationMs(8)` is 1200 + 700 x 7 = 6100, clamped down to 6000.)

---

## 7. Verification plan

Run everything from the repo root (`/home/user/math-viz`). Screenshots go outside the repo or under `docs/review/iter-1/i1-station-roots-principal/` (the harness reads `--out`).

### 7.0 Unit tests (support every criterion)

`npm test` runs `tests/unit/i1-station-roots-principal.test.mjs` with the others; one file alone: `node --test tests/unit/i1-station-roots-principal.test.mjs`. The file loads KaTeX the way
`tests/unit/i1-core-widgets.test.mjs` does (`vm.runInThisContext(fs.readFileSync('vendor/katex/katex.min.js', 'utf8'))`) and imports both station modules directly (they have no top-level DOM access). Cases:

1. **Models** (6.3 tables): every `rootsModel`, `quadraticModel`, `principalModel` row, including the `n` clamps, `isOne` tolerance, the zero cases, `Object.is(Theta, Math.PI)` for -16, and the invariants for every (c, n) in
   {(1, 2..12), (-16, 4), (i, 3), (2i, 2), (-1+i, 7), (0.3-0.7i, 5)}: each root to the n-th power equals c within 1e-9 x max(1, |c|); consecutive roots differ in angle by 2 pi/n; the roots sum to 0 within 1e-9;
   the product is (-1)^(n+1) c within 1e-8; `steps[n].point` equals `steps[0].point`; `steps[n].raw - steps[0].raw` is 2 pi; `Arg(steps[k].point)` equals `steps[k].argPoint`; `raw - argPoint` is 0 or 2 pi.
2. **Primitive logic**: for n = 2..12 with c = 1, `primitiveCount` equals the Euler totient phi(n), taken from this independent list: n = 2: 1, 3: 2, 4: 2, 5: 4, 6: 2, 7: 6, 8: 4, 9: 6, 10: 4, 11: 10, 12: 4.
   For every k, `order[k]` is the least m >= 1 with `cpow(root_k, m)` within 1e-9 of 1 (brute force), and `primitive[k]` is `order[k] === n`. For c = 1 + 1e-6 or c = -16 every `primitive` is false and every `order` is null.
3. **Strings**: every row of 6.3 (`rootLine`, `rootsReadout`, `wrapNote`, `primitiveNote`, `pickNote`, `quadraticReadout`, `quadraticStory`, `principalReadout`, `pickNote`, `trapNote`, `jumpReadout`, `polarText`, `texExp`). The word `primitive` appears in `text` of no line (it is only ever in `badges`), and `badges` has `primitive` exactly when `primitive[k]`.
4. **Acceptance substrings**: assert on the strings the interaction scripts use (A2, A3, A5) so a wording change fails here first: the -16 readout contains `c = -16` and `|c|^(1/n) = 2`; the four lines contain `= 1.414 + 1.414i`, `= -1.414 + 1.414i`, `= -1.414 - 1.414i`, `= 1.414 - 1.414i` and `pi/4`, `3pi/4` for k = 0, 1; the 1.4.1 lines 1 and 2 contain `0.309 + 0.951i` and `-0.809 + 0.588i`; the quadratic readout for (1, -4, 13) contains `(z - 2)^2 = -9`, `3i`, `2 + 3i`, `2 - 3i` and for (1, -4, 8) `(z - 2)^2 = -4` and `2 + 2i`; the principal readout for 2i contains `w = 2i`, `Arg w = 1.571`, `pi/4`, `= 1 + i`; the jump readout contains `jumps`; the "No jump yet" strings do not.
5. **Cross-check with the problems data** (`js/data/problems.js`, `answer.values`): `rootsModel(1, 5).roots` equals the `roots` of 1.4.1 and its `argPoint` list equals `principalArgs` and its `primitive` list equals `primitive`;
   `rootsModel(-16, 4).roots` equals the `roots` of 1.4.2, `raw` (k = 0..3) equals `angles`, `argPoint` equals `principalArgs`, `rho` equals `radius`; `quadraticModel(1, -4, 13).roots` equals the `roots` of 1.4.3, `h` equals `completed.shift` and `d` equals `completed.square`;
   `principalModel(2i, 2).P` equals the `root` of 2.2.2, `rho` equals `r`, `Theta / 2` equals `Arg`, and `steps[1].point` equals `other`. All within 1e-9.
6. **Sweep**: `sweepTrace(2, Math.PI/2, 2, 48)` as in 6.3; for radius 1 and n = 3 exactly one jump of 2 sin(pi/3) = 1.732 for any start angle that is not within 2 pi/48 of the seam; the root is continuous otherwise (distance < 0.3). `pushForward(circle(0, 2, { from: Math.PI/2, to: 5*Math.PI/2, n: 192 }), z => principalRoot(z, 2))` returns 2 pieces whose `t` ranges are [0, 0.25] and [0.25, 1].
7. **Raise path** and **helpers**: the raise table, `raiseSamples` lengths (97, 1, 49), `t` monotone from 0 to 1, the last sample equal to c within 1e-9 for every k; `viewHalfWidths`, `viewHalfWidth`, `ladderCeil`, `snapToGrid`, `raiseDurationMs`; the four helpers of both stations agree.
8. **TeX validity**: for each state in {(c, n, k)} = {(-16, 4, 0..4), (1, 5, 0..5), (1, 6, 0..6), (i, 3, 0..3), (2i, 2, 0..2), (-1+i, 7, 3), (0.3-0.7i, 12, 12)} call every cell function of `rootsRows()` and `rootsSame`; for the quadratic states of 6.3 every cell of `quadRows()` and `quadSame`; for {(2i, 2), (-1, 2), (-1, 3), (3+4i, 2), (1, 4), (0.3-0.7i, 5)} x all k every cell of `principalRows()` and `principalSame`. Each non-null cell must render through `texToHtml` without `tex-error`; each `same.agree` must be `true`; with a zero model every cell is `null` and `agree` is `null`.
9. **Code inspection (A6 made automatic)**: read `js/stations/roots.js` as text and assert: it imports `rootsOf`, `isPrimitiveRoot` and `quadraticRoots` from `'../core/complex.js'`; `isPrimitiveRoot(` appears only inside the `isOne` branch of `rootsModel` (the assertion is on the text of the function: it contains `isOne &&` before `isPrimitiveRoot(`); `quadraticRoots(` appears in `quadraticModel`; the file contains none of the literals `0.309`, `0.951`, `0.809`, `0.588`, `1.414`, `1.732`, `Math.SQRT2` and no array literal of complex roots (regex for `re: -?\d+\.\d{3,}`); `js/stations/principal-root.js` imports `principalRoot` and `rootsOf` and contains the same absence of literals. Both files export `mount` (a function of length 2) and have no top-level statement that touches `document` or `window` (importing them in Node must not throw).

### 7.1 A1: routes and deep links load clean (smoke)

```
node tools/smoke.mjs --route roots,principal-root,problem-1-4-1,problem-1-4-2,problem-1-4-3,problem-2-2-2 --dark --out docs/review/iter-1/i1-station-roots-principal
```
Passing: exit code 0; for every route at desktop (1280x860), phone (390x844) and desktop dark: no console error, no page error, no failed or external request, `scrollWidth - clientWidth <= 1` (no horizontal overflow), no router error panel, `#view` not empty. Then read the PNGs with the image tool and check the list in 7.4.

### 7.2 A2, A3, A5: interaction scripts

Commands (each runs at the desktop and the phone viewport):
```
node tools/smoke.mjs --route problem-1-4-2 --script tests/interact/i1-station-roots-principal.mjs    # A2 (including the hash switch to #problem-1-4-1)
node tools/smoke.mjs --route problem-1-4-3 --script tests/interact/i1-station-roots-principal.mjs    # A3
node tools/smoke.mjs --route problem-2-2-2 --script tests/interact/i1-station-roots-principal.mjs    # A5
node tools/smoke.mjs --route roots          --script tests/interact/i1-station-roots-principal.mjs    # default state, keyboard, drag, n slider
node tools/smoke.mjs --route principal-root --script tests/interact/i1-station-roots-principal.mjs    # default state, ghost pick, keyboard across the seam
```
The script (`tests/interact/i1-station-roots-principal.mjs`), exactly:

```js
import { readText, setSlider, clickChip, settle, dragHandle, dragHandleAround, handleZ, parseCart } from './_helpers.mjs';

const items = (page) => page.$$eval('#roots-list > li', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
const reduced = (page) => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
const primitives = (li) => li.filter((t) => t.includes('primitive')).length;

export default async function (page, ctx) {
  const { route } = ctx;
  if (route === 'problem-1-4-2') return roots142(page, ctx);
  if (route === 'problem-1-4-3') return roots143(page, ctx);
  if (route === 'problem-2-2-2') return principal222(page, ctx);
  if (route === 'roots') return rootsDefault(page, ctx);
  if (route === 'principal-root') return principalDefault(page, ctx);
  ctx.log(`no interaction script for route ${route}`);
}

async function raise(page, powers) {                      // returns the raise readout once the root has landed on c
  if (await reduced(page)) { for (let i = 0; i < powers; i++) await clickChip(page, 'roots-raise'); }
  else {
    await clickChip(page, 'roots-raise');
    await page.waitForFunction(() => document.querySelector('#roots-raise').dataset.state === 'done', null, { timeout: 9000 });
  }
  return readText(page, '#roots-raise-readout');
}

async function roots142(page, { assert, shot }) {
  await page.waitForSelector('#roots-list > li');
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -16') && ro.includes('|c|^(1/n) = 2'), `readout: ${ro}`);
  let li = await items(page);
  assert(li.length === 4, `four roots, got ${li.length}`);
  const want = [['= 1.414 + 1.414i', 'pi/4'], ['= -1.414 + 1.414i', '3pi/4'], ['= -1.414 - 1.414i', '5pi/4'], ['= 1.414 - 1.414i', '7pi/4']];
  want.forEach(([z, a], k) => assert(li[k].includes(z) && li[k].includes(a), `root ${k}: ${li[k]}`));
  for (let k = 0; k < 4; k++) assert(await page.$(`#roots-root-${k}`), `#roots-root-${k} exists`);
  assert(primitives(li) === 0, 'no primitive badge unless c = 1');

  await clickChip(page, 'roots-pick-2');                   // the arg versus Arg lesson
  const note = await readText(page, '#roots-pick-note');
  assert(note.includes('Step k = 2') && note.includes('5pi/4') && note.includes('-3pi/4'), `pick note: ${note}`);
  assert(await page.$eval('#roots-stairs-k2', (e) => e.classList.contains('is-picked')), 'staircase row 2 is marked');
  assert((await page.$eval('#roots-ex-angle-polar', (e) => e.dataset.tex)).includes('5\\pi'), 'explainer angle cell names 5pi/4');
  const same = await readText(page, '#roots-ex-same');
  assert(same.startsWith('same point: agree'), `same point row: ${same}`);
  await shot('root-2-selected');

  const rr = await raise(page, 3);                         // n - 1 = 3 powers (z^2, z^3, z^4)
  assert(rr.includes('z^4 = -16') && rr.includes('= c'), `raise readout: ${rr}`);
  await shot('raised');

  await page.evaluate(() => { location.hash = '#problem-1-4-1'; });     // second half of A2
  await page.waitForTimeout(600);
  li = await items(page);
  assert(li.length === 5, `five roots of unity, got ${li.length}`);
  assert(li[1].includes('0.309 + 0.951i') && li[2].includes('-0.809 + 0.588i'), `unity roots: ${li[1]} | ${li[2]}`);
  assert(primitives(li) === 4, `four primitive roots, got ${primitives(li)}`);
  await setSlider(page, 'roots-n', 6);
  li = await items(page);
  assert(li.length === 6 && primitives(li) === 2, `n = 6: ${li.length} lines, ${primitives(li)} primitive`);
}

async function roots143(page, { assert, shot }) {
  await page.waitForSelector('#roots-quadratic-readout');
  let q = await readText(page, '#roots-quadratic-readout');
  for (const s of ['(z - 2)^2 = -9', '3i', '2 + 3i', '2 - 3i']) assert(q.includes(s), `"${s}" in "${q}"`);
  const order = await page.$$eval('#view .station > *', (els) => els.map((e) => e.id));
  assert(order.includes('roots-quadratic') && order.indexOf('roots-quadratic') < order.indexOf('roots-controls'), `quadratic panel first: ${order}`);
  await shot('quadratic');
  await setSlider(page, 'roots-qc', 8);
  q = await readText(page, '#roots-quadratic-readout');
  assert(q.includes('(z - 2)^2 = -4') && q.includes('2 + 2i'), `c = 8: ${q}`);
  await setSlider(page, 'roots-qa', 0);                    // error path: a message, not an exception
  q = await readText(page, '#roots-quadratic-readout');
  assert(q.includes('not a quadratic'), `a = 0: ${q}`);
  await setSlider(page, 'roots-qa', 1);
  await clickChip(page, 'roots-quadratic-load');           // d = -4: the n = 2 machine in the big picture
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -4') && ro.includes('n = 2') && ro.includes('|c|^(1/n) = 2'), `loaded: ${ro}`);
  const li = await items(page);
  assert(li.length === 2 && li[0].includes('= 2i') && li[1].includes('= -2i'), `square roots of -4: ${li}`);
  await setSlider(page, 'roots-qc', 13);
  assert((await readText(page, '#roots-quadratic-readout')).includes('2 + 3i'), 'back to 13');
}

async function principal222(page, { assert, shot }) {
  await page.waitForSelector('#principal-root-readout');
  const r = await readText(page, '#principal-root-readout');
  for (const s of ['w = 2i', 'Arg w = 1.571', 'pi/4', '= 1 + i']) assert(r.includes(s), `"${s}" in "${r}"`);
  assert((await readText(page, '#principal-root-ex-same')).startsWith('same point: agree'), 'same point row agrees');
  await clickChip(page, 'principal-root-plane-r1');        // the ghost root, from step k = 1
  assert((await readText(page, '#principal-root-pick-note')).includes('step k = 1'), 'ghost root names its step');
  assert(await page.$eval('#principal-root-stairs-k1', (e) => e.classList.contains('is-picked')), 'staircase row 1 is marked');

  const samples = [];                                      // drag w once around |w| = 2, recording what the readout says
  await dragHandleAround(page, 'principal-root-plane-w', { radius: 2, startAngle: Math.PI / 2, turns: 1, steps: 48 }, async (pg, angle, i) => {
    const t = await readText(pg, '#principal-root-readout');
    samples.push({ i, arg: Number(/Arg w = (-?\d+(?:\.\d+)?)/.exec(t)[1]), root: parseCart(t.split(' = ').pop()) });
  });
  assert(samples.length === 49, `49 samples, got ${samples.length}`);
  let jumps = 0, other = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = Math.hypot(samples[i].root.re - samples[i - 1].root.re, samples[i].root.im - samples[i - 1].root.im);
    if (d > 1.5) jumps++; else other = Math.max(other, d);
  }
  assert(jumps === 1 && other < 0.4, `one jump (got ${jumps}), all other steps small (max ${other.toFixed(3)})`);
  const near = (a) => samples.filter((s) => Math.abs(s.arg - a) < 0.15);
  assert(near(-3).length > 0 && near(-3).every((s) => s.root.im < 0), 'near Arg w = -3 the root is below the axis');
  assert(near(3).length > 0 && near(3).every((s) => s.root.im > 0), 'near Arg w = +3 the root is above the axis');
  await shot('after-drag');

  const start = await handleZ(page, 'principal-root-plane-w');
  if (await reduced(page)) {
    for (let i = 0; i < 12; i++) await clickChip(page, 'principal-root-sweep');
  } else {
    await clickChip(page, 'principal-root-sweep');
    assert(!(await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'starting a sweep clears the earlier jump');
    assert((await page.$eval('#principal-root-sweep', (e) => e.dataset.state)) === 'playing', 'button says playing');
    await page.waitForFunction(() => document.querySelector('#principal-root-sweep-readout').textContent.includes('jumps'), null, { timeout: 9000 });
    await shot('sweep-jumped');
    await page.waitForFunction(() => document.querySelector('#principal-root-sweep').dataset.state === 'idle', null, { timeout: 9000 });
  }
  const sw = await readText(page, '#principal-root-sweep-readout');
  assert(sw.includes('jumps') && sw.includes('Arg w = pi') && sw.includes('Crossings so far: 1'), `sweep readout: ${sw}`);
  const end = await handleZ(page, 'principal-root-plane-w');
  assert(Math.hypot(end.re - start.re, end.im - start.im) < 0.05, 'the sweep brought w back to where it started');
}

async function rootsDefault(page, { assert }) {
  await page.waitForSelector('#roots-list > li');
  assert((await readText(page, '#roots-readout')).startsWith('c = 1; n = 5;'), 'default is 1.4.1');
  let li = await items(page);
  assert(li.length === 5 && primitives(li) === 4, 'five roots, four primitive');
  await page.focus('#roots-zplane-r3');                    // keyboard: Enter selects the root under focus
  await page.keyboard.press('Enter');
  await settle(page);
  assert((await readText(page, '#roots-pick-note')).includes('Step k = 3'), 'Enter selected step 3');
  const z = await dragHandle(page, 'roots-plane-c', { re: -1, im: 1 });
  assert(Math.abs(z.re + 1) < 1e-6 && Math.abs(z.im - 1) < 1e-6, `c snapped to -1 + i, got ${z.re}, ${z.im}`);
  const ro = await readText(page, '#roots-readout');
  assert(ro.includes('c = -1 + i') && ro.includes('Arg c = 3pi/4'), `readout after the drag: ${ro}`);
  li = await items(page);
  assert(primitives(li) === 0, 'no primitive badges away from c = 1');
  assert((await readText(page, '#roots-primitive-note')).includes('defined for c = 1'), 'the note says why');
  await clickChip(page, 'roots-preset-1');
  assert(primitives(await items(page)) === 4, 'back to c = 1: four primitive roots');
  await setSlider(page, 'roots-n', 12);
  li = await items(page);
  assert(li.length === 12 && primitives(li) === 4, `n = 12: ${li.length} lines, ${primitives(li)} primitive`);
}

async function principalDefault(page, { assert }) {
  await page.waitForSelector('#principal-root-readout');
  assert((await readText(page, '#principal-root-readout')).startsWith('w = 2i; n = 2;'), 'default is 2.2.2');
  await setSlider(page, 'principal-root-n', 3);
  assert((await page.$('#principal-root-stairs-k2')) && !(await page.$('#principal-root-stairs-k3')), 'three staircase rows for n = 3');
  await clickChip(page, 'principal-root-preset-m1cube');
  assert((await readText(page, '#principal-root-trap')).includes('not the principal one'), 'the real cube root is not the principal root');
  assert((await readText(page, '#principal-root-readout')).includes('= 0.5 + 0.866i'), 'principal cube root of -1');
  await page.focus('#principal-root-plane-w');             // keyboard across the seam: (-1, 0.1) then (-1, 0) then (-1, -0.1)
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await settle(page);
  assert((await readText(page, '#principal-root-sweep-readout')).includes('jumps'), 'a keyboard crossing of the seam is detected');
}
```
Passing: the script returns without throwing at both viewports; the harness reports no console error and no overflow (the script is run after the route loaded).
Timing notes: the raise takes 3.3 s (n = 4), the sweep 5 s; the waits allow 9 s. `dragHandleAround` throws if a target is outside the viewport; the plane is scrolled to the middle first (helper) and the radius 2 circle fits the plane (view half-width 3.2 gives 62% of the half width).

### 7.3 A3 detail and the 1.4.3 numbers

Besides the script: `quadraticReadout` for (1, -4, 13) must read exactly `(z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i` and, after `roots-qc` = 8, `(z - 2)^2 = -4; sqrt: +-2i; roots: 2 + 2i, 2 - 2i` (unit tests, 7.0 case 3).

### 7.4 A4: screenshot review (desktop, desktop dark, phone)

Command: `node tools/smoke.mjs --route problem-1-4-2 --dark --out docs/review/iter-1/i1-station-roots-principal`, then read `problem-1-4-2--desktop.png`, `--desktop-dark.png`, `--phone.png`.
The reviewer checks, in each:
1. root plane: four dots at 45, 135, 225, 315 degrees, labelled k = 0..3, on a drawn circle of radius 2 (it crosses the axes at the tick labelled 2), root 0 labelled "k = 0, 4", and no label hidden behind a button (the plane has none);
2. four solid `--polar` rays from the origin to the dots, and one fainter dashed ray on the k = 0 direction that runs past root 0 (step k = 4) and a dashed ring on root 0;
3. the dashed n-gon (a square) between the dots at low alpha; the seam drawn dashed on the negative real axis;
4. root 0 selected (thick ring) with its dashed drop lines labelled x = 1.414 and y = 1.414 in `--cart`, and its Arg arc, "Arg z0 = pi/4" and two "also ..." lines (9pi/4 and -7pi/4);
5. c-plane: c at -16 on the seam, solid arc "Arg c = pi" and faint windings "also 3pi", "also 5pi", ..., view +-20, handle in green;
6. the staircase widget with rows k = 0..4, the k = 0 row shaded and prefixed "Arg c =", and the list lines with the orange polar part and blue Cartesian part;
7. the explainer has four rows plus "same point: agree", the "easy in Polar" badges, and nothing is clipped (the multi-line cells show every line);
8. phone: one column, no horizontal scroll, planes square and fully visible, the readout wraps, chips wrap, the explainer stacks with Cartesian above polar; dark theme: every mark readable (rays, ghost windings, dashed ray, labels).
Also screenshot `problem-1-4-1` (the primitive rings and badges), `problem-1-4-3` (quadratic panel first, small plane with hollow dots, dashed arrows, filled roots) and `problem-2-2-2` (solid and ghost root, seam, two arcs, staircase, readouts) and tick the same checks that apply.

### 7.5 A6: code inspection

```
grep -nE "^import" js/stations/roots.js
grep -nE "rootsOf\(|isPrimitiveRoot\(|quadraticRoots\(" js/stations/roots.js
grep -nE "0\.309|0\.951|0\.809|0\.588|1\.414|1\.732|SQRT2" js/stations/roots.js js/stations/principal-root.js
```
Passing: the first lists `rootsOf`, `isPrimitiveRoot`, `quadraticRoots` and the formatters imported from `../core/complex.js`; the second shows `rootsOf(` in `rootsModel` (and in `quadraticModel` for `rootsOfD`), `isPrimitiveRoot(` once, inside the `isOne` branch, and `quadraticRoots(` once in `quadraticModel`; the third prints nothing. Unit-test case 9 repeats this automatically.

### 7.6 Extra checks (not criteria, but they catch the usual failures)

- `node tools/smoke.mjs --route roots,principal-root --wait 1500` at desktop and phone with the OS reduced-motion setting emulated (`page.emulateMedia({ reducedMotion: 'reduce' })` in a throwaway script): the raise button reads "Next power" and `roots-raise` reaches `data-state="done"` after n - 1 clicks; the sweep button reads "Step w around (1 of 12)" and 12 clicks end with one crossing.
- Theme switch while an animation runs: toggle `data-theme` on `<html>`; planes and explainers re-tint, no console error.
- `window.__mv.planes.get('roots-zplane').getStats()`: `draws` increases while dragging c, `lastDrawMs` below 16 on the development machine (informational, not asserted).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases (each has a defined behaviour; none throws)

| Case | Behaviour |
|---|---|
| c = 0 (typed, dragged and snapped, or the load button with d = 0) | `rootsModel` has `zero: true`: all root handles hidden, the root plane draws one dot at 0 labelled "0: every root", the staircase shows its undefined state (`update(null)`), the list is emptied and hidden, `roots-zero-note` is shown, the readout is `c = 0; n = ..; every root is 0 and Arg c is not defined`, the explainer cells are empty (an em dash) and its footer says "not checked", the raise button does nothing. w = 0 in `principal-root` is the same, with the sweep button disabled. |
| c on the negative real axis (c = -16) | Arg c = pi, never -pi. The solid arc and the seam coincide with the ray; the seam is drawn under it. Dragging c across the axis: the staircase widget shows its "Seam crossed" note, the root dots keep moving smoothly, and every label k shifts by one (Arg c drops by 2 pi, so raw_k becomes the old raw_(k-1)); `roots-c-caption` says so. |
| c very small (0.001) or large (100) | Small: the c-plane shows view +-2 (ray under 6 px, no arcs: `drawPolarAddress` skips it), the root circle has radius 0.001^(1/n) (0.032 for n = 2, 0.56 for n = 12) inside the root plane's smallest view of +-1.5, so the dots stay on the page, just close to 0. Large: the c-plane ladder reaches 125 and the root plane 16; typed values above 100 are scaled to \|c\| = 100 with the message in `roots-c-error`. |
| c typed as text, empty, or with an exponent ("1e3") | Number parsing: valid finite numbers apply (1e3 is clamped to 100); anything else leaves the last good c and shows the error on `change`. |
| c within 1e-9 of 1 but not 1 (a dragged value) | Primitive rings and badges are off: they need `isOne`. Snap-on-release makes exactly 1 easy to hit; `roots-primitive-note` explains. |
| n changes while a raise runs, or while c is dragged by keyboard | The raise is cancelled (curve hidden, readout reset); the selected step is clamped to 0..n; the staircase and list rebuild. |
| selected step k = n (the ghost step) | Allowed from the staircase row n only. Root 0 is highlighted, the explainer shows the angle raw_n = Arg c/n + 2 pi in the polar column and Arg of the point in the Cartesian column (so the two differ by 2 pi), the footer still agrees. |
| roots coincide visually (n = 12, c tiny) | Labels are numbers only for n > 6; the plane's label placement moves them; hit areas stay separate because the circle is fitted to 67% of the plane. |
| n = 2 | The n-gon is one segment (drawn once); the ghost ray k = 2 still sticks out past root 0. |
| quadratic with a = 0, empty or text input, discriminant 0 or positive, negative b, a negative | Handled by `quadraticModel` and the copy deck (2.6); the little plane draws filled dots on the real axis for real roots, one dot for a double root, no arrows when h = 0. |
| `window.localStorage` blocked | Not used; nothing changes. |
| canvas unavailable | The plane shows its own note; all text, lists and explainers still work. |
| KaTeX missing | `tex()` falls back to the TeX source text; the readouts and lists (plain text) are unaffected. |
| the page is hidden during an animation | Next frame advances at most 5% of the sweep (and the raise is clamped by `u <= 1`); the lap still ends exactly at the start point. |
| unmount mid-animation (navigation) | `destroyed` is set first, the rAF id is cancelled, no later callback touches the DOM. |
| `principal-root`: w exactly on the seam (w = -1) | Arg = pi, principal root = e^(i pi/n); a drag just below flips to the other side; the preset chip lands exactly there. |
| `principal-root`: w dragged across the seam by keyboard | Detected as a crossing (see the test); a preset or typed jump is never counted. |
| `principal-root`: sweep with a tiny \|w\| | The trace circle is tiny; the sweep still runs and the readout is correct. |
| `principal-root`: negative real w with odd n | The trap note appears with the real root. |
| both stations: unknown token in the hash (`#roots-foo`) | Default state, no error. |

### 8.2 Performance plan

- Target 60 fps while dragging c or w on both planes (CONSTRAINTS). The work per pointer move is described in 5.3: at most 12 roots, 12 `handle.set`, a few `setText` calls, one staircase update, one coalesced explainer update, two coalesced redraws.
- No work outside events and the two animation loops. No `setInterval`. No layout reads in handlers (the plane does its own measuring).
- The explainer is the most expensive piece (KaTeX): at most 5 rows x 2 cells + footer, rendered without MathML while updates stream in and with MathML 220 ms after the last one; rows are fixed, so there is no DOM churn. First paint of the explainer is synchronous (cold render of this table was measured by the widget goal at about 230 ms under a 4x CPU throttle for six rows; this station has four plus the footer).
- The quadratic explainer has three rows and updates only when an input changes.
- A rebuild of the staircase widget (n change) creates at most 13 rows; the list rebuild at most 12 buttons. Both happen on the `input` event of a slider, at most a few times per second.
- Memory: three planes, two explainers and one staircase per `roots` mount, one plane, one explainer and one staircase per `principal-root` mount, all destroyed in `unmount`.

### 8.3 Accessibility

- Every control has a visible label or an `aria-label` and a stable id (section 2). Focus is visible on chips, buttons, inputs and slider (shell), on plane handles (the plane's ring), on the plane itself, on staircase rows (the widget) and on list buttons (`.rt-pick:focus-visible`).
- Everything the mouse can do has a keyboard route: c and w move with the arrow keys (Shift x10, Alt /10) and by typing Re and Im; roots are selected with Tab then Enter or Space; staircase rows with arrows, Home and End then Enter; the raise and sweep are buttons; the planes zoom with `+`, `-`, `0`.
- Non-colour cues: each root dot is numbered, primitive roots have a ring and the word "primitive", the ghost ray is dashed and labelled, the seam is dashed and labelled, arg is "also ..." text and faint arcs, Arg is a labelled solid arc.
- Names for assistive tech: handle `aria-label`s carry the number and both addresses (set by the station, 5.3 step 2 and 3); the plane announces its own view changes; `roots-status` and `principal-root-status` are `role="status"` regions, written at most once per 400 ms and only after presets, n, typed values, selection, raise end and quadratic edits (never while a drag streams); the two readouts are not live regions (they change on every pointer move); `principal-root-sweep-readout` is `aria-live="polite"` and changes only on a crossing, a start or a stop.
- The list is a real `ol` of buttons with `aria-pressed`; the staircase widget rows have their own `aria-label` ("step k = 2: ...").
- Contrast: text uses `--text` and `--text-muted` (at least 5.6:1 on every surface), tinted spans use `--polar` and `--cart` (at least 4.95:1 on `--surface-2`), canvas marks use token colours (at least 4.7:1 on `--surface`).
- Language: plain sentences; the maths words are always "Arg" for the one number and "arg" or "an angle in arg z" for the set; no sentence equates the set arg z with a number.

### 8.4 Reduced motion

`ctx.theme.prefersReducedMotion()` is read at click time. With it set: `roots-raise` is a stepper (one whole power per click, label "Next power", then "Start again"); `principal-root-sweep` is a stepper of 12 equal steps (label "Step w around (i of 12)", then "Sweep again"); the crossing is still detected and reported; views jump to the fitted view (the plane never animated them); no CSS animation or transition is added by the station (the plane's 80 ms handle scale and the staircase's pulse already honour the media query).

### 8.5 Phone layout (390 px)

- One column; `.two-planes` and `.rt-two` collapse because of `auto-fit` minimums (23.25 rem and 19 rem); planes are square (`aspect: 1`, `maxWidth: 520`), so about 326 px on a phone; the c-plane, the root plane and the principal plane each fit in the viewport height with their caption.
- Chips and buttons wrap (`.chips`); the slider row puts the range on its own line below 30 rem; the Re and Im fields wrap (`.rt-fields`); readouts wrap (`pre-wrap`, `overflow-wrap: anywhere`).
- The explainer stacks (Cartesian above polar) at 560 px and below; long formulas are split into short left-aligned lines by `\begin{array}{l}`, so nothing is clipped; the widest single line is the `eq` Cartesian line for n = 4, about 30 characters.
- The staircase widget is full width with ellipsis on overflow (its own rule); the list buttons are full width and their text wraps.
- Touch: handles have a 44 px hit area on coarse pointers; one finger on a handle drags it (the handle has `touch-action: none`), one finger on empty canvas scrolls the page, two fingers pan and pinch the plane.
- No horizontal page scroll: verified by the harness at 390 px for every route in A1.

---

## 9. Out of scope

- A movable seam and branch windows (`branches`); the Riemann surface of z^(1/n) and the helix of arg (`branches`, `staircase`, `graph4d`). `principal-root` links to `#branches` in its footer neighbours.
- The fan w = z^n and images of sectors and lines (`powermap`); the roots station only raises one root along its own spiral.
- The Lab hand-off: neither station has an "image of" problem, so there is no `-open-lab` button.
- Powers of a given number (`powers`, 1.3.2) and the staircase widget's own station (`staircase`).
- Complex coefficients in the quadratic panel (a, b, c are real); polynomials of degree 3 and up; Newton's method; typing n beyond 2..12 (roots) or 2..6 (principal-root).
- Persistence (progress ticks, last state) and the problem-index "reveal"; both belong to `problems`.
- Narration audio and video; the stations work fully without them and add no `Listen` control in iteration 1.
- Editing `css/components.css`, `js/registry.js`, `docs/ARCHITECTURE.md`, `docs/STORY.md` or any wave-0 module: this goal owns only its two station files (plus the two test files named at the top).

Requests for other owners (to be scheduled by the orchestrator, none blocks this goal): update `docs/ARCHITECTURE.md` section 9 for `i1-station-roots-principal` as listed in 4.0 (second plane `roots-zplane` with handles `roots-zplane-r0..r11`, the extra ids, the presets for `-i` and `-2i`, the hooks, the readout additions);
`docs/STORY.md` section 2, station 7 (`roots`) could mention that the c-plane and the root plane are separate and that the raise runs on the c-plane.

---

## 10. As built (builder's notes, iteration 1)

The stations follow this design. The places where the build differs, each with the reason, are listed here so the next reader does not have to diff.

1. **The readouts have a fixed-height box.** `roots-readout` and `principal-root-readout` are `div.readout.rt-readout` holding one `span.rt-live` (so `textContent` is still exactly the string in 2.7). The box is as tall as the longest string the readout can show: an invisible copy of that worst case (`data-sizer`, drawn by `::before`) sets the height and the live text sits on top. Reason: the readout is above the planes, and in the first build a 1-line to 2-line wrap (desktop) or 3-line to 4-line wrap (phone) moved the planes by one line height under the pointer in the middle of a drag (the phone drag script landed at Im c = 1.269 instead of 1). Checked at widths 320 to 1600 with ten states each: the live text never overflows the box. Cost: on a wide desktop the box keeps a blank second line.
2. **The problem callout does not change during a drag or a sweep.** `roots-problem` and `principal-root-problem` appear and disappear with the numbers (5.12), which moves everything below them by 100 to 200 px. A drag of c or w, or a sweep of w, holds the callout and the problem chip until the gesture ends (`dragging` flag, `refreshProblem()`); presets, typed values and keyboard moves still swap it at once. Reason: the same jump under the pointer as in note 1, at the first pointer move off 1 or 2i.
3. **`principal-root-plane`: the two guide circles are named in the top right corner** (`|w| = 2` in `--input`, `|w|^(1/2) = 1.414` in `--output`, right aligned, nothing else is drawn there because the plane has no zoom buttons), not at the bottom of each circle (3.2 item 2, 5.4). Reason: the circle label collided with the principal root's own label whenever the root sat near the bottom of its circle (seen at w = -1.9 - 2.5i). The caption adds one sentence that says what the two dashed circles are.
4. `roots-c-caption` has one more sentence: "Cross it and every label k shifts by one, because Arg c drops by 2π." (8.1 promised that the caption says so).
5. `primitiveNote` says "There is 1 primitive root." for n = 2 (the template of 2.6 would read "There are 1 primitive roots."); n >= 3 reads exactly as in 6.3.
6. While the raise animation plays, the button reads "Skip to the end" (a second click completes it, 5.7); idle and done read "Raise root j to the power n"; under reduced motion "Next power" and "Start again" as designed.
7. The header uses the shell's own markup (`ul.thread-badges > li.thread-badge`, as in `mappings.js`) rather than `div > span`; the badge text is `T2 The staircase: z, arg z, Arg z` as in 5.12.
8. `principal-root` draws the w = 0 mark as a ring plus the label "0: every root" (it does not import `drawDot`).
9. Extra pure exports, used by the unit test: `initialState(preset)` in both files.
10. The sweep trace draws a root piece only while `u` is inside that piece's `t` range (`setCursors`), so the cursor ring never sits on the piece that is not being traced.

Verification as built: `npm test` (all files pass; this goal's file has 19 tests); `node tools/smoke.mjs --route roots,principal-root,problem-1-4-1,problem-1-4-2,problem-1-4-3,problem-2-2-2 --dark` passes 18 of 18; the interaction script passes at desktop and phone on all six routes (it also covers the quadratic error paths, the ghost step, typed numbers, c = 0 and w = 0, and the reduced-motion steppers by emulating the media query). Screenshots are in `docs/review/iter-1/i1-station-roots-principal/`.
