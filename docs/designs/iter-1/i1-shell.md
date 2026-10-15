# Design: i1-shell (app shell, tokens, router, theme and store)

Goal: `i1-shell` (iteration 1, wave 0, kind foundation). Designer: stage 2.
Owns: `index.html`, `css/theme.css`, `css/components.css`, `js/app.js`, `js/core/theme.js`,
`js/core/store.js`; plus the automatic `tests/unit/i1-shell.test.mjs` and
`tests/interact/i1-shell.mjs`.
Reads: `docs/ARCHITECTURE.md` 3.13, 3.14, 4, 6, 7; `docs/CONSTRAINTS.md`; `js/registry.js`
(exists), `tools/smoke.mjs` (exists).

**How to use this document.** Sections 1 to 9 are the design. Appendix A is a *reference
implementation* of all six owned files and Appendix B the two test files. They were written and
run in a scratch prototype outside the repo (nothing in the repo was touched except this file),
against the real `js/registry.js` and the real `tools/smoke.mjs`. Every number in this document
that says "measured" or "passes" comes from that run. The builder reproduces the appendices;
anything it changes must be reported as a deviation. Where a sentence in sections 1 to 9 and the
appendix code disagree, the sentence wins and the disagreement is a bug in the appendix.

---

## 0. Findings that shaped this design (read first)

1. **No external fonts.** CONSTRAINTS allows a Google Fonts `<link>` but `tools/smoke.mjs` aborts
   the font hosts and still counts the failed load. Measured: a plain
   `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` makes every smoke run fail with
   `console.error: Failed to load resource: net::ERR_FAILED`, which would fail acceptance A2. The
   shell therefore loads nothing from any other host and uses system font stacks
   (`--font`, `--font-display`, `--font-mono`). Nobody may add a Google Fonts `<link>` in iteration
   1 without first changing the harness. The site also works fully offline, which the assignment
   asks for.
2. **Exercising the error path makes the harness exit 1 by design.** The router must call
   `console.error` when a station fails, and the harness reports every `console.error`, failed
   request and HTTP 4xx as a problem. So `node tools/smoke.mjs --route nosuchplace --script
   tests/interact/i1-shell.mjs` prints known problem lines and exits 1. Section 7 lists exactly
   which lines are expected; the run is correct when it prints no `interaction script failed` line
   and nothing outside that list. Measured with and without `js/stations/distance.js`.
3. **`npm test` is broken on this Node (v22.22).** `package.json` has `node --test tests/unit/`;
   Node 22 does not expand a directory argument and exits 1 with
   `Cannot find module '.../tests/unit'` before running any test. `node --test tests/unit/*.test.mjs`
   and bare `node --test` both work. The shell goal does not own `package.json`; see the request in
   section 10. All commands below use the file form.
4. **A skip link to `#view` collides with hash routing.** `<a href="#view">` would put `#view` in
   the address bar and the router would answer "No such place". The skip link gets a click handler
   that calls `preventDefault()` and focuses `#view`. Verified: hash unchanged, `#view` focused.
   Rule for all stations: every `href="#x"` is a route; no in-page anchors.
5. **`window.__mv` must be created with `planes`.** `core/plane.js` registers planes in
   `window.__mv.planes` using `window.__mv = window.__mv || { planes: new Map() }`. If the shell
   created `window.__mv = {}` first, that `||` would keep the empty object and `planes.set` would
   throw. The shell creates `{ planes: new Map() }` exactly, and adds only `__mv.app`.
6. **Registry facts that differ from, or are missing in, ARCHITECTURE.** The registry has `part`
   letters `I` to `V` but no part names, so `app.js` owns `PART_TITLES`. `home` is in part `I` and
   `problems` in part `V`. There are 21 stations with `order` 0 to 20. No station id is a prefix
   of another followed by `-` (checked), so the "longest prefix" rule never has a real tie today.
   Exports match ARCHITECTURE: `THREADS`, `STATIONS`, `stationForProblem`, `stationForTopic`,
   `stationById`. CONSTRAINTS says `ctx` is `{ navigate(id), stations, store }`; ARCHITECTURE 3.14
   gives the full shape; this design follows ARCHITECTURE (a superset).
7. **KaTeX is defined before the app boots.** With `<script src="vendor/katex/katex.min.js" defer>`
   in `<head>` and the boot as an inline module later in the document, `typeof window.katex` is
   `'object'` at the moment `start()` runs (measured), and `katex.renderToString` works. `defer`
   keeps the 275 KB script from blocking first paint.
8. **A failed station import cannot be retried inside the page.** Measured in Chromium (fix
   round 1): after `import('/js/stations/x.js')` fails with a 404, the file is fixed, and the same
   `import()` is run again, it fails again; the browser keeps the failed module in its module map
   for the life of the page. A new query string (`x.js?r=1`) does fetch again, but a station's
   *own imports* stay failed: a dependency that 404s once is never fetched again, whatever the
   station's URL. Most of the files a station loads are shared core modules, so a "Try again"
   that only re-imports the station recovers from a minority of real failures. The button on the
   panel therefore reloads the page ("Reload the page"). The tests that retried `data:` URLs
   passed while the real thing failed, so the interaction script now fails a real http fetch once
   (via `page.route`) and checks that the reload recovers.
9. **A link to the place already showing fires no `hashchange`.** The router closes the drawer on
   every render, so tapping the current place in the open phone drawer (most often "The Map"
   while on `#home`) left the drawer open over the page and looked like a dead control. The nav
   itself now closes the drawer on any link activation.

---

## 1. Goal restatement, story thread, coverage

**Restatement.** Build the frame every other goal plugs into: the page (`index.html`), the design
tokens in light and dark (`css/theme.css`), the shared component styles (`css/components.css`),
the hash router that mounts one station at a time and never shows a blank page (`js/app.js`), and
two small helpers, theme (`js/core/theme.js`) and store (`js/core/store.js`). The deliverable is
that `index.html#anything` shows a header (title link to `#home`, a menu built from the registry
and grouped by part) and either the station or a friendly panel.

**Story thread carried.** All three threads, through the visual vocabulary rather than through a
station. On screen:

- The **brand mark** in the header is the whole story at 32 px: a point, blue dashed drop lines to
  the axes (its Cartesian address) and an orange ray with an arc (its polar address).
- The **menu** puts a small dot beside each place for each story thread that passes through it:
  solid blue T1, dashed orange T2, solid purple T3. The dashed ring is a shape cue so colour is not
  the only signal. The menu is therefore the Story Map's spine on every page.
- The **colour key** (a closed `<details>` in the footer of every page) says what the marks mean
  everywhere: blue = Cartesian, orange = polar, green = input, purple = output, the dark-to-bright
  strip = time `t` from 0 to 1, a solid arc = `Arg z`, faint extra arcs = the set `arg z`, a dashed
  grey ray = the seam. This is where the `arg` versus `Arg` distinction is first drawn for the
  student, with the same line styles the plane widget will use.
- `[data-thread]` and `[data-tone]` attributes give every station thread colours and tone colours
  with no JavaScript (`.thread-badge`, `.panel[data-tone]`, `.chip[data-tone]`, sliders).
- The **No such place** panel lists all 21 places with their one-line summaries: even a wrong link
  lands on the map in text form.

**Review problems and topics covered.** None is solved here (assignment_refs T1.1 and T1.3 only
mean the shell carries the two-address vocabulary, T1.1 the Cartesian address and T1.3 the polar
one, as colours). What the shell does own for the problems is **the deep link to every one of
them**: `#problem-<id>` for all 29 problems and `#topic-<id>` for all 12 topics must resolve to the
station that owns it, with the id passed to the station as `ctx.preset`. The full table with
hand-checked owners is section 6.1.

---

## 2. UX

### 2.1 Page anatomy and wireframes

Landmarks in DOM order: skip link, `<header>`, `<nav>`, `<main id="view">`, `<footer>`, a visually
hidden live region. `<h1>` belongs to the station (the shell has none, so each page has exactly one).

**Desktop, 1280 x 860 (also the desktop-dark view).** Sidebar from 900 px up.

```
+--------------------------------------------------------------------------------------------+
| [mark] One Point, Two Addresses                                                    [ moon ] |  #site-header
+----------------------+---------------------------------------------------------------------+  sticky, 56 px
| I  THE POINT  Ch. 1  | <main id="view" tabindex="-1" data-state="ready" data-station="roots"   |
| .  The Map     o :o  |       data-route="problem-1-4-2">                                       |
| 1  One Point,  o :   |   +-- <section class="station" id="station-roots"> ------------------+ |
|    Two Addresses     |   |  the station's own header, planes, explainer, station-links      | |
| 2  Slide, Spin, o    |   |  (everything inside the section belongs to the station)          | |
| 3  Length, ...  o    |   +-------------------------------------------------------------------+ |
| 4  The Staircase :   |                                                                         |
| 5  Powers       o :  |                                                                         |
| 6  Roots        :o   |   <- aria-current="page": 3 px left bar, bold, --surface-2 fill         |
| II CURVES AND SETS   |                                                                         |
| 7  Curves and Time o +---------------------------------------------------------------------+
| ...                  | A study map for MAT 412 Test 1, Chapters 1 to 3. It runs in your browser |
| V  THE DIARY, INDEX  | and works offline.                                                       |
| 20 The Problem Index | > Colour key                                                             |
+----------------------+---------------------------------------------------------------------+
  #site-nav: sticky, 17.5rem,        #view and the footer: max 72rem, centred in the right column
  scrolls on its own                 o solid dot = T1 blue or T3 purple;  :o dashed ring = T2 orange
```

**Phone, 390 x 844.** One column. The menu is a drawer opened by the right-hand header button.

```
 drawer closed                          drawer open (button pressed, aria-expanded="true")
+----------------------------------+   +----------------------------------+
|[mark] One Point, Two Addr.. [o] [=]  |[mark] One Point, Two Addr.. [o] [=]|  header stays visible
+----------------------------------+   +----------------------------------+
| <main id="view">                 |   | I  THE POINT            Chapter 1|  position: fixed,
|                                  |   | .  The Map                  o :o |  top: 56 px, bottom: 0,
|  station content, one column     |   | 1  One Point, Two Addresses  o : |  scrolls inside itself,
|  (.two-planes stacks)            |   | 2  Slide, Spin, Stretch, Mirror o|  covers the page
|                                  |   | ...                              |
+----------------------------------+   +----------------------------------+
| footer, > Colour key             |   [o] = theme toggle,  [=] = Places
+----------------------------------+
```

**No such place (any width).** Rendered straight into `#view` (no station section).

```
+----------------------------------------------------------------------+
| No such place                                           (h1, panel)  |
| Nothing lives at #nosuchplace.                                       |
| The link may be mistyped or from an older version. Pick a place      |
| below, or go back to the map.                                        |
| Problem links look like #problem-1-4-2 or #problem-P3. Topic links   |
| look like #topic-T2-4.                                               |
| [ Back to the map ]                                                  |
| All the places                                            (h2)       |
| .  The Map                          1  One Point, Two Addresses      |
|    The four-line spine ...             Drag one point; its ...        |
| 2  Slide, Spin, Stretch, Mirror     3  Length, Distance, Circles     |
| ...  21 entries, two columns from about 720 px, one column on phone  |
+----------------------------------------------------------------------+
```

**Under construction (a station failed to import or mount).** Inside the station section, so
`#station-<id>` exists and has a child.

```
+-----------------------------------------------+
|#| Length, Distance, Circles            (h1)    |  #| = 6 px --warn bar on the left
|#| This station is under construction.          |
|#| It did not load. If your connection dropped, |
|#| reload the page. If not, there is nothing to |
|#| draw here yet. The rest of the map still works.|
|#| [ Back to the map ] [ Reload the page ]       |
|#| > What went wrong     (details, closed; the error message in a <pre>)
+-----------------------------------------------+
```

**Loading.** After 150 ms without a mounted station, `.loading` is appended to the section:
a 1.1 rem ring spinner and "Loading...". Before 150 ms nothing flashes.

### 2.2 Controls

| id | element | label (visible or accessible name) | behaviour |
|---|---|---|---|
| `skip-link` | `a href="#view"` | "Skip to the page" | First Tab stop, off screen until focused. Click or Enter: `preventDefault`, close the drawer, focus `#view`. The hash does not change. |
| `site-header` | `header` | none | Sticky, height `--header-h` (3.5rem). |
| `site-title` | `a href="#home"` | brand mark plus "One Point, Two Addresses" | Navigates home. Title text truncates with an ellipsis rather than wrapping. |
| `theme-toggle` | `button`, `aria-pressed` | `aria-label="Dark theme"`, tooltip "Switch between light and dark" | `setTheme(getTheme() === 'dark' ? 'light' : 'dark')`. `aria-pressed` is `true` when dark. Icon: moon in light, sun in dark (from tokens `--icon-moon`, `--icon-sun`). |
| `nav-toggle` | `button`, `aria-expanded`, `aria-controls="site-nav"` | `aria-label="Places"`, tooltip "Show the places" | Phone only (hidden from 900 px). Toggles the drawer. |
| `site-nav` | `nav` | `aria-label="Places on the map"` | Built by `start()` from the registry: 5 `section.nav-part` (`p.nav-part-title` plus `ul.nav-list`), 21 `a.nav-link`. Phone: closed drawer by default. Desktop: sticky sidebar. |
| `nav-<station id>` | `a.nav-link href="#<id>"` | number and title (the number and dots are `aria-hidden`) | Normal link. Current place has `aria-current="page"`. Home shows a middle dot instead of 0. Any activation closes the drawer (a click handler on `#site-nav`), including a link to the place already showing, which fires no `hashchange`; in that case focus goes to `#view`. |
| `view` | `main`, `tabindex="-1"` | none | Router target. Carries `data-state` (`loading`, `ready`, `error`, `nosuchplace`), `data-station` (id or empty), `data-route` (raw token, or `home`). After a navigation (not the first load) it receives focus without scrolling. Its focus outline is removed on purpose (a container, announced through `route-status`). |
| `route-status` | `div.sr-only role="status"` | none | Set to the place title after each navigation, "No such place", or "<title>: under construction". |
| `site-footer` | `footer` | none | One sentence and the colour key. |
| `colour-key` | `details` (closed) | `summary` "Colour key" | Nine entries (section 3.3). |
| `no-such-place`, `no-such-place-list`, `no-such-place-home` | panel, `ol`, link | "No such place", "All the places", "Back to the map" | The unknown-route panel. It never carries `data-station-error`. |
| `under-construction-home`, `under-construction-retry`, `under-construction-detail` | link, button, `pre` | "Back to the map", "Reload the page", "What went wrong" | The button calls `location.reload()`; the hash stays, so the same place comes back. It is not a second `import()`: see finding 8. The panel has no `role`; `#route-status` is the one live region that announces the failure. |

### 2.3 Interaction

**Pointer.** Hover darkens links and buttons to `--surface-2`. The menu's current item is filled
and barred. Controls are at least 44 px (`--tap` 2.75rem) in both axes except chips (36 px,
44 px for `button.chip`) and problem chips (32 px).

**Touch.** Header buttons and nav links are 44 px. `touch-action: manipulation` on controls removes
the double-tap delay. The drawer scrolls inside itself (`overscroll-behavior: contain`). A press
anywhere outside the drawer and its button (the header counts as outside) closes it. Choosing a
place closes it: the router closes it on every navigation, and a click handler on the nav closes it
for a link to the place that is already showing (no `hashchange` follows, so the router would never
run). While the drawer is open the page behind it cannot scroll (`overflow: hidden` on `body`) and
`#view` and the footer are `inert`, so a swipe or a Tab cannot reach what is hidden.

**Keyboard.**

| Key | Where | Result |
|---|---|---|
| Tab | page start | skip link, then title link, then theme toggle, then (phone) nav toggle or (desktop) first nav link, then the rest of the nav, then `#view` contents, then the footer (phone, drawer open: the nav is the last stop, because `#view` and the footer are `inert`) |
| Enter or Space | any control | activates it |
| Enter | skip link | focus moves to `#view`; hash unchanged |
| Escape | drawer open | closes the drawer; if focus was inside the drawer it returns to `nav-toggle` |
| browser Back or Forward | anywhere | the `hashchange` handler remounts the matching place |

Every control shows a 3 px `--focus` outline with 2 px offset (inside the scroll box for nav links,
offset -3 px, so the drawer does not clip it). The shell binds no global shortcuts, so plane widgets
keep `+`, `-` and the arrows for themselves.

### 2.4 States

| State | What the student sees | How it is reached |
|---|---|---|
| Ready | the station inside `section#station-<id>` | normal |
| Loading | nothing for 150 ms, then "Loading..." with a spinner in the section | slow import |
| Under construction | panel with the place title, "This station is under construction.", back and reload buttons, the error text collapsed | import fails, `mount` missing or throws |
| No such place | panel with the token and all 21 places | unknown or malformed token |
| JavaScript off | panel "JavaScript is off" (a `<noscript>` inside `#view`) | scripting disabled |
| Opened from a file | panel "Open this from a web server" with the exact command | `location.protocol === 'file:'` |
| Boot failure | panel "The page could not start" (`data-boot-error`), console error | `app.js` fails to load or `start()` throws |
| Storage blocked | nothing visible; theme still switches for the page's life; store works in memory | `localStorage` throws |
| Empty registry | the menu says "No places are registered." | impossible today, guarded |

### 2.5 Copy (exact text)

| Where | Text |
|---|---|
| title and brand | One Point, Two Addresses |
| skip link | Skip to the page |
| nav label | Places on the map |
| part headings | I The point (Chapter 1); II Curves and sets (Chapter 1); III Motions (Chapter 2); IV Zoom (Chapter 3); V The diary and the index (Lab, 4D, problems) |
| footer | A study map for MAT 412 Test 1, Chapters 1 to 3. It runs in your browser and works offline. |
| No such place | h1 "No such place"; "Nothing lives at #<token>."; "The link may be mistyped or from an older version. Pick a place below, or go back to the map."; "Problem links look like #problem-1-4-2 or #problem-P3. Topic links look like #topic-T2-4."; button "Back to the map"; h2 "All the places" |
| Under construction | h1 = place title; "This station is under construction."; "It did not load. If your connection dropped, reload the page. If not, there is nothing to draw here yet. The rest of the map still works."; buttons "Back to the map", "Reload the page"; summary "What went wrong" |
| Loading | Loading... |
| No JavaScript | h1 "JavaScript is off"; "This study map needs JavaScript. Turn it on and reload the page." |
| file:// | h1 "Open this from a web server"; "This page cannot run straight from a file. In a terminal, in this folder, run npx http-server -c-1 -p 8080 . and open http://localhost:8080 in your browser." |
| Boot failure | h1 "The page could not start"; "Reload it. If it keeps happening, the details are in the browser console." |
| Colour key | summary "Colour key"; nine entries in section 3.3 |

The token shown in "Nothing lives at" is set with `textContent` and cut to 60 characters with
`...`. Nothing from the URL is ever put through `innerHTML`.

### 2.6 What the shell gives station builders (component catalogue)

All styles are in `css/components.css`; the widget modules inject their own (plane, explainer,
staircase, domain colouring, 3D). Station builders use these, they do not restyle them.

| Class | Use | Notes |
|---|---|---|
| `.station` | the section the router creates | flex column, 1.5 rem gap, children may shrink (`min-width: 0`) |
| `.station-header`, `.station-lede` | first block of a station: `h1`, a one-paragraph lede, then badges and problem chips | lede is muted, 62ch |
| `.thread-badges` > `.thread-badge[data-thread="T1"]` | the thread pills | border and dot take the thread colour; T2 dot is a dashed ring |
| `.chips`, `.chip`, `.problem-chip` | mode and preset buttons, problem links | `aria-pressed="true"` or `.is-active` fills with a tint of `--tone` (set `data-tone`); `data-answer="yes"` solid ok border, `"no"` dashed grey border |
| `.btn`, `.btn-primary`, `.btn-quiet`, `.icon-btn` | buttons | 44 px high |
| `.slider-row` | `label`, `input[type=range]`, `output` | stacks label above the range under 480 px; `data-tone` colours the slider |
| `.field`, `input`, `select`, `textarea`, `.check`, `input.num` | form controls | 44 px, 1.5 px strong border |
| `.readout` | the plain-text line scripts assert on | mono, wraps, `white-space: pre-wrap` |
| `.two-planes` | z-plane and w-plane | grid, two columns when the container is at least about 760 px, else one |
| `.panel`, `.panel-title`, `.panel[data-tone]` | boxed section; tone adds a 4 px top bar | |
| `.card`, `.card-grid`, `.card[data-tone]` | the problem and topic cards | grid min column 21 rem |
| `.callout` | "why this address" notes | tone left bar |
| `.badge[data-tone]` | tiny labels such as C and P | |
| `.station-links`, `.station-link[data-dir="prev"/"next"]` | the nav at the end of a station | arrows are `::before` or `::after` text |
| `.tone-cart`, `.tone-polar`, `.tone-input`, `.tone-output` | colour a word | blue, orange, green, purple |
| `[data-tone]`, `[data-thread]` | set `--tone` | `cart`, `polar`, `input`, `output`, `accent`; `T1`, `T2`, `T3` |
| `.muted`, `.mono`, `.nowrap`, `.row`, `.stack`, `.grow`, `.sr-only`, `.lede` | utilities | |
| `.tex-error`, `.katex-display`, `.tex-scroll` | maths fallbacks | a wide display formula scrolls inside its box, never the page |
| `.loading`, `.spinner`, `.under-construction`, `.fatal`, `.error-details` | router states | |

