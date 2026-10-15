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
  - `npm test` — runs `node --test tests/unit/` (pure-module unit tests).
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
