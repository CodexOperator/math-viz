# Design: i2-decisions-kit (the two decisions, the move glyph and the shared station pieces)

Goal: `i2-decisions-kit` (iteration 2, wave 0, kind foundation). Designer: stage 2.
Owns: `js/data/problems.js`, `js/core/decisions.js`, `js/core/moveglyph.js`, `js/core/station-kit.js`, `js/app.js`,
`tests/unit/architecture-sync.test.mjs`, `tests/unit/i1-data.test.mjs`, `tests/unit/i1-shell.test.mjs`, `tools/interact-all.mjs`;
plus the two files named after the goal by the loop's convention, `tests/unit/i2-decisions-kit.test.mjs` and
`tests/interact/i2-decisions-kit.mjs` (the acceptance criteria name both).
Reads: `docs/ARCHITECTURE.md` sections 1, 3.3, 3.6, 3.14, 3.15, 4.1, 8, 9 (Iteration 2), 10, 11.1 to 11.3; `docs/STORY.md` sections 0, 1, 3, 4;
`js/registry.js`; `js/stations/curves.js`, `js/stations/linear.js`, `js/stations/problems.js`; `tests/unit/i1-station-curves-linear.test.mjs` C26.

**How to use this document.** Sections 1 to 9 are the design. The appendices are a *reference implementation* of every file this goal
creates or edits, and the two new test files in full. They were written and run in a scratch copy of the repository outside the repo
(this design file is the only thing written in the repo), against the real `js/registry.js`, the real `docs/STORY.md` and
`docs/ARCHITECTURE.md` and the real `tools/smoke.mjs` in headless Chromium. Every sentence that says "measured" comes from that
run. The builder reproduces the appendices; anything it changes is reported as a deviation. Where a sentence in sections 1 to 9 and
the appendix code disagree, the sentence wins and the disagreement is a bug in the appendix.

---

## 0. Findings that shaped this design (read first)

### 0.1 What is on disk now

1. **The registry is already the iteration-2 registry.** `js/registry.js` has 22 stations (`rehearse` is order 20, `problems` order 21),
   `PARTS`, `META_STATIONS = ['rehearse', 'problems']`, `threadLabel`, `threadLinkPrefix`, and a `walk` entry per station. `js/stations/rehearse.js`
   does not exist yet (wave 1), so `#rehearse` shows the under-construction panel and `tools/smoke.mjs` without `--route` reports it.
2. **Baseline, measured:** `npm test` runs 801 tests, 792 pass, 9 fail. The nine are exactly: `A1: every problem has the required fields and
   agrees with the registry`, `A1: every topic exists in the registry with the right stations and at least one problem`, `A1: lookups`
   (all `tests/unit/i1-data.test.mjs`; `rehearse` lists all 29 problems and 12 topics, which the data and the test do not know),
   `groupStations: five parts in order with the registry stations` (`i1-shell`; part V now has 4 stations), `I1 the registry: 21 stations ...`
   (`i1-integration`, waits for `js/stations/rehearse.js`) and `U3`, `U4`, `U5`, `U10` (`i1-station-home-problems`, wait for the new home map).
   This goal fixes the first four and leaves the last five red on purpose (A5).
3. **`tests/unit/i1-data.test.mjs` line 41 defines `REAL_STATIONS` and nothing uses it**; the registry-agreement assertions at lines 93 and 138
   filter `s.id !== 'problems'` by hand. Both change to `!META_STATIONS.includes(s.id)`.
4. **`js/data/problems.js` is pure data and a test pins that** (`A4: both files are pure data`: no import, no `console`, no browser global,
   no literal colour) **and pins its export list** (`A4: the exported data is frozen, and the exports match the design`: 15 names). The
   new `names` field is a plain string; no export is added; `decisions.js` imports `problems.js`, never the other way round.
5. **`tests/unit/architecture-sync.test.mjs` is exact today.** Its import test asserts `deepEqual(found, allowed[f] || [])` and its style-tag
   test asserts `deepEqual(injecting, [4 names])`; both break the day a kit module exists. Its `data-for` scan is a plain regex over the whole file,
   so **no module outside the seven may even mention the text `data-for`, comments included**.
6. **`tests/interact/i1-shell.mjs` pins the `ctx` shape**: `Object.keys(ctx).sort()` must be `navigate, preset, route, station, stations, store,
   theme, threads` and `ctx` must be frozen, and `ctx.stations` must be the registry array. The values preset therefore travels in `ctx.preset`
   only; no key is added to `ctx`.
7. **Station code ignores presets of a kind it does not know.** `roots.js initialState` reads `preset.kind === 'problem'` and `'token'` and
   falls back to its default for anything else, so a `values` preset mounts the iteration-1 stations unchanged (A4 step e relies on this and
   measured it on `roots` and `sets`).
8. **The problem card exists twice** (`curves.js`, `linear.js`) held equal by unit test C26. The kit does not touch either; C26 stays valid
   until the wave-1 adopters replace the copies. The old scripts read `#curves-problem-answer-box` (the `.tex-scroll` scroller itself, with
   `tabindex 0`, `role group`, an `aria-label` containing "scrolls sideways", and the hint as its next sibling), `startsWith('Your own numbers.')`
   on the card's text, and `includes('Problem 2.3.1')`. The kit's defaults match those (title `Problem <id>`, neutral line first).

### 0.2 Where this design differs from the plan text (report, do not edit ARCHITECTURE.md)

