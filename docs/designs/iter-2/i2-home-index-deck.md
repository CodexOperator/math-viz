# Design: i2-home-index-deck (the index becomes a deck; the map takes its 22nd stop and the two decisions)

Goal: `i2-home-index-deck` (iteration 2, wave 1, kind station). Designer: stage 2.
Owns: `js/stations/problems.js`, `js/stations/home.js`, `tests/unit/i1-station-home-problems.test.mjs`, `tests/interact/i1-station-home-problems.mjs`;
plus `tests/interact/i2-home-index-deck.mjs`, the script that acceptance A1 and A2 and `tools/interact-all.mjs` name and that the plan's `owns` list forgot (section 9, request 1).
Reads: `docs/ARCHITECTURE.md` 3.13, 3.15, 7, 9, 10.4, 11.1; `docs/STORY.md` sections 0, 2, 3, 9 row 7; `docs/review/iter-2/before/problems--desktop.png` and `home--desktop.png`;
`js/core/decisions.js`, `js/core/station-kit.js`, `js/registry.js`, `js/data/problems.js`, `css/theme.css`, `css/components.css`, `tools/smoke.mjs`, and the iteration-1 code and tests of the two stations.

**How to use this document.** Sections 1 to 9 are the design. The appendices are a *reference implementation* of every file this goal creates or edits (Appendix A is the whole of
`js/stations/problems.js`; B, C and D are unified diffs against the committed `home.js`, unit test and iteration-1 script; E is the whole of the new script). They were written and run in a
private scratch copy of the repository outside the repo (this design file is the only thing written in the repo), against the real `js/registry.js`, `js/core/decisions.js`,
`css/*.css` and the real `tools/smoke.mjs` in headless Chromium at 1280 and 390 px, light and dark. Every sentence that says "measured" comes from that run. The builder reproduces the
appendices; anything it changes is reported as a deviation. Where a sentence in sections 1 to 9 and the appendix code disagree, the sentence wins and the disagreement is a bug in the appendix.

---

## 0. Findings that shaped this design (read first)

### 0.1 What is on disk now

1. **The registry is already the iteration-2 registry**: 22 stations (`rehearse` is order 20, `problems` order 21), `PARTS`, `META_STATIONS`, a `walk` entry per station. `js/core/decisions.js` and
   `js/core/station-kit.js` exist (wave 0). `js/stations/rehearse.js` does not exist yet, so `#rehearse-1-4-2` shows the under-construction panel until `i2-rehearse` lands; nothing in this goal depends on it
   except the link target.
2. **Baseline, measured:** `node --test tests/unit/i1-station-home-problems.test.mjs` is 32 of 36 green; exactly `U3`, `U4`, `U5`, `U10` fail (21 vs 22 stations). `tests/interact/i1-station-home-problems.mjs` asserts 21 places and so fails against the registry.
3. **The iteration-1 index is 12,250 px tall at 1280 and 26,015 px at 390** (the "before" screenshots). Cropping the screenshot shows where it goes: the 29 problem cards are 15 rows of two ~410 px cards (about 6,200 px) and the **12 topic cards are another ~4,250 px**
   (six rows of two ~700 px cards). The goal's "whole page under 4,000 px" is therefore **not reachable by collapsing the 29 problem cards alone**: the topics checklist must become one-line rows too (section 2). This is the one place where
   the goal text (which only speaks of problem cards) is too small for its own number.
