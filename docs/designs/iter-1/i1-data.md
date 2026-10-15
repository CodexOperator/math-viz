# Design: i1-data (js/data/problems.js and js/data/functions.js)

- Goal id: `i1-data` (wave 0, no dependencies, kind: engine, size M).
- Owns: `js/data/problems.js`, `js/data/functions.js`.
- Also owned automatically: `docs/designs/iter-1/i1-data.md` (this file), `tests/unit/i1-data.test.mjs`, `tests/interact/i1-data.mjs`.
- Reads: `docs/ASSIGNMENT.md` sections 2 and 3, `docs/STORY.md` section 3, `docs/ARCHITECTURE.md` 3.3, 3.4, 4 and 9, `js/registry.js` (the only file that already exists in `js/`).
- Existing code checked: `js/registry.js` is the only source file in `js/`. Its exports (`THREADS`, `STATIONS`, `stationForProblem`, `stationForTopic`, `stationById`) match ARCHITECTURE section 1; no difference to record.

## 0. Build summary (read this first)

### 0.1 What to build

Four files, all given in full in the appendices:

| File | Appendix | What it is |
|---|---|---|
| `js/data/problems.js` | A | 29 problems, 12 topics, lookups, route helpers, display helpers. Pure data. |
| `js/data/functions.js` | B | 15 catalogue functions and `fnById`. Pure data. |
| `tests/unit/i1-data.test.mjs` | C | 30 `node:test` cases covering acceptance A1 to A4. |
| `tests/interact/i1-data.mjs` | D | In-browser check (module loads, routes, KaTeX renders every TeX string, no globals). |

**Copy the appendices; do not retype or "improve" them.** The strings are the content of the site (statements, ahas, both-address solutions, answers) and each number in them was checked. The appendices contain real Unicode characters (U+2212 minus, square roots, Greek letters), not `\u` escapes; keep it that way. If you think an appendix is wrong, say so in your build report instead of editing it silently. After copying, run the commands in section 7.

### 0.2 How this design was checked (all of it was run, not just written)

| Check | Result |
|---|---|
| Prototype of both modules and both test files in a scratch tree holding the real `js/registry.js`, `docs/ASSIGNMENT.md`, `docs/STORY.md` and the vendored KaTeX | `node --test tests/unit/i1-data.test.mjs`: **30 tests, all pass** |
| Optional cross-check against a spec-conforming `parse.js` (a scratch parser from another designer was available) | all 15 `src` strings compile and evaluate to the reference functions at 7 sample points; the test is skipped when `js/core/parse.js` does not exist |
| Mutation check: 44 deliberate mistakes (wrong sign, station, topic, thread, chapter, decimal, TeX formula, derivative, route logic, helper logic, label, missing alsoAt, ...) | **44 of 44 make the test file fail** |
| Browser check with the real `tools/smoke.mjs` (copied into the scratch tree) and `tests/interact/i1-data.mjs`, headless Chromium, 1280x860 and 390x844 | both viewports pass; 175 TeX strings render in the vendored KaTeX 0.16.11 with `strict: 'error'`; importing the modules creates no globals |
| Independent maths: every worked solution in section 6 recomputed with Python `cmath` (not the same code as the tests) | all checks agree (86 reported checks, several of them loops over sample points) |
| Cost | import takes about 6 ms; the data is 49 KB as JSON; 10,000 lookups take 22 ms |

### 0.3 Where this design departs from ARCHITECTURE 3.3 and 3.4 (and why)

Every row is deliberate and is covered by a test. Nothing in ARCHITECTURE is removed; the listed exports and fields all exist.

| ARCHITECTURE says | This design | Why |
|---|---|---|
| `address: 'C' \| 'P' \| 'C→P' \| ...` (Unicode arrows) | ASCII codes `'C->P'`, `'P->C'`, `'C->P->C'` (goal acceptance A1 lists exactly these). `addressLabel(code, { short: true })` returns the arrow form `C→P` for display. | The goal's A1 is binding and ASCII is safe in tests and selectors. |
| `chapter` of the seven proofs is not stated | `chapter: 0` and `kind: 'proof'`, `section: 'Proof Examples'`. The syllabus chapter of a proof is in `topics`. | The problems-station acceptance A4 says the filter `#problems-filter-3` shows exactly three cards (3.1.1, 3.1.2, 3.2.1). A naive `p.chapter === 3` must give exactly those three. Registry uses chapter 0 for "not a chapter" already. |
| `problemsForStation(id)` "handout order" | Returns every problem the registry lists under that station (the ones it owns plus `alsoAt`), handout order, a fresh array; `'problems'` returns all 29; unknown or `home` returns `[]`. | The registry lists 1.3.1 under `addresses` and `staircase`, and five problems under `lab`; the station header chips (ARCHITECTURE 4) should show them. A test compares this with `STATIONS[].problems` for every station. |
| `routeFor(id)` returns a string | Returns `null` when `id` is not one of the 29 problems. | Round trip is then guaranteed: `idFromRoute(routeFor(id)) === id`. |
| `idFromRoute(token)` "null if not a problem route" | Also `null` for a well-formed token of an unknown problem (`problem-9-9-9`) and for wrong case (`problem-p3`). | A consumer can trust a non-null result. |
| `Fn.stations`: "where it is the star" | Every station that offers the function (default, chip or preset), in registry order; the Lab offers all 15. The star is the owner of `problems[0]`. | A station may hard-code its chips (ARCHITECTURE 9 lists them) or filter the catalogue; both then work. |
| `aha` "from STORY section 3" | Verbatim from STORY section 3 except **2.2.2**, where STORY says "halve both". The length is square-rooted and only the angle is halved (the length of 2i is 2, so the root has length √2, not 1). The test pins every other aha to STORY. | A student reading "halve both" would compute length 1. |
| (not in ARCHITECTURE) | Additive problem fields `alsoAt` and `routes: { cart, polar }` (a short worked solution in each address), additive topic field `covers` (the syllabus bullets), extra keys inside `answer.values` (`principalArgs`, `rawAngle`, `directional`, `sample.z`, `circleRadiusAt.center`). | Success criterion 2 of the assignment (say which address is easy, and why) needs both solutions side by side. |
| (not in ARCHITECTURE) | Additive exports `topicById`, `problemsForTopic`, `statementParts`, `ADDRESS_CODES`, `addressLabel`, `addressTones`. | Each is used by the tests anyway and saves every station re-implementing it. Nothing in iteration 1 depends on them. |
| Data may be mutated | Every exported object is deep-frozen. | The data is one shared singleton across stations. A station that mutates it would corrupt every other station silently; frozen objects make it throw instead. |

### 0.4 Requests for other owners (not done here, recorded for the orchestrator)

1. **`package.json` (no goal owns it): `npm test` is broken on the installed Node 22.22.** The script is `node --test tests/unit/`; Node 22 treats a directory argument as a module and fails with `Cannot find module '/…/tests/unit'` (reproduced in the repo root today; the existing `smoke-harness` test passes only when run as `node --test tests/unit/*.test.mjs` or plain `node --test`). Suggested fix: `"test": "node --test tests/unit/*.test.mjs"`. Until then this design uses the explicit file command everywhere.
2. **`docs/STORY.md` section 3, row 2.2.2:** change "halve both" to "square-root the length and halve the angle" so STORY and the data agree (the test has a one-line exemption for 2.2.2 and a regex that checks the corrected wording).
3. **i1-station-home-problems (Problem Index):** useful facts for that builder. Statements are `$...$`-delimited: render with `statementParts(statement)`. `chapter: 0` for proofs. `answer.tex` is plain TeX with no delimiters. `routeFor(id)` is the link token and, minus the `problem-` prefix, the dashed id used in `#problems-reveal-<dashes>`. `routes.cart` and `routes.polar` are available for a "both addresses" block if that goal wants them.


### 0.5 Build notes (iteration 1 builder)

The four appendices were copied into the repo and then checked. One change was made to the appendices, and the appendices in this file were regenerated from the repo files so they are again byte-identical to them.

| Change | Why |
|---|---|
| `addressLabel(code)` and `addressTones(code)` in `problems.js` look the code up through a small `addressInfo(code)` helper that accepts only a string that is an own key of the table. | The design promises "never throws: `''` or `[]` for anything unknown" (sections 2.5 and 8), but `ADDRESS_INFO['constructor']` finds an inherited `Object` member: `addressLabel('constructor')` returned `undefined` and `addressTones('toString')` threw a `TypeError`. The A1 address-helpers test now also checks `constructor`, `toString`, `__proto__`, `hasOwnProperty`, the empty string, `undefined`, `null`, a number and an object. |

Verification at build time: `node --test tests/unit/*.test.mjs` runs 150 tests with 0 failures across all goals; this file's 30 tests all pass, including the parse.js cross-check (test 19), because `js/core/parse.js` now exists and compiles all 15 `src` strings to the reference functions. The browser script passed on the real shell with a throwaway stub for the Problem Index (29 cards, 175 TeX strings rendered, 0 errors, desktop and phone, no horizontal overflow).

## 1. Goal restatement, story thread, coverage

### 1.1 The goal

Create the two pure-data modules every other station reads:

- `js/data/problems.js`: all 29 review problems of the handout (statement verbatim, the station that owns it, the address that makes it easy and why, the one-sentence aha, a short worked solution in **each** address, the final answer as TeX, as plain ASCII text and as the exact numbers the unit tests assert) and all 12 syllabus topics, plus lookups and route helpers.
- `js/data/functions.js`: the 15 functions that appear on the test, as source strings for `parse.js`, TeX, the Cartesian and polar forms of `u + iv`, the derivative, and whether the function is analytic.

No imports, no DOM, no side effects beyond building lookup tables. Importable from Node (unit tests) and from the browser (stations).

### 1.2 The story thread this carries, and how it shows on screen

Thread carried: *the map needs dots*. STORY section 2 draws the experience as a path through stations; section 3 pins **each of the 29 problems to one place**. This goal is where that pinning lives as data, so the home map, the Problem Index, every station header and the Lab can all say the same thing from one source.

How it shows on screen (every field has a visible home; nothing here is decoration):