---

## 3. Visual encoding

### 3.1 Tokens, both themes

Every token is defined in the light `:root` block and again in both dark blocks:
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` and
`:root[data-theme="dark"] { ... }`. The two dark blocks are identical (a test checks it) and set
`color-scheme: dark`; the light block sets `color-scheme: light`. `body` sets
`background: var(--bg)`. Contrast ratios are WCAG 2.x, computed with the formula in section 6.2 and
cross-checked in two independent implementations (Node and Python).

Light (`--bg #f6f3ec`, `--surface #ffffff`, `--surface-2 #ece8de`):

| token | value | on bg | on surface | on surface-2 | role |
|---|---|---|---|---|---|
| `--text` | `#1a2230` | 14.41 | 15.96 | 13.05 | body text |
| `--text-muted` | `#515b6c` | 6.19 | 6.86 | 5.60 | secondary text |
| `--border` | `#d8d2c4` | decorative, 1.51 on surface | | | dividers |
| `--border-strong` | `#757d8d` | 3.73 | 4.14 | 3.38 | control outlines |
| `--accent` | `#2f3e5c` | 9.65 | 10.69 | 8.74 | links, primary button (neutral on purpose: blue and orange mean something) |
| `--on-accent` | `#ffffff` | 10.69 on `--accent` | | | text on accent |
| `--focus` | `#1a2230` | 14.41 | 15.96 | 13.05 | focus ring |
| `--cart` | `#0b63ad` | 5.57 | 6.17 | 5.04 | Cartesian, blue |
| `--polar` | `#a84300` | 5.46 | 6.06 | 4.95 | polar, orange |
| `--input` | `#006e53` | 5.65 | 6.26 | 5.12 | z-plane strokes, green |
| `--output` | `#9d3a8a` | 5.56 | 6.17 | 5.04 | w-plane strokes, purple |
| `--seam` | `#6b7384` | 4.30 | 4.76 | 3.89 | the seam, grey |
| `--t0` | `#101a30` | 15.63 | 17.32 | 14.16 | time ramp start (dark), luminance 0.0106 |
| `--t1` | `#6d83a6` | 3.48 | 3.86 | 3.15 | time ramp end (brighter), luminance 0.2224 |
| `--ok` | `#26702a` | 5.52 | 6.12 | 5.00 | |
| `--warn` | `#845b00` | 5.45 | 6.04 | 4.94 | |
| `--danger` | `#b3261e` | 5.90 | 6.54 | 5.34 | |

Dark (`--bg #0d121c`, `--surface #151c2b`, `--surface-2 #1e2739`):

| token | value | on bg | on surface | on surface-2 |
|---|---|---|---|---|
| `--text` | `#e9edf5` | 15.97 | 14.52 | 12.74 |
| `--text-muted` | `#a6b0c3` | 8.59 | 7.80 | 6.85 |
| `--border` | `#2b3650` | decorative, 1.42 on surface | | |
| `--border-strong` | `#7480a0` | 4.76 | 4.33 | 3.80 |
| `--accent` | `#cfd8ea` | 13.09 | 11.89 | 10.44 |
| `--on-accent` | `#0d121c` | 13.09 on `--accent` | | |
| `--focus` | `#e9edf5` | 15.97 | 14.52 | 12.74 |
| `--cart` | `#62adf2` | 7.84 | 7.12 | 6.25 |
| `--polar` | `#ff9d5c` | 9.13 | 8.30 | 7.28 |
| `--input` | `#3fd0a0` | 9.59 | 8.71 | 7.65 |
| `--output` | `#e48fd2` | 8.17 | 7.43 | 6.52 |
| `--seam` | `#8e99b0` | 6.55 | 5.95 | 5.22 |
| `--t0` | `#5c7498` | 3.93 | 3.57 | 3.14 (luminance 0.1703) |
| `--t1` | `#f3f6fb` | 17.30 | 15.72 | 13.80 (luminance 0.9193) |
| `--ok` | `#63d08a` | 9.75 | 8.86 | 7.77 |
| `--warn` | `#e3b341` | 9.63 | 8.75 | 7.68 |
| `--danger` | `#ff8178` | 7.73 | 7.03 | 6.17 |

Other theme-dependent tokens: `--ghost-alpha` 0.35 in both themes (the faint arcs; the plane goal caps
ghost windings at 0.35, and a test enforces `<= 0.35` in all three blocks), `--shadow`,
`--icon-sun` (`none` light, `block` dark), `--icon-moon` (`block` light, `none` dark).
Theme-independent tokens, in the light block only: `--font`, `--font-display`, `--font-mono`,
`--radius` 10px, `--radius-sm` 6px, `--space-1` to `--space-5` (0.25, 0.5, 1, 1.5, 2.5 rem),
`--gutter` 1rem, `--tap` 2.75rem, `--header-h` 3.5rem, `--sidebar-w` 17.5rem, `--content-max` 72rem.

The time ramp runs dark to bright in both themes, so `--t0` and `--t1` are not the same pair: in
light the dark end is near-black and the bright end is the lightest colour that still has 3:1 on
white; in dark the dark end is the darkest colour that still has 3:1 on the dark surface and the
bright end is near-white. Luminance of `--t0` is below that of `--t1` in both (tested).

### 3.2 The two-address code in the chrome

| Element | Colour and shape |
|---|---|
| brand mark | axes `--text-muted`; two drop lines `--cart`, dashed; ray and arc `--polar`, solid; the point `--text` |
| nav dot T1 | solid disc `--cart` |
| nav dot T2 | dashed ring `--polar`, transparent centre |
| nav dot T3 | solid disc `--output` |
| thread badge | 1.5 px border and a 0.6 rem dot in the thread colour (T2 dashed ring) |
| current nav item | 3 px bar `--accent`, `--surface-2` fill, bold (not a tone colour) |
| input versus output | `--input` green on the z side, `--output` purple on the w side; the shell only supplies the tokens and `[data-tone]` |
| time | the ramp swatch in the key is `linear-gradient(90deg, var(--t0), var(--t1))` |

Colour is never the only cue. Cartesian marks are dashed drop lines and grid lines; polar marks are
the solid ray, the arc, circles and rays; input and output sit in different planes with `z` and
`w` labels; time has quarter dots and an arrowhead as well as the ramp; T2 is a dashed ring.
Simulated colour-vision deficiency (Machado matrices, CIELAB distance): the pair that matters
most, Cartesian blue against polar orange, stays at least 83 apart in the worst case (dark,
protanopia) and 89, 104, 94 in light for protanopia, deuteranopia, tritanopia. The weakest pairs
(blue against purple under protanopia, 12; purple against the grey seam under deuteranopia, 10) are
always separated by another cue, as the table above says.

### 3.3 arg versus Arg, and the key

The key is `details#colour-key` in the footer. Its nine entries, in order, with the mark drawn
from tokens:

| mark | text |
|---|---|
| blue swatch | Blue is the Cartesian address: where z sits. Across by x, up by y. Slides and grid lines. |
| orange swatch | Orange is the polar address: how to reach z. Turn by θ, stretch by r. Rays and circles. |
| green swatch | Green is the input: what you drag or draw in the z-plane. |
| purple swatch | Purple is the output: where f sends it, in the w-plane. |
| ramp swatch | Dark to bright is time, from t = 0 to t = 1. Input and output run on one clock. |
| neutral axis and ray (`--border-strong`), one solid `--polar` arc | A solid arc is Arg z: the one angle we agreed to use, in (-π, π]. |
| the same axis and ray, three concentric `--polar` arcs at `--ghost-alpha` | Faint extra arcs are arg z: the whole set of angles θ + 2πk. |
| dashed `--seam` line | A dashed grey ray is the seam: the negative real axis, where Arg jumps from π to -π. |
| three lines blue solid, orange dashed, purple solid | The dots in the menu show which story threads pass through a place: T1 solid blue, T2 dashed orange, T3 solid purple. |

The two angle marks are small inline SVG (viewBox 52 by 18): the axis and a ray at 50 degrees from
the origin (12, 16) in one `path.key-axis`; Arg is one arc of radius 12 at 2.8 px; arg is one
`path.arg-ghost` of three arcs (radii 6, 10, 14) at 1.9 px, so the fade is applied once and the
arcs stay separate. A straight line could not say "one representative of a set"; arcs can.

Both themes: every mark reads its colour from a token, so the key re-tints with the theme with no
JavaScript.

### 3.4 Typography, spacing, shape

System stacks only (no network): `--font` is `system-ui, -apple-system, "Segoe UI", Roboto, ...`,
`--font-display` (headings, brand) is a Palatino and Georgia stack, `--font-mono` is `ui-monospace`
and friends. Body 1.0625 rem (17 px), line height 1.55. `h1` is `clamp(1.6rem, 1.25rem + 1.5vw,
2.25rem)`. Panels have a 10 px radius and a one-token shadow; cards have the same radius without a shadow. The page is warm paper
(`--bg`) with white panels in light, and deep navy with lifted panels in dark.

---

## 4. Module API

### 4.1 `index.html` contract

