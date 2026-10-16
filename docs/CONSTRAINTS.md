# Engineering & Design Contract

Every designer, builder and reviewer follows this file. If a design contradicts it, this file wins.

## Stack

- **Static site, no build step.** Plain HTML + CSS + native ES modules (`<script type="module">`).
  Entry point is `index.html` at the repo root. It must work when served by any static file server
  (`npx http-server`, GitHub Pages) **and** when published as a claude.ai Artifact.
- **No network at runtime.** Never load anything from a CDN or any other host. Libraries are
  vendored under `vendor/`:
  - `vendor/three/three.module.min.js` (three.js r160) and `vendor/three/OrbitControls.js`
    (already patched to import `./three.module.min.js`).
  - `vendor/katex/katex.min.js` (UMD, defines `window.katex`; load with a classic `<script>`
    tag in `index.html` **before** the module scripts) and `vendor/katex/katex.min.css` (fonts
    inlined as data URIs). `vendor/katex/auto-render.min.js` is available too.
  - Google Fonts `<link>` is the only allowed external resource and every font needs a local
    fallback stack (tests run with Google Fonts unreachable, so fallbacks must look fine).
- **Relative imports only** (`./`, `../`). No bare specifiers, no import maps, no absolute `/` paths.
- **Routing**: hash routes using bare tokens only: `#home`, `#roots`, `#lab`, `#problem-1-4-2`.
  Allowed characters in a route: letters, digits, `.`, `_`, `~`, `-`. Never `#a=b`, never a query string.
  Per-view state (selected function, drawn shapes) lives in memory (and optionally localStorage).
- **No `alert`, `confirm`, `prompt`, `window.print`, `window.open`, downloads, iframes.**
- **localStorage**: every read/write wrapped in try/catch; the page must work with it throwing.
- **Performance**: interactive canvases must stay responsive (target 60fps on drag for 2D,
  ≥30fps for 3D/domain-coloring at default resolution). Domain coloring renders at reduced
  resolution while dragging and refines when idle. Use `requestAnimationFrame`, never busy loops.
  Honour `prefers-reduced-motion` (animations jump to their end state or play slowly on request).
- **Phone width (~400px)** must work: no horizontal page scroll, planes resize, controls wrap.
  Touch input (pointer events) works for drawing and dragging.

## Code layout (owned by the goal that creates each file)

```
index.html                  app shell: header, nav, <main id="view">, theme toggle
css/theme.css               design tokens (light + dark) and base styles
css/components.css          shared component styles (panels, sliders, chips, explainers)
js/app.js                   router: reads location.hash, mounts the station, handles unknown routes
js/registry.js              STATIONS manifest (pure data, importable from Node; see below)
js/core/complex.js          complex arithmetic (pure, Node-testable)
js/core/parse.js            expression parser f(z) → evaluator (pure, Node-testable)
js/core/plane.js            interactive complex-plane canvas widget
js/core/...                 other shared engines (mapping, domain coloring, 3D, katex helpers)
js/stations/<id>.js         one module per station; exports mount(el, ctx) → unmount()
tests/unit/*.test.mjs       node:test unit tests (pure modules only)
tools/smoke.mjs             Playwright smoke runner (do not edit unless your goal owns it)
docs/                       assignment, story, architecture, goals, designs, reviews
```

### Station contract

```js
// js/registry.js — pure data, no DOM, no side effects, importable by Node.
export const STATIONS = [
  { id: 'home', title: '…', chapter: 0, module: './stations/home.js', problems: [], summary: '…' },
  // id is also the hash route; module path is relative to js/
];

// js/stations/<id>.js
export function mount(el, ctx) {  // el: an empty <section>, ctx: { navigate(id), stations, store }
  // build DOM inside el only; attach listeners; start rAF loops
  return function unmount() { /* stop loops, remove window listeners, dispose GL */ };
}
```

The router must survive a station module that is missing or throws: show a friendly
"this station is under construction" panel instead of a blank page, and log the error.

## Design language (shared by every station)