4. **`station-kit.js` injects a global rule for `.problem-card` and never removes it** (`display: grid; gap; background`, and `.problem-card > * { min-width: 0; margin: 0 }`). Whichever station was visited first leaves it in `<head>`. The index's cards must
   be `article.problem-card` (A1 says so) so every deck rule in `problems.js` starts with `.problems-deck` (specificity 0,2,0 and up beats the kit's 0,1,0), the card does not carry the `card` class (components.css gives `.card` a flex column and padding), and
   the rules set every property they care about (`display`, `padding`, `background`, `border`).
5. **`tests/unit/i1-integration.test.mjs` pins two literal strings of `problems.js`**: `id: \`${box.id}-final\`` (the answer box has an id) and `h('span', { class: 'muted' }, titleSpan(st.title))` plus `titleSpan(\`Start at ${first ? first.title : t.title}\`)`
   (a station title that writes an exponent is set through `prose()` in one span). That file belongs to `i2-rehearse`; this design keeps all three strings verbatim (unit test U30 holds them).
6. **`tools/interact-all.mjs` I8** (in `tests/interact/i1-integration.mjs`) clicks every `button[aria-expanded="false"]` whose id or text matches `/reveal|answer|show/i` (even hidden ones), then requires an id on every link and tab stop and no duplicate id. The deck passes because
   (a) a Reveal click on a collapsed card opens the card first, (b) the card body has no id of its own (so the router's auto-ids for the links inside it stay `problems-card-<k>-to-...`, the iteration-1 names), and (c) the Rehearse link has an explicit id.
7. **The home map was laid out for 21 stations in rows of 7.** Re-running its own collision sweep (U6) with `COLS = 8` and the iteration-1 caption rule fails twice at every width: the part caption "II · Curves and sets (Ch 1)" now starts at the *right edge* of row 1 and runs off the map (`outside`), and the continuation caption of part II
   on row 2 collides with the caption of part III. Both are fixed by a new caption rule (5.8). The same sweep finds the narrowest width at which every one of the 22 titles still fits in three lines: **778 px**, set by "Slide, Spin, Stretch, Mirror" (it needs 12 characters a line, which needs a 91.2 px column);
   `WIDE_MIN` becomes **780** (it was 712, set by two captions that no longer collide).
8. **A KaTeX trap, measured:** `.katex-mathml` is `position: absolute`. A statement clipped with `overflow: hidden` on an element that is *not positioned* is not clipped for it: the absolutely positioned MathML of a long statement lands past the right edge and
   gives the page 172 px (desktop) and 778 px (phone) of horizontal scroll. `.pc-statement` is `position: relative`.

### 0.2 Where this design differs from the plan text (report, do not edit the plan)

1. **The station is in the open card, not on the collapsed line.** The deliverable lists "number, statement, the two decision chips, the station, a Rehearse link, the tick" for the one-line card; acceptance A1 and A6 list the number, the start of the statement, two small chips, the Rehearse link and the tick,
   and A1 says "its station link [is] hidden until reveal" after the card is opened, which puts the station link inside the open card. The measured collapsed line at 1280 gives the statement about 410 px; a station chip of 90 to 145 px takes it down to 260 to 320 px and cuts "Find the distance between 4 + 3i and −1 + i." to "Find the distance between 4 + 3i and". The statement is the row's
   identity, so it keeps the width; the station is the first line of the open card ("Lives at roots, Roots: Divide the Staircase") and under predict-first it must be hidden there anyway.
2. **`parseProblemsToken('names-home')` returns `{ chapter: 'all', todo: false, names: 'home' }`.** A3 reads "deepEquals { names: 'home' } (merged with the existing fields)"; this is that merge. The `names` key is present only for a names token, so every iteration-1 row of U16 (`{ chapter: '3', todo: false }` and so on) stays true.
3. **The 12 topic cards are one-line rows** (0.1 item 3). Their pins (`.topic-card` x 12, the links inside, `#problems-topic-tick-<id>`, `#problems-topic-start-<id>`) keep working; the body is built at mount and only hidden.
4. **Predict-first hides three more things than the plan says**, because each gives the answer to the question it hides: the address chip and names chip of a *collapsed* row (`.decisions` is in the row, not in the card body), the tint of the card's left stripe (blue, orange, split = the address decision), and the address-balance strip (29 coloured cells in handout order with per-cell tooltips).
5. **`GEOM.COLS = 8` also needs `WIDE_MIN = 780`, two new `GEOM` keys (`CAP_W`, `CAP_EDGE`) and a new caption rule** (0.1 item 7). The plan says `threadStops` and `layoutMap` keep their signatures: they do.
6. **The spine copy of the home page is rewritten to the four lines of `docs/STORY.md` section 0**, and plan step 5 gains the Rehearsal Room, because the "two decisions" block sits "under the four spine lines" and the old spine ("a place and a move", three lines) contradicts the story the new block hangs on. The ids `#home-spine-1..4` and `#home-plan-1..6` are kept.
7. **The part-caption "cont." rule is dropped.** With 8 columns only part II crosses a row, and its continuation can never fit beside the caption of part III. `parts[i].cont` stays in the data (always `false`).

### 0.3 Measured in the scratch prototype

| What | Value |
|---|---|
| `/#problems` page height, 1280 px, collapsed | **3,598 px** (budget 4,000; iteration 1 was 12,250); **3,659 px** against the shell as `i2-walk-shell` has it half-built (the Walk pill adds 60 px of footer padding) |
| the same at 1024 / 900 / 768 px | 3,767 / 3,927 / 3,700 px (every row still one line) |
| `/#problems` at 390 px | **6,267 px** (budget 7,500; iteration 1 was 26,015), 6,330 with the walk-shell CSS; at 360 6,465; at 320 6,945 |
| one collapsed row | 50 px at desktop (two rows with a fraction, 2.3.1 and P5, are 59 and 53); 100 px at 390 |
| tools panel / balance panel / chapter 1 group (11 rows) / topics (12 rows) at 1280 | 345 / 116 / 643 / 731 px |
| `mountMs` of the index (29 statements typeset, 29 chip pairs, 12 topic rows) | 50 to 75 ms |
| home page height | 4,696 px at 1280 (3,816 before; 4,757 with the walk-shell CSS); 9,812 at 390 (7,584 before; 9,875). The two-decisions block is 638 px at desktop and 1,687 at 390 |
| home map at 1280 | host 918 px, viewBox `0 0 918 476`, three rows of 8, 8, 6, `layout()` = `wide` |
| collision sweep, every integer width 600 to 1200 with `WIDE_MIN` forced to 600 | 0 collisions; the only failure below 778 is a cut title ("arithmetic") |
| scratch `npm test` | 865 of 867 green: the two reds are `I1` (waits for `rehearse.js`) and a docs-goal test that needs `docs/goals/*.json`, which the scratch copy does not carry |
| the new unit file / the moved iteration-1 script / the new script | 45 of 45 / 6 of 6 checks (home and problems, desktop, phone, dark) / 10 of 10 checks (five routes, two viewports) |

---

## 1. Goal restatement, story thread, problems and topics

**Goal.** Turn the problem index from a wall into a deck, and bring the home map up to the 22-station registry with the two decisions on it.

- **The deck.** 29 collapsed one-line cards in handout order (`article.problem-card[data-open="false"]`): number, the start of the statement, the two decision chips (Address, Names), a **Rehearse** link to `#rehearse-<id>`, the tick. Opened one at a time or several at once; **Collapse all**; filters
  by chapter (as before), **by Names** (new: `none`, `any`, `all`, `home`, `continuous`) and by not-ticked; predict-first intact; the whole page under 4,000 px at 1280 (and 7,500 px at 390). The route `#problems-names-<code>` opens the index already filtered.
- **The map.** 22 stations in three serpentine rows of 8, 8 and 6, with the Rehearsal Room between the 4D Graph and the Problem Index; a block of **two decisions** under the four spine lines (Address: the six choices; Names: the five choices, each a link into the filtered index with its count);
  the small circles under each place fill when the problem is ticked and get a heavy orange ring when its fresh-number version was rehearsed right (`circle.pdot.is-rehearsed`, from `rehearse.scores`).
- **Every iteration-1 home and index pin** is moved to the 22 stations and to the open-card flow (section 7.6 lists each one).

**The story thread this carries.** *The exam as 29 dots on one path, settled by two decisions each.* On screen: the home map shows the 22 places as one path and the 29 problems as the circles under their owners; under the spine, the two decisions say what every problem on the path asks; the index lists the
29 problems as 29 rows, each wearing its two decisions as two chips, and the **Names** filter turns the wall into the four groups of STORY section 1 (all the "home" problems, all the "all" problems); each row's **Rehearse** link is the way back from the list to a place with new numbers. The student does not memorise 29 procedures; they see that 29 questions fall into 6 address choices times 5 names choices
and that three of them are the roots.

**Review problems and topics covered** (the whole handout; the index is where each is *found*, the stations are where each is *done*): 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.3.1, 1.3.2, 1.4.1, 1.4.2, 1.4.3, 1.5.1, 1.5.2, 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.3.1, 2.4.1, 2.5.1, 3.1.1, 3.1.2, 3.2.1, P1 to P7 and the topics T1.1 to T3.2.
Section 6.3 gives each problem's worked solution in both addresses, because the index shows `answer`, `routes.cart` and `routes.polar` from `js/data/problems.js` and the unit test recomputes them.

**The Names decision as a map of the test** (the column the Names filter groups by; STORY section 3; unit test U23 and U24):

| Names | Count | Problems |
|---|---|---|
| none | 11 | 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.5.1, 1.5.2, 2.1.2, 3.1.1, 3.2.1, P3, P7 |
| any | 12 | 1.3.2, 2.1.1, 2.1.3, 2.2.1, 2.3.1, 2.5.1, 3.1.2, P1, P2, P4, P5, P6 |
| all | 3 | 1.4.1, 1.4.2, 1.4.3 |
| home | 2 | 1.3.1, 2.2.2 |
| continuous | 1 | 2.4.1 |

11 + 12 + 3 + 2 + 1 = 29. Chapter 1 and `any` is only 1.3.2; chapter 2 and `any` is 2.1.1, 2.1.3, 2.2.1, 2.3.1, 2.5.1; the proofs with `any` are P1, P2, P4, P5, P6.

---

## 2. UX

### 2.1 Wireframes

**The index, desktop (1280 px; the content column is 918 px; every row is one line; measured 3,598 px tall).**

```
 The Problem Index
 All 29 problems, one line each. Open a row to see where it lives, which address and which names it needs,
 and the one-sentence aha. Press Rehearse for the same problem with fresh numbers.
 (● T1 One point, two addresses) (◌ T2 The staircase) (◆ T3 A function is a motion)
 ┌ tools (#problems-tools) ──────────────────────────────────────────────────────────────────────────────────┐
 │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ progress ━━━━━━━━━━━━━━━]   0 of 29 ticked            Clear all ticks   │
 │ Show   (All 29) (Chapter 1 11) (Chapter 2 8) (Chapter 3 3) (Proofs 7) (Not ticked yet 29)                  │
 │ Names  (No filter 29) (none 11) (any 12) (all 3) (home 2) (continuous 1)                                    │
 │ Rows   (One at a time) (Keep several open)   Open all shown   Collapse all   Hide all answers               │
 │ [ ] Predict first: hide the place, the two chips and the aha until I reveal                                 │
 │ Showing 29 of 29.                                                                                           │
 │ In a row, the first chip is the address (C is Cartesian, a slide; P is polar, a move; an arrow means …      │
 └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 ┌ Which address makes each question easy? ■■▪■■▪…  Blue: Cartesian is easiest (10). Orange: …               ┐
 Chapter 1
 ▌ [>] 1.1.1  Let z₁ = 3 − 2i and z₂ = −1 + 4i. Compute z₁z₂ and z₁/z₂ in th░  (●C) (— none) (Rehearse) [ ] Got it
 ▌ [>] 1.1.2  Find Im(conj(z₁ − z₂)) for z₁ = 3 − 2i and z₂ = −1 + 4i.            (●C) (— none) (Rehearse) [ ] Got it
 ▌ [>] 1.3.1  Write z = −1 + i√3 in polar form r(cos θ + i sin θ) and exp░       (●●C→P) (▟ home) (Rehearse) [ ] Got it
 ▌ [>] 1.4.2  Find all the 4th roots of −16. Express answers in both exponent░  (●●P→C) (▟ all) (Rehearse) [ ] Got it
   …(11 rows)…   Chapter 2 (8 rows)   Chapter 3 (3 rows)   Proof examples (7 rows)
 Topics: the syllabus checklist
 ▌ [>] T1.1  Algebraic properties                          (● T1)  4 problems  [ ] I can explain this
   …(12 rows)…
 [← The Rehearsal Room] [The Map]                             (the ░ is the fade where a long statement is cut)
```

`▌` is the card's left stripe: blue for an address that is Cartesian, orange for polar, half and half for the mixed ones (the same colour code as the balance strip above the deck). `(▟ all)` is the Names chip with its staircase mark from `decisions.js`.

**One card open (1.4.2), desktop.** The row's middle cell turns into the section title, the statement drops to its own line at full width, the body appears.

```
 ▌ [v] 1.4.2  Powers and Roots                                        (●●P→C) (▟ all) (Rehearse) [ ] Got it
 ▌      Find all the 4th roots of −16. Express answers in both exponential and Cartesian forms.
 ▌      Lives at (roots) Roots: Divide the Staircase
 ▌      ●● Polar, then Cartesian  Find the roots in polar (divide every name of arg(−16) by 4), then convert each to x + iy …
 ▌      Names: all. Every name gives a different answer: roots take all n steps.
 ▌      The aha. −16 is 16 at Arg π; divide the staircase arg(−16) by 4: radius 2, angles π/4 + kπ/2.
 ▌      [ Show the answer ]
 ▌      Answer  ┌ 2e^{iπ/4}, 2e^{i3π/4}, … = √2 + √2 i, −√2 + √2 i, … ┐   (scrolls sideways; "Scroll sideways to see the rest.")
 ▌              ▸ Plain text version (wraps to fit)
 ▌              ┃ In Cartesian (slide)   …      ┃ In polar (spin and stretch)   …
```

**Predict first on, the same two cards.** The collapsed row has no chips, the stripe is grey, the place and the words are not in the body, the balance strip is gone; Rehearse and the tick stay.

```
 ▌ [>] 1.4.1  Find and sketch the 5th roots of unity.                                  (Rehearse) [ ] Got it
 ▌ [v] 1.4.2  Powers and Roots                                                         (Rehearse) [ ] Got it
 ▌      Find all the 4th roots of −16. Express answers in both exponential and Cartesian forms.
 ▌      Say it first: which place, which address, which names, and what is the aha?
 ▌      [ Show the answer ]          (after it: the chips, the place, the words, the aha and the answer all appear)
```

**The index, phone (390 px; measured 6,267 px).** Two lines a row; the second line starts under the number; the tick loses its word (the word stays for screen readers).

```
 ▌[>] 1.1.1  Let z₁ = 3 − 2i and z₂ ░      ▌[v] 1.3.1  Polar Representation
 ▌        (●C) (— none) (Rehearse) [ ]      ▌     Write z = −1 + i√3 in polar form
                                            ▌     r(cos θ + i sin θ) and exponential form …
 ▌[>] 1.1.2  Find Im(conj(z₁ − z₂)) fo░     ▌     (●●C→P) (▟ home) (Rehearse) [ ]
 ▌        (●C) (— none) (Rehearse) [ ]      ▌     Lives at (addresses) One Point, Two Addresses · Also at (staircase)
                                            ▌     ●● Cartesian, then polar  You are given the Cartesian address …
                                            ▌     Names: home. The home step only: Arg z in (−π, π], and principal values.
                                            ▌     The aha. Read the polar address of the dot at (−1, √3) …
                                            ▌     [ Show the answer ]
```

The tools panel on the phone stacks into rows of wrapped chips (689 px); the fixed row label (`Show`, `Names`, `Rows`) sits at the start of each row.

**The home page, in order.** header; finder; the demo hero (the dot, its names); the same dot written both ways; **the four lines**; **the two decisions (new)**; the map; the night-before plan; links.

```
 ┌ Two decisions settle every problem ───────────────────────────────────────────────────────────────────────┐
 │ Before you compute, decide two things. The problem index shows both on every card. The Rehearse link …      │
 │ 1. Address: where is the question easy?               │ 2. Names: which turns of the angle count?            │
 │ Cartesian (x, y) says where z sits: a slide. The      │ An angle has many names: θ, θ + 2π, θ − 2π, and so   │
 │ polar address (r, θ) says how to reach it: a move.…   │ on. Ask which of them the question needs. Tap a      │
 │ (● Cartesian)            A slide question: add or …   │ choice to see those problems in the index.           │
 │ (● Polar)                A move question: turn by …   │ ( — names: none) 11 problems   No angle in the …     │
 │ (●● Cartesian, then polar)  Read the polar address …  │ (▟ names: any) 12 problems     Any name of the angle …│
 │ (●● Polar, then Cartesian)  Work in polar, then …     │ (▟ names: all)  3 problems     Every name gives …     │
 │ (●●● Cartesian, polar, then back)  Convert to polar … │ (▟ names: home)  2 problems    The home step only: …  │
 │ (●● Either address)      Both addresses say …         │ (▟ names: continuous) 1 problem  A choice of name …   │
 └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**The map at 1280 (host 918 px, three rows, serpentine; the part captions sit above the numbers).**

```
  I · The point (Ch 1)                                                         II · Curves and sets (Ch 1)
  0       1        2         3        4         5        6        7
 (The Map)(One Pt)(Slide…)(Length…)(The Stair)(Powers)(Roots)(Curves and Time) ╮
  ○        ○        ○○○○     ○○       ·         ○        ○○○      ○             │   row 0: orders 0..7, left to right
 ╭──────────────────────────────────────────────────── III · Motions (Ch 2) ───╯
  15       14       13        12       11        10       9        8            row 1: orders 8..15, right to left
 (Limits)(1/z …)(Branches)(Principal)(zⁿ)(Linear Maps)(A Function…)(Disks, Annuli…)
 ╰╮ IV · Zoom (Ch 3)     V · The diary and the index                                row 2: orders 16..21, left to right
  16       17       18        19       20        21                              (6 places; the right-hand 2 columns are empty)
 (Derivative…)(Cauchy-Riemann)(The Mapping Lab)(The 4D Graph)(The Rehearsal Room)(The Problem Index)
```

The map on a phone (host under 780 px) is the iteration-1 single track, now 22 places long (1,226 px at the minimum width instead of 1,178).

### 2.2 Every control, id, label and behaviour

**Problems: tools panel** (`section.panel#problems-tools`, aria-label "Progress and filters").

| id | Element and label | Behaviour |
|---|---|---|
| `problems-progress-bar` | `<progress max=29>` | value = number of problems ticked (a topic tick does not count) |
| `problems-progress` | `p[role=status]` "N of 29 ticked" | updates on every tick |
| `problems-clear` | button "Clear all ticks" | first press arms ("Click again to clear all ticks"), disarms after 4 s (`ARM_MS`); a second press within 4 s clears every tick (problems and topics), removes the stored key, resets `data-done` |
| `problems-filters` | group, aria-label "Show", label text `Show` | holds the chapter chips and the not-ticked chip |
| `problems-filter-all`, `-1`, `-2`, `-3`, `-P` | chips "All (29)", "Chapter 1 (11)", "Chapter 2 (8)", "Chapter 3 (3)", "Proofs (7)", `aria-pressed` | single choice; sets `filter.chapter` |
| `problems-filter-todo` | chip "Not ticked yet (N)" `aria-pressed` | toggles `filter.todo` |
| `problems-filters-names` | group, aria-label "Names decision", label text `Names` | |
| `problems-filter-names-all-names` | chip "No filter (29)" | `filter.names = 'all-names'` |
| `problems-filter-names-none`, `-any`, `-all`, `-home`, `-continuous` | chips "none (11)", "any (12)", "all (3)", "home (2)", "continuous (1)"; `title` = the meaning (`NAMES_MEANING`) | single choice; sets `filter.names` |
| `problems-deck-controls` | group, aria-label "Open and close rows", label text `Rows` | |
| `problems-mode-one` / `problems-mode-all` | chips "One at a time" / "Keep several open", `aria-pressed` (one starts pressed) | sets `deck.mode`; switching to one keeps only the row opened last |
| `problems-open-all` | button "Open all shown" | sets mode all, opens every card that the filters leave visible |
| `problems-collapse-all` | button "Collapse all" (disabled while nothing is open) | collapses every open card (and hides its answer) |
| `problems-hide-all` | button "Hide all answers" (disabled while no answer shows) | hides every answer, leaves the cards open |
| `problems-predict` | checkbox, label "Predict first: hide the place, the two chips and the aha until I reveal" | persisted (`problems.predict`); hides `.decisions`, `.pc-hint`, the stripe tint and `#problems-balance-panel` on every card whose answer is not showing |
| `problems-count` | `p[role=status]` | "Showing N of 29." plus ": Chapter 1, names: any, not ticked yet" for what is filtered |
| `problems-key` | `p.muted` | one paragraph of how to read the chips (copy in 2.5) |
| `problems-deck-status` | `p.sr-only[role=status]` | "Opened problem 1.4.2.", "Collapsed problem 1.4.2.", "Opened 11 problems.", "Collapsed all rows.", "Answers hidden." |
| `problems-balance-panel`, `problems-balance` | the iteration-1 address-balance strip | unchanged; `hidden` while predict is on |

**Problems: the deck.**

| id / selector | Element | Behaviour |
|---|---|---|
| `problems-deck` | `div[data-predict]` | holds `section#problems-group-1|2|3|P` (each `h2` + `div.pc-list`) and `p#problems-empty` |
| `problems-empty`, `problems-show-all` | callout "No cards match these filters." + button "Show all" | shown when the three filters match nothing; the button resets all three |
| `article#problems-card-<k>.problem-card` | one per problem, `<k>` = id with dots as dashes (`1-4-2`, `P3`) | data attributes: `data-problem`, `-chapter`, `-kind`, `-thread`, `-address`, `-names`, `-station`, `-tone` (`cart`, `polar`, `both`), `-open`, `-revealed`, `-done`; `aria-labelledby` the title |
| `problems-card-<k>-title` | `h3.pc-title` with `span.badge.pc-id` (the number) and `span.pc-section` (the section, shown only when open) | |
| `problems-open-<k>` | `button.pc-open`, `aria-expanded`, `aria-label` "Details of problem 1.4.2", a chevron | the toggle (below) |
| `.pc-statement` | the statement, typeset (the iteration-1 element and class) | collapsed: one line, fades out at the right; open: full width, wraps |
| `problems-card-<k>-address`, `problems-card-<k>-names` | the two chips (`span.chip.decision-chip` from `decisions.chips(problem, { idPrefix, meaning: false })`), `data-decision`, `data-value` | read-only here; the visible text is the short form (`C→P→C`, `all`), the full words are in `sr-only` text and the tooltip |
| `problems-rehearse-<k>` | `a.chip.pc-rehearse[href="#rehearse-<k>"]` "Rehearse" ("Rehearse again" with `data-rehearsed="true"` once `rehearse.scores[id].right >= 1`) | navigates; `aria-label` "Rehearse problem 1.4.2 with fresh numbers" |
| `problems-tick-<k>` | checkbox in `label.check.pc-tick` "Got it" (word hidden under 640 px) | persisted ticks, `progress[id]`; does not re-filter the deck |
| the card body (no id) | `div.pc-body[hidden]` | built at mount for every card (the links must exist before the card is opened) |
| `a.chip.station-chip[href="#problem-<k>"]` | the place link, text = the station id; id given by the router (`problems-card-<k>-to-problem-<k>`) | the one link per card to its problem route |
| `problems-reveal-<k>` | `button.btn.reveal`, `aria-expanded`, `aria-controls="problems-answer-<k>"` "Show the answer" / "Hide the answer" | reveals (opens the card first if it is closed) |
| `problems-answer-<k>` | `div.answer[hidden]` | built on first reveal: `-final` (`.tex-scroll.pc-final`, tabindex 0), `-plain` (`details`), `-plain-toggle`, the two routes |

**Problems: topics** (`section#problems-topics`).

| id | Element | Behaviour |
|---|---|---|
| `problems-topic-<T1-4>` | `article.panel.topic-card[data-topic][data-thread][data-open]` | a one-line row |
| `problems-topic-open-<T1-4>` | `button.pc-open[aria-expanded]` aria-label "Details of topic T1.4" | opens the body: summary, what it covers, where to learn it, its problems |
| `problems-topic-tick-<T1-4>` | checkbox "I can explain this" (word hidden under 640 px) | `progress['T1.4']`, not counted among the 29 |
| `problems-topic-start-<T1-4>` | `a.btn` "Start at Powers: Spin n Times" | `#topic-T1-4` |

**Home: new controls.** `#home-decisions` (`section.panel`, h2 `#home-decisions-title`) with the two columns `#home-decision-address` (list `#home-decision-address-list`, one `li[data-code]` per address choice, the chip id `home-decision-address-chip-<c|p|c-p|p-c|c-p-c|both>-address`)
and `#home-decision-names` (list `#home-decision-names-list`, one `li[data-code]` per Names value holding `a#home-decision-names-link-<code>[href="#problems-names-<code>"]` that wraps the chip `home-decision-names-chip-<code>-names` and the count "11 problems"). Everything else on the home page keeps its id
(`#home-map`, `#home-map-host`, `#home-finder*`, `#home-demo-*`, `#home-spine`, `-spine-1..4`, `#home-plan`, `-plan-1..6`, `#home-progress`, `#home-thread-T1..T3`, `#home-link-*`). New hook: `window.__mv.home.rehearsed()`.

### 2.3 Pointer, touch and keyboard

- **Opening a row.** Click or tap the chevron button (`#problems-open-<k>`), or the statement or the number of a *collapsed* row (a convenience for the pointer; an open row's statement is left alone so it can be selected). Enter and Space on the button. The button toggles; a second press collapses.
- **Mode one** (the default): opening a row collapses the one that was open, and a collapsed row forgets its revealed answer. **Mode all**: rows stay open; switching back to one keeps the row opened last. **Open all shown** and **Collapse all** act on the rows the filters show and on every open row respectively.
- **Between rows.** On a focused toggle: ArrowDown and ArrowUp move to the next and previous *visible* row's toggle, Home and End to the first and last. Escape anywhere inside an open row collapses it and returns focus to its toggle. Tab order inside an open row follows the page: toggle, Rehearse link, tick, place link, Also-at links, Reveal, answer box, plain-text summary.
- **Reveal** opens a closed row first; the answer is built once and kept. **Predict first** keeps the row's chips and the body's hint hidden until the answer shows.
- **Touch.** The toggle is 44 px (2.75 rem) square on the phone and 40 px on desktop; the Rehearse link and the tick are 36 px and 44 px tall on the phone; chips are not controls. No hover-only state anywhere (the chips' tooltips repeat what the open card says in words).
- **The map.** Unchanged: a station anchor is a link (Enter or click), a thread legend button dims the others; the Names choices on the home page are links.
- **No pointer capture, no drag, no gesture** anywhere in this goal; nothing changes with `pointer: coarse` except the 44 px sizes above (which are CSS breakpoints at 640 px, not pointer queries).

### 2.4 Empty, loading and error states

| State | What the student sees |
|---|---|
| Filters match nothing (chapter 3 and names home) | all groups hidden; `#problems-empty` "No cards match these filters." with **Show all** (resets chapter, names and not-ticked); `#problems-count` says "Showing 0 of 29: Chapter 3, names: home." |
| Nothing open | **Collapse all** is disabled; the deck is the 29 lines |
| No answer showing | **Hide all answers** is disabled |
| Loading | none of its own: the module builds synchronously (50 to 75 ms); the router's `.loading` placeholder covers a slow import |
| localStorage blocked or full | every store read and write goes through `safeGet`/`safeSet`/`safeRemove`; ticks and predict live in memory for the page, nothing throws |
| `rehearse.scores` missing or junk | `sanitizeScores` returns `{}`; every Rehearse link says "Rehearse"; no dot on the home map is ringed |
| A stored deck with unknown ids or a wrong shape | `deckState` returns `{ open: [], mode: 'one' }` or the clean subset |
| `decisions.chips` throws for a problem | that row shows its two codes as plain text ("C→P · all"); `console.error` names the problem; the page keeps working |
| KaTeX missing | `tex()` degrades to the TeX source as text; the rows are still one line |
| An answer cannot be drawn | "This answer could not be drawn. Plain text: …" with `answer.text` (iteration-1 behaviour) |
| The map cannot be drawn | the iteration-1 fallback: the places as a list (`#home-map-fallback`) |
| `rehearse` has no module yet | the Rehearse link goes to the router's under-construction panel; the index is unaffected |

### 2.5 Copy (every string a student can read; plain, direct, for the night before)

**Index.** Title: the station title. Lede: "All 29 problems, one line each. Open a row to see where it lives, which address and which names it needs, and the one-sentence aha. Press Rehearse for the same problem with fresh numbers."
Tools: `Show`, `Names`, `Rows` (row labels); chips as in 2.2; "No filter (29)"; "One at a time"; "Keep several open"; "Open all shown"; "Collapse all"; "Hide all answers"; "Clear all ticks"; "Click again to clear all ticks"; "Predict first: hide the place, the two chips and the aha until I reveal"; "N of 29 ticked"; "Showing 29 of 29.".
Key line: "In a row, the first chip is the address (C is Cartesian, a slide; P is polar, a move; an arrow means convert) and the second is the names decision (none, any, all, home or continuous). Open a row for the words."
Row: the number; the statement; chips `C`, `P`, `C→P`, `P→C`, `C→P→C`, `C or P` and `none`, `any`, `all`, `home`, `continuous`; "Rehearse" / "Rehearse again" (tooltips "The same problem with fresh numbers" / "You got this one right once. Try fresh numbers again."); "Got it".
Open card: "Lives at" + the station id + the station title; "Also at"; the address label and `addressWhy`; "Names: all." + the meaning from `NAMES_MEANING`; "The aha." + `aha`; "Show the answer" / "Hide the answer"; predict note "Say it first: which place, which address, which names, and what is the aha?".
Groups: "Chapter 1", "Chapter 2", "Chapter 3", "Proof examples". Balance heading and note unchanged. Empty: "No cards match these filters." + "Show all".
Topics: "Topics: the syllabus checklist"; "Tick a topic when you could explain it to a friend without looking. Open a row for what it covers and where to learn it."; "4 problems" / "1 problem"; "I can explain this"; "Where to learn it"; "Problems"; "Start at …".

**Home.** Spine lines (the epigraph): "A complex number is a move: turn, then stretch." / "A turn has many names." / "A function moves every point at once." / "Differentiable means: up close, one move."; the four paragraphs headed "A move", "Many names", "A motion", "One move, up close" (text in Appendix B).
Decisions: h2 "Two decisions settle every problem"; lead "Before you compute, decide two things. The problem index shows both on every card. The Rehearse link on a card gives you the same problem with fresh numbers, and there you set both before you see the answer."; h3 "1. Address: where is the question easy?" with "Cartesian (x, y) says where z sits: a slide. The polar address (r, θ) says how to reach it: a move. Adding is a slide and multiplying is a move, so pick the address where the question is native, work there, and translate back.";
h3 "2. Names: which turns of the angle count?" with "An angle has many names: θ, θ + 2π, θ − 2π, and so on. Ask which of them the question needs. Tap a choice to see those problems in the index."; the six address meanings and the five names meanings are the strings of `decisions.js` (`ADDRESS_MEANING`, `NAMES_MEANING`), never retyped.
Map caption: "Each place is a stop. The three lines are the story threads: a dot on a line means that thread stops there. The small circles under a place are its review problems. A circle fills when you tick it in the problem index, and gets a heavy orange ring when you get its fresh-number version right in rehearsal."
Progress line: "Ticked 2 of 29 problems. Rehearsed 1 of 29 with fresh numbers." A place's screen-reader label gains ", 1 rehearsed". Plan heading "A night-before plan (about two and a half hours)"; step 5: "Do the problem index pass. For each row say the place, the address and the names, then open it, reveal the answer and tick it. Press Rehearse on anything that is not instant: the same problem with fresh numbers. (35 min)" with the chips for the index and the Rehearsal Room.

---

## 3. Visual encoding (the two-address code, both themes)

No colour is typed in `problems.js` or `home.js`. Every rule uses a token of `css/theme.css`; the only literal in the CSS is `#000` in `mask-image`, which is an alpha mask (its colour is never drawn). The tokens are redefined for dark mode by `theme.css`, so nothing here has a dark-mode branch.

### 3.1 What each mark means

| Mark | Token(s) | Meaning |
|---|---|---|
| left stripe of a card (4 px) | `--cart` (address C), `--polar` (address P), half `--cart` over half `--polar` (every mixed address), `--border-strong` under predict-first | which address makes the problem native: the same colour code as the balance strip's 29 cells |
| address chip | `decisions.js`: dots in `--cart` and `--polar` (one per step of the address) and the short text | the Address decision; `C→P→C` has three dots |
| names chip | `decisions.js`: `none` a grey outline with a dash mark, `any` three outlined steps, `all` filled `--polar` with three solid steps, `home` the middle step solid on a tinted ground, `continuous` a dashed outline with a seam | the Names decision, drawn as the staircase of STORY section 1 (shape, not only colour) |
| number badge (`.pc-id`) | `--border-strong`; `--ok` once ticked (`data-done`) | the problem; a ticked one wears a green border |
| Rehearse chip | `--border-strong` outline; `--polar` outline once rehearsed right (`data-rehearsed`), and the word changes | a path back to a place with fresh numbers |
| `Got it` / `I can explain this` | the checkbox (`accent-color: --accent`) | a tick is yours, not the page's |
| topic stripe | `--cart` T1, `--polar` T2, `--output` T3 (the thread colours) | the thread the topic belongs to |
| map circle under a place | ring `--text-muted` 1.4 px; ticked: fill and ring `--ok`; rehearsed: ring `--polar` 2.4 px (a ticked and rehearsed circle is green inside an orange ring) | three states in a 6.4 px circle, told apart by fill and by ring weight, not by colour alone |
| balance strip | unchanged (`--cart`, `--polar`, split) | |

### 3.2 Both themes, measured with the WCAG formula on the real tokens

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `--text` on `--surface` (row text, statements) | 15.96 | 14.52 | 4.5 |
| `--text-muted` on `--surface` (section, count, key) | 6.86 | 7.80 | 4.5 |
| `--text-muted` on `--bg` | 6.19 | 8.59 | 4.5 |
| `--cart` on `--surface` (stripe, dots, T1 stripe) | 6.17 | 7.12 | 3 (non-text) |
| `--polar` on `--surface` (stripe, dots, Rehearse ring, map ring) | 6.06 | 8.30 | 3 |
| `--ok` on `--surface` (tick border, filled map circle) | 6.12 | 8.86 | 3 |
| `--border-strong` on `--surface` (chip and number-badge outlines) | 4.14 | 4.33 | 3 |
| `--on-accent` on `--polar` (the filled `all` chip text) | 6.06 | 9.13 | 4.5 |
| `--polar` on `--surface-2` (the `home` chip's tinted ground) | 4.95 | 7.28 | 3 |

Every pair clears its minimum in both themes. Focus uses the global `:focus-visible` ring (`--focus`, 3 px, offset 2 px); the card and the row never set `overflow: hidden` on an ancestor of a focusable control (only `.pc-statement`, which holds no control), so the ring is never clipped.

### 3.3 Geometry of the row, in tokens and rem

- Desktop row: `grid-template-columns: 2.5rem auto minmax(0, 1fr) auto`, areas `open title line actions`; 40 px toggle, a 3.6 rem number cell, the statement takes what is left (about 410 px at 1280), the actions cell is the two chips, the Rehearse link and the tick on one line (never wraps at 640 px and up). A row is 40 px of content + 4 px padding above and below + 2 px of border = **50 px**; rows are 6 px apart.
- Open row (desktop): areas `open title title actions` over `. line line line`; the body is indented by the toggle's width (`calc(2.5rem + var(--space-2))`) so it lines up under the number.
- Phone (up to 40 rem = 640 px): columns `2.75rem auto minmax(0, 1fr)`, areas `open title line` over `. actions actions` (and `open title title` / `. line line` / `. actions actions` when open); the actions cell may wrap; the tick's word is visually hidden; chips use `0.78rem` text and `0.4rem` side padding.
- The statement's cut: `white-space: nowrap; overflow: hidden` and a `mask-image` fade over the last 1.6 rem (`linear-gradient(to right, #000 calc(100% - 1.6rem), transparent)`), not `text-overflow: ellipsis`, because an ellipsis next to an atomic KaTeX box leaves a stray fragment of the next subscript ("and ..₂", seen in the first prototype). Open: the mask is removed and the statement wraps (`overflow-wrap: anywhere`, `overflow-x: auto` for a wide maths run, as in iteration 1).

### 3.4 The map

Unchanged colours and strokes. New: `.home-map .pdot.is-rehearsed { stroke: var(--polar); stroke-width: 2.4 }` (a ticked and rehearsed circle: `fill` and `stroke` of `.is-done` give the green core, the heavier orange ring wins `stroke`). Dots keep radius 3.2 and spacing 10 (outer radius 4.3 with the heavy ring, under the 5 px half-spacing). The map and its host get **no background** (the identity grid that `i2-walk-shell` puts behind `#home-map-host` must show through).

---

## 4. Module API

### 4.1 `js/stations/problems.js` (edited; imports `../registry.js`, `../data/problems.js`, `../core/katex.js`, `../core/decisions.js`)

```js
export const PROGRESS_KEY = 'progress'                 // { [problemOrTopicId]: true }, persisted (unchanged)
export const PREDICT_KEY = 'problems.predict'          // boolean, persisted (unchanged)
export const FILTER_KEY = 'problems.filter'            // { chapter: 'all'|'1'|'2'|'3'|'P', todo: boolean, names: NAMES_FILTERS[number] }, memory only (gains names)
export const DECK_KEY = 'problems.deck'                // NEW { open: string[], mode: 'one'|'all' }, memory only
export const SCORES_KEY = 'rehearse.scores'            // NEW, read only: { [problemId]: { tried, right, last } }, written by i2-rehearse
export const NAMES_FILTERS                             // NEW frozen ['all-names', 'none', 'any', 'all', 'home', 'continuous']; 'all-names' is "no filter"
export const idKey = (id) => ...                       // unchanged: '1.4.2' -> '1-4-2'
export const shortTitle = (t) => ...                   // unchanged
export function typesetTitle(t)                        // unchanged
export function shortThreadTitle(t)                    // unchanged
export function sanitizeProgress(raw)                  // unchanged
export const countTicked = (progress, problems = PROBLEMS) => ...   // unchanged
export function setTicked(progress, id, on)            // unchanged
export function filterMatches(p, key)                  // unchanged: 'all' | 'P' | '1' | '2' | '3'
export function filterCounts(problems = PROBLEMS)      // unchanged: { all: 29, '1': 11, '2': 8, '3': 3, P: 7 }
export function namesFilterMatches(p, names)           // NEW: false for a non-object; true when names is not a Names code ('all-names', junk); else p.names === names
export function namesCounts(problems = PROBLEMS)       // NEW: { none: 11, any: 12, all: 3, home: 2, continuous: 1 }
export const problemCount = (n) => ...                 // NEW: '1 problem' | 'N problems'
export function normalizeFilter(raw)                   // NEW: { chapter, todo, names }, every field valid, default { 'all', false, 'all-names' }
export function visibleIds(filter, progress, problems = PROBLEMS)   // NEW: ids passing chapter AND names AND (not todo OR not ticked), handout order
export function filterLabel(filter)                    // NEW: 'Chapter 1, names: any, not ticked yet' | 'Proofs' | ... | ''
export function parseProblemsToken(token)              // EXTENDED: { chapter, todo } (+ names for 'names-<code>')
export function deckState(raw)                         // NEW: { open: string[], mode: 'one'|'all' }
export function sanitizeScores(raw)                    // NEW: clean scores for known problems only
export function rehearsedIds(scores, problems = PROBLEMS)   // NEW: ids with right >= 1, handout order
export function addressBalance(problems = PROBLEMS)    // unchanged
export function stationNeighbours(stations, id)        // unchanged (the 22-station results change because the registry changed)
export function statementNodes(parts)                  // unchanged
export function appendStatement(host, parts, mathClass = '')   // unchanged (browser)
export function titleSpan(text)                        // unchanged (browser)
export function mount(el, ctx)                         // -> unmount()
```

**Data structures.**

```js
Filter  = { chapter: 'all'|'1'|'2'|'3'|'P', todo: boolean, names: 'all-names'|'none'|'any'|'all'|'home'|'continuous' }
Deck    = { open: string[],            // problem ids in the order they were opened; in mode 'one' at most one
            mode: 'one' | 'all' }
Scores  = { [problemId]: { tried: int >= right, right: int >= 0, last: epoch ms or 0 } }
rec     = { card, answer, btn, openBtn, body, tick, rehearse, built: boolean, problem }     // per problem, in `cards`
```

**Store.** Reads: `progress`, `problems.predict`, `problems.filter`, `problems.deck`, `rehearse.scores`. Writes: `progress` (persisted), `problems.predict` (persisted), `problems.filter` and `problems.deck` (`{ persist: false }`). The deck and the filter therefore survive a trip to a station and back inside one page visit and are gone after a reload. The revealed answers are never stored.

**Route tokens** (`ctx.preset = { kind: 'token', token }` after `problems-`): `1`, `2`, `3`, `p`, `todo` (as before), `names-all-names|none|any|all|home|continuous` (new). `#problems-names-all` shows the three roots problems with the chip `all` pressed. Anything else: everything.

**Events.** DOM only: one delegated `click` and one `keydown` on `#problems-deck`; `click` on each tools control; `change` on the ticks and on `#problems-predict`; `click` on each topic toggle; `resize` on `window` (rAF-throttled; re-measures the "Scroll sideways" hint of the showing answers). No custom events, no timers except the 4 s arm of **Clear all ticks**.

**Hook** `window.__mv.problems`: `visible() -> string[]` (ids of cards not hidden by the filters), `progress() -> { [id]: true }`, `filter() -> { chapter, todo, names }`, **`deck() -> { open, mode }`** (every open id, including a card the filters hide), **`revealed() -> string[]`**, `mountMs`.

**Lifecycle.** `mount`: inject `<style data-for="problems">`; read the store; build header, tools, balance, the four groups of rows, the topics, the links (all synchronously); restore the deck from `problems.deck` (open ids get `data-open="true"` and a visible body, nothing is revealed); apply the filters; paint ticks, balance, rehearsed marks, button states; publish the hook; add the `resize` listener last.
`unmount`: remove the `resize` listener, cancel the rAF and the arm timer, remove the style tag, delete the hook if it is still ours. The deck's other listeners live on elements that go with `#view`.

### 4.2 `js/stations/home.js` (edited; adds imports `PARTS` from `../registry.js`, `ADDRESS_CODES` and `addressLabel` from `../data/problems.js`, `chips`, `NAMES_CODES`, `namesMeaning`, `addressMeaning` from `../core/decisions.js`, and `namesCounts`, `sanitizeScores`, `rehearsedIds`, `problemCount`, `SCORES_KEY` from `./problems.js`)

```js
export const WIDE_MIN = 780                            // was 712
export const PART_LABELS                               // { I: 'The point (Ch 1)', ..., V: 'The diary and the index' }, computed from the registry's PARTS (was typed)
export const GEOM                                      // frozen; COLS: 8 (was 7); new CAP_W: 7, CAP_EDGE: 4
export function wrapLabel(text, maxChars, maxLines = 3)         // unchanged
export function threadStops(stations, threadId)                 // unchanged (now 16, 12, 14 stops)
export function layoutMap(stations = STATIONS, width = 360, threads = THREADS, problems = PROBLEMS)   // same signature; three rows of 8, 8, 6; new caption rule
export function decisionBlock(problems = PROBLEMS)              // NEW: { address: [{ code, label, meaning }] x6, names: [{ code, count, countText, meaning, route }] x5 }
export function stationLabel(st, progress, rehearsed, problems = PROBLEMS)   // NEW (was a closure): the place's screen-reader sentence
export function normalizeQuery(q); export const FINDER_ECHO_MAX; export function buildSearchItems(...); export function searchItems(...)   // unchanged
export const snapToGrid; export function angleText(theta); export function homeReadout(z)      // unchanged
export { shortTitle, shortThreadTitle }                         // unchanged re-exports
export function mount(el, ctx)                                  // -> unmount()
```

`layoutMap` return value (unchanged shape): `{ mode: 'wide'|'narrow', width, height, rows, colW, nodes: [{ id, order, part, row, col, dir, x, y, pill, num, label: { x, y, anchor, lines }, dots: [{ problem, x, y }], hit }], parts: [{ part, text, cont, x, y, anchor, node }], threads: [{ id, d, dash, first, last, lane, stops }] }`.
`parts[i].cont` is always `false`. `rehearse` and `problems` own no problem, so their `dots` are `[]`.

**Store.** Reads `progress` and `rehearse.scores` (at mount and again on every re-layout, `paintProgress`). Writes nothing. **Hook** `window.__mv.home`: `layout()`, `demo()`, `search(q)`, **`rehearsed() -> string[]`**, `mountMs`.
**Lifecycle** unchanged (ResizeObserver on `#home-map-host` or a `resize` listener, the plane, explainer and staircase destroyed on unmount, the style tag removed).

### 4.3 Imports, ownership and the shared pieces this goal depends on

- `decisions.chips(problem, { idPrefix, meaning: false })` returns `span.decisions` holding `span.chip.decision-chip#<prefix>-address` and `-names` with `data-decision` and `data-value` (ARCHITECTURE 11.1, built in wave 0). `compactChips` in `problems.js` rewrites the *text node* of each chip to the short form and adds `sr-only` text; it finds the node by type, so a change of the chip's inner markup that keeps one text node is harmless; a chip with no text node is left as it is (full label, one-line row still works, only wider).
- The index and the home page build chips from a *partial problem* (`{ address }` or `{ names }`) on the home page: `chips` appends only the chips whose field is valid, so each call yields exactly one chip.
- `station-kit.js`, `walk.js`, `listen.js`, `rehearse.js` are not imported. The Walk's `problems` stop still opens `#problems-todo` and still ticks on a click of an element whose id starts `problems-tick-`; both are kept.
- Nothing in this goal edits `css/*.css`, `index.html`, `js/app.js`, `js/registry.js` or `js/core/*`.

---

## 5. Algorithms (numbered pseudocode)

Appendix A and B are the same algorithms as code; this section is what each does and why, in the order a builder meets it.

### 5.1 Pure helpers of `problems.js` (all import in Node)

1. **`deckState(raw)`**. `r = raw` if it is a non-null object, else `{}`. `mode = r.mode === 'all' ? 'all' : 'one'`. Walk `r.open` if it is an array (else `[]`); keep an element only if it is a string, `problemById` knows it, and it has not been seen (so a topic id, a junk string and a duplicate are dropped); keep first-seen order.
   Return `{ open: mode === 'one' ? kept.slice(-1) : kept, mode }`: in mode one the **last** id wins (it is the one opened most recently), because `open` is kept in opening order. The result is built fresh (the caller may mutate it; the store's copy is not touched).
2. **`namesFilterMatches(p, names)`**. A non-object `p` is `false`. If `names` is not one of `NAMES_CODES` (this includes `'all-names'`, `undefined`, `null`, junk) the answer is `true`. Otherwise `p.names === names`.
3. **`namesCounts(problems)`**. Start `{ none: 0, any: 0, all: 0, home: 0, continuous: 0 }` in `NAMES_CODES` order; add one for every problem whose `names` is a code. On the 29: `{ none: 11, any: 12, all: 3, home: 2, continuous: 1 }`.
4. **`normalizeFilter(raw)`**. `chapter` is kept if it is one of `all, 1, 2, 3, P` else `all`; `todo` is `true` only for the boolean `true`; `names` is kept if it is in `NAMES_FILTERS` else `all-names`. So the stored filter can never put the deck in a state it cannot leave.
5. **`visibleIds(filter, progress, problems)`**. `f = normalizeFilter(filter)`; keep problems for which `filterMatches(p, f.chapter) && namesFilterMatches(p, f.names) && (!f.todo || progress[p.id] !== true)`; return their ids in handout order. A topic tick in `progress` has no effect (its key is a topic id).
6. **`filterLabel(filter)`**. Parts, in this order and joined with `, `: `Proofs` (chapter `P`) or `Chapter N`; `names: <code>` (names not `all-names`); `not ticked yet` (todo). Empty string when nothing is filtered. The count line is `Showing ${n} of 29` + (`: ` + label when non-empty) + `.`, which keeps the iteration-1 text `Showing 3 of 29: Chapter 3.`.
7. **`parseProblemsToken(token)`**. `t = lower-case String(token ?? '')`. Result starts `{ chapter: 'all', todo: false }`. `'1'|'2'|'3'` set `chapter`; `'p'` sets `chapter = 'P'`; `'todo'` sets `todo = true`; otherwise if `t` matches `^names-(all-names|none|any|all|home|continuous)$` add `names: <match>` (alternation order matters: `all-names` before `all`, and the `$` anchor makes `names-all-names-x` miss). Anything else leaves the defaults.
8. **`sanitizeScores(raw)`**. `{}` unless `raw` is a non-array object. For each key that `problemById` knows and whose value is a non-null object: `count(v) = floor(v)` for a finite number above 0, else 0; `right = count(v.right)`; `tried = max(count(v.tried), right)`; `last = v.last` if a finite number above 0 else 0. **`rehearsedIds(scores, problems)`**: the ids of `problems` (handout order) whose cleaned `right >= 1`.

### 5.2 `mount(el, ctx)` of the index, in order

1. `t0 = performance.now()`; inject the style tag; define `safeGet`, `safeSet`, `safeRemove` (each is a `try { store... } catch {}`).
2. State: `progress = sanitizeProgress(get progress)`; `predict = (get problems.predict) === true`; `scores = sanitizeScores(get rehearse.scores)`; `filter = normalizeFilter(get problems.filter)`; if `ctx.preset.kind === 'token'`: `f = parseProblemsToken(token)`, then `filter = { chapter: f.chapter, todo: f.todo, names: f.names || 'all-names' }` (a token replaces the stored filter, as in iteration 1); `deck = deckState(get problems.deck)`; `revealed = new Set()`.
3. Build header (title, lede, thread badges), the tools panel (progress row, `Show` chips, `Names` chips, `Rows` controls, predict, count, key, status), the balance panel, an empty `#problems-deck[data-predict]` and the empty message.
4. For each group `1, 2, 3, P` in turn: a `div.pc-list` holding `buildCard(p)` for the problems that `filterMatches(p, group)` (so each problem appears in exactly one group: the `P` group is the proofs, `chapter 0`), wrapped in `section#problems-group-<key>` with an `h2`. Append the groups and the empty message to the deck.
5. Build the 12 topic rows (5.7) and the links nav (`stationNeighbours(STATIONS, 'problems')`: prev `rehearse`, no next, thread links, home).
6. `el.append(header, tools, balancePanel, deck, topics, links)`.
7. Restore: for each id in `deck.open` set `data-open="true"`, `aria-expanded="true"`, show the body. (No answer is revealed.)
8. `applyFilters()` (5.5); `renderBalance()`; `balancePanel.hidden = predict`; `renderProgress()`; `paintRehearsed()`; `updateDeckButtons()`.
9. `mountMs = performance.now() - t0`; publish `window.__mv.problems`; add the `window` `resize` listener last; return `unmount`.

### 5.3 `buildCard(p)` (the row and the body)

1. `k = idKey(p.id)`; `tones = set of addressTones(p.address)`; `data-tone = tones.size >= 2 ? 'both' : tones.has('--cart') ? 'cart' : 'polar'` (the same rule as the balance strip).
2. Row, in DOM order: `button#problems-open-<k>.pc-open` (chevron span, `aria-expanded="false"`, `aria-label="Details of problem <id>"`); `h3#problems-card-<k>-title.pc-title` = `span.badge.pc-id` (the id) + `span.pc-section` (the section); `div.pc-statement` filled by `appendStatement(statement, statementParts(p.statement), 'pc-math')` (unchanged: a maths part and the punctuation after it stay in one nowrap run);
   `div.pc-actions` = chips + Rehearse + tick.
3. Chips: `decisions = chips(p, { idPrefix: 'problems-card-' + k, meaning: false })` inside `try`; on success `compactChips(decisions, p)`: for the address chip set its text node to `addressLabel(p.address, { short: true })` and append `<span class="sr-only">, <full label></span>`; for the names chip set the text node to `p.names` and insert `<span class="sr-only">Names: </span>` before it. On a throw: log, and use a plain `span.decisions` with the two codes.
4. Rehearse: `a#problems-rehearse-<k>.chip.pc-rehearse[href="#rehearse-<k>"]`, text "Rehearse", `data-rehearsed="false"`, `title`, `aria-label`. Tick: `input#problems-tick-<k>` (checked from `progress`) inside `label.check.pc-tick` with the visible word "Got it" (`span.pc-tick-text`) and `sr-only` " (problem <id>)".
5. Body `div.pc-body[hidden]` (no id): `div.pc-hint` = place line (`Lives at` + `a.chip.station-chip[href="#problem-<k>"]` showing the station id + `span.muted` holding `titleSpan(st.title)`, + `span.pc-also` with one `a.chip` per `alsoAt`), address line (dots, `addressLabel`, `addressWhy` through `prose`), names line (`Names: <code>.` in bold + `namesMeaning(p.names)`), aha line (`The aha.` + `aha` through `prose`);
   then `p.pc-predict-note`; then `div.pc-reveal-row` with `button#problems-reveal-<k>`; then `div#problems-answer-<k>.answer[hidden]`, empty until the first reveal.
6. Record `rec = { card, answer, btn, openBtn, body, tick, rehearse, built: false, problem: p }` in `cards`; the tick gets a `change` listener (`setTick`). Everything else is delegated (5.6).

### 5.4 The open, collapse and reveal state machine

State: `deck = { open: id[], mode }`, `revealed: Set<id>`. Invariants after every user action: (I1) `revealed ⊆ deck.open`; (I2) in mode one `deck.open.length <= 1`; (I3) the DOM mirrors the state: `data-open`, the toggle's `aria-expanded` and `body.hidden`; `data-revealed`, the Reveal button's text and `aria-expanded`, and `answer.hidden`; (I4) `problems.deck` in the store equals `deck` and the three buttons (`Collapse all`, `Hide all answers`, the mode chips) are in step.

1. **`setRevealed(id, on)`**. On: if the answer was never built, build it (`buildAnswer`, in `try`; on a throw log and put the plain-text fallback); show it; `data-revealed="true"`; Reveal text "Hide the answer", `aria-expanded="true"`; add to `revealed`; re-measure the "Scroll sideways" hint now and again when `document.fonts.ready` resolves. Off: hide it; `data-revealed="false"`; text "Show the answer"; remove from `revealed`. The built answer stays in the DOM.
2. **`collapse(id)`**: `setRevealed(id, false)`; `data-open="false"`, `aria-expanded="false"`, `body.hidden = true`; remove `id` from `deck.open`. (A collapsed row forgets its answer: this is also what makes predict-first hide its chips again.)
3. **`expand(id)`**: in mode one, `collapse(other)` for every other id in `deck.open`; push `id` if absent; `data-open="true"`, `aria-expanded="true"`, `body.hidden = false`.
4. **`setOpen(id, on, { say, scroll })`**: `expand` or `collapse`; `saveDeck()` (writes `problems.deck` with `persist: false`, then `updateDeckButtons()`); announce "Opened problem <id>." or "Collapsed problem <id>." in `#problems-deck-status` unless `say` is false; on a user open, `card.scrollIntoView({ block: 'nearest' })` (the page's `scroll-padding-top` keeps it clear of the header; no smooth scrolling).
5. **`toggleReveal(id)`**: if the card is not open, `setOpen(id, true, { say: false })` first (this is why a script or the iteration-1 I8 sweep that presses a hidden Reveal button gets a coherent page); then `setRevealed(id, answer.hidden)`.
6. **`setMode(m)`**: `deck.mode = m === 'all' ? 'all' : 'one'`; for `one`, `collapse` every id except the **last** of `deck.open`; `saveDeck()`.
7. **`openAllShown()`**: `deck.mode = 'all'`; `expand(id)` for every card not `hidden` by the filters, in DOM order; `saveDeck()`; announce "Opened N problems.".
8. **`collapseAll()`**: `collapse` every id in a copy of `deck.open`; `saveDeck()`; announce "Collapsed all rows.". **Hide all answers**: `setRevealed(id, false)` for every id in a copy of `revealed`; announce "Answers hidden.".
9. A card hidden by a filter keeps its open state; `deck().open` lists it; it is closed by Collapse all or by opening another row in mode one.

### 5.5 Filters

`applyFilters()`: `show = new Set(visibleIds(filter, progress))`; for every card set `hidden = !show.has(id)`; for every group set `hidden` when it has no visible card; `#problems-count` text = `Showing ${show.size} of 29` + `filterLabel`; `#problems-empty.hidden = show.size > 0`; set `aria-pressed` on the chapter chips (`key === filter.chapter`), the names chips (`key === filter.names`) and the todo chip (`filter.todo`); write `problems.filter` (`persist: false`). The three kinds of chip only set one field and call `applyFilters()`; **Show all** resets all three.
Ticking a card under "Not ticked yet" updates `progress`, `data-done`, the count on the chip and the progress bar but does **not** call `applyFilters()` (the card must not vanish under the pointer; iteration-1 rule).

### 5.6 Hit testing: one delegated `click`, one delegated `keydown`

1. `click` on `#problems-deck`: `t = event.target` (an Element); `card = t.closest('.problem-card')`; none: return. `id = card.dataset.problem`.
2. If `t.closest('.reveal')`: `toggleReveal(id)`. Else if `t.closest('.pc-open')`: `setOpen(id, card.dataset.open !== 'true', { scroll: true })`. Else if the card is **collapsed** and `t.closest('.pc-statement, .pc-title')` and `t` is not inside `a, button, label, input`: `setOpen(id, true, { scroll: true })`. Otherwise nothing (links, chips and ticks do their own thing).
3. `keydown` on `#problems-deck`: `card = t.closest('.problem-card')`; none: return. **Escape** on an open card: `preventDefault`, `setOpen(id, false)`, focus that card's toggle. Otherwise, if `t` is a `.pc-open` and the key is ArrowDown, ArrowUp, Home or End: `btns` = the `.pc-open` of every card that is not `hidden`, in DOM order; `j` = `0` for Home, `btns.length - 1` for End, else `i ± 1` clamped to the list; `preventDefault`; focus `btns[j]`. (The list is rebuilt on each key press: 29 elements.)

### 5.7 Topic rows

For each topic: `k = idKey(id)`; build the body (summary and covers through `prose`, the station chips through `titleSpan(shortTitle(title))`, the problem chips `a.chip.problem-chip[href="#problem-..."]`, the start button `a#problems-topic-start-<k>` with `titleSpan('Start at ' + title)`); build the row: toggle `button#problems-topic-open-<k>`, `h3.tc-title` (id badge and title), actions (thread badge, `problemCount(n)`, the tick `input#problems-topic-tick-<k>` in a `label.check.pc-tick` "I can explain this"). The toggle flips `data-open`, `aria-expanded` and `body.hidden`; it touches no other state. Ticks go through `setTick` like a problem's (a topic id is valid in `progress`, not counted in the 29).

### 5.8 Home: `layoutMap(stations, width, threads, problems)` (pure)

Unchanged skeleton; the numbers and the captions change. `K = GEOM`; `list` = stations sorted by `order`; `W = max(280, round(width || 360))`; `mode = W >= WIDE_MIN ? 'wide' : 'narrow'` with `WIDE_MIN = 780`; `laneOf(k) = ((T - 1) / 2 - k) * LANE` (T = number of threads: lanes +9, 0, −9).

**Wide.**
1. `colW = (W - 2·PADX) / COLS` with `PADX = 24`, `COLS = 8`; `maxChars = floor((colW - 12) / CHAR_W)` (`CHAR_W = 6.6`).
2. For station index `i`: `row = floor(i / COLS)`, `c = i mod COLS`, `dir = row even ? +1 : −1`, `col = dir > 0 ? c : COLS - 1 - c`; `x = PADX + colW·(col + ½)`, `y = TOP + PITCH·row` (`TOP = 64`, `PITCH = 156`); `turn = (c === COLS - 1) && i + 1 < n` (the last column of a row that continues).
3. Node: `pill = { x - 13, y - 20, 26, 40 }`; `num = { x, y - 27, 'middle', String(order) }`; `label = { x, y + 36, 'middle', wrapLabel(typesetTitle(shortTitle(title)), turn ? min(maxChars - 4, 14) : maxChars) }` (at most 3 lines, an ellipsis if cut); `dots` = one per problem whose `station` is this node, `x + (j - (m - 1)/2)·10`, `y + 84`; `hit = { x - colW/2, y - 34, colW, 126 }`.
4. **Captions (new).** `firsts` = the nodes whose part differs from the previous node's (and node 0). For each: `text = part + ' · ' + PART_LABELS[part]`, `w = 7 · text.length` (`CAP_W`); `along = dir > 0 ? 'start' : 'end'`; `fits('start') = x - 12 + w <= W - 4`, `fits('end') = x + 12 - w >= 4` (`CAP_EDGE`); `anchor = fits(along) ? along : the other one`; caption `{ part, text, cont: false, x: anchor === 'start' ? x - 12 : x + 12, y: y - 44, anchor, node: id }`. There are no continuation captions.
5. `rows = ceil(n / COLS)` (3); `height = TOP + PITCH·(rows - 1) + BOTTOM` (`BOTTOM = 100`) = 476.
6. **Threads** (unchanged): members = stations on the thread; `first`, `last` = the orders of the first and last member (0 and 21 for all three); `lanePt(node) = (x, y - dir·s)`; the path visits every node between `first` and `last` (not only members), `M` then `L`; between rows it inserts `L xT, y - dir·s` then `A rx ry 0 0 sweep xT, y_next - dir_next·s` with `xT = x + dir·(PILL_W/2 + 6)`, `right = row even`, `sign = right ? +1 : −1`, `rx = colW/2 - 8 + sign·s`, `ry = PITCH/2 + sign·s`, `sweep = right ? 1 : 0`. Stops are the lane points of the members.

**Narrow** (unchanged algorithm, 22 stations): a vertical track; part captions at `x = 78`; `y` advances by `N_PART_H = 30` at each part start and `N_PITCH = 48` per station; label one line (squeezed by `textLength` on the page if wider than the room).

### 5.9 Home: render and progress

`renderMap(g)` is the iteration-1 function (replace children of `#home-map`, caption group, strands, stations with pill, stops, number, label, dots; restore focus; `applyFocus()`; `paintProgress()`); the only change is the label text, now `stationLabel(st, progress, rehearsed)`.
`paintProgress()`: `progress = sanitizeProgress(get progress)`; `rehearsed = rehearsedIds(sanitizeScores(get rehearse.scores))`; for each `circle.pdot`: toggle `is-done` by `progress[id] === true` and `is-rehearsed` by membership in `rehearsed`; refresh each place's `aria-label` and `<title>`; the progress line "Ticked N of 29 problems. Rehearsed M of 29 with fresh numbers.".
`decisionBlock()` (5.10) feeds the new panel, built once at mount; the chips come from `decisions.chips({ address: code })` and `chips({ names: code })` with `idPrefix` `home-decision-address-chip-<code with every run of non-letters replaced by '-'>` and `home-decision-names-chip-<code>`.

### 5.10 `decisionBlock(problems)` and `stationLabel(st, progress, rehearsed, problems)`

1. `decisionBlock`: `counts = namesCounts(problems)`; `address` = for each code in `ADDRESS_CODES`: `{ code, label: addressLabel(code), meaning: addressMeaning(code) }`; `names` = for each code in `NAMES_CODES`: `{ code, count: counts[code], countText: problemCount(counts[code]), meaning: namesMeaning(code), route: 'problems-names-' + code }`.
2. `stationLabel`: `ids` = the ids of `problems` whose `station` is `st.id`; `done` = how many are ticked; `re` = `new Set(rehearsed)`, `rehearsedHere` = how many of `ids` are in it; `probs` = `'none'` if `ids` is empty else `ids.join(', ')` + (`, <done> of <n> ticked` if `done`) + (`, <k> rehearsed` if `rehearsedHere`); return `${typesetTitle(st.title)}. Place ${st.order}. Problems: ${probs}. Threads: ${st.threads.join(', ')}.`.

### 5.11 Resolution management and timing

There is no canvas. The map is an SVG whose `viewBox` is `0 0 W height` with `W` the host's measured width, so one SVG unit is one CSS pixel at every width (a Retina screen needs nothing). `relayout()` runs from a `ResizeObserver` on `#home-map-host` (a `window` `resize` listener if the browser has none), through one `requestAnimationFrame`; it measures `round(host.clientWidth)` (360 when 0), returns if it equals the last width, else recomputes `layoutMap` and re-renders. The index has no layout JS at all: the one-line rows, the two-line phone rows and the fades are CSS; its `resize` listener only re-measures the "Scroll sideways" hint of answers that are showing.
Timing: no animation. The chevron turns by a `transform` swap without a transition. The only timer is the 4 s arm of **Clear all ticks** (cleared on unmount).

### 5.12 How a row is laid out (the CSS algorithm)

1. `.pc-row` is a grid with `align-items: center`, `column-gap: 0.5rem`, `min-height: 2.5rem`. The areas are chosen by state and width (3.3); the statement's grid area is `minmax(0, 1fr)` so it can shrink below its content, which is what lets `overflow: hidden` cut it.
2. `.pc-statement { position: relative }` is required: it makes the statement the containing block of KaTeX's absolutely positioned MathML, so the clip applies to it (0.1 item 8).
3. The cut is a mask, not an ellipsis (3.3). Open, the mask and the nowrap are removed.
4. The body is indented by the toggle's width on desktop and by one `--space-2` on the phone (the row's second line already starts under the number).
5. Predict-first is three rules on `.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"])`: `.decisions` and `.pc-hint` `display: none`, `.pc-predict-note` `display: block`, and the stripe's `--tone` and `::before` background reset to `--border-strong`. The balance panel is hidden by `balancePanel.hidden`.

---

## 6. Mathematics

### 6.1 Formulas the page uses

**The map (wide).** With `W` the host width in px, `n = 22`, `COLS = 8`, `PADX = 24`, `TOP = 64`, `PITCH = 156`, `BOTTOM = 100`, `PILL_W = 26`, `LANE = 9`:

- `colW = (W − 48) / 8`. Station `i` (0-based): `row = ⌊i / 8⌋`, `c = i mod 8`, `dir = (−1)^row`, `col = c` for `dir = +1`, `7 − c` for `dir = −1`.
- `x_i = 24 + colW·(col + ½)`, `y_i = 64 + 156·row`. `rows = ⌈22 / 8⌉ = 3` (8, 8, 6 stations). `height = 64 + 156·2 + 100 = 476`.
- Label wrap width `maxChars = ⌊(colW − 12) / 6.6⌋`, and `min(maxChars − 4, 14)` for the last column of a row that continues (orders 7 and 15).
- Thread lane `s_k = (1 − k)·9` for `k = 0, 1, 2` = `+9, 0, −9`; a lane point is `(x, y − dir·s_k)`.
- U-turn arc between row `r` and `r + 1`: from `(x_T, y_r − dir_r·s)` to `(x_T, y_{r+1} − dir_{r+1}·s)`, `x_T = x + dir·(13 + 6)`, radii `rx = colW/2 − 8 + σ·s`, `ry = 78 + σ·s`, `σ = +1` for the right-hand turn (row 0 to 1), `−1` for the left-hand turn (row 1 to 2). The arc's far edge is `x_T + rx = (W − 24 − colW/2) + 19 + colW/2 − 8 + 9 = W − 4` for `s = +9`: always 4 px inside the map, whatever `W` is. For the left turn the far edge is `x_T − rx`: `22` for T1 (`σ·s = −9`) and `4` for T3 (`σ·s = +9`), so T3's arc is the one that comes closest to the left edge, again 4 px.
- Caption `i` (width `w = 7·len`): anchored `start` at `x − 12` when `x − 12 + w ≤ W − 4`; anchored `end` at `x + 12` when `x + 12 − w ≥ 4`; the reading direction is tried first. Its `y = y_row − 44`, which is always above the station number (`y_row − 27`, text top about `y_row − 37`).
- **`WIDE_MIN`.** The longest unbreakable wrap is "Slide, Spin, Stretch, Mirror": three lines need 12 characters a line (`"Slide, Spin,"` is 12), i.e. `maxChars ≥ 12` ⇔ `(colW − 12)/6.6 ≥ 12` ⇔ `colW ≥ 91.2` ⇔ `W ≥ 48 + 8·91.2 = 777.6`, so the first integer width is **778**; 780 is used. At 779 and below the title would need a fourth line (`'Stretch,…'`), which would run into the dots row 48 px below the first label line.
- **Narrow.** `height = N_TOP + N_PART_H·5 + N_PITCH·22 + N_BOTTOM = 8 + 150 + 1056 + 12 = 1226`; station `o`: `y = 8 + 30·k(o) + 48·o + 24` with `k(o)` the number of parts started up to and including `o`'s part (parts start at orders 0, 7, 9, 16, 18): `o = 0, 7, 14, 21` give `62, 428, 794, 1190`; the five captions are at `y = 8 + 30·(k − 1) + 48·o_start + 20` = `28, 394, 520, 886, 1012`.

**The deck (desktop height model, approximate).** Page = header (181) + tools (345) + balance (116) + four groups (each 16 px above, a 33 px heading, then its rows) + rows (29 × 50 + 25 gaps of 6, plus 9 and 3 px for the two tall statements) + topics (heading and note, then 12 rows of 50 with 6 px gaps) + links and footer + the gaps between panels. Measured: **3,598 px**. The budget of 4,000 leaves 402 px; if a later iteration adds more, the squeezes in order are: put the balance strip inside the tools panel (−116), drop the key line (−50), fold the `Names` row into the `Rows` row (−46).
The phone model: 29 rows of 100 px + 6 px gap (3,074) + topics 12 × 100 + 6 (1,272, measured 1,384 with the heading) + tools 689 + header, balance, links, footer. Measured **6,267 px** of 7,500.

**Counts.** `|none| + |any| + |all| + |home| + |continuous| = 11 + 12 + 3 + 2 + 1 = 29`; `|C| + |P| + |mixed| = 10 + 12 + 7 = 29` (the balance strip); `|chapter 1| + |chapter 2| + |chapter 3| + |proofs| = 11 + 8 + 3 + 7 = 29`. Names within chapter 1: none 6 (1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.5.1, 1.5.2), any 1 (1.3.2), all 3 (1.4.1 to 1.4.3), home 1 (1.3.1): 6 + 1 + 3 + 1 = 11. Within chapter 2: none 1 (2.1.2), any 5, home 1 (2.2.2), continuous 1 (2.4.1): 8. Chapter 3: none 2 (3.1.1, 3.2.1), any 1 (3.1.2): 3. Proofs: none 2 (P3, P7), any 5: 7.

### 6.2 Worked numbers of the map at W = 1000 (unit test U4) and at 918

At `W = 1000`: `colW = 952 / 8 = 119`; `x` for orders `0, 7, 8, 15, 16, 21` = `24 + 119·0.5 = 83.5`, `24 + 119·7.5 = 916.5`, `916.5` (order 8 is column 7 of the reversed row), `83.5`, `83.5`, `24 + 119·5.5 = 678.5`; `y` of rows 0, 1, 2 = `64, 220, 376`; `maxChars = ⌊107/6.6⌋ = 16`. Captions: part I at `x = 83.5`, `dir +1`, `w = 7·20 = 140`: `83.5 − 12 + 140 = 211.5 ≤ 996` so `start` at **71.5**; part II (node 7, `x = 916.5`): `start` needs `916.5 − 12 + 189 = 1093.5 ≤ 996`: no, so `end` at `916.5 + 12 = 928.5` (`928.5 − 189 = 739.5 ≥ 4`); part III (order 9 is column 6 of row 1, `x = 797.5`, `dir −1`): `end` at **809.5** (`809.5 − 140 ≥ 4`), `y = 220 − 44 = 176`; part IV (order 16, `x = 83.5`): `start` at 71.5, `y = 332`; part V (order 18, column 2, `x = 321.5`): `start` at **309.5** (`309.5 + 161 = 470.5 ≤ 996`), `y = 332`.
T2's path at the right turn: `…L916.5 64 L935.5 64 A51.5 78 0 0 1 935.5 220 L916.5 220…` (`s = 0`: `rx = 59.5 − 8 = 51.5`, `ry = 78`, `x_T = 916.5 + 19`), and at the left turn `…L83.5 220 L64.5 220 A51.5 78 0 0 0 64.5 376 L83.5 376…`. T1 (`s = 9`) starts `M83.5 55` and ends `L678.5 367`; T3 (`s = −9`) starts `M83.5 73` and ends `L678.5 385`. The arithmetic place: label lines `['Slide, Spin,', 'Stretch, Mirror']`, four dots at `x = 306.5, 316.5, 326.5, 336.5`, `y = 148`.
At `W = 918` (the real 1280 px desktop): `colW = 108.75`, `maxChars = 14`, so "Slide, Spin, Stretch, Mirror" wraps to three lines (`Slide, Spin,` / `Stretch,` / `Mirror`), its last baseline 65 px below the pill's centre, clear of the dots row (80 px): the sweep U6 asserts it. At `W = 780`: `colW = 91.5`, `x_0 = 69.75`.

### 6.3 Every review problem, in both addresses (what the index shows from `js/data/problems.js`; the unit test recomputes each)

Each line was computed by hand and then re-run against `js/core/complex.js` in the scratch copy (`mul`, `div`, `pow`, `rootsOf`, `quadraticRoots`, `principalRoot`, `branchRoot`, `localLinear`); all agree to the digits shown. "Names" is the second decision.

**1.1.1** `z₁ = 3 − 2i`, `z₂ = −1 + 4i`. Names: none.
- Cartesian (native): `z₁z₂ = (3·(−1) − (−2)·4) + i(3·4 + (−1)(−2)) = (−3 + 8) + i(12 + 2) = 5 + 14i`. `z₁/z₂ = ((3)(−1) + (−2)(4))/(1 + 16) + i((−3)(4) + (−1)(−2))/17 = −11/17 − (10/17)i ≈ −0.647 − 0.588i`.
- Polar (the check): `|z₁| = √13 ≈ 3.606`, `Arg z₁ = atan2(−2, 3) = −0.588` (−33.69°); `|z₂| = √17 ≈ 4.123`, `Arg z₂ = atan2(4, −1) = π − atan 4 = 1.816` (104.04°). Product: modulus `√13·√17 = √221 ≈ 14.866`, `Arg = −0.588 + 1.816 = 1.228` (70.35°); and `|5 + 14i| = √(25 + 196) = √221`, `atan2(14, 5) = 1.228` ✓. Quotient: modulus `√(13/17) ≈ 0.8745`, `Arg = −0.588 − 1.816 = −2.404` (−137.73°, inside (−π, π]); and `|−11/17 − 10i/17| = √221/17 = 0.8745` ✓, `atan2(−10, −11) = −(π − atan(10/11)) = −2.404` ✓.

**1.1.2** Names: none. Cartesian: `z₁ − z₂ = 4 − 6i`, `conj = 4 + 6i`, `Im = 6`. Polar: `|4 − 6i| = √52 = 2√13 ≈ 7.211`, `Arg = atan2(−6, 4) = −0.983` (−56.31°); the mirror negates the angle (`+0.983`), and `Im = r sin(0.983) = 7.211 · 0.8321 = 6.000` ✓.

**1.2.1** `|z − (1 + 2i)| = 3`. Names: none. Cartesian: `(x − 1)² + (y − 2)² = 9`, the circle with centre `(1, 2)` and radius 3. Polar (native): `z − a = 3e^{iφ}` for `φ ∈ [0, 2π)`, so `z = (1 + 2i) + 3e^{iφ}`: `φ = 0, π/2, π, 3π/2` give `4 + 2i`, `1 + 5i`, `−2 + 2i`, `1 − i`. The origin is inside (`|1 + 2i| = √5 ≈ 2.236 < 3`).

**1.2.2** Names: none. Cartesian (native): `(4 + 3i) − (−1 + i) = 5 + 2i`, `|5 + 2i| = √29 ≈ 5.385`. Polar: the slide has length `√29` and direction `atan2(2, 5) = 0.3805` (21.80°). As a check by the law of cosines: `|4 + 3i| = 5` at `0.6435`, `|−1 + i| = √2` at `3π/4 = 2.3562`, angle between `1.7127`, `cos 1.7127 = −1/(5√2) = −0.1414`; `d² = 25 + 2 − 2·5·√2·(−0.1414) = 27 + 2 = 29` ✓.

**1.3.1** `z = −1 + i√3`. Names: **home** (the question asks for `Arg z`). Cartesian to polar: `r = √(1 + 3) = 2`; `Arg z = atan2(√3, −1) = π − atan √3 = π − π/3 = 2π/3` (120°); `z = 2(cos 2π/3 + i sin 2π/3) = 2e^{i2π/3}`. Back: `2 cos 2π/3 = −1`, `2 sin 2π/3 = √3` ✓. `arg z = {2π/3 + 2πk}`, `Arg z = 2π/3` is the one in `(−π, π]`.

**1.3.2** `(√3 + i)^10`. Names: any (report the final angle on the home step). Polar (native): `r = 2`, `θ = π/6`; `r^10 = 1024`; `10θ = 5π/3`, which is `−π/3` on the home step; `1024(cos(−π/3) + i sin(−π/3)) = 1024(½ − (√3/2)i) = 512 − 512√3 i ≈ 512 − 886.81i`. Cartesian by squaring: `(√3 + i)² = 2 + 2√3 i`; `^4 = (2 + 2√3 i)² = 4 − 12 + 8√3 i = −8 + 8√3 i`; `^8 = (−8 + 8√3 i)² = 64 − 192 − 128√3 i = −128 − 128√3 i`; `^10 = ^8·^2 = (−128 − 128√3 i)(2 + 2√3 i) = (−256 + 768) + i(−256√3 − 256√3) = 512 − 512√3 i` ✓.

**1.4.1** 5th roots of unity. Names: **all**. Polar (native): `e^{2πik/5}`, `k = 0…4`, angles `0, 72°, 144°, 216°, 288°` = Arg `0, 2π/5, 4π/5, −4π/5, −2π/5`. Cartesian: `cos 72° = (√5 − 1)/4 = 0.3090`, `sin 72° = 0.9511`, `cos 144° = −(√5 + 1)/4 = −0.8090`, `sin 144° = 0.5878`: `1`, `0.309 + 0.951i`, `−0.809 + 0.588i`, `−0.809 − 0.588i`, `0.309 − 0.951i`. Check: the roots sum to `1 + 2(0.3090) + 2(−0.8090) = 0` (the coefficient of `z⁴` in `z⁵ − 1` is 0). Primitive: `gcd(k, 5) = 1` for `k = 1…4`, so all but `k = 0`.

**1.4.2** 4th roots of −16. Names: **all**. Polar: `−16 = 16e^{iπ}`; radius `16^{1/4} = 2`; angles `(π + 2πk)/4 = π/4 + kπ/2`, `k = 0…3` = `π/4, 3π/4, 5π/4, 7π/4` (Arg `π/4, 3π/4, −3π/4, −π/4`); `k = 4` repeats `k = 0`. Cartesian: `2(cos 45° + i sin 45°) = 2·(√2/2)(1 + i) = √2 + √2 i ≈ 1.414 + 1.414i`; the four roots are `±√2 ± √2 i`. Check: `(√2(1 + i))⁴ = 4(1 + i)⁴ = 4(2i)² = −16` ✓ (`(1 + i)² = 2i`). By algebra: `z⁴ = −16` means `(z²)² = −16`, `z² = ±4i`, and `(√2 + √2 i)² = 2 − 2 + 4i = 4i` ✓.

**1.4.3** `z² − 4z + 13 = 0`. Names: all (the two square roots of −9). Cartesian (native): `b² − 4ac = 16 − 52 = −36`, `√−36 = 6i`, `z = (4 ± 6i)/2 = 2 ± 3i`. Polar: `(z − 2)² = −9 = 9e^{iπ}`, so `z − 2 = 3e^{iπ/2}` or `3e^{i3π/2}`, i.e. `±3i`; the roots have `|2 ± 3i| = √13 ≈ 3.606` and `Arg = ±atan2(3, 2) = ±0.983` (56.31°), a mirror pair. Check: sum `4` and product `(2 + 3i)(2 − 3i) = 13` ✓.

**1.5.1** Line from `2 + i` to `−3 − 3i`. Names: none. Cartesian (native): `z(t) = (2 + i) + t((−3 − 3i) − (2 + i)) = (2 + i) + t(−5 − 4i) = (2 − 5t) + i(1 − 4t)`, `0 ≤ t ≤ 1`; `t = 1` gives `−3 − 3i`, `t = ½` gives `−0.5 − i`. Polar: the direction `−5 − 4i` has length `√41 ≈ 6.403` and `Arg = atan2(−4, −5) = −(π − atan 0.8) = −2.467`; so `z(s) = (2 + i) + s·e^{−2.467i}`, `0 ≤ s ≤ √41` (arc length).

**1.5.2** `S = {1 < |z + i| ≤ 3}`. Names: none. Cartesian: `1 < x² + (y + 1)² ≤ 9`. Polar about the centre `−i`: `ρ = |z + i|`, `1 < ρ ≤ 3`, any angle: an annulus. Open? No: a point with `ρ = 3` (such as `3 − i` or `2i`: `|2i + i| = 3`) is in `S` but every disk about it reaches `ρ > 3`. Closed? No: a point of the inner circle (such as `1 − i`, or `0`: `|0 + i| = 1`) is a limit of points of `S` but is not in `S`. Bounded: `S ⊂ {|z + i| ≤ 3}`, so `|z| ≤ 4`. Boundary: the circles `ρ = 1` and `ρ = 3`. Domain? Connected yes, open no, so not a domain; it is a region (domain `1 < ρ < 3` plus the outer circle).

**2.1.1** `f(z) = z² + iz`. Names: any. Cartesian: `(x + iy)² + i(x + iy) = x² − y² + 2ixy + ix − y`, so `u = x² − y² − y`, `v = 2xy + x`. Polar (`θ` a name for `arg z`): `z² = r²e^{2iθ}`, `iz = re^{i(θ + π/2)} = r(−sin θ + i cos θ)`, so `u = r² cos 2θ − r sin θ`, `v = r² sin 2θ + r cos θ`. Check at `z = 1 + i`: Cartesian `u = 1 − 1 − 1 = −1`, `v = 2 + 1 = 3`; polar `r = √2`, `θ = π/4`: `u = 2 cos(π/2) − √2 sin(π/4) = 0 − 1 = −1`, `v = 2 sin(π/2) + √2 cos(π/4) = 2 + 1 = 3` ✓; at `2 + 3i`: `u = 4 − 9 − 3 = −8`, `v = 12 + 2 = 14`, and `f(2 + 3i) = −8 + 14i` ✓.

**2.1.2** `x = 2` under `w = z²`. Names: none. Cartesian (native): `z = 2 + iy`, `z² = (4 − y²) + 4iy`, so `u = 4 − y²`, `v = 4y`; eliminate `y = v/4`: `u = 4 − v²/16`, a parabola with vertex `4`, opening left, focus `0` (`u = 4 − v²/(4p)`, `4p = 16`, focus at `4 − p = 0`). Polar: on the line `r = 2 sec θ`, `θ ∈ (−π/2, π/2)`, so `w = 4 sec²θ · e^{2iθ}`: `R = 4/cos²(φ/2) = 8/(1 + cos φ)` with `φ = 2θ`, the polar equation of a parabola with focus at the origin. Check: `φ = 0` gives `R = 4` (the vertex); `φ = π/2` gives `R = 8`, the point `(0, 8)`, and `u = 4 − 64/16 = 0` at `v = 8` ✓; `z = 2 + i → w = 3 + 4i`; `z = 2 + 2i → w = 8i` ✓.

**2.1.3** `f(z) = iz − 2i` on `x = 2`. Names: any (`Arg i = π/2` is the turn). Cartesian: `z = 2 + iy`, `i(2 + iy) − 2i = 2i − y − 2i = −y`: the real axis `v = 0`, all of it. Polar (native for the motion): `iz − 2i = i(z − 2)`; `z − 2 = iy` is a vertical line through 0 after the slide; multiplying by `i = e^{iπ/2}` turns it a quarter turn counter-clockwise onto the real axis. In general `f` is a 90° rotation about the origin followed by a slide by `−2i` (equivalently: slide by `−2`, then rotate). Check: `z = 2 + 3i → −3`; `z = 2 → 0`; `z = 2 − 5i → 5`.

**2.2.1** `0 < arg z < π/4` under `w = z³`. Names: any (every name is multiplied by 3). Polar (native): `w = r³e^{3iθ}`; `3θ ∈ (0, 3π/4)` and `r³` covers `(0, ∞)`, so the image is the sector `0 < arg w < 3π/4`. Cartesian: the sector is `0 < y < x`; `w = (x³ − 3xy²) + i(3x²y − y³)`, and `Im w = y(3x² − y²) > 0` there. The edges: `y = 0` goes to `u = x³` (positive real axis); `y = x`: `z³ = x³(1 + i)³ = x³(−2 + 2i)`, direction `3π/4` ✓. Check: `z = 1 + 0.5i` (`arg = 0.4636 < π/4`): `z³ = 0.25 + 1.375i`, `Arg = 1.3909 = 3·0.4636` ✓, inside `(0, 2.356)`.

**2.2.2** `(2i)^{1/2}` principal. Names: **home**. Polar (native): `|2i| = 2`, `Arg(2i) = π/2`; `(2i)^{1/2} = √2 e^{iπ/4} = √2(√2/2 + i√2/2) = 1 + i`. The other root comes from the step `π/2 + 2π`: `√2e^{i5π/4} = −1 − i`. Cartesian: `(a + bi)² = 2i` gives `a² − b² = 0` and `2ab = 2`, so `a = b = ±1`; the principal root has `Re > 0`: `1 + i`.

**2.3.1** `lim (x² − y² + 2ixy)/(x² + y²)` along `y = x²`. Names: any (a direction). Cartesian: with `y = x²`: `(x² − x⁴ + 2ix³)/(x² + x⁴) = (1 − x² + 2ix)/(1 + x²) → 1` as `x → 0`; at `x = 0.001` the value is `0.999998 + 0.002i`. Polar: the expression is `z²/|z|² = e^{2iθ}` with `θ = Arg z`; along `y = x²` the angle is `atan x → 0`, so `e^{2iθ} → 1` (the curve arrives tangent to the real axis). The full limit does not exist: along the real axis it is `1`, along the imaginary axis `−1`.

**2.4.1** Cube root continuous on the negative real axis. Names: **continuous**. Polar: choose the window `0 < θ < 2π` (cut along the positive real axis): `f(z) = r^{1/3}e^{iθ/3}`; at `z = −r` (`θ = π`), `f(−r) = r^{1/3}e^{iπ/3}`; `f(−1) = ½ + (√3/2)i = 0.5 + 0.866i`. Just above and just below the negative axis the value is the same (`θ → π` from either side), so `f` is continuous there. Cartesian check: the principal branch (window `(−π, π]`) gives `0.5 + 0.866i` just above `−1` and `0.5 − 0.866i` just below: a jump of `√3 i`; on the positive real axis the new branch jumps instead (`1` above, `−0.5 + 0.866i` below).

**2.5.1** `|z − 1| = 1` under `w = 1/z`. Names: any. Cartesian: `(x − 1)² + y² = 1` gives `x² + y² = 2x`; `1/z = (x − iy)/(x² + y²) = (x − iy)/(2x)`, so `u = ½` (for `x ≠ 0`) and `v = −y/(2x)` takes every real value: the line `Re w = ½`. Polar (native): the circle through 0 is `r = 2 cos θ` with `θ = Arg z ∈ (−π/2, π/2)`; `1/z = (1/(2 cos θ))e^{−iθ} = ½ − (i/2)tan θ`. The point `0` goes to `∞`, which is why a circle through 0 must open into a line. Check: `z = 1 + i` (on the circle, `θ = π/4`): `1/z = (1 − i)/2 = 0.5 − 0.5i` and `½ − (i/2)(1)` ✓.

**3.1.1** `f(z) = z² + z`. Names: none. Cartesian (native): `(f(z + h) − f(z))/h = ((z + h)² + (z + h) − z² − z)/h = (2zh + h² + h)/h = 2z + 1 + h → 2z + 1` from every direction; at `z₀ = 1 + i`, `f′ = 3 + 2i`. Polar: with `h = ρe^{iφ}` the quotient is `2z + 1 + ρe^{iφ}`, a circle of radius `ρ` about `2z + 1` that shrinks to the point as `ρ → 0`; `A = 2z + 1`, `B = 0`; `|3 + 2i| = √13 ≈ 3.606` is the local stretch and `Arg(3 + 2i) = 0.588` (33.69°) the local turn.

**3.1.2** `f(z) = |z|²`. Names: any (the direction φ). Cartesian: `u = x² + y²`, `v = 0`: `u_x = 2x`, `v_y = 0` (equal only at `x = 0`), `u_y = 2y`, `−v_x = 0` (equal only at `y = 0`): Cauchy–Riemann holds only at the origin. Quotient: `(|z + h|² − |z|²)/h = (z h̄ + z̄ h + |h|²)/h = z̄ + z e^{−2iφ} + ρe^{−iφ} → z̄ + z e^{−2iφ}` for `h = ρe^{iφ}`: a circle with centre `z̄` and radius `|z|`, a single point only at `z = 0`, where `f′(0) = 0`. At `z = 1 + i`: centre `1 − i`, radius `√2` (`localLinear` gives `A = 1 − i`, `B = 1 + i`, `|B| = √2`). Differentiable only at 0, so nowhere analytic.

**3.2.1** `f = e^x(cos y + i sin y)`. Names: none. Cartesian (native): `u = e^x cos y`, `v = e^x sin y`; `u_x = e^x cos y = v_y`, `u_y = −e^x sin y = −v_x`; the partials are continuous everywhere, so `f` is entire, and `f′ = u_x + iv_x = e^x cos y + i e^x sin y = f`. Polar: `f = e^x e^{iy} = e^z`: stretch `e^x`, turn `y`; `f′ = f` has the same stretch and turn. Check: `f′(0) = 1`; at `z = iπ/2`, `f = i`; at `1 + i`, `f = 1.4687 + 2.2874i`, `|f| = e = 2.7183`, `Arg f = 1`.

**P1** `conj z₁ · conj z₂ = conj(z₁z₂)`. Names: any. Cartesian: `(x₁ − iy₁)(x₂ − iy₂) = x₁x₂ − y₁y₂ − i(x₁y₂ + x₂y₁)` and `z₁z₂ = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁)`; the conjugate of the latter is the former. Polar: the mirror negates the angle: `r₁e^{−iθ₁}·r₂e^{−iθ₂} = r₁r₂e^{−i(θ₁ + θ₂)} = conj(r₁r₂e^{i(θ₁ + θ₂)})`. Check with `3 − 2i` and `−1 + 4i`: `(3 + 2i)(−1 − 4i) = −3 + 8 + i(−12 − 2) = 5 − 14i = conj(5 + 14i)` ✓.

**P2** `|z| = √(z·conj z)`. Names: any. Cartesian: `z·z̄ = (x + iy)(x − iy) = x² + y² = |z|²`, whose square root is `|z|`. Polar: `re^{iθ}·re^{−iθ} = r²`; `√(r²) = r` since `r ≥ 0`. Check with `3 − 2i`: `z z̄ = 13`, `√13 = 3.606 = |z|`.

**P3** Composition of linear maps is linear. Names: none. Cartesian (native): `a(cz + d) + b = (ac)z + (ad + b)`, again of the form `Az + B`. With `a = i`, `b = −2i`, `c = 1 + i`, `d = 1`: `ac = i(1 + i) = −1 + i`, `ad + b = i − 2i = −i`. Check at `z = 0.3 + 0.7i`: `cz + d = 0.6 + i`, `a(·) + b = i(0.6 + i) − 2i = −1 − 1.4i`; `(−1 + i)(0.3 + 0.7i) − i = −1 − 1.4i` ✓. Polar: stretches multiply and turns add: `|ac| = |a||c| = 1·√2`, `Arg(ac) = π/2 + π/4 = 3π/4` ✓ (`−1 + i = √2e^{i3π/4}`).

**P4** `(1 + i)z` sends `|z| = 1` onto `|w| = √2`. Names: any. Cartesian: `|(1 + i)z| = |1 + i||z| = √2`; and onto: given `|w| = √2`, `z = w/(1 + i)` has `|z| = 1`. Polar (native): `1 + i = √2e^{iπ/4}`; `z = e^{iθ}` goes to `√2e^{i(θ + π/4)}`, and `θ + π/4` runs over a full turn when `θ` does. Check: `z = 1 → 1 + i`, `z = i → −1 + i`, both of modulus `√2`.

**P5** `lim_{z→0} (Re(1 + z) − 1)/z` does not exist. Names: any (a direction). Cartesian: the numerator is `x`; along the real axis `x/x = 1`, along the imaginary axis `0/(iy) = 0`: two different limits. Polar: `x/z = r cos θ/(re^{iθ}) = cos θ · e^{−iθ} = (1 + e^{−2iθ})/2`, which depends on `θ`: `θ = 0 → 1`, `θ = π/2 → 0`, `θ = π → 1`, `θ = π/4 → 0.5 − 0.5i`; all values lie on the circle with centre `½` and radius `½` (`A = B = ½`).

**P6** `Re z` is not differentiable. Names: any. Cartesian: `u = x`, `v = 0`: `u_x = 1 ≠ 0 = v_y`, so Cauchy–Riemann fails everywhere. Polar: the difference quotient `(Re(z + h) − Re z)/h = Re h/h = cos φ e^{−iφ}` is the same circle of radius ½ at every point (`localLinear(Re z)` gives `A = B = ½` at any point), a point only if `B = 0`, which it never is.

**P7** Entire with `u = c` implies `f` constant. Names: none. Cartesian (native): `u_x = u_y = 0`; Cauchy–Riemann `v_y = u_x = 0` and `v_x = −u_y = 0`; so `f′ = u_x + iv_x = 0` on the connected plane, and `f ≡ c + i·(constant)`. Polar: `f′ = 0` means the local map has zero stretch and no turn: every small disk is sent to a point.

### 6.4 The topics

The twelve topic rows show `title`, `thread` and the number of problems (`problemsForTopic`), here T1.1 4, T1.2 2, T1.3 3, T1.4 4, T1.5 2, T2.1 5, T2.2 2, T2.3 2, T2.4 1, T2.5 1, T3.1 3, T3.2 2 (read from `TOPICS`); their text is `TOPICS` and is never retyped.

---

## 7. Verification plan

### 7.1 One table (run from the repo root)

| Id | Command | Passing looks like |
|---|---|---|
| A1 | `node tools/smoke.mjs --route problems,problems-names-all --script tests/interact/i2-home-index-deck.mjs` | `ok` for both routes at desktop and phone (4 checks); the script logs (a) to (g) for `problems` and (a) for `problems-names-all` |
| A2 | `node tools/smoke.mjs --route home,home-T2 --script tests/interact/i2-home-index-deck.mjs` | `ok` x 4; the script logs (a) to (c) for `home`; `home-T2` asserts 10 dimmed places |
| A3 | `node --test tests/unit/i1-station-home-problems.test.mjs` | 45 tests, 0 failures (36 iteration-1 rows, of which U3 to U6, U10, U11 are moved, plus U22 to U30) |
| A4 | `node tools/smoke.mjs --route home,problems --script tests/interact/i1-station-home-problems.mjs --dark` | 6 of 6 (two routes, desktop, phone, dark) |
| A5 | `node tools/smoke.mjs --route home,home-T2,problems,problems-names-all,problems-todo --dark` | 15 of 15, no console error, page error, failed request, horizontal overflow or error panel |
| A6 | `node tools/smoke.mjs --route home,problems --out docs/review/iter-2/i2-home-index-deck` then read `problems--desktop.png`, `home--desktop.png` (and the phone and dark shots) | section 7.5 |
| all | `npm test`; `node tools/interact-all.mjs` | `npm test` is green apart from tests that other goals own (`I1` of `i1-integration` until `i2-rehearse` lands); the `i2-home-index-deck` row of `interact-all` runs `home`, `problems`, `problems-names-all` |

Run the three scripts of this goal (`i2-home-index-deck`, `i1-station-home-problems` and the unit file) before anything else; a green unit file with a red script usually means a missing `hidden` attribute or a card that was opened by the previous step.

### 7.2 Unit cases (A3), with expected values

`tests/unit/i1-station-home-problems.test.mjs` (Appendix C). Moved rows:

- **U3** `threadStops`: T1 = `home addresses arithmetic distance powers roots sets mappings linear powermap reciprocal derivative cauchy-riemann lab rehearse problems` (16), T2 = `home addresses staircase powers roots powermap principal-root branches lab graph4d rehearse problems` (12), T3 = `home curves sets mappings linear powermap reciprocal limits derivative cauchy-riemann lab graph4d rehearse problems` (14); `rehearse` is second to last of each.
- **U4** `layoutMap(STATIONS, 1000)`: `mode 'wide'`, `GEOM.COLS 8`, `height 476`, `rows 3`, `colW 119`, 22 nodes in rows of **8, 8, 6**; `x` of orders `[0, 7, 8, 15, 16, 21]` = `[83.5, 916.5, 916.5, 83.5, 83.5, 678.5]`; `y` of orders `[0, 8, 16]` = `[64, 220, 376]`; the last three nodes are `graph4d, rehearse, problems`; the five parts' texts `I · The point (Ch 1)`, `II · Curves and sets (Ch 1)`, `III · Motions (Ch 2)`, `IV · Zoom (Ch 3)`, `V · The diary and the index`, anchors `start, end, end, start, start`, `x` `[71.5, 928.5, 809.5, 71.5, 309.5]`, `y` `[20, 20, 176, 332, 332]`, nodes `home, curves, mappings, derivative, lab`; threads: dash `[false, true, false]`, stops `[16, 12, 14]`, `[first, last]` `[0, 21]` x 3, the T2 path string of 6.2, T1 starts `M83.5 55` and ends `L678.5 367`, T3 starts `M83.5 73` and ends `L678.5 385`; arithmetic label `['Slide, Spin,', 'Stretch, Mirror']` with dots at `x = [306.5, 316.5, 326.5, 336.5]`, `y = 148`; branches `['Branches and', 'Cuts']`; `rehearse` label `['The Rehearsal', 'Room']` and `dots = []`; `layoutMap(780)` wide with `colW 91.5`, `x₀ 69.75`; `779` narrow; no cut title at 780; `wrapLabel('Slide, Spin, Stretch, Mirror', 11)` ends in `…`, with 12 it does not.
- **U5** `layoutMap(STATIONS, 358)`: narrow, `height 1226`, 22 nodes all at `x 32`, `y` of orders `[0, 7, 14, 21]` = `[62, 428, 794, 1190]`, captions at `y = [28, 394, 520, 886, 1012]`, `x = 78`; T1 `d` starts `M23 62` and ends `L23 1190`, T3 starts `M41 62` and ends `L41 1190`, T2 starts `M32 62`; arithmetic label one line; `288` gives height 1226; `100` gives width 280.
- **U6** for every `W = WIDE_MIN (780), 784, …, 1160`: `validateWide(W)` is `[]` (no label, number, caption, dots row or U-turn arc collides or leaves the map) and no title is cut; also at 918.
- **U10** `stationNeighbours`: `problems` is `{ prev: 'rehearse', next: null, thread: { T1: { prev: 'rehearse', next: null }, T2: same, T3: same } }`; `rehearse` is `{ prev: 'graph4d', next: 'problems', thread: { T1: { prev: 'lab', next: 'problems' }, T2: { prev: 'graph4d', next: 'problems' }, T3: { prev: 'graph4d', next: 'problems' } } }`; `graph4d` is `{ prev: 'lab', next: 'rehearse', thread: { T2: { prev: 'lab', next: 'rehearse' }, T3: { prev: 'lab', next: 'rehearse' } } }`; `lab`'s `T1.next` is `rehearse`; `home` and `roots` rows are unchanged.
- **U11** `PART_LABELS` equals `{ I: 'The point (Ch 1)', II: 'Curves and sets (Ch 1)', III: 'Motions (Ch 2)', IV: 'Zoom (Ch 3)', V: 'The diary and the index' }`, has the keys of `PART_TITLES`, each starting with its title, and `home.js` does not type them; `WIDE_MIN 780`; `GEOM` frozen; `GEOM.COLS 8`.

New rows (the numbers are those of section 1 and 6):

- **U22** `deckState`: `null` and every non-object give `{ open: [], mode: 'one' }`; `{ open: ['1.4.2', 'zzz', '1.4.2', 'P3', 7], mode: 'all' }` gives `{ open: ['1.4.2', 'P3'], mode: 'all' }`; mode `one` with `['1.4.2', 'P3']` keeps `['P3']`; `{ open: '1.4.2' }` gives the default; a wrong mode is `one`; `['T1.4']` is dropped; the input is not mutated.
- **U23** `namesFilterMatches(1.4.2, 'all')` true, `'home'` false, `'all-names'`, `'bogus'`, `undefined`, `null`, `''` true; `(null, 'all')` false; the six filters select exactly the id lists of section 1; `namesCounts() = { none: 11, any: 12, all: 3, home: 2, continuous: 1 }`.
- **U24** `visibleIds`: `names all` = `[1.4.1, 1.4.2, 1.4.3]`; `home` = `[1.3.1, 2.2.2]`; `continuous` = `[2.4.1]`; `none` = the 11; `any` = the 12; `all-names` = 29; `{ chapter: '1', names: 'any' }` = `[1.3.2]`; `{ chapter: '2', names: 'any' }` = `[2.1.1, 2.1.3, 2.2.1, 2.3.1, 2.5.1]`; `{ chapter: 'P', names: 'any' }` = `[P1, P2, P4, P5, P6]`; `{ chapter: '3', names: 'home' }` = `[]`; `{ names: 'all', todo: true }` with `1.4.2` ticked = `[1.4.1, 1.4.3]`; a topic tick leaves 28 to do; `normalizeFilter` repairs junk.
- **U25** `filterLabel`: `Chapter 3`, `Proofs`, `Chapter 1, names: any, not ticked yet`, `names: all`, `not ticked yet`, `''`.
- **U26** `parseProblemsToken('names-home')` = `{ chapter: 'all', todo: false, names: 'home' }`; all six codes; upper case; `names-`, `names-bogus`, `names-all-names-x`, `names`, `name-all` leave `{ chapter: 'all', todo: false }`; `'3'` and `'todo'` unchanged.
- **U27** `sanitizeScores` / `rehearsedIds` / `problemCount`: a score for an unknown id and a non-object score are dropped; `P3: { tried: -4, right: 2.7, last: 'now' }` becomes `{ tried: 2, right: 2, last: 0 }`; `rehearsedIds` of `{ 1.4.2: right 1, 2.5.1: right 0, P3: right 1 }` is `['1.4.2', 'P3']`; `problemCount(0, 1, 11)` = `0 problems`, `1 problem`, `11 problems`.
- **U28** `decisionBlock()`: six address codes in `ADDRESS_CODES` order with labels `Cartesian, Polar, Cartesian, then polar, Polar, then Cartesian, Cartesian, polar, then back, Either address` and the `ADDRESS_MEANING` strings; five names codes with counts `[11, 12, 3, 2, 1]`, count texts `11 problems, 12 problems, 3 problems, 2 problems, 1 problem`, routes `problems-names-<code>` that `parseProblemsToken` reads back; the counts sum to 29.
- **U29** `stationLabel`: `home` = `The Map. Place 0. Problems: none. Threads: T1, T2, T3.`; `rehearse` = `The Rehearsal Room. Place 20. Problems: none. Threads: T1, T2, T3.`; `roots` = `Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3. Threads: T2, T1.`, with `1.4.2` ticked `…, 1 of 3 ticked.`, ticked and rehearsed `…, 1 of 3 ticked, 1 rehearsed.`, two rehearsed (a `Set`) `…, 2 rehearsed.`; `powermap` = `zⁿ: Fans and Parabolas. Place 11. Problems: 2.1.2, 2.2.1. Threads: T1, T2, T3.`; a problem of another place changes nothing.
- **U30** source rules: `problems.js` keeps ``id: `${box.id}-final` `` and the two `titleSpan` lines the integration test pins, does not use class `card problem-card`, builds the ids of the deck and `href: \`#rehearse-${k}\``; `home.js` builds `home-decisions`, `home-decision-address`, `home-decision-names`, `home-decision-names-link-` and `is-rehearsed`; neither file types "The Rehearsal Room"; both scripts exist.
- Kept as they were: U1, U2, U7 to U9, U12 to U21 (including **U20**: no problem text, station summary or long station title is typed into either file, no `alert`, `confirm`, `prompt`, `innerHTML` or absolute URL; and **U21**: the worked solutions recomputed from `complex.js`, the numbers of 6.3).

### 7.3 The interaction script (A1 and A2), step by step: `tests/interact/i2-home-index-deck.mjs` (Appendix E)

Stubs: only `rehearse.js` and `roots.js` are replaced by an empty `mount` (they are navigated to, not tested); the page is reloaded after the stubs are installed. `waitFor` waits for the element to be *attached* (the first card is hidden by a names filter on `problems-names-all`).

`problems` (desktop and phone):
1. 29 `article.problem-card`, all `data-open="false"`; `scrollHeight < 4000` at 1280 and `< 7500` at 390 (measured 3,598 and 6,267); for all 29 ids (imported in the page): `#problems-card-<k>-address` and `-names` exist, have class `decision-chip` and `data-value` equal to the problem's `address` and `names`; `a#problems-rehearse-<k>[href="#rehearse-<k>"]`, `#problems-tick-<k>` and `#problems-open-<k>` exist; `#problems-card-1-4-2-names` is `all` and `-address` is `P->C`.
2. Click `#problems-open-1-4-2`: `data-open` and `aria-expanded` `true`, `#problems-reveal-1-4-2` visible. Click `#problems-open-1-4-1`: open ids `['1.4.1']`, `1.4.2` collapsed, `deck()` = `{ open: ['1.4.1'], mode: 'one' }`.
3. Click `#problems-mode-all` (pressed), open `1.4.2`: open `['1.4.1', '1.4.2']`, `deck()` mode `all`. `#problems-collapse-all`: none open, `deck().open = []`. Open `1.1.1` and `1.1.2` (both stay), click `#problems-mode-one`: only `['1.1.2']` stays. `#problems-collapse-all`, `#problems-mode-all`, `#problems-open-all`: 29 open; `#problems-collapse-all`; `#problems-mode-one`.
4. Names filter: click `#problems-filter-names-all`, `-home`, `-continuous`, `-none`, each time `visible()` deep-equals the list of section 1 and the chip is `aria-pressed`; `-any` shows 12; `-all-names` 29. Click `#problems-filter-1` then `#problems-filter-names-any`: `visible()` is `['1.3.2']` and `#problems-count` is `Showing 1 of 29: Chapter 1, names: any.`. `#problems-filter-3` then `-names-home`: 0 visible, `#problems-empty` visible; `#problems-show-all`: 29 visible, the `No filter` and `All` chips pressed.
5. Predict first: check `#problems-predict`; open `1.4.2`: `.decisions` of that card is not visible, nor `a[href="#problem-1-4-2"]`, nor `.decisions` of the collapsed `1.1.1`, nor `#problems-balance-panel`; `#problems-rehearse-1-4-2` is. Click Reveal: chips and station link visible. `#problems-collapse-all`: the chips are hidden again. Uncheck: chips and the balance panel are back.
6. Keyboard: focus `#problems-open-1-1-1`; ArrowDown goes to `problems-open-1-1-2`; End to `problems-open-P7`; Home to `problems-open-1-1-1`; Enter opens `1.1.1`; Escape closes it and focus stays on `problems-open-1-1-1`; a click on the collapsed `1.2.2` statement opens it; `#problems-collapse-all`.
7. Click `#problems-rehearse-1-4-2`: the hash becomes `#rehearse-1-4-2` (stub mounted); back. Check `#problems-tick-1-1-1`: progress text `1 of 29 ticked` and `data-done="true"`; uncheck. 12 `article.topic-card`, all `data-open="false"`; `#problems-topic-T1-4 a[href="#powers"]` is not visible; open `#problems-topic-open-T1-4`: it is.
8. Open `1.4.2`, click its place link `a[href="#problem-1-4-2"]`, back: `1.4.2` is still the one open card (the deck survived a station round trip; `roots` is stubbed).
9. Set `mv:rehearse.scores` to `{ "1.4.2": { tried: 1, right: 1, last: 1 } }`, reload: `#problems-rehearse-1-4-2` has `data-rehearsed="true"` and says `Rehearse again`, `#problems-rehearse-1-4-1` says `Rehearse`. Remove the key. No horizontal overflow; screenshots `problems-deck` and, with `1.4.2` revealed and `1.3.1` open, `problems-deck-open`.

`problems-names-all`: `visible()` is `['1.4.1', '1.4.2', '1.4.3']`, `#problems-filter-names-all` pressed and `-all-names` not, `#problems-count` is `Showing 3 of 29: names: all.`, `filter().names` is `all`. `problems-todo`: `filter().todo` is `true`.

`home` (desktop and phone): 22 `a.map-station` in registry order, `graph4d` then `rehearse` then `problems`, `rehearse` before `problems` in the document; `circle.stop` counts 16, 12, 14; 29 `circle.pdot`. `#home-decisions` holds `#home-decision-address` and `#home-decision-names`; the address text says `Cartesian` and `polar`, the names text says `any`, `all`, `home`, `continuous`; six address `li`; each `#home-decision-names-link-<code>` has `href="#problems-names-<code>"`; the `all` link says `3 problems`, `continuous` says `1 problem`; the block sits below `#home-spine` and above `#home-map-panel`; the epigraph has "A turn has many names." and `#home-spine-list` has 4 items. Click the `all` link: hash `#problems-names-all`, `visible()` is the three roots problems; back. Set `mv:rehearse.scores` as above and reload: exactly one `circle.pdot.is-rehearsed` (`data-problem="1.4.2"`), `home.rehearsed()` is `['1.4.2']`, `#home-progress` contains `Rehearsed 1 of 29`, the roots place's `aria-label` contains `1 rehearsed`, the rehearsed dot's computed `stroke-width` exceeds an ordinary dot's; remove the key and reload: none. At 1280: `layout()` is `wide`, the `rect.node-pill` `y` values are 3 distinct numbers held by 8, 8 and 6 pills, and the bounding boxes of every `.map-label`, `.map-num` and `.map-part` (at least 49 of them) overlap none of the others by more than 1 px and lie inside the SVG; at 390: `layout()` is `narrow` with 22 places. `#home-T2` dims 10 places. No horizontal overflow; screenshot `home-map`.

`home-T2`: the map and the stop counts as above, 10 dimmed places, the T2 legend button pressed.

### 7.4 Pins moved or kept in `tests/interact/i1-station-home-problems.mjs` (A4)

Every pin of the iteration-1 script and what happened to it (the diff is Appendix D):

| Pin (line in the committed script) | Now |
|---|---|
| registry has 21 stations (40) | 22 |
| the map has 21 `a.map-station` (41, 81) and the narrow map 21 places (151) | 22 |
| stops T1 15, T2 11, T3 13 (55) | 16, 12, 14 |
| `WIDE_MIN` is 712 (62) | 780 |
| T2 dims 10 places (122) | still 10 (22 − 12); message updated |
| progress dots, finder, legend, station click, relayout at 700 px, `#home-T2` token, the demo (all other home pins) | unchanged and green |
| the answer starts hidden, `aria-expanded` starts `false` (258-259) | unchanged, plus: the Reveal button is **not visible** while the card is one line, and **is** after `#problems-open-1-4-2` |
| `#problems-reveal-1-4-2`, `-1-4-3`, `-2-2-1`, `-1-5-2` clicked (260, 268, 270, 297) | each is **preceded by the card's open button** through an idempotent `openCard(id)` helper (it clicks only if `data-open` is not `true`, because the button toggles and a remount restores the deck); the script clicks `#problems-mode-all` first so the cards it opened earlier stay open as the iteration-1 cards did |
| predict first: hint hidden and note visible (347) | the card is opened first (`openCard('1-4-2')`); after the reload the deck is in mode one, so that is enough |
| predict off shows the hint "on a closed card" (352) | "on an open card" (a collapsed card has no body) |
| the closing screenshot with two answers open (407) | mode all, open and reveal `1.4.2` and `2.1.2` |
| 29 `.problem-card`, 12 `.topic-card`, one checkbox and one problem link per card, handout order, the hook, the routes, the plain-text chevron, the closing full stops, overflow, Hide all, chapter filters and their count text, ticks, Not ticked yet, predict persistence, Clear all, route tokens, statements, topic links and ticks, the balance cells | unchanged and green |

### 7.5 A5 and A6

A5 is the smoke command of 7.1 (15 checks: five routes, desktop, phone and dark desktop).
A6, what the reviewer finds in `docs/review/iter-2/i2-home-index-deck/` (measured in the scratch copy, light and dark):
- `problems--desktop.png` (1280 x 3,598): the heading, the lede, the tools panel with the three filter rows (`Show`, `Names`, `Rows`), the predict box, the balance strip, then the four group headings and 29 rows of one line each: stripe, chevron, number, the start of the statement fading out on the long ones, the two small chips (`C`, `●●C→P`, `none`, `any`, `all`, `home`, `continuous`), `Rehearse` and `Got it`, then the 12 topic rows and the links. Nothing is clipped except the fade; the staircase marks of the Names chips are legible; in dark the chips and stripes keep their contrast (3.2).
- `home--desktop.png` (1280 x 4,696): the spine as four lines, the two-decisions block under it (the six address chips with their meanings on the left; the five Names links with their counts on the right), then the map in three rows of 8, 8 and 6 pills with "The Rehearsal Room" between "The 4D Graph" and "The Problem Index" and no label touching another (the script measures it).
- Also look at `problems--phone.png` (two lines a row, chips on the second line, the tick without its word) and, from `i2-home-index-deck`'s own shots, `problems-deck-open` (two cards open, one answer showing).

### 7.6 What else must stay true

- `node tools/interact-all.mjs` row `'i2-home-index-deck': ['home', 'problems', 'problems-names-all']` runs this script on those three routes; `'i1-station-home-problems': ['home', 'problems']` runs the moved iteration-1 script.
- The I8 sweep of `tests/interact/i1-integration.mjs` (every link and tab stop has an id, no duplicate id, the same link ids on every visit) was emulated by hand in the scratch copy on `home` and `problems`: pressing every Reveal button, hidden or not, leaves the last card open and revealed; 138 link ids on the index and 69 on home, identical on a second visit; no duplicate id, no link or tab stop without one, no console error (484 ids on the index, 204 on home).
- The two `tests/unit/i1-integration.test.mjs` pins on `problems.js` source text hold (U30).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone layout

### 8.1 Edge cases

1. **A tall statement** (2.3.1 and P5 have a display fraction inside the sentence): the row grows to 59 and 53 px instead of 50. Not clipped: a fraction cut in half is worse than 9 px.
2. **320 px wide** (a small phone, or 400 % zoom): eight rows wrap their second line to a third; the page is 6,945 px; no overflow (measured at 320, 360, 390, 430, 600, 768, 900, 1024, 1440).
3. **A filter hides an open card**: it stays open, `deck().open` lists it, and the keyboard list skips it; opening another row in mode one collapses it; Collapse all collapses it.
4. **Reveal on a collapsed row** (a script, the I8 sweep): the row opens first, so a revealed answer is never inside a hidden body.
5. **Predict toggled while rows are open**: a row whose answer shows keeps its chips and hint; the others lose theirs at once (the rule is CSS on `data-revealed`).
6. **Open all shown with predict on**: 29 rows open, none revealed, so no chip and no hint show; the notes "Say it first …" do.
7. **Ticking under Not ticked yet**: the row stays until the next filter action (iteration-1 rule); the chip's count and the progress bar update at once.
8. **A stored deck from an older visit**: `deckState` drops ids that no longer exist; a stored `problems.filter` with a bad field is repaired by `normalizeFilter`; the route token wins over the stored filter.
9. **`#problems-names-bogus`, `#problems-names-`, `#problems-NAMES-ANY`**: the first two show everything; the third is read case-insensitively.
10. **`rehearse.scores` with `right: 0`** is not rehearsed; with `right: 2.7` it is (floor 2); with a string it is not.
11. **No `mask-image`** (a very old browser): the long statements are cut hard at the edge with no fade; the row stays one line.
12. **The kit's `.problem-card` rules** are present when `lab` or `roots` was visited first: every deck rule is more specific and sets what it needs (0.1 item 4); a unit test cannot see this, the script's height check can (a card that picked up `display: grid` and a gap would be taller).
13. **A station title that writes an exponent** (`z^n`): set through `titleSpan` in one span in the open card's place line and in a topic's "Start at" button, as the iteration-1 pin demands.
14. **Right-to-left or a very long station id** is not handled: station ids are short lower-case tokens and the place link wraps inside the body.
15. **The Walk's pill** (`i2-walk-shell`, off state: a 156 x 44 px button fixed 16 px from the right and bottom of the window) floats over the right-hand end of whichever row is behind it (Rehearse, the tick) while the list scrolls; the page's own footer has 60 px of clearance for it and `scroll-padding-bottom` keeps a focused control clear of the bar. Nothing to do in this goal; the script and the scratch run were repeated against that CSS and pass (8 of 8 checks, 4 of 4 for the iteration-1 script).
16. **A hash that changes while the page is open** (`#problems-3` after `#problems`): the router remounts the station; the deck is restored from `problems.deck`, the filter from the token.

### 8.2 Performance plan

- Mount builds 29 rows, 29 chip pairs (`decisions.chips`, no listeners), 12 topic rows and the links synchronously: **50 to 75 ms** measured (the 29 typeset statements dominate; `tex()` caches). Answers are built on the first reveal only (one KaTeX display each) and kept.
- One delegated `click` and one `keydown` on the deck; per-row listeners exist only on the 29 + 12 ticks and the 12 topic toggles. Opening or closing touches at most two rows; filtering toggles `hidden` on 29 articles and four groups; no row is re-rendered by any action.
- The page is about 3,600 px: no virtualisation, no `content-visibility`. The home map is about 300 SVG elements; `relayout()` runs once per width change through one rAF. `home` mounts in about 117 ms, almost all of it the demo's plane, staircase and explainer (unchanged).
- The `mask-image` fade costs a compositing layer per collapsed row (29); measured scrolling is smooth in headless Chromium; if a low-end phone stutters the fade can be limited to the rows that actually overflow (compare `scrollWidth` and `clientWidth` once per resize).

### 8.3 Accessibility

- Structure: `h1`; the tools panel and each group are `section`s with an accessible name; one `h2` per group and for the topics; one `h3` per row (the number, plus the section title when open). `article` per card, `aria-labelledby` its `h3`.
- Disclosure: the toggle is a real `<button>` with `aria-expanded`, a constant accessible name (`Details of problem 1.4.2`), a visible focus ring and the keyboard model of 2.3 (the accordion pattern: Enter and Space, plus Up, Down, Home, End and Escape as conveniences). The body is `hidden` (out of the tab order and the accessibility tree) until opened.
- The two chips are spans with visible short text and `sr-only` full text ("C→P, Cartesian, then polar"; "Names: all"); the tooltip repeats the meaning; the open card says both in words. Colour is never the only carrier: the Names marks are shapes, the address chip has its text and one to three dots, the stripe repeats what the chip says.
- Status: `#problems-count` and `#problems-progress` are `role=status`; `#problems-deck-status` (screen-reader only) announces opens, collapses, "Opened 11 problems." and "Answers hidden."
- Targets: 40 px toggle and 36 px Rehearse at desktop; 44 px toggle and tick and 36 px Rehearse on the phone; the chips are not controls.
- Contrast: 3.2 (every pair above its minimum in both themes). Zoom: the layout is CSS-only and reflows at 640 CSS px (200 % zoom of a 1280 px window is the phone layout).
- The statement is real text plus KaTeX's MathML (`tex()` default), so a screen reader reads the maths; the fade is a mask and hides nothing from it.

### 8.4 Reduced motion

There is no animation in this goal: the chevron's turn is a state swap, rows appear and disappear without a transition, `scrollIntoView` is not smooth, nothing is timed except the 4 s arm of Clear all ticks. `theme.css` already shortens any transition under `prefers-reduced-motion`. The map's relayout is instant.

### 8.5 Phone layout (390 px)

The index is the two-line row of 3.3 (6,267 px); the tools panel stacks into wrapped chip rows (689 px) with the row labels at the start of each; the open card's body is indented by one `--space-2` only; the tick's word is visually hidden (its label and checkbox are a 44 px target). The home page: the single-track map (22 places, 1,226 px at the minimum width), the decisions block stacked (each list item is a chip over its meaning; 1,687 px), everything else as in iteration 1. No horizontal scroll at any width from 320 up (measured).

---

## 9. Out of scope, and requests for other owners

### 9.1 Out of scope

The Walk bar on the home page (`i2-walk-shell`); Rehearsal scoring (`i2-rehearse` writes `rehearse.scores`, this goal only reads it); the identity polar grid behind the map (CSS in `i2-walk-shell`); the chips and glyphs on the fifteen other stations (`i2-decisions-everywhere`); any change to `js/data/problems.js`, `js/registry.js`, `js/app.js`, `js/core/*` or `css/*`. Also not done here: a link that opens one named card of the index (`#problems-1-4-2` is not a route), a persisted deck across reloads, a station chip on the collapsed line (0.2 item 1), filtering by Address, search inside the index.

### 9.2 Requests for other owners (the orchestrator schedules them; nothing here edits those files)

1. **Orchestrator**: add `tests/interact/i2-home-index-deck.mjs` to this goal's `owns`. Acceptance A1 and A2 and `tools/interact-all.mjs` name it; the plan's list names only the two iteration-1 test files.
2. **Integrator** (`docs/ARCHITECTURE.md`): section 9 "home" and "problems" gain the ids and hooks of 2.2 and 4.1 that the plan's list does not have (`#problems-filters-names`, `#problems-deck-controls`, `#problems-deck-status`, `#problems-key`, `#problems-topic-open-<id>`, `#home-decision-address-list`, `#home-decision-names-list`, `#home-decision-address-chip-<c|p|c-p|p-c|c-p-c|both>-address`, `#home-decision-names-link-<code>`, `#home-decision-names-chip-<code>-names`; hooks `problems.deck()`, `problems.revealed()`, `home.rehearsed()`); the sentence "T1 has 15 stops, T2 11 and T3 13" becomes 16, 12, 14; the wide map needs a host of **780** px (was 712); `GEOM.COLS` 8 and the two new `GEOM` keys; section 3.13 already lists `problems.deck` and the names field.
3. **Owner of `tools/interact-all.mjs`** (`i2-decisions-kit`, optional): add `'home-T2'` and `'problems-todo'` to the `'i2-home-index-deck'` row; the script has a branch for each.
4. **`i2-decisions-kit`, a future iteration** (optional): a `compact` option on `chips()` would let `compactChips` in `problems.js` go; today it edits the chip's text node after the fact and falls back safely if that node is not there.
5. **`i2-walk-shell`**: `#home-map-host` and `svg.home-map` carry no background (so the identity grid shows through); the ids `#home-spine`, `#home-decisions` and the map's `a.map-station` are stable. The Walk's `problems` stop keeps working unchanged (`#problems-todo`, clicks on `#problems-tick-<id>`).
6. **`i2-rehearse`**: the index reads `rehearse.scores[id].right >= 1` as "rehearsed"; the Rehearsal Room's `#rehearse-<id with dashes>` tokens are the link targets of every Rehearse link (`#rehearse-1-4-2`, `#rehearse-P5`).

### 9.3 Build order

1. Write `js/stations/problems.js` from Appendix A.
2. Apply Appendix B to `js/stations/home.js`.
3. Apply Appendix C and D to the two iteration-1 test files; create `tests/interact/i2-home-index-deck.mjs` from Appendix E.
4. `node --test tests/unit/i1-station-home-problems.test.mjs`; then the three smoke commands of 7.1 for A1, A2, A4; then A5; then A6 and look at the pictures.
5. Report every deviation from the appendices (and the ids and hooks that differ from 2.2 and 4.1) in the result.

---

## Appendices: the reference implementation

The files below are the scratch copy that every "measured" sentence above was taken from. Appendix A is the whole of `js/stations/problems.js`; B, C and D are `diff -u` of the committed `js/stations/home.js`, `tests/unit/i1-station-home-problems.test.mjs` and `tests/interact/i1-station-home-problems.mjs` against the scratch versions (apply them with `patch -p1`, or read them as a list of edits); E is the whole of the new script. Nothing else in the repository changes.

### Appendix A. `js/stations/problems.js` (new content; the whole file)

````js
// js/stations/problems.js
// The Problem Index as a deck: all 29 review problems and proofs as one-line cards in handout order (number, the start of the
// statement, the two decision chips, a Rehearse link, the tick), opened one at a time or several at once; the 12 syllabus topics as
// one-line cards too; filters by chapter, by the Names decision and by what is not ticked; persisted ticks; predict-first; the
// address-balance strip.
//
// This module is also the leaf of the home station: the pure helpers that both stations need (shortTitle, sanitizeProgress,
// stationNeighbours, namesCounts, sanitizeScores, ...) live here and home.js imports them.
//
// No top-level DOM access, so every pure helper imports in Node. Every text goes through textContent, createTextNode, prose() or tex();
// there is no innerHTML in this file.
// Design: docs/designs/iter-2/i2-home-index-deck.md (this file is its Appendix A); docs/designs/iter-1/i1-station-home-problems.md for the parts it keeps.

import { STATIONS, THREADS, stationById, threadLabel, threadLinkPrefix } from '../registry.js';
import {
  PROBLEMS, TOPICS, problemById, topicById, problemsForTopic, routeFor, topicRoute, statementParts, addressLabel, addressTones,
} from '../data/problems.js';
import { tex, prose } from '../core/katex.js';
import { chips as decisionChips, NAMES_CODES, namesMeaning } from '../core/decisions.js';

export const PROGRESS_KEY = 'progress';          // { [problemId or topicId]: true }, persisted
export const PREDICT_KEY = 'problems.predict';   // boolean, persisted
export const FILTER_KEY = 'problems.filter';     // { chapter: 'all' | '1' | '2' | '3' | 'P', todo: boolean, names: NAMES_FILTERS[number] }, memory only
export const DECK_KEY = 'problems.deck';         // { open: string[], mode: 'one' | 'all' }, memory only
export const SCORES_KEY = 'rehearse.scores';     // { [problemId]: { tried, right, last } }, persisted; written by the Rehearsal Room, only read here
export const NAMES_FILTERS = Object.freeze(['all-names', ...NAMES_CODES]);   // 'all-names' is "no filter"
const CHAPTER_KEYS = ['all', '1', '2', '3', 'P'];
const ARM_MS = 4000;

// ---------------------------------------------------------------- pure helpers

export const idKey = (id) => String(id).replace(/\./g, '-');

// Text before the first ':' (trimmed); the whole title when there is none; '' for a non-string.
export const shortTitle = (t) => {
  const s = typeof t === 'string' ? t : '';
  const i = s.indexOf(':');
  return (i > 0 ? s.slice(0, i) : s).trim();
};

// A station title may write the exponent the handout way ("z^n: Fans and Parabolas"). In SVG text and in attributes, where no <sup> can go,
// typesetTitle writes it with Unicode superscripts ("zⁿ"); in HTML titleSpan sets the title with prose() inside ONE span, because the
// chips and station links are inline-flex and a bare text, <sup>, text would be three flex items (ARCHITECTURE 10.4.8).
const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', n: 'ⁿ', '-': '⁻', '+': '⁺' };
export function typesetTitle(t) {
  return String(t == null ? '' : t).replace(/\^(?:\{([0-9n+-]+)\}|([0-9n+-]+))/g, (m, braced, bare) => [...(braced || bare)].map((ch) => SUPER[ch]).join(''));
}

// Text before the first ':' or ';' (thread badges and legend chips).
export function shortThreadTitle(t) {
  return String(t).split(/[:;]/)[0].trim();
}

// -> { [id]: true } keeping only known problem or topic ids with a true value. An array of ids is accepted too.
export function sanitizeProgress(raw) {
  const out = {};
  const put = (k) => {
    if (typeof k === 'string' && (problemById(k) || topicById(k))) out[k] = true;
  };
  if (Array.isArray(raw)) raw.forEach(put);
  else if (raw && typeof raw === 'object') for (const k of Object.keys(raw)) if (raw[k] === true) put(k);
  return out;
}

// How many problems (not topics) are ticked.
export const countTicked = (progress, problems = PROBLEMS) => problems.filter((p) => progress && progress[p.id] === true).length;

// A new, sanitised object with id added (on) or removed; an unknown id changes nothing.
export function setTicked(progress, id, on) {
  const o = { ...sanitizeProgress(progress) };
  if (!(problemById(id) || topicById(id))) return o;
  if (on) o[id] = true;
  else delete o[id];
  return o;
}

// 'all' is every problem; 'P' the proof examples; '1' | '2' | '3' by handout chapter.
export function filterMatches(p, key) {
  if (key === 'all') return true;
  if (key === 'P') return p.chapter === 0 || p.kind === 'proof';
  return String(p.chapter) === key;
}

export function filterCounts(problems = PROBLEMS) {
  const c = { all: problems.length, '1': 0, '2': 0, '3': 0, P: 0 };
  for (const p of problems) for (const k of ['1', '2', '3', 'P']) if (filterMatches(p, k)) c[k]++;
  return c;
}

// The Names filter: 'all-names' (and anything that is not a Names code) lets every problem through; otherwise the problem's own names value.
export function namesFilterMatches(p, names) {
  if (!p || typeof p !== 'object') return false;
  if (!NAMES_CODES.includes(names)) return true;
  return p.names === names;
}

// How many problems each Names value settles: { none: 11, any: 12, all: 3, home: 2, continuous: 1 }.
export function namesCounts(problems = PROBLEMS) {
  const c = {};
  for (const code of NAMES_CODES) c[code] = 0;
  for (const p of problems) if (NAMES_CODES.includes(p.names)) c[p.names]++;
  return c;
}

// '1 problem', '11 problems', '0 problems': the count beside a Names choice and a topic.
export const problemCount = (n) => (n === 1 ? '1 problem' : `${n} problems`);

// -> { chapter, todo, names } with every field valid; anything else is the default (show everything).
export function normalizeFilter(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    chapter: CHAPTER_KEYS.includes(r.chapter) ? r.chapter : 'all',
    todo: r.todo === true,
    names: NAMES_FILTERS.includes(r.names) ? r.names : 'all-names',
  };
}

// The ids that pass the three filters, in handout order.
export function visibleIds(filter, progress, problems = PROBLEMS) {
  const f = normalizeFilter(filter);
  return problems
    .filter((p) => filterMatches(p, f.chapter) && namesFilterMatches(p, f.names) && (!f.todo || !(progress && progress[p.id] === true)))
    .map((p) => p.id);
}

// 'Chapter 1, names: any, not ticked yet' ('' when nothing is filtered): the words after "Showing 3 of 29:".
export function filterLabel(filter) {
  const f = normalizeFilter(filter);
  const bits = [];
  if (f.chapter === 'P') bits.push('Proofs');
  else if (f.chapter !== 'all') bits.push(`Chapter ${f.chapter}`);
  if (f.names !== 'all-names') bits.push(`names: ${f.names}`);
  if (f.todo) bits.push('not ticked yet');
  return bits.join(', ');
}

// The route token after "problems-": '3', 'p', 'todo', 'names-all', 'all'. Anything else is "show everything". The names key is present only for a names token.
export function parseProblemsToken(token) {
  const t = String(token == null ? '' : token).toLowerCase();
  const r = { chapter: 'all', todo: false };
  if (t === '1' || t === '2' || t === '3') r.chapter = t;
  else if (t === 'p') r.chapter = 'P';
  else if (t === 'todo') r.todo = true;
  else {
    const m = /^names-(all-names|none|any|all|home|continuous)$/.exec(t);
    if (m) r.names = m[1];
  }
  return r;
}

// The deck's own state from whatever the store holds: { open: ids in the order they were opened, mode }. In mode 'one' at most the last one stays open.
export function deckState(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const mode = r.mode === 'all' ? 'all' : 'one';
  const seen = new Set();
  const open = [];
  for (const id of Array.isArray(r.open) ? r.open : []) {
    if (typeof id === 'string' && problemById(id) && !seen.has(id)) {
      seen.add(id);
      open.push(id);
    }
  }
  return { open: mode === 'one' ? open.slice(-1) : open, mode };
}

// rehearse.scores from the store -> { [problemId]: { tried, right, last } } for known problems only; counts are whole numbers >= 0 and tried >= right.
export function sanitizeScores(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const count = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  for (const id of Object.keys(raw)) {
    const v = raw[id];
    if (!problemById(id) || !v || typeof v !== 'object') continue;
    const right = count(v.right);
    out[id] = { tried: Math.max(count(v.tried), right), right, last: typeof v.last === 'number' && Number.isFinite(v.last) && v.last > 0 ? v.last : 0 };
  }
  return out;
}

// The problems rehearsed right at least once, in handout order.
export function rehearsedIds(scores, problems = PROBLEMS) {
  const s = sanitizeScores(scores);
  return problems.filter((p) => s[p.id] && s[p.id].right >= 1).map((p) => p.id);
}

// How many of the problems are easiest in Cartesian, in polar, or use both (by the set of address tones).
export function addressBalance(problems = PROBLEMS) {
  const b = { cart: 0, polar: 0, both: 0 };
  for (const p of problems) {
    const s = new Set(addressTones(p.address));
    if (s.size >= 2) b.both++;
    else if (s.has('--cart')) b.cart++;
    else if (s.has('--polar')) b.polar++;
  }
  return b;
}

// { prev, next, thread: { T1: { prev, next }, ... } } as station ids (null at an end). Unknown id: all empty.
export function stationNeighbours(stations, id) {
  const list = stations.slice().sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null, thread: {} };
  const out = { prev: i > 0 ? list[i - 1].id : null, next: i + 1 < list.length ? list[i + 1].id : null, thread: {} };
  for (const t of list[i].threads) {
    const members = list.filter((s) => s.threads.includes(t));
    const j = members.findIndex((s) => s.id === id);
    out.thread[t] = { prev: j > 0 ? members[j - 1].id : null, next: j + 1 < members.length ? members[j + 1].id : null };
  }
  return out;
}

// Native routes of a problem: the set of address tones mapped to 'cart' / 'polar'.
const nativeRoutes = (p) => [...new Set(addressTones(p.address).map((t) => t.replace(/^--/, '')))];

// The statement parts of statementParts(), with any closing punctuation that opens the text part after a maths part moved onto that
// maths part: [{ math: false, text } | { math: true, text, tail }]. The caller keeps a maths part and its tail on one line, so the
// full stop of "... = z_2." never wraps onto a line of its own. Pure; a part that is only punctuation disappears into the tail.
const TAIL = /^[.,;:!?)\]]+/;
export function statementNodes(parts) {
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

// Browser only. Renders statementParts(...) into host: text through createTextNode, maths through tex() into a span of mathClass;
// a maths part with a tail goes into a nowrap span together with it.
export function appendStatement(host, parts, mathClass = '') {
  for (const node of statementNodes(parts)) {
    if (!node.math) { host.append(document.createTextNode(node.text)); continue; }
    const m = document.createElement('span');
    if (mathClass) m.className = mathClass;
    tex(m, node.text);
    if (!node.tail) { host.append(m); continue; }
    const run = document.createElement('span');
    run.style.whiteSpace = 'nowrap';
    run.append(m, document.createTextNode(node.tail));
    host.append(run);
  }
}

// ---------------------------------------------------------------- station CSS (tokens only; every rule prefixed)
// Every deck rule starts with .problems-deck or .problems-topics so that the shared station-kit rules for `.problem-card` (injected by
// whichever station was visited first and never removed) cannot reach the index.

const CSS = `
.problems-tools { display: grid; gap: var(--space-2); }
.problems-progress-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.problems-progress-row progress { flex: 1 1 10rem; min-width: 8rem; height: 0.9rem; accent-color: var(--ok); }
.problems-progress-row p { margin: 0; font-weight: 700; }
.problems-tools .check { min-width: 0; }
.pf-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); min-width: 0; }
.pf-label { flex: none; min-width: 3.4rem; color: var(--text-muted); font-size: 0.88rem; font-weight: 700; }
.pf-row .chip, .pf-row .btn { min-height: 2.25rem; padding-block: 0; font-size: 0.9rem; }
.problems-key { margin: 0; color: var(--text-muted); font-size: 0.88rem; line-height: 1.45; }
.problems-count { margin: 0; }
.problems-balance-note { margin: var(--space-2) 0 0; }
.problems-balance-panel h2 { font-size: 1.15rem; }
.problems-group h2 { margin: var(--space-3) 0 var(--space-2); font-size: 1.3rem; }
.problems-deck .pc-list, .problems-topics .pc-list { display: grid; gap: 6px; margin: 0; padding: 0; }
.problems-deck .problem-card, .problems-topics .topic-card {
  position: relative; display: block; min-width: 0; margin: 0; padding: 4px var(--space-2) 4px 14px;
  border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); box-shadow: none;
}
.problems-deck .problem-card > *, .problems-topics .topic-card > * { margin: 0; }
.problems-deck .problem-card::before, .problems-topics .topic-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: var(--radius) 0 0 var(--radius); background: var(--tone, var(--border-strong));
}
.problems-deck .problem-card { --tone: var(--border-strong); }
.problems-deck .problem-card[data-tone="cart"] { --tone: var(--cart); }
.problems-deck .problem-card[data-tone="polar"] { --tone: var(--polar); }
.problems-deck .problem-card[data-tone="both"]::before { background: linear-gradient(to bottom, var(--cart) 50%, var(--polar) 50%); }
.problems-topics .topic-card[data-thread="T1"] { --tone: var(--cart); }
.problems-topics .topic-card[data-thread="T2"] { --tone: var(--polar); }
.problems-topics .topic-card[data-thread="T3"] { --tone: var(--output); }
.pc-row, .tc-row {
  display: grid; grid-template-columns: 2.5rem auto minmax(0, 1fr) auto; grid-template-areas: "open title line actions";
  align-items: center; column-gap: var(--space-2); min-height: 2.5rem;
}
.pc-open { grid-area: open; display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; padding: 0;
  border: 1.5px solid transparent; border-radius: var(--radius-sm); background: transparent; color: var(--text); cursor: pointer; }
.pc-open:hover { background: var(--surface-2); border-color: var(--border-strong); }
.pc-chevron { width: 0.55em; height: 0.55em; border-right: 2px solid currentcolor; border-bottom: 2px solid currentcolor; transform: rotate(-45deg); }
.pc-open[aria-expanded="true"] .pc-chevron { transform: rotate(45deg); }
.pc-title, .tc-title { grid-area: title; display: flex; align-items: baseline; gap: var(--space-2); margin: 0; font-family: var(--font); font-size: 1rem; line-height: 1.3; }
.pc-title { min-width: 3.6rem; }
.pc-id { font-family: var(--font-mono); font-weight: 700; }
.problems-deck .problem-card[data-done="true"] .pc-id { border-color: var(--ok); }
.pc-section { display: none; color: var(--text-muted); font-weight: 500; }
.problem-card[data-open="true"] .pc-section { display: inline; }
.pc-statement { position: relative; grid-area: line; min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: clip; cursor: pointer;
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 1.6rem), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 1.6rem), transparent); }
.pc-actions, .tc-actions { grid-area: actions; display: flex; align-items: center; gap: 6px; min-width: 0; }
.problems-deck .decisions { flex-wrap: nowrap; gap: 6px; }
.problems-deck .decisions .decision-chip { min-height: 1.75rem; padding: 0 0.55rem; font-size: 0.82rem; white-space: nowrap; }
.pc-rehearse { --tone: var(--border-strong); min-height: 1.75rem; padding: 0 0.65rem; font-size: 0.85rem; white-space: nowrap; }
.pc-rehearse[data-rehearsed="true"] { border-color: var(--polar); }
.pc-tick { min-height: 2.25rem; gap: 6px; font-size: 0.88rem; white-space: nowrap; }
.tc-row { grid-template-areas: "open title title actions"; }
.problem-card[data-open="true"] .pc-row { grid-template-areas: "open title title actions" ". line line line"; row-gap: var(--space-1); }
.problem-card[data-open="true"] .pc-statement { white-space: normal; overflow: visible; overflow-x: auto; -webkit-mask-image: none; mask-image: none; overflow-wrap: anywhere; cursor: auto; padding: 0 0 var(--space-1); }
.pc-body { padding: var(--space-1) 0 var(--space-2) calc(2.5rem + var(--space-2)); display: grid; gap: var(--space-2); min-width: 0; }
.pc-hint { display: grid; gap: var(--space-2); }
.pc-hint p, .pc-body p { margin: 0; }
.pc-also { margin-left: var(--space-2); }
.pc-also::before { content: '\\00b7'; margin-right: var(--space-2); color: var(--text-muted); }
.pc-place .chip, .pc-also .chip { margin: 0 var(--space-1); min-height: 2rem; font-family: var(--font-mono); font-size: 0.88rem; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-hint { display: none; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .decisions { display: none; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) { --tone: var(--border-strong); }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"])::before { background: var(--border-strong); }
.pc-predict-note { display: none; margin: 0; color: var(--text-muted); font-style: italic; }
.problems-deck[data-predict="true"] .problem-card:not([data-revealed="true"]) .pc-predict-note { display: block; }
.addr { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; margin-right: var(--space-2); }
.addr-dot { width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--tone, var(--text-muted)); flex: none; }
.addr-dot[data-tone="cart"] { --tone: var(--cart); }
.addr-dot[data-tone="polar"] { --tone: var(--polar); }
.pc-reveal-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.pc-label { margin: 0 0 var(--space-1); }
.answer { display: grid; gap: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border); }
.pc-final { overflow-x: auto; max-width: 100%; padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
.pc-final .katex-display { margin: 0.4em 0; max-width: none; overflow: visible; }
.pc-scroll-hint { margin: 0; font-size: 0.88rem; }
.pc-plain summary { min-height: var(--tap); display: flex; align-items: center; cursor: pointer; font-weight: 600; }
/* display:flex removes the browser's triangle, so draw the chevron the shell uses for the colour key */
.pc-plain summary::before { content: ""; flex: none; width: 0.5em; height: 0.5em; margin-right: 0.7em; border-right: 2px solid currentcolor;
  border-bottom: 2px solid currentcolor; transform: rotate(-45deg); }
.pc-plain[open] > summary::before { transform: rotate(45deg); }
.pc-plain p { margin: 0 0 var(--space-2); }
.pc-routes { display: grid; gap: var(--space-2); grid-template-columns: 1fr; }
.pc-route { padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3); border-left: 4px solid var(--tone, var(--border-strong)); }
.pc-route[data-route="cart"] { --tone: var(--cart); }
.pc-route[data-route="polar"] { --tone: var(--polar); }
.pc-route h4 { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0 0 var(--space-1); color: var(--tone); }
.pc-route p { margin: 0; }
.pb-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.pb-cell { width: 1.1rem; height: 1.1rem; border-radius: 3px; background: var(--tone, var(--text-muted)); }
.pb-cell[data-kind="cart"] { --tone: var(--cart); }
.pb-cell[data-kind="polar"] { --tone: var(--polar); }
.pb-cell[data-kind="both"] { background: linear-gradient(90deg, var(--cart) 50%, var(--polar) 50%); }
.problems-topics h2 { margin: 0 0 var(--space-1); }
.problems-topics > p { margin: 0 0 var(--space-2); }
.tc-count { color: var(--text-muted); font-size: 0.88rem; white-space: nowrap; }
.tc-body { display: grid; gap: var(--space-2); padding: var(--space-1) 0 var(--space-2) calc(2.5rem + var(--space-2)); min-width: 0; }
.tc-body p, .tc-body ul { margin: 0; }
.tc-body ul { padding-left: 1.2rem; }
.tc-body .tc-label { font-weight: 700; font-size: 0.9rem; color: var(--text-muted); }
.tc-body .chips .chip { min-height: 2rem; font-size: 0.88rem; }
.tc-body .btn { justify-self: start; }
@media (max-width: 40rem) {
  .pc-row, .tc-row { grid-template-columns: 2.75rem auto minmax(0, 1fr); grid-template-areas: "open title line" ". actions actions"; row-gap: 2px; }
  .pc-open { width: 2.75rem; height: 2.75rem; }
  .problem-card[data-open="true"] .pc-row { grid-template-areas: "open title title" ". line line" ". actions actions"; }
  .tc-row { grid-template-areas: "open title title" ". actions actions"; }
  .pc-actions, .tc-actions { flex-wrap: wrap; gap: 4px; }
  .problems-deck .decisions { gap: 4px; }
  .problems-deck .decisions .decision-chip { padding: 0 0.4rem; font-size: 0.78rem; }
  .pc-rehearse { min-height: 2.25rem; padding: 0 0.5rem; font-size: 0.8rem; }
  .pc-tick { min-height: var(--tap); }
  .pc-tick-text { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .pc-body, .tc-body { padding-left: var(--space-2); }
}
`;

// ---------------------------------------------------------------- DOM helpers (browser only; called from mount)

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

// The title of a station as one <span>, the exponent raised (see typesetTitle).
export function titleSpan(text) {
  const span = document.createElement('span');
  prose(span, String(text == null ? '' : text));
  return span;
}

function injectStyle(name, css) {
  const s = document.createElement('style');
  s.setAttribute('data-for', name);
  s.textContent = css;
  document.head.appendChild(s);
  return s;
}

function toneName(token) {
  return String(token).replace(/^--/, '');
}

const threadOf = (id) => THREADS.find((t) => t.id === id) || null;

// The row's chips: the decisions.js chips (so the marks and tints are the site's one vocabulary), with the text cut to the short form that
// fits a one-line row: "C→P→C" for the address, the bare value for the names; the full words stay in the title and in screen-reader text.
function compactChips(host, p) {
  const swap = (chip, visible, hidden) => {
    if (!chip) return;
    let text = null;
    for (const n of chip.childNodes) if (n.nodeType === 3) text = n;
    if (!text) return;
    text.textContent = visible;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = hidden;
    if (hidden.startsWith(', ')) chip.append(sr);
    else chip.insertBefore(sr, text);
  };
  swap(host.querySelector('[data-decision="address"]'), addressLabel(p.address, { short: true }), `, ${addressLabel(p.address)}`);
  swap(host.querySelector('[data-decision="names"]'), p.names, 'Names: ');
}

// ---------------------------------------------------------------- mount

export function mount(el, ctx) {
  const t0 = performance.now();
  const store = ctx.store;
  const here = ctx.station && ctx.station.id ? ctx.station.id : 'problems';
  const self = stationById(here) || stationById('problems');
  const style = injectStyle('problems', CSS);

  const safeGet = (key, fallback) => {
    try { return store.get(key, fallback); } catch { return fallback; }
  };
  const safeSet = (key, value, opts) => {
    try { store.set(key, value, opts); } catch { /* the store is memory-first; nothing to do */ }
  };
  const safeRemove = (key) => {
    try { store.remove(key); } catch { /* ignore */ }
  };

  // ---- state
  let progress = sanitizeProgress(safeGet(PROGRESS_KEY, {}));
  let predict = safeGet(PREDICT_KEY, false) === true;
  const scores = sanitizeScores(safeGet(SCORES_KEY, {}));
  const filter = normalizeFilter(safeGet(FILTER_KEY, null));
  if (ctx.preset && ctx.preset.kind === 'token') {
    const f = parseProblemsToken(ctx.preset.token);
    filter.chapter = f.chapter;
    filter.todo = f.todo;
    filter.names = f.names || 'all-names';
  }
  const deck = deckState(safeGet(DECK_KEY, null));
  const revealed = new Set();     // problems whose answer is showing
  const total = PROBLEMS.length;
  const counts = filterCounts();
  const nCounts = namesCounts();
  const cards = new Map();        // problem id -> { card, answer, btn, openBtn, body, tick, rehearse, built, problem }
  const groups = new Map();       // chapter key -> section
  const topics = new Map();       // topic id -> { card, openBtn, body, tick }
  let armed = false;
  let armTimer = 0;
  let resizeRaf = 0;
  let relayoutHooked = false;

  // ---- header
  const header = h('header', { class: 'station-header' },
    h('h1', null, self.title),
    h('p', { class: 'station-lede' },
      'All 29 problems, one line each. Open a row to see where it lives, which address and which names it needs, and the one-sentence aha. Press Rehearse for the same problem with fresh numbers.'));
  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story threads that pass through this place' });
  for (const tid of self.threads || []) {
    const th = threadOf(tid);
    if (!th) continue;
    badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': tid, title: th.summary }, threadLabel(th))));
  }
  header.append(badges);

  // ---- tools: progress, filters, deck controls, predict
  const progressText = h('p', { id: 'problems-progress', role: 'status' });
  const progressBar = h('progress', { id: 'problems-progress-bar', max: String(total), value: '0', 'aria-labelledby': 'problems-progress' });
  const clearBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-clear' }, 'Clear all ticks');

  const filterBox = h('div', { class: 'pf-row chips', id: 'problems-filters', role: 'group', 'aria-label': 'Show' }, h('span', { class: 'pf-label' }, 'Show'));
  const chapterChips = new Map();
  for (const [key, label] of [['all', `All (${counts.all})`], ['1', `Chapter 1 (${counts['1']})`], ['2', `Chapter 2 (${counts['2']})`],
    ['3', `Chapter 3 (${counts['3']})`], ['P', `Proofs (${counts.P})`]]) {
    const chip = h('button', { type: 'button', class: 'chip', id: `problems-filter-${key}`, 'aria-pressed': 'false', 'data-filter': key }, label);
    chapterChips.set(key, chip);
    filterBox.append(chip);
  }
  const todoChip = h('button', { type: 'button', class: 'chip', id: 'problems-filter-todo', 'aria-pressed': 'false' }, `Not ticked yet (${total})`);
  filterBox.append(todoChip);

  const namesBox = h('div', { class: 'pf-row chips', id: 'problems-filters-names', role: 'group', 'aria-label': 'Names decision' }, h('span', { class: 'pf-label' }, 'Names'));
  const namesChips = new Map();
  for (const key of NAMES_FILTERS) {
    const label = key === 'all-names' ? `No filter (${total})` : `${key} (${nCounts[key]})`;
    const chip = h('button', {
      type: 'button', class: 'chip', id: `problems-filter-names-${key}`, 'aria-pressed': 'false', 'data-names': key, title: key === 'all-names' ? 'Show every problem' : namesMeaning(key),
    }, label);
    namesChips.set(key, chip);
    namesBox.append(chip);
  }

  const modeOne = h('button', { type: 'button', class: 'chip', id: 'problems-mode-one', 'aria-pressed': 'true' }, 'One at a time');
  const modeAll = h('button', { type: 'button', class: 'chip', id: 'problems-mode-all', 'aria-pressed': 'false' }, 'Keep several open');
  const openAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-open-all' }, 'Open all shown');
  const collapseAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-collapse-all', disabled: true }, 'Collapse all');
  const hideAllBtn = h('button', { type: 'button', class: 'btn btn-quiet', id: 'problems-hide-all', disabled: true }, 'Hide all answers');
  const deckBox = h('div', { class: 'pf-row chips', id: 'problems-deck-controls', role: 'group', 'aria-label': 'Open and close rows' },
    h('span', { class: 'pf-label' }, 'Rows'), modeOne, modeAll, openAllBtn, collapseAllBtn, hideAllBtn);

  const predictBox = h('input', { type: 'checkbox', id: 'problems-predict' });
  predictBox.checked = predict;
  const predictLabel = h('label', { class: 'check', for: 'problems-predict' }, predictBox,
    h('span', null, 'Predict first: hide the place, the two chips and the aha until I reveal'));
  const countText = h('p', { id: 'problems-count', role: 'status', class: 'muted problems-count' });
  const deckStatus = h('p', { id: 'problems-deck-status', class: 'sr-only', role: 'status' });
  const keyLine = h('p', { class: 'problems-key', id: 'problems-key' },
    'In a row, the first chip is the address (C is Cartesian, a slide; P is polar, a move; an arrow means convert) and the second is the names decision (none, any, all, home or continuous). Open a row for the words.');
  const tools = h('section', { class: 'panel problems-tools', id: 'problems-tools', 'aria-label': 'Progress and filters' },
    h('div', { class: 'problems-progress-row' }, progressBar, progressText, clearBtn),
    filterBox, namesBox, deckBox, h('div', { class: 'row' }, predictLabel), countText, keyLine, deckStatus);

  // ---- address balance
  const balanceCells = h('div', { class: 'pb-grid', id: 'problems-balance', role: 'img' });
  const balanceNote = h('p', { class: 'muted problems-balance-note' });
  const balancePanel = h('section', { class: 'panel problems-balance-panel', id: 'problems-balance-panel' },
    h('h2', { class: 'panel-title' }, 'Which address makes each question easy?'),
    balanceCells, balanceNote);

  // ---- deck
  const deckEl = h('div', { class: 'problems-deck', id: 'problems-deck', 'data-predict': String(predict) });
  const showAllBtn = h('button', { type: 'button', class: 'btn', id: 'problems-show-all' }, 'Show all');
  const emptyMsg = h('p', { class: 'callout', id: 'problems-empty', hidden: true }, 'No cards match these filters. ', showAllBtn);

  // ---- card
  function buildCard(p) {
    const k = idKey(p.id);
    const titleId = `problems-card-${k}-title`;
    const tones = new Set(addressTones(p.address));
    const card = h('article', {
      class: 'problem-card', id: `problems-card-${k}`, 'data-problem': p.id, 'data-chapter': p.chapter, 'data-kind': p.kind, 'data-thread': p.thread,
      'data-address': p.address, 'data-names': p.names, 'data-station': p.station, 'data-tone': tones.size >= 2 ? 'both' : tones.has('--cart') ? 'cart' : 'polar',
      'data-open': 'false', 'data-revealed': 'false', 'data-done': String(progress[p.id] === true), 'aria-labelledby': titleId,
    });

    // the one-line row: toggle, number (section when open), statement, [address chip, names chip, Rehearse, tick]
    const openBtn = h('button', { type: 'button', class: 'pc-open', id: `problems-open-${k}`, 'aria-expanded': 'false', 'aria-label': `Details of problem ${p.id}` },
      h('span', { class: 'pc-chevron', 'aria-hidden': 'true' }));
    const title = h('h3', { class: 'pc-title', id: titleId }, h('span', { class: 'badge pc-id' }, p.id), h('span', { class: 'pc-section' }, p.section));
    const statement = h('div', { class: 'pc-statement' });
    appendStatement(statement, statementParts(p.statement), 'pc-math');
    let decisions;
    try {
      decisions = decisionChips(p, { idPrefix: `problems-card-${k}`, meaning: false });
      compactChips(decisions, p);
    } catch (err) {
      console.error(`[problems] the chips of ${p.id} could not be drawn`, err);
      decisions = h('span', { class: 'decisions' }, `${addressLabel(p.address, { short: true })} · ${p.names}`);
    }
    const rehearse = h('a', {
      class: 'chip pc-rehearse', id: `problems-rehearse-${k}`, href: `#rehearse-${k}`, 'data-rehearsed': 'false',
      title: 'The same problem with fresh numbers', 'aria-label': `Rehearse problem ${p.id} with fresh numbers`,
    }, 'Rehearse');
    const tick = h('input', { type: 'checkbox', id: `problems-tick-${k}` });
    tick.checked = progress[p.id] === true;
    const tickLabel = h('label', { class: 'check pc-tick', for: `problems-tick-${k}` }, tick,
      h('span', { class: 'pc-tick-text' }, 'Got it'), h('span', { class: 'sr-only' }, ` (problem ${p.id})`));
    const row = h('div', { class: 'pc-row' }, openBtn, title, statement, h('div', { class: 'pc-actions' }, decisions, rehearse, tickLabel));

    // the body: place (the one link to the owner), address and names in words, the aha, then Reveal and the answer
    const st = stationById(p.station);
    const place = h('p', { class: 'pc-place' }, 'Lives at ',
      h('a', { class: 'chip station-chip', href: `#${routeFor(p.id)}`, 'data-station': p.station, title: st ? typesetTitle(st.title) : '' }, p.station),
      st ? h('span', { class: 'muted' }, titleSpan(st.title)) : null);
    if (p.alsoAt && p.alsoAt.length) {
      const also = h('span', { class: 'pc-also' }, 'Also at');
      for (const sid of p.alsoAt) also.append(h('a', { class: 'chip', href: `#${sid}`, 'data-station': sid }, sid));
      place.append(also);
    }
    const addr = h('span', { class: 'addr', 'data-code': p.address });
    for (const tone of addressTones(p.address)) addr.append(h('span', { class: 'addr-dot', 'data-tone': toneName(tone), 'aria-hidden': 'true' }));
    addr.append(document.createTextNode(addressLabel(p.address)));
    const why = h('span', null);
    prose(why, p.addressWhy);
    const addrLine = h('p', { class: 'pc-address' }, addr, why);
    const namesLine = h('p', { class: 'pc-names' }, h('strong', null, `Names: ${p.names}. `), document.createTextNode(namesMeaning(p.names)));
    const aha = h('span', null);
    prose(aha, p.aha);
    const ahaLine = h('p', { class: 'pc-aha' }, h('strong', null, 'The aha. '), aha);
    const hint = h('div', { class: 'pc-hint' }, place, addrLine, namesLine, ahaLine);
    const predictNote = h('p', { class: 'pc-predict-note' }, 'Say it first: which place, which address, which names, and what is the aha?');
    const answer = h('div', { class: 'answer', id: `problems-answer-${k}`, hidden: true, 'data-answer-for': p.id });
    const btn = h('button', {
      type: 'button', class: 'btn reveal', id: `problems-reveal-${k}`, 'aria-expanded': 'false', 'aria-controls': `problems-answer-${k}`,
    }, 'Show the answer');
    const body = h('div', { class: 'pc-body', hidden: true }, hint, predictNote, h('div', { class: 'pc-reveal-row' }, btn), answer);
    card.append(row, body);

    const rec = { card, answer, btn, openBtn, body, tick, rehearse, built: false, problem: p };
    tick.addEventListener('change', () => setTick(p.id, tick.checked));
    cards.set(p.id, rec);
    return card;
  }

  function buildAnswer(p, box) {
    const texHost = h('div');
    tex(texHost, p.answer.tex, { display: true });
    const final = h('div', { class: 'tex-scroll pc-final', id: `${box.id}-final`, tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide' }, texHost);
    const hintEl = h('p', { class: 'pc-scroll-hint muted', hidden: true }, 'Scroll sideways to see the rest.');
    const plain = h('details', { class: 'pc-plain', id: `${box.id}-plain` }, h('summary', { id: `${box.id}-plain-toggle` }, 'Plain text version (wraps to fit)'), h('p', { class: 'mono' }, p.answer.text));
    const native = nativeRoutes(p);
    const badgeFor = (route) => (native.length === 1 && native[0] === route ? h('span', { class: 'badge', 'data-tone': route }, 'easy here') : null);
    const cartText = h('p');
    prose(cartText, p.routes.cart);
    const polarText = h('p');
    prose(polarText, p.routes.polar);
    const routes = h('div', { class: 'pc-routes' },
      h('section', { class: 'pc-route', 'data-route': 'cart' }, h('h4', null, 'In Cartesian (slide)', badgeFor('cart')), cartText),
      h('section', { class: 'pc-route', 'data-route': 'polar' }, h('h4', null, 'In polar (spin and stretch)', badgeFor('polar')), polarText));
    box.replaceChildren(h('h4', { class: 'pc-label' }, 'Answer'), final, hintEl, plain, routes);
  }

  function updateScrollHint(answer) {
    const final = answer.querySelector('.pc-final');
    const hintEl = answer.querySelector('.pc-scroll-hint');
    if (!final || !hintEl) return;
    hintEl.hidden = !(final.scrollWidth > final.clientWidth + 1);
  }

  // ---- open, collapse, reveal
  const announce = (text) => { deckStatus.textContent = text; };

  function updateDeckButtons() {
    modeOne.setAttribute('aria-pressed', String(deck.mode === 'one'));
    modeAll.setAttribute('aria-pressed', String(deck.mode === 'all'));
    collapseAllBtn.disabled = deck.open.length === 0;
    hideAllBtn.disabled = revealed.size === 0;
  }

  function saveDeck() {
    safeSet(DECK_KEY, { open: [...deck.open], mode: deck.mode }, { persist: false });
    updateDeckButtons();
  }

  function setRevealed(id, on) {
    const rec = cards.get(id);
    if (!rec) return;
    const p = rec.problem;
    if (on) {
      if (!rec.built) {
        rec.built = true;
        try {
          buildAnswer(p, rec.answer);
        } catch (err) {
          console.error(`[problems] the answer of ${p.id} could not be drawn`, err);
          rec.answer.replaceChildren(h('p', { class: 'callout' }, `This answer could not be drawn. Plain text: ${p.answer.text}`));
        }
      }
      rec.answer.hidden = false;
      rec.card.dataset.revealed = 'true';
      rec.btn.setAttribute('aria-expanded', 'true');
      rec.btn.textContent = 'Hide the answer';
      revealed.add(id);
      updateScrollHint(rec.answer);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (revealed.has(id)) updateScrollHint(rec.answer); }, () => {});
    } else {
      rec.answer.hidden = true;
      rec.card.dataset.revealed = 'false';
      rec.btn.setAttribute('aria-expanded', 'false');
      rec.btn.textContent = 'Show the answer';
      revealed.delete(id);
    }
    updateDeckButtons();
  }

  function collapse(id) {
    const rec = cards.get(id);
    if (!rec) return;
    setRevealed(id, false);
    rec.card.dataset.open = 'false';
    rec.openBtn.setAttribute('aria-expanded', 'false');
    rec.body.hidden = true;
    const i = deck.open.indexOf(id);
    if (i >= 0) deck.open.splice(i, 1);
  }

  function expand(id) {
    const rec = cards.get(id);
    if (!rec) return;
    if (deck.mode === 'one') for (const other of [...deck.open]) if (other !== id) collapse(other);
    if (!deck.open.includes(id)) deck.open.push(id);
    rec.card.dataset.open = 'true';
    rec.openBtn.setAttribute('aria-expanded', 'true');
    rec.body.hidden = false;
  }

  function setOpen(id, on, { say = true, scroll = false } = {}) {
    if (!cards.has(id)) return;
    if (on) expand(id);
    else collapse(id);
    saveDeck();
    if (say) announce(`${on ? 'Opened' : 'Collapsed'} problem ${id}.`);
    if (on && scroll) cards.get(id).card.scrollIntoView({ block: 'nearest' });
  }

  function toggleReveal(id) {
    const rec = cards.get(id);
    if (!rec) return;
    if (rec.card.dataset.open !== 'true') setOpen(id, true, { say: false });
    setRevealed(id, rec.answer.hidden);
  }

  function setMode(mode) {
    deck.mode = mode === 'all' ? 'all' : 'one';
    if (deck.mode === 'one') for (const id of deck.open.slice(0, -1)) collapse(id);   // switching back to one keeps the last row opened
    saveDeck();
  }

  function openAllShown() {
    deck.mode = 'all';
    let n = 0;
    for (const rec of cards.values()) {
      if (rec.card.hidden) continue;
      expand(rec.problem.id);
      n++;
    }
    saveDeck();
    announce(`Opened ${n} problems.`);
  }

  function collapseAll() {
    for (const id of [...deck.open]) collapse(id);
    saveDeck();
    announce('Collapsed all rows.');
  }

  hideAllBtn.addEventListener('click', () => {
    for (const id of [...revealed]) setRevealed(id, false);
    announce('Answers hidden.');
  });
  modeOne.addEventListener('click', () => setMode('one'));
  modeAll.addEventListener('click', () => setMode('all'));
  openAllBtn.addEventListener('click', openAllShown);
  collapseAllBtn.addEventListener('click', collapseAll);

  // one delegated listener for every row of the deck
  deckEl.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const card = t ? t.closest('.problem-card') : null;
    if (!t || !card) return;
    const id = card.dataset.problem;
    if (t.closest('.reveal')) toggleReveal(id);
    else if (t.closest('.pc-open')) setOpen(id, card.dataset.open !== 'true', { scroll: true });
    else if (card.dataset.open !== 'true' && t.closest('.pc-statement, .pc-title') && !t.closest('a, button, label, input')) setOpen(id, true, { scroll: true });
  });
  deckEl.addEventListener('keydown', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const card = t ? t.closest('.problem-card') : null;
    if (!t || !card) return;
    if (e.key === 'Escape' && card.dataset.open === 'true') {
      e.preventDefault();
      setOpen(card.dataset.problem, false);
      cards.get(card.dataset.problem).openBtn.focus();
      return;
    }
    if (!t.classList.contains('pc-open') || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const btns = [...deckEl.querySelectorAll('.problem-card:not([hidden]) .pc-open')];
    const i = btns.indexOf(t);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : Math.max(0, Math.min(btns.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
    e.preventDefault();
    if (btns[j]) btns[j].focus();
  });

  // ---- ticks, progress
  function writeProgress() {
    if (Object.keys(progress).length) safeSet(PROGRESS_KEY, progress);
    else safeRemove(PROGRESS_KEY);
  }

  function renderProgress() {
    const n = countTicked(progress);
    progressText.textContent = `${n} of ${total} ticked`;
    progressBar.value = n;
    todoChip.textContent = `Not ticked yet (${total - n})`;
  }

  // The card is not re-filtered here: ticking under "Not ticked yet" must not make the card vanish under the pointer.
  function setTick(id, on) {
    progress = setTicked(progress, id, on);
    const rec = cards.get(id);
    if (rec) rec.card.dataset.done = String(on);
    writeProgress();
    renderProgress();
  }

  function disarm() {
    armed = false;
    clearTimeout(armTimer);
    armTimer = 0;
    clearBtn.textContent = 'Clear all ticks';
  }

  clearBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      clearBtn.textContent = 'Click again to clear all ticks';
      armTimer = setTimeout(disarm, ARM_MS);
      return;
    }
    progress = {};
    safeRemove(PROGRESS_KEY);
    for (const rec of cards.values()) { rec.tick.checked = false; rec.card.dataset.done = 'false'; }
    for (const t of topics.values()) t.tick.checked = false;
    renderProgress();
    disarm();
  });

  // ---- filters
  function applyFilters() {
    const show = new Set(visibleIds(filter, progress));
    for (const rec of cards.values()) rec.card.hidden = !show.has(rec.problem.id);
    for (const section of groups.values()) section.hidden = !section.querySelector('.problem-card:not([hidden])');
    const name = filterLabel(filter);
    countText.textContent = `Showing ${show.size} of ${total}${name ? `: ${name}` : ''}.`;
    emptyMsg.hidden = show.size > 0;
    for (const [k, chip] of chapterChips) chip.setAttribute('aria-pressed', String(k === filter.chapter));
    for (const [k, chip] of namesChips) chip.setAttribute('aria-pressed', String(k === filter.names));
    todoChip.setAttribute('aria-pressed', String(filter.todo));
    safeSet(FILTER_KEY, { chapter: filter.chapter, todo: filter.todo, names: filter.names }, { persist: false });
  }

  for (const [k, chip] of chapterChips) chip.addEventListener('click', () => { filter.chapter = k; applyFilters(); });
  for (const [k, chip] of namesChips) chip.addEventListener('click', () => { filter.names = k; applyFilters(); });
  todoChip.addEventListener('click', () => { filter.todo = !filter.todo; applyFilters(); });
  showAllBtn.addEventListener('click', () => {
    filter.chapter = 'all';
    filter.todo = false;
    filter.names = 'all-names';
    applyFilters();
  });
  predictBox.addEventListener('change', () => {
    predict = predictBox.checked;
    deckEl.dataset.predict = String(predict);
    balancePanel.hidden = predict;
    safeSet(PREDICT_KEY, predict);
  });

  // ---- deck groups
  for (const [gk, heading] of [['1', 'Chapter 1'], ['2', 'Chapter 2'], ['3', 'Chapter 3'], ['P', 'Proof examples']]) {
    const list = h('div', { class: 'pc-list' });
    for (const p of PROBLEMS) if (filterMatches(p, gk)) list.append(buildCard(p));
    const section = h('section', { class: 'problems-group', id: `problems-group-${gk}`, 'aria-label': heading }, h('h2', null, heading), list);
    groups.set(gk, section);
    deckEl.append(section);
  }
  deckEl.append(emptyMsg);

  // ---- rehearsed marks on the Rehearse links
  function paintRehearsed() {
    for (const id of rehearsedIds(scores)) {
      const rec = cards.get(id);
      if (!rec) continue;
      rec.rehearse.dataset.rehearsed = 'true';
      rec.rehearse.textContent = 'Rehearse again';
      rec.rehearse.title = 'You got this one right once. Try fresh numbers again.';
    }
  }

  // ---- balance
  function renderBalance() {
    const b = addressBalance(PROBLEMS);
    balanceCells.replaceChildren();
    for (const p of PROBLEMS) {
      const tones = new Set(addressTones(p.address));
      const kind = tones.size >= 2 ? 'both' : tones.has('--cart') ? 'cart' : 'polar';
      balanceCells.append(h('span', { class: 'pb-cell', 'data-kind': kind, title: `${p.id}: ${addressLabel(p.address)}` }));
    }
    balanceCells.setAttribute('aria-label', `${total} problems in handout order: ${b.cart} easiest in Cartesian, ${b.polar} in polar, ${b.both} use both.`);
    balanceNote.textContent = `Blue: Cartesian is easiest (${b.cart}). Orange: polar is easiest (${b.polar}). Split: you use both (${b.both}).`;
  }

  // ---- topics: one-line cards too
  function buildTopicCard(t) {
    const k = idKey(t.id);
    const tick = h('input', { type: 'checkbox', id: `problems-topic-tick-${k}` });
    tick.checked = progress[t.id] === true;
    tick.addEventListener('change', () => setTick(t.id, tick.checked));
    const summary = h('p');
    prose(summary, t.summary);
    const covers = h('ul');
    for (const c of t.covers) {
      const li = h('li');
      prose(li, c);
      covers.append(li);
    }
    const where = h('div', { class: 'chips' });
    for (const sid of t.stations) {
      const s = stationById(sid);
      if (s) where.append(h('a', { class: 'chip', href: `#${sid}`, 'data-station': sid }, titleSpan(shortTitle(s.title))));
    }
    const probList = problemsForTopic(t.id);
    const probs = h('div', { class: 'chips' });
    for (const p of probList) probs.append(h('a', { class: 'chip problem-chip', href: `#${routeFor(p.id)}` }, p.id));
    const first = stationById(t.stations[0]);
    const start = h('a', { class: 'btn', href: `#${topicRoute(t.id)}`, id: `problems-topic-start-${k}` }, titleSpan(`Start at ${first ? first.title : t.title}`));
    const openBtn = h('button', { type: 'button', class: 'pc-open', id: `problems-topic-open-${k}`, 'aria-expanded': 'false', 'aria-label': `Details of topic ${t.id}` },
      h('span', { class: 'pc-chevron', 'aria-hidden': 'true' }));
    const title = h('h3', { class: 'tc-title' }, h('span', { class: 'badge pc-id' }, t.id), h('span', null, t.title));
    const body = h('div', { class: 'tc-body', hidden: true }, summary, covers,
      h('p', { class: 'tc-label' }, 'Where to learn it'), where,
      probList.length ? h('p', { class: 'tc-label' }, 'Problems') : null, probList.length ? probs : null, start);
    const card = h('article', { class: 'panel topic-card', id: `problems-topic-${k}`, 'data-topic': t.id, 'data-thread': t.thread, 'data-open': 'false' },
      h('div', { class: 'tc-row' }, openBtn, title,
        h('div', { class: 'tc-actions' },
          h('span', { class: 'thread-badge', 'data-thread': t.thread }, t.thread),
          h('span', { class: 'tc-count' }, problemCount(probList.length)),
          h('label', { class: 'check pc-tick', for: `problems-topic-tick-${k}` }, tick, h('span', { class: 'pc-tick-text' }, 'I can explain this')))),
      body);
    openBtn.addEventListener('click', () => {
      const on = card.dataset.open !== 'true';
      card.dataset.open = String(on);
      openBtn.setAttribute('aria-expanded', String(on));
      body.hidden = !on;
    });
    topics.set(t.id, { card, openBtn, body, tick });
    return card;
  }
  const topicList = h('div', { class: 'pc-list' });
  for (const t of TOPICS) topicList.append(buildTopicCard(t));
  const topicsSection = h('section', { class: 'problems-topics', id: 'problems-topics', 'aria-labelledby': 'problems-topics-title' },
    h('h2', { id: 'problems-topics-title' }, 'Topics: the syllabus checklist'),
    h('p', { class: 'muted' }, 'Tick a topic when you could explain it to a friend without looking. Open a row for what it covers and where to learn it.'),
    topicList);

  // ---- station links
  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  {
    const nb = stationNeighbours(STATIONS, self.id);
    const shown = new Set();
    const add = (targetId, attrs, prefix) => {
      const s = targetId ? stationById(targetId) : null;
      if (!s || shown.has(targetId)) return;
      shown.add(targetId);
      links.append(h('a', { class: 'station-link', href: `#${targetId}`, ...attrs }, titleSpan((prefix || '') + s.title)));
    };
    add(nb.prev, { 'data-dir': 'prev', id: `${self.id}-link-prev` });
    add(nb.next, { 'data-dir': 'next', id: `${self.id}-link-next` });
    for (const t of self.threads || []) {
      const n = nb.thread[t];
      if (!n) continue;
      add(n.prev, { 'data-thread': t, 'data-dir': 'prev', id: `${self.id}-link-thread-${t}` }, threadLinkPrefix(t, 'prev'));
      add(n.next, { 'data-thread': t, 'data-dir': 'next', id: `${self.id}-link-thread-${t}` }, threadLinkPrefix(t, 'next'));
    }
    add('home', { id: `${self.id}-link-home` });
  }

  // ---- assemble, restore the deck, paint
  el.append(header, tools, balancePanel, deckEl, topicsSection, links);
  for (const id of deck.open) {
    const rec = cards.get(id);
    if (!rec) continue;
    rec.card.dataset.open = 'true';
    rec.openBtn.setAttribute('aria-expanded', 'true');
    rec.body.hidden = false;
  }
  applyFilters();
  renderBalance();
  balancePanel.hidden = predict;
  renderProgress();
  paintRehearsed();
  updateDeckButtons();
  const mountMs = performance.now() - t0;

  // ---- hooks and the one window listener (attached last)
  const mv = (window.__mv = window.__mv || {});
  const hook = {
    visible: () => [...cards.values()].filter((r) => !r.card.hidden).map((r) => r.problem.id),
    progress: () => ({ ...progress }),
    filter: () => ({ chapter: filter.chapter, todo: filter.todo, names: filter.names }),
    deck: () => ({ open: [...deck.open], mode: deck.mode }),
    revealed: () => [...revealed],
    mountMs,
  };
  mv.problems = hook;

  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      for (const id of revealed) updateScrollHint(cards.get(id).answer);
    });
  };
  window.addEventListener('resize', onResize);
  relayoutHooked = true;

  return function unmount() {
    if (relayoutHooked) window.removeEventListener('resize', onResize);
    relayoutHooked = false;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
    clearTimeout(armTimer);
    armTimer = 0;
    style.remove();
    if (window.__mv && window.__mv.problems === hook) delete window.__mv.problems;
  };
}
````

