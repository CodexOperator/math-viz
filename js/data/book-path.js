// The textbook as a path. Titles and printed pages are the table of contents of
// Howell & Mathews, Complex Analysis, 202 Updated Edition (PDF pages 6–7).
// Chapter 4 is the walk that can be marked done. Chapter 5 opens on the
// exponential, and §5.1 is the walk under that picture. Sections 5.2–5.5 stay
// titles. The other chapters are later: a door, when this site already draws
// one, and no new page.

import { sectionHref } from './book.js';

const S31 = 'sec_diff-analytic.html';
const S32 = 'sec_cauchy-riemann.html';
const S33 = 'sec_harmonic-functions.html';
const S41 = 'sec_sequences-series.html';
const S42 = 'sec_julia-mandelbrot.html';
const S43 = 'sec_convergence-theorems.html';
const S44 = 'sec_power-series.html';
const S51 = 'sec_exponential-function.html';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

// Chapters the router will open as their own page. 1–2 and 6–11 stay on the book.
export const OPEN_CHAPTERS = Object.freeze([3, 4, 5]);

export const BOOK_CHAPTERS = deepFreeze([
  {
    n: 1, title: 'Complex Numbers', page: 1, open: false, door: 'addresses',
    sections: [
      { id: '1.1', title: 'The Origin of Complex Numbers', page: 1 },
      { id: '1.2', title: 'The Algebra of Complex Numbers, Part I', page: 9 },
      { id: '1.3', title: 'The Geometry of Complex Numbers, Part I', page: 17 },
      { id: '1.4', title: 'The Geometry of Complex Numbers, Part II', page: 22 },
      { id: '1.5', title: 'The Algebra of Complex Numbers, Part II', page: 29 },
      { id: '1.6', title: 'The Topology of Complex Numbers', page: 35 },
    ],
  },
  {
    n: 2, title: 'Complex Functions', page: 43, open: false, door: 'mappings',
    sections: [
      { id: '2.1', title: 'Functions and Linear Mappings', page: 43 },
      { id: '2.2', title: 'The Mappings w = zⁿ and w = z¹⁄ⁿ', page: 55 },
      { id: '2.3', title: 'Limits and Continuity', page: 60 },
      { id: '2.4', title: 'Branches of Functions', page: 68 },
      { id: '2.5', title: 'The Reciprocal Transformation w = 1/z', page: 72 },
    ],
  },
  {
    n: 3, title: 'Analytic and Harmonic Functions', page: 79, open: true, door: null,
    sections: [
      { id: '3.1', title: 'Differentiable and Analytic Functions', page: 79 },
      { id: '3.2', title: 'The Cauchy-Riemann Equations', page: 85 },
      { id: '3.3', title: 'Harmonic Functions', page: 95 },
    ],
  },
  {
    n: 4, title: 'Sequences, Series, and Fractals', page: 102, open: true, door: null,
    sections: [
      { id: '4.1', title: 'Sequences and Series', page: 102 },
      { id: '4.2', title: 'Julia and Mandelbrot Sets', page: 109 },
      { id: '4.3', title: 'Geometric Series and Convergence Theorems', page: 118 },
      { id: '4.4', title: 'Power Series Functions', page: 123 },
    ],
  },
  {
    n: 5, title: 'Elementary Functions', page: 130, open: true, door: null,
    sections: [
      { id: '5.1', title: 'The Complex Exponential Function', page: 130 },
      { id: '5.2', title: 'The Complex Logarithm', page: 137 },
      { id: '5.3', title: 'Complex Exponents', page: 143 },
      { id: '5.4', title: 'Trigonometric and Hyperbolic Functions', page: 148, stations: ['phasor-current', 'complex-impedance'] },
      { id: '5.5', title: 'Inverse Trigonometric and Hyperbolic Functions', page: 159 },
    ],
  },
  {
    n: 6, title: 'Complex Integration', page: 163, open: false, door: null,
    sections: [
      { id: '6.1', title: 'Complex Integrals', page: 163 },
      { id: '6.2', title: 'Contours and Contour Integrals', page: 167 },
      { id: '6.3', title: 'The Cauchy-Goursat Theorem', page: 181 },
      { id: '6.4', title: 'The Fundamental Theorems of Integration', page: 193 },
      { id: '6.5', title: 'Cauchy Integral Formulas', page: 197 },
      { id: '6.6', title: 'The Theorems of Morera and Liouville', page: 203 },
    ],
  },
  {
    n: 7, title: 'Taylor and Laurent Series', page: 210, open: false, door: null,
    sections: [
      { id: '7.1', title: 'Uniform Convergence', page: 210 },
      { id: '7.2', title: 'Taylor Series Representations', page: 215 },
      { id: '7.3', title: 'Laurent Series Representations', page: 224 },
      { id: '7.4', title: 'Singularities, Zeros, and Poles', page: 232 },
      { id: '7.5', title: 'Applications of Taylor and Laurent Series', page: 239 },
    ],
  },
  {
    n: 8, title: 'Residue Theory', page: 244, open: false, door: null,
    sections: [
      { id: '8.1', title: 'The Residue Theorem', page: 244 },
      { id: '8.2', title: 'Trigonometric Integrals', page: 252 },
      { id: '8.3', title: 'Improper Integrals of Rational Functions', page: 256 },
      { id: '8.4', title: 'Improper Integrals of Trigonometric Functions', page: 259 },
      { id: '8.5', title: 'Indented Contour Integrals', page: 263 },
      { id: '8.6', title: 'Integrands with Branch Points', page: 268 },
      { id: '8.7', title: "The Argument Principle and Rouché's Theorem", page: 273 },
    ],
  },
  {
    n: 9, title: 'Conformal Mapping', page: 280, open: false, door: null,
    sections: [
      { id: '9.1', title: 'Basic Properties of Conformal Mappings', page: 280 },
      { id: '9.2', title: 'Bilinear Transformations', page: 286 },
      { id: '9.3', title: 'Mappings Involving Elementary Functions', page: 293 },
      { id: '9.4', title: 'Mapping by Trigonometric Functions', page: 299 },
    ],
  },
  {
    n: 10, title: 'Applications of Harmonic Functions', page: 305, open: false, door: null,
    sections: [
      { id: '10.1', title: 'Preliminaries', page: 305 },
      { id: '10.2', title: 'The Dirichlet Problem', page: 307 },
      { id: '10.3', title: "Poisson's Integral Formula", page: 316 },
      { id: '10.4', title: 'Two-Dimensional Mathematical Models', page: 320 },
      { id: '10.5', title: 'Steady State Temperatures', page: 322 },
      { id: '10.6', title: 'Two-Dimensional Electrostatics', page: 333 },
      { id: '10.7', title: 'Two-Dimensional Fluid Flow', page: 340 },
      { id: '10.8', title: 'The Joukowski Airfoil', page: 348 },
      { id: '10.9', title: 'The Schwarz-Christoffel Transformation', page: 355 },
      { id: '10.10', title: 'Image of a Fluid Flow', page: 363 },
      { id: '10.11', title: 'Sources and Sinks', page: 366 },
    ],
  },
  {
    n: 11, title: 'Fourier Series and the Laplace Transform', page: 376, open: false, door: null,
    sections: [
      { id: '11.1', title: 'Fourier Series', page: 376 },
      { id: '11.2', title: 'The Dirichlet Problem for the Unit Disk', page: 383 },
      { id: '11.3', title: 'Vibrations in Mechanical Systems', page: 388 },
      { id: '11.4', title: 'The Fourier Transform', page: 393 },
      { id: '11.5', title: 'The Laplace Transform', page: 397 },
      { id: '11.6', title: 'Laplace Transforms of Derivatives and Integrals', page: 403 },
      { id: '11.7', title: 'Shifting Theorems and the Step Function', page: 407 },
      { id: '11.8', title: 'Multiplication and Division by t', page: 410 },
      { id: '11.9', title: 'Inverting the Laplace Transform', page: 413 },
      { id: '11.10', title: 'Convolution', page: 420 },
    ],
  },
]);

