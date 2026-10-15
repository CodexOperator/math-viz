# The Assignment

This is the single source of truth for *what* we are building and *why*. Every goal, design,
build and review in this repo is ultimately checked against this file.

## 1. Who it is for and what they asked for

A student is preparing for **Test 1 of MAT 412 (complex analysis), Chapters 1–3**. Their request,
in their own words (lightly condensed):

> Help me visualize my study session for this upcoming math test on complex numbers.
> Try to find the single thread or set of threads that unify the whole set of explanations in a
> truly beautiful and elegant way. Something about how we can move between **polar and Cartesian
> coordinates at will** and it allows for magical things, and also getting into **the difference
> between a complex number's args and what defines it in a polar form vs the number itself as it
> sits on the Cartesian plane**.
>
> I just want the test questions to feel less daunting. **Not like a set of procedures I need to
> memorize, but a point on a visualization story that I revisit.**
>
> Interactive demos are super welcome, like showing how the **input vs output are related as a
> 'time' dimension**, visualized as showing where a given **input brush stroke moves as it maps to
> the output**. And enable to **draw a rectangle or a circle or whatever shape**, kind of like Tom
> Riddle's diary, but it can have **several visualization formats**.
>
> **The ultimate complex function graph comprehension tool** to try and glimpse this weird
> **4D-ish structure**.

### Success, from the student's side

1. Every test review problem below is reachable as a *place* in one connected story, with a
   visualization you can touch and a numeric explainer that shows **both** the Cartesian and the
   polar view of the same computation.
2. The student can say, for each problem, *which address (Cartesian or polar) makes it easy and
   why* — instead of recalling a memorized recipe.
3. The distinction between **the point z** (one location in the plane), **arg z** (an infinite
   set of angles θ + 2πk that all reach it), and **Arg z** (the one chosen representative in
   (−π, π]) is felt visually, not just stated.
4. A free-form **Mapping Lab** ("the diary"): draw any stroke or shape on the z-plane and watch
   its image appear on the w-plane under f, with time/parameter coloring and a morph animation, in
   several views (side-by-side, morph, domain coloring, 3D modulus landscape, Riemann sphere, a
   4D-graph projection).

## 2. Test 1 review problems (verbatim from the handout)

### Chapter 1

**1. Algebraic Properties of Complex Numbers**
- 1.1.1 Let z₁ = 3 − 2i and z₂ = −1 + 4i. Compute z₁z₂ and z₁/z₂ in the form x + iy.
- 1.1.2 Find Im( conj(z₁ − z₂) ) for z₁ = 3 − 2i and z₂ = −1 + 4i.

**2. Geometric Interpretation**
- 1.2.1 Sketch the set of points in the complex plane that satisfy |z − (1 + 2i)| = 3.
- 1.2.2 Find the distance between 4 + 3i and −1 + i.

**3. Polar Representation**
- 1.3.1 Write z = −1 + i√3 in polar form r(cos θ + i sin θ) and exponential form re^{iθ}. What is Arg(z)?
- 1.3.2 Use polar form to compute (√3 + i)^10. Express the final answer in Cartesian form x + iy.

**4. Powers and Roots**
- 1.4.1 Find and sketch the 5th roots of unity.
- 1.4.2 Find all the 4th roots of −16. Express answers in both exponential and Cartesian forms.
- 1.4.3 Use the quadratic formula to solve z² − 4z + 13 = 0.

**5. Sets of Points in the Complex Plane**
- 1.5.1 Find a parameterization of the line from 2 + i to −3 − 3i.
- 1.5.2 Consider S = { z ∈ ℂ : 1 < |z + i| ≤ 3 }. Is S open, closed, or neither? Is S bounded?
  What are the boundary points of S? Is S a domain? Why or why not?

### Chapter 2

**1. Complex Functions and Mappings**
- 2.1.1 Express f(z) = z² + iz in the form u(x, y) + iv(x, y) and u(r, θ) + iv(r, θ).
- 2.1.2 Determine the image of the vertical line x = 2 under w = z². Describe the resulting curve in the w-plane.
- 2.1.3 Find the image of the line x = 2 under f(z) = iz − 2i. What does this linear transformation do to the plane in general?

**2. Power and Root Functions**
- 2.2.1 Find the image of the sector 0 < arg(z) < π/4 under w = z³.
- 2.2.2 Compute the principal value of the square root of 2i, i.e. (2i)^{1/2} on the principal branch.

**3. Limits and Continuity**
- 2.3.1 Find lim_{z→0} (x² − y² + i2xy)/(x² + y²) as z → 0 along the curve y = x².

**4. Multiple-Valued Functions and Branches**
- 2.4.1 Find a branch of the cube root of z that is continuous along the negative x-axis.

