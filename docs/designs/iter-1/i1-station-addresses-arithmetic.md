# Design: i1-station-addresses-arithmetic

Goal: `js/stations/addresses.js` and `js/stations/arithmetic.js` (wave 1, station, size L).
Owned files: those two modules, plus (automatically, as in every goal) this file,
`tests/unit/i1-station-addresses-arithmetic.test.mjs` and `tests/interact/i1-station-addresses-arithmetic.mjs`.
Nothing else may be edited.

> **Residue cleanup (iteration 1).** The × and ÷ view draws the heavy result ray only up to the nearer of the spun ring and the result and gives it the arrowhead only when it ends on the result, so the dashed `s-stretch` never lies under it; the θ words are soft (a θ word takes a spot that costs at most one crossing and is left out otherwise; `labelCands(prim)` gives the plan's own spot and then 24 more); all words go through the plane's `createLabelPlacer`; `texDen` prints a tiny denominator as `2.5×10⁻³`; the P2 callout says the two spins cancel (`mirrorPair`); readouts write `π` (`Arg z = 2.094 (2π/3)`); problem-chip tooltips use `plainProse`. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md`, `docs/ARCHITECTURE.md` (1 to 10),
`docs/goals/iter-1.json` (entry `i1-station-addresses-arithmetic`), `docs/review/iter-1/wave0-sync.md`, and the wave-0 code as it is
on disk: `js/core/complex.js`, `plane.js`, `katex.js`, `explainer.js`, `staircase.js`, `parse.js`, `theme.js`, `js/data/problems.js`,
`js/registry.js`, `js/app.js`, `css/theme.css`, `css/components.css`, `index.html`, `tests/interact/_helpers.mjs`, `tools/smoke.mjs`.

Status of this design. There is no station code yet, so nothing on disk overrides the signatures in ARCHITECTURE 3. What could be checked
in Node was checked: every pure helper and every TeX template below was prototyped in a throwaway harness outside the repo
(`/tmp/claude-0/-home-user-math-viz/9820ea62-47b0-598f-94da-65a18bf10ac9/scratchpad/aa/`, informational; it may not exist when you read this, and
this document is binding where they differ) and run against the real `complex.js`, `parse.js`, `staircase.js` and `plane.js` (pure parts) and the
vendored KaTeX with `throwOnError: true`. Result: 17,490 addresses and arithmetic cell strings and 1,452 proof strings over a sweep of
points (axes, the negative real axis, surds, halves, zero) rendered with no KaTeX error, and every "same point" flag came out `agree`. Every number in section 6 and every
expected value in section 7 comes from that run, not from memory. What could not be checked in Node (canvas drawing, pointer events,
layout, the animation loop) is specified from reading `plane.js`, `explainer.js` and `staircase.js` as they are, and is covered by the
interaction script in section 7.

---

## 0. Reading notes: decisions, and where this design differs from ARCHITECTURE

ARCHITECTURE 9 pins the ids and readout formats of both stations; they are implemented exactly. Everything below is additive. The decisions a builder or reviewer might
otherwise trip over:

| # | Decision | Why |
|---|---|---|
| D1 | **Soft snap on pointer drags only**, done inside the handle's `onDrag` callback: when `info.source === 'pointer'` and the snap box is ticked, the station computes `snapPoint(z, ...)` and calls `handle.set(snapped, { silent: true })`. Keyboard nudges (`source: 'keyboard'`) and typed values never snap. `addPoint` is called WITHOUT a `snap` option. | Acceptance A2 and A4 drag a handle to (2, 1) and to (1, 0) and then read "2.236", "0.464" and "3 - 2i" out of the readout. A mouse lands within about one pixel of the target, which is 0.01 to 0.02 units, so a free drag would read 2.231 or 3.006 - 2.021i. The plane's own `snap` option is applied to arrow keys too and would pull a 0.1 nudge back onto a 0.5 lattice point, so keyboard users could never leave a lattice point. `handle.set(z, { silent })` inside the callback is allowed (ARCHITECTURE 3.5: `set` is exact and does not call `onDrag` again while a callback runs). |
| D2 | **Mirroring the answer is a toggle**, `#arithmetic-conj-result` ("Then mirror the answer"). Mode chips `#arithmetic-mode-conj` and `#arithmetic-mode-inv` stay unary on z1 exactly as ARCHITECTURE 9 says ("conj and inv apply to z1"). **Every mode change clears the toggle.** | 1.1.2 is `Im(conj(z1 - z2))`: subtract, then mirror. A4 says "clickChip arithmetic-mode-conj after the design's documented way of conjugating the difference (e.g. a 'conj of result' toggle #arithmetic-conj-result)". The documented way is this toggle; section 7 A4 spells the exact steps. Clearing it on a mode change is what makes the last A4 step ("back in mode mul, drag z2 to 1, readout has 3 - 2i") true: a mirrored product would read 3 + 2i. |
| D3 | The **result dot is a non-draggable, non-focusable handle** `#arithmetic-plane-result`, added to the plane BEFORE `z1` and `z2` so it sits under them in the DOM stacking order. | ARCHITECTURE 9 says "result dot". A handle gives the dot an `aria-label` for free ("result: z = 5 + 14i; r = 14.866, θ = 1.228 (Arg)") and hides itself when the result is undefined (`set` with a NaN point). Added first, so that when the result lands exactly on an operand (z2 = 1 puts the result on z1) the operand is still the one you grab. The handle label cannot change after creation, so the text next to the result ("z1 + z2", "conj(z1 - z2)") is drawn by the station's layer. |
| D4 | **No baked TeX colours.** Both explainers use `columns: [{ key:'cart', heading, tone:'--cart', tint:true }, { key:'polar', ..., tone:'--polar', tint:true }]`; the forms panel colours with the shell classes `.tone-cart` and `.tone-polar` on the containing element. The station never calls `cart()`, `polar()`, `input()` or `output()` from `katex.js`, and never subscribes to `themechange`. | A baked `\textcolor{#hex}` goes stale on a theme change and must be re-rendered (ARCHITECTURE 10.3.1). CSS colour inherited into KaTeX output is always current. The canvas needs no subscription either: the plane's hub redraws on `themechange`. |
| D5 | **The `native` badge of the `point` row for × and ÷ is dynamic**: `polar` when both operands have an exact angle (`exactAngle(Arg z) !== null`), else `cart`. Rows `length` and `angle` of × and ÷ are always `polar`. | STORY and the problem table disagree on 1.1.1 on purpose: multiplication is polar-native (angles add, lengths multiply) but the handout's numbers 3 - 2i and -1 + 4i have angles -0.588 and 1.816, so the practical way (data: `address: 'C'`) is to multiply out in x and y, with the polar rows as the check. A static badge would contradict one of them. The dynamic rule shows both truths on one screen and flips honestly as the student drags: (1, 1) times (0, 1) says "easy in Polar", (3, -2) times (-1, 4) says "easy in Cartesian" for the answer and "easy in Polar" for the check. |
| D6 | **TeX numbers never use fractions** except one exact quotient written beside its decimals. A local `texNum(x)` returns an integer, `k\sqrt{3}`, `k\sqrt{2}` or a 3-decimal number; angles use `texAngle` from `complex.js` (exact `\frac{2\pi}{3}` or a decimal). | ARCHITECTURE 10.4.5: the readout is mandated decimal text, so a TeX fraction for the same quantity in the explainer would contradict it. Radicals and exact angles are allowed because the decimal sits beside them (`\sqrt{3} \approx 1.732`). `texNumber` is not used: it would print `\frac{1}{2}` for 0.5. |
| D7 | **Typed fields are parsed with `parse.js`** (`compile(src)`), as constants: x, y, r, θ accept `-16`, `sqrt(3)`, `2pi/3`; the operand fields of the arithmetic station accept `3 - 2i`, `sqrt(3) + i`, `2*exp(i*pi/3)`. Errors show `err.message` verbatim. | The test is full of exact values (√3, 2π/3). The parser is already a pure module with student-readable messages (ARCHITECTURE 10.4.7). |
| D8 | **The view never moves during a drag.** It is set on mount, on preset and mode changes, on committed typed values, on the "Fit" button, and once on pointer release if a key point is out of the picture (zoom out only). | A view that changes under a moving pointer makes the handle jump (the plane maps the pointer with the current transform on every move). |
| D9 | **The arithmetic drawing is a pure function** `scenePlan(S, scale)` that returns primitives (`segment`, `arc`, `dot`, `label`, `circle`) with ids and colour tokens; the layer only maps them to `drawSegment`, `drawArc`, ... | A5 claims things about a screenshot ("a parallelogram", "two stacked arcs ending at the result's ray"). With a pure plan those claims are unit-tested in Node (section 7), and the screenshot only has to confirm the mapping. It is also exposed at `window.__mv.arithmetic.plan()`. |
| D10 | **Station-local CSS is injected once** as `<style data-for="station-addresses">` / `data-for="station-arithmetic"`, tokens only, class prefixes `ax-` and `ar-`. | Same pattern the wave-0 widgets use. `css/components.css` belongs to the shell goal; the shell classes in `i1-shell.md` 2.6 are used as they are and not restyled. |
| D11 | **Small pure helpers are duplicated** in both files (`texNum`, `texCartPair`, `expTex`, `snapPoint`, `latticeStep`, the field parsers), with the same names, kept identical by one unit-test table that runs both copies. | A goal may edit only its own files, and one station importing the other would couple two routes. A shared `js/core/station-kit.js` is requested for iteration 2 (section 10). |
| D12 | **The θ field normalises to the home step.** Typing `8pi/3` moves the dot to the same place as 2π/3, the field then shows `2.094`, and the note says "You typed θ = 8.378. That is one name for this direction (2π/3 + 2π). The home step is Arg z = 2.094 (2π/3)." The staircase widget **relabels** at the seam, it does not slide (ARCHITECTURE 10.3.7), so no copy promises a sliding list. | The arg-versus-Arg difference is the student's own question; typing a non-home name and being told, in one sentence, which name is home is the smallest honest demonstration of it. |
| D13 | **Each station opens with a problem strip** built from `problems.js` (`statementParts`, `addressLabel`, `addressTones`, `addressWhy`, `answer`), with the handout answer behind a closed `<details>` so the student predicts first. | Assignment success criterion 2: "say which address makes it easy and why". The data already carries the sentence. |
| D14 | **Test hooks**: `window.__mv.addresses` and `window.__mv.arithmetic` (section 4), set without replacing `window.__mv`, deleted in `unmount`. | ARCHITECTURE 9 lists no hook for this goal; these make the A3 and A5 geometry claims inspectable at run time. |
| D15 | **"agree" is a real check**: the footer compares the Cartesian route with an independent polar route (`fromPolar(r1 r2, θ1 + θ2)` for ×, `(r1 / r2, θ1 - θ2)` for ÷, `(r, -θ)` for conj, `(1/r, -θ)` for 1/z) and only for `+` and `-` falls back to a round trip through the polar address. | "Both columns agree" (A4) should fail if the polar rule were wrong, not be a tautology. |

Differences found between ARCHITECTURE and the code (the code wins; none changes a signature this goal uses):

- ARCHITECTURE 9 says arithmetic has "handles #arithmetic-plane-z1, -z2, result dot". The result dot is implemented as the handle `#arithmetic-plane-result` (D3).
- `createExplainer` column options are `{ key, heading, tone, tint, short }` and a row's `native` may be a function of the state (`native: (s) => 'polar' | 'cart' | null`). Both are used. A row function returns a TeX string, `null`, or `{ text }`; a bare string is TeX.
- The explainer's footer label is built from `same point: ` plus `agree`, `differ` or `not checked`, so `#<id>-same` starts "same point: agree" exactly when `agree === true`.
- `plane.js` prints angles with the Unicode π ("Arg z = 2π/3", "also 8π/3") while `complex.js` `fmtAngle` prints ASCII ("2pi/3"). Readouts use the ASCII form (A2 searches for "2pi/3"); the plane and the staircase use Unicode on their own.
- `Handle.set(z)` with a non-finite `z` hides the handle and keeps the last finite position; the station relies on that for division by 0 and 1/0.
- `smoke.mjs` runs an interaction script once per viewport (desktop 1280x860, phone 390x844, and desktop-dark with `--dark`), so a script must pass at all of them.

---

## 1. Goal, story thread, problems covered

**Goal.** Two stations that open Thread 1 for the student.

1. **`addresses`, "One Point, Two Addresses".** One draggable dot on the plane with both of its addresses drawn at once: the Cartesian address as dashed `--cart` drop lines to the axes, the polar address as an `--polar` ray from 0 and a solid angle arc, plus fainter extra windings so that `arg z` is visibly a set, and the seam on the negative real axis. Beside it: boxes where you type either address, a live two-column converter (the shared explainer), the shared staircase widget, the two forms the test asks for (polar and exponential), and Euler's formula as the dictionary.
2. **`arithmetic`, "Slide, Spin, Stretch, Mirror".** Two draggable points z1, z2 and a result dot. A mode chip picks +, -, ×, ÷, conj z1 or 1/z1. Adding draws the slide (a parallelogram), multiplying draws two stacked angle arcs that end on the result's ray (spin) and the stretch of lengths, conjugating draws the mirror, 1/z draws the inversion then the mirror. The explainer works the same answer in both addresses and says which one is easy. Below it, proofs P1 and P2 are worked live with the current z1 and z2.

**Story thread carried.** Thread 1 at first contact: *the dot never changes, only its description does.* The point is drawn once in a neutral colour; blue (`--cart`) is only ever where it sits, orange (`--polar`) only ever how to reach it. Thread 2 begins in `addresses`: the same dot has a whole staircase of polar names (`arg z`, faint arcs and the staircase list) and one home name (`Arg z`, the solid arc and the bold step).

**How it shows on screen.**

- `addresses` for z = -1 + i√3: a neutral dot at (-1, 1.732); two dashed blue lines to the axes labelled "x = -1" and "y = 1.732"; an orange ray labelled "r = 2"; a solid orange arc from the positive real axis to the ray labelled "Arg z = 2π/3"; two or three fainter orange arcs outside it labelled "also 8π/3", "also 14π/3", "also -4π/3"; a dashed grey seam on the negative real axis; beside the plane the staircase list with the bold home row "Arg z = 2π/3" between "2π/3 + 2π = 8π/3" and "2π/3 - 2π = -4π/3".
- `arithmetic` in mode ×: two orange arcs stacked from the positive real axis (θ1, then θ2 added on top) that end on the heavy orange result ray, a hollow dot where z1 has been spun but not yet stretched, and a dashed orange segment for the stretch. In mode + the same plane shows a blue parallelogram whose diagonal is the result.

**Review problems and topics covered** (`assignment_refs`; each is worked in section 6, in both addresses, and each is a fixture in section 7):

| Item | Where | What the student sees |
|---|---|---|
| 1.3.1 polar and exponential form of -1 + i√3, Arg(z) | `addresses` (default state, `#problem-1-3-1`) | r = 2, Arg z = 2π/3 in the readout, the explainer, the staircase, the plane labels and the forms panel |
| 1.1.1 z1 z2 and z1/z2 for 3 - 2i and -1 + 4i | `arithmetic` (default state, `#problem-1-1-1`) | 5 + 14i and -11/17 - (10/17)i in the explainer, √13·√17 = √221 and θ1 + θ2 as the polar check, both columns agree |
| 1.1.2 Im(conj(z1 - z2)) | `arithmetic`, mode - with the mirror toggle on (`#problem-1-1-2`) | 4 - 6i, mirrored to 4 + 6i, Im = 6, and r sin θ = 7.211 sin(0.983) = 6 in polar |
| P1 conj z1 · conj z2 = conj(z1 z2) | `arithmetic` proofs panel, and mode conj (`#problem-P1`) | both sides equal 5 - 14i; in polar both sides are r1 r2 e^{-i(θ1+θ2)} |
| P2 \|z\| = √(z · conj z) | `arithmetic` proofs panel, and mode × with z2 = conj z1 (`#problem-P2`) | z z̄ = 13, √13 = 3.606 = \|z\|; in polar the spin and unspin cancel to r² |
| T1.1 algebraic properties (+, -, ×, ÷, Re, Im, conjugates) | both stations | the same arithmetic in x and y |
| T1.3 polar representation (r, θ, arg versus Arg, Euler, × and ÷ geometrically) | both stations | spin-and-stretch, the angle arcs, the staircase, the wrap note |

---

## 2. UX

### 2.1 Wireframes

Both stations use the shell's `.station` flex column. Below 70rem of viewport (the shell's sidebar takes 17.5rem from 56.25rem up, so 70rem leaves a content column of about 790 px) the two-column block stacks.

**`addresses`, desktop (1280 x 860, content column about 950 px).**

```
+----------------------------------------------------------------------------------------------+
| h1  One Point, Two Addresses                                                                  |
| One dot, two ways to say where it is. The Cartesian address says how far across and how far   |
| up. The polar address says which way to turn and how far to walk. ...                         |
| (T1 One point, two addresses) (T2 The staircase)                                      [1.3.1] |
+----------------------------------------------------------------------------------------------+
| PANEL (blue bar) Problem 1.3.1                              [Cartesian, then polar]           |
| Write z = -1 + i√3 in polar form r(cos θ + i sin θ) and exponential form re^{iθ}. What is     |
| Arg(z)?   You are given the Cartesian address (-1, √3) ... read the length and angle off.     |
| > Show the handout answer                                                                     |
+--------------------------------------------+-------------------------------------------------+
| Try a point:                               | PANEL (blue bar)  Cartesian address              |
| (-1 + i√3) (√3 + i) (2i) (-16) (1 + i)     |  x across [ -1       ]   y up [ 1.732     ]      |
| Grid: (Cartesian lines)(Polar)(Both)       | PANEL (orange bar) Polar address                 |
| [x] Show other names of the angle          |  r walk   [ 2        ]   θ turn [ 2.094   ]      |
| [x] Snap to nice values                    |  = 2π/3 = 120°                                   |
| +----------------------------------------+ |  (note line, aria-live)                          |
| |  plane 520 x 520                       | | z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)  |
| |        y|     z . (-1, 1.732)           | |                                                 |
| |  seam ..|... /.                        | | PANEL (orange bar) The angle has many names     |
| |  -------+-----/--- x                   | |  arg z = { 2π/3 + 2πk : k is any integer }      |
| |         |                              | |  Arg z = 2.094 (2π/3)                           |
| +----------------------------------------+ |  Shaded step: the home window (-π, π]. ...      |
| Drag the dot, or Tab to it and use ...     |  | 2π/3 + 4π = 14π/3          14.661 |           |
|                                            |  | 2π/3 + 2π = 8π/3            8.378 |           |
|                                            |  |#Arg z = 2π/3                2.094 |#home band |
|                                            |  | 2π/3 - 2π = -4π/3          -4.189 |           |
|                                            |  | 2π/3 - 4π = -10π/3        -10.472 |           |
|                                            |  (note: Seam crossed ...)   [See it walk -> #staircase]
+--------------------------------------------+-------------------------------------------------+
| h2 The same point, worked both ways                                                           |
| +----------+------------------------------------+---------------------------------------+     |
| |          | Cartesian (across, then up)  blue  | Polar (turn, then walk)  orange       |     |
| | x = Re z | x = -1                  [easy in Cartesian] | x = r cos θ = 2 cos 2π/3 = -1 |     |
| | y = Im z | y = √3 ≈ 1.732                     | y = r sin θ = 2 sin 2π/3 = √3 ≈ 1.732  |     |
| | r = |z|  | r = √(x²+y²) = √((-1)²+(√3)²) = 2  | r = 2                [easy in Polar]  |     |
| | θ = Arg z| θ = atan2(√3, -1) = 2π/3 ≈ 2.094   | θ = Arg z = 2π/3 ≈ 2.094              |     |
| | same     | z = -1 + √3 i                      | z = 2 e^{i 2π/3}                      |     |
| | point:   |                                                                         |     |
| | (o) agree|                                                                         |     |
| +----------+------------------------------------+---------------------------------------+     |
| atan2(y, x) is the angle of the point (x, y) with the quadrant taken into account. ...        |
+-----------------------------------------------------+----------------------------------------+
| PANEL The forms the test asks for                   | CALLOUT (accent bar) Euler's formula is |
|  Cartesian form          z = -1 + √3 i   (blue)      | the dictionary                          |
|  Polar form r(cos θ + i sin θ)  z = 2(cos 2π/3 ...) | e^{iθ} = cos θ + i sin θ ≈ -0.5 + 0.866i |
|  Exponential form re^{iθ}      z = 2 e^{i 2π/3}     | ...                                      |
|  Arg z, the home step    Arg z = 2π/3 ≈ 2.094        |                                          |
|  arg z, every name       arg z = {2π/3 + 2πk : k∈ℤ} |                                          |
+-----------------------------------------------------+----------------------------------------+
| (<- The Map)   (Slide, Spin, Stretch, Mirror ->)   (The Staircase -> thread T2)                |
+----------------------------------------------------------------------------------------------+
```

**`addresses`, phone (390 x 844, content column 358 px).** One column, in this order: header (h1, lede, badges, chip), problem strip (answer `<details>` closed), preset chips (wrap onto 2 lines), grid chips, the two checkboxes, the plane (358 x 358, handle hit areas 44 px under `pointer: coarse`), the hint line, the Cartesian panel (x and y side by side in a 2-column grid, each 100% of its cell), the Polar panel (r and θ side by side, hint under θ), the note, the readout (wraps), the staircase panel, the explainer section (the widget stacks Cartesian above Polar below 560 px), the forms panel (each `dd` scrolls sideways inside its own box), the Euler callout, the links.

**`arithmetic`, desktop.**

```
+----------------------------------------------------------------------------------------------+
| h1  Slide, Spin, Stretch, Mirror                                                              |
| lede ...        (T1 One point, two addresses)      [1.1.1] [1.1.2] [P1] [P2]                  |
+----------------------------------------------------------------------------------------------+
| PANEL (blue bar) Problem 1.1.1                                    [Cartesian]                 |
| Let z1 = 3 - 2i and z2 = -1 + 4i. Compute z1 z2 and z1/z2 in the form x + iy.                |
| The angles of 3 - 2i and -1 + 4i are not nice, so multiplying out in (x, y) is exact; ...     |
| > Show the handout answer                                                                     |
+----------------------------------------------------------------------------------------------+
| Operation:  (z1 + z2) (z1 - z2) (z1 × z2 *) (z1 ÷ z2 [part 2]) (conj z1) (1 / z1)             |
|             (Load 1.1.1: 3 - 2i and -1 + 4i)                                                  |
+--------------------------------------------+-------------------------------------------------+
|  plane 520 x 520                           | PANEL (green bar) The two points                |
|        y|       . result (5, 14)            |  z1 = [ 3 - 2i        ]  (error line)           |
|         |      /                           |  z2 = [ -1 + 4i       ]                         |
|   z2 .  |     /  arcs: θ1 then θ2          | [ ] Keep z2 as the mirror of z1                 |
|      \  |   o spun z1                      | (Then mirror the answer (conj))  (disabled in   |
|  ------\+---------- x                      |  conj and 1/z modes)                            |
|         | z1                               | [x] Snap to nice values                         |
|                                            | (Play: spin, then stretch)  (Fit the view)      |
|                                            | caption: Press Play to watch the move.          |
| Drag z1 or z2 ...                          | note line (aria-live)                           |
|                                            | result = 5 + 14i; |result| = 14.866; Arg = 1.228|
|                                            | wrap note (only when the angle sum leaves (-π,π])|
+--------------------------------------------+-------------------------------------------------+
| h2 The same answer, worked in both addresses                                                  |
| +---------+-------------------------------------+---------------------------------------+     |
| |         | Cartesian (slide)                   | Polar (spin-and-stretch)              |     |
| | z1, z2  | z1 = 3 - 2i, z2 = -1 + 4i           | z1 = 3.606 e^{-i 0.588}, z2 = ...     |     |
| | z1 × z2 | (x1x2 - y1y2) + i(x1y2 + x2y1) = ... = 5 + 14i   [easy in Cartesian]        |     |
| |         |                                     | r e^{iθ} = 14.866(cos 1.228 + ...) ≈ 5 + 14i |
| | length  | √(x²+y²) = √(5²+14²) = √221 ≈ 14.866| r1 r2 = √13·√17 = √221 ≈ 14.866 [easy in Polar] |
| | angle   | atan2(14, 5) ≈ 1.228                | θ1 + θ2 = -0.588 + 1.816 = 1.228 = Arg(z1 z2) [easy in Polar] |
| | same    | 5 + 14i                             | 14.866 e^{i 1.228}                    |     |
| | (o) agree                                                                         |     |
| +---------+-------------------------------------+---------------------------------------+     |
| CALLOUT (orange bar)  why-line for the mode                                                   |
+----------------------------------------------------------------------------------------------+
| PANEL #arithmetic-proofs   Two proofs, worked live                                            |
| [P1] conj z1 · conj z2 = conj(z1 z2)           | [P2] |z| = √(z · conj z), with z = z1       |
|  explainer arithmetic-p1 (lhs, rhs, same)      |  explainer arithmetic-p2 (z z̄, √, same)       |
|  Cartesian proof (blue bar) ... Polar proof (orange bar) ...  (from problems.js routes)       |
+----------------------------------------------------------------------------------------------+
| (<- One Point, Two Addresses) (Length, Distance, Circles ->)                                   |
+----------------------------------------------------------------------------------------------+
```

