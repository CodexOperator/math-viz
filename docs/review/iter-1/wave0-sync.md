# Wave 0 sync (iteration 1)

Written by the wave-sync agent between wave 0 and wave 1. Nothing was committed. `js/stations/*.js` was not touched.
The residue file is `docs/review/iter-1/wave0-residue.json` (120 entries, indexed from 0 below).

## 1. What changed

| File | Change |
|---|---|
| `docs/ARCHITECTURE.md` | Sections 1 to 3 rewritten from the real exports (see section 2 below); section 3.15 (registry) added; sections 4, 6 and 8 corrected; **new section 10, "Rules for station builders (from wave 0)"**. |
| `docs/STORY.md` | Section 3, row 2.2.2: "halve both" became "square-root the length and halve the angle" (|2i| = 2, the root has length sqrt 2). |
| `docs/goals/iter-1.json` | Goal `i1-core-widgets`, `interfaces`: "No imports between the three files" became "explainer.js may import ./katex.js (cells are rendered via katex.tex); katex.js and staircase.js import nothing, and none of the three imports another goal's file". |
| `js/core/katex.js` | New exports `proseParts`, `proseToHtml`, `prose`: exponent notation in prose (`e^{i(θ + π/2)}`, `r^(1/3)`, `e^x`) becomes `<sup>`, everything else is escaped. Nothing else in the file changed. |
| `tests/unit/architecture-sync.test.mjs` (new) | 33 tests: every `export function` line in ARCHITECTURE section 3 has the parameter list of the code (comments and layout ignored); every documented export exists; every real export is documented in its section; the import rules of section 1 hold. Mutation-checked (a changed default, a deleted line and a renamed function each fail it). |
| `tests/unit/wave0-sync.test.mjs` (new) | 12 tests: the prose helper (tables of cases, escaping, never throws, all 211 prose fields of the data render with no `^{` or `^(` left), the STORY row, the goal text, the section 10 content, and the rows the math review asked to pin (residue 20 and 26). |
| `tests/interact/wave0-sync.mjs` (new) | Browser checks at desktop and phone: a transparent plane over a domain-colouring canvas (W1), `addCurve` with mapping curves (W2), `window.__mv` initialisation (W3), `prose()` in a real DOM (W4). Mutation-checked. |
| `tests/interact/i1-shell.mjs` | Exports `expectedErrors` (the hook already exists in `tools/smoke.mjs`), so `node tools/smoke.mjs --route nosuchplace --dark --script tests/interact/i1-shell.mjs` exits 0 (3/3, "11 expected error line(s) ignored") instead of 1. An unexpected 404 or console error still fails it (checked with a scratch script). |
| `tests/unit/i1-data.test.mjs` | One regex, line 776: `(?![\d.])` became `(?!\d|\.\d)`, so a decimal followed by a sentence-ending period is checked (residue 40). All 30 tests still pass. |

`js/core/plane.js` was **not** changed: the three requests aimed at it were already true of the as-built code (section 3).

## 2. ARCHITECTURE.md against the code

Every module was read against its exports (49 names in `complex.js`, 5 in `parse.js`, 19 in `plane.js`, 13 in `katex.js` (10 plus the three prose helpers), 3 in
`explainer.js`, 10 in `staircase.js`, 17 in `shapes.js`, 8 in `mapping.js`, 8 in `domaincolor.js`, 26 in `three-view.js`, 6 in `theme.js`,
1 in `store.js`, 6 in `app.js`, 5 in `registry.js`, 15 in `problems.js`, 2 in `functions.js`). The differences the old text had, now fixed:

