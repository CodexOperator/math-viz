# Design: i1-core-plane — the complex-plane canvas and the interaction helpers

Goal `i1-core-plane` (wave 0, engine, size L). Owns `js/core/plane.js` and `tests/interact/_helpers.mjs`;
automatically also owns `tests/unit/i1-core-plane.test.mjs` and `tests/interact/i1-core-plane.mjs`
(the builder writes both). Binding inputs: the goal entry in `docs/goals/iter-1.json`,
`docs/ARCHITECTURE.md` sections 3.5, 6, 8, 9, and `docs/CONSTRAINTS.md`.

> **Residue cleanup (iteration 1).** After this design was built, plane.js gained label placement for stations (`createLabelPlacer`, `sideCands`, `registerObstacle`, `segmentHitsBox`, `LABEL_COST`), the options `obstacle`, `alpha` (segment, ray, arc), `names` (`drawCartAddress`) and `rampWeight`, the handle options `labelSide`, `symbol`, `describe` and `zOrder`, the method `setLabel`, `altKey` in the `onDrag` info, edge-aware axis numbers (`axisLayout`) and stacking by `zOrder`; the default time-ramp weight went from 0.65 to 0.4. The builder-edited sections of this design (wave 0 sync entries 56, 60 and 64) are accepted as they stand: where they differ from the code, ARCHITECTURE 3.5 wins, so there is nothing to revert. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

Every number in this file was recomputed by a throw-away Node prototype of the pure functions
(kept outside the repo); the expected values in section 7 are those outputs, not estimates.

---

## 0. What exists today, and decisions on ambiguities

**Existing code.** `js/registry.js` (pure data), `tools/smoke.mjs`, `tests/unit/smoke-harness.test.mjs`.
There is no `js/core/*`, no `css/`, no `index.html` yet (other wave-0 goals are being built at the same
time). So there is nothing to reconcile with `plane.js`: it is built exactly to ARCHITECTURE 3.5 and 8.
Everything marked *additive* below is an extra that no consumer is required to use.

**Decisions (the places ARCHITECTURE is silent or ambiguous):**

| # | Decision |
|---|---|
| D1 | `unitsAcross` is the number of units across the canvas **width**; `scale = w / unitsAcross` (this is what acceptance A1 pins: 800 px wide, `unitsAcross` 8, scale 100). The initial view is chosen so that **both** `xRange` and `yRange` fit. |
| D2 | The canvas is **transparent**. The surface colour is painted by CSS on the `.plane` element (`background: var(--surface)` or the `options.background` token). A theme switch therefore recolours the surface instantly and the canvas only repaints strokes. |
| D3 | `window.__mv` is created defensively: other modules may have created `window.__mv = {}` before the first plane exists, so the code does `window.__mv = window.__mv \|\| {}; window.__mv.planes = window.__mv.planes \|\| new Map()` (the literal one-liner in ARCHITECTURE 3.5 would leave `planes` undefined in that case). |
| D4 | `--ghost-alpha` is in ARCHITECTURE section 6 but **not** in the shell's acceptance list (A5 of `i1-shell`); the shell on disk does define it (0.35 in all three theme blocks). Treat it as optional anyway: read it with `tokenNumber('--ghost-alpha', 0.3)` (the 0.3 default applies in Node and if the token is missing) and cap it at 0.35. On screen ghost windings therefore have alpha 0.35, 0.28, 0.21, 0.14, 0.14, ... |
| D5 | `fromPixel` accepts `(x, y)` or `({x, y})`, on the Plane and on `makeTransform`'s result. |
| D6 | Mouse wheel zoom. A plane that hijacks the wheel traps page scrolling. Default `wheel: 'focus'`: the wheel zooms when the plane (or one of its handles) has keyboard focus, or when Ctrl/Cmd is held (that is also how a trackpad pinch arrives). Clicking empty plane space focuses it. `wheel: 'always'` is available for the Lab; `'ctrl'` and `'off'` also exist. *Additive option.* |
| D7 | Curves are layers with default `order = 100`, so ordinary layers (order 0) draw first, then curves, then the DOM handles — which is the ARCHITECTURE draw order. |
| D8 | Handle id is `${plane.id}-${spec.id}`. The helper infers the plane from the DOM (`closest('.plane').dataset.planeId`) first and from "handle id minus its last `-segment`" second, so a spec id containing a hyphen cannot break `dragHandle`. |
| D9 | `plane.js` is **import-safe in Node**: no `window`/`document` at module top level. Without a DOM, `cssColor(x)` returns `x` unchanged and `rampColor(base, t)` returns `base` unchanged. This is what makes the drawing helpers unit-testable with a recording fake `ctx` (section 7). |
| D10 | In the address overlays every **line, Arg arc and ghost arc** is a `moveTo`/`lineTo` polyline (never `ctx.arc`), so the recorded geometry can be asserted; only the small foot dots use `ctx.arc`. `drawCircle` and `drawDot` use `ctx.arc`. |
| D11 | The plane root gets the id `${id}-viewport`; its canvas `${id}-canvas`. Neither is the same string as a handle id unless a station names a point `viewport`/`canvas`. |
| D12 | Non-draggable handles are still real `<button>`s (they announce both addresses); they only lose the grab cursor and the arrow-key nudging. |
| D13 | The interaction script is run on the route `i1-core-plane` (unknown to the registry; the router shows its "No such place" panel, which is fine) and builds its own fixture in `document.body`. Do not use `home` before that station exists: the router would show the under-construction panel and the smoke harness would flag it. |
| D14 | Extra pure helpers are reachable as `internals.*` (one frozen object) so the public surface stays small. Top-level exports are the ARCHITECTURE ones plus `makeTransform`, `mixColor`, `niceGridStep`, `DASH`. |

**Re-checked against the shell now on disk** (`css/theme.css`, `css/components.css`, `js/core/theme.js`, `js/app.js`, written by the concurrent `i1-shell` goal):

- Every token the plane reads exists in all three theme blocks: `--surface --surface-2 --text --text-muted --border --focus --cart --polar --input --output --seam --t0 --t1 --ghost-alpha --font --radius`
  (plus extras `--tap`, `--border-strong`). Values are hex; `--font` is a system stack; `--ghost-alpha` is `0.35`; `--radius` is `10px`.
- `theme.js` dispatches `themechange` on `document` with `detail: { theme, mode }`, including for OS changes while no explicit choice is stored: the plane's hub listens to exactly that event (and,
  as belt and braces, to attribute and media changes).
- `app.js` already creates `window.__mv = window.__mv || { planes: new Map() }` and adds `planes` if missing, so D3 is consistent with it.
- The router renders `#i1-core-plane` (unknown) as the `.no-such-place` panel, which has no `data-station-error`, so D13 holds.
- Global rules the plane relies on: `[hidden] { display: none !important }`, `:focus-visible { outline: 3px solid var(--focus) }`, `*, ::before, ::after { box-sizing: border-box }`,
  `canvas { max-width: 100% }`, and `.two-planes > * { min-width: 0 }` (the plane also sets `min-width: 0`).
- No class in `components.css` starts with `.plane` (only `.two-planes`), so the injected `.plane*` rules cannot collide; `.sr-only` exists there but the plane keeps its own `.plane-sr` so it stays self-contained.
- No difference from ARCHITECTURE was found in the shell's exported names (`cssVar`, `getTheme`, `setTheme`, `onThemeChange`, `prefersReducedMotion`); the plane does not import them (wave-0 isolation).

---

## 1. Goal restatement, story thread, coverage

### 1.1 Restatement

`js/core/plane.js` is the one canvas on which the whole site is drawn: a complex plane you can touch.
`createPlane(container, options)` returns a self-contained widget with square-unit axes, a Cartesian grid
(lines), a polar grid (circles and rays), keyboard-reachable draggable points, drawing layers,
time-coloured curves, pointer events for stations that build drawing tools, pan and zoom, and a set of
standalone drawing helpers. The most important helpers are the two **address overlays**:

- `drawCartAddress`: dashed drop lines from z to both axes, labelled `x = …`, `y = …` (colour `--cart`);
- `drawPolarAddress`: the ray from 0 to z labelled `r = …`, the solid arc to **Arg z** labelled `Arg z = …`,
  and optional faint extra windings so that **arg z** is seen to be a set (colour `--polar`).

`tests/interact/_helpers.mjs` lets every other goal's interaction script drive that plane with real mouse
events (`dragHandle`, `dragHandleAround`, `planePixel`, `clickChip`, `readText`, `setSlider`).

### 1.2 Story thread carried, and how it shows on screen

| Thread | What the plane draws | What the student sees |
|---|---|---|
| T1 one point, two addresses | `drawCartAddress` and `drawPolarAddress` on the same dot; grid switch `cart` / `polar` / `both`; every handle's accessible name states both addresses | Dashed `--cart` drop lines (slide) beside a solid `--polar` ray and arc (turn and walk) to the **same** dot. Switch the grid to polar and the circles and rays are the shapes the polar address finds natural. |
| T2 staircase | Solid arc = `Arg z`; `ghosts` faint windings labelled `also 8π/3`, `also -4π/3`; `drawSeam` dashed ray | The dot is drawn once. One arc is solid and named Arg; the others are faint and named "also". Drag z across the negative real axis and the solid arc flips from π to −π while the dot never jumps. |
| T3 motion | `addCurve`: lightness ramp `--t0` to `--t1` along t, dots at t = 0, ¼, ½, ¾, arrowhead at t = 1, optional cursor at t; a small "start → end" legend | The same ramp on the z-plane stroke and on the w-plane image: "when" on the input matches "when" on the output. |

North star: the plane is forgiving and obvious. Pan, zoom, reset and keyboard all work without a manual;
a lost point is one click ("Reset") from being back.

### 1.3 Problems and topics covered

The assignment refs of this goal are topics T1.1, T1.2, T1.3, T1.5, T2.1. The plane draws the picture of
each problem below; section 6.3 gives each one's full worked solution in both addresses, and those numbers
are the expectations the plane's tests use (pixel positions, label strings, ramp samples).

| Problem | What the plane must be able to draw (primitive) |
|---|---|
| 1.1.1, 1.1.2 | two handles z₁, z₂, the result dot, both address overlays on each |
| P1, P2 | z and its mirror conj z (same r, opposite Arg) |
| 1.2.1 | `drawCircle` about 1 + 2i of radius 3; `fitTo` the circle |
| 1.2.2 | `drawSegment` from 4 + 3i to −1 + i |
| 1.3.1 | `drawCartAddress` + `drawPolarAddress({ghosts: 1})` for −1 + i√3 |
| 1.3.2 | the spiral of dots z, z², …, z¹⁰ (`drawPolarAddress` per dot) |
| 1.5.1 | `addCurve` with the ramp, segment 2 + i to −3 − 3i |
| 1.5.2 | `drawCircle` solid (outer, included) and dashed (inner, excluded), annulus fill via `innerRadius` |
| 2.1.1 | the same dot on a z-plane and its image on a w-plane |
| 2.1.2 | z-plane stroke x = 2 and w-plane stroke (parabola) with the **same** ramp |
| 2.1.3 | z-plane stroke x = 2 and w-plane stroke (the real axis, reversed) with the same ramp |

---

## 2. UX

### 2.1 Anatomy and wireframes

The widget is a square (default) block that fills its container up to `max-width: 640px` and never
causes horizontal page scroll. Layers, back to front: canvas (grid, axes, layers, curves, legend), handle
buttons (DOM), control buttons (DOM), visually-hidden live region.

Desktop (plane about 560 px square inside a station column). The picture is schematic and shows z = -1 + i√3 on a plane whose grid mode is `both`
(grid lines omitted). Key: `o` the draggable handle (filled dot with a halo, label `z`); `:` and `.` the dashed `--cart` drop lines with the feet `+` on the axes;
`\` the solid `--polar` ray 0 to z; `*` the solid Arg arc; `~` the faint extra winding (arg z as a set); `=` the dashed seam on the negative real axis;
`[ + ] [ - ] [Reset]` the controls; the bottom-left bar is the ramp legend (only when a ramped curve is shown).

```
+-----------------------------------------------+
| Im                     |               [ + ]  |
|                        |               [ - ]  |
|                        |               [Reset]|
|                 o......+  y = 1.732           |
|      z (handle) :\     |                      |
|                 : \ r=2|    Arg z = 2π/3      |
|                 :  \   | ~~~ also 8π/3        |
|                 :   \  | ~**                  |
|                 :    \ |~*                    |
|=-=-=-=-=-=-=-=-=+-=-=-=+*---+----+----+---- Re|
|              x = -1    0     1    2    3      |
|                                               |
| start [==========] end                        |
+-----------------------------------------------+
```

Phone (390 px viewport; plane 358 px square with 16 px gutters; everything else in the station stacks below it; same marks; the Reset button is drawn `[Rst]` only for width):

```
+----------------------------------------+
| Im                |               [ + ]|
|                   |               [ - ]|
|                   |               [Rst]|
|            o......+ y=1.732            |
|            :\     |                    |
|            : \ r=2|   Arg z = 2π/3     |
|            :  \   | ~~ also 8π/3       |
|            :   \  | ~**                |
|=-=-=-=-=-=-+-=-=-=+*--+--+--+-- Re     |
|         x=-1       0   1  2  3         |
|                                        |
| start [=======] end                    |
+----------------------------------------+
```

The control column is 3 stacked buttons at the top-right (32 px; 40 px on coarse pointers). The tick label
spacing thins out automatically on narrow planes (section 5.5).

### 2.2 Controls (every one has a stable id and an accessible name)

| id | element | visible label | accessible name | behaviour |
|---|---|---|---|---|
| `${id}-viewport` | `div.plane`, `role="group"`, `tabindex="0"` (only when `interactive`) | none | `"<ariaLabel>. Arrow keys pan, plus and minus zoom, zero resets the view."` (default `ariaLabel` is `Complex plane`; non-interactive planes omit the second sentence) | Focus target for the view keys (section 2.4). Focus ring: 3 px `--focus`. |
| `${id}-canvas` | `canvas.plane-canvas`, `aria-hidden="true"` | none | none (the drawing is decorative; stations provide a text readout) | Receives pointer events on empty space. |
| `${id}-${spec.id}` | `button.plane-handle` per `addPoint` | optional `spec.label` text beside the dot | `aria-label` = `[name: ]z = <cart>; r = <r>, θ = <θ> (Arg)` (section 4.5) | Drag with pointer, nudge with arrows. Draggable ones get a soft halo ring (grab affordance) and `title` "Drag this point, or use the arrow keys. Shift moves 10 times as far, Alt a tenth as far." |
| `${id}-zoom-in` | `button.plane-btn` | `+` | `Zoom in` (title `Zoom in (+)`) | Zoom ×1.25 about the view centre. `aria-disabled="true"` at `minUnitsAcross`. |
| `${id}-zoom-out` | `button.plane-btn` | `−` (U+2212) | `Zoom out` (title `Zoom out (-)`) | Zoom ÷1.25. `aria-disabled="true"` at `maxUnitsAcross`. |
| `${id}-zoom-reset` | `button.plane-btn` | `Reset` | `Reset view` (title `Back to the starting view (0)`) | `resetView()`. |
| `${id}-status` | `div.plane-sr`, `aria-live="polite"`, `aria-atomic="true"` | visually hidden | n/a | Receives the handle's `aria-label` text 300 ms after the last keyboard nudge, and the view summary after a keyboard pan or zoom. |

Buttons use `aria-disabled` (never the `disabled` attribute) so keyboard focus is not lost when a limit is
reached. `controls: false` removes the three buttons; `interactive: false` removes them as well and makes
the plane inert apart from its handles.

### 2.3 Pointer and touch

- **Handle drag** (mouse, pen, touch). `pointerdown` on a handle button: focus it, capture the pointer,
  remember the grab offset (pointer minus the handle's exact centre) so the dot does not jump under the
  finger. `pointermove`: new z = `fromPixel(pointer − offset)`, with the pointer clamped to the canvas
  box inset by 10 px, so a dragged point cannot be lost off the edge and its dot is never half cut off; apply the optional `snap`; the dot follows the snapped
  position. `pointerup`, `pointercancel`, `lostpointercapture`: end the drag with `final: true`. `Escape`
  during a drag puts the point back where it started.
- **Empty space, mouse or pen.** Left-drag pans the view (cursor `grab` / `grabbing`) unless draw mode is on.
  The wheel zooms about the cursor under the policy D6. A drag shorter than 3 px is a click (no pan).
- **Empty space, touch.** One finger on empty space is left to the browser (the page scrolls; `touch-action:
  pan-x pan-y` on the canvas), so the plane never traps scrolling. Two fingers pinch-zoom the plane about
  the midpoint and follow the midpoint (pan); if the browser claims the gesture for scrolling it sends
  `pointercancel` and the plane simply ends the gesture. In draw mode `touch-action: none` on the canvas so
  strokes are drawn; pan and pinch are off; the buttons and keyboard still zoom.
- **Station events.** Pointer events on empty canvas are re-emitted through `plane.on(...)` (section 4.4).
  Events that start on a handle or a control never reach them.
- Hit sizes: a handle's button is `max(2·radius + 18, 32)` px square (44 px on `(pointer: coarse)`);
  the visible dot is `2·radius` px (default 14 px). Later-added handles sit on top; the dragged or focused
  handle is raised (`z-index: 3`), which is above the zoom buttons (`z-index: 2`), so a point dragged into the button corner stays visible and can be grabbed again. A handle whose dot sits under or against the zoom buttons while it is not focused (a preset such as `3 + 3i` on a phone-width plane, or a point parked there) is raised the same way (class `is-above-controls`, decided in `positionHandles` from the measured button rectangle), so it is never hidden by a button and can always be grabbed; the buttons it covers stay reachable by keyboard. A handle label that would be cut off (dot near the top edge, or near the right edge) flips below, or to the left of, its dot.

### 2.4 Keyboard

| Focus | Key | Effect |
|---|---|---|
| a handle (draggable) | Arrow keys | move by `step` (default 0.1) along Re / Im; Shift ×10, Alt ÷10; calls `onDrag(z, {final: true, source: 'keyboard'})`; announces the new label via `${id}-status` |
| a handle | Escape (during a pointer drag) | cancel the drag |
| a handle or the plane | `+` or `=` | zoom in ×1.25 about the view centre |
| a handle or the plane | `-` or `_` | zoom out |
| a handle or the plane | `0` or `Home` | reset to the starting view |
| the plane itself | Arrow keys | pan by 10 % of the visible width (height for Up/Down); Shift: 50 % |
| any | Ctrl or Cmd held | ignored (browser shortcuts such as page zoom keep working) |

Focusing a handle that is off-screen pans the view minimally so the handle is visible.

### 2.5 States

- **Empty.** A plane with no layers still shows the grid and axes. Never blank.
- **Not measured yet** (container is `display: none`, zero-size, or not attached). Nothing is drawn and no
  size is assumed except a nominal 400-px-wide fallback so `toPixel` stays finite. When the
  `ResizeObserver` reports a real size the plane measures, positions handles, and draws, without moving the view.
- **Loading.** None. First paint is one animation frame after `createPlane`.
- **Canvas unavailable** (`getContext('2d')` returns null). The plane shows a note and keeps working as an
  inert box; every method stays callable and nothing throws. Copy: *This picture needs canvas drawing, and
  your browser has it switched off. The numbers beside it still work.*
- **A layer throws.** The error is logged once with `console.error` (so the smoke harness fails loudly), that
  layer is disabled, the other layers keep drawing, and a small note appears at the bottom-left. Copy:
  *Part of this picture could not be drawn. The numbers beside it are still right.*
- **Limits.** Zooming past `minUnitsAcross`/`maxUnitsAcross` clamps; the status region says *That is as far
  in as it goes.* / *That is as far out as it goes.* after a keyboard or button attempt.
- **Developer errors** (programming mistakes, thrown synchronously with a readable message):
  `createPlane: container must be an Element`; `createPlane: options.id is required (letters, digits, - and _)`;
  `createPlane: xRange must be [min, max] with min < max`; `plane "<id>": duplicate point id "<spec.id>"`.

### 2.6 Copy deck (all strings the plane shows or announces)

| Where | Text |
|---|---|
| default plane name | `Complex plane` |
| key sentence | `Arrow keys pan, plus and minus zoom, zero resets the view.` |
| zoom buttons | `+`, `−`, `Reset`; names `Zoom in`, `Zoom out`, `Reset view` |
| handle hint (title) | `Drag this point, or use the arrow keys. Shift moves 10 times as far, Alt a tenth as far.` |
| handle name | `z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)`; with an exact angle `z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)`; with a name `z₁: z = 3 - 2i; r = 3.606, θ = -0.588 (Arg)` |
| view summary (live) | `View: centre 0.8 + 0i, 8 units across.` |
| zoom limits (live) | `That is as far in as it goes.` / `That is as far out as it goes.` |
| Cartesian address labels | `x = -1`, `y = 1.732` |
| polar address labels | `r = 2`, `Arg z = 2π/3`, faint `also 8π/3`, `also -4π/3` |
| seam label | `seam` |
| ramp legend | `start` and `end` around a gradient bar |
| axis names | from `axisLabels` (`Re`/`Im`, `x`/`y`, `u`/`v`) |
| canvas unavailable / layer failed | the two sentences in 2.5 |

All plain-text numbers use ASCII `-` as the minus sign (tests match on it). Greek letters and π are
real Unicode characters (θ, π); they appear only on the canvas and in `aria-label`s, never in a place a
station test greps for ASCII `pi`.

---

## 3. Visual encoding

Colours are **tokens only**. The canvas reads them through `cssColor` at draw time; the injected CSS uses
`var(--token, <system-colour-keyword>)` (`Canvas`, `CanvasText`, `Highlight`; keywords, not literals). Nothing
below changes hue between themes; only two alpha pairs differ (grid), chosen from the luminance of `--surface`.

| Mark | Token | Style | Notes |
|---|---|---|---|
| Plane surface | `options.background` (default `--surface`) | CSS `background` on `.plane` | border `1px solid var(--border)` |
| Cartesian grid lines | `--cart` | 1 px, alpha 0.16 light / 0.24 dark | "everything Cartesian" |
| Polar rings and rays (every 30°) | `--polar` | 1 px, alpha 0.20 light / 0.28 dark | the ring r = 1 is drawn stronger (alpha ×1.8, 1.5 px) when its radius is at least 6 px |
| Axes (Re, Im) | `--cart` | 1.5 px, alpha 0.75, 4 px tick marks | they are the Cartesian axes in every grid mode |
| Tick labels | `--text-muted` | 11 px | halo `--surface` |
| Axis names | `--text` | 12 px | |
| Handle dot | spec colour (default `--input`) | CSS circle, 2 px `--surface` ring; draggable ones add a 30 % halo | focus ring `--focus` |
| Handle label (DOM) | `--text` | 13 px, text-shadow halo in `--surface` | |
| Canvas labels | the mark's token | 13 px (12 px when the canvas is under 420 px wide), halo | `x = …`, `r = …`, `Arg z = …`, `also …`, `seam` |
| **Cartesian address** | `--cart` | **dashed** `[5, 4]`, 1.5 px, alpha 1; foot dots r = 3 | encodes "slide"; dashed so it is not colour alone |
| **Polar address ray** | `--polar` | **solid** 2 px | encodes "walk r" |
| **Polar address Arg arc** | `--polar` | **solid** 2.5 px, small arrowhead | `Arg z`: the one highlighted step |
| **Ghost arcs (arg z set)** | `--polar` | solid 1.5 px, alpha `min(0.35, --ghost-alpha)` fading by 20 % per extra winding to a floor of 40 % | `arg z`: faint, labelled `also …` |
| Seam | `--seam` | dashed `[8, 5]`, 2 px, alpha 0.9 | negative real axis where Arg jumps |
| Input curve | `--input` | ramp (below) | z-plane |
| Output curve | `--output` | ramp (below) | w-plane |
| Time ramp | base mixed toward `--t0` (t = 0) and `--t1` (t = 1), weight 0.65 | 32 colour bins, round joins; dots at t = 0 (r 4.5), ¼, ½, ¾ (r 3.2) with a `--surface` ring; arrowhead at t = 1; optional cursor ring | lightness is **monotone** in t (section 6.1); lightness not hue, so colour-blind safe **Superseded in residue cleanup:** the weight is 0.4 (`RAMP_WEIGHT`) and a curve can pass its own `rampWeight` from 0 to 1. |
| Legend | ramp colours of the first visible ramped curve | 64 x 6 px bar with the words `start` and `end`, 11 px `--text-muted`, on an 80 % `--surface` pill | bottom-left; auto-hidden when no ramped curve is visible; `legend: false` suppresses it |
| Excluded boundary / included boundary | any token | dashed `DASH.excluded` / solid | helper constant, used by `sets` |
| Fills | the shape's token | alpha 0.12 | |
| Text halo | `--surface` | 3 px stroke under every canvas label | keeps labels legible over grid and curves |

Both themes: `surfaceIsDark()` = (luma of the resolved `--surface` below 128). It picks the alpha pair
only. If a token is missing (stylesheet failed), the token resolves to the page's computed text colour,
or `transparent` for surface-like tokens (`--surface`, `--surface-2`, `--bg`), and a one-time `console.warn`
names it; the plane stays legible.

Colour that carries meaning also carries a second cue: Cartesian is dashed and polar is solid; Arg is thick
and arg ghosts are thin with text; time is lightness, dots and an arrowhead.

**Checked against the shell's real tokens** (`css/theme.css` on disk; computed with `rampMix` at weight 0.65 and WCAG contrast against `--surface`):

> Superseded in residue cleanup: the contrast and luma figures here are for weight 0.65. The lab review found polar strokes reading dark brown, so the weight is 0.4: the worst share of a token's chroma kept is 50 percent (was 17), the worst hue shift 4 degrees (was 28), the lightness climb 0.110 OKLab and the worst contrast against `--surface` 5.2:1.

| theme | stroke | t = 0 | t = 0.5 | t = 1 | contrast vs `--surface` (t = 0 / 0.5 / 1) |
|---|---|---|---|---|---|
| light | `--input` | `rgb(10, 55, 60)` | `rgb(41, 90, 99)` | `rgb(71, 124, 137)` | 12.9 / 7.7 / 4.7 |
| light | `--output` | `rgb(65, 37, 80)` | `rgb(96, 71, 118)` | `rgb(126, 105, 156)` | 13.1 / 7.9 / 4.8 |
| dark | `--input` | `rgb(82, 148, 155)` | `rgb(131, 190, 187)` | `rgb(180, 233, 219)` | 4.9 / 8.2 / 12.7 |
| dark | `--output` | `rgb(140, 125, 172)` | `rgb(189, 168, 204)` | `rgb(238, 210, 237)` | 4.6 / 7.8 / 12.2 |

Every ramp stop is at least 4.6:1 against the surface, the green input and the purple output stay clearly different hues at t = 0.5, and the luma difference between t = 0.1 and
t = 0.9 is about 54 (light) and 68 to 69 (dark) on a 0 to 255 scale, which is what interaction step S6 asserts (more than 20). In the light theme the ramp reads dark to mid; in the dark
theme mid to near-white: in both, later is lighter.

---

## 4. Module API

`js/core/plane.js`: no imports; ES module; DOM only inside functions.

### 4.1 Exports

```js
// pure and import-safe in Node (acceptance A1)
export function makeTransform({ center, unitsAcross }, w, h) -> { toPixel(z), fromPixel(x, y | {x, y}), scale }
export function mixColor(a, b, t) -> "rgb(r, g, b)"            // "rgba(r, g, b, a)" only if an input has alpha < 1
export function niceGridStep(unitsAcross) -> number
export const DASH = { cart: [5, 4], excluded: [6, 5], seam: [8, 5], guide: [3, 4] }
export const internals = Object.freeze({ parseColor, rampMix, visibleBounds, zoomView, fitView, polarOf,
  formatNumber, formatAngle, ghostAlpha, pointAtT, arcPoints, handleAriaLabel, formatRGBA, withLabelFrame, textBox })

