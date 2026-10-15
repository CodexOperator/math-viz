// js/data/problems.js: the 29 review problems and 12 syllabus topics of MAT 412 Test 1.
// Pure data. No imports, no DOM, no window, no side effects beyond building lookup tables.
//
// Conventions (see docs/designs/iter-1/i1-data.md):
//  - `statement` and `answer.tex` are TeX. Maths in a statement sits between single $...$ pairs.
//    Everything else in a statement is the handout wording, verbatim.
//  - `answer.text` is printable ASCII only (ASCII minus, "pi", "sqrt(...)"), safe for readouts and tests.
//  - every other string is prose and may use Unicode maths symbols (U+2212 minus, sqrt, pi, theta, ...).
//  - `answer.values` holds the numbers the unit tests assert. Irrational numbers are always written with
//    Math (never a typed decimal), so they are exact to double precision.
//  - `chapter` is the handout chapter (1, 2, 3) of a numbered problem. The seven proofs sit in the handout's
//    own "Proof Examples" block, so they have chapter 0 and kind 'proof'; their syllabus chapter is in `topics`.
//  - Colours never appear here. addressTones() returns CSS custom-property names ('--cart', '--polar').
//  - Every exported object is deep-frozen. Copy before mutating.

const T = String.raw; // keeps TeX backslashes readable
const PI = Math.PI;
const S2 = Math.sqrt(2);
const S3 = Math.sqrt(3);
const c = (re, im) => ({ re, im }); // plain complex number, ARCHITECTURE section 2

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

const SEC = {
  alg: 'Algebraic Properties of Complex Numbers',
  geo: 'Geometric Interpretation',
  pol: 'Polar Representation',
  pow: 'Powers and Roots',
  set: 'Sets of Points in the Complex Plane',
  map: 'Complex Functions and Mappings',
  rootfn: 'Power and Root Functions',
  lim: 'Limits and Continuity',
  branch: 'Multiple-Valued Functions and Branches',
  recip: 'The Reciprocal Transformation and Extended Complex Plane',
  der: 'Derivatives of Complex Functions',
  cr: 'The Cauchy–Riemann Equations',
  proof: 'Proof Examples',
};

const unityRoots5 = Array.from({ length: 5 }, (_, k) =>
  c(Math.cos((2 * PI * k) / 5), Math.sin((2 * PI * k) / 5)));

