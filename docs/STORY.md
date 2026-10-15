# The Story: One Point, Two Addresses

Status: iteration 1, draft 1 (no code exists yet; this file designs the whole experience).
Owner: the Unifier (stage 0). Rewritten freely each iteration. Every claim here is checked
against `docs/ASSIGNMENT.md`; engineering rules live in `docs/CONSTRAINTS.md`.

---

## 0. The spine (read this first)

> A complex number is a place and a move.
> A function is a motion of the whole plane.
> The derivative is the move you see when you zoom into the motion.

That is the whole test. Four lines unpack it:

1. **Place and move.** The Cartesian address (x, y) says where z sits: slide x right, y up.
   The polar address (r, θ) says how to get there from 1: turn θ, stretch by r. Adding composes
   places, so Cartesian is native to +. Multiplying composes moves, so polar is native to ×.
   Pick the address where the question is native, do it, translate back. The point never changes.
2. **The staircase.** A move has infinitely many names: θ, θ + 2π, θ − 2π, ... `arg z` is all of
   them (a set). `Arg z` is the one name in (−π, π] we agreed to use. `z` itself is the point and
   has no ambiguity at all. Roots, principal values, branches and branch cuts are this one fact
   seen from different distances.
3. **Motion and time.** w = f(z) picks up every point and puts it down somewhere. A brush stroke
   z(t) is carried to f(z(t)) on the same clock. Linear maps move the plane by one spin, stretch and
   slide. zⁿ, z^{1/n} and 1/z act on the polar address directly: (r, θ) becomes (rⁿ, nθ),
   (r^{1/n}, θ/n) or (1/r, −θ).
4. **Zoom.** f is differentiable at z₀ when, under a microscope, the motion near z₀ is a single
   spin-and-stretch (by the number f′(z₀)). Up close, every smooth map is a spin-and-stretch plus a
   *mirrored* spin-and-stretch; Cauchy–Riemann says the mirrored part is zero. conj z, Re z and |z|²
   contain a mirror, which is exactly why they fail.

Everything below is these four lines, drawn.

---

## 1. The threads, in plain language

### Thread 1: one point, two addresses

Take z = −1 + i√3. It sits one step left of the origin and √3 steps up. That is its **Cartesian
address**, (−1, √3): the slide that gets you there from 0. The same dot is also at distance 2 from
the origin, at an angle of 120° (2π/3) measured from the positive real axis. That is its **polar
address**, (2, 2π/3): turn 120°, walk 2. Same dot, two descriptions. The dot does not care which
one you use.

Why two? Because the plane has two basic operations and each address is native to one of them.

- **Adding z₂ slides the plane by z₂.** Slides compose by adding coordinates: (x₁ + x₂, y₁ + y₂).
  Cartesian is native. Subtraction is the slide back. Distance |z₁ − z₂| is the length of the
  slide between them.
- **Multiplying by z₂ spins the plane by θ₂ and stretches it by r₂.** Spins compose by adding
  angles, stretches by multiplying lengths: r₁r₂ e^{i(θ₁ + θ₂)}. Polar is native. Division
  unspins and shrinks: (r₁/r₂) e^{i(θ₁ − θ₂)}.
- **Conjugation is a mirror** across the real axis: negate y (Cartesian) or negate θ (polar).
  |z|² = z·conj z because the spin and the unspin cancel and only r·r is left. 1/z = conj z / |z|²:
  invert the radius, mirror the angle.
- Euler's formula e^{iθ} = cos θ + i sin θ is the dictionary between the addresses: e^{iθ} is "the
  unit move that turns by θ", and its Cartesian address is (cos θ, sin θ).

Each address also has **native shapes**. Cartesian: the lines x = c and y = c. Polar: the circles
r = c and the rays θ = c. "|z − a| = R" is "all points at distance R from a", a circle, in one line
of thought and no algebra. Sectors (θ between two values) and annuli (r between two values) are
polar rectangles. The annulus in 1.5.2, the circle in 1.2.1 and 2.5.1, the sector in 2.2.1 are all
polar-native sets; the lines in 1.5.1, 2.1.2 and 2.1.3 are Cartesian-native.

The rule for the test: *pick the address where the question is native, do it there, translate
back.* Every computation on the site is shown in both columns, with live numbers, so you watch the
two addresses agree.

### Thread 2: the staircase (the point z, the set arg z, the number Arg z)

This is the student's own question: what is the difference between a number's args, what defines
it in polar form, and the number itself as it sits on the Cartesian plane?

The Cartesian address is unique: one dot, one (x, y). The polar address is not: turning 2π/3 and
turning 2π/3 + 2π land on the same dot, and so does 2π/3 − 2π. So "the polar form" of z is a whole
family, 2e^{i(2π/3 + 2πk)}, one for each integer k. The textbook says it exactly:

- **Def 1.4.4:** arg z = { θ : z = r(cos θ + i sin θ) }. A *set*. Picture a spiral staircase
  rising above the point, one step per full turn: ..., θ − 2π, θ, θ + 2π, ...
- **Def 1.4.6:** Arg z = the single θ in (−π, π]. The step we agreed to call home.
- **z** is the point on the floor. It never moves, whichever step you stand on.

So: the point is a place; a polar form is one way of naming the move that reaches it; arg z is
every such name; Arg z is the official one. Three objects, and the test is mostly about knowing
*which one you are holding*:

| Task | Which step(s) of the staircase |
|---|---|
| Write z in polar/exponential form, state Arg z (1.3.1) | Any step is a valid polar form; the home step is the one they want. |
| Compute a power (1.3.2) | Any step. nθ on different steps differs by multiples of 2πn, which is still a multiple of 2π. Report on the home step. |
| Find all n-th roots (1.4.1, 1.4.2) | **Every step.** θ/n is different on different steps: (θ + 2πk)/n for k = 0, 1, ..., n − 1 gives n distinct points, spaced 2π/n apart on the circle of radius \|c\|^{1/n}; k = n lands back on k = 0. "A degree-n equation has n roots" is the staircase divided by n. |
| Principal root (2.2.2) | **The home step only:** w^{1/n} = \|w\|^{1/n} e^{i Arg(w)/n}. |
| A branch of z^{1/n} (2.4.1) | **Choose a step at every point, continuously.** Walk once around 0 and the step must advance by one, so you cannot choose continuously on any loop around 0. You must cut the plane along a ray from 0 so no loop closes. The principal branch cuts along the negative real axis, where Arg jumps from π to −π. To be continuous *on* the negative real axis, cut somewhere else: for example 0 < θ < 2π (cut on the positive real axis). The branch point is 0, the axis of the staircase. |
| The fan (2.2.1) | w = zⁿ multiplies every step by n: a sector of opening α fans open to opening nα. Roots are the fan run backwards, which is why they need the staircase. |

The Riemann surface is the staircase made literal: a helical surface on which z^{1/n} is single
valued, with n turns glued back to the start.

### Thread 3: a function is a motion; a derivative is a move you see when you zoom in

w = f(z) picks up every point z and puts it down at w. The site watches this with **time**: a
brush stroke z(t), 0 ≤ t ≤ 1, is carried to f(z(t)) with the same clock, and a **morph**
(1 − s)z + s f(z) slides the plane from input to output as s runs from 0 to 1. On paper the same
idea is *parametrize, push forward, eliminate t*: that is how "find the image of the line x = 2"
is done (2.1.2, 2.1.3), and how "the image of the circle" is done (2.5.1, P4).

- **Linear transformations** f(z) = az + b move the whole plane by one spin (by arg a), one
  stretch (by |a|) and one slide (by b). Composing two of them gives another one (P3: a(cz + d) + b
  = (ac)z + (ad + b)). Lines go to lines, circles to circles (P4, 2.1.3).