// browser (ARCHITECTURE 3.5, exact)
export function createPlane(container, options) -> Plane
export function cssColor(nameOrColor) -> string
export function rampColor(baseColor, t, weight = RAMP_WEIGHT /* 0.65 */) -> string
export function drawCartAddress(ctx, plane, z, { color = '--cart', labels = true } = {})
export function drawPolarAddress(ctx, plane, z, { color = '--polar', labels = true, ghosts = 0, ghostsNeg = 0,
                                                  arcRadiusPx = 28, name = 'z' } = {})
export function drawSeam(ctx, plane, angle = Math.PI, { color = '--seam', width = 2, dash = DASH.seam, label = 'seam' } = {})
export function drawCircle(ctx, plane, center, radius, { color = '--polar', dash = null, fill = null, fillAlpha = 0.12,
                                                         width = 2, alpha = 1, innerRadius = null } = {})
export function drawRay(ctx, plane, angle, { color = '--polar', dash = null, width = 1.5, from = {re: 0, im: 0} } = {})
export function drawSegment(ctx, plane, a, b, { color = '--text', dash = null, arrow = false, width = 2 } = {})
export function drawArc(ctx, plane, center, radius, from, to, { color = '--polar', arrow = false, width = 2 } = {})
export function drawTimedCurve(ctx, plane, points, { color = '--input', width = 2, dots = true, arrow = true,
                                                     closed = false, ramp = true, dash = null, alpha = 1, cursor = null } = {})
export function drawDot(ctx, plane, z, { color = '--text', radius = 5, label, labelOffset = {dx: 8, dy: -8}, halo = true } = {})
export function drawLabel(ctx, plane, z, text, { color = '--text', dx = 8, dy = -8, font, align = 'left', clamp = true } = {})
export function drawPolygonFill(ctx, plane, points, { color = '--input', alpha = 0.12 } = {})
```

All drawing helpers: take the 2D context in **CSS pixels** (the plane applies the `devicePixelRatio`
transform), leave the context state exactly as found (`save`/`restore`), and **set every stroke property
explicitly before every stroke** (`strokeStyle`, `lineWidth`, `globalAlpha`, `setLineDash`) so a previous
dashed stroke can never leak into a solid one. They call only `plane.toPixel`, `plane.getSize()` and
`plane.getView()`, so a stub plane is enough to test them.

### 4.2 `createPlane` options

```js
{ id: string,                                  // required: /^[A-Za-z][A-Za-z0-9_-]*$/
  xRange: [-4, 4], yRange: [-4, 4],            // initial view; both must fit; min < max
  grid: 'cart' | 'polar' | 'both' | 'none' = 'cart',
  axes: true, axisLabels: ['Re', 'Im'] = ['Re', 'Im'],
  interactive: true,                           // pan, zoom, keyboard, controls
  minUnitsAcross: 0.5, maxUnitsAcross: 200,
  background: '--surface',                     // token or css colour
  // additive:
  aspect: number = (xSpan / ySpan),            // width / height of the box (CSS aspect-ratio)
  maxWidth: number | string = 640,             // px or css length -> --plane-max-width
  controls: true,                              // + / - / Reset buttons
  legend: true,                                // ramp legend
  tickLabels: true,
  wheel: 'focus' | 'always' | 'ctrl' | 'off' = 'focus',
  ariaLabel: 'Complex plane' }
```

### 4.3 Plane object

```js
Plane = {
  id, el /* div.plane */, canvas,
  toPixel({re, im}) -> {x, y}                  // CSS px relative to the canvas
  fromPixel(x, y | {x, y}) -> {re, im}
  getView() -> { center: {re, im}, unitsAcross, scale }
  getSize() -> { w, h }                        // CSS px; nominal 400 x 400/aspect until measured   (additive)
  setView({ center?, unitsAcross? })           // partial; clamps; ignored if non-finite; no-op if unchanged
  fitTo(points, padding = 0.15)                // also becomes the new "home" view
  resetView(); setHome()                       // (additive) back to / mark the starting view
  setGrid('cart' | 'polar' | 'both' | 'none')
  addPoint(spec) -> Handle;  getHandle(id) -> Handle | null;  handles() -> Handle[]       // last two additive
  addLayer(draw: (ctx, plane) => void, { order = 0 } = {}) -> Layer
  addCurve(spec) -> CurveLayer
  on(type, cb) -> unsubscribe                  // type in the list in 4.4; unknown type throws TypeError
  setDrawMode(on: boolean); isDrawMode() -> boolean
  requestDraw(); resize(); destroy()
  getStats() -> { draws, lastDrawMs, resizes, layers, handles, destroyed }                 // (additive, for tests)
}
```

`el` carries `data-plane-id`, `data-center-re`, `data-center-im` (6 decimals), `data-scale` (px per unit, 4
decimals) and, additive, `data-units-across`, refreshed on every view change.

### 4.4 Events

`on('pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', cb)`: `cb({ type, z, px, py, pointerType,
pointerId, isPrimary, dragging, originalEvent })` for events on **empty canvas**. `px, py` are CSS px relative
to the canvas; `z = fromPixel(px, py)`; `dragging` is true while a pointer that went down on empty canvas
is still down. `pointermove` also fires for hover (no button) **only if** there is at least one
`pointermove` listener (no cost otherwise). The plane captures the pointer on `pointerdown`, so
`pointermove`/`pointerup` keep arriving when the pointer leaves the canvas.

`on('viewchange', cb)`: `cb({ center, unitsAcross, scale, reason })`, `reason` one of `'pan' | 'zoom' | 'set' |
'fit' | 'reset' | 'resize'`; synchronous; not emitted when nothing changed (this is what stops two linked
planes from ping-ponging).

### 4.5 Handle, Layer, CurveLayer

```js
spec (addPoint) = { id, z, draggable = true, color = '--input', label = '', radius = 7, step = 0.1,
                    snap = null | ((z) => z), onDrag(z, { final, source }) , onFocus(),
                    // additive:
                    name = label, focusable = true, onDragStart(z) }
Handle = { id, z /* getter, a copy */, el /* button.plane-handle */, set(z, { silent = false } = {}), remove(), hidden /* get/set */ }
```

- `set(z)` is exact (no snapping), updates the dot, the label, the `data-re`/`data-im` attributes and the
  `aria-label`, and requests a redraw. Unless `silent`, it then calls `onDrag(z, { final: true, source: 'api' })`.
  A non-silent `set` made from inside the same handle's own `onDrag` is treated as silent (no recursion).
- Non-finite `z` (NaN or Infinity, e.g. a pole): the handle is hidden, its last finite `z` is kept, nothing throws.
- `aria-label` format, exactly (pure function `internals.handleAriaLabel(z, name)`):
  `[name: ]z = <re> <+|-> <|im|>i; r = <r>, θ = <θ> (Arg)` where numbers are `formatNumber` (3 decimals,
  trailing zeros trimmed, ASCII minus, "-0" shown as "0"), the sign comes from the **rounded** imaginary part,
  and `<θ>` is `<decimal> (<exact>, Arg)` when `formatAngle` finds a p·π/q form, else `<decimal> (Arg)`.
  The `name:` prefix is present only when `name` is non-empty and not `z`.
- DOM: `<button type="button" class="plane-handle [is-draggable]" id="${plane.id}-${spec.id}"
  data-plane-id data-handle-id data-re data-im aria-label title style="--hit; --dot; --handle-color">`
  containing `<span class="plane-handle-dot" aria-hidden="true">` and, if `label`, `<span
  class="plane-handle-label" aria-hidden="true">`.

```js
Layer = { order, hidden /* get/set */, remove() }
CurveLayer spec = { id, points: {re, im, t}[], color = '--input', ramp = true, width = 2, dots = true, arrow = true,
                    closed = false, dash = null, order = 100, alpha = 1, cursor = null }
CurveLayer = { id, points /* getter */, update(points), setColor(c), setCursor(t | null), set(patch), remove(), hidden /* get/set */ }
```

### 4.6 Lifecycle

`createPlane` appends `el` to `container` (nothing else in the container is touched), measures, registers
`window.__mv.planes.set(id, plane)`, schedules the first frame, and installs: a `ResizeObserver` on `el`, a
`window` `resize` listener (browser zoom and dpr changes), pointer/wheel/key listeners on `el`/`canvas`/handles,
and **one shared** theme hub for all planes (a `document` `themechange` listener, a `MutationObserver` on
`<html>` attributes `data-theme`, `class`, `style`, and a `prefers-color-scheme` media listener). Any
signal clears the colour cache and calls `requestDraw()` on every live plane.

`destroy()` (idempotent): cancels the animation frame; disconnects the observer; removes the window
listener and every handle/pointer/key/wheel listener; detaches this plane from the theme hub (the hub's
own listeners are removed when the last plane is destroyed); removes `el` from the DOM; clears layers,
handles and listeners; deletes `window.__mv.planes[id]` only if it still maps to this plane; sets
`stats.destroyed`. After `destroy()` every method is a safe no-op (`addPoint` and `addCurve` return inert
objects of the right shape) so a late timer in a station cannot throw.

A station uses it like this:

```js
const plane = createPlane(el.querySelector('#addresses-plane-host'), { id: 'addresses-plane', grid: 'both' });
const zh = plane.addPoint({ id: 'z', z: { re: -1, im: Math.sqrt(3) }, label: 'z',
                            onDrag: (z) => { readout(z); plane.requestDraw(); } });   // handle id: addresses-plane-z
plane.addLayer((ctx, p) => { drawCartAddress(ctx, p, zh.z); drawPolarAddress(ctx, p, zh.z, { ghosts: 1 }); drawSeam(ctx, p); });
// unmount:
plane.destroy();
```

---

## 5. Algorithms (pseudocode precise enough to implement directly)

Layout of `plane.js`, top to bottom: (1) constants and the injected CSS string; (2) pure functions;
(3) token and colour resolution; (4) the exported drawing helpers; (5) `createPlane`; (6) the module-level
theme hub and registry. No `window`/`document`/`HTMLElement` is touched at module top level.

### 5.1 Pure functions (reference implementations; each is verified against section 7.1)

Named constants at the top of `plane.js` (so a reviewer can change one number in one place):

```js
const RAMP_WEIGHT = 0.65, RAMP_BINS = 32;                 // time ramp
const GHOST_STEP_PX = 7, MAX_GHOSTS = 6, ARC_STEP_PX = 3; // arg-as-a-set windings, arc polyline density
const ZOOM_STEP = 1.25, WHEEL_K = 0.0015, WHEEL_K_CTRL = 0.01, WHEEL_MAX_FACTOR = 1.5, PAN_FRAC = 0.1, PAN_FRAC_BIG = 0.5, PAN_THRESHOLD_PX = 3;
const LABEL_THROTTLE_MS = 150, ANNOUNCE_DEBOUNCE_MS = 300; // aria-label refresh while dragging; live-region debounce
const MAX_DPR = 3, MAX_CANVAS_PIXELS = 16e6, NOMINAL_W = 400, MAX_COORD_PX = 1e6, HANDLE_COORD_PX = 1e5;
const HANDLE_RADIUS = 7, HIT_MIN_PX = 32, HIT_PAD_PX = 18;
const GRID_ALPHA = { cart: [0.16, 0.24], polar: [0.20, 0.28] };        // [light, dark]
```


```js
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function makeTransform({ center, unitsAcross }, w, h) {
  const scale = w / unitsAcross;                                         // D1
  const toPixel = (z) => ({ x: w / 2 + (z.re - center.re) * scale, y: h / 2 - (z.im - center.im) * scale });
  const fromPixel = (x, y) => {
    if (x !== null && typeof x === 'object') { y = x.y; x = x.x; }       // D5
    return { re: center.re + (x - w / 2) / scale, im: center.im - (y - h / 2) / scale };
  };
  return { toPixel, fromPixel, scale };
}

export function niceGridStep(unitsAcross) {                 // about 8 lines across; 1-2-5 ladder
  const raw = unitsAcross / 8;
  const e = Math.floor(Math.log10(raw) + 1e-12);
  const p = Math.pow(10, e);
  const m = raw / p;                                         // 1 <= m < 10
  const nice = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return Number((nice * p).toPrecision(12));                 // kills 0.30000000000000004 style noise
}
//   guarantee: 5.6 <= unitsAcross / niceGridStep(unitsAcross) <= 14.0, and niceGridStep is non-decreasing.

