# The Story: A Complex Number Is a Move

Status: iteration 2, stage 0 (the Unifier's rewrite). Iteration 1 built all 21 stations and the Lab; the orchestrator's
review (`docs/review/iter-1-orchestrator.md`) found no wrong number on screen and all four success criteria met, and asked
for rehearsal, videos, one guided path, a diary-like Lab, an identity and shared station pieces. This file sharpens the
story those asks hang on, keeps everything iteration 1 got right (the thread lines are the registry's, the aha sentences
of section 3 are the ones the cards show and the tests pin), and adds the new places and motifs. Owner: the Unifier.
Every claim is checked against `docs/ASSIGNMENT.md`; engineering rules live in `docs/CONSTRAINTS.md`.

Screenshots this rewrite was made from: `docs/review/iter-2/before/` (21 routes, desktop, phone, dark; 63/63 smoke checks).

---

## 0. The spine (read this first; say it out loud)

> **A complex number is a move: turn, then stretch.**
> **A turn has many names.**
> **A function moves every point at once.**
> **Differentiable means: up close, one move.**

That is the whole test. Each line is a chapter, and each line leans on the one before it:

1. **A move.** The point z sits somewhere: that is its **Cartesian address** (x, y), the slide from 0 that lands on it.
   The same point is also what you get by taking the number 1 and turning it by θ and stretching it by r: that is its
   **polar address** (r, θ), the move that makes it. Adding is composing slides, so it is native to Cartesian.
   Multiplying is composing moves, so it is native to polar. The point never changes; only the address does.
2. **Many names.** Turning by θ and turning by θ + 2π do the same thing, so a move has infinitely many names. `arg z` is
   all of them (a set, a spiral staircase above the point); `Arg z` is the one in (−π, π] we call home. Powers do not care
   which name you use. Roots need **all** of them. Principal values use the **home** name. A branch is a **continuous**
   choice of name, and a cut is where the choice must jump. That is Chapter 1.4, 2.2 and 2.4 in one sentence.
3. **A motion.** w = f(z) does something to every point at the same time. A brush stroke z(t) is carried to f(z(t)) on
   the same clock. The functions on the test are built from moves and slides: az + b is one move and one slide for the
   whole plane; zⁿ is "the move that makes z, done n times" at every point; 1/z is that move undone. Functions built from
   moves keep circles and rays; functions built from slides keep lines. That is Chapter 2.
4. **One move, up close.** Zoom into any smooth map at z₀ and it looks linear. A linear map of the plane is a move plus a
   *mirrored* move (A·Δz + B·conj(Δz)). f is differentiable at z₀ exactly when the mirror part B is zero, and then the
   local map is one move: multiplication by the complex number f′(z₀). **The derivative is a complex number, so it has
   the two addresses of line 1:** f′ = u_x + i v_x (Cartesian) and |f′| e^{i Arg f′} (polar: the local stretch and the
   local turn). Cauchy–Riemann is the test that the four partials add up to one move. conj z, Re z and |z|² fail it
   because a mirror and a squash are not moves. That is Chapter 3.

The connection iteration 1 left unsaid, and which this iteration draws everywhere: **lines 1 and 4 are the same
question asked twice.** Chapter 1 asks "what move takes 1 to z?" and answers with the polar address. Chapter 3 asks
"what move takes a tiny disk at z₀ to its image?" and answers with f′(z₀), or says there is none. A student who can read
the polar address of a number can read the derivative of a function: it is the turn and the stretch of the picture under
the microscope.

### The two decisions (the exam lens)

Every review problem is settled by at most two decisions, and the site now shows both as chips on every problem:

| Decision | Choices | What it means |
|---|---|---|
| **Address** | Cartesian (C), Polar (P), C→P, P→C, C→P→C, both | Which address makes this native: a slide question or a move question? |
| **Names** | none, **any**, **all**, **home**, **continuous** | If an angle is involved, which names of it do you need? *none*: no angle in the question. *any*: any name works (powers, products, directions, cos and sin). *all*: every name gives a different answer (roots). *home*: the one in (−π, π] (Arg, principal values). *continuous*: a choice of name that varies without jumping (branches). |

Twenty-nine problems, two chips each: that is the map of the test. Section 3 fills the chips in for every problem.

---

## 1. The threads, in plain language

### Thread 1: one point, two addresses (and the move that makes it)

Take z = −1 + i√3. It sits one step left of 0 and √3 steps up: Cartesian address (−1, √3), the slide. It is also what you
get by turning the number 1 by 120° (2π/3) and stretching it to length 2: polar address (2, 2π/3), the move. Same dot.

Why two addresses? The plane has two basic operations and each address is native to one of them.

- **Adding z₂ slides the plane by z₂.** Slides compose by adding coordinates: (x₁ + x₂, y₁ + y₂). Cartesian is native.
  Subtraction is the slide back. Distance |z₁ − z₂| is the length of the slide between them.
- **Multiplying by z₂ turns the plane by θ₂ and stretches it by r₂.** Moves compose by adding angles and multiplying
  lengths: r₁r₂ e^{i(θ₁ + θ₂)}. Polar is native. Division undoes the move: (r₁/r₂) e^{i(θ₁ − θ₂)}.
- **Conjugation is a mirror** across the real axis: negate y, or negate θ. A mirror is not a move, which matters in
  Chapter 3. |z|² = z·conj z because the turn and the un-turn cancel and r·r is left. 1/z = conj z/|z|²: invert the length,
  mirror the angle.
- **Euler's formula** e^{iθ} = cos θ + i sin θ is the dictionary: e^{iθ} is "the unit move that turns by θ", and its
  Cartesian address is (cos θ, sin θ).

Each address has **native shapes**. Cartesian: the lines x = c and y = c. Polar: the circles r = c and the rays θ = c.
"|z − a| = R" is "every point one stretch R away from a", a circle, with no algebra. Sectors and annuli are polar
rectangles. The annulus of 1.5.2, the circles of 1.2.1 and 2.5.1 and the sector of 2.2.1 are polar-native; the lines of
1.5.1, 2.1.2 and 2.1.3 are Cartesian-native.

The rule for the test: *pick the address where the question is native, do it there, translate back.* Every computation on
the site is shown in both columns with live numbers, so you watch the two addresses agree.

**The move glyph.** From this iteration on, every complex number the site prints can carry a small glyph beside it: a faint
unit circle, the arc of its Arg, and the ray of its length (`--polar`). A number *is* a move; the glyph shows the move. The
same glyph sits beside f′(z₀) in Chapter 3, which is the whole point.

### Thread 2: the staircase (z, arg z, Arg z) and the four ways to use the names

This is the student's own question: what is the difference between a number's args, what defines it in polar form, and
the number itself as it sits on the Cartesian plane?

The Cartesian address is unique: one dot, one (x, y). The polar address is not: turning 2π/3 and turning 2π/3 + 2π land
on the same dot. So "the polar form" of z is a family, 2e^{i(2π/3 + 2πk)}, one for each integer k.

- **Def 1.4.4:** arg z = { θ : z = r(cos θ + i sin θ) }. A *set*: a spiral staircase above the point, one step per turn.
- **Def 1.4.6:** Arg z = the single θ in (−π, π]. The home step.
- **z** is the dot on the floor. It never moves, whichever step you stand on.

So: the point is a place; a polar form names the move that reaches it; arg z is every such name; Arg z is the official
one. The test is mostly about knowing which names a question needs. That is the **Names** decision:

| Names | Which step(s) of the staircase | Problems |
|---|---|---|
| **any** | Any name works. nθ on different steps differs by 2πn, still a whole number of turns. cos and sin repeat every turn. A direction is a direction whatever you call it. | 1.3.2, 2.1.1, 2.1.3, 2.2.1, 2.3.1, 2.5.1, 3.1.2, P1, P2, P4, P5, P6 |
| **all** | Every name gives a different answer. (θ + 2πk)/n for k = 0 … n − 1 are n different points 2π/n apart on the circle of radius \|c\|^{1/n}; k = n is k = 0 again. "A degree-n equation has n roots" is the staircase divided by n. | 1.4.1, 1.4.2, 1.4.3 |
| **home** | The one in (−π, π]: Arg z; the principal root \|w\|^{1/n} e^{i Arg(w)/n}. | 1.3.1, 2.2.2 (and reporting the final angle of 1.3.2) |
| **continuous** | Choose a step at every point without a jump. Once around 0 the step must advance by one, so no continuous choice exists on a loop around 0: cut the plane along a ray from 0. The principal branch cuts along the negative real axis, where Arg jumps from π to −π. To be continuous *on* that axis, cut somewhere else, e.g. 0 < θ < 2π. The branch point 0 is the axis of the staircase. | 2.4.1 |
| **none** | No angle in the question. | 1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.5.1, 1.5.2, 2.1.2, 3.1.1, 3.2.1, P3, P7 |

The fan (2.2.1) is "any" because w = zⁿ multiplies every name by n at once: a sector of opening α fans open to nα. Roots
are the fan run backwards, which is why they need "all". The Riemann surface is the staircase made literal: a helical
surface on which z^{1/n} is single valued, with n turns glued back to the start.

### Thread 3: a function is a motion; a derivative is the move you see when you zoom in

w = f(z) picks up every point and puts it down at w. The site watches this with **time**: a stroke z(t), 0 ≤ t ≤ 1, is
carried to f(z(t)) on the same clock, and a **morph** (1 − s)z + s f(z) slides the plane from input to output. On paper
the same idea is *parametrize, push forward, eliminate t*: that is how "find the image of the line x = 2" goes (2.1.2,
2.1.3), and "the image of the circle" (2.5.1, P4).

- **Linear maps** f(z) = az + b move the whole plane by one turn (Arg a), one stretch (|a|) and one slide (b).
  Composing two gives another (P3: a(cz + d) + b = (ac)z + (ad + b)). Lines go to lines, circles to circles (P4, 2.1.3).
- **Functions built from moves** act on the polar address: zⁿ sends (r, θ) to (rⁿ, nθ); z^{1/n} to (r^{1/n}, θ/n) on a
  chosen step; 1/z to (1/r, −θ). They keep the polar grid (circles to circles, rays to rays) and bend the Cartesian grid:
  under z² the lines x = c and y = c become parabolas sharing the focus 0 (2.1.2); under 1/z a line not through 0 becomes
  a circle through 0 and a circle through 0 becomes a line (2.5.1).
- **Writing f in both addresses** (2.1.1) is Thread 1 applied to a function: u(x, y) + iv(x, y) is the slide view,
  u(r, θ) + iv(r, θ) the move view; z² + iz = r² e^{2iθ} + r e^{i(θ + π/2)} because i is a quarter turn.

**Zoom.** Put z₀ under a microscope. If f(z₀ + Δz) ≈ f(z₀) + f′(z₀)·Δz, a tiny disk around z₀ is turned and stretched by
the single number f′(z₀) and slid to f(z₀). That is what differentiable *means*: under the microscope, the motion is a
move. It is also why the difference quotient must agree from every direction: a move treats all directions alike.

Here is the picture that makes all of Chapter 3 one station. Up close, any smooth map is a move plus a *mirrored* move:

> Δw ≈ A·Δz + B·conj(Δz), with A = ½(f_x − i f_y) and B = ½(f_x + i f_y).

Approach z₀ along direction φ (Δz = ρe^{iφ}, ρ → 0). The quotient tends to A + B e^{−2iφ}. As φ sweeps round, that value
traces **a circle with centre A and radius |B|**. The derivative exists exactly when the circle is a single point, B = 0,
and then f′(z₀) = A. Write B = 0 in coordinates: u_x = v_y and u_y = −v_x. **Cauchy–Riemann says "no mirror part."** And
f′ = A = u_x + i v_x. In matrix form: the Jacobian has the move shape [[a, −b], [b, a]].

| f | A (the move) | B (the mirror) | Verdict |
|---|---|---|---|
| z² + z (3.1.1) | 2z + 1 | 0 | differentiable everywhere; f′ = 2z + 1 |
| e^x(cos y + i sin y) (3.2.1) | f itself | 0 | entire; f′ = f |
| conj z | 0 | 1 | pure mirror; nowhere differentiable |
| Re z = (z + conj z)/2 (P5, P6) | ½ | ½ | circle of radius ½ through 1 and 0: along the real axis the quotient is 1, along the imaginary axis 0 |
| \|z\|² = z·conj z (3.1.2) | conj z | z | circle of radius \|z\|, a point only at z = 0 |
| z²/\|z\|² = z/conj z (2.3.1) | — | — | equals e^{2iθ}: remembers the direction, forgets the distance, so the limit at 0 depends on the way in |

The consequence theorems are the same circle. If u = c everywhere (P7), u_x = u_y = 0, CR forces v_x = v_y = 0, so f′ = 0
and f is constant (Thm 3.2.13). If |f| is constant on a domain (Thm 3.2.12), the image lies on a circle; a move with a
nonzero stretch would push a small disk off that circle, so the stretch is 0, f′ = 0, f is constant.

### The picture behind every picture: the 4D graph and its shadows

The graph of w = f(z) is the set of points (x, y, u, v). Nobody can see it. Every view on the site is a shadow of that
one object, and the Lab and the 4D station let you walk round it:

- **Side by side:** the two flat shadows (x, y) and (u, v), tied by time.
- **Morph:** (1 − s)(x, y) + s(u, v), a sliding flat shadow.
- **Domain colouring:** the (x, y) shadow with (u, v) painted on it as hue (arg w) and brightness (|w|).
- **Modulus landscape:** the 3D shadow (x, y, |w|), coloured by arg w.
- **Re surface and Im surface:** (x, y, u) and (x, y, v). A rotation in the u–v plane turns one into the other.
- **4D viewer:** any 3D shadow, rotated by you; the hidden coordinate painted as colour.
- **Riemann surface of z^{1/n}:** the graph of all n roots at once: the staircase of Thread 2 made solid.
- **Riemann sphere:** the z-plane wrapped so ∞ is a point. On the sphere 1/z is a half-turn about the axis through 1 and
  −1, which is why lines (circles through ∞) and circles trade places (2.5.1).

### How the threads answer what the student asked for

| The student said | Where it lives |
|---|---|
| "move between polar and Cartesian coordinates at will, and it allows for magical things" | Thread 1; every explainer has a Cartesian column and a polar column with live numbers; the Address chip on every problem |
| "the difference between a complex number's args and what defines it in polar form vs the number itself as it sits on the Cartesian plane" | Thread 2; the `staircase` station, the staircase widget beside every angle, the Names chip on every problem |
| "input vs output related as a time dimension; where a given input brush stroke moves as it maps to the output" | Thread 3; the time ramp and the morph in every mapping station and the Lab; live ink and replay in the Lab (new) |
| "draw a rectangle or a circle or whatever shape, like Tom Riddle's diary, with several visualization formats" | the `lab` station: drawing first, six views, pages that are kept (new) |
| "glimpse this weird 4D type structure" | the `graph4d` station and the 4D view in the Lab; the shadows side by side (new) |
| "not a set of procedures I need to memorize but a point on a visualization story that I revisit" | the Story Map (`home`), the Walk (one guided path with progress, new), the problem index, and the Rehearsal Room (fresh numbers, same places, new) |

---

## 2. The Story Map

Twenty-two places in story order (the 21 of iteration 1 plus the Rehearsal Room). For each: what the student **sees**,
**touches** and **realizes**, the **thread lines** through it, and its **Walk stop**: the one interaction, the one problem
and the one sentence to say out loud when the guided path reaches it (section 6). Station ids are the hash routes.
Chapter order is kept except that `limits` sits directly before `derivative`, because "every direction must agree" is the
door into "the direction circle shrinks to a point".

Thread lines, drawn on the map as three coloured paths (the registry's `threads`; `home`, `rehearse` and `problems` are
on all three):
- **T1 Addresses** (`--cart`): home → addresses → arithmetic → distance → powers → roots → sets → mappings → linear → powermap → reciprocal → derivative → cauchy-riemann → lab → rehearse → problems.
- **T2 Staircase** (`--polar`, dashed): home → addresses → staircase → powers → roots → powermap → principal-root → branches → lab → graph4d → rehearse → problems.
- **T3 Motion and zoom** (`--output`): home → curves → sets → mappings → linear → powermap → reciprocal → limits → derivative → cauchy-riemann → lab → graph4d → rehearse → problems.

### Part I: the point (Chapter 1)

**1. `home` — The Map.**
Sees: the spine (four lines), the two decisions, the serpentine map with the three thread lines, the problem finder, and
the Walk's start button with its progress ("stop 0 of 21"). A live demo (drag one point; both addresses, the move glyph).
Video: `two-addresses` is offered here too (it is the first thing to watch).
Touches: clicks a station or a problem; starts or resumes the Walk.
Realizes: there are four ideas and two decisions, and every test question is a dot on this path.
Thread lines: all three start here.
Walk stop: do: drag the dot once round the origin. say: "A complex number is a move: turn, then stretch." problem: none.

**2. `addresses` — One Point, Two Addresses.** (1.3.1)
Sees: one draggable z; Cartesian address as dashed drop lines (`--cart`); polar address as the ray and the arc
(`--polar`); the two-column converter with live numbers; Euler's formula as the dictionary; the staircase preview with
ghost names; the move glyph beside z. Video `two-addresses` embedded with captions.
Touches: drags z; presets (−1 + i√3, √3 + i, 2i, −16, 1 + i); Cartesian grid vs polar grid; types either address.
Realizes: the dot never changes; only its description does. 1.3.1 is "read the polar address of the dot at (−1, √3)":
r = 2, Arg z = 2π/3.
Walk stop: do: type r = 2, θ = 2π/3 in the polar fields and watch x, y appear. say: "Same dot, two addresses." problem: 1.3.1.

**3. `arithmetic` — Slide, Spin, Stretch, Mirror.** (1.1.1, 1.1.2, P1, P2)
Sees: z₁, z₂ and the result; modes +, −, ×, ÷, conj, 1/z; for × the angle arcs stacked and the radii multiplied, with the
"spin, then stretch" play. **Iteration 2:** the multiply picture is drawn at two scales (the two moves near the origin on
the left, the product on a log ruler on the right, as `powers` does), so the arcs are not crushed against 0 when the
product is far away.
Touches: drags both points; loads 3 − 2i and −1 + 4i; toggles the Cartesian and polar columns.
Realizes: 1.1.1 is slide-native (5 + 14i; −11/17 − (10/17)i) with the polar column as the check (√13·√17 = √221). 1.1.2 is two
slides and a mirror (4 − 6i → 4 + 6i, Im = 6). P1 is "mirror then multiply equals multiply then mirror", one line in polar.
P2 is "turn and un-turn cancel": z·conj z = r·r.
Walk stop: do: press "Play: spin, then stretch" on 1.1.1. say: "Multiplying is a move; adding is a slide." problem: 1.1.1.

**4. `distance` — Length, Distance, Circles.** (1.2.1, 1.2.2)
Sees: |z| as a ray length; |z₁ − z₂| as the length of the slide between two points; the circle |z − a| = R with a draggable
centre and radius; the triangle inequality as a bendable triangle with the slack shown live.
Touches: drags points; makes the inequality tight by aligning the arguments.
Realizes: distance is one slide's length, |(4 + 3i) − (−1 + i)| = |5 + 2i| = √29. "|z − (1 + 2i)| = 3" is a circle, centre
1 + 2i, radius 3, with no expanding.
Walk stop: do: drag a onto 1 + 2i and R to 3. say: "A circle is every point one stretch away from the centre." problem: 1.2.1.

**5. `staircase` — The Staircase: z, arg z, Arg z.** (1.3.1; feeds 1.4.x, 2.2.2, 2.4.1)
Sees: the plane with one z and the seam; the vertical list of names with the home window shaded; the 3D helix. Theorem
1.4.14 as sets. Video `staircase-roots` embedded. **Iteration 2:** the helix is redrawn so it reads as a staircase: a thin
ribbon with a lit edge, the beads on the ribbon (not on a separate vertical line), the seam as a riser where the big bead
hops, the floor grid faint.
Touches: drags z once round the origin: the point moves smoothly, the list slides smoothly, Arg jumps at the seam; "Walk
one lap" counts the laps; the seam slider moves the cut (the first look at a branch cut).
Realizes: z is a place; arg z is every name of the move that reaches it; Arg z is the official name, and the official name
must jump somewhere.
Walk stop: do: drag z once round 0 and watch Arg jump (the stop ticks when laps ≥ 1). say: "arg z is every name; Arg z is the home step; z never moves." problem: 1.3.1 (the Arg).

**6. `powers` — Powers: Spin n Times.** (1.3.2)
Sees: z = √3 + i with its polar address; the spiral z, z², …, zⁿ on a log ruler; the explainer with the wrap of 10π/6 onto
the home step −π/3; "Try it in Cartesian".
Touches: drags z; scrubs n; chooses how to report the angle (nθ, home step, Cartesian).
Realizes: (√3 + i)^10 = 1024 e^{i5π/3} = 512 − 512√3 i. A power is "the same move n times"; names: any; report on the home step.
Walk stop: do: scrub n from 1 to 10 and watch the spiral cross the seam. say: "Any name works for a power; report the home step." problem: 1.3.2.

**7. `roots` — Roots: Divide the Staircase.** (1.4.1, 1.4.2, 1.4.3)
Sees: the c-plane and the root plane (two scales); every step of arg c divided by n; the n-gon; primitive roots marked for
c = 1; the quadratic panel (complete the square, a square root in disguise, then a slide).
Touches: drags c; scrubs n; clicks a root and raises it back to c along the spiral.
Realizes: 1.4.1: e^{2πik/5}. 1.4.2: 2e^{i(π/4 + kπ/2)} = √2(±1 ± i). 1.4.3: z = 2 ± 3i. There are n roots because there are
n distinct steps modulo n. Names: all.
Walk stop: do: set c = −16, n = 4 and click step k = 1 to see which root it gives. say: "Roots need every name; k = n is k = 0 again." problem: 1.4.2.

### Part II: curves and sets (Chapter 1.5)

**8. `curves` — Curves and Time.** (1.5.1)
Sees: z(t) with the time ramp; presets (the segment, a circle, a figure eight, a square, a half circle); the time
scrubber; the segment built two ways; the classification chips (smooth, piecewise smooth, closed, simple, orientation).
Touches: drags endpoints; scrubs t; reverses (−C); flips the orientation.
Realizes: 1.5.1: z(t) = (2 − 5t) + i(1 − 4t), 0 ≤ t ≤ 1. Time is the coordinate every function will carry to the w-plane.
Walk stop: do: scrub t and watch z(t) walk the segment. say: "A curve is a point that moves; time is the clock the w-plane will keep." problem: 1.5.1.

**9. `sets` — Disks, Annuli, Boundaries.** (1.5.2)
Sees: the annulus 1 < |z + i| ≤ 3 (inner circle dashed, outer solid); the ε-disk probe coloured by what it finds; the
answer chips; presets (closed annulus, punctured disk, half plane, two disks).
Touches: drags the probe onto each circle; shrinks ε; drags the bounding disk; flips < and ≤.
Realizes: 1.5.2: neither open nor closed; bounded; boundary both circles; not a domain (not open); a region. Every
topological word is a sentence about tiny disks, which are polar-native shapes, and the same tiny disks are what limits
and derivatives are made of.
Walk stop: do: drag the probe onto the inner circle and see the disk turn two-toned. say: "Open, closed, boundary: all sentences about a tiny disk." problem: 1.5.2.

### Part III: motions (Chapter 2)

**10. `mappings` — A Function Is a Motion.** (2.1.1)
Sees: z-plane and w-plane for z² + iz with both addresses of z and w; the derivation of u + iv in both addresses; the morph
over either grid. Video `motion-time` embedded.
Touches: drags z; scrubs the morph; switches to z², iz − 2i, 1/z, conj z; carries the Cartesian or the polar grid.
Realizes: 2.1.1 is Thread 1 applied to a formula. iz is a quarter turn, so in polar it is θ + π/2. Names: any.
Walk stop: do: play the morph with the polar grid, then with the Cartesian grid. say: "Functions built from moves keep circles and rays." problem: 2.1.1.

**11. `linear` — Linear Maps: Spin, Stretch, Slide.** (2.1.3, P3, P4)
Sees: az + b in three stages; the line x = 2 under iz − 2i; the unit circle under (1 + i)z; the composition panel.
Touches: drags a and b; steps the stages; draws a stroke and watches it move rigidly.
Realizes: 2.1.3: i(z − 2) sends x = 2 to the real axis v = 0; the map is a quarter turn then a slide by −2i. P3: (ac)z + (ad + b).
P4: |(1 + i)z| = √2 and every point of the big circle is hit.
Walk stop: do: scrub the stage slider from spin to stretch to slide on 2.1.3. say: "One move and one slide, for the whole plane." problem: 2.1.3.

**12. `powermap` — zⁿ: Fans and Parabolas.** (2.1.2, 2.2.1)
Sees: the line x = 2 bending into the parabola u = 4 − v²/16 (focus 0); the sector 0 < arg z < π/4 fanning open under z³;
the polar grid carried to a polar grid, the Cartesian grid bent; the time play along the line.
Touches: drags the line; drags the sector's edges; scrubs n until the fan overlaps itself; scrubs the morph.
Realizes: 2.1.2: u = 4 − y², v = 4y, eliminate y. 2.2.1: the sector opens to 0 < arg w < 3π/4. Choose the address by the shape
you were given.
Walk stop: do: play time along x = 2 and watch the parabola draw itself. say: "Push the line forward with y as the clock, then eliminate y." problem: 2.1.2.

**13. `principal-root` — Principal Roots: Stand on the Home Step.** (2.2.2)
Sees: w = 2i and its staircase; the n roots ghosted, the home-step root solid; the sweep of w once round the origin with the
principal root moving at half speed and jumping at the seam.
Touches: drags w; scrubs n; clicks the other roots to see which step they came from; runs the sweep.
Realizes: 2.2.2: |2i| = 2, Arg(2i) = π/2, so (2i)^{1/2} = √2 e^{iπ/4} = 1 + i. The other root comes from the step π/2 + 2π.
"Principal" means "use the home step". Names: home.
Walk stop: do: press "Sweep w once around the origin" and watch the principal root jump. say: "Principal means the home step only." problem: 2.2.2.

**14. `branches` — Branches and Cuts.** (2.4.1)
Sees: the cube root with a movable seam and its window of names; the wedge on the w-plane; the test walks along and across
the negative real axis; the three sheets in 3D.
Touches: drags the seam; tries the principal choice (jumps on the negative axis), then the positive real axis (continuous
there); rotates the surface.
Realizes: 2.4.1: f(z) = r^{1/3} e^{iθ/3} with 0 < θ < 2π is continuous on the negative real axis, where f(−r) = r^{1/3} e^{iπ/3}.
A branch is a continuous choice of step; the seam is where the choice is forced to jump. Names: continuous.
Walk stop: do: put the seam on the positive real axis and run "Walk across the negative real axis". say: "A branch is a continuous choice of name; cut where the question does not look." problem: 2.4.1.

**15. `reciprocal` — 1/z and the Sphere.** (2.5.1)
Sees: 1/z as invert (r → 1/r) then mirror (θ → −θ); the circle |z − 1| = 1 opening into the line Re w = ½; the Riemann
sphere with the half-turn.
Touches: drags p along the circle toward 0 and watches 1/p run off to ∞ (up to the north pole on the sphere).
Realizes: 2.5.1: on the circle z = 2cos θ e^{iθ}, so 1/z = ½ − (i/2) tan θ: the line Re w = ½. A circle through 0 must become a
line because 0 goes to ∞. Names: any.
Walk stop: do: run p along the shape and watch the image escape at p = 0. say: "Invert the length, mirror the angle; zero goes to infinity, so the circle opens." problem: 2.5.1.

**16. `limits` — Limits: Every Direction Must Agree.** (2.3.1, P5)
Sees: g = z²/|z|² = e^{2iθ} with the ways in (lines, y = x², a spiral); the value traced on the w-plane; the circle of all
directional values; the ε–δ disks for z² at 1.
Touches: changes the way in; scrubs t; drags ε and watches δ.
Realizes: 2.3.1: along y = x² the value → 1 (the curve arrives tangent to the real axis); the full limit does not exist.
P5: 1 along the real axis, 0 along the imaginary axis. A limit exists when the circle of directional values is one point.
Walk stop: do: switch the way in from y = x² to the line y = x and watch the arrival point move on the circle. say: "Every direction must agree." problem: 2.3.1.

### Part IV: zoom (Chapter 3)

**17. `derivative` — The Derivative Is a Move.** (3.1.1, 3.1.2, P6)
Sees: the microscope: a ring of directions round z₀ and its image; the direction-circle plane (centre A, radius |B|); the
explainer in both addresses; the move glyph beside f′(z₀). Video `zoom-cr` embedded.
Touches: drags z₀; shrinks ρ; sweeps the direction; for |z|² drags z₀ to 0 and watches the circle shrink to a point.
Realizes: 3.1.1: the quotient is 2z + 1 + Δz, no direction in sight; f′ = 2z + 1. 3.1.2: the quotient tends to conj z + z e^{−2iφ},
a circle of radius |z|, a point only at 0. P6: Re z gives the circle of radius ½ at every point. **f′(z₀) is a complex
number: |f′| is the local stretch, Arg f′ the local turn.** Names: any (the direction φ).
Walk stop: do: pick |z|² and drag z₀ to 0 until the circle is a point. say: "Differentiable means one move up close; the derivative is that move." problem: 3.1.2.

**18. `cauchy-riemann` — Cauchy–Riemann: No Mirror.** (3.2.1, P7)
Sees: the image of a tiny square; the Jacobian with live numbers; the two CR equalities with residuals; A and B in both
addresses; the derivation from the two paths; the u = c case.
Touches: drags z₀; shrinks h; toggles the two-path derivation; edits u and v for u = c.
Realizes: 3.2.1: u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere, so entire; f′ = f. P7: u = c forces
f′ = 0. **CR is the test that the Cartesian description of the local map (four partials) adds up to one move; when it does,
f′ = u_x + i v_x is the dictionary, like x = r cos θ.**
Walk stop: do: switch to conj z and watch the square flip and the CR badges fail. say: "Cauchy–Riemann says no mirror." problem: 3.2.1.

### Part V: the diary, the 4D object, the rehearsal and the index

**19. `lab` — The Mapping Lab.** (every problem with an image)
See section 5. Sees: the drawing surface first; the w-plane answering while the stroke is still being drawn; replay; the
diary's pages. Realizes: every "find the image of" question is "draw it, push it forward, read it", and every view is a
shadow of one 4D graph.
Walk stop: do: draw a rectangle and watch the w-plane ink it while you draw, then press Replay. say: "Draw it, push it forward, read it." problem: 2.1.2 (predict first, then reveal).

**20. `graph4d` — The 4D Graph.**
Sees: the 4D graph projected to 3D with two angles; **iteration 2:** the five shadows of the *same* f as small multiples
beside the big view (side by side, domain colouring, Re surface, Im surface, modulus landscape), each lighting up as the
sliders pass through its angle, so "five pictures, one object" is seen, not read. Video `shadows-4d` embedded.
Touches: orbits; scrubs the angles; drops the Lab's drawing onto the surface.
Realizes: Re surface, Im surface, modulus landscape, domain colouring and the Riemann surface are one object seen from five places.
Walk stop: do: scrub the uv angle from 0° to 90° and watch the Re surface become the Im surface. say: "Every picture is a shadow of one object." problem: none.

**21. `rehearse` — The Rehearsal Room.** (every problem type; new in iteration 2)
Sees: one card at a time: a fresh variant of a review problem (same shape, new numbers), the two decision chips to set,
a small plane to drag a guess or sketch an image on, then Reveal: the worked numbers in both addresses, the station's
picture with these numbers, and a link to open the station with them. A score strip per problem type; the home map's dots
fill as types are rehearsed.
Touches: sets Address and Names; drags a guess; reveals; presses "Another one like it" or "Take me to the station".
Realizes: the test will not use the handout's numbers, and it does not matter: the place is the same, the decisions are
the same, the picture is the same.
Walk stop: do: rehearse one fresh roots problem. say: "Same place, new numbers." problem: a fresh 1.4.2.

**22. `problems` — The Problem Index.**
Sees: **iteration 2:** a deck, not a wall: each card collapsed to one line (number, statement, the two chips) until opened;
"predict first" hides the place and chips until reveal; progress ticks; a "Rehearse this" link on every card; the topic
checklist.
Touches: filters by chapter or by decision (all the "home" problems, all the "all" problems); opens a card; ticks it.
Realizes: the exam is 29 dots on a path they have walked, settled by two decisions each.
Walk stop: do: open the three cards you ticked last. say: "Which place, which address, which names." problem: any not yet ticked.

---

## 3. Every review problem, pinned to a place

"Address" is the address that makes the problem easy (C = Cartesian/slide, P = polar/move, C→P→C = convert, do it,
convert back). "Names" is the second decision of section 0. Answers are hand-checked and numerically verified; they are the
values the unit tests assert. (The aha column is the exact wording the cards show; the data tests compare it word for word.)

| Problem | Place | Address / thread | The aha (one sentence) | Answer | Names |
|---|---|---|---|---|---|
| 1.1.1 z₁z₂, z₁/z₂ for z₁ = 3 − 2i, z₂ = −1 + 4i | `arithmetic` | C for the arithmetic, P as the check (T1) | Multiply by the definition; the polar column checks the modulus √13·√17 = √221 and Arg(z₁z₂). For division, multiply top and bottom by the mirror of z₂ so the spins cancel. | z₁z₂ = 5 + 14i; z₁/z₂ = −11/17 − (10/17)i | none (any, for the polar check) |
| 1.1.2 Im(conj(z₁ − z₂)) | `arithmetic` | C (T1) | Two slides and a mirror: 4 − 6i mirrored is 4 + 6i. | 6 | none |
| 1.2.1 sketch \|z − (1 + 2i)\| = 3 | `distance` | P (native shape, T1) | "Distance from 1 + 2i equals 3" is a circle; no algebra. | circle, center 1 + 2i, radius 3 | none |
| 1.2.2 distance between 4 + 3i and −1 + i | `distance` | C (T1) | Distance is the length of one slide: \|5 + 2i\|. | √29 ≈ 5.385 | none |
| 1.3.1 polar and exponential form of −1 + i√3; Arg | `addresses` (+ `staircase`) | C→P (T1, T2) | Read the polar address of the dot at (−1, √3): length 2, second quadrant, Arg z = 120°. | z = 2(cos 2π/3 + i sin 2π/3) = 2e^{i2π/3}; Arg z = 2π/3 | home |
| 1.3.2 (√3 + i)^10 in Cartesian | `powers` | C→P→C (T1, T2) | The same move (turn π/6, stretch 2) ten times; wrap 10π/6 onto the home step −π/3. | 1024e^{i5π/3} = 512 − 512√3 i | any (report on the home step) |
| 1.4.1 5th roots of unity | `roots` | P (T2) | Divide the staircase of 1 (arg 1 = {2πk}) by 5: five points 72° apart on the unit circle. | e^{2πik/5}, k = 0..4: 1, 0.309 + 0.951i, −0.809 + 0.588i, −0.809 − 0.588i, 0.309 − 0.951i; all but 1 are primitive | all |
| 1.4.2 4th roots of −16 | `roots` | P→C (T2, T1) | −16 is 16 at Arg π; divide the staircase arg(−16) by 4: radius 2, angles π/4 + kπ/2. | 2e^{iπ/4}, 2e^{i3π/4}, 2e^{i5π/4}, 2e^{i7π/4} = √2 + √2i, −√2 + √2i, −√2 − √2i, √2 − √2i | all |
| 1.4.3 solve z² − 4z + 13 = 0 | `roots` | C, with a root in disguise (T2) | (z − 2)² = −9, so z − 2 is a square root of −9 (±3i), then slide by 2; the roots are a mirror pair. | z = 2 ± 3i | all (the two square roots of −9) |
| 1.5.1 parametrize the line 2 + i → −3 − 3i | `curves` | C (T3, time) | A slide that grows with time: start + t·(end − start). | z(t) = (2 − 5t) + i(1 − 4t), 0 ≤ t ≤ 1 | none |
| 1.5.2 S = {1 < \|z + i\| ≤ 3} | `sets` | P (native shape, T1) | An annulus around −i; the inner circle is left out, the outer circle is kept in; decide each word by looking at a tiny disk. | neither open nor closed; bounded; boundary = {\|z + i\| = 1} ∪ {\|z + i\| = 3}; not a domain (not open; it is connected, so it is a region) | none |
| 2.1.1 f(z) = z² + iz in u + iv, both addresses | `mappings` | both (T1 on a function) | Expand (x + iy)² + i(x + iy); or, with θ a name for arg z, r²e^{2iθ} + re^{i(θ + π/2)} because i is a quarter turn. | u = x² − y² − y, v = 2xy + x; u = r² cos 2θ − r sin θ, v = r² sin 2θ + r cos θ | any |
| 2.1.2 image of x = 2 under z² | `powermap` | C with time (T3) | Push the line forward with y as the clock: u = 4 − y², v = 4y; eliminate y. | parabola u = 4 − v²/16 (vertex 4, opens left, focus 0) | none |
| 2.1.3 image of x = 2 under iz − 2i; what it does | `linear` | P for the motion, C for the line (T1, T3) | i(z − 2): slide left 2, quarter turn; the line x = 2 lands on the real axis. | the real axis v = 0; in general a 90° counterclockwise rotation followed by a slide by −2i | any (Arg i = π/2 is the turn) |
| 2.2.1 image of 0 < arg z < π/4 under z³ | `powermap` | P (T2 fan) | zⁿ multiplies every name of arg z by n; the fan opens three times wider. | the sector 0 < arg w < 3π/4 | any (every name times 3) |
| 2.2.2 principal (2i)^{1/2} | `principal-root` | P, home step (T2) | \|2i\| = 2 and Arg(2i) = π/2; take the square root of the length and halve the angle. | √2e^{iπ/4} = 1 + i | home |
| 2.3.1 lim (x² − y² + 2ixy)/(x² + y²) along y = x² | `limits` | P reveals it (T3) | The expression is z/conj z = e^{2iθ} (θ a name for arg z): it remembers only the direction; y = x² arrives tangent to the real axis. | 1 (and the full limit does not exist) | any (a direction) |
| 2.4.1 branch of z^{1/3} continuous on the negative real axis | `branches` | P (T2) | Choose a window of steps whose seam is not the negative real axis. | f(z) = r^{1/3}e^{iθ/3}, 0 < θ < 2π (cut on the positive real axis); f(−r) = r^{1/3}e^{iπ/3} | continuous |
| 2.5.1 image of \|z − 1\| = 1 under 1/z | `reciprocal` | P (T1, T3) | z = 2cos θ e^{iθ} on the circle (θ = Arg z), so 1/z = ½ − (i/2)tan θ; 0 goes to ∞ so the circle must open into a line. | the line Re w = ½ | any |
| 3.1.1 f(z) = z² + z differentiable everywhere, f′ | `derivative` | C with Δz (T3 zoom) | The quotient is 2z + 1 + Δz, no direction in sight. | f′(z) = 2z + 1 | none |
| 3.1.2 f(z) = \|z\|² differentiable only at 0 | `derivative` | P with Δz = ρe^{iφ} (T3) | The quotient tends to conj z + z e^{−2iφ} (φ names arg h): a circle of radius \|z\|, a point only at 0. | differentiable only at z = 0 (f′(0) = 0); nowhere analytic | any (the direction φ) |
| 3.2.1 e^x(cos y + i sin y) entire; f′ | `cauchy-riemann` | C (T3) | u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere: no mirror part. | entire; f′(z) = e^x cos y + i e^x sin y = f(z) | none |
| P1 conj z₁ · conj z₂ = conj(z₁z₂) | `arithmetic` | either; P is one line (T1) | Mirror negates names of arg, and −θ₁ − θ₂ = −(θ₁ + θ₂); in C, expand both sides. | both equal (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁) | any |
| P2 \|z\| = √(z·conj z) | `arithmetic` | P (T1) | Spin and unspin cancel: re^{iθ}·re^{−iθ} = r² (θ a name for arg z). | z·conj z = x² + y² = \|z\|² | any |
| P3 composition of linear maps is linear | `linear` | C (T3) | a(cz + d) + b = (ac)z + (ad + b): spins add, stretches multiply. | linear with coefficient ac and shift ad + b | none |
| P4 (1 + i)z sends the unit circle to the circle of radius √2 | `linear` | P (T1) | 1 + i = √2e^{iπ/4}: stretch by √2, spin by Arg = 45°; and every point of the big circle is hit. | image is {\|w\| = √2} | any |
| P5 lim (Re(1 + z) − 1)/z does not exist | `limits` | P (T3) | x/z = cos θ e^{−iθ} (θ a name for arg z) depends on direction: 1 along the real axis, 0 along the imaginary axis. | no limit | any (a direction) |
| P6 Re z is not differentiable | `derivative` | C or P (T3) | Same quotient as P5 at every point; or CR: u_x = 1 ≠ 0 = v_y; or: Re is a squash, not a spin-and-stretch. | nowhere differentiable | any |
| P7 entire with u = c implies f constant | `cauchy-riemann` | C (T3) | u_x = u_y = 0, so CR forces v_x = v_y = 0, so f′ = 0 and f is constant. | f ≡ c + i·(constant) | none |

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

The Rehearsal Room covers every row of both tables with fresh numbers (section 7 lists the variant families and their
exact answers).

---

## 4. The shared visual vocabulary

The same marks mean the same things on every station, in the Lab, in the Rehearsal Room and in the videos. Colours are
tokens from `css/theme.css` (never literals); `videos/lib/palette.py` must carry the same dark-theme values (it does not
today: see section 8).

**The point and its two addresses.**
- The point z is one filled dot, drawn once, with its label.
- Cartesian address (`--cart`): dashed drop lines from z to both axes, tick labels x and y, the Cartesian grid (lines).
  The word "slide" and the + operation are `--cart`.
- Polar address (`--polar`): the ray from 0 to z (labelled r) and the arc from the positive real axis (labelled θ), the
  polar grid (circles and rays). The words "turn", "stretch", "move" and the × operation are `--polar`.
- In formulas (KaTeX), Cartesian pieces are tinted `--cart` and polar pieces `--polar`.
- **The move glyph (new):** a 1.1em inline SVG beside a complex number: faint unit circle, the Arg arc, the ray with length
  min(1, r/R) where R is the glyph's scale (shown as a tooltip); `--polar`. One module (`core/moveglyph.js`), used by the
  explainer's "same point" row, the readouts of `addresses`, `arithmetic`, `powers`, `linear` (a), `derivative` (f′) and
  `cauchy-riemann` (A). Optional everywhere; never the only carrier of a number.

**arg versus Arg.** Whenever an angle is shown, it is clear which it is.
- `Arg z`: the solid arc, and the single highlighted row of the staircase list.
- `arg z`: ghost arcs that keep winding, and the list "…, θ − 2π, θ, θ + 2π, …" with the home window (−π, π] shaded.
- The seam: the negative real axis drawn dashed on any plane where Arg or a principal value matters; movable in `branches`
  and the Lab.

**The two decision chips (new).** Beside every problem statement (station cards, the index, the Rehearsal Room): an
Address chip (tinted by `addressTones`, as today) and a **Names** chip: `none` (grey), `any` (`--polar` outline), `all`
(`--polar` filled, with a small "n" staircase mark), `home` (`--polar`, with the home-window mark), `continuous`
(`--polar`, with a seam mark). Hovering or tapping a chip says in one line what it means (the Names table in section 1).
One module (`core/decisions.js`) renders both chips from `js/data/problems.js` (new field `names`).

**Input and output.** z-plane strokes `--input`; w-plane strokes `--output`. The z-plane is on the left (top on phones),
labelled z = x + iy; the w-plane on the right (below), labelled w = u + iv. The morph view blends the stroke colour from
`--input` to `--output` with s.

**Time.** A curve carries t in [0, 1]. Time is lightness along the stroke, dark at t = 0 to bright at t = 1 (`--t0`, `--t1`
mixed with the stroke hue), with dots at t = 0, ¼, ½, ¾ and an arrowhead at t = 1. The image uses the identical ramp so
"when" matches "where". Play moves a cursor along both on one clock; a scrubber sets t by hand. **Live ink (new):** while a
stroke is being drawn, the w-plane draws its image at the same moment, solid and ramped (today the half-drawn image is a
dashed guide only); **Replay (new)** redraws input and output from t = 0 to 1 on one clock.

**Domain colouring.** Hue encodes arg w (red at 0, counterclockwise); lightness encodes |w| (dark near 0, light toward ∞,
with faint rings at |w| = 1, 2, 4, …). The same wheel is the legend everywhere hue means argument, including 3D surfaces.

**Numeric explainer.** Two columns under every computation: "Cartesian (slide)" tinted `--cart`, "Polar (spin-and-stretch)"
tinted `--polar`, live numbers, and a final "same point" row with a check mark. A third column only where it earns it.

**Sets.** Included boundary solid; excluded boundary dashed; interior shaded lightly; the ε-disk coloured by what it finds.

**The microscope.** A ring of direction arrows round z₀, its image on the w-plane, and the direction circle (centre A,
radius |B|) with the point f′(z₀) when it exists.

**The Walk bar (new).** A slim bar fixed at the bottom of every station while the Walk is on: "Stop 5 of 21 · The Staircase",
the one thing to do, the one sentence to say (with a Listen control when its clip exists), the problem chip, Back and Next,
a progress strip of 21 dots. It uses the station's own hooks to tick the stop when the interaction was done (e.g. laps ≥ 1
on `staircase`); otherwise a "Done" tap. It never covers a plane: stations get bottom padding while the bar is shown.