- **Polar-native maps** act on the polar address: zⁿ sends (r, θ) to (rⁿ, nθ); z^{1/n} sends it
  to (r^{1/n}, θ/n) on a chosen step; 1/z sends it to (1/r, −θ). They respect the polar grid
  (circles and rays stay circles and rays) and bend the Cartesian grid: under z², the lines x = c
  and y = c become parabolas that all share the focus 0 (2.1.2); under 1/z, lines not through 0
  become circles through 0 and circles through 0 become lines (2.5.1).
- **Writing f in both addresses** (2.1.1) is Thread 1 applied to a function: u(x, y) + iv(x, y)
  is the slide view, u(r, θ) + iv(r, θ) is the move view; z² + iz is r² e^{2iθ} + r e^{i(θ + π/2)}.

**Zoom.** Now put z₀ under a microscope. If f(z₀ + Δz) ≈ f(z₀) + f′(z₀)·Δz, then a tiny disk
around z₀ is spun and stretched by the single number f′(z₀) and slid to f(z₀). That is what
differentiable *means*: under the microscope, the motion is a move. It is also why the limit of the
difference quotient must be the same from every direction: a spin-and-stretch treats all
directions alike.

Here is the picture that makes all of Chapter 3 one station. Up close, any smooth map of the
plane is a spin-and-stretch plus a *mirrored* spin-and-stretch:

> Δw ≈ A·Δz + B·conj(Δz), with A = ½(f_x − i f_y) and B = ½(f_x + i f_y).

Approach z₀ along direction φ (Δz = ρe^{iφ}, ρ → 0). The difference quotient tends to
A + B e^{−2iφ}. As φ sweeps around, that value traces **a circle with center A and radius |B|**.
The derivative exists exactly when the circle is a single point, i.e. **B = 0**, and then
f′(z₀) = A. Write B = 0 in coordinates: ½[(u_x − v_y) + i(v_x + u_y)] = 0, which is
u_x = v_y and u_y = −v_x. **Cauchy–Riemann says "no mirror part."** And f′ = A = u_x + i v_x.
In matrix form: the Jacobian [[u_x, u_y], [v_x, v_y]] has the spin-and-stretch shape
[[a, −b], [b, a]].

| f | A (spin-and-stretch) | B (mirror) | Verdict |
|---|---|---|---|
| z² + z (3.1.1) | 2z + 1 | 0 | differentiable everywhere; f′ = 2z + 1 |
| e^x(cos y + i sin y) (3.2.1) | f itself | 0 | entire; f′ = f |
| conj z | 0 | 1 | pure mirror; nowhere differentiable |
| Re z = (z + conj z)/2 (P5, P6) | ½ | ½ | circle of radius ½ through 1 and 0: along the real axis the quotient is 1, along the imaginary axis 0 |
| \|z\|² = z·conj z (3.1.2) | conj z | z | circle of radius \|z\|, a point only at z = 0 |
| z²/\|z\|² = z/conj z (2.3.1) | — | — | equals e^{2iθ}: remembers the direction, forgets the distance, so the limit at 0 depends on how you approach |

The same circle explains the consequence theorems. If u = c everywhere (P7), then u_x = u_y = 0,
CR forces v_x = v_y = 0, so f′ = 0 and f is constant (Thm 3.2.13). If |f| is constant on a domain
(Thm 3.2.12), the image lies on a circle; a spin-and-stretch with nonzero stretch would push a
small disk off that circle, so the stretch is 0, f′ = 0, f is constant.

### The picture behind every picture: the 4D graph and its shadows

The graph of w = f(z) is the set of points (x, y, u, v) in four dimensions. Nobody can see it. But
every view on the site is a shadow of that one object, and the Lab lets you walk around it:

- **Side by side:** the two flat shadows (x, y) and (u, v), tied together by time.
- **Morph:** (1 − s)(x, y) + s(u, v) is a sliding flat shadow of the same object.
- **Domain coloring:** the (x, y) shadow with (u, v) painted on it as hue (arg w) and brightness (|w|).
- **Modulus landscape:** the 3D shadow (x, y, |w|), colored by arg w.
- **Re surface and Im surface:** the 3D shadows (x, y, u) and (x, y, v). Rotating in the u–v plane
  turns one into the other: they are two sides of one surface.
- **4D viewer:** any 3D shadow, rotated by you; the hidden fourth coordinate is painted as color so
  nothing is lost.
- **Riemann surface of z^{1/n}:** the 4D graph of *all n roots at once*, seen in 3D. It is the
  staircase of Thread 2 made solid.
- **Riemann sphere:** the z-plane itself wrapped so that ∞ is a point. On the sphere, 1/z is a
  half-turn about the axis through 1 and −1, which is why lines (circles through ∞) and circles
  trade places (2.5.1).

### How the threads answer what the student asked for

| The student said | Where it lives |
|---|---|
| "move between polar and Cartesian coordinates at will, and it allows for magical things" | Thread 1; every numeric explainer has a Cartesian column and a polar column with live numbers |
| "the difference between a complex number's args and what defines it in polar form vs the number itself as it sits on the Cartesian plane" | Thread 2; the `staircase` station, and the staircase widget drawn beside every angle on the site |
| "input vs output related as a time dimension; where a given input brush stroke moves as it maps to the output" | Thread 3; the time ramp and the morph, in every mapping station and the Lab |
| "draw a rectangle or a circle or whatever shape, like Tom Riddle's diary, with several visualization formats" | the `lab` station |
| "glimpse this weird 4D type structure" | the `graph4d` station and the 4D view in the Lab |
| "not a set of procedures I need to memorize but a point on a visualization story that I revisit" | the Story Map (`home`) and the problem index (`problems`): each review problem is one dot on the map with a one-sentence aha |

---

## 2. The Story Map

Twenty-one places, in story order. Each entry says what the student **sees**, what they
**touch**, what they **realize**, and which **thread lines** run through it. Station ids are the
hash routes (`#addresses`, `#lab`, ...). Chapter order is preserved except that `limits` is moved
to sit directly before `derivative`, because "every direction must agree" is the door into
"the directional circle shrinks to a point."

Thread lines, drawn on the map as three colored paths:
- **T1 Addresses** (`--cart` / `--polar`): home → addresses → arithmetic → distance → powers → mappings → linear → powermap → reciprocal → lab.
- **T2 Staircase** (`--polar`, dashed): addresses → staircase → powers → roots → principal-root → branches → graph4d (Riemann surface).
- **T3 Motion and zoom** (`--input` → `--output`): curves → mappings → linear → powermap → reciprocal → limits → derivative → cauchy-riemann → lab → graph4d.

### Part I: the point (Chapter 1)

**1. `home` — The Map.**
Sees: the spine (four lines), the map of stations drawn as a path with the three thread lines
running through it, a "where is problem 1.4.2?" finder, and the study-session plan.
Touches: clicks any station or any problem number; a small live demo (drag one point, both
addresses update) so the first screen already teaches.
Realizes: there are only four ideas, and every test question is a dot on this path.
Thread lines: all three start here.

**2. `addresses` — One Point, Two Addresses.** (1.3.1; T1.1, T1.3)
Sees: one draggable point z on the plane. Its Cartesian address drawn as dashed drop lines to the
axes (`--cart`); its polar address drawn as the ray from 0 and the angle arc from the positive real
axis (`--polar`). Beside the plane, the two-column explainer: x = r cos θ, y = r sin θ on the left;
r = √(x² + y²), θ = atan2(y, x) on the right, with live numbers. Euler's formula shown as the
dictionary. A small staircase preview beside θ shows ghost values θ ± 2π with Arg highlighted.
Touches: drags z; snaps to presets (−1 + i√3, √3 + i, 2i, −16, 1 + i); toggles the Cartesian grid
(lines) versus the polar grid (circles and rays) to see which shapes each address finds natural;
types a number in either address and watches the other update.
Realizes: the dot never changes; only its description does. Problem 1.3.1 is "read the polar
address of the dot at (−1, √3)": r = 2, θ = 2π/3, Arg z = 2π/3.
Thread lines: T1 begins; T2 begins (the ghost angles).