### Appendix B. `js/stations/home.js` (unified diff against the committed file)

````diff
--- a/js/stations/home.js
+++ b/js/stations/home.js
@@ -1,19 +1,24 @@
 // js/stations/home.js
 // The Map: the first screen of the site. A finder, one draggable dot with both of its addresses and all of its names,
-// the four-line spine of the test, an SVG map of the 21 places with the three story threads, and a night-before plan.
+// the four-line spine of the test, the two decisions that settle every problem, an SVG map of the 22 places with the three story
+// threads (its problem circles fill when ticked and ring when rehearsed), and a night-before plan.
 //
 // Pure helpers (layoutMap, the finder, the readout) have no DOM and import in Node. All DOM work happens inside mount.
 // Every text goes through textContent, createTextNode, prose() or appendStatement() (tex() in problems.js); there is no innerHTML in this file.
-// Design: docs/designs/iter-1/i1-station-home-problems.md (sections 2 to 5 and Appendix A).
+// Design: docs/designs/iter-1/i1-station-home-problems.md (sections 2 to 5 and Appendix A) and docs/designs/iter-2/i2-home-index-deck.md (this file is its Appendix B).
 
-import { STATIONS, THREADS, stationById, stationForTopic, threadLabel, threadLinkPrefix } from '../registry.js';
-import { PROBLEMS, TOPICS, problemById, routeFor, topicRoute, statementParts } from '../data/problems.js';
+import { STATIONS, THREADS, PARTS, stationById, stationForTopic, threadLabel, threadLinkPrefix } from '../registry.js';
+import { PROBLEMS, TOPICS, ADDRESS_CODES, problemById, routeFor, topicRoute, statementParts, addressLabel } from '../data/problems.js';
 import { createPlane, drawCartAddress, drawPolarAddress, drawSeam } from '../core/plane.js';
 import { createExplainer } from '../core/explainer.js';
 import { createStaircase } from '../core/staircase.js';
 import { cart as tintCart, polar as tintPolar, prose } from '../core/katex.js';
 import { C, Arg, abs, eq, fromPolar, fmtCart, fmtNum, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
-import { sanitizeProgress, countTicked, stationNeighbours, shortTitle, shortThreadTitle, typesetTitle, titleSpan, appendStatement, PROGRESS_KEY } from './problems.js';
+import { chips as decisionChips, NAMES_CODES, namesMeaning, addressMeaning } from '../core/decisions.js';
+import {
+  sanitizeProgress, countTicked, stationNeighbours, shortTitle, shortThreadTitle, typesetTitle, titleSpan, appendStatement, namesCounts,
+  sanitizeScores, rehearsedIds, problemCount, PROGRESS_KEY, SCORES_KEY,
+} from './problems.js';
 
 export { shortTitle, shortThreadTitle };
 
@@ -21,13 +26,15 @@
 
 // ---------------------------------------------------------------- constants
 
-// The narrowest host that gets the serpentine map. 712 is where the part captions (the longest words on the map) still clear each other
-// in the collision sweep of the unit tests (U6); below it a caption pair overlaps, so the tall single column takes over.
-export const WIDE_MIN = 712;
-// The five part names. app.js keeps its own copy (PART_TITLES); a unit test checks that they still agree.
-export const PART_LABELS = { I: 'The point (Ch 1)', II: 'Curves and sets (Ch 1)', III: 'Motions (Ch 2)', IV: 'Zoom (Ch 3)', V: 'The diary and the index' };
+// The narrowest host that gets the serpentine map: 780 is the first width at which every title of the 22 places fits its column in three lines
+// (at 8 columns 'Slide, Spin, Stretch, Mirror' needs 12 characters a line, which a 91.2 px column gives), and no caption or U-turn collides from there up (U6).
+// Below it the tall single column takes over.
+export const WIDE_MIN = 780;
+// The five part names, computed from the registry's PARTS: "The point (Ch 1)" from { title: 'The point', note: 'Chapter 1' }; a note that is not a chapter adds nothing.
+export const PART_LABELS = Object.fromEntries(Object.entries(PARTS).map(([k, v]) => [k, /^Chapter \d+$/.test(v.note) ? `${v.title} (${v.note.replace('Chapter ', 'Ch ')})` : v.title]));
 export const GEOM = Object.freeze({
-  PADX: 24, COLS: 7, TOP: 64, PITCH: 156, BOTTOM: 100, LANE: 9, PILL_W: 26, PILL_H: 40, CHAR_W: 6.6,
+  PADX: 24, COLS: 8, TOP: 64, PITCH: 156, BOTTOM: 100, LANE: 9, PILL_W: 26, PILL_H: 40, CHAR_W: 6.6,
+  CAP_W: 7, CAP_EDGE: 4,
   N_AXIS: 32, N_PITCH: 48, N_PART_H: 30, N_TOP: 8, N_BOTTOM: 12,
 });
 
@@ -63,7 +70,7 @@
   return stations.slice().sort((a, b) => a.order - b.order).filter((s) => s.threads.includes(threadId)).map((s) => s.id);
 }
 