export const PROBLEMS = deepFreeze([
  // ---------------------------------------------------------------- Chapter 1
  {
    id: '1.1.1', chapter: 1, section: SEC.alg, kind: 'problem',
    statement: T`Let $z_1 = 3 - 2i$ and $z_2 = -1 + 4i$. Compute $z_1z_2$ and $z_1/z_2$ in the form $x + iy$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'C',
    addressWhy: 'Arg(3 − 2i) and Arg(−1 + 4i) are not nice angles, so multiplying out in (x, y) is exact; the polar column is the check.',
    aha: 'Multiply by the definition; the polar column checks the modulus √13·√17 = √221 and Arg(z₁z₂). For division, multiply top and bottom by the mirror of z₂ so the spins cancel.',
    thread: 'T1', topics: ['T1.1'],
    routes: {
      cart: 'Multiply out with i² = −1: (3 − 2i)(−1 + 4i) = −3 + 12i + 2i − 8i² = 5 + 14i. For the quotient, multiply top and bottom by the mirror −1 − 4i: (3 − 2i)(−1 − 4i)/17 = (−11 − 10i)/17.',
      polar: 'Lengths multiply and names of arg add: √13·√17 = √221, and Arg z₁ + Arg z₂ = −0.588 + 1.816 = 1.228 rad, a name for arg(z₁z₂) (here also its Arg, since it is inside (−π, π]). The point 5 + 14i has length √221 and Arg 1.228 rad, so it checks. Division divides lengths and subtracts names, but the decimals are ugly.',
    },
    answer: {
      tex: T`z_1z_2 = 5 + 14i, \qquad \dfrac{z_1}{z_2} = -\dfrac{11}{17} - \dfrac{10}{17}\,i`,
      text: 'z1 z2 = 5 + 14i; z1/z2 = -11/17 - (10/17)i',
      values: { product: c(5, 14), quotient: c(-11 / 17, -10 / 17), productAbs: Math.sqrt(221) },
    },
  },
  {
    id: '1.1.2', chapter: 1, section: SEC.alg, kind: 'problem',
    statement: T`Find $\operatorname{Im}\big(\overline{z_1 - z_2}\big)$ for $z_1 = 3 - 2i$ and $z_2 = -1 + 4i$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'C',
    addressWhy: 'Subtract, mirror, read off the height: all three steps are slides and flips in (x, y).',
    aha: 'Two slides and a mirror: 4 − 6i mirrored is 4 + 6i.',
    thread: 'T1', topics: ['T1.1'],
    routes: {
      cart: 'z₁ − z₂ = (3 + 1) + (−2 − 4)i = 4 − 6i. The conjugate flips the sign of the imaginary part: 4 + 6i. Its imaginary part is 6.',
      polar: 'z₁ − z₂ = 4 − 6i has length √52 ≈ 7.211 and Arg −0.983 rad. The conjugate keeps the length and negates the set arg, so its Arg is +0.983 rad. Height = 7.211 · sin(0.983) = 6.',
    },
    answer: {
      tex: T`\operatorname{Im}\big(\overline{z_1 - z_2}\big) = \operatorname{Im}(4 + 6i) = 6`,
      text: 'Im(conj(z1 - z2)) = Im(4 + 6i) = 6',
      values: { im: 6, difference: c(4, -6) },
    },
  },
  {
    id: '1.2.1', chapter: 1, section: SEC.geo, kind: 'problem',
    statement: T`Sketch the set of points in the complex plane that satisfy $|z - (1 + 2i)| = 3$.`,
    station: 'distance', alsoAt: [],
    address: 'P',
    addressWhy: '"|z − a| = R" says "distance from a is R", which is the definition of a circle, so no algebra is needed.',
    aha: '"Distance from 1 + 2i equals 3" is a circle; no algebra.',
    thread: 'T1', topics: ['T1.2'],
    routes: {
      cart: 'Square both sides: (x − 1)² + (y − 2)² = 9. That is the equation of a circle with centre (1, 2) and radius 3.',
      polar: 'Put the origin at 1 + 2i and write z = (1 + 2i) + 3e^{iφ}, where φ is a name for arg(z − (1 + 2i)), the angle seen from the centre. Every value of φ gives one point at distance 3, and φ from 0 to 2π walks once around the circle.',
    },
    answer: {
      tex: T`\text{circle with centre } 1 + 2i \text{ and radius } 3:\ (x - 1)^2 + (y - 2)^2 = 9`,
      text: 'circle, center 1 + 2i, radius 3: (x - 1)^2 + (y - 2)^2 = 9',
      values: { center: c(1, 2), radius: 3 },
    },
  },
  {
    id: '1.2.2', chapter: 1, section: SEC.geo, kind: 'problem',
    statement: T`Find the distance between $4 + 3i$ and $-1 + i$.`,
    station: 'distance', alsoAt: [],
    address: 'C',
    addressWhy: 'The distance between two points is the length of the slide from one to the other, and a slide is a subtraction in (x, y).',
    aha: 'Distance is the length of one slide: |5 + 2i|.',
    thread: 'T1', topics: ['T1.2'],
    routes: {
      cart: 'Subtract: (4 + 3i) − (−1 + i) = 5 + 2i. The distance is its length √(5² + 2²) = √29 ≈ 5.385.',
      polar: 'The slide 5 + 2i has polar address r = √29 and θ = Arg(5 + 2i) = atan(2/5) ≈ 0.381 rad (21.8°). The distance is r. Arg says which way you walk, and the problem does not ask for it.',
    },
    answer: {
      tex: T`|(4 + 3i) - (-1 + i)| = |5 + 2i| = \sqrt{29} \approx 5.385`,
      text: 'distance = |5 + 2i| = sqrt(29) = 5.385',
      values: { distance: Math.sqrt(29), difference: c(5, 2) },
    },
  },
  {
    id: '1.3.1', chapter: 1, section: SEC.pol, kind: 'problem',
    statement: T`Write $z = -1 + i\sqrt{3}$ in polar form $r(\cos\theta + i\sin\theta)$ and exponential form $re^{i\theta}$. What is $\operatorname{Arg}(z)$?`,
    station: 'addresses', alsoAt: ['staircase'],
    address: 'C->P',
    addressWhy: 'You are given the Cartesian address (−1, √3) and asked for the polar one, so read the length and Arg z off the dot; every other name of the angle is in the set arg z.',
    aha: 'Read the polar address of the dot at (−1, √3): length 2, second quadrant, Arg z = 120°.',
    thread: 'T1', topics: ['T1.3'],
    routes: {
      cart: 'r = √((−1)² + (√3)²) = √4 = 2. Then cos θ = x/r = −1/2 and sin θ = y/r = √3/2, which happens at θ = 2π/3 (the only name of arg z in (−π, π] with that cosine and sine, so θ = Arg z).',
      polar: 'The dot is in the second quadrant, a 60° reference angle from the negative real axis, so θ = π − π/3 = 2π/3 and Arg z = 2π/3. Every other name for the same angle is 2π/3 + 2πk; that whole set is arg z.',
    },
    answer: {
      tex: T`z = 2\left(\cos\tfrac{2\pi}{3} + i\sin\tfrac{2\pi}{3}\right) = 2e^{i2\pi/3}, \quad \operatorname{Arg} z = \tfrac{2\pi}{3}, \quad \arg z = \left\{\tfrac{2\pi}{3} + 2\pi k : k \in \mathbb{Z}\right\}`,
      text: 'z = 2(cos(2pi/3) + i sin(2pi/3)) = 2e^(i 2pi/3); Arg z = 2pi/3; arg z = {2pi/3 + 2 pi k}',
      values: { r: 2, theta: (2 * PI) / 3, Arg: (2 * PI) / 3, z: c(-1, S3) },
    },
  },
  {
    id: '1.3.2', chapter: 1, section: SEC.pol, kind: 'problem',
    statement: T`Use polar form to compute $(\sqrt{3} + i)^{10}$. Express the final answer in Cartesian form $x + iy$.`,
    station: 'powers', alsoAt: [],
    address: 'C->P->C',
    addressWhy: 'Powers are native to polar: one turn and one stretch, repeated ten times. Convert in, do it, convert back.',
    aha: 'The same move (turn π/6, stretch 2) ten times; wrap 10π/6 onto the home step −π/3.',
    thread: 'T1', topics: ['T1.3', 'T1.4'],
    routes: {
      cart: 'Square it: (√3 + i)² = 2 + 2√3 i. Square again: −8 + 8√3 i. Again: −128 − 128√3 i. Finally multiply by 2 + 2√3 i to get 512 − 512√3 i. Four multiplications, and any one of them can slip.',
      polar: '√3 + i has r = 2 and Arg = π/6. The tenth power has r = 2^10 = 1024 and the angle 10π/6 = 5π/3, a name for arg of the power that is not on the home step. Wrapped onto the home step it is Arg = −π/3. So 1024(cos(−π/3) + i sin(−π/3)) = 512 − 512√3 i.',
    },
    answer: {
      tex: T`(\sqrt{3} + i)^{10} = 1024\,e^{i5\pi/3} = 512 - 512\sqrt{3}\,i, \quad \operatorname{Arg} = -\tfrac{\pi}{3}`,
      text: '(sqrt(3) + i)^10 = 1024 e^(i 5pi/3) = 512 - 512 sqrt(3) i (about 512 - 886.81i); Arg = -pi/3',
      values: { result: c(512, -512 * S3), r: 1024, Arg: -PI / 3, base: c(S3, 1), n: 10, rawAngle: (5 * PI) / 3 },
    },
  },
  {
    id: '1.4.1', chapter: 1, section: SEC.pow, kind: 'problem',
    statement: T`Find and sketch the 5th roots of unity.`,
    station: 'roots', alsoAt: [],
    address: 'P',
    addressWhy: 'z⁵ = 1 asks which angle θ (a name for arg z), repeated five times, makes a whole number of turns. That is a polar question with five equally spaced answers.',
    aha: 'Divide the staircase of 1 (arg 1 = {2πk}) by 5: five points 72° apart on the unit circle.',
    thread: 'T2', topics: ['T1.4'],
    routes: {
      cart: 'Cartesian algebra is awkward here: z⁵ − 1 = (z − 1)(z⁴ + z³ + z² + z + 1), and the quartic is hard to solve by hand. The polar picture hands you all five roots at once: the root with Arg 72° has real part cos 72° = (√5 − 1)/4 ≈ 0.309.',
      polar: 'The staircase of 1 is arg 1 = {2πk}. Divide by 5: z = e^{i2πk/5} for k = 0..4, five points 72° apart on the unit circle. k = 5 lands back on k = 0. The angles 6π/5 and 8π/5 are names for the points whose Arg is −4π/5 and −2π/5. Since 5 is prime, every root except 1 is primitive.',
    },
    answer: {
      tex: T`z_k = e^{i2\pi k/5},\ k = 0, 1, 2, 3, 4: \quad 1,\ 0.309 + 0.951i,\ -0.809 + 0.588i,\ -0.809 - 0.588i,\ 0.309 - 0.951i`,
      text: 'z_k = e^(i 2 pi k/5), k = 0..4: 1; 0.309 + 0.951i; -0.809 + 0.588i; -0.809 - 0.588i; 0.309 - 0.951i; all but 1 are primitive',
      values: {
        n: 5, roots: unityRoots5, primitive: [false, true, true, true, true],
        principalArgs: [0, (2 * PI) / 5, (4 * PI) / 5, (-4 * PI) / 5, (-2 * PI) / 5],
      },
    },
  },
  {
    id: '1.4.2', chapter: 1, section: SEC.pow, kind: 'problem',
    statement: T`Find all the 4th roots of $-16$. Express answers in both exponential and Cartesian forms.`,
    station: 'roots', alsoAt: [],
    address: 'P->C',
    addressWhy: 'Find the roots in polar (divide every name of arg(−16) by 4), then convert each to x + iy because the problem asks for both forms.',
    aha: '−16 is 16 at Arg π; divide the staircase arg(−16) by 4: radius 2, angles π/4 + kπ/2.',
    thread: 'T2', topics: ['T1.4'],
    routes: {
      cart: 'z⁴ + 16 = (z² − 4i)(z² + 4i). Solve z² = 4i: z = ±√2(1 + i). Solve z² = −4i: z = ±√2(1 − i). Four roots, found with a trick you have to see.',
      polar: '−16 = 16e^{iπ} with Arg = π, so its staircase is arg(−16) = {π + 2πk}. Divide by 4: radius 16^(1/4) = 2 and names π/4 + kπ/2 for k = 0..3, which are π/4, 3π/4, 5π/4, 7π/4 (as Arg: π/4, 3π/4, −3π/4, −π/4). Four points 90° apart on the circle of radius 2. Convert with 2cos 45° = √2.',
    },
    answer: {
      tex: T`2e^{i\pi/4},\ 2e^{i3\pi/4},\ 2e^{i5\pi/4},\ 2e^{i7\pi/4} = \sqrt{2} + \sqrt{2}\,i,\ -\sqrt{2} + \sqrt{2}\,i,\ -\sqrt{2} - \sqrt{2}\,i,\ \sqrt{2} - \sqrt{2}\,i, \quad \operatorname{Arg}: \tfrac{\pi}{4}, \tfrac{3\pi}{4}, -\tfrac{3\pi}{4}, -\tfrac{\pi}{4}`,
      text: '2e^(i pi/4), 2e^(i 3pi/4), 2e^(i 5pi/4), 2e^(i 7pi/4) = sqrt(2) + sqrt(2)i, -sqrt(2) + sqrt(2)i, -sqrt(2) - sqrt(2)i, sqrt(2) - sqrt(2)i; as Arg values the angles are pi/4, 3pi/4, -3pi/4, -pi/4',
      values: {
        radius: 2,
        angles: [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4],
        principalArgs: [PI / 4, (3 * PI) / 4, (-3 * PI) / 4, -PI / 4],
        roots: [c(S2, S2), c(-S2, S2), c(-S2, -S2), c(S2, -S2)],
      },
    },
  },
  {
    id: '1.4.3', chapter: 1, section: SEC.pow, kind: 'problem',
    statement: T`Use the quadratic formula to solve $z^2 - 4z + 13 = 0$.`,
    station: 'roots', alsoAt: [],
    address: 'C',
    addressWhy: 'The quadratic formula is plain algebra in (x, y); the only polar step hides inside √(−36).',
    aha: '(z − 2)² = −9, so z − 2 is a square root of −9 (±3i), then slide by 2; the roots are a mirror pair.',
    thread: 'T2', topics: ['T1.4'],
    routes: {
      cart: 'z = (4 ± √(16 − 52))/2 = (4 ± √(−36))/2 = (4 ± 6i)/2 = 2 ± 3i. Check: (2 + 3i)² − 4(2 + 3i) + 13 = (−5 + 12i) + (−8 − 12i) + 13 = 0.',
      polar: 'The discriminant −36 = 36e^{iπ} (Arg = π) has principal square root 6e^{iπ/2} = 6i, and its other root is −6i. Completing the square gives (z − 2)² = −9, so z − 2 = ±3i (length 3, Arg ±90°). The roots are mirror images across the real axis because the coefficients are real.',
    },
    answer: {
      tex: T`z = \dfrac{4 \pm \sqrt{-36}}{2} = 2 \pm 3i`,
      text: 'z = (4 +- sqrt(-36))/2 = 2 + 3i or 2 - 3i',
      values: { roots: [c(2, 3), c(2, -3)], completed: { shift: 2, square: -9 } },
    },
  },
  {
    id: '1.5.1', chapter: 1, section: SEC.set, kind: 'problem',
    statement: T`Find a parameterization of the line from $2 + i$ to $-3 - 3i$.`,
    station: 'curves', alsoAt: [],
    address: 'C',
    addressWhy: 'A straight line is start + t × (end − start): a slide that grows with time, which is pure (x, y) bookkeeping.',
    aha: 'A slide that grows with time: start + t·(end − start).',
    thread: 'T3', topics: ['T1.5'],
    routes: {
      cart: 'Direction = end − start = (−3 − 3i) − (2 + i) = −5 − 4i. So z(t) = (2 + i) + t(−5 − 4i) = (2 − 5t) + i(1 − 4t) for 0 ≤ t ≤ 1. At t = 1/2 you are at −1/2 − i, the midpoint.',
      polar: 'The direction −5 − 4i has polar address r = √41 ≈ 6.403 and θ = Arg(−5 − 4i) = atan2(−4, −5) ≈ −2.467 rad (−141.3°): walk at speed 6.403 heading Arg = −141.3°. The points of the line have no tidy polar addresses; the step does.',
    },
    answer: {
      tex: T`z(t) = (2 - 5t) + i(1 - 4t), \quad 0 \le t \le 1`,
      text: 'z(t) = (2 - 5t) + i(1 - 4t), 0 <= t <= 1',
      values: { start: c(2, 1), end: c(-3, -3), direction: c(-5, -4), at: { t: 0.5, z: c(-0.5, -1) } },
    },
  },
  {
    id: '1.5.2', chapter: 1, section: SEC.set, kind: 'problem',
    statement: T`Consider $S = \{ z \in \mathbb{C} : 1 < |z + i| \le 3 \}$. Is $S$ open, closed, or neither? Is $S$ bounded? What are the boundary points of $S$? Is $S$ a domain? Why or why not?`,
    station: 'sets', alsoAt: [],
    address: 'P',
    addressWhy: '"1 < |z + i| ≤ 3" is a condition on the distance from −i, so centre the polar picture at −i and the set is a ring.',
    aha: 'An annulus around −i; the inner circle is left out, the outer circle is kept in; decide each word by looking at a tiny disk.',
    thread: 'T1', topics: ['T1.5'],
    routes: {
      cart: 'S = {1 < x² + (y + 1)² ≤ 9}. That is fine for testing one point, but hard to see as a whole: the picture only appears once you notice the centre (0, −1).',
      polar: 'Centre at −i and write z = −i + ρe^{iφ} (φ names arg(z + i)). Then S is 1 < ρ ≤ 3 with φ free: a ring. Not open: a point with ρ = 3 is in S, but every tiny disk around it leaves S. Not closed: the points with ρ = 1 are limits of S but are not in S. Bounded: S sits inside |z + i| ≤ 3. Boundary: both circles. Connected, but not open, so not a domain; it is a region.',
    },
    answer: {
      tex: T`\text{neither open nor closed; bounded; } \partial S = \{|z + i| = 1\} \cup \{|z + i| = 3\};\ \text{not a domain (not open), but a region}`,
      text: 'neither open nor closed; bounded; boundary = {|z + i| = 1} union {|z + i| = 3}; not a domain (not open); it is a region (connected)',
      values: {
        center: c(0, -1), inner: 1, outer: 3, innerIncluded: false, outerIncluded: true,
        open: false, closed: false, bounded: true, connected: true, domain: false, region: true,
      },
    },
  },
  // ---------------------------------------------------------------- Chapter 2
  {
    id: '2.1.1', chapter: 2, section: SEC.map, kind: 'problem',
    statement: T`Express $f(z) = z^2 + iz$ in the form $u(x, y) + iv(x, y)$ and $u(r, \theta) + iv(r, \theta)$.`,
    station: 'mappings', alsoAt: [],
    address: 'both',
    addressWhy: 'The problem asks for the same function in both addresses: expand in (x, y), and write re^{iθ} (θ a name for arg z) for the polar version.',
    aha: 'Expand (x + iy)² + i(x + iy); or, with θ a name for arg z, r²e^{2iθ} + re^{i(θ + π/2)} because i is a quarter turn.',
    thread: 'T1', topics: ['T2.1'],
    routes: {
      cart: '(x + iy)² + i(x + iy) = x² − y² + 2ixy + ix − y. The real part is u = x² − y² − y and the imaginary part is v = 2xy + x. Check at 1 + i: u = −1, v = 3.',
      polar: 'With z = re^{iθ}, θ a name for arg z: z² = r²(cos 2θ + i sin 2θ), and iz = re^{i(θ + π/2)} = r(−sin θ + i cos θ). So u = r² cos 2θ − r sin θ and v = r² sin 2θ + r cos θ. Check at r = √2, θ = Arg(1 + i) = π/4: u = −1, v = 3.',
    },
    answer: {
      tex: T`u = x^2 - y^2 - y,\ v = 2xy + x; \qquad u = r^2\cos 2\theta - r\sin\theta,\ v = r^2\sin 2\theta + r\cos\theta`,
      text: 'u = x^2 - y^2 - y, v = 2xy + x; u = r^2 cos(2 theta) - r sin(theta), v = r^2 sin(2 theta) + r cos(theta)',
      values: { check: { z: c(1, 1), w: c(-1, 3), u: -1, v: 3 } },
    },
  },
  {
    id: '2.1.2', chapter: 2, section: SEC.map, kind: 'problem',
    statement: T`Determine the image of the vertical line $x = 2$ under $w = z^2$. Describe the resulting curve in the $w$-plane.`,
    station: 'powermap', alsoAt: ['lab'],
    address: 'C',
    addressWhy: 'Put z = 2 + iy (y is the clock), square it, and eliminate y: ordinary (x, y) algebra gives the curve.',
    aha: 'Push the line forward with y as the clock: u = 4 − y², v = 4y; eliminate y.',
    thread: 'T3', topics: ['T2.1'],
    routes: {
      cart: 'z = 2 + iy, so z² = (4 − y²) + 4iy. Then u = 4 − y² and v = 4y. Eliminate y = v/4: u = 4 − v²/16, a parabola with vertex 4 opening left. At y = 1, the point 2 + i goes to 3 + 4i.',
      polar: 'On x = 2, r = 2 sec θ where θ = Arg z is in (−π/2, π/2). Squaring gives length ρ = 4 sec²θ at Arg w = φ = 2θ (inside (−π, π]), which is ρ(1 + cos φ) = 8. A curve ρ = k/(1 + cos φ), with k a constant, is a parabola with its focus at the origin, so the focus is 0.',
    },
    answer: {
      tex: T`u = 4 - \dfrac{v^2}{16}\ \text{(a parabola: vertex } 4,\ \text{opens left, focus } 0\text{)}`,
      text: 'parabola u = 4 - v^2/16 (vertex 4, opens left, focus 0)',
      values: { parabola: { vertex: 4, coeff: -1 / 16, focus: 0 }, sample: { y: 1, z: c(2, 1), w: c(3, 4) } },
    },
  },
  {
    id: '2.1.3', chapter: 2, section: SEC.map, kind: 'problem',
    statement: T`Find the image of the line $x = 2$ under $f(z) = iz - 2i$. What does this linear transformation do to the plane in general?`,
    station: 'linear', alsoAt: ['lab'],
    address: 'both',
    addressWhy: 'The line is easiest in (x, y); what the map does to the whole plane is easiest in polar, because i is just a quarter turn (Arg i = π/2).',
    aha: 'i(z − 2): slide left 2, quarter turn; the line x = 2 lands on the real axis.',
    thread: 'T1', topics: ['T2.1'],
    routes: {
      cart: 'z = 2 + iy gives iz − 2i = i(2 + iy) − 2i = 2i − y − 2i = −y. So w = −y is real, and every real number is hit. The image is the real axis, v = 0.',
      polar: 'iz − 2i = i(z − 2): slide left 2, then multiply by i = e^{iπ/2}, which adds Arg i = 90° to every name of arg z and keeps every length. In general it is a counterclockwise quarter turn about 0 followed by a slide by −2i. Distances between points and angles between segments never change.',
    },
    answer: {
      tex: T`\text{the real axis } (v = 0);\ \text{in general: rotate } 90^\circ \text{ counterclockwise, then slide by } -2i`,
      text: 'the real axis (v = 0); in general: rotate 90 degrees counterclockwise, then slide by -2i',
      values: { imageLine: 'v = 0', rotation: PI / 2, shift: c(0, -2), sample: { z: c(2, 3), w: c(-3, 0) } },
    },
  },
  {
    id: '2.2.1', chapter: 2, section: SEC.rootfn, kind: 'problem',
    statement: T`Find the image of the sector $0 < \arg(z) < \pi/4$ under $w = z^3$.`,
    station: 'powermap', alsoAt: ['lab'],
    address: 'P',
    addressWhy: 'zⁿ multiplies every name of arg z by n, so a condition on arg z becomes a condition on arg w with no algebra.',
    aha: 'zⁿ multiplies every name of arg z by n; the fan opens three times wider.',
    thread: 'T2', topics: ['T2.2'],
    routes: {
      cart: 'z³ = (x³ − 3xy²) + i(3x²y − y³). The edge y = 0 goes to x³, the positive real axis. The edge y = x goes to x³(−2 + 2i), pointing up and left, with Arg 135°. The sector between them is filled in, but you only see that after finding the edges.',
      polar: 'z = re^{iθ} goes to r³e^{i3θ}. Lengths r > 0 reach every length, and the names 0 < θ < π/4 of arg z become the names 0 < 3θ < 3π/4 of arg w (inside (−π, π], so also Arg w). The image is the sector 0 < arg w < 3π/4: three times as wide, and it does not overlap itself because 3π/4 < 2π.',
    },
    answer: {
      tex: T`\text{the sector } 0 < \arg w < \tfrac{3\pi}{4}`,
      text: 'the sector 0 < arg w < 3pi/4',
      values: { sector: { from: 0, to: (3 * PI) / 4 }, n: 3 },
    },
  },
  {
    id: '2.2.2', chapter: 2, section: SEC.rootfn, kind: 'problem',
    statement: T`Compute the principal value of the square root of $2i$, i.e. $(2i)^{1/2}$ on the principal branch.`,
    station: 'principal-root', alsoAt: [],
    address: 'P',
    addressWhy: 'Principal roots are defined with Arg: take the square root of the length and halve the home-step angle.',
    aha: '|2i| = 2 and Arg(2i) = π/2; take the square root of the length and halve the angle.',
    thread: 'T2', topics: ['T2.2'],
    routes: {
      cart: 'Solve (a + bi)² = 2i: a² − b² = 0 and 2ab = 2, so a = b and a² = 1. Two solutions: 1 + i and −1 − i. The principal one has positive real part: 1 + i.',
      polar: '2i = 2e^{iπ/2} with Arg = π/2 (the home step). Principal root: √2 · e^{i(π/2)/2} = √2 e^{iπ/4} = √2(cos 45° + i sin 45°) = 1 + i. The other root comes from the next step, π/2 + 2π: √2 e^{i5π/4} = −1 − i.',
    },
    answer: {
      tex: T`(2i)^{1/2} = \sqrt{2}\,e^{i\operatorname{Arg}(2i)/2} = \sqrt{2}\,e^{i\pi/4} = 1 + i`,
      text: '(2i)^(1/2) = sqrt(2) e^(i Arg(2i)/2) = sqrt(2) e^(i pi/4) = 1 + i, using Arg(2i) = pi/2 (the other square root is -1 - i)',
      values: { root: c(1, 1), r: S2, Arg: PI / 4, other: c(-1, -1) },
    },
  },
  {
    id: '2.3.1', chapter: 2, section: SEC.lim, kind: 'problem',
    statement: T`Find $\lim_{z\to 0} \dfrac{x^2 - y^2 + i2xy}{x^2 + y^2}$ as $z \to 0$ along the curve $y = x^2$.`,
    station: 'limits', alsoAt: [],
    address: 'P',
    addressWhy: 'The fraction is z/conj z = e^{2iθ} (θ a name for arg z), which depends only on the direction of approach, so the polar address shows at once that the value changes with the direction.',
    aha: 'The expression is z/conj z = e^{2iθ} (θ a name for arg z): it remembers only the direction; y = x² arrives tangent to the real axis.',
    thread: 'T3', topics: ['T2.3'],
    routes: {
      cart: 'On y = x² the fraction is (x² − x⁴ + 2ix³)/(x² + x⁴) = (1 − x² + 2ix)/(1 + x²). Let x → 0: it tends to 1. (Along the imaginary axis it is −1, so the full limit does not exist.)',
      polar: 'The numerator is z² and the denominator is |z|² = z·conj z, so the fraction is z/conj z = e^{2iθ}, θ a name for arg z: only the direction matters. The curve y = x² arrives at 0 tangent to the real axis (Arg z → 0), so the value tends to e^0 = 1. Along the real axis it is 1; along the positive imaginary axis Arg z = π/2 gives e^{iπ} = −1. Different directions, different values, so the limit at 0 does not exist.',
    },
    answer: {
      tex: T`\lim_{z \to 0} \dfrac{x^2 - y^2 + i2xy}{x^2 + y^2} = 1 \text{ along } y = x^2 \quad \text{(the full limit at } 0 \text{ does not exist)}`,
      text: '1 along y = x^2 (the full limit at 0 does not exist)',
      values: { alongParabola: 1, alongRealAxis: c(1, 0), alongImagAxis: c(-1, 0), exists: false },
    },
  },
  {
    id: '2.4.1', chapter: 2, section: SEC.branch, kind: 'problem',
    statement: T`Find a branch of the cube root of $z$ that is continuous along the negative $x$-axis.`,
    station: 'branches', alsoAt: [],
    address: 'P',
    addressWhy: 'A branch is a choice of window for the names of arg z. That is a statement about polar angles, and the seam of the window is where the value jumps.',
    aha: 'Choose a window of steps whose seam is not the negative real axis.',
    thread: 'T2', topics: ['T2.4'],
    routes: {
      cart: 'In (x, y) the cube root has no short formula: Arg z needs arctan and a case split on the signs of x and y, which is a window in disguise.',
      polar: 'Write z = re^{iθ} with θ the name of arg z in the window 0 < θ < 2π (seam on the positive real axis). Define f(z) = r^(1/3) e^{iθ/3}. The negative real axis is θ = π, in the middle of the window, so f is continuous there: f(−1) = e^{iπ/3} = 1/2 + (√3/2)i. The principal branch uses Arg z in (−π, π] and jumps from e^{iπ/3} to e^{−iπ/3} across that axis.',
    },
    answer: {
      tex: T`f(z) = r^{1/3}e^{i\theta/3}\ \text{with } \theta \in \arg z,\ 0 < \theta < 2\pi\ \text{(cut on the positive real axis)}; \quad f(-1) = e^{i\pi/3} = \tfrac12 + \tfrac{\sqrt{3}}{2}\,i`,
      text: 'f(z) = r^(1/3) e^(i theta/3), with theta the name of arg z chosen in 0 < theta < 2pi (cut on the positive real axis); f(-1) = e^(i pi/3) = 1/2 + (sqrt(3)/2) i',
      values: { seam: 0, window: [0, 2 * PI], atMinusOne: c(0.5, S3 / 2), principalJumps: true },
    },
  },
  {
    id: '2.5.1', chapter: 2, section: SEC.recip, kind: 'problem',
    statement: T`Find the image of the circle $|z - 1| = 1$ under $w = 1/z$.`,
    station: 'reciprocal', alsoAt: ['lab'],
    address: 'P',
    addressWhy: 'On the circle z = 2cos θ e^{iθ} (θ = Arg z), and 1/z just inverts the length and negates arg z, so polar turns the circle into a line in one line of algebra.',
    aha: 'z = 2cos θ e^{iθ} on the circle (θ = Arg z), so 1/z = ½ − (i/2)tan θ; 0 goes to ∞ so the circle must open into a line.',
    thread: 'T1', topics: ['T2.5'],
    routes: {
      cart: 'w = 1/z = (x − iy)/(x² + y²). On the circle x² + y² = 2x, so u = x/(2x) = 1/2 for every point except z = 0, while v = −y/(2x) takes every real value. The image is the vertical line Re w = 1/2. At 1 + i the image is 1/2 − i/2.',
      polar: 'The circle is r = 2cos θ for θ = Arg z in (−π/2, π/2). Under 1/z, length r goes to 1/r and every name θ of arg z goes to the name −θ of arg w: w = e^{−iθ}/(2cos θ) = 1/2 − (i/2)tan θ. The real part is stuck at 1/2 while tan θ sweeps all real numbers. The circle passes through 0, which goes to ∞, so the circle opens into a line.',
    },
    answer: {
      tex: T`\text{the line } \operatorname{Re} w = \tfrac12`,
      text: 'the line Re w = 1/2',
      values: { imageLine: 'Re w = 1/2', re: 0.5, sample: { z: c(1, 1), w: c(0.5, -0.5) } },
    },
  },
  // ---------------------------------------------------------------- Chapter 3
  {
    id: '3.1.1', chapter: 3, section: SEC.der, kind: 'problem',
    statement: T`Use the limit definition of the derivative to show $f(z) = z^2 + z$ is differentiable everywhere and find $f'(z)$.`,
    station: 'derivative', alsoAt: [],
    address: 'C',
    addressWhy: 'Expanding (z + h)² is algebra in z and h; no direction is needed, which is why the answer does not depend on one.',
    aha: 'The quotient is 2z + 1 + Δz, no direction in sight.',
    thread: 'T3', topics: ['T3.1'],
    routes: {
      cart: '(f(z + h) − f(z))/h = ((z + h)² + (z + h) − z² − z)/h = (2zh + h² + h)/h = 2z + 1 + h. Let h → 0 along any path: the limit is 2z + 1. At z = 1 + i, f′ = 3 + 2i.',
      polar: 'Write h = ρe^{iφ}, with φ a name for arg h, the direction of approach. The quotient is 2z + 1 + ρe^{iφ}: a small circle of radius ρ around 2z + 1. As ρ → 0 the circle shrinks to the point 2z + 1 whatever φ is, so every direction agrees and f is differentiable everywhere.',
    },
    answer: {
      tex: T`f'(z) = \lim_{h \to 0} \dfrac{f(z + h) - f(z)}{h} = 2z + 1`,
      text: "f'(z) = 2z + 1, for every z",
      values: { derivativeAt: { z: c(1, 1), fprime: c(3, 2) }, A: '2z + 1', Babs: 0 },
    },
  },
  {
    id: '3.1.2', chapter: 3, section: SEC.der, kind: 'problem',
    statement: T`Let $f(z) = |z|^2$. Show $f$ is differentiable only at $z = 0$, and thus nowhere analytic.`,
    station: 'derivative', alsoAt: [],
    address: 'P',
    addressWhy: 'With h = ρe^{iφ} (φ a name for arg h) the direction of approach is the variable φ, and how the quotient depends on φ is exactly what shows f is not differentiable.',
    aha: 'The quotient tends to conj z + z e^{−2iφ} (φ names arg h): a circle of radius |z|, a point only at 0.',
    thread: 'T3', topics: ['T3.1'],
    routes: {
      cart: 'The quotient is ((z + h)(conj z + conj h) − z conj z)/h = conj z + z·(conj h/h) + conj h. For real h, conj h/h = 1 and the limit is conj z + z = 2x. For imaginary h, conj h/h = −1 and the limit is conj z − z = −2iy. They agree only when 2x = −2iy, that is, x = y = 0.',
      polar: 'With h = ρe^{iφ} (φ a name for arg h), conj h/h = e^{−2iφ}, so the quotient tends to conj z + z e^{−2iφ}. As φ goes round, that traces a circle with centre conj z and radius |z|, which is a single point only when |z| = 0. So f is differentiable only at z = 0, with f′(0) = 0. It is analytic nowhere, because analytic needs a whole disk of differentiable points.',
    },
    answer: {
      tex: T`\text{differentiable only at } z = 0\ (f'(0) = 0);\ \text{nowhere analytic}`,
      text: "differentiable only at z = 0 (f'(0) = 0); nowhere analytic",
      values: {
        differentiableAt: c(0, 0), fprime0: c(0, 0),
        circleRadiusAt: { z: c(1, 1), radius: S2, center: c(1, -1) },
      },
    },
  },
  {
    id: '3.2.1', chapter: 3, section: SEC.cr, kind: 'problem',
    statement: T`Given $f(z) = e^x(\cos y + i\sin y)$, use the Cauchy–Riemann equations to verify $f$ is entire. Then compute $f'(z)$.`,
    station: 'cauchy-riemann', alsoAt: [],
    address: 'C',
    addressWhy: 'u = e^x cos y and v = e^x sin y: each partial derivative is one line in (x, y), and the Cauchy–Riemann equations are stated in (x, y).',
    aha: 'u_x = v_y = e^x cos y, u_y = −v_x = −e^x sin y, continuous everywhere: no mirror part.',
    thread: 'T3', topics: ['T3.2'],
    routes: {
      cart: 'u = e^x cos y and v = e^x sin y. Then u_x = e^x cos y = v_y and u_y = −e^x sin y = −v_x. Both equations hold at every point and the partials are continuous, so f is entire. f′ = u_x + i v_x = e^x cos y + i e^x sin y = f(z).',
      polar: 'Read the output in polar: |f| = e^x, and y is a name for arg f, so the Cartesian address of z becomes the polar address of w. Write log f = ln|f| + iV with V = y, a continuous choice of arg f. Cauchy–Riemann says the same for log f: ∂(ln|f|)/∂x = ∂V/∂y, which is 1 = 1, and ∂(ln|f|)/∂y = −∂V/∂x, which is 0 = 0. So f′ = f, and at 0 it equals 1.',
    },
    answer: {
      tex: T`\text{entire;}\quad f'(z) = e^x\cos y + i\,e^x\sin y = f(z)`,
      text: "entire; f'(z) = e^x cos y + i e^x sin y = f(z)",
      values: { entire: true, fprimeAt0: c(1, 0), check: { z: c(0, PI / 2), w: c(0, 1) } },
    },
  },
  // ---------------------------------------------------------------- Proof Examples
  {
    id: 'P1', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $\overline{z_1}\cdot\overline{z_2} = \overline{z_1z_2}$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'both',
    addressWhy: 'Either works: expand both sides in (x, y), or note that a mirror negates arg z, which is one line in polar.',
    aha: 'Mirror negates names of arg, and −θ₁ − θ₂ = −(θ₁ + θ₂); in C, expand both sides.',
    thread: 'T1', topics: ['T1.1'],
    routes: {
      cart: 'With z₁ = x₁ + iy₁ and z₂ = x₂ + iy₂: conj z₁ · conj z₂ = (x₁ − iy₁)(x₂ − iy₂) = (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁). And z₁z₂ = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁), whose conjugate is the same number. Equal.',
      polar: 'Write z₁ = r₁e^{iθ₁} and z₂ = r₂e^{iθ₂}, with θ₁ a name for arg z₁ and θ₂ a name for arg z₂, so conj z₁ = r₁e^{−iθ₁} and conj z₂ = r₂e^{−iθ₂}. Then conj z₁ · conj z₂ = r₁r₂e^{−i(θ₁ + θ₂)}, which is the conjugate of z₁z₂ = r₁r₂e^{i(θ₁ + θ₂)}. Equal.',
    },
    answer: {
      tex: T`\overline{z_1}\cdot\overline{z_2} = (x_1x_2 - y_1y_2) - i(x_1y_2 + x_2y_1) = \overline{z_1z_2}`,
      text: 'conj(z1) conj(z2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1) = conj(z1 z2)',
      values: { check: { z1: c(3, -2), z2: c(-1, 4), both: c(5, -14) } },
    },
  },
  {
    id: 'P2', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $|z| = \sqrt{z\cdot\overline{z}}$.`,
    station: 'arithmetic', alsoAt: [],
    address: 'P',
    addressWhy: 'z·conj z is a spin followed by an unspin, and in polar the spins cancel and leave only the length squared.',
    aha: 'Spin and unspin cancel: re^{iθ}·re^{−iθ} = r² (θ a name for arg z).',
    thread: 'T1', topics: ['T1.1', 'T1.3'],
    routes: {
      cart: 'z·conj z = (x + iy)(x − iy) = x² − ixy + ixy + y² = x² + y² (the cross terms cancel). So √(z·conj z) = √(x² + y²) = |z|. Example: z = 3 − 2i gives 9 + 4 = 13.',
      polar: 'With θ a name for arg z: z·conj z = re^{iθ}·re^{−iθ} = r²e^0 = r². Since r ≥ 0, √(r²) = r = |z|.',
    },
    answer: {
      tex: T`z\overline{z} = (x + iy)(x - iy) = x^2 + y^2 = |z|^2 \ \Rightarrow\ |z| = \sqrt{z\overline{z}}`,
      text: 'z conj(z) = x^2 + y^2 = |z|^2, so |z| = sqrt(z conj(z)); for z = 3 - 2i that is sqrt(13)',
      values: { check: { z: c(3, -2), zzbar: 13, abs: Math.sqrt(13) } },
    },
  },
  {
    id: 'P3', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Prove that the composition of two linear transformations is a linear transformation.`,
    station: 'linear', alsoAt: [],
    address: 'C',
    addressWhy: 'A linear map is az + b, and composing two of them is substitution, which is plain algebra in a, b, c, d.',
    aha: 'a(cz + d) + b = (ac)z + (ad + b): spins add, stretches multiply.',
    thread: 'T3', topics: ['T2.1'],
    routes: {
      cart: 'Let T₁(z) = az + b and T₂(z) = cz + d with a, c ≠ 0. Then T₁(T₂(z)) = a(cz + d) + b = (ac)z + (ad + b). That has the form Az + B with A = ac ≠ 0 and B = ad + b, so it is linear.',
      polar: 'Write a = |a|e^{iα} and c = |c|e^{iγ}, with α a name for arg a and γ a name for arg c. The coefficient ac = |a||c|e^{i(α + γ)}: the stretches multiply and the names add. The shift ad + b is d spun and stretched by a, then slid by b. Example a = i, c = 1 + i: Arg a + Arg c = π/2 + π/4 = 3π/4, so ac = √2 e^{i3π/4} = −1 + i.',
    },
    answer: {
      tex: T`a(cz + d) + b = (ac)z + (ad + b)`,
      text: 'a(cz + d) + b = (ac) z + (ad + b): linear with coefficient ac and shift ad + b',
      values: {
        check: { a: c(0, 1), b: c(0, -2), c: c(1, 1), d: c(1, 0), coeff: c(-1, 1), shift: c(0, -1) },
      },
    },
  },
  {
    id: 'P4', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that the image of the circle of radius $1$ centered at $0$ under $f(z) = (1 + i)z$ is the circle of radius $\sqrt{2}$ centered at $0$.`,
    station: 'linear', alsoAt: ['lab'],
    address: 'P',
    addressWhy: '1 + i has Arg 45° (the spin) and length √2 (the stretch), so (1 + i)z carries every point of the unit circle to the circle of radius √2.',
    aha: '1 + i = √2e^{iπ/4}: stretch by √2, spin by Arg = 45°; and every point of the big circle is hit.',
    thread: 'T1', topics: ['T2.1'],
    routes: {
      cart: 'w = (1 + i)(x + iy) = (x − y) + i(x + y). Then |w|² = (x − y)² + (x + y)² = 2x² + 2y² = 2 when x² + y² = 1, so |w| = √2. Every w with |w| = √2 comes from z = w/(1 + i), which has |z| = 1, so the whole circle is covered.',
      polar: '1 + i = √2e^{iπ/4}, so Arg(1 + i) = π/4. For z = e^{it}, with t a name for arg z, w = √2e^{i(t + π/4)}: the length is always √2, and the name t + π/4 of arg w goes once around as t does. So the image is the entire circle |w| = √2.',
    },
    answer: {
      tex: T`|(1 + i)z| = |1 + i|\,|z| = \sqrt{2}\cdot 1 = \sqrt{2}`,
      text: '(1 + i) = sqrt(2) e^(i pi/4): w = sqrt(2) e^(i(t + pi/4)) covers the whole circle |w| = sqrt(2)',
      values: { radius: S2, factor: c(1, 1), factorAbs: S2, factorArg: PI / 4 },
    },
  },
  {
    id: 'P5', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $\lim_{z\to 0} \dfrac{\operatorname{Re}(1 + z) - 1}{z}$ does not exist.`,
    station: 'limits', alsoAt: [],
    address: 'P',
    addressWhy: 'With z = re^{iθ} (θ a name for arg z) the fraction depends only on θ, so different directions visibly give different values.',
    aha: 'x/z = cos θ e^{−iθ} (θ a name for arg z) depends on direction: 1 along the real axis, 0 along the imaginary axis.',
    thread: 'T3', topics: ['T2.3'],
    routes: {
      cart: 'Re(1 + z) − 1 = x, so the fraction is x/z. Along the real axis z = x: x/x = 1. Along the imaginary axis z = iy: 0/(iy) = 0. Two paths, two values: the limit does not exist.',
      polar: 'With θ a name for arg z: x/z = r cos θ/(re^{iθ}) = cos θ e^{−iθ} = 1/2 + (1/2)e^{−2iθ}. The size r cancels, so only the direction θ is left. θ = 0 gives 1 and θ = π/2 gives 0; all directions together trace the circle with centre 1/2 and radius 1/2 through 0 and 1.',
    },
    answer: {
      tex: T`\dfrac{\operatorname{Re}(1 + z) - 1}{z} = \dfrac{x}{z} \to \begin{cases} 1 & \text{along the real axis} \\ 0 & \text{along the imaginary axis} \end{cases} \ \Rightarrow\ \text{no limit}`,
      text: 'x/z -> 1 along the real axis and 0 along the imaginary axis, so the limit does not exist',
      values: {
        alongRealAxis: c(1, 0), alongImagAxis: c(0, 0), exists: false,
        directional: { A: c(0.5, 0), B: c(0.5, 0) },
      },
    },
  },
  {
    id: 'P6', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Show that $f(z) = \operatorname{Re}(z)$ is not differentiable.`,
    station: 'derivative', alsoAt: [],
    address: 'both',
    addressWhy: 'Either the Cauchy–Riemann test in (x, y) or the direction picture in polar kills it in one line.',
    aha: 'Same quotient as P5 at every point; or CR: u_x = 1 ≠ 0 = v_y; or: Re is a squash, not a spin-and-stretch.',
    thread: 'T3', topics: ['T3.1'],
    routes: {
      cart: 'The quotient is (Re(z + h) − Re z)/h = Re(h)/h. For real h it is 1; for imaginary h it is 0. Two limits, so there is no derivative at any z. In Cauchy–Riemann form: u = x and v = 0 give u_x = 1 but v_y = 0, so u_x ≠ v_y.',
      polar: 'With h = ρe^{iφ}, φ a name for arg h, the quotient is cos φ e^{−iφ} = 1/2 + (1/2)e^{−2iφ} = A + Be^{−2iφ} with A = B = 1/2: a circle of directions, not a point. Geometrically Re squashes the whole plane flat onto the real axis, and a spin-and-stretch never flattens.',
    },
    answer: {
      tex: T`\dfrac{\operatorname{Re}(z + h) - \operatorname{Re} z}{h} = \dfrac{\operatorname{Re} h}{h} \to 1 \text{ (real } h\text{) but } 0 \text{ (imaginary } h\text{)}`,
      text: '(Re(z + h) - Re z)/h = Re(h)/h is 1 for real h and 0 for imaginary h, so f is differentiable nowhere',
      values: { A: c(0.5, 0), B: c(0.5, 0), differentiable: false },
    },
  },
  {
    id: 'P7', chapter: 0, section: SEC.proof, kind: 'proof',
    statement: T`Suppose $f = u + iv$ is entire and $u(x, y) = c$ (a real constant) everywhere. Use Cauchy–Riemann to prove $f$ is constant.`,
    station: 'cauchy-riemann', alsoAt: [],
    address: 'C',
    addressWhy: 'Cauchy–Riemann is a pair of equations about partial derivatives in (x, y), and with u constant they collapse to zero at once.',
    aha: 'u_x = u_y = 0, so CR forces v_x = v_y = 0, so f′ = 0 and f is constant.',
    thread: 'T3', topics: ['T3.2'],
    routes: {
      cart: 'u ≡ c gives u_x = u_y = 0. Cauchy–Riemann then gives v_y = u_x = 0 and v_x = −u_y = 0. So f′ = u_x + i v_x = 0 everywhere on the plane, which is a domain, and therefore f is constant: f ≡ c + i·(a constant).',
      polar: 'If f′(z₀) = ρe^{iα} were not 0 (α a name for arg f′(z₀)), then near z₀ the map would spin by α and stretch by ρ, sending a small disk onto a small two-dimensional blob. But u ≡ c puts every image on the vertical line Re w = c, and a line cannot hold a blob. So f′ = 0 everywhere and f is constant.',
    },
    answer: {
      tex: T`u \equiv c \Rightarrow u_x = u_y = 0 \Rightarrow v_y = v_x = 0 \Rightarrow f' = u_x + iv_x = 0 \Rightarrow f \text{ is constant}`,
      text: "u = c gives u_x = u_y = 0; CR gives v_y = v_x = 0; so f' = 0 and f is constant",
      values: { fprime: c(0, 0), constant: true },
    },
  },
]);

