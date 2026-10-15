# Architecture

Status: iteration 1 (written by the Goal Planner before any code exists). Designers and builders
rely on the signatures below. If a module already exists on disk, its actual exports win and the
difference must be recorded in the design; otherwise build exactly to this file. Engineering rules
(stack, routing, theming, ownership) are in `docs/CONSTRAINTS.md`; the story is `docs/STORY.md`.

## 1. Module map

```
index.html                      shell: <header> (title link, nav, theme toggle), <main id="view">, KaTeX classic <script>
css/theme.css                   tokens (light + dark), base typography, body background
css/components.css              generic layout classes (.panel, .chips, .chip, .btn, .slider-row, .two-planes, .station-header, ...)
js/app.js                       hash router; mounts stations; error panel; builds the nav from registry
js/registry.js                  STATIONS, THREADS, stationForProblem(), stationForTopic(), stationById()   [pure data]
js/core/theme.js                cssVar(), getTheme(), setTheme(), onThemeChange(), prefersReducedMotion()
js/core/store.js                createStore(): memory + localStorage mirror (try/catch), subscribe
js/core/complex.js              complex arithmetic, both addresses, Arg/arg, roots, branches, formatting, numeric calculus   [pure]
js/core/parse.js                parse(), compile(), toTex() for f(z) expressions   [pure; imports ./complex.js only]
js/data/problems.js             PROBLEMS, TOPICS, problemById(), problemsForStation(), routeFor(), idFromRoute()   [pure data]
js/data/functions.js            FUNCTIONS catalogue of the test's functions as source strings + TeX   [pure data]
js/core/plane.js                createPlane(): complex-plane canvas, grids, handles, layers, curves, draw helpers
js/core/katex.js                tex(), texToHtml(), tint(), cart(), polar()
js/core/explainer.js            createExplainer(): the two-column live numeric explainer
js/core/staircase.js            createStaircase(): the arg/Arg list widget; argSteps(), homeStep()   [list is DOM, helpers pure]
js/core/shapes.js               shape primitives -> timed curves; classify(); pointAt(); reverse()   [pure]
js/core/mapping.js              pushForward() with adaptive subdivision and pole breaking; morph()   [pure]
js/core/domaincolor.js          hueOf(), lightnessOf(), colorOf(), createDomainColoring(), drawColorWheel()
js/core/three-view.js           createView3D(), modulusLandscape(), reImSurface(), graph4D(), riemannSurfaceRoot(),
                                argHelix(), riemannSphere(); pure: stereographic(), inverseStereographic(), rotate4()
js/stations/<id>.js             one module per station: export function mount(el, ctx) -> unmount
tests/unit/*.test.mjs           node:test (pure modules only)
tests/interact/_helpers.mjs     dragHandle(), planePixel(), clickChip(), readText() for interaction scripts
tests/interact/<goal-id>.mjs    interaction scripts run by tools/smoke.mjs --script
```

### Import rules

- Relative imports only. Stations import from `../core/...`, `../data/...`, `../registry.js`.
  Core modules import `../../vendor/...` where needed (three.js in `three-view.js` only).
- **Wave 0 modules do not import each other**, with one exception: `parse.js` imports
  `complex.js` (same goal). Every other engine works on plain `{re, im}` objects and does its own
  `Math.hypot` / `Math.atan2` inline, so each one can be built and tested on its own while the
  others are still being written. Stations (wave 1) are where the engines are composed.
- Core widgets that need CSS (`plane.js`, `explainer.js`, `staircase.js`, `domaincolor.js`,
  `three-view.js`) inject their own `<style data-for="<module>">` once per page from a template
  literal that uses only theme tokens (`var(--cart)` etc.). `components.css` holds only generic
  classes. This keeps `css/components.css` owned by the shell goal alone.
- KaTeX is global: `index.html` loads `vendor/katex/katex.min.js` with a classic `<script>` before
  the module scripts; `katex.js` uses `window.katex` and degrades to plain text if it is missing.

## 2. The complex-number representation

A complex number is a plain object `{ re: number, im: number }`. Nothing else, everywhere
(engines, stations, store, presets, tests). Functions never mutate their inputs. A "timed point"
is `{ re, im, t }` with `t` in `[0, 1]`. Angles are radians. `Arg` is in `(-π, π]`:
`Arg(negative real) = +π`, `Arg(0) = 0`. "A polar address" is `{ r, theta }` with `theta = Arg`.
Formatting uses ASCII `-` as the minus sign in plain-text readouts (tests match on it); TeX
strings may use whatever KaTeX needs.

## 3. Shared module signatures

### 3.1 `js/core/complex.js` (pure)

```js
export const C = (re, im = 0) => ({ re, im });
export const ZERO, ONE, I;                                  // frozen constants
export function fromPolar(r, theta) → {re, im}
export function toPolar(z) → { r, theta }                    // theta = Arg(z)
export function add(a, b), sub(a, b), mul(a, b), div(a, b)   // div by 0 → {re: NaN, im: NaN}
export function neg(a), conj(a), inv(a), scale(a, k)
export function abs(a), abs2(a)
export function Arg(a) → number in (-π, π]                   // atan2(im, re); Arg({re:-1,im:0}) = π; Arg(0) = 0
export function wrapArg(theta) → number in (-π, π]
export function argSet(z, { kMin = -2, kMax = 2 } = {}) → [{ k, theta }]   // theta = Arg(z) + 2πk, ascending k
export function expi(theta) → {re: cos θ, im: sin θ}
export function exp(a), log(a) /* principal: ln|a| + i Arg a */, sqrt(a) /* principal */, sin(a), cos(a)
export function pow(a, n) → {re, im}           // integer n (any sign) by de Moivre: r^n e^{inθ}; pow(0, 0) = 1
export function powc(a, w) → {re, im}          // principal complex power exp(w · log a); powc(0, w) = 0 for Re w > 0
export function rootsOf(c, n) → [{re, im}]     // k = 0..n-1: |c|^{1/n} e^{i(Arg c + 2πk)/n}; rootsOf(0, n) = n zeros
export function rootsOfUnity(n) → [{re, im}]   // rootsOf(ONE, n)
export function principalRoot(c, n) → {re, im} // rootsOf(c, n)[0]
export function branchRoot(c, n, seam) → {re, im} // uses the unique theta in (seam, seam + 2π] with c = |c| e^{iθ}; principal branch is seam = -π
export function branchArg(z, seam) → theta in (seam, seam + 2π]
export function isPrimitiveRoot(k, n) → boolean  // gcd(k, n) === 1 (the k-th n-th root of unity is primitive)
export function quadraticRoots(a, b, c) → [{re, im}, {re, im}]   // a, b, c complex or numbers; (-b ± sqrt(b² - 4ac)) / 2a
export function eq(a, b, eps = 1e-9) → boolean
export function isFiniteC(a) → boolean

// numeric calculus (central differences; used by limits, derivative, cauchy-riemann)
export function numericPartials(f, z0, h = 1e-5) → { fx: {re, im}, fy: {re, im} }
export function jacobian(f, z0, h = 1e-5) → { ux, uy, vx, vy }                 // u = Re f, v = Im f
export function localLinear(f, z0, h = 1e-5) → { A: {re, im}, B: {re, im} }   // A = ½(fx − i fy), B = ½(fx + i fy)
export function directionalQuotients(f, z0, rho = 1e-3, m = 72) → [{ phi, q: {re, im} }]
                                              // q = (f(z0 + ρe^{iφ}) − f(z0)) / (ρe^{iφ}), phi = 2πj/m
// formatting
export function fmtNum(x, digits = 3) → string            // trims trailing zeros; "-0" → "0"; ASCII minus
export function fmtCart(z, digits = 3) → string           // "3 - 2i", "i", "-i", "2 + 0.5i", "0", "-11/17..." is NOT attempted (decimal)
export function fmtPolar(z, digits = 3) → string          // "2 e^(i 2.094)"  (r then angle in radians)
export function fmtAngle(theta, { digits = 3, pi = true }) → string   // "2pi/3" when theta is p·π/q with q ≤ 12 (|p| ≤ 24) within 1e-9, else decimal
export function texNumber(x, digits = 3) → string         // exact forms first: integer; \frac{p}{q} (q ≤ 24); p\sqrt{2}/q, p\sqrt{3}/q (q ≤ 4); p\pi/q (q ≤ 12); else decimal
export function texCart(z, digits = 3) → string           // "3 - 2i", "\sqrt{2} + \sqrt{2}\,i", "-\frac{11}{17} - \frac{10}{17}i"
export function texPolar(z, digits = 3) → string          // "2\,e^{i\frac{2\pi}{3}}"
export function texAngle(theta, digits = 3) → string      // "\frac{2\pi}{3}", "-\frac{\pi}{3}", "1.234"
```

