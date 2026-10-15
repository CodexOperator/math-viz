# S2 residue report: addresses, arithmetic, distance, sets (iteration 1)

Group S2 owns `js/stations/{addresses,arithmetic,distance,sets}.js`, `tests/unit/i1-station-addresses-arithmetic.test.mjs`,
`tests/unit/i1-station-distance-sets.test.mjs` and the two matching `tests/interact` scripts. Nothing else was edited, except this report.
Nothing was committed. `docs/ARCHITECTURE.md` was not touched; the doc changes it needs are in section 6.

## 1. Totals

| | |
|---|---|
| Entries in `residue/S2.json` | 27 (13 addresses/arithmetic, 14 distance/sets) |
| Fixed | 21 (indices 0 to 8, 10 to 16, 18, 21, 22, 24, 25) |
| Partly fixed | 1 (index 23) |
| Declined with a reason | 5 (indices 9, 17, 19, 20, 26) |
| Core adoption items (task step 2) | `createLabelPlacer`, `sideCands`, `registerObstacle` and the `obstacle` option adopted in distance.js and sets.js and in arithmetic.js; `sameLabel` passed from both; the private placers deleted from both; `names` and `Handle.setLabel` considered, not needed (section 3) |
| Readouts changed to the typeset form | 5 (section 4) |
| New behaviour beyond the entries | the Bounded chip's draggable bounding disk (entry 16), the angle words on from the first look on a plane 420 px wide or more (entry 25) |

## 2. Disposition of every entry of `S2.json`

### addresses and arithmetic

| # | entry | disposition |
|---|---|---|
| 0 | arithmetic: `l-result` and `l-theta2` jammed inside the stacked arcs in div mode | **Fixed.** The main layer draws every segment, arc and hollow ring with `obstacle: true`, then places the words through `createLabelPlacer`: the answer first, the θ names after it. A label prim now carries `out` (the screen direction it can move away along) and `soft`; `labelCands(prim)` gives the plan's own spot, then 24 spots (8 directions at 10, 24 and 40 px, nearest `out` first). A soft θ word takes a spot that costs at most 49 (one crossing, never another word or a dot) and is left out otherwise. The default div view (`z₁ / z₂ = -0.647 - 0.588i`) now has the answer's word clear of both θ names and of the arcs; the mul tick-number case is the same code plus the core's tick avoidance. Interaction: `arithmetic-div`, `problem-1-1-2`, `arithmetic`, `problem-P2` run a word-spy check (no two words touch, none touches a handle's dot or word, none sits on a tick number or leaves the canvas, every named word is there, and `mv.arithmetic.labels()` says every θ word was placed). |
| 1 | stale `aria-invalid` and error line after a drag, a preset, or the arithmetic preset button | **Fixed.** addresses.js: `setField` clears `aria-invalid`, `aria-describedby` and the note when it rewrites an invalid field (the note is cleared only when it was a rejection: `noteIsError`). arithmetic.js: `setField(fld, z, skip)` does the same and also clears the field's error line; this covers a drag, a typed valid value in the sibling field, the mirror lock and the preset button (`loadState` rewrites both fields). `setInvalid` moved above `render`. |
| 2 | Reset view returns to the 8-unit home with the dot off the picture | **Fixed.** addresses.js listens for `viewchange` with `reason: 'reset'` and calls `ensureVisible(S.z)`; `S.userView` goes false. With the dot at -16 the view stays at 40 units after Reset. |
| 3 | denominator `\|z₂\|²` printed with three decimals (0.003, or 0) | **Fixed.** `texDen(x)`: `texNum` from 0.01 up, else three significant digits as `2.5\times10^{-3}`. Used in the div and inv Cartesian cells. `(1+i)/0.01` now reads `\dfrac{0.01+0.01i}{1\times10^{-4}} ≈ 100 + 100i`. |
| 4 | dashed stretch lies under the heavy result ray, same colour | **Fixed.** The heavy ray `s-ray-result` now ends at the nearer of the ring (z₁ spun) and the result and carries its arrowhead only when it ends on the result; the dashed `s-stretch` runs from the ring to the result, so the two never overlap (300 random mul/div states in U33). The 1.1.1 numbers are unchanged: ring (1.213, 3.395), result (5, 14). |
| 5 | `conj(z₁ + z₂)` through the z₁ handle; `conj z₁` on the Reset button; tick labels on z₁ and z₂ | **Fixed** by the same placer: the plane's frame knows the handles' dots and words, the zoom buttons, tick numbers and every registered line. Looked at in all six modes with and without the mirror, desktop and phone. |
| 6 | dead code in addresses.js, `S.userView` in arithmetic.js | **Fixed.** Deleted: `eulerP`'s duplicate (the Euler sentence is built once, with `prose()`), `S.pressedPreset`, the unused theta wrapper of `mkField` (`ft` is now just the input), `S.userView` and its listener in arithmetic.js, and three unused helpers (`clamp` in addresses.js, `relOf` in arithmetic.js, `copyZ` in sets.js). |
| 7 | P2 chip tooltip shows `re^{iθ}·re^{−iθ} = r²` | **Fixed.** `plainProse(text)` (from `proseParts`): `re^(iθ)·re^(−iθ) = r²`, one-character exponents stay bare. Used for every problem chip's `title` in addresses.js and arithmetic.js. |
| 8 | `#arithmetic-announce` keeps its text, a second Play is silent | **Fixed.** Play empties the region; the end of the move fills it. The interaction script plays twice and sees `''` then the sentence again. |
| 9 | A4 literal wording versus the pinned readout | **No code change; recorded.** A4 is met by the whole pinned string `result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404` (unit U21 and the `arithmetic-div` interaction check pin it). A reviewer who greps for the substring `-0.588` alone should read the string above: the format (`fmtCart`) writes the spaced minus, so `- 0.588i` is the correct form. |
| 10 | P2's callout says "not both nice numbers, multiply out" | **Fixed.** `arithmeticModel` gains `mirrorPair` (mul with z₂ = conj z₁). `whyText` then says the two spins cancel (`θ₁ + θ₂ = -0.588 + 0.588 = 0`, "a name for 0", so a negative real works too), that only `r · r = r²` is left, and why z · conj z is a plain number; the point row's native address becomes polar. |
| 11 | plane label placement (plane.js, plane owner) | **Fixed by adoption** of the C1 placer (entries 0, 5, 12). |
| 12 | dead `eulerP` and the unused theta field wrapper | **Fixed** (entry 6). |

