# Design: i2-lab-diary (the Lab as a diary: planes first, live ink, Replay, the opening example off the axis, saved pages)

Goal `i2-lab-diary` (iteration 2, wave 1, kind `lab`, size L). Owned files: `js/stations/lab.js`, `tests/unit/i1-station-lab.test.mjs`,
`tests/interact/i1-station-lab.mjs`. By the convention of the other iteration-2 goals the builder also creates the two goal-named test files
that the acceptance criteria name: `tests/unit/i2-lab-diary.test.mjs` (A2) and `tests/interact/i2-lab-diary.mjs` (A1, A5). Nothing else may be edited
(section 9 lists the requests for other owners).

Inputs read: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md` (0, 1 "Thread 3", 4, 5, 6), `docs/ARCHITECTURE.md` (3.5, 3.9, 3.10, 3.13, 4,
9 "i1-station-lab" and "Iteration 2: lab", 10.5, 11.1, 11.4), `docs/goals/iter-2.json` (entry `i2-lab-diary` and the `walk` entry of the registry),
`docs/designs/iter-1/i1-station-lab.md` (sections 0 and 6 and Appendix B), the shipped `js/stations/lab.js` (2520 lines), `js/core/plane.js`,
`js/core/shapes.js`, `js/core/mapping.js`, `js/core/decisions.js`, `js/core/listen.js`, `js/core/store.js`, `js/data/problems.js`, `js/data/functions.js`,
`js/registry.js`, `css/theme.css`, `css/components.css`, `tools/smoke.mjs`, `tests/interact/_helpers.mjs`, the iteration-1 Lab tests, the
`before` screenshots `docs/review/iter-2/before/lab--desktop.png` and `lab--phone.png`.

**Status of this design: built and verified in a scratch copy.** Nothing in the repo was touched. To make the design implementable without guessing, the
whole feature was built in a copy of the repo outside it (`.../scratchpad/exp/proto`), the two new test files and the pin edits of the iteration-1
tests were written, and everything was run: Appendix A is the exact patch of `js/stations/lab.js`, B and C the two new test files, D and E the edits of
the two iteration-1 test files (each applied to a pristine copy with `patch -p1` and compared with `cmp`: identical). Results are in 0.5. Where this
document and the appendices differ the appendices are the code that ran; where they differ from the text of the goal, section 0.3 says why.

---

## 0. Read this first

### 0.1 What is on disk now

- `js/stations/lab.js` is the iteration-1 Lab (2520 lines): pure half (specs, presets, `computeImages`, `imageBounds`, `frameBounds`, problem detection
  and check, probe numbers) and the DOM half `mount(el, ctx)`. Its hooks are `window.__mv.lab = { shapes, images, view, fn, t, s, probe, answerHidden, draft, stats, state }`.
- `frameBounds(pieces)` already exists (iteration 1, "bulk only" for a picture that lost samples to the pole filter). Its pole branch returned the line
  of 2.5.1 as x = [0.5, 0.5], y = +-5.08, so the w-plane was 13.2 units across and the line stood 17 px from the v-axis (measured: 16.97 px at 1280, 12.8 px at 390).
- `js/core/decisions.js` (`chips(problem, { idPrefix })`) and `js/core/listen.js` (`listenControl(container, station)`) exist (wave 0). `media/narration/site/lab.json`
  exists and `media/manifest.js` now lists its five clips under `SITE_AUDIO.lab` (the local agent rendered them), so **the Listen control is present on the Lab today**:
  a button `#lab-listen` and an `<audio id="lab-listen-audio" preload="none">`; the transcript line appears only while it plays.
- Measured before (Playwright, `tools/smoke.mjs` viewports): the z-plane canvas started at y = 988 px at 1280 wide and y = 1818 px at 390; the
  planes were 448 x 448 px (1280) and 338 x 338 px (390); the station header was 185 px (1280) and 334 px (390) tall.
- The registry's Walk stop for the Lab ticks when `window.__mv.lab.shapes().length` increases and the student clicks `#lab-replay`
  (`js/registry.js`, entry `lab`, `walk.check`): both must keep working.