-// Pure geometry of the map for a container width. Wide (>= WIDE_MIN): 3 serpentine rows of 7. Narrow: one vertical track.
+// Pure geometry of the map for a container width. Wide (>= WIDE_MIN): 3 serpentine rows of 8, 8 and 6. Narrow: one vertical track.
 export function layoutMap(stations = STATIONS, width = 360, threads = THREADS, problems = PROBLEMS) {
   const K = GEOM;
   const list = stations.slice().sort((a, b) => a.order - b.order);
@@ -79,6 +86,7 @@
   if (mode === 'wide') {
     colW = (W - 2 * K.PADX) / K.COLS;
     const maxChars = Math.floor((colW - 12) / K.CHAR_W);
+    const firsts = [];
     list.forEach((s, i) => {
       const row = Math.floor(i / K.COLS);
       const c = i % K.COLS;
@@ -96,14 +104,18 @@
         dots: ids.map((pid, j) => ({ problem: pid, x: x + (j - (ids.length - 1) / 2) * 10, y: y + 84 })),
         hit: { x: x - colW / 2, y: y - 34, w: colW, h: 126 },
       });
-      const first = i === 0 || list[i - 1].part !== s.part;
-      if (first || c === 0) {
-        parts.push({
-          part: s.part, text: `${s.part} · ${PART_LABELS[s.part]}` + (first ? '' : ' cont.'), cont: !first,
-          x: x - dir * 12, y: y - 44, anchor: dir > 0 ? 'start' : 'end', node: s.id,
-        });
-      }
+      if (i === 0 || list[i - 1].part !== s.part) firsts.push({ s, dir, x, y });
     });