// ------------------------------------------------------------------ Topics
export const TOPICS = deepFreeze([
  {
    id: 'T1.1', chapter: 1, title: 'Algebraic properties', thread: 'T1',
    summary: 'A complex number is an ordered pair (x, y), written x + iy. Add, subtract, multiply and divide by the definitions, the field laws hold, and the conjugate is the mirror across the real axis.',
    covers: [
      'complex numbers as ordered pairs (x, y) and as x + iy',
      '+, −, ×, ÷',
      'field properties (commutative, associative, distributive, identities, inverses)',
      'Re(z), Im(z)',
      'conjugates and their algebraic properties',
    ],
    stations: ['addresses', 'arithmetic'],
  },
  {
    id: 'T1.2', chapter: 1, title: 'Geometric interpretation', thread: 'T1',
    summary: '|z| is the length of the arrow from 0 to z, and |z₁ − z₂| is the distance between two points. The triangle inequality says one side of a triangle is at most the sum of the other two.',
    covers: [
      'complex numbers as vectors',
      'modulus |z| and its meaning',
      'distance between two complex numbers',
      'triangle inequality |z₁ + z₂| ≤ |z₁| + |z₂| and related inequalities (e.g. lower bounds, ||z₁| − |z₂|| ≤ |z₁ ± z₂|)',
    ],
    stations: ['distance'],
  },
  {
    id: 'T1.3', chapter: 1, title: 'Polar representation', thread: 'T1',
    summary: 'The polar address (r, θ) reaches the same point as (x, y). θ is only defined up to full turns: arg z is the whole set of angles θ + 2πk, and Arg z is the one in (−π, π]. Multiplying multiplies lengths and adds names of arg.',
    covers: [
      'polar coordinates (r, θ), z = r(cos θ + i sin θ)',
      'arg z and the principal argument Arg z',
      'exponential form and Euler’s formula e^{iθ} = cos θ + i sin θ',
      'geometric meaning of multiplication and division in polar/exponential form',
    ],
    stations: ['addresses', 'arithmetic', 'staircase', 'powers'],
  },
  {
    id: 'T1.4', chapter: 1, title: 'Powers and roots', thread: 'T2',
    summary: 'Powers raise the length and multiply every name of arg z by n. To solve zⁿ = c, take the n-th root of the length and divide every step of the staircase of c by n, which gives n points on a circle. The quadratic formula is a square root in disguise.',
    covers: [
      'computing powers',
      'all n-th roots of unity (and primitive roots)',
      'solving zⁿ = c',
      'quadratic formula in ℂ',
    ],
    stations: ['powers', 'roots'],
  },
  {
    id: 'T1.5', chapter: 1, title: 'Sets of points', thread: 'T3',
    summary: 'A curve z(t) is a point moving with time. A set is understood through tiny disks: a point is interior, exterior or on the boundary depending on what the disk around it contains. Open, closed, bounded, connected and domain all follow.',
    covers: [
      'parameterizing curves (smooth, piecewise smooth, closed, simple)',
      'positive/negative orientation of simple closed curves',
      'ε-neighborhoods and punctured disks',
      'interior, exterior and boundary points',
      'open, closed, connected, bounded sets',
      'domains and regions',
    ],
    stations: ['curves', 'sets'],
  },
  {
    id: 'T2.1', chapter: 2, title: 'Complex functions and mappings', thread: 'T1',
    summary: 'w = f(z) sends each point of the z-plane to a point of the w-plane. Write it as u + iv in (x, y) or in (r, θ), where θ is a name for arg z. Translations, rotations and magnifications combine into the linear maps az + b.',
    covers: [
      'w = f(z); domain, range, images of sets',
      'Cartesian form u(x, y) + iv(x, y)',
      'polar form f(re^{iθ}) = u(r, θ) + iv(r, θ)',
      'inverse functions and one-to-one',
      'elementary mappings: translation, rotation, magnification, linear transformations',
    ],
    stations: ['mappings', 'linear', 'powermap', 'lab'],
  },
  {
    id: 'T2.2', chapter: 2, title: 'Power and root functions', thread: 'T2',
    summary: 'w = zⁿ raises the length to the n-th power and multiplies every name of arg z by n, so a sector opens n times wider. The principal root uses Arg: w^(1/n) = |w|^(1/n) e^{i Arg(w)/n}.',
    covers: [
      'w = zⁿ (multiplies the angle by n, raises the modulus to the n-th power)',
      'principal square root z^{1/2} and principal n-th root z^{1/n}',
      'images of regions',
    ],
    stations: ['powermap', 'principal-root', 'lab', 'graph4d'],
  },
  {
    id: 'T2.3', chapter: 2, title: 'Limits and continuity', thread: 'T3',
    summary: 'A limit exists only if every way of approaching the point gives the same value. To show a limit does not exist, find two paths with different values. A limit of f splits into the limits of u and v.',
    covers: [
      'ε–δ definitions for u(x, y) and f(z)',
      'limits via real and imaginary parts',
      'showing a limit does not exist by approaching along different curves',
      'limit laws',
      'continuity',
    ],
    stations: ['limits'],
  },
  {
    id: 'T2.4', chapter: 2, title: 'Multiple-valued functions and branches', thread: 'T2',
    summary: 'An angle has many names, so z^(1/n) and log z have many values. A branch picks one name for every point by choosing a window of angles. The seam of the window is the branch cut, where the value jumps.',
    covers: [
      'single- vs multiple-valued',
      'branches',
      'branch cuts and branch points',
      'where a branch is continuous or discontinuous',
    ],
    stations: ['staircase', 'branches', 'graph4d'],
  },
  {
    id: 'T2.5', chapter: 2, title: 'Reciprocal transformation and extended plane', thread: 'T1',
    summary: 'w = 1/z inverts the length and negates arg z: inversion in the unit circle, then a mirror. It sends lines and circles to lines and circles. The point at infinity becomes an ordinary place on the Riemann sphere.',
    covers: [
      'w = 1/z as inversion followed by reflection',
      'the point at infinity',
      'the Riemann sphere and stereographic projection',
      '1/z maps generalized circles (lines and circles) to generalized circles',
    ],
    stations: ['reciprocal', 'lab', 'graph4d'],
  },
  {
    id: 'T3.1', chapter: 3, title: 'Derivatives', thread: 'T3',
    summary: 'f′(z₀) is the limit of (f(z) − f(z₀))/(z − z₀) taken from every direction at once. Differentiable means that near z₀ the map is a single spin-and-stretch. Differentiable implies continuous, but conj z is continuous and differentiable nowhere.',
    covers: [
      'limit definition f′(z₀) = lim (f(z) − f(z₀))/(z − z₀)',
      'differentiability vs continuity (e.g. conj(z) is continuous everywhere, differentiable nowhere)',
      'analytic, entire, singular points',
      'differentiation rules (constant, power, product, quotient, chain)',
    ],
    stations: ['derivative', 'graph4d'],
  },
  {
    id: 'T3.2', chapter: 3, title: 'Cauchy–Riemann', thread: 'T3',
    summary: 'Take the limit along the horizontal direction, then along the vertical one, and demand they agree: u_x = v_y and u_y = −v_x. With continuous partials these equations are enough, and f′ = u_x + iv_x. They are the "no mirror" condition.',
    covers: [
      'derivation by limits along horizontal and vertical paths',
      'u_x = v_y, u_y = −v_x',
      'CR plus continuous partials ⇒ differentiable/analytic',
      'f′(z) = u_x + iv_x = v_y − iu_y',
      'consequences (an analytic function with constant modulus, or zero derivative, on a domain is constant)',
    ],
    stations: ['cauchy-riemann'],
  },
]);

