# Design: `i1-core-math` (iteration 1, wave 0, engine)

Designer: stage 2. Builder: stage 3 implements this file without guessing. Binding inputs:
`docs/goals/iter-1.json` (goal `i1-core-math`), `docs/ASSIGNMENT.md`, `docs/CONSTRAINTS.md`,
`docs/ARCHITECTURE.md` sections 2, 3.1, 3.2, `docs/STORY.md` sections 1, 3, 8.

> **Residue cleanup (iteration 1).** `exactAngle` (and so `fmtAngle`, `texAngle` and the π branch of `texNumber`) now also finds denominator 18 (the 10-degree steps); `toTex` brackets an operand that starts with a minus and follows an operator (`--z` gives `-\left(-z\right)`); `addressLabel` in problems.js reads a non-object `opts` as no options. Passages marked "Superseded in residue cleanup" below were overtaken by the code; the record is `docs/ARCHITECTURE.md` and `docs/review/iter-1/residue/D-report.md`.

Owns: `js/core/complex.js`, `js/core/parse.js`. The goal's `deliverable` and the stage brief also name two
test files that the builder creates (new files, no other goal touches them): `tests/unit/i1-core-math.test.mjs`
and `tests/interact/i1-core-math.mjs`.

**How this design was checked.** Before writing it, the designer built a throw-away reference
implementation of every algorithm below in the scratch directory (outside the repo, deleted with the session),
ran the full unit-test plan of section 7 against it (30 tests, all pass), ran the interaction script of
section 7 through the real `tools/smoke.mjs` against a stand-in page in headless Chromium (desktop and phone,
all pass), fuzzed the parser (60,000 random strings, no exception other than `ParseError`, every position in
range) and the formatters (no throw, no U+2212, no empty string), checked every TeX string in KaTeX 0.16.11
(the vendored build, `strict: 'error'`), and cross-checked the 18 function values of section 7.5 against
Python's `cmath`. Every number printed in this file was produced by that run or derived by hand and then
confirmed by it. Fenced blocks tagged `check` use the form `expression => expected` and were machine-checked
against the reference (strings compared exactly, numbers and `{re, im}` objects to 1e-9).

---

## 1. Goal restatement, story thread, coverage

### 1.1 What is built

Two pure ES modules that every later station composes:

- `js/core/complex.js`: complex arithmetic on plain `{re, im}` objects; the two addresses of a point
  (`toPolar`, `fromPolar`); the number `Arg`, the set `argSet`, and the home-step wrapper `wrapArg`; powers,
  n-th roots, primitive roots, principal and branch roots; the quadratic formula; numeric calculus that
  produces the A/B decomposition of STORY section 8; plain-text and TeX formatting that recognises exact
  forms. Imports nothing. No state.
- `js/core/parse.js`: a tiny `f(z)` language (`z^2 + iz`, `(1+i)z`, `z^(1/3)`, `(x^2 - y^2 + 2ixy)/(x^2 + y^2)`)
  to `ParseError`, an AST, a fast closure-compiled evaluator and pretty TeX. Imports only `./complex.js`.
  Its only state is a bounded compile cache.

No DOM, no `window`, no timers, no randomness, no locale. Both load unchanged in Node (unit tests) and as
native browser modules (stations, Lab).

### 1.2 Existing code and differences from ARCHITECTURE

The only file under `js/` today is `js/registry.js` (pure data, unrelated). `js/core/complex.js` and
`js/core/parse.js` do not exist, so ARCHITECTURE 3.1 and 3.2 are built exactly, with the deliberate
refinements listed in Appendix A (every one is additive or strictly more precise; none changes a pinned value).

### 1.3 Story thread carried and how it shows on screen

This goal has no pixels. It supplies the numbers and strings that other goals draw. The thread it carries
is the two ideas the student named:

| Story idea | What this module guarantees | Where it shows on screen (other goals) |
|---|---|---|
| **One point, two addresses** (Thread 1). The point never changes; only the address does. | `toPolar` and `fromPolar` are exact inverses (round trip to 1e-12). `mul` (Cartesian) equals `fromPolar(r1 r2, theta1 + theta2)` (polar) to 1e-9 for every sample pair: the "magic" is a tested fact. `texCart` and `texPolar` print the same point as `x + iy` and `r e^{i theta}` with exact forms (`\sqrt{2} + \sqrt{2}\,i` and `2\,e^{i\frac{\pi}{4}}`). | Both columns of every explainer, every readout, the addresses converter. |
| **The point z, the set arg z, the number Arg z** (Thread 2). | `Arg` returns one number in (-pi, pi] (negative real axis is +pi, zero is 0). `argSet(z)` returns the whole staircase `[{k, theta}]`; entry `k = 0` is exactly `Arg z`; every entry satisfies `fromPolar(abs(z), theta) = z`, so all steps reach the same single point (tested). `wrapArg` puts any step back on the home step. | The staircase list and ghost arcs (`arg z` as a set, `Arg z` highlighted), the seam jump, powers wrapping 5pi/3 to -pi/3. |
| **Divide the staircase** (roots, T2). | `rootsOf(c, n)` returns the n points `abs(c)^(1/n) e^{i(Arg c + 2 pi k)/n}`, `k = 0..n-1`, in k order (not sorted by home angle); `isPrimitiveRoot(k, n)` is `gcd(k, n) = 1`. | Roots station dots, badges, the "raise it back" animation. |
| **Choose a step continuously** (branches, T2). | `branchArg(z, seam)` and `branchRoot(c, n, seam)` use the step in (seam, seam + 2 pi]. Seam -pi is the principal branch; seam 0 is continuous along the negative real axis (problem 2.4.1). A walk test pins where the value jumps by exactly `sqrt(3)` (n = 3) and where it does not. | Branches station seam slider, walk status, Riemann surface marker. |
| **Zoom: spin-and-stretch plus mirror** (T3). | `localLinear(f, z0)` returns `{A, B}` with `A = (f_x - i f_y)/2`, `B = (f_x + i f_y)/2`; `directionalQuotients` returns the circle `A + B e^{-2 i phi}`; `jacobian` returns `{ux, uy, vx, vy}`; Cauchy-Riemann is `B = 0` (tested: `2 abs(B) = hypot(ux - vy, vx + uy)`). | Limits and derivative direction circle, Cauchy-Riemann Jacobian cells, A/B readouts. |
| **A function is a motion** (T3). | `compile(src).f` is the single function every mapping view and the Lab calls, pointwise, on a hot loop (0.03 to 0.6 microseconds per call). `toTex` writes the formula for display. | Lab formula box, mapping stations through the `FUNCTIONS` catalogue, domain colouring. |

### 1.4 Review problems and topics covered

`assignment_refs` of the goal, each mapped to the exact functions and the unit test that pins the handout
answer. Full worked solutions (Cartesian and polar) are in section 6.2.

| Problem | Carried by | Pinned answer | Test |
|---|---|---|---|
| 1.1.1 `z1 z2`, `z1/z2` | `mul`, `div`, `toPolar` | `5 + 14i`; `-11/17 - (10/17)i` | U1, U4 |
| 1.1.2 `Im(conj(z1 - z2))` | `sub`, `conj` | `6` | U1 |
| 1.3.1 polar and exponential form, `Arg` | `toPolar`, `fromPolar`, `argSet`, `texPolar` | `2(cos 2pi/3 + i sin 2pi/3) = 2e^{i 2pi/3}`, `Arg = 2pi/3` | U4, U6, U20 |
| 1.3.2 `(sqrt3 + i)^10` | `pow`, `wrapArg`, `Arg` | `512 - 512 sqrt3 i`, `Arg = -pi/3` | U9 |
| 1.4.1 5th roots of unity | `rootsOfUnity`, `isPrimitiveRoot` | `e^{2 pi i k/5}`; flags `[false, true, true, true, true]` | U12, U13 |
| 1.4.2 4th roots of -16 | `rootsOf` | `sqrt2(+-1 +- i)`, each to the 4th is -16 | U11 |
| 1.4.3 `z^2 - 4z + 13 = 0` | `quadraticRoots`, `sqrt` | `2 +- 3i` | U16 |
| 2.2.2 principal `(2i)^(1/2)` | `principalRoot`, `sqrt` | `1 + i` | U14 |
| 2.4.1 branch of `z^(1/3)` continuous on the negative axis | `branchArg`, `branchRoot` | seam 0; value at -1 is `1/2 + (sqrt3/2) i` | U15 |
| 3.1.1 `f = z^2 + z` differentiable, `f'` | `localLinear`, `directionalQuotients`, `compile` | `A = 2z + 1`, `B = 0`; at `1 + i`: `3 + 2i` | U17, U18 |
| 3.1.2 `f = abs(z)^2` differentiable only at 0 | `localLinear`, `directionalQuotients` | `A = conj z`, `B = z`; circle radius `abs(z)`; at 0 a point | U17, U18 |
| P1 `conj z1 conj z2 = conj(z1 z2)` | `mul`, `conj` | both `5 - 14i` | U7 |
| P2 `abs(z) = sqrt(z conj z)` | `mul`, `conj`, `abs`, `abs2` | `z conj z = 13`, `abs = sqrt13` | U7 |
| P6 `Re z` not differentiable | `localLinear`, `directionalQuotients` | `A = B = 1/2`; quotient circle through 0 and 1 | U17, U18 |

Topics: T1.1 (ordered pairs, +, -, x, /, conjugates: `add sub mul div conj`), T1.3 (polar form, arg vs Arg,
Euler: `toPolar fromPolar Arg argSet wrapArg expi exp`), T1.4 (powers, roots, primitive roots, quadratic
formula: `pow rootsOf rootsOfUnity isPrimitiveRoot quadraticRoots`), T2.2 (principal roots: `principalRoot sqrt`),
T2.4 (branches: `branchArg branchRoot`), T3.1 (derivative as local linear map: `numericPartials jacobian
localLinear directionalQuotients`). The parser additionally carries every function of the ARCHITECTURE 3.4
catalogue (2.1.x, 2.2.x, 2.3.1, 2.5.1, 3.x, P4, P5, P6, P7 all name a function the Lab and stations compile).

---

## 2. UX

### 2.0 This goal has no screen, no controls and no ids

There is nothing to click, drag, type or tab to in these two modules: no element ids, no pointer, touch or
keyboard handling, no focus states, no loading state (both modules are imported synchronously and a compile
takes well under a millisecond). The "UX" of an engine is (a) the **strings** it hands to screens, (b) the
**error messages** a student reads when a formula is wrong, and (c) the **guarantees** screens can lean on.
Sections 2.1 to 2.5 specify those. Element ids named below belong to other goals (ARCHITECTURE section 9) and
are shown only to say where a string lands.

### 2.1 Where this module's strings appear (wireframes owned by other goals)

Explainer, desktop (>= 560px, two columns; `texCart` tinted `--cart` left, `texPolar` tinted `--polar` right).
Every number and TeX string in the cells comes from calls of this module (`texCart` and `texPolar` of `z1`, `z2` and of the product, `abs`, `Arg`) on the handout values of problem 1.1.1; the layout is the explainer's:

```
+------------------------------------------------------------------------------------+
| z1 * z2                                                                            |
|                                                                                    |
|  Cartesian (slide)                   |  Polar (spin-and-stretch)                   |
|  (3 - 2i)(-1 + 4i)                   |  3.606 e^{-i 0.588} . 4.123 e^{i 1.816}     |
|  = 5 + 14i                           |  = 14.866 e^{i 1.228}                       |
|  texCart(z1z2) -> 5 + 14i            |  texPolar(z1z2) -> 14.866\,e^{i\,1.228}     |
|  ------------------------------------+-------------------------------------------- |
|  same point: agree    abs 14.866 = sqrt(221)    Arg 1.228 = -0.588 + 1.816         |
+------------------------------------------------------------------------------------+
```

Same explainer, phone (~390px; columns stack, Cartesian above polar; the module's strings are short enough
to wrap, longest typical row about 28 characters of TeX before rendering):

```
+--------------------------------------+
| z1 * z2                              |
| Cartesian (slide)                    |
|  (3 - 2i)(-1 + 4i) = 5 + 14i         |
| Polar (spin-and-stretch)             |
|  3.606 e^{-i 0.588} . 4.123 e^{i 1.816}
|  = 14.866 e^{i 1.228}                |
| same point: agree                    |
+--------------------------------------+
```

Readout line (plain text, ASCII minus; stations append the exact form in parentheses only when
`exactAngle` finds one):

```
z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)          <- fmtCart, fmtNum, fmtNum, fmtAngle
roots at (3.142 + 2 pi k)/4; k = 0..3                      <- fmtNum
k = 2: 2 e^(-i 2.356) = -1.414 - 1.414i                    <- fmtPolar, fmtCart (home step -3pi/4 via wrapArg)
```

Staircase list (`argSet(z, {kMin: -2, kMax: 2})` labelled with `fmtAngle`; k = 0 is `Arg z`, highlighted):

```
    ...   14pi/3   (k = 2)
          8pi/3    (k = 1)
  > Arg z = 2pi/3  (k = 0)      <- the one step in (-pi, pi]
         -4pi/3    (k = -1)
         -10pi/3   (k = -2)
```

Lab formula box with a parse error (`#lab-fn-src`, `#lab-fn-apply`, `#lab-fn-error`; desktop, phone is the
same stacked at 390px with the message wrapping under the input). `position` places the caret, `length`
underlines:

```
 f(z) = [ z +                       ]  [ Apply ]
           ~~~^
 The formula stops too early. Something is missing after "+".
```

### 2.2 Contracts every consumer may rely on

1. `Arg(z)` is a number in (-pi, pi]. Never `-pi`, never `-0`. `Arg(negative real) = pi`, `Arg(0) = 0`.
2. Every function returns fresh plain `{re, im}` objects (or numbers, arrays and `{...}` records as
   documented). Never an input object, never the frozen constants `ZERO`, `ONE`, `I`.
3. No function throws on mathematically undefined input. Division by zero, `inv(0)`, `pow(0, -1)`,
   `powc(0, i)` and the like return `{re: NaN, im: NaN}`. Only invalid *programmer* arguments throw
   `RangeError` (non-positive-integer `n`, non-positive step, absurd `argSet` span). The parser throws
   `ParseError` and nothing else.
4. Plain-text formatters (`fmt*`) return non-empty ASCII strings with `-` for minus (never U+2212), except
   `fmtAngle(..., {unicode: true})`, which may contain U+03C0.
5. TeX formatters (`tex*`, `toTex`) return strings KaTeX 0.16.11 renders with `throwOnError: true` and
   `strict: 'error'`. They contain no colour commands: tinting is the caller's job (`katex.js`).
6. Output never depends on locale, time or randomness.

### 2.3 Copy (all text the module can put in front of a student)

Parser messages. Each is one plain sentence (no HTML, no markdown), `{...}` is filled from the input. Stations
show `err.message` verbatim and use `err.position` (0-based index into the original string; `src.length` for
"ran out of input") and `err.length` (>= 1) to place a caret and underline. Test row ids M1 to M17 are in U24.

| Id | When | Message | position, length |
|---|---|---|---|
| M1 | empty, blank or non-string input | `Type a formula in z, for example z^2 + i z.` | 0, 1 |
| M2 | a run of letters is not made of known names | `I don't know the name "{run}". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos.` | run start, run length |
| M3 | same, but fixes itself when case is ignored | `I don't know the name "{run}". Names are case-sensitive; did you mean "{fixed}"?` | run start, run length |
| M4 | any other character (`{ch}` is one whole code point: an emoji is one character, `length` 2, never a lone surrogate half) | `I don't understand the character "{ch}". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ).` Three targeted cases, exact text in 7.6: the bar character gives `Bars are not supported. Use abs(z) for the modulus, like abs(z - 1).` (the handout writes moduli with bars); U+221A gives `The root sign is not supported. Use sqrt(z) for a square root, like sqrt(z + 1).`; a code point of Unicode category C, Z or M (zero-width space, a lone surrogate, a combining mark) gives `There is a hidden character (U+{HEX}) here that I can't read. Delete it and retype that part of the formula.` | index, 1 (2 for a code point outside the BMP) |
| M5 | `1.2.3` | `This number has two decimal points.` | the second `.`, 1 |
| M6 | a lone `.` | `A "." must have digits next to it, like 0.5.` | index, 1 |
| M7 | number overflows | `That number is too big.` | number start, its length |
| M8 | more than 400 characters | `That formula is too long (more than 400 characters).` | 400, 1 |
| M9 | brackets nested more than 80 deep | `This formula is nested too deeply.` | that token, 1 |
| M10 | `sin z`, `abs z`, `Im` | `"{name}" needs brackets around its input, like {name}(z).` | name start, name length |
| M11 | input ends where an operand was needed | `The formula stops too early. Something is missing after "{previous token}".` | `src.length`, 1 |
| M12 | `*`, `/`, `^` where an operand was needed | `A formula can't have "{token}" here. I expected a number, a variable or "(".` | token, token length |
| M13 | `)` with no `(` (an operand is present before it: `z)`, `2z)`, `(z))`; at the very start: `)(`) | `This ")" has no matching "(".` | the `)`, 1 |
| M14 | `()` | `There is nothing between this "(" and ")". Put a formula inside the brackets.` | the `(`, 2 |
| M15 | `(` never closed | `This "(" is never closed. Add a ")" at the end.` | the `(`, 1 |
| M16 | a number where an operator was expected (`z2`, `2 3`, `(z2)`, `(2)3`) | `I did not expect the number "{n}" here. Put the number first (2z, not z2) or use * between them.` | the number, its length |
| M17 | `)` straight after an operator (`(z+)`, `sin(z+)`, `(z*)`, `z^(2+)`): the bracket is fine, the operand is missing | `Something is missing between "{operator}" and this ")". Put a number or a variable there.` | the `)`, 1 |

Words for values with no number: `fmtNum(NaN)` is `undefined`, `fmtNum(Infinity)` is `inf`, `fmtNum(-Infinity)`
is `-inf`; `fmtCart` and `fmtPolar` print the single word `undefined` (any NaN part) or `inf` (any infinite
part). TeX: `\text{undefined}`, `\infty`, `-\infty`. Stations should test `isFiniteC` first and say
"undefined here (a pole)" in their own words; the module only guarantees it never prints `NaN`.

### 2.4 Empty, loading and error states

| State | Behaviour |
|---|---|
| Empty or whitespace formula | `parse` throws M1 at position 0. The Lab keeps the previous function and shows M1. |
| Loading | None. `import` is synchronous; `compile` of any legal formula is under 1 ms; first evaluation has no warm-up cost the student can see. |
| Syntax error | `ParseError` with a message of M2 to M16. Nothing is half-compiled: `compile` either returns a complete function or throws. |
| Evaluation at a pole (`1/z` at 0) | `f(z)` returns `{re: NaN, im: NaN}`; no exception. Mapping code checks `isFiniteC` and breaks the stroke (STORY: "omit it, do not draw a segment through it"). |
| Overflow (`exp` of a huge real part) | Infinity or NaN parts, still no exception. |

### 2.5 Consumer recipes (so wave-1 stations compose these modules the same way)

```
// Lab: apply a typed function
try { const fn = compile(text); setFunction(fn); clearError(); }
catch (e) { if (e instanceof ParseError) showError(e.message, e.position, e.length); else throw e; }

// Readout: point
`z = ${fmtCart(z)}; |z| = ${fmtNum(abs(z))}; Arg z = ${fmtNum(Arg(z))}` + (exactAngle(Arg(z)) && Arg(z) !== 0 ? ` (${fmtAngle(Arg(z), {unicode: true})})` : '')
// (stations that build only from ARCHITECTURE can use: fmtAngle(t) !== fmtNum(t) as the "has an exact form" test)

// Explainer cells
cart: (s) => texCart(s.z),  polar: (s) => texPolar(s.z)
agree: eq(cartResult, polarResult, 0.5 * Math.pow(10, -digits))          // compare numbers, never strings

// Timed points through f (time is carried, never recomputed)
points.map((p) => ({ ...f(p), t: p.t }))                                  // f returns {re, im}; keep t

// Staircase of a point
argSet(z, { kMin: -3, kMax: 3 }).map(({ k, theta }) => ({ k, label: fmtAngle(theta), isHome: k === 0 }))

// Roots, with the home-step angle shown beside each
rootsOf(c, n).map((w, k) => ({ k, w, home: wrapArg((Arg(c) + 2 * Math.PI * k) / n), primitive: isPrimitiveRoot(k, n) }))
```

---

## 3. Visual encoding

### 3.1 Module is colourless; the code colour is applied by callers

The modules contain no colour (a unit test greps for hex colours, `rgb(`, `hsl(` and `textcolor`). Both themes
work because nothing here knows about a theme. The contract with `katex.js` and the explainer:

| String source | Tint by the caller | Meaning |
|---|---|---|
| `texCart`, `fmtCart`, `texNumber` of `Re`/`Im` | `--cart` | Cartesian address: x, y, the slide of addition |
| `texPolar`, `fmtPolar`, the `r` and `theta` of `toPolar` | `--polar` | polar address: spin-and-stretch |
| `texAngle(theta)` of the home step | `--polar` at full strength | `Arg z`, the one chosen number |
| `texAngle(theta + 2 pi k)`, `k != 0` | `--polar` at `--ghost-alpha` | the other members of the set `arg z` |
| `toTex(src)` of a function | `--text` (neutral) | the rule `f(z)`; the Cartesian and polar split of `f` lives in `FUNCTIONS` data, not here |

Whole-string tinting is enough because every returned TeX string is one address: `texCart` never contains polar
pieces and `texPolar` never contains Cartesian pieces.

### 3.2 arg as a set, Arg highlighted