- **Two-address colour code — use it everywhere, it is the teaching device.**
  - `--cart` : everything Cartesian (x, y, Re, Im, grid lines, the "slide" of addition).
  - `--polar`: everything polar (r, θ, arg, modulus, circles/rays, the "spin-and-stretch").
  - `--input` / `--output`: z-plane vs w-plane strokes in the mapping views.
  - Hue on a colour wheel encodes **argument** wherever a function is domain-coloured.
  When a formula is shown, its Cartesian pieces are tinted `--cart` and polar pieces `--polar`
  (KaTeX `\textcolor` with the computed CSS values, or wrapping spans).
- **arg vs Arg**: whenever an angle is shown, show which one it is. `arg z` is drawn as a set
  (ghost copies θ + 2πk, a spiral/staircase, or a list "…, θ−2π, θ, θ+2π, …"); `Arg z` is the
  single highlighted representative in (−π, π]. The point itself is drawn once.
- Every computation has a **numeric explainer**: the same quantity worked in Cartesian and in
  polar side by side, with live numbers that update as the user drags.
- Typography and palette come from `css/theme.css` tokens only. No literal colours in station
  code except inside canvas drawing, where colours are read from the CSS custom properties at
  draw time (`getComputedStyle(document.documentElement).getPropertyValue('--cart')`), so both
  themes work. Re-read them when the theme changes.
- Theme: light and dark via tokens on `:root`, `@media (prefers-color-scheme: dark)` guarded by
  `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`. `body` sets an explicit
  background token. Theme toggle sets `data-theme` on `<html>`.
- Plain, direct copy. Speak to a student the night before a test. No emoji. Visible focus
  states on every control; every control has a stable `id` and a label.

## Process rules

- **File ownership.** A goal may create or edit only the files listed in its `owns` list. It may
  read anything. If you believe a file you do not own needs a change, do not edit it: record it
  in your result under `requests_for_other_owners` so the orchestrator can schedule it.
- **Verification commands** (run from repo root):
  - `npm test` — runs `node --test "tests/unit/*.test.mjs"` (pure-module unit tests; Node 22 needs the glob, a bare directory does not work).
  - `node tools/smoke.mjs` — loads every route in `js/registry.js` in headless Chromium at
    desktop and phone width, reports console errors, page errors, failed requests, horizontal
    overflow, and saves screenshots to `docs/review/shots/`. Use `--route <id>` to check one
    route, `--out <dir>` to choose the screenshot folder, `--wait <ms>` to wait longer.
    Exit code is non-zero on any error. Read the screenshots with your image-reading tool.
  - `node tools/smoke.mjs --route <id> --script <file.mjs>` runs a custom interaction script
    (exports `default async function(page, ctx)`) after the route loads — use it to drag,
    draw strokes, click buttons and assert on the DOM in acceptance checks.
- **Math correctness is non-negotiable.** Every numeric answer to a review problem shown in the
  UI must match a hand-checked value. Put the expected values in a unit test.
- Do not commit; the orchestrator commits after each iteration.

## Media track: manim videos, narration, music

Videos and narration are an optional layer on top of the site. A station must work fully
without them (in particular before audio has been generated).