**The rehearsal card (new).** Statement with fresh numbers (KaTeX); the two decision chips as *inputs* (the student
sets them; the card marks right or wrong on reveal); a small plane (the right kind for the problem: one point, two points,
a circle, a line and its image, a sector) where the student drags a guess or sketches; Reveal shows the station's picture
with these numbers plus the two-column explainer; "Another one like it" and "Open at the station with these numbers".

**Video embeds (new).** `<video controls preload="metadata" playsinline>` with `<track kind="captions" default>` from
`media/manifest.js`, in a panel headed "Watch (2–3 min)" placed after the station's first picture, never before it; the
panel is absent when the manifest has no entry for that video.

**Identity (lower priority).** The subject's own object as the motif: a faint polar grid (rings and 30° rays) behind the
home map and in the header mark; the thread badges as bearings on that grid; the site title "One Point, Two Addresses" set in
the display face with its local fallback. No new colours: the two-address code is the identity.

---

## 5. The Mapping Lab (the diary)

The Lab is the student's diary page: draw on the z-plane, and the w-plane answers. Iteration 1 built the tools, the six
views, the presets, predict-first and the first-visit example (the circle |z − 1| = 1 under 1/z). Iteration 2 makes it feel
like a diary rather than a control panel:

1. **The drawing surface first.** The two planes (or the current view) sit directly under the title; the preset chips,
   the tool bar and the function picker become one compact toolbar above the planes (tools) and one row below (f), with
   the long chip panels folded into "More". On a phone the z-plane is the first thing below the title.
