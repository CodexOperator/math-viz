# Design: i2-walk-shell

Goal `i2-walk-shell` (wave 1, kind foundation). Stage 2 design for the builder. The formal spec is the `i2-walk-shell` entry of
`docs/goals/iter-2.json`; where this file and ARCHITECTURE section 11.5 differ, section 0.2 says why and this file wins for the
builder (the integrator updates ARCHITECTURE afterwards).

Owns: `js/core/walk.js` (new), `js/app.js`, `index.html`, `css/theme.css`, `css/components.css`, `tests/unit/i1-shell.test.mjs`,
`tests/interact/i1-shell.mjs`. The goal's acceptance text also names two new files that belong to this goal by the naming rule
every wave-0 goal followed (`tests/unit/<goal id>.test.mjs`, `tests/interact/<goal id>.mjs`): `tests/unit/i2-walk-shell.test.mjs`
and `tests/interact/i2-walk-shell.mjs` (request R1 in section 10).

Read for this design: `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`, `docs/STORY.md`, `docs/ARCHITECTURE.md` (1, 3.13, 3.14, 3.15, 9 "walk",
10.1, 11.4, 11.5), `js/registry.js` (the 22 `walk` entries), `js/app.js`, `js/core/listen.js`, `js/core/store.js`, `js/core/theme.js`,
`css/theme.css`, `css/components.css`, `index.html`, `tests/unit/i1-shell.test.mjs`, `tests/interact/i1-shell.mjs`,
`tests/interact/_helpers.mjs`, `tools/smoke.mjs`, `tools/interact-all.mjs`, `docs/designs/iter-2/i2-media-core.md` (its requests to this
goal), `docs/review/iter-2/before/home--desktop.png` and `home--phone.png`. The look-critical CSS of section 3 was prototyped in a
scratch page against the real `theme.css` and `components.css` and checked in light and dark at 1280 and 390 px (the measured heights
quoted below come from that prototype).

---

## 0. Decisions, discrepancies, and differences from the plan

### 0.1 Decisions a builder or reviewer might otherwise trip over

| # | Decision | Why |
|---|---|---|
| D1 | **The bar shows the stop of the page you are on** (the "shown" stop), not always the Walk's saved position (the "current" stop). `data-stop` is the current stop; `data-shown` is the shown one; `data-here` is true when they are the same station. | A3 requires `#walk-do` to show the Roots text while the Walk is at stop 0, and "doing a later stop early counts". |
| D2 | **Back and Next move from the shown stop**, not from the saved one: from Roots (stop 7) Next goes to Curves (stop 8) and the Walk adopts that position. They are disabled only at the two ends of the path. | "Next" under a label that says "Stop 7" must mean stop 8. It also removes the need for a separate "continue from here" control. |
| D3 | **Visiting a stop's own route does not move the Walk** (A3 types `#roots-m16` while at stop 0 and expects `data-here="false"`). Only the bar's controls (Start, Resume, Back, Next, a dot, `goTo`) change the current stop. | Keeps the location and the Walk independent; the "Go to stop N" link is the way back. |
| D4 | **Off, the bar is a floating pill** (`#walk-start`, bottom right). **On, it is a full-width bar** at the bottom of the main column (it starts at the sidebar's edge on desktop). | A permanent 48 px strip for students who never use the Walk would cost every page; the pill costs a corner. |
| D5 | **Clearance, not overlap.** The bar is `position: fixed`. The router's `#view` gets `padding-bottom: calc(var(--space-3) + var(--walk-h))`, `html` gets `scroll-padding-bottom`, and the footer is pulled up into that padding so the page does not end in two bar-heights of blank space (section 3.2). | A2 asserts both the padding and that `scrollIntoView({block:'end'})` leaves the plane above the bar. Verified in Chromium: root `scroll-padding-bottom` is honoured by `scrollIntoView`. |
| D6 | **The checker never gives a free tick.** A check that is already true when the checker starts must be seen false once before it can tick ("armed" rule, 5.8). | A station could open in a state that satisfies a `text` or `hook` check by default (a preset). |
| D7 | **`walk.js` exports exactly the eight names of ARCHITECTURE 11.5** and nothing else; every helper is private. | The integrator will move 11.5 into section 3, where `architecture-sync.test.mjs` requires every export to be documented. |
| D8 | **Checks are evaluated on samples, not on live DOM reads inside `evaluateCheck`.** `evaluateCheck` is pure over a Snapshot; the DOM sampling lives in the checker. | A1 unit-tests `evaluateCheck` in Node with hand-made snapshots. |
| D9 | **One extra persisted key, `walk.min`** (the Hide/Show choice), private to `walk.js` and not part of `WALK_KEYS`. | ARCHITECTURE pins `WALK_KEYS` to three keys; the fold is a convenience for phones. The integrator adds it to 3.13. |
| D10 | **app.js calls `loadManifest()` once at start** (fire and forget) and imports `./core/listen.js` for that. | Request 2 of `i2-media-core.md` section 9: the manifest promise is settled before a station mounts, so a video panel does not shift content. The architecture-sync allowed list already contains the import. |
| D11 | **The problem chip always links to `#problem-<id>`** (ARCHITECTURE 9), even when the problem lives on another station (staircase, lab and rehearse show problems whose owner is Addresses, Powermap and Roots). | Simple and literal. Tapping it is a deliberate detour; the bar then shows the off-path state with a way back. |

### 0.2 Discrepancies in the goal text and ARCHITECTURE, and how this design resolves them

| # | Source says | Problem | Resolution |
|---|---|---|---|
| S1 | A4: "the three thread badges on a station header (`staircase--desktop.png`)" | `staircase` has `threads: ['T2']`, so its header shows one badge. | The review command in 7.1 captures `home`, `staircase` and `lab` (`lab` has T1, T2, T3). The three badges are judged in `lab--desktop.png`. |
| S2 | ARCHITECTURE 9 says `#walk-next` is "disabled on the last stop" and `#walk-goto` reads "Go to this stop". | D1/D2 make Back and Next relative to the shown stop; "this stop" is ambiguous when the shown stop is not the saved one. | Back is disabled at stop 1 and Next at stop 22 (of the shown stop). `#walk-goto` reads `Go to stop 1: The Map` (it still contains "Go to", as A3 wants). |
| S3 | ARCHITECTURE 11.5: `markDone(stationId = current)`. | With D1 the useful default is the stop on screen. | `markDone()` with no argument ticks the **shown** stop's station; with an argument it ticks that station. |
| S4 | A2 names `window.__mv.staircase.state().laps` and the plane handle ids `home-demo-plane-z`, `distance-plane-a`, `staircase-plane-z`; the registry checks name `distance-plane-R`, `roots-stairs-k1-row`, `limits-path-line`, `lab-replay`, `rehearse-reveal`, `problems-tick-`. | All exist in the code today (three of them are built from a prefix and a key, so a plain text search does not find them; see U7) except `lab-replay` and `rehearse-reveal`, which belong to two sibling wave-1 goals (`i2-lab-diary`, `i2-rehearse`) that build concurrently. | Unit test U7 asserts every id occurs in its station's source (a small table covers the three prefix-built ids), with an allow-list for exactly those two missing ids until the integrate stage (`WALK_STRICT=1` removes it). |
| S5 | The goal's `owns` list has `tests/unit/i1-shell.test.mjs` and `tests/interact/i1-shell.mjs`, A1 and A2 name the `i2-` files. | The new files are not in `owns`. | R1 in section 10; the builder creates both (the wave-0 goals did the same). |
| S6 | `docs/designs/iter-2/i2-decisions-kit.md` 8.5 and `i2-media-core.md` section 9 hand two CSS jobs to this goal. | Not in the goal text. | Done here: the part V menu note may wrap (3.2, `.nav-part-title`), and the `.video-panel` / `.listen` block of media-core request 1 goes into `components.css` (3.2). |

### 0.3 What exists today (the code wins over the docs)

- `js/app.js` already has the values preset (`takeStationRequest`, `valuesPreset`), `PART_TITLES = PARTS`, `window.__mv.app = { render, navigate, state, request, preset }`. Its render `catch` block is pinned by a unit test (`i1-shell.test.mjs`, "a stale navigation that fails..."): this goal adds **new helper functions** (each with its own `try`/`catch`) and changes the existing `catch` only by giving its `finish(...)` call a third argument; the seq check stays before `clearTimeout`.
- `index.html` already has a brand mark (axes, a dashed Cartesian pair, a polar ray and arc, a dot) and `.site-title-text` already uses `var(--font-display)` (a serif stack: Iowan Old Style, Palatino, Georgia, Times). The mark becomes a polar grid; the title face stays and is tuned.
- `css/theme.css` has `html { scroll-padding-top: ... }`, no walk token. `css/components.css` has no `.walk-*` rule, `.thread-badge::before` is a disc / dashed ring / diamond (pinned: T3 `transform: rotate(45deg)`), and `.nav-part-title` is a flex row without wrapping.
- `js/core/listen.js` exists (wave 0): `listenControl(container, station, { id, segment, label, manifest })` resolves `null` when there is no clip. `media/manifest.js` exists and is empty (`VIDEOS = []`, `SITE_AUDIO = {}`), so the Listen control never appears yet.
- `js/registry.js` has all 22 `walk` entries (route, do, say, problem, check) and `media/narration/site/walk.json` already carries the 22 `say` sentences.
- `tests/interact/_helpers.mjs` exports `settle`, `dragHandle`, `dragHandleAround`, `clickChip`, `readText`, `setSlider`, `handleZ` (all A2 needs). `tools/interact-all.mjs` already has the row `'i2-walk-shell': ['home', 'staircase', 'roots-m16']`, so the interaction script must behave on all three routes (section 7.3).
- Every `walk.check` in the registry validates under the vocabulary of 5.3 (checked by hand against the 22 entries; U1 asserts it).

---

## 1. Goal restatement, story thread, problems and topics covered

**Goal.** One guided path through the 22 places of the site, so that the site is one road with progress instead of 22 tabs. A Walk
bar (a persistent bar at the bottom of the screen) tells the student at each stop **the one thing to do**, **the one sentence to say
out loud** and **the one problem**; ticks the stop by itself when the station reports the interaction; remembers progress; and never
covers a plane. The same goal gives the shell its **chart identity**: the polar grid as brand mark, as a faint backdrop behind the home
map, and as bearings on the thread badges.

**Story thread carried (STORY sections 0 and 6).** The spine is four lines; the Walk is those four lines as a road, one sentence per
stop. On screen the thread shows in three places: the **say sentence** itself (the four lines and their station variants), the
**top rule of the bar**, which takes the station's first thread colour (`--cart` T1, `--polar` T2, `--output` T3, the two-address
code), and the **progress strip** (22 dots: a ring is not done, a filled dot is done, a heavy ring is where the Walk is, an underline
marks the stop on screen).

| Spine line | Stops (index, station) | The sentence the student says there |
|---|---|---|
| A complex number is a move: turn, then stretch | 0 home, 1 addresses, 2 arithmetic, 3 distance | "A complex number is a move: turn, then stretch." / "Same dot, two addresses." / "Multiplying is a move; adding is a slide." / "A circle is every point one stretch away from the centre." |
| A turn has many names | 4 staircase, 5 powers, 6 roots, 12 principal-root, 13 branches | "arg z is every name; Arg z is the home step; z never moves." / "Any name works for a power; report the home step." / "Roots need every name; k = n is k = 0 again." / "Principal means the home step only." / "A branch is a continuous choice of name; cut where the question does not look." |
| A function moves every point at once | 7 curves, 8 sets, 9 mappings, 10 linear, 11 powermap, 14 reciprocal, 15 limits | time and shape sentences: "A curve is a point that moves; time is the clock the w-plane will keep." ... "Every direction must agree." |
| Differentiable means: up close, one move | 16 derivative, 17 cauchy-riemann | "Differentiable means one move up close; the derivative is that move." / "Cauchy-Riemann says no mirror." |
| The review | 18 lab, 19 graph4d, 20 rehearse, 21 problems | "Draw it, push it forward, read it." / "Every picture is a shadow of one object." / "Same place, new numbers." / "Which place, which address, which names." |

**Review problems the stops point to (the goal's `assignment_refs`).** 1.3.1 (stops 1 and 4), 1.1.1, 1.2.1, 1.3.2, 1.4.2 (stops 6
and 20), 1.5.1, 1.5.2, 2.1.1, 2.1.3, 2.1.2 (stops 11 and 18), 2.2.2, 2.4.1, 2.5.1, 2.3.1, 3.1.2, 3.2.1: sixteen distinct problems.
The other thirteen (1.1.2, 1.2.2, 1.4.1, 1.4.3, 2.2.1, 3.1.1, P1 to P7) are reached through the same stations and through stops 20
and 21 (the Rehearsal Room and the index list all 29). The goal computes none of them; the Walk's texts quote numbers that must be
right, so section 6 works every one of the sixteen in both addresses and pins the numbers the registry's `do` sentences quote.