- **Video = scene + narration.** `videos/scenes/<id>.py` defines `class Main(NarratedScene)`
  (from `videos/lib/narrated.py`, import as `from lib.narrated import NarratedScene`) with
  `narration_id = "<id>"`, paired with `media/narration/videos/<id>.json`:
  `{ "id", "title", "summary", "station": "<station id it belongs to>", "music": { "prompt", "seconds" },
  "segments": [ { "id", "text" } ] }`. In `construct()`, wrap each part in
  `with self.beat("<segment id>") as t:` and size `run_time`s as fractions of `t`. Use the palette in
  `videos/lib/palette.py` (mirrors the site's dark theme tokens: Cartesian vs polar colours).
  LaTeX is available (`MathTex`).
- **Render:** `npm run videos` (or `node tools/videos/render.mjs --only <id> --quality l` for a
  quick check). Output: `media/video/<id>.mp4` + `media/video/<id>.vtt` captions, and the generated
  `media/manifest.js` (`export const VIDEOS = [...]; export const SITE_AUDIO = {...}`). Never
  edit `media/manifest.js` by hand. Default quality is 720p; keep each video under ~3 minutes and
  under 15 MB.
- **Narration text is the script.** Write it for the ear: short sentences, one idea per segment,
  say the two addresses out loud ("in Cartesian it sits at 3, minus 2 i; in polar it is 3.6 at
  minus 33.7 degrees"). Captions come from the same text, so a silent render is still useful.
- **Station narration (optional):** `media/narration/site/<station-id>.json` with segments the
  station can play with a Listen control once `media/audio/site/<station-id>/<segment>.mp3`
  exists (listed in `SITE_AUDIO`). Stations must hide the control when the clips are absent.
- **Audio is generated on the student's machine**, not in the build loop:
  `doppler run --project agi --config <config> -- npm run media` (see README). The build loop
  only writes narration text and renders silent, captioned videos.
- Stations embed videos with `<video controls preload="metadata" playsinline>` plus
  `<track kind="captions" default>` using the paths from `media/manifest.js`.

## Design taste (the taste skill)

The student asked for the vendored taste skill (`.claude/skills/taste-skill/`, upstream
github.com/Leonxlnx/taste-skill, MIT) to be used in every build and review. It is written for
marketing sites, so this section says how it applies to an interactive study tool.

**Read before designing or reviewing any visible change:** `.claude/skills/taste-skill/SKILL.md`
(the house rules and the laws of the craft), and as needed `references/tells.md` (the registry of
generated-page tells), `references/critique.md` (how to look and score), `references/type.md`,
`references/colour.md`, `references/layout.md` and `references/copy.md`.

**Run the checks** on what you changed (from the repo root):
- `bash tools/taste.sh lint <changed .css/.js/.html files>`
- `bash tools/taste.sh inspect <route>` for each route you changed (screenshots in
  `.taste-skill/inspect/<route>/`; look at them). The wrapper already allows the three exempt rules below.

**What applies in full** (page chrome, station layout, the Walk, the Rehearsal Room, cards, copy):
no eyebrows or pill badges above headings; no tiny uppercase letter-spaced labels; no shadows on
things at rest (a tone step separates surfaces; shadows only on menus, dialogs, the sticky Walk bar);
no hairline dividers or 1px outlined boxes in page chrome; no gradients in page chrome; no glass or
backdrop blur; no styled accent word in a heading; no emoji; at most two typefaces plus KaTeX's math
face; about five type sizes; running text in the full ink at 7:1 or better (grey only for secondary
notes); paragraphs 45–75 characters wide; one dominant thing on each station's first screen (its
picture or a large heading, not a row of controls); headlines two lines or fewer at every width; no
yellow-cream ground, no terracotta-on-cream, no violet/indigo assistant palette; copy per
`references/copy.md` (no stock phrases).

**Exempt, because here the pictures are the mathematics:**
1. **Mathematical surfaces** keep their grids, axes, ticks, dashed seams, gradients and outlines:
   the plane canvases, the 3D views, domain colouring, the staircase widget, the explainer tables and
   KaTeX output. Put `data-ui` on the root element of each such surface so the inspector leaves it
   alone (the skill's own convention for real interface fragments).
2. **The photograph and footage floors and the decorative motion floor** (`few-pictures`,
   `no-footage`, `still-page`) do not apply. Motion on this site is meaning (morphs, walks, the clock
   of a stroke), never decorative entrances; honour `prefers-reduced-motion`.
3. **Monospace** is allowed only for the typeable plain-text answer lines (they are input syntax).
   Readouts use the text face with tabular figures.
4. **Numbers on the story map and the Walk** encode a real sequence: mark them up as an ordered list.

**Severity in reviews.** Iteration 2 (in flight when this was adopted): taste findings are minor
unless they hurt reading or hide the story; the integrator fixes them. From iteration 3: an
inspector FAIL outside the exemptions, or a lint FAIL in a changed file, is a major issue.