2. **Live ink.** While a stroke, rectangle, circle or polygon is being drawn, its image is inked on the w-plane at the same
   moment, solid and time-ramped, so the student sees "this part of my stroke lands there" as the hand moves. (Today the
   half-drawn image is a dashed guide, which is almost there; make it the real ink.)
3. **Replay my stroke.** A Replay button (and a scrubber) redraws the latest stroke and its image from t = 0 to t = 1 on
   one clock, with the cursor on both planes; in the morph view the plane slides as the stroke replays.
4. **The opening example framed correctly.** On a first visit the image line Re w = ½ must sit clearly off the v-axis: the
   w-plane frames a thin image around its bulk so a vertical line at u = ½ is at least 60 px from the axis at desktop width
   and 40 px on a phone (today the frame is about ±6 and the line reads as the axis, which hides the one thing the example
   is for).
5. **Pages.** The diary keeps pages: "Save this page" names the current drawing and function; the pages list (localStorage,
   try/catch, works without it) reopens any page; the 4D station lifts the current page. Clear is still one press.
6. **Everything else stays:** brush, line, rectangle, circle, polygon, Cartesian and polar grid patches, sector, ring,
   probe, move; undo; snap; the six views on one clock; predict-first with the guess pad; the problem panel that appears
   when the drawing is exactly a handout set-up; the parsed f(z) field; the singularity handling near poles.