**5. The Reciprocal Transformation and Extended Complex Plane**
- 2.5.1 Find the image of the circle |z − 1| = 1 under w = 1/z.

### Chapter 3

**1. Derivatives of Complex Functions**
- 3.1.1 Use the limit definition of the derivative to show f(z) = z² + z is differentiable everywhere and find f′(z).
- 3.1.2 Let f(z) = |z|². Show f is differentiable only at z = 0, and thus nowhere analytic.

**2. The Cauchy–Riemann Equations**
- 3.2.1 Given f(z) = e^x(cos y + i sin y), use the Cauchy–Riemann equations to verify f is entire. Then compute f′(z).

### Proof Examples
- P1 Show that conj(z₁)·conj(z₂) = conj(z₁z₂).
- P2 Show that |z| = √(z·conj(z)).
- P3 Prove that the composition of two linear transformations is a linear transformation.
- P4 Show that the image of the circle of radius 1 centered at 0 under f(z) = (1 + i)z is the circle of radius √2 centered at 0.
- P5 Show that lim_{z→0} (Re(1 + z) − 1)/z does not exist.
- P6 Show that f(z) = Re(z) is not differentiable.
- P7 Suppose f = u + iv is entire and u(x, y) = c (a real constant) everywhere. Use Cauchy–Riemann to prove f is constant.

## 3. Test 1 topics (the syllabus checklist)

### Chapter 1
1. **Algebraic properties** — complex numbers as ordered pairs (x, y) and as x + iy; +, −, ×, ÷;
   field properties (commutative, associative, distributive, identities, inverses); Re(z), Im(z);
   conjugates and their algebraic properties.
2. **Geometric interpretation** — complex numbers as vectors; modulus |z| and its meaning;
   distance between two complex numbers; triangle inequality |z₁ + z₂| ≤ |z₁| + |z₂| and related
   inequalities (e.g. lower bounds, | |z₁| − |z₂| | ≤ |z₁ ± z₂|).
3. **Polar representation** — polar coordinates (r, θ), z = r(cos θ + i sin θ); arg z and the
   principal argument Arg z; exponential form and Euler's formula e^{iθ} = cos θ + i sin θ;
   geometric meaning of multiplication and division in polar/exponential form.
4. **Powers and roots** — computing powers; all n-th roots of unity (and primitive roots);
   solving zⁿ = c; quadratic formula in ℂ.
5. **Sets of points** — parameterizing curves (smooth, piecewise smooth, closed, simple);
   positive/negative orientation of simple closed curves; ε-neighborhoods and punctured disks;
   interior, exterior and boundary points; open, closed, connected, bounded sets; domains and regions.

### Chapter 2
1. **Complex functions and mappings** — w = f(z); domain, range, images of sets; Cartesian form
   u(x, y) + iv(x, y); polar form f(re^{iθ}) = u(r, θ) + iv(r, θ); inverse functions and one-to-one;
   elementary mappings: translation, rotation, magnification, linear transformations.
2. **Power and root functions** — w = zⁿ (multiplies the angle by n, raises the modulus to the
   n-th power); principal square root z^{1/2} and principal n-th root z^{1/n}; images of regions.
3. **Limits and continuity** — ε–δ definitions for u(x, y) and f(z); limits via real and
   imaginary parts; showing a limit does not exist by approaching along different curves;
   limit laws; continuity.
4. **Multiple-valued functions and branches** — single- vs multiple-valued; branches; branch
   cuts and branch points; where a branch is continuous or discontinuous.
5. **Reciprocal transformation and extended plane** — w = 1/z as inversion followed by
   reflection; the point at infinity; the Riemann sphere and stereographic projection; 1/z maps
   generalized circles (lines and circles) to generalized circles.

### Chapter 3
1. **Derivatives** — limit definition f′(z₀) = lim (f(z) − f(z₀))/(z − z₀); differentiability vs
   continuity (e.g. conj(z) is continuous everywhere, differentiable nowhere); analytic, entire,
   singular points; differentiation rules (constant, power, product, quotient, chain).
2. **Cauchy–Riemann** — derivation by limits along horizontal and vertical paths; u_x = v_y,
   u_y = −v_x; CR plus continuous partials ⇒ differentiable/analytic; f′(z) = u_x + iv_x = v_y − iu_y;
   consequences (an analytic function with constant modulus, or zero derivative, on a domain is constant).

## 4. Definitions and theorems sheet (the reference card)