function parseColor(str) {            // -> {r, g, b, a} (r,g,b 0..255, a 0..1) | null. Hex 3/4/6/8, rgb()/rgba() comma or space syntax, hsl()/hsla().
  if (typeof str !== 'string') return null;
  const s = str.trim().toLowerCase(); let m;
  if ((m = /^#([0-9a-f]{3,8})$/.exec(s))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
             a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  if ((m = /^rgba?\(\s*([^)]+)\)$/.exec(s))) {
    const parts = m[1].split(/[\s,\/]+/).filter(Boolean); if (parts.length < 3) return null;
    const ch = (p) => (p.endsWith('%') ? parseFloat(p) * 2.55 : parseFloat(p));
    const a = parts.length > 3 ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
    const out = { r: ch(parts[0]), g: ch(parts[1]), b: ch(parts[2]), a };
    return [out.r, out.g, out.b, out.a].every(Number.isFinite) ? out : null;
  }
  if ((m = /^hsla?\(\s*([^)]+)\)$/.exec(s))) {
    const parts = m[1].split(/[\s,\/]+/).filter(Boolean); if (parts.length < 3) return null;
    const hh = ((parseFloat(parts[0]) % 360) + 360) % 360, ss = parseFloat(parts[1]) / 100, ll = parseFloat(parts[2]) / 100;
    const a = parts.length > 3 ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
    const f = (n) => { const k = (n + hh / 30) % 12; return ll - ss * Math.min(ll, 1 - ll) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    const out = { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
    return [out.r, out.g, out.b, out.a].every(Number.isFinite) ? out : null;
  }
  return null;                          // named colours, oklch(), color-mix() ... are resolved by the browser probe (5.2)
}

function formatRGBA(r, g, b, a = 1) {   // the ONLY place that builds rgb()/rgba() strings
  const c = (v) => clamp(Math.round(v), 0, 255);
  return a >= 1 ? `rgb(${c(r)}, ${c(g)}, ${c(b)})` : `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${Number(a.toFixed(3))})`;
}

export function mixColor(a, b, t) {     // sRGB linear mix; t clamped to [0, 1]; non-finite t -> 0
  const A = toRGBA(a), B = toRGBA(b);   // toRGBA = parseColor, then browser probe, then throws TypeError (5.2)
  const k = clamp(Number.isFinite(t) ? t : 0, 0, 1);
  return formatRGBA(A.r + (B.r - A.r) * k, A.g + (B.g - A.g) * k, A.b + (B.b - A.b) * k, A.a + (B.a - A.a) * k);
}

function rampMix(base, c0, c1, t, weight = 0.65) {    // pure ramp colour: (1-w)*base + w*mix(c0, c1, t)
  const k = clamp(t, 0, 1), B = toRGBA(base), C0 = toRGBA(c0), C1 = toRGBA(c1);
  const mixc = (x0, x1) => x0 + (x1 - x0) * k;
  return formatRGBA(B.r * (1 - weight) + mixc(C0.r, C1.r) * weight,
                    B.g * (1 - weight) + mixc(C0.g, C1.g) * weight,
                    B.b * (1 - weight) + mixc(C0.b, C1.b) * weight, 1);
}

function formatNumber(x, digits = 3) {   // 2 -> "2"; -0 -> "0"; 1.7320508 -> "1.732"; 1e-7 -> "0"; NaN -> "NaN"
  if (!Number.isFinite(x)) return String(x);
  const n = Number(x.toFixed(digits));
  return n === 0 ? '0' : String(n);      // n === 0 is also true for -0
}

function formatAngle(theta) {            // exact p*pi/q (q <= 12, |p| <= 24) else 3-decimal number
  if (!Number.isFinite(theta)) return String(theta);
  const ratio = theta / Math.PI;
  if (Math.abs(ratio) < 1e-9) return '0';
  for (let q = 1; q <= 12; q++) {
    const p = Math.round(ratio * q);
    if (p !== 0 && Math.abs(p) <= 24 && Math.abs(ratio * q - p) < 1e-9) {
      const g = gcd(Math.abs(p), q), pp = p / g, qq = q / g;
      const num = Math.abs(pp) === 1 ? 'π' : `${Math.abs(pp)}π`;
      return (pp < 0 ? '-' : '') + (qq === 1 ? num : `${num}/${qq}`);
    }
  }
  return formatNumber(theta, 3);
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function polarOf(z) {                    // { r, theta } with theta = Arg in (-pi, pi]
  const r = Math.hypot(z.re, z.im);
  if (r === 0) return { r: 0, theta: 0 };                                  // Arg(0) = 0 by convention
  let theta = Math.atan2(z.im, z.re);
  if (z.re < 0 && Math.abs(z.im) <= 1e-12 * r) theta = Math.PI;            // negative real axis, rounding noise included: Arg = +pi, never -pi
  return { r, theta };                                                      // (atan2(-0, -1) is -pi in JS, which this also repairs)
}

function visibleBounds(view, w, h) {     // { xMin, xMax, yMin, yMax } in units
  const s = w / view.unitsAcross, hx = w / 2 / s, hy = h / 2 / s;
  return { xMin: view.center.re - hx, xMax: view.center.re + hx, yMin: view.center.im - hy, yMax: view.center.im + hy };
}

function zoomView(view, w, h, factor, px, py, { minUnitsAcross = 0.5, maxUnitsAcross = 200 } = {}) {
  // keeps the complex point under pixel (px, py) fixed; factor > 1 zooms in
  const s0 = w / view.unitsAcross;
  const zr = view.center.re + (px - w / 2) / s0, zi = view.center.im - (py - h / 2) / s0;
  const u1 = clamp(view.unitsAcross / factor, minUnitsAcross, maxUnitsAcross), s1 = w / u1;
  return { center: { re: zr - (px - w / 2) / s1, im: zi + (py - h / 2) / s1 }, unitsAcross: u1 };
}

function fitView(points, w, h, padding = 0.15, { minUnitsAcross = 0.5, maxUnitsAcross = 200 } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
    x0 = Math.min(x0, p.re); x1 = Math.max(x1, p.re); y0 = Math.min(y0, p.im); y1 = Math.max(y1, p.im);
  }
  if (x0 === Infinity) return null;                         // no finite points: caller does nothing
  const ex = Math.max(x1 - x0, 2), ey = Math.max(y1 - y0, 2);          // minimum span 2 units
  const wantX = ex * (1 + 2 * padding), wantY = ey * (1 + 2 * padding);
  return { center: { re: (x0 + x1) / 2, im: (y0 + y1) / 2 },
           unitsAcross: clamp(Math.max(wantX, wantY * w / h), minUnitsAcross, maxUnitsAcross) };
}

function ghostAlpha(k, base = 0.3) {     // k = 1, 2, ...: alpha of the k-th extra winding; never above 0.35
  const a = Math.min(0.35, Number.isFinite(base) ? Math.max(0, base) : 0.3);
  return a * Math.max(0.4, 1 - 0.2 * (k - 1));
}

function pointAtT(points, t) {           // {re, im} on the polyline at parameter t, or null; first segment with t_i <= t <= t_{i+1}
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    if (!(a.t <= t && t <= b.t) || !Number.isFinite(a.re + a.im + b.re + b.im)) continue;
    const d = b.t - a.t, u = d > 0 ? (t - a.t) / d : 0;
    return { re: a.re + (b.re - a.re) * u, im: a.im + (b.im - a.im) * u };
  }
  return null;
}

function arcPoints(cx, cy, R, from, to, stepPx = 3) {   // pixel polyline of a circle arc; angles are MATH angles (ccw, y up)
  const n = clamp(Math.ceil(Math.abs(to - from) * R / stepPx), 4, 720), out = [];
  for (let j = 0; j <= n; j++) {
    const phi = from + (to - from) * j / n;
    out.push({ x: cx + R * Math.cos(phi), y: cy - R * Math.sin(phi) });   // screen y is down
  }
  return out;
}

function handleAriaLabel(z, name = '') {
  const { r, theta } = polarOf(z);
  const re = formatNumber(z.re), imR = Number(formatNumber(z.im));
  const cart = `${re} ${imR < 0 ? '-' : '+'} ${formatNumber(Math.abs(imR))}i`;
  const dec = formatNumber(theta), exact = formatAngle(theta);
  const angle = exact !== dec ? `${dec} (${exact}, Arg)` : `${dec} (Arg)`;
  return `${name && name !== 'z' ? name + ': ' : ''}z = ${cart}; r = ${formatNumber(r)}, θ = ${angle}`;
}
```

### 5.2 Token and colour resolution

```js
const hasDOM = () => typeof document !== 'undefined' && !!document.documentElement && typeof getComputedStyle === 'function';
const colorCache = new Map();        // token -> resolved string; cleared at the start of every frame and on any theme signal
const warned = new Set();
const SURFACE_LIKE = new Set(['--surface', '--surface-2', '--bg']);

function beginFrame() { colorCache.clear(); }

export function cssColor(x) {
  if (typeof x !== 'string') return String(x);
  let s = x.trim();
  const v = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(s); if (v) s = v[1];     // accept "var(--cart)"
  if (!s.startsWith('--')) return x;                                              // a plain css colour
  if (!hasDOM()) return s;                                                        // D9: Node returns the name
  if (colorCache.has(s)) return colorCache.get(s);
  let val = getComputedStyle(document.documentElement).getPropertyValue(s).trim();
  if (!val) {
    val = SURFACE_LIKE.has(s) ? 'transparent' : getComputedStyle(document.documentElement).color;
    if (!warned.has(s)) { warned.add(s); console.warn(`plane.js: token ${s} is not defined`); }
  }
  colorCache.set(s, val); return val;
}
function tokenNumber(name, fallback) {           // e.g. --ghost-alpha; Node and missing token -> fallback
  if (!hasDOM()) return fallback;
  const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(n) ? n : fallback;
}
function fontFamily() {                          // canvas font family list
  if (!hasDOM()) return 'sans-serif';
  return getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif';
}

let probeCtx = null; const probeCache = new Map();
function probe(str) {                            // any css colour the browser understands -> {r,g,b,a} | null (browser only)
  if (!hasDOM()) return null;
  if (probeCache.has(str)) return probeCache.get(str);
  let out = null;
  try {
    if (!probeCtx) { const c = document.createElement('canvas'); c.width = c.height = 1; probeCtx = c.getContext('2d', { willReadFrequently: true }); }
    probeCtx.fillStyle = 'transparent'; const sentinel = probeCtx.fillStyle;
    probeCtx.fillStyle = str;
    if (probeCtx.fillStyle !== sentinel || str.trim().toLowerCase() === 'transparent') {   // assignment of an invalid string is ignored
      probeCtx.clearRect(0, 0, 1, 1); probeCtx.fillRect(0, 0, 1, 1);
      const d = probeCtx.getImageData(0, 0, 1, 1).data; out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
  } catch (e) { out = null; }
  if (probeCache.size > 64) probeCache.clear();
  probeCache.set(str, out); return out;
}
function toRGBA(str) {
  const c = parseColor(str) || probe(str);
  if (c) return c;
  if (hasDOM()) { const t = parseColor(getComputedStyle(document.documentElement).color) || probe(getComputedStyle(document.documentElement).color); if (t) return t; }
  throw new TypeError(`plane.js: cannot parse colour "${str}"`);
}

export function rampColor(baseColor, t, weight = RAMP_WEIGHT) {
  const base = cssColor(baseColor);
  if (!hasDOM()) return base;                                 // D9
  const k = Math.round(clamp(t, 0, 1) * 64) / 64;             // quantise so the per-frame cache is effective
  const key = `ramp|${base}|${k}|${weight}`;
  if (colorCache.has(key)) return colorCache.get(key);
  const out = rampMix(base, cssColor('--t0'), cssColor('--t1'), k, weight);
  colorCache.set(key, out); return out;
}
function surfaceIsDark() {
  if (!hasDOM()) return false;
  try { const c = toRGBA(cssColor('--surface')); return c.a > 0 && 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 128; } catch (e) { return false; }
}
function applyStroke(ctx, { color, width, dash, alpha = 1 }) {        // called before EVERY stroke
  ctx.strokeStyle = cssColor(color); ctx.lineWidth = width; ctx.globalAlpha = alpha; ctx.setLineDash(dash || []);
}
```

### 5.3 The injected stylesheet (verbatim; tokens only, no colour literals)

Injected once: `if (!document.head.querySelector('style[data-for="plane"]'))` create `<style data-for="plane">`.
System-colour keywords (`Canvas`, `CanvasText`, `Highlight`) and `currentColor`/`transparent` are keywords,
not literals.

```css
.plane{position:relative;display:block;box-sizing:border-box;width:100%;min-width:0;max-width:var(--plane-max-width,640px);
  aspect-ratio:var(--plane-aspect,1);margin-inline:auto;border:1px solid var(--border,currentColor);
  border-radius:var(--radius,8px);background:var(--plane-bg,var(--surface,Canvas));overflow:hidden;
  user-select:none;-webkit-user-select:none;touch-action:pan-x pan-y}
.plane:focus-visible{outline:3px solid var(--focus,Highlight);outline-offset:2px}
.plane-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:pan-x pan-y}
.plane.is-panning .plane-canvas{cursor:grabbing}
.plane.is-drawing .plane-canvas{cursor:crosshair;touch-action:none}
.plane.is-static .plane-canvas{cursor:default;touch-action:auto}
.plane-handles{position:absolute;inset:0;pointer-events:none}
.plane-handle{--hit-eff:max(var(--hit,32px),var(--hit-min,32px));
  --handle-halo:color-mix(in srgb,var(--handle-color,currentColor) 30%,transparent);
  position:absolute;left:0;top:0;width:var(--hit-eff);height:var(--hit-eff);
  margin:calc(var(--hit-eff)/-2) 0 0 calc(var(--hit-eff)/-2);padding:0;border:0;border-radius:50%;background:none;
  color:var(--text,CanvasText);font:inherit;display:flex;align-items:center;justify-content:center;
  pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:default;z-index:1}
.plane-handle.is-draggable{cursor:grab}
.plane-handle.is-dragging{cursor:grabbing}
.plane-handle:focus,.plane-handle.is-dragging,.plane-handle.is-above-controls{z-index:3}
.plane-handle-dot{box-sizing:border-box;width:var(--dot,14px);height:var(--dot,14px);border-radius:50%;
  background:var(--handle-color,var(--input,currentColor));box-shadow:0 0 0 2px var(--surface,Canvas)}
.plane-handle.is-draggable .plane-handle-dot{box-shadow:0 0 0 2px var(--surface,Canvas),0 0 0 6px var(--handle-halo,transparent)}
.plane-handle:hover .plane-handle-dot,.plane-handle.is-dragging .plane-handle-dot{transform:scale(1.15)}
.plane-handle:focus-visible{outline:none}
.plane-handle:focus-visible .plane-handle-dot{outline:3px solid var(--focus,Highlight);outline-offset:3px}
.plane-handle-label{position:absolute;left:calc(50% + var(--dot,14px)/2 + 4px);top:calc(50% - var(--dot,14px)/2 - 16px);
  font:600 13px/1 var(--font,system-ui,sans-serif);color:var(--text,CanvasText);white-space:nowrap;pointer-events:none;
  text-shadow:0 0 3px var(--surface,Canvas),0 0 3px var(--surface,Canvas),0 0 3px var(--surface,Canvas)}
.plane-handle-label.is-below{top:calc(50% + var(--dot,14px)/2 + 4px)}
.plane-handle-label.is-left{left:auto;right:calc(50% + var(--dot,14px)/2 + 4px)}
.plane-handle[hidden],.plane-controls[hidden],.plane-note[hidden]{display:none!important}
.plane-controls{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;
  pointer-events:none;z-index:2}
.plane-btn{pointer-events:auto;min-width:32px;height:32px;padding:0 8px;box-sizing:border-box;cursor:pointer;opacity:.9;
  border:1px solid var(--border,currentColor);border-radius:var(--radius,8px);background:var(--surface,Canvas);
  color:var(--text,CanvasText);font:600 14px/1 var(--font,system-ui,sans-serif)}
.plane-btn:hover{opacity:1;background:var(--surface-2,var(--surface,Canvas))}
.plane-btn:focus-visible{outline:3px solid var(--focus,Highlight);outline-offset:2px;opacity:1}
.plane-btn[aria-disabled="true"]{opacity:.45;cursor:default}
.plane-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.plane-note{position:absolute;left:8px;right:8px;bottom:8px;padding:6px 8px;border:1px solid var(--border,currentColor);
  border-radius:var(--radius,8px);background:var(--surface,Canvas);color:var(--text,CanvasText);
  font:500 12px/1.3 var(--font,system-ui,sans-serif);z-index:5}
@media (pointer:coarse){.plane-handle{--hit-min:var(--tap,44px)}.plane-btn{min-width:40px;height:40px}}
@media (prefers-reduced-motion:no-preference){.plane-handle-dot{transition:transform 80ms}}
```

### 5.4 `createPlane`: construction

```
createPlane(container, options):
 1. Validate: container is an Element (nodeType 1) else TypeError; options.id matches /^[A-Za-z][A-Za-z0-9_-]*$/;
    xRange and yRange are [lo, hi] finite with lo < hi; grid in the four values; else throw (messages in 2.5).
 2. opts = defaults merged (4.2). xSpan = x1 - x0, ySpan = y1 - y0, aspect = opts.aspect ?? xSpan / ySpan.
 3. ensureStyle().
 4. state:
      center = { re: (x0 + x1)/2, im: (y0 + y1)/2 }
      unitsAcross = clamp(max(xSpan, ySpan * aspect), minUnitsAcross, maxUnitsAcross)   // fits both ranges when w/h = aspect
      home = copy of {center, unitsAcross}
      w = 0, h = 0, dpr = 1, measured = false, drawMode = false, grid = opts.grid
      layers = [], layerSeq = 0, layersDirty = true, handles = new Map()
      listeners = { pointerdown, pointermove, pointerup, pointercancel, viewchange: new Set() each }
      dirty = false, rafId = 0, stats = { draws: 0, lastDrawMs: 0, resizes: 0 }
 5. DOM (all created with createElement; appended in this order):
      el = div.plane  [class is-static when !interactive]
           dataset.planeId = id; id attr = `${id}-viewport`; role = group; aria-label (2.2)
           tabIndex = 0 only when interactive
           style --plane-aspect = aspect; --plane-max-width = (number -> px | string); --plane-bg = (token -> var(token) | colour)
      canvas = canvas.plane-canvas  id `${id}-canvas`  aria-hidden=true
      handlesLayer = div.plane-handles
      controls = div.plane-controls with three button.plane-btn (ids/labels 2.2)   [only if interactive && controls]
      status = div.plane-sr  id `${id}-status`  aria-live=polite  aria-atomic=true
      note = div.plane-note[hidden] role=status
    container.appendChild(el)
 6. ctx = canvas.getContext('2d'); if null: note.textContent = (canvas-unavailable copy); note.hidden = false; state.noCanvas = true.
 7. Listeners: canvas pointerdown/pointermove/pointerup/pointercancel/lostpointercapture (5.9);
    el wheel {passive:false} (5.10); el keydown (5.10); control buttons click; window resize.
    ResizeObserver(el) -> resize(). Join the theme hub (5.11).
 8. window.__mv = window.__mv || {}; window.__mv.planes = window.__mv.planes || new Map(); planes.set(id, plane).   // D3
 9. resize(); requestDraw(); return plane.
```

### 5.5 View, resize, draw loop, painters

```
refreshTransform(): sz = measured ? {w, h} : {w: 400, h: 400 / aspect}; T = makeTransform({center, unitsAcross}, sz.w, sz.h)
toPixel = (z) => T.toPixel(z);  fromPixel = (x, y) => T.fromPixel(x, y)       // plane methods delegate to T

setViewInternal(next, reason):                                  // the ONLY writer of center/unitsAcross
  c = next.center ?? state.center; u = next.unitsAcross ?? state.unitsAcross
  if not all finite: return false
  u = clamp(u, minUnitsAcross, maxUnitsAcross); c = { re: clamp(c.re, -1e6, 1e6), im: clamp(c.im, -1e6, 1e6) }
  if |c.re - center.re| < 1e-12 && |c.im - center.im| < 1e-12 && |u - unitsAcross| < 1e-12 * max(1, u): return false
  center = c; unitsAcross = u
  refreshTransform(); syncDataAttrs(); positionHandles(); refreshZoomButtons(); requestDraw()
  emit('viewchange', { center, unitsAcross, scale, reason }); return true

zoomAbout(factor, px, py, reason):
  v = zoomView(getView(), size.w, size.h, factor, px, py, limits)
  changed = setViewInternal(v, reason)
  if !changed and factor !== 1: announce(factor > 1 ? 'That is as far in as it goes.' : 'That is as far out as it goes.')
pan by pixels (dx, dy): setViewInternal({ center: { re: center.re - dx / scale, im: center.im + dy / scale } }, 'pan')
fitTo(points, padding): v = fitView(points, size.w, size.h, padding, limits); if (!v) return; setViewInternal(v, 'fit'); home = copy of v
resetView(): setViewInternal(home, 'reset')       setHome(): home = copy of current view
setGrid(g): if g not in ('cart', 'polar', 'both', 'none'): throw TypeError; grid = g; requestDraw()
syncDataAttrs(): el.dataset.centerRe = String(r6(center.re)); centerIm = String(r6(center.im)); scale = scale.toFixed(4); unitsAcross = String(r6(unitsAcross))     // r6(x) = Number(x.toFixed(6)), so -0 reads "0"
size = measured ? { w, h } : { w: 400, h: 400 / aspect }                    // the effective size used by zoomAbout, fitTo and getSize()
refreshZoomButtons(): zoomIn aria-disabled = unitsAcross <= minUnitsAcross + 1e-9; zoomOut aria-disabled = unitsAcross >= maxUnitsAcross - 1e-9

resize():
  if destroyed or noCanvas: return
  cw = canvas.clientWidth; ch = canvas.clientHeight
  if cw < 2 or ch < 2: measured = false; return                 // hidden: draw nothing, keep the view
  dpr = min(window.devicePixelRatio || 1, 3); if (cw*dpr)*(ch*dpr) > 16e6: dpr = max(1, sqrt(16e6 / (cw*ch)))
  if measured and cw == w and ch == h and dpr == state.dpr: return
  w = cw; h = ch; state.dpr = dpr; measured = true
  canvas.width = round(cw * dpr); canvas.height = round(ch * dpr)               // resets the context state
  refreshTransform(); syncDataAttrs(); positionHandles(); requestDraw(); stats.resizes++
  emit('viewchange', { ...view, reason: 'resize' })

requestDraw(): if destroyed or dirty: return; dirty = true; rafId = requestAnimationFrame(draw)      // coalescing (A3)

draw():
  rafId = 0; dirty = false
  if destroyed or noCanvas or !measured: return
  t0 = performance.now(); beginFrame()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)             // transparent canvas (D2)
  paintGrid(); paintAxes()
  if layersDirty: sort layers by (order, seq); layersDirty = false
  for L of layers: if L.hidden or L.failed: continue
      ctx.save()
      try { L.draw(ctx, plane) }
      catch (err) { L.failed = true; console.error(`plane "${id}": layer failed`, err); note.textContent = (layer-failed copy); note.hidden = false }
      finally { ctx.restore() }
  paintLegend()
  stats.draws++; stats.lastDrawMs = performance.now() - t0
```

`crisp(v, lw)` for 1-px lines: `lwDev = round(lw * dpr); off = lwDev % 2 === 1 ? 0.5 : 0; return (Math.round(v * dpr - off) + off) / dpr`.

```
paintGrid():
  if grid == 'none': return
  B = visibleBounds(view, w, h); step = niceGridStep(unitsAcross); O = toPixel({re: 0, im: 0}); dark = surfaceIsDark()
  if grid in (cart, both):
     applyStroke(ctx, { color: '--cart', width: 1, alpha: dark ? 0.24 : 0.16 }); beginPath
     for k = ceil(B.xMin/step - 1e-9) .. floor(B.xMax/step + 1e-9): x = crisp(toPixel({re: k*step, im: 0}).x, 1); moveTo(x, 0); lineTo(x, h)
     for k = ceil(B.yMin/step - 1e-9) .. floor(B.yMax/step + 1e-9): y = crisp(toPixel({re: 0, im: k*step}).y, 1); moveTo(0, y); lineTo(w, y)
     stroke
  if grid in (polar, both):
     dx = max(B.xMin, 0, -B.xMax); dy = max(B.yMin, 0, -B.yMax); rMin = hypot(dx, dy)          // nearest point of the view to 0
     rMax = max over the 4 corners of hypot(corner)                                              // farthest
     kLo = max(1, ceil(rMin/step - 1e-9)); kHi = min(floor(rMax/step + 1e-9), kLo + 200)
     applyStroke(ctx, { color: '--polar', width: 1, alpha: dark ? 0.28 : 0.20 }); beginPath
     for k = kLo..kHi: r = k*step*scale; moveTo(O.x + r, O.y); arc(O.x, O.y, r, 0, 2*PI)
     L = 2*(w + h) + hypot(O.x, O.y)
     for j = 0..11: a = j*PI/6; moveTo(O.x, O.y); lineTo(O.x + L*cos a, O.y - L*sin a)
     stroke
     if scale >= 6: applyStroke({ color: '--polar', width: 1.5, alpha: min(0.6, (dark ? 0.28 : 0.20) * 1.8) }); beginPath; arc(O.x, O.y, scale, 0, 2*PI); stroke   // unit circle

paintAxes():
  if !axes: return
  O = toPixel(0); step = niceGridStep(unitsAcross); sp = step * scale
  xAxisVisible = 0 <= O.y <= h;  yAxisVisible = 0 <= O.x <= w
  applyStroke({ color: '--cart', width: 1.5, alpha: 0.75 })
  if xAxisVisible: line (0, crisp(O.y)) -> (w, crisp(O.y)); 4-px ticks at every k*step visible, k != 0
  if yAxisVisible: line (crisp(O.x), 0) -> (crisp(O.x), h); ticks likewise
  if tickLabels:
     every = sp >= 38 ? 1 : sp >= 19 ? 2 : 5                      // thin out on narrow planes (phone: 25-64 px spacing)
     font 11px fontFamily; fill --text-muted; each label drawn via drawLabel-style halo text
     rowY = clamp(O.y + 14, 12, h - 4)     colX = clamp(O.x - 6, 28, w - 4)                      // pinned to the edge if the axis is off-screen
     for k != 0, k % every == 0: label = tickLabel(k*step, step)
         x label at (px(k*step), rowY) textAlign center;  y label at (colX, py(k*step)) textAlign right, baseline middle
         skip a y label if |py - rowY| < 8
     if xAxisVisible and yAxisVisible: "0" at (O.x - 6, O.y + 14) textAlign right
  axis names (12px --text): axisLabels[0] at (w - 8, clamp(O.y - 8, 14, h - 6)) textAlign right;
                            axisLabels[1] at (clamp(O.x + 8, 8, w - 28), 14) textAlign left
                            a name whose box overlaps the zoom buttons' rectangle steps left of it (axisLabels[0]: right edge at rect.x0 - 6)
  frame obstacles: the real/imaginary axes as segments (cost 6), every tick label as a soft box, both axis names as boxes