Facts the unit tests pin (from `docs/STORY.md` section 8): `mul(3−2i, −1+4i) = 5+14i`;
`div(3−2i, −1+4i) = −11/17 − (10/17)i`; `pow(√3+i, 10) = 512 − 512√3 i` and its Arg is `−π/3`;
`rootsOf(−16, 4)` = `2e^{iπ/4}, 2e^{i3π/4}, 2e^{i5π/4}, 2e^{i7π/4}` = `√2(±1 ± i)` with each root
to the 4th power equal to −16; `rootsOfUnity(5)` each satisfy `z⁵ = 1` and `isPrimitiveRoot(k, 5)`
is false only for k = 0; `principalRoot(2i, 2) = 1 + i`; `branchRoot(−1, 3, 0) = e^{iπ/3} = ½ + (√3/2)i`;
`branchRoot(−1, 3, −π) = e^{iπ/3}` too (Arg(−1) = π is the top of the window) while
`branchRoot({re:-1, im:-1e-12}, 3, -π)` is near `e^{-iπ/3}` (the jump); `quadraticRoots(1, −4, 13) = 2 ± 3i`;
`localLinear(|z|², 1+i) = {A: 1−i, B: 1+i}`, `localLinear(Re z, any) = {A: ½, B: ½}`,
`localLinear(z²+z, 1+i) = {A: 3+2i, B: 0}` (|B| < 1e-6), `localLinear(conj z, any) = {A: 0, B: 1}`.

### 3.2 `js/core/parse.js` (pure; imports `./complex.js`)

```js
export class ParseError extends Error { position: number }
export function parse(src) → AST                       // throws ParseError with a message a student can read
export function compile(src) → { f: (z) => {re, im}, src, tex: string, uses: Set<'z'|'x'|'y'> }
export function toTex(src) → string                    // pretty TeX of the parsed expression (fractions for a/b, ^ as superscripts, \overline{z} for conj)
export function evaluate(src, z) → {re, im}            // compile(src).f(z)
```

Grammar (deliberately small for iteration 1): numbers (`2`, `0.5`, `.5`); constants `i`, `pi`, `e`;
variables `z`, `x` (= Re z), `y` (= Im z); binary `+ - * / ^` (`^` right-associative, highest
precedence, above unary minus: `-z^2 = -(z^2)`); unary minus; parentheses; **implicit
multiplication** (`2z`, `iz`, `(1+i)z`, `z(z+1)`, `2i`); functions with parentheses
`conj Re Im abs arg Arg exp log sqrt sin cos` (`arg` and `Arg` both mean the principal value;
`log`, `sqrt` are principal). `z^n` with real integer-valued `n` uses `pow` (de Moivre); other
exponents use `powc`. Whitespace is ignored. Unknown identifiers throw.

Required to compile and evaluate correctly (pinned by tests): `z^2`, `z^3`, `1/z`, `i*z - 2*i`,
`iz - 2i`, `(1+i)z`, `z^2 + iz`, `exp(z)`, `conj(z)`, `Re(z)`, `abs(z)^2`, `z^2/abs(z)^2`,
`sqrt(z)`, `z^(1/3)`, `(x^2 - y^2 + 2ixy)/(x^2 + y^2)`, `(Re(1+z) - 1)/z`. Examples:
`evaluate('z^2 + iz', 1+i) = -1 + 3i`; `evaluate('(1+i)z', i) = -1 + i`; `evaluate('sqrt(z)', 2i) = 1 + i`;
`evaluate('1/z', 2) = 0.5`; `evaluate('z^(1/3)', -1) = ½ + (√3/2)i` (principal).

### 3.3 `js/data/problems.js` (pure data)

```js
export const PROBLEMS = [ Problem, ... ]   // all 29, in handout order
// Problem:
{ id: '1.4.2', chapter: 1, section: 'Powers and Roots', kind: 'problem' | 'proof',
  statement: string,          // the handout text, verbatim, as TeX-friendly plain text with $...$ for maths
  station: 'roots',           // the station that owns it (must equal registry stationForProblem(id).id)
  address: 'C' | 'P' | 'C→P' | 'P→C' | 'C→P→C' | 'both',
  addressWhy: string,         // one sentence: why that address is native
  aha: string,                // the one-sentence aha from docs/STORY.md section 3
  thread: 'T1' | 'T2' | 'T3',
  topics: ['T1.4'],
  answer: { tex: string, text: string, values: object }   // values: exact numbers the unit tests assert (see below)
}
export const TOPICS = [ { id: 'T1.4', chapter: 1, title, summary, stations: ['powers', 'roots'], thread: 'T2' }, ... ]  // all 12
export function problemById(id) → Problem | null
export function problemsForStation(stationId) → Problem[]          // handout order
export function topicsForStation(stationId) → Topic[]
export function routeFor(problemId) → 'problem-1-4-2' | 'problem-P3'  // dots → dashes
export function idFromRoute(token) → '1.4.2' | 'P3' | null             // inverse; null if not a problem route
export function topicRoute(topicId) → 'topic-T1-4'; export function topicFromRoute(token) → 'T1.4' | null
```

`answer.values` per problem (unit tests assert these to 1e-9 unless noted):