// ------------------------------------------------------------------ Lookups
const PROBLEM_BY_ID = new Map(PROBLEMS.map((p) => [p.id, p]));
const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));
const PROBLEM_ROUTE = /^(?:\d+-\d+-\d+|P\d+)$/; // what follows "problem-"
const TOPIC_ROUTE = /^T\d+-\d+$/;                // what follows "topic-"
const INDEX_STATION = 'problems';                // the station that lists everything

export function problemById(id) {
  return PROBLEM_BY_ID.get(id) || null;
}

export function topicById(id) {
  return TOPIC_BY_ID.get(id) || null;
}

// Problems a station shows: the ones it owns plus the ones it also lists (registry `problems`).
// 'problems' (the index) gets all 29. Handout order. A fresh array every call.
export function problemsForStation(stationId) {
  if (stationId === INDEX_STATION) return PROBLEMS.slice();
  return PROBLEMS.filter((p) => p.station === stationId || p.alsoAt.includes(stationId));
}

export function topicsForStation(stationId) {
  if (stationId === INDEX_STATION) return TOPICS.slice();
  return TOPICS.filter((t) => t.stations.includes(stationId));
}

export function problemsForTopic(topicId) {
  return PROBLEMS.filter((p) => p.topics.includes(topicId));
}

// '1.4.2' -> 'problem-1-4-2', 'P3' -> 'problem-P3'; null for an id that is not one of the 29.
export function routeFor(problemId) {
  return PROBLEM_BY_ID.has(problemId) ? 'problem-' + problemId.replace(/\./g, '-') : null;
}

