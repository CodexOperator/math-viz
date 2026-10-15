# D residue report: docs (iteration 1)

Group D owns `docs/ARCHITECTURE.md`, `docs/STORY.md`, `docs/goals/iter-1.json` and `docs/designs/iter-1/*.md`. Nothing else was edited: no code, no test. Nothing was committed.
The only file removed is `docs/ARCHITECTURE.md.orig`, a tracked leftover of the `patch` runs (nothing referenced it).
`npm test`: **774 of 774** (before and after; `architecture-sync` passes every section).

## 1. What was already in place

The three core patches (`C1-architecture-3.5.patch`, `C2-architecture.patch`, `C3-architecture.patch`) had been applied to ARCHITECTURE.md by the orchestrator before this pass
(commits 935ad30 and 80aef18). I did not re-apply them; I read the result against the code (section 5) and fixed what was left over: one sentence in 3.12 still said the
sphere's default `rampWeight` is 0.65 (it is 0.4, the same as plane.js; `three-view.js` was moved with it), and the stale status and 10.8.3 text.

## 2. docs/ARCHITECTURE.md

| Section | Change |
|---|---|
| header | Status paragraph rewritten (after the residue cleanup; what sections 4, 9 and 10 are). |
| 3.5 | `snap` comment: it applies to pointer drags and to arrow-key nudges alike (rule 10.2.7). |
| 3.12 | `addCurve` `rampWeight`: default 0.4 (was written as 0.65), a non-finite value is the default. |
| 3.13 | Keys in use: `progress` with its value, `problems.predict` (persisted), `problems.filter` (memory only), `lab.strokes` (array of Specs, `[]` cleared, missing key first visit), `lab.request`. |
| 4 | Point 2: the Lab does not open blank, its default is problem 2.5.1 (not 2.1.2). Row P3: composition panel at the top, problem card P3, input x = 2. New "Lab store formats": the ten Spec kinds (`freehand`, `cartGrid`, `fillRays`, `fillArcs`, `grid` on `sector`), `[]` versus a missing key, the example stored like any drawing, a stored array shown as it is (also with an unknown token), writes only on change, what replaces a drawing, a request without shapes brings the function only, `wheel: 'focus'`. |
| 9 | Rewritten against the real DOM: every id and readout string below was read from the finished pages (a Playwright dump of all 21 routes plus problem deep links), and every `#id` token of the section was cross-checked against that dump and the station sources (449 tokens, no miss except route tokens). Per station: planes, handles, extra ids, route tokens, store keys, readout formats as built (typeset names, `π`, `ε`, `z₁ − z₂`, `nθ`, `zⁿ`), footer words, hooks with their return shapes. |
| 10 intro | Names the rules the cleanup added. |
| 10.1 | New 8 (`minmax(0, 1fr)` for a grid track that holds a canvas, a plane, a table or a long line) and 9 (a visit never changes what the student stored). |
| 10.2 | New 7 (a magnet `snap` acts on pointer drags only; Alt+Arrow on a snapped handle is swallowed by design) and 8 (place words after the lines: the placer sees only what the frame already holds; word layer above the curves, order 110 to 120). |
| 10.3 | New 10 (use a widget's options, `sameLabel`, `showK`, `homeLabel`, `compact`, not its markup). |
| 10.4 | 1: a statement's closing punctuation stays with the maths before it (`statementNodes`, `appendStatement`). 2: the inline `wrapAnswerTex` form is allowed. 6: every angle is exactly `Arg z`, "a name for arg z" or `arg z`. New 8: `prose()` goes inside one `<span>` when its parent is flex (`.chip`, `.btn`, `.station-link`, `.thread-badge`, `.check` are `inline-flex`; `.badge` is `inline-block`); the Lab's function chips still break it (open item, section 8 below). |
| 10.6 | 3: the framing idioms (`tightFrame`, `frameLabels` with padding 1.0, `lineWidth` tubes, `rampWeight`, `hiddenScale` with `boundRadius`). |
| 10.7 | 2: readouts are plain text, numbers with an ASCII minus and three decimals; names and constants may be typeset and must stay readable by `nums()` and `parseCart()`. |
| 10.8 | 3: all 21 stations exist; every route must load clean in the full dark smoke (63 checks). The old "every station route is 404" text is gone. |
| 10.9 (new) | Candidates, not rules: a handle with a ring larger than about 20 px draws its word on the canvas; drop crowded words with `setLabel('')` and `optional` words with `maxCost: LABEL_COST.axis`; a multi-line block cannot go through `createLabelPlacer`; the two copies of the problem card are held equal by C26; a view that must contain a point is centred exactly on it. |

Rule candidates recorded as rules (clearly general, each from a real defect): snap on pointer drags only; place words after the lines; `minmax(0, 1fr)`; `prose()` in one span inside a flex parent;
use widget options not markup; a visit never rewrites stored student state. Kept as candidates (one or two stations, or tied to one widget): the ring-handle canvas word, the crowded-word drop,
the multi-line block, the duplicated problem card, the centred view.

## 3. docs/STORY.md

- Status line: the code exists now; what was brought in line.
- **Section 3**: the 13 aha sentences (1.1.1, 1.3.1, 1.4.1, 1.4.2, 2.1.1, 2.2.1, 2.3.1, 2.5.1, 3.1.2, P1, P2, P4, P5) are replaced by the exact texts of `AHA_LABELLED` in `tests/unit/i1-data.test.mjs`, written by a script from that table so no word differs (the pipes of 3.1.2 are escaped). Each angle now says `Arg` (one value), a name for `arg z` (θ, φ) or the set `arg`. The 2.2.2 row is untouched (`wave0-sync` pins it). `i1-data` and `wave0-sync` pass: 47 of 47.
- Section 2: the three thread lines are the registry's (T1 15, T2 11, T3 13 stops, `home` and `problems` on all three, T3 in `--output`); station 7 says the c-plane and the root plane are separate (16 against 2 for 1.4.2) and the raise spiral runs on the c-plane; station 13 names the two dashed circles in the top right corner; station 9 has the real bounding-disk handle; station 19 opens on the 2.5.1 example; station 21 has its thread line.
- Section 5: "the student's blank page" is now "the student's diary page ... does not open on a blank page ... Clear gives the blank page".
- Section 7: a line saying all 32 items are built. The held-ideas list no longer promises the half-turn of the sphere (reciprocal has it).

## 4. docs/goals/iter-1.json

Every quoted readout substring of the station goals was compared with the readouts read from the running pages (section 5 of this report) and the passing interaction scripts. Changed (the file keeps its formatting; the diff is 11 lines):

| Goal | Criterion | Change |
|---|---|---|
| i1-station-addresses-arithmetic | A2 | readout has "2π/3" and, at -16, "π" (the readout is `Arg z = 2.094 (2π/3)`). |
| i1-station-addresses-arithmetic | A4 | the division readout is the whole string `result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404`, read with `nums()` (-0.647 and -0.588); the bare "-0.588" cannot occur. |
| i1-station-addresses-arithmetic | A5 | the Cartesian column is emphasised by its tinted cells, badges and callout (the heading looks the same in every mode). |
| i1-station-staircase-powers | A4 | `|z|ⁿ = 1024`, `nθ = 5.236`, `home step = -1.047`, angle text `-π/3`. |
| i1-station-staircase-powers | A5 | the second plane `#powers-spiral` (log ruler, ring labels 4, 16, 64, 256, 1024) instead of "auto-fits or an inset". |
| i1-station-staircase-powers | owns | adds `tests/unit/i1-station-staircase-powers.test.mjs` and `tests/interact/i1-station-staircase-powers.mjs`. |
| i1-station-branches-graph4d | A2 | the readout matches `/0\.5\d* - 0\.8\d*i/` (0.515 - 0.858i). |
| i1-station-home-problems | A4 | click `#problems-filter-all` before ticking 1.1.1 (the chapter filter is memory only). |
| i1-station-lab | A2 | the Lab opens on the 2.5.1 example, so `lab-clear` first. |

Checked and unchanged: distance-sets, curves-linear, roots-principal, powermap-reciprocal, mappings-cr, limits-derivative, and the core goals (`fmtAngle(2pi/3)` is still `"2pi/3"` in ASCII; `homeStep(-pi) = {k: 1, theta: pi}` still holds).

## 5. Spot checks of ARCHITECTURE against the code (by hand, in Node)

| Item | Result |
|---|---|
| `createLabelPlacer(ctx, plane, { boxes = [], segs = [] } = {})`, `sideCands(plane, a, b, { awayFrom, prefer, tie })` | same parameters as the code; `sideCands` returns 30 candidates `{ z, dx, dy, align }`, 9 for a zero-length segment |
| `segmentHitsBox` | through, miss and "hit once padded by 5" all as documented |
| `LABEL_COST` | `{ box: 100, seg: 25, axis: 6, tick: 8, outside: 150 }`, frozen |
| `drawCartAddress(... names = null)`, `drawTimedCurve(... rampWeight = RAMP_WEIGHT, obstacle = false)` | same signatures; `RAMP_WEIGHT` is 0.4 in plane.js and in three-view.js |
| `homeStep(13 * Math.PI)` | `{ k: -6, theta: Math.PI }`, not -π (3.8, 10.3.6) |
| `createStaircase(container, options = {})` with `homeLabel`, `showK`, `compact` | matches 3.8 |
| `SHAPE_LIMITS`, `specToCurves` | `{ maxN: 20000, maxCount: 200, maxPoints: 200000, maxAngle: 1e6 }`, frozen; an unknown kind gives `[]` |
| `argHelix`, `riemannSphere`, `domainSphere` | same parameter lists as 3.12 |
| `exactAngle(5π/18)` | `{ p: 5, q: 18 }`; π/13 is `null` (3.1) |
| `addressLabel('C->P', null)` | "Cartesian, then polar" (3.3), `{ short: true }` gives "C→P", an unknown code "" |
| `PUSH_DEFAULTS` | five keys, unchanged by `maxImageStep` |

The re-measured figures of the mapping design (section 8.2) are in the design: `pushForwardAll(cartGrid + polarGrid)` is 5.4 ms, above its 3 ms budget (wave 0 entry 85, now a note, not an open item).

## 6. docs/designs/iter-1

Each passage the reports name carries a short "Superseded in residue cleanup:" note (inline in a table cell, or a block quote after the paragraph; no note sits inside a code fence), and each of the 18 designs
has a one-paragraph "Residue cleanup (iteration 1)" note under its first paragraph that lists what the code changed. 16 of the 18 designs have inline notes; i1-data and i1-shell have the header note only.

| Design | Passages marked |
|---|---|
| i1-core-plane | ramp weight 0.65 (table row, 3 notes), z-index stacking (2 places), new API; wave 0 entries 56, 60, 64 accepted (ARCHITECTURE 3.5 wins) |
| i1-core-three | Reset `aria-label` (line 139), ramp 0.65 (4 places), Appendix D (entry 108 accepted) |
| i1-core-mapping | 8.2 performance table (re-measured), caps, `specToCurves`, `maxImageStep` |
| i1-core-math, i1-core-widgets | `exactAngle` q = 18 and `toTex` brackets; `homeStep` snap, staircase options, `sameLabel`, ResizeObserver next-frame write, 8rem label column |
| i1-station-home-problems | `WIDE_MIN` 712, caption `y - 44`, sweep range, problem line, demo caption, `detail` search field and `142`, the 40-character echo, the three host ids, the chevron |
| i1-station-lab | D1 (opens on the example), unknown token, boot step d, pole cap 10, `FAMILY_RAMP` 0.3, `imageBounds` factor 4, sphere padding 1.0, deviation 7, A2, request 1 |
| i1-station-addresses-arithmetic | stretch geometry (heavy ray ends at the nearer of ring and result), soft θ words, the P2 text |
| i1-station-distance-sets | placer sections, `spotsBeside` and `putNear`, polar defaults by width, φ clause, deviation 7 closed by the handle |
| i1-station-curves-linear | circle takeaway braces, `.84rem` and the stage-caption strings and rules (8.5), D1 reverted, the problem-card request (C26) |
| i1-station-staircase-powers | D2 (`nθ`), the ids table, the z = 0 Walk (2 places), the ghost ring, preset stops the Walk, S3, mutation M1 |
| i1-station-roots-principal | 4.9 plane options (2 lines), 3.2 and 5.4 label corner, `sel = 1` deliberate (2 places), the quadratic check row and the "From the quadratic." callout |
| i1-station-branches-graph4d | 2.2.5 copy ("It is drawn", grids lifted), the two root-preset notes, the staircase caption, R1, the phone fit |
| i1-station-powermap-reciprocal | D12, E3, H1, F7, H6, H7, H8 |
| i1-station-mappings-cr | the w-off-plane row of 2.5, item 7 (off the scale), C-5b, C-2, `names`, the legend pill |
| i1-station-limits-derivative | 8.1 `dcHalf` 1536, the two ledes, the z0 handle, plus the header (zoom, D6 alpha 0.6, `polarWords`) |

## 7. Disposition of each D.json entry (26)

The entries stay in `D.json`, each with a `disposition` and a `resolution` field added (24 fixed, 1 fixed in part, 1 declined).

| # | goal | entry | disposition |
|---|---|---|---|
| 0 | home-problems | ARCH 9: plane id, store keys, tokens, hooks, readout lines | **fixed**: section 9 home-problems, 3.13 |
| 1 | home-problems | STORY thread lines shorter than the registry | **fixed**: section 2 thread lines from the registry |
| 2 | lab | ARCH 9 hook list lags (minor) | **fixed**: section 9 lab, section 4 |
| 3 | lab | ARCH 4 / 3.13 / 9: `lab.strokes`, blank-start, `wheel: 'focus'`, extra ids and hooks | **fixed**: sections 4, 3.13, 9 |
| 4 | lab | the extra hooks incl. `draft()` | **fixed**: section 9 lab |
| 5 | addresses-arithmetic | A4 `-0.588` literal | **fixed**: goal A4 reworded |
| 6 | addresses-arithmetic | the Cartesian heading looks the same in add and mul (minor) | **declined**: no code change (the emphasis is carried by tint, badges and the callout); A5 reworded to name those cues |
| 7 | addresses-arithmetic | ARCH 9 extra ids and hooks | **fixed**: section 9 |
| 8 | distance-sets | ARCH 9 extra ids, tokens, hooks | **fixed**: section 9 |
| 9 | curves-linear | linear readout and `orient()` hook (minor) | **fixed**: section 9 curves-linear |
| 10 | curves-linear | same as 9 | **fixed**: duplicate |
| 11 | curves-linear | extra ids, hooks, `linearImage` contract | **fixed**: section 9 |
| 12 | curves-linear | ARCH 4 row P3 | **fixed**: section 4 table |
| 13 | curves-linear | readout polar part omitted when it repeats | **fixed**: section 9 (duplicate of 9) |
| 14 | curves-linear | same plus `orient()` | **fixed**: section 9 (duplicate of 9) |
| 15 | staircase-powers | ARCH 9: seam default -π, `n*theta`, extra ids, second plane | **fixed**: section 9 (the readout is `nθ`: A4 reworded) |
| 16 | staircase-powers | goals: reword A5, add the two test files to owns | **fixed**: goal edits |
| 17 | staircase-powers | design: Walk at z = 0, G.7 emphasis, S3 label, M1 | **fixed**: marked in the design, resolved in favour of the code and the script |
| 18 | roots-principal | design 4.9, 3.2, 5.4 stale | **fixed**: marked in the design |
| 19 | roots-principal | ARCH 9: three planes, ids, hooks, readouts, list line | **fixed**: section 9 roots-principal |
| 20 | roots-principal | STORY station 7 (separate planes, raise spiral, circle names) | **fixed**: STORY section 2 stations 7 and 13 |
| 21 | roots-principal | ARCH 9: problem-slot ids, `principal-root-zoom`, `state().view`, neutral callout | **fixed**: section 9 |
| 22 | branches-graph4d | ARCH 9: ids, readout, hooks, tokens, A2 literal | **fixed**: section 9, goal A2 |
| 23 | branches-graph4d | hooks `shapeCount` / `liftedShapeCount`; "cartGrid left out" | **fixed in part**: the hooks are listed; "cartGrid left out" is stale (grids are lifted) and was not copied |
| 24 | powermap-reciprocal | ARCH 9: ids, hook formats, `internals`, circle0 | **fixed**: section 9 |
| 25 | mappings-cr | ARCH 9: ids, hooks; 3.5 note that `snap` also applies to keyboard nudges | **fixed**: section 9, 3.5, rule 10.2.7 |

## 8. Doc requests of the nine reports and where they landed

| Report | Requests | Where |
|---|---|---|
| C1 | patch for 3.5, section 8 `dragHandle` | already applied; verified (section 5) |
| C2 | 11 edits in 3.9, 3.10, 3.12; design-three line 139 | already applied; 3.12 ramp sentence fixed; design note |
| C3 | 3.1, 3.2, 3.3, 3.7, 3.8, 3.13, 3.14, 10.3.6; the 13 aha rows | already applied; STORY rows done here |
| S1 | section 4 and D1; section 9 ids; 10.4.1; STORY section 5; Lab and home designs | section 4, 9, 10.4.1, STORY 5, both designs |
| S2 | section 9 readouts and hooks; 10.7.2; 10.4.2; two designs | all done |
| S3 | section 9 ids and readouts; snap rule; goals A4, A5; two designs | all done (the snap rule is 10.2.7) |
| S4 | section 9 graph4d cap; roots and branches designs | all done |
| S5 | section 9 ids and hooks; the `prose()` flex rule; 10.6.3 idiom; two designs | all done (the flex rule is 10.4.8) |
| S6 | section 9 words and zoom; two rule candidates; the limits-derivative design | section 9, rule 10.2.8 (words after lines) and candidate 10.9 (ring-handle word); design done |

## Open for iteration 2

Requests addressed to an owner that no one has done. None blocks iteration 1: each is either optional, cosmetic, or has a workaround in the station.

**`js/core/plane.js` (C1 owner)**

1. `createLabelPlacer`'s `put` should return the box it chose (or take a `lines` array) so a station can place a multi-line block: the Arg block of `roots` (it cannot get clear of a crowded plane; at 390 px with n >= 7 five of 77 states overprint), `polarWords` in derivative.js and the same code in distance.js (S4 3, S6 6, S2 7).
2. An end-arrowhead option (`arrowInset`, in pixels, on `drawTimedCurve` and `addCurve`): the head at t = 1 is partly under the end handle (S3 entry 8; criterion A3 holds without it).
3. A tiered `put` (a `near` count) and the two extra far rings in `sideCands`: distance.js and sets.js each carry the same 25 lines, `spotsBeside` and `putNear` (S2 7).
4. A handle's word cannot see lines that a layer draws; registering the previous frame's obstacles for `layoutLabels` would stop z₁'s name crossing a dashed leg in a few phone states of arithmetic (S2 7).
5. Axis names are placed against their own axis only: `v` at the top of the imaginary axis is struck by the real axis within about 14 px of the top, and `u` by the imaginary axis near the right edge (cauchy-riemann w-plane at z0 = 0.5 - 0.8i, desktop; S5 6).
6. `drawPolarAddress`: extra candidates for `r` and the Arg block, and registering its own arcs when `labels: false` (so `registerAddressArcs` in derivative.js, which copies the radii R, R + 7, R + 14, can go; S6 6). Deferred by C1 as a design decision: a `near` option for a short `r` label (wave 0 entry 52).

**`js/core/staircase.js` (C3 owner)**

7. ~~At z = 0 the widget still prints `<home name> = undefined`~~ **Done in the integration pass**: the line reads `Arg z: no angle at 0` (`js/core/staircase.js`; scripts and designs follow).

**Registry, home and shared modules**

8. `PARTS` in `js/registry.js` instead of `PART_LABELS` in home.js and the copy in app.js, together with the home.js edit (C3 entry 1; unit test U11 guards the drift). A wide home map for hosts of 662 to 711 px (windows of 1024 to 1073 px) needs shorter part names (S1 8).
9. New shared modules, designed with the stations that adopt them: `js/core/station-kit.js` (the typed-field protocol, snap helpers and TeX shorthands that addresses.js and arithmetic.js duplicate; U31 holds them equal), `js/core/chrome.js` (station header and links bar), and `js/stations/problem-card.js` (answer scroller, scroll hint, `plainProse`, `buildLinks`, `threadBadges`; copies in curves.js, linear.js, problems.js, distance.js and sets.js; C26 holds the first two equal) (C3 entries 3 and 6, S3 entry 11).

**Station code**

10. ~~`js/stations/lab.js` function chips call `prose(chip, ...)` directly~~ **Done in the integration pass**: one span per chip (rule 10.4.8 now has no known violation).
11. Optional: `view.fitTo` again after the hint fades in reciprocal.js, so the sphere uses the whole height (S5 6.8). Optional: use `onDrag`'s `info.altKey` to switch snapping off for one drag (available since C1; no station adopted it, each has a Snap checkbox).

**Tests (not docs; not mine)**

12. ~~`tests/unit/i1-data.test.mjs`: the `AHA_LABELLED` table~~ **Deleted in the integration pass**; the aha test is strict against STORY section 3.

**Declined or left, worth a second look only if a reviewer asks**

- A lighter `--t1` in the light theme: no headroom under the shell's 3:1 rule (`#7388aa` is 2.94 on `--surface-2`); the lower ramp weight already helped (C3 9 and 10, S3 5).
- `stationForTopic('T2.4')` reaching `branches` rather than `staircase`: deliberate, with the three places to change it listed in the C3 report (entry 14).
- distance.js at 4x CPU throttle: p90 8.7 to 10.9 ms in two states against the builder's own 8 ms target; the 16.7 ms target holds (S2 17 and 26).
- The `r =` word of the derivative's quotient plane for P6 and 3.1.2 can touch a few dots (S6 3); x, y and Arg labels over ghost arcs, the far `r` label, the halo clip at the drag inset, `Re` and `Im` struck by a drop line near an edge (C1 52, 53, 54, 58, 59: cosmetic).
- graph4d: the 1/z surface is small in its view and the area under the 434 px view at 1280 px is empty (S4 21 and 26); the roots neutral callout leaves 60 to 100 px blank by design (S4 4); the distance arrow tip leaves the fixed 12-unit view for a large negative slide (S2 23).
- The three `C*-architecture*.patch` files were applied and are deleted (integration pass).
