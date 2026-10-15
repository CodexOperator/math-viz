# C3 residue report (iteration 1 cleanup)

Group C3 owns `js/core/{complex,parse,katex,explainer,staircase,theme,store}.js`, `js/data/{problems,functions}.js`, `js/registry.js`,
`js/app.js`, `css/theme.css`, `css/components.css`, `index.html` and the unit and interaction tests of those modules.
Nothing was committed. No doc was edited. Only the files above (and their tests) changed, plus this report and
`docs/review/iter-1/residue/C3-architecture.patch` (a patch for the docs fixer, see section 4).

## 1. Counts

| | |
|---|---|
| Entries in `residue/C3.json` | 23 |
| Fixed | 16 (indices 0, 2, 4, 5, 7, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22) |
| Declined with a reason | 7 (indices 1, 3, 6, 8, 9, 10, 14) |
| "left" entries of `wave0-sync.md` that touch C3 files | 14 fixed (1, 2, 8, 10, 24, 39, 41, 45, 65, 66, 69, 70, 71, 77), 3 re-runs done (31, 36, 61) |
| Prose fields reworded in `problems.js` / `functions.js` | 71: 45 `addressWhy` and `routes.*`, 13 `aha`, 5 topic summaries, 8 function notes |

## 2. Disposition of every entry of `C3.json`

