# Reframe B — The equator

A complex number is a spiral on one sphere. The unit circle is the equator of that sphere. Inside it, the spiral falls to 0. Outside it, the spiral climbs to ∞. On it, the spiral only turns. Test 1 is how to read a point of this sphere. Test 2 is what happens when you follow the spiral again.

The wide review’s sentence — a point has two addresses and a function moves the plane; the colour of a start is the fate of doing that motion again — is the flat chart of this sphere, cut open at the north pole.

## Questions

These are the questions the pitch is answering.

1. A number on this site is asked to do three jobs at once: name a place, name a slide (add it), and name a spin-and-stretch (multiply by it). Which job is the plane actually drawn for, and which jobs are borrowing it?

2. The open unit disk is the answer to the power sequence that dies, the geometric series, the test |f′(z₀)| < 1, and the interior of the filled set of z². Are those four disks, or one disk worn four ways?

3. What depends on what? Disks define nearness. Nearness defines limits of functions and limits of sequences. The derivative says a holomorphic motion is locally multiplication by one number. The chain rule says an iterate multiplies those numbers. Everything after Test 1 is that product, repeated. Is the derivative the pixel of the fractal, or a tool that happens to be used inside Newton’s formula?

4. The power sequence λⁿ and the squaring orbit z, z², z⁴, … are different motions. For λ = (1+i)/√2 they have different futures: the powers cycle the eighth roots forever, and the squaring orbit falls onto 1. The site’s spine puts them in one sentence. Where, geometrically, do those two futures live, and where do they part?

5. Domain colour, Julia colour, and Newton colour all paint the plane. Is colour always the name of where a trail ends? If it is, what is domain colouring — the trail after one step — and why does Newton need three colours where z² seems to need two?

6. The staircase seam, the branch cut, and the real line that traps Newton’s method for z²+1 are the same ray in the picture. Which of those is a choice of coordinate, and which is forced by the map?

7. Section 3.3 hangs off Cauchy–Riemann, and the wide review is right that a Laplacian is the wrong last idea. Can one space hold harmonic functions without pretending they are a fate?

8. What would a student have to hold in one hand so that Test 1 and Test 2 are the same object?

## The pitch

Hold the Riemann sphere the reciprocal station already builds. In this repo’s stereographic projection, Z = (|z|² − 1)/(|z|² + 1): the south pole is 0, the north pole is ∞, and the equator is the unit circle. The reciprocal page uses that equator as one mirror in the factorization of 1/z. It is the room the rest of the syllabus is standing in.

A point of the sphere has latitude and longitude. Latitude is log|z|, signed so the southern hemisphere is |z| < 1. Longitude is arg z. The two addresses are the two charts of this one surface. The plane chart (x, y) is good at the south pole and never reaches the north pole, which is why infinity had to be given a place. The polar chart is longitude and latitude, good away from the poles, and it collapses at the south pole, which is why arg 0 is undefined. Each chart fails at one pole. The sphere is the surface on which both failures are ordinary points.

Longitude is not a function on the sphere. Unroll it and you get the staircase. Arg z is one turn of that unroll, cut along a meridian. The seam is a date line, a choice of where longitude jumps. A branch cut is the same choice, made so a root or a log can be a function. The Riemann surface the branches station draws is that unroll wound back around the axis.

Multiplication is the motion this sphere was built for. Multiplying by r > 0 walks a meridian. Multiplying by e^{iθ} walks a parallel. Multiplying by a general λ walks a logarithmic spiral, which sits on the sphere as a loxodrome: a path of constant bearing from one pole toward the other. Powers repeat that spiral. Roots divide it, and there are n of them because longitude is a circle. Addition does not become a spiral. A slide stays in the plane chart. The course is these two motions and no others: a spiral on the sphere, a slide in the chart. az + b is one of each. z² + c is one of each.