// 'problem-1-4-2' -> '1.4.2', 'problem-P3' -> 'P3'; null for anything else (also for unknown ids).
export function idFromRoute(token) {
  if (typeof token !== 'string' || !token.startsWith('problem-')) return null;
  const rest = token.slice('problem-'.length);
  if (!PROBLEM_ROUTE.test(rest)) return null;
  const id = rest.replace(/-/g, '.');
  return PROBLEM_BY_ID.has(id) ? id : null;
}

export function topicRoute(topicId) {
  return TOPIC_BY_ID.has(topicId) ? 'topic-' + topicId.replace(/\./g, '-') : null;
}

export function topicFromRoute(token) {
  if (typeof token !== 'string' || !token.startsWith('topic-')) return null;
  const rest = token.slice('topic-'.length);
  if (!TOPIC_ROUTE.test(rest)) return null;
  const id = rest.replace(/-/g, '.');
  return TOPIC_BY_ID.has(id) ? id : null;
}

// ------------------------------------------------------------------ Display helpers
// A statement alternates prose and maths: 'Find $x$ and $y$.' -> text, math, text, math, text.
export function statementParts(statement) {
  const parts = [];
  if (typeof statement !== 'string') return parts;
  statement.split('$').forEach((chunk, i) => {
    if (chunk !== '') parts.push({ math: i % 2 === 1, text: chunk });
  });
  return parts;
}

