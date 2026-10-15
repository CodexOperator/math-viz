# Architecture

Status: iteration 1, wave 0 built and synced. Sections 1 to 3 describe what the wave-0 code
actually exports and does; every `export function` signature in section 3 is compared with the
source by `tests/unit/architecture-sync.test.mjs`, so a drift fails `npm test`. Wave-1 designers and
builders rely on the signatures below. Where an earlier plan differed from the built code, the code
and this file win. Engineering rules (stack, routing, theming, ownership) are in
`docs/CONSTRAINTS.md`; the story is `docs/STORY.md`. Binding rules for station builders, collected
from the wave-0 reviews, are in section 10.

## 1. Module map

```
index.html                      shell: <header> (title link, theme toggle, nav toggle), <nav id="site-nav">, <main id="view">, colour-key footer, KaTeX classic <script>
css/theme.css                   tokens (light + dark), base typography, body background
css/components.css              generic layout classes (.panel, .chips, .chip, .btn, .slider-row, .two-planes, .station-header, .tex-scroll, ...); catalogue in docs/designs/iter-1/i1-shell.md 2.6
js/app.js                       hash router; mounts stations; error panel; builds the nav from the registry
js/registry.js                  STATIONS, THREADS, stationForProblem(), stationForTopic(), stationById()   [pure data]
js/core/theme.js                cssVar(), getTheme(), setTheme(), onThemeChange(), prefersReducedMotion(), initTheme()
js/core/store.js                createStore(): memory + localStorage mirror (try/catch), subscribe
js/core/complex.js              complex arithmetic, both addresses, Arg/arg, roots, branches, formatting, numeric calculus   [pure]
js/core/parse.js                parse(), compile(), toTex(), evaluate(), ParseError for f(z) expressions   [pure; imports ./complex.js only]
js/data/problems.js             PROBLEMS, TOPICS, lookups, routeFor()/idFromRoute(), statementParts(), addressLabel()/addressTones()   [pure data]
js/data/functions.js            FUNCTIONS catalogue of the test's functions as source strings + TeX, fnById()   [pure data]
js/core/plane.js                createPlane(): complex-plane canvas, grids, handles, layers, curves, draw helpers
js/core/katex.js                tex(), texToHtml(), tint(), cart(), polar(), input(), output(), texColor(), and the prose helpers proseParts(), proseToHtml(), prose()
js/core/explainer.js            createExplainer(): the two-column live numeric explainer
js/core/staircase.js            createStaircase(): the arg/Arg list widget; argSteps(), homeStep() and text helpers   [list is DOM, helpers pure]
js/core/shapes.js               shape primitives -> timed curves; classify(); pointAt(); reverse(); resample()   [pure]
js/core/mapping.js              pushForward() with adaptive subdivision and pole breaking; morph(); pointOnPieces()   [pure]
js/core/domaincolor.js          hueOf(), lightnessOf(), colorOf(), colorXY(), rangesFromView(), createDomainColoring(), drawColorWheel()
js/core/three-view.js           createView3D(), modulusLandscape(), reImSurface(), graph4D(), riemannSurfaceRoot(),
                                argHelix(), riemannSphere(), createMarker(), curveToLine(); pure: stereographic(), inverseStereographic(), rotate4()
js/stations/<id>.js             one module per station: export function mount(el, ctx) -> unmount
tests/unit/*.test.mjs           node:test (pure modules only)
tests/interact/_helpers.mjs     dragHandle(), planePixel(), clickChip(), readText(), setSlider(), settle() for interaction scripts
tests/interact/<goal-id>.mjs    interaction scripts run by tools/smoke.mjs --script
```

### Import rules

- Relative imports only. Stations import from `../core/...`, `../data/...`, `../registry.js`.
  Core modules import `../../vendor/...` where needed (three.js in `three-view.js` only).
- **Wave 0 modules do not import each other**, with two same-goal exceptions: `parse.js` imports
  `complex.js` and `explainer.js` imports `katex.js` (for `tex`). `app.js` imports `registry.js`,
  `core/theme.js` and `core/store.js`. Every other engine works on plain `{re, im}` objects and does
  its own `Math.hypot` / `Math.atan2` inline, so each one can be built and tested on its own.
  Stations (wave 1) are where the engines are composed.
- `plane.js`, `explainer.js`, `staircase.js` and `three-view.js` inject their own
  `<style data-for="<module>">` once per page from a template literal that uses only theme tokens
  (`var(--cart)` etc.). `domaincolor.js` and `shapes.js`/`mapping.js` inject nothing. `components.css`
  holds only generic classes. This keeps `css/components.css` owned by the shell goal alone.
- KaTeX is global: `index.html` loads `vendor/katex/katex.min.js` with a classic deferred `<script>`
  before the module scripts; `katex.js` reads `globalThis.katex` lazily and degrades to plain text if
  it is missing. `vendor/katex/katex.min.css` is linked in `index.html`.
- Test hooks live on `window.__mv` (section 3.5 and section 10.7): `planes`, `views3d`, `app`, plus the
  per-station hooks named in section 9. Any module that creates `window.__mv` writes
  `window.__mv = window.__mv || {}` and adds its own property, so load order does not matter.

## 2. The complex-number representation

A complex number is a plain object `{ re: number, im: number }`. Nothing else, everywhere
(engines, stations, store, presets, tests). Functions never mutate their inputs and return fresh
objects. A "timed point" is `{ re, im, t }` with `t` in `[0, 1]`. Angles are radians. `Arg` is in
`(-π, π]`: `Arg(negative real) = +π`, `Arg(0) = 0`, never `-π` and never `-0`. "A polar address" is
`{ r, theta }` with `theta = Arg`. Wherever `complex.js`, `shapes.js`, `domaincolor.js` or
`stereographic()` take a complex number, a bare real number `n` is also accepted and means
`{ re: n, im: 0 }` (so `rootsOf(-16, 4)` and `Arg(-1)` work as written). Mathematically undefined
results are `NaN` parts, never an exception. Formatting uses ASCII `-` as the minus sign in plain-text
readouts (tests match on it); TeX strings may use whatever KaTeX needs.

## 3. Shared module signatures

Signature lines below are copied from the code, one per export, and checked by a unit test: `//`
comments are not part of the signature. A destructured option object lists its defaults; an
`options` parameter is described in the comment beside it.

### 3.1 `js/core/complex.js` (pure)

```js
export const C = (re, im = 0) => ({ re, im });
export const ZERO, ONE, I;                                  // frozen constants
export function fromPolar(r, theta)                         // → {re: r cos θ, im: r sin θ}
export function toPolar(z)                                  // → { r, theta }, theta = Arg(z)
export function Arg(a)                                      // → number in (-π, π]; Arg(negative real) = π, Arg(0) = 0, never -π or -0
export function wrapArg(theta)                              // → the representative in (-π, π]; NaN when theta is not finite; a result within 1e-12 of -π becomes π
export function argSet(z, { kMin = -2, kMax = 2 } = {})     // → [{ k, theta }], theta = Arg(z) + 2πk, ascending k; kMin/kMax are rounded inward; [] when kMax < kMin
export function expi(theta)                                 // → {re: cos θ, im: sin θ}
export function add(a, b)
export function sub(a, b)
export function mul(a, b)
export function div(a, b)                                   // division by 0 → {re: NaN, im: NaN}
export function neg(a)
export function conj(a)
export function inv(a)                                      // inv(0) → {re: NaN, im: NaN}
export function scale(a, k)                                 // a·k for a real k
export function abs(a)
export function abs2(a)
export function exp(a)
export function log(a)                                      // principal: ln|a| + i Arg a; log(0) = {re: -Infinity, im: 0}
export function sqrt(a)                                     // principal; exact on the axes, no trigonometry
export function sin(a)
export function cos(a)
export function pow(a, n)                                   // integer n (any sign) by repeated squaring, the same value as de Moivre r^n e^{inθ} (exact for Gaussian integers); non-integer n goes to powc; pow(0, 0) = 1, pow(0, -1) = {NaN, NaN}
export function powc(a, w)                                  // principal complex power exp(w · log a); powc(0, w) is 1 for w = 0, 0 for Re w > 0, else {NaN, NaN}
export function rootsOf(c, n)                               // k = 0..n-1: |c|^{1/n} e^{i(Arg c + 2πk)/n}, in k order; rootsOf(0, n) = n zeros
export function rootsOfUnity(n)                             // rootsOf(1, n)
export function principalRoot(c, n)                         // |c|^{1/n} e^{i Arg(c)/n}, = rootsOf(c, n)[0]
export function branchArg(z, seam = -Math.PI)               // the unique θ = Arg z + 2πk in (seam, seam + 2π]
export function branchRoot(c, n, seam = -Math.PI)           // |c|^{1/n} e^{i branchArg(c, seam)/n}; the principal branch is seam = -π
export function isPrimitiveRoot(k, n)                       // gcd(k mod n, n) === 1 (the k-th n-th root of unity is primitive); false for non-integers
export function quadraticRoots(a, b, c)                     // → [(-b + s)/2a, (-b - s)/2a], s = sqrt(b² - 4ac) principal; a = 0 → two {NaN, NaN}
export function eq(a, b, eps = 1e-9)                        // |a - b| <= eps; false if any part is NaN
export function isFiniteC(a)

// numeric calculus (central differences; used by limits, derivative, cauchy-riemann). f takes {re, im}; its result may be a bare real.
export function numericPartials(f, z0, h = 1e-5)            // → { fx: {re, im}, fy: {re, im} }; fy = ∂f/∂y, so fy = i·f' for analytic f
export function jacobian(f, z0, h = 1e-5)                   // → { ux, uy, vx, vy }, u = Re f, v = Im f
export function localLinear(f, z0, h = 1e-5)                // → { A: {re, im}, B: {re, im} }, f(z0 + dz) ≈ f(z0) + A dz + B conj(dz); A = ½(fx − i fy), B = ½(fx + i fy)
export function directionalQuotients(f, z0, rho = 1e-3, m = 72)   // → [{ phi, q: {re, im} }], q = (f(z0 + ρe^{iφ}) − f(z0)) / (ρe^{iφ}), phi = 2πj/m: the circle A + B e^{-2iφ}

// plain-text formatting (ASCII)
export function fmtNum(x, digits = 3)                       // trims trailing zeros; "-0" → "0"; ASCII minus; digits is clamped to 0..12; |x| >= 1e15 prints as "1.5e+20"
export function fmtCart(z, digits = 3)                      // "3 - 2i", "i", "-i", "2 + 0.5i", "0"; decimals, never fractions
export function fmtPolar(z, digits = 3)                     // "2 e^(i 2.094)", "3.606 e^(-i 0.588)", "e^(i 1.571)", "2", "0": r then the angle in radians; a coefficient of 1 and an angle of 0 are dropped
export function exactAngle(theta)                           // → { p, q } in lowest terms when theta = pπ/q with q in 1..12 or q = 18 (the 10-degree steps), |p| <= 120, within 1e-9; else null
export function fmtAngle(theta, { digits = 3, pi = true, unicode = false } = {})   // "2pi/3", "-pi/3", "pi", "0" when exactAngle exists (unicode: true writes π), else decimal; pi: false forces the decimal

// TeX formatting
export function texNumber(x, digits = 3)                    // first match of: integer; \frac{p}{q} (q <= 24); \frac{p\sqrt{2}}{q} or \frac{p\sqrt{3}}{q} (q <= 4); \frac{p\pi}{q} (q <= 12 or q = 18); else the fmtNum decimal. Exact forms are tried only for |x| <= 1e6, at relative tolerance 1e-10
export function texAngle(theta, digits = 3)                 // "\frac{2\pi}{3}", "-\frac{\pi}{3}", "0", or the decimal "1.234"
export function texCart(z, digits = 3)                      // "3 - 2i", "\sqrt{2} + \sqrt{2}\,i", "-\frac{11}{17} - \frac{10}{17}i"
export function texPolar(z, digits = 3)                     // "2\,e^{i\frac{2\pi}{3}}", "e^{-i\frac{\pi}{4}}", "3.606\,e^{-i\,0.588}"
```

Behaviour that stations rely on:

- **Argument types.** Every complex parameter accepts `{re, im}` or a bare real. Angles and `r` are plain numbers.
- **Non-finite values.** Plain-text formatters print the words `undefined` (any NaN) and `inf` / `-inf`; TeX
  formatters print `\text{undefined}`, `\infty` and `-\infty`. Readouts never show `NaN`.
- **Errors.** Undefined arithmetic returns NaN parts and never throws. A wrong programmer argument throws a
  `RangeError`: `rootsOf` / `principalRoot` with `n` not a positive integer; `numericPartials`, `jacobian`,
  `localLinear` with `h` not a positive finite number; `directionalQuotients` with a bad `rho` or `m`; `argSet`
  asked for more than 10000 steps.
- **Range of validity.** Division and inversion are correct for `1e-150 < |z| < 1e150`; outside that range
  `div` and `inv` may return NaN parts (squared moduli under- or overflow) and `wrapArg` of an astronomically
  large angle (about 1e300) may fall outside `(-π, π]`. Nothing on the site reaches those magnitudes.