The derivative is the sentence that every holomorphic map is locally one of those spirals. f′(z₀) is a point of a second copy of the same sphere, the multiplier sphere. Cauchy–Riemann says the local linear map has to be that point: a spiral, with no meridian-mirror. The conjugate is the mirror. It is continuous and it is nowhere a point of the multiplier sphere. The microscope on the derivative page — a small square spun and stretched — is multiplication by that point, drawn in the chart.

Do it again and the chain rule multiplies the multipliers. Along an orbit z₀, z₁, z₂, …,

(f∘ⁿ)′(z₀) = f′(z₀) f′(z₁) ⋯ f′(zₙ₋₁).

That product is itself a point of the multiplier sphere. For a pure multiplication f(w) = λw the product is λⁿ, the same trail as the places. Place and multiplier are one point, which is why this is the motion the screen should open on. For a fixed point the product is λⁿ with λ = f′(z₀), so the fixed point attracts when its multiplier lies in the southern hemisphere. That is Definition 4.2.18 and Theorem 4.2.20, read on this sphere. For a simple root, Newton’s map is built so the multiplier is 0, the south pole, and the trail collapses there.

The equator is where the two fates stop agreeing. Take f(z) = z². The place-trail of a start λ goes to the south pole when |λ| < 1, to the north pole when |λ| > 1, and stays on the equator when |λ| = 1, where the motion is angle doubling. The multiplier product is 2ⁿ λ^{2ⁿ − 1}. Its modulus falls to the south pole only for |λ| < 1. On the equator it runs north, like 2ⁿ, while the place refuses to leave. The closed southern hemisphere is the filled set K₀. The equator is its boundary, the Julia set. The derivative explodes exactly on that boundary, which is why the colour can change under a nudge there and nowhere else. “Boundary” here is the sets station’s word: every chart-disk centered on the equator meets both hemispheres.

The same split is the sequence station. The power trail λⁿ falls south, runs north, or winds on the equator. On the equator a rational turn cycles, so the list is bounded and has no limit: the converse of “convergent implies bounded,” acted out by the eighth roots. Drag λ to (1+i)/√2 and the two trails, which shared a fate off the equator, show different futures on it. The powers visit all eight roots forever. The squaring orbit goes (1+i)/√2 → i → −1 → 1 and stays at 1. One number, two motions, both on the belt. The spine was right to name them together and the pages were right to keep them apart. The sphere is where a student can see both.

Series are slides, so they live in the chart, and the test that governs them is still this equator. The geometric series multiplies its remainder by z at each step. The remainder falls south precisely on the open southern hemisphere, and the sum is 1/(1−z). A power series has some parallel |z − c| = R as its wall. Scaling, which is a walk along a meridian, carries that parallel onto the equator. Convergence is a southern cap. The geometric series is the cap whose wall happens to be the equator itself. Terms going to 0 is a different trail from the partial sums: the terms are walking toward the south pole, and the partial sums are a walk of slides that may still wander toward the north. Necessary, and the sphere keeps the two trails from looking like one.

The cardioid is a photograph of the southern hemisphere. For z² + c the multiplier of a fixed point is a λ with c = λ/2 − λ²/4. As λ ranges over the open southern hemisphere, c fills the main cardioid. “|f′| < 1 is a cardioid” and “|z| < 1 is a disk” are one region, before and after that map. The set of c the seeds page refuses to draw is the larger object this photograph sits inside: those slides c for which the critical place — the place where the multiplier is the south pole, f′(z) = 2z = 0 — has a trail that never reaches the north pole.

Newton does not fit in two poles, and the pitch should not pretend it does. Each simple root is a place where the multiplier has been manufactured to be the south pole, so each root is a finite attractor with the same local spiral as 0 under z². The colour of a start is which of those attractors the place-trail approaches. The sphere still holds the painting: basins on the chart, compactified so escape would be the north pole. For these polynomials the north pole is repelling, and the colours a student sees are finite attractors. z² looked like two colours because one attractor was the south pole and the other was the north pole. A cubic has three finite attractors. The hemisphere is the special case, not the general one.

