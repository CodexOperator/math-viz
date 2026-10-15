# Integration report, iteration 1

Role: integrator. Three passes are recorded here, newest first. **Round 3** (this pass) cleared the ten residue items the round 2 review left, read the screenshots of every route again, and re-ran the whole verification. **Round 2** and **Round 1** follow it as they were written. Nothing was committed (the orchestrator commits). The only files not touched are `docs/ASSIGNMENT.md` and `docs/CONSTRAINTS.md`.

# Round 3

## 1. Result

| Check | Before | After |
|---|---|---|
| `npm test` | 791 of 791 | **801 of 801** (8 new in `tests/unit/i1-integration.test.mjs`, `I16` to `I23`; 2 more come from `architecture-sync`, which now checks the new section 3.16 of ARCHITECTURE; the pins that quoted an old wording moved to the new one, listed in section 8, none weakened) |
| `node tools/smoke.mjs --dark --out docs/review/iter-1/integration` | 63 of 63 | **63 of 63** (21 routes, desktop, phone, desktop dark; no console error, page error, failed request, overflow or error panel) |
| Interaction scripts (all 20 files of `tests/interact`, each on the routes its header names, at desktop 1280, phone 390 and dark desktop) | not re-run before my edits (round 2 ended at 20 of 20) | **20 of 20 exit 0** (135 of 135 viewport runs: 45 route runs, each at the three viewports) |
| New step `I8` in `tests/interact/i1-integration.mjs` | none | passes at desktop, phone and dark: the real pages say "no angle at 0" in `mappings`, `linear` (P3 included), `graph4d` and the Lab; typed numbers keep both parts on `roots` and `principal-root`; the Lab footer reads "not checked"; the handle and plane labels say z₁ and z₂; every `a[href]`, tab stop and `role="button"` of all 21 stations has an id (after the answers are revealed and the details opened), no id is used twice, and the link ids are the same on a second visit |

The baseline was clean (791 of 791, 63 of 63), so the work was the ten residue items, a few faults the screenshots and scans showed (section 3), and the story check.

## 2. The ten residue items

