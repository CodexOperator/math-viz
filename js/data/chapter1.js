// Chapter 1 of Howell & Mathews, Complex Analysis, 202 Updated Edition.
// Printed pages are that edition. Links open the HTML edition.
// All six sections are stages on the walk.

import { sectionHref } from './book.js';

const ORIGIN = 'sec_origin.html';
const ALG1 = 'sec_algebra-1.html';
const GEO1 = 'sec_geometry-1.html';
const GEO2 = 'sec_geometry-2.html';
const ALG2 = 'sec_algebra-2.html';
const TOP = 'sec_topology.html';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

const near = (a, b, tol = 0.12) => Math.abs(a - b) <= tol;

export const CHAPTER_1 = deepFreeze({
  n: 1,
  href: sectionHref(ORIGIN),
  pin: 'Chapter 1, Complex Numbers, page 1',
  sections: [
    {
      id: '1.1',
      title: 'The Origin of Complex Numbers',
      page: 1,
      why: 'The cubic $x^3-15x-4=0$ has a real root you can check by hand. Formula (1.3), page 2, writes a root as two cube roots, and the number under the square root is negative. The picture is the quarter turn that $\\sqrt{-1}$ is asking you to allow.',
      summit: 'Two turns. $i^2$ landed on $-1$.',
      idea: 'Equation (1.6), page 3: $(2+\\sqrt{-1})+(2-\\sqrt{-1})=4$, and $4$ satisfies $x^3-15x-4=0$.',
      read: [
        { pin: 'Equation (1.1), the general cubic, page 1', href: sectionHref(ORIGIN, 'Cubic_Equation') },
        { pin: 'Equation (1.3), the depressed-cubic formula, page 2', href: sectionHref(ORIGIN, 'x1_1_3') },
        { pin: 'Equation (1.6), Bombelli’s identity, page 3', href: sectionHref(ORIGIN, 'x1_1_6') },
      ],
      worked: {
        pin: 'Equation (1.6), page 3',
        href: sectionHref(ORIGIN, 'x1_1_6'),
        title: 'Check the root the imaginaries produced',
        body: 'Bombelli reached $(2+\\sqrt{-1})+(2-\\sqrt{-1})$. The square roots of $-1$ are opposites. Add the pair, then substitute that sum into $x^3-15x-4$. The formula passed through $\\sqrt{-1}$ on the way to a number you can see.',
      },
      memory: [
        'This stage is the story. The written work starts at 1.2.',
      ],
      exercises: ['1.1'],
      picture: 'turn',
    },
    {
      id: '1.2',
      title: 'The Algebra of Complex Numbers, Part I',
      page: 9,
      why: 'Every rule you use on $a+bi$ is a rule about ordered pairs. $i$ is the point $(0,1)$, and $i^2=-1$ is what the product rule does to that point.',
      summit: '$i$ is the point $(0,1)$, and the product rule sends $i\\cdot i$ to $-1$.',
      idea: 'Equation (1.7), page 9: $z=(x,y)$. Definition 1.3, page 10, is the product. Page 13: $i=(0,1)$ and $i^2=-1$.',
      read: [
        { pin: 'Equation (1.7), ordered pairs, page 9', href: sectionHref(ALG1) },
        { pin: 'Definition 1.1, addition, page 10', href: sectionHref(ALG1, 'def_addition') },
        { pin: 'Definition 1.2, subtraction, page 10', href: sectionHref(ALG1, 'def_subtraction') },
        { pin: 'Definition 1.3, multiplication, page 10', href: sectionHref(ALG1, 'def_multiplication') },
        { pin: 'Definition 1.4, division, page 11', href: sectionHref(ALG1, 'def_division') },
        { pin: '$i=(0,1)$ and $i^2=-1$, page 13', href: sectionHref(ALG1, 'sec_algebra-1-24') },
        { pin: 'Definitions 1.5–1.7, real part, imaginary part, conjugate, page 14', href: sectionHref(ALG1, 'def_real_part') },
        { pin: 'Theorem 1.1, identities (1.12)–(1.19), page 14', href: sectionHref(ALG1, 'BarReImProperties') },
      ],
      worked: {
        pin: 'Page 13, from Definition 1.3',
        href: sectionHref(ALG1, 'sec_algebra-1-24'),
        title: 'Multiply $(0,1)$ by itself',
        body: 'Definition 1.3 says $(x_1,y_1)(x_2,y_2)=(x_1 x_2-y_1 y_2,\\, x_1 y_2+x_2 y_1)$. Apply that rule to $(0,1)$ and $(0,1)$. Page 13 identifies the resulting pair with a real number, and that real number is what $i^2$ is. Example 1.1, page 10, is addition on a different pair, $(3,7)+(5,-6)$.',
      },
      memory: [
        'Add or subtract coordinate by coordinate. Definitions 1.1 and 1.2.',
        'Multiply by the four-term rule, then replace $i^2$ with $-1$. Definition 1.3.',
        'Divide by multiplying numerator and denominator by the conjugate. Definition 1.4.',
        'Read $\\operatorname{Re}$, $\\operatorname{Im}$, and the conjugate off the pair. Definitions 1.5–1.7.',
        'Powers of $i$ repeat every four: $i$, $-1$, $-i$, $1$.',
      ],
      exercises: ['1.2'],
      picture: 'times',
    },
    {
      id: '1.3',
      title: 'The Geometry of Complex Numbers, Part I',
      page: 17,
      why: 'Once a complex number is a point, $|z|$ is how far that point is from $0$. The triangle inequality is then a sentence about three lengths you can see.',
      summit: 'The modulus is the distance to $0$, and it multiplies when the numbers do.',
      idea: 'Definition 1.8, page 17: $|z|=\\sqrt{x^2+y^2}$. Identity (1.25), page 19: $|z_1 z_2|=|z_1|\\,|z_2|$.',
      read: [
        { pin: 'Figure 1.7, the complex plane, page 17', href: sectionHref(GEO1, 'fig_ch-01-07') },
        { pin: 'Figure 1.8, the sum, page 17', href: sectionHref(GEO1, 'fig_ch-01-08') },
        { pin: 'Definition 1.8, modulus, page 17', href: sectionHref(GEO1, 'ModDef') },
        { pin: 'Identity (1.21), page 17', href: sectionHref(GEO1, 'ReImLEMod') },
        { pin: 'Identity (1.22), $|z|^2=z\\overline{z}$, page 18', href: sectionHref(GEO1, 'ModSq') },
        { pin: 'Theorem 1.2, the triangle inequality, page 18', href: sectionHref(GEO1, 'TriangleIneq') },
        { pin: 'Identities (1.24)–(1.26), page 19', href: sectionHref(GEO1, 'ModProduct') },
      ],
      worked: {
        pin: 'Page 17, and Figure 1.10 on page 18',
        href: sectionHref(GEO1, 'fig_ch-01-10'),
        title: 'The length of $4+3i$',
        body: 'Definition 1.8 writes $|4+3i|$ as $\\sqrt{4^2+3^2}$. The legs are the real part and the imaginary part, and Identity (1.21) says each leg is at most the hypotenuse. Example 1.6, page 20, multiplies the lengths of a different pair, $1+2i$ and $3+2i$.',
      },
      memory: [
        '$|z|=\\sqrt{x^2+y^2}$. That is the distance to $0$. Definition 1.8.',
        'The distance from $z_1$ to $z_2$ is $|z_1-z_2|.$ Page 18.',
        '$|z|^2=z\\overline{z}$. Identity (1.22). Use it when you want to avoid the square root.',
        'Triangle: $|z_1+z_2|\\le |z_1|+|z_2|$. Reverse: $|z_1+z_2|\\ge |z_1|-|z_2|$.',
        'Moduli multiply and divide. Identities (1.25) and (1.26).',
      ],
      exercises: ['1.3'],
      picture: 'modulus',
    },
    {
      id: '1.4',
      title: 'The Geometry of Complex Numbers, Part II',
      page: 22,
      why: 'Multiplication has a direction. The modulus is the length you already have, and Arg is the angle from the positive real axis, kept in $(-\\pi,\\pi]$.',
      summit: 'Polar form is the length times $e^{i\\theta}$. Definition 1.9 allows any argument. The one value in $(-\\pi,\\pi]$ is Arg, Definition 1.11.',
      idea: 'Example 1.7, page 22: $1+i$ has length $\\sqrt{2}$ and Arg $\\pi/4$.',
      read: [
        { pin: 'Definition 1.9, polar representation, page 22', href: sectionHref(GEO2, 'def_polar_rep') },
        { pin: 'Definition 1.10, $\\arg z$, page 23', href: sectionHref(GEO2, 'arg_z') },
        { pin: 'Definition 1.11, $\\operatorname{Arg} z$, page 23', href: sectionHref(GEO2, 'Arg_z') },
        { pin: "Euler's formula, Equation (1.32), page 25", href: sectionHref(GEO2, 'Euler_s_Formula') },
        { pin: 'Theorem 1.3, arguments add, page 26', href: sectionHref(GEO2, 'thm_arg-sum') },
      ],
      worked: {
        pin: 'Example 1.7, page 22',
        href: sectionHref(GEO2, 'sec_geometry-2-6'),
        title: '$1+i$ in polar form',
        body: '$1+i$ sits one unit right and one unit up. Definition 1.8 is the length, Definition 1.11 is the angle in $(-\\pi,\\pi]$, and Definition 1.9 is the polar form. Euler\'s formula, page 25, writes the same point.',
      },
      memory: [
        'Arg $z$ is the one angle in $(-\\pi,\\pi]$. Definition 1.11, page 23. It is undefined at $0$.',
        'Polar form is $r(\\cos\\theta+i\\sin\\theta)$, and Euler writes $re^{i\\theta}$. Definition 1.9, page 22.',
        'An argument of a product is the sum of arguments. Theorem 1.3, page 26.',
        'Wrap that sum back into $(-\\pi,\\pi]$ before you call it Arg.',
        'The sum of the two Args can leave the interval. Exercise 7, page 28.',
      ],
      exercises: ['1.4'],
      picture: 'polar',
    },
    {
      id: '1.5',
      title: 'The Algebra of Complex Numbers, Part II',
      page: 29,
      why: 'A power is the length raised to $n$ and the angle multiplied by $n$. The $n$th roots are $n$ points, equally spaced on a circle.',
      summit: 'De Moivre raises the angle with the power, and the $n$th roots of unity are the $n$ turns of a full circle.',
      idea: 'Equation (1.40), page 30, is De Moivre. Equation (1.43), page 31, is the $n$th roots of unity.',
      read: [
        { pin: "De Moivre's formula, Equation (1.40), page 30", href: sectionHref(ALG2, 'De_Moivre_s_formula') },
        { pin: 'Theorem 1.4, precisely $n$ solutions, not necessarily distinct, page 30', href: sectionHref(ALG2, 'NRoots') },
        { pin: 'Equation (1.43), the $n$th roots of unity, page 31', href: sectionHref(ALG2, 'Roots_of_Unity') },
        { pin: 'Equation (1.45), the $n$th roots of a number, page 32', href: sectionHref(ALG2, 'sec_algebra-2-26-2') },
        { pin: 'Definition 1.12, a primitive $n$th root, page 31', href: sectionHref(ALG2, 'Primitive_nth_Root') },
      ],
      worked: {
        pin: '§1.5, Exercise 2, page 34',
        href: sectionHref(ALG2, 'x1_5_2a'),
        title: '$(\\sqrt{3}+i)^4$ by De Moivre',
        body: 'Exercise 2, page 34, raises $\\sqrt{3}+i$ to the fourth power. Read the length and the argument, then Equation (1.40) multiplies the angle by $4$ and raises the length to the fourth. The practice below uses a different exponent.',
      },
      memory: [
        'De Moivre, Equation (1.40), page 30: $(\\cos\\theta+i\\sin\\theta)^n=\\cos n\\theta+i\\sin n\\theta$. The length becomes $r^n$.',
        'The $n$th roots have length $r^{1/n}$ and angles $(\\theta+2\\pi k)/n$. Equation (1.45), page 32.',
        'The $n$th roots of unity are $e^{i 2\\pi k/n}$. Equation (1.43), page 31.',
        'A quadratic has both square roots of the discriminant. Theorem 1.5, page 33.',
      ],
      exercises: ['1.5'],
      picture: 'roots',
    },
    {
      id: '1.6',
      title: 'The Topology of Complex Numbers',
      page: 35,
      why: 'The unit circle from stage 1.5 is the boundary of $D_1(0).$ Open, closed, and domain are the words the exercises grade for the disk inside that circle and for the regions between circles.',
      summit: 'The open unit disk is a domain. The closed disk is not, because the boundary is not interior.',
      idea: 'Equation (1.50), page 37: $D_\\varepsilon(z_0)=\\{z:\\,|z-z_0|<\\varepsilon\\}$. Exercise 6, page 41: $D_1(0)$ is a domain and the closed disk is not.',
      read: [
        { pin: 'Equation (1.47), a curve, page 35', href: sectionHref(TOP) },
        { pin: 'Equation (1.48), the segment from $z_0$ to $z_1$, page 35', href: sectionHref(TOP, 'sec_topology-3') },
        { pin: 'Equation (1.50), the open disk $D_\\varepsilon(z_0)$, page 37', href: sectionHref(TOP, 'OpenDisk') },
        { pin: 'Equations (1.51) and (1.52), closed and punctured disks, page 37', href: sectionHref(TOP, 'sec_topology-14') },
      ],
      worked: {
        pin: 'Example 1.25, page 38',
        href: sectionHref(TOP, 'TopologyEx'),
        title: 'The open unit disk',
        body: '$S=D_1(0)=\\{z:\\,|z|<1\\}$. Example 1.25 takes a point inside and chooses $\\varepsilon=1-|z_0|$, so a whole disk about that point stays in $S$. The exterior is $|z|>1$ and the boundary is the circle $|z|=1.$',
      },
      memory: [
        'A segment from $z_0$ to $z_1$ is $z(t)=z_0+t(z_1-z_0)$ for $0\\le t\\le 1$. Equation (1.48), page 35.',
        'The open disk is $|z-z_0|<\\varepsilon$. Equation (1.50), page 37. The boundary is not included.',
        'The closed disk is $|z-z_0|\\le\\varepsilon$. Equation (1.51). The punctured disk leaves out the center.',
        'A boundary point has every neighborhood meeting the set and its complement.',
        'A domain is open and connected. Exercise 6, page 41: $D_1(0)$ is one, and the closed disk is not.',
      ],
      exercises: ['1.6'],
      picture: 'disk',
    },
  ],
});