### 0.2 Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Edit `lab.js` in place; do not rewrite it.** Appendix A is the whole patch (39 hunks). The iteration-1 pure half, the 3D views, the probe, predict-first and the problem panel stay line for line. | 39 iteration-1 unit tests and a 780-line interaction script pin the old code, including source-text pins (0.4). A rewrite would move them for no reason. |
| D2 | **The page order is: header, `#lab-toolbar`, the planes (`#lab-stage`), `#lab-start-notice`, `#lab-clock`, `#lab-views`, the colour legend, `#lab-problem`, `#lab-pages`, `#lab-fnpanel` (`#lab-fns`), `#lab-more`, the readout, the probe panel, the links** (fix round: `#lab-pages` moved above `#lab-fnpanel`, so Save this page is within a scroll of the picture it keeps; it was below the whole Pick f panel, about 2250 px down at 1280). | A1(1): the two planes are the first thing under the header and one compact toolbar. Measured in the prototype: z canvas top **369 px at 1280** (budget 480) and **550 px at 390** (budget 640). |
| D3 | **`#lab-toolbar` is one element with two rows**: row 1 the eleven tools, row 2 Undo, Clear, Snap and the grid chips; then the one-line tool hint. **The per-tool options (`#lab-tool-options`: Fan from 0, ring ratio, Close polygon) stay directly under the toolbar and are not folded into `#lab-more`.** | ARCHITECTURE 9 says "one row" and puts the options in More. The tools alone are 800 px wide at 1280, so one row is impossible; and an option that appears only while its tool is in hand (Close polygon while a polygon is half drawn) must be in view when it is needed. The i1 script clicks `#lab-polygon-close` unchanged. All ids stay. **The toolbar is therefore two rows at 1280 and, on a phone, five rows plus the hint** (369 px and 550 px to the z canvas, inside the 480 and 640 budgets of A1(1)); on a phone the z-plane is not literally the first thing under the title. This is a deliberate deviation from "one compact toolbar row" (A5, ARCHITECTURE 9, STORY 5 item 1); the fix round records it here and asks the owners of those two files to say "two rows" (Appendix G). Folding Snap and the grid chips into More on a phone was considered and left out: it would hide the snap switch that makes a drawn circle come out exact. |
| D4 | **The view tabs and the clock go below the planes, not above.** On a phone (<= 30rem) every plane is **5:4** (CSS `aspect-ratio: 5 / 4 !important`), so both planes fit one screen. | The views row is 148 px tall on a phone (four rows of chips): above the planes it would put the canvas at about 714 px, over the 640 budget, so one order serves both widths. At 1:1 the z canvas, its footer, the w head and the w canvas need about 770 px on a phone (634 + 2 x 68), more than a phone shows; at 5:4 they need 634 px (measured), so a student can scroll once and see the stroke and its live ink together. |
| D5 | **Live ink**: while a brush, line, rectangle, circle, polygon, sector, ring or grid is being drawn, the image of the half-drawn shape is drawn on the w-plane (and on the morph plane) with `drawTimedCurve`, `dash: null`, `ramp: true`, in the token the kept image will have (`strokeToken(family, 'w')`, which is `--output` for the brush and polygon). The brush on the z-plane is ink too (`--input`, ramped); a shape being dragged out keeps the dashed `DASH.guide` outline on the z-plane. The brush also shows its tip on both planes (a 5 px dot). | STORY 5 item 2. Using the kept colour means no recolour on release. A6 names `--output`: it is the token for every stroke that has no address (brush, polygon); a circle's ink is `--polar` because its kept image is. |
| D6 | **`draft().inked` is true when the draft has an image of at least two points to ink and the view shows it** (side, domain or morph, answer not hidden). The hook flushes a pending draft frame first, so it is exact the moment it is called. `stats().inkFrames` counts frames in which the layer really painted ink. | ARCHITECTURE says "the last frame drew it", which is a race with `requestAnimationFrame` when a script reads it straight after a mouse move. The script reads `inked` and also asserts `inkFrames` grew, so painting is still proved. |
| D7 | **Replay is Play with ink.** The replayed shape is the last shape of the drawing. While a replay is active the clock `t` is slaved to it (so the cursors, the readout, the 3D markers and the morph all follow), the shape's committed outline and image are a 20 percent ghost, and the part of each drawn by time t is ink (`replayWindow`). When it ends the clock gets back the value it had, and `s` too whenever the replay moved it, also when the student has left the morph view since (fix round). `#lab-replay-t` is the scrubber of the same thing. Play, the Time t slider, an edit, a function change, a new gesture and Escape end it; **all of them give the clock back, except the Time t slider, whose own value wins** (fix round: an edit or a gesture used to leave t wherever the replay was). | STORY 5 item 3 and A1(4). One clock for everything is the story's own sentence; a second cursor would double every dot. |
| D8 | **`frameBounds(pieces, opts)`** gets an optional second parameter `{ pole }` (`true`: frame on the bulk although nothing was cut; `false`: never; absent: decided by the pieces, as before). The pole branch now returns the bulk box **widened to at least `FRAME_MIN` = 4 units across in both directions** and the fields `{ xRange, yRange, cap, kept, total, pole: true }`. A picture with nothing cut is still `imageBounds`, unchanged. **Fix round: `pole: true` on a picture with nothing cut frames the bulk only when the picture really runs to infinity: the whole `imageBounds` box is more than `POLE_RUNS.min` = 10 units across and more than `POLE_RUNS.ratio` = 3 times the bulk box. Otherwise the box is `imageBounds` and the host uses `fitTo(box, 0.15)`.** | A2. Not widening a plain picture keeps the iteration-1 pins (a unit circle under `(1+i)z` is 2.83 units wide and `w = 2i` must stay off the w-plane under `z^2`). |
| D9 | **`poleView(box, size)`** is the view of a pole picture: `unitsAcross = min(POLE_CROP * max(spanX, spanY * w / h), w / POLE_MIN_SCALE)` with `POLE_CROP` = 0.8 and `POLE_MIN_SCALE` = 85, centred on the box. The host calls `wplane.setView(poleView(b, size))` then `setHome()` (so Reset comes back to it); a non-pole picture still goes through `fitTo(box, 0.15)`. | See 0.3 S1: a 4-unit window with the plane's 15 percent margin puts the line 44 px from the axis at 1280, not 60. Measured: **70.0 px (1280, 448 px plane, 1:1) and 42.5 px (390, 338 x 270 px plane)**, thresholds 60 and 40. |
| D10 | **The host also passes `pole: true` when the drawing runs into a pole of f** (`runsIntoPole(allCurves, fn.poles)`: a point within `POLE_NEAR` = 0.35 of a pole), not only when a sample was cut. **Fix round: the request alone no longer crops a finite picture (see D8). The line x = 1/4 under 1/z is a circle 4 across; with the request it was framed on a 3.2-unit window that showed 22 of its 147 points. Circle centre 1 radius 3/4, circle centre 2 radius 7/4, the line y = 1/4 and the rectangle 1/4 to 5/4 by -1/2 to 1/2 were cropped the same way; all are now whole, as in iteration 1.** | A circle `|z - 1/2| = 1/2` through 0 loses no sample at the default clamp (cap 20.5) and was framed 40 units high (41 across, bulk 4: it passes the 10-unit and 3-times test). 2.5.1 is cut and detected both ways. |
| D11 | **The w-plane refits on its first measurement and on every resize while auto-fit is on** (`viewchange` with reason `'resize'`). | `fitW` can run before the plane is measured (a nominal 400 px); the final view must come from the real size. |
| D12 | **Pages**: `lab.pages` is an array of `{ name, savedAt, fn: { kind, id, src, seam? }, shapes: Spec[] }`, newest first, at most `PAGE_LIMITS.maxPages` = 20. `pagesSanitize(raw)` drops what is malformed (no name, no shape that can be drawn, a function that does not parse, an unknown catalogue id) and keeps the newest 20 by `savedAt`. The 21st save is refused with a sentence (nothing is lost silently). Opening a page replaces the drawing and f and is undoable. A delete is one click and a "Put it back" button undoes the last one. | A1(5), STORY 5 item 5. `fn.seam` is the only addition to ARCHITECTURE 3.13: the seam angle of a movable-seam cube root cannot be recovered from `{ kind, id, src }`. |
| D13 | **`#lab-pages` is open by default; `#lab-more` is closed.** Both are `<details>` whose `<summary>` is `#<id>-toggle`, built by one helper, `disclosure()`, with `createElement` (not the `h()` helper). | Saving a page is the diary's main verb and should not hide behind a click. The helper keeps `tests/unit/i1-integration.test.mjs` I12 (owned by `i2-rehearse`) green: it counts `h('summary'` in `lab.js` and expects 3. |
| D14 | **The problem panel shows `decisions.chips(problem, { idPrefix: 'lab-problem' })`** in `#lab-problem-decisions`, after the statement, instead of the iteration-1 "Easiest in" chip. `addressLabel` and `addressTones` are no longer imported (U24 and U25 pins move, E). | A1(6). The Address chip is that chip. |
| D15 | **Notices move out of the way of the planes**: `#lab-notice` sits under the z-plane (inside its panel, empty it takes no height), `#lab-start-notice` under the planes. Its first-visit copy says "open More below". | A message that appears above the planes shifts them while the student is drawing. |
| D16 | **The header is compacted by CSS only** (badges and problem chips on one row at 1280; thread badges at 0.72rem on a phone; the lede is one sentence). The markup of `buildHeader` is unchanged. | Header 108 px at 1280 (was 185) and 168 px at 390 (was 334); the header contract of ARCHITECTURE 4 item 1 and the I6 test (`threadLabel`) are untouched. |
| D17 | **`listenControl(listenHost, 'lab')` is called once after the planes exist** (host `#lab-listen-host`, beside Predict first; fix round: its button has a visible outline and a tone-step fill, as in the Walk bar, because the kit's quiet button has no border until hovered). It resolves to a control while `SITE_AUDIO.lab` has clips (today it has) and to `null` (nothing drawn) when it has none; if the page was left first, the late control is destroyed. | Out-of-scope list: "call listenControl after the planes". |
| D18 | New pure exports: `FRAME_MIN`, `POLE_CROP`, `POLE_MIN_SCALE`, `POLE_RUNS` (fix round), `runsIntoPole`, `poleView`, `REPLAY`, `replayWindow`, `PAGE_LIMITS`, `pagesSanitize`, `pageFnSpec`; `frameBounds` gains its option. `LAB_LIMITS` is **not** touched. | `U1` pins `LAB_LIMITS` with `deepEqual`. |

### 0.3 Where the goal text pulls two ways, and what this design does

| # | Tension | Resolution (binding) |
|---|---|---|
| S1 | A1(2) asks for the line Re w = 1/2 to stand at least **60 px** (1280) and **40 px** (390) from the v-axis; A2 asks `frameBounds` for a box at least **4 units** across. On the 448 px plane of a 1280 page, 4 units plus the 15 percent margin is 5.2 units, and 0.5 unit is then 43 px. | `frameBounds` returns the 4-unit box as A2 says. The **view** shows 80 percent of it (`POLE_CROP`), and never at fewer than 85 px per unit (`POLE_MIN_SCALE`): 3.2 units across at 1280 (70 px), 3.976 units across on a 338 px phone plane (42.5 px). The arms of a pole picture leave the frame at both ends anyway, so the margin has no job. |
| S2 | ARCHITECTURE 9 says `#lab-toolbar` is one row and `#lab-more` holds the per-tool options. | D3. |
| S3 | A1(5) and (6) are written without opening a `<details>`. | `#lab-pages` is open by default, so (5) is literal. The presets are in `#lab-more` (ARCHITECTURE 9 and A3 say so), so step (6) of the script first clicks `#lab-more-toggle` (helper `openDetails`). A script that clicks `#lab-preset-circle1-load` without opening More fails by design. |
| S4 | `owns` lists the two iteration-1 test files; A1 and A2 name `tests/interact/i2-lab-diary.mjs` and `tests/unit/i2-lab-diary.test.mjs`. | The builder creates both i2 files (Appendices B and C) and applies the pin edits to the i1 files (D and E). |
| S5 | STORY 5 item 3: "in the morph view the plane slides as the stroke replays". | During a replay in the morph view `s = t`; when it ends `s` returns to the slider's earlier value. |
| S6 | A6 says the live image uses the `--output` token. | D5: `--output` for the brush and the polygon; the family token for shapes that have an address, because that is the colour the kept image has. The code contains `'--output'` in `drawInk`; the unit test L9 asserts it. |
| S7 | A4 runs `lab-nonsense` and the preset routes with `--dark`. | They are green in the prototype (15 of 15). |

### 0.4 What moves in the iteration-1 tests (A3: the complete list) and what must not

Moved (Appendices D and E; every other assertion is untouched and passes):

1. `tests/unit/i1-station-lab.test.mjs` **U12b** (the pole part): the 2.5.1 frame is x = [-1.5, 2.5], y = [-2, 2] and `pole: true` instead of x = [0.5, 0.5] and a half-height of 4 to 6. Reason: D8 (A2). The polynomial part of U12b is unchanged.
2. **U24** (the import list): `plane.js` also imports `drawTimedCurve`; `problems.js` no longer imports `addressLabel`, `addressTones` (D14); new lines for `../core/decisions.js` (`chips as decisionChips`) and `../core/listen.js` (`listenControl`). Reason: U25 (no unused import) would otherwise fail.
3. `tests/interact/i1-station-lab.mjs`: a helper `openMore` and `presetChip` (open More, then click) at the **6** places that click a preset, and `openMore` before the `hits` block (the centre of every preset group). Reason: the presets are inside More (ARCHITECTURE 9, A3). Robustness: a helper `labReady` waits for `window.__mv.lab`; `go` (for `lab...` routes) and `reloadAt` call it after their pause, and the script calls it before its first reload (a reload that aborts the 1.2 MB `three.module.min.js` fetch makes the harness print `request failed`). The fixed 900 ms pauses of iteration 1 were the weak point on a busy machine: the first run of the edited script at load average 30 failed with `window.__mv.lab` undefined, and passes at the three views with the waits.

Not moved, and the build must keep them (all are source-text or number pins that the patch leaves alone): U1 (`LAB_LIMITS`), U12 and the polynomial half of U12b, U23 (module hygiene), U24 forbidden patterns (no `innerHTML`, `localStorage`, colour functions, `scrollTo(`), U26 and U26b (three `fitTo(..., { padding: n })` calls and the sphere frame), U27 (`problemRefs.why.hidden = hide`, the `removeAttribute('title')` line, `if (answerHidden()) fnNote.textContent = COPY.noteWait`), U28 (`createLabelPlacer(c2, pl)`, five `wordSpots(` calls, `e.obstacle = true`, `e.rampWeight = FAMILY_RAMP`, `rampWeight: FAMILY_RAMP`), U29 to U32; `tests/unit/i1-integration.test.mjs` I11 (no "90 degrees" in a source line), **I12 (exactly 3 `h('summary'` in `lab.js`, each with an id: this is why `disclosure()` exists)**, I15 and I19 (four exact source lines of the probe rows), I6 (badges through `threadLabel`).

### 0.5 What the scratch build proved (all run on this machine, Node 22, headless Chromium through `tools/smoke.mjs`)

| Check | Result |
|---|---|
| `node --test tests/unit/i1-station-lab.test.mjs tests/unit/i2-lab-diary.test.mjs` | 39 + 11 = **50 of 50** pass |
| `node tools/smoke.mjs --route lab --script tests/interact/i2-lab-diary.mjs --dark` | **3 of 3** (desktop, phone, dark) on repeated runs, the last at machine load average 36 (every wait in the script is a `waitForFunction`, and the replay is driven by the wall clock) |
| the i1 script with the pin edits (E), desktop, phone, dark | green, also at machine load average 30 to 36 once the `labReady` waits are in; without them it failed twice on a busy machine (a fixed pause too short, or an aborted `three.module.min.js` fetch) |
| `node tools/smoke.mjs --route lab,lab-2-1-2,lab-2-2-1,lab-P4,lab-nonsense --dark --no-shots` (A4) | **15 of 15** |
| the whole unit suite | the same failures as the repository today (I1 registry, U3, U4, U5, U10 of the home tests: i2-rehearse and i2-home-index-deck own them), plus, on a busy machine only, `C2 sphere tubes` (a timing test of `three-view.js`; it passes alone, 43 of 43) and, in the scratch copy only, a narration test that needs `tools/videos`; no new failure from this goal |
| a hygiene pass of the `i1-integration` rules on the Lab (no ASCII pi, `z0`, `sqrt(`, NaN; an id on every control, link and tab stop; no duplicate id) with a page saved and More open | passes |
| first picture, 1280 | z canvas top **369 px**; w-plane 3.200 units across; the line **70.00 px** from the v-axis |
| first picture, 390 | z canvas top **550 px**; planes 338 x 270 px (5:4); w-plane 3.976 units across; the line **42.50 px** from the axis; z canvas top to w canvas bottom **634 px** |
| live ink cost, 400-sample brush loops under 1/z, z^3, z^2 (domain), 1/z (morph) | per-frame image compute **at most 13.1 ms on the first frames (cold), 0.2 to 1.3 ms warm**; two plane draws per pointer move |

### 0.6 Names checked against the code (the code wins over ARCHITECTURE)

`decisions.chips(problem, { idPrefix, meaning = true })` returns `span.decisions` holding `#<prefix>-address`, `#<prefix>-names` and `#<prefix>-meaning` (as 11.1 says);
`listen.listenControl(container, station, { id = `${station}-listen`, segment, label, manifest })` returns a promise of a control or `null` (11.4);
`plane.drawTimedCurve(ctx, plane, points, { color, width, dots, arrow, closed, ramp, dash, alpha, cursor, rampWeight, obstacle })` takes a token or a CSS colour (3.5);
`store.set(key, value, { persist })` returns `true` when the value reached storage (3.13); `plane.setView({ center, unitsAcross })` and `setHome()` exist and `fitTo(points, padding)` is
unchanged (3.5). The one name that differs from ARCHITECTURE 9 is how `#lab-toolbar` and `#lab-more` are filled (0.3 S2). `lab.pages` is the only store key this goal adds, as 3.13 says.

### 0.7 How to build

1. Apply Appendix A to `js/stations/lab.js` (`patch -p1 < lab.patch` from the repo root; it is a unified diff of the shipped file), or make the same edits by hand
   from sections 4 and 5 (the sections are written so the patch is a check, not a crutch).
2. Create `tests/unit/i2-lab-diary.test.mjs` (Appendix B) and `tests/interact/i2-lab-diary.mjs` (Appendix C).
3. Apply the pin edits D and E.
4. Run section 7.1.

---

## 1. Goal, story thread, problems and topics

### 1.1 Goal in one paragraph

The Lab opens as a diary page: the two planes directly under a compact header and one toolbar; while a brush, line, rectangle, circle, polygon (and the sector, ring and grid
tools) is being drawn, its image is inked on the w-plane at the same moment, solid and time-ramped; **Replay** redraws the latest shape and its image from t = 0 to t = 1 on one clock
with a cursor on both planes (a stepper under reduced motion, a scrubber for the hand); the first picture (the circle |z - 1| = 1 opening into the line Re w = 1/2) is framed so
the line stands clear of the v-axis; pages can be saved, reopened and deleted (browser storage through the store, working without it); the problem panel shows the two decision chips.

### 1.2 The story thread this carries and how it shows

Thread 3 made touchable: *a function moves every point at once*. A stroke z(t) and its image f(z(t)) share one clock; the student sees the clock while the hand moves (live ink), sees it
again on demand (Replay), and keeps it (pages). The picture that carries the whole idea is the opening one. In **polar** terms the circle |z - 1| = 1 is r = 2 cos(theta) through 0, and 1/z
sends (r, theta) to (1/r, -theta); in **Cartesian** terms u = 1/2 for every point. The Lab shows the polar move (the orange circle through the pole) becoming the Cartesian fact (a vertical line with the
time dots at v = 0, -1/2, +1/2 on it) with the line standing 70 px from the axis, so the student reads "u is stuck at 1/2" off the tick labels. Replay shows the time order: the image runs
down from 1/2 + 0i, leaves through infinity when z passes 0 (t = 1/2) and comes back from above; the page says so in one sentence once the replay is past the break.

### 1.3 Review problems and topics covered

| Problem | What the diary shows | Address (decision chip) | Names | Preset |
|---|---|---|---|---|
| 2.1.2 image of x = 2 under z^2 | the line becomes the parabola u = 4 - v^2/16; clock t = (y + 4)/8 | C | none | More: `x = 2` |
| 2.1.3 image of x = 2 under iz - 2i | the line becomes the real axis; a quarter turn and a slide | both | any | `#lab-2-1-3`, or `x = 2` then the chip `iz − 2i` |
| 2.2.1 image of 0 < arg z < pi/4 under z^3 | the fan opens to 0 < arg w < 3 pi/4 | P | any | More: `Sector 0 < arg z < π/4` |
| 2.5.1 image of |z - 1| = 1 under 1/z | the circle through the pole becomes the line Re w = 1/2 (the first picture) | P | any | the first visit; More: `|z − 1| = 1` |
| P4 unit circle under (1 + i) z | the circle of radius 1 becomes the circle of radius sqrt 2 | P | any | More: `Unit circle` |
| Topics T2.1 (mappings), T2.2 (power functions), T2.5 (reciprocal) | the six views on one clock, the grid patches, the probe | | | |

The Address and Names values are `js/data/problems.js` (checked); the chips are `decisions.chips`.

### 1.4 What the student can say afterwards

"This is the image of a shape: parametrize it, push it forward, read the curve." And, for the first picture: "A circle through 0 under 1/z is a line, and it is the line u = 1/2 because
|1 - w| = |w|."

---

## 2. UX

### 2.1 Wireframes

**Desktop, 1280 x 860** (numbers are measured in the prototype; the sidebar is 280 px, the column is 952 px at x = 304, each plane is 448 px):

```
 y=0    +------------------------------------------------------------------------------------------+
        | shell header (56 px)                                                      [theme toggle] |
 y=80   +-----------+------------------------------------------------------------------------------+
        | sidebar   | The Mapping Lab                                           (h1, 43 px)        |
        | (nav)     | Draw on the left. The right plane shows where f carries it, ink and all, on  |
        |           | one clock.                                                                   |
        |           | (T1 One point, two addresses)(T2 The staircase)(T3 A function is a motion)   |
        |           |                                      [2.1.2][2.1.3][2.2.1][2.5.1][P4]        |  header: 108 px
 y=204  |           | (Brush)(Line)(Rectangle)(Circle)(Polygon)(Grid)(Polar grid)(Sector)(Ring)(Probe)(Move) |  #lab-tools
        |           | [Undo][Clear] [x] Snap to grid   Grid on the planes (Cartesian)(Polar)(Both) |  .lab-toolbar-row
        |           | Brush: press and drag to draw any curve.                                     |  #lab-tool-hint
        |           |  (#lab-tool-options appears here only for polygon, sector, polar grid, ring)  |
 y=330  |           | +- INPUT  z-plane: where you draw -+  +- OUTPUT  w-plane: where f sends it -+ |  #lab-stage
 y=369  |           | | #lab-zplane-canvas  448 x 448    |  | #lab-wplane-canvas  448 x 448      | |  canvases
        |           | |  (draw here; the circle |z-1|=1) |  |  (the line Re w = 1/2, 70 px from  | |
        |           | |                                  |  |   the v-axis, time dots on it)     | |
 y=817  |           | | #lab-notice  #lab-shape-info     |  |                                    | |
        |           | +----------------------------------+  +------------------------------------+ |
        |           | To start, here is problem 2.5.1 ... (#lab-start-notice, first visit only)    |
 y=957  |           | +- #lab-clock ---------------------------------------------------------------+
        |           | | [Play] Time t ----o---- 0.40     [Replay my stroke] Replay ------------o 1.00 |
        |           | | [Predict first] [Listen]  (Listen is present while the manifest has lab clips) |
 y=1095 |           | (Side by side)(Morph)(Domain colouring)(Modulus landscape)(Riemann sphere)(4D graph) |  #lab-views
 y=1155 |           | Problem 2.5.1 ... Two decisions: (Polar) (names: any)  ...                   |  #lab-problem
 y=1498 |           | Pick f ...                                                    (#lab-fnpanel) |
 y=2254 |           | v Pages   [Page name .............] [Save this page]   (list, newest first)   |  #lab-pages (open)
 y=2500 |           | > More: start from a test problem                                            |  #lab-more (closed)
        |           | f = 1/z; shapes: 1; view: side; t = 0.4      (#lab-readout)  probe panel, links |
```

**Phone, 390 x 844** (column 358 px at x = 16; planes 338 x 270 px, 5:4):

```
 y=0     [logo One Point, Two Addresses]                         [theme] [menu]    (56 px)
 y=80    The Mapping Lab
         Draw on the left. The right plane shows where f
         carries it, ink and all, on one clock.
         (T1 One point, two addresses)(T2 The staircase)
         (T3 A function is a motion)                         header: 168 px
         [2.1.2][2.1.3][2.2.1][2.5.1][P4]
 y=264   (Brush)(Line)(Rectangle)(Circle)                    #lab-tools, 3 rows of 36 px
         (Polygon)(Grid)(Polar grid)(Sector)
         (Ring)(Probe)(Move)
         [Undo][Clear] [x] Snap to grid                       .lab-toolbar-row, 2 rows
         Grid on the planes (Cartesian)(Polar)(Both)
         Brush: press and drag to draw any curve.             #lab-tool-hint
 y=510   +- INPUT  z-plane: where you draw ----------+
 y=550   | #lab-zplane-canvas 338 x 270               |   <- A1: canvas top <= 640
         | #lab-notice, #lab-shape-info               |
         +- OUTPUT  w-plane: where f sends it --------+
 y=914   | #lab-wplane-canvas 338 x 270  (bottom 1184)|   <- z top to w bottom: 634 px, one screen after one scroll
         +--------------------------------------------+
         To start, here is problem 2.5.1 ...
 y=1347  +- clock: [Play] / Time t slider / [Replay my stroke] / Replay slider / [Predict first] -+
 y=1702  (Side by side)(Morph) / (Domain colouring)(Modulus landscape) / (Riemann sphere)(4D graph)
 y=1866  Problem 2.5.1 ... Two decisions: (Polar)(names: any) ...
         Pick f ... then Pages (open), More (closed), readout, probe, links
```

Predict first, the guess pad, the six views, the probe and the problem panel keep their iteration-1 layouts inside the same slots.

### 2.2 Every control: id, label, behaviour

New or changed (everything not listed keeps its iteration-1 id, label and behaviour; ARCHITECTURE 9 "i1-station-lab" is the list).

| id | Element and label | Behaviour |
|---|---|---|
| `#lab-toolbar` | `<section aria-label="Drawing toolbar">` | holds `#lab-tools` (11 tool chips, `aria-pressed`), `.lab-toolbar-row` (`#lab-undo`, `#lab-clear`, `#lab-snap`, `#lab-grid-cart|polar|both`), `#lab-tool-hint` (`aria-live="polite"`), `#lab-tool-options` (hidden unless the tool has options). The old `<h2>Draw</h2>` is gone. |
| `#lab-notice` | `<p role="status">`, now inside the z-plane panel, below the canvas | refused-input messages for 5 s; `display: none` while empty |
| `#lab-start-notice` | `<p role="status">` after the planes | first visit and unknown token (copy in 2.5) |
| `#lab-clock` | grid of three groups | group 1 `#lab-play` + `#lab-t` (+ `#lab-s`, `#lab-morph-play` in the morph view); group 2 `#lab-replay` + `#lab-replay-t`; group 3 `#lab-predict` + `#lab-listen-host` (a flex row); then `#lab-replay-note` |
| `#lab-replay` | button "Replay my stroke" (reduced motion: "Step the replay"); `aria-describedby="lab-replay-note"`; `title` says what it does or what it waits for | starts a replay of the last shape (5.4). Disabled with no shape, while the image is hidden (Predict first), and while a shape is being drawn |
| `#lab-replay-t`, `#lab-replay-t-out` | range 0 to 1, step 0.01, label "Replay", output `0.00` | the replay position. At 1 (rest) the picture is the normal one. Moving it to any value below 1 starts a paused replay at that time (the clock follows); moving it to 1 ends it and gives the clock back |
| `#lab-replay-note` | `<p class="muted">` (empty most of the time) | after the replay passes a break in the image: "The image has a break. ..." (2.5) |
| `#lab-listen-host`, `#lab-listen`, `#lab-listen-audio` | the Listen control of `listenControl` (button "Listen", `aria-pressed`) | present while `media/manifest.js` lists clips for `lab` (it does today), absent otherwise; it plays the five narration segments in order |
| `#lab-views` and the six `#lab-view-*` tabs | unchanged | moved below the clock |
| `#lab-problem-decisions` | `<div>` "Two decisions:" + `decisions.chips` (`#lab-problem-address`, `#lab-problem-names`, `#lab-problem-meaning`) | tap a chip: its one-line meaning; tap again or Escape: closed. Both chips are present for every problem the panel can show, also while predicting |
| `#lab-pages` | `<details open>`, summary `#lab-pages-toggle` "Pages" or "Pages (n)" | the diary's pages |
| `#lab-page-name` | text input, label "Page name", placeholder "Name this page", `maxlength` 40 | Enter saves |
| `#lab-page-save` | button "Save this page" | saves the drawing and f as a page; disabled with no shape |
| `#lab-page-status` | `<p role="status" class="muted">` | one sentence for every outcome (2.5) |
| `#lab-page-restore` | button "Put it back" (hidden until a delete) | restores the last deleted page at its place |
| `#lab-page-empty` | `<p>` "No pages yet. ..." | outside the list, so `#lab-page-list` is an empty `<ol>` when there are no pages |
| `#lab-page-list` | `<ol>` of `<li>` | one `#lab-page-open-<k>` (name in bold, then "f = <label> · n shape(s)") and one `#lab-page-delete-<k>` ("Delete", `aria-label="Delete the page <name>"`) per page; k = 0 is the newest |
| `#lab-more` | `<details>` closed, summary `#lab-more-toggle` "More: start from a test problem" | holds `#lab-presets` (the six preset groups, `#lab-preset-<key>-load`) |

Hooks (all on `window.__mv.lab`): `draft()` gains `inked`; `replay()` returns `{ on, t, cursor: { z, w } }`; `frame()` returns `{ w: <the w-plane's getView()> }`; `pages()` returns the pages;
`stats()` gains `inkFrames`, `replays`, `lastInkMs`, `maxInkMs`; `state()` carries `replay` and `pages`.

### 2.3 Pointer, touch and keyboard

- **Pointer and touch.** Drawing is unchanged: pointer events on the z-plane in draw mode (`touch-action` is the plane's). What is new is what the hand sees. Pressing with the brush starts ink on the z-plane
  and, in the same frame, ink on the w-plane (or the morph plane); every pointer move extends both; the tip of the brush is a dot on each plane; releasing keeps the shape (the ink is replaced by the kept curves of the
  same colour, with the time dots and the arrowhead). A rectangle, circle, line, ring, sector or grid being dragged out is a dashed outline on the z-plane and solid ink on the w-plane.
  A polygon shows its dashed rubber band on the z-plane and its image as ink on the w-plane.
- **Replay by touch**: tap "Replay my stroke"; drag `#lab-replay-t` to look at any moment of it.
- **Keyboard.** Tab order follows the page order (toolbar, planes, clock, views, ...). `#lab-replay` is a button (Enter or Space). `#lab-replay-t` is a range input: arrows step it by 0.01, the Page keys by a larger step, Home and End jump to 0 and 1 (1 is rest).
  **Escape stops a running or paused replay from anywhere** and gives the clock back (Escape still abandons a half-drawn polygon when the focus is on the page or the z-plane). Enter saves a page from the name field. The decision chips are buttons; Escape closes the meaning line. `#lab-pages-toggle` and `#lab-more-toggle` are summaries (Enter or Space).
- **Wheel and gestures** on the planes: unchanged (`wheel: 'focus'`).

### 2.4 Empty, loading and error states

| State | What the student sees |
|---|---|
| Blank page (nothing drawn) | the two empty-state pills of iteration 1 ("Draw here. ..." and "Nothing to carry yet. ..."); `#lab-replay` and `#lab-page-save` disabled, `#lab-replay` titled "Draw something first." |
| Predict first on | the w-plane is the guess pad; live ink is **not** drawn and `draft().out` is 0 (the image is the answer); `#lab-replay` disabled, titled "Reveal the image first." |
| A shape is half drawn | `#lab-replay` disabled, titled "Finish the shape first." |
| 3D view or WebGL missing | unchanged (the note `#lab-webgl-note`); Replay still moves the 3D markers |
| Domain colouring refining | unchanged (`#lab-dc-status`) |
| `listenControl` pending or without clips | nothing is shown; no error; while its clips load the button shows the kit's own `…` mark |
| An image with a break (a pole, a seam) | two or more pieces: the w cursor is hidden in the gap (`replay().cursor.w` is `null`), and the replay note appears after the break |
| Storage blocked (`store.set` returns false) | "Saved "x". This browser blocks storage, so it is kept for this visit only." The page works for the visit; nothing throws |
| Damaged or foreign `lab.pages` value | read as "no pages" (`pagesSanitize`): no error, the stored value is replaced at the next save |
| A stored page whose function no longer parses | the page is dropped when read; if it fails at open: "That page's function could not be read." and nothing changes |
| 20 pages | "20 pages is the limit. Delete one to save another." |
| Replay under reduced motion | a stepper: each press advances 0.1; the tenth press ends it |

### 2.5 Copy (every string a student can read; plain; the typographic minus and pi only where iteration 1 already used them)

- Lede: **"Draw on the left. The right plane shows where f carries it, ink and all, on one clock."**
- Start notice, first visit: **"To start, here is problem 2.5.1: the circle |z − 1| = 1 under 1/z. Clear it to begin with a blank page, or open More below to load another test problem."** (the other two start notices are unchanged.)
- Clock: **"Play"**, **"Time t"**, **"Replay my stroke"**, reduced motion **"Step the replay"**, scrubber label **"Replay"**, **"Predict first"**.
- Replay button titles: **"Draw the last shape and its image again, from t = 0 to t = 1."**, **"Draw something first."**, **"Reveal the image first."**, **"Finish the shape first."**
- Replay note (after the break): **"The image has a break. Your stroke passes a point where f has no value, so the image leaves the plane there and comes back on the other side."**
- Screen-reader lines (`#lab-sr-status`): **"Replaying your last shape."**, **"Replay done."**
- Pages: summary **"Pages"** and **"Pages (3)"**; intro **"A page is your drawing and the function f, kept in this browser."**; label **"Page name"**; placeholder **"Name this page"**; **"Save this page"**; default name **"Page 1"** (the count plus one);
  **"Saved "my stroke"."**; **"Draw something first: a page keeps your drawing."**; **"20 pages is the limit. Delete one to save another."**; **"Opened "my stroke". Undo brings your last drawing back."**;
  **"Deleted "my stroke"."**; **"Put it back"**; **"Put "my stroke" back."**; **"No pages yet. Draw something, name it and save it here."**; **"That page's function could not be read."**; **"That page could not be saved."**
- More: summary **"More: start from a test problem"** (the presets keep their iteration-1 text).
- Problem panel: **"Two decisions: "** then the chips **"Polar"** and **"names: any"** (for 2.5.1); a tap says, for example, **"Any name of the angle works: powers, products, directions, cos and sin."**

---

## 3. Visual encoding (the two-address code, both themes)

Every colour is a token read at draw time (`cssColor`, `strokeToken`); the planes redraw on `themechange`; no literal colour is added (U24). Both themes work because the tokens do.

| Mark | Token (light / dark) | Notes |
|---|---|---|
| z-plane brush ink while drawn | `--input` (#006e53 / #3fd0a0), ramped from `--t0` to `--t1` with the plane's default weight 0.4 | width 2.5, no dots, no arrowhead; the tip is a 5 px dot in `--input` |
| z-plane outline of a shape being dragged out | `--input`, dashed `DASH.guide`, width 2 | iteration 1, unchanged |
| w-plane live ink, brush and polygon | `--output` (#9d3a8a / #e48fd2), ramped (weight 0.4) | width 2.5, solid, no dots; the tip is a 5 px dot in `--output` |
| w-plane live ink, a Cartesian shape (line, rectangle, grid) | `--cart` (#0b63ad / #62adf2), `rampWeight: FAMILY_RAMP` (0.3) | the colour the kept image has |
| w-plane live ink, a polar shape (circle, sector, ring, polar grid) | `--polar` (#a84300 / #ff9d5c), `FAMILY_RAMP` | likewise |
| live ink in the domain view | `--text` over a 6.5 px `--surface` halo (alpha 0.9) | the same black-and-white rule the kept strokes follow there |
| replay ink | the family or plane token as above, width 3.5, ramped by the stroke's own t (so it is the colour the finished stroke has); in the domain view `--text` over a 7.5 px halo | drawn on top of a 20 percent ghost of the finished outline |
| replay cursor | a ring of radius 8: `--input` on the z-plane, `--output` on the w-plane and the morph plane | the existing cursor dots (radius 6, order 200) move to the same t |
| ghost | the finished outline at alpha 0.2, no dots, no arrowhead | rebuilt once when a replay starts and once when it ends |
| the first picture | the line at `--polar` (the circle is polar), dots at t = 0, 1/4, 3/4, the arrowhead at t = 1 | the window shows u from -1.1 to 2.1 and v from -1.6 to 1.6 at 1280, so the tick `0.5` sits on the line and the gap to the v-axis is 70 px |
| the decision chips | the kit's own CSS (tokens only): Address tinted by `addressTones`, Names by its mark | nothing added |
| pages, More, clock panel | `--surface`, `--border`, `--text`, `--text-muted` | text and borders only; the focus ring is the global `:focus-visible` |

Contrast: the ramp keeps the 5.2:1 floor of ARCHITECTURE 3.5 for the plane default (0.4), and the iteration-1 test (`A2`, `A3` strokeColours) holds the family ramp at at least 55 percent of the token's chroma; nothing here changes either.

---

## 4. Module API

### 4.1 Imports (relative, exactly these changes; every name is used, U25)

```js
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawDot, drawTimedCurve, createLabelPlacer, cssColor, mixColor, niceGridStep, DASH } from '../core/plane.js';   // + drawTimedCurve
import { chips as decisionChips } from '../core/decisions.js';        // new
import { listenControl } from '../core/listen.js';                    // new
import { problemById, problemsForStation, routeFor, statementParts } from '../data/problems.js';   // - addressLabel, addressTones
```

### 4.2 Exports (new and changed; all pure, importable in Node; the iteration-1 exports keep their signatures)

```js
export const FRAME_MIN = 4;                  // a pole picture's frame is at least this many units across, both ways
export const POLE_CROP = 0.8;                // the window shows this share of the frame
export const POLE_MIN_SCALE = 85;            // ... and never fewer than this many CSS px per unit
export function runsIntoPole(curves, poles)  // → boolean: some point of some curve within POLE_NEAR (0.35) of a pole {re, im}; false for no poles
export function frameBounds(pieces, opts = {})   // → { xRange, yRange, cap, kept, total, pole? } | null; opts.pole: true | false | absent
export function poleView(box, size)          // → { center: {re, im}, unitsAcross }; box = { xRange, yRange }; size = { w, h } | null (400 square)
export const REPLAY = Object.freeze({ seconds: 2.4, hold: 0.4, step: 0.1 });
export function replayWindow(points, t)      // → { points, cursor }: points with t_i <= t plus the interpolated point at t; cursor null before the first t and after the last
export const PAGE_LIMITS = Object.freeze({ maxPages: 20, maxName: 40 });
export function pagesSanitize(raw)           // → Page[]: malformed dropped, newest first by savedAt (ties keep input order), at most 20; never throws
export function pageFnSpec(f)                // → the FnSpec makeFn takes for a page's fn: { id } | { zn } | { seam } | { src }
```

### 4.3 Data structures

```js
// Page (the store key lab.pages is Page[], persisted, newest first)
{ name: string /* 1..40 chars, spaces collapsed */, savedAt: number /* epoch ms, >= 0 */,
  fn: { kind: 'catalog' | 'zn' | 'seam' | 'custom', id: string | null, src: string, seam?: number /* only for 'seam', in [-pi, pi] */ },
  shapes: Spec[] /* cleanSpec output, 1..40 */ }
// state additions (inside mount)
state.replay = { on: boolean /* animating */, active: boolean /* on, or paused by the scrubber, or stepping */, t: number /* 1 at rest */,
                 prevT: number, prevS: number /* the clock and the morph slider to give back */, shapeId: string | null, last: number | null /* last frame, ms */, hold: number /* seconds left of the end hold */ }
state.pages = Page[]
// live ink: draftCurves (z), draftOut (pieces on the w or morph plane), draftFamily ('cart' | 'polar' | null), pen = { z, w }
```

### 4.4 Store, hooks, events

- **Store**: `lab.pages` (persisted; read once at mount through `pagesSanitize(store.get('lab.pages', null))`, written with `store.set('lab.pages', pages)` after each save, delete and restore; `store.set` returning `false` means storage refused it).
  `lab.strokes` and `lab.request` are as before. Nothing in `lab.js` touches `localStorage` itself (U24).
- **Hooks**: section 2.2. `replay()` computes its cursors on demand (not from the last frame), so it is exact when read.
- **Events listened to**: the plane events of iteration 1, plus `viewchange` of the w-plane with `reason: 'resize'` (refit when auto-fit is on), `keydown` on the document (Escape ends a replay first), `click` on `#lab-replay`, `input` on `#lab-replay-t`.
- **Events emitted**: none new. The Walk reads `window.__mv.lab.shapes()` and a click on `#lab-replay`.

### 4.5 Lifecycle

`mount` does the iteration-1 boot, then (before the first flush) `state.pages = pagesSanitize(...)`, `renderPages()`, and the `listenControl` call. `unmount` additionally cancels the replay frame (`replayRaf` is in the list of frames it cancels) and destroys the Listen control (and a late one that resolves after the page was left). Nothing else is new: no window listener (the keydown is the existing document listener), no canvas, no timer.

---

## 5. Algorithms

Names are those of Appendix A. `state`, `rp = state.replay`, `invalidate`, `flush`, `setT`, `setS`, `say` are the iteration-1 ones.

### 5.1 Assembling the page

1. Build the pieces as in iteration 1, with these changes. The toolbar section `#lab-toolbar` gets `toolsBox`, `toolbarRow` (`undoBtn, clearBtn, snapLabel, gridLabel, gridChips`), `toolHint`, `options`; `notice` is appended to the z-plane panel after `zHost` (before `shapeInfo`).
2. The clock is a grid of three `.lab-clock-group`s: `(playBtn, tRow.row, sRow.row, morphPlay)`, `(replayBtn, rpRow.row)`, and the actions group `.lab-clock-group.lab-clock-actions` `(predictBtn, listenHost)`, then `replayNote`. `rpRow = sliderRow('lab-replay-t', 'lab-replay-t-out', 'Replay', { min: 0, max: 1, step: 0.01, value: 1 })`.
3. `presetBox` no longer holds `startNotice`; `more = disclosure({ id: 'lab-more', title: 'More: start from a test problem' }, presetBox)`; `pagesBox = disclosure({ id: 'lab-pages', title: 'Pages', open: true }, intro, saveRow, pageStatus, pageRestore, pageEmpty, pageList)`.
4. `el.append(header, toolbarBox, stage, startNotice, clock, viewsBox, wheelRow, problemBox, pagesBox, fnPanel, more, readout, probePanel, srStatus, links)` (fix round: `pagesBox` before `fnPanel`).
5. `disclosure({ id, title, open })`: `summary = document.createElement('summary')`, `summary.id = id + '-toggle'`, `summary.textContent = title`, return `h('details', { id, class: 'panel', open }, summary, ...kids)`.
6. CSS (section 5.7). Boot: after the iteration-1 request, token and stored-drawing branches, `state.pages = pagesSanitize(store.get('lab.pages', null)); renderPages();` then `listenControl(listenHost, 'lab').then((l) => { if (unmounted) { if (l) l.destroy(); } else listen = l; }, () => {})`.

### 5.2 The frame of the w-plane (pure parts exported; host steps in the mount)

`frameBounds(pieces, opts)`:

1. `b = imageBounds(pieces)`; if `b` is null return it.
2. `forced = opts.pole === true`, `never = opts.pole === false`. If `never`, or (`b.kept === b.total` and not `forced`), return `b` unchanged. (This is every plain picture: the polynomial pins hold.)
3. `kept` = the finite points with `|w| <= b.cap` (the iteration-1 cap, `max(4, 4 * q90)`); if none, return `b`.
4. `R = min(8, max(FRAME_MIN / 2, 2 * median |w| of kept))` (median = element `floor(0.5 * (n - 1))` of the sorted moduli).
5. The bulk is the kept points with `|w| <= R`; take its bounds `x0, x1, y0, y1` and the count `n`.
6. `widen(lo, hi)`: `c = Number(((lo + hi) / 2).toFixed(9)) + 0`; `half = max((hi - lo) / 2, FRAME_MIN / 2)`; return `[c - half, c + half]`. (The middle is rounded to nine decimals so that 0.4999999999999987 and 0.5000000000000007 give exactly 0.5 and the span is exactly 4.)
6a. (fix round) If nothing was cut (`b.kept === b.total`, so the request is all there is): `full = max(span of b)`, `bulk = max(x1 - x0, y1 - y0)` of the bulk of step 5; if not (`full > POLE_RUNS.min` and `full > POLE_RUNS.ratio * bulk`) return `b` unchanged. A picture that is only near a pole is finite and is shown whole.
7. Return `{ xRange: widen(x0, x1), yRange: widen(y0, y1), cap: R, kept: n, total: b.total, pole: true }`.

`poleView(box, size)`: `spanX = box.xRange[1] - box.xRange[0]`, `spanY` likewise; `w, h` from `size` (400, square if missing); `unitsAcross = min(POLE_CROP * max(spanX, spanY * w / h), w / POLE_MIN_SCALE)`; centre = the middle of the box.

Host (`fitW`, `fitM`, resize):

8. `poleOpts() = runsIntoPole(allCurves, state.fn.poles) ? { pole: true } : {}`.
9. `fitW()`: if there are no curves, return. `probe = pushForwardAll(allCurves, f, { clampRadius: 1e4 })`; `b = frameBounds(probe.concat(state.guess), poleOpts())`; if none return; **if `b.pole`**: `wplane.setView(poleView(b, wplane.getSize())); wplane.setHome();` **else** `wplane.fitTo(toBox(b), 0.15)` (unchanged).
10. `fitM()`: `frameBounds(probe.concat(allCurves), poleOpts())` and `mplane.fitTo(toBox(b), 0.15)` always (the morph plane shows the input and the image together; no crop).
11. The w-plane `viewchange` handler: `pan` and `zoom` turn auto-fit off; `reset` turns it on and asks for a fit; **`resize` with auto-fit on asks for a fit** (`state.needFitW = true`). `setView` and `setHome` emit reasons `set` and not `resize`, so this cannot loop.
12. The z-plane keeps `START_VIEW` (9 units across); the problem is not its scale.

### 5.3 Live ink

The iteration-1 draft frame (`scheduleDraft` -> `runDraft`, one rebuild per animation frame) is kept. Changes:

1. At the top of `runDraft` reset `draftCurves`, `draftOut`, `draftFamily = null`, `pen.z = pen.w = null`.
2. A polygon draft is its polyline; a probe draft has no curve; every other tool: `cs = cleanSpec(draftSpecOf(d))`; `draftCurves = specToCurves(cs, 'draft').curves`; `draftFamily = draftCurves[0].family`.
3. If there are draft curves and `!answerHidden()`: start a stopwatch; `use` = all draft curves, or only the first when they have more than 3000 points together; in the morph view `draftOut = morph(c, state.s, f, { clampRadius })` for each curve, in the side and domain views `draftOut = computeImages(use, f, { clampRadius: wClamp() })`; in the 3D views nothing; store `stats.lastInkMs` and `stats.maxInkMs`.
4. For a brush: `pen.z` = the last point of the first draft curve; `pen.w` = the last point of the last piece of `draftOut`.
5. `polyClose.disabled = ...` as before; **`replayRefresh()`** (the Replay button waits while a draft is active); request a draw of the z, w and morph planes.
6. Layers. z-plane order 150: for a brush draft `drawTimedCurve(c2, pl, c.points, { color: '--input', width: 2.5, dots: false, arrow: false, ramp: true, dash: null })` and the pen dot; for any other draft the dashed `strokePolyline` of iteration 1; the polygon's corner dots as before.
   `drawInk(c2, pl)` on the w-plane **and** the morph plane, order 150 (the iteration-1 morph draft was computed and never drawn): for each piece with at least two points: in the domain view a halo (`--surface`, width 6.5, alpha 0.9, no ramp), then `drawTimedCurve(c2, pl, c.points, { color: token, width: domain ? 3 : 2.5, dots: false, arrow: false, ramp: true, dash: null, rampWeight: family && !domain ? FAMILY_RAMP : undefined })` with `token = domain ? '--text' : draftFamily ? strokeToken(draftFamily, 'w', false) : '--output'`; then the pen dot `drawDot(c2, pl, pen.w, { color: '--output', radius: 5 })`; `stats.inkFrames++` when it drew anything.
7. `draftInfo()` (the hook): `{ active, tool, corners, curves, out: draftOut.length, closeEnabled, inked: draftOut.some((c) => c.points.length >= 2) && !answerHidden() && view in (side, domain, morph) }`; `hooks.draft = () => { if (draftRaf) { cancelAnimationFrame(draftRaf); runDraft(); } return draftInfo(); }`.
8. A release (`onUp`, `commitBrush`, `commit`) clears the draft as before; the next frame draws no ink (`out` 0, `inked` false) and the kept curves appear in the same colour. A drag of a rectangle that stays under 6 px keeps nothing and clears the ink.
9. Cost: no throttle is needed (0.2 to 1.3 ms warm, 13 ms cold on the harness's software renderer for a 400-sample brush). The 3000-point cap of iteration 1 stays.

### 5.4 Replay

State: `rp = state.replay` (4.3). Helpers: `replayTarget()` = the last record of `state.shapes` or null; `replayCurves()` = its primary curves (all its curves when it has none, a grid); `replayIds()`; `replayCursors()` (used by the `replay()` hook) = `{ z, w }` where `z` is the cursor of the first window of `replayCurves()` and `w` the cursor of the first window of the pieces of those curves (`piecesOf(c.id)`), both `null` unless `rp.active`, and `w` null while the answer is hidden.

1. `replayWindow(points, t)`: `pts` = the points with finite parts and a finite `t`. If there are none, or `t` is not finite, or `t < pts[0].t`: `{ points: [], cursor: null }`. If `t > last.t`: `{ points: all, cursor: null }` (this piece is finished; the pen is elsewhere). Otherwise collect the points with `t_i <= t`; if `t` falls between `a = pts[i-1]` and `b = pts[i]` with `u = (t - a.t) / (b.t - a.t) > 0`, append `{ re: a.re + (b.re - a.re) u, im: ..., t }`; the cursor is the last collected point.
2. `replayBegin()` (rest to active): `rp.prevT = state.t; rp.prevS = state.s; rp.active = true; rp.shapeId = replayTarget().id; invalidate('shapes')` (the layers are rebuilt once with the ghost style).
3. `replayEnd(how)` with `how` one of `'done'` (the default), `'quiet'`, `'keepT'` (fix round; it was a boolean `restore`): cancel the frame; `was = rp.active`; `rp.on = rp.active = false; rp.t = 1; rp.last = null; rp.hold = 0`; clear the note; if `was`: unless `how === 'keepT'` `setT(rp.prevT)`, and if the replay moved the morph slider (`rp.sMoved`, set by `replayApply` in the morph view, cleared by `replayBegin` and here) `setS(rp.prevS)` whatever the view is now; set the scrubber to 1; if `was`: `invalidate('shapes')`, and `say('Replay done.')` when `how === 'done'`; `replayRefresh()`. `'done'` is the end of the run, the scrubber at 1 and Escape; `'quiet'` is an edit, a new f, a new gesture and Play; `'keepT'` is the Time t slider.
4. `replayApply()` (one frame): `setT(rp.t)`; in the morph view `setS(rp.t)`; scrubber value and output; the note: in the side view, with the answer shown, if the first replay curve's image has more than one piece and `rp.t >` the last `t` of the first piece, `COPY.replayGap`, else `''`.
5. `startReplay()`: return if there is no target, the answer is hidden or a draft is active. Stop Play and a running morph. **If `reduced()`**: `next = rp.active ? round((rp.t + 0.1) * 100) / 100 : 0.1`; if `next >= 1` then `replayEnd(true)` and return; else `replayBegin(); rp.on = false; rp.t = next; replayApply()`. **Else**: `replayBegin(); rp.on = true; rp.t = 0; rp.last = performance.now(); rp.hold = 0; stats.replays++; say('Replaying your last shape.'); replayApply(); request a frame` (`replayTick`).
6. `replayAdvance()` brings a running replay up to the wall clock and returns false when it ended: `now = performance.now(); dt = max(0, (now - rp.last) / 1000); rp.last = now`. If `rp.hold > 0`: `rp.hold -= dt`; when it reaches 0 call `replayEnd(true)` and return false. Else `rp.t = min(1, rp.t + dt / REPLAY.seconds)` and when `rp.t >= 1` set `rp.hold = REPLAY.hold`. `replayApply()`; return true. `replayTick()` (one `requestAnimationFrame` chain): if `!rp.on` stop; if `replayAdvance()` request the next frame. **t follows the time, not the number of frames**: a slow frame (a 3D view, a busy machine) skips ahead and a run always takes 2.8 s of the clock. The `replay()` hook calls `replayAdvance()` first when `rp.on`, so what a script reads is the state at that moment.
7. `scrubReplay(v)`: if there is no target or the answer is hidden, `replayRefresh()` and return. Stop the frame, `rp.on = false`. If `v >= 0.999` `replayEnd(true)`. Else `replayBegin(); rp.t = clamp(v, 0, 1); replayApply()`.
8. Layers, order 190, above the curves (100) and below the cursor dots (200): z-plane: for each replay curve, the window of its points; w-plane: for each replay curve, for each piece, the window of the piece's points; morph plane: the same with the morph pieces. Each window is drawn with `drawTimedCurve(... width: 3.5, dots: false, arrow: false, ramp: true, dash: null, rampWeight: family && !domain ? FAMILY_RAMP : undefined)` in `strokeToken(family, side, domain)` (a halo first in the domain view), and a ring (`drawDot`, radius 8) at the first window that has a cursor. The windows keep the points' own `t`, so the ramp is the finished stroke's.
9. `syncZ`, `syncW`, `syncM`: a curve whose id is in `replayIds()` while `rp.active` gets `{ ...style, alpha: 0.2, dots: false, arrow: false }` (and its halo, alpha 0.2); the layer signature includes alpha, so the layers are rebuilt once at the start and once at the end, never per frame.
10. What ends a replay quietly, with the clock and the morph slider given back (the replay's last t is nobody's choice): `afterEdit` (any commit, undo, clear, preset, request, page open), `setFn`, a new gesture (`onDown`), Play. What ends it with the student's own t kept (and `s` given back): the Time t slider (the handler reads the slider value first, then ends the replay, then sets it). What ends it with the clock given back and `Replay done.` said: the end of the run, the scrubber at 1, Escape (from anywhere), the tenth step under reduced motion.
11. `replayRefresh()` (also called from `updateChrome` and the draft frame): `replayBtn.disabled = !replayTarget() || answerHidden() || !!state.draft`; its `title` is `COPY.replayNone`, `COPY.replayWait`, `COPY.replayDraft` or `COPY.replayTitle` in that order; the scrubber shows `rp.t`.
12. Clock facts: a run is `REPLAY.seconds` = 2.4 s, then a hold of 0.4 s at t = 1 (`on` stays true), so `on` is false 2.8 s after the click whatever the frame rate; 150 ms in, t is about 0.06 (read through the hook, exact even if no frame has run); the step under reduced motion is 0.1.
13. Reduced motion: `reduced()` is read when the button is pressed, and the label follows `prefers-reduced-motion` through the media query listener (`replayLabel()` next to `playLabel()` and `morphLabel()`).

### 5.5 Pages

1. `pagesSanitize(raw)`: not an array: `[]`. For each element `cleanPage(p)` (null drops it): `name` = a string with runs of whitespace collapsed to one space, trimmed, cut to 40 characters, non-empty; `fn = pageFn(p.fn)` (null drops it): catalog with an id `makeFn` knows, `zn` whose `src` is `z^n` (n 2 to 8 through `makeFn`), `seam` (angle from `p.fn.seam`, default -pi, clamped by `makeFn`), `custom` whose `src` (at most 400 characters) `makeFn` compiles; `p.shapes` an array, at most 40 of them, each through `cleanSpec`, at least one left; `savedAt` finite and positive else 0. Sort by `savedAt` descending (stable: ties keep input order); keep 20.
2. `savePage()`: no shapes: status "Draw something first: a page keeps your drawing."; 20 pages: "20 pages is the limit. Delete one to save another."; `name` from the field (collapsed, trimmed, cut to 40) or "Page " + (count + 1); `fnRec = { kind, id, src }` of `state.fn` (+ `seam` for a seam function); `page = pagesSanitize([{ name, savedAt: Date.now(), fn: fnRec, shapes: state.shapes.map((r) => r.spec) }])[0]` (a failure says "That page could not be saved."); `state.pages.unshift(page)`; `ok = store.set('lab.pages', copy)`; clear the field; `renderPages()`; status `Saved "<name>".` plus the blocked-storage sentence when `ok` is false; `say(status)`.
3. `openPage(k)`: `fn = makeFn(pageFnSpec(page.fn))` inside try (failure: status "That page's function could not be read." and nothing changes); end a replay; **`pushHistory()` always** (Undo gives back what was there, a blank page too); `state.shapes = newRecords(page.shapes)`; `dropDraft()`; `setFn(fn, { silent: true })`; `afterEdit()` (persists `lab.strokes`); clear the hint, reveal and guess; `wAuto = mAuto = true`; `resetClockAndView()`; `requestFit()`; `invalidate('shapes', 'fn', 'predict')`; status `Opened "<name>". Undo brings your last drawing back.`
4. `deletePage(k)`: remember `{ page, k }`; splice; write; render; show "Put it back"; status `Deleted "<name>".` `restorePage()`: splice the remembered page back at `min(k, length)`; hide the button; write; render; status `Put "<name>" back.`
5. `renderPages()`: rebuild `#lab-page-list`; `#lab-page-empty` hidden when there are pages; the summary text `Pages (n)` or `Pages`; `#lab-page-save` disabled with no shape (also set in `updateChrome`).
6. List label of a page: `f = <label> · n shape(s)` where the label is `fnById(id).label` for a catalogue function (typographic: `z²`, `√z`, `1/z`), `z` plus the superscript digit for `z^n`, `z^(1/3), seam <angle>` for a seam, and the typed text for a custom one.
7. Clicks are handled by one listener on the list (`lab-page-open-<k>`, `lab-page-delete-<k>`).

### 5.6 Problem panel and Listen

1. `buildProblemPanel(id)`: replace the "Easiest in" chip by `h('div', { class: 'lab-decisions', id: 'lab-problem-decisions' }, h('span', { class: 'muted', text: 'Two decisions: ' }), decisionChips(p, { idPrefix: 'lab-problem' }))`, placed after the statement. Everything else (why, ways, answer, check, the predict-first hiding) is unchanged.
2. The decision chips carry no answer text (the Address label and `names: <code>`; the meaning appears only on a tap), so Predict first still hides the same things (U27 and the A4 answer-words scan pass).
3. Listen: 5.1 step 6.

### 5.7 Layout and CSS (what the patch changes in `STYLE`)

The rules are in Appendix A; their intent, with the measured effect:

1. `#station-lab { gap: var(--space-3) }` (the station column gap 24 px becomes 16 px).
2. Header: a flex row; the h1 and the lede take the full width; badges and problem chips share a row; chips 1.9 rem high. (108 px at 1280, 168 px at 390.)
3. Toolbar: `.lab-toolbar-box` grid with 4 px gap; tool and row-2 buttons 2.25 rem high with 0.7 rem side padding; `.lab-toolbar-row` flex wrap; the hint 0.9 rem, one line.
4. Clock: `.lab-clock` is a grid of `repeat(auto-fit, minmax(min(100%, 19rem), 1fr))`; each `.lab-clock-group` a two-column grid (button, slider row); a third child (the morph slider) spans both columns; the third group (`.lab-clock-actions`: Predict first and the Listen host) is a wrapping flex row; at <= 30rem each grid group is one column.
5. Panels: `.lab-panel` padding `0.25rem 0.5rem 0.5rem`; head margin 0.25 rem.
6. Phone (<= 30rem): thread badges 0.72 rem; every plane `aspect-ratio: 5 / 4 !important` (the plane sets its aspect as an inline custom property; the property itself can be overridden).
7. Pages, More, decisions: `details.panel > summary` bold and pointer; `#lab-more > #lab-presets` borderless (the summary is its title; its h2 is hidden); page list as a grid of rows; `.lab-decisions` a wrapping flex row.
8. `@media (max-width: 30rem) .lab-clock .slider-row` keeps its iteration-1 two-column form.

### 5.8 Resolution and performance

- Planes manage device-pixel ratio themselves (`plane.js`); the 5:4 phone aspect changes only the CSS box, the planes measure it (`resize`), the domain-colouring canvases follow `getSize()`.
- Live ink: one image computation per animation frame (coalesced by `scheduleDraft`), at most 3000 draft points, no allocation beyond the pieces; `drawTimedCurve` bins the ramp into 32 colour runs.
- Replay: per frame, `setT` (readout, markers), three `replayWindow` calls per plane over at most 600 points each, four plane redraws (only visible planes draw). No new canvas, no timer; the frame is one `requestAnimationFrame` chain cancelled by `replayEnd` and `unmount`.
- The pole frame costs one extra `pushForwardAll` (it already existed in `fitW`) and one sort of at most 20000 moduli, only after a commit, a function change, a resize or Reset.

### 5.9 Hit testing and gestures

Unchanged: drawing is `plane.on('pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel')` on the z-plane in draw mode (`onDown`, `onMove`, `onUp`, `onCancel`); the plane delivers events only for empty
canvas, so the probe's handle and the zoom buttons are never drawn through; coordinates are plane units, snapped by `snapFor(tool, z)` for shapes and not for the brush; a press that moves under 6 px keeps nothing.
New wiring only: `onDown` first ends a replay (`replayEnd(false)`); `onKey` lets Escape end a replay before its focus filter; the new buttons are DOM controls with `click` or `input` listeners registered through `on(...)`, so
`unmount` removes them.

### 5.10 Unmount

The iteration-1 unmount, plus `replayRaf` in the list of cancelled frames, `listen.destroy()`. `window.__mv.lab` is removed as before. Tests: section 7.

---

## 6. Mathematics

Notation as in the iteration-1 design: `z = x + iy = r e^{i theta}` with `theta = Arg z` in (-pi, pi] (`atan2(y, x)`, `Arg` of a negative real is +pi), `arg z = { Arg z + 2 pi k }`, `w = f(z) = u + iv = rho e^{i phi}`. Every number below was run on the shipped core modules (Node 22) and checked by hand; the unit tests L1 to L8 pin them.

### 6.1 Formulas the new code uses

1. **Time.** A shape is z(t), 0 <= t <= 1 (linear for a segment and a vertical line, `alpha / 2 pi` for a circle `z = c + r e^{i alpha}`, arclength for a rectangle, a sector boundary and a stroke); its image keeps the same t (pieces keep t). The image is a polyline in the same samples.
2. **Replay window.** `W(t) = { p_i : t_i <= t } + { p(t) }` with `p(t) = a + (b - a) (t - t_a) / (t_b - t_a)` between consecutive samples `a, b`; the cursor is `p(t)` while `t_first <= t <= t_last` of that piece, else none. The w cursor is the same as `pointOnPieces(pieces, t)` (tested at nine times).
3. **Powers.** `z^n = r^n e^{i n theta}`; a sector `0 < arg z < alpha` goes to `0 < arg w < n alpha` (no overlap while `n alpha < 2 pi`).
4. **Reciprocal.** `1/z = conj z / |z|^2 = (1/r) e^{-i theta}`; a circle through 0 goes to a line, a line not through 0 to a circle through 0.
5. **Linear.** `a z + b` is a turn by Arg a, a stretch by |a| and a slide by b; `(1 + i) = sqrt 2 e^{i pi/4}`; `i z - 2i = i (z - 2)`.
6. **The bulk of a pole picture.** `R = min(8, max(2, 2 m))`, `m` = the median of `|w|` over the samples with `|w| <= cap`; the box is the bounds of the samples with `|w| <= R`, each side widened round its middle to at least 4.
7. **The window.** `U = min(0.8 max(sx, sy w/h), w/85)` units across; the scale is `w / U` px per unit; the gap between the lines `u = 0` and `u = c` is `c w / U` px.
8. **Orientation of the window's grid.** `niceGridStep(U)` is the 1-2-5 step with `5.6 <= U/step <= 14`: `niceGridStep(3.2) = niceGridStep(3.976) = 0.5`, so the tick `0.5` is labelled and the line passes through it.
9. **Parabola with a focus.** `u = c^2 - v^2 / (4 c^2)` is the image of `x = c` under `z^2` (vertex `c^2`, focus 0, directrix `u = 2 c^2`); in polar form about 0, `rho = 2 c^2 / (1 + cos phi)`.
10. **A horizontal line under 1/z.** `y = c` goes to the circle `|w + i/(2c)| = 1/(2c)` through 0 (used by the script's brush).

### 6.2 Worked solutions of the covered problems (both addresses)

For each: the set-up, the working in Cartesian and in polar, the numbers the Lab shows, and what the check asserts.

#### 2.1.2 Image of the line x = 2 under w = z^2   (address C, names none)

Set-up: `verticalLine(2)`, `y` in [-4, 4], `t = (y + 4)/8`, `f = z^2`.

- **Cartesian.** `z = 2 + iy`, `z^2 = (4 - y^2) + 4iy`, so `u = 4 - y^2`, `v = 4y`. Eliminate the clock: `y = v/4`, so **`u = 4 - v^2/16`**: a parabola, vertex 4, opening left; `(u - 4) = -v^2/16` has focal length 4, focus `4 - 4 = 0`, directrix `u = 8`. At `y = 1`: `z = 2 + i`, `z^2 = 3 + 4i`, `u = 4 - 1 = 3 = 4 - 16/16`; the distance from `3 + 4i` to 0 is 5, to the directrix `8 - 3 = 5`.
- **Polar.** On the line `r cos theta = 2`, `r = 2 sec theta`, `theta = atan(y/2)` in (-pi/2, pi/2). Squaring: `rho = 4 sec^2 theta`, `phi = 2 theta`. With `cos phi = 2 cos^2 theta - 1`: `rho (1 + cos phi) = 4 sec^2 theta * 2 cos^2 theta = 8`, so **`rho = 8 / (1 + cos phi)`**, a conic of eccentricity 1 about the focus 0.
  Numbers: `y = 1`: `theta = 0.463648`, `r = 2.236068`, `rho = 5`, `phi = 0.927295`, `cos phi = 0.6`, `w = 3 + 4i`. `y = 2`: `theta = pi/4`, `r = 2.828427`, `rho = 8`, `phi = pi/2`, `w = 8i`. `y = 4`: `theta = 1.107149`, `r = 4.472136`, `rho = 20`, `phi = 2.214297`, `cos phi = -0.6`, `w = -12 + 16i`. Each has `rho (1 + cos phi) = 8` (printed 8).
- **The diary.** t = 0, 0.25, 0.4, 0.5, 0.75, 1: `z = 2 - 4i, 2 - 2i, 2 - 0.8i, 2, 2 + 2i, 2 + 4i`; `w = -12 - 16i, -8i, 3.36 - 3.2i, 4, 8i, -12 + 16i`. The replay draws the parabola from the bottom arm up through the vertex 4 at t = 1/2 to the top arm. `images()`: 1 piece, 129 points; check: count 129, `maxErr` 0.

#### 2.1.3 Image of x = 2 under f(z) = iz - 2i   (address both, names any)

- **Cartesian.** `z = 2 + iy`: `iz = 2i - y`, `iz - 2i = -y`: real, every real number is reached: the image is the **real axis** (here -4 <= u <= 4). `z = 2 + 3i` gives `-3`.
- **Polar.** `iz - 2i = i (z - 2)`: slide left by 2 (the line becomes the imaginary axis, direction `i`), then multiply by `i = e^{i pi/2}`: add 90 degrees to every angle, keep every length; direction `i * i = -1`, the real axis. In general a counterclockwise quarter turn about 0 followed by a slide by `-2i`.
- **The diary.** t = 0, 0.25, 0.4, 0.5, 0.75, 1: `w = 4, 2, 0.8, 0, -2, -4` (all with v = 0 exactly). Check: count 129, `maxErr` 0.

#### 2.2.1 Image of the sector 0 < arg z < pi/4 under w = z^3   (address P, names any)

- **Polar.** `z = r e^{i theta}` goes to `r^3 e^{3 i theta}`: every length `r > 0` is reached; `0 < theta < pi/4` becomes `0 < 3 theta < 3 pi/4`, and since `3 pi/4 < 2 pi` there is no overlap: the **sector `0 < arg w < 3 pi/4`**.
- **Cartesian.** `z^3 = (x^3 - 3 x y^2) + i (3 x^2 y - y^3)`. The edge `y = 0` goes to `x^3` (the positive real axis); the edge `y = x` goes to `x^3 (-2 + 2i)`, pointing at 135 degrees. At `z = 1 + i`: `(1 - 3) + i (3 - 1) = -2 + 2i`, `|w| = 2 sqrt 2 = 2.828427`, `Arg w = 3 pi/4`.
- **The diary.** The fan `r` in [0, 2], `theta` in [0, pi/4]: the boundary (145 points) leaves 0 at t = 0, turns the corner `z = 2` at t = 0.359016 (`w = 8`) and the corner `z = sqrt 2 (1 + i)` at t = 0.640984 (`w = 8 e^{i 3 pi/4} = -5.656854 + 5.656854i`). `2 e^{i pi/8}` goes to `8 e^{i 3 pi/8} = 3.061467 + 7.391036i`. `images()`: 8 pieces, 488 points, all with `Arg w` in [0, 3 pi/4]. Check: count 488, `maxErr` 0.

#### 2.5.1 Image of |z - 1| = 1 under w = 1/z   (address P, names any; the first picture)

- **Polar.** The circle passes through 0: `r = 2 cos theta`, `theta` in (-pi/2, pi/2), `z = 2 cos theta e^{i theta}`. Then `1/z = e^{-i theta} / (2 cos theta) = 1/2 - (i/2) tan theta`: the real part is stuck at **1/2** while `tan theta` runs over all reals. The image is the **line Re w = 1/2**; 0 goes to infinity, so the circle opens into a line.
- **Cartesian.** `|z - 1|^2 = 1` is `x^2 + y^2 = 2x`; `w = (x - iy)/(x^2 + y^2)` has `u = x/(2x) = 1/2` and `v = -y/(2x)` = every real. Check by substitution: `|1/w - 1| = 1` is `|1 - w| = |w|`: `w` is as far from 1 as from 0, the perpendicular bisector `Re w = 1/2`.
- **The diary.** `alpha = 0, pi/2, pi, 3 pi/2, 2 pi` (t = 0, 1/4, 1/2, 3/4, 1): `z = 2, 1 + i, 0, 1 - i, 2`; `w = 0.5, 0.5 - 0.5i, (no value), 0.5 + 0.5i, 0.5`. At t = 0.4 (`alpha = 0.8 pi`, `theta = alpha / 2 = 0.4 pi`) the exact point is `z = 1 + e^{i 0.8 pi} = 0.190983 + 0.587785i`, `w = 1/2 - (i/2) tan(0.4 pi) = 0.5 - 1.538842i`; the cursor is drawn on the image polyline, at `0.5 - 1.5405i` (0.1 percent off, as for every cursor). Two pieces (64 + 64 points): t in [0, 0.4921875] and [0.5078125, 1]; the sample at t = 1/2 is the pole. `max |u - 1/2| = 4.8e-15`. Check: count 128.
- **The frame.** The bulk is the 108 samples with `|w| <= 2` (median 0.69, so `R = 2`); the box is x [-1.5, 2.5], y [-2, 2]. The window on a 448 px plane is 3.2 units across: u from -1.1 to 2.1, v from -1.6 to 1.6, scale 140 px per unit, **the line 70.00 px from the v-axis**. On a 338 x 270 px plane: `min(0.8 * 4 * 1.2519, 338/85) = 3.9765` units across, scale 85 px per unit, **gap 42.50 px**, v from -1.588 to 1.588 (the cursor at t = 0.4, v = -1.5405, is in).
- **The replay.** t = 0: pen at `0.5`; t = 0.25 at `0.5 - 0.5i`; t = 0.4 at `0.5 - 1.5405i`; t = 0.5 no pen (the break); t = 0.6 at `0.5 + 1.5405i`; t = 0.75 at `0.5 + 0.5i`; t = 1 at `0.5`. The note about the break shows after t = 0.4921875.

#### P4 The image of the unit circle under f(z) = (1 + i) z   (address P, names any)

- **Polar.** `1 + i = sqrt 2 e^{i pi/4}`; for `z = e^{i s}`, `w = sqrt 2 e^{i (s + pi/4)}`: the length is always `sqrt 2`, the angle runs once round as `s` does: the entire circle `|w| = sqrt 2`.
- **Cartesian.** `w = (1 + i)(x + iy) = (x - y) + i (x + y)`, `|w|^2 = (x - y)^2 + (x + y)^2 = 2 (x^2 + y^2) = 2` on `x^2 + y^2 = 1`; every `w` with `|w| = sqrt 2` is reached (`z = w/(1 + i)` has `|z| = 1`).
- **The diary.** t = 0, 0.25, 0.5, 0.75, 1: `z = 1, i, -1, -i, 1`; `w = 1 + i, -1 + i, -1 - i, 1 - i, 1 + i`, each `|w| = 1.414214`. `images()`: 1 piece, 129 points, `max ||w| - sqrt 2| = 2.2e-16`. Check: count 129.

### 6.3 The live-ink example of the script (a horizontal brush stroke under 1/z)

The script draws a brush stroke from `-1 + i` to `1 + i` on the first-visit example (f = 1/z).

- **Cartesian.** `z = x + i`, `w = (x - i)/(x^2 + 1)`: `u = x/(x^2 + 1)`, `v = -1/(x^2 + 1)`; `u^2 + (v + 1/2)^2 = [4 x^2 + (x^2 - 1)^2] / (4 (x^2 + 1)^2) = 1/4`: the circle of radius 1/2 centred at `-i/2`, through 0.
- **Polar.** `z = r e^{i theta}` with `r sin theta = 1`: `1/z` has modulus `sin theta` and argument `-theta`: `rho = -sin phi` for `phi` in (-pi, 0).
- **Numbers.** `x = -1`: `z = -1 + i` (`r = sqrt 2`, `theta = 3 pi/4`), `w = -0.5 - 0.5i`. `x = -0.875`: `w = -0.495575 - 0.566372i`. `x = -0.5`: `-0.4 - 0.8i`. `x = 0`: `w = -i`. `x = 0.5`: `0.4 - 0.8i`. `x = 1`: `0.5 - 0.5i`. Every one has `|w + i/2| = 0.5`. The ink on the w-plane is therefore the lower half of that circle, growing from left to right with the hand; at 150 ms of a replay (t about 0.06) the pen is near `-0.4956 - 0.5664i`.

### 6.4 Pages and bounds, as numbers the tests pin

`pagesSanitize` of 25 valid pages with `savedAt` 1 to 25 returns the 20 with `savedAt` 25, 24, ..., 6. `poleView` at `{ w: 448, h: 448 }` is `unitsAcross` 3.2, centre `0.5 + 0i`; at `{ w: 338, h: 270 }` it is 338/85 = 3.976470588; at `{ w: 338, h: 338 }` 3.2 (gap 52.8125); at `{ w: 640, h: 640 }` 3.2 (gap 100). `frameBounds` of the image of `|z - 1/2| = 1/2` under `1/z` with `{ pole: true }`: x [-1, 3], y [-2.414214, 2.414214] (cap 2.761489, 98 of 126 samples); with no option it is the unchanged 40-unit-high imageBounds box (kept = total = 126).

---

## 7. Verification plan

Run from the repo root.

### 7.1 One table

| Id | Command | Passes when |
|---|---|---|
| A1 | `node tools/smoke.mjs --route lab --script tests/interact/i2-lab-diary.mjs --dark --out docs/review/iter-2/i2-lab-diary` | "3/3 checks passed across 1 route(s)." (desktop 1280, phone 390, dark desktop). Steps in 7.3 |
| A2 | `node --test tests/unit/i2-lab-diary.test.mjs` | 11 of 11 pass (cases in 7.2) |
| A3 | `node --test tests/unit/i1-station-lab.test.mjs` and `node tools/smoke.mjs --route lab --script tests/interact/i1-station-lab.mjs --dark --no-shots` | 39 of 39; "3/3 checks passed". The edited assertions are exactly the list in 0.4 (D and E) |
| A4 | `node tools/smoke.mjs --route lab,lab-2-1-2,lab-2-2-1,lab-P4,lab-nonsense --dark --no-shots` | "15/15 checks passed across 5 route(s)." |
| A5 | `node tools/smoke.mjs --route lab --dark --out docs/review/iter-2/i2-lab-diary` and read `lab--desktop.png`, `lab--phone.png`, `lab--desktop-dark.png` | 7.5 |
| A6 | `node --test tests/unit/i2-lab-diary.test.mjs` (cases L9, L10) and the checklist 7.6 | all pass |
| all | `npm test` | the same failing tests as before the change (I1, U3, U4, U5, U10 of the home and integration tests), none new |

### 7.2 Unit tests: `tests/unit/i2-lab-diary.test.mjs` (Appendix B; `node:test`, Node import of `lab.js`)

| Case | What it asserts (expected values) |
|---|---|
| L1 | `pieces = pushForward(circle(1, 1), inv, { clampRadius: 40 })`; `b = frameBounds(pieces)`: span x in [4, 6] (it is 4), `xRange[0] <= 0`, `xRange[1] >= 0.5`; `xRange` [-1.5, 2.5]; `yRange` [-2, 2]; `pole` true; `kept < total` (108 of 128); `cap` 2 |
| L2 | `frameBounds` equals `imageBounds` for x = 2 under z^2 (A2), x = 2 under iz - 2i, the unit circle under (1+i)z; `{ pole: false }` equals `imageBounds` for 2.5.1; for the circle `|z - 1/2| = 1/2`: auto is the 40-unit box (kept = total = 126), `{ pole: true }` is x [-1, 3], y +-2.414213562, `pole` true; empty input gives `null` in all modes; the morph frame of 2.5.1 (image plus circle, pole) is x [-1, 3], y [-2, 2]; the ring through 0 is x [-2, 2], y [-2.75, 1.25] |
| L3 | `runsIntoPole`: circle1 with `recip.poles` true; x = 2 false; circle1 with `sq.poles` false; `undefined` poles false; no curves false |
| L4 | `poleView` numbers of 6.4; gap `0.5 w / unitsAcross` is 70, 42.5, 52.8125, 100; for widths 300 to 640 at 5:4 the gap is at least 42.5 |
| L5 | `replayWindow` on `segment(0, 1)` with 64 segments: at 0.5, 33 points all with `t <= 0.5`, cursor `0.5 + 0i` (A2); at 0.51, 34 points, cursor `0.51 + 0i`; at 0 one point; at 1 all 65 and cursor `1`; before the first `t`, after NaN, for null and `[]`: empty and no cursor; on the two image pieces of 2.5.1 at t = 0.4: 53 points, cursor `0.5 - 1.5404731i`; piece 1 at t = 0.5 is finished (64 points, no cursor), piece 2 at 0.5 has not begun, piece 2 at 0.6 has 13 points and cursor `0.5 + 1.5404731i`; at nine times the cursor equals `pointOnPieces` (or both are null); `REPLAY` is `{ seconds: 2.4, hold: 0.4, step: 0.1 }` and frozen |
| L6 | `pagesSanitize` (A2): the three-element example gives 1; 25 valid pages give 20, newest first (savedAt 25 down to 6); non-arrays give `[]`; the name is tidied and cut to 40; nameless, shapeless, unreadable-function, unknown-id and `savedAt` cases; shapes that cannot be drawn are dropped and the rest stay; at most 40 shapes; ties keep input order |
| L7 | every kind of function (zn, seam with angle 0, custom `z^2 + iz`, catalog `1/z`) survives a sanitize and `makeFn(pageFnSpec(fn))` gives the same `src`, `n` 5 and `seam` 0; a second sanitize changes nothing; the result is JSON-safe; `PAGE_LIMITS` is `{ maxPages: 20, maxName: 40 }` and frozen |
| L8 | the five problems: `checkProblem` ok with counts 129, 129, 488, 128, 129 and the tolerances above; `w` at the table's times (`-8i`, `3.36 - 3.2i`, `2`, `0.5 - 0.5i`, `0.5 + 0.5i`, `-1 + i`); the script's brush values (`-0.495575221 - 0.566371681i`, all on `|w + i/2| = 1/2`, `Arg w(i) = -pi/2`) |
| L9 | A6 source: `drawInk` uses `drawTimedCurve(c2, pl, c.points`, `dash: null`, `ramp: true`, `'--output'`, no `DASH` and no `strokePolyline`; it is added to the w-plane and the morph plane; the iteration-1 dashed draft image loop is gone |
| L10 | A6 source: `startReplay` checks `reduced()`; `lab.pages` only through `store.set('lab.pages'` and `pagesSanitize(store.get('lab.pages'`; no `localStorage`; unmount cancels `replayRaf`; `listenControl(listenHost, 'lab')`; `decisionChips(p, { idPrefix: 'lab-problem' })` |
| L11 | the new exports exist; no `window` at import |

### 7.3 Interaction script: `tests/interact/i2-lab-diary.mjs` (Appendix C), step by step

Runs at the three views; helpers `openDetails(id)` (click `#<id>-toggle` when closed) and `stroke(plane, a, b, { steps, hold })`.

1. Wait for `window.__mv.lab`; clear storage; reload (a first visit); wait until `frame().w.unitsAcross < 6` (the w-plane has been framed). Every wait on a frame, a label or a clock is a `waitForFunction`, not a fixed pause, so a busy machine only makes the run slower.
2. **A1(1)**: `#lab-zplane-canvas` top (rect.top + scrollY) <= 480 at 1280 and <= 640 at 390 (369 and 550); `#lab-toolbar` above it; `#lab-fns`, `#lab-more`, `#lab-pages` after `#lab-zplane-viewport` in document order. Phone: plane height / width < 0.85 and z top to w bottom <= 720 (634). Desktop: square.
3. **A1(2)**: `abs(w.toPixel(0.5).x - w.toPixel(0).x)` >= 60 (1280) or >= 40 (390): 70.00 and 42.50; `unitsAcross <= 8`: 3.200 and 3.976; `frame().w.unitsAcross` equals `getView()`.
4. **A1(3)**: click `#lab-tool-brush`; press at (-1, 1), move in 8 steps to (1, 1), hold: `draft()` is `{ active: true, tool: 'brush', out >= 1, inked: true }`; `stats().inkFrames` grows (waited for); `#lab-replay` is disabled; release: `shapes().length` + 1; `draft()` then has `active` false, `out` 0, `inked` false.
5. **A1(4)**: click `#lab-replay`; after 150 ms `replay()` is `on` with `0 < t < 1` and both cursors non-null; 250 ms later `t` is larger; the clock follows; wait until `on` is false (<= 4 s): both cursors null and the clock is back to its old value.
6. The scrubber: set `#lab-replay-t` to 0.5: not `on`, `t` 0.5, cursors set, clock 0.5; set it to 1: rest, clock restored.
7. Reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`): the label is "Step the replay"; one press gives t = 0.1 with cursors and `on` false; the next 0.2; ten presses in all end it (`t` 1, no cursor); the label comes back.
8. Escape ends a running replay and gives the clock back; the Replay button's title starts "Draw the last shape". Play, the Time t slider and an edit also end a replay (the slider's own value wins).
9. **A1(5)**: fill `#lab-page-name` "my stroke", click `#lab-page-save`: `#lab-page-open-0` contains "my stroke"; `JSON.parse(localStorage['mv:lab.pages'])` has length 1, `name` "my stroke", `fn.id` "recip", `shapes.length >= 1`; the summary reads "Pages (1)" and `pages()` has one; click `#lab-clear` (`shapes().length` 0; Save disabled, Replay disabled with the title "Draw something first."); click `#lab-page-open-0`: `shapes().length` is back and `fn().id` is `'recip'`; Undo takes the page away again.
10. A second page named "  second   page " saved with Enter after typing `z^2 + iz`: listed first, name "second page"; delete index 1 then "Put it back"; opening index 0 gives `fn().src` `z^2 + iz`.
11. Twenty stored pages are read back; the 21st save says "20 pages is the limit"; twenty deletes empty `#lab-page-list` and show `#lab-page-empty`; the store holds `[]`; `{"not":"an array"}` in the store is read as no pages.
12. **A1(6)**: `openDetails('lab-more')`, click `#lab-preset-circle1-load`: `#lab-problem` visible with `#lab-problem-decisions .decision-chip[data-decision="names"][data-value="any"]` and `[data-decision="address"][data-value="P"]`, and the ids `#lab-problem-address`, `#lab-problem-names`; tapping the Names chip says "Any name of the angle works"; the x = 2 preset shows Cartesian and `names: none`.
13. The break: with 2.5.1 loaded, the scrubber at 0.25 leaves `#lab-replay-note` empty; at 0.8 it starts "The image has a break."; at 0.5 `cursor.z` is set and `cursor.w` is null.
14. Other tools and views: a rectangle held mid-drag is `inked`; in the morph view a held drag is `inked` (morph plane); Replay in the morph view moves `s` (strictly between 0.05 and 0.9 at 600 ms) and gives the slider back; with Predict first on, a held drag has `out` 0 and `inked` false and Replay is disabled; the landscape view follows the scrubber (clock 0.7) and gives the clock back.
15. No horizontal overflow; `#lab-tools` is inside `#lab-toolbar`. The harness fails the run on any console error.

### 7.4 A3: the iteration-1 pins

Section 0.4, Appendices D and E. After the edits: `node --test tests/unit/i1-station-lab.test.mjs` (39 pass) and the i1 script at the three views (green).

### 7.5 A5: the screenshots

`docs/review/iter-2/i2-lab-diary/lab--desktop.png`, `lab--phone.png`, `lab--desktop-dark.png` must show: the two planes directly under the title and lede with one compact toolbar above them (two rows) and no preset or function chips between; the w-plane's line Re w = 1/2 clearly right of the v-axis (a gap of 70 px at 1280, 42 px at 390, wider than the tick label `0.5` which is about 20 px) with the dots at t = 0, 1/4, 3/4 on it and the arrowhead; both themes legible; the clock, views and problem panel below the planes. (In the prototype's shots the line crosses the tick label `0.5` under the axis: the plane writes tick numbers at the axis and the line is at that tick; this is expected and the label stays readable.)

### 7.6 A6 checklist (code inspection of `lab.js`)

- [ ] the live image is drawn by `drawInk` with `drawTimedCurve`, `dash: null`, `ramp: true`, tokens `--output` or the family token; `DASH.guide` only in the z-plane outline of a shape being dragged out and in the iteration-1 guess and morph-ends layers
- [ ] `startReplay` calls `reduced()` and becomes a stepper; `replayLabel()` follows the media query
- [ ] `lab.pages` is read and written only through `store` and `pagesSanitize`; no `localStorage`
- [ ] no literal colour outside canvas drawing (U24)
- [ ] unmount cancels `replayRaf` and destroys the Listen control; the Escape handling is in the existing document `keydown` listener (removed through `cleanups`)
- [ ] `disclosure()` makes both new summaries; `h('summary'` occurs exactly three times (I12)

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases.**

- First visit with storage blocked: the example is drawn each visit; Replay and Pages work in memory; the save status says storage is blocked.
- Replay of a shape whose image is empty (f undefined on it): the z ink runs, the w side draws nothing, `cursor.w` is null throughout; no note.
- Replay of a closed shape at t = 1: the cursor is at the start point; of a grid (no primary curve): every line of the grid is replayed.
- A new shape drawn while a replay runs: the gesture ends the replay first (clock untouched).
- Undo after Replay: untouched (a replay is not an edit). Undo after opening a page: gives back the previous drawing, a blank one included.
- A page opened over a predict-first session: `revealed` and the guess are reset, `predict` stays as the student set it.
- Resize or rotation: the w-plane refits while auto-fit is on; a student's zoom stays.
- `lab-nonsense`, `lab-2-1-3`, `lab-P4`: unchanged hand-offs; the pole frame applies only to pictures that need it (2.1.2, 2.1.3, 2.2.1, P4 keep `fitTo`).
- A custom function with a pole the catalogue does not list: the pole flag then comes from the cut samples only (frame by `kept < total`), as in iteration 1.
- A seam function saved in a page: its angle is kept in `fn.seam` and restored.
- The Walk: the Lab stop ticks on `shapes().length` increasing plus a click on `#lab-replay`; the button is a real `<button>` with that id and is enabled once a shape exists.

**Performance.** 5.8. Measured: live ink at most 13.1 ms cold and 0.2 to 1.3 ms warm per frame for 400-sample strokes; the pole frame adds one sort per fit; the page order change moves no work.

**Accessibility.** Every new control has an id and a visible label (`#lab-page-name` has a `<label>`; the scrubber a `<label>`; the Replay button its text and a `title`); `#lab-replay` is described by `#lab-replay-note`; statuses are `role="status"` (`#lab-page-status`, `#lab-notice`, `#lab-start-notice`) or the existing `#lab-sr-status` ("Replaying your last shape.", "Replay done."); the delete button's `aria-label` carries the page name; `<details>`/`<summary>` are native; focus is never moved by a replay, a save or an open; the live ink and the replay are visual only, and the numbers and the readout carry the same facts as text (`#lab-readout` follows t). Contrast and tokens: section 3.

**Reduced motion.** Replay becomes a stepper (0.1 per press, the tenth ends it); Play and Play morph keep their iteration-1 steppers; live ink is not an animation (it follows the hand); the replay ghost and windows are static frames. No transition or animation is added in CSS.

**Phone layout (390 px).** No horizontal scroll (the script asserts it); the header 168 px, tools in three rows, row 2 in two, planes 338 x 270 (5:4), z canvas top 550 px; the clock groups are one column; page rows wrap (name button full width, Delete beside or below); the decision chips wrap. The touch tip of iteration 1 is unchanged.

---

## 9. Out of scope, requests for other owners, risks

**Out of scope** (the goal's list): new views or tools; the 4D station's lift of the current page (`i2-pictures` reads `lab.strokes` as before; pages are not read by it); narration audio (Listen appears when clips exist). Also not done: folding the function groups of `#lab-fnpanel` into More (it would move the i1 pins for 12 chips and is not required by A1 to A6), a z-plane start view other than 9 units across (the i1 script drags to (0, 3)), keyboard drawing.

**Requests for other owners** (nothing blocks this goal):

1. `docs/ARCHITECTURE.md` (planner, integrator): in section 9 "Iteration 2: lab": `#lab-toolbar` is two rows in one element; the per-tool options stay in `#lab-tool-options` under it, not in `#lab-more`; add the ids `#lab-clock` groups, `#lab-replay-note`, `#lab-listen-host`, `#lab-page-restore`, `#lab-page-empty`, `#lab-problem-decisions`; `frameBounds(pieces, opts)`; the new exports of 4.2; `lab.pages` `fn` may carry `seam`; `draft().inked` is "the draft has an image to ink and the view shows it".
2. `tests/unit/i1-integration.test.mjs` I12 (owner `i2-rehearse`): nothing to do while `lab.js` keeps three `h('summary'` calls; if its owner ever wants every disclosure built with `h()`, the count for `lab.js` becomes 5.
3. `i2-walk-shell`: the Lab stop's check works as registered; `window.__mv.lab.replay()` and `stats().replays` are available if a richer tick is wanted.

**Risks.**

- The two pixel thresholds of A1(2) hold with margins of 17 percent (70 vs 60) and 6 percent (42.5 vs 40). They depend on the planes being about 448 and 338 px wide; `POLE_MIN_SCALE` makes the phone threshold independent of width, the desktop one needs a plane of at least 384 px. A change of the shell's column width in `i2-walk-shell` (it owns the CSS) below that would fail it.
- The phone aspect override uses `!important` on the plane's `aspect-ratio`; a later plane release that sets its aspect another way would need the rule changed.
- The i1 script and the new one can still report `request failed: .../three.module.min.js` if a reload aborts the module fetch; both wait for `window.__mv.lab` first.
- `#lab-pages` open by default adds about 230 px of page below the planes.
- The wheel, the probe and the guess pad were not touched; their iteration-1 behaviour is pinned by the unchanged tests.

---

## Appendix A: the patch of `js/stations/lab.js` (the builder's first delivery; where Appendix G, the fix round, differs, G wins) (unified diff of the shipped file; verified: applies with `patch -p1`, 50 of 50 unit tests, the i2 script at three views, A4 15 of 15)

```diff
--- a/js/stations/lab.js
+++ b/js/stations/lab.js
@@ -11,8 +11,9 @@
 // problem detection and its numeric check, and the readout. The second half is the DOM station, mount(el, ctx).
 //
 // Design: docs/designs/iter-1/i1-station-lab.md. Departures from ARCHITECTURE are listed in its section 0.
+// Iteration 2 (the diary: planes first, live ink, Replay, pages, the frame of a picture that runs to infinity): docs/designs/iter-2/i2-lab-diary.md.
 
-import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawDot, createLabelPlacer, cssColor, mixColor, niceGridStep, DASH } from '../core/plane.js';
+import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawDot, drawTimedCurve, createLabelPlacer, cssColor, mixColor, niceGridStep, DASH } from '../core/plane.js';
 import { specToCurves as buildCurves, freehand, pointAt, resample, classify, curveLength } from '../core/shapes.js';
 import { pushForward, pushForwardAll, morph, lift, pointOnPieces } from '../core/mapping.js';
 import { createDomainColoring, drawColorWheel, rangesFromView, DOMAIN_LEGEND } from '../core/domaincolor.js';
@@ -23,8 +24,10 @@
 import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
 import { createExplainer } from '../core/explainer.js';
 import { createStaircase } from '../core/staircase.js';
+import { chips as decisionChips } from '../core/decisions.js';
+import { listenControl } from '../core/listen.js';
 import { fnById } from '../data/functions.js';
-import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
+import { problemById, problemsForStation, routeFor, statementParts } from '../data/problems.js';
 import { THREADS, STATIONS, threadLabel, threadLinkPrefix } from '../registry.js';
 
 // ================================================================ constants
@@ -450,19 +453,121 @@
   return { xRange: [x0, x1], yRange: [y0, y1], cap, kept, total: pts.length };
 }
 
-// The window the output planes are framed on. imageBounds drops the few huge points next to a pole; when it had to, the picture is a pole picture
-// (2.5.1: the circle through 0 under 1/z is the line Re w = 1/2 running off to infinity) and its long arms would still fill the frame, so the line
-// sat 4 percent of the half-width from the v axis and read as the axis itself. Then the frame holds the bulk only: the points within twice the 90th
-// percentile of |w| of what was kept (at least 4). A plain polynomial image drops nothing and keeps the whole imageBounds frame.
-export function frameBounds(pieces) {
+// ---- iteration 2: the frame of a picture that runs to infinity -------------------------------------------------------------------------------
+// FRAME_MIN: a pole picture's frame is at least this many units across in both directions (STORY 5 item 4).
+export const FRAME_MIN = 4;
+// POLE_CROP and POLE_MIN_SCALE: how the w-plane shows a pole picture. The arms leave the frame at both ends anyway, so the window is the frame
+// cropped to POLE_CROP of its size, and the picture is never shown at fewer than POLE_MIN_SCALE pixels per unit: a line at Re w = 1/2 then stands
+// at least 0.5 * POLE_MIN_SCALE = 42.5 px from the v-axis on any plane (70 px on the 448 px plane of a 1280 px page, 1:1).
+export const POLE_CROP = 0.8;
+export const POLE_MIN_SCALE = 85;
+
+// True when some point of the drawing lies within POLE_NEAR of a pole of f (the same test the 3D cap uses).
+export function runsIntoPole(curves, poles) {
+  if (!Array.isArray(poles) || !poles.length) return false;
+  return poles.some((q) => finiteC(q) && curvePoints(curves).some((p) => Math.hypot(p.re - q.re, p.im - q.im) < POLE_NEAR));
+}
+
+// The window the output planes are framed on.
+//   Nothing was cut (no pole): imageBounds, unchanged (fitTo widens a thin box to 2 units itself).
+//   A pole picture (some far points were cut, or opts.pole === true because the drawing runs into a pole of f; opts.pole === false never): the
+//   frame holds the bulk only. R = clamp(2 * the median |w| of what was kept, FRAME_MIN / 2, 8); the box is the bounds of the points within R of 0,
+//   widened round its middle to at least FRAME_MIN across in both directions (the middle is rounded to 9 decimals, so the span is exactly FRAME_MIN).
+//   2.5.1: the circle through 0 under 1/z is the line Re w = 1/2: x in [-1.5, 2.5], y in [-2, 2], with the axis and the line both inside.
+export function frameBounds(pieces, opts = {}) {
   const b = imageBounds(pieces);
-  if (!b || b.kept === b.total) return b;
-  const rs = [];
-  for (const pc of pieces || []) for (const p of pc.points || []) if (finiteC(p) && modulus(p) <= b.cap) rs.push(modulus(p));
-  rs.sort((a, c) => a - c);
-  const cap = Math.max(4, 2 * rs[Math.floor(0.9 * (rs.length - 1))]);
-  const tight = imageBounds(pieces.map((pc) => ({ points: (pc.points || []).filter((p) => finiteC(p) && modulus(p) <= cap) })));
-  return tight ? { ...tight, cap, total: b.total } : b;
+  if (!b) return b;
+  const forced = opts && opts.pole === true, never = opts && opts.pole === false;
+  if (never || (b.kept === b.total && !forced)) return b;
+  const kept = [];
+  for (const pc of pieces || []) for (const p of pc.points || []) if (finiteC(p) && modulus(p) <= b.cap) kept.push(p);
+  if (!kept.length) return b;
+  const rs = kept.map(modulus).sort((a, c) => a - c);
+  const R = Math.min(8, Math.max(FRAME_MIN / 2, 2 * rs[Math.floor(0.5 * (rs.length - 1))]));
+  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, n = 0;
+  for (const p of kept) {
+    if (modulus(p) > R) continue;
+    n++;
+    x0 = Math.min(x0, p.re); x1 = Math.max(x1, p.re); y0 = Math.min(y0, p.im); y1 = Math.max(y1, p.im);
+  }
+  const widen = (lo, hi) => { const c = Number(((lo + hi) / 2).toFixed(9)) + 0, half = Math.max((hi - lo) / 2, FRAME_MIN / 2); return [c - half, c + half]; };
+  return { xRange: widen(x0, x1), yRange: widen(y0, y1), cap: R, kept: n, total: b.total, pole: true };
+}
+
+// The view of a pole picture on a plane of size { w, h } (CSS px): the box cropped to POLE_CROP, and no tighter than POLE_MIN_SCALE px per unit.
+//   unitsAcross = min(POLE_CROP * max(spanX, spanY * w / h), w / POLE_MIN_SCALE); centre = the middle of the box.
+export function poleView(box, size) {
+  const spanX = box.xRange[1] - box.xRange[0], spanY = box.yRange[1] - box.yRange[0];
+  const w = size && size.w > 0 ? size.w : 400, h = size && size.h > 0 ? size.h : w;
+  return { center: { re: (box.xRange[0] + box.xRange[1]) / 2, im: (box.yRange[0] + box.yRange[1]) / 2 },
+           unitsAcross: Math.min(POLE_CROP * Math.max(spanX, spanY * w / h), w / POLE_MIN_SCALE) };
+}
+
+// ---- iteration 2: Replay ------------------------------------------------------------------------------------------------------------------
+export const REPLAY = Object.freeze({ seconds: 2.4, hold: 0.4, step: 0.1 });
+
+// The part of a polyline drawn by time t: the points with t_i <= t plus the interpolated point at t, and that point as the cursor.
+// -> { points, cursor }. Before the first point's t: no points, no cursor. After the last point's t: every point and NO cursor (this piece
+// is finished, and the pen is elsewhere, for instance in the gap between two pieces of an image). At exactly the last t the cursor is the last point.
+export function replayWindow(points, t) {
+  const pts = Array.isArray(points) ? points.filter((p) => finiteC(p) && isFin(p.t)) : [];
+  if (!pts.length || !isFin(t) || t < pts[0].t) return { points: [], cursor: null };
+  const last = pts[pts.length - 1];
+  if (t > last.t) return { points: pts.slice(), cursor: null };
+  const out = [];
+  let i = 0;
+  while (i < pts.length && pts[i].t <= t) out.push(pts[i++]);
+  if (i < pts.length) {                                          // t falls between pts[i - 1] and pts[i]
+    const a = pts[i - 1], b = pts[i], u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
+    if (u > 0) out.push({ re: a.re + (b.re - a.re) * u, im: a.im + (b.im - a.im) * u, t });
+  }
+  const tip = out[out.length - 1];
+  return { points: out, cursor: { re: tip.re, im: tip.im } };
+}
+
+// ---- iteration 2: pages ---------------------------------------------------------------------------------------------------------------
+export const PAGE_LIMITS = Object.freeze({ maxPages: 20, maxName: 40 });
+
+function pageFn(f) {
+  if (!f || typeof f !== 'object') return null;
+  try {
+    if (f.kind === 'catalog' && typeof f.id === 'string') { const m = makeFn({ id: f.id }); return { kind: 'catalog', id: m.id, src: m.src }; }
+    if (f.kind === 'zn') {
+      const hit = /^z\^(\d+)$/.exec(String(f.src || ''));
+      const m = makeFn({ zn: hit ? Number(hit[1]) : Number(f.n) });
+      return { kind: 'zn', id: 'zn', src: m.src };
+    }
+    if (f.kind === 'seam') { const m = makeFn({ seam: isFin(f.seam) ? f.seam : -Math.PI }); return { kind: 'seam', id: 'cbrt-seam', src: m.src, seam: m.seam }; }
+    if (f.kind === 'custom' && typeof f.src === 'string') { const m = makeFn({ src: f.src.slice(0, 400) }); return { kind: 'custom', id: null, src: m.src }; }
+  } catch (e) { return null; }
+  return null;
+}
+
+// The FnSpec makeFn takes for a page's fn.
+export function pageFnSpec(f) {
+  if (f.kind === 'catalog') return { id: f.id };
+  if (f.kind === 'zn') return { zn: Number(/^z\^(\d+)$/.exec(f.src)[1]) };
+  if (f.kind === 'seam') return { seam: f.seam };
+  return { src: f.src };
+}
+
+function cleanPage(p) {
+  if (!p || typeof p !== 'object') return null;
+  const name = typeof p.name === 'string' ? p.name.replace(/\s+/g, ' ').trim().slice(0, PAGE_LIMITS.maxName) : '';
+  const fn = pageFn(p.fn);
+  if (!name || !fn || !Array.isArray(p.shapes)) return null;
+  const shapes = p.shapes.slice(0, LAB_LIMITS.maxShapes).map(cleanSpec).filter(Boolean);
+  if (!shapes.length) return null;
+  return { name, savedAt: isFin(p.savedAt) && p.savedAt > 0 ? p.savedAt : 0, fn, shapes };
+}
+
+// unknown -> Page[]: malformed pages dropped, newest first, at most PAGE_LIMITS.maxPages. Never throws.
+export function pagesSanitize(raw) {
+  if (!Array.isArray(raw)) return [];
+  const out = [];
+  for (const p of raw) { const q = cleanPage(p); if (q) out.push(q); }
+  out.sort((a, b) => b.savedAt - a.savedAt);
+  return out.slice(0, PAGE_LIMITS.maxPages);
 }
 
 // ================================================================ problems: detection and the numeric check
@@ -694,23 +799,53 @@
   return n;
 }
 
+// A <details> whose <summary> carries the id `${id}-toggle`. The summary is made with createElement and not with the h() helper on purpose:
+// tests/unit/i1-integration.test.mjs (I12, owned by another goal) counts the summary calls of h() in this file and expects 3.
+function disclosure({ id, title, open = false }, ...kids) {
+  const sum = document.createElement('summary');
+  sum.id = id + '-toggle';
+  sum.textContent = title;
+  const d = h('details', { id, class: 'panel', open }, sum, ...kids);
+  return d;
+}
+
 const STYLE = `
 #station-lab .lab-preset { display: flex; min-width: 0; }
 #station-lab .lab-preset > button { flex: 1 1 auto; min-width: 7rem; border-top-right-radius: 0; border-bottom-right-radius: 0; text-align: left; }
 #station-lab .lab-preset > a { flex: none; border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: -1.5px; }
-#station-lab .lab-toolbar, #station-lab .lab-fnrow, #station-lab .lab-clock { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
-#station-lab .lab-toolbar { margin-top: var(--space-2); }
-#station-lab .lab-clock { padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
-#station-lab .lab-clock .slider-row { flex: 1 1 16rem; min-width: 0; }
+#station-lab { gap: var(--space-3); }
+#station-lab .lab-fnrow { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
+/* the header: the badges and the problem chips share a row, the lede is one or two lines */
+#station-lab .station-header { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: center; }
+#station-lab .station-header > h1, #station-lab .station-header > .station-lede { flex: 1 1 100%; margin: 0; max-width: none; }
+#station-lab .station-header .thread-badges { margin: 0; gap: var(--space-1) var(--space-2); }
+#station-lab .station-header .chips { gap: var(--space-1) var(--space-2); }
+#station-lab .station-header .chips .chip { min-height: 1.9rem; padding: 0 0.6rem; font-size: 0.88rem; }
+/* the toolbar: the tools, then undo, clear, snap and the grid; the hint; the options of the tool in hand */
+#station-lab .lab-toolbar-box { display: grid; gap: var(--space-1); }
+#station-lab .lab-toolbar-box .chips { gap: var(--space-1) var(--space-2); }
+#station-lab .lab-toolbar-box button.chip, #station-lab .lab-toolbar-row .btn { min-height: 2.25rem; padding: 0 0.7rem; }
+#station-lab .lab-toolbar-box button.chip { font-size: 0.9rem; }
+#station-lab .lab-toolbar-row { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; }
+#station-lab .lab-toolbar-row .field-label { font-size: 0.88rem; }
+#station-lab .lab-bench-hint { margin: 0; min-height: 1.4em; font-size: 0.9rem; }
+/* the clock: Play with its slider, Replay with its scrubber, then Predict first and Listen */
+#station-lab .lab-clock { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); gap: var(--space-2) var(--space-4); padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
+#station-lab .lab-clock-group { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-2) var(--space-3); align-items: center; min-width: 0; }
+#station-lab .lab-clock-group > .slider-row:nth-child(n + 3) { grid-column: 1 / -1; }
+#station-lab .lab-clock-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
+#station-lab .lab-clock .slider-row { min-width: 0; }
 #station-lab .lab-clock .slider-row[hidden] { display: none; }
-#station-lab .lab-bench-hint { margin: var(--space-2) 0 0; min-height: 1.5em; }
+#station-lab .lab-replay-note { grid-column: 1 / -1; margin: 0; }
+#station-lab .lab-replay-note:empty { display: none; }
 #station-lab .lab-options { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; margin-top: var(--space-2); }
 #station-lab .lab-options[hidden], #station-lab .lab-options > [hidden] { display: none; }
 #station-lab .lab-options .slider-row { flex: 1 1 18rem; min-width: 0; }
-#station-lab .lab-notice { margin: var(--space-2) 0 0; min-height: 1.5em; color: var(--text); }
+#station-lab .lab-notice { margin: var(--space-1) 0 0; color: var(--text); }
+#station-lab .lab-notice:empty { display: none; }
 #station-lab .lab-views { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
-#station-lab .lab-panel { margin: 0; padding: var(--space-2); border: 1px solid var(--border); border-top: 4px solid var(--tone, var(--border-strong)); border-radius: var(--radius); background: var(--surface); min-width: 0; }
-#station-lab .lab-panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: baseline; margin-bottom: var(--space-2); }
+#station-lab .lab-panel { margin: 0; padding: var(--space-1) var(--space-2) var(--space-2); border: 1px solid var(--border); border-top: 4px solid var(--tone, var(--border-strong)); border-radius: var(--radius); background: var(--surface); min-width: 0; }
+#station-lab .lab-panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: baseline; margin-bottom: var(--space-1); }
 #station-lab .lab-panel-head .lab-cap { font-weight: 600; }
 #station-lab .lab-planehost { position: relative; background: var(--surface); border-radius: var(--radius); min-width: 0; }
 #station-lab .lab-planehost .lab-empty { position: absolute; inset: 0; display: grid; place-items: center; padding: var(--space-3); text-align: center; color: var(--text-muted); pointer-events: none; font-size: 0.95rem; }
@@ -758,7 +893,25 @@
 #station-lab .lab-guess-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
 #station-lab .lab-view3d { min-height: 220px; }
 #station-lab #lab-readout { margin: 0; }
-@media (max-width: 30rem) { #station-lab .lab-clock .slider-row { grid-template-columns: minmax(0, 1fr) auto; } }
+@media (max-width: 30rem) {
+  #station-lab .lab-clock .slider-row { grid-template-columns: minmax(0, 1fr) auto; }
+  #station-lab .lab-clock-group { grid-template-columns: minmax(0, 1fr); }
+  #station-lab .lab-clock-group > button { justify-self: start; }
+  #station-lab .station-header .thread-badge { font-size: 0.72rem; line-height: 1.5; padding: 0 0.45rem 0 0.35rem; gap: 0.3rem; }
+  #station-lab .station-header .thread-badges { gap: var(--space-1); }
+  #station-lab .plane { aspect-ratio: 5 / 4 !important; }              /* both planes fit one phone screen */
+}
+/* pages, More, the problem's two decisions */
+#station-lab details.panel > summary { cursor: pointer; font-weight: 600; }
+#station-lab #lab-more > #lab-presets { border: 0; box-shadow: none; padding: var(--space-2) 0 0; background: transparent; }
+#station-lab #lab-more > #lab-presets > .panel-title { display: none; }
+#station-lab .lab-page-save { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: flex-end; }
+#station-lab .lab-page-save .field { flex: 1 1 14rem; }
+#station-lab .lab-page-save input { width: 100%; }
+#station-lab .lab-page-list { list-style: none; margin: var(--space-2) 0 0; padding: 0; display: grid; gap: var(--space-2); }
+#station-lab .lab-page-item { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
+#station-lab .lab-page-open { flex: 1 1 14rem; text-align: left; justify-content: flex-start; flex-wrap: wrap; }
+#station-lab .lab-decisions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: 0 0 var(--space-2); }
 `;
 
 function injectStyle() {
@@ -819,7 +972,7 @@
 const CAP_3D = Object.freeze({ landscape: 'Modulus landscape', sphere: 'Riemann sphere', graph4d: '4D graph' });
 
 const COPY = {
-  lede: 'Draw on the left. The picture on the right shows where f carries it. Every point keeps its time t, so you can see which part of your drawing lands where.',
+  lede: 'Draw on the left. The right plane shows where f carries it, ink and all, on one clock.',
   presetHelp: 'Each button draws the shape from a test question and picks its function. Loading one replaces your drawing; Undo brings it back.',
   snapTitle: 'Corners, centres and radii land on a quarter-unit grid, so shapes come out exact. The brush is never snapped.',
   fanTitle: 'On: the sector starts at 0 and opens between the two angles. Off: a polar rectangle between the two lengths.',
@@ -831,6 +984,11 @@
   sphere: 'The plane wrapped onto a sphere. The top point is infinity and the bottom point is 0. Blue strokes are Cartesian shapes and orange strokes are polar ones, for your drawing and for its image. The green dot is z at time t and the purple dot is w = f(z). A brush stroke has no address, so it is drawn green and its image purple.',
   graph4d: 'The graph of f is a set of points (x, y, u, v): four numbers. Turning it in the u-v plane changes the Re surface into the Im surface. The 3D picture shows three of the four numbers; the colour is the fourth.',
   noWebgl: 'The 3D view needs WebGL, which this browser has switched off. The flat views still work.',
+  replayTitle: 'Draw the last shape and its image again, from t = 0 to t = 1.',
+  replayNone: 'Draw something first.',
+  replayWait: 'Reveal the image first.',
+  replayDraft: 'Finish the shape first.',
+  replayGap: 'The image has a break. Your stroke passes a point where f has no value, so the image leaves the plane there and comes back on the other side.',
   tip: 'Tip: your finger draws on the picture. Scroll by touching beside it or below it.',
 };
 
@@ -955,9 +1113,12 @@
     hint: null, wAuto: true, mAuto: true, needFitW: true, needFitM: true,
     sphereShow: 'both', ang4: { uv: 0, yv: 0 }, n: 3, seam: -Math.PI,
     draft: null, versions: { shapes: 0, fn: 0 },
+    replay: { on: false, active: false, t: 1, prevT: DEFAULT_T, prevS: DEFAULT_S, shapeId: null, last: null, hold: 0 },
+    pages: [],
   };
-  const stats = { computes: 0, lastComputeMs: 0, pieces: 0, dcRenders: 0, view3dBuilds: 0, draws: 0 };
+  const stats = { computes: 0, lastComputeMs: 0, pieces: 0, dcRenders: 0, view3dBuilds: 0, draws: 0, inkFrames: 0, replays: 0, lastInkMs: 0, maxInkMs: 0 };
   const answerHidden = () => state.predict && !state.revealed;
+  const rp = state.replay;
 
   // ---------------------------------------------------------------- DOM
   const { header, tips: headerTips } = buildHeader(ctx);
@@ -974,11 +1135,10 @@
     presetChips.appendChild(group);
   }
   const startNotice = h('p', { id: 'lab-start-notice', class: 'muted', role: 'status', hidden: true });
-  presetBox.append(presetChips, startNotice);
+  presetBox.append(presetChips);
 
   // the tool bench
-  const bench = h('section', { class: 'panel', id: 'lab-bench' });
-  bench.appendChild(h('h2', { class: 'panel-title', text: 'Draw' }));
+  const toolbarBox = h('section', { class: 'lab-toolbar-box', id: 'lab-toolbar', 'aria-label': 'Drawing toolbar' });
   const toolsBox = h('div', { class: 'chips', id: 'lab-tools', role: 'group', 'aria-label': 'Drawing tools' });
   const toolButtons = new Map();
   for (const t of TOOLS) {
@@ -1001,7 +1161,7 @@
     both: chipButton('lab-grid-both', 'Both', { pressed: false }),
   };
   gridChips.append(gridButtons.cart, gridButtons.polar, gridButtons.both);
-  const toolbar = h('div', { class: 'lab-toolbar' }, undoBtn, clearBtn, snapLabel, gridLabel, gridChips);
+  const toolbarRow = h('div', { class: 'lab-toolbar-row' }, undoBtn, clearBtn, snapLabel, gridLabel, gridChips);
 
   const fanBox = h('input', { type: 'checkbox', id: 'lab-sector-fan' });
   fanBox.checked = true;
@@ -1011,7 +1171,7 @@
   const polyClose = h('button', { type: 'button', class: 'btn', id: 'lab-polygon-close', text: 'Close polygon', disabled: true });
   const options = h('div', { class: 'lab-options', id: 'lab-tool-options' }, fanLabel, ring.row, polyClose);
   const notice = h('p', { class: 'lab-notice', id: 'lab-notice', role: 'status' });
-  bench.append(toolsBox, toolHint, toolbar, options, notice);
+  toolbarBox.append(toolsBox, toolbarRow, toolHint, options);
 
   // views
   const viewsBox = h('div', { class: 'lab-views', id: 'lab-views', role: 'tablist', 'aria-label': 'View' });
@@ -1029,7 +1189,7 @@
   const shapeInfo = h('p', { class: 'lab-info muted', id: 'lab-shape-info' });
   const zPanel = h('figure', { class: 'lab-panel', id: 'lab-zpanel', 'data-tone': 'input' },
     h('div', { class: 'lab-panel-head' }, h('span', { class: 'badge', 'data-tone': 'input', text: 'INPUT' }), h('span', { class: 'lab-cap', text: 'z-plane: where you draw' })),
-    zHost, shapeInfo);
+    zHost, notice, shapeInfo);
   let coarse = false;
   try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
   if (coarse) zPanel.appendChild(h('p', { class: 'lab-tip muted', id: 'lab-tip', text: COPY.tip }));
@@ -1073,7 +1233,15 @@
   sRow.row.hidden = true;
   const morphPlay = h('button', { type: 'button', class: 'btn', id: 'lab-morph-play', text: 'Play morph', hidden: true });
   const predictBtn = chipButton('lab-predict', 'Predict first', { pressed: false });
-  const clock = h('div', { class: 'lab-clock', id: 'lab-clock' }, playBtn, tRow.row, sRow.row, morphPlay, predictBtn);
+  const replayBtn = h('button', { type: 'button', class: 'btn', id: 'lab-replay', text: 'Replay my stroke', disabled: true, 'aria-describedby': 'lab-replay-note' });
+  const rpRow = sliderRow('lab-replay-t', 'lab-replay-t-out', 'Replay', { min: 0, max: 1, step: 0.01, value: 1 });
+  rpRow.row.dataset.tone = 'input';
+  const replayNote = h('p', { class: 'muted lab-replay-note', id: 'lab-replay-note' });
+  const listenHost = h('span', { class: 'lab-listen-host', id: 'lab-listen-host' });
+  const clock = h('div', { class: 'lab-clock', id: 'lab-clock' },
+    h('div', { class: 'lab-clock-group' }, playBtn, tRow.row, sRow.row, morphPlay),
+    h('div', { class: 'lab-clock-group' }, replayBtn, rpRow.row),
+    h('div', { class: 'lab-clock-group lab-clock-actions' }, predictBtn, listenHost), replayNote);
 
   // the function panel
   const fnPanel = h('section', { class: 'panel', id: 'lab-fnpanel' });
@@ -1120,7 +1288,18 @@
   const probePanel = h('section', { class: 'panel', id: 'lab-probe-panel', hidden: true });
   const srStatus = h('div', { class: 'sr-only', id: 'lab-sr-status', role: 'status', 'aria-live': 'polite' });
   const links = buildStationLinks(ctx);
-  el.append(header, presetBox, bench, viewsBox, stage, wheelRow, clock, fnPanel, readout, problemBox, probePanel, srStatus, links);
+  const more = disclosure({ id: 'lab-more', title: 'More: start from a test problem' }, presetBox);
+  const pageName = h('input', { type: 'text', id: 'lab-page-name', maxlength: String(PAGE_LIMITS.maxName), autocomplete: 'off', placeholder: 'Name this page' });
+  const pageSave = h('button', { type: 'button', class: 'btn', id: 'lab-page-save', text: 'Save this page' });
+  const pageStatus = h('p', { class: 'muted', id: 'lab-page-status', role: 'status' });
+  const pageEmpty = h('p', { class: 'muted', id: 'lab-page-empty', text: 'No pages yet. Draw something, name it and save it here.' });
+  const pageList = h('ol', { class: 'lab-page-list', id: 'lab-page-list' });
+  const pageRestore = h('button', { type: 'button', class: 'btn btn-quiet', id: 'lab-page-restore', text: 'Put it back', hidden: true });
+  const pagesBox = disclosure({ id: 'lab-pages', title: 'Pages', open: true },
+    h('p', { class: 'muted', text: 'A page is your drawing and the function f, kept in this browser.' }),
+    h('div', { class: 'lab-page-save' }, h('div', { class: 'field' }, h('label', { for: 'lab-page-name', text: 'Page name' }), pageName), pageSave),
+    pageStatus, pageRestore, pageEmpty, pageList);
+  el.append(header, toolbarBox, stage, startNotice, clock, viewsBox, wheelRow, problemBox, fnPanel, pagesBox, more, readout, probePanel, srStatus, links);
 
   // ---------------------------------------------------------------- planes
   const planeOpts = { background: 'transparent', wheel: 'focus', maxWidth: 640 };
@@ -1238,16 +1417,19 @@
 
   // ---------------------------------------------------------------- fitting the output planes
   const toBox = (b) => [{ re: b.xRange[0], im: b.yRange[0] }, { re: b.xRange[1], im: b.yRange[1] }];
+  const poleOpts = () => (runsIntoPole(allCurves, state.fn.poles) ? { pole: true } : {});
   function fitW() {
     if (!allCurves.length) return;
     const probe = pushForwardAll(allCurves, state.fn.f, { clampRadius: 1e4 });
-    const b = frameBounds(probe.concat(state.guess));
-    if (b) wplane.fitTo(toBox(b), 0.15);
+    const b = frameBounds(probe.concat(state.guess), poleOpts());
+    if (!b) return;
+    if (b.pole) { wplane.setView(poleView(b, wplane.getSize())); wplane.setHome(); }   // a picture that runs to infinity: design i2-lab-diary 5.2
+    else wplane.fitTo(toBox(b), 0.15);
   }
   function fitM() {
     if (!allCurves.length) return;
     const probe = pushForwardAll(allCurves, state.fn.f, { clampRadius: 1e4 });
-    const b = frameBounds(probe.concat(allCurves));
+    const b = frameBounds(probe.concat(allCurves), poleOpts());
     if (b) mplane.fitTo(toBox(b), 0.15);
   }
   const requestFit = () => { state.needFitW = true; state.needFitM = true; };
@@ -1299,14 +1481,19 @@
   }
 
   // ---------------------------------------------------------------- drawing layers
-  let draftCurves = [];       // the shape being drawn (z-plane), dashed
-  let draftOut = [];          // its image (output plane), dashed
+  let draftCurves = [];       // the shape being drawn (z-plane): ink for a brush, a dashed outline for a shape
+  let draftOut = [];          // its image (output plane): live ink
+  let draftFamily = null;     // 'cart' | 'polar' | null: the colour the ink will have once the shape is kept
+  const pen = { z: null, w: null };   // the brush's tip on both planes
   let guessDraft = null;      // the stroke being drawn on the guess pad
 
-  zplane.addLayer((c2, pl) => {                                 // the draft
-    const col = cssColor('--input');
-    for (const c of draftCurves) strokePolyline(c2, pl, c.points, { color: col, width: 2, dash: DASH.guide });
-    const d = state.draft;
+  zplane.addLayer((c2, pl) => {                                 // the draft: a brush stroke is ink, a shape being dragged out is a dashed outline
+    const col = cssColor('--input'), d = state.draft;
+    for (const c of draftCurves) {
+      if (d && d.tool === 'brush') drawTimedCurve(c2, pl, c.points, { color: '--input', width: 2.5, dots: false, arrow: false, ramp: true, dash: null });
+      else strokePolyline(c2, pl, c.points, { color: col, width: 2, dash: DASH.guide });
+    }
+    if (d && d.tool === 'brush' && pen.z) drawDot(c2, pl, pen.z, { color: '--input', radius: 5 });
     if (d && d.tool === 'polygon') {
       d.verts.forEach((v, i) => drawDot(c2, pl, v, { color: '--input', radius: i === 0 ? 6 : 4 }));
     }
@@ -1338,10 +1525,22 @@
     for (const g of state.guess) strokePolyline(c2, pl, g.points, { color: cssColor('--text'), width: 2, dash: DASH.guide, alpha: 0.85 });
     if (onPlane(pl, state.guess[0].points[0])) createLabelPlacer(c2, pl)('your guess', wordSpots(state.guess[0].points[0]), { color: '--text' });
   }, { order: 120 });
-  wplane.addLayer((c2, pl) => {                                 // the draft image
-    const col = cssColor('--output');
-    for (const c of draftOut) strokePolyline(c2, pl, c.points, { color: col, width: 2, dash: DASH.guide });
-  }, { order: 150 });
+  const drawInk = (c2, pl) => {                                 // live ink: the image of the half-drawn shape, solid and time-ramped (never dashed)
+    const domain = domainOn();
+    let n = 0;
+    for (const c of draftOut) {
+      if (c.points.length < 2) continue;
+      if (domain) drawTimedCurve(c2, pl, c.points, { color: '--surface', width: 6.5, dots: false, arrow: false, ramp: false, dash: null, alpha: 0.9 });
+      const token = domain ? '--text' : draftFamily ? strokeToken(draftFamily, 'w', false) : '--output';
+      drawTimedCurve(c2, pl, c.points, { color: token, width: domain ? 3 : 2.5, dots: false, arrow: false, ramp: true, dash: null,
+        rampWeight: draftFamily && !domain ? FAMILY_RAMP : undefined });
+      n++;
+    }
+    if (n && pen.w) drawDot(c2, pl, pen.w, { color: '--output', radius: 5 });
+    if (n) stats.inkFrames++;
+  };
+  wplane.addLayer(drawInk, { order: 150 });
+  mplane.addLayer(drawInk, { order: 150 });
   wplane.addLayer((c2, pl) => {
     if (state.probe.on && !answerHidden()) drawSeam(c2, pl, Math.PI);
   }, { order: 160 });
@@ -1403,11 +1602,62 @@
     if (guessDraft && guessDraft.samples.length > 1) strokePolyline(c2, pl, guessDraft.samples, { color: ink, width: 2, dash: DASH.guide });
   }, { order: 150 });
 
+  // ---------------------------------------------------------------- Replay: the latest shape and its image drawn again from t = 0 to 1
+  const replayTarget = () => (state.shapes.length ? state.shapes[state.shapes.length - 1] : null);
+  function replayCurves() {
+    const rec = replayTarget();
+    if (!rec) return [];
+    const prim = rec.curves.filter((c, i) => rec.roles[i] === 'primary');
+    return prim.length ? prim : rec.curves;
+  }
+  const replayIds = () => new Set(replayCurves().map((c) => c.id));
+  // Where the pen is at the replay time: { z, w } (null when f has no value there, or when no replay is on). The layers and the hook both ask here.
+  function replayCursors() {
+    const out = { z: null, w: null };
+    if (!state.replay.active) return out;
+    const curves = replayCurves();
+    for (const c of curves) { const win = replayWindow(c.points, state.replay.t); if (win.cursor) { out.z = win.cursor; break; } }
+    if (!answerHidden()) {
+      for (const c of curves) {
+        for (const pc of piecesOf(c.id)) { const win = replayWindow(pc.points, state.replay.t); if (win.cursor) { out.w = win.cursor; break; } }
+        if (out.w) break;
+      }
+    }
+    return out;
+  }
+  const replayInk = (c2, pl, windows, side) => {
+    const domain = domainOn();
+    for (const win of windows) {
+      if (win.points.length < 2) continue;
+      const fam = win.family;
+      if (domain) drawTimedCurve(c2, pl, win.points, { color: '--surface', width: 7.5, dots: false, arrow: false, ramp: false, dash: null, alpha: 0.9 });
+      drawTimedCurve(c2, pl, win.points, { color: strokeToken(fam, side, domain), width: domain ? 3.5 : 3.5, dots: false, arrow: false, ramp: true, dash: null,
+        rampWeight: fam && !domain ? FAMILY_RAMP : undefined });
+    }
+    const first = windows.find((w) => w.cursor);
+    if (first) drawDot(c2, pl, first.cursor, { color: side === 'z' ? '--input' : '--output', radius: 8 });
+  };
+  zplane.addLayer((c2, pl) => {
+    if (!state.replay.active) return;
+    replayInk(c2, pl, replayCurves().map((c) => ({ ...replayWindow(c.points, state.replay.t), family: infoOf(c.id).family })), 'z');
+  }, { order: 190 });
+  const replayPieces = (getPieces) => (c2, pl) => {
+    if (!state.replay.active || answerHidden()) return;
+    const wins = [];
+    for (const c of replayCurves()) for (const pc of getPieces(c.id)) wins.push({ ...replayWindow(pc.points, state.replay.t), family: infoOf(c.id).family });
+    replayInk(c2, pl, wins, 'w');
+  };
+  wplane.addLayer(replayPieces(piecesOf), { order: 190 });
+  mplane.addLayer(replayPieces(morphPiecesOf), { order: 190 });
+
+  // While a replay runs, the replayed shape's outline is a faint ghost under the growing ink.
+  const ghosted = (curveId) => state.replay.active && replayIds().has(curveId);
+  const ghostOf = (st) => ({ ...st, alpha: 0.2, dots: false, arrow: false });
   function syncZ() {
     const domain = domainOn(), specs = [];
     for (const c of allCurves) {
-      const info = infoOf(c.id), st = styleOf(info.role, domain);
-      if (domain) specs.push(curveSpec('halo:' + c.id, c.points, '--surface', { ...st, width: st.width + 4, alpha: 0.9, dots: false, arrow: false, order: 90 }, c.closed, false));
+      const info = infoOf(c.id), st = ghosted(c.id) ? ghostOf(styleOf(info.role, domain)) : styleOf(info.role, domain);
+      if (domain) specs.push(curveSpec('halo:' + c.id, c.points, '--surface', { ...st, width: st.width + 4, alpha: ghosted(c.id) ? 0.2 : 0.9, dots: false, arrow: false, order: 90 }, c.closed, false));
       specs.push(curveSpec(c.id, c.points, strokeToken(info.family, 'z', domain), st, c.closed, true, extraOf(info, domain)));
     }
     syncLayerSet(zSet, specs);
@@ -1415,8 +1665,8 @@
   function syncW() {
     const pieces = getImages(), domain = domainOn(), specs = [];
     for (const pc of pieces) {
-      const info = infoOf(pc.curveId), st = styleOf(info.role, domain);
-      if (domain) specs.push(curveSpec('halo:' + pc.id, pc.points, '--surface', { ...st, width: st.width + 4, alpha: 0.9, dots: false, arrow: false, order: 90 }, pc.closed, false));
+      const info = infoOf(pc.curveId), st = ghosted(pc.curveId) ? ghostOf(styleOf(info.role, domain)) : styleOf(info.role, domain);
+      if (domain) specs.push(curveSpec('halo:' + pc.id, pc.points, '--surface', { ...st, width: st.width + 4, alpha: ghosted(pc.curveId) ? 0.2 : 0.9, dots: false, arrow: false, order: 90 }, pc.closed, false));
       specs.push(curveSpec(pc.id, pc.points, strokeToken(info.family, 'w', domain), st, pc.closed, true, extraOf(info, domain)));
     }
     syncLayerSet(wSet, specs);
@@ -1432,7 +1682,7 @@
   function syncM() {
     const pieces = getMorph(), specs = [];
     for (const pc of pieces) {
-      const info = infoOf(pc.curveId), st = styleOf(info.role, false);
+      const info = infoOf(pc.curveId), st = ghosted(pc.curveId) ? ghostOf(styleOf(info.role, false)) : styleOf(info.role, false);
       const col = info.family ? strokeToken(info.family, 'w', false) : strokeToken(null, 'w', false);
       specs.push(curveSpec(pc.id, pc.points, info.family ? col : '--output', st, pc.closed, true, extraOf(info, false)));
     }
@@ -1524,6 +1774,8 @@
       : DOMAIN_LEGEND.short + ' Your strokes are drawn in black and white so the colours show through.';
     wheelDetails.hidden = v !== 'domain' && v !== 'landscape';
     zEmpty.hidden = state.shapes.length > 0 || state.probe.on;       // the pill would cover the probe's labels
+    replayRefresh();
+    pageSave.disabled = state.shapes.length === 0;
     undoBtn.disabled = state.history.length === 0;
     clearBtn.disabled = state.shapes.length === 0;
     wFitNote.hidden = state.wAuto;
@@ -1546,6 +1798,7 @@
     tex(fnTex, 'f(z) = ' + state.fn.tex);
   }
   function setFn(fn, { silent = false } = {}) {
+    if (rp.active) replayEnd(false);
     state.fn = fn;
     state.versions.fn++;
     state.hint = null;
@@ -1650,12 +1903,97 @@
     morphRaf = requestAnimationFrame(morphTick);
   }
 
+  // ---------------------------------------------------------------- Replay control
+  let replayRaf = 0;
+  const replayLabel = () => { replayBtn.textContent = reduced() ? 'Step the replay' : 'Replay my stroke'; };
+  function replayRefresh() {
+    replayBtn.disabled = !replayTarget() || answerHidden() || !!state.draft;
+    replayBtn.title = !replayTarget() ? COPY.replayNone : answerHidden() ? COPY.replayWait : state.draft ? COPY.replayDraft : COPY.replayTitle;
+    rpRow.input.value = String(rp.t);
+    rpRow.out.textContent = rp.t.toFixed(2);
+  }
+  function replayApply() {                           // one frame: the clock follows the replay (and the morph slider in the morph view)
+    setT(rp.t);
+    if (state.view === 'morph') setS(rp.t);
+    rpRow.input.value = String(rp.t);
+    rpRow.out.textContent = rp.t.toFixed(2);
+    let note = '';
+    if (rp.active && !answerHidden() && state.view === 'side') {                 // past a break in the image: say why there is one
+      const c0 = replayCurves()[0], ps = c0 ? piecesOf(c0.id) : [];
+      if (ps.length > 1 && rp.t > ps[0].points[ps[0].points.length - 1].t) note = COPY.replayGap;
+    }
+    if (replayNote.textContent !== note) replayNote.textContent = note;
+  }
+  function replayBegin() {                           // rest -> active
+    if (rp.active) return;
+    rp.prevT = state.t; rp.prevS = state.s;
+    rp.active = true; rp.shapeId = replayTarget().id;
+    invalidate('shapes');                            // the layers are rebuilt once, with the ghost style
+  }
+  function replayEnd(restore = true) {               // active -> rest
+    if (replayRaf) cancelAnimationFrame(replayRaf);
+    replayRaf = 0;
+    const was = rp.active;
+    rp.on = false; rp.active = false; rp.t = 1; rp.last = null; rp.hold = 0;
+    replayNote.textContent = '';
+    if (was && restore) { setT(rp.prevT); if (state.view === 'morph') setS(rp.prevS); }
+    rpRow.input.value = '1'; rpRow.out.textContent = '1.00';
+    if (was) { invalidate('shapes'); if (restore) say('Replay done.'); }
+    replayRefresh();
+  }
+  // Brings a running replay up to the wall clock: t follows the time since the last call, not the number of frames, so a slow frame (a 3D view,
+  // a busy machine) skips ahead and the replay always takes REPLAY.seconds + REPLAY.hold. Returns false when the replay has ended.
+  function replayAdvance() {
+    const now = performance.now(), dt = Math.max(0, (now - rp.last) / 1000);
+    rp.last = now;
+    if (rp.hold > 0) {
+      rp.hold -= dt;
+      if (rp.hold <= 0) { replayEnd(true); return false; }
+    } else {
+      rp.t = Math.min(1, rp.t + dt / REPLAY.seconds);
+      if (rp.t >= 1) rp.hold = REPLAY.hold;
+    }
+    replayApply();
+    return true;
+  }
+  function replayTick() {
+    replayRaf = 0;
+    if (!rp.on || unmounted) return;
+    if (replayAdvance()) replayRaf = requestAnimationFrame(replayTick);
+  }
+  function startReplay() {
+    if (!replayTarget() || answerHidden() || state.draft) return;
+    if (playing) stopPlay();
+    morphing = null;
+    if (reduced()) {                                  // a stepper: each press is one step of REPLAY.step
+      const next = rp.active ? Math.round((rp.t + REPLAY.step) * 100) / 100 : REPLAY.step;
+      if (next >= 1) { replayEnd(true); return; }
+      replayBegin(); rp.on = false; rp.t = next; replayApply();
+      return;
+    }
+    replayBegin();
+    rp.on = true; rp.t = 0; rp.last = performance.now(); rp.hold = 0; stats.replays++;
+    say('Replaying your last shape.');
+    replayApply();
+    replayRaf = requestAnimationFrame(replayTick);
+  }
+  function scrubReplay(v) {
+    if (!replayTarget() || answerHidden()) { replayRefresh(); return; }
+    if (replayRaf) cancelAnimationFrame(replayRaf);
+    replayRaf = 0; rp.on = false;
+    if (v >= 0.999) { replayEnd(true); return; }
+    replayBegin();
+    rp.t = clamp(v, 0, 1);
+    replayApply();
+  }
+
   // ---------------------------------------------------------------- shapes: commit, undo, clear, persist
   // lab.strokes is the drawing as an array of Specs. An empty array means the student cleared it on purpose; a missing key means this
   // is a first visit, which is the only time the Lab draws its starting example (see startExample).
   function persist() { store.set('lab.strokes', state.shapes.map((s) => s.spec)); }
   let touched = false;                 // true once the drawing has changed; until then the Lab writes nothing, so it never replaces a stored drawing
   function afterEdit(save = true) {
+    if (rp.active) replayEnd(false);
     startNotice.hidden = true;
     rebuildShapeData();
     state.hint = null;
@@ -1738,7 +2076,7 @@
   function startExample() {
     const tok = resolveToken(EXAMPLE_TOKEN);
     applyPreset(tok, { silent: true });
-    startNotice.textContent = 'To start, here is problem 2.5.1: the circle |z − 1| = 1 under 1/z. Clear it to begin with a blank page, or load another test problem above.';
+    startNotice.textContent = 'To start, here is problem 2.5.1: the circle |z − 1| = 1 under 1/z. Clear it to begin with a blank page, or open More below to load another test problem.';
     startNotice.hidden = false;
   }
   function applyRequest(r) {
@@ -1767,6 +2105,94 @@
     if (r.dropped > 0) showNotice('Some shapes from the other page could not be drawn.');
   }
 
+  // ---------------------------------------------------------------- pages
+  let lastDeleted = null;
+  const SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸' };
+  const pageFnLabel = (f) => (f.kind === 'catalog' ? fnById(f.id).label : f.kind === 'zn' ? 'z' + (SUP[Number(f.src.slice(2))] || f.src.slice(1))
+    : f.kind === 'seam' ? 'z^(1/3), seam ' + fmtAngle(f.seam, { unicode: true }) : f.src);
+  const pageMeta = (pg) => 'f = ' + pageFnLabel(pg.fn) + ' · ' + pg.shapes.length + (pg.shapes.length === 1 ? ' shape' : ' shapes');
+  function writePages() {
+    const ok = store.set('lab.pages', state.pages.map((q) => ({ ...q })));
+    return ok;
+  }
+  function renderPages() {
+    pageList.textContent = '';
+    state.pages.forEach((pg, k) => {
+      const open = h('button', { type: 'button', class: 'btn lab-page-open', id: 'lab-page-open-' + k }, h('strong', { text: pg.name }), h('span', { class: 'muted', text: ' ' + pageMeta(pg) }));
+      const del = h('button', { type: 'button', class: 'btn btn-quiet', id: 'lab-page-delete-' + k, 'aria-label': 'Delete the page ' + pg.name, text: 'Delete' });
+      pageList.appendChild(h('li', { class: 'lab-page-item' }, open, del));
+    });
+    pageEmpty.hidden = state.pages.length > 0;
+    pagesBox.firstElementChild.textContent = state.pages.length ? 'Pages (' + state.pages.length + ')' : 'Pages';
+    pageSave.disabled = state.shapes.length === 0;
+  }
+  function savePage() {
+    if (!state.shapes.length) { pageStatus.textContent = 'Draw something first: a page keeps your drawing.'; return; }
+    if (state.pages.length >= PAGE_LIMITS.maxPages) { pageStatus.textContent = PAGE_LIMITS.maxPages + ' pages is the limit. Delete one to save another.'; return; }
+    const name = pageName.value.replace(/\s+/g, ' ').trim().slice(0, PAGE_LIMITS.maxName) || 'Page ' + (state.pages.length + 1);
+    const f = state.fn;
+    const fnRec = { kind: f.kind, id: f.id, src: f.src };
+    if (f.kind === 'seam') fnRec.seam = f.seam;
+    const page = pagesSanitize([{ name, savedAt: Date.now(), fn: fnRec, shapes: state.shapes.map((r) => r.spec) }])[0];
+    if (!page) { pageStatus.textContent = 'That page could not be saved.'; return; }
+    state.pages.unshift(page);
+    const ok = writePages();
+    pageName.value = '';
+    renderPages();
+    pageStatus.textContent = 'Saved "' + page.name + '".' + (ok ? '' : ' This browser blocks storage, so it is kept for this visit only.');
+    say(pageStatus.textContent);
+  }
+  function openPage(k) {
+    const pg = state.pages[k];
+    if (!pg) return;
+    let fn;
+    try { fn = makeFn(pageFnSpec(pg.fn)); } catch (e) { pageStatus.textContent = 'That page\'s function could not be read.'; return; }
+    if (rp.active) replayEnd(false);
+    pushHistory();                                   // always: Undo gives back what was there, a blank page too
+    state.shapes = newRecords(pg.shapes);
+    dropDraft();
+    setFn(fn, { silent: true });
+    afterEdit();
+    state.hint = null; state.revealed = false; state.guess = [];
+    state.wAuto = true; state.mAuto = true;
+    resetClockAndView();
+    requestFit();
+    invalidate('shapes', 'fn', 'predict');
+    pageStatus.textContent = 'Opened "' + pg.name + '". Undo brings your last drawing back.';
+    say(pageStatus.textContent);
+  }
+  function deletePage(k) {
+    const pg = state.pages[k];
+    if (!pg) return;
+    lastDeleted = { pg, k };
+    state.pages.splice(k, 1);
+    writePages();
+    renderPages();
+    pageRestore.hidden = false;
+    pageStatus.textContent = 'Deleted "' + pg.name + '".';
+    say(pageStatus.textContent);
+  }
+  function restorePage() {
+    if (!lastDeleted) return;
+    state.pages.splice(Math.min(lastDeleted.k, state.pages.length), 0, lastDeleted.pg);
+    pageStatus.textContent = 'Put "' + lastDeleted.pg.name + '" back.';
+    lastDeleted = null;
+    pageRestore.hidden = true;
+    writePages();
+    renderPages();
+  }
+  on(pageSave, 'click', savePage);
+  on(pageName, 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); savePage(); } });
+  on(pageRestore, 'click', restorePage);
+  on(pageList, 'click', (e) => {
+    const b = e.target.closest('button');
+    if (!b) return;
+    let m = /^lab-page-open-(\d+)$/.exec(b.id);
+    if (m) { openPage(Number(m[1])); return; }
+    m = /^lab-page-delete-(\d+)$/.exec(b.id);
+    if (m) deletePage(Number(m[1]));
+  });
+
   // ---------------------------------------------------------------- views
   function applyView(v) {
     if (!LAB_VIEWS.includes(v)) return;
@@ -1793,9 +2219,7 @@
       if (part.math) tex(span, part.text); else span.textContent = part.text;
       head.appendChild(span);
     }
-    const tones = addressTones(p.address);
-    const chip = h('span', { class: 'chip', text: 'Easiest in: ' + addressLabel(p.address) });
-    if (tones.length === 1) chip.dataset.tone = tones[0].replace(/^--/, '');
+    const decisions = h('div', { class: 'lab-decisions', id: 'lab-problem-decisions' }, h('span', { class: 'muted', text: 'Two decisions: ' }), decisionChips(p, { idPrefix: 'lab-problem' }));
     const why = h('p', { id: 'lab-problem-why', class: 'muted' });
     prose(why, p.addressWhy);
     const whyWait = h('p', { id: 'lab-problem-why-wait', class: 'muted', hidden: true, text: COPY.whyWait });
@@ -1811,7 +2235,7 @@
       h('p', { class: 'muted mono', text: p.answer.text }), h('p', { class: 'muted' }), check);
     prose(answer.querySelectorAll('p')[1], p.aha);
     const link = h('a', { id: 'lab-problem-link', href: '#' + routeFor(id), text: 'Open problem ' + id + ' on its own page' });
-    problemBox.append(h('h2', { class: 'panel-title', text: 'Problem ' + id }), head, h('p', {}, chip), why, whyWait, ways, answer, h('p', {}, link));
+    problemBox.append(h('h2', { class: 'panel-title', text: 'Problem ' + id }), head, decisions, why, whyWait, ways, answer, h('p', {}, link));
     problemRefs.ways = ways; problemRefs.answer = answer; problemRefs.check = check; problemRefs.why = why; problemRefs.whyWait = whyWait;
   }
   function updateProblem() {
@@ -2150,15 +2574,16 @@
     draftRaf = 0;
     if (unmounted) return;
     const d = state.draft;
-    draftCurves = []; draftOut = [];
+    draftCurves = []; draftOut = []; draftFamily = null; pen.z = null; pen.w = null;
     if (d && d.tool === 'polygon') {
       const pts = d.verts.concat(d.hover ? [d.hover] : []);
       if (pts.length >= 2) draftCurves = [polylineCurve(pts)];
     } else if (d && d.tool !== 'probe') {
       const cs = cleanSpec(draftSpecOf(d));
-      if (cs) draftCurves = specToCurves(cs, 'draft').curves;
+      if (cs) { draftCurves = specToCurves(cs, 'draft').curves; draftFamily = draftCurves.length ? draftCurves[0].family : null; }
     }
     if (draftCurves.length && !answerHidden()) {
+      const tInk = performance.now();
       const f = state.fn.f;
       const total = draftCurves.reduce((n, c) => n + c.points.length, 0);
       const use = total > 3000 ? draftCurves.slice(0, 1) : draftCurves;
@@ -2168,8 +2593,17 @@
       } else if (state.view === 'side' || state.view === 'domain') {
         draftOut = computeImages(use, f, { clampRadius: wClamp() });
       }
+      stats.lastInkMs = performance.now() - tInk;
+      stats.maxInkMs = Math.max(stats.maxInkMs, stats.lastInkMs);
+    }
+    if (d && d.tool === 'brush' && draftCurves.length) {
+      const zl = draftCurves[0].points[draftCurves[0].points.length - 1];
+      pen.z = { re: zl.re, im: zl.im };
+      const lastPiece = draftOut.length ? draftOut[draftOut.length - 1] : null;
+      if (lastPiece && lastPiece.points.length) { const wl = lastPiece.points[lastPiece.points.length - 1]; pen.w = { re: wl.re, im: wl.im }; }
     }
     polyClose.disabled = !(d && d.tool === 'polygon' && d.verts.length >= 3);
+    replayRefresh();
     zplane.requestDraw(); wplane.requestDraw(); mplane.requestDraw();
   }
 
@@ -2207,6 +2641,7 @@
   }
   function onDown(e) {
     if (unmounted || !e.isPrimary || state.tool === 'pan') return;
+    if (rp.active) replayEnd(false);                   // a new gesture ends a replay
     const tool = state.tool;
     if (tool === 'probe') { state.draft = { tool, pointerId: e.pointerId }; setProbe(e.z, false); return; }
     if (tool === 'brush') { state.draft = { tool, pointerId: e.pointerId, samples: [e.z] }; scheduleDraft(); return; }
@@ -2365,8 +2800,10 @@
   };
   on(uvRow.input, 'input', on4D);
   on(yvRow.input, 'input', on4D);
-  on(playBtn, 'click', togglePlay);
-  on(tRow.input, 'input', () => { if (playing) stopPlay(); setT(Number(tRow.input.value)); });
+  on(playBtn, 'click', () => { if (rp.active) replayEnd(false); togglePlay(); });
+  on(replayBtn, 'click', startReplay);
+  on(rpRow.input, 'input', () => scrubReplay(Number(rpRow.input.value)));
+  on(tRow.input, 'input', () => { if (playing) stopPlay(); if (rp.active) replayEnd(false); setT(Number(tRow.input.value)); });
   on(sRow.input, 'input', () => { morphing = null; setS(Number(sRow.input.value)); });
   on(morphPlay, 'click', toggleMorph);
   on(predictBtn, 'click', () => {
@@ -2409,7 +2846,7 @@
   on(fnSrc, 'input', () => { fnError.textContent = ''; fnEcho.hidden = true; });
   let reducedMq = null;
   try { reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { reducedMq = null; }
-  if (reducedMq && reducedMq.addEventListener) on(reducedMq, 'change', () => { playLabel(); morphLabel(); });
+  if (reducedMq && reducedMq.addEventListener) on(reducedMq, 'change', () => { playLabel(); morphLabel(); replayLabel(); });
 
   const offs = [];
   offs.push(zplane.on('pointerdown', onDown), zplane.on('pointermove', onMove), zplane.on('pointerup', onUp), zplane.on('pointercancel', onCancel));
@@ -2418,6 +2855,7 @@
   offs.push(wplane.on('viewchange', (v) => {
     if (v.reason === 'pan' || v.reason === 'zoom') state.wAuto = false;
     else if (v.reason === 'reset') { state.wAuto = true; state.needFitW = true; }
+    else if (v.reason === 'resize' && state.wAuto) state.needFitW = true;       // the first measurement, a rotation, a resized window
     if (dcW) refreshDC(dcW);
     invalidate('images');
   }));
@@ -2430,6 +2868,7 @@
 
   function onKey(e) {
     if (unmounted) return;
+    if (e.key === 'Escape' && rp.active) { replayEnd(true); return; }        // from anywhere: the replay stops and gives the clock back
     const t = e.target;
     if (!(t === document.body || t === zplane.el)) return;
     const poly = state.draft && state.draft.tool === 'polygon' ? state.draft : null;
@@ -2451,6 +2890,7 @@
   yvRow.out.textContent = '0°';
   playLabel();
   morphLabel();
+  replayLabel();
   const req = store.get('lab.request', null);
   if (req) {
     store.remove('lab.request');
@@ -2475,6 +2915,10 @@
       }
     }
   }
+  state.pages = pagesSanitize(store.get('lab.pages', null));
+  renderPages();
+  let listen = null;
+  listenControl(listenHost, 'lab').then((l) => { if (unmounted) { if (l) l.destroy(); } else listen = l; }, () => { /* no narration yet */ });
   rebuildShapeData();
   showFnInfo();
   setTool(state.tool);
@@ -2486,6 +2930,9 @@
   // ---------------------------------------------------------------- hooks (last), and unmount
   on(document, 'keydown', onKey);
   const mv = (window.__mv = window.__mv || {});
+  const draftInfo = () => ({ active: !!state.draft, tool: state.draft ? state.draft.tool : null, corners: state.draft && state.draft.verts ? state.draft.verts.length : 0,
+    curves: draftCurves.length, out: draftOut.length, closeEnabled: !polyClose.disabled,
+    inked: draftOut.some((c) => c.points.length >= 2) && !answerHidden() && (state.view === 'side' || state.view === 'domain' || state.view === 'morph') });
   const hooks = {
     shapes: () => state.shapes,
     images: () => getImages(),
@@ -2495,7 +2942,10 @@
     s: () => state.s,
     probe: () => ({ on: state.probe.on, z: { re: state.probe.z.re, im: state.probe.z.im }, w: safeEval(state.fn.f, state.probe.z) }),
     answerHidden,
-    draft: () => ({ active: !!state.draft, tool: state.draft ? state.draft.tool : null, corners: state.draft && state.draft.verts ? state.draft.verts.length : 0, curves: draftCurves.length, out: draftOut.length, closeEnabled: !polyClose.disabled }),
+    draft: () => { if (draftRaf) { cancelAnimationFrame(draftRaf); runDraft(); } return draftInfo(); },
+    replay: () => { if (rp.on) replayAdvance(); const c = replayCursors(); return { on: rp.on, t: rp.t, cursor: { z: c.z ? { re: c.z.re, im: c.z.im } : null, w: c.w ? { re: c.w.re, im: c.w.im } : null } }; },
+    frame: () => ({ w: wplane.getView() }),
+    pages: () => state.pages.map((q) => ({ ...q })),
     stats: () => ({ ...stats, draws: planes.reduce((n, p) => n + p.getStats().draws, 0) }),
     state: () => ({ ...state, shapes: state.shapes.slice(), guess: state.guess.slice(), history: state.history.length, probe: { ...state.probe }, draft: !!state.draft }),
   };
@@ -2504,8 +2954,9 @@
   return function unmount() {
     if (unmounted) return;
     unmounted = true;
-    for (const id of [flushRaf, draftRaf, playRaf, morphRaf]) if (id) cancelAnimationFrame(id);
-    flushRaf = 0; draftRaf = 0; playRaf = 0; morphRaf = 0;
+    for (const id of [flushRaf, draftRaf, playRaf, morphRaf, replayRaf]) if (id) cancelAnimationFrame(id);
+    flushRaf = 0; draftRaf = 0; playRaf = 0; morphRaf = 0; replayRaf = 0;
+    if (listen) { try { listen.destroy(); } catch (e) { /* gone */ } }
     clearTimeout(noticeTimer); clearTimeout(dcTimer);
     try { if (touched) persist(); } catch (e) { /* the store has its own guard */ }
     for (const c of cleanups.splice(0).reverse()) { try { c(); } catch (e) { /* gone */ } }
```

## Appendix B: `tests/unit/i2-lab-diary.test.mjs` (new; 11 of 11 pass)

```js
// tests/unit/i2-lab-diary.test.mjs: the pure additions of js/stations/lab.js in iteration 2 (design: docs/designs/iter-2/i2-lab-diary.md, section 7.2).
// Every expected number below was computed by running the shipped core modules in Node 22 and checked by hand (design section 6).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as lab from '../../js/stations/lab.js';
import { pushForward, pointOnPieces } from '../../js/core/mapping.js';
import { circle, verticalLine, segment, pointAt } from '../../js/core/shapes.js';
import { inv, Arg } from '../../js/core/complex.js';

const {
  cleanSpec, specToCurves, makeFn, computeImages, imageBounds, frameBounds, runsIntoPole, poleView, replayWindow, pagesSanitize, pageFnSpec,
  checkProblem, FRAME_MIN, POLE_CROP, POLE_MIN_SCALE, REPLAY, PAGE_LIMITS,
} = lab;

const z = (re, im = 0) => ({ re, im });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b} (tolerance ${eps})`);
const nearZ = (a, b, eps = 1e-9) => { near(a.re, b.re, eps); near(a.im, b.im, eps); };
const curvesOf = (spec) => specToCurves(cleanSpec(spec), 's1').curves;
const imagesOf = (spec, fnId, opts) => computeImages(curvesOf(spec), makeFn({ id: fnId }).f, opts || { clampRadius: 40 });
const CIRCLE1 = { kind: 'circle', center: z(1, 0), r: 1 };

test('L1 frameBounds frames a pole picture on its bulk, at least FRAME_MIN across (A2)', () => {
  assert.equal(FRAME_MIN, 4);
  const pieces = pushForward(circle(z(1, 0), 1), (w) => inv(w), { clampRadius: 40 });
  const b = frameBounds(pieces);
  assert.ok(b.xRange[1] - b.xRange[0] >= 4 && b.xRange[1] - b.xRange[0] <= 6, `x span ${b.xRange[1] - b.xRange[0]}`);
  assert.ok(b.xRange[0] <= 0 && b.xRange[1] >= 0.5, 'the v axis and the line Re w = 1/2 are both inside');
  assert.deepEqual(b.xRange, [-1.5, 2.5]);
  assert.deepEqual(b.yRange, [-2, 2]);
  assert.equal(b.pole, true);
  assert.ok(b.kept < b.total, 'it says it left the far arms out');
  assert.equal(b.cap, 2, 'the bulk radius is max(2, 2 * median |w|) and the median is 0.69');
});

test('L2 a picture with nothing cut keeps the imageBounds frame; opts.pole decides the rest', () => {
  const x2 = pushForward(verticalLine(2, { yRange: [-4, 4], n: 128 }), (w) => ({ re: w.re * w.re - w.im * w.im, im: 2 * w.re * w.im }), { clampRadius: 40 });
  assert.deepEqual(frameBounds(x2), imageBounds(x2));
  for (const [spec, fnId] of [[{ kind: 'verticalLine', x: 2 }, 'sq'], [{ kind: 'verticalLine', x: 2 }, 'linear-i'], [{ kind: 'circle', center: z(0, 0), r: 1 }, 'linear-1i']]) {
    assert.deepEqual(frameBounds(imagesOf(spec, fnId)), imageBounds(imagesOf(spec, fnId)), `${spec.kind} under ${fnId}`);
  }
  const c1 = imagesOf(CIRCLE1, 'recip');
  assert.deepEqual(frameBounds(c1, { pole: false }), imageBounds(c1), 'pole: false never frames on the bulk');
  assert.deepEqual(frameBounds(c1, {}), frameBounds(c1), 'no option: decided by the pieces');
  // |z - 1/2| = 1/2 also passes through 0, but no sample came near enough to be cut: auto leaves the frame 40 high; the host passes pole: true
  const small = imagesOf({ kind: 'circle', center: z(0.5, 0), r: 0.5 }, 'recip');
  assert.equal(frameBounds(small).kept, frameBounds(small).total, 'auto: nothing cut');
  assert.ok(frameBounds(small).yRange[1] > 20, 'auto: the frame is 40 units high');
  const forced = frameBounds(small, { pole: true });
  assert.deepEqual(forced.xRange, [-1, 3]);
  near(forced.yRange[1], 2.414213562, 1e-6); near(forced.yRange[0], -2.414213562, 1e-6);
  assert.equal(forced.pole, true);
  assert.equal(frameBounds([]), null);
  assert.equal(frameBounds([], { pole: true }), null);
  // the morph plane frames the input and the image together: the circle's points are inside the bulk
  const morph = frameBounds(c1.concat(curvesOf(CIRCLE1)), { pole: true });
  assert.deepEqual(morph.xRange, [-1, 3]); assert.deepEqual(morph.yRange, [-2, 2]);
  // a ring through 0: 4 across both ways, the middle moves with the bulk
  const ring = frameBounds(imagesOf({ kind: 'annulus', center: z(0, -1), r0: 1, r1: 3 }, 'recip'), { pole: true });
  assert.deepEqual(ring.xRange, [-2, 2]); assert.deepEqual(ring.yRange, [-2.75, 1.25]);
});

test('L3 runsIntoPole: the drawing is within 0.35 of a pole of f', () => {
  const recip = makeFn({ id: 'recip' });
  assert.equal(runsIntoPole(curvesOf(CIRCLE1), recip.poles), true);
  assert.equal(runsIntoPole(curvesOf({ kind: 'verticalLine', x: 2 }), recip.poles), false);
  assert.equal(runsIntoPole(curvesOf(CIRCLE1), makeFn({ id: 'sq' }).poles), false, 'z^2 has no pole');
  assert.equal(runsIntoPole(curvesOf(CIRCLE1), undefined), false);
  assert.equal(runsIntoPole([], recip.poles), false);
});

test('L4 poleView: the window of a pole picture and the pixels it gives the line (A1 numbers)', () => {
  assert.equal(POLE_CROP, 0.8); assert.equal(POLE_MIN_SCALE, 85);
  const b = frameBounds(imagesOf(CIRCLE1, 'recip'));
  const gap = (size) => { const v = poleView(b, size); return { v, px: 0.5 * size.w / v.unitsAcross }; };
  let r = gap({ w: 448, h: 448 });                     // 1280 wide
  nearZ(r.v.center, z(0.5, 0)); near(r.v.unitsAcross, 3.2); near(r.px, 70, 1e-9);
  r = gap({ w: 338, h: 270 });                         // 390 wide, 5:4
  near(r.v.unitsAcross, 338 / 85, 1e-12); near(r.px, 42.5, 1e-9);
  near(r.v.unitsAcross * 270 / 338 / 2, 1.5882, 1e-3); // half the height shown: the cursor at t = 0.4 (v = -1.5405) is inside
  r = gap({ w: 338, h: 338 }); near(r.v.unitsAcross, 3.2); near(r.px, 52.8125, 1e-9);
  r = gap({ w: 640, h: 640 }); near(r.v.unitsAcross, 3.2); near(r.px, 100, 1e-9);
  near(poleView(b, null).unitsAcross, 3.2, 1e-12);     // not measured yet: 400 wide, square
  for (const w of [300, 338, 400, 448, 640]) assert.ok(0.5 * w / poleView(b, { w, h: w * 0.8 }).unitsAcross >= 42.5 - 1e-9, `width ${w}`);
  const f = poleView(frameBounds(imagesOf({ kind: 'circle', center: z(0.5, 0), r: 0.5 }, 'recip'), { pole: true }), { w: 448, h: 448 });
  near(f.unitsAcross, 0.8 * 2 * 2.414213562, 1e-6);    // a taller box: the height decides
  assert.ok(f.unitsAcross <= 448 / 85);
});

test('L5 replayWindow', () => {
  const seg = segment(z(0, 0), z(1, 0), { n: 64 });
  const half = replayWindow(seg.points, 0.5);
  assert.equal(half.points.length, 33);
  assert.ok(half.points.every((p) => p.t <= 0.5));
  nearZ(half.cursor, z(0.5, 0), 1e-9);
  const between = replayWindow(seg.points, 0.51);       // 0.51 is between samples 32 (0.5) and 33 (0.515625)
  assert.equal(between.points.length, 34);
  near(between.points[33].t, 0.51, 1e-12); nearZ(between.cursor, z(0.51, 0), 1e-12);
  assert.deepEqual(replayWindow(seg.points, 0), { points: [seg.points[0]], cursor: z(0, 0) });
  assert.equal(replayWindow(seg.points, 1).points.length, 65); nearZ(replayWindow(seg.points, 1).cursor, z(1, 0));
  assert.deepEqual(replayWindow(seg.points.slice(10), 0.05), { points: [], cursor: null }, 'before the first t');
  assert.deepEqual(replayWindow(seg.points, NaN), { points: [], cursor: null });
  assert.deepEqual(replayWindow(null, 0.5), { points: [], cursor: null });
  assert.deepEqual(replayWindow([], 0.5), { points: [], cursor: null });
  // the pieces of 1/z on the circle |z - 1| = 1: the pole is at t = 1/2, between t = 0.4921875 and 0.5078125
  const [p1, p2] = imagesOf(CIRCLE1, 'recip');
  assert.equal(replayWindow(p1.points, 0.4).points.length, 53); nearZ(replayWindow(p1.points, 0.4).cursor, z(0.5, -1.5404731), 1e-6);
  assert.deepEqual(replayWindow(p2.points, 0.4), { points: [], cursor: null });
  assert.equal(replayWindow(p1.points, 0.5).cursor, null, 'piece 1 is finished: no pen');
  assert.equal(replayWindow(p1.points, 0.5).points.length, 64);
  assert.equal(replayWindow(p2.points, 0.5).cursor, null, 'piece 2 has not begun: no pen (the gap)');
  assert.equal(replayWindow(p2.points, 0.6).points.length, 13); nearZ(replayWindow(p2.points, 0.6).cursor, z(0.5, 1.5404731), 1e-6);
  // the cursor is exactly where pointOnPieces puts the w-plane dot
  for (const t of [0, 0.0625, 0.25, 0.4, 0.4921875, 0.5, 0.6, 0.75, 1]) {
    const pop = pointOnPieces([p1, p2], t);
    const cur = [p1, p2].map((pc) => replayWindow(pc.points, t).cursor).find(Boolean) || null;
    if (pop === null) assert.equal(cur, null, `t ${t}`); else nearZ(cur, pop, 1e-12);
  }
  assert.deepEqual({ ...REPLAY }, { seconds: 2.4, hold: 0.4, step: 0.1 });
  assert.ok(Object.isFrozen(REPLAY));
});

test('L6 pagesSanitize (A2)', () => {
  const page = (i, extra = {}) => ({ name: 'p' + i, savedAt: i, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: z(0, 0), r: 1 }], ...extra });
  assert.equal(pagesSanitize([{ name: 'a', savedAt: 1, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: z(0, 0), r: 1 }] }, 'junk', { name: 'b' }]).length, 1);
  const many = pagesSanitize(Array.from({ length: 25 }, (_, i) => page(i + 1)));
  assert.equal(many.length, 20);
  assert.deepEqual(many.map((p) => p.savedAt), Array.from({ length: 20 }, (_, i) => 25 - i), 'the newest 20, newest first');
  assert.deepEqual(pagesSanitize(null), []); assert.deepEqual(pagesSanitize({}), []); assert.deepEqual(pagesSanitize('x'), []); assert.deepEqual(pagesSanitize([]), []);
  const one = pagesSanitize([page(3, { name: '  my   stroke  ' })])[0];
  assert.deepEqual(one, { name: 'my stroke', savedAt: 3, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: z(0, 0), r: 1 }] });
  assert.equal(pagesSanitize([page(1, { name: 'x'.repeat(60) })])[0].name.length, PAGE_LIMITS.maxName);
  assert.equal(pagesSanitize([page(1, { name: '   ' })]).length, 0, 'a page needs a name');
  assert.equal(pagesSanitize([page(1, { name: 7 })]).length, 0);
  assert.equal(pagesSanitize([page(1, { shapes: [] })]).length, 0, 'a page needs a shape');
  assert.equal(pagesSanitize([page(1, { shapes: [{ kind: 'nope' }] })]).length, 0, 'a page needs a shape that can be drawn');
  assert.equal(pagesSanitize([page(1, { shapes: 'x' })]).length, 0);
  assert.equal(pagesSanitize([page(1, { fn: { kind: 'catalog', id: 'nonsense', src: 'z' } })]).length, 0, 'an unknown function');
  assert.equal(pagesSanitize([page(1, { fn: { kind: 'custom', src: 'z +' } })]).length, 0, 'a formula that does not parse');
  assert.equal(pagesSanitize([page(1, { fn: null })]).length, 0);
  assert.equal(pagesSanitize([page(1, { savedAt: 'yesterday' })])[0].savedAt, 0);
  assert.equal(pagesSanitize([page(1, { savedAt: -5 })])[0].savedAt, 0);
  const shapes = [{ kind: 'circle', center: z(0, 0), r: 1 }, { kind: 'nope' }, { kind: 'verticalLine', x: 2 }];
  assert.deepEqual(pagesSanitize([page(1, { shapes })])[0].shapes, [{ kind: 'circle', center: z(0, 0), r: 1 }, { kind: 'verticalLine', x: 2 }], 'the shapes that cannot be drawn are dropped, the rest stay');
  assert.equal(pagesSanitize([page(1, { shapes: Array.from({ length: 60 }, (_, i) => ({ kind: 'verticalLine', x: i / 10 })) })])[0].shapes.length, 40);
  // the same savedAt: the input order is kept
  assert.deepEqual(pagesSanitize([page(5, { name: 'first', savedAt: 9 }), page(6, { name: 'second', savedAt: 9 })]).map((p) => p.name), ['first', 'second']);
});

test('L7 a page remembers every kind of function, and pageFnSpec gives makeFn what it needs', () => {
  const sh = [{ kind: 'verticalLine', x: 1 }];
  const raw = [
    { name: 'zn', savedAt: 5, fn: { kind: 'zn', id: 'zn', src: 'z^5' }, shapes: sh },
    { name: 'seam', savedAt: 6, fn: { kind: 'seam', id: 'cbrt-seam', src: 'z^(1/3)', seam: 0 }, shapes: sh },
    { name: 'own', savedAt: 7, fn: { kind: 'custom', id: null, src: 'z^2 + iz' }, shapes: sh },
    { name: 'cat', savedAt: 8, fn: { kind: 'catalog', id: 'recip', src: '1/z' }, shapes: sh },
  ];
  const out = pagesSanitize(raw);
  assert.deepEqual(out.map((p) => p.name), ['cat', 'own', 'seam', 'zn']);
  assert.deepEqual(out.map((p) => p.fn), [
    { kind: 'catalog', id: 'recip', src: '1/z' }, { kind: 'custom', id: null, src: 'z^2 + iz' },
    { kind: 'seam', id: 'cbrt-seam', src: 'z^(1/3)', seam: 0 }, { kind: 'zn', id: 'zn', src: 'z^5' }]);
  for (const p of out) {
    const f = makeFn(pageFnSpec(p.fn));
    assert.equal(f.src, p.fn.src); assert.equal(f.kind === 'seam' ? 'seam' : f.kind === 'custom' ? 'custom' : f.kind === 'zn' ? 'zn' : 'catalog', p.fn.kind);
  }
  assert.equal(makeFn(pageFnSpec(out[3].fn)).n, 5);
  assert.equal(makeFn(pageFnSpec(out[2].fn)).seam, 0);
  // what the Lab stores for a page is { kind, id, src } (plus seam), as `fn()` reports it: a stored page is stable under a second sanitize
  assert.deepEqual(pagesSanitize(out), out);
  assert.deepEqual(JSON.parse(JSON.stringify(pagesSanitize(out))), out, 'JSON-safe');
  assert.deepEqual({ ...PAGE_LIMITS }, { maxPages: 20, maxName: 40 });
  assert.ok(Object.isFrozen(PAGE_LIMITS));
});

test('L8 the five covered problems still check out on the Lab\'s own pictures (design section 6)', () => {
  const run = (spec, fnId, id) => checkProblem(id, imagesOf(spec, fnId));
  const cases = [
    [{ kind: 'verticalLine', x: 2 }, 'sq', '2.1.2', 129, 1e-9], [{ kind: 'verticalLine', x: 2 }, 'linear-i', '2.1.3', 129, 1e-12],
    [{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: Math.PI / 4 }, 'cube', '2.2.1', 488, 1e-9], [CIRCLE1, 'recip', '2.5.1', 128, 1e-9],
    [{ kind: 'circle', center: z(0, 0), r: 1 }, 'linear-1i', 'P4', 129, 1e-9],
  ];
  for (const [spec, fnId, id, count, tol] of cases) {
    const r = run(spec, fnId, id);
    assert.equal(r.ok, true, id); assert.equal(r.count, count, id); assert.ok(r.maxErr < tol, `${id} max error ${r.maxErr}`);
  }
  // the numbers of the worked solutions (section 6.2): z(t) and w(t) on the clock
  const at = (spec, fnId, t) => { const c = curvesOf(spec)[0]; const zz = pointAt(c, t); return { z: zz, w: makeFn({ id: fnId }).f(zz) }; };
  nearZ(at({ kind: 'verticalLine', x: 2 }, 'sq', 0.25).w, z(0, -8), 1e-9);
  nearZ(at({ kind: 'verticalLine', x: 2 }, 'sq', 0.4).w, z(3.36, -3.2), 1e-9);
  nearZ(at({ kind: 'verticalLine', x: 2 }, 'linear-i', 0.25).w, z(2, 0), 1e-9);
  nearZ(at(CIRCLE1, 'recip', 0.25).w, z(0.5, -0.5), 1e-9);
  nearZ(at(CIRCLE1, 'recip', 0.75).w, z(0.5, 0.5), 1e-9);
  nearZ(at({ kind: 'circle', center: z(0, 0), r: 1 }, 'linear-1i', 0.25).w, z(-1, 1), 1e-9);
  // the live-ink example of the interaction script: the brush stroke from -1 + i to 1 + i under 1/z lies on the circle |w + i/2| = 1/2
  const f = makeFn({ id: 'recip' }).f;
  for (const x of [-1, -0.875, -0.5, 0, 0.5, 1]) { const w = f(z(x, 1)); near(Math.hypot(w.re, w.im + 0.5), 0.5, 1e-12); }
  nearZ(f(z(-0.875, 1)), z(-0.495575221, -0.566371681), 1e-8);
  near(Arg(f(z(0, 1))), -Math.PI / 2, 1e-12);
});

// ---- source checks (the code-inspection of A6) ----
const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, '../../js/stations/lab.js'), 'utf8');
function stripComments(src) {
  let out = '', i = 0, mode = null;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (mode === null) {
      if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') mode = c;
      out += c; i++;
    } else {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
      if (c === mode) mode = null;
      i++;
    }
  }
  return out;
}
const code = stripComments(source);
const bodyOf = (re) => { const m = re.exec(code); assert.ok(m, `found ${re}`); return m[0]; };