- **Fractions versus decimals.** `texCart(0.3 - 0.7i)` is `\frac{3}{10} - \frac{7}{10}i` while `fmtCart` of the same
  point is `0.3 - 0.7i`. Do not show both forms of one quantity in one view; choose per quantity (section 10.4).
  `texNumber` does not know `\sqrt{29}` or `\sqrt{221}`: write those radicals yourself beside the decimal.

Facts the unit tests pin (from `docs/STORY.md` section 8): `mul(3−2i, −1+4i) = 5+14i`;
`div(3−2i, −1+4i) = −11/17 − (10/17)i`; `pow(√3+i, 10) = 512 − 512√3 i` and its Arg is `−π/3`;
`rootsOf(−16, 4)` = `2e^{iπ/4}, 2e^{i3π/4}, 2e^{i5π/4}, 2e^{i7π/4}` = `√2(±1 ± i)` with each root
to the 4th power equal to −16; `rootsOfUnity(5)` each satisfy `z⁵ = 1` and `isPrimitiveRoot(k, 5)`
is false only for k = 0; `principalRoot(2i, 2) = 1 + i`; `branchRoot(−1, 3, 0) = e^{iπ/3} = ½ + (√3/2)i`;
`branchRoot(−1, 3, −π) = e^{iπ/3}` too (Arg(−1) = π is the top of the window) while
`branchRoot({re:-1, im:-1e-12}, 3, -π)` is near `e^{-iπ/3}` (the jump); `quadraticRoots(1, −4, 13) = 2 ± 3i`;
`localLinear(|z|², 1+i) = {A: 1−i, B: 1+i}`, `localLinear(Re z, any) = {A: ½, B: ½}`,
`localLinear(z²+z, 1+i) = {A: 3+2i, B: 0}` (|B| < 1e-6), `localLinear(conj z, any) = {A: 0, B: 1}`
(all to about 1e-9; finite differences). `texNumber(1/25) = 0.04`, `texNumber(1/24) = \frac{1}{24}`,
`texNumber(1.4142) = 1.414`; `Arg(pow(-i, 2)) === π` exactly.

### 3.2 `js/core/parse.js` (pure; imports `./complex.js`)

```js
export class ParseError extends Error                       // constructor(message, position, length = 1): .position is the index of the offending character, .length its size in UTF-16 units (>= 1; an emoji is 2)
export function parse(src)                                  // → AST; throws ParseError with a sentence a student can read
export function toTex(src)                                  // pretty TeX of the parsed expression (fractions for a/b, ^ as superscripts, \overline{z} for conj; an operand that starts with a minus after an operator is bracketed); throws ParseError
export function compile(src)                                // → { f: (z) => {re, im}, src, tex: string, uses: Set<'z'|'x'|'y'> }; throws ParseError
export function evaluate(src, z)                            // compile(src).f(z)
```

AST nodes are plain objects: `{ type: 'num', value }`, `{ type: 'const', name: 'i' | 'e' | 'pi' }`,
`{ type: 'var', name: 'z' | 'x' | 'y' }`, `{ type: 'neg', arg }`, `{ type: 'call', name, arg }` and
`{ type: 'bin', op: '+' | '-' | '*' | '/' | '^', left, right }` (`implicit: true` is added on a product written by
juxtaposition, `2z`).

`compile(src).f` takes `{re, im}` or a bare real and returns a **fresh** `{re, im}` each call. `compile` keeps a
64-entry cache: the same `src` returns the same object, so do not mutate its `uses` set.

Grammar (deliberately small for iteration 1): numbers (`2`, `0.5`, `.5`); constants `i`, `pi`, `e`;
variables `z`, `x` (= Re z), `y` (= Im z); binary `+ - * / ^` (`^` right-associative, binds tighter than unary
minus: `-z^2 = -(z^2)`; the exponent may be signed, `z^-1`); unary `-` and `+`; parentheses; **implicit
multiplication** (`2z`, `iz`, `(1+i)z`, `z(z+1)`, `2i`), but a number is never the right factor of one (`z2` is an
error, write `2z`); functions with parentheses `conj Re Im abs arg Arg exp log sqrt sin cos` (`arg` and `Arg`
both mean the principal value; `log`, `sqrt` are principal). `z^n` with a constant real integer `n` uses `pow`
(so `z^2` at `i` is exactly `-1`); other exponents use `powc`. Whitespace is ignored; names are case-sensitive;
unknown identifiers throw. Accepted alternate spellings: U+2212, en and em dash as minus, `×` `·` as times, `÷`,
`π`, `**` as `^`, and `²` `³` after a base. Limits: 400 characters, nesting depth 80.

Required to compile and evaluate correctly (pinned by tests): `z^2`, `z^3`, `1/z`, `i*z - 2*i`,
`iz - 2i`, `(1+i)z`, `z^2 + iz`, `exp(z)`, `conj(z)`, `Re(z)`, `abs(z)^2`, `z^2/abs(z)^2`,
`sqrt(z)`, `z^(1/3)`, `(x^2 - y^2 + 2ixy)/(x^2 + y^2)`, `(Re(1+z) - 1)/z`. Examples:
`evaluate('z^2 + iz', 1+i) = -1 + 3i`; `evaluate('(1+i)z', i) = -1 + i`; `evaluate('sqrt(z)', 2i) = 1 + i`;
`evaluate('1/z', 2) = 0.5`; `evaluate('z^(1/3)', -1) = ½ + (√3/2)i` (principal).

Errors: `err.message` is a full sentence for the student (for example `Something is missing between "+" and this
")". Put a number or a variable there.`, `Bars are not supported. Use abs(z) for the modulus, like abs(z - 1).`);
show it verbatim. Underline with `err.position` and `err.length`, never assume a length of 1. `toTex` writes a
thin space between `\pi` and a following letter (`pi z` → `\pi\,z`), `z^2` as `z^{2}`, and an operand that starts with a
minus after an operator in brackets (`--z` → `-\left(-z\right)`, `z - -z` → `z - \left(-z\right)`, `z + -3x` →
`z + \left(-3x\right)`), so two signs never touch; match on parsed values, not on `toTex` strings.

### 3.3 `js/data/problems.js` (pure data)

```js
export const PROBLEMS = [ Problem, ... ]   // all 29, in handout order; deep-frozen
// Problem:
{ id: '1.4.2', chapter: 1, section: 'Powers and Roots', kind: 'problem' | 'proof',
  statement: string,          // the handout text, verbatim, TeX with $...$ around the maths (use statementParts)
  station: 'roots',           // the station that owns it (equals registry stationForProblem(id).id)
  alsoAt: ['staircase'],      // other stations that list it ([] for most)
  address: 'C' | 'P' | 'C->P' | 'P->C' | 'C->P->C' | 'both',     // ASCII arrows
  addressWhy: string,         // one sentence: why that address is native
  aha: string,                // the one-sentence aha from docs/STORY.md section 3
  thread: 'T1' | 'T2' | 'T3',
  topics: ['T1.4'],
  routes: { cart: string, polar: string },   // the working in each address, plain prose (render it as section 10.4 says)
  answer: { tex: string, text: string, values: object }   // tex: display TeX; text: printable ASCII; values: exact numbers the unit tests assert (below)
}
export const TOPICS = [ Topic, ... ]       // all 12; deep-frozen
// Topic: { id: 'T1.4', chapter: 1, title, thread: 'T2', summary, covers: string[], stations: ['powers', 'roots'] }
export const ADDRESS_CODES = ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both']
export function problemById(id)                             // → Problem | null
export function topicById(id)                               // → Topic | null
export function problemsForStation(stationId)               // → Problem[] in handout order: the ones it owns plus its alsoAt; 'problems' gets all 29; a fresh array
export function topicsForStation(stationId)                 // → Topic[]; 'problems' gets all 12
export function problemsForTopic(topicId)                   // → Problem[]
export function routeFor(problemId)                         // → 'problem-1-4-2' | 'problem-P3' (dots → dashes); null for an unknown id
export function idFromRoute(token)                          // → '1.4.2' | 'P3'; null if the token is not a problem route or the id is unknown
export function topicRoute(topicId)                         // → 'topic-T1-4' | null
export function topicFromRoute(token)                       // → 'T1.4' | null
export function statementParts(statement)                   // → [{ math: boolean, text }] alternating prose and maths; 'Find $x$.' → prose, math, prose; [] for a non-string
export function addressLabel(code, opts)                    // → 'Cartesian' | 'Polar' | 'Cartesian, then polar' | ... ; opts is { short: true } (→ 'C', 'P', 'C→P', 'C or P') or nothing: null and any non-object read as no options; '' for an unknown code
export function addressTones(code)                          // → CSS custom-property names in chip order, e.g. ['--cart', '--polar']; [] for an unknown code
```

The seven proofs (P1 to P7) have `chapter: 0` and `kind: 'proof'`; their syllabus chapter is in `topics`. `statement`,
`answer.tex` and `answer.text` are TeX or ASCII; every other string is prose that may carry Unicode symbols and
the exponent notation `e^{iθ}`, `r^(1/3)` (render it with `prose()` from `katex.js`, section 3.6).

`answer.values` per problem (unit tests assert these to 1e-9 unless noted; extra keys beyond the table are
allowed and listed):

| id | values |
|---|---|
| 1.1.1 | `product: {re: 5, im: 14}`, `quotient: {re: -11/17, im: -10/17}`, `productAbs: sqrt(221)` |
| 1.1.2 | `im: 6`, `difference: {re: 4, im: -6}` |
| 1.2.1 | `center: {re: 1, im: 2}`, `radius: 3` |
| 1.2.2 | `distance: sqrt(29)`, `difference: {re: 5, im: 2}` |
| 1.3.1 | `r: 2`, `theta: 2π/3`, `Arg: 2π/3`, `z: {re: -1, im: sqrt(3)}` |
| 1.3.2 | `result: {re: 512, im: -512*sqrt(3)}` (1e-6), `r: 1024`, `Arg: -π/3`, `base: {re: sqrt(3), im: 1}`, `n: 10`, `rawAngle: 5π/3` (10·π/6, before wrapping) |
| 1.4.1 | `n: 5`, `roots: [e^{2πik/5}]` k = 0..4 (re, im to 1e-9), `primitive: [false, true, true, true, true]`, `principalArgs: [0, 2π/5, 4π/5, -4π/5, -2π/5]` |
| 1.4.2 | `radius: 2`, `angles: [π/4, 3π/4, 5π/4, 7π/4]`, `principalArgs: [π/4, 3π/4, -3π/4, -π/4]`, `roots: [{√2, √2}, {-√2, √2}, {-√2, -√2}, {√2, -√2}]` |
| 1.4.3 | `roots: [{re: 2, im: 3}, {re: 2, im: -3}]`, `completed: { shift: 2, square: -9 }` |
| 1.5.1 | `start: {re: 2, im: 1}`, `end: {re: -3, im: -3}`, `direction: {re: -5, im: -4}`, `at: { t: 0.5, z: {re: -0.5, im: -1} }` |
| 1.5.2 | `center: {re: 0, im: -1}`, `inner: 1`, `outer: 3`, `innerIncluded: false`, `outerIncluded: true`, `open: false`, `closed: false`, `bounded: true`, `connected: true`, `domain: false`, `region: true` |
| 2.1.1 | `check: { z: {re: 1, im: 1}, w: {re: -1, im: 3}, u: -1, v: 3 }` |
| 2.1.2 | `parabola: { vertex: 4, coeff: -1/16, focus: 0 }`, `sample: { y: 1, z: {re: 2, im: 1}, w: {re: 3, im: 4} }` |
| 2.1.3 | `imageLine: 'v = 0'`, `rotation: π/2`, `shift: {re: 0, im: -2}`, `sample: { z: {re: 2, im: 3}, w: {re: -3, im: 0} }` |
| 2.2.1 | `sector: { from: 0, to: 3π/4 }`, `n: 3` |
| 2.2.2 | `root: {re: 1, im: 1}`, `r: sqrt(2)`, `Arg: π/4`, `other: {re: -1, im: -1}` |
| 2.3.1 | `alongParabola: 1`, `alongRealAxis: {re: 1, im: 0}`, `alongImagAxis: {re: -1, im: 0}`, `exists: false` (along the line of slope m the value is e^{2i·atan m}) |
| 2.4.1 | `seam: 0`, `window: [0, 2π]`, `atMinusOne: {re: 0.5, im: sqrt(3)/2}`, `principalJumps: true` |
| 2.5.1 | `imageLine: 'Re w = 1/2'`, `re: 0.5`, `sample: { z: {re: 1, im: 1}, w: {re: 0.5, im: -0.5} }` |
| 3.1.1 | `derivativeAt: { z: {re: 1, im: 1}, fprime: {re: 3, im: 2} }`, `A: '2z + 1'`, `Babs: 0` |
| 3.1.2 | `differentiableAt: {re: 0, im: 0}`, `fprime0: {re: 0, im: 0}`, `circleRadiusAt: { z: {re: 1, im: 1}, radius: sqrt(2), center: {re: 1, im: -1} }` |
| 3.2.1 | `entire: true`, `fprimeAt0: {re: 1, im: 0}`, `check: { z: {re: 0, im: π/2}, w: {re: 0, im: 1} }` |
| P1 | `check: { z1: {3, -2}, z2: {-1, 4}, both: {re: 5, im: -14} }` |
| P2 | `check: { z: {3, -2}, zzbar: 13, abs: sqrt(13) }` |
| P3 | `check: { a: {0, 1}, b: {0, -2}, c: {1, 1}, d: {1, 0}, coeff: {re: -1, im: 1}, shift: {re: 0, im: -1} }` (a(cz + d) + b with a = i, b = −2i, c = 1+i, d = 1) |
| P4 | `radius: sqrt(2)`, `factor: {re: 1, im: 1}`, `factorAbs: sqrt(2)`, `factorArg: π/4` |
| P5 | `alongRealAxis: {re: 1, im: 0}`, `alongImagAxis: {re: 0, im: 0}`, `exists: false`, `directional: { A: {re: 0.5, im: 0}, B: {re: 0.5, im: 0} }` |
| P6 | `A: {re: 0.5, im: 0}`, `B: {re: 0.5, im: 0}`, `differentiable: false` |
| P7 | `fprime: {re: 0, im: 0}`, `constant: true` |