**3. `arithmetic` — Slide, Spin, Stretch, Mirror.** (1.1.1, 1.1.2, P1, P2; T1.1, T1.3)
Sees: two draggable points z₁, z₂ and a result point. A mode chip selects +, −, ×, ÷, conj, 1/z.
For +: the parallelogram (the slide). For ×: the result's ray with the two angle arcs stacked
(θ₁ then θ₂) and the two radii multiplied; the morph button animates "spin z₁ by θ₂, then stretch
by r₂." For ÷: the arcs subtract, the radii divide. For conj: the mirror line. For 1/z: the unit
circle with the inversion step then the mirror step.
Touches: drags both points; presets load 3 − 2i and −1 + 4i; a "show me both ways" toggle on the
explainer: Cartesian column (x₁x₂ − y₁y₂, x₁y₂ + x₂y₁) and polar column (r₁r₂, θ₁ + θ₂), with the
final "same point" row showing the two addresses of the answer agree.
Realizes: 1.1.1 is a slide-native question answered in Cartesian (5 + 14i; −11/17 − (10/17)i),
and the polar column is the check (|z₁z₂| = √13·√17 = √221). 1.1.2 is two slides and a mirror
(z₁ − z₂ = 4 − 6i, mirror to 4 + 6i, Im = 6). P1 is "mirror then multiply equals multiply then
mirror," obvious in polar: negating both angles negates their sum. P2 is "spin and unspin
cancel": z·conj z = r·r.
Thread lines: T1.

**4. `distance` — Length, Distance, Circles.** (1.2.1, 1.2.2; T1.2)
Sees: |z| as the length of the ray; |z₁ − z₂| as the length of the slide between two draggable
points; the set |z − a| = R drawn as a circle with a draggable center a and radius handle R; the
triangle inequality as a bendable triangle 0, z₁, z₁ + z₂ with the three lengths and the slack
|z₁| + |z₂| − |z₁ + z₂| shown live, together with the lower bound ||z₁| − |z₂|| ≤ |z₁ ± z₂|.
Touches: drags points; makes the triangle inequality tight by aligning z₁ and z₂ (slack goes to 0
exactly when the arguments agree).
Realizes: "distance" is one slide's length: |(4 + 3i) − (−1 + i)| = |5 + 2i| = √29. "|z − (1 + 2i)|
= 3" is a circle, the polar-native shape, centered at 1 + 2i with radius 3; no expanding needed.
Thread lines: T1 (native shapes).

**5. `staircase` — The Staircase: z, arg z, Arg z.** (1.3.1; T1.3; feeds 1.4.x, 2.2.2, 2.4.1)
Sees: left, the plane with one point z drawn once and the negative real axis drawn as a dashed
seam. Right, a vertical staircase of angle values ..., θ − 4π, θ − 2π, θ, θ + 2π, ... with the home
window (−π, π] shaded and the step inside it labeled Arg z. Below, a 3D helix (the Riemann surface
of arg, built from the shared three.js helper): the point's position lifted to every step. Thm
1.4.14 as a live line: arg(z₁z₂) = arg z₁ + arg z₂ "as sets," shown by two staircases adding to a
third.
Touches: drags z once around the origin counterclockwise. The point moves smoothly; the staircase
slides smoothly; the Arg label jumps from π to −π as z crosses the seam. A "walk" button animates
the loop and counts the steps gained (one per lap). A toggle moves the seam to another ray (this is
the first look at a branch cut).
Realizes: z is a place; arg z is every name of the move that reaches it; Arg z is the official
name, and the official name must jump somewhere because a name cannot advance by one step on a
closed loop and still be continuous. Everything in Chapters 1.4, 2.2 and 2.4 is this picture.
Thread lines: T2 central station.

**6. `powers` — Powers: Spin n Times.** (1.3.2; T1.3, T1.4)
Sees: z = √3 + i with its polar address (2, π/6). A slider n from 1 to 12 draws z, z², ..., zⁿ as a
spiral of dots: each step spins by π/6 and stretches by 2. The explainer: polar column 2ⁿ e^{inπ/6};
Cartesian column converts the final answer and shows the staircase wrap 10π/6 = 5π/3 ≡ −π/3.
A "try it in Cartesian" panel multiplies out (√3 + i)(√3 + i)... step by step to show why nobody
does that.
Touches: drags z to any point; scrubs n; toggles between reporting the angle as nθ, as the home
step, and as a Cartesian pair.
Realizes: (√3 + i)^10 = 1024 e^{i5π/3} = 512 − 512√3 i. A power is "the same move n times," so
polar is native; the only care needed is wrapping the final angle onto the home step.
Thread lines: T1 (native address), T2 (any step works for powers).

**7. `roots` — Roots: Divide the Staircase.** (1.4.1, 1.4.2, 1.4.3; T1.4)
Sees: the target c (draggable; presets 1, −16, i, 2i) and its staircase. A slider n. Each staircase
step (θ + 2πk) is divided by n and drawn as a ray; the first n rays land on n distinct points on the
circle of radius |c|^{1/n}; the (n+1)-th ray lands back on the first and is drawn ghosted. The
n points form a regular n-gon. For c = 1, the primitive roots are highlighted (those whose
smallest power giving 1 is n). A separate panel for the quadratic formula: z² − 4z + 13 = 0 is
completed to (z − 2)² = −9, so z − 2 is a square root of −9 (two points, 3i and −3i, on the circle
of radius 3) slid by 2.
Touches: drags c; scrubs n; clicks a root to see its exponential and Cartesian addresses and to
raise it to the n-th power along an animated spiral back to c.
Realizes: 1.4.1: e^{2πik/5}, k = 0..4 (1, 0.309 + 0.951i, −0.809 + 0.588i, −0.809 − 0.588i,
0.309 − 0.951i); all but 1 are primitive. 1.4.2: −16 = 16e^{iπ}, so the roots are 2e^{i(π/4 + kπ/2)}:
2e^{iπ/4}, 2e^{i3π/4}, 2e^{i5π/4}, 2e^{i7π/4} = √2 + √2i, −√2 + √2i, −√2 − √2i, √2 − √2i. 1.4.3:
z = 2 ± 3i, a mirror pair. There are n roots because there are n distinct steps modulo n.
Thread lines: T2 (the staircase divided), T1 (circle of radius |c|^{1/n}).

### Part II: curves and sets (Chapter 1.5)

**8. `curves` — Curves and Time.** (1.5.1; T1.5)
Sees: a curve z(t) drawn with the time ramp (dark at t = 0 to bright at t = 1, arrowhead at the
end). Presets: the segment from 2 + i to −3 − 3i, the circle z₀ + Re^{it}, a figure-eight (not
simple), a square (piecewise smooth), an open arc (not closed). A time slider moves a cursor along
the curve and shows z(t), x(t), y(t) live. The explainer builds the segment two ways:
z(t) = (1 − t)z₀ + t z₁ (a slide that grows with t) and x(t) = x₀ + t(x₁ − x₀), y(t) = y₀ + t(y₁ − y₀).
Chips classify the preset: smooth / piecewise smooth / closed / simple / positive orientation
(interior on the left as you walk).
Touches: drags endpoints; scrubs t; reverses direction (−C) and watches the ramp flip; flips
orientation of the circle and watches the "interior on the left" marker.
Realizes: 1.5.1: z(t) = (2 − 5t) + i(1 − 4t), 0 ≤ t ≤ 1. Time is the fourth coordinate the site
uses everywhere: this same ramp will be carried onto the w-plane by every function.
Thread lines: T3 begins here.