Harmonic functions stay in the chart. Analyticity says the local map is a multiplication; the Laplacian of the chart coordinates u and v vanishes because of that, off the singularities. There is no pole and no equator in the statement. The stop pins to Cauchy–Riemann as a shadow on (x, y), which is why it can sit off the trail the way the wide review asked.

So the thing a student holds is one belted sphere, plus the flat chart beside it for slides. Test 1’s three threads are the chart, the longitude, and the local spiral. Test 2’s three threads are the fate of repeating the spiral, the spiral-then-slide of z² + c, and which attractor a manufactured south pole captures. One object, two readings: where the point is, and which way the spiral goes if you follow it.

## The screen and the one gesture

One page. Working title: The equator.

The sentence at the top is the pitch’s first sentence, in the display face, the way Test 2 home now leads with its thesis.

The screen is two views of one point, stacked on a phone and side by side when the window is wide.

- The sphere, already implemented as `riemannSphere` and the reciprocal station’s view. Equator bright. South pole marked 0. North pole marked ∞. One meridian, the negative real axis, marked as the seam. Southern hemisphere washed blue, northern washed orange, using the picture colours the site already has. Blue stays and falls south. Orange leaves and runs north.
- The plane chart under the same drag the addresses station already uses. Unit circle drawn, because that circle is the equator. Drop lines for the Cartesian address. Ray and arc for the polar address. The seam drawn with the existing seam stroke.

The one gesture is dragging the green point in the chart. The sphere follows. Green stays the start, as in the colour key. Turning the sphere with the existing orbit control is for looking, the way the reciprocal page already lets you turn it. It does not change the point.

From that one point λ the page computes three trails, all samples of motions the site already teaches:

1. The power trail 1, λ, λ², λ³, … on the chart and on the sphere. This is the point used as a multiplier. Inside, it falls to the south pole. Outside, it climbs to the north pole. On the equator, a rational turn cycles and the readout names the roots.
2. The squaring trail λ, λ², λ⁴, λ⁸, … drawn thinner, labeled “squares,” so it cannot be mistaken for the power trail. Off the equator the two trails share a fate and differ in speed. On the equator they split, and the fate line says both sentences: the powers cycle or wind; the squares double the longitude.
3. The multiplier product of the squaring trail, a single extra point in a small copy of the unit disk. For squaring it is 2ⁿ λ^{2ⁿ − 1}. It falls south only inside the equator, and it runs north on the equator, where the place-trail stays. That small disk is how |f′| < 1 and |z| < 1 stay different numbers.

The fate line under the picture is one sentence that changes with the hemisphere, coloured blue or orange, plus a third clause on the equator. On the equator the clause uses purple for the cycling powers, borrowing the site’s third picture colour for the third fate, the one that neither falls south nor runs north. The line should say that purple here is the cycle, so it does not silently become the Newton root.

Two insets, both slaves of the same drag:

- A small square and its image under multiplication by λ. The derivative microscope, always on. A static ghost of the conjugated square sits beside it, unlabeled by any new colour, with the words “the mirror the drag never makes.” That is Cauchy–Riemann without a control.
- The main cardioid, static, with a point at c = λ/2 − λ²/4 that tracks λ. While λ is inside the equator, c is inside the cardioid and the inset says the fixed point attracts. Drag λ onto the equator and c hits the boundary. This is the seeds page’s cardioid, drawn as the photograph of the hemisphere the finger is in.

The staircase strip is the longitude readout, the existing widget. Dragging across the seam jumps Arg and the strip shows the jump. That is the staircase station and the branch cut as one meridian.

No second live gesture for c, and no live Julia texture. Still pictures, generated from the fractal renderer the site has, sit in a row under the sphere: the hemisphere at c = 0, the same painting at c = −0.75 and at c = i, and Newton’s three basins for z³ − 1. The caption is the structural one. At c = 0 the blue set is the closed southern hemisphere and the edge is the equator. A slide c moves the edge off the equator. Newton’s colours are finite attractors, each with multiplier 0. The stills are the same sphere with the belt no longer round.