+    // One caption per part, above the number of its first station and anchored along the reading direction of that row when it fits
+    // inside the map, the other way when it does not (Curves and sets starts at the right edge of row 1).
+    for (const f of firsts) {
+      const text = `${f.s.part} \u00b7 ${PART_LABELS[f.s.part]}`;
+      const w = text.length * K.CAP_W;
+      const along = f.dir > 0 ? 'start' : 'end';
+      const fits = along === 'start' ? f.x - 12 + w <= W - K.CAP_EDGE : f.x + 12 - w >= K.CAP_EDGE;
+      const anchor = fits ? along : along === 'start' ? 'end' : 'start';
+      parts.push({ part: f.s.part, text, cont: false, x: anchor === 'start' ? f.x - 12 : f.x + 12, y: f.y - 44, anchor, node: f.s.id });
+    }
     rows = Math.ceil(list.length / K.COLS);
     height = K.TOP + K.PITCH * (rows - 1) + K.BOTTOM;
   } else {
@@ -299,6 +311,30 @@
   return `z = ${fmtCart(z)}; r = ${fmtNum(r)}; Arg z = ${angleText(th)}\narg z = { ${fmtNum(th)} + 2πk : k an integer }`;
 }
 
+// ---------------------------------------------------------------- pure helpers: the two decisions and the map labels
+
+// The two-decisions block of the home page as data: the six address choices with their meaning, and the five Names values with the
+// number of problems each settles and the index route that lists them. Everything is read from the data and from core/decisions.js.
+export function decisionBlock(problems = PROBLEMS) {
+  const counts = namesCounts(problems);
+  return {
+    address: ADDRESS_CODES.map((code) => ({ code, label: addressLabel(code), meaning: addressMeaning(code) })),
+    names: NAMES_CODES.map((code) => ({ code, count: counts[code], countText: problemCount(counts[code]), meaning: namesMeaning(code), route: `problems-names-${code}` })),
+  };
+}
+
+// What a screen reader says for a place on the map; rehearsed is an array or a Set of problem ids. Read by the map and by a unit test.
+export function stationLabel(st, progress, rehearsed, problems = PROBLEMS) {
+  const ids = problems.filter((p) => p.station === st.id).map((p) => p.id);
+  const done = ids.filter((id) => progress && progress[id] === true).length;
+  const re = new Set(rehearsed || []);
+  const rehearsedHere = ids.filter((id) => re.has(id)).length;
+  const probs = ids.length
+    ? `${ids.join(', ')}${done ? `, ${done} of ${ids.length} ticked` : ''}${rehearsedHere ? `, ${rehearsedHere} rehearsed` : ''}`
+    : 'none';
+  return `${typesetTitle(st.title)}. Place ${st.order}. Problems: ${probs}. Threads: ${st.threads.join(', ')}.`;
+}
+
 // ---------------------------------------------------------------- station CSS (tokens only; every rule prefixed)
 
 const CSS = `
@@ -352,6 +388,7 @@
 .home-map .stop[data-thread="T2"] { fill: var(--surface); stroke: var(--tone); stroke-width: 2.5; }
 .home-map .pdot { fill: none; stroke: var(--text-muted); stroke-width: 1.4; }
 .home-map .pdot.is-done { fill: var(--ok); stroke: var(--ok); }
+.home-map .pdot.is-rehearsed { stroke: var(--polar); stroke-width: 2.4; }
 .home-map .map-num { fill: var(--text-muted); font: 600 11px var(--font-mono); }
 .home-map .map-label { fill: var(--text); font: 600 12.5px var(--font); }
 .home-map[data-mode="narrow"] .map-label { font-size: 13.5px; }
@@ -369,6 +406,17 @@
 .home-plan .chips { margin-top: var(--space-1); }
 .home-plan .chips .chip { min-height: 2rem; font-size: 0.88rem; }
 .home-header-actions { margin-top: var(--space-2); }
+.home-decisions-grid { align-items: start; margin-top: var(--space-3); }
+.home-decision h3 { margin: 0 0 var(--space-2); }
+.home-decision > p { margin: 0 0 var(--space-3); }
+.home-decision-list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--space-2); }
+.home-decision-list li { display: grid; grid-template-columns: minmax(9rem, auto) minmax(0, 1fr); gap: var(--space-1) var(--space-3); align-items: center; min-width: 0; }
+.home-decision-list .hd-meaning { color: var(--text-muted); font-size: 0.95rem; min-width: 0; }
+.home-decision-link { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); min-height: var(--tap); color: var(--text); text-decoration: none; border-radius: var(--radius-sm); }
+.home-decision-link:hover .hd-count { text-decoration: underline; }
+.home-decision-link .decision-chip { cursor: pointer; }
+.home-decision-list .hd-count { color: var(--text-muted); font-size: 0.88rem; }
+@media (max-width: 30rem) { .home-decision-list li { grid-template-columns: minmax(0, 1fr); } }
 `;
 
 // ---------------------------------------------------------------- DOM helpers (browser only; called from mount)