**9. `sets` — Disks, Annuli, Boundaries.** (1.5.2; T1.5)
Sees: the set S = {1 < |z + i| ≤ 3} shaded: an annulus around −i, inner circle dashed (excluded),
outer circle solid (included). A draggable probe point with an ε-disk around it; the disk is
colored by what it contains (all in S: interior point; none: exterior; both: boundary). Chips
answer open / closed / bounded / connected / domain / region, each with a one-line reason that
updates when the set changes. Presets: the open annulus, the closed annulus, a punctured disk, a
half plane, two disjoint disks (not connected).
Touches: drags the probe onto each circle and sees "boundary" light up; shrinks ε; drags a
bounding closed disk until it contains S (bounded); edits the inequalities (< vs ≤).
Realizes: 1.5.2: neither open (the outer circle is in S but is not interior) nor closed (the inner
circle is a boundary not in S); bounded (inside |z + i| ≤ 3); boundary = both circles |z + i| = 1
and |z + i| = 3; not a domain because it is not open (it is connected, so it is a region). Every
topological word is a sentence about tiny disks |z − z₀| < ε, which are polar-native shapes, and
those same tiny disks are what limits and derivatives are made of.
Thread lines: T1 (polar-native sets), T3 (the ε-disk reappears at `limits`).

### Part III: motions (Chapter 2)

**10. `mappings` — A Function Is a Motion.** (2.1.1; T2.1)
Sees: side-by-side z-plane and w-plane for f(z) = z² + iz. A draggable point z with both addresses;
w = f(z) with both addresses. The explainer has a Cartesian column (u = x² − y² − y, v = 2xy + x,
derived live by expanding (x + iy)² + i(x + iy)) and a polar column (u = r² cos 2θ − r sin θ,
v = r² sin 2θ + r cos θ, derived by r²e^{2iθ} + re^{i(θ + π/2)}), both evaluated at the current z
and shown to agree. A morph slider s runs (1 − s)z + s f(z) over a Cartesian grid and a polar grid.
Touches: drags z; scrubs the morph; switches the function to z², iz − 2i, 1/z, conj z; toggles
which grid is being carried.
Realizes: 2.1.1 is Thread 1 applied to a formula: the slide view and the move view of the same
function. iz is "turn a quarter turn," so in polar it is just θ + π/2. Watching the grid flow is
how to think about "image of a set."
Thread lines: T1, T3.

**11. `linear` — Linear Maps: Spin, Stretch, Slide.** (2.1.3, P3, P4; T2.1)
Sees: f(z) = az + b with draggable a and b. The motion is shown in three stages with a stage
slider: spin by arg a, stretch by |a|, slide by b. The line x = 2 under iz − 2i; the unit circle
under (1 + i)z; a composition panel f∘g with the combined a·c and a·d + b.
Touches: drags a and b; steps through the stages; draws a quick stroke and watches it move as a
rigid spin-stretch-slide (shapes keep their shape).
Realizes: 2.1.3: z = 2 + iy gives i(2 + iy) − 2i = −y, the real axis v = 0; iz − 2i = i(z − 2) is
"slide left 2, then turn a quarter turn" (or turn, then slide down 2). P3: a(cz + d) + b =
(ac)z + (ad + b), spins add, stretches multiply, slides compose. P4: |(1 + i)z| = √2|z| = √2 and
every point of that circle is hit (z = w/(1 + i) has |z| = 1), so the image is exactly the circle
of radius √2.
Thread lines: T1 (the move is the function), T3.

**12. `powermap` — zⁿ: Fans and Parabolas.** (2.1.2, 2.2.1; T2.1, T2.2)
Sees: side by side, with n selectable (2, 3, 4, ...). Two preset inputs: the vertical line x = 2
and the sector 0 < arg z < π/4. Under z², the line becomes the parabola u = 4 − v²/16 (vertex 4,
opening left, focus at 0); dragging the line to x = c shows the whole family of confocal parabolas
with focus 0, and the horizontal lines y = c give the other family, crossing at right angles. Under
z³, the sector fans open to 0 < arg w < 3π/4. The polar grid is carried to a polar grid (circles to
circles of radius rⁿ, rays to rays at nθ); the Cartesian grid bends.
Touches: drags the line; drags the sector's edges; scrubs n and watches the fan open until it
overlaps itself (n·α > 2π); scrubs the morph; plays time along the line and sees the parabola
drawn by the same clock.
Realizes: 2.1.2: z = 2 + iy gives u = 4 − y², v = 4y; eliminate the time variable y = v/4 to get
u = 4 − v²/16. 2.2.1 (image of the sector): zⁿ multiplies the angle, so the sector 0 < arg z < π/4
becomes 0 < arg w < 3π/4; the modulus r³ covers all positive reals so nothing else changes. Polar-
native functions keep polar shapes and bend Cartesian ones; choose the address by the shape you
were given.
Thread lines: T1, T2 (the fan), T3.

**13. `principal-root` — Principal Roots: Stand on the Home Step.** (2.2.2; T2.2)
Sees: w = 2i with its staircase. The n roots drawn ghosted; the one made from the home step (Arg w)
drawn solid and labeled w^{1/n}. The explainer: |w|^{1/n} e^{i Arg(w)/n} in polar, then converted.
A second panel sweeps w once around the origin and shows the principal root moving at half speed
and jumping across the seam (the negative real axis).
Touches: drags w; scrubs n; clicks the other roots to see which step they came from.
Realizes: 2.2.2: |2i| = 2, Arg(2i) = π/2, so (2i)^{1/2} = √2 e^{iπ/4} = 1 + i. The other square
root, −1 − i, comes from the step π/2 + 2π. "Principal" means "use the home step."
Thread lines: T2.

**14. `branches` — Branches and Cuts.** (2.4.1; T2.4)
Sees: the cube root with a draggable seam (cut ray) and a window of angles of width 2π starting at
the seam angle. The z-plane shows the cut; the w-plane shows the wedge of angles the branch lands
in (a third of a turn). A test point walks along the negative real axis and across it; the branch
value is plotted and marked continuous or jumping. Below, the Riemann surface of z^{1/3} in 3D
(three sheets glued along the cut), using the shared 3D helper.
Touches: drags the seam; tries the principal choice (seam on the negative real axis: the value
jumps there); rotates the seam to the positive real axis (0 < θ < 2π) or to the negative imaginary
axis and sees the walk across the negative real axis become continuous; rotates the 3D surface.
Realizes: 2.4.1: f(z) = r^{1/3} e^{iθ/3} with 0 < θ < 2π is continuous along the negative real
axis, where θ = π and f(−r) = r^{1/3} e^{iπ/3}; any window whose seam avoids the negative real axis
works. A branch is a continuous choice of step; the seam is where the choice is forced to jump; the
branch point 0 is the axis of the staircase.
Thread lines: T2, and a bridge to `graph4d`.

**15. `reciprocal` — 1/z and the Sphere.** (2.5.1; T2.5)
Sees: side by side with 1/z decomposed into two stages: inversion in the unit circle
(r → 1/r, same ray) then the mirror (θ → −θ). Presets: the circle |z − 1| = 1, a line not through
0, a circle not through 0, the unit circle. A third panel is the Riemann sphere (stereographic
projection, shared 3D helper): the z-plane's shapes drawn on the sphere; 1/z shown as a half-turn
of the sphere about the axis through 1 and −1; ∞ is the north pole.
Touches: drags the circle's center and radius; drags a point along |z − 1| = 1 toward 0 and watches
the image run off to infinity (up to the north pole on the sphere); toggles generalized-circle
presets.
Realizes: 2.5.1: points of |z − 1| = 1 are z = 2cos θ e^{iθ}, so 1/z = e^{−iθ}/(2cos θ) =
½ − (i/2)tan θ: the vertical line Re w = ½. In Cartesian: |z − 1|² = 1 is x² + y² = 2x; with
z = 1/w this is 1 = 2u, the same line. A circle through 0 must become a line because 0 goes to ∞.
Thread lines: T1 (polar-native map), T3, bridge to `graph4d` (the sphere).