| # | Plan text | This design | Why |
|---|---|---|---|
| D1 | 11.3 `neighbours`: "a thread stop that is already prev or next is left out of threads" | A thread **entry** is left out only when neither of its stops is new; an entry that stays keeps both stops (`prev` may equal the story `prev`), exactly the shape of A3 (`{T2: powers, powermap}`, `{T1: powers, sets}` for `roots`). `links()` skips the targets already shown. | A3 is binding and the two sentences disagree; A3 is the one with numbers. |
| D2 | 9: `aliases: { answer: ... }` "adds the second id to a wrapper" | The **old id goes on the `.tex-scroll` scroller itself**; the kit's `<id>-answer-tex` then names a wrapper that holds the scroller and its hint. `aliases.card` wraps the whole card in a `display: contents` div that carries the old id. | `i1-station-curves-linear.mjs` reads `box.id` of `[id="X-problem-answer"] .tex-scroll`; a wrapper would fail it. |
| D3 | 9: "tapping or focusing a chip fills the meaning span" | A **click** (tap, Enter, Space) toggles; focus alone does nothing; a hover shows the meaning as the native `title`; Escape hides it. | A mouse press focuses first, so "focus opens, click closes" would flicker open and shut on every press. |
| D4 | A2: `rayEnd` "within 1e-6 of (6, 1.6077)" | The exact value is `12 - 6*sqrt(3)` = 1.607695...; 1.6077 is it rounded to 4 places (error 4.8e-6). The unit test asserts the exact formula to 1e-9 and 1.6077 to 5e-5. | A literal 1e-6 against a rounded constant would fail a correct implementation. |
| D5 | 11.3 `freshNote`: "The handout asks: <answer.text>" | `Fresh numbers from the Rehearsal Room. The handout's own answer: <answer.text>` | `answer.text` is the answer, not the question. The first sentence is unchanged, so a test that matches the start still passes. |
| D6 | 3.14: `PART_TITLES = PARTS` "(same shape and values)" | `export const PART_TITLES = PARTS;` (one object). The part V note becomes the registry's `Lab, 4D, rehearsal, problems` (it was `Lab, 4D, problems` in `app.js`). | The registry already carries the right notes; the menu shows the longer one (check it at 390 px, section 8.5). |
| D7 | 1 (imports): `station-kit.js` → `./moveglyph.js` | `station-kit.js` does **not** import `moveglyph.js`: nothing in the kit draws a glyph. The allowed list keeps the name (a file may import fewer). | An unused import is noise; stations import the glyph themselves. |
| D8 | 9: header badges are `ul.thread-badges > li > span.thread-badge` | As 9 says. Iteration-1 stations write `li.thread-badge` (curves.js). The kit follows 9 (A4 counts `span.thread-badge`). | C26 compares the two station copies only, so it is unaffected. |
| D9 | 9 lists `<id>-why`; 11.3 says the card renders `aha` and `addressWhy` | `<id>-why` holds `addressWhy` ("Why this address. ..."); the **aha sits inside the answer** as `<p id="<id>-aha">` ("The aha. ..."), because several ahas are the answer (1.3.1: "Arg z = 120°"). It is not a key of `Card.els`. The answer `<summary>` keeps the fixed label `Show the answer` (a label that flips from the async `toggle` event raced with scripts: measured, desktop only). | Spoilers; reliability. The planner adds `<id>-aha` to section 9. |
| D10 | 11.3 `problemCard` default tone | Derived from the problem: one native address gives its tone (`cart` or `polar`), two or more give `accent`; `options.tone` overrides. | Teaches the two-address code on every card. |
| D11 | 9: picker status "Names: wrong (it is all: every name gives a different root)." | `Names: wrong. It is "all". Every name gives a different answer: roots take all n steps.` and `Address: wrong. It is "Polar, then Cartesian". Work in polar, then write the answer as x + iy.` | One form for both rows, built from the data's own meaning sentences; the quotes keep `"Either address"` and `"none"` readable. |
| D12 | none | Every function that builds DOM throws `TypeError` without a document (`chips`, `picker`, `moveGlyph`, `header`, `problemCard`, `links`, `titleSpan`); the pure ones never do. | So Node can import and call the pure half and a mistake is loud. |
| D13 | none | The sync test gains a guard that compares 11.1 to 11.3 with the code of the three kit modules from the day they land (the integrator's promotion to section 3 then replaces it), and `ALLOWED_IMPORTS` is checked line by line against the "Iteration 2 imports" paragraph. | The kit is the first module set built from section 11; a drift should fail, not wait for the integrator. |
| D14 | none | Extra attributes on the glyph: `data-scale`, `data-clipped`, `focusable="false"`; a clipped ray is dashed. `clipped` tolerates 1e-9 relative float noise (the roots of -16 have `r = 2.0000000000000004`). | A length of exactly 2 must not look clipped (measured on 1.4.2). |

### 0.3 Measured in the scratch prototype

- Unit suite (without the tests of the goals that land beside this one): 823 tests, 818 pass, **exactly the five wave-1 pins fail** (`I1 the registry`, `U3`, `U4`, `U5`, `U10`).
- `node tools/smoke.mjs --route home,addresses,roots,lab,problems,nosuchplace --dark --no-shots`: 18/18 checks passed.
- `node tools/smoke.mjs --route home,nosuchplace --script tests/interact/i2-decisions-kit.mjs --dark --no-shots`: 6/6, on every one of several runs, 45 s each.
- `tests/interact/i1-shell.mjs` with only its `=== 21` changed to `=== 22` (the wave-1 shell goal's edit): passes at both viewports, so the router rewrite
  keeps every iteration-1 router path (ctx shape, presets, failures, superseded loads, theme).
- `tests/interact/i1-data.mjs`, `i1-station-roots-principal.mjs`, `i1-station-curves-linear.mjs` through `interact-all`: all pass.
- Cost, headless Chromium, cold KaTeX: 29 chip pairs 3.5 ms; one problem card 0.43 ms warm; 29 cards 65 ms cold, 20 ms warm; `header` 0.07 ms; `links` 0.06 ms;
  `neighbours` 3 microseconds; `moveGlyph` 0.02 ms; `updateGlyph` 0.01 ms per changed value and about 0 for a repeated one; `picker` 0.25 ms.
- Contrast of every token pair the kit uses, both themes (section 3.4): all text pairs at least 5.0, all non-text pairs at least 4.1.

---

## 1. Goal restatement, story thread, problems and topics

**What this goal delivers.** Four pure-importable modules and a router change, so that every station shows the two decisions that settle a
test question, the move behind a number, and the same header, problem card and "where next" links, and so that the Rehearsal Room can open a
station with fresh numbers.

1. `js/data/problems.js` gains `names` on all 29 problems (the Names column of `docs/STORY.md` section 3) and `problemsForStation('rehearse')`
   returns all 29, `topicsForStation('rehearse')` all 12, like `'problems'`.
2. `js/core/decisions.js`: `chips(problem, { idPrefix })` draws the **Address** chip and the **Names** chip with a one-line meaning on tap;
   `picker({ idPrefix })` lets the student set both and marks them right or wrong; the pure `namesLabel`, `namesMeaning`, `addressMeaning`, `slug`, `grade`.
3. `js/core/moveglyph.js`: `moveGlyph(z)` is a 1.1em SVG (faint unit circle, the Arg arc, the ray of the length) beside a complex number; `glyphGeometry`
   and `glyphText` are pure.
4. `js/core/station-kit.js`: `header`, `problemCard`, `links`, `neighbours`, `valuesOf`, `titleSpan`, `freshNote`.
5. `js/app.js`: `ctx.preset` becomes a `values` preset when the store key `station.request` names the station about to mount (read and removed in one
   synchronous step); `window.__mv.app.request(req)` and `.preset()`; `PART_TITLES` is the registry's `PARTS`.
6. Tests and tools: the Names table pinned to STORY, the sync test and `interact-all` carry the iteration-2 rules, `i1-data` A1 and `i1-shell`
   `groupStations` are green with the 22-station registry.

**Story thread.**

- *Thread 2 made into a decision.* "A turn has many names" becomes a chip beside every problem: `names: none | any | all | home | continuous`. The
  student's own question, "what is the difference between a number's args and the number itself", is answered by a choice they make before they
  compute: which names of the angle does this question need?
- *Thread 1 carried to Chapter 3.* The same glyph that shows the move that makes z in Chapter 1 sits beside f′(z₀) in Chapter 3. "A number is a
  move" and "the derivative is a number, so it is a move" become one mark.
- *The decisions are the map of the test.* 29 problems, two chips each: the Address chip says where to stand, the Names chip says which steps of the
  staircase to use. The kit is what lets every station say it the same way.

**How it shows on screen.** Beside every problem statement (station cards now, the index and the Rehearsal Room in wave 1): two chips. The Address
chip carries one dot per address in order (blue Cartesian, orange polar) and its label (`Polar, then Cartesian`). The Names chip carries a three-step
staircase mark and `names: all`: an orange *filled* chip with three solid steps for `all`, an orange *outlined* chip with three outlined steps for `any`,
an orange tinted chip with the middle step solid for `home`, a dashed orange chip with a dashed seam through the steps for `continuous`, a grey chip with
a dash for `none`. Tap a chip and one plain sentence appears under it. Beside a number a 1.1em ring with an orange ray: the turn and the stretch.

**Review problems and topics covered** (the problems whose **Names** value is not `none`, plus the Chapter 3 problems whose glyph is the new idea):

| Problem | Place | Names | Why it is in this goal |
|---|---|---|---|
| 1.3.1 | `addresses` | home | Arg z = 2π/3: the home step is the answer; glyph beside z |
| 1.3.2 | `powers` | any | (√3 + i)^10: any name of 10θ gives the same point; report the home step |
| 1.4.1 | `roots` | all | 5th roots of unity: all five steps |
| 1.4.2 | `roots` | all | 4th roots of −16: all four steps; the card used in A4 |
| 1.4.3 | `roots` | all | z² − 4z + 13: the two square roots of −9 |
| 2.2.1 | `powermap` | any | zⁿ multiplies every name by n |
| 2.2.2 | `principal-root` | home | the principal root uses Arg only |
| 2.3.1 | `limits` | any | e^{2iθ}: a direction, whatever name |
| 2.4.1 | `branches` | continuous | the one problem about a continuous choice of name |
| 3.1.2 | `derivative` | any | the direction φ; the glyph at f′(0) = 0 |
| 3.2.1 | `cauchy-riemann` | none | f′ = f, the glyph of the local move |
| Topics | T1.3, T1.4, T2.2, T2.4, T3.1, T3.2 | | polar representation; powers and roots; power and root functions; branches; derivatives; Cauchy–Riemann |

The other 18 problems get their `names` value too (the whole table is in 4.1): ten are `none` (1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.5.1, 1.5.2, 2.1.2, 3.1.1, P3, P7) and eight are `any` (2.1.1, 2.1.3, 2.5.1, P1, P2, P4, P5, P6).

---

## 2. UX

None of these pieces is a page. They are bricks that a station (or the index, or the Rehearsal Room) builds into its own page, so this section
draws the brick in place, lists every control with its id, and gives every word a student reads.

### 2.1 Wireframes

**A. A station page that uses the kit, desktop (1280 px; the left menu is not drawn).** The station's own picture, readout and explainer
sit between the card and the links; the glyph sits beside the number in the station's readout.

```
+------------------------------------------------------------------------------------------------+
| Roots: Divide the Staircase                                  <h1 #roots-title>                 |
| Every step of the staircase of c divided by n lands on ...   <p.station-lede #roots-lede>      |
| (o- T2 . The staircase) (* T1 . One point, two addresses)    <ul.thread-badges #roots-threads> |
| [1.4.1] [1.4.2] [1.4.3]    1.4.2 has aria-current            <div.chips #roots-problem-chips>  |
+------------------------------------------------------------------------------------------------+
| |  Problem 1.4.2                                    <h2 #roots-problem-title>                  |
| |  Find all the 4th roots of -16. Express answers in both exponential and Cartesian forms.     |
| |                                                   <p #roots-problem-statement>               |
| |  Fresh numbers from the Rehearsal Room. The handout's own answer: ...   (empty unless set)   |
| |                                                   <p #roots-problem-note>                    |
| |  ( oo Polar, then Cartesian )  ( ,|| names: all )  <div #roots-problem-decisions>            |
| |  | Work in polar, then write the answer as x + iy.   |   <span #roots-problem-meaning>, a tap |
| |  Why this address. Find the roots in polar (divide every name of arg(-16) by 4), then ...    |
| |                                                   <p #roots-problem-why>                     |
| |  > Show the answer                                <details #roots-problem-answer>            |
| |  (the station's own extras go here)               <div #roots-problem-slot>                  |
|                                                                                                |
|  ... the station: planes, readout "z = -1 + 1.732i (@)", explainer ...                         |
|                                                                                                |
| [<- Powers: Spin n Times] [Curves and Time ->] [T2 next: z^n: Fans and Parabolas ->]           |
| [T1 next: Disks, Annuli, Boundaries ->] [Open in the Lab]        <nav.station-links #roots-links>
+------------------------------------------------------------------------------------------------+
   |  = the card's 4 px tone bar (orange for a polar problem, blue for a Cartesian one, navy for both)
   ,|| / oo / (@) are drawn marks: the three-step staircase, the address dots, the move glyph
```

**B. The same page at 390 px.** One column; chips and links wrap; each chip is at least 44 px tall; the meaning takes the full width.

```
+-----------------------------------+
| Roots: Divide the Staircase       |
| Every step of the staircase of c  |
| divided by n lands on one of n    |
| points on a circle ...            |
| (o- T2 . The staircase)           |
| (* T1 . One point, two addresses) |
| [1.4.1] [1.4.2] [1.4.3]           |
+-----------------------------------+
| | Problem 1.4.2                   |
| | Find all the 4th roots of -16.  |
| | Express answers in both         |
| | exponential and Cartesian forms.|
| | ( oo Polar, then Cartesian )    |
| | ( ,|| names: all )              |
| | | Every name gives a different| |
| | | answer: roots take all n    | |
| | | steps.                      | |
| | Why this address. Find the      |
| | roots in polar (divide every    |
| | name of arg(-16) by 4), then    |
| | convert each to x + iy because  |
| | the problem asks for both forms.|
| | > Show the answer               |
+-----------------------------------+
| ... station ...                   |
+-----------------------------------+
| [<- Powers: Spin n Times]         |
| [Curves and Time ->]              |
| [T2 next: z^n: Fans and           |
|  Parabolas ->]                    |
| [T1 next: Disks, Annuli,          |
|  Boundaries ->]                   |
+-----------------------------------+
```

**C. The Names chip, five values (what the student learns to read at a glance).** Border and fill are tokens; the mark is a three-step staircase
(or a dash) drawn in `currentColor`, so the fill alone never carries the meaning.

```
 none        any            all           home             continuous
 ( - none)   ( |_|_| any )  ( ,|| all )   ( _|#|_ home )   ( _|_:_|_ continuous )
 grey line   orange line    orange fill   orange tint      orange dashed line
 no steps    3 steps, open  3 steps, solid middle solid     3 steps, dashed seam
 text muted  text normal    text on-accent text normal     text normal
```

**D. Tapping a chip, and the picker (Rehearsal Room), three states.**

```
 closed                          open (after a tap on names)
 ( oo Polar, then Cartesian ) ( ,|| names: all )      ( oo Polar, then Cartesian ) ( [,||] names: all )   [] = 2 px ring
                                                      | Every name gives a different answer: roots |
                                                      | take all n steps.                          |

 picker, nothing set                       picker, both set (nothing marked)
 The two decisions                         The two decisions
 | Address  Which address makes this easy? | Address  Which address makes this easy?
 |  ( o Cartesian ) ( o Polar ) ( oo Cartesian, then polar ) ( oo Polar, then Cartesian )
 |  ( ooo Cartesian, polar, then back ) ( oo Either address )       the pressed chip is tinted
 | Names  Which names of the angle does it need?
 |  ( - none ) ( |_|_| any ) ( ,|| all ) ( _|#|_ home ) ( _|_:_|_ continuous )

 picker, marked (Address right, Names wrong), then disabled
 | Address  [tick] right ...                        the row bar is green (solid)
 | Names    [cross] wrong ...                       the row bar is red (dashed); the right chip has a green ring
 Address: right. Names: wrong. It is "any". Any name of the angle works: powers, products, directions, cos and sin.
```

**E. The move glyph and its geometry** (24 by 24 box, centre (12, 12), unit circle r = 6, scale 2: a number of length 2 reaches the edge). z = −1 + i√3,
r = 2, turn 120°:

```
   y=0   +------------------------+
         |      *  ray end (6, 1.61): the ray is 12 long = 6 * min(r, 2) with r = 2
         |       \
         |        \
         |         o  arc end (9, 6.80): on the ray, on the unit circle
         |          \  .-"""-.
         |           \'       '.        faint unit circle: radius 6, centre (12, 12)
   y=12  |------------+----------o---- Re   + centre (12, 12)    o arc start (18, 12)
         |                        |      the arc runs counterclockwise from the start to the end (sweep flag 0)
   y=24  +------------------------+      a ray with r > 2 stops at the box edge and is drawn dashed
         x=0                      x=24
   in context (1.1em next to a readout):   z = -1 + 1.732i  (@)       aria-label "move: turn 120°, stretch 2"
```

### 2.2 Every control, id, label and behaviour

**Decision chips** (`chips(problem, { idPrefix: P, meaning = true })`). Host `span.decisions[data-problem="<id>"]`.

| id | Element | Text (label) | Behaviour |
|---|---|---|---|
| `P-address` | `button.chip.decision-chip[type=button][data-decision=address][data-value=<code>]`, `aria-expanded`, `aria-controls="P-meaning"`, `title` = the address meaning, `data-tone` = `cart` or `polar` when the address has one tone | `addressLabel(code)`: `Cartesian`, `Polar`, `Cartesian, then polar`, `Polar, then Cartesian`, `Cartesian, polar, then back`, `Either address`; a leading `span.addr-dots` (aria-hidden) with one dot per tone in order | Click (tap, Enter, Space): if it is open, close; else close the other, set the meaning text to `addressMeaning(code)`, `data-for="address"`, `aria-expanded="true"`, show the meaning. |
| `P-names` | same with `data-decision=names`, `title` = the names meaning | `names: <code>`, a leading `svg.names-mark` (aria-hidden) | Same, with `namesMeaning(code)` and `data-for="names"`. |
| `P-meaning` | `span.decision-meaning[role=status][hidden]` | the sentence | The text is written before `hidden` is removed, so the live region announces it. Escape (focus anywhere in the host) closes it and leaves focus where it is. |

With `meaning: false` the chips are `span.chip.decision-chip` (same ids, `data-*`, `title`), have no `aria-expanded` or `aria-controls`, and the meaning span does not exist. Use it where a
chip is only a label (a collapsed index line, a screenshot). A chip is drawn only when the problem's code is valid, so bad data gives an empty `span.decisions`.

**Picker** (`picker({ idPrefix: P, onPick, address, names })`). `fieldset.decisions-picker#P`, `legend.dp-legend`, two rows, one status line.

| id | Element | Label | Behaviour |
|---|---|---|---|
| `P` | `fieldset` | legend `The two decisions` | `disable(true)` sets `disabled` on it and on every option |
| `P-address-row`, `P-names-row` | `div.dp-row[role=group][aria-labelledby=P-<decision>-label]` | label `Address`, hint `Which address makes this easy?`; label `Names`, hint `Which names of the angle does it need?` | `data-mark="right" or "wrong"` and `aria-invalid="true"` (wrong only) after `mark()` |
| `P-address-c`, `-p`, `-c-p`, `-p-c`, `-c-p-c`, `-both` | `button.chip.decision-chip.dp-opt[type=button][aria-pressed]` | the six address labels | Click: press it (the other five in the row release); click the pressed one: release it. Calls `onPick('address', code or null)`. |
| `P-names-none`, `-any`, `-all`, `-home`, `-continuous` | same | the five codes as words (`none`, `any`, ...) with the staircase mark | same, `onPick('names', code or null)` |
| `P-status` | `p.dp-status[role=status]` | empty until `mark()` | the sentence of section 2.5 |

A new pick in a row clears that row's mark, its "expected" ring and the status line (the student is changing an answer that was already marked).

**Move glyph** (`moveGlyph(z, { scale = 2, size = '1.1em', id })`): `svg.move-glyph[role=img]`, `aria-label` = `<title>` = `move: turn 120°, stretch 2` (`no move: 0` at the origin,
`no move: undefined` for a value that is not a number), `data-r`, `data-theta`, `data-scale`, `data-clipped`; children `title`, `circle.glyph-unit`, `path.glyph-arc` (absent at r = 0
or a turn of 0), `line.glyph-ray`. No control. The host station gives it the id (`#addresses-glyph`, `#derivative-glyph`, ...).

**Header** (`header(ctx, { lede, active, chips })`): `header.station-header#<s>-header`, `h1#<s>-title`, `p.station-lede#<s>-lede` (only when `lede` is not empty),
`ul.thread-badges#<s>-threads > li > span.thread-badge[data-thread]` (text `T2 · The staircase`, `title` = thread title and summary), `div.chips#<s>-problem-chips[role=group]`
(`aria-label` `Problems on this page`; absent when the station has no problem or `chips: false`) with `a.chip.problem-chip#<s>-problem-chip-<id with dashes>[href="#problem-<id>"]`
(text = the id, `aria-label` `Problem <id>`, `title` = the aha as plain text, `aria-current="true"` on `active`).

**Problem card** (`problemCard(ctx, problem, options)`), default id `<s>-problem`:

| id | Element | Content |
|---|---|---|
| `<id>` | `aside.callout.problem-card[data-problem][data-tone][aria-labelledby]`; `data-empty="true"` with no problem | |
| `<id>-title` | `h2.panel-title.pk-title` | `Problem 1.4.2` (or `options.title`); empty and hidden with no problem |
| `<id>-statement` | `p.pk-statement` | the statement: text nodes and KaTeX; the punctuation after a maths part stays with it in one `white-space: nowrap` run |
| `<id>-note` | `p.pk-note` | `options.note` or what `setNote` / `setProblem(_, { note })` gave; `Your own numbers.` when there is no problem; hidden when empty |
| `<id>-decisions` | `div.pk-decisions` | `decisions.chips(problem, { idPrefix: <id> })`, so `#<id>-address`, `#<id>-names`, `#<id>-meaning` |
| `<id>-why` | `p.pk-why` (absent when `why: false`) | `Why this address.` + `addressWhy` through `prose()` |
| `<id>-answer` | `details.pk-answer` (`answer: 'reveal'`), or `div.pk-answer` (`'open'`), or absent (`'none'`) | |
| `<id>-answer-toggle` | `summary` (reveal only) | `Show the answer` (fixed) with a drawn triangle that turns when open |
| `<id>-aha` | `p.pk-aha` inside the answer | `The aha.` + `aha` through `prose()` |
| `<id>-answer-tex` | `div.tex-scroll.pk-final[tabindex=0][role=group]`, `aria-label` `Answer, scrolls sideways if it is wide` | `answer.tex` as display KaTeX. With `aliases.answer`, this id names a wrapper div and the scroller carries the old id (D2). |
| `<id>-answer-hint` | `p.pk-hint`, the scroller's next sibling | `Scroll sideways to see the rest.`, shown only while the TeX is wider than its box |
| `<id>-answer-text` | `p.muted.mono` | `answer.text` (ASCII, wraps) |
| `<id>-route-cart`, `<id>-route-polar` | `section.pk-route[data-tone]` (only with `routes: true`; inside the answer when there is one) | `In Cartesian (slide)` / `In polar (spin and stretch)` and `routes.cart` / `routes.polar` through `prose()` |
| `<id>-slot` | `div.pk-slot` | empty; the station's own extras; hidden while empty |

Card API: `setProblem(problem | null, { note })`, `setNote(text)`, `setAnswerOpen(on)` (reveal only; sets `open` and refreshes the hint), `destroy()`.

**Links** (`links(ctx, { extras, lab, label })`): `nav.station-links#<s>-links[aria-label="Where next"]`; `a.station-link#<s>-link-<target>` (`data-dir`, and `data-thread` for a stop that only a thread leads to; one `span` inside), then the extras, then
`button.btn#<s>-open-lab` ("Open in the Lab") when `lab` is given. An empty nav with no button is `hidden`.

### 2.3 Pointer, touch and keyboard

- **Pointer and touch.** Chips, picker options and the answer summary are native buttons and a native `summary`, so a click, a tap and a pen all work; `touch-action: manipulation` comes from
  `components.css` (`.chip`, `.station-link`, `summary`). No hover-only information: the meaning is also one tap away. No drag, no long-press, no pointer capture, no `pointerdown` handler.
- **Keyboard.** Tab visits every chip, option, link and the summary in document order; Enter and Space activate buttons and the summary; **Escape** closes an open meaning; in a picker row
  **ArrowLeft and ArrowRight** move focus along the row (wrapping), **Home and End** to its ends (selection changes only with Enter or Space). Focus rings are the global `:focus-visible` rule of
  `theme.css` (3 px `--focus`); nothing in the kit removes or restyles it. The `.tex-scroll` answer box is focusable, so the arrow keys scroll a wide formula.
- **Screen reader.** Chips announce their text and `expanded`/`collapsed`; the meaning is a status region; picker options announce `pressed`/`not pressed`; a marked row says `invalid`; the status
  line announces the verdict; the glyph is an image with the move as its name; the header chips say `Problem 1.4.2`.

### 2.4 Empty, loading and error states

| Piece | Empty or missing data | Loading | Error |
|---|---|---|---|
| `chips` | A problem with no valid code shows no chip for it; `null` or `{}` gives an empty `span.decisions` (plus the hidden meaning span) | none (synchronous) | no `idPrefix` or a malformed one, or no document: `TypeError` |
| `picker` | Nothing pressed, status empty; invalid `address` or `names` arguments are ignored | none | same `TypeError`s; a throwing `onPick` is caught and logged with `console.error` (a programmer error must be seen) |
| `glyph` | `0` is `no move: 0` with no arc; a value that is not a number is `no move: undefined`, the unit circle and a zero-length ray, no arc | none | `updateGlyph` on something that is not a glyph: `TypeError`; without a document `moveGlyph`: `TypeError` |
| `header` | no `lede`: no paragraph; no problems: no chip row; no threads: no badges | none | no `ctx.station`: `TypeError` |
| `problemCard` | `setProblem(null)`: the neutral state (note `Your own numbers.`, everything else emptied, the card stays visible so a station keeps its height) | none | no id and no `ctx.station.id`, or a bad id: `TypeError`; a TeX error renders as the plain TeX with class `tex-error` (that is `tex()`'s behaviour) |
| `links` | station with nothing around it: `nav` is `hidden` | none | no `ctx.station`, or `lab` without `ctx.store.set` and `ctx.navigate`: `TypeError` |
| `valuesOf` | not a values preset: `null`; anything invalid: dropped | none | never throws |
| router | no request: the hash preset; a request for another station waits; a malformed request is dropped at the next render | the router's own `Loading...` after 150 ms | a station that throws still gets the under-construction panel; `state.preset` is cleared |

### 2.5 Copy (every string a student can read; plain, direct, for the night before)

| Where | Text |
|---|---|
| Names meanings | `none` No angle in the question. `any` Any name of the angle works: powers, products, directions, cos and sin. `all` Every name gives a different answer: roots take all n steps. `home` The home step only: Arg z in (−π, π], and principal values. `continuous` A choice of name that never jumps: a branch, with a seam where it must. |
| Address meanings | `C` A slide question: add or compare the x and y parts. `P` A move question: turn by the angle, stretch by the length. `C->P` Read the polar address of the given point, then work there. `P->C` Work in polar, then write the answer as x + iy. `C->P->C` Convert to polar, do the move, convert back. `both` Both addresses say something; write the formula in each. |
| Chips | `Cartesian`, `Polar`, `Cartesian, then polar`, `Polar, then Cartesian`, `Cartesian, polar, then back`, `Either address`; `names: none`, `names: any`, `names: all`, `names: home`, `names: continuous` |
| Picker | legend `The two decisions`; `Address` / `Which address makes this easy?`; `Names` / `Which names of the angle does it need?`; row mark (CSS) `✓ right`, `✗ wrong` |
| Picker status | right: `Address: right.` `Names: right.`. wrong: `Address: wrong. It is "<address label>". <address meaning>` and `Names: wrong. It is "<code>". <names meaning>`; both sentences joined by one space; a decision that was not set is not mentioned. Example: `Address: right. Names: wrong. It is "any". Any name of the angle works: powers, products, directions, cos and sin.` |
| Glyph | `move: turn 120°, stretch 2` (the turn in degrees to one decimal unless whole, ASCII minus, the stretch to three decimals); `no move: 0`; `no move: undefined` |
| Header | group label `Problems on this page`; chip label `Problem 1.4.2`; badge `T2 · The staircase` |
| Card | `Problem 1.4.2`; `Why this address. ` + addressWhy; `The aha. ` + aha; `Show the answer`; `Scroll sideways to see the rest.`; `Answer, scrolls sideways if it is wide`; `In Cartesian (slide)`; `In polar (spin and stretch)`; `Your own numbers.`; fresh note `Fresh numbers from the Rehearsal Room. The handout's own answer: <answer.text>` |
| Links | group label `Where next` (or the caller's); `T2 next: ` / `T1 previous: ` before a thread stop (from `threadLinkPrefix`); `Related: ` before a bridge; `Open in the Lab` |

---

## 3. Visual encoding (the two-address code, both themes)

Every colour is a token from `css/theme.css`; there is no literal colour in the three modules (test K11 scans the CSS and the whole file). Light and dark need no code:
the tokens change under `:root[data-theme="dark"]` and `prefers-color-scheme`, and the kit has no `themechange` listener because nothing in it bakes a colour in (KaTeX
in the statement and the answer is untinted and inherits the text colour; the tinted `cart()` / `polar()` strings belong to the explainers, not to this goal).

### 3.1 What each mark means

| Mark | Token | Reads as | Not colour alone because |
|---|---|---|---|
| Address dot, blue | `--cart` | the Cartesian address (a slide) | the label says `Cartesian`; the dots are in order |
| Address dot, orange | `--polar` | the polar address (a move) | the label says `Polar` |
| Address chip border | `--cart` or `--polar` when the address has one tone, `--border-strong` when it has two or three | native address of the problem | the dots show the order (C→P→C is blue, orange, blue) |
| Names chip `all` | fill `--polar`, text `--on-accent` | every step of the staircase | three solid steps; bold text |
| Names chip `any` | border `--polar`, fill `--surface` | any one step will do | three outlined steps |
| Names chip `home` | border `--polar`, fill 16% `--polar` over `--surface` (`--surface-2` where `color-mix` is missing) | the home window only | the middle step solid |
| Names chip `continuous` | **dashed** border `--polar` | a choice with a seam | a dashed seam through the steps, dashed border |
| Names chip `none` | border `--border-strong`, text `--text-muted` | no angle | a dash and no steps |
| Open chip | 2 px ring in the chip's own tone | this one is explained below | `aria-expanded`, and the sentence under it |
| Meaning box | `--surface-2` with a 3 px `--polar` left bar, text `--text` | a plain sentence | it is text |
| Picker pressed option | the base `.chip[aria-pressed="true"]` look of `components.css` (tinted, bold, inset ring) | my pick | `aria-pressed` |
| Row marked right | 4 px solid `--ok` left bar and the word `✓ right` | | the word and the symbol |
| Row marked wrong | 4 px **dashed** `--danger` left bar, the word `✗ wrong`, the picked chip gets a dashed `--danger` border, the right chip a 2 px `--ok` ring | | dashed versus solid, words |
| Move glyph | `currentColor`, which the kit's CSS sets to `--polar` (a host may override); unit circle at opacity 0.3; arc 1.6 wide; ray 2 wide; a clipped ray is dashed | the move: turn (arc) and stretch (ray) | `aria-label`, and the host prints the number |
| Card bar | `data-tone`: `cart`, `polar` or `accent` set `--tone` (components.css), drawn as the `.callout` left bar | the native address of the problem | the Address chip beside it |
| Route bars | `data-tone` `cart` and `polar` | `routes.cart`, `routes.polar` | headings `In Cartesian (slide)`, `In polar (spin and stretch)` |
| Thread badge | `data-thread` T1 `--cart` (disc), T2 `--polar` (dashed ring), T3 `--output` (diamond) | the threads through this station | three shapes, text `T2 · The staircase` |

### 3.2 The CSS, verbatim

Each module injects one `<style data-for="...">` into `document.head` the first time one of its DOM functions runs (`querySelector('style[data-for=...]')` guards it, so a
second call, a second mount or a second module copy adds nothing). Only `var(--token)` colours, `color-mix()` with a plain fallback declared first, and `transparent` /
`currentColor`. No id selectors, no `#`, no `${}`. The three template literals are named `STYLE`.

**`js/core/decisions.js` `STYLE`**

```css
.decisions { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); max-width: 100%; vertical-align: top; }
.decision-chip { max-width: 100%; text-align: left; font-size: 0.9rem; }
.decision-chip .addr-dots { display: inline-flex; gap: 3px; flex: none; }
.decision-chip .addr-dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--text-muted); }
.decision-chip .addr-dot[data-tone="cart"] { background: var(--cart); }
.decision-chip .addr-dot[data-tone="polar"] { background: var(--polar); }
.decision-chip .names-mark { width: 1rem; height: 1rem; flex: none; overflow: visible; }
.decision-chip .names-mark .ns { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }
.decision-chip .names-mark .ns-solid { fill: currentColor; }
.decision-chip .names-mark .ns-seam { stroke: currentColor; stroke-width: 1.4; stroke-dasharray: 2 2; fill: none; }
.decision-chip .names-mark .ns-dash { stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; fill: none; }
.decisions .decision-chip[data-decision="names"][data-value="none"] { --tone: var(--border-strong); color: var(--text-muted); }
.decisions .decision-chip[data-decision="names"][data-value="any"] { --tone: var(--polar); }
.decisions .decision-chip[data-decision="names"][data-value="all"] { --tone: var(--polar); background: var(--polar); color: var(--on-accent); font-weight: 700; }
.decisions .decision-chip[data-decision="names"][data-value="home"] { --tone: var(--polar); background: var(--surface-2); }
.decisions .decision-chip[data-decision="names"][data-value="continuous"] { --tone: var(--polar); border-style: dashed; }
@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  .decisions .decision-chip[data-decision="names"][data-value="home"] { background: color-mix(in srgb, var(--polar) 16%, var(--surface)); }
}
.decisions .decision-chip[data-decision="names"][data-value="all"]:hover { background: var(--polar); filter: brightness(1.1); }
.decisions .decision-chip[aria-expanded="true"] { box-shadow: 0 0 0 2px var(--tone, var(--accent)); }
span.decision-chip { cursor: default; }
.decision-meaning { flex: 1 1 100%; box-sizing: border-box; padding: var(--space-1) var(--space-2); border-left: 3px solid var(--polar); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--surface-2); color: var(--text); font-size: 0.92rem; line-height: 1.4; }
.decision-meaning[hidden] { display: none; }
.decisions-picker { display: grid; gap: var(--space-3); min-width: 0; margin: 0; padding: 0; border: 0; }
.decisions-picker .dp-legend { padding: 0; margin-bottom: var(--space-2); font-weight: 700; }
.dp-row { display: grid; gap: var(--space-1); min-width: 0; padding-left: var(--space-2); border-left: 4px solid var(--border); }
.dp-row[data-mark="right"] { border-left-color: var(--ok); }
.dp-row[data-mark="wrong"] { border-left-color: var(--danger); border-left-style: dashed; }
.dp-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-2); }
.dp-label { font-weight: 700; }
.dp-hint { color: var(--text-muted); font-size: 0.88rem; }
.dp-row[data-mark="right"] .dp-label::after { content: " \\2713 right"; color: var(--ok); font-weight: 600; }
.dp-row[data-mark="wrong"] .dp-label::after { content: " \\2717 wrong"; color: var(--danger); font-weight: 600; }
.dp-opts { display: flex; flex-wrap: wrap; gap: var(--space-2); min-width: 0; }
.dp-opt { max-width: 100%; text-align: left; }
.dp-opt[data-expected="true"] { box-shadow: 0 0 0 2px var(--ok); }
.dp-row[data-mark="wrong"] .dp-opt[aria-pressed="true"] { border-color: var(--danger); border-style: dashed; }
.dp-opt[disabled] { cursor: default; opacity: 0.75; }
.dp-status { margin: 0; min-height: 1.4em; color: var(--text); font-size: 0.95rem; line-height: 1.4; }
```

**`js/core/moveglyph.js` `STYLE`**

```css
.move-glyph { display: inline-block; flex: none; vertical-align: -0.2em; overflow: visible; color: var(--polar); }
.move-glyph .glyph-unit { fill: none; stroke: currentColor; stroke-width: 1; opacity: 0.3; }
.move-glyph .glyph-arc { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.move-glyph .glyph-ray { stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.move-glyph[data-clipped="true"] .glyph-ray { stroke-dasharray: 3 1.6; }
```

**`js/core/station-kit.js` `STYLE`**

```css
.station-header .thread-badges { margin-bottom: var(--space-2); }
.station-header .chips { margin-bottom: var(--space-1); }
.problem-card { display: grid; gap: var(--space-2); min-width: 0; background: var(--surface); }
.problem-card > * { min-width: 0; margin: 0; }
.problem-card .pk-title { font-size: 1.1rem; }
.problem-card .pk-statement { font-size: 1.05rem; overflow-wrap: anywhere; }
.problem-card .pk-note { color: var(--text-muted); }
.problem-card .pk-note:empty, .problem-card .pk-slot:empty { display: none; }
.problem-card .pk-decisions { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-2); }
.problem-card .pk-why, .problem-card .pk-aha { color: var(--text-muted); font-size: 0.95rem; line-height: 1.45; }
.problem-card .pk-lead { color: var(--text); font-weight: 700; }
.problem-card .pk-answer { display: block; }
.problem-card .pk-answer > summary { display: flex; align-items: center; gap: var(--space-2); min-height: var(--tap); cursor: pointer; font-weight: 600; list-style: none; }
.problem-card .pk-answer > summary::-webkit-details-marker { display: none; }
.problem-card .pk-answer > summary::before { content: "\\25B8"; display: inline-block; color: var(--text-muted); }
.problem-card .pk-answer[open] > summary::before { transform: rotate(90deg); }
.problem-card .pk-answer-body { display: grid; gap: var(--space-2); min-width: 0; }
.problem-card .pk-final { padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
.problem-card .pk-final .katex-display { max-width: none; margin: 0.4em 0; overflow: visible; }
.problem-card .pk-hint { color: var(--text-muted); font-size: 0.9rem; }
.problem-card .pk-routes { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.problem-card .pk-route { min-width: 0; padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.problem-card .pk-route h3 { margin: 0 0 var(--space-1); font-size: 0.95rem; }
.problem-card .pk-route p { margin: 0; }
.problem-card[data-empty="true"] { padding-block: var(--space-2); }
.pk-alias { display: contents; }
.station-links .station-link { text-align: left; }
```

(In the file the one backslash of the CSS escape `\25B8` and of `\2713`, `\2717` is written `\\` inside the template literal, as the appendix shows.)

### 3.3 The marks, drawn

- **Address dots.** `span.addr-dots[aria-hidden]` holding one `span.addr-dot[data-tone="cart" | "polar"]` per entry of `addressTones(code)`, in that order: `C` one blue dot, `P`
  one orange, `C->P` blue orange, `P->C` orange blue, `C->P->C` blue orange blue, `both` blue orange. 0.55rem circles, 3 px apart.
- **Names mark.** `svg.names-mark[viewBox="0 0 16 16"][aria-hidden]` at 1rem. Steps are three `rect`s with `rx 0.6`: `(x, y, w, h)` = `(1, 10, 4, 5)`, `(6, 6, 4, 9)`, `(11, 2, 4, 13)`
  (bottoms on y = 15). Class `ns` is outline (`fill none`, `stroke currentColor`, width 1.4), `ns ns-solid` is filled. `none`: one `line.ns-dash` from (3, 8) to (13, 8), width 1.6, round caps.
  `all`: three solid. `any`: three outlined. `home`: the middle step solid. `continuous`: three outlined plus `line.ns-seam` from (8, 0) to (8, 16), dashed 2 2.
- **Glyph.** `viewBox 0 0 24 24`, `circle.glyph-unit` at the centre with radius 6, `path.glyph-arc` (inserted before the ray so the ray is on top), `line.glyph-ray` from (12, 12).

### 3.4 Contrast, measured with the WCAG formula on the real tokens

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `--text` on `--surface` (chip text, card text) | 15.96 | 14.52 | 4.5 |
| `--text` on `--surface-2` (meaning box) | 13.05 | 12.74 | 4.5 |
| `--text-muted` on `--surface` (`none` chip, hints) | 6.86 | 7.80 | 4.5 |
| `--text-muted` on `--surface-2` | 5.60 | 6.85 | 4.5 |
| `--on-accent` on `--polar` (`all` chip) | 6.06 | 9.13 | 4.5 |
| `--text` on 16% `--polar` tint (`home` chip, pressed chips) | 12.53 | 10.74 | 4.5 |
| `--polar` stroke on `--surface` (glyph, orange borders, dots) | 6.06 | 8.30 | 3 |
| `--polar` on `--bg` (glyph on the page background) | 5.46 | 9.13 | 3 |
| `--cart` on `--surface` (dots, borders) | 6.17 | 7.12 | 3 |
| `--border-strong` on `--surface` (`none` chip border) | 4.14 | 4.33 | 3 |
| `--ok` on `--surface` / `--surface-2` (right mark, expected ring) | 6.12 / 5.00 | 8.86 / 7.77 | 3 (text 4.5) |
| `--danger` on `--surface` / `--surface-2` (wrong mark) | 6.54 / 5.34 | 7.03 / 6.17 | 3 (text 4.5) |

The unit circle of the glyph is drawn at opacity 0.3 on purpose: it is a faint reference, not information (the arc and the ray carry the move).

---

## 4. Module API

Signature lines are the ones of `docs/ARCHITECTURE.md` 11.1 to 11.3, character for character after the sync test's normalisation (comments and layout ignored, destructuring
aliases ignored). The new sync guard (4.6) fails when a line differs from the code.

### 4.1 `js/data/problems.js` (edit)

1. Insert `names: '<code>',` on the line after `address: '...',` in each of the 29 problem objects (the object key order is `... station, alsoAt, address, names, addressWhy, aha ...`). The values are the Names column of
   `docs/STORY.md` section 3, and the whole table is:

   | names | problems |
   |---|---|
   | `none` (11) | 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.5.1, 1.5.2, 2.1.2, 3.1.1, 3.2.1, P3, P7 |
   | `any` (12) | 1.3.2, 2.1.1, 2.1.3, 2.2.1, 2.3.1, 2.5.1, 3.1.2, P1, P2, P4, P5, P6 |
   | `all` (3) | 1.4.1, 1.4.2, 1.4.3 |
   | `home` (2) | 1.3.1, 2.2.2 |
   | `continuous` (1) | 2.4.1 |

2. Replace `const INDEX_STATION = 'problems';` by `const FULL_LIST_STATIONS = new Set(['problems', 'rehearse']);` (comment: the stations that list everything: the index and the Rehearsal Room), and use `FULL_LIST_STATIONS.has(stationId)`
   in `problemsForStation` and `topicsForStation`. No other function changes. The export list stays the 15 names of `i1-data` A4. The comment block at the top gains one convention line: `names` is the second decision
   (none, any, all, home, continuous), the last column of STORY section 3; and the ARCHITECTURE-3.3 comment on `problemsForStation` already says `'problems'` and `'rehearse'`.
3. Nothing else in the data moves: `A4: statements are the handout wording`, the aha pins and the answer values are untouched. The file stays free of imports, `console` and literal colours.

### 4.2 `js/core/decisions.js` (new; imports `../data/problems.js` only)

```js
export const NAMES_CODES                                    // frozen ['none', 'any', 'all', 'home', 'continuous']
export const NAMES_MEANING                                  // frozen { none, any, all, home, continuous } the five sentences of 2.5
export const ADDRESS_MEANING                                // frozen, one sentence per ADDRESS_CODES entry (2.5)
export function namesLabel(code)                            // pure → 'names: all'; '' for anything that is not a code
export function namesMeaning(code)                          // pure → NAMES_MEANING[code] or '' (own keys only: 'constructor' gives '')
export function addressMeaning(code)                        // pure → ADDRESS_MEANING[code] or '' (own keys only)
export function slug(code)                                  // pure → lower case, runs of non-alphanumerics to one '-', trimmed: 'C->P->C' → 'c-p-c', 'both' → 'both', null → ''
export function chips(problem, { idPrefix, meaning = true } = {})   // → span.decisions
export function picker({ idPrefix, onPick = null, address = null, names = null } = {})   // → Picker
export function grade(picked, expected)                     // pure → { address: boolean | null, names: boolean | null, all: boolean }
```

Exact text of the three constants is in the appendix and in 2.5. `NAMES_CODES` and `ADDRESS_CODES` (from `problems.js`) are the only sources of valid codes; `isAddress` and `isNames` are private.

**Picker** `{ el, get(), set(next), mark(result), reset(), disable(on), destroy() }`:

- `el`: the `fieldset.decisions-picker#<idPrefix>` (the caller appends it).
- `get()` → a fresh `{ address: code | null, names: code | null }`.
- `set({ address?, names? })`: each key present is applied when it is `null` or a valid code, else ignored; `onPick` is **not** called (a program is setting it, not the student).
- `mark({ address: true | false | null, names: true | false | null, expected: { address, names } })`: per row, `true` gives `data-mark="right"`, `false` gives `data-mark="wrong"`, `aria-invalid="true"` and `data-expected="true"` on the option whose value is `expected[decision]`,
  `null` or a missing key clears the row; then the status text is rebuilt (5.3). `mark()` does not disable; the caller calls `disable(true)` after a reveal.
- `reset()`: both picks `null`, marks, expected rings and status cleared (not the disabled state).
- `disable(on)`: `fieldset.disabled` and every option's `disabled` follow `!!on`; marks stay.
- `destroy()`: removes `el`; later calls are no-ops (`get()` returns the last picks).

**Events.** `chips`: one `click` and one `keydown` listener on the host (delegation; none when `meaning: false`). `picker`: one `click` and one `keydown` listener on the fieldset. `onPick(decision, value)` runs after the state and the
buttons have been updated, inside `try`/`catch` (`console.error('[decisions] onPick threw', err)`). **No window or document listener anywhere; no timer; no observer.**

**Lifecycle.** Nothing to clean up for `chips` (its listeners die with its elements). A station calls `picker.destroy()` in `unmount` (the Rehearsal Room does). The style tag is shared and stays.

### 4.3 `js/core/moveglyph.js` (new; no import statement at all)

```js
export function glyphGeometry(z, { scale = 2, box = 24 } = {})   // pure → { r, theta, unitR, rayEnd: { x, y }, arc: { start, end, large, sweep } | null, clipped }
export function glyphText(z)                                // pure → 'move: turn 120°, stretch 2' | 'no move: 0' | 'no move: undefined'
export function moveGlyph(z, { scale = 2, size = '1.1em', id = null } = {})   // → svg.move-glyph
export function updateGlyph(svg, z, { scale } = {})         // redraws in place; returns svg
```

`z` is `{ re, im }` or a bare number. `glyphGeometry` returns `theta = 0` at the origin and for a value that is not a number; `arc` is `null` at r = 0, for a turn below 1e-9, and for a value that is not a number;
`clipped` is true when `r > scale` (relative tolerance 1e-9); `scale` and `box` fall back to 2 and 24 when they are not finite and positive. `updateGlyph` takes its scale from `data-scale` when `scale` is not given. A per-element `WeakMap` remembers
the last `re|im|scale`, so a repeated update changes nothing. **Lifecycle:** none; the host removes the element with the rest of its DOM.

### 4.4 `js/core/station-kit.js` (new; imports `./katex.js`, `./decisions.js`, `../data/problems.js`, `../registry.js`)

```js
export function header(ctx, { lede = '', active = null, chips = true } = {})   // → header.station-header
export function problemCard(ctx, problem, options = {})     // → Card
export function links(ctx, { extras = [], lab = null, label = 'Where next' } = {})   // → nav.station-links
export function neighbours(ctx)                             // pure → { prev, next, threads: [{ thread, prev, next }] }
export function valuesOf(preset, shape)                     // pure → object | null
export function titleSpan(text)                             // → span (prose)
export function freshNote(problem, preset)                  // pure → string
```

(`import { chips as decisionChips } from './decisions.js'`, because `header` has an option named `chips`.)

**`options` of `problemCard`**: `id` (default `<ctx.station.id>-problem`; letters, digits, `-`, `_`, starting with a letter), `tone` (`cart` | `polar` | `accent`; default derived, D10), `title` (default `Problem <id>`), `why = true`, `routes = false`,
`answer = 'reveal' | 'open' | 'none'` (anything else is `'reveal'`), `note = ''`, `aliases = {}` (`answer`: an extra id for the scroller; `card`: an extra id for a `display: contents` wrapper that becomes `Card.el`). **Card** is
`{ el, setProblem(problem | null, { note } = {}), setNote(text), setAnswerOpen(on), els: { title, statement, decisions, why, answer, answerTex, answerText, note, slot, routeCart, routePolar }, destroy() }`;
a key is `null` when its part was not asked for (`why: false`, `answer: 'none'`, `routes: false`); `els.answerTex` is always the scroller; `Card.el` is the `aside` (or the alias wrapper).

**`neighbours(ctx)`**: `ctx` needs `stations` (the registry array) and `station` (a registry entry); the result holds the registry entries themselves (not copies). **`valuesOf(preset, shape)`** shapes: `'complex'`, `'real'`, `'int'`, `'bool'`, `'string'`,
an array of allowed strings, or a function `(v) → cleaned | undefined` (a throw counts as `undefined`); the result is a plain object with only the valid keys of `shape`, complex values copied, `-0` turned into `0`.

**Events.** `links`: one `click` on the lab button (when `lab` is given): `ctx.store.set('lab.request', lab, { persist: false }); ctx.navigate('lab')`. `problemCard`: one `ResizeObserver` on the scroller (plus `document.fonts.ready`) to show or hide the
scroll hint; no other listener. `header`, `titleSpan`: none.

**Lifecycle.** A station calls `card.destroy()` in `unmount` (it disconnects the observer and removes the card). The header and the links hold no resource; removing them with the station's DOM is enough.

### 4.5 `js/app.js` (edit; the export list stays `SITE_TITLE, PART_TITLES, documentTitle, groupStations, parseRoute, start`)

1. `import { STATIONS, THREADS, PARTS, stationById, stationForProblem, stationForTopic } from './registry.js';` and `export const PART_TITLES = PARTS;` (the local object is deleted).
2. Module constant `REQUEST_KEY = 'station.request'`. Module-level, pure, **not exported** (the sync test would want them documented): `isPlainObject`, `knownProblem`, `cleanRequest`, `deepFreeze`, `valuesPreset` (5.8).
3. In `start()`: `state` gains `preset: null`; `takeStationRequest(stationId)` (5.8); `makeCtx(route, st, preset)` takes the preset as a third argument and puts it in `ctx.preset` (the frozen ctx keeps its eight keys);
   `teardown()` sets `state.preset = null`; `render()` does, right after the late-superseded check and `section.replaceChildren()`: `const preset = takeStationRequest(st.id) || route.preset; state.preset = preset;` and passes it to `makeCtx`; the failure branch sets
   `state.preset = null` before `console.error`.
4. `window.__mv.app = { render, navigate, state, request, preset }` with `request: (req) => { store.set(REQUEST_KEY, req, { persist: false }); }` and `preset: () => state.preset`. `stop()` already deletes `window.__mv.app`.
5. `parseRoute` is untouched. The comment at the top of the file stays true (the imports are the registry and three shell helpers).
6. Insertion points for the wave-1 Walk, left intact: the post-mount block (where `state.current` is set) and `teardown()`.

### 4.6 Tests and tools

- `tests/unit/architecture-sync.test.mjs`: the import test becomes `ALLOWED_IMPORTS` and "every import found is in the allowed list" (a file may import fewer; it also fails a module imported twice); a second test checks `ALLOWED_IMPORTS` against the "Iteration 2 imports" paragraph of ARCHITECTURE section 1
  (every file named there, every import in backticks); the style-tag test asserts that every file mentioning `data-for` is one of the seven and that each built kit module is among them; per-section checks are factored into `checkSignatures` and `checkExports`
  and run again for the blocks `11.1` to `11.3` while the three kit files exist (D13). Appendix E has the diff.
- `tests/unit/i1-data.test.mjs`: import `META_STATIONS`; `REAL_STATIONS` skips it; the two registry-agreement assertions use `REAL_STATIONS`; `names` is checked in the required-fields test; `problemsForStation('rehearse')` and `topicsForStation('rehearse')` are asserted in the lookups test.
- `tests/unit/i1-shell.test.mjs`: `groupStations` expects `[7, 2, 7, 2, 4]` and the notes; a test that `app.PART_TITLES === PARTS`.
- `tests/unit/i2-decisions-kit.test.mjs` (new, Appendix F) and `tests/interact/i2-decisions-kit.mjs` (new, Appendix G).
- `tools/interact-all.mjs`: the nine iteration-2 rows of ARCHITECTURE section 8 in `ROUTES` (a unit test compares them to the block in the document).

---

## 5. Algorithms (numbered pseudocode)

Conventions: `el(tag, attrs, ...kids)` creates an element, sets every attribute whose value is not `null`, `undefined` or `false` (`true` writes an empty attribute) and appends the kids;
`needDocument(who)` throws `TypeError(who + ' needs a document')` when `typeof document === 'undefined'`; `ensureStyle()` appends the module's `<style data-for="...">` to `document.head`
unless one is there; `idKey(id)` is `id.replace(/\./g, '-')`; `PREFIX_RE = /^[A-Za-z][A-Za-z0-9_-]*$/`.

### 5.1 Pure helpers of `decisions.js`

```
isNames(c)   = typeof c is 'string' and NAMES_CODES.includes(c)
isAddress(c) = typeof c is 'string' and ADDRESS_CODES.includes(c)          // ADDRESS_CODES from problems.js
hasKey(o,k)  = typeof k is 'string' and Object.prototype.hasOwnProperty.call(o, k)

1. namesLabel(code)     = isNames(code) ? 'names: ' + code : ''
2. namesMeaning(code)   = hasKey(NAMES_MEANING, code) ? NAMES_MEANING[code] : ''
3. addressMeaning(code) = hasKey(ADDRESS_MEANING, code) ? ADDRESS_MEANING[code] : ''
4. slug(code): s = String(code is null or undefined ? '' : code).toLowerCase()
               s = s.replace(/[^a-z0-9]+/g, '-')            // a whole run, '->' included, becomes one '-'
               return s.replace(/^-+|-+$/g, '')
5. grade(picked, expected):
     p = picked if it is an object else {};  e = expected if it is an object else {}
     one(k) = (p[k] is null or undefined) ? null : (p[k] === e[k])
     address = one('address');  names = one('names')
     return { address, names, all: address === true and names === true }
```

### 5.2 `chips(problem, { idPrefix, meaning = true })`

```
1.  if idPrefix is not a string matching PREFIX_RE: throw TypeError('chips: idPrefix is required ...')
2.  needDocument('chips'); ensureStyle()
3.  p = problem if it is an object else {}
4.  host = el('span', { class: 'decisions', 'data-problem': p.id if it is a string })
5.  tag = meaning ? 'button' : 'span'
6.  make(decision, code, tip, content, tone):
        chip = el(tag, { class: 'chip decision-chip', id: idPrefix + '-' + decision, 'data-decision': decision, 'data-value': code, title: tip, 'data-tone': tone,
                         type: meaning ? 'button' : null, 'aria-expanded': meaning ? 'false' : null, 'aria-controls': meaning ? idPrefix + '-meaning' : null })
        chip.append(...content); return chip
7.  if isAddress(p.address): host.append(make('address', p.address, addressMeaning(p.address),
                                  [ addressDots(p.address), textNode(addressLabel(p.address)) ], singleTone(p.address)))
8.  if isNames(p.names):     host.append(make('names', p.names, namesMeaning(p.names), [ namesMark(p.names), textNode(namesLabel(p.names)) ], null))
9.  if not meaning: return host
10. note = el('span', { class: 'decision-meaning', id: idPrefix + '-meaning', role: 'status', hidden: true }); host.append(note)
11. close(): for each button.decision-chip in host: aria-expanded = 'false'; note.hidden = true; note.textContent = ''; remove note's data-for
12. host 'click': chip = event.target.closest('button.decision-chip'); if none or not inside host: return
        wasOpen = chip's aria-expanded === 'true';  close();  if wasOpen: return
        note.textContent = chip.dataset.decision === 'address' ? addressMeaning(chip.dataset.value) : namesMeaning(chip.dataset.value)
        note.dataset.for = chip.dataset.decision;  chip aria-expanded = 'true';  note.hidden = false          // text first, then show
13. host 'keydown': if key === 'Escape' and note is shown: close()
14. return host

addressDots(code):  span.addr-dots[aria-hidden=true] with one span.addr-dot[data-tone = token without '--'] per entry of addressTones(code), in order
singleTone(code):   unique tone names of addressTones(code); the one name when there is exactly one, else null
namesMark(code):    section 3.3 (an svg built with createElementNS)
```

### 5.3 `picker({ idPrefix, onPick, address, names })`

```
1.  validate the prefix (TypeError), needDocument('picker'), ensureStyle()
2.  state = { address: isAddress(address) ? address : null, names: isNames(names) ? names : null };  destroyed = false;  disabled = false
3.  buildRow(decision, label, hint, codes):
      for code in codes: button.chip.decision-chip.dp-opt[type=button][id = P + '-' + decision + '-' + slug(code)][data-decision][data-value = code]
                         [aria-pressed=false][title = meaning of the code][data-tone = singleTone(code) for an address option]
                         content: names option → [ namesMark(code), text(code) ];  address option → [ addressDots(code), text(addressLabel(code)) ]
      row = div.dp-row[id = P + '-' + decision + '-row'][role=group][aria-labelledby = P + '-' + decision + '-label']
            holding div.dp-head (span.dp-label#P-<decision>-label = label, span.dp-hint = hint) and div.dp-opts (the buttons)
4.  el = fieldset.decisions-picker#P with legend.dp-legend 'The two decisions', the two rows (ADDRESS_CODES, NAMES_CODES in order) and p.dp-status#P-status[role=status]
5.  paint(): for each option: aria-pressed = String(state[its decision] === its value)
6.  clearMark(decision): remove data-mark and aria-invalid from the row, data-expected from its options; status.textContent = ''
7.  el 'click': btn = target.closest('.dp-opt'); if none, or destroyed, or disabled: return
        d = btn.dataset.decision;  state[d] = (state[d] === btn.dataset.value) ? null : btn.dataset.value
        paint(); clearMark(d); if onPick is a function: try onPick(d, state[d]) catch (err) console.error('[decisions] onPick threw', err)
8.  el 'keydown': for ArrowLeft, ArrowRight, Home, End on a .dp-opt: list = that row's options; i = its index;
        j = Home → 0; End → last; else (i ± 1 + length) % length;  preventDefault();  list[j].focus()
9.  mark(result): for each decision: clearMark(decision); m = result[decision];
        if m === true: row data-mark = 'right'
        if m === false: row data-mark = 'wrong'; aria-invalid = 'true'; the option whose value === result.expected[decision] gets data-expected = 'true'
     status.textContent = statusText({ address: result.address, names: result.names }, result.expected)
10. statusText(marks, expected): parts = []
        for decision in ['address', 'names']:  m = marks[decision];  if m is null or undefined: continue
            name = decision === 'address' ? 'Address' : 'Names'
            if m === true: parts.push(name + ': right.'); continue
            want = expected && expected[decision]
            label = decision === 'address' ? addressLabel(want) : (isNames(want) ? want : '')
            meaning = decision === 'address' ? addressMeaning(want) : namesMeaning(want)
            parts.push(label ? name + ': wrong. It is "' + label + '". ' + meaning : name + ': wrong.')
        return parts.join(' ')
11. set(next): ignore when destroyed or next is not an object; for each of address, names that is a key of next and is null or a valid code: state[k] = next[k]; paint()
12. reset(): both picks null; paint(); clearMark both.     13. disable(on): disabled = !!on; el.disabled = disabled; every option .disabled = disabled
14. destroy(): destroyed = true; el.remove()  (idempotent).     get(): returns { address: state.address, names: state.names }, a new object every call
```

### 5.4 Move glyph

```
asComplex(z): number → { re: z, im: 0 }; object → { re: Number(z.re), im: Number(z.im) }; anything else → { NaN, NaN }
fmt3(x):   NaN → 'undefined'; ±Infinity → 'inf' / '-inf';
           if |x| ≥ 1e15 or 1e-9 < |x| < 1e-3: m×10ⁿ with m = trimmed x.toExponential(3) mantissa and n in Unicode superscripts ('1×10⁻⁵', '1×10²⁰')
           else trimmed x.toFixed(3) ('2', '3.606', '0'; '-0' becomes '0')
n3(v):     String(Math.round(v * 1000) / 1000 + 0)           // path coordinates to three decimals, no '-0'

glyphGeometry(z, { scale = 2, box = 24 }):
 1. { re, im } = asComplex(z);  sc = scale if finite and > 0 else 2;  bx = box if finite and > 0 else 24;  half = bx / 2;  unitR = half / sc;  centre = { x: half, y: half }
 2. if re or im is not finite:  return { r: NaN, theta: 0, unitR, rayEnd: centre, arc: null, clipped: false }
 3. r = Math.hypot(re, im);  if r === 0: return { r: 0, theta: 0, unitR, rayEnd: centre, arc: null, clipped: false }
 4. theta = Math.atan2(im, re);  if (im === 0 and re < 0) or theta ≤ -π: theta = π;  theta += 0                  // Arg in (−π, π], never −0
 5. ux = re / r;  uy = im / r;  len = unitR * Math.min(r, sc)
 6. rayEnd = { x: half + len * ux, y: half − len * uy }                       // SVG y points down, so the imaginary axis is flipped
 7. arc = |theta| < 1e-9 ? null : { start: { x: half + unitR, y: half }, end: { x: half + unitR * ux, y: half − unitR * uy }, large: false, sweep: theta > 0 ? 0 : 1 }
 8. return { r, theta, unitR, rayEnd, arc, clipped: r > sc * (1 + 1e-9) }

glyphText(z):  g = glyphGeometry(z);  if r is NaN: 'no move: undefined';  if r === 0: 'no move: 0'
               d = Math.round(theta * 180 / π * 10) / 10;  deg = d === 0 ? '0' : (Number.isInteger(d) ? String(d) : d.toFixed(1))
               return 'move: turn ' + deg + '°, stretch ' + fmt3(r)

draw(svg, z, scale):                                                              // shared by moveGlyph and updateGlyph
 1. key = re + '|' + im + '|' + scale;  if lastKey.get(svg) === key: return svg;  lastKey.set(svg, key)       // WeakMap
 2. g = glyphGeometry(z, { scale });  text = glyphText(z)
 3. set (only when different) on svg: aria-label = text, data-r = fmt3(g.r), data-theta = fmt3(g.theta), data-scale = String(scale), data-clipped = String(g.clipped); title.textContent = text
 4. circle.glyph-unit r = n3(g.unitR);  line.glyph-ray x2 = n3(g.rayEnd.x), y2 = n3(g.rayEnd.y)
 5. if g.arc: find path.glyph-arc or create it (class glyph-arc) and insert it before the ray; d = 'M sx sy A R R 0 L S ex ey' with R = n3(unitR), L = large ? 1 : 0, S = sweep, coordinates n3
    else: remove path.glyph-arc if it exists
moveGlyph(z, { scale, size, id }): needDocument; ensureStyle; svg (namespace SVG) class 'move-glyph', role 'img', width = height = size, viewBox '0 0 24 24', focusable 'false', id when given;
               children in order: title, circle.glyph-unit (cx = cy = 12), line.glyph-ray (x1 = y1 = 12);  return draw(svg, z, scale)
updateGlyph(svg, z, { scale }): if svg is not an element with class move-glyph: throw TypeError; s = scale if given else Number(data-scale) or 2; return draw(svg, z, s)
```

### 5.5 `neighbours`, `valuesOf`, `freshNote`

```
neighbours(ctx):
 1. list = a copy of ctx.stations (when it is an array, else []) sorted by order;  cur = ctx.station;  i = index of cur.id in list;  if there is no cur or i < 0: return { prev: null, next: null, threads: [] }
 2. prev = list[i-1] or null;  next = list[i+1] or null;  story = ids of prev and next
 3. for thread in list[i].threads (registry order):  members = stations of list whose threads include thread;  j = index of cur;  tp = members[j-1] or null;  tn = members[j+1] or null
        if (tp and tp.id not in story) or (tn and tn.id not in story): threads.push({ thread, prev: tp, next: tn })      // D1
 4. return { prev, next, threads }
valuesOf(preset, shape):
 1. if preset is not an object or preset.kind !== 'values': return null
 2. given = preset.values if it is a plain object (not an array) else {};  out = {}
 3. for key of Object.keys(shape):   skip '__proto__', 'constructor', 'prototype' and keys that are not own keys of given
        v = given[key]; kind = shape[key]
        'complex' → v is an object with finite numbers re and im → { re: re + 0, im: im + 0 }                 // a bare number is not accepted
        'real' → typeof v === 'number' and finite → v + 0;      'int' → Number.isInteger(v) → v + 0;      'bool' → typeof boolean;      'string' → typeof string
        array → v is a string included in the array;            function → try kind(v) catch → undefined
        anything else → undefined;     if the result is not undefined: out[key] = result
 4. return out
freshNote(problem, preset): '' unless problem is an object with a string id and preset.kind === 'values' and preset.problem === problem.id;
        else "Fresh numbers from the Rehearsal Room. The handout's own answer: " + problem.answer.text
```

### 5.6 `header` and `links`

```
header(ctx, { lede, active, chips }):
 1. needDocument; ensureStyle; st = ctx.station (TypeError without a string id);  threads = ctx.threads if it is an array else THREADS (registry)
 2. root = header.station-header#<s>-header;  h1#<s>-title with prose(h1, st.title)                           // the exponent in 'z^n: ...' is raised
 3. if lede is not empty: p.station-lede#<s>-lede = lede (textContent)
 4. badges: for t of st.threads: li > span.thread-badge[data-thread = t][title = th.title + '. ' + th.summary] text threadLabel(th or t);  append the ul#<s>-threads when it has an li
 5. if chips (the option): ids = problemsForStation(st.id).map(id);  if ids is not empty: div.chips#<s>-problem-chips[role=group][aria-label='Problems on this page']
        for id: a.chip.problem-chip#<s>-problem-chip-<idKey(id)>[href='#problem-' + idKey(id)][aria-label='Problem ' + id][title = plainProse(aha)][aria-current='true' when id === active] text = id
 6. return root
links(ctx, { extras, lab, label }):
 1. needDocument; ensureStyle; st = ctx.station (TypeError);  if lab and not (ctx.store.set and ctx.navigate are functions): TypeError
 2. nav = nav.station-links#<s>-links[aria-label = label];  shown = empty set
 3. add(href, text, { dir, thread, title }): target = href without '#', non-[A-Za-z0-9_-] runs → '-', trimmed;  if target is empty or in shown: return;  shown.add(target)
        a.station-link#<s>-link-<target>[href][data-dir][data-thread][title] containing ONE span with prose(span, text)
 4. nb = neighbours(ctx);  nb.prev → add('#' + id, title, { dir: 'prev' });  nb.next → { dir: 'next' }
 5. for t of nb.threads: t.prev → add(..., threadLinkPrefix(t.thread, 'prev') + title, { dir: 'prev', thread: t.thread, title: 'Previous on thread ' + t.thread });  t.next likewise ('Next on thread ')
 6. for x of extras (skip entries without string href and text): add(x.href, (x.prefix or '') + x.text, { dir: x.dir, thread: x.thread })
 7. if lab: button.btn#<s>-open-lab[type=button] 'Open in the Lab'; click → ctx.store.set('lab.request', lab, { persist: false }); ctx.navigate('lab')
 8. if nav has no children: nav.hidden = true;  return nav
```

### 5.7 `problemCard`

```
statementNodes(parts)  (a copy of js/stations/problems.js, whose markup the card must equal):
    out = [];  for part of parts:  last = out[out.length-1]
        if not part.math:  m = (last and last.math and last.tail === '') ? /^[.,;:!?)\]]+/.exec(part.text) : null
                           if m: last.tail = m[0];  if part.text.length > m[0].length: out.push({ math: false, text: part.text.slice(m[0].length) });  continue
                           out.push({ math: false, text: part.text })
        else out.push({ math: true, text: part.text, tail: '' })
appendStatement(host, parts):  for node of statementNodes(parts):  text → text node;  maths → span with tex(span, node.text), and, when node.tail is not empty,
        wrapped with a text node of the tail in a span whose style.whiteSpace = 'nowrap'              // NO class on the maths span: the markup must equal appendStatement(host, parts, '')

build (once):
 1. needDocument; ensureStyle;  id = options.id, else ctx.station.id + '-problem';  if id is not a string matching PREFIX_RE: TypeError
 2. mode = options.answer if 'reveal' | 'open' | 'none' else 'reveal';  fixedTone = options.tone when cart | polar | accent
 3. els.title h2.panel-title.pk-title#id-title;  els.statement p.pk-statement;  els.note p.pk-note;  els.decisions div.pk-decisions;  els.why p.pk-why (unless why: false);  els.slot div.pk-slot  (ids id + '-title' ...)
 4. unless mode 'none': aha p.pk-aha#id-aha;  scroller div.tex-scroll.pk-final[tabindex=0][role=group][aria-label='Answer, scrolls sideways if it is wide'] with id = aliases.answer or id + '-answer-tex';
        hint p.pk-hint#id-answer-hint[hidden] 'Scroll sideways to see the rest.';  els.answerText p.muted.mono#id-answer-text
        body div.pk-answer-body = [aha, scroller, hint, answerText];  with aliases.answer: [aha, div#id-answer-tex(scroller, hint), answerText]
 5. routes: div.pk-routes with section.pk-route#id-route-cart[data-tone=cart] and #id-route-polar[data-tone=polar] (h3 and an empty p each); appended to body, or to the card when mode is 'none'
 6. mode 'reveal': details.pk-answer#id-answer > summary#id-answer-toggle 'Show the answer' + body;  mode 'open': div.pk-answer#id-answer > body
 7. root = aside.callout.problem-card#id[aria-labelledby = id + '-title'] with children in order: title, statement, note, decisions, why, answer, slot;  aliases.card: wrap in div.pk-alias#<alias>; Card.el is the outermost
 8. scroller: ResizeObserver(refreshHint) (try/catch) and document.fonts.ready.then(refreshHint);  refreshHint(): hint.hidden = !(scroller.scrollWidth > scroller.clientWidth + 1)
render(p, noteText):
 1. real = p is an object with a string id
 2. clear statement, decisions, why;  answer.hidden = !real
 3. if not real: remove data-problem; data-empty = 'true'; data-tone = fixedTone or 'accent'; title.textContent = '' and hidden; empty aha, scroller, answer text, route paragraphs;
                 note = noteText if given and not empty else 'Your own numbers.';  return
 4. data-problem = p.id; remove data-empty; data-tone = fixedTone or toneFor(p);  title shown, text = options.title or 'Problem ' + p.id
 5. appendStatement(statement, statementParts(p.statement))
 6. note = noteText if it is not undefined or null, else options.note if it is a string, else ''
 7. decisions.append(decisionChips(p, { idPrefix: id }));  why = lead('Why this address. ') + prose(p.addressWhy);  aha = lead('The aha. ') + prose(p.aha)       // lead = span.pk-lead
 8. tex(scroller, p.answer.tex, { display: true });  answerText.textContent = p.answer.text;  route paragraphs = prose(p.routes.cart), prose(p.routes.polar);  refreshHint()
toneFor(p): unique tone names of addressTones(p.address): exactly one → that name; else 'accent'
Card.setAnswerOpen(on): reveal mode only: details.open = !!on; refreshHint().      Card.destroy(): idempotent; disconnect the observer; remove the outermost element
```

### 5.8 The router (`app.js`)

```
isPlainObject(v) = v is an object, not null, not an array
knownProblem(id) = typeof id === 'string' and stationForProblem(id) is not null ? id : null        // the registry lists every problem
cleanRequest(raw): if not isPlainObject(raw) or typeof raw.station !== 'string' or stationById(raw.station) is null or not isPlainObject(raw.values): return null
                   return { station: raw.station, problem: knownProblem(raw.problem), family: knownProblem(raw.family), values: raw.values }
valuesPreset(req) = deepFreeze({ kind: 'values', station: req.station, problem: req.problem, family: req.family, values: req.values })

takeStationRequest(stationId)        // inside start(); no await anywhere in it
 1. raw = store.get(REQUEST_KEY, null);  if raw === null: return null
 2. req = cleanRequest(raw);  if req and req.station !== stationId: return null           // somebody else's request stays where it is
 3. store.remove(REQUEST_KEY)                                                             // consumed, or malformed and dropped
 4. return req ? valuesPreset(req) : null

render():  ... await import(st.module) ...; if seq !== state.seq: return;  clear the loading placeholder;  section.replaceChildren();
           preset = takeStationRequest(st.id) || route.preset;  state.preset = preset;  unmount = await mod.mount(section, makeCtx(route, st, preset))
```

The request is taken after the module has loaded and the navigation is known to be current, so a superseded load never eats it; the get and the remove run in one synchronous function, so no other code can read the key between them. A request wins over a hash preset. `store.get` returns a copy,
so the preset's `values` belong to the preset alone; JSON round-tripping turns a NaN into `null`, which `valuesOf` then rejects as "not a finite number".

### 5.9 Reading the STORY table (used by the unit test)

```
section = docs/STORY.md text after the heading '## 3. ' and before '## 4. '
rows    = lines matching /^\| (?:\d\.\d\.\d|P\d) /                                  // the 29 problem rows; the topics table has T-ids and is skipped
cells   = line.split(/(?<!\\)\|/).map(trim)                                         // an escaped bar \| is maths (|z|), not a column
          // cells[0] and the last cell are empty (outside the outer bars): 6 columns, 8 cells
id      = first whitespace-separated word of cells[1]
names   = /^[a-z]+/.exec(cells[cells.length - 2])[0]                                // 'none (any, for the polar check)' → 'none'; 'any (report on the home step)' → 'any'
```

---

## 6. Mathematics

Every number below was computed twice: by hand (shown) and with `js/core/complex.js` or plain `Math` in a scratch script. The unit tests (Appendix F) assert them.

### 6.1 Formulas the kit uses

| # | Formula | Used by |
|---|---|---|
| F1 | r = √(x² + y²) (`Math.hypot`); Arg z = `atan2(y, x)`, except Arg(negative real) = π (never −π) and Arg 0 is not defined (the glyph draws no arc) | `glyphGeometry` |
| F2 | unit circle radius u = (box/2)/scale, so 6 for the defaults; ray length L = u · min(r, scale); ray end = (c + L·x/r, c − L·y/r) with c = box/2; the minus is because SVG's y points down. `clipped` ⇔ r > scale (relative tolerance 1e-9) | `glyphGeometry` |
| F3 | arc on the unit circle from angle 0, start (c + u, c), end (c + u·x/r, c − u·y/r); `large` = false for every Arg (|θ| ≤ π); `sweep` = 0 for θ > 0 (counterclockwise on screen) and 1 for θ < 0; no arc when \|θ\| < 1e-9 | `glyphGeometry`, SVG `A` command |
| F4 | degrees d = round(10 · θ · 180/π)/10, written without a decimal point when whole, ASCII minus, `0` for a zero (never `-0`) | `glyphText` |
| F5 | stretch = r printed with at most 3 decimals, trailing zeros trimmed; for \|r\| < 1e-3 (but above the 1e-9 noise floor) or ≥ 1e15 as m×10ⁿ | `glyphText`, `data-r` |
| F6 | thread neighbours: members of thread T in registry order; prev = member before the station, next = the member after | `neighbours` |
| F7 | tone of a problem: the set of tones of `addressTones(address)`; one element gives that tone, more give `accent` | `problemCard` |
| F8 | WCAG contrast (L₁ + 0.05)/(L₂ + 0.05), L = 0.2126 R + 0.7152 G + 0.0722 B on linearised sRGB | section 3.4 |
| F9 | a 16% tint is `color-mix(in srgb, var(--polar) 16%, var(--surface))`, i.e. 0.16 · polar + 0.84 · surface per channel | the `home` chip |

### 6.2 The glyph, worked

z = −1 + i√3: r = √(1 + 3) = 2; θ = atan2(√3, −1) = 2π/3 = 120°; u = 12/2 = 6; L = 6 · min(2, 2) = 12; ray end x = 12 + 12 · (−1/2) = 6, y = 12 − 12 · (√3/2) = 12 − 6√3 = 1.607695; arc start (18, 12), arc end
(12 + 6 · (−1/2), 12 − 6 · (√3/2)) = (9, 12 − 3√3) = (9, 6.803848); sweep 0; not clipped. Text `move: turn 120°, stretch 2`. (The goal text writes the ray end as `1.6077`; that is this value rounded to four places, which is why the test uses the formula, D4.)

| Number | Where it appears | r | Arg | `glyphText` | ray end | arc end (sweep) | clipped |
|---|---|---|---|---|---|---|---|
| 1 | 2.3.1 limit along y = x²; f′(0) of 3.2.1 | 1 | 0 | `move: turn 0°, stretch 1` | (18, 12) | no arc | no |
| 0 | f′(0) of 3.1.2 | 0 | none | `no move: 0` | (12, 12) | no arc | no |
| 3 | the clipping example | 3 | 0 | `move: turn 0°, stretch 3` | (24, 12) | no arc | **yes** |
| −1 | 2.3.1 along x = 0 | 1 | π | `move: turn 180°, stretch 1` | (6, 12) | (6, 12) (0) | no |
| −2i | A2 example | 2 | −π/2 | `move: turn -90°, stretch 2` | (12, 24) | (12, 18) (1) | no |
| −1 + i√3 | 1.3.1 | 2 | 2π/3 | `move: turn 120°, stretch 2` | (6, 1.608) | (9, 6.804) (0) | no |
| √3 + i | 1.3.2 base | 2 | π/6 | `move: turn 30°, stretch 2` | (22.392, 6) | (17.196, 9) (0) | no |
| 512 − 512√3 i | 1.3.2 result | 1024 | −π/3 | `move: turn -60°, stretch 1024` | (18, 22.392) | (15, 17.196) (1) | **yes** |
| √2 + √2 i, −√2 + √2 i, −√2 − √2 i, √2 − √2 i | 1.4.2 roots | 2 (2.0000000000000004 in floating point) | π/4, 3π/4, −3π/4, −π/4 | `move: turn 45°, stretch 2`, `135°`, `-135°`, `-45°` | on the box edge | | **no** (the tolerance) |
| e^{2πi/5}, e^{6πi/5} | 1.4.1 roots | 1 | 2π/5, −4π/5 | `move: turn 72°, stretch 1`, `move: turn -144°, stretch 1` | (13.854, 6.294), (7.146, 15.527) | on the ray end | no |
| 2 + 3i | 1.4.3 | √13 = 3.605551 | 56.3099° | `move: turn 56.3°, stretch 3.606` | (18.656, 2.015) | (15.328, 7.008) (0) | yes |
| 1 + i | 2.2.2 root | √2 | π/4 | `move: turn 45°, stretch 1.414` | (18, 6) | (16.243, 7.757) (0) | no |
| ½ + (√3/2)i | 2.4.1 f(−1) | 1 | π/3 | `move: turn 60°, stretch 1` | (15, 6.804) | (15, 6.804) (0) | no |
| 3 + 2i | 3.1.1 f′(1 + i) | √13 | 33.6901° | `move: turn 33.7°, stretch 3.606` | (21.985, 5.344) | (16.992, 8.672) (0) | yes |
| e^{0.5} e^{0.8i} = 1.148675 + 1.182720i | 3.2.1 f′(0.5 + 0.8i) | 1.648721 | 0.8 = 45.8366° | `move: turn 45.8°, stretch 1.649` | (18.892, 4.904) | (16.18, 7.696) (0) | no |

Rounding examples: 56.3099° → 563.099 → 563 → 56.3; 33.6901° → 33.7; 45.8366° → 45.8; 119.99999° (float noise on 120) → 1200 → 120 → `120`.

### 6.3 Every covered problem, in both addresses

Each block gives the question's **Names** decision with the number that justifies it, the **Cartesian** working, the **polar** working, and the values that go into the tests.

**1.3.1. Write z = −1 + i√3 in polar and exponential form; what is Arg z?** Names: **home** (the question asks for the one number Arg z).
- Cartesian: r = √((−1)² + (√3)²) = √4 = 2. cos θ = x/r = −1/2 and sin θ = y/r = √3/2, which holds at θ = 2π/3 and at no other angle in (−π, π]. z = 2(cos 2π/3 + i sin 2π/3).
- Polar: the dot is in the second quadrant, a 60° (π/3) reference angle from the negative real axis, so θ = π − π/3 = 2π/3. Every name is 2π/3 + 2πk; that set is arg z = {…, −4π/3, 2π/3, 8π/3, …}; the member in (−π, π] is Arg z = 2π/3.
- Check: 2 cos(2π/3) = 2(−1/2) = −1 and 2 sin(2π/3) = 2(√3/2) = √3. So z = 2e^{i2π/3}. Numbers: r = 2, Arg = 2.0943951023931953, 120°. Glyph: `move: turn 120°, stretch 2`.

**1.3.2. (√3 + i)^10 in Cartesian form.** Names: **any** (a power does not care which name of the angle you multiply; report the home step).
- Polar: r = √(3 + 1) = 2; Arg = arctan(1/√3) = π/6. zⁿ = rⁿ e^{inθ}: z^10 = 2^10 e^{i·10π/6} = 1024 e^{i5π/3}. 5π/3 is outside (−π, π]; subtract 2π: −π/3. Cartesian: 1024 (cos(−π/3) + i sin(−π/3)) = 1024 (1/2 − i√3/2) = **512 − 512√3 i ≈ 512 − 886.8100 i**.
- Cartesian (repeated squaring): z² = (√3 + i)² = 3 + 2√3 i − 1 = 2 + 2√3 i; z⁴ = (2 + 2√3 i)² = 4 + 8√3 i − 12 = −8 + 8√3 i; z⁸ = (−8 + 8√3 i)² = 64 − 128√3 i − 192 = −128 − 128√3 i; z^10 = z⁸ · z² = (−128 − 128√3 i)(2 + 2√3 i) = −256 − 256√3 i − 256√3 i + 768 = 512 − 512√3 i.
- Steps zᵏ (the spiral): k = 1: (1.732051, 1); 2: (2, 3.464102); 3: (0, 8) = 8i; 4: (−8, 13.856406); 5: (−27.712813, 16); 6: (−64, 0); 7: (−110.851252, −64); 8: (−128, −221.702503); 9: (0, −512); 10: (512, −886.810013).
- Why any: another name of arg z is π/6 + 2πm; ten times it is 5π/3 + 20πm, which differs from 5π/3 by 10m whole turns, so e^{i·10θ} is the same point for every m (test K14 checks m = −3..3 to 1e-6).
- Numbers: result (512, −512√3), r = 1024, Arg = −π/3 = −1.0471975511965976, rawAngle 5π/3. Glyphs: `move: turn 30°, stretch 2` (the base), `move: turn -60°, stretch 1024` (the result, clipped).

**1.4.1. The 5th roots of unity.** Names: **all**.
- Polar: 1 = 1·e^{i2πk}, so zⁿ = 1 gives z = e^{i2πk/5}, k = 0, 1, 2, 3, 4 (k = 5 is k = 0 again): (1, 0), (0.309017, 0.951057), (−0.809017, 0.587785), (−0.809017, −0.587785), (0.309017, −0.951057). Arg of each: 0, 2π/5, 4π/5, −4π/5, −2π/5.
- Cartesian: z⁵ − 1 = (z − 1)(z⁴ + z³ + z² + z + 1). Divide the quartic by z² and put w = z + 1/z: w² + w − 1 = 0, so w = (−1 ± √5)/2. On the unit circle w = 2 cos θ: cos 72° = (√5 − 1)/4 = 0.309017, cos 144° = −(√5 + 1)/4 = −0.809017; sin 72° = √((5 + √5)/8) = 0.951057, sin 144° = √((5 − √5)/8) = 0.587785.
- Check: the roots sum to 0: 1 + 2(0.309017) + 2(−0.809017) = 0. gcd(k, 5) = 1 for k = 1..4, so every root but 1 is primitive. Glyphs: `move: turn 72°, stretch 1` (k = 1), `move: turn -144°, stretch 1` (k = 3).

**1.4.2. The 4th roots of −16, exponential and Cartesian.** Names: **all**.
- Polar: −16 = 16e^{iπ}, arg(−16) = {π + 2πk}. |z| = 16^{1/4} = 2; angles (π + 2πk)/4 = π/4 + kπ/2, k = 0..3: π/4, 3π/4, 5π/4, 7π/4 (k = 4 gives 9π/4 = π/4 + 2π, the first again). Cartesian: 2 cos 45° = 2(√2/2) = √2, so **√2 + √2 i, −√2 + √2 i, −√2 − √2 i, √2 − √2 i**. As Arg: π/4, 3π/4, −3π/4, −π/4.
- Cartesian: z⁴ + 16 = (z² − 4i)(z² + 4i) because (z²)² − (4i)² = z⁴ + 16. z² = 4i: (a + bi)² = a² − b² + 2abi, so a² = b² and ab = 2, a = b = ±√2: ±(√2 + √2 i). z² = −4i: ab = −2: ±(√2 − √2 i).
- Check: (√2 + √2 i)⁴ = (4i)² = −16. Glyphs: the four roots read 45°, 135°, −135°, −45° with stretch 2.

**1.4.3. Solve z² − 4z + 13 = 0.** Names: **all** (the two square roots of −9).
- Cartesian: z = (4 ± √(16 − 52))/2 = (4 ± √(−36))/2 = (4 ± 6i)/2 = **2 ± 3i**. Check: (2 + 3i)² − 4(2 + 3i) + 13 = (−5 + 12i) − (8 + 12i) + 13 = 0.
- Polar: complete the square, (z − 2)² = −9 = 9e^{iπ}. Then z − 2 = 3e^{i(π + 2πk)/2}: k = 0 gives 3e^{iπ/2} = 3i, k = 1 gives 3e^{i3π/2} = −3i. Slide by 2: 2 ± 3i. A mirror pair, because the coefficients are real.
- Glyphs: 2 + 3i is `move: turn 56.3°, stretch 3.606` (arctan(3/2) = 56.3099°, √13 = 3.605551); 2 − 3i is `move: turn -56.3°, stretch 3.606`.

**2.2.1. The image of 0 < arg z < π/4 under w = z³.** Names: **any** (every name of arg z is tripled; a name plus 2π becomes a name plus 6π, still a name of arg w).
- Polar: |w| = |z|³ and a name of arg w is 3θ, so the sector opens to **0 < arg w < 3π/4**; every point of that sector is hit, because w in it has the cube root |w|^{1/3} e^{i Arg(w)/3} with Arg/3 in (0, π/4).
- Cartesian: z = x + iy, the sector is 0 < y < x. u = x³ − 3xy², v = 3x²y − y³. Then v = y(3x² − y²) > 0 (3x² − y² > 2x²), and u + v = x³ + 3x²y − 3xy² − y³ = (x − y)(x² + 4xy + y²) > 0. So the image lies in {v > 0, u + v > 0}, the open sector between the positive real axis and the ray u + v = 0 (direction (−1, 1), 135° = 3π/4). The edge y = x: z = t(1 + i), z³ = t³(1 + i)³ = t³(−2 + 2i), direction 135°.
- Sample: z = 1 + 0.2i, z³ = 0.88 + 0.592i, Arg = 0.5921867 = 3 · arctan(0.2) = 3 · 0.1973956; inside (0, 3π/4 = 2.356194).

**2.2.2. The principal value of (2i)^{1/2}.** Names: **home** (the principal root uses Arg only).
- Polar: |2i| = 2, Arg(2i) = π/2. w^{1/2} = |w|^{1/2} e^{i Arg(w)/2} = √2 e^{iπ/4} = √2(√2/2 + i√2/2) = **1 + i**. The other square root comes from the next name π/2 + 2π: √2 e^{i5π/4} = −1 − i.
- Cartesian: (a + bi)² = 2i gives a² − b² = 0 and 2ab = 2, so a = b and a² = 1: ±(1 + i). The principal one has Re > 0: 1 + i.
- Glyphs: w = 2i is `move: turn 90°, stretch 2`; the root is `move: turn 45°, stretch 1.414`.

**2.3.1. lim (x² − y² + 2ixy)/(x² + y²) as z → 0 along y = x².** Names: **any** (a direction; e^{2iθ} does not change when θ gains 2π).
- Cartesian: with y = x²: (x² − x⁴ + 2ix³)/(x² + x⁴) = (1 − x² + 2ix)/(1 + x²) → **1** as x → 0. Values: x = 0.1: 0.980198 + 0.198020i; x = 0.01: 0.999800 + 0.019998i; x = 0.001: 0.999998 + 0.002000i.
- Polar: the expression is z²/|z|² = e^{2iθ}, θ a name of arg z: it remembers the direction and forgets the distance. Along y = x², tan θ = x² / x = x → 0, so e^{2iθ} → 1. The full limit does not exist: along y = x (θ = π/4) the value is e^{iπ/2} = i; along x = 0 (θ = π/2) it is −1; along y = 0 it is 1.
- Glyphs: 1 is `move: turn 0°, stretch 1`, i is `move: turn 90°, stretch 1`, −1 is `move: turn 180°, stretch 1`.

**2.4.1. A branch of z^{1/3} continuous along the negative x-axis.** Names: **continuous**.
- Polar: take the window of names 0 < θ < 2π, whose seam is the positive real axis: f(z) = r^{1/3} e^{iθ/3}. At z = −r, θ = π, so f(−r) = r^{1/3} e^{iπ/3}; f(−1) = ½ + (√3/2)i, and f(−1)³ = e^{iπ} = −1. Across the negative axis the name does not jump in this window: just above the axis Arg = π − ε is itself the name π − ε; just below, Arg = −π + ε, whose name in the window (0, 2π) is Arg + 2π = π + ε. Both give θ/3 → π/3, so f is continuous there. The principal window (−π, π] has its seam on the negative axis: just above −1 it gives e^{iπ/3}, just below e^{−iπ/3}, a jump of √3.
- Cartesian: the cube roots of −1 solve w³ + 1 = (w + 1)(w² − w + 1) = 0: w = −1, ½ ± (√3/2)i. A branch picks one root at each z; the window above picks ½ + (√3/2)i at z = −1 and keeps it when z moves across the axis. With ε = 1e-9: z = −1 + iε gives (0.5000000003, 0.8660254036) and z = −1 − iε gives (0.4999999997, 0.8660254040) in this branch (equal to 1e-9); the principal branch gives (0.5000000003, −0.8660254036) below.
- Glyph: f(−1) is `move: turn 60°, stretch 1`.

**3.1.2. f(z) = |z|² is differentiable only at 0.** Names: **any** (the direction φ; e^{−2iφ} is the same for φ and φ + 2π).
- Limit (Cartesian algebra): [|z + h|² − |z|²]/h = [(z + h)(z̄ + h̄) − z z̄]/h = z̄ + z (h̄/h) + h̄. With h = ρe^{iφ}, h̄/h = e^{−2iφ} and h̄ → 0, so the quotient tends to **z̄ + z e^{−2iφ}**: a circle of radius |z| about z̄ as φ goes round; one point only when z = 0, where the quotient is h̄ → 0, so f′(0) = 0.
- Cauchy–Riemann: u = x² + y², v = 0: u_x = 2x = v_y = 0 forces x = 0 and u_y = 2y = −v_x = 0 forces y = 0, so only at the origin (and never on a disk: nowhere analytic).
- Polar: |z|² = r² has no angle; the only angle left is the direction φ of the approach. Polar CR: u_r = 2r and v_θ/r = 0, equal only at r = 0.
- Numbers at z = 1 + i: centre z̄ = 1 − i, radius √2 = 1.414214. φ = 0: z̄ + z = 2; φ = π/2: z̄ − z = −2i; φ = π/4: z̄ + z(−i) = (1 − i) + (1 − i) = 2 − 2i. Each is √2 from the centre: |2 − (1 − i)| = |1 + i|, |−2i − (1 − i)| = |−1 − i|, |(2 − 2i) − (1 − i)| = |1 − i|. In the `localLinear` form A = z̄ = 1 − i and B = z = 1 + i.
- Glyphs: f′(0) = 0 is `no move: 0`; A at 1 + i is `move: turn -45°, stretch 1.414`.

**3.2.1. f(z) = e^x(cos y + i sin y) is entire; find f′.** Names: **none** (no angle is named in the question).
- Cartesian: u = e^x cos y, v = e^x sin y. u_x = e^x cos y = v_y; u_y = −e^x sin y = −v_x. The partials are continuous everywhere, so f is entire, and f′ = u_x + i v_x = e^x cos y + i e^x sin y = **f(z)**.
- Polar: f(z) = e^x e^{iy}: its polar address is (e^x, y), stretch e^x and turn y. The Jacobian [[u_x, u_y], [v_x, v_y]] = e^x [[cos y, −sin y], [sin y, cos y]] is a stretch times a rotation, the shape of one move; that is what Cauchy–Riemann says. So f′(z₀) is the move that makes f(z₀).
- Numbers at z₀ = 0.5 + 0.8i: f′ = f = 1.148675 + 1.182720i, |f′| = e^{0.5} = 1.648721, Arg f′ = 0.8 rad = 45.8366°; the Jacobian is [[1.148675, −1.182720], [1.182720, 1.148675]] with determinant e^{2x} = e = 2.718282. At 0: f′(0) = 1. Check from the data: f(iπ/2) = e⁰(cos π/2 + i sin π/2) = i.
- Glyph: f′(0.5 + 0.8i) is `move: turn 45.8°, stretch 1.649`.

### 6.4 The Names decision as numbers (test K14)

| Names | What the number says | Value |
|---|---|---|
| any | (√3 + i)^10 equals 1024 e^{i·10(π/6 + 2πm)} for every integer m | 512 − 886.8100i for m = −3..3 (to 1e-6) |
| all | the four 4th roots of −16 are pairwise ≥ 1.9 apart, step k = 4 is step k = 0, each root⁴ = −16 | roots (±√2, ±√2); `2e^{i(π + 8π)/4}` = `2e^{iπ/4}` |
| home | (2i)^{1/2} on the principal branch is 1 + i; the name π/2 + 2π gives −1 − i | (1, 1) and (−1, −1) |
| continuous | seam 0: the values just above and below −1 differ by under 1e-8; principal: they differ by √3 | 0.5 + 0.8660254i at −1 |
| none | nothing to assert: the question has no angle | |

---

## 7. Verification plan

Run from the repository root. "Passing" is what the prototype printed; a builder's totals may differ by a test or two if it adds cases, but the named tests and the five expected failures may not.

### 7.1 One table

| Id | Command | Passing looks like |
|---|---|---|
| A1 | `node --test tests/unit/i2-decisions-kit.test.mjs tests/unit/i1-data.test.mjs` | all ok. K1 (29 `names` from `NAMES_CODES`, equal to the literal table 11/12/3/2/1), K2 (the same 29 read from the STORY table), K3 (the 15 exports, `rehearse` lists 29 problems in handout order and 12 topics, fresh arrays). Mutation check run in the prototype: change 2.4.1 to `home` and K1 and K2 both fail. |
| A2 | same file | K4 (`slug`, labels, meanings, `grade`), K5 (frozen constants, key sets equal `NAMES_CODES` and `ADDRESS_CODES`, `TypeError`s), K6 (`glyphGeometry`), K7 (`glyphText`) |
| A3 | same file | K8 (`valuesOf`), K9 (`neighbours`, all 22 stations), K10 (`freshNote`, `titleSpan` needs a document) |
| A4 | `node tools/smoke.mjs --route home,nosuchplace --script tests/interact/i2-decisions-kit.mjs --dark --no-shots` (or `node tools/interact-all.mjs i2-decisions`) | `6/6 checks passed across 2 route(s).` (two routes at desktop, phone and dark desktop; about 45 s); no `interaction script failed` line; no console error |
| A5 | `npm test 2>&1 \| grep -E '^not ok\|^# (tests\|pass\|fail)'` | exactly five `not ok` lines from this goal's pins (a goal that lands in the same wave brings its own tests, and those are that goal's): `I1 the registry: 21 stations ...`, `U3 threadStops ...`, `U4 layoutMap wide ...`, `U5 layoutMap narrow ...`, `U10 stationNeighbours`; prototype total 823 tests, 818 pass. Also `node --test tests/unit/architecture-sync.test.mjs tests/unit/i1-shell.test.mjs` fully green. |
| A5 (tools) | `node --test tests/unit/i2-decisions-kit.test.mjs` | K13: the nine `i2-*` rows of `tools/interact-all.mjs` equal the block in ARCHITECTURE section 8, row by row. K14: the numbers behind the five Names codes (6.4). |
| A6 | `node tools/smoke.mjs --route home,addresses,roots,lab,problems,nosuchplace --dark --no-shots` | `18/18 checks passed across 6 route(s).` |
| A7 | K11 and K12 of the unit file, plus the greps in 7.5 | ok; the greps print nothing |

Also run before handing over: `node tools/interact-all.mjs i1-data i1-station-roots i1-station-curves` (the iteration-1 scripts that touch the router and the data still pass: 3/3, 18/18, 18/18), and the one-line experiment of 0.3 (`i1-shell.mjs` with `=== 21` changed to `=== 22` in a scratch copy passes at both viewports).

### 7.2 A1 and A2, the unit cases and their expected values

| Test | Cases (value) |
|---|---|
| K1 | `PROBLEMS.length` 29; the literal table covers each handout id once; counts per code `[11, 12, 3, 2, 1]` in the order none, any, all, home, continuous; `p.names` in `NAMES_CODES` and equal to the table for all 29 |
| K2 | the section-3 table of `docs/STORY.md` (5.9): 29 rows of 8 cells; the first word of the last cell equals `problemById(id).names` for every row; the rows are in handout order |
| K3 | `Object.keys(P).sort()` equals the 15 names; `problemsForStation('rehearse')` and `('problems')` map to the 29 ids; `topicsForStation('rehearse')` to the 12; two calls return different arrays; `problemsForStation('home')` is `[]`; `('roots')` is 1.4.1, 1.4.2, 1.4.3; `PROBLEMS[0]` and `[28]` are frozen |
| K4 | `slug('C->P->C')` `'c-p-c'`, `slug('P->C')` `'p-c'`, `slug('C->P')` `'c-p'`, `slug('both')` `'both'`, `slug(' --a  b-- ')` `'a-b'`, `slug(null)` `''`; the six address slugs `c, p, c-p, p-c, c-p-c, both`; `namesLabel('all')` `'names: all'`, `namesLabel('x')` `''`; `namesMeaning('all')` starts `Every name gives a different answer`; `namesMeaning('constructor')` `''`; `addressMeaning('C->P->C')` `'Convert to polar, do the move, convert back.'`; `grade({address:'P', names:'all'}, {address:'P', names:'all'})` `{address:true, names:true, all:true}`; `grade({address:null, names:'any'}, {address:'P', names:'all'})` `{address:null, names:false, all:false}`; `grade({address:'C', names:'all'}, same)` `{false, true, false}`; `grade(undefined, e)` `{null, null, false}` |
| K5 | frozen constants; `Object.keys(NAMES_MEANING)` is `NAMES_CODES`; `Object.keys(ADDRESS_MEANING)` is `ADDRESS_CODES`; every sentence longer than 10 characters, ends with a full stop, no double space, no emoji; `NAMES_MEANING.home` is `The home step only: Arg z in (−π, π], and principal values.`; `chips(p, {})`, `chips(p, { idPrefix: 'a b' })` and `picker({})` throw `TypeError`; with a good prefix and no document they throw `/needs a document/` |
| K6 | −1 + i√3: r 2 (1e-12), theta 2π/3 (1e-12), unitR 6, ray end x 6 and y 12 − 6√3 (1e-9, and 1.6077 within 5e-5), arc start (18, 12), arc end (9, 12 − 3√3), sweep 0, large false, clipped false. 1: ray end (18, 12), arc null, theta 0. 0: ray end (12, 12), arc null. 3: (24, 12), clipped true. 2: clipped false. (√2, √2): clipped false. 2.001: clipped true. −1: theta π, arc end (6, 12), sweep 0. −2i: theta −π/2, sweep 1, ray end (12, 24), arc end (12, 18). `{scale: 4, box: 48}` and 2: unitR 6, ray end (36, 24). Bad options give the defaults. `NaN`, `Infinity`, `undefined`, `null`, `'x'`: r NaN, no arc, not clipped, theta 0, ray end (12, 12). `1 − 0.001i` sweep 1; `1 + 1e-12 i` arc null |
| K7 | the 20 texts of section 6.2 and 6.3: `move: turn 120°, stretch 2`, `no move: 0`, `move: turn -90°, stretch 2`, `move: turn 0°, stretch 1`, `move: turn 180°, stretch 1`, `move: turn 90°, stretch 1`, `move: turn 45°, stretch 1.414`, `move: turn -45°, stretch 1.414`, `move: turn 30°, stretch 2`, `move: turn 33.7°, stretch 3.606`, `move: turn 56.3°, stretch 3.606`, `move: turn -60°, stretch 1024`, `move: turn -135°, stretch 2`, `move: turn 60°, stretch 1`, `move: turn 0°, stretch 1×10⁻⁵` (1e-5), `move: turn 0°, stretch 1×10²⁰` (1e20), `no move: undefined` (NaN, undefined), and `1 − 1e-15 i` is `move: turn 0°, stretch 1` (no NaN, no `-0`); `moveGlyph(1)` throws `/needs a document/` |

### 7.3 A3, the unit cases

| Test | Cases (value) |
|---|---|
| K8 | the A3 input gives `{ z: {re:1, im:2}, mode: 'mul' }` and `got.z !== input.values.z`; `{kind:'problem'}` gives `null`; `null` and `undefined` give `null`; `{re: NaN}`, `{re: Infinity}`, `{re: '1'}` and a bare `5` give `{}`; the shapes real / int / bool / string / enum / function each keep their valid value (`a: 2.5, b: 3, c: true, d: 'hello', e: 'sub'`) and drop the wrong ones; a function that throws or returns `undefined` drops its key; `-0` becomes `0`; a JSON `__proto__` key is ignored and the result's prototype is `Object.prototype`; `values` an array or missing gives `{}`; a missing shape gives `{}`; `{ c: {re: -81, im: 0}, n: 4 }` with shape `{ c: 'complex', n: 'int' }` is returned whole |
| K9 | `roots`: `prev` powers, `next` curves, threads `[{T2: powers, powermap}, {T1: powers, sets}]`; `graph4d` next `rehearse`; `problems` prev `rehearse`, next `null`; `home` prev `null`; `powermap`: prev linear, next principal-root, threads T1 (linear, reciprocal), T2 (roots, principal-root), T3 (linear, reciprocal); `arithmetic`: threads `[]`; a reversed copy of the stations gives the same answer and is not mutated; `null`, `{}`, `{stations}`, an unknown station and a non-array `stations` give `{prev: null, next: null, threads: []}`; for all 22 stations prev and next are the order neighbours, every thread entry's stops are members of that thread, and every entry offers at least one stop that is neither prev nor next |
| K10 | `freshNote(1.4.2, preset for 1.4.2)` is `Fresh numbers from the Rehearsal Room. The handout's own answer: ` + the answer text; a preset for another problem, `problem: null`, a `kind: 'problem'` preset, `null` preset and `null` problem give `''` |

### 7.4 A4, the interaction script (Appendix G), step by step

The script appends a host to `#view` and removes it before the router steps. It uses only `page.evaluate`, `page.click`, `page.focus` and `page.keyboard`, and the ids of section 2.

| Step | Does | Expects |
|---|---|---|
| a | `chips(problemById('1.4.2'), { idPrefix: 't' })` | `#t-address` text `Polar, then Cartesian`, `data-value` `P->C`, a `BUTTON`, `aria-expanded` `false`, `aria-controls` `t-meaning`, no `data-tone`; `#t-names` text `names: all`, `data-value` `all`, `title` the meaning; `#t-meaning` hidden, `role` status. Click `#t-names`: not hidden, contains `Every name gives a different answer`, expanded `true` (and the address chip `false`). Click `#t-address`: meaning is `Work in polar, then write the answer as x + iy.`, one open at a time. Click again: hidden. Focus `#t-names`, Enter: open; Escape: hidden, focus still on `#t-names`. For all 29 problems with `meaning: false`: `SPAN` chips, texts equal `addressLabel` and `namesLabel`, no meaning span, no `aria-expanded`. Bad data: one child (the meaning span); no `idPrefix`: `TypeError`. |
| b | `picker({ idPrefix: 'p', onPick })` | the 14 ids; a fieldset; nothing pressed. Click `#p-address-p` and `#p-names-all`: `get()` is `{address:'P', names:'all'}` and `onPick` got `['address','P']`, `['names','all']`. `mark({address:true, names:false, expected:{address:'P', names:'any'}})`: `#p-names-row` `data-mark` `wrong` and `aria-invalid` `true`; `#p-address-row` `data-mark` `right`, no `aria-invalid`; `#p-status` is exactly `Address: right. Names: wrong. It is "any". Any name of the angle works: powers, products, directions, cos and sin.`; `#p-names-any` has `data-expected` `true`. Both right: `Address: right. Names: right.`; address wrong: `Address: wrong. It is "Polar, then Cartesian". Work in polar, then write the answer as x + iy.`; `mark({address:null, names:null})` clears. `disable(true)`: every option disabled, a programmatic click does not change `get()`; `disable(false)`. Click the pressed `#p-names-all`: `get().names` is `null` and `onPick` got `['names', null]`. Focus `#p-address-c`, ArrowRight: focus on `#p-address-p`; End: `#p-address-both`; Space: pressed. `set({names:'home', address:'nonsense'})`: `{address:'both', names:'home'}`. `reset()` clears; `destroy()` removes `#p`, twice is safe. |
| c | `moveGlyph({re:-1, im:√3}, { id: 'kit-glyph' })` in a 20 px paragraph | `svg.move-glyph`, `role` img, `aria-label` and `<title>` `move: turn 120°, stretch 2`; one `path.glyph-arc`, one `line.glyph-ray`, one `circle.glyph-unit`; `data-r` `2`, `data-theta` `2.094`, `data-clipped` `false`, `viewBox` `0 0 24 24`, `width` `1.1em`; arc `d` = `M 18 12 A 6 6 0 0 0 9 6.804`, ray (6, 1.608); drawn size 22 ± 0.6 px. `updateGlyph(svg, 0)`: `no move: 0`, no arc, ray (12, 12), `data-r` `0`. `-2i`: `move: turn -90°, stretch 2`, arc `M 18 12 A 6 6 0 0 1 12 18`, ray y 24. `512 − 886.81i`: `data-clipped` `true`, `move: turn -60°, stretch 1024`. A repeated update returns the same element, keeps the same arc node, never stacks arcs. The ray's computed `stroke` equals the computed `--polar`. `updateGlyph(document.body, 1)`: `TypeError`. |
| d | `header`, `problemCard`, `links` for `stationById('roots')` and a real `createStore('kit-test:', { storage: null })` | header: one `h1` `Roots: Divide the Staircase`, `p.station-lede` `x`; chips `#roots-problem-chip-1-4-1`, `-1-4-2` (`aria-current` `true`), `-1-4-3` with hrefs `#problem-1-4-1...`, texts the ids, tooltips without an exponent bracket; badges `T2 · The staircase`, `T1 · One point, two addresses` as `ul > li > span.thread-badge`; group label `Problems on this page`. Card: `ASIDE.callout.problem-card`, `data-problem` `1.4.2`, `data-tone` `accent`, title `Problem 1.4.2`, statement contains `roots of` and a `.katex`, two `.decision-chip`, toggle text `Show the answer`, `#t-problem-answer-text` equals `answer.text`, `DETAILS` closed, note empty, slot empty, `Why this address. Find the roots in polar`, `The aha. `, hint text, scroller `tabindex` `0` and `role` group. Click the toggle: open, KaTeX present. Click `#t-problem-names`: meaning is the Names sentence. `setProblem(null)`: text starts `Your own numbers.`, `data-empty` `true`, title hidden, answer hidden, no chips. `setProblem(P3, { note: freshNote(...) })`: `data-problem` `P3`, tone `cart`, title `Problem P3`, the note starts `Fresh numbers from the Rehearsal Room. `, chips `C` and `none`. `setNote`, `setAnswerOpen(true/false)`, back to 1.4.2 (note `''`). Options: `answer: 'open'` is a `DIV` without a toggle, `routes: true` puts both route sections inside it, `tone: 'polar'`, custom title; `answer: 'none', why: false` leave no answer or why; `aliases: { answer, card }` keep the old ids on the scroller and a wrapper that contains the card, the hint is the scroller's next sibling, `#o3-answer-tex` contains the scroller. `destroy()` removes all. Links: label `Where next`, anchors in the order `roots-link-powers` (prev), `roots-link-curves` (next), `roots-link-powermap` (next, T2), `roots-link-sets` (next, T1), each with exactly one child, a `SPAN` and no stray text node; texts `Powers: Spin n Times`, `Curves and Time`, `T2 next: zn: Fans and Parabolas`, `T1 next: Disks, Annuli, Boundaries`. With extras and a lab request: the extra `Related: The Staircase` is added, the duplicates are dropped, the button `Open in the Lab` stores the request and calls `navigate('lab')`. A station with nothing around it gives a `hidden` empty nav; a lab request without a store and `header({})` throw `TypeError`. `titleSpan('z^n: Fans and Parabolas')` is one span with one `sup.prose-sup` `n`. |
| f | for all 29 problems, `problemCard(...).els.statement.innerHTML` against `appendStatement` of `js/stations/problems.js` | identical markup (the two renderings of the statement cannot drift) |
| h | both themes (`data-theme` light and dark) on one chip of each Names value, an address chip and the glyph | `all`: background = `--polar`, text = `--on-accent`; `any`: border = `--polar`, background = `--surface`, solid; `none`: text = `--text-muted`; `continuous`: dashed; `home`: background differs from `--surface`; an address chip with one tone: border = `--cart`; the ray: stroke = `--polar` |
| g | a marked picker is added; geometry | nothing on the page is wider than the viewport (no horizontal overflow, no element but a formula box right of the viewport), every picker option at least 44 px tall; `ctx.shot('kit')`; then the viewport is set to 320 px and the kit's host is checked again (no element past the viewport, host not wider than its box); the viewport is restored |
| e | the router | `window.__mv.app.request` and `.preset` exist. Request `{ station:'roots', problem:'1.4.2', family:'1.4.2', values:{ c:{re:-81, im:0}, n:4 } }`, go to `#roots`, wait 600 ms: `preset()` deep-equals `{ kind:'values', station:'roots', problem:'1.4.2', family:'1.4.2', values:{ c:{re:-81, im:0}, n:4 } }`, is frozen, and roots mounted (`data-state` ready, no error panel). `#home`: `null`. `#roots` again: `null` (consumed once). A request for `sets` is not given to `roots` and is given to `sets` once. A request wins over `#problem-1-4-1`; without a request that route gives `{kind:'problem', id:'1.4.1'}`; `#topic-T1-4` gives the topic preset. Seven malformed requests (`nosuchplace` station, `values: 5`, no `values`, a string, a number, `null`, an array) are dropped: `preset()` is `null`, no error panel. `{ problem: 'ZZ.9', family: 7, values: { c: 'banana', n: 1e9 } }` becomes problem `null`, family `null`, values untouched, and roots still mounts. `#nosuchplace`: `null`. |

The harness fails the run on any console error, page error, failed request or horizontal overflow at load, so "no console errors" is checked by the runner.

**Visual review the reviewer does with `KIT_SHOTS=<dir> node tools/smoke.mjs --route nosuchplace --script ... --dark --no-shots`** (writes `nosuchplace-<view>-host.png` and `-chips-open.png`): the five Names chips read as five different shapes (filled, outlined, tinted with a solid middle step, dashed with a seam, grey with a dash) in light and dark; the Address chip dots are in order; the open meaning sits under the chip; the picker's right row is green and solid, the wrong row red and dashed with the right chip ringed; the card's answer summary shows its triangle; at 390 px nothing is cut off and the links stack.

### 7.5 A5 and A7 greps and checks

```
npm test 2>&1 | grep -E '^not ok|^# (tests|pass|fail)'                       # five not ok lines, nothing else
grep -nE "^import" js/core/moveglyph.js                                        # no output
grep -nE "^import" js/core/decisions.js js/core/station-kit.js                 # decisions: ../data/problems.js; station-kit: ./katex.js ./decisions.js ../data/problems.js ../registry.js
grep -nE "store\.(get|remove)\(REQUEST_KEY" js/app.js                          # both inside takeStationRequest
grep -nE "(window|document)\.addEventListener|setTimeout|setInterval|requestAnimationFrame" js/core/decisions.js js/core/moveglyph.js js/core/station-kit.js   # no output
```

K11 reads the three files and checks: the CSS is one template literal named `STYLE` with no `${` and no `#hex`, `rgb(`, `hsl(`, `oklch(` or colour word in a colour property; the whole file has no `#hex` even in a comment; `moveglyph.js` has no `import` and no `import(`; the imports of the other two are subsets of the allowed ones; each file injects its own `data-for`; and no top-level statement does anything but declare (a top-level `const` whose value is not a function must not mention `document`, `window`, `localStorage`, `sessionStorage`, `navigator`, `matchMedia` or `globalThis`); no window or document listener. K12 reads `app.js`: the key string appears once, `takeStationRequest` contains `store.get(` and `store.remove(` and no `await`, a request wins over a hash preset, `request` and `preset` are on `window.__mv.app`, and the export list is unchanged.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

- **Data.** A problem without a valid `names` or `address` shows only the chip it has; `chips(null, ...)` is not an error. A problem object from a test (`{ id, address, names }`) works. A station that is not in `ctx.stations`, or a `ctx.stations` array with extra test stations at `order: 90` (the i1-shell script pushes some), is handled; `neighbours` never mutates the registry.
- **Numbers.** `-0` in a glyph (`{ re: -1, im: -0 }`) is Arg π (`im === 0` is true for `-0`); `{ re: -0, im: 0 }` is `no move: 0`. A tiny nonzero number such as 1e-5 keeps its angle and reads `1×10⁻⁵`, never `0` (rule 10.7.5). An angle of 119.99999999999999° prints `120`. A stretch of `2.0000000000000004` is not clipped.
- **Ids.** Two cards or two chip sets on one page need different prefixes; the kit does not add suffixes. The index uses `problems-card-<idKey>`; a station card uses `<station>-problem`; the header chips `<station>-problem-chip-<idKey>` never collide with a card's `-address`, `-names`, `-meaning`, `-title`, `-statement`, `-note`, `-decisions`, `-why`, `-answer*`, `-aha`, `-route-*`, `-slot`.
- **Card.** `setProblem` keeps the answer `<details>` as the student left it (open stays open); call `setAnswerOpen(false)` to close it. A very wide answer (1.5.2 is about 950 px) scrolls inside its box and shows the hint; the plain `answer.text` wraps below. `routes: true` with `answer: 'none'` puts the two route sections directly in the card. A TeX failure shows the plain TeX text (`tex()`'s own fallback) and the card still works.
- **Router.** A request made while another station is loading waits for its station; a navigation that supersedes a load never consumes it; a station whose `mount` throws after taking its request loses it (accepted: the student sees the under-construction panel and goes back). `window.__mv.app.request` is a test hook; the Rehearsal Room calls `ctx.store.set('station.request', req, { persist: false })` itself. A hash preset and a request: the request wins for that one mount. JSON turns a `NaN` into `null` on the way through the store, which `valuesOf` rejects. The preset and its `values` are deep-frozen.
- **Keys.** Escape with the meaning closed does nothing. Arrow keys in a picker row never change a selection. A disabled picker takes no clicks even from a script that calls `.click()`.
- **No document.** Importing any kit module in Node works; calling a DOM function throws `TypeError('<name> needs a document')`; calling a pure function never throws.

### 8.2 Performance plan

Measured in headless Chromium (section 0.3): the work is negligible, and the rules below keep it so.

- Style tags are injected once, guarded by a `querySelector`; no work per call after the first.
- `chips` and `picker` use one delegated listener on their host, not one per chip; the 29-problem index pays 3.5 ms cold (1.3 ms warm) for 58 chips.
- `updateGlyph` is called on every drag frame by a station: it returns at once when the value did not change (`WeakMap` key), writes an attribute only when it differs, reuses the same nodes and never allocates a path string for a number it already drew (0.01 ms measured).
- `problemCard` does one KaTeX render for the statement and one for the answer (KaTeX caches strings: 0.43 ms for a warm card, 65 ms for all 29 cold); no layout read at build time except the first hint refresh on a detached node (it returns 0 and costs nothing); afterwards the hint follows a `ResizeObserver`, not a window listener.
- No timers, no `requestAnimationFrame`, no `setTimeout` anywhere in the three modules; no polling.
- The router's addition is one `store.get` per mount.

### 8.3 Accessibility

- Everything is a native control: `button`, `a`, `details/summary`, `fieldset/legend`, `nav`, `aside`, `header`. Every control has an id and a name (visible text, or `aria-label` for the problem chips: `Problem 1.4.2`, which contains the visible `1.4.2`). Marks are `aria-hidden`; nothing is colour alone (3.1).
- Chips announce expanded or collapsed and the meaning is a status region filled before it is shown. Picker options use `aria-pressed`; rows are labelled groups; a wrong row is `aria-invalid`; the verdict is a status line. The glyph is an image whose name is the move; hosts print the number in text as well.
- Focus ring: the global 3 px `--focus` outline, never removed. Tap targets: button chips are at least 44 px tall (measured 44 at 390 px); the header's problem chips keep the iteration-1 size (32 px, a link in a row).
- Contrast: every pair is in 3.4 (text at least 5.0, non-text at least 4.1).
- The answer box is a focusable `group` named "Answer, scrolls sideways if it is wide"; the arrow keys scroll it.

### 8.4 Reduced motion

Nothing in the kit moves: no transition, no animation, no scrolling effect. The marker triangle of the answer summary turns by `transform: rotate(90deg)` without a transition. `theme.css` already shortens any animation under `prefers-reduced-motion: reduce`. The glyph is static; stations that animate a number simply call `updateGlyph` per frame and, under reduced motion, call it once at the end state.

### 8.5 Phone layout (390 px)

Measured at 390 px with the three pieces and a marked picker on the page: no horizontal overflow (`scrollWidth − clientWidth` is 0), no element but a formula box extends past the viewport, every picker option is 44 px tall.
Rules that make it so: every flex or grid child has `min-width: 0` (`.problem-card > *`, `.dp-row`, `.dp-opts`); `.decisions`, `.dp-opts`, `.pk-decisions` wrap; the meaning is `flex: 1 1 100%`; `.pk-routes` is `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))`, so two columns above about 34 rem and one below; the card's statement has `overflow-wrap: anywhere`; the longest option, `Cartesian, polar, then back`, is 254 px wide when pressed (bold) and sits on a row of its own, inside a 288 px column at 320 px (step g of the script sets the viewport to 320 px and checks that nothing in the kit's host is wider than the viewport).
The menu note of part V is now the longer `Lab, 4D, rehearsal, problems`; `.nav-part-title` is a flex row whose children can wrap, so it wraps to two lines in the 17.5 rem sidebar and the drawer; the reviewer looks at the menu once (screenshot at 1280 and 390) and, if it looks wrong, records a request for `css/components.css` (owner: `i2-walk-shell`).

---

## 9. Out of scope, and requests for other owners

**Out of scope (the goal's list).** Adopting the kit in any station (`i2-decisions-everywhere-a/-b/-c`, `i2-pictures`, `i2-rehearse`, `i2-lab-diary`, `i2-home-index-deck` do that in wave 1); the Walk bar in `app.js` (`i2-walk-shell` edits `app.js` again); updating `docs/ARCHITECTURE.md` (the planner and the integrator own it; the drift is listed in 0.2). Also not here: the Names filter and the one-line deck of the index, the Rehearsal Room itself and its use of `picker`, the explainer's glyph row, and the stations' own `values` shapes (4.1 of ARCHITECTURE; each adopting station validates with `valuesOf`).

**Requests for other owners.**

1. `docs/ARCHITECTURE.md` (planner, integrator): record D1, D2, D3, D5, D9 (the `<id>-aha` id and the fixed summary label), D10, D11 and D14 in sections 9 and 11; promote 11.1 to 11.3 into section 3 (then the guard of 4.6 is replaced by the section-3 tests, which already read `### 3.x`); section 3.14 should say `PART_TITLES` is the registry's `PARTS`.
2. `css/components.css` (`i2-walk-shell`): only if the longer part V note looks wrong in the menu (8.5).
3. `tests/interact/i1-shell.mjs` (`i2-walk-shell`): `STATIONS.length === 21` becomes `22` (already known to the plan).
4. `js/stations/problems.js` (`i2-home-index-deck`): keeps its own `statementNodes` and `appendStatement`; step f of the script holds the kit's copy equal to it. If that goal changes the statement markup, it updates step f in the same change.
5. `i2-decisions-everywhere-*`: use `problemCard` with `aliases: { answer: '<station>-problem-answer-box' }` where an iteration-1 script reads that id (curves, linear), keep their own wrapper around the card where the station swaps problems under a drag (roots), and set the note with `card.setNote(freshNote(problem, ctx.preset))`. A `<summary>` label is fixed (D9): scripts must not wait for it to change.

---

## Appendices: the reference implementation
The files below were written in the scratch copy and run as described in 0.3 and 7. **New files are given whole; edited files as unified diffs against the repository as it is today** (apply with `patch -p1` or by hand).
The new files are reproduced exactly; a one-line header comment may name this design. If a sentence in sections 1 to 9 and a file here disagree, the sentence wins.

### Appendix A. `js/core/decisions.js` (new)

```js
// js/core/decisions.js: the two decisions that settle every review problem, as chips.
//   Address: which address makes the question native (Cartesian slide, polar move, or a conversion)?
//   Names:   if an angle is involved, which names of it do you need (none, any, all, home, continuous)?
// chips(problem) shows both as read-only chips with a one-line meaning on tap; picker() lets the student set both
// (the Rehearsal Room) and marks them right or wrong. The pure helpers (labels, meanings, slug, grade) import in Node.
//
// Imports: ../data/problems.js only. Colours are tokens only. No DOM access at import time.
// Design: docs/designs/iter-2/i2-decisions-kit.md sections 4.1 and 5.1.

import { ADDRESS_CODES, addressLabel, addressTones } from '../data/problems.js';

export const NAMES_CODES = Object.freeze(['none', 'any', 'all', 'home', 'continuous']);

export const NAMES_MEANING = Object.freeze({
  none: 'No angle in the question.',
  any: 'Any name of the angle works: powers, products, directions, cos and sin.',
  all: 'Every name gives a different answer: roots take all n steps.',
  home: 'The home step only: Arg z in (−π, π], and principal values.',
  continuous: 'A choice of name that never jumps: a branch, with a seam where it must.',
});

export const ADDRESS_MEANING = Object.freeze({
  'C': 'A slide question: add or compare the x and y parts.',
  'P': 'A move question: turn by the angle, stretch by the length.',
  'C->P': 'Read the polar address of the given point, then work there.',
  'P->C': 'Work in polar, then write the answer as x + iy.',
  'C->P->C': 'Convert to polar, do the move, convert back.',
  'both': 'Both addresses say something; write the formula in each.',
});

const hasKey = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
const isAddress = (code) => typeof code === 'string' && ADDRESS_CODES.includes(code);
const isNames = (code) => typeof code === 'string' && NAMES_CODES.includes(code);

export function namesLabel(code) {
  return isNames(code) ? `names: ${code}` : '';
}

export function namesMeaning(code) {
  return hasKey(NAMES_MEANING, code) ? NAMES_MEANING[code] : '';
}

export function addressMeaning(code) {
  return hasKey(ADDRESS_MEANING, code) ? ADDRESS_MEANING[code] : '';
}

export function slug(code) {
  return String(code === null || code === undefined ? '' : code).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function grade(picked, expected) {
  const p = picked && typeof picked === 'object' ? picked : {};
  const e = expected && typeof expected === 'object' ? expected : {};
  const one = (key) => (p[key] === null || p[key] === undefined ? null : p[key] === e[key]);
  const address = one('address');
  const names = one('names');
  return { address, names, all: address === true && names === true };
}

// ---------------------------------------------------------------- DOM (browser only)

const STYLE = `
.decisions { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); max-width: 100%; vertical-align: top; }
.decision-chip { max-width: 100%; text-align: left; font-size: 0.9rem; }
.decision-chip .addr-dots { display: inline-flex; gap: 3px; flex: none; }
.decision-chip .addr-dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--text-muted); }
.decision-chip .addr-dot[data-tone="cart"] { background: var(--cart); }
.decision-chip .addr-dot[data-tone="polar"] { background: var(--polar); }
.decision-chip .names-mark { width: 1rem; height: 1rem; flex: none; overflow: visible; }
.decision-chip .names-mark .ns { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }
.decision-chip .names-mark .ns-solid { fill: currentColor; }
.decision-chip .names-mark .ns-seam { stroke: currentColor; stroke-width: 1.4; stroke-dasharray: 2 2; fill: none; }
.decision-chip .names-mark .ns-dash { stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; fill: none; }
.decisions .decision-chip[data-decision="names"][data-value="none"] { --tone: var(--border-strong); color: var(--text-muted); }
.decisions .decision-chip[data-decision="names"][data-value="any"] { --tone: var(--polar); }
.decisions .decision-chip[data-decision="names"][data-value="all"] { --tone: var(--polar); background: var(--polar); color: var(--on-accent); font-weight: 700; }
.decisions .decision-chip[data-decision="names"][data-value="home"] { --tone: var(--polar); background: var(--surface-2); }
.decisions .decision-chip[data-decision="names"][data-value="continuous"] { --tone: var(--polar); border-style: dashed; }
@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  .decisions .decision-chip[data-decision="names"][data-value="home"] { background: color-mix(in srgb, var(--polar) 16%, var(--surface)); }
}
.decisions .decision-chip[data-decision="names"][data-value="all"]:hover { background: var(--polar); filter: brightness(1.1); }
.decisions .decision-chip[aria-expanded="true"] { box-shadow: 0 0 0 2px var(--tone, var(--accent)); }
span.decision-chip { cursor: default; }
.decision-meaning { flex: 1 1 100%; box-sizing: border-box; padding: var(--space-1) var(--space-2); border-left: 3px solid var(--polar); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; background: var(--surface-2); color: var(--text); font-size: 0.92rem; line-height: 1.4; }
.decision-meaning[hidden] { display: none; }
.decisions-picker { display: grid; gap: var(--space-3); min-width: 0; margin: 0; padding: 0; border: 0; }
.decisions-picker .dp-legend { padding: 0; margin-bottom: var(--space-2); font-weight: 700; }
.dp-row { display: grid; gap: var(--space-1); min-width: 0; padding-left: var(--space-2); border-left: 4px solid var(--border); }
.dp-row[data-mark="right"] { border-left-color: var(--ok); }
.dp-row[data-mark="wrong"] { border-left-color: var(--danger); border-left-style: dashed; }
.dp-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-2); }
.dp-label { font-weight: 700; }
.dp-hint { color: var(--text-muted); font-size: 0.88rem; }
.dp-row[data-mark="right"] .dp-label::after { content: " \\2713 right"; color: var(--ok); font-weight: 600; }
.dp-row[data-mark="wrong"] .dp-label::after { content: " \\2717 wrong"; color: var(--danger); font-weight: 600; }
.dp-opts { display: flex; flex-wrap: wrap; gap: var(--space-2); min-width: 0; }
.dp-opt { max-width: 100%; text-align: left; }
.dp-opt[data-expected="true"] { box-shadow: 0 0 0 2px var(--ok); }
.dp-row[data-mark="wrong"] .dp-opt[aria-pressed="true"] { border-color: var(--danger); border-style: dashed; }
.dp-opt[disabled] { cursor: default; opacity: 0.75; }
.dp-status { margin: 0; min-height: 1.4em; color: var(--text); font-size: 0.95rem; line-height: 1.4; }
`;

function needDocument(who) {
  if (typeof document === 'undefined') throw new TypeError(`${who} needs a document`);
}

function ensureStyle() {
  const head = document.head;
  if (!head || head.querySelector('style[data-for="decisions"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'decisions');
  s.textContent = STYLE;
  head.appendChild(s);
}

function checkPrefix(who, idPrefix) {
  if (typeof idPrefix !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(idPrefix)) {
    throw new TypeError(`${who}: idPrefix is required (letters, digits, - and _, starting with a letter)`);
  }
}

function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) node.append(kid);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

// A three-step staircase (the names of an angle). none: a dash (no steps). any: three outlined steps (any one will do).
// all: three solid steps. home: the middle step solid (the home window). continuous: outlined steps cut by a dashed seam.
function namesMark(code) {
  const svg = svgNode('svg', { class: 'names-mark', viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' });
  if (code === 'none') {
    svg.append(svgNode('line', { class: 'ns-dash', x1: 3, y1: 8, x2: 13, y2: 8 }));
    return svg;
  }
  const steps = [[1, 10, 4, 5], [6, 6, 4, 9], [11, 2, 4, 13]];
  steps.forEach(([x, y, w, hh], i) => {
    const solid = code === 'all' || (code === 'home' && i === 1);
    svg.append(svgNode('rect', { class: solid ? 'ns ns-solid' : 'ns', x, y, width: w, height: hh, rx: 0.6 }));
  });
  if (code === 'continuous') svg.append(svgNode('line', { class: 'ns-seam', x1: 8, y1: 0, x2: 8, y2: 16 }));
  return svg;
}

function addressDots(code) {
  const dots = h('span', { class: 'addr-dots', 'aria-hidden': 'true' });
  for (const token of addressTones(code)) dots.append(h('span', { class: 'addr-dot', 'data-tone': token.replace(/^--/, '') }));
  return dots;
}

function singleTone(code) {
  const tones = [...new Set(addressTones(code).map((t) => t.replace(/^--/, '')))];
  return tones.length === 1 ? tones[0] : null;
}

function addressContent(code) {
  return [addressDots(code), document.createTextNode(addressLabel(code))];
}

function namesContent(code) {
  return [namesMark(code), document.createTextNode(namesLabel(code))];
}

export function chips(problem, { idPrefix, meaning = true } = {}) {
  checkPrefix('chips', idPrefix);
  needDocument('chips');
  ensureStyle();
  const p = problem && typeof problem === 'object' ? problem : {};
  const host = h('span', { class: 'decisions', 'data-problem': typeof p.id === 'string' ? p.id : null });
  const tag = meaning ? 'button' : 'span';
  const make = (decision, code, tip, content, tone) => {
    const chip = h(tag, {
      class: 'chip decision-chip', id: `${idPrefix}-${decision}`, 'data-decision': decision, 'data-value': code, title: tip, 'data-tone': tone,
      type: meaning ? 'button' : null, 'aria-expanded': meaning ? 'false' : null, 'aria-controls': meaning ? `${idPrefix}-meaning` : null,
    });
    chip.append(...content);
    return chip;
  };
  if (isAddress(p.address)) host.append(make('address', p.address, addressMeaning(p.address), addressContent(p.address), singleTone(p.address)));
  if (isNames(p.names)) host.append(make('names', p.names, namesMeaning(p.names), namesContent(p.names), null));
  if (!meaning) return host;

  const note = h('span', { class: 'decision-meaning', id: `${idPrefix}-meaning`, role: 'status', hidden: true });
  host.append(note);
  const buttons = () => [...host.querySelectorAll('button.decision-chip')];
  const close = () => {
    for (const b of buttons()) b.setAttribute('aria-expanded', 'false');
    note.hidden = true;
    note.textContent = '';
    note.removeAttribute('data-for');
  };
  host.addEventListener('click', (e) => {
    const chip = e.target instanceof Element ? e.target.closest('button.decision-chip') : null;
    if (!chip || !host.contains(chip)) return;
    const wasOpen = chip.getAttribute('aria-expanded') === 'true';
    close();
    if (wasOpen) return;
    const which = chip.dataset.decision;
    note.textContent = which === 'address' ? addressMeaning(chip.dataset.value) : namesMeaning(chip.dataset.value);
    note.dataset.for = which;
    chip.setAttribute('aria-expanded', 'true');
    note.hidden = false;
  });
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !note.hidden) close();
  });
  return host;
}

// What the picker says under the rows once marked: "Address: right. Names: wrong. It is all. Every name gives ...".
function statusText(marks, expected) {
  const parts = [];
  for (const decision of ['address', 'names']) {
    const m = marks[decision];
    if (m === null || m === undefined) continue;
    const name = decision === 'address' ? 'Address' : 'Names';
    if (m === true) { parts.push(`${name}: right.`); continue; }
    const want = expected && typeof expected === 'object' ? expected[decision] : undefined;
    const label = decision === 'address' ? addressLabel(want) : (isNames(want) ? want : '');
    const mean = decision === 'address' ? addressMeaning(want) : namesMeaning(want);
    parts.push(label ? `${name}: wrong. It is "${label}". ${mean}` : `${name}: wrong.`);
  }
  return parts.join(' ');
}

export function picker({ idPrefix, onPick = null, address = null, names = null } = {}) {
  checkPrefix('picker', idPrefix);
  needDocument('picker');
  ensureStyle();
  const state = { address: isAddress(address) ? address : null, names: isNames(names) ? names : null };
  let destroyed = false;
  let disabled = false;

  const rows = {};
  const opts = { address: [], names: [] };
  const buildRow = (decision, label, hint, codes) => {
    const labelId = `${idPrefix}-${decision}-label`;
    const box = h('div', { class: 'dp-opts' });
    for (const code of codes) {
      const names = decision === 'names';
      const btn = h('button', {
        type: 'button', class: 'chip decision-chip dp-opt', id: `${idPrefix}-${decision}-${slug(code)}`, 'data-decision': decision, 'data-value': code,
        'aria-pressed': 'false', title: names ? namesMeaning(code) : addressMeaning(code), 'data-tone': names ? null : singleTone(code),
      });
      btn.append(...(names ? [namesMark(code), document.createTextNode(code)] : [addressDots(code), document.createTextNode(addressLabel(code))]));
      opts[decision].push(btn);
      box.append(btn);
    }
    const row = h('div', { class: 'dp-row', id: `${idPrefix}-${decision}-row`, role: 'group', 'aria-labelledby': labelId, 'data-decision': decision },
      h('div', { class: 'dp-head' }, h('span', { class: 'dp-label', id: labelId }, label), h('span', { class: 'dp-hint' }, hint)), box);
    rows[decision] = row;
    return row;
  };
  const status = h('p', { class: 'dp-status', id: `${idPrefix}-status`, role: 'status' });
  const el = h('fieldset', { class: 'decisions-picker', id: idPrefix },
    h('legend', { class: 'dp-legend' }, 'The two decisions'),
    buildRow('address', 'Address', 'Which address makes this easy?', ADDRESS_CODES),
    buildRow('names', 'Names', 'Which names of the angle does it need?', NAMES_CODES),
    status);

  const paint = () => {
    for (const decision of ['address', 'names']) for (const btn of opts[decision]) btn.setAttribute('aria-pressed', String(state[decision] === btn.dataset.value));
  };
  const clearMark = (decision) => {
    rows[decision].removeAttribute('data-mark');
    rows[decision].removeAttribute('aria-invalid');
    for (const btn of opts[decision]) btn.removeAttribute('data-expected');
    status.textContent = '';
  };
  paint();

  el.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('.dp-opt') : null;
    if (!btn || destroyed || disabled || !el.contains(btn)) return;
    const decision = btn.dataset.decision;
    state[decision] = state[decision] === btn.dataset.value ? null : btn.dataset.value;
    paint();
    clearMark(decision);
    if (typeof onPick === 'function') {
      try { onPick(decision, state[decision]); } catch (err) { console.error('[decisions] onPick threw', err); }
    }
  });
  el.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const btn = e.target instanceof Element ? e.target.closest('.dp-opt') : null;
    if (!btn) return;
    const list = opts[btn.dataset.decision];
    const i = list.indexOf(btn);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    e.preventDefault();
    list[j].focus();
  });

  return {
    el,
    get: () => ({ address: state.address, names: state.names }),
    set(next) {
      if (destroyed || !next || typeof next !== 'object') return;
      if ('address' in next && (next.address === null || isAddress(next.address))) state.address = next.address;
      if ('names' in next && (next.names === null || isNames(next.names))) state.names = next.names;
      paint();
    },
    mark(result) {
      if (destroyed) return;
      const r = result && typeof result === 'object' ? result : {};
      for (const decision of ['address', 'names']) {
        const m = r[decision];
        clearMark(decision);
        if (m === true || m === false) {
          rows[decision].setAttribute('data-mark', m ? 'right' : 'wrong');
          if (!m) rows[decision].setAttribute('aria-invalid', 'true');
          const want = r.expected && typeof r.expected === 'object' ? r.expected[decision] : undefined;
          if (!m) for (const btn of opts[decision]) if (btn.dataset.value === want) btn.setAttribute('data-expected', 'true');
        }
      }
      status.textContent = statusText({ address: r.address, names: r.names }, r.expected);
    },
    reset() {
      if (destroyed) return;
      state.address = null;
      state.names = null;
      paint();
      clearMark('address');
      clearMark('names');
    },
    disable(on) {
      if (destroyed) return;
      disabled = !!on;
      el.disabled = disabled;
      for (const decision of ['address', 'names']) for (const btn of opts[decision]) btn.disabled = disabled;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      el.remove();
    },
  };
}
```