export const ADDRESS_CODES = Object.freeze(['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both']);

const ADDRESS_INFO = deepFreeze({
  'C': { label: 'Cartesian', short: 'C', tones: ['--cart'] },
  'P': { label: 'Polar', short: 'P', tones: ['--polar'] },
  'C->P': { label: 'Cartesian, then polar', short: 'C→P', tones: ['--cart', '--polar'] },
  'P->C': { label: 'Polar, then Cartesian', short: 'P→C', tones: ['--polar', '--cart'] },
  'C->P->C': { label: 'Cartesian, polar, then back', short: 'C→P→C', tones: ['--cart', '--polar', '--cart'] },
  'both': { label: 'Either address', short: 'C or P', tones: ['--cart', '--polar'] },
});

// Own keys only, so 'constructor' or 'toString' are unknown codes, not inherited Object members.
function addressInfo(code) {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(ADDRESS_INFO, code) ? ADDRESS_INFO[code] : null;
}

// Human label for an address code ('' for an unknown code). opts is { short: true } or nothing; null, a number or
// any other non-object reads as no options, so a caller never gets a TypeError for passing one.
export function addressLabel(code, opts) {
  const info = addressInfo(code);
  const short = !!(opts && typeof opts === 'object' && opts.short);
  return info ? (short ? info.short : info.label) : '';
}

// CSS custom-property names, in the order the chip should show them ([] for an unknown code).
export function addressTones(code) {
  const info = addressInfo(code);
  return info ? info.tones.slice() : [];
}