// The Chapter 4 walk. Exercise ids are cards already quoted in test2-problems.js.
// The seven homework ids stay 4.1.3, 4.1.13, 4.2.3, 4.2.4, 4.2.5, 4.3.1, 4.3.2.
// 4.4.6 is the one exercise on the last section: a hint, and no worked solution.
export const CHAPTER_4 = deepFreeze({
  n: 4,
  href: sectionHref(S41),
  pin: 'Chapter 4, Sequences, Series, and Fractals, page 102',
  sections: [
    {
      id: '4.1',
      title: 'Sequences and Series',
      page: 102,
      idea: 'A sequence settles when its terms eventually sit in every disk around the limit.',
      read: [
        { pin: 'Definition 4.1, page 103', href: sectionHref(S41, 'Seq_Lim_Def') },
        { pin: 'Theorem 4.1, page 103', href: sectionHref(S41, 'Lim_Zn_Thm') },
      ],
      exercises: ['4.1.3', '4.1.13'],
    },
    {
      id: '4.2',
      title: 'Julia and Mandelbrot Sets',
      page: 109,
      idea: 'The Julia set of $z^2+c$ is one piece exactly when the orbit of $0$ stays bounded.',
      read: [
        { pin: 'Theorem 4.9, page 113', href: sectionHref(S42, 'Kc_Connected') },
      ],
      exercises: ['4.2.3', '4.2.4', '4.2.5'],
    },
    {
      id: '4.3',
      title: 'Geometric Series and Convergence Theorems',
      page: 118,
      idea: 'Inside the unit disk, the geometric series sums to $1/(1-z)$.',
      read: [
        { pin: 'Theorem 4.12, page 118', href: sectionHref(S43, 'Geometric_Series') },
      ],
      exercises: ['4.3.1', '4.3.2'],
    },
    {
      id: '4.4',
      title: 'Power Series Functions',
      page: 123,
      idea: 'A power series converges inside a disk and diverges outside it.',
      read: [
        { pin: 'Theorem 4.15, page 124', href: sectionHref(S44, 'Regions_of_Convergence') },
        { pin: 'Theorem 4.16, page 125', href: sectionHref(S44, 'th15') },
      ],
      exercises: ['4.4.6'],
      hints: {
        '4.4.6': 'Open A Radius, Then a Wall. Theorem 4.15, page 124, says that if the series converges at a point, it converges at every point closer to the centre. This card does not say which of the two points is closer.',
      },
    },
  ],
});