Chips jump, as they do everywhere else on the site. They are not the gesture. A chip can drop λ on 0, on 1, on −1, on (1+i)/√2, on 1/2 + i/4. Each jump lands the finger on a stop the student has already seen.

## Where every stop lands

Home is shared, so it is listed once. The grouping is the new map: southern hemisphere, equator, northern hemisphere, seam, south pole, and the plane chart for everything that is a slide or a coordinate computation.

### Southern hemisphere, |λ| < 1

- **sequence.** (1/2 + i/4)ⁿ walks the power trail into the south pole and settles. A convergent sequence is a trail that approaches one point off the north pole, so it is bounded.
- **powers.** zⁿ for a fixed base inside the equator raises the latitude (in log|z|) by n and repeats. The trail dies at 0.
- **disk.** K₀ is the closed southern hemisphere. The open hemisphere is where both the place-trail and the multiplier product fall south.
- **geometric.** The remainder is multiplied by z. It falls south exactly here, and the sum is 1/(1−z). Theorem 4.3.1 is this cap.
- **powerseries.** A general radius is a southern cap bounded by some parallel. Meridian scaling carries that parallel to the equator. Inside the cap the series settles; the geometric series is the cap cut at the equator.
- **seeds.** |f′(z₀)| < 1 means the multiplier sits in this hemisphere. The cardioid inset is this hemisphere after c = λ/2 − λ²/4. The set of c with the orbit of 0 bounded is the larger region that inset sits in. The page states it, as the seeds station does, and the stills do not pretend to draw Mandelbrot.
- **derivative.** The microscope inset is this hemisphere whenever the square shrinks. |f′| < 1 is the stretch factor of the local spiral, read as latitude on the multiplier sphere.

### Equator, |λ| = 1

- **roots.** The n-th roots of a point on the equator lie on the equator, equally spaced in longitude. The eighth roots are what the power trail does at angle π/4.
- **sequence**, again, for the other example. ((1+i)/√2)ⁿ cycles those roots. Bounded, no limit.
- **disk** and **julia**, the edge. The equator is the Julia set of z², angle doubling. The squaring trail stays on the belt while the multiplier product runs north. For c ≠ 0 the stills show the edge leaving the belt; the definition, K_c as the starts whose trails stay off the north pole, does not change.
- **zero.** Connectedness of that edge is decided by the trail of the critical place. At c = 0 that place is the south pole and the edge is this equator, in one piece.
- **staircase.** Longitude, unrolled. The cycle around the equator is a walk around the belt; the strip records the names.
- **powerseries**, the wall. On the circle of convergence the series can do anything. The equator is that wall after scaling.

### Northern hemisphere, |λ| > 1

- **sequence** and **powers.** The power trail climbs to the north pole. The terms do not settle.
- **series.** If the general term’s trail does not go to the south pole, the series cannot settle. If the partial sums’ trail runs north, the series diverges. The two trails are drawn as different objects in the caption for this stop: terms versus slides.
- **disk** and **julia**, the orange set. Starts here have place-trails that reach the north pole. Orange is escape, the picture colour already in the key.
- **geometric** and **powerseries**, outside the cap. The remainder grows. The series diverges.
- **reciprocal**, half of it. 1/z reflects through the equator and then mirrors, so this hemisphere trades places with the southern one, and the north pole trades with the south pole. Escape and collapse are one reflection apart.

### The seam, and the real great circle

- **staircase**, the jump. Arg changes name when the drag crosses the negative real meridian.
- **principal-root.** The home-step root is the spiral divided, using one interval of longitude. It jumps when the input crosses this meridian.
- **branches.** A cut is a chosen meridian. The surface already drawn at that station is the longitude unwind. The seam on this page is the cut, seen from the sphere the cut was taken from.
- **half.** Pinned on the whole real great circle, both meridians, and not on the seam alone. For z² + 1, Newton’s map preserves the real axis, so a trail that starts there stays there and never reaches ±i. That invariance is the coefficients, not a choice of date line. The landing says so on the page, in one sentence, so the shared picture does not become a shared definition.