- **3.1 complex.js**: `exactAngle`; `fmtAngle` has a default options object and `unicode`; bare reals accepted; `pow` is exact squaring and sends non-integers to `powc`; `branchArg`/`branchRoot` default the seam; the words `undefined`, `inf`, `-inf` and the TeX forms; the `RangeError` cases; exact angles up to |p| = 120 (it said 24); the 1e-150 to 1e150 range; `texNumber` and `fmtCart` disagree on 0.3 and there is no `\sqrt{29}`.
- **3.2 parse.js**: `ParseError.position` and `.length` (2 for an emoji), the AST shapes, the 64-entry cache (same object back), alternate spellings, the "number is never the right factor" rule, limits, `\pi\,z`.
- **3.3 problems.js**: ASCII address codes (`C->P`, it said arrows), `alsoAt`, `routes`, `covers`, `topicById`, `problemsForTopic`, `statementParts`, `addressLabel`, `addressTones`, chapter 0 for proofs, the extra `answer.values` keys (`rawAngle`, `principalArgs`, `n`, `directional`, `circleRadiusAt.center`, `sample.z`).
- **3.4 functions.js**: `label`, `cart: null` for `sqrt` and `cbrt`, `recip` analytic off its pole.
- **3.5 plane.js**: nine more options (`aspect`, `maxWidth`, `controls`, `legend`, `tickLabels`, `wheel`, `ariaLabel`, `background` tokens and colours), the real Plane, Handle, Layer and CurveLayer members (`getSize`, `resetView`, `setHome`, `getHandle`, `handles`, `isDrawMode`, `getStats`, `setCursor`, `set`, `onDragStart`, ...), the event payloads and `viewchange` reasons, every drawing helper with its real options, `makeTransform`, `niceGridStep`, `mixColor`, `DASH`, `internals`, label placement, and the `window.__mv` contract.
- **3.6 katex.js**: `texColor`, `escapeHtml`, `clearTexCache`, the `mathml` option, the macros, the prose helpers.
- **3.7 explainer.js**: the explainer returns `{ el (the container), update, flush, setRows, destroy, stats }`, `native`, `tint`, `short`, a third column, synchronous first update, the streaming and refine behaviour, `data-tex`, the 560 px stack.
- **3.8 staircase.js**: rows anchored to the home step (`k = 0` is always home), `update(null)`, `setPicked`, nine exported helpers, the ids and wrapper attributes.
- **3.9 shapes.js**: `family`, `reversed`, `source`, `curveLength`, `resample`, the kinds and ids of every builder, the real options and limits, `classify.orientation` is 0 for any non-simple curve, the decimation above 1000 edges.
- **3.10 mapping.js**: the two cut rules (pole leap and teleport), `PUSH_DEFAULTS` with `maxPoints`, `pointOnPieces`, the piece fields, `morph(c, 0, f)` id, the clampRadius host rule.
- **3.11 domaincolor.js**: `colorXY`, `rangesFromView`, `DOMAIN_LEGEND`, `colorOf(w, out, rings)`, `render(mode)` returning a boolean, `info()`, `maxPixels`, `drawColorWheel` options, canvas data attributes.
- **3.12 three-view.js**: the scene frame, the extra View members, 12 extra exports, the `argHelix` range `[-(2*turns+1)π, (2*turns+1)π]` and `update(z, seam)`, the sphere's `curves`, `setHalfTurn`, `showAxis`, auto redraw, `frameRadius`, container id rule, option list of `createView3D`.
- **3.13 and 3.14**: `initTheme`, `store.set` options and return value, the reserved `theme` key, `groupStations`, `PART_TITLES`, `SITE_TITLE`, `documentTitle`, `start()` returns `stop`, `ctx` is frozen, `mount` may be async, `window.__mv.app`, route rules as coded (case handling, 120 characters).
- **3.15 registry.js** added (it was only a line in the module map).
- **Section 4, 6, 8**: the Lab hand-off uses `{ persist: false }`; the real token list; the full `_helpers.mjs` list and the harness rules (`expectedErrors`, blocked fonts).

## 3. The requested code changes

| Request | Result |
|---|---|
| plane.js: `background: 'transparent'` clears instead of filling | Already true. `createPlane` only ever `clearRect`s its canvas (line 1242) and paints the plane through the CSS variable `--plane-bg` (line 1106), so `'transparent'` is see-through. W1 checks the computed background, the canvas alpha, that a domain-colouring canvas prepended to `plane.el` covers exactly the same box and takes no pointer; a screenshot over `z²` colouring looked right in light and dark (labels stay readable through their halo). The placement recipe is in 3.5 and rule 10.2.4. Mutation check: ignoring `background` fails W1. |
| plane.js: accept curves with the extra mapping fields | Already true. `addCurve` reads known properties only. W2 passes real `pushForward` pieces and `cartGrid` curves to `addCurve` and checks nothing leaks onto the layer. Documented in 3.5. |
| plane.js: idempotent `window.__mv`, including `planes` | Already true (lines 1813 and 1814). W3 covers a prior `__mv` without `planes`, a prior Map reused, destroy removing only its own entry, a newer plane with the same id surviving, and an empty `__mv`. Mutation checks on both lines fail W3. |
| STORY section 3, row 2.2.2 | Done, pinned. |
| iter-1.json widgets `interfaces` | Done, pinned (and a test that the code does what the text now says). |
| Prose with exponent notation (item 2 of the brief) | No helper existed: added `proseParts`, `proseToHtml`, `prose` to `js/core/katex.js` with 6 unit tests (the prose tests of wave0-sync), a browser check and 3.6 and rule 10.4.3. Of the 211 prose fields, 48 carry a superscript; the only braces left in the rendered text are the set braces of problem 1.5.2. |
| Other non-minor requests aimed at wave-0 files | `package.json` and the `npm test` line of CONSTRAINTS were already done (3690b16). The Google Fonts note for CONSTRAINTS is superseded by the harness (it ignores font hosts since 8eb870b), so CONSTRAINTS was left alone. The smoke `expectedErrors` hook already existed; the shell script now uses it. |