export function bookChapter(n) {
  return BOOK_CHAPTERS.find((ch) => ch.n === n) || null;
}

export function chapter4Section(id) {
  return CHAPTER_4.sections.find((s) => s.id === id) || null;
}

export function chapter4ExerciseIds() {
  return CHAPTER_4.sections.flatMap((s) => s.exercises);
}

// The Chapter 3 mountain. A stage is finished when its id is ticked.
// Pages are the 202 Updated Edition. The HTML anchors are the same statements.
export const CHAPTER_3 = deepFreeze({
  n: 3,
  href: sectionHref('ch_A_and_H_Functions.html'),
  pin: 'Chapter 3, Analytic and Harmonic Functions, page 79',
  sections: [
    {
      id: '3.1',
      title: 'Differentiable and Analytic Functions',
      page: 79,
      why: 'A derivative is one number that turns and stretches every tiny step the same way. Two directions that disagree means there is no derivative.',
      summit: 'A derivative exists only when every tiny step is the same turn and the same stretch.',
      read: [
        { pin: 'Equation (3.1), page 79', href: sectionHref(S31, 'Deriv_Def_1') },
        { pin: 'Definition 3.1, page 81', href: sectionHref(S31, 'Analytic_Def') },
        { pin: 'Definition 3.2, page 81', href: sectionHref(S31, 'Entire_Def') },
        { pin: 'Theorem 3.1, page 82', href: sectionHref(S31, 'Diffl_Implies_Cont') },
        { pin: 'Equations (3.4)–(3.10), page 81', href: sectionHref(S31, 'sec_diff-analytic-14') },
        { pin: 'Theorem 3.2, page 83', href: sectionHref(S31, 'LH_s_rule') },
      ],
      worked: {
        pin: 'Example 3.1, page 79',
        href: sectionHref(S31, 'DerivEx'),
        body: [
          'For $f(z) = z^3$, factor $z^3 - z_0^3 = (z - z_0)(z^2 + zz_0 + z_0^2)$.',
          'The difference quotient is $z^2 + zz_0 + z_0^2$, and the limit is $3z_0^2$. No direction appears, so $f\'(z) = 3z^2$ everywhere and $f$ is entire.',
        ],
      },
      recipes: [
        'Write the difference quotient and let the step go to 0.',
        'Try a horizontal step and a vertical step. If they disagree, there is no derivative.',
        'Analytic means a whole disk of derivatives. Entire means that disk is the plane.',
        'Polynomials, products, and quotients differentiate as in calculus. A quotient fails where the denominator is 0.',
        'Differentiable implies continuous. Continuous does not imply differentiable.',
      ],
      extras: [
        'A singular point is where analyticity stops.',
        'The 0/0 rule: if f and g are analytic, both zero, and g\' is not zero, the limit of f/g is f\'/g\'.',
        'Example 3.6, page 88: the Cauchy-Riemann equations can hold at a point where two paths still disagree.',
      ],
      exercises: ['3.1'],
    },
    {
      id: '3.2',
      title: 'The Cauchy-Riemann Equations',
      page: 85,
      why: 'The Cauchy-Riemann equations test whether the horizontal derivative and the vertical derivative are the same number.',
      summit: 'A nonzero derivative turns and stretches a tiny square into a square with the marked corner still leading, and the Cauchy-Riemann equations are the test that the horizontal and vertical derivatives are that same number.',
      read: [
        { pin: 'Theorem 3.3, page 86', href: sectionHref(S32, 'CR_EQ_Thm') },
        { pin: 'Equation (3.16), page 86', href: sectionHref(S32, 'C-R_EQs') },
        { pin: 'Theorem 3.4, page 89', href: sectionHref(S32, 'Sufficient_Conditions') },
        { pin: 'Theorem 3.5, page 91', href: sectionHref(S32, 'Sufficient_Conditions_Polar') },
        { pin: 'Theorem 3.6, page 92', href: sectionHref(S32, 'Abs_Const_implies_Const') },
        { pin: 'Theorem 3.7, page 93', href: sectionHref(S32, 'Df_0_implies_f_const') },
      ],
      worked: {
        pin: 'Example 3.4, page 87',
        href: sectionHref(S32, 'sec_cauchy-riemann-13'),
        body: [
          '$z^2 = (x^2 - y^2) + i(2xy)$. Then $u_x = 2x = v_y$ and $u_y = -2y = -v_x$.',
          'The partials are continuous everywhere. Theorem 3.4 says $f\'(z) = u_x + iv_x = 2x + 2iy = 2z$.',
        ],
      },
      recipes: [
        'Write $u$ and $v$.',
        'Compute $u_x$, $u_y$, $v_x$, and $v_y$.',
        'Check $u_x = v_y$ and $u_y = -v_x$.',
        'If either fails, $f\'$ does not exist there.',
        'If both hold and the partials are continuous, $f\' = u_x + iv_x$.',
      ],
      exercises: ['3.2'],
    },
    {
      id: '3.3',
      title: 'Harmonic Functions',
      page: 95,
      why: 'You rebuild the missing part by integrating the Cauchy-Riemann equations. Where both gradients are nonzero, the level curves of a conjugate pair cross at a right angle.',
      summit: 'Where both gradients are nonzero, a harmonic conjugate\'s level curves cross at a right angle, and the conjugate itself is recovered by integrating the Cauchy-Riemann equations.',
      read: [
        { pin: "Laplace's equation, page 95", href: sectionHref(S33, 'Laplace_s_Equation') },
        { pin: 'Theorem 3.8, page 95', href: sectionHref(S33, 'Harmonic_Theorem') },
        { pin: 'Harmonic conjugate, page 95', href: sectionHref(S33, 'sec_harmonic-functions-5') },
        { pin: 'Example 3.11, page 96', href: sectionHref(S33, 'sec_harmonic-functions-6') },
        { pin: 'Theorem 3.9, page 97', href: sectionHref(S33, 'Conjugate_Construction') },
      ],
      worked: {
        pin: 'Example 3.11, page 96',
        href: sectionHref(S33, 'sec_harmonic-functions-6'),
        body: [
          'For $u = x^2 - y^2$, $u_{xx} + u_{yy} = 2 - 2 = 0$, so $u$ is harmonic.',
          '$v = 2xy$ satisfies $u_x = 2x = v_y$ and $u_y = -2y = -v_x$. So $v$ is a harmonic conjugate and $f(z) = z^2$.',
        ],
      },
      recipes: [
        'Harmonic means $u_{xx} + u_{yy} = 0$, with the second partials continuous.',
        'The real and imaginary parts of an analytic function are harmonic.',
        'A conjugate $v$ satisfies $u_x = v_y$ and $u_y = -v_x$.',
        'Build $v$ by integrating $u_x$ in $y$, then fix $C(x)$ from $v_x = -u_y$.',
        'Where both gradients are nonzero, the level curves cross at a right angle.',
      ],
      exercises: ['3.3'],
    },
  ],
});