### The south pole

- **addresses**, at 0. The polar chart fails: longitude is undefined. The plane chart is healthiest here.
- **zero**, the critical place of z² + c. The multiplier 2z is the south pole exactly here. For c = 0 the critical trail never leaves. For other c the orbit of this place is the trail the seeds page talks about.
- **newton-step** and **newton.** At a simple root the multiplier of N is 0. Five steps from 1/4 + i/4 to i, for z² + 1, are a short place-trail into a root whose multiplier is this pole. Dragging a root on the existing Newton page moves where those poles sit in the chart. The colour is which one the trail reaches. Three roots, three colours, one local reason.

### The north pole

- **reciprocal.** ∞ is a place. A line in the chart is a circle through this pole.
- **julia**, orange, in the limit. “Escaped” means the place-trail arrived here.
- **sequence**, unbounded. A trail that reaches this pole has left every chart-disk. Bounded means the spherical closure misses this pole.

### The plane chart, beside the sphere

These stops are slides, paths, or coordinate computations. They use the sphere as the place they are a chart of, and the algebra stays flat.

- **home.** The switch becomes this page. The old story map remains reachable. This sphere is the map that replaces the two lists, with the stops pinned to the regions above.
- **addresses.** Both addresses, live, on the chart, while the sphere shows which chart is about to fail.
- **arithmetic.** Addition and subtraction are slides in the chart. Multiplication and division are the spiral. Conjugation is the meridian mirror, the ghost in the microscope inset. 1/z is the equatorial reflection followed by that mirror.
- **distance.** |z| is the radius of a parallel. |z₁ − z₂| and the triangle inequality are the chart’s Euclidean geometry. Circles centered at 0 are parallels. Circles centered elsewhere are ordinary chart circles, and only |z| = 1 is the equator.
- **curves.** A parameterized path on the sphere. Time is the parameter of the trail. One step of a curve is an orbit of length one.
- **sets.** The ε-disk is the chart’s definition of interior, exterior, and boundary. Open, closed, bounded, connected, and domain are that definition, said about sets. Bounded is “misses the north pole.” The equator is a boundary in this exact sense, and so is a Julia set: the boundary of the set of starts whose trails stay off the north pole.
- **mappings.** A function is a motion of the sphere, looked at in the chart as a motion of the plane. u + iv is the chart of the image.
- **linear.** az + b is the spiral of a, then the slide of b. The three stages the station already has are those two motions in order.
- **powermap.** zⁿ carries meridians to meridians and parallels to parallels, opening a gore of longitude by n. A Cartesian grid is the chart’s grid, and it bends because it was never the sphere’s grid.
- **limits.** Every path in the chart to a point must give the same value. The multiplier (f(z) − f(z₀))/(z − z₀) has to approach one point of the multiplier sphere no matter the path. A limit at infinity is a path into the north pole.
- **cauchy-riemann.** The two equations are the chart coordinates of one multiplier, λ = uₓ + ivₓ. The microscope ghost is the mirror those equations forbid.
- **lab.** Side by side, morph, domain colour, modulus, sphere, and the 4D graph are views of one motion. Domain colour paints the longitude and the latitude of the image after one step. Basin colour paints the end of the repeated trail. Same sphere, one screw versus all of them.
- **graph4d.** The graph is the set of pairs (place, image) in the chart, a surface in four real dimensions, projected the way the station already projects it. The multiplier is the tilt of that surface, not a fifth coordinate. The Re surface, the Im surface, the modulus landscape, and the Riemann surface stay its shadows.
- **harmonic.** u and v are the chart coordinates of the image. Where f is analytic they are harmonic, because a local multiplication forces the Laplacian to vanish. No fate, no belt. The pin sits under Cauchy–Riemann, off the Next path, marked possible.
- **repeat.** An orbit is a trail of one motion, done again. On this page the power trail and the squaring trail are that sentence with the motion named.
- **newton-step**, the formula. z − p(z)/p′(z) is a slide in the chart. Its multiplier, as a map, is what sits on the sphere, and at a simple root that multiplier is the south pole.
- **problems** and **index.** The drawers stay. Each card gains a region pin — south, equator, north, seam, pole, or chart — beside the thread badge it already has. The pin is the cue that matches this map, the way the thread badge matches the old one.