### Appendix B. `js/core/moveglyph.js` (new)

```js
// js/core/moveglyph.js: the move glyph, a 1.1em inline SVG that sits beside a complex number.
// A number is a move (turn, then stretch); the glyph draws that move: a faint unit circle, the arc of Arg z (the turn),
// and a ray whose length is the stretch. Colours are tokens only (the host gives it color: var(--polar), and the style
// below does the same by default). Imports nothing; no DOM access at import time (glyphGeometry and glyphText are pure).
//
// Design: docs/designs/iter-2/i2-decisions-kit.md sections 4.2 and 5.2.

const SVG_NS = 'http://www.w3.org/2000/svg';
const BOX = 24;
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

// ---------------------------------------------------------------- pure helpers

function asComplex(z) {
  if (typeof z === 'number') return { re: z, im: 0 };
  if (z && typeof z === 'object') return { re: Number(z.re), im: Number(z.im) };
  return { re: NaN, im: NaN };
}

function strip(s) {
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

// fmtNum(x, 3, { tiny: true }) of complex.js, kept here because this module imports nothing.
function fmt3(x) {
  if (x !== x) return 'undefined';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  const a = Math.abs(x);
  if (a >= 1e15 || (a > 1e-9 && a < 1e-3)) {
    const [m, e] = x.toExponential(3).split('e');
    return strip(m) + '×10' + [...String(Number(e))].map((ch) => SUP[ch]).join('');
  }
  return strip(x.toFixed(3));
}

const n3 = (v) => String(Math.round(v * 1000) / 1000 + 0);

export function glyphGeometry(z, { scale = 2, box = 24 } = {}) {
  const { re, im } = asComplex(z);
  const sc = Number.isFinite(scale) && scale > 0 ? scale : 2;      // a bad option falls back to the default
  const bx = Number.isFinite(box) && box > 0 ? box : 24;
  const half = bx / 2;
  const unitR = half / sc;
  const centre = { x: half, y: half };
  if (!Number.isFinite(re) || !Number.isFinite(im)) return { r: NaN, theta: 0, unitR, rayEnd: centre, arc: null, clipped: false };
  const r = Math.hypot(re, im);
  if (r === 0) return { r: 0, theta: 0, unitR, rayEnd: centre, arc: null, clipped: false };
  let theta = Math.atan2(im, re);
  if ((im === 0 && re < 0) || theta <= -Math.PI) theta = Math.PI;
  theta += 0;
  const ux = re / r;
  const uy = im / r;
  const len = unitR * Math.min(r, sc);
  const rayEnd = { x: half + len * ux, y: half - len * uy };
  const arc = Math.abs(theta) < 1e-9 ? null : {
    start: { x: half + unitR, y: half },
    end: { x: half + unitR * ux, y: half - unitR * uy },
    large: false,
    sweep: theta > 0 ? 0 : 1,
  };
  return { r, theta, unitR, rayEnd, arc, clipped: r > sc * (1 + 1e-9) };   // a length of 2 that arrives as 2.0000000000000004 is not clipped
}

export function glyphText(z) {
  const g = glyphGeometry(z);
  if (g.r !== g.r) return 'no move: undefined';
  if (g.r === 0) return 'no move: 0';
  const d = Math.round((g.theta * 180 / Math.PI) * 10) / 10;
  const deg = d === 0 ? '0' : Number.isInteger(d) ? String(d) : d.toFixed(1);
  return `move: turn ${deg}°, stretch ${fmt3(g.r)}`;
}

// ---------------------------------------------------------------- DOM (browser only)

const STYLE = `
.move-glyph { display: inline-block; flex: none; vertical-align: -0.2em; overflow: visible; color: var(--polar); }
.move-glyph .glyph-unit { fill: none; stroke: currentColor; stroke-width: 1; opacity: 0.3; }
.move-glyph .glyph-arc { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.move-glyph .glyph-ray { stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.move-glyph[data-clipped="true"] .glyph-ray { stroke-dasharray: 3 1.6; }
`;

function needDocument(who) {
  if (typeof document === 'undefined') throw new TypeError(`${who} needs a document`);
}

function ensureStyle() {
  const head = document.head;
  if (!head || head.querySelector('style[data-for="moveglyph"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'moveglyph');
  s.textContent = STYLE;
  head.appendChild(s);
}

const svgEl = (tag) => document.createElementNS(SVG_NS, tag);
const last = new WeakMap(); // svg -> the key of what it shows now, so a repeated update costs nothing

function put(node, name, value) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function draw(svg, z, scale) {
  const c = asComplex(z);
  const key = `${c.re}|${c.im}|${scale}`;
  if (last.get(svg) === key) return svg;
  last.set(svg, key);
  const g = glyphGeometry(z, { scale });
  const text = glyphText(z);
  put(svg, 'aria-label', text);
  put(svg, 'data-r', fmt3(g.r));
  put(svg, 'data-theta', fmt3(g.theta));
  put(svg, 'data-scale', String(scale));
  put(svg, 'data-clipped', String(g.clipped));
  const title = svg.querySelector('title');
  if (title && title.textContent !== text) title.textContent = text;
  put(svg.querySelector('.glyph-unit'), 'r', n3(g.unitR));
  const ray = svg.querySelector('.glyph-ray');
  put(ray, 'x2', n3(g.rayEnd.x));
  put(ray, 'y2', n3(g.rayEnd.y));
  let arc = svg.querySelector('.glyph-arc');
  if (g.arc) {
    if (!arc) {
      arc = svgEl('path');
      arc.setAttribute('class', 'glyph-arc');
      svg.insertBefore(arc, ray);
    }
    const a = g.arc;
    put(arc, 'd', `M ${n3(a.start.x)} ${n3(a.start.y)} A ${n3(g.unitR)} ${n3(g.unitR)} 0 ${a.large ? 1 : 0} ${a.sweep} ${n3(a.end.x)} ${n3(a.end.y)}`);
  } else if (arc) {
    arc.remove();
  }
  return svg;
}

export function moveGlyph(z, { scale = 2, size = '1.1em', id = null } = {}) {
  needDocument('moveGlyph');
  ensureStyle();
  const svg = svgEl('svg');
  svg.setAttribute('class', 'move-glyph');
  svg.setAttribute('role', 'img');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${BOX} ${BOX}`);
  svg.setAttribute('focusable', 'false');
  if (id) svg.setAttribute('id', id);
  const unit = svgEl('circle');
  unit.setAttribute('class', 'glyph-unit');
  unit.setAttribute('cx', String(BOX / 2));
  unit.setAttribute('cy', String(BOX / 2));
  const ray = svgEl('line');
  ray.setAttribute('class', 'glyph-ray');
  ray.setAttribute('x1', String(BOX / 2));
  ray.setAttribute('y1', String(BOX / 2));
  svg.append(svgEl('title'), unit, ray);
  return draw(svg, z, scale);
}