export function chapter3StageIds() {
  return CHAPTER_3.sections.map((s) => s.id);
}

// §5.1 under the exponential picture. The statements are the 202 Updated Edition,
// printed page 135. The HTML anchors are the same exercises. Sections 5.2–5.5
// are titles on the chapter list and are not exercises here.
export const CHAPTER_5 = deepFreeze({
  n: 5,
  href: sectionHref(S51),
  pin: 'Chapter 5, Elementary Functions, page 130',
  sections: [
    {
      id: '5.1',
      title: 'The Complex Exponential Function',
      page: 130,
      idea: 'Identity (5.1), page 132: $e^{z} = e^{x}(\\cos y + i \\sin y)$. The modulus is $e^{x}$ and the angle is $y$.',
      read: [
        { pin: 'Definition 5.1, page 130', href: sectionHref(S51, 'exp_z__Def') },
        { pin: 'Figure 5.2, page 133', href: sectionHref(S51, 'fig_ch-05-02') },
      ],
      exercises: ['5.1.1', '5.1.2'],
    },
  ],
  cards: {
    '5.1.1': {
      pin: '§5.1, Exercise 1, page 135',
      href: sectionHref(S51, 'x5_1_1'),
      statement: 'Using Definition 5.1, explain why $\\exp(0) = e^{0} = 1$.',
      hint: 'Definition 5.1, page 130, is the series for $e^{z}$. The right-hand point of the unit circle is $z = 0$.',
      blank: '$\\exp(0)$ is ',
      answer: '$1$',
    },
    '5.1.2': {
      pin: '§5.1, Exercise 2, page 135',
      href: sectionHref(S51, 'x5_1_2'),
      statement: 'Precisely where should the images of the points $\\pm i\\pi$ be located?',
      hint: 'Figure 5.2, page 133, is the strip $-\\pi < y \\le \\pi$. The two ends are the left-hand point.',
      blank: 'The images of $\\pm i\\pi$ ',
      answer: 'land together at $-1$',
    },
  },
});