@@ -603,16 +651,16 @@
   const workingPanel = h('section', { class: 'panel', id: 'home-working', 'aria-labelledby': 'home-working-title' },
     h('h2', { id: 'home-working-title' }, 'The same dot, written both ways'), exHost);
 
-  // ---- spine
+  // ---- spine: the four lines of docs/STORY.md section 0, then one paragraph each
   const spineItems = [
-    { thread: 'T1', head: 'Place and move', stations: ['addresses', 'arithmetic'],
-      text: 'A point has a place (slide x across, then y up) and a move (turn by θ, then stretch by r). Adding composes places; multiplying composes moves. Pick the address where the question is easy.' },
-    { thread: 'T2', head: 'The staircase', stations: ['staircase', 'roots'],
-      text: 'A move has many names: θ, θ + 2π, θ − 2π, and so on. That whole set is arg z. Arg z is the one name in (−π, π]. The point z itself never changes.' },
-    { thread: 'T3', head: 'Motion and time', stations: ['mappings', 'powermap', 'lab'],
-      text: 'A function picks up every point and puts it down somewhere. A stroke is carried along on one clock. z^n, z^(1/n) and 1/z work directly on the polar address.' },
-    { thread: 'T3', head: 'Zoom', stations: ['derivative', 'cauchy-riemann'],
-      text: 'Up close, a differentiable map is a single spin-and-stretch. Cauchy–Riemann says there is no mirror part. conj z, Re z and |z|² fail because they flip or squash.' },
+    { thread: 'T1', head: 'A move', stations: ['addresses', 'arithmetic'],
+      text: 'The point z sits somewhere: that is its Cartesian address (x, y), a slide from 0. The same point is what you get by turning 1 by θ and stretching it by r: its polar address (r, θ), a move. Adding composes slides; multiplying composes moves. Pick the address where the question is easy.' },
+    { thread: 'T2', head: 'Many names', stations: ['staircase', 'roots'],
+      text: 'Turning by θ and by θ + 2π do the same thing, so a move has endless names. arg z is all of them, Arg z is the one in (−π, π], and z itself never changes. Powers do not care which name you use. Roots need all of them. Principal values use the home one.' },
+    { thread: 'T3', head: 'A motion', stations: ['mappings', 'powermap', 'lab'],
+      text: 'A function picks up every point and puts it down somewhere. A stroke is carried along on one clock. Functions built from moves (z^n, z^(1/n), 1/z) keep circles and rays; functions built from slides keep lines.' },
+    { thread: 'T3', head: 'One move, up close', stations: ['derivative', 'cauchy-riemann'],
+      text: 'Zoom into a smooth map and it looks linear. It is differentiable when that linear map is one move: multiply by a complex number f′(z₀), which has the same two addresses as any other. Cauchy–Riemann says there is no mirror part. conj z, Re z and |z|² fail because they flip or squash.' },
   ];
   const spineList = h('ol', { class: 'home-spine-list', id: 'home-spine-list' });
   spineItems.forEach((it, i) => {
@@ -623,12 +671,48 @@
       proseEl('p', null, it.text), chips));
   });
   const epigraph = h('div', { class: 'home-epigraph', id: 'home-spine-line' },
-    h('p', null, 'A complex number is a ', h('span', { class: 'tone-cart' }, 'place'), ' and a ', h('span', { class: 'tone-polar' }, 'move'), '.'),
-    h('p', null, 'A function is a motion of the whole plane.'),
-    h('p', null, 'The derivative is the move you see when you zoom into the motion.'));
+    h('p', null, 'A complex number is a ', h('span', { class: 'tone-polar' }, 'move'), ': turn, then stretch.'),
+    h('p', null, 'A turn has many names.'),
+    h('p', null, 'A function moves every point at once.'),
+    h('p', null, 'Differentiable means: up close, one move.'));
   const spinePanel = h('section', { class: 'panel', id: 'home-spine', 'aria-labelledby': 'home-spine-title' },
     h('h2', { id: 'home-spine-title' }, 'The whole test in four lines'), epigraph, spineList);
 
+  // ---- the two decisions (under the spine): the Address chips as a list, the Names chips as links into the index
+  const blk = decisionBlock();
+  const decChip = (decision, code, prefix) => {
+    const probe = decision === 'address' ? { address: code } : { names: code };
+    try {
+      return decisionChips(probe, { idPrefix: prefix, meaning: false });
+    } catch (err) {
+      console.error('[home] a decision chip could not be drawn', err);
+      return h('span', { class: 'decisions' }, code);
+    }
+  };
+  const addressList = h('ul', { class: 'home-decision-list', id: 'home-decision-address-list' });
+  for (const a of blk.address) {
+    addressList.append(h('li', { 'data-code': a.code }, decChip('address', a.code, `home-decision-address-chip-${a.code.replace(/[^a-z]+/gi, '-').toLowerCase()}`), h('span', { class: 'hd-meaning' }, a.meaning)));
+  }
+  const namesList = h('ul', { class: 'home-decision-list', id: 'home-decision-names-list' });
+  for (const n of blk.names) {
+    namesList.append(h('li', { 'data-code': n.code },
+      h('a', { class: 'home-decision-link', id: `home-decision-names-link-${n.code}`, href: `#${n.route}`, 'aria-label': `${n.code}: ${n.countText}. Show them in the problem index.` },
+        decChip('names', n.code, `home-decision-names-chip-${n.code}`), h('span', { class: 'hd-count' }, n.countText)),
+      h('span', { class: 'hd-meaning' }, n.meaning)));
+  }
+  const decisionsPanel = h('section', { class: 'panel', id: 'home-decisions', 'aria-labelledby': 'home-decisions-title' },
+    h('h2', { id: 'home-decisions-title' }, 'Two decisions settle every problem'),
+    h('p', { class: 'muted' }, 'Before you compute, decide two things. The problem index shows both on every card. The Rehearse link on a card gives you the same problem with fresh numbers, and there you set both before you see the answer.'),
+    h('div', { class: 'two-planes home-decisions-grid' },
+      h('div', { class: 'home-decision', id: 'home-decision-address' },
+        h('h3', null, '1. Address: where is the question easy?'),
+        h('p', null, 'Cartesian (x, y) says where z sits: a slide. The polar address (r, θ) says how to reach it: a move. Adding is a slide and multiplying is a move, so pick the address where the question is native, work there, and translate back.'),
+        addressList),
+      h('div', { class: 'home-decision', id: 'home-decision-names' },
+        h('h3', null, '2. Names: which turns of the angle count?'),
+        h('p', null, 'An angle has many names: θ, θ + 2π, θ − 2π, and so on. Ask which of them the question needs. Tap a choice to see those problems in the index.'),
+        namesList)));
+
   // ---- map
   const legend = h('div', { class: 'chips home-legend', id: 'home-legend', role: 'group', 'aria-label': 'Story threads' });
   const legendBtns = new Map();
@@ -652,16 +736,10 @@
   const mapPanel = h('section', { class: 'panel', id: 'home-map-panel', 'aria-labelledby': 'home-map-title' },
     h('h2', { id: 'home-map-title' }, 'The map'),
     h('p', { class: 'muted' },
-      'Each place is a stop. The three lines are the story threads: a dot on a line means that thread stops there. The small circles under a place are its review problems; they fill in when you tick them in the problem index.'),
+      'Each place is a stop. The three lines are the story threads: a dot on a line means that thread stops there. The small circles under a place are its review problems. A circle fills when you tick it in the problem index, and gets a heavy orange ring when you get its fresh-number version right in rehearsal.'),
     legend, threadNote, mapHost, fallbackHost, progressLine);
 