## 4. Verification

| Command | Result |
|---|---|
| `npm test` | **287 pass, 0 fail** (242 before; +33 architecture-sync, +12 wave0-sync) |
| `node tools/smoke.mjs --route nosuchplace --dark` | **3/3 checks passed** |
| `node tools/smoke.mjs --route wave0-sync --script tests/interact/wave0-sync.mjs --dark` | 3/3 (W1 to W4 at desktop, phone and dark) |
| `node tools/smoke.mjs --route widgets-fixture --script tests/interact/i1-core-widgets.mjs --dark` | 3/3 (katex.js touched) |
| `node tools/smoke.mjs --route nosuchplace --dark --script tests/interact/i1-shell.mjs` | 3/3, exit 0 (script touched) |
| `node tools/smoke.mjs --route i1-core-plane --script tests/interact/i1-core-plane.mjs` | 2/2 (plane.js unchanged, run as a regression check) |
| `node tools/smoke.mjs --route nosuchplace --dark --script tests/interact/i1-core-mapping.mjs` | 3/3 (regression check) |

Station routes still 404 until wave 1, as expected.

## 5. Residue: what was resolved and what was left

Legend: **R** resolved in this sync (a change, a rule or a doc entry, or behaviour verified and pinned), **A** already done before the sync
(checked, nothing to do), **L** left for the integrator (reason given), **N** no action needed (the entry says so).
Kind: `minor` is an entry the review tagged minor; `request` is every untagged entry (a cross-owner request or a finding that is not minor).