| Field | Where the student sees it |
|---|---|
| `statement` | The card in the Problem Index (maths rendered with KaTeX), the finder results on Home. |
| `station`, `alsoAt`, `routeFor(id)` | The link "Practise it at: roots" (`#problem-1-4-2`), the station header chips, the Lab preset links back. |
| `address`, `addressLabel`, `addressTones` | A chip on the card: one tint for Cartesian, one for polar, two tints for "convert and come back". This is the **teaching device**: for each problem, which address makes it easy. |
| `addressWhy`, `aha` | The two sentences on the card; the `aha` is also the `title` of the problem chip in the station header. |
| `routes.cart`, `routes.polar` | The "both addresses" block (Cartesian solution with a `--cart` bar, polar solution with a `--polar` bar). Success criterion 2 (say which address is easy, and why) needs both solutions side by side. |
| `answer.tex`, `answer.text` | The answer behind the reveal button; `answer.text` is the plain-text/ARIA version. |
| `answer.values` | Nothing visible: these are the numbers the unit tests (and station acceptance scripts) compare on-screen values with. |
| `TOPICS[].title/summary/covers/stations` | The topic cards (the syllabus checklist) with links to the stations that teach each topic. |
| `FUNCTIONS[]` | The Lab's function chips, the mappings/derivative/Cauchy-Riemann/limits chips, `compile(fn.src)` in every station, the TeX of `u`, `v`, `f'` in the explainers. |

The arg / Arg distinction (the heart of the north star) is carried in the data wherever an angle appears: see section 3.4.

### 1.3 Review problems and topics covered

All 29 problems of ASSIGNMENT section 2, in handout order, and all 12 topics of section 3:

- Chapter 1 (11): 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.3.1, 1.3.2, 1.4.1, 1.4.2, 1.4.3, 1.5.1, 1.5.2.
- Chapter 2 (8): 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.3.1, 2.4.1, 2.5.1.
- Chapter 3 (3): 3.1.1, 3.1.2, 3.2.1.
- Proof examples (7): P1 to P7.
- Topics (12): T1.1 to T1.5, T2.1 to T2.5, T3.1, T3.2.
- Functions (15): `sq`, `cube`, `recip`, `linear-i`, `linear-1i`, `sq-plus-iz`, `sq-plus-z`, `exp`, `conj`, `re`, `abs2`, `dir`, `sqrt`, `cbrt`, `x-over-z`.

Shape of the coverage (from the data, asserted by the tests):

- Addresses (which address makes the problem easy): `C` 10, `P` 12, `both` 4, `C->P` 1, `P->C` 1, `C->P->C` 1 (total 29).
- Primary thread: T1 13, T2 6, T3 10 (T1 one point two addresses, T2 the staircase, T3 motion and zoom).
- Owning stations (16): `arithmetic` 4, `derivative` 3, `linear` 3, `roots` 3, `cauchy-riemann` 2, `distance` 2, `limits` 2, `powermap` 2, `addresses` 1, `branches` 1, `curves` 1, `mappings` 1, `powers` 1, `principal-root` 1, `reciprocal` 1, `sets` 1. `alsoAt`: 1.3.1 at `staircase`; 2.1.2, 2.1.3, 2.2.1, 2.5.1 and P4 at `lab`.
- Index filters: chapter 1 has 11, chapter 2 has 8, chapter 3 has 3, proofs 7.
- Problems per topic: T1.1 4; T1.2 2; T1.3 3; T1.4 4; T1.5 2; T2.1 5; T2.2 2; T2.3 2; T2.4 1; T2.5 1; T3.1 3; T3.2 2. No topic is empty.
- Functions: 15; not analytic: `conj`, `re`, `abs2`, `dir`, `x-over-z`; with a pole or singular point at 0: `recip`, `dir`, `x-over-z`.

## 2. UX

This goal has **no screen of its own**. There is no route, no control, no pointer, touch or keyboard handling, and no animation. What it owns is the *content and shape of what other screens show*. This section therefore specifies (2.1 to 2.2) the screens that consume the data, so the fields are shaped for them, (2.3) the consumer controls whose content comes from here, (2.4) the interaction rules the data imposes on consumers, (2.5) the empty, loading and error behaviour of the API, and (2.6) the copy, including the voice rules.

### 2.1 Where the data lands: wireframes

These wireframes belong to `i1-station-home-problems` and other station goals; they are here so the data has the right fields. Field names in `{braces}`. Items marked (+) use a field that this design adds beyond ARCHITECTURE.

**Problem card, desktop (cards in two columns at 900px and up; each card about 520px wide). Numbers in parentheses are the legend below.**

```
+------------------------------------------------------------------------+
| 1.4.2  Powers and Roots                 [ P -> C ]   [x] done       (1)|
| ---------------------------------------------------------------------- |
| Find all the 4th roots of -16. Express answers in both              (2)|
| exponential and Cartesian forms.                                       |
|                                                                        |
| Easy in: Polar, then Cartesian                                      (3)|
|   Find the roots in polar (divide the angle by 4), then             (4)|
|   convert each to x + iy because the problem asks for both.            |
| The aha                                                                |
|   -16 is 16 at angle pi; divide the staircase by 4: radius 2, ...   (5)|
|                                                                        |
| [ Show the answer ]                                                 (6)|
|                                                                        |
| after the click:                                                       |
| 2e^{i pi/4}, 2e^{i 3pi/4}, ... = sqrt2 + sqrt2 i, ...               (7)|
| +- Cartesian (slide) -----------+- Polar (spin and stretch) ----+      |
| |z^4 + 16 = (z^2-4i)(z^2+4i)   | -16 = 16e^{i pi}; staircase   |    (8)|
| |z^2 = 4i: z = +-sqrt2(1 + i)  | pi + 2 pi k; divide by 4:     |       |
| |z^2 = -4i: z = +-sqrt2(1 - i) | radius 2, pi/4 + k pi/2 ...   |       |
| +------------------------------+-------------------------------+       |
| Practise it at: roots (#problem-1-4-2)           Topic: T1.4        (9)|
+------------------------------------------------------------------------+
```

**Problem card, phone (390px, one column, no horizontal scroll; the two solutions stack, Cartesian above polar):**

```
+------------------------------------+
| 1.4.2  Powers and Roots            |
| [ P -> C ]            [x] done  (1)|
| Find all the 4th roots of -16.  (2)|
| Express answers in both ...        |
| Easy in: Polar, then Cartesian  (3)|
|  Find the roots in polar (...   (4)|
| The aha                            |
|  -16 is 16 at angle pi; ...     (5)|
| [ Show the answer ]             (6)|
| after the click:                   |
|  answer.tex (KaTeX, wraps)      (7)|
| | Cartesian (slide)             (8)|
| |  z^4 + 16 = ...                  |
| | Polar (spin and stretch)         |
| |  -16 = 16e^{i pi}; ...           |
| Practise it at: roots           (9)|
+------------------------------------+
```

Legend for both problem cards:

1. `id`, `section`; the address chip from `addressLabel(address)` and `addressTones(address)`; the "done" tick is the consumer's progress store.
2. `statement`, rendered with `statementParts`: prose as text, maths with KaTeX.
3. `addressLabel(address)`: which address is easy.
4. `addressWhy`.
5. `aha`.
6. The reveal button `#problems-reveal-1-4-2` (consumer).
7. `answer.tex` with KaTeX; `answer.text` is the accessible text.
8. (+) `routes.cart` under a `--cart` bar and `routes.polar` under a `--polar` bar.
9. `station` with `'#' + routeFor(id)`, and `topics`.

**Topic card (desktop; on a phone the same content stacks at 100% width):**

```
+----------------------------------------------------------------+
| T1.4  Powers and roots                      [thread T2]     (1)|
| Powers raise the length and multiply the angle. To solve    (2)|
| z^n = c, take the n-th root of the length and divide every ... |
| Covers                                                      (3)|
|  - computing powers                                            |
|  - all n-th roots of unity (and primitive roots)               |
|  - solving z^n = c                                             |
|  - quadratic formula in C                                      |
| Practise:  [1.3.2] [1.4.1] [1.4.2] [1.4.3]                  (4)|
| Visit:     powers   roots                                   (5)|
+----------------------------------------------------------------+
```

Legend: (1) `id`, `title`, thread badge from the registry's `THREADS[thread]`; (2) `summary`; (3) (+) `covers`; (4) `problemsForTopic(id)` as chips with `href = '#' + routeFor(p.id)`; (5) `stations` as `'#<station>'` links.

**Problem chip in a station header (ARCHITECTURE 4):** `<a class="chip problem-chip" href="#problem-1-4-2" title="{aha}">1.4.2</a>`. **Finder row on Home:** `1.4.2 · roots · Powers and Roots` (id, station id, `section`; plain text, no TeX). **Lab function chip:** `<button id="lab-fn-recip" title="{note}">{label}</button>`.

### 2.2 Phone layout notes that follow from the data

- Longest strings: `routes.*` at most 376 characters (the test caps them at 420), `aha` at most 172, `addressWhy` at most 156, `answer.tex` at most 252, `answer.text` at most 193. All are prose that wraps; none contains a long unbroken token except TeX, which KaTeX can wrap only at relation and binary-operator breaks. `answer.tex` strings that are long (1.3.1, 1.4.1, 1.4.2, 3.2.1 forms) therefore must be rendered inside a container with `overflow-x: auto` (consumer's job; cheaper than breaking the TeX by hand).
- No string contains a newline, HTML or a literal colour.

### 2.3 Consumer controls whose content comes from this module

No control is created here. These ids are specified in ARCHITECTURE 9 and fed by this module:

| Control (owner) | Fed by |
|---|---|
| `#problems-reveal-<dashed id>` (problems) | the dashed id is `routeFor(id)` without the `problem-` prefix (`1-4-2`, `P3`); shows `answer.tex` |
| `#problems-filter-1`, `-2`, `-3`, `-P`, `-all` (problems) | `chapter === 1/2/3`, `kind === 'proof'`, all. Counts: 11, 8, 3, 7, 29. |
| `.problem-card[data-problem]`, `.topic-card` (problems) | `PROBLEMS` (29) and `TOPICS` (12) |
| `#home-finder`, `#home-finder-results` (home) | matches on `id`, `section`, `aha`, station id; link `'#' + routeFor(id)` |
| header problem chips (every station) | `problemsForStation(ctx.station.id)`, `title = aha` |
| `#lab-fn-<id>` (lab), `#mappings-fn-*`, `#derivative-fn-*`, `#cauchy-riemann-fn-*`, `#limits-fn-*`, `#graph4d-fn-*` | `FUNCTIONS` / `fnById(id)`: `label`, `src` (compile), `tex`, `note`, `cart`, `polar`, `derivativeTex` |
| `#lab-preset-*[data-problem]`, `#problem-*` links back from the Lab | `routeFor(problemId)` |

### 2.4 Interaction rules the data imposes (pointer, touch, keyboard)

The module has no event handling. For the consumers:

- Strings are **text, never HTML.** Prose contains `<` and `>` as maths symbols (for example "0 < arg w < 3π/4"), so a consumer must set `textContent` (or escape), never `innerHTML`. The tests forbid HTML tags and `$` in prose, so `textContent` is always safe.
- A revealed answer must be reachable by keyboard: the reveal control is a real `<button>` (consumer), and the revealed block should get `aria-live="polite"` text from `answer.text`, because KaTeX output is not read well by screen readers.
- `title` attributes (touch screens do not show them): do not rely on `aha` being visible only in a tooltip; the card prints it.

### 2.5 States: empty, loading, error

| Situation | API result | What the consumer shows |
|---|---|---|
| Loading | none: the modules are synchronous, no network, no `await` inside | nothing to wait for |
| Unknown problem id, e.g. `#problem-9-9-9` | `idFromRoute` and `problemById` return `null`; `routeFor` returns `null` | the shell's "No such place" panel (the router does not need this module) |
| Station with no problems (`home`, `graph4d`) | `problemsForStation` returns `[]` | render no chip row |
| Unknown station, topic or function id | `[]` / `null` | consumer decides |
| Wrong argument type (`undefined`, number, object) | never throws: `null` or `[]` | same as unknown |
| Module fails to import (syntax error) | the router's under-construction panel and `console.error` (ARCHITECTURE 3.14) | not this module's job |
| Consumer mutates a returned object | **throws `TypeError` in strict mode** (all exported objects are frozen) | fix the consumer: copy first |

### 2.6 Copy

**Voice (applies to every string):** plain, direct, to a student the night before a test. Short sentences. Say what to do and why, not what the theory is called. No emoji, no exclamation marks, no "simply" or "obviously". Name the two addresses out loud ("in (x, y)", "in polar"). Every angle says whether it is a name from the set `arg z` or the one `Arg z`. Prose may use Unicode maths symbols; `answer.text` is printable ASCII (ASCII minus, `pi`, `sqrt(...)`) so it can go into a readout and into tests; `statement` and `answer.tex` are TeX.

**Copy of record** is Appendix A (every statement, aha, addressWhy, routes, answer, topic summary and function note). The table below lists the two lines the student reads first on each card, so they can be reviewed at a glance:

| id | address | Why (addressWhy) | Aha |
|---|---|---|---|
| 1.1.1 | `C` | The angles of 3 − 2i and −1 + 4i are not nice, so multiplying out in (x, y) is exact; the polar column is the check. | Multiply by the definition; the polar column checks the modulus √13·√17 = √221 and the angle. For division, multiply top and bottom by the mirror of z₂ so the spins cancel. |
| 1.1.2 | `C` | Subtract, mirror, read off the height: all three steps are slides and flips in (x, y). | Two slides and a mirror: 4 − 6i mirrored is 4 + 6i. |
| 1.2.1 | `P` | "\|z − a\| = R" says "distance from a is R", which is the definition of a circle, so no algebra is needed. | "Distance from 1 + 2i equals 3" is a circle; no algebra. |
| 1.2.2 | `C` | The distance between two points is the length of the slide from one to the other, and a slide is a subtraction in (x, y). | Distance is the length of one slide: \|5 + 2i\|. |
| 1.3.1 | `C->P` | You are given the Cartesian address (−1, √3) and asked for the polar one, so read the length and the angle off the dot. | Read the polar address of the dot at (−1, √3): length 2, second quadrant, 120°. |
| 1.3.2 | `C->P->C` | Powers are native to polar: one turn and one stretch, repeated ten times. Convert in, do it, convert back. | The same move (turn π/6, stretch 2) ten times; wrap 10π/6 onto the home step −π/3. |
| 1.4.1 | `P` | z⁵ = 1 asks which angle, repeated five times, makes a whole number of turns. That is a polar question with five equally spaced answers. | Divide the staircase of 1 (angles 2πk) by 5: five points 72° apart on the unit circle. |
| 1.4.2 | `P->C` | Find the roots in polar (divide the angle by 4), then convert each to x + iy because the problem asks for both forms. | −16 is 16 at angle π; divide the staircase by 4: radius 2, angles π/4 + kπ/2. |
| 1.4.3 | `C` | The quadratic formula is plain algebra in (x, y); the only polar step hides inside √(−36). | (z − 2)² = −9, so z − 2 is a square root of −9 (±3i), then slide by 2; the roots are a mirror pair. |
| 1.5.1 | `C` | A straight line is start + t × (end − start): a slide that grows with time, which is pure (x, y) bookkeeping. | A slide that grows with time: start + t·(end − start). |
| 1.5.2 | `P` | "1 < \|z + i\| ≤ 3" is a condition on the distance from −i, so centre the polar picture at −i and the set is a ring. | An annulus around −i; the inner circle is left out, the outer circle is kept in; decide each word by looking at a tiny disk. |
| 2.1.1 | `both` | The problem asks for the same function in both addresses: expand in (x, y), and write re^{iθ} for the polar version. | Expand (x + iy)² + i(x + iy); or r²e^{2iθ} + re^{i(θ + π/2)} because i is a quarter turn. |
| 2.1.2 | `C` | Put z = 2 + iy (y is the clock), square it, and eliminate y: ordinary (x, y) algebra gives the curve. | Push the line forward with y as the clock: u = 4 − y², v = 4y; eliminate y. |
| 2.1.3 | `both` | The line is easiest in (x, y); what the map does to the whole plane is easiest in polar, because i is just a quarter turn. | i(z − 2): slide left 2, quarter turn; the line x = 2 lands on the real axis. |
| 2.2.1 | `P` | zⁿ multiplies every angle by n, so a condition on arg z becomes a condition on arg w with no algebra. | zⁿ multiplies the angle by n; the fan opens three times wider. |
| 2.2.2 | `P` | Principal roots are defined with Arg: take the square root of the length and halve the home-step angle. | \|2i\| = 2 and Arg(2i) = π/2; take the square root of the length and halve the angle. |
| 2.3.1 | `P` | The fraction is z/conj z = e^{2iθ}, which depends only on the angle, so the polar address shows at once that the value depends on the direction of approach. | The expression is z/conj z = e^{2iθ}: it remembers only the direction; y = x² arrives tangent to the real axis. |
| 2.4.1 | `P` | A branch is a choice of window for the angle. That is a statement about polar angles, and the seam of the window is where the value jumps. | Choose a window of steps whose seam is not the negative real axis. |
| 2.5.1 | `P` | On the circle z = 2cos θ e^{iθ}, and 1/z just inverts the length and negates the angle, so polar turns the circle into a line in one line of algebra. | z = 2cos θ e^{iθ} on the circle, so 1/z = ½ − (i/2)tan θ; 0 goes to ∞ so the circle must open into a line. |
| 3.1.1 | `C` | Expanding (z + h)² is algebra in z and h; no direction is needed, which is why the answer does not depend on one. | The quotient is 2z + 1 + Δz, no direction in sight. |
| 3.1.2 | `P` | With h = ρe^{iφ} the direction of approach is the variable φ, and how the quotient depends on φ is exactly what shows f is not differentiable. | The quotient tends to conj z + z e^{−2iφ}: a circle of radius \|z\|, a point only at 0. |
| 3.2.1 | `C` | u = e^x cos y and v = e^x sin y: each partial derivative is one line in (x, y), and the Cauchy–Riemann equations are stated in (x, y). | u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere: no mirror part. |
| P1 | `both` | Either works: expand both sides in (x, y), or note that a mirror negates angles, which is one line in polar. | Mirror negates angles, and −θ₁ − θ₂ = −(θ₁ + θ₂); in C, expand both sides. |
| P2 | `P` | z·conj z is a spin followed by an unspin, and in polar the spins cancel and leave only the length squared. | Spin and unspin cancel: re^{iθ}·re^{−iθ} = r². |
| P3 | `C` | A linear map is az + b, and composing two of them is substitution, which is plain algebra in a, b, c, d. | a(cz + d) + b = (ac)z + (ad + b): spins add, stretches multiply. |
| P4 | `P` | 1 + i is a spin by 45° and a stretch by √2, so (1 + i)z carries every point of the unit circle to the circle of radius √2. | 1 + i = √2e^{iπ/4}: stretch by √2, spin 45°; and every point of the big circle is hit. |
| P5 | `P` | With z = re^{iθ} the fraction depends only on θ, so different directions visibly give different values. | x/z = cos θ e^{−iθ} depends on direction: 1 along the real axis, 0 along the imaginary axis. |
| P6 | `both` | Either the Cauchy–Riemann test in (x, y) or the direction picture in polar kills it in one line. | Same quotient as P5 at every point; or CR: u_x = 1 ≠ 0 = v_y; or: Re is a squash, not a spin-and-stretch. |
| P7 | `C` | Cauchy–Riemann is a pair of equations about partial derivatives in (x, y), and with u constant they collapse to zero at once. | u_x = u_y = 0, so CR forces v_x = v_y = 0, so f′ = 0 and f is constant. |

The 12 topic summaries and the 15 function notes are in Appendices A and B.

## 3. Visual encoding

The data module contains **no colours**. Token names (`'--cart'`, `'--polar'`) are strings, not colours; the consumer reads the computed value with `ctx.theme.cssVar` at draw time, so both themes work with no change here.

### 3.1 Cartesian vs polar colour code applied to the data

| `address` | `addressLabel(code)` | `addressLabel(code, { short: true })` | `addressTones(code)` | Chip drawing |
|---|---|---|---|---|
| `C` | Cartesian | C | `['--cart']` | one tint, `--cart` |
| `P` | Polar | P | `['--polar']` | one tint, `--polar` |
| `C->P` | Cartesian, then polar | C→P | `['--cart','--polar']` | two segments in order, left `--cart`, right `--polar` |
| `P->C` | Polar, then Cartesian | P→C | `['--polar','--cart']` | left `--polar`, right `--cart` |
| `C->P->C` | Cartesian, polar, then back | C→P→C | `['--cart','--polar','--cart']` | three segments |
| `both` | Either address | C or P | `['--cart','--polar']` | two segments; label says "Either address" |

The chip text always shows the label, never colour alone (colour-blind safe). Tones are returned as copies, so a consumer may reorder them.

Other mappings:

- **`routes`**: `routes.cart` under a heading "Cartesian (slide)" with a `--cart` left bar; `routes.polar` under "Polar (spin and stretch)" with a `--polar` left bar. Side by side from 560px, stacked below (Cartesian above polar).
- **`thread`**: `'T1'`, `'T2'`, `'T3'` map to the registry's `THREADS[].tone` (`--cart`, `--polar`, `--output`) for the thread badge on a card.
- **`FUNCTIONS[].cart` vs `.polar`**: when the explainer prints the formulas, the Cartesian pieces are tinted `--cart` and the polar pieces `--polar` (katex.js `cart()` / `polar()`); the data stores them **untinted** so the tint follows the theme.

### 3.2 Input vs output

Where the data pairs an input point with its image, the pair is named so the consumer can colour them `--input` and `--output`:

| Problem | Pair |
|---|---|
| 2.1.1 | `check.z = 1 + i` (input), `check.w = -1 + 3i` (output) |
| 2.1.2 | `sample.z = 2 + i`, `sample.w = 3 + 4i` |
| 2.1.3 | `sample.z = 2 + 3i`, `sample.w = -3` |
| 2.5.1 | `sample.z = 1 + i`, `sample.w = 0.5 - 0.5i` |
| 3.2.1 | `check.z = i pi/2`, `check.w = i` |

### 3.3 Time colouring

Two problems are about a clock. The data names the parameter so the consumer can colour with the `--t0` to `--t1` ramp: **1.5.1** `at: { t: 0.5, z: -0.5 - i }` (the line z(t) = (2 − 5t) + i(1 − 4t), t from 0 to 1) and **2.1.2** `sample: { y: 1, ... }` (`y` is the clock: the input line is z = 2 + iy and the image point at clock y is (4 − y²) + 4iy).

### 3.4 arg drawn as a set, Arg highlighted (how the data labels every angle)

Rule: an angle in the data is either **`Arg`** (one number in (−π, π], called `Arg`, `theta` or `principalArgs`) or a **name from the set `arg`** (called `angles`, `rawAngle` or written `θ ∈ arg z`). A consumer that draws it uses ghost copies / the staircase for the set and the full-strength mark for `Arg`.

| Problem | The set (arg) | The single value (Arg) |
|---|---|---|
| 1.3.1 | `arg z = {2π/3 + 2πk}` (printed in `answer.tex` and `answer.text`) | `Arg z = 2π/3` (`values.Arg`, `values.theta`) |
| 1.3.2 | `rawAngle = 5π/3` (10 · π/6, a name outside the window) | `Arg = −π/3` (wrapped onto the home step) |
| 1.4.1 | roots named by `2πk/5`, k = 0..4 (k = 3, 4 are beyond π) | `principalArgs = [0, 2π/5, 4π/5, −4π/5, −2π/5]` |
| 1.4.2 | `angles = [π/4, 3π/4, 5π/4, 7π/4]` | `principalArgs = [π/4, 3π/4, −3π/4, −π/4]` |
| 2.2.1 | the sector `0 < arg w < 3π/4` is a window of names | (none: it is a region of the plane) |
| 2.2.2 | the second root comes from the next step π/2 + 2π | `Arg(2i) = π/2`, root `Arg = π/4` |
| 2.4.1 | `θ ∈ arg z` with 0 < θ < 2π (the chosen window) | the principal branch uses (−π, π] and jumps |
| polar forms elsewhere (2.1.1, `FUNCTIONS[].polar`) | not applicable | `θ` means `Arg z` throughout |

The point itself is a different thing again: the data never gives an angle as if it were the point. Every problem's point values (`z`, `root`, `roots`) are `{ re, im }` objects.

### 3.5 Both themes

Nothing to switch. The consumer chips need at least 3:1 contrast of the chip text against the chip fill in both themes (consumer's check). The data contains no hex, `rgb(`, `hsl(` (the test searches both files).


## 4. Module API

### 4.1 Exports (exact signatures)

```js
// js/data/problems.js  (no imports)
export const PROBLEMS: readonly Problem[]      // 29, handout order, deep-frozen
export const TOPICS: readonly Topic[]          // 12, T1.1 .. T3.2, deep-frozen
export const ADDRESS_CODES: readonly string[]  // ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both']

export function problemById(id: string): Problem | null
export function topicById(id: string): Topic | null                         // additive
export function problemsForStation(stationId: string): Problem[]            // handout order, fresh array
export function topicsForStation(stationId: string): Topic[]                // TOPICS order, fresh array
export function problemsForTopic(topicId: string): Problem[]                // additive; handout order, fresh array
export function routeFor(problemId: string): string | null                  // '1.4.2' -> 'problem-1-4-2'
export function idFromRoute(token: string): string | null                   // 'problem-1-4-2' -> '1.4.2'
export function topicRoute(topicId: string): string | null                  // 'T1.4' -> 'topic-T1-4'
export function topicFromRoute(token: string): string | null                // 'topic-T1-4' -> 'T1.4'
export function statementParts(statement: string): { math: boolean, text: string }[]   // additive
export function addressLabel(code: string, opts?: { short?: boolean }): string         // additive; '' if unknown
export function addressTones(code: string): string[]                                    // additive; [] if unknown

// js/data/functions.js  (no imports)
export const FUNCTIONS: readonly Fn[]          // 15, deep-frozen
export function fnById(id: string): Fn | null
```

The test asserts that `Object.keys` of the problems module is exactly these names, so a stray export fails the suite.

### 4.2 Data structures

```js
// Complex = { re: number, im: number }                       (ARCHITECTURE 2; plain object, never mutated)

// Problem
{
  id: '1.4.2',                      // '1.1.1' .. '3.2.1' or 'P1' .. 'P7'
  chapter: 1,                       // 1, 2, 3 for numbered problems; 0 for the seven proofs
  section: 'Powers and Roots',      // handout section heading (verbatim); 'Proof Examples' for P1..P7
  kind: 'problem',                  // 'proof' for P1..P7
  statement: 'Find all the 4th roots of $-16$. Express answers in both exponential and Cartesian forms.',
                                    // handout wording; maths between $...$ pairs; only ASCII TeX inside the pairs
  station: 'roots',                 // owner; === stationForProblem(id).id (registry)
  alsoAt: [],                       // other registry stations that list it (never 'problems'), registry order
  address: 'P->C',                  // 'C' | 'P' | 'C->P' | 'P->C' | 'C->P->C' | 'both'
  addressWhy: '...',                // one sentence: why that address is native
  aha: '...',                       // STORY section 3 text (2.2.2 corrected)
  thread: 'T2',                     // first thread listed in STORY's "Address / thread" column
  topics: ['T1.4'],                 // syllabus ids, a subset of the owning station's registry topics
  routes: { cart: '...', polar: '...' },       // (+) worked solution in each address, 20..420 characters each
  answer: {
    tex: '...',                     // TeX, no $ delimiters, ASCII only
    text: '...',                    // printable ASCII only; ASCII minus
    values: { /* numbers the tests assert; shape per problem in section 6 */ }
  }
}

// Topic
{ id: 'T1.4', chapter: 1, title: 'Powers and roots', thread: 'T2',
  summary: '...',                   // one to three sentences
  covers: ['computing powers', ...],      // (+) the syllabus bullets from ASSIGNMENT section 3
  stations: ['powers', 'roots'] }   // registry order, excluding 'problems'; equals the registry listing

// Fn  (ARCHITECTURE 3.4, exactly these 12 fields)
{ id: 'sq', label: 'z²', tex: 'z^2', src: 'z^2',
  problems: ['2.1.2'], stations: ['mappings', 'powermap', 'lab', 'graph4d'],
  analytic: true, poles: [],              // poles: [{ re: 0, im: 0 }] for recip, dir, x-over-z
  note: 'Squares the length and doubles the angle.',
  cart: { u: 'x^2 - y^2', v: '2xy' },     // TeX, or null (sqrt, cbrt)
  polar: { u: 'r^2\\cos 2\\theta', v: 'r^2\\sin 2\\theta' },
  derivativeTex: '2z' }                   // null when not analytic
```

Coupling to the registry (all asserted by tests): `p.station === stationForProblem(p.id).id`; `[p.station, ...p.alsoAt]` equals the set of non-index stations whose registry `problems` contain `p.id`; `p.topics` is a subset of that station's registry `topics`; `p.thread` is one of that station's registry `threads`; `t.stations` equals the registry listing for the topic.

### 4.3 Events

None. The modules dispatch and listen to nothing.

### 4.4 Lifecycle

There is no `mount` or `unmount`: these are plain ES modules. At import time (once per page, because an ES module is a singleton and every importer gets the same objects) the module builds the data literals, deep-freezes them, and builds three `Map`s for O(1) lookup. Nothing to clean up: no timers, listeners, observers or DOM. Importing twice is free and returns identical (`===`) objects.

### 4.5 Usage examples for consumers

```js
import { problemsForStation, problemById, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { FUNCTIONS, fnById } from '../data/functions.js';
import { compile } from '../core/parse.js';
import { tex } from '../core/katex.js';

// Station header chips (ARCHITECTURE 4)
for (const p of problemsForStation(ctx.station.id)) {
  const a = document.createElement('a');
  a.className = 'chip problem-chip'; a.href = '#' + routeFor(p.id); a.title = p.aha; a.textContent = p.id;
  chips.append(a);
}

// A statement: prose as text, maths with KaTeX (never innerHTML)
for (const part of statementParts(problemById('1.4.2').statement)) {
  if (part.math) { const s = document.createElement('span'); tex(s, part.text); box.append(s); }
  else box.append(part.text);
}

// An address chip: label text plus one tint per tone
chip.textContent = addressLabel(p.address);                       // 'Polar, then Cartesian'
chip.style.setProperty('--tones', addressTones(p.address).map((t) => `var(${t})`).join(', '));

// A function: compile once, show the formulas
const fn = fnById('recip');                                        // null if unknown
const { f } = compile(fn.src);                                     // f({ re, im }) -> { re, im }
```

## 5. Algorithms

There is no rendering loop, hit testing, animation timing or resolution management in this goal. The algorithms are small lookups, and the algorithms of the tests that guard the data.

### 5.1 `problems.js`

**Construction (runs once at import)**

1. `const T = String.raw; const PI = Math.PI; const S2 = Math.sqrt(2); const S3 = Math.sqrt(3); const c = (re, im) => ({ re, im });` Every irrational number in `values` is built from these (never a typed decimal); `0.5`, `-0.5` and `-1 / 16`-style exact rationals are fine.
2. `deepFreeze(o)`: if `o` is a non-null object and not already frozen: `Object.freeze(o)`, then `deepFreeze(o[k])` for every `k` in `Object.keys(o)`. Return `o`.
3. `PROBLEMS = deepFreeze([ ...29 literals in handout order... ])`; `TOPICS = deepFreeze([ ...12 literals... ])`.
4. `PROBLEM_BY_ID = new Map(PROBLEMS.map(p => [p.id, p]))`; `TOPIC_BY_ID` likewise.
5. `PROBLEM_ROUTE = /^(?:\d+-\d+-\d+|P\d+)$/`, `TOPIC_ROUTE = /^T\d+-\d+$/`, `INDEX_STATION = 'problems'`.

**Lookups**

6. `problemById(id)`: `return PROBLEM_BY_ID.get(id) || null`. (`Map.get` with a non-string returns `undefined`, so garbage gives `null`.) `topicById` likewise.
7. `problemsForStation(s)`: if `s === 'problems'` return `PROBLEMS.slice()`. Otherwise `PROBLEMS.filter(p => p.station === s || p.alsoAt.includes(s))`. (`filter` and `slice` return fresh arrays; the problem objects inside are the frozen shared ones.) `topicsForStation(s)`: same with `TOPICS` and `t.stations.includes(s)`.
8. `problemsForTopic(t)`: `PROBLEMS.filter(p => p.topics.includes(t))`.

**Routes**

9. `routeFor(id)`: if `PROBLEM_BY_ID.has(id)` return `'problem-' + id.replace(/\./g, '-')`, else `null`. (`has(id)` true implies `id` is a string, so `.replace` is safe.) `'1.4.2'` becomes `'problem-1-4-2'`, `'P3'` stays `'problem-P3'`.
10. `idFromRoute(token)`: if `typeof token !== 'string'` or not `token.startsWith('problem-')` return `null`. Let `rest = token.slice(8)`. If `!PROBLEM_ROUTE.test(rest)` return `null`. Let `id = rest.replace(/-/g, '.')`. Return `id` if `PROBLEM_BY_ID.has(id)`, else `null`. (So `problem-p3`, `problem-1.4.2`, `problem-1-4`, `problem-9-9-9`, `problem-` and `roots` are all `null`.)
11. `topicRoute(id)` and `topicFromRoute(token)`: the same two algorithms with `'topic-'` (6 characters), `TOPIC_ROUTE` and `TOPIC_BY_ID`. `'T1.4'` becomes `'topic-T1-4'`.
12. All produced tokens use only letters, digits and `-`, which CONSTRAINTS allows in a route. The test checks it.

**Display helpers**

13. `statementParts(s)`: if `typeof s !== 'string'` return `[]`. `s.split('$')`: chunks at odd indices are maths. Push `{ math: index % 2 === 1, text: chunk }` for every non-empty chunk. Invariant (tested for all 29): joining `math ? '$' + text + '$' : text` gives the statement back. A statement never contains a literal dollar sign other than the delimiters, so there is no escape syntax.
14. `ADDRESS_INFO` is a frozen table keyed by the six codes with `{ label, short, tones }` (section 3.1). `addressLabel(code, { short = false } = {})` returns `info.short` or `info.label`, or `''` for an unknown code. `addressTones(code)` returns `info.tones.slice()` or `[]`.

### 5.2 `functions.js`

1. `const T = String.raw; const ORIGIN = { re: 0, im: 0 };` and the same `deepFreeze`.
2. `FUNCTIONS = deepFreeze([ ...15 literals in the order of ARCHITECTURE 3.4... ])`. `ORIGIN` is shared by three `poles` arrays; freezing it once is enough.
3. `FN_BY_ID = new Map(FUNCTIONS.map(f => [f.id, f]))`; `fnById(id)` returns `FN_BY_ID.get(id) || null`.

### 5.3 The guard algorithms in the unit test (Appendix C)

**Registry consistency (A1).** For each of the 29 problems: `stationForProblem(id).id === p.station`; collect `listing = STATIONS.filter(s => s.id !== 'problems' && s.problems.includes(id)).map(s => s.id)`; require `sorted([p.station, ...p.alsoAt])` equals `sorted(listing)`; require `p.thread ∈ station.threads` and `p.topics ⊆ station.topics`. For each of the 12 topics: `t.stations` equals `STATIONS.filter(s => s.id !== 'problems' && s.topics.includes(t.id)).map(s => s.id)` (registry order). For every registry station (including `home`, `graph4d` and `problems`): `sorted(problemsForStation(s.id))` equals `sorted(s.problems)` and `sorted(topicsForStation(s.id))` equals `sorted(s.topics)`.

**TeX evaluator (A3), `evalTex(src, ctx)`.** Checks the *strings* in `functions.js` numerically, so a typo in a displayed formula cannot hide. Complex numbers throughout.

1. Pre-process: replace `\operatorname{Re}` by `\Re`; delete `\left`, `\right`, `\,`, `\;`, `\!`, `\ `.
2. Tokenise with `/\\[A-Za-z]+|\d+(?:\.\d+)?|[A-Za-z]|[+\-^/(){}|]/g`; fail if anything else is left over.
3. Grammar: `expr := term (('+'|'-') term)*`; `term := '-'* power ( (power | '/' power) )*` where a power directly following another is **implicit multiplication** if its first token is a number, a letter, `\theta`, `\pi`, `\cos`, `\sin`, `\sqrt`, `\dfrac`, `\tfrac`, `\overline`, `\Re`, `(` (or `|` when not already inside `|...|`); `power := 'e' '^' exponent` (this is `exp`) `| atom ('^' exponent)?`; `exponent := '{' expr '}' | atom`.
4. `atom` handles: number; `x y r z i e` (x, y, r real from `ctx`; `z` the complex point; `i` = (0, 1); `e` = Euler's number); `\theta` and `\pi`; `( expr )` and `{ expr }`; `| expr |` (modulus); `\sqrt{expr}` (principal); `\dfrac{a}{b}` and `\tfrac{a}{b}`; `\overline{expr}` (conjugate); `\Re( expr )`; `\cos` and `\sin` with an optional `^n` then an argument.
5. Function argument rule (TeX convention): a parenthesised expression, **or** an optional number followed by at most one atom (letter, `\theta`, `\pi`, `\dfrac`, `\tfrac`, `{...}`) and nothing more. So `\cos 2\theta` is cos(2θ), `\cos\theta\sin\theta` is cos θ times sin θ, `\cos\dfrac{\theta}{2}` is cos(θ/2), `\cos^2\theta` is (cos θ)².
6. Powers: integer exponent by repeated multiplication (negative: reciprocal); anything else by the principal value `exp(w · log b)` with `log b = ln|b| + i·atan2(im, re)`. This is also how `z^{1/3}` and `z^{-2/3}` are read, matching the principal branch.
7. Evaluate every `tex`, `cart.u/v`, `polar.u/v` at 7 sample points (`1+i`, `2−i`, `−1.5+0.5i`, `0.3−0.7i`, `−2−i`, `0.5+2.5i`, `−1`) against a reference function written with plain `Math`, to 1e-9; evaluate every `derivativeTex` of an analytic function against a central difference (h = 1e-6, tolerance 1e-5) at the points off the negative real axis.
8. The evaluator itself is tested first on 17 known strings (`evalTex itself is right`), including that it throws on `x +` and on an unknown command.

**Decimals allow-list (A2/A4).** Walk every string in `PROBLEMS`, `TOPICS` and `FUNCTIONS`; for every match of `/(?<![\d.])\d+\.\d+(?![\d.])/g` require the decimal to be a key of `CHECKED_DECIMALS` (computed there with `Math`) and `value.toFixed(places) === decimal`; require every key to be used. Adding a new decimal to the copy therefore forces a new checked value.

**Statement wording (A4).** Parse `docs/ASSIGNMENT.md` section 2 into id and text (joining continuation lines). For each problem take the prose chunks of `statementParts(statement)`, find every run of 4 or more ASCII letters, lowercase it, and compare the list with the same runs in the handout text, ignoring the word `conj` (which the statement renders as an overline). Plus three exact string checks (1.3.1, 2.3.1, P7) after removing the `$` delimiters.

**Aha wording (A4).** Parse the STORY section 3 table (split on unescaped pipes, un-escape `\|`); for each problem except 2.2.2 require `norm(aha) === norm(STORY aha)` where `norm` lower-cases and removes everything except Unicode letters and digits; require `thread` to equal the first `T\d` in STORY's third column; require STORY's "place" column to start with the owning station id.

**Browser script (Appendix D).** Dynamic-import both modules by absolute URL from `document.baseURI`; record the set of `window` property names before and after; check counts, singleton identity, round-trip routes, frozen state, three spot values, and, if `window.katex` exists, render every TeX string with `throwOnError: true, strict: 'error'`.

## 6. Mathematics

Every formula below is used by a worked solution or a test. Notation: z = x + iy = re^{iθ}, θ = Arg z unless said otherwise; h = ρe^{iφ}.

### 6.1 Formulas

| Topic | Formula |
|---|---|
| Product, quotient | (x₁ + iy₁)(x₂ + iy₂) = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁); z₁/z₂ = (x₁x₂ + y₁y₂)/(x₂² + y₂²) + i(−x₁y₂ + x₂y₁)/(x₂² + y₂²) |
| Mirror | conj z = x − iy = re^{−iθ}; z·conj z = x² + y² = r²; Re z = x, Im z = y |
| Length, distance | \|z\| = √(x² + y²); distance(z₁, z₂) = \|z₁ − z₂\|; \|z₁z₂\| = \|z₁\|\|z₂\| |
| Polar address | r = √(x² + y²); θ = atan2(y, x) ∈ (−π, π] (Arg); arg z = {θ + 2πk : k ∈ ℤ}; wrap(φ) = φ − 2π·⌈(φ − π)/(2π)⌉ |
| Product in polar | r₁e^{iθ₁} · r₂e^{iθ₂} = r₁r₂e^{i(θ₁ + θ₂)}; arg(z₁z₂) = arg z₁ + arg z₂ as sets |
| Power (de Moivre) | (re^{iθ})ⁿ = rⁿe^{inθ}; the angle nθ is a name from arg(zⁿ), wrap it to get Arg(zⁿ) |
| Roots | zⁿ = c = \|c\|e^{iΘ}: z_k = \|c\|^{1/n} e^{i(Θ + 2πk)/n}, k = 0..n−1; k-th root of unity is primitive iff gcd(k, n) = 1 |
| Quadratic | az² + bz + c = 0: z = (−b ± √(b² − 4ac))/(2a), √ = principal root of the discriminant |
| Principal root | w^{1/n} = \|w\|^{1/n} e^{i Arg(w)/n}; a branch with seam σ uses θ ∈ (σ, σ + 2π] |
| Line | z(t) = a + t(b − a), 0 ≤ t ≤ 1; reverse: z(1 − t) |
| Sets | open: every point has a disk inside; closed: contains its boundary; domain = open and connected; region = domain plus some, none or all of its boundary |
| Image of x = c under z² | z = c + iy: u = c² − y², v = 2cy, so u = c² − v²/(4c²), a parabola with focus 0. Polar: r = c sec θ, ρ = c² sec²θ, φ = 2θ, so ρ(1 + cos φ) = 2c² |
| Image under 1/z | length r → 1/r, angle θ → −θ; the circle \|z − 1\| = 1 is r = 2cos θ and maps to Re w = ½ |
| Directional quotient | (f(z + h) − f(z))/h → A + B e^{−2iφ}, with A = ½(f_x − i f_y), B = ½(f_x + i f_y); analytic means B = 0 and f′ = A; \|z\|²: A = conj z, B = z; Re z: A = B = ½ |
| Cauchy–Riemann | u_x = v_y, u_y = −v_x; f′ = u_x + iv_x = v_y − iu_y; log-polar form (f ≠ 0): (ln\|f\|)_x = (arg f)_y and (ln\|f\|)_y = −(arg f)_x |
| Limits | a limit at z₀ exists only if all paths agree; lim = u₀ + iv₀ iff lim u = u₀ and lim v = v₀ |

### 6.2 Worked solutions in both addresses, with hand-checked numbers

For each problem: the statement (as stored, TeX between dollar signs), the solution in each address (the exact `routes` strings that ship in Appendix A), why that address is native, **hand-checked numbers** (computed independently with Python `cmath`, then compared with the data by the tests), and the expected `answer.values` (every row is asserted by `tests/unit/i1-data.test.mjs`, exact to 1e-9 unless a row says otherwise).

#### 1.1.1  Algebraic Properties of Complex Numbers

Station `arithmetic`; address `C`; thread T1; topics T1.1; kind problem; chapter 1.

- Statement (stored): `Let $z_1 = 3 - 2i$ and $z_2 = -1 + 4i$. Compute $z_1z_2$ and $z_1/z_2$ in the form $x + iy$.`
- Which address and why: The angles of 3 − 2i and −1 + 4i are not nice, so multiplying out in (x, y) is exact; the polar column is the check.
- Aha: Multiply by the definition; the polar column checks the modulus √13·√17 = √221 and the angle. For division, multiply top and bottom by the mirror of z₂ so the spins cancel.

**Cartesian solution.** Multiply out with i² = −1: (3 − 2i)(−1 + 4i) = −3 + 12i + 2i − 8i² = 5 + 14i. For the quotient, multiply top and bottom by the mirror −1 − 4i: (3 − 2i)(−1 − 4i)/17 = (−11 − 10i)/17.

**Polar solution.** Lengths multiply and angles add: √13·√17 = √221, and −0.588 + 1.816 = 1.228 rad. The point 5 + 14i has length √221 and angle 1.228 rad, so it checks. Division divides lengths and subtracts angles, but the decimals are ugly.

**Hand-checked numbers.**

- |z₁| = √13 = 3.605551 and |z₂| = √17 = 4.123106, so |z₁||z₂| = 14.866069. And √221 = 14.866069 and |5 + 14i| = √(25 + 196) = 14.866069. All three agree.
- Arg z₁ = −0.588003; Arg z₂ = 1.815775; sum = 1.227772 = atan2(14, 5) = 1.227772. No wrap needed: the sum is inside (−π, π].
- Quotient: |z₁/z₂| = √221/17 = 0.874475; Arg = −2.403778 = atan2(−10, −11) = −2.403778. In decimals (−11 − 10i)/17 = −0.647059 − 0.588235i.
- Mirror trick: (−1 + 4i)(−1 − 4i) = 1 + 16 = 17 and (3 − 2i)(−1 − 4i) = −3 − 12i + 2i + 8i² = −11 − 10i.

**Answer.** `answer.text`: z1 z2 = 5 + 14i; z1/z2 = -11/17 - (10/17)i

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `product` | 5 + 14i | 5 + 14i |
| `quotient` | −11/17 − (10/17)i | −0.647058824 − 0.588235294i |
| `productAbs` | √221 | 14.866068747 |

#### 1.1.2  Algebraic Properties of Complex Numbers

Station `arithmetic`; address `C`; thread T1; topics T1.1; kind problem; chapter 1.

- Statement (stored): `Find $\operatorname{Im}\big(\overline{z_1 - z_2}\big)$ for $z_1 = 3 - 2i$ and $z_2 = -1 + 4i$.`
- Which address and why: Subtract, mirror, read off the height: all three steps are slides and flips in (x, y).
- Aha: Two slides and a mirror: 4 − 6i mirrored is 4 + 6i.

**Cartesian solution.** z₁ − z₂ = (3 + 1) + (−2 − 4)i = 4 − 6i. The conjugate flips the sign of the imaginary part: 4 + 6i. Its imaginary part is 6.

**Polar solution.** z₁ − z₂ = 4 − 6i has length √52 ≈ 7.211 and angle −0.983 rad. The conjugate keeps the length and negates the angle, so it sits at +0.983 rad. Height = 7.211 · sin(0.983) = 6.

**Hand-checked numbers.**

- z₁ − z₂ = (3 − (−1)) + (−2 − 4)i = 4 − 6i. |4 − 6i| = √52 = 7.211103; Arg = −atan(6/4) = −0.982794.
- conj(4 − 6i) = 4 + 6i, Arg = +0.982794; height = |.|·sin(Arg) = 7.211103 × 0.832050 = 6.000000.

**Answer.** `answer.text`: Im(conj(z1 - z2)) = Im(4 + 6i) = 6

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `im` | 6 | 6 |
| `difference` | 4 − 6i | 4 − 6i |

#### 1.2.1  Geometric Interpretation

Station `distance`; address `P`; thread T1; topics T1.2; kind problem; chapter 1.

- Statement (stored): `Sketch the set of points in the complex plane that satisfy $|z - (1 + 2i)| = 3$.`
- Which address and why: "|z − a| = R" says "distance from a is R", which is the definition of a circle, so no algebra is needed.
- Aha: "Distance from 1 + 2i equals 3" is a circle; no algebra.

**Cartesian solution.** Square both sides: (x − 1)² + (y − 2)² = 9. That is the equation of a circle with centre (1, 2) and radius 3.

**Polar solution.** Put the origin at 1 + 2i and write z = (1 + 2i) + 3e^{iφ}. Every angle φ gives one point at distance 3, and φ from 0 to 2π walks once around the circle.

**Hand-checked numbers.**

- Three points on the circle: 4 + 2i (centre + 3), 1 + 5i (centre + 3i), 1 − i (centre − 3i). Each is at distance 3 from 1 + 2i.
- Polar form around the centre: 1 + 2i + 3e^{iφ}; φ = 0 gives 4 + 2i, φ = π/2 gives 1 + 5i, φ = π gives −2 + 2i, φ = 3π/2 gives 1 − i.

**Answer.** `answer.text`: circle, center 1 + 2i, radius 3: (x - 1)^2 + (y - 2)^2 = 9

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `center` | 1 + 2i | 1 + 2i |
| `radius` | 3 | 3 |

#### 1.2.2  Geometric Interpretation

Station `distance`; address `C`; thread T1; topics T1.2; kind problem; chapter 1.

- Statement (stored): `Find the distance between $4 + 3i$ and $-1 + i$.`
- Which address and why: The distance between two points is the length of the slide from one to the other, and a slide is a subtraction in (x, y).
- Aha: Distance is the length of one slide: |5 + 2i|.

**Cartesian solution.** Subtract: (4 + 3i) − (−1 + i) = 5 + 2i. The distance is its length √(5² + 2²) = √29 ≈ 5.385.

**Polar solution.** The slide 5 + 2i has polar address r = √29 and θ = atan(2/5) ≈ 0.381 rad (21.8°). The distance is r. The angle says which way you walk, and the problem does not ask for it.

**Hand-checked numbers.**

- (4 + 3i) − (−1 + i) = 5 + 2i. |5 + 2i| = √29 = 5.385165; angle atan(2/5) = 0.380506 rad = 21.801°.
- Both addresses of the slide: Cartesian (5, 2); polar (r, θ) = (5.385, 0.381).

**Answer.** `answer.text`: distance = |5 + 2i| = sqrt(29) = 5.385

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `distance` | √29 | 5.385164807 |
| `difference` | 5 + 2i | 5 + 2i |

#### 1.3.1  Polar Representation

Station `addresses` (also at staircase); address `C->P`; thread T1; topics T1.3; kind problem; chapter 1.

- Statement (stored): `Write $z = -1 + i\sqrt{3}$ in polar form $r(\cos\theta + i\sin\theta)$ and exponential form $re^{i\theta}$. What is $\operatorname{Arg}(z)$?`
- Which address and why: You are given the Cartesian address (−1, √3) and asked for the polar one, so read the length and the angle off the dot.
- Aha: Read the polar address of the dot at (−1, √3): length 2, second quadrant, 120°.

**Cartesian solution.** r = √((−1)² + (√3)²) = √4 = 2. Then cos θ = x/r = −1/2 and sin θ = y/r = √3/2, which happens at θ = 2π/3 (the only angle in (−π, π] with that cosine and sine).

**Polar solution.** The dot is in the second quadrant, a 60° reference angle from the negative real axis, so θ = π − π/3 = 2π/3 and Arg z = 2π/3. Every other name for the same angle is 2π/3 + 2πk; that whole set is arg z.

**Hand-checked numbers.**

- r = √(1 + 3) = 2. Reference angle atan(√3/1) = π/3 = 1.047198. Second quadrant, so θ = π − π/3 = 2π/3 = 2.094395 (120°). Check: 2cos(2π/3) = −1.000 = −1 and 2sin(2π/3) = 1.732051 = √3.
- arg z = {2π/3 + 2πk}: k = −1 gives −4.188790 (= −4π/3), k = 0 gives 2.094395 (the home step Arg z), k = 1 gives 8.377580 (= 8π/3). The point is the same for every k.

**Answer.** `answer.text`: z = 2(cos(2pi/3) + i sin(2pi/3)) = 2e^(i 2pi/3); Arg z = 2pi/3; arg z = {2pi/3 + 2 pi k}

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `r` | 2 | 2 |
| `theta` | 2π/3 | 2.094395102 |
| `Arg` | 2π/3 | 2.094395102 |
| `z` | −1 + √3 i | −1 + 1.732050808i |

#### 1.3.2  Polar Representation

Station `powers`; address `C->P->C`; thread T1; topics T1.3, T1.4; kind problem; chapter 1.

- Statement (stored): `Use polar form to compute $(\sqrt{3} + i)^{10}$. Express the final answer in Cartesian form $x + iy$.`
- Which address and why: Powers are native to polar: one turn and one stretch, repeated ten times. Convert in, do it, convert back.
- Aha: The same move (turn π/6, stretch 2) ten times; wrap 10π/6 onto the home step −π/3.

**Cartesian solution.** Square it: (√3 + i)² = 2 + 2√3 i. Square again: −8 + 8√3 i. Again: −128 − 128√3 i. Finally multiply by 2 + 2√3 i to get 512 − 512√3 i. Four multiplications, and any one of them can slip.

**Polar solution.** √3 + i has r = 2 and Arg = π/6. The tenth power has r = 2^10 = 1024 and angle 10π/6 = 5π/3, which wrapped onto the home step is −π/3. So 1024(cos(−π/3) + i sin(−π/3)) = 512 − 512√3 i.

**Hand-checked numbers.**

- |√3 + i| = 2; Arg = atan(1/√3) = π/6 = 0.523599. Tenth power: r = 2^10 = 1024; angle 10π/6 = 5π/3 = 5.235988; minus 2π gives π · (5/3 − 2) = −π/3 = −1.047198 (home step).
- 1024cos(−π/3) = 1024 · 0.5 = 512; 1024sin(−π/3) = −1024 · (√3/2) = −512√3 = −886.8100. Python check: (√3 + i)^10 = 512.0000 − 886.8100i.
- Squaring chain: z² = 2 + 2√3 i; z⁴ = (2 + 2√3 i)² = 4 − 12 + 8√3 i = −8 + 8√3 i; z⁸ = (−8 + 8√3 i)² = 64 − 192 − 128√3 i = −128 − 128√3 i; z¹⁰ = z⁸ z² = −256 − 256√3 i − 256√3 i − 768i² = 512 − 512√3 i. Same answer.

**Answer.** `answer.text`: (sqrt(3) + i)^10 = 1024 e^(i 5pi/3) = 512 - 512 sqrt(3) i (about 512 - 886.81i); Arg = -pi/3

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `result` | 512 − 512√3 i | 512 − 886.810013475i |
| `r` | 1024 | 1024 |
| `Arg` | −π/3 | −1.047197551 |
| `base` | √3 + i | 1.732050808 + 1i |
| `n` | 10 | 10 |
| `rawAngle` | 5π/3 | 5.235987756 |

#### 1.4.1  Powers and Roots

Station `roots`; address `P`; thread T2; topics T1.4; kind problem; chapter 1.

- Statement (stored): `Find and sketch the 5th roots of unity.`
- Which address and why: z⁵ = 1 asks which angle, repeated five times, makes a whole number of turns. That is a polar question with five equally spaced answers.
- Aha: Divide the staircase of 1 (angles 2πk) by 5: five points 72° apart on the unit circle.

**Cartesian solution.** Cartesian algebra is awkward here: z⁵ − 1 = (z − 1)(z⁴ + z³ + z² + z + 1), and the quartic is hard to solve by hand. The polar picture hands you all five roots at once, with cos 72° = (√5 − 1)/4 ≈ 0.309.

**Polar solution.** The staircase of 1 is the angles 2πk. Divide by 5: z = e^{i2πk/5} for k = 0..4, five points 72° apart on the unit circle. k = 5 lands back on k = 0. The angles 6π/5 and 8π/5 are names for the points whose Arg is −4π/5 and −2π/5. Since 5 is prime, every root except 1 is primitive.

**Hand-checked numbers.**

- Roots e^{i2πk/5}: k = 0: 1.000000 + 0.000000i; k = 1: 0.309017 + 0.951057i; k = 2: −0.809017 + 0.587785i; k = 3: −0.809017 − 0.587785i; k = 4: 0.309017 − 0.951057i.
- Closed forms: cos 72° = (√5 − 1)/4 = 0.309016994; cos 144° = −(√5 + 1)/4 = −0.809016994. The five roots sum to 0 (a closed pentagon).
- Each root to the 5th power is 1 (checked by repeated multiplication in the test). Primitive means gcd(k, 5) = 1: k = 0 is not (1¹ = 1), k = 1..4 all are, so [false, true, true, true, true].
- Home-step names: k = 3 and 4 have angles 6π/5 = 3.769911 and 8π/5 = 5.026548, which are beyond π, so their Arg values are −4π/5 = −2.513274 and −2π/5 = −1.256637.

**Answer.** `answer.text`: z_k = e^(i 2 pi k/5), k = 0..4: 1; 0.309 + 0.951i; -0.809 + 0.588i; -0.809 - 0.588i; 0.309 - 0.951i; all but 1 are primitive

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `n` | 5 | 5 |
| `roots[0]` | 1 | 1 |
| `roots[1]` | e^{i2π/5} | 0.309016994 + 0.951056516i |
| `roots[2]` | e^{i4π/5} | −0.809016994 + 0.587785252i |
| `roots[3]` | e^{i6π/5} | −0.809016994 − 0.587785252i |
| `roots[4]` | e^{i8π/5} | 0.309016994 − 0.951056516i |
| `primitive[0]` | false | false |
| `primitive[1]` | true | true |
| `primitive[2]` | true | true |
| `primitive[3]` | true | true |
| `primitive[4]` | true | true |
| `principalArgs[0]` | 0 | 0 |
| `principalArgs[1]` | 2π/5 | 1.256637061 |
| `principalArgs[2]` | 4π/5 | 2.513274123 |
| `principalArgs[3]` | −4π/5 | −2.513274123 |
| `principalArgs[4]` | −2π/5 | −1.256637061 |

#### 1.4.2  Powers and Roots

Station `roots`; address `P->C`; thread T2; topics T1.4; kind problem; chapter 1.

- Statement (stored): `Find all the 4th roots of $-16$. Express answers in both exponential and Cartesian forms.`
- Which address and why: Find the roots in polar (divide the angle by 4), then convert each to x + iy because the problem asks for both forms.
- Aha: −16 is 16 at angle π; divide the staircase by 4: radius 2, angles π/4 + kπ/2.

**Cartesian solution.** z⁴ + 16 = (z² − 4i)(z² + 4i). Solve z² = 4i: z = ±√2(1 + i). Solve z² = −4i: z = ±√2(1 − i). Four roots, found with a trick you have to see.

**Polar solution.** −16 = 16e^{iπ}, so its staircase is π + 2πk. Divide by 4: radius 16^(1/4) = 2 and angles π/4 + kπ/2 for k = 0..3, which are π/4, 3π/4, 5π/4, 7π/4. Four points 90° apart on the circle of radius 2. Convert with 2cos 45° = √2.

**Hand-checked numbers.**

- −16 = 16e^{iπ}. Radius 16^(1/4) = 2. Angles (π + 2πk)/4 = π/4, 3π/4, 5π/4, 7π/4 for k = 0..3.
- 2cos(π/4) = 2 · 0.707107 = √2 = 1.414214; so the roots are (±√2, ±√2) = (±1.414214, ±1.414214), in the order k = 0 (+,+), 1 (−,+), 2 (−,−), 3 (+,−).
- Fourth powers: (√2 + √2 i)² = 2 − 2 + 4i = 4i and (4i)² = −16. The same for the other three (each squares to ±4i, and (±4i)² = −16).
- Home-step names: 5π/4 → −3π/4 = −2.356194; 7π/4 → −π/4 = −0.785398; the first two are already in (−π, π].

**Answer.** `answer.text`: 2e^(i pi/4), 2e^(i 3pi/4), 2e^(i 5pi/4), 2e^(i 7pi/4) = sqrt(2) + sqrt(2)i, -sqrt(2) + sqrt(2)i, -sqrt(2) - sqrt(2)i, sqrt(2) - sqrt(2)i; as Arg values the angles are pi/4, 3pi/4, -3pi/4, -pi/4

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `radius` | 2 | 2 |
| `angles[0]` | π/4 | 0.785398163 |
| `angles[1]` | 3π/4 | 2.35619449 |
| `angles[2]` | 5π/4 | 3.926990817 |
| `angles[3]` | 7π/4 | 5.497787144 |
| `principalArgs[0]` | π/4 | 0.785398163 |
| `principalArgs[1]` | 3π/4 | 2.35619449 |
| `principalArgs[2]` | −3π/4 | −2.35619449 |
| `principalArgs[3]` | −π/4 | −0.785398163 |
| `roots[0]` | √2 + √2 i | 1.414213562 + 1.414213562i |
| `roots[1]` | −√2 + √2 i | −1.414213562 + 1.414213562i |
| `roots[2]` | −√2 − √2 i | −1.414213562 − 1.414213562i |
| `roots[3]` | √2 − √2 i | 1.414213562 − 1.414213562i |

#### 1.4.3  Powers and Roots

Station `roots`; address `C`; thread T2; topics T1.4; kind problem; chapter 1.

- Statement (stored): `Use the quadratic formula to solve $z^2 - 4z + 13 = 0$.`
- Which address and why: The quadratic formula is plain algebra in (x, y); the only polar step hides inside √(−36).
- Aha: (z − 2)² = −9, so z − 2 is a square root of −9 (±3i), then slide by 2; the roots are a mirror pair.

**Cartesian solution.** z = (4 ± √(16 − 52))/2 = (4 ± √(−36))/2 = (4 ± 6i)/2 = 2 ± 3i. Check: (2 + 3i)² − 4(2 + 3i) + 13 = (−5 + 12i) + (−8 − 12i) + 13 = 0.

**Polar solution.** The discriminant −36 = 36e^{iπ} has principal square root 6e^{iπ/2} = 6i, and its other root is −6i. Completing the square gives (z − 2)² = −9, so z − 2 = ±3i (length 3, angle ±90°). The roots are mirror images across the real axis because the coefficients are real.

**Hand-checked numbers.**

- Discriminant b² − 4ac = 16 − 52 = −36; √(−36) = 6i (principal: 36e^{iπ} has root 6e^{iπ/2}).
- z = (4 ± 6i)/2 = 2 ± 3i. Vieta: sum 4 = −b/a, product (2 + 3i)(2 − 3i) = 4 + 9 = 13 = c/a.
- Check: (2 + 3i)² = 4 − 9 + 12i = −5 + 12i; −4(2 + 3i) = −8 − 12i; −5 + 12i − 8 − 12i + 13 = 0. Completed square: (z − 2)² + 9 = 0 → shift 2, square −9.

**Answer.** `answer.text`: z = (4 +- sqrt(-36))/2 = 2 + 3i or 2 - 3i

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `roots[0]` | 2 + 3i | 2 + 3i |
| `roots[1]` | 2 − 3i | 2 − 3i |
| `completed.shift` | 2 | 2 |
| `completed.square` | −9 | −9 |

#### 1.5.1  Sets of Points in the Complex Plane

Station `curves`; address `C`; thread T3; topics T1.5; kind problem; chapter 1.

- Statement (stored): `Find a parameterization of the line from $2 + i$ to $-3 - 3i$.`
- Which address and why: A straight line is start + t × (end − start): a slide that grows with time, which is pure (x, y) bookkeeping.
- Aha: A slide that grows with time: start + t·(end − start).

**Cartesian solution.** Direction = end − start = (−3 − 3i) − (2 + i) = −5 − 4i. So z(t) = (2 + i) + t(−5 − 4i) = (2 − 5t) + i(1 − 4t) for 0 ≤ t ≤ 1. At t = 1/2 you are at −1/2 − i, the midpoint.

**Polar solution.** The direction −5 − 4i has polar address r = √41 ≈ 6.403 and θ = atan2(−4, −5) ≈ −2.467 rad (−141.3°): walk at speed 6.403 heading −141.3°. The points of the line have no tidy polar addresses; the step does.

**Hand-checked numbers.**

- Direction d = (−3 − 3i) − (2 + i) = −5 −4i. z(0) = 2 + i; z(1/2) = 2 − 2.5 + i(1 − 2) = −0.5 − i (the midpoint of 2 + i and −3 − 3i); z(1) = −3 − 3i.
- |d| = √41 = 6.403124; Arg d = atan2(−4, −5) = −(π − atan(0.8)) = −2.466852 rad = −141.34° (atan 0.8 = 0.674741).
- Reverse (−C): z(1 − t) = (−3 + 5t) + i(−3 + 4t). The same segment, the opposite orientation.

**Answer.** `answer.text`: z(t) = (2 - 5t) + i(1 - 4t), 0 <= t <= 1

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `start` | 2 + i | 2 + 1i |
| `end` | −3 − 3i | −3 − 3i |
| `direction` | −5 − 4i | −5 − 4i |
| `at.t` | 1/2 | 0.5 |
| `at.z` | −1/2 − i | −0.5 − 1i |

#### 1.5.2  Sets of Points in the Complex Plane

Station `sets`; address `P`; thread T1; topics T1.5; kind problem; chapter 1.

- Statement (stored): `Consider $S = \{ z \in \mathbb{C} : 1 < |z + i| \le 3 \}$. Is $S$ open, closed, or neither? Is $S$ bounded? What are the boundary points of $S$? Is $S$ a domain? Why or why not?`
- Which address and why: "1 < |z + i| ≤ 3" is a condition on the distance from −i, so centre the polar picture at −i and the set is a ring.
- Aha: An annulus around −i; the inner circle is left out, the outer circle is kept in; decide each word by looking at a tiny disk.

**Cartesian solution.** S = {1 < x² + (y + 1)² ≤ 9}. That is fine for testing one point, but hard to see as a whole: the picture only appears once you notice the centre (0, −1).

**Polar solution.** Centre at −i and write z = −i + ρe^{iφ}. Then S is 1 < ρ ≤ 3 with φ free: a ring. Not open: a point with ρ = 3 is in S, but every tiny disk around it leaves S. Not closed: the points with ρ = 1 are limits of S but are not in S. Bounded: S sits inside |z + i| ≤ 3. Boundary: both circles. Connected, but not open, so not a domain; it is a region.

**Hand-checked numbers.**

- Centre −i = (0, −1). Test points: −i + 2 = 2 − i has |z + i| = 2, in S (interior). −i + 3 = 3 − i has |z + i| = 3, in S (boundary, kept). −i + 1 = 1 − i has |z + i| = 1, not in S (boundary, left out). 0 has |z + i| = 1, not in S; −i has |z + i| = 0, not in S.
- Open fails: 3 − i ∈ S, but the disk of radius ε around it contains 3 + ε/2 − i with |z + i| > 3, outside S. Closed fails: 1 + 0.0001 − i ∈ S for tiny steps, and these approach 1 − i ∉ S, so S misses an accumulation point. Bounded: |z| ≤ |z + i| + |−i| ≤ 4.
- Connected: any two points are joined by an arc inside the ring. Not open, so not a domain (domain = connected open set). Domain {1 < |z + i| < 3} plus the outer circle = a region.

**Answer.** `answer.text`: neither open nor closed; bounded; boundary = {|z + i| = 1} union {|z + i| = 3}; not a domain (not open); it is a region (connected)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `center` | −i | −1i |
| `inner` | 1 | 1 |
| `outer` | 3 | 3 |
| `innerIncluded` | false | false |
| `outerIncluded` | true | true |
| `open` | false | false |
| `closed` | false | false |
| `bounded` | true | true |
| `connected` | true | true |
| `domain` | false | false |
| `region` | true | true |

#### 2.1.1  Complex Functions and Mappings

Station `mappings`; address `both`; thread T1; topics T2.1; kind problem; chapter 2.

- Statement (stored): `Express $f(z) = z^2 + iz$ in the form $u(x, y) + iv(x, y)$ and $u(r, \theta) + iv(r, \theta)$.`
- Which address and why: The problem asks for the same function in both addresses: expand in (x, y), and write re^{iθ} for the polar version.
- Aha: Expand (x + iy)² + i(x + iy); or r²e^{2iθ} + re^{i(θ + π/2)} because i is a quarter turn.

**Cartesian solution.** (x + iy)² + i(x + iy) = x² − y² + 2ixy + ix − y. The real part is u = x² − y² − y and the imaginary part is v = 2xy + x. Check at 1 + i: u = −1, v = 3.

**Polar solution.** With z = re^{iθ}: z² = r²(cos 2θ + i sin 2θ), and iz = re^{i(θ + π/2)} = r(−sin θ + i cos θ). So u = r² cos 2θ − r sin θ and v = r² sin 2θ + r cos θ. Check at r = √2, θ = π/4: u = −1, v = 3.

**Hand-checked numbers.**

- At z = 1 + i (x = 1, y = 1): z² = 2i, iz = i − 1, sum = −1 + 3i. Formula u = 1 − 1 − 1 = −1; v = 2 + 1 = 3. ✓
- Polar check at r = √2 = 1.414214, θ = π/4: r² = 2, cos 2θ = 0, sin 2θ = 1, r sin θ = r cos θ = 1; u = 2·0 − 1 = −1; v = 2·1 + 1 = 3. ✓
- Second point z = 2: z² + iz = 4 + 2i; u = 4, v = 2 (x = 2, y = 0: u = 4 − 0 − 0, v = 0 + 2). ✓

**Answer.** `answer.text`: u = x^2 - y^2 - y, v = 2xy + x; u = r^2 cos(2 theta) - r sin(theta), v = r^2 sin(2 theta) + r cos(theta)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `check.z` | 1 + i | 1 + 1i |
| `check.w` | −1 + 3i | −1 + 3i |
| `check.u` | −1 | −1 |
| `check.v` | 3 | 3 |

#### 2.1.2  Complex Functions and Mappings

Station `powermap` (also at lab); address `C`; thread T3; topics T2.1; kind problem; chapter 2.

- Statement (stored): `Determine the image of the vertical line $x = 2$ under $w = z^2$. Describe the resulting curve in the $w$-plane.`
- Which address and why: Put z = 2 + iy (y is the clock), square it, and eliminate y: ordinary (x, y) algebra gives the curve.
- Aha: Push the line forward with y as the clock: u = 4 − y², v = 4y; eliminate y.

**Cartesian solution.** z = 2 + iy, so z² = (4 − y²) + 4iy. Then u = 4 − y² and v = 4y. Eliminate y = v/4: u = 4 − v²/16, a parabola with vertex 4 opening left. At y = 1, the point 2 + i goes to 3 + 4i.

**Polar solution.** On x = 2, r = 2 sec θ with θ in (−π/2, π/2). Squaring gives length ρ = 4 sec²θ at angle φ = 2θ, which is ρ(1 + cos φ) = 8. A curve ρ = k/(1 + cos φ), with k a constant, is a parabola with its focus at the origin, so the focus is 0.

**Hand-checked numbers.**

- z = 2 + iy: y = 1 → z² = 3 + 4i; y = 2 → 0 + 8i; y = 0 → 4; y = −1 → 3 − 4i. All satisfy u = 4 − v²/16: 4 − 16/16 = 3; 4 − 64/16 = 0; 4 − 0 = 4; 4 − 16/16 = 3.
- Parabola u − 4 = −v²/16 has 4p = 16, so p = 4, vertex at 4, focus at 4 − 4 = 0.
- Polar: for θ = 0.3, r = 2/cos 0.3 = 2.093503; w = z² has ρ = 4.382756 and φ = 0.6; ρ(1 + cos φ) = 8.000000 = 8. ✓

**Answer.** `answer.text`: parabola u = 4 - v^2/16 (vertex 4, opens left, focus 0)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `parabola.vertex` | 4 | 4 |
| `parabola.coeff` | −1/16 | −0.0625 |
| `parabola.focus` | 0 | 0 |
| `sample.y` | 1 | 1 |
| `sample.z` | 2 + i | 2 + 1i |
| `sample.w` | 3 + 4i | 3 + 4i |

#### 2.1.3  Complex Functions and Mappings

Station `linear` (also at lab); address `both`; thread T1; topics T2.1; kind problem; chapter 2.

- Statement (stored): `Find the image of the line $x = 2$ under $f(z) = iz - 2i$. What does this linear transformation do to the plane in general?`
- Which address and why: The line is easiest in (x, y); what the map does to the whole plane is easiest in polar, because i is just a quarter turn.
- Aha: i(z − 2): slide left 2, quarter turn; the line x = 2 lands on the real axis.

**Cartesian solution.** z = 2 + iy gives iz − 2i = i(2 + iy) − 2i = 2i − y − 2i = −y. So w = −y is real, and every real number is hit. The image is the real axis, v = 0.

**Polar solution.** iz − 2i = i(z − 2): slide left 2, then multiply by i = e^{iπ/2}, which adds 90° to every angle and keeps every length. In general it is a counterclockwise quarter turn about 0 followed by a slide by −2i. Distances and angles between points never change.

**Hand-checked numbers.**

- z = 2 + iy: iz = 2i − y, minus 2i → −y. y = 3 gives −3 (the sample 2 + 3i → −3); y = −2 gives 2; y = 0 gives 0.
- i(z − 2) = iz − 2i. Rotation angle π/2 = 1.570796; shift −2i, i.e. {re: 0, im: −2}.
- Extra fact: iz − 2i = z gives z = −2i/(1 − i) = 1 − i, so the whole map is a quarter turn counterclockwise about the point 1 − i: w − p = i(z − p) with p = 1 − i. Check with z = 2 + 3i: i(2 + 3i − 1 + i) = i(1 + 4i) = −4 + i, and p + (−4 + i) = −3. ✓

**Answer.** `answer.text`: the real axis (v = 0); in general: rotate 90 degrees counterclockwise, then slide by -2i

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `imageLine` | `v = 0` | `v = 0` |
| `rotation` | π/2 | 1.570796327 |
| `shift` | −2i | −2i |
| `sample.z` | 2 + 3i | 2 + 3i |
| `sample.w` | −3 | −3 |

#### 2.2.1  Power and Root Functions

Station `powermap` (also at lab); address `P`; thread T2; topics T2.2; kind problem; chapter 2.

- Statement (stored): `Find the image of the sector $0 < \arg(z) < \pi/4$ under $w = z^3$.`
- Which address and why: zⁿ multiplies every angle by n, so a condition on arg z becomes a condition on arg w with no algebra.
- Aha: zⁿ multiplies the angle by n; the fan opens three times wider.

**Cartesian solution.** z³ = (x³ − 3xy²) + i(3x²y − y³). The edge y = 0 goes to x³, the positive real axis. The edge y = x goes to x³(−2 + 2i), pointing up and left at 135°. The sector between them is filled in, but you only see that after finding the edges.

**Polar solution.** z = re^{iθ} goes to r³e^{i3θ}. Lengths r > 0 reach every length, and angles 0 < θ < π/4 become 0 < 3θ < 3π/4. So the image is the sector 0 < arg w < 3π/4: three times as wide, and it does not overlap itself because 3π/4 < 2π.

**Hand-checked numbers.**

- Edge y = 0: z = x gives x³ > 0, angle 0. Edge y = x: z = x(1 + i), (1 + i)³ = (2i)(1 + i) = −2 + 2i, so w = x³(−2 + 2i), |.| = 2√2 x³, angle 3π/4 = 2.356194.
- Interior check: θ = π/8 (inside 0 < θ < π/4) → 3θ = 3π/8 = 1.178097 (inside 0 < φ < 3π/4). The image of every ray is a ray at three times the angle.
- Overlap rule: the sector of width α maps to width nα = 3 · π/4 = 3π/4 = 2.356194 < 2π = 6.283185, so it does not overlap itself.

**Answer.** `answer.text`: the sector 0 < arg w < 3pi/4

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `sector.from` | 0 | 0 |
| `sector.to` | 3π/4 | 2.35619449 |
| `n` | 3 | 3 |

#### 2.2.2  Power and Root Functions

Station `principal-root`; address `P`; thread T2; topics T2.2; kind problem; chapter 2.

- Statement (stored): `Compute the principal value of the square root of $2i$, i.e. $(2i)^{1/2}$ on the principal branch.`
- Which address and why: Principal roots are defined with Arg: take the square root of the length and halve the home-step angle.
- Aha: |2i| = 2 and Arg(2i) = π/2; take the square root of the length and halve the angle.

**Cartesian solution.** Solve (a + bi)² = 2i: a² − b² = 0 and 2ab = 2, so a = b and a² = 1. Two solutions: 1 + i and −1 − i. The principal one has positive real part: 1 + i.

**Polar solution.** 2i = 2e^{iπ/2} with Arg = π/2 (the home step). Principal root: √2 · e^{i(π/2)/2} = √2 e^{iπ/4} = √2(cos 45° + i sin 45°) = 1 + i. The other root comes from the next step, π/2 + 2π: √2 e^{i5π/4} = −1 − i.

**Hand-checked numbers.**

- |2i| = 2; Arg(2i) = π/2; root length √2 = 1.414214, angle π/4 = 0.785398: √2(cos π/4 + i sin π/4) = √2 · 0.707107 (1 + i) = 1 + i.
- Square check: (1 + i)² = 1 − 1 + 2i = 2i. ✓ The other root −(1 + i) also squares to 2i (it is the step π/2 + 2π, halved: 5π/4).
- Principal root is the one on the home step, Arg(2i)/2 = π/4 ∈ (−π/2, π/2]. The root −1 − i has Arg −3π/4, outside that window.

**Answer.** `answer.text`: (2i)^(1/2) = sqrt(2) e^(i Arg(2i)/2) = sqrt(2) e^(i pi/4) = 1 + i, using Arg(2i) = pi/2 (the other square root is -1 - i)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `root` | 1 + i | 1 + 1i |
| `r` | √2 | 1.414213562 |
| `Arg` | π/4 | 0.785398163 |
| `other` | −1 − i | −1 − 1i |

#### 2.3.1  Limits and Continuity

Station `limits`; address `P`; thread T3; topics T2.3; kind problem; chapter 2.

- Statement (stored): `Find $\lim_{z\to 0} \dfrac{x^2 - y^2 + i2xy}{x^2 + y^2}$ as $z \to 0$ along the curve $y = x^2$.`
- Which address and why: The fraction is z/conj z = e^{2iθ}, which depends only on the angle, so the polar address shows at once that the value depends on the direction of approach.
- Aha: The expression is z/conj z = e^{2iθ}: it remembers only the direction; y = x² arrives tangent to the real axis.

**Cartesian solution.** On y = x² the fraction is (x² − x⁴ + 2ix³)/(x² + x⁴) = (1 − x² + 2ix)/(1 + x²). Let x → 0: it tends to 1. (Along the imaginary axis it is −1, so the full limit does not exist.)

**Polar solution.** The numerator is z² and the denominator is |z|² = z·conj z, so the fraction is z/conj z = e^{2iθ}: only the direction matters. The curve y = x² arrives at 0 tangent to the real axis (θ → 0), so the value tends to e^0 = 1. Along the real axis it is 1; along the imaginary axis θ = π/2 gives e^{iπ} = −1. Different directions, different values, so the limit at 0 does not exist.

**Hand-checked numbers.**

- Along y = x² (x = 0.001): (1 − 10⁻⁶ + 0.002i)/(1 + 10⁻⁶) = 0.999998 + 0.002i, which is near 1. At x = −0.001 it is 0.999998 − 0.002i, also near 1.
- Along y = mx: (1 − m² + 2im)/(1 + m²) = e^{2i atan m}. m = 0 → 1; m = 1 → i (e^{iπ/2}); m = −1 → −i; the imaginary axis (m → ∞) → −1.
- Since the directional values 1, i, −1, −i, ... run over the whole unit circle (centre 0, radius 1), the limit at 0 does not exist.

**Answer.** `answer.text`: 1 along y = x^2 (the full limit at 0 does not exist)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `alongParabola` | 1 | 1 |
| `alongRealAxis` | 1 | 1 |
| `alongImagAxis` | −1 | −1 |
| `exists` | false | false |

#### 2.4.1  Multiple-Valued Functions and Branches

Station `branches`; address `P`; thread T2; topics T2.4; kind problem; chapter 2.

- Statement (stored): `Find a branch of the cube root of $z$ that is continuous along the negative $x$-axis.`
- Which address and why: A branch is a choice of window for the angle. That is a statement about polar angles, and the seam of the window is where the value jumps.
- Aha: Choose a window of steps whose seam is not the negative real axis.

**Cartesian solution.** In (x, y) the cube root has no short formula: the angle needs arctan and a case split on the signs of x and y, which is a window in disguise.

**Polar solution.** Write z = re^{iθ} and pick the window 0 < θ < 2π (seam on the positive real axis). Define f(z) = r^(1/3) e^{iθ/3}. The negative real axis is θ = π, in the middle of the window, so f is continuous there: f(−1) = e^{iπ/3} = 1/2 + (√3/2)i. The principal branch (−π < θ ≤ π) jumps from e^{iπ/3} to e^{−iπ/3} across that axis.

**Hand-checked numbers.**

- Window (0, 2π] on the seam σ = 0. z = −1 has r = 1, θ = π (inside the window). f(−1) = e^{iπ/3} = cos 60° + i sin 60° = 0.5 + 0.866025i; cubed: e^{iπ} = −1. ✓
- Continuity across the negative axis (seam 0): z = −1 + 0.000001i → θ slightly below π; z = −1 − 0.000001i → θ slightly above π; both give about e^{iπ/3} (difference < 1e-5).
- Principal branch (seam −π): above the axis θ ≈ +π → e^{iπ/3} = 0.5 + 0.866i; below the axis θ ≈ −π → e^{−iπ/3} = 0.5 − 0.866i. The jump has size √3 = 1.732051.

**Answer.** `answer.text`: f(z) = r^(1/3) e^(i theta/3), with theta the name of arg z chosen in 0 < theta < 2pi (cut on the positive real axis); f(-1) = e^(i pi/3) = 1/2 + (sqrt(3)/2) i

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `seam` | 0 | 0 |
| `window[0]` | 0 | 0 |
| `window[1]` | 2π | 6.283185307 |
| `atMinusOne` | 1/2 + (√3/2)i | 0.5 + 0.866025404i |
| `principalJumps` | true | true |

#### 2.5.1  The Reciprocal Transformation and Extended Complex Plane

Station `reciprocal` (also at lab); address `P`; thread T1; topics T2.5; kind problem; chapter 2.

- Statement (stored): `Find the image of the circle $|z - 1| = 1$ under $w = 1/z$.`
- Which address and why: On the circle z = 2cos θ e^{iθ}, and 1/z just inverts the length and negates the angle, so polar turns the circle into a line in one line of algebra.
- Aha: z = 2cos θ e^{iθ} on the circle, so 1/z = ½ − (i/2)tan θ; 0 goes to ∞ so the circle must open into a line.

**Cartesian solution.** w = 1/z = (x − iy)/(x² + y²). On the circle x² + y² = 2x, so u = x/(2x) = 1/2 for every point except z = 0, while v = −y/(2x) takes every real value. The image is the vertical line Re w = 1/2. At 1 + i the image is 1/2 − i/2.

**Polar solution.** The circle is r = 2cos θ for −π/2 < θ < π/2. Under 1/z, length r goes to 1/r and angle θ goes to −θ: w = e^{−iθ}/(2cos θ) = 1/2 − (i/2)tan θ. The real part is stuck at 1/2 while tan θ sweeps all real numbers. The circle passes through 0, which goes to ∞, so the circle opens into a line.

**Hand-checked numbers.**

- z = 1 + i: |z − 1| = |i| = 1 ✓; 1/z = (1 − i)/2 = 0.5 − 0.5i; Re = 0.5 ✓.
- Polar: θ = 0.4 gives z = 2cos(0.4)e^{0.4i} = 1.696707 + 0.717356i; 1/z = 0.500000 − 0.211397i; −(1/2)tan 0.4 = −0.211397. Re = 0.5 ✓.
- z = 2 (the far point of the circle) gives 1/2. z = 0 is on the circle and goes to ∞, so leave it out of any plot: the image is the whole line Re w = 1/2, and ∞ is the extra point that closes the line into a generalized circle.

**Answer.** `answer.text`: the line Re w = 1/2

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `imageLine` | `Re w = 1/2` | `Re w = 1/2` |
| `re` | 1/2 | 0.5 |
| `sample.z` | 1 + i | 1 + 1i |
| `sample.w` | 1/2 − (1/2)i | 0.5 − 0.5i |

#### 3.1.1  Derivatives of Complex Functions

Station `derivative`; address `C`; thread T3; topics T3.1; kind problem; chapter 3.

- Statement (stored): `Use the limit definition of the derivative to show $f(z) = z^2 + z$ is differentiable everywhere and find $f'(z)$.`
- Which address and why: Expanding (z + h)² is algebra in z and h; no direction is needed, which is why the answer does not depend on one.
- Aha: The quotient is 2z + 1 + Δz, no direction in sight.

**Cartesian solution.** (f(z + h) − f(z))/h = ((z + h)² + (z + h) − z² − z)/h = (2zh + h² + h)/h = 2z + 1 + h. Let h → 0 along any path: the limit is 2z + 1. At z = 1 + i, f′ = 3 + 2i.

**Polar solution.** Write h = ρe^{iφ}. The quotient is 2z + 1 + ρe^{iφ}: a small circle of radius ρ around 2z + 1. As ρ → 0 the circle shrinks to the point 2z + 1 whatever φ is, so every direction agrees and f is differentiable everywhere.

**Hand-checked numbers.**

- f(z + h) − f(z) = 2zh + h² + h, so the quotient is 2z + 1 + h. At z = 1 + i: 2(1 + i) + 1 = 3 + 2i.
- Numeric check with h = 10⁻⁷e^{iφ} for φ = 0, 1, 2, 3: the quotient differs from 2z + 1 + h by < 10⁻⁶. Direction does not matter.
- In A/B terms (A = f′, B = the coefficient of the mirrored part): A = 2z + 1, |B| = 0.

**Answer.** `answer.text`: f'(z) = 2z + 1, for every z

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `derivativeAt.z` | 1 + i | 1 + 1i |
| `derivativeAt.fprime` | 3 + 2i | 3 + 2i |
| `A` | `2z + 1` | `2z + 1` |
| `Babs` | 0 | 0 |

#### 3.1.2  Derivatives of Complex Functions

Station `derivative`; address `P`; thread T3; topics T3.1; kind problem; chapter 3.

- Statement (stored): `Let $f(z) = |z|^2$. Show $f$ is differentiable only at $z = 0$, and thus nowhere analytic.`
- Which address and why: With h = ρe^{iφ} the direction of approach is the variable φ, and how the quotient depends on φ is exactly what shows f is not differentiable.
- Aha: The quotient tends to conj z + z e^{−2iφ}: a circle of radius |z|, a point only at 0.

**Cartesian solution.** The quotient is ((z + h)(conj z + conj h) − z conj z)/h = conj z + z·(conj h/h) + conj h. For real h, conj h/h = 1 and the limit is conj z + z = 2x. For imaginary h, conj h/h = −1 and the limit is conj z − z = −2iy. They agree only when 2x = −2iy, that is, x = y = 0.

**Polar solution.** With h = ρe^{iφ}, conj h/h = e^{−2iφ}, so the quotient tends to conj z + z e^{−2iφ}. As φ goes round, that traces a circle with centre conj z and radius |z|, which is a single point only when |z| = 0. So f is differentiable only at z = 0, with f′(0) = 0. It is analytic nowhere, because analytic needs a whole disk of differentiable points.

**Hand-checked numbers.**

- At z = 1 + i, h = ρe^{iφ}: the quotient is 1 − i + (1 + i)e^{−2iφ} + ρe^{−iφ}. As ρ → 0 it lies on the circle with centre 1 − i and radius |1 + i| = √2 = 1.414214.
- Axis directions: φ = 0 gives 1 − i + 1 + i = 2 (= 2x, x = 1); φ = π/2 gives 1 − i − (1 + i) = −2i (= −2iy, y = 1). 2 ≠ −2i, so no single limit at 1 + i.
- At z = 0: the quotient is conj h → 0 for every direction. So f′(0) = 0.

**Answer.** `answer.text`: differentiable only at z = 0 (f'(0) = 0); nowhere analytic

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `differentiableAt` | 0 | 0 |
| `fprime0` | 0 | 0 |
| `circleRadiusAt.z` | 1 + i | 1 + 1i |
| `circleRadiusAt.radius` | √2 | 1.414213562 |
| `circleRadiusAt.center` | 1 − i | 1 − 1i |

#### 3.2.1  The Cauchy–Riemann Equations

Station `cauchy-riemann`; address `C`; thread T3; topics T3.2; kind problem; chapter 3.

- Statement (stored): `Given $f(z) = e^x(\cos y + i\sin y)$, use the Cauchy–Riemann equations to verify $f$ is entire. Then compute $f'(z)$.`
- Which address and why: u = e^x cos y and v = e^x sin y: each partial derivative is one line in (x, y), and the Cauchy–Riemann equations are stated in (x, y).
- Aha: u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere: no mirror part.

**Cartesian solution.** u = e^x cos y and v = e^x sin y. Then u_x = e^x cos y = v_y and u_y = −e^x sin y = −v_x. Both equations hold at every point and the partials are continuous, so f is entire. f′ = u_x + i v_x = e^x cos y + i e^x sin y = f(z).

**Polar solution.** Read the output in polar: |f| = e^x and arg f = y, so the Cartesian address of z becomes the polar address of w. Cauchy–Riemann says the same for log f: ∂(ln|f|)/∂x = ∂(arg f)/∂y, which is 1 = 1, and ∂(ln|f|)/∂y = −∂(arg f)/∂x, which is 0 = 0. So f′ = f, and at 0 it equals 1.

**Hand-checked numbers.**

- z = 0.5 + 0.8i: u = e^0.5 cos 0.8 = 1.148675; v = e^0.5 sin 0.8 = 1.182720; so f′ = f = 1.148675 + 1.182720i. (The Cauchy–Riemann station quotes 1.149 + 1.183i.)
- CR numerically at that point: u_x = 1.148675 = v_y; u_y = −1.182720 = −v_x. Both residuals are below 10⁻⁶.
- z = iπ/2: f = e^0(cos π/2 + i sin π/2) = i. f′(0) = e^0 = 1 (the problem’s check: values {fprimeAt0: 1}, {check.w: i}).

**Answer.** `answer.text`: entire; f'(z) = e^x cos y + i e^x sin y = f(z)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `entire` | true | true |
| `fprimeAt0` | 1 | 1 |
| `check.z` | (π/2)i | 1.570796327i |
| `check.w` | i | 1i |

#### P1  Proof Examples

Station `arithmetic`; address `both`; thread T1; topics T1.1; kind proof; chapter 0.

- Statement (stored): `Show that $\overline{z_1}\cdot\overline{z_2} = \overline{z_1z_2}$.`
- Which address and why: Either works: expand both sides in (x, y), or note that a mirror negates angles, which is one line in polar.
- Aha: Mirror negates angles, and −θ₁ − θ₂ = −(θ₁ + θ₂); in C, expand both sides.

**Cartesian solution.** With z₁ = x₁ + iy₁ and z₂ = x₂ + iy₂: conj z₁ · conj z₂ = (x₁ − iy₁)(x₂ − iy₂) = (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁). And z₁z₂ = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁), whose conjugate is the same number. Equal.

**Polar solution.** Write z₁ = r₁e^{iθ₁} and z₂ = r₂e^{iθ₂}, so conj z₁ = r₁e^{−iθ₁} and conj z₂ = r₂e^{−iθ₂}. Then conj z₁ · conj z₂ = r₁r₂e^{−i(θ₁ + θ₂)}, which is the conjugate of z₁z₂ = r₁r₂e^{i(θ₁ + θ₂)}. Equal.

**Hand-checked numbers.**

- z₁ = 3 − 2i, z₂ = −1 + 4i: z₁z₂ = 5 + 14i, so conj(z₁z₂) = 5 − 14i. conj z₁ · conj z₂ = (3 + 2i)(−1 − 4i) = −3 − 12i − 2i − 8i² = 5 − 14i. Equal. ✓
- Angles: Arg z₁ = −0.588003, Arg z₂ = 1.815775; the mirrors have 0.588003 and −1.815775; their sum −1.227772 is the negative of Arg(z₁z₂) = 1.227772.

**Answer.** `answer.text`: conj(z1) conj(z2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1) = conj(z1 z2)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `check.z1` | 3 − 2i | 3 − 2i |
| `check.z2` | −1 + 4i | −1 + 4i |
| `check.both` | 5 − 14i | 5 − 14i |

#### P2  Proof Examples

Station `arithmetic`; address `P`; thread T1; topics T1.1, T1.3; kind proof; chapter 0.

- Statement (stored): `Show that $|z| = \sqrt{z\cdot\overline{z}}$.`
- Which address and why: z·conj z is a spin followed by an unspin, and in polar the spins cancel and leave only the length squared.
- Aha: Spin and unspin cancel: re^{iθ}·re^{−iθ} = r².

**Cartesian solution.** z·conj z = (x + iy)(x − iy) = x² − ixy + ixy + y² = x² + y² (the cross terms cancel). So √(z·conj z) = √(x² + y²) = |z|. Example: z = 3 − 2i gives 9 + 4 = 13.

**Polar solution.** z·conj z = re^{iθ}·re^{−iθ} = r²e^0 = r². Since r ≥ 0, √(r²) = r = |z|.

**Hand-checked numbers.**

- z = 3 − 2i: z · conj z = (3 − 2i)(3 + 2i) = 9 + 4 = 13; √13 = 3.605551 = |z|.
- Polar: r = √13 = 3.605551, Arg = −0.588003; r·r·e^{i(θ − θ)} = 13.

**Answer.** `answer.text`: z conj(z) = x^2 + y^2 = |z|^2, so |z| = sqrt(z conj(z)); for z = 3 - 2i that is sqrt(13)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `check.z` | 3 − 2i | 3 − 2i |
| `check.zzbar` | 13 | 13 |
| `check.abs` | √13 | 3.605551275 |

#### P3  Proof Examples

Station `linear`; address `C`; thread T3; topics T2.1; kind proof; chapter 0.

- Statement (stored): `Prove that the composition of two linear transformations is a linear transformation.`
- Which address and why: A linear map is az + b, and composing two of them is substitution, which is plain algebra in a, b, c, d.
- Aha: a(cz + d) + b = (ac)z + (ad + b): spins add, stretches multiply.

**Cartesian solution.** Let T₁(z) = az + b and T₂(z) = cz + d with a, c ≠ 0. Then T₁(T₂(z)) = a(cz + d) + b = (ac)z + (ad + b). That has the form Az + B with A = ac ≠ 0 and B = ad + b, so it is linear.

**Polar solution.** Write a = |a|e^{iα} and c = |c|e^{iγ}. The coefficient ac = |a||c|e^{i(α + γ)}: the stretches multiply and the spins add. The shift ad + b is d spun and stretched by a, then slid by b. Example a = i, c = 1 + i: ac = √2 e^{i3π/4} = −1 + i.

**Hand-checked numbers.**

- a = i, b = −2i, c = 1 + i, d = 1: ac = i(1 + i) = i + i² = −1 + i; ad + b = i − 2i = −i.
- Compose at z = 1: T₂(1) = (1 + i) + 1 = 2 + i; T₁(2 + i) = i(2 + i) − 2i = 2i − 1 − 2i = −1. Direct: (−1 + i)(1) + (−i) = −1. ✓
- Polar: |a| = 1, Arg a = π/2; |c| = √2, Arg c = π/4; |ac| = √2 = 1.414214, Arg(ac) = 3π/4 = 2.356194; √2e^{i3π/4} = −1 + i. ✓

**Answer.** `answer.text`: a(cz + d) + b = (ac) z + (ad + b): linear with coefficient ac and shift ad + b

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `check.a` | i | 1i |
| `check.b` | −2i | −2i |
| `check.c` | 1 + i | 1 + 1i |
| `check.d` | 1 | 1 |
| `check.coeff` | −1 + i | −1 + 1i |
| `check.shift` | −i | −1i |

#### P4  Proof Examples

Station `linear` (also at lab); address `P`; thread T1; topics T2.1; kind proof; chapter 0.

- Statement (stored): `Show that the image of the circle of radius $1$ centered at $0$ under $f(z) = (1 + i)z$ is the circle of radius $\sqrt{2}$ centered at $0$.`
- Which address and why: 1 + i is a spin by 45° and a stretch by √2, so (1 + i)z carries every point of the unit circle to the circle of radius √2.
- Aha: 1 + i = √2e^{iπ/4}: stretch by √2, spin 45°; and every point of the big circle is hit.

**Cartesian solution.** w = (1 + i)(x + iy) = (x − y) + i(x + y). Then |w|² = (x − y)² + (x + y)² = 2x² + 2y² = 2 when x² + y² = 1, so |w| = √2. Every w with |w| = √2 comes from z = w/(1 + i), which has |z| = 1, so the whole circle is covered.

**Polar solution.** 1 + i = √2e^{iπ/4}. For z = e^{it}, w = √2e^{i(t + π/4)}: the length is always √2, and the angle t + π/4 goes once around as t does. So the image is the entire circle |w| = √2.

**Hand-checked numbers.**

- 1 + i = √2e^{iπ/4}: |1 + i| = 1.414214, Arg = 0.785398. Sample: z = 0.6 + 0.8i (|z| = 1) → (1 + i)z = −0.2 + 1.4i; |−0.2 + 1.4i| = √(0.04 + 1.96) = √2. ✓
- Onto: w = √2e^{iα} comes from z = w/(1 + i) = e^{i(α − π/4)}, which has |z| = 1. Every point of the big circle is hit.

**Answer.** `answer.text`: (1 + i) = sqrt(2) e^(i pi/4): w = sqrt(2) e^(i(t + pi/4)) covers the whole circle |w| = sqrt(2)

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `radius` | √2 | 1.414213562 |
| `factor` | 1 + i | 1 + 1i |
| `factorAbs` | √2 | 1.414213562 |
| `factorArg` | π/4 | 0.785398163 |

#### P5  Proof Examples

Station `limits`; address `P`; thread T3; topics T2.3; kind proof; chapter 0.

- Statement (stored): `Show that $\lim_{z\to 0} \dfrac{\operatorname{Re}(1 + z) - 1}{z}$ does not exist.`
- Which address and why: With z = re^{iθ} the fraction depends only on θ, so different directions visibly give different values.
- Aha: x/z = cos θ e^{−iθ} depends on direction: 1 along the real axis, 0 along the imaginary axis.

**Cartesian solution.** Re(1 + z) − 1 = x, so the fraction is x/z. Along the real axis z = x: x/x = 1. Along the imaginary axis z = iy: 0/(iy) = 0. Two paths, two values: the limit does not exist.

**Polar solution.** x/z = r cos θ/(re^{iθ}) = cos θ e^{−iθ} = 1/2 + (1/2)e^{−2iθ}. The size r cancels, so only the direction θ is left. θ = 0 gives 1 and θ = π/2 gives 0; all directions together trace the circle with centre 1/2 and radius 1/2 through 0 and 1.

**Hand-checked numbers.**

- Near 0 along the real axis (z = 0.001): x/z = 1; along the imaginary axis (z = 0.001i): 0/(0.001i) = 0. Along 45° (z = 0.001(1 + i)): 0.001/(0.001(1 + i)) = 1/(1 + i) = 0.5 − 0.5i, which is cos 45° e^{−i45°} = 0.707107 · (0.707107 − 0.707107i) = 0.5 − 0.5i. ✓
- All directions: 1/2 + (1/2)e^{−2iθ} is a circle of centre 0.5 and radius 0.5 (A = B = 1/2), through 1 (θ = 0) and 0 (θ = π/2).

**Answer.** `answer.text`: x/z -> 1 along the real axis and 0 along the imaginary axis, so the limit does not exist

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `alongRealAxis` | 1 | 1 |
| `alongImagAxis` | 0 | 0 |
| `exists` | false | false |
| `directional.A` | 1/2 | 0.5 |
| `directional.B` | 1/2 | 0.5 |

#### P6  Proof Examples

Station `derivative`; address `both`; thread T3; topics T3.1; kind proof; chapter 0.

- Statement (stored): `Show that $f(z) = \operatorname{Re}(z)$ is not differentiable.`
- Which address and why: Either the Cauchy–Riemann test in (x, y) or the direction picture in polar kills it in one line.
- Aha: Same quotient as P5 at every point; or CR: u_x = 1 ≠ 0 = v_y; or: Re is a squash, not a spin-and-stretch.

**Cartesian solution.** The quotient is (Re(z + h) − Re z)/h = Re(h)/h. For real h it is 1; for imaginary h it is 0. Two limits, so there is no derivative at any z. In Cauchy–Riemann form: u = x and v = 0 give u_x = 1 but v_y = 0, so u_x ≠ v_y.

**Polar solution.** With h = ρe^{iφ} the quotient is cos φ e^{−iφ} = 1/2 + (1/2)e^{−2iφ} = A + Be^{−2iφ} with A = B = 1/2: a circle of directions, not a point. Geometrically Re squashes the whole plane flat onto the real axis, and a spin-and-stretch never flattens.

**Hand-checked numbers.**

- Same circle as P5: for f(z) = Re z, the directional quotient is Re(h)/h = cos φ e^{−iφ} = 1/2 + (1/2)e^{−2iφ}; A = ½(f_x − i f_y) = ½(1 − 0) = 0.5 and B = ½(f_x + i f_y) = 0.5.
- CR: u = x, v = 0: u_x = 1, v_y = 0 (1 ≠ 0); u_y = 0 = −v_x. The first equation fails at every point, so f is differentiable nowhere.

**Answer.** `answer.text`: (Re(z + h) - Re z)/h = Re(h)/h is 1 for real h and 0 for imaginary h, so f is differentiable nowhere

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `A` | 1/2 | 0.5 |
| `B` | 1/2 | 0.5 |
| `differentiable` | false | false |

#### P7  Proof Examples

Station `cauchy-riemann`; address `C`; thread T3; topics T3.2; kind proof; chapter 0.

- Statement (stored): `Suppose $f = u + iv$ is entire and $u(x, y) = c$ (a real constant) everywhere. Use Cauchy–Riemann to prove $f$ is constant.`
- Which address and why: Cauchy–Riemann is a pair of equations about partial derivatives in (x, y), and with u constant they collapse to zero at once.
- Aha: u_x = u_y = 0, so CR forces v_x = v_y = 0, so f′ = 0 and f is constant.

**Cartesian solution.** u ≡ c gives u_x = u_y = 0. Cauchy–Riemann then gives v_y = u_x = 0 and v_x = −u_y = 0. So f′ = u_x + i v_x = 0 everywhere on the plane, which is a domain, and therefore f is constant: f ≡ c + i·(a constant).

**Polar solution.** If f′(z₀) = ρe^{iα} were not 0, then near z₀ the map would spin by α and stretch by ρ, sending a small disk onto a small two-dimensional blob. But u ≡ c puts every image on the vertical line Re w = c, and a line cannot hold a blob. So f′ = 0 everywhere and f is constant.

**Hand-checked numbers.**

- u ≡ c: u_x = 0 and u_y = 0 everywhere. CR: v_y = u_x = 0, v_x = −u_y = 0. f′ = u_x + iv_x = 0 + 0i.
- f′ ≡ 0 on the whole plane (a domain, connected and open) gives f constant (Thm 3.2.13). Example: f(z) = 3 + 5i has u = 3, f′ = 0.

**Answer.** `answer.text`: u = c gives u_x = u_y = 0; CR gives v_y = v_x = 0; so f' = 0 and f is constant

**Expected `answer.values`:**

| key | exact | decimal |
|---|---|---|
| `fprime` | 0 | 0 |
| `constant` | true | true |


### 6.3 The function catalogue

Each row's `u`, `v` and `f′` strings are in Appendix B and are **evaluated numerically** by the test against a reference implementation (not just compared as text). Cauchy–Riemann check (why `analytic` is what it is):

| id | f(z) | u, v in (x, y) | u, v in (r, θ) | f′ | analytic | Cauchy–Riemann |
|---|---|---|---|---|---|---|
| `sq` | `z^2` (`z^2`) | `x^2 - y^2`, `2xy` | `r^2\cos 2\theta`, `r^2\sin 2\theta` | `2z` | true | u_x = 2x = v_y; u_y = −2y = −v_x |
| `cube` | `z^3` (`z^3`) | `x^3 - 3xy^2`, `3x^2y - y^3` | `r^3\cos 3\theta`, `r^3\sin 3\theta` | `3z^2` | true | u_x = 3x² − 3y² = v_y; u_y = −6xy = −v_x |
| `recip` | `\dfrac{1}{z}` (`1/z`) | `\dfrac{x}{x^2 + y^2}`, `-\dfrac{y}{x^2 + y^2}` | `\dfrac{\cos\theta}{r}`, `-\dfrac{\sin\theta}{r}` | `-\dfrac{1}{z^2}` | true | holds for z ≠ 0 (f′ = −1/z²); pole at 0 |
| `linear-i` | `iz - 2i` (`iz - 2i`) | `-y`, `x - 2` | `-r\sin\theta`, `r\cos\theta - 2` | `i` | true | u_x = 0 = v_y; u_y = −1 = −v_x; f′ = u_x + iv_x = i |
| `linear-1i` | `(1 + i)z` (`(1+i)z`) | `x - y`, `x + y` | `\sqrt{2}\,r\cos\left(\theta + \tfrac{\pi}{4}\right)`, `\sqrt{2}\,r\sin\left(\theta + \tfrac{\pi}{4}\right)` | `1 + i` | true | u_x = 1 = v_y; u_y = −1 = −v_x; f′ = 1 + i |
| `sq-plus-iz` | `z^2 + iz` (`z^2 + iz`) | `x^2 - y^2 - y`, `2xy + x` | `r^2\cos 2\theta - r\sin\theta`, `r^2\sin 2\theta + r\cos\theta` | `2z + i` | true | u_x = 2x = v_y; u_y = −2y − 1 = −v_x; f′ = 2x + i(2y + 1) = 2z + i |
| `sq-plus-z` | `z^2 + z` (`z^2 + z`) | `x^2 - y^2 + x`, `2xy + y` | `r^2\cos 2\theta + r\cos\theta`, `r^2\sin 2\theta + r\sin\theta` | `2z + 1` | true | u_x = 2x + 1 = v_y; u_y = −2y = −v_x; f′ = 2z + 1 |
| `exp` | `e^{z}` (`exp(z)`) | `e^{x}\cos y`, `e^{x}\sin y` | `e^{r\cos\theta}\cos(r\sin\theta)`, `e^{r\cos\theta}\sin(r\sin\theta)` | `e^{z}` | true | u_x = e^x cos y = v_y; u_y = −e^x sin y = −v_x; f′ = f |
| `conj` | `\overline{z}` (`conj(z)`) | `x`, `-y` | `r\cos\theta`, `-r\sin\theta` | (none) | false | u_x = 1 but v_y = −1: fails at every point |
| `re` | `\operatorname{Re}(z)` (`Re(z)`) | `x`, `0` | `r\cos\theta`, `0` | (none) | false | u_x = 1 but v_y = 0: fails at every point |
| `abs2` | `\|z\|^2` (`abs(z)^2`) | `x^2 + y^2`, `0` | `r^2`, `0` | (none) | false | u_x = 2x vs v_y = 0 and u_y = 2y vs −v_x = 0: both hold only at 0, so differentiable only at 0, analytic nowhere |
| `dir` | `\dfrac{z^2}{\|z\|^2}` (`z^2/abs(z)^2`) | `\dfrac{x^2 - y^2}{x^2 + y^2}`, `\dfrac{2xy}{x^2 + y^2}` | `\cos 2\theta`, `\sin 2\theta` | (none) | false | f = e^{2iθ}: \|f\| = 1 but f is not constant, so not analytic (Thm 3.2.12); not defined at 0 |
| `sqrt` | `\sqrt{z}` (`sqrt(z)`) | (none) | `\sqrt{r}\cos\dfrac{\theta}{2}`, `\sqrt{r}\sin\dfrac{\theta}{2}` | `\dfrac{1}{2\sqrt{z}}` | true | analytic off the cut (the negative real axis); f′ = 1/(2√z) there |
| `cbrt` | `z^{1/3}` (`z^(1/3)`) | (none) | `r^{1/3}\cos\dfrac{\theta}{3}`, `r^{1/3}\sin\dfrac{\theta}{3}` | `\dfrac{1}{3}z^{-2/3}` | true | analytic off the cut; f′ = (1/3)z^(−2/3) there |
| `x-over-z` | `\dfrac{\operatorname{Re}(1 + z) - 1}{z}` (`(Re(1+z) - 1)/z`) | `\dfrac{x^2}{x^2 + y^2}`, `-\dfrac{xy}{x^2 + y^2}` | `\cos^2\theta`, `-\cos\theta\sin\theta` | (none) | false | x/z = cos θ e^{−iθ}; CR fails at z = 0.7 + 0.4i (the test checks it); no limit at 0 |

Notes: `sqrt` and `cbrt` have no short Cartesian form (`cart: null`): the angle must be divided, which is a polar operation, and that is the point of the polar address. For `dir` the point 0 is not a pole in the complex-analysis sense (there is no limit there); it is listed in `poles` so the plots break there, as in ARCHITECTURE. `dir` has constant modulus 1 and is not constant, so by Thm 3.2.12 it cannot be analytic on any domain.

### 6.4 How the numbers were checked

1. Derived by hand in both addresses (section 6.2).
2. Recomputed with Python `cmath` in a separate script (86 reported checks, several of them loops: every product, quotient, root, power, image point, directional limit, branch value, CR partials by central differences).
3. Encoded in `tests/unit/i1-data.test.mjs` with `Math` only, with independent re-derivations where cheap (for example `1.4.2`: each root squared twice is −16; `2.1.2`: the parabola equation and its focus from `4p = 16`).
4. Every decimal printed in the copy is in an allow-list with its exact value and is checked to be correctly rounded.
5. A bug found by this process while writing the design: an early draft said the fixed point of `iz − 2i` is `−1 − i`; recomputation gave `1 − i` (now stated correctly in the 2.1.3 numbers).

## 7. Verification plan

### 7.1 Commands (run from the repo root)

```
node --test tests/unit/i1-data.test.mjs
```

Expected: `# tests 30`, `# fail 0`, `# pass 30`. If `js/core/parse.js` does not exist yet, one test (the parser cross-check) is reported as skipped: `# pass 29`, `# skipped 1`, still `# fail 0`.
`npm test` currently fails on Node 22.22 for a reason outside this goal (section 0.4, item 1); once the script is fixed it runs this file with the others.

Browser check. The goal has no route, so the script runs on a route of any station. **Do not create or edit `index.html`** (goal `i1-shell` owns it). While the station modules do not exist yet, the real harness fails every route for the missing station (a 404 on `js/stations/<id>.js` and the shell's under-construction panel) even though this script passes: it still logs `i1-data: ... 0 errors` (checked against the real shell, whose deferred classic KaTeX script is loaded by the time the script runs). That failure belongs to the missing station, not to this goal. To get a clean pass, run the script from a throwaway copy outside the repo; the harness serves the directory above `tools/`:

```
T=$(mktemp -d)
mkdir -p "$T/tools" "$T/tests/interact" "$T/js"
cp tools/smoke.mjs "$T/tools/"
cp tests/interact/i1-data.mjs "$T/tests/interact/"
cp -r js/data "$T/js/"
ln -s "$PWD/vendor" "$T/vendor"
printf '%s' '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>host</title><script src="vendor/katex/katex.min.js"></script></head><body><main id="view"><p>host page</p></main></body></html>' > "$T/index.html"
(cd "$T" && node tools/smoke.mjs --route problems --script tests/interact/i1-data.mjs --out shots)
```

Expected output: two lines `i1-data: 29 problems, 12 topics, 15 functions, 175 TeX strings rendered, 0 cards on screen, 0 errors`, then `ok   problems (desktop)`, `ok   problems (phone)` and `2/2 checks passed across 1 route(s).` Exit code 0.

Once the shell and the Problem Index exist (integration, Review B), the repo command is:

```
node tools/smoke.mjs --route problems --script tests/interact/i1-data.mjs
```

and the log line then also reports the card count; every `data-problem` on the page must be one of the 29 ids.

### 7.2 Acceptance criteria to test names

| Id | Statement (from the goal) | Method | What proves it |
|---|---|---|---|
| A1 | Every problem and topic is present and consistent with the registry | unit test | `node --test tests/unit/i1-data.test.mjs`: tests 1, 2, 3, 4, 5, 6, 7, 8, 9 in the list below. Literal items of the criterion: 29 ids equal to ASSIGNMENT; 12 topics; per problem `station === stationForProblem(id).id`, `statement.length > 20`, `aha.length > 10`, address in the six codes; every topic station exists and lists the topic; `routeFor("1.4.2") === "problem-1-4-2"`, `routeFor("P3") === "problem-P3"`, `idFromRoute("problem-1-4-2") === "1.4.2"`, `idFromRoute("problem-P3") === "P3"`, `idFromRoute("roots") === null`, `topicRoute("T1.4") === "topic-T1-4"`, `topicFromRoute("topic-T1-4") === "T1.4"`. |
| A2 | The numeric answer values are the hand-checked ones | unit test | tests 10, 11 in the list below plus the decimal allow-list test (test 23). Every value of section 6.2 with `Math` only, 1e-9 (1e-6 for 1.3.2 `result`). |
| A3 | The function catalogue has the 15 required entries | unit test | tests 12, 13, 14, 15, 16, 17, 18, 19 in the list below. Ids exactly the 15, src strings equal ARCHITECTURE 3.4 (whitespace-insensitive), `analytic` false exactly for `conj re abs2 dir x-over-z`, poles `{0,0}` for `recip dir x-over-z`, `fnById('recip').problems` has `2.5.1`, `fnById('sq').cart` equals `{u:'x^2 - y^2', v:'2xy'}`; the TeX strings themselves are evaluated numerically. |
| A4 | Pure data; statements verbatim; ahas match the story | code inspection | Automated by tests 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 in the list below. Plus section 7.5 (read the two files once). |

Test names in `tests/unit/i1-data.test.mjs` (30):

1. A1: exactly the 29 handout problems, in handout order, matching ASSIGNMENT.md
2. A1: exactly the 12 topics, in syllabus order
3. A1: every problem has the required fields and agrees with the registry
4. A1: each problem is tagged with the syllabus topics the design chose
5. A1: the Problem Index filters give 11 / 8 / 3 numbered problems and 7 proofs
6. A1: every topic exists in the registry with the right stations and at least one problem
7. A1: routes round-trip and reject everything else
8. A1: lookups
9. A1: address helpers
10. A2: every problem has a value checker, and the checker passes
11. A2: spot values from the acceptance criterion, stated literally
12. A3: the catalogue has the 15 required entries with the architecture sources
13. A3: field shapes, references and copy
14. A3: evalTex itself is right (known strings, known values)
15. A3: tex, cart and polar strings evaluate to the reference function at sample points
16. A3: derivativeTex agrees with a central difference (analytic entries, off the cut)
17. A3: the non-analytic entries really fail Cauchy-Riemann at a sample point (or, for dir and x-over-z, are direction-dependent)
18. A3: functions.js agrees with the expressions printed in the problems
19. A3: compile(src) from parse.js matches the reference functions (a failure here means parse.js or a src string is wrong)
20. A4: both files are pure data (no imports, no DOM, no network, no storage)
21. A4: the exported data is frozen, and the exports match the design
22. A4: statements are the handout wording (prose words match docs/ASSIGNMENT.md) and the maths is in $...$ pairs
23. A4: every decimal in the copy is a checked value, correctly rounded
24. A4: the 2.1.1 answer repeats the sq-plus-iz formulas from the catalogue
25. A4: statementParts
26. A4: every aha matches STORY section 3 (same words; punctuation may differ)
27. A4: plain-text answers are ASCII; TeX is ASCII; both-address copy is present on every problem
28. A4: every TeX string renders in the vendored KaTeX
29. A4: no negative zero and no NaN or Infinity anywhere in answer.values
30. A4: copy hygiene (no emoji, no double spaces, no trailing spaces, no TODO)

### 7.3 Expected values (the numbers the tests pin)

The full per-problem table is in section 6.2. The headline values from the acceptance criterion A2, all asserted to 1e-9 (1e-6 for 1.3.2 `result`):

| Problem | Value |
|---|---|
| 1.1.1 | product 5 + 14i; quotient −11/17 − (10/17)i |
| 1.1.2 | im 6 |
| 1.2.1 | centre 1 + 2i, radius 3 |
| 1.2.2 | distance √29 |
| 1.3.1 | r 2, θ 2π/3 |
| 1.3.2 | result 512 − 512√3 i, Arg −π/3 |
| 1.4.1 | roots[k] = (cos 2πk/5, sin 2πk/5); primitive [false, true, true, true, true] |
| 1.4.2 | radius 2; angles π/4, 3π/4, 5π/4, 7π/4; roots (±√2, ±√2) in the stated order |
| 1.4.3 | roots 2 + 3i and 2 − 3i |
| 1.5.1 | at t = 1/2: z = −1/2 − i |
| 1.5.2 | open false, closed false, bounded true, connected true, domain false, region true |
| 2.1.1 | check.w = −1 + 3i |
| 2.1.2 | parabola: vertex 4, coeff −1/16, focus 0; sample.w = 3 + 4i |
| 2.1.3 | sample.w = −3 |
| 2.2.1 | sector.to = 3π/4 |
| 2.2.2 | root 1 + i |
| 2.3.1 | alongParabola 1, exists false |
| 2.4.1 | atMinusOne 1/2 + (√3/2)i, seam 0 |
| 2.5.1 | re = 1/2; sample.w = 1/2 − (1/2)i |
| 3.1.1 | f′(1 + i) = 3 + 2i |
| 3.1.2 | f′(0) = 0; circle radius at 1 + i is √2 |
| 3.2.1 | f′(0) = 1; check.w = i |
| P2 | z·conj z = 13 |
| P3 | coeff −1 + i; shift −i |
| P4 | radius √2 |
| P5 | along the real axis 1; along the imaginary axis 0 |
| P6 | A = B = 1/2 |
| P7 | f′ = 0 |

### 7.4 Interaction script steps (`tests/interact/i1-data.mjs`)

Runs at both harness viewports (1280x860 and 390x844); the result is identical because nothing here depends on layout. Steps, in order:

1. `page.evaluate`: record `Object.getOwnPropertyNames(window)`; `import()` `js/data/problems.js` and `js/data/functions.js` by URL built from `document.baseURI`; import `problems.js` a second time.
2. In page: count (29, 12, 15); `P === P2` (singleton); route round trips for 29 problems and 12 topics; `routeFor('1.4.2') === 'problem-1-4-2'`, `routeFor('P3') === 'problem-P3'`, `idFromRoute('roots') === null`; `Object.isFrozen(PROBLEMS)` and of `FUNCTIONS`; spot values (1.3.2 imaginary part, 1.4.2 second root, 2.4.1 imaginary part at −1, `fnById('sq').cart.u`).
3. If `window.katex` exists: render every maths segment of every statement, every `answer.tex`, and every `tex`, `cart`, `polar`, `derivativeTex` of every function with `throwOnError: true, strict: 'error'`; count the successes; any error text is collected.
4. Collect any `[data-problem]` elements on the page; each must be a known id.
5. Back in Node: `assert` counts, singleton, no new globals, zero collected errors, more than 100 TeX strings rendered when KaTeX is present; `log` the summary line.

Passing = no thrown assertion, harness exit code 0, and the log line above. A failing run prints the first five in-page errors.

### 7.5 Manual and code-inspection checks (A4)

- `js/data/problems.js` and `js/data/functions.js` contain no `import`, `require`, `document`, `window.` use, `localStorage`, `fetch`, `console`, timers or colour literals (the test greps; read the two files once as well).
- The statements of 1.3.1, 2.3.1 and P7 equal the handout text after removing the `$` delimiters and expanding the TeX; the test has the exact strings.
- Every aha equals STORY section 3 (punctuation aside) except 2.2.2, which is corrected on purpose.

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases**

- Wrong or missing arguments never throw: `problemById(undefined)`, `routeFor(42)`, `idFromRoute(null)`, `topicFromRoute({})`, `fnById('')` give `null`; the list functions give `[]`.
- Case matters: `problem-p3` is not a route (the router's tokens are case-sensitive).
- `values.angles` of 1.4.2 holds the names 5π/4 and 7π/4, which are **not** Arg values; `principalArgs` holds the Arg values. A consumer that wants "the home step" must use `principalArgs`.
- `values.roots` of 1.4.1 and 1.4.2 are in k order (k = 0..n−1), counterclockwise from the first root; consumers must not re-sort them (the `roots` station labels badges by k).
- `answer.values` complex numbers are `{ re, im }` objects; plain numbers are `number`; flags are booleans; the two strings in 2.1.2 and 2.5.1 (`imageLine`) are display text, not for parsing.
- `-0` never appears (all zeros are `0`). `1/16` is `-1 / 16` evaluated, not a typed decimal.
- A statement contains an even number of `$`; the test checks it, and `statementParts` would otherwise mis-split.
- The registry may gain stations later: `problemsForStation` of an unknown station is `[]`, and the registry-agreement test will point at exactly what to update.
- A later iteration that changes `docs/ASSIGNMENT.md` ids makes the first test fail loudly (it compares with the file).

**Performance.** Import about 6 ms (measured in Node), 49 KB of data as JSON, three Maps built once; every lookup is O(1) (`problemById`, `fnById`, route functions) or a filter over 29 or 12 items. 10,000 mixed lookups took 22 ms. Nothing allocates in a frame loop; consumers should call the list functions once at mount, not per frame. The data is frozen once, so no defensive copying is needed elsewhere.

**Accessibility.** The module's contribution: `answer.text` is the screen-reader version of every answer (pure ASCII, "pi", "sqrt", "conj", no TeX); `addressLabel` gives the chip a text label so meaning never depends on colour; statements are plain sentences with maths only inside `$...$` so a consumer can give the card an accessible name by joining the prose parts; no string contains HTML. Consumers must not put KaTeX output alone into a control name.

**Reduced motion.** Not applicable: no animation here. Nothing in the data requests motion.

**Phone layout.** Not applicable to the module; the data is shaped for narrow cards: no newline in any string, longest prose 376 characters, TeX answers that are wide must scroll inside their container (section 2.2).

## 9. Out of scope

- Rendering cards, chips, wireframes above, the finder, the filters, ticks and persistence (goal `i1-station-home-problems`).
- Station presets and their state tables (ARCHITECTURE 4) and the Lab's problem presets: each station builds its own from the problem data.
- Compiling or evaluating `src` strings: that is `js/core/parse.js` (goal `i1-core-math`). This goal only supplies the strings and, in an optional test, checks them against the parser when it exists.
- The definitions and theorems sheet (ASSIGNMENT section 4) as data: a natural `js/data/defs.js` for a later iteration (each topic could link its definitions).
- Narration text (`media/narration/...`) and manim scenes.
- Unit tests for `plane`, `katex` or the explainer (other goals).
- Changing `package.json`, `docs/STORY.md`, `js/registry.js` or `tools/smoke.mjs` (requests recorded in section 0.4).

### 9.1 Risks

- **Chapter 0 for proofs** might surprise a consumer that indexes a chapter-title array by `chapter`. Mitigation: documented in section 0.3 and 0.4; the filter acceptance needs it.
- **Sample parse.js:** the optional cross-check test depends on `parse.js` meeting ARCHITECTURE 3.2. If it does not, that test fails and points at the parser or at a `src` string; that is intended.
- **Registry drift:** if the planner edits `js/registry.js` after this iteration, the registry-agreement tests fail by design until `station`, `alsoAt`, `topics`, `stations` are updated.
- **Verbatim copy:** a builder who retypes the appendices can introduce typos in math strings; the tests catch the numbers, the decimals, the TeX formulas and the wording, but not a reworded `addressWhy` or `routes` sentence. Copy, do not paraphrase.


## Appendix A: `js/data/problems.js` (copy exactly)

````js
// js/data/problems.js: the 29 review problems and 12 syllabus topics of MAT 412 Test 1.
// Pure data. No imports, no DOM, no window, no side effects beyond building lookup tables.
//
// Conventions (see docs/designs/iter-1/i1-data.md):
//  - `statement` and `answer.tex` are TeX. Maths in a statement sits between single $...$ pairs.
//    Everything else in a statement is the handout wording, verbatim.
//  - `answer.text` is printable ASCII only (ASCII minus, "pi", "sqrt(...)"), safe for readouts and tests.
//  - every other string is prose and may use Unicode maths symbols (U+2212 minus, sqrt, pi, theta, ...).
//  - `answer.values` holds the numbers the unit tests assert. Irrational numbers are always written with
//    Math (never a typed decimal), so they are exact to double precision.
//  - `chapter` is the handout chapter (1, 2, 3) of a numbered problem. The seven proofs sit in the handout's
//    own "Proof Examples" block, so they have chapter 0 and kind 'proof'; their syllabus chapter is in `topics`.
//  - Colours never appear here. addressTones() returns CSS custom-property names ('--cart', '--polar').
//  - Every exported object is deep-frozen. Copy before mutating.

const T = String.raw; // keeps TeX backslashes readable
const PI = Math.PI;
const S2 = Math.sqrt(2);
const S3 = Math.sqrt(3);
const c = (re, im) => ({ re, im }); // plain complex number, ARCHITECTURE section 2

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

const SEC = {
  alg: 'Algebraic Properties of Complex Numbers',
  geo: 'Geometric Interpretation',
  pol: 'Polar Representation',
  pow: 'Powers and Roots',
  set: 'Sets of Points in the Complex Plane',
  map: 'Complex Functions and Mappings',
  rootfn: 'Power and Root Functions',
  lim: 'Limits and Continuity',
  branch: 'Multiple-Valued Functions and Branches',
  recip: 'The Reciprocal Transformation and Extended Complex Plane',
  der: 'Derivatives of Complex Functions',
  cr: 'The Cauchy–Riemann Equations',
  proof: 'Proof Examples',
};

const unityRoots5 = Array.from({ length: 5 }, (_, k) =>
  c(Math.cos((2 * PI * k) / 5), Math.sin((2 * PI * k) / 5)));

export const PROBLEMS = deepFreeze([
  // ---------------------------------------------------------------- Chapter 1
  {
    id: '1.1.1', chapter: 1, section: SEC.alg, kind: 'problem',
    statement: T`Let $z_1 = 3 - 2i$ and $z_2 = -1 + 4i$. Compute $z_1z_2$ and $z_1/z_2$ in the form $x + iy$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'C',
    addressWhy: 'The angles of 3 − 2i and −1 + 4i are not nice, so multiplying out in (x, y) is exact; the polar column is the check.',
    aha: 'Multiply by the definition; the polar column checks the modulus √13·√17 = √221 and the angle. For division, multiply top and bottom by the mirror of z₂ so the spins cancel.',
    thread: 'T1', topics: ['T1.1'],
    routes: {
      cart: 'Multiply out with i² = −1: (3 − 2i)(−1 + 4i) = −3 + 12i + 2i − 8i² = 5 + 14i. For the quotient, multiply top and bottom by the mirror −1 − 4i: (3 − 2i)(−1 − 4i)/17 = (−11 − 10i)/17.',
      polar: 'Lengths multiply and angles add: √13·√17 = √221, and −0.588 + 1.816 = 1.228 rad. The point 5 + 14i has length √221 and angle 1.228 rad, so it checks. Division divides lengths and subtracts angles, but the decimals are ugly.',
    },
    answer: {
      tex: T`z_1z_2 = 5 + 14i, \qquad \dfrac{z_1}{z_2} = -\dfrac{11}{17} - \dfrac{10}{17}\,i`,
      text: 'z1 z2 = 5 + 14i; z1/z2 = -11/17 - (10/17)i',
      values: { product: c(5, 14), quotient: c(-11 / 17, -10 / 17), productAbs: Math.sqrt(221) },
    },
  },
  {
    id: '1.1.2', chapter: 1, section: SEC.alg, kind: 'problem',
    statement: T`Find $\operatorname{Im}\big(\overline{z_1 - z_2}\big)$ for $z_1 = 3 - 2i$ and $z_2 = -1 + 4i$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'C',
    addressWhy: 'Subtract, mirror, read off the height: all three steps are slides and flips in (x, y).',
    aha: 'Two slides and a mirror: 4 − 6i mirrored is 4 + 6i.',
    thread: 'T1', topics: ['T1.1'],
    routes: {
      cart: 'z₁ − z₂ = (3 + 1) + (−2 − 4)i = 4 − 6i. The conjugate flips the sign of the imaginary part: 4 + 6i. Its imaginary part is 6.',
      polar: 'z₁ − z₂ = 4 − 6i has length √52 ≈ 7.211 and angle −0.983 rad. The conjugate keeps the length and negates the angle, so it sits at +0.983 rad. Height = 7.211 · sin(0.983) = 6.',
    },
    answer: {
      tex: T`\operatorname{Im}\big(\overline{z_1 - z_2}\big) = \operatorname{Im}(4 + 6i) = 6`,
      text: 'Im(conj(z1 - z2)) = Im(4 + 6i) = 6',
      values: { im: 6, difference: c(4, -6) },
    },
  },
  {
    id: '1.2.1', chapter: 1, section: SEC.geo, kind: 'problem',
    statement: T`Sketch the set of points in the complex plane that satisfy $|z - (1 + 2i)| = 3$.`,
    station: 'distance', alsoAt: [],
    address: 'P',
    addressWhy: '"|z − a| = R" says "distance from a is R", which is the definition of a circle, so no algebra is needed.',
    aha: '"Distance from 1 + 2i equals 3" is a circle; no algebra.',
    thread: 'T1', topics: ['T1.2'],
    routes: {
      cart: 'Square both sides: (x − 1)² + (y − 2)² = 9. That is the equation of a circle with centre (1, 2) and radius 3.',
      polar: 'Put the origin at 1 + 2i and write z = (1 + 2i) + 3e^{iφ}. Every angle φ gives one point at distance 3, and φ from 0 to 2π walks once around the circle.',
    },
    answer: {
      tex: T`\text{circle with centre } 1 + 2i \text{ and radius } 3:\ (x - 1)^2 + (y - 2)^2 = 9`,
      text: 'circle, center 1 + 2i, radius 3: (x - 1)^2 + (y - 2)^2 = 9',
      values: { center: c(1, 2), radius: 3 },
    },
  },
  {
    id: '1.2.2', chapter: 1, section: SEC.geo, kind: 'problem',
    statement: T`Find the distance between $4 + 3i$ and $-1 + i$.`,
    station: 'distance', alsoAt: [],
    address: 'C',
    addressWhy: 'The distance between two points is the length of the slide from one to the other, and a slide is a subtraction in (x, y).',
    aha: 'Distance is the length of one slide: |5 + 2i|.',
    thread: 'T1', topics: ['T1.2'],
    routes: {
      cart: 'Subtract: (4 + 3i) − (−1 + i) = 5 + 2i. The distance is its length √(5² + 2²) = √29 ≈ 5.385.',
      polar: 'The slide 5 + 2i has polar address r = √29 and θ = atan(2/5) ≈ 0.381 rad (21.8°). The distance is r. The angle says which way you walk, and the problem does not ask for it.',
    },
    answer: {
      tex: T`|(4 + 3i) - (-1 + i)| = |5 + 2i| = \sqrt{29} \approx 5.385`,
      text: 'distance = |5 + 2i| = sqrt(29) = 5.385',
      values: { distance: Math.sqrt(29), difference: c(5, 2) },
    },
  },
  {
    id: '1.3.1', chapter: 1, section: SEC.pol, kind: 'problem',
    statement: T`Write $z = -1 + i\sqrt{3}$ in polar form $r(\cos\theta + i\sin\theta)$ and exponential form $re^{i\theta}$. What is $\operatorname{Arg}(z)$?`,
    station: 'addresses', alsoAt: ['staircase'],
    address: 'C->P',
    addressWhy: 'You are given the Cartesian address (−1, √3) and asked for the polar one, so read the length and the angle off the dot.',
    aha: 'Read the polar address of the dot at (−1, √3): length 2, second quadrant, 120°.',
    thread: 'T1', topics: ['T1.3'],
    routes: {
      cart: 'r = √((−1)² + (√3)²) = √4 = 2. Then cos θ = x/r = −1/2 and sin θ = y/r = √3/2, which happens at θ = 2π/3 (the only angle in (−π, π] with that cosine and sine).',
      polar: 'The dot is in the second quadrant, a 60° reference angle from the negative real axis, so θ = π − π/3 = 2π/3 and Arg z = 2π/3. Every other name for the same angle is 2π/3 + 2πk; that whole set is arg z.',
    },
    answer: {
      tex: T`z = 2\left(\cos\tfrac{2\pi}{3} + i\sin\tfrac{2\pi}{3}\right) = 2e^{i2\pi/3}, \quad \operatorname{Arg} z = \tfrac{2\pi}{3}, \quad \arg z = \left\{\tfrac{2\pi}{3} + 2\pi k : k \in \mathbb{Z}\right\}`,
      text: 'z = 2(cos(2pi/3) + i sin(2pi/3)) = 2e^(i 2pi/3); Arg z = 2pi/3; arg z = {2pi/3 + 2 pi k}',
      values: { r: 2, theta: (2 * PI) / 3, Arg: (2 * PI) / 3, z: c(-1, S3) },
    },
  },
  {
    id: '1.3.2', chapter: 1, section: SEC.pol, kind: 'problem',
    statement: T`Use polar form to compute $(\sqrt{3} + i)^{10}$. Express the final answer in Cartesian form $x + iy$.`,
    station: 'powers', alsoAt: [],
    address: 'C->P->C',
    addressWhy: 'Powers are native to polar: one turn and one stretch, repeated ten times. Convert in, do it, convert back.',
    aha: 'The same move (turn π/6, stretch 2) ten times; wrap 10π/6 onto the home step −π/3.',
    thread: 'T1', topics: ['T1.3', 'T1.4'],
    routes: {
      cart: 'Square it: (√3 + i)² = 2 + 2√3 i. Square again: −8 + 8√3 i. Again: −128 − 128√3 i. Finally multiply by 2 + 2√3 i to get 512 − 512√3 i. Four multiplications, and any one of them can slip.',
      polar: '√3 + i has r = 2 and Arg = π/6. The tenth power has r = 2^10 = 1024 and angle 10π/6 = 5π/3, which wrapped onto the home step is −π/3. So 1024(cos(−π/3) + i sin(−π/3)) = 512 − 512√3 i.',
    },
    answer: {
      tex: T`(\sqrt{3} + i)^{10} = 1024\,e^{i5\pi/3} = 512 - 512\sqrt{3}\,i, \quad \operatorname{Arg} = -\tfrac{\pi}{3}`,
      text: '(sqrt(3) + i)^10 = 1024 e^(i 5pi/3) = 512 - 512 sqrt(3) i (about 512 - 886.81i); Arg = -pi/3',
      values: { result: c(512, -512 * S3), r: 1024, Arg: -PI / 3, base: c(S3, 1), n: 10, rawAngle: (5 * PI) / 3 },
    },
  },
  {
    id: '1.4.1', chapter: 1, section: SEC.pow, kind: 'problem',
    statement: T`Find and sketch the 5th roots of unity.`,
    station: 'roots', alsoAt: [],
    address: 'P',
    addressWhy: 'z⁵ = 1 asks which angle, repeated five times, makes a whole number of turns. That is a polar question with five equally spaced answers.',
    aha: 'Divide the staircase of 1 (angles 2πk) by 5: five points 72° apart on the unit circle.',
    thread: 'T2', topics: ['T1.4'],
    routes: {
      cart: 'Cartesian algebra is awkward here: z⁵ − 1 = (z − 1)(z⁴ + z³ + z² + z + 1), and the quartic is hard to solve by hand. The polar picture hands you all five roots at once, with cos 72° = (√5 − 1)/4 ≈ 0.309.',
      polar: 'The staircase of 1 is the angles 2πk. Divide by 5: z = e^{i2πk/5} for k = 0..4, five points 72° apart on the unit circle. k = 5 lands back on k = 0. The angles 6π/5 and 8π/5 are names for the points whose Arg is −4π/5 and −2π/5. Since 5 is prime, every root except 1 is primitive.',
    },
    answer: {
      tex: T`z_k = e^{i2\pi k/5},\ k = 0, 1, 2, 3, 4: \quad 1,\ 0.309 + 0.951i,\ -0.809 + 0.588i,\ -0.809 - 0.588i,\ 0.309 - 0.951i`,
      text: 'z_k = e^(i 2 pi k/5), k = 0..4: 1; 0.309 + 0.951i; -0.809 + 0.588i; -0.809 - 0.588i; 0.309 - 0.951i; all but 1 are primitive',
      values: {
        n: 5, roots: unityRoots5, primitive: [false, true, true, true, true],
        principalArgs: [0, (2 * PI) / 5, (4 * PI) / 5, (-4 * PI) / 5, (-2 * PI) / 5],
      },
    },
  },
  {
    id: '1.4.2', chapter: 1, section: SEC.pow, kind: 'problem',
    statement: T`Find all the 4th roots of $-16$. Express answers in both exponential and Cartesian forms.`,
    station: 'roots', alsoAt: [],
    address: 'P->C',
    addressWhy: 'Find the roots in polar (divide the angle by 4), then convert each to x + iy because the problem asks for both forms.',
    aha: '−16 is 16 at angle π; divide the staircase by 4: radius 2, angles π/4 + kπ/2.',
    thread: 'T2', topics: ['T1.4'],
    routes: {
      cart: 'z⁴ + 16 = (z² − 4i)(z² + 4i). Solve z² = 4i: z = ±√2(1 + i). Solve z² = −4i: z = ±√2(1 − i). Four roots, found with a trick you have to see.',
      polar: '−16 = 16e^{iπ}, so its staircase is π + 2πk. Divide by 4: radius 16^(1/4) = 2 and angles π/4 + kπ/2 for k = 0..3, which are π/4, 3π/4, 5π/4, 7π/4. Four points 90° apart on the circle of radius 2. Convert with 2cos 45° = √2.',
    },
    answer: {
      tex: T`2e^{i\pi/4},\ 2e^{i3\pi/4},\ 2e^{i5\pi/4},\ 2e^{i7\pi/4} = \sqrt{2} + \sqrt{2}\,i,\ -\sqrt{2} + \sqrt{2}\,i,\ -\sqrt{2} - \sqrt{2}\,i,\ \sqrt{2} - \sqrt{2}\,i, \quad \operatorname{Arg}: \tfrac{\pi}{4}, \tfrac{3\pi}{4}, -\tfrac{3\pi}{4}, -\tfrac{\pi}{4}`,
      text: '2e^(i pi/4), 2e^(i 3pi/4), 2e^(i 5pi/4), 2e^(i 7pi/4) = sqrt(2) + sqrt(2)i, -sqrt(2) + sqrt(2)i, -sqrt(2) - sqrt(2)i, sqrt(2) - sqrt(2)i; as Arg values the angles are pi/4, 3pi/4, -3pi/4, -pi/4',
      values: {
        radius: 2,
        angles: [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4],
        principalArgs: [PI / 4, (3 * PI) / 4, (-3 * PI) / 4, -PI / 4],
        roots: [c(S2, S2), c(-S2, S2), c(-S2, -S2), c(S2, -S2)],
      },
    },
  },
  {
    id: '1.4.3', chapter: 1, section: SEC.pow, kind: 'problem',
    statement: T`Use the quadratic formula to solve $z^2 - 4z + 13 = 0$.`,
    station: 'roots', alsoAt: [],
    address: 'C',
    addressWhy: 'The quadratic formula is plain algebra in (x, y); the only polar step hides inside √(−36).',
    aha: '(z − 2)² = −9, so z − 2 is a square root of −9 (±3i), then slide by 2; the roots are a mirror pair.',
    thread: 'T2', topics: ['T1.4'],
    routes: {
      cart: 'z = (4 ± √(16 − 52))/2 = (4 ± √(−36))/2 = (4 ± 6i)/2 = 2 ± 3i. Check: (2 + 3i)² − 4(2 + 3i) + 13 = (−5 + 12i) + (−8 − 12i) + 13 = 0.',
      polar: 'The discriminant −36 = 36e^{iπ} has principal square root 6e^{iπ/2} = 6i, and its other root is −6i. Completing the square gives (z − 2)² = −9, so z − 2 = ±3i (length 3, angle ±90°). The roots are mirror images across the real axis because the coefficients are real.',
    },
    answer: {
      tex: T`z = \dfrac{4 \pm \sqrt{-36}}{2} = 2 \pm 3i`,
      text: 'z = (4 +- sqrt(-36))/2 = 2 + 3i or 2 - 3i',
      values: { roots: [c(2, 3), c(2, -3)], completed: { shift: 2, square: -9 } },
    },
  },
  {
    id: '1.5.1', chapter: 1, section: SEC.set, kind: 'problem',
    statement: T`Find a parameterization of the line from $2 + i$ to $-3 - 3i$.`,
    station: 'curves', alsoAt: [],
    address: 'C',
    addressWhy: 'A straight line is start + t × (end − start): a slide that grows with time, which is pure (x, y) bookkeeping.',
    aha: 'A slide that grows with time: start + t·(end − start).',
    thread: 'T3', topics: ['T1.5'],
    routes: {
      cart: 'Direction = end − start = (−3 − 3i) − (2 + i) = −5 − 4i. So z(t) = (2 + i) + t(−5 − 4i) = (2 − 5t) + i(1 − 4t) for 0 ≤ t ≤ 1. At t = 1/2 you are at −1/2 − i, the midpoint.',
      polar: 'The direction −5 − 4i has polar address r = √41 ≈ 6.403 and θ = atan2(−4, −5) ≈ −2.467 rad (−141.3°): walk at speed 6.403 heading −141.3°. The points of the line have no tidy polar addresses; the step does.',
    },
    answer: {
      tex: T`z(t) = (2 - 5t) + i(1 - 4t), \quad 0 \le t \le 1`,
      text: 'z(t) = (2 - 5t) + i(1 - 4t), 0 <= t <= 1',
      values: { start: c(2, 1), end: c(-3, -3), direction: c(-5, -4), at: { t: 0.5, z: c(-0.5, -1) } },
    },
  },
  {
    id: '1.5.2', chapter: 1, section: SEC.set, kind: 'problem',
    statement: T`Consider $S = \{ z \in \mathbb{C} : 1 < |z + i| \le 3 \}$. Is $S$ open, closed, or neither? Is $S$ bounded? What are the boundary points of $S$? Is $S$ a domain? Why or why not?`,
    station: 'sets', alsoAt: [],
    address: 'P',
    addressWhy: '"1 < |z + i| ≤ 3" is a condition on the distance from −i, so centre the polar picture at −i and the set is a ring.',
    aha: 'An annulus around −i; the inner circle is left out, the outer circle is kept in; decide each word by looking at a tiny disk.',
    thread: 'T1', topics: ['T1.5'],
    routes: {
      cart: 'S = {1 < x² + (y + 1)² ≤ 9}. That is fine for testing one point, but hard to see as a whole: the picture only appears once you notice the centre (0, −1).',
      polar: 'Centre at −i and write z = −i + ρe^{iφ}. Then S is 1 < ρ ≤ 3 with φ free: a ring. Not open: a point with ρ = 3 is in S, but every tiny disk around it leaves S. Not closed: the points with ρ = 1 are limits of S but are not in S. Bounded: S sits inside |z + i| ≤ 3. Boundary: both circles. Connected, but not open, so not a domain; it is a region.',
    },
    answer: {
      tex: T`\text{neither open nor closed; bounded; } \partial S = \{|z + i| = 1\} \cup \{|z + i| = 3\};\ \text{not a domain (not open), but a region}`,
      text: 'neither open nor closed; bounded; boundary = {|z + i| = 1} union {|z + i| = 3}; not a domain (not open); it is a region (connected)',
      values: {
        center: c(0, -1), inner: 1, outer: 3, innerIncluded: false, outerIncluded: true,
        open: false, closed: false, bounded: true, connected: true, domain: false, region: true,
      },
    },
  },
  // ---------------------------------------------------------------- Chapter 2
  {
    id: '2.1.1', chapter: 2, section: SEC.map, kind: 'problem',
    statement: T`Express $f(z) = z^2 + iz$ in the form $u(x, y) + iv(x, y)$ and $u(r, \theta) + iv(r, \theta)$.`,
    station: 'mappings', alsoAt: [],
    address: 'both',
    addressWhy: 'The problem asks for the same function in both addresses: expand in (x, y), and write re^{iθ} for the polar version.',
    aha: 'Expand (x + iy)² + i(x + iy); or r²e^{2iθ} + re^{i(θ + π/2)} because i is a quarter turn.',
    thread: 'T1', topics: ['T2.1'],
    routes: {
      cart: '(x + iy)² + i(x + iy) = x² − y² + 2ixy + ix − y. The real part is u = x² − y² − y and the imaginary part is v = 2xy + x. Check at 1 + i: u = −1, v = 3.',
      polar: 'With z = re^{iθ}: z² = r²(cos 2θ + i sin 2θ), and iz = re^{i(θ + π/2)} = r(−sin θ + i cos θ). So u = r² cos 2θ − r sin θ and v = r² sin 2θ + r cos θ. Check at r = √2, θ = π/4: u = −1, v = 3.',
    },
    answer: {
      tex: T`u = x^2 - y^2 - y,\ v = 2xy + x; \qquad u = r^2\cos 2\theta - r\sin\theta,\ v = r^2\sin 2\theta + r\cos\theta`,
      text: 'u = x^2 - y^2 - y, v = 2xy + x; u = r^2 cos(2 theta) - r sin(theta), v = r^2 sin(2 theta) + r cos(theta)',
      values: { check: { z: c(1, 1), w: c(-1, 3), u: -1, v: 3 } },
    },
  },
  {
    id: '2.1.2', chapter: 2, section: SEC.map, kind: 'problem',
    statement: T`Determine the image of the vertical line $x = 2$ under $w = z^2$. Describe the resulting curve in the $w$-plane.`,
    station: 'powermap', alsoAt: ['lab'],
    address: 'C',
    addressWhy: 'Put z = 2 + iy (y is the clock), square it, and eliminate y: ordinary (x, y) algebra gives the curve.',
    aha: 'Push the line forward with y as the clock: u = 4 − y², v = 4y; eliminate y.',
    thread: 'T3', topics: ['T2.1'],
    routes: {
      cart: 'z = 2 + iy, so z² = (4 − y²) + 4iy. Then u = 4 − y² and v = 4y. Eliminate y = v/4: u = 4 − v²/16, a parabola with vertex 4 opening left. At y = 1, the point 2 + i goes to 3 + 4i.',
      polar: 'On x = 2, r = 2 sec θ with θ in (−π/2, π/2). Squaring gives length ρ = 4 sec²θ at angle φ = 2θ, which is ρ(1 + cos φ) = 8. A curve ρ = k/(1 + cos φ), with k a constant, is a parabola with its focus at the origin, so the focus is 0.',
    },
    answer: {
      tex: T`u = 4 - \dfrac{v^2}{16}\ \text{(a parabola: vertex } 4,\ \text{opens left, focus } 0\text{)}`,
      text: 'parabola u = 4 - v^2/16 (vertex 4, opens left, focus 0)',
      values: { parabola: { vertex: 4, coeff: -1 / 16, focus: 0 }, sample: { y: 1, z: c(2, 1), w: c(3, 4) } },
    },
  },
  {
    id: '2.1.3', chapter: 2, section: SEC.map, kind: 'problem',
    statement: T`Find the image of the line $x = 2$ under $f(z) = iz - 2i$. What does this linear transformation do to the plane in general?`,
    station: 'linear', alsoAt: ['lab'],
    address: 'both',
    addressWhy: 'The line is easiest in (x, y); what the map does to the whole plane is easiest in polar, because i is just a quarter turn.',
    aha: 'i(z − 2): slide left 2, quarter turn; the line x = 2 lands on the real axis.',
    thread: 'T1', topics: ['T2.1'],
    routes: {
      cart: 'z = 2 + iy gives iz − 2i = i(2 + iy) − 2i = 2i − y − 2i = −y. So w = −y is real, and every real number is hit. The image is the real axis, v = 0.',
      polar: 'iz − 2i = i(z − 2): slide left 2, then multiply by i = e^{iπ/2}, which adds 90° to every angle and keeps every length. In general it is a counterclockwise quarter turn about 0 followed by a slide by −2i. Distances and angles between points never change.',
    },
    answer: {
      tex: T`\text{the real axis } (v = 0);\ \text{in general: rotate } 90^\circ \text{ counterclockwise, then slide by } -2i`,
      text: 'the real axis (v = 0); in general: rotate 90 degrees counterclockwise, then slide by -2i',
      values: { imageLine: 'v = 0', rotation: PI / 2, shift: c(0, -2), sample: { z: c(2, 3), w: c(-3, 0) } },
    },
  },
  {
    id: '2.2.1', chapter: 2, section: SEC.rootfn, kind: 'problem',
    statement: T`Find the image of the sector $0 < \arg(z) < \pi/4$ under $w = z^3$.`,
    station: 'powermap', alsoAt: ['lab'],
    address: 'P',
    addressWhy: 'zⁿ multiplies every angle by n, so a condition on arg z becomes a condition on arg w with no algebra.',
    aha: 'zⁿ multiplies the angle by n; the fan opens three times wider.',
    thread: 'T2', topics: ['T2.2'],
    routes: {
      cart: 'z³ = (x³ − 3xy²) + i(3x²y − y³). The edge y = 0 goes to x³, the positive real axis. The edge y = x goes to x³(−2 + 2i), pointing up and left at 135°. The sector between them is filled in, but you only see that after finding the edges.',
      polar: 'z = re^{iθ} goes to r³e^{i3θ}. Lengths r > 0 reach every length, and angles 0 < θ < π/4 become 0 < 3θ < 3π/4. So the image is the sector 0 < arg w < 3π/4: three times as wide, and it does not overlap itself because 3π/4 < 2π.',
    },
    answer: {
      tex: T`\text{the sector } 0 < \arg w < \tfrac{3\pi}{4}`,
      text: 'the sector 0 < arg w < 3pi/4',
      values: { sector: { from: 0, to: (3 * PI) / 4 }, n: 3 },
    },
  },
  {
    id: '2.2.2', chapter: 2, section: SEC.rootfn, kind: 'problem',
    statement: T`Compute the principal value of the square root of $2i$, i.e. $(2i)^{1/2}$ on the principal branch.`,
    station: 'principal-root', alsoAt: [],
    address: 'P',
    addressWhy: 'Principal roots are defined with Arg: take the square root of the length and halve the home-step angle.',
    aha: '|2i| = 2 and Arg(2i) = π/2; take the square root of the length and halve the angle.',
    thread: 'T2', topics: ['T2.2'],
    routes: {
      cart: 'Solve (a + bi)² = 2i: a² − b² = 0 and 2ab = 2, so a = b and a² = 1. Two solutions: 1 + i and −1 − i. The principal one has positive real part: 1 + i.',
      polar: '2i = 2e^{iπ/2} with Arg = π/2 (the home step). Principal root: √2 · e^{i(π/2)/2} = √2 e^{iπ/4} = √2(cos 45° + i sin 45°) = 1 + i. The other root comes from the next step, π/2 + 2π: √2 e^{i5π/4} = −1 − i.',
    },
    answer: {
      tex: T`(2i)^{1/2} = \sqrt{2}\,e^{i\operatorname{Arg}(2i)/2} = \sqrt{2}\,e^{i\pi/4} = 1 + i`,
      text: '(2i)^(1/2) = sqrt(2) e^(i Arg(2i)/2) = sqrt(2) e^(i pi/4) = 1 + i, using Arg(2i) = pi/2 (the other square root is -1 - i)',
      values: { root: c(1, 1), r: S2, Arg: PI / 4, other: c(-1, -1) },
    },
  },
  {
    id: '2.3.1', chapter: 2, section: SEC.lim, kind: 'problem',
    statement: T`Find $\lim_{z\to 0} \dfrac{x^2 - y^2 + i2xy}{x^2 + y^2}$ as $z \to 0$ along the curve $y = x^2$.`,
    station: 'limits', alsoAt: [],
    address: 'P',
    addressWhy: 'The fraction is z/conj z = e^{2iθ}, which depends only on the angle, so the polar address shows at once that the value depends on the direction of approach.',
    aha: 'The expression is z/conj z = e^{2iθ}: it remembers only the direction; y = x² arrives tangent to the real axis.',
    thread: 'T3', topics: ['T2.3'],
    routes: {
      cart: 'On y = x² the fraction is (x² − x⁴ + 2ix³)/(x² + x⁴) = (1 − x² + 2ix)/(1 + x²). Let x → 0: it tends to 1. (Along the imaginary axis it is −1, so the full limit does not exist.)',
      polar: 'The numerator is z² and the denominator is |z|² = z·conj z, so the fraction is z/conj z = e^{2iθ}: only the direction matters. The curve y = x² arrives at 0 tangent to the real axis (θ → 0), so the value tends to e^0 = 1. Along the real axis it is 1; along the imaginary axis θ = π/2 gives e^{iπ} = −1. Different directions, different values, so the limit at 0 does not exist.',
    },
    answer: {
      tex: T`\lim_{z \to 0} \dfrac{x^2 - y^2 + i2xy}{x^2 + y^2} = 1 \text{ along } y = x^2 \quad \text{(the full limit at } 0 \text{ does not exist)}`,
      text: '1 along y = x^2 (the full limit at 0 does not exist)',
      values: { alongParabola: 1, alongRealAxis: c(1, 0), alongImagAxis: c(-1, 0), exists: false },
    },
  },
  {
    id: '2.4.1', chapter: 2, section: SEC.branch, kind: 'problem',
    statement: T`Find a branch of the cube root of $z$ that is continuous along the negative $x$-axis.`,
    station: 'branches', alsoAt: [],
    address: 'P',
    addressWhy: 'A branch is a choice of window for the angle. That is a statement about polar angles, and the seam of the window is where the value jumps.',
    aha: 'Choose a window of steps whose seam is not the negative real axis.',
    thread: 'T2', topics: ['T2.4'],
    routes: {
      cart: 'In (x, y) the cube root has no short formula: the angle needs arctan and a case split on the signs of x and y, which is a window in disguise.',
      polar: 'Write z = re^{iθ} and pick the window 0 < θ < 2π (seam on the positive real axis). Define f(z) = r^(1/3) e^{iθ/3}. The negative real axis is θ = π, in the middle of the window, so f is continuous there: f(−1) = e^{iπ/3} = 1/2 + (√3/2)i. The principal branch (−π < θ ≤ π) jumps from e^{iπ/3} to e^{−iπ/3} across that axis.',
    },
    answer: {
      tex: T`f(z) = r^{1/3}e^{i\theta/3}\ \text{with } \theta \in \arg z,\ 0 < \theta < 2\pi\ \text{(cut on the positive real axis)}; \quad f(-1) = e^{i\pi/3} = \tfrac12 + \tfrac{\sqrt{3}}{2}\,i`,
      text: 'f(z) = r^(1/3) e^(i theta/3), with theta the name of arg z chosen in 0 < theta < 2pi (cut on the positive real axis); f(-1) = e^(i pi/3) = 1/2 + (sqrt(3)/2) i',
      values: { seam: 0, window: [0, 2 * PI], atMinusOne: c(0.5, S3 / 2), principalJumps: true },
    },
  },
  {
    id: '2.5.1', chapter: 2, section: SEC.recip, kind: 'problem',
    statement: T`Find the image of the circle $|z - 1| = 1$ under $w = 1/z$.`,
    station: 'reciprocal', alsoAt: ['lab'],
    address: 'P',
    addressWhy: 'On the circle z = 2cos θ e^{iθ}, and 1/z just inverts the length and negates the angle, so polar turns the circle into a line in one line of algebra.',
    aha: 'z = 2cos θ e^{iθ} on the circle, so 1/z = ½ − (i/2)tan θ; 0 goes to ∞ so the circle must open into a line.',
    thread: 'T1', topics: ['T2.5'],
    routes: {
      cart: 'w = 1/z = (x − iy)/(x² + y²). On the circle x² + y² = 2x, so u = x/(2x) = 1/2 for every point except z = 0, while v = −y/(2x) takes every real value. The image is the vertical line Re w = 1/2. At 1 + i the image is 1/2 − i/2.',
      polar: 'The circle is r = 2cos θ for −π/2 < θ < π/2. Under 1/z, length r goes to 1/r and angle θ goes to −θ: w = e^{−iθ}/(2cos θ) = 1/2 − (i/2)tan θ. The real part is stuck at 1/2 while tan θ sweeps all real numbers. The circle passes through 0, which goes to ∞, so the circle opens into a line.',
    },
    answer: {
      tex: T`\text{the line } \operatorname{Re} w = \tfrac12`,
      text: 'the line Re w = 1/2',
      values: { imageLine: 'Re w = 1/2', re: 0.5, sample: { z: c(1, 1), w: c(0.5, -0.5) } },
    },
  },
  // ---------------------------------------------------------------- Chapter 3
  {
    id: '3.1.1', chapter: 3, section: SEC.der, kind: 'problem',
    statement: T`Use the limit definition of the derivative to show $f(z) = z^2 + z$ is differentiable everywhere and find $f'(z)$.`,
    station: 'derivative', alsoAt: [],
    address: 'C',
    addressWhy: 'Expanding (z + h)² is algebra in z and h; no direction is needed, which is why the answer does not depend on one.',
    aha: 'The quotient is 2z + 1 + Δz, no direction in sight.',
    thread: 'T3', topics: ['T3.1'],
    routes: {
      cart: '(f(z + h) − f(z))/h = ((z + h)² + (z + h) − z² − z)/h = (2zh + h² + h)/h = 2z + 1 + h. Let h → 0 along any path: the limit is 2z + 1. At z = 1 + i, f′ = 3 + 2i.',
      polar: 'Write h = ρe^{iφ}. The quotient is 2z + 1 + ρe^{iφ}: a small circle of radius ρ around 2z + 1. As ρ → 0 the circle shrinks to the point 2z + 1 whatever φ is, so every direction agrees and f is differentiable everywhere.',
    },
    answer: {
      tex: T`f'(z) = \lim_{h \to 0} \dfrac{f(z + h) - f(z)}{h} = 2z + 1`,
      text: "f'(z) = 2z + 1, for every z",
      values: { derivativeAt: { z: c(1, 1), fprime: c(3, 2) }, A: '2z + 1', Babs: 0 },
    },
  },
  {
    id: '3.1.2', chapter: 3, section: SEC.der, kind: 'problem',
    statement: T`Let $f(z) = |z|^2$. Show $f$ is differentiable only at $z = 0$, and thus nowhere analytic.`,
    station: 'derivative', alsoAt: [],
    address: 'P',
    addressWhy: 'With h = ρe^{iφ} the direction of approach is the variable φ, and how the quotient depends on φ is exactly what shows f is not differentiable.',
    aha: 'The quotient tends to conj z + z e^{−2iφ}: a circle of radius |z|, a point only at 0.',
    thread: 'T3', topics: ['T3.1'],
    routes: {
      cart: 'The quotient is ((z + h)(conj z + conj h) − z conj z)/h = conj z + z·(conj h/h) + conj h. For real h, conj h/h = 1 and the limit is conj z + z = 2x. For imaginary h, conj h/h = −1 and the limit is conj z − z = −2iy. They agree only when 2x = −2iy, that is, x = y = 0.',
      polar: 'With h = ρe^{iφ}, conj h/h = e^{−2iφ}, so the quotient tends to conj z + z e^{−2iφ}. As φ goes round, that traces a circle with centre conj z and radius |z|, which is a single point only when |z| = 0. So f is differentiable only at z = 0, with f′(0) = 0. It is analytic nowhere, because analytic needs a whole disk of differentiable points.',
    },
    answer: {
      tex: T`\text{differentiable only at } z = 0\ (f'(0) = 0);\ \text{nowhere analytic}`,
      text: "differentiable only at z = 0 (f'(0) = 0); nowhere analytic",
      values: {
        differentiableAt: c(0, 0), fprime0: c(0, 0),
        circleRadiusAt: { z: c(1, 1), radius: S2, center: c(1, -1) },
      },
    },
  },
  {
    id: '3.2.1', chapter: 3, section: SEC.cr, kind: 'problem',
    statement: T`Given $f(z) = e^x(\cos y + i\sin y)$, use the Cauchy–Riemann equations to verify $f$ is entire. Then compute $f'(z)$.`,
    station: 'cauchy-riemann', alsoAt: [],
    address: 'C',
    addressWhy: 'u = e^x cos y and v = e^x sin y: each partial derivative is one line in (x, y), and the Cauchy–Riemann equations are stated in (x, y).',
    aha: 'u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere: no mirror part.',
    thread: 'T3', topics: ['T3.2'],
    routes: {
      cart: 'u = e^x cos y and v = e^x sin y. Then u_x = e^x cos y = v_y and u_y = −e^x sin y = −v_x. Both equations hold at every point and the partials are continuous, so f is entire. f′ = u_x + i v_x = e^x cos y + i e^x sin y = f(z).',
      polar: 'Read the output in polar: |f| = e^x and arg f = y, so the Cartesian address of z becomes the polar address of w. Cauchy–Riemann says the same for log f: ∂(ln|f|)/∂x = ∂(arg f)/∂y, which is 1 = 1, and ∂(ln|f|)/∂y = −∂(arg f)/∂x, which is 0 = 0. So f′ = f, and at 0 it equals 1.',
    },
    answer: {
      tex: T`\text{entire;}\quad f'(z) = e^x\cos y + i\,e^x\sin y = f(z)`,
      text: "entire; f'(z) = e^x cos y + i e^x sin y = f(z)",
      values: { entire: true, fprimeAt0: c(1, 0), check: { z: c(0, PI / 2), w: c(0, 1) } },
    },
  },
  // ---------------------------------------------------------------- Proof Examples
  {
    id: 'P1', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $\overline{z_1}\cdot\overline{z_2} = \overline{z_1z_2}$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'both',
    addressWhy: 'Either works: expand both sides in (x, y), or note that a mirror negates angles, which is one line in polar.',
    aha: 'Mirror negates angles, and −θ₁ − θ₂ = −(θ₁ + θ₂); in C, expand both sides.',
    thread: 'T1', topics: ['T1.1'],
    routes: {
      cart: 'With z₁ = x₁ + iy₁ and z₂ = x₂ + iy₂: conj z₁ · conj z₂ = (x₁ − iy₁)(x₂ − iy₂) = (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁). And z₁z₂ = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁), whose conjugate is the same number. Equal.',
      polar: 'Write z₁ = r₁e^{iθ₁} and z₂ = r₂e^{iθ₂}, so conj z₁ = r₁e^{−iθ₁} and conj z₂ = r₂e^{−iθ₂}. Then conj z₁ · conj z₂ = r₁r₂e^{−i(θ₁ + θ₂)}, which is the conjugate of z₁z₂ = r₁r₂e^{i(θ₁ + θ₂)}. Equal.',
    },
    answer: {
      tex: T`\overline{z_1}\cdot\overline{z_2} = (x_1x_2 - y_1y_2) - i(x_1y_2 + x_2y_1) = \overline{z_1z_2}`,
      text: 'conj(z1) conj(z2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1) = conj(z1 z2)',
      values: { check: { z1: c(3, -2), z2: c(-1, 4), both: c(5, -14) } },
    },
  },
  {
    id: 'P2', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $|z| = \sqrt{z\cdot\overline{z}}$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'P',
    addressWhy: 'z·conj z is a spin followed by an unspin, and in polar the spins cancel and leave only the length squared.',
    aha: 'Spin and unspin cancel: re^{iθ}·re^{−iθ} = r².',
    thread: 'T1', topics: ['T1.1', 'T1.3'],
    routes: {
      cart: 'z·conj z = (x + iy)(x − iy) = x² − ixy + ixy + y² = x² + y² (the cross terms cancel). So √(z·conj z) = √(x² + y²) = |z|. Example: z = 3 − 2i gives 9 + 4 = 13.',
      polar: 'z·conj z = re^{iθ}·re^{−iθ} = r²e^0 = r². Since r ≥ 0, √(r²) = r = |z|.',
    },
    answer: {
      tex: T`z\overline{z} = (x + iy)(x - iy) = x^2 + y^2 = |z|^2 \ \Rightarrow\ |z| = \sqrt{z\overline{z}}`,
      text: 'z conj(z) = x^2 + y^2 = |z|^2, so |z| = sqrt(z conj(z)); for z = 3 - 2i that is sqrt(13)',
      values: { check: { z: c(3, -2), zzbar: 13, abs: Math.sqrt(13) } },
    },
  },
  {
    id: 'P3', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Prove that the composition of two linear transformations is a linear transformation.`,
    station: 'linear', alsoAt: [],
    address: 'C',
    addressWhy: 'A linear map is az + b, and composing two of them is substitution, which is plain algebra in a, b, c, d.',
    aha: 'a(cz + d) + b = (ac)z + (ad + b): spins add, stretches multiply.',
    thread: 'T3', topics: ['T2.1'],
    routes: {
      cart: 'Let T₁(z) = az + b and T₂(z) = cz + d with a, c ≠ 0. Then T₁(T₂(z)) = a(cz + d) + b = (ac)z + (ad + b). That has the form Az + B with A = ac ≠ 0 and B = ad + b, so it is linear.',
      polar: 'Write a = |a|e^{iα} and c = |c|e^{iγ}. The coefficient ac = |a||c|e^{i(α + γ)}: the stretches multiply and the spins add. The shift ad + b is d spun and stretched by a, then slid by b. Example a = i, c = 1 + i: ac = √2 e^{i3π/4} = −1 + i.',
    },
    answer: {
      tex: T`a(cz + d) + b = (ac)z + (ad + b)`,
      text: 'a(cz + d) + b = (ac) z + (ad + b): linear with coefficient ac and shift ad + b',
      values: {
        check: { a: c(0, 1), b: c(0, -2), c: c(1, 1), d: c(1, 0), coeff: c(-1, 1), shift: c(0, -1) },
      },
    },
  },
  {
    id: 'P4', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that the image of the circle of radius $1$ centered at $0$ under $f(z) = (1 + i)z$ is the circle of radius $\sqrt{2}$ centered at $0$.`,
    station: 'linear', alsoAt: ['lab'],
    address: 'P',
    addressWhy: '1 + i is a spin by 45° and a stretch by √2, so (1 + i)z carries every point of the unit circle to the circle of radius √2.',
    aha: '1 + i = √2e^{iπ/4}: stretch by √2, spin 45°; and every point of the big circle is hit.',
    thread: 'T1', topics: ['T2.1'],
    routes: {
      cart: 'w = (1 + i)(x + iy) = (x − y) + i(x + y). Then |w|² = (x − y)² + (x + y)² = 2x² + 2y² = 2 when x² + y² = 1, so |w| = √2. Every w with |w| = √2 comes from z = w/(1 + i), which has |z| = 1, so the whole circle is covered.',
      polar: '1 + i = √2e^{iπ/4}. For z = e^{it}, w = √2e^{i(t + π/4)}: the length is always √2, and the angle t + π/4 goes once around as t does. So the image is the entire circle |w| = √2.',
    },
    answer: {
      tex: T`|(1 + i)z| = |1 + i|\,|z| = \sqrt{2}\cdot 1 = \sqrt{2}`,
      text: '(1 + i) = sqrt(2) e^(i pi/4): w = sqrt(2) e^(i(t + pi/4)) covers the whole circle |w| = sqrt(2)',
      values: { radius: S2, factor: c(1, 1), factorAbs: S2, factorArg: PI / 4 },
    },
  },
  {
    id: 'P5', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $\lim_{z\to 0} \dfrac{\operatorname{Re}(1 + z) - 1}{z}$ does not exist.`,
    station: 'limits', alsoAt: [],
    address: 'P',
    addressWhy: 'With z = re^{iθ} the fraction depends only on θ, so different directions visibly give different values.',
    aha: 'x/z = cos θ e^{−iθ} depends on direction: 1 along the real axis, 0 along the imaginary axis.',
    thread: 'T3', topics: ['T2.3'],
    routes: {
      cart: 'Re(1 + z) − 1 = x, so the fraction is x/z. Along the real axis z = x: x/x = 1. Along the imaginary axis z = iy: 0/(iy) = 0. Two paths, two values: the limit does not exist.',
      polar: 'x/z = r cos θ/(re^{iθ}) = cos θ e^{−iθ} = 1/2 + (1/2)e^{−2iθ}. The size r cancels, so only the direction θ is left. θ = 0 gives 1 and θ = π/2 gives 0; all directions together trace the circle with centre 1/2 and radius 1/2 through 0 and 1.',
    },
    answer: {
      tex: T`\dfrac{\operatorname{Re}(1 + z) - 1}{z} = \dfrac{x}{z} \to \begin{cases} 1 & \text{along the real axis} \\ 0 & \text{along the imaginary axis} \end{cases} \ \Rightarrow\ \text{no limit}`,
      text: 'x/z -> 1 along the real axis and 0 along the imaginary axis, so the limit does not exist',
      values: {
        alongRealAxis: c(1, 0), alongImagAxis: c(0, 0), exists: false,
        directional: { A: c(0.5, 0), B: c(0.5, 0) },
      },
    },
  },
  {
    id: 'P6', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $f(z) = \operatorname{Re}(z)$ is not differentiable.`,
    station: 'derivative', alsoAt: [],
    address: 'both',
    addressWhy: 'Either the Cauchy–Riemann test in (x, y) or the direction picture in polar kills it in one line.',
    aha: 'Same quotient as P5 at every point; or CR: u_x = 1 ≠ 0 = v_y; or: Re is a squash, not a spin-and-stretch.',
    thread: 'T3', topics: ['T3.1'],
    routes: {
      cart: 'The quotient is (Re(z + h) − Re z)/h = Re(h)/h. For real h it is 1; for imaginary h it is 0. Two limits, so there is no derivative at any z. In Cauchy–Riemann form: u = x and v = 0 give u_x = 1 but v_y = 0, so u_x ≠ v_y.',
      polar: 'With h = ρe^{iφ} the quotient is cos φ e^{−iφ} = 1/2 + (1/2)e^{−2iφ} = A + Be^{−2iφ} with A = B = 1/2: a circle of directions, not a point. Geometrically Re squashes the whole plane flat onto the real axis, and a spin-and-stretch never flattens.',
    },
    answer: {
      tex: T`\dfrac{\operatorname{Re}(z + h) - \operatorname{Re} z}{h} = \dfrac{\operatorname{Re} h}{h} \to 1 \text{ (real } h\text{) but } 0 \text{ (imaginary } h\text{)}`,
      text: '(Re(z + h) - Re z)/h = Re(h)/h is 1 for real h and 0 for imaginary h, so f is differentiable nowhere',
      values: { A: c(0.5, 0), B: c(0.5, 0), differentiable: false },
    },
  },
  {
    id: 'P7', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Suppose $f = u + iv$ is entire and $u(x, y) = c$ (a real constant) everywhere. Use Cauchy–Riemann to prove $f$ is constant.`,
    station: 'cauchy-riemann', alsoAt: [],
    address: 'C',
    addressWhy: 'Cauchy–Riemann is a pair of equations about partial derivatives in (x, y), and with u constant they collapse to zero at once.',
    aha: 'u_x = u_y = 0, so CR forces v_x = v_y = 0, so f′ = 0 and f is constant.',
    thread: 'T3', topics: ['T3.2'],
    routes: {
      cart: 'u ≡ c gives u_x = u_y = 0. Cauchy–Riemann then gives v_y = u_x = 0 and v_x = −u_y = 0. So f′ = u_x + i v_x = 0 everywhere on the plane, which is a domain, and therefore f is constant: f ≡ c + i·(a constant).',
      polar: 'If f′(z₀) = ρe^{iα} were not 0, then near z₀ the map would spin by α and stretch by ρ, sending a small disk onto a small two-dimensional blob. But u ≡ c puts every image on the vertical line Re w = c, and a line cannot hold a blob. So f′ = 0 everywhere and f is constant.',
    },
    answer: {
      tex: T`u \equiv c \Rightarrow u_x = u_y = 0 \Rightarrow v_y = v_x = 0 \Rightarrow f' = u_x + iv_x = 0 \Rightarrow f \text{ is constant}`,
      text: "u = c gives u_x = u_y = 0; CR gives v_y = v_x = 0; so f' = 0 and f is constant",
      values: { fprime: c(0, 0), constant: true },
    },
  },
]);

// ------------------------------------------------------------------ Topics
export const TOPICS = deepFreeze([
  {
    id: 'T1.1', chapter: 1, title: 'Algebraic properties', thread: 'T1',
    summary: 'A complex number is an ordered pair (x, y), written x + iy. Add, subtract, multiply and divide by the definitions, the field laws hold, and the conjugate is the mirror across the real axis.',
    covers: [
      'complex numbers as ordered pairs (x, y) and as x + iy',
      '+, −, ×, ÷',
      'field properties (commutative, associative, distributive, identities, inverses)',
      'Re(z), Im(z)',
      'conjugates and their algebraic properties',
    ],
    stations: ['addresses', 'arithmetic'],
  },
  {
    id: 'T1.2', chapter: 1, title: 'Geometric interpretation', thread: 'T1',
    summary: '|z| is the length of the arrow from 0 to z, and |z₁ − z₂| is the distance between two points. The triangle inequality says one side of a triangle is at most the sum of the other two.',
    covers: [
      'complex numbers as vectors',
      'modulus |z| and its meaning',
      'distance between two complex numbers',
      'triangle inequality |z₁ + z₂| ≤ |z₁| + |z₂| and related inequalities (e.g. lower bounds, ||z₁| − |z₂|| ≤ |z₁ ± z₂|)',
    ],
    stations: ['distance'],
  },
  {
    id: 'T1.3', chapter: 1, title: 'Polar representation', thread: 'T1',
    summary: 'The polar address (r, θ) reaches the same point as (x, y). θ is only defined up to full turns: arg z is the whole set of angles θ + 2πk, and Arg z is the one in (−π, π]. Multiplying multiplies lengths and adds angles.',
    covers: [
      'polar coordinates (r, θ), z = r(cos θ + i sin θ)',
      'arg z and the principal argument Arg z',
      'exponential form and Euler’s formula e^{iθ} = cos θ + i sin θ',
      'geometric meaning of multiplication and division in polar/exponential form',
    ],
    stations: ['addresses', 'arithmetic', 'staircase', 'powers'],
  },
  {
    id: 'T1.4', chapter: 1, title: 'Powers and roots', thread: 'T2',
    summary: 'Powers raise the length and multiply the angle. To solve zⁿ = c, take the n-th root of the length and divide every step of the staircase of c by n, which gives n points on a circle. The quadratic formula is a square root in disguise.',
    covers: [
      'computing powers',
      'all n-th roots of unity (and primitive roots)',
      'solving zⁿ = c',
      'quadratic formula in ℂ',
    ],
    stations: ['powers', 'roots'],
  },
  {
    id: 'T1.5', chapter: 1, title: 'Sets of points', thread: 'T3',
    summary: 'A curve z(t) is a point moving with time. A set is understood through tiny disks: a point is interior, exterior or on the boundary depending on what the disk around it contains. Open, closed, bounded, connected and domain all follow.',
    covers: [
      'parameterizing curves (smooth, piecewise smooth, closed, simple)',
      'positive/negative orientation of simple closed curves',
      'ε-neighborhoods and punctured disks',
      'interior, exterior and boundary points',
      'open, closed, connected, bounded sets',
      'domains and regions',
    ],
    stations: ['curves', 'sets'],
  },
  {
    id: 'T2.1', chapter: 2, title: 'Complex functions and mappings', thread: 'T1',
    summary: 'w = f(z) sends each point of the z-plane to a point of the w-plane. Write it as u + iv in (x, y) or in (r, θ). Translations, rotations and magnifications combine into the linear maps az + b.',
    covers: [
      'w = f(z); domain, range, images of sets',
      'Cartesian form u(x, y) + iv(x, y)',
      'polar form f(re^{iθ}) = u(r, θ) + iv(r, θ)',
      'inverse functions and one-to-one',
      'elementary mappings: translation, rotation, magnification, linear transformations',
    ],
    stations: ['mappings', 'linear', 'powermap', 'lab'],
  },
  {
    id: 'T2.2', chapter: 2, title: 'Power and root functions', thread: 'T2',
    summary: 'w = zⁿ raises the length to the n-th power and multiplies the angle by n, so a sector opens n times wider. The principal root uses Arg: w^(1/n) = |w|^(1/n) e^{i Arg(w)/n}.',
    covers: [
      'w = zⁿ (multiplies the angle by n, raises the modulus to the n-th power)',
      'principal square root z^{1/2} and principal n-th root z^{1/n}',
      'images of regions',
    ],
    stations: ['powermap', 'principal-root', 'lab', 'graph4d'],
  },
  {
    id: 'T2.3', chapter: 2, title: 'Limits and continuity', thread: 'T3',
    summary: 'A limit exists only if every way of approaching the point gives the same value. To show a limit does not exist, find two paths with different values. A limit of f splits into the limits of u and v.',
    covers: [
      'ε–δ definitions for u(x, y) and f(z)',
      'limits via real and imaginary parts',
      'showing a limit does not exist by approaching along different curves',
      'limit laws',
      'continuity',
    ],
    stations: ['limits'],
  },
  {
    id: 'T2.4', chapter: 2, title: 'Multiple-valued functions and branches', thread: 'T2',
    summary: 'An angle has many names, so z^(1/n) and log z have many values. A branch picks one name for every point by choosing a window of angles. The seam of the window is the branch cut, where the value jumps.',
    covers: [
      'single- vs multiple-valued',
      'branches',
      'branch cuts and branch points',
      'where a branch is continuous or discontinuous',
    ],
    stations: ['staircase', 'branches', 'graph4d'],
  },
  {
    id: 'T2.5', chapter: 2, title: 'Reciprocal transformation and extended plane', thread: 'T1',
    summary: 'w = 1/z inverts the length and negates the angle: inversion in the unit circle, then a mirror. It sends lines and circles to lines and circles. The point at infinity becomes an ordinary place on the Riemann sphere.',
    covers: [
      'w = 1/z as inversion followed by reflection',
      'the point at infinity',
      'the Riemann sphere and stereographic projection',
      '1/z maps generalized circles (lines and circles) to generalized circles',
    ],
    stations: ['reciprocal', 'lab', 'graph4d'],
  },
  {
    id: 'T3.1', chapter: 3, title: 'Derivatives', thread: 'T3',
    summary: 'f′(z₀) is the limit of (f(z) − f(z₀))/(z − z₀) taken from every direction at once. Differentiable means that near z₀ the map is a single spin-and-stretch. Differentiable implies continuous, but conj z is continuous and differentiable nowhere.',
    covers: [
      'limit definition f′(z₀) = lim (f(z) − f(z₀))/(z − z₀)',
      'differentiability vs continuity (e.g. conj(z) is continuous everywhere, differentiable nowhere)',
      'analytic, entire, singular points',
      'differentiation rules (constant, power, product, quotient, chain)',
    ],
    stations: ['derivative', 'graph4d'],
  },
  {
    id: 'T3.2', chapter: 3, title: 'Cauchy–Riemann', thread: 'T3',
    summary: 'Take the limit along the horizontal direction, then along the vertical one, and demand they agree: u_x = v_y and u_y = −v_x. With continuous partials these equations are enough, and f′ = u_x + iv_x. They are the "no mirror" condition.',
    covers: [
      'derivation by limits along horizontal and vertical paths',
      'u_x = v_y, u_y = −v_x',
      'CR plus continuous partials ⇒ differentiable/analytic',
      'f′(z) = u_x + iv_x = v_y − iu_y',
      'consequences (an analytic function with constant modulus, or zero derivative, on a domain is constant)',
    ],
    stations: ['cauchy-riemann'],
  },
]);

// ------------------------------------------------------------------ Lookups
const PROBLEM_BY_ID = new Map(PROBLEMS.map((p) => [p.id, p]));
const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));
const PROBLEM_ROUTE = /^(?:\d+-\d+-\d+|P\d+)$/; // what follows "problem-"
const TOPIC_ROUTE = /^T\d+-\d+$/;                // what follows "topic-"
const INDEX_STATION = 'problems';                // the station that lists everything

export function problemById(id) {
  return PROBLEM_BY_ID.get(id) || null;
}

export function topicById(id) {
  return TOPIC_BY_ID.get(id) || null;
}

// Problems a station shows: the ones it owns plus the ones it also lists (registry `problems`).
// 'problems' (the index) gets all 29. Handout order. A fresh array every call.
export function problemsForStation(stationId) {
  if (stationId === INDEX_STATION) return PROBLEMS.slice();
  return PROBLEMS.filter((p) => p.station === stationId || p.alsoAt.includes(stationId));
}

export function topicsForStation(stationId) {
  if (stationId === INDEX_STATION) return TOPICS.slice();
  return TOPICS.filter((t) => t.stations.includes(stationId));
}

export function problemsForTopic(topicId) {
  return PROBLEMS.filter((p) => p.topics.includes(topicId));
}

// '1.4.2' -> 'problem-1-4-2', 'P3' -> 'problem-P3'; null for an id that is not one of the 29.
export function routeFor(problemId) {
  return PROBLEM_BY_ID.has(problemId) ? 'problem-' + problemId.replace(/\./g, '-') : null;
}

// 'problem-1-4-2' -> '1.4.2', 'problem-P3' -> 'P3'; null for anything else (also for unknown ids).
export function idFromRoute(token) {
  if (typeof token !== 'string' || !token.startsWith('problem-')) return null;
  const rest = token.slice('problem-'.length);
  if (!PROBLEM_ROUTE.test(rest)) return null;
  const id = rest.replace(/-/g, '.');
  return PROBLEM_BY_ID.has(id) ? id : null;
}

export function topicRoute(topicId) {
  return TOPIC_BY_ID.has(topicId) ? 'topic-' + topicId.replace(/\./g, '-') : null;
}

export function topicFromRoute(token) {
  if (typeof token !== 'string' || !token.startsWith('topic-')) return null;
  const rest = token.slice('topic-'.length);
  if (!TOPIC_ROUTE.test(rest)) return null;
  const id = rest.replace(/-/g, '.');
  return TOPIC_BY_ID.has(id) ? id : null;
}

// ------------------------------------------------------------------ Display helpers
// A statement alternates prose and maths: 'Find $x$ and $y$.' -> text, math, text, math, text.
export function statementParts(statement) {
  const parts = [];
  if (typeof statement !== 'string') return parts;
  statement.split('$').forEach((chunk, i) => {
    if (chunk !== '') parts.push({ math: i % 2 === 1, text: chunk });
  });
  return parts;
}

export const ADDRESS_CODES = Object.freeze(['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both']);

const ADDRESS_INFO = deepFreeze({
  'C': { label: 'Cartesian', short: 'C', tones: ['--cart'] },
  'P': { label: 'Polar', short: 'P', tones: ['--polar'] },
  'C->P': { label: 'Cartesian, then polar', short: 'C→P', tones: ['--cart', '--polar'] },
  'P->C': { label: 'Polar, then Cartesian', short: 'P→C', tones: ['--polar', '--cart'] },
  'C->P->C': { label: 'Cartesian, polar, then back', short: 'C→P→C', tones: ['--cart', '--polar', '--cart'] },
  'both': { label: 'Either address', short: 'C or P', tones: ['--cart', '--polar'] },
});

// Own keys only, so 'constructor' or 'toString' are unknown codes, not inherited Object members.
function addressInfo(code) {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(ADDRESS_INFO, code) ? ADDRESS_INFO[code] : null;
}

// Human label for an address code ('' for an unknown code).
export function addressLabel(code, { short = false } = {}) {
  const info = addressInfo(code);
  return info ? (short ? info.short : info.label) : '';
}

// CSS custom-property names, in the order the chip should show them ([] for an unknown code).
export function addressTones(code) {
  const info = addressInfo(code);
  return info ? info.tones.slice() : [];
}
````

## Appendix B: `js/data/functions.js` (copy exactly)

````js
// js/data/functions.js: the catalogue of the functions that appear on Test 1.
// Pure data. No imports, no DOM, no window. Stations compile `src` with js/core/parse.js:
//   const { f } = compile(fnById('sq').src);
//
// Field notes (see docs/designs/iter-1/i1-data.md):
//  - `src` is parse.js grammar; `tex` is the function as TeX; `label` is the short text for a chip.
//  - `cart` / `polar` are the TeX of u and v in (x, y) and in (r, θ) (θ = Arg z), or null when there is no
//    short closed form (sqrt and the cube root: that is the point of the polar address).
//  - `analytic` means analytic on the plane minus its singular points (sqrt and cbrt: off the cut).
//  - `poles` lists the singular points at which f is undefined. For 1/z that is a true pole; for the
//    direction-only functions (dir, x-over-z) 0 is a point where f has no limit, listed for the plots.
//  - `derivativeTex` is f′ as TeX when f is analytic, else null.
//  - `problems` are the review problems the function is the subject of. `stations` are the stations that offer
//    the function (as the default, a chip or a preset), in registry order; the Lab offers all of them.
//    Every id exists in the registry and in problems.js.
//  - Every exported object is deep-frozen. Copy before mutating.

const T = String.raw; // keeps TeX backslashes readable
const ORIGIN = { re: 0, im: 0 };

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

export const FUNCTIONS = deepFreeze([
  {
    id: 'sq', label: 'z²', tex: 'z^2', src: 'z^2',
    problems: ['2.1.2'], stations: ['mappings', 'powermap', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'Squares the length and doubles the angle.',
    cart: { u: 'x^2 - y^2', v: '2xy' },
    polar: { u: T`r^2\cos 2\theta`, v: T`r^2\sin 2\theta` },
    derivativeTex: '2z',
  },
  {
    id: 'cube', label: 'z³', tex: 'z^3', src: 'z^3',
    problems: ['2.2.1'], stations: ['powermap', 'derivative', 'lab'],
    analytic: true, poles: [],
    note: 'Cubes the length and triples the angle, so a sector opens three times wider.',
    cart: { u: 'x^3 - 3xy^2', v: '3x^2y - y^3' },
    polar: { u: T`r^3\cos 3\theta`, v: T`r^3\sin 3\theta` },
    derivativeTex: '3z^2',
  },
  {
    id: 'recip', label: '1/z', tex: T`\dfrac{1}{z}`, src: '1/z',
    problems: ['2.5.1'], stations: ['mappings', 'reciprocal', 'derivative', 'lab', 'graph4d'],
    analytic: true, poles: [ORIGIN],
    note: 'Length r becomes 1/r and angle θ becomes −θ: invert in the unit circle, then mirror across the real axis.',
    cart: { u: T`\dfrac{x}{x^2 + y^2}`, v: T`-\dfrac{y}{x^2 + y^2}` },
    polar: { u: T`\dfrac{\cos\theta}{r}`, v: T`-\dfrac{\sin\theta}{r}` },
    derivativeTex: T`-\dfrac{1}{z^2}`,
  },
  {
    id: 'linear-i', label: 'iz − 2i', tex: 'iz - 2i', src: 'iz - 2i',
    problems: ['2.1.3'], stations: ['mappings', 'linear', 'lab'],
    analytic: true, poles: [],
    note: 'It equals i(z − 2): slide left 2, then a counterclockwise quarter turn.',
    cart: { u: '-y', v: 'x - 2' },
    polar: { u: T`-r\sin\theta`, v: T`r\cos\theta - 2` },
    derivativeTex: 'i',
  },
  {
    id: 'linear-1i', label: '(1 + i)z', tex: '(1 + i)z', src: '(1+i)z',
    problems: ['P4'], stations: ['linear', 'lab'],
    analytic: true, poles: [],
    note: 'Spin 45° and stretch by √2.',
    cart: { u: 'x - y', v: 'x + y' },
    polar: { u: T`\sqrt{2}\,r\cos\left(\theta + \tfrac{\pi}{4}\right)`, v: T`\sqrt{2}\,r\sin\left(\theta + \tfrac{\pi}{4}\right)` },
    derivativeTex: '1 + i',
  },
  {
    id: 'sq-plus-iz', label: 'z² + iz', tex: 'z^2 + iz', src: 'z^2 + iz',
    problems: ['2.1.1'], stations: ['mappings', 'lab'],
    analytic: true, poles: [],
    note: 'z² plus a quarter turn of z. Writing it as u + iv is problem 2.1.1.',
    cart: { u: 'x^2 - y^2 - y', v: '2xy + x' },
    polar: { u: T`r^2\cos 2\theta - r\sin\theta`, v: T`r^2\sin 2\theta + r\cos\theta` },
    derivativeTex: '2z + i',
  },
  {
    id: 'sq-plus-z', label: 'z² + z', tex: 'z^2 + z', src: 'z^2 + z',
    problems: ['3.1.1'], stations: ['derivative', 'cauchy-riemann', 'lab'],
    analytic: true, poles: [],
    note: 'Differentiable everywhere: f′(z) = 2z + 1.',
    cart: { u: 'x^2 - y^2 + x', v: '2xy + y' },
    polar: { u: T`r^2\cos 2\theta + r\cos\theta`, v: T`r^2\sin 2\theta + r\sin\theta` },
    derivativeTex: '2z + 1',
  },
  {
    id: 'exp', label: 'e^z', tex: 'e^{z}', src: 'exp(z)',
    problems: ['3.2.1'], stations: ['derivative', 'cauchy-riemann', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'e^x(cos y + i sin y): length e^x and angle y, so the Cartesian address of z is the polar address of w.',
    cart: { u: T`e^{x}\cos y`, v: T`e^{x}\sin y` },
    polar: { u: T`e^{r\cos\theta}\cos(r\sin\theta)`, v: T`e^{r\cos\theta}\sin(r\sin\theta)` },
    derivativeTex: 'e^{z}',
  },
  {
    id: 'conj', label: 'conj z', tex: T`\overline{z}`, src: 'conj(z)',
    problems: ['1.1.2', 'P1', 'P2'], stations: ['arithmetic', 'mappings', 'derivative', 'cauchy-riemann', 'lab'],
    analytic: false, poles: [],
    note: 'Mirror across the real axis. Continuous everywhere, differentiable nowhere.',
    cart: { u: 'x', v: '-y' },
    polar: { u: T`r\cos\theta`, v: T`-r\sin\theta` },
    derivativeTex: null,
  },
  {
    id: 're', label: 'Re z', tex: T`\operatorname{Re}(z)`, src: 'Re(z)',
    problems: ['P6'], stations: ['derivative', 'cauchy-riemann', 'lab'],
    analytic: false, poles: [],
    note: 'Squashes the whole plane flat onto the real axis. Differentiable nowhere.',
    cart: { u: 'x', v: '0' },
    polar: { u: T`r\cos\theta`, v: '0' },
    derivativeTex: null,
  },
  {
    id: 'abs2', label: '|z|²', tex: '|z|^2', src: 'abs(z)^2',
    problems: ['3.1.2'], stations: ['derivative', 'cauchy-riemann', 'lab'],
    analytic: false, poles: [],
    note: 'Squares the length and forgets the angle, so the output is real. Differentiable only at 0.',
    cart: { u: 'x^2 + y^2', v: '0' },
    polar: { u: 'r^2', v: '0' },
    derivativeTex: null,
  },
  {
    id: 'dir', label: 'z²/|z|²', tex: T`\dfrac{z^2}{|z|^2}`, src: 'z^2/abs(z)^2',
    problems: ['2.3.1'], stations: ['limits', 'lab'],
    analytic: false, poles: [ORIGIN],
    note: 'Forgets the length and keeps twice the angle: z²/|z|² = e^{2iθ}. Not defined at 0.',
    cart: { u: T`\dfrac{x^2 - y^2}{x^2 + y^2}`, v: T`\dfrac{2xy}{x^2 + y^2}` },
    polar: { u: T`\cos 2\theta`, v: T`\sin 2\theta` },
    derivativeTex: null,
  },
  {
    id: 'sqrt', label: '√z', tex: T`\sqrt{z}`, src: 'sqrt(z)',
    problems: ['2.2.2'], stations: ['principal-root', 'branches', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'Principal square root: square-root the length and halve Arg z. It jumps across the negative real axis, so it is analytic only off that cut.',
    cart: null,
    polar: { u: T`\sqrt{r}\cos\dfrac{\theta}{2}`, v: T`\sqrt{r}\sin\dfrac{\theta}{2}` },
    derivativeTex: T`\dfrac{1}{2\sqrt{z}}`,
  },
  {
    id: 'cbrt', label: 'z^(1/3)', tex: 'z^{1/3}', src: 'z^(1/3)',
    problems: ['2.4.1'], stations: ['principal-root', 'branches', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'Principal cube root: cube-root the length and divide Arg z by 3. It jumps across the negative real axis; moving the seam gives the other branches.',
    cart: null,
    polar: { u: T`r^{1/3}\cos\dfrac{\theta}{3}`, v: T`r^{1/3}\sin\dfrac{\theta}{3}` },
    derivativeTex: T`\dfrac{1}{3}z^{-2/3}`,
  },
  {
    id: 'x-over-z', label: '(Re(1 + z) − 1)/z', tex: T`\dfrac{\operatorname{Re}(1 + z) - 1}{z}`, src: '(Re(1+z) - 1)/z',
    problems: ['P5'], stations: ['limits', 'lab'],
    analytic: false, poles: [ORIGIN],
    note: 'It equals x/z = cos θ e^(−iθ): the value depends on the direction, so there is no limit at 0.',
    cart: { u: T`\dfrac{x^2}{x^2 + y^2}`, v: T`-\dfrac{xy}{x^2 + y^2}` },
    polar: { u: T`\cos^2\theta`, v: T`-\cos\theta\sin\theta` },
    derivativeTex: null,
  },
]);

const FN_BY_ID = new Map(FUNCTIONS.map((f) => [f.id, f]));

export function fnById(id) {
  return FN_BY_ID.get(id) || null;
}
````

## Appendix C: `tests/unit/i1-data.test.mjs` (copy exactly)

````js
// tests/unit/i1-data.test.mjs: unit tests for js/data/problems.js and js/data/functions.js.
// Expected numbers are written with Math only (no complex.js, no parse.js), so these tests stand alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import * as P from '../../js/data/problems.js';
import { FUNCTIONS, fnById } from '../../js/data/functions.js';
import { STATIONS, stationForProblem } from '../../js/registry.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => fs.readFileSync(ROOT + rel, 'utf8');
const { PROBLEMS, TOPICS } = P;

const PI = Math.PI;
const S2 = Math.sqrt(2);
const S3 = Math.sqrt(3);
const EPS = 1e-9;

function near(actual, expected, eps = EPS, msg = '') {
  assert.ok(Math.abs(actual - expected) <= eps, `${msg} expected ${expected}, got ${actual}`);
}
function nearC(actual, expected, eps = EPS, msg = '') {
  assert.ok(actual && typeof actual.re === 'number' && typeof actual.im === 'number', `${msg} not a complex number: ${JSON.stringify(actual)}`);
  near(actual.re, expected.re, eps, `${msg} re:`);
  near(actual.im, expected.im, eps, `${msg} im:`);
}
const C = (re, im) => ({ re, im });

// ------------------------------------------------------------------ fixtures
const HANDOUT_IDS = [
  '1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2', '1.4.1', '1.4.2', '1.4.3', '1.5.1', '1.5.2',
  '2.1.1', '2.1.2', '2.1.3', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.5.1',
  '3.1.1', '3.1.2', '3.2.1', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7',
];
const TOPIC_IDS = ['T1.1', 'T1.2', 'T1.3', 'T1.4', 'T1.5', 'T2.1', 'T2.2', 'T2.3', 'T2.4', 'T2.5', 'T3.1', 'T3.2'];
const FUNCTION_IDS = ['sq', 'cube', 'recip', 'linear-i', 'linear-1i', 'sq-plus-iz', 'sq-plus-z', 'exp', 'conj', 're', 'abs2', 'dir', 'sqrt', 'cbrt', 'x-over-z'];
const ADDRESSES = ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both'];
const REAL_STATIONS = STATIONS.filter((s) => s.id !== 'problems');

const sorted = (a) => [...a].sort();
const stripWs = (s) => s.replace(/\s+/g, '');

// KaTeX loaded from the vendored UMD file, without a browser.
const katexSandbox = {};
katexSandbox.self = katexSandbox;
vm.runInNewContext(read('vendor/katex/katex.min.js'), katexSandbox);
const katex = katexSandbox.katex;
const renders = (src) => {
  try { katex.renderToString(src, { throwOnError: true, strict: 'error' }); return null; } catch (e) { return e.message; }
};

// ================================================================== A1
test('A1: exactly the 29 handout problems, in handout order, matching ASSIGNMENT.md', () => {
  assert.equal(PROBLEMS.length, 29);
  assert.deepEqual(PROBLEMS.map((p) => p.id), HANDOUT_IDS);
  const assignment = read('docs/ASSIGNMENT.md').split('## 2. Test 1 review problems')[1].split('## 3.')[0];
  const ids = [...assignment.matchAll(/^- (\d\.\d\.\d|P\d) /gm)].map((m) => m[1]);
  assert.deepEqual(ids, HANDOUT_IDS, 'the id list in this test must match docs/ASSIGNMENT.md section 2');
  assert.equal(new Set(PROBLEMS.map((p) => p.id)).size, 29);
});

test('A1: exactly the 12 topics, in syllabus order', () => {
  assert.equal(TOPICS.length, 12);
  assert.deepEqual(TOPICS.map((t) => t.id), TOPIC_IDS);
});

test('A1: every problem has the required fields and agrees with the registry', () => {
  const kindOf = (id) => (id.startsWith('P') ? 'proof' : 'problem');
  for (const p of PROBLEMS) {
    const where = `problem ${p.id}`;
    assert.equal(p.kind, kindOf(p.id), `${where} kind`);
    // numbered problems carry their handout chapter; the proofs are their own block (chapter 0)
    assert.equal(p.chapter, p.kind === 'proof' ? 0 : Number(p.id[0]), `${where} chapter`);
    assert.ok(typeof p.section === 'string' && p.section.length > 5, `${where} section`);
    assert.equal(p.section === 'Proof Examples', p.kind === 'proof', `${where} section/kind`);
    assert.ok(typeof p.statement === 'string' && p.statement.length > 20, `${where} statement`);
    assert.ok(typeof p.aha === 'string' && p.aha.length > 10, `${where} aha`);
    assert.ok(typeof p.addressWhy === 'string' && p.addressWhy.length > 10, `${where} addressWhy`);
    assert.ok(ADDRESSES.includes(p.address), `${where} address ${p.address}`);
    assert.ok(['T1', 'T2', 'T3'].includes(p.thread), `${where} thread`);
    assert.ok(Array.isArray(p.topics) && p.topics.length >= 1, `${where} topics`);
    for (const t of p.topics) assert.ok(TOPIC_IDS.includes(t), `${where} topic ${t}`);
    assert.ok(p.routes && p.routes.cart.length > 20 && p.routes.polar.length > 20, `${where} routes`);
    assert.ok(p.answer && p.answer.tex.length > 3 && p.answer.text.length > 3, `${where} answer strings`);
    assert.ok(p.answer.values && typeof p.answer.values === 'object', `${where} answer.values`);
    // registry agreement
    const owner = stationForProblem(p.id);
    assert.ok(owner, `${where} has a registry station`);
    assert.equal(p.station, owner.id, `${where} station`);
    const listing = STATIONS.filter((s) => s.id !== 'problems' && s.problems.includes(p.id)).map((s) => s.id);
    assert.deepEqual(sorted([p.station, ...p.alsoAt]), sorted(listing), `${where} station + alsoAt equals the registry listing`);
    assert.ok(!p.alsoAt.includes(p.station), `${where} alsoAt excludes the owner`);
    const st = STATIONS.find((s) => s.id === p.station);
    assert.ok(st.threads.includes(p.thread), `${where} thread ${p.thread} is one of ${p.station}'s threads`);
    for (const t of p.topics) assert.ok(st.topics.includes(t), `${where} topic ${t} is one of ${p.station}'s topics`);
  }
});

test('A1: each problem is tagged with the syllabus topics the design chose', () => {
  const expected = {
    '1.1.1': ['T1.1'], '1.1.2': ['T1.1'], '1.2.1': ['T1.2'], '1.2.2': ['T1.2'], '1.3.1': ['T1.3'], '1.3.2': ['T1.3', 'T1.4'],
    '1.4.1': ['T1.4'], '1.4.2': ['T1.4'], '1.4.3': ['T1.4'], '1.5.1': ['T1.5'], '1.5.2': ['T1.5'],
    '2.1.1': ['T2.1'], '2.1.2': ['T2.1'], '2.1.3': ['T2.1'], '2.2.1': ['T2.2'], '2.2.2': ['T2.2'], '2.3.1': ['T2.3'],
    '2.4.1': ['T2.4'], '2.5.1': ['T2.5'], '3.1.1': ['T3.1'], '3.1.2': ['T3.1'], '3.2.1': ['T3.2'],
    P1: ['T1.1'], P2: ['T1.1', 'T1.3'], P3: ['T2.1'], P4: ['T2.1'], P5: ['T2.3'], P6: ['T3.1'], P7: ['T3.2'],
  };
  for (const p of PROBLEMS) assert.deepEqual(p.topics, expected[p.id], `topics of ${p.id}`);
  const threads = { T1: [], T2: [], T3: [] };
  for (const t of TOPICS) threads[t.thread].push(t.id);
  assert.deepEqual(threads, { T1: ['T1.1', 'T1.2', 'T1.3', 'T2.1', 'T2.5'], T2: ['T1.4', 'T2.2', 'T2.4'], T3: ['T1.5', 'T2.3', 'T3.1', 'T3.2'] });
});

test('A1: the Problem Index filters give 11 / 8 / 3 numbered problems and 7 proofs', () => {
  const ids = (f) => PROBLEMS.filter(f).map((p) => p.id);
  assert.equal(ids((p) => p.chapter === 1).length, 11);
  assert.equal(ids((p) => p.chapter === 2).length, 8);
  assert.deepEqual(ids((p) => p.chapter === 3), ['3.1.1', '3.1.2', '3.2.1']);
  assert.deepEqual(ids((p) => p.kind === 'proof'), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  assert.deepEqual(ids((p) => p.id.startsWith('3.')), ['3.1.1', '3.1.2', '3.2.1']);
});

test('A1: every topic exists in the registry with the right stations and at least one problem', () => {
  for (const t of TOPICS) {
    const where = `topic ${t.id}`;
    assert.equal(t.chapter, Number(t.id[1]), `${where} chapter`);
    assert.ok(t.title.length > 3 && t.summary.length > 40, `${where} title and summary`);
    assert.ok(['T1', 'T2', 'T3'].includes(t.thread), `${where} thread`);
    assert.ok(Array.isArray(t.covers) && t.covers.length >= 3 && t.covers.every((s) => typeof s === 'string' && s.length > 3), `${where} covers`);
    assert.ok(t.stations.length >= 1, `${where} has a station`);
    for (const sid of t.stations) {
      const st = STATIONS.find((s) => s.id === sid);
      assert.ok(st, `${where} station ${sid} exists`);
      assert.ok(st.topics.includes(t.id), `${where} is listed by station ${sid}`);
    }
    const listing = STATIONS.filter((s) => s.id !== 'problems' && s.topics.includes(t.id)).map((s) => s.id);
    assert.deepEqual(t.stations, listing, `${where} stations equal the registry listing, in registry order`);
    assert.ok(P.problemsForTopic(t.id).length >= 1, `${where} has at least one problem`);
  }
});

test('A1: routes round-trip and reject everything else', () => {
  assert.equal(P.routeFor('1.4.2'), 'problem-1-4-2');
  assert.equal(P.routeFor('P3'), 'problem-P3');
  assert.equal(P.idFromRoute('problem-1-4-2'), '1.4.2');
  assert.equal(P.idFromRoute('problem-P3'), 'P3');
  assert.equal(P.idFromRoute('roots'), null);
  assert.equal(P.topicRoute('T1.4'), 'topic-T1-4');
  assert.equal(P.topicFromRoute('topic-T1-4'), 'T1.4');
  for (const id of HANDOUT_IDS) {
    const r = P.routeFor(id);
    assert.match(r, /^problem-[A-Za-z0-9-]+$/, `route token for ${id} uses only route characters`);
    assert.equal(P.idFromRoute(r), id);
  }
  for (const id of TOPIC_IDS) {
    const r = P.topicRoute(id);
    assert.match(r, /^topic-T\d-\d$/);
    assert.equal(P.topicFromRoute(r), id);
  }
  for (const bad of ['problem-9-9-9', 'problem-p3', 'problem-', 'problem', 'problem-1.4.2', 'problem-1-4', 'problem-P', 'topic-T1-4', '', null, undefined, 42, {}]) {
    assert.equal(P.idFromRoute(bad), null, `idFromRoute(${String(bad)})`);
  }
  for (const bad of ['topic-T9-9', 'topic-T1.4', 'topic-', 'topic', 'problem-1-4-2', '', null, undefined, 42]) {
    assert.equal(P.topicFromRoute(bad), null, `topicFromRoute(${String(bad)})`);
  }
  for (const bad of ['9.9.9', '', null, undefined, 42, 'T1.4']) assert.equal(P.routeFor(bad), null, `routeFor(${String(bad)})`);
  for (const bad of ['T9.9', '', null, undefined, 42, '1.4.2']) assert.equal(P.topicRoute(bad), null, `topicRoute(${String(bad)})`);
});

test('A1: lookups', () => {
  assert.equal(P.problemById('1.4.2').station, 'roots');
  assert.equal(P.problemById('nope'), null);
  assert.equal(P.problemById(undefined), null);
  assert.equal(P.topicById('T1.4').title, 'Powers and roots');
  assert.equal(P.topicById('nope'), null);
  // handout order, registry agreement, and fresh arrays
  for (const st of STATIONS) {
    const got = P.problemsForStation(st.id).map((p) => p.id);
    assert.deepEqual(sorted(got), sorted(st.problems), `problemsForStation(${st.id})`);
    assert.deepEqual(got, HANDOUT_IDS.filter((id) => got.includes(id)), `problemsForStation(${st.id}) is in handout order`);
    const tg = P.topicsForStation(st.id).map((t) => t.id);
    assert.deepEqual(sorted(tg), sorted(st.topics), `topicsForStation(${st.id})`);
  }
  assert.deepEqual(P.problemsForStation('arithmetic').map((p) => p.id), ['1.1.1', '1.1.2', 'P1', 'P2']);
  assert.deepEqual(P.problemsForStation('lab').map((p) => p.id), ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
  assert.deepEqual(P.problemsForStation('home'), []);
  assert.deepEqual(P.problemsForStation('graph4d'), []);
  assert.deepEqual(P.problemsForStation('nope'), []);
  assert.deepEqual(P.topicsForStation('nope'), []);
  assert.equal(P.problemsForStation('problems').length, 29);
  assert.equal(P.topicsForStation('problems').length, 12);
  assert.deepEqual(P.problemsForTopic('T1.4').map((p) => p.id), ['1.3.2', '1.4.1', '1.4.2', '1.4.3']);
  assert.deepEqual(P.problemsForTopic('T3.2').map((p) => p.id), ['3.2.1', 'P7']);
  assert.deepEqual(P.problemsForTopic('nope'), []);
  const a = P.problemsForStation('roots');
  a.pop();
  assert.equal(P.problemsForStation('roots').length, 3, 'callers get a fresh array');
});

test('A1: address helpers', () => {
  assert.deepEqual([...P.ADDRESS_CODES], ADDRESSES);
  assert.equal(P.addressLabel('C'), 'Cartesian');
  assert.equal(P.addressLabel('P'), 'Polar');
  assert.equal(P.addressLabel('C->P->C', { short: true }), 'C→P→C');
  assert.equal(P.addressLabel('nope'), '');
  assert.deepEqual(P.addressTones('C'), ['--cart']);
  assert.deepEqual(P.addressTones('P'), ['--polar']);
  assert.deepEqual(P.addressTones('C->P'), ['--cart', '--polar']);
  assert.deepEqual(P.addressTones('P->C'), ['--polar', '--cart']);
  assert.deepEqual(P.addressTones('C->P->C'), ['--cart', '--polar', '--cart']);
  assert.deepEqual(P.addressTones('both'), ['--cart', '--polar']);
  assert.deepEqual(P.addressTones('nope'), []);
  // inherited Object members and non-strings are unknown codes, never a throw or undefined
  for (const bad of ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', undefined, null, 7, {}]) {
    assert.equal(P.addressLabel(bad), '', `addressLabel(${String(bad)})`);
    assert.equal(P.addressLabel(bad, { short: true }), '', `addressLabel(${String(bad)}, short)`);
    assert.deepEqual(P.addressTones(bad), [], `addressTones(${String(bad)})`);
  }
  for (const a of ADDRESSES) {
    assert.ok(P.addressLabel(a).length > 3 && P.addressLabel(a, { short: true }).length >= 1);
    for (const tone of P.addressTones(a)) assert.match(tone, /^--(cart|polar)$/, 'tones are token names, never colours');
  }
  const t = P.addressTones('C');
  t.push('x');
  assert.deepEqual(P.addressTones('C'), ['--cart'], 'tones are copied');
  // addresses pinned to STORY section 3
  const expected = {
    '1.1.1': 'C', '1.1.2': 'C', '1.2.1': 'P', '1.2.2': 'C', '1.3.1': 'C->P', '1.3.2': 'C->P->C', '1.4.1': 'P', '1.4.2': 'P->C',
    '1.4.3': 'C', '1.5.1': 'C', '1.5.2': 'P', '2.1.1': 'both', '2.1.2': 'C', '2.1.3': 'both', '2.2.1': 'P', '2.2.2': 'P',
    '2.3.1': 'P', '2.4.1': 'P', '2.5.1': 'P', '3.1.1': 'C', '3.1.2': 'P', '3.2.1': 'C',
    P1: 'both', P2: 'P', P3: 'C', P4: 'P', P5: 'P', P6: 'both', P7: 'C',
  };
  for (const p of PROBLEMS) assert.equal(p.address, expected[p.id], `address of ${p.id}`);
});

// ================================================================== A2
const SQRT2 = S2;
const VALUE_CASES = {
  '1.1.1': (v) => {
    nearC(v.product, C(5, 14)); nearC(v.quotient, C(-11 / 17, -10 / 17)); near(v.productAbs, Math.sqrt(221));
    // independent checks with plain arithmetic
    const [a, b, c, d] = [3, -2, -1, 4];
    nearC(v.product, C(a * c - b * d, a * d + b * c));
    nearC(v.quotient, C((a * c + b * d) / (c * c + d * d), (-a * d + c * b) / (c * c + d * d)));
    near(v.productAbs, Math.hypot(a, b) * Math.hypot(c, d));
  },
  '1.1.2': (v) => { near(v.im, 6); nearC(v.difference, C(4, -6)); },
  '1.2.1': (v) => { nearC(v.center, C(1, 2)); near(v.radius, 3); },
  '1.2.2': (v) => { near(v.distance, Math.sqrt(29)); nearC(v.difference, C(5, 2)); near(v.distance, Math.hypot(4 - -1, 3 - 1)); },
  '1.3.1': (v) => {
    near(v.r, 2); near(v.theta, (2 * PI) / 3); near(v.Arg, (2 * PI) / 3); nearC(v.z, C(-1, S3));
    near(v.r, Math.hypot(v.z.re, v.z.im)); near(v.Arg, Math.atan2(v.z.im, v.z.re));
    nearC(C(v.r * Math.cos(v.theta), v.r * Math.sin(v.theta)), v.z);
  },
  '1.3.2': (v) => {
    nearC(v.result, C(512, -512 * S3), 1e-6); near(v.r, 1024); near(v.Arg, -PI / 3); nearC(v.base, C(S3, 1)); assert.equal(v.n, 10);
    near(v.rawAngle, (5 * PI) / 3);
    // de Moivre by hand: r^n, n*theta wrapped to (-pi, pi]
    const r = Math.hypot(v.base.re, v.base.im), th = Math.atan2(v.base.im, v.base.re);
    near(Math.pow(r, 10), 1024); near(10 * th, v.rawAngle);
    near(10 * th - 2 * PI, v.Arg);
    nearC(C(1024 * Math.cos(v.Arg), 1024 * Math.sin(v.Arg)), v.result, 1e-6);
  },
  '1.4.1': (v) => {
    assert.equal(v.n, 5); assert.equal(v.roots.length, 5);
    for (let k = 0; k < 5; k++) {
      nearC(v.roots[k], C(Math.cos((2 * PI * k) / 5), Math.sin((2 * PI * k) / 5)), EPS, `k=${k}`);
      // z^5 = 1 by repeated multiplication
      let w = C(1, 0);
      for (let i = 0; i < 5; i++) w = C(w.re * v.roots[k].re - w.im * v.roots[k].im, w.re * v.roots[k].im + w.im * v.roots[k].re);
      nearC(w, C(1, 0), 1e-12, `z^5 for k=${k}`);
    }
    assert.deepEqual(v.primitive, [false, true, true, true, true]);
    // the decimals quoted in the copy
    near(v.roots[1].re, 0.309, 5e-4); near(v.roots[1].im, 0.951, 5e-4); near(v.roots[2].re, -0.809, 5e-4); near(v.roots[2].im, 0.588, 5e-4);
    near(v.roots[1].re, (Math.sqrt(5) - 1) / 4);
    v.principalArgs.forEach((a, k) => near(Math.atan2(v.roots[k].im, v.roots[k].re), a, EPS, `Arg of root ${k}`));
    near(v.principalArgs[3], (6 * PI) / 5 - 2 * PI); near(v.principalArgs[4], (8 * PI) / 5 - 2 * PI);
  },
  '1.4.2': (v) => {
    near(v.radius, 2);
    assert.equal(v.angles.length, 4);
    [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4].forEach((a, k) => near(v.angles[k], a, EPS, `angle ${k}`));
    [PI / 4, (3 * PI) / 4, (-3 * PI) / 4, -PI / 4].forEach((a, k) => near(v.principalArgs[k], a, EPS, `Arg ${k}`));
    const exp = [C(SQRT2, SQRT2), C(-SQRT2, SQRT2), C(-SQRT2, -SQRT2), C(SQRT2, -SQRT2)];
    exp.forEach((e, k) => {
      nearC(v.roots[k], e, EPS, `root ${k}`);
      nearC(v.roots[k], C(2 * Math.cos(v.angles[k]), 2 * Math.sin(v.angles[k])), EPS, `root ${k} from angle`);
      near(Math.atan2(v.roots[k].im, v.roots[k].re), v.principalArgs[k], EPS, `root ${k} Arg`);
      // fourth power is -16: square twice
      const sq = (z) => C(z.re * z.re - z.im * z.im, 2 * z.re * z.im);
      nearC(sq(sq(v.roots[k])), C(-16, 0), 1e-9, `root ${k}^4`);
    });
  },
  '1.4.3': (v) => {
    nearC(v.roots[0], C(2, 3)); nearC(v.roots[1], C(2, -3)); near(v.completed.shift, 2); near(v.completed.square, -9);
    for (const z of v.roots) { // z^2 - 4z + 13 = 0
      nearC(C(z.re * z.re - z.im * z.im - 4 * z.re + 13, 2 * z.re * z.im - 4 * z.im), C(0, 0));
    }
    near(v.roots[0].re + v.roots[1].re, 4); near(v.roots[0].re ** 2 + v.roots[0].im ** 2, 13);
  },
  '1.5.1': (v) => {
    nearC(v.start, C(2, 1)); nearC(v.end, C(-3, -3)); nearC(v.direction, C(-5, -4)); near(v.at.t, 0.5); nearC(v.at.z, C(-0.5, -1));
    nearC(C(v.start.re + 0.5 * v.direction.re, v.start.im + 0.5 * v.direction.im), v.at.z);
    nearC(C(v.start.re + v.direction.re, v.start.im + v.direction.im), v.end);
  },
  '1.5.2': (v) => {
    nearC(v.center, C(0, -1)); near(v.inner, 1); near(v.outer, 3);
    assert.deepEqual(
      { innerIncluded: v.innerIncluded, outerIncluded: v.outerIncluded, open: v.open, closed: v.closed, bounded: v.bounded, connected: v.connected, domain: v.domain, region: v.region },
      { innerIncluded: false, outerIncluded: true, open: false, closed: false, bounded: true, connected: true, domain: false, region: true });
  },
  '2.1.1': (v) => {
    nearC(v.check.z, C(1, 1)); nearC(v.check.w, C(-1, 3)); near(v.check.u, -1); near(v.check.v, 3);
    const { re: x, im: y } = v.check.z;
    near(x * x - y * y - y, v.check.u); near(2 * x * y + x, v.check.v);
    const r = Math.hypot(x, y), th = Math.atan2(y, x);
    near(r * r * Math.cos(2 * th) - r * Math.sin(th), v.check.u); near(r * r * Math.sin(2 * th) + r * Math.cos(th), v.check.v);
  },
  '2.1.2': (v) => {
    near(v.parabola.vertex, 4); near(v.parabola.coeff, -1 / 16); near(v.parabola.focus, 0);
    assert.equal(v.sample.y, 1); nearC(v.sample.w, C(3, 4)); nearC(v.sample.z, C(2, 1));
    // u = vertex + coeff v^2 for the images of 2 + iy
    for (const y of [-2, -1, 0, 1, 2.5]) {
      const u = 4 - y * y, w = 4 * y;
      near(u, v.parabola.vertex + v.parabola.coeff * w * w, 1e-12, `y=${y}`);
    }
    // focus: 4p = 16 -> p = 4 -> focus at vertex - p = 0
    near(v.parabola.vertex - 1 / (4 * Math.abs(v.parabola.coeff)), v.parabola.focus);
  },
  '2.1.3': (v) => {
    assert.equal(v.imageLine, 'v = 0'); near(v.rotation, PI / 2); nearC(v.shift, C(0, -2));
    nearC(v.sample.z, C(2, 3)); nearC(v.sample.w, C(-3, 0));
    // i z - 2 i at z = 2 + 3i : i(2 + 3i) = -3 + 2i, minus 2i
    nearC(C(-v.sample.z.im, v.sample.z.re - 2), v.sample.w);
  },
  '2.2.1': (v) => { near(v.sector.from, 0); near(v.sector.to, (3 * PI) / 4); assert.equal(v.n, 3); near(v.sector.to, v.n * (PI / 4)); },
  '2.2.2': (v) => {
    nearC(v.root, C(1, 1)); near(v.r, S2); near(v.Arg, PI / 4); nearC(v.other, C(-1, -1));
    for (const z of [v.root, v.other]) nearC(C(z.re * z.re - z.im * z.im, 2 * z.re * z.im), C(0, 2));
    nearC(C(v.r * Math.cos(v.Arg), v.r * Math.sin(v.Arg)), v.root);
  },
  '2.3.1': (v) => {
    near(v.alongParabola, 1); nearC(v.alongRealAxis, C(1, 0)); nearC(v.alongImagAxis, C(-1, 0)); assert.equal(v.exists, false);
    // numeric: g on y = x^2 as x -> 0, and on the axes
    const g = (x, y) => C((x * x - y * y) / (x * x + y * y), (2 * x * y) / (x * x + y * y));
    nearC(g(1e-6, 1e-12), C(1, 0), 1e-5);
    nearC(g(-1e-6, 1e-12), C(1, 0), 1e-5);
    nearC(g(1e-3, 0), v.alongRealAxis); nearC(g(0, 1e-3), v.alongImagAxis);
    const m = 2; nearC(g(1e-3, m * 1e-3), C(Math.cos(2 * Math.atan(m)), Math.sin(2 * Math.atan(m))));
  },
  '2.4.1': (v) => {
    near(v.seam, 0); near(v.window[0], 0); near(v.window[1], 2 * PI); nearC(v.atMinusOne, C(0.5, S3 / 2)); assert.equal(v.principalJumps, true);
    nearC(v.atMinusOne, C(Math.cos(PI / 3), Math.sin(PI / 3)));
  },
  '2.5.1': (v) => {
    assert.equal(v.imageLine, 'Re w = 1/2'); near(v.re, 0.5); nearC(v.sample.z, C(1, 1)); nearC(v.sample.w, C(0.5, -0.5));
    const { re: x, im: y } = v.sample.z; near(Math.hypot(x - 1, y), 1);                    // z is on the circle
    nearC(C(x / (x * x + y * y), -y / (x * x + y * y)), v.sample.w); near(v.sample.w.re, v.re);
  },
  '3.1.1': (v) => {
    nearC(v.derivativeAt.z, C(1, 1)); nearC(v.derivativeAt.fprime, C(3, 2)); assert.equal(v.A, '2z + 1'); near(v.Babs, 0);
    nearC(C(2 * v.derivativeAt.z.re + 1, 2 * v.derivativeAt.z.im), v.derivativeAt.fprime);
  },
  '3.1.2': (v) => {
    nearC(v.differentiableAt, C(0, 0)); nearC(v.fprime0, C(0, 0)); nearC(v.circleRadiusAt.z, C(1, 1)); near(v.circleRadiusAt.radius, S2);
    nearC(v.circleRadiusAt.center, C(1, -1));
    near(v.circleRadiusAt.radius, Math.hypot(v.circleRadiusAt.z.re, v.circleRadiusAt.z.im));
    // directional limits conj z + z e^{-2 i phi} all lie on the circle
    const { re: x, im: y } = v.circleRadiusAt.z;
    for (const phi of [0, 0.7, PI / 2, 2.2, PI, 4]) {
      const e = C(Math.cos(-2 * phi), Math.sin(-2 * phi));
      const q = C(x + (x * e.re - y * e.im), -y + (x * e.im + y * e.re));
      near(Math.hypot(q.re - v.circleRadiusAt.center.re, q.im - v.circleRadiusAt.center.im), v.circleRadiusAt.radius, 1e-12, `phi=${phi}`);
    }
  },
  '3.2.1': (v) => {
    assert.equal(v.entire, true); nearC(v.fprimeAt0, C(1, 0)); nearC(v.check.z, C(0, PI / 2)); nearC(v.check.w, C(0, 1));
    const { re: x, im: y } = v.check.z;
    nearC(C(Math.exp(x) * Math.cos(y), Math.exp(x) * Math.sin(y)), v.check.w);
    nearC(C(Math.exp(0) * Math.cos(0), Math.exp(0) * Math.sin(0)), v.fprimeAt0);
  },
  P1: (v) => {
    nearC(v.check.z1, C(3, -2)); nearC(v.check.z2, C(-1, 4)); nearC(v.check.both, C(5, -14));
    const { z1, z2 } = v.check;
    const cz1 = C(z1.re, -z1.im), cz2 = C(z2.re, -z2.im);
    nearC(C(cz1.re * cz2.re - cz1.im * cz2.im, cz1.re * cz2.im + cz1.im * cz2.re), v.check.both);
    const prod = C(z1.re * z2.re - z1.im * z2.im, z1.re * z2.im + z1.im * z2.re);
    nearC(C(prod.re, -prod.im), v.check.both);
  },
  P2: (v) => { nearC(v.check.z, C(3, -2)); near(v.check.zzbar, 13); near(v.check.abs, Math.sqrt(13)); near(v.check.zzbar, v.check.z.re ** 2 + v.check.z.im ** 2); near(Math.sqrt(v.check.zzbar), v.check.abs); },
  P3: (v) => {
    const k = v.check;
    nearC(k.a, C(0, 1)); nearC(k.b, C(0, -2)); nearC(k.c, C(1, 1)); nearC(k.d, C(1, 0)); nearC(k.coeff, C(-1, 1)); nearC(k.shift, C(0, -1));
    const mul = (p, q) => C(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
    nearC(mul(k.a, k.c), k.coeff);
    nearC(C(mul(k.a, k.d).re + k.b.re, mul(k.a, k.d).im + k.b.im), k.shift);
    const z = C(0.3, -2);                                                                  // compose and compare
    const inner = mul(k.c, z); const T2 = C(inner.re + k.d.re, inner.im + k.d.im);
    const lhs = mul(k.a, T2); const composed = C(lhs.re + k.b.re, lhs.im + k.b.im);
    const rhsA = mul(k.coeff, z); nearC(composed, C(rhsA.re + k.shift.re, rhsA.im + k.shift.im));
  },
  P4: (v) => { near(v.radius, S2); nearC(v.factor, C(1, 1)); near(v.factorAbs, S2); near(v.factorArg, PI / 4); near(v.factorAbs, Math.hypot(v.factor.re, v.factor.im)); near(v.factorArg, Math.atan2(v.factor.im, v.factor.re)); },
  P5: (v) => {
    nearC(v.alongRealAxis, C(1, 0)); nearC(v.alongImagAxis, C(0, 0)); assert.equal(v.exists, false);
    nearC(v.directional.A, C(0.5, 0)); nearC(v.directional.B, C(0.5, 0));
    // x/z = A + B e^{-2 i theta}: 1 at theta = 0, 0 at theta = pi/2
    const at = (th) => C(v.directional.A.re + v.directional.B.re * Math.cos(-2 * th), v.directional.A.im + v.directional.B.re * Math.sin(-2 * th));
    nearC(at(0), v.alongRealAxis); nearC(at(PI / 2), v.alongImagAxis);
  },
  P6: (v) => { nearC(v.A, C(0.5, 0)); nearC(v.B, C(0.5, 0)); assert.equal(v.differentiable, false); },
  P7: (v) => { nearC(v.fprime, C(0, 0)); assert.equal(v.constant, true); },
};

test('A2: every problem has a value checker, and the checker passes', () => {
  assert.deepEqual(Object.keys(VALUE_CASES).sort(), [...HANDOUT_IDS].sort());
  for (const p of PROBLEMS) {
    assert.doesNotThrow(() => VALUE_CASES[p.id](p.answer.values), `values of ${p.id}`);
  }
});

test('A2: spot values from the acceptance criterion, stated literally', () => {
  const v = (id) => P.problemById(id).answer.values;
  nearC(v('1.1.1').product, C(5, 14)); nearC(v('1.1.1').quotient, C(-11 / 17, -10 / 17));
  near(v('1.1.2').im, 6); near(v('1.2.2').distance, Math.sqrt(29));
  near(v('1.3.1').r, 2); near(v('1.3.1').theta, (2 * PI) / 3);
  nearC(v('1.3.2').result, C(512, -512 * S3), 1e-6); near(v('1.3.2').Arg, -PI / 3);
  nearC(v('1.5.1').at.z, C(-0.5, -1));
  assert.equal(v('1.5.2').open, false); assert.equal(v('1.5.2').closed, false); assert.equal(v('1.5.2').bounded, true);
  assert.equal(v('1.5.2').connected, true); assert.equal(v('1.5.2').domain, false); assert.equal(v('1.5.2').region, true);
  nearC(v('2.1.1').check.w, C(-1, 3)); nearC(v('2.1.2').sample.w, C(3, 4)); nearC(v('2.1.3').sample.w, C(-3, 0));
  near(v('2.2.1').sector.to, (3 * PI) / 4); nearC(v('2.2.2').root, C(1, 1));
  near(v('2.3.1').alongParabola, 1); assert.equal(v('2.3.1').exists, false);
  nearC(v('2.4.1').atMinusOne, C(0.5, S3 / 2)); near(v('2.4.1').seam, 0);
  near(v('2.5.1').re, 0.5); nearC(v('2.5.1').sample.w, C(0.5, -0.5));
  nearC(v('3.1.1').derivativeAt.fprime, C(3, 2)); nearC(v('3.1.2').fprime0, C(0, 0)); near(v('3.1.2').circleRadiusAt.radius, S2);
  nearC(v('3.2.1').fprimeAt0, C(1, 0)); nearC(v('3.2.1').check.w, C(0, 1));
  near(v('P2').check.zzbar, 13); nearC(v('P3').check.coeff, C(-1, 1)); nearC(v('P3').check.shift, C(0, -1)); near(v('P4').radius, S2);
  nearC(v('P5').alongRealAxis, C(1, 0)); nearC(v('P5').alongImagAxis, C(0, 0)); nearC(v('P6').A, C(0.5, 0)); nearC(v('P6').B, C(0.5, 0));
  nearC(v('P7').fprime, C(0, 0));
});

// ================================================================== A3
const FN_SRC = {
  sq: 'z^2', cube: 'z^3', recip: '1/z', 'linear-i': 'iz - 2i', 'linear-1i': '(1+i)z', 'sq-plus-iz': 'z^2 + iz', 'sq-plus-z': 'z^2 + z',
  exp: 'exp(z)', conj: 'conj(z)', re: 'Re(z)', abs2: 'abs(z)^2', dir: 'z^2/abs(z)^2', sqrt: 'sqrt(z)', cbrt: 'z^(1/3)', 'x-over-z': '(Re(1+z) - 1)/z',
};

test('A3: the catalogue has the 15 required entries with the architecture sources', () => {
  assert.equal(FUNCTIONS.length, 15);
  assert.deepEqual(FUNCTIONS.map((f) => f.id), FUNCTION_IDS);
  for (const f of FUNCTIONS) assert.equal(stripWs(f.src), stripWs(FN_SRC[f.id]), `src of ${f.id}`);
  const labels = {
    sq: 'z²', cube: 'z³', recip: '1/z', 'linear-i': 'iz − 2i', 'linear-1i': '(1 + i)z', 'sq-plus-iz': 'z² + iz',
    'sq-plus-z': 'z² + z', exp: 'e^z', conj: 'conj z', re: 'Re z', abs2: '|z|²', dir: 'z²/|z|²', sqrt: '√z',
    cbrt: 'z^(1/3)', 'x-over-z': '(Re(1 + z) − 1)/z',
  };
  for (const f of FUNCTIONS) assert.equal(f.label, labels[f.id], `chip label of ${f.id}`);
  assert.deepEqual(FUNCTIONS.filter((f) => !f.analytic).map((f) => f.id).sort(), ['abs2', 'conj', 'dir', 're', 'x-over-z']);
  for (const id of ['recip', 'dir', 'x-over-z']) {
    assert.deepEqual(fnById(id).poles, [{ re: 0, im: 0 }], `${id} pole`);
  }
  for (const f of FUNCTIONS) if (!['recip', 'dir', 'x-over-z'].includes(f.id)) assert.deepEqual(f.poles, [], `${f.id} has no poles`);
  assert.ok(fnById('recip').problems.includes('2.5.1'));
  assert.deepEqual(fnById('sq').cart, { u: 'x^2 - y^2', v: '2xy' });
  assert.equal(fnById('nope'), null); assert.equal(fnById(undefined), null);
});

test('A3: field shapes, references and copy', () => {
  const stationIds = STATIONS.map((s) => s.id);
  const labels = new Set();
  for (const f of FUNCTIONS) {
    const where = `function ${f.id}`;
    assert.ok(typeof f.label === 'string' && f.label.length >= 2 && f.label.length <= 24, `${where} label`);
    assert.ok(!labels.has(f.label), `${where} label is unique`); labels.add(f.label);
    assert.ok(typeof f.tex === 'string' && f.tex.length >= 1, `${where} tex`);
    assert.equal(typeof f.analytic, 'boolean');
    assert.ok(typeof f.note === 'string' && f.note.length > 15, `${where} note`);
    assert.ok(Array.isArray(f.problems) && f.problems.length >= 1, `${where} problems`);
    for (const pid of f.problems) assert.ok(P.problemById(pid), `${where} problem ${pid} exists`);
    assert.ok(Array.isArray(f.stations) && f.stations.length >= 1, `${where} stations`);
    for (const sid of f.stations) assert.ok(stationIds.includes(sid), `${where} station ${sid} exists`);
    assert.deepEqual(f.stations, stationIds.filter((id) => f.stations.includes(id)), `${where} stations are unique and in registry order`);
    assert.ok(f.stations.includes('lab'), `${where} is offered by the Lab`);
    for (const pid of f.problems) assert.ok(f.stations.includes(P.problemById(pid).station) || P.problemById(pid).alsoAt.some((a) => f.stations.includes(a)), `${where} is offered where problem ${pid} lives`);
    if (f.cart !== null) { assert.equal(typeof f.cart.u, 'string'); assert.equal(typeof f.cart.v, 'string'); }
    assert.equal(typeof f.polar.u, 'string'); assert.equal(typeof f.polar.v, 'string');
    if (f.analytic) assert.equal(typeof f.derivativeTex, 'string', `${where} derivativeTex`); else assert.equal(f.derivativeTex, null, `${where} derivativeTex`);
  }
  assert.equal(fnById('sqrt').cart, null); assert.equal(fnById('cbrt').cart, null);
});

// Reference implementations with plain Math, one per function, to check the TeX forms below.
const mul = (p, q) => C(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
const div = (p, q) => { const d = q.re * q.re + q.im * q.im; return C((p.re * q.re + p.im * q.im) / d, (p.im * q.re - p.re * q.im) / d); };
const cexp = (z) => C(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im));
const polarOf = (z) => ({ r: Math.hypot(z.re, z.im), th: Math.atan2(z.im, z.re) });
const fromPolar = (r, th) => C(r * Math.cos(th), r * Math.sin(th));
const REF = {
  sq: (z) => mul(z, z),
  cube: (z) => mul(z, mul(z, z)),
  recip: (z) => div(C(1, 0), z),
  'linear-i': (z) => { const w = mul(C(0, 1), z); return C(w.re, w.im - 2); },
  'linear-1i': (z) => mul(C(1, 1), z),
  'sq-plus-iz': (z) => { const a = mul(z, z), b = mul(C(0, 1), z); return C(a.re + b.re, a.im + b.im); },
  'sq-plus-z': (z) => { const a = mul(z, z); return C(a.re + z.re, a.im + z.im); },
  exp: cexp,
  conj: (z) => C(z.re, -z.im),
  re: (z) => C(z.re, 0),
  abs2: (z) => C(z.re * z.re + z.im * z.im, 0),
  dir: (z) => div(mul(z, z), C(z.re * z.re + z.im * z.im, 0)),
  sqrt: (z) => { const { r, th } = polarOf(z); return fromPolar(Math.sqrt(r), th / 2); },
  cbrt: (z) => { const { r, th } = polarOf(z); return fromPolar(Math.cbrt(r), th / 3); },
  'x-over-z': (z) => div(C(z.re, 0), z),
};
// A small evaluator for the TeX vocabulary used in functions.js (x y z r i e, \theta \pi, + - ^ / implicit product,
// \dfrac \tfrac \sqrt \overline \operatorname{Re} \cos \sin |.|, parentheses and braces). It lets the test check the
// formula STRINGS numerically, so a typo in a displayed u, v or f' cannot hide behind correct numbers elsewhere.
const cadd = (p, q) => C(p.re + q.re, p.im + q.im);
const csub = (p, q) => C(p.re - q.re, p.im - q.im);
const cneg = (p) => C(-p.re, -p.im);
const clog = (p) => C(Math.log(Math.hypot(p.re, p.im)), Math.atan2(p.im, p.re));
const cpow = (b, w) => {
  if (w.im === 0 && Number.isInteger(w.re)) {
    let out = C(1, 0); const n = Math.abs(w.re);
    for (let k = 0; k < n; k++) out = mul(out, b);
    return w.re < 0 ? div(C(1, 0), out) : out;
  }
  return cexp(mul(w, clog(b)));                                                         // principal power
};
function evalTex(src, ctx) {
  const tokens = [];
  const text = src.replace(/\\operatorname\{Re\}/g, '\\Re').replace(/\\(left|right|,|;|!)/g, ' ').replace(/\\ /g, ' ');
  for (const m of text.matchAll(/\\[A-Za-z]+|\d+(?:\.\d+)?|[A-Za-z]|[+\-^/(){}|]/g)) tokens.push(m[0]);
  const covered = text.replace(/\\[A-Za-z]+|\d+(?:\.\d+)?|[A-Za-z]|[+\-^/(){}|]|\s+/g, '');
  assert.equal(covered, '', `evalTex: cannot tokenise ${JSON.stringify(src)} (left over ${JSON.stringify(covered)})`);
  let pos = 0, absDepth = 0;
  const peek = (k = 0) => tokens[pos + k];
  const eat = (t) => { assert.equal(tokens[pos], t, `evalTex: expected ${t} at token ${pos} of ${JSON.stringify(src)}`); pos++; };
  const startsFactor = (t) => t !== undefined && (/^\d/.test(t) || /^[A-Za-z]$/.test(t) || ['\\theta', '\\pi', '\\cos', '\\sin', '\\sqrt', '\\dfrac', '\\tfrac', '\\overline', '\\Re', '('].includes(t) || (t === '|' && absDepth === 0));
  const FUNC = { '\\cos': Math.cos, '\\sin': Math.sin };
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = tokens[pos++]; const t = term(); v = op === '+' ? cadd(v, t) : csub(v, t); }
    return v;
  }
  function term() {
    let negate = false;
    while (peek() === '-') { pos++; negate = !negate; }
    let v = power();
    while (startsFactor(peek()) || peek() === '/') {
      if (peek() === '/') { pos++; v = div(v, power()); } else v = mul(v, power());
    }
    return negate ? cneg(v) : v;
  }
  function exponent() {
    if (peek() === '{') { pos++; const e = expr(); eat('}'); return e; }
    return atom();
  }
  function power() {
    if (peek() === 'e' && peek(1) === '^') { pos += 2; return cexp(exponent()); }
    const b = atom();
    if (peek() === '^') { pos++; return cpow(b, exponent()); }
    return b;
  }
  function funcArg() {
    if (peek() === '(') { pos++; const v = expr(); eat(')'); return v; }
    let coeff = null;
    if (/^\d/.test(peek())) coeff = C(Number(tokens[pos++]), 0);
    const argStart = ['\\theta', '\\pi', '\\dfrac', '\\tfrac', '{'].includes(peek()) || /^[A-Za-z]$/.test(peek() || '');
    const a = argStart ? atom() : null;
    assert.ok(coeff || a, `evalTex: missing function argument in ${JSON.stringify(src)}`);
    return coeff && a ? mul(coeff, a) : coeff || a;
  }
  function atom() {
    const t = tokens[pos++];
    assert.ok(t !== undefined, `evalTex: unexpected end of ${JSON.stringify(src)}`);
    if (/^\d/.test(t)) return C(Number(t), 0);
    switch (t) {
      case 'x': return C(ctx.x, 0);
      case 'y': return C(ctx.y, 0);
      case 'r': return C(ctx.r, 0);
      case 'z': return ctx.z;
      case 'i': return C(0, 1);
      case 'e': return C(Math.E, 0);
      case '\\theta': return C(ctx.theta, 0);
      case '\\pi': return C(Math.PI, 0);
      case '(': { const v = expr(); eat(')'); return v; }
      case '{': { const v = expr(); eat('}'); return v; }
      case '|': { absDepth++; const v = expr(); absDepth--; eat('|'); return C(Math.hypot(v.re, v.im), 0); }
      case '\\sqrt': { eat('{'); const v = expr(); eat('}'); return cpow(v, C(0.5, 0)); }
      case '\\dfrac': case '\\tfrac': { eat('{'); const a = expr(); eat('}'); eat('{'); const b = expr(); eat('}'); return div(a, b); }
      case '\\overline': { eat('{'); const v = expr(); eat('}'); return C(v.re, -v.im); }
      case '\\Re': { eat('('); const v = expr(); eat(')'); return C(v.re, 0); }
      case '\\cos': case '\\sin': {
        let n = 1; if (peek() === '^') { pos++; n = Number(tokens[pos++]); }
        const a = funcArg(); assert.ok(Math.abs(a.im) < 1e-12, 'evalTex: real arguments only');
        return C(FUNC[t](a.re) ** n, 0);
      }
      default: assert.fail(`evalTex: unexpected token ${t} in ${JSON.stringify(src)}`);
    }
  }
  const out = expr();
  assert.equal(pos, tokens.length, `evalTex: trailing tokens in ${JSON.stringify(src)}: ${tokens.slice(pos).join(' ')}`);
  return out;
}
const ctxOf = (z) => { const { r, th } = polarOf(z); return { x: z.re, y: z.im, r, theta: th, z }; };
const SAMPLE_POINTS = [C(1, 1), C(2, -1), C(-1.5, 0.5), C(0.3, -0.7), C(-2, -1), C(0.5, 2.5), C(-1, 0)];

test('A3: evalTex itself is right (known strings, known values)', () => {
  nearC(evalTex('x^2 - y^2', { x: 3, y: 2 }), C(5, 0));
  nearC(evalTex('3x^2y - y^3', { x: 2, y: 3 }), C(36 - 27, 0));
  nearC(evalTex('\\dfrac{x}{x^2 + y^2}', { x: 1, y: 1 }), C(0.5, 0));
  nearC(evalTex('-\\dfrac{1}{z^2}', { z: C(0, 1) }), C(1, 0));
  nearC(evalTex('r^2\\cos 2\\theta', { r: 2, theta: Math.PI / 4 }), C(0, 0), 1e-12);
  nearC(evalTex('\\cos^2\\theta', { theta: Math.PI / 3 }), C(0.25, 0));
  nearC(evalTex('-\\cos\\theta\\sin\\theta', { theta: Math.PI / 4 }), C(-0.5, 0));
  nearC(evalTex('\\sqrt{2}\\,r\\cos\\left(\\theta + \\tfrac{\\pi}{4}\\right)', { r: 1, theta: 0 }), C(1, 0));
  nearC(evalTex('e^{x}\\cos y', { x: 0, y: Math.PI }), C(-1, 0));
  nearC(evalTex('iz - 2i', { z: C(2, 3) }), C(-3, 0));
  nearC(evalTex('(1 + i)z', { z: C(0, 1) }), C(-1, 1));
  nearC(evalTex('z^{1/3}', { z: C(-1, 0) }), C(0.5, Math.sqrt(3) / 2));
  nearC(evalTex('\\dfrac{1}{3}z^{-2/3}', { z: C(8, 0) }), C(1 / 12, 0));
  nearC(evalTex('|z|^2', { z: C(3, 4) }), C(25, 0));
  nearC(evalTex('\\dfrac{z^2}{|z|^2}', { z: C(0, 2) }), C(-1, 0));
  nearC(evalTex('\\dfrac{\\operatorname{Re}(1 + z) - 1}{z}', { z: C(0, 0.5) }), C(0, 0));
  nearC(evalTex('\\overline{z}', { z: C(1, 2) }), C(1, -2));
  assert.throws(() => evalTex('x +', { x: 1 }));
  assert.throws(() => evalTex('\\foo', {}));
});

test('A3: tex, cart and polar strings evaluate to the reference function at sample points', () => {
  for (const f of FUNCTIONS) {
    for (const z of SAMPLE_POINTS) {
      const ctx = ctxOf(z), w = REF[f.id](z);
      nearC(evalTex(f.tex, ctx), w, 1e-9, `${f.id} tex at ${z.re},${z.im}`);
      if (f.cart) nearC(C(evalTex(f.cart.u, ctx).re, evalTex(f.cart.v, ctx).re), w, 1e-9, `${f.id} cart at ${z.re},${z.im}`);
      nearC(C(evalTex(f.polar.u, ctx).re, evalTex(f.polar.v, ctx).re), w, 1e-9, `${f.id} polar at ${z.re},${z.im}`);
    }
  }
});

test('A3: derivativeTex agrees with a central difference (analytic entries, off the cut)', () => {
  const h = 1e-6;
  for (const f of FUNCTIONS.filter((g) => g.analytic)) {
    for (const z of SAMPLE_POINTS.filter((q) => q.im !== 0 || q.re > 0)) {          // stay off the negative real axis
      const fx = REF[f.id](C(z.re + h, z.im)), fxm = REF[f.id](C(z.re - h, z.im));
      const num = C((fx.re - fxm.re) / (2 * h), (fx.im - fxm.im) / (2 * h));
      nearC(evalTex(f.derivativeTex, ctxOf(z)), num, 1e-5, `${f.id}' at ${z.re},${z.im}`);
    }
  }
});

test('A3: the non-analytic entries really fail Cauchy-Riemann at a sample point (or, for dir and x-over-z, are direction-dependent)', () => {
  const h = 1e-6, z = C(0.7, 0.4);
  const parts = (id) => {
    const f = REF[id];
    const a = f(C(z.re + h, z.im)), b = f(C(z.re - h, z.im)), c = f(C(z.re, z.im + h)), d = f(C(z.re, z.im - h));
    return { ux: (a.re - b.re) / (2 * h), vx: (a.im - b.im) / (2 * h), uy: (c.re - d.re) / (2 * h), vy: (c.im - d.im) / (2 * h) };
  };
  for (const id of ['conj', 're', 'abs2', 'dir', 'x-over-z']) {
    const { ux, uy, vx, vy } = parts(id);
    assert.ok(Math.abs(ux - vy) > 1e-3 || Math.abs(uy + vx) > 1e-3, `${id} should fail CR at ${z.re},${z.im}`);
  }
  for (const id of ['sq', 'cube', 'recip', 'linear-i', 'linear-1i', 'sq-plus-iz', 'sq-plus-z', 'exp', 'sqrt', 'cbrt']) {
    const { ux, uy, vx, vy } = parts(id);
    near(ux, vy, 1e-5, `${id} u_x = v_y`); near(uy, -vx, 1e-5, `${id} u_y = -v_x`);
  }
});

test('A3: functions.js agrees with the expressions printed in the problems', () => {
  // 2.1.1 and 3.1.1 and 3.2.1 use sq-plus-iz, sq-plus-z, exp
  nearC(REF['sq-plus-iz'](C(1, 1)), P.problemById('2.1.1').answer.values.check.w);
  nearC(REF['sq-plus-z'](C(1, 1)), C(1, 3), 1e-12, 'sq-plus-z at 1+i is (2i) + (1 + i) = 1 + 3i');
  nearC(REF.exp(C(0, PI / 2)), P.problemById('3.2.1').answer.values.check.w);
  nearC(REF['linear-i'](C(2, 3)), P.problemById('2.1.3').answer.values.sample.w);
  nearC(REF.sq(C(2, 1)), P.problemById('2.1.2').answer.values.sample.w);
  nearC(REF.recip(C(1, 1)), P.problemById('2.5.1').answer.values.sample.w);
});

// Optional cross-check against the real parser when js/core/parse.js exists.
let parseMod = null, parseError = null;
try { parseMod = await import('../../js/core/parse.js'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') parseError = e; }
test('A3: compile(src) from parse.js matches the reference functions (a failure here means parse.js or a src string is wrong)',
  { skip: parseMod === null && parseError === null && 'js/core/parse.js not present yet' }, () => {
  if (parseError) throw parseError;
  for (const f of FUNCTIONS) {
    const { f: g } = parseMod.compile(f.src);
    for (const z of SAMPLE_POINTS) {
      if (['sqrt', 'cbrt'].includes(f.id) && z.im === 0 && z.re < 0) continue;       // cut: sign of zero decides
      const w = g(z);
      nearC(w, REF[f.id](z), 1e-9, `${f.id} at ${z.re},${z.im}`);
    }
  }
});

// ================================================================== A4
test('A4: both files are pure data (no imports, no DOM, no network, no storage)', () => {
  for (const rel of ['js/data/problems.js', 'js/data/functions.js']) {
    const src = read(rel);
    assert.ok(!/^\s*import\s/m.test(src), `${rel} has an import statement`);
    assert.ok(!/\bimport\s*\(/.test(src), `${rel} has a dynamic import`);
    assert.ok(!/\brequire\s*\(/.test(src), `${rel} has a require`);
    // "window" is also a maths word here (the window of angles), so look for the browser global being used.
    for (const re of [/\b(window|document|self)\.[A-Za-z_$]/, /\b(window|document)\s*\[/, /\btypeof\s+(window|document)\b/, /\bglobalThis\b/]) {
      assert.ok(!re.test(src.replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''")), `${rel} uses a browser global: ${re}`);
    }
    for (const word of ['localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'navigator', 'setTimeout', 'requestAnimationFrame', 'console']) {
      assert.ok(!new RegExp(`\\b${word}\\b`).test(src), `${rel} mentions ${word}`);
    }
    assert.ok(!/#[0-9a-fA-F]{6}\b|rgba?\(|hsla?\(/.test(src), `${rel} contains a literal colour`);
  }
});

test('A4: the exported data is frozen, and the exports match the design', () => {
  assert.ok(Object.isFrozen(PROBLEMS) && Object.isFrozen(PROBLEMS[0]) && Object.isFrozen(PROBLEMS[0].answer.values.product));
  assert.ok(Object.isFrozen(TOPICS) && Object.isFrozen(TOPICS[0].covers));
  assert.ok(Object.isFrozen(FUNCTIONS) && Object.isFrozen(FUNCTIONS[2].poles[0]));
  assert.throws(() => { PROBLEMS[0].aha = 'changed'; }, TypeError);
  assert.deepEqual(Object.keys(P).sort(), [
    'ADDRESS_CODES', 'PROBLEMS', 'TOPICS', 'addressLabel', 'addressTones', 'idFromRoute', 'problemById', 'problemsForStation',
    'problemsForTopic', 'routeFor', 'statementParts', 'topicById', 'topicFromRoute', 'topicRoute', 'topicsForStation',
  ].sort());
});

test('A4: statements are the handout wording (prose words match docs/ASSIGNMENT.md) and the maths is in $...$ pairs', () => {
  const assignment = read('docs/ASSIGNMENT.md').split('## 2. Test 1 review problems')[1].split('## 3.')[0];
  const handout = {}; let cur = null;
  for (const line of assignment.split('\n')) {
    const m = line.match(/^- (\d\.\d\.\d|P\d) (.*)$/);
    if (m) { cur = m[1]; handout[cur] = m[2]; } else if (cur && /^ {2}\S/.test(line)) handout[cur] += ' ' + line.trim(); else if (/^\S/.test(line)) cur = null;
  }
  assert.equal(Object.keys(handout).length, 29);
  const words = (s) => (s.match(/[A-Za-z]{4,}/g) || []).map((w) => w.toLowerCase()).filter((w) => w !== 'conj');
  for (const p of PROBLEMS) {
    assert.equal((p.statement.match(/\$/g) || []).length % 2, 0, `${p.id} has unbalanced $`);
    const prose = P.statementParts(p.statement).filter((x) => !x.math).map((x) => x.text).join(' ');
    assert.deepEqual(words(prose), words(handout[p.id]), `${p.id}: statement wording differs from the handout`);
  }
  // the three statements the acceptance criterion names, to the character after removing TeX delimiters and markup
  const plain = (id) => P.statementParts(P.problemById(id).statement).map((x) => x.text).join('');
  assert.equal(plain('2.3.1'), 'Find \\lim_{z\\to 0} \\dfrac{x^2 - y^2 + i2xy}{x^2 + y^2} as z \\to 0 along the curve y = x^2.');
  assert.equal(plain('P7'), 'Suppose f = u + iv is entire and u(x, y) = c (a real constant) everywhere. Use Cauchy–Riemann to prove f is constant.');
  assert.equal(plain('1.3.1'), 'Write z = -1 + i\\sqrt{3} in polar form r(\\cos\\theta + i\\sin\\theta) and exponential form re^{i\\theta}. What is \\operatorname{Arg}(z)?');
});

// Every decimal number printed in the copy must be one we have checked, and it must round correctly.
const deg = (rad) => (rad * 180) / Math.PI;
const CHECKED_DECIMALS = {
  '0.309': Math.cos((2 * Math.PI) / 5),              // cos 72 deg
  '0.951': Math.sin((2 * Math.PI) / 5),              // sin 72 deg
  '0.809': -Math.cos((4 * Math.PI) / 5),             // |cos 144 deg|
  '0.588': Math.sin((4 * Math.PI) / 5),              // sin 144 deg; also |Arg(3 - 2i)| = atan(2/3) = 0.5880...
  '0.381': Math.atan(2 / 5),                         // angle of 5 + 2i
  '0.983': Math.atan(1.5),                           // |angle| of 4 - 6i
  '1.228': Math.atan2(14, 5),                        // Arg(5 + 14i) = Arg z1 + Arg z2
  '1.816': Math.atan2(4, -1),                        // Arg(-1 + 4i)
  '2.467': -Math.atan2(-4, -5),                      // |angle| of -5 - 4i
  '141.3': -deg(Math.atan2(-4, -5)),                 // |angle| of -5 - 4i in degrees
  '21.8': deg(Math.atan(2 / 5)),
  '5.385': Math.sqrt(29),
  '6.403': Math.sqrt(41),
  '7.211': Math.sqrt(52),
  '886.81': 512 * Math.sqrt(3),
};
test('A4: every decimal in the copy is a checked value, correctly rounded', () => {
  const strings = [];
  const walk = (where, o) => { if (typeof o === 'string') strings.push([where, o]); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(`${where}.${k}`, v); };
  for (const p of PROBLEMS) walk(p.id, [p.statement, p.addressWhy, p.aha, p.routes, p.answer.tex, p.answer.text]);
  for (const t of TOPICS) walk(t.id, [t.summary, t.covers]);
  for (const f of FUNCTIONS) walk(f.id, [f.note, f.tex]);
  const found = new Set();
  for (const [where, str] of strings) {
    for (const m of str.matchAll(/(?<![\d.])\d+\.\d+(?![\d.])/g)) {
      const dec = m[0];
      assert.ok(dec in CHECKED_DECIMALS, `${where}: unverified decimal ${dec}; add it to CHECKED_DECIMALS with its exact value`);
      const places = dec.split('.')[1].length;
      assert.equal(CHECKED_DECIMALS[dec].toFixed(places), dec, `${where}: ${dec} does not round correctly (exact ${CHECKED_DECIMALS[dec]})`);
      found.add(dec);
    }
  }
  assert.deepEqual([...found].sort(), Object.keys(CHECKED_DECIMALS).sort(), 'every checked decimal is actually used');
});

test('A4: the 2.1.1 answer repeats the sq-plus-iz formulas from the catalogue', () => {
  const tex = P.problemById('2.1.1').answer.tex, f = fnById('sq-plus-iz');
  for (const piece of [f.cart.u, f.cart.v, f.polar.u, f.polar.v]) assert.ok(tex.includes(piece), `2.1.1 answer.tex should contain ${piece}`);
  assert.ok(P.problemById('2.1.2').answer.tex.includes('\\dfrac{v^2}{16}'));
  assert.ok(fnById('sq').problems.includes('2.1.2') && fnById('cube').problems.includes('2.2.1') && fnById('recip').problems.includes('2.5.1'));
});

test('A4: statementParts', () => {
  assert.deepEqual(P.statementParts('Find $x$ and $y$.'), [
    { math: false, text: 'Find ' }, { math: true, text: 'x' }, { math: false, text: ' and ' }, { math: true, text: 'y' }, { math: false, text: '.' }]);
  assert.deepEqual(P.statementParts('No maths here.'), [{ math: false, text: 'No maths here.' }]);
  assert.deepEqual(P.statementParts('$a$'), [{ math: true, text: 'a' }]);
  assert.deepEqual(P.statementParts(''), []);
  assert.deepEqual(P.statementParts(undefined), []);
  for (const p of PROBLEMS) {
    const back = P.statementParts(p.statement).map((x) => (x.math ? `$${x.text}$` : x.text)).join('');
    assert.equal(back, p.statement, `${p.id} round trip`);
  }
});

// STORY section 3: aha text. 2.2.2 is corrected on purpose (STORY says "halve both"; the length is square-rooted, only the angle is halved).
const AHA_EDITED_ON_PURPOSE = new Set(['2.2.2']);
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
test('A4: every aha matches STORY section 3 (same words; punctuation may differ)', () => {
  const sec = read('docs/STORY.md').split('## 3. Every review problem, pinned to a place')[1].split('### Topics pinned to places')[0];
  const rows = sec.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('|---') && !l.startsWith('| Problem'));
  assert.equal(rows.length, 29);
  const story = {};
  for (const row of rows) {
    const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'));
    story[cells[0].split(' ')[0]] = { place: cells[1].replace(/`/g, ''), addr: cells[2], aha: cells[3] };
  }
  for (const p of PROBLEMS) {
    if (!AHA_EDITED_ON_PURPOSE.has(p.id)) assert.equal(norm(p.aha), norm(story[p.id].aha), `${p.id} aha`);
    // the thread is the first one STORY lists in the "Address / thread" column
    assert.equal(p.thread, story[p.id].addr.match(/T\d/)[0], `${p.id} thread vs STORY "${story[p.id].addr}"`);
    // the place column starts with the owning station's id
    assert.ok(story[p.id].place.startsWith(p.station), `${p.id} station ${p.station} vs STORY place ${story[p.id].place}`);
  }
  assert.match(P.problemById('2.2.2').aha, /square root of the length/);
  assert.match(P.problemById('2.2.2').aha, /halve the angle/);
});

test('A4: plain-text answers are ASCII; TeX is ASCII; both-address copy is present on every problem', () => {
  for (const p of PROBLEMS) {
    assert.match(p.answer.text, /^[\x20-\x7E]+$/, `${p.id} answer.text must be printable ASCII`);
    assert.match(p.answer.tex, /^[\x20-\x7E]+$/, `${p.id} answer.tex must be ASCII`);
    for (const part of P.statementParts(p.statement)) if (part.math) assert.match(part.text, /^[\x20-\x7E]+$/, `${p.id} math segment must be ASCII`);
    assert.ok(!/\$/.test(p.answer.tex), `${p.id} answer.tex has no $ delimiters`);
    for (const k of ['cart', 'polar']) assert.ok(p.routes[k].length <= 420, `${p.id} routes.${k} is ${p.routes[k].length} chars; keep it short enough for a card`);
    for (const s of [p.aha, p.addressWhy, p.routes.cart, p.routes.polar]) assert.ok(!/<\/?[A-Za-z]|\$|\\[a-z]/.test(s), `${p.id} prose must not contain HTML tags, $ or TeX commands: ${s.slice(0, 40)}`);
    assert.ok(/arg|Arg/.test(p.answer.text) || !['1.3.1', '1.3.2', '1.4.2', '2.2.1', '2.2.2', '2.4.1'].includes(p.id), `${p.id} answer mentions arg/Arg`);
  }
  // the same prose rules for topics and functions
  for (const t of TOPICS) for (const x of [t.title, t.summary, ...t.covers]) assert.ok(!/<\/?[A-Za-z]|\$|\\[a-z]/.test(x), `${t.id} prose: ${x.slice(0, 40)}`);
  for (const f of FUNCTIONS) for (const x of [f.label, f.note]) assert.ok(!/<\/?[A-Za-z]|\$|\\[a-z]/.test(x), `${f.id} prose: ${x.slice(0, 40)}`);
  // 1.3.1 shows the staircase: Arg as one number, arg as a set
  const a = P.problemById('1.3.1').answer;
  assert.match(a.text, /Arg z = 2pi\/3/); assert.match(a.text, /arg z = \{2pi\/3 \+ 2 pi k\}/);
  assert.match(a.tex, /\\operatorname\{Arg\}/); assert.match(a.tex, /\\arg z/);
});

test('A4: every TeX string renders in the vendored KaTeX', () => {
  const failures = [];
  const check = (label, src) => { const e = renders(src); if (e) failures.push(`${label}: ${src}  ->  ${e}`); };
  let n = 0;
  for (const p of PROBLEMS) {
    for (const part of P.statementParts(p.statement)) if (part.math) { check(`${p.id} statement`, part.text); n++; }
    check(`${p.id} answer.tex`, p.answer.tex); n++;
  }
  for (const f of FUNCTIONS) {
    check(`${f.id} tex`, f.tex); n++;
    if (f.cart) { check(`${f.id} cart.u`, f.cart.u); check(`${f.id} cart.v`, f.cart.v); n += 2; }
    check(`${f.id} polar.u`, f.polar.u); check(`${f.id} polar.v`, f.polar.v); n += 2;
    if (f.derivativeTex) { check(`${f.id} derivativeTex`, f.derivativeTex); n++; }
  }
  assert.deepEqual(failures, []);
  assert.ok(n > 100, `rendered ${n} strings`);
});

test('A4: no negative zero and no NaN or Infinity anywhere in answer.values', () => {
  const walk = (where, o) => {
    if (typeof o === 'number') { assert.ok(Number.isFinite(o), `${where} is not finite`); assert.ok(!Object.is(o, -0), `${where} is -0`); }
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(`${where}.${k}`, v);
  };
  for (const p of PROBLEMS) walk(p.id, p.answer.values);
  for (const f of FUNCTIONS) walk(f.id, f.poles);
});

test('A4: copy hygiene (no emoji, no double spaces, no trailing spaces, no TODO)', () => {
  const strings = [];
  const walk = (o) => { if (typeof o === 'string') strings.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  walk(PROBLEMS); walk(TOPICS); walk(FUNCTIONS);
  for (const s of strings) {
    assert.ok(!/\p{Extended_Pictographic}/u.test(s.replace(/[←-⇿]/g, '')), `emoji in: ${s.slice(0, 40)}`);
    assert.ok(!/  /.test(s), `double space in: ${s.slice(0, 60)}`);
    assert.ok(s === s.trim(), `untrimmed string: ${JSON.stringify(s.slice(0, 40))}`);
    assert.ok(!/TODO|FIXME|XXX|lorem/i.test(s), `placeholder in: ${s.slice(0, 40)}`);
  }
});
````

## Appendix D: `tests/interact/i1-data.mjs` (copy exactly)

````js
// tests/interact/i1-data.mjs: in-browser check that the data modules load and behave.
//   node tools/smoke.mjs --route problems --script tests/interact/i1-data.mjs
// (any route works; the script only needs a page served from the site root.)
// Passing = no thrown assertion and the log line "i1-data: ... 0 errors".
export default async function (page, ctx) {
  const { log, assert } = ctx;

  const r = await page.evaluate(async () => {
    const globalsBefore = new Set(Object.getOwnPropertyNames(window));
    const urlOf = (rel) => new URL(rel, document.baseURI).href;
    const P = await import(urlOf('js/data/problems.js'));
    const F = await import(urlOf('js/data/functions.js'));
    const P2 = await import(urlOf('js/data/problems.js'));
    const errors = [];
    const out = {
      counts: { problems: P.PROBLEMS.length, topics: P.TOPICS.length, functions: F.FUNCTIONS.length },
      sameModule: P === P2,
      newGlobals: Object.getOwnPropertyNames(window).filter((k) => !globalsBefore.has(k)),
      katex: typeof window.katex,
      rendered: 0,
      errors,
    };

    // routes round-trip
    for (const p of P.PROBLEMS) if (P.idFromRoute(P.routeFor(p.id)) !== p.id) errors.push('route round trip ' + p.id);
    for (const t of P.TOPICS) if (P.topicFromRoute(P.topicRoute(t.id)) !== t.id) errors.push('topic route round trip ' + t.id);
    if (P.routeFor('1.4.2') !== 'problem-1-4-2' || P.routeFor('P3') !== 'problem-P3') errors.push('route examples');
    if (P.idFromRoute('roots') !== null) errors.push('idFromRoute(roots)');

    // frozen
    if (!Object.isFrozen(P.PROBLEMS) || !Object.isFrozen(F.FUNCTIONS)) errors.push('not frozen');

    // spot values (browser Math must agree with Node's)
    const v = (id) => P.problemById(id).answer.values;
    const close = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
    if (!close(v('1.3.2').result.im, -512 * Math.sqrt(3), 1e-6)) errors.push('1.3.2 result');
    if (!close(v('1.4.2').roots[1].re, -Math.sqrt(2)) || !close(v('1.4.2').roots[1].im, Math.sqrt(2))) errors.push('1.4.2 root 1');
    if (!close(v('2.4.1').atMinusOne.im, Math.sqrt(3) / 2)) errors.push('2.4.1 atMinusOne');
    if (F.fnById('sq').cart.u !== 'x^2 - y^2') errors.push('fnById(sq).cart.u');

    // every TeX string renders in the KaTeX that index.html loads
    if (window.katex) {
      const tryRender = (label, src) => {
        try { window.katex.renderToString(src, { throwOnError: true, strict: 'error' }); out.rendered++; } catch (e) { errors.push(label + ': ' + e.message); }
      };
      for (const p of P.PROBLEMS) {
        for (const part of P.statementParts(p.statement)) if (part.math) tryRender(p.id + ' statement', part.text);
        tryRender(p.id + ' answer.tex', p.answer.tex);
      }
      for (const f of F.FUNCTIONS) {
        tryRender(f.id + ' tex', f.tex);
        for (const s of [f.cart && f.cart.u, f.cart && f.cart.v, f.polar.u, f.polar.v, f.derivativeTex]) if (s) tryRender(f.id + ' formula', s);
      }
    }

    // if the Problem Index is on screen, its cards must be exactly the 29 problems
    const cards = [...document.querySelectorAll('[data-problem]')].map((el) => el.getAttribute('data-problem'));
    out.cardCount = cards.length;
    if (cards.length > 0) {
      const known = new Set(P.PROBLEMS.map((p) => p.id));
      for (const id of cards) if (!known.has(id)) errors.push('card for unknown problem ' + id);
    }
    return out;
  });

  assert(r.counts.problems === 29, `29 problems, got ${r.counts.problems}`);
  assert(r.counts.topics === 12, `12 topics, got ${r.counts.topics}`);
  assert(r.counts.functions === 15, `15 functions, got ${r.counts.functions}`);
  assert(r.sameModule, 'the module is a singleton');
  assert(r.newGlobals.length === 0, `importing the data must not create globals: ${r.newGlobals.join(', ')}`);
  assert(r.errors.length === 0, `in-page errors: ${r.errors.slice(0, 5).join(' | ')}`);
  if (r.katex === 'object') assert(r.rendered > 100, `rendered ${r.rendered} TeX strings`);
  else log('window.katex is not on this page; TeX rendering is covered by the unit test');
  log(`i1-data: ${r.counts.problems} problems, ${r.counts.topics} topics, ${r.counts.functions} functions, ${r.rendered} TeX strings rendered, ${r.cardCount} cards on screen, ${r.errors.length} errors`);
}
````