export function chapter5ExerciseIds() {
  return CHAPTER_5.sections.flatMap((s) => s.exercises);
}

// The chip the exercise is. The hash is #station-chapter-4-2-5, and the station
// opens that chip and links back to the chapter card.
export const CHAPTER_PICTURE = deepFreeze({
  '4.1.3': { station: 'sequence', token: 'chapter-4-1-3', chip: 'sequence-settle', label: 'The disk in Definition 4.1' },
  '4.1.13': { station: 'sequence', token: 'chapter-4-1-13', chip: 'sequence-settle', label: 'The disk in Definition 4.1' },
  '4.2.3': { station: 'newton-step', token: 'chapter-4-2-3', chip: null, label: 'One Newton Step' },
  '4.2.4': { station: 'disk', token: 'chapter-4-2-4', chip: null, label: 'When c Is 0, a Disk' },
  '4.2.5': { station: 'zero', token: 'chapter-4-2-5', chip: 'zero-c-m2', label: 'The Orbit of 0, c = −2' },
  '4.3.1': { station: 'geometric', token: 'chapter-4-3-1', chip: 'geometric-inside', label: 'Geometric Series' },
  '4.3.2': { station: 'geometric', token: 'chapter-4-3-2', chip: 'geometric-d2-in', label: 'Inside D₂(−i)' },
  '4.4.6': { station: 'powerseries', token: 'chapter-4-4-6', chip: 'powerseries-inside', label: 'A Radius, Then a Wall' },
});

export function pictureHref(id) {
  const pic = CHAPTER_PICTURE[id];
  return pic ? `#${pic.station}-${pic.token}` : null;
}

export function exerciseFromToken(token) {
  const m = /^chapter-(\d+-\d+-\d+)$/.exec(String(token || ''));
  if (!m) return null;
  const id = m[1].replace(/-/g, '.');
  return CHAPTER_PICTURE[id] ? id : null;
}