The data shape makes the encoding impossible to get wrong: `argSet(z, {kMin, kMax})` returns ascending `k`;
the entry with `k = 0` is `Arg z` by construction (`theta = Arg(z) + 2 pi k`); every other entry is a ghost.
The point itself is not in the list: it is `z`, drawn once, and `fromPolar(abs(z), theta)` equals it for every
entry (tested in U6). The home range is `(-pi, pi]`; `wrapArg(theta)` puts any angle, however many turns
it has wound, back on the home step. The seam is the negative real axis where `Arg` jumps from `pi` to `-pi + epsilon`: `Arg(-1)` is
`+pi` exactly, `Arg(-1 - 1e-12 i)` is just above `-pi`.

### 3.3 Input versus output, time

`compile(src).f` maps a z-plane point to a w-plane point; callers draw the argument in `--input` and the
result in `--output`. Time colouring is the caller's: a timed point `{re, im, t}` goes through `f` as
`{...f(p), t: p.t}` so "when" matches "where" (the image carries the same `t`).

### 3.4 Both themes

Not applicable to the modules (no colours). The strings are theme-neutral; KaTeX glyphs inherit the tint.
Unit test U29 enforces the no-colour rule so a builder cannot sneak a hex literal in.

---

## 4. Module API

### 4.1 Conventions (both modules)

- A complex number is a plain object `{ re, im }`. **Every parameter documented as complex also accepts a bare
  real number** `n`, read as `{ re: n, im: 0 }` (`rootsOf(-16, 4)`, `Arg(-1)`, `mul(2, z)`, `quadraticRoots(1, -4, 13)`
  all work). Implementation: one private helper `cx(v) = typeof v === 'number' ? { re: v, im: 0 } : v` called on
  the first line of each exported function (measured cost: below the noise of the benchmark). Anything else
  (`null`, `undefined`, a string) fails naturally with a `TypeError`; there is no other validation on the hot path.
  Parameters documented as real (`r`, `theta`, `k`, `n`, `h`, `digits`, `seam`, `kMin`, `kMax`) are numbers only.
- Nothing is mutated. Every result is a fresh object (never an input, never `ZERO`, `ONE`, `I`).
- Angles are radians. `Arg` is in (-pi, pi]. `Arg`, `neg`, `conj`, `inv`, `mul`, `div` and `pow` (which is built on `mul` and `inv`) never
  return `-0` for a component: `neg` and `conj` use `0 - x` (so `neg(ZERO)` is `{0, 0}`), and `mul`, `div`, `inv`, `conj` (its real part) and `Arg`
  add `+ 0` to each result, since `-0 + 0` is `+0` (this also covers a quotient that underflows, e.g. `inv({re: 1e300, im: 1e-300})`, and an `atan2` that
  underflows, e.g. `Arg({re: 1e300, im: -5e-324})`). `add`, `sub`, `scale` and the elementary functions make no promise about the sign of a zero.
- Errors: `RangeError` for invalid `n`, `h`, `rho`, `m` and an `argSet` span over 10,000; `ParseError` from the
  parser; everything else returns NaN parts.
- **Do not use any of these words anywhere in either file, not even in comments or strings:** `document`, `window`,
  `localStorage`, `sessionStorage`, `requestAnimationFrame`, `setTimeout`, `setInterval`, `fetch`, `navigator`,
  `process`, `require`, `Date`, `performance`, `Intl`, `toLocaleString`, `Math.random`. (U29 strips comments before it
  checks, but keep them clean so a plain `grep` is also clean.) Say "range" instead of "window".
- Style: ES2020, no dependencies, JSDoc one-liner per export, constants named in section 4.5. **Both source files are pure ASCII:** write every non-ASCII character the code needs (U+03C0, U+2212, U+2013, U+2014, U+00D7, U+00B7, U+22C5, U+2219, U+00F7, U+00B2, U+00B3) as a `\uXXXX` escape.

### 4.2 `js/core/complex.js` exports (49 names: the 48 of ARCHITECTURE 3.1 plus `exactAngle`)

```js
// constants and constructor
export const C = (re, im = 0) => ({ re, im });
export const ZERO, ONE, I;        // Object.freeze({re:0,im:0}), ({re:1,im:0}), ({re:0,im:1})

// the two addresses and the angle
export function fromPolar(r, theta)  -> { re, im }          // r cos(theta), r sin(theta)
export function toPolar(z)           -> { r, theta }        // r = hypot, theta = Arg(z)
export function Arg(a)               -> number in (-pi, pi]
export function wrapArg(theta)       -> number in (-pi, pi]  // NaN if theta is not finite
export function argSet(z, { kMin = -2, kMax = 2 } = {}) -> [{ k, theta }]  // ascending k, theta = Arg(z) + 2 pi k
export function expi(theta)          -> { re: cos theta, im: sin theta }

// arithmetic
export function add(a, b), sub(a, b), mul(a, b), div(a, b)   // div by 0 -> {NaN, NaN}
export function neg(a), conj(a), inv(a), scale(a, k)         // inv(0) -> {NaN, NaN}; k is a real number
export function abs(a), abs2(a)                              // numbers: hypot, re^2 + im^2

// elementary functions (principal values)
export function exp(a), log(a), sqrt(a), sin(a), cos(a)

// powers and roots
export function pow(a, n)            -> { re, im }   // integer n, any sign; non-integer n delegates to powc; pow(0, 0) = 1
export function powc(a, w)           -> { re, im }   // exp(w log a); powc(0, w) = 0 if Re w > 0, 1 if w = 0, else NaN
export function rootsOf(c, n)        -> [{ re, im }] // k = 0..n-1; n positive integer else RangeError; rootsOf(0, n) = n zeros
export function rootsOfUnity(n)      -> [{ re, im }] // rootsOf(ONE, n)
export function principalRoot(c, n)  -> { re, im }   // rootsOf(c, n)[0] (computed directly)
export function branchArg(z, seam = -Math.PI) -> number in (seam, seam + 2 pi]
export function branchRoot(c, n, seam = -Math.PI) -> { re, im }   // abs(c)^(1/n) e^{i branchArg(c, seam)/n}; 0 for c = 0
export function isPrimitiveRoot(k, n) -> boolean     // gcd(k mod n, n) === 1
export function quadraticRoots(a, b, c) -> [{ re, im }, { re, im }]   // [(-b + s)/2a, (-b - s)/2a], s = sqrt(b^2 - 4ac); a = 0 -> two NaN pairs
export function eq(a, b, eps = 1e-9) -> boolean      // hypot(a - b) <= eps
export function isFiniteC(a)         -> boolean

// numeric calculus (central differences)
export function numericPartials(f, z0, h = 1e-5)           -> { fx, fy }        // both {re, im}; fy = d f / d y
export function jacobian(f, z0, h = 1e-5)                  -> { ux, uy, vx, vy }
export function localLinear(f, z0, h = 1e-5)               -> { A, B }          // A = (fx - i fy)/2, B = (fx + i fy)/2
export function directionalQuotients(f, z0, rho = 1e-3, m = 72) -> [{ phi, q }]  // phi = 2 pi j / m, j = 0..m-1

// plain-text formatting (ASCII)
export function fmtNum(x, digits = 3)                      -> string
export function fmtCart(z, digits = 3)                     -> string
export function fmtPolar(z, digits = 3)                    -> string
export function fmtAngle(theta, { digits = 3, pi = true, unicode = false } = {}) -> string
export function exactAngle(theta)                          -> { p, q } | null   // theta = p pi / q, lowest terms (extra export)

// TeX formatting
export function texNumber(x, digits = 3)                   -> string
export function texCart(z, digits = 3)                     -> string
export function texPolar(z, digits = 3)                    -> string
export function texAngle(theta, digits = 3)                -> string
```

Return shapes are exactly the ones above (`toPolar` is `{r, theta}`, `localLinear` is `{A, B}`, `argSet` entries are
`{k, theta}`, `directionalQuotients` entries are `{phi, q}`). `f` passed to the calculus functions takes one
`{re, im}` argument and returns `{re, im}`; it is called with fresh objects.

### 4.3 `js/core/parse.js` exports (5 names)

```js
import { add, sub, mul, div, neg, conj, pow, powc, exp, log, sqrt, sin, cos, abs, Arg, fmtNum } from './complex.js';  // the file's only import

export class ParseError extends Error { constructor(message, position, length = 1) }   // name 'ParseError'; .position (0-based int), .length (>= 1)
export function parse(src)    -> AST          // throws ParseError
export function compile(src)  -> { f, src, tex, uses }
export function toTex(src)    -> string       // throws ParseError
export function evaluate(src, z) -> { re, im } // compile(src).f(z)
```

`compile(src)`: `f(z)` takes `{re, im}` (or a real number) and returns a fresh `{re, im}`; `src` is the input
string unchanged; `tex` is the same text `toTex(src)` returns; `uses` is a `Set` containing any of `'z'`, `'x'`,
`'y'` that occur (empty for a constant). Results are cached by exact source text (at most 64 entries, oldest
evicted first), so `compile(s) === compile(s)`; callers must treat the result (including `uses`) as read-only.

**Grammar** (whitespace anywhere is ignored; names are case-sensitive):

```
formula    := expression END
expression := term { ('+' | '-') term }                       left-associative
term       := unary { ('*' | '/') unary | implicit }          left-associative, same level as * and /
implicit   := power      -- taken only when the next token is a variable, a constant, a function name or '('
unary      := '-' unary | '+' unary | power
power      := atom [ '^' unary ]                              right-associative: a^b^c = a^(b^c); exponent may be signed: z^-2
atom       := NUMBER | CONST | VAR | FUNC '(' expression ')' | '(' expression ')'
NUMBER     := digits [ '.' [digits] ] | '.' digits            no exponent notation ("1e3" is 1 times e times 3 and is rejected)
CONST      := i | e | pi
VAR        := z | x | y                                       x = Re z, y = Im z
FUNC       := conj Re Im abs arg Arg exp log sqrt sin cos     arg and Arg both mean the principal value
```

Consequences pinned by tests: `-z^2 = -(z^2)`; `2^3^2 = 512`; `1/2z = (1/2) z`; `z^-1 = 1/z`; `2ixy = 2 i x y`;
`z^2i = (z^2) i`; `e^z = exp(z)`; `z(z+1)` and `(z+1)(z-1)` and `2(z+1)` are products; **a number can never be the
right-hand factor of an implicit product** (`z2`, `2 3`, `(z+1)2` are errors, message M16: the student almost
certainly meant `z^2` or `2z`). Accepted alternate spellings, tokenised without moving error positions:
U+2212, U+2013, U+2014 as `-`; U+00D7, U+00B7, U+22C5, U+2219 as `*`; U+00F7 as `/`; U+03C0 as `pi`;
`**` as `^`; U+00B2 and U+00B3 as `^2` and `^3`.

`^` semantics: if the exponent subtree contains no variable and evaluates to a real integer `n`, the node uses
`pow(base, n)`; if it contains no variable and is any other constant `w`, it uses `powc(base, w)`; otherwise the
exponent is evaluated at run time and `pow` is used when its value is a real integer, `powc` otherwise.

**AST** (plain objects, returned by `parse`; positions are not stored):

| `type` | fields |
|---|---|
| `'num'` | `value: number` |
| `'const'` | `name: 'i' \| 'e' \| 'pi'` |
| `'var'` | `name: 'z' \| 'x' \| 'y'` |
| `'neg'` | `arg: node` |
| `'bin'` | `op: '+' \| '-' \| '*' \| '/' \| '^'`, `left`, `right`, and `implicit: true` on a product written by juxtaposition |
| `'call'` | `name: 'conj' \| 'Re' \| 'Im' \| 'abs' \| 'arg' \| 'Arg' \| 'exp' \| 'log' \| 'sqrt' \| 'sin' \| 'cos'`, `arg: node` |

### 4.4 Events, lifecycle, state

None of the following exists, by design: no events, no listeners, no timers, no DOM, no `mount` or `unmount`,
nothing to dispose. The only module state is the 64-entry compile cache in `parse.js`; it holds closures and
strings, never DOM or large data, and never needs clearing. Import graph: `complex.js` imports nothing;
`parse.js` imports `./complex.js` and nothing else; no other module is imported by either file.

### 4.5 Private constants (name them exactly once at the top of each file)

| Name | Value | Used for |
|---|---|---|
| `PI`, `TWO_PI` | `Math.PI`, `2 * Math.PI` | everywhere |
| `SEAM_SNAP` | `1e-12` | `wrapArg`: a reduced angle within this of `-pi` becomes `+pi` |
| `ANGLE_EPS` | `1e-9` | `exactAngle`: absolute tolerance for `theta = p pi / q` |
| `EXACT_REL` | `1e-10` | `texNumber`: relative tolerance `1e-10 * max(1, abs(x))` for fraction, surd and pi-multiple detection |
| `EXACT_MAX` | `1e6` | `texNumber`: exact forms are only tried for `abs(x) <= 1e6` |
| `FRAC_QMAX`, `SURD_QMAX`, `PI_QMAX`, `PI_PMAX` | `24`, `4`, `12`, `120` | exact-form search limits (ARCHITECTURE gives 24, 4, 12; `PI_PMAX` widens 24 to 120, Appendix A) |
| `ARGSET_MAX_SPAN` | `10000` | `argSet` guard |
| `DIGITS_MAX` | `12` | `fmtNum` clamp |
| `MAX_LEN`, `MAX_DEPTH`, `CACHE_MAX` | `400`, `80`, `64` | parser limits and cache size |

---

## 5. Algorithms

This goal has no rendering loop, hit testing, animation timing or resolution management: every function is a pure, synchronous computation (what a caller must budget per point is in 8.2). Pseudocode is JavaScript-flavoured. `cx` is applied to every complex argument first (omitted below for
brevity). Where the exact operation order matters for the tested values it is written out.

### 5.1 Helpers

- H1 `cx(v)`: `typeof v === 'number' ? {re: v, im: 0} : v`.
- H2 `gcd(a, b)`: Euclid on `abs(a)`, `abs(b)`: `while (b) [a, b] = [b, a % b]; return a`.
- H3 `needN(n, who)`: if `!Number.isInteger(n) || n < 1` throw `RangeError(who + ': n must be a positive integer')`.
- H4 `needStep(h, who)`: if `!(h > 0) || !Number.isFinite(h)` throw `RangeError(who + ': step must be a positive finite number')`.

### 5.2 The two addresses, `Arg`, `wrapArg`, `argSet`

**`Arg(a)`**

1. `if (a.im === 0) return a.re < 0 ? PI : 0;` (catches `+0`, `-0`; negative real axis is `+pi`; zero is `0`; never `-0`).
2. `t = Math.atan2(a.im, a.re)`.
3. `return t <= -PI ? PI : t + 0;` (a tiny negative `im` such as `-1e-17` with `re = -1` makes `atan2` round to exactly `-pi`; the range contract wins, so it becomes `+pi`. The `+ 0` turns a `-0` into `0`: `atan2(-5e-324, 1e300)` underflows to `-0`, and `Arg` is never `-0`.)

`Arg({re: -1, im: -1e-12})` is `-3.141592653588793` (just above `-pi`: the principal jump is real and visible).

**`toPolar(z)`** returns `{ r: Math.hypot(z.re, z.im), theta: Arg(z) }`. **`fromPolar(r, theta)`** returns
`{ re: r * Math.cos(theta), im: r * Math.sin(theta) }`. **`expi(theta)`** is `fromPolar(1, theta)`.

**`wrapArg(theta)`**

1. `if (!Number.isFinite(theta)) return NaN`.
2. `if (theta > -PI && theta <= PI) return theta` (already home: returned unchanged, so `wrapArg(Arg(z)) === Arg(z)` exactly).
3. `t = theta - TWO_PI * Math.ceil((theta - PI) / TWO_PI)`.
4. One correction for rounding: `if (t > PI) t -= TWO_PI; else if (t <= -PI) t += TWO_PI`.
5. `if (Math.abs(t + PI) < SEAM_SNAP) t = PI` (a sum of angles that lands on the seam is the negative real axis, which belongs to the top step).
6. `return t`.

Checked: `wrapArg(5 pi/3) = -pi/3`; `wrapArg(-pi) = pi`; `wrapArg(pi) = pi`; `wrapArg(3 pi) = pi`; `wrapArg(-3 pi) = pi`;
`wrapArg(7 pi/2) = -pi/2`.

**`argSet(z, {kMin = -2, kMax = 2} = {})`**

1. `lo = Math.ceil(kMin) + 0; hi = Math.floor(kMax) + 0` (the `+ 0` turns `-0` into `0`, so `k` is never `-0`; strict `deepEqual` on `[0, 1]` depends on it).
2. `if (hi < lo) return []`; `if (hi - lo > ARGSET_MAX_SPAN) throw new RangeError('argSet: too many steps')`.
3. `base = Arg(z)`; for `k = lo..hi` push `{ k, theta: base + TWO_PI * k }`.
4. `argSet(0)` is the same formula (`Arg(0) = 0`); it is not a meaningful set (arg 0 is every real number) and callers special-case `z = 0`.

### 5.3 Arithmetic

| Function | Formula (Definition) |
|---|---|
| `add(a, b)` | `{a.re + b.re, a.im + b.im}` (1.2.1) |
| `sub(a, b)` | `{a.re - b.re, a.im - b.im}` (1.2.2) |
| `mul(a, b)` | `{a.re b.re - a.im b.im + 0, a.re b.im + a.im b.re + 0}` (1.2.4; the `+ 0` makes `-0` into `0`) |
| `div(a, b)` | `d = b.re^2 + b.im^2`; if `d === 0` return `{NaN, NaN}`; else `{(a.re b.re + a.im b.im)/d + 0, (a.im b.re - a.re b.im)/d + 0}` (1.2.6; `div(1, -1)` is `{-1, 0}`, not `{-1, -0}`) |
| `neg(a)` | `{0 - a.re, 0 - a.im}` |
| `conj(a)` | `{a.re + 0, 0 - a.im}` (1.2.10) |
| `inv(a)` | `d = a.re^2 + a.im^2`; if `d === 0` return `{NaN, NaN}`; else `{a.re/d + 0, (0 - a.im)/d + 0}` (conj over modulus squared) |
| `scale(a, k)` | `{a.re k, a.im k}` |
| `abs(a)` | `Math.hypot(a.re, a.im)` (1.3.4) |
| `abs2(a)` | `a.re * a.re + a.im * a.im` |

### 5.4 Elementary functions

- `exp(a)`: `m = Math.exp(a.re)`; `{m cos(a.im), m sin(a.im)}`.
- `log(a)`: `{Math.log(hypot), Arg(a)}` (principal; `log(0) = {-Infinity, 0}`).
- `sqrt(a)` (principal, no trigonometry, exact real or imaginary part on the axes):
  1. `r = hypot(re, im)`; `if (r === 0) return {0, 0}`.
  2. `t = Math.sqrt((r + Math.abs(re)) / 2)`.
  3. `if (re >= 0) return { re: t, im: im / (2 t) }`.
  4. else `return { re: Math.abs(im) / (2 t), im: im < 0 ? -t : t }` (an `im` of `+0` or `-0` is not `< 0`, so a negative real number gets `+` imaginary part, matching `Arg = +pi`).
  Derivation in 6.1.
- `sin(a) = {sin(re) cosh(im), cos(re) sinh(im)}`; `cos(a) = {cos(re) cosh(im), -(sin(re) sinh(im))}`.

### 5.5 Powers, roots, branches

**`pow(a, n)`** (de Moivre, computed by exponentiation by squaring so Gaussian-integer powers are exact and an exact
`-pi` seam hit never becomes `-pi + 1e-16`)

1. `if (!Number.isInteger(n)) return powc(a, {re: n, im: 0})`.
2. `if (n === 0) return {1, 0}` (includes `pow(0, 0) = 1`).
3. `if (n < 0) return inv(pow(a, -n))` (so `pow(0, -1)` is `{NaN, NaN}`).
4. `result = {1, 0}; base = {a.re, a.im}; e = n;` `while (e > 0) { if (e % 2 === 1) result = mul(result, base); e = Math.floor(e / 2); if (e > 0) base = mul(base, base); }` (use `% 2`, never `& 1`, which breaks above 2^31).
5. `return result`.

The result equals `fromPolar(r^n, n theta)` to a relative 1e-9 for `n` in -7..12 on every sample (tested), and `Arg(pow({0,-1}, 2)) === Math.PI` exactly.

**`powc(a, w)`**: if `a` is `0 + 0i`: `w = 0` gives `{1, 0}`, `Re w > 0` gives `{0, 0}`, otherwise `{NaN, NaN}`. Else `exp(mul(w, log(a)))`.

**`rootsOf(c, n)`**

1. `needN(n, 'rootsOf')`.
2. `r = hypot(c)`; `if (r === 0)` return `n` fresh `{0, 0}`.
3. `rho = Math.pow(r, 1/n)`; `theta = Arg(c)`; for `k = 0..n-1` push `fromPolar(rho, (theta + TWO_PI k) / n)`.

Order is by `k`; angle of entry `k` is `(Arg c + 2 pi k)/n` unwrapped (for `c = -16`: `pi/4, 3pi/4, 5pi/4, 7pi/4`). Stations wrap with `wrapArg` for the home-step display (`-3pi/4`, `-pi/4`).
`rootsOfUnity(n) = rootsOf(ONE, n)`. `principalRoot(c, n)`: `needN`; `r = hypot(c)`; `if (r === 0) return {0, 0}`; `fromPolar(Math.pow(r, 1/n), Arg(c)/n)`.

**`branchArg(z, seam = -PI)`**: the unique `t` with `t = Arg(z) + 2 pi k`, `seam < t <= seam + 2 pi`.

1. `base = Arg(z)`.
2. `t = base + TWO_PI * (Math.floor((seam - base) / TWO_PI) + 1)`.
3. Rounding guard: `if (t <= seam) t += TWO_PI; else if (t > seam + TWO_PI) t -= TWO_PI`.
4. `return t`.