### 3.4 `js/data/functions.js` (pure data)

```js
export const FUNCTIONS = [ Fn, ... ]       // 15 entries, deep-frozen
// Fn:
{ id: 'sq', label: 'z²', tex: 'z^2', src: 'z^2',       // src is parse.js grammar; stations do compile(fn.src); label is the short chip text
  problems: ['2.1.2'],                                 // the review problems it is the subject of
  stations: ['mappings', 'powermap', 'lab', 'graph4d'],   // every station that offers it (registry order); the Lab offers all
  analytic: true, poles: [] | [{re, im}], note: 'Squares the length and doubles the angle.',
  cart: { u: 'x^2 - y^2', v: '2xy' }, polar: { u: 'r^2\\cos 2\\theta', v: 'r^2\\sin 2\\theta' },   // TeX of u and v in (x, y) and (r, θ = Arg z), or null
  derivativeTex: '2z' | null }
export function fnById(id)                                  // → Fn | null
```

Ids and sources: `sq` `z^2`; `cube` `z^3`; `recip` `1/z` (pole 0); `linear-i` `iz - 2i`; `linear-1i` `(1+i)z`;
`sq-plus-iz` `z^2 + iz`; `sq-plus-z` `z^2 + z`; `exp` `exp(z)`; `conj` `conj(z)`; `re` `Re(z)`; `abs2` `abs(z)^2`;
`dir` `z^2/abs(z)^2` (pole 0); `sqrt` `sqrt(z)`; `cbrt` `z^(1/3)`; `x-over-z` `(Re(1+z) - 1)/z` (pole 0).
`analytic` is false for `conj`, `re`, `abs2`, `dir`, `x-over-z`; true for the rest (`sqrt` and `cbrt` are analytic off the
seam, `recip` off its pole). `poles` lists the points where f is undefined: for `dir` and `x-over-z` it is a point with no limit.
`cart` is `null` for `sqrt` and `cbrt` (no short closed form in x, y); `derivativeTex` is `null` for every non-analytic function.
`note` and `label` are prose and follow the same rendering rule as problems prose (section 10.4).

### 3.5 `js/core/plane.js`

```js
export function createPlane(container, options)             // → Plane; appends div.plane to container; TypeError if container is not an Element or options.id is missing or malformed, RangeError for a bad range
// options:
{ id: string (required; /^[A-Za-z][A-Za-z0-9_-]*$/; prefix for handle ids and the data-plane-id attribute),
  xRange: [-4, 4], yRange: [-4, 4],      // initial view; min < max. The box's aspect ratio is xSpan / ySpan, so 1 unit is square
  grid: 'cart' | 'polar' | 'both' | 'none' = 'cart',
  axes: true, axisLabels: ['Re', 'Im'] | ['x', 'y'] | ['u', 'v'],
  interactive: true,                      // wheel zoom, drag-pan on empty space (two-finger pan and pinch on touch), keyboard, zoom buttons
  minUnitsAcross: 0.5, maxUnitsAcross: 200,
  background: '--surface',                // a token ('--surface'), any CSS colour, or 'transparent' (see below)
  aspect: xSpan / ySpan,                  // width / height of the box (CSS aspect-ratio)
  maxWidth: 640,                          // px number or CSS length string
  controls: true,                         // the + / - / Reset buttons (interactive planes only)
  legend: true,                           // the "start ... end" time-ramp pill when a ramped curve is drawn
  tickLabels: true,
  wheel: 'focus' | 'always' | 'ctrl' | 'off' = 'focus',   // 'focus': wheel zooms only when the plane has focus or Ctrl/Cmd is held, otherwise the page scrolls; 'always' is for the Lab
  ariaLabel: 'Complex plane' }
// Plane:
{ id, el: HTMLDivElement (.plane, id `${id}-viewport`; has data-plane-id, data-center-re, data-center-im, data-scale, data-units-across, updated on every view change),
  canvas: HTMLCanvasElement (id `${id}-canvas`),
  toPixel({re, im}) → { x, y }            // CSS pixels relative to the canvas
  fromPixel(x, y | {x, y}) → { re, im }
  getView() → { center: {re, im}, unitsAcross: number /* units across the WIDTH */, scale: number /* px per unit */ }
  getSize() → { w, h }                    // canvas CSS size; a nominal 400 × 400/aspect until the first measurement
  setView({ center?, unitsAcross? })      // partial; clamps; ignored if non-finite; no-op if unchanged
  fitTo(points: {re, im}[], padding = 0.15)   // also becomes the "home" view that Reset returns to
  resetView(); setHome()                  // back to / mark the home view
  setGrid('cart' | 'polar' | 'both' | 'none')
  addPoint(spec) → Handle; getHandle(id) → Handle | null; handles() → Handle[]
  //   spec: { id, z, draggable = true, color = '--input' (token or css colour), label = '', radius = 7,
  //           step = 0.1 /* arrow-key nudge; Shift ×10, Alt ÷10 */, snap = null | ((z) => z),
  //           onDrag(z, { final: boolean, source: 'pointer' | 'keyboard' | 'api' }), onFocus(), onDragStart(z),
  //           name = label /* used in the aria-label */, focusable = true }
  //   Handle: { id, z /* getter: a copy */, el: HTMLButtonElement (class plane-handle, id `${plane.id}-${id}`, data-re, data-im, aria-label), hidden /* get/set */,
  //             set(z, { silent = false }) /* exact, no snapping; calls onDrag with source 'api' unless silent; hides the handle for a non-finite z */, remove() }
  //   The button is absolutely positioned over the canvas, keyboard focusable, and announces both addresses in its aria-label ("z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)").
  addLayer(draw: (ctx2d, plane) => void, { order = 0 }) → Layer { order /* get/set */, hidden /* get/set */, remove() }
  //   layers draw after grid and axes, in ascending order (ties: creation order); a layer that throws is disabled and a note is shown
  addCurve(spec) → CurveLayer
  //   spec: { id, points: {re, im, t}[], color = '--input', ramp = true, width = 2, dots = true, arrow = true, closed = false, dash = null,
  //           alpha = 1, cursor = null /* t in [0, 1]: a ring at that time */, order = 100 }
  //   Unknown properties are ignored: a Curve from shapes.js or a piece from mapping.js (extra kind, family, source, label, reversed) can be passed as it is.
  //   CurveLayer: { id, points /* getter */, update(points), setColor(c), setCursor(t | null), set(patch), remove(), order, hidden }
  on('pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', (e: { type, z, px, py, pointerType, pointerId, isPrimary, dragging, originalEvent }) => void) → unsubscribe
  //   fired for pointer events on EMPTY canvas (not on handles); stations build drawing tools with these. pointermove also fires for hover when a listener exists.
  on('viewchange', (v: { center, unitsAcross, scale, reason }) => void) → unsubscribe     // reason: 'pan' | 'zoom' | 'set' | 'fit' | 'reset' | 'resize'; not emitted when nothing changed
  setDrawMode(on: boolean); isDrawMode() → boolean   // when on, pan-by-drag is disabled so pointer events draw
  requestDraw()                           // marks dirty; one rAF redraw coalesces many requests
  resize()                                // also called by a ResizeObserver and on window resize; devicePixelRatio aware
  destroy()                               // removes listeners, observer, handles, the element, and unregisters from window.__mv.planes; later calls are safe no-ops
  getStats() → { draws, lastDrawMs, resizes, layers, handles, destroyed } }      // for tests
// pure helpers (import-safe in Node)
export function makeTransform({ center, unitsAcross }, w, h)   // → { toPixel(z), fromPixel(x, y | {x, y}), scale }; scale = w / unitsAcross
export function niceGridStep(unitsAcross)                   // 1-2-5 step with 5.6 <= unitsAcross / step <= 14
export function mixColor(a, b, t)                           // → "rgb(r, g, b)" (rgba only if an input has alpha < 1); a and b are hex, rgb() or hsl() strings
export function cssColor(x)                                 // '--cart' → computed value; other strings returned as is (in Node a token comes back unchanged)
export function rampColor(baseColor, t, weight = RAMP_WEIGHT /* 0.65 */)   // base mixed toward var(--t0) at t = 0 and var(--t1) at t = 1; monotone lightness
export const DASH                                           // frozen dash patterns { cart, excluded, seam, guide }
export const internals                                      // test-only bag of private helpers; stations must not use it
// drawing helpers: ctx is the 2d context passed to a layer, in CSS pixels. Each leaves the context state as it found it and
// talks to the plane only through toPixel, getSize and getView.
export function drawCartAddress(ctx, plane, z, { color = '--cart', labels = true } = {})
//    dashed drop lines to both axes and the labels "x = ..." and "y = ..."
export function drawPolarAddress(ctx, plane, z, { color = '--polar', labels = true, ghosts = 0, ghostsNeg = 0, arcRadiusPx = 28, name = 'z' } = {})
//    ray from 0 to z labelled r, solid arc from the positive real axis to the ray with the label "Arg <name> = ..."; ghosts = k draws k fainter extra
//    windings (θ + 2π, θ + 4π, ...) labelled "also ..." so arg z reads as a set, ghostsNeg the windings below (θ − 2π, ...); at most 6 each
export function drawSeam(ctx, plane, angle = Math.PI, { color = '--seam', width = 2, dash = DASH.seam, label = 'seam' } = {})   // dashed ray from 0; label: false to omit
export function drawCircle(ctx, plane, center, radius, { color = '--polar', dash = null, fill = null, fillAlpha = 0.12, width = 2, alpha = 1, innerRadius = null } = {})
//    radius in units; innerRadius with fill draws an annulus fill (even-odd); the outline is the OUTER circle only
export function drawRay(ctx, plane, angle, { color = '--polar', dash = null, width = 1.5, from = { re: 0, im: 0 } } = {})
export function drawSegment(ctx, plane, a, b, { color = '--text', dash = null, arrow = false, width = 2 } = {})
export function drawArc(ctx, plane, center, radius, from, to, { color = '--polar', arrow = false, width = 2 } = {})   // radius in units; angles radians, counterclockwise
export function drawTimedCurve(ctx, plane, points, { color = '--input', width = 2, dots = true, arrow = true, closed = false, ramp = true, dash = null, alpha = 1, cursor = null } = {})
//    32 time bins from the base colour mixed toward --t0 (start) and --t1 (end); dots at t = 0, 1/4, 1/2, 3/4, an arrowhead at t = 1, an optional cursor ring
export function drawDot(ctx, plane, z, { color = '--text', radius = 5, label, labelOffset = { dx: 8, dy: -8 }, halo = true } = {})
export function drawLabel(ctx, plane, z, text, { color = '--text', dx = 8, dy = -8, font, align = 'left', clamp = true } = {})   // clamp keeps the text inside the canvas
export function drawPolygonFill(ctx, plane, points, { color = '--input', alpha = 0.12 } = {})
```

Behaviour: the redraw order is the background (CSS: `--plane-bg`, default `--surface`), grid, axes, layers (ascending
`order`), curves (default order 100), the address labels, the ramp legend, and then the DOM handles above.
**The canvas is only ever cleared, never filled**, so `background: 'transparent'` leaves the plane see-through: a
domain-colouring canvas can sit under it and the grid, axes, curves and handles draw over it. Grids use `--cart` (lines)
and `--polar` (circles at r = 1, 2, 3, ... and rays every 30°) at low alpha. Colours are read with
`getComputedStyle(document.documentElement)` at draw time and cached per frame; the cache is dropped on `themechange`
(and on `data-theme` / `class` / `style` changes of `<html>` and on `prefers-color-scheme` changes).

The address labels of `drawCartAddress`, `drawPolarAddress` and `drawSeam` are queued and placed at the end of the
frame, so they avoid each other, the dot, the handles' DOM labels, the zoom buttons and the tick labels whatever order
a station calls the helpers in; each label takes the first free spot, so a label may sit some distance from its line on
a very flat plane. Handles stay whole: a drag is clamped to a 10 px inset, and a handle parked under the zoom buttons is
raised above them.

Keyboard: a focused handle moves with the arrow keys; the plane itself (tabindex 0, interactive planes) zooms with `+`/`-`,
resets with `0`, and pans with the arrows when focused. Reduced motion changes nothing here (no autonomous animation).