| id | values |
|---|---|
| 1.1.1 | `product: {re: 5, im: 14}`, `quotient: {re: -11/17, im: -10/17}`, `productAbs: sqrt(221)` |
| 1.1.2 | `im: 6`, `difference: {re: 4, im: -6}` |
| 1.2.1 | `center: {re: 1, im: 2}`, `radius: 3` |
| 1.2.2 | `distance: sqrt(29)`, `difference: {re: 5, im: 2}` |
| 1.3.1 | `r: 2`, `theta: 2π/3`, `Arg: 2π/3`, `z: {re: -1, im: sqrt(3)}` |
| 1.3.2 | `result: {re: 512, im: -512*sqrt(3)}` (1e-6), `r: 1024`, `Arg: -π/3`, `base: {re: sqrt(3), im: 1}`, `n: 10` |
| 1.4.1 | `roots: [e^{2πik/5}]` k = 0..4 (re, im to 1e-9), `primitive: [false, true, true, true, true]` |
| 1.4.2 | `radius: 2`, `angles: [π/4, 3π/4, 5π/4, 7π/4]`, `roots: [{√2, √2}, {-√2, √2}, {-√2, -√2}, {√2, -√2}]` |
| 1.4.3 | `roots: [{re: 2, im: 3}, {re: 2, im: -3}]`, `completed: { shift: 2, square: -9 }` |
| 1.5.1 | `start: {re: 2, im: 1}`, `end: {re: -3, im: -3}`, `direction: {re: -5, im: -4}`, `at: { t: 0.5, z: {re: -0.5, im: -1} }` |
| 1.5.2 | `center: {re: 0, im: -1}`, `inner: 1`, `outer: 3`, `innerIncluded: false`, `outerIncluded: true`, `open: false`, `closed: false`, `bounded: true`, `connected: true`, `domain: false`, `region: true` |
| 2.1.1 | `check: { z: {re: 1, im: 1}, w: {re: -1, im: 3}, u: -1, v: 3 }` |
| 2.1.2 | `parabola: { vertex: 4, coeff: -1/16, focus: 0 }`, `sample: { y: 1, w: {re: 3, im: 4} }` |
| 2.1.3 | `imageLine: 'v = 0'`, `rotation: π/2`, `shift: {re: 0, im: -2}`, `sample: { z: {re: 2, im: 3}, w: {re: -3, im: 0} }` |
| 2.2.1 | `sector: { from: 0, to: 3π/4 }`, `n: 3` |
| 2.2.2 | `root: {re: 1, im: 1}`, `r: sqrt(2)`, `Arg: π/4`, `other: {re: -1, im: -1}` |
| 2.3.1 | `alongParabola: 1`, `alongLine: (m) => e^{2i·atan m}` stated as `alongRealAxis: {re: 1, im: 0}`, `alongImagAxis: {re: -1, im: 0}`, `exists: false` |
| 2.4.1 | `seam: 0`, `window: [0, 2π]`, `atMinusOne: {re: 0.5, im: sqrt(3)/2}`, `principalJumps: true` |
| 2.5.1 | `imageLine: 'Re w = 1/2'`, `re: 0.5`, `sample: { z: {re: 1, im: 1}, w: {re: 0.5, im: -0.5} }` |
| 3.1.1 | `derivativeAt: { z: {re: 1, im: 1}, fprime: {re: 3, im: 2} }`, `A: '2z + 1'`, `Babs: 0` |
| 3.1.2 | `differentiableAt: {re: 0, im: 0}`, `fprime0: {re: 0, im: 0}`, `circleRadiusAt: { z: {re: 1, im: 1}, radius: sqrt(2) }` |
| 3.2.1 | `entire: true`, `fprimeAt0: {re: 1, im: 0}`, `check: { z: {re: 0, im: π/2}, w: {re: 0, im: 1} }` |
| P1 | `check: { z1: {3, -2}, z2: {-1, 4}, both: {re: 5, im: -14} }` |
| P2 | `check: { z: {3, -2}, zzbar: 13, abs: sqrt(13) }` |
| P3 | `check: { a: {0, 1}, b: {0, -2}, c: {1, 1}, d: {1, 0}, coeff: {re: -1, im: 1}, shift: {re: 0, im: -1} }` (a(cz + d) + b with a = i, b = −2i, c = 1+i, d = 1) |
| P4 | `radius: sqrt(2)`, `factor: {re: 1, im: 1}`, `factorAbs: sqrt(2)`, `factorArg: π/4` |
| P5 | `alongRealAxis: {re: 1, im: 0}`, `alongImagAxis: {re: 0, im: 0}`, `exists: false` |
| P6 | `A: {re: 0.5, im: 0}`, `B: {re: 0.5, im: 0}`, `differentiable: false` |
| P7 | `fprime: {re: 0, im: 0}`, `constant: true` |

### 3.4 `js/data/functions.js` (pure data)

```js
export const FUNCTIONS = [ Fn, ... ]
// Fn:
{ id: 'sq', label: 'z²', tex: 'z^2', src: 'z^2',       // src is parse.js grammar; stations do compile(fn.src)
  problems: ['2.1.2'], stations: ['powermap'],         // where it is the star
  analytic: true, poles: [] | [{re, im}], note: 'squares the modulus, doubles the angle',
  cart: { u: 'x^2 - y^2', v: '2xy' }, polar: { u: 'r^2\\cos 2\\theta', v: 'r^2\\sin 2\\theta' },   // TeX, or null
  derivativeTex: '2z' | null }
export function fnById(id) → Fn | null
```

Required ids and sources: `sq` `z^2`; `cube` `z^3`; `recip` `1/z` (pole 0); `linear-i` `iz - 2i`;
`linear-1i` `(1+i)z`; `sq-plus-iz` `z^2 + iz`; `sq-plus-z` `z^2 + z`; `exp` `exp(z)`;
`conj` `conj(z)`; `re` `Re(z)`; `abs2` `abs(z)^2`; `dir` `z^2/abs(z)^2` (pole 0);
`sqrt` `sqrt(z)`; `cbrt` `z^(1/3)`; `x-over-z` `(Re(1+z) - 1)/z` (pole 0). `analytic` is false for
`conj`, `re`, `abs2`, `dir`, `x-over-z`; `sqrt` and `cbrt` are analytic off the seam.

### 3.5 `js/core/plane.js`

```js
export function createPlane(container, options) → Plane
// options:
{ id: string (required; prefix for handle ids and the data-plane-id attribute),
  xRange: [-4, 4], yRange: [-4, 4],      // initial view; the shorter axis is expanded so 1 unit is square
  grid: 'cart' | 'polar' | 'both' | 'none' = 'cart',
  axes: true, axisLabels: ['Re', 'Im'] | ['x', 'y'] | ['u', 'v'],
  interactive: true,                      // wheel zoom and drag-pan on empty space (two-finger on touch)
  minUnitsAcross: 0.5, maxUnitsAcross: 200,
  background: '--surface' }
// Plane:
{ el: HTMLDivElement (.plane; has data-plane-id, data-center-re, data-center-im, data-scale updated on every view change),
  canvas: HTMLCanvasElement,
  toPixel({re, im}) → { x, y }            // CSS pixels relative to the canvas
  fromPixel(x, y) → { re, im }
  getView() → { center: {re, im}, unitsAcross: number, scale: number /* px per unit */ }
  setView({ center?, unitsAcross? }); fitTo(points: {re, im}[], padding = 0.15)
  setGrid('cart' | 'polar' | 'both' | 'none')
  addPoint(spec) → Handle
  //   spec: { id, z, draggable = true, color = '--input' (token or css colour), label = '', radius = 7,
  //           step = 0.1 /* arrow-key nudge; Shift ×10, Alt ÷10 */, snap = null | ((z) => z),
  //           onDrag(z, { final: boolean }) , onFocus() }
  //   Handle: { id, z, el: HTMLButtonElement (class plane-handle, id `${plane.id}-${id}`, aria-label), set(z, { silent = false }), remove(), hidden }
  //   The button is absolutely positioned over the canvas, is keyboard focusable, and announces its two addresses in aria-label ("z = 2 + 1i; r = 2.236, θ = 0.464").
  addLayer(draw: (ctx2d, plane) => void, { order = 0 }) → Layer { remove(), order }   // layers draw after grid/axes, before handles, ascending order
  addCurve(spec) → CurveLayer
  //   spec: { id, points: {re, im, t}[], color = '--input', ramp = true, width = 2, dots = true, arrow = true, closed = false, dash = null }
  //   CurveLayer: { update(points), setColor(c), remove(), hidden }
  on('pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', (e: { z, px, py, pointerType, originalEvent }) => void) → unsubscribe
  //   fired for pointer events on empty canvas (not on handles); stations build drawing tools with these
  on('viewchange', (view) => void) → unsubscribe
  setDrawMode(on: boolean)                 // when on, pan-by-drag is disabled so pointer events draw
  requestDraw()                            // marks dirty; one rAF redraw coalesces many requests
  resize()                                 // also called by a ResizeObserver; devicePixelRatio aware
  destroy()                                // removes listeners, observer, handles, and unregisters from window.__mv
}
// drawing helpers (standalone; ctx is the 2d context passed to a layer)
export function cssColor(nameOrColor) → string           // '--cart' → computed value; other strings returned as is
export function rampColor(baseColor, t) → string         // base mixed toward var(--t0) at t = 0 and var(--t1) at t = 1 (weight 0.65); monotone lightness
export function drawCartAddress(ctx, plane, z, { color = '--cart', labels = true } = {})     // dashed drop lines to both axes, tick labels x and y
export function drawPolarAddress(ctx, plane, z, { color = '--polar', labels = true, ghosts = 0, arcRadiusPx = 28 } = {})
//    ray from 0 to z labelled r, solid arc from the positive real axis to the ray labelled θ (Arg);
//    ghosts = k draws k faint extra windings of the arc (θ + 2π, θ + 4π, ...) so arg z reads as a set
export function drawSeam(ctx, plane, angle = Math.PI, { color = '--seam' } = {})           // dashed ray from 0
export function drawCircle(ctx, plane, center, radius, { color, dash, fill, width } = {})
export function drawRay(ctx, plane, angle, { color, dash, width } = {})
export function drawSegment(ctx, plane, a, b, { color, dash, arrow, width } = {})
export function drawArc(ctx, plane, center, radius, from, to, { color, arrow, width } = {})  // radius in units; angles radians, ccw
export function drawTimedCurve(ctx, plane, points, { color = '--input', width = 2, dots = true, arrow = true, closed = false } = {})
export function drawDot(ctx, plane, z, { color, radius = 5, label, labelOffset } = {})
export function drawLabel(ctx, plane, z, text, { color = '--text', dx = 8, dy = -8, font } = {})
export function drawPolygonFill(ctx, plane, points, { color, alpha = 0.12 } = {})
```