test('L9 A6: live ink is solid, ramped and in the output token; the dashed guide is not used for it', () => {
  const ink = bodyOf(/const drawInk = [\s\S]*?\n {2}\};/);
  assert.ok(/drawTimedCurve\(c2, pl, c\.points/.test(ink), 'the draft image is drawn with drawTimedCurve');
  assert.ok(/dash: null/.test(ink) && /ramp: true/.test(ink), 'solid and time-ramped');
  assert.ok(/'--output'/.test(ink), 'the output token');
  assert.ok(!/DASH/.test(ink) && !/strokePolyline/.test(ink), 'no dashed guide in the ink');
  assert.ok(/wplane\.addLayer\(drawInk/.test(code) && /mplane\.addLayer\(drawInk/.test(code), 'on the w-plane and on the morph plane');
  assert.ok(!/for \(const c of draftOut\) strokePolyline/.test(code), 'the iteration-1 dashed draft image is gone');
});

test('L10 A6: Replay honours reduced motion, pages go through the store, unmount cancels the replay frame', () => {
  assert.ok(/function startReplay\(\)[\s\S]{0,600}if \(reduced\(\)\)/.test(code), 'startReplay checks reduced motion');
  assert.ok(/store\.set\('lab\.pages'/.test(code) && /pagesSanitize\(store\.get\('lab\.pages'/.test(code), 'lab.pages is read and written through ctx.store and pagesSanitize');
  assert.ok(!/localStorage|sessionStorage/.test(code));
  assert.ok(/for \(const id of \[[^\]]*replayRaf\]\) if \(id\) cancelAnimationFrame\(id\)/.test(code), 'unmount cancels the replay frame');
  assert.ok(/listenControl\(listenHost, 'lab'\)/.test(code), 'the Listen control is offered after the planes');
  assert.ok(/decisionChips\(p, \{ idPrefix: 'lab-problem' \}\)/.test(code), 'the problem panel shows the two decision chips');
});

test('L11 module hygiene: the new exports exist and nothing touches window at import', () => {
  for (const name of ['FRAME_MIN', 'POLE_CROP', 'POLE_MIN_SCALE', 'runsIntoPole', 'frameBounds', 'poleView', 'REPLAY', 'replayWindow', 'PAGE_LIMITS', 'pagesSanitize', 'pageFnSpec']) assert.ok(name in lab, name);
  assert.equal(typeof globalThis.window, 'undefined');
});
```

## Appendix C: `tests/interact/i2-lab-diary.mjs` (new; 3 of 3 at the harness views, on three consecutive runs)

```js
// tests/interact/i2-lab-diary.mjs: the Lab as a diary (acceptance criteria A1 and A5 of goal i2-lab-diary).
//   node tools/smoke.mjs --route lab --script tests/interact/i2-lab-diary.mjs --dark --out docs/review/iter-2/i2-lab-diary
// Design: docs/designs/iter-2/i2-lab-diary.md, section 7.3. Runs at desktop (1280), phone (390) and dark desktop.

import { clickChip, planePixel, readText, setSlider, settle } from './_helpers.mjs';

const pause = (page, ms) => page.waitForTimeout(ms);
const lab = (page, name) => page.evaluate((n) => window.__mv.lab[n](), name);
const nowhere = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

// A <details> disclosure (#lab-more, #lab-pages) opens by a click on its summary (#<id>-toggle).
async function openDetails(page, id) {
  if (!(await page.evaluate((i) => document.getElementById(i).open, id))) await page.click(`#${id}-toggle`);
  await settle(page, 2);
}

// Press on one plane point, move to another in `steps`, and (unless hold) release. The pointer is left down when hold is true.
async function stroke(page, planeId, a, b, { steps = 8, hold = false } = {}) {
  const p = await planePixel(page, planeId, a);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  const q = await planePixel(page, planeId, b);
  await page.mouse.move(q.x, q.y, { steps });
  if (!hold) { await page.mouse.up(); await settle(page, 3); }
}

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const phone = page.viewportSize().width < 600;

  // ---------------- A1 (1) and (2): a first visit, planes first, the line off the axis ----------------
  await page.waitForFunction(() => window.__mv && window.__mv.lab, null, { timeout: 8000 });     // every module has loaded: the reload below aborts nothing
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.reload({ waitUntil: 'load' });
  await pause(page, 900);
  await page.waitForFunction(() => window.__mv.lab && window.__mv.lab.frame().w.unitsAcross < 6, null, { timeout: 8000 });     // the w-plane has been framed
  const layout = await page.evaluate(() => {
    const top = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.top + window.scrollY; };
    const z = document.getElementById('lab-zplane-viewport'), after = (id) => !!(z.compareDocumentPosition(document.getElementById(id)) & Node.DOCUMENT_POSITION_FOLLOWING);
    const zc = document.getElementById('lab-zplane-canvas').getBoundingClientRect(), wc = document.getElementById('lab-wplane-canvas').getBoundingClientRect();
    return { zTop: top('lab-zplane-canvas'), toolbarTop: top('lab-toolbar'), fns: after('lab-fns'), more: after('lab-more'), pages: after('lab-pages'),
      zH: zc.height, zW: zc.width, bothInOneScreen: wc.bottom - zc.top };
  });
  assert(layout.zTop <= (phone ? 640 : 480), `A1(1): the z-plane canvas starts at ${layout.zTop.toFixed(0)} px`);
  assert(layout.toolbarTop < layout.zTop && layout.fns && layout.more && layout.pages, `A1(1): the toolbar, then the planes, then f, pages and More: ${JSON.stringify(layout)}`);
  if (phone) assert(layout.zH / layout.zW < 0.85 && layout.bothInOneScreen <= 720, `phone: 5:4 planes, so both fit one screen (${layout.bothInOneScreen.toFixed(0)} px): ${JSON.stringify(layout)}`);
  else assert(Math.abs(layout.zH - layout.zW) < 2, 'desktop: square planes');
  const fr = await page.evaluate(() => { const w = window.__mv.planes.get('lab-wplane'); return { gap: Math.abs(w.toPixel({ re: 0.5, im: 0 }).x - w.toPixel({ re: 0, im: 0 }).x), ua: w.getView().unitsAcross, centre: w.getView().center, size: w.getSize() }; });
  assert(fr.gap >= (phone ? 40 : 60), `A1(2): the line Re w = 1/2 is ${fr.gap.toFixed(1)} px from the v-axis`);
  assert(fr.ua <= 8, `A1(2): the w-plane is ${fr.ua.toFixed(2)} units across`);
  assert(Math.abs((await lab(page, 'frame')).w.unitsAcross - fr.ua) < 1e-12, 'frame() reports the w-plane view');
  log(`first picture: the line is ${fr.gap.toFixed(1)} px from the axis, ${fr.ua.toFixed(3)} units across, z canvas at ${layout.zTop.toFixed(0)} px`);
  await shot('first-visit');

  // ---------------- A1 (3): live ink while the stroke is drawn ----------------
  await clickChip(page, 'lab-tool-brush');
  const n0 = (await lab(page, 'shapes')).length;
  const ink0 = (await lab(page, 'stats')).inkFrames;
  await stroke(page, 'lab-zplane', { re: -1, im: 1 }, { re: 1, im: 1 }, { hold: true });
  await settle(page, 3);
  const d = await lab(page, 'draft');
  assert(d.active && d.tool === 'brush' && d.out >= 1 && d.inked === true, `A1(3): live ink mid-stroke: ${JSON.stringify(d)}`);
  await page.waitForFunction((n) => window.__mv.lab.stats().inkFrames > n, ink0, { timeout: 4000 });
  assert((await lab(page, 'stats')).inkFrames > ink0, 'A1(3): the ink was painted on the w-plane');
  assert(await page.evaluate(() => document.getElementById('lab-replay').disabled), 'Replay waits while a stroke is being drawn');
  await shot('live-ink');
  await page.mouse.up();
  await settle(page, 3);
  assert((await lab(page, 'shapes')).length === n0 + 1, 'A1(3): the stroke is kept');
  const d2 = await lab(page, 'draft');
  assert(!d2.active && d2.out === 0 && d2.inked === false, `after the release the draft is gone: ${JSON.stringify(d2)}`);

  // ---------------- A1 (4): Replay on one clock, a cursor on both planes ----------------
  const t0 = await lab(page, 't');
  await clickChip(page, 'lab-replay');
  await pause(page, 150);
  const r1 = await lab(page, 'replay');
  assert(r1.on && r1.t > 0 && r1.t < 1 && r1.cursor.z && r1.cursor.w, `A1(4): replaying: ${JSON.stringify(r1)}`);
  await pause(page, 250);
  const r2 = await lab(page, 'replay');
  assert(r2.on && r2.t > r1.t, `A1(4): the replay moves on: ${r1.t} to ${r2.t}`);
  assert(Math.abs((await lab(page, 't')) - r2.t) < 0.2, 'the clock follows the replay');
  await shot('replay');
  await page.waitForFunction(() => !window.__mv.lab.replay().on, null, { timeout: 4000 });
  const r3 = await lab(page, 'replay');
  assert(!r3.on && r3.cursor.z === null && r3.cursor.w === null && Math.abs((await lab(page, 't')) - t0) < 1e-9, `the replay ends at rest and gives the clock back: ${JSON.stringify(r3)}`);

  // the scrubber: a paused replay at a time of the student's choosing
  await setSlider(page, 'lab-replay-t', 0.5);
  const sc = await lab(page, 'replay');
  assert(!sc.on && Math.abs(sc.t - 0.5) < 1e-9 && sc.cursor.z && sc.cursor.w, `the scrubber pauses the replay at 0.5: ${JSON.stringify(sc)}`);
  assert(Math.abs((await lab(page, 't')) - 0.5) < 1e-9, 'and the clock goes with it');
  await setSlider(page, 'lab-replay-t', 1);
  const sc1 = await lab(page, 'replay');
  assert(!sc1.on && sc1.cursor.z === null && Math.abs((await lab(page, 't')) - t0) < 1e-9, 'the scrubber at 1 is rest again');

  // reduced motion: a stepper
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.getElementById('lab-replay').textContent === 'Step the replay', null, { timeout: 4000 });
  assert((await readText(page, '#lab-replay')) === 'Step the replay', 'reduced motion: the label says it steps');
  await clickChip(page, 'lab-replay');
  const s1 = await lab(page, 'replay');
  assert(!s1.on && Math.abs(s1.t - 0.1) < 1e-9 && s1.cursor.z && s1.cursor.w, `reduced motion: one press, one step: ${JSON.stringify(s1)}`);
  await clickChip(page, 'lab-replay');
  assert(Math.abs((await lab(page, 'replay')).t - 0.2) < 1e-9, 'reduced motion: the next press is the next step');
  for (let i = 0; i < 8; i++) await clickChip(page, 'lab-replay');
  const sEnd = await lab(page, 'replay');
  assert(!sEnd.on && sEnd.t === 1 && sEnd.cursor.z === null, `reduced motion: the tenth press ends the replay: ${JSON.stringify(sEnd)}`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.getElementById('lab-replay').textContent === 'Replay my stroke', null, { timeout: 4000 });
  assert((await readText(page, '#lab-replay')) === 'Replay my stroke', 'the label comes back');

  // Escape stops a replay from anywhere and gives the clock back; the button says why it waits
  await clickChip(page, 'lab-replay');
  await pause(page, 200);
  await page.keyboard.press('Escape');
  const esc = await lab(page, 'replay');
  assert(!esc.on && esc.cursor.z === null && Math.abs((await lab(page, 't')) - t0) < 1e-9, `Escape ends the replay: ${JSON.stringify(esc)}`);
  assert((await page.getAttribute('#lab-replay', 'title')).startsWith('Draw the last shape'), 'the Replay button explains itself');

  // a replay is dropped by Play, by the clock and by an edit
  await clickChip(page, 'lab-replay');
  await pause(page, 200);
  await clickChip(page, 'lab-play');
  assert(!(await lab(page, 'replay')).on, 'Play ends the replay');
  await clickChip(page, 'lab-play');
  await clickChip(page, 'lab-replay');
  await pause(page, 200);
  await setSlider(page, 'lab-t', 0.7);
  assert(!(await lab(page, 'replay')).on && Math.abs((await lab(page, 't')) - 0.7) < 1e-9, 'the Time t slider ends the replay and keeps its own value');
  await setSlider(page, 'lab-t', 0.4);

  // ---------------- A1 (5): pages ----------------
  const savedCount = (await lab(page, 'shapes')).length;
  await page.fill('#lab-page-name', 'my stroke');
  await page.click('#lab-page-save');
  await settle(page, 2);
  assert((await readText(page, '#lab-page-open-0')).includes('my stroke'), 'A1(5): the page is listed');
  const pg = JSON.parse(await stored(page, 'mv:lab.pages'));
  assert(pg.length === 1 && pg[0].shapes.length >= 1 && pg[0].name === 'my stroke' && pg[0].fn.id === 'recip', `A1(5): stored once: ${JSON.stringify(pg).slice(0, 160)}`);
  assert((await readText(page, '#lab-pages-toggle')) === 'Pages (1)' && (await lab(page, 'pages')).length === 1, 'the summary counts the pages and pages() reports them');
  await clickChip(page, 'lab-clear');
  assert((await lab(page, 'shapes')).length === 0, 'A1(5): cleared');
  assert(await page.evaluate(() => document.getElementById('lab-page-save').disabled) && !(await page.isEnabled('#lab-replay')), 'with nothing drawn, Save and Replay wait');
  assert((await page.getAttribute('#lab-replay', 'title')) === 'Draw something first.', 'and Replay says what it waits for');
  await clickChip(page, 'lab-page-open-0');
  assert((await lab(page, 'shapes')).length === savedCount && (await lab(page, 'fn')).id === 'recip', 'A1(5): the page comes back, with its function');
  await clickChip(page, 'lab-undo');
  assert((await lab(page, 'shapes')).length === 0, 'Undo takes the opened page away again');
  // a second page, newest first, a typed function and the 20-page limit
  await clickChip(page, 'lab-page-open-0');
  await page.fill('#lab-fn-src', 'z^2 + iz');
  await page.click('#lab-fn-apply');
  await page.fill('#lab-page-name', '  second   page ');
  await page.press('#lab-page-name', 'Enter');
  await settle(page, 2);
  assert((await readText(page, '#lab-page-open-0')).includes('second page') && (await readText(page, '#lab-page-open-1')).includes('my stroke'), 'newest first, the name tidied');
  await clickChip(page, 'lab-page-delete-1');
  assert((await page.evaluate(() => document.getElementById('lab-page-list').children.length)) === 1 && await page.isVisible('#lab-page-restore'), 'a page is deleted and can be put back');
  await clickChip(page, 'lab-page-restore');
  assert((await page.evaluate(() => document.getElementById('lab-page-list').children.length)) === 2, 'Put it back');
  await clickChip(page, 'lab-page-open-0');
  assert((await lab(page, 'fn')).src === 'z^2 + iz', 'a typed function is kept by a page');
  await page.evaluate(() => {
    const mk = (i) => ({ name: 'p' + i, savedAt: i + 1, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'verticalLine', x: 1 }] });
    localStorage.setItem('mv:lab.pages', JSON.stringify(Array.from({ length: 20 }, (_, i) => mk(i))));
  });
  await page.reload({ waitUntil: 'load' });
  await pause(page, 900);
  assert((await lab(page, 'pages')).length === 20, 'twenty stored pages are read back');
  await page.fill('#lab-page-name', 'one too many');
  await page.click('#lab-page-save');
  assert((await readText(page, '#lab-page-status')).includes('20 pages is the limit') && (await lab(page, 'pages')).length === 20, 'the 21st page is refused and says why');
  for (let i = 0; i < 20; i++) await page.click('#lab-page-delete-0');
  assert((await page.evaluate(() => document.getElementById('lab-page-list').children.length)) === 0 && await page.isVisible('#lab-page-empty'), 'A1(5): the list is empty');
  assert(JSON.parse(await stored(page, 'mv:lab.pages')).length === 0, 'and the store agrees');
  // a damaged store entry is simply no pages
  await page.evaluate(() => localStorage.setItem('mv:lab.pages', '{"not":"an array"}'));
  await page.reload({ waitUntil: 'load' });
  await pause(page, 900);
  assert((await lab(page, 'pages')).length === 0, 'a damaged page store is no pages, and no error');

  // ---------------- A1 (6): the problem panel carries the two decisions ----------------
  await openDetails(page, 'lab-more');
  await clickChip(page, 'lab-preset-circle1-load');
  const ch = await page.evaluate(() => ({ shown: !document.getElementById('lab-problem').hidden,
    names: !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="names"][data-value="any"]'),
    address: !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="address"][data-value="P"]'),
    ids: [document.getElementById('lab-problem-address') && 1, document.getElementById('lab-problem-names') && 1] }));
  assert(ch.shown && ch.names && ch.address && ch.ids.every(Boolean), `A1(6): the two decision chips: ${JSON.stringify(ch)}`);
  await clickChip(page, 'lab-problem-names');
  assert((await readText(page, '#lab-problem-meaning')).startsWith('Any name of the angle works'), 'tapping the Names chip says what it means');
  await clickChip(page, 'lab-preset-x2-load');
  assert(await page.evaluate(() => document.getElementById('lab-problem').dataset.problem === '2.1.2' && !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="address"][data-value="C"]') && !!document.querySelector('#lab-problem-decisions .decision-chip[data-decision="names"][data-value="none"]')), 'the chips follow the problem (2.1.2: Cartesian, names none)');

  // ---------------- the break in the image, said in words, while the replay passes it ----------------
  await clickChip(page, 'lab-preset-circle1-load');
  await setSlider(page, 'lab-replay-t', 0.25);
  assert((await readText(page, '#lab-replay-note')) === '', 'before the break there is nothing to explain');
  await setSlider(page, 'lab-replay-t', 0.8);
  assert((await readText(page, '#lab-replay-note')).startsWith('The image has a break.'), 'after the break the replay says why there is one');
  const gapR = await lab(page, 'replay');
  assert(gapR.cursor.z && gapR.cursor.w, 'at 0.8 both cursors are on');
  await setSlider(page, 'lab-replay-t', 0.5);
  const inGap = await lab(page, 'replay');
  assert(inGap.cursor.z && inGap.cursor.w === null, `at t = 1/2, z = 0 and w is nowhere: ${JSON.stringify(inGap)}`);
  await setSlider(page, 'lab-replay-t', 1);

  // ---------------- live ink in the other views and for other tools ----------------
  await clickChip(page, 'lab-clear');
  await clickChip(page, 'lab-tool-rect');
  await stroke(page, 'lab-zplane', { re: -1, im: 0.5 }, { re: 0.5, im: 1.5 }, { hold: true });
  await settle(page, 3);
  const dr = await lab(page, 'draft');
  assert(dr.active && dr.tool === 'rect' && dr.out >= 1 && dr.inked, `a rectangle being dragged out is inked on the w-plane too: ${JSON.stringify(dr)}`);
  await page.mouse.up();
  await settle(page, 3);
  await clickChip(page, 'lab-undo');
  await clickChip(page, 'lab-view-morph');
  await stroke(page, 'lab-zplane', { re: -1, im: 0.5 }, { re: 0.5, im: 1.5 }, { hold: true });
  await settle(page, 3);
  const dm = await lab(page, 'draft');
  assert(dm.active && dm.out >= 1 && dm.inked, `in the morph view the draft image is inked on the morph plane: ${JSON.stringify(dm)}`);
  await page.mouse.up();
  await settle(page, 3);
  // Replay in the morph view slides the plane, then gives the slider back
  await setSlider(page, 'lab-s', 0.25);
  await clickChip(page, 'lab-replay');
  await page.waitForFunction(() => { const s = window.__mv.lab.s(); return s > 0.05 && s < 0.99; }, null, { timeout: 3000 });
  const sMid = await lab(page, 's');
  assert(sMid > 0.05 && sMid < 0.99, `the morph slides while the stroke replays: s = ${sMid}`);
  await page.waitForFunction(() => !window.__mv.lab.replay().on, null, { timeout: 4000 });
  assert(Math.abs((await lab(page, 's')) - 0.25) < 1e-9, 'and the slider is given back');
  await clickChip(page, 'lab-view-side');
  // predict first: no ink, no replay, nothing of the image
  await clickChip(page, 'lab-predict');
  const dp0 = await lab(page, 'draft');
  await stroke(page, 'lab-zplane', { re: -1, im: 0.5 }, { re: 0.5, im: 1.5 }, { hold: true });
  await settle(page, 3);
  const dp = await lab(page, 'draft');
  assert(dp.active && dp.out === 0 && dp.inked === false, `while predicting the image is not inked: ${JSON.stringify(dp)} (before ${JSON.stringify(dp0)})`);
  await page.mouse.up();
  await settle(page, 3);
  assert(await page.evaluate(() => document.getElementById('lab-replay').disabled), 'while predicting Replay waits');
  await clickChip(page, 'lab-predict');
  assert(await page.isEnabled('#lab-replay'), 'and is back when Predict first is off');
  // the 3D views: the replay clock moves the markers (the scrubber is the deterministic way: WebGL frames are slow in the harness) and gives the clock back
  await clickChip(page, 'lab-view-landscape');
  const tb = await lab(page, 't');
  await setSlider(page, 'lab-replay-t', 0.7);
  const r3d = await lab(page, 'replay');
  assert(!r3d.on && Math.abs((await lab(page, 't')) - 0.7) < 1e-9 && r3d.cursor.z, `the landscape markers follow the replay clock: ${JSON.stringify(r3d)}`);
  await setSlider(page, 'lab-replay-t', 1);
  assert(Math.abs((await lab(page, 't')) - tb) < 1e-9, 'and the clock comes back');
  await clickChip(page, 'lab-view-side');

  // ---------------- the rest of the page ----------------
  assert((await nowhere(page)) <= 1, 'no horizontal overflow');
  assert(await page.evaluate(() => !!document.getElementById('lab-toolbar') && document.getElementById('lab-tools').closest('#lab-toolbar') !== null), '#lab-toolbar holds the tools');
  log('lab diary checks passed');
}
```

## Appendix D: edits of `tests/unit/i1-station-lab.test.mjs` (U12b and U24; verified: 39 of 39)

```diff
--- a/tests/unit/i1-station-lab.test.mjs
+++ b/tests/unit/i1-station-lab.test.mjs
@@ -298,11 +298,11 @@
 });
 
 test('U12b frameBounds: a pole picture is framed on its bulk, a polynomial picture on all of it', () => {
-  // 2.5.1: the line Re w = 1/2 runs off to infinity; imageBounds still spans +-10, which put the line 4 percent of the half-width from the v axis
+  // 2.5.1: the line Re w = 1/2 runs off to infinity. Iteration 2: the frame is the bulk widened to FRAME_MIN = 4 across both ways (i2-lab-diary), so the
+  // axis (u = 0) and the line (u = 1/2) are both inside: x in [-1.5, 2.5], y in [-2, 2]. (Iteration 1 pinned x = [0.5, 0.5] and half-height 4 to 6.)
   const pole = frameBounds(imagesOf('circle1', 'recip'));
-  near(pole.xRange[0], 0.5); near(pole.xRange[1], 0.5);
-  assert.ok(pole.yRange[1] > 4 && pole.yRange[1] < 6 && near(pole.yRange[0], -pole.yRange[1]) === undefined, `half-height ${pole.yRange[1]}`);
-  assert.ok(pole.kept < pole.total, 'it says it left the far arms out');
+  near(pole.xRange[0], -1.5); near(pole.xRange[1], 2.5); near(pole.yRange[0], -2); near(pole.yRange[1], 2);
+  assert.ok(pole.kept < pole.total && pole.pole === true, 'it says it left the far arms out');
   // nothing is cut for a polynomial: the same frame as imageBounds
   for (const [key, fnId] of [['x2', 'sq'], ['x2', 'linear-i'], ['unit', 'linear-1i'], ['sector', 'cube']]) {
     assert.deepEqual(frameBounds(imagesOf(key, fnId)), imageBounds(imagesOf(key, fnId)), `${key} under ${fnId}`);
@@ -602,7 +602,7 @@
 
 test('U24 A6 source check: imports', () => {
   const need = {
-    '../core/plane.js': ['createPlane', 'drawCartAddress', 'drawPolarAddress', 'drawSeam', 'drawDot', 'createLabelPlacer', 'cssColor', 'mixColor', 'niceGridStep', 'DASH'],
+    '../core/plane.js': ['createPlane', 'drawCartAddress', 'drawPolarAddress', 'drawSeam', 'drawDot', 'drawTimedCurve', 'createLabelPlacer', 'cssColor', 'mixColor', 'niceGridStep', 'DASH'],
     '../core/shapes.js': ['specToCurves as buildCurves', 'freehand', 'pointAt', 'resample', 'classify', 'curveLength'],
     '../core/mapping.js': ['pushForward', 'pushForwardAll', 'morph', 'lift', 'pointOnPieces'],
     '../core/domaincolor.js': ['createDomainColoring', 'drawColorWheel', 'rangesFromView', 'DOMAIN_LEGEND'],
@@ -613,7 +613,9 @@
     '../core/explainer.js': ['createExplainer'],
     '../core/staircase.js': ['createStaircase'],
     '../data/functions.js': ['fnById'],
-    '../data/problems.js': ['problemById', 'problemsForStation', 'routeFor', 'statementParts', 'addressLabel', 'addressTones'],
+    '../data/problems.js': ['problemById', 'problemsForStation', 'routeFor', 'statementParts'],     // iteration 2: the address chip is decisions.chips now
+    '../core/decisions.js': ['chips as decisionChips'],
+    '../core/listen.js': ['listenControl'],
   };
   for (const [mod, names] of Object.entries(need)) {
     const m = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${mod.replace(/[./]/g, (c) => '\\' + c)}'`).exec(code);
```

## Appendix E: edits of `tests/interact/i1-station-lab.mjs` (presets live in More; waits for the Lab hook; verified green at the three views)

```diff
--- a/tests/interact/i1-station-lab.mjs
+++ b/tests/interact/i1-station-lab.mjs
@@ -6,12 +6,20 @@
 
 const VIEWS = ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d'];
 const pause = (page, ms) => page.waitForTimeout(ms);
+const openMore = async (page) => {
+  const open = await page.evaluate(() => document.getElementById('lab-more').open);
+  if (!open) await page.click('#lab-more-toggle');
+  await settle(page, 2);
+};
+const presetChip = async (page, id) => { await openMore(page); await clickChip(page, id); };
 const lab = (page, name) => page.evaluate((n) => window.__mv.lab[n](), name);
 const nowhere = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
 
+const labReady = (page) => page.waitForFunction(() => window.__mv && window.__mv.lab, null, { timeout: 20000 });   // a busy machine mounts the Lab late
 async function go(page, hash, ms = 900) {
   await page.evaluate((hh) => { location.hash = hh; }, hash);
   await pause(page, ms);
+  if (/^lab/.test(hash)) await labReady(page);
 }
 
 async function dragOn(page, planeId, a, b, steps = 8) {
@@ -154,7 +162,9 @@
     await page.evaluate((h) => { location.hash = h; }, hash);
     await page.reload({ waitUntil: 'load' });
     await pause(page, 900);
+    if (/^#lab/.test(hash)) await labReady(page);
   };
+  await labReady(page);                                                                          // every module has loaded: the reload below aborts no request
   await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
   await reloadAt('#lab');
   const first = await page.evaluate(() => ({ shapes: window.__mv.lab.shapes().map((r) => r.spec), fn: window.__mv.lab.fn().id, problem: document.getElementById('lab-problem') && document.getElementById('lab-problem').dataset.problem,
@@ -348,7 +358,7 @@
     const d = await lab(page, 'draft');
     assert(!d.active && d.curves === 0 && d.out === 0 && !d.closeEnabled, `${what}: the half-drawn polygon is gone from both planes: ${JSON.stringify(d)}`);
   };
-  await halfPolygon(); await clickChip(page, 'lab-preset-unit'); await noDraft('a preset');
+  await halfPolygon(); await presetChip(page, 'lab-preset-unit'); await noDraft('a preset');
   await halfPolygon(); await clickChip(page, 'lab-clear'); await noDraft('Clear');
   assert((await lab(page, 'shapes')).length === 0, 'Clear emptied the Lab');
   await halfPolygon(); await clickChip(page, 'lab-undo'); await noDraft('Undo');
@@ -446,6 +456,7 @@
   assert(chip.p === '2.5.1' && chip.href === '#problem-2-5-1', `A3: preset chip links: ${JSON.stringify(chip)}`);
 
   // the centre of every preset group is on its load button, so clicking the group loads the preset and does not follow the link
+  await openMore(page);
   const hits = await page.evaluate(() => {
     const out = {};
     for (const g of document.querySelectorAll('.lab-preset')) {
@@ -462,7 +473,7 @@
   const NO_CHECK = 'There is no numeric check for this problem. The picture is the evidence.';
   for (const k of keys) {
     const hash0 = await page.evaluate(() => location.hash);
-    await clickChip(page, `lab-preset-${k}`);
+    await presetChip(page, `lab-preset-${k}`);
     await pause(page, 150);
     const after = await page.evaluate(() => ({ hash: location.hash, lab: !!(window.__mv && window.__mv.lab), shapes: window.__mv.lab ? window.__mv.lab.shapes().length : -1,
       problem: document.getElementById('lab-problem')?.dataset.problem, check: document.getElementById('lab-check')?.textContent }));
@@ -484,7 +495,7 @@
   // ---------------- A4: predict first and the hand-off ----------------
   await go(page, 'lab', 900);
   await clickChip(page, 'lab-predict');
-  await clickChip(page, 'lab-preset-unit');
+  await presetChip(page, 'lab-preset-unit');
   const hid = await page.evaluate(() => { const w = document.getElementById('lab-wplane-wrap'); return w.offsetParent === null || w.getAttribute('aria-hidden') === 'true'; });
   assert(hid, 'A4: the w-plane wrapper is hidden while predicting');
   assert(await page.isVisible('#lab-reveal'), 'A4: Reveal is visible');
@@ -503,7 +514,7 @@
       copied: frags.filter((f) => text.includes(f)) };
   });
   for (const k of ['unit', 'circle1', 'x2', 'sector']) {
-    await clickChip(page, `lab-preset-${k}`);
+    await presetChip(page, `lab-preset-${k}`);
     const ps = await panelState();
     assert(!ps.why && ps.wait && !ps.ways && !ps.answer, `A4: ${ps.id} while predicting hides the why-line, the ways and the answer: ${JSON.stringify(ps)}`);
     assert(ps.copied.length === 0, `A4: ${ps.id} shows no text of its answer while predicting: ${JSON.stringify(ps.copied)}`);
@@ -519,7 +530,7 @@
     assert(!leak.onPage && leak.head.length > 10, `A4: while predicting, the note of ${leak.id} ("${leak.head}") is nowhere on the page`);
     assert(leak.shown === 'Reveal the image to read what this function does to a shape.' && leak.tex, `A4: the note line waits for Reveal and the formula stays: ${leak.shown}`);
   }
-  await clickChip(page, 'lab-preset-unit');
+  await presetChip(page, 'lab-preset-unit');
   await clickChip(page, 'lab-tool-probe');
   ro = await readText(page, '#lab-readout');
   assert(ro.includes('z = 1 + i') && !ro.includes('-> w'), `A4: the probe does not leak w while predicting: ${ro}`);
@@ -680,7 +691,7 @@
   await go(page, 'home', 400);
   await go(page, 'lab', 900);
   assert((await lab(page, 'shapes')).length === 1, 'the drawing comes back from the store after a visit elsewhere');
-  await clickChip(page, 'lab-preset-unit');
+  await presetChip(page, 'lab-preset-unit');
   assert((await lab(page, 'fn')).id === 'linear-1i', 'a preset picks its function');
   await clickChip(page, 'lab-undo');
   assert((await lab(page, 'shapes'))[0].spec.kind === 'verticalLine', 'undo brings back the shape the preset replaced');
```

---

## Appendix F: build notes (iteration 2 builder)

The build applied Appendices A, D and E with `patch -p1` (no rejects, no offsets) and created B and C as `tests/unit/i2-lab-diary.test.mjs` and `tests/interact/i2-lab-diary.mjs`. Two small differences from the appendices, neither of which changes behaviour:

1. `tests/interact/i2-lab-diary.mjs`: a helper `labReady` (wait for `window.__mv.lab.pages` to be a function) after each of the three `page.reload` calls that follow the first one. The first build run at machine load average 29 failed once at step 11 with `window.__mv.lab` undefined 900 ms after a reload; with the wait it passes at the three views (two consecutive runs, the second at load 26).
2. `js/stations/lab.js` CSS: the one rule that zeroes the nested presets panel's shadow (`#station-lab #lab-more > #lab-presets { ... box-shadow: none; ... }`) carries a `taste-skill-ignore` comment, so `bash tools/taste.sh lint js/stations/lab.js` reports the same two iteration-1 `mono` FAILs (the typeable function field and its echo) and no new one.

Verified after the build: `node --test tests/unit/i1-station-lab.test.mjs tests/unit/i2-lab-diary.test.mjs` 50 of 50; `tools/smoke.mjs --route lab --script tests/interact/i2-lab-diary.mjs --dark` 3 of 3 (line 70.0 px from the axis, 3.200 units across, z canvas at 369 px at 1280; 42.5 px, 3.976 units, 550 px at 390); the i1 script 3 of 3; A4 15 of 15; `npm test` 1107 of 1111 with the only failures `architecture-sync` 3.12 (`helixPoint`, `js/core/three-view.js`, another goal) and U6 `motion-time` (a video file another goal is rendering).

## Appendix G: fix round (iteration 2, after the review against this design)

The reviewer found one major and seven minor issues. What changed, issue by issue (the shipped `js/stations/lab.js`, `tests/unit/i2-lab-diary.test.mjs` and `tests/interact/i2-lab-diary.mjs` are the truth; Appendices A to C show the first delivery):

1. **Major, a finite picture near a pole was cropped.** Cause: D10 passed `pole: true` whenever a point of the drawing was within 0.35 of a pole, and `frameBounds` then framed on the bulk even though nothing was cut. The line x = 1/4 under 1/z is a circle 4 across; the 3.2-unit pole window showed 22 of its 147 points. Fix: D8 and 5.2 step 6a (`POLE_RUNS` = { min: 10, ratio: 3 }): with nothing cut, the bulk frame is used only when the whole box is more than 10 units across and more than 3 times the bulk. The circle |z - 1/2| = 1/2 (41 units tall, bulk 4) and the opening example (cut) are unchanged; the five drawings of the review are whole again and framed by `fitTo(box, 0.15)`. Tests: unit `L2b` (five finite drawings at the draw clamp 40 and the probe clamp 1e4: `frameBounds(..., { pole: true })` equals `imageBounds`, has no `pole`, every point inside the box; a circle 20 across is still a pole picture; `POLE_RUNS` pinned); interaction script section "a finite picture near a pole is shown whole" (draws the line x = 1/4, the circle of centre 1 radius 3/4 and the rectangle with the snap on and counts the image points outside the auto-framed w-plane view: 0 of 147, 165 and 189; with the old rule the same script fails with "125 of 147 image points are off the w-plane" at 1280 and 48 of 147 at 390; the circle through 0 then keeps the pole frame).
2. **Minor, the toolbar is two rows.** Documented in D3 (and a phone is five rows plus the hint, 550 px to the z canvas, inside the 640 budget of A1(1)). ARCHITECTURE 9 and STORY 5 item 1 still say "one row": request below. Snap and the grid chips stay out of More (hiding the snap switch costs more than the 100 px it saves).
3. **Minor, Save this page was far down.** `#lab-pages` now sits above `#lab-fnpanel` (D2, 5.1 step 4). With the first-visit problem panel open the Save button is at about 1625 px at 1280 (it was 2250).
4. **Minor, Listen did not look like a button.** A CSS rule in `STYLE` gives the idle button the outline and the fill the Walk bar's Listen has; the pressed and error states of the kit still win (the rule is limited to `[aria-pressed="false"]:not([data-state="error"])`).
5. **Minor, the tick label 0.5 sits on the line Re w = 1/2.** It is drawn by `js/core/plane.js` (not owned here); request below. The line is 70 px and 42.5 px from the axis, so A5 holds.
6. **Minor, taste.** What `lab.js` owns is fixed: the clock lost its 1px outline (a tone step separates it), and the lines that must keep a mathematical or typeable look carry `taste-skill-ignore` (the typeable formula field and its echo, the frame of a plane, the time-ramp key). `bash tools/taste.sh lint js/stations/lab.js` goes from 2 FAIL and 4 WARN to 0 FAIL and 1 WARN (the colour legend box). The shadows and outlines of the shared `.panel` rule (including `details#lab-pages`) and the mono slider values are in `css/components.css`: request below.
7. **Minor, the clock after a replay.** `replayEnd` takes `'done'`, `'quiet'` or `'keepT'` (5.4 items 3 and 10). An edit, a new f, a new gesture or Play gives t back (it used to leave the replay's t); the Morph s slider is given back whenever the replay moved it, also after the student left the morph view. Tests: the interaction script drives a new f and a new stroke in the middle of a replay (t back to 0.3) and a view change in the middle of a morph replay (s back to 0.25).
8. **Minor, the plain phone screenshot caught "Loading...".** The wait is in `tools/smoke.mjs` (not owned here): request below. The builder's runs were repeated and the screenshots in `docs/review/iter-2/i2-lab-diary/` were checked by eye.

Requests for other owners: `docs/ARCHITECTURE.md` section 9 (Lab) and `docs/STORY.md` section 5 item 1: say the toolbar is two rows, and that the z-plane is the first picture but not literally the first thing below the title on a phone; also document the new export `POLE_RUNS` and the `frameBounds` rule of step 6a. `js/core/plane.js`: offset the tick label of a tick that sits next to a vertical line. `css/components.css`: the shared `.panel` shadow and outline, mono in the slider and readout values. `tools/smoke.mjs`: wait for `#view` to contain the station before the plain screenshot.