const CITE_HREF = {
  'Equation (1.1)': sectionHref(ORIGIN, 'Cubic_Equation'),
  'Equation (1.3)': sectionHref(ORIGIN, 'x1_1_3'),
  'Equation (1.6)': sectionHref(ORIGIN, 'x1_1_6'),
  'Equation (1.7)': sectionHref(ALG1),
  'Definition 1.1': sectionHref(ALG1, 'def_addition'),
  'Definition 1.2': sectionHref(ALG1, 'def_subtraction'),
  'Definition 1.3': sectionHref(ALG1, 'def_multiplication'),
  'Definition 1.4': sectionHref(ALG1, 'def_division'),
  'Identity $i^2=-1$': sectionHref(ALG1, 'sec_algebra-1-24'),
  'Proof of (P1)': sectionHref(ALG1, 'sec_algebra-1-22'),
  'Definition 1.5': sectionHref(ALG1, 'def_real_part'),
  'Definition 1.6': sectionHref(ALG1, 'def_imaginary_part'),
  'Definition 1.7': sectionHref(ALG1, 'def_conjugate'),
  'Identity (1.12)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.13)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.14)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.15)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.16)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.17)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.18)': sectionHref(ALG1, 'BarReImProperties'),
  'Identity (1.19)': sectionHref(ALG1, 'BarReImProperties'),
  'Definition 1.8': sectionHref(GEO1, 'ModDef'),
  'Identity (1.21)': sectionHref(GEO1, 'ReImLEMod'),
  'Distance formula': sectionHref(GEO1, 'fig_ch-01-09'),
  'Identity (1.22)': sectionHref(GEO1, 'ModSq'),
  'Theorem 1.2': sectionHref(GEO1, 'TriangleIneq'),
  'Identity (1.24)': sectionHref(GEO1, 'ReverseTriangleIneq'),
  'Identity (1.25)': sectionHref(GEO1, 'ModProduct'),
  'Identity (1.26)': sectionHref(GEO1, 'ModQuotient'),
  'Definition 1.9': sectionHref(GEO2, 'def_polar_rep'),
  'Definition 1.11': sectionHref(GEO2, 'Arg_z'),
  '§1.2, Exercise 1(f)': sectionHref(ALG1, 'x1_2_1'),
  '§1.2, Exercise 6': sectionHref(ALG1, 'x1_2_6'),
  '§1.2, Exercise 1(a)': sectionHref(ALG1, 'x1_2_1'),
  '§1.3, Exercise 1(a)': sectionHref(GEO1, 'x1_3_1'),
  '§1.3, Exercise 2(a)': sectionHref(GEO1, 'x1_3_2'),
  '§1.3, Exercise 3(b)': sectionHref(GEO1, 'x1_3_3'),
  '§1.3, Exercise 1(c)': sectionHref(GEO1, 'x1_3_1'),
  'Definition 1.9': sectionHref(GEO2, 'def_polar_rep'),
  'Definition 1.10': sectionHref(GEO2, 'arg_z'),
  'Definition 1.11': sectionHref(GEO2, 'Arg_z'),
  'Theorem 1.3': sectionHref(GEO2, 'thm_arg-sum'),
  'Example 1.7': sectionHref(GEO2, 'sec_geometry-2-6'),
  'Example 1.13': sectionHref(GEO2, 'sec_geometry-2-43'),
  'Definitions 1.1 and 1.2': sectionHref(ALG1, 'def_addition'),
  'Identities (1.25) and (1.26)': sectionHref(GEO1, 'ModProduct'),
  'Equations (1.51) and (1.52)': sectionHref(TOP, 'sec_topology-14'),
  '§1.4, Exercise 7': sectionHref(GEO2, 'x1_4_7'),
  'Equation (1.40)': sectionHref(ALG2, 'De_Moivre_s_formula'),
  'Equation (1.43)': sectionHref(ALG2, 'Roots_of_Unity'),
  'Equation (1.45)': sectionHref(ALG2, 'sec_algebra-2-26-2'),
  'Theorem 1.5': sectionHref(ALG2, 'Quadratic_Formula'),
  '§1.5, Exercise 2': sectionHref(ALG2, 'x1_5_2a'),
  'Equation (1.48)': sectionHref(TOP, 'sec_topology-3'),
  'Equation (1.50)': sectionHref(TOP, 'OpenDisk'),
  'Example 1.25': sectionHref(TOP, 'TopologyEx'),
  'Figure 1.30': sectionHref(TOP, 'fig_ch-01-30'),
  'Bounded set': sectionHref(TOP, 'sec_topology-27'),
  '§1.6, Exercise 6': sectionHref(TOP, 'x1_6_6'),
  '§1.6, Exercise 9': sectionHref(TOP, 'x1_6_9'),
  '§1.6, Exercise 1(a)': sectionHref(TOP, 'x1_6_1'),
};