Behaviour: redraw order is background, grid, axes, layers (ascending `order`), curves, then the
DOM handles above. Grids use `--cart` (lines) and `--polar` (circles at r = 1, 2, 3, ... and rays
every 30°) at low alpha. Colours are read with `getComputedStyle(document.documentElement)` at
draw time and cached per frame; the cache is dropped on the `themechange` event on `document`.
Keyboard: a focused handle moves with the arrow keys; the plane itself (tabindex 0) zooms with
`+`/`-` and pans with arrows when focused. Reduced motion changes nothing here (no autonomous
animation). `window.__mv = window.__mv || { planes: new Map() }`; every plane registers itself
under its `id` so interaction scripts can call `toPixel` (see `tests/interact/_helpers.mjs`).

### 3.6 `js/core/katex.js`

```js
export function tex(el, src, { display = false } = {})   // renders into el (replaces children); on KaTeX error or missing KaTeX, sets el.textContent = src and adds class tex-error; never throws
export function texToHtml(src, { display = false } = {}) → string
export function tint(src, token) → string                 // `\textcolor{${cssVar(token)}}{${src}}` with the computed colour of the token (e.g. '--cart')
export const cart = (src) => tint(src, '--cart');
export const polar = (src) => tint(src, '--polar');
export const input = (src) => tint(src, '--input');
export const output = (src) => tint(src, '--output');
```

Because the tint bakes the colour in, explainers re-render on `themechange`.

### 3.7 `js/core/explainer.js`

```js
export function createExplainer(el, spec) → Explainer
// spec:
{ id: string (required; element ids are `${id}-${row.id}-${col.key}`),
  title?: string,
  columns: [ { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart' },
             { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar' },
             /* optional third, e.g. { key: 'motion', heading: 'As a motion', tone: '--output' } */ ],
  rows: [ { id: 'product', label: 'z₁z₂', cart: (s) => texString, polar: (s) => texString /*, motion: (s) => ... */ }, ... ],
  same?: (s) => ({ cart: texString, polar: texString, agree: boolean }) }   // the footer "same point" row
// Explainer:
{ el, update(state), setRows(rows), destroy() }
```

Rendering: a `<table class="explainer">` (or CSS grid) with the column headings tinted by their
`tone`, each cell rendered by `katex.js`; the footer row has id `${id}-same` and contains the text
`same point: agree` or `same point: differ` plus both TeX values. `update` is coalesced to one
render per animation frame; cells whose TeX string did not change are not re-rendered. On phones
the two columns stack (Cartesian above polar) below 560px.

### 3.8 `js/core/staircase.js`

```js
export function argSteps(theta, kMin = -2, kMax = 2) → [{ k, theta: theta + 2πk }]        // pure
export function homeStep(theta, seam = -Math.PI) → { k, theta }                             // pure: the representative in (seam, seam + 2π]
export function createStaircase(el, { id, kMin = -2, kMax = 2, seam = -Math.PI, label = 'arg z', onPick = null }) → Staircase
// Staircase: { el, update(theta /* any representative */), setSeam(seam), setLabel(label), destroy() }
```

Rendering: `<ol class="staircase">` with one `<li data-k="k" id="${id}-k${k}">` per step, text
`θ + 2πk` formatted (`fmtAngle`-style, with the exact-π form when it exists, e.g. `2π/3 + 2π = 8π/3`),
the home window `(seam, seam + 2π]` drawn as a shaded band with class `staircase-home`, the step
inside it carrying class `is-home` and an `Arg z =` prefix; the element `#${id}-arg` holds the Arg
value as text, e.g. `Arg z = 2.094 (2π/3)`. The ghost steps (`k ≠ home`) are drawn in `--polar` at
reduced alpha, the home step in full `--polar`. Clicking a step calls `onPick(k)` (used by
`roots` and `principal-root` to show which step produced which root).

### 3.9 `js/core/shapes.js` (pure)

```js
// Curve = { id?: string, kind: string, points: {re, im, t}[], closed: boolean, label?: string }
export function segment(a, b, { n = 64 } = {}) → Curve                 // t linear from a (t=0) to b (t=1)
export function circle(center, r, { n = 128, from = 0, to = 2π, orientation = +1 } = {}) → Curve   // closed when |to − from| = 2π
export function rect(a, b, { nPerSide = 32 } = {}) → Curve             // perimeter of the axis-aligned rectangle with corners a and b, counterclockwise from min corner, closed
export function polygon(vertices, { closed = true, nPerSide = 32 } = {}) → Curve
export function verticalLine(x, { yRange = [-4, 4], n = 128 } = {}) → Curve     // x = c, t runs upward
export function horizontalLine(y, { xRange = [-4, 4], n = 128 } = {}) → Curve
export function ray(angle, { rMin = 0, rMax = 4, n = 96 } = {}) → Curve
export function cartGrid({ xRange = [-2, 2], yRange = [-2, 2], step = 0.5, n = 96 } = {}) → Curve[]
export function polarGrid({ rMax = 2, rings = 4, rays = 12, n = 96 } = {}) → Curve[]
export function sector({ r0 = 0, r1 = 2, theta0, theta1, fill = true, fillRays = 4, fillArcs = 3 } = {}) → Curve[]   // boundary first, then sparse interior rays/arcs
export function annulus({ center = {re:0, im:0}, r0, r1, fill = true, fillRings = 2, fillRays = 8 } = {}) → Curve[]
export function freehand(samples: {re, im}[], { minDist = 0.01 } = {}) → Curve  // t by cumulative arclength
export function reverse(curve) → Curve                                    // −C: points reversed, t ↦ 1 − t
export function resample(curve, n) → Curve
export function pointAt(curve, t) → {re, im}                              // linear interpolation on t
export function classify(curve) → { closed, simple, smooth, piecewiseSmooth, orientation: 1 | -1 | 0, corners: number }
//   closed: |z(1) − z(0)| < 1e-9; simple: no proper self-intersection between non-adjacent segments; smooth: no turning angle > 20° between consecutive segments; orientation: sign of the signed area (closed curves only)
```

### 3.10 `js/core/mapping.js` (pure)

```js
export function pushForward(curve, f, opts = {}) → Curve[]
// opts: { maxJump = 3 /* break if |w_{k+1} − w_k| > maxJump·(median step) */, clampRadius = 40 /* break if |w| > clampRadius or not finite */,
//         maxDepth = 4, angleTol = 0.08 /* rad: subdivide a segment while the image turns by more than this */ }
//   The image keeps the input's t on every point; pieces are returned in t order; a piece with < 2 points is dropped.
export function pushForwardAll(curves, f, opts) → Curve[]           // concatenation, each piece tagged with `source: curve.id`
export function morph(curve, s, f, opts) → Curve[]                   // (1 − s)·z + s·f(z) per point, same breaking rules as pushForward
export function morphPoint(z, w, s) → {re, im}
export function bounds(curves) → { xRange, yRange } | null         // finite points only
export function lift(curve, f) → { re, im, t, w: {re, im} }[]        // input points with their images attached (for the 3D views)
```

Pinned by tests: the image of the unit circle under `1/z` has every point with `| |w| − 1 | < 1e-9`;
the image of `|z − 1| = 1` under `1/z` has every finite point with `|Re w − ½| < 1e-6` and is
returned in ≥ 1 piece with no point of |w| > clampRadius; the image of `x = 2` (yRange [−4, 4])
under `z²` satisfies `|u − (4 − v²/16)| < 1e-6` on every point; `morph(c, 0, f)` equals `c`
and `morph(c, 1, f)` equals `pushForward(c, f)` pointwise.

### 3.11 `js/core/domaincolor.js`