`window.__mv`: `createPlane` runs `window.__mv = window.__mv || {}` and `window.__mv.planes = window.__mv.planes || new Map()`,
then registers the plane under its `id` so interaction scripts can call `toPixel` (see `tests/interact/_helpers.mjs`).
The initialisation is idempotent and independent of load order (`app.js` and `three-view.js` do the same for their own
properties). `destroy()` removes the entry only if it still maps to this plane, so creating a new plane with the same id
before the old one is destroyed is safe.

### 3.6 `js/core/katex.js`

```js
export function tex(el, src, { display = false, mathml = true } = {})   // renders into el (replaces children); on KaTeX error or missing KaTeX sets el.textContent = src and adds class tex-error (and a title with the message); never throws
export function texToHtml(src, { display = false, mathml = true } = {})  // → string; the KaTeX markup, or escaped text (a span.tex-error on a TeX error); '' for an empty src
export function tint(src, token)                            // → `\textcolor{<hex>}{src}` with the computed colour of the token (e.g. '--cart'); currentColor when it cannot be resolved
export function cart(src)                                   // tint(src, '--cart')
export function polar(src)                                  // tint(src, '--polar')
export function input(src)                                  // tint(src, '--input')
export function output(src)                                 // tint(src, '--output')
export function texColor(tokenOrColor)                      // → '#rrggbb' | '#rgb' | a colour name | 'currentColor': what KaTeX's \textcolor accepts
export function escapeHtml(s)
export function clearTexCache()                             // empties the render and colour caches (tests, theme experiments)
export function proseParts(text)                            // → [{ sup: boolean, text }]: plain prose with exponent notation split into plain runs and superscript runs
export function proseToHtml(text)                           // → HTML string: everything escaped, each superscript run in <sup class="prose-sup">
export function prose(el, text)                             // renders proseToHtml(text) into el (replaces children); never throws; safe for untrusted text
```

`mathml: false` renders the HTML half only (the explainer uses it while a drag streams). Shared macros are predefined:
`\Re` and `\Im` are the operator names (KaTeX's built-in ones draw fraktur capitals), `\Arg` is `\operatorname{Arg}`, `\cj{z}` is
`\overline{z}`. Strings are cached (300 entries).

Because the tint bakes a hex colour into the string, anything that uses `cart()`, `polar()`, `input()`, `output()` must
call them at render time and re-render on `themechange` (the explainer does both when its row functions call them).
KaTeX 0.16.11 rejects `--token` names, `rgb()` and 8-digit hex inside `\textcolor`, which is why tokens are resolved to hex.

**Prose with exponents.** Prose strings in `problems.js` and `functions.js` write exponents as `e^{iθ}`, `e^{i(θ + π/2)}`,
`r^(1/3)`, `e^x`, `2^1`. Set with `textContent` they show literal braces and carets. `prose(el, text)` turns each
superscript run into `<sup>`: `X^{...}` (the braces may nest) and `X^(...)` use the inside as the exponent (the
brackets are dropped), and `X^n`, `X^-3`, `X^θ` take one signed number or one letter. A `^` with no base (a non-space character) before it, no
closing bracket or no exponent after it stays literal; subscripts such as `u_x` are left as typed. Everything else is
escaped, so the output is safe for `innerHTML`. Use it for `aha`, `addressWhy`, `routes.cart`, `routes.polar`, topic
`summary` and `covers`, and function `note` and `label`; do not rewrite the strings (tests pin their wording).

### 3.7 `js/core/explainer.js`

```js
export function createExplainer(container, spec)            // → Explainer; TypeError without a container or spec.id
// spec:
{ id: string (required; sanitised to [A-Za-z0-9_-]; element ids are `${id}-${row.id}-${col.key}`),
  title?: string,                                           // a <caption>
  columns: [ { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart' },
             { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar' },
             /* optional third, e.g. { key: 'motion', heading: 'As a motion', tone: '--output' } */ ],   // omitted or empty: the Cartesian and polar pair above; at most 3; optional per column: tint: true (cells coloured by tone), short: 'Cartesian' (the badge word)
  rows: [ { id: 'product', label: 'z₁z₂', cart: (s) => cell, polar: (s) => cell, /*, motion: (s) => cell */ native: 'polar' | (s) => 'polar' | null }, ... ],
  same?: (s) => ({ cart: cell, polar: cell, agree: boolean }),   // the footer "same point" row
  sameLabel?: string | ((s) => string) }                    // the footer words before the verdict, default 'same point' ('same distance', 'same radius', 'room around p'); a trailing colon is dropped; a blank, a non-string or a throwing function falls back to the default
// cell = a TeX string | { text: 'plain prose' } | null (an empty cell, shown as an em dash). A bare string is TeX; prose goes in { text } or \text{...}.
// Explainer:
{ el /* the container you passed */, update(state), flush(), setRows(rows), destroy(), stats }
export function sanitizeId(s)                               // every character outside [A-Za-z0-9_-] becomes '-'
export function shortHeading(heading)                       // 'Cartesian (slide)' → 'Cartesian'
```

Rendering: `<div class="explainer-wrap" data-explainer="<id>">` holding a `<table class="explainer" id="<id>-table">` (or a
`<caption>` title), column headings tinted by their `tone`, each cell rendered by `katex.js` and carrying `data-tex` with
the TeX it shows. A row with `native` gets an "easy in Polar" badge and its native column is tinted: that is the on-screen
form of "say which address makes it easy". The footer row has id `${id}-same` (`data-agree="true" | "false"`), its label
reads `same point: ` (or `spec.sameLabel` and a colon) followed by `agree`, `differ` or `not checked`, and its cells are `${id}-same-${col.key}`.
A cell function that throws shows `n/a` with the message in `title` and is logged once.
`update(state)` renders **synchronously the first time** (the table is never seen empty); later calls are coalesced to one
render per animation frame (adaptive: a slow render widens the gap, never beyond 100 ms). While updates stream in (less
than 200 ms apart) cells render without MathML; 220 ms after the last update one refine pass re-renders with MathML, so a
test that reads `textContent` right after an update should read `data-tex` or wait for the refine. Cells whose TeX did not
change are not rewritten. `flush()` renders now at full quality. The table stacks (Cartesian above polar) at 560 px and
below, decided by a media query and by the widget's own inner width (`data-narrow`, set one animation frame after a resize so the
ResizeObserver callback never changes the size it observes). The explainer re-renders on `themechange`.

### 3.8 `js/core/staircase.js`

```js
export function createStaircase(container, options = {})    // → Staircase; TypeError without a container or options.id
// options: { id (required), kMin = -2, kMax = 2, seam = -Math.PI, label = 'arg z', onPick = null,
//            homeLabel = null, showK = false, compact = false }     // at most 25 rows, cut around k = 0
//   homeLabel: what the home row, the Arg line and the seam note call the home step; default homeLabelFor(label) ('Arg z'); a station whose window is not
//              the principal one passes 'chosen θ' so the set line keeps saying 'arg z = { ... }' (blank or null: the default)
//   showK: true prints 'k = n' at the start of every row; compact: true for a narrow host (smaller type, tighter rows, no decimal column)
// Staircase: { el /* the container */, update(theta | null), setSeam(seam), setLabel(label), setHomeLabel(name | null), setPicked(k | null), destroy() }
export function argSteps(theta, kMin = -2, kMax = 2)        // → [{ k, theta: theta + 2πk }]; [] when theta is not finite
export function homeStep(theta, seam = -Math.PI)            // → { k, theta }: the representative in (seam, seam + 2π]; k turns were added to theta; within 1e-9 of the seam (13 * Math.PI) is the top step, exactly seam + 2π
export function exactPi(x, { maxQ = 12, maxP = 240, tol = 1e-9 } = {})   // "2π/3", "-π", "0", "14π/3" when x = pπ/q within tol, else null
export function fmtDec(x, digits = 3)                       // three decimals, trailing zeros trimmed, ASCII minus; 'NaN' when not finite
export function homeLabelFor(label)                         // 'arg z' → 'Arg z'
export function windowText(seam)                            // '(-π, π]'
export function stepText(home, k)                           // → { text, dec, total, full } for one row: "2π/3 + 2π = 8π/3" (or "0.7 + 2π" when the total has no exact form), the decimal, the total, the accessible text
export function argReadout(label, home)                     // 'Arg z = 2.094 (2π/3)'
export function seamJump(prevHome, nextHome)                // +1 crossed the seam counterclockwise, -1 clockwise, 0 no crossing
```

The rows are anchored to the **home step**: row `k` shows `Arg + 2πk`, `k = 0` is always the home step, and
`update(theta)` accepts any representative of the angle (`14π/3`, `-π` and `2π/3` give the same list), so `onPick(k)` means
"k steps above Arg" (root number k in `roots`). `update(null)` shows the undefined state for z = 0 (no home step; with `onPick` the buttons are named `step k = n: no angle at 0`).
Because of this the list **relabels** at the seam, it never slides: the shaded home band always sits behind the `k = 0`
row, and a seam crossing shows a note ("Seam crossed: Arg z dropped by 2π. The set arg z did not move.") and increments
`data-jumps`. The sliding picture belongs to the plane and the helix.

Rendering: `<div class="staircase-wrap" data-stairs="<id>">` with `#${id}-set` (the set arg z = {...}), `#${id}-arg` (the
Arg value as text, e.g. `Arg z = 2.094 (2π/3)`), `#${id}-window`, `<ol class="staircase" id="${id}-list">` with one
`<li data-k="k" id="${id}-k${k}">` per row, highest k first, the `k = 0` row carrying class `is-home` and an `Arg z =` prefix, a
shaded band `staircase-home` over it, and `#${id}-note`. Wrapper attributes: `data-home-k`, `data-arg`, `data-seam`,
`data-window`, `data-jumps`, `data-last-jump`. The ghost steps (`k ≠ 0`) are drawn in `--polar` at reduced alpha, the home
step in full `--polar`. With `onPick` each row is a button (arrow keys, Home and End move between rows); clicking calls
`onPick(k)`; `setPicked(k)` marks a row (`is-picked`, `aria-pressed`) without calling it.

### 3.9 `js/core/shapes.js` (pure)

```js
// Curve = { id?: string, kind: string, points: {re, im, t}[], closed: boolean, family: 'cart' | 'polar' | null, label?: string, reversed?: true, source?: string }
//   t is non-decreasing, 0 at the first point and 1 at the last. A closed curve stores an exact copy of its first point as its last point.
//   Every `n` below counts SEGMENTS (a curve has n + 1 points). Every complex argument may be a bare real; every `options` may be null or missing; none of the builders throws.
//   family says which address the shape is native to: 'cart' for lines, rectangles and the Cartesian grid, 'polar' for circles, rays, sectors, annuli and the polar grid, null for the rest.
export const SHAPE_LIMITS                                   // frozen { maxN: 20000, maxCount: 200, maxPoints: 200000, maxAngle: 1e6 }: the caps of every builder (see below)
export function segment(a, b, options)                      // options { n = 64 }; t linear from a (t = 0) to b (t = 1)
export function circle(center, r, options)                  // options { n = 128, from = 0, to = 2π, orientation = +1 }; r = |r|; closed when |to − from| = 2π (within 1e-9); n >= 8
export function rect(a, b, options)                         // options { nPerSide = 32 }; perimeter of the axis-aligned rectangle with corners a and b, counterclockwise from the min corner, closed
export function polygon(vertices, options)                  // options { closed = true, nPerSide = 32 }; a repeated closing vertex is dropped; fewer than 2 vertices is not closed
export function verticalLine(x, options)                    // options { yRange = [-4, 4], n = 128 }; x = c, t runs upward
export function horizontalLine(y, options)                  // options { xRange = [-4, 4], n = 128 }
export function ray(angle, options)                         // options { rMin = 0, rMax = 4, n = 96 }
export function cartGrid(options)                           // → Curve[]; options { xRange = [-2, 2], yRange = [-2, 2], step = 0.5, n = 96 }; kinds 'cart-x' (ids gx0, gx1, ...) and 'cart-y' (gy0, ...), at most 201 of each
export function polarGrid(options)                          // → Curve[]; options { rMax = 2, rings = 4, rays = 12, n = 96 }; kinds 'polar-ring' (ids gr1, ...) and 'polar-ray' (gk0, ...)
export function sector(options)                             // → Curve[]; options { r0 = 0, r1 = 2, theta0, theta1, fill = true, fillRays = 4, fillArcs = 3, n = 48 }
//    the closed boundary first (kind 'sector-boundary', id 'boundary'), then the sparse interior rays ('sector-ray', ray1...) and arcs ('sector-arc', arc1...);
//    r0 > r1 are swapped; theta0 defaults to 0 and theta1 to theta0 + π/2; a theta1 <= theta0 gets whole turns added; the sweep is capped at 2π
export function annulus(options)                            // → Curve[]; options { center = {re: 0, im: 0}, r0, r1, fill = true, fillRings = 2, fillRays = 8, n = 96 }; inner circle ('annulus-inner', id 'inner'), outer ('annulus-outer', 'outer'), then rings and rays
export function freehand(samples, options)                  // options { minDist = 0.01 }; drops samples closer than minDist to the last kept one, always keeps the final sample; t by cumulative arclength; kind 'freehand'
export function reverse(curve)                              // −C: points reversed, t ↦ 1 − t; toggles `reversed` (reverse(reverse(c)) deep-equals c)
export function resample(curve, n)                          // n + 1 points evenly spaced in t (linear interpolation); a closed curve stays exactly closed
export function pointAt(curve, t)                           // linear interpolation on t, clamped to the ends; {re: NaN, im: NaN} for an empty curve
export function curveLength(curve)                          // polyline length
export function classify(curve)                             // → { closed, simple, smooth, piecewiseSmooth, orientation: 1 | -1 | 0, corners: number }
export function specToCurves(spec)                          // → Curve[]; the one table from a shape spec { kind, ...fields } to the curves of its builder (below); shared by the Lab and graph4d
```