How it ties back: every station with an image problem has "Open in the Lab" (loads its shape and function); the Lab's
preset chips name the problem and link back; the Rehearsal Room's "find the image" variants open in the Lab with
predict-first on; the 4D station shows the diary's current page as a curve on the graph.

---

## 6. A study session with the site (the Walk)

The Walk is the night-before plan made into one path with progress, so the site is one road and not 22 tabs.

1. **Start the Walk on `home`** (stop 0): say the four lines. The Walk bar appears and stays on every station.
2. **Stops 1–7 (Part I, 30 min):** at each stop do the one thing the bar says, say the sentence out loud (press Listen if
   the clip exists), glance at the problem. The bar ticks the stop when the station reports the interaction (the staircase
   lap, the roots click, the powers scrub) or when you press Done.
3. **Stops 8–18 (Parts II–IV, 45 min):** same routine. At `limits` and `derivative` make the direction circle shrink to a
   point by hand: that is all of Chapter 3.
4. **Stop 19, the Lab (15 min):** draw, watch the live ink, replay; then load x = 2 under z² with predict-first, sketch the
   parabola, reveal.
5. **Stop 20, the 4D graph (5 min):** turn the Re surface into the Im surface.
6. **Stop 21, the Rehearsal Room (30 min):** one fresh variant of each type you are least sure of; set the two chips before
   you touch the plane.