**16. `limits` — Limits: Every Direction Must Agree.** (2.3.1, P5; T2.3)
Sees: the function g(z) = (x² − y² + 2ixy)/(x² + y²) with z₀ = 0. Left, approach paths into 0:
lines y = mx, the curve y = x², a spiral; a point slides along the chosen path with time. Right,
the value g(z(t)) traces its own path and the limiting value is marked. Because g = z/conj z = e^{2iθ},
the limit along a line at angle θ is e^{2iθ}: the set of all directional limits is the unit circle.
The same panel for P5: (Re(1 + z) − 1)/z = x/z = cos θ e^{−iθ}, whose directional limits trace the
circle |w − ½| = ½ (1 along the real axis, 0 along the imaginary axis). Below, the ε–δ picture: a
target disk of radius ε around w₀ and the largest source disk of radius δ whose image fits.
Touches: changes the path; scrubs time; drags ε and watches δ.
Realizes: 2.3.1: along y = x² the value is (1 − x² + 2ix)/(1 + x²) → 1 (the curve becomes tangent
to the real axis, direction 0). The full limit does not exist because different directions give
different points on the circle. P5: 1 along the real axis, 0 along the imaginary axis, so no limit.
A limit exists when the circle of directional values is a single point. Hold that thought.
Thread lines: T3; the ε-disk is the same disk from `sets`.

### Part IV: zoom (Chapter 3)

**17. `derivative` — The Derivative Is a Move.** (3.1.1, 3.1.2, P6; T3.1)
Sees: the microscope. Left, the z-plane with a draggable z₀ and a small ring of direction arrows
around it. Right, the w-plane with f(z₀) and the image of the small ring: if f is differentiable
at z₀ the ring is spun and stretched (still a circle, rotated by arg f′(z₀), scaled by |f′(z₀)|);
if not, it is squashed or flipped. A second view, **the direction circle**: for each direction φ,
the difference quotient (f(z₀ + ρe^{iφ}) − f(z₀))/(ρe^{iφ}) is plotted for small ρ; the plotted
points trace a circle with center A and radius |B|, and the derivative is the point it collapses to
when B = 0. Function chips: z² + z, |z|², conj z, Re z, z³, e^z, 1/z.
Touches: drags z₀; shrinks ρ; sweeps φ by hand; for |z|² drags z₀ toward 0 and watches the circle
of radius |z₀| shrink to the single point 0.
Realizes: 3.1.1: ((z + Δz)² + (z + Δz) − z² − z)/Δz = 2z + 1 + Δz → 2z + 1 from every direction;
f′(z) = 2z + 1. 3.1.2: the quotient tends to conj z + z e^{−2iφ}, a circle of radius |z| around
conj z; it is a point only when z = 0, so f′(0) = 0 and f is differentiable nowhere else, hence
analytic nowhere (no disk). P6: Re z gives the circle of radius ½ from `limits`, at every z₀.
Differentiable means "under the microscope, a single spin-and-stretch."
Thread lines: T3 central station; T1 (a derivative is a complex number, a move).

**18. `cauchy-riemann` — Cauchy–Riemann: No Mirror.** (3.2.1, P7; T3.2)
Sees: the local linear map at z₀ drawn as the image of a tiny square (a parallelogram in general);
the Jacobian [[u_x, u_y], [v_x, v_y]] with live numbers; the two tests u_x = v_y and u_y = −v_x as
live equalities with the residuals shown; the decomposition Jacobian = spin-and-stretch part A
plus mirror part B, drawn as two overlaid parallelograms. f′ = u_x + i v_x = v_y − i u_y read off
when CR holds. Function chips: e^x(cos y + i sin y), z² + z, conj z, Re z, |z|², u = c with any v.
Touches: drags z₀; edits u and v for the u = c case and sees v forced constant; toggles "paths
along horizontal and vertical" to see how CR is derived (the limit along Δx gives u_x + i v_x, along
iΔy gives v_y − i u_y, and they must agree).
Realizes: 3.2.1: u = e^x cos y, v = e^x sin y; u_x = e^x cos y = v_y, u_y = −e^x sin y = −v_x,
partials continuous everywhere, so entire; f′ = u_x + i v_x = e^x cos y + i e^x sin y = f(z)
(this is e^z). P7: u = c gives u_x = u_y = 0, CR gives v_x = v_y = 0, so f′ = 0 and f is constant.
CR is the matrix shape [[a, −b], [b, a]] of a spin-and-stretch; equivalently B = 0, no mirror.
Thread lines: T3 ends; T1 (a spin-and-stretch is multiplication by a complex number).

### Part V: the diary

**19. `lab` — The Mapping Lab.** (every problem with an image; T2.1, T2.2, T2.5, T3.1)
See section 6. Sees: the z-plane canvas to draw on and a w-plane (or one of the other views).
Touches: draws anything; picks f; scrubs time and morph; switches views; loads a problem preset.
Realizes: every "find the image of" question is "draw it, push it forward, read it." And every
view is a shadow of the same 4D graph.
Thread lines: all three meet here.