`branchArg(-1, 0) = pi`; `branchArg(1, 0) = 2 pi` (the positive axis is the top of the range (0, 2 pi]); `branchArg(1, -pi) = 0`; `branchArg(-i, 0) = 3pi/2`. For `seam = -pi` it equals `Arg(z)` for every `z` including the negative real axis.

**`branchRoot(c, n, seam = -PI)`**: `r = hypot(c)`; `if (r === 0) return {0, 0}`; `fromPolar(Math.pow(r, 1/n), branchArg(c, seam)/n)`. `n` is any non-zero number (stations use 2 to 5). `branchRoot(c, n, -pi)` equals `principalRoot(c, n)` for every `c`.

**`isPrimitiveRoot(k, n)`**: `if (!Number.isInteger(k) || !Number.isInteger(n) || n < 1) return false; return gcd(((k % n) + n) % n, n) === 1`. So `k = 0` is primitive only for `n = 1`.

**`quadraticRoots(a, b, c)`**: if `a` is `0 + 0i` return `[{NaN, NaN}, {NaN, NaN}]`. `disc = sub(mul(b, b), scale(mul(a, c), 4))`; `s = sqrt(disc)`; `den = scale(a, 2)`; return `[div(add(neg(b), s), den), div(sub(neg(b), s), den)]`. For `(1, -4, 13)`: `disc = -36`, `s = 6i`, result `[2 + 3i, 2 - 3i]`.

**`eq(a, b, eps = 1e-9)`**: `Math.hypot(a.re - b.re, a.im - b.im) <= eps` (false if any part is NaN). **`isFiniteC(a)`**: both parts `Number.isFinite`.

### 5.6 Numeric calculus

Let `k = 1 / (2h)`.

**`numericPartials(f, z0, h = 1e-5)`**: `needStep(h)`; evaluate `f` at `z0 + h`, `z0 - h`, `z0 + ih`, `z0 - ih` (four fresh objects);
`fx = ((f(z0+h) - f(z0-h)) k)`, `fy = ((f(z0+ih) - f(z0-ih)) k)`, componentwise on `re` and `im`. `fy` is the
partial derivative with respect to `y` of `f(x + iy)` (so `fy = u_y + i v_y`; for analytic `f`, `fy = i f'`).

**`jacobian`**: `{ ux: fx.re, uy: fy.re, vx: fx.im, vy: fy.im }`.

**`localLinear`**: `A = { re: (fx.re + fy.im)/2, im: (fx.im - fy.re)/2 }`, `B = { re: (fx.re - fy.im)/2, im: (fx.im + fy.re)/2 }`
(that is `A = (fx - i fy)/2`, `B = (fx + i fy)/2` written out; derivation in 6.1).

**`directionalQuotients(f, z0, rho = 1e-3, m = 72)`**: `needStep(rho)`; `m` positive integer else `RangeError`. `f0 = f(z0)`.
For `j = 0..m-1`: `phi = TWO_PI j / m`; `c = cos phi`, `s = sin phi`; `fz = f({re: z0.re + rho c, im: z0.im + rho s})`;
`dre = fz.re - f0.re`, `dim = fz.im - f0.im`; `q = { re: (dre c + dim s)/rho, im: (dim c - dre s)/rho }`
(dividing by `rho e^{i phi}` is multiplying by `e^{-i phi}/rho`); push `{phi, q}`. Cost: `m + 1` evaluations of `f`.

### 5.7 Formatting

**`fmtNum(x, digits = 3)`**

1. `NaN` returns `"undefined"`; `+Infinity` `"inf"`; `-Infinity` `"-inf"`.
2. `d = Math.min(12, Math.max(0, Math.round(digits)))`.
3. If `Math.abs(x) >= 1e15`: `[m, e] = x.toExponential(d).split('e')`; return `stripZeros(m) + 'e' + e` (for example `"1.5e+16"`).
4. Return `stripZeros(x.toFixed(d))`.
5. `stripZeros(s)`: if `s` contains `.`, delete trailing `0`s then a trailing `.`; if the result is `"-0"` return `"0"`.

Rounded-to-zero values print `0` with no sign (`fmtNum(-1e-7) = "0"`, `fmtNum(-0.0004) = "0"`, `fmtNum(-0.0005) = "-0.001"`).

**`fmtCart(z, digits = 3)`**

1. If either part is NaN return `"undefined"`; if either is infinite return `"inf"`.
2. `R = fmtNum(z.re, digits)`, `M = fmtNum(z.im, digits)` (decisions use the rounded strings).
3. `M === "0"`: return `R` (covers `"0"`).
4. `neg = M[0] === "-"`; `absM = neg ? M.slice(1) : M`; `coef = absM === "1" ? "" : absM`.
5. `R === "0"`: return `(neg ? "-" : "") + coef + "i"` (`"i"`, `"-i"`, `"2i"`, `"-0.5i"`).
6. Else return `R + (neg ? " - " : " + ") + coef + "i"` (`"3 - 2i"`, `"1 + i"`).
No fractions are attempted in plain text (`-11/17 - (10/17)i` prints `-0.647 - 0.588i`).

**`fmtPolar(z, digits = 3)`**

1. Non-finite handling as `fmtCart`.
2. `{r, theta} = toPolar(z)`; `R = fmtNum(r)`; if `R === "0"` return `"0"`.
3. `T = fmtNum(theta)`; if `T === "0"` return `R` (a positive real prints as its length).
4. `neg = T[0] === "-"`; `e = "e^(" + (neg ? "-" : "") + "i " + (neg ? T.slice(1) : T) + ")"`.
5. Return `R === "1" ? e : R + " " + e` (`"2 e^(i 2.094)"`, `"3.606 e^(-i 0.588)"`, `"e^(i 1.571)"`).

**`exactAngle(theta)`**: if not finite return `null`. For `q = 1..12` (ascending, so the first hit is in lowest terms):
`p = Math.round(theta q / PI) + 0`; if `Math.abs(p) <= 120 && Math.abs(theta - p PI / q) < 1e-9` return `{p, q}`. Return `null`.
(`exactAngle(0) = {p: 0, q: 1}`; `exactAngle(-PI) = {p: -1, q: 1}`.)

> Superseded in residue cleanup: the loop runs over `q = 1..12` and then `q = 18`: `exactAngle(5π/18)` is `{ p: 5, q: 18 }` and prints `0.873 (5pi/18)` beside `1.745 (5pi/9)`; π/13 to π/17, π/19, π/20, π/24 and π/36 stay decimals (a test finds no false positive among the numbers with at most three decimals over −6 to 6).

**`fmtAngle(theta, {digits = 3, pi = true, unicode = false} = {})`**: NaN returns `"undefined"`. If `pi`, `f = exactAngle(theta)`;
if `f`: `p = 0` returns `"0"`; else with `PIs = unicode ? "\u03c0" : "pi"` (the escape for U+03C0), `a = |p|`, `num = a === 1 ? PIs : a + PIs`,
`sign = p < 0 ? "-" : ""`: `q === 1` gives `sign + num`, else `sign + num + "/" + q` (`"2pi/3"`, `"-pi/3"`, `"pi"`, `"-5pi/6"`, `"31pi/6"`).
Otherwise `fmtNum(theta, digits)`.

**Exact-form detectors (private, used by `texNumber`)**; tolerance `tol(x) = EXACT_REL * Math.max(1, Math.abs(x))`:

- `asFraction(x)`: for `q = 1..24`: `p = Math.round(x q) + 0`; if `abs(x - p/q) <= tol(x)` return `{p, q}` (smallest `q` first, so lowest terms; `q = 1` is the integer test; `p = 0` is zero).
- `asSurd(x)`: for `s` in `[2, 3]`, for `q = 1..4`: `p = Math.round(x q / sqrt(s)) + 0`; if `p !== 0` and `abs(x - p sqrt(s)/q) <= tol(x)` return `{p, q, s}`.
- `asPiMultiple(x)`: for `q = 1..12`: `p = Math.round(x q / PI) + 0`; if `p !== 0`, `abs(p) <= 120` and `abs(x - p PI/q) <= tol(x)` return `{p, q}`.

**`texNumber(x, digits = 3)`** (the order is the contract: integer or fraction, then surd, then pi, then decimal)

1. NaN returns `\text{undefined}`; `+Infinity` `\infty`; `-Infinity` `-\infty`.
2. If `abs(x) <= 1e6`:
   a. `f = asFraction(x)`: `p = 0` returns `0`; `sign = p < 0 ? "-" : ""`, `a = abs(p)`; `q = 1` returns `sign + a`; else `sign + "\frac{" + a + "}{" + q + "}"`.
   b. `s = asSurd(x)`: `num = (a === 1 ? "" : a) + "\sqrt{" + s + "}"` with `a = abs(p)`; `q = 1` returns `sign + num`; else `sign + "\frac{" + num + "}{" + q + "}"`.
   c. `m = asPiMultiple(x)`: `num = (a === 1 ? "" : a) + "\pi"`; `q = 1` returns `sign + num`; else `sign + "\frac{" + num + "}{" + q + "}"`.
3. Return `fmtNum(x, digits)` (the minus is ASCII `-`, which KaTeX renders as a true minus).

The sign is always the first character of the returned string (callers split on it).

**`texAngle(theta, digits = 3)`**: NaN returns `\text{undefined}`; `f = exactAngle(theta)`: if `f`, `p = 0` returns `0`, else the pi form of step 2c with `f.p`, `f.q`; otherwise `fmtNum(theta, digits)` (or `texNumber` for the two infinities).

**`texCart(z, digits = 3)`**

1. Non-finite: any NaN returns `\text{undefined}`; any infinity returns `\infty`.
2. `R = texNumber(z.re, digits)`, `M = texNumber(z.im, digits)`; `M === "0"` returns `R`.
3. `neg = M[0] === "-"`; `absM = neg ? M.slice(1) : M`; `coef = absM === "1" ? "" : absM`.
4. `im = coef + (/(\\sqrt\{\d\}|\\pi)$/.test(coef) ? "\\,i" : "i")` (a thin space between a surd or pi and the `i`: `\sqrt{2}\,i`, `2\pi\,i`; none after integers, decimals or fractions: `3i`, `0.951i`, `\frac{10}{17}i`).
5. `R === "0"` returns `(neg ? "-" : "") + im`; else `R + (neg ? " - " : " + ") + im`.

**`texPolar(z, digits = 3)`**

1. Non-finite as `texCart`.
2. `{r, theta} = toPolar(z)`; `R = texNumber(r, digits)`; `R === "0"` returns `0`.
3. `T = texAngle(theta, digits)`; `T === "0"` returns `R`.
4. `neg = T[0] === "-"`; `absT = neg ? T.slice(1) : T`; `sp = /^\d/.test(absT) ? "\\," : ""` (a thin space only when the angle starts with a digit: `e^{i\,0.588}`, `e^{i\,2\pi}`; none before `\frac` or `\pi`).
5. `e = "e^{" + (neg ? "-" : "") + "i" + sp + absT + "}"`.
6. Return `R === "1" ? e : R + "\\," + e` (`2\,e^{i\frac{2\pi}{3}}`, `e^{-i\frac{\pi}{3}}`, `1024\,e^{-i\frac{\pi}{3}}`).

### 5.8 The parser

**Tokenizer** `tokenize(src)` (internal). Tokens `{type, value, pos, end, text}` with `pos`/`end` indices into the original string.
Types: `'num'`, `'var'`, `'const'`, `'func'`, `'op'` (value one of `+ - * / ^`), `'lparen'`, `'rparen'`, `'eof'`.

1. If `typeof src !== 'string'` throw M1 at 0. If `src.length > 400` throw M8 at 400.
2. `p = 0`. Loop while `p < src.length`; `ch = src[p]`:
   - whitespace (`/\s/`): `p++`.
   - digit or `.`: match `/^(\d+\.?\d*|\.\d+)/` on `src.slice(p)`; no match (a lone `.`) throws M6 at `p`; `end = p + match.length`; if `src[end] === '.'` throw M5 at `end`; `value = parseFloat`; not finite throws M7; push `num`.
   - letter or `π`: take the maximal run of `[A-Za-z]` and `π`. `segment(run, false)`: greedy longest match at each position against the name list sorted longest first (ties in this order: `conj Re Im abs arg Arg exp log sqrt sin cos`, then `i e pi`, then `z x y`, which gives `conj sqrt abs arg Arg exp log sin cos Re Im pi i e z x y`), `π` is its own `pi`. If it fails, `segment(run, true)` (case-insensitive, returns the canonical spelling): if that works throw M3 with `fixed` = the concatenated canonical names, else throw M2; both at run start with run length. Otherwise push one token per name (`func`, `const` or `var`, with exact `pos`/`end` inside the run).
   - `*` followed by `*`: one `^` op of width 2. `+`, `-`/U+2212/U+2013/U+2014 (as `-`), `*`/U+00D7/U+00B7/U+22C5/U+2219 (as `*`), `/`/U+00F7 (as `/`), `^`: one `op`.
   - U+00B2, U+00B3: push `^` then `num 2` or `num 3`, both at the same `pos`.
   - `(`, `)`: `lparen`, `rparen`.
   - anything else throws M4 at `p`, for the whole code point `cp = String.fromCodePoint(src.codePointAt(p))` (so an emoji is reported whole, with length `cp.length` = 2, and a lone surrogate half is never quoted): `cp` equal to the bar character gives the "Bars are not supported" sentence, U+221A the "root sign" sentence, `cp` matching `/^[\p{C}\p{Z}\p{M}]$/u` the "hidden character" sentence with `U+` and the upper-case hex code point padded to four digits (7.6 has the exact text), anything else the general M4 sentence quoting `cp`.
3. Push `eof` at `src.length` (text `""`).

**Parser** `parse(src)`: `toks = tokenize(src)`; if only `eof` throw M1 at 0. Recursive descent over the grammar of 4.3 with a depth counter (incremented on entering `expression`, a unary minus and an exponent; more than 80 throws M9 at the current token).

1. `expression()`: `left = term()`; while the next token is op `+` or `-`: consume, `left = {type:'bin', op, left, right: term()}`.
2. `term()`: `left = unary()`; loop: next is op `*` or `/` gives `{type:'bin', op, left, right: unary()}`; else if next is a `var`, `const`, `func` or `lparen` gives `{type:'bin', op:'*', implicit:true, left, right: power()}`; else stop. (A `num` is never an implicit factor.)
3. `unary()`: op `-` gives `{type:'neg', arg: unary()}`; op `+` is consumed and `unary()` returned; else `power()`.
4. `power()`: `base = atom()`; if the next token is op `^` consume it and return `{type:'bin', op:'^', left: base, right: unary()}`; else `base`.
5. `atom()`: remember `before` = previous token; consume `t`:
   - `num`, `const`, `var`: the leaf node.
   - `func`: next must be `lparen` else throw M10 at the function token; consume; `arg = expression()`; `close(lparen)`; node `call`.
   - `lparen`: `inner = expression()`; `close(t)`; return `inner`.
   - `rparen`: if `before` is a `lparen` throw M14 at that `(` with length `t.end - before.pos`; else if `before` is an `op` token throw M17 at the `)` (quoting `before.text`: the bracket has a partner, the operand is what is missing); else M13 (no operand before it, so nothing opened it: `)(`).
   - `eof`: throw M11 at `src.length`, quoting `before.text`.
   - any other token (`*`, `/`, `^`): throw M12 at the token.
6. `close(lp)`: next `rparen` is consumed; next `eof` throws M15 at `lp.pos`; anything else goes to `unexpected`.
7. `unexpected(t)`: `num` gives M16; `rparen` gives M13; anything else gives `I did not expect "{text}" here.` at the token (not reachable with this grammar; kept defensive).
8. After `expression()`, if the next token is not `eof` throw `unexpected(token)`.

**`toTex` (internal `tex(node) -> {s, lvl}`)**; levels: sum 1, product 2, unary minus 3, power 4, atom 5. `wrap(child, minLvl)` is `child.s` if `child.lvl >= minLvl`, else `\left(` + `child.s` + `\right)`.

> Superseded in residue cleanup: an operand that starts with a minus after an operator is bracketed: `--z` gives `-\left(-z\right)`, `z - -z` gives `z - \left(-z\right)`, `z + -3x` gives `z + \left(-3x\right)`, so two signs never touch; the values are unchanged.

| Node | TeX | level |
|---|---|---|
| `num` | integer: `String(v)`; else `fmtNum(v, 6)` | 5 |
| `const` | `i`, `e`, `\pi` | 5 |
| `var` | `z`, `x`, `y` | 5 |
| `neg` | `-` + `wrap(arg, 3)` | 3 |
| `+` | `L + R` | 1 |
| `-` | `L - ` + `wrap(R, 2)` | 1 |
| `/` | `\frac{L}{R}` | 2 |
| `^` | `wrap(L, 5)` + `^{R}` | 4 |
| `*` | `l = wrap(L, 2)`, `r = wrap(R, 3.5)`; juxtapose (`l + gap + r`) if `implicit`, or if the left node is a `num` and `r` does not start with a digit or `.`; else `l + " \cdot " + r`. `gap` is `\,` (a thin space) when `l` ends in a control word (`/\\[A-Za-z]+$/`, in practice `\pi`) and `r` starts with a letter (`/^[A-Za-z]/`), else empty: `\pi z` would be read as the unknown control word `\piz`, so `pi z` is `\pi\,z` | 2 |
| `call conj` | `\overline{a}` | 5 |
| `call abs` | `\left\|a\right\|` | 5 |
| `call sqrt` | `\sqrt{a}` | 5 |
| `call exp` | `e^{a}` | 4 |
| `call Re`, `Im`, `Arg` | `\operatorname{Re}\left(a\right)`, `\operatorname{Im}\left(a\right)`, `\operatorname{Arg}\left(a\right)` | 5 |
| `call arg`, `log`, `sin`, `cos` | `\arg\left(a\right)`, `\log\left(a\right)`, `\sin\left(a\right)`, `\cos\left(a\right)` | 5 |

(In the `call abs` row the two bars are plain `|` characters, escaped only so this markdown table renders: `toTex("abs(z)^2")` is `\left|z\right|^{2}`, see 7.5.4.)

**`compile(src)`**