7. **Stop 22, the index (10 min):** open the cards you have not ticked; say place, address, names; reveal; tick.
8. **Morning of the test:** `home`, the four lines; `staircase`, one lap; `rehearse`, three cards.

During the test each question is a place and two decisions: "this is `roots`; polar; all the names; divide the staircase."

---

## 7. The Rehearsal Room: variant families and their exact answers

Every family is generated by a pure, seeded module (`js/data/generators.js`) so a unit test can replay any card and check
its answer against the hand rules below (and against `core/complex.js`). "Nice points" are the points r·e^{iθ} with
r ∈ {1, 2, 3} and θ a multiple of 30° or 45°, whose Cartesian parts are exact (0, ±½, ±√2/2, ±√3/2, ±1 times r). Gaussian
integers are x + iy with integer x, y in −5..5 (never 0 where the handout's number is not 0).

| Type (handout id) | Fresh variant | Exact answer rule (what the test asserts) |
|---|---|---|
| 1.1.1 | z₁, z₂ Gaussian, z₂ ≠ 0 | product by Def 1.2.4; quotient = z₁·conj z₂ / \|z₂\|²; \|z₁z₂\| = \|z₁\|\|z₂\| |
| 1.1.2 | z₁, z₂ Gaussian; ask Re or Im of conj(z₁ ± z₂) | Im(conj(w)) = −Im w; Re(conj w) = Re w |
| 1.2.1 | \|z − a\| = R, a Gaussian, R ∈ 1..4; also \|z − a\| < R and ≤ R | circle (or open/closed disk), centre a, radius R |
| 1.2.2 | two Gaussian points | \|z₁ − z₂\| exactly as √(Δx² + Δy²) |
| 1.3.1 | a nice point | r, Arg in (−π, π] (Arg of a negative real is π), exponential and trigonometric forms |
| 1.3.2 | a nice point with r ∈ {1, 2}, n ∈ 4..12 | rⁿ e^{i·wrap(nθ)}; Cartesian parts from the exact table |
| 1.4.1 | n-th roots of unity, n ∈ 3..8 | e^{2πik/n}; primitive iff gcd(k, n) = 1 |
| 1.4.2 | c ∈ {−1, −8, −16, −27, −32, −64, −81, ±2i, ±8i, ±16i, ±32i}, n chosen so \|c\|^{1/n} is an integer or √2 | \|c\|^{1/n} e^{i(Arg c + 2πk)/n}, k = 0..n − 1; each root to the n-th power equals c |
| 1.4.3 | z² − 2pz + (p² + q²) = 0 with integers p ∈ −5..5, q ∈ 1..5 | roots p ± qi; discriminant −4q²; (z − p)² = −q² |
| 1.5.1 | two Gaussian endpoints | z(t) = z₀ + t(z₁ − z₀), 0 ≤ t ≤ 1; also the reverse −C |
| 1.5.2 | {r₀ ? \|z − a\| ? r₁} with a Gaussian, 1 ≤ r₀ < r₁ ≤ 4, each ? one of <, ≤; also a punctured disk and a half plane | open iff both inequalities are strict; closed iff both are non-strict (a half plane: open iff strict); bounded for the annuli and disks, unbounded for the half plane; connected in every case; domain iff open; a region in every case (each set is a domain plus some, none or all of its boundary); the boundary is the circle(s) or the line |
| 2.1.1 | f ∈ {z² + az, z² − iz, z³, az² + b} with a, b Gaussian | u, v in (x, y) by expansion; in (r, θ) via rⁿ e^{inθ} and a·r e^{i(θ + Arg a)} |
| 2.1.2 | x = c or y = c, c ∈ {±1, ±2, ±3}, under z² | x = c: u = c² − v²/(4c²); y = c: u = v²/(4c²) − c²; focus 0 |
| 2.1.3 | az + b with a ∈ {i, −i, −1, 2, 2i, 1 + i, 1 − i}, b Gaussian; the line x = c or y = c | image = the line through f(c) (resp. f(ic)) with direction a·i (resp. a); "turn by Arg a, stretch by \|a\|, slide by b" |
| 2.2.1 | 0 < arg z < α, α ∈ {π/6, π/4, π/3, π/2}, under zⁿ, n ∈ 2..4 with nα < 2π | 0 < arg w < nα (stated with arg, since nα may exceed π) |
| 2.2.2 | principal n-th root of a nice point, n ∈ {2, 3} | \|w\|^{1/n} e^{i Arg(w)/n}; the other roots from the other steps |
| 2.3.1 / P5 | z/conj z along y = mx (m ∈ {±1, ±2, ½}), y = x², y = x³, x = 0; (Re(1 + z) − 1)/z along the same | along y = mx: e^{2i·atan m}; along y = x² or x³: 1; along x = 0: −1; P5: cos²θ − i sin θ cos θ at the arrival direction |
| 2.4.1 | branch of z^{1/n}, n ∈ {2, 3}, continuous along a given ray (negative real, positive imaginary, negative imaginary) | any window (σ, σ + 2π] whose seam σ is not that ray; the card's answer uses the seam opposite the ray; the value on the ray from branchArg |
| 2.5.1 | the circle \|z − a\| = \|a\| through 0 with a ∈ {1, −1, 2, i, −i, 1 + i}; or the line x = c, c ≠ 0 | circle through 0: the line Re(a·w) = ½ (for a = 1: Re w = ½; a = i: Im w = −½; a = 2: Re w = ¼; a = 1 + i: u − v = ½); line x = c: the circle \|w − 1/(2c)\| = 1/(2\|c\|) |
| 3.1.1 | az² + bz + c with small integers | f′ = 2az + b from the quotient 2az + b + aΔz |
| 3.1.2 / P6 | one of conj z, Re z, Im z, \|z\|², z·Re z | conj, Re, Im: nowhere (B = 1, ½, −i/2); \|z\|²: only at 0; z·Re z: only at 0 (u = x², v = xy) |
| 3.2.1 | one of e^x(cos y + i sin y), e^{−x}(cos y − i sin y), x² − y² + 2ixy, x − iy, x² + y² | entire with f′ = f, −f, 2z; the last two fail CR (u_x ≠ v_y) |
| P1, P2 | fresh z₁, z₂ Gaussian | both sides computed and compared |
| P3 | fresh a, b, c, d Gaussian with a, c ≠ 0 | coefficient ac, shift ad + b |
| P4 | \|z\| = R under az, a ∈ {1 + i, 2i, 1 − i, −2, √3 + i} | \|w\| = \|a\|R, every point hit |
| P7 | u = c, or v = c, or \|f\| = c, on a domain | f constant (CR forces the other partials to 0; Thm 3.2.12 for \|f\|) |

Each card also states which station's picture it shows and which two decisions it expects (the Address and Names columns
of section 3 for the handout version of the type).