export function updateGlyph(svg, z, { scale } = {}) {
  if (!svg || !svg.classList || !svg.classList.contains('move-glyph')) throw new TypeError('updateGlyph needs the element moveGlyph returned');
  const s = scale === undefined ? Number(svg.getAttribute('data-scale')) || 2 : scale;
  return draw(svg, z, s);
}
```

### Appendix C. `js/core/station-kit.js` (new)

```js
// js/core/station-kit.js: the pieces every station shares: the header, the problem card, the "where next" links, the
// neighbour lookup, the values-preset reader and the title span.
// Pure: neighbours, valuesOf, freshNote. DOM (browser only): header, problemCard, links, titleSpan.
//
// Imports (ARCHITECTURE section 1, Iteration 2 allows ./katex.js, ./decisions.js, ./moveglyph.js, ../data/problems.js, ../registry.js;
// nothing in the kit draws a glyph, so ./moveglyph.js is not imported).
// Colours are tokens only. No DOM access at import time.
// Design: docs/designs/iter-2/i2-decisions-kit.md sections 4.3 and 5.3.

import { tex, prose, plainProse } from './katex.js';
import { chips as decisionChips } from './decisions.js';
import { problemById, problemsForStation, statementParts, addressTones } from '../data/problems.js';
import { THREADS, threadLabel, threadLinkPrefix } from '../registry.js';