`classify`: `closed`: |z(1) − z(0)| < 1e-9; `simple`: no self-intersection, touching counts (above 1000 edges it is decided on a
decimated copy, so a loop smaller than the decimation step can be missed; it costs about 10 ms for 5000 points, so call it on
pointerup, not on every pointermove); `corners`: turning angles above 20°, `smooth`: none, `piecewiseSmooth`: at most 12;
`orientation`: the sign of the signed area, **+1 counterclockwise (positive orientation), −1 clockwise, for a simple closed curve
only; 0 for open curves and for every curve that crosses itself.** A curve with fewer than two distinct points gives
`{ closed: false, simple: true, smooth: true, piecewiseSmooth: true, orientation: 0, corners: 0 }`.

Every builder is bounded (`SHAPE_LIMITS`), so a count or an angle a student can type, however large, returns in milliseconds. `n` and
`nPerSide` stop at `maxN` = 20000 segments; rings, rays and every fill count (`fillRays`, `fillArcs`, `fillRings`) stop at `maxCount` = 200
(`cartGrid` already stopped at 201 lines each way); the points of one builder stop at `maxPoints` = 200000 in total, so a builder with many
curves lowers its `n` to fit (`polarGrid` with 200 rings, 200 rays and `n` = 1e9 gets 497 segments per curve) and a polygon lowers its
`nPerSide`; an angle beyond `maxAngle` = 1e6 radians has no whole turns left to count and is taken modulo 2π, and a `circle` sweep beyond
it is one turn, so `sector` at 1e17 returns at once. A value below the caps behaves exactly as before, and the default `n` of every builder
is far below them. Polygon vertices and freehand samples are as many as the caller passes in.

`specToCurves(spec)` takes the plain record the Lab stores, `{ kind, ...fields }`, and returns the `Curve[]` of the matching builder, with that
builder's own ids (`boundary`, `ray1`, `arc1`, `inner`, `gx0`, ...; a single-curve kind has no id, the host names it). The kinds and their
fields: `segment` `{a, b}`, `verticalLine` `{x}`, `horizontalLine` `{y}`, `ray` `{angle}`, `rect` `{a, b}`, `circle` `{center, r}`, `polygon`
`{vertices}`, `sector` `{r0, r1, theta0, theta1, fillRays, fillArcs}`, `annulus` `{center, r0, r1}`, `freehand` `{points}`, `cartGrid`
`{xRange, yRange, step}`, `polarGrid` `{rMax, rings, rays}`. A field the spec lacks is the builder's default, and a spec may carry any option of
its builder under the option's own name (`n`, `nPerSide`, `yRange`, `fill`, ...). Two choices differ from calling the builder bare: a
`freehand` spec keeps every point (`minDist` 0 unless the spec has one, because its points were thinned when the stroke was drawn), and a
`circle` without a `center` is centred at 0. An unknown kind, something that is not an object, or a field no builder can read gives `[]`;
it never throws. The curves are new objects on every call. On the Lab's cleaned specs it returns exactly the curves `lab.js` builds today.

### 3.10 `js/core/mapping.js` (pure)

```js
export const PUSH_DEFAULTS                                  // frozen { maxJump: 3, clampRadius: 40, maxDepth: 4, angleTol: 0.08, maxPoints: 20000 }
export function pushForward(curve, f, opts = {})            // → Curve[] (the image as pieces); f maps {re, im} to {re, im} or a bare real, and may throw: a failure is "no value"
// opts (all optional; a bad value falls back to the default):
//   maxJump = 3     a step is a candidate when |Δw|/|Δz| > maxJump × the median stretch; it is cut when the path reverses (turn > π/2) at both ends
//                   (pole leap), or when its stretch is > maxJump² × the stretch of every neighbouring step (teleport: a branch jump of a principal root, which does not reverse)
//   clampRadius = 40  break where |w| > clampRadius or w is not finite (Infinity is allowed)
//   maxDepth = 4    integer 0..8, how many times a bending segment may be halved
//   angleTol = 0.08 rad: subdivide a vertex while the image turns more than the input turns by this much (so a rectangle's corners do not subdivide forever)
//   maxPoints = 20000   refinement stops (the curve does not) when the sample count would exceed it
//   maxImageStep        (not a PUSH_DEFAULTS key; off unless given, and a value that is not a positive number is off): a segment whose image step |w(b) - w(a)|
//                       is longer than this is bisected in z, like a bend: at most maxDepth times (so raise maxDepth, up to 8, with it), never next to a dropped
//                       sample, and while maxPoints allows. The new sample is the chord midpoint, so it lies on the input polyline, not on the curve the
//                       polyline approximates: on |z - 1| = 1 under 1/z (128 segments) the largest step falls from 10.19 to 1.20 at maxImageStep 1 (to 1 or
//                       less with maxDepth 8) and the image stays within 0.0625 of the line Re w = 1/2 (0.01 at 512 segments). Works in pushForward, pushForwardAll and morph.
//   The image keeps the input's t on every point; pieces come back in t order; a piece with < 2 points is dropped; a segment touching a dropped sample is never subdivided;
//   a curve with fewer than 16 segments is first densified to 16.
//   Piece: { id: '<id>~<index>', source: '<id>', kind, family, label, points, closed } (id and source only when the input has an id).
//   `closed` is true only when the input is closed and ONE piece holds every sample.
export function pushForwardAll(curves, f, opts = {})        // → Curve[]: the concatenation of the pieces of every curve
export function morphPoint(z, w, s)                         // s = 0 → z, s = 1 → w, else (1 − s)·z + s·w
export function morph(curve, s, f, opts = {})               // → Curve[]; s is clamped to [0, 1] (NaN → 0); (1 − s)·z + s·f(z) per point, same breaking rules as pushForward
export function bounds(curves)                              // → { xRange: [min, max], yRange: [min, max] } | null; accepts one curve or an array; finite points only; raw extents (the host pads)
export function lift(curve, f)                              // → { re, im, t, w: {re, im} }[]: input points with their images attached (for the 3D views); w is {NaN, NaN} where f has no value; no clamping or cutting
export function pointOnPieces(pieces, t)                    // → {re, im} | null: linear interpolation inside the piece whose [first t, last t] contains t; null in a gap (a pole, a seam) and outside the curve
```