```js
export function hueOf(w) → number in [0, 1)            // Arg(w)/(2π) mod 1 → hueOf(1) = 0, hueOf(i) = 0.25, hueOf(−1) = 0.5, hueOf(−i) = 0.75
export function lightnessOf(w) → number in [0, 1]      // 1 − 1/(1 + sqrt|w|): 0 at 0, 0.5 at |w| = 1, → 1 at ∞
export function colorOf(w, out = [0, 0, 0]) → [r, g, b]  // 0..255; HSL with s = 0.8, l = lightnessOf · (0.88 + 0.12·frac(log2|w|)) (faint rings at |w| = 2^k); non-finite → mid grey
export function createDomainColoring(canvas, { f, xRange, yRange, quality = { idle: 1, drag: 0.3 }, rings = true }) → DC
// DC: { setFunction(f), setView({ xRange, yRange }), setQuality('idle' | 'drag'), render() /* synchronous at current quality; when quality is 'drag' schedules an 'idle' refine 120 ms after the last call */, destroy() }
export function drawColorWheel(canvas, { size = 96 } = {})   // the legend: hue by angle, lightness by radius
```

### 3.12 `js/core/three-view.js` (imports three.js and OrbitControls from `../../vendor/three/`)

```js
// pure (no three.js objects; unit-tested in Node)
export function stereographic(z) → [X, Y, Z]               // (2x, 2y, |z|² − 1)/(|z|² + 1); z = 0 → [0, 0, −1]; ∞ → [0, 0, 1]; unit circle → equator Z = 0
export function inverseStereographic([X, Y, Z]) → {re, im}  // (X, Y)/(1 − Z); Z = 1 → {re: Infinity, im: Infinity}
export function rotate4([x, y, u, v], { uv = 0, yv = 0 }) → [x', y', u', v']   // rotate in the u–v plane by uv, then in the y–v plane by yv
export function project4to3(p4) → [x, y, u]                 // drop the last coordinate; the dropped v' is the "hidden" value painted as colour
// three.js helpers
export function createView3D(container, { background = '--surface', cameraPosition = [3, 3, 4], grid = true, autoRotate = false } = {}) → View
// View: { scene, camera, renderer, controls (OrbitControls), add(obj), remove(obj), onFrame(cb) → unsub, start(), stop(), resize(), setBackgroundFromTheme(), dispose() }
//   The renderer is sized to the container with a ResizeObserver; start() runs a rAF loop that renders only when controls changed or a frame callback asked (requestRender()); dispose() stops the loop, disposes geometries/materials/renderer and removes the canvas.
export function surfaceFromFunction({ f, xRange, yRange, nx = 96, ny = 96, height: (w, z) => number, color: (w, z) => [r, g, b] /* 0..1 */, clamp = 6 }) → THREE.Mesh   // BufferGeometry with vertex colours, DoubleSide; non-finite or |height| > clamp vertices clamped and flagged
export function modulusLandscape({ f, xRange, yRange, nx, ny, clamp = 6 }) → THREE.Mesh          // height |w|, colour hue = Arg w (same hue convention as domaincolor: Arg 0 → red)
export function reImSurface({ f, xRange, yRange, nx, ny, part: 're' | 'im', clamp = 6 }) → THREE.Mesh
export function graph4D({ f, xRange, yRange, nx = 64, ny = 64, angles = { uv: 0, yv: 0 }, clamp = 6 }) → { mesh, setAngles({ uv, yv }), setFunction(f), dispose() }
//   builds the 4D points (x, y, u, v), applies rotate4 then project4to3; the hidden coordinate is painted with a sequential colour ramp; setAngles recomputes positions in place
export function riemannSurfaceRoot({ n = 3, rMax = 2, nr = 24, nTheta = 48 /* per turn */, part = 'im' } = {}) → THREE.Mesh
//   sheets: theta in [0, 2πn), vertex (r cos θ, r sin θ, part(r^{1/n} e^{iθ/n})), coloured by the other part; the n sheets join after n turns
export function argHelix({ z, turns = 2, rMax = 3 } = {}) → { group: THREE.Group, update(z) }
//   the staircase over the plane: a helical ribbon (r, φ, height φ) for φ in [−2π·turns, 2π·turns] plus one marker per step k at (z, height Arg z + 2πk); the home step marker is larger
export function riemannSphere({ radius = 1 } = {}) → { group, project(z) → THREE.Vector3, addCurve(points: {re, im}[], color) → THREE.Line, clearCurves(), markInfinity(on) }
//   north pole (0, 0, 1) in plane coordinates is ∞; the sphere group maps plane Z to three.js Y (up)
export function curveToLine(points3: [x, y, z][], color) → THREE.Line
export function disposeObject(obj)                        // recursively disposes geometry and material
```

Pinned by tests: `stereographic(0) = [0, 0, −1]`, `stereographic(1) = [1, 0, 0]`,
`stereographic(i) = [0, 1, 0]`, `stereographic(1e9)` within 1e-8 of `[0, 0, 1]`;
`inverseStereographic(stereographic(z)) = z` for z = 2 + i; the half-turn identity
`stereographic(1/z) = [X, −Y, −Z]` where `[X, Y, Z] = stereographic(z)` for z = 2 + i;
`rotate4(p, {uv: π/2})` sends `(x, y, u, v)` to `(x, y, −v, u)` so the Re surface becomes the Im surface;
`rotate4(p, {uv: 0, yv: 0}) = p`.

### 3.13 `js/core/theme.js` and `js/core/store.js` (shell goal)

```js
// theme.js
export function cssVar(name) → string                     // trimmed computed value on documentElement, e.g. cssVar('--cart') → '#2563eb'
export function getTheme() → 'light' | 'dark'             // the effective theme
export function setTheme(t: 'light' | 'dark' | 'auto')    // sets or removes data-theme on <html>, persists under 'mv:theme' (try/catch), dispatches document CustomEvent 'themechange' { detail: { theme } }
export function onThemeChange(cb: (theme) => void) → unsubscribe   // fires on setTheme and on prefers-color-scheme changes
export function prefersReducedMotion() → boolean
// store.js
export function createStore(prefix = 'mv:') → Store
// Store: { get(key, fallback), set(key, value), remove(key), subscribe(key, cb) → unsubscribe, keys() }
//   memory Map mirrored to localStorage as JSON; every localStorage access is try/catch; values must be JSON-serialisable
```

### 3.14 `js/app.js` (router)

```js
export function parseRoute(hash) → { station: string | null, preset: Preset | null, raw: string }   // pure; exported for unit tests
// Preset = { kind: 'problem', id: '1.4.2' } | { kind: 'topic', id: 'T2.4' } | { kind: 'token', token: '2-5-1' }
export function start()   // index.html calls this once: builds the nav, installs hashchange, mounts the first route
```

Resolution rules for `parseRoute` (tokens contain only `[A-Za-z0-9._~-]`):
1. empty or `#` → `{ station: 'home' }`.
2. `problem-<id>` → `{ station: stationForProblem(idFromRoute(token)).id, preset: { kind: 'problem', id } }`; the id's dashes map back to dots (`problem-1-4-2` → `1.4.2`, `problem-P3` → `P3`). The router does not import `data/problems.js`; it uses `registry.stationForProblem` and the dash↔dot rule.
3. `topic-<id>` → `{ station: stationForTopic('T2.4').id, preset: { kind: 'topic', id: 'T2.4' } }`.
4. an exact station id → `{ station: id, preset: null }`.
5. `<station-id>-<rest>` with the **longest** station id that is a prefix followed by `-` → `{ station, preset: { kind: 'token', token: rest } }` (so `#lab-2-5-1` → lab with token `2-5-1`, `#principal-root-sweep` → principal-root with token `sweep`).
6. anything else → `{ station: null }`; the router renders the "No such place" panel (with the station list) and sets `document.title`.

Mounting: the previous `unmount()` runs inside try/catch; `#view` is emptied; a
`<section class="station" id="station-<id>" data-station="<id>">` is created; `await import(st.module)`
(relative to `js/app.js`); `unmount = mod.mount(section, ctx)`. If the import or `mount` throws,
the router renders `<div class="panel under-construction" data-station-error>` with the station's
title, "This station is under construction.", a link home, and calls `console.error(err)`. While
a station is loading (> 150 ms) a `.loading` placeholder is shown. `document.title` becomes
`"<title> · One Point, Two Addresses"`. The nav marks the active station with `aria-current="page"`.
The header has a skip link to `#view`.