**20. `graph4d` — The 4D Graph.** (T2.2, T2.4, T2.5, T3.1 context; the student's "4D" request)
Sees: a 3D view (shared three.js helper) of the graph {(x, y, u, v)} of the chosen f over a disk or
the Lab's shapes, projected to 3D by a rotation of R⁴ that the student controls with two sliders
(the u–v angle, which morphs the Re surface into the Im surface, and the y–v angle, which swaps the
roles of input and output); the hidden coordinate painted as color. Presets: z² (one smooth
surface), z^{1/2} and z^{1/3} with all roots (the Riemann surface appears by itself), 1/z (the pole
runs off to infinity; a sphere view tames it), e^z. A "modulus landscape" toggle shows
(x, y, |w|) with hue = arg w; a "sphere" toggle wraps the domain onto the Riemann sphere.
Touches: orbits; scrubs the two 4D angles; drops a stroke from the Lab onto the surface and sees it
as a 4D curve.
Realizes: Re surface, Im surface, modulus landscape, domain coloring and the Riemann surface are
not five objects; they are one object seen from five places.
Thread lines: T2 (the staircase made solid), T3.

**21. `problems` — The Problem Index.** (every review problem and proof; every topic)
Sees: the table of section 3 of this file, as cards: problem statement (KaTeX), the station it
lives at, which address makes it easy, the one-sentence aha, and the final answer hidden behind a
"reveal" so the student predicts first. Topic checklist T1.1–T3.2 with station links. Progress
ticks (localStorage, optional).
Touches: filters by chapter; clicks through to the station with the problem's preset loaded
(route `#<station>` then the station reads the requested preset from the store).
Realizes: the exam is 29 dots on a path they have walked.

---

## 3. Every review problem, pinned to a place

"Address" is the address that makes the problem easy (C = Cartesian/slide, P = polar/move,
C→P→C = convert, do it, convert back). Answers are hand-checked and numerically verified; they are
the values the unit tests must assert.

| Problem | Place | Address / thread | The aha (one sentence) | Answer |
|---|---|---|---|---|
| 1.1.1 z₁z₂, z₁/z₂ for z₁ = 3 − 2i, z₂ = −1 + 4i | `arithmetic` | C for the arithmetic, P as the check (T1) | Multiply by the definition; the polar column checks the modulus √13·√17 = √221 and the angle. For division, multiply top and bottom by the mirror of z₂ so the spins cancel. | z₁z₂ = 5 + 14i; z₁/z₂ = −11/17 − (10/17)i |
| 1.1.2 Im(conj(z₁ − z₂)) | `arithmetic` | C (T1) | Two slides and a mirror: 4 − 6i mirrored is 4 + 6i. | 6 |
| 1.2.1 sketch \|z − (1 + 2i)\| = 3 | `distance` | P (native shape, T1) | "Distance from 1 + 2i equals 3" is a circle; no algebra. | circle, center 1 + 2i, radius 3 |
| 1.2.2 distance between 4 + 3i and −1 + i | `distance` | C (T1) | Distance is the length of one slide: \|5 + 2i\|. | √29 ≈ 5.385 |
| 1.3.1 polar and exponential form of −1 + i√3; Arg | `addresses` (+ `staircase`) | C→P (T1, T2) | Read the polar address of the dot at (−1, √3): length 2, second quadrant, 120°. | z = 2(cos 2π/3 + i sin 2π/3) = 2e^{i2π/3}; Arg z = 2π/3 |
| 1.3.2 (√3 + i)^10 in Cartesian | `powers` | C→P→C (T1, T2) | The same move (turn π/6, stretch 2) ten times; wrap 10π/6 onto the home step −π/3. | 1024e^{i5π/3} = 512 − 512√3 i |
| 1.4.1 5th roots of unity | `roots` | P (T2) | Divide the staircase of 1 (angles 2πk) by 5: five points 72° apart on the unit circle. | e^{2πik/5}, k = 0..4: 1, 0.309 + 0.951i, −0.809 + 0.588i, −0.809 − 0.588i, 0.309 − 0.951i; all but 1 are primitive |
| 1.4.2 4th roots of −16 | `roots` | P→C (T2, T1) | −16 is 16 at angle π; divide the staircase by 4: radius 2, angles π/4 + kπ/2. | 2e^{iπ/4}, 2e^{i3π/4}, 2e^{i5π/4}, 2e^{i7π/4} = √2 + √2i, −√2 + √2i, −√2 − √2i, √2 − √2i |
| 1.4.3 solve z² − 4z + 13 = 0 | `roots` | C, with a root in disguise (T2) | (z − 2)² = −9, so z − 2 is a square root of −9 (±3i), then slide by 2; the roots are a mirror pair. | z = 2 ± 3i |
| 1.5.1 parametrize the line 2 + i → −3 − 3i | `curves` | C (T3, time) | A slide that grows with time: start + t·(end − start). | z(t) = (2 − 5t) + i(1 − 4t), 0 ≤ t ≤ 1 |
| 1.5.2 S = {1 < \|z + i\| ≤ 3} | `sets` | P (native shape, T1) | An annulus around −i; the inner circle is left out, the outer circle is kept in; decide each word by looking at a tiny disk. | neither open nor closed; bounded; boundary = {\|z + i\| = 1} ∪ {\|z + i\| = 3}; not a domain (not open; it is connected, so it is a region) |
| 2.1.1 f(z) = z² + iz in u + iv, both addresses | `mappings` | both (T1 on a function) | Expand (x + iy)² + i(x + iy); or r²e^{2iθ} + re^{i(θ + π/2)} because i is a quarter turn. | u = x² − y² − y, v = 2xy + x; u = r² cos 2θ − r sin θ, v = r² sin 2θ + r cos θ |
| 2.1.2 image of x = 2 under z² | `powermap` | C with time (T3) | Push the line forward with y as the clock: u = 4 − y², v = 4y; eliminate y. | parabola u = 4 − v²/16 (vertex 4, opens left, focus 0) |
| 2.1.3 image of x = 2 under iz − 2i; what it does | `linear` | P for the motion, C for the line (T1, T3) | i(z − 2): slide left 2, quarter turn; the line x = 2 lands on the real axis. | the real axis v = 0; in general a 90° counterclockwise rotation followed by a slide by −2i |
| 2.2.1 image of 0 < arg z < π/4 under z³ | `powermap` | P (T2 fan) | zⁿ multiplies the angle by n; the fan opens three times wider. | the sector 0 < arg w < 3π/4 |
| 2.2.2 principal (2i)^{1/2} | `principal-root` | P, home step (T2) | \|2i\| = 2, Arg(2i) = π/2; halve both. | √2e^{iπ/4} = 1 + i |
| 2.3.1 lim (x² − y² + 2ixy)/(x² + y²) along y = x² | `limits` | P reveals it (T3) | The expression is z/conj z = e^{2iθ}: it remembers only the direction; y = x² arrives tangent to the real axis. | 1 (and the full limit does not exist) |
| 2.4.1 branch of z^{1/3} continuous on the negative real axis | `branches` | P (T2) | Choose a window of steps whose seam is not the negative real axis. | f(z) = r^{1/3}e^{iθ/3}, 0 < θ < 2π (cut on the positive real axis); f(−r) = r^{1/3}e^{iπ/3} |
| 2.5.1 image of \|z − 1\| = 1 under 1/z | `reciprocal` | P (T1, T3) | z = 2cos θ e^{iθ} on the circle, so 1/z = ½ − (i/2)tan θ; 0 goes to ∞ so the circle must open into a line. | the line Re w = ½ |
| 3.1.1 f(z) = z² + z differentiable everywhere, f′ | `derivative` | C with Δz (T3 zoom) | The quotient is 2z + 1 + Δz, no direction in sight. | f′(z) = 2z + 1 |
| 3.1.2 f(z) = \|z\|² differentiable only at 0 | `derivative` | P with Δz = ρe^{iφ} (T3) | The quotient tends to conj z + z e^{−2iφ}: a circle of radius \|z\|, a point only at 0. | differentiable only at z = 0 (f′(0) = 0); nowhere analytic |
| 3.2.1 e^x(cos y + i sin y) entire; f′ | `cauchy-riemann` | C (T3) | u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere: no mirror part. | entire; f′(z) = e^x cos y + i e^x sin y = f(z) |
| P1 conj z₁ · conj z₂ = conj(z₁z₂) | `arithmetic` | either; P is one line (T1) | Mirror negates angles, and −θ₁ − θ₂ = −(θ₁ + θ₂); in C, expand both sides. | both equal (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁) |
| P2 \|z\| = √(z·conj z) | `arithmetic` | P (T1) | Spin and unspin cancel: re^{iθ}·re^{−iθ} = r². | z·conj z = x² + y² = \|z\|² |
| P3 composition of linear maps is linear | `linear` | C (T3) | a(cz + d) + b = (ac)z + (ad + b): spins add, stretches multiply. | linear with coefficient ac and shift ad + b |
| P4 (1 + i)z sends the unit circle to the circle of radius √2 | `linear` | P (T1) | 1 + i = √2e^{iπ/4}: stretch by √2, spin 45°; and every point of the big circle is hit. | image is {\|w\| = √2} |
| P5 lim (Re(1 + z) − 1)/z does not exist | `limits` | P (T3) | x/z = cos θ e^{−iθ} depends on direction: 1 along the real axis, 0 along the imaginary axis. | no limit |
| P6 Re z is not differentiable | `derivative` | C or P (T3) | Same quotient as P5 at every point; or CR: u_x = 1 ≠ 0 = v_y; or: Re is a squash, not a spin-and-stretch. | nowhere differentiable |
| P7 entire with u = c implies f constant | `cauchy-riemann` | C (T3) | u_x = u_y = 0, so CR forces v_x = v_y = 0, so f′ = 0 and f is constant. | f ≡ c + i·(constant) |

### Topics pinned to places

| Topic | Place(s) | Thread |
|---|---|---|
| T1.1 Algebraic properties (ordered pairs, +, −, ×, ÷, field laws, Re, Im, conjugates) | `addresses`, `arithmetic` | T1 |
| T1.2 Geometric interpretation (vectors, modulus, distance, triangle inequality) | `distance` | T1 |
| T1.3 Polar representation (r, θ; arg vs Arg; Euler; geometric × and ÷) | `addresses`, `staircase`, `arithmetic` | T1, T2 |
| T1.4 Powers and roots (powers; roots of unity, primitive; zⁿ = c; quadratic formula) | `powers`, `roots` | T2 |
| T1.5 Sets of points (curves, orientation, ε-disks, interior/boundary, open/closed/connected/bounded, domain/region) | `curves`, `sets` | T3 (time), T1 |
| T2.1 Functions and mappings (u + iv in both addresses, images, one-to-one, elementary maps) | `mappings`, `linear`, `powermap`, `lab` | T1, T3 |
| T2.2 Power and root functions (zⁿ, principal roots, images of regions) | `powermap`, `principal-root` | T2 |
| T2.3 Limits and continuity (ε–δ, limits via u and v, different paths, limit laws) | `limits` | T3 |
| T2.4 Multiple-valued functions and branches (branches, cuts, branch points) | `branches`, `staircase` | T2 |
| T2.5 Reciprocal map and extended plane (inversion + reflection, ∞, Riemann sphere, generalized circles) | `reciprocal`, `graph4d` | T1, T3 |
| T3.1 Derivatives (limit definition, differentiable vs continuous, analytic, entire, rules) | `derivative` | T3 |
| T3.2 Cauchy–Riemann (derivation along paths, the equations, f′ from partials, consequences) | `cauchy-riemann` | T3 |

---

## 4. The shared visual vocabulary

The same marks mean the same things on every station and in the Lab. Colors are tokens from
`css/theme.css` (never literals); the names below are the tokens the architecture should define.

**The point and its two addresses.**
- The point z is one filled dot, drawn once, with its label.
- Cartesian address (`--cart`): dashed drop lines from z to both axes, tick labels x and y, and the
  Cartesian grid (lines) when shown. The word "slide" and the + operation are `--cart`.
- Polar address (`--polar`): the ray from 0 to z (length labeled r) and the angle arc from the
  positive real axis to the ray (labeled θ), and the polar grid (circles and rays) when shown. The
  words "spin," "stretch," "turn" and the × operation are `--polar`.
- In formulas (KaTeX), Cartesian pieces are tinted `--cart` and polar pieces `--polar`.

**arg versus Arg.** Whenever an angle is shown, it is clear which one it is.
- `Arg z`: the solid arc, and a single highlighted value in the staircase.
- `arg z`: ghost arcs that keep winding (faint spiral past the solid arc) and, beside the plane,
  the staircase list "..., θ − 2π, θ, θ + 2π, ..." with the home window (−π, π] shaded.
- The seam: the negative real axis drawn as a dashed line on any plane where Arg or a principal
  value matters; a movable seam in `branches`.

**Input and output.**
- z-plane strokes are `--input`; w-plane strokes are `--output`. The z-plane is on the left (or top
  on phones), labeled z = x + iy; the w-plane on the right (or below), labeled w = u + iv.
- The morph view is a single plane with a slider s from 0 (input) to 1 (output); the stroke's color
  blends from `--input` to `--output` with s.

**Time.** A curve carries t in [0, 1]. Time is drawn as lightness along the stroke: dark at t = 0
to bright at t = 1 (tokens `--t0`, `--t1` as the ends of the ramp, mixed with the stroke hue), with
small dots at t = 0, ¼, ½, ¾ and an arrowhead at t = 1. The image stroke uses the identical ramp so
"when" matches "where." A play button moves a cursor along both strokes on one clock; a scrubber
sets t by hand.

**Domain coloring.** Hue encodes arg w on the color wheel (red at 0, going counterclockwise);
lightness encodes |w| (dark near 0, light toward ∞, with faint contour rings at |w| = 1, 2, 4, ...).
The same wheel is the legend everywhere hue means argument, including the 3D surfaces.

**Numeric explainer.** Two columns under every computation: left "Cartesian (slide)" tinted
`--cart`, right "Polar (spin-and-stretch)" tinted `--polar`, both with live numbers that update as
the student drags; a final row "same point" shows the two addresses of the result and a check
mark that they agree (to display precision). A third column appears only where it earns it
(e.g. "as a motion" in `linear`).

**Sets.** Included boundary: solid line. Excluded boundary: dashed line. Interior shaded lightly.
The ε-disk is a thin circle with a soft fill, colored by what it finds (in, out, both).

**The microscope.** A small ring of direction arrows around z₀ on the z-plane; its image on the
w-plane; and the direction circle (center A, radius |B|) with the point f′(z₀) when it exists.

---

## 5. The Mapping Lab (the diary)

The Lab is the student's blank page: draw on the z-plane, and the w-plane answers.

**Drawing tools** (all pointer-event based, work with touch): brush (freehand), line (two points),
rectangle, circle (center and radius), polygon (click to add vertices, double-click to close),
Cartesian grid patch, polar grid patch, sector (r range and θ range), annulus (two radii), and a
probe point. Each shape is a set of curves with a time parameter: a rectangle's perimeter runs
around with t, a grid is many curves each with its own t, a sector or annulus is its boundary plus
a sparse interior grid so the fill visibly flows. Undo, clear, and a few named presets that load the
test's shapes: "x = 2", "|z − 1| = 1", "unit circle", "sector 0 < arg z < π/4", "annulus 1 < |z + i| ≤ 3",
"segment 2 + i to −3 − 3i".

**Function picker.** Chips for the test's functions: z², z³, zⁿ (n slider), z^{1/2} principal,
z^{1/3} with a movable seam, 1/z, iz − 2i, (1 + i)z, az + b (drag a and b), z² + iz, e^z, conj z,
Re z, |z|², z²/|z|². Plus a text field parsed by `parse.js` (z, i, pi, e, +, −, *, /, ^, parentheses,
conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos). Each preset chip names the problem it
belongs to ("2.5.1") and links to its station.

**Views** (tabs; the drawn shapes persist across views):
1. **Side by side:** z-plane and w-plane; the same time ramp on both; play/scrub the clock.
2. **Morph:** one plane, slider s, (1 − s)z + s f(z); the grid flows from input to output.
3. **Domain coloring:** the z-plane painted by f (hue = arg, lightness = modulus), strokes drawn on
   top in a neutral color so the student sees what colors their stroke crosses; the w-plane shows
   the image strokes on the plain color wheel for comparison.
4. **Modulus landscape (3D):** height |f(z)| over the z-plane, hue = arg f(z); the strokes lifted
   onto the surface.
5. **Riemann sphere (3D):** the z-plane and its strokes projected stereographically; ∞ at the
   north pole; the images shown on a second sphere or toggled.
6. **4D graph:** the graph {(x, y, u, v)} of f over the drawn shapes and a faint disk, projected to
   3D by the two 4D rotation angles; hidden coordinate as color. (Shared with `graph4d`.)

**Time and motion.** The clock is global: one scrubber drives every view. In the side-by-side and
3D views a cursor sits at z(t) and at f(z(t)) simultaneously; in the morph view the clock runs the
stroke while s runs the plane. Reduced-motion users get a stepper instead of autoplay.

**Predict first.** A toggle hides the w-plane until the student presses "reveal," so they guess the
image before seeing it. This is the exam-eve exercise for every "image of" problem.

**Singularities.** For 1/z and z²/|z|² near 0, the push-forward engine subdivides curves adaptively
and breaks a curve where consecutive image points jump beyond a threshold or leave a clamp radius,
so the pole does not draw a line across the plane; the sphere view shows the same stroke going
over the pole cleanly.

**How it ties back.** Every station with an image problem has a "open in the Lab" button that loads
its shape and function; the Lab's preset chips point back. The 4D view is where the student sees
that all the station pictures were shadows of one object.

---

## 6. A study session with the site

Night-before plan (about two hours; the map is also usable in ten-minute pieces):

1. **Read the spine** (`home`, 5 minutes). Say the four lines out loud.
2. **Walk Part I** (`addresses` → `roots`, 30 minutes). At each station do the one "touch" that
   its card suggests, then say which address made the problem easy and why.
3. **Walk Parts II–IV** (`curves` → `cauchy-riemann`, 45 minutes). Same routine. At `limits` and
   `derivative`, make the direction circle shrink to a point by hand; that is the whole of Chapter 3.
4. **Predict in the Lab** (20 minutes). Load each image preset (x = 2 under z², the sector under
   z³, |z − 1| = 1 under 1/z, the unit circle under (1 + i)z) with "predict first" on; draw your
   guess with the brush on the w-plane; reveal.
5. **Problem index pass** (`problems`, 20 minutes). For each of the 29 cards: say the station, the
   address, the aha, then reveal the answer. Tick it. Anything not instant, click through and
   re-touch the station.
6. **Morning of the test.** Open `home`, read the spine again, open `staircase` once and drag the
   point around the origin until the Arg jump feels obvious.

During the test, each question is a place: "this is `roots`; divide the staircase." The visual
story replaces the recipe.

---

## 7. Iteration 1 build list (the complete initial set, ranked by impact on "less daunting")

Impact is 1–10. "Engine" items are shared modules; "station" items are one module each. The
planner should turn each into a goal with file ownership; the dependency order is roughly
foundation → engines → stations → lab/4D → integration.

| # | Item | Kind | Impact | Why |
|---|---|---|---|---|
| 1 | App shell, theme tokens (light/dark), router with error panel, `registry.js` with all 21 stations | foundation | 10 | Nothing works without it; the two-address color code and arg/Arg vocabulary live in the tokens |
| 2 | `core/complex.js`: arithmetic, polar/Cartesian conversion, Arg, arg-set helper, de Moivre, all n-th roots, principal root, branch root with seam angle, formatting | engine | 10 | Every explainer and every answer |
| 3 | `data/problems.js` + unit tests: every review problem's statement, station, address, aha, and expected answer (numeric where numeric) | engine | 9 | Math correctness is non-negotiable; the index and station cards read from it |
| 4 | `core/plane.js`: complex-plane canvas with both grids, draggable points, address overlays (drop lines, ray, arc, ghost arcs), curves with time ramp, pointer events, resize, theme-aware colors | engine | 10 | The teaching device itself; every station draws with it |
| 5 | `core/explainer.js` + `core/katex.js`: the two-column live numeric explainer with `--cart`/`--polar` tinting | engine | 10 | Success criterion 1 and 2 of the assignment |
| 6 | `core/staircase.js`: the arg/Arg staircase widget (2D list with home window, ghost arcs on the plane, optional 3D helix) | engine | 9 | Success criterion 3; reused by addresses, staircase, powers, roots, principal-root, branches |
| 7 | `core/shapes.js` + `core/mapping.js`: shape primitives to timed curves; push-forward with adaptive subdivision and pole breaking; morph interpolation; time ramp colors | engine | 9 | Thread 3 everywhere; the Lab and six stations |
| 8 | `core/parse.js`: f(z) expression parser/evaluator | engine | 8 | Lab text input; also lets stations declare functions as strings |
| 9 | `core/three-view.js`: three.js helpers (modulus landscape, Re/Im surfaces, 4D projection with two angles, Riemann sphere with stereographic projection, Riemann surface of z^{1/n}, helix of arg; dispose) | engine | 8 | graph4d, lab, staircase, branches, reciprocal |
| 10 | `core/domaincolor.js`: hue = arg, lightness = modulus, contour rings, reduced-res while dragging | engine | 7 | Lab view 3 and the 3D surfaces' coloring |
| 11 | `staircase` station | station | 10 | The student's central question, answered with a drag |
| 12 | `derivative` station (microscope + direction circle) | station | 10 | Makes 3.1.1, 3.1.2, P6 one picture; the circle shrinking to a point is the thesis of Chapter 3 |
| 13 | `lab` station with the six views, tools, presets, predict-first | lab | 10 | Success criterion 4; the diary |
| 14 | `addresses` station | station | 9 | First contact with Thread 1 |
| 15 | `arithmetic` station | station | 9 | Four problems (1.1.1, 1.1.2, P1, P2) and the native-address rule |
| 16 | `roots` station | station | 9 | Three problems; the staircase divided is the most visual aha on the test |
| 17 | `cauchy-riemann` station | station | 9 | 3.2.1, P7; "no mirror" closes Thread 3 |
| 18 | `home` station (the map with thread lines and finder) | station | 8 | The story is only a story if the map exists |
| 19 | `problems` index station | station | 8 | The exam-eve pass; every problem reachable |
| 20 | `powers` station | station | 8 | 1.3.2; the spiral makes "same move n times" obvious |
| 21 | `powermap` station (fan + parabola) | station | 8 | 2.1.2 and 2.2.1 side by side show which grid a function respects |
| 22 | `principal-root` station | station | 8 | 2.2.2; home step only |
| 23 | `branches` station with movable seam and 3D surface | station | 8 | 2.4.1; branch cut as a choice, not a rule |
| 24 | `limits` station (directional circle for 2.3.1 and P5, ε–δ picture) | station | 8 | Bridges topology to the derivative |
| 25 | `linear` station | station | 7 | 2.1.3, P3, P4 |
| 26 | `mappings` station (u + iv in both addresses, morph) | station | 7 | 2.1.1; first motion |
| 27 | `reciprocal` station with sphere | station | 7 | 2.5.1; the sphere makes ∞ a place |
| 28 | `distance` station | station | 7 | 1.2.1, 1.2.2, triangle inequality |
| 29 | `curves` station | station | 7 | 1.5.1; introduces the time ramp |
| 30 | `sets` station | station | 7 | 1.5.2; the ε-disk probe |
| 31 | `graph4d` station | station | 7 | The student's explicit 4D request; the unifying "shadows" picture |
| 32 | Integration: smoke all 21 routes at desktop and phone, dark theme, interaction scripts for lab (draw a rectangle, switch views, scrub time) and staircase (drag around origin, assert the Arg jump), screenshot review | integration | 8 | Nothing counts until it loads cleanly everywhere |

Ideas held for later iterations (not in the first version): a "say it out loud" self-quiz mode
with timed prompts; an audio-free narrated walkthrough that auto-drives the drags; a Riemann
sphere view of 1/z as an animated half-turn; a "find the mirror" game (is this formula analytic?);
inverse-function and one-to-one explorer; triangle-inequality proof walk; conformality (right
angles preserved) overlay in the derivative station; export of a one-page cheat sheet.

---

## 8. Notes for designers and reviewers (facts that must be exactly right)

- Arg is in (−π, π]; `atan2(y, x)` already returns this. Arg of a negative real is π, not −π.
- Roots of c = |c|e^{iΘ} (Θ = Arg c): |c|^{1/n} e^{i(Θ + 2πk)/n}, k = 0..n − 1. For −16: radius 2,
  angles π/4, 3π/4, 5π/4, 7π/4 (equivalently −3π/4 and −π/4 on the home step).
- Principal root uses Arg only: (2i)^{1/2} = √2e^{iπ/4} = 1 + i, not −1 − i.
- Branch of z^{1/3} with seam at angle σ: use θ in (σ, σ + 2π); the principal branch is σ = −π.
  The branch continuous on the negative real axis for 2.4.1 is σ = 0 (0 < θ < 2π); at z = −1 it
  gives e^{iπ/3} = ½ + (√3/2)i.
- Image of x = c under z²: u = c² − v²/(4c²), focus at 0 for every c. Image of y = c: u = v²/(4c²) − c².
- Image of |z − 1| = 1 under 1/z: Re w = ½; the point z = 0 goes to ∞ (omit it, do not draw a
  segment through it).
- Directional difference quotient: A + Be^{−2iφ} with A = ½(f_x − i f_y), B = ½(f_x + i f_y);
  for |z|² at z₀: A = conj z₀, B = z₀; for Re z: A = B = ½; for conj z: A = 0, B = 1; for analytic f:
  A = f′, B = 0.
- 2.3.1 along y = x²: value (1 − x² + 2ix)/(1 + x²) → 1. Along y = mx: e^{2i·atan m}, constant on
  the line.
- 1.5.2: S is connected but not open, so not a domain; it is a region; bounded by |z + i| ≤ 3.
- (√3 + i)^10 = 512 − 512√3 i ≈ 512 − 886.81i; Arg of the result is −π/3.
- 1.1.1: z₁/z₂ = (3 − 2i)(−1 − 4i)/17 = (−11 − 10i)/17.
- Unit tests should assert all of the above to 1e-9, plus: |z₁z₂| = |z₁||z₂|, Arg(z₁z₂) equals
  Arg z₁ + Arg z₂ wrapped into (−π, π], the five 5th roots each satisfy z⁵ = 1, the four roots of
  −16 each satisfy z⁴ = −16, and (1 + i)² = 2i.