Host rules: **size `clampRadius` to the w-plane you show**: about 3 times the larger half-extent of the w-plane's current view,
never below 40 (under the default 40, `exp(z)` on `x = 4`, with |w| = 54.6, would come back empty); recompute it on the w-plane's
`viewchange`. Use `pointOnPieces(pieces, t)` for the w-plane cursor and hide the dot when it returns `null`. Colour a
grid by `curve.family`. Circles near a pole need `n >= 128` (the builders' default).

`morph(c, 0, f)` returns a one-piece copy of `c` without evaluating `f`; when `c` has an id the copy has `id = '<id>~0'` and
`source = '<id>'`, the same id as every piece at `s > 0`, so a host that keys DOM or cache by piece id sees one id along the whole
slider. `morph(c, 1, f)` equals `pushForward(c, f)`. A loop around 0 under a principal root comes back as 2 open pieces and
`pointOnPieces` is `null` in the gap. For very small `s` (below about 0.07) the seam of a principal root has not yet opened, so
the piece count changes once during a slider sweep.

Pinned by tests: the image of the unit circle under `1/z` has every point with `| |w| − 1 | < 1e-9`;
the image of `|z − 1| = 1` under `1/z` has every finite point with `|Re w − ½| < 1e-6` and is
returned in ≥ 1 piece with no point of |w| > clampRadius; the image of `x = 2` (yRange [−4, 4])
under `z²` satisfies `|u − (4 − v²/16)| < 1e-6` on every point; `morph(c, 0, f)` equals `c`
and `morph(c, 1, f)` equals `pushForward(c, f)` pointwise.

### 3.11 `js/core/domaincolor.js`

```js
export const DOMAIN_LEGEND                                  // frozen copy for the legend: { title, short, plane, aria, details: string[], noFunction, refining, canvasLabel }
export function hueOf(w)                                    // → number in [0, 1): Arg(w)/(2π) mod 1; hueOf(1) = 0, hueOf(i) = 0.25, hueOf(−1) = 0.5, hueOf(−i) = 0.75; 0 for a non-finite w
export function lightnessOf(w)                              // → number in [0, 1]: 1 − 1/(1 + sqrt|w|): 0 at 0, 0.5 at |w| = 1, → 1 at ∞ (NaN for a NaN w)
export function colorXY(x, y, out = [0, 0, 0], rings = true)   // → out = [r, g, b] 0..255, no allocation (the hot loop); colorOf for a point object
export function colorOf(w, out = [0, 0, 0], rings = true)   // HSL with s = 0.8, l = lightnessOf · (0.88 + 0.12·frac(log2|w|)) when rings (faint rings at |w| = 2^k); w = 0 is black, non-finite is mid grey (128), a huge modulus is (near) white; never NaN
export function rangesFromView(view, widthCss, heightCss)   // plane.getView() + the canvas CSS size → { xRange, yRange } with square units; a missing view gives x from −4 to 4
export function createDomainColoring(canvas, options)       // → DC; options { f, xRange, yRange, quality = { idle: 1, drag: 0.3 }, rings = true, maxPixels = { idle: 1.5e6, drag: 1.2e5 } }; TypeError without a canvas
// DC: { setFunction(f), setView({ xRange, yRange }), setQuality('idle' | 'drag'), render(mode?), info(), destroy() }
//   render(mode): paints now at the quality of mode ('idle' | 'drag'; omitted keeps the current one) and returns true when it painted (false: destroyed, hidden or 0 × 0 canvas, no 2d context).
//   In 'drag' mode it draws at reduced resolution and schedules an 'idle' refine 120 ms after the LAST call (time-sliced over animation frames, 8 ms bands), so call render('drag') on every drag, slider move and first paint.
//   info() → { mode, width, height, pending, destroyed, renders, state }; the canvas carries data-dc-state ('ready' | 'no-function' | 'hidden' | 'no-context' | 'destroyed') and data-dc-pending.
//   The offscreen size is ceil(w·q) × ceil(h·q) capped by maxPixels (a 2400 × 1400 canvas drags at 454 × 265): keep the canvas at CSS size with devicePixelRatio 1 so the cap does not bite.
export function drawColorWheel(canvas, options)             // the legend: hue by angle, lightness by radius; options { size = 96 }; returns the canvas; reads --border once, so call it again on themechange
```

`createDomainColoring` and `drawColorWheel` give their canvas `role="img"` and an `aria-label` unless it has its own `aria-label`
or `aria-hidden`. Unlike the 3D `argColor` (plain HSL, no rings), `colorOf(1)` with rings is `[202, 22, 22]` and without is `[230, 25, 25]`:
compare against `colorOf(w, out, false)` when matching the two.

### 3.12 `js/core/three-view.js` (imports three.js and OrbitControls from `../../vendor/three/`)

Stations do not import three.js: this module builds everything and re-exports `THREE` as an escape hatch.

**Frame convention.** A maths point `(x, y, h)` (plane position, height) is drawn at scene `(x, h, −y)`, a proper rotation, so
counterclockwise stays counterclockwise. Every object built here is already in scene space; `curveToLine`, `toScene` and a
marker's `setPosition` take maths triples; `riemannPoint` returns one. Vertex colours hold linear values (`srgbToLinear`).

```js
export { THREE }
export const HELIX_PITCH                                    // 1.2: height gained per full turn on the helix
export const HIDDEN_RAMP_STOPS                              // the five viridis stops [t, [r, g, b]]
// pure (no three.js objects; unit-tested in Node)
export function stereographic(z)                            // → [X, Y, Z] = (2x, 2y, |z|² − 1)/(|z|² + 1); z = 0 → [0, 0, −1]; an infinite component → [0, 0, 1]; unit circle → equator Z = 0; a bare real is accepted
export function inverseStereographic(p)                     // p = [X, Y, Z] → (X, Y)/(1 − Z) as {re, im}; Z >= 1 → {re: Infinity, im: Infinity}; does not renormalise
export function rotate4(p, { uv = 0, yv = 0 } = {})         // [x, y, u, v] → a new array: rotate in the u–v plane by uv, then in the y–v plane by yv
export function project4to3(p4)                             // [x, y, u, v] → [x, y, u]; the dropped v is the hidden value painted as colour
export function toScene(p)                                  // maths [x, y, h] → scene [x, h, −y]
export function fromScene(p)                                // scene → maths
export function riemannPoint({ n = 3, part = 'im' } = {}, r, theta)   // a point of the Riemann surface of z^{1/n} in the maths frame [x, y, h, other]; theta is unwrapped (not reduced to Arg)
export function srgbToLinear(c)
export function hslToRgb(h, s, l)                           // h in turns, → [r, g, b] 0..1
export function argColor(w)                                 // hue wheel: HSL(Arg w / 2π, 0.8, 0.5) as [r, g, b] 0..1, Arg 0 → red; the same colour at Arg +π and −π
export function hiddenRamp(t)                               // five-stop viridis for a hidden coordinate; t in [0, 1], t = 0.5 means the value 0; NaN → 0.5
export function hiddenRampCss()                             // the CSS gradient for a legend of that ramp
// geometry builders (THREE objects; need three but not WebGL; Node-safe)
export function surfaceFromFunction({
  f, xRange = [-2, 2], yRange = [-2, 2], nx = 96, ny = 96,
  height = (w) => Math.hypot(w.re, w.im), color = (w) => argColor(w), clamp = 6, wire = true } = {})
//    → THREE.Mesh over an nx × ny grid (2..512 each) with vertex colours, DoubleSide, and a LineSegments child named 'wire' (wire: false omits it);
//    height(w, z) → number, color(w, z) → [r, g, b] 0..1; non-finite or |height| > clamp vertices are clamped (neutral grey mix) and flagged in mesh.userData.flags (0 ok, 1 clamped, 2 non-finite) with counts in clampedCount, nonFiniteCount, flaggedCount
export function modulusLandscape({ f, xRange, yRange, nx, ny, clamp = 6, wire = true } = {})   // height |w|, colour hue = Arg w (same hue convention as argColor)
export function reImSurface({ f, xRange, yRange, nx, ny, part = 're', clamp = 6, wire = true } = {})   // part 're' | 'im'; coloured by the other part on hiddenRamp; userData.kind 're-surface' | 'im-surface', userData.part, userData.hiddenScale
export function graph4D({ f, xRange = [-2, 2], yRange = [-2, 2], nx = 64, ny = 64, angles = { uv: 0, yv: 0 }, clamp = 6, wire = true, hiddenScale } = {})
//    → { mesh, setAngles({ uv, yv }), setFunction(f), setHiddenScale(s), dispose() }: builds the 4D points (x, y, u, v), applies rotate4 then project4to3, paints the hidden coordinate on hiddenRamp;
//    setAngles recomputes positions in place; mesh.userData has vertexCount, angles, hiddenScale, boundRadius, version (incremented on every change)
//    hiddenScale (default automatic): the hidden value that reaches the ends of the ramp. Automatic is the largest 4D norm of the graph, so the colours hold under ANY rotation, which
//    leaves a graph whose hidden values stay small (the root presets reach 1.4 of 3.16) in the middle of the ramp; a positive number narrows the ramp to [-hiddenScale, hiddenScale]
//    (values beyond it take the end colours) and survives setAngles and setFunction. setHiddenScale(s) changes it; null or any value that is not a positive number goes back to automatic.
//    userData.hiddenScale is the scale the colours use, userData.boundRadius the automatic one: the radius of the ball that holds the graph under every rotation (frame by this, not by hiddenScale).
export function riemannSurfaceRoot({ n = 3, rMax = 2, nr = 24, nTheta = 48, part = 'im', wire = true, hiddenScale } = {})
//    → THREE.Mesh: sheets theta in [0, 2πn) (nTheta vertices per turn, n 1..12), vertex (r cos θ, r sin θ, part(r^{1/n} e^{iθ/n})) coloured by the other part; the n sheets join after n turns
//    hiddenScale (default rMax^(1/n), the largest possible |part|, the whole ramp): a smaller positive number stretches the ramp over the sheets (values beyond it take the end colours); userData.hiddenScale is the scale used
export function disposeObject(obj)                          // recursively disposes geometry, materials and textures, then detaches obj; null-safe and idempotent
export function curveToLine(points3, color = '--output', options)   // points3: maths triples [x, y, h]; → THREE.LineSegments (a THREE.Line subclass); a non-finite point breaks the line; line.userData.update(points3) edits in place
//    options { lineWidth = 0 }: a width in world units (the diameter). Above 0 the curve is a six-sided tube of that width (a flat colour, no lighting) and the result is a THREE.Mesh, not LineSegments;
//    a gap is still a gap and update(points3) still edits in place. Anything that is not a positive number is the one-pixel line. userData.lineWidth is the width used.
export function createMarker({ color = '--text', radius = 0.06, position = [0, 0, 0] } = {})   // → THREE.Mesh sphere; mesh.userData.setPosition([x, y, h])
export function argHelix({ z = { re: 1, im: 1 }, turns = 2, rMax = 3, seam = -Math.PI, tightFrame = false } = {})   // → { group, update(z, seam?) }
//    tightFrame (default false): sets group.userData.frameRadius to the ball around the helix cylinder, hypot(rMax, HELIX_PITCH·(turns + 1/2)) = 4.24 for the defaults, so fitTo frames that ball;
//    without it fitTo frames the half-diagonal of the box (5.20 for the defaults, 22 percent more)
//    the staircase over the plane: a helicoid ribbon (r, φ, height HELIX_PITCH·φ/2π) for φ in [−(2·turns + 1)π, (2·turns + 1)π] (the home sheet (seam, seam + 2π] brighter),
//    the point z drawn once on the floor in --cart, a dashed fibre above it with one bead per step k = −turns..turns at height HELIX_PITCH·(θ_home + 2πk)/2π, the home bead (k = 0) larger,
//    and the seam as a dashed floor strip; group.userData has beads, floorPoint, fibre, homeSheet, ghostSheet, seamRay, axis, turns, rMax, pitch, seam; update(z) with a non-finite z hides the beads
export function riemannSphere({ radius = 1, frameLabels = false } = {})
//    → { group, curves, project(z) → THREE.Vector3, addCurve(points: {re, im, t?}[], color = '--input', options) → THREE.LineSegments | THREE.Mesh, clearCurves(), markInfinity(on = true), setHalfTurn(angle), showAxis(on = true) }
//    north pole (0, 0, 1) in plane coordinates is ∞ (the sphere's scene Y axis); curves are great-circle subdivided and drawn 0.4% above the sphere; with t on every point they get the time ramp and round dots at t = 0, 1/4, 1/2, 3/4, 1;
//    setHalfTurn(π) rotates the curves group about the axis through 1 and −1, which maps z to 1/z
//    group.userData.frameRadius = radius, the ball only: the labels (the ∞ at 1.14 radii) are outside it, so a caller that frames the group at padding 1.0 clips them (padding 1.0 is an exact fit of the ball itself);
//    frameLabels: true makes it 1.2 radii, so fitTo(group, { padding: 1.0 }) frames the labels as well (their text stays inside from a 220 px view up); callers that already pass padding 1.25 are unchanged by default
//    addCurve options { lineWidth = 0, rampWeight = 0.65 }:
//      lineWidth   world units, the diameter, at most radius/2: above 0 the curve is a six-sided tube of that width and addCurve returns a THREE.Mesh (flat colour per vertex, no lighting) instead of THREE.LineSegments; the
//                  time ramp is painted along it. 0 (or anything not a positive number) is the one-pixel line. A gap in the stroke (a non-finite point, an antipodal step) is a gap in the tube
//      rampWeight  0..1, how far a stroke with t is pulled from its own colour toward the --t0 to --t1 ramp (the dots too). The default 0.65 turns an orange --polar stroke dark brown at t = 0; 0.3 keeps it orange,
//                  0 is the flat colour, 1 the bare ramp. userData.lineWidth and userData.rampWeight hold the values used
export function domainSphere({ f, radius = 1, nLon = 96, nLat = 64, color = domainColor, frameLabels = false } = {})
//    → { ...riemannSphere(), mesh, setFunction(g) }: the Riemann sphere painted with f (the point that stands for z has the colour of f(z): hue = Arg w, lightness 1 − 1/(1 + √|w|), black at 0, grey where f has no value and at the pole);
//    the pale body is hidden and the painted mesh (name 'domain-sphere', userData.vertexCount = (nLon + 1)(nLat + 1), scale 0.996 radii) sits just inside the graticule; setFunction recolours in place;
//    color(w, z) → [r, g, b] 0..1 replaces the default (the same as domaincolor.js colorOf(w, out, false) to its 8-bit rounding); nLon 3..256, nLat 2..256; radius and frameLabels are riemannSphere's
export function createView3D(container, {
  background = '--surface', cameraPosition = [3, 3, 4], grid = true, autoRotate = false,
  axes = true, axisLabels = ['x', 'y', 'h'], gridSize = 8, autoFrame = true, label = '3D view',
  target = [0, 0, 0], hint = true, forceUnavailable = false } = {})
// → View; grid is true | 'cart' | 'polar' | 'both' | false; the view starts itself (a render-on-demand rAF loop)
// View: { scene, camera, renderer, controls (OrbitControls), canvas, container, id, unavailable,
//         add(obj), remove(obj), onFrame(cb) → unsub, start(), stop(), requestRender(), renderNow(), resize(),
//         fitTo(obj?, { padding = 1.25 }), resetCamera(), setBackgroundFromTheme(), dispose() }
```

**The view.** `createView3D` turns `container` into the view: class `three-view`, `role="group"`, `tabindex="0"`, and an id (its own,
or a generated one that is removed on dispose); `view.id === container.id`, and every child id derives from it (`<id>-canvas`,
`<id>-reset`, `<id>-hint`, `<id>-status`). The canvas is inserted first; other children are left alone, so a station that shows
"Loading the 3D view..." must clear that text before calling it. The renderer is sized to the container by a `ResizeObserver`
(the container needs a layout size; the injected `.three-view` style gives it a 4:3 aspect ratio and a 220 px minimum height), renders only when the controls moved,
a frame callback asked, or `requestRender()` was called, pauses off-screen, and survives a lost WebGL context. A view that is off screen draws
nothing by itself, not even after `requestRender()` (it draws once when it scrolls back into view); `renderNow()` draws at once whatever the visibility,
so call it before a full-page screenshot of a view below the fold. While the context is lost the loop goes dormant (no animation frames) until it is
restored. `add(obj)` frames
the first object whose `userData.frame` is true, unless the student has already moved the camera (`autoFrame`).
`onFrame(cb)` calls `cb(dt, nowSeconds, view)` every frame while it is registered (a callback that throws is logged once and
removed). `fitTo(obj?, { padding })` frames an object (default: everything added): by its box, or, when it sets
`userData.frameRadius`, as a ball of that radius; with the default hint visible the picture is framed above the hint and stays
there after the hint fades, so call `fitTo` again to use the full height, and use `padding: 1.0` for a tighter picture (the helix
and landscape start at about 40 to 50 percent of the view). `padding: 1.0` is an exact fit of the framed ball or box (tangent to the narrower side of
the free part of the view): whatever is drawn outside it, such as the sphere's labels without `frameLabels` or a curve 0.4 percent above the sphere, can
touch or pass the edge. While the hint is visible a resize measures the room it takes again, so the picture follows a hint that re-wraps; once the hint
has gone the picture keeps its place. `dispose()` stops the loop, disposes geometries, materials and the
renderer, removes the canvas and the overlay, and restores the container's attributes.

If WebGL is unavailable (or `forceUnavailable`), `view.unavailable` is `true`, `renderer`, `controls` and `canvas` are `null`, a
`.three-status` message is shown in the container, and every method is a harmless no-op (`add` and `remove` still manage `scene`).
Keyboard (only while the container itself has focus): arrows orbit (Shift ×3), `+` `−` zoom, `0` or Home resets; the wheel zooms only
when the container has focus or Ctrl/Cmd is held, otherwise the page scrolls. Under reduced motion damping and `autoRotate` are off.
`window.__mv.views3d` is a Map from `view.id` to the view.

**Auto redraw.** Every mutator in this module (`graph4D().setAngles`, `setFunction`, `argHelix().update`, the sphere's `addCurve`,
`clearCurves`, `setHalfTurn`, `markInfinity`, `showAxis`, a marker's `setPosition`, a line's `update`) requests a render on every
view the object was added to: a station never needs `view.requestRender()` after calling them.

**Drawing details stations can rely on.** Axis labels and the sphere's labels are `sizeAttenuation: false` sprites about 14 CSS px
tall (sphere labels 12), with a thin halo in the background colour so they stay readable over saturated surface colours. The
helix's floor point (the point z) is drawn last, transparent with no depth test, so it reads `--cart` from every camera angle; the
seam is a flat dashed strip (a 1 px line would hide under the axis); markers and the sphere's infinity marker are
`transparent: true` (opacity 1) so that their render order puts them after the translucent sheets. The hint ("Drag to turn. Click the
view, then scroll to zoom...") hides on the first pointer press, the first key the view handles (arrows, `+` `−`, `0`, Home) and the first wheel that zooms
the view (container focused, or Ctrl/Cmd held); a wheel that only scrolls the page past the view, Tab and any other key leave it. The sphere's time dots
are round. The Reset button's text is "Reset view" and its accessible name "Reset view to its starting angle" (it starts with the visible text). `resetCamera()` (the Reset button, the
`0` key) flushes the damping residue first, so Reset right after a drag lands exactly on the saved pose. A `curveToLine` update frees
the replaced GL buffers. `createView3D` also creates `window.__mv.planes` if absent (so the load order of `plane.js` and this module
does not matter).

**Colour legend rule.** The hue wheel always means Arg (`argColor`), the viridis ramp always means a signed real number (`hiddenRamp`,
`hiddenRampCss()` is its legend; give the legend a border and a label, its dark end is low contrast on a dark surface), and grey means
cut off or undefined.

Pinned by tests: `stereographic(0) = [0, 0, −1]`, `stereographic(1) = [1, 0, 0]`,
`stereographic(i) = [0, 1, 0]`, `stereographic(1e9)` within 1e-8 of `[0, 0, 1]`;
`inverseStereographic(stereographic(z)) = z` for z = 2 + i; the half-turn identity
`stereographic(1/z) = [X, −Y, −Z]` where `[X, Y, Z] = stereographic(z)` for z = 2 + i;
`rotate4(p, {uv: π/2})` sends `(x, y, u, v)` to `(x, y, −v, u)` so the Re surface becomes the Im surface;
`rotate4(p, {uv: 0, yv: 0}) = p`.

### 3.13 `js/core/theme.js` and `js/core/store.js` (shell goal)

```js
// theme.js
export function cssVar(name)                                // trimmed computed value on documentElement, e.g. cssVar('--cart') → '#0b63ad'; '' when unavailable
export function getTheme()                                  // → 'light' | 'dark': the effective theme (data-theme on <html>, else prefers-color-scheme)
export function setTheme(t)                                 // 'light' | 'dark' | 'auto'; sets or removes data-theme on <html>, persists the raw string under localStorage 'mv:theme' (try/catch), then dispatches document CustomEvent 'themechange' { detail: { theme, mode } }; any other value is ignored with a console.warn
export function onThemeChange(cb)                           // cb(theme: 'light' | 'dark') → unsubscribe; fires on setTheme and on prefers-color-scheme changes while no theme is chosen; a throwing cb is logged
export function prefersReducedMotion()                      // → boolean
export function initTheme()                                 // applies a stored choice, keeps every <meta name="theme-color"> (index.html has a light and a dark default) in step with --bg, listens for OS changes; called once by app.js start(); → dispose()
// store.js
export function createStore(prefix = 'mv:', options = {})   // → Store; options.storage exists for tests (a localStorage-like object, or null for memory only)
// Store: { get(key, fallback), set(key, value, { persist = true } = {}), remove(key), subscribe(key, cb) → unsubscribe, keys() }
//   get returns a fresh copy of the value (callers may mutate it) or fallback; set returns true when the value reached localStorage and false
//   otherwise (persist: false, storage blocked or full, a value that is not JSON-serialisable is refused with a console.warn); set(key, undefined) removes the key;
//   subscribe's cb(value | undefined) fires for changes made on this page only (a copy of the value; undefined after remove);
//   keys() is the sorted union of memory and localStorage keys under the prefix, without the prefix
```

The store is a memory Map of JSON strings mirrored to `localStorage` as JSON; every `localStorage` access is in try/catch,
including the lookup of `globalThis.localStorage`, so the page works with storage blocked. Keys in use: `progress` (problem
ticks), `lab.strokes` (the Lab's drawn shapes), `lab.request` (the hand-off to the Lab, written with `{ persist: false }`
so it does not survive a reload). **The key `theme` is reserved**: `theme.js` keeps a raw, non-JSON string at
`mv:theme`, so `store.keys()` lists `theme` but `store.get('theme')` returns the fallback; skip it when you loop over `keys()`.
Because the tint of a canvas or a KaTeX string is baked in at draw time, redraw on `themechange` (or `onThemeChange`).

### 3.14 `js/app.js` (router)

```js
export const SITE_TITLE                                     // 'One Point, Two Addresses'
export const PART_TITLES                                    // { I: { title, note }, ..., V } the names of the registry parts
export function documentTitle(label)                        // `${label} · ${SITE_TITLE}`, or SITE_TITLE for an empty label
export function groupStations(stations = STATIONS)          // → [{ part, title, note, stations }] in Story Map order (the nav)
export function parseRoute(hash)                            // → { station: string | null, preset: Preset | null, raw: string }; pure; exported for unit tests
// Preset = { kind: 'problem', id: '1.4.2' } | { kind: 'topic', id: 'T2.4' } | { kind: 'token', token: '2-5-1' }
export function start()                                     // index.html calls this once: builds the nav, installs hashchange, mounts the first route; → stop()
```

Resolution rules for `parseRoute` (tokens contain only `[A-Za-z0-9._~-]` and are at most 120 characters):
1. empty or `#` → `{ station: 'home' }`.
2. `problem-<id>` → `{ station: stationForProblem(id).id, preset: { kind: 'problem', id } }`; the id's dashes map back to dots
   (`problem-1-4-2` → `1.4.2`, `problem-P3` → `P3`, a lower-case `p3` is read as `P3`). The router does not import
   `data/problems.js`; it uses `registry.stationForProblem` and the dash↔dot rule. An unknown id is "No such place".
3. `topic-<id>` → `{ station: stationForTopic('T2.4').id, preset: { kind: 'topic', id: 'T2.4' } }`.
4. an exact station id (case-insensitive) → `{ station: id, preset: null }`.
5. `<station-id>-<rest>` with the **longest** station id that is a prefix followed by `-` → `{ station, preset: { kind: 'token', token: rest } }`
   (so `#lab-2-5-1` → lab with token `2-5-1`, `#principal-root-sweep` → principal-root with token `sweep`).
6. anything else → `{ station: null }`; the router renders the "No such place" panel (with the station list) and sets `document.title`.

Mounting: the previous `unmount()` runs inside try/catch; `#view` is emptied and scrolled to the top
(`window.scrollTo(0, 0)`; `history.scrollRestoration` is `'manual'`, so a reload or Back starts at the top on purpose); a
`<section class="station" id="station-<id>" data-station="<id>">` is created; `await import(st.module)` (relative to
`js/app.js`); `unmount = await mod.mount(section, ctx)` (`mount` may be async). If the import or `mount` throws, the
router renders `<div class="panel under-construction" data-station-error="<id>">` with the station's title, "This station is
under construction.", a link home, a "Reload the page" button, and calls `console.error`. While a station is loading
(> 150 ms) a `.loading` placeholder is shown. A navigation that arrives while a station is loading supersedes it (the late
`mount` is unmounted at once). `document.title` becomes `"<title> · One Point, Two Addresses"`. The nav marks the active
station with `aria-current="page"`; on every navigation after the first the router focuses `#view` (it has `tabindex="-1"`), and
it announces the title in `#route-status`. `#view` carries `data-route`, `data-station` and `data-state` (`loading` | `ready` | `error` |
`nosuchplace`). The menu sets an exponent in a station title (`z^n`) as `<sup class="prose-sup">`, and the drawer toggle's tooltip reads
"Hide the places" while the drawer is open. The header has a skip link to `#view`. `start()` also sets `window.__mv.app = { render, navigate, state() }`.

`ctx` passed to `mount` (a frozen object):

```js
{ navigate(token: string),                 // sets location.hash = '#' + token; navigating to the route already shown re-mounts the station
  route: string,                           // the raw token ('home' for an empty hash)
  station: StationEntry,                   // the registry entry
  stations: STATIONS, threads: THREADS,
  preset: Preset | null,                   // see above
  store: Store,                            // shared, created once in app.js
  theme: { cssVar, getTheme, setTheme, onThemeChange, prefersReducedMotion } }   // frozen
```

### 3.15 `js/registry.js` (pure data)

```js
export const THREADS                                        // [{ id: 'T1' | 'T2' | 'T3', title, tone: '--cart' | '--polar' | '--output', dash: boolean, summary }]
export const STATIONS                                       // a plain (mutable) array of StationEntry in Story Map order
// StationEntry: { id, title, chapter: 0 | 1 | 2 | 3, part: 'I'..'V', order, module: './stations/<id>.js' /* relative to js/ */,
//                 problems: string[], topics: string[], threads: ('T1' | 'T2' | 'T3')[], summary }
export function stationForProblem(problemId)                // → the first station in order that lists the problem, skipping 'problems'; null if none
export function stationForTopic(topicId)                    // → the first station in order that lists the topic, skipping 'problems'; null if none
export function stationById(id)                             // → StationEntry | null
```

`id` is also the hash route. The registry is maintained by the planner: stations do not edit it.

## 4. Station contract and shared conventions

```js
// js/stations/<id>.js
export function mount(el, ctx) → unmount()    // may be async: the router awaits it; el is an empty <section class="station">; ctx is in 3.14
```

Every station (the rules that wave 0 added are in section 10):

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
   button `#<station>-open-lab` that does `ctx.store.set('lab.request', LabRequest, { persist: false })`
   then `ctx.navigate('lab')`. Every `href` in the station is a route (section 10.1).
7. **Lifecycle.** `unmount` stops rAF loops, removes window/document listeners, destroys planes,
   explainers, staircases, domain-colouring canvases and 3D views, unsubscribes from the store and theme,
   and deletes the station's `window.__mv` hooks. Attach window and document listeners last in `mount`.
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
--bg --surface --surface-2 --text --text-muted --border --border-strong --accent --on-accent --focus
--cart --polar --input --output --seam --ghost-alpha   (--ghost-alpha is a bare number: the alpha of the faint arg windings)
--t0 --t1            the two ends of the time ramp (t = 0 dark, t = 1 bright; both ≥ 3:1 contrast against --surface in both themes)
--ok --warn --danger
--font --font-display --font-mono --radius --radius-sm --shadow     (system font stacks only: no web fonts)
--space-1 ... --space-5
--gutter --tap --header-h --sidebar-w --content-max --icon-sun --icon-moon     (shell layout and chrome; stations rarely need them)
```

Canvases never hard-code colours: `plane.js`, `domaincolor.js` (for the wheel's outline) and
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
// tests/interact/_helpers.mjs (owned by the plane goal); every function takes Playwright's `page` first
export async function planePixel(page, planeId, z) → { x, y }      // viewport coordinates of a plane point, via window.__mv.planes.get(planeId).toPixel + canvas rect; scrolls the canvas to the middle first; throws if the point is outside the viewport
export async function dragHandle(page, handleId, z, { steps = 12 } = {}) → { re, im }   // real mouse drag of the handle button to the plane point z; returns the handle's final z (plane id read from the DOM, else the handle id minus its last '-segment')
export async function dragHandleAround(page, handleId, { center = {re:0, im:0}, radius = 1.5, startAngle = 0, turns = 1, steps = 48 } = {}, onStep?) → { re, im }   // ONE continuous press around a circle; onStep(page, angle, i) runs after every position
export async function clickChip(page, id)                           // scrolls to and clicks #id, then settles
export async function readText(page, selector) → string             // trimmed textContent of the first match ('' if absent)
export async function setSlider(page, id, value) → number           // sets value and dispatches 'input' and 'change'; returns the value the control took
export async function settle(page, frames = 2)                      // waits N animation frames (planes and explainers update once per frame); capped at 250 ms
export async function handleZ(page, handleId) → { re, im }          // from the handle button's data-re / data-im
export async function readHandleLabel(page, handleId) → string      // the handle button's aria-label
// pure (Node-importable): planeIdOfHandle(handleId), nums(text) → number[] (a minus before a digit is a sign: "3 - 2i" gives [3, -2]), parseCart(text) → { re, im } | null ("5 + 14i", "-i", "2i", "3")
```

Unit tests import pure modules directly (`import { mul } from '../../js/core/complex.js'`); `npm test` runs
`node --test "tests/unit/*.test.mjs"` (the quoted glob is needed on Node 22), and one file runs with
`node --test tests/unit/<file>.test.mjs`. `tests/unit/architecture-sync.test.mjs` checks section 3 of this file against the code.
Interaction scripts run as `node tools/smoke.mjs --route <id> --script tests/interact/<goal>.mjs`
and must pass at both viewports the harness uses (desktop 1280×860 and phone 390×844). A script exports
`default async function (page, ctx)` with `ctx = { route, viewport, shot(name), log(msg), assert(cond, msg) }`, and may export
`expectedErrors = [/regex/, ...]` for console errors and failed requests it provokes on purpose (a script that tests error paths
then exits 0). The harness blocks Google Fonts and ignores those failures; it counts every other console error, page error, failed
local request, external request and horizontal overflow as a failure.

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

## 10. Rules for station builders (from wave 0)

The wave-0 builders and reviewers found these while building and reviewing the engines in section 3. They are binding for
every `js/stations/*.js`; the station reviewers check against them. `docs/review/iter-1/wave0-sync.md` says which review
finding each rule came from. A rule is a MUST unless it says "should" or "prefer".

### 10.1 The shell and the router

1. **Every `href` is a route**: `href="#roots"`, `#problem-1-4-2`, `#topic-T2-4`, `#lab-2-5-1` (section 7). No in-page
   anchors such as `href="#details"`, never `#a=b`, never a query string. A link needs no JavaScript; use `ctx.navigate(token)`
   only for buttons.
2. **No `scrollTo` on mount.** The router has already scrolled to the top (and, on every navigation after the first, focused `#view`). Do not
   call `window.scrollTo` or `scrollIntoView` on mount, do not move focus on mount, and do not touch `history.scrollRestoration`
   (it is `'manual'` on purpose, so a reload or Back starts at the top).
3. **One `<h1>`**, inside `.station-header` (the shell has none).
4. **Listeners last, all removed.** Attach window and document listeners at the end of `mount`, so a throw earlier cannot
   leak them; remove every one in `unmount`. `mount` may be async but must resolve to the `unmount` function.
5. **The Lab hand-off** is `ctx.store.set('lab.request', request, { persist: false })` followed by `ctx.navigate('lab')`: a reload must
   not replay it. The store key `theme` is reserved (3.13); `progress`, `lab.strokes` and `lab.request` belong to other goals.
6. **Tokens only.** Fonts are the system stacks `var(--font)`, `var(--font-display)`, `var(--font-mono)`; never add a web-font `<link>`
   or `@import`. No literal colours except inside canvas drawing, and there read the tokens at draw time and again on `themechange`.
   Use the shell's classes (`.panel`, `.chips`/`.chip`, `.slider-row`, `.two-planes`, `.readout`, `.callout`, `.badge`, `.tex-scroll`, ...;
   catalogue in `docs/designs/iter-1/i1-shell.md` 2.6) and do not restyle them.