1. If `cache.has(src)` return it.
2. `ast = parse(src)`.
3. `build(node) -> {f, c}` where `f(z)` returns `{re, im}` (may return `z` itself or a shared constant internally; never mutated) and `c` is the constant value or `null`:
   - `num`/`const`: `c = {re, im}` (`e` is `Math.E`, `pi` is `Math.PI`, `i` is `{0, 1}`); `f = () => c`.
   - `var z`: `f = (z) => z`; `x`: `(z) => ({re: z.re, im: 0})`; `y`: `(z) => ({re: z.im, im: 0})`; `c = null`.
   - any other node: build children, `g` = the operation (`neg`, the call's function, `add sub mul div`, `^` as in 4.3). `Re` is `w => ({re: w.re, im: 0})`, `Im` is `w => ({re: w.im, im: 0})`, `abs` is `w => ({re: abs(w), im: 0})`, `arg` and `Arg` are `w => ({re: Arg(w), im: 0})`, the rest are the `complex.js` functions. **Constant folding:** if every child has `c !== null`, evaluate once with `{0, 0}` and return `{f: () => value, c: value}`.
   - `^`: if the right child is constant with `im === 0` and an integer `re`, `f = (z) => pow(left.f(z), n)`; else if constant, `powc(left.f(z), w)`; else at run time `w = right.f(z); b = left.f(z)`, `pow(b, w.re)` when `w.im === 0 && Number.isInteger(w.re)`, else `powc(b, w)`.
4. `root = build(ast).f`. `f = (z) => { if (typeof z === 'number') z = {re: z, im: 0}; const w = root(z); return {re: w.re, im: w.im}; }` (a fresh object every call, so callers may keep or mutate results).
5. `uses` = the set of `var` names found in the AST. `tex` = `tex(ast).s`.
6. If `cache.size >= 64` delete the oldest key (`cache.keys().next().value`); `cache.set(src, result)`; return it.

`evaluate(src, z)` is `compile(src).f(z)`.

---

## 6. Mathematics

### 6.1 Every formula the modules use

Notation: `z = x + iy = r e^{i theta}`, `r = |z|`, `Arg z` in (-pi, pi].

| # | Formula | Used by |
|---|---|---|
| F1 | `r = sqrt(x^2 + y^2)`, `x = r cos(theta)`, `y = r sin(theta)`; `Arg z = atan2(y, x)`, with `Arg(negative real) = pi`, `Arg(0) = 0` | `toPolar`, `fromPolar`, `Arg` |
| F2 | Euler: `e^{i theta} = cos(theta) + i sin(theta)`; the dictionary between the two addresses | `expi`, `exp`, `texPolar` |
| F3 | Cartesian product `(x1 + i y1)(x2 + i y2) = (x1 x2 - y1 y2) + i (x1 y2 + x2 y1)`; polar product `r1 r2 e^{i(theta1 + theta2)}`; they are the same point | `mul`; test "mul in polar equals mul in Cartesian" |
| F4 | Quotient `(x1 x2 + y1 y2)/d + i (x2 y1 - x1 y2)/d`, `d = x2^2 + y2^2`; polar `(r1/r2) e^{i(theta1 - theta2)}` | `div` |
| F5 | `conj z = x - iy = r e^{-i theta}`; `z conj z = x^2 + y^2 = abs(z)^2`; `1/z = conj z / abs(z)^2 = (1/r) e^{-i theta}` | `conj`, `inv`, `abs2` |
| F6 | `wrapArg(t) = t - 2 pi ceil((t - pi)/(2 pi))`, then snapped into (-pi, pi]; every real `t` is `Arg z + 2 pi k` for some integer `k` (the staircase) | `wrapArg`, `argSet` |
| F7 | Principal square root without trigonometry. Solve `(a + bi)^2 = x + iy`: `a^2 - b^2 = x`, `2ab = y`, `a^2 + b^2 = r`. So `a^2 = (r + x)/2`, `b^2 = (r - x)/2`. Let `t = sqrt((r + abs(x))/2)`. If `x >= 0`: `a = t`, `b = y/(2t)`. If `x < 0`: `b = +-t` with the sign of `y` (positive for `y = 0`), `a = abs(y)/(2t)`. Principal means `a >= 0`, except on the negative axis where `b > 0` | `sqrt`, `quadraticRoots` |
| F8 | `sin(a + bi) = sin a cosh b + i cos a sinh b`; `cos(a + bi) = cos a cosh b - i sin a sinh b` | `sin`, `cos` |
| F9 | `log z = ln r + i Arg z`; `powc(a, w) = exp(w log a)` | `log`, `powc` |
| F10 | de Moivre: `z^n = r^n e^{i n theta}` for integer `n`, any sign; by squaring it is the same product | `pow` |
| F11 | n-th roots of `c = abs(c) e^{i Theta}`, `Theta = Arg c`: `abs(c)^{1/n} e^{i(Theta + 2 pi k)/n}`, `k = 0..n-1`. `k = n` repeats `k = 0`. Roots of unity: `e^{2 pi i k/n}`; they sum to 0 for `n >= 2` (geometric series); `e^{2 pi i k/n}` has multiplicative order `n / gcd(k, n)`, so it is primitive (Def 1.5.6) iff `gcd(k, n) = 1` | `rootsOf`, `rootsOfUnity`, `isPrimitiveRoot` |
| F12 | Quadratic formula `z = (-b +- sqrt(b^2 - 4ac))/(2a)`; completing the square `(z + b/(2a))^2 = (b^2 - 4ac)/(4a^2)`; Vieta: sum `-b/a`, product `c/a` | `quadraticRoots` |
| F13 | Branch range (seam sigma): the unique `t` with `t = Arg z + 2 pi k` and `sigma < t <= sigma + 2 pi` is `t = Arg z + 2 pi (floor((sigma - Arg z)/(2 pi)) + 1)`. Branch root `abs(c)^{1/n} e^{i t/n}`. Principal branch is `sigma = -pi`. Seam `0` is continuous across the negative real axis. Walking once around 0 on any branch jumps by `abs(1 - e^{2 pi i/n})` once (`sqrt(3)` for n = 3) at the seam | `branchArg`, `branchRoot` |
| F14 | Central differences: `f_x ~ (f(z + h) - f(z - h))/(2h)`, `f_y ~ (f(z + ih) - f(z - ih))/(2h)`, error `O(h^2)` plus rounding `O(eps/h)`: about `1e-10` at `h = 1e-5` for smooth `f` | `numericPartials` |
| F15 | Local linear form. `f(z0 + dz) ~ f(z0) + f_x dx + f_y dy`. With `dx = (dz + conj dz)/2`, `dy = (dz - conj dz)/(2i)`: `f ~ f(z0) + A dz + B conj(dz)`, `A = (f_x - i f_y)/2 = [(u_x + v_y) + i(v_x - u_y)]/2`, `B = (f_x + i f_y)/2 = [(u_x - v_y) + i(v_x + u_y)]/2` | `localLinear` |
| F16 | Direction `dz = rho e^{i phi}`: `(f(z0 + dz) - f(z0))/dz -> A + B e^{-2 i phi}`, a circle of centre `A`, radius `abs(B)`, traversed twice as `phi` goes once round; error `O(rho)`. Cauchy-Riemann `u_x = v_y`, `u_y = -v_x` is exactly `B = 0`, and then `f' = A = u_x + i v_x`. Therefore `2 abs(B) = hypot(u_x - v_y, v_x + u_y)` | `directionalQuotients`, `jacobian` |
| F17 | Exact forms: integer or `p/q` (`q <= 24`), `(p/q) sqrt 2` and `(p/q) sqrt 3` (`q <= 4`), `(p/q) pi` (`q <= 12`), within `1e-10 max(1, abs(x))`; angles `p pi/q` (`q <= 12`) within `1e-9` | `texNumber`, `exactAngle` |

### 6.2 Every covered review problem, solved in both addresses

Numbers are to 10 decimals; the `check` lines are asserted by the unit tests (section 7). Each problem ends with
the answer to the student's own question: which address makes it easy, and why.

#### 1.1.1 `z1 = 3 - 2i`, `z2 = -1 + 4i`: compute `z1 z2` and `z1/z2`

*Cartesian (slide bookkeeping).* `x1 = 3, y1 = -2, x2 = -1, y2 = 4`.
`x1 x2 - y1 y2 = -3 - (-8) = 5`; `x1 y2 + x2 y1 = 12 + 2 = 14`. So `z1 z2 = 5 + 14i`.
Division: multiply top and bottom by `conj z2 = -1 - 4i`, `|z2|^2 = 1 + 16 = 17`;
`(3 - 2i)(-1 - 4i) = -3 - 12i + 2i + 8 i^2 = -11 - 10i`. So `z1/z2 = -11/17 - (10/17) i = -0.6470588235 - 0.5882352941 i`.

*Polar (the independent check).* `|z1| = sqrt13 = 3.6055512755`, `Arg z1 = -atan(2/3) = -0.5880026035` (-33.69 degrees).
`|z2| = sqrt17 = 4.1231056256`, `Arg z2 = pi - atan 4 = 1.8157749899` (104.04 degrees).
Product: `r = sqrt13 sqrt17 = sqrt221 = 14.8660687473`, angle `-0.5880026035 + 1.8157749899 = 1.2277723864`
(= `atan(14/5)`, 70.35 degrees; the sum is already in (-pi, pi], so it is `Arg`). Quotient:
`r = sqrt(13/17) = 0.8744746322`, angle `-0.5880026035 - 1.8157749899 = -2.4037775934` (= `atan2(-10, -11)`, -137.73 degrees).

```check
mul(C(3,-2), C(-1,4)) => C(5, 14)
div(C(3,-2), C(-1,4)) => C(-11/17, -10/17)
abs(C(3,-2)) => 3.6055512755
Arg(C(3,-2)) => -0.5880026035
abs(C(-1,4)) => 4.1231056256
Arg(C(-1,4)) => 1.8157749899
abs(mul(C(3,-2), C(-1,4))) => 14.8660687473
Arg(mul(C(3,-2), C(-1,4))) => 1.2277723864
abs(div(C(3,-2), C(-1,4))) => 0.8744746322
Arg(div(C(3,-2), C(-1,4))) => -2.4037775934
Arg(C(3,-2)) + Arg(C(-1,4)) => 1.2277723864
Arg(C(3,-2)) - Arg(C(-1,4)) => -2.4037775934
```

*Which address.* Cartesian for the arithmetic: nothing to track but four products. Polar as the check: lengths
multiply and divide, angles add and subtract. Division is "unspin and shrink".

#### 1.1.2 `Im(conj(z1 - z2))`

*Cartesian.* `z1 - z2 = (3 + 1) + (-2 - 4)i = 4 - 6i`; `conj = 4 + 6i`; `Im = 6`.
*Polar.* `4 - 6i` has `r = sqrt52 = 7.2111025509`, `Arg = -atan(1.5) = -0.9827937232`; conjugation negates the angle,
so `conj` is `r e^{+i 0.9827937232}` and `Im = r sin(0.9827937232) = 7.2111025509 x 0.8320502943 = 6`.

```check
sub(C(3,-2), C(-1,4)) => C(4, -6)
conj(sub(C(3,-2), C(-1,4))) => C(4, 6)
conj(sub(C(3,-2), C(-1,4))).im => 6
abs(C(4,-6)) => 7.2111025509
Arg(C(4,6)) => 0.9827937232
abs(C(4,6)) * Math.sin(Arg(C(4,6))) => 6
```

*Which address.* Cartesian: two slides and a mirror (negate `y`). Polar says the same mirror as "negate the angle".

#### 1.3.1 `z = -1 + i sqrt3`: polar form, exponential form, `Arg z`

*Cartesian to polar.* `x = -1`, `y = sqrt3`: `r = sqrt(1 + 3) = 2`. The point is in the second quadrant; the reference angle is
`atan(sqrt3/1) = pi/3`, so `Arg z = pi - pi/3 = 2pi/3` (the bare `atan(y/x) = atan(-sqrt3) = -pi/3` is the classic wrong-quadrant trap;
`atan2` and `Arg` do the quadrant bookkeeping). `z = 2(cos 2pi/3 + i sin 2pi/3) = 2(-1/2 + i sqrt3/2)` returns the same point; exponential form `2 e^{i 2pi/3}`;
`Arg z = 2pi/3 = 2.0943951024` (120 degrees).
*The set.* `arg z = {2pi/3 + 2 pi k}`: `k = -1` gives `-4pi/3 = -4.1887902048`, `k = 1` gives `8pi/3 = 8.3775804096`.
Every one names the same point: `2 e^{-i 4pi/3} = 2(cos(4pi/3) - i sin(4pi/3)) = 2(-1/2 + i sqrt3/2)`.

```check
toPolar(C(-1, S3)) => {r: 2, theta: 2*PI/3}
fromPolar(2, 2*PI/3) => C(-1, S3)
Arg(C(-1, S3)) => 2.0943951024
argSet(C(-1, S3), {kMin: -1, kMax: 1}).map((e) => e.theta) => [-4.1887902048, 2.0943951024, 8.3775804096]
argSet(C(-1, S3), {kMin: -1, kMax: 1}).map((e) => fmtAngle(e.theta)) => ["-4pi/3", "2pi/3", "8pi/3"]
argSet(C(-1, S3)).every((e) => eq(fromPolar(2, e.theta), C(-1, S3))) => true
fmtCart(C(-1, S3)) => "-1 + 1.732i"
texCart(C(-1, S3)) => "-1 + \sqrt{3}\,i"
fmtPolar(C(-1, S3)) => "2 e^(i 2.094)"
texPolar(C(-1, S3)) => "2\,e^{i\frac{2\pi}{3}}"
```

*Which address.* Cartesian is where the dot is given; polar is the answer asked for. Convert once, read the quadrant.

#### 1.3.2 `(sqrt3 + i)^10` in the form `x + iy`

*Polar (native).* `b = sqrt3 + i`: `r = 2`, `Arg = atan(1/sqrt3) = pi/6`. `b^10 = 2^10 e^{i 10 pi/6} = 1024 e^{i 5pi/3}`; `5pi/3 > pi`, so wrap to the home step: `5pi/3 - 2pi = -pi/3`.
`1024(cos(-pi/3) + i sin(-pi/3)) = 1024(1/2 - i sqrt3/2) = 512 - 512 sqrt3 i = 512 - 886.8100134753 i`. `Arg = -pi/3`.
*Cartesian (the check, four multiplications).* `b^2 = 3 - 1 + 2 sqrt3 i = 2 + 2 sqrt3 i` (r = 4, angle pi/3); `b^4 = (2 + 2 sqrt3 i)^2 = 4 - 12 + 8 sqrt3 i = -8 + 8 sqrt3 i`
(r = 16, angle 2pi/3); `b^8 = (-8 + 8 sqrt3 i)^2 = 64 - 192 - 128 sqrt3 i = -128 - 128 sqrt3 i` (r = 256, angle -2pi/3, which is 4pi/3 wrapped);
`b^10 = b^8 b^2 = (-128 - 128 sqrt3 i)(2 + 2 sqrt3 i) = (-256 + 768) + (-256 sqrt3 - 256 sqrt3) i = 512 - 512 sqrt3 i`.

```check
pow(C(S3, 1), 10) => C(512, -512*S3)
Arg(pow(C(S3, 1), 10)) => -PI/3
abs(pow(C(S3, 1), 10)) => 1024
pow(C(S3, 1), 2) => C(2, 2*S3)
pow(C(S3, 1), 4) => C(-8, 8*S3)
pow(C(S3, 1), 8) => C(-128, -128*S3)
wrapArg(10*PI/6) => -PI/3
fmtCart(pow(C(S3, 1), 10)) => "512 - 886.81i"
texCart(pow(C(S3, 1), 10)) => "512 - 512\sqrt{3}\,i"
texPolar(pow(C(S3, 1), 10)) => "1024\,e^{-i\frac{\pi}{3}}"
```

*Which address.* Polar: ten spins of 30 degrees and ten stretches by 2 collapse to one line. Cartesian is the proof that wrapping 5pi/3 to -pi/3
is only renaming the step: both name the same move.

#### 1.4.1 The 5th roots of unity

*Polar (native).* `1 = 1 e^{i 0}`, `arg 1 = {2 pi k}`. `z^5 = 1` means `z = e^{i 2 pi k/5}`, `k = 0..4` (`k = 5` repeats `k = 0`): five points 72 degrees apart.

| k | angle | Cartesian | home-step Arg |
|---|---|---|---|
| 0 | 0 | `1` | `0` |
| 1 | 2pi/5 | `0.3090169944 + 0.9510565163 i` | `2pi/5` |
| 2 | 4pi/5 | `-0.8090169944 + 0.5877852523 i` | `4pi/5` |
| 3 | 6pi/5 | `-0.8090169944 - 0.5877852523 i` | `-4pi/5` |
| 4 | 8pi/5 | `0.3090169944 - 0.9510565163 i` | `-2pi/5` |

Exact: `cos 72 = (sqrt5 - 1)/4`, `cos 144 = -(sqrt5 + 1)/4`. The five sum to 0 (`1 + 2(0.3090169944) + 2(-0.8090169944) = 0`).
Primitive (Def 1.5.6): `5` is prime, so `k = 1..4` are primitive; `k = 0` is the number 1 itself (order 1).
*Cartesian route (why polar wins).* `z^5 - 1 = (z - 1)(z^4 + z^3 + z^2 + z + 1)`; the quartic is palindromic, `w = z + 1/z` gives `w^2 + w - 1 = 0`,
`w = (-1 +- sqrt5)/2 = 2 cos 72 or 2 cos 144`, then `z^2 - wz + 1 = 0` again. Correct, and a page long.

```check
rootsOfUnity(5)[1] => C(Math.cos(2*PI/5), Math.sin(2*PI/5))
rootsOfUnity(5)[1] => C(0.3090169944, 0.9510565163)
rootsOfUnity(5)[2] => C(-0.8090169944, 0.5877852523)
rootsOfUnity(5)[3] => C(-0.8090169944, -0.5877852523)
rootsOfUnity(5)[4] => C(0.3090169944, -0.9510565163)
rootsOfUnity(5).map((r) => abs(pow(r, 5))) => [1, 1, 1, 1, 1]
rootsOfUnity(5).map((r) => pow(r, 5)).every((p) => eq(p, 1)) => true
rootsOfUnity(5).reduce((s, r) => add(s, r)) => C(0, 0)
rootsOfUnity(5).map((r) => Arg(r)) => [0, 2*PI/5, 4*PI/5, -4*PI/5, -2*PI/5]
[0, 1, 2, 3, 4].map((k) => isPrimitiveRoot(k, 5)) => [false, true, true, true, true]
rootsOfUnity(5)[1].re => (Math.sqrt(5) - 1)/4
texPolar(rootsOfUnity(5)[1]) => "e^{i\frac{2\pi}{5}}"
texPolar(rootsOfUnity(5)[3]) => "e^{-i\frac{4\pi}{5}}"
```

*Which address.* Polar. A power equation is a statement about angles (multiply by 5 must give a full turn) and lengths. In Cartesian it is a quintic.

#### 1.4.2 The 4th roots of -16, in exponential and Cartesian form

*Polar (native).* `-16 = 16 e^{i pi}` (`Arg = pi`; `arg = {pi + 2 pi k}`). `|z| = 16^{1/4} = 2`; angles `(pi + 2 pi k)/4 = pi/4 + k pi/2`, `k = 0..3`:

| k | exponential | Cartesian | home-step Arg |
|---|---|---|---|
| 0 | `2 e^{i pi/4}` | `sqrt2 + sqrt2 i = 1.4142135624 + 1.4142135624 i` | `pi/4` |
| 1 | `2 e^{i 3pi/4}` | `-sqrt2 + sqrt2 i` | `3pi/4` |
| 2 | `2 e^{i 5pi/4}` | `-sqrt2 - sqrt2 i` | `-3pi/4` |
| 3 | `2 e^{i 7pi/4}` | `sqrt2 - sqrt2 i` | `-pi/4` |

Each root is the previous one turned by a quarter turn (multiplied by `i`). Check: `(sqrt2 + sqrt2 i)^2 = 2 - 2 + 4i = 4i`, `(4i)^2 = -16`.
*Cartesian route (two square roots).* `z^4 + 16 = 0` is `(z^2)^2 = -16`, so `z^2 = +-4i`; `sqrt(4i) = +-(sqrt2 + sqrt2 i)` since `(sqrt2 + sqrt2 i)^2 = 4i`;
`sqrt(-4i) = +-(sqrt2 - sqrt2 i)` since `(sqrt2 - sqrt2 i)^2 = -4i`. Same four points.

```check
rootsOf(C(-16, 0), 4) => [C(S2, S2), C(-S2, S2), C(-S2, -S2), C(S2, -S2)]
rootsOf(C(-16, 0), 4).map((r) => pow(r, 4)).every((p) => eq(p, -16)) => true
rootsOf(C(-16, 0), 4).map((r) => abs(r)) => [2, 2, 2, 2]
rootsOf(C(-16, 0), 4).map((r) => Arg(r)) => [PI/4, 3*PI/4, -3*PI/4, -PI/4]
argSet(C(-16, 0), {kMin: 0, kMax: 3}).map((e) => e.theta / 4) => [PI/4, 3*PI/4, 5*PI/4, 7*PI/4]
principalRoot(C(-16, 0), 4) => C(S2, S2)
texCart(rootsOf(C(-16, 0), 4)[2]) => "-\sqrt{2} - \sqrt{2}\,i"
texPolar(rootsOf(C(-16, 0), 4)[2]) => "2\,e^{-i\frac{3\pi}{4}}"
fmtPolar(rootsOf(C(-16, 0), 4)[0]) => "2 e^(i 0.785)"
```

*Which address.* Polar for finding them (divide the staircase of -16 by 4), Cartesian for writing them. The Cartesian two-step route also works, and shows why four roots appear (two square roots of two square roots).

#### 1.4.3 `z^2 - 4z + 13 = 0`

*Cartesian (native).* `a = 1, b = -4, c = 13`: `b^2 - 4ac = 16 - 52 = -36`; `z = (4 +- sqrt(-36))/2 = (4 +- 6i)/2 = 2 +- 3i`.
Completing the square: `(z - 2)^2 = -9`.
*Polar.* `-9 = 9 e^{i pi}`, so `z - 2 = 3 e^{i pi/2} = 3i` or `3 e^{i 3pi/2} = -3i` (the two square roots, the staircase halved). The roots are a mirror pair:
`r = sqrt13 = 3.6055512755`, `Arg = +-atan(3/2) = +-0.9827937232`. Vieta: sum `4 = -b/a`; product `r^2 = 13 = c/a`.

```check
quadraticRoots(1, -4, 13) => [C(2, 3), C(2, -3)]
add(quadraticRoots(1, -4, 13)[0], quadraticRoots(1, -4, 13)[1]) => C(4, 0)
mul(quadraticRoots(1, -4, 13)[0], quadraticRoots(1, -4, 13)[1]) => C(13, 0)
sqrt(C(-36, 0)) => C(0, 6)
Arg(C(2, 3)) => 0.9827937232
abs(C(2, 3)) => 3.6055512755
texPolar(C(2, 3)) => "3.606\,e^{i\,0.983}"
```

*Which address.* Cartesian: the formula is native and one line. Polar explains the disguise: the root of a negative number is a quarter turn.

#### 2.2.2 Principal value of `(2i)^{1/2}`

*Polar (native).* `|2i| = 2`, `Arg(2i) = pi/2` (the home step). Principal: `|w|^{1/2} e^{i Arg(w)/2} = sqrt2 e^{i pi/4} = sqrt2 (sqrt2/2 + i sqrt2/2) = 1 + i`.
The other square root, `-1 - i = sqrt2 e^{i 5pi/4}`, comes from the step `pi/2 + 2 pi` and is not principal.
*Cartesian.* `(a + bi)^2 = 2i` gives `a^2 - b^2 = 0`, `2ab = 2`, so `a = b`, `a^2 = 1`: `+-(1 + i)`. Principal takes the positive real part: `1 + i`. Check `(1 + i)^2 = 2i`.

```check
principalRoot(C(0, 2), 2) => C(1, 1)
sqrt(C(0, 2)) => C(1, 1)
rootsOf(C(0, 2), 2)[1] => C(-1, -1)
Arg(C(0, 2)) => PI/2
abs(C(0, 2)) => 2
pow(C(1, 1), 2) => C(0, 2)
texPolar(principalRoot(C(0, 2), 2)) => "\sqrt{2}\,e^{i\frac{\pi}{4}}"
texCart(principalRoot(C(0, 2), 2)) => "1 + i"
principalRoot(C(-8, 0), 3) => C(1, S3)
```

(The last line is the surprise worth knowing: the principal cube root of -8 is `1 + sqrt3 i`, not `-2`.)

*Which address.* Polar: "halve the length's exponent and the angle", home step only.

#### 2.4.1 A branch of `z^{1/3}` continuous along the negative x-axis

*Polar (native).* A branch picks one step of the staircase at every point, continuously. Walking once around 0 advances the step by one, so no branch is continuous on a loop around 0:
cut the plane along a ray from 0. The principal branch (steps in `(-pi, pi]`) has its cut on the negative real axis, so it is discontinuous exactly where the problem needs continuity.
Move the cut: take steps in `(0, 2 pi]` (seam `sigma = 0`), i.e. `f(z) = r^{1/3} e^{i theta/3}`, `0 < theta <= 2 pi`.
On the negative axis `theta = pi` and `f(-r) = r^{1/3} e^{i pi/3} = r^{1/3}(1/2 + i sqrt3/2)`; at `z = -1`, `f = 0.5 + 0.8660254038 i`.
Approaching `-1` from above (`theta = pi - epsilon`) or below (`theta = pi + epsilon`) both tend to `e^{i pi/3}`: continuous.
For comparison the principal branch gives `e^{i pi/3}` from above and `e^{-i pi/3}` from below, a jump of `2 sin(pi/3) = sqrt3 = 1.7320508076`. The new branch jumps by the same amount across the positive real axis (its cut).
*Cartesian description.* `f(x + iy) = (x^2 + y^2)^{1/6}(cos(theta/3) + i sin(theta/3))` with `theta = atan2(y, x)` in `(0, pi)` for `y > 0`; `theta = pi` on the negative axis; `theta = atan2(y, x) + 2 pi` in `(pi, 2 pi)` for `y < 0`; and `theta = 2 pi` on the positive axis (the top of the range).

```check
branchRoot(C(-1, 0), 3, 0) => C(0.5, S3/2)
branchRoot(C(-1, 0), 3, -PI) => C(0.5, S3/2)
branchRoot(C(-1, 1e-9), 3, 0) => C(0.5, S3/2)
branchRoot(C(-1, -1e-9), 3, 0) => C(0.5, S3/2)
branchRoot(C(-1, -1e-12), 3, 0).im > 0.8 => true
branchRoot(C(-1, -1e-12), 3, -PI).im < 0 => true
abs(sub(branchRoot(C(-1, 1e-9), 3, -PI), branchRoot(C(-1, -1e-9), 3, -PI))) => S3
branchArg(C(-1, 0), 0) => PI
branchArg(C(1, 0), 0) => 2*PI
branchArg(C(0, -1), 0) => 3*PI/2
branchArg(C(1, 0), -PI) => 0
branchRoot(C(1, 0), 3, 0) => C(-0.5, S3/2)
texCart(branchRoot(C(-1, 0), 3, 0)) => "\frac{1}{2} + \frac{\sqrt{3}}{2}i"
```

*Which address.* Polar. The problem is a statement about which step to choose; there is no sensible Cartesian way to say it.

#### 3.1.1 `f(z) = z^2 + z` is differentiable everywhere; find `f'`

*Cartesian (with `h = dx + i dy`).* `(f(z + h) - f(z))/h = ((z + h)^2 + (z + h) - z^2 - z)/h = (2zh + h^2 + h)/h = 2z + 1 + h`. As `h -> 0` (any direction) this tends to `2z + 1`: `f'(z) = 2z + 1`.
*Polar (`h = rho e^{i phi}`).* The quotient is `2z + 1 + rho e^{i phi}`: a circle of radius `rho` around `2z + 1`, which shrinks to the single point `2z + 1` for every `phi`. In the language of F15, `A = 2z + 1` and `B = 0`.
At `z0 = 1 + i`: `f' = 3 + 2i = sqrt13 e^{i 0.5880026035}`: near `1 + i` the map stretches by `3.6056` and spins by `33.69` degrees.

```check
compile("z^2 + z").f(C(1,1)) => C(1, 3)
localLinear(compile("z^2 + z").f, C(1,1)).A => C(3, 2)
abs(localLinear(compile("z^2 + z").f, C(1,1)).B) < 1e-6 => true
numericPartials(compile("z^2 + z").f, C(1,1)).fx => C(3, 2)
numericPartials(compile("z^2 + z").f, C(1,1)).fy => C(-2, 3)
directionalQuotients(compile("z^2 + z").f, C(1,1), 1e-3, 4).map((e) => e.q).map((q) => Math.round(q.re*1000)/1000 + "," + Math.round(q.im*1000)/1000) => ["3.001,2", "3,2.001", "2.999,2", "3,1.999"]
abs(C(3, 2)) => 3.6055512755
Arg(C(3, 2)) => 0.5880026035
```

*Which address.* Cartesian: the difference quotient is algebra. Polar adds the picture: every direction `phi` gives the same limit.

#### 3.1.2 `f(z) = |z|^2` is differentiable only at 0

*Cartesian.* `(|z + h|^2 - |z|^2)/h`. Take `h = t` real: `(2xt + t^2)/t = 2x + t -> 2x`. Take `h = it`: `(2yt + t^2)/(it) = -i(2y + t) -> -2iy`.
Differentiability needs these equal: `2x = -2iy`, so `x = y = 0`. At `0`: `(f(h) - f(0))/h = |h|^2/h = conj h -> 0`, so `f'(0) = 0`. Nowhere else, so no disk of differentiability: nowhere analytic.
*Polar.* `|z + h|^2 - |z|^2 = z conj h + conj z h + |h|^2`; divide by `h = rho e^{i phi}`: `conj z + z e^{-2 i phi} + conj h`. As `rho -> 0` the value depends on `phi`
unless `z = 0`: a circle of centre `conj z` and radius `|z|` (F16: `A = conj z`, `B = z`). At `z0 = 1 + i`: centre `1 - i`, radius `sqrt2 = 1.4142135624`; `phi = 0` gives `2` (= `2x`), `phi = pi/2` gives `-2i` (= `-2iy`).

```check
localLinear(compile("abs(z)^2").f, C(1,1)).A => C(1, -1)
localLinear(compile("abs(z)^2").f, C(1,1)).B => C(1, 1)
abs(localLinear(compile("abs(z)^2").f, C(1,1)).B) => 1.4142135624
localLinear(compile("abs(z)^2").f, C(0,0)).A => C(0, 0)
localLinear(compile("abs(z)^2").f, C(0,0)).B => C(0, 0)
directionalQuotients(compile("abs(z)^2").f, C(1,1), 1e-3, 4).map((e) => e.q).map((q) => Math.round(q.re*10)/10 + "," + Math.round(q.im*10)/10) => ["2,0", "0,-2", "2,0", "0,-2"]
abs(sub(directionalQuotients(compile("abs(z)^2").f, C(1,1), 1e-3, 8)[3].q, add(conj(C(1,1)), mul(C(1,1), expi(-2*(2*PI*3/8)))))) < 2e-3 => true
```

*Which address.* Polar, with `h = rho e^{i phi}`: the direction dependence is visible as a circle. Cartesian gives the same fact in two lines, with the real and imaginary directions.

#### P1 `conj(z1) conj(z2) = conj(z1 z2)`

*Cartesian.* `(x1 - i y1)(x2 - i y2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1)`, and `z1 z2 = (x1 x2 - y1 y2) + i(x1 y2 + x2 y1)` has conjugate `(x1 x2 - y1 y2) - i(x1 y2 + x2 y1)`. Equal.
With `z1 = 3 - 2i`, `z2 = -1 + 4i`: `(3 + 2i)(-1 - 4i) = -3 - 12i - 2i - 8 i^2 = 5 - 14i`; `conj(5 + 14i) = 5 - 14i`.
*Polar.* `conj z = r e^{-i theta}`: `r1 r2 e^{-i theta1} e^{-i theta2} = r1 r2 e^{-i(theta1 + theta2)} = conj(r1 r2 e^{i(theta1 + theta2)})`. One line.

```check
mul(conj(C(3,-2)), conj(C(-1,4))) => C(5, -14)
conj(mul(C(3,-2), C(-1,4))) => C(5, -14)
```

*Which address.* Polar is one line (a mirror negates angles, and `-theta1 - theta2 = -(theta1 + theta2)`); Cartesian is expand-and-compare.

#### P2 `|z| = sqrt(z conj z)`

*Cartesian.* `(x + iy)(x - iy) = x^2 + y^2 + i(-xy + xy) = x^2 + y^2`, a non-negative real, whose square root is `|z|`. With `z = 3 - 2i`: `(3 - 2i)(3 + 2i) = 9 + 4 = 13`, `sqrt13 = |z|`.
*Polar.* `r e^{i theta} r e^{-i theta} = r^2`: the spin and the unspin cancel and only length times length is left.

```check
mul(C(3,-2), conj(C(3,-2))) => C(13, 0)
abs2(C(3,-2)) => 13
Math.sqrt(mul(C(3,-2), conj(C(3,-2))).re) => abs(C(3,-2))
abs(C(3,-2)) => 3.6055512755
```

*Which address.* Polar: spin and unspin cancel. Cartesian: the cross terms cancel.

#### P6 `f(z) = Re z` is not differentiable

*Cartesian.* `(Re(z + h) - Re z)/h = Re(h)/h = dx/(dx + i dy)`. Along real `h`: `1`. Along imaginary `h`: `0`. Two different limits at every `z`: no derivative anywhere.
*Polar.* `Re(h)/h = rho cos(phi)/(rho e^{i phi}) = cos(phi) e^{-i phi} = 1/2 + (1/2) e^{-2 i phi}`: a circle of centre `1/2` and radius `1/2` through `0` (phi = pi/2) and `1` (phi = 0). F15: `A = B = 1/2`.

```check
localLinear(compile("Re(z)").f, C(0.3,-0.7)).A => C(0.5, 0)
localLinear(compile("Re(z)").f, C(0.3,-0.7)).B => C(0.5, 0)
directionalQuotients(compile("Re(z)").f, C(0.3,-0.7), 1e-3, 4).map((e) => e.q).map((q) => Math.round(q.re*10)/10 + "," + Math.round(q.im*10)/10) => ["1,0", "0,0", "1,0", "0,0"]
```

*Which address.* Either. Polar shows why: `Re` is a squash onto the real axis, not a spin-and-stretch, so the quotient depends on direction.

### 6.3 Hand-check of the derived constants used as test expectations

`sqrt221 = 14.8660687473`; `sqrt(13/17) = 0.8744746322`; `atan(2/3) = 0.5880026035`; `atan 4 = 1.3258176637`;
`atan(14/5) = 1.2277723864`; `atan(10/11) = 0.7378150601`, so `atan2(-10, -11) = -pi + 0.7378150601 = -2.4037775934`;
`sqrt29 = 5.3851648071`; `512 sqrt3 = 886.8100134753`; `cos(2pi/5) = 0.3090169944`, `sin(2pi/5) = 0.9510565163`,
`cos(4pi/5) = -0.8090169944`, `sin(4pi/5) = 0.5877852523`; `i^i = e^{-pi/2} = 0.2078795764`.

---

## 7. Verification plan

### 7.1 Commands and what passing looks like

| Command (from the repo root) | Passing looks like |
|---|---|
| `node --test tests/unit/i1-core-math.test.mjs` | TAP summary `# fail 0` and `# pass 31` (U1 to U31 below; more subtests are fine, fewer are not) |
| `node --test tests/unit/*.test.mjs` | `# fail 0` over every unit file (the shell expands the glob). **Do not use `npm test` as evidence for this goal:** on Node 22.22 it fails before running anything (Appendix C, request 1). |
| `node tools/smoke.mjs --route home --script tests/interact/i1-core-math.mjs --no-shots` | per viewport, four log lines starting `i1-core-math` and `ok home (desktop)` / `ok home (phone)` (section 7.8) |

The two inspection commands (A6). The first must print nothing. The second must print nothing for `complex.js` and exactly one line (the import of `./complex.js`) for `parse.js`:

```
grep -nE "\b(document|window|localStorage|sessionStorage|requestAnimationFrame|setTimeout|setInterval|fetch|navigator|Intl|toLocaleString|Math\.random)\b" js/core/complex.js js/core/parse.js
grep -nE "^\s*import\s|import\(" js/core/complex.js js/core/parse.js
```

### 7.2 Acceptance criterion to verification

| Criterion | Statement | Verified by |
|---|---|---|
| A1 | arithmetic and conversions give the handout answers | `node --test tests/unit/i1-core-math.test.mjs`, tests U1 to U8 (values: section 6.2 `check` blocks for 1.1.1, 1.1.2, 1.3.1, P1, P2; the polar-equals-Cartesian property; `Arg`/`wrapArg`/`argSet` rows) |
| A2 | powers and roots | same command, U9 to U16 (1.3.2, 1.4.1, 1.4.2, 1.4.3, 2.2.2, 2.4.1 rows of section 6.2; `isPrimitiveRoot` against the multiplicative-order definition; branch walk) |
| A3 | numeric calculus reproduces the A/B decomposition | same command, U17 and U18 (3.1.1, 3.1.2, P6 rows; `2 abs(B) = hypot(...)`) |
| A4 | formatting recognises exact forms, ASCII minus | same command, U19 to U21 (section 7.4 tables) |
| A5 | parser compiles the catalogue and evaluates pinned values | same command, U22 to U27, U30 (sections 7.5, 7.6) |
| A6 | both modules are pure | same command, U28 and U29, plus the two `grep` commands above |
| (browser parity, extra) | same pinned values in Chromium, TeX accepted by the page's KaTeX, speed budget | the smoke command above (section 7.8) |

### 7.3 `tests/unit/i1-core-math.test.mjs`

Imports: `node:test` (`test`), `node:assert/strict`, `node:fs`, `node:vm`, `node:url`, everything from `../../js/core/complex.js`, and
`parse compile evaluate toTex ParseError` from `../../js/core/parse.js`. One `test(...)` per U-id below.

Helpers and constants (define at the top):

```
PI = Math.PI;  S2 = Math.SQRT2;  S3 = Math.sqrt(3);  z1 = C(3, -2);  z2 = C(-1, 4)
approx(a, b, tol = 1e-9)  = |a - b| <= tol * max(1, |b|)
approxC(z, w, tol = 1e-9) = hypot(z.re - w.re, z.im - w.im) <= tol * max(1, hypot(w.re, w.im))     // modulus-relative on purpose
sameAngle(a, b, tol = 1e-9) = |wrapArg(a - b)| < tol                                               // robust at the seam
okC(z, w, tol, msg) / okN(a, b, tol, msg): assert.ok(approxC / approx, message includes both values)
SAMPLES = [C(3,-2), C(-1,4), C(-1,S3), C(S3,1), C(0.3,-0.7), C(-2,-0.5), C(0,2), C(-3,0), C(1e-3,2e-3), C(5,5), C(-1,1), C(-1,2)]
```

Why `approxC` is modulus-relative: `pow(5 + 5i, 8)` is exactly `6250000` by squaring while de Moivre gives `6250000 - 1.5e-9 i`
(`sin(2 pi)` is `-2.4e-16`); a component-wise absolute tolerance would reject the more accurate answer.

**A1**

- **U1 handout arithmetic.** The 1.1.1 and 1.1.2 rows of section 6.2 (`mul`, `div`, `abs` of the product, `sub`, `conj`, `.im = 6`), `abs(sub(C(4,3), C(-1,1))) = sqrt29`; `add(z1, z2) = C(2,2)`; `scale(C(1,-2), 3) = C(3,-6)`; `mul(C(1,1), C(1,1)) = C(0,2)`; `inv(C(1,1)) = C(0.5,-0.5)`; `neg(C(1,-1)) = C(-1,1)`;
  `Object.is(neg(ZERO).re, 0)` and `.im` (no negative zero); `div(ONE, ZERO)` and `inv(ZERO)` have NaN parts; for every sample `conj(conj(z)) = z` and `inv(z) = div(ONE, z)` (1e-9).
- **U2 bare reals are accepted.** `mul(2, C(1,1)) = C(2,2)`; `add(1, 2) = C(3,0)`; `div(1, C(0,1)) = C(0,-1)`; `Arg(-1) === PI`; `Arg(0) === 0`; `abs(-3) === 3`; `abs2(-3) === 9`; `conj(5)`, `neg(5)`, `inv(4) = C(0.25,0)`, `scale(2, 3) = C(6,0)`;
  `toPolar(-1)` is `{r: 1, theta: PI}`; `pow(2, 3) = C(8,0)`; `powc(2, 0.5) = C(S2,0)`; `sqrt(-4) = C(0,2)`; `exp(0) = ONE`; `log(1) = ZERO`; `rootsOf(-16, 4)` equals `rootsOf(C(-16,0), 4)`; `principalRoot(-16, 4) = C(S2,S2)`;
  `branchRoot(-1, 3, 0) = C(0.5, S3/2)`; `branchArg(-1, 0) = PI`; `quadraticRoots(1, -4, 13)[0] = C(2,3)`; `eq(1, 1 + 1e-12)`; `isFiniteC(2)`, `!isFiniteC(NaN)`; `argSet(-1, {kMin:0, kMax:0})[0].theta === PI`;
  `localLinear((z) => mul(z, z), 0.5).A = C(1,0)` (1e-6); `fmtCart(2) === "2"`, `texCart(-2) === "-2"`, `fmtPolar(-1) === "e^(i 3.142)"`, `texPolar(-1) === "e^{i\pi}"`.
- **U3 constants and constructor.** `Object.isFrozen(ZERO)`, `ONE`, `I`; `I` is `{re:0, im:1}`; `C(3)` is `{re:3, im:0}`; `C(3,-2)` is `{re:3, im:-2}` (`assert.deepEqual` on spread copies).
- **U4 two addresses.** `toPolar(C(-1,S3))` is `{r: 2, theta: 2 PI/3}`; `fromPolar(2, 2 PI/3) = C(-1,S3)`; round trip `fromPolar(toPolar(z))` equals `z` (1e-12) for every sample;
  for every ordered pair `(a, b)` of samples: `fromPolar(r_a r_b, theta_a + theta_b) = mul(a, b)` (1e-9; "mul in polar equals mul in Cartesian"), `abs(mul(a,b)) = abs(a) abs(b)`, `abs(div(a,b)) = abs(a)/abs(b)`, `sameAngle(Arg(mul(a,b)), Arg(a) + Arg(b))`, `sameAngle(Arg(div(a,b)), Arg(a) - Arg(b))`.
- **U5 `Arg` and `wrapArg`.** `Arg(C(-1,0)) === PI` and `Arg({re:-1, im:-0}) === PI` and `Arg(C(0,0)) === 0` and `Arg({re:0, im:-0}) === 0` and `Arg(C(1,0)) === 0` (all with `===`); `Arg(C(0,1)) = PI/2`; `Arg(C(0,-1)) = -PI/2`;
  `Arg(C(-1,-1e-12))` is in `(-PI, 0)` (principal jump); `Arg(C(-1,1e-12))` is in `(3.14, PI)`; `Arg(C(-1,-1e-17)) === PI` (never `-PI`).
  `wrapArg(5 PI/3) = -PI/3`; `wrapArg(PI) === PI`; `wrapArg(-PI) === PI`; `wrapArg(0) === 0`; `wrapArg(3 PI) = PI`; `wrapArg(-3 PI) = PI`; `wrapArg(7 PI/2) = -PI/2`; `wrapArg(-7 PI/2) = PI/2`; `wrapArg(2 PI + 0.1) = 0.1`; `wrapArg(-2 PI - 0.1) = -0.1`;
  `wrapArg(NaN)` and `wrapArg(Infinity)` are NaN. For `t = 0.0317 k + 0.001`, `k = -400..400`: the result is in `(-PI, PI]`, `wrapArg(w) === w` (idempotent) and `sameAngle(w, t)`.
  **Seam snap** (kills a mutant that deletes the `SEAM_SNAP` line): for `k` in `-100, -7, -3, -2, -1, 1, 2, 3, 5, 100`, `wrapArg(-PI + 1e-13 + 2 PI k) === PI` (off the seam by more than rounding but under `1e-12`) while `wrapArg(-PI + 1e-9 + 2 PI k)` is still next to `-PI` (below `-3.14`, not snapped); for `k = -400..400`, `|wrapArg(2 PI k - PI) - PI| < 1e-12`.
- **U6 `argSet`.** For `z = C(-1,S3)`: `{kMin:-1, kMax:1}` has `k = [-1,0,1]` and thetas `[2PI/3 - 2PI, 2PI/3, 2PI/3 + 2PI]`; the default has `k = [-2,-1,0,1,2]` and `argSet(z)[2].theta === Arg(z)`;
  every entry satisfies `fromPolar(abs(z), theta) = z` (1e-9: all steps reach the one point); `{kMin:2, kMax:1}` gives `[]`; `{kMin:-0.5, kMax:1.5}` gives `k = [0,1]` and `assert.deepEqual` on the `k` array (no `-0`); a span of 200000 throws `RangeError`.
- **U7 proofs P1 and P2.** `mul(conj(a), conj(b)) = conj(mul(a, b))` for all ordered sample pairs (1e-12); `mul(conj(z1), conj(z2)) = C(5,-14)`; `abs2(z1) = 13`; `mul(z1, conj(z1))` is `C(13,0)` with `.re === 13`; `abs(z) = sqrt(mul(z, conj(z)).re)` for every sample (1e-12).
- **U8 elementary functions.** `exp(C(0,PI)) = C(-1,0)`; `exp(ZERO) = ONE`; `log(C(-1,0)) = C(0,PI)`; `log(I) = C(0,PI/2)`; `log(ZERO).re === -Infinity`; for every sample `exp(log(z)) = z` and `mul(sqrt(z), sqrt(z)) = z` (1e-12);
  `assert.deepEqual(sqrt(C(-4,0)), {re:0, im:2})` and `sqrt({re:-4, im:-0})` the same; `sqrt(C(-4,-1e-12)).im < 0`; `sqrt(C(0,2)) = C(1,1)`; `sqrt(ZERO)` is `{0,0}`; `sin(ZERO) = ZERO`, `cos(ZERO) = ONE`, `cos(C(PI,0)) = C(-1,0)`, `sin(C(0,PI/2)) = C(0, sinh(PI/2))`;
  `sin(z)^2 + cos(z)^2 = ONE` for the first six samples; `expi(PI) = C(-1,0)`; `eq(C(1,1), C(1+1e-12,1))`, `!eq(C(1,1), C(1.001,1))`, `eq(C(1,1), C(1.001,1), 1e-2)`, `!eq(C(NaN,0), C(NaN,0))`; `isFiniteC` true for `C(1,2)`, false for `C(NaN,0)` and `C(0,Infinity)`.

- **U31 no negative zero.** `div(1, -1)` and `div(0, -1)` `deepEqual` `{re:-1, im:0}` and `{re:0, im:0}` (strict `deepEqual` tells `-0` from `0`) and `Object.is(div(1,-1).im, 0)`; `pow(C(0,-1), 2)` and `pow(C(0,-1), -2)` are `{re:-1, im:0}`; `mul(C(0,-1), C(0,1))` is `{re:1, im:0}`; `inv({re:-0, im:1})` is `{re:0, im:-1}`; `inv({re:1e300, im:1e-300})` is `{re:0, im:0}` (an underflowing quotient); `conj({re:-0, im:0})` is `{re:0, im:0}`; `Object.is(Arg({re:1e300, im:-5e-324}), 0)`, the same for `toPolar(...).theta`, and `Arg({re:-1e300, im:-5e-324}) === PI`; for every sample and a few axis points, `mul`, `div`, `inv`, `conj`, `neg` and `pow(a, n)` (`n` in `-3, -2, -1, 2, 3, 4`) have no component that is `-0`.

**A2**

- **U9 `pow`.** The 1.3.2 row (to 1e-6 as the goal states; the design value is accurate to 1e-12), `Arg` to 1e-9, `abs = 1024`, `pow(b,2)`, `pow(b,4)`, `pow(b,8)`; `pow(C(1,1),2) = C(0,2)`; `pow(ZERO,0) = ONE`; `pow(C(2,3),0) = ONE`; `pow(ZERO,3) = ZERO`; `pow(ZERO,-1)` has NaN parts; `pow(C(2,0),-2) = C(0.25,0)`; `pow(I,4) = ONE`; `pow(C(1,1),-2) = C(0,-0.5)`;
  `Arg(pow(C(0,-1), 2)) === PI` (exact on the seam); for every sample and every `n` in `-7..12`: `pow(a, n)` equals `fromPolar(r^n, n theta)` (modulus-relative 1e-9); `pow(C(1,1), 1.5) = powc(C(1,1), C(1.5,0))` (1e-12); `pow(C(0,1), 1e10) = pow(C(0,1), 1e10 % 4)` (no 32-bit overflow).
- **U10 `powc`.** `powc(C(-1,0), C(0.5,0)) = I`; `powc(C(2,0), C(3,0)) = C(8,0)`; `powc(I, I) = C(exp(-PI/2), 0)` (= 0.2078795764, the principal value of `i^i`); `powc(ZERO, C(2,0)) = ZERO`; `powc(ZERO, ZERO) = ONE`; `powc(ZERO, C(-1,0))` and `powc(ZERO, C(0,1))` have NaN parts; `powc(C(-1,0), C(1/3,0)) = C(0.5, S3/2)`; `powc(C(2,1), 3) = pow(C(2,1), 3)` (1e-12).
- **U11 `rootsOf`, 1.4.2.** Length 4; entries equal `[C(S2,S2), C(-S2,S2), C(-S2,-S2), C(S2,-S2)]`; each `pow(root, 4) = C(-16,0)`; each `abs = 2`; `root[(k+1) % 4] = mul(root[k], I)` for all k (consecutive roots differ by a quarter turn); `principalRoot(C(-16,0), 4) = C(S2,S2)`.
- **U12 `rootsOfUnity`, 1.4.1.** `r[1] = C(cos(2PI/5), sin(2PI/5))` (1e-12); `r[0] = ONE`; `r[2] = C(-0.8090169943749475, 0.5877852522924731)`; `r[3] = C(-0.8090169943749475, -0.5877852522924731)`; `r[4] = C(0.30901699437494745, -0.9510565162951535)`;
  `r[1].re = (sqrt5 - 1)/4`, `r[2].re = -(sqrt5 + 1)/4`; every `pow(w, 5) = ONE` and `abs(w) = 1`; the sum is `ZERO`; for `n = 2..12` the sum of `rootsOfUnity(n)` is `ZERO`; `rootsOfUnity(1)` is `[ONE]`-valued, length 1; `rootsOf(ZERO, 3)` is three zeros; `rootsOf(C(8,0), 3)[0] = C(2,0)`;
  `rootsOf(ONE, bad)` throws `RangeError` for `bad` in `0, -1, 2.5, NaN`; for every sample and `n` in `2, 3, 5, 7`: every root satisfies `pow(root, n) = z` (1e-9) and `principalRoot(z, n) = rootsOf(z, n)[0]` (1e-12).
- **U13 `isPrimitiveRoot`.** `[0,1,2,3,4]` gives `[false,true,true,true,true]` for `n = 5`; `(2,4)` false; `(1,4)` true; `(3,4)` true; `(0,1)` true; `(0,4)` false; `(6,12)` false; `(5,12)` true; `(7,12)` true; `(-1,5)` true; `(5,5)` false; `(1.5,5)` false; `(1,0)` false.
  For `n = 1..12` and every `k` in `0..n-1`: with `roots = rootsOfUnity(n)`, let `order` be the least `m >= 1` with `eq(pow(roots[k], m), ONE, 1e-9)`; then `isPrimitiveRoot(k, n) === (order === n)` (this is Definition 1.5.6 itself), and the number of primitive `k` equals Euler's totient: `phi(1..12) = 1,1,2,2,4,2,6,4,6,4,10,4`.
- **U14 `principalRoot`, 2.2.2.** The 2.2.2 rows of section 6.2; `principalRoot(ZERO, 3)` is `{0,0}`.
- **U15 `branchArg`, `branchRoot`, 2.4.1.** The 2.4.1 rows of section 6.2. Plus: for seams `-PI, -PI/2, 0, 1, PI` and every sample, `branchArg(z, seam)` is in `(seam, seam + 2 PI]` and `sameAngle(branchArg(z, seam), Arg(z))`; `branchRoot(z, 3, -PI) = principalRoot(z, 3)` (1e-12) for every sample; `branchRoot(ZERO, 3, 0)` is `{0,0}`; `branchRoot(C(0,-1), 2, 0) = C(-S2/2, S2/2)` (differs from `sqrt(-i) = C(S2/2, -S2/2)`).
  **Walk test.** `walk(a0, a1, seam)` samples 601 points of the unit circle from angle `a0` to `a1`, applies `branchRoot(., 3, seam)` and returns the largest distance between consecutive values. Then: `walk(PI-0.1, PI+0.1, 0) < 0.01` (seam 0 is continuous across the negative axis); `walk(PI-0.1, PI+0.1, -PI) > 1.5` and equals `sqrt(3)` within `0.01` (the principal jump); `walk(-0.1, 0.1, 0) > 1.5` (seam 0 jumps across the positive axis); `walk(0.01, 2 PI - 0.01, 0) < 0.02` (a loop that avoids the seam never jumps).
- **U16 `quadraticRoots`, 1.4.3.** The 1.4.3 rows (either order: sort by `im` descending before comparing); `(1,0,1)` gives `[I, C(0,-1)]`; `(1,-3,2)` gives real roots 1 and 2; `(1,2,1)` gives `-1` twice; `quadraticRoots(ONE, ZERO, C(0,4))`: both roots square to `C(0,-4)` and sum to `ZERO`; `a = 0` gives NaN parts; for `(2,3,5)`, `(1, C(0,1), 1)`, `(C(1,1), C(2,-1), C(0,3))` each root satisfies `a w^2 + b w + c = 0` (1e-9).

**A3** (`abs2f = (z) => ({re: abs2(z), im: 0})`, `reF = (z) => ({re: z.re, im: 0})`)

- **U17 `localLinear`, `jacobian`, `numericPartials`.** To 1e-6: `localLinear(abs2f, C(1,1))` is `{A: C(1,-1), B: C(1,1)}`; `localLinear(reF, C(0.3,-0.7))` is `{A: C(0.5,0), B: C(0.5,0)}`; `localLinear(compile("z^2 + z").f, C(1,1)).A = C(3,2)` and `abs(B) < 1e-6`;
  `localLinear(conj, C(1,1))` and at `C(0.3,-0.7)` are `{A: ZERO, B: ONE}`; `localLinear(exp, ZERO).A = ONE`; `jacobian(exp, ZERO)` is `{ux:1, uy:0, vx:0, vy:1}`; `localLinear(exp, C(0.3,0.2)).A = exp(C(0.3,0.2))` and `abs(B) < 1e-6`;
  `numericPartials(z^2 + z, C(1,1))` is `{fx: C(3,2), fy: C(-2,3)}` (`fy = i f'`); `jacobian(exp, C(0.5,0.8))` has `ux = vy` and `uy = -vx`; `jacobian(abs2f, C(1,1))` is `{ux:2, uy:2, vx:0, vy:0}`; `localLinear(abs2f, ZERO)` is `{A: ZERO, B: ZERO}`;
  for `abs2f` at `C(0.7,-0.4)`: `2 abs(B) = hypot(ux - vy, vx + uy)`; `numericPartials(f, ONE, 0)` throws `RangeError`.
- **U18 `directionalQuotients`.** For `abs2f` at `z0 = C(1,1)`, `rho = 1e-3`, `m = 8`: length 8; `phi_j = 2 PI j/8`; every `q` is within `2e-3` of `conj(z0) + z0 e^{-2 i phi}` (A3) and `abs(q - C(1,-1))` is within `2e-3` of `sqrt2` (on the circle of centre `conj z0`, radius `|z0|`); the default call has length 72;
  for `z^2 + z` every `q` is within `2e-3` of `C(3,2)`; for `reF` at `C(0.3,-0.7)`, `m = 16`, every `q` is within `2e-3` of `1/2 + (1/2) e^{-2 i phi}` (P6); `directionalQuotients(abs2f, z0, 0, 8)` throws `RangeError`.

**A4**

- **U19 plain-text formatting**: the table in 7.4.1.
- **U20 TeX formatting**: the table in 7.4.2, plus `texCart(C(S2,S2))` contains `\sqrt{2}` exactly twice and `+`; `texPolar(C(-1,S3))` contains `2` and `\frac{2\pi}{3}`.
- **U21 ASCII minus**: for every sample `fmtCart`, `fmtPolar`, `fmtAngle(Arg(z))`, `fmtNum(z.re)` contain none of U+2212, U+2013, U+2014.

**A5**

- **U22 pinned evaluations**: sections 7.5.1 and 7.5.2 (handout, then catalogue).
- **U23 grammar**: section 7.5.3.
- **U24 `ParseError`** (rows M1 to M17): section 7.6: every row throws a `ParseError` (`instanceof ParseError`, `instanceof Error`, `name === "ParseError"`, `typeof position === "number"`), with that exact `position`, `length` and `message`; `compile(src)` and `toTex(src)` throw the same class; `parse("(".repeat(100) + "z" + ")".repeat(100))`, `parse("z+".repeat(300) + "z")`, `parse("9".repeat(320))` and `parse(null)` throw `ParseError`.
  M4 whole characters: `"z + " + String.fromCodePoint(0x1F600)` throws at position 4 with `length` 2 and the general M4 sentence quoting the whole emoji; `"z" + c + " + 1"` for `c` in U+200B, U+200D, U+0301, U+0007 and a lone U+D83D throws at position 1, length 1, with the "hidden character" sentence and the matching `U+XXXX`; no M4 message contains a lone surrogate.
- **U25 `compile` contract**: `compile("x^2 - y^2 + 2ixy")` has `typeof f === "function"`, `src` unchanged, a non-empty string `tex`, `uses` equal to `{x, y}`; `compile("z^2").uses` is `{z}`; `compile("2").uses.size === 0`; `compile("z^2") === compile("z^2")` (cache);
  `const w = compile("z").f(z)` with `z = C(1,2)`: `w !== z`; mutate `w.re = 99`; `z.re` is still `1`; the next call returns `re === 1` (fresh results, inputs untouched); `deepEqual(z, C(1,2))`; after compiling 100 distinct sources, `compile("z + 1")` still works; **bounded cache** (kills a mutant with `CACHE_MAX = 100000`): `first = compile("z + 7001")` is returned again by a second call, then 70 other distinct sources are compiled, the newest is still cached, and `compile("z + 7001")` is now a different object than `first` (evicted, oldest out first) that still evaluates correctly; `compile(" z^2 ").src === " z^2 "`; `compile("z^2 + iz").tex` contains `z^{2}`.
- **U26 `toTex`**: the pinned strings of 7.5.4, including the `pi` followed by a letter rows (`pi z` is `\pi\,z`, `2 pi i z` is `2\pi\,iz`, `exp(i pi z)` is `e^{i\pi\,z}`, `z pi` is still `z\pi`).
- **U27 KaTeX accepts every TeX string**: if `vendor/katex/katex.min.js` is missing, `t.skip`; otherwise `const ctx = {self: {}}; ctx.window = ctx.self; vm.createContext(ctx); vm.runInContext(fs.readFileSync(katexPath, "utf8"), ctx); const katex = ctx.self.katex` (the UMD file runs in a bare context; a plain `import` would treat it as ESM and fail). Collect: `texCart` and `texPolar` of the 12 samples plus `ZERO, ONE, I, C(0,-1), C(NaN,NaN), C(Infinity,0), C(S2,S2), C(512,-512 S3), C(-11/17,-10/17), C(0,2 PI)`; `texAngle` of `0, PI, -PI, PI/2, -PI/3, 2PI/3, 8PI/3, 1.234, NaN, 31PI/6`; `texNumber` of `0, 1, -1, 0.5, -11/17, S2, -S2/2, S3/2, 886.81, PI, -PI/4, 3.14, NaN, Infinity, -Infinity, 1e7`; `toTex` of the 18 catalogue sources of 7.5.2 and of `z^z^z`, `(-z)^2`, `exp(z)^2`, `sin(z)cos(z)`, `z/2/z`, `e^(i pi)`, `Arg(z)`, `arg(z)`, `Im(z)`.
  Each goes through `katex.renderToString(s, {throwOnError: true, strict: "error"})`; more than 80 strings are checked.
  **`pi` regression and fuzz** (the `\piz` bug: KaTeX throws `Undefined control sequence: \piz` on an unspaced control word): the extras also hold `pi z`, `piz`, `2 pi i z`, `exp(i pi z)`, `e^(2 pi i z)`, `pi x`, `pi y`, `pi i`, `pi e`, `pi(z+1)`, `z pi`, `pi pi`, `-pi z`, `pi abs(z)`, `pi sin(z)`, `2pi z^2`, `(pi z)^2`, `pi z/2`, `e^(pi i z)`; for the first seven, `toTex` contains no `\pi` directly followed by a letter and `compile(src).tex === toTex(src)`. Then two deterministic fuzzes (LCG as in U30): 4000 formulas built from the grammar (atoms `z x y i e pi U+03C0 2 3 0.5 1.25` (with `pi` three times as likely), unary minus, brackets, every function, separators `+ - * / ^`, a space, nothing, ` * `) and 20000 random strings of up to 8 of the U30 pieces; every one that parses (more than 2500 must, more than 100 with `pi` next to a letter) has a `toTex` whose control words are all in `{pi, frac, left, right, overline, sqrt, operatorname, arg, log, sin, cos, cdot}` and which KaTeX renders. (Measured: 122,000 grammar formulas and 3,400 random strings, 0 failures.)
- **U30 fuzz** (deterministic): LCG `seed = (seed * 1664525 + 1013904223) >>> 0`, start `12345`; 5000 strings of 1 to 12 pieces drawn from `z x y i e pi 2 3.5 . ( ) + - * / ^ (space) sin cos exp abs Re Im conj sqrt log arg Arg q @ ** U+00B2 U+03C0 U+2212 U+00D7`. For each: `parse` either succeeds (then `toTex(s).length > 0`, every control word of `toTex(s)` is one `toTex` may emit, and `compile(s).f(C(0.3,-0.7))` has numeric parts) or throws a `ParseError` with an integer `position` in `0..s.length`; nothing else may be thrown; more than 100 of the strings must parse.
  Formatters: for `a, b` over `[0, -0, 1, -1, 0.5, 1e-300, 1e300, 1e15, 1e21, NaN, Infinity, -Infinity, PI, -PI, 12345.6789, 0.0004999, 999999.9999]`, `fmtCart`, `fmtPolar`, `texCart`, `texPolar` of `C(a,b)` return a non-empty string without U+2212; `fmtNum`, `fmtAngle`, `texNumber`, `texAngle` of each `a` return non-empty strings.

**A6**

- **U28 exports.** `typeof X[name] === "function"` for each of: `C fromPolar toPolar add sub mul div neg conj inv scale abs abs2 Arg wrapArg argSet expi exp log sqrt sin cos pow powc rootsOf rootsOfUnity principalRoot branchRoot branchArg isPrimitiveRoot quadraticRoots eq isFiniteC numericPartials jacobian localLinear directionalQuotients fmtNum fmtCart fmtPolar fmtAngle texNumber texCart texPolar texAngle`, and `ParseError parse compile toTex evaluate` from `parse.js`.
- **U29 purity.** `strip(s)` removes `/* ... */` and `// ...` comments. For each of `complex.js`, `parse.js` read from disk: the raw text is pure ASCII (`/^[\x00-\x7f]*$/`); the stripped text matches none of `\b(document|window|localStorage|sessionStorage|requestAnimationFrame|setTimeout|setInterval|fetch|XMLHttpRequest|navigator|Math\.random|Date|performance|process|require|toLocaleString|Intl)\b`;
  none of `#[0-9a-fA-F]{3,8}\b`, `rgb\(`, `hsl\(`, `textcolor`; the count of lines matching `^\s*import\s` is `0` for `complex.js` and `1` for `parse.js`; no `import(` (dynamic) and no `export default`; the one import in `parse.js` names `./complex.js`.

### 7.4 Formatting tables (U19, U20)

#### 7.4.1 Plain text (each line is `call => expected`; strings are raw, no escaping)

```check
fmtNum(2.2360679, 3) => "2.236"
fmtNum(-1e-7) => "0"
fmtNum(2) => "2"
fmtNum(0.5) => "0.5"
fmtNum(-0.0004) => "0"
fmtNum(-0.0005) => "-0.001"
fmtNum(1234.5678, 0) => "1235"
fmtNum(1.5e16) => "1.5e+16"
fmtNum(0.9996) => "1"
fmtNum(-0) => "0"
fmtNum(100) => "100"
fmtNum(NaN) => "undefined"
fmtNum(Infinity) => "inf"
fmtNum(-Infinity) => "-inf"
fmtNum(-2.5, 1) => "-2.5"
fmtNum(1/3, 6) => "0.333333"
fmtCart(C(3, -2)) => "3 - 2i"
fmtCart(I) => "i"
fmtCart(C(0, -1)) => "-i"
fmtCart(C(2, 0.5)) => "2 + 0.5i"
fmtCart(ZERO) => "0"
fmtCart(C(1, 1)) => "1 + i"
fmtCart(C(1, -1)) => "1 - i"
fmtCart(C(-2, 0)) => "-2"
fmtCart(C(-11/17, -10/17)) => "-0.647 - 0.588i"
fmtCart(C(NaN, NaN)) => "undefined"
fmtCart(C(1e-9, 2)) => "2i"
fmtCart(C(5, 14)) => "5 + 14i"
fmtCart(C(-1, S3)) => "-1 + 1.732i"
fmtCart(C(Infinity, 0)) => "inf"
fmtCart(C(0.9996, 0.0004)) => "1"
fmtCart(C(2, 3), 0) => "2 + 3i"
fmtPolar(C(-1, S3)) => "2 e^(i 2.094)"
fmtPolar(C(3, -2)) => "3.606 e^(-i 0.588)"
fmtPolar(I) => "e^(i 1.571)"
fmtPolar(C(2, 0)) => "2"
fmtPolar(ZERO) => "0"
fmtPolar(C(-16, 0)) => "16 e^(i 3.142)"
fmtPolar(C(NaN, 0)) => "undefined"
fmtAngle(2*PI/3) => "2pi/3"
fmtAngle(-PI/3) => "-pi/3"
fmtAngle(1.234) => "1.234"
fmtAngle(PI) => "pi"
fmtAngle(-PI) => "-pi"
fmtAngle(0) => "0"
fmtAngle(2*PI) => "2pi"
fmtAngle(PI/2) => "pi/2"
fmtAngle(-5*PI/6) => "-5pi/6"
fmtAngle(2*PI/3 + 2*PI) => "8pi/3"
fmtAngle(-5*PI/6 + 6*PI) => "31pi/6"
fmtAngle(5*PI/3) => "5pi/3"
fmtAngle(PI/12) => "pi/12"
fmtAngle(PI/13) => "0.242"
fmtAngle(2*PI/3, {pi: false}) => "2.094"
fmtAngle(2*PI/3, {unicode: true}) => "2π/3"
fmtAngle(Math.atan2(-2, 3)) => "-0.588"
fmtAngle(1) => "1"
fmtAngle(2.094) => "2.094"
fmtAngle(NaN) => "undefined"
fmtAngle(1.234, {digits: 1}) => "1.2"
exactAngle(2*PI/3) => {p: 2, q: 3}
exactAngle(1.234) => null
exactAngle(0) => {p: 0, q: 1}
exactAngle(-PI) => {p: -1, q: 1}
```

(The `{unicode: true}` line shows the literal character U+03C0 in its expected string, `2π/3`.)

#### 7.4.2 TeX

```check
texNumber(-11/17) => "-\frac{11}{17}"
texNumber(S2) => "\sqrt{2}"
texNumber(-512*S3) => "-512\sqrt{3}"
texNumber(S3/2) => "\frac{\sqrt{3}}{2}"
texNumber(-S2/2) => "-\frac{\sqrt{2}}{2}"
texNumber(3*S2/2) => "\frac{3\sqrt{2}}{2}"
texNumber(0) => "0"
texNumber(1e-13) => "0"
texNumber(5) => "5"
texNumber(-7) => "-7"
texNumber(0.5) => "\frac{1}{2}"
texNumber(0.123) => "0.123"
texNumber(2.2360679) => "2.236"
texNumber(PI) => "\pi"
texNumber(2*PI/3) => "\frac{2\pi}{3}"
texNumber(-PI/4) => "-\frac{\pi}{4}"
texNumber(Math.sqrt(13)) => "3.606"
texNumber(NaN) => "\text{undefined}"
texNumber(Infinity) => "\infty"
texNumber(-Infinity) => "-\infty"
texNumber(511.99999999999994) => "512"
texNumber(1e7) => "10000000"
texAngle(2*PI/3) => "\frac{2\pi}{3}"
texAngle(-PI/3) => "-\frac{\pi}{3}"
texAngle(1.234) => "1.234"
texAngle(PI) => "\pi"
texAngle(0) => "0"
texAngle(3*PI) => "3\pi"
texAngle(-PI) => "-\pi"
texAngle(NaN) => "\text{undefined}"
texCart(C(3, -2)) => "3 - 2i"
texCart(C(S2, S2)) => "\sqrt{2} + \sqrt{2}\,i"
texCart(C(-S2, S2)) => "-\sqrt{2} + \sqrt{2}\,i"
texCart(C(-11/17, -10/17)) => "-\frac{11}{17} - \frac{10}{17}i"
texCart(I) => "i"
texCart(C(0, -1)) => "-i"
texCart(ZERO) => "0"
texCart(C(-1, S3)) => "-1 + \sqrt{3}\,i"
texCart(C(0.5, S3/2)) => "\frac{1}{2} + \frac{\sqrt{3}}{2}i"
texCart(C(512, -512*S3)) => "512 - 512\sqrt{3}\,i"
texCart(C(2, 3)) => "2 + 3i"
texCart(C(0.30901699437494745, 0.9510565162951535)) => "0.309 + 0.951i"
texCart(C(0, -S3)) => "-\sqrt{3}\,i"
texCart(C(0, 2*PI)) => "2\pi\,i"
texCart(C(NaN, 1)) => "\text{undefined}"
texCart(C(5, 14)) => "5 + 14i"
texCart(C(1, 1)) => "1 + i"
texPolar(C(-1, S3)) => "2\,e^{i\frac{2\pi}{3}}"
texPolar(C(1, 1)) => "\sqrt{2}\,e^{i\frac{\pi}{4}}"
texPolar(C(3, -2)) => "3.606\,e^{-i\,0.588}"
texPolar(I) => "e^{i\frac{\pi}{2}}"
texPolar(C(-16, 0)) => "16\,e^{i\pi}"
texPolar(C(2, 0)) => "2"
texPolar(ONE) => "1"
texPolar(ZERO) => "0"
texPolar(C(S2, -S2)) => "2\,e^{-i\frac{\pi}{4}}"
texPolar(pow(C(S3, 1), 10)) => "1024\,e^{-i\frac{\pi}{3}}"
texPolar(fromPolar(2, 2.1)) => "2\,e^{i\,2.1}"
```

### 7.5 Parser values (U22, U23, U26)

#### 7.5.1 Handout (A5 values)

```check
evaluate("z^2 + iz", C(1,1)) => C(-1, 3)
evaluate("(1+i)z", I) => C(-1, 1)
evaluate("iz - 2i", C(2,3)) => C(-3, 0)
evaluate("sqrt(z)", C(0,2)) => C(1, 1)
evaluate("1/z", C(2,0)) => C(0.5, 0)
evaluate("1/z", 2) => C(0.5, 0)
evaluate("z^(1/3)", C(-1,0)) => C(0.5, S3/2)
evaluate("abs(z)^2", C(3,-2)) => C(13, 0)
evaluate("z^2/abs(z)^2", C(1,1)) => C(0, 1)
Math.abs(evaluate("(x^2 - y^2 + 2ixy)/(x^2 + y^2)", C(0.01, 0.0001)).re - 1) < 1e-3 => true
evaluate("(Re(1+z) - 1)/z", C(0, 0.5)) => C(0, 0)
evaluate("exp(z)", C(0, PI/2)) => C(0, 1)
evaluate("conj(z)", C(1,2)) => C(1, -2)
evaluate("-z^2", I) => C(1, 0)
evaluate("2z", C(1,1)) => C(2, 2)
evaluate("z(z+1)", C(1,0)) => C(2, 0)
parse("z +") => throws ParseError@3
parse("foo(z)") => throws ParseError@0
toTex("z^2 + iz") => "z^{2} + iz"
```

#### 7.5.2 The ARCHITECTURE 3.4 catalogue (and sin, cos, log), independent values from Python `cmath`

```check
evaluate("z^2", C(0.3,-0.7)) => C(-0.4, -0.42)
evaluate("z^3", C(0.3,-0.7)) => C(-0.414, 0.154)
evaluate("1/z", C(0.3,-0.7)) => C(0.5172413793, 1.2068965517)
evaluate("iz - 2i", C(0.3,-0.7)) => C(0.7, -1.7)
evaluate("(1+i)z", C(0.3,-0.7)) => C(1, -0.4)
evaluate("z^2 + iz", C(0.3,-0.7)) => C(0.3, -0.12)
evaluate("z^2 + z", C(0.3,-0.7)) => C(-0.1, -1.12)
evaluate("exp(z)", C(0.3,-0.7)) => C(1.0324289629, -0.8696029191)
evaluate("conj(z)", C(0.3,-0.7)) => C(0.3, 0.7)
evaluate("Re(z)", C(0.3,-0.7)) => C(0.3, 0)
evaluate("abs(z)^2", C(0.3,-0.7)) => C(0.58, 0)
evaluate("z^2/abs(z)^2", C(0.3,-0.7)) => C(-0.6896551724, -0.7241379310)
evaluate("sqrt(z)", C(0.3,-0.7)) => C(0.7285524383, -0.4804046787)
evaluate("z^(1/3)", C(0.3,-0.7)) => C(0.8451106965, -0.3460390184)
evaluate("(Re(1+z) - 1)/z", C(0.3,-0.7)) => C(0.1551724138, 0.3620689655)
evaluate("sin(z)", C(0.3,-0.7)) => C(0.3709278039, -0.7247026904)
evaluate("cos(z)", C(0.3,-0.7)) => C(1.1991087511, 0.2241768123)
evaluate("log(z)", C(0.3,-0.7)) => C(-0.2723635877, -1.1659045405)
evaluate("z^2", C(1,1)) => C(0, 2)
evaluate("z^3", C(1,1)) => C(-2, 2)
evaluate("1/z", C(1,1)) => C(0.5, -0.5)
evaluate("exp(z)", C(1,1)) => C(1.4686939399, 2.2873552872)
evaluate("sqrt(z)", C(1,1)) => C(1.0986841135, 0.4550898606)
evaluate("z^(1/3)", C(1,1)) => C(1.0842150815, 0.2905145555)
evaluate("(Re(1+z) - 1)/z", C(1,1)) => C(0.5, -0.5)
evaluate("z^(1/3)", C(-1,0)) => C(0.5, S3/2)
evaluate("sqrt(z)", C(-1,0)) => C(0, 1)
evaluate("log(z)", C(-1,0)) => C(0, PI)
evaluate("1/z", C(0,0)).re => NaN
evaluate("z^2/abs(z)^2", C(0,0)).re => NaN
```

(The last two lines: `NaN` as the expected value means "is NaN"; in the test use `assert.ok(Number.isNaN(...))`.)

#### 7.5.3 Grammar (U23)

```check
evaluate("-z^2", I) => C(1, 0)
evaluate("2^3^2", ZERO) => C(512, 0)
evaluate("1/2z", C(2,0)) => C(1, 0)
evaluate("1/(2z)", C(2,0)) => C(0.25, 0)
evaluate("z^-1", C(0,2)) => C(0, -0.5)
evaluate("2ixy", C(1,2)) => C(0, 4)
evaluate("x^2 - y^2 + 2ixy", C(1,2)) => C(-3, 4)
evaluate("e^z", C(0, PI)) => C(-1, 0)
evaluate("z**2", C(0,2)) => C(-4, 0)
evaluate("2−z", C(1,1)) => C(1, -1)
evaluate("πz", ONE) => C(PI, 0)
evaluate("z²", I) => C(-1, 0)
evaluate("2×z", C(1,1)) => C(2, 2)
evaluate("0.5z + .5", C(2,0)) => C(1.5, 0)
evaluate("  z  +  1 ", C(2,0)) => C(3, 0)
evaluate("z + -z", C(1,2)) => C(0, 0)
evaluate("2*-z", C(1,1)) => C(-2, -2)
evaluate("--z", C(1,1)) => C(1, 1)
evaluate("+z", C(1,1)) => C(1, 1)
evaluate("i i", ZERO) => C(-1, 0)
evaluate("xy", C(2,3)) => C(6, 0)
evaluate("z z", I) => C(-1, 0)
evaluate("2(z+1)", ONE) => C(4, 0)
evaluate("(z+1)(z-1)", C(2,0)) => C(3, 0)
evaluate("sin(z)cos(z)", ZERO) => C(0, 0)
evaluate("z^2i", ONE) => C(0, 1)
evaluate("abs(z)", C(3,4)) => C(5, 0)
evaluate("Arg(z)", C(-1,0)) => C(PI, 0)
evaluate("arg(z)", C(0,-1)) => C(-PI/2, 0)
evaluate("Im(z^2)", C(1,1)) => C(2, 0)
evaluate("log(z)", C(Math.E,0)) => C(1, 0)
evaluate("0^z", ZERO) => C(1, 0)
evaluate("z^0", ZERO) => C(1, 0)
evaluate("pi", ZERO) => C(PI, 0)
evaluate("e", ZERO) => C(Math.E, 0)
evaluate("i", ZERO) => C(0, 1)
evaluate("z^(2z)", ONE) => C(1, 0)
evaluate("z^2^2", I) => C(1, 0)
```

The lines containing `−`, `π`, `²` and `×` use the literal characters U+2212, U+03C0, U+00B2 and U+00D7 inside the source string.

#### 7.5.4 `toTex` pinned strings (U26)

```check
toTex("z^2 + iz") => "z^{2} + iz"
toTex("(1+i)z") => "\left(1 + i\right)z"
toTex("iz - 2i") => "iz - 2i"
toTex("exp(z)") => "e^{z}"
toTex("conj(z)") => "\overline{z}"
toTex("Re(z)") => "\operatorname{Re}\left(z\right)"
toTex("abs(z)^2") => "\left|z\right|^{2}"
toTex("z^2/abs(z)^2") => "\frac{z^{2}}{\left|z\right|^{2}}"
toTex("sqrt(z)") => "\sqrt{z}"
toTex("z^(1/3)") => "z^{\frac{1}{3}}"
toTex("1/z") => "\frac{1}{z}"
toTex("(x^2 - y^2 + 2ixy)/(x^2 + y^2)") => "\frac{x^{2} - y^{2} + 2ixy}{x^{2} + y^{2}}"
toTex("(Re(1+z) - 1)/z") => "\frac{\operatorname{Re}\left(1 + z\right) - 1}{z}"
toTex("-z^2") => "-z^{2}"
toTex("(-z)^2") => "\left(-z\right)^{2}"
toTex("2*3") => "2 \cdot 3"
toTex("2*z") => "2z"
toTex("z - (z + 1)") => "z - \left(z + 1\right)"
toTex("2^-1") => "2^{-1}"
toTex("exp(z)^2") => "\left(e^{z}\right)^{2}"
toTex("z/2/z") => "\frac{\frac{z}{2}}{z}"
toTex("arg(z)") => "\arg\left(z\right)"
toTex("Arg(z)") => "\operatorname{Arg}\left(z\right)"
toTex("pi") => "\pi"
toTex("e^(i pi)") => "e^{i\pi}"
toTex("0.5z") => "0.5z"
toTex("z(z+1)") => "z\left(z + 1\right)"
toTex("log(z)") => "\log\left(z\right)"
toTex("pi z") => "\pi\,z"
toTex("piz") => "\pi\,z"
toTex("pi x") => "\pi\,x"
toTex("pi e") => "\pi\,e"
toTex("-pi z") => "-\pi\,z"
toTex("2 pi z") => "2\pi\,z"
toTex("2 pi i z") => "2\pi\,iz"
toTex("exp(i pi z)") => "e^{i\pi\,z}"
toTex("e^(2 pi i z)") => "e^{2\pi\,iz}"
toTex("pi(z+1)") => "\pi\left(z + 1\right)"
toTex("pi abs(z)") => "\pi\left|z\right|"
toTex("pi z^2") => "\pi\,z^{2}"
toTex("z pi") => "z\pi"
toTex("2 pi") => "2\pi"
toTex("pi pi") => "\pi\pi"
toTex("pi*z") => "\pi \cdot z"
toTex("pi/z") => "\frac{\pi}{z}"
```

### 7.6 `ParseError` rows (U24)

Each line is `source expression || position || length || message || copy id`. The source is a JavaScript expression.

```errcheck
"" || 0 || 1 || Type a formula in z, for example z^2 + i z. || M1
"   " || 0 || 1 || Type a formula in z, for example z^2 + i z. || M1
"foo(z)" || 0 || 3 || I don't know the name "foo". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos. || M2
"sinh(z)" || 0 || 4 || I don't know the name "sinh". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos. || M2
"zfoo" || 0 || 4 || I don't know the name "zfoo". You can use z, x, y, i, e, pi and the functions conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos. || M2
"Z" || 0 || 1 || I don't know the name "Z". Names are case-sensitive; did you mean "z"? || M3
"SQRT(z)" || 0 || 4 || I don't know the name "SQRT". Names are case-sensitive; did you mean "sqrt"? || M3
"re(z)" || 0 || 2 || I don't know the name "re". Names are case-sensitive; did you mean "Re"? || M3
"i Z" || 2 || 1 || I don't know the name "Z". Names are case-sensitive; did you mean "z"? || M3
"z @ 2" || 2 || 1 || I don't understand the character "@". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ). || M4
"|z - (1+2i)|" || 0 || 1 || Bars are not supported. Use abs(z) for the modulus, like abs(z - 1). || M4
"z - |z|" || 4 || 1 || Bars are not supported. Use abs(z) for the modulus, like abs(z - 1). || M4
"\u221az" || 0 || 1 || The root sign is not supported. Use sqrt(z) for a square root, like sqrt(z + 1). || M4
"1 + \u221a(z)" || 4 || 1 || The root sign is not supported. Use sqrt(z) for a square root, like sqrt(z + 1). || M4
"1.2.3" || 3 || 1 || This number has two decimal points. || M5
"." || 0 || 1 || A "." must have digits next to it, like 0.5. || M6
"9".repeat(320) || 0 || 320 || That number is too big. || M7
"z+".repeat(300) + "z" || 400 || 1 || That formula is too long (more than 400 characters). || M8
"(".repeat(100) + "z" + ")".repeat(100) || 80 || 1 || This formula is nested too deeply. || M9
"sin z" || 0 || 3 || "sin" needs brackets around its input, like sin(z). || M10
"abs z" || 0 || 3 || "abs" needs brackets around its input, like abs(z). || M10
"cosz" || 0 || 3 || "cos" needs brackets around its input, like cos(z). || M10
"Im" || 0 || 2 || "Im" needs brackets around its input, like Im(z). || M10
"z +" || 3 || 1 || The formula stops too early. Something is missing after "+". || M11
"sin(" || 4 || 1 || The formula stops too early. Something is missing after "(". || M11
"z^" || 2 || 1 || The formula stops too early. Something is missing after "^". || M11
"z^(1+" || 5 || 1 || The formula stops too early. Something is missing after "+". || M11
"*z" || 0 || 1 || A formula can't have "*" here. I expected a number, a variable or "(". || M12
"z + * 2" || 4 || 1 || A formula can't have "*" here. I expected a number, a variable or "(". || M12
"z ^^ 2" || 3 || 1 || A formula can't have "^" here. I expected a number, a variable or "(". || M12
"z)" || 1 || 1 || This ")" has no matching "(". || M13
"2z)" || 2 || 1 || This ")" has no matching "(". || M13
")(" || 0 || 1 || This ")" has no matching "(". || M13
"()" || 0 || 2 || There is nothing between this "(" and ")". Put a formula inside the brackets. || M14
"(z" || 0 || 1 || This "(" is never closed. Add a ")" at the end. || M15
"(z + 1" || 0 || 1 || This "(" is never closed. Add a ")" at the end. || M15
"conj(z" || 4 || 1 || This "(" is never closed. Add a ")" at the end. || M15
"z2" || 1 || 1 || I did not expect the number "2" here. Put the number first (2z, not z2) or use * between them. || M16
"2 3" || 2 || 1 || I did not expect the number "3" here. Put the number first (2z, not z2) or use * between them. || M16
"(z2)" || 2 || 1 || I did not expect the number "2" here. Put the number first (2z, not z2) or use * between them. || M16
"(2)3" || 3 || 1 || I did not expect the number "3" here. Put the number first (2z, not z2) or use * between them. || M16
"(z+)" || 3 || 1 || Something is missing between "+" and this ")". Put a number or a variable there. || M17
"sin(z+)" || 6 || 1 || Something is missing between "+" and this ")". Put a number or a variable there. || M17
"(z*)" || 3 || 1 || Something is missing between "*" and this ")". Put a number or a variable there. || M17
"(z-)" || 3 || 1 || Something is missing between "-" and this ")". Put a number or a variable there. || M17
"(z/)" || 3 || 1 || Something is missing between "/" and this ")". Put a number or a variable there. || M17
"z^(2+)" || 5 || 1 || Something is missing between "+" and this ")". Put a number or a variable there. || M17
"(z^)" || 3 || 1 || Something is missing between "^" and this ")". Put a number or a variable there. || M17
"(z**)" || 4 || 1 || Something is missing between "**" and this ")". Put a number or a variable there. || M17
"z^(1/(2-))" || 8 || 1 || Something is missing between "-" and this ")". Put a number or a variable there. || M17
```

The hidden-character and emoji cases cannot be written as table rows (the message holds the character itself), so U24 checks them in code: the emoji row is
`z + ` followed by U+1F600, position 4, length 2, message `I don't understand the character "<the emoji>". Use numbers, z, x, y, i, e, pi, + - * / ^ and brackets ( ).`; a hidden character `c` in `"z" + c + " + 1"` is
position 1, length 1, message `There is a hidden character (U+200B) here that I can't read. Delete it and retype that part of the formula.` (with the code point of `c`: U+200B, U+200D, U+0301, U+0007, U+D83D).

### 7.7 What the A5 criterion text maps to

`parse("z +")` throws `ParseError` with numeric position: row M11 (position 3). `parse("foo(z)")` throws `ParseError`: row M2.
`toTex("z^2 + iz")` is non-empty and has `z^{2}`: 7.5.1 and U25. All other A5 values: 7.5.1.

### 7.8 Interaction script `tests/interact/i1-core-math.mjs`

Run: `node tools/smoke.mjs --route home --script tests/interact/i1-core-math.mjs --no-shots` (add `--out <dir>` instead of `--no-shots` if
screenshots are wanted; there is nothing to see). The harness runs the script at desktop 1280x860 and phone 390x844. The module under test has no
route of its own; the script does not care what the page shows, because it never clicks or reads the DOM. It only imports the two modules inside the page:
`await import(new URL("js/core/complex.js", document.baseURI).href)` (and `parse.js`), which exercises the real static server, the real MIME type and the real
browser module loader. The script is `export default async function (page, ctx)`; use `ctx.assert` and `ctx.log`.

Steps (each is one `page.evaluate`; a failed assertion fails the route with `interaction script failed: ...`):

1. **Load and purity.** Record `Object.getOwnPropertyNames(window)` before the imports; import both modules; assert every ARCHITECTURE export name is present (the 48 of `complex.js`, the 5 of `parse.js`), and that the imports created **no new window property**. Store `{X, P}` on `window.__i1core` (set by the script, never by the modules). Log: `i1-core-math: modules load, 49 + 5 exports, no globals created` .
2. **Pinned values in Chromium.** Compute inside the page and compare to the expected (tolerance 1e-9, 1e-6 where noted, exact where noted): 1.1.1 product and quotient; 1.1.2 `Im` is 6; 1.2.2 distance; 1.3.1 `r`, `Arg`, `fromPolar`; `Arg(C(-1,0)) === PI` and `Arg(C(0,0)) === 0` (exact); `wrapArg(5PI/3)`; `argSet` middle step; `abs2(z1) = mul(z1, conj z1).re`; 1.3.2 `(sqrt3+i)^10` (1e-6) and its `Arg`; the four roots of -16; the five fifth powers of the roots of unity are 1 and `rootsOfUnity(5)[1]`; the primitive flags as the string `[false,true,true,true,true]`; 1.4.3 both roots; 2.2.2; 2.4.1 seam 0 at -1, seam 0 continuous (`im > 0.8`) and principal jumping (`im < 0`); 3.1.2 `A` and `B` (1e-6); the strings `fmtCart(C(3,-2)) = "3 - 2i"`, `fmtAngle(2PI/3) = "2pi/3"`, `fmtPolar(C(-1,S3)) = "2 e^(i 2.094)"`, `texCart(C(S2,S2)) = "\sqrt{2} + \sqrt{2}\,i"`, `texPolar(C(-1,S3)) = "2\,e^{i\frac{2\pi}{3}}"`, `texAngle(-PI/3) = "-\frac{\pi}{3}"`, `texNumber(-512 S3) = "-512\sqrt{3}"`, `texNumber(-11/17) = "-\frac{11}{17}"` (proves number-to-text is locale-independent in the browser too); parser: `z^2 + iz` at `1+i`, `(1+i)z` at `i`, `sqrt(z)` at `2i`, `z^(1/3)` at `-1`, `-z^2` at `i`, `z(z+1)` at 1, `abs(z)^2` at `3-2i`, `toTex("z^2 + iz") = "z^{2} + iz"`; `parse("z +")` throws an error that is `instanceof P.ParseError` and `instanceof Error`, with `position === 3`; `parse("foo(z)")` throws `ParseError` at 0; the thin-space rows `toTex("pi z") = "\pi\,z"`, `"piz"`, `"2 pi i z"` (`2\pi\,iz`), `"exp(i pi z)"` (`e^{i\pi\,z}`) and `"z pi"` (`z\pi`); the sign of zero (`Object.is(div(1,-1).im, 0)`, `pow(-i, 2).im`, `Arg({re:1e300, im:-5e-324})`); the messages of `"(z+)"` (M17), `"z)"` (M13), `"|z|"` (bars) and `"z + " + emoji` (position 4, length 2). At least 50 rows. Log `i1-core-math: N pinned values agree in Chromium`.
3. **TeX renders in the page's KaTeX.** If `window.katex` exists (the shell loads `vendor/katex/katex.min.js` as a classic script), pass at least 50 strings (`texCart` and `texPolar` of a dozen points, `texAngle`, `texNumber`, and `toTex` of 15 catalogue sources, `toTex` of the ten `pi` followed by a letter sources `pi z`, `piz`, `2 pi i z`, `exp(i pi z)`, `e^(2 pi i z)`, `pi x`, `pi(z+1)`, `pi y`, `z pi`, `pi abs(z)`, and `toTex` of 600 deterministic fuzzed formulas that parse) to `katex.renderToString(s, {throwOnError: true, strict: "error"})` and assert none throws. If `window.katex` is absent, log that the check was skipped (the unit test U27 covers it in Node).
4. **Speed budget for a live Lab.** For `z^2 + iz`, `(x^2 - y^2 + 2ixy)/(x^2 + y^2)` and `z^(1/3)`: warm up 5000 calls, then time 100,000 calls of `compile(src).f` on a 400 by 250 grid of points; assert each takes under 400 ms (the reference measured 12 to 58 ms). Log the three timings with the viewport label.

**What passing looks like** (the reference run, the real harness against a stand-in page):

```
  [home desktop] i1-core-math: modules load, 49 + 5 exports, no globals created
  [home desktop] i1-core-math: 51 pinned values agree in Chromium
  [home desktop] i1-core-math: 57 TeX strings render in KaTeX
  [home desktop] i1-core-math [desktop]: 100k evaluations in 14 / 35 / 12 ms
ok   home (desktop)
  ...same four lines for phone...
ok   home (phone)
2/2 checks passed across 1 route(s).
```

Caveat for wave-0 review: the harness also checks the page itself (`index.html` loads, `#view` exists, no router error panel, no failed request). Those belong to `i1-shell` and
`i1-station-home-problems`. The designer ran the script against a copy of the repository as it stood while this design was written (the shell's real `index.html`, `js/app.js`, `theme.js`, `store.js`,
the vendored KaTeX loaded by `index.html`, the reference modules in `js/core/`, and **no** `js/stations/home.js` yet): all four `i1-core-math` lines appeared for desktop and phone (including `57 TeX strings render in KaTeX`,
so the page's own KaTeX was used), and the harness additionally printed, for each viewport, `HTTP 404: .../js/stations/home.js`, `request failed`, `[mv] station "home" failed to load` and `router showed the station error panel`, and exited non-zero.
Those lines are about the missing `home` station, not about this goal. **The verdict for this goal is:** for both viewports the four `i1-core-math` lines appear and no problem line says `interaction script failed`. Once the home station exists the same command ends with `2/2 checks passed`.

---

## 8. Edge cases, performance, accessibility, reduced motion, phone

### 8.1 Edge cases (behaviour is part of the contract; the test that pins it is in brackets)

| Input | Behaviour |
|---|---|
| `Arg(-1)`, `Arg(-1 - 0i)`, `Arg(-1 - 1e-17 i)` | `+pi` exactly (never `-pi`) [U5] |
| `Arg(-1 - 1e-12 i)` | just above `-pi`: the seam jump is real [U5] |
| `Arg(0)` | `0` [U5]. `argSet(0)` is formulaic, not meaningful: callers special-case `z = 0` |
| `wrapArg(+-pi, +-3 pi, 7 pi/2)`; non-finite | `pi, pi, pi, -pi/2`; NaN [U5] |
| `argSet` bounds not integers; `kMin > kMax`; huge span | rounded inwards; `[]`; `RangeError` [U6] |
| `rootsOf(0, n)`; `n` not a positive integer | `n` zeros; `RangeError` [U12] |
| `rootsOf(c, 1)` | `[c]` (as `fromPolar(abs c, Arg c)`) |
| `principalRoot(-8, 3)` | `1 + sqrt3 i`, not `-2` [U14] |
| `branchArg(z, seam)` with `z` on the seam ray | the top of the range: `branchArg(1, 0) = 2 pi`, `branchArg(-1, -pi) = pi` [U15] |
| `pow(0, 0)`; `pow(0, -1)`; non-integer `n`; huge `n` | `1`; NaN pair; delegates to `powc`; fine up to 2^53 (`% 2`, not `& 1`) [U9] |
| `powc(0, w)` | `0` if `Re w > 0`, `1` if `w = 0`, NaN otherwise, including `w = i` [U10] |
| division by zero, `inv(0)` | `{NaN, NaN}`, no exception [U1] |
| calculus at a pole, or `f` returns NaN | NaN parts, no exception |
| `fmtNum` of `-0`, `-1e-7`, `-0.0005` | `"0"`, `"0"`, `"-0.001"` [U19] |
| `fmtNum` with `digits` 0 or 20 | clamped to 0 and 12 |
| `fmtNum` at 1e15 and above | exponent form `1.5e+16` [U19] |
| `fmtCart` whose parts round to 1 (`0.9996`) | `"1"`; coefficient 1 of `i` is dropped only when the *rounded* string is `1` [U19] |
| `fmtAngle(pi/13)` | decimal (13 is above 12): `0.242` [U19] |
| `texNumber` of `511.99999999999994`, `1e-13`, `1e7` | `512`, `0`, `10000000` (noise absorbed; large numbers decimal) [U20] |
| `texNumber(0.3)` | `\frac{3}{10}`: the ARCHITECTURE rule is literal; stations that snap to decimal grids and want decimals use `fmtCart` |
| parser: empty, blank, null | M1 [U24] |
| parser: `1e3`, `z2`, `2 3`, `(2)3` | M16 (number where an operator is expected) [U24] |
| parser: `Z`, `SQRT(z)`, `re(z)` | M3 with the corrected spelling [U24] |
| parser: `sinh(z)`, `tan(z)`, `f(z)` | M2 with the whole run quoted [U24] |
| parser: 401 characters, 81 nested brackets, `1` followed by 320 digits | M8, M9, M7 [U24] |
| parser: `z^2^2`, `2^3^2`, `--z`, `+z`, `z^-1` | right-associative power, double negation, unary plus, signed exponent [U23] |
| parser: runtime `0^0`, `1/0`, `1/z` at 0 | `1`; NaN pair; NaN pair, never an exception [U23] |
| parser: constant formula `2` | compiles; `uses` empty; `f` returns `{2, 0}` [U25] |
| `f` called with a bare number | read as `{re: n, im: 0}` [U22] |

### 8.2 Performance plan

- The only hot path is `compile(src).f`, called per point by mapping, domain colouring and the Lab. Measured in the reference (Node 22, same V8 as Chromium): `1/z` 0.03 microseconds per call, `z^2 + iz` 0.13, `z^(1/3)` 0.13, `(x^2 - y^2 + 2ixy)/(x^2 + y^2)` 0.37 to 0.6, which is 1 to 25 ms for a 40,000-point grid (a 200 by 200 domain-colouring frame) and under 8 ms for the 19,000 points of a default-resolution frame even for the slowest formula.
- How it stays fast: closure compilation, never `eval` or `new Function` (also keeps the page compatible with a strict Content Security Policy as an Artifact); constant folding (`pi/2`, `(1/3)`, `2i` are evaluated once at compile time); integer exponents resolved at compile time to `pow(base, n)`; one fresh object per node and one extra for the result; no array or Map allocation per call; the variable `z` node returns its input without copying.
- Compile cost: about 20 microseconds per formula (2000 distinct compiles in 44 ms); the 64-entry cache makes repeated `evaluate(src, z)` free of parsing.
- `complex.js` functions allocate exactly one result object (two for `rootsOf` per root). Stations on a 60 fps drag path should not call formatting every frame for hidden cells (the explainer already coalesces to one render per frame and skips unchanged TeX).
- `directionalQuotients(m = 72)` costs 73 evaluations of `f` (about 10 microseconds for a polynomial); `localLinear` costs 4.
- Budget enforced by the interaction script: 100,000 evaluations under 400 ms per formula (roughly 10 times the measured time, to survive a slow CI machine).

### 8.3 Accessibility

- No visual output, no focus, no keyboard handling in this goal.
- Strings are written to be read aloud by a screen reader without markup: plain-text formatters give words and ASCII (`3 - 2i` reads "3 minus 2 i"; `2pi/3` reads "2 pi over 3"; `e^(i 2.094)` is readable). Stations should set `aria-label` on KaTeX blocks from `fmtCart`/`fmtPolar` (the module deliberately has plain-text twins for every TeX formatter).
- Error messages are complete sentences that name the problem and say what to do; they do not depend on colour, on position-only cues or on markup. `position` and `length` let a station put the caret and an `aria-describedby` link on the field, but the message alone is sufficient.
- `unicode: true` for `fmtAngle` exists for display only; screen readers pronounce `π` correctly, ASCII `pi` is the default for readouts that tests match on.

### 8.4 Reduced motion

Not applicable to these modules: no animation, no timing, no rAF. Every result is immediate, so a station running a stepper under `prefers-reduced-motion`
can call the same functions at each step (`rootsOf`, `branchRoot`, `pow`) and show end states without any change here.

### 8.5 Phone layout

Not applicable to the modules. For stations at 390px: `digits` is a parameter of every formatter so a narrow explainer can pass `2`
(`fmtCart(z, 2)`); typical longest plain-text readouts are under 30 characters (`-1234.568 - 1234.568i` is 21); TeX strings wrap at the explainer's
column. No string contains a non-breaking constraint other than the thin spaces `\,` that KaTeX keeps with their neighbours.

---

## 9. Out of scope

- Any rendering, canvas, DOM or CSS; KaTeX integration, tinting and `aria` (that is `js/core/katex.js` and `explainer.js`).
- Domain colouring, pushing curves through `f`, adaptive subdivision, pole breaking, morphing (`js/core/mapping.js`, `domaincolor.js`).
- Tracking the continuous branch along a path or counting laps (stations); this module only supplies `branchArg` and `branchRoot` and the walk test proves the jump sizes.
- `sinh`, `cosh`, `tan`, `atan`, `floor`, user-defined functions, several variables, equations or inequalities, vectors, complex literals such as `3+4j`, implicit multiplication with a trailing number (`z2`), scientific notation (`1e3`), symbolic simplification or differentiation (`toTex` prints the structure it parsed; it does not simplify).
- Exact-form recognition beyond integers, `p/q` (q <= 24), `p sqrt2 / q`, `p sqrt3 / q` (q <= 4) and `p pi / q` (q <= 12); no nested radicals, no `sqrt5`, no `sqrt(13)` (it prints as `3.606`).
- Arbitrary-precision or big-integer arithmetic; numeric calculus beyond central differences and the single-ring `directionalQuotients`.
- Locale, time zone, sounds, narration, video.
- The `home` route, `index.html`, the registry and the smoke harness themselves (the script only borrows a loaded page).

---

## Appendix A. Differences from ARCHITECTURE 3.1 and 3.2 (all additive or more precise)

| # | ARCHITECTURE says | This design | Why | Risk to other goals |
|---|---|---|---|---|
| 1 | `fmtAngle(theta, { digits = 3, pi = true })` | adds `= {}` default for the options object and an optional `unicode = false` | tests and callers write `fmtAngle(2*Math.PI/3)` with one argument; stations show `(2π/3)` | none: defaults reproduce the spec |
| 2 | no `exactAngle` | extra export `exactAngle(theta) -> {p, q} \| null` | stations print "(exact)" only when one exists; the test `fmtAngle(t) !== fmtNum(t)` also works | none: nobody has to use it |
| 3 | exact angle forms for `q <= 12`, `abs(p) <= 24` | `abs(p) <= 120` | the staircase prints `theta + 2 pi k` for `k` up to +-3: `-5pi/6 + 6pi = 31pi/6` must stay a fraction, not flip to `16.232` | none: strict superset |
| 4 | `pow` "by de Moivre: r^n e^{i n theta}" | exponentiation by squaring, mathematically the same product | exact for Gaussian integers; an exact seam hit stays exactly on the seam (`Arg(pow(-i, 2)) === pi`); no loss for large `n`. Equality with de Moivre is a test (U9) | none: values agree to 1e-9 relative |
| 5 | complex arguments are `{re, im}` | a bare real number is accepted wherever a complex argument is expected | the goal's own criteria write `rootsOf(-16, 4)`, `Arg(-1)`; zero measured cost | none |
| 6 | no words for non-finite numbers | `undefined`, `inf`, `-inf`; TeX `\text{undefined}`, `\infty` | readouts must never print `NaN` | none |
| 7 | `branchRoot(c, n, seam)` | `seam` defaults to `-pi` (and `branchArg(z, seam = -pi)`) | the spec says the principal branch is `seam = -pi` | none |
| 8 | `quadraticRoots` with `a = 0` unspecified | two NaN pairs | consistent with "division by zero is NaN" | none |
| 9 | error behaviour unspecified | `RangeError` for invalid `n`, `h`, `rho`, `m`, `argSet` span | programmer errors fail loudly | none: valid calls unchanged |
| 10 | `fmtPolar(z)` example `"2 e^(i 2.094)"` | same; also drops a coefficient of 1 and an angle of 0, writes negative angles as `e^(-i 0.588)`, prints `"0"` for zero | reads like a textbook; spec example unchanged | none |
| 11 | grammar as ARCHITECTURE 3.2 | adds: alternate spellings (U+2212, U+00D7, U+00B7, U+00F7, U+03C0, `**`, U+00B2/3), the rule that a number is never the right factor of an implicit product, limits (400 characters, 80 nesting), `ParseError.length`, a 64-entry compile cache, `compile(src).f` accepting a bare real | friendlier for a student pasting from the handout; protects against `z2` meaning `z^2` | none: every ARCHITECTURE example parses identically |

## Appendix B. Build order and checkpoints for the builder

1. Create `js/core/complex.js` in the section order of 5.2 to 5.7; after the address, arithmetic and elementary functions run U1 to U8; after powers, roots and branches U9 to U16; after calculus U17 and U18; after formatting U19 to U21.
2. Create `js/core/parse.js` in the order tokenizer, parser, `toTex`, `compile`; run U22 to U27 and U30; keep every error message **character for character** as in 2.3 and 7.6 (the tests compare strings).
3. Run U28 and U29, then the two `grep` commands of 7.1; fix any forbidden word (use "range", not "window", even in comments).
4. Write `tests/interact/i1-core-math.mjs` from 7.8 and run it with the smoke command.
5. Run `node --test tests/unit/*.test.mjs` and the smoke command once more; report the exact output.
6. Do not edit any other file. Do not commit.

## Appendix C. Requests for other owners (not done here; recorded for the orchestrator)

1. **`package.json` (no goal owns it): `npm test` is broken on this machine.** `npm test` runs `node --test tests/unit/` and on Node v22.22.0 fails with `Cannot find module '/home/user/math-viz/tests/unit'` before running any test (Node 22 treats the argument as a module path, not a directory). `node --test tests/unit/smoke-harness.test.mjs` and `node --test tests/unit/*.test.mjs` pass. Suggested script: `"test": "node --test tests/unit/*.test.mjs"` (CONSTRAINTS.md also names `npm test` for this directory form). Until then every goal must verify with the explicit command of 7.1.
2. **`docs/ARCHITECTURE.md` 3.1 (planner or orchestrator):** record Appendix A items 1, 2 and 5 (`fmtAngle` default options and `unicode`, `exactAngle`, bare reals accepted) so wave-1 designers can use them. Not blocking: wave-1 goals built from the current text keep working.
3. **Ownership list of `i1-core-math`:** `owns` lists only the two source files. The goal's own `deliverable` names `tests/unit/i1-core-math.test.mjs` and the stage brief names `tests/interact/i1-core-math.mjs`; both are new, collide with no other goal, and belong to this goal.
4. **Smoke harness route for this script:** the script works on any registered route; `home` is used because it always exists in `js/registry.js`. Page-level harness checks for that route belong to `i1-shell` and `i1-station-home-problems`.

## Appendix D. As built (builder notes, iteration 1)

Files: `js/core/complex.js` (49 exports), `js/core/parse.js` (5 exports), `tests/unit/i1-core-math.test.mjs` (31 tests U1 to U31 after the fix round, the 417 table rows of
sections 6.2 and 7.4 to 7.6 embedded and executed row by row), `tests/interact/i1-core-math.mjs` (86 pinned values, 616 TeX strings, 3 speed timings per viewport after the fix round).
Every algorithm in section 5 is implemented as written. The deviations below are the only places the code differs from the text; none changes a pinned value.

| # | Design says | Built | Why |
|---|---|---|---|
| D1 | `Arg`: if `im === 0` return `re < 0 ? pi : 0` | same, but `Arg({re: NaN, im: 0})` is `NaN` | a NaN real axis point should not read as angle 0; every pinned row is unchanged |
| D2 | `wrapArg`: an angle already home is returned unchanged | returned as `theta + 0` | the only difference is `wrapArg(-0)`, which is now `+0` (the "never -0" contract of 2.2) |
| D3 | `sqrt`, `re >= 0`: `im: im / (2 t)` | `im / (2 t) + 0` | normalises a `-0` imaginary part of a nonnegative real input to `+0` |
| D4 | `toTex` of a non-integer number literal is `fmtNum(v, 6)` | falls back to `String(v)` when that would print `0` for a nonzero literal | `0.0000001` must not display as `0` |
| D5 | `toTex` `*`: juxtapose if implicit, or if the left node is a number and the right text does not start with a digit | an implicit product also falls back to `\cdot` when the right text starts with a digit or `.` | `(2)(3)` and `x(2)` would otherwise print as `23` and `x2`; no pinned string is affected |
| D6 | calculus functions call `f` and read `{re, im}` | the result of `f` also accepts a bare real number | additive leniency, same rule as 4.1 |

Fix round (review of the first build). D7 to D10 are **design defects**, so the design text above (2.3, 4.1, 5.2, 5.3, 5.8, 7.3, 7.5.4, 7.6, 7.8) was corrected together with the code; they are listed here so the history stays visible.

| # | Design said (first version) | Now (design and code) | Why |
|---|---|---|---|
| D7 | 5.8 step 5: every `)` that reaches `atom()` without an open `(` right before it is M13, "no matching (" | a `)` right after an operator is the new M17: `Something is missing between "+" and this ")". Put a number or a variable there.` M13 is kept for a `)` with no operand before it | `(z+)`, `sin(z+)`, `(z*)`, `z^(2+)` have a matching `(`; M13 told the student the opposite of what is wrong. Position was already right (the `)`) |
| D8 | 5.8 `toTex` `*`: juxtapose `l + r` | `l + gap + r`, with `gap = \,` when `l` ends in a control word and `r` starts with a letter | `pi z` gave `\piz`, an unknown control sequence in KaTeX 0.16.11 (the Lab formula box and explainer would have fallen back to plain text). Found by a 60,000-string fuzz in review; U26, U27, U30 and the interaction script now cover it. Measured after the fix: 122,000 grammar formulas, 0 KaTeX failures |
| D9 | M4: one sentence, quoting `src[p]`, length 1 | the bar character and U+221A get a targeted sentence; a hidden code point (category C, Z or M) is shown as `U+XXXX`; the quoted character and `length` are a whole code point (an emoji has length 2) | the handout writes moduli as bars, and the generic sentence never said to use `abs(z)`; an emoji was quoted as a lone surrogate half |
| D10 | 4.1: `neg`, `conj`, `inv`, `div` never return `-0` | `mul`, `div`, `inv`, `conj` (real part) and `Arg` add `+ 0`; `pow` follows because it is built on `mul` and `inv`; the sentence now names exactly what is promised | `div(1, -1)` returned `{-1, -0}`, `pow(-i, 2).im` was `-0`, and `Arg({re: 1e300, im: -5e-324})` was `-0` (atan2 underflow), against 2.2 (1). Harmless to the fmt functions, visible to strict `deepEqual` and `Object.is` |

Fix-round verification: the new rows kill all seven mutants run in a scratch copy (a deleted `SEAM_SNAP` line is caught by U5; `CACHE_MAX = 100000` by U25; the missing thin space by U26, U27 and U30; a `-0` back in `div`, `mul`, `inv` or `Arg` by U31; the old M13 for `(z+)` and a generic bar message by U24; a code-unit M4 and a missing hidden-character branch by U24).

Verification run of the first build (Node 22.22.0): `node --test tests/unit/i1-core-math.test.mjs` gave 30 pass, 0 fail (31 after the fix round); a mutation check (three deliberate bugs in a scratch copy)
is caught by U4, U5, U6, U8 and U19; a 60,000-string fuzz (different seed and a wider piece list than U30) threw nothing but `ParseError`, every position in range;
both `grep` commands of 7.1 print what 7.1 says; `node tools/smoke.mjs --route home --script tests/interact/i1-core-math.mjs` prints the four `i1-core-math` lines per
viewport (100k evaluations in 16 to 23 / 56 to 75 / 12 to 21 ms) and, against a scratch copy that has a stub `home` station, ends `2/2 checks passed`.
In the real repository it still reports the missing `js/stations/home.js` (a 404 and the router's error panel) until the home station goal lands, as 7.8 explains.