Head order: charset, viewport, `color-scheme`, `theme-color` (id-less; theme.js keeps it equal to
`--bg`), description, `<title>One Point, Two Addresses</title>`, an inline SVG data-URI favicon (so
no browser ever asks the static server for `/favicon.ico`; the headless harness did not ask in a test,
a student's browser does, and GitHub Pages would answer 404), the inline pre-paint theme script,
`vendor/katex/katex.min.css`, `css/theme.css`, `css/components.css`, then
`<script src="vendor/katex/katex.min.js" defer>`. No other host is referenced anywhere.

Body order: skip link, header (`#site-header` > `.brand` > `#site-title` with the SVG mark;
`.header-actions` > `#theme-toggle`, `#nav-toggle`), `nav#site-nav` (empty, filled by `start()`),
`main#view` (a `<noscript>` panel inside), `footer#site-footer` (sentence, `details#colour-key`),
`div#route-status`, the file:// guard script, then the boot module:

```js
import('./js/app.js').then((m) => m.start()).catch((err) => { /* console.error + data-boot-error panel */ });
```

The pre-paint script (classic, inline, in `<head>`) reads `localStorage['mv:theme']` in try/catch
and sets `data-theme` on `<html>` when it is exactly `'light'` or `'dark'`.

### 4.2 `js/core/theme.js`

```js
export function cssVar(name: string): string            // computed value on <html>, trimmed; '' on failure
export function getTheme(): 'light' | 'dark'            // data-theme if set, else the OS preference, else 'light'
export function setTheme(t: 'light' | 'dark' | 'auto'): void
export function onThemeChange(cb: (theme: 'light' | 'dark') => void): () => void
export function prefersReducedMotion(): boolean
export function initTheme(): () => void                 // idempotent; returns dispose
```

- `setTheme('light'|'dark')` sets `data-theme` on `<html>`, writes the raw string to
  `localStorage['mv:theme']` (try/catch), updates `<meta name="theme-color">` to the new `--bg`,
  then dispatches one `themechange` on `document`. `'auto'` removes the attribute and the stored
  key and dispatches. Any other value: `console.warn`, no change, no event.
- **Event.** `document` `CustomEvent('themechange', { detail: { theme, mode } })`; `theme` is the
  effective theme after the change (`'light'` or `'dark'`), `mode` is what was requested
  (`'light'`, `'dark'`, `'auto'`). `core/plane.js` listens to this event directly.
- `onThemeChange(cb)` adds a `document` listener that calls `cb(detail.theme)` with errors caught
  and logged; returns the remover.
- `initTheme()` is called once by `start()`. It applies a stored choice, syncs the browser chrome
  colour, and listens to `(prefers-color-scheme: dark)`: when the OS changes and `<html>` has no
  `data-theme`, it dispatches `themechange` with `mode: 'auto'`. It never dispatches on start.
- Storage key: `mv:theme`, raw `'light'` or `'dark'`, not JSON. The store key `theme` is therefore
  reserved and must not be used.
- No top-level DOM access: the module imports in Node.

### 4.3 `js/core/store.js`

```js
export function createStore(prefix = 'mv:', options?: { storage?: StorageLike | null }): Store
// Store:
//   get(key: string, fallback?: any): any                // a fresh copy each call; fallback when absent or corrupt
//   set(key: string, value: any, opts?: { persist?: boolean }): boolean
//        // true when the value reached localStorage; false when memory only (blocked, full, persist:false, unserialisable)
//        // value undefined behaves as remove(key); persist:false also deletes any stored copy
//   remove(key: string): void
//   subscribe(key: string, cb: (value: any | undefined) => void): () => void   // this page only; sync; a throwing cb is logged and isolated
//   keys(): string[]                                      // sorted union of memory and stored keys, without the prefix
```

- Memory holds the JSON string; `get` parses it, so callers can mutate the result freely.
- Every `localStorage` access is in try/catch, including the lookup of `globalThis.localStorage`
  itself. `options.storage` exists for tests (`null` forces memory only).
- Values must be JSON-serialisable. A value that is not (circular, BigInt) is refused with a
  `console.warn` and `set` returns `false`.
- Keys in use by other goals: `progress`, `lab.strokes`, `lab.request` (written with
  `{ persist: false }`, the hand-off must not survive a reload).
- No cross-tab sync (out of scope). No top-level DOM access.

### 4.4 `js/app.js`

```js
export const SITE_TITLE: string                          // 'One Point, Two Addresses'
export const PART_TITLES: { [part: string]: { title: string, note: string } }
export function documentTitle(label?: string): string    // `${label} · ${SITE_TITLE}`, or SITE_TITLE when label is empty
export function groupStations(stations?: StationEntry[]): { part, title, note, stations: StationEntry[] }[]
export function parseRoute(hash: string): { station: string | null, preset: Preset | null, raw: string }
export function start(): () => void                      // idempotent; returns stop()
// Preset = { kind: 'problem', id } | { kind: 'topic', id } | { kind: 'token', token }
```

Imports: exactly `./registry.js`, `./core/theme.js`, `./core/store.js`.

**`ctx`** (one frozen object per mount; one store for the whole page):

```js
{ navigate(token),            // location.hash = '#' + token; if already that hash, remounts
  route,                      // the raw token ('home' when the hash is empty)
  station,                    // the registry entry (same object as in STATIONS)
  stations: STATIONS, threads: THREADS,
  preset,                     // Preset | null
  store,                      // createStore('mv:')
  theme: { cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion } }   // frozen
```

**DOM contract** (tests and later goals rely on it): `#view[data-route]`, `#view[data-station]`,
`#view[data-state]` as in 2.2; `section.station#station-<id>[data-station]`;
`.under-construction[data-station-error="<id>"]` inside that section;
`#no-such-place` directly in `#view`; `a.nav-link#nav-<id>[data-station]`;
`document.body[data-nav-open="true"]` while the drawer is open.

**Test hook:** `window.__mv.app = { render, navigate, state }`; `window.__mv` itself is
`{ planes: new Map() }` if nobody created it yet (finding 5). Removed by `stop()`.

**Events.** Listens: `hashchange` (window), `keydown` Escape and `pointerdown` (document),
`themechange` (through `onThemeChange`), the min-width 900 px media query. Dispatches none of its
own (theme.js dispatches `themechange`).

### 4.5 Lifecycle

`start()`: look up the elements (throws if `#view` or `#site-nav` is missing, which the boot
catch turns into the boot-failure panel), create the store, `initTheme()`, wire the toggles,
build the nav, install `hashchange`, publish `__mv.app`, render the first route. `stop()`:
remove every listener it added, cancel the loading timer, bump the navigation counter so any
pending import is discarded, run the current station's `unmount` in try/catch, dispose the theme
listener, remove `__mv.app`, forget it is running.

Per navigation: the previous `unmount()` runs inside try/catch before anything else; `#view` is
emptied; the new section is created; `import(st.module)` and `mount()` run inside one try/catch.
If `mount()` returns something that is not a function, the station has no cleanup and that is
accepted silently. A half-mounted station that threw cannot be cleaned (it returned nothing): its
section is emptied and replaced by the panel; window listeners it may have added leak. Stations
must attach listeners last, after anything that can throw.

---

## 5. Algorithms

### 5.1 `parseRoute(hash)`

1. `raw` = `hash` if it is a string, else `''`. Drop one leading `#`.
2. If `raw === ''` return `{ station: 'home', preset: null, raw: '' }`.
3. `miss` = `{ station: null, preset: null, raw }`. If `raw.length > 120` or `raw` has any character
   outside `[A-Za-z0-9._~-]`, return `miss` (this rejects `a=b`, `?x=1`, `/`, `%20`, spaces).
4. `lower = raw.toLowerCase()`.
5. If `lower` starts with `problem-`: `dotted` = the rest of `raw` with every `-` replaced by `.`.
   For `id` in `[dotted, dotted.toUpperCase()]`: `st = stationForProblem(id)`; if found return
   `{ station: st.id, preset: { kind: 'problem', id }, raw }`. Else return `miss`.
6. If `lower` starts with `topic-`: same with `stationForTopic`, `kind: 'topic'`.
7. If `stationById(lower)` exists return `{ station: id, preset: null, raw }`.
8. `best` = the station whose id is the longest with `lower.length > id.length + 1` and
   `lower.startsWith(id + '-')`. If found return `{ station: best.id, preset: { kind: 'token',
   token: raw.slice(best.id.length + 1) }, raw }` (the token keeps its case).
9. Return `miss`.

The router never imports `data/problems.js`; the dash-to-dot rule plus the registry is enough.
Trying the upper-case id is the "letter case is forgiven" rule (`#problem-p3`, `#topic-t2-4`).

### 5.2 Nav model and build

`groupStations`: copy and sort by `order` (stable); for each station find or create the group for
its `part` (title and note from `PART_TITLES`, or `Part <letter>` and empty note); append. Output
order is first appearance. For the real registry: parts `I, II, III, IV, V` with 7, 2, 7, 2, 3
stations.

`buildNav` (in `start`): empty `#site-nav`; if no groups, a muted line "No places are registered.";
else for each group a `section.nav-part[data-part]` with `p.nav-part-title#nav-part-<part>` (roman
numeral, name, note) and `ul.nav-list[aria-labelledby]`; each station an `li > a.nav-link#nav-<id>`
with `span.nav-num` (order, or a middle dot for 0), `span.nav-title`, and `span.nav-threads`
holding one `i.thread-dot[data-thread]` per entry of `st.threads`. All text through `textContent`.

### 5.3 `render()` (runs for the first route and on every `hashchange`)

1. `seq = ++state.seq`; clear the loading timer; run the previous station's `unmount` (try/catch);
   `first = state.first; state.first = false`.
2. `route = parseRoute(location.hash)`; `st = stationById(route.station)` when a station name was
   returned.
3. Close the drawer; empty `#view`; set `data-route` (`raw` or `home`) and `data-station`; scroll to
   the top; mark the nav (`aria-current="page"` on `#nav-<id>`, removed elsewhere; then scroll the
   sidebar so the current item is visible if it is clipped).
4. If there is no station: `data-state="nosuchplace"`, `document.title` = `documentTitle('No such
   place')`, append the panel, announce, finish.
5. Else `data-state="loading"`, `document.title = documentTitle(st.title)`, append
   `section.station#station-<id>`, start a 150 ms timer that (if still this `seq` and still loading)
   appends the `.loading` placeholder.
6. In try: `mod = await import(st.module)`; if `seq` changed, return (discard). If
   `typeof mod.mount !== 'function'` throw `Error('station module <path> has no mount() export')`.
   Cancel the timer, remove the placeholder, empty the section, `unmount = await
   mod.mount(section, ctx)` (an async mount is tolerated), and if `seq` changed meanwhile run that
   `unmount` and return. Store `{ id, unmount }` when it is a function; `data-state="ready"`; announce
   the title.
7. In catch: if `seq` changed return silently, **before** touching the timer (the timer is shared
   state that now belongs to the newer navigation; clearing it first would cancel the newer
   navigation's loading placeholder); else cancel the timer,
   `console.error('[mv] station "<id>" failed to load: <message>', err)`, empty the section and put
   the under-construction panel in it, `data-state="error"`, announce "<title>: under construction".
8. `finish(first, label)`: set the `#route-status` text; unless this is the first render, focus
   `#view` with `preventScroll`.

`navigate(token)`: strip a leading `#`; if it equals the current `location.hash`, call `render()`;
else set `location.hash`.

### 5.4 Drawer

State is one attribute, `body[data-nav-open]`. `setNavOpen(open, { restoreFocus })` returns early if
unchanged; sets the attribute and `aria-expanded`; when opening, scrolls the current item into view
inside the drawer; when closing with `restoreFocus` and focus is inside the drawer, focuses the
toggle. It also sets or removes `inert` on `#view` and `#site-footer`, so the page behind the drawer
takes no Tab stops (CSS adds `overflow: hidden` on `body` while the attribute is `true`).
Triggers: toggle click flips; Escape closes with `restoreFocus`; a `pointerdown` whose target
is outside both the drawer and the toggle closes; a click on any `a.nav-link` closes (and, when the
link's `href` equals `location.hash`, so no `hashchange` will follow, focuses `#view`); every render
closes; crossing 900 px upward (media query `change` with `matches`) closes. CSS decides what the attribute means: under 900 px the
drawer is `display: none` unless open; from 900 px the nav is always shown and the toggle is hidden.

### 5.5 Theme

Pre-paint script sets the attribute from storage. `initTheme()` repeats that (silent), syncs the
browser chrome colour, subscribes to the OS query. Toggle click: `setTheme(opposite of getTheme())`.
`onThemeChange` keeps `aria-pressed` correct. See 4.2 for `setTheme`.

### 5.6 Store

`read(key)`: memory first; else `storage.getItem(prefix + key)` in try/catch, cached on hit.
`set`: `JSON.stringify` (refuse on throw or `undefined`), write to memory, then to storage when
`persist` else remove the stored copy, notify subscribers with a parsed copy, return whether storage
accepted it. `remove`: note whether it existed, delete from both, notify `undefined` only if it
existed. `subscribe`: one entry object per call so the same callback can be added twice and removed
independently.

### 5.7 Layout and size management (there is no canvas in the shell)

- `body` is a CSS grid. Under 900 px: one column, rows `auto 1fr auto` (header, main, footer); the
  nav is `position: fixed` and out of flow. From 900 px (`min-width: 56.25rem`): columns
  `var(--sidebar-w) minmax(0, 1fr)`, areas `header header / nav main / nav footer`; the nav is
  `position: sticky; top: var(--header-h); align-self: start; height: calc(100dvh - var(--header-h))`
  and scrolls itself. `minmax(0, 1fr)` and `min-width: 0` on `#view` stop wide station content from
  widening the page.
- `#view` has `max-width: var(--content-max)` and is centred in its column.
- `.two-planes` uses `repeat(auto-fit, minmax(min(100%, 23.25rem), 1fr))`: 2 x 372 px plus a 16 px
  gap is 760 px, the architecture's breakpoint, with no media query and no dependence on the
  sidebar.
- `html` has `scroll-padding-top: calc(var(--header-h) + var(--space-3))` so focus and anchors are
  never hidden under the sticky header.
- Wide formulas scroll inside `.katex-display` and `.tex-scroll`. `img, svg, canvas, video` have
  `max-width: 100%`. Nothing sets `overflow-x: hidden` on the page, so the harness can still see a
  real overflow.

### 5.8 Timing

Only one timer and no animation loop: the 150 ms loading delay. The spinner animates (0.9 s per
turn) and is reduced to a static ring under `prefers-reduced-motion`. There are no transitions on
the drawer (it appears instantly). Scrolling is never smooth. Route change to repaint, measured in
headless Chromium: 7 ms (desktop) and 18 ms (phone, includes the 21-entry place list).

---

## 6. Mathematics

### 6.1 Deep links: the shell's share of the 29 problems and 12 topics

No review problem is computed in this goal, so there is no Cartesian or polar worked solution to
give. The one mapping the shell must get exactly right is route to owner. Rule: the id in the route
is the id in the handout with dots written as dashes (`1.4.2` is `1-4-2`, `P3` is `P3`,
`T2.4` is `T2-4`), and the owner is the **first station in Story Map order, other than `problems`,
whose list contains the id** (registry `stationForProblem` and `stationForTopic`). Hand-derived and
confirmed against the registry:

| route | station | | route | station |
|---|---|---|---|---|
| `#problem-1-1-1`, `-1-1-2` | arithmetic | | `#problem-2-2-1` | powermap |
| `#problem-1-2-1`, `-1-2-2` | distance | | `#problem-2-2-2` | principal-root |
| `#problem-1-3-1` | addresses | | `#problem-2-3-1` | limits |
| `#problem-1-3-2` | powers | | `#problem-2-4-1` | branches |
| `#problem-1-4-1`, `-1-4-2`, `-1-4-3` | roots | | `#problem-2-5-1` | reciprocal |
| `#problem-1-5-1` | curves | | `#problem-3-1-1`, `-3-1-2` | derivative |
| `#problem-1-5-2` | sets | | `#problem-3-2-1` | cauchy-riemann |
| `#problem-2-1-1` | mappings | | `#problem-P1`, `-P2` | arithmetic |
| `#problem-2-1-2` | powermap | | `#problem-P3`, `-P4` | linear |
| `#problem-2-1-3` | linear | | `#problem-P5` | limits |
| | | | `#problem-P6` | derivative |
| | | | `#problem-P7` | cauchy-riemann |

| topic route | station | topic route | station |
|---|---|---|---|
| `#topic-T1-1` | addresses | `#topic-T2-1` | mappings |
| `#topic-T1-2` | distance | `#topic-T2-2` | powermap |
| `#topic-T1-3` | addresses | `#topic-T2-3` | limits |
| `#topic-T1-4` | powers | `#topic-T2-4` | staircase |
| `#topic-T1-5` | curves | `#topic-T2-5` | reciprocal |
| | | `#topic-T3-1` | derivative |
| | | `#topic-T3-2` | cauchy-riemann |

Why those ties break that way (checked by hand): 1.3.1 is listed by `addresses` (order 1) and
`staircase` (4), so `addresses`; 2.1.2 and 2.2.1 by `powermap` (11) and `lab` (18), so `powermap`;
2.1.3 and P4 by `linear` (10) and `lab`, so `linear`; T1.4 by `powers` (5) and `roots` (6), so
`powers`; T1.5 by `curves` (7) and `sets` (8); T2.2 by `powermap` (11), `principal-root` (12), `lab`
(18); T2.4 by `staircase` (4) and `branches` (13), so `staircase` (this is the case the goal pins);
T2.5 by `reciprocal` (14), `lab` (18), `graph4d` (19). Unknown ids (`1.4`, `9.9.9`, `T9.9`) have no
owner, so the route is "No such place".

Presets: `#problem-1-4-2` gives `{ kind: 'problem', id: '1.4.2' }`; `#problem-P3` gives
`{ kind: 'problem', id: 'P3' }`; `#topic-T2-4` gives `{ kind: 'topic', id: 'T2.4' }`;
`#lab-2-5-1` gives `{ kind: 'token', token: '2-5-1' }`; `#principal-root-sweep` gives
`{ kind: 'token', token: 'sweep' }`.

### 6.2 Contrast arithmetic (the only numeric formulas in the shell)

For an sRGB channel `c` in `[0, 1]` (the byte divided by 255):

`lin(c) = c / 12.92` if `c <= 0.04045`, else `((c + 0.055) / 1.055)^2.4`.
Relative luminance `L = 0.2126 lin(R) + 0.7152 lin(G) + 0.0722 lin(B)`.
Contrast of two colours with luminances `Lhi >= Llo`: `(Lhi + 0.05) / (Llo + 0.05)`.

Hand check, `--text #1a2230` on white. Bytes 26, 34, 48 give `c` = 0.10196, 0.13333, 0.18824.
`lin` = `(0.14877)^2.4 = 0.010333`, `(0.178515)^2.4 = 0.016007`, `(0.230554)^2.4 = 0.029557`.
`L = 0.2126 x 0.010333 + 0.7152 x 0.016007 + 0.0722 x 0.029557 = 0.002197 + 0.011448 + 0.002134
= 0.015779` (an exact-arithmetic run gives 0.015771). White has `L = 1`. Contrast
`1.05 / (0.015771 + 0.05) = 15.96`. The table in 3.1 repeats this for every token; eight values
were rechecked in an independent Python implementation and all agree to two decimals. Reference
values the test also asserts: black on white 21.00; `#777777` on white 4.48 (the well-known
just-fails-AA grey); `#767676` on white 4.54 (just passes).

Thresholds the unit test enforces on each of `--bg`, `--surface`, `--surface-2`, in each theme:

| token | minimum | why |
|---|---|---|
| `--text` | 7 | body text |
| `--text-muted`, `--accent`, `--cart`, `--polar`, `--input`, `--output`, `--ok`, `--warn`, `--danger` | 4.5 | used as text colour, for example tinted KaTeX |
| `--seam`, `--border-strong`, `--focus`, `--t0`, `--t1` | 3 | graphics and control outlines (the ARCHITECTURE rule for the ramp ends) |
| `--on-accent` on `--accent` | 4.5 | primary button text |

Also: `luminance(--t0) < luminance(--t1)` in each theme; the two dark blocks are identical; the
token values in light for `--cart`, `--polar`, `--input`, `--output` are exactly the ones in 3.1.

### 6.3 Expected values for the tests (collected)

| label | value |
|---|---|
| stations in the registry | 21 (`order` 0 to 20) |
| parts and their sizes | I 7, II 2, III 7, IV 2, V 3; titles The point, Curves and sets, Motions, Zoom, The diary and the index |
| `parseRoute('')` | `{ station: 'home', preset: null, raw: '' }` |
| `parseRoute('#problem-1-4-2')` | `{ station: 'roots', preset: { kind: 'problem', id: '1.4.2' }, raw: 'problem-1-4-2' }` |
| `parseRoute('#nosuchplace').station` | `null` |
| `documentTitle('The Map')` | `The Map · One Point, Two Addresses` (middle dot U+00B7) |
| contrast `--text` on `--surface`, light | 15.96 |
| unit tests in the reference file | 29, all passing |
| nav links, parts, place-list links | 21, 5, 21 |
| harness problem lines per viewport | 8 without `js/stations/distance.js`, 4 with it (section 7) |
| DOMContentLoaded (local server, headless) | 80 to 90 ms; 374 DOM nodes |

---

## 7. Verification plan

Run everything from the repo root. `npm test` is broken on Node 22 (finding 3), so use the file
form; once `package.json` is fixed `npm test` is equivalent.

### A1 parseRoute (unit test)

`node --test tests/unit/i1-shell.test.mjs` prints `# tests 35`, `# pass 35`, `# fail 0` (29 at the first delivery, 35 after fix round 1). The cases:

| input | `station` | `preset` |
|---|---|---|
| `""`, `"#"` | `home` | `null` |
| `#roots` | `roots` | `null` |
| `#problem-1-4-2` | `roots` | `{ kind: 'problem', id: '1.4.2' }` |
| `#problem-P3` | `linear` | `{ kind: 'problem', id: 'P3' }` |
| `#topic-T2-4` | `staircase` | `{ kind: 'topic', id: 'T2.4' }` |
| `#lab-2-5-1` | `lab` | `{ kind: 'token', token: '2-5-1' }` |
| `#principal-root-sweep` | `principal-root` | `{ kind: 'token', token: 'sweep' }` |
| `#cauchy-riemann` | `cauchy-riemann` | `null` |
| `#nosuchplace` | `null` | `null` |

plus: all 29 problem routes and all 12 topic routes against the tables in 6.1 (and equal to the
registry's own `stationForProblem` and `stationForTopic`); every station id as its own route
(`{ station: id, preset: null, raw: id }`); `#roots-unity` gives token `unity`, `#lab-P4` keeps the
capital P; the "No such place" set: `#a=b`, `#roots?x=1`, `#roots/`, `#/roots`, `#roots%20`,
`#roots-`, `#problem-`, `#problem-9-9-9`, `#problem-1-4`, `#topic-T9-9`, `#topic-`,
`#problem-1--2`, `#home extra`, and a 500-character token; case forgiveness (`#Roots`,
`#problem-p3`, `#Topic-t2-4`, `#LAB-2-5-1`).
Passing looks like: no failed assertion, and importing `js/app.js` in Node did not throw (that
proves no top-level DOM access).

Also in this file: nav grouping, `documentTitle`, 6 store tests (round trip and JSON under the
prefix, throwing or missing storage, `persist: false`, corrupt JSON and unserialisable values,
subscribe and unsubscribe and a throwing listener, prefix isolation), 5 theme tests with a stubbed
DOM (attribute, raw stored string, exactly one event, blocked storage, `auto`, stored choice applied
silently, OS change only followed in auto mode, `prefersReducedMotion` without `matchMedia`).

### A2 shell loads clean (smoke)

`node tools/smoke.mjs --route nosuchplace --dark` must print `ok` for `desktop`, `phone` and
`desktop-dark` and `3/3 checks passed`. Then read the screenshots in `docs/review/shots/`:

- `nosuchplace--desktop.png`: sticky header with the brand mark, title and moon button; the left
  sidebar with five part headings and numbered places with thread dots; the panel with "No such
  place", the token `#nosuchplace` in a code chip, the hint line, the dark "Back to the map" button,
  "All the places" and the two-column list of 21 titles with summaries; footer with "Colour key".
- `nosuchplace--phone.png`: header with title, moon and menu buttons (no sidebar); the panel in one
  column with all 21 titles; no horizontal scroll (the harness also checks).
- `nosuchplace--desktop-dark.png`: the same in the dark tokens: navy page, lifted panel, light text,
  the sun icon, the "Back to the map" button light on dark.

### A3 missing station gives the under-construction panel (interaction script)

`node tools/smoke.mjs --route nosuchplace --dark --script tests/interact/i1-shell.mjs`

The script (Appendix B.2), for each viewport:

1. At load: state `nosuchplace`; title `No such place · One Point, Two Addresses`; `#site-title` href
   `#home`; no `[data-station-error]`; 21 links in `#no-such-place-list` whose titles and hrefs equal
   the registry in order; 21 nav links in registry order; 5 parts; no `aria-current`; nav visible on
   desktop and hidden on phone; toggle visible only on phone; no horizontal overflow.
2. Keyboard: Tab stops on `skip-link`, `site-title`, `theme-toggle`, then `nav-toggle` (phone) or
   `nav-home` (desktop); the focused control has an outline. Enter on the skip link focuses `#view`
   and leaves `#nosuchplace` in the address bar.
3. Phone only: open the drawer; `#view` and the footer are `inert` and `body` has `overflow:
   hidden`; Tab from the last nav link does not enter the page behind; the drawer fits the width
   (screenshot `nav-open`); Escape closes it, returns focus to the toggle and lifts the lock; a
   pointerdown on the header closes it.
4. Colour key opens: nine entries, no overflow (screenshot `colour-key`).
5. **The literal A3 check.** Click the nav link `#nav-distance` (opening the drawer first on phone). The click sets `location.hash` to `#distance`, which is the literal step in the goal; going through the menu also exercises the nav.
   Either `[data-station-error]` exists or `#station-distance` has children. If the panel appeared:
   exactly one `console.error` starting `[mv] station "distance" failed to load`, the copy "This
   station is under construction.", the back link `#home`, the attribute value `distance`, the
   section still present, screenshot `under-construction`. Focus is on `#view`, the title is the
   place title, the nav marks it current. The panel has no `role`. Then open the drawer (phone)
   and click the current place's own link: the drawer closes, the hash is unchanged, focus is on
   `#view`, nothing remounts. Then set the hash back to `#nosuchplace`: no
   `[data-station-error]`, `#no-such-place` present, nav mark cleared.
6. **The same paths, deterministically, whatever files exist.** Five stations are pushed into the
   live `STATIONS` array from the page (`import('./js/registry.js')` is the same module instance the
   router uses) with `data:text/javascript,` module URLs, so no network is involved:
   `zz-ok` (mounts, records `ctx`, counts mounts and unmounts), `zz-throw` (import throws),
   `zz-mount` (mount throws), `zz-nomount` (no `mount` export), `zz-slow` (a 1.2 s top-level
   await). Checked: the `ctx` has exactly the keys `navigate preset route station stations store theme
   threads` and is frozen; `ctx.theme` has exactly `cssVar getTheme onThemeChange
   prefersReducedMotion setTheme`; `ctx.stations` is the registry array; presets arrive for
   `#problem-ZZ-1`, `#topic-ZZ-T1` and `#zz-ok-hello`; each navigation unmounts the previous mount
   exactly once; `ctx.navigate` works, including navigating to the current hash (remounts); one
   store is shared; each failure gives `data-state="error"`, one panel, the right message in
   `#under-construction-detail` and one router `console.error`; the button is labelled "Reload the
   page"; a failure does not poison the next route; the loading placeholder appears (text
   "Loading...") while `zz-slow` imports; navigating away mid-import means it never mounts;
   visiting it again later does.
7. **A stale failure leaves the newer navigation's timer alone.** `zz-late` waits on a gate the
   script controls; the script navigates to `zz-late`, then to `zz-slow2` (a 1.3 s import), then
   opens the gate so `zz-late` fails while `zz-slow2` is still loading. `zz-slow2`'s placeholder
   must still appear, it must mount, no panel is left behind and the stale failure is not
   reported.
8. **Reload recovers.** The page is reloaded (which also drops every injected `zz-` station), then
   `page.route` makes `js/stations/distance.js` return 404 once. Navigating to `#distance` gives
   the panel; the route is flipped to serve a stub module; the button is clicked; the page loads
   again at `#distance` and the station mounts.

**Expected harness output for this command** (it exits 1 by design, finding 2). Per viewport
(`desktop`, `phone`, `desktop-dark`) the `problems` list contains exactly:

| lines | present when | text starts |
|---|---|---|
| 1 | always | `console.error: [mv] station "zz-throw" failed to load: boom-import` |
| 1 | always | `console.error: [mv] station "zz-mount" failed to load: boom-mount` |
| 1 | always | `console.error: [mv] station "zz-nomount" failed to load: station module data:text/javascript,... has no mount() export` |
| 4 | always (step 8 forces the failure whatever is on disk) | `HTTP 404: .../js/stations/distance.js`; `console.error: Failed to load resource: the server responded with a status of 404 (Not Found)`; `request failed: .../js/stations/distance.js`; `console.error: [mv] station "distance" failed to load: Failed to fetch dynamically imported module` |
| 4 more | only while `js/stations/distance.js` does not exist (step 5 hits the real 404) | the same four lines |

So 11 problem lines per viewport while the distance station does not exist, and 7 once it does. The script also logs `A3 literal: ...` and `viewport <w>: shell checks passed`.
**Pass** = those log lines for all three viewports, no line containing `interaction script failed`,
no `horizontal overflow`, no `router showed the station error panel`, no `page error`, and no
problem line outside the table. Review B reads the `[mv] station "distance"` line (or the `zz-throw`
line) as the evidence that a failing import was reported through `console.error`.

### A4 theme toggle (interaction script, section 4 of the same script)

Steps: record the effective theme (`dataset.theme`, else the OS preference), install a `themechange`
counter, click `#theme-toggle`. Expect `dataset.theme` to be the opposite, counter exactly 1,
`localStorage['mv:theme']` equal to it (or `unavailable` if storage is blocked),
`getComputedStyle(body).backgroundColor` changed, `aria-pressed` equal to "is dark",
`meta[name=theme-color]` content equal to the new `--bg` (screenshot `theme-flipped`). Reload: the
choice survives (set before first paint). Click again: back to the start theme, counter 1 (fresh
document), background equal to the first one. Finally `setTheme('auto')`: attribute removed, stored
key cleared, effective theme equals the OS preference again. In `desktop-dark` the first click goes
to light; in the other two it goes to dark.

### A5 tokens (unit test plus code inspection)

The unit tests named `theme.css: ...` and `components.css: ...` check: every theme token is in all
three blocks, the dark blocks are identical, colour tokens are 6-digit hex, no `https:` or `url(` in
the font stacks, `body` has `background: var(--bg)`, the reduced-motion media query and the
`:focus-visible` rule exist, the contrast thresholds of 6.2 hold, `--ghost-alpha` is at most 0.35 in all three blocks, the light palette equals 3.1,
`components.css` has no hex, no `rgb(`, `hsl(` and friends, no named colour, and `outline: none` appears
only on `#view:focus`. Inspection: the required tokens `--bg --surface --surface-2 --text
--text-muted --border --accent --focus --cart --polar --input --output --seam --t0 --t1 --ok --warn
--danger` are all in `:root`.

### A6 router structure (unit test plus code inspection)

Unit test `app.js imports only the registry and the two core helpers` parses the import lines and
expects exactly `./core/store.js`, `./core/theme.js`, `./registry.js`, and checks for
`await import(st.module)`, `data-station-error` and `console.error`. Command check:
`node -e "import('./js/app.js').then(m => console.log(Object.keys(m).sort().join()))"` prints
`PART_TITLES,SITE_TITLE,documentTitle,groupStations,parseRoute,start`. Inspect: in `render`, the
previous `unmount`, `import(st.module)` and `mount()` are each inside try/catch; the failure path
builds an element with `data-station-error` and calls `console.error`; the only top-level statements
in the three modules are imports, `const` and `function` declarations.

### Other checks before handing over

- `node tools/smoke.mjs --route nosuchplace --no-shots` passes at desktop and phone without `--dark`.
- With any real station file present, `node tools/smoke.mjs --route <that station>` still shows
  the station and no error panel (the prototype was run with a stub `home.js`: 3/3 passed).
- `index.html` has no `src` or `href` to another host, and every local file it names exists (a unit
  test).

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

**Edge cases.**

- Empty hash and `#`: home. `#problem-9-9-9`, `#topic-T9-9`, `#problem-`, `#roots-`: No such place.
- Characters outside the route set, or more than 120 characters: No such place; the token is shown
  through `textContent`, cut at 60 characters.
- Hash change while a module is loading: the older navigation is discarded when its import
  resolves (counter `seq`); only the newest route mounts. Two hash assignments in one task both read
  the final hash; the older render is discarded and only the newest mounts.
- Same station, new preset (`#problem-1-4-1` after `#problem-1-4-2`): full unmount and remount.
  `ctx.navigate` to the current hash also remounts.
- A station's `unmount` throws: logged, the next route still mounts.
- A station returns no function: nothing to clean, no warning.
- An async `mount`: awaited; if the route changed meanwhile its `unmount` runs at once.
- `localStorage` throws everywhere (private window, blocked data): theme switches for the session,
  the store works in memory, `set` returns `false`.
- `matchMedia` missing: light theme, motion allowed, no OS listener, no drawer auto-close.
- Browser Back from a station to an unknown route and forward again: each `hashchange` renders.
- The OS theme changes while the page is open: followed only when the student has not chosen.
- Phone rotated or the window widened past 900 px with the drawer open: the drawer closes and the
  sidebar appears.
- The skip link never leaves `#view` in the address bar.
- Opened from `file://`: the guard panel; the failed module load is not reported as a second panel.
- `start()` called twice: returns the same `stop`, installs nothing twice.

**Performance.** Measured in headless Chromium on a local server: DOMContentLoaded 80 to 90 ms,
374 DOM nodes after the first render, route change to repaint 7 ms (desktop) and 18 ms (phone).
Transferred on first load: `katex.min.css` 368 KB (fonts inlined, render-blocking, local),
`katex.min.js` 276 KB (deferred), `components.css` 20 KB, `theme.css` 5 KB, `app.js` 15 KB,
registry 10 KB, theme and store 4 KB each. The only dynamic import is the station module. One
`replaceChildren` per navigation, no layout reads except the one sidebar measurement, no rAF loop,
no timers except the 150 ms loading delay.

**Accessibility.** One `h1` per page (the station's). Landmarks `header`, `nav` (named), `main`,
`footer`. Nav part titles are `<p>` linked to their lists with `aria-labelledby`, so the heading
outline stays clean. `aria-current="page"` on the current link. Toggle buttons use `aria-pressed`
and `aria-expanded`. A polite live region announces each navigation. Skip link first. Every control
has a name and a visible 3 px focus ring; text contrast at least 7 (body) and 4.5 (everything
else) in both themes; control outlines at least 3. Decorative marks are `aria-hidden`. Targets are
44 px. Colour is never the only cue (3.2).

**Reduced motion.** The shell's only animation is the spinner; `prefers-reduced-motion: reduce`
sets animation and transition durations to 0.01 ms with one iteration (a static ring) and forces
`scroll-behavior: auto`. `ctx.theme.prefersReducedMotion()` is the one function stations call.

**Phone layout (390 px).** No horizontal scroll (checked by the harness at every step of the
script, including with the drawer and the colour key open). Header 56 px: title (ellipsis if
needed), theme and menu buttons 44 px. Drawer fills the area below the header and scrolls itself.
Gutter 16 px. `#view` padding 1.5 rem top, 2.5 rem bottom. `.slider-row` stacks the label above the
range under 480 px. The place list and colour key are single column.

---

## 9. Out of scope

Any station module; the KaTeX helper (`js/core/katex.js`); the plane, explainer and staircase
widgets; per-station presets (the router only hands over `ctx.preset`); a `home` page; cross-tab
store sync; web fonts; a third "follow the system" state on the toggle (the code supports
`setTheme('auto')`, there is no button for it); route transitions or animation; an in-app search;
changes to `registry.js`, `tools/smoke.mjs`, `package.json`, `README.md`.

---

## 10. Requests for other owners and risks

**Requests (do not edit these files in this goal).**

1. `package.json` (no goal owns it): change `"test"` to `node --test tests/unit/*.test.mjs`.
   Evidence: on Node v22.22.0 `npm test` exits 1 with `Cannot find module '.../tests/unit'` and runs
   no test; the glob form runs them. Every goal's "unit_test" criterion is affected.
2. `docs/CONSTRAINTS.md`: add that, because the harness counts a blocked font request as a console
   error, a Google Fonts `<link>` fails every smoke check; fonts must stay on system stacks unless
   `tools/smoke.mjs` is changed first.
3. `i1-core-plane` (`js/core/plane.js`): keep `window.__mv = window.__mv || { planes: new Map() }`
   and also guard `if (!window.__mv.planes) window.__mv.planes = new Map()`. The shell creates the
   same shape first, so this is compatible; the guard protects against a different creation order.
4. All station goals: every `href="#x"` is a route (no in-page anchors); do not call `scrollTo` on
   mount (the router scrolls to the top and focuses `#view`); render the page's single `<h1>` in
   `.station-header` (the shell has none); attach window and document listeners last in `mount`
   so a throw cannot leak them; use `ctx.store.set('lab.request', ..., { persist: false })` for
   the Lab hand-off.
5. Optional, for whoever owns `tools/smoke.mjs` later: let an interaction script declare expected
   console errors so a script that tests error paths can exit 0.

**Risks.**

- *Harness exit code on A3.* The command exits 1 by design; the table in section 7 is the
  contract. A reviewer who only reads the exit code will mark A3 failed.
- *Google Fonts creep.* A later goal adding a font `<link>` breaks every smoke run (finding 1).
- *Browser support.* Uses `color-mix()` (with plain fallbacks first), CSS grid (no container queries),
  `100dvh` (with `100vh` before it), `:focus-visible`, `Element.replaceChildren`, dynamic `import()`.
  All are in current Chrome, Safari and Firefox; nothing older than about two years is supported.
- *CSS parsing in the tests.* The theme test finds three blocks by their exact selectors
  (`:root {`, `@media (prefers-color-scheme: dark)` with `:root:not([data-theme="light"])`,
  `:root[data-theme="dark"]`); renaming or reformatting those selectors breaks it.
- *The registry is mutable.* The tests push stations into `STATIONS` from the page and remove them
  again; `registry.js` must keep exporting the plain array (not a frozen one) for A3 section 6.
- *Prototype versus repo.* The appendix was run against a copy of the registry as it is today
  (21 stations); a later registry with a different count changes the numbers 21, 5 and 7, 2, 7, 2, 3
  in the tests, which are all derived from the registry except the part sizes and the count 21 in
  the interaction script.

---

## Appendix A. Reference implementation

Run in a scratch prototype against the real registry and harness: 29 unit tests pass; the
interaction script passes at 1280, 390 and 1280 dark; `node tools/smoke.mjs --route nosuchplace
--dark` is 3/3; with a stub station present `--route home --dark` is 3/3.

Fix round 1 updated this appendix to be a verbatim copy of the files in the repo (A.1, A.3, A.6,
B.1 and B.2 changed; A.2, A.4 and A.5 did not): 35 unit tests in `i1-shell.test.mjs`, and the
interaction script with sections 3e and 3f added.

### A.1 `index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f6f3ec">
  <meta name="description" content="An interactive study map for MAT 412 Test 1: complex numbers, Chapters 1 to 3. One point, two addresses.">
  <title>One Point, Two Addresses</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M6 26H30M6 26V3' stroke='%23757d8d' stroke-width='1.5' fill='none'/%3E%3Cpath d='M24 10V26M24 10H6' stroke='%230b63ad' stroke-width='1.8' stroke-dasharray='2 2.4' fill='none'/%3E%3Cpath d='M6 26L24 10' stroke='%23a84300' stroke-width='2.4' fill='none'/%3E%3Cpath d='M16 26A10 10 0 0 0 13.47 19.36' stroke='%23a84300' stroke-width='2' fill='none'/%3E%3Ccircle cx='24' cy='10' r='3' fill='%231a2230'/%3E%3C/svg%3E">
  <script>
    /* Apply a saved theme before first paint, so there is no flash of the wrong one. */
    (function () {
      try {
        var t = localStorage.getItem('mv:theme');
        if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
  <link rel="stylesheet" href="vendor/katex/katex.min.css">
  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/components.css">
  <!-- Classic script, deferred: it runs before the module scripts below, in document order. -->
  <script src="vendor/katex/katex.min.js" defer></script>
</head>
<body>
  <a class="skip-link" id="skip-link" href="#view">Skip to the page</a>

  <header class="site-header" id="site-header">
    <div class="site-header-inner">
      <div class="brand">
        <a class="site-title" id="site-title" href="#home">
          <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path class="mark-axis" d="M6 26H30M6 26V3"/>
            <path class="mark-cart" d="M24 10V26M24 10H6"/>
            <path class="mark-polar" d="M6 26L24 10"/>
            <path class="mark-polar" d="M16 26A10 10 0 0 0 13.47 19.36"/>
            <circle class="mark-dot" cx="24" cy="10" r="3"/>
          </svg>
          <span class="site-title-text">One Point, Two Addresses</span>
        </a>
      </div>
      <div class="header-actions">
        <button type="button" class="icon-btn" id="theme-toggle" aria-pressed="false" aria-label="Dark theme" title="Switch between light and dark">
          <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
        <button type="button" class="icon-btn nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Places" title="Show the places">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
  </header>

  <nav class="site-nav" id="site-nav" aria-label="Places on the map"></nav>

  <main id="view" tabindex="-1">
    <noscript>
      <div class="panel fatal"><h1 class="panel-title">JavaScript is off</h1><p>This study map needs JavaScript. Turn it on and reload the page.</p></div>
    </noscript>
  </main>

  <footer class="site-footer" id="site-footer">
    <p>A study map for MAT 412 Test 1, Chapters 1 to 3. It runs in your browser and works offline.</p>
    <details class="colour-key" id="colour-key">
      <summary>Colour key</summary>
      <ul class="colour-key-list">
        <li><span class="key-swatch" data-key="cart"></span><span>Blue is the Cartesian address: where z sits. Across by x, up by y. Slides and grid lines.</span></li>
        <li><span class="key-swatch" data-key="polar"></span><span>Orange is the polar address: how to reach z. Turn by &theta;, stretch by r. Rays and circles.</span></li>
        <li><span class="key-swatch" data-key="input"></span><span>Green is the input: what you drag or draw in the z-plane.</span></li>
        <li><span class="key-swatch" data-key="output"></span><span>Purple is the output: where f sends it, in the w-plane.</span></li>
        <li><span class="key-swatch" data-key="ramp"></span><span>Dark to bright is time, from t = 0 to t = 1. Input and output run on one clock.</span></li>
        <li><svg class="key-line" viewBox="0 0 52 18" aria-hidden="true" focusable="false"><path class="key-axis" d="M4 16H50M12 16L24.86 0.68"/><path class="arg-home" d="M24 16A12 12 0 0 0 19.71 6.81"/></svg><span>A solid arc is Arg z: the one angle we agreed to use, in <span class="nowrap">(-&pi;, &pi;]</span>.</span></li>
        <li><svg class="key-line" viewBox="0 0 52 18" aria-hidden="true" focusable="false"><path class="key-axis" d="M4 16H50M12 16L24.86 0.68"/><path class="arg-ghost" d="M18 16A6 6 0 0 0 15.86 11.4M22 16A10 10 0 0 0 18.43 8.34M26 16A14 14 0 0 0 21.0 5.28"/></svg><span>Faint extra arcs are arg z: the whole set of angles &theta; + 2&pi;k.</span></li>
        <li><svg class="key-line" viewBox="0 0 52 18" aria-hidden="true" focusable="false"><line class="seam-line" x1="2" y1="9" x2="50" y2="9"/></svg><span>A dashed grey ray is the seam: the negative real axis, where Arg jumps from <span class="nowrap">&pi; to -&pi;</span>.</span></li>
        <li><svg class="key-line" viewBox="0 0 52 18" aria-hidden="true" focusable="false"><line class="thread-t1" x1="2" y1="3" x2="50" y2="3"/><line class="thread-t2" x1="2" y1="9" x2="50" y2="9"/><line class="thread-t3" x1="2" y1="15" x2="50" y2="15"/></svg><span>The dots in the menu show which story threads pass through a place: T1 solid blue, T2 dashed orange, T3 solid purple.</span></li>
      </ul>
    </details>
  </footer>

  <div class="sr-only" id="route-status" role="status" aria-live="polite"></div>

  <script>
    /* Modules are blocked on file://. Say so instead of leaving a blank page. */
    if (location.protocol === 'file:') {
      document.getElementById('view').innerHTML =
        '<div class="panel fatal"><h1 class="panel-title">Open this from a web server</h1>' +
        '<p>This page cannot run straight from a file. In a terminal, in this folder, run ' +
        '<code>npx http-server -c-1 -p 8080 .</code> and open <code>http://localhost:8080</code> in your browser.</p></div>';
    }
  </script>
  <script type="module">
    import('./js/app.js')
      .then(function (m) { m.start(); })
      .catch(function (err) {
        console.error('[mv] the app failed to start', err);
        if (location.protocol === 'file:') return;
        var v = document.getElementById('view');
        if (v) v.innerHTML = '<div class="panel fatal" data-boot-error><h1 class="panel-title">The page could not start</h1><p>Reload it. If it keeps happening, the details are in the browser console.</p></div>';
      });
  </script>
</body>
</html>
```

### A.2 `css/theme.css`

```css
/* css/theme.css
   Design tokens (light, dark) and base element styles.
   Every colour in the site comes from a token defined here. Components use var(--token) only.
   The two dark blocks below must stay identical: one answers the OS preference when the
   student has not chosen, the other answers an explicit choice made with the theme button. */

:root {
  color-scheme: light;

  /* surfaces and text */
  --bg: #f6f3ec;
  --surface: #ffffff;
  --surface-2: #ece8de;
  --text: #1a2230;
  --text-muted: #515b6c;
  --border: #d8d2c4;
  --border-strong: #757d8d;
  --accent: #2f3e5c;
  --on-accent: #ffffff;
  --focus: #1a2230;

  /* the teaching colours */
  --cart: #0b63ad;
  --polar: #a84300;
  --input: #006e53;
  --output: #9d3a8a;
  --seam: #6b7384;
  --t0: #101a30;
  --t1: #6d83a6;
  --ghost-alpha: 0.35;

  /* status */
  --ok: #26702a;
  --warn: #845b00;
  --danger: #b3261e;

  /* theme-dependent non-colour values */
  --shadow: 0 1px 2px rgb(26 34 48 / 0.08), 0 6px 18px rgb(26 34 48 / 0.07);
  --icon-sun: none;
  --icon-moon: block;

  /* typography: system stacks only (no network) */
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;

  /* shape, spacing, layout */
  --radius: 10px;
  --radius-sm: 6px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2.5rem;
  --gutter: 1rem;
  --tap: 2.75rem;
  --header-h: 3.5rem;
  --sidebar-w: 17.5rem;
  --content-max: 72rem;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #0d121c;
    --surface: #151c2b;
    --surface-2: #1e2739;
    --text: #e9edf5;
    --text-muted: #a6b0c3;
    --border: #2b3650;
    --border-strong: #7480a0;
    --accent: #cfd8ea;
    --on-accent: #0d121c;
    --focus: #e9edf5;
    --cart: #62adf2;
    --polar: #ff9d5c;
    --input: #3fd0a0;
    --output: #e48fd2;
    --seam: #8e99b0;
    --t0: #5c7498;
    --t1: #f3f6fb;
    --ghost-alpha: 0.35;
    --ok: #63d08a;
    --warn: #e3b341;
    --danger: #ff8178;
    --shadow: 0 1px 2px rgb(0 0 0 / 0.5), 0 8px 24px rgb(0 0 0 / 0.45);
    --icon-sun: block;
    --icon-moon: none;
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0d121c;
  --surface: #151c2b;
  --surface-2: #1e2739;
  --text: #e9edf5;
  --text-muted: #a6b0c3;
  --border: #2b3650;
  --border-strong: #7480a0;
  --accent: #cfd8ea;
  --on-accent: #0d121c;
  --focus: #e9edf5;
  --cart: #62adf2;
  --polar: #ff9d5c;
  --input: #3fd0a0;
  --output: #e48fd2;
  --seam: #8e99b0;
  --t0: #5c7498;
  --t1: #f3f6fb;
  --ghost-alpha: 0.35;
  --ok: #63d08a;
  --warn: #e3b341;
  --danger: #ff8178;
  --shadow: 0 1px 2px rgb(0 0 0 / 0.5), 0 8px 24px rgb(0 0 0 / 0.45);
  --icon-sun: block;
  --icon-moon: none;
}

/* ---------- base ---------- */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scroll-padding-top: calc(var(--header-h) + var(--space-3));
}

body {
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 1.0625rem;
  line-height: 1.55;
  overflow-wrap: break-word;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4 {
  margin: 0 0 var(--space-2);
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1.2;
  text-wrap: balance;
}

h1 { font-size: clamp(1.6rem, 1.25rem + 1.5vw, 2.25rem); }
h2 { font-size: 1.4rem; }
h3 { font-size: 1.15rem; }
h4 { font-size: 1rem; }

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--accent);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

a:hover {
  text-decoration-thickness: 0.14em;
}

code,
kbd,
samp,
pre {
  font-family: var(--font-mono);
  font-size: 0.92em;
}

code {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--surface-2);
}

pre {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  overflow-x: auto;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

img,
svg,
canvas,
video {
  max-width: 100%;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

[hidden] {
  display: none !important;
}

::selection {
  background: var(--surface-2);
  color: var(--text);
}

@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  ::selection {
    background: color-mix(in srgb, var(--accent) 28%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### A.3 `css/components.css`

```css
/* css/components.css
   Shell chrome and generic components shared by every station.
   Rule: no colour literals here. Colours come from tokens (var(--...)), plus the keywords
   transparent, currentColor and inherit. Mixed tints use color-mix() with a plain fallback
   declared first. Widget-specific styles (plane, explainer, staircase, domain colouring,
   3D view) are injected by their own modules, not here. */

/* ============================================================
   1. Utilities
   ============================================================ */

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 100;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: none;
}

.stack > * + * { margin-top: var(--space-3); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.grow { flex: 1 1 auto; min-width: 0; }
.muted { color: var(--text-muted); }
.mono { font-family: var(--font-mono); }
.nowrap { white-space: nowrap; }

/* Tone: the two-address colour code. data-tone sets --tone for borders, sliders and marks.
   .tone-* colours text. Cartesian = blue, polar = orange, input = green, output = purple. */
[data-tone="cart"], [data-thread="T1"] { --tone: var(--cart); }
[data-tone="polar"], [data-thread="T2"] { --tone: var(--polar); }
[data-tone="input"] { --tone: var(--input); }
[data-tone="output"], [data-thread="T3"] { --tone: var(--output); }
[data-tone="accent"] { --tone: var(--accent); }
.tone-cart { color: var(--cart); }
.tone-polar { color: var(--polar); }
.tone-input { color: var(--input); }
.tone-output { color: var(--output); }

/* Touch: no double-tap zoom delay on controls, no grey tap flash. */
.btn, .chip, .icon-btn, .nav-link, .station-link, summary {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* ============================================================
   2. Shell: header, navigation, view, footer
   ============================================================ */

body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header"
    "main"
    "footer";
}

.site-header {
  grid-area: header;
  position: sticky;
  top: 0;
  z-index: 30;
  height: var(--header-h);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.site-header-inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 100%;
  padding: 0 var(--gutter);
}

.brand {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
}

.site-title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text);
  text-decoration: none;
}

.site-title:hover .site-title-text {
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.2em;
}

.brand-mark {
  flex: none;
  width: 1.9rem;
  height: 1.9rem;
}

.brand-mark .mark-axis { stroke: var(--text-muted); fill: none; stroke-width: 1.4; stroke-linecap: round; }
.brand-mark .mark-cart { stroke: var(--cart); fill: none; stroke-width: 1.7; stroke-dasharray: 2 2.4; stroke-linecap: round; }
.brand-mark .mark-polar { stroke: var(--polar); fill: none; stroke-width: 2.2; stroke-linecap: round; }
.brand-mark .mark-dot { fill: var(--text); }

.site-title-text {
  overflow: hidden;
  font-family: var(--font-display);
  font-size: clamp(1rem, 0.9rem + 0.9vw, 1.3rem);
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: var(--tap);
  height: var(--tap);
  padding: 0;
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

.icon-btn:hover { background: var(--surface-2); }
.icon-btn svg { width: 1.35rem; height: 1.35rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

/* The sun shows in dark mode (click for light), the moon in light mode. Both come from tokens. */
.icon-btn .icon-sun { display: var(--icon-sun); }
.icon-btn .icon-moon { display: var(--icon-moon); }

.nav-toggle[aria-expanded="true"] {
  background: var(--surface-2);
  border-color: var(--text);
}

/* Navigation: a drawer on phones, a sticky sidebar from 900px up. */
.site-nav {
  display: none;
  position: fixed;
  top: var(--header-h);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 25;
  padding: var(--space-3) var(--gutter) var(--space-5);
  overflow-y: auto;
  overscroll-behavior: contain;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

body[data-nav-open="true"] .site-nav {
  display: block;
}

/* The open drawer covers the page, so the page behind it must not scroll under a thumb.
   (The JS also marks #view and the footer inert, so Tab cannot wander into them.) */
body[data-nav-open="true"] {
  overflow: hidden;
}

.site-nav :focus-visible { outline-offset: -3px; }

.nav-part + .nav-part { margin-top: var(--space-3); }

.nav-part-title {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0 0 var(--space-1);
  padding: 0 var(--space-2);
  font-family: var(--font);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.3;
  text-transform: uppercase;
  color: var(--text-muted);
}

.nav-part-roman { min-width: 1.6em; }
.nav-part-note { margin-left: auto; font-weight: 500; letter-spacing: 0.02em; text-transform: none; }

.nav-list { margin: 0; padding: 0; list-style: none; }

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
  padding: var(--space-1) var(--space-2);
  border-left: 3px solid transparent;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text);
  font-size: 0.97rem;
  line-height: 1.25;
  text-decoration: none;
}

.nav-link:hover { background: var(--surface-2); }

.nav-link[aria-current="page"] {
  border-left-color: var(--accent);
  background: var(--surface-2);
  font-weight: 700;
}

.nav-num {
  flex: none;
  min-width: 1.5em;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  text-align: right;
}

.nav-title { flex: 1 1 auto; min-width: 0; }

.nav-threads { flex: none; display: inline-flex; gap: 3px; }

/* A thread dot: solid for T1 and T3, a dashed ring for T2 (so colour is never the only cue). */
.thread-dot {
  display: inline-block;
  box-sizing: border-box;
  width: 0.62rem;
  height: 0.62rem;
  border: 2px solid var(--tone, var(--text-muted));
  border-radius: 50%;
  background: var(--tone, var(--text-muted));
}

.thread-dot[data-thread="T2"] {
  border-style: dashed;
  background: transparent;
}

#view {
  grid-area: main;
  width: 100%;
  max-width: var(--content-max);
  min-width: 0;
  margin: 0 auto;
  padding: var(--space-4) var(--gutter) var(--space-5);
}

#view:focus { outline: none; }

.site-footer {
  grid-area: footer;
  width: 100%;
  max-width: var(--content-max);
  min-width: 0;
  margin: 0 auto;
  padding: var(--space-3) var(--gutter) var(--space-4);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.92rem;
}

.site-footer p { margin: 0 0 var(--space-2); }

@media (min-width: 56.25rem) {
  body {
    grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
    grid-template-areas:
      "header header"
      "nav main"
      "nav footer";
  }

  .site-header-inner { padding: 0 var(--space-4); }

  .nav-toggle { display: none; }

  .site-nav {
    display: block;
    grid-area: nav;
    position: sticky;
    top: var(--header-h);
    right: auto;
    bottom: auto;
    left: auto;
    z-index: 1;
    align-self: start;
    height: calc(100vh - var(--header-h));
    height: calc(100dvh - var(--header-h));
    padding: var(--space-3) var(--space-2) var(--space-5);
    border-top: 0;
    border-right: 1px solid var(--border);
    background: var(--bg);
  }

  #view { padding: var(--space-4) var(--space-4) var(--space-5); }
  .site-footer { padding-left: var(--space-4); padding-right: var(--space-4); }
}

/* ---------- colour key (footer) ---------- */

.colour-key summary {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
}

/* display:flex on a summary removes the browser's disclosure triangle, so draw a chevron:
   without it "Colour key" and "What went wrong" read as plain labels, not as controls. */
.colour-key summary::before,
.error-details summary::before {
  content: "";
  flex: none;
  width: 0.5em;
  height: 0.5em;
  margin-right: 0.7em;
  border-right: 2px solid currentcolor;
  border-bottom: 2px solid currentcolor;
  transform: rotate(-45deg);
}

.colour-key[open] > summary::before,
.error-details[open] > summary::before {
  transform: rotate(45deg);
}

.colour-key-list {
  display: grid;
  gap: var(--space-2) var(--space-4);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
}

.colour-key-list li {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr);
  align-items: start;
  gap: var(--space-2);
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.4;
}

.key-swatch {
  display: block;
  width: 3.2rem;
  height: 1.1rem;
  margin-top: 0.15rem;
  border-radius: 3px;
}

.key-swatch[data-key="cart"] { background: var(--cart); }
.key-swatch[data-key="polar"] { background: var(--polar); }
.key-swatch[data-key="input"] { background: var(--input); }
.key-swatch[data-key="output"] { background: var(--output); }
.key-swatch[data-key="ramp"] { background: linear-gradient(90deg, var(--t0), var(--t1)); }
.key-line { display: block; width: 3.2rem; height: 1.1rem; margin-top: 0.15rem; overflow: visible; }
.key-line line { stroke-width: 2.4; stroke-linecap: round; }
.key-line path { fill: none; stroke-linecap: round; }
/* arg versus Arg: a neutral axis and ray, then ONE solid arc (Arg z) or a stack of faint arcs
   (the other members of the set arg z). The ghost arcs are one path, so the fade is applied once. */
.key-line .key-axis { stroke: var(--border-strong); stroke-width: 1.4; }
.key-line .arg-home { stroke: var(--polar); stroke-width: 2.8; }
.key-line .arg-ghost { stroke: var(--polar); stroke-width: 1.9; opacity: var(--ghost-alpha); }
.key-line .seam-line { stroke: var(--seam); stroke-dasharray: 5 4; stroke-width: 2; }
.key-line .thread-t1 { stroke: var(--cart); }
.key-line .thread-t2 { stroke: var(--polar); stroke-dasharray: 5 4; }
.key-line .thread-t3 { stroke: var(--output); }

/* ============================================================
   3. Station chrome (the header every station starts with, and the links it ends with)
   ============================================================ */

.station {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.station > * { min-width: 0; }

.station-header h1 { margin-bottom: var(--space-2); }

.station-lede {
  max-width: 62ch;
  margin: 0 0 var(--space-3);
  color: var(--text-muted);
  font-size: 1.05rem;
}

.thread-badges { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0 0 var(--space-2); padding: 0; list-style: none; }

.thread-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.1rem 0.65rem 0.1rem 0.5rem;
  border: 1.5px solid var(--tone, var(--border-strong));
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.6;
}

.thread-badge::before {
  content: "";
  box-sizing: border-box;
  width: 0.6rem;
  height: 0.6rem;
  border: 2px solid var(--tone, var(--text-muted));
  border-radius: 50%;
  background: var(--tone, var(--text-muted));
}

.thread-badge[data-thread="T2"]::before { border-style: dashed; background: transparent; }

.station-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.station-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
  padding: 0 var(--space-3);
  border: 1.5px solid var(--tone, var(--border-strong));
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
}

.station-link:hover { background: var(--surface-2); }
.station-link[data-dir="prev"]::before { content: "\2190"; }
.station-link[data-dir="next"]::after { content: "\2192"; }

/* ============================================================
   4. Components
   ============================================================ */

.panel {
  padding: var(--space-3) var(--space-3) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.panel[data-tone] { border-top: 4px solid var(--tone); }
.panel-title { margin-bottom: var(--space-2); }
.panel-subtitle { margin: var(--space-4) 0 var(--space-2); }
.lede { font-size: 1.1rem; }

.card-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 21rem), 1fr));
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.card[data-tone] { border-left: 4px solid var(--tone); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap);
  padding: 0 var(--space-3);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.btn:hover { background: var(--surface-2); }
.btn:active { transform: translateY(1px); }
.btn[disabled], .btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; transform: none; }
.btn-primary { border-color: var(--accent); background: var(--accent); color: var(--on-accent); }
.btn-primary:hover { background: var(--accent); filter: brightness(1.12); }
.btn-quiet { border-color: transparent; background: transparent; }
.btn-quiet:hover { border-color: var(--border-strong); }

/* Chips: modes, presets, problem links. Pressed or active chips get a tinted fill. */
.chips { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.25rem;
  padding: 0.1rem 0.85rem;
  border: 1.5px solid var(--tone, var(--border-strong));
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
}

button.chip { min-height: var(--tap); }
.chip:hover { background: var(--surface-2); }

.chip[aria-pressed="true"],
.chip[aria-selected="true"],
.chip[aria-current="true"],
.chip.is-active {
  border-color: var(--tone, var(--accent));
  background: var(--surface-2);
  box-shadow: inset 0 0 0 1px var(--tone, var(--accent));
  font-weight: 700;
}

@supports (background: color-mix(in srgb, currentColor 10%, transparent)) {
  .chip[aria-pressed="true"],
  .chip[aria-selected="true"],
  .chip[aria-current="true"],
  .chip.is-active {
    background: color-mix(in srgb, var(--tone, var(--accent)) 16%, var(--surface));
  }
}

/* A chip that answers a question: solid border for yes, dashed for no (shape, not just colour). */
.chip[data-answer="yes"] { border-color: var(--ok); border-style: solid; }
.chip[data-answer="no"] { border-color: var(--text-muted); border-style: dashed; }

.problem-chip { min-height: 2rem; font-family: var(--font-mono); font-size: 0.88rem; }

/* Sliders: label, range, value */
.slider-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-1) var(--space-3);
  min-height: var(--tap);
}

.slider-row > label { font-weight: 600; }

.slider-row input[type="range"] {
  width: 100%;
  min-width: 0;
  height: var(--tap);
  margin: 0;
  accent-color: var(--tone, var(--accent));
  cursor: pointer;
}

.slider-row output,
.slider-row .slider-value {
  min-width: 3.5em;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.92rem;
  text-align: right;
}

@media (max-width: 30rem) {
  .slider-row { grid-template-columns: minmax(0, 1fr) auto; }
  .slider-row input[type="range"] { grid-column: 1 / -1; grid-row: 2; }
}

/* Form fields */
.field { display: inline-flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.field > label, .field-label { color: var(--text-muted); font-size: 0.88rem; font-weight: 600; }

input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),
select,
textarea {
  min-height: var(--tap);
  max-width: 100%;
  padding: 0 var(--space-2);
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
}

textarea { padding: var(--space-2); }
input[type="number"], input.num { width: 7.5rem; font-family: var(--font-mono); }
input[type="checkbox"], input[type="radio"] { width: 1.25rem; height: 1.25rem; margin: 0; accent-color: var(--accent); }

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
  cursor: pointer;
}

/* Readout: the plain-text line interaction scripts read. Monospace, wraps, never overflows. */
.readout {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.92rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

/* Two planes: two columns when the view is at least 760px wide, stacked below. */
.two-planes {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 23.25rem), 1fr));
}

.two-planes > * { min-width: 0; }

/* Callouts and badges */
.callout {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-left: 4px solid var(--tone, var(--accent));
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--surface);
}

.callout > :last-child { margin-bottom: 0; }

.badge {
  display: inline-block;
  padding: 0 0.5rem;
  border: 1.5px solid var(--tone, var(--border-strong));
  border-radius: 4px;
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0.03em;
}

/* Math fallbacks and wide formulas scroll inside their own box, never the page. */
.tex-error { color: var(--danger); font-family: var(--font-mono); }
.katex-display { max-width: 100%; overflow-x: auto; overflow-y: hidden; padding: 0.15em 0; }
.tex-scroll { max-width: 100%; overflow-x: auto; }

/* Router states */
.loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) 0;
  color: var(--text-muted);
}

.spinner {
  width: 1.1rem;
  height: 1.1rem;
  border: 3px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: mv-spin 0.9s linear infinite;
}

@keyframes mv-spin { to { transform: rotate(360deg); } }

.under-construction { border-left: 6px solid var(--warn); }
.fatal { border-left: 6px solid var(--danger); }
.error-details { margin-top: var(--space-3); }
.error-details summary { min-height: var(--tap); display: flex; align-items: center; cursor: pointer; }

.route-token { overflow-wrap: anywhere; }

.place-list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--space-2) var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); }
.place-list li { min-width: 0; padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); }
.place-link { display: flex; gap: var(--space-2); align-items: baseline; color: var(--text); font-weight: 700; text-decoration: none; }
.place-link:hover .place-title { text-decoration: underline; }
.place-num { flex: none; min-width: 1.6em; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.85rem; text-align: right; }
.place-summary { display: block; margin-left: calc(1.6em + var(--space-2)); color: var(--text-muted); font-size: 0.9rem; line-height: 1.4; }
```

### A.4 `js/core/theme.js`

```js
// js/core/theme.js
// Theme helpers. No top-level DOM access, so the module imports cleanly in Node.
//
//   cssVar(name)               computed value of a CSS custom property on <html>, trimmed
//   getTheme()                 'light' | 'dark', the theme in effect right now
//   setTheme(t)                'light' | 'dark' | 'auto'; persists, then fires 'themechange' on document
//   onThemeChange(cb)          cb(theme) on every themechange; returns unsubscribe
//   prefersReducedMotion()     boolean
//   initTheme()                called once by app.js start(); returns dispose()

const KEY = 'mv:theme'; // raw string 'light' | 'dark'. Not JSON: the pre-paint script in index.html reads it.
const DARK_QUERY = '(prefers-color-scheme: dark)';
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function media(query) {
  try {
    return typeof matchMedia === 'function' ? matchMedia(query) : null;
  } catch {
    return null;
  }
}

export function cssVar(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

export function getTheme() {
  try {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
  } catch {
    return 'light';
  }
  const m = media(DARK_QUERY);
  return m && m.matches ? 'dark' : 'light';
}

function storedTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

// Keep the browser chrome (phone address bar) in step with --bg.
function syncChrome() {
  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = cssVar('--bg');
    if (meta && bg) meta.setAttribute('content', bg);
  } catch {
    /* cosmetic only */
  }
}

function announce(mode) {
  syncChrome();
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: getTheme(), mode } }));
}

export function setTheme(t) {
  if (t !== 'light' && t !== 'dark' && t !== 'auto') {
    console.warn('[mv] setTheme ignored an unknown value:', t);
    return;
  }
  const root = document.documentElement;
  if (t === 'auto') {
    root.removeAttribute('data-theme');
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* private mode: the choice lasts until reload */
    }
  } else {
    root.setAttribute('data-theme', t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* same */
    }
  }
  announce(t);
}

export function onThemeChange(cb) {
  const handler = (e) => {
    try {
      cb(e && e.detail && e.detail.theme ? e.detail.theme : getTheme());
    } catch (err) {
      console.error('[mv] themechange listener threw', err);
    }
  };
  document.addEventListener('themechange', handler);
  return () => document.removeEventListener('themechange', handler);
}

export function prefersReducedMotion() {
  const m = media(MOTION_QUERY);
  return !!(m && m.matches);
}

let initialised = false;

// Applies a stored choice (the inline script in index.html already did, before first paint),
// syncs the browser chrome, and listens for OS theme changes while the student has not chosen.
// Never fires 'themechange' by itself on start.
export function initTheme() {
  if (initialised) return () => {};
  initialised = true;
  const stored = storedTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  syncChrome();
  const m = media(DARK_QUERY);
  const onOsChange = () => {
    if (!document.documentElement.hasAttribute('data-theme')) announce('auto');
  };
  if (m) {
    if (m.addEventListener) m.addEventListener('change', onOsChange);
    else if (m.addListener) m.addListener(onOsChange);
  }
  return function dispose() {
    initialised = false;
    if (!m) return;
    if (m.removeEventListener) m.removeEventListener('change', onOsChange);
    else if (m.removeListener) m.removeListener(onOsChange);
  };
}
```

### A.5 `js/core/store.js`

```js
// js/core/store.js
// A tiny key-value store: memory first, mirrored to localStorage as JSON.
// Every storage access is in try/catch; with storage blocked or full the store still works
// for the life of the page. Values must be JSON-serialisable. No top-level DOM access.
//
//   const store = createStore('mv:');
//   store.get(key, fallback)                 -> a fresh copy of the value, or fallback
//   store.set(key, value, { persist: true }) -> true when the value reached localStorage
//   store.remove(key)
//   store.subscribe(key, cb)                 -> unsubscribe; cb(value | undefined), this page only
//   store.keys()                             -> sorted array of keys (without the prefix)
//
// The key 'theme' is reserved: theme.js keeps a raw (non-JSON) string at localStorage 'mv:theme'.
// Second argument { storage } exists for unit tests (a localStorage-like object, or null).

export function createStore(prefix = 'mv:', options = {}) {
  const mem = new Map(); // key -> JSON string
  const subs = new Map(); // key -> Set<{ cb }>
  let storage; // undefined: not looked up yet; null: unavailable

  function ls() {
    if (storage !== undefined) return storage;
    try {
      storage = 'storage' in options ? options.storage : globalThis.localStorage;
    } catch {
      storage = null;
    }
    if (!storage) storage = null;
    return storage;
  }

  function read(key) {
    if (mem.has(key)) return mem.get(key);
    const s = ls();
    if (!s) return null;
    try {
      const raw = s.getItem(prefix + key);
      if (raw !== null && raw !== undefined) {
        mem.set(key, raw);
        return raw;
      }
    } catch {
      /* blocked */
    }
    return null;
  }

  function notify(key, value) {
    const set = subs.get(key);
    if (!set) return;
    for (const entry of [...set]) {
      try {
        entry.cb(value);
      } catch (err) {
        console.error(`[mv] store subscriber for "${key}" threw`, err);
      }
    }
  }

  function remove(key) {
    const had = read(key) !== null;
    mem.delete(key);
    try {
      const s = ls();
      if (s) s.removeItem(prefix + key);
    } catch {
      /* blocked */
    }
    if (had) notify(key, undefined);
  }

  return {
    get(key, fallback) {
      const raw = read(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(key, value, { persist = true } = {}) {
      if (value === undefined) {
        remove(key);
        return false;
      }
      let json;
      try {
        json = JSON.stringify(value);
      } catch (err) {
        console.warn(`[mv] store.set("${key}") skipped: value is not JSON-serialisable`, err);
        return false;
      }
      if (json === undefined) {
        remove(key);
        return false;
      }
      mem.set(key, json);
      let persisted = false;
      const s = ls();
      if (s) {
        try {
          if (persist) {
            s.setItem(prefix + key, json);
            persisted = true;
          } else {
            s.removeItem(prefix + key); // no stale copy may come back after a reload
          }
        } catch {
          /* quota or blocked: memory only */
        }
      }
      notify(key, JSON.parse(json));
      return persisted;
    },

    remove,

    subscribe(key, cb) {
      let set = subs.get(key);
      if (!set) subs.set(key, (set = new Set()));
      const entry = { cb };
      set.add(entry);
      return function unsubscribe() {
        set.delete(entry);
        if (set.size === 0 && subs.get(key) === set) subs.delete(key);
      };
    },

    keys() {
      const out = new Set(mem.keys());
      const s = ls();
      if (s) {
        try {
          for (let i = 0; i < s.length; i++) {
            const k = s.key(i);
            if (k && k.startsWith(prefix)) out.add(k.slice(prefix.length));
          }
        } catch {
          /* blocked */
        }
      }
      return [...out].sort();
    },
  };
}
```

### A.6 `js/app.js`

```js
// js/app.js
// The router and the shell behaviour. index.html calls start() once.
// No top-level DOM access: parseRoute, groupStations and documentTitle are pure and are
// imported by the unit tests in Node.
//
// Imports are limited to the registry and the two core helpers on purpose.

import { STATIONS, THREADS, stationById, stationForProblem, stationForTopic } from './registry.js';
import { cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion, initTheme } from './core/theme.js';
import { createStore } from './core/store.js';

export const SITE_TITLE = 'One Point, Two Addresses';

// The registry only carries the part letters; the names live here.
export const PART_TITLES = {
  I: { title: 'The point', note: 'Chapter 1' },
  II: { title: 'Curves and sets', note: 'Chapter 1' },
  III: { title: 'Motions', note: 'Chapter 2' },
  IV: { title: 'Zoom', note: 'Chapter 3' },
  V: { title: 'The diary and the index', note: 'Lab, 4D, problems' },
};

const TOKEN_RE = /^[A-Za-z0-9._~-]+$/;
const MAX_TOKEN = 120;
const LOADING_DELAY_MS = 150;

// ---------------------------------------------------------------- pure helpers

export function documentTitle(label) {
  return label ? `${label} · ${SITE_TITLE}` : SITE_TITLE;
}

// Stations grouped by registry part, in Story Map order.
export function groupStations(stations = STATIONS) {
  const sorted = [...stations].sort((a, b) => a.order - b.order);
  const groups = [];
  for (const st of sorted) {
    let g = groups.find((x) => x.part === st.part);
    if (!g) {
      const meta = PART_TITLES[st.part] || { title: `Part ${st.part}`, note: '' };
      g = { part: st.part, title: meta.title, note: meta.note, stations: [] };
      groups.push(g);
    }
    g.stations.push(st);
  }
  return groups;
}

// hash is location.hash ('#roots'), or any string with or without the leading '#'.
export function parseRoute(hash) {
  let raw = typeof hash === 'string' ? hash : '';
  if (raw.charAt(0) === '#') raw = raw.slice(1);
  if (raw === '') return { station: 'home', preset: null, raw: '' };
  const miss = { station: null, preset: null, raw };
  if (raw.length > MAX_TOKEN || !TOKEN_RE.test(raw)) return miss;

  const lower = raw.toLowerCase();

  // problem-1-4-2 -> 1.4.2 ; problem-P3 -> P3
  if (lower.startsWith('problem-')) {
    const dotted = raw.slice('problem-'.length).replace(/-/g, '.');
    for (const id of [dotted, dotted.toUpperCase()]) {
      const st = stationForProblem(id);
      if (st) return { station: st.id, preset: { kind: 'problem', id }, raw };
    }
    return miss;
  }

  // topic-T2-4 -> T2.4
  if (lower.startsWith('topic-')) {
    const dotted = raw.slice('topic-'.length).replace(/-/g, '.');
    for (const id of [dotted, dotted.toUpperCase()]) {
      const st = stationForTopic(id);
      if (st) return { station: st.id, preset: { kind: 'topic', id }, raw };
    }
    return miss;
  }

  const exact = stationById(lower);
  if (exact) return { station: exact.id, preset: null, raw };

  // <station-id>-<rest>: the longest station id that is a prefix followed by '-'
  let best = null;
  for (const st of STATIONS) {
    if (lower.length > st.id.length + 1 && lower.startsWith(st.id + '-') && (!best || st.id.length > best.id.length)) best = st;
  }
  if (best) return { station: best.id, preset: { kind: 'token', token: raw.slice(best.id.length + 1) }, raw };

  return miss;
}

// ---------------------------------------------------------------- DOM helpers (browser only)

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
  for (const c of [].concat(children === undefined ? [] : children)) node.append(c);
  return node;
}

function shorten(text, max) {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

const THEME_API = Object.freeze({ cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion });

let running = null;

export function start() {
  if (running) return running.stop;

  const view = document.getElementById('view');
  const nav = document.getElementById('site-nav');
  const navToggle = document.getElementById('nav-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const skipLink = document.getElementById('skip-link');
  const footer = document.getElementById('site-footer');
  const routeStatus = document.getElementById('route-status');
  if (!view || !nav) throw new Error('index.html must contain #view and #site-nav');

  const store = createStore('mv:');
  const state = { seq: 0, current: null, first: true, loadingTimer: 0 };
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  try {
    history.scrollRestoration = 'manual';
  } catch {
    /* not available */
  }

  // ------------------------------------------------------------ navigation list

  function buildNav() {
    nav.replaceChildren();
    const groups = groupStations(STATIONS);
    if (groups.length === 0) {
      nav.append(el('p', { class: 'muted' }, 'No places are registered.'));
      return;
    }
    for (const g of groups) {
      const titleId = `nav-part-${g.part}`;
      const list = el('ul', { class: 'nav-list', 'aria-labelledby': titleId });
      for (const st of g.stations) {
        const dots = el('span', { class: 'nav-threads', 'aria-hidden': 'true' });
        for (const t of st.threads || []) dots.append(el('i', { class: 'thread-dot', 'data-thread': t }));
        const link = el('a', { class: 'nav-link', id: `nav-${st.id}`, href: `#${st.id}`, 'data-station': st.id }, [
          el('span', { class: 'nav-num', 'aria-hidden': 'true' }, st.order === 0 ? '·' : String(st.order)),
          el('span', { class: 'nav-title' }, st.title),
          dots,
        ]);
        list.append(el('li', {}, link));
      }
      nav.append(
        el('section', { class: 'nav-part', 'data-part': g.part }, [
          el('p', { class: 'nav-part-title', id: titleId }, [
            el('span', { class: 'nav-part-roman' }, g.part),
            el('span', { class: 'nav-part-name' }, g.title),
            el('span', { class: 'nav-part-note' }, g.note),
          ]),
          list,
        ]),
      );
    }
  }

  function revealActive() {
    const a = nav.querySelector('a[aria-current="page"]');
    if (!a || nav.scrollHeight <= nav.clientHeight) return;
    const nr = nav.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    if (ar.top < nr.top || ar.bottom > nr.bottom) nav.scrollTop += ar.top - nr.top - (nr.height - ar.height) / 2;
  }

  function markCurrent(id) {
    for (const a of nav.querySelectorAll('a.nav-link')) {
      if (a.dataset.station === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    revealActive();
  }

  function navIsOpen() {
    return document.body.dataset.navOpen === 'true';
  }

  function setNavOpen(open, { restoreFocus = false } = {}) {
    if (open === navIsOpen()) return;
    const hadFocus = nav.contains(document.activeElement);
    document.body.dataset.navOpen = String(open);
    if (navToggle) navToggle.setAttribute('aria-expanded', String(open));
    // While the phone drawer covers the page, the page behind it must not take Tab stops
    // (the CSS also stops it scrolling). The header and the drawer stay live.
    for (const node of [view, footer]) if (node) node.toggleAttribute('inert', open);
    if (open) revealActive();
    else if (restoreFocus && navToggle && hadFocus) navToggle.focus();
  }

  // ------------------------------------------------------------ router panels

  function buildNoSuchPlace(raw) {
    const list = el('ol', { class: 'place-list', id: 'no-such-place-list' });
    for (const st of [...STATIONS].sort((a, b) => a.order - b.order)) {
      list.append(
        el('li', {}, [
          el('a', { class: 'place-link', href: `#${st.id}` }, [
            el('span', { class: 'place-num' }, st.order === 0 ? '·' : String(st.order)),
            el('span', { class: 'place-title' }, st.title),
          ]),
          el('span', { class: 'place-summary' }, st.summary || ''),
        ]),
      );
    }
    return el('div', { class: 'panel no-such-place', id: 'no-such-place' }, [
      el('h1', { class: 'panel-title' }, 'No such place'),
      el('p', { class: 'lede' }, ['Nothing lives at ', el('code', { class: 'route-token' }, `#${shorten(raw, 60)}`), '.']),
      el('p', {}, 'The link may be mistyped or from an older version. Pick a place below, or go back to the map.'),
      el('p', { class: 'muted' }, [
        'Problem links look like ',
        el('code', {}, '#problem-1-4-2'),
        ' or ',
        el('code', {}, '#problem-P3'),
        '. Topic links look like ',
        el('code', {}, '#topic-T2-4'),
        '.',
      ]),
      el('div', { class: 'row' }, el('a', { class: 'btn btn-primary', id: 'no-such-place-home', href: '#home' }, 'Back to the map')),
      el('h2', { class: 'panel-subtitle' }, 'All the places'),
      list,
    ]);
  }

  function buildUnderConstruction(st, err) {
    // A reload, not a second import(): Chromium keeps a failed module, and a failed module that
    // the station itself imports, in its module map for the life of the page, so only a fresh
    // page can recover from a dropped connection. The hash stays, so the same place comes back.
    const retry = el('button', { type: 'button', class: 'btn', id: 'under-construction-retry' }, 'Reload the page');
    retry.addEventListener('click', () => location.reload());
    // No role="status" here: the router already announces this state through #route-status.
    return el('div', { class: 'panel under-construction', 'data-station-error': st.id }, [
      el('h1', { class: 'panel-title' }, st.title),
      el('p', { class: 'lede' }, 'This station is under construction.'),
      el('p', {}, 'It did not load. If your connection dropped, reload the page. If not, there is nothing to draw here yet. The rest of the map still works.'),
      el('div', { class: 'row' }, [el('a', { class: 'btn btn-primary', id: 'under-construction-home', href: '#home' }, 'Back to the map'), retry]),
      el('details', { class: 'error-details' }, [
        el('summary', {}, 'What went wrong'),
        el('pre', { id: 'under-construction-detail' }, String(err && err.message ? err.message : err)),
      ]),
    ]);
  }

  // ------------------------------------------------------------ mounting

  function navigate(token) {
    const hash = `#${String(token).replace(/^#/, '')}`;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function makeCtx(route, st) {
    return Object.freeze({
      navigate,
      route: route.raw || 'home',
      station: st,
      stations: STATIONS,
      threads: THREADS,
      preset: route.preset,
      store,
      theme: THEME_API,
    });
  }

  function runUnmount(id, fn) {
    if (typeof fn !== 'function') return;
    try {
      fn();
    } catch (err) {
      console.error(`[mv] unmount of station "${id}" threw`, err);
    }
  }

  function teardown() {
    const cur = state.current;
    state.current = null;
    if (cur) runUnmount(cur.id, cur.unmount);
  }

  function finish(first, label) {
    if (routeStatus) routeStatus.textContent = label;
    if (!first) view.focus({ preventScroll: true });
  }

  async function render() {
    const seq = ++state.seq;
    clearTimeout(state.loadingTimer);
    teardown();
    const first = state.first;
    state.first = false;

    const route = parseRoute(location.hash);
    const st = route.station ? stationById(route.station) : null;

    setNavOpen(false);
    view.replaceChildren();
    view.dataset.route = route.raw || 'home';
    view.dataset.station = st ? st.id : '';
    window.scrollTo(0, 0);
    markCurrent(st ? st.id : null);

    if (!st) {
      view.dataset.state = 'nosuchplace';
      document.title = documentTitle('No such place');
      view.append(buildNoSuchPlace(route.raw));
      finish(first, 'No such place');
      return;
    }

    view.dataset.state = 'loading';
    document.title = documentTitle(st.title);
    const section = el('section', { class: 'station', id: `station-${st.id}`, 'data-station': st.id });
    view.append(section);
    let placeholder = null;
    state.loadingTimer = setTimeout(() => {
      if (seq !== state.seq || view.dataset.state !== 'loading') return;
      placeholder = el('div', { class: 'loading', role: 'status' }, [el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Loading...']);
      section.append(placeholder);
    }, LOADING_DELAY_MS);

    try {
      const mod = await import(st.module);
      if (seq !== state.seq) return;
      if (typeof mod.mount !== 'function') throw new Error(`station module ${st.module} has no mount() export`);
      clearTimeout(state.loadingTimer);
      if (placeholder) placeholder.remove();
      section.replaceChildren();
      const unmount = await mod.mount(section, makeCtx(route, st));
      if (seq !== state.seq) {
        runUnmount(st.id, unmount);
        return;
      }
      state.current = { id: st.id, unmount: typeof unmount === 'function' ? unmount : null };
      view.dataset.state = 'ready';
      finish(first, st.title);
    } catch (err) {
      // A superseded navigation must not touch the timer: it now belongs to the newer one.
      if (seq !== state.seq) return;
      clearTimeout(state.loadingTimer);
      console.error(`[mv] station "${st.id}" failed to load: ${err && err.message ? err.message : err}`, err);
      section.replaceChildren(buildUnderConstruction(st, err));
      view.dataset.state = 'error';
      finish(first, `${st.title}: under construction`);
    }
  }

  // ------------------------------------------------------------ wiring

  const disposeTheme = initTheme();

  if (themeToggle) {
    const syncToggle = () => themeToggle.setAttribute('aria-pressed', String(getTheme() === 'dark'));
    syncToggle();
    listen(themeToggle, 'click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
    cleanups.push(onThemeChange(syncToggle));
  }

  if (navToggle) {
    listen(navToggle, 'click', () => setNavOpen(!navIsOpen()));
  }
  // Choosing a place closes the drawer. The router closes it on every navigation, but a link to
  // the place already showing fires no hashchange, so close it here too. In that case nothing
  // re-renders, so put focus on the page rather than leave it on a link that just disappeared.
  listen(nav, 'click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a.nav-link') : null;
    if (!link) return;
    const staysHere = link.getAttribute('href') === location.hash;
    setNavOpen(false);
    if (staysHere) view.focus({ preventScroll: true });
  });
  listen(document, 'keydown', (e) => {
    if (e.key === 'Escape' && navIsOpen()) setNavOpen(false, { restoreFocus: true });
  });
  listen(document, 'pointerdown', (e) => {
    if (navIsOpen() && !nav.contains(e.target) && !(navToggle && navToggle.contains(e.target))) setNavOpen(false);
  });
  try {
    const wide = matchMedia('(min-width: 56.25rem)');
    const onWide = (e) => {
      if (e.matches) setNavOpen(false);
    };
    if (wide.addEventListener) {
      wide.addEventListener('change', onWide);
      cleanups.push(() => wide.removeEventListener('change', onWide));
    }
  } catch {
    /* no matchMedia */
  }

  // The skip link must not leave '#view' in the address bar: every '#token' is a route.
  if (skipLink) {
    listen(skipLink, 'click', (e) => {
      e.preventDefault();
      setNavOpen(false);
      view.focus();
    });
  }

  buildNav();
  listen(window, 'hashchange', render);

  const mv = (window.__mv = window.__mv || { planes: new Map() });
  if (!mv.planes) mv.planes = new Map();
  mv.app = { render, navigate, state: () => view.dataset.state };

  function stop() {
    for (const fn of cleanups.splice(0)) fn();
    clearTimeout(state.loadingTimer);
    state.seq++;
    teardown();
    setNavOpen(false);
    disposeTheme();
    if (window.__mv && window.__mv.app) delete window.__mv.app;
    running = null;
  }

  running = { stop };
  render();
  return stop;
}
```

## Appendix B. Reference tests

### B.1 `tests/unit/i1-shell.test.mjs`

```js
// tests/unit/i1-shell.test.mjs
// Pure and stubbed-DOM tests for the app shell: route parsing, nav grouping, store, theme,
// and static checks on index.html, css/theme.css and css/components.css.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Importing must not touch the DOM (A1, A6).
const app = await import('../../js/app.js');
const { parseRoute, groupStations, documentTitle, SITE_TITLE } = app;
const { STATIONS, stationForProblem, stationForTopic } = await import('../../js/registry.js');
const { createStore } = await import('../../js/core/store.js');
const themeMod = await import('../../js/core/theme.js');

// ------------------------------------------------------------------ A1: parseRoute

test('parseRoute: the forms named in the goal', () => {
  const cases = [
    ['', 'home', null],
    ['#', 'home', null],
    ['#roots', 'roots', null],
    ['#problem-1-4-2', 'roots', { kind: 'problem', id: '1.4.2' }],
    ['#problem-P3', 'linear', { kind: 'problem', id: 'P3' }],
    ['#topic-T2-4', 'staircase', { kind: 'topic', id: 'T2.4' }],
    ['#lab-2-5-1', 'lab', { kind: 'token', token: '2-5-1' }],
    ['#principal-root-sweep', 'principal-root', { kind: 'token', token: 'sweep' }],
    ['#cauchy-riemann', 'cauchy-riemann', null],
    ['#nosuchplace', null, null],
  ];
  for (const [hash, station, preset] of cases) {
    const r = parseRoute(hash);
    assert.equal(r.station, station, `station for ${JSON.stringify(hash)}`);
    assert.deepEqual(r.preset, preset, `preset for ${JSON.stringify(hash)}`);
    assert.equal(typeof r.raw, 'string');
  }
});

test('parseRoute: raw is the token without the leading #', () => {
  assert.equal(parseRoute('#roots').raw, 'roots');
  assert.equal(parseRoute('roots').station, 'roots');
  assert.equal(parseRoute('').raw, '');
  assert.equal(parseRoute('#nosuchplace').raw, 'nosuchplace');
  assert.equal(parseRoute(undefined).station, 'home');
});

test('parseRoute: every problem and topic deep link resolves to the registry owner', () => {
  const index = STATIONS.find((s) => s.id === 'problems');
  assert.equal(index.problems.length, 29);
  assert.equal(index.topics.length, 12);
  const expectedProblem = {
    '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance',
    '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots',
    '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear',
    '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches',
    '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann',
    P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann',
  };
  for (const id of index.problems) {
    const r = parseRoute(`#problem-${id.replace(/\./g, '-')}`);
    assert.equal(r.station, expectedProblem[id], `problem ${id}`);
    assert.equal(r.station, stationForProblem(id).id);
    assert.deepEqual(r.preset, { kind: 'problem', id });
  }
  const expectedTopic = {
    'T1.1': 'addresses', 'T1.2': 'distance', 'T1.3': 'addresses', 'T1.4': 'powers', 'T1.5': 'curves',
    'T2.1': 'mappings', 'T2.2': 'powermap', 'T2.3': 'limits', 'T2.4': 'staircase', 'T2.5': 'reciprocal',
    'T3.1': 'derivative', 'T3.2': 'cauchy-riemann',
  };
  for (const id of index.topics) {
    const r = parseRoute(`#topic-${id.replace('.', '-')}`);
    assert.equal(r.station, expectedTopic[id], `topic ${id}`);
    assert.equal(r.station, stationForTopic(id).id);
    assert.deepEqual(r.preset, { kind: 'topic', id });
  }
});

test('parseRoute: every station id is its own route', () => {
  for (const s of STATIONS) assert.deepEqual(parseRoute(`#${s.id}`), { station: s.id, preset: null, raw: s.id });
});

test('parseRoute: unknown, malformed and over-long tokens are No such place', () => {
  const bad = [
    '#a=b', '#roots?x=1', '#roots/', '#/roots', '#roots%20', '#roots-', '#problem-', '#problem-9-9-9',
    '#problem-1-4', '#topic-T9-9', '#topic-', '#problem-1--2', '#home extra', '#' + 'a'.repeat(500),
  ];
  for (const hash of bad) {
    const r = parseRoute(hash);
    assert.equal(r.station, null, hash.slice(0, 40));
    assert.equal(r.preset, null);
  }
});

test('parseRoute: a longer station id wins over a shorter prefix; presets keep their case', () => {
  assert.equal(parseRoute('#principal-root-sweep').station, 'principal-root');
  assert.deepEqual(parseRoute('#lab-P4').preset, { kind: 'token', token: 'P4' });
  assert.deepEqual(parseRoute('#roots-unity'), { station: 'roots', preset: { kind: 'token', token: 'unity' }, raw: 'roots-unity' });
});

test('parseRoute: station and id letter case is forgiven', () => {
  assert.equal(parseRoute('#Roots').station, 'roots');
  assert.deepEqual(parseRoute('#problem-p3').preset, { kind: 'problem', id: 'P3' });
  assert.deepEqual(parseRoute('#Topic-t2-4').preset, { kind: 'topic', id: 'T2.4' });
  assert.equal(parseRoute('#LAB-2-5-1').station, 'lab');
});

// ------------------------------------------------------------------ nav model and title

test('groupStations: five parts in order with the registry stations', () => {
  const g = groupStations(STATIONS);
  assert.deepEqual(g.map((x) => x.part), ['I', 'II', 'III', 'IV', 'V']);
  assert.deepEqual(g.map((x) => x.stations.length), [7, 2, 7, 2, 3]);
  assert.equal(g.reduce((n, x) => n + x.stations.length, 0), STATIONS.length);
  assert.equal(g[0].stations[0].id, 'home');
  assert.deepEqual(g.map((x) => x.title), ['The point', 'Curves and sets', 'Motions', 'Zoom', 'The diary and the index']);
  const orders = g.flatMap((x) => x.stations.map((s) => s.order));
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  assert.equal(groupStations([{ id: 'x', title: 'X', order: 1, part: 'IX' }])[0].title, 'Part IX');
  assert.deepEqual(groupStations([]), []);
});

test('documentTitle', () => {
  assert.equal(SITE_TITLE, 'One Point, Two Addresses');
  assert.equal(documentTitle('The Map'), 'The Map · One Point, Two Addresses');
  assert.equal(documentTitle(''), 'One Point, Two Addresses');
});

// ------------------------------------------------------------------ store

function fakeStorage() {
  const m = new Map();
  return {
    m,
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

test('store: round trip, JSON under the prefix, fresh copies', () => {
  const storage = fakeStorage();
  const s = createStore('mv:', { storage });
  assert.equal(s.get('progress', 'none'), 'none');
  assert.equal(s.set('progress', { done: ['1.1.1'], n: 1 }), true);
  assert.equal(storage.m.get('mv:progress'), '{"done":["1.1.1"],"n":1}');
  const a = s.get('progress');
  a.done.push('x');
  assert.deepEqual(s.get('progress'), { done: ['1.1.1'], n: 1 });
  const s2 = createStore('mv:', { storage });
  assert.deepEqual(s2.get('progress'), { done: ['1.1.1'], n: 1 });
  assert.deepEqual(s.keys(), ['progress']);
  s.remove('progress');
  assert.equal(storage.m.has('mv:progress'), false);
  assert.equal(s.get('progress'), undefined);
});

test('store: a throwing or missing localStorage never throws', () => {
  const boom = { get length() { throw new Error('x'); }, key() { throw new Error('x'); }, getItem() { throw new Error('x'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };
  for (const storage of [boom, null]) {
    const s = createStore('mv:', { storage });
    assert.equal(s.get('a', 7), 7);
    assert.equal(s.set('a', [1, 2]), false);
    assert.deepEqual(s.get('a'), [1, 2]);
    assert.deepEqual(s.keys(), ['a']);
    s.remove('a');
    assert.equal(s.get('a', 'gone'), 'gone');
  }
});

test('store: persist false stays in memory and clears any stale stored copy', () => {
  const storage = fakeStorage();
  const s = createStore('mv:', { storage });
  s.set('lab.request', { fn: 'recip' });
  assert.equal(storage.m.has('mv:lab.request'), true);
  assert.equal(s.set('lab.request', { fn: 'sq' }, { persist: false }), false);
  assert.equal(storage.m.has('mv:lab.request'), false);
  assert.deepEqual(s.get('lab.request'), { fn: 'sq' });
});

test('store: corrupt JSON gives the fallback; unserialisable values are refused', () => {
  const storage = fakeStorage();
  storage.setItem('mv:bad', '{oops');
  const s = createStore('mv:', { storage });
  assert.equal(s.get('bad', 'fallback'), 'fallback');
  const cyc = {};
  cyc.self = cyc;
  const warn = console.warn;
  console.warn = () => {};
  try { assert.equal(s.set('cyc', cyc), false); } finally { console.warn = warn; }
  assert.equal(s.get('cyc', 'none'), 'none');
  s.set('x', 1);
  s.set('x', undefined);
  assert.equal(s.get('x', 'gone'), 'gone');
});

test('store: subscribe sees set and remove, unsubscribe stops it, a throwing listener is isolated', () => {
  const s = createStore('mv:', { storage: fakeStorage() });
  const seen = [];
  const un = s.subscribe('k', (v) => seen.push(v));
  const other = [];
  s.subscribe('other', (v) => other.push(v));
  const err = console.error;
  console.error = () => {};
  try { s.subscribe('k', () => { throw new Error('listener'); }); s.set('k', 1); } finally { console.error = err; }
  s.set('k', { a: 2 });
  s.remove('k');
  un();
  s.set('k', 3);
  assert.deepEqual(seen, [1, { a: 2 }, undefined]);
  assert.deepEqual(other, []);
  s.remove('never-set');
  assert.deepEqual(other, []);
});

test('store: prefixes isolate keys', () => {
  const storage = fakeStorage();
  const a = createStore('a:', { storage });
  const b = createStore('b:', { storage });
  a.set('k', 1);
  assert.equal(b.get('k', 'none'), 'none');
  assert.deepEqual(b.keys(), []);
});

// ------------------------------------------------------------------ theme (stubbed DOM)

function installDom({ dark = false, stored = null, throwingStorage = false } = {}) {
  const attrs = new Map();
  const doc = new EventTarget();
  const meta = { content: '', setAttribute(k, v) { if (k === 'content') this.content = v; } };
  doc.documentElement = {
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    hasAttribute: (k) => attrs.has(k),
  };
  doc.querySelector = (sel) => (sel === 'meta[name="theme-color"]' ? meta : null);
  const storage = fakeStorage();
  if (stored) storage.setItem('mv:theme', stored);
  const listeners = [];
  globalThis.document = doc;
  globalThis.localStorage = throwingStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }
    : storage;
  globalThis.getComputedStyle = () => ({ getPropertyValue: (n) => (n === '--bg' ? ' #f6f3ec ' : n === '--cart' ? ' #0b63ad ' : '') });
  globalThis.matchMedia = (q) => ({
    matches: q.includes('prefers-color-scheme') ? dark : false,
    addEventListener: (_t, fn) => listeners.push(fn),
    removeEventListener: (_t, fn) => listeners.splice(listeners.indexOf(fn), 1),
  });
  return { attrs, doc, storage, meta, listeners };
}
function uninstallDom() {
  for (const k of ['document', 'localStorage', 'getComputedStyle', 'matchMedia']) delete globalThis[k];
}

test('theme: cssVar trims; getTheme follows data-theme, then the OS preference', () => {
  const env = installDom({ dark: true });
  try {
    assert.equal(themeMod.cssVar('--cart'), '#0b63ad');
    assert.equal(themeMod.getTheme(), 'dark');
    env.attrs.set('data-theme', 'light');
    assert.equal(themeMod.getTheme(), 'light');
  } finally { uninstallDom(); }
  const env2 = installDom({ dark: false });
  try { assert.equal(themeMod.getTheme(), 'light'); } finally { uninstallDom(); }
});

test('theme: setTheme sets the attribute, stores a raw string, fires one themechange', () => {
  const env = installDom({ dark: false });
  try {
    const events = [];
    const un = themeMod.onThemeChange((t) => events.push(['cb', t]));
    env.doc.addEventListener('themechange', (e) => events.push(['evt', e.detail.theme, e.detail.mode]));
    themeMod.setTheme('dark');
    assert.equal(env.attrs.get('data-theme'), 'dark');
    assert.equal(env.storage.getItem('mv:theme'), 'dark');
    assert.equal(env.meta.content, '#f6f3ec');
    assert.deepEqual(events, [['cb', 'dark'], ['evt', 'dark', 'dark']]);
    themeMod.setTheme('light');
    assert.equal(themeMod.getTheme(), 'light');
    assert.equal(env.storage.getItem('mv:theme'), 'light');
    un();
    events.length = 0;
    themeMod.setTheme('dark');
    assert.deepEqual(events.map((e) => e[0]), ['evt']);
    themeMod.setTheme('auto');
    assert.equal(env.attrs.has('data-theme'), false);
    assert.equal(env.storage.getItem('mv:theme'), null);
    const warn = console.warn;
    console.warn = () => {};
    try { themeMod.setTheme('purple'); } finally { console.warn = warn; }
    assert.equal(env.attrs.has('data-theme'), false);
  } finally { uninstallDom(); }
});

test('theme: a blocked localStorage does not stop the switch', () => {
  const env = installDom({ throwingStorage: true });
  try {
    let n = 0;
    env.doc.addEventListener('themechange', () => n++);
    themeMod.setTheme('dark');
    assert.equal(env.attrs.get('data-theme'), 'dark');
    assert.equal(n, 1);
    themeMod.setTheme('auto');
  } finally { uninstallDom(); }
});

test('theme: initTheme applies a stored choice silently and follows the OS only in auto mode', () => {
  const env = installDom({ stored: 'dark' });
  try {
    let n = 0;
    env.doc.addEventListener('themechange', () => n++);
    const dispose = themeMod.initTheme();
    assert.equal(env.attrs.get('data-theme'), 'dark');
    assert.equal(n, 0);
    assert.equal(env.listeners.length, 1);
    env.listeners[0]();
    assert.equal(n, 0, 'explicit choice ignores OS changes');
    env.attrs.delete('data-theme');
    env.listeners[0]();
    assert.equal(n, 1, 'auto mode follows the OS');
    dispose();
    assert.equal(env.listeners.length, 0);
  } finally { uninstallDom(); }
});

test('theme: prefersReducedMotion is false without matchMedia', () => {
  assert.equal(themeMod.prefersReducedMotion(), false);
});

// ------------------------------------------------------------------ A5: tokens

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (h) => { const [r, g, b] = hexToRgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

function themeBlocks() {
  const css = read('css/theme.css');
  const decls = (body) => Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const light = css.match(/(?:^|\n):root\s*\{([^}]*)\}/);
  const darkMedia = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}\s*\}/);
  const darkAttr = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  assert.ok(light, ':root block');
  assert.ok(darkMedia, 'prefers-color-scheme dark block guarded by :not([data-theme="light"])');
  assert.ok(darkAttr, ':root[data-theme="dark"] block');
  return { css, light: decls(light[1]), darkMedia: decls(darkMedia[1]), darkAttr: decls(darkAttr[1]) };
}

const COLOUR_TOKENS = ['--bg', '--surface', '--surface-2', '--text', '--text-muted', '--border', '--border-strong', '--accent', '--on-accent', '--focus',
  '--cart', '--polar', '--input', '--output', '--seam', '--t0', '--t1', '--ok', '--warn', '--danger'];
const THEME_TOKENS = [...COLOUR_TOKENS, '--ghost-alpha', '--shadow', '--icon-sun', '--icon-moon'];
const SHARED_TOKENS = ['--font', '--font-display', '--font-mono', '--radius', '--radius-sm', '--space-1', '--space-2', '--space-3', '--space-4', '--space-5',
  '--gutter', '--tap', '--header-h', '--sidebar-w', '--content-max'];

test('theme.css: every theme token is in all three blocks; the two dark blocks are identical', () => {
  const b = themeBlocks();
  for (const t of THEME_TOKENS) for (const name of ['light', 'darkMedia', 'darkAttr']) assert.ok(t in b[name], `${t} missing from ${name}`);
  for (const t of SHARED_TOKENS) assert.ok(t in b.light, `${t} missing from :root`);
  assert.deepEqual(b.darkMedia, b.darkAttr);
  for (const t of COLOUR_TOKENS) for (const name of ['light', 'darkMedia', 'darkAttr']) assert.match(b[name][t], /^#[0-9a-f]{6}$/, `${t} in ${name}`);
  for (const t of ['--font', '--font-display', '--font-mono']) assert.doesNotMatch(b.light[t], /https?:|url\(/);
});

test('theme.css: body has an explicit background token and reduced motion is honoured', () => {
  const { css } = themeBlocks();
  assert.match(css, /body\s*\{[^}]*background:\s*var\(--bg\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus\)/);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none/);
});

test('theme.css: ghost arcs never exceed alpha 0.35 in any theme', () => {
  const b = themeBlocks();
  for (const name of ['light', 'darkMedia', 'darkAttr']) {
    const a = parseFloat(b[name]['--ghost-alpha']);
    assert.ok(a > 0 && a <= 0.35, `${name}: ${b[name]['--ghost-alpha']}`);
  }
});

test('contrast helper matches the WCAG reference values', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrast('#777777', '#ffffff').toFixed(2), '4.48');
  assert.equal(contrast('#767676', '#ffffff').toFixed(2), '4.54');
  assert.equal(contrast('#1a2230', '#ffffff').toFixed(2), '15.96');
});

test('theme.css: contrast thresholds hold in light and dark', () => {
  const b = themeBlocks();
  for (const [name, T] of [['light', b.light], ['dark', b.darkAttr]]) {
    for (const bg of ['--bg', '--surface', '--surface-2']) {
      const at = (tok) => contrast(T[tok], T[bg]);
      assert.ok(at('--text') >= 7, `${name} --text on ${bg}`);
      for (const tok of ['--text-muted', '--accent', '--cart', '--polar', '--input', '--output', '--ok', '--warn', '--danger']) assert.ok(at(tok) >= 4.5, `${name} ${tok} on ${bg}: ${at(tok).toFixed(2)}`);
      for (const tok of ['--seam', '--border-strong', '--focus', '--t0', '--t1']) assert.ok(at(tok) >= 3, `${name} ${tok} on ${bg}: ${at(tok).toFixed(2)}`);
    }
    assert.ok(contrast(T['--on-accent'], T['--accent']) >= 4.5, `${name} on-accent`);
    assert.ok(luminance(T['--t0']) < luminance(T['--t1']), `${name} time ramp runs dark to bright`);
    assert.ok(contrast(T['--cart'], T['--polar']) >= 1.0);
  }
});

test('theme.css: the pinned palette (light) from the design', () => {
  const { light } = themeBlocks();
  assert.equal(light['--cart'], '#0b63ad');
  assert.equal(light['--polar'], '#a84300');
  assert.equal(light['--input'], '#006e53');
  assert.equal(light['--output'], '#9d3a8a');
});

test('components.css: no colour literals, no bare outline removal', () => {
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'hex colour');
  assert.doesNotMatch(css, /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/, 'colour function');
  const named = /(?:color|background|border(?:-[a-z]+)*|fill|stroke|outline(?:-color)?)\s*:[^;{}]*\b(?:white|black|red|green|blue|gray|grey|orange|purple|yellow|pink|silver|navy|teal|maroon)\b/i;
  assert.doesNotMatch(css, named, 'named colour');
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (/outline\s*:\s*(none|0)\b/.test(m[2])) assert.match(m[1].trim(), /^#view:focus$/, `outline removed on ${m[1].trim()}`);
  }
});

test('components.css: flex summaries get a drawn chevron (display:flex removes the browser triangle)', () => {
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.colour-key summary::before/);
  assert.match(css, /\.error-details summary::before/);
  assert.match(css, /\[open\] > summary::before/);
});

// ------------------------------------------------------------------ A6 and the page itself

test('app.js imports only the registry and the two core helpers', () => {
  const src = read('js/app.js');
  const specs = [...src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]).sort();
  assert.deepEqual(specs, ['./core/store.js', './core/theme.js', './registry.js']);
  assert.doesNotMatch(src, /import\(\s*['"]/, 'the only import() is the station module taken from the registry');
  assert.match(src, /await import\(st\.module\)/);
  assert.match(src, /data-station-error/);
  assert.match(src, /console\.error/);
  assert.doesNotMatch(src, /\bfrom\s+['"]\//, 'no absolute imports');
});

test('index.html: landmarks, ids, local assets only, KaTeX before the module', () => {
  const html = read('index.html');
  for (const id of ['site-header', 'site-title', 'theme-toggle', 'nav-toggle', 'site-nav', 'view', 'skip-link', 'route-status', 'colour-key']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /<a class="site-title" id="site-title" href="#home">/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /name="viewport"/);
  const urls = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
  for (const u of urls) assert.ok(u.startsWith('#') || u.startsWith('data:') || !/^(?:[a-z]+:)?\/\//i.test(u), `external URL in index.html: ${u}`);
  for (const u of urls.filter((x) => !x.startsWith('#') && !x.startsWith('data:'))) assert.ok(fs.existsSync(path.join(ROOT, u)), `missing file: ${u}`);
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  assert.ok(html.indexOf('vendor/katex/katex.min.js') < html.indexOf('type="module"'));
  assert.ok(html.indexOf('css/theme.css') < html.indexOf('css/components.css'));
  assert.match(html, /import\('\.\/js\/app\.js'\)/);
  assert.match(html, /m\.start\(\)/);
});

// ------------------------------------------------------------------ fix round: drawer, retry, race, key arcs

test('app.js: any nav link activation closes the drawer (a link to the current place fires no hashchange)', () => {
  const src = read('js/app.js');
  const m = src.match(/listen\(nav, 'click', \(e\) => \{([\s\S]*?)\n  \}\);/);
  assert.ok(m, 'a click listener on the nav');
  assert.match(m[1], /closest\('a\.nav-link'\)/);
  assert.match(m[1], /setNavOpen\(false\)/);
  assert.match(m[1], /view\.focus\(/, 'focus must not be left on a link inside the closed drawer');
});

test('app.js: the page behind the open drawer is inert, and the CSS locks its scroll', () => {
  const src = read('js/app.js');
  assert.match(src, /toggleAttribute\('inert', open\)/);
  assert.match(src, /getElementById\('site-footer'\)/);
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /body\[data-nav-open="true"\]\s*\{[^}]*overflow:\s*hidden/);
});

test('app.js: a stale navigation that fails must not clear the newer navigation\'s loading timer', () => {
  const src = read('js/app.js');
  const renderSrc = src.slice(src.indexOf('async function render()'));
  const catchBlock = renderSrc.match(/\} catch \(err\) \{\n([\s\S]*?)\n    \}\n  \}\n/);
  assert.ok(catchBlock, 'the render() catch block');
  const code = catchBlock[1].replace(/^\s*\/\/.*$/gm, '');
  assert.ok(code.indexOf('seq !== state.seq') >= 0 && code.indexOf('seq !== state.seq') < code.indexOf('clearTimeout'), 'the seq check comes before clearTimeout');
});

test('app.js: the under-construction panel announces once and its button reloads the page', () => {
  const src = read('js/app.js');
  const fn = src.match(/function buildUnderConstruction\(st, err\) \{([\s\S]*?)\n  \}\n/);
  assert.ok(fn, 'buildUnderConstruction');
  assert.doesNotMatch(fn[1], /role:/, '#route-status is the live region; the panel must not be a second one');
  assert.match(fn[1], /location\.reload\(\)/);
  assert.match(fn[1], /'Reload the page'/);
  assert.doesNotMatch(fn[1], /'Try again'/, 'a button that cannot recover must not promise to');
});

test('index.html: the arg and Arg key entries are drawn as arcs, one solid and a stack of faint ones', () => {
  const html = read('index.html');
  const items = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]).filter((x) => x.includes('key-line'));
  const home = items.find((x) => x.includes('arg-home'));
  const ghost = items.find((x) => x.includes('arg-ghost'));
  assert.ok(home && ghost);
  const arcs = (x, cls) => {
    const d = x.match(new RegExp(`class="${cls}" d="([^"]+)"`))[1];
    return d.split('M').filter(Boolean).map((seg) => /A\d/.test(seg));
  };
  assert.deepEqual(arcs(home, 'arg-home'), [true], 'one solid arc');
  assert.ok(arcs(ghost, 'arg-ghost').length >= 3 && arcs(ghost, 'arg-ghost').every(Boolean), 'at least three faint arcs');
  assert.doesNotMatch(home, /<line class="arg-home"/);
  assert.doesNotMatch(ghost, /<line class="arg-ghost"/);
  const css = read('css/components.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.key-line path\s*\{[^}]*fill:\s*none/, 'arc swatches must not be filled');
  assert.match(css, /\.key-line \.arg-ghost\s*\{[^}]*opacity:\s*var\(--ghost-alpha\)/);
});
```

### B.2 `tests/interact/i1-shell.mjs`

```js
// tests/interact/i1-shell.mjs
// Run: node tools/smoke.mjs --route nosuchplace --dark --script tests/interact/i1-shell.mjs
// The harness runs this once per viewport (desktop 1280x860, phone 390x844, desktop-dark).
//
// This script provokes router failures on purpose (including a forced 404 for the distance station
// in section 3e), so the harness reports their console errors as problems and exits 1. See
// "Expected harness output" in docs/designs/iter-1/i1-shell.md:
// the script is correct when it prints no "interaction script failed" line and every problem
// line the harness prints is one of the expected kinds.
import { STATIONS } from '../../js/registry.js';

const SUFFIX = ' · One Point, Two Addresses';

export default async function (page, ctx) {
  const { viewport, log, assert, shot } = ctx;
  const phone = viewport.width < 900;
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const routerErrors = (re) => errors.filter((e) => re.test(e)).length;
  const attr = (sel, name) => page.getAttribute(sel, name);
  const count = (sel) => page.locator(sel).count();
  const text = async (sel) => (await page.textContent(sel)) || '';
  const noOverflow = async (when) => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(over <= 1, `horizontal overflow of ${over}px ${when}`);
  };
  // Set the hash, then wait until the router has finished that navigation.
  const go = async (token) => {
    await page.evaluate((t) => { location.hash = '#' + t; }, token);
    await page.waitForFunction((t) => {
      const v = document.querySelector('#view');
      return v && v.dataset.route === (t || 'home') && v.dataset.state && v.dataset.state !== 'loading';
    }, token, { timeout: 8000 });
  };
  const openNav = async () => {
    if (!phone) return;
    if ((await attr('#nav-toggle', 'aria-expanded')) !== 'true') await page.click('#nav-toggle');
    assert((await attr('#nav-toggle', 'aria-expanded')) === 'true', 'nav toggle did not open the drawer');
  };

  // ---------------------------------------------------------------- 1. the page at load
  assert((await attr('#view', 'data-state')) === 'nosuchplace', 'run this script with --route nosuchplace (the start route must be the No-such-place panel)');
  assert((await page.title()) === 'No such place' + SUFFIX, `title: ${await page.title()}`);
  assert((await attr('#site-title', 'href')) === '#home', 'title link goes to #home');
  assert((await count('[data-station-error]')) === 0, 'No-such-place panel must not carry data-station-error');
  assert((await text('#no-such-place h1')) === 'No such place', 'panel heading');
  assert((await text('#no-such-place .route-token')) === '#nosuchplace', 'panel shows the token');
  const places = await page.$$eval('#no-such-place-list a', (as) => as.map((a) => ({ href: a.getAttribute('href'), title: a.querySelector('.place-title').textContent })));
  assert(places.length === STATIONS.length && STATIONS.length === 21, `place list has ${places.length} links`);
  const sorted = [...STATIONS].sort((a, b) => a.order - b.order);
  sorted.forEach((s, i) => assert(places[i].href === '#' + s.id && places[i].title === s.title, `place ${i}: ${places[i].title}`));

  const navLinks = await page.$$eval('#site-nav a.nav-link', (as) => as.map((a) => a.getAttribute('href')));
  assert(JSON.stringify(navLinks) === JSON.stringify(sorted.map((s) => '#' + s.id)), 'nav links follow the registry order');
  assert((await count('#site-nav .nav-part')) === 5, 'five parts in the nav');
  assert((await count('#site-nav a[aria-current="page"]')) === 0, 'no current nav item on an unknown route');

  assert((await page.isVisible('#site-nav')) === !phone, 'nav is a sidebar on desktop and a closed drawer on phone');
  assert((await page.isVisible('#nav-toggle')) === phone, 'nav toggle only on phone');
  assert((await page.isVisible('#theme-toggle')) === true, 'theme toggle visible');
  await noOverflow('at load');

  // keyboard order: skip link, title, theme toggle, then the nav toggle (phone) or the first nav link (desktop)
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === 'skip-link', 'first Tab stops on the skip link');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === 'site-title', 'then the title link');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === 'theme-toggle', 'then the theme toggle');
  await page.keyboard.press('Tab');
  assert((await page.evaluate(() => document.activeElement.id)) === (phone ? 'nav-toggle' : 'nav-home'), 'then the nav toggle (phone) or nav link (desktop)');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert(ring !== 'none', 'focused control shows an outline');

  // skip link: moves focus to #view and leaves the hash alone
  await page.focus('#skip-link');
  await page.keyboard.press('Enter');
  assert((await page.evaluate(() => document.activeElement.id)) === 'view', 'skip link focuses #view');
  assert((await page.evaluate(() => location.hash)) === '#nosuchplace', 'skip link must not change the hash');

  // phone drawer: open, fits the screen, Escape closes and returns focus to the toggle
  if (phone) {
    await openNav();
    assert(await page.isVisible('#site-nav'), 'drawer visible when open');
    // the page behind the drawer cannot scroll and cannot take a Tab stop
    const behind = () => page.evaluate(() => ({
      view: document.querySelector('#view').inert, footer: document.querySelector('#site-footer').inert, overflow: getComputedStyle(document.body).overflow,
    }));
    const locked = await behind();
    assert(locked.view && locked.footer && locked.overflow === 'hidden', `page behind the open drawer: ${JSON.stringify(locked)}`);
    await (await page.$$('#site-nav a.nav-link')).at(-1).focus();
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => !document.querySelector('#view').contains(document.activeElement) && !document.querySelector('#site-footer').contains(document.activeElement)), 'Tab after the last nav link must not enter the page hidden behind the drawer');
    const box = await page.locator('#site-nav').boundingBox();
    assert(box.x >= 0 && box.x + box.width <= viewport.width + 0.5, 'drawer fits the viewport width');
    await noOverflow('with the drawer open');
    await shot('nav-open');
    await page.focus('#site-nav a.nav-link');
    await page.keyboard.press('Escape');
    assert((await attr('#nav-toggle', 'aria-expanded')) === 'false' && !(await page.isVisible('#site-nav')), 'Escape closes the drawer');
    const freed = await behind();
    assert(!freed.view && !freed.footer && freed.overflow !== 'hidden', `page after the drawer closes: ${JSON.stringify(freed)}`);
    assert((await page.evaluate(() => document.activeElement.id)) === 'nav-toggle', 'focus returns to the toggle');
    await openNav();
    await page.locator('.brand').dispatchEvent('pointerdown');
    assert((await attr('#nav-toggle', 'aria-expanded')) === 'false', 'a press outside the drawer closes it');
  }

  // colour key
  await page.click('#colour-key summary');
  assert(await page.evaluate(() => document.querySelector('#colour-key').open), 'colour key opens');
  assert((await count('#colour-key .colour-key-list li')) === 9, 'nine colour key entries');
  await noOverflow('with the colour key open');
  await shot('colour-key');
  await page.click('#colour-key summary');

  // ---------------------------------------------------------------- 2. A3: a place that may be missing
  await openNav();
  await page.click('#nav-distance');
  await page.waitForFunction(() => { const v = document.querySelector('#view'); return v.dataset.route === 'distance' && v.dataset.state !== 'loading'; }, null, { timeout: 8000 });
  const errPanels = await count('[data-station-error]');
  const kids = await page.evaluate(() => { const s = document.querySelector('#station-distance'); return s ? s.children.length : -1; });
  assert(errPanels === 1 || kids > 0, '#distance shows the under-construction panel or the station itself');
  assert((await attr('#nav-distance', 'aria-current')) === 'page', 'nav marks the current place');
  assert((await page.title()) === 'Length, Distance, Circles' + SUFFIX, 'title follows the place');
  assert((await page.evaluate(() => document.activeElement.id)) === 'view', 'focus moves to #view after a navigation');
  if (errPanels === 1) {
    assert(routerErrors(/^\[mv\] station "distance" failed to load/) === 1, 'the failed import was reported once with console.error');
    assert((await text('.under-construction')).includes('This station is under construction.'), 'copy');
    assert((await attr('#under-construction-home', 'href')) === '#home', 'link home');
    assert((await attr('.under-construction', 'data-station-error')) === 'distance', 'error attribute names the station');
    assert((await page.evaluate(() => document.querySelector('#station-distance') !== null)), 'section still exists');
    await noOverflow('on the under-construction panel');
    await shot('under-construction');
    log('A3 literal: #distance gave the under-construction panel');
  } else {
    log('A3 literal: #distance mounted a real station (it exists now); see section 3 for the error path');
  }
  // Choosing the place that is already showing fires no hashchange, but must still close the drawer.
  await openNav();
  await page.click('#nav-distance');
  assert((await page.evaluate(() => document.body.dataset.navOpen)) !== 'true' && (await attr('#nav-toggle', 'aria-expanded')) === 'false', 'tapping the current place in the open drawer closes it');
  assert(!phone || !(await page.isVisible('#site-nav')), 'the drawer is gone from the screen');
  assert((await page.evaluate(() => location.hash)) === '#distance', 'the hash is unchanged');
  assert((await page.evaluate(() => document.activeElement.id)) === 'view', 'focus goes to the page, not to the hidden link');
  assert((await attr('#view', 'data-state')) !== 'loading', 'tapping the current place does not remount it');
  await go('nosuchplace');
  assert((await count('[data-station-error]')) === 0, 'no error panel after going back');
  assert((await count('#no-such-place')) === 1, 'No-such-place panel is back');
  assert((await attr('#view', 'data-state')) === 'nosuchplace', 'state');
  assert((await count('#site-nav a[aria-current="page"]')) === 0, 'nav current mark cleared');

  // ---------------------------------------------------------------- 3. router paths with injected stations (data: modules, no network)
  const SRC = {
    ok: "export function mount(el, ctx) { window.__zzCtx = ctx; window.__zzMounts = (window.__zzMounts || 0) + 1; el.textContent = 'zz-ok'; return function () { window.__zzUnmounts = (window.__zzUnmounts || 0) + 1; }; }",
    throws: "throw new Error('boom-import');",
    mountThrows: "export function mount() { throw new Error('boom-mount'); }",
    noMount: 'export const x = 1;',
    slow: "await new Promise((r) => setTimeout(r, 1200)); export function mount(el) { window.__zzSlow = (window.__zzSlow || 0) + 1; el.textContent = 'zz-slow'; }",
    // fails only when the page opens window.__zzOpen(), so a test decides exactly when
    late: "await window.__zzGate; throw new Error('boom-late');",
    slow2: "await new Promise((r) => setTimeout(r, 1300)); export function mount(el) { el.textContent = 'zz-slow2'; }",
  };
  await page.evaluate(async (src) => {
    const { STATIONS } = await import('./js/registry.js');
    const make = (id, title, code, extra) => ({ id, title, chapter: 9, part: 'V', order: 90, module: 'data:text/javascript,' + encodeURIComponent(code), problems: [], topics: [], threads: [], summary: 'test', ...extra });
    STATIONS.push(
      make('zz-ok', 'ZZ OK', src.ok, { problems: ['ZZ.1'], topics: ['ZZ.T1'] }),
      make('zz-throw', 'ZZ throw', src.throws),
      make('zz-mount', 'ZZ mount', src.mountThrows),
      make('zz-nomount', 'ZZ nomount', src.noMount),
      make('zz-slow', 'ZZ slow', src.slow),
      make('zz-late', 'ZZ late', src.late),
      make('zz-slow2', 'ZZ slow two', src.slow2),
    );
  }, SRC);
  const zz = (name) => page.evaluate((n) => window[n] || 0, name);

  // 3a. a good station: ctx shape, presets from problem, topic and token routes
  await go('problem-ZZ-1');
  assert((await attr('#view', 'data-state')) === 'ready', 'zz-ok ready');
  assert((await text('#station-zz-ok')) === 'zz-ok', 'zz-ok mounted into its section');
  assert((await page.title()) === 'ZZ OK' + SUFFIX, 'title for a mounted station');
  const shape = await page.evaluate(() => {
    const c = window.__zzCtx;
    return {
      keys: Object.keys(c).sort(), themeKeys: Object.keys(c.theme).sort(), frozen: Object.isFrozen(c),
      route: c.route, station: c.station.id, preset: c.preset, threads: c.threads.map((t) => t.id), hasStore: typeof c.store.get === 'function',
      sameRegistry: null,
    };
  });
  assert(JSON.stringify(shape.keys) === JSON.stringify(['navigate', 'preset', 'route', 'station', 'stations', 'store', 'theme', 'threads']), `ctx keys: ${shape.keys}`);
  assert(JSON.stringify(shape.themeKeys) === JSON.stringify(['cssVar', 'getTheme', 'onThemeChange', 'prefersReducedMotion', 'setTheme']), `ctx.theme keys: ${shape.themeKeys}`);
  assert(shape.frozen && shape.route === 'problem-ZZ-1' && shape.station === 'zz-ok' && shape.hasStore, 'ctx values');
  assert(JSON.stringify(shape.preset) === JSON.stringify({ kind: 'problem', id: 'ZZ.1' }), 'problem preset');
  assert(JSON.stringify(shape.threads) === '["T1","T2","T3"]', 'threads');
  assert(await page.evaluate(async () => (await import('./js/registry.js')).STATIONS === window.__zzCtx.stations), 'ctx.stations is the registry array');
  assert((await zz('__zzUnmounts')) === 0, 'not unmounted yet');

  await go('topic-ZZ-T1');
  assert(JSON.stringify(await page.evaluate(() => window.__zzCtx.preset)) === JSON.stringify({ kind: 'topic', id: 'ZZ.T1' }), 'topic preset');
  assert((await zz('__zzUnmounts')) === 1, 'the previous mount was unmounted exactly once');
  await go('zz-ok-hello');
  assert(JSON.stringify(await page.evaluate(() => window.__zzCtx.preset)) === JSON.stringify({ kind: 'token', token: 'hello' }), 'token preset');
  assert((await zz('__zzUnmounts')) === 2 && (await zz('__zzMounts')) === 3, 'mount and unmount counts');

  // 3b. ctx.navigate and the shared store
  await page.evaluate(() => window.__zzCtx.store.set('zz.k', { a: [1, 2] }, { persist: false }));
  await page.evaluate(() => window.__zzCtx.navigate('nosuchplace'));
  await page.waitForFunction(() => document.querySelector('#view').dataset.state === 'nosuchplace');
  assert((await zz('__zzUnmounts')) === 3, 'navigate away unmounts');
  await go('zz-ok');
  assert(JSON.stringify(await page.evaluate(() => window.__zzCtx.store.get('zz.k'))) === '{"a":[1,2]}', 'one store is shared across stations');
  const before = await zz('__zzMounts');
  await page.evaluate(() => window.__zzCtx.navigate('zz-ok'));
  await page.waitForFunction((n) => window.__zzMounts === n + 1, before);
  assert((await zz('__zzMounts')) === before + 1, 'navigate to the current hash remounts');

  // 3c. failures: import throws, mount throws, no mount export, and a retry
  await go('zz-throw');
  assert((await attr('#view', 'data-state')) === 'error', 'import failure -> error state');
  assert((await count('[data-station-error="zz-throw"]')) === 1 && (await count('[data-station-error]')) === 1, 'one error panel');
  assert((await text('.under-construction')).includes('ZZ throw') && (await text('.under-construction')).includes('under construction'), 'panel names the place');
  assert((await text('#under-construction-detail')).includes('boom-import'), 'detail has the message');
  assert((await attr('.under-construction', 'role')) === null, 'the panel has no live-region role: #route-status already announces it');
  assert((await text('#under-construction-retry')) === 'Reload the page', 'the button says what it does');
  await go('zz-mount');
  assert((await text('#under-construction-detail')).includes('boom-mount'), 'mount failure detail');
  assert((await count('#station-zz-mount')) === 1, 'section kept around the panel');
  await go('zz-nomount');
  assert((await text('#under-construction-detail')).includes('has no mount() export'), 'missing export detail');
  assert(routerErrors(/^\[mv\] station "zz-throw" failed to load: boom-import/) === 1, 'zz-throw reported once');
  assert(routerErrors(/^\[mv\] station "zz-mount" failed to load: boom-mount/) === 1, 'zz-mount reported once');
  assert(routerErrors(/^\[mv\] station "zz-nomount" failed to load: station module .* has no mount\(\) export/) === 1, 'zz-nomount reported once');
  await noOverflow('on the under-construction panel');
  await go('zz-ok');
  assert((await attr('#view', 'data-state')) === 'ready' && (await count('[data-station-error]')) === 0, 'a failure does not poison later routes');

  // 3d. loading placeholder, and a navigation that is superseded while a module loads
  await page.evaluate(() => { location.hash = '#zz-slow'; });
  await page.waitForSelector('#station-zz-slow .loading', { timeout: 4000 });
  assert((await text('#station-zz-slow .loading')).includes('Loading...'), 'loading placeholder after 150 ms');
  assert((await attr('#view', 'data-state')) === 'loading', 'state while loading');
  await page.evaluate(() => { location.hash = '#nosuchplace'; });
  await page.waitForTimeout(1500);
  assert((await zz('__zzSlow')) === 0, 'a superseded navigation never mounts');
  assert((await attr('#view', 'data-state')) === 'nosuchplace' && (await count('#station-zz-slow')) === 0, 'the newer route won');
  await go('zz-slow');
  assert((await zz('__zzSlow')) === 1 && (await attr('#view', 'data-state')) === 'ready', 'the cached module mounts on a later visit');

  // 3e. a navigation that FAILS after a newer one has started must not cancel the newer one's loading timer
  await page.evaluate(() => { window.__zzGate = new Promise((r) => { window.__zzOpen = r; }); location.hash = '#zz-late'; });
  await page.waitForFunction(() => document.querySelector('#view').dataset.route === 'zz-late');
  await page.evaluate(() => { location.hash = '#zz-slow2'; });
  await page.waitForFunction(() => document.querySelector('#view').dataset.route === 'zz-slow2');
  await page.evaluate(() => window.__zzOpen());   // zz-late now fails, while zz-slow2 is still importing
  await page.waitForSelector('#station-zz-slow2 .loading', { timeout: 1000 });
  assert((await attr('#view', 'data-state')) === 'loading', 'zz-slow2 is still loading, with its placeholder');
  await go('zz-slow2');
  assert((await text('#station-zz-slow2')) === 'zz-slow2' && (await count('[data-station-error]')) === 0, 'zz-slow2 mounted; the stale failure left no panel');
  assert(routerErrors(/zz-late/) === 0, 'a superseded navigation that fails is not reported');

  // 3f. the button on the under-construction panel reloads the page. A failed module (or one of its
  // imports) stays failed in the browser's module map, so only a fresh page can recover. Here the
  // distance station's file fails once, then loads. The reload also drops every injected zz- station.
  await page.reload();
  await page.waitForSelector('#view[data-state]');
  let flaky = true;
  const STUB = "export function mount(el) { el.textContent = 'distance-stub'; }";
  const flakyRoute = (route) => (flaky ? route.fulfill({ status: 404, body: 'gone' }) : route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.route('**/js/stations/distance.js', flakyRoute);
  await go('distance');
  assert((await attr('#view', 'data-state')) === 'error' && (await count('[data-station-error="distance"]')) === 1, 'the failed fetch gives the panel');
  flaky = false;
  await Promise.all([page.waitForEvent('load'), page.click('#under-construction-retry')]);
  await page.waitForFunction(() => { const v = document.querySelector('#view'); return v.dataset.state === 'ready'; }, null, { timeout: 8000 });
  assert((await page.evaluate(() => location.hash)) === '#distance', 'the reload keeps the place');
  assert((await text('#station-distance')) === 'distance-stub' && (await count('[data-station-error]')) === 0, 'after the reload the station mounts');
  await page.unroute('**/js/stations/distance.js', flakyRoute);
  await go('nosuchplace');
  assert((await count('[data-station-error]')) === 0, 'clean state after the fault tests');
  assert((await page.evaluate(async () => (await import('./js/registry.js')).STATIONS.some((s) => s.id.startsWith('zz-')))) === false, 'the injected stations are gone');
  log(`router errors provoked on purpose: ${errors.filter((e) => e.startsWith('[mv] station')).length}`);

  // ---------------------------------------------------------------- 4. A4: the theme toggle
  const effective = () => page.evaluate(() => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const stored = () => page.evaluate(() => { try { return localStorage.getItem('mv:theme'); } catch { return 'unavailable'; } });
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  const arm = () => page.evaluate(() => { window.__themeEvents = 0; document.addEventListener('themechange', () => { window.__themeEvents++; }); });

  const start = await effective();
  const flipped = start === 'dark' ? 'light' : 'dark';
  const bgStart = await bodyBg();
  assert((await attr('#theme-toggle', 'aria-pressed')) === String(start === 'dark'), 'aria-pressed starts in step with the theme');
  await arm();
  await page.click('#theme-toggle');
  let now = await page.evaluate(() => ({ attr: document.documentElement.dataset.theme, events: window.__themeEvents }));
  assert(now.attr === flipped, `data-theme should be ${flipped}, got ${now.attr}`);
  assert(now.events === 1, `themechange fired ${now.events} times`);
  const s1 = await stored();
  assert(s1 === flipped || s1 === 'unavailable', `stored theme ${s1}`);
  assert((await bodyBg()) !== bgStart, 'the page background actually changed');
  assert((await attr('#theme-toggle', 'aria-pressed')) === String(flipped === 'dark'), 'aria-pressed follows');
  assert((await attr('meta[name="theme-color"]', 'content')) === (await bg()), 'browser chrome colour follows --bg');
  await shot('theme-flipped');

  await page.reload();
  await page.waitForSelector('#view[data-state]');
  assert((await page.evaluate(() => document.documentElement.dataset.theme)) === (s1 === 'unavailable' ? undefined : flipped), 'the choice survives a reload (set before first paint)');
  await arm();
  await page.click('#theme-toggle');
  now = await page.evaluate(() => ({ attr: document.documentElement.dataset.theme, events: window.__themeEvents }));
  assert(now.attr === start && now.events === 1, `second click flips back: ${now.attr}, ${now.events} event(s)`);
  assert((await bodyBg()) === bgStart, 'background is back');
  const s2 = await stored();
  assert(s2 === start || s2 === 'unavailable', `stored theme ${s2}`);

  await page.evaluate(async () => { (await import('./js/core/theme.js')).setTheme('auto'); });
  assert((await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))) === false, "'auto' removes data-theme");
  assert((await stored()) === null || (await stored()) === 'unavailable', "'auto' clears the stored choice");
  assert((await effective()) === start, 'effective theme is the OS preference again');
  await noOverflow('at the end');
  log(`viewport ${viewport.width}: shell checks passed`);
}
```