7. **Draw the vocabulary in place.** The colour key sits in a closed `<details>` in the footer, so a student may never open it. Draw
   `arg z` as a set (ghost windings from `drawPolarAddress(..., { ghosts })`, the staircase, or the helix), `Arg z` as the one
   highlighted step, and the point once. Never write or draw the set `arg z` as if it were a number.

### 10.2 Planes

1. **One plane, one id**: `createPlane(host, { id: '<station>-plane' })` (`-zplane` / `-wplane` for a pair); the handles are
   `#<plane id>-<point id>`. Call `plane.destroy()` in `unmount`.
2. **Draw in layers.** Put drawing in `plane.addLayer(...)`, read handles with `handle.z` inside it, and call `plane.requestDraw()`
   after any state change. `plane.fitTo(points)` also sets the view that Reset returns to.
3. **Handles.** A drag is clamped to a 10 px inset, so a script that needs a point near the edge calls `plane.setView` or `fitTo`
   first. Keep draggable points out of the top-right corner, where the zoom buttons are (the handle wins over the buttons there).
   Use square planes: the address labels of a very flat plane (aspect 3:1) can sit far from their line.
4. **A plane over domain colouring.** Create the plane with `background: 'transparent'` (the canvas is only ever cleared, so
   the colours show through) and make the domain-colouring canvas the first child of `plane.el`:
   `plane.el.prepend(dcCanvas)` with `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none`. Set the DC canvas
   `width` and `height` to `Math.round` of `plane.getSize()` (CSS size, device-pixel ratio 1) and re-render it on every `viewchange`,
   `'resize'` included (10.5). The address labels keep a 3 px `--surface` halo, which keeps them readable over the colours; still
   check a screenshot in both themes.