**Topics covered (the goal's `T1.3`, `T2.4`, `T3.1`, and by the stops all twelve).** T1.1 and T1.3 at stops 1 and 2 (and 4); T1.2 at
stop 3; T1.4 at stops 5 and 6; T1.5 at stops 7 and 8; T2.1 at stops 9 to 11 and 18; T2.2 at stops 11 and 12; T2.3 at stop 15; T2.4 at
stops 4 and 13; T2.5 at stops 14 and 19; T3.1 at stop 16; T3.2 at stop 17.

---

## 2. UX

### 2.1 Where the pieces sit

| Piece | Where | Built by |
|---|---|---|
| Walk bar `#walk-bar` | the last child of `<body>`, fixed to the bottom of the viewport; outside `#view`, so a station never sees it | `createWalk` (called once by `start()`) |
| Off state | a pill at the bottom right: `#walk-start` | `walk.js` |
| On state | a full-width bar (desktop: from the sidebar's right edge to the window's right edge); top rule 3 px in the shown station's thread tone | `walk.js` |
| Brand mark, title | `index.html` header | `index.html` + CSS |
| Polar-grid backdrop | `#home-map-panel::before` (the Story Map panel built by `home.js`) | CSS only |
| Thread bearings | `.thread-badge::before` on every station header | CSS only |

### 2.2 Wireframes

Desktop, Walk on (1280 px wide; main column 1000 px; measured 160 px tall in the prototype, 20 % of an 800 px window):

```
 ┌──────────┬───────────────────────────────────────────────────────────────────────────┐
 │ sidebar  │  (the station page scrolls here)                                          │
 │ (nav)    │                                                                           │
 │          ├━━━━━━━━━━━━━━━━━━━━━━━━ 3 px rule in --cart / --polar / --output ━━━━━━━━━┤
 │          │ [Back]  Stop 2 of 22 · One Point, Two Addresses                [Next] [v] │
 │          │ ✓ Done: stop 2 ticked.                    (status line; zero height empty)│
 │          │ [Do]  Type r = 2 and theta = 2pi/3 into     (1.3.1) [Mark done] [Leave the Walk]
 │          │       the polar fields, then x = 1 and y = 1 into the Cartesian ones …    │
 │          │ [Say] “Same dot, two addresses.”                     [Listen]*             │
 │          │ ● ◉ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○        1 of 22 done          │
 └──────────┴───────────────────────────────────────────────────────────────────────────┘
   * [Listen] exists only when media/manifest.js lists a clip for this stop.
   Dots: ● done, ○ not done, ◉ the Walk's current stop (heavy ring), the shown stop has an underline.
```

Phone, 390 px, Walk on, expanded (measured 247 px with the longest `do` text, 29 % of an 844 px screen; shorter texts are about 215 px):

```
 ┌──────────────────────────────────────┐
 │ page content scrolls here             │
 ├━━━━━━━━━ 3 px thread-tone rule ━━━━━━━┤
 │ [Back] Stop 2 of 22 · One    [Next] [v]│  44 px row; the label wraps to 2 lines
 │        Point, Two Addresses            │
 │ ✓ Done: stop 2 ticked.                 │  only after a tick
 │ [Do]  Type r = 2 and theta = 2pi/3     │
 │       into the polar fields, then x =  │
 │       1 and y = 1 into the Cartesian   │
 │       ones: the dot moves and both …   │
 │ [Say] “Same dot, two addresses.”       │
 │ (1.3.1) [Mark done] [Leave the Walk]   │
 │ ● ◉ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○│  16 px per dot, 24 px tall links
 └──────────────────────────────────────┘
```

Phone, folded (`#walk-fold` pressed; about 92 px): the head row, the status line (if any), the away row (if off path) and the dots.

```
 │ [Back] Stop 2 of 22 · One    [Next] [^]│
 │        Point, Two Addresses            │
 │ ● ◉ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○│
```

Off path (the page is not the Walk's current stop's station). The label, `do`, `say` and problem are those of the page's stop (D1); the
away row says where the Walk is:

```
 │ [Back] Stop 7 of 22 · Roots: Divide the Staircase                       [Next] [v] │
 │ The Walk is at stop 1 of 22: The Map.                  [Go to stop 1: The Map]      │   .walk-away
 │ [Do]  With c = -16 and n = 4, click step k = 1 on the staircase and see which root … │
 │ [Say] “Roots need every name; k = n is k = 0 again.”   (1.4.2) [Mark done] [Leave …]│
 │ ● ○ ○ ○ ○ ○ ◉ …   (current stop 1 has the heavy ring; stop 7 has the underline)       │
```

Walk off (every page, every width): a pill, bottom right, 44 px tall, in `--accent`:

```
                                                              ┌──────────────────────┐
                                                              │  Start the Walk      │   or:  Resume the Walk: stop 6 of 22
                                                              └──────────────────────┘
```

### 2.3 Controls (every element, id, label, behaviour)

All ids are stable; the bar is built once and updated in place (never replaced), so focus survives a stop change.

| Element | id | Label / text | Behaviour |
|---|---|---|---|
| Bar | `walk-bar` | region, `aria-label="The Walk"` | `data-walk` off or on, `data-stop` (current index 0..21), `data-shown` (shown index), `data-here` true or false, `data-done` (shown stop ticked), `data-min` (folded), `data-thread` (the shown station's first thread, for the top rule's tone). `document.body.dataset.walk` mirrors `data-walk`. |
| Start / resume pill | `walk-start` | `Start the Walk`, or `Resume the Walk: stop K of 22` when any stop is ticked or the saved stop is not the first; `title`: `A guided path through all 22 places, one thing to do at each.` | `button type="button"`. Click: `resume()` if resumable, else `start()`. `hidden` while on. |
| Panel | `walk-panel` | none | Holds everything below; `hidden` while off. |
| Back | `walk-back` | `Back`, `aria-label="Back to the previous stop"` | `goTo(shown - 1)`. `disabled` when the shown stop is 0. |
| Stop label | `walk-stop-label` | `Stop 5 of 22 · The Staircase: z, arg z, Arg z` | `p`, display face, 2 lines max; an exponent in a title (`z^n`) is set as `sup.prose-sup`; `title` carries the plain text. |
| Next | `walk-next` | `Next`, `aria-label="Next stop"` | `goTo(shown + 1)`. `disabled` when the shown stop is 21; `title` then reads `That is the last stop.` |
| Fold | `walk-fold` | chevron; `aria-label` `Hide the steps` / `Show the steps` | `aria-expanded`, `aria-controls="walk-body"`. Toggles `#walk-body.hidden`, `data-min`, and stores `walk.min`. |
| Away row | `walk-away` | none | `div`; shown only when `data-here="false"`. Holds the two below. |
| Off-path line | `walk-offpath` | `The Walk is at stop 1 of 22: The Map.` (when the page is not a stop at all: `This page is not one of the stops. The Walk is at stop 1 of 22: The Map.`) | `p`. |
| Go-to link | `walk-goto` | `Go to stop 1: The Map` | `a.btn.btn-primary`, `href="#<current stop's route>"`. A plain link (no script): a hash change. |
| Status | `walk-status` | see 2.6 | `p`, `role="status"`, `aria-live="polite"`; always in the DOM; zero height when empty. Outside the fold, so a tick is visible and announced when folded. |
| Storage note | `walk-note` | `Your ticks are not saved in this browser. They last until you close this page.` | `p`, `hidden` unless a store write returned `false`. |
| Body | `walk-body` | none | The collapsible block: the text and the tools. `hidden` when folded; `max-height: 32dvh` with `overflow-y: auto`. |
| Do | `walk-do` | the stop's `do` text | `span` after a `Do` tag (`span.badge.walk-tag`). |
| Say | `walk-say` | `“<say>”` with typographic quotes | `span` after a `Say` tag. |
| Listen host | `walk-listen` | none (the control is `#walk-listen-btn`) | `span`, empty and `display: none` unless `listenControl(host, 'walk', { id: 'walk-listen-btn', segment: <station id> })` resolves a control. |
| Problem chip | `walk-problem` | the problem id (`1.3.1`), `aria-label` `Problem 1.3.1` | `a.chip.problem-chip`, `href="#problem-1-3-1"` (dots become dashes; `P3` stays `P3`); `hidden` when the stop has no problem. |
| Mark done | `walk-done` | `Mark done` | `button`. Ticks the shown stop's station (`markDone()`); hidden once that stop is ticked, and hidden when the page is not a stop (an error panel, an unknown route); focus moves to `#walk-next` when it hides under focus. |
| Leave | `walk-leave` | `Leave the Walk`, `title` `Close the guide. Your ticks are kept.` | `button`. `leave()`. Focus moves to `#walk-start`. |
| Progress | `walk-progress` | `aria-label` `Progress: 6 of 22 stops done` | `ol` of 22 `li.walk-dot[data-stop][data-done]`; the current stop's `li` has `aria-current="step"`; the shown stop's `li` has `data-shown="true"`. |
| Dot link | `walk-dot-<k>` (k = 0..21), `class="walk-dot-link"`, `data-stop="<k>"` | none visible; `aria-label` `Stop 5: The Staircase: z, arg z, Arg z`, with ` (done)` appended when ticked | `a`, `href="#<route>"`. Plain left click: `goTo(k)` (the default navigation is cancelled so the router sees one navigation). Modified click or middle click: the browser follows the link. Roving tabindex (2.4). |
| Count | `walk-count` | `6 of 22 done` | `span`; `display: none` below 900 px (the `ol`'s aria-label carries it). |

### 2.4 Interaction (pointer, touch, keyboard)

**Pointer and touch.** Every control is a button or a link (a tap is a click; there is no gesture, hover-only information or long
press). Back, Next, Fold and the pill are `var(--tap)` (2.75 rem, 44 px) tall; in the tools row the buttons are 2.5 rem (40 px) and the problem chip 2 rem (32 px, an existing chip size). A dot is a
link 24 px tall and `(width - 2 gutters) / 22` wide: 16.3 px at 390 px, 13.1 px at 320 px (the Back and Next buttons are the
equivalent controls for neighbouring stops, so the narrow dots are a shortcut, not the only way).

**Keyboard.** Tab order is the DOM order: Back, Next, Fold, the away row's link, (in the body) Listen, the problem chip, Mark done,
Leave, then **one** stop in the progress strip (roving tabindex: the focused dot, else the current stop's dot, has `tabindex="0"`,
the others `-1`). In the strip: ArrowRight and ArrowDown move to the next dot, ArrowLeft and ArrowUp to the previous, Home to the first,
End to the last; Enter on a dot follows it. There are no global shortcuts (the plane handles own the arrow keys). Focus ring: the global
`:focus-visible` rule (3 px `--focus`); inside the strip it is drawn inward (`outline-offset: -2px`) so the bar's edge does not clip it.

**Focus is not stolen.** The router focuses `#view` after every navigation. If focus was inside `#walk-bar` when the navigation
started (a keyboard user pressed Next), the router leaves it there, so Next can be pressed again. A control that hides while focused
(Mark done, Leave) hands focus to a visible neighbour (`#walk-next`, `#walk-start`).

**Screen reader.** The bar is a labelled region. The label, `do`, `say` and the problem chip are plain text. `#walk-status` is a polite
live region (a tick, once); the Listen button's state is the button's own. The strip is a list; each dot link says its stop and whether
it is done; the current stop's item carries `aria-current="step"`.

### 2.5 States

| State | What the student sees |
|---|---|
| Walk off, first visit | The pill `Start the Walk`. Nothing else changes on any page. |
| Walk off, returning | The pill `Resume the Walk: stop 6 of 22`. |
| Loading a stop (the Walk navigated) | The bar already shows the new stop (label, do, say); `data-here="true"`; the page below shows the router's loading placeholder after 150 ms. |
| A stop's station fails to load, or the route is unknown | The router's panel; the bar shows the **current** stop with the away row: `This page is not one of the stops. The Walk is at stop N of 22: <title>.` and `Go to stop N: <title>`. |
| Station with no Walk entry (a test station) | Same as above. |
| Walk on, stop ticked | `data-done="true"`, `#walk-done` hidden, status `Done: stop 5 is already ticked.` on arrival, or `Done: stop 5 ticked.` the moment a check passes. |
| All 22 ticked | The tick message ends `That is all 22 stops: the whole path is walked.` |
| Storage blocked or full | The Walk works for this page view; `#walk-note` says ticks will not be kept; no error is logged. |
| Corrupt stored values | Treated as missing (`walk.on` not `true`, `walk.stop` not an integer 0..21, `walk.done` not a plain object): the Walk starts off, at stop 0, with nothing ticked; nothing is rewritten until the student changes something. |
| No JavaScript | No bar (the page already says JavaScript is needed). |
| Reduced motion | No animation anywhere in the bar (3.2). |

### 2.6 Copy (every string this goal writes)

| Where | Text |
|---|---|
| Pill, never started | `Start the Walk` |
| Pill, resumable | `Resume the Walk: stop 6 of 22` |
| Pill `title` | `A guided path through all 22 places, one thing to do at each.` |
| Region | `The Walk` |
| Label | `Stop 5 of 22 · The Staircase: z, arg z, Arg z` (middle dot U+00B7 with a space each side) |
| Tags | `Do`, `Say` |
| Say | `“arg z is every name; Arg z is the home step; z never moves.”` (U+201C and U+201D around the registry sentence) |
| Back / Next | `Back` / `Next` (aria `Back to the previous stop` / `Next stop`); Next at the end: title `That is the last stop.` |
| Fold | aria `Hide the steps` / `Show the steps` |
| Mark done | `Mark done` |
| Leave | `Leave the Walk`; title `Close the guide. Your ticks are kept.` |
| Problem chip | the id; aria `Problem 1.3.1` |
| Go to | `Go to stop 1: The Map` |
| Off-path line | `The Walk is at stop 1 of 22: The Map.` / `This page is not one of the stops. The Walk is at stop 1 of 22: The Map.` |
| Tick, here | `Done: stop 5 ticked.` |
| Tick, ahead | `Done: stop 7 ticked, ahead of the Walk (it is at stop 1).` |
| Tick, behind | `Done: stop 3 ticked (an earlier stop).` |
| Tick, last of all | the tick text, then ` That is all 22 stops: the whole path is walked.` |
| Arrival at a ticked stop | `Done: stop 5 is already ticked.` |
| Progress aria | `Progress: 6 of 22 stops done` |
| Count | `6 of 22 done` |
| Dot aria | `Stop 5: The Staircase: z, arg z, Arg z` or `Stop 5: The Staircase: z, arg z, Arg z (done)` |
| Storage note | `Your ticks are not saved in this browser. They last until you close this page.` |

No emoji; the check mark in the status line is drawn by CSS (`::before`), so `textContent` starts with `Done`.

---

## 3. Visual encoding

All colour comes from `css/theme.css` tokens, so both themes work with no JavaScript. **No new colour token.** The new tokens and custom
properties are lengths or angles: `--walk-h` (theme.css, `0px`), and, local to the rules that use them, `--ring`, `--from`, `--needle`,
and `--grid-ink` (a `color-mix` of two existing tokens, defined in `components.css`, not in `theme.css`).

### 3.1 What each part is drawn with

| Part | Token | Light | Dark | Notes |
|---|---|---|---|---|
| Bar surface | `--surface` | `#ffffff` | `#151c2b` | |
| Top rule (3 px) | `--tone` from `[data-thread]`: `--cart`, `--polar` or `--output`; `--accent` if none | `#0b63ad` `#a84300` `#9d3a8a` | `#62adf2` `#ff9d5c` `#e48fd2` | the two-address code on the station's first thread (home is T1) |
| Label, `do`, `say` | `--text` | `#1a2230` | `#e9edf5` | 15.96 : 1 / 14.52 : 1 on the surface |
| Off-path line, count | `--text-muted` | `#515b6c` | `#a6b0c3` | 6.86 : 1 / 7.80 : 1 |
| `Do` / `Say` tags | `.badge`, border `--border-strong` | | | 4.14 : 1 / 4.33 : 1 (non-text, needs 3) |
| Status line | `--ok` | `#26702a` | `#63d08a` | 6.12 : 1 / 8.86 : 1; the check mark is a shape cue; the words say Done |
| Next, Go to | `.btn-primary` (`--accent` fill, `--on-accent` text) | | | 10.69 : 1 / 13.09 : 1 |
| Pill | `.btn-primary` + `var(--shadow)` | | | |
| Dot, not done | ring 2 px `--border-strong` | | | a ring |
| Dot, done | fill and ring `--ok` | | | a filled dot (shape, not only hue) |
| Dot, current | 0.85 rem, 3 px ring `--text` | | | bigger and heavier |
| Dot, shown | 2 px underline `--text` | | | |
| Mark done button | `.btn` with `border-color: var(--ok)` | | | |
| Focus | global `--focus` | | | |

Colour is never the only carrier: done is filled versus ring, current is bigger and heavier, shown is an underline, the status line has a
check mark and the word Done.

### 3.2 The CSS (rules to write; every colour is `var(--token)`, `color-mix` of tokens, `transparent` or `currentcolor`)

**css/theme.css** (two additions, nothing else):

```css
/* in :root, after --content-max: */
  --walk-h: 0px;                  /* the Walk bar's height; walk.js sets it on <html> while the bar is on */
/* in the html rule: */
  scroll-padding-bottom: calc(var(--walk-h) + var(--space-3));
```

(The two dark blocks are untouched: lengths are not theme-dependent. The `:root` block must not gain a `}` inside a comment: the unit test
reads it with a regex.)

**css/components.css: edits in place**

1. Replace the `.brand-mark` block (the five rules from `.brand-mark {` to `.brand-mark .mark-dot`):

```css
.brand-mark { flex: none; width: 2rem; height: 2rem; color: var(--text-muted); }
@media (min-width: 56.25rem) { .brand-mark { width: 2.25rem; height: 2.25rem; } }
.brand-mark .mark-grid { stroke: currentcolor; stroke-width: 0.7; opacity: 0.5; }
.brand-mark .mark-cart { stroke: var(--cart); fill: none; stroke-width: 1.7; stroke-dasharray: 1.8 2; stroke-linecap: round; }
.brand-mark .mark-polar { stroke: var(--polar); fill: none; stroke-width: 2.4; stroke-linecap: round; }
.brand-mark .mark-dot { fill: var(--text); stroke: none; }
```

2. `.site-title-text`: keep `font-family: var(--font-display)`, `font-weight: 600` and the existing `font-size: clamp(1rem, 0.9rem + 0.9vw, 1.3rem)` (do not enlarge it on phones: measured at 390 px the title fills its box exactly with a 2.25 rem mark, and at 360 px and below it already ends in an ellipsis, which is unchanged); add `@media (min-width: 56.25rem) { .site-title-text { font-size: 1.4rem; } }`.
3. `.nav-part-title`: add `flex-wrap: wrap;` (the longer part V note `Lab, 4D, rehearsal, problems` drops to its own right-aligned line in the 17.5 rem sidebar instead of squeezing the name).
4. The thread badge marks (replace the existing `.thread-badge::before` rule and the two `[data-thread="T2"|"T3"]::before` rules; the T3 rule **must keep** `transform: rotate(45deg) scale(0.78)`, a unit test pins it):

```css
.thread-badge { --needle: 26deg; }
.thread-badge::before {
  content: ""; box-sizing: border-box; flex: none; width: 1rem; height: 1rem;
  border: 2px solid var(--tone, var(--text-muted)); border-radius: 50%;
  /* a bearing needle: a thin wedge from the centre, cut out of the filled mark in the badge's own surface colour */
  background:
    conic-gradient(from var(--from, 77deg), var(--surface) 0, var(--surface) var(--needle), transparent var(--needle), transparent 360deg),
    var(--tone, var(--text-muted));
}
.thread-badge[data-thread="T1"]::before { --from: 77deg; }                       /* bearing 0 degrees: along the real axis */
.thread-badge[data-thread="T2"]::before {
  --from: 17deg;                                                                 /* bearing 60 degrees */
  border-style: dashed;
  background: conic-gradient(from var(--from), var(--tone, var(--text-muted)) 0, var(--tone, var(--text-muted)) var(--needle), transparent var(--needle), transparent 360deg);
}
.thread-badge[data-thread="T3"]::before {
  --from: 272deg;                                                                /* bearing 120 degrees, less the 45 degrees the diamond is turned */
  border-radius: 1px; transform: rotate(45deg) scale(0.78);
}
```

(The menu's `.thread-dot` rules are untouched; the footer colour key still describes the menu marks, and its nine entries stay nine.)

**css/components.css: appended sections**

Section 5, the Walk bar (the exact rules, prototyped and screenshot-checked):

```css
/* ============================================================
   5. The Walk bar (js/core/walk.js)
   ============================================================ */
.walk-bar { position: fixed; right: 0; bottom: 0; left: 0; z-index: 20; }       /* above the page, below the phone drawer (25) and the header (30) */
.walk-bar p { margin: 0; }
.walk-bar[data-walk="off"] { left: auto; right: var(--gutter); bottom: var(--gutter); max-width: calc(100vw - 2 * var(--gutter)); }
.walk-start { padding: 0 1.2rem; border-radius: 999px; box-shadow: var(--shadow); }
.walk-bar[data-walk="on"] { background: var(--surface); border-top: 3px solid var(--tone, var(--accent)); box-shadow: 0 -2px 8px var(--border); }
@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  .walk-bar[data-walk="on"] { box-shadow: 0 -4px 14px color-mix(in srgb, var(--text) 16%, transparent); }
}
.walk-panel { display: grid; gap: var(--space-1); max-width: var(--content-max); margin: 0 auto;
  padding: var(--space-1) var(--gutter) calc(var(--space-1) + env(safe-area-inset-bottom, 0px)); }
.walk-head { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.walk-label { flex: 1 1 auto; min-width: 0; font-family: var(--font-display); font-size: 1rem; font-weight: 600; line-height: 1.25;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.walk-step { flex: none; min-height: var(--tap); padding: 0 var(--space-3); }
.walk-fold { flex: none; width: var(--tap); min-height: var(--tap); padding: 0; }
.walk-fold::before { content: ""; width: 0.55rem; height: 0.55rem; border-right: 2px solid currentcolor; border-bottom: 2px solid currentcolor; transform: translateY(-2px) rotate(45deg); }
.walk-fold[aria-expanded="false"]::before { transform: translateY(2px) rotate(-135deg); }
.walk-away { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); }
.walk-away .btn { min-height: 2.5rem; }
.walk-offpath { color: var(--text-muted); font-size: 0.9rem; }
.walk-status { color: var(--ok); font-weight: 700; font-size: 0.92rem; }
.walk-status:not(:empty)::before { content: "\2713\00a0"; }
.walk-note { color: var(--text-muted); font-size: 0.88rem; }
.walk-body { display: grid; gap: var(--space-1) var(--space-4); grid-template-columns: minmax(0, 1fr);
  max-height: 32vh; max-height: 32dvh; overflow-y: auto; overscroll-behavior: contain; }
.walk-text { display: grid; gap: var(--space-1); min-width: 0; }
.walk-line { display: flex; gap: var(--space-2); align-items: baseline; min-width: 0; font-size: 0.95rem; line-height: 1.4; }
.walk-tag { flex: none; }
.walk-line-text { flex: 1 1 auto; min-width: 0; }
.walk-line-say .walk-line-text { font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; line-height: 1.35; }
.walk-listen { flex: none; align-self: center; margin-left: auto; }
.walk-listen:empty { display: none; }
.walk-bar .listen { min-height: 2.25rem; padding: 0 var(--space-2); }
.walk-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.walk-tools .btn { min-height: 2.5rem; padding: 0 var(--space-3); }
.walk-tools .btn-quiet { padding: 0 var(--space-2); }
.walk-done { border-color: var(--ok); }
.walk-progress-row { display: flex; align-items: center; gap: var(--space-3); }
.walk-progress { display: flex; flex: 1 1 auto; min-width: 0; max-width: 36rem; margin: 0; padding: 0; list-style: none; }
.walk-dot { flex: 1 1 0; min-width: 0; max-width: 1.6rem; }
.walk-dot a { position: relative; display: flex; align-items: center; justify-content: center; height: 1.5rem; text-decoration: none; }
.walk-dot a::before { content: ""; box-sizing: border-box; width: 0.62rem; height: 0.62rem; border: 2px solid var(--border-strong); border-radius: 50%; background: transparent; }
.walk-dot[data-done="true"] a::before { border-color: var(--ok); background: var(--ok); }
.walk-dot[aria-current="step"] a::before { width: 0.85rem; height: 0.85rem; border-width: 3px; border-color: var(--text); }
.walk-dot[data-shown="true"] a::after { content: ""; position: absolute; left: 25%; right: 25%; bottom: 1px; height: 2px; border-radius: 1px; background: var(--text); }
.walk-dot a:focus-visible { outline-offset: -2px; }
.walk-count { flex: none; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.85rem; }
@media (max-width: 56.24rem) { .walk-count { display: none; } }
@media (min-width: 56.25rem) {
  .walk-bar[data-walk="on"] { left: var(--sidebar-w); }
  .walk-panel { padding-left: var(--space-4); padding-right: var(--space-4); }
  .walk-body { grid-template-columns: minmax(0, 1fr) auto; align-items: start; }
  .walk-tools { justify-content: flex-end; }
}

/* clearance: the page never ends under the bar */
body[data-walk="on"] #view { padding-bottom: calc(var(--space-3) + var(--walk-h)); }
body[data-walk="on"] .site-footer { margin-top: calc(var(--walk-h) * -1); padding-bottom: calc(var(--space-4) + var(--walk-h)); }
body[data-walk="off"] .site-footer { padding-bottom: calc(var(--space-4) + 3.75rem); }      /* the pill: 2.75 rem + the gutter */

/* motion: every transition and animation of the bar is inside this query (nothing moves under reduced motion) */
@media (prefers-reduced-motion: no-preference) {
  .walk-bar[data-walk="on"] .walk-panel { animation: walk-in 0.18s ease-out; }
  .walk-dot a::before { transition: background-color 0.12s, border-color 0.12s, width 0.12s, height 0.12s; }
  .walk-dot[data-just="true"] a::before { animation: walk-pop 0.28s ease-out; }
  @keyframes walk-in { from { opacity: 0; transform: translateY(0.5rem); } }
  @keyframes walk-pop { 50% { transform: scale(1.5); } }
}
```

How the clearance works (D5): `#view` ends `--walk-h` + 1 rem below the content; the footer is then pulled up by `--walk-h` into that blank
space, so the footer starts 1 rem below the content, and its own bottom padding (`--walk-h` + 1.5 rem) keeps its last line above the bar when the
page is scrolled to the end. The page ends in one bar-height of blank, not two. (Checked in the prototype at 1280 and 390 px: footer top 16 px
below the plane's bottom, the bar's top below the footer's text.) `#view`'s padding is `var(--space-3) + var(--walk-h)`, which is at least
the bar's height as A2 asserts.

Section 6, media (the block `i2-media-core.md` section 9 asks for, verbatim):

```css
/* media: video panel and Listen control (js/core/listen.js) */
.video-panel video { display: block; width: 100%; aspect-ratio: 16 / 9; border-radius: var(--radius-sm); background: var(--surface-2); }
.video-panel .video-error { margin: var(--space-2) 0 0; }
.listen[aria-pressed="true"] { border-color: var(--accent); }
@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  .listen[aria-pressed="true"] { background: color-mix(in srgb, var(--accent) 16%, var(--surface)); }
}
.listen[data-state="error"] { border-color: var(--danger); }
.listen-caption { margin: var(--space-2) 0 0; font-size: 0.95rem; }
.listen-error { margin: var(--space-2) 0 0; color: var(--danger); font-size: 0.95rem; }
```

Section 7, identity: the polar-grid backdrop of the Story Map panel (CSS only; `home.js` keeps its ids):

```css
/* the polar grid behind the home map: rings every 4.5 rem and a ray every 30 degrees, faint, under the strands */
#home-map-panel { position: relative; isolation: isolate; --ring: 4.5rem; --grid-ink: var(--border); }
@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  #home-map-panel { --grid-ink: color-mix(in srgb, var(--text-muted) 22%, transparent); }
}
#home-map-panel::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit;
  background-image:
    repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent calc(var(--ring) - 1px), var(--grid-ink) calc(var(--ring) - 1px), var(--grid-ink) var(--ring)),
    linear-gradient(0deg,   transparent calc(50% - 0.5px), var(--grid-ink) calc(50% - 0.5px), var(--grid-ink) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(30deg,  transparent calc(50% - 0.5px), var(--grid-ink) calc(50% - 0.5px), var(--grid-ink) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(60deg,  transparent calc(50% - 0.5px), var(--grid-ink) calc(50% - 0.5px), var(--grid-ink) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(90deg,  transparent calc(50% - 0.5px), var(--grid-ink) calc(50% - 0.5px), var(--grid-ink) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(120deg, transparent calc(50% - 0.5px), var(--grid-ink) calc(50% - 0.5px), var(--grid-ink) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(150deg, transparent calc(50% - 0.5px), var(--grid-ink) calc(50% - 0.5px), var(--grid-ink) calc(50% + 0.5px), transparent calc(50% + 0.5px));
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, var(--text) 0, var(--text) 40%, transparent 85%);
          mask-image: radial-gradient(ellipse at 50% 50%, var(--text) 0, var(--text) 40%, transparent 85%);
}
```

Why six linear gradients and not one conic one: a `repeating-conic-gradient` ray is a wedge of fixed angle, so it is sub-pixel thin near the centre and the
horizontal ray broke into dashes in the prototype. Six one-pixel stripes through the box centre, at 0, 30, 60, 90, 120 and 150 degrees, are twelve
uniform rays. The mask only fades the grid toward the panel's edge (the colour in a mask is read as alpha, so `var(--text)` is not a colour choice).

### 3.3 The chart identity, piece by piece

**Header mark** (`index.html`; replaces the inline SVG inside `a#site-title`; 32 x 32 viewBox, rendered 2 rem on phones and 2.25 rem from 56.25 rem up). It is the subject's own object: a polar
grid (two rings, twelve rays), and on it one point with both addresses: the Cartesian drop lines dashed in `--cart`, the polar ray and arc in `--polar`,
the dot in `--text`.

```html
<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round">
  <g class="mark-grid">
    <circle cx="16" cy="16" r="7"/>
    <circle cx="16" cy="16" r="13.5"/>
    <path d="M2.5 16H29.5M27.69 9.25L4.31 22.75M22.75 4.31L9.25 27.69M16 2.5V29.5M9.25 4.31L22.75 27.69M4.31 9.25L27.69 22.75"/>
  </g>
  <path class="mark-cart" d="M24.43 8.93V16M24.43 8.93H16"/>
  <path class="mark-polar" d="M16 16L24.43 8.93"/>
  <path class="mark-polar" d="M22 16A6 6 0 0 0 20.6 12.14"/>
  <circle class="mark-dot" cx="24.43" cy="8.93" r="2.7"/>
</svg>
```

Geometry (section 6.1): centre (16, 16); rings r = 7 and 13.5; the twelve rays are six diameters at 0, 30, 60, 90, 120, 150 degrees of radius 13.5; the point
is at radius 11 and angle 40 degrees, (16 + 11 cos 40, 16 - 11 sin 40) = (24.43, 8.93); the arc has radius 6 from (22, 16) to (16 + 6 cos 40, 16 - 6 sin 40) =
(20.60, 12.14), counterclockwise (`sweep-flag 0`). Every stroke is `currentColor` (the root sets `stroke="currentColor"`; the grid inherits it from
`.brand-mark { color: var(--text-muted) }`), the accents take tokens by class, the dot fills with `--text`. The `<link rel="icon">` data URI is left as it is.

**Site title.** `One Point, Two Addresses` stays in `var(--font-display)` (a serif stack with local fallbacks: Iowan Old Style, Palatino, Georgia, Times), set a little larger on desktop (1.4 rem). It is visibly a different face from the body's `system-ui`.

**Home map backdrop.** The grid of section 3.2 behind `#home-map-panel`: rings every 4.5 rem, a ray every 30 degrees, centred, faded to nothing toward the edge;
`--grid-ink` is the muted text colour at 22 % (light: 1.39 : 1 against the surface, dark: 1.56 : 1, so it is visible and faint); text over a grid line keeps
at least 4.95 : 1 (muted text on the line in light) and 5.00 : 1 (dark), above the 4.5 : 1 floor.

**Thread bearings.** Each badge's mark is a small dial with a needle: T1 at bearing 0 degrees (along the real axis, the Cartesian x direction), T2 at 60, T3 at 120,
so three different directions, and the old shape code stays (filled disc, dashed ring, diamond), so hue and shape and needle all differ. Conic angles run clockwise from
the top, so a bearing of b degrees counterclockwise from east is the conic angle 90 - b; the needle is `--needle` (26 degrees) wide centred on it, so `--from` = 90 - b - 13:
77 (T1), 17 (T2), and for T3 (90 - 120 = -30, i.e. 330; 330 - 13 = 317; less the diamond's 45 degree turn) 272.

---

## 4. Module API

### 4.1 `js/core/walk.js` (imports `./listen.js` only)

```js
import { listenControl } from './listen.js';

export const WALK_KEYS = Object.freeze({ on: 'walk.on', stop: 'walk.stop', done: 'walk.done' });
export function walkStops(stations)
export function stopFor(stations, stationId)
export function evaluateCheck(check, snapshot)
export function validateCheck(check)
export function emptySnapshot()
export function stopLabel(stop, total = 22)
export function createWalk(ctx)
```

These are the exact signatures of ARCHITECTURE 11.5 (D7: no others). Nothing runs at import: no DOM access, timer, listener or fetch, so the pure functions
import in Node.

**Stop** (what `walkStops` returns; index = position in `order`):
`{ index: number, station: string, title: string, route: string, do: string, say: string, problem: string | null, check: Check }`. The array is fresh; `check` is the registry's
own object (never mutated).

**Check** (plain data, in the registry; the vocabulary of 11.5, made exact here):

```
{ kind: 'event',  event: 'click' | 'input' | 'change' | 'pointerup', ids?: string[], idPrefix?: string, atLeast?: integer >= 1 }
{ kind: 'handle', ids: string[], quadrants?: 1 | 2 | 3 | 4 }
{ kind: 'hook',   hook: string, path: string, op: '>=' | '<=' | '==' | '!=' | 'abs>=' | 'increase' | 'change', value?: number | string | boolean }
{ kind: 'text',   id: string, includes: string }
{ kind: 'all',    of: Check[] }      { kind: 'any', of: Check[] }
```

**Snapshot** (what the checker builds and `evaluateCheck` reads; every field optional for `evaluateCheck`, which treats a missing one as empty):

```
{ events:  string[],                                  // 'click:roots-pick-1', 'input:powers-n': '<event>:<id>', each once
  handles: { [id]: { moved: boolean, quadrants: number } },
  hooks:   { [hook + '.' + path]: { now: any, first: any } },
  texts:   { [id]: string } }
```

**Walk** (returned by `createWalk`):

```
{ attach(section, stationEntry, ctx),   // after every successful mount: the page is this station; starts the checker for its stop when the Walk is on
  detach(),                             // before every unmount: stops the checker; the bar stays
  start(),                              // on, current = 0, open it
  resume(),                             // on, open the saved current stop
  leave(),                              // off; ticks and position kept
  next(), back(),                       // goTo(shown + 1), goTo(shown - 1)
  goTo(index),                          // on, current = clamp(trunc(index)), open it; false for a non-finite index, else true
  markDone(stationId = shown stop's station),   // true if it newly ticked; false for an unknown station or one already ticked
  state(),                              // { on, stop, done: string[] in stop order, here, ticked, shown }
  destroy() }
```

`createWalk(ctx)` takes `{ stations: StationEntry[], store: Store, navigate(token) }`; it throws `TypeError` when `stations` is not an array, the store has no `get`/`set`, `navigate`
is not a function, or there is no `document`. It builds `#walk-bar` once (2.3), reads the store (5.4), and installs `window.__mv.walk`.

**Test hook** `window.__mv.walk = { state, start, resume, leave, next, back, goTo, markDone, snapshot, check }` (`window.__mv = window.__mv || {}` first, as every module does):
`snapshot()` is a deep copy of the running checker's snapshot after a fresh sample (`emptySnapshot()` when no checker runs); `check()` is `evaluateCheck(shown stop's check, fresh snapshot)`
(false when no checker runs). `destroy()` deletes it if it is still this object. The home station may call `start()` or `resume()` from its own button and read `state()`
for its progress line (the other goal's business; the hook exists before any station mounts).

### 4.2 Store keys (all through the `store` passed in)

| Key | Value | Written when |
|---|---|---|
| `walk.on` | boolean | Start, Resume, goTo, Leave |
| `walk.stop` | integer 0..21, the **current** stop | Start, Resume, goTo (so Next, Back, a dot) |
| `walk.done` | `{ [stationId]: true }` | a tick |
| `walk.min` | boolean (D9) | the fold toggle |

Reading never writes (rule 10.1.9). A value that fails its check (2.5) is ignored, not repaired.

### 4.3 `js/app.js` (edits; the exports and the pinned structure are unchanged)

- Imports: add `import { createWalk } from './core/walk.js';` and `import { loadManifest } from './core/listen.js';`. After the edit the import specifiers sorted are
  `./core/ids.js, ./core/listen.js, ./core/store.js, ./core/theme.js, ./core/walk.js, ./registry.js` (the unit test of the import list changes to exactly these).
- No `import('...')` string literal may be added (a test forbids it; `walk.js` reaches `listen.js` statically).
- `window.__mv.app` and `ctx` (frozen, eight keys) are unchanged.
- Details in 5.11.

### 4.4 `index.html` and CSS

`index.html`: the brand-mark SVG of 3.3, nothing else new (no `<link>`, `<script>` or font; the nine-entry colour key is untouched). CSS: 3.2.

### 4.5 Lifecycle

| Moment | What happens |
|---|---|
| `start()` (once) | `createWalk` builds the bar, sets `body.dataset.walk`, installs the observer and the hook; if the Walk was on, the bar shows the current stop at once (pending state, 5.7). |
| each navigation | the router's `teardown()` calls `walk.detach()` (checker stopped), then the station unmounts; after a successful mount the router calls `walk.attach(section, st, ctx)`. |
| the station unmounts | nothing to clean: the checker's listeners are on the station's own `section`, which the router discards; `detach` also removes them explicitly. |
| `stop()` (tests) | `walk.destroy()`: removes the bar, the observer, timers, Listen, the hook, `body.dataset.walk`, `--walk-h`. |

---

## 5. Algorithms

Constants: `POLL_MS = 250`, `SETTLE_MS = 220`, `PENDING_MS = 5000`, `JUST_MS = 700`, `RO_FALLBACK = window resize`. `N = stops.length` (22 on the real registry; the code
must not hard-code 22 except as the `stopLabel` default).

### 5.1 Private helpers

```
isObj(x)        = x !== null && typeof x === 'object' && !Array.isArray(x)
clampStop(i)    = Math.min(N - 1, Math.max(0, Math.trunc(i)))
problemHref(p)  = '#problem-' + p.replace(/\./g, '-')                   // '1.3.1' -> '#problem-1-3-1'; 'P3' -> '#problem-P3'
routeHref(r)    = '#' + r
sameRoute(hash, route) = (hash.replace(/^#/, '').toLowerCase() || 'home') === route.toLowerCase()
quadrantOf(re, im) = re > 0 && im >= 0 ? 0 : re <= 0 && im > 0 ? 1 : re < 0 && im <= 0 ? 2 : re >= 0 && im < 0 ? 3 : -1        // -1 only at the origin
plain(v)        = undefined/null stay; NaN -> undefined; number, string, boolean stay; anything else -> JSON.stringify(v) in try (undefined on failure)
labelNodes(text)= app.js's titleNodes, copied verbatim with its EXPONENT regex: a '^' after a non-space takes {...}, (...) or one signed digit/letter and becomes <sup class="prose-sup">
```

`labelNodes` is a private copy because `walk.js` may import only `./listen.js`. A unit test (U8) extracts the `const EXPONENT = ...;` line from `app.js` and `walk.js`
and asserts the two are the same text.

### 5.2 Pure stop helpers

```
walkStops(stations):
  if not Array.isArray(stations): return []
  list = stations filtered by: isObj(s) && typeof s.id === 'string' && isObj(s.walk)
           && typeof s.walk.route === 'string' && typeof s.walk.do === 'string' && typeof s.walk.say === 'string' && isObj(s.walk.check)
  sort a copy of list by s.order (ascending, stable)
  return list.map((s, index) => ({ index, station: s.id, title: String(s.title), route: s.walk.route, do: s.walk.do, say: s.walk.say,
                                   problem: typeof s.walk.problem === 'string' && s.walk.problem !== '' ? s.walk.problem : null, check: s.walk.check }))

stopFor(stations, id):  return walkStops(stations).find(s => s.station === id) || null

stopLabel(stop, total = 22):  return 'Stop ' + (stop.index + 1) + ' of ' + total + ' · ' + stop.title       // U+00B7

emptySnapshot():  return { events: [], handles: {}, hooks: {}, texts: {} }                                   // a new object each call
```

### 5.3 `validateCheck` and `evaluateCheck` (pure)

```
validateCheck(check, depth = 0):                      // returns null when well formed, else a one-line reason
  if depth > 4: return 'checks are nested too deeply'
  if not isObj(check): return 'a check must be an object'
  switch check.kind:
    'event':
      if not in ['click','input','change','pointerup'] (check.event): return 'event: "event" must be click, input, change or pointerup'
      hasIds = Array.isArray(check.ids) && check.ids.length > 0 && check.ids.every(nonEmptyString)
      hasPre = nonEmptyString(check.idPrefix)
      if check.ids !== undefined && !hasIds: return 'event: "ids" must be a non-empty array of ids'
      if check.idPrefix !== undefined && !hasPre: return 'event: "idPrefix" must be a non-empty string'
      if !hasIds && !hasPre: return 'event: give "ids" or "idPrefix"'
      if check.atLeast !== undefined:
        if !Number.isInteger(check.atLeast) || check.atLeast < 1: return 'event: "atLeast" must be an integer of 1 or more'
        if !hasPre && check.atLeast > check.ids.length: return 'event: "atLeast" is larger than the number of ids'
      return null
    'handle':
      if not a non-empty array of non-empty strings (check.ids): return 'handle: "ids" must be a non-empty array of ids'
      if check.quadrants !== undefined && !(Number.isInteger(check.quadrants) && 1 <= check.quadrants <= 4): return 'handle: "quadrants" must be 1, 2, 3 or 4'
      return null
    'hook':
      if !/^[A-Za-z][\w-]*$/.test(check.hook): return 'hook: "hook" must be a name under window.__mv'
      if !/^[A-Za-z_$][\w$]*(\(\))?(\.[A-Za-z_$][\w$]*(\(\))?)*$/.test(check.path): return 'hook: "path" must be names and empty calls joined by dots, like state().laps'
      if check.op not in ['>=','<=','==','!=','abs>=','increase','change']: return 'hook: unknown "op"'
      if check.value !== undefined && not (number | string | boolean): return 'hook: "value" must be a number, string or boolean'
      if check.op in ['==','!=','<='] && check.value === undefined: return 'hook: this "op" needs a "value"'
      return null
    'text':
      if !nonEmptyString(check.id): return 'text: "id" must be an element id'
      if !nonEmptyString(check.includes): return 'text: "includes" must be a non-empty string'
      return null
    'all' | 'any':
      if !Array.isArray(check.of) || check.of.length === 0: return kind + ': "of" must be a non-empty array of checks'
      for m of check.of: r = validateCheck(m, depth + 1); if r !== null: return r
      return null
    default: return 'unknown kind "' + String(check.kind) + '"'

evaluateCheck(check, snapshot):
  if validateCheck(check) !== null: return false                      // an invalid check never passes
  s = normalise(snapshot)    // events: array of strings else []; handles, hooks, texts: plain objects else {}
  return ev(check, s)

ev(c, s):
  'event':  need = c.atLeast ?? 1; seen = new Set()
            for e of s.events: i = e.indexOf(':'); if i < 1: continue
                               type = e.slice(0, i); id = e.slice(i + 1)
                               if type !== c.event: continue
                               if (c.ids && c.ids.includes(id)) || (c.idPrefix && id.startsWith(c.idPrefix)): seen.add(id)
            return seen.size >= need
  'handle': return c.ids.some(id => { h = s.handles[id]; return isObj(h) && h.moved === true && (c.quadrants === undefined || Number(h.quadrants) >= c.quadrants) })
  'hook':   e = s.hooks[c.hook + '.' + c.path]; if !isObj(e): return false
            v = c.value === undefined ? 1 : c.value                      // the default is only reachable for '>=' and 'abs>='
            switch c.op:
              '>=':     return typeof e.now === 'number' && e.now >= v
              'abs>=':  return typeof e.now === 'number' && Math.abs(e.now) >= v
              '<=':     return typeof e.now === 'number' && e.now <= v
              '==':     return e.now !== undefined && e.now === v
              '!=':     return e.now !== undefined && e.now !== v
              'increase': return typeof e.now === 'number' && typeof e.first === 'number' && e.now > e.first
              'change':   return e.first !== undefined && e.now !== undefined && e.now !== e.first
  'text':   t = s.texts[c.id]; return typeof t === 'string' && t.includes(c.includes)
  'all':    return c.of.every(m => ev(m, s))
  'any':    return c.of.some(m => ev(m, s))
  default:  return false
```

Note the A1 case `{ kind: 'hook', hook: 'staircase', path: 'state().laps', op: 'abs>=' }` with `now: -1`: `value` is undefined, so the default `1` applies and `|-1| >= 1` is true.

### 5.4 `createWalk(ctx)`: build, read, wire

1. Validate `ctx` (TypeError as in 4.1). `stops = walkStops(ctx.stations)`; `N = stops.length`; `entry = Map(stationId -> StationEntry)` from `ctx.stations` (for the thread tone).
2. Read the store (4.2) into `on`, `current`, `done`, `min`:
   - `on = store.get('walk.on', false) === true`
   - `v = store.get('walk.stop', 0)`; `current = Number.isInteger(v) && v >= 0 && v < N ? v : 0`
   - `d = store.get('walk.done', {})`; `done = isObj(d) ? keep the keys of d that equal some stop's station id and whose value === true : {}`
   - `min = store.get('walk.min', false) === true`
3. Build the DOM of 2.3 with `document.createElement` (no `innerHTML`): the bar, pill, panel, head, away row, status, note, body, tools, progress with N `li.walk-dot` each holding `a#walk-dot-<k>` (`href = routeHref(stops[k].route)`, `data-stop = k`, `aria-label` set by `render`), and the count. `bar.hidden` is never used (the bar is always present). Append the bar as the last child of `document.body`; set `document.body.dataset.walk = on ? 'on' : 'off'`.
4. State not stored: `page = null` (`{ section, stationId, index, route }` while a station is attached), `pendingTo = null`, `status = ''`, `saveFailed = false`, `checker = null`, `listen = null`, `listenFor = ''`, `listenSeq = 0`, `settleTimer = 0`, `pendingTimer = 0`, `lastH = -1`, `roving = current`, `destroyed = false`.
5. If `on`: `pendingTo = current; armPending()` (the bar shows the current stop at once; the first `attach` clears it).
6. Listeners on the bar (all removed in `destroy`): click on `#walk-start`, `#walk-back`, `#walk-next`, `#walk-fold`, `#walk-done`, `#walk-leave`; on `#walk-progress`: `click`, `keydown`, `focusin` (5.10).
7. `ResizeObserver` on the bar calling `measure()` through one pending `requestAnimationFrame` (coalesced); when `ResizeObserver` is not a function, `window.addEventListener('resize', schedule measure)` instead.
8. `window.__mv.walk = hook` (4.1). `render()`. Return the Walk object.

### 5.5 The view model and `render()`

```
shownIndex():  if pendingTo !== null: return pendingTo
               if page !== null && page.index !== null: return page.index
               return current
isHere():      if pendingTo !== null: return pendingTo === current
               return page !== null && page.index === current
resumable():   return current > 0 || Object.keys(done).length > 0
doneCount():   return Object.keys(done).length

render():                                     // idempotent; writes only what changed
  if destroyed: return
  shown = shownIndex(); here = isHere(); st = stops[shown]; cur = stops[current]
  bar.dataset.walk = body.dataset.walk = on ? 'on' : 'off'
  startBtn.hidden = on;  panel.hidden = !on
  startBtn.textContent = resumable() ? 'Resume the Walk: stop ' + (current + 1) + ' of ' + N : 'Start the Walk'
  if not on: measure(); return
  bar.dataset.stop = current; bar.dataset.shown = shown; bar.dataset.here = String(here)
  bar.dataset.done = String(done[st.station] === true); bar.dataset.min = String(min)
  bar.dataset.thread = (entry.get(st.station)?.threads?.[0]) || ''           // an empty value matches no [data-thread] rule, so the top rule falls back to --accent
  setLabel(labelEl, st)                                                       // textContent diff via dataset.text; labelNodes; title = plain text
  setText(doEl, st.do);  setText(sayEl, '“' + st.say + '”')
  problemChip.hidden = st.problem === null; if st.problem: href = problemHref(st.problem), text = st.problem, aria-label = 'Problem ' + st.problem
  backBtn.disabled = shown <= 0;  nextBtn.disabled = shown >= N - 1;  nextBtn.title = nextBtn.disabled ? 'That is the last stop.' : ''
  away.hidden = here
  if not here: offpath.textContent = (page !== null && page.index !== null ? '' : 'This page is not one of the stops. ') + 'The Walk is at stop ' + (current + 1) + ' of ' + N + ': ' + cur.title + '.'
               gotoLink.href = routeHref(cur.route); gotoLink.textContent = 'Go to stop ' + (current + 1) + ': ' + cur.title
  canMark = pendingTo !== null || (page !== null && page.index !== null)        // not on an error panel or a page that is not a stop
  doneBtn.hidden = done[st.station] === true || !canMark
  setText(statusEl, status);  note.hidden = !saveFailed
  foldBtn.setAttribute('aria-expanded', String(!min)); aria-label = min ? 'Show the steps' : 'Hide the steps'; body.hidden = min
  for k in 0..N-1:
    li = dots[k]; li.dataset.done = String(done[stops[k].station] === true)
    li.dataset.shown = k === shown ? 'true' : 'false'
    if k === current: li.setAttribute('aria-current', 'step') else li.removeAttribute('aria-current')
    a = li.firstChild; a.setAttribute('aria-label', 'Stop ' + (k + 1) + ': ' + stops[k].title + (done[...] ? ' (done)' : ''))
    a.tabIndex = k === roving ? 0 : -1
  progress.setAttribute('aria-label', 'Progress: ' + doneCount() + ' of ' + N + ' stops done');  countEl.textContent = doneCount() + ' of ' + N + ' done'
  syncListen(st.station)                                                      // 5.9
  measure()                                                                   // 5.8
```

`roving` is the index of the dot that holds `tabindex="0"`: `current` until the student moves focus inside the strip (5.10).

### 5.6 State transitions

```
persist(key, value):  ok = store.set(key, value); if ok === false: saveFailed = true       // blocked or full storage

open(index, { keepStatus = false }):          // make `index` the current stop and bring the page to it
  current = index; roving = index; persist('walk.stop', index)
  if not keepStatus: status = ''
  stop = stops[index]
  if page !== null && page.index === index && sameRoute(location.hash, stop.route):    // already there: no remount, so the station keeps its state
      pendingTo = null; clearPending(); render(); activate(); return
  pendingTo = index; armPending(); render()
  ctx.navigate(stop.route)                    // the router detaches the old page, mounts the new one and calls attach

start():   on = true; persist('walk.on', true); open(0); return true
resume():  on = true; persist('walk.on', true); open(current); return true
goTo(i):   if not Number.isFinite(i): return false
           on = true; persist('walk.on', true); open(clampStop(i)); return true
next():    if not on: return false;  return goTo(shownIndex() + 1)      // the button is disabled at the end; the method clamps
back():    if not on: return false;  return goTo(shownIndex() - 1)
leave():   on = false; persist('walk.on', false); stopChecker(); status = ''; pendingTo = null; clearPending()
           hadFocus = panel.contains(document.activeElement); render(); if hadFocus: startBtn.focus({ preventScroll: true })

markDone(stationId):
  id = stationId ?? stops[shownIndex()].station
  idx = stops.findIndex(s => s.station === id)
  if idx < 0 || done[id] === true: return false
  done = Object.assign({}, done, { [id]: true }); persist('walk.done', done)
  status = tickMessage(idx); mark dot idx data-just = 'true' and clear it after JUST_MS (a direct attribute write; the dot exists)
  if page !== null && page.index === idx: stopChecker()
  hadFocus = document.activeElement === doneBtn; render(); if hadFocus: nextBtn.focus({ preventScroll: true })
  return true

toggleFold():  min = !min; persist('walk.min', min); render()

tickMessage(idx):
  n = idx + 1; c = current
  text = idx > c ? 'Done: stop ' + n + ' ticked, ahead of the Walk (it is at stop ' + (c + 1) + ').'
       : idx < c ? 'Done: stop ' + n + ' ticked (an earlier stop).'
       :           'Done: stop ' + n + ' ticked.'
  if doneCount() === N: text += ' That is all ' + N + ' stops: the whole path is walked.'
  return text
```

The Walk's own navigations (`open`) set `pendingTo` so the bar never flashes the off-path state while the next page loads (5.7). When the target is the page already on screen, nothing is navigated or remounted (so pressing Resume on the staircase page mid-drag does not reset the staircase).

### 5.7 `attach`, `detach`, the pending state

```
attach(section, stationEntry, routeCtx):
  clearTimeout(settleTimer); pendingTo = null; clearPending()
  idx = stops.findIndex(s => s.station === stationEntry.id)                    // -1 for a station with no stop
  page = { section, stationId: stationEntry.id, index: idx >= 0 ? idx : null }
  status = (idx >= 0 && done[stationEntry.id] === true) ? 'Done: stop ' + (idx + 1) + ' is already ticked.' : ''
  render(); activate()

detach():
  stopChecker(); page = null
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => { settleTimer = 0; if pendingTo === null: render() }, SETTLE_MS)
  // a page that attaches within 220 ms (the normal case) renders itself; a route with no attach (error panel, no such place) settles to the away state

armPending():  clearTimeout(pendingTimer); pendingTimer = setTimeout(() => { pendingTimer = 0; pendingTo = null; render() }, PENDING_MS)
clearPending(): clearTimeout(pendingTimer); pendingTimer = 0

activate():                                   // start the checker for the page's own stop, when there is something to check
  if not on or page === null or page.index === null: return
  st = stops[page.index]
  if done[st.station] === true: return                                          // nothing left to check
  startChecker(page, st)
```

`activate` checks the **page's** stop, not the current one (D1, A3): doing a later stop early counts.

### 5.8 The checker

```
collectNeeds(check):                          // walk the check tree
  { handleIds: Set, hooks: Map(key = hook + '.' + path -> { hook, path }), textIds: Set }
  'handle' adds its ids; 'hook' adds one entry; 'text' adds its id; 'all' and 'any' recurse; 'event' adds nothing (events are always captured)

startChecker(pg, stop):
  stopChecker()
  run = { pg, stop, needs: collectNeeds(stop.check), events: new Set(), base: {}, moved: {}, quads: {}, snap: emptySnapshot(),
          armed: false, raf: 0, timer: 0, off: [] }
  for type of ['click', 'input', 'change', 'pointerup']:
    fn = (e) => { id = nearestId(e.target, pg.section); if id !== '': run.events.add(type + ':' + id); schedule(run) }
    pg.section.addEventListener(type, fn, { capture: true, passive: true }); run.off.push(remove)
  for type of ['pointermove', 'keydown', 'keyup']:
    pg.section.addEventListener(type, () => schedule(run), { passive: true })       // bubble phase: the target's own handler has already moved the handle
  run.timer = setInterval(() => step(run), POLL_MS)
  checker = run
  step(run)                                   // the first sample is the baseline

stopChecker():  if checker: clearInterval(checker.timer); cancelAnimationFrame(checker.raf); run each remove in checker.off; checker = null

schedule(run):  if run !== checker || run.raf !== 0: return
                run.raf = requestAnimationFrame(() => { run.raf = 0; step(run) })

nearestId(target, section):
  n = target instanceof Element ? target : (target && target.parentElement)
  while n && n !== section: if n.id !== '': return n.id;  n = n.parentElement
  return ''                                   // the section's own id (station-<id>) never counts

step(run):
  if run !== checker || document.hidden: return
  sample(run)
  ok = evaluateCheck(run.stop.check, run.snap)
  if not run.armed: if not ok: run.armed = true;  return          // D6: a check that is true at the very first look must go false before it can tick
  if ok: markDone(run.pg.stationId)                                // stops this checker (the page's stop is now done)

sample(run):
  run.snap.events = Array.from(run.events)
  for id of run.needs.handleIds:
    el = document.getElementById(id); if not el: continue
    re = Number(el.dataset.re); im = Number(el.dataset.im); if not finite: continue
    b = run.base[id] ?? (run.base[id] = { re, im })
    run.moved[id] = run.moved[id] === true || Math.abs(re - b.re) > 1e-6 || Math.abs(im - b.im) > 1e-6
    q = quadrantOf(re, im); if q >= 0: (run.quads[id] ??= new Set()).add(q)
    run.snap.handles[id] = { moved: run.moved[id], quadrants: run.quads[id] ? run.quads[id].size : 0 }
  for { hook, path } of run.needs.hooks.values():
    v = plain(readHook(hook, path))
    e = run.snap.hooks[hook + '.' + path] ??= { now: undefined, first: undefined }
    e.now = v;  if e.first === undefined && v !== undefined: e.first = v
  for id of run.needs.textIds:
    el = document.getElementById(id);  run.snap.texts[id] = el ? el.textContent : ''

readHook(hook, path):
  cur = window.__mv && window.__mv[hook]
  for seg of path.split('.'):
    m = /^([A-Za-z_$][\w$]*)(\(\))?$/.exec(seg); if not m or cur == null or m[1] in ['__proto__', 'constructor', 'prototype']: return undefined
    v = cur[m[1]]
    if m[2]: if typeof v !== 'function': return undefined;  try { v = v.call(cur) } catch { return undefined }
    cur = v
  return cur
```

Why the sampling triggers are what they are: a drag is a stream of `pointermove`s; the plane writes `data-re`/`data-im` synchronously in its own handler, and our bubble-phase listener runs after it, then a single
`requestAnimationFrame` coalesces them to one `step` per frame (the same cadence as the plane's redraw). `dragHandleAround` waits one frame between its 48 moves, so every quadrant of a lap is sampled; a
human drag at 60 Hz samples every frame. The 250 ms poll catches everything that changes without an event (a hook value that a timer changes, a readout text). A tick therefore appears within about one frame
of the last interaction and within 250 ms of a silent change.

### 5.9 The Listen host

```
syncListen(stationId):
  if listenFor === stationId: return
  listenFor = stationId; seq = ++listenSeq
  if listen: listen.destroy(); listen = null
  listenHost.replaceChildren()
  listenControl(listenHost, 'walk', { id: 'walk-listen-btn', segment: stationId })
    .then(l => { if destroyed || seq !== listenSeq: { if l: l.destroy(); return }
                 listen = l })                                    // null: the host stays empty and CSS hides it (:empty)
    .catch(() => {})
```

Called only while the Walk is on, so a student who never starts it never loads the manifest from here (`app.js` prefetches it anyway, D10). The control plays the clip `walk/<station id>`; the single-segment mode has no
transcript. `leave()` keeps the control (hidden with the panel); `destroy()` destroys it.

### 5.10 The progress strip

```
progress click (delegated):
  a = e.target.closest('a.walk-dot-link')   // each dot link has class walk-dot-link
  if not a or e.defaultPrevented or e.button !== 0 or e.metaKey or e.ctrlKey or e.shiftKey or e.altKey: return     // let the browser open it in a new tab
  e.preventDefault(); goTo(Number(a.dataset.stop))

progress keydown (delegated), key in ArrowRight ArrowDown ArrowLeft ArrowUp Home End:
  k = Number(e.target.closest('a')?.dataset.stop); if not finite: return
  k2 = ArrowRight/ArrowDown: min(N-1, k+1);  ArrowLeft/ArrowUp: max(0, k-1);  Home: 0;  End: N-1
  e.preventDefault(); roving = k2; apply tabindex (0 on k2, -1 on the rest); dots[k2].link.focus()

progress focusin: k = the focused link's stop; roving = k; apply tabindex the same way
```

### 5.11 `app.js` integration (the exact edit list)

1. Add the two imports (4.3).
2. In `start()`, right after `const store = createStore('mv:');`:

```js
  let walk = null;                                    // the Walk bar; a failure to build it must not stop the site
  try { walk = createWalk({ stations: STATIONS, store, navigate }); } catch (err) { console.error('[mv] the Walk bar could not be built', err); }
  loadManifest();                                     // fire and forget: one dynamic import that never rejects (D10)
```

   (`navigate` is a function declaration later in `start()`, so it is hoisted.)
3. Two helpers before `teardown()`, each with its own `try`/`catch` so the pinned render `catch` block stays the only `catch (err)` inside `render()`:

```js
  function attachWalk(section, st, ctx) { if (walk) try { walk.attach(section, st, ctx); } catch (err) { console.error(`[mv] the Walk bar failed on "${st.id}"`, err); } }
  function detachWalk() { if (walk) try { walk.detach(); } catch (err) { console.error('[mv] the Walk bar failed to detach', err); } }
  const walkBar = () => document.getElementById('walk-bar');
  const walkHasFocus = () => { const b = walkBar(); return !!b && b.contains(document.activeElement); };
```

4. `teardown()`: call `detachWalk()` after clearing `state.preset` and before `runUnmount`.
5. `setNavOpen`: the inert list becomes `[view, footer, walkBar()]` (the existing `if (node)` guard stays; the test pins `toggleAttribute('inert', open)`).
6. `finish(first, label, keep = false)`: `if (!first && !keep) view.focus({ preventScroll: true });`.
7. `render()`: first line after `const seq = ++state.seq;` add `const keepFocus = walkHasFocus();` (read before `view.replaceChildren()`), pass `keepFocus` as the third argument of all three `finish` calls, and replace the mount lines with:

```js
      const ctx = makeCtx(route, st, preset);
      const unmount = await mod.mount(section, ctx);
      if (seq !== state.seq) { runUnmount(st.id, unmount); return; }
      state.current = { id: st.id, unmount: typeof unmount === 'function' ? unmount : null };
      view.dataset.state = 'ready';
      attachWalk(section, st, ctx);
      finish(first, st.title, keepFocus);
```

8. `stop()`: before `disposeTheme()` add `if (walk) { walk.destroy(); walk = null; }`.

### 5.12 `measure()` (resolution and size management; there is no canvas in this goal)

```
measure():                                    // called after render, from the ResizeObserver, and from the resize fallback
  h = on ? Math.ceil(bar.getBoundingClientRect().height) : 0
  if h === lastH: return
  lastH = h
  if h > 0: document.documentElement.style.setProperty('--walk-h', h + 'px')
  else:     document.documentElement.style.removeProperty('--walk-h')                // back to the theme.css 0px
```

Setting `--walk-h` changes `#view`'s padding and the footer, not the bar's own size, so the observer cannot loop. The value is an integer (rounded up) so the `<=` of A2 has no sub-pixel trap, and
`html`'s `scroll-padding-bottom` adds 1 rem of breathing room above it.

---

## 6. Mathematics

The Walk shell does no mathematics of its own beyond the small geometry in 6.1. Its texts, though, quote numbers and name sixteen review problems, so 6.2 works every one of them in both addresses
and 6.3 pins the numbers the registry's `walk.do` sentences quote. Every value below was recomputed with `js/core/complex.js` and agrees with `js/data/problems.js`.

### 6.1 Formulas the goal uses

1. **Polar to Cartesian** (the mark's point and rays): (x, y) = (cx + r cos t, cy - r sin t), the SVG y axis pointing down. Centre (16, 16).
   - rays, radius 13.5, t = 0, 30, 60, 90, 120, 150, 180 ...: (29.5, 16), (27.69, 9.25), (22.75, 4.31), (16, 2.5), (9.25, 4.31), (4.31, 9.25), (2.5, 16) ... (13.5 cos 30 = 11.691, 13.5 sin 30 = 6.75);
   - the point, r = 11, t = 40 degrees: (16 + 11 cos 40, 16 - 11 sin 40) = (24.4265, 8.9293), written (24.43, 8.93);
   - the arc, r = 6: from (22, 16) at t = 0 to (16 + 6 cos 40, 16 - 6 sin 40) = (20.5963, 12.1433), written (20.6, 12.14).
2. **Conic angles** (needles): conic-gradient angles run clockwise from the top, so a counterclockwise bearing b from east is 90 - b. Needle width w = 26 degrees centred on it: `--from` = 90 - b - 13.
   b = 0 gives 77; b = 60 gives 17; b = 120 gives -30 = 330, minus 13 is 317, and the diamond is turned 45 degrees clockwise, so subtract 45: 272.
3. **Polar grid CSS**: rings of radius k r0, r0 = 4.5 rem (a `repeating-radial-gradient`); rays through the box centre at orientations 0, 30, 60, 90, 120, 150 degrees (a `linear-gradient(g)` stripes lines of orientation g, so six of them give twelve rays).
4. **Dot width**: w = (W - 2 g) / 22 with g = 16 px: 358 / 22 = 16.27 px at W = 390; 288 / 22 = 13.09 px at W = 320; at most 1.6 rem (25.6 px) on desktop.
5. **Quadrants** (the `handle` check): Q0 = {re > 0, im >= 0}, Q1 = {re <= 0, im > 0}, Q2 = {re < 0, im <= 0}, Q3 = {re >= 0, im < 0}; the four half-open quadrants partition the plane minus 0. A lap of radius 1.5 about 0 starting at angle 0 visits Q0 (0 to 90 degrees exclusive of the end), Q1, Q2, Q3: 4.
6. **Clearance**: `#view` padding-bottom = 16 + H px; the footer's margin-top = -H px, its padding-bottom = 24 + H px; `scroll-padding-bottom` = H + 16 px, with H = `ceil(bar height)`. After `scrollIntoView({block: 'end'})` an element's bottom is at (viewport height - H - 16); the bar's top is at (viewport height - H): 16 px apart (verified in Chromium: 628 versus 644 with H = 200, viewport 844).
7. **Contrast** (WCAG relative luminance, (L1 + 0.05) / (L2 + 0.05)), light / dark: text on surface 15.96 / 14.52; muted on surface 6.86 / 7.80; `--ok` on surface 6.12 / 8.86; `--border-strong` on surface 4.14 / 4.33; accent on surface 10.69 / 11.89; on-accent on accent 10.69 / 13.09; the grid line (muted at 22 % over the surface) against the surface 1.39 / 1.56; muted text over that line 4.95 / 5.00; text over that line 11.52 / 9.31.

### 6.2 The sixteen problems the stops point to, in both addresses (hand-checked; these become unit-test expectations)

Notation: z = x + iy = r e^{i theta}, arg z = {Arg z + 2 pi k}, Arg z in (-pi, pi]. "Address" is the one that makes the problem easy (STORY section 3). Decimals are to 6 places.

**1.3.1 (stops 1 and 4; Names: home; C then P).** z = -1 + i sqrt3.
- Cartesian: r = sqrt(x^2 + y^2) = sqrt(1 + 3) = 2; tan theta = y / x = -sqrt3 with x < 0, y > 0 (second quadrant), so Arg z = pi - pi/3 = 2 pi / 3 (120 degrees = 2.094395).
- Polar: z = 2 (cos 2 pi/3 + i sin 2 pi/3) = 2 e^{i 2 pi/3}; check 2 cos(2 pi/3) = -1, 2 sin(2 pi/3) = sqrt3. arg z = {2 pi/3 + 2 pi k}; Arg z = 2 pi/3.
- Walk text: r = 2, theta = 2 pi/3 typed in gives (-1, 1.732051); x = 1, y = 1 gives r = sqrt2 = 1.414214, Arg = pi/4 = 0.785398.

**1.1.1 (stop 2; none; C, with P as the check).** z1 = 3 - 2i, z2 = -1 + 4i.
- Cartesian: z1 z2 = (3)(-1) - (-2)(4) + i[(3)(4) + (-2)(-1)] = (-3 + 8) + i(12 + 2) = 5 + 14i. z1 / z2 = z1 conj(z2) / |z2|^2 = (3 - 2i)(-1 - 4i) / 17 = (-3 - 12i + 2i + 8 i^2) / 17 = (-11 - 10i) / 17 = -11/17 - (10/17) i = -0.647059 - 0.588235i.
- Polar: |z1| = sqrt13 = 3.605551, Arg z1 = -atan(2/3) = -0.588003 (-33.690 degrees); |z2| = sqrt17 = 4.123106, Arg z2 = pi - atan 4 = 1.815775 (104.036 degrees). Product: modulus sqrt13 sqrt17 = sqrt221 = 14.866069, Arg = -0.588003 + 1.815775 = 1.227772 (70.346 degrees); check |5 + 14i| = sqrt(25 + 196) = sqrt221 and atan2(14, 5) = 1.227772. Quotient: modulus sqrt(13/17) = 0.874475, Arg = -0.588003 - 1.815775 = -2.403778 (-137.726 degrees); check |-11/17 - 10i/17| = sqrt221 / 17 = 0.874475 and atan2(-10, -11) = -2.403778.
- Walk text: "z1 turned by Arg z2 and stretched by |z2|": 104.036 degrees and 4.123106.

**1.2.1 (stop 3; none; P-native).** |z - (1 + 2i)| = 3.
- Cartesian: (x - 1)^2 + (y - 2)^2 = 9, centre (1, 2), radius 3.
- Polar (about the centre): z = (1 + 2i) + 3 e^{it}, 0 <= t < 2 pi: every point one stretch of 3 from the centre. t = 0: 4 + 2i; pi/2: 1 + 5i; pi: -2 + 2i; 3 pi/2: 1 - i. The origin is not on it (|0 - (1 + 2i)| = sqrt5 = 2.236068 < 3, it is inside).

**1.3.2 (stop 5; any, report the home step; C to P to C).** (sqrt3 + i)^10.
- Polar: r = sqrt(3 + 1) = 2, Arg = pi/6. z^10 = 2^10 e^{i 10 pi/6} = 1024 e^{i 5 pi/3}; 5 pi/3 wraps to the home step 5 pi/3 - 2 pi = -pi/3. cos(5 pi/3) = 1/2, sin(5 pi/3) = -sqrt3/2: 1024 (1/2 - i sqrt3/2) = 512 - 512 sqrt3 i = 512 - 886.810013i.
- Cartesian check by squaring: z^2 = 3 - 1 + 2 sqrt3 i = 2 + 2 sqrt3 i; z^4 = (2 + 2 sqrt3 i)^2 = 4 - 12 + 8 sqrt3 i = -8 + 8 sqrt3 i; z^5 = z^4 z = (-8 + 8 sqrt3 i)(sqrt3 + i) = -8 sqrt3 - 8i + 24i + 8 sqrt3 i^2 = -16 sqrt3 + 16i; z^10 = (z^5)^2 = 768 - 256 + 2(-16 sqrt3)(16) i = 512 - 512 sqrt3 i.
- Walk text: n from 1 to 10 crosses the seam between n = 6 (z^6 = 64 e^{i pi} = -64, Arg = pi, still on the seam) and n = 7 (angle 7 pi/6 wraps to Arg = -5 pi/6 = -2.617994). n = 10: Arg = -pi/3 = -1.047198.

**1.4.2 (stops 6 and 20; all; P to C).** z^4 = -16.
- Polar: -16 = 16 e^{i pi}; the roots are 16^{1/4} e^{i (pi + 2 pi k)/4} = 2 e^{i (pi/4 + k pi/2)}, k = 0..3: angles pi/4, 3 pi/4, 5 pi/4, 7 pi/4 (Arg: pi/4, 3 pi/4, -3 pi/4, -pi/4). Cartesian: 2 cos(pi/4) = sqrt2: sqrt2 + sqrt2 i, -sqrt2 + sqrt2 i, -sqrt2 - sqrt2 i, sqrt2 - sqrt2 i (sqrt2 = 1.414214). Each to the fourth power is -16.
- Cartesian: (z^2)^2 = -16 gives z^2 = 4i or -4i; (sqrt2 + sqrt2 i)^2 = 2 (1 + i)^2 = 4i and (sqrt2 - sqrt2 i)^2 = -4i, so z = +-(sqrt2 + sqrt2 i) or +-(sqrt2 - sqrt2 i): the same four.
- Walk text: the step k = 1 (the staircase value Arg c + 2 pi = 3 pi, divided by 4) gives 3 pi/4: the root -sqrt2 + sqrt2 i = -1.414214 + 1.414214i.

**1.5.1 (stop 7; none; C, time).** The line from 2 + i to -3 - 3i.
- Cartesian: z(t) = (2 + i) + t [(-3 - 3i) - (2 + i)] = (2 - 5t) + (1 - 4t) i, 0 <= t <= 1. t = 0: 2 + i; 1/4: 0.75 + 0i; 1/2: -0.5 - i; 1: -3 - 3i.
- Polar: the slide -5 - 4i is a stretch sqrt41 = 6.403124 turned by Arg = -pi + atan(4/5) = -2.466852 (-141.340 degrees); z(t) = (2 + i) + t sqrt41 e^{i (-2.466852)}.

**1.5.2 (stop 8; none; P-native).** S = {z : 1 < |z + i| <= 3}.
- Cartesian: 1 < x^2 + (y + 1)^2 <= 9; centre -i = (0, -1).
- Polar about -i: z + i = rho e^{i phi}, 1 < rho <= 3, phi free: a polar rectangle, an annulus. Test points: 1.5 - i has |z + i| = 1.5, inside S; 1 - i has |z + i| = 1, boundary, not in S; 3 - i has |z + i| = 3, boundary, in S; -2i has |z + i| = 1 (the probe on the inner circle); -i has |z + i| = 0, not in S.
- Answer: neither open (the outer circle is in S, and a disk about an outer-circle point leaves S) nor closed (the inner circle is not in S); bounded; boundary = {|z + i| = 1} union {|z + i| = 3}; not a domain (not open); connected, so a region.

**2.1.1 (stop 9; any; both).** f(z) = z^2 + iz.
- Cartesian: (x + iy)^2 + i (x + iy) = x^2 - y^2 + 2xy i + ix - y: u = x^2 - y^2 - y, v = 2xy + x.
- Polar: z = r e^{i theta}, i = e^{i pi/2}: f = r^2 e^{2 i theta} + r e^{i (theta + pi/2)}: u = r^2 cos 2 theta - r sin theta, v = r^2 sin 2 theta + r cos theta.
- Check at z = 1 + i: Cartesian u = 1 - 1 - 1 = -1, v = 2 + 1 = 3. Polar r = sqrt2, theta = pi/4: u = 2 cos(pi/2) - sqrt2 sin(pi/4) = 0 - 1 = -1, v = 2 sin(pi/2) + sqrt2 cos(pi/4) = 2 + 1 = 3. w = -1 + 3i both ways.

**2.1.3 (stop 10; any; P for the motion, C for the line).** f(z) = iz - 2i on x = 2.
- Cartesian: z = 2 + iy: iz = 2i - y, so f = (2i - y) - 2i = -y: the whole real axis v = 0 (u = -y). z = 2 + 3i maps to -3.
- Polar: f(z) = i (z - 2): slide left by 2 (the line x = 2 becomes the imaginary axis, z - 2 = iy), then multiply by i = e^{i pi/2}, a quarter turn counterclockwise: iy turns to -y. In general the map is a rotation by 90 degrees counterclockwise followed by a slide by -2i; it fixes the point z0 with z0 = i z0 - 2i, z0 (1 - i) = -2i, z0 = -2i (1 + i)/2 = 1 - i (check f(1 - i) = i + 1 - 2i = 1 - i), so it is the quarter turn about 1 - i.

**2.1.2 (stops 11 and 18; none; C with time).** x = 2 under w = z^2.
- Cartesian: z = 2 + iy gives w = 4 - y^2 + 4y i: u = 4 - y^2, v = 4y; eliminate y = v/4: u = 4 - v^2/16: a parabola, vertex (4, 0), opening left, focus at 0 (v^2 = -16 (u - 4) = 4p (u - 4) with p = -4, focus at 4 + p = 0). y = 1: w = 3 + 4i (|w| = 5 = |z|^2).
- Polar: z = 2 + iy = r e^{i theta}, r^2 = 4 + y^2, cos^2 theta = 4 / (4 + y^2), sin^2 theta = y^2 / (4 + y^2); w = r^2 e^{2 i theta}: u = r^2 (cos^2 theta - sin^2 theta) = 4 - y^2, v = r^2 (2 sin theta cos theta) = 4y. Same.

**2.2.2 (stop 12; home; P).** (2i)^{1/2} on the principal branch.
- Polar: |2i| = 2, Arg(2i) = pi/2; principal root = 2^{1/2} e^{i (pi/2)/2} = sqrt2 e^{i pi/4} = sqrt2 (cos 45 + i sin 45) = 1 + i. The other root comes from the step pi/2 + 2 pi: sqrt2 e^{i 5 pi/4} = -1 - i.
- Cartesian: (a + bi)^2 = 2i: a^2 - b^2 = 0 and 2ab = 2, so a = b and a^2 = 1: a = b = 1 or a = b = -1; the principal root has Arg in (-pi/2, pi/2], real part positive: 1 + i.
- Walk text: once round the origin the root jumps at the seam: at w = -2 the principal root is sqrt2 i (Arg w = pi, half is pi/2), just below the axis it is -sqrt2 i; the jump is 2 sqrt2 = 2.828427.

**2.4.1 (stop 13; continuous; P).** A branch of z^{1/3} continuous on the negative real axis.
- Polar: f(z) = r^{1/3} e^{i theta/3} with 0 < theta < 2 pi (the cut is the non-negative real axis, which is not the negative axis). On the negative real axis theta = pi: f(-r) = r^{1/3} e^{i pi/3}; at z = -1: e^{i pi/3} = 1/2 + (sqrt3/2) i = 0.5 + 0.866025i, and its cube is e^{i pi} = -1.
- Cartesian: the three cube roots of -1 are e^{i pi/3}, -1 and e^{-i pi/3}; the branch picks the one for theta = pi. The principal branch (window (-pi, pi]) is not continuous there: approaching -1 from above (Arg to pi) gives e^{i pi/3}, from below (Arg to -pi) gives e^{-i pi/3}, a jump of |e^{i pi/3} - e^{-i pi/3}| = 2 sin(pi/3) = sqrt3 = 1.732051.

**2.5.1 (stop 14; any; P).** The circle |z - 1| = 1 under w = 1/z.
- Polar: on the circle r^2 - 2 r cos theta + 1 = 1, so r = 2 cos theta (theta = Arg z, |theta| < pi/2); 1/z = (1 / (2 cos theta)) e^{-i theta} = (cos theta - i sin theta) / (2 cos theta) = 1/2 - (i/2) tan theta: Re w = 1/2 always, Im w = -tan(theta)/2 over all reals: the line Re w = 1/2. The point z = 0 (theta = +-pi/2) goes to infinity, so the circle through 0 must open into a line.
- Cartesian: on the circle x^2 + y^2 = 2x, so w = conj z / |z|^2 = (x - iy) / (2x) = 1/2 - (y / (2x)) i. Check z = 1 + i: w = (1 - i)/2 = 0.5 - 0.5i (theta = pi/4: 1/2 - (1/2) tan(pi/4) i). z = 1/2 + (sqrt3/2) i (theta = pi/3): w = 0.5 - 0.866025i.

**2.3.1 (stop 15; any; P reveals it).** The limit of (x^2 - y^2 + 2ixy) / (x^2 + y^2) along y = x^2.
- Cartesian: substitute y = x^2: (x^2 - x^4 + 2i x^3) / (x^2 + x^4) = (1 - x^2 + 2ix) / (1 + x^2), which tends to 1 as x goes to 0 (x = 0.01 gives 0.9998 + 0.019998i; x = -0.01 gives 0.9998 - 0.019998i).
- Polar: the expression is z^2 / |z|^2 = z / conj z = e^{2 i theta}. On y = x^2 the angle theta = atan(x) tends to 0 (from either side: theta to 0 or to pi, and 2 theta to 0 or to 2 pi), so e^{2 i theta} tends to 1. The curve is tangent to the real axis at 0.
- The full limit does not exist: along the real axis the value is 1, along the imaginary axis -1, along y = x it is e^{i pi/2} = i (the Walk's "switch to the line y = x": the arrival point moves from 1 to i on the unit circle).

**3.1.2 (stop 16; any; P with h = rho e^{i phi}).** f(z) = |z|^2 differentiable only at 0.
- Polar: [f(z0 + h) - f(z0)] / h = [z0 conj h + h conj z0 + h conj h] / h = conj z0 + z0 (conj h / h) + conj h = conj z0 + z0 e^{-2 i phi} + rho e^{-i phi}; as rho goes to 0 this tends to conj z0 + z0 e^{-2 i phi}: a circle of centre conj z0 and radius |z0|. It is a single point exactly when z0 = 0; then f'(0) = 0. At z0 = 1 + i: centre 1 - i, radius sqrt2 = 1.414214.
- Cartesian: f = x^2 + y^2, so u = x^2 + y^2, v = 0. CR: u_x = 2x must equal v_y = 0 and u_y = 2y must equal -v_x = 0: only x = y = 0. So differentiable only at 0, nowhere analytic.

**3.2.1 (stop 17; none; C).** f(z) = e^x (cos y + i sin y).
- Cartesian: u = e^x cos y, v = e^x sin y. u_x = e^x cos y = v_y; u_y = -e^x sin y = -v_x. The partials are continuous everywhere, so f is entire (Thm 3.2.6). f'(z) = u_x + i v_x = e^x cos y + i e^x sin y = f(z). At z = 0.5 + 0.8i: u_x = 1.148675, v_x = 1.182720.
- Polar: f = e^z, so f' = e^z: stretch |f'| = e^x, turn Arg f' = y (mod 2 pi): the local move is a stretch by e^x and a turn by y. f(i pi/2) = e^0 (cos(pi/2) + i sin(pi/2)) = i; f'(0) = 1.
- The CR failure the Walk's cauchy-riemann stop shows, for conj z (u = x, v = -y): u_x = 1 and v_y = -1 disagree (residual 2); u_y = 0 = -v_x agrees. "CR holds: no".

### 6.3 Numbers the registry's `walk.do` sentences quote (asserted in U9)

| Stop | Quoted | Value |
|---|---|---|
| addresses | r = 2, theta = 2 pi/3 | z = -1 + 1.732051i |
| addresses | x = 1, y = 1 | r = 1.414214, Arg = 0.785398 |
| arithmetic | Arg z2, abs z2 for z2 = -1 + 4i | 1.815775, 4.123106 |
| roots | c = -16, n = 4, k = 1 | -1.414214 + 1.414214i |
| curves | z(t) from 2 + i to -3 - 3i | z(0.5) = -0.5 - i |
| linear | x = 2 under iz - 2i | the real axis (-y) |
| powermap | x = 2 under z^2 | u = 4 - v^2/16 |
| principal-root | sweep jump | 2.828427 |
| limits | y = x^2, then y = x | 1, then i |
| derivative | f = abs(z)^2 at 0 | f'(0) = 0, radius |z0| |
| cauchy-riemann | conj z | u_x = 1, v_y = -1 |

---

## 7. Verification plan

Run everything from the repo root. Node 22.

### 7.1 Per acceptance criterion

| Id | Command | What passing looks like |
|---|---|---|
| A1 | `node --test tests/unit/i2-walk-shell.test.mjs` | Tests U1 to U10 (7.2) pass. U1 holds every case the criterion lists. |
| A2 | `node tools/smoke.mjs --route home --dark --script tests/interact/i2-walk-shell.mjs` (the harness runs it at desktop, phone and dark desktop) | `3/3 checks passed`; the script log shows the 15 steps of 7.3 for each viewport; no console error. |
| A3 | `node tools/smoke.mjs --route roots-m16 --dark --script tests/interact/i2-walk-shell.mjs` | `3/3 checks passed` (the script runs its A3 branch on that route; it also runs at the end of the `home` branch after a reset). |
| A4 | `node tools/smoke.mjs --route home,staircase,lab --dark --out docs/review/iter-2/i2-walk-shell` then read the PNGs | `home--desktop.png` and `home--phone.png`: the header mark shows two rings and twelve rays, the orange ray and arc and the dot; the title is serif; the map panel has a faint ring-and-ray grid behind the strands. `lab--desktop.png` (three badges) and `staircase--desktop.png` (one): every badge shows a needle in its mark, T1 pointing right, T2 up and to the right, T3 up and to the left. `home--desktop-dark.png`: the same, the grid visible but faint. No horizontal overflow reported (S1 in 0.2 explains `lab`). |
| A5 | `node --test tests/unit/i2-walk-shell.test.mjs tests/unit/i1-shell.test.mjs tests/unit/architecture-sync.test.mjs` and `git diff css/theme.css index.html js/app.js` | U5, U6, U8 pass; the diff of `theme.css` adds only `--walk-h: 0px;` and the `scroll-padding-bottom` line; `index.html` differs only inside the brand-mark SVG; every colour in the new `components.css` rules is `var(--...)`, `color-mix` of tokens, `transparent` or `currentcolor` (the existing i1 test that forbids literals also runs); `walk.js` has one import; `app.js` has the six imports of 4.3. |
| A6 | `node tools/smoke.mjs --dark` and `node tools/interact-all.mjs i1-shell i2-walk-shell` and `npm test` | every route of the registry loads with no console error, page error, failed request, overflow or error panel (22 routes x 3 = 66 checks once `i2-rehearse` lands; before that the `rehearse` route alone may fail); `i1-shell` passes with the place list asserting 22; both scripts pass; in `npm test` the only failures are the ones the plan lists as red until wave 1 completes. |
| A7 | `node --test tests/unit/i2-walk-shell.test.mjs` (U6) plus the keyboard steps of 7.3 (K1 to K4) | every `transition` or `animation` declaration of a `.walk-` rule is inside `@media (prefers-reduced-motion: no-preference)`; the five controls are `<button type="button">`; every dot link has `aria-label` matching `^Stop \d+: `; focus is visible. |

### 7.2 Unit tests: `tests/unit/i2-walk-shell.test.mjs` (Node 22, `node:test`)

Imports: `walk.js` (the eight exports), `registry.js` (`STATIONS`, `META_STATIONS`), `app.js` (`parseRoute`), `data/problems.js` (`PROBLEMS`, `problemById`, `problemsForStation`), `core/complex.js`, `fs`, `path`.
Nothing here needs a DOM.

**U1 (A1): the pure helpers.**
- `const stops = walkStops(STATIONS)`: `stops.length === 22`; for every `i`, `stops[i].index === i` and `stops[i].index === STATIONS.find(s => s.id === stops[i].station).order`; `stops[4].station === 'staircase'`, `stops[4].route === 'staircase'`; `stops[6].route === 'roots-m16'`; `stops[20].station === 'rehearse'`; the station ids in order equal `STATIONS.map(s => s.id)`; `walkStops([])` and `walkStops(null)` are `[]`; a station with no `walk` is skipped.
- `stopFor(STATIONS, 'nowhere') === null`; `stopFor(STATIONS, 'roots').index === 6`.
- for every station: `validateCheck(s.walk.check) === null`. `typeof validateCheck({ kind: 'event' }) === 'string'` and it is non-empty. Further invalid cases, each a non-empty string: `null`, `[]`, `{ kind: 'nope' }`, `{ kind: 'event', event: 'hover', ids: ['a'] }`, `{ kind: 'event', event: 'click', ids: [] }`, `{ kind: 'event', event: 'click', ids: ['a'], atLeast: 2 }`, `{ kind: 'event', event: 'click', idPrefix: '' }`, `{ kind: 'handle', ids: ['h'], quadrants: 5 }`, `{ kind: 'hook', hook: 'x y', path: 'a', op: '>=' }`, `{ kind: 'hook', hook: 'x', path: 'a(1)', op: '>=' }`, `{ kind: 'hook', hook: 'x', path: 'a', op: '==' }` (needs a value), `{ kind: 'text', id: 'r' }`, `{ kind: 'all', of: [] }`, `{ kind: 'any', of: [{ kind: 'nope' }] }`. Valid: `{ kind: 'hook', hook: 'lab', path: 'shapes().length', op: 'increase' }`.
- `stopLabel(stops[4]) === 'Stop 5 of 22 · The Staircase: z, arg z, Arg z'`; `stopLabel(stops[0]) === 'Stop 1 of 22 · The Map'`; `stopLabel(stops[21]) === 'Stop 22 of 22 · The Problem Index'`; `stopLabel(stops[4], 30) === 'Stop 5 of 30 · The Staircase: z, arg z, Arg z'`.
- `evaluateCheck` (the cases of the criterion, then extras):
  - `event { event:'input', ids:['a','b'], atLeast:2 }`: false with `events:['input:a']`, false with `['input:a','input:a']`, false with `['click:a','click:b']`, true with `['input:a','input:b']`.
  - `event { event:'click', idPrefix:'problems-tick-' }`: true with `['click:problems-tick-1.4.2']`, false with `['input:problems-tick-1.4.2']`, false with `[]`.
  - `handle { ids:['h'], quadrants:4 }`: false with `handles:{h:{moved:true, quadrants:3}}`, true with `quadrants:4`, false with `{h:{moved:false, quadrants:4}}`, false with `{}`. `handle { ids:['h','g'] }` (no quadrants): true with `{g:{moved:true, quadrants:1}}`.
  - `hook { hook:'staircase', path:'state().laps', op:'abs>=' }`: true with `hooks:{'staircase.state().laps':{now:-1, first:0}}`; false with `{now:0, first:0}`; with `value: 2` false for `now:-1`, true for `now:-2`.
  - `increase` true with `{now:3, first:2}`, false with `{now:2, first:2}` and with `{now:'3', first:2}`; `change` true with `{now:'a', first:'b'}`, false with equal values, false with `first: undefined`; `'>='` with `value: 3`; `'<='` with `value: 3`; `'=='` and `'!='`; a missing hook entry is false.
  - `text { id:'r', includes:'probe: boundary' }`: true with `texts:{r:'probe: boundary; ε = 0.3'}`, false with `{r:'probe: interior'}`, false with `{}`.
  - `all` and `any` combine: `all` of an `event` and a `text` is true only with both; an `event` member stays true once seen; `any` true with one; `all` over an empty array is invalid hence false; an unknown kind is false: `evaluateCheck({ kind: 'nope' }, emptySnapshot()) === false`; `evaluateCheck(null, emptySnapshot())` and `evaluateCheck(check, undefined)` do not throw.
- `emptySnapshot()` deep-equals `{ events: [], handles: {}, hooks: {}, texts: {} }` and two calls are distinct objects.

**U2: the registry's walk data is coherent.** For every stop: `parseRoute('#' + stop.route).station === stop.station` (all 22 routes resolve to their own station: `roots-m16`, `problems-todo`, `rehearse-1-4-2`, `problem-1-1-1`, ...); `stop.do`, `stop.say` non-empty; `stop.problem === null` or `problemById(stop.problem)` exists and is in `problemsForStation(stop.station)` (own or listed); the stops with no problem are exactly `home`, `graph4d`, `problems`; `stop.say` equals the text of the segment with `id === stop.station` in `media/narration/site/walk.json` (22 segments, same order).

**U3: the walk path is the story.** The 22 stop titles in order equal the titles of `STATIONS`; the stop index of each station equals its `order`; `stops.map(s => s.station)` begins `['home','addresses','arithmetic','distance','staircase','powers','roots','curves','sets','mappings','linear','powermap','principal-root','branches','reciprocal','limits','derivative','cauchy-riemann','lab','graph4d','rehearse','problems']`.

**U4: the Walk's quoted numbers and the sixteen problems (section 6).** With `complex.js`:
`mul(3-2i, -1+4i)` is `5+14i` and `div(...)` is `-11/17 - (10/17)i` (1e-12); `abs` of the product is `sqrt(221)`; `Arg(z1) + Arg(z2)` equals `Arg(product)` (1e-12) = 1.2277723864; `Arg(z2) = 1.8157749899`, `abs(z2) = 4.1231056256`; `abs(-1 + i sqrt3) = 2`, `Arg = 2pi/3`; `fromPolar(2, 2pi/3)` is `-1 + 1.7320508076i`; `abs(1+i) = sqrt2`, `Arg(1+i) = pi/4`; `abs(sub(4+3i, -1+i)) = sqrt(29)`; `abs(sub(0, 1+2i)) < 3`; `pow(sqrt3 + i, 10)` is `512 - 886.8100134753i` with `Arg = -pi/3`; the powers for n = 6 and 7: `pow(.,6) = -64` (Arg pi) and `Arg(pow(.,7)) = -5pi/6`; `rootsOf(-16, 4)` are the four roots of 6.2 (each to the fourth is -16); the step k = 1 root is `-sqrt2 + sqrt2 i`; the line of 1.5.1 at t = 0, 0.25, 0.5, 1 gives `2+i`, `0.75`, `-0.5-i`, `-3-3i`, direction `-5-4i`, `abs = sqrt41`, `Arg = -2.4668517114`; for `|z+i|` the points `1.5-i`, `1-i`, `3-i`, `-2i`, `-i` give `1.5, 1, 3, 1, 0`; `z^2 + iz` at `1+i` is `-1+3i`, and the polar formulas `r^2 cos 2t - r sin t`, `r^2 sin 2t + r cos t` give `-1` and `3` at `r = sqrt2, t = pi/4` (1e-12); `iz - 2i` at `2+3i`, `2`, `2-i` gives `-3`, `0`, `1` and fixes `1-i`; `(2+iy)^2` for y = 0, 1, 2, -3 is `4`, `3+4i`, `8i`, `-5-12i` and each satisfies `u = 4 - v^2/16`; `principalRoot(2i, 2) = 1+i` and the other root is `-1-i`; `abs(principalRoot(-2, 2) - principalRoot({re:-2, im:-1e-12}, 2)) = 2 sqrt2` (1e-9); `branchRoot(-1, 3, 0) = 0.5 + 0.8660254038i`, `branchRoot(-1, 3, -pi)` the same, `branchRoot({re:-1, im:-1e-12}, 3, -pi)` is `0.5 - 0.8660254038i`, the distance between the last two is `sqrt3` (1e-9); for theta = pi/4, -pi/4, pi/3 the point `2 cos(t) e^{it}` is at distance 1 from 1 and `inv` of it has real part 0.5 and imaginary part `-tan(t)/2`; `inv(1+i) = 0.5 - 0.5i`; the 2.3.1 expression `z^2/|z|^2` at `0.01 + 0.0001i` is `0.9998 + 0.019998i` (1e-6), along `y = x` it is `i`, along the real axis `1`, along the imaginary axis `-1`; `localLinear(|z|^2, 1+i)` has `A = 1-i`, `B = 1+i`, `abs(B) = sqrt2` (1e-8); for `e^x(cos y + i sin y)` the `jacobian` at `0.5+0.8i` has `ux = vy = 1.148675` and `uy = -vx = -1.182720` (1e-6) and `f(i pi/2) = i`; for `conj z` the jacobian is `ux = 1`, `vy = -1`. The same values are looked up in `problemById(id).answer.values` where the table of ARCHITECTURE 3.3 lists them and compared.

**U5 (A5): index.html.** `<link` occurs 4 times and `<script` 4 times (no new ones); no `fonts.googleapis`/`gstatic`; the brand-mark SVG: `class="brand-mark"`, the root has `stroke="currentColor"`, it contains at least 2 `<circle` elements inside `.mark-grid` and a grid `path` with at least 6 `M` commands, one `.mark-dot` circle, no `#hex` colour and no `rgb(`; the nine colour-key entries and the `T1 a blue disc (solid line), ...` sentence are unchanged (i1 tests also pin them).

**U6 (A5, A7): the CSS.** In `components.css` (comments stripped): the rules `.walk-bar`, `.walk-dot`, `.walk-label`, `.walk-body` exist; every `transition` or `animation` declaration inside a rule whose selector contains `.walk-` sits inside `@media (prefers-reduced-motion: no-preference)` (find each occurrence, walk back over braces to the enclosing at-rule); the Walk section's text contains no `#hex`, `rgb(`, `hsl(` or named colour; `body[data-walk="on"] #view` sets `padding-bottom` using `var(--walk-h)`; `.thread-badge[data-thread="T3"]::before` still has `transform: rotate(45deg)`; `.site-title-text` has `font-family: var(--font-display)`; `#home-map-panel::before` uses `repeating-radial-gradient` and at least six `linear-gradient(` layers and only tokens; `.nav-part-title` has `flex-wrap: wrap`; the media block's selectors exist. In `theme.css`: the set of custom properties in `:root` equals the previous set plus `--walk-h`, whose value matches `^0px$`; the two dark blocks are still identical; `html` has `scroll-padding-bottom` mentioning `--walk-h`. `--font-display` begins with a serif family name and ends with `serif`; `--font` ends with `sans-serif`.

**U7: check ids exist.** For each stop, every id in its check (`ids`, `idPrefix`, a `text` check's `id`; for `handle` ids the plane id, the part before the last `-`) and every hook name occurs as a substring of `js/stations/<station>.js`, **except** the ids that a station builds from a prefix and a key. Those are looked up in this table instead (each listed string must occur in the named file):
`roots-stairs-k1-row`: `'roots-stairs'` in `roots.js` and `-k${k}-row` in `js/core/staircase.js`; `roots-pick-1`: `'roots-pick-'` in `roots.js`; `limits-path-line`: `'limits-path-'` in `limits.js` and `line:` in `limits.js` (the key of `PATH_LABELS`). `lab-replay` and `rehearse-reveal` are allowed to be missing unless `process.env.WALK_STRICT === '1'` (S4). A hook name (`staircase`, `lab`) must occur as `__mv.<hook>` or `mv.<hook>` in its station file.

**U8 (A5): imports and the app.js structure.** `walk.js` has exactly one import specifier, `./listen.js`; its `export` lines are exactly the eight names of 4.1 (no others); `app.js` import specifiers sorted equal `['./core/ids.js','./core/listen.js','./core/store.js','./core/theme.js','./core/walk.js','./registry.js']` and it still has no `import('` literal; `createWalk(` occurs in `start`; `attachWalk(section, st, ctx)` occurs after `view.dataset.state = 'ready'` and before `finish(first, st.title`; `detachWalk()` occurs inside `teardown` before `runUnmount`; `walk.destroy()` occurs in `stop`; `toggleAttribute('inert', open)` and `getElementById('site-footer')` are still present; the first `} catch (err) {` after `async function render()` is the render catch (the pinned test's regex still matches); the `const EXPONENT = ...;` line of `app.js` equals that of `walk.js`; the dot-click handler in `walk.js` contains the early return on `e.defaultPrevented`, `e.button !== 0`, `e.metaKey`, `e.ctrlKey`, `e.shiftKey` and `e.altKey`; `ARCHITECTURE`'s section 11.5 signature lines match `walk.js` (the parameter lists, comments ignored, through the sync test's own helper if it is exported, else a local copy of the same normalisation).

**U9: the quoted numbers.** The rows of 6.3 against `complex.js` (a subset of U4 kept separate so a copy change in a registry `do` sentence fails one named test): the test reads the `do` text of each of those stops and asserts it still contains the quoted numbers (`r = 2`, `2pi/3`, `x = 1 and y = 1`, `c = -16`, `n = 4`, `k = 1`, `2 + i`, `-3 - 3i`, `x = 2`, `y = x^2`, `y = x`).

**U10: the exponent label.** `labelNodes` is private, so this test checks the contract through the script (7.3 step X2); here only that `walk.js` contains the `prose-sup` class name.

`tests/unit/i1-shell.test.mjs` (owned, edited): the import-list test now expects the six specifiers of 4.3; nothing else changes (every other pin there still holds: the T3 badge diamond, the colour key, the render catch, the nav-drawer inert rule).

### 7.3 Interaction script: `tests/interact/i2-walk-shell.mjs`

Header: `// node tools/smoke.mjs --route home,staircase,roots-m16 --script tests/interact/i2-walk-shell.mjs --dark` and `export const routes = ['home', 'staircase', 'roots-m16'];`
(`tools/interact-all.mjs` reads either; its `ROUTES` row already exists). The harness runs the default export once per route and per viewport (desktop 1280 x 860, phone 390 x 844, dark desktop), each in a **fresh browser context**, so localStorage starts empty.
Imports: `settle, dragHandle, dragHandleAround, setSlider` from `./_helpers.mjs`. Helpers inside the script:
`go(token)` sets `location.hash` and waits for `#view[data-route=token]` to have a `data-state` other than `loading` (the same wait `tests/interact/i1-shell.mjs` uses, so it also serves `nosuchplace`); `hash()`; `txt(sel)` = `textContent` trimmed; `dot(k)` = `li.walk-dot[data-stop="k"]`; `waitDone(k)` = wait up to 1500 ms for `li.walk-dot[data-stop="k"][data-done="true"]`; `noOverflow()`; a `console` listener collecting error messages.

Branches by `ctx.route`: `home` runs, in this order, O, the A2 flow (steps 1 to 15), X1 to X5, X7, X8, K, then (after removing the four `mv:walk.*` keys and a reload) the A3 flow, and last X6; `staircase` runs O and the clearance flow (C); `roots-m16` runs O and the A3 flow.

**O. Off state (every route).** `#walk-bar[data-walk="off"]` exists; `document.body.dataset.walk === 'off'`; `#walk-start` is visible, its text starts with `Start the Walk`; `#walk-panel` is hidden; the pill is inside the viewport (`right <= innerWidth`, bottom edge `<= innerHeight`) and on phone does not widen the page (`noOverflow`); `getComputedStyle(document.documentElement).getPropertyValue('--walk-h')` is `0px` (trimmed); `window.__mv.walk.state()` has `on === false`, `stop === 0`, `done` an empty array, `ticked === false`, `shown` equal to the index of the route's station (0 on `home`, 4 on `staircase`, 6 on `roots-m16`) and `here === (shown === 0)`; the brand mark has 2 or more `circle` elements and the title's computed `font-family` contains `serif` and differs from `getComputedStyle(document.body).fontFamily`.

**A2 flow, route `home`, steps:**
1. Click `#walk-start`. `document.body.dataset.walk === 'on'`; `location.hash === '#home'`; `txt('#walk-stop-label') === 'Stop 1 of 22 · The Map'`; `txt('#walk-say')` contains `A complex number is a move: turn, then stretch.`; `#walk-problem` has the `hidden` property true; `#walk-progress li.walk-dot` count is 22; `#walk-bar[data-here="true"]`; `--walk-h` is a `px` value `>= #walk-bar offsetHeight - 1` and `<= offsetHeight + 1`.
2. `dragHandleAround(page, 'home-demo-plane-z', { center: { re: 0, im: 0 }, radius: 1.5, turns: 1 })`; wait 400 ms; `waitDone(0)`; `txt('#walk-status')` contains `Done`; `#walk-done` hidden.
3. Click `#walk-next`; wait for `#view[data-state=ready]`; `await shot('walk-on')` (the bar at this viewport, for the reviewer); `hash() === '#addresses'`; `txt('#walk-stop-label') === 'Stop 2 of 22 · One Point, Two Addresses'`; `#walk-problem` `href` attribute is `#problem-1-3-1` and its text is `1.3.1`.
4. `page.fill('#addresses-x', '1')` and `page.fill('#addresses-y', '1')`; `waitDone(1)`.
5. Click `#walk-next`: `hash() === '#problem-1-1-1'`.
6. Click `#arithmetic-animate`; `waitDone(2)`.
7. Click `#walk-next`: `hash() === '#distance'`.
8. `dragHandle(page, 'distance-plane-a', { re: 1.5, im: 2 })`; `waitDone(3)`.
9. Click `#walk-next`: `hash() === '#staircase'`.
10. `dragHandleAround(page, 'staircase-plane-z', { radius: 1.5, turns: 1 })`; `await page.evaluate(() => window.__mv.staircase.state().laps) !== 0`; `waitDone(4)`. **Clearance:** `document.getElementById('staircase-plane-canvas').scrollIntoView({ block: 'end' })`, then `canvas.getBoundingClientRect().bottom <= document.getElementById('walk-bar').getBoundingClientRect().top` and `parseFloat(getComputedStyle(document.getElementById('view')).paddingBottom) >= document.getElementById('walk-bar').offsetHeight`; also, after `window.scrollTo(0, document.documentElement.scrollHeight)`, the footer's last text line (`#colour-key` summary) has `bottom <= bar top` (the page does not end under the bar).
11. Click `#walk-next`: `hash() === '#problem-1-3-2'`.
12. `setSlider(page, 'powers-n', 10)`; `waitDone(5)`.
13. `page.reload()`; wait for ready: `body.dataset.walk === 'on'`; `txt('#walk-stop-label') === 'Stop 6 of 22 · Powers: Spin n Times'`; `document.querySelectorAll('li.walk-dot[data-done="true"]').length === 6` (stops 0 to 5).
14. Click `#walk-leave`: `body.dataset.walk === 'off'`; `txt('#walk-start')` contains `Resume the Walk` and `6 of 22`; `JSON.parse(localStorage.getItem('mv:walk.done'))` has `home, addresses, arithmetic, distance, staircase, powers` all `true` and no other key; `localStorage.getItem('mv:walk.on') === 'false'`; `localStorage.getItem('mv:walk.stop') === '5'`; `--walk-h` is back to `0px`.
15. No console error since the start of the script.

**X. Extras (home branch, after step 14).** (X1) `window.__mv.walk.goTo(0)`: Back is disabled, `#walk-next` enabled; `window.__mv.walk.goTo(21)`: wait; `#walk-next` is disabled with `title` `That is the last stop.`; `hash() === '#problems-todo'`. (X2) `goTo(11)`: `txt('#walk-stop-label') === 'Stop 12 of 22 · zn: Fans and Parabolas'` and the label has exactly one `sup.prose-sup` with text `n`; its `title` is `Stop 12 of 22 · z^n: Fans and Parabolas`. (X3) dots: click `#walk-dot-8` (a plain click): `hash() === '#problem-1-5-2'`, `state().stop === 8`; ArrowRight from it moves focus to `#walk-dot-9` and sets `tabindex` 0 there and -1 on `#walk-dot-8`; every `#walk-progress a` has an `aria-label` matching `^Stop \d+: ` and `href` equal to `#` plus its stop's route (the modified-click escape of 5.10 is checked in U8, because a real Ctrl-click would open a tab). (X4) fold: click `#walk-fold`: `aria-expanded === 'false'`, `#walk-body` hidden, `bar.dataset.min === 'true'`, `localStorage 'mv:walk.min' === 'true'`, `--walk-h` smaller than before; click again restores. (X5) corrupt store: `localStorage.setItem('mv:walk.stop', '"x"')`, `'mv:walk.done'` to `'[1,2]'`, `'mv:walk.on'` to `'"yes"'`, reload: `body.dataset.walk === 'off'`, `#walk-start` text `Start the Walk`, `state().done` is `[]`, no console error, and the three stored values are unchanged in localStorage (a visit rewrites nothing). (X6, run last because it leaves the context with blocked storage) blocked storage: `page.context().addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }))` then `page.reload()`: the page loads, `#walk-start` works, a Mark done ticks in memory, `#walk-note` becomes visible, no console error. (X7) reduced motion: `page.emulateMedia({ reducedMotion: 'reduce' })`: `getComputedStyle(document.querySelector('.walk-dot a'), '::before').transitionDuration` is `0s` and the panel's `animationName` is `none`; restore with `'no-preference'`. (X8) phone only: open `#nav-toggle`; `#walk-bar` has the `inert` property true while the drawer is open and false after Escape; the drawer covers the bar (`elementFromPoint` at the bar's centre is inside `#site-nav`).

**K. Keyboard (A7), home branch.** Start with `window.__mv.walk.goTo(9)` (Mappings, not yet ticked) and wait. (K1) `page.focus('#walk-next')`, press Enter: `hash() === '#problem-2-1-3'` (stop 10) and `document.activeElement.id === 'walk-next'` (focus stayed in the bar, the router did not move it to `#view`). (K2) Tab order from `#walk-back`: `walk-back`, `walk-next`, `walk-fold`, then (body expanded) `walk-problem`, `walk-done`, `walk-leave`, then exactly one `walk-dot-*`. (K3) at stop 10, which is not ticked, `#walk-done` focused and activated by Enter: the stop ticks (`state().done` gains `linear`) and focus moves to `#walk-next`. (K4) every control with a `type` is `button` with `type="button"`; `getComputedStyle(focused).outlineStyle !== 'none'` on each.

**A3 flow, route `roots-m16` (and home after reset).** Fresh walk: click `#walk-start` (stop 0; `hash() === '#home'`).
1. `go('roots-m16')`: `#walk-bar[data-walk="on"][data-here="false"]`; `#walk-goto` visible, `href === '#home'`, its text contains `Go to`; `txt('#walk-do')` contains `click step k = 1`; `txt('#walk-stop-label') === 'Stop 7 of 22 · Roots: Divide the Staircase'`; `#walk-problem` href `#problem-1-4-2`; `#walk-offpath` text `The Walk is at stop 1 of 22: The Map.`; `bar.dataset.stop === '0'` and `bar.dataset.shown === '6'`; `dot(0)` has `aria-current="step"` and `dot(6)` has `data-shown="true"`.
2. Click `#roots-stairs-k1-row`: `waitDone(6)` (the roots dot is done although the Walk is at stop 0); `txt('#walk-status')` contains `Done: stop 7 ticked` and `ahead`; `dot(0)` is not done.
3. Click `#walk-next` (Next moves from the shown stop, D2): `hash() === '#problem-1-5-1'` (the Curves stop, index 7), `state().stop === 7`, `#walk-bar[data-here="true"]`.
4. Click `#walk-back` twice: `hash()` is `'#roots-m16'` after the first and `'#problem-1-3-2'` after the second; `state().stop === 5`. The first lands on the already ticked Roots stop and the status reads `Done: stop 7 is already ticked.`
5. `go('nosuchplace')`: after 300 ms `#walk-offpath` text starts `This page is not one of the stops.`, `#walk-goto` visible; `go('problem-1-3-2')` restores `data-here="true"`.

**C. Clearance flow, route `staircase`.** Click `#walk-start` (goes to `#home`), then `window.__mv.walk.goTo(4)` (to `#staircase`) and wait: `data-here="true"`; scroll the canvas into view with `block: 'end'` and assert the same two clearance inequalities as step 10 above; `scrollTo(bottom)` and assert the footer text is above the bar; `noOverflow()`.

**What passing looks like.** The harness prints one line per route and viewport and ends `N/N checks passed` (9/9 for the three routes with `--dark`); there is no `interaction script failed` line; the console listener's list is empty.

### 7.4 Screenshots and what a reviewer looks at

Taken by the script with `shot('...')` and by A4's command: the bar on at stop 1 at desktop and phone (light), on at stop 5 (dark), folded, off path, and the off pill. The reviewer checks: no plane or control is hidden by the bar at the end of the page; the bar's top rule colour follows the station's thread; the dots read as ring / filled / heavy ring / underline without relying on hue; the pill does not collide with the colour key; the part V menu note wraps cleanly at 1280 and 390.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases.**

| # | Case | Behaviour |
|---|---|---|
| E1 | A tick arrives for a stop that is not the current one | counts; status says `ahead of the Walk` or `an earlier stop`; the Walk's position is unchanged |
| E2 | A check is already true when the checker starts (a preset opened in the solved state) | armed rule: it must go false once, then true; no free tick |
| E3 | The student reaches the stop by a different route than the stop's own (the nav menu, a problem chip) | `here` follows the station, not the token; the stop's own route is only used by the Walk's controls |
| E4 | Next pressed twice quickly | the second press reads `pendingTo` (the first target) and adds one; the router supersedes the first navigation; one mount |
| E5 | The target station fails to load (error panel) | no `attach`; after 220 ms the away state shows with `This page is not one of the stops.` and a way back; the pending state is also cleared after 5 s |
| E6 | The station has no Walk entry (a test station) | `attach` with `index: null`: no checker, away state, `Mark done` hidden (the page is not a stop, so nothing can be ticked from it) |
| E7 | `goTo(NaN)`, `goTo(-3)`, `goTo(99)` | NaN returns `false` and changes nothing; the others clamp to 0 and N - 1 |
| E8 | `markDone('nowhere')`, or a station already ticked | returns `false`, no write |
| E9 | Corrupt or foreign store values | ignored (2.5); the store is never repaired by a visit |
| E10 | Storage blocked or full | works in memory; `#walk-note` says so; no console error |
| E11 | `ResizeObserver` missing | a window `resize` listener calls `measure` |
| E12 | A hook the check needs is missing (the station has not defined it yet) | `now` stays `undefined`: the check is false, not an error |
| E13 | The tab is hidden | `step` returns at once (timers are throttled anyway); sampling resumes on the next event or poll |
| E14 | Two ticks of the same station | idempotent |
| E15 | The student changes the hash by hand to a stop route | the page changes, the Walk does not (D3) |
| E16 | All 22 ticked | the message says so; the strip is all filled; nothing else changes |
| E17 | A very long title or `do` text | the label clamps to two lines (full text in `title`); the body scrolls inside the bar at `32dvh` |
| E18 | Theme switched while the bar is on | nothing to do: every colour is a token |
| E19 | The Walk bar is on and the page is shorter than the window | the bar is fixed over the bottom; the page's own bottom padding keeps its content above it |
| E20 | `window.scrollTo(0, 0)` by the router on every navigation | unchanged; the bar is not part of the scrolled content |

**Performance plan.** The bar is about 85 nodes (22 dots with links, 8 controls, text); `render` writes only changed values and runs on a state change, not per frame. The checker exists only while the Walk is on, the page's stop is not
ticked and a station is mounted: four capture listeners and three bubble listeners on the section (passive; each does one flag test), one `requestAnimationFrame` per frame at most (coalesced; each `step` reads a few attributes and
an `Array.from` of at most a dozen strings), and one `setInterval` at 250 ms (a few `getElementById` calls and a hook read). During a plane drag the extra cost per frame is below the noise of the plane's own redraw. Nothing is
allocated per pointer event. `measure` writes one CSS custom property, only when the integer height changes. The home grid is seven static gradient layers painted once on one pseudo-element and one mask on that layer (no animation,
no repaint on scroll); on a low-end phone drop the mask if it ever shows in a profile (the grid then ends at the panel edge instead of fading).

**Accessibility.** Landmark region with a label; every control a real button or link with a visible label or an aria-label that contains the visible text (`Back` / `Back to the previous stop`, `Next` / `Next stop`, `Leave the Walk` as is; the Fold chevron and the dots have no visible text, so their aria-label is the whole name); focus visible; target sizes 44 px for Back, Next, Fold and the pill, 40 px for the tools, 24 px tall dots; roving tabindex keeps the strip to one Tab stop; `role="status"` for ticks (polite, once); colour is never the only cue (3.1); text contrast at least 6.86 : 1; the bar is `inert` while the phone drawer is open; focus is not stolen from the bar by the router; `scroll-padding-bottom` keeps a focused control from sitting under the bar.

**Reduced motion.** Every `transition` and `animation` of the bar (the 0.18 s slide-in, the 0.12 s dot fill, the 0.28 s tick pop) is inside `@media (prefers-reduced-motion: no-preference)`, so under `reduce` the bar appears and the dots change instantly; the global rule of `theme.css` also zeroes durations. The `hidden` attribute does the show and hide. Nothing in `walk.js` animates.

**Phone layout (390 px; 320 px).** No horizontal overflow: the bar is `left: 0; right: 0`, the panel's children are `min-width: 0`, the label clamps, the strip shrinks (16.3 px per dot at 390, 13.1 at 320). Bar height (prototype): 247 px expanded with the longest `do` (four lines), about 215 px typically, about 92 px folded; the body scrolls inside `32dvh` (270 px on an 844 px phone) if a text or the off-path state is longer, so the bar never takes more than about 45 % of the screen. The pill is `max-width: calc(100vw - 2 * var(--gutter))`. `#walk-count` is hidden below 900 px. On a phone the first-time state is expanded; the Fold toggle remembers the student's choice.

---

## 9. Out of scope

- Editing any station (the checks read existing hooks and ids only; a missing id is reported, 10 R4).
- Narration audio: the Listen host stays empty until `media/manifest.js` lists clips.
- The home map's 22nd node, the two-decisions block, and the home page's own Walk start button and progress line (`i2-home-index-deck`; the hook gives it `state()`, `start()`, `resume()`).
- Rewriting the `<link rel="icon">` data URI to match the new mark.
- A reset or "start over" control, a per-stop skip list, sharing progress between tabs, keyboard shortcuts for Next and Back.
- The registry's `walk` texts and checks (the planner's).

## 10. Requests for other owners, and risks

**Requests.**

| # | To | Request |
|---|---|---|
| R1 | the orchestrator (goal `owns`) | Treat `tests/unit/i2-walk-shell.test.mjs` and `tests/interact/i2-walk-shell.mjs` as owned by this goal (A1 and A2 name them; the wave-0 goals owned their `i2-` files the same way). |
| R2 | `docs/goals/iter-2.json` A4 (the planner) | Judge the three thread badges on `lab--desktop.png`, not `staircase--desktop.png` (the staircase has one thread). |
| R3 | `docs/ARCHITECTURE.md` (the integrator) | Add `walk.min` to 3.13; document `Walk.state().shown`, the `data-shown` attribute, `#walk-away`, `#walk-offpath`, `#walk-fold`, `#walk-note`, `#walk-count`, `#walk-dot-<k>`, and that Back and Next move from the shown stop; move 11.5 into section 3 when built. |
| R4 | `i2-lab-diary`, `i2-rehearse` (siblings) | The Walk's checks need `#lab-replay`, `window.__mv.lab.shapes()` and `#rehearse-reveal` exactly as ARCHITECTURE 9 names them. U7's allow-list for the first and last goes away at integration (`WALK_STRICT=1`). |
| R5 | `i2-home-index-deck`, `i2-rehearse` | The Walk routes `problems-todo` and `rehearse-1-4-2` must resolve to a working station state (U2 checks the router side; the station side is theirs). |
| R6 | the integrator | After this goal lands, run `node tools/smoke.mjs --dark` (A6) and look once at the part V menu note at 1280 and 390 px; the `flex-wrap` rule is in place, a further tweak would be a request back to this file's owner. |

**Risks.**

1. **Substring false positive on text checks.** `derivative-readout includes 'f′(z₀) = 0'` also matches `f′(z₀) = 0.5 ...`; with the default function and point (|z|^2 at 1 + i) it cannot, and the armed rule blocks a free tick. Changing the function can tick the stop early; acceptable.
2. **Check ids of siblings** (R4): until they land U7 skips two ids and the interaction script does not cover the `lab` and `rehearse` stops.
3. **No `:has()` anywhere.** The clearance relies on `body[data-walk]` and `--walk-h` set on `<html>`, not on `:has()`, so no modern-selector support is needed. `mask-image`, `color-mix` and `conic-gradient` are used with fallbacks (the grid ends at the edge without the mask; `--grid-ink` falls back to `--border`; the badge needle is cosmetic).
4. **The footer pull-up** (`margin-top: -H`) is deliberate and commented; if a future layout puts something absolutely positioned in `#view`'s bottom padding it would sit under the footer.
5. **The `scroll-padding-bottom` behaviour** was verified in Chromium (the engine of `tools/smoke.mjs`); other engines honour it too (it is the same property the header's `scroll-padding-top` already relies on).
6. **Phone bar height** is about a quarter of the screen when expanded; the fold and the body's `max-height` bound it. If a reviewer finds it too tall, the first knob is the body's `32dvh`, the second a default of folded on phones.

## 11. Build order

1. `css/theme.css` (two lines) and `css/components.css` (3.2: in-place edits, then sections 5, 6, 7). Load `home` and a station with the walk off; check the pill, the badges, the backdrop.
2. `index.html` brand mark; check both themes at 1280 and 390.
3. `js/core/walk.js`: the pure functions first (5.2, 5.3), run U1; then `createWalk` (5.4 to 5.10).
4. `js/app.js` (5.11); run `tests/unit/i1-shell.test.mjs` and `architecture-sync` (update the one import-list test); fix `tests/interact/i1-shell.mjs` (21 becomes 22).
5. `tests/unit/i2-walk-shell.test.mjs`, then `tests/interact/i2-walk-shell.mjs`; run 7.1 in order A1, A2, A3, A5, A7, A4, A6.

---

## 12. Build notes (stage 3, written by the builder)

Built as designed: `js/core/walk.js` (eight exports, one import), `js/app.js` (the edit list of 5.11), `index.html` (the brand mark only), `css/theme.css`
(`--walk-h` and the `scroll-padding-bottom` line), `css/components.css` (the in-place edits and sections 5, 6, 7), `tests/unit/i2-walk-shell.test.mjs`
(U1 to U10, 29 tests), `tests/interact/i2-walk-shell.mjs` (O, A2, X1 to X8, K, A3, C), plus the two owned i1 files (`i1-shell.test.mjs`: the six import
specifiers; `i1-shell.mjs`: 22 places). Small deviations, each the smallest that works:

| # | Deviation | Why |
|---|---|---|
| B1 | The interaction script clicks `#distance-mode-circle` before it drags `distance-plane-a` (A2 step 8). | `#distance` (the registry's Walk route) opens the station on two points, where the handles `a` and `R` the stop's check names are hidden (`modeFromPreset`: only `problem-1-2-1` or the token `circle` opens the circle). The check can never tick for a student who follows the `do` text from the Walk's own link. Request R7 below. |
| B2 | `detach()`'s settle timer waits while `#view[data-state="loading"]` instead of rendering the away state after 220 ms. | A station whose module takes more than 220 ms (first visit to the Lab or the 4D graph) would flash "This page is not one of the stops" while it loads. The router already marks the loading state; an error or No-such-place panel is not "loading", so those still settle to the away state. |
| B3 | Phone only (`max-width: 30rem`): `.walk-step` padding 0.65 rem and `.walk-label` 0.95 rem. | At 390 px the 1 rem padding left the title 152 px and `Stop 5 of 22 · The Staircase: z, arg z, Arg z` was cut after two words. The bar's height is unchanged (the label still clamps at two lines). |
| B4 | The script saves viewport shots (`<route>--<label>--bar-<name>.png`) next to the harness's own files. | The harness's `shot()` is a full-page capture, where a fixed bar floats in the middle of the page; a reviewer needs to see what the student sees. |
| B5 | `--walk-h` is asserted to be within 1 px of the bar's `offsetHeight` (it is `ceil` of the fractional height). | `offsetHeight` rounds, `getBoundingClientRect().height` does not (160.4 gives 161 and 160). |

Measured in this build (Chromium, `--dark`): bar 160 px at 1280 (stop 5 with the longest line), 248 px on the 390 px phone expanded, about 92 px folded; the
three thread-badge needles point at 0, 60 and 120 degrees; the full `node tools/smoke.mjs --dark` passes 63 of 66 (the three `rehearse` checks wait for `i2-rehearse`).

**Requests for other owners (also in the build report).**

| # | To | Request |
|---|---|---|
| R7 | `js/registry.js` (the planner) | `distance` walk.route should open the circle mode: `problem-1-2-1` (the stop's own problem chip already links there) or `distance-circle`; then A2 step 8 and the goal text (`hash '#distance'`) change with it. Until then the script clicks the chip (B1). |
| R8 | `docs/ARCHITECTURE.md` (the integrator) | R3 above, plus: `walk.js` waits for `#view[data-state="loading"]` before showing the away state (B2); the class names `.walk-dot-link`, `.walk-step`, `.walk-fold` and the ids `walk-dot-<k>`. |