tickLabel(v, step): d = clamp(-floor(log10(step) + 1e-9), 0, 6); return String(Number(v.toFixed(d)))     // "-1", "0.2", "10"

paintLegend():
  if !legend: return
  C = first visible curve layer with ramp == true; if none: return; base = cssColor(C.color)
  row at (12, h - 22), height 20: pill (rounded rect by arcTo, 80 % --surface), text "start" 11px --text-muted, bar 64 x 6
  (createLinearGradient with stops at 0, .25, .5, .75, 1 = rampColor(base, stop)), text "end"
```

### 5.6 Drawing helpers (standalone exports)

Common: `px = (z) => plane.toPixel(z)`; `{w, h} = plane.getSize()`; `scale = plane.getView().scale`; every helper wraps its
body in `ctx.save(); try { ... } finally { ctx.restore(); }`. `halo text` = `ctx.lineJoin = 'round'; ctx.lineWidth = 3;
ctx.strokeStyle = cssColor('--surface'); ctx.strokeText(t, x, y); ctx.fillStyle = cssColor(color); ctx.fillText(t, x, y)`.
Label font = `${w < 420 ? 12 : 13}px ${fontFamily()}`.

```
drawLabel(ctx, plane, z, text, { color, dx, dy, font, align, clamp }):
  p = px(z); x = p.x + dx; y = p.y + dy; ctx.font = font ?? default; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'
  if clamp:                                                       // keep the whole label inside the canvas
     wd = ctx.measureText(text).width
     lo = align == 'left' ? 4 : align == 'center' ? 4 + wd / 2 : 4 + wd
     hi = align == 'left' ? w - 4 - wd : align == 'center' ? w - 4 - wd / 2 : w - 4
     x = clamp(x, lo, max(lo, hi)); y = clamp(y, 14, h - 4)
  halo text.

drawDot(ctx, plane, z, { color, radius, label, labelOffset, halo }):
  p = px(z); if non-finite: return
  if halo: beginPath; arc(p.x, p.y, radius + 1.5, 0, 2*PI); fillStyle = surface; fill
  beginPath; arc(p.x, p.y, radius, 0, 2*PI); fillStyle = cssColor(color); fill
  if label: drawLabel(ctx, plane, z, label, { dx: labelOffset.dx, dy: labelOffset.dy })

drawSegment(ctx, plane, a, b, { color, dash, arrow, width }):
  A = px(a); B = px(b); applyStroke; beginPath; moveTo(A); lineTo(B); stroke
  if arrow and |B - A| >= 6: arrowHead(ctx, B, unit(B - A), 9 + 1.5*width, 6 + 1.2*width, color)

arrowHead(ctx, tip, u, L, W, color):       // u = unit direction in SCREEN space
  base = tip - L*u; n = (-u.y, u.x); beginPath; moveTo(tip); lineTo(base + (W/2) n); lineTo(base - (W/2) n); closePath
  fillStyle = cssColor(color); globalAlpha = 1; fill()

drawRay(ctx, plane, angle, { color, dash, width, from }):
  O = px(from); Lbig = 2*(w + h) + hypot(O.x, O.y); applyStroke; beginPath; moveTo(O); lineTo(O.x + Lbig*cos(angle), O.y - Lbig*sin(angle)); stroke

drawCircle(ctx, plane, center, radius, { color, dash, fill, fillAlpha, width, alpha, innerRadius }):
  C = px(center); R = radius * scale
  if fill: ctx.globalAlpha = fillAlpha; ctx.fillStyle = cssColor(fill); beginPath; arc(C.x, C.y, R, 0, 2*PI)
           if innerRadius != null: moveTo(C.x + innerRadius*scale, C.y); arc(C.x, C.y, innerRadius*scale, 0, 2*PI); fill('evenodd') else fill()
  applyStroke({ color, width, dash, alpha }); beginPath; arc(C.x, C.y, R, 0, 2*PI); stroke      // outline of the OUTER circle only
  (skip everything when R > 1e6 or not finite)

drawArc(ctx, plane, center, radius, from, to, { color, arrow, width }):
  C = px(center); pts = arcPoints(C.x, C.y, radius*scale, from, to); applyStroke; polyline stroke
  if arrow and the arc is at least 12 px long: tangent at the end = screen direction of the last two points; arrowHead(.., 7, 5)

drawPolygonFill(ctx, plane, points, { color, alpha }): needs >= 3 finite points; beginPath; moveTo/lineTo each; closePath; globalAlpha = alpha; fillStyle; fill

drawSeam(ctx, plane, angle, { color, width, dash, label }):
  drawRay-like stroke from the origin at `angle` with applyStroke({ color, width, dash, alpha: 0.9 }); the stroke is a segment obstacle for later labels
  if label (placed at the end of the plane frame, priority 4, see "Label placement" below):
     candidate k = 0, 1, ..., 13 along the seam at d = 64 + 24 k px, each on the clockwise side first (above the negative real axis), then the other side:
        first candidate: P = O + 64 * (cos angle, -sin angle) + n0 * (sin angle, cos angle), n0 = clearOffset(normal, width, fs, 3, min 10)
                         // 10 px for a flat seam (the documented default, R3); larger for a steep one, so the seam never runs through its own word
        others: P = O + d * (cos angle, -sin angle) + side * n * (sin angle, cos angle), n = the offset that clears the seam line (clearOffset, min 11)
     only candidates whose anchor is inside the canvas count; the first one that overlaps nothing wins; if even the cheapest overlaps another label,
     the dot or a button, the label is NOT drawn (the seam itself still is)

drawCartAddress(ctx, plane, z, { color, labels }):                                   // acceptance A4
  Z = px(z); Fx = px({ re: z.re, im: 0 }); Fy = px({ re: 0, im: z.im })
  applyStroke({ color, width: 1.5, dash: DASH.cart, alpha: 1 })
  if |Z - Fx| >= 2: beginPath; moveTo(Z); lineTo(Fx); stroke                         // vertical drop (z -> its Re foot)
  if |Z - Fy| >= 2: beginPath; moveTo(Z); lineTo(Fy); stroke                         // horizontal drop (z -> its Im foot)
  foot dots: fill arc r = 3 at Fx and Fy (colour = color), skipped when the foot is within 2 px of Z
  register in the frame: a 30 x 30 px box around Z (the dot), the two drop lines as segment obstacles
  if labels (placed at the end of the plane frame, priorities 1 and 2):
     if |z.re| >= 5e-4: text `x = ${formatNumber(z.re)}`; first candidate (Fx.x, z.im >= 0 ? Fx.y + 14 : Fx.y - 8), textAlign center (R1);
          then pushed further from the axis (+14 px steps, twice), then sideways by +-(width/2 + 18) and +-2x that, then on the other side of the axis
     if |z.im| >= 5e-4: text `y = ${formatNumber(z.im)}`; first candidate (z.re >= 0 ? Fy.x - 8 : Fy.x + 8, Fy.y), textAlign z.re >= 0 ? right : left, baseline middle (R1);
          then pushed away from the axis by 22 and 46 px, shifted up/down by 13 and 26 px, then on the other side of the axis
     both in `color` with halo, clamped into the canvas; a --surface backing rectangle (92 %) only when the final box overlaps the tick-label row or column

drawPolarAddress(ctx, plane, z, { color, labels, ghosts, ghostsNeg, arcRadiusPx, name }):   // acceptance A4
  O = px(0); Z = px(z); { r, theta } = polarOf(z); rayPx = |Z - O|
  if rayPx < 6: return                                                              // z is (nearly) 0: nothing meaningful to draw
  R = min(arcRadiusPx, max(8, 0.6 * rayPx))
  nPos = clamp(floor(ghosts), 0, 6); nNeg = clamp(floor(ghostsNeg), 0, 6)
  1. ghosts first (so the solid arc ends on top): for j = 1..nPos: radius R + 7*j, sweep 0 -> theta + 2*PI*j, alpha ghostAlpha(j, tokenNumber('--ghost-alpha', 0.3)), width 1.5
                                                for j = 1..nNeg: radius R + 7*(nPos + j), sweep 0 -> theta - 2*PI*j, alpha ghostAlpha(j, ...)
     each is arcPoints(O.x, O.y, radius, 0, endAngle) stroked solid in `color`
  2. the ray: applyStroke({ color, width: 2, dash: null, alpha: 1 }); moveTo(O); lineTo(Z); stroke
  3. the Arg arc: if |theta| * R >= 3: arcPoints(O.x, O.y, R, 0, theta), applyStroke({ color, width: 2.5, dash: null, alpha: 1 }), polyline stroke;
     arrowhead at the arc end if |theta| * R >= 12: tip = last point, direction = screen tangent = sgn(theta) * (-sin theta, -cos theta), size (7, 5)
  1b. each ghost ends in a small arrowhead (length 6, width 5) on the ray, tip at the winding's last point, alpha min(0.5, 1.6 * the ring's alpha): "one more full turn"; the rings stay <= 0.35
  register in the frame: a 30 x 30 px box around Z and the ray O-Z as a segment obstacle
  4. labels (if `labels`; placed at the end of the plane frame, priorities 3 and 4):
     r label `r = ${formatNumber(r)}`, first candidate (the documented default): the midpoint M of O..Z plus c * sgn * (-sin(theta), -cos(theta)) (sgn = theta >= 0 ? 1 : -1; this is the side away from the arc), centred, `color`, halo,
         where c = clearOffset(nu, wd, fs) = max(11, |nu.x| wd/2 + |nu.y| (fs + 3)/2 + 3 - nu.y c0y), c0y = -(fs - 5)/2, nu the unit normal used: the offset at which the label's glyph box just
         clears the ray by 3 px. A flat ray gives 11 px; a steep one up to wd/2 + 3 (for `r = 2` at 120 degrees: 24.16 px with the recorder's 7 px per character, about 22 px on the real canvas).
         The ray never runs through its own label (the old default of 11 px did for about a quarter to a third of all positions, steep rays above all; review fix round 2).
     block anchored at A = O + (R + 7*(nPos + nNeg) + 14) * (cos(theta/2), -sin(theta/2)), textAlign = cos(theta/2) >= 0 ? left : right, lines 14 px apart (the default, R2):
         line 1  `Arg ${name} = ${formatAngle(theta)}`                 (alpha 1)
         lines 2..4 (at most three, positive windings first):  `also ${formatAngle(theta + 2*PI*j)}`  /  `also ${formatAngle(theta - 2*PI*j)}`   (alpha 0.8, so the words stay readable)
     When the default is not free the labels move (next section).

Label placement (the fix for z on a real half-axis, where the default spots collide):
  The frame. Plane.draw() opens one label frame per frame: boxes (axis names, the handle dots 30 px square and their DOM labels, the zoom buttons' measured rectangle,
  every label already drawn with drawLabel or placed), soft tick-label boxes, and segments (the two axes, and each helper's ray, drop lines and seam). Outside a plane
  frame (a unit test, a station on its own canvas) each helper call gets a private frame, so its labels still avoid its own ray and its own z, and are placed at once.
  Order. In a plane frame the address labels are queued and placed at the END of the frame, after every layer, in the order
  x, y, r, Arg block, seam (ties in call order), so the result does not depend on the order a station calls the helpers in; they are drawn then, on top of the layers.
  Candidates and cost. Every label has an ORDERED candidate list whose first entry is the documented default. A candidate is clamped into the canvas, its glyph box is
  measured (measureText) and costed: 100 per box overlapped (other labels, dots, buttons), 25 per segment crossed (ray, drop line, seam), 6 per axis, 8 per tick label
  (labels that carry a backing rectangle ignore tick labels); the first zero-cost candidate wins, else the cheapest (the first on a tie). The own ray is a segment like any other
  (25 per crossing): r does NOT ignore it. A glyph box that would leave the canvas is moved back inside before it is costed: an alphabetic-baseline anchor keeps y in [14, h - 4],
  a label centred on its anchor (baseline 'middle', the y label) keeps y in [fs/2 + 4, h - fs/2 - 2], so the box (y +- (fs/2 + 2)) is whole even when its foot is at or beyond the edge.
     r:     (extra, t, side), extra outermost: for extra in 0, 16, 32, for t in 0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.12, 0.88, side = away from the arc then toward it, at the offset c + extra
            (c clears the ray), then past the tip of the ray and past the origin (rays shorter than the label). Extra outermost keeps r beside its own ray (every spot along the ray and on both
            sides at the clearing offset is tried before the label may stand 16 px, then 32 px, further out); the first spot is skipped when a drop line, another label or the dot is on it.
            The drawn Arg arc and ghost windings are obstacles for the r label ONLY (chords of about 11 degrees, a full circle at most, padded 4 px so the arrowheads count; `placeLabel`'s
            `extraSegs`): r's fallback spots slide along the ray toward the origin, where the arcs are, and touched their arrowheads before this. The Arg block starts beyond the
            windings by design (its default spot is R2, pinned) and does not ask.
     x, y:  the x default (Fx.x, Fx.y + 14) holds only where no tick label is: inside a plane the soft cost of 8 per tick label (a preset point sits on a tick, so `x = -1` sits on the tick
            label `-1`) moves it to the next row, 28 px under the axis; R1 and R8g pin the 14 px spot for a helper drawn without a plane (no tick labels in its frame). Station designers
            should expect 28 px under the axis, or further, when the point is on a tick; the y label is the same idea in the tick column.
     Arg:   anchor at angle theta/2 + k * 30 deg (k = 0, 1, -1, 2, -2, ..., 5, -5, 6) at radius d0, d0 + 18, d0 + 40 (d0 = R + 7 (nPos + nNeg) + 14), text on the open side of the anchor
     x, y, seam: see above
  The backing rectangle (92 % --surface) behind x and y is drawn only when the label's box overlaps the tick-label row (y from rowY - 11 to rowY + 4) or the tick-label
  column (x from colX - 32 to colX + 2), the places paintAxes prints numbers; nothing else is ever knocked out, whatever the call order.
```

### 5.7 Curves

```
drawTimedCurve(ctx, plane, points, { color, width, dots, arrow, closed, ramp, dash, alpha, cursor }):
  n = points.length; if n == 0: return
  P[i] = { x, y, t, ok }  from px(points[i]); ok = all of re, im finite and |x|,|y| < 1e6;  t = points[i].t if finite else i/(n-1)
  if n == 1: drawDot at the single point; return
  base = cssColor(color)
  segments: for i = 0 .. n-2 (and i = n-1 -> 0 when `closed`): a = P[i], b = P[(i+1) % n]; if !(a.ok && b.ok): continue
            tm = (closing segment) ? 1 : (a.t + b.t) / 2;   bin = ramp ? min(31, floor(clamp(tm, 0, 1) * 32)) : 0;  push (a, b, i) into bins[bin]
  ctx.lineCap = ctx.lineJoin = 'round'
  for bin in 0..31 with segments: stroke colour = ramp ? rampColor(base, (bin + 0.5) / 32) : base
       applyStroke({ color: that colour, width, dash, alpha }); beginPath
       for each segment in index order: if its start is not the previous segment's end: moveTo(a); lineTo(b)
       stroke
  if dots: for tk of [0, 0.25, 0.5, 0.75]: z = pointAtT(points, tk); if z: dot of radius (tk == 0 ? 4.5 : 3.2), fill = ramp ? rampColor(base, tk) : base,
           with a 1.5-px ring in --surface (halo circle radius + 1.5 filled first)
  if arrow: last valid segment with pixel length >= 1 -> arrowHead(tip = its end, u = its screen direction, L = 9 + 1.5*width, W = 6 + 1.2*width, colour rampColor(base, 1)); path starts at the tip
  if cursor != null: z = pointAtT(points, clamp(cursor, 0, 1)); ring: --surface circle r 8, fill rampColor(base, cursor) r 6, 2-px --text outline

addLayer(draw, { order = 0 }): rec = { draw, order, seq: layerSeq++, hidden: false, failed: false }; layers.push(rec); layersDirty = true; requestDraw()
  Layer = { order, get/set hidden (-> requestDraw), remove() -> splice rec out, layersDirty = true, requestDraw() }
addCurve(spec): validates spec.id; layer = addLayer((ctx, p) => drawTimedCurve(ctx, p, current.points, current), { order: spec.order ?? 100 }); layer.isCurve = true
  CurveLayer.update(points) stores the new array reference (no copy; callers pass fresh arrays) and requestDraw(); setColor/setCursor/set(patch) likewise.
```

### 5.8 Handles

In this block `hd` is the handle record; `w`, `h` are still the canvas size.

```
addPoint(spec):
  if destroyed: return inert handle
  if spec.id is not a non-empty string or handles.has(spec.id): throw (2.5)
  s = defaults(spec);  hd = { s, z: finiteZ(s.z) ? copy(s.z) : {re: 0, im: 0}, nonFinite: !finiteZ(s.z), userHidden: false,
                              drag: null, inCallback: false, lastLabelAt: 0 }
  create the button exactly as in 4.5; tabIndex = s.focusable ? 0 : -1; button.hidden = hd.userHidden || hd.nonFinite
  style: --hit = max(2*radius + 18, 32) + 'px', --dot = 2*radius + 'px', --handle-color = (color starts with '--' ? `var(${color})` : color)
  listeners on the button (nine, kept in a list so remove() can take them off): pointerdown, pointermove, pointerup, pointercancel, lostpointercapture, keydown, focus, blur, dragstart (preventDefault)
  applyZ(hd, hd.z, true); handlesLayer.appendChild(button); handles.set(s.id, hd); return the Handle object (4.5)

applyZ(hd, z, withLabel):
  hd.z = z; p = toPixel(z); button.style.transform = `translate(${clamp(p.x, -1e5, 1e5)}px, ${clamp(p.y, -1e5, 1e5)}px)`
  dataset.re = String(round6(z.re)); dataset.im = String(round6(z.im))
  if withLabel: setAttribute('aria-label', handleAriaLabel(z, s.name)); hd.lastLabelAt = performance.now()
  requestDraw()
positionHandles(): for hd of handles: applyZ(hd, hd.z, false)          // after any view or size change
   // placeHandle also sets hd.aboveCtrl = (the dot, radius + 6 px, intersects the measured zoom-button rectangle, 4 px padded) and toggles the class `is-above-controls` (z-index 3)

pointerdown(e):  if (e.pointerType == 'mouse' and e.button != 0) or !s.draggable: return
  focus the button ({ preventScroll: true }); button.setPointerCapture(e.pointerId) in try/catch
  rect = canvas.getBoundingClientRect(); k = w / rect.width; c = toPixel(hd.z)
  grab = { dx: (e.clientX - rect.left) * k - c.x, dy: (e.clientY - rect.top) * k - c.y }      // exact: pointer minus the dot's centre
  hd.drag = { id: e.pointerId, start: copy(hd.z), grab }; button.classList.add('is-dragging'); s.onDragStart?.(copy(hd.z))
pointermove(e):  if !hd.drag or e.pointerId != hd.drag.id: return
  rect = canvas.getBoundingClientRect(); k = w / rect.width
  qx = clamp((e.clientX - rect.left) * k - grab.dx, 10, w - 10); qy = clamp((e.clientY - rect.top) * k - grab.dy, 10, h - 10)     // inset: the whole dot stays visible
  z = fromPixel(qx, qy); if s.snap: z2 = s.snap(z); if finiteZ(z2): z = z2
  applyZ(hd, z, performance.now() - hd.lastLabelAt > 150)       // aria-label refreshed at most every 150 ms while dragging
  inCallback = true; s.onDrag(copy(z), { final: false, source: 'pointer' }); inCallback = false
endDrag(e, byEscape):  if !hd.drag: return; release capture (try/catch); button.classList.remove('is-dragging')
  if byEscape: applyZ(hd, hd.drag.start, true) else applyZ(hd, hd.z, true)
  hd.drag = null; inCallback = true; s.onDrag(copy(hd.z), { final: true, source: 'pointer' }); inCallback = false
  announce(button.getAttribute('aria-label'))
  // pointerup, pointercancel and lostpointercapture all call endDrag (the second and third find hd.drag == null and return)
keydown(e): see 2.4 and 5.10 (Escape during a pointer drag calls endDrag(e, true); arrow keys nudge: z' = round9(z + dir * step * mult), then snap)
focus: s.onFocus?.(); ensureVisible(hd)
ensureVisible(hd): p = toPixel(hd.z); margin = DRAG_INSET_PX - 1 = 9      // below the 10 px drag inset, so a handle dragged to the inset is already "visible" and a later focus does not nudge the view
   ddx = p.x < margin ? p.x - margin : p.x > w - margin ? p.x - (w - margin) : 0;  ddy = same with p.y and h
   if ddx or ddy: setViewInternal({ center: { re: center.re + ddx / scale, im: center.im - ddy / scale } }, 'pan')

Handle.z (getter) -> copy(hd.z);   Handle.hidden (getter/setter): hd.userHidden = !!v; button.hidden = hd.userHidden || hd.nonFinite
Handle.set(z, { silent }): if !finiteZ(z): hd.nonFinite = true; button.hidden = true; return
                           hd.nonFinite = false; button.hidden = hd.userHidden; applyZ(hd, copy(z), true)
                           if (!silent and !hd.inCallback) s.onDrag(copy(z), { final: true, source: 'api' })
Handle.remove(): removeEventListener for each of the nine listeners; release pointer capture and drop an unfinished drag (no final callback is sent to a handle that is gone);
                 button.remove(); handles.delete(s.id); if it had focus: el.focus({ preventScroll: true })
announce(text): clearTimeout(timer); timer = setTimeout(() => { status.textContent = ''; status.textContent = text }, 300)
```

### 5.9 Pointer and gestures on the canvas

```
active = new Map()                       // pointerId -> { x, y, type } for pointers that went down on empty canvas
pan = null; gesture = null

pointerdown(e):
  if e.pointerType == 'mouse' and e.button != 0: return
  { px, py } = canvasXY(e)               // (clientX - rect.left) * (w / rect.width), same for y
  if interactive: el.focus({ preventScroll: true })
  try { canvas.setPointerCapture(e.pointerId) } catch {}
  active.set(e.pointerId, { x: px, y: py, type: e.pointerType })
  emit('pointerdown', ev('pointerdown', e, px, py, true))
  if drawMode or !interactive: return
  if e.pointerType != 'touch' and active.size == 1: pan = { id: e.pointerId, x0: px, y0: py, center0: copy(center), moved: false }
  else if e.pointerType == 'touch' and count of touch pointers in `active` == 2:
        a, b = the two touches; gesture = { d0: dist(a, b), mid0: midpoint(a, b), view0: getView() }; pan = null
pointermove(e):
  { px, py } = canvasXY(e); p = active.get(e.pointerId)
  if p: p.x = px; p.y = py
  if gesture and p: a, b = the two touches; f = dist(a, b) / gesture.d0; mid = midpoint(a, b)
        v = zoomView(gesture.view0, w, h, f, gesture.mid0.x, gesture.mid0.y, limits)                       // zoom about the ORIGINAL midpoint
        setViewInternal({ center: { re: v.center.re - (mid.x - gesture.mid0.x) / (w / v.unitsAcross), im: v.center.im + (mid.y - gesture.mid0.y) / (w / v.unitsAcross) }, unitsAcross: v.unitsAcross }, 'zoom')
  else if pan and e.pointerId == pan.id:
        dx = px - pan.x0; dy = py - pan.y0; if !pan.moved and hypot(dx, dy) < 3: skip; pan.moved = true; el.classList.add('is-panning')
        setViewInternal({ center: { re: pan.center0.re - dx / scale, im: pan.center0.im + dy / scale } }, 'pan')
  if p or listeners.pointermove.size: emit('pointermove', ev('pointermove', e, px, py, !!p))
pointerup / pointercancel / lostpointercapture(e):
  { px, py } = canvasXY(e); p = active.get(e.pointerId); if !p: return    // the press did not start on empty canvas (or was already ended)
  active.delete(e.pointerId); release capture (try/catch)
  if pan and pan.id == e.pointerId: pan = null; el.classList.remove('is-panning')
  if gesture and (fewer than 2 touches remain): gesture = null
  kind = e.type == 'pointerup' ? 'pointerup' : 'pointercancel'              // lostpointercapture is reported as pointercancel, once
  emit(kind, ev(kind, e, px, py, false))
ev(kind, e, px, py, dragging) = { type: kind, z: fromPixel(px, py), px, py, pointerType: e.pointerType, pointerId: e.pointerId, isPrimary: e.isPrimary, dragging, originalEvent: e }
setDrawMode(on): drawMode = !!on; el.classList.toggle('is-drawing', drawMode); if on: pan = null; gesture = null
```

### 5.10 Wheel and keyboard on the plane

```
wheel(e):  (listener on el, { passive: false })
  if !interactive or e.target.closest('.plane-controls'): return
  allowed = wheelMode == 'always' or (wheelMode != 'off' and (e.ctrlKey or e.metaKey or (wheelMode == 'focus' and el.contains(document.activeElement))))
  if !allowed: return                                      // do NOT preventDefault: the page scrolls as usual
  e.preventDefault()
  dy = clamp(e.deltaY * (e.deltaMode == 1 ? 16 : e.deltaMode == 2 ? 400 : 1), -400, 400)
  factor = clamp(exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), 1 / 1.5, 1.5)    // wheel up (dy < 0) zooms in; one 100-px notch is about x1.16; one Ctrl+wheel notch is capped at x1.5
  { px, py } = canvasXY(e); zoomAbout(factor, px, py, 'zoom')

keydown(e):  (listener on el; handle keydown has already consumed arrows with stopPropagation)
  if !interactive or e.ctrlKey or e.metaKey or e.defaultPrevented: return
  onPlane = (e.target == el)
  key '+' or '=':  zoomAbout(1.25, w/2, h/2, 'zoom');  announceView()
  key '-' or '_':  zoomAbout(1/1.25, w/2, h/2, 'zoom');  announceView()
  key '0' or 'Home': resetView(); announceView()
  arrows (only if onPlane): f = e.shiftKey ? 0.5 : 0.1; dRe = f * unitsAcross; dIm = f * unitsAcross * h / w
        Right: center.re += dRe; Left: -= dRe; Up: center.im += dIm; Down: -= dIm  -> setViewInternal(..., 'pan'); announceView()
  every handled key: e.preventDefault()
announceView(): announce(`View: centre ${cartText(center)}, ${formatNumber(unitsAcross)} units across.`)      // cartText as in handleAriaLabel
```

### 5.11 Events, theme hub, registry, destroy

```
on(type, cb): if type not in listeners: throw TypeError(`plane.on: unknown event "${type}"`); listeners[type].add(cb); return () => listeners[type].delete(cb)
emit(type, payload): for cb of [...listeners[type]]: try { cb(payload) } catch (err) { console.error(`plane "${id}": ${type} listener threw`, err) }

themeHub (module level, shared):  planes = new Set(); attach() when planes.size becomes 1; detach() when it becomes 0
  signal(): colorCache.clear(); probeCache.clear(); for p of planes: p.requestDraw()
  attach: document.addEventListener('themechange', signal);
          new MutationObserver(signal).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
          matchMedia('(prefers-color-scheme: dark)').addEventListener('change', signal)
  detach: reverses all three

destroy(): if destroyed: return; destroyed = true; cancelAnimationFrame(rafId); resizeObserver.disconnect(); window.removeEventListener('resize', ...);
  remove every listener added on el (wheel, keydown, capture keydown, focusout), the canvas (five pointer listeners) and the three zoom buttons (click);
  for h of [...handles.values()]: h.remove(); layers = []; clear listeners; themeHub.planes.delete(plane) (detach hub if empty);
  el.remove(); if (window.__mv.planes.get(id) === plane) window.__mv.planes.delete(id); stats.destroyed = true
  every public method begins with `if (destroyed) return <inert>`
```

### 5.12 `tests/interact/_helpers.mjs`

No imports (Playwright's `page` is always passed in), so Node unit tests can import the pure functions here. Every
`page.evaluate` callback is self-contained.

```js
export function planeIdOfHandle(handleId) {            // pure: 'home-demo-plane-z' -> 'home-demo-plane'
  const i = handleId.lastIndexOf('-'); if (i <= 0) throw new Error(`planeIdOfHandle: "${handleId}" has no "-segment"`);
  return handleId.slice(0, i);
}
const asZ = (z) => typeof z === 'number' ? { re: z, im: 0 } : { re: Number(z.re), im: Number(z.im ?? 0) };

export async function settle(page, frames = 2) {       // wait for N animation frames (explainers update once per frame); capped at 250 ms
  await page.evaluate((n) => new Promise((res) => { let k = 0; const t = setTimeout(res, 250);
    const step = () => { if (++k >= n) { clearTimeout(t); res(); } else requestAnimationFrame(step); }; requestAnimationFrame(step); }), frames);
}

export async function planePixel(page, planeId, z) {    // viewport coordinates (what page.mouse wants) of plane point z
  z = asZ(z);
  const r = await page.evaluate(({ planeId, z }) => {
    const planes = window.__mv && window.__mv.planes; const p = planes && planes.get(planeId);
    if (!p) return { error: `no plane "${planeId}" in window.__mv.planes (have: ${planes ? [...planes.keys()].join(', ') : 'none'})` };
    p.canvas.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });     // the page may use smooth scrolling
    const rect = p.canvas.getBoundingClientRect(), q = p.toPixel(z);
    return { x: rect.left + q.x, y: rect.top + q.y, vw: window.innerWidth, vh: window.innerHeight };
  }, { planeId, z });
  if (r.error) throw new Error(r.error);
  if (r.x < 0 || r.y < 0 || r.x > r.vw || r.y > r.vh) throw new Error(`planePixel: (${z.re}, ${z.im}) on "${planeId}" is at (${r.x.toFixed(1)}, ${r.y.toFixed(1)}), outside the ${r.vw}x${r.vh} viewport`);
  return { x: r.x, y: r.y };
}