---

## 8. The media track: five videos and the station narration

Each video carries one line of the spine, lasts 2–3 minutes, is written for the ear (short sentences, both addresses said
out loud), is rendered silent with captions in the loop and voiced on the student's machine. Scenes use
`videos/lib/palette.py`, which must first be brought in line with `css/theme.css` dark tokens (today it is not: CART is
teal #3fc1b0 where the site's dark `--cart` is #62adf2, INPUT is blue where the site's is green #3fd0a0, OUTPUT, BG, INK
and MUTED differ too). Segment ids are the `beat` names.

**V1 `two-addresses` (station `addresses`; also offered on `home`).** intro: one dot, z = −1 + i√3. cart: slide one left,
root three up; blue. polar: turn 120°, walk 2; orange. same: same dot, two ways of reaching it. add: adding slides the
whole plane; slides are easy in Cartesian, add the x's and the y's. mul: multiplying turns and stretches the whole plane;
easy in polar, add the angles, multiply the lengths. rule: every question starts with a choice; do it in the native
address; translate back. euler: e^{iθ} is the point at angle θ on the unit circle, cos θ + i sin θ, the dictionary.

**V2 `staircase-roots` (station `staircase`).** intro: one dot, many names for its angle. names: 120°, 480°, −240°, same
dot. set: arg z is the whole set; a spiral staircase above the point, one step per turn. home: Arg z is the step in the home
window, −π to π. jump: drag the dot round the origin; the dot and the staircase move smoothly; the chosen step jumps at
the seam, because a name cannot climb one step on a closed loop and stay continuous. power: powers do not care which
name. roots: roots need all of them; divide every step by five: five different dots, 72° apart; step five is step zero
again. principal: the principal root uses the home step only. branch: a branch is a continuous choice of step; the seam is
where it must jump; move the seam and the jump moves.