### distance and sets

| # | entry | disposition |
|---|---|---|
| 13 | triangle words far from the line they name; axes and the guide ring not obstacles; `shortest` has no word on a phone | **Fixed.** distance.js draws its marks with `obstacle: true` (sides, legs, the guide ring, dotted ring, the seam ray) and registers the Arg arcs and the tip rings with `registerObstacle`; the plane already knows the axes and ticks. `putNear` tries the near spots first (an axis line through the word is accepted), then the whole list; `spotsBeside` appends two more rings (56 and 72 px) so a crowded figure still finds a clear place. The ring words fall back to `max` and `min` when `longest` and `shortest` have no room, so a ring is never left unexplained (the hint says so). On a plane narrower than 420 px the triangle starts with the angle words unticked (the reviewer's suggestion); the sides are the polar address already and the list of arg names stays visible. |
| 14 | sets piece words use a separate placer and print over `p` and the layer-60 words | **Fixed.** One placer, the plane's: a word it prints is recorded in the frame, so layer 70 sees layer 60's words and the probe's word; layer 60 registers the probe's disk as a box after its own words. The piece spots now run at 0.5, 0.8 and 0.2 of the way across the piece (24 spots). |
| 15 | sets where row lacks "phi is free" | **Fixed.** The polar cell ends `; (φ is free: only ρ decides)`. |
| 16 | bounded chip shows a fixed disk (STORY: drag a bounding disk until it contains S) | **Fixed (implemented, not only recorded).** The Bounded chip shows a handle on the negative real axis (`#sets-plane-bound`) that sets the radius of a dashed disk. It starts at half the true radius (2 for 1.5.2), snaps onto the true radius 4 (and onto half units), stays on the real axis, and moves 0.1 per key (Left and Down grow it). The word `|z| ≤ R` goes green when the disk holds S, `#sets-bound-verdict` says in a sentence whether it does, and an unbounded set says why no disk can. The pure `boundStart` and `boundVerdict` agree with `analyse().bounded` for every preset (U-S23). A new set restarts the disk; ticking an edge in or out keeps it. |
| 17 | performance, both stations (4x throttle misses 8 ms p90) | **Declined, measured.** Both stations now draw through the plane's cached placer. Measured on this tree, 60 handle moves in the busiest states (a scratch script that moves a handle on a circle and reads `getStats().lastDrawMs`): 1x median 0.7 to 1.7 ms, p90 at most 4.4 ms, max 12.7 ms; 4x throttle median 2 to 4.3 ms, p90 5.1 to 7.0 ms for sets and 8.7 to 10.9 ms for distance with the polar words on. The CONSTRAINTS target (60 fps, 16.7 ms) holds at 4x on p90; the builder's private 8 ms p90 at 4x is missed by 1 to 3 ms in two distance states, which the placer's own cost (about 50 spots per word, nine words) explains. No cheaper change that keeps the words clear was found. |
| 18 | circle mode: axes and the seam are not obstacles | **Fixed.** Axes come from the frame; the seam is `drawRay(..., { obstacle: true })`; the circle itself is an obstacle; the `seam` word has an inside-the-circle fallback, so it is no longer dropped near the left edge. |
| 19 | answers use inline `wrapAnswerTex`, ARCHITECTURE 10.4.2 says display plus scroll hint | **Declined.** The design sanctions it and it is better on a phone: the answers wrap at 1280, 390 and 320 px with no scrolling, and the plain-text fallback line stays. The rule belongs in the doc: ARCHITECTURE 10.4.2 should allow `wrapAnswerTex` (a callout wraps instead of scrolling); request in section 6. |
| 20 | `#topic-T1-2` opens two points, not the triangle | **Declined.** By design (U-D15, pinned by a test): T1.2 covers vectors, the modulus, the distance between two numbers and the triangle inequality; three of the four are the two-point mode, which is also the first thing a student sees from the topic card, and the triangle chip is in the row under the callout. |
| 21 | `c = -i` and `Arg(z − a) = π/2` touch the ring | **Fixed.** The circles are obstacles, so no word crosses an edge while a clear spot exists; the centre word has a spot under the centre (inside a small hole) before its rings of spots, and the rings go out to 62 px; when the probe disk sits on the centre the word goes round the disk at three radii. |
| 22 | triangle words cross the dotted guide ring | **Fixed.** The ring is an obstacle (entry 13). |
| 23 | `d = 3.606` across the dashed arrow; the arrow tip leaves the view | **Partly fixed.** `d` no longer crosses the arrow (checked at z₁ = -3 - 2i, z₂ = 2 + 2i, desktop and phone) and the `z₁ − z₂` word is placed or left out cleanly. The arrow's tip still leaves the fixed view for a large negative slide: that is the 12-unit view of the design, the user can zoom out, and the readout carries the value. |
| 24 | footer says "same point" for a distance, a radius, the room around p | **Fixed.** `sameLabel`: distance `same distance`, `same radius`, `same length` (the triangle's |z₁ + z₂|), sets `room around p`. |
| 25 | two-point mode starts without the polar address on the plane | **Fixed.** On a plane 420 px wide or more the angle words start on in two-point and triangle modes (circle already did); narrower planes start them off. The checkbox label under the plane is the pointer. |
| 26 | performance again (builder deviation) | **Declined**, same measurements as entry 17. |

## 3. Core adoption (C1 section 6, C2 section 6, C3 "for other owners")

| item | what was done |
|---|---|
| distance.js, sets.js: delete `makePlacer`, `sideCands`, `segmentHitsBox`, `tickBoxes`, `textWidth`, `labelFontCss` | Deleted from both (about 120 lines each). Imported: `createLabelPlacer`, `sideCands`, `registerObstacle`, `LABEL_COST` from plane.js. `segmentHitsBox` is not imported: the plane's frame does the line test, so nothing in the stations calls it. The station-owned `obstacles()`, `px()`, `dotBox()`, `arcSegs()` and `edgeSegs()` are gone; only what the plane cannot know is registered (tip rings, the slide dot, the probe disk, edges as `obstacle: true`). |
| the new cost scale 100/25/8/6 | `optional` words became `maxCost: LABEL_COST.axis` (6): they may cross an axis line, never a tick number, a line or a word. The old `maxCost: 2` of the ring words is 6, and 12 for the short fallback. The old `maxCost: 3` of the centre word with the disk on it is 50. `sideCands(pl, a, b, prefer)` of sets.js is `{ prefer }`. |
| `sameLabel` to `createExplainer` | Both stations, entry 24. |
| arithmetic: `Handle.setLabel` for the result word | **Considered, not used.** A handle's word is laid out before the layers draw, so it knows dots, words, ticks and buttons but not the θ arcs and rays, which are exactly what jammed the div view; the canvas word through `createLabelPlacer` knows all of them. The z₂ word has no workaround to remove (the plane's `auto` side now steps off the tick number by itself). |
| `names` of `drawCartAddress` | **Not applicable.** No station hand-draws axis names: addresses.js uses the default `x` and `y`, the other three print none. |
| `onDrag(z, info.altKey)` | Available, not adopted: every station has a Snap checkbox, a second way would need copy and tests in four files. |
| C2 (three-view, shapes, mapping, domain colouring) | Nothing applies to these four stations. |
| C3 | `sameLabel` (above). `exactAngle` with q = 18 and the `sup.prose-sup` rule need nothing here. |

## 4. Readouts in the typeset form

The values stay readable by the tests (`slackOf`, `nums`, `waitText` find the same numbers).

| station | before | now |
|---|---|---|
| addresses | `Arg z = 2.094 (2pi/3)` | `Arg z = 2.094 (2π/3)` (also `(π)`, `(-π/2)`) |
| arithmetic | `Arg = 0.785 (pi/4)` | `Arg = 0.785 (π/4)` |
| distance | `d = 5.385; z1 - z2 = 5 + 2i`, `|z1| + |z2| = ...; ||z1| - |z2|| = ...` | `d = 5.385; z₁ − z₂ = 5 + 2i`, `|z₁| + |z₂| = ...; ||z₁| − |z₂|| = ...` (numbers keep the ASCII minus) |
| sets | `probe: interior; eps = 0.5`; `fmtEps` gave `5.0e-4`; reasons said `|z| <= 4`; the live region said `1 <= |z + i| <= 3` | `probe: interior; ε = 0.5`; `5.0×10⁻⁴` in text and `5.0\times10^{-4}` in TeX cells (`texEps`); `|z| ≤ 4`; `describeSet().text` with `≤` for the live region (`ascii` stays for the data hook) |
| tooltips | `re^{iθ}·...` | `re^(iθ)·...` (entry 7) |

Not changed: the typed-input help (`sqrt(3)`, `2pi/3` are what the student types), the chip labels (`conj z₁`), the data hook `describeSet().ascii`.

## 5. Tests and verification

Unit: `tests/unit/i1-station-addresses-arithmetic.test.mjs` 38 tests (six new: U33 ray and stretch, U34 `texDen`, U35 tooltips, U36 mirror pair, U37 `labelCands`, U38 label prims), `tests/unit/i1-station-distance-sets.test.mjs` 55 tests. The placer and `segmentHitsBox` tests of the two stations were deleted (the core pins them in `i1-core-plane.test.mjs`, F10 and F15) and replaced by tests of `spotsBeside` and `putNear` (plain, and with the plane's own placer), the readouts, `texEps`, `describeSet().text`, the φ clause, and the bounding disk (U-S23). `npm test`: **774 of 774 pass** (the whole tree as it stands, including the other fixers' work).

Smoke: `node tools/smoke.mjs --dark --route addresses,arithmetic,distance,sets,problem-1-3-1,problem-1-1-1,problem-1-2-1,problem-1-5-2`: **24 of 24** (no console error, page error, failed request or overflow at desktop, phone and dark).

Interaction scripts at desktop, phone and dark, every route they branch on (addresses, problem-1-3-1, addresses-m16, problem-1-1-1, arithmetic, problem-1-1-2, problem-P1, problem-P2, arithmetic-div, problem-1-2-2, problem-1-5-2, plus the two logging-only routes): see section 8 for the final tally.

New interaction checks, in both scripts: a spy on `fillText` plus the DOM words and dots of the handles reads everything a student can read on the plane. `assertWordsClear` fails when two words touch, a word touches a handle's dot or word, a word leaves the canvas, a word sits on a tick number (relaxed only for the busiest state, D11) or a named word is missing. It runs on every mode of both stations in the default state and in the states the reviews named (div, mirror, P2, aligned and degenerate triangles, the probe on a centre, the piece words, the bounding disk at radius 2 and 4). Also pinned: the stale-error clearing, Reset view, the second Play, tooltips, the tiny denominator, the P2 callout, the footers, the φ clause, the bounding disk (drag, snap, keyboard, unbounded set, edge tick), the live region's real signs.

Mutation check: 26 deliberate breakages of the four station files (the old ray, words forced to their preferred spots, a field keeping its invalid mark, no announcement clear, the denominator through `texNum`, a raw tooltip, a mirror pair that is not native polar, Reset ignored, ASCII `pi` and `z1 - z2` and `eps`, no `sameLabel`, no wide-plane default, no narrow rule, no `max`/`min` fallback, a short Arg candidate list, a bounding handle that never shows or resets, no φ clause, an ASCII status, a short piece-spot list, a code-like `fmtEps`, and others) were applied to a scratch copy: 25 are caught by a unit test or an interaction script. One survives: shrinking the bounding word's candidates to two spots, which changes nothing visible (the handle's own box is 3 px wider than its dot). Two checks were added during the run because a mutation survived the first version (the P2 route did not check the callout; the word spy did not see a handle's dot).

Screenshots looked at: arithmetic in all six modes with and without the mirror, desktop and phone, before and after; distance in all three modes and nine states, desktop and phone; sets in the default state, with every chip, at the bounding disk radii 2, 4 and 4.5, two disks with pieces, punctured, half plane, probe on a centre, desktop and phone; the full pages of distance (desktop), sets (dark), addresses (dark) and 1.1.1 (phone).

## 6. Doc changes needed (docs/ARCHITECTURE.md is not mine)

1. **ARCHITECTURE section 9, addresses/arithmetic paragraph.** Readouts: `Arg z = <theta> (<exact>)` and `Arg = <theta> (<exact>)` write the exact form with the pi sign (`2π/3`, `π`, `-π/2`). New hook `window.__mv.arithmetic.labels()` (label id to whether the word was placed). The Reset button id of every plane is `<plane id>-zoom-reset` (already in the code; the scripts use it).
2. **ARCHITECTURE section 9, distance/sets paragraph.** Distance readouts: two `d = <v>; z₁ − z₂ = <cart>`, triangle `|z₁| + |z₂| = <a>; |z₁ + z₂| = <b>; slack = <a-b>; lower bound ||z₁| − |z₂|| = <c>`. Sets readout `probe: interior|exterior|boundary; ε = <v>`. Footer words: `same distance|same radius|same length` (distance), `room around p` (sets). New: handle `#sets-plane-bound` (the radius of the Bounded chip's disk, on the negative real axis), `#sets-bound-verdict` with `data-contains="true|false"`, `window.__mv.sets.state().bound = { R, active, contains }`, and the angle words' default (on from 420 px plane width, off below) for `window.__mv.distance.state().polar`.
3. **ARCHITECTURE 10.7.2** says readouts are plain text with an ASCII minus and three decimals: add "numbers only; names and constants are typeset (π, ε, z₁)".
4. **ARCHITECTURE 10.4.2** (answers): allow the inline `wrapAnswerTex` form that distance.js and sets.js use, so a callout wraps instead of scrolling (entry 19).
5. **`docs/designs/iter-1/i1-station-distance-sets.md`** (the designer's file): 3.3 now has the φ words in the cell; section 12's deviation 7 (the Bounded chip) is closed by the handle; the label-placement sections describe the plane's placer, `putNear` and `spotsBeside`; the polar defaults by plane width; U-D15 stands.
6. **`docs/designs/iter-1/i1-station-addresses-arithmetic.md`**: the stretch geometry (the heavy ray ends at the nearer of the ring and the result), the soft θ words, the P2 text.

## 7. Requests for other owners

- **C1 (`js/core/plane.js`), optional:** distance.js and sets.js each carry the same 25 lines, `spotsBeside` (sideCands plus two far rings) and `putNear` (near spots first, then the whole list). A tiered `put` (a `near` count) and the extra rings in `sideCands` would remove both copies.
- **C1, optional:** a handle's word cannot see lines that a layer draws, so z₁'s name still crosses a dashed leg in a few phone states of arithmetic. Registering the previous frame's obstacles for `layoutLabels` would close it.
- Nothing for the data owner: no `problems.js` text changed (the tooltip fix is in the stations).

## 8. Final tally of the interaction scripts

`node tools/smoke.mjs --route <route> --script <script> --dark --no-shots`, each route at desktop (1280x860), phone (390x844) and desktop-dark: **14 routes, 42 of 42 checks pass**.

- `tests/interact/i1-station-addresses-arithmetic.mjs`: addresses, problem-1-3-1, addresses-m16, problem-1-1-1, arithmetic, problem-1-1-2, problem-P1, problem-P2, arithmetic-div (27 of 27).
- `tests/interact/i1-station-distance-sets.mjs`: problem-1-2-2, problem-1-5-2, problem-1-2-1, distance, sets (15 of 15; the last three only load the station).

Review problems still correct and pinned by unit and interaction tests: 1.1.1 (`5 + 14i`, `-0.647 - 0.588i`), 1.1.2 (`4 + 6i`), 1.2.1 (circle about 1 + 2i, radius 3), 1.2.2 (`d = 5.385`, slide `5 + 2i`), 1.3.1 (`-1 + 1.732i`, `r = 2`, `Arg z = 2.094 (2π/3)`), 1.5.2 (open no, closed no, bounded yes, connected yes, domain no, region yes), P1 (`3 + 2i`, both columns agree) and P2 (`13`, the spins cancel). The story thread is intact: both addresses are on every plane (rays and lengths, Arg arcs), arg is shown as a set with Arg highlighted (the staircase and ghost windings in addresses, the bold home value in the lists of distance, the `Arg(p − c)` row of sets).