| # | Entry | Disposition |
|---|---|---|
| 0 | Raw angles on the cards ('1.228 rad', '-0.983 rad') | **Fixed.** Every angle in the copy now says Arg, a name for arg z, or the home step (see 3.1). |
| 1 | Export `PARTS` from `registry.js` | **Declined.** The duplicate lives in `home.js` (`PART_LABELS`, not C3's), so a table in the registry plus a change in `app.js` would only move one of the two copies. A new export of a documented module also fails `architecture-sync` until ARCHITECTURE 3.15 lists it. Unit test U11 already guards the drift. Do it together with the `home.js` edit in iteration 2. |
| 2 | Residue 39, angle copy in `routes.*` | **Fixed** (same change as 0). |
| 3 | New `js/core/station-kit.js` (iteration 2) | **Declined for iteration 1.** The request says iteration 2 itself. The duplicates are in `addresses.js` and `arithmetic.js` (not C3's) and are kept identical by unit test U31 there; a shared module nobody imports cannot be verified by any station test, and its shape (typed-field protocol, snap helpers, TeX shorthands) should come from the station refactor that adopts it. |
| 4 | Footer reads 'same point' above a distance, a radius, a room around p | **Fixed in the explainer** (`spec.sameLabel`, see 3.2). The two stations still have to pass it (requests, section 5). |
| 5 | `spec.sameLabel` request | **Fixed** (same change as 4). |
| 6 | New `js/core/chrome.js`, shared station header and footer links | **Declined for iteration 1.** Same reason as 3: every station builds a header and a links bar with small differences (`ul` or `div` for the badges, different `aria-label`s, short titles, id schemes) and their tests pin those differences; the module has to be designed with the stations that adopt it. |
| 7 | `spec.sameLabel` request (second copy) | **Fixed** (same change as 4). |
| 8 | Split the long 1.5.2 `answer.tex` | **Declined.** `sets.js` and `distance.js` already wrap it (`wrapAnswerTex` cuts every `\text{}` phrase into words) and the problems station scrolls it with a plain-text fallback. A `gathered` block in the data would be passed through those helpers and through `tex(..., { display: true })` in nine other stations, and no code reads a separate `parts` field, so the change adds risk and nothing visible. |
| 9, 10 | A lighter `--t1` in the light theme | **Declined, no headroom.** The plane's ramp is now `RAMP_WEIGHT = 0.4` (C1 changed it), so the end stop is mostly the base colour. The binding limit is the shell's own rule (`i1-shell.test.mjs`, "contrast thresholds"): `--t1` needs 3:1 on `--bg`, `--surface` and `--surface-2`. `#6d83a6` is 3.86 / 3.48 / 3.15 on white, `--bg`, `--surface-2`. The next lighter step `#7388aa` is 2.94 on `--surface-2` and fails; `#7a8fb0` is 2.69. Any step that still fits gains less than 2 luma units of the 0.9 minus 0.1 difference (32.7 for the current token, 34.7 for the step that already fails). Not worth a token change. |
| 11 | Compact staircase mode | **Fixed** (`compact: true`, see 3.3). |
| 12 | `showK` column | **Fixed** (`showK: true`, see 3.3). |
| 13, 16, 18 | `homeLabel` separate from `label` | **Fixed** (`homeLabel` option and `setHomeLabel()`, see 3.3). `branches.js` can now pass `label: 'arg z'` and `homeLabel: seam === -Math.PI ? 'Arg z' : 'chosen θ'` and drop `nameTheSet()`. |
| 14 | `stationForTopic('T2.4')` should reach `branches` | **Declined.** The staircase is the deliberate first stop for T2.4: `staircase.js` builds `#staircase-topic-note` for exactly that deep link ("This station shows the first piece: the cut ... Branches and Cuts has the full story", with a link), `tests/interact/i1-station-staircase-powers.mjs` runs `--route topic-T2-4`, and `i1-shell.test.mjs` pins `#topic-T2-4` to `staircase`. The student reaches `branches` in one click. If the orchestrator disagrees: delete `'T2.4'` from the staircase entry in `registry.js`, delete `'staircase'` from `TOPICS[T2.4].stations`, and update those three tests. |
| 15, 17 | `sup.prose-sup` rule | **Fixed**: `sup.prose-sup { font-size: 0.85em; line-height: 0; }` in `components.css`. |
| 19 | `exactAngle` for multiples of π/18 | **Fixed** (q = 18 added, see 3.4). |
| 20 | Sidebar label with a literal caret | **Fixed** in `app.js` (see 3.5). It does not import `prose()` because `architecture-sync` allows `app.js` exactly three imports; the same rule is written in miniature and a unit test checks it against `proseParts` on every station title and summary. |
| 21, 22 | 3.2.1 `routes.polar` differentiates the set arg f | **Fixed.** New text: "y is a name for arg f ... Write log f = ln\|f\| + iV with V = y, a continuous choice of arg f. Cauchy–Riemann says the same for log f: ∂(ln\|f\|)/∂x = ∂V/∂y, which is 1 = 1, and ∂(ln\|f\|)/∂y = −∂V/∂x, which is 0 = 0." |

## 3. What changed

### 3.1 Copy: arg is a set, Arg is one value (`problems.js`, `functions.js`)

Voice used everywhere: `Arg z` for the principal value, "a name for arg z" (or "θ a name for arg z", "φ a name for arg h") for a raw angle,
"arg z" for the whole set, "the home step" for the wrapped value. Where a field only used a metaphor ("spin", "quarter turn") it was left alone.
Fields touched:

* `addressWhy` and `routes.cart` / `routes.polar`: 45 fields (1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.3.1, 1.3.2, 1.4.1, 1.4.2, 1.4.3, 1.5.1, 1.5.2, 2.1.1,
  2.1.2, 2.1.3, 2.2.1, 2.3.1, 2.4.1, 2.5.1, 3.1.1, 3.1.2, 3.2.1, P1 to P7). Three were imprecise in substance, not only in labels: 1.1.1 now says
  Arg z₁ + Arg z₂ is *a name for* arg(z₁z₂) (it happens to be Arg too); 2.1.3 says "angles between segments" not "angles between points";
  2.3.1 says the imaginary-axis value is for Arg z = π/2.
* `aha`: 13 fields (1.1.1, 1.3.1, 1.4.1, 1.4.2, 2.1.1, 2.2.1, 2.3.1, 2.5.1, 3.1.2, P1, P2, P4, P5). They were pinned to `docs/STORY.md` section 3, so the test
  `A4: every aha matches STORY section 3` now accepts the STORY sentence or the reworded one (`AHA_LABELLED` in `tests/unit/i1-data.test.mjs`). The docs fixer
  should put the 13 new sentences into STORY section 3 (the exact texts are in `AHA_LABELLED`); then the table can be deleted.
* Topic summaries T1.3, T1.4, T2.1, T2.2, T2.5 and function notes sq, cube, recip, linear-1i, exp, abs2, dir, x-over-z.
* Not touched on purpose: `TOPICS[].covers` (the handout's own syllabus wording, `docs/ASSIGNMENT.md` section 3), statements, `answer.*`, `answer.values`.
  Every decimal on the cards is the same checked value (the A4 decimal test passes unchanged); every route is still at most 420 characters (the longest is 413).

### 3.2 `explainer.js`

* `spec.sameLabel`: a string or a function of the state, the words before the verdict. Default `'same point'`. A trailing colon is dropped; a blank, a non-string, or a throwing function (logged once) falls back to the default.
  It is the whole label: pass `'same distance'`, `'same radius'`, `'room around p'`.
* The ResizeObserver callback no longer writes `data-narrow` itself; it records the width and applies it in the next animation frame (residue 66: Chromium fired "ResizeObserver loop completed with undelivered notifications").
* Row-label column 7.5rem to 8rem, so "not checked" is no longer 6 px from the divider (residue 70).

### 3.3 `staircase.js`

* `homeStep`: a representative within 1e-9 of the seam is the top step, exactly `seam + 2π` (so `homeStep(13 * Math.PI).theta === Math.PI`, not -π); one within 1e-9 below the top is snapped to it too. 1e-9 is the tolerance `exactPi` prints with, so the window and the text agree (residue 65).
* `createStaircase` options: `homeLabel` (what the home row, the Arg line, the window sentence, the aria-labels and the seam note call the home step; blank or null means the derived name), `showK` (a `k = n` tag at the start of every row, class `stair-k`), `compact` (smaller type, tighter rows, no decimal column; `data-compact="true"`).
* New method `setHomeLabel(name | null)` on the returned object.
* At z = 0 each step button keeps a name, `step k = n: no angle at 0`, instead of falling back to "—" (residue 77).
* A second seam crossing inside 0.9 s now restarts the pulse (class removed, reflow, class added; residue 69).

### 3.4 `complex.js`, `parse.js`

* `exactAngle` (and so `fmtAngle`, `texAngle`, and the π branch of `texNumber`) finds denominators 1 to 12 and 18. `5π/18` reads `0.873 (5pi/18)` beside `1.745 (5pi/9)`. No false positive: a test asserts that no number with at most three decimals other than 0 is "exact" over -6 to 6, and that π/13 to π/17, π/19, π/20, π/24 and π/36 stay decimals.
* `toTex` brackets an operand that starts with a minus and follows an operator: `--z` gives `-\left(-z\right)`, `z - -z` gives `z - \left(-z\right)`, `z + -3x` gives `z + \left(-3x\right)` (residue 24). Values are unchanged.

### 3.5 Shell: `app.js`, `theme.js`, `index.html`, `components.css`

* Menu titles with `^` get a `<sup class="prose-sup">`: the sidebar shows z with a raised n. `document.title`, the "No such place" list and the registry strings are unchanged.
* The nav toggle's tooltip follows the drawer ("Hide the places" while open; residue 8).
* `index.html` has two `theme-color` metas, light and dark, as the pre-JS default; `theme.js` sets every one of them to `--bg` once the page runs, so an explicit choice beats the OS preference (residue 10).
* T3 is a diamond (menu dot and station badge), so T1 disc, T2 dashed ring, T3 diamond differ by shape; the key line for T3 is dotted, T2 dashed, T1 solid; the key sentence says so (residue 1).
* The ghost-arc entry of the colour key now reads "Faint arcs are the other members of arg z (θ ± 2π, θ ± 4π, …); the solid arc is Arg z. All of them belong to the set arg z." and the swatch draws the solid arc on top of the faint ones (residue 2). Still nine entries.

## 4. API changes (for the docs fixer)

`docs/review/iter-1/residue/C3-architecture.patch` is a ready patch (`patch -p0 < docs/review/iter-1/residue/C3-architecture.patch` from the repo root; dry run clean). It edits ARCHITECTURE 3.1, 3.2, 3.3, 3.7, 3.8, 3.13, 3.14 and 10.3.6. The list:

| Where | Change | Breaks `architecture-sync`? |
|---|---|---|
| 3.3 `js/data/problems.js` | `export function addressLabel(code, { short = false } = {})` becomes `export function addressLabel(code, opts)`. `opts` is `{ short: true }` or nothing; `null`, a number, a string, an array or `{}` read as "no options" (before, `null` threw a TypeError). The comment "Pass an options object or nothing, not null" goes. | **Yes**, test "ARCHITECTURE 3.3: every documented signature is the one in the code" fails until the line is updated (with the patch it passes; checked on a scratch copy). |
| 3.1 `exactAngle`, `texNumber` | Comments: "q <= 12" becomes "q in 1..12 or q = 18". No signature change. | No |
| 3.2 `toTex` | Comment and the paragraph on `--z`: a leading-minus operand after an operator is bracketed. | No |
| 3.7 `createExplainer` | `spec.sameLabel?: string \| (state) => string`. Footer text "same point: " becomes "`<sameLabel>`: ". `data-narrow` is set one frame after a resize. | No (`spec` is not destructured) |
| 3.8 `createStaircase` | Options `homeLabel = null`, `showK = false`, `compact = false`; returned object gains `setHomeLabel(name \| null)`. `homeStep` snaps within 1e-9 of the seam. `update(null)` names the buttons. | No (`options` is not destructured) |
| 10.3.6 | The "known edge" (13π reads -π) is gone. | No |
| 3.13 `initTheme` comment, 3.14 | Every `theme-color` meta is kept in step; the menu sets `z^n` as a superscript. No export changes. | No |

New exports: none. Removed exports: none. All other changes are backward compatible: every call that worked before works the same, except that `homeStep`, `exactAngle` and `toTex` give a different answer in the narrow cases above.

Failures that remain in `npm test` and are not C3's: ARCHITECTURE 3.5 (`LABEL_COST`, plane signatures), 3.9 (`SHAPE_LIMITS`) and 3.12 (`domainSphere`), each from another fixer's file, each with their own patch.

## 5. Requests for other owners

* `distance.js`, `sets.js` (S2): pass `sameLabel` to `createExplainer` ('same distance' for the two-point mode, 'same radius' for the circle, 'room around p' for the sets row).
* `branches.js` (S3 or S4): pass `homeLabel` to `createStaircase` and call `setHomeLabel` when the seam changes; delete `nameTheSet()`.
* `roots.js`, `principal-root.js`: `showK: true` replaces the injected `.rt-krow` tag; `compact: true` is available for side-by-side lists.
* `docs/STORY.md` section 3: the 13 `aha` rows listed in 3.1.
* `reciprocal.js` (S5, residue "prose() puts a text node, a sup and a text node directly inside the flex anchor"): not C3's file; `sup.prose-sup { line-height: 0 }` is in, but the anchor needs a wrapping span.

## 6. Tests added or changed

Unit (718 in `npm test`, 712 pass; the 6 failures are the architecture-sync lines named in section 4, one of them C3's and fixed by the patch):

* `i1-core-math.test.mjs` R1, R2: every p·π/q for q in {1..12, 18} is found in lowest terms, no false positive over 12 000 three-decimal numbers, q = 13..17, 19, 20, 24, 36 stay decimals; `toTex` rows and a 4 000-formula fuzz with no `--`, `- -` or `+ -` in the output.
* `i1-core-widgets.test.mjs`: the old 1e-13 `homeStep` row now expects the top step; new test over every odd multiple of π from -99 to 99, any seam, and the text (`Arg z = 3.142 (π)`, never `-π`).
* `i1-data.test.mjs`: `addressLabel` with `null`, numbers, strings, arrays; the labelled `aha` table; "every prose field that names an angle says which one" (60 fields); "the set arg is never equated with, differentiated as, or added to as a number"; the 3.2.1 wording; and the answer tie (residue 45): every `answer.text` and `answer.tex` of all 29 problems is rebuilt from `answer.values` and must contain it, plus a mutation check (changing `2e^{i2π/3}` to `2e^{i2π/4}` now fails).
* `i1-shell.test.mjs`: the two theme-color metas and `setTheme` on several metas, the T3 shape and dotted key line, the key text and swatch, `sup.prose-sup`, the menu superscript against `proseParts` on every station title and summary, the toggle tooltip.

Interaction:

* `i1-core-widgets.mjs`: widths 540, 562, 563, 600, 720 pin the 560 px boundary (changing `NARROW_PX` to 400 now fails); no window `error` event over 14 width flips (restoring the synchronous write fails); `sameLabel` (string, colon, function, bad values, throwing function); `homeLabel`, `showK`, `compact` (no clipped row in a 240 px host), the z = 0 button names, the restarted pulse, 13π. Every new check was mutation-tested (boundary, resize loop, pulse, z = 0 label, snap): each mutation fails the script.
* `i1-shell.mjs`: toggle tooltip, menu superscript, thread shapes, both metas follow `--bg`, key swatch and text.

## 7. Verification

* `npm test`: 718 tests, 712 pass, 6 fail, all six are `architecture-sync` lines (section 4). With `C3-architecture.patch` applied to a scratch copy of ARCHITECTURE the C3 line passes and only the three sections of the other fixers remain.
* `node tools/smoke.mjs --dark --no-shots`: 63 of 63 (21 routes, desktop, phone, desktop-dark).
* Interaction scripts, all pass at desktop, phone and dark: `i1-shell`, `i1-core-widgets`, `i1-data` (route `problems`), `i1-station-home-problems` (routes `home,problems`), `i1-core-math` (route `home`). Also run as regression checks for the changed modules and all pass: `i1-station-staircase-powers` (staircase, powers, problem-1-3-2, topic-T2-4), `i1-station-addresses-arithmetic`, `i1-station-distance-sets`, `i1-station-mappings-cr`, `i1-station-branches-graph4d`, `i1-station-roots-principal`, `i1-station-limits-derivative`, `i1-station-lab`, `wave0-sync`.
* Screenshots read: home (desktop), problems (desktop, plus the 3.2.1 card with the answer revealed), addresses (desktop), the colour key, the menu, and a fixture sheet with the new staircase options and the renamed footer. All look right: the menu shows a diamond for T3 and z with a raised n, the key swatch shows the solid arc over the faint arcs, the 3.2.1 note reads as above, "same distance: agree" shows, and 13π reads `Arg z = π`.