// ---------------------------------------------------------------- pure

export function neighbours(ctx) {
  const stations = ctx && Array.isArray(ctx.stations) ? ctx.stations : [];
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const cur = ctx && ctx.station;
  const i = cur ? list.findIndex((s) => s.id === cur.id) : -1;
  if (i < 0) return { prev: null, next: null, threads: [] };
  const prev = list[i - 1] || null;
  const next = list[i + 1] || null;
  const story = new Set([prev && prev.id, next && next.id].filter(Boolean));
  const threads = [];
  for (const thread of list[i].threads || []) {
    const members = list.filter((s) => (s.threads || []).includes(thread));
    const j = members.findIndex((s) => s.id === cur.id);
    const tp = members[j - 1] || null;
    const tn = members[j + 1] || null;
    if ((tp && !story.has(tp.id)) || (tn && !story.has(tn.id))) threads.push({ thread, prev: tp, next: tn });
  }
  return { prev, next, threads };
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function valuesOf(preset, shape) {
  if (!preset || typeof preset !== 'object' || preset.kind !== 'values') return null;
  const out = {};
  const given = preset.values && typeof preset.values === 'object' && !Array.isArray(preset.values) ? preset.values : {};
  const spec = shape && typeof shape === 'object' ? shape : {};
  for (const key of Object.keys(spec)) {
    if (UNSAFE_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(given, key)) continue;
    const v = given[key];
    const kind = spec[key];
    let clean;
    if (kind === 'complex') clean = v && typeof v === 'object' && Number.isFinite(v.re) && Number.isFinite(v.im) ? { re: v.re + 0, im: v.im + 0 } : undefined;
    else if (kind === 'real') clean = typeof v === 'number' && Number.isFinite(v) ? v + 0 : undefined;
    else if (kind === 'int') clean = Number.isInteger(v) ? v + 0 : undefined;
    else if (kind === 'bool') clean = typeof v === 'boolean' ? v : undefined;
    else if (kind === 'string') clean = typeof v === 'string' ? v : undefined;
    else if (Array.isArray(kind)) clean = typeof v === 'string' && kind.includes(v) ? v : undefined;
    else if (typeof kind === 'function') {
      try { clean = kind(v); } catch (err) { clean = undefined; }
    }
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

export function freshNote(problem, preset) {
  if (!problem || typeof problem !== 'object' || typeof problem.id !== 'string') return '';
  if (!preset || typeof preset !== 'object' || preset.kind !== 'values' || preset.problem !== problem.id) return '';
  const text = problem.answer && typeof problem.answer.text === 'string' ? problem.answer.text : '';
  return `Fresh numbers from the Rehearsal Room. The handout's own answer: ${text}`;
}

// ---------------------------------------------------------------- DOM (browser only)

const STYLE = `
.station-header .thread-badges { margin-bottom: var(--space-2); }
.station-header .chips { margin-bottom: var(--space-1); }
.problem-card { display: grid; gap: var(--space-2); min-width: 0; background: var(--surface); }
.problem-card > * { min-width: 0; margin: 0; }
.problem-card .pk-title { font-size: 1.1rem; }
.problem-card .pk-statement { font-size: 1.05rem; overflow-wrap: anywhere; }
.problem-card .pk-note { color: var(--text-muted); }
.problem-card .pk-note:empty, .problem-card .pk-slot:empty { display: none; }
.problem-card .pk-decisions { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-2); }
.problem-card .pk-why, .problem-card .pk-aha { color: var(--text-muted); font-size: 0.95rem; line-height: 1.45; }
.problem-card .pk-lead { color: var(--text); font-weight: 700; }
.problem-card .pk-answer { display: block; }
.problem-card .pk-answer > summary { display: flex; align-items: center; gap: var(--space-2); min-height: var(--tap); cursor: pointer; font-weight: 600; list-style: none; }
.problem-card .pk-answer > summary::-webkit-details-marker { display: none; }
.problem-card .pk-answer > summary::before { content: "\\25B8"; display: inline-block; color: var(--text-muted); }
.problem-card .pk-answer[open] > summary::before { transform: rotate(90deg); }
.problem-card .pk-answer-body { display: grid; gap: var(--space-2); min-width: 0; }
.problem-card .pk-final { padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
.problem-card .pk-final .katex-display { max-width: none; margin: 0.4em 0; overflow: visible; }
.problem-card .pk-hint { color: var(--text-muted); font-size: 0.9rem; }
.problem-card .pk-routes { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.problem-card .pk-route { min-width: 0; padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.problem-card .pk-route h3 { margin: 0 0 var(--space-1); font-size: 0.95rem; }
.problem-card .pk-route p { margin: 0; }
.problem-card[data-empty="true"] { padding-block: var(--space-2); }
.pk-alias { display: contents; }
.station-links .station-link { text-align: left; }
`;

function needDocument(who) {
  if (typeof document === 'undefined') throw new TypeError(`${who} needs a document`);
}

function ensureStyle() {
  const head = document.head;
  if (!head || head.querySelector('style[data-for="station-kit"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'station-kit');
  s.textContent = STYLE;
  head.appendChild(s);
}

function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false) node.append(kid);
  return node;
}

const idKey = (id) => String(id).replace(/\./g, '-');
const safeId = (text) => String(text).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
const PREFIX_RE = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function titleSpan(text) {
  needDocument('titleSpan');
  const span = document.createElement('span');
  prose(span, String(text === null || text === undefined ? '' : text));
  return span;
}

export function header(ctx, { lede = '', active = null, chips = true } = {}) {
  needDocument('header');
  ensureStyle();
  const st = ctx && ctx.station;
  if (!st || typeof st.id !== 'string') throw new TypeError('header needs ctx.station');
  const threads = Array.isArray(ctx.threads) ? ctx.threads : THREADS;
  const root = h('header', { class: 'station-header', id: `${st.id}-header` });
  const title = h('h1', { id: `${st.id}-title` });
  prose(title, st.title);
  root.append(title);
  if (lede) root.append(h('p', { class: 'station-lede', id: `${st.id}-lede` }, lede));
  const badges = h('ul', { class: 'thread-badges', id: `${st.id}-threads` });
  for (const t of st.threads || []) {
    const th = threads.find((x) => x.id === t);
    const badge = h('span', { class: 'thread-badge', 'data-thread': t, title: th ? `${th.title}. ${th.summary}` : null }, threadLabel(th || t));
    badges.append(h('li', null, badge));
  }
  if (badges.childNodes.length) root.append(badges);
  if (chips) {
    const mine = problemsForStation(st.id).map((p) => p.id);
    if (mine.length) {
      const row = h('div', { class: 'chips', id: `${st.id}-problem-chips`, role: 'group', 'aria-label': 'Problems on this page' });
      for (const id of mine) {
        const p = problemById(id);
        const a = h('a', {
          class: 'chip problem-chip', id: `${st.id}-problem-chip-${idKey(id)}`, href: `#problem-${idKey(id)}`, 'aria-label': `Problem ${id}`,
          title: p ? plainProse(p.aha) : null, 'aria-current': active === id ? 'true' : null,
        }, id);
        row.append(a);
      }
      root.append(row);
    }
  }
  return root;
}

export function links(ctx, { extras = [], lab = null, label = 'Where next' } = {}) {
  needDocument('links');
  ensureStyle();
  const st = ctx && ctx.station;
  if (!st || typeof st.id !== 'string') throw new TypeError('links needs ctx.station');
  if (lab && !(ctx.store && typeof ctx.store.set === 'function' && typeof ctx.navigate === 'function')) throw new TypeError('links: a lab request needs ctx.store.set and ctx.navigate');
  const nav = h('nav', { class: 'station-links', id: `${st.id}-links`, 'aria-label': label });
  const shown = new Set();
  const add = (href, text, extra) => {
    const target = safeId(String(href).replace(/^#/, ''));
    if (!target || shown.has(target)) return;
    shown.add(target);
    const a = h('a', { class: 'station-link', id: `${st.id}-link-${target}`, href, 'data-dir': extra.dir || null, 'data-thread': extra.thread || null, title: extra.title || null });
    const span = document.createElement('span');
    prose(span, text);
    a.append(span);
    nav.append(a);
  };
  const nb = neighbours(ctx);
  if (nb.prev) add(`#${nb.prev.id}`, nb.prev.title, { dir: 'prev' });
  if (nb.next) add(`#${nb.next.id}`, nb.next.title, { dir: 'next' });
  for (const t of nb.threads) {
    if (t.prev) add(`#${t.prev.id}`, threadLinkPrefix(t.thread, 'prev') + t.prev.title, { dir: 'prev', thread: t.thread, title: `Previous on thread ${t.thread}` });
    if (t.next) add(`#${t.next.id}`, threadLinkPrefix(t.thread, 'next') + t.next.title, { dir: 'next', thread: t.thread, title: `Next on thread ${t.thread}` });
  }
  for (const x of Array.isArray(extras) ? extras : []) {
    if (!x || typeof x.href !== 'string' || typeof x.text !== 'string') continue;
    add(x.href, (x.prefix || '') + x.text, { dir: x.dir || null, thread: x.thread || null });
  }
  if (lab) {
    const btn = h('button', { type: 'button', class: 'btn', id: `${st.id}-open-lab` }, 'Open in the Lab');
    btn.addEventListener('click', () => {
      ctx.store.set('lab.request', lab, { persist: false });
      ctx.navigate('lab');
    });
    nav.append(btn);
  }
  if (!nav.childNodes.length) nav.hidden = true;
  return nav;
}

// The statement of a problem as text and typeset maths. The punctuation that opens the text after a maths part stays with
// that part in one non-wrapping run, exactly as js/stations/problems.js appendStatement does (a test compares the two).
const TAIL = /^[.,;:!?)\]]+/;
function statementNodes(parts) {
  const out = [];
  for (const part of Array.isArray(parts) ? parts : []) {
    const last = out[out.length - 1];
    if (!part.math) {
      const m = last && last.math && last.tail === '' ? TAIL.exec(part.text) : null;
      if (m) {
        last.tail = m[0];
        if (part.text.length > m[0].length) out.push({ math: false, text: part.text.slice(m[0].length) });
        continue;
      }
      out.push({ math: false, text: part.text });
    } else out.push({ math: true, text: part.text, tail: '' });
  }
  return out;
}

function appendStatement(host, parts) {
  for (const node of statementNodes(parts)) {
    if (!node.math) { host.append(document.createTextNode(node.text)); continue; }
    const m = document.createElement('span');
    tex(m, node.text);
    if (!node.tail) { host.append(m); continue; }
    const run = document.createElement('span');
    run.style.whiteSpace = 'nowrap';
    run.append(m, document.createTextNode(node.tail));
    host.append(run);
  }
}

function toneFor(problem) {
  const tones = [...new Set(addressTones(problem.address).map((t) => t.replace(/^--/, '')))];
  return tones.length === 1 ? tones[0] : 'accent';
}

export function problemCard(ctx, problem, options = {}) {
  needDocument('problemCard');
  ensureStyle();
  const opt = options && typeof options === 'object' ? options : {};
  const stationId = ctx && ctx.station && ctx.station.id;
  const id = opt.id !== undefined ? opt.id : stationId ? `${stationId}-problem` : undefined;
  if (typeof id !== 'string' || !PREFIX_RE.test(id)) throw new TypeError('problemCard needs ctx.station.id or options.id (letters, digits, - and _, starting with a letter)');
  const answerMode = ['reveal', 'open', 'none'].includes(opt.answer) ? opt.answer : 'reveal';
  const withWhy = opt.why !== false;
  const withRoutes = opt.routes === true;
  const aliases = opt.aliases && typeof opt.aliases === 'object' ? opt.aliases : {};
  let destroyed = false;
  let observer = null;
  let current = null;
  const fixedTone = ['cart', 'polar', 'accent'].includes(opt.tone) ? opt.tone : null;

  const els = {
    title: h('h2', { class: 'panel-title pk-title', id: `${id}-title` }),
    statement: h('p', { class: 'pk-statement', id: `${id}-statement` }),
    note: h('p', { class: 'pk-note', id: `${id}-note` }),
    decisions: h('div', { class: 'pk-decisions', id: `${id}-decisions` }),
    why: withWhy ? h('p', { class: 'pk-why', id: `${id}-why` }) : null,
    answer: null, answerTex: null, answerText: null, routeCart: null, routePolar: null,
    slot: h('div', { class: 'pk-slot', id: `${id}-slot` }),
  };
  let summary = null;
  let aha = null;
  let hint = null;
  let scroller = null;
  let routesBox = null;

  const body = answerMode === 'none' ? null : h('div', { class: 'pk-answer-body' });
  if (answerMode !== 'none') {
    aha = h('p', { class: 'pk-aha', id: `${id}-aha` });
    scroller = h('div', {
      class: 'tex-scroll pk-final', tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide',
      id: aliases.answer ? String(aliases.answer) : `${id}-answer-tex`,
    });
    hint = h('p', { class: 'pk-hint', id: `${id}-answer-hint`, hidden: true }, 'Scroll sideways to see the rest.');
    els.answerText = h('p', { class: 'muted mono', id: `${id}-answer-text` });
    els.answerTex = scroller;
    if (aliases.answer) body.append(aha, h('div', { id: `${id}-answer-tex` }, scroller, hint), els.answerText);
    else body.append(aha, scroller, hint, els.answerText);
  }
  if (withRoutes) {
    routesBox = h('div', { class: 'pk-routes' });
    els.routeCart = h('section', { class: 'pk-route', id: `${id}-route-cart`, 'data-tone': 'cart' }, h('h3', null, 'In Cartesian (slide)'), h('p'));
    els.routePolar = h('section', { class: 'pk-route', id: `${id}-route-polar`, 'data-tone': 'polar' }, h('h3', null, 'In polar (spin and stretch)'), h('p'));
    routesBox.append(els.routeCart, els.routePolar);
  }
  if (answerMode === 'reveal') {
    summary = h('summary', { id: `${id}-answer-toggle` }, 'Show the answer');
    els.answer = h('details', { class: 'pk-answer', id: `${id}-answer` }, summary, body);
    if (routesBox) body.append(routesBox);
  } else if (answerMode === 'open') {
    els.answer = h('div', { class: 'pk-answer', id: `${id}-answer` }, body);
    if (routesBox) body.append(routesBox);
  }

  const root = h('aside', { class: 'callout problem-card', id, 'aria-labelledby': `${id}-title` });
  root.append(els.title, els.statement, els.note, els.decisions);
  if (els.why) root.append(els.why);
  if (els.answer) root.append(els.answer);
  else if (routesBox) root.append(routesBox);
  root.append(els.slot);
  let outer = root;
  if (aliases.card) {
    outer = h('div', { class: 'pk-alias', id: String(aliases.card) });
    outer.append(root);
  }

  const refreshHint = () => { if (hint && scroller) hint.hidden = !(scroller.scrollWidth > scroller.clientWidth + 1); };
  if (scroller) {
    try {
      if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(refreshHint); observer.observe(scroller); }
    } catch (err) { observer = null; }
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshHint, () => {}); } catch (err) { /* the observer is enough */ }
  }

  function lead(text, prefix) {
    const strong = h('span', { class: 'pk-lead' }, prefix);
    const rest = document.createElement('span');
    prose(rest, text);
    return [strong, rest];
  }

  function render(p, noteText) {
    const real = p && typeof p === 'object' && typeof p.id === 'string';
    current = real ? p : null;
    els.statement.replaceChildren();
    els.decisions.replaceChildren();
    if (els.why) els.why.replaceChildren();
    if (els.answer) els.answer.hidden = !real;
    if (!real) {
      root.removeAttribute('data-problem');
      root.dataset.empty = 'true';
      root.dataset.tone = fixedTone || 'accent';
      els.title.textContent = '';
      els.title.hidden = true;
      if (aha) aha.replaceChildren();
      if (scroller) scroller.replaceChildren();
      if (els.answerText) els.answerText.textContent = '';
      if (els.routeCart) { els.routeCart.querySelector('p').replaceChildren(); els.routePolar.querySelector('p').replaceChildren(); }
      els.note.textContent = noteText ? noteText : 'Your own numbers.';
      return;
    }
    root.dataset.problem = p.id;
    root.removeAttribute('data-empty');
    root.dataset.tone = fixedTone || toneFor(p);
    els.title.hidden = false;
    els.title.textContent = opt.title ? String(opt.title) : `Problem ${p.id}`;
    appendStatement(els.statement, statementParts(p.statement));
    els.note.textContent = noteText !== undefined && noteText !== null ? noteText : (typeof opt.note === 'string' ? opt.note : '');
    els.decisions.append(decisionChips(p, { idPrefix: id }));
    if (els.why) els.why.append(...lead(p.addressWhy, 'Why this address. '));
    if (aha) aha.replaceChildren(...lead(p.aha, 'The aha. '));
    if (scroller && p.answer) { tex(scroller, p.answer.tex, { display: true }); if (els.answerText) els.answerText.textContent = p.answer.text; }
    if (els.routeCart && p.routes) { prose(els.routeCart.querySelector('p'), p.routes.cart); prose(els.routePolar.querySelector('p'), p.routes.polar); }
    refreshHint();
  }
  render(problem, undefined);

  return {
    el: outer,
    els,
    setProblem(next, { note } = {}) { if (!destroyed) render(next, note); },
    setNote(text) { if (!destroyed) els.note.textContent = text === null || text === undefined ? '' : String(text); },
    setAnswerOpen(on) {
      if (destroyed || answerMode !== 'reveal') return;
      els.answer.open = !!on;
      refreshHint();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observer) { try { observer.disconnect(); } catch (err) { /* gone already */ } observer = null; }
      outer.remove();
    },
  };
}
```

### Appendix D. Patches to `js/data/problems.js` and `js/app.js`

**`js/data/problems.js`** (the 29 `names` lines, the constant, the two uses; `diff -U0`):

```diff
--- a/js/data/problems.js
+++ b/js/data/problems.js
@@ -55,0 +56 @@
+    names: 'none',
@@ -73,0 +75 @@
+    names: 'none',
@@ -91,0 +94 @@
+    names: 'none',
@@ -109,0 +113 @@
+    names: 'none',
@@ -127,0 +132 @@
+    names: 'home',
@@ -145,0 +151 @@
+    names: 'any',
@@ -163,0 +170 @@
+    names: 'all',
@@ -184,0 +192 @@
+    names: 'all',
@@ -207,0 +216 @@
+    names: 'all',
@@ -225,0 +235 @@
+    names: 'none',
@@ -243,0 +254 @@
+    names: 'none',
@@ -265,0 +277 @@
+    names: 'any',
@@ -283,0 +296 @@
+    names: 'none',
@@ -301,0 +315 @@
+    names: 'any',
@@ -319,0 +334 @@
+    names: 'any',
@@ -337,0 +353 @@
+    names: 'home',
@@ -355,0 +372 @@
+    names: 'any',
@@ -373,0 +391 @@
+    names: 'continuous',
@@ -391,0 +410 @@
+    names: 'any',
@@ -410,0 +430 @@
+    names: 'none',
@@ -428,0 +449 @@
+    names: 'any',
@@ -449,0 +471 @@
+    names: 'none',
@@ -468,0 +491 @@
+    names: 'any',
@@ -486,0 +510 @@
+    names: 'any',
@@ -504,0 +529 @@
+    names: 'none',
@@ -524,0 +550 @@
+    names: 'any',
@@ -542,0 +569 @@
+    names: 'any',
@@ -563,0 +591 @@
+    names: 'any',
@@ -581,0 +610 @@
+    names: 'none',
@@ -743 +772 @@
-const INDEX_STATION = 'problems';                // the station that lists everything
+const FULL_LIST_STATIONS = new Set(['problems', 'rehearse']); // the stations that list everything (the index and the Rehearsal Room)
@@ -756 +785 @@
-  if (stationId === INDEX_STATION) return PROBLEMS.slice();
+  if (FULL_LIST_STATIONS.has(stationId)) return PROBLEMS.slice();
@@ -761 +790 @@
-  if (stationId === INDEX_STATION) return TOPICS.slice();
+  if (FULL_LIST_STATIONS.has(stationId)) return TOPICS.slice();
```

**`js/app.js`**:

```diff
--- a/js/app.js
+++ b/js/app.js
@@ -5,22 +5,17 @@
 //
 // Imports are limited to the registry and the three shell helpers (theme, store, ids) on purpose.
 