export function citeHref(ref) {
  return CITE_HREF[ref] || CHAPTER_1.href;
}

export function chapter1Section(id) {
  return CHAPTER_1.sections.find((s) => s.id === id) || null;
}

export function chapter1Walk() {
  return CHAPTER_1.sections.filter((s) => s.exercises.length > 0);
}

export function chapter1StageIds() {
  return chapter1Walk().flatMap((s) => s.exercises);
}

// The sentence under the 1.1 picture. True only when two quarter turns have landed on -1.
export function turnClaim(quarter) {
  const raw = Math.round(Number(quarter) || 0);
  const q = ((raw % 4) + 4) % 4;
  if (q === 2) return { holds: true, quarter: q, text: 'Two turns. $i^2$ landed on $-1$.' };
  if (q === 1) return { holds: false, quarter: q, text: 'One turn. This point is $i$, not $-1$.' };
  if (q === 3) return { holds: false, quarter: q, text: 'Three turns. This point is $-i$, not $-1$.' };
  if (raw > 0) return { holds: false, quarter: q, text: 'Back at $1$.' };
  return { holds: false, quarter: q, text: 'This point is $1$. It has not been turned.' };
}

export function turnPoint(quarter) {
  const q = ((Math.round(quarter) % 4) + 4) % 4;
  if (q === 1) return { re: 0, im: 1 };
  if (q === 2) return { re: -1, im: 0 };
  if (q === 3) return { re: 0, im: -1 };
  return { re: 1, im: 0 };
}