`ctx` passed to `mount`:

```js
{ navigate(token: string),                 // sets location.hash = '#' + token
  route: string,                           // the raw token
  station: StationEntry,                   // the registry entry
  stations: STATIONS, threads: THREADS,
  preset: Preset | null,                   // see above
  store: Store,                            // shared, created once in app.js
  theme: { cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion } }
```

## 4. Station contract and shared conventions

```js
// js/stations/<id>.js
export function mount(el, ctx) → unmount()
```

Every station:

1. **Header.** Starts with `<header class="station-header">`: `<h1>` = registry title, a
   one-paragraph "what you are looking at" line, thread badges (`<span class="thread-badge" data-thread="T1">`
   for each registry `threads` entry, tinted by `THREADS[].tone`), and one `<a class="chip problem-chip" href="#problem-1-4-2">1.4.2</a>`
   per owned problem (from `problemsForStation(ctx.station.id)`), each with the problem's aha in `title`.
2. **Presets.** Reads `ctx.preset` on mount. `kind: 'problem'` loads the state in the table below.
   `kind: 'token'` is station-specific (documented in the station's design). No preset → the
   station's default state (which is its first problem's state when it has one).
3. **Ids.** Every control has a stable id prefixed by the station id (`#roots-n`, `#roots-plane`,
   `#roots-readout`) and a visible `<label>` or `aria-label`. Planes are created with
   `id: '<station>-plane'` (or `-zplane` / `-wplane` for pairs), so handles are `#<station>-plane-<point>`.
4. **Readouts.** A `<div class="readout" id="<station>-readout">` with plain text (ASCII minus) that
   interaction scripts can assert on, e.g. `|z| = 2.236`, `Arg z = 2.094`. KaTeX is for the
   explainer; the readout is text.
5. **Both addresses, always.** Any computation shown goes through `createExplainer` with the
   Cartesian and polar columns; any angle shown says whether it is `arg` (a set: ghosts or the
   staircase) or `Arg` (the home step). Any plane that shows a principal value draws the seam.
6. **Links.** Ends with `<nav class="station-links">`: previous and next station in registry
   `order`, the thread neighbours (`data-thread`), and, for stations with an image problem, a
   button `#<station>-open-lab` that does `ctx.store.set('lab.request', LabRequest)` then
   `ctx.navigate('lab')`.
7. **Lifecycle.** `unmount` stops rAF loops, removes window/document listeners, destroys planes,
   explainers and 3D views, and unsubscribes from the store and theme.
8. **Phone.** Two-plane layouts use `.two-planes` (grid, 2 columns ≥ 760px, stacked below);
   chips wrap; no horizontal scroll at 390px.
9. **Reduced motion.** Every play/animate control checks `ctx.theme.prefersReducedMotion()` and
   becomes a stepper (or jumps to the end state) when it is set.

**LabRequest** (the handoff from a station to the Lab, stored under `lab.request`):

```js
{ fn: 'recip' /* FUNCTIONS id */ | { src: string },
  shapes: [ { kind: 'circle', center: {re, im}, r } | { kind: 'segment', a, b } | { kind: 'verticalLine', x } | { kind: 'horizontalLine', y }
          | { kind: 'rect', a, b } | { kind: 'sector', r0, r1, theta0, theta1 } | { kind: 'annulus', center, r0, r1 } | { kind: 'polygon', vertices } ],
  view: 'side' | 'morph' | 'domain' | 'landscape' | 'sphere' | 'graph4d',
  problem: '2.5.1' | null, predictFirst: boolean }
```

The Lab consumes and removes `lab.request` on mount; `#lab-<problem-token>` (e.g. `#lab-2-5-1`)
loads the same preset from its own table when there is no stored request.

**Problem presets per station** (what `preset.kind === 'problem'` loads):

| Problem | Station | State loaded |
|---|---|---|
| 1.1.1 | arithmetic | z₁ = 3 − 2i, z₂ = −1 + 4i, mode × (chip to ÷ highlighted as the second part) |
| 1.1.2 | arithmetic | z₁ = 3 − 2i, z₂ = −1 + 4i, mode − with conj step shown |
| P1, P2 | arithmetic | mode conj (P1) and mode × with z₂ = conj z₁ (P2) |
| 1.2.1 | distance | circle mode: a = 1 + 2i, R = 3 |
| 1.2.2 | distance | two-point mode: z₁ = 4 + 3i, z₂ = −1 + i |
| 1.3.1 | addresses (and staircase) | z = −1 + i√3 |
| 1.3.2 | powers | z = √3 + i, n = 10 |
| 1.4.1 | roots | c = 1, n = 5 |
| 1.4.2 | roots | c = −16, n = 4 |
| 1.4.3 | roots | quadratic panel open: a = 1, b = −4, c = 13 |
| 1.5.1 | curves | segment 2 + i → −3 − 3i |
| 1.5.2 | sets | annulus centre −i, 1 < r ≤ 3 |
| 2.1.1 | mappings | f = z² + iz, z = 1 + i |
| 2.1.2 | powermap (and lab) | n = 2, input x = 2 |
| 2.1.3 | linear (and lab) | a = i, b = −2i, input x = 2 |
| 2.2.1 | powermap (and lab) | n = 3, input sector 0 < arg z < π/4 |
| 2.2.2 | principal-root | w = 2i, n = 2 |
| 2.3.1 | limits | g = z²/|z|², path y = x² |
| 2.4.1 | branches | seam = 0 (window 0 < θ < 2π), walk along the negative real axis |
| 2.5.1 | reciprocal (and lab) | input circle |z − 1| = 1 |
| 3.1.1 | derivative | f = z² + z, z₀ = 1 + i |
| 3.1.2 | derivative | f = |z|², z₀ = 1 + i (with the "drag to 0" hint) |
| 3.2.1 | cauchy-riemann | f = e^x(cos y + i sin y), z₀ = 0.5 + 0.8i |
| P3 | linear | composition panel open: a = i, b = −2i, c = 1 + i, d = 1 |
| P4 | linear (and lab) | a = 1 + i, b = 0, input unit circle |
| P5 | limits | g = (Re(1 + z) − 1)/z, path = lines |
| P6 | derivative | f = Re z, z₀ = 0.3 − 0.7i |
| P7 | cauchy-riemann | u = c mode |

## 5. Cross-links along the story threads

- `registry.STATIONS[].order` is the Story Map order; `threads` lists the thread lines through
  each station. The home map draws three polylines (T1 `--cart` solid, T2 `--polar` dashed, T3
  `--output` solid) through the stations in order, and each station's footer lists its neighbours
  on each of its threads (previous/next station in `order` that shares the thread id).
- The problem index links a card to `#problem-<id>`; the router resolves the owning station.
- Stations with an "Open in the Lab" button hand over a `LabRequest`; the Lab's preset chips
  carry the problem id and link back with `#problem-<id>`.
- `staircase` is the hub of T2: `addresses`, `powers`, `roots`, `principal-root` and `branches`
  all link to `#staircase` from the angle they display ("what is arg vs Arg?").