-import { STATIONS, THREADS, stationById, stationForProblem, stationForTopic } from './registry.js';
+import { STATIONS, THREADS, PARTS, stationById, stationForProblem, stationForTopic } from './registry.js';
 import { cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion, initTheme } from './core/theme.js';
 import { createStore } from './core/store.js';
 import { watchIds } from './core/ids.js';
 
 export const SITE_TITLE = 'One Point, Two Addresses';
 
-// The registry only carries the part letters; the names live here.
-export const PART_TITLES = {
-  I: { title: 'The point', note: 'Chapter 1' },
-  II: { title: 'Curves and sets', note: 'Chapter 1' },
-  III: { title: 'Motions', note: 'Chapter 2' },
-  IV: { title: 'Zoom', note: 'Chapter 3' },
-  V: { title: 'The diary and the index', note: 'Lab, 4D, problems' },
-};
+// The part names live in the registry (js/registry.js PARTS); the menu and the Story Map read the same object.
+export const PART_TITLES = PARTS;
 
+const REQUEST_KEY = 'station.request';
 const TOKEN_RE = /^[A-Za-z0-9._~-]+$/;
 const MAX_TOKEN = 120;
 const LOADING_DELAY_MS = 150;
@@ -90,6 +85,29 @@
   return miss;
 }
 
+// The values preset (ARCHITECTURE 4.1): a station opened with fresh numbers. A StationRequest is written under the store key
+// station.request (memory only) by the Rehearsal Room; cleanRequest is the router's check of its envelope (the station
+// validates the values itself with valuesOf). Pure; not exported.
+const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
+const knownProblem = (id) => (typeof id === 'string' && stationForProblem(id) ? id : null);
+
+function cleanRequest(raw) {
+  if (!isPlainObject(raw) || typeof raw.station !== 'string' || !stationById(raw.station) || !isPlainObject(raw.values)) return null;
+  return { station: raw.station, problem: knownProblem(raw.problem), family: knownProblem(raw.family), values: raw.values };
+}
+
+function deepFreeze(o) {
+  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
+    Object.freeze(o);
+    for (const k of Object.keys(o)) deepFreeze(o[k]);
+  }
+  return o;
+}
+
+function valuesPreset(req) {
+  return deepFreeze({ kind: 'values', station: req.station, problem: req.problem, family: req.family, values: req.values });
+}
+
 // ---------------------------------------------------------------- DOM helpers (browser only)
 
 function el(tag, attrs, children) {
@@ -140,7 +158,7 @@
   if (!view || !nav) throw new Error('index.html must contain #view and #site-nav');
 
   const store = createStore('mv:');
-  const state = { seq: 0, current: null, first: true, loadingTimer: 0, stopIds: null };
+  const state = { seq: 0, current: null, first: true, loadingTimer: 0, stopIds: null, preset: null };
   const cleanups = [];
   const listen = (target, type, fn, opts) => {
     target.addEventListener(type, fn, opts);
@@ -284,14 +302,26 @@
     else location.hash = hash;
   }
 
-  function makeCtx(route, st) {
+  // The request a station was sent (ARCHITECTURE 4.1). Read and removed in one go: a request for the station about to mount
+  // becomes its values preset and is consumed; a request for another station stays where it is; one that is not a request
+  // at all is dropped. Synchronous on purpose, so nothing can read the key between the get and the remove.
+  function takeStationRequest(stationId) {
+    const raw = store.get(REQUEST_KEY, null);
+    if (raw === null) return null;
+    const req = cleanRequest(raw);
+    if (req && req.station !== stationId) return null;
+    store.remove(REQUEST_KEY);
+    return req ? valuesPreset(req) : null;
+  }
+
+  function makeCtx(route, st, preset) {
     return Object.freeze({
       navigate,
       route: route.raw || 'home',
       station: st,
       stations: STATIONS,
       threads: THREADS,
-      preset: route.preset,
+      preset,
       store,
       theme: THEME_API,
     });
@@ -309,6 +339,7 @@
   function teardown() {
     const cur = state.current;
     state.current = null;
+    state.preset = null;
     if (state.stopIds) { state.stopIds(); state.stopIds = null; }
     if (cur) runUnmount(cur.id, cur.unmount);
   }
@@ -362,7 +393,9 @@
       clearTimeout(state.loadingTimer);
       if (placeholder) placeholder.remove();
       section.replaceChildren();
-      const unmount = await mod.mount(section, makeCtx(route, st));
+      const preset = takeStationRequest(st.id) || route.preset;
+      state.preset = preset;
+      const unmount = await mod.mount(section, makeCtx(route, st, preset));
       if (seq !== state.seq) {
         runUnmount(st.id, unmount);
         return;
@@ -374,6 +407,7 @@
       // A superseded navigation must not touch the timer: it now belongs to the newer one.
       if (seq !== state.seq) return;
       clearTimeout(state.loadingTimer);
+      state.preset = null;
       console.error(`[mv] station "${st.id}" failed to load: ${err && err.message ? err.message : err}`, err);
       section.replaceChildren(buildUnderConstruction(st, err));
       view.dataset.state = 'error';
@@ -438,7 +472,13 @@
 
   const mv = (window.__mv = window.__mv || { planes: new Map() });
   if (!mv.planes) mv.planes = new Map();
-  mv.app = { render, navigate, state: () => view.dataset.state };
+  mv.app = {
+    render,
+    navigate,
+    state: () => view.dataset.state,
+    request: (req) => { store.set(REQUEST_KEY, req, { persist: false }); },   // for interaction scripts: what the Rehearsal Room does before it navigates
+    preset: () => state.preset,                                              // the preset the current station was given (null when none)
+  };
 
   function stop() {
     for (const fn of cleanups.splice(0)) fn();
```

### Appendix E. Patches to the existing tests and tools

**`tests/unit/architecture-sync.test.mjs`**:

```diff
--- a/tests/unit/architecture-sync.test.mjs
+++ b/tests/unit/architecture-sync.test.mjs
@@ -59,5 +59,5 @@
 // ----- the document ----------------------------------------------------------------------------------------
 
-function sections() {
+function sections(headingRe = /^### (3\.\d+) (.*)$/) {
   const lines = read('docs/ARCHITECTURE.md').split('\n');
   const out = [];
@@ -65,5 +65,6 @@
   for (const line of lines) {
     if (/^## /.test(line)) { cur = null; continue; }
-    const h = /^### (3\.\d+) (.*)$/.exec(line);
+    if (/^### /.test(line) && !headingRe.test(line)) { cur = null; continue; }
+    const h = headingRe.exec(line);
     if (h) {
       cur = { id: h[1], heading: h[2], modules: [...h[2].matchAll(/`(js\/[\w/.-]+\.js)`/g)].map((m) => m[1]), lines: [] };
@@ -121,40 +122,64 @@
 });
 
+function checkSignatures(s) {
+  assert.ok(s.modules.length > 0, `${s.id} names no module in its heading`);
+  const sigs = s.modules.map((m) => [m, sourceSignatures(m)]);
+  const decls = declarations(s);
+  assert.ok(decls.length > 0, `${s.id} documents no export`);
+  for (const d of decls) {
+    if (d.kind !== 'function') continue;
+    const hit = sigs.find(([, map]) => map.has(d.name));
+    assert.ok(hit, `${s.id}: ${d.name} is documented but no ${s.modules.join(' / ')} exports a function of that name`);
+    assert.equal(d.params, hit[1].get(d.name), `${s.id}: ${hit[0]} ${d.name}(...) differs from the code`);
+  }
+}
+
+async function checkExports(s) {
+  const real = new Set();
+  for (const m of s.modules) {
+    const mod = await import(pathToFileURL(path.join(ROOT, m)).href);
+    for (const k of Object.keys(mod)) real.add(k);
+  }
+  for (const d of declarations(s)) assert.ok(real.has(d.name), `${s.id}: ${d.name} is documented but not exported`);
+  for (const k of real) {
+    assert.ok(new RegExp(`(?<![\\w$])${k}(?![\\w$])`).test(s.text), `${s.id}: export ${k} is not mentioned in its section`);
+  }
+}
+
 for (const s of SECTIONS) {
-  test(`ARCHITECTURE ${s.id}: every documented signature is the one in the code`, () => {
-    assert.ok(s.modules.length > 0, `${s.id} names no module in its heading`);
-    const sigs = s.modules.map((m) => [m, sourceSignatures(m)]);
-    const decls = declarations(s);
-    assert.ok(decls.length > 0, `${s.id} documents no export`);
-    for (const d of decls) {
-      if (d.kind !== 'function') continue;
-      const hit = sigs.find(([, map]) => map.has(d.name));
-      assert.ok(hit, `${s.id}: ${d.name} is documented but no ${s.modules.join(' / ')} exports a function of that name`);
-      assert.equal(d.params, hit[1].get(d.name), `${s.id}: ${hit[0]} ${d.name}(...) differs from the code`);
-    }
-  });
+  test(`ARCHITECTURE ${s.id}: every documented signature is the one in the code`, () => checkSignatures(s));
+  test(`ARCHITECTURE ${s.id}: documented exports exist and every real export is documented`, () => checkExports(s));
+}
 
-  test(`ARCHITECTURE ${s.id}: documented exports exist and every real export is documented`, async () => {
-    const real = new Set();
-    for (const m of s.modules) {
-      const mod = await import(pathToFileURL(path.join(ROOT, m)).href);
-      for (const k of Object.keys(mod)) real.add(k);
-    }
-    for (const d of declarations(s)) assert.ok(real.has(d.name), `${s.id}: ${d.name} is documented but not exported`);
-    for (const k of real) {
-      assert.ok(new RegExp(`(?<![\\w$])${k}(?![\\w$])`).test(s.text), `${s.id}: export ${k} is not mentioned in its section`);
-    }
-  });
+// Section 11 holds the modules iteration 2 builds, until the integrator promotes each block into section 3 (the promotion
+// replaces these tests with the section 3 ones). The three kit modules of i2-decisions-kit are guarded from the day they land;
+// the other blocks (11.4 to 11.6) belong to goals that land in the same wave and are guarded by their own goals.
+const KIT_MODULES = ['js/core/decisions.js', 'js/core/moveglyph.js', 'js/core/station-kit.js'];
+for (const s of sections(/^### (11\.\d+) (.*)$/)) {
+  const built = s.modules.length > 0 && s.modules.every((m) => KIT_MODULES.includes(m) && fs.existsSync(path.join(ROOT, m)));
+  if (!built) continue;
+  test(`ARCHITECTURE ${s.id} (iteration 2): every documented signature is the one in the code`, () => checkSignatures(s));
+  test(`ARCHITECTURE ${s.id} (iteration 2): documented exports exist and every real export is documented`, () => checkExports(s));
 }
 
 // ----- section 1, "Import rules" --------------------------------------------------------------------------
 
-test('ARCHITECTURE section 1: wave-0 modules import each other only where the import rules say', () => {
-  const allowed = {
-    'js/app.js': ['./registry.js', './core/theme.js', './core/store.js', './core/ids.js'],
-    'js/core/explainer.js': ['./katex.js'],
-    'js/core/parse.js': ['./complex.js'],
-    'js/core/three-view.js': ['../../vendor/three/three.module.min.js', '../../vendor/three/OrbitControls.js'],
-  };
+// The imports each module may have: the iteration-1 rules plus the section 1 "Iteration 2 imports" list. A file may import FEWER
+// than its entry (a module that does not need one of them, or one that has not been built yet), never MORE, so a goal that lands
+// before the others does not turn the test red.
+const ALLOWED_IMPORTS = {
+  'js/app.js': ['./registry.js', './core/theme.js', './core/store.js', './core/ids.js', './core/walk.js', './core/listen.js'],
+  'js/core/explainer.js': ['./katex.js'],
+  'js/core/parse.js': ['./complex.js'],
+  'js/core/three-view.js': ['../../vendor/three/three.module.min.js', '../../vendor/three/OrbitControls.js'],
+  'js/core/decisions.js': ['../data/problems.js'],
+  'js/core/station-kit.js': ['./katex.js', './decisions.js', './moveglyph.js', '../data/problems.js', '../registry.js'],
+  'js/core/moveglyph.js': [],
+  'js/core/listen.js': [],                          // media/manifest.js is loaded with a dynamic import() inside loadManifest
+  'js/core/walk.js': ['./listen.js'],
+  'js/data/generators.js': ['../core/complex.js'],
+};
+
+test('ARCHITECTURE section 1: every import found is in the allowed list (iteration 1 rules and the Iteration 2 imports)', () => {
   const files = ['js/app.js', 'js/registry.js', ...fs.readdirSync(path.join(ROOT, 'js/core')).map((f) => `js/core/${f}`),
     ...fs.readdirSync(path.join(ROOT, 'js/data')).map((f) => `js/data/${f}`)].filter((f) => f.endsWith('.js'));
@@ -162,10 +187,32 @@
   for (const f of files) {
     const found = [...read(f).matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]).sort();
-    assert.deepEqual(found, (allowed[f] || []).slice().sort(), `${f} imports ${JSON.stringify(found)}`);
+    const allowed = new Set(ALLOWED_IMPORTS[f] || []);
+    for (const imp of found) assert.ok(allowed.has(imp), `${f} imports ${imp}, which is not in its allowed list ${JSON.stringify([...allowed])}`);
+    assert.equal(new Set(found).size, found.length, `${f} imports the same module twice`);
+  }
+});
+
+test('ARCHITECTURE section 1: the allowed list carries every row of the "Iteration 2 imports" paragraph, line by line', () => {
+  const doc = read('docs/ARCHITECTURE.md').split(/^## 1\. /m)[1].split(/^## 2\. /m)[0];
+  const para = doc.slice(doc.indexOf('**Iteration 2 imports**'));
+  assert.ok(para.length > 200, 'the paragraph exists');
+  for (const f of ['js/core/decisions.js', 'js/core/station-kit.js', 'js/core/moveglyph.js', 'js/core/listen.js', 'js/core/walk.js', 'js/data/generators.js', 'js/app.js']) {
+    assert.ok(para.includes('`' + f + '`'), `the paragraph names ${f}`);
+    if (f === 'js/app.js') continue;                                          // its row is written as "adds ./core/walk.js and ./core/listen.js"
+    for (const imp of ALLOWED_IMPORTS[f]) assert.ok(para.includes('`' + imp + '`'), `the paragraph lists ${imp} for ${f}`);
   }
+  for (const imp of ['./core/walk.js', './core/listen.js']) assert.ok(para.includes('`' + imp + '`') && ALLOWED_IMPORTS['js/app.js'].includes(imp), `app.js adds ${imp}`);
+  // and the reverse: a file the paragraph gives no import to has none in the list
+  assert.deepEqual(ALLOWED_IMPORTS['js/core/moveglyph.js'], []);
 });
 
+const STYLE_MODULES = ['decisions.js', 'explainer.js', 'moveglyph.js', 'plane.js', 'staircase.js', 'station-kit.js', 'three-view.js'];
+
 test('ARCHITECTURE section 1: the style tags named in the import rules are the ones the modules inject', () => {
   const injecting = fs.readdirSync(path.join(ROOT, 'js/core')).filter((f) => /data-for/.test(read(`js/core/${f}`))).sort();
-  assert.deepEqual(injecting, ['explainer.js', 'plane.js', 'staircase.js', 'three-view.js']);
+  for (const f of injecting) assert.ok(STYLE_MODULES.includes(f), `${f} mentions data-for but is not one of the seven modules that inject a style tag`);
+  for (const f of ['decisions.js', 'moveglyph.js', 'station-kit.js']) {                 // the kit modules (i2-decisions-kit) must inject theirs
+    if (fs.existsSync(path.join(ROOT, 'js/core', f))) assert.ok(injecting.includes(f), `${f} must inject <style data-for="${f.replace(/\.js$/, '')}">`);
+  }
+  for (const f of ['explainer.js', 'plane.js', 'staircase.js', 'three-view.js']) assert.ok(injecting.includes(f), `${f} still injects its style`);
 });
```

**`tests/unit/i1-data.test.mjs`**:

```diff
--- a/tests/unit/i1-data.test.mjs
+++ b/tests/unit/i1-data.test.mjs
@@ -9,5 +9,5 @@
 import * as P from '../../js/data/problems.js';
 import { FUNCTIONS, fnById } from '../../js/data/functions.js';
-import { STATIONS, stationForProblem } from '../../js/registry.js';
+import { STATIONS, META_STATIONS, stationForProblem } from '../../js/registry.js';
 
 const ROOT = fileURLToPath(new URL('../../', import.meta.url));
@@ -39,5 +39,5 @@
 const FUNCTION_IDS = ['sq', 'cube', 'recip', 'linear-i', 'linear-1i', 'sq-plus-iz', 'sq-plus-z', 'exp', 'conj', 're', 'abs2', 'dir', 'sqrt', 'cbrt', 'x-over-z'];
 const ADDRESSES = ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both'];
-const REAL_STATIONS = STATIONS.filter((s) => s.id !== 'problems');
+const REAL_STATIONS = STATIONS.filter((s) => !META_STATIONS.includes(s.id));   // the index and the Rehearsal Room list every problem and own none
 
 const sorted = (a) => [...a].sort();
@@ -81,4 +81,5 @@
     assert.ok(typeof p.addressWhy === 'string' && p.addressWhy.length > 10, `${where} addressWhy`);
     assert.ok(ADDRESSES.includes(p.address), `${where} address ${p.address}`);
+    assert.ok(['none', 'any', 'all', 'home', 'continuous'].includes(p.names), `${where} names ${p.names}`);   // the second decision (i2-decisions-kit; the full table is in i2-decisions-kit.test.mjs)
     assert.ok(['T1', 'T2', 'T3'].includes(p.thread), `${where} thread`);
     assert.ok(Array.isArray(p.topics) && p.topics.length >= 1, `${where} topics`);
@@ -91,5 +92,5 @@
     assert.ok(owner, `${where} has a registry station`);
     assert.equal(p.station, owner.id, `${where} station`);
-    const listing = STATIONS.filter((s) => s.id !== 'problems' && s.problems.includes(p.id)).map((s) => s.id);
+    const listing = REAL_STATIONS.filter((s) => s.problems.includes(p.id)).map((s) => s.id);
     assert.deepEqual(sorted([p.station, ...p.alsoAt]), sorted(listing), `${where} station + alsoAt equals the registry listing`);
     assert.ok(!p.alsoAt.includes(p.station), `${where} alsoAt excludes the owner`);
@@ -136,5 +137,5 @@
       assert.ok(st.topics.includes(t.id), `${where} is listed by station ${sid}`);
     }
-    const listing = STATIONS.filter((s) => s.id !== 'problems' && s.topics.includes(t.id)).map((s) => s.id);
+    const listing = REAL_STATIONS.filter((s) => s.topics.includes(t.id)).map((s) => s.id);
     assert.deepEqual(t.stations, listing, `${where} stations equal the registry listing, in registry order`);
     assert.ok(P.problemsForTopic(t.id).length >= 1, `${where} has at least one problem`);
@@ -192,4 +193,6 @@
   assert.equal(P.problemsForStation('problems').length, 29);
   assert.equal(P.topicsForStation('problems').length, 12);
+  assert.deepEqual(P.problemsForStation('rehearse').map((p) => p.id), HANDOUT_IDS, 'the Rehearsal Room lists all 29 in handout order');
+  assert.deepEqual(P.topicsForStation('rehearse').map((t) => t.id), TOPIC_IDS, 'and all 12 topics');
   assert.deepEqual(P.problemsForTopic('T1.4').map((p) => p.id), ['1.3.2', '1.4.1', '1.4.2', '1.4.3']);
   assert.deepEqual(P.problemsForTopic('T3.2').map((p) => p.id), ['3.2.1', 'P7']);
```

**`tests/unit/i1-shell.test.mjs`**:

```diff
--- a/tests/unit/i1-shell.test.mjs
+++ b/tests/unit/i1-shell.test.mjs
@@ -14,5 +14,5 @@
 const app = await import('../../js/app.js');
 const { parseRoute, groupStations, documentTitle, SITE_TITLE } = app;
-const { STATIONS, stationForProblem, stationForTopic } = await import('../../js/registry.js');
+const { STATIONS, PARTS, stationForProblem, stationForTopic } = await import('../../js/registry.js');
 const { createStore } = await import('../../js/core/store.js');
 const themeMod = await import('../../js/core/theme.js');
@@ -114,8 +114,9 @@
   const g = groupStations(STATIONS);
   assert.deepEqual(g.map((x) => x.part), ['I', 'II', 'III', 'IV', 'V']);
-  assert.deepEqual(g.map((x) => x.stations.length), [7, 2, 7, 2, 3]);
+  assert.deepEqual(g.map((x) => x.stations.length), [7, 2, 7, 2, 4]);
   assert.equal(g.reduce((n, x) => n + x.stations.length, 0), STATIONS.length);
   assert.equal(g[0].stations[0].id, 'home');
   assert.deepEqual(g.map((x) => x.title), ['The point', 'Curves and sets', 'Motions', 'Zoom', 'The diary and the index']);
+  assert.deepEqual(g.map((x) => x.note), ['Chapter 1', 'Chapter 1', 'Chapter 2', 'Chapter 3', 'Lab, 4D, rehearsal, problems']);
   const orders = g.flatMap((x) => x.stations.map((s) => s.order));
   assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
@@ -124,4 +125,10 @@
 });
 
+test('PART_TITLES is the registry PARTS: one object, one set of part names', () => {
+  assert.equal(app.PART_TITLES, PARTS);
+  assert.deepEqual(Object.keys(app.PART_TITLES), ['I', 'II', 'III', 'IV', 'V']);
+  for (const part of Object.values(app.PART_TITLES)) assert.deepEqual(Object.keys(part).sort(), ['note', 'title']);
+});
+
 test('documentTitle', () => {
   assert.equal(SITE_TITLE, 'One Point, Two Addresses');
```

**`tools/interact-all.mjs`**:

```diff
--- a/tools/interact-all.mjs
+++ b/tools/interact-all.mjs
@@ -38,4 +38,14 @@
   'i1-station-staircase-powers': ['staircase', 'powers', 'problem-1-3-2', 'topic-T2-4'],
   'wave0-sync': ['wave0-sync'],
+  // iteration 2 (docs/ARCHITECTURE.md section 8): a row for a script that does not exist yet is harmless
+  'i2-decisions-kit': ['home', 'nosuchplace'],
+  'i2-media-core': ['home', 'staircase'],
+  'i2-walk-shell': ['home', 'staircase', 'roots-m16'],
+  'i2-rehearse': ['rehearse', 'rehearse-1-4-2-s7', 'rehearse-2-5-1-s3', 'rehearse-P5-s1'],
+  'i2-lab-diary': ['lab'],
+  'i2-pictures': ['staircase', 'problem-1-1-1', 'graph4d'],
+  'i2-home-index-deck': ['home', 'problems', 'problems-names-all'],
+  'i2-adopt-ch1': ['addresses', 'problem-1-2-1', 'problem-1-3-2', 'roots-m16', 'problem-1-5-2', 'problem-1-5-1', 'problem-2-1-3'],
+  'i2-adopt-ch2-3': ['mappings', 'problem-2-1-2', 'problem-2-2-2', 'problem-2-4-1', 'problem-2-5-1', 'problem-2-3-1', 'problem-3-1-2', 'problem-3-2-1'],
 };
 
```

### Appendix F. `tests/unit/i2-decisions-kit.test.mjs` (new)

````js
// tests/unit/i2-decisions-kit.test.mjs: unit tests for the pure parts of i2-decisions-kit.
//   js/data/problems.js (the names field), js/core/decisions.js, js/core/moveglyph.js, js/core/station-kit.js (neighbours, valuesOf,
//   freshNote), the static rules of A7, the nine interact-all rows and the numbers behind the Names decision.
// Run: node --test tests/unit/i2-decisions-kit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as P from '../../js/data/problems.js';
import * as D from '../../js/core/decisions.js';
import * as G from '../../js/core/moveglyph.js';
import * as K from '../../js/core/station-kit.js';
import { STATIONS, stationById } from '../../js/registry.js';
import * as X from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const S3 = Math.sqrt(3);
const S2 = Math.SQRT2;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a}`);

const HANDOUT_IDS = ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2', '1.4.1', '1.4.2', '1.4.3', '1.5.1', '1.5.2',
  '2.1.1', '2.1.2', '2.1.3', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.5.1', '3.1.1', '3.1.2', '3.2.1', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const TOPIC_IDS = ['T1.1', 'T1.2', 'T1.3', 'T1.4', 'T1.5', 'T2.1', 'T2.2', 'T2.3', 'T2.4', 'T2.5', 'T3.1', 'T3.2'];

// ================================================================== A1: the names column
const NAMES = {
  none: ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'],
  any: ['1.3.2', '2.1.1', '2.1.3', '2.2.1', '2.3.1', '2.5.1', '3.1.2', 'P1', 'P2', 'P4', 'P5', 'P6'],
  all: ['1.4.1', '1.4.2', '1.4.3'],
  home: ['1.3.1', '2.2.2'],
  continuous: ['2.4.1'],
};

test('A1 K1: every problem has a names value from the allowed set, equal to the literal table', () => {
  assert.equal(P.PROBLEMS.length, 29);
  const expected = {};
  for (const [code, ids] of Object.entries(NAMES)) for (const id of ids) expected[id] = code;
  assert.deepEqual(Object.keys(expected).sort(), [...HANDOUT_IDS].sort(), 'the literal table covers the 29 handout ids exactly once');
  assert.deepEqual(Object.values(NAMES).map((a) => a.length), [11, 12, 3, 2, 1]);
  for (const p of P.PROBLEMS) {
    assert.ok(D.NAMES_CODES.includes(p.names), `${p.id} names ${p.names} is in NAMES_CODES`);
    assert.equal(p.names, expected[p.id], `${p.id}`);
  }
});

test('A1 K2: the names column is the last column of the section 3 table of docs/STORY.md', () => {
  const md = read('docs/STORY.md');
  const section = md.split(/^## 3\. /m)[1].split(/^## 4\. /m)[0];
  const rows = section.split('\n').filter((l) => /^\| (?:\d\.\d\.\d|P\d) /.test(l));
  assert.equal(rows.length, 29, 'the table has 29 problem rows');
  const seen = [];
  for (const line of rows) {
    const cells = line.split(/(?<!\\)\|/).map((c) => c.trim());          // an escaped bar (\|z\|) is maths, not a column
    assert.equal(cells.length, 8, `six columns between the outer bars: ${line.slice(0, 40)}`);
    const id = cells[1].split(/\s+/)[0];
    const word = /^[a-z]+/.exec(cells[cells.length - 2]);
    assert.ok(word, `${id}: the last column starts with a word`);
    assert.equal(P.problemById(id).names, word[0], `${id}: problems.js says ${P.problemById(id).names}, STORY says ${word[0]}`);
    seen.push(id);
  }
  assert.deepEqual(seen, HANDOUT_IDS, 'STORY lists the problems in handout order');
});

test('A1 K3: the module keeps its export list; rehearse lists all 29 problems and all 12 topics like problems', () => {
  assert.deepEqual(Object.keys(P).sort(), [
    'ADDRESS_CODES', 'PROBLEMS', 'TOPICS', 'addressLabel', 'addressTones', 'idFromRoute', 'problemById', 'problemsForStation',
    'problemsForTopic', 'routeFor', 'statementParts', 'topicById', 'topicFromRoute', 'topicRoute', 'topicsForStation',
  ].sort());
  assert.deepEqual(P.problemsForStation('rehearse').map((p) => p.id), HANDOUT_IDS);
  assert.deepEqual(P.problemsForStation('problems').map((p) => p.id), HANDOUT_IDS);
  assert.deepEqual(P.topicsForStation('rehearse').map((t) => t.id), TOPIC_IDS);
  assert.notEqual(P.problemsForStation('rehearse'), P.problemsForStation('rehearse'), 'a fresh array every call');
  assert.deepEqual(P.problemsForStation('home'), []);
  assert.deepEqual(P.problemsForStation('roots').map((p) => p.id), ['1.4.1', '1.4.2', '1.4.3']);
  assert.ok(Object.isFrozen(P.PROBLEMS[0]) && Object.isFrozen(P.PROBLEMS[28]));
});

// ================================================================== A2: decisions.js
test('A2 K4: slug, labels, meanings and grade', () => {
  assert.equal(D.slug('C->P->C'), 'c-p-c');
  assert.equal(D.slug('P->C'), 'p-c');
  assert.equal(D.slug('C->P'), 'c-p');
  assert.equal(D.slug('both'), 'both');
  assert.equal(D.slug('any'), 'any');
  assert.equal(D.slug('C'), 'c');
  assert.equal(D.slug(' --a  b-- '), 'a-b');
  assert.equal(D.slug(null), '');
  assert.equal(D.slug(undefined), '');
  assert.deepEqual([...P.ADDRESS_CODES].map(D.slug), ['c', 'p', 'c-p', 'p-c', 'c-p-c', 'both']);
  assert.equal(D.namesLabel('all'), 'names: all');
  assert.equal(D.namesLabel('continuous'), 'names: continuous');
  assert.equal(D.namesLabel('x'), '');
  assert.equal(D.namesLabel(undefined), '');
  assert.ok(D.namesMeaning('all').startsWith('Every name gives a different answer'));
  assert.equal(D.namesMeaning('nope'), '');
  assert.equal(D.namesMeaning('constructor'), '');
  assert.equal(D.addressMeaning('C->P->C'), 'Convert to polar, do the move, convert back.');
  assert.equal(D.addressMeaning('toString'), '');
  assert.deepEqual(D.grade({ address: 'P', names: 'all' }, { address: 'P', names: 'all' }), { address: true, names: true, all: true });
  assert.deepEqual(D.grade({ address: null, names: 'any' }, { address: 'P', names: 'all' }), { address: null, names: false, all: false });
  assert.deepEqual(D.grade({ address: 'C', names: 'all' }, { address: 'P', names: 'all' }), { address: false, names: true, all: false });
  assert.deepEqual(D.grade(undefined, { address: 'P', names: 'all' }), { address: null, names: null, all: false });
  assert.deepEqual(D.grade({ address: 'P' }, null), { address: false, names: null, all: false });
});

test('A2 K5: the constants are frozen, complete and in step with the data', () => {
  assert.deepEqual([...D.NAMES_CODES], ['none', 'any', 'all', 'home', 'continuous']);
  assert.ok(Object.isFrozen(D.NAMES_CODES) && Object.isFrozen(D.NAMES_MEANING) && Object.isFrozen(D.ADDRESS_MEANING));
  assert.deepEqual(Object.keys(D.NAMES_MEANING), [...D.NAMES_CODES]);
  assert.deepEqual(Object.keys(D.ADDRESS_MEANING), [...P.ADDRESS_CODES]);
  for (const text of [...Object.values(D.NAMES_MEANING), ...Object.values(D.ADDRESS_MEANING)]) {
    assert.ok(text.length > 10 && text.endsWith('.'), text);
    assert.ok(!/\s{2}|[\u{1F300}-\u{1FAFF}]/u.test(text), `no double space or emoji: ${text}`);
  }
  assert.equal(D.NAMES_MEANING.home, 'The home step only: Arg z in (−π, π], and principal values.');
  // the kit needs a document for everything that builds DOM, and an idPrefix
  assert.throws(() => D.chips(P.problemById('1.4.2'), {}), TypeError);
  assert.throws(() => D.chips(P.problemById('1.4.2'), { idPrefix: 'a b' }), TypeError);
  assert.throws(() => D.chips(P.problemById('1.4.2'), { idPrefix: 't' }), /needs a document/);
  assert.throws(() => D.picker({}), TypeError);
  assert.throws(() => D.picker({ idPrefix: 'p' }), /needs a document/);
});

// ================================================================== A2: moveglyph.js
test('A2 K6: glyphGeometry', () => {
  const g = G.glyphGeometry({ re: -1, im: S3 });
  near(g.r, 2, 1e-12);
  near(g.theta, (2 * Math.PI) / 3, 1e-12);
  assert.equal(g.unitR, 6);
  near(g.rayEnd.x, 6, 1e-9);
  near(g.rayEnd.y, 12 - 6 * S3, 1e-9);            // 1.607695...; the goal's "1.6077" is this value rounded
  near(g.rayEnd.y, 1.6077, 5e-5);
  assert.deepEqual(g.arc.start, { x: 18, y: 12 });
  near(g.arc.end.x, 9, 1e-9);
  near(g.arc.end.y, 12 - 3 * S3, 1e-9);
  assert.equal(g.arc.sweep, 0);
  assert.equal(g.arc.large, false);
  assert.equal(g.clipped, false);
  assert.deepEqual(G.glyphGeometry(1).rayEnd, { x: 18, y: 12 });
  assert.equal(G.glyphGeometry(1).arc, null);
  assert.equal(G.glyphGeometry(1).theta, 0);
  assert.deepEqual(G.glyphGeometry(0).rayEnd, { x: 12, y: 12 });
  assert.equal(G.glyphGeometry(0).arc, null);
  assert.equal(G.glyphGeometry(0).theta, 0);
  assert.deepEqual(G.glyphGeometry(3).rayEnd, { x: 24, y: 12 });
  assert.equal(G.glyphGeometry(3).clipped, true);
  assert.equal(G.glyphGeometry(2).clipped, false, 'r = scale ends on the box edge and is not clipped');
  assert.equal(G.glyphGeometry({ re: S2, im: S2 }).clipped, false, 'a length of 2 that arrives as 2.0000000000000004 is not clipped either (the roots of -16)');
  assert.equal(G.glyphGeometry(2.001).clipped, true);
  // the negative real axis is Arg pi, a half circle above the axis; the negative imaginary axis turns the other way
  const neg = G.glyphGeometry(-1);
  assert.equal(neg.theta, Math.PI);
  assert.deepEqual(neg.arc.end, { x: 6, y: 12 });
  assert.equal(neg.arc.sweep, 0);
  const down = G.glyphGeometry({ re: 0, im: -2 });
  near(down.theta, -Math.PI / 2, 1e-15);
  assert.equal(down.arc.sweep, 1);
  assert.deepEqual(down.rayEnd, { x: 12, y: 24 });
  assert.deepEqual(down.arc.end, { x: 12, y: 18 });
  // options: another scale and box; bad options fall back to the defaults
  const wide = G.glyphGeometry(2, { scale: 4, box: 48 });
  assert.equal(wide.unitR, 6);
  assert.deepEqual(wide.rayEnd, { x: 36, y: 24 });
  assert.deepEqual(G.glyphGeometry(1, { scale: 0, box: -3 }).rayEnd, { x: 18, y: 12 });
  // not a number: no ray, no arc
  for (const bad of [{ re: NaN, im: 0 }, { re: 1, im: Infinity }, undefined, null, 'x']) {
    const b = G.glyphGeometry(bad);
    assert.ok(Number.isNaN(b.r) && b.arc === null && b.clipped === false && b.theta === 0, String(bad));
    assert.deepEqual(b.rayEnd, { x: 12, y: 12 });
  }
  // a bare number is a real number; a point near the positive axis keeps its sign
  assert.equal(G.glyphGeometry({ re: 1, im: -1e-3 }).arc.sweep, 1);
  assert.equal(G.glyphGeometry({ re: 1, im: 1e-12 }).arc, null, 'a turn below 1e-9 draws no arc');
});

test('A2 K7: glyphText', () => {
  const t = G.glyphText;
  assert.equal(t({ re: -1, im: S3 }), 'move: turn 120°, stretch 2');
  assert.equal(t(0), 'no move: 0');
  assert.equal(t({ re: 0, im: 0 }), 'no move: 0');
  assert.equal(t({ re: 0, im: -2 }), 'move: turn -90°, stretch 2');
  assert.equal(t(1), 'move: turn 0°, stretch 1');
  assert.equal(t(-1), 'move: turn 180°, stretch 1');
  assert.equal(t({ re: 0, im: 1 }), 'move: turn 90°, stretch 1');
  assert.equal(t({ re: 1, im: 1 }), 'move: turn 45°, stretch 1.414');
  assert.equal(t({ re: 1, im: -1 }), 'move: turn -45°, stretch 1.414');
  assert.equal(t({ re: S3, im: 1 }), 'move: turn 30°, stretch 2');
  assert.equal(t({ re: 3, im: 2 }), 'move: turn 33.7°, stretch 3.606');
  assert.equal(t({ re: 2, im: 3 }), 'move: turn 56.3°, stretch 3.606');
  assert.equal(t({ re: 512, im: -512 * S3 }), 'move: turn -60°, stretch 1024');
  assert.equal(t({ re: -S2, im: -S2 }), 'move: turn -135°, stretch 2');
  assert.equal(t({ re: 0.5, im: S3 / 2 }), 'move: turn 60°, stretch 1');
  assert.equal(t({ re: 1e-5, im: 0 }), 'move: turn 0°, stretch 1×10⁻⁵');
  assert.equal(t({ re: 1e20, im: 0 }), 'move: turn 0°, stretch 1×10²⁰');
  assert.equal(t({ re: NaN, im: 0 }), 'no move: undefined');
  assert.equal(t(undefined), 'no move: undefined');
  assert.ok(!/NaN|-0\b/.test(t({ re: 1, im: -1e-15 })), 'never NaN, never a signed zero');
  assert.equal(t({ re: 1, im: -1e-15 }), 'move: turn 0°, stretch 1');
  assert.throws(() => G.moveGlyph(1), /needs a document/);
});

// ================================================================== A3: station-kit.js
test('A3 K8: valuesOf', () => {
  const input = { kind: 'values', values: { z: { re: 1, im: 2 }, n: 4.7, mode: 'mul', junk: 1 } };
  const got = K.valuesOf(input, { z: 'complex', n: 'int', mode: ['add', 'mul'] });
  assert.deepEqual(got, { z: { re: 1, im: 2 }, mode: 'mul' });
  assert.notEqual(got.z, input.values.z, 'a fresh copy');
  assert.equal(K.valuesOf({ kind: 'problem', id: '1.4.2' }, { z: 'complex' }), null);
  assert.equal(K.valuesOf({ kind: 'token', token: 'x' }, { z: 'complex' }), null);
  assert.equal(K.valuesOf(null, {}), null);
  assert.equal(K.valuesOf(undefined, {}), null);
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: NaN, im: 0 } } }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: Infinity, im: 0 } } }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: '1', im: 0 } } }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: 5 } }, { z: 'complex' }), {}, 'a bare number is not a complex value in a request');
  // the other shapes
  const all = { kind: 'values', values: { a: 2.5, b: 3, c: true, d: 'hello', e: 'sub', f: { x: 1 }, g: -0 } };
  assert.deepEqual(K.valuesOf(all, { a: 'real', b: 'int', c: 'bool', d: 'string', e: ['add', 'sub'] }), { a: 2.5, b: 3, c: true, d: 'hello', e: 'sub' });
  assert.deepEqual(K.valuesOf(all, { a: 'int', b: 'real', c: 'string', d: 'bool', e: ['add'], missing: 'real' }), { b: 3 });
  assert.deepEqual(K.valuesOf(all, { f: (v) => (v && Number.isFinite(v.x) ? v.x * 2 : undefined), a: () => { throw new Error('x'); }, d: () => undefined }), { f: 2 });
  const zero = K.valuesOf(all, { g: 'real' });
  assert.ok(Object.is(zero.g, 0), '-0 becomes 0');
  // hostile input
  assert.deepEqual(K.valuesOf({ kind: 'values', values: JSON.parse('{"__proto__": {"re": 1, "im": 2}, "z": {"re": 1, "im": 2}}') }, { __proto__: null, z: 'complex' }), { z: { re: 1, im: 2 } });
  assert.equal(Object.getPrototypeOf(K.valuesOf({ kind: 'values', values: {} }, {})), Object.prototype);
  assert.deepEqual(K.valuesOf({ kind: 'values', values: [1, 2] }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values' }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: 1, im: 1 } } }, null), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { c: { re: -81, im: 0 }, n: 4 } }, { c: 'complex', n: 'int' }), { c: { re: -81, im: 0 }, n: 4 });
});