export async function handleZ(page, handleId) {         // { re, im } read from the button's data-re / data-im
  return page.evaluate((id) => { const el = document.getElementById(id); if (!el) throw new Error(`no element #${id}`);
                                 return { re: Number(el.dataset.re), im: Number(el.dataset.im) }; }, handleId);
}
export async function readHandleLabel(page, handleId) { // the button's aria-label
  return page.evaluate((id) => document.getElementById(id).getAttribute('aria-label'), handleId);
}
async function planeIdFor(page, handleId) {              // D8: the DOM first, string slicing second
  const fromDom = await page.evaluate((id) => { const el = document.getElementById(id); const pl = el && el.closest('.plane'); return pl ? pl.dataset.planeId : null; }, handleId);
  return fromDom || planeIdOfHandle(handleId);
}

export async function dragHandle(page, handleId, z, { steps = 12 } = {}) {      // acceptance A5; returns the handle's final { re, im }
  z = asZ(z);
  const loc = page.locator(`[id="${handleId.replace(/"/g, '\\"')}"]`);
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  const planeId = await planeIdFor(page, handleId);
  const target = await planePixel(page, planeId, z);       // scrolls the canvas to the middle of the viewport, THEN measures
  const box = await loc.boundingBox();                      // viewport coordinates, measured after that scroll (no scroll in between)
  if (!box) throw new Error(`dragHandle: #${handleId} has no bounding box`);
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };   // the hit area's centre is the dot's centre (design 4.5)
  const covered = await page.evaluate(({ x, y, id }) => { const top = document.elementFromPoint(x, y), el = document.getElementById(id);
      return top && !el.contains(top) ? `${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}` : null; }, { x: from.x, y: from.y, id: handleId });
  if (covered) throw new Error(`dragHandle: #${handleId} is covered by ${covered}`);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: Math.max(1, steps) });
  await page.mouse.up();
  await settle(page);
  return handleZ(page, handleId);
}

export async function dragHandleAround(page, handleId, { center = { re: 0, im: 0 }, radius = 1.5, startAngle = 0, turns = 1, steps = 48 } = {}, onStep) {
  // ONE continuous mouse-down: grab the handle, move to the start point, walk around the circle, release.
  //   total = max(1, round(|turns| * steps));  angle_i = startAngle + sign(turns) * 2*pi*|turns| * i / total,  i = 0..total
  //   planeId = await planeIdFor(...); o = await planePixel(page, planeId, {re: 0, im: 0}); u = await planePixel(page, planeId, {re: 1, im: 0});
  //   scale = u.x - o.x;  pixel of z = { x: o.x + scale * z.re, y: o.y - scale * z.im }   (the view does not change during a handle drag)
  //   box = await loc.boundingBox() after those calls; mouse.move(box centre); mouse.down(); mouse.move(pixel of the start point, { steps: 8 });
  //   i = 0: await settle(page, 1); await onStep?.(page, angle_0, 0)
  //   i = 1..total: mouse.move(pixel of the point at angle_i); await settle(page, 1); await onStep?.(page, angle_i, i)
  //   try { ... } finally { await page.mouse.up(); await settle(page); }      // never leave the button pressed if onStep throws
  //   returns the handle's final { re, im }
}

export async function clickChip(page, id) {
  const loc = page.locator(`[id="${id.replace(/"/g, '\\"')}"]`);
  await loc.scrollIntoViewIfNeeded({ timeout: 5000 }); await loc.click({ timeout: 5000 }); await settle(page);
}
export async function readText(page, selector) {       // trimmed textContent of the first match ('' if absent)
  return page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.trim() : ''; }, selector);
}
export async function setSlider(page, id, value) {      // returns the value the control actually took (ranges clamp and snap to step)
  const actual = await page.evaluate(({ id, value }) => {
    const el = document.getElementById(id); if (!el) throw new Error(`no element #${id}`);
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    return Number(el.value);
  }, { id, value });
  await settle(page); return actual;
}

// pure text helpers for assertions (Node-importable; verified against the cases in 7.1, U19)
export function nums(text) { return (String(text).match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || []).map(Number); }
export function parseCart(text) {              // "5 + 14i", "-0.5 - i", "2i", "-i", "i", "3", "3 - 2i", "1.5e-3 + 2i" -> { re, im }; ASCII only; null if it does not parse
  const s = String(text).replace(/\s+/g, '');
  if (!s) return null;
  let split = -1;                              // the last + or - that is not the leading sign and does not follow an exponent 'e'
  for (let i = s.length - 1; i > 0; i--) if ((s[i] === '+' || s[i] === '-') && !/[eE]/.test(s[i - 1])) { split = i; break; }
  const pureNum = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
  const coef = (t) => (t === '' || t === '+' ? 1 : t === '-' ? -1 : Number(t));
  if (split < 0) {
    if (s.endsWith('i')) { const co = s.slice(0, -1); return (co === '' || co === '+' || co === '-' || pureNum.test(co)) ? { re: 0, im: coef(co) } : null; }
    return pureNum.test(s) ? { re: Number(s), im: 0 } : null;
  }
  const a = s.slice(0, split), b = s.slice(split);
  if (!b.endsWith('i') || !pureNum.test(a)) return null;
  const co = b.slice(0, -1);
  return (co === '+' || co === '-' || pureNum.test(co)) ? { re: Number(a), im: coef(co) } : null;
}
```

### 5.13 Hit testing and z-order

There is no canvas hit-testing code. The browser does it:

1. **Handles** are DOM buttons above the canvas, so a press on a dot (or its 32/44-px hit area) goes to the button and never to the
   canvas. `.plane-handles` has `pointer-events: none`; each button has `pointer-events: auto`; label spans are `none`.
2. **Empty space** is whatever reaches the canvas. The controls column and the live region are siblings of the canvas, so presses on
   them do not reach it either.
3. **Overlap.** Handles stack in creation order; the focused or dragged one, and any handle whose dot is under or against the zoom buttons (`is-above-controls`), is raised to `z-index: 3`, above the buttons (2). Two handles at the same point:
   the later one is grabbed first (drag it away to reach the other, or Tab to it).
4. The test helper checks `document.elementFromPoint` at the handle's centre before pressing, so a covering element fails loudly.

> Superseded in residue cleanup: handles are at `100 + 10 * zOrder` (plus 5 when focused or dragged, inside their own tier), the zoom buttons at 500, a handle that overlaps the buttons (`is-above-controls`) at `1000 + 10 * zOrder`, the note at 2000, and `.plane` is its own stacking context (`isolation: isolate`). The numbers 1, 2 and 3 above are the old ones.

### 5.14 Animation timing

The plane runs no animation of its own. The only timers: `requestAnimationFrame` for coalesced redraws; a 150 ms throttle on
`aria-label` refresh during a pointer drag; a 300 ms debounce on live-region announcements. Stations animate by calling
`CurveLayer.setCursor(t)` or their own layers inside their own rAF loops (guarded by `prefersReducedMotion()`); the plane just repaints.

---

## 6. Mathematics

### 6.1 Formulas the plane uses

- **M1 view transform.** `s = w / unitsAcross`; `x = w/2 + (re - c_re) s`; `y = h/2 - (im - c_im) s`. Inverse: `re = c_re + (x - w/2)/s`,
  `im = c_im - (y - h/2)/s`. Visible half-extents: `unitsAcross/2` horizontally, `h/(2s)` vertically.
- **M2 zoom about an anchor.** With `z_a = fromPixel(px, py)` before and `u' = clamp(u / factor)`, `s' = w / u'`: `c'_re = z_a.re - (px - w/2)/s'`,
  `c'_im = z_a.im + (py - h/2)/s'`. Then `toPixel'(z_a) = (px, py)`.
- **M3 fit.** Bounding box of the finite points; spans floored at 2 units; `want = span (1 + 2 padding)`;
  `unitsAcross = clamp(max(wantX, wantY · w/h))`; centre = box centre.
- **M4 grid.** `step = niceGridStep(u)`; Cartesian lines at `k·step` for integers `k` with `ceil(xMin/step) <= k <= floor(xMax/step)`;
  polar rings at `r = k·step` between the nearest and farthest distance from 0 to the view rectangle; rays every 30°.
  Guarantee: `5.6 <= u/step <= 14`.
- **M5 the two addresses of one point.** `r = hypot(x, y)`, `theta = Arg z = atan2(y, x)` in `(-pi, pi]` (negative real axis: `+pi`, rounding noise
  included), and back: `x = r cos(theta)`, `y = r sin(theta)`. The point never moves; only the description changes.
- **M6 arg as a set.** `arg z = { theta + 2 pi k : k in Z }`. Ghost k is drawn as an arc from angle 0 to `theta + 2 pi k` (k = 1, 2, ...; and
  `theta - 2 pi k`). All of them end on the same ray, which is the point of the picture: one dot, many names.
- **M7 arc polyline.** For radius `R` px about `(O_x, O_y)` and math angles `phi_j = from + (to - from) j/n`: `x_j = O_x + R cos(phi_j)`,
  `y_j = O_y - R sin(phi_j)` (screen `y` is down); `n = clamp(ceil(|to - from| R / 3), 4, 720)`.
- **M8 arrowhead.** Tip `P`, screen direction `u` (unit): base `B = P - L u`; wings `B ± (W/2) n`, `n = (-u_y, u_x)`.
  Arg-arc end direction (screen): `sgn(theta) (-sin theta, -cos theta)`.
- **M9 time ramp.** `c(t) = (1 - w) base + w ((1 - t) c0 + t c1)`, `w = 0.65`, per channel, in sRGB. Each channel is linear in `t`, so luma
  `0.2126 R + 0.7152 G + 0.0722 B` is **linear in `t`**: strictly monotone whenever `luma(c0) != luma(c1)`, in either theme.
- **M10 time bins.** Segment `i` has `t_mid = (t_i + t_{i+1})/2`; `bin = min(31, floor(32 · clamp(t_mid, 0, 1)))`; colour uses `(bin + 1/2)/32`.
  A 5-point curve with t = 0, 1/4, 1/2, 3/4, 1 uses bins 4, 12, 20, 28.
- **M11 interpolation by t.** `z(t) = z_i + (t - t_i)/(t_{i+1} - t_i) (z_{i+1} - z_i)` on the first segment containing `t`.
- **M12 handle drag.** `grab = pointer - toPixel(z)` at press; `z = fromPixel(clamp(pointer - grab, [10, w - 10] x [10, h - 10]))`.
- **M13 pan and pinch.** Pan by `(dx, dy)` px: `c_re -= dx/s`, `c_im += dy/s`. Pinch: zoom factor `d/d_0` about the initial midpoint, then translate by
  the midpoint's movement.
- **M14 wheel.** `factor = exp(-dy k)`, `k = 0.0015` (0.01 with Ctrl); `dy` clamped to ±400; the factor is clamped to [1/1.5, 1.5] per event. One 100-px notch is about ×1.16; a Ctrl+wheel notch is ×1.5, not ×2.7.
- **M15 hit size.** `max(2 radius + 18, 32)` px (44 on coarse pointers); dot diameter `2 radius`.

> Superseded in residue cleanup: `w` is 0.4 now (`RAMP_WEIGHT`); `rampColor(base, t, weight)` and `drawTimedCurve({ rampWeight })` take any weight from 0 to 1.

### 6.2 The two addresses in the plane's own words (what a handle announces)

A handle at `z = x + iy` announces `z = x + yi; r = sqrt(x^2 + y^2), θ = Arg z`. Example: `z = 2 + i` announces
`r = 2.236, θ = 0.464` (`sqrt 5 = 2.236068`, `atan2(1, 2) = 0.463648`); `z = -1 + i sqrt 3` announces `r = 2, θ = 2.094 (2π/3, Arg)`.

### 6.3 Worked review problems, both addresses

Test geometry used for pixel numbers: **G600** = `makeTransform({center: 0, unitsAcross: 8}, 800, 600)` (scale 100, origin pixel (400, 300)) and
**G800** = the same with height 800 (origin (400, 400)). All values below were recomputed by script.

**1.1.1** Let z₁ = 3 − 2i, z₂ = −1 + 4i. Compute z₁z₂ and z₁/z₂ in the form x + iy.
- Cartesian (the address where the answer is asked): `z1 z2 = (3·(-1) - (-2)·4) + i(3·4 + (-1)(-2)) = (-3 + 8) + i(12 + 2) = 5 + 14i`.
  `z1/z2 = z1 conj(z2) / abs(z2)^2 = (3 - 2i)(-1 - 4i)/17 = (-3 - 12i + 2i + 8 i^2)/17 = (-11 - 10i)/17 = -11/17 - (10/17) i = -0.647059 - 0.588235i`.
- Polar: `z1 = sqrt13 e^{i(-0.588003)}` (r = 3.605551, Arg = −33.690°); `z2 = sqrt17 e^{i 1.815775}` (r = 4.123106, Arg = 104.036°).
  Product: `r = sqrt13 sqrt17 = sqrt221 = 14.866069`, `Arg = -0.588003 + 1.815775 = 1.227772` (70.346°, already in (−π, π], no wrap).
  Quotient: `r = sqrt(13/17) = 0.874475`, `Arg = -0.588003 - 1.815775 = -2.403778` (−137.726°, no wrap).
- Same point: `14.866069 (cos 1.227772 + i sin 1.227772) = 5 + 14i`; `0.874475 (cos(-2.403778) + i sin(-2.403778)) = -0.647059 - 0.588235i`. ✓
- Which address is easier: the product and quotient are asked as x + iy, so Cartesian is two lines; the polar column is the check (`abs(z1 z2) = abs z1 abs z2`).
- Plane scene: handles z₁ (G800 pixel (700, 600)), z₂ (300, 0), both address overlays; `fitView([3−2i, −1+4i, 5+14i], 800, 800)` = centre `2 + 6i`, `unitsAcross` 20.8.

**1.1.2** Find Im(conj(z₁ − z₂)) for z₁ = 3 − 2i, z₂ = −1 + 4i.
- Cartesian: `z1 - z2 = (3 + 1) + (-2 - 4) i = 4 - 6i`; `conj = 4 + 6i`; `Im = 6`.
- Polar: `z1 - z2 = sqrt52 e^{i(-0.982794)}` (r = 7.211103, Arg = −56.310°); conjugation is the mirror: same r, `Arg = +0.982794`;
  `Im = r sin(theta) = 7.211103 · 0.832050 = 6`.
- Plane scene: z and its mirror, `fitView([3−2i, −1+4i, 4−6i, 4+6i], 800, 800)` = centre `1.5 + 0i`, `unitsAcross` 15.6.

**P1, P2** (proofs; numeric spot-checks of the mirror). z₁ = 3 − 2i, z₂ = −1 + 4i.
- P1 Cartesian: `conj z1 conj z2 = (3 + 2i)(-1 - 4i) = -3 - 12i - 2i - 8 i^2 = 5 - 14i`; `conj(z1 z2) = conj(5 + 14i) = 5 - 14i`. Equal. Polar: conjugation negates every angle and keeps every radius, so `(r1, -t1)·(r2, -t2) = (r1 r2, -(t1 + t2))`.
- P2 Cartesian: `z1 conj z1 = (3 - 2i)(3 + 2i) = 9 + 4 = 13`, `sqrt13 = 3.605551 = abs z1`. Polar: `r e^{it} · r e^{-it} = r^2`.
- Plane scene: `z1` with `r = 3.605551, Arg = -0.588003` and its mirror with `Arg = +0.588003` (same r).

