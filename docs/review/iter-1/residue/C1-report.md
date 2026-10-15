# C1 residue report: js/core/plane.js (iteration 1)

> Note (integration, iteration 1): the `C1-architecture-3.5.patch` named in this report was applied to `docs/ARCHITECTURE.md` by the orchestrator and the file is deleted. Do not run the `git apply` or `patch` command below; it is the record of how the text got in, and ARCHITECTURE itself is the living copy.

Group C1 owns `js/core/plane.js`, `tests/unit/i1-core-plane.test.mjs`, `tests/interact/i1-core-plane.mjs` and
`tests/interact/_helpers.mjs`. Nothing else in the repository was edited, except two new files in this folder:
this report and `C1-architecture-3.5.patch` (the text docs/ARCHITECTURE.md section 3.5 needed; applied since, and the file is deleted, see section 5).
Nothing was committed.

Every new option is opt-in: a caller that passes none of them draws what it drew before. The deliberate changes of a
default are listed in section 3 (the time-ramp weight, the side a handle's word picks when something is in its way,
the numbers of an axis that is near the canvas edge, and handle stacking). Section 6 lists what other owners must do.

## 1. Dispositions

### 1.1 The 20 entries of residue/C1.json (20 fixed, 0 declined)

| # | from | request | disposition |
|---|---|---|---|
| 1 | lab | per-curve time-ramp weight, or a lower default | **fixed.** `rampWeight` on `drawTimedCurve`, on the `addCurve` spec and through `CurveLayer.set({ rampWeight })`; the legend pill follows the first ramped curve's weight. The default is lowered from 0.65 to **0.4** (section 3.1 has the measurements). The Lab can pass about 0.35 for family strokes. |
| 2 | arithmetic | `Handle.setLabel(text)`; handle word on the tick label '4' | **fixed.** `Handle.setLabel(text)` ('' removes the word). A handle's word on `labelSide: 'auto'` now steps off tick numbers and axis names when a free side exists (3.2). |
| 3 | distance-sets | (a) shared label placer that knows the plane's frame; (b) `altKey` in the onDrag info | **fixed.** (a) `createLabelPlacer`, `sideCands`, `segmentHitsBox`, `LABEL_COST` (section 2.2). The plane's seam, axis and address labels take part: the placer sees everything in the plane's frame, and every word it prints is recorded there, so the plane's queued labels keep clear of it. (b) `altKey`, see 2.3. |
| 4 | distance-sets | the same placer with 'optional' words, per-word `maxCost`, cached widths and font family | **fixed.** `put(text, cands, style, { optional, maxCost })`. `fontFamily()` is read once per frame (it shares the colour cache) and `measureText` results are cached per context, per font string, until a theme signal (S23: a warm frame makes 0 `measureText` calls and at most one `--font` read). `segHitsBox` no longer allocates a closure per call and rejects by bounding box first. |
| 5 | distance-sets | `altKey` in the onDrag info | **fixed.** `onDrag(z, { final, source, altKey })`: the Alt state at the last pointer move (the final call repeats it), at the key press for the keyboard, `false` for `source: 'api'`. |
| 6 | curves-linear | flip a handle word away from the zoom-button column | **fixed.** `auto` treats the zoom buttons as an obstacle (S20: the word of a handle beside the buttons is clear of every button, on the phone too). |
| 7 | curves-linear | (a) obstacle polylines for the placer, or `addCurve` registers them; (b) when the word flips, check the other side is free ('censtart') | **fixed.** (a) `registerObstacle(plane, spec)` and the `obstacle` option of `addCurve` / `drawTimedCurve` (opt-in; a curve costs once however many chords a word touches). (b) The flip is only taken when the other side is free of the buttons, tick numbers, other dots and other words (a decided word is an obstacle for the ones after it); when no side is free the first choice stays. |
| 8 | curves-linear | choose which side a word goes on, or flip only when the other side is free; obstacle polylines | **fixed.** `labelSide` ('auto' \| 'above-right' \| 'above-left' \| 'below-right' \| 'below-left', also a get/set on the Handle), plus the two points above. D1 (curves yRange [-4, 5]) can be reverted. |
| 9 | roots-principal | export `registerObstacle` | **fixed.** `registerObstacle(plane, spec)` takes a segment, a polyline, a circle or arc, a box around a point, or a pixel box. `drawSegment`, `drawRay`, `drawArc`, `drawCircle` and `drawTimedCurve` take `obstacle: true` (or a cost). The `drawPolarAddress(arcRadiusPx: 0)` trick in roots.js is no longer needed. |
| 10 | branches-graph4d | register a drawn segment (the dashed chord) | **fixed.** `drawSegment(..., { obstacle: true })` or `registerObstacle(plane, { a, b })`. |
| 11 | powermap-reciprocal | raise one handle above the others (optional) | **fixed**, with 16: `zOrder`. |
| 12 | powermap-reciprocal | `names: ['u', 'v']` on `drawCartAddress` | **fixed.** `names: ['u', 'v']` or `{ x: 'u', y: 'v' }`; labels read "u = ..." and "v = ..."; same placement and tick backing. |
| 13 | powermap-reciprocal | `name` or `describe` on `addPoint` so a handle does not always say "z = ..." | **fixed.** `symbol` (the letter: "w = 3 + 4i; r = 5, θ = 0.927 (Arg)") and `describe(z) => string` (the whole text). `name` still prefixes ("image: w = ..."), and is not repeated when it equals the symbol. |
| 14 | powermap-reciprocal | DOM handle word boxes as obstacles, or a side hint (the 'p' word against 'r = 0.218') | **fixed.** The word boxes were already obstacles for the address labels (padded 2 px; "against" meant inside that pad); the new `labelSide` hint lets the station put the word on the free side, and `auto` now avoids other words and dots itself. |
| 15 | powermap-reciprocal | `names` on `drawCartAddress` (duplicate of 12) | **fixed**, see 12. |
| 16 | powermap-reciprocal | z-order option on `addPoint` (duplicate of 11) | **fixed.** `zOrder`: integer -5 to 5, default 0, also get/set on the Handle. A higher one is on top whatever the add order and whichever handle has focus (S19: the raised handle is grabbed with the real mouse and the ones under it stay put). The Tab order stays the add order. |
| 17 | powermap-reciprocal | a name option for the announcement (duplicate of 13) | **fixed**, see 13. |
| 18 | mappings-cr | `drawArc` and the helpers built on `applyStroke` ignore the caller's `globalAlpha` | **fixed.** `alpha` (default 1) on `drawArc`, `drawSegment` and `drawRay` (arrowheads fade with the stroke); `drawCircle` and `drawPolygonFill` already had one. The helpers still set `globalAlpha` themselves, so a caller's own value never applied: pass `alpha`. |
| 19 | mappings-cr | `labelNames: { x, y }` on `drawCartAddress` | **fixed, as `names`.** `names: { x: 'u', y: 'v' }` is accepted, so mappings.js can drop `withCartLabels`. The spelling `labelNames` is not added: one option, one spelling (12 and 19 are the same request). |
| 20 | mappings-cr | knock out or offset tick labels and axis names when an axis is within about 14 px of the plane edge | **fixed.** `axisLayout` (3.3): within 18 px of the bottom the real axis puts its numbers above it, within 34 px of the left the imaginary axis puts its numbers to its right (left-aligned), within 22 px of the top 'Re' drops below the real axis, within 28 px of the right 'Im' moves to the left of the imaginary axis. S21 sweeps 150 origin positions per edge with and without zoom buttons and finds no number or name struck by its own axis. `keepAxesClear` in cauchy-riemann.js becomes optional. |