- `limits` and `derivative` draw the same direction circle (one is the limit's "every direction",
  the other the derivative's "the circle must be a point"); each links to the other.

## 6. Theme and colours in canvases

Tokens defined in `css/theme.css` on `:root`, re-defined for dark under
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` and under
`:root[data-theme="dark"] { ... }`:

```
--bg --surface --surface-2 --text --text-muted --border --accent --focus
--cart --polar --input --output --seam --ghost-alpha
--t0 --t1            the two ends of the time ramp (t = 0 dark, t = 1 bright; both ≥ 3:1 contrast against --surface in both themes)
--ok --warn --danger
--font --font-mono --radius --shadow
--space-1 ... --space-5
```

Canvases never hard-code colours: `plane.js`, `domaincolor.js` (for the wheel chrome) and
`three-view.js` read `getComputedStyle(document.documentElement).getPropertyValue(token)` at draw
time (cached per frame) and listen for `document` `themechange` to drop the cache and redraw.
Stations read tokens through `ctx.theme.cssVar`. Domain colouring itself (hue = Arg, lightness =
|w|) is data, identical in both themes; only its chrome follows the theme.

## 7. Routes (bare tokens, no key=value)

`#home` `#addresses` `#arithmetic` `#distance` `#staircase` `#powers` `#roots` `#curves` `#sets`
`#mappings` `#linear` `#powermap` `#principal-root` `#branches` `#reciprocal` `#limits` `#derivative`
`#cauchy-riemann` `#lab` `#graph4d` `#problems`; `#problem-<id>` (29 of them, dots as dashes);
`#topic-T1-1` ... `#topic-T3-2`; `#<station>-<token>` for station presets (`#lab-2-5-1`, `#lab-P4`,
`#roots-unity`). Unknown tokens render the "No such place" panel.

## 8. Tests and interaction helpers

```js
// tests/interact/_helpers.mjs (owned by the plane goal)
export async function planePixel(page, planeId, z) → { x, y }      // page coordinates of a plane point, via window.__mv.planes.get(planeId).toPixel + canvas rect
export async function dragHandle(page, handleId, z, { steps = 12 } = {})   // mouse-drag the handle button to the plane point z (plane id = handle id minus its last '-segment')
export async function dragHandleAround(page, handleId, { center = {re:0, im:0}, radius = 1.5, startAngle = 0, turns = 1, steps = 48 } = {}, onStep?) // circular drag; onStep(page, angle) may assert between steps
export async function clickChip(page, id)
export async function readText(page, selector) → string             // trimmed textContent
export async function setSlider(page, id, value)                    // sets value and dispatches 'input' and 'change'
```

Unit tests import pure modules directly (`import { mul } from '../../js/core/complex.js'`).
Interaction scripts run as `node tools/smoke.mjs --route <id> --script tests/interact/<goal>.mjs`
and must pass at both viewports the harness uses (desktop 1280×860 and phone 390×844).

## 9. Station control ids and test hooks (iteration 1)

The planner moved each station goal's element ids, readout formats, preset controls and
`window.__mv` test hooks here so designers, builders and Review B read one list. Interaction
scripts in `tests/interact/` assert on exactly these ids and text formats. Numbers in readouts
use three decimals and ASCII minus; angles add the exact p·π/q form in parentheses when one exists.

### i1-station-home-problems

home: inline <svg id="home-map"> with one <a class="map-station" data-station="<id>" href="#<id>"> per station in registry order and three <path class="thread-line" data-thread="T1|T2|T3">; #home-finder input filtering #home-finder-results (links #problem-<id>); demo plane "home-demo" with handle #home-demo-plane-z and readout #home-readout. problems: <article class="card problem-card" data-problem="<id>"> with <button class="reveal" id="problems-reveal-<id dashes>">, filters #problems-filter-1/2/3/P/all, .topic-card with station links, tick checkboxes persisted under store key "progress".

### i1-station-addresses-arithmetic

addresses: plane "addresses-plane", handle #addresses-plane-z; presets #addresses-preset-m1-sqrt3i, -sqrt3-i, -2i, -m16, -1-i; grid #addresses-grid-cart/-polar/-both; inputs #addresses-x, -y, -r, -theta (typing moves the point); explainer "addresses-ex" rows x, y, r, theta + same footer; staircase "addresses-stairs"; readout #addresses-readout "z = <cart>; |z| = <r>; Arg z = <theta> (<exact>)". arithmetic: plane "arithmetic-plane", handles #arithmetic-plane-z1, -z2, result dot; modes #arithmetic-mode-add/sub/mul/div/conj/inv (conj and inv apply to z1); #arithmetic-preset-1-1-1; explainer "arithmetic-ex"; readout #arithmetic-readout "result = <cart>; |result| = <r>; Arg = <theta>"; #arithmetic-animate (spin then stretch; stepper under reduced motion); proofs panel #arithmetic-proofs.

### i1-station-distance-sets

distance: plane "distance-plane"; modes #distance-mode-two (handles #distance-plane-z1, -z2), #distance-mode-circle (handles #distance-plane-a centre, #distance-plane-R on the circle), #distance-mode-triangle (z1, z2; triangle 0, z₁, z₁ + z₂); readout #distance-readout: two "d = <v>; z1 - z2 = <cart>"; circle "circle: center <cart>, radius <R>"; triangle "|z1| + |z2| = <a>; |z1 + z2| = <b>; slack = <a-b>; lower bound ||z1| - |z2|| = <c>"; explainer "distance-ex". sets: plane "sets-plane"; probe #sets-plane-p; #sets-eps slider; presets #sets-preset-annulus, -closed, -punctured, -halfplane, -twodisks; strictness checkboxes #sets-inner-strict, #sets-outer-strict; chips #sets-open, -closed, -bounded, -connected, -domain, -region with data-answer="yes|no" and a reason; readout #sets-readout "probe: interior|exterior|boundary; eps = <v>".

### i1-station-curves-linear

curves: plane "curves-plane", endpoint handles #curves-plane-a, -b; presets #curves-preset-segment/circle/eight/square/arc; #curves-t slider (0..1) with readout #curves-readout "t = <t>; z(t) = <cart>; x(t) = <x>; y(t) = <y>"; #curves-reverse, #curves-orient; chips #curves-smooth, -piecewise, -closed, -simple, -positive with data-answer; explainer "curves-ex" (row z with (1 − t)z₀ + t z₁ vs x(t), y(t)); #curves-play. linear: planes "linear-zplane", "linear-wplane", control plane "linear-ab" with handles #linear-ab-a, #linear-ab-b; #linear-stage slider (0..3); inputs #linear-input-x2, -unit, -stroke; presets #linear-preset-2-1-3 (a = i, b = −2i), #linear-preset-P4 (a = 1 + i, b = 0); readout #linear-readout "a = <cart> = <polar>; b = <cart>; spin <deg>°, stretch <|a|>, slide <b>"; composition #linear-compose with inputs #linear-compose-c, -d and readout #linear-compose-readout "ac = <cart>; ad + b = <cart>"; #linear-open-lab; window.__mv.linearImage = current image points.

### i1-station-staircase-powers

staircase: plane "staircase-plane", handle #staircase-plane-z, seam drawn; list "staircase-stairs" (k −3..3); readout #staircase-readout "z = <cart>; Arg z = <v> (<exact>); laps = <n>" (net counterclockwise seam crossings since mount); #staircase-walk (one ccw lap at radius |z|; 12-step stepper under reduced motion); #staircase-seam slider (−π..π, default π) calling stairs.setSeam; helix container #staircase-helix (createView3D + argHelix); sum panel: plane "staircase-sumplane" with handles #staircase-sumplane-z1, -z2, lists "staircase-s1", "staircase-s2", "staircase-s12", readout #staircase-sum-readout "Arg z1 + Arg z2 = <v>; Arg(z1 z2) = <w>; differ by <k>·2π". powers: plane "powers-plane", handle #powers-plane-z; #powers-n (1..12, default 10); readout #powers-readout "z^n = <cart>; |z|^n = <r>; n·theta = <v>; home step = <Arg>"; chips #powers-report-ntheta/-home/-cart; explainer "powers-ex" rows r^n, n·theta, wrapped, result; panel #powers-cartesian (n − 1 multiplication lines) with #powers-cartesian-toggle.

### i1-station-roots-principal

roots: plane "roots-plane", handle #roots-plane-c; #roots-n slider (2..12); presets #roots-preset-1 (c = 1, n = 5), -m16 (c = −16, n = 4), -i, -2i; staircase "roots-stairs" (k 0..n, onPick highlights the root from step k); <ol id="roots-list"> with <li id="roots-root-<k>"> "k = <k>: <polar> = <cart>" and a "primitive" badge for c = 1 when gcd(k, n) = 1; readout #roots-readout "c = <cart>; |c|^(1/n) = <r>; roots at (<Arg c> + 2πk)/n; k = 0..<n−1>"; #roots-raise (spiral the selected root back to c; stepper under reduced motion); quadratic panel #roots-quadratic with #roots-qa, -qb, -qc (1, −4, 13) and readout #roots-quadratic-readout "(z - <h>)^2 = <d>; sqrt: <±s>; roots: <r1>, <r2>". principal-root: plane "principal-root-plane", handle #principal-root-plane-w; #principal-root-n (2..6, default 2); staircase "principal-root-stairs"; readout #principal-root-readout "w = <cart>; |w| = <r>; Arg w = <v>; w^(1/n) = <polar> = <cart>"; explainer "principal-root-ex"; #principal-root-sweep (w once around at radius |w|) with #principal-root-sweep-readout "root jumps at Arg w = π" once detected; clicking a ghost root shows "from step k = <k>".

### i1-station-branches-graph4d

branches: planes "branches-zplane" (handle #branches-zplane-z, seam at the chosen angle, window label) and "branches-wplane" (branch value; wedge (σ/n, σ/n + 2π/n) shaded); #branches-seam slider (−π..π, default −π) with chips #branches-seam-principal (−π), -positive (0), -negimag (−π/2); #branches-n (2..5, default 3); readout #branches-readout "seam = <angle>; window (<σ>, <σ+2π>]; z = <cart>; z^(1/n) on this branch = <polar> = <cart>"; walks #branches-walk-along (−2 → −0.5 on the negative real axis) and #branches-walk-across (−1 + 0.5i → −1 − 0.5i) with status #branches-walk-status "continuous" or "jumps at the negative real axis"; 3D #branches-surface (riemannSurfaceRoot n) with a marker at the current point. graph4d: #graph4d-view; chips #graph4d-fn-sq, -sqrt-all, -cbrt-all, -recip, -exp; sliders #graph4d-uv, #graph4d-yv (0..2π); readout #graph4d-readout "showing (x, y, <coord>) with <hidden> as colour; uv = <deg>°, yv = <deg>°"; toggles #graph4d-landscape, #graph4d-sphere; lifts store key "lab.strokes" when present; window.__mv.graph4d.vertexCount for tests.

### i1-station-powermap-reciprocal

powermap: planes "powermap-zplane", "powermap-wplane"; #powermap-n (2..6, default 2); inputs #powermap-input-line (handle #powermap-zplane-line at (c, 0), c = 2) and #powermap-input-sector (handles #powermap-zplane-s0, -s1 on the edge rays, angles 0 and π/4); grid #powermap-grid-cart/-polar; #powermap-t; #powermap-morph; readout #powermap-readout: line (n = 2) "x = <c>; image: u = <c²> - v²/<4c²>; focus 0; vertex <c²>", line (n > 2) "image of x = <c> under z^<n>", sector "sector <a> < arg z < <b>; image: <na> < arg w < <nb>" plus "(overlaps itself)" when n(b − a) > 2π; explainer "powermap-ex"; #powermap-open-lab; window.__mv.powermapImage. reciprocal: planes "reciprocal-zplane", "reciprocal-wplane"; presets #reciprocal-preset-circle1 (|z − 1| = 1; handles #reciprocal-zplane-c, -r), -line, -circle0, -unit; stages #reciprocal-stage-invert, -mirror, -both; probe #reciprocal-zplane-p snapped to the shape; readout #reciprocal-readout "shape: <desc>; image: <desc>; p = <cart>; 1/p = <cart>; |1/p| = <v>" (image desc derived, e.g. "line Re w = 0.5", "circle |w| = 1", "circle through 0"); sphere #reciprocal-sphere; #reciprocal-open-lab; window.__mv.reciprocalImage.

### i1-station-mappings-cr

mappings: planes "mappings-zplane" (handle #mappings-zplane-z), "mappings-wplane"; chips #mappings-fn-sq-plus-iz (default), -sq, -linear-i, -recip, -conj; explainer "mappings-ex" rows expand, u, v, value + same footer; readout #mappings-readout "z = <cart>; w = <cart>; u = <u>; v = <v>; polar: u = <u>; v = <v>"; grid #mappings-grid-cart/-polar; #mappings-morph (0..1); #mappings-open-lab; window.__mv.mappingsMorph. cauchy-riemann: planes "cauchy-riemann-zplane" (handle #cauchy-riemann-zplane-z0, tiny square of side h) and "cauchy-riemann-wplane" (image parallelogram, A-part and B-part overlaid); chips #cauchy-riemann-fn-exp (default), -sq-plus-z, -conj, -re, -abs2, -const-u (u = c, v = x + y editable); #cauchy-riemann-h (0.05..0.5); Jacobian cells #cauchy-riemann-ux, -uy, -vx, -vy; lines #cauchy-riemann-cr1 "u_x = v_y: <ux> vs <vy>, residual <r>" and #cauchy-riemann-cr2 "u_y = -v_x: ..." with data-holds="yes|no" (both residuals < 1e-3); readout #cauchy-riemann-readout "A = <cart>; |B| = <v>; CR holds: yes|no; f'(z0) = <cart> (u_x + i v_x)" or "f' does not exist here"; toggle #cauchy-riemann-paths with explainer "cauchy-riemann-ex" (columns "along Δx": u_x + i v_x; "along iΔy": v_y − i u_y; agree footer); for const-u: input #cauchy-riemann-c and status #cauchy-riemann-const-status.

### i1-station-limits-derivative

limits: planes "limits-zplane" (paths into 0 with the ramp, cursor at z(t)) and "limits-wplane" (g(z(t)) traced; the directional-limit circle dashed; limit marked); chips #limits-fn-dir (z²/|z|², default), #limits-fn-x-over-z; paths #limits-path-line (slope #limits-m, −3..3), #limits-path-vertical, #limits-path-parabola, #limits-path-spiral; #limits-t (1 → 0) and #limits-play; readout #limits-readout "path: <desc>; value at t: <cart>; limit along this path: <cart>; set of directional limits: circle center <c> radius <r>; limit exists: no"; ε–δ for w = z² at z₀ = 1: #limits-eps with #limits-epsdelta "eps = <e>; largest delta = <d>" and disks on both planes. derivative: planes "derivative-zplane" (handle #derivative-zplane-z0, ring of 12 arrows of radius ρ), "derivative-wplane" (f(z₀) and the ring's image), "derivative-dcplane" (quotients q(φ) as dots, dashed circle centre A radius |B|, solid f′ point when |B| < 1e-3); chips #derivative-fn-sq-plus-z (default), -abs2, -conj, -re, -cube, -exp, -recip; #derivative-rho (0.02..0.5); #derivative-phi; readout #derivative-readout "z0 = <cart>; A = <cart>; |B| = <v>; f'(z0) = <cart>" or "f'(z0) does not exist (circle radius <|B|>)"; explainer "derivative-ex" rows quotient, limit, verdict; links #limits-to-derivative, #derivative-to-limits.

### i1-station-lab

Tools #lab-tool-brush, -line, -rect, -circle, -polygon, -cartgrid, -polargrid, -sector, -annulus, -probe (aria-pressed) drawing through plane.on pointer events on plane "lab-zplane" with setDrawMode(true); #lab-undo, #lab-clear; shape presets #lab-preset-x2, -circle1, -unit, -sector, -annulus, -segment with data-problem and a link to #problem-<id>; function chips #lab-fn-<FUNCTIONS id> plus #lab-fn-zn with #lab-n (2..8) and #lab-fn-cbrt-seam with #lab-seam; #lab-fn-src text input, #lab-fn-apply, #lab-fn-error; view tabs #lab-view-side, -morph, -domain, -landscape, -sphere, -graph4d (role="tab"); #lab-t clock with #lab-play (stepper under reduced motion) and #lab-s morph slider; #lab-predict toggle and #lab-reveal; readout #lab-readout "f = <src>; shapes: <n>; view: <name>; t = <t>" plus the probe's "z = <cart> -> w = <cart>"; strokes persisted under store key "lab.strokes"; consumes store key "lab.request" (LabRequest, ARCHITECTURE 4) on mount or the token preset (#lab-2-5-1, -2-1-2, -2-2-1, -2-1-3, -P4); window.__mv.lab = { shapes(), images(), view() }.