Totals over 120 entries: **59 resolved, 19 already done, 39 left, 3 no action.**
Of the 37 entries that are not tagged minor: 19 resolved, 13 already done, 3 left (all three are the home station's
404 until wave 1, and a process request that the plane designer confirm the builder's edits), 2 no action. Of the 83 minor entries:
40 resolved, 6 already done, 36 left, 1 no action.

### i1-shell (20 entries: 10 resolved, 5 already done, 5 left, 0 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 0 | minor | i1-shell: package.json (not owned by i1-shell); CONSTRAINTS.md 'Verification comm... | **A** | package.json already runs `node --test "tests/unit/*.test.mjs"` (commit 3690b16); `npm test` runs 287 tests. |
| 1 | minor | i1-shell: Nav thread dots (css/components.css .thread-dot) and key entry 9; desig... | **L** | CSS shape cue for the T3 dot and key line is a design decision in the shell's css/components.css; cosmetic, aria-hidden. |
| 2 | minor | i1-shell: index.html key entries 6 and 7 (arg versus Arg), design 3.3 and STORY s... | **L** | Wording and size of the ghost-arc swatch in the shell's index.html colour key; stations now draw the real set (10.1.7). |
| 3 | minor | i1-shell: js/app.js line 130 `history.scrollRestoration = 'manual'`; design prose | **R** | Documented as intended: `history.scrollRestoration = 'manual'` (ARCHITECTURE 3.14, rule 10.1.2). |
| 4 | minor | i1-shell: Process: docs/designs/iter-1/i1-shell.md edited by the builder | **L** | Process question (builder edited the design doc); the orchestrator accepts or rejects it, no file change. |
| 5 | minor | i1-shell: js/core/store.js keys() together with theme.js | **R** | Store note added (3.13): `keys()` lists the reserved raw key `theme`; skip it when looping (option offered by the entry). |
| 6 | minor | i1-shell: Colour key placement (index.html footer details#colour-key, closed by d... | **R** | Rule 10.1.7: stations draw arg as a set and Arg as the one step in place, because the colour key is closed. |
| 7 | minor | i1-shell: Repository root tmp/ (untracked, not from this goal) | **A** | No `tmp/` directory at the repository root now. |
| 8 | minor | i1-shell: index.html #nav-toggle title='Show the places' | **L** | Cosmetic tooltip text in the shell's index.html / app.js. |
| 9 | minor | i1-shell: node tools/smoke.mjs --script tests/interact/i1-shell.mjs (exit code) | **R** | `tests/interact/i1-shell.mjs` now exports `expectedErrors` (the hook exists in tools/smoke.mjs): the command exits 0, 3/3, and an unexpected 404 or console error still fails it (checked). |
| 10 | minor | i1-shell: index.html <meta name="theme-color" content="#f6f3ec"> | **L** | Cosmetic pre-JS theme-color metas in the shell's index.html. |
| 11 | minor | i1-shell: docs/CONSTRAINTS.md, Verification commands and the Google Fonts rule | **R** | npm test line in CONSTRAINTS is already the glob form. The fonts note is superseded: tools/smoke.mjs now blocks the font hosts and ignores their failures (8eb870b); CONSTRAINTS stays consistent; rule 10.1.6 forbids web-font links. |
| 12 | minor | i1-shell: index.html colour key, "Faint extra arcs are arg z" swatch | **R** | Entry says the shell needs no change; the station rule it asks for (draw the genuine arg set) is 10.1.7. |
| 13 | request | package.json | **A** | Same as 0. |
| 14 | request | docs/CONSTRAINTS.md | **R** | Superseded by the harness change (see 11); verified in tools/smoke.mjs; rule 10.1.6. |
| 15 | request | js/core/plane.js | **R** | plane.js already does `window.__mv = window.__mv \|\| {}` and `planes = planes \|\| new Map()`; verified in a real browser (W3 in tests/interact/wave0-sync.mjs, with a mutation check); documented in 3.5. |
| 16 | request | js/stations/*.js (every station goal) | **R** | ARCHITECTURE 10.1 (routes, no scrollTo, one h1, listeners last, `{ persist: false }`, reserved `theme`). |
| 17 | request | tools/smoke.mjs | **A** | tools/smoke.mjs already supports `expectedErrors` (8eb870b); adopted by the shell script (entry 9). |
| 18 | request | /home/user/math-viz/package.json | **A** | Same as 0. |
| 19 | request | /home/user/math-viz/docs/CONSTRAINTS.md | **R** | Same as 11 and 14. |

### i1-core-math (15 entries: 8 resolved, 3 already done, 2 left, 2 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 20 | minor | i1-core-math: tests/unit/i1-core-math.test.mjs (U20, U26) versus design 5.7 and 5.8 | **R** | Rows pinned in tests/unit/wave0-sync.test.mjs: toTex negation and product brackets, texNumber(1/25), (1/24), (S2/5), (1.4142). The design tables 7.4.2 and 7.5.4 were not edited (design docs are the designer's). |
| 21 | minor | i1-core-math: js/core/complex.js div(), inv() (and pow with n < 0), wrapArg() | **R** | Took the entry's second option: ARCHITECTURE 3.1 says results are correct for 1e-150 < \|z\| < 1e150. No code change. |
| 22 | minor | i1-core-math: docs/designs/iter-1/i1-core-math.md 7.1 and Appendix C item 1; buil... | **R** | ARCHITECTURE 3.1 and 3.2 now record exactAngle, fmtAngle unicode, bare reals, ParseError.length, the M17 and M4 messages and the `\pi\,z` form. The stale `npm test` warnings inside the math design (7.1, Appendix C) were left: archival design text. |
| 23 | minor | i1-core-math: js/core/complex.js texNumber and texCart, design 8.1 row for texNum... | **R** | Noted in 3.1 and rule 10.4.5: choose fractions or decimals per quantity, never both in one view. |
| 24 | minor | i1-core-math: js/core/parse.js tex(), neg node | **L** | Cosmetic double minus in parse.js toTex (`--z`); pinned by the design; documented in 3.2 so nothing matches on it. |
| 25 | minor | i1-core-math: design 5.5 (pow) and 7.3 U9; docs/review/iter-1/i1-core-math/*.png | **N** | Design wording and two PNGs; the entry says no obligation either way. |
| 26 | minor | i1-core-math: tests/unit/i1-core-math.test.mjs (U26 toTex rows, U-tests for compile) | **R** | Rows pinned (see 20), plus strict `evaluate('z^2', i) = {-1, 0}` and `z^3`. |
| 27 | minor | i1-core-math: js/core/complex.js texNumber (matches ARCHITECTURE 3.1, so not a co... | **R** | Rule 10.4.5 and a note in 3.1: stations write `\sqrt{29}` and `\sqrt{221}` themselves, with the decimal beside them. |
| 28 | minor | i1-core-math: npm test (repo-level, not this goal) | **A** | The three plane tests were work in progress; all 287 unit tests pass now. |
| 29 | request | package.json | **A** | Same as 0. |
| 30 | request | docs/ARCHITECTURE.md | **R** | ARCHITECTURE 3.1 and 3.2: fmtAngle options, exactAngle, bare reals, non-finite words, seam defaults, compile(...).f contract, ParseError position and length. |
| 31 | request | js/stations/home.js (goal i1-station-home-problems) | **L** | Expected: js/stations/home.js lands in wave 1; the command then ends 2/2. |
| 32 | request | package.json | **A** | Same as 0. |
| 33 | request | docs/review/iter-1/i1-core-math/ (home--desktop.png, home--phone.png, reviewA/) | **N** | Evidence PNGs under docs/review (gitignored); the entry leaves keep or delete open. |
| 34 | request | docs/ARCHITECTURE.md (3.2, parse.js) and any station copy that quotes ParseError ... | **R** | ARCHITECTURE 3.2 and rule 10.4.7: show err.message verbatim, underline with err.position and err.length (2 for an emoji); `toTex` writes `\pi\,z`. |

### i1-data (17 entries: 10 resolved, 3 already done, 4 left, 0 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 35 | minor | i1-data: package.json (not owned by i1-data); `npm test` | **A** | Same as 0. |
| 36 | minor | i1-data: `node tools/smoke.mjs --route problems --script tests/interact/i1-data.m... | **L** | Expected: js/stations/problems.js lands in wave 1; re-run `--route problems --script tests/interact/i1-data.mjs` then. |
| 37 | minor | i1-data: problems.js prose fields (aha, addressWhy, routes.*) and functions.js no... | **R** | New helper in js/core/katex.js: proseParts, proseToHtml, prose (superscripts for `^{...}`, `^(...)`, `^x`), 6 unit tests and a browser check over all 211 prose fields; rule 10.4.3. The mixed notation inside the strings is left as it is (the helper reads both). |
| 38 | minor | i1-data: problems.js `answer.tex` (design 2.2 understates the problem) | **R** | Rule 10.4.2: display TeX inside `overflow-x: auto`, a scroll hint, `answer.text` as the wrapping fallback. Rewriting the answers as `gathered` blocks is the entry's "next iteration" and is left. |
| 39 | minor | i1-data: problems.js copy (design 2.6 voice rule: 'every angle says whether it is... | **L** | Copy edit of about 44 prose fields in i1-data-owned strings (worst: 3.2.1 `routes.polar` calls the set arg f a number). Not pinned by tests; fix in the first integrator pass. Rule 10.4.6 keeps new copy honest. |
| 40 | minor | i1-data: tests/unit/i1-data.test.mjs 'A4: every decimal in the copy is a checked ... | **R** | Regex fixed in tests/unit/i1-data.test.mjs line 776 (`(?!\d\|\.\d)`): sentence-final decimals are checked now; all 30 tests still pass. |
| 41 | minor | i1-data: problems.js addressLabel(code, opts) | **L** | `addressLabel(code, null)` still throws; documented in 3.3 (pass an options object or nothing). One-line fix for the data owner. |
| 42 | minor | i1-data: docs/ARCHITECTURE.md 3.3 and the build report's requests_for_other_owners | **R** | ARCHITECTURE 3.3 rewritten: ASCII address codes, alsoAt, routes, topics covers, addressLabel and addressTones, chapter 0 for proofs, the extra answer.values keys. |
| 43 | minor | i1-data: /home/user/math-viz/package.json (not owned by i1-data) | **A** | Same as 0. |
| 44 | minor | i1-data: /home/user/math-viz/js/data/problems.js: 37 prose fields (routes.polar, ... | **R** | Same helper as 37 (the entry's first option); function notes use it too. |
| 45 | minor | i1-data: /home/user/math-viz/tests/unit/i1-data.test.mjs | **L** | Test-strength gap in i1-data (answer.tex not tied to answer.values); the strings are correct today; for the data owner. |
| 46 | minor | i1-data: /home/user/math-viz/docs/STORY.md section 3, row 2.2.2 | **R** | docs/STORY.md section 3, row 2.2.2: "square-root the length and halve the angle"; pinned in tests/unit/wave0-sync.test.mjs. |
| 47 | minor | i1-data: answer.tex of 23 of 29 problems at 390px width (e.g. 1.4.2 is about 934p... | **R** | Same as 38 (rule 10.4.2); rewriting the long answers stays optional. |
| 48 | request | package.json | **A** | Same as 0. |
| 49 | request | docs/STORY.md | **R** | Same as 46. |
| 50 | request | js/stations/problems.js (goal i1-station-home-problems) | **R** | Rules 10.4.1, 10.4.2, 10.4.4 (statementParts, overflow, proofs filter, route bars, address chips). |
| 51 | request | js/stations/*.js (all station goals) and js/stations/problems.js | **R** | Rule 10.4.3: prose is plain text with exponent notation; render it with `prose()`. |

### i1-core-plane (13 entries: 2 resolved, 1 already done, 10 left, 0 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 52 | minor | i1-core-plane: js/core/plane.js drawPolarAddress, r label candidates (4a) | **L** | Optional label-placement polish in plane.js (r label far from its ray on blocked spots); nothing overlaps. |
| 53 | minor | i1-core-plane: js/core/plane.js drawCartAddress, x and y labels | **L** | Optional: x and y labels on the Arg arc; the halo keeps them readable. |
| 54 | minor | i1-core-plane: js/core/plane.js paintAxes and drawCartAddress, z near the right o... | **L** | Optional: axis name struck by a drop line; cosmetic. |
| 55 | minor | i1-core-plane: js/core/plane.js label placement on short wide (non-square) planes | **R** | Limitation noted for station designers (3.5 and rule 10.2.3): use square planes. |
| 56 | minor | i1-core-plane: docs/designs/iter-1/i1-core-plane.md (builder-edited sections and ... | **L** | Process: the designer confirms or reverts the builder-edited sections of the plane design. |
| 57 | minor | i1-core-plane: tests/interact/i1-core-plane.mjs fixture, phone screenshot plane-p... | **L** | Fixture placement in the plane's own interaction script; cosmetic. |
| 58 | minor | i1-core-plane: css .plane-handle-dot (box-shadow halo) with the 10 px drag inset | **L** | Cosmetic halo clip at the drag inset. |
| 59 | minor | i1-core-plane: js/core/plane.js drawCartAddress and drawPolarAddress label placem... | **L** | Optional: ghost arcs as soft cost for x, y and Arg labels (re-pin R2 and R8g). |
| 60 | minor | i1-core-plane: docs/designs/iter-1/i1-core-plane.md (sections 2.3, 5.3, 5.6, 5.8,... | **L** | Process, same as 56. |
| 61 | minor | i1-core-plane: node tools/smoke.mjs --no-shots (all registry routes) | **L** | Expected: every station route 404s until wave 1; re-run the full smoke after it. |
| 62 | minor | i1-core-plane: js/core/plane.js, handle z-index rule for .is-above-controls | **R** | Rule 10.2.3: keep draggable points out of the top-right corner. |
| 63 | request | package.json | **A** | Same as 0. |
| 64 | request | docs/designs/iter-1/i1-core-plane.md | **L** | Process, same as 56. |

### i1-core-widgets (17 entries: 8 resolved, 3 already done, 6 left, 0 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 65 | minor | i1-core-widgets: /home/user/math-viz/js/core/staircase.js: homeStep (no tolerance... | **L** | homeStep has no tolerance while exactPi does: 13*PI shows "-π". Fix is for the widgets owner (snap within 1e-9 plus a unit test). Edge documented in rule 10.3.6. |
| 66 | minor | i1-core-widgets: /home/user/math-viz/js/core/explainer.js, ResizeObserver callbac... | **L** | Harmless ResizeObserver loop events in explainer.js (no global error handler exists); fix is a one-line rAF. |
| 67 | minor | i1-core-widgets: /home/user/math-viz/package.json (no goal owns it) | **A** | Same as 0. |
| 68 | minor | i1-core-widgets: /home/user/math-viz/docs/goals/iter-1.json, goal i1-core-widgets... | **R** | docs/goals/iter-1.json: i1-core-widgets `interfaces` now says explainer.js may import ./katex.js; pinned in tests/unit/wave0-sync.test.mjs. |
| 69 | minor | i1-core-widgets: /home/user/math-viz/js/core/staircase.js update(): `wrap.classLi... | **L** | Rare: the seam-pulse animation does not restart within 0.9 s; cosmetic. |
| 70 | minor | i1-core-widgets: Explainer footer in the 7.5rem row-label column (docs/review/ite... | **L** | Cosmetic: footer label is 6 px from the divider. |
| 71 | minor | i1-core-widgets: /home/user/math-viz/tests/interact/i1-core-widgets.mjs, layout step | **L** | Test-strength gap in the widgets interaction script (560 px boundary). |
| 72 | minor | i1-core-widgets: /home/user/math-viz/docs/STORY.md section 5 versus design D3 | **R** | Rule 10.3.7 and ARCHITECTURE 3.8: the list relabels, the plane and the helix slide. |
| 73 | minor | i1-core-widgets: /home/user/math-viz/js/core/explainer.js first render (accepted ... | **R** | Rule 10.3.4: keep an explainer to about 6 rows. |
| 74 | minor | i1-core-widgets: docs/goals/iter-1.json goal i1-core-widgets `interfaces` vs js/c... | **R** | Same as 68. |
| 75 | minor | i1-core-widgets: js/core/explainer.js sanitizeId() and createStaircase sanitizeId() | **R** | Rule 10.3.3: row ids in [A-Za-z0-9_-], sanitised ids in selectors. |
| 76 | minor | i1-core-widgets: js/core/explainer.js update() (design D6) | **R** | ARCHITECTURE 3.7 says the first update() is synchronous. |
| 77 | minor | i1-core-widgets: js/core/staircase.js render(), the theta === null branch (line 314) | **L** | Staircase buttons lose their aria-label at z = 0 (a11y, staircase.js); owner fix. |
| 78 | request | package.json | **A** | Same as 0. |
| 79 | request | docs/ARCHITECTURE.md and station goal prompts (wave 1) | **R** | Rules 10.3.1 to 10.3.8 are the entry's (a) to (g) plus the ids rule. |
| 80 | request | package.json | **A** | Same as 0. |
| 81 | request | docs/goals/iter-1.json | **R** | Same as 68. |

### i1-core-mapping (18 entries: 13 resolved, 2 already done, 3 left, 0 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 82 | minor | i1-core-mapping: js/core/shapes.js sector() line 296 `while (th1 <= th0) th1 += T... | **L** | shapes.js `sector` can hang on huge angles and the builders accept huge n. Not reachable from the Lab's controls; documented as a caution in 3.9; fix (modulo, caps, a test) is for the mapping owner. |
| 83 | minor | i1-core-mapping: js/core/mapping.js run(), pole-leap rule (a) (design 5.2 step 7,... | **R** | Limitation and mitigation recorded (rule 10.5.5, with a quick measurement: smoothing cut 86 false cuts to 9 of 300). The engine's reversal threshold is left. |
| 84 | minor | i1-core-mapping: docs/ARCHITECTURE.md 3.9 to 3.11 and docs/CONSTRAINTS.md (Verifi... | **R** | ARCHITECTURE 3.9 to 3.11 updated (CONSTRAINTS npm test line already fixed). |
| 85 | minor | i1-core-mapping: docs/designs/iter-1/i1-core-mapping.md section 8.2 (performance ... | **L** | Optimistic figures in the mapping design's performance table; nothing depends on them. |
| 86 | minor | i1-core-mapping: docs/designs/iter-1/i1-core-three.md (hue wheel row) versus doma... | **R** | Noted in 3.11 and rule 10.5.4 (compare with `colorOf(w, out, false)`). The sentence in the three-view design is left. |
| 87 | minor | i1-core-mapping: js/core/shapes.js isSimple() (design 5.1, documented limitation) | **R** | Documented in 3.9 (decimated copy above 1000 edges; classify on pointerup). |
| 88 | minor | i1-core-mapping: docs/ARCHITECTURE.md 3.9, 3.10, 3.11 (not owned by this goal) | **R** | Same as 84. |
| 89 | minor | i1-core-mapping: js/core/domaincolor.js targetSize() versus A4 text 'q = quality[... | **R** | Documented in 3.11 (the pixel cap) and rule 10.5.4. |
| 90 | minor | i1-core-mapping: tests/interact/i1-core-mapping.mjs cm-seam figure | **L** | Throwaway proof-sheet caption in the mapping interaction script. |
| 91 | minor | i1-core-mapping: js/core/mapping.js, morph at very small s | **R** | Documented in 3.10 and rule 10.5.5. |
| 92 | minor | i1-core-mapping: docs/designs/iter-1/i1-core-mapping.md 8.2 performance figures | **R** | ARCHITECTURE 3.9 and rule 10.5.5 give the measured "about 10 ms"; the design table is left. |
| 93 | request | package.json | **A** | Same as 0. |
| 94 | request | js/core/plane.js | **R** | plane.js already only clears its canvas (CSS paints `--plane-bg`) and ignores unknown curve properties; verified in a browser (W1, W2, with mutation checks), a DC canvas placed under a transparent plane looked right in a screenshot; recipe in 3.5 and rule 10.2.4. |
| 95 | request | docs/ARCHITECTURE.md | **R** | ARCHITECTURE 3.9 to 3.11 list Curve.family, reversed, source, curveLength, pointOnPieces, PUSH_DEFAULTS, colorXY, rangesFromView, DOMAIN_LEGEND, colorOf rings, render(mode), info(), maxPixels, and the clampRadius rule. |
| 96 | request | js/stations/lab.js, powermap, reciprocal and linear stations (design owners) | **R** | Rules 10.5.1 to 10.5.4. |
| 97 | request | package.json | **A** | Same as 0. |
| 98 | request | docs/ARCHITECTURE.md | **R** | The exact maxJump, loop-around-0 and morph(c, 0, f) text is in 3.10. |
| 99 | request | docs/ARCHITECTURE.md | **R** | classify.orientation and colorOf never NaN are in 3.9 and 3.11. |

### i1-core-three (20 entries: 8 resolved, 2 already done, 9 left, 1 no action)

| # | kind | where | | what happened |
|---|---|---|---|---|
| 100 | minor | i1-core-three: fitTo (4.3, 5.12) and default framing, observed at 358x269 with th... | **R** | Rule 10.6.3 (`fitTo(obj, { padding: 1.0 })`, tighter rMax). A `frameRadius` for the helix in three-view.js is left. |
| 101 | minor | i1-core-three: createView3D loop: renderNow and contextLost (5.12) | **L** | three-view.js keeps its rAF loop awake while the context is lost; harmless. |
| 102 | minor | i1-core-three: Reset button `aria-label` (2.3) | **L** | Reset button aria-label does not contain its visible text (WCAG 2.5.3); a design-mandated string in three-view.js. |
| 103 | minor | i1-core-three: hideHint and onWheelCapture (2.3, 5.12) | **L** | The 3D hint hides on any wheel or key event; current behaviour documented in 3.12. |
| 104 | minor | i1-core-three: fitTo, resize and applyViewShift (4.3, 5.12) | **L** | Stale hint inset after a resize; rule 10.6.3 tells stations to call fitTo again. |
| 105 | minor | i1-core-three: riemannSphere.addCurve dots (5.10) | **L** | Cosmetic square time dots on the sphere. |
| 106 | minor | i1-core-three: docs/ARCHITECTURE.md 3.12 (request_for_other_owners, round-1 item 8) | **R** | ARCHITECTURE 3.12 rewritten from the additions table and Appendix D (scene frame, View members, extra exports, helix range, container id, auto redraw, drawing details). |
| 107 | minor | i1-core-three: tools/smoke.mjs --route home --script tests/interact/i1-core-three... | **L** | Expected until the home station lands. |
| 108 | minor | i1-core-three: Process: docs/designs/iter-1/i1-core-three.md edited by the builder | **L** | Process: the builder-maintained Appendix D in the three design. |
| 109 | minor | i1-core-three: docs/ARCHITECTURE.md section 3.12 | **R** | Same as 106. |
| 110 | minor | i1-core-three: createView3D fitTo and hint inset | **R** | Rule 10.6.3. |
| 111 | minor | i1-core-three: tools/smoke.mjs --route home --script tests/interact/i1-core-three... | **L** | Expected until the home station lands. |
| 112 | minor | i1-core-three: hiddenRampCss() in js/core/three-view.js, line 172 | **R** | Rule 10.6.7 (legend with a border and a label). |
| 113 | request | package.json | **A** | Same as 0. |
| 114 | request | docs/ARCHITECTURE.md | **R** | Same as 106. |
| 115 | request | js/core/plane.js | **N** | Entry says no change needed (rampColor and three-view rampRgb agree). |
| 116 | request | js/stations/home.js (and every other js/stations/*.js) | **R** | Rule 10.6.2 (clear the loading text before createView3D); ARCHITECTURE 3.12. |
| 117 | request | docs/ARCHITECTURE.md | **R** | Same as 106. |
| 118 | request | package.json and docs/CONSTRAINTS.md | **A** | Entry says nothing to do: package.json and CONSTRAINTS already use the glob form. |
| 119 | request | js/stations/home.js | **L** | Expected until the home station lands. |

## 6. Left for the integrator, in the order worth doing

1. **Copy: arg versus Arg in the data (39).** `problems.js` 3.2.1 `routes.polar` treats the set `arg f` as a number; about 44 other prose fields mention an angle without saying arg or Arg. Not pinned by tests; edit before the problems station renders them.
2. **`staircase.js` `homeStep` tolerance (65).** Snap within the same 1e-9 as `exactPi` and add a unit test; today `13 * Math.PI` reads "Arg z = -3.142 (-π)" against a window `(-π, π]`.
3. **`shapes.js` caps (82).** `sector` never returns for an angle of 1e17; add a modulo and sane caps on `n`, `rings`, `rays` and the fill counts, with a unit test.
4. **`addressLabel(code, null)` (41)** throws; `explainer.js` ResizeObserver loop events (66); staircase button names at z = 0 (77): one-line fixes in their owners' files.
5. **Test-strength gaps (45, 71)**: tie `answer.tex` to `answer.values`; pin the 560 px boundary of the explainer.
6. **Shell cosmetics (1, 2, 8, 10)** and the plane's label-placement polish (52 to 54, 58, 59): optional.
7. **Process (4, 56, 60, 64, 108)**: the orchestrator or the designers accept or revert the builder-edited design docs.
8. **After wave 1**: re-run the full `node tools/smoke.mjs --dark`, and the home, problems and three-view scripts (31, 36, 61, 107, 111, 119), which only fail on the missing station files.