**`arithmetic`, phone.** One column in this order: header, problem strip, the Operation panel (six chips wrap onto two lines, the preset button under them), the plane, the hint, the Two points panel (full-width fields, then the checkboxes and the mirror chip, then Play and Fit side by side), the caption, the note, the readout, the wrap note, the explainer (stacked), the why callout, the proofs panel (P1 above P2, each explainer stacked), the links.

### 2.2 Controls

Every control has a stable id prefixed by the station id, a visible `<label>` or text, and a focus ring from the shell (`:focus-visible`).

**`addresses`**

| id | Element | Label | Behaviour |
|---|---|---|---|
| `addresses-plane` (plane id), `addresses-plane-z` (handle) | plane + handle button | handle label "z" | Drag, or Tab to the handle and use the arrow keys (step 0.1, Shift x10, Alt /10; Esc cancels a drag). The plane itself zooms with + and -, resets with 0, pans with arrows when focused. |
| `addresses-preset-m1-sqrt3i`, `-sqrt3-i`, `-2i`, `-m16`, `-1-i` | `button.chip` (aria-pressed) | "-1 + i√3", "√3 + i", "2i", "-16", "1 + i" (with a real minus sign in the visible text) | Sets z exactly, refits the view, makes that view the plane's Reset view. `aria-pressed="true"` while z equals that preset within 1e-9, so a drag un-presses it. |
| `addresses-grid-cart`, `-polar`, `-both` | `button.chip` (aria-pressed), group "Grid" | "Cartesian lines", "Polar circles and rays", "Both" | `plane.setGrid('cart' | 'polar' | 'both')`. Default `cart`. |
| `addresses-ghosts` | checkbox | "Show other names of the angle" | Draws the faint extra windings (default on). The staircase list is always shown. |
| `addresses-snap` | checkbox | "Snap to nice values" | Turns the soft snap of pointer drags on or off (default on). |
| `addresses-x`, `-y` | `input.num`, `type="text"`, `inputmode="decimal"` | "x (across)", "y (up)" | Live on `input` when the text parses, committed and normalised on `change`. Accepts `-16`, `sqrt(3)`, `2pi/3`. |
| `addresses-r`, `-theta` | same | "r (walk)", "θ in radians (turn)" | `r` must be >= 0; θ may be any real (D12). Accepts the same expressions. |
| `addresses-theta-hint` | `span` | (no label) | Live text "= 2π/3 = 120°" beside θ. |
| `addresses-note` | `p[aria-live=polite]` | | Messages: preset loaded, typed-angle explanation, errors. |
| `addresses-readout` | `div.readout` | | `z = <cart>; |z| = <r>; Arg z = <theta> (<exact>)` |
| `addresses-stairs-*` | staircase widget (`createStaircase`, id `addresses-stairs`) | | rows k = -2..2, ids `addresses-stairs-k2` ... `addresses-stairs-k-2`, `addresses-stairs-set`, `-arg`, `-window`, `-note` |
| `addresses-ex-*` | explainer (id `addresses-ex`) | | rows `x`, `y`, `r`, `theta`; cells `addresses-ex-<row>-cart` / `-polar`; footer `addresses-ex-same` |
| `addresses-forms`, `addresses-form-cart`, `-polar`, `-exp`, `-arg-home`, `-arg-set` | `dl` of KaTeX | see 2.5 | Live; the answer to 1.3.1 for whatever z is on the plane. |
| `addresses-euler` | `aside.callout` | | static prose + one live KaTeX line `addresses-euler-live` |
| `addresses-problem`, `-problem-statement`, `-problem-why`, `-answer` (`details`), `-answer-tex`, `-answer-text` | strip | | `details` opens lazily: KaTeX renders on first open. |
| `addresses-to-staircase` | `a.chip` href `#staircase` | "See it walk around the origin" | link |
| `addresses-links` | `nav.station-links` | | previous, next and thread neighbours (5.2.12) |

**`arithmetic`**

| id | Element | Label | Behaviour |
|---|---|---|---|
| `arithmetic-plane`, `-plane-z1`, `-plane-z2`, `-plane-result` | plane + three handles | "z₁", "z₂", (result has no DOM label) | z1, z2 draggable (arrows, Shift, Alt, Esc as above). `result` is not focusable and not draggable. |
| `arithmetic-mode-add`, `-sub`, `-mul`, `-div`, `-conj`, `-inv` | `button.chip` (aria-pressed), group "Operation" | "z₁ + z₂", "z₁ − z₂", "z₁ × z₂", "z₁ ÷ z₂", "conj z₁", "1 / z₁" | Exactly one pressed. Changing mode: clears the mirror toggle, stops any animation, switches the grid (+ and − `cart`; ×, ÷ and 1/z `polar`; conj `cart`), swaps the explainer rows, refits the view. |
| `arithmetic-preset-1-1-1` | `button.chip` | "Load 1.1.1: 3 − 2i and −1 + 4i" | z1 = 3 - 2i, z2 = -1 + 4i, mode ×, mirror off, lock off, refit. |
| `arithmetic-z1-input`, `arithmetic-z2-input` | `input`, `type="text"`, `spellcheck="false"` | "z₁ =", "z₂ =" | Complex constant, parsed with `compile`. Live on `input`, committed on `change`. Error text in `arithmetic-z1-error` / `arithmetic-z2-error` (`role="alert"` only after a commit). |
| `arithmetic-lock-conj` | checkbox | "Keep z₂ as the mirror of z₁" | While on, z2 is always conj z1; dragging either handle moves the pair; typing in either field sets both. Turning it on sets z2 = conj z1. |
| `arithmetic-conj-result` | `button.chip` (aria-pressed) | "Then mirror the answer (conj)" | Appends a mirror step to + − × ÷. `aria-disabled="true"` and no effect in conj and 1/z modes. Cleared by any mode change (D2). |
| `arithmetic-snap` | checkbox | "Snap to nice values" | as in `addresses` |
| `arithmetic-animate` | `button.btn` | per mode (2.5) | Plays the move (D9 timeline). Becomes "Stop" while playing. Under reduced motion it is a stepper (5.3.9). |
| `arithmetic-fit` | `button.btn` | "Fit the view" | `plane.fitTo(fitPoints, 0.18)` |
| `arithmetic-caption` | `p[aria-live=polite]` | | "Press Play to watch the move." or the caption of the current phase |
| `arithmetic-note` | `p[aria-live=polite]` | | undefined results, off-picture result |
| `arithmetic-readout` | `div.readout` | | `result = <cart>; |result| = <r>; Arg = <theta>` |
| `arithmetic-wrap-note` | `p` | | visible only when θ1 ± θ2 leaves (-π, π] |
| `arithmetic-ex-*` | explainer (id `arithmetic-ex`) | | rows `inputs`, `point`, `length`, `angle`, and with the mirror `mirror`, `im`; cells `arithmetic-ex-<row>-cart` / `-polar`; footer `arithmetic-ex-same` |
| `arithmetic-why` | `aside.callout` | | the per-mode sentence (2.5) |
| `arithmetic-proofs` | `section.panel` | "Two proofs, worked live" | contains the two explainers below |
| `arithmetic-p1-*`, `arithmetic-p2-*` | explainers (ids `arithmetic-p1`, `arithmetic-p2`) | | rows `lhs`, `rhs` (P1) and `zzbar`, `sqrt` (P2); footers `arithmetic-p1-same`, `arithmetic-p2-same` |
| `arithmetic-p1-chip`, `arithmetic-p2-chip` | `a.chip.problem-chip` | "P1", "P2" | hrefs `#problem-P1`, `#problem-P2` |
| `arithmetic-problem`, `-problem-statement`, `-problem-why`, `-answer`, `-answer-tex`, `-answer-text` | strip | | as in `addresses` |
| `arithmetic-links` | `nav.station-links` | | |

Root attributes for tests: `section.station` gets `data-grid` (addresses) or `data-mode` and `data-conj-result` (arithmetic).

### 2.3 Interaction

**Pointer and touch.** All dragging is the plane's handle machinery (pointer events, capture, 44 px hit areas on coarse pointers, 10 px inset clamp). Dragging empty canvas pans, two fingers pinch-zoom, wheel zooms only with focus or Ctrl/Cmd (the page scrolls otherwise). The station adds one thing: soft snap (D1).

*Soft snap.* The lattice step depends on the zoom (`latticeStep(unitsAcross)`: 0.25 up to 4 units across, 0.5 up to 12, 1 up to 48, else 5). Each coordinate independently jumps to the nearest lattice value when it is within `min(5 px, 0.3 lattice steps)` of it, so the pull is a few pixels at most and never swallows the whole plane. At the default 8 units across the lattice is 0.5; (2, 1), (1, 0), (-1, 1.5) and (0, 2) are all reachable exactly.

**Keyboard.**

- Tab reaches, in order: the preset chips, grid chips, the two checkboxes, the plane (zoom and pan keys), the dot, then the inputs.
- On the dot: arrows move it by 0.1 (Shift 1, Alt 0.01) with no snapping; the plane announces both addresses of the new position ("z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)").
- On a text field: type, Enter or Tab commits. Escape does nothing special.
- On the arithmetic mode chips: Enter or Space selects. The keyboard path for A4 is the same as the mouse path.
- The explainer and staircase are read-only.

**Typed input rules** (both stations, 5.1.9):

- On `input`: if the text parses and passes the range check, apply it now without rewriting the field the student is typing in. If it does not parse, do nothing (so "-", "1." and "sqrt(" do not flash errors).
- On `change`: if it parses, apply and rewrite the field with the normalised text; if not, show the message in the note (or the field's error line), set `aria-invalid="true"` on the field, and leave the state as it was.
- While a value is being typed live, the box being typed in is left alone and every other box follows; a drag, a preset or a commit rewrites all of them.

### 2.4 States

| State | What the student sees |
|---|---|
| Loading | Nothing station-specific: the router shows its own "Loading..." after 150 ms. `mount` is synchronous, so the first paint has the plane, readout and explainer filled. |
| Empty | There is no empty state: both stations always have a default point (-1 + i√3) or pair (3 - 2i, -1 + 4i). |
| z = 0 (`addresses`) | Readout `z = 0; |z| = 0; Arg z = undefined`. The ray, arcs and labels vanish. Staircase shows "arg z is not defined here". Explainer: the θ cells read "θ = atan2(0, 0) is undefined" and "every angle reaches 0"; the footer says "not checked". The staircase widget says, in its own words, "The point 0 has no angle. Every direction reaches it, so arg z is not defined." |
| z on the negative real axis | Arg = π (never -π), readout `Arg z = 3.142 (pi)`, the arc sweeps half a turn, the seam and the ray coincide (the plane places its labels around that). |
| Typed value rejected | The field keeps the student's text, shows `aria-invalid`, and the note (or the field's error line) shows `err.message` from the parser or the range sentence. The point does not move. |
| Result undefined (`arithmetic`) | z2 = 0 in ÷, or z1 = 0 in 1/z: readout `result = undefined; |result| = undefined; Arg = undefined`; the result handle is hidden; the explainer's rows show `\text{undefined}` and the footer "not checked"; Play is disabled with a title "There is nothing to play: the result is undefined."; note: "z₂ is 0, so z₁ ÷ z₂ is undefined." (or "z₁ is 0, so 1/z₁ is undefined."). |
| Result off the picture | Note (polite): "The result is off the picture. Let go and the view will zoom out to fit it." While dragging only; after release the view zooms out once. |
| Result is 0 (× with a zero factor, conj 0) | Readout `result = 0; |result| = 0; Arg = undefined`; angle rows read "no angle at 0". |
| Canvas unavailable | The plane shows its own note ("This picture needs canvas drawing ..."); the inputs, readout, explainer, staircase and forms still work. |
| KaTeX missing | `tex()` falls back to the raw TeX text with class `tex-error`; everything else works. |
| `mount` throws | The router shows "This station is under construction." with the error in "What went wrong". `mount` must undo what it built before rethrowing (5.2.14). |

### 2.5 Copy (exact text)

Plain, direct, for a student the night before the test. No emoji. Angles say whether they are `arg` or `Arg` (ARCHITECTURE 10.4.6). Unicode math symbols are fine in visible copy; readouts are ASCII.

**`addresses`**