const idsOf = (n) => ({
  prev: n.prev && n.prev.id,
  next: n.next && n.next.id,
  threads: n.threads.map((t) => ({ thread: t.thread, prev: t.prev && t.prev.id, next: t.next && t.next.id })),
});

test('A3 K9: neighbours', () => {
  assert.deepEqual(idsOf(K.neighbours({ stations: STATIONS, station: stationById('roots') })), {
    prev: 'powers', next: 'curves',
    threads: [{ thread: 'T2', prev: 'powers', next: 'powermap' }, { thread: 'T1', prev: 'powers', next: 'sets' }],
  });
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('graph4d') }).next.id, 'rehearse');
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('problems') }).prev.id, 'rehearse');
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('problems') }).next, null);
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('home') }).prev, null);
  assert.deepEqual(idsOf(K.neighbours({ stations: STATIONS, station: stationById('powermap') })), {
    prev: 'linear', next: 'principal-root',
    threads: [{ thread: 'T1', prev: 'linear', next: 'reciprocal' }, { thread: 'T2', prev: 'roots', next: 'principal-root' }, { thread: 'T3', prev: 'linear', next: 'reciprocal' }],
  });
  assert.deepEqual(idsOf(K.neighbours({ stations: STATIONS, station: stationById('arithmetic') })).threads, [], 'a thread that adds no stop is left out');
  // the entries hold the stations themselves; the input is not reordered or changed
  const shuffled = STATIONS.slice().reverse();
  assert.deepEqual(idsOf(K.neighbours({ stations: shuffled, station: stationById('roots') })).prev, 'powers');
  assert.equal(shuffled[0].id, 'problems');
  // unknown or missing input
  for (const ctx of [null, {}, { stations: STATIONS }, { stations: STATIONS, station: { id: 'zz', threads: ['T1'] } }, { stations: 'x', station: stationById('roots') }]) {
    assert.deepEqual(K.neighbours(ctx), { prev: null, next: null, threads: [] });
  }
  // every station: prev and next are the order neighbours, and every thread entry is a member of the thread
  for (const st of STATIONS) {
    const n = K.neighbours({ stations: STATIONS, station: st });
    assert.equal(n.prev ? n.prev.order : st.order - 1, st.order - 1, st.id);
    assert.equal(n.next ? n.next.order : st.order + 1, st.order + 1, st.id);
    for (const t of n.threads) {
      assert.ok(st.threads.includes(t.thread));
      for (const s of [t.prev, t.next].filter(Boolean)) assert.ok(s.threads.includes(t.thread), `${st.id} ${t.thread} ${s.id}`);
      assert.ok((t.prev && t.prev !== n.prev && t.prev !== n.next) || (t.next && t.next !== n.prev && t.next !== n.next), `${st.id} ${t.thread} offers a new stop`);
    }
  }
});

test('A3 K10: freshNote', () => {
  const p = P.problemById('1.4.2');
  const preset = { kind: 'values', station: 'roots', problem: '1.4.2', family: '1.4.2', values: {} };
  assert.equal(K.freshNote(p, preset), `Fresh numbers from the Rehearsal Room. The handout's own answer: ${p.answer.text}`);
  assert.ok(K.freshNote(p, preset).startsWith('Fresh numbers from the Rehearsal Room. '));
  assert.equal(K.freshNote(p, { ...preset, problem: '1.4.1' }), '');
  assert.equal(K.freshNote(p, { ...preset, problem: null }), '');
  assert.equal(K.freshNote(p, { kind: 'problem', id: '1.4.2' }), '');
  assert.equal(K.freshNote(p, null), '');
  assert.equal(K.freshNote(null, preset), '');
  assert.throws(() => K.titleSpan('z^n: Fans'), /needs a document/);
});

// ================================================================== A5, A7: static rules
const CODE_FILES = ['js/core/decisions.js', 'js/core/moveglyph.js', 'js/core/station-kit.js'];

test('A7 K11: the kit modules import only what the rules allow and use tokens only in their CSS', () => {
  const importsOf = (f) => [...read(f).matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]).sort();
  assert.deepEqual(importsOf('js/core/decisions.js'), ['../data/problems.js']);
  assert.deepEqual(importsOf('js/core/moveglyph.js'), []);
  assert.ok(!/^\s*import\b/m.test(read('js/core/moveglyph.js')), 'moveglyph.js has no import statement at all');
  assert.ok(!/\bimport\s*\(/.test(read('js/core/moveglyph.js')), 'and no dynamic import');
  for (const imp of importsOf('js/core/station-kit.js')) assert.ok(['./katex.js', './decisions.js', './moveglyph.js', '../data/problems.js', '../registry.js'].includes(imp), imp);
  for (const f of CODE_FILES) {
    const src = read(f);
    const css = /const STYLE = `((?:[^`\\]|\\.)*)`/s.exec(src);
    assert.ok(css, `${f} has its CSS in one template literal named STYLE`);
    assert.ok(!/\$\{/.test(css[1]), `${f}: the CSS has no interpolation`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/.test(css[1]), `${f}: a literal colour in the CSS`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${f}: no hex colour anywhere in the file (a comment included)`);
    for (const m of css[1].matchAll(/(?:^|[;{\s])(?:color|background|border(?:-[a-z]+)*|fill|stroke|outline(?:-color)?|box-shadow)\s*:\s*([^;}]+)/g)) {
      const value = m[1].replace(/var\([^)]*\)/g, '').replace(/color-mix\([^)]*\)/g, '');
      assert.ok(!/\b(red|blue|green|black|white|orange|purple|grey|gray)\b/.test(value), `${f}: a colour word in "${m[0].trim()}"`);
    }
    assert.ok(/data-for="(decisions|moveglyph|station-kit)"/.test(src), `${f} injects its <style data-for>`);
    // nothing touches the DOM, the window or the storage when the module is imported
    const code = src.replace(css[0], 'const STYLE = ``');
    const top = code.split('\n').filter((l) => /^[A-Za-z]/.test(l) && !/^(import|export|const|let|var|function|async|class|\/\/)/.test(l));
    assert.deepEqual(top, [], `${f}: top-level statements other than declarations: ${top.join(' | ')}`);
    for (const line of code.split('\n').filter((l) => /^(const|let|var) /.test(l))) {
      const expr = line.replace(/^(?:const|let|var) [^=]+=\s*/, '');
      if (/^(?:async\b|function\b|\(|[A-Za-z_$][\w$]*\s*=>)/.test(expr)) continue;           // a function: its body runs later, not at import
      assert.ok(!/\b(document|window|localStorage|sessionStorage|navigator|matchMedia|globalThis)\b/.test(expr.replace(/'[^']*'|`[^`]*`/g, "''")), `${f}: top-level access in "${line.slice(0, 60)}"`);
    }
    assert.ok(!/\b(addEventListener)\(\s*'(resize|scroll|keydown|keyup|pointer[a-z]*)'/.test(src.replace(/host\.addEventListener|el\.addEventListener|btn\.addEventListener|els\.answer\.addEventListener/g, '')), `${f}: no window or document listeners`);
    assert.ok(!/\b(window|document)\.addEventListener/.test(src), `${f}: no window or document listeners`);
  }
});

test('A7 K12: app.js reads station.request through the store and removes it in the same synchronous function', () => {
  const src = read('js/app.js');
  assert.equal(src.split("'station.request'").length - 1, 1, 'the key is written once, as a constant');
  const start = src.indexOf('function takeStationRequest');
  assert.ok(start > 0, 'takeStationRequest exists');
  let depth = 0, end = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { end = i; break; }
  }
  const body = src.slice(start, end + 1);
  assert.ok(/store\.get\(REQUEST_KEY/.test(body) && /store\.remove\(REQUEST_KEY\)/.test(body), 'get and remove in one function');
  assert.ok(!/\bawait\b/.test(body), 'no await between the get and the remove');
  assert.ok(/takeStationRequest\(st\.id\) \|\| route\.preset/.test(src), 'a request wins over a hash preset');
  assert.ok(/preset: \(\) => state\.preset/.test(src) && /request: \(req\) =>/.test(src), 'window.__mv.app.request and .preset exist');
  assert.deepEqual(Object.keys(app()).sort(), ['PART_TITLES', 'SITE_TITLE', 'documentTitle', 'groupStations', 'parseRoute', 'start']);
  function app() { return appModule; }
});
const appModule = await import('../../js/app.js');

test('A5 K13: the nine iteration-2 rows of interact-all are the block in ARCHITECTURE section 8', () => {
  const doc = read('docs/ARCHITECTURE.md').split(/^## 8\. /m)[1].split(/^## 9\. /m)[0];
  const block = /```\n((?:'i2-[^\n]+\n)+)```/.exec(doc);
  assert.ok(block, 'the block is in section 8');
  const rows = (text) => Object.fromEntries([...text.matchAll(/'(i2-[a-z0-9-]+)':\s*\[([^\]]*)\]/g)].map((m) => [m[1], m[2].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)]));
  const wanted = rows(block[1]);
  const have = rows(read('tools/interact-all.mjs'));
  assert.equal(Object.keys(wanted).length, 9);
  assert.deepEqual(have, wanted);
});

// ================================================================== the numbers behind the Names decision (6: Mathematics)
test('K14: each Names code is a statement about numbers, and these are the numbers', () => {
  // any: nθ on any step gives the same point (1.3.2)
  const z = { re: S3, im: 1 };
  const direct = X.pow(z, 10);
  near(direct.re, 512, 1e-9); near(direct.im, -512 * S3, 1e-9);
  for (let k = -3; k <= 3; k++) {
    const w = X.fromPolar(1024, 10 * (Math.PI / 6 + 2 * Math.PI * k));
    near(w.re, direct.re, 1e-6, `k = ${k}`); near(w.im, direct.im, 1e-6, `k = ${k}`);
  }
  near(X.Arg(direct), -Math.PI / 3, 1e-12);
  near(10 * (Math.PI / 6), (5 * Math.PI) / 3, 1e-12);
  // all: the n steps give n different points and step n is step 0 again (1.4.2)
  const roots = X.rootsOf(-16, 4);
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(X.abs(X.sub(roots[a], roots[b])) > 1.9, `${a} ${b}`);
  const step4 = X.fromPolar(2, (Math.PI + 2 * Math.PI * 4) / 4);
  near(step4.re, roots[0].re, 1e-9); near(step4.im, roots[0].im, 1e-9);
  for (const r of roots) { const r4 = X.pow(r, 4); near(r4.re, -16, 1e-9); near(r4.im, 0, 1e-9); }
  // home: the principal square root of 2i uses Arg = pi/2 only (2.2.2); the name pi/2 + 2pi gives the other root
  const pr = X.principalRoot({ re: 0, im: 2 }, 2);
  near(pr.re, 1, 1e-12); near(pr.im, 1, 1e-12);
  const other = X.fromPolar(S2, (Math.PI / 2 + 2 * Math.PI) / 2);
  near(other.re, -1, 1e-12); near(other.im, -1, 1e-12);
  // continuous: seam 0 is continuous across the negative real axis, the principal choice jumps (2.4.1)
  const above = { re: -1, im: 1e-9 }, below = { re: -1, im: -1e-9 };
  assert.ok(X.abs(X.sub(X.branchRoot(above, 3, 0), X.branchRoot(below, 3, 0))) < 1e-8);
  near(X.abs(X.sub(X.branchRoot(above, 3, -Math.PI), X.branchRoot(below, 3, -Math.PI))), S3, 1e-6);
  const atMinusOne = X.branchRoot(-1, 3, 0);
  near(atMinusOne.re, 0.5, 1e-12); near(atMinusOne.im, S3 / 2, 1e-12);
});
````

### Appendix G. `tests/interact/i2-decisions-kit.mjs` (new)