## What it costs

One new station module and one route. No new library. The page is cheaper to drag than Julia, because a drag iterates a few dozen multiplications and moves polylines. It does not repaint a fractal.

Already in the repo, and used as they are:

- `stereographic` and `riemannSphere` in `js/core/three-view.js`, and the sphere view on the reciprocal station, including the square frame on a phone.
- `createPlane`, `drawCartAddress`, `drawPolarAddress`, `drawCircle`, `drawSeam`.
- `createStaircase`.
- `mul`, `pow`, `Arg`, `abs` in `js/core/complex.js`.
- KaTeX, for two formulas: the chain-rule product, and c = λ/2 − λ²/4.
- `fillJulia` and `fillNewton`, run once, to bake the four stills.

New code is the scene dressing and the three trails: an equator ring, a seam meridian, pole marks, the green marker, two polylines on the sphere via the existing curve helper, the same two polylines in the chart, the small product disk, the microscope square and its ghost, and the cardioid inset. A fate line. A list of the stops that highlights the region the finger is in. At 390px the sphere stacks above the chart, and the page does not scroll sideways.

The stills are images with captions, not a second live fractal. Wiring a Julia texture to the sphere on every drag would repeat the cost the Julia station already pays, and this page does not need it. If a later build puts the filled set on the sphere for a fixed c, it should keep the Julia rule already shipped: the painting holds still while the pointer is down, and a release may play the path. That is optional, and it is not this page’s first version.

The old maps stay. This page is a way to hold them, not a replacement of the stations. A pin deep-links to the station it names, and a chip that names a Test 1 station switches the map the way the same-story chips already do.

## The weakest point

The hemisphere is the true picture for multiplication, for z², and for the geometric series. It is a special case everywhere a slide has bent the belt, and everywhere there are three attractors.

Newton is the strain. The colour in that picture is which finite attractor captured the place-trail. Those attractors share a multiplier, the south pole, and they are different places. Two poles cannot name three roots. A student who has just seen “blue is south, orange is north” will try to read the Newton still that way and will be wrong. The caption has to say the hemisphere was the c = 0 case before the still is allowed on the page. If that sentence is soft, this reframing recreates the gap the current map already has, with a rounder object.

Addition is the other strain. Series, the “+ c,” Newton’s subtraction, the triangle inequality, and az + b’s slide are chart geometry. The sphere makes them look secondary. They are half the course. The chart has to be on the page at the same size as the sphere, with the slides visibly happening there. A beautiful sphere with a small chart tucked under it would teach the wrong course.

The product disk is load-bearing, not decoration. On the equator the place stays and the multiplier product runs north. A page that draws only λ against the unit circle will merge |z| < 1 with |f′(z)| < 1. Those are different points of the same kind of sphere. For z² the single-step multiplier is 2z, which lies inside the unit disk only for |z| < 1/2, while the orbit falls south for |z| < 1. The product along the orbit is what lines up with the hemisphere. Drop the product inset and the page teaches a false merger, which is worse than the two maps the site has now.

The seam and the real-line wall still share a picture. The page can pin them in different places, and a student will see one ray. The sentence that invariance is not a coordinate choice has to be on the half-plane pin itself.

Harmonic functions, ε-δ bookkeeping, and the triangle inequality gain a shelf and almost no new reason. The reframing files them under “chart” and goes on. That is honest, and it means this is not the page on which those three get easier.

Six pictures will crowd the way this site crowds when a station tries to show every view. The sphere, the chart, and the power trail are the page. The squaring trail earns its place on the equator, where the futures differ, and can stay quiet inside and outside. The microscope and the cardioid earn their place because they are how the derivative and the seeds page ride the same drag. Anything beyond that, including a live texture, should wait until those five have been looked at on a phone.