**V3 `motion-time` (station `mappings`).** intro: a function picks up every point and puts it down somewhere else.
stroke: draw a stroke; it carries a clock, dark at the start, light at the end; the image keeps the clock. linear:
az + b is one turn, one stretch, one slide for the whole plane; lines stay lines. square: z² squares the length and
doubles the angle; circles and rays stay; the line x = 2 bends into a parabola with its focus at 0. recip: 1/z inverts the
length and flips the angle; a circle through 0 opens into a line because 0 goes to infinity. paper: parametrize, push
forward, eliminate t: z = 2 + iy, u = 4 − y², v = 4y, eliminate y.

**V4 `zoom-cr` (station `derivative`).** intro: put a point under a microscope. ring: a tiny ring of directions around
z₀; where does f send it? move: if the ring comes out as a ring, turned and scaled by one number, f is one move up close;
that number is f′(z₀), a complex number with a turn and a stretch. quotient: every direction must agree; the quotient from
each direction is a dot, and the dots trace a circle with centre A and radius |B|. mirror: B is the mirror part;
conjugation is pure mirror, its circle never shrinks; Re z squashes; z² + z has no mirror, the circle is a point, f′ = 2z + 1.
cr: Cauchy–Riemann is the same sentence in x and y: u_x = v_y, u_y = −v_x; no mirror; then f′ = u_x + i v_x. abs2: |z|²
has a mirror everywhere except at 0: differentiable at one point, analytic nowhere.

**V5 `shadows-4d` (station `graph4d`).** intro: the graph of w = f(z) needs four numbers; nobody can see it; every
picture here is its shadow. side: two flat shadows tied by the clock. domain: the z-plane painted with the hidden two: hue
for the angle, brightness for the length. surfaces: height u is the real surface; turn inside four dimensions and it
becomes the imaginary surface, the same object. riemann: for a root, all the sheets at once, the staircase made solid.
sphere: wrap the plane onto a sphere so infinity is a point; 1/z is a half-turn. close: five pictures, one object; "the
image of" a shape is one shadow of it.

**Station narration (`media/narration/site/<station>.json`, 4–6 segments each, Listen control hidden until the clips
exist):** `home` (the four lines and the two decisions), `staircase` (what to drag, what jumps, why), `roots` (divide the
staircase; k = n is k = 0), `derivative` (the ring, the circle, the point), `lab` (draw, watch, replay, predict), and the
Walk sentences (one clip per stop, `media/narration/site/walk.json`).