**1.2.1** Sketch |z − (1 + 2i)| = 3.
- Cartesian: `(x - 1)^2 + (y - 2)^2 = 9`: centre (1, 2), radius 3. Points: `4 + 2i, 1 + 5i, -2 + 2i, 1 - i`.
- Polar (about the centre): `z = (1 + 2i) + 3 e^{iφ}`, `φ = 0, π/2, π, 3π/2` give the same four points. About the origin, the centre has address `r = sqrt5 = 2.236068, Arg = 1.107149`
  (63.435°); `r^2 - 2 sqrt5 r cos(θ - 1.107149) - 4 = 0`, so `r(θ) = sqrt5 cos(θ - α) + sqrt(5 cos^2(θ - α) + 4)`: farthest `sqrt5 + 3 = 5.236068` at θ = α, nearest `3 - sqrt5 = 0.763932` at θ = α + π. The origin is inside (sqrt5 < 3).
- Plane scene: `drawCircle(center 1+2i, 3)`; `fitView([4+2i, −2+2i, 1+5i, 1−i], 800, 800)` = centre `1 + 2i`, `unitsAcross` 7.8, so the circle has radius 3 · (800/7.8) = 307.69 px and its centre is at pixel (400, 400).

**1.2.2** Distance between 4 + 3i and −1 + i.
- Cartesian: `z1 - z2 = 5 + 2i`, `abs = sqrt(25 + 4) = sqrt29 = 5.385165`.
- Polar: `z1 = 5 e^{i 0.643501}` (3-4-5), `z2 = sqrt2 e^{i 3π/4}`; angle between them `3π/4 - 0.643501 = 1.712693`; law of cosines
  `d^2 = 25 + 2 - 2·5·sqrt2·cos(1.712693) = 27 - 14.142136·(-0.141421) = 27 + 2 = 29`. (The slide `5 + 2i` itself has `Arg = 0.380506`, 21.801°.)
- Plane scene: `drawSegment` from G800 pixel (800, 100) to (300, 300); `fitView([4+3i, −1+i], 800, 800)` = centre `1.5 + 2i`, `unitsAcross` 6.5.

**1.3.1** z = −1 + i√3 in polar and exponential form; Arg z.
- Cartesian address: `(x, y) = (-1, 1.732051)`; drop lines to `x = -1` and `y = 1.732051`.
- Polar address: `r = sqrt(1 + 3) = 2`; `Arg z = atan2(sqrt3, -1) = 2π/3 = 2.094395` (120°; check `2 cos(2π/3) = -1`, `2 sin(2π/3) = sqrt3`).
  `z = 2(cos 2π/3 + i sin 2π/3) = 2 e^{i 2π/3}`.