### 1.2 The "left" entries of docs/review/iter-1/wave0-sync.md that touch these files

| # | entry | disposition |
|---|---|---|
| 52 | r label far from its ray (16 to 20 percent of random points beyond 45 px, up to 64 px) | **declined.** In the unit harness (fake 6.8 px/char font, four plane widths, 1578 random points) 7.5 percent are beyond 45 px. A finer offset ladder (0, 6, 12, 18, 24, 32 px instead of 0, 16, 32) cuts that to 4.8 percent but does not fix the reviewer's own example (z = -1.073 + 1.147i on 358 px: the word ends past the tip of the ray because the spots beside the ray are taken by the drop lines and the arcs; the finer ladder moves it 6 px), and the placer's rule (R12, S14: never across the ray, the arc or a ghost winding) ranks "nearer but crossing a line" below "farther but clear". A distance penalty would move r for about 1 in 5 positions on every plane in 11 stations for a cosmetic gain the reviewer called optional, with colour and the "r =" text still identifying it. If a station needs a short ray label, that is a design decision for iteration 2 (a `near` option on `drawPolarAddress`), not a default change now. |
| 53 | x and y labels on the Arg arc or a ghost winding (8 percent) | **declined.** By design (R2 pin: arcs are obstacles for r only), the 3 px `--surface` halo keeps the text legible, and making arcs soft obstacles for x and y moves the default spot of labels in every station for a cosmetic case the reviewer marked optional. |
| 54 | 'Re' or 'Im' struck by a drop line near the right or top edge; a corner handle's word on the '+' button | **half fixed.** The handle word on the '+' button is fixed (6, 8: `auto` steps off the buttons). The axis name struck by a drop line is declined: the name is drawn before the layers (so the address labels can avoid it) and the drop line is the point's own coordinate, so it only happens for a point within about half a unit of the edge. |
| 55 | label placement on short wide planes | already resolved (rule 10.2.3, use square planes); nothing to change. |
| 57 | fixture: the 'w' word overlaps a ramp dot in the plane's own interaction script | **fixed.** The fixture's ramp curve moved from x = -2.5 to x = -2.1 (and the two luma probes with it). |
| 58 | halo ring clipped by 4 px at the 10 px drag inset | **declined.** The 10 px inset is documented (ARCHITECTURE 3.5 and rule 10.2.3, tests pin it); the dot and its 2 px ring are whole, only the decorative 30 percent halo is clipped. A 13 px inset would shrink the draggable area of every station. |
| 59 | x, y and Arg labels over ghost arcs at 340 px | **declined**, same reason as 53 (the entry says re-pin R2 and R8g if the default moves; they are unmoved, F20 pins them again). |
| 61 | full smoke fails 0/42 until wave 1 | done: see section 4, the full dark smoke over every route of `js/registry.js`. |
| 56, 60, 64 | design doc edits by the builder (`docs/designs/iter-1/i1-core-plane.md`) | not mine: the file is not in my list (designer's file). |
| 62, 63 | already resolved earlier (rule 10.2.3; package.json) | nothing to do. |

Counts: 20 of 20 residue entries fixed; of the wave 0 entries that touch my files 1 fixed (57), 1 half fixed (54),
4 declined (52, 53, 58, 59), the rest already resolved or not mine.

## 2. plane.js API: new and changed (exact)

Signatures are the `export function` lines of the code (what `tests/unit/architecture-sync.test.mjs` compares).

### 2.1 Changed signatures (a new option each; nothing removed, no default changed in a signature)

```js
export function drawCartAddress(ctx, plane, z, { color = '--cart', labels = true, names = null } = {})
export function drawSegment(ctx, plane, a, b, { color = '--text', dash = null, arrow = false, width = 2, alpha = 1, obstacle = false } = {})
export function drawRay(ctx, plane, angle, { color = '--polar', dash = null, width = 1.5, from = { re: 0, im: 0 }, alpha = 1, obstacle = false } = {})
export function drawArc(ctx, plane, center, radius, from, to, { color = '--polar', arrow = false, width = 2, alpha = 1, obstacle = false } = {})
export function drawCircle(ctx, plane, center, radius, { color = '--polar', dash = null, fill = null, fillAlpha = 0.12, width = 2, alpha = 1, innerRadius = null, obstacle = false } = {})
export function drawTimedCurve(ctx, plane, points, { color = '--input', width = 2, dots = true, arrow = true, closed = false, ramp = true, dash = null, alpha = 1, cursor = null, rampWeight = RAMP_WEIGHT, obstacle = false } = {})
```

| option | on | meaning |
|---|---|---|
| `names` (default `null`) | `drawCartAddress` | `['u', 'v']` or `{ x: 'u', y: 'v' }`; the labels read "u = ..." and "v = ...". A missing or non-string entry stays `x` / `y`; anything else is ignored. One-letter names are placed exactly where "x" and "y" were. |
| `alpha` (default `1`) | `drawSegment`, `drawRay`, `drawArc` | stroke opacity (arrowheads too). The helpers set `globalAlpha` themselves, so a caller's own `ctx.globalAlpha` never applied and still does not. |
| `obstacle` (default `false`) | `drawSegment`, `drawRay`, `drawArc`, `drawCircle`, `drawTimedCurve` | `true`, or a cost (a positive number, default 25 = `LABEL_COST.seg`): inside a plane frame the address labels and `createLabelPlacer` words keep clear of the line. A curve, arc or circle costs once however many chords a word touches. `false` changes nothing; outside a frame it is harmless. `drawCircle` registers its outline only. |
| `rampWeight` (default `RAMP_WEIGHT` = **0.4**) | `drawTimedCurve` | 0 to 1, the share of `--t0` / `--t1` in the stroke, dots, arrowhead and cursor; 0 is the plain base colour, 1 the pure ramp; a non-finite value means the default. `rampColor(base, t, weight)` takes the same weight (same clamping). |

`drawPolarAddress`, `drawSeam`, `drawDot`, `drawLabel`, `drawPolygonFill`, `rampColor`, `mixColor`, `cssColor`, `makeTransform`,
`niceGridStep` and `createPlane(container, options)` keep their signatures (the options of `createPlane` are unchanged).

### 2.2 New exports

```js
export function createLabelPlacer(ctx, plane, { boxes = [], segs = [] } = {})
//   -> put(text, cands, style = {}, { optional = false, maxCost = optional ? 0 : Infinity } = {}) -> boolean
export function sideCands(plane, a, b, { awayFrom = null, prefer = null, tie = false } = {})
//   -> [{ z, dx, dy, align }] (30 candidates)
export function registerObstacle(plane, spec)          // -> boolean
export function segmentHitsBox(a, b, box, pad = 0)     // pure -> boolean
export const LABEL_COST                                // frozen { box: 100, seg: 25, axis: 6, tick: 8, outside: 150 }
```

- **`createLabelPlacer(ctx, plane, { boxes, segs })`** returns `put`. Call it inside a layer. `boxes`: `{ x0, y0, x1, y1 }` in canvas
  pixels; `segs`: `{ a, b }` or `{ A, B }` in pixels, with an optional `cost` (25) and `pad` (0); both are obstacles for this
  placer only. Inside a plane frame the placer also knows axis names, tick numbers, the axes, the zoom buttons, every handle's dot
  and word, the rays and drop lines of the address helpers, and everything given to `registerObstacle` or drawn with `obstacle`.
  - `put(text, cands, style, { optional, maxCost })`: `cands` is a list in preference order of `{ z, dx, dy, align }` (anchor
    point in plane units plus a pixel offset, the shape the stations' own copies used) or `{ x, y, align, baseline }` in canvas
    pixels (`align` 'left' | 'right' | 'center', the default; `baseline` 'alphabetic' (default) | 'middle'). The first candidate
    that costs 0 wins, else the cheapest (the first on a tie). It returns `false` and draws nothing when the best cost is above
    `maxCost`: an `optional` word has `maxCost` 0, a word without `optional` has `Infinity`. `style` is `{ color = '--text', alpha = 1,
    knockout = false }`; the font and the 3 px `--surface` halo are the plane's own. The word is clamped inside the canvas like
    `drawLabel`, and in a plane frame its box is recorded, so the plane's queued labels (x, y, r, Arg, seam) keep clear of it.
  - Costs (`LABEL_COST`): a box 100 (another word, a dot, a button, a handle's word), a line 25 (a ray, a drop line, the seam, a
    registered line; once per curve or circle), a tick number 8, an axis line 6, leaving the canvas 150.
    The stations' own copies used 4, 1, 2, 1 and 20; only the order matters except in a `maxCost` number, and `optional` (cost 0)
    means the same in both.
  - Text widths are cached per context and font string (dropped on a theme change), so a repeated word is measured once.
- **`sideCands(plane, a, b, { awayFrom, prefer, tie })`**: the 30 spots beside the segment a-b (plane points) that
  `distance.js` called `sideCands` (five places along it, both sides, 12 and 24 px, then 40 px). `awayFrom` is the third vertex
  (the first side is away from it), `prefer` a screen direction `{ x, y }` (y down), `tie` flips the side when the third vertex is
  on the line. `sets.js` passed `prefer` positionally: it becomes `{ prefer }`. A zero-length segment gives nine spots around `a`.
- **`registerObstacle(plane, spec)`** (call from a layer; returns `true` when registered, `false` outside a plane frame or for a spec
  it does not understand): `{ a, b }` a segment; `{ points, closed? }` a polyline through plane points; `{ center, radius, from?, to? }`
  a circle or arc (units, radians, default the whole circle); `{ at, radius = 8 }` a square box around a plane point (pixels);
  `{ box: { x0, y0, x1, y1 } }` a pixel box. Lines take `cost` (default 25) and `pad` (pixels). Boxes are hard (100).
- **`segmentHitsBox(a, b, box, pad = 0)`**: does the segment pass through the box grown by `pad` (Liang-Barsky, allocation free).
- **`LABEL_COST`**: the five numbers above, for `maxCost`.

### 2.3 Plane and Handle (not export lines, so the sync test does not see them)

```js
plane.addPoint({ ...existing options,
  labelSide: 'auto',        // 'auto' | 'above-right' | 'above-left' | 'below-right' | 'below-left'
  symbol: 'z',              // the letter in the aria-label: "w = 3 + 4i; r = 5, θ = 0.927 (Arg)"
  describe: null,           // (z) => string: the whole aria-label; a non-string or empty result (or a throw) falls back to the default words
  zOrder: 0,                // integer -5..5 (rounded and clamped; non-finite means 0)
  onDrag: (z, { final, source, altKey }) => {} })   // altKey is new
handle.setLabel(text)       // '' removes the word, a later non-empty text brings it back; the aria-label follows unless the spec gave a name
handle.labelSide            // get / set, same values ('auto' for an unknown one)
handle.zOrder               // get / set, same clamping
plane.addCurve({ ...existing options, rampWeight: 0.4, obstacle: false })   // CurveLayer.set({ rampWeight, obstacle }) works too
```

- `altKey`: Alt held at the last pointer move (pointer drags, so the final call agrees with what the drag showed), at the key press
  (keyboard), `false` for `source: 'api'`.
- `name` defaults to the label as before; `setLabel` renames the announcement only when the spec gave no `name`. A `name` equal to
  the `symbol` (or to 'z') is not repeated in the aria-label.
- The aria-label of a handle that uses none of these is byte for byte what it was.

### 2.4 Test helper (tests/interact/_helpers.mjs)

`dragHandle(page, handleId, z, { steps = 12, modifiers = [] } = {})`: `modifiers: ['Alt']` holds those keys for the whole drag
and releases them afterwards (also when the drag throws). ARCHITECTURE section 8 lists the signature.

`internals` (test-only, stations must not use it) gains `axisLayout` and `rampWeightOf`.

## 3. Behaviour changes (defaults)

### 3.1 The time-ramp weight: 0.65 to 0.4 (the one default changed on a reviewer's evidence)

The lab review (issue 7) showed polar strokes read dark brown and Cartesian ones dark blue in the first quarter. Measured on the
tokens of `css/theme.css` (OKLCH; unit test F2 reads the CSS file and pins all of it):

| | weight 0.65 (old) | weight 0.4 (new) |
|---|---|---|
| polar stroke at t = 0.1, share of the token's chroma kept, light / dark | 30 percent / 17 percent | 61 percent / 50 percent |
| worst share over cart, polar, input, output, both themes, t = 0.1 and 0.9 | 17 percent | 50 percent |
| hue of cart and polar, worst shift from the token | 28 degrees (dark polar: grey-pink, saturation 8 percent) | 4.1 degrees |
| lightness climb t = 0.1 to 0.9 (OKLab L), worst | 0.19 | 0.110 (still monotone in t; real pixels in S6 and S7: luma climbs 34 light, 43 dark, the test asks for more than 20) |
| contrast of every stop with `--surface`, worst | 4.6:1 | 5.2:1 (the unit tests ask 4.5:1) |

Lower still costs the time cue (0.3 gives a lightness climb of 0.08); 0.35 is what the Lab asked for and it can pass it.
`rampColor`, `drawTimedCurve`, `addCurve` and the legend all follow `RAMP_WEIGHT`. **`js/core/three-view.js` line 176
(`rampRgb(..., 0.65)`) mixes the helix beads with the old weight and must move to 0.4** (owner C2; section 6).

### 3.2 A handle's word: `labelSide: 'auto'` (the default) steps off what is in its way

Before: above and right of the dot; below near the top edge; left near the right edge. Now the same first choice, and when that
box would sit on the zoom buttons, a tick number or axis name, or another handle's dot or word, or would leave the canvas, the
word takes the first of the three other sides that is free; when none is free it keeps the first choice ("flip only when the other
side is free"). Handles are laid out in creation order, so a decided word is an obstacle for the ones after it. The sides are
worked out once per frame, after the tick numbers are known. A named `labelSide` is kept, except where the word would be cut off
by the canvas. A handle with nothing in its way is exactly as before (S20, "alone" and "edge"). The estimated word width is
unchanged (8 px per character plus 4).

### 3.3 Axes near the canvas edge

`axisLayout(O, w, h)` (also used by the knock-out backing under an address label, so the two cannot drift): the real axis within
18 px of the bottom puts its numbers above it, the imaginary axis within 34 px of the left puts its numbers on its right
(left-aligned, and the 0 follows), 'Re' drops below the real axis within 22 px of the top, 'Im' moves left of the imaginary axis
within 28 px of the right. An axis that is off the canvas changes nothing, and a centred origin is exactly as before (S21 checks
the pixel positions: numbers 14 px under the axis, 6 px left, 'Re' 8 px above, 'Im' 8 px right). A tick number that would sit
under an axis name is skipped.

### 3.4 Stacking (CSS)

`.plane` is its own stacking context (`isolation: isolate`). Handles are at `100 + 10 * zOrder`; focus or a drag adds 5 (inside
the handle's own zOrder tier, so a raised handle stays above a focused lower one); the zoom buttons are at 500; a handle that
overlaps the buttons (`is-above-controls`) is at 1000 + 10 * zOrder, +5 when focused or dragged; the note is at 2000. Before: handles 1,
buttons 2, a focused or dragged or overlapping handle 3. The visible differences: a merely focused handle no longer covers the
zoom buttons unless it overlaps them (S15 still passes: a dot parked under the buttons is whole and grabbable), and
`curves.js`'s `z-index: 0` for `cv-under` handles still puts them lowest.

### 3.5 No visible change, faster

`fontFamily()` is one `getComputedStyle` read per frame (cached with the colours), `measureText` results are cached per context and
font until a theme signal, and `segHitsBox` is allocation free with a bounding-box rejection. S12: the average draw is about 1 ms
with the plane's own labels; S23: a warm frame measures nothing and reads `--font` once.

## 4. Verification

| check | result |
|---|---|
| `node --test tests/unit/i1-core-plane.test.mjs` | **61/61** (41 existing, 4 of them re-pinned for the new default weight and the new `internals` keys; 20 new: F1 to F20) |
| `npm test` | 718 tests, **716 pass, 2 fail**: `ARCHITECTURE 3.5: every documented signature is the one in the code` and `... every real export is documented`. Both are the sync test seeing the new API before docs/ARCHITECTURE.md (not my file) describes it. `C1-architecture-3.5.patch` fixed exactly these: applied to a copy of the ARCHITECTURE.md of that day (it applied cleanly, offsets of 1 to 57 lines) every `ARCHITECTURE` test passed. Before my work all 662 tests passed. |
| `node tools/smoke.mjs --dark --no-shots` (every route of js/registry.js: 21 routes, desktop, phone, desktop-dark) | **63/63 passed**: no console error, page error, failed request or horizontal overflow |
| screenshots (`--dark`) of addresses, arithmetic, lab, powermap and limits, 15 captures, looked at | 15/15 ok. Checked by eye: the arithmetic z2 word sits clear of the tick '4'; the powermap z-plane and w-plane strokes keep their green and pink along the whole time ramp in the dark theme (and the legend pill shows the same ramp); labels, drop lines and rays unchanged. |
| `tests/interact/i1-core-plane.mjs` (desktop 1280x860, phone 390x844, desktop-dark) | **3/3**: S0 to S17 as before, S18 to S23 new (below) |
| the interaction script of every station, `--dark` where the script lists it | **21 invocations, 0 failures**, on the working tree as it was while the other fixers were editing: arithmetic (arithmetic, problem-1-3-1, problem-1-1-1), curves-linear (problem-1-5-1, curves, problem-2-1-3, problem-P3, problem-P4, linear), powermap-reciprocal (problem-2-1-2, problem-2-2-1, problem-2-5-1), mappings-cr (problem-2-1-1, problem-3-2-1, problem-P7), distance-sets (problem-1-2-2, problem-1-5-2), limits-derivative (problem-2-3-1, problem-P5), roots-principal (roots, principal-root), branches-graph4d (branches, graph4d), staircase-powers (staircase, powers, problem-1-3-2), lab, home-problems (home, problems) |

New interaction steps (real mouse, real keyboard, real canvas pixels and DOM rectangles):

- **S18** ramp weight: pixels of three strokes (default, `rampWeight: 0`, `rampWeight: 1`), the helper called directly, `set()` at run time, a junk weight, `ramp: false`, the legend gradient stops, `rampColor` defaults.
- **S19** handle options: `labelSide` fixed, flipped at an edge, set at run time, junk; `setLabel` (text, box width, announcement with and without a name, remove and restore); `symbol`; `describe` (also following a drag, and a non-string result); a plain handle's announcement unchanged; `altKey` on a pointer drag with and without Alt held (every call, final included), keyboard Alt+Arrow, plain Arrow, `set()`; `zOrder` (top element at a shared point, later handle wins at equal order, focus does not lift a lower tier, DOM and Tab order unchanged, setter clamps, the raised handle really is grabbed by the mouse and the ones under it stay, tier 5 over the zoom buttons).
- **S20** handle words: a word beside the zoom buttons is clear of every button; one over a tick number moves; a forced side stays; two handles close together and two words that would overlap do not touch; a free default stays the default; the right edge still goes left.
- **S21** 150 origin positions per edge, with and without zoom buttons: no number, '0' or axis name is struck by its own axis; the centred layout is pixel for pixel the old one.
- **S22** the placer in a real frame: a station word is placed where asked and the plane's own y label steps off it; candidates on the zoom buttons or a handle's word are skipped; an optional word with only a tick number to sit on is dropped, `maxCost` 8 lets it; `registerObstacle` (segment, polyline), `drawSegment({ obstacle })` and a curve with `obstacle` each move the r label off a line through its default spot, and it returns to the default when the obstacle goes.
- **S23** caches: one `--font` read per frame and no `measureText` in a warm frame; after a theme change the widths are measured again once.

**Mutation check.** 30 deliberate breakages of plane.js (each of the four axis rules, the ramp weight in the helper, in the legend and back to 0.65, the auto side ignoring buttons, ticks, dots or words or switched off, `altKey` on each of its three paths, the two z-order rules, `registerObstacle`, polylines in the cost, the `obstacle` option of `drawSegment` and `drawTimedCurve`, both caches, the placer not recording its word or ignoring frame boxes, `names`, `alpha`, `symbol`, `setLabel` renaming, `describe`) were each applied to a copy and every one is caught by at least one test (unit or interaction). Two survived the first version of the script (the 'Im' name near the right edge, which the zoom buttons hid; a word overlapping an earlier word); S21 now also runs without buttons and S20 has the second pair, and both are caught.

## 5. Documentation (docs/ARCHITECTURE.md is not mine)

`docs/review/iter-1/residue/C1-architecture-3.5.patch` (applied and deleted; it was run with `patch -p0` from the repository root) updated section 3.5: the signatures above, the
`Handle` and `addPoint` and `addCurve` comments, the five new export lines, four paragraphs (label placement for stations, handle
words and stacking, axes near the edge, the time ramp) and the `dragHandle` line of section 8. It was made against the pre-edit file
and applies to the current one with offsets only. Until it was applied, `npm test` showed the two 3.5 failures of section 4; it has been applied, and `npm test` is clean.
`docs/designs/iter-1/i1-core-plane.md` (the designer's file) does not describe any of this yet.

## 6. Requests for other owners, and what the station fixers adopt

- **C2, `js/core/three-view.js` line 176**: `rampRgb(base, t0, t1, t) = mixRgb(base, mixRgb(t0, t1, t), 0.65)` must become 0.4, or the helix beads
  are drawn with the old ramp while the planes use the new one (the core-three review asked to re-check this if either changed). A
  unit test can compare it with `internals.rampMix` of plane.js.
- **Orchestrator / D**: apply `C1-architecture-3.5.patch` (done; file deleted).
- **S1 (lab)**: pass `rampWeight: 0.35` in `addCurve` for cart and polar family strokes if 0.4 is still too heavy; nothing else needed.
- **S2 (arithmetic, distance, sets)**: arithmetic: `handle.setLabel(text)` for the changing result word, and remove any workaround for the z2 word. distance.js and
  sets.js: delete `makePlacer`, `sideCands`, `segmentHitsBox`, `tickBoxes`, `textWidth` and `labelFontCss` and import
  `createLabelPlacer`, `sideCands` and `segmentHitsBox` from plane.js. The candidate shape `{ z, dx, dy, align }`, `{ A, B }` segments, `optional` and
  `maxCost` are the same. Differences to re-pin: sets.js called `sideCands(pl, a, b, prefer)`, now `sideCands(plane, a, b, { prefer })`;
  the plane's frame already holds the zoom buttons, every handle's dot and word and the tick numbers, so `obstacles()` and `tickBoxes()` go (pass
  only boxes of things that are not handles, such as the sets probe disc); costs are 100/25/8/6 instead of 4/1/2/1, so a `maxCost` number needs
  converting (`optional` needs nothing). `onDrag(z, info)` has `info.altKey` for switching snapping off for one drag.
- **S3 (curves-linear)**: drop the yRange shift D1; `obstacle: true` on the curve (`addCurve` spec or `drawTimedCurve`) keeps the 'r = ...' label off it;
  `labelSide` is available if a preset wants a fixed side.
- **S4 (roots-principal, branches-graph4d)**: `drawSegment(..., { obstacle: true })` for the dashed chord; `registerObstacle(plane, { points, closed: true })`
  for the n-gon, `{ center, radius }` for circles, `{ a, b }` for guide rays; drop the `drawPolarAddress(arcRadiusPx: 0)` trick.
- **S5 (powermap-reciprocal, mappings-cr)**: `drawCartAddress(..., { names: ['u', 'v'] })` replaces `drawUVNames` and `withCartLabels` (the label text is
  still "u = 3"); `symbol: 'w'` or `describe` on the w and 1/p handles replaces rewriting the aria-label after every `set()`; `zOrder: 1` on the
  line handle and the sector edge handles, 0 on the probe; `alpha` on `drawArc` replaces the polyline workaround; `keepAxesClear` is now optional hardening.
- **S6 (limits-derivative)**: nothing requested. `derivative.js` calls `rampColor(base, t)` with the default, so its spokes follow the new weight.
- **Everyone**: strokes with `ramp: true` are now closer to their token colour (weight 0.4); a test that pins a ramp pixel by number needs
  re-reading (none of the 21 station invocations above did). A station that read the exact side classes of a handle word
  (`is-below`, `is-left`) now sees the sides worked out once per frame, after the first draw.