-  const ownedIds = (id) => PROBLEMS.filter((p) => p.station === id).map((p) => p.id);
-  function stationLabel(st) {
-    const ids = ownedIds(st.id);
-    const done = ids.filter((id) => progress[id] === true).length;
-    const probs = ids.length ? `${ids.join(', ')}${done ? `, ${done} of ${ids.length} ticked` : ''}` : 'none';
-    return `${typesetTitle(st.title)}. Place ${st.order}. Problems: ${probs}. Threads: ${st.threads.join(', ')}.`;
-  }
+  let rehearsed = rehearsedIds(sanitizeScores(safeGet(SCORES_KEY, {})));
 
   function showFallback(err) {
     console.error('[home] the map could not be drawn', err);
@@ -700,7 +778,7 @@
       const gStations = sv('g', { class: 'map-stations' });
       for (const n of g.nodes) {
         const st = stationById(n.id);
-        const label = stationLabel(st);
+        const label = stationLabel(st, progress, rehearsed);
         const a = sv('a', {
           class: 'map-station', 'data-station': n.id, 'data-threads': st.threads.join(' '), href: `#${n.id}`, role: 'link', tabindex: '0',
           'aria-label': label, 'aria-current': n.id === 'home' ? 'page' : null,
@@ -739,16 +817,22 @@
 
   function paintProgress() {
     progress = sanitizeProgress(safeGet(PROGRESS_KEY, {}));
-    for (const c of svg.querySelectorAll('circle.pdot')) c.classList.toggle('is-done', progress[c.getAttribute('data-problem')] === true);
+    rehearsed = rehearsedIds(sanitizeScores(safeGet(SCORES_KEY, {})));
+    const re = new Set(rehearsed);
+    for (const c of svg.querySelectorAll('circle.pdot')) {
+      const id = c.getAttribute('data-problem');
+      c.classList.toggle('is-done', progress[id] === true);
+      c.classList.toggle('is-rehearsed', re.has(id));
+    }
     for (const a of svg.querySelectorAll('a.map-station')) {
       const st = stationById(a.getAttribute('data-station'));
       if (!st) continue;
-      const label = stationLabel(st);
+      const label = stationLabel(st, progress, rehearsed);
       a.setAttribute('aria-label', label);
       const t = a.querySelector('title');
       if (t) t.textContent = label;
     }
-    progressText.textContent = `Ticked ${countTicked(progress)} of ${PROBLEMS.length} problems.`;
+    progressText.textContent = `Ticked ${countTicked(progress)} of ${PROBLEMS.length} problems. Rehearsed ${rehearsed.length} of ${PROBLEMS.length} with fresh numbers.`;
   }
 
   function applyFocus() {
@@ -800,12 +884,12 @@
     ['curves', 'sets', 'mappings', 'linear', 'powermap', 'principal-root', 'branches', 'reciprocal', 'limits', 'derivative', 'cauchy-riemann'].map((id) => stationChip(id)));
   planStep(4, 'Predict in the Lab. Load a preset such as x = 2 under z², draw your guess on the w-plane, then reveal. (20 min)',
     [stationChip('lab'), ...[['2-1-2', '2.1.2'], ['2-2-1', '2.2.1'], ['2-5-1', '2.5.1'], ['P4', 'P4']].map(([tok, text]) => h('a', { class: 'chip problem-chip', href: `#lab-${tok}` }, text))]);
-  planStep(5, 'Do the problem index pass. For each card say the place, the address and the aha, then reveal the answer and tick it. Anything that is not instant, go back and touch it. (20 min)',
-    [stationChip('problems')]);
+  planStep(5, 'Do the problem index pass. For each row say the place, the address and the names, then open it, reveal the answer and tick it. Press Rehearse on anything that is not instant: the same problem with fresh numbers. (35 min)',
+    [stationChip('problems'), stationChip('rehearse')]);
   planStep(6, `Morning of the test: read the four lines again, then open ${sh('staircase')} and drag the point around the origin until the jump in Arg z feels obvious. (10 min)`,
     [stationChip('staircase')]);
   const planPanel = h('section', { class: 'panel', id: 'home-plan', 'aria-labelledby': 'home-plan-title' },
-    h('h2', { id: 'home-plan-title' }, 'A night-before plan (about two hours)'), plan);
+    h('h2', { id: 'home-plan-title' }, 'A night-before plan (about two and a half hours)'), plan);
 
   // ---- station links
   const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
@@ -830,7 +914,7 @@
   }
 
   el.append(header, finderPanel, h('div', { class: 'two-planes home-hero', id: 'home-hero' }, demoPanel, namesPanel),
-    workingPanel, spinePanel, mapPanel, planPanel, links);
+    workingPanel, spinePanel, decisionsPanel, mapPanel, planPanel, links);
 
   // ---- the demo: plane, handle, staircase, explainer
   function setDemoZ(z) {
@@ -926,6 +1010,7 @@
     layout: () => (geom ? geom.mode : 'narrow'),
     demo: () => ({ re: demo.z.re, im: demo.z.im }),
     search: (q) => searchItems(q, items, { limit: 8 }).results.map((r) => r.id),
+    rehearsed: () => [...rehearsed],
     mountMs,
   };
   mv.home = hook;
````

### Appendix C. `tests/unit/i1-station-home-problems.test.mjs` (unified diff; U3 to U6, U10, U11 moved, U22 to U30 added at the end)

````diff
--- a/tests/unit/i1-station-home-problems.test.mjs
+++ b/tests/unit/i1-station-home-problems.test.mjs
@@ -2,7 +2,8 @@
 // Pure logic of js/stations/home.js and js/stations/problems.js (no DOM): the map layout, the finder, the demo readout,
 // progress and filters, station neighbours, the "data not typed" source scan, and an independent recomputation of the
 // worked solutions of all 29 problems from js/core/complex.js.
-// Expected values are those of docs/designs/iter-1/i1-station-home-problems.md sections 6 and 7.
+// Expected values are those of docs/designs/iter-1/i1-station-home-problems.md sections 6 and 7, moved to the 22-station registry and the
+// deck by docs/designs/iter-2/i2-home-index-deck.md (U3 to U6, U10, U11 and the rows from U22 on).
 import test from 'node:test';
 import assert from 'node:assert/strict';
 import fs from 'node:fs';
@@ -43,66 +44,84 @@
 });
 
 // ---------------------------------------------------------------- U3 to U6: the map
-test('U3 threadStops: the registry lists, in map order', () => {
-  const T1 = 'home addresses arithmetic distance powers roots sets mappings linear powermap reciprocal derivative cauchy-riemann lab problems'.split(' ');
-  const T2 = 'home addresses staircase powers roots powermap principal-root branches lab graph4d problems'.split(' ');
-  const T3 = 'home curves sets mappings linear powermap reciprocal limits derivative cauchy-riemann lab graph4d problems'.split(' ');
+test('U3 threadStops: the registry lists, in map order; the Rehearsal Room is second to last on every thread', () => {
+  const T1 = 'home addresses arithmetic distance powers roots sets mappings linear powermap reciprocal derivative cauchy-riemann lab rehearse problems'.split(' ');
+  const T2 = 'home addresses staircase powers roots powermap principal-root branches lab graph4d rehearse problems'.split(' ');
+  const T3 = 'home curves sets mappings linear powermap reciprocal limits derivative cauchy-riemann lab graph4d rehearse problems'.split(' ');
   assert.deepEqual(H.threadStops(STATIONS, 'T1'), T1);
   assert.deepEqual(H.threadStops(STATIONS, 'T2'), T2);
   assert.deepEqual(H.threadStops(STATIONS, 'T3'), T3);
-  assert.deepEqual([T1.length, T2.length, T3.length], [15, 11, 13]);
+  assert.deepEqual([T1.length, T2.length, T3.length], [16, 12, 14]);
+  for (const t of [T1, T2, T3]) assert.equal(t[t.length - 2], 'rehearse');
 });
 
-test('U4 layoutMap wide (W = 1000)', () => {
+test('U4 layoutMap wide (W = 1000): three rows of 8, 8 and 6', () => {
   const g = H.layoutMap(STATIONS, 1000);
   assert.equal(g.mode, 'wide');
+  assert.equal(H.GEOM.COLS, 8);
   assert.equal(g.height, 476);
   assert.equal(g.rows, 3);
-  assert.equal(g.colW, 136);
-  assert.equal(g.nodes.length, 21);
+  assert.equal(g.colW, 119);
+  assert.equal(g.nodes.length, 22);
+  assert.deepEqual([0, 1, 2].map((r) => g.nodes.filter((n) => n.row === r).length), [8, 8, 6]);
   const x = (order) => g.nodes.find((n) => n.order === order).x;
-  assert.deepEqual([0, 6, 7, 13, 14, 20].map(x), [92, 908, 908, 92, 92, 908]);
-  assert.deepEqual([0, 7, 14].map((o) => g.nodes.find((n) => n.order === o).y), [64, 220, 376]);
+  assert.deepEqual([0, 7, 8, 15, 16, 21].map(x), [83.5, 916.5, 916.5, 83.5, 83.5, 678.5]);
+  assert.deepEqual([0, 8, 16].map((o) => g.nodes.find((n) => n.order === o).y), [64, 220, 376]);
+  const order = (id) => g.nodes.find((n) => n.id === id).order;
+  assert.equal(order('graph4d'), 19);
+  assert.equal(order('rehearse'), 20);
+  assert.equal(order('problems'), 21);
+  assert.deepEqual(g.nodes.slice(-3).map((n) => n.id), ['graph4d', 'rehearse', 'problems']);
   assert.deepEqual(g.parts.map((p) => p.text), [
-    'I · The point (Ch 1)', 'II · Curves and sets (Ch 1)', 'III · Motions (Ch 2)', 'III · Motions (Ch 2) cont.',
-    'IV · Zoom (Ch 3)', 'V · The diary and the index']);
-  assert.deepEqual(g.parts.map((p) => p.anchor), ['start', 'end', 'end', 'start', 'start', 'start']);
+    'I · The point (Ch 1)', 'II · Curves and sets (Ch 1)', 'III · Motions (Ch 2)', 'IV · Zoom (Ch 3)', 'V · The diary and the index']);
+  assert.deepEqual(g.parts.map((p) => p.anchor), ['start', 'end', 'end', 'start', 'start']);
+  assert.deepEqual(g.parts.map((p) => p.x), [71.5, 928.5, 809.5, 71.5, 309.5]);
+  assert.deepEqual(g.parts.map((p) => p.y), [20, 20, 176, 332, 332]);
+  assert.deepEqual(g.parts.map((p) => p.node), ['home', 'curves', 'mappings', 'derivative', 'lab']);
   assert.equal(g.threads.length, 3);
   assert.deepEqual(g.threads.map((t) => t.dash), [false, true, false]);
-  assert.deepEqual(g.threads.map((t) => t.stops.length), [15, 11, 13]);
-  assert.deepEqual(g.threads.map((t) => [t.first, t.last]), [[0, 20], [0, 20], [0, 20]]);
+  assert.deepEqual(g.threads.map((t) => t.stops.length), [16, 12, 14]);
+  assert.deepEqual(g.threads.map((t) => [t.first, t.last]), [[0, 21], [0, 21], [0, 21]]);
   assert.equal(g.threads[1].d,
-    'M92 64L228 64L364 64L500 64L636 64L772 64L908 64L927 64A60 78 0 0 1 927 220L908 220L772 220L636 220L500 220L364 220L228 220L92 220L73 220A60 78 0 0 0 73 376L92 376L228 376L364 376L500 376L636 376L772 376L908 376');
-  assert.ok(g.threads[0].d.startsWith('M92 55'));
-  assert.ok(g.threads[2].d.startsWith('M92 73'));
+    'M83.5 64L202.5 64L321.5 64L440.5 64L559.5 64L678.5 64L797.5 64L916.5 64L935.5 64A51.5 78 0 0 1 935.5 220L916.5 220L797.5 220L678.5 220L559.5 220L440.5 220L321.5 220L202.5 220L83.5 220L64.5 220A51.5 78 0 0 0 64.5 376L83.5 376L202.5 376L321.5 376L440.5 376L559.5 376L678.5 376');
+  assert.ok(g.threads[0].d.startsWith('M83.5 55'));
+  assert.ok(g.threads[2].d.startsWith('M83.5 73'));
+  assert.ok(g.threads[0].d.endsWith('L678.5 367') && g.threads[2].d.endsWith('L678.5 385'));
   const ar = g.nodes.find((n) => n.id === 'arithmetic');
   assert.deepEqual(ar.label.lines, ['Slide, Spin,', 'Stretch, Mirror']);
-  assert.deepEqual(ar.dots.map((d) => d.x), [349, 359, 369, 379]);
+  assert.deepEqual(ar.dots.map((d) => d.x), [306.5, 316.5, 326.5, 336.5]);
   assert.deepEqual(ar.dots.map((d) => d.y), [148, 148, 148, 148]);
   assert.deepEqual(g.nodes.find((n) => n.id === 'branches').label.lines, ['Branches and', 'Cuts']);
-  const g760 = H.layoutMap(STATIONS, 760);
-  assert.equal(g760.mode, 'wide');
-  near(g760.colW, 101.714285714, 1e-6);
-  near(g760.nodes[0].x, 74.857142857, 1e-6);
-  // WIDE_MIN is 712: the narrowest host where the part captions still clear each other (U6); 760 was the design's first value
-  assert.equal(H.layoutMap(STATIONS, 712).mode, 'wide');
-  assert.equal(H.layoutMap(STATIONS, 711).mode, 'narrow');
-  assert.deepEqual(H.layoutMap(STATIONS, 712).nodes.filter((n) => n.label.lines.some((l) => l.endsWith('…'))).map((n) => n.id), [], 'no title is cut short at the narrowest wide width');
+  assert.deepEqual(g.nodes.find((n) => n.id === 'rehearse').label.lines, ['The Rehearsal', 'Room']);
+  assert.deepEqual(g.nodes.find((n) => n.id === 'rehearse').dots, [], 'the Rehearsal Room owns no problem, so it has no dots');
+  const g780 = H.layoutMap(STATIONS, 780);
+  assert.equal(g780.mode, 'wide');
+  near(g780.colW, 91.5, 1e-9);
+  near(g780.nodes[0].x, 69.75, 1e-9);
+  // WIDE_MIN is 780: the first width at which every title of the 22 places fits in three lines (8 columns), see the sweep in U6
+  assert.equal(H.WIDE_MIN, 780);
+  assert.equal(H.layoutMap(STATIONS, 779).mode, 'narrow');
+  assert.deepEqual(H.layoutMap(STATIONS, 780).nodes.filter((n) => n.label.lines.some((l) => l.endsWith('…'))).map((n) => n.id), [], 'no title is cut short at the narrowest wide width');
+  // and why not lower: the widest title needs 12 characters a line, which a column of 91.2 px or more gives
+  assert.ok(H.wrapLabel('Slide, Spin, Stretch, Mirror', 11).some((l) => l.endsWith('…')));
+  assert.ok(!H.wrapLabel('Slide, Spin, Stretch, Mirror', 12).some((l) => l.endsWith('…')));
 });
 
-test('U5 layoutMap narrow (W = 358 and 288)', () => {
+test('U5 layoutMap narrow (W = 358 and 288): one track of 22 places', () => {
   const g = H.layoutMap(STATIONS, 358);
   assert.equal(g.mode, 'narrow');
-  assert.equal(g.height, 1178);
+  assert.equal(g.height, 1226);
+  assert.equal(g.nodes.length, 22);
   assert.ok(g.nodes.every((n) => n.x === 32));
-  assert.deepEqual([0, 7, 14, 20].map((o) => g.nodes.find((n) => n.order === o).y), [62, 428, 794, 1142]);
+  assert.deepEqual([0, 7, 14, 21].map((o) => g.nodes.find((n) => n.order === o).y), [62, 428, 794, 1190]);
   assert.deepEqual(g.parts.map((p) => p.y), [28, 394, 520, 886, 1012]);
   assert.ok(g.parts.every((p) => p.x === 78), 'captions start at the label column, clear of the strands');
-  assert.ok(g.threads[0].d.startsWith('M23 62') && g.threads[0].d.endsWith('L23 1142'));
-  assert.ok(g.threads[2].d.startsWith('M41 62'));
+  assert.ok(g.threads[0].d.startsWith('M23 62') && g.threads[0].d.endsWith('L23 1190'));
+  assert.ok(g.threads[2].d.startsWith('M41 62') && g.threads[2].d.endsWith('L41 1190'));
   assert.ok(g.threads[1].d.startsWith('M32 62'));
   assert.deepEqual(g.nodes.find((n) => n.id === 'arithmetic').label.lines, ['Slide, Spin, Stretch, Mirror']);
-  assert.equal(H.layoutMap(STATIONS, 288).height, 1178);
+  assert.deepEqual(g.nodes.find((n) => n.id === 'rehearse').label.lines, ['The Rehearsal Room']);
+  assert.equal(H.layoutMap(STATIONS, 288).height, 1226);
   assert.equal(H.layoutMap(STATIONS, 100).width, 280);
 });
 
@@ -150,11 +169,12 @@
 }
 
 test('U6 no label, number, caption, dots row or U-turn collides, for every wide width WIDE_MIN..1160 step 4', () => {
-  for (let W = H.WIDE_MIN; W <= 1160; W += 4) assert.deepEqual(validateWide(W), [], `W = ${W}`);
+  for (let W = H.WIDE_MIN; W <= 1160; W += 4) {
+    assert.deepEqual(validateWide(W), [], `W = ${W}`);
+    assert.deepEqual(H.layoutMap(STATIONS, W).nodes.filter((n) => n.label.lines.some((l) => l.endsWith('…'))).map((n) => n.id), [], `W = ${W}: a cut title`);
+  }
   assert.deepEqual(validateWide(H.WIDE_MIN), [], 'the narrowest wide width');
   assert.deepEqual(validateWide(918), [], 'the real desktop host width');
-  // why 712 and not lower: just under it two part captions overlap, which is the limit the sweep finds
-  assert.ok(validateWide(704).length > 0, 'below 712 the captions collide, so a lower WIDE_MIN needs shorter part names');
 });
 
 test('the part captions sit nearer their own row than the row above (residue: they read as the previous row)', () => {
@@ -167,7 +187,7 @@
 });
 
 test('layoutMap: every station once, every strand path starts with M, wide and narrow', () => {
-  for (const W of [280, 358, 600, 759, 760, 918, 1000, 1160]) {
+  for (const W of [280, 358, 600, 759, 779, 780, 800, 918, 1000, 1160]) {
     const g = H.layoutMap(STATIONS, W);
     assert.deepEqual(g.nodes.map((n) => n.id), STATIONS.map((s) => s.id));
     assert.equal(g.nodes.reduce((k, n) => k + n.dots.length, 0), 29, 'one dot per problem');
@@ -303,17 +323,26 @@
   assert.deepEqual(P.stationNeighbours(STATIONS, 'home'), {
     prev: null, next: 'addresses', thread: { T1: { prev: null, next: 'addresses' }, T2: { prev: null, next: 'addresses' }, T3: { prev: null, next: 'curves' } } });
   assert.deepEqual(P.stationNeighbours(STATIONS, 'problems'), {
-    prev: 'graph4d', next: null, thread: { T1: { prev: 'lab', next: null }, T2: { prev: 'graph4d', next: null }, T3: { prev: 'graph4d', next: null } } });
+    prev: 'rehearse', next: null, thread: { T1: { prev: 'rehearse', next: null }, T2: { prev: 'rehearse', next: null }, T3: { prev: 'rehearse', next: null } } });
+  assert.deepEqual(P.stationNeighbours(STATIONS, 'rehearse'), {
+    prev: 'graph4d', next: 'problems', thread: { T1: { prev: 'lab', next: 'problems' }, T2: { prev: 'graph4d', next: 'problems' }, T3: { prev: 'graph4d', next: 'problems' } } });
+  assert.deepEqual(P.stationNeighbours(STATIONS, 'graph4d'), {
+    prev: 'lab', next: 'rehearse', thread: { T2: { prev: 'lab', next: 'rehearse' }, T3: { prev: 'lab', next: 'rehearse' } } });
+  assert.equal(P.stationNeighbours(STATIONS, 'lab').thread.T1.next, 'rehearse');
   assert.deepEqual(P.stationNeighbours(STATIONS, 'roots'), {
     prev: 'powers', next: 'curves', thread: { T2: { prev: 'powers', next: 'powermap' }, T1: { prev: 'powers', next: 'sets' } } });
   assert.deepEqual(P.stationNeighbours(STATIONS, 'nowhere'), { prev: null, next: null, thread: {} });
 });
 
-test('U11 PART_LABELS follow the part titles of app.js', () => {
+test('U11 PART_LABELS are computed from the registry PARTS (and so follow the part titles of app.js)', () => {
   assert.deepEqual(Object.keys(H.PART_LABELS), Object.keys(PART_TITLES));
   for (const [part, label] of Object.entries(H.PART_LABELS)) assert.ok(label.startsWith(PART_TITLES[part].title), `${part}: ${label}`);
-  assert.equal(H.WIDE_MIN, 712);
+  assert.deepEqual(H.PART_LABELS, {
+    I: 'The point (Ch 1)', II: 'Curves and sets (Ch 1)', III: 'Motions (Ch 2)', IV: 'Zoom (Ch 3)', V: 'The diary and the index' });
+  assert.equal(H.WIDE_MIN, 780);
   assert.ok(Object.isFrozen(H.GEOM));
+  assert.equal(H.GEOM.COLS, 8);
+  assert.ok(/PARTS/.test(SRC.home) && !/PART_LABELS = \{ I:/.test(SRC.home), 'home.js reads PARTS and does not type the labels');
 });
 
 // ---------------------------------------------------------------- U12 to U14: the demo
@@ -642,3 +671,145 @@
   for (const p of PROBLEMS) assert.ok(stationById(p.station), p.id);
   for (const t of TOPICS) assert.ok(stationById(t.stations[0]), t.id);
 });
+
+// ---------------------------------------------------------------- U22 to U30: the deck, the Names filter, rehearsal and the two decisions
+// (docs/designs/iter-2/i2-home-index-deck.md section 7.2)
+import { ADDRESS_MEANING, NAMES_MEANING } from '../../js/core/decisions.js';
+
+const NONE_IDS = ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'];
+const ANY_IDS = ['1.3.2', '2.1.1', '2.1.3', '2.2.1', '2.3.1', '2.5.1', '3.1.2', 'P1', 'P2', 'P4', 'P5', 'P6'];
+
+test('U22 deckState: a clean { open, mode } from whatever the store holds', () => {
+  assert.deepEqual(P.deckState(null), { open: [], mode: 'one' });
+  for (const bad of [undefined, 42, 'x', [], true]) assert.deepEqual(P.deckState(bad), { open: [], mode: 'one' }, String(bad));
+  assert.deepEqual(P.deckState({ open: ['1.4.2', 'zzz', '1.4.2', 'P3', 7], mode: 'all' }), { open: ['1.4.2', 'P3'], mode: 'all' });
+  assert.deepEqual(P.deckState({ open: ['1.4.2', 'P3'], mode: 'one' }), { open: ['P3'], mode: 'one' }, 'in mode one the last row opened is the one that stays');
+  assert.deepEqual(P.deckState({ open: '1.4.2' }), { open: [], mode: 'one' });
+  assert.deepEqual(P.deckState({ open: ['1.4.2'], mode: 'weird' }), { open: ['1.4.2'], mode: 'one' });
+  assert.deepEqual(P.deckState({ open: ['T1.4'], mode: 'all' }), { open: [], mode: 'all' }, 'a topic id is not a problem');
+  const raw = { open: ['1.4.2'], mode: 'all' };
+  const out = P.deckState(raw);
+  out.open.push('P3');
+  assert.deepEqual(raw.open, ['1.4.2'], 'the input is not touched');
+  assert.equal(P.DECK_KEY, 'problems.deck');
+});
+
+test('U23 namesFilterMatches, namesCounts and the six Names filters', () => {
+  assert.deepEqual(P.NAMES_FILTERS, ['all-names', 'none', 'any', 'all', 'home', 'continuous']);
+  const p142 = problemById('1.4.2');
+  assert.equal(P.namesFilterMatches(p142, 'all'), true);
+  assert.equal(P.namesFilterMatches(p142, 'home'), false);
+  for (const free of ['all-names', 'bogus', undefined, null, '']) assert.equal(P.namesFilterMatches(p142, free), true, `${free} lets everything through`);
+  assert.equal(P.namesFilterMatches(null, 'all'), false);
+  assert.equal(P.namesFilterMatches(undefined, 'all-names'), false);
+  const by = (code) => PROBLEMS.filter((p) => P.namesFilterMatches(p, code)).map((p) => p.id);
+  assert.deepEqual(by('none'), NONE_IDS);
+  assert.deepEqual(by('any'), ANY_IDS);
+  assert.deepEqual(by('all'), ['1.4.1', '1.4.2', '1.4.3']);
+  assert.deepEqual(by('home'), ['1.3.1', '2.2.2']);
+  assert.deepEqual(by('continuous'), ['2.4.1']);
+  assert.equal(by('all-names').length, 29);
+  assert.deepEqual(P.namesCounts(), { none: 11, any: 12, all: 3, home: 2, continuous: 1 });
+  assert.equal(Object.values(P.namesCounts()).reduce((a, b) => a + b, 0), 29);
+  assert.deepEqual(P.namesCounts([p142]), { none: 0, any: 0, all: 1, home: 0, continuous: 0 });
+});
+
+test('U24 visibleIds: the three filters together (the numbers acceptance A1 asserts in the browser)', () => {
+  const V = (f, progress = {}) => P.visibleIds(f, progress);
+  assert.deepEqual(V({ names: 'all' }), ['1.4.1', '1.4.2', '1.4.3']);
+  assert.deepEqual(V({ names: 'home' }), ['1.3.1', '2.2.2']);
+  assert.deepEqual(V({ names: 'continuous' }), ['2.4.1']);
+  assert.deepEqual(V({ names: 'none' }), NONE_IDS);
+  assert.deepEqual(V({ names: 'any' }), ANY_IDS);
+  assert.equal(V({ names: 'all-names' }).length, 29);
+  assert.equal(V(null).length, 29);
+  assert.deepEqual(V({ chapter: '1', names: 'any' }), ['1.3.2'], 'chapter 1 and names any');
+  assert.deepEqual(V({ chapter: '2', names: 'any' }), ['2.1.1', '2.1.3', '2.2.1', '2.3.1', '2.5.1']);
+  assert.deepEqual(V({ chapter: 'P', names: 'any' }), ['P1', 'P2', 'P4', 'P5', 'P6']);
+  assert.deepEqual(V({ chapter: '3', names: 'home' }), []);
+  assert.deepEqual(V({ names: 'all', todo: true }, { '1.4.2': true }), ['1.4.1', '1.4.3']);
+  assert.equal(V({ todo: true }, { '1.1.1': true, 'T1.4': true }).length, 28, 'a topic tick is not a problem tick');
+  assert.deepEqual(V({ chapter: '3' }), ['3.1.1', '3.1.2', '3.2.1']);
+  assert.deepEqual(P.normalizeFilter({ chapter: '9', todo: 'yes', names: 'x' }), { chapter: 'all', todo: false, names: 'all-names' });
+  assert.deepEqual(P.normalizeFilter(null), { chapter: 'all', todo: false, names: 'all-names' });
+  assert.deepEqual(P.normalizeFilter({ chapter: 'P', todo: true, names: 'home' }), { chapter: 'P', todo: true, names: 'home' });
+});
+
+test('U25 filterLabel: the words after "Showing 3 of 29:"', () => {
+  assert.equal(P.filterLabel({ chapter: '3', todo: false, names: 'all-names' }), 'Chapter 3');
+  assert.equal(P.filterLabel({ chapter: 'P' }), 'Proofs');
+  assert.equal(P.filterLabel({ chapter: '1', names: 'any', todo: true }), 'Chapter 1, names: any, not ticked yet');
+  assert.equal(P.filterLabel({ names: 'all' }), 'names: all');
+  assert.equal(P.filterLabel({ todo: true }), 'not ticked yet');
+  assert.equal(P.filterLabel(null), '');
+  assert.equal(P.filterLabel({ chapter: 'all', todo: false, names: 'all-names' }), '');
+});
+
+test('U26 parseProblemsToken: names-<code> adds the names key and keeps the other fields', () => {
+  assert.deepEqual(P.parseProblemsToken('names-home'), { chapter: 'all', todo: false, names: 'home' });
+  for (const code of ['none', 'any', 'all', 'home', 'continuous', 'all-names']) assert.deepEqual(P.parseProblemsToken(`names-${code}`), { chapter: 'all', todo: false, names: code }, code);
+  assert.deepEqual(P.parseProblemsToken('NAMES-ANY'), { chapter: 'all', todo: false, names: 'any' });
+  for (const bad of ['names-', 'names-bogus', 'names-all-names-x', 'names', 'name-all']) assert.deepEqual(P.parseProblemsToken(bad), { chapter: 'all', todo: false }, bad);
+  // the iteration-1 rows are untouched: no names key unless the token names one
+  assert.deepEqual(P.parseProblemsToken('3'), { chapter: '3', todo: false });
+  assert.deepEqual(P.parseProblemsToken('todo'), { chapter: 'all', todo: true });
+});
+
+test('U27 sanitizeScores and rehearsedIds: rehearse.scores as the Rehearsal Room writes it', () => {
+  const ok = { tried: 1, right: 1, last: 1 };
+  assert.deepEqual(P.sanitizeScores({ '1.4.2': ok, zzz: ok, '1.1.1': 'x', P3: { tried: -4, right: 2.7, last: 'now' } }), { '1.4.2': ok, P3: { tried: 2, right: 2, last: 0 } });
+  assert.deepEqual(P.sanitizeScores({ '1.4.2': { tried: 3, right: 1, last: 1714000000000 } }), { '1.4.2': { tried: 3, right: 1, last: 1714000000000 } });
+  for (const bad of [null, undefined, [], 'x', 42, true]) assert.deepEqual(P.sanitizeScores(bad), {}, String(bad));
+  assert.deepEqual(P.rehearsedIds({ '1.4.2': { tried: 2, right: 1, last: 5 }, '2.5.1': { tried: 1, right: 0, last: 0 }, P3: ok }), ['1.4.2', 'P3'], 'right >= 1, in handout order');
+  assert.deepEqual(P.rehearsedIds({ '1.4.2': ok }), ['1.4.2']);
+  assert.deepEqual(P.rehearsedIds({}), []);
+  assert.deepEqual(P.rehearsedIds(null), []);
+  assert.equal(P.SCORES_KEY, 'rehearse.scores');
+  assert.equal(P.problemCount(0), '0 problems');
+  assert.equal(P.problemCount(1), '1 problem');
+  assert.equal(P.problemCount(11), '11 problems');
+});
+
+test('U28 decisionBlock: the two decisions of the home page, as data', () => {
+  const B = H.decisionBlock();
+  assert.deepEqual(B.address.map((a) => a.code), ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both']);
+  assert.deepEqual(B.address.map((a) => a.label), ['Cartesian', 'Polar', 'Cartesian, then polar', 'Polar, then Cartesian', 'Cartesian, polar, then back', 'Either address']);
+  for (const a of B.address) assert.equal(a.meaning, ADDRESS_MEANING[a.code]);
+  assert.deepEqual(B.names.map((n) => n.code), ['none', 'any', 'all', 'home', 'continuous']);
+  assert.deepEqual(B.names.map((n) => n.count), [11, 12, 3, 2, 1]);
+  assert.deepEqual(B.names.map((n) => n.countText), ['11 problems', '12 problems', '3 problems', '2 problems', '1 problem']);
+  assert.deepEqual(B.names.map((n) => n.route), ['problems-names-none', 'problems-names-any', 'problems-names-all', 'problems-names-home', 'problems-names-continuous']);
+  for (const n of B.names) {
+    assert.equal(n.meaning, NAMES_MEANING[n.code]);
+    assert.deepEqual(P.parseProblemsToken(n.route.replace(/^problems-/, '')).names, n.code, 'the route is a token the index reads');
+  }
+  assert.equal(B.names.reduce((k, n) => k + n.count, 0), 29);
+  assert.ok(B.address.map((a) => `${a.label} ${a.meaning}`).join(' ').includes('Cartesian') && /polar/.test(B.address.map((a) => a.meaning).join(' ')));
+});
+
+test('U29 stationLabel: what the map says for a place, with ticks and rehearsals', () => {
+  const L = (id, progress = {}, rehearsed = []) => H.stationLabel(stationById(id), progress, rehearsed);
+  assert.equal(L('home'), 'The Map. Place 0. Problems: none. Threads: T1, T2, T3.');
+  assert.equal(L('rehearse'), 'The Rehearsal Room. Place 20. Problems: none. Threads: T1, T2, T3.');
+  assert.equal(L('roots'), 'Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3. Threads: T2, T1.');
+  assert.equal(L('roots', { '1.4.2': true }, []), 'Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3, 1 of 3 ticked. Threads: T2, T1.');
+  assert.equal(L('roots', { '1.4.2': true }, ['1.4.2']), 'Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3, 1 of 3 ticked, 1 rehearsed. Threads: T2, T1.');
+  assert.equal(L('roots', {}, new Set(['1.4.1', '1.4.3'])), 'Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3, 2 rehearsed. Threads: T2, T1.');
+  assert.equal(L('powermap'), 'zⁿ: Fans and Parabolas. Place 11. Problems: 2.1.2, 2.2.1. Threads: T1, T2, T3.');
+  assert.equal(L('roots', { '1.1.1': true }, ['2.5.1']), L('roots'), 'a problem of another place changes nothing');
+});
+
+test('U30 source rules of the deck and the map (the pins other test files keep on these two files)', () => {
+  const prob = code(SRC.problems);
+  const home = code(SRC.home);
+  assert.ok(prob.includes('id: `${box.id}-final`'), 'the answer box keeps its own id (tests/unit/i1-integration.test.mjs)');
+  assert.ok(prob.includes("h('span', { class: 'muted' }, titleSpan(st.title))") && prob.includes('titleSpan(`Start at ${first ? first.title : t.title}`)'), 'the place line and the topic button set station titles with titleSpan');
+  assert.ok(!/class: 'card problem-card'/.test(prob), 'the index card is class problem-card only (the kit styles .problem-card; the index prefixes every rule with .problems-deck)');
+  assert.ok(/class: 'problem-card'/.test(prob));
+  for (const k of ['problems-open-', 'problems-rehearse-', 'problems-mode-one', 'problems-mode-all', 'problems-open-all', 'problems-collapse-all', 'problems-filter-names-', 'problems-card-${k}']) assert.ok(prob.includes(k), `problems.js builds ${k}`);
+  assert.ok(prob.includes('href: `#rehearse-${k}`'), 'the Rehearse link goes to #rehearse-<id with dashes>');
+  for (const k of ['home-decisions', 'home-decision-address', 'home-decision-names', 'home-decision-names-link-', 'is-rehearsed']) assert.ok(home.includes(k), `home.js builds ${k}`);
+  assert.ok(!home.includes('The Rehearsal Room') && !prob.includes('The Rehearsal Room'), 'the Rehearsal Room title is read from the registry, not typed');
+  assert.ok(fs.existsSync(new URL('../interact/i1-station-home-problems.mjs', import.meta.url)));
+  assert.ok(fs.existsSync(new URL('../interact/i2-home-index-deck.mjs', import.meta.url)), 'the acceptance script of this goal exists');
+});
````

### Appendix D. `tests/interact/i1-station-home-problems.mjs` (unified diff: the moved pins of 7.4)

````diff
--- a/tests/interact/i1-station-home-problems.mjs
+++ b/tests/interact/i1-station-home-problems.mjs
@@ -2,7 +2,8 @@
 // Run:  node tools/smoke.mjs --route home,problems --script tests/interact/i1-station-home-problems.mjs --dark
 // One script for both routes (it branches on ctx.route). Every other station module is stubbed with page.route, so the
 // navigation checks never depend on a station that another goal has not built yet.
-// Design: docs/designs/iter-1/i1-station-home-problems.md, section 7 (acceptance A2, A3, A4).
+// Design: docs/designs/iter-1/i1-station-home-problems.md, section 7 (acceptance A2, A3, A4); moved to the 22 stations and the deck of
+// docs/designs/iter-2/i2-home-index-deck.md section 7.6 (every moved pin is listed there).
 
 import { dragHandle, handleZ, readHandleLabel, readText, settle } from './_helpers.mjs';
 
@@ -37,8 +38,8 @@
     await waitFor('#home-map a.map-station');
     // ---- A2: the map
     const ids = await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
-    assert(ids.length === 21, `the registry lists 21 stations, got ${ids.length}`);
-    assert((await count('#home-map a.map-station')) === 21, 'the map has 21 a.map-station');
+    assert(ids.length === 22, `the registry lists 22 stations, got ${ids.length}`);
+    assert((await count('#home-map a.map-station')) === 22, 'the map has 22 a.map-station');
     const dataIds = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].map((a) => a.getAttribute('data-station')));
     assert(JSON.stringify(dataIds) === JSON.stringify(ids), `map stations are the registry ids in order: ${dataIds.join(',')}`);
     const hrefs = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].every((a) => a.getAttribute('href') === '#' + a.getAttribute('data-station')));