| Where | Text |
|---|---|
| h1 | One Point, Two Addresses (registry title) |
| lede | One dot, two ways to say where it is. The Cartesian address says how far across and how far up. The polar address says which way to turn and how far to walk. Drag the dot and watch both change. The dot never moves because of how you describe it. |
| problem strip title | Problem 1.3.1 |
| problem strip, why line | the data's `addressWhy` for 1.3.1, rendered with `prose()` |
| `details` summary | Show the handout answer |
| presets group label | Try a point |
| grid group label | Grid |
| grid chips | Cartesian lines / Polar circles and rays / Both |
| grid sentence under the chips | Cartesian grid: the lines x = c and y = c. Polar grid: the circles r = c and the rays θ = c. Each address finds its own shapes natural. |
| checkbox labels | Show other names of the angle / Snap to nice values |
| hint under the plane | Drag the dot, or Tab to it and use the arrow keys (Shift moves 10 times as far). Snap helps you land on round numbers; turn it off to move freely. The dashed grey ray is the seam: cross it and Arg jumps from π to −π. |
| Cartesian panel title and line | Cartesian address / x across, y up. The dashed blue lines. |
| Polar panel title and line | Polar address / Turn by θ, walk r. The orange ray and arc. |
| field labels | x (across), y (up), r (walk), θ in radians (turn) |
| θ hint | live, "= 2π/3 = 120°", "= 26.6°" (5.1.7) |
| note: preset | Loaded −1 + i√3. (the preset's label) |
| note: typed θ outside the window | You typed θ = 8.378. That is one name for this direction (2π/3 + 2π). The home step is Arg z = 2.094 (2π/3). |
| note: typed θ and r = 0 | r is 0, so every angle gives the same point. The angle is kept for when you raise r. |
| note: negative r | A length cannot be negative. To reach the opposite side, keep r positive and add π to θ. |
| note: range | Keep it between -100 and 100 so the picture stays readable. |
| note: not real | That has an i in it. This box takes a real number. |
| note: not constant | Use numbers only here, without z, x or y. |
| note: empty field | Type a number, like -1 or 1.732 or sqrt(3). |
| note: parse error | `err.message` from `parse.js`, verbatim |
| staircase panel title | The angle has many names |
| staircase sentence | arg z is every angle that reaches the dot: θ + 2πk. Arg z is the one name inside (−π, π]. The dot is the same for all of them. |
| explainer section title | The same point, worked both ways |
| explainer sentence | Each number is read off the picture in its own address and computed from the other one. "Easy in Cartesian" means you just read it off; "easy in Polar" the same. |
| explainer caption (the table title) | Convert in either direction |
| explainer column headings | Cartesian (across, then up) / Polar (turn, then walk) |
| explainer row labels | x = Re z / y = Im z / r = \|z\| / θ = Arg z |
| atan2 sentence | atan2(y, x) is the angle of the point (x, y), with the quadrant taken into account. It always lands in (−π, π], so it is Arg z. |
| forms panel title | The forms the test asks for |
| forms labels | Cartesian form / Polar form r(cos θ + i sin θ) / Exponential form re^{iθ} / Arg z, the home step / arg z, every name |
| forms at z = 0 | z = 0 has no polar form: r is 0 and every angle gives the same point. |
| Euler callout title and text | Euler's formula is the dictionary. e^{iθ} = cos θ + i sin θ is the point on the unit circle at angle θ. Multiply it by r and you reach z. |
| link to staircase | See it walk around the origin |

**`arithmetic`**

| Where | Text |
|---|---|
| h1 | Slide, Spin, Stretch, Mirror (registry title) |
| lede | Adding slides the plane. Multiplying spins it and stretches it. Conjugating mirrors it. Pick an operation, drag the two points, and read the answer in both addresses. Do the question in the address where it is easy, and use the other column as your check. |
| operation group label | Operation |
| chips | z₁ + z₂ / z₁ − z₂ / z₁ × z₂ / z₁ ÷ z₂ / conj z₁ / 1 / z₁ |
| 1.1.1 hint badges | "part 1" on the × chip and "part 2" on the ÷ chip while the 1.1.1 preset is loaded and the mode is ×; both badges disappear on the first mode change |
| preset button | Load 1.1.1: 3 − 2i and −1 + 4i |
| points panel title | The two points |
| field labels | z₁ = / z₂ = |
| field help (under both) | Type a complex number like 3 - 2i or sqrt(3) + i. |
| toggle labels | Keep z₂ as the mirror of z₁ / Then mirror the answer (conj) / Snap to nice values |
| Play labels | + : Play: slide / − : Play: slide back / × : Play: spin, then stretch / ÷ : Play: unspin, then shrink / conj : Play: mirror / 1/z : Play: invert, then mirror; while playing: Stop; stepper: Next step (1 of 2), Next step (2 of 2), Start over |
| Fit | Fit the view |
| caption (idle) | Press Play to watch the move. |
| phase captions | slide: "Slide z₁ by z₂: across by x₂, up by y₂." / slide back: "Slide z₁ back by z₂." / spin: "Spin z₁ by the angle of z₂." / unspin: "Spin z₁ back by the angle of z₂." / stretch: "Stretch by the length of z₂." / shrink: "Shrink by the length of z₂." / invert: "Invert the length: r becomes 1/r, on the same ray." / mirror: "Mirror across the real axis." / final mirror: "Mirror the answer across the real axis." |
| done (polite) | Done. The result is 5 + 14i. (the readout's result text) |
| explainer title | The same answer, worked in both addresses |
| explainer row labels | z₁, z₂ / z₁ + z₂ (or −, ×, ÷, conj z₁, 1/z₁) / length / angle / then mirror / Im of the answer |
| why line | the per-mode sentence, 5.3.4 |
| wrap note | The angles add to 3.632, which is past π. The same direction has the home name Arg = −2.652 (3.632 − 2π). (numbers live) |
| proofs title | Two proofs, worked live |
| proofs sentence | Both use the z₁ and z₂ above. Drag them: the numbers change, the equality does not. |
| P1 title | P1: conj z₁ · conj z₂ = conj(z₁ z₂) |
| P2 title | P2: \|z\| = √(z · conj z), with z = z₁ |
| proof route labels | Cartesian proof / Polar proof (the text is `routes.cart` and `routes.polar` of the problem, through `prose()`) |
| notes | z₂ is 0, so z₁ ÷ z₂ is undefined. / z₁ is 0, so 1/z₁ is undefined. / The result is off the picture. Let go and the view will zoom out to fit it. |
| field errors | as in `addresses`, with "Type a complex number like 3 - 2i or sqrt(3) + i." for an empty field and "Keep both parts between -100 and 100 so the picture stays readable." for a range error |

Header copy shared by both stations: thread badges read `T1 One point, two addresses` (and `T2 The staircase: z, arg z, Arg z` for `addresses`), with the thread's `summary` in `title`; problem chips are `1.3.1`, or `1.1.1`, `1.1.2`, `P1`, `P2`, each with the problem's `aha` in `title`.

---

## 3. Visual encoding

Colours are tokens from `css/theme.css`; canvas code reads them through the plane helpers (`'--cart'` etc. are passed as strings and resolved at draw time), CSS uses `var(--token)`. No literal colours in either file. The two themes differ only in the token values, so everything below holds in both. Contrast of the tokens on `--surface` (computed): light cart 6.17, polar 6.06, input 6.26, output 6.17, seam 4.76; dark cart 7.12, polar 8.30, input 8.71, output 7.43, seam 5.95 (all at least 4.5, so labels and lines pass; dashes and labels carry the meaning too, so colour is never the only cue).

### 3.1 The two-address code, as drawn

| Thing | Token | Line style | Where |
|---|---|---|---|
| the point z | `--text` | filled dot, 14 px, with a `--surface` ring (the plane's handle dot; handle `color: '--text'`) | `addresses` |
| Cartesian address: drop lines, feet dots, "x = ..." and "y = ..." | `--cart` | dashed `DASH.cart` [5, 4], 1.5 px (the `drawCartAddress` helper) | `addresses` |
| Polar address: ray labelled "r = ..." | `--polar` | solid 2 px (the `drawPolarAddress` helper) | `addresses` |
| `Arg z`: the ONE highlighted step | `--polar` | solid arc 2.5 px with an arrowhead, label "Arg z = 2π/3"; in the staircase the bold `k = 0` row with the shaded home band | `addresses` |
| `arg z`: the set | `--polar` | faint arcs outside the solid one (alpha at most `--ghost-alpha` = 0.35, fading 20% per winding to 40%), each ending in a small arrowhead, labelled "also 8π/3" (up to three); the staircase rows with ghost marks | `addresses` |
| the seam (negative real axis) | `--seam` | dashed `DASH.seam` [8, 5], 2 px, label "seam" | `addresses` |
| Cartesian grid / polar grid | `--cart` / `--polar` | the plane's grid, alpha 0.16 / 0.24 (cart, light / dark) and 0.20 / 0.28 (polar) | both |
| explainer columns, headings, stripes, native badge | `--cart` / `--polar` via `tone` and `tint: true` | 3 px stripe, 3 px heading underline, tinted native cell | both |
| forms panel | `.tone-cart` on the Cartesian form, `.tone-polar` on the other four | text colour | `addresses` |
| operands z1, z2 | `--input` | filled dots (handles `color: '--input'`), labels "z₁", "z₂" | `arithmetic` |
| the result | `--output` | filled dot (handle `color: '--output'`), label drawn next to it in `--output` | `arithmetic` |
| slide (+, -): vectors, parallelogram, diagonal | `--cart` | vectors from 0 solid 2 px with arrowheads; translated copies dashed 1.5 px; the result diagonal solid 3 px with an arrowhead | `arithmetic` |
| spin and stretch (×, ÷): rays, arcs, stretch | `--polar` | rays from 0 to z1 and z2 thin 1.5 px dashed `DASH.guide`; the result ray heavy 3 px solid with an arrowhead; two solid angle arcs 2.5 px at radii Ra and Ra + 14 px; hollow ring where z1 has been spun; the stretch segment dashed `DASH.guide` | `arithmetic` **Superseded in residue cleanup:** the heavy result ray `s-ray-result` ends at the nearer of the ring (z₁ spun) and the result and carries its arrowhead only when it ends on the result; the dashed `s-stretch` runs from the ring to the result, so the two never overlap. |
| mirror (conj, 1/z, and "then mirror") | `--cart` for the vertical hop (y becomes -y is a Cartesian move), `--polar` for the two angle arcs θ and -θ | dashed connector 2 px; arcs solid | `arithmetic` |
| unit circle (1/z) | `--polar` | dashed `DASH.guide`, 1.5 px | `arithmetic` |

### 3.2 Input versus output, and time

- `arithmetic` is the only place in this goal with an input-to-output relation: z1 and z2 are the inputs (`--input`), the result is the output (`--output`). No plane is split in two.
- **Time.** The Play animation draws a trail with `plane.addCurve({ ramp: true, color: '--output' })`: lightness along the trail is time (dark `--t0` at the start to bright `--t1` at the end, dots at t = 0, 1/4, 1/2, 3/4, an arrowhead at t = 1, the plane's "start ... end" legend pill). The traveller is a ring at the current point in `--output`. This is the same ramp every mapping station will use, met here for the first time.

### 3.3 arg versus Arg, in both stations

- `addresses`: the plane draws `Arg z` as the one solid arc and `arg z` as the faint windings and the staircase list (rule 10.1.7). The point is drawn once. The word "Arg" is used only for the home step; every other angle is "a name for this direction", "another name", or "also ...".
- `arithmetic`: the stacked arcs show NAMES of angles (θ1 then θ2, any step is a valid name). The home step appears in the readout (`Arg = ...`), the explainer angle row (`= Arg(z1 z2)`) and, when the sum leaves (-π, π], the wrap note (3.632 becomes -2.652). Nothing in this station writes `arg` as if it were a number.

### 3.4 Both themes

- Canvas: plane helpers read the tokens at draw time and redraw on `themechange` (the plane hub); the station's layers only pass token names, so there is nothing to refresh by hand.
- DOM: widgets and shell classes use tokens; the station CSS (5.2.13, 5.3.13) uses `var(--token)` only.
- The screenshots in section 7 are taken in light and with `--dark`.

---

## 4. Module API

### 4.1 `js/stations/addresses.js`

Imports (all relative, no bare specifiers):

```js
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, prose } from '../core/katex.js';
import { Arg, fromPolar, wrapArg, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle, eq } from '../core/complex.js';
import { compile } from '../core/parse.js';
import { problemById, problemsForStation, statementParts, addressLabel, addressTones } from '../data/problems.js';
```

No top-level DOM access, no timers, no side effects at import (the unit tests import this file in Node).

```js
export const ZERO_EPS = 1e-9;                      // |z| below this is the origin
export const PRESETS;                              // frozen: [{ id, label, z }] for 'm1-sqrt3i' (-1 + i√3), 'sqrt3-i', '2i', 'm16', '1-i'; z built from Math.sqrt(3), never typed decimals

// pure helpers (5.1)
export function texNum(x)                          // → TeX string: integer | k\sqrt{3} | k\sqrt{2} | 3-decimal number; never a fraction
export function texCartPair(x, y)                  // → "-1 + \sqrt{3}\,i", "2i", "-i", "3", "1.5 - 0.5i"
export function expTex(theta)                      // → "e^{i\,\frac{2\pi}{3}}", "e^{-i\,0.322}" (sign moved in front of i)
export function polarTeX(z)                        // → "2\,e^{i\,\frac{2\pi}{3}}", "0" at the origin
export function trigArg(T)                         // → T, or \left(T\right) when T starts with '-'
export function angleText(theta, { unicode = false } = {})   // → "2.094 (2pi/3)", "3.142 (pi)", "0.464", "undefined"; unicode: true writes π
export function thetaHint(theta)                   // → "= 2π/3 = 120°", "= 26.6°"
export function latticeStep(unitsAcross)           // → 0.25 | 0.5 | 1 | 5
export function snapPoint(z, unitsAcross, widthPx, tolPx = 5)   // → { re, im }, never -0
export function viewSpanFor(m)                     // → smallest ladder value >= 2.5 m
export function cleanZ(z, r)                       // → z with components below 1e-12 * max(1, r) set to 0
export function parseRealField(src, { max = 100 } = {})   // → { ok: true, value } | { ok: false, message }
export function ghostCounts(rayPx, enabled = true)         // → { pos, neg }

// model and text (5.2)
export function addressModel(z)                    // → { z, x, y, r, theta, isZero }; theta = Arg z, or null at the origin
export function addressReadout(m)                  // → "z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)"
export function addressCells(m)                    // → { x, y, r, theta: { cart, polar }, same: { cart, polar, agree } } (TeX strings, untinted)
export function addressForms(m)                    // → { cart, polar, exp, argHome, argSet } (TeX) | null at the origin

export function mount(el, ctx)                     // → unmount()
```

**State** (closure variables inside `mount`, not exported):

```js
S = {
  z: { re, im },            // the one source of truth
  lastTheta: 2π/3,          // Arg of the last non-zero z, used when typing r or θ at the origin
  grid: 'cart',             // 'cart' | 'polar' | 'both'
  ghosts: true, snap: true,
  userView: false,          // true once the student pans or zooms by hand (plane 'viewchange' reason 'pan' | 'zoom')
  pressedPreset: 'm1-sqrt3i' | null,
}
```

**Events listened to.** Plane handle `onDrag(z, { final, source })`; plane `on('viewchange')`; DOM `click` on chips, `change` on the checkboxes, `input` and `change` on the four fields, `toggle` on the answer `<details>`. Nothing on `window` or `document`. No store keys. No `themechange` subscription (D4).

**Test hook.** `window.__mv.addresses = { state(), drawn() }`:
`state()` returns `{ z, r, theta, grid, ghosts, snap, userView }` (copies); `drawn()` returns the `{ pos, neg }` ghost counts used by the last draw.

### 4.2 `js/stations/arithmetic.js`

Imports: the same as above (without `drawCartAddress`, `drawPolarAddress`, `drawSeam`, `createStaircase`), plus `add`, `sub`, `mul`, `div`, `conj`, `inv`, `expi`, `scale`, `isFiniteC` from `complex.js`, and from `plane.js` `drawSegment`, `drawArc`, `drawCircle`, `drawDot`, `drawLabel` (the animation trail uses `plane.addCurve`, so `drawTimedCurve` is not imported).

```js
export const MODES;                                // ['add', 'sub', 'mul', 'div', 'conj', 'inv']
export const MODE_LABELS;                          // { add: 'z₁ + z₂', sub: 'z₁ − z₂', mul: 'z₁ × z₂', div: 'z₁ ÷ z₂', conj: 'conj z₁', inv: '1 / z₁' }

// same pure helpers as addresses.js, same names and behaviour (D11)
export function texNum(x), texCartPair(x, y), expTex(theta), polarTeX(z), trigArg(T), angleText(theta, { unicode = false } = {})
export function latticeStep(unitsAcross), snapPoint(z, unitsAcross, widthPx, tolPx = 5)
export function parseComplexField(src, { max = 100 } = {})   // → { ok: true, value: {re, im} } | { ok: false, message }

export function applyMode(mode, z1, z2, { conjResult = false } = {})   // → { value, result }; value = op(z1, z2); result = conj(value) when conjResult and the mode is add | sub | mul | div; NaN parts when undefined
export function arithmeticModel(S)                 // S = { mode, z1, z2, conjResult } → M (4.3)
export function arithmeticReadout(M)               // → "result = 5 + 14i; |result| = 14.866; Arg = 1.228"
export function arithmeticRows(M)                  // → [{ id, label, native }] for the explainer, in order
export function arithmeticCells(M)                 // → { undef: true } | { rows: { [id]: { cart, polar } }, same: { cart, polar, agree } }
export function whyText(M)                         // → { tone: 'cart' | 'polar' | 'accent', text }
export function wrapNote(M)                        // → "" | "The angles add to 3.632, ..."
export function proofsModel(z1, z2)                // → { p1: { lhs, rhs, same }, p2: { zzbar, sqrt, same } } (TeX per column, plus agree)
export function scenePlan(S, scale)                // → { prims, fit }  (5.3.6)
export function phasesFor(S)                       // → Phase[]  (5.3.8)
export function pointAt(phase, s)                  // → {re, im}; s in [0, 1]
export function travelerAt(phases, u)              // → {re, im} | null; u in [0, 1] over all phases, eased per phase

export function mount(el, ctx)                     // → unmount()
```

**Test hook.** `window.__mv.arithmetic = { state(), plan() }`: `state()` returns `{ mode, z1, z2, conjResult, lockConj, result, anim: { kind, step, u, point } }` (copies; `anim.kind` is `idle`, `playing`, `stopped`, `done` or `stepped`); `plan()` returns the last `scenePlan` result (`{ prims, fit }`), so a script can count arcs and read segment endpoints.

### 4.3 Data structures

```js
// arithmetic state (closure inside mount)
S = { mode: 'mul', z1: {re:3, im:-2}, z2: {re:-1, im:4}, conjResult: false, lockConj: false, snap: true,
      userView: false, hint: '1.1.1' | null,          // hint drives the "part 1 / part 2" badges
      anim: { kind: 'idle' | 'playing' | 'stepped', startMs, u, step, phases, trail: [{re, im, t}] } }

// model (pure; arithmeticModel(S))
M = {
  mode, z1, z2, conjResult, binary,                    // binary = mode is add | sub | mul | div
  a: { r, theta }, b: { r, theta },                    // polar addresses of the operands (theta = Arg, 0 at the origin)
  value, result,                                       // before and after the optional mirror
  undefinedResult,                                     // value has a NaN part
  zeroResult,                                          // |value| < 1e-9 (and not undefined)
  pv, pw,                                              // { r, theta } of value and result
  route,                                               // { r, theta } by the polar RULE for the final result (D15)
  agree,                                               // true | false | undefined (not checked)
  wrap,                                                // for mul and div: { raw, home, wrapped } else null
  niceAngles,                                          // both operands have an exact Arg
  native: { inputs: null, point, length, angle, mirror, im },   // each 'cart' | 'polar' | null
}

// scene primitives (scenePlan)
{ type: 'segment', id, a, b, token, width, dash: null | 'cart' | 'guide', arrow }
{ type: 'arc', id, radiusPx, from, to, token, width, arrow }          // centre 0; radians, counterclockwise; from > to is clockwise
{ type: 'dot', id, z, token, hollow }
{ type: 'circle', id, center, radius, token, dash }                   // radius in plane units
{ type: 'label', id, z, text, token, dx, dy, align }

// phase (phasesFor)
{ kind: 'slide' | 'spin' | 'stretch' | 'mirror' | 'invert', from, to, angle?, factor?, caption }
```

### 4.4 Lifecycle

`mount(el, ctx)` runs synchronously and returns `unmount`. Order inside `mount`:

1. Inject the station style once (5.2.13).
2. Read `ctx.preset` and build the initial state (5.2.2, 5.3.2).
3. Build the static DOM into `el` (header, strip, controls, hosts).
4. Create the plane, handles, layers, explainer(s), staircase; push each destroy call onto `disposers`.
5. First render (`render()` is synchronous the first time, so the explainer table is never seen empty).
6. Set `window.__mv.<station>`.
7. Attach DOM listeners last (rule 10.1.4). Nothing is attached to `window` or `document`.

Everything from step 3 on is inside a `try`; on a throw, run `disposers` in reverse, delete the hook, and rethrow so the router shows its under-construction panel.

`unmount()`: cancel the animation frame and any timer (`arithmetic`: the play loop; both: the note and announce timers), call every `disposers` entry (`plane.destroy()`, each `explainer.destroy()`, `staircase.destroy()`, the trail layer's `remove()`), delete `window.__mv.addresses` / `window.__mv.arithmetic` (only the station's own property), and do nothing else: the router empties `#view`. Every `destroy` is a safe no-op when called twice, so `unmount` may be called after a failed `mount`.

---

## 5. Algorithms

Pseudocode is JavaScript-shaped and meant to be typed in almost as it stands. `C.` means the named export of `js/core/complex.js`. Every function marked *pure* has no DOM access and is exported for the unit tests. Tolerances: `ZERO_EPS = 1e-9`, `EXACT_EPS = 1e-9`.

### 5.1 Shared pure helpers (copied into both files, D11)

**5.1.1 TeX helpers.**

```js
near = (a, b) => Math.abs(a - b) < 1e-9
isSurd = (t) => t.includes('\\sqrt')

texNum(x):                                          // pure; never a fraction (D6)
  if (x !== x) return '\\text{undefined}'
  if (x === Infinity) return '\\infty';  if (x === -Infinity) return '-\\infty'
  n = Math.round(x); if (near(x, n)) return String(n + 0)                  // "-0" cannot occur
  for ([s, root] of [[3, Math.sqrt(3)], [2, Math.SQRT2]]):
    k = Math.round(x / root)
    if (k !== 0 && Math.abs(k) <= 20 && near(x, k * root))
      return (k === 1 ? '' : k === -1 ? '-' : String(k)) + '\\sqrt{' + s + '}'
  return C.fmtNum(x, 3)

approx(x)   = isSurd(texNum(x)) ? ' \\approx ' + C.fmtNum(x, 3) : ''        // the decimal beside a radical
sq(t)       = (t.startsWith('-') || isSurd(t)) ? '(' + t + ')^2' : t + '^2'
trigArg(T)  = T.startsWith('-') ? '\\left(' + T + '\\right)' : T

texCartPair(x, y):                                  // x, y plain numbers; pure
  re = texNum(x); ya = texNum(Math.abs(y)); neg = y < 0
  coef = (ya === '1') ? '' : ya
  i = coef + (isSurd(coef) ? '\\,i' : 'i')
  if (y === 0) return re
  if (x === 0) return (neg ? '-' : '') + i
  return re + ' ' + (neg ? '-' : '+') + ' ' + i

expTex(theta):                                      // C.texAngle gives "\frac{2\pi}{3}", "-\frac{\pi}{3}", "0", or a decimal
  T = C.texAngle(theta); neg = T.startsWith('-')
  return 'e^{' + (neg ? '-' : '') + 'i\\,' + (neg ? T.slice(1) : T) + '}'

polarTeX(z):                                        // r e^{i theta} as TeX; "0" at the origin; r dropped when 1; e^{..} dropped when theta = 0
  r = Math.hypot(z.re, z.im); if (r < 1e-9) return '0'
  th = C.Arg(z); R = texNum(r)
  return th === 0 ? R : (R === '1' ? '' : R + '\\,') + expTex(th)
```

`polarTeX` is exported by both files with the helpers above (it is in the export lists of 4.1 and 4.2).

**5.1.2 Plain-text angle and readout pieces.**

```js
angleText(theta, { unicode = false } = {}):         // pure
  if (theta === null || theta !== theta) return 'undefined'
  d = C.fmtNum(theta, 3)
  e = C.exactAngle(theta) ? C.fmtAngle(theta, { unicode }) : null
  return (e && e !== d) ? d + ' (' + e + ')' : d    // "2.094 (2pi/3)", "3.142 (pi)", "0.464", "0"
```

**5.1.3 Zero tests and cleaning.** `isZero(z) = Math.hypot(z.re, z.im) < ZERO_EPS`. `cleanZ(z, r)`: each component `v` becomes `0` when `|v| < 1e-12 * Math.max(1, r)`, else `v + 0` (so a result of `fromPolar` such as (-2, 2.4e-16) becomes (-2, 0) and its `Arg` is exactly π, never -π).

**5.1.4 θ hint.**

```js
thetaHint(theta):                                   // pure
  deg = C.fmtNum(theta * 180 / Math.PI, 1) + '°'
  e = C.exactAngle(theta) ? C.fmtAngle(theta, { unicode: true }) : null
  return (e && e !== C.fmtNum(theta, 3)) ? '= ' + e + ' = ' + deg : '= ' + deg
// 2π/3 -> "= 2π/3 = 120°"; π -> "= π = 180°"; 0.4636 -> "= 26.6°"; -π/2 -> "= -π/2 = -90°"; 0 -> "= 0°"
```

**5.1.5 Soft snap (D1).**

```js
latticeStep(u) = u <= 4 ? 0.25 : u <= 12 ? 0.5 : u <= 48 ? 1 : 5          // u = unitsAcross

snapPoint(z, unitsAcross, widthPx, tolPx = 5):      // pure
  step = latticeStep(unitsAcross); scale = widthPx / unitsAcross                // px per unit
  tol = Math.min(tolPx, 0.3 * step * scale) / scale                             // in plane units
  one = (v) => { n = Math.round(v / step) * step; return Math.abs(v - n) <= tol ? n + 0 : v }
  return { re: one(z.re), im: one(z.im) }           // a non-finite input comes back unchanged
```

`widthPx` is `plane.getSize().w`, `unitsAcross` is `plane.getView().unitsAcross`.

**5.1.6 View span for `addresses`.**

```js
LADDER = [8, 10, 12, 16, 20, 24, 32, 40, 50, 64, 80, 100, 128, 160, 200, 250]
viewSpanFor(m) = LADDER.find((u) => u >= 2.5 * m) ?? 250         // m = max(|re|, |im|); m = 0 -> 8, 3.5 -> 10, 16 -> 40, 100 -> 250
```

**5.1.7 Field parsers (pure; messages are exact).**

```js
parseRealField(src, { max = 100 } = {}):
  s = String(src ?? '').trim()
  if (s === '') return fail('Type a number, like -1 or 1.732 or sqrt(3).')
  try { c = compile(s) } catch (e) { return fail(e.message || 'I could not read that.') }       // ParseError text is a sentence
  if (c.uses.size > 0) return fail('Use numbers only here, without z, x or y.')                 // never mutate c.uses
  v = c.f({ re: 0, im: 0 })
  if (!isFinite(v.re) || !isFinite(v.im)) return fail('That is not a finite number.')
  if (Math.abs(v.im) > 1e-12 * Math.max(1, Math.abs(v.re))) return fail('That has an i in it. This box takes a real number.')
  if (Math.abs(v.re) > max) return fail('Keep it between -' + max + ' and ' + max + ' so the picture stays readable.')
  return { ok: true, value: v.re + 0 }

parseComplexField(src, { max = 100 } = {}):         // same, with
  empty message 'Type a complex number, like 3 - 2i or sqrt(3) + i.'; no "has an i" test;
  range test |re| <= max and |im| <= max, message 'Keep both parts between -100 and 100 so the picture stays readable.'
  return { ok: true, value: { re: v.re + 0, im: v.im + 0 } }
```

Scientific notation is not supported by the grammar (`1.5e1` reads `e` as Euler's number and fails with the parser's own sentence); do not special-case it.

**5.1.8 `ghostCounts(rayPx, enabled = true)`** (pure): `enabled` false gives `{ pos: 0, neg: 0 }`; otherwise `pos = rayPx >= 70 ? 2 : rayPx >= 14 ? 1 : 0` and `neg = rayPx >= 100 ? 1 : 0`. At the 1.3.1 default the ray is 2 units: 130 px on the 520 px desktop plane (2 + 1 windings), 89.5 px on the 358 px phone plane (2 + 0). `drawPolarAddress` draws nothing below a 6 px ray.

**5.1.9 The typed-field protocol (both stations).**

```js
bindField(input, parse, apply, fail):
  input.addEventListener('input', () => {
    r = parse(input.value)
    if (r.ok) { setInvalid(input, false); apply(r.value, { live: true, source: input }) }
    // a parse failure here is silent: "-", "1." and "sqrt(" must not flash an error
  })
  input.addEventListener('change', () => {
    r = parse(input.value)
    if (r.ok) { setInvalid(input, false); apply(r.value, { live: false, source: input }) }
    else      { setInvalid(input, true); fail(r.message) }                  // the state does not change
  })
setInvalid(input, bad): bad ? (input.setAttribute('aria-invalid', 'true'), input.setAttribute('aria-describedby', <the note's id>)) : (input.removeAttribute('aria-invalid'), input.removeAttribute('aria-describedby'))
```

`apply` ends in `render({ skipField: live ? source : null })`: while the student is typing, the field they type in is left alone; on `change` every field, that one included, is rewritten with `C.fmtNum(value, 3)` (so "sqrt(3)" becomes "1.732" and "-0" never appears). The test scripts dispatch `change` (and `input`) events, `page.fill` fires `input`; both paths apply.

**5.1.10 Update coalescing.** On every state change: plain-text DOM (readout, fields, hint, chips) is written synchronously; `explainer.update` and `staircase.update` are called synchronously (the widgets coalesce their own redraws); the plane is redrawn through `plane.requestDraw()`; KaTeX panels outside the explainers (`addresses-forms`, `addresses-euler-live`) are re-rendered once per animation frame by a `formsDirty` flag. No `setTimeout` throttling.

### 5.2 `addresses`

**5.2.1 DOM.** Built with a small `h(tag, attrs, ...children)` helper that only uses `textContent` and attributes; nothing from the student or the URL goes through `innerHTML` (data prose goes through `prose()`, TeX through `tex()`). Tree (classes are shell classes unless prefixed `ax-`):

```
el (section.station, data-grid)
  header.station-header
    h1 (ctx.station.title)        p.station-lede      ul.thread-badges > li > span.thread-badge[data-thread][title]
    div.chips > a.chip.problem-chip[href=#problem-1-3-1][title=aha]#addresses-problem-chip-1-3-1
  section.panel.ax-problem[data-tone=cart]#addresses-problem[aria-labelledby=addresses-problem-title]
    h2.panel-title#addresses-problem-title   p#addresses-problem-statement   p (span.badge[data-tone] + span#addresses-problem-why)
    details#addresses-answer > summary + div.tex-scroll#addresses-answer-tex + p.muted#addresses-answer-text
  div.ax-main
    div.ax-left
      div.ax-toolbar
        div.row > span.ax-group-label "Try a point" + div.chips[role=group]#addresses-presets > button.chip#addresses-preset-<id>[aria-pressed]
        div.row > span.ax-group-label "Grid" + div.chips[role=group]#addresses-grid > button.chip#addresses-grid-cart|polar|both[aria-pressed]
        p.ax-hint (grid sentence)
        label.check > input#addresses-ghosts[type=checkbox] + text     label.check > input#addresses-snap[type=checkbox] + text
      div#addresses-plane-host   (createPlane appends div.plane here)
      p.ax-hint#addresses-hint
    div.ax-right
      section.panel[data-tone=cart][aria-labelledby=...] h2.panel-title + p.muted + div.ax-fields > div.field > label[for] + input.num#addresses-x|y
      section.panel[data-tone=polar] ... #addresses-r, #addresses-theta + span#addresses-theta-hint
      p.ax-note#addresses-note[aria-live=polite]
      div.readout#addresses-readout
      section.panel[data-tone=polar]  h2 "The angle has many names" + p + div#addresses-stairs-host + a.chip#addresses-to-staircase
  section.ax-explain  h2  p.muted  div#addresses-ex-host  p.muted (atan2 sentence)
  div.ax-bottom
    section.panel.ax-forms#addresses-forms  h2 + dl > (dt + dd.tex-scroll.tone-*)#addresses-form-cart|polar|exp|arg-home|arg-set
    aside.callout#addresses-euler[data-tone=accent]  h3 + p + div.tex-scroll#addresses-euler-live
  nav.station-links#addresses-links
```

Theme classes for the forms: `#addresses-form-cart` carries `.tone-cart`; the other four carry `.tone-polar`.

**5.2.2 Initial state.**

```js
initialZ(preset):
  if (preset && preset.kind === 'token') { p = PRESETS.find((p) => p.id === preset.token); if (p) return p.z }
  return PRESETS[0].z                                 // problem 1.3.1, any other problem or topic, or no preset: -1 + i√3
S = { z: copy(initialZ(ctx.preset)), grid: 'cart', ghosts: true, snap: true, userView: false,
      lastTheta: isZero(S.z) ? 2π/3 : C.Arg(S.z), pressedPreset: matching preset id or null }
```

**5.2.3 Model (pure).**

```js
addressModel(z):
  x = z.re + 0; y = z.im + 0; r = Math.hypot(x, y)
  if (r < ZERO_EPS) return { z: { re: 0, im: 0 }, x: 0, y: 0, r: 0, theta: null, isZero: true }
  return { z: { re: x, im: y }, x, y, r, theta: C.Arg({ re: x, im: y }), isZero: false }

addressReadout(m):
  return 'z = ' + C.fmtCart(m.z) + '; |z| = ' + C.fmtNum(m.r, 3) + '; Arg z = ' + angleText(m.theta)
// 1.3.1:  "z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)"      origin: "z = 0; |z| = 0; Arg z = undefined"
```

**5.2.4 Explainer cells (pure, untinted TeX, D4 and D6).**

```js
addressCells(m):
  if (m.isZero) return {
    x:     { cart: 'x = 0', polar: 'x = r\\cos\\theta = 0\\cdot\\cos\\theta = 0' },
    y:     { cart: 'y = 0', polar: 'y = r\\sin\\theta = 0\\cdot\\sin\\theta = 0' },
    r:     { cart: 'r = \\sqrt{x^2+y^2} = \\sqrt{0^2 + 0^2} = 0', polar: 'r = 0' },
    theta: { cart: '\\theta = \\operatorname{atan2}(0, 0)\\ \\text{is undefined}', polar: '\\text{every angle reaches } 0' },
    same:  { cart: 'z = 0', polar: 'z = 0', agree: undefined } }                      // "not checked"
  X = texNum(m.x); Y = texNum(m.y); R = texNum(m.r); T = C.texAngle(m.theta)
  Q = m.x*m.x + m.y*m.y
  exactAng = C.exactAngle(m.theta) !== null
  J = (near(m.r, Math.round(m.r)) || isSurd(R)) && exactAng ? '=' : '\\approx'    // is the substituted line exact?
  rTail = near(m.r, Math.round(m.r)) ? '= ' + Math.round(m.r) : '\\approx ' + C.fmtNum(m.r, 3)
  angTail = exactAng && m.theta !== 0 ? ' \\approx ' + C.fmtNum(m.theta, 3) : ''
  rel = exactAng ? '=' : '\\approx'
  return {
    x: { cart:  'x = ' + X + approx(m.x),
         polar: 'x = r\\cos\\theta = ' + R + '\\cos\\,' + trigArg(T) + ' ' + J + ' ' + X + approx(m.x) },
    y: { cart:  'y = ' + Y + approx(m.y),
         polar: 'y = r\\sin\\theta = ' + R + '\\sin\\,' + trigArg(T) + ' ' + J + ' ' + Y + approx(m.y) },
    r: { cart:  'r = \\sqrt{x^2+y^2} = \\sqrt{' + sq(X) + ' + ' + sq(Y) + '} = \\sqrt{' + texNum(Q) + '} ' + rTail,
         polar: 'r = ' + R + approx(m.r) },
    theta: { cart:  '\\theta = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(' + Y + ', ' + X + ') ' + rel + ' ' + T + angTail,
             polar: '\\theta = \\operatorname{Arg} z ' + rel + ' ' + T + angTail },
    same: { cart: 'z = ' + texCartPair(m.x, m.y),
            polar: 'z = ' + polarTeX(m.z),
            agree: C.eq(C.fromPolar(m.r, m.theta), m.z, 1e-9 * Math.max(1, m.r)) } }
```

*Golden strings.* z = -1 + i√3 (compare after removing all whitespace):

```
x.cart     x = -1
x.polar    x = r\cos\theta = 2\cos\,\frac{2\pi}{3} = -1
y.cart     y = \sqrt{3} \approx 1.732
y.polar    y = r\sin\theta = 2\sin\,\frac{2\pi}{3} = \sqrt{3} \approx 1.732
r.cart     r = \sqrt{x^2+y^2} = \sqrt{(-1)^2 + (\sqrt{3})^2} = \sqrt{4} = 2
r.polar    r = 2
theta.cart \theta = \operatorname{atan2}(y, x) = \operatorname{atan2}(\sqrt{3}, -1) = \frac{2\pi}{3} \approx 2.094
theta.polar \theta = \operatorname{Arg} z = \frac{2\pi}{3} \approx 2.094
same.cart  z = -1 + \sqrt{3}\,i
same.polar z = 2\,e^{i\,\frac{2\pi}{3}}                  agree: true
```

z = 2 + i (after the A2 drag): `x.cart` `x = 2`; `x.polar` `x = r\cos\theta = 2.236\cos\,0.464 \approx 2`; `r.cart` `r = \sqrt{x^2+y^2} = \sqrt{2^2 + 1^2} = \sqrt{5} \approx 2.236`; `theta.cart` `\theta = \operatorname{atan2}(y, x) = \operatorname{atan2}(1, 2) \approx 0.464`; `theta.polar` `\theta = \operatorname{Arg} z \approx 0.464`; `same.cart` `z = 2 + i`; `same.polar` `z = 2.236\,e^{i\,0.464}`. z = 1 + i: `r.polar` `r = \sqrt{2} \approx 1.414`, `x.polar` `x = r\cos\theta = \sqrt{2}\cos\,\frac{\pi}{4} = 1`. z = -16: `theta.cart` `\theta = \operatorname{atan2}(y, x) = \operatorname{atan2}(0, -16) = \pi \approx 3.142`, `same.polar` `z = 16\,e^{i\,\pi}`.

**5.2.5 Forms (pure).**

```js
addressForms(m):
  if (m.isZero) return null                           // the panel then shows the "z = 0 has no polar form" sentence
  R = texNum(m.r); T = C.texAngle(m.theta); Rp = (R === '1') ? '' : R
  trig = '\\cos\\,' + trigArg(T) + ' + i\\sin\\,' + trigArg(T)
  return {
    cart:    'z = ' + texCartPair(m.x, m.y),
    polar:   Rp ? 'z = ' + Rp + '\\left(' + trig + '\\right)' : 'z = ' + trig,
    exp:     'z = ' + (Rp ? Rp + '\\,' : '') + expTex(m.theta),
    argHome: '\\operatorname{Arg} z ' + rel + ' ' + T + angTail,                       // same rel and angTail as 5.2.4
    argSet:  '\\arg z = \\left\\{ ' + T + ' + 2\\pi k : k \\in \\mathbb{Z} \\right\\}' }
```

Golden for 1.3.1: `polar` = `z = 2\left(\cos\,\frac{2\pi}{3} + i\sin\,\frac{2\pi}{3}\right)`, `exp` = `z = 2\,e^{i\,\frac{2\pi}{3}}`, `argHome` = `\operatorname{Arg} z = \frac{2\pi}{3} \approx 2.094`, `argSet` = `\arg z = \left\{ \frac{2\pi}{3} + 2\pi k : k \in \mathbb{Z} \right\}`.

The Euler line (`addresses-euler-live`): at the origin it is empty; otherwise `e^{i\theta} = \cos\theta + i\sin\theta \approx ` followed by `texCartPair(m.x / m.r, m.y / m.r)`. The components of a unit vector are never integer multiples of √2 or √3 other than 0 and ±1, so this prints decimals, `-0.5 + 0.866i` for 1.3.1.

**5.2.6 `render({ skipField })`** (the only place state turns into screen):

```js
render({ skipField = null } = {}):
  m = addressModel(S.z)
  readout.textContent = addressReadout(m)
  syncFields(m, skipField)                  // writes C.fmtNum(v, 3) into x, y, r and theta (theta shows Arg, or lastTheta at the origin), except into skipField (the box being typed in); skipField null writes all four
  hintEl.textContent = m.isZero ? '' : thetaHint(m.theta)
  stairs.update(m.theta)                    // null at the origin; the widget is given Arg and relabels at the seam
  ex.update({ m, c: addressCells(m) })
  formsDirty = true; if (!formsRaf) formsRaf = requestAnimationFrame(flushForms)
  for (p of PRESETS) pressed(p) = !m.isZero && C.eq(m.z, p.z, 1e-9) → button aria-pressed
  if (!m.isZero) S.lastTheta = m.theta
  plane.requestDraw()
```

`flushForms`: `formsRaf = 0; m = lastModel` (the model of the latest `render`); `f = addressForms(m)`; if `f` is null, each `dd` shows the sentence from 2.5; else `tex(dd, f.cart)`, ... for the five rows and `tex(euler, ...)`. Skip a `tex` call whose string equals the last one written to that element.

**5.2.7 The handle.**

```js
zHandle = plane.addPoint({ id: 'z', z: S.z, label: 'z', name: 'z', color: '--text', radius: 7, step: 0.1,
                           onDrag(z, info) {
                             if (info.source === 'pointer' && S.snap) {
                               v = plane.getView(); zs = snapPoint(z, v.unitsAcross, plane.getSize().w)
                               if (zs.re !== z.re || zs.im !== z.im) { zHandle.set(zs, { silent: true }); z = zs }
                             }
                             S.z = { re: z.re + 0, im: z.im + 0 }
                             render()
                             if (info.final && info.source !== 'pointer') ensureVisible(S.z, {}) } })   // a keyboard nudge past the edge zooms out; a pointer drag never moves the view (D8)
```

No `snap` option on `addPoint`. `z.re + 0` turns -0 into 0.

**5.2.8 Field handlers (`apply` for `bindField`).**

```js
applyX(v, o): S.z = cleanZ({ re: v, im: S.z.im }, Math.hypot(v, S.z.im)); finishTyped(o)
applyY(v, o): S.z = cleanZ({ re: S.z.re, im: v }, ...);                   finishTyped(o)
applyR(v, o):
  if (v < 0) return reject(o, 'A length cannot be negative. To reach the opposite side, keep r positive and add π to θ.')   // the field is marked invalid, state unchanged
  th = isZero(S.z) ? S.lastTheta : C.Arg(S.z)
  S.z = v < ZERO_EPS ? { re: 0, im: 0 } : cleanZ(C.fromPolar(v, th), v)
  finishTyped(o)
applyTheta(v, o):
  r = Math.hypot(S.z.re, S.z.im)
  if (r < ZERO_EPS) { S.lastTheta = C.wrapArg(v); render({ skipField: o.live ? o.source : null }); note(o.live ? '' : 'r is 0, so every angle gives the same point. The angle is kept for when you raise r.'); return }
  S.z = cleanZ(C.fromPolar(r, v), r)
  home = C.wrapArg(v); msg = ''
  if (!o.live && Math.abs(home - v) > 1e-9) {
    k = Math.round((v - home) / (2 * Math.PI))
    msg = 'You typed θ = ' + C.fmtNum(v, 3) + '. That is one name for this direction (' + angleU(home) + (k > 0 ? ' + ' : ' - ') + 2 * Math.abs(k) + 'π). The home step is Arg z = ' + angleText(home, { unicode: true }) + '.'
  }
  finishTyped(o, msg)
finishTyped(o, msg = ''):
  zHandle.set(S.z, { silent: true }); ensureVisible(S.z, {})
  render({ skipField: o.live ? o.source : null })
  note(o.live ? '' : msg)                  // a valid entry clears any older message; the explanation shows only on a commit
angleU(t) = C.exactAngle(t) ? C.fmtAngle(t, { unicode: true }) : C.fmtNum(t, 3)
reject(o, msg): setInvalid(o.source, true); note(msg)          // the state is not changed; note(text) sets #addresses-note
```

A typed θ of `8pi/3` gives the note "You typed θ = 8.378. That is one name for this direction (2π/3 + 2π). The home step is Arg z = 2.094 (2π/3)."; `4pi/3` gives "... (-2π/3 + 2π) ... Arg z = -2.094 (-2π/3)."; `-pi` gives "You typed θ = -3.142. That is one name for this direction (π - 2π). The home step is Arg z = 3.142 (π)."

**5.2.9 Chips and checkboxes.**

- Preset chip click: `S.z = copy(preset.z)`; `zHandle.set(S.z, { silent: true })`; `ensureVisible(S.z, { reset: true })`; `S.userView = false`; `note('Loaded ' + preset.label + '.')`; `render()`.
- Grid chip click: `S.grid = id`; `plane.setGrid(id)`; update the three `aria-pressed`; `el.dataset.grid = id`.
- `addresses-ghosts` change: `S.ghosts = checked`; `plane.requestDraw()`.
- `addresses-snap` change: `S.snap = checked`.
- `addresses-answer` `toggle`: on first open, `tex(answerTex, p.answer.tex, { display: true })`, `answerText.textContent = p.answer.text`.

**5.2.10 View management.**

```js
plane = createPlane(host, { id: 'addresses-plane', xRange: [-4, 4], yRange: [-4, 4], grid: 'cart', axisLabels: ['Re', 'Im'],
                            maxWidth: 520, maxUnitsAcross: 300, ariaLabel: 'The complex plane with the point z' })
plane.on('viewchange', (v) => { if (v.reason === 'pan' || v.reason === 'zoom') S.userView = true })

ensureVisible(z, { reset = false }):
  m = Math.max(Math.abs(z.re), Math.abs(z.im)); u = plane.getView().unitsAcross; want = viewSpanFor(m)
  if (reset) { plane.setView({ center: { re: 0, im: 0 }, unitsAcross: want }); plane.setHome(); S.userView = false; return }
  if (m > 0.425 * u) plane.setView({ center: { re: 0, im: 0 }, unitsAcross: want })            // zoom out, origin centred
  else if (!S.userView && u > want) plane.setView({ center: { re: 0, im: 0 }, unitsAcross: want })   // zoom back in after an automatic zoom-out
```

On mount call `ensureVisible(S.z, { reset: true })` once (so `#addresses-m16` opens at 40 units across). `setView` emits `viewchange` with reason `'set'`, which does not mark `userView`. The view is never changed from `onDrag`.

**5.2.11 The drawing layer.**

```js
plane.addLayer((ctx, pl) => {
  const z = S.z
  drawSeam(ctx, pl, Math.PI)                                         // label "seam", --seam, dashed
  drawCartAddress(ctx, pl, z)                                        // dashed --cart drop lines, "x = ..." "y = ..."
  rayPx = Math.hypot(z.re, z.im) * pl.getView().scale
  g = ghostCounts(rayPx, S.ghosts); lastGhosts = g
  drawPolarAddress(ctx, pl, z, { ghosts: g.pos, ghostsNeg: g.neg })  // ray, solid Arg arc, faint windings, labels
}, { order: 10 })
```

The plane keeps the helpers' labels clear of each other, of the dot and of the zoom buttons; the station adds no labels of its own. The helpers return early at the origin.

**5.2.12 Station links** (same function in both files):

```js
stationLinks(ctx):
  list = ctx.stations; me = ctx.station
  prev = list.find((s) => s.order === me.order - 1); next = list.find((s) => s.order === me.order + 1)
  out = []; if (prev) out.push(link('prev', prev)); if (next) out.push(link('next', next))
  for (t of me.threads):
    pt = last s in list with s.order < me.order and s.threads.includes(t); nt = first s with s.order > me.order and s.threads.includes(t)
    if (nt && !out.some((l) => l.id === nt.id)) out.push(link('thread', nt, t))        // text: nt.title + ' (thread ' + t + ')'
    if (pt && !out.some((l) => l.id === pt.id)) out.push(link('thread', pt, t))
  // a.station-link[href='#' + id][data-dir='prev'|'next' | data-thread=t]; the nav has id <station>-links and aria-label "More places"
```

For `addresses` this renders: The Map (prev), Slide, Spin, Stretch, Mirror (next), The Staircase: z, arg z, Arg z (thread T2). For `arithmetic`: One Point, Two Addresses (prev), Length, Distance, Circles (next), nothing else.

**5.2.13 Station CSS** (injected once; tokens only).

```css
.ax-main, .ar-main { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 70rem) { .ax-main, .ar-main { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); } }
.ax-left, .ax-right, .ar-left, .ar-right { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.ax-toolbar, .ar-toolbar { display: flex; flex-direction: column; gap: var(--space-2); }
.ax-group-label, .ar-group-label { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
.ax-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2) var(--space-3); }
.ax-fields .field, .ar-field { min-width: 0; width: 100%; }
.ax-fields input.num, .ar-field input { width: 100%; min-width: 0; }
.ax-hint, .ar-hint { margin: 0; font-size: 0.92rem; color: var(--text-muted); }
.ax-note, .ar-note, .ar-caption { margin: 0; min-height: 1.5em; font-size: 0.95rem; }
.ax-forms dl { display: grid; grid-template-columns: minmax(0, 11rem) minmax(0, 1fr); gap: var(--space-2) var(--space-3); margin: 0; }
@media (max-width: 36rem) { .ax-forms dl { grid-template-columns: minmax(0, 1fr); } }
.ax-forms dt { font-weight: 600; color: var(--text-muted); }
.ax-forms dd { margin: 0; max-width: 100%; overflow-x: auto; }
.ax-bottom { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 62rem) { .ax-bottom { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); } }
.ar-proofs-grid { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 70rem) { .ar-proofs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.ar-route { margin: var(--space-2) 0; padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.ar-chip-badge { margin-left: var(--space-1); }
.ar-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
```

Do not restyle `.panel`, `.chip`, `.readout`, `.callout`, `.station-link`; the explainer and staircase inject their own styles. The style element is `<style data-for="station-addresses">` (and `station-arithmetic`), added to `document.head` only if no element with that `data-for` exists.

**5.2.14 Mount skeleton.**

```js
export function mount(el, ctx) {
  const disposers = [];
  try {
    ensureStyle();
    S = initialState(ctx.preset);
    buildDom(el, ctx);                                                // 5.2.1, header from ctx.station / ctx.threads / problemsForStation
    plane = createPlane(planeHost, {...});          disposers.push(() => plane.destroy());
    layer = plane.addLayer(...);                                       // 5.2.11
    zHandle = plane.addPoint({...});                                   // 5.2.7
    ex = createExplainer(exHost, { id: 'addresses-ex', title: 'Convert in either direction',
            columns: [{ key: 'cart', heading: 'Cartesian (across, then up)', tone: '--cart', tint: true },
                      { key: 'polar', heading: 'Polar (turn, then walk)', tone: '--polar', tint: true }],
            rows: [ row('x', 'x = Re z', 'cart'), row('y', 'y = Im z', 'cart'), row('r', 'r = |z|', 'polar'), row('theta', 'θ = Arg z', 'polar') ],
            same: (s) => s.c.same });                                  // row(id, label, native) → { id, label, native, cart: (s) => s.c[id].cart, polar: (s) => s.c[id].polar }
    disposers.push(() => ex.destroy());
    stairs = createStaircase(stairsHost, { id: 'addresses-stairs', kMin: -2, kMax: 2, label: 'arg z' });   disposers.push(() => stairs.destroy());
    ensureVisible(S.z, { reset: true });
    render();                                                          // synchronous first render
    const mv = (window.__mv = window.__mv || {}); mv.addresses = { state, drawn };
    bindListeners();                                                   // last
  } catch (err) { for (const d of disposers.reverse()) try { d(); } catch (e) {} ; cleanupHook(); throw err; }
  return function unmount() { cancelAnimationFrame(formsRaf); clearTimeout(noteTimer); for (const d of disposers.reverse()) try { d(); } catch (e) {} ; if (window.__mv && window.__mv.addresses === mine) delete window.__mv.addresses; };
}
```

Rows of the explainer in this station never change, so `setRows` is not used.

### 5.3 `arithmetic`

**5.3.1 DOM.** Same rules as 5.2.1. Tree:

```
el (section.station, data-mode, data-conj-result)
  header.station-header      (h1, p.station-lede, thread badges, chips for 1.1.1, 1.1.2, P1, P2 from problemsForStation)
  section.panel.ar-problem[data-tone]#arithmetic-problem   (the strip of 2.2; data-tone from the first address tone)
  section.panel[aria-labelledby]   h2 "Operation" + div.chips[role=group]#arithmetic-modes > button.chip#arithmetic-mode-<mode>[aria-pressed]
                                   (+ span.badge.ar-chip-badge "part 1" / "part 2" inside the mul / div chips while S.hint is set)
                                   + button.chip#arithmetic-preset-1-1-1
  div.ar-main
    div.ar-left   div#arithmetic-plane-host   p.ar-hint#arithmetic-hint
    div.ar-right
      section.panel[data-tone=input]  h2 "The two points"
         div.ar-field > label[for=arithmetic-z1-input] + input#arithmetic-z1-input + p.ar-hint (help) + p.ar-note#arithmetic-z1-error
         div.ar-field > ... z2 ...
         label.check > input#arithmetic-lock-conj      button.chip#arithmetic-conj-result[aria-pressed]      label.check > input#arithmetic-snap
         div.ar-actions > button.btn#arithmetic-animate + button.btn#arithmetic-fit
      p.ar-caption#arithmetic-caption[aria-live=polite]       p.ar-note#arithmetic-note[aria-live=polite]
      div.readout#arithmetic-readout        p.ar-note#arithmetic-wrap-note[hidden]
  section.ar-explain  h2  div#arithmetic-ex-host
  aside.callout#arithmetic-why[data-tone]  (one p)
  section.panel#arithmetic-proofs  h2 + p.muted + div.ar-proofs-grid >
       div > h3 (a.chip.problem-chip#arithmetic-p1-chip[href=#problem-P1] + title text) + div#arithmetic-p1-host + div.ar-route[data-tone=cart] + div.ar-route[data-tone=polar]
       div > ... P2 ...
  nav.station-links#arithmetic-links
```

**5.3.2 Initial state and presets.**

```js
loadState({ z1, z2, mode, conjResult = false, lockConj = false, hint = null })     // sets S, handles (silent), grid, chips, then render() and refit()
DEFAULT      = { z1: {3, -2}, z2: {-1, 4}, mode: 'mul', hint: '1.1.1' }               // problem 1.1.1 and the bare route
initial(preset):
  problem '1.1.1' -> DEFAULT
  problem '1.1.2' -> { ...DEFAULT, mode: 'sub', conjResult: true, hint: null }
  problem 'P1'    -> { ...DEFAULT, mode: 'conj', hint: null }
  problem 'P2'    -> { z1: {3, -2}, z2: {3, 2}, mode: 'mul', lockConj: true, hint: null }
  token '1-1-1'   -> DEFAULT;  token in MODES -> { ...DEFAULT, mode: token, hint: null }
  anything else (topic, other problem, unknown token, none) -> DEFAULT
```

The strip shows the problem of the preset when it is one of this station's four, otherwise 1.1.1.

**5.3.3 Model (pure).**

```js
applyMode(mode, z1, z2, { conjResult = false } = {}):
  v = { add: C.add(z1, z2), sub: C.sub(z1, z2), mul: C.mul(z1, z2), div: C.div(z1, z2), conj: C.conj(z1), inv: C.inv(z1) }[mode]
        // division by 0 and inv(0) give { NaN, NaN } and never throw; an unknown mode gives { NaN, NaN }
  binary = mode is add | sub | mul | div
  return { value: v, result: (conjResult && binary) ? C.conj(v) : v }

arithmeticModel(S):
  polar = (z) => ({ r: Math.hypot(z.re, z.im), theta: C.Arg(z) })                   // C.Arg(0) = 0
  { value, result } = applyMode(S.mode, S.z1, S.z2, { conjResult: S.conjResult })
  a = polar(S.z1); b = polar(S.z2)
  undefinedResult = !C.isFiniteC(value)
  zeroResult = !undefinedResult && Math.hypot(value.re, value.im) < ZERO_EPS
  pv = undefinedResult ? null : polar(value);  pw = undefinedResult ? null : polar(result)
  route (D15):
    mul -> { r: a.r * b.r, theta: a.theta + b.theta };   div -> { r: a.r / b.r, theta: a.theta - b.theta }
    conj -> { r: a.r, theta: -a.theta };                 inv -> { r: 1 / a.r, theta: -a.theta }
    add | sub -> pv                                      (a mirror at the end: { r: route.r, theta: -route.theta })
  agree = undefinedResult ? undefined : C.eq(C.fromPolar(route.r, route.theta), result, 1e-9 * Math.max(1, pw.r))
  wrap = (mul | div) && !undefinedResult && !zeroResult
           ? { raw: a.theta + b.theta (mul) or a.theta - b.theta (div), home: C.wrapArg(raw), wrapped: Math.abs(home - raw) > 1e-9 } : null
  niceAngles = !isZero(S.z1) && !isZero(S.z2) && C.exactAngle(a.theta) !== null && C.exactAngle(b.theta) !== null
  native = nativeFor(...)                                                              // 5.3.4
  return { mode, z1, z2, conjResult, binary, a, b, value, result, undefinedResult, zeroResult, pv, pw, route, agree, wrap, niceAngles, native }
```

Readout (pure):

```js
arithmeticReadout(M):
  if (M.undefinedResult) return 'result = undefined; |result| = undefined; Arg = undefined'
  return 'result = ' + C.fmtCart(M.result) + '; |result| = ' + C.fmtNum(M.pw.r, 3) + '; Arg = ' + (M.pw.r < ZERO_EPS ? 'undefined' : angleText(M.pw.theta))
```

**5.3.4 Native badges and the why-line.**

```js
nativeFor(M):                                       // each row id -> 'cart' | 'polar' | null
  add | sub: { inputs: null, point: 'cart',  length: 'cart',  angle: 'cart',  mirror: null, im: 'cart' }
  mul | div: { inputs: null, point: M.niceAngles ? 'polar' : 'cart', length: 'polar', angle: 'polar', mirror: null, im: 'cart' }
  conj:      every row null
  inv:       { inputs: null, point: 'polar', length: 'polar', angle: 'polar', mirror: null, im: null }

whyText(M):  → { tone, text }       // angleU(t) = C.exactAngle(t) ? C.fmtAngle(t, { unicode: true }) : C.fmtNum(t, 3)
  add  tone cart:   'Adding is a slide. z₂ takes you across by x₂ and up by y₂, so the coordinates just add: (x₁ + x₂, y₁ + y₂). Cartesian is the native address. Polar has no shortcut for a sum: you would convert both points, add, and convert back.'
  sub  tone cart:   'Subtracting is the slide back. z₁ − z₂ is the slide that carries z₂ to z₁, so the coordinates subtract. Its length is the distance between the two points.'
  mul  tone polar:  if a factor is 0: 'One factor is 0, so the product is 0 and has no angle.'
                    else if niceAngles: 'Multiplying spins and stretches. Angles add (θ₁ + θ₂ = ' + angleU(a.theta) + ' + ' + angleU(b.theta) + ' = ' + angleU(wrap.raw) + ') and lengths multiply. Both angles here are nice numbers, so polar is the easy way.'
                    else: 'Multiplying spins and stretches: angles add and lengths multiply. That is polar\'s job, and the polar rows are one line each. But the angles here (' + angleU(a.theta) + ' and ' + angleU(b.theta) + ') are not both nice numbers, so on the test you multiply out in x and y and use the polar rows as the check.'
  div  tone polar:  if z2 = 0: 'z₂ is 0, so z₁ ÷ z₂ is undefined.'   if z1 = 0: 'z₁ is 0, so the quotient is 0 and has no angle.'
                    else if niceAngles: 'Dividing unspins and shrinks. Angles subtract (θ₁ − θ₂ = ' + angleU(a.theta) + ' − ' + angleU(b.theta) + ' = ' + angleU(wrap.raw) + ') and lengths divide. Both angles here are nice numbers, so polar is the easy way.'
                    else: 'Dividing unspins and shrinks: angles subtract and lengths divide. With angles like ' + angleU(a.theta) + ' and ' + angleU(b.theta) + ', do it in x and y: multiply top and bottom by the mirror of z₂ so the spins cancel, and use the polar rows as the check.'
  conj tone accent: 'Conjugating is a mirror across the real axis. In x and y: y becomes −y. In polar: θ becomes −θ. The length does not change. Either way it is one step.'
  inv  tone polar:  if z1 = 0: 'z₁ is 0, so 1/z₁ is undefined.'
                    else '1/z takes two steps. First invert the length: r becomes 1/r, on the same ray. Then mirror: θ becomes −θ. In x and y that is (x − iy) / (x² + y²).'
  appended when conjResult and binary and not undefined:
                    ' The mirror at the end flips the sign of the imaginary part: Im(conj w) = −Im w = ' + C.fmtNum(-M.value.im, 3) + '.'
```

`wrapNote(M)` (pure): `''` unless `M.wrap && M.wrap.wrapped`. Otherwise, with `verb = 'add'` for × and `'subtract'` for ÷, `raw = M.wrap.raw`, `home = M.wrap.home`:

```js
raw > Math.PI:  'The angles ' + verb + ' to ' + fmtNum(raw) + ', which is past π. The same direction has the home name Arg = ' + fmtNum(home) + ' (' + fmtNum(raw) + ' − 2π).'
otherwise (raw <= -π):  'The angles ' + verb + ' to ' + fmtNum(raw) + ', which is at or before −π. The same direction has the home name Arg = ' + fmtNum(home) + ' (' + fmtNum(raw) + ' + 2π).'
```

Each |θ| is at most π, so |raw| is at most 2π and one turn always suffices. Example: z1 = z2 = -1 + 4i gives "The angles add to 3.632, which is past π. The same direction has the home name Arg = -2.652 (3.632 − 2π)." The case raw = −π exactly (z1 = z2 = −i, product −1) gives "The angles add to -3.142, which is at or before −π. The same direction has the home name Arg = 3.142 (-3.142 + 2π)."

**5.3.5 Explainer rows and cells.**

Rows (order and labels), built by `arithmeticRows(M)` and handed to `ex.setRows` whenever `mode` or `conjResult` changes (a `rowsKey = mode + ':' + conjResult` comparison):

```js
rowLabel = { add: 'z₁ + z₂', sub: 'z₁ − z₂', mul: 'z₁ × z₂', div: 'z₁ ÷ z₂', conj: 'conj z₁', inv: '1 / z₁' }
arithmeticRows(M) = [ { id: 'inputs', label: M.binary ? 'z₁, z₂' : 'z₁' },
                      { id: 'point',  label: rowLabel[M.mode] }, { id: 'length', label: 'length' }, { id: 'angle', label: 'angle' } ]
                    .concat(M.conjResult && M.binary ? [ { id: 'mirror', label: 'then mirror' }, { id: 'im', label: 'Im of the answer' } ] : [])
                    .map((r) => ({ ...r, native: M.native[r.id] }))          // the host turns each into { id, label, native: (s) => s.M.native[id], cart: (s) => cell(s, id, 'cart'), polar: (s) => cell(s, id, 'polar') }
cell(s, id, col) = s.cells.undef ? '\\text{undefined}' : (s.cells.rows[id] ? s.cells.rows[id][col] : null)
same = (s) => s.cells.undef ? { cart: '\\text{undefined}', polar: '\\text{undefined}', agree: undefined } : s.cells.same
```

`ex.update({ M, cells: arithmeticCells(M) })` after every state change. Row functions must never throw (a throwing row logs a console error and fails the smoke run); the unit test sweeps them.

The cells (pure, untinted TeX). Module-level helpers (not exported), shared by `arithmeticCells` and `proofsModel`:

```js
cx(z)   = texCartPair(z.re + 0, z.im + 0)
pol(z)  = polarTeX(z)
p(t)    = t.startsWith('-') ? '(' + t + ')' : t                         // parenthesise a negative number
abs2(z) = z.re * z.re + z.im * z.im;   isInt(x) = near(x, Math.round(x))
lenTex(z):                                                                // |z| as TeX when |z|^2 is an integer: n or \sqrt{n}; else the 3-decimal modulus
  q = abs2(z); if (isInt(q)) { n = Math.round(q); s = Math.round(Math.sqrt(n)); return s * s === n ? String(s) : '\\sqrt{' + n + '}' }
  return C.fmtNum(Math.sqrt(q), 3)
fracTex(p, q): reduce by gcd; q = 1 -> the integer; else (p < 0 ? '-' : '') + '\\frac{' + |p| + '}{' + q + '}'
quotientExact(a, b):                                                      // Gaussian integers only (all four parts integers, b != 0): "-\frac{11}{17} - \frac{10}{17}i"; else null
  den = b.re² + b.im²; nr = a.re·b.re + a.im·b.im; ni = a.im·b.re − a.re·b.im
  re = fracTex(nr, den); im = fracTex(|ni|, den); (ni = 0 -> re only; nr = 0 -> sign + im + 'i'; coefficient 1 omitted)
ang(t)  = C.fmtNum(t, 3);   noShort(x) = '\\text{no shortcut: }' + x
back    = texNum(pv.r) + '\\left(\\cos\\,' + trigArg(C.texAngle(pv.theta)) + ' + i\\sin\\,' + trigArg(C.texAngle(pv.theta)) + '\\right) \\approx ' + cx(v)
```

```js
arithmeticCells(M):          // v = M.value, w = M.result, a = M.a, b = M.b, pv = M.pv
  if (M.undefinedResult) return { undef: true }
  inputs:  binary ? { cart: 'z_1 = ' + cx(z1) + ',\\quad z_2 = ' + cx(z2), polar: 'z_1 = ' + pol(z1) + ',\\quad z_2 = ' + pol(z2) }
                  : { cart: 'z_1 = ' + cx(z1), polar: 'z_1 = ' + pol(z1) }
  point:
    add:  cart '(x_1+x_2) + i(y_1+y_2) = (' + p(texNum(x1)) + ' + ' + p(texNum(x2)) + ') + i\\,(' + p(texNum(y1)) + ' + ' + p(texNum(y2)) + ') = ' + cx(v)
          polar noShort(pol(v))
    sub:  the same with '-' in place of '+' (formula text '(x_1-x_2) + i(y_1-y_2)')
    mul:  cart '(x_1x_2-y_1y_2) + i(x_1y_2+x_2y_1) = (' + p(x1) + '\\cdot' + p(x2) + ' - ' + p(y1) + '\\cdot' + p(y2) + ') + i\\,(' + p(x1) + '\\cdot' + p(y2) + ' + ' + p(x2) + '\\cdot' + p(y1) + ') = ' + cx(v)      // p(.) of texNum(.)
          polar 'r\\,e^{i\\theta} = ' + back
    div:  ex = quotientExact(z1, z2); den = abs2(z2)
          cart '\\dfrac{z_1\\overline{z_2}}{|z_2|^2} = \\dfrac{(' + cx(z1) + ')(' + cx(conj z2) + ')}{' + texNum(den) + '} = \\dfrac{' + cx(z1 · conj z2) + '}{' + texNum(den) + '}' + (ex ? ' = ' + ex : '') + ' \\approx ' + cx(v)
          polar 'r\\,e^{i\\theta} = ' + back
    conj: cart '\\overline{x+iy} = x - iy:\\ \\overline{' + cx(z1) + '} = ' + cx(v)
          polar '\\overline{r e^{i\\theta}} = r\\,e^{-i\\theta}:\\ \\overline{' + pol(z1) + '} = ' + pol(v)
    inv:  ex = quotientExact({1, 0}, z1); den = abs2(z1)
          cart '\\dfrac{1}{z_1} = \\dfrac{x-iy}{x^2+y^2} = \\dfrac{' + cx(conj z1) + '}{' + texNum(den) + '}' + (ex ? ' = ' + ex : '') + ' \\approx ' + cx(v)
          polar '\\dfrac{1}{r}\\,e^{-i\\theta}:\\ ' + pol(v)
  length:
    cart  '\\sqrt{x^2+y^2} = \\sqrt{' + sq(texNum(v.re)) + ' + ' + sq(texNum(v.im)) + '} ' +
          (isInt(abs2(v)) ? '= ' + lenTex(v) + (lenTex(v).includes('sqrt') ? ' \\approx ' + C.fmtNum(pv.r, 3) : '') : '\\approx ' + C.fmtNum(pv.r, 3))
    polar add | sub: noShort(C.fmtNum(pv.r, 3))
          mul: 'r_1r_2 = ' + lenTex(z1) + '\\cdot' + lenTex(z2) + ' = ' + prod + (isInt(pv.r) ? '' : ' \\approx ' + C.fmtNum(pv.r, 3))
               // prod: when abs2(z1) and abs2(z2) are integers, n = abs2(z1) * abs2(z2) -> its integer square root or '\\sqrt{n}'; else C.fmtNum(a.r * b.r, 3)
          div: '\\dfrac{r_1}{r_2} = \\dfrac{' + lenTex(z1) + '}{' + lenTex(z2) + '} \\approx ' + C.fmtNum(pv.r, 3)
          conj: '|\\overline{z_1}| = |z_1| = ' + lenTex(z1) + (isInt(abs2(z1)) && lenTex(z1).includes('sqrt') ? ' \\approx ' + C.fmtNum(a.r, 3) : '')
          inv: '\\dfrac{1}{r_1} = \\dfrac{1}{' + lenTex(z1) + '} \\approx ' + C.fmtNum(pv.r, 3)
  angle:
    cart  '\\operatorname{atan2}(y, x) = \\operatorname{atan2}(' + texNum(v.im) + ', ' + texNum(v.re) + ') ' + (exactAngle(pv.theta) ? '=' : '\\approx') + ' ' + texAngle(pv.theta) + (exactAngle(pv.theta) && pv.theta !== 0 ? ' \\approx ' + ang(pv.theta) : '')
    polar add | sub: noShort(texAngle(pv.theta) + the same angTail)
          mul: '\\theta_1+\\theta_2 = ' + ang(a.theta) + ' + ' + p(ang(b.theta)) + ' = ' + ang(raw) + ' ' + tail(raw, 'z_1z_2')
          div: '\\theta_1-\\theta_2 = ' + ang(a.theta) + ' - ' + p(ang(b.theta)) + ' = ' + ang(raw) + ' ' + tail(raw, 'z_1/z_2')
               tail(raw, name) = wrapped ? '\\Rightarrow \\operatorname{Arg}(' + name + ') = ' + ang(raw) + (raw > 0 ? ' - ' : ' + ') + '2\\pi = ' + ang(home) : '= \\operatorname{Arg}(' + name + ')'
          conj: '-\\theta_1 = -' + p(texAngle(a.theta)) + ' = ' + texAngle(pv.theta) + angTail
          inv:  '-\\theta_1 = ' + texAngle(pv.theta) + angTail
  if (M.zeroResult):                                                       // |v| < 1e-9
    length = { cart: 'r = 0', polar: 'r = 0' };  angle = { cart: '\\text{no angle at } 0', polar: '\\text{no angle at } 0' };  point.polar = '0'
  if (M.conjResult && M.binary):
    mirror: { cart: '\\overline{' + cx(v) + '} = ' + cx(w), polar: '\\overline{' + pol(v) + '} = ' + pol(w) }
    im:     { cart: '\\operatorname{Im}(' + cx(w) + ') = ' + texNum(w.im), polar: 'r\\sin\\theta = ' + texNum(pw.r) + '\\sin\\,' + trigArg(texAngle(pw.theta)) + ' \\approx ' + texNum(w.im) }
  same: { cart: cx(w), polar: pol(w), agree: M.agree }
```

*Golden strings* for problem 1.1.1 (z1 = 3 - 2i, z2 = -1 + 4i; compare with all whitespace removed; `agree` is true in every case):

```
mode mul
 inputs.cart   z_1 = 3 - 2i,\quad z_2 = -1 + 4i
 inputs.polar  z_1 = 3.606\,e^{-i\,0.588},\quad z_2 = 4.123\,e^{i\,1.816}
 point.cart    (x_1x_2-y_1y_2) + i(x_1y_2+x_2y_1) = (3\cdot(-1) - (-2)\cdot4) + i\,(3\cdot4 + (-1)\cdot(-2)) = 5 + 14i
 point.polar   r\,e^{i\theta} = 14.866\left(\cos\,1.228 + i\sin\,1.228\right) \approx 5 + 14i
 length.cart   \sqrt{x^2+y^2} = \sqrt{5^2 + 14^2} = \sqrt{221} \approx 14.866
 length.polar  r_1r_2 = \sqrt{13}\cdot\sqrt{17} = \sqrt{221} \approx 14.866
 angle.cart    \operatorname{atan2}(y, x) = \operatorname{atan2}(14, 5) \approx 1.228
 angle.polar   \theta_1+\theta_2 = -0.588 + 1.816 = 1.228 = \operatorname{Arg}(z_1z_2)
 same          5 + 14i   |   14.866\,e^{i\,1.228}
mode div
 point.cart    \dfrac{z_1\overline{z_2}}{|z_2|^2} = \dfrac{(3 - 2i)(-1 - 4i)}{17} = \dfrac{-11 - 10i}{17} = -\frac{11}{17} - \frac{10}{17}i \approx -0.647 - 0.588i
 point.polar   r\,e^{i\theta} = 0.874\left(\cos\,\left(-2.404\right) + i\sin\,\left(-2.404\right)\right) \approx -0.647 - 0.588i
 length.cart   \sqrt{x^2+y^2} = \sqrt{(-0.647)^2 + (-0.588)^2} \approx 0.874
 length.polar  \dfrac{r_1}{r_2} = \dfrac{\sqrt{13}}{\sqrt{17}} \approx 0.874
 angle.cart    \operatorname{atan2}(y, x) = \operatorname{atan2}(-0.588, -0.647) \approx -2.404
 angle.polar   \theta_1-\theta_2 = -0.588 - 1.816 = -2.404 = \operatorname{Arg}(z_1/z_2)
 same          -0.647 - 0.588i   |   0.874\,e^{-i\,2.404}
mode add
 point.cart    (x_1+x_2) + i(y_1+y_2) = (3 + (-1)) + i\,((-2) + 4) = 2 + 2i
 point.polar   \text{no shortcut: }2\sqrt{2}\,e^{i\,\frac{\pi}{4}}
 length.cart   \sqrt{x^2+y^2} = \sqrt{2^2 + 2^2} = \sqrt{8} \approx 2.828
 length.polar  \text{no shortcut: }2.828
 angle.cart    \operatorname{atan2}(y, x) = \operatorname{atan2}(2, 2) = \frac{\pi}{4} \approx 0.785
 angle.polar   \text{no shortcut: }\frac{\pi}{4} \approx 0.785
 same          2 + 2i   |   2\sqrt{2}\,e^{i\,\frac{\pi}{4}}
mode sub, mirror on
 point.cart    (x_1-x_2) + i(y_1-y_2) = (3 - (-1)) + i\,((-2) - 4) = 4 - 6i
 point.polar   \text{no shortcut: }7.211\,e^{-i\,0.983}
 length.cart   \sqrt{x^2+y^2} = \sqrt{4^2 + (-6)^2} = \sqrt{52} \approx 7.211
 angle.cart    \operatorname{atan2}(y, x) = \operatorname{atan2}(-6, 4) \approx -0.983
 mirror.cart   \overline{4 - 6i} = 4 + 6i
 mirror.polar  \overline{7.211\,e^{-i\,0.983}} = 7.211\,e^{i\,0.983}
 im.cart       \operatorname{Im}(4 + 6i) = 6
 im.polar      r\sin\theta = 7.211\sin\,0.983 \approx 6
 same          4 + 6i   |   7.211\,e^{i\,0.983}
mode conj
 point.cart    \overline{x+iy} = x - iy:\ \overline{3 - 2i} = 3 + 2i
 point.polar   \overline{r e^{i\theta}} = r\,e^{-i\theta}:\ \overline{3.606\,e^{-i\,0.588}} = 3.606\,e^{i\,0.588}
 angle.polar   -\theta_1 = -(-0.588) = 0.588
 same          3 + 2i   |   3.606\,e^{i\,0.588}
mode inv
 point.cart    \dfrac{1}{z_1} = \dfrac{x-iy}{x^2+y^2} = \dfrac{3 + 2i}{13} = \frac{3}{13} + \frac{2}{13}i \approx 0.231 + 0.154i
 length.polar  \dfrac{1}{r_1} = \dfrac{1}{\sqrt{13}} \approx 0.277
 same          0.231 + 0.154i   |   0.277\,e^{i\,0.588}
mode mul, z1 = z2 = -1 + 4i (wrap)
 angle.polar   \theta_1+\theta_2 = 1.816 + 1.816 = 3.632 \Rightarrow \operatorname{Arg}(z_1z_2) = 3.632 - 2\pi = -2.652
```

**5.3.6 The scene plan and the drawing layer (D9).**

```js
scenePlan(S, scale):                               // pure; scale = pixels per plane unit
  M = arithmeticModel(S)
  Z0 = { re: 0, im: 0 };  prims = [];  fit = [Z0, S.z1]
  if (M.undefinedResult) return { prims: [], fit: [Z0, S.z1, S.z2] }
  if (M.binary) fit.push(S.z2);  fit.push(M.value, M.result)
  lenPx(z) = Math.hypot(z.re, z.im) * scale
  Ra = clamp(0.4 * lenPx(S.z1), 16, 34);  Rb = Ra + 14                 // px radii of the two stacked arcs
  t1 = M.a.theta; t2 = M.b.theta; v = M.value; w = M.result
  switch (S.mode):
    add:  seg('s-a', 0 -> z1, '--cart', 2, arrow); seg('s-b', 0 -> z2, '--cart', 2, arrow)
          seg('s-a-v', z1 -> v, '--cart', 1.5, dash 'cart'); seg('s-b-v', z2 -> v, '--cart', 1.5, dash 'cart')
          seg('s-slide', 0 -> v, '--cart', 3, arrow); label('l-result', v, 'z₁ + z₂')
    sub:  seg('s-b', 0 -> z2, '--cart', 1.5); seg('s-slide-from-b', z2 -> z1, '--cart', 3, arrow)         // the slide that carries z2 to z1
          seg('s-a-v', z1 -> v, '--cart', 1.5, dash 'cart'); seg('s-slide', 0 -> v, '--cart', 2, dash 'cart', arrow)   // parallelogram 0, z2, z1, v
          label('l-result', v, 'z₁ − z₂')
    mul | div:  sgn = (mul ? +1 : -1); spun = C.mul(z1, C.expi(sgn * t2)); fit.push(spun)
          seg('s-ray-a', 0 -> z1, '--polar', 1.5, dash 'guide'); seg('s-ray-b', 0 -> z2, '--polar', 1.5, dash 'guide')
          seg('s-ray-result', 0 -> v, '--polar', 3, arrow)
          arc('arc-1', Ra, 0 -> t1, '--polar', 2.5)                              // omitted when |t1| * Ra < 5 px
          arc('arc-2', Rb, t1 -> t1 + sgn * t2, '--polar', 2.5, arrow)           // omitted when |t2| * Rb < 5 px; ends ON the result ray
          dot('spun', spun, '--polar', hollow); seg('s-stretch', spun -> v, '--polar', 2, dash 'guide', arrow)
          label('l-theta1', fromPolar((Ra + 10) / scale, t1 / 2), 'θ₁'); label('l-theta2', fromPolar((Rb + 10) / scale, t1 + sgn * t2 / 2), sgn > 0 ? 'θ₂' : '−θ₂')
          label('l-result', v, mul ? 'z₁ z₂' : 'z₁ / z₂')
    conj: seg('s-ray-a', 0 -> z1, '--polar', 1.5, dash 'guide'); seg('s-ray-v', 0 -> v, '--polar', 1.5, dash 'guide')
          seg('s-mirror', z1 -> v, '--cart', 2, dash 'cart')                                   // the vertical hop
          arc('arc-a', Ra, 0 -> t1, '--polar', 2.5); arc('arc-mirror', Ra, 0 -> -t1, '--polar', 2.5)
          label('l-theta1', ..., 'θ'); label('l-theta2', ..., '−θ'); label('l-result', v, 'conj z₁')
    inv:  inverted = scale(z1, 1 / abs2(z1)); fit.push(inverted)
          circle('unit-circle', Z0, 1, '--polar', dash 'guide'); seg('s-ray-a', 0 -> z1, '--polar', 1.5, dash 'guide')
          dot('inverted', inverted, '--polar', hollow); seg('s-mirror', inverted -> v, '--cart', 2, dash 'cart')
          arc('arc-a', Ra, 0 -> t1, '--polar', 2.5); arc('arc-mirror', Ra, 0 -> -t1, '--polar', 2.5)
          label('l-inverted', inverted, 'invert'); label('l-result', v, '1 / z₁')
  if (M.conjResult && M.binary):
    dot('pre-mirror', v, '--text', hollow); seg('s-mirror-result', v -> w, '--cart', 2, dash 'cart')
    label('l-pre', v, <the mode label>); relabel 'l-result' at w as 'conj(' + <mode label> + ')'
  every label: token '--text' except 'l-result' ('--output'), 'l-theta*' ('--polar'); dx 10, dy 16 (dy -8 for the θ labels)
  return { prims, fit }
```

The hollow dot is drawn as a ring: `drawCircle(ctx, pl, z, 5 / scale, { color, width: 2 })`. The layer:

```js
layer = plane.addLayer((ctx, pl) => {
  scale = pl.getView().scale;  plan = scenePlan(S, scale);  lastPlan = plan
  for (pr of plan.prims) switch (pr.type):
    'segment': drawSegment(ctx, pl, pr.a, pr.b, { color: pr.token, width: pr.width, dash: pr.dash ? DASH[pr.dash] : null, arrow: pr.arrow })      // the helpers set globalAlpha themselves: there is no alpha option, so "lighter" is a dash and a thinner line
    'arc':     drawArc(ctx, pl, { re: 0, im: 0 }, pr.radiusPx / scale, pr.from, pr.to, { color: pr.token, width: pr.width, arrow: pr.arrow })
    'dot':     pr.hollow ? drawCircle(ctx, pl, pr.z, 5 / scale, { color: pr.token, width: 2 }) : drawDot(ctx, pl, pr.z, { color: pr.token, radius: 5 })
    'circle':  drawCircle(ctx, pl, pr.center, pr.radius, { color: pr.token, dash: pr.dash ? DASH[pr.dash] : null, width: 1.5 })
    'label':   drawLabel(ctx, pl, pr.z, pr.text, { color: pr.token, dx: pr.dx, dy: pr.dy })
  if (S.anim.point) drawDot(ctx, pl, S.anim.point, { color: '--output', radius: 6 })                 // the traveller
}, { order: 10 })
```

`DASH` is the plane's exported dash table; `drawSegment` takes `dash` as an array. Draw non-finite or undefined plans as nothing (the plane helpers skip non-finite points). The layer is wrapped so a thrown error cannot happen: `scenePlan` must not throw for any finite or NaN state (unit test sweep).

**5.3.7 The proofs (pure, `proofsModel(z1, z2)`).**

```js
proofsModel(z1, z2):
  c1 = conj(z1); c2 = conj(z2); prod = mul(z1, z2); lhs = mul(c1, c2); rhs = conj(prod)
  r1, r2 = moduli; t1, t2 = Arg
  p1 = { lhs:  { cart: '\\overline{z_1}\\cdot\\overline{z_2} = (' + cx(c1) + ')(' + cx(c2) + ') = ' + cx(lhs),
                 polar: 'r_1e^{-i\\theta_1}\\cdot r_2e^{-i\\theta_2} = r_1r_2\\,e^{-i(\\theta_1+\\theta_2)} \\approx ' + polarTeX(lhs) },
         rhs:  { cart: '\\overline{z_1z_2} = \\overline{' + cx(prod) + '} = ' + cx(rhs),
                 polar: '\\overline{r_1r_2\\,e^{i(\\theta_1+\\theta_2)}} = r_1r_2\\,e^{-i(\\theta_1+\\theta_2)} \\approx ' + polarTeX(rhs) },
         same: { cart: cx(lhs), polar: polarTeX(lhs), agree: C.eq(lhs, rhs, 1e-9 * Math.max(1, |rhs|)) } }
  q = abs2(z1); r = Math.sqrt(q); X = texNum(z1.re); Y = texNum(z1.im)
  p2 = { zzbar: { cart: 'z\\overline{z} = (x+iy)(x-iy) = x^2+y^2 = ' + sq(X) + '+' + sq(Y) + ' = ' + texNum(q),
                  polar: 'z\\overline{z} = re^{i\\theta}\\cdot re^{-i\\theta} = r^2 = ' + (isInt(q) ? '\\left(' + lenTex(z1) + '\\right)^2 = ' + texNum(q) : C.fmtNum(r, 3) + '^2 \\approx ' + C.fmtNum(q, 3)) },
         sqrt:  { cart: '\\sqrt{z\\overline{z}} = \\sqrt{' + texNum(q) + '}' + (isInt(r) ? ' = ' + Math.round(r) : ' \\approx ' + C.fmtNum(r, 3)),
                  polar: '\\sqrt{r^2} = r' + (isInt(r) ? ' = ' + Math.round(r) : ' \\approx ' + C.fmtNum(r, 3)) },
         same:  { cart: '\\sqrt{z\\overline{z}} = ' + (isInt(r) ? Math.round(r) : C.fmtNum(r, 3)), polar: '|z| = r = ' + (isInt(r) ? Math.round(r) : C.fmtNum(r, 3)),
                  agree: Math.abs(Math.sqrt(mul(z1, conj(z1)).re) - Math.hypot(z1.re, z1.im)) < 1e-9 } }
```

Golden for z1 = 3 - 2i, z2 = -1 + 4i: `p1.lhs.cart` `\overline{z_1}\cdot\overline{z_2} = (3 + 2i)(-1 - 4i) = 5 - 14i`; `p1.rhs.cart` `\overline{z_1z_2} = \overline{5 + 14i} = 5 - 14i`; `p1.lhs.polar` ends `\approx 14.866\,e^{-i\,1.228}`; `p1.same.cart` `5 - 14i`; `p2.zzbar.cart` `z\overline{z} = (x+iy)(x-iy) = x^2+y^2 = 3^2+(-2)^2 = 13`; `p2.zzbar.polar` `z\overline{z} = re^{i\theta}\cdot re^{-i\theta} = r^2 = \left(\sqrt{13}\right)^2 = 13`; `p2.sqrt.cart` `\sqrt{z\overline{z}} = \sqrt{13} \approx 3.606`; `p2.same.cart` `\sqrt{z\overline{z}} = 3.606`, `p2.same.polar` `|z| = r = 3.606`. For z1 = 1 + i: `p2.zzbar.cart` ends `1^2+1^2 = 2` and `p2.zzbar.polar` ends `\left(\sqrt{2}\right)^2 = 2`.

The two explainers: `createExplainer(host, { id: 'arithmetic-p1', title: 'conj z₁ · conj z₂ = conj(z₁ z₂)', columns: <the tinted pair>, rows: [ {id:'lhs', label:'conj z₁ · conj z₂'}, {id:'rhs', label:'conj(z₁ z₂)'} ], same })` and `id: 'arithmetic-p2'` with rows `zzbar` ("z · conj z") and `sqrt` ("√(z · conj z)"). Both are updated with `proofsModel(S.z1, S.z2)` on every state change. Below each, two `div.ar-route` blocks show `problemById('P1').routes.cart` and `.polar` (and for P2) through `prose()`, headed "Cartesian proof" and "Polar proof".

**5.3.8 Phases and the traveller (pure).**

```js
phasesFor(S):                                       // [] when the result is undefined
  M = arithmeticModel(S); if (M.undefinedResult) return []
  t2 = M.b.theta; r2 = M.b.r; out = []
  add:  [{ kind: 'slide', from: z1, to: z1 + z2, caption: 'Slide z₁ by z₂: across by x₂, up by y₂.' }]
  sub:  [{ kind: 'slide', from: z1, to: z1 - z2, caption: 'Slide z₁ back by z₂.' }]
  mul:  spun = z1 · e^{i t2};  [{ kind: 'spin', from: z1, angle: t2, to: spun, caption: 'Spin z₁ by the angle of z₂.' },
                                { kind: 'stretch', from: spun, factor: r2, to: M.value, caption: 'Stretch by the length of z₂.' }]
  div:  spun = z1 · e^{-i t2}; [{ kind: 'spin', ..., angle: -t2, caption: 'Spin z₁ back by the angle of z₂.' },
                                { kind: 'stretch', ..., factor: 1 / r2, caption: 'Shrink by the length of z₂.' }]
  conj: [{ kind: 'mirror', from: z1, to: conj z1, caption: 'Mirror across the real axis.' }]
  inv:  inverted = z1 / |z1|²; [{ kind: 'invert', from: z1, to: inverted, caption: 'Invert the length: r becomes 1/r, on the same ray.' },
                                 { kind: 'mirror', from: inverted, to: conj inverted, caption: 'Mirror across the real axis.' }]
  if (M.conjResult && M.binary) out.push({ kind: 'mirror', from: M.value, to: conj(M.value), caption: 'Mirror the answer across the real axis.' })

pointAt(ph, s):                                     // s in [0, 1]; f = ph.from
  slide:   f + s (to - f)                           spin:    f · e^{i s angle}
  stretch: f · (1 + s (factor - 1))                 invert:  f · (1 + s (1 / |f|² - 1))
  mirror:  { re: f.re, im: f.im (1 - 2 s) }

ease(s) = s < 0.5 ? 4 s³ : 1 - (-2 s + 2)³ / 2      // cubic in-out
travelerAt(phases, u):                              // u in [0, 1] over all phases
  n = phases.length; if (n === 0) return null
  uu = clamp(u, 0, 1); i = Math.min(n - 1, Math.floor(uu * n)); s = uu * n - i
  return pointAt(phases[i], ease(clamp(s, 0, 1)))
```

Checks for 1.1.1 mul (computed): `travelerAt(ph, 0)` = 3 - 2i; `0.25` = (3.4226, 1.1338); `0.5` = (1.2127, 3.3955) (z1 spun by θ2, length still √13); `0.75` = (3.1063, 8.6977); `1` = 5 + 14i. For sub with the mirror: `0.5` = 4 - 6i, `0.75` = (4, 0), `1` = 4 + 6i.

**5.3.9 Playing the move.**

```js
PHASE_MS = 1400
play():                                             // click on #arithmetic-animate
  ph = phasesFor(S)
  if (ph.length === 0) return                       // the button is disabled then
  if (ctx.theme.prefersReducedMotion()) return stepNext()          // checked at click time
  if (S.anim.kind === 'playing') return stop()
  clearAnim(); S.anim = { kind: 'playing', startMs: performance.now(), phases: ph, trail: [], point: null, u: 0 }
  trailLayer.update([]); button.textContent = 'Stop'; frame = requestAnimationFrame(tick)
tick(nowMs):
  u = clamp((nowMs - S.anim.startMs) / (PHASE_MS * ph.length), 0, 1)
  p = travelerAt(ph, u); S.anim.point = p; S.anim.u = u
  S.anim.trail.push({ re: p.re, im: p.im, t: u }); trailLayer.update(S.anim.trail)
  caption.textContent = ph[Math.min(ph.length - 1, Math.floor(u * ph.length))].caption
  plane.requestDraw()
  if (u < 1) frame = requestAnimationFrame(tick)
  else { S.anim.kind = 'done'; button.textContent = playLabel(M); announce('Done. The result is ' + C.fmtCart(M.result) + '.') }
stop(): cancelAnimationFrame(frame); S.anim.kind = 'stopped'; button.textContent = playLabel(M)        // traveller and trail stay where they are
clearAnim(): cancelAnimationFrame(frame); S.anim = idle; trailLayer.update([]); caption.textContent = 'Press Play to watch the move.'; button.textContent = playLabel(M)
```

The trail is `trailLayer = plane.addCurve({ id: 'trail', points: [], color: '--output', ramp: true, dots: true, arrow: true, width: 3, order: 200 })`. `playLabel(M)` is the idle text of the button: when `ctx.theme.prefersReducedMotion()` is true (read at render time) it is `'Next step (1 of ' + phasesFor(S).length + ')'`, otherwise the Play text of 2.5 for the mode. `clearAnim()` returns at once when `S.anim.kind` is already `'idle'`, so calling it on every pointer move is free; it runs on every state change (drag, typed value, mode, mirror toggle, lock, preset; the Fit button is not a state change), in `unmount`, and before a new play.

*Stepper (reduced motion).* `S.anim.step` runs 0..n (n = number of phases):

```js
stepNext():
  ph = phasesFor(S); n = ph.length; step = (S.anim.kind === 'stepped' ? S.anim.step : 0) + 1
  if (step > n) return clearAnim()                  // "Start over"
  trail = []; for (i = 0; i < step; i++) for (k = 0; k <= 12; k++) trail.push({ ...pointAt(ph[i], k / 12), t: (i + k / 12) / n })        // no easing, 13 samples per completed phase
  S.anim = { kind: 'stepped', step, phases: ph, trail, point: trail[trail.length - 1] }
  trailLayer.update(trail); caption.textContent = ph[step - 1].caption; plane.requestDraw()
  button.textContent = step < n ? 'Next step (' + (step + 1) + ' of ' + n + ')' : 'Start over'
```

At step 0 the label is `Next step (1 of n)`. No timers, no rAF, no motion.

**5.3.10 `render({ skipField })`.**

```js
render({ skipField = null } = {}):
  M = arithmeticModel(S)
  resultHandle.set(M.undefinedResult ? { re: NaN, im: NaN } : M.result, { silent: true })       // NaN hides the handle
  readout.textContent = arithmeticReadout(M)
  key = S.mode + ':' + S.conjResult; if (key !== rowsKey) { rowsKey = key; ex.setRows(buildRows(M)) }
  ex.update({ M, cells: arithmeticCells(M) })
  w = whyText(M); why.dataset.tone = w.tone; why.firstChild.textContent = w.text
  wn = wrapNote(M); wrapEl.hidden = (wn === ''); wrapEl.textContent = wn
  noteEl.textContent = M.undefinedResult ? undefinedSentence(M) : (offPicture(M) ? 'The result is off the picture. Let go and the view will zoom out to fit it.' : '')
  syncFields(M, skipField)                          // z1 and z2 text: texts as C.fmtCart(z, 3) (ASCII), skipped for skipField
  modeChips aria-pressed; conjChip aria-pressed = S.conjResult and aria-disabled = !M.binary; lockBox.checked = S.lockConj; snapBox.checked = S.snap
  playBtn.disabled = (phasesFor(S).length === 0); playBtn.title = disabled ? 'There is nothing to play: the result is undefined.' : ''; if (S.anim.kind === 'idle') playBtn.textContent = playLabel(M)
  badges: show 'part 1' / 'part 2' on the mul / div chips iff S.hint === '1.1.1' and S.mode === 'mul'
  { p1, p2 } = proofsModel(S.z1, S.z2); p1Ex.update(p1); p2Ex.update(p2)
  el.dataset.mode = S.mode; el.dataset.conjResult = String(S.conjResult)
  plane.requestDraw()
offPicture(M) = any of [M.value, M.result] is finite and outside the plane's visible box (centre ± half extents, from getView and getSize)
undefinedSentence(M) = mode inv ? 'z₁ is 0, so 1/z₁ is undefined.' : 'z₂ is 0, so z₁ ÷ z₂ is undefined.'
```

**5.3.11 Handlers.**

```js
onDragZ1(z, info):
  z = snapIfPointer(z, info);  S.z1 = clean(z);  if (S.lockConj) { S.z2 = conj(S.z1); z2Handle.set(S.z2, { silent: true }) }
  clearAnim(); render();  if (info.final) settleView()
onDragZ2(z, info):  symmetrical: S.z2 = clean(z); if (S.lockConj) { S.z1 = conj(S.z2); z1Handle.set(S.z1, { silent: true }) }
snapIfPointer(z, info): info.source === 'pointer' && S.snap ? (zs = snapPoint(z, view.unitsAcross, size.w); if (zs differs) handle.set(zs, { silent: true }); zs) : z
setMode(mode):                                      // chip click
  S.mode = mode; S.conjResult = false; S.hint = null; plane.setGrid(gridFor(mode)); clearAnim(); render(); refit()
gridFor(mode) = { add: 'cart', sub: 'cart', mul: 'polar', div: 'polar', conj: 'cart', inv: 'polar' }[mode]
toggleMirror():  if (!arithmeticModel(S).binary) return; S.conjResult = !S.conjResult; clearAnim(); render(); refit()
toggleLock(on):  S.lockConj = on; if (on) { S.z2 = conj(S.z1); z2Handle.set(S.z2, { silent: true }) } clearAnim(); render(); settleView()
fields:  bindField(z1Input, parseComplexField, (v, o) => { S.z1 = clean(v); if (S.lockConj) { S.z2 = conj(S.z1); ... } z1Handle.set(S.z1, { silent: true }); ... clearAnim(); render({ skipField: o.live ? o.source : null }); if (!o.live) settleView() }, showFieldError(z1Error))
         z2 symmetrical (with the lock, typing z2 sets z1 = conj z2)
presetClick():  loadState(DEFAULT)                 // 5.3.2; loadState ends in render() and refit()
```

`clean(v)` is `{ re: v.re + 0, im: v.im + 0 }` with components below 1e-12 set to 0.

**5.3.12 View management (D8).**

```js
plane = createPlane(host, { id: 'arithmetic-plane', xRange: [-4, 4], yRange: [-4, 4], grid: gridFor(S.mode), axisLabels: ['Re', 'Im'],
                            maxWidth: 520, maxUnitsAcross: 400, ariaLabel: 'The complex plane with z1, z2 and the result' })
resultHandle = plane.addPoint({ id: 'result', z: M.result, draggable: false, focusable: false, color: '--output', radius: 7, name: 'result' })   // FIRST
z1Handle = plane.addPoint({ id: 'z1', z: S.z1, label: 'z₁', name: 'z₁', color: '--input', step: 0.1, onDrag: onDragZ1 })
z2Handle = plane.addPoint({ id: 'z2', z: S.z2, label: 'z₂', name: 'z₂', color: '--input', step: 0.1, onDrag: onDragZ2 })
refit():  plane.fitTo(scenePlan(S, plane.getView().scale).fit, 0.18)         // also sets the Reset view
settleView():  // once, after a drag ends or a typed value commits
  pl = scenePlan(...); if any finite fit point lies outside the central 92% of the view box (|re - cx| > 0.92 halfW or |im - cy| > 0.92 halfH) -> refit()
```

`refit()` runs on mount, on every mode change, on the mirror toggle, on a preset, and on the Fit button. Never from `onDrag`. `fitTo` floors each span at 2 units and pads by 18%. Examples (computed, 1.1.1 numbers, via the plane's own fit rule): + centre (1, 1) across 8.160; - centre (1.5, -1) across 13.600; × centre (2, 6) across 21.760; ÷ centre (0.166, 0.787) across 8.738; conj centre (1.5, 0) across 5.440; 1/z centre (1.5, -0.923) across 4.080. The snap lattice at those zooms is 0.5, 1, 1, 0.5, 0.5, 0.5 (so (1, 0) is on the lattice at every one of them).

**5.3.13 CSS.** Section 5.2.13 holds both stations' rules; `arithmetic` injects `<style data-for="station-arithmetic">` with the same text.

**5.3.14 Mount skeleton.** As 5.2.14, with these differences: three explainers are created (`arithmetic-ex` with `columns: [{ key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true }, { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true }]`, `title: 'The same answer, worked in both addresses'`, `rows: buildRows(M)`, `same`; and `arithmetic-p1`, `arithmetic-p2`); no staircase; the trail curve and the layer are added after the handles; `unmount` additionally calls `clearAnim()`; after the first `render()` the mount calls `refit()` once so the first picture contains 0, z1, z2 and the result; the strip shows `problemById(<the preset's problem when it is one of 1.1.1, 1.1.2, P1, P2, else '1.1.1')`. The hook is `mv.arithmetic = { state, plan }`. The headings of the main explainer are the shared defaults so "Polar (spin-and-stretch)" is exactly the text A5 looks for.

### 5.4 Resolution, size and performance management

1. **Canvas resolution** is the plane's job (devicePixelRatio capped at 3, a ResizeObserver, redraw coalesced to one animation frame). The stations only call `requestDraw()`.
2. **Pixel-constant marks.** Arc radii (16 to 34 px, plus 14), the hollow rings (5 px), the traveller (6 px) and label offsets are in pixels and converted with `pl.getView().scale` on every draw, so they keep their size when the student zooms or the phone rotates; `ghostCounts` reads the current ray length in pixels on every draw for the same reason.
3. **Layout.** Planes are square (aspect 1, `maxWidth` 520 px, 100% of their grid cell below that). Nothing sets a fixed pixel width on a field, panel or explainer; every grid child has `min-width: 0`. Wide TeX lives in `.tex-scroll` or in the explainer (which wraps and stacks at 560 px).
4. **Cost per pointer move.** One `addressModel` (or `arithmeticModel`, `proofsModel`), a handful of `textContent` writes, `staircase.update` (seven rows of text), two or three `explainer.update` calls that coalesce to one render per frame (adaptive: a render over 8 ms widens the gap, never beyond 100 ms), and one plane redraw. The KaTeX of the forms panel is one pass per frame and skipped when a string did not change. While updates stream the explainer renders without MathML and refines 220 ms after the last one.
5. **Budget.** 60 fps on drag for the plane (target `getStats().lastDrawMs` under 8 ms at 1280 x 860 and under 16 ms at 390 x 844); the explainers keep to 4 to 6 rows (ARCHITECTURE 10.3.4); the proofs panel adds two small explainers of 2 rows each. The animation uses one `requestAnimationFrame` loop, never a timer, and pushes at most about 170 trail points (2.8 s at 60 fps) with the same cost as any other curve.
6. **No work off-screen.** The plane pauses nothing by itself, but nothing here polls: when the student is idle there is no timer and no frame loop (the only loop is the play loop, which ends with the move).

---

## 6. Mathematics

Every value below was computed twice: by hand from the formulas, and in Node from `complex.js` (they agree to the digits shown; ten decimals where a unit test pins 1e-9). Angles are radians; `fmt` columns are what the readouts show (three decimals, ASCII).

### 6.1 Formulas used

| # | Formula | Used for |
|---|---|---|
| F1 | x = r cos θ, y = r sin θ | polar address to Cartesian |
| F2 | r = √(x² + y²); cos θ = x/r and sin θ = y/r | Cartesian address to polar |
| F3 | θ = atan2(y, x): arctan(y/x) for x > 0; arctan(y/x) + π for x < 0, y >= 0; arctan(y/x) − π for x < 0, y < 0; π/2 and −π/2 for x = 0, y > 0 and y < 0. It lands in (−π, π]; Arg of a negative real is π, never −π; Arg 0 is not defined (the site's convention Arg 0 = 0 is internal and never shown) | Arg z, the readout, the staircase |
| F4 | e^{iθ} = cos θ + i sin θ, so z = r e^{iθ} = r(cos θ + i sin θ) | the two forms of 1.3.1 |
| F5 | arg z = { Arg z + 2πk : k an integer }, a set of names of one direction; cos and sin have period 2π | the faint windings, the staircase |
| F6 | home(θ) = θ − 2π⌈(θ − π)/(2π)⌉, the one name in (−π, π] (`wrapArg`) | typed θ, the wrap note |
| F7 | z1 ± z2 = (x1 ± x2) + i(y1 ± y2) | the slide |
| F8 | z1 z2 = (x1x2 − y1y2) + i(x1y2 + x2y1) = r1r2 e^{i(θ1+θ2)}; the polar form follows from the angle-sum identities cos(a+b) = cos a cos b − sin a sin b and sin(a+b) = sin a cos b + cos a sin b | the spin-and-stretch |
| F9 | z1/z2 = z1 conj z2 / \|z2\|² = [(x1x2 + y1y2) + i(x2y1 − x1y2)] / (x2² + y2²) = (r1/r2) e^{i(θ1−θ2)} | unspin and shrink |
| F10 | conj z = x − iy = r e^{−iθ} | the mirror |
| F11 | 1/z = conj z / \|z\|² = (1/r) e^{−iθ} | invert, then mirror |
| F12 | \|z1 + z2\|² = r1² + r2² + 2 r1 r2 cos(θ1 − θ2) (law of cosines) | why polar has no shortcut for + |
| F13 | z conj z = x² + y² = \|z\|² = r² | P2 |
| F14 | Im z = r sin θ, Re z = r cos θ | the polar check of 1.1.2 |

### 6.2 Worked solutions, both addresses

**1.3.1. Write z = −1 + i√3 in polar and exponential form. What is Arg(z)?** (address: Cartesian, then polar)

- *From the Cartesian address (-1, √3):* r = √((−1)² + (√3)²) = √(1 + 3) = √4 = 2. Then cos θ = x/r = −1/2 and sin θ = y/r = √3/2. The angle in (−π, π] with that cosine and sine is θ = 2π/3 (cos 2π/3 = −1/2, sin 2π/3 = √3/2). So z = 2(cos 2π/3 + i sin 2π/3) = 2e^{i2π/3} and **Arg z = 2π/3 = 2.0943951** (120°).
- *From the polar address, reading the dot:* it is in the second quadrant, so its reference angle φ from the negative real axis has tan φ = |y|/|x| = √3, φ = π/3, and θ = π − π/3 = 2π/3. Its distance from 0 is 2. Back to Cartesian: x = 2 cos 2π/3 = 2(−1/2) = −1 and y = 2 sin 2π/3 = 2(√3/2) = √3 = 1.7320508. Same dot.
- *arg z* = { 2π/3 + 2πk }: k = −2 … 2 gives −10π/3 (−10.4719755), −4π/3 (−4.1887902), **2π/3 (2.0943951)**, 8π/3 (8.3775804), 14π/3 (14.6607657). All five reach the same dot; only k = 0 lies in (−π, π], so only it is Arg z.

Other presets and the pinned drag, with the same two routes:

| z | r | Arg z | readout | note |
|---|---|---|---|---|
| −1 + i√3 | 2 | 2π/3 = 2.0943951 | `z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)` | second quadrant, reference angle π/3 |
| √3 + i | 2 | π/6 = 0.5235988 | `z = 1.732 + i; |z| = 2; Arg z = 0.524 (pi/6)` | tan θ = 1/√3 |
| 2i | 2 | π/2 = 1.5707963 | `z = 2i; |z| = 2; Arg z = 1.571 (pi/2)` | on the positive imaginary axis |
| −16 | 16 | π = 3.1415927 | `z = -16; |z| = 16; Arg z = 3.142 (pi)` | on the negative real axis: Arg is π, never −π; the seam and the ray coincide |
| 1 + i | √2 = 1.4142136 | π/4 = 0.7853982 | `z = 1 + i; |z| = 1.414; Arg z = 0.785 (pi/4)` | |
| 2 + i (the A2 drag) | √5 = 2.2360680 | arctan(1/2) = 0.4636476 | `z = 2 + i; |z| = 2.236; Arg z = 0.464` | first quadrant, so atan2(1, 2) = arctan(1/2); no exact π form |
| 0 | 0 | undefined | `z = 0; |z| = 0; Arg z = undefined` | every direction reaches 0 |

Typed angles: with r = 2, θ = 8π/3 = 8.3775804 gives z = 2(cos 8π/3 + i sin 8π/3) = 2(cos 2π/3 + i sin 2π/3) = −1 + i√3 (the same dot) and Arg z = 2π/3; θ = 4π/3 = 4.1887902 gives z = 2(−1/2 − i√3/2) = −1 − i√3 and Arg z = 4π/3 − 2π = −2π/3 = −2.0943951; θ = π gives z = −2 and Arg z = π; θ = −π gives the same z and the same Arg z = π.

**1.1.1. z1 = 3 − 2i, z2 = −1 + 4i: compute z1z2 and z1/z2 in the form x + iy.** (address: Cartesian for the answer, polar as the check)

- *Cartesian.* By definition, x1x2 − y1y2 = 3(−1) − (−2)(4) = −3 + 8 = 5 and x1y2 + x2y1 = 3·4 + (−1)(−2) = 12 + 2 = 14, so **z1z2 = 5 + 14i**. For the quotient multiply top and bottom by the mirror of z2, conj z2 = −1 − 4i: (3 − 2i)(−1 − 4i) = −3 − 12i + 2i + 8i² = −11 − 10i, and |z2|² = 1 + 16 = 17, so **z1/z2 = (−11 − 10i)/17 = −11/17 − (10/17)i = −0.6470588 − 0.5882353i**. Check: z2 · (−11 − 10i)/17 = (11 + 10i − 44i − 40i²)/17 = (51 − 34i)/17 = 3 − 2i.
- *Polar.* z1: r1 = √13 = 3.6055513, θ1 = −arctan(2/3) = −0.5880026 (fourth quadrant). z2: r2 = √17 = 4.1231056, θ2 = π − arctan 4 = 3.1415927 − 1.3258177 = 1.8157750 (second quadrant). Product: r = r1r2 = √13·√17 = √221 = 14.8660687 and θ = θ1 + θ2 = 1.2277724, inside (−π, π], so no wrap. The point 5 + 14i has |5 + 14i| = √(25 + 196) = √221 and Arg = arctan(14/5) = 1.2277724, so the two routes agree. Quotient: r = r1/r2 = √(13/17) = 0.8744746 and θ = θ1 − θ2 = −2.4037776. The point −11/17 − (10/17)i has modulus √(121 + 100)/17 = √221/17 = 0.8744746 and, in the third quadrant, Arg = −π + arctan(10/11) = −3.1415927 + 0.7378151 = −2.4037776. They agree.
- *Which address is easy and why.* The angles −0.588 and 1.816 are not nice numbers, so on the test you multiply out in x and y (exact integers) and use √221 and θ1 + θ2 as the check. With nice angles (for example (1 + i)(i), angles π/4 and π/2) the polar route is the short one; the station says so (`whyText`, 5.3.4).
- *Addition for contrast (the slide).* z1 + z2 = 2 + 2i, r = 2√2 = 2.8284271, θ = π/4. In polar the length needs F12: r² = 13 + 17 + 2√221 cos(θ1 − θ2) = 30 + 2√221 · (−11/√221) = 30 − 22 = 8, because cos(θ1 − θ2) = (x1x2 + y1y2)/(r1r2) = −11/√221 = −0.7399401. That is why the polar column says "no shortcut" for + and −.

**1.1.2. Find Im(conj(z1 − z2)) for z1 = 3 − 2i, z2 = −1 + 4i.** (address: Cartesian)

- *Cartesian.* z1 − z2 = (3 − (−1)) + (−2 − 4)i = 4 − 6i. Its conjugate is 4 + 6i. **Im(4 + 6i) = 6.**
- *Polar check.* z1 − z2 has r = √52 = 7.2111026 and θ = −arctan(6/4) = −0.9827937 (fourth quadrant). The mirror keeps r and negates the angle: θ = +0.9827937. Then Im = r sin θ = 7.2111026 · 0.8320503 = 6.0000000 (and Re = r cos θ = 7.2111026 · 0.5547002 = 4).
- In the station: mode −, mirror toggle on. The `im` row shows both lines; `Im(conj w) = −Im w = 6` in the why-line.

**P1. Show that conj z1 · conj z2 = conj(z1z2).** (address: either; polar is one line)

- *Cartesian.* (x1 − iy1)(x2 − iy2) = x1x2 − ix1y2 − ix2y1 + i²y1y2 = (x1x2 − y1y2) − i(x1y2 + x2y1). And z1z2 = (x1x2 − y1y2) + i(x1y2 + x2y1), whose conjugate is the same number. Equal. With z1 = 3 − 2i, z2 = −1 + 4i: (3 + 2i)(−1 − 4i) = −3 − 12i − 2i − 8i² = 5 − 14i, and conj(5 + 14i) = 5 − 14i.
- *Polar.* conj(re^{iθ}) = re^{−iθ} (cos(−θ) = cos θ, sin(−θ) = −sin θ). So conj z1 · conj z2 = r1e^{−iθ1} · r2e^{−iθ2} = r1r2 e^{−i(θ1+θ2)} = conj(r1r2 e^{i(θ1+θ2)}) = conj(z1z2). With the numbers: 14.8660687 e^{−i 1.2277724} = 14.866(0.3363362 − 0.9417421i) = 5 − 14i.

**P2. Show that |z| = √(z · conj z).** (address: polar)

> Superseded in residue cleanup: the callout at P2 (mode ×, z₂ = conj z₁) says the two spins cancel (θ₁ + θ₂ = -0.588 + 0.588 = 0, "a name for 0", so a negative real works too), that only r · r = r² is left, and why z · conj z is a plain number. The "not both nice numbers, multiply out" wording is for 1.1.1 only (`arithmeticModel` has `mirrorPair`; the point row's native address is polar for it).

- *Cartesian.* (x + iy)(x − iy) = x² − (iy)² = x² + y², so √(z conj z) = √(x² + y²) = |z| (the root of a non-negative number). z = 3 − 2i: 9 + 4 = 13 and √13 = 3.6055513 = |z|.
- *Polar.* re^{iθ} · re^{−iθ} = r² e^{0} = r²: the spin and the unspin cancel and only the lengths are left. Since r >= 0, √(r²) = r = |z|. With r = √13: r² = 13.

**Products and the staircase (the wrap note).** z2 · z2 = (−1 + 4i)² = 1 − 8i + 16i² = −15 − 8i. Polar: r = r2² = 17 and the angles add to θ2 + θ2 = 3.6315500, which is past π. That number is a name of the direction (a member of the set arg(z2²) = arg z2 + arg z2, Thm 1.4.14); the home name is 3.6315500 − 2π = −2.6516353, and indeed Arg(−15 − 8i) = −π + arctan(8/15) = −3.1415927 + 0.4899573 = −2.6516354.

**The other two modes.** conj z1 = 3 + 2i (r = 3.6055513, θ = +0.5880026). 1/z1 = conj z1/|z1|² = (3 + 2i)/13 = 3/13 + (2/13)i = 0.2307692 + 0.1538462i, polar (1/√13) e^{+i 0.5880026} with 1/√13 = 0.2773501.

### 6.3 Expected values collected (these are the unit-test numbers)

| Quantity | Value |
|---|---|
| 1.3.1 | r = 2, Arg = 2π/3 = 2.0943951024, z = (−1, 1.7320508076), arg k = −2..2: −10.4719755120, −4.1887902048, 2.0943951024, 8.3775804096, 14.6607657168 |
| 1.3.1 readout | `z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)` |
| A2 drag to (2, 1) | `z = 2 + i; |z| = 2.236; Arg z = 0.464`; fields x "2", y "1", r "2.236", θ "0.464" |
| A2 typed (−16, 0) | `z = -16; |z| = 16; Arg z = 3.142 (pi)`; fields r "16", θ "3.142" |
| r1, θ1, r2, θ2 | 3.6055512755, −0.5880026035, 4.1231056256, 1.8157749899 |
| z1 + z2, z1 − z2 | 2 + 2i (r 2.8284271247, Arg π/4), 4 − 6i (r 7.2111025509, Arg −0.9827937232) |
| conj(z1 − z2), Im | 4 + 6i, 6 |
| z1 z2 | 5 + 14i; r = √221 = 14.8660687473; Arg = 1.2277723864 = θ1 + θ2 |
| z1 / z2 | −11/17 − (10/17)i = −0.6470588235 − 0.5882352941i; r = 0.8744746322; Arg = −2.4037775935 = θ1 − θ2 |
| conj z1, 1/z1 | 3 + 2i; 0.2307692308 + 0.1538461538i (r 0.2773500981) |
| arithmetic readouts | `result = 5 + 14i; |result| = 14.866; Arg = 1.228`; `result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404`; `result = 4 - 6i; |result| = 7.211; Arg = -0.983`; `result = 4 + 6i; |result| = 7.211; Arg = 0.983`; `result = 2 + 2i; |result| = 2.828; Arg = 0.785 (pi/4)`; `result = 3 - 2i; |result| = 3.606; Arg = -0.588` (× by 1); `result = 3 + 2i; |result| = 3.606; Arg = 0.588` (conj); `result = 0.231 + 0.154i; |result| = 0.277; Arg = 0.588` (1/z) |
| z2² | −15 − 8i, r 17, angle sum 3.6315499798, Arg −2.6516353273 |
| P1 | lhs = rhs = 5 − 14i (r 14.8660687473, Arg −1.2277723864) |
| P2 | z z̄ = 13, √13 = 3.6055512755 = \|z\| (z = 3 − 2i); for z = 1 + i: 2 and √2 |
| law of cosines | cos(θ1 − θ2) = −0.7399400734; 2 r1 r2 cos = −22; r1² + r2² + (−22) = 8 |
| spun z1 (× phase 1) | z1 e^{iθ2} = 1.2126781252 + 3.3954987505i (length √13) |
| soft snap | (2.004, 0.997) at 8 units, 358 px → (2, 1); (1.04, −0.03) at 21.76 units, 358 px → (1, 0) |

---

## 7. Verification plan

Every acceptance criterion has a command, an expected result and what passing looks like. Nothing here needs a network. Run from the repo root. Node 22 needs the quoted glob for `npm test`.

### 7.1 Commands

| Criterion | Command | Passing |
|---|---|---|
| unit tests | `node --test tests/unit/i1-station-addresses-arithmetic.test.mjs` and `npm test` | all pass (the 287 earlier tests keep passing) |
| A1 | `node tools/smoke.mjs --route addresses,arithmetic,problem-1-3-1,problem-1-1-1 --dark` | `12/12 checks passed across 4 route(s).`, exit 0: no console error, page error, failed request, external request, router error panel or horizontal overflow at 1280, 390 and the dark desktop |
| A2 | `node tools/smoke.mjs --route problem-1-3-1 --script tests/interact/i1-station-addresses-arithmetic.mjs --dark` | `3/3 checks passed` |
| A3 | `node tools/smoke.mjs --route problem-1-3-1 --script tests/interact/i1-station-addresses-arithmetic.mjs --dark --out docs/review/iter-1/i1-station-addresses-arithmetic/shots` then read `problem-1-3-1--desktop--a3.png` (and `--phone--a3`, `--desktop-dark--a3`) | the checklist in 7.4 |
| A4 | `node tools/smoke.mjs --route problem-1-1-1 --script tests/interact/i1-station-addresses-arithmetic.mjs --dark` | `3/3 checks passed` |
| A5 | `node tools/smoke.mjs --route arithmetic --script tests/interact/i1-station-addresses-arithmetic.mjs --dark --out docs/review/iter-1/i1-station-addresses-arithmetic/shots` then read `arithmetic--desktop--add.png` and `arithmetic--desktop--mul.png` | the checklist in 7.4 |
| A6 | code inspection (7.5) plus `--route arithmetic` and `--route problem-P1`, `--route problem-P2` with the same script | the inspection list is all true; `3/3` for each route |
| extra deep links | the same script for `problem-1-1-2`, `addresses-m16`, `arithmetic-div` | `3/3` each |

The script is one file; it branches on `ctx.route` (7.3). `ctx.shot(name)` writes `<route>--<viewport>--<name>.png`.

### 7.2 Unit tests, `tests/unit/i1-station-addresses-arithmetic.test.mjs`

`node:test`, `node:assert/strict`. Imports both station modules directly (their import must work in Node: no top-level DOM) and `../../js/data/problems.js`. KaTeX is loaded through `vm` from `vendor/katex/katex.min.js` (a classic UMD file in a `type: module` package: `require` fails, so read the text, run it with `vm.runInContext` in a context that has `module` and `exports`, and take `module.exports`). Each row below is one `test(...)` or one table inside a test. Tolerance 1e-9 unless stated; "text" values are exact.

**`addresses.js`**

| # | What | Expected |
|---|---|---|
| U1 | `PRESETS` | ids in order `m1-sqrt3i`, `sqrt3-i`, `2i`, `m16`, `1-i`; z = (−1, √3), (√3, 1), (0, 2), (−16, 0), (1, 1); `PRESETS[0].z` equals `problemById('1.3.1').answer.values.z` within 1e-12 |
| U2 | `addressReadout(addressModel(z))` | (−1, √3) `z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)`; (√3, 1) `z = 1.732 + i; |z| = 2; Arg z = 0.524 (pi/6)`; (0, 2) `z = 2i; |z| = 2; Arg z = 1.571 (pi/2)`; (−16, 0) `z = -16; |z| = 16; Arg z = 3.142 (pi)`; (1, 1) `z = 1 + i; |z| = 1.414; Arg z = 0.785 (pi/4)`; (2, 1) `z = 2 + i; |z| = 2.236; Arg z = 0.464`; (0, −1) `z = -i; |z| = 1; Arg z = -1.571 (-pi/2)`; (0, 0) `z = 0; |z| = 0; Arg z = undefined` |
| U3 | `addressModel` | (−1, √3): r = 2, theta = 2π/3 = `answer.values.Arg`; (−16, 0) and (−16, −0): `theta === Math.PI` exactly; (3e-10, 4e-10): `isZero` and `theta === null`; the returned `z` never has a `-0` part (`Object.is(v, -0)` false) |
| U4 | `addressCells` golden | the ten strings of 5.2.4 for 1.3.1 (compare with `replace(/\s+/g, '')`), the (2, 1), 1 + i and −16 strings listed there, and the origin object; `same.agree === true` for 1.3.1 and `undefined` for the origin |
| U5 | KaTeX sweep | for x, y in {−16, −4, −3, −2, −1.5, −1, −0.5, 0, 0.5, 1, 1.5, 2, 3, 4, √3, −√3, √2}² (289 points): every string of `addressCells`, `addressForms` renders with `throwOnError: true`, and no function throws; `same.agree` is `true` (or `undefined` at the origin) everywhere; at least 4000 strings are checked |
| U6 | `addressForms` | the four strings of 5.2.5 for 1.3.1; `null` at the origin |
| U7 | `parseRealField` | `'-16'` → ok −16; `'0'` → ok 0; `'sqrt(3)'` → 1.7320508; `'2pi/3'` → 2.0943951; `'pi'` → 3.1415927; `''` → message `Type a number, like -1 or 1.732 or sqrt(3).`; `'2i'` → `That has an i in it. This box takes a real number.`; `'z'` → `Use numbers only here, without z, x or y.`; `'101'` → `Keep it between -100 and 100 so the picture stays readable.`; `'-100'` → ok; `'1/0'` → `That is not a finite number.`; `'('` → ok false and the message equals the `ParseError.message` of `parse('(')`; `'abc'` → a message starting `I don't know the name "abc"` |
| U8 | `latticeStep` | 3 → 0.25; 4 → 0.25; 8 → 0.5; 12 → 0.5; 12.1 → 1; 48 → 1; 49 → 5 |
| U9 | `snapPoint` | (2.004, 0.997), 8, 358 → (2, 1); (1.991, 1.006), 8, 520 → (2, 1); (1.04, −0.03), 21.76, 358 → (1, 0); (1.25, 0.75), 8, 358 → unchanged; (−0.004, 0.004), 8, 358 → (0, 0) with `Object.is(re, -0)` false; (0.26, 0.49), 3, 358 → (0.25, 0.5); idempotent (snapping a snapped point changes nothing); a NaN point is returned unchanged |
| U10 | `thetaHint` | 2π/3 → `= 2π/3 = 120°`; π → `= π = 180°`; 0.4636476 → `= 26.6°`; −π/2 → `= -π/2 = -90°`; 0 → `= 0°`; π/6 → `= π/6 = 30°`; 8π/3 → `= 8π/3 = 480°` |
| U11 | `viewSpanFor` | 0 → 8; 3.2 → 8; 3.5 → 10; 4 → 10; 5 → 16; 16 → 40; 100 → 250; 1000 → 250 |
| U12 | `ghostCounts` | (130, true) → {2, 1}; (89.5, true) → {2, 0}; (50, true) → {1, 0}; (14, true) → {1, 0}; (13.9, true) → {0, 0}; (130, false) → {0, 0} |
| U13 | typed angles | `cleanZ(C.fromPolar(2, Math.PI), 2)` is (−2, 0) and `C.Arg` of it is exactly π; `C.fromPolar(2, 8π/3)` has Arg 2π/3 within 1e-9 and `angleText(Arg)` `2.094 (2pi/3)`; `C.fromPolar(2, 4π/3)` has Arg −2π/3 |
| U14 | staircase rows | `stepText(2π/3, k).text` for k = 2, 1, 0, −1, −2 is `2π/3 + 4π = 14π/3`, `2π/3 + 2π = 8π/3`, `2π/3`, `2π/3 - 2π = -4π/3`, `2π/3 - 4π = -10π/3` (A3's "2π/3 - 2π, 2π/3") |
| U15 | `angleText` | 2π/3 → `2.094 (2pi/3)`; with `unicode: true` → `2.094 (2π/3)`; π → `3.142 (pi)`; 0 → `0`; null → `undefined`; 0.4636476 → `0.464`; −π/2 → `-1.571 (-pi/2)` |
| U16 | TeX helpers | `texNum`: 2 → `2`; −1 → `-1`; 1.7320508 → `\sqrt{3}`; −1.7320508 → `-\sqrt{3}`; 2.8284271 → `2\sqrt{2}`; 1.4142136 → `\sqrt{2}`; 0.5 → `0.5`; −0.6470588 → `-0.647`; 0 → `0`; NaN → `\text{undefined}`. `texCartPair`: (−1, √3) → `-1 + \sqrt{3}\,i`; (0, 2) → `2i`; (0, −1) → `-i`; (3, 0) → `3`; (1.5, −0.5) → `1.5 - 0.5i`. `expTex`: 2π/3 → `e^{i\,\frac{2\pi}{3}}`; −0.322 → `e^{-i\,0.322}`. `polarTeX`: −1 + i√3 → `2\,e^{i\,\frac{2\pi}{3}}`; 3 → `3`; 0 → `0`; i → `e^{i\,\frac{\pi}{2}}` |
| U17 | module shape | `typeof mount === 'function'`; importing the module did not touch `document` (the test runs in Node, where `document` is undefined) |

**`arithmetic.js`**

| # | What | Expected |
|---|---|---|
| U20 | `applyMode` (z1 = 3 − 2i, z2 = −1 + 4i) | add (2, 2); sub (4, −6); mul (5, 14) = `problemById('1.1.1').answer.values.product`; div (−11/17, −10/17) = `quotient` (1e-12); conj (3, 2); inv (3/13, 2/13); `{conjResult: true}`: sub → (4, 6) with `Im === problemById('1.1.2').answer.values.im`; the `difference` value equals `value` of sub; conj and inv ignore `conjResult` (result stays (3, 2)); div by (0, 0) and inv of (0, 0) have NaN parts; an unknown mode gives NaN parts |
| U21 | `arithmeticReadout` | the eight readouts of 6.3 (mul, div, sub, sub+mirror, add, mul by 1, conj, inv) plus `result = undefined; |result| = undefined; Arg = undefined` for div by 0 and `result = 0; |result| = 0; Arg = undefined` for mul by 0 |
| U22 | `arithmeticModel` | mul 1.1.1: `a.r` √13, `a.theta` −0.5880026035, `b.theta` 1.8157749899, `route` {14.8660687473, 1.2277723864}, `agree` true, `wrap.wrapped` false, `niceAngles` false, `native` point `cart`, length `polar`, angle `polar`. (1, 1) × (0, 1): `niceAngles` true, `native.point` `polar`, `wrap.raw` 3π/4. (−1, 4) × (−1, 4): `wrap` {raw 3.6315499798, home −2.6516353273, wrapped true}. div by 0: `undefinedResult`, `agree` undefined. mul by 0: `zeroResult` true, `agree` true. add: every native `cart`; conj: every native `null`; inv: point, length, angle `polar` |
| U23 | `arithmeticCells` golden | every string of the 5.3.5 golden block, compared without whitespace; `{ undef: true }` for div by 0 |
| U24 | sweep | modes × `conjResult` × the 10 points (3, −2), (−1, 4), (0, 0), (1, 0), (−1, 0), (0, 1), (1.5, −0.5), (√3, 1), (−2, −2), (0.5, 0.5), squared (every ordered pair for z1, z2): nothing throws, every string renders in KaTeX with `throwOnError`, `same.agree` is `true` for every defined result (zero results included) |
| U25 | `arithmeticRows` | mul: ids `[inputs, point, length, angle]` with labels `z₁, z₂`, `z₁ × z₂`, `length`, `angle`; sub with the mirror: `[inputs, point, length, angle, mirror, im]`; conj: first label `z₁`; the mirror rows exist only for add, sub, mul, div |
| U26 | `whyText` / `wrapNote` | mul 1.1.1: tone `polar`, text contains `(-0.588 and 1.816)` and `not both nice numbers`; (1, 1) × (0, 1): contains `π/4 + π/2 = 3π/4` and `Both angles here are nice numbers`; sub with mirror: ends with `Im(conj w) = −Im w = 6.`; add: tone `cart`; conj: tone `accent`; (−1, 4)²: `wrapNote` is `The angles add to 3.632, which is past π. The same direction has the home name Arg = -2.652 (3.632 − 2π).`; the 1.1.1 mul case gives `''` |
| U27 | `proofsModel` | z1 = 3 − 2i, z2 = −1 + 4i: the strings of 5.3.7; `p1.same.agree` and `p2.same.agree` true; the numeric lhs and rhs both equal (5, −14) = `problemById('P1').answer.values.check.both`; `zzbar` 13 and `abs` √13 equal `problemById('P2').answer.values.check`; sweep over those 10 points plus (−16, 0), squared: all strings render, both flags true |
| U28 | `scenePlan` (scale 20) | add: primitive ids exactly `s-a, s-b, s-a-v, s-b-v, s-slide, l-result`; `s-a-v` from (3, −2) to (2, 2), `s-b-v` from (−1, 4) to (2, 2), `s-slide` from (0, 0) to (2, 2); every segment token `--cart`. mul: `arc-1` from 0 to −0.5880026 and `arc-2` from −0.5880026 to 1.2277724, both `--polar`, radii 28.844 and 42.844 px (1e-3); `s-ray-result` ends at (5, 14); `spun` at (1.2126781, 3.3954988); `s-stretch` from `spun` to (5, 14). div: `arc-2` ends at −2.4037776; `spun` (−2.6679, −2.4254) to 4 decimals. wrap ((−1, 4)²): `arc-2` ends at 3.6315500 and `(cos, sin)` of that angle equals the direction of −15 − 8i. sub with the mirror: a hollow `pre-mirror` dot at (4, −6) and `s-mirror-result` from (4, −6) to (4, 6), dash `cart`. conj: `s-mirror` from (3, −2) to (3, 2); arcs `arc-a` [0, −0.588] and `arc-mirror` [0, 0.588]. inv: `unit-circle` radius 1; `inverted` at (3/13, −2/13). undefined: `prims` empty and `fit` contains z2. An arc whose `|angle| · radius` is under 5 px is absent ((10, 0.001) has no `arc-1`) |
| U29 | phases and traveller | mul: kinds `[spin, stretch]`; `travelerAt` at u = 0, 0.25, 0.5, 0.75, 1 is (3, −2), (3.4226, 1.1338), (1.2127, 3.3955), (3.1063, 8.6977), (5, 14) to 1e-3. sub with the mirror: kinds `[slide, mirror]`; u = 0.5 → (4, −6), 0.75 → (4, 0), 1 → (4, 6) to 1e-9. inv: kinds `[invert, mirror]`; 0.5 → (3/13, −2/13), 1 → (3/13, 2/13). div: 0.5 → (−2.6679, −2.4254). Undefined: `phasesFor` is `[]` and `travelerAt([], 0.5)` is `null`. `u` below 0 gives the start and above 1 the end |
| U30 | `parseComplexField` | `'3 - 2i'` → (3, −2); `'sqrt(3)+i'` → (1.7320508, 1); `'2*exp(i*pi/3)'` → (1, 1.7320508); `'i'` → (0, 1); `'7'` → (7, 0); `''` → `Type a complex number, like 3 - 2i or sqrt(3) + i.`; `'z+1'` → `Use numbers only here, without z, x or y.`; `'200'` → `Keep both parts between -100 and 100 so the picture stays readable.`; `'1/0'` → `That is not a finite number.`; `'3 -'` → the parser's sentence |
| U31 | parity (D11) | on one table of at least 30 inputs, `snapPoint`, `latticeStep`, `texNum`, `texCartPair`, `expTex`, `polarTeX`, `trigArg` and `angleText` of the two modules return identical results |
| U32 | A4 numbers | `snapPoint({re: 1.04, im: -0.03}, 21.76, 358)` is (1, 0), and `applyMode('mul', {3, -2}, thatPoint)` has `fmtCart` equal to `3 - 2i` |

### 7.3 Interaction script, `tests/interact/i1-station-addresses-arithmetic.mjs`

```js
import { dragHandle, dragHandleAround, clickChip, readText, handleZ, readHandleLabel, settle } from './_helpers.mjs';
export default async function (page, ctx) {
  const { route, assert, log, shot } = ctx;
  if (route === 'problem-1-3-1' || route.startsWith('addresses')) return addresses(page, ctx);
  return arithmetic(page, ctx);
}
```

Helpers inside the script: `waitText(page, sel, test)` = `page.waitForFunction` polling the element's `textContent` (timeout 4000 ms, so the explainer's frame-coalesced render never races an assertion); `typeInto(page, id, text)` = in `page.evaluate`: focus the element, set `.value`, dispatch `input` then `change` (both bubbling); `attr(page, sel, name)`; `hook(page, name)` = `page.evaluate((n) => JSON.parse(JSON.stringify(window.__mv[n].state())), name)`. Cell text is read from the cell's `data-tex` or from `textContent` after `waitText`, never right after an update (ARCHITECTURE 10.3.9).

**Route `problem-1-3-1` (A2, A3), also run unchanged on `addresses`:**

1. `#addresses-readout` text includes `|z| = 2`, `2.094` and `2pi/3`. `#addresses-r` value is `2`, `#addresses-theta` is `2.094`, `#addresses-x` is `-1`, `#addresses-y` is `1.732`.
2. `#addresses-ex-theta-polar` text (via `waitText`) includes `2π` (U+03C0) and `#addresses-ex-theta-cart` includes `2π`. `#addresses-ex-r-polar` data-tex is `r = 2`. `#addresses-ex-same` text starts `same point: agree`.
3. `#addresses-stairs-k0` text includes `2π/3`; `#addresses-stairs-k-1` text includes `2π/3 - 2π`; `#addresses-stairs-arg` text is `Arg z = 2.094 (2π/3)`.
4. `readHandleLabel('addresses-plane-z')` includes `r = 2` and `2π/3`. `hook('addresses')` gives `z.re` near −1 and `z.im` near 1.732.
5. `window.__mv.addresses.drawn()` has `pos >= 1` (a faint extra winding is drawn).
6. `shot('a3')` (A3 review image).
7. `dragHandle(page, 'addresses-plane-z', { re: 2, im: 1 })`; then `#addresses-readout` includes `2.236` and `0.464` (exactly `z = 2 + i; |z| = 2.236; Arg z = 0.464`), `parseFloat(#addresses-x.value)` is within 0.05 of 2, `parseFloat(#addresses-r.value)` within 0.01 of 2.236, `#addresses-ex-same` still starts `same point: agree`, `#addresses-ex-theta-polar` data-tex includes `0.464`.
8. Performance: after a 60-step `dragHandle(..., { steps: 60 })` to (−1, 1.5), `window.__mv.planes.get('addresses-plane').getStats().lastDrawMs` is under 50 (logged; the target is under 8 on desktop).
9. Seam crossing: `dragHandleAround(page, 'addresses-plane-z', { center: { re: 0, im: 0 }, radius: 1.5, startAngle: 2.4, turns: 0.4, steps: 60 })` (one continuous press, one frame between positions, so the browser cannot coalesce the moves): the dot goes counterclockwise from 137 degrees through the negative real axis to 209 degrees. Then the staircase wrapper `[data-stairs="addresses-stairs"]` has `data-jumps` of at least 1 and `data-last-jump` `1`. (A plain `dragHandle` is not used here: its 12 moves are sent back to back and may be merged into one, which would hide the crossing.)
10. `typeInto('addresses-x', '-16')`, `typeInto('addresses-y', '0')`: `#addresses-readout` includes `Arg z = 3.142` and `pi`; `#addresses-r` value `16`; `#addresses-theta` value `3.142`; `[data-plane-id="addresses-plane"]` `data-units-across` is at least 40.
11. `typeInto('addresses-theta', '8pi/3')` after clicking `#addresses-preset-m1-sqrt3i`: `#addresses-note` includes `8.378` and `2π/3 + 2π` and `Arg z = 2.094 (2π/3)`; the readout is back to the 1.3.1 readout; `#addresses-theta` value `2.094`.
12. `typeInto('addresses-r', '-2')`: `#addresses-note` includes `A length cannot be negative`; `#addresses-r` has `aria-invalid="true"`; the readout is unchanged.
13. Chips: click `#addresses-preset-m16` then check the readout, click `#addresses-grid-polar` and expect `aria-pressed="true"` on it and `false` on `#addresses-grid-cart`; click `#addresses-ghosts` off and `drawn()` has `pos === 0` after a frame.
14. Reduced motion is not relevant here (no animation); skip.

Steps 7 to 14 use handles and chips only, so they pass at phone width; the phone plane is 358 px, the target (2, 1) is on screen, and `dragHandle` checks that the handle is not covered.

**Route `problem-1-1-1` (A4):**

1. `#arithmetic-readout` includes `5 + 14i` and `14.866`; `#arithmetic-ex-same` starts `same point: agree`; `#arithmetic-mode-mul` has `aria-pressed="true"`; `#arithmetic-mode-div` contains the badge text `part 2`.
2. `clickChip('arithmetic-mode-div')`: readout includes `-0.647` and `-0.588`; `#arithmetic-ex-point-cart` data-tex includes `-\frac{11}{17} - \frac{10}{17}i`; the same-point row says `agree`.
3. `clickChip('arithmetic-mode-sub')`: readout includes `4 - 6i`.
4. **The documented way of conjugating the difference** (this is the clause of A4 that reads "clickChip arithmetic-mode-conj after the design's documented way of conjugating the difference"): `clickChip('arithmetic-conj-result')`. Readout includes `4 + 6i`; `#arithmetic-conj-result` has `aria-pressed="true"`; `#arithmetic-ex-im-cart` data-tex includes `= 6`; `#arithmetic-ex-im-polar` data-tex includes `\approx 6`.
5. `clickChip('arithmetic-mode-conj')`: readout includes `3 + 2i`; `#arithmetic-conj-result` has `aria-pressed="false"` and `aria-disabled="true"` (the mode change cleared the toggle, and conj is unary on z1).
6. `clickChip('arithmetic-mode-mul')`: readout includes `5 + 14i` (so the toggle really is off).
7. `dragHandle(page, 'arithmetic-plane-z2', { re: 1, im: 0 })`: readout includes `3 - 2i`; `#arithmetic-ex-same` starts `same point: agree`; `handleZ('arithmetic-plane-z2')` is exactly (1, 0).

*Reading of the acceptance text.* A4 says "then clickChip 'arithmetic-mode-conj' after the design's documented way of conjugating the difference (e.g. a 'conj of result' toggle #arithmetic-conj-result): readout has '4 + 6i'". This design's documented way is step 4 (the toggle), and that is what produces `4 + 6i`. The chip `#arithmetic-mode-conj` is the unary mirror of z1 as ARCHITECTURE 9 specifies ("conj and inv apply to z1"), so on its own it gives `3 + 2i` (step 5); it cannot give `4 + 6i` unless it were redefined as "mirror the previous answer", which would contradict ARCHITECTURE 9 and P1's preset. A reviewer who executes step 4 satisfies the clause.

**Route `arithmetic` (A5, A6):**

1. Default state is 1.1.1: readout `result = 5 + 14i; ...`; `data-mode` is `mul`.
2. `clickChip('arithmetic-mode-add')`; `ctx.shot('add')`. Assert `#arithmetic-ex-point-cart` data-tex includes `x_1+x_2`; the `point` row shows the badge `easy in Cartesian` (the `.ex-native` text inside `tr[data-row="point"]`); `window.__mv.arithmetic.plan().prims` has exactly five segments (`s-a`, `s-b`, `s-a-v`, `s-b-v`, `s-slide`) and the `s-slide` ends at (2, 2).
3. `clickChip('arithmetic-mode-mul')`; `ctx.shot('mul')`. Assert `plan().prims` has exactly two arcs, `arc-1.to` is −0.588 and `arc-2.to` is 1.2278 (both within 1e-3), and `s-ray-result` ends at (5, 14); the `length` and `angle` rows show `easy in Polar`, and the `point` row shows `easy in Cartesian` (angles not nice, D5); the polar heading text `Polar (spin-and-stretch)` is on the page (`th[data-col="polar"]`).
4. A6: `#arithmetic-p1-same` starts `same point: agree`; `#arithmetic-p2-same` starts `same point: agree`; `#arithmetic-p1-lhs-cart` data-tex includes `(3 + 2i)(-1 - 4i) = 5 - 14i`; `#arithmetic-p2-zzbar-cart` data-tex includes `= 13`; `a#arithmetic-p1-chip` has `href` ending `#problem-P1` and `a#arithmetic-p2-chip` `#problem-P2`.
5. `dragHandle('arithmetic-plane-z1', { re: 1, im: 1 })`: `#arithmetic-p2-zzbar-cart` data-tex includes `1^2+1^2 = 2`; `#arithmetic-p2-same` still agrees.
6. Play (animated path; the harness does not set reduced motion): `clickChip('arithmetic-animate')`; the button text is `Stop`; `waitText` (timeout 6000 ms) until `#arithmetic-caption` is `Stretch by the length of z₂.`, then until the button text is `Play: spin, then stretch` again; `window.__mv.arithmetic.state().anim.kind` is `done` and `anim.point` is within 1e-6 of (5, 14); the readout is unchanged (`result = 5 + 14i; ...`); the caption still shows the last phase.
7. Stepper (reduced motion): `await page.emulateMedia({ reducedMotion: 'reduce' })`, `clickChip('arithmetic-animate')`: caption `Spin z₁ by the angle of z₂.`, button `Next step (2 of 2)`, `anim.kind === 'stepped'` and `anim.step === 1`; click again: caption `Stretch by the length of z₂.`, button `Start over`, `anim.step === 2`, `anim.point` within 1e-6 of (5, 14); click again: caption `Press Play to watch the move.`, `anim.kind === 'idle'`, button `Next step (1 of 2)`. Then `page.emulateMedia({ reducedMotion: 'no-preference' })`. (`prefersReducedMotion()` reads `matchMedia` at call time, so the emulation takes effect without a reload.)
8. P2 lock: `page.evaluate(() => location.hash = '#problem-P2')`, wait for `#arithmetic-lock-conj` checked; `dragHandle('arithmetic-plane-z1', { re: 2, im: 1 })`; `handleZ('arithmetic-plane-z2')` is (2, −1); readout `result = 5; |result| = 5; Arg = 0`.

**Routes `problem-1-1-2`, `problem-P1`, `arithmetic-div`, `addresses-m16`:** on load, respectively: readout `result = 4 + 6i; |result| = 7.211; Arg = 0.983` and `#arithmetic-conj-result` pressed; `data-mode` `conj`, readout `result = 3 + 2i; ...`, `#arithmetic-p1-same` agree; readout `result = -0.647 - 0.588i; ...`; readout `z = -16; |z| = 16; Arg z = 3.142 (pi)` and `data-units-across` of `addresses-plane` at least 40.

All routes: no unexpected console error (the harness fails on any), `scrollWidth - clientWidth <= 1` at 390 px.

### 7.4 Screenshot review checklists (A3, A5)

**A3 (`problem-1-3-1--desktop--a3.png`, and the phone and dark ones).** Look for, in the plane: the point at (−1, 1.732) drawn once as a neutral dot labelled z; two dashed blue (`--cart`) lines to the axes with "x = -1" and "y = 1.732"; an orange (`--polar`) ray labelled "r = 2"; a solid orange arc from the positive real axis to the ray labelled "Arg z = 2π/3"; at least one fainter orange arc outside it labelled "also 8π/3" (desktop: two or three, phone: two); a dashed grey seam on the negative real axis labelled "seam". Beside the plane: the staircase list with the bold shaded home row "Arg z = 2π/3" between "2π/3 + 2π = 8π/3" above and "2π/3 - 2π = -4π/3" below; the readout line; the problem strip with the badge "Cartesian, then polar". In dark: the same marks in the dark token colours, labels readable on the surface, no pure-white blocks. At phone width: no horizontal scroll bar, the plane is square and full width, the explainer is stacked.

**A5 (`arithmetic--desktop--add.png`, `arithmetic--desktop--mul.png`).** `add`: a blue parallelogram with vertices 0, z1 = (3, −2), z1 + z2 = (2, 2) and z2 = (−1, 4) (two solid sides from 0, two dashed sides), the heavy blue diagonal with an arrowhead ending at the result dot (purple) at (2, 2), the Cartesian grid, and in the explainer the "easy in Cartesian" badges with the blue column tinted. `mul`: two orange stacked arcs from the positive real axis (the first from 0 to z1's ray, clockwise as θ1 is negative; the second from there to the result's ray), the heavy orange ray to the result at (5, 14), a hollow orange ring on that ray where z1 has been spun, a dashed orange segment from the ring to the result (the stretch), the polar grid, and the explainer headed "Cartesian (slide)" and "Polar (spin-and-stretch)" with "easy in Polar" on the length and angle rows. In both: z1 and z2 are green dots labelled z₁ and z₂, the result is purple.

### 7.5 Code inspection (A6 and the rules the reviewers check)

1. `arithmetic.js` calls `createExplainer` three times with ids `arithmetic-ex`, `arithmetic-p1`, `arithmetic-p2`; the last two have a `same` function returning `{ cart, polar, agree }`; their rows are `lhs`, `rhs` and `zzbar`, `sqrt`; their inputs are `proofsModel(S.z1, S.z2)` called from `render`, so they change when z1 or z2 move.
2. The proofs panel has `id="arithmetic-proofs"`, and two `a.chip.problem-chip` with `href="#problem-P1"` and `href="#problem-P2"`.
3. Neither file has top-level DOM access, `innerHTML` of anything but `prose()`/`tex()` output, `alert`, `confirm`, `prompt`, `window.open`, `scrollTo`, `scrollIntoView`, a `window` or `document` listener, a literal colour (`#rgb`, `rgb(`, `hsl(`), a `<link>` or `@import`, a store key, or a `setTimeout`-based animation.
4. `unmount` destroys the plane, every explainer, the staircase, removes the trail layer, cancels the animation frame and deletes only its own `window.__mv` property; `mount` rethrows after cleanup.
5. Every id of 2.2 exists; every `href` is a route (`#problem-...`, `#staircase`, `#<station-id>`).
6. `addPoint` is called without `snap`; the result handle is created before z1 and z2.
7. The only readout formats are those of ARCHITECTURE 9.

### 7.6 What passing looks like

`npm test` ends with all tests passing (the earlier 287 plus the new ones). The four smoke commands end `N/N checks passed` with exit 0, and the screenshots match 7.4. If a number in a readout differs in the third decimal after a drag, the snap is broken (D1); if `#arithmetic-ex-same` says `differ`, a polar rule or its test is wrong (D15); if A4's last step reads `3 + 2i`, the mirror toggle was not cleared by the mode change (D2).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

| Case | Behaviour |
|---|---|
| `addresses`: z = 0 (typed, or r typed 0) | The origin state of 2.4. The θ field keeps `lastTheta` so raising r again goes the way it was going. |
| `addresses`: \|z\| below 1e-9 | Treated as the origin (`ZERO_EPS`); `addressModel` returns exactly (0, 0). |
| z on the positive real axis | Arg 0: no angle arc is drawn (the helper draws none under 3 px), the ray and the ghosts remain, readout `Arg z = 0`, `x.polar` reads `r\cos\theta = 3\cos\,0 = 3`. |
| z on the negative real axis | Arg π, never −π (`complex.js` guarantees it; typed `-pi` is cleaned by `cleanZ`). The seam, the ray and the labels share a line; the plane's label placer steps them apart. |
| z on the imaginary axis | The "x = 0" label is omitted by the helper (it skips labels under 0.0005); `x.cart` still reads `x = 0`. |
| typed r < 0 | Rejected with the sentence of 2.5; field `aria-invalid`; z unchanged. |
| typed θ outside (−π, π] | Accepted; the dot moves to the right place; the field shows the home value; the note names the relation (D12). |
| typed text that is not a number, has an `i`, uses z, or is out of range | The messages of 2.5 (parser sentences verbatim); the state does not change. A unicode minus (−) and `×`, `·`, `π`, `²` are accepted by the parser. |
| typed `1,5` (decimal comma) | The parser's own sentence; nothing is guessed. |
| scientific notation (`1e3`) | Not supported by the grammar (`e` is Euler's number); the parser's sentence is shown. |
| typed 100 then 250 in x | 250 is rejected at commit (silent while typing); the view stays at the last valid zoom. |
| `addresses`: a keyboard nudge takes the dot off the picture | `ensureVisible` zooms out once on the key press. |
| `addresses`: the student zooms or pans by hand, then picks a preset | The preset resets the view and the Reset button's home (`ensureVisible(z, { reset: true })`). |
| `arithmetic`: z2 = 0 in ÷, z1 = 0 in 1/z | Undefined result: handle hidden, rows say `\text{undefined}`, footer "not checked", Play disabled, the note sentence. `phasesFor` is `[]`. |
| `arithmetic`: a zero factor in × (or z1 = 0 in ÷ or conj) | The result is 0: angle rows say "no angle at 0", `agree` stays true, the why-line says so. |
| `arithmetic`: z1 and z2 on the same spot | z2's handle is on top; the keyboard (Tab) reaches z1; dragging z2 away reveals z1. |
| `arithmetic`: result on top of an operand (z2 = 1) | The result handle was added first, so the operand is still the one you grab. |
| `arithmetic`: result far away (a product of two points near the edge, or ÷ by something small) | While dragging: the off-picture note, readout and explainer still right. On release: `settleView()` refits. A result beyond the plane's largest view (400 units) stays off the picture; the numbers are still right. |
| `arithmetic`: lock on and a typed z2 | z1 becomes conj z2; both fields and both handles update. |
| `arithmetic`: mode change while playing | The animation stops and clears (`clearAnim`), the mirror toggle clears, rows swap, the view refits. |
| `arithmetic`: reduced motion switched on or off while the page is open | Read at click time and at render time; the button label follows on the next render. |
| `arithmetic`: angles that add past π (z2 × z2) | The wrap note appears; the arcs still end on the result's ray; Arg is the home name. |
| `arithmetic`: both angles exactly π (−1 × −1) | raw 2π, home 0; note "The angles add to 6.283, which is past π. The same direction has the home name Arg = 0 (6.283 − 2π)." |
| both: theme toggled while open | The plane redraws on `themechange` (its hub); both explainers re-render on their own; the station has no listener to leak. |
| both: window resized or the phone rotated | The plane's ResizeObserver redraws; layers read `getView()` each frame so pixel-sized marks keep their size; the explainer restacks at 560 px. |
| both: KaTeX failed to load | Cells and forms show the raw TeX in the monospace `.tex-error` style; numbers in readouts and fields are unaffected. |
| both: `localStorage` throws | Not used. |
| both: `mount` called twice without `unmount` | Not possible through the router; if a test does it, the second plane id collision is the plane's concern (`createPlane` replaces its registry entry safely). |

### 8.2 Performance plan

- Per pointer move: model, `textContent` writes, `staircase.update`, explainer updates (coalesced), one plane redraw (coalesced). Measured budget: `getStats().lastDrawMs` under 8 ms on desktop; the script logs it after a 60-step drag and fails above 50 ms.
- The forms KaTeX and the Euler line are one pass per animation frame and skip unchanged strings. During a drag the explainers render without MathML (fast mode) and refine 220 ms after the last move.
- `scenePlan` is a few dozen object allocations per frame; it runs inside the layer because the pixel radii depend on the current scale.
- The stations own no timers: notes stay until the next valid action (the staircase widget has its own two short timers for its seam note). The only animation-frame work is the one-frame flush of the forms panel and, in `arithmetic`, the Play loop. No `localStorage`.
- The three explainers of `arithmetic` hold 4 to 6, 2 and 2 rows (ARCHITECTURE 10.3.4: about 6 per explainer).
- First paint: `mount` is synchronous; the plane draws on the next frame; the explainers render synchronously on their first `update`.

### 8.3 Accessibility

- Every control has a visible label or an `aria-label`; chips are `button`s with `aria-pressed`; the two groups have `role="group"` and an `aria-label`. Checkboxes are real checkboxes inside `label.check`.
- The handle buttons announce both addresses of the point in their `aria-label` (plane) and the plane announces moves in its polite status region; the readout is plain text for anything that reads the page.
- Errors and explanations go to `aria-live="polite"` notes, and a rejected field has `aria-invalid="true"` (and `aria-describedby` pointing at the note).
- Colour is never the only cue: Cartesian marks are dashed, polar marks solid, Arg solid and arg faint with "also ..." text, the seam dashed grey with a word, the native badges are words ("easy in Polar"), the "agree" footer is a word with a shape.
- Focus is visible everywhere (shell rule); the plane's handle focus ring is the plane's; `Tab` order follows the page order (presets, grid, checkboxes, plane, dot, fields).
- The problem strip's `details` is keyboard operable; the proofs panel and every explainer are plain tables.
- Touch targets: chips and buttons 44 px (the shell's `--tap`), handles 44 px on coarse pointers.
- The page never moves focus or scrolls on mount (rule 10.1.2). Play does not steal focus; its captions are `aria-live="polite"`.

### 8.4 Reduced motion

`addresses` has no autonomous animation. `arithmetic`'s Play checks `ctx.theme.prefersReducedMotion()` at click time and becomes a stepper (5.3.9): no `requestAnimationFrame`, no easing, the trail drawn in one go to the end of each phase, the caption naming the step. The staircase widget's seam pulse is disabled by its own media query, and the shell's global `prefers-reduced-motion` rule shortens CSS transitions.

### 8.5 Phone layout (390 x 844, content 358 px)

- One column, the order of 2.1. Planes are square and 100% of the cell (358 px), handles have 44 px hit areas, the zoom buttons sit in the plane's top-right corner and no draggable point starts there.
- The preset and mode chips wrap (`.chips` is a wrapping flex row). Fields: x and y (and r and θ) in a two-column grid with `min-width: 0` and `width: 100%`; the arithmetic fields are full width.
- The explainers stack Cartesian above Polar at 560 px and below (`data-narrow`), each cell headed by its column name; `native` badges stay under the row label.
- The forms panel's `dl` is one column below 36rem; each `dd` scrolls sideways inside its own box if a formula is wider than 330 px (the polar-form line is about 300 px at 1.3.1).
- `.readout` wraps (`overflow-wrap: anywhere`, `white-space: pre-wrap`); the problem answer scrolls inside `.tex-scroll`.
- Nothing has a fixed pixel width; `document.documentElement.scrollWidth - clientWidth <= 1` is asserted by the smoke harness at 390 px for all four routes of A1.

---

## 9. Out of scope

- Distance, |z − a| = R, circles and the triangle inequality (the `distance` station, goal i1-station-distance-sets).
- Powers, de Moivre and 1.3.2 (`powers`), roots and the quadratic formula (`roots`), principal roots and branches.
- The full staircase picture (the walk once around the origin, movable seam, the 3D helix, Thm 1.4.14 as two adding staircases): `addresses` shows the list and links to `#staircase`.
- Any mapping of shapes: no function f, no w-plane, no morph, no "Open in the Lab" button (these stations have no image problem).
- Field axioms (commutative, associative, distributive, identities, inverses) as a demonstration; they appear only as the arithmetic itself.
- The home map demo and the problem index cards (their own goal); video and audio narration (the media track).
- Drawing tools, persistence of the point or the operands (no store keys), shareable state in the URL.
- Editing `css/components.css`, `index.html`, `js/registry.js`, `js/core/*` or `js/data/*` (read-only for this goal; section 10 lists what would help).

---

## 10. Requests for other owners, risks, build order

**Requests (nothing blocks this goal).**

1. *Orchestrator / ARCHITECTURE section 9.* Append the extra ids and hooks of this design to the `i1-station-addresses-arithmetic` paragraph so the next goals and reviewers find them: `addresses-ghosts`, `-snap`, `-theta-hint`, `-note`, `-forms`, `-form-*`, `-euler-live`, `-problem*`, `-answer*`; `arithmetic-z1-input`, `-z2-input`, `-lock-conj`, `-conj-result`, `-snap`, `-fit`, `-caption`, `-note`, `-wrap-note`, `-why`, `-p1-*`, `-p2-*`, `-problem*`; `window.__mv.addresses` and `window.__mv.arithmetic`; the plane id `arithmetic-plane-result`.
2. *Iteration 2, a shared `js/core/station-kit.js`* (owner: a core goal): the station header and links (5.2.12), the problem strip, the typed-field protocol (5.1.9), `snapPoint`/`latticeStep`, `parseRealField`/`parseComplexField`, `texNum`/`texCartPair`/`expTex`/`polarTeX`. Twenty stations will want them; D11 duplicates them once.
3. *`plane.js` (optional).* A `Handle.setLabel(text)` so the result dot could carry a changing DOM label instead of a drawn one (D3).
4. *`js/data/problems.js` (residue 39, not blocking).* The prose of `routes.cart` and `routes.polar` for 1.3.1, 1.1.1, 1.1.2, P1 and P2 is shown verbatim in the strip and the proofs panel; it already says "Arg" and "arg" correctly for these five.

**Risks.**

| Risk | Mitigation |
|---|---|
| A4's "clickChip arithmetic-mode-conj" reading | The design's documented way is the toggle (D2); 7.3 states the mapping, and both behaviours are exercised. |
| The drag-to-exact-value tests depend on the plane's drag arithmetic (grab offset, pixel rounding) | The soft snap tolerance is 5 px (D1); if a first browser run shows a miss, raise `tolPx` to 6 in `snapPoint`'s default and re-run U9 and U32, nothing else changes. |
| Frame latency between a state change and the explainer's cells (the widget coalesces to the next frame) | Scripts use `waitText`/`waitForFunction`, never a fixed number of frames (7.3). |
| Merged pointer moves hide the seam crossing in a plain `dragHandle` | The crossing check uses `dragHandleAround` (one frame between moves). |
| Crowded labels on the plane (x, y, r, Arg, three "also" lines, seam) at phone width | The plane's label placer avoids overlaps; `ghostCounts` shows only two windings below 100 px of ray; A3's phone screenshot is reviewed. |
| Equal z-index handles: the result handle must stay under z1 and z2 | It is created first; 7.3 step 7 of A4 ends with the result on top of z1's position and the next drag of z1 is exercised in the `arithmetic` route (step 5). |
| Long cells at 358 px | KaTeX breaks at relations and binary operators; the widest unbreakable pieces (a `\left( ... \right)` group, a fraction) are estimated under 260 px, to be confirmed on the phone screenshot; `.explainer-wrap` clips and never widens the page; the A1 overflow check confirms. |
| The explainer logs a console error if a row function throws, and the smoke run then fails | The cell builders are total (U5, U24, U27 sweeps) and the row functions only select strings from them. |

**Build order for the builder.** (1) The pure helpers and models of both files, with the unit tests U1 to U32 (they do not need a browser). (2) `addresses` DOM, plane, layer, explainer, staircase, fields; run A1 for `addresses` and steps 1 to 13 of the script. (3) `arithmetic` DOM, plane, layer, rows and cells, proofs; run A1 and steps 1 to 7 of A4. (4) Play and the stepper; script steps 6 to 8 of the `arithmetic` route. (5) The screenshots of A3 and A5 in light and dark, read with the image tool, fix label collisions. (6) `npm test`, then the full A1 command with `--dark`.

---

## 11. Build notes (written by the builder; where the code differs from the text above)

The two stations are built as specified. These are the places where the code is not word for word the design, and why.

1. **Explainer caption in `arithmetic`.** The table caption is `Same quantity, two addresses`, not `The same answer, worked in both addresses`. The `h2` above the table already carries that sentence, and the screenshot showed it twice in a row. Nothing asserts the caption; the cell ids and the `agree` footer are unchanged.
2. **θ hint under its box (`addresses`).** `#addresses-theta-hint` sits under the θ field instead of beside it. Beside it, the field shrank to two characters at 390 px and clipped the value.
3. **Off-picture note follows the view.** `updateNote()` runs on every plane `viewchange` as well as in `render()`. `render()` runs before `refit()` moves the view on mount, a mode change and a preset, so the first screenshot said "The result is off the picture" about a result that was on it.
4. **"Done" message.** The line `Done. The result is 5 + 14i.` goes to a visually hidden polite live region `#arithmetic-announce`, not to `#arithmetic-caption`, because 7.3 step 6 requires the caption to keep the last phase after the move ends.
5. **Readout minus sign and A4.** The pinned readout format is `result = -0.647 - 0.588i` (a spaced minus before the imaginary part), so the literal substring `-0.588` never occurs; the A4 script asserts the whole pinned string `result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404` instead. A reviewer who searches the readout for the bare `-0.588` should read the number with `nums()` or `parseCart()` from `tests/interact/_helpers.mjs`.
6. **Source style.** Both station files use raw Unicode in visible copy (subscripts, π, the true minus) rather than `\u` escapes; the formatter that ran over the files on disk normalised them. Behaviour is identical.
7. **Script setup for the Play check.** Step 6 of the `arithmetic` route clicks `#arithmetic-preset-1-1-1` first, because step 5 has moved z1 to 1 + i and the product would no longer end at (5, 14).

Verification at the time of writing: `node --test tests/unit/i1-station-addresses-arithmetic.test.mjs` 32 of 32; `npm test` all pass; the A1 smoke command 12 of 12; the interaction script passes on `problem-1-3-1`, `addresses`, `addresses-m16`, `problem-1-1-1`, `arithmetic`, `problem-1-1-2`, `problem-P1`, `problem-P2` and `arithmetic-div` at 1280, 390 and the dark desktop. Screenshots are in `docs/review/iter-1/i1-station-addresses-arithmetic/`.