5. **Curves.** Pass shapes and mapping pieces to `plane.addCurve` as they are: `kind`, `family`, `source`, `label` and `reversed` are
   ignored. Choose the colour from `curve.family` (10.5), `--input` for what the student draws and `--output` for its image.
6. **Ids are test hooks.** Interaction scripts find planes through `window.__mv.planes` and handles through `#<plane id>-<point id>`
   (10.7). Do not rename a plane or point id that section 9 names.

### 10.3 Explainers and the staircase

1. **Tint at render time.**
   Call `cart()`, `polar()`, `input()` and `output()` inside the row function at render time, never once at mount: the colour is baked
   into the string, so a theme change only recolours strings that are created again.
2. **Prose in a cell** is `{ text: '...' }` or `\text{...}`; a bare string is TeX (prose passed as TeX renders as squashed italics).
3. **Ids are `[A-Za-z0-9_-]`.** Row ids and column keys with other characters are rewritten (`r^n` becomes `r-n`, so the cell id is
   `<id>-r-n-cart`). Choose safe ids (`rn`, `ntheta`) and put sanitised ids in selectors (`sanitizeId`).
4. **Update freely.** Call `explainer.update(state)` on every pointer move and do not throttle it yourself: the first call renders at
   once, later calls are coalesced to one render per frame. Keep an explainer to about 6 rows (12 at most): a cold first render with
   six rows and a seven-row staircase took 229 ms under a 4× CPU throttle.
5. **Destroy.** Call `destroy()` on every explainer and staircase in `unmount`.
6. **Staircase input.** Feed `staircase.update` any representative of the angle (do not reduce it yourself) and `null` at z = 0.
   `onPick(k)` means "k steps above Arg": read the home step from `Arg`, not from the raw angle. A representative that lands
   within 1e-9 of the seam by float noise (for example `13 * Math.PI`) is the top step `π`, never `-π`, so `n * theta` can be passed as it is.
7. **The staircase relabels, it does not slide.** Row `k = 0` is always the home step and the home band never moves; at the seam
   every label shifts by 2π and a note appears. The sliding picture belongs to the plane (ghost windings, the seam) and the helix.
   Do not promise a sliding list in the copy.
8. **`native` per row** comes from the STORY table (1.1.1: Cartesian for the arithmetic, polar as the check; 1.3.2, 1.4.x, 2.2.2:
   polar; 3.2.1: Cartesian). The badge "easy in Polar" is the on-screen form of "pick the native address".
9. **Tests read `data-tex`.** While updates stream, cells render without MathML and a refine pass rewrites them 220 ms after the last
   update; an interaction script reads `data-tex` (or waits for `stats.refines`), not `textContent`, right after an update.

### 10.4 Text, statements and prose

1. **Statements.** Render a problem statement with `statementParts(p.statement)`: each part with `math: false` through
   `textContent`, each part with `math: true` through `tex(el, part.text)`.
2. **Answers.** Render `p.answer.tex` with `tex(box, p.answer.tex, { display: true })` inside a container with `overflow-x: auto`
   (`.tex-scroll`), add a scroll hint, and offer `p.answer.text` (printable ASCII, wraps) as the fallback: 21 of 29 answers are wider
   than 350 px (a phone's content width) and 13 of 29 are wider than 490 px (the 520 px desktop card); the longest, 1.5.2, is about 950 px.
3. **Prose with exponents.** `aha`, `addressWhy`, `routes.cart`, `routes.polar`, topic `summary` and `covers`, and function `note` and
   `label` write exponents as `e^{iθ}` or `r^(1/3)`. Render them with `prose(el, text)` (or `proseToHtml(text)`) from `katex.js`, which
   turns them into superscripts and escapes everything else; never with `textContent` alone (literal braces), and never with
   `innerHTML` of anything that did not pass through `proseToHtml` or `escapeHtml`. Do not rewrite the strings: tests pin their wording.
   Subscripts such as `u_x` stay as typed.
4. **Problem cards.** Chip text is `addressLabel(p.address)` with the tints from `addressTones(p.address)`; the proofs filter is
   `p.chapter === 0` (or `p.kind === 'proof'`); show `routes.cart` under a `--cart` bar and `routes.polar` under a `--polar` bar, stacked
   below 560 px.
5. **Numbers.** Readouts are plain text from `fmtNum`, `fmtCart`, `fmtPolar` and `fmtAngle` (ASCII minus, three decimals, the exact
   form in parentheses when `exactAngle` finds one). Do not show one quantity as a TeX fraction in the explainer and as a decimal in the
   readout in the same view (`texCart(0.3 - 0.7i)` is `\frac{3}{10} - \frac{7}{10}i`); choose per quantity. `texNumber` has no `\sqrt{29}`
   or `\sqrt{221}`: write those radicals yourself, with the decimal beside them.
6. **Arg versus arg in words.** Write `Arg` for the principal value and "a name for arg z" for a raw angle, as the arg-versus-Arg rule
   in CONSTRAINTS asks. Never differentiate or equate the set `arg f` as a number (say "a continuous choice of arg f").
7. **Parser errors.** For `compile`/`parse` failures show `err.message` verbatim and underline with `err.position` and `err.length`.

### 10.5 Mapping, shapes and domain colouring

1. **Size `clampRadius` to the w-plane you show.** Pass `clampRadius = Math.max(40, 3 * Math.max(halfW, halfH))`, where
   `halfW = view.unitsAcross / 2` and `halfH = halfW * size.h / size.w` (from the w-plane's `getView()` and `getSize()`), plus
   `Math.hypot(view.center.re, view.center.im)` when the view is centred away from 0; recompute it on every w-plane `viewchange`.
   Under the default 40, `exp(z)` on `x = 4` comes back empty.
2. **The w-plane cursor** is `pointOnPieces(pieces, t)`. It returns `null` where the image is at infinity or across a seam: hide the dot
   there instead of keeping the last one. A loop around 0 under a principal root is 2 open pieces, never a closed curve.
3. **Colour by `curve.family`.** `'cart'` curves (lines, rectangles, the Cartesian grid) use `--cart`, `'polar'` curves (circles, rays,
   sectors, annuli, the polar grid) use `--polar`, `null` curves use the input or output token. This teaches the native address.
4. **Domain colouring.** Get the ranges from `rangesFromView(plane.getView(), cssWidth, cssHeight)` (the canvas CSS size), keep the DC
   canvas backing size at that CSS size with device-pixel ratio 1 (so the pixel cap does not bite), and call `dc.render('drag')` on every
   drag, slider move and first paint (it refines to full quality 120 ms after the last call). Draw the wheel with `drawColorWheel` and
   draw it again on `themechange`; take the legend text from `DOMAIN_LEGEND`. Say "the same hue" when you compare the 2D picture with a
   3D landscape, not "the same colour": the 2D rings change the lightness (compare with `colorOf(w, out, false)`).
5. **Cost and hand-drawn strokes.** Classify a drawn stroke on pointerup, not on every pointermove (about 10 ms for 5000 points).
   Coalesce `morph` to one call per animation frame. Draw circles near a pole with `n >= 128`. The cut rules of `pushForward` can
   mistake pixel-level jitter for a pole leap and cut an image where nothing goes to infinity (the w-plane cursor then reads `null`
   inside the gap, the damage is a gap of a few percent of the image). The Lab should smooth the pointer samples (in a quick test of 300
   jittery strokes under z³, a 5-point moving average cut 9 images where the raw samples cut 86) and thin them with
   `freehand(samples, { minDist })` at about 4 px in plane units before pushing a stroke forward. A `morph` at very small `s` has not
   opened its seam yet: do not read anything into the one extra piece that appears later.
6. **Compose the engines yourself**: `compile(fn.src).f` into `pushForward(curve, f, { clampRadius })` into `plane.addCurve`; the engines
   never import each other.

### 10.6 The 3D view

1. **Do not import three.js.** `three-view.js` builds everything; `THREE` is re-exported only as an escape hatch.
2. **Clear first.** Remove any "Loading the 3D view..." text from the container before `createView3D(container, ...)`, which leaves other
   children alone. Give the container a layout size (the injected `.three-view` style gives it 4:3 and at least 220 px high).
3. **Frame it.** The default framing is conservative (the helix and the landscape fill 40 to 50 percent of the view, and the helix beads
   are a few pixels across). After `view.add(obj)` call `view.fitTo(obj, { padding: 1.0 })` with a tighter `rMax` for the helix, and call
   it again once the hint has gone, so the picture uses the whole height.
4. **No manual redraws.** Every mutator in 3.12 requests a render itself; do not call `view.requestRender()` after them. Use
   `view.onFrame(cb)` for an animation, and do not start it when `ctx.theme.prefersReducedMotion()` is set.
5. **Frame convention.** Pass maths triples `[x, y, h]` to `curveToLine` and `setPosition`; never pass scene coordinates.
6. **No WebGL.** When `view.unavailable` is true the view has already printed its message; show the flat picture next to it and carry on.
7. **Legends.** Hue means Arg, the viridis ramp means a signed real number (`hiddenRampCss()`; give the legend a border and a label),
   grey means cut off or undefined.
8. **Dispose.** Call `view.dispose()` in `unmount`.

### 10.7 Test hooks and ids

1. **Never replace `window.__mv`.** Write `const mv = (window.__mv = window.__mv || {})` and set your hook on it (`mv.lab = {...}`); the
   router, the planes and the 3D views own `app`, `planes` and `views3d`. Delete your hooks in `unmount`.
2. **Use the ids and readout formats of section 9** exactly; interaction scripts assert on them. Readouts are plain text with an ASCII
   minus and three decimals.
3. **Every control** has a stable id prefixed by the station id and a visible label or `aria-label`; every plane id and handle id is
   stable across mounts.

### 10.8 Tests and the harness

1. Every station ships `tests/interact/<goal-id>.mjs`, run as `node tools/smoke.mjs --route <id> --script tests/interact/<goal-id>.mjs`;
   it must pass at the desktop and the phone viewport, and in `--dark`.
2. A script that provokes errors on purpose (a bad formula, a missing module) exports `expectedErrors`; do not gate on the exit code of a
   script that does not.
3. Until the wave-1 stations exist every station route reports HTTP 404 and the router's under-construction panel; that is expected
   and ends when the station lands. The integrator re-runs `node tools/smoke.mjs --dark` for every route after wave 1.
4. Pass `--out <dir>` outside the repository (or under `docs/review/`) for screenshots; commit nothing from a scratch directory.