// Purple is z times i. The sentence is true when that product is real.
export function timesIClaim(z) {
  const re = Number(z && z.re);
  const im = Number(z && z.im);
  if (near(re, 0) && near(im, 1)) return { holds: true, text: '$i\\cdot i$ is $-1$. The product sits on the real axis.' };
  if (near(re, 1) && near(im, 0)) return { holds: false, text: '$1\\cdot i$ is $i$. One more turn lands on $-1$.' };
  if (Math.abs(re) <= 0.08) return { holds: true, text: 'Times $i$ landed on the real axis.' };
  return { holds: false, text: 'Times $i$ is a quarter turn. The product is not real.' };
}

// True on the circle of radius 5, and names the book's point when the drag is there.
export function modulusClaim(z) {
  const re = Number(z && z.re);
  const im = Number(z && z.im);
  const r2 = re * re + im * im;
  const lengthFive = Math.abs(r2 - 25) <= 1e-6;
  if (near(re, 4, 1e-6) && near(im, 3, 1e-6)) return { holds: true, text: 'The length is $5.$ This is the book’s $4+3i$.' };
  if (lengthFive) return { holds: true, text: 'The length is $5.$ The point is on the circle through $4+3i$.' };
  return { holds: false, text: 'The length is the distance to $0$. It is not $5.$' };
}