@@ -52,14 +53,14 @@
     assert(lines[0].dash === null && lines[2].dash === null, 'T1 and T3 are solid');
     assert(lines.every((l) => /^M/.test(l.d)), 'every strand has path data');
     assert(new Set(lines.map((l) => l.stroke)).size === 3, `the three strands have three colours: ${lines.map((l) => l.stroke).join(' | ')}`);
-    for (const [t, n] of [['T1', 15], ['T2', 11], ['T3', 13]]) {
+    for (const [t, n] of [['T1', 16], ['T2', 12], ['T3', 14]]) {
       assert((await count(`#home-map circle.stop[data-thread="${t}"]`)) === n, `${t} has ${n} stops`);
     }
     assert((await count('#home-map circle.pdot')) === 29, '29 problem dots');
     const host = await page.evaluate(() => document.getElementById('home-map-host').clientWidth);
     const layout = await page.evaluate(() => window.__mv.home.layout());
     const wideMin = await page.evaluate(async () => (await import('./js/stations/home.js')).WIDE_MIN);
-    assert(wideMin === 712, `WIDE_MIN is 712, got ${wideMin}`);
+    assert(wideMin === 780, `WIDE_MIN is 780, got ${wideMin}`);
     assert(layout === (host >= wideMin ? 'wide' : 'narrow'), `layout ${layout} at host width ${host}`);
     log(`map: ${layout}, host ${host}px`);
 
@@ -78,7 +79,7 @@
     assert((await page.evaluate(() => document.getElementById('view').dataset.station)) === 'roots', 'the route mounts the owning station (roots)');
     await page.goBack();
     await waitFor('#home-map a.map-station');
-    assert((await count('#home-map a.map-station')) === 21, 'a fresh mount after Back');
+    assert((await count('#home-map a.map-station')) === 22, 'a fresh mount after Back');
 
     await page.fill('#home-finder', 'p3');
     await page.keyboard.press('Enter');
@@ -119,7 +120,7 @@
     await page.click('#home-thread-T2');
     assert((await attr('#home-map', 'data-focus')) === 'T2', 'the map is focused on T2');
     assert((await attr('#home-thread-T2', 'aria-pressed')) === 'true', 'the T2 button is pressed');
-    assert((await count('#home-map a.map-station.is-dim')) === 10, 'T2 dims the 10 stations that are not on it');
+    assert((await count('#home-map a.map-station.is-dim')) === 10, 'T2 dims the 10 stations that are not on it (22 places, 12 on the thread)');
     assert((await count('#home-map path.thread-line.is-dim')) === 2, 'T2 dims 2 strands');
     await page.click('#home-thread-T2');
     assert((await attr('#home-map', 'data-focus')) === null, 'a second press clears the focus');
@@ -148,7 +149,7 @@
       await page.setViewportSize({ width: 700, height: 860 });
       await settle(page, 4);
       assert((await page.evaluate(() => window.__mv.home.layout())) === 'narrow', 'a 700 px window gives the narrow map');
-      assert((await count('#home-map a.map-station')) === 21 && (await count('#home-map path.thread-line')) === 3, 'the narrow map still has 21 places and 3 strands');
+      assert((await count('#home-map a.map-station')) === 22 && (await count('#home-map path.thread-line')) === 3, 'the narrow map still has 22 places and 3 strands');
       await shot('home-narrow');
       await page.setViewportSize({ width: ctx.viewport.width, height: ctx.viewport.height });
       await settle(page, 4);
@@ -254,9 +255,17 @@
     assert(shape[0].id === '1.1.1' && shape[28].id === 'P7', 'handout order, 1.1.1 first and P7 last');
     assert((await page.evaluate(() => window.__mv.problems.visible().length)) === 29, 'the hook lists 29 visible cards');
 
-    // ---- the hidden answer
+    // ---- the hidden answer (iteration 2: a card is one line until it is opened; this script keeps several open, as the iteration-1 cards were)
+    await page.click('#problems-mode-all');
+    const openCard = async (id) => {
+      if ((await attr(`#problems-card-${id}`, 'data-open')) !== 'true') await page.click(`#problems-open-${id}`);   // the button toggles, and a remount restores the deck
+      assert((await attr(`#problems-card-${id}`, 'data-open')) === 'true', `card ${id} is open`);
+    };
     assert((await isVisible('#problems-answer-1-4-2')) === false, 'the answer starts hidden');
     assert((await attr('#problems-reveal-1-4-2', 'aria-expanded')) === 'false', 'aria-expanded starts false');
+    assert((await isVisible('#problems-reveal-1-4-2')) === false, 'the Reveal button is inside the card, so it is hidden while the card is one line');
+    await openCard('1-4-2');
+    assert(await isVisible('#problems-reveal-1-4-2'), 'opening the card shows its Reveal button');
     await page.click('#problems-reveal-1-4-2');
     assert(await isVisible('#problems-answer-1-4-2'), 'the answer is visible after the click');
     assert((await attr('#problems-reveal-1-4-2', 'aria-expanded')) === 'true', 'aria-expanded is true');
@@ -265,8 +274,10 @@
     assert(ans.includes('2') && (ans.includes('π') || ans.includes('pi')) && (ans.includes('√2') || ans.includes('sqrt')), `the answer text: ${ans.slice(0, 120)}`);
     assert((await count('#problems-answer-1-4-2 .pc-route[data-route="cart"]')) === 1 && (await count('#problems-answer-1-4-2 .pc-route[data-route="polar"]')) === 1, 'both routes are shown');
     assert((await count('#problems-answer-1-4-2 .badge')) === 0, '1.4.2 uses both addresses, so no route is marked easy');
+    await openCard('1-4-3');
     await page.click('#problems-reveal-1-4-3');
     assert((await count('#problems-answer-1-4-3 .badge')) === 1 && (await count('#problems-answer-1-4-3 .pc-route[data-route="cart"] .badge')) === 1, '1.4.3: the Cartesian route is marked easy here');
+    await openCard('2-2-1');
     await page.click('#problems-reveal-2-2-1');
     assert((await count('#problems-answer-2-2-1 .badge')) === 1 && (await count('#problems-answer-2-2-1 .pc-route[data-route="polar"] .badge')) === 1, '2.2.1: the polar route is marked easy here');
     assert((await readText(page, '#problems-card-1-4-2 a[href="#problem-1-4-2"]')).includes('roots'), 'the card link text includes roots');
@@ -294,6 +305,7 @@
     assert(dots.find((d) => d.id === '1.1.2').endsInRun && dots.find((d) => d.id === '1.4.3').endsInRun, '1.1.2 and 1.4.3 end with the maths and its full stop in one run');
 
     // ---- no page overflow with the widest answers open
+    await openCard('1-5-2');
     await page.click('#problems-reveal-1-5-2');
     const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
     assert(overflow <= 1, `no horizontal overflow with answers open (${overflow}px)`);
@@ -342,14 +354,15 @@
     assert((await readText(page, '#problems-filter-todo')) === 'Not ticked yet (27)', 'the chip label follows the tick');
     await page.click('#problems-filter-todo');
 
-    // ---- predict first
+    // ---- predict first (the hint and the note live in the open card; after the reload the deck is in mode one, so opening 1.4.2 is enough)
     await page.check('#problems-predict');
+    await openCard('1-4-2');
     assert((await isVisible('#problems-card-1-4-2 .pc-hint')) === false && (await isVisible('#problems-card-1-4-2 .pc-predict-note')), 'predict hides the hint and shows the note');
     await page.click('#problems-reveal-1-4-2');
     assert(await isVisible('#problems-card-1-4-2 .pc-hint'), 'revealing brings the hint back');
     await page.click('#problems-reveal-1-4-2');
     await page.uncheck('#problems-predict');
-    assert(await isVisible('#problems-card-1-4-2 .pc-hint'), 'predict off shows the hint on a closed card');
+    assert(await isVisible('#problems-card-1-4-2 .pc-hint'), 'predict off shows the hint on an open card');
     await page.check('#problems-predict');
     await page.reload({ waitUntil: 'load' });
     await waitFor('.problem-card');
@@ -404,7 +417,10 @@
     assert(cells.label.includes('10 easiest in Cartesian'), `balance label: ${cells.label}`);
 
     // ---- a screenshot with two answers open
+    await page.click('#problems-mode-all');
+    await openCard('1-4-2');
     await page.click('#problems-reveal-1-4-2');
+    await openCard('2-1-2');
     await page.click('#problems-reveal-2-1-2');
     const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
     assert(overflow2 <= 1, `no horizontal overflow (${overflow2}px)`);
````

### Appendix E. `tests/interact/i2-home-index-deck.mjs` (new; the whole file)

````js
// tests/interact/i2-home-index-deck.mjs
// Run:  node tools/smoke.mjs --route home,home-T2,problems,problems-names-all --script tests/interact/i2-home-index-deck.mjs --dark
// One script for the routes home, home-T2, problems, problems-names-all and problems-todo (it branches on ctx.route). Acceptance A1 (the deck) and A2 (the map).
// Only the stations this script navigates to without testing them (rehearse, roots) are stubbed with page.route.
// Design: docs/designs/iter-2/i2-home-index-deck.md section 7.4.

import { readText } from './_helpers.mjs';

const STUB = 'export function mount(el){ el.textContent = "stub"; return function(){}; }';

export default async function (page, ctx) {
  const { assert, log, shot } = ctx;
  const wide = ctx.viewport.width >= 1000;
  const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
  const attr = (sel, a) => page.evaluate(([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null; }, [sel, a]);
  const isVisible = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && !e.hidden; }, sel);
  const origin = () => new URL(page.url()).origin;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const waitFor = (sel) => page.waitForSelector(sel, { state: 'attached', timeout: 8000 });
  const visible = () => page.evaluate(() => window.__mv.problems.visible());
  const deckHook = () => page.evaluate(() => window.__mv.problems.deck());
  const openIds = () => page.evaluate(() => [...document.querySelectorAll('article.problem-card[data-open="true"]')].map((c) => c.dataset.problem));

  await page.route('**/js/stations/*.js', (route) => (/\/(rehearse|roots)\.js(\?|$)/.test(route.request().url())
    ? route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB })
    : route.fallback()));
  await page.reload({ waitUntil: 'load' });

  if (ctx.route === 'home' || ctx.route === 'home-T2') await homeBlock();
  else if (/^problems/.test(ctx.route)) await problemsBlock();
  else throw new Error(`this script knows the routes home, home-T2 and problems*, not ${ctx.route}`);

  // ============================================================ A1: the deck
  async function problemsBlock() {
    await waitFor('article.problem-card');
    const NAMES = {
      none: ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'],
      all: ['1.4.1', '1.4.2', '1.4.3'], home: ['1.3.1', '2.2.2'], continuous: ['2.4.1'],
    };

    if (ctx.route === 'problems-names-all') {
      assert(same(await visible(), NAMES.all), `#problems-names-all shows the three roots problems: ${await visible()}`);
      assert((await attr('#problems-filter-names-all', 'aria-pressed')) === 'true' && (await attr('#problems-filter-names-all-names', 'aria-pressed')) === 'false', 'the all chip is pressed');
      assert((await readText(page, '#problems-count')) === 'Showing 3 of 29: names: all.', `count text: ${await readText(page, '#problems-count')}`);
      assert((await page.evaluate(() => window.__mv.problems.filter().names)) === 'all', 'the filter hook says names: all');
      log('(a) #problems-names-all');
      await shot('problems-names-all');
      return;
    }
    if (ctx.route === 'problems-todo') {
      assert((await page.evaluate(() => window.__mv.problems.filter().todo)) === true, '#problems-todo sets the not-ticked filter');
      return;
    }

    // ---- collapsed cards, height, the chips and the Rehearse links
    assert((await count('article.problem-card')) === 29, '29 article.problem-card');
    assert((await page.evaluate(() => [...document.querySelectorAll('article.problem-card')].every((c) => c.getAttribute('data-open') === 'false'))) === true, 'every card starts collapsed (data-open false)');
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    assert(h < (wide ? 4000 : 7500), `the whole page is ${h} px, under ${wide ? 4000 : 7500}`);
    log(`page height ${h}px`);
    const missing = await page.evaluate(async () => {
      const { PROBLEMS } = await import('./js/data/problems.js');
      const bad = [];
      for (const p of PROBLEMS) {
        const k = p.id.replace(/\./g, '-');
        const a = document.getElementById(`problems-card-${k}-address`);
        const n = document.getElementById(`problems-card-${k}-names`);
        const r = document.querySelector(`a#problems-rehearse-${k}[href="#rehearse-${k}"]`);
        if (!a || !a.classList.contains('decision-chip') || a.getAttribute('data-value') !== p.address) bad.push(`${p.id} address`);
        if (!n || !n.classList.contains('decision-chip') || n.getAttribute('data-value') !== p.names) bad.push(`${p.id} names`);
        if (!r) bad.push(`${p.id} rehearse`);
        if (!document.getElementById(`problems-tick-${k}`) || !document.getElementById(`problems-open-${k}`)) bad.push(`${p.id} tick or open`);
      }
      return bad;
    });
    assert(missing.length === 0, `every card has its two chips, its Rehearse link, its tick and its open button: ${missing.slice(0, 5).join(', ')}`);
    assert((await attr('#problems-card-1-4-2-names', 'data-value')) === 'all', '1.4.2 is names: all');
    assert((await attr('#problems-card-1-4-2-address', 'data-value')) === 'P->C', '1.4.2 is address P->C');
    log('(a) 29 collapsed cards with chips, Rehearse links, ticks');

    // ---- open one at a time, several at once, collapse all
    await page.click('#problems-open-1-4-2');
    assert((await attr('#problems-card-1-4-2', 'data-open')) === 'true' && (await attr('#problems-open-1-4-2', 'aria-expanded')) === 'true', '1.4.2 opens');
    assert(await isVisible('#problems-reveal-1-4-2'), 'its Reveal button is visible');
    await page.click('#problems-open-1-4-1');
    assert(same(await openIds(), ['1.4.1']), `mode one: opening 1.4.1 collapses 1.4.2 (open: ${await openIds()})`);
    assert((await attr('#problems-open-1-4-2', 'aria-expanded')) === 'false' && (await attr('#problems-card-1-4-2', 'data-open')) === 'false', '1.4.2 is collapsed');
    assert(same(await deckHook(), { open: ['1.4.1'], mode: 'one' }), `deck hook: ${JSON.stringify(await deckHook())}`);
    await page.click('#problems-mode-all');
    assert((await attr('#problems-mode-all', 'aria-pressed')) === 'true' && (await attr('#problems-mode-one', 'aria-pressed')) === 'false', 'mode all is pressed');
    await page.click('#problems-open-1-4-2');
    assert(same(await openIds(), ['1.4.1', '1.4.2']), `mode all: both stay open (${await openIds()})`);
    assert(same(await deckHook(), { open: ['1.4.1', '1.4.2'], mode: 'all' }), `deck hook: ${JSON.stringify(await deckHook())}`);
    await page.click('#problems-collapse-all');
    assert((await openIds()).length === 0 && same(await deckHook(), { open: [], mode: 'all' }), 'Collapse all closes every card');
    await page.click('#problems-open-1-1-1');
    await page.click('#problems-open-1-1-2');
    assert(same(await openIds(), ['1.1.1', '1.1.2']), `mode all keeps two open (${await openIds()})`);
    await page.click('#problems-mode-one');
    assert(same(await openIds(), ['1.1.2']) && same(await deckHook(), { open: ['1.1.2'], mode: 'one' }), `back to one at a time keeps the last row opened (${await openIds()})`);
    await page.click('#problems-collapse-all');
    await page.click('#problems-mode-all');
    await page.click('#problems-open-all');
    assert((await openIds()).length === 29, 'Open all shown opens the 29 cards');
    await page.click('#problems-collapse-all');
    await page.click('#problems-mode-one');
    log('(b) open one, several, all, collapse all');

    // ---- the Names filter, with the chapter filter and the empty state
    for (const [code, want] of [['all', NAMES.all], ['home', NAMES.home], ['continuous', NAMES.continuous], ['none', NAMES.none]]) {
      await page.click(`#problems-filter-names-${code}`);
      const v = await visible();
      assert(same(v, want), `names ${code}: ${v.join(',')}`);
      assert((await attr(`#problems-filter-names-${code}`, 'aria-pressed')) === 'true', `names ${code} chip is pressed`);
    }
    assert((await visible()).length === 11, 'none is 11 problems');
    await page.click('#problems-filter-names-any');
    assert((await visible()).length === 12, 'any is 12 problems');
    await page.click('#problems-filter-names-all-names');
    assert((await visible()).length === 29, 'No filter is 29');
    await page.click('#problems-filter-1');
    await page.click('#problems-filter-names-any');
    assert(same(await visible(), ['1.3.2']), `chapter 1 and names any: ${await visible()}`);
    assert((await readText(page, '#problems-count')) === 'Showing 1 of 29: Chapter 1, names: any.', `count text: ${await readText(page, '#problems-count')}`);
    await page.click('#problems-filter-3');
    await page.click('#problems-filter-names-home');
    assert((await visible()).length === 0 && (await isVisible('#problems-empty')), 'chapter 3 and names home match nothing, and the empty message shows');
    await page.click('#problems-show-all');
    assert((await visible()).length === 29 && (await attr('#problems-filter-names-all-names', 'aria-pressed')) === 'true' && (await attr('#problems-filter-all', 'aria-pressed')) === 'true', 'Show all resets all three filters');
    log('(c) names filter, chapter combination, empty state');

    // ---- predict first: the chips and the place wait for the reveal
    await page.check('#problems-predict');
    await page.click('#problems-open-1-4-2');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) === false, 'predict hides the chips of the open card');
    assert((await isVisible('#problems-card-1-4-2 a[href="#problem-1-4-2"]')) === false, 'predict hides the station link');
    assert((await isVisible('#problems-card-1-1-1 .decisions')) === false, 'predict hides the chips of a collapsed row too');
    assert((await isVisible('#problems-balance-panel')) === false, 'predict hides the address balance, which would give the addresses away');
    assert(await isVisible('#problems-rehearse-1-4-2'), 'the Rehearse link stays');
    await page.click('#problems-reveal-1-4-2');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) && (await isVisible('#problems-card-1-4-2 a[href="#problem-1-4-2"]')), 'Reveal shows the chips and the station link');
    await page.click('#problems-collapse-all');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) === false, 'collapsing re-hides the answer and the chips');
    await page.uncheck('#problems-predict');
    assert((await isVisible('#problems-card-1-4-2 .decisions')) && (await isVisible('#problems-balance-panel')), 'predict off shows them again');
    log('(d) predict first');

    // ---- keyboard: arrows between rows, Enter opens, Escape closes
    await page.focus('#problems-open-1-1-1');
    await page.keyboard.press('ArrowDown');
    assert((await page.evaluate(() => document.activeElement.id)) === 'problems-open-1-1-2', 'ArrowDown moves to the next row');
    await page.keyboard.press('End');
    assert((await page.evaluate(() => document.activeElement.id)) === 'problems-open-P7', 'End goes to the last row');
    await page.keyboard.press('Home');
    assert((await page.evaluate(() => document.activeElement.id)) === 'problems-open-1-1-1', 'Home goes to the first row');
    await page.keyboard.press('Enter');
    assert((await attr('#problems-card-1-1-1', 'data-open')) === 'true', 'Enter opens the row');
    await page.keyboard.press('Escape');
    assert((await attr('#problems-card-1-1-1', 'data-open')) === 'false' && (await page.evaluate(() => document.activeElement.id)) === 'problems-open-1-1-1', 'Escape closes it and keeps focus on its button');
    await page.click('#problems-card-1-2-2 .pc-statement');
    assert((await attr('#problems-card-1-2-2', 'data-open')) === 'true', 'a click on the statement opens a collapsed row');
    await page.click('#problems-collapse-all');
    log('(e) keyboard and pointer');

    // ---- the Rehearse link, ticks on the row, topics as rows
    await page.click('#problems-rehearse-1-4-2');
    await page.waitForFunction(() => location.hash === '#rehearse-1-4-2');
    await page.goBack();
    await waitFor('article.problem-card');
    await page.check('#problems-tick-1-1-1');
    assert((await readText(page, '#problems-progress')) === '1 of 29 ticked' && (await attr('#problems-card-1-1-1', 'data-done')) === 'true', 'a tick on the one-line row counts');
    await page.uncheck('#problems-tick-1-1-1');
    assert((await count('article.topic-card')) === 12 && (await page.evaluate(() => [...document.querySelectorAll('article.topic-card')].every((c) => c.dataset.open === 'false'))), '12 collapsed topic rows');
    assert((await isVisible('#problems-topic-T1-4 a[href="#powers"]')) === false, 'a collapsed topic hides its links');
    await page.click('#problems-topic-open-T1-4');
    assert(await isVisible('#problems-topic-T1-4 a[href="#powers"]') && (await attr('#problems-topic-open-T1-4', 'aria-expanded')) === 'true', 'opening a topic shows where to learn it');
    log('(f) Rehearse link, tick, topics');

    // ---- the deck survives a round trip to a station
    await page.click('#problems-open-1-4-2');
    await page.click('#problems-card-1-4-2 a[href="#problem-1-4-2"]');
    await page.waitForFunction(() => location.hash === '#problem-1-4-2');
    await page.goBack();
    await waitFor('article.problem-card');
    assert(same(await openIds(), ['1.4.2']), `Back from the station restores the open card (${await openIds()})`);
    log('(g) the deck after a station round trip');

    // ---- rehearsed links come from the store
    await page.evaluate(() => localStorage.setItem('mv:rehearse.scores', JSON.stringify({ '1.4.2': { tried: 1, right: 1, last: 1 } })));
    await page.reload({ waitUntil: 'load' });
    await waitFor('article.problem-card');
    assert((await attr('#problems-rehearse-1-4-2', 'data-rehearsed')) === 'true' && (await readText(page, '#problems-rehearse-1-4-2')) === 'Rehearse again', 'a rehearsed problem says Rehearse again');
    assert((await readText(page, '#problems-rehearse-1-4-1')) === 'Rehearse', 'the others say Rehearse');
    await page.evaluate(() => localStorage.removeItem('mv:rehearse.scores'));

    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `no horizontal overflow (${over}px)`);
    await shot('problems-deck');
    await page.click('#problems-mode-all');
    await page.click('#problems-open-1-4-2');
    await page.click('#problems-reveal-1-4-2');
    await page.click('#problems-open-1-3-1');
    assert((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'no horizontal overflow with two cards open');
    await shot('problems-deck-open');
    log('i2-home-index-deck: problems steps passed');
  }

  // ============================================================ A2: the map
  async function homeBlock() {
    await waitFor('#home-map a.map-station');
    const ids = await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.map((s) => s.id));
    assert(ids.length === 22, `the registry lists 22 stations, got ${ids.length}`);
    const dataIds = await page.evaluate(() => [...document.querySelectorAll('#home-map a.map-station')].map((a) => a.getAttribute('data-station')));
    assert(same(dataIds, ids), `22 a.map-station in registry order: ${dataIds.join(',')}`);
    assert(dataIds.indexOf('graph4d') + 1 === dataIds.indexOf('rehearse') && dataIds.indexOf('rehearse') + 1 === dataIds.indexOf('problems'), 'rehearse sits between graph4d and problems');
    assert(await page.evaluate(() => { const r = document.querySelector('a.map-station[data-station="rehearse"]'); const p = document.querySelector('a.map-station[data-station="problems"]'); return !!(r.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'rehearse comes before problems in the document');
    for (const [t, n] of [['T1', 16], ['T2', 12], ['T3', 14]]) assert((await count(`#home-map circle.stop[data-thread="${t}"]`)) === n, `${t} has ${n} stops`);
    assert((await count('#home-map circle.pdot')) === 29, '29 problem dots');

    if (ctx.route === 'home-T2') {
      assert((await count('#home-map a.map-station.is-dim')) === 10, 'T2 dims 10 places');
      assert((await attr('#home-thread-T2', 'aria-pressed')) === 'true', 'the T2 legend button is pressed');
      return;
    }

    // ---- the two decisions
    assert((await count('#home-decisions #home-decision-address')) === 1 && (await count('#home-decisions #home-decision-names')) === 1, '#home-decisions holds the address and names blocks');
    const addrText = await readText(page, '#home-decision-address');
    const namesText = await readText(page, '#home-decision-names');
    assert(addrText.includes('Cartesian') && addrText.includes('polar'), `the address block says Cartesian and polar: ${addrText.slice(0, 80)}`);
    for (const w of ['any', 'all', 'home', 'continuous']) assert(namesText.includes(w), `the names block says ${w}`);
    assert((await count('#home-decision-address-list li')) === 6, 'six address choices');
    for (const code of ['none', 'any', 'all', 'home', 'continuous']) assert((await attr(`#home-decision-names-link-${code}`, 'href')) === `#problems-names-${code}`, `the ${code} choice links to the index filter`);
    assert((await readText(page, '#home-decision-names-link-all')).includes('3 problems') && (await readText(page, '#home-decision-names-link-continuous')).includes('1 problem'), 'the counts are 3 and 1');
    assert(await page.evaluate(() => { const a = document.getElementById('home-decisions').getBoundingClientRect().top; const b = document.getElementById('home-spine').getBoundingClientRect().top; const c = document.getElementById('home-map-panel').getBoundingClientRect().top; return a > b && a < c; }), 'the decisions block sits under the spine and above the map');
    assert((await readText(page, '#home-spine-line')).includes('A turn has many names.'), 'the spine carries the four lines');
    assert((await count('#home-spine-list li')) === 4, 'four spine items');
    await page.click('#home-decision-names-link-all');
    await page.waitForFunction(() => location.hash === '#problems-names-all');
    await waitFor('article.problem-card');
    assert(same(await visible(), ['1.4.1', '1.4.2', '1.4.3']), 'the link lands on the three roots problems');
    await page.goBack();
    await waitFor('#home-map a.map-station');
    log('(a) 22 stops, the decisions block, its links');

    // ---- rehearsed dots come from the store
    await page.evaluate(() => localStorage.setItem('mv:rehearse.scores', JSON.stringify({ '1.4.2': { tried: 1, right: 1, last: 1 } })));
    await page.reload({ waitUntil: 'load' });
    await waitFor('#home-map a.map-station');
    assert((await count('circle.pdot[data-problem="1.4.2"].is-rehearsed')) === 1 && (await count('circle.pdot.is-rehearsed')) === 1, 'only the dot of 1.4.2 is rehearsed');
    assert(same(await page.evaluate(() => window.__mv.home.rehearsed()), ['1.4.2']), 'the hook lists 1.4.2');
    assert((await readText(page, '#home-progress')).includes('Rehearsed 1 of 29'), `progress line: ${await readText(page, '#home-progress')}`);
    assert((await attr('a.map-station[data-station="roots"]', 'aria-label')).includes('1 rehearsed'), 'the roots place says 1 rehearsed');
    const ring = await page.evaluate(() => [getComputedStyle(document.querySelector('circle.pdot[data-problem="1.4.2"]')).strokeWidth, getComputedStyle(document.querySelector('circle.pdot[data-problem="1.4.1"]')).strokeWidth]);
    assert(parseFloat(ring[0]) > parseFloat(ring[1]), `a rehearsed dot has a heavier ring: ${ring.join(' | ')}`);
    await page.evaluate(() => localStorage.removeItem('mv:rehearse.scores'));
    await page.reload({ waitUntil: 'load' });
    await waitFor('#home-map a.map-station');
    assert((await count('circle.pdot.is-rehearsed')) === 0, 'with no scores stored no dot is rehearsed');
    log('(b) rehearsed dots');

    // ---- the layout: three rows of 8, 8 and 6 at desktop; no label touches another
    const layout = await page.evaluate(() => window.__mv.home.layout());
    if (wide) {
      assert(layout === 'wide', `1280 px gives the wide map, got ${layout}`);
      const ys = await page.evaluate(() => [...document.querySelectorAll('#home-map rect.node-pill')].map((r) => r.getAttribute('y')));
      const rows = [...new Set(ys)];
      assert(rows.length === 3, `three rows (${rows.join(',')})`);
      assert(same(rows.map((y) => ys.filter((v) => v === y).length), [8, 8, 6]), 'rows of 8, 8 and 6');
      const hits = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('#home-map .map-label, #home-map .map-num, #home-map .map-part')].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 24), x0: r.left, x1: r.right, y0: r.top, y1: r.bottom }; });
        const svg = document.getElementById('home-map').getBoundingClientRect();
        const bad = [];
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          if (a.x0 < svg.left - 1 || a.x1 > svg.right + 1) bad.push(`outside: ${a.t}`);
          for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) bad.push(`${a.t} / ${b.t}`); }
        }
        return { n: boxes.length, bad };
      });
      assert(hits.n >= 22 * 2 + 5 && hits.bad.length === 0, `no label, number or caption touches another (${hits.n} boxes): ${hits.bad.slice(0, 4).join(' | ')}`);
    } else {
      assert(layout === 'narrow', `a phone gets the narrow map, got ${layout}`);
      assert((await count('#home-map a.map-station')) === 22, 'the narrow map has 22 places');
    }
    log(`(c) layout ${layout}`);

    // ---- the thread focus on the 22-place map
    await page.goto(`${origin()}/index.html#home-T2`);
    await waitFor('#home-map[data-focus="T2"]');
    assert((await count('#home-map a.map-station.is-dim')) === 10, '#home-T2 dims 10 of the 22 places');
    await page.goto(`${origin()}/index.html#home`);
    await waitFor('#home-map a.map-station');

    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `no horizontal overflow (${over}px)`);
    await shot('home-map');
    log('i2-home-index-deck: home steps passed');
  }
}
````

---

## Build notes (stage 3, iteration 2)

The appendices were applied as written: Appendix A is `js/stations/problems.js`, B, C and D were applied with `patch -p1` to `home.js`, `tests/unit/i1-station-home-problems.test.mjs` and `tests/interact/i1-station-home-problems.mjs`, and Appendix E is `tests/interact/i2-home-index-deck.mjs`. No deviation from the appendices.

Added by the builder: `tests/unit/i2-home-index-deck.test.mjs` (14 rows, I1 to I14), the goal's own check of the headline numbers: the Names counts and lists, `deckState`, `parseProblemsToken`, `rehearse.scores`, the 22-station map at W = 1000 and 358, `WIDE_MIN`, `PART_LABELS`, `stationNeighbours`, `decisionBlock`, `stationLabel`, a source scan (no typed colour, no `innerHTML`), and twelve worked answers recomputed from `complex.js`.

Measured on the real repo (against the half-built walk-shell CSS): `/#problems` 3,659 px at 1280 (budget 4,000) and 6,330 px at 390 (budget 7,500); `i1-station-home-problems` 45 of 45 unit rows, 6 of 6 checks; `i2-home-index-deck` 15 of 15 checks (five routes, desktop, phone, dark); the I8 sweep of `i1-integration` emulated on `home` and `problems`: 69 and 138 link ids, none loose, none duplicated, identical on a second visit. `tests/unit/i1-integration` `I1` and the `i1-integration` script stop at "#rehearse shows no error panel" until `i2-rehearse` lands its module.