---

## 9. Iteration 2 improvements, ranked by impact on "the test questions feel less daunting"

Impact is 1–10. Each item is concrete enough for the planner to turn into goals with ownership and acceptance checks.
Nothing here regresses iteration 1: 801 unit tests, 20 interaction scripts and 63/63 smoke must stay green, and the
section-3 table keeps its 29 rows and its aha wording.

| # | Item | Kind | Impact | What, concretely |
|---|---|---|---|---|
| 1 | **The Rehearsal Room** (`rehearse` station, `js/data/generators.js`, rehearsal card, station presets for fresh numbers) | new | 10 | Seeded generators for every family of section 7 with unit tests that replay cards and check the answer rules; the card with the two decision chips as inputs, a guess plane, Reveal with the station's picture and the two-column explainer, "Another one like it", "Open at the station with these numbers" (stations accept `preset.kind = 'values'`); a score per type in the store; the home map's dots fill from it; `#rehearse-<problem-id>` deep links; the registry gains the station (order 20, `problems` 21) and `stationForProblem` skips it like `problems`. Interaction script: generate 1.4.2 and 2.5.1 cards, set the chips, reveal, assert the answer text matches the generator. |
| 2 | **The Walk** (`core/walk.js`, the Walk bar, `walk` entries in the registry) | new | 9 | Each station declares `walk: { do, say, problem, check }` from section 2; the bar (section 4) with progress, Back/Next, Done, and auto-tick through station hooks (`staircase` laps ≥ 1, `roots` a root clicked, `powers` n scrubbed, `lab` a stroke drawn, …); `walk.stop` and `walk.done` in the store; start/resume on `home`; the bar never covers a plane (phone and desktop screenshots); Listen control for the say-sentence when `walk.json` clips exist. Interaction script walks stops 0–5 with real clicks and asserts the ticks. |
| 3 | **Five manim videos + station narration + palette sync** (`videos/scenes/*.py`, `media/narration/videos/*.json`, `media/narration/site/*.json`, `videos/lib/palette.py`, embeds in five stations) | video | 8 | The five scenes of section 8 with `NarratedScene` beats, rendered with `npm run videos` at 720p under 3 min and 15 MB each, captions from the narration; palette.py made equal to the dark tokens (a unit test reads both files); each embed panel after the station's first picture, hidden when the manifest has no entry; narration JSON for home, staircase, roots, derivative, lab and the Walk; the Listen control (shared `core/listen.js`) hides without clips. Smoke must stay clean with and without `media/manifest.js` entries. |
| 4 | **The Lab as a diary** (layout, live ink, replay, framing, pages) | improve | 8 | Section 5 items 1–5. Interaction script: draw a brush stroke with pointer events and assert mid-stroke (before pointerup) that the w-plane layer holds image points of the draft (via `window.__mv` hooks); press Replay and assert the cursor advances on both planes; first visit: the pixel distance from the line Re w = ½ to the v-axis ≥ 60 at 1280 px and ≥ 40 at 390 px; save a page, reload, reopen it. |
| 5 | **The two decisions and the move glyph, in shared station pieces** (`core/decisions.js`, `core/moveglyph.js`, `core/station-kit.js` (header, problem card, neighbour links), `names` field in `js/data/problems.js`) | unify | 8 | Every problem card (stations, index, rehearsal) shows Address and Names chips from one renderer with the one-line meaning on tap; the index filters by Names; `home` explains the two decisions under the spine; the move glyph beside z, the result, zⁿ, a, f′ and A on the stations listed in section 4; the station header, problem card and neighbour links built by one kit so the left-bar/top-bar difference disappears (D-report items 9, 10). Unit test: every problem has a `names` value from the allowed set and it equals the Names column of section 3. |
| 6 | **Three pictures that do not yet say what they mean** (staircase helix, arithmetic multiply scale, 4D shadows) | fix | 6 | `staircase`: the helix as a thin lit ribbon with the beads on it and the seam as a riser (screenshot review: the ribbon and the big bead's hop are legible at 390 px in dark). `arithmetic`: the × and ÷ pictures at two scales (moves near 0; the product on a log ruler) so the arcs θ₁, θ₂ stay readable when \|z₁z₂\| is large (1.1.1's product is 14.9 away). `graph4d`: the five shadows of the same f as small multiples beside the 4D view, each highlighted as the uv/yv sliders pass its angle. |
| 7 | **The problem index as a deck** | improve | 6 | Cards collapsed to one line until opened (statement, the two chips, the station), open one at a time or all; "Rehearse this" on every card; filter by chapter, by Names and by not-ticked; the page is under 4,000 px at desktop with all cards collapsed (today 12,250 px). |
| 8 | **Identity: the chart look** | polish | 5 | The polar-grid motif behind the home map and in the header mark; thread badges as bearings; the display face with its fallback checked in the no-fonts smoke; nothing else changes colour. Screenshot review at desktop and phone, light and dark. |

Held for later iterations: a "find the mirror" game (is this formula analytic?); the inverse-function and one-to-one
explorer; a triangle-inequality proof walk; a conformality overlay (right angles preserved) in `derivative`; a one-page
printable cheat sheet of the map and the two decisions.

---

## 10. Notes for designers and reviewers (facts that must be exactly right)

- Arg is in (−π, π]; `atan2(y, x)` already returns this. Arg of a negative real is π, not −π.
- Roots of c = |c|e^{iΘ} (Θ = Arg c): |c|^{1/n} e^{i(Θ + 2πk)/n}, k = 0..n − 1. For −16: radius 2, angles π/4, 3π/4, 5π/4, 7π/4
  (equivalently −3π/4 and −π/4 on the home step).
- Principal root uses Arg only: (2i)^{1/2} = √2e^{iπ/4} = 1 + i, not −1 − i.
- Branch of z^{1/n} with seam at angle σ: use θ in (σ, σ + 2π]; the principal branch is σ = −π. The branch continuous on the
  negative real axis for 2.4.1 is σ = 0 (0 < θ < 2π); at z = −1 it gives e^{iπ/3} = ½ + (√3/2)i.
- Image of x = c under z²: u = c² − v²/(4c²), focus at 0 for every c. Image of y = c: u = v²/(4c²) − c².
- Image of |z − 1| = 1 under 1/z: Re w = ½; z = 0 goes to ∞ (omit it, never draw a segment through it). In general the
  circle |z − a| = |a| (through 0) goes to the line Re(a·w) = ½, and the line x = c (c ≠ 0) goes to the circle
  |w − 1/(2c)| = 1/(2|c|).
- On the Riemann sphere, 1/z is the half-turn about the axis through 1 and −1 (inversion in the unit circle is the
  reflection in the equatorial plane, conjugation the reflection in the plane through the real axis and the poles; two
  reflections in perpendicular planes make a half-turn about their common line).
- Directional difference quotient: A + Be^{−2iφ} with A = ½(f_x − i f_y), B = ½(f_x + i f_y); for |z|² at z₀: A = conj z₀,
  B = z₀; for Re z: A = B = ½; for Im z: A = −i/2, B = i/2; for conj z: A = 0, B = 1; for z·Re z: u = x², v = xy, CR holds only
  at 0; for analytic f: A = f′, B = 0.
- 2.3.1 along y = x²: value (1 − x² + 2ix)/(1 + x²) → 1. Along y = mx: e^{2i·atan m}, constant on the line. Along x = 0: −1.
- P5: (Re(1 + z) − 1)/z = x/z = cos θ e^{−iθ} = ½ + ½e^{−2iθ}: the circle |w − ½| = ½; 1 along the real axis, 0 along the
  imaginary axis.
- 1.5.2: S is connected but not open, so not a domain; it is a region; bounded by |z + i| ≤ 3.
- (√3 + i)^10 = 512 − 512√3 i ≈ 512 − 886.81i; Arg of the result is −π/3.
- 1.1.1: z₁/z₂ = (3 − 2i)(−1 − 4i)/17 = (−11 − 10i)/17.
- e^{−x}(cos y − i sin y) = e^{−z} is entire with f′ = −f; x² − y² + 2ixy = z² with f′ = 2z; x − iy = conj z fails CR
  (u_x = 1, v_y = −1); x² + y² = |z|² satisfies CR only at 0.
- The Names decision of every problem is the last column of section 3; a unit test compares `problems.js` to it.
- Unit tests assert all of the above to 1e-9, plus: |z₁z₂| = |z₁||z₂|, Arg(z₁z₂) equals Arg z₁ + Arg z₂ wrapped into
  (−π, π], the five 5th roots each satisfy z⁵ = 1, the four roots of −16 each satisfy z⁴ = −16, (1 + i)² = 2i, and every
  generated rehearsal root raised to its n gives its c.