// True only at the book's 1+i, Example 1.7, page 22. A nearby point does not have length √2.
export function polarClaim(z) {
  const re = Number(z && z.re);
  const im = Number(z && z.im);
  if (near(re, 1, 1e-4) && near(im, 1, 1e-4)) {
    return { holds: true, text: 'Length $\\sqrt{2}$, Arg $\\pi/4$. Example 1.7, page 22.' };
  }
  return { holds: false, text: 'Arg is the angle from the positive real axis, in $(-\\pi,\\pi]$. This point is not $1+i$.' };
}

// The fifth roots of unity. Each state names its angle 2πk/5.
// All five points stay on the circle. The spacing sentence holds at k = 0.
// The other states name that root, and they do not deny the spacing.
export function rootClaim(k) {
  const n = ((Math.round(k) % 5) + 5) % 5;
  const angle = `$2\\pi\\cdot ${n}/5$`;
  if (n === 0) {
    return { holds: true, k: n, text: `Angle ${angle}. Five equal turns on this circle, and this one is $1$.` };
  }
  return { holds: false, k: n, text: `Angle ${angle}. Five equal turns on this circle. This root is not $1$.` };
}

export function rootPoint(k) {
  const n = ((Math.round(k) % 5) + 5) % 5;
  const t = (2 * Math.PI * n) / 5;
  return { re: Math.cos(t), im: Math.sin(t) };
}

// inside / boundary / outside, using the same cut as the picture sentence.
export function diskPlace(z) {
  const re = Number(z && z.re);
  const im = Number(z && z.im);
  const r = Math.hypot(re, im);
  if (r < 1 - 1e-4) return 'inside';
  if (r <= 1 + 1e-4) return 'boundary';
  return 'outside';
}

// True only inside the open unit disk. The boundary sentence is the circle itself.
export function diskClaim(z) {
  const re = Number(z && z.re);
  const im = Number(z && z.im);
  const r = Math.hypot(re, im);
  if (r < 1 - 1e-4) return { holds: true, text: 'Inside the open unit disk. Example 1.25, page 38.' };
  if (r <= 1 + 1e-4) return { holds: false, text: 'On the boundary. The open disk does not include $|z|=1.$' };
  return { holds: false, text: 'Outside. This is not the open disk $D_1(0).$' };
}