**Chapter 1.** Def 1.2.1 addition (x₁+x₂, y₁+y₂). Def 1.2.2 subtraction. Def 1.2.4 multiplication
(x₁x₂ − y₁y₂, x₁y₂ + x₂y₁). Def 1.2.6 division ((x₁x₂ + y₁y₂)/(x₂² + y₂²), (−x₁y₂ + x₂y₁)/(x₂² + y₂²)),
z₂ ≠ 0. Def 1.2.8 Re z = x. Def 1.2.9 Im z = y. Def 1.2.10 conj z = x − iy.
Thm 1.2.12: conj(conj z) = z; conj(z₁ + z₂) = conj z₁ + conj z₂; conj(z₁z₂) = conj z₁ · conj z₂;
conj(z₁/z₂) = conj z₁ / conj z₂; Re z = (z + conj z)/2; Im z = (z − conj z)/(2i).
Def 1.3.4 modulus |z| = √(x² + y²). Thm 1.3.8 triangle inequality.
Def 1.4.2 polar representation z = r(cos θ + i sin θ).
Def 1.4.4 **arg z = { θ : z = r(cos θ + i sin θ) }** (a *set*). Def 1.4.6 **Arg z = θ with
−π < θ ≤ π** (one number). Thm 1.4.14 arg(z₁z₂) = arg z₁ + arg z₂ *as sets*.
Thm 1.5.4 a degree-n polynomial has exactly n roots (with multiplicity).
Def 1.5.6 primitive n-th root: n is the smallest natural number with zⁿ = 1.
Curves: z(t) = x(t) + iy(t), a ≤ t ≤ b; −C is the reverse. Smooth / piecewise smooth. Closed:
z(a) = z(b). Simple: no self-crossing except endpoints. Positive orientation = interior on the left
(counter-clockwise). ε-neighborhood D_ε(z₀) = {|z − z₀| < ε}; closed disk; punctured disk
D*_ε(z₀) = {0 < |z − z₀| < ε}. Interior / exterior / boundary points; circle C_R(z₀) with C⁺, C⁻;
accumulation point; open set; closed set (contains all boundary points ⇔ all accumulation points);
connected set; domain = connected open set; region = domain plus some/none/all boundary points;
closed region; bounded / unbounded. Thm 1.6.13 Jordan curve theorem.

**Chapter 2.** Def 2.2.1 principal square root w^{1/2} = |w|^{1/2} e^{i Arg(w)/2}. Def 2.2.8 principal
n-th root w^{1/n} = |w|^{1/n} e^{i Arg(w)/n}. Def 2.3.1 / 2.3.4 ε–δ limits. Thm 2.3.7 lim f = u₀ + iv₀
iff lim u = u₀ and lim v = v₀. Thm 2.3.9 limit laws. Def 2.3.11 continuity. Thm 2.3.13 f continuous
iff u and v continuous.

**Chapter 3.** Def 3.1.4 analytic at z₀ (differentiable on a disk around z₀). Def 3.1.5 entire.
Thm 3.1.7 differentiable ⇒ continuous. Thm 3.2.2 Cauchy–Riemann: u_x = v_y, u_y = −v_x and
f′(z₀) = u_x + iv_x = v_y − iu_y. Thm 3.2.6 continuous partials + CR ⇒ differentiable.
Thm 3.2.12 analytic on a domain with |f| constant ⇒ f constant. Thm 3.2.13 f′ ≡ 0 on a domain ⇒ f constant.

## 5. The unifying story (seed; refined every iteration in `docs/STORY.md`)

*One point, two addresses.* Every complex number is a single point. It has a **Cartesian
address** (x, y) — where it sits — and a **polar address** (r, θ) — how to reach it by turning
θ and walking r. The point never changes; only the address does. Adding is easy in Cartesian
(slide); multiplying is easy in polar (spin by the angle, stretch by the length). Almost every
test problem is "pick the address that makes this easy, do it, translate back."

The polar address has a twist the Cartesian one does not: θ is only defined up to full turns.
**arg z is the whole spiral staircase of angles θ + 2πk**; **Arg z is the one step we agree to
call home**. That single ambiguity explains roots (dividing the angle by n spreads the 2πk copies
into n distinct points), branches and branch cuts (choosing a step continuously), why z ↦ zⁿ opens
sectors like a fan, and why the principal root jumps across the negative real axis.

And it runs all the way into calculus: multiplication by a complex number is a spin-and-stretch,
so being complex-differentiable means *locally, f is a spin-and-stretch*. The Cauchy–Riemann
equations are exactly the statement that f's local linear map has the shape [[a, −b], [b, a]].
conj z, Re z and |z|² fail because they flip or squash instead.

## 6. Non-goals

- No accounts, servers, or network calls. The site is static and works offline.
- No grading of handwritten work. Answers are checked numerically where a numeric check makes sense.