| # | Residue | What changed | Where |
|---|---|---|---|
| 1 | `mappings`, "At this z": `r = 0, θ = undefined` beside "no angle at 0" a few lines lower | The polar cell at z = 0 reads `r = 0, no angle at 0 ⇒ u = 0, v = 0, w = 0` on all five chips (for 1/z the u, v, w stay `undefined`: 0 is the pole, and that word is true). `thetaTex` returns `\text{no angle at 0}` for the origin. Checked on the real page for every chip. | `js/stations/mappings.js`; unit `U-F2`, `I16`; script `I8` |
| 2 | `linear`: `spin 0°`, `turn by 0°`, `spins add: 0° and 45° give 45°` at a = 0 | One wording: the readout says `spin: no angle at 0`, the stage 1 caption `no spin, a has no angle at 0` (still under the 51 characters of the sticky bar), the explainer `no turn (a has no angle at 0)`, the P3 composition row `a is 0 and has no angle at 0, so there is no spin to add` (also for c, and for both). Away from 0 every string is unchanged. | `js/stations/linear.js`; unit `L7` (the a = 0 readout), `I17`; script `I8` |
| 3 | `graph4d` `(r, θ, ρ, φ) = (0, 0, 0, 0)`, `ρ = 0, φ = 0`; Lab `(r, θ) ↦ (r², 2θ) = (0, 0)` | `graph4d`: the point row keeps the slots that have a number and says which have none: `(r, ρ) = (0, 0); θ, φ: no angle at 0`; for e^z, where w = 1 does have an angle, `(r, ρ, φ) = (0, 1, 0); θ: no angle at 0`; the w row says `ρ = 0, φ: no angle at 0`. Lab: `(r, θ) ↦ (r², 2θ) = (0, no angle at 0)`. The same sweep also found the Lab z row (`re^{iθ} = 0 (θ = Arg z)`) and the hidden-image line (`Arg z = 0`) at the origin; both now say "no angle at 0". New export `pointPolarTex`. | `js/stations/graph4d.js`, `js/stations/lab.js`; unit `I18`, `I19`; script `I8`, and the `graph4d` script's z = 0 step |
| 4 | `roots` and `principal-root` typed fields re-read the other field's three-decimal display | Each field remembers the text the program last wrote (`shown`). While a field still holds exactly that text it stands for the model's exact part; any other text is a number the student typed; typing marks a field as typed (`shown[key] = null`); a field whose text already equals the model is never rewritten. With real keystrokes: Re 0.0004 then Im 0.0004 gives `c = 4×10⁻⁴ + 4×10⁻⁴i; Arg c = π/4`; Re 1.23456 then Im 2 gives `c = 1.235 + 2i` with `1.23456` still in the field; `principal-root` the same; a too-big number is still corrected and the fields are rewritten to the corrected value. (My first version failed one case, a typed `2` that equalled the stale display text `2`; the `null` mark fixes it and `I8` types that sequence.) | `js/stations/roots.js`, `js/stations/principal-root.js`; unit `I20`; script `I8` |
| 5 | Lab footer `same point: differ` with both columns `undefined` | `agree: null` when f has no value, so the footer says `same point: not checked`, as `mappings` and `arithmetic` do. | `js/stations/lab.js`; script `I8` |
| 6 | Focusable elements without an id (the answer box of each problem card, the links) | Two parts. The answer box of a problem card has an id of its own (`problems-answer-<k>-final`). Every other link and tab stop is named by the router: new `js/core/ids.js` (ARCHITECTURE 3.16), started by `app.js` for each station and stopped on the next navigation. A link is `<scope>-to-<target>` (`roots-to-lab`, `problems-card-1-4-2-to-roots`, `home-map-to-roots`), a `.tex-scroll` box `<scope>-scroll`, any other tab stop `<scope>-stop`; the scope is the nearest ancestor with an id, a repeat gets `-2`, `-3` in document order, so the ids are the same on every mount. It never touches a button, field, select or summary: those must carry their own ids and the `I7` scan still fails a station that forgets one. Before: 95 of 110 links on the problem index, 54 of 62 on home, 21 map links, 7 to 29 answer boxes without an id. After: none, on all 21 routes, in the state after every answer is revealed. Rule 10.7.3 and section 3.16 say so. | `js/core/ids.js`, `js/app.js`, `js/stations/problems.js`, `docs/ARCHITECTURE.md`; unit `I21`, `architecture-sync`, `i1-shell`; script `I8` |
| 7 | `z1`, `z2` handle names and the arithmetic plane label | `z₁`, `z₂` in the handle names of `distance` and `staircase` (the ids stay `z1`, `z2`: ids are ASCII), the `staircase` plane label and the `arithmetic` plane label. A scan of every `name`, `label` and `ariaLabel` in the station sources and of every `aria-label` and tooltip on the live pages finds no `z1`, `z2` or `z0`. | `distance.js`, `staircase.js`, `arithmetic.js`; unit `I22`; script `I8` |
| 8 | One visible "90 degrees" in the 2.1.3 plain-text answer | Not left as an exception: the plain answer now says `rotate by pi/2 (a quarter turn) counterclockwise` (still printable ASCII, the form a student types), so the word is on no page. Test `I11` scans `js/data/problems.js` too. Rule 10.7.6 says so. | `js/data/problems.js`; `i1-data` derivation, `I11` |
| 9 | ASCII `^` beside typeset superscripts | **Decision, rule 10.7.7.** A whole-number power of one symbol is a Unicode superscript in plain text (`(z − 2)²`, `y = x²`, `z⁴ = c`, `zⁿ`); a general exponent that no superscript digit can carry keeps the calculator form `base^(exponent)` (`e^(i θ)`, `|c|^(1/n)`, `z^(1/3)`, `w^(1/n)`: `fmtPolar` writes it, and canvas words cannot be raised); a paragraph note whose exponent is a letter goes through `prose()`, which raises it (`z^m = 1`, `z^d = 1`, `|w|^(1/n)` in the principal-root caption). What a student types stays ASCII on purpose (the Lab's `f = z^2` and formula hint, the muted plain-text answer lines). Changed: the `roots` quadratic readout and story (`(z - 2)² = -9; square roots: ±3i; roots: 2 + 3i, 2 - 3i`, which also drops the ASCII `sqrt:` and `+-` from the same line), its hint, the raise line and the raised-power canvas words, the primitive note; `limits` `y = x²`; `principal-root` `solve zⁿ = w` and its caption. The roots goal A3 quotes `(z - 2)^2 = -9`; `docs/goals/iter-1.json` is left as the record and the test pins moved. | `roots.js`, `limits.js`, `principal-root.js`; unit pins in `roots-principal` and `limits-derivative`, `I23` |
| 10 | Present-tense sentences about deleted patch files in `C1-report.md`, `C3-report.md` | Rewritten in the past tense (three sentences of `C1-report.md`, four of `C2-report.md`, three of `C3-report.md`): the patches "were applied" and "fixed", `npm test` "was clean" after. | `docs/review/iter-1/residue/C1-report.md`, `C2-report.md`, `C3-report.md` |

## 3. Found by the integrator, not in the residue

| Finding | Fix |
|---|---|
| The problem index (and the topic cards) wrote a station title with an exponent as plain text: `z^n: Fans and Parabolas` in the place line and in the button "Start at z^n: Fans and Parabolas" | `titleSpan` and `typesetTitle` there too (`z` with a raised n). |
| The tooltip of a problem chip showed literal braces (`e^{iθ}`, `r²e^{2iθ}`) on the eleven stations that passed `p.aha` straight to `title`; five stations had their own copy of the fix, four of them one way, one another | One `plainProse` in `js/core/katex.js` (ARCHITECTURE 3.6); the five private copies are gone (their exports are kept, so the equality tests still compare them), and every station uses it. |
| `distance` on a phone: the closing brace of `arg z₁ = { …, 0.644, 6.927, … }` wrapped alone onto the next line | A no-break space before `… }`. |
| `roots`: the raised power in the plane (`z^4 = c`) and the raise line (`z^2 = ...`) were ASCII beside the typeset page | `z⁴ = c`, `z² = …` (digits by a small helper). |
| The Lab "z" row and its hidden-image line at the origin claimed an angle (`θ = Arg z`, `Arg z = 0`) | Section 2, item 3. |

## 4. Screenshots

All 63 images of the first run (`docs/review/iter-1/integration/`, git-ignored) were read before the first edit, and the pages I changed (and the dark pages I had not seen) again after the last one. A full-page capture is 2,000 to 26,000 px tall, so I cut each desktop and dark page into 1,100 px slices and each phone page into 1,500 px slices, scaled them and laid them side by side: one contact sheet per image (the home phone page and the problem index take two to four). Checked on each: the shared header and the menu, the thread badges and neighbour links, spacing and type scale, the blue Cartesian and orange polar tones, readouts in mono, dark contrast, phone width.

Found: nothing broken, overlapping, unreadable or off-palette; the one real fault was the wrapped brace on `distance` (section 3). Looked like faults and are not, as in rounds 1 and 2: the sticky side menu is cut at the viewport height in a full-page capture (the last items read "Limits: Everv Direction"), and on `linear` the "Stage" bar sits over the top of the planes (it is pinned to the bottom of the viewport while the planes are below the fold). Still different from one station to the next, and not a fault of any one: the problem card is a left-bar callout on `distance`, `sets` and `limits` and a top-bar card on `addresses`, `arithmetic`, `curves` and `linear`; a few `Related:` links carry a sentence (`sets`, `distance`) where the rest carry a title.

## 5. The story, wired together

Nothing needed a change. `js/registry.js` has all 21 stations; `i1-integration` steps `I1` to `I5` pass in the final run at all three viewports: the menu and the header title reach every station and come back; the map on `#home` links to 20 stations and Back returns; each of T1, T2 and T3 can be walked from `home` to `problems` with the pages' own links in the registry's order; all 29 `#problem-...` links land on their owner with the handout answer in the readout; every link on every page is a route the router knows. New in this pass: every one of those links and every tab stop now has an id, which also makes the map and the link rows addressable.

## 6. What remains, and why it was not fixed

| Where | Problem | Why it waits |
|---|---|---|
| `|c|^(1/n)`, `e^(i θ)`, `w^(1/n)`, `z^(1/3)` in readouts and on canvases | ASCII `^` beside typeset superscripts on the same page | Decided (rule 10.7.7): a general exponent has no Unicode form, a readout is a text node the scripts read, and `fmtPolar`'s form is the one every station shares. Making them `<sup>` means changing what `textContent` returns for about 60 pins, and a canvas word cannot be raised at all. |
| The ids of repeated links in one scope (`-2`, `-3`) | They follow the document order, so they are stable for a page that builds in a fixed order (all 21 do) but a link added after a student's action takes the next free number | Fine for test hooks and labels; if a station ever needs a link to be addressable by a fixed name it sets its own id and the router leaves it. |
| Problem-card style, per-station neighbour-link `<nav>`, header chips | each station builds its own | D-report items 9 and 10 (`station-kit`, `chrome`, `problem-card`); one wording and one id scheme each are now tested. |
| `fmtNum` rounds a tiny value to 0 unless a station passes `{ tiny: true }`; `fmtPolar` has no such option | `linear` with a = 0.0004 + 0.0004i prints `a = 0 = 0.001 e^(i 0.785)` | a and b are dragged handles with snapping, so the value cannot be reached by hand; unchanged from round 2. |
| `docs/goals/iter-1.json` still quotes `(z - 2)^2 = -9` and `|c|^(1/n) = 2` | the goals file is the record of what was asked | the readout is `(z - 2)² = -9` now; the test pins say so. |
| `docs/designs/iter-1/*.md` describe old readouts in places | history | ARCHITECTURE sections 9 and 10.7 are the living text and were updated. |

## 7. A note on how this pass went

While moving the five private `plainProse` copies to the shared one, a regular expression of mine matched from the first comment of each file to the function and deleted a large block of code in `addresses.js`, `arithmetic.js`, `curves.js`, `linear.js` and `powers.js` (some 650 lines). I noticed at once from the diff size. Git could not undo it, because those files carried round 2's uncommitted edits. I rebuilt them from the repository's last commit, replayed every modifying command of round 2 from its transcript on a scratch copy (all 51 applied, each with its own assertion that the text it replaces was there), and checked that every file I had not touched in this pass came out byte for byte the same as the working tree (`complex.js`, `plane.js`, `parse.js`, `home.js`, the core and station tests); the five files then differed from the scratch copy only by the edits intended in this pass. The plain-text diff of each file, the 801 unit tests and the 20 interaction scripts are the evidence that nothing else was lost.

## 8. Final output summary

```
npm test                                              tests 801   pass 801   fail 0
node tools/smoke.mjs --dark --out docs/review/iter-1/integration
                                                      63/63 checks passed across 21 route(s).   exit 0
tests/interact/*.mjs, desktop + phone + dark          20 of 20 scripts exit 0; 135/135 viewport runs
  i1-station-home-problems, -lab, -addresses-arithmetic, -distance-sets, -curves-linear, -staircase-powers,
  -roots-principal, -branches-graph4d, -powermap-reciprocal, -mappings-cr, -limits-derivative,
  i1-shell, i1-integration (steps I1 to I8), i1-data, wave0-sync, i1-core-math, -mapping, -widgets, -plane, -three
```

Changed test pins, all because a wording changed on purpose and none weakened: `L7` (the a = 0 readout), `U-F2` (mappings at 0), the roots quadratic readout, story and raise line (unit and interaction), the limits path wording, the graph4d z = 0 step, the `i1-data` 2.1.3 derivation, `i1-shell` and `architecture-sync` (the router imports `core/ids.js`), `I11` (now also scans the data).

---

# Round 2

## 1. Result

| Check | Before | After |
|---|---|---|
| `npm test` | 783 of 783 | **791 of 791** (new: `I8` to `I15` in `tests/unit/i1-integration.test.mjs`, 8 tests; 18 existing pins moved to the new wordings; the aha test is now strict for all 29) |
| `node tools/smoke.mjs --dark --out docs/review/iter-1/integration` | 63 of 63 | **63 of 63** (21 routes, desktop, phone, desktop dark; no console error, page error, failed request, overflow or error panel) |
| Interaction scripts (all 20 files of `tests/interact`, each at desktop 1280, phone 390 and dark desktop, run on the routes their header names) | 20 of 20 exit 0 | **20 of 20 exit 0** (141 of 141 route runs). The first full run of this pass had two scripts fail, both on pins I had to move (`reciprocal` turn output `180 degrees` to `180°`, and the I6 scan I had just widened); the final run is clean. |
| New step `I7` in `tests/interact/i1-integration.mjs` | none | passes at desktop, phone and dark: the real pages say "no angle at 0", print a tiny product, announce a handle at the origin, read `3e12`, `2e1 + 1e1i` and `1e-3`, and every `button`, `input`, `select`, `textarea` and `summary` of all 21 stations has an id |

The baseline was clean (783 of 783, 63 of 63), so the work was the ten residue items, the screenshot read, and the story check.

## 2. The ten residue items

| # | Residue | What changed | Where |
|---|---|---|---|
| 1 | `= undefined` for an angle at 0 on addresses and arithmetic, three wordings across stations | **One wording: "no angle at 0".** `z = 0; |z| = 0; Arg z: no angle at 0`; `result = 0; |result| = 0; Arg: no angle at 0`; division and 1/z by 0 read `result is undefined (division by 0)` (the word stays where a value really is undefined). The same wording replaced `Arg z is not defined at 0` (home), `Arg c is not defined` (roots, principal-root, and their handle labels), `Arg z = undefined` and the sum line (staircase), `nθ = undefined; home step = undefined` and `angle undefined: z is 0` (powers), the explainer cells of addresses, curves and graph4d, and the sentences of distance and powermap. Sentences that explain why ("Every direction reaches 0, so arg 0 is not defined") still say the SET arg 0 is not defined. Rule 10.7.4 in ARCHITECTURE; test `I8`, and a scan of every station source for the old strings. | `addresses.js`, `arithmetic.js`, `home.js`, `roots.js`, `principal-root.js`, `staircase.js`, `powers.js`, `curves.js`, `graph4d.js`, `distance.js`, `powermap.js` |
| 2 | Handle `aria-label` claimed `θ = 0` at the origin and wrote `+ 1i` | `handleAriaLabel` writes x + iy the way `fmtCart` does (`z = 1 + i`, `z = i`, `z = -i`, `z = -2`) and says `z = 0; r = 0, no angle at 0` at the origin. Dump of every route and every deep link: no label with `+ 1i` or `+ 0i` is left. A point so close to 0 that three decimals say 0 writes its parts small (`4×10⁻⁴ + 4×10⁻⁴i`) instead of `0` with an angle. | `js/core/plane.js`; tests `U17`, `I10`, `I7` |
| 3 | `button.stair-row` and the `<summary>` toggles had no id | Row buttons are `#<id>-k<k>-row` (the staircase widget, so staircase, roots, mappings, branches, principal-root and powers get them). Every `<summary>` has an id: the details id plus `-toggle` (15 of them on 10 stations and the problem cards' plain-text answer), and the shell's `#colour-key-toggle`. **Scan of all 21 routes:** no button, input, select, textarea or summary without an id, no duplicate id, no unnamed control. This is a standing check now (`I7`, `I12`). Links are not counted; see section 5. | `js/core/staircase.js`, `index.html`, ten station files |
| 4 | `φ is free` in the ring row of `sets` | The cell now reads `c = −i: p − c = 2 + i = 2.236 e^{iφ}, φ a name for arg(p − c), Arg(p − c) = 0.464; the test uses only ρ`. φ is a name for arg(p − c) (Arg is one of its members); only the test ignores which one. Checked on desktop and phone (screenshots). | `js/stations/sets.js`; tests `I14`, distance-sets unit and interaction pins |
| 5 | `°` and `degrees` on the same page | Every angle a student reads is `90°`: the linear table and readouts (`spin by Arg a = 90°`, `turn by 90°`, `spins add: 90° and 45° give 135°`), reciprocal (`0°` slider output, `aria-valuetext`, the sphere note), cauchy-riemann (`(45.8°)`), graph4d (notes, `Turn 45°`), powermap, distance, roots' spoken line. The plain-text answers of `js/data/problems.js` stay ASCII (`90 degrees`) because the student can type them. The I6 scan now fails on `\d degrees`. Rule 10.7.6; test `I11`. | seven station files, `i1-integration.mjs` |
| 6 | Lab check sentence mixed `sqrt(2)`, `v^2/16` with `3π/4` and `×10⁻¹⁵` | `u = 4 - v²/16` and `|w| = √2 = 1.414`, beside `3π/4` and `2.2×10⁻¹⁶`. (The ASCII minus is the readout style of the whole site and stays.) A check in the Lab script and test `I15` fail on `sqrt(` or `^` in the sentence. | `js/stations/lab.js` |
| 7 | A tiny non-zero number printed as `0` beside its angle | `fmtNum` and `fmtCart` take `{ tiny: true }`: a value above the 1e-9 noise floor and below 0.001 prints as `m×10ⁿ`. `texNumber` and `texAngle` do it on their own (`texNumber(2.44e-4)` was `0`, it is `2.44\times 10^{-4}` now; this closes the round 1 "remaining" row). Used where a student can type the value: addresses, arithmetic (readout and explainer), roots and principal-root. The arithmetic case of the residue now reads `result = 3×10⁻⁶ + 2×10⁻⁶i; |result| = 3.606×10⁻⁶; Arg = 0.588`, and the explainer no longer prints `0(cos 0.588 + i sin 0.588)`. Rounding noise (1e-9 and below, `cos(π/2)`) is still `0`. Rule 10.7.5; ARCHITECTURE 3.1 signatures updated; tests `I9`, `I7`. | `js/core/complex.js`, `addresses.js`, `arithmetic.js`, `roots.js`, `principal-root.js` |
| 8 | `1e-3` parsed as e − 3, `3e12` got "Put the number first" | The tokenizer reads scientific notation when the `e` touches the digits on both sides: `1e-3` is 0.001, `2e3` is 2000, `3E12` works. `2e^z`, `2e`, `2 e - 3` and `e-3` are still Euler's e. `1e999` is "too big", `1e-400` "too small", `1e3.5` "must be a whole number". `toTex` writes `1\times 10^{-7}`. Typing `3e12 + 1e12i` on arithmetic now gets the station's own range message ("Keep both parts between -100 and 100 so the picture stays readable."), not the misleading one. The design note (`i1-core-math.md`) says so. | `js/core/parse.js`; tests `U24` rows, `I13`, `I7` |
| 9 | Aha test had one exemption with a stale reason | The STORY row for 2.2.2 now has the data's own words (`take the square root of the length and halve the angle`); the exemption is deleted, so all 29 sentences are compared to STORY (`A4`). The wave0-sync pin and the i1-data design note follow. | `docs/STORY.md`, `tests/unit/i1-data.test.mjs`, `wave0-sync.test.mjs` |
| 10 | Three reports told the reader to run deleted `.patch` files; `integration.md` held uncommitted text | Each of `C1-report.md`, `C2-report.md` and `C3-report.md` now opens with a note that the patch was applied and the file deleted, and the `git apply` / `patch` sentences say "applied and deleted". This file is the final text of both passes. Nothing was committed by me. | `docs/review/iter-1/residue/C*-report.md` |

## 3. Screenshots

All 63 images of the final smoke run (`docs/review/iter-1/integration/`, git-ignored): the desktop shot of every route (2 or 3 chunks each), the phone shot of every route (home, addresses, arithmetic, staircase, distance, powers, roots, lab, linear, powermap, reciprocal, limits, derivative, cauchy-riemann, sets, graph4d and the index at the top, with a second chunk where the page changes), and the dark desktop shots (home, linear, branches, graph4d and the Lab in full, the others at the top). The first read was of the pass-1 images before any edit; the second of the final run. Checked in each: the shared header and the menu, the thread badges, the neighbour links, spacing and type scale, the blue Cartesian and orange polar tones, readouts in mono, dark contrast, phone width.

Found and fixed from the screenshots: nothing beyond the ten items; the pages were in the state the round 1 pass left them. Looked like faults and are not:

* On every page the full-page capture cuts the sticky side menu at the viewport height, and on the later stations it starts scrolled to the current place. That is the capture, not the page (round 1 saw the same).
* On `linear` the capture shows the "Stage" bar over the top of the two planes and a gap below them. The bar is pinned to the bottom of the viewport while the planes are below the fold; I scrolled the real page to 500, 900 and 1300 px and the bar sits between the planes and the "Shape to move" panel with no overlap.
* The problem card is a left-bar callout on some stations (`distance`, `sets`, `limits`) and a top-bar card on others (`addresses`, `arithmetic`, `curves`, `linear`). Both use the same tokens; one `problem-card` module is the D-report item (see section 5).

## 4. The story, wired together

`js/registry.js` has all 21 stations; `tests/interact/i1-integration.mjs` (steps I1 to I5, desktop, phone and dark) passes: the menu and the header title reach every station and come back; the map on `#home` links to 20 stations and Back returns; each of T1, T2 and T3 can be walked from `home` to `problems` with the pages' own links in the registry's order; all 29 `#problem-...` links land on their owner with the handout answer in the readout; every link on every page is a route the router knows. The unit tests `I1` to `I7` pin the same from Node. No route, link or thread needed a change in this pass.

## 5. What remains, and why it was not fixed

| Where | Problem | Why it waits |
|---|---|---|
| Links (`<a href>`) in prose, chips, cards and the SVG map have no ids (about 95 on the problem index, 54 on home) | the contract says every control has an id | I read "control" as a widget (button, field, select, toggle), and rule 10.7.3 now says so; a link is named by its text and its target is the route. Stable ids for links that repeat across cards need one shared link builder (D-report item 9, `chrome.js`). |
| `fmtNum` still rounds a tiny value to 0 unless a station passes `{ tiny: true }`; `fmtPolar` has no such option | `linear` with a = 0.0004 + 0.0004i prints `a = 0 = 0.001 e^(i 0.785)` | a and b are dragged handles with snapping (0.25), so the value cannot be reached by hand; the typed-input stations (addresses, arithmetic, roots, principal-root) are done. A `tiny` option for `fmtPolar` and a default for all stations is a core change for iteration 2. |
| The Lab's formula hint (`You can use z, x, y, i, pi, e ...`) and the arithmetic hint do not mention `1e-3` | a student who tries it finds it works; one who does not, loses nothing | copy only; both are pinned by tests that quote them. |
| Problem-card style (left bar versus top bar), per-station neighbour-link `<nav>`, header chips | each station builds its own | D-report items 9 and 10 (`station-kit`, `chrome`, `problem-card`); the wording of every link, badge and title is one function each and is tested (`I6`, `I6b`, `I7`). |
| The sticky "Stage" bar of `linear` overlaps the planes in a full-page capture | none on the live page | a capture artefact (section 3). |
| `docs/designs/iter-1/*.md` still show old readouts in places | they are history | ARCHITECTURE sections 9 and 10.7 are the living text and were updated (the core-math design note was fixed because the grammar changed). |

## 6. Final output summary

```
npm test                                              tests 791   pass 791   fail 0
node tools/smoke.mjs --dark --out docs/review/iter-1/integration
                                                      63/63 checks passed across 21 route(s).   exit 0
tests/interact/*.mjs, desktop + phone + dark          20 of 20 scripts exit 0; 141/141 route runs
  i1-station-home-problems, -lab, -addresses-arithmetic, -distance-sets, -curves-linear, -staircase-powers,
  -roots-principal, -branches-graph4d, -powermap-reciprocal, -mappings-cr, -limits-derivative,
  i1-shell, i1-integration (steps I1 to I7), i1-data, wave0-sync, i1-core-math, -mapping, -widgets, -plane, -three
```

Changed test pins, all because a wording changed on purpose and none weakened: the angle at 0 (addresses, arithmetic, home, roots, principal-root, staircase, powers, curves), the handle label (`i1-core-plane` unit and interaction, `limits-derivative`), the ring row (`distance-sets`), `°` (`curves-linear`, `branches-graph4d`, `powermap-reciprocal`), the Lab check sentence, the 1e3 parse pin (now a pass), the aha exemption, and the wave0-sync row.

---

# Round 1: the earlier integration pass (kept as it was)

Role: integrator. All goal builds and the residue sweep were finished when this pass began; nothing else was running. Nothing was committed.
The only files not touched are `docs/ASSIGNMENT.md` and `docs/CONSTRAINTS.md`.

### 1. Result

| Check | Before | After |
|---|---|---|
| `npm test` | 774 of 774 | **783 of 783** (new: `tests/unit/i1-integration.test.mjs`, 9 tests; `U12b` in the Lab file; the aha test is now strict against STORY) |
| `node tools/smoke.mjs --dark --out docs/review/iter-1/integration` | 63 of 63 | **63 of 63** (21 routes, desktop, phone, desktop dark; no console error, page error, failed request, overflow or error panel) |
| Interaction scripts (all 20 files of `tests/interact`, each at desktop, phone and dark desktop) | 14 of 20 passed on the second full run; the failures were pins of the old formats | **20 of 20 exit 0** (90 of 90 checks across 26 runs; the story walk is one of the 20) |
| New story walk `tests/interact/i1-integration.mjs` | none | passes at desktop, phone and dark: menu and header reach all 21 places, the map links to 20, every thread can be walked from `home` to `problems` by the pages' own links, all 29 `#problem-...` links land on their station with the handout answer in the readout, every link on every page is a known route, one readout style on all 21 stations |

The baseline was already clean, so the work was the sweep check, the five residue items, and what the screenshots and the cross-station scans showed.

### 2. The residue sweep: verified, with spot checks

Every one of the 188 entries of `residue/*.json` has a row with a disposition in its report (checked by script: C1 20, C2 9, C3 23, S1 25, S2 27, S3 30, S4 28, S5 21, S6 13; D 26 carry the field in the JSON). The reports' own counts add up.

I re-ran every interaction script of the sweep (the reports quote them as passing) and then checked "marked fixed" claims on the live pages with a scratch script that drives the real DOM. Checked and passing:

| Report | Spot checks (on screen or in a script run) |
|---|---|
| C1 (plane.js) | the ramp weight default 0.4 and the family colours on the Lab planes (`core-three` S28 now compares 0.65, 0.4 and 0.3 by value); the label placer on the arithmetic division view (every theta word placed: `labels()` all true); axis numbers kept off an edge axis on the CR w-plane (screenshot) |
| C2 (three, shapes, mapping) | the sphere framing with `frameLabels` (`core-three` S27, desktop, phone, dark, after fixing a check that only looked for a dark glyph); the 4D graph lifts the Lab's grid (no "grids stay in the Lab" text); the pole cap on the 1/z landscape |
| C3 (core and data) | the z = 0 staircase line; `fmtAngle` q = 18 (powermap 50 and 55 degrees read `5π/18`, `11π/36`); `sup.prose-sup` raise in the Lab and the sidebar; `sameLabel` footers ("same radius", "room around p", "same root") |
| S1 (home, problems, lab) | `142` finds 1.4.2 and `conjugate` finds T1.1, 1.1.2 and P1; the sector gesture and the first-visit example (the interaction script and screenshots); the closing full stop stays with the maths on the cards; **the "Plain text version" chevron: the details sits inside the revealed answer, and the computed chevron is present** |
| S2 (addresses, arithmetic, distance, sets) | the Bounded chip's draggable disk handle `#sets-plane-bound`; stale `aria-invalid` cleared; the tiny-denominator form; the P2 text; readouts typeset |
| S3 (curves, linear, staircase, powers) | no literal braces in the circle takeaway; no sideways scroll at 320 px on staircase and powers; the walk stops when a preset is clicked; the stage caption does not reflow (the viewport shot of `linear` with its sticky bar) |
| S4 (roots, principal, branches, graph4d) | `k = 0, 1` lists; the grids are lifted on graph4d; the neutral callout text on the 1.4.3 deep link; the homeLabel line on branches |
| S5 (powermap, reciprocal, mappings, CR) | one span per neighbour link and a raised exponent (checked in `R9c` and on screen); the CR verdict has real superscripts; the Invert stage arrow; the CR w-plane is centred on f(z₀) |
| S6 (limits, derivative) | the `z₀` word is on the canvas, with no DOM word; 4 clicks of "+" leave z₀ within 1 px of its place; the spin label stays off the arrowhead on a phone; `Arg h = 0°` has no repeated "(0)" |

One claim did not hold: **S5 request 8 (the exponent in the neighbour links) was true for the four stations that had been fixed but not for the links on `roots` and `principal-root`, and the Lab chips** (the item listed in the residue). All three are fixed now, and rule 10.4.8 has no known violation left.

### 3. The five residue items

1. **Sweep:** section 2.
2. **Lab function chips** (`js/stations/lab.js`): every chip label is now one `<span>` holding the `prose()` output. The exponent in `zⁿ`, `eᶻ` and `z^(1/3)` is raised, with no 8 px gap.
3. **Staircase at z = 0** (`js/core/staircase.js`): the line reads `Arg z: no angle at 0` (with a home label, `chosen θ: no angle at 0`), beside the existing "arg z is not defined here" and "The point 0 has no angle ..." lines. The two interaction scripts and four design documents that quoted the old `= undefined` were updated.
4. **Hygiene:** the three applied `C*-architecture*.patch` files are deleted (`git rm`). There was no `*.orig` file and no `tmp/` directory in the repository (the D fixer had already removed `ARCHITECTURE.md.orig`). The `AHA_LABELLED` table and its "or the labelled wording" branch are deleted from `tests/unit/i1-data.test.mjs`; the aha test now compares every sentence to STORY section 3 exactly, except 2.2.2 which is corrected on purpose.
5. **Cross-station consistency:** section 4.

### 4. Cross-station consistency: what the scans found and what changed

I dumped the visible text of all 21 routes and all 29 problem deep links, and a second dump after pressing every button and moving every slider of every station (about 4,200 distinct lines), then searched for the forms a student should not meet. Findings and fixes:

| Finding | Where | Fix |
|---|---|---|
| **π was typeset on six stations and written `pi` on eight** (readouts, notes, the explainer's roots list: `2 e^(i pi/4)`, `Arg c = pi`, `window (-pi, pi]`) | roots, principal-root, branches, powermap, limits, derivative, reciprocal, home, Lab | every readout now uses `fmtAngle(..., { unicode: true })` or a literal `π`: `2π/3`, `window (-π, π]`, `roots at (Arg c + 2πk)/n` |
| `z0`, `w0`, `f'(z0)`, `eps = `, `delta`, `rho = `, `90 deg`, `chosen theta` in readouts and notes | derivative, limits, cauchy-riemann, branches, Lab | `z₀`, `w₀`, `f′(z₀)`, `ε = 0.5; largest δ = 0.225`, `ρ = 0.2`, `90°`, `chosen θ`; headings `In r and θ (polar)`, `f on (r, θ)` |
| a number too big for decimals printed as `1.5e+25` (and `8.529e+25` in the CR readout and `1.0e-4` in the Lab check) | core `fmtNum` (from 1e15), CR, Lab | new `fmtSci` in `js/core/complex.js` (documented in ARCHITECTURE 3.1): `8.529×10²⁵`; `fmtNum` and `texNumber` use it |
| the ASCII answer line under each answer (`the real axis (v = 0) ...`) was a proportional font on six stations and mono on five | addresses, arithmetic, branches, lab, powermap, reciprocal | `muted mono` everywhere (it is the one place `pi` and `sqrt(3)` stay on purpose: what a student can type) |
| thread badges read "T1 · Addresses", "A function is a motion", "T3 A function ..." and "Motion and zoom" depending on the page | 19 stations | one `threadLabel()` in `js/registry.js`: `T2 · The staircase` everywhere; the map legend and the problem index use it too |
| thread links read "Earlier on the staircase thread: ...", "T2 next: ...", "(thread T2)", "Previous: ...", "T3 starts at ...", "T1: ..." and the Lab had none | 17 stations | one `threadLinkPrefix(thread, dir)`: `T2 next: ...`, `T1 previous: ...`; a thread stop that is already the plain neighbour is offered once; story bridges that are not neighbours say `Related: ...`; rule 10.1.10 in ARCHITECTURE |
| **a thread could not be walked**: `branches` linked T2 on to the 4D graph while the registry puts the Lab between them; `graph4d` offered "T2 previous: Branches" although the Lab is the previous T2 stop; `sets` linked to `#distance-circle`, which `parseRoute` rejected for every station except `distance`, as a "route" with a hand-written bridge | branches, graph4d, sets, distance, derivative | `branches` now says `T2 next: The Mapping Lab` and keeps `Related: The 4D Graph`; `graph4d` says `Related:` for the two bridges; `distance` and `sets` link to each other as `Related:` and their prev/next/thread links come from the registry; the integration script walks all three threads with real clicks |
| a station title with an exponent (`zⁿ: Fans and Parabolas`) was plain text in the map, the plan chips and several links | home, problems | `typesetTitle()` (SVG text, Unicode superscripts) and `titleSpan()` (HTML, one span) |
| the Lab opened with its 2.5.1 line framed ±10 so the line Re w = 1/2 sat 4 percent of the half-width from the v axis and read as the axis | Lab | `frameBounds()`: when `imageBounds` had to drop pole spikes the frame holds the bulk (±5); a polynomial image keeps the whole frame |
| "Lives at addresses One Point, Two Addresses Also at staircase" ran together | problem cards | a middle dot before "Also at" |
| the plain-text answer on the two Lab cards, curves and linear still shows `theta` and `pi` | | on purpose (the typed-input idiom); documented |

Arg and arg: I scanned every line that mentions an angle. Every one says `Arg z` (the one value), "a name for arg z" or `arg z` (the set); there is no bare "θ = 1.228 rad" and no place that writes the set as a number. The wording of the handout (`arg z and the principal argument Arg z` on the syllabus card) is accurate.

Deep links `#problem-x-y-z` (all 29): every one lands on its owner with the problem's own card and a readout that shows the handout answer (the `READOUT` table in `i1-integration.mjs`: 1.1.1 `5 + 14i`, 1.3.2 `512 - 886.81i` and `home step = -1.047 (-π/3)`, 1.4.2 `Arg c = π`, 2.1.2 `u = 4 - v²/16`, 2.2.1 `3π/4`, 2.4.1 `0.5 + 0.866i`, 2.5.1 `Re w = 0.5`, 3.2.1 `1.149 + 1.183i`, P3 `-1 + i` and `-i`, and the others). I also looked at the first 1,750 px of all 29 pages: each shows the preset's picture, the statement, and the two columns.

### 5. The story wired together

`js/registry.js` has all 21 stations (unique ids, contiguous story order 0 to 20, every module exists and exports `mount(el, ctx)`: unit test I1). `parseRoute` sends every `#<station>`, `#problem-...`, `#topic-...` and `#<station>-<token>` the app builds to the right station (I2). Each problem is listed by its owner and its `alsoAt` stations and no one else (I3). Each thread starts at `home`, ends at `problems`, and `next` then `next` visits its stations in story order, and `prev` walks it back (I4); the pages' own links do the same on screen (script step I3). No link leaves the registry (I5). The menu, the map and the header title go to every station and back (script I1 and I2, with Back).

### 6. Verification run

Every `tests/interact/*.mjs` script, run with `node tools/smoke.mjs --route <routes> --script <file> --dark --no-shots` at desktop 1280, phone 390 and dark desktop (the routes each goal names; `i1-shell` on `nosuchplace`, the core scripts on their own fixture route, `i1-integration` on `home`).

Changed scripts, all because a format changed on purpose: `i1-core-widgets` (the z = 0 line), `i1-core-three` (S27's glyph check looked for dark pixels, so it never passed in the dark theme once the label is light; S28 compared the rampWeight with the old default 0.65, which changed to 0.4 in the sweep), `i1-station-home-problems`, `-staircase-powers`, `-roots-principal`, `-branches-graph4d`, `-powermap-reciprocal`, `-limits-derivative` and `-mappings-cr` (π, ε, δ, z₀, f′, `°`, `×10ⁿ` in the pinned readouts). The unit pins moved the same way.

### 7. Final output summary

```
npm test                                              tests 783   pass 783   fail 0
node tools/smoke.mjs --dark --out docs/review/iter-1/integration
                                                      63/63 checks passed across 21 route(s).   exit 0
tests/interact/*.mjs, desktop + phone + dark          20 of 20 scripts exit 0; 90/90 checks in 26 runs
  i1-station-home-problems, -lab, -addresses-arithmetic, -distance-sets, -curves-linear, -staircase-powers,
  -roots-principal, -branches-graph4d, -powermap-reciprocal, -mappings-cr, -limits-derivative,
  i1-shell, i1-integration, i1-data, wave0-sync, i1-core-math, -mapping, -widgets, -plane, -three
```

The first complete interaction run (before any edit of mine) had `i1-shell` failing only because it needs `--route nosuchplace` (my runner passed `home`) and `i1-core-three` failing on two stale checks (S27 looked for dark glyph pixels, which cannot pass once the label is light in the dark theme; S28 compared the ramp weight with the old default 0.65); both were fixed or re-run correctly. The second complete run, after the readout and link changes, had six failing scripts, all caused by this pass and fixed by updating the pin, not by weakening a check: the powers link count (3 links now, the "Earlier on the staircase thread" duplicates are gone), the exact export count of complex.js (50 with `fmtSci`), `z₀` and `f′` in the limits, derivative and CR word checks, the reciprocal link text that now starts `T1 previous: `, and a station that failed to load for a few seconds while I fixed a CSS escape in `problems.js` mid-run (the Lab's phone run hit it). The third run is the clean one above.

Screenshots read for this report (`docs/review/iter-1/integration/`, git-ignored like all review images): every route at desktop and phone, the dark desktop shots of home, derivative, graph4d, lab and branches, and the first 1,750 px of all 29 problem deep links. Findings from them that were fixed: the missing exponent raise in the Lab chips and the roots and principal-root links, the `Also at` run-on in the problem cards, the 2.5.1 line framed against the v axis in the Lab, and the formats in section 4. The full-page captures show the sticky side menu cut at the viewport height, which is the capture, not the page: the menu scrolls inside itself and `app.js` scrolls the current place into view.

### 8. What remains, and why it was not fixed here

Larger items stay under "Open for iteration 2" in `docs/review/iter-1/residue/D-report.md`: the plane.js placer that returns the box it chose (and the three requests that follow from it), `arrowInset`, a `PARTS` export, the shared `station-kit`, `chrome` and `problem-card` modules, and a mid-width home map. Items 7, 10 and 12 of that list are now done and marked so there. New items from this pass:

| Where | Problem | Why it waits |
|---|---|---|
| the neighbour-link builders (17 copies), the thread badges and the header chips | the wording is now one function each, but every station still builds its own `<nav>` and header | a shared `chrome.js` is the D-report item 9; the wording is the part a student sees, and it is now tested by `i1-integration` I6b |
| tiny numbers in TeX (closed in round 2: `texNumber` and `texAngle` now print `2.44\times 10^{-4}`; see round 2, item 7) | `texNumber` writes a number of 1e15 or more as `1.5\times 10^{20}`, but a number below 0.0005 is rounded to `0` by its three decimals (`texNumber(2.44e-4)` is `0`) | the stations that show tiny values (`powers`, `arithmetic`, `sets`) carry their own formatters (`fmtSmart`, `texDen`, `fmtEps`) and test them; moving them into complex.js is a core change for iteration 2 |
| the plain `<a>` Back/Next of `derivative` and `limits` keep a second explanatory line | by design of the S6 goal ("the circle shrinks to a point") | not a consistency fault |
| `docs/designs/iter-1/*.md` still describe readouts in ASCII in places | the designs are history; ARCHITECTURE section 9 and 10.7.2 are the living text and were updated | not edited wholesale |