```js
// tests/interact/i2-decisions-kit.mjs: the shared station pieces of iteration 2, built and driven on a page that is not their station.
//   node tools/smoke.mjs --route home,nosuchplace --script tests/interact/i2-decisions-kit.mjs --dark
// Steps: (a) decision chips, (b) decision picker, (c) move glyph, (d) header, problem card and links, (e) the router turns a
// station.request into a values preset once, (f) the card's statement is the index's statement, (g) the pieces fit a phone,
// (h) the tokens carry both themes. Everything is appended to a host in #view and removed at the end.

import { settle } from './_helpers.mjs';

const MEANING_ALL = 'Every name gives a different answer: roots take all n steps.';
const STATUS_ANY = 'Address: right. Names: wrong. It is "any". Any name of the angle works: powers, products, directions, cos and sin.';

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 600;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ev = (fn, arg) => page.evaluate(fn, arg);

  await ev(() => {
    const host = document.createElement('div');
    host.id = 'kit-host';
    host.style.cssText = 'display:grid;gap:16px;padding:8px 0';
    document.getElementById('view').append(host);
  });

  // ---------------------------------------------------------------- (a) decision chips
  await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const P = await import('./js/data/problems.js');
    const row = document.createElement('div');
    row.id = 'kit-chips';
    row.append(D.chips(P.problemById('1.4.2'), { idPrefix: 't' }));
    document.getElementById('kit-host').append(row);
  });
  const read = (sel) => ev((s) => { const e = document.querySelector(s); return e ? { text: e.textContent, hidden: e.hidden, expanded: e.getAttribute('aria-expanded'), value: e.dataset.value, tag: e.tagName, tone: e.dataset.tone, controls: e.getAttribute('aria-controls'), title: e.getAttribute('title') } : null; }, sel);
  let c = await read('[id="t-address"]');
  assert(c.text === 'Polar, then Cartesian' && c.value === 'P->C' && c.tag === 'BUTTON' && c.expanded === 'false' && c.controls === 't-meaning', `address chip: ${JSON.stringify(c)}`);
  assert(c.tone === undefined, 'a two-address chip has no single tone (its dots show the order)');
  c = await read('[id="t-names"]');
  assert(c.text === 'names: all' && c.value === 'all' && c.expanded === 'false', `names chip: ${JSON.stringify(c)}`);
  assert(c.title === MEANING_ALL, `the hover text is the meaning: ${c.title}`);
  assert((await read('[id="t-meaning"]')).hidden === true, 'the meaning starts hidden');
  assert(await ev(() => document.querySelector('[id="t-meaning"]').getAttribute('role') === 'status' && document.querySelector('.decisions').dataset.problem === '1.4.2'), 'meaning is a status region; the host names the problem');
  await page.click('[id="t-names"]');
  let m = await read('[id="t-meaning"]');
  assert(m.hidden === false && m.text.includes('Every name gives a different answer'), `tap shows the meaning: ${JSON.stringify(m)}`);
  assert((await read('[id="t-names"]')).expanded === 'true' && (await read('[id="t-address"]')).expanded === 'false', 'aria-expanded follows the tap');
  if (process.env.KIT_SHOTS) await page.locator('#kit-chips').screenshot({ path: `${process.env.KIT_SHOTS}/${ctx.route}-${ctx.label}-chips-open.png` });
  await page.click('[id="t-address"]');
  m = await read('[id="t-meaning"]');
  assert(m.hidden === false && m.text === 'Work in polar, then write the answer as x + iy.', `the other chip switches the meaning: ${m.text}`);
  assert((await read('[id="t-names"]')).expanded === 'false' && (await read('[id="t-address"]')).expanded === 'true', 'one chip open at a time');
  await page.click('[id="t-address"]');
  assert((await read('[id="t-meaning"]')).hidden === true && (await read('[id="t-address"]')).expanded === 'false', 'a second tap hides it');
  await page.focus('[id="t-names"]');
  await page.keyboard.press('Enter');
  assert((await read('[id="t-meaning"]')).hidden === false, 'Enter on a focused chip opens it');
  await page.keyboard.press('Escape');
  assert((await read('[id="t-meaning"]')).hidden === true && (await ev(() => document.activeElement.id)) === 't-names', 'Escape hides it and keeps focus on the chip');
  // every problem, both chips from its own data; the read-only variant has no buttons and no meaning span
  const all = await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const P = await import('./js/data/problems.js');
    const out = [];
    for (const p of P.PROBLEMS) {
      const el = D.chips(p, { idPrefix: 'x', meaning: false });
      const a = el.querySelector('[data-decision="address"]'), n = el.querySelector('[data-decision="names"]');
      out.push([p.id, a.textContent === P.addressLabel(p.address), n.textContent === D.namesLabel(p.names), a.tagName, el.querySelector('.decision-meaning') === null, n.getAttribute('aria-expanded')]);
    }
    return out;
  });
  assert(all.length === 29 && all.every((r) => r[2] && r[1] && r[3] === 'SPAN' && r[4] && r[5] === null), `29 problems, 2 chips each: ${JSON.stringify(all.filter((r) => !(r[1] && r[2])))}`);
  assert((await ev(() => { try { return 'no throw: ' + document.querySelectorAll('[id="t-names"]').length; } catch (e) { return String(e); } })) === 'no throw: 1', 'ids are unique');
  const bad = await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const e1 = D.chips({ id: 'q', address: 'zz', names: 'qq' }, { idPrefix: 'bad' });
    const e2 = D.chips(null, { idPrefix: 'bad2' });
    let thrown = null;
    try { D.chips({}, {}); } catch (e) { thrown = e.constructor.name; }
    return [e1.children.length, e2.children.length, thrown];
  });
  assert(same(bad, [1, 1, 'TypeError']), `bad data gives no chips, only the (hidden) meaning span; no idPrefix throws TypeError: ${JSON.stringify(bad)}`);
  log('(a) chips: labels, tap, switch, second tap, Enter, Escape, 29 problems, bad data');

  // ---------------------------------------------------------------- (b) decision picker
  await ev(async () => {
    const D = await import('./js/core/decisions.js');
    window.__picks = [];
    window.__picker = D.picker({ idPrefix: 'p', onPick: (d, v) => window.__picks.push([d, v]) });
    document.getElementById('kit-host').append(window.__picker.el);
  });
  const ids = await ev(() => [...document.querySelectorAll('[id^="p-"]')].map((e) => e.id));
  for (const id of ['p-address-row', 'p-names-row', 'p-status', 'p-address-c', 'p-address-p', 'p-address-c-p', 'p-address-p-c', 'p-address-c-p-c', 'p-address-both',
    'p-names-none', 'p-names-any', 'p-names-all', 'p-names-home', 'p-names-continuous']) assert(ids.includes(id), `picker id ${id}`);
  assert(await ev(() => document.getElementById('p').tagName === 'FIELDSET' && document.getElementById('p').className.includes('decisions-picker')), 'the picker is a fieldset');
  assert(await ev(() => [...document.querySelectorAll('.dp-opt')].every((b) => b.getAttribute('aria-pressed') === 'false' && b.type === 'button')), 'nothing is pressed at the start');
  await page.click('[id="p-address-p"]');
  await page.click('[id="p-names-all"]');
  assert(same(await ev(() => window.__picker.get()), { address: 'P', names: 'all' }), 'get() after two taps');
  assert(same(await ev(() => window.__picks), [['address', 'P'], ['names', 'all']]), 'onPick reports each tap');
  assert(await ev(() => document.getElementById('p-address-p').getAttribute('aria-pressed') === 'true' && document.getElementById('p-address-c').getAttribute('aria-pressed') === 'false'), 'one pressed per row');
  await ev(() => window.__picker.mark({ address: true, names: false, expected: { address: 'P', names: 'any' } }));
  const mk = await ev(() => ({
    nr: document.getElementById('p-names-row').dataset.mark, ni: document.getElementById('p-names-row').getAttribute('aria-invalid'),
    ar: document.getElementById('p-address-row').dataset.mark, ai: document.getElementById('p-address-row').getAttribute('aria-invalid'),
    status: document.getElementById('p-status').textContent, expected: document.getElementById('p-names-any').dataset.expected, none: document.getElementById('p-names-none').dataset.expected,
  }));
  assert(mk.nr === 'wrong' && mk.ni === 'true' && mk.ar === 'right' && mk.ai === null, `marks: ${JSON.stringify(mk)}`);
  assert(mk.status.includes('Names: wrong') && mk.status === STATUS_ANY, `status: ${mk.status}`);
  assert(mk.expected === 'true' && mk.none === undefined, 'the expected chip of a wrong row is outlined');
  await ev(() => window.__picker.mark({ address: true, names: true, expected: { address: 'P', names: 'all' } }));
  assert((await read('[id="p-status"]')).text === 'Address: right. Names: right.', 'both right');
  await ev(() => window.__picker.mark({ address: false, names: null, expected: { address: 'P->C', names: 'all' } }));
  assert((await read('[id="p-status"]')).text === 'Address: wrong. It is "Polar, then Cartesian". Work in polar, then write the answer as x + iy.', 'a wrong address names the right one');
  await ev(() => window.__picker.mark({ address: null, names: null }));
  assert((await read('[id="p-status"]')).text === '' && await ev(() => !document.getElementById('p-names-row').hasAttribute('data-mark')), 'null clears the marks and the sentence');
  await ev(() => window.__picker.disable(true));
  const dis = await ev(() => { document.getElementById('p-names-home').click(); return { got: window.__picker.get(), off: [...document.querySelectorAll('.dp-opt')].every((b) => b.disabled) }; });
  assert(dis.off && same(dis.got, { address: 'P', names: 'all' }), `disabled picker ignores taps: ${JSON.stringify(dis)}`);
  await ev(() => window.__picker.disable(false));
  await page.click('[id="p-names-all"]');
  assert(same(await ev(() => window.__picker.get()), { address: 'P', names: null }), 'a second tap on the pressed chip clears it');
  assert(same((await ev(() => window.__picks)).slice(-1)[0], ['names', null]), 'and tells onPick null');
  await page.focus('[id="p-address-c"]');
  await page.keyboard.press('ArrowRight');
  assert((await ev(() => document.activeElement.id)) === 'p-address-p', 'ArrowRight moves focus along the row');
  await page.keyboard.press('End');
  assert((await ev(() => document.activeElement.id)) === 'p-address-both', 'End goes to the last chip');
  await page.keyboard.press('Space');
  assert((await ev(() => window.__picker.get().address)) === 'both', 'Space presses it');
  await ev(() => window.__picker.set({ names: 'home', address: 'nonsense' }));
  assert(same(await ev(() => window.__picker.get()), { address: 'both', names: 'home' }), 'set() takes valid codes only');
  await ev(() => window.__picker.reset());
  assert(same(await ev(() => window.__picker.get()), { address: null, names: null }) && await ev(() => [...document.querySelectorAll('.dp-opt')].every((b) => b.getAttribute('aria-pressed') === 'false')), 'reset() clears');
  await ev(() => window.__picker.destroy());
  assert((await ev(() => document.getElementById('p'))) === null, 'destroy() removes the fieldset');
  await ev(() => window.__picker.destroy());
  log('(b) picker: ids, taps, marks, status sentences, disable, deselect, keyboard, set, reset, destroy');

  // ---------------------------------------------------------------- (c) move glyph
  await ev(async () => {
    const G = await import('./js/core/moveglyph.js');
    const line = document.createElement('p');
    line.id = 'kit-glyph-line';
    line.style.fontSize = '20px';
    line.append('z = -1 + 1.732i ', G.moveGlyph({ re: -1, im: Math.sqrt(3) }, { id: 'kit-glyph' }));
    document.getElementById('kit-host').append(line);
  });
  const gl = () => ev(() => {
    const s = document.getElementById('kit-glyph');
    return { label: s.getAttribute('aria-label'), arcs: s.querySelectorAll('path.glyph-arc').length, rays: s.querySelectorAll('line.glyph-ray').length, units: s.querySelectorAll('circle.glyph-unit').length,
      r: s.dataset.r, theta: s.dataset.theta, clipped: s.dataset.clipped, title: s.querySelector('title').textContent, w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height,
      role: s.getAttribute('role'), vb: s.getAttribute('viewBox'), size: s.getAttribute('width'), d: (s.querySelector('path.glyph-arc') || { getAttribute: () => null }).getAttribute('d'),
      x2: s.querySelector('line.glyph-ray').getAttribute('x2'), y2: s.querySelector('line.glyph-ray').getAttribute('y2'), cls: s.getAttribute('class'), tag: s.tagName };
  });
  let g = await gl();
  assert(g.tag === 'svg' && g.cls === 'move-glyph' && g.label === 'move: turn 120°, stretch 2' && g.title === g.label && g.role === 'img', `glyph label: ${JSON.stringify(g)}`);
  assert(g.arcs === 1 && g.rays === 1 && g.units === 1 && g.r === '2' && g.theta === '2.094' && g.clipped === 'false' && g.vb === '0 0 24 24' && g.size === '1.1em', `glyph parts: ${JSON.stringify(g)}`);
  assert(g.d === 'M 18 12 A 6 6 0 0 0 9 6.804' && g.x2 === '6' && g.y2 === '1.608', `glyph path ${g.d} ray ${g.x2},${g.y2}`);
  assert(Math.abs(g.w - 22) < 0.6 && Math.abs(g.h - 22) < 0.6, `1.1em at 20px is 22px: ${g.w} x ${g.h}`);
  await ev(async () => (await import('./js/core/moveglyph.js')).updateGlyph(document.getElementById('kit-glyph'), 0));
  g = await gl();
  assert(g.label === 'no move: 0' && g.arcs === 0 && g.rays === 1 && g.r === '0' && g.x2 === '12' && g.y2 === '12', `origin: ${JSON.stringify(g)}`);
  await ev(async () => (await import('./js/core/moveglyph.js')).updateGlyph(document.getElementById('kit-glyph'), { re: 0, im: -2 }));
  g = await gl();
  assert(g.label === 'move: turn -90°, stretch 2' && g.arcs === 1 && g.d === 'M 18 12 A 6 6 0 0 1 12 18' && g.y2 === '24', `down: ${JSON.stringify(g)}`);
  await ev(async () => (await import('./js/core/moveglyph.js')).updateGlyph(document.getElementById('kit-glyph'), { re: 512, im: -886.81 }));
  g = await gl();
  assert(g.clipped === 'true' && g.label === 'move: turn -60°, stretch 1024', `clipped: ${JSON.stringify(g)}`);
  const kept = await ev(async () => {
    const G = await import('./js/core/moveglyph.js');
    const s = document.getElementById('kit-glyph');
    const same1 = G.updateGlyph(s, { re: 3, im: 2 }) === s;
    const arc1 = s.querySelector('path.glyph-arc');
    G.updateGlyph(s, { re: 3, im: 2 });
    return [same1, s.querySelector('path.glyph-arc') === arc1, s.querySelectorAll('path.glyph-arc').length, document.querySelectorAll('svg.move-glyph').length];
  });
  assert(same(kept, [true, true, 1, 1]), `updateGlyph redraws the same element in place and never stacks arcs: ${JSON.stringify(kept)}`);
  const gcol = await ev(() => { const s = document.getElementById('kit-glyph'); const p = document.createElement('i'); p.style.color = 'var(--polar)'; document.body.append(p); const want = getComputedStyle(p).color; p.remove(); return [getComputedStyle(s.querySelector('.glyph-ray')).stroke, want]; });
  assert(gcol[0] === gcol[1], `the ray is drawn in --polar: ${JSON.stringify(gcol)}`);
  assert((await ev(async () => { try { (await import('./js/core/moveglyph.js')).updateGlyph(document.body, 1); return 'no'; } catch (e) { return e.constructor.name; } })) === 'TypeError', 'updateGlyph on a foreign element is a TypeError');
  log('(c) glyph: parts, label, path, 1.1em, origin, down, clipped, in place, colour');

  // ---------------------------------------------------------------- (d) header, problem card, links
  const d = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const R = await import('./js/registry.js');
    const P = await import('./js/data/problems.js');
    const { createStore } = await import('./js/core/store.js');
    const store = createStore('kit-test:', { storage: null });
    window.__nav = [];
    const kctx = { station: R.stationById('roots'), stations: R.STATIONS, threads: R.THREADS, store, navigate: (t) => window.__nav.push(t), theme: {} };
    window.__kctx = kctx;
    const host = document.getElementById('kit-host');
    const hd = S.header(kctx, { lede: 'x', active: '1.4.2' });
    const card = S.problemCard(kctx, P.problemById('1.4.2'), { id: 't-problem' });
    const nav = S.links(kctx);
    const wrap = document.createElement('div');
    wrap.id = 'kit-station';
    wrap.append(hd, card.el, nav);
    host.append(wrap);
    window.__card = card;
    return { ok: true };
  });
  assert(d.ok, 'built');
  const hd = await ev(() => {
    const h = document.querySelector('#kit-station .station-header');
    const chips = [...h.querySelectorAll('a.problem-chip')];
    return { h1: h.querySelector('h1').textContent, h1count: h.querySelectorAll('h1').length, lede: h.querySelector('p.station-lede').textContent, ids: chips.map((a) => a.id), hrefs: chips.map((a) => a.getAttribute('href')),
      current: chips.map((a) => a.getAttribute('aria-current')), badges: [...h.querySelectorAll('ul.thread-badges > li > span.thread-badge')].map((b) => [b.dataset.thread, b.textContent]),
      group: h.querySelector('.chips').getAttribute('aria-label'), texts: chips.map((a) => a.textContent), tipOk: chips.every((a) => a.title.length > 10 && !/\^[{(]/.test(a.title)) };
  });
  assert(hd.h1 === 'Roots: Divide the Staircase' && hd.h1count === 1 && hd.lede === 'x', `header: ${JSON.stringify(hd)}`);
  assert(same(hd.ids, ['roots-problem-chip-1-4-1', 'roots-problem-chip-1-4-2', 'roots-problem-chip-1-4-3']) && same(hd.hrefs, ['#problem-1-4-1', '#problem-1-4-2', '#problem-1-4-3']) && same(hd.current, [null, 'true', null]), `problem chips: ${JSON.stringify(hd)}`);
  assert(same(hd.badges, [['T2', 'T2 · The staircase'], ['T1', 'T1 · One point, two addresses']]) && hd.group === 'Problems on this page' && same(hd.texts, ['1.4.1', '1.4.2', '1.4.3']) && hd.tipOk, `badges and chips: ${JSON.stringify(hd)}`);
  const cd = await ev(() => {
    const q = (id) => document.getElementById(id);
    const card = q('t-problem');
    return { tag: card.tagName, cls: card.className, problem: card.dataset.problem, tone: card.dataset.tone, title: q('t-problem-title').textContent, statement: q('t-problem-statement').textContent, hasKatex: !!q('t-problem-statement').querySelector('.katex'),
      chips: q('t-problem-decisions').querySelectorAll('.decision-chip').length, toggle: q('t-problem-answer-toggle').textContent, text: q('t-problem-answer-text').textContent, answerOpen: q('t-problem-answer').open, tag2: q('t-problem-answer').tagName,
      note: q('t-problem-note').textContent, slot: q('t-problem-slot').children.length, why: q('t-problem-why').textContent, labelled: card.getAttribute('aria-labelledby'), aha: q('t-problem-aha').textContent,
      tex: q('t-problem-answer-tex').className, texAttrs: [q('t-problem-answer-tex').getAttribute('tabindex'), q('t-problem-answer-tex').getAttribute('role')], hint: q('t-problem-answer-hint').textContent, ans: window.__card.els.answerText === q('t-problem-answer-text') };
  });
  const P142 = await ev(async () => (await import('./js/data/problems.js')).problemById('1.4.2').answer.text);
  assert(cd.tag === 'ASIDE' && cd.cls === 'callout problem-card' && cd.problem === '1.4.2' && cd.tone === 'accent' && cd.title === 'Problem 1.4.2' && cd.labelled === 't-problem-title', `card frame: ${JSON.stringify(cd)}`);
  assert(cd.statement.includes('roots of') && cd.hasKatex && cd.chips === 2 && cd.toggle === 'Show the answer' && cd.text === P142 && cd.answerOpen === false && cd.tag2 === 'DETAILS', `card parts: ${JSON.stringify(cd)}`);
  assert(cd.note === '' && cd.slot === 0 && cd.why.startsWith('Why this address. Find the roots in polar') && cd.aha.startsWith('The aha. ') && cd.hint === 'Scroll sideways to see the rest.' && cd.ans, `card text: ${JSON.stringify(cd)}`);
  assert(cd.tex.includes('tex-scroll') && same(cd.texAttrs, ['0', 'group']), `the answer scroller is focusable and named: ${JSON.stringify(cd)}`);
  await page.click('[id="t-problem-answer-toggle"]');
  const open = await ev(() => ({ open: document.getElementById('t-problem-answer').open, toggle: document.getElementById('t-problem-answer-toggle').textContent, katex: !!document.getElementById('t-problem-answer-tex').querySelector('.katex') }));
  assert(open.open && open.toggle === 'Show the answer' && open.katex, `the answer opens: ${JSON.stringify(open)}`);
  // chips inside the card work and use the card id as their prefix
  await page.click('[id="t-problem-names"]');
  assert((await read('[id="t-problem-meaning"]')).text === MEANING_ALL, 'the card chips explain themselves');
  // the neutral state, a fresh-numbers note, and the programmatic API
  const st = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const P = await import('./js/data/problems.js');
    const card = window.__card;
    const out = {};
    card.setProblem(null);
    out.neutral = [card.el.textContent.startsWith('Your own numbers.'), card.els.note.textContent, card.el.dataset.problem === undefined, card.el.dataset.empty, card.els.title.hidden, card.els.answer.hidden, card.els.decisions.children.length];
    card.setProblem(P.problemById('P3'), { note: S.freshNote(P.problemById('P3'), { kind: 'values', problem: 'P3', family: 'P3', values: {} }) });
    out.p3 = [card.el.dataset.problem, card.el.dataset.tone, card.els.title.textContent, card.els.note.textContent.startsWith('Fresh numbers from the Rehearsal Room. '), card.el.dataset.empty === undefined, card.els.answer.hidden, card.els.answerText.textContent === P.problemById('P3').answer.text,
      card.els.decisions.querySelector('#t-problem-address').dataset.value, card.els.decisions.querySelector('#t-problem-names').dataset.value];
    card.setNote('hello');
    out.note = card.els.note.textContent;
    card.setAnswerOpen(true);
    out.open = [card.els.answer.open, !!card.els.answerTex.querySelector('.katex'), card.els.answer.firstElementChild.textContent];
    card.setAnswerOpen(false);
    out.closed = card.els.answer.open;
    card.setProblem(P.problemById('1.4.2'));
    out.back = [card.el.dataset.problem, card.els.note.textContent, card.el.dataset.tone, card.els.statement.textContent.includes('roots of')];
    return out;
  });
  assert(same(st.neutral, [true, 'Your own numbers.', true, 'true', true, true, 0]), `neutral card: ${JSON.stringify(st.neutral)}`);
  assert(same(st.p3, ['P3', 'cart', 'Problem P3', true, true, false, true, 'C', 'none']), `P3 card: ${JSON.stringify(st.p3)}`);
  assert(st.note === 'hello' && same(st.open, [true, true, 'Show the answer']) && st.closed === false && same(st.back, ['1.4.2', '', 'accent', true]), `card API: ${JSON.stringify(st)}`);
  // options: open answer, no answer, why: false, routes, tone, title, aliases
  const op = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const P = await import('./js/data/problems.js');
    const k = window.__kctx;
    const a = S.problemCard(k, P.problemById('1.3.1'), { id: 'o1', answer: 'open', routes: true, tone: 'polar', title: 'On the test: 1.3.1' });
    const b = S.problemCard(k, P.problemById('1.3.1'), { id: 'o2', answer: 'none', why: false });
    const c = S.problemCard(k, P.problemById('2.1.3'), { id: 'o3', aliases: { answer: 'o3-old-box', card: 'o3-old-card' } });
    document.getElementById('kit-host').append(a.el, b.el, c.el);
    const q = (id) => document.getElementById(id);
    window.__opt = [a, b, c];
    return {
      a: [q('o1-answer').tagName, q('o1-answer-toggle'), q('o1-route-cart').textContent.startsWith('In Cartesian (slide)'), q('o1-route-polar').textContent.startsWith('In polar (spin and stretch)'), a.el.dataset.tone, q('o1-title').textContent, q('o1-answer').contains(q('o1-route-cart'))],
      b: [q('o2-answer'), q('o2-answer-text'), q('o2-why'), b.els.answer, b.els.why, q('o2-statement') !== null],
      c: [q('o3-old-box').className.includes('tex-scroll'), q('o3-old-box').getAttribute('tabindex'), q('o3-old-box').nextElementSibling.textContent, q('o3-answer-tex').contains(q('o3-old-box')), q('o3-old-card').contains(q('o3')), c.el === q('o3-old-card'), c.els.answerTex === q('o3-old-box'),
        document.querySelector('[id="o3-answer"] .tex-scroll').id],
    };
  });
  assert(op.a[0] === 'DIV' && op.a[1] === null && op.a[2] && op.a[3] && op.a[4] === 'polar' && op.a[5] === 'On the test: 1.3.1' && op.a[6], `open answer card: ${JSON.stringify(op.a)}`);
  assert(op.b.slice(0, 5).every((x) => x === null) && op.b[5], `answer none and why false leave no answer or why element: ${JSON.stringify(op.b)}`);
  assert(op.c[0] && op.c[1] === '0' && op.c[2] === 'Scroll sideways to see the rest.' && op.c[3] && op.c[4] && op.c[5] && op.c[6] && op.c[7] === 'o3-old-box', `aliases keep the old ids: ${JSON.stringify(op.c)}`);
  await ev(() => { for (const c of window.__opt) c.destroy(); window.__card.destroy(); });
  assert((await ev(() => [document.getElementById('o1'), document.getElementById('o3-old-card'), document.getElementById('t-problem')].every((x) => x === null))), 'destroy() removes the cards');
  await ev(() => { document.querySelector('#kit-station').append(window.__card.el); });
  // the links
  const lk = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const k = window.__kctx;
    const nav = document.getElementById('roots-links');
    const a = [...nav.querySelectorAll('a')];
    const o = { label: nav.getAttribute('aria-label'), cls: nav.className, anchors: a.map((x) => [x.id, x.getAttribute('href'), x.dataset.dir || null, x.dataset.thread || null, x.textContent, x.children.length, x.firstElementChild.tagName, x.childNodes.length]), button: nav.querySelector('button') };
    const lab = S.links(k, { lab: { fn: 'recip', shapes: [], view: 'side', problem: null, predictFirst: false }, extras: [{ href: '#staircase', text: 'The Staircase', prefix: 'Related: ' }, { href: '#powers', text: 'dup' }, { href: '#powermap', text: 'dup too', thread: 'T2', dir: 'next' }, { nope: 1 }], label: 'More' });
    document.getElementById('kit-host').append(lab);
    const btn = lab.querySelector('#roots-open-lab');
    btn.click();
    o.lab = { label: lab.getAttribute('aria-label'), ids: [...lab.children].map((x) => x.id), btn: btn.textContent, type: btn.type, nav: window.__nav.slice(), req: k.store.get('lab.request'), extra: lab.querySelector('#roots-link-staircase').textContent };
    lab.remove();
    // a station with nothing around it, a lab request with no store, and a ctx with no station
    const bare = S.links({ station: { id: 'zz', threads: [] }, stations: [{ id: 'zz', order: 0, threads: [] }] });
    o.bare = [bare.hidden, bare.children.length];
    let e1 = null, e2 = null;
    try { S.links({ station: k.station, stations: k.stations }, { lab: {} }); } catch (e) { e1 = e.constructor.name; }
    try { S.header({}); } catch (e) { e2 = e.constructor.name; }
    o.errors = [e1, e2];
    return o;
  });
  assert(lk.label === 'Where next' && lk.cls === 'station-links' && lk.button === null, `links frame: ${JSON.stringify(lk)}`);
  assert(same(lk.anchors.map((x) => x.slice(0, 4)), [
    ['roots-link-powers', '#powers', 'prev', null], ['roots-link-curves', '#curves', 'next', null], ['roots-link-powermap', '#powermap', 'next', 'T2'], ['roots-link-sets', '#sets', 'next', 'T1'],
  ]), `link ids and data: ${JSON.stringify(lk.anchors)}`);
  assert(lk.anchors.every((x) => x[5] === 1 && x[6] === 'SPAN' && x[7] === 1), `every anchor's text goes through one span: ${JSON.stringify(lk.anchors)}`);
  assert(same(lk.anchors.map((x) => x[4]), ['Powers: Spin n Times', 'Curves and Time', 'T2 next: zⁿ: Fans and Parabolas'.replace('ⁿ', 'n'), 'T1 next: Disks, Annuli, Boundaries']), `link text: ${JSON.stringify(lk.anchors.map((x) => x[4]))}`);
  assert(lk.lab.label === 'More' && same(lk.lab.ids, ['roots-link-powers', 'roots-link-curves', 'roots-link-powermap', 'roots-link-sets', 'roots-link-staircase', 'roots-open-lab']), `extras are added, duplicates dropped: ${JSON.stringify(lk.lab.ids)}`);
  assert(lk.lab.btn === 'Open in the Lab' && lk.lab.type === 'button' && same(lk.lab.nav, ['lab']) && lk.lab.req.fn === 'recip' && lk.lab.extra === 'Related: The Staircase', `lab button: ${JSON.stringify(lk.lab)}`);
  assert(same(lk.bare, [true, 0]) && same(lk.errors, ['TypeError', 'TypeError']), `empty and error cases: ${JSON.stringify([lk.bare, lk.errors])}`);
  const ts = await ev(async () => { const S = await import('./js/core/station-kit.js'); const s = S.titleSpan('z^n: Fans and Parabolas'); return [s.tagName, s.children.length, s.querySelector('sup.prose-sup').textContent, s.textContent]; });
  assert(same(ts, ['SPAN', 1, 'n', 'zn: Fans and Parabolas']), `titleSpan: ${JSON.stringify(ts)}`);
  log('(d) header, card (every option, aliases, neutral, fresh note, API), links (order, one span, extras, lab button, errors), titleSpan');

  // ---------------------------------------------------------------- (f) the card's statement is the index's statement
  const par = await ev(async () => {
    const S = await import('./js/core/station-kit.js');
    const P = await import('./js/data/problems.js');
    const PS = await import('./js/stations/problems.js');
    const bad = [];
    for (const p of P.PROBLEMS) {
      const card = S.problemCard(window.__kctx, p, { id: 'par' });
      const ref = document.createElement('p');
      PS.appendStatement(ref, P.statementParts(p.statement), '');
      if (card.els.statement.innerHTML !== ref.innerHTML) bad.push(p.id);
      card.destroy();
    }
    return bad;
  });
  assert(par.length === 0, `the card statement is the index statement for all 29 problems; differs: ${par.join(', ')}`);
  log('(f) statement markup equals problems.js appendStatement for all 29');

  // ---------------------------------------------------------------- (h) the tokens carry both themes
  const themes = await ev(async () => {
    const out = {};
    const probe = (prop, token) => { const p = document.createElement('i'); p.style[prop] = `var(${token})`; document.body.append(p); const v = getComputedStyle(p)[prop]; p.remove(); return v; };
    const D = await import('./js/core/decisions.js');
    const P = await import('./js/data/problems.js');
    const host = document.createElement('div');
    for (const [id, p] of [['th-all', P.problemById('1.4.2')], ['th-any', P.problemById('1.3.2')], ['th-none', P.problemById('1.1.1')], ['th-home', P.problemById('1.3.1')], ['th-cont', P.problemById('2.4.1')]]) host.append(D.chips(p, { idPrefix: id }));
    document.getElementById('kit-host').append(host);
    for (const theme of ['light', 'dark']) {
      document.documentElement.dataset.theme = theme;
      const cs = (id) => getComputedStyle(document.getElementById(id));
      out[theme] = {
        allBg: cs('th-all-names').backgroundColor === probe('backgroundColor', '--polar'), allFg: cs('th-all-names').color === probe('color', '--on-accent'),
        anyBorder: cs('th-any-names').borderTopColor === probe('borderTopColor', '--polar'), anyBg: cs('th-any-names').backgroundColor === probe('backgroundColor', '--surface'),
        noneFg: cs('th-none-names').color === probe('color', '--text-muted'), contStyle: cs('th-cont-names').borderTopStyle, anyStyle: cs('th-any-names').borderTopStyle,
        addrCart: cs('th-none-address').borderTopColor === probe('borderTopColor', '--cart'), homeBg: cs('th-home-names').backgroundColor !== probe('backgroundColor', '--surface'),
        glyph: getComputedStyle(document.querySelector('#kit-glyph .glyph-ray')).stroke === probe('color', '--polar'),
      };
    }
    delete document.documentElement.dataset.theme;
    host.remove();
    return out;
  });
  for (const theme of ['light', 'dark']) {
    const t = themes[theme];
    assert(t.allBg && t.allFg && t.anyBorder && t.anyBg && t.noneFg && t.addrCart && t.homeBg && t.glyph && t.contStyle === 'dashed' && t.anyStyle === 'solid', `${theme} tokens on the chips and the glyph: ${JSON.stringify(t)}`);
  }
  log('(h) both themes: filled, outlined, grey, tinted and dashed Names chips, tinted address chip, glyph colour');

  // ---------------------------------------------------------------- (g) phone: nothing is wider than the page
  await ev(async () => {
    const D = await import('./js/core/decisions.js');
    const pk = D.picker({ idPrefix: 'pp', address: 'C->P->C', names: 'continuous' });
    pk.mark({ address: false, names: false, expected: { address: 'both', names: 'none' } });
    document.getElementById('kit-host').append(pk.el);
    window.__pk2 = pk;
  });
  const fit = await ev(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('#kit-host *')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest('.tex-scroll') && !e.closest('.katex')).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 40));
    return { over: document.documentElement.scrollWidth - vw, wide: wide.slice(0, 6) };
  });
  assert(fit.over <= 1 && fit.wide.length === 0, `no horizontal overflow with the kit on the page (${phone ? 'phone' : 'desktop'}): ${JSON.stringify(fit)}`);
  const tap = await ev(() => [...document.querySelectorAll('#pp .dp-opt')].map((b) => Math.round(b.getBoundingClientRect().height)));
  assert(tap.every((hgt) => hgt >= 44), `option chips are at least 44 px tall: ${tap.join(',')}`);
  await ctx.shot('kit');
  if (process.env.KIT_SHOTS) await page.locator('#kit-host').screenshot({ path: `${process.env.KIT_SHOTS}/${ctx.route}-${ctx.label}-host.png` });
  // and at 320 px, the narrowest phone: the kit's own box must not be wider than its column
  await page.setViewportSize({ width: 320, height: 800 });
  await settle(page, 3);
  const narrow = await ev(() => {
    const host = document.getElementById('kit-host'), vw = document.documentElement.clientWidth;
    const wide = [...host.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest('.tex-scroll') && !e.closest('.katex')).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 40));
    const chip = document.getElementById('pp-address-c-p-c').getBoundingClientRect();
    return { vw, hostOver: host.scrollWidth - host.clientWidth, wide: wide.slice(0, 6), longest: Math.round(chip.width) };
  });
  assert(narrow.hostOver <= 1 && narrow.wide.length === 0, `the kit fits a ${narrow.vw} px viewport: ${JSON.stringify(narrow)}`);
  await page.setViewportSize(ctx.viewport);
  await settle(page, 2);
  await ev(() => { window.__pk2.destroy(); });
  log(`(g) fits ${ctx.viewport.width} px and 320 px: overflow 0, chips ${Math.min(...tap)} px tall or more, longest chip ${narrow.longest} px`);

  // ---------------------------------------------------------------- (e) the router turns a station.request into a values preset, once
  await ev(() => document.getElementById('kit-host').remove());
  const go = async (token) => {
    await ev((t) => { location.hash = '#' + t; }, token);
    await page.waitForFunction((t) => { const v = document.querySelector('#view'); return v.dataset.route === t && v.dataset.state !== 'loading'; }, token, { timeout: 8000 });
    await page.waitForTimeout(150);
  };
  const preset = () => ev(() => window.__mv.app.preset());
  const REQ = { station: 'roots', problem: '1.4.2', family: '1.4.2', values: { c: { re: -81, im: 0 }, n: 4 } };
  assert(await ev(() => typeof window.__mv.app.request === 'function' && typeof window.__mv.app.preset === 'function'), 'window.__mv.app has request() and preset()');
  await ev((r) => window.__mv.app.request(r), REQ);
  await go('roots');
  await page.waitForTimeout(450);
  assert(same(await preset(), { kind: 'values', ...REQ }), `the request becomes the values preset: ${JSON.stringify(await preset())}`);
  assert(await ev(() => Object.isFrozen(window.__mv.app.preset()) && Object.isFrozen(window.__mv.app.preset().values)), 'the preset is frozen');
  assert((await ev(() => document.querySelector('#view').dataset.state)) === 'ready' && (await ev(() => document.querySelectorAll('[data-station-error]').length)) === 0, 'roots mounted with it (iteration-1 stations ignore a values preset)');
  await go('home');
  assert((await preset()) === null, 'home has no preset');
  await go('roots');
  assert((await preset()) === null, 'consumed once: the same station again has none');
  // a request for another station waits for it
  await ev(() => window.__mv.app.request({ station: 'sets', problem: '1.5.2', family: '1.5.2', values: { preset: 'annulus' } }));
  await go('roots');
  assert((await preset()) === null, 'a request for sets is not given to roots');
  await go('sets');
  assert(same(await preset(), { kind: 'values', station: 'sets', problem: '1.5.2', family: '1.5.2', values: { preset: 'annulus' } }), 'and waits for sets');
  await go('home');
  await go('sets');
  assert((await preset()) === null, 'sets got it once');
  // a request wins over a hash preset; the next visit gets the hash preset again
  await ev(() => window.__mv.app.request({ station: 'roots', problem: null, family: null, values: { n: 5 } }));
  await go('problem-1-4-1');
  assert(same(await preset(), { kind: 'values', station: 'roots', problem: null, family: null, values: { n: 5 } }), 'a request wins over #problem-1-4-1');
  await go('home');
  await go('problem-1-4-1');
  assert(same(await preset(), { kind: 'problem', id: '1.4.1' }), 'the hash preset is back without a request');
  await go('topic-T1-4');
  assert(same(await preset(), { kind: 'topic', id: 'T1.4' }), 'topic presets are untouched');
  // bad requests: dropped, never a broken station
  for (const bad of [{ station: 'nosuchplace', values: {} }, { station: 'roots', values: 5 }, { station: 'roots' }, 'roots', 42, null, [1]]) {
    await ev((r) => window.__mv.app.request(r), bad);
    await go('roots');
    assert((await preset()) === null && (await ev(() => document.querySelectorAll('[data-station-error]').length)) === 0, `a malformed request is dropped: ${JSON.stringify(bad)}`);
    await go('home');
  }
  await ev(() => window.__mv.app.request({ station: 'roots', problem: 'ZZ.9', family: 7, values: { c: 'banana', n: 1e9 } }));
  await go('roots');
  assert(same(await preset(), { kind: 'values', station: 'roots', problem: null, family: null, values: { c: 'banana', n: 1e9 } }), 'an unknown problem id becomes null; the values are the station\'s to validate');
  assert((await ev(() => document.querySelectorAll('[data-station-error]').length)) === 0, 'and roots still mounts');
  await go('nosuchplace');
  assert((await preset()) === null, 'No such place has no preset');
  log('(e) router: preset, once, other station waits, request beats hash, bad requests dropped');
}
```