- arg z = `{ 2π/3 + 2πk }` = `..., -10π/3, -4π/3, 2π/3, 8π/3, 14π/3, ...`; Arg z = `2π/3` is the one in (−π, π].
- G600 pixels: z at (300, 126.7949); foot on Re axis (300, 300); foot on Im axis (400, 126.7949); origin (400, 300); ray length 200 px.
  Overlay geometry (arcRadiusPx 28): Arg arc from (428, 300) to (386, 275.7513); first ghost (radius 35, sweep 0 to 8π/3) ends at (382.5, 269.6891); the `-4π/3` ghost
  (radius 35 as the only ghost) ends at the same point. Labels: `x = -1` at (300, 314), `y = 1.732` at (408, 126.7949), `r = 2` at (329.0808, 225.4752) (the ray's midpoint (350, 213.3975) plus 24.1554 px along (-0.866, 0.5); it was 11 px, (340.4737, 218.8975), with the ray running through the word),
  `Arg z = 2π/3` at (424.5, 257.5648), `also 8π/3` at (424.5, 271.5648).

**1.3.2** Use polar form to compute (√3 + i)^10, in x + iy.
- Polar: `√3 + i = 2 e^{iπ/6}`; `(√3 + i)^10 = 2^10 e^{i 10π/6} = 1024 e^{i 5π/3}`; `5π/3` is not in (−π, π]: subtract 2π, `Arg = -π/3`. So
  `1024 (cos(-π/3) + i sin(-π/3)) = 1024 (1/2 - i √3/2) = 512 - 512 √3 i = 512 - 886.810013i`.
- Cartesian check: `(√3 + i)^2 = 2 + 2√3 i`; `^4 = -8 + 8√3 i`; `^8 = -128 - 128√3 i`; `^10 = ^8 · ^2 = (-256 + 768) + (-256√3 - 256√3) i = 512 - 512√3 i`. ✓
- The spiral the plane draws (point k is `2^k e^{ikπ/6}`, Arg on the home step): k = 1: `1.7321 + 1i` (r 2, π/6); 2: `2 + 3.4641i` (r 4, π/3); 3: `0 + 8i` (r 8, π/2);
  4: `-8 + 13.8564i` (r 16, 2π/3); 5: `-27.7128 + 16i` (r 32, 5π/6); 6: `-64 + 0i` (r 64, π); 7: `-110.8513 - 64i` (r 128, −5π/6, since 7π/6 wraps);
  8: `-128 - 221.7025i` (r 256, −2π/3); 9: `0 - 512i` (r 512, −π/2); 10: `512 - 886.81i` (r 1024, −π/3).

**1.5.1** A parameterisation of the line from 2 + i to −3 − 3i.
- Cartesian: `z(t) = (2 + i) + t((-3 - 3i) - (2 + i)) = (2 - 5t) + i(1 - 4t)`, `0 <= t <= 1`; `x = 2 - 5t`, `y = 1 - 4t`; eliminating t: `y = (4x - 3)/5`.
  Samples: t = 0: `2 + i`; 0.25: `0.75 + 0i`; 0.5: `-0.5 - i`; 0.75: `-1.75 - 2i`; 1: `-3 - 3i`.
- Polar (a line is not polar-native; the address of each point still exists): `r(t) = sqrt(41 t^2 - 28 t + 5)`, from `sqrt5 = 2.236068` at t = 0 to `sqrt18 = 4.242641` at t = 1, with a minimum
  `3/sqrt41 = 0.468521` at `t = 14/41` (the distance from 0 to the line). `Arg(t) = atan2(1 - 4t, 2 - 5t)`: `0.463648` (t = 0), `0` (t = 0.25), `-2.034444` (t = 0.5), `-2.289626` (0.75), `-3π/4 = -2.356194` (t = 1);
  `d Arg/dt = -3/r^2 < 0`, so the angle decreases steadily and the path never crosses the negative real axis (no seam crossing).
- G800 pixels at t = 0, 0.25, 0.5, 0.75, 1: (600, 300), (475, 400), (350, 500), (225, 600), (100, 700): the quarter dots; the arrowhead tip is at (100, 700),
  its screen direction is `(-125, 100)/160.078 = (-0.7809, 0.6247)`.

**1.5.2** S = { 1 < |z + i| ≤ 3 }: open, closed or neither; bounded; boundary; domain?
- Cartesian: `1 < x^2 + (y + 1)^2 <= 9`. Polar (about the centre −i, the native address): `z = -i + ρ e^{iφ}`, `1 < ρ <= 3`, φ free: an annulus, a polar rectangle.
- Test points (value of `abs(z + i)`): `2i` → 3 (in S); `-4i` → 3 (in S); `3 - i` → 3 (in S); `0` → 1 (not in S, boundary); `-2i` → 1 (not in S, boundary); `-i` → 0 (in the hole, not in S).
- Answers: not open (the outer-circle points are in S but every disk around them leaves S), not closed (the inner-circle points are boundary points not in S), so **neither**; bounded (S lies inside |z + i| ≤ 3);
  boundary = `{ |z + i| = 1 } ∪ { |z + i| = 3 }`; connected but not open, so **not a domain** (it is a region).
- Plane scene: outer `drawCircle(−i, 3)` solid (included), inner `drawCircle(−i, 1, {dash: DASH.excluded})` (excluded), fill with `innerRadius: 1`;
  `fitView([3−i, −3−i, 2i, −4i], 800, 800)` = centre `-i`, `unitsAcross` 7.8; centre pixel (400, 400), outer radius 307.69 px, inner radius 102.56 px.

**2.1.1** f(z) = z² + iz as u + iv and as u(r, θ) + iv(r, θ).
- Cartesian: `z^2 = x^2 - y^2 + 2xy i`, `iz = -y + ix`: `u = x^2 - y^2 - y`, `v = 2xy + x`.
- Polar: `z^2 = r^2 e^{2iθ}`, `iz = r e^{i(θ + π/2)} = r(-sin θ + i cos θ)`: `u = r^2 cos 2θ - r sin θ`, `v = r^2 sin 2θ + r cos θ`.
- At `z = 1 + i`: Cartesian `u = 1 - 1 - 1 = -1`, `v = 2 + 1 = 3`; polar `r = sqrt2, θ = π/4`: `u = 2·0 - sqrt2·(sqrt2/2) = -1`, `v = 2·1 + sqrt2·(sqrt2/2) = 3`. Same point `w = -1 + 3i` (r = 3.162278, Arg = 1.892547).
  Also `z = i`: `(u, v) = (-2, 0)`; `z = 1`: `(1, 1)`; `z = 2 + i`: `(2, 6)`.
- Plane scene: z-plane dot at 1 + i (G800 pixel (500, 300)) and w-plane dot at −1 + 3i.

**2.1.2** Image of the vertical line x = 2 under w = z².
- Cartesian: `z = 2 + iy`, `w = (4 - y^2) + 4y i`; `u = 4 - y^2`, `v = 4y`; eliminate y: `u = 4 - v^2/16` (a parabola opening left, vertex 4, i.e. `v^2 = -16(u - 4)`, focus at `4 - 4 = 0`).
- Polar: `z = r e^{iθ}` with `r = sqrt(4 + y^2)`, `θ = atan(y/2)` goes to `|w| = 4 + y^2`, `Arg w = 2θ`. About the focus 0 the parabola is `ρ = 8/(1 + cos φ)`. Check `y = 1`: `r = sqrt5, θ = 0.463648` to `|w| = 5`, `Arg w = 0.927295`: `5(0.6 + 0.8i) = 3 + 4i` (and `ρ = 8/1.6 = 5`). ✓
- Samples (y, w): −4 → `-12 - 16i`; −2 → `0 - 8i`; 0 → `4`; 1 → `3 + 4i`; 2 → `0 + 8i`; 4 → `-12 + 16i`. Time runs upward on the line (y from −4 to 4) and along the parabola from `-12 - 16i` to `-12 + 16i` with the same ramp.
- Plane scene: z-plane `fitView([2−4i, 2+4i], 800, 800)` = centre `2`, `unitsAcross` 10.4; w-plane `fitView([-12−16i, -12+16i, 4], 800, 800)` = centre `-4`, `unitsAcross` 41.6.

**2.1.3** Image of x = 2 under f(z) = iz − 2i; what the map does.
- Cartesian: `z = 2 + iy`; `iz = 2i - y`; `f = -y + 2i - 2i = -y`: real, so the image is the real axis `v = 0` (time reversed: y from −4 to 4 gives w from 4 to −4). In general `f` rotates the plane by 90° and slides it down by 2.
- Polar: `a = i = 1·e^{iπ/2}` (stretch 1, spin 90°), `b = -2i = 2 e^{-iπ/2}`. `i·z` adds π/2 to every angle: the line `x = 2` (distance 2 from 0) turns into the horizontal line `Im = 2`; then the slide `-2i` drops it onto the real axis.
  Sample `z = 2 + 3i` (r = 3.605551, Arg = 0.982794): `i z = -3 + 2i` (same r, Arg = 2.553590), `f = -3`. ✓
- Samples (y, w): −4 → `4`; 0 → `0`; 3 → `-3`; 4 → `-4`.
- Plane scene: z-plane stroke x = 2 and w-plane stroke on the real axis, same ramp (dark end at 4, bright end at −4); `fitView([4, -4], 800, 800)` = centre 0, `unitsAcross` 10.4.

---

## 7. Verification plan

Commands run from the repo root. The unit test file and the interaction script are written by the builder from this section.

### 7.1 Unit tests: `tests/unit/i1-core-plane.test.mjs` (acceptance A1, plus pure-logic coverage)

`node --test tests/unit/i1-core-plane.test.mjs` (and `npm test`, which includes it). Comparisons use `assert.ok(Math.abs(a - b) < tol)` with `tol = 1e-9`
unless a looser tolerance is stated. The module is imported at the top of the test with a normal static `import`; the import itself must succeed in Node.

| id | Subject | Cases and expected values |
|---|---|---|
| U1 | `makeTransform`, centre 0 (A1) | `T = makeTransform({center:{re:0,im:0}, unitsAcross:8}, 800, 600)`: `T.scale = 100`; `toPixel({0,0}) = {x:400, y:300}`; `toPixel({4,0}) = {800, 300}`; `toPixel({0,3}) = {400, 0}`; `toPixel({-4,-3}) = {0, 600}`; `toPixel({2.5,-1.25}) = {650, 425}`; `fromPixel(400,300) = {0,0}`; `fromPixel(800,0) = {4,3}` |
| U2 | `makeTransform`, centre {1,1} (A1) | `makeTransform({center:{re:1,im:1}, unitsAcross:8}, 800, 600)`: `toPixel({1,1}) = {400,300}`; `toPixel({0,0}) = {300,400}`; `toPixel({2,2}) = {500,200}`; `fromPixel(400,300) = {1,1}`. And `makeTransform({center:0, unitsAcross:2}, 400, 400).scale = 200` |
| U3 | round trip and both call forms (A1) | `p = T.toPixel({re:2.5,im:-1.25})`: `T.fromPixel(p.x, p.y)` and `T.fromPixel(p)` both equal `{re:2.5, im:-1.25}` |
| U4 | `mixColor` (A1) | `("#000000","#ffffff",0.5)` is `"rgb(128, 128, 128)"` (127 also accepted by the test); t = 0 gives `"rgb(0, 0, 0)"`; t = 1 gives `"rgb(255, 255, 255)"`; `("#ff0000","#0000ff",0.25) = "rgb(191, 0, 64)"`; `("rgb(10, 20, 30)","rgb(30, 40, 50)",0.5) = "rgb(20, 30, 40)"`; `("#fff","#000",1) = "rgb(0, 0, 0)"`; t = −1 gives the first colour `("#102030",…) = "rgb(16, 32, 48)"`; t = 2 gives the second `"rgb(255, 255, 255)"` |
| U5 | `niceGridStep` (A1) | 8 gives 1; 80 gives 10; 2 gives 0.2 (the test accepts 0.2 or 0.5); 4 gives 0.5; 16 gives 2; 20 gives 2; 30 gives 5; 0.5 gives 0.05; 200 gives 20; 12 gives 2; 6 gives 1; 3 gives 0.5; 100 gives 10; 40 gives 5 |
| U6 | `niceGridStep` properties | for `u = 0.1, 0.47, 0.84, ...` up to 300 (step 0.37): non-decreasing, and `5.6 <= u / niceGridStep(u) <= 14.01` |
| U7 | `internals.parseColor` | `"#1a2b3c"` is `{r:26,g:43,b:60,a:1}`; `"rgb(1 2 3 / 50%)"` is `{1,2,3,a:0.5}`; `"hsl(120 100% 50%)"` is `{0,255,0,1}` within 1e-6; `"#11223344"` has `a = 0.2667` within 1e-3; `"rebeccapurple"` is `null` (browser-only) |
| U8 | `internals.rampMix` | `("#ff0000","#000000","#ffffff", 0) = "rgb(89, 0, 0)"`; `0.5` gives `"rgb(172, 83, 83)"`; `1` gives `"rgb(255, 166, 166)"`. Luma `0.2126R+0.7152G+0.0722B` of `rampMix("#2563eb","#101828","#f8fafc", i/10)` is strictly increasing for i = 0..10 |
| U9 | `internals.formatNumber` | `2 → "2"`; `-0 → "0"`; `1.7320508075688772 → "1.732"`; `0.1+0.2 → "0.3"`; `-1.5 → "-1.5"`; `1e-7 → "0"`; `2.236067977 → "2.236"`; `1234.5678 → "1234.568"`; `-0.0004 → "0"`; `NaN → "NaN"` |
| U10 | `internals.formatAngle` | `2π/3 → "2π/3"`; `-π/3 → "-π/3"`; `π → "π"`; `-π → "-π"`; `0 → "0"`; `atan2(1,2) → "0.464"`; `5π/6 → "5π/6"`; `π/2 → "π/2"`; `8π/3 → "8π/3"`; `-4π/3 → "-4π/3"`; `14π/3 → "14π/3"`; `2π → "2π"`; `25π/12 → "6.545"` (|p| > 24); `atan2(-2,3) → "-0.588"` |
| U11 | `internals.polarOf` | `{-1,0} → {r:1, theta:π}`; `{-1,-0}` (negative zero) `→ theta π`; `{-1,-1e-12} → theta π`; `{-1,1e-12} → theta π`; `{-1,-1e-9} → theta = -3.141592652589793` (the jump is real above the noise floor); `{0,0} → {0,0}`; `{-1,√3} → {2, 2.0943951023931957}`; `{3,-2} → {3.605551275, -0.588002604}`; `{0,-1} → {1, -π/2}`; `{1,-1e-14} → theta -1e-14` |
| U12 | `internals.visibleBounds`, `zoomView` | bounds of centre 0, 8, 800x600: `x ∈ [-4,4]`, `y ∈ [-3,3]`. `zoomView(view0, 800, 600, 2, 600, 300)` = `{center:{re:1,im:0}, unitsAcross:4}` and `makeTransform(that).toPixel({2,0}) = {600,300}`. Factor 1.25 about (400,300): `unitsAcross 6.4`, centre 0. Factor 0.5 about (200,150): `unitsAcross 16`, centre `{2,-1.5}`, and the point `{-2,1.5}` still maps to (200,150). Clamp: `unitsAcross 190` with factor 0.5 gives 200; `0.6` with factor 2 gives 0.5 |
| U13 | `internals.fitView` | `[{-2,-1},{2,1}]`, 800x600, 0.15 → `{center:{0,0}, unitsAcross:5.2}`; `[{3,-1}]` → centre `{3,-1}`, `3.4666667` (spans floored at 2); `[]` → `null`; `[{-3,-3},{2,1}]`, 800x800 → centre `{-0.5,-1}`, `6.5`; non-finite points ignored; problem scenes: 1.1.1 → centre `{2,6}`, 20.8; 1.1.2 → `{1.5,0}`, 15.6; 1.2.1 → `{1,2}`, 7.8; 1.2.2 → `{1.5,2}`, 6.5; 1.5.1 → `{-0.5,-1}`, 6.5; 1.5.2 → `{0,-1}`, 7.8; 2.1.2 w-plane → `{-4,0}`, 41.6 (all 800x800, padding 0.15, tolerance 1e-9) |
| U14 | `internals.ghostAlpha` | `k = 1..5` with base 0.3: `0.3, 0.24, 0.18, 0.12, 0.12`; `ghostAlpha(1, 0.9) = 0.35`; `ghostAlpha(2, NaN) = 0.24`; with the shell's token value 0.35: `k = 1, 2, 3, 4` give `0.35, 0.28, 0.21, 0.14`; always `<= 0.35` |
| U15 | `internals.pointAtT` | points `z(t) = (2 - 5t) + i(1 - 4t)` at t = 0, ¼, ½, ¾, 1: `pointAtT(·, 0) = {2,1}`; `0.5 → {-0.5,-1}`; `0.125 → {1.375, 0.5}`; `1 → {-3,-3}`; `1.5 → null` |
| U16 | `internals.arcPoints` | `arcPoints(0,0,10,0,π/2)`: 7 points; first `{10, 0}`; last `{≈0, -10}` (x within 1e-9); every point at distance 10 from the origin |
| U17 | `internals.handleAriaLabel` | `{2,1} → "z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)"`; `{-1,√3} → "z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)"`; `({3,-2}, "z₁") → "z₁: z = 3 - 2i; r = 3.606, θ = -0.588 (Arg)"`; `{0,0} → "z = 0 + 0i; r = 0, θ = 0 (Arg)"`; `{-2,0} → "z = -2 + 0i; r = 2, θ = 3.142 (π, Arg)"`; `{1,-0.0004} → "z = 1 + 0i; r = 1, θ = 0 (Arg)"`; the name `"z"` adds no prefix |
| U18 | import safety | in Node: `typeof createPlane === 'function'`; `cssColor('--cart') === '--cart'`; `cssColor('#123456') === '#123456'`; `cssColor('var(--polar)') === '--polar'`; `rampColor('--input', 0.5) === '--input'`; `Object.keys(internals).sort()` equals `[arcPoints, fitView, formatAngle, formatNumber, formatRGBA, ghostAlpha, handleAriaLabel, parseColor, pointAtT, polarOf, rampMix, textBox, visibleBounds, withLabelFrame, zoomView]`; `DASH.cart` is `[5,4]`; `DASH.excluded` is `[6,5]` |
| U19 | `_helpers.mjs` pure parts (imported from `../interact/_helpers.mjs`) | `planeIdOfHandle('home-demo-plane-z') = 'home-demo-plane'`; `('cauchy-riemann-zplane-z0') = 'cauchy-riemann-zplane'`; `('z')` throws. `parseCart`: `"5 + 14i" → {5,14}`; `"-0.5 - i" → {-0.5,-1}`; `"2i" → {0,2}`; `"-i" → {0,-1}`; `"i" → {0,1}`; `"3" → {3,0}`; `"3 - 2i" → {3,-2}`; `"1.5e-3 + 2i" → {0.0015, 2}`; `"-1.5e-3 - 2.5e2i" → {-0.0015,-250}`; `"abc"`, `"5 + 14"`, `"-11/17"` → `null`. `nums("z = -1 + 1.732i; r = 2, θ = 2.094") = [-1, 1.732, 2, 2.094]`; `nums` reads a spaced minus as a sign: `nums("z₁: z = 3 - 2i; r = 3.606, θ = -0.588 (Arg)") = [3, -2, 3.606, -0.588]`, `nums("x = 1.5e-3") = [0.0015]`, `nums("no digits here - at all") = []` |

### 7.2 Recorder tests (acceptance A4, plus geometry): same test file

A recording fake context (about 15 lines): a `Proxy` over a state object; property sets (`strokeStyle`, `fillStyle`, `lineWidth`, `globalAlpha`, `font`, `textAlign`, `textBaseline`, `lineJoin`, `lineCap`)
update the state and are also pushed to `calls` as `{op: 'set', prop, value}` (R7 needs their order); method calls (`beginPath, moveTo, lineTo, closePath, stroke, fill, arc, fillText, strokeText, save, restore, setLineDash, measureText, createLinearGradient, clearRect, ...`)
push `{op, args, dash, strokeStyle, fillStyle, alpha, lineWidth, textAlign}` to `calls`; `measureText(s)` returns `{width: 7 * s.length}`; `setLineDash(a)` also updates the dash state;
`save`/`restore` are recorded but do not restore anything (the helpers must not rely on them, which is why they set every property before every stroke). A `strokes(ctx)` utility walks `calls`:
`beginPath` resets the path, `moveTo`/`lineTo` extend it, `stroke` snapshots `{points, dash, strokeStyle, alpha, lineWidth}`. Stub plane (G600): `{toPixel: T.toPixel, fromPixel: T.fromPixel, getSize: () => ({w: 800, h: 600}), getView: () => ({center:{re:0,im:0}, unitsAcross:8, scale:100})}`.
In Node `cssColor` returns the token name, so `strokeStyle` equals `'--cart'` etc. Coordinates are compared with tolerance 1e-4 unless stated.

| id | Call | Expected |
|---|---|---|
| R1 | `drawCartAddress(ctx, plane, {re:-1, im:Math.sqrt(3)})` | exactly two stroked polylines with `dash [5,4]`, `strokeStyle '--cart'`, `lineWidth 1.5`, `alpha 1`: `[(300, 126.7949), (300, 300)]` and `[(300, 126.7949), (400, 126.7949)]`; `fillText` calls include `'x = -1'` at (300, 314) with `textAlign 'center'` and `'y = 1.732'` at (408, 126.7949) with `textAlign 'left'`; no stroke has an empty dash. With `z = {2, 0}`: one polyline `[(600,300), (400,300)]` and only the label `'x = 2'`. With `labels: false`: no `fillText`. The backing rectangle (`fillRect`) appears only where the label's box overlaps the tick-label row or column: for `z = -1 + i√3` exactly one (the `x` label; `y` sits right of the axis), for `z = {2,-1}` one (`y`, left of the axis; `x = 2` at (600, 292) is over the axis, no backing) |
| R2 | `drawPolarAddress(ctx, plane, {-1, √3}, {ghosts: 1})` | ray: `[(400,300), (300,126.7949)]`, `dash []`, `'--polar'`, width 2, alpha 1; Arg arc: width 2.5, alpha 1, dash `[]`, 21 points, first `(428, 300)`, last `(386, 275.7513)`, every point 28 px from (400,300) within 1e-9; ghost: width 1.5, alpha 0.3 (`<= 0.35`, `<` the arc's), 99 points, first `(435, 300)`, last `(382.5, 269.6891)`, every point 35 px from the origin; two `fill` calls, the ghost's first (its arrowhead path starts at (382.5, 269.6891), alpha 0.5 at most and above the ring's 0.3) and the Arg arc's (starts at (386, 275.7513), alpha 1); texts `'r = 2'` at (329.0808, 225.4752) centred (the ray's midpoint plus the clearing offset 24.1554 along the normal), `'Arg z = 2π/3'` at (424.5, 257.5648) `textAlign 'left'`, `'also 8π/3'` at (424.5, 271.5648) with `alpha 0.8`. The ghost polyline is stroked **before** the arc. With `ghosts: 0`: no ghost polyline, no `'also …'`. With `ghostsNeg: 1` and `ghosts: 0`: ghost sweeps 0 to −4π/3 at radius 35 and the text `'also -4π/3'`. `z = {0.5, 0}`: ray `[(400,300),(450,300)]`, no arc stroke, texts `'r = 0.5'` and `'Arg z = 0'`. `z = {-2, 0}`: arc last point `(372, 300)` within 1e-9, text `'Arg z = π'`. `z = {0.01, 0}` (ray 1 px): no strokes and no text |
| R3 | `drawSeam(ctx, plane, Math.PI)` | one stroke: `dash [8,5]`, `'--seam'`, width 2, alpha 0.9, first point (400,300), last point with `x < -1000` and `|y - 300| < 1e-6`; `fillText 'seam'` at (336, 290) |
| R4 | `drawCircle(ctx, plane, {1,2}, 3)` | `arc` call args `(500, 100, 300, 0, 2π)`; one stroke, dash `[]`, `'--polar'`, width 2. With `{dash: DASH.excluded}`: that stroke's dash is `[6,5]`. With `{fill: '--polar', innerRadius: 1}`: arcs with radii 300 and 100 for the fill, a `fill` call with argument `'evenodd'`, and the outline arc radius 300 only |
| R5 | `drawTimedCurve` of the 1.5.1 segment (5 points t = 0, ¼, ½, ¾, 1), plane G800 (`getSize` 800x800) | strokes with `lineWidth 2` and `dash []`: 4 (one per bin 4, 12, 20, 28), each a single segment; `arc` calls of radius 4.5 at (600,300) and radius 3.2 at (475,400), (350,500), (225,600) (plus their +1.5 halos); a `fill` whose path starts at (100,700) (arrowhead). `ramp: false` gives 1 stroke with 4 segments; `dots: false, arrow: false` gives no `arc` and no `fill`; `closed: true` adds a fifth segment (100,700) to (600,300); `cursor: 0.5` adds an `arc` of radius 6 at (350, 500); a curve with one point draws one dot; a curve with a NaN point skips the adjacent segments and still draws the rest |
| R6 | `drawLabel(ctx, plane, {3.9, 0}, 'abcdefghij')` (70 px wide) | `fillText` x is 726 (clamped: `800 - 4 - 70`), y is 292 |
| R7 | purity | after each helper call the recorder's `strokeStyle`/`lineWidth`/`globalAlpha`/dash assignments precede **every** `stroke` call (a stroke is always preceded by an assignment of all four since the previous stroke) |
| R8 | no overlapping labels (fix round) | `internals.withLabelFrame({boxes: [dot]}, ...)` draws cart + polar (ghosts 0, 1, 2) + seam for the real half-axes and near-axis points (`2.2+0.05i`, `-2-0.4i`, `-2`, `2`, `2i`, `-2i`, `0.5+0.2i`, ... 20 spots) on 340, 390 and 560 px square planes in all six call orders; no two label boxes overlap (the Arg line and its `also` lines count as one block), none overlaps the 26 px dot box, none leaves the canvas. R8b: the same for a ring of 16 points at radius 2.2 and 16 near-axis points on 340 and 560 px. R8c: `2.2+0.05i`: r and the Arg block are above or below the real axis, never across it; x and y are off the dot. R8d: `-2-0.4i`, `-2`, `-2.2+0.05i` at 560 px: no overlap and the seam label is still drawn, left of the origin. R8e: with a box covering the whole canvas the seam label is not drawn (the seam stroke is), the other labels still are. R8f: the label positions are identical for all six call orders. R8g: in a frame, away from trouble, every label is at its R1 to R3 position (the r label at its R2 spot, the ray's midpoint plus the clearing offset) |
| R9 | backing rectangle only over tick labels | `z = 1.5+2.5i`: two `fillRect`; `z = -1.5-2.5i`: none; a polar label drawn before the cart labels is never overlapped |
| R10 | obstacles | a box registered over the default spot of `x = -1` moves the label off it, but near its foot |
| R11 | standalone | drawn with no frame, `drawPolarAddress` keeps the Arg block off its own ray and off the r label for `2.2+0.05i`, `-2.2+0.05i`, `2i` |
| R12 | r is never struck through by its own ray (fix round 2) | 200 points per width (seven fixed, the rest deterministic pseudo-random in the square [-3.9, 3.9]^2 with the ray at least 0.3 units long), at 340, 390, 446 and 560 px, ghosts 0 and 1, in a plane frame: an independent Liang-Barsky of the segment O-Z against the `r = ...` glyph box finds no crossing, and R8's collision rules hold; neither the Arg arc nor the ghost winding passes through the label (sampled along the drawn arcs). R12b: for `-1 + i sqrt 3` at 340, 390, 446, 560 px the ray passes at least 2 px from the label and the label centre is between 18 and 30 px from the ray's line; alone on G600 it is at (329.0808, 225.4752); a flat ray (`2`) keeps the 11 px spot (500, 289) |
| R13 | seam label against its own seam (fix round 2) | 48 seam angles (the negative real axis and 47 pseudo-random ones) on 340 and 560 px: the segment from the origin along the seam does not cross the `seam` glyph box; a vertical seam on G600 puts the label at least 17 px from the line |
| R14 | centred labels stay on the canvas (fix round 2) | `drawCartAddress` for `re = +-1.2` and `im` in 3.99, 3.9, 3.7, 0, -3.7, -3.9, -3.99, -4.2, -6, 6 on 340 and 560 px: every label's glyph box (with its real baseline) is inside the canvas; the y label of `1 - 3.99i` on 560 px has its anchor at most `h - fs/2 - 2` |

### 7.3 Interaction script: `tests/interact/i1-core-plane.mjs`

Run: `node tools/smoke.mjs --route i1-core-plane --script tests/interact/i1-core-plane.mjs --out docs/review/iter-1/i1-core-plane` (add `--dark` once to see a
dark-desktop capture of the loaded route; the script switches theme itself). The route is unknown to the router, whose "No such place" panel is fine (D13).
The script exports `default async function (page, ctx)`, imports `./_helpers.mjs`, and runs at both harness viewports (1280x860 and 390x844) with fresh pages.

Fixture (all in one `page.evaluate`, async, appended to `document.body`, never inside `#view`):

```js
const mod = await import(new URL('./js/core/plane.js', location.href).href);       // same module instance the app would use
host = <section id="pt-host" style="max-width:480px;margin:16px auto;padding:0 16px;box-sizing:border-box">; slot = <div id="pt-slot"> inside it
plane = mod.createPlane(slot, { id: 'pt-plane', xRange: [-4, 4], yRange: [-4, 4], grid: 'both' })
z = plane.addPoint({ id: 'z', z: {re: 2, im: 1}, label: 'z', onDrag: (zz, i) => window.__pt.log.push({ re: zz.re, im: zz.im, final: i.final, source: i.source }) })
w = plane.addPoint({ id: 'w', z: {re: -3, im: -2}, color: '--output', label: 'w', draggable: false })
plane.addLayer((ctx, p) => { mod.drawCartAddress(ctx, p, z.z); mod.drawPolarAddress(ctx, p, z.z, { ghosts: 1 }); mod.drawSeam(ctx, p); })
plane.addCurve({ id: 'ramp', points: <41 points of z(t) = -2.5 + i(-3 + 6t), t = i/40>, color: '--input', width: 3 })
plane.on('viewchange', (v) => window.__pt.views.push(v.reason))
window.__pt = { mod, plane, z, w, log: [], views: [], events: [] }          // then: await settle(page, 3)
```

| step | Actions | Passing means |
|---|---|---|
| S0 static and A2 at runtime | read the DOM | `#pt-plane-z` is a `BUTTON` with `type="button"`, class `plane-handle`, `aria-label === "z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)"`; `#pt-plane-w` `aria-label === "w: z = -3 - 2i; r = 3.606, θ = -2.554 (Arg)"`; `.plane` has `data-plane-id="pt-plane"`, `data-center-re="0"`, `data-center-im="0"`, `data-scale` within 0.01 of `canvas.clientWidth / 8`; `window.__mv.planes.get('pt-plane') === plane`; `#pt-plane-viewport` has `role="group"` and `tabindex="0"`; `#pt-plane-zoom-in`, `-zoom-out`, `-zoom-reset`, `#pt-plane-status` exist; canvas is square within 1 px |
| S1 drag with real mouse (A2, A5) | `await dragHandle(page, 'pt-plane-z', {re: -1, im: Math.sqrt(3)})`; `await ctx.shot('plane-light')` | returned z within 0.01 of (−1, 1.7320508); `readHandleLabel` is `"z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)"`; `__pt.log` has at least 5 entries, all but the last `final: false`, the last `final: true`, all `source: 'pointer'`, none `'api'` |
| S2 keyboard | `page.focus('#pt-plane-z')`; ArrowRight; Shift+ArrowUp; Alt+ArrowLeft; then ArrowRight on `#pt-plane-w` | re moves +0.1, then im +1, then re −0.01 from the S1 position (1e-6); log entries have `source: 'keyboard'`, `final: true`; after 400 ms `#pt-plane-status` text equals the handle's current `aria-label`; `w` does not move (`data-re` still −3) |
| S3 zoom controls and keys | click `#pt-plane-zoom-in`; click `-zoom-out`; focus `[data-plane-id="pt-plane"]`; keys `+`, `-`, ArrowRight, Shift+ArrowUp, `0`; 15 × `+`; `0` | `unitsAcross` 8 to 6.4 (1e-9) to 8 and `data-scale` follows (×1.25); `+`/`-` same; ArrowRight moves `center.re` by +0.8; Shift+ArrowUp moves `center.im` by +4 (square plane); `0` restores centre `(0,0)`, 8; after 15 `+` presses `unitsAcross === 0.5`, `#pt-plane-zoom-in` has `aria-disabled="true"`, status text `That is as far in as it goes.`; `__pt.views` contains `'zoom'` and `'reset'` |
| S4 pan and wheel | mouse drag on empty space from `planePixel(3, -3)` by (−60, −40) px; blur; wheel without focus; click empty space; wheel with focus | pan: `center` becomes `(60/scale, -40/scale)` within 1e-6 and `is-panning` is gone afterwards; wheel without focus: `unitsAcross` still 8; after the click `document.activeElement` is `#pt-plane-viewport`; wheel (0, −240) at `planePixel(1.5, -2.5)`: `unitsAcross` in (4, 7.9) and the complex point under the cursor is unchanged within 1e-6; `0` resets |
| S5 draw mode and events | `plane.setDrawMode(true)`; register all four pointer listeners; mouse down at `planePixel(-2,-3)`, 6 steps to `planePixel(2,-3)`, up; hover; `dragHandle` on `z`; `setDrawMode(false)`; short pan | `isDrawMode()` true, `.plane` has class `is-drawing`, canvas computed `touch-action` is `none`; events: first `pointerdown` with `z` within 0.02 of (−2,−3), then at least 6 `pointermove` with `dragging: true`, then one `pointerup`; the view centre is unchanged (no pan in draw mode); hover moves have `dragging: false`; the handle drag adds no `pointerdown`, `pointerup` or dragging `pointermove` events; after `setDrawMode(false)` a drag pans again |
| S6 time ramp pixels (A4) | read two pixels of the canvas at `toPixel(-2.5, -2.4)` and `toPixel(-2.5, 2.4)` (t = 0.1 and 0.9) via `getImageData` | alpha 255 at both; luma(t = 0.9) − luma(t = 0.1) > 20 (0–255 scale). Skipped with a `ctx.log` line if `--t0` is not defined (shell not merged) |
| S7 theme and coalescing (A3) | in one evaluate: 50 × `plane.requestDraw()` then two frames; then `data-theme="dark"` plus a `themechange` event on `document`; `await ctx.shot('plane-dark')`; restore | draws increased by between 1 and 2 for the 50 requests; after the theme event `getStats().draws` increased by at least 1 and `cssColor('--cart')` differs from its light value (or, if the theme keeps the hue, `getComputedStyle(plane.el).backgroundColor` changed); S6 repeated in dark: luma(0.9) > luma(0.1) + 20 |
| S8 resize | `host.style.maxWidth = '332px'`; settle; compare; restore | `canvas.clientWidth` is 298; `data-scale` within 0.05 of 298/8; the `z` button's centre minus the canvas rect origin equals `plane.toPixel(z.z)` within 0.6 px (x and y); after restoring, the same check holds again |
| S9 layout | desktop and phone | phone (`ctx.viewport.width <= 400`): `document.documentElement.scrollWidth <= clientWidth + 1`; canvas width <= 358 + 1; the `z` button's box is at least 32 x 32; `.plane-btn` boxes at least 32 high; `await ctx.shot('plane-phone')`. Desktop: canvas width at least 400 |
| S10 helpers and Arg jump | `plane.fitTo`/`setView` back to the default; `z.set({1.5, 0}, {silent: true})`; `dragHandleAround(page, 'pt-plane-z', {radius: 1.5, startAngle: 0, turns: 1, steps: 48}, onStep)` | `onStep` is called 49 times (i = 0..48); at every step `abs(z)` is within 0.02 of 1.5 (read via `handleZ`); Arg (atan2, −π mapped to π) rises from ~0, **exactly one** consecutive difference has absolute value > π, all others < 0.4 |
| S11 view API | `fitTo` four points of the 1.2.1 circle; `setView` clamps; `resetView`, `setHome` | after `fitTo([4+2i, −2+2i, 1+5i, 1−i])`: centre `(1, 2)` and `unitsAcross` 7.8 within 1e-6 (square plane); `resetView()` returns to it (fit became home); `setView({unitsAcross: 1000})` gives 200 and `setView({unitsAcross: 0.01})` gives 0.5; a repeated identical `setView` emits no extra `viewchange`; the observed reasons include `'fit'`, `'set'`, `'reset'`, `'resize'` |
| S12 performance | 60 iterations of `z.set(point on a circle, {silent: true})` then one animation frame; read `getStats()` | average `lastDrawMs` below 25 ms (headless software rendering; the target on real hardware is below 4 ms); `draws` grew by at most 62; log the average with `ctx.log` |
| S14 label collisions on the real canvas (fix round) | a 560 px plane with the three overlays; `fillText`/`clearRect` are wrapped to record the last frame's labels with their measured widths; 22 points (`2.2+0.05i`, `-2-0.4i`, `-2`, `2`, `2i`, `-2.2+0.05i`, a ring of 16); `ctx.shot('labels-posreal')`, `'labels-seam'`, `'labels-negreal'` | for every point: no two labels overlap, none is under the dot (plus its 6 px halo), the DOM `z` label or the zoom buttons, none leaves the canvas; r and Arg labels are drawn; the segment O-Z does not cross the `r = ...` box and the seam does not cross the `seam` box (Liang-Barsky on the measured boxes). Then 40 pseudo-random points on each of three plane widths (host `max-width` 374, 480, 560 px, i.e. canvases of about 340, 446, 526 px; on the phone the viewport caps them) are held to the same rules: 0 r labels struck through by their own ray (fix round 2) |
| S15 handles at the edges (fix round) | `dragHandle` to the corners and edges (3.95, 3.95), (−3.95, 3.95), (3.95, −3.95), (0, 3.95), (3.95, 0); then back to (1, 1); then pan the real axis into the button rows | the whole dot and its `z` label are inside the canvas every time; the dot (not a zoom button) is the topmost element on the dot; it can be re-grabbed from the corner; the `Re` axis name stops left of the zoom buttons. Fix round 2: a handle dragged to (-3.99, -3.99) (the 10 px inset), blurred and focused again leaves the view's centre unchanged and emits no `'pan'`; a dot parked with its centre 30 px from the top and 24 px from the right, not focused, is `is-above-controls` and the dot centre and eight rim points all hit the handle, not the zoom-in button, and `dragHandle` can grab it; at `3 + 3i` the whole dot is on top (raised on the phone-width plane); away from the buttons the class is gone and the zoom-in and reset buttons still work |
| S16 Ctrl+wheel (fix round) | synthetic `WheelEvent` with `ctrlKey` at the plane centre: `deltaY` −100, −300, −5, +100 | `unitsAcross` 8 becomes 8/1.5, 8/1.5, 8/exp(0.05), 12 |
| S17 listener balance (fix round) | wrap `addEventListener`/`removeEventListener`; create a plane with a handle and a curve; `destroy()` | every listener added on the plane element, its canvas, its three zoom buttons and its handle has been removed; window and document listener counts are back to where they were; a handle added and removed on its own had nine listeners and has none left (fix round 2) |
| S13 destroy and re-create | `plane.destroy()`; call `requestDraw`, `addPoint`, `addCurve`; create a new plane with the same id and destroy it; remove the host | `window.__mv.planes.has('pt-plane')` false after destroy; `[data-plane-id="pt-plane"]` gone from the DOM; the calls after destroy do not throw; `getStats().destroyed === true`; re-creating the id works; the page reports no console errors or page errors (the harness checks) |

Screenshots (`ctx.shot`): `plane-light` (after S1: grid both, both overlays with the ghost arc and the seam, the ramp curve at x = −2.5 with dots and
arrowhead, legend bottom-left, controls top-right), `plane-dark` (S7), `plane-phone` (S9, phone run only). The builder **looks at them** (Read tool) and fixes anything overlapping,
unreadable or off-palette before reporting.

### 7.4 Acceptance criteria, one by one

In the table below `\|` is the markdown escape for a plain `|` (regex alternation in `rg`).

| Criterion | Command | Passing looks like |
|---|---|---|
| **A1** transform, `mixColor`, `niceGridStep` exact | `node --test tests/unit/i1-core-plane.test.mjs` (and `npm test`) | U1 to U6 pass with the values above; the import succeeds in Node; no test is skipped |
| **A2** handles are accessible buttons with stable ids announcing both addresses | `rg -n "createElement\('button'\)\|plane-handle\|handleAriaLabel\|aria-label" js/core/plane.js` and the interaction script S0 to S2 | `createElement('button')` appears in the handle code and in the small control-button helper, `type = 'button'`, class `plane-handle`, `id = \`${id}-${spec.id}\``, `aria-label` set by `handleAriaLabel` in `applyZ(…, true)`, which `Handle.set`, drag end, keyboard nudges and `addPoint` all reach; U17 pins the strings; S0 to S2 show them on screen |
| **A3** colours from tokens at draw time, refresh on `themechange`, redraws coalesce | `rg -n "getComputedStyle" js/core/plane.js`; `rg -n "themechange\|MutationObserver\|prefers-color-scheme" js/core/plane.js`; `rg -n "colorCache.clear\|beginFrame" js/core/plane.js`; `rg -n "#[0-9a-fA-F]{3,8}\b" js/core/plane.js` (expect no output); `rg -n "\brgba?\(\|\bhsla?\(" js/core/plane.js` (expect only `formatRGBA`, `parseColor`); `rg -n "var\(" js/core/plane.js`; script S6 and S7 | `getComputedStyle` appears only in the token/colour helpers; one document-level `themechange` listener (in the shared hub) that clears the cache and calls `requestDraw` on every plane; `requestDraw` returns immediately when `dirty`; the injected CSS has no colour literal outside `var(...)` (keywords `Canvas`, `CanvasText`, `Highlight`, `currentColor`, `transparent` are not literals); S7 shows 1 to 2 draws for 50 requests and a repaint after the theme event; U18 shows Node-safety |
| **A4** address overlays and ramp semantics | R1, R2, R3, R5 in the unit file; read `drawCartAddress`, `drawPolarAddress`, `drawTimedCurve`; script S6; screenshot `plane-light` | two dashed `--cart` segments from z to `(re, 0)` and `(0, im)` with `x`/`y` labels; a solid `--polar` ray 0 to z, a solid arc 0 to Arg z with `r` and `Arg z` labels; `ghosts > 0` adds that many fainter windings with alpha at most 0.35 (R2 pins 0.3); ramp strokes are binned by t (R5), dots at t = 0, ¼, ½, ¾, arrowhead at t = 1 (R5), lightness increases with t (S6) |
| **A5** helpers drive real pointer events | `rg -n "page\.mouse\.(move\|down\|up)" tests/interact/_helpers.mjs`; `rg -n "boundingBox\|__mv\|planeIdOfHandle\|toPixel" tests/interact/_helpers.mjs`; script S1, S5, S10 | `dragHandle` reads the handle's `boundingBox()`, targets `planePixel` (which uses `window.__mv.planes.get(planeId).toPixel` plus the canvas rect), and uses `page.mouse.move`, `down`, `move(steps)`, `up`; the plane id comes from the DOM first and from the id minus its last `-segment` second; `dragHandleAround` holds one continuous press; S1, S5 and S10 prove that real mouse events move the handle and that `final: false` then `final: true` arrive |

Overall pass: `npm test` exits 0; `node tools/smoke.mjs --route i1-core-plane --script tests/interact/i1-core-plane.mjs --out docs/review/iter-1/i1-core-plane` prints
`ok   i1-core-plane (desktop)` and `ok   i1-core-plane (phone)` and `2/2 checks passed across 1 route(s).` with exit code 0; the three screenshots look right; no temporary files remain.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases (each has defined behaviour; none throws at run time)

| Case | Behaviour |
|---|---|
| container zero-size, `display: none`, or detached | `measured = false`; nothing drawn; nominal 400-px size keeps `toPixel` finite; the first real size from the `ResizeObserver` measures, positions handles, draws; the view is not moved |
| plane re-parented or shown after hidden (Lab tabs) | same: the observer fires on size change; `destroy()` is never implied |
| duplicate handle id, bad `options.id`, bad ranges | thrown at `addPoint`/`createPlane` with the readable messages in 2.5 (programming errors) |
| non-finite `z` for a handle (pole of 1/z) | handle hidden, last finite `z` kept, `aria-label` unchanged; no throw; showing it again with a finite `z` works |
| point far outside the view | button transform clamped to ±1e5 px; the `overflow: hidden` clips it; focusing it pans the view minimally to it |
| `z` on the negative real axis, with or without rounding noise | `polarOf` (noise floor 1e-12 relative) reports `Arg = +π`, so a computed `(-64) + (-7.8e-15)i` is not shown as `-π`; above the noise floor the jump is real and shown |
| `z` (nearly) 0 | ray shorter than 6 px: `drawPolarAddress` draws nothing; the Cartesian drop lines skip segments shorter than 2 px |
| `ghosts` or `ghostsNeg` large, negative, or fractional | `clamp(floor(n), 0, 6)` each; label block shows at most three `also …` lines, positive windings first |
| very large circle radius or non-finite centre | `drawCircle` skips when the pixel radius is non-finite or above 1e6 |
| curve with 0, 1, or 2 points; non-finite points; `t` outside [0, 1] or not monotone | 0: nothing; 1: one dot; non-finite or off-screen-by-1e6 points: the adjacent segments are skipped, the rest drawn; `t` clamped for colour; dots use the first segment containing the target t |
| `fitTo([])`, a single point, all points equal | `[]`: no-op; a single point or equal points: spans floored at 2 units so the view does not collapse |
| browser zoom, moving to a monitor with a different pixel ratio | the window `resize` listener calls `resize()`; the canvas backing store is rebuilt; no view change |
| huge canvas on a high-density screen | `dpr` is capped at 3 and the backing store at 16 million pixels |
| two planes linked by `viewchange` | `setViewInternal` ignores a no-op, so there is no ping-pong |
| `onDrag` calls `handle.set(z)` on the same handle | treated as silent (no recursion); on other handles it behaves normally |
| the dragged pointer leaves the canvas | pointer capture keeps events coming; z is clamped to the canvas box inset by 10 px, so the dot stays whole and its label (flipped below or left near an edge) stays visible |
| z on a real half-axis (a real number), on an axis, or near the origin | the address labels leave their default spots for the first free one (section 5.6, Label placement): no two labels overlap, none is under the dot, the DOM label or the zoom buttons; the seam label is dropped when no spot is free |
| a handle dragged under, or parked under, the zoom buttons | the focused or dragged handle, and any handle whose dot is under or against the buttons (`is-above-controls`), is `z-index: 3`, above the buttons (`z-index: 2`), so it can always be grabbed; the buttons' keys `+`, `-`, `0` still work **Superseded in residue cleanup:** the z-index values are now 100 + 10 * zOrder for a handle and 500 for the buttons (see the note at the Overlap item). |
| `pointercancel` or `lostpointercapture` during a drag (touch scroll takeover, tab switch, alt-tab) | the drag ends with `final: true` at the last position |
| `setPointerCapture` throws (synthetic events, old browser) | caught; the drag continues with whatever events arrive |
| a layer calls `requestDraw()` inside its own draw | schedules exactly one more frame (rAF), never a busy loop |
| two handles on the same spot | later one on top; Tab reaches both |
| missing theme token | resolves to the computed text colour (or `transparent` for surface tokens), one `console.warn` per token |
| `localStorage` | the plane never reads or writes it; view state lives in memory (CONSTRAINTS) |
| `window.__mv` already exists without `planes` | `planes` is added (D3); another plane already registered under the id is replaced |

### 8.2 Performance plan

- Budget: one redraw per animation frame at most; typical frame under 4 ms on a mid laptop for grid, axes, three overlays and two curves of 128 points at 800 x 800 (software-rendered headless
  Chromium in the smoke test may take several times longer, which is why S12 allows 25 ms). Dragging a handle costs one DOM transform and one coalesced redraw per pointer event; the
  browser already aligns `pointermove` to frames. `onDrag` runs on every move; stations must keep it cheap (the plane does not throttle it).
- Grid: at most three `stroke` calls (Cartesian lines, polar rings and rays, unit circle); lines are batched into one path each, crisp-aligned; counts are bounded (about 14 lines per axis, at most 200 rings).
- Curves: at most 32 `stroke` calls per curve (colour bins) plus 5 dots and one arrowhead; the per-frame colour cache means `rampColor` mixes at most 65 colours per base per frame.
- No per-frame allocation beyond small arrays; the transform object is rebuilt only when the view or size changes; `cssColor` reads `getComputedStyle` at most once per token per frame.
- DOM writes: handle positions are written only when the view, size or that handle's `z` changes; `aria-label` refresh during a pointer drag is throttled to 150 ms; `data-*` attributes only on change.
- Resolution: canvas backing store = CSS size x `dpr` (capped); rebuilt only when the size or `dpr` changes.
- Instrumentation: `getStats()` exposes `draws`, `lastDrawMs`, `resizes` for tests and for the integrator.

### 8.3 Accessibility

- Every draggable point is a focusable `<button>` whose name states **both addresses** and whether the angle is Arg; arrow keys move it; Shift and Alt change the step; changes are announced through a polite live region.
- The plane is a keyboard-reachable group with documented keys (pan, zoom, reset); zoom controls are real buttons with names and `aria-disabled` (focus is never lost at a limit).
- Focus is visible everywhere (3 px `--focus` rings on the plane, handle dots and buttons); focus never gets trapped; the page scrolls normally under touch and under the mouse wheel unless the plane is focused (D6).
- No meaning by colour alone: Cartesian dashed vs polar solid; Arg thick vs arg ghosts thin and labelled `also …`; time as lightness, dots and an arrowhead.
- Targets: 32 px minimum, 44 px on coarse pointers. Text on the canvas has a `--surface` halo for contrast; sizes 11 to 13 px (a station's explainer carries the same numbers in real text).
- The canvas is `aria-hidden`; every number it shows is also available as text via the handle labels and the station's readout.
- Reduced motion: see 8.4.

### 8.4 Reduced motion

The plane contains no autonomous animation, so `prefers-reduced-motion` changes only one thing: the 80 ms hover-scale transition on handle dots is dropped (it is declared only inside
`@media (prefers-reduced-motion: no-preference)`). Zooming, panning, resetting and fitting are instant jumps with no easing, always. Stations that animate a time cursor use
`ctx.theme.prefersReducedMotion()` to switch to a stepper and drive `CurveLayer.setCursor(t)` themselves.

### 8.5 Phone layout (about 390 px)

- The plane is `width: 100%` of its container (358 px with 16 px gutters), `min-width: 0` so a CSS-grid parent cannot make it overflow, `max-width: var(--plane-max-width, 640px)`, `aspect-ratio` fixed, so no horizontal scroll.
- Tick labels thin out automatically (every label at 38 px spacing or more, every second label at 19 px or more, every fifth below that); canvas fonts drop from 13 px to 12 px under 420 px width; labels are clamped inside the canvas.
- Touch: one finger on empty space scrolls the page (the plane never traps scrolling); two fingers pinch-zoom and pan the plane; the +, − and Reset buttons cover users who prefer buttons; in draw mode the canvas is `touch-action: none`.
- Handles have 44 px hit areas on coarse pointers; controls are 40 px; the legend is 64 px wide.
- Layout is verified at 390 x 844 by S9 (no overflow, sizes) and by the `plane-phone` screenshot.

---

## 9. Out of scope

- The arg/Arg staircase list widget (`staircase.js`), the two-column explainer (`explainer.js`), KaTeX helpers (`katex.js`).
- Any function evaluation, parsing, push-forward or morph (`complex.js`, `parse.js`, `mapping.js`); the plane draws the points it is given.
- Shape constructors (`shapes.js`) and the drawing tools themselves (brush, rectangle, circle, polygon): stations build them from `on('pointer…')` and `setDrawMode`.
- Domain colouring, 3D views, the Riemann sphere, the 4D graph (`domaincolor.js`, `three-view.js`).
- Play buttons, time scrubbers, morph sliders, readouts, presets and any copy other than the plane's own (stations own them).
- A live cursor-coordinate readout, snapping-to-grid UI, undo, PNG export (downloads are forbidden), audio, persistence of the view.
- Linking two planes' views (stations can do it with `on('viewchange')` and `setView`, which is ping-pong safe).

---

## Appendix A. Builder checklist (in this order)

1. Pure functions of 5.1 and the colour helpers of 5.2, with U1 to U19 written first and passing (`node --test`).
2. The drawing helpers of 5.6 and 5.7 with the recorder tests R1 to R7 passing.
3. The injected CSS (5.3) and `createPlane` (5.4 to 5.11), in the order: DOM and view, draw loop and grid, handles, pointer, wheel and keys, hub and destroy.
4. `tests/interact/_helpers.mjs` (5.12) with no imports; U19 passing.
5. `tests/interact/i1-core-plane.mjs` per 7.3; run it at both viewports; open `docs/review/iter-1/i1-core-plane/*.png` and fix what looks wrong
   (overlapping labels, unreadable text, handles that do not sit on their points, ramp not visibly dark to bright, controls covering content).
6. Keep a plain `<div>` fixture only inside the script (never create files under `tests/` other than the four listed); leave no temporary files.
7. Do not edit any file outside `js/core/plane.js`, `tests/interact/_helpers.mjs`, `tests/unit/i1-core-plane.test.mjs`, `tests/interact/i1-core-plane.mjs`.

## Appendix B. Notes for the orchestrator (not blockers)

- `--ghost-alpha` is in ARCHITECTURE 6 but not in `i1-shell` acceptance A5; the shell does define it (0.35), and `plane.js` also defaults to 0.3 if it is ever missing, so no change is required. It must stay a bare number.
- ARCHITECTURE 3.5's `window.__mv = window.__mv || { planes: new Map() }` should be read as D3 (add `planes` if `__mv` already exists); other goals' `window.__mv.linearImage` style hooks are safe either way.
- Station designers can rely on: `plane.fitTo` also defines the Reset view; `wheel: 'always'` exists for the Lab; `CurveLayer.setCursor(t)` draws the shared-clock cursor; `internals` is not for stations.
- The ramp mixes the base colour at weight 0.65 toward `--t0`/`--t1` (ARCHITECTURE 3.5). With the shell's actual tokens this was checked (section 3): every stop has at least 4.6:1 contrast against `--surface` and the green input and purple output stay distinguishable. If a later theme change makes `--t0`/`--t1` strongly coloured, the weight is one constant (`RAMP_WEIGHT`) to lower to 0.5; the legend bar shows the actual colours either way.
- A handle drag is clamped to the plane's own box inset by 10 px, so `dragHandle` to a point outside the visible area lands just inside the plane's edge. Interaction scripts that need such a point should `plane.setView` or `plane.fitTo` first (`planePixel` itself throws if the point is outside the browser viewport).
- No requests for other owners.

> Superseded in residue cleanup: the weight is 0.4 now; the figures in section 3 are for the old weight.

## Appendix C. Builder notes (what changed against this design, and why)

Built exactly to sections 4 to 5 with these small deviations, each found by looking at the screenshots in `docs/review/iter-1/i1-core-plane/`:

1. **"also ..." words are drawn at alpha 0.8, not at the ghost alpha.** The arcs keep `min(0.35, --ghost-alpha)` fading per winding (A4), but text at 0.3 alpha was barely legible in the light theme, and those words are the teaching device for arg versus Arg. R2 in the unit file pins 0.8 for the text and 0.3 for the arcs.
2. **The `x = ...` and `y = ...` address labels have a 92 % `--surface` backing rectangle.** By design `x = -1` sits at the same pixel as the x tick label `-1`, so the two overprinted into unreadable text whenever the point was on a tick (always, for the preset points). Text positions are unchanged (R1 still pins (300, 314) and (408, 126.7949)); R1 additionally asserts the backing rectangles. (Refined in Appendix D: the rectangle is drawn only where the label overlaps the tick-label row or column, so it can never erase another label.)
3. **Tick labels within 12 px of the left or right edge are skipped.** The default view puts `-4` and `4` exactly on the canvas edge, where half the glyphs were cut off and read as a different number.
4. **Pointer-initiated focus draws no focus ring.** Chromium treats the programmatic `focus()` inside `pointerdown` as `:focus-visible`, so a plain click left a heavy 3 px ring on the plane or the dragged dot. Two extra rules (`.plane.is-pointer-focus:focus-visible`, `.plane-handle.is-pointer-focus:focus-visible .plane-handle-dot`, both `outline:none`) plus a class that is added on pointer focus and removed on blur or on any key press (a capture-phase `keydown` on the plane), so keyboard users always get the ring.
5. **Interaction script.** The shell lays `<body>` out as a grid, so the fixture host spans `grid-column: 1 / -1` and centres itself with `justify-self`. S5 clears the event log after the hover move onto the start point (a hover move is reported as a `pointermove` when a listener exists). S7 switches to the theme opposite to the one the page started in, so the same script passes in the harness's `--dark` run. Extra steps beyond S0 to S13: Escape cancelling a pointer drag (S2), synthetic two-finger pinch (S4), non-finite handle hides and re-shows (S11), a plane created in a hidden container (S12b). Each screenshot also has a `-crop.png` of the plane element beside it.
6. **`npm test` on Node 22.** `package.json` runs `node --test tests/unit/`; Node 22 treats a directory argument as a module path and reports `Cannot find module '.../tests/unit'` before running anything. `node --test tests/unit/*.test.mjs` runs all tests (212 at the time of building, all passing). This is `package.json`'s owner to fix; the plane's own tests are unaffected. (Fixed since: see Appendix D, item 2.)

## Appendix D. Fix round (reviewer findings, what changed and why)

1. **Label collisions (major).** The default label spots (5.6) are kept as the first candidate of an ordered list; every address label (x, y, r, the Arg block, seam) now picks the first spot that overlaps nothing, in a per-frame label frame that knows the other labels, the dot, the DOM `z` label, the zoom buttons, the tick labels, the axes, the ray, the drop lines and the seam. In a plane frame the labels are queued and placed at the end of the frame in the order x, y, r, Arg, seam, so the outcome does not depend on the order a station calls the helpers in, and the backing rectangle (the old knockout, which could erase a polar label drawn earlier) is drawn only over the tick-label row or column. Measured with the recorder: 0 collisions over 9000 random points x 6 widths x call orders x ghost counts (it was about 35 %); on the real canvas S14 checks 22 points on desktop and phone. `drawSeam` needed no new parameter: it learns about z through the frame (the ray and the dot box registered by the other helpers).
   Known and left as designed: at steep angles the default r label (11 px off the middle of the ray, centred) can still have its own ray run through the text, because R2 pins that spot and the reviewer asked to keep it; the halo keeps it readable. If a later round wants it clear, treat the own ray as a soft cost in `placeLabel`'s r call and re-pin R2. (Superseded: see Appendix E, item 1; the review asked for exactly that and it is done.)
2. **`npm test` on Node 22 (minor, not this goal's file).** Already fixed in `package.json` (the script is `node --test "tests/unit/*.test.mjs"`); `npm test` exits 0 here.
3. **Ghost arrowheads (minor).** Each ghost winding now ends in a small arrowhead on the ray at alpha min(0.5, 1.6 x the ring's alpha); the rings keep `min(0.35, --ghost-alpha)`. R2 pins two `fill` calls.
4. **Zoom buttons over handles and the Re name (minor).** `.plane-controls` is `z-index: 2` (a focused or dragged handle is 3, so it passes over the buttons and stays reachable); the plane measures the button rectangle on resize, keeps labels out of it, and moves the `Re` and `Im` names left of it when they would sit under it.
5. **Handle at the edge (minor).** Drags are clamped to a 10 px inset; the DOM label flips below the dot near the top edge and to its left near the right edge (`is-below`, `is-left`).
6. **`nums()` (minor).** A spaced minus followed by a digit is a sign, so `nums("z₁: z = 3 - 2i; ...")` is `[3, -2, ...]`; the file header points to `parseCart()` for whole Cartesian strings. U19 pins both forms.
7. **Ctrl+wheel (minor).** The per-event zoom factor is capped at 1.5 (`WHEEL_MAX_FACTOR`); a mouse notch under Ctrl is x1.5, a trackpad pinch (small deltas) is untouched.
8. **destroy() symmetry (minor).** The three zoom-button click listeners and the `focusout` listener are named and removed in `destroy()`; S17 proves the balance.

## Appendix E. Fix round 2 (second review, what changed and why)

Builder-authored edits to this design in this round, for the designer to confirm: sections 2.3, 5.3, 5.6 (seam and r defaults, the candidate rules, the x/y note), 5.8, 5.13, 6.3 (the `r = 2` label position), 7.2 (R2, R8g re-pinned; R12 to R14 added), 7.3 (S14, S15, S17 extended), 8.1, the last sentence of Appendix D item 1, and this appendix. No other section changed. The review noted that the builder co-authoring the design reduces design-versus-build independence; each edit above records a change made in the code, none loosens a requirement.

1. **The r label is never struck through by its own ray (major).** The default spot was 11 px off the middle of the ray, which puts a steep ray through the word (about 24 percent of random positions on a 340 px plane, 37 percent on 446 px by the reviewer's count; in this repo's recorder measurement 55 to 69 percent, because its text is 7 px per character and its boxes are wider). The first candidate is now the angle-dependent clearing offset `c` (11 px for a flat ray, up to half the label's width plus 3 for a steep one), the ray is no longer ignored in the cost, and the candidates are ordered with the extra offset (0, 16, 32) outermost and nine positions along the ray, so a label that has to move stays beside its own ray rather than drifting 40 px away. Because the fallback spots then slide toward the origin, the drawn Arg arc and ghost windings became obstacles for r (the contact sheet `fixed-ring-340px.png` showed r touching their arrowheads without it). Measured on 400 random points at 340/446/560 px in the recorder: struck through by its own ray 221/253/277 times before, 0 after; labels whose centre is more than 40 px from the ray's line 110/82/60 before, 83/56/42 after (the arcs now keep the label off the ray's base; a label that cannot sit beside a short ray goes past its tip). R2 and R8g are re-pinned to (329.0808, 225.4752); R12 and R12b are new; S14 measures it on the real canvas (0 of 118 extra random points, 0 of 22 fixed ones, at both viewports).
   Related, found while doing this and fixed the same way: the seam label's first candidate was 10 px off the seam whatever its angle, so a steep seam (the `branches` station's movable seam) ran through its own word; its first offset is now `clearOffset(..., min 10)` (10 px for the negative real axis, so R3 still reads (336, 290)). R13 pins it.
2. **ensureVisible margin (minor).** 12 px against a 10 px drag inset made a handle dragged to the inset look slightly off-screen, so the next keyboard focus panned the view by 2 px and emitted `'pan'`. The margin is now `DRAG_INSET_PX - 1`. S15 covers it (it reproduced the reviewer's centre -0.0359 before the fix).
3. **A point under the zoom buttons (minor).** A handle whose dot (radius + 6 px) is under or against the measured button rectangle gets `is-above-controls` (`z-index: 3`), so it is whole and can be grabbed; the buttons it covers remain reachable by keyboard and by mouse where it does not cover them. S15 covers the 30 px / 24 px case and `3 + 3i` on the phone.
4. **Handle.remove() (minor).** The nine button listeners are kept in a list and removed; an unfinished drag is released without a final callback. S17 checks nine added and none left (it needed the handle to be tracked by class, because a detached button is no longer inside the plane element).
5. **Centred labels at the edges (minor).** The vertical clamp now uses the glyph box for baseline `'middle'` (the y label); the same helper serves `drawText`. R14 pins it.
6. **Design ownership (minor).** Not something the builder can fix. The edits listed at the top of this appendix are the whole of the builder's changes to this file in this round, kept to what items 1 and 7 of the review asked for; the orchestrator may want the designer to own any further edits.
7. **x and y against tick labels (minor).** Documented in section 5.6 (Label placement, "x, y"): inside a plane the x label of a point on a tick sits 28 px under the axis, not 14.

