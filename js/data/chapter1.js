// Chapter 1 of Howell & Mathews, Complex Analysis, 202 Updated Edition.
// Printed pages are that edition. Links open the HTML edition.
// Stages 1.1–1.3 are the walk. Stages 1.4–1.6 are titles and cites.

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
      why: 'The cubic $x^3-15x-4=0$ has the real root $4$. Formula (1.3) writes that root as a sum of two square roots of negatives. The picture is the turn those square roots are asking you to allow.',
      summit: 'Bombelli’s real $4$ is what is left when a conjugate pair of square roots of $-1$ adds.',
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
        body: 'Bombelli reached $(2+\\sqrt{-1})+(2-\\sqrt{-1})$. The square roots cancel and the sum is $4$. Then $4^3-15\\cdot 4-4=64-60-4=0$, so $4$ really is a root of $x^3-15x-4=0$. The detour was not optional: the formula passed through $\\sqrt{-1}$ on the way to a number you can see.',
      },
      memory: [
        'Depress the cubic with $z=x-a_2/3$. Equation (1.2), page 1.',
        'If the square root in (1.3) is negative, keep the pair. Do not drop it.',
        'A suspected real root is checked by substituting it back into the cubic.',
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
        body: 'Definition 1.3 says $(x_1,y_1)(x_2,y_2)=(x_1 x_2-y_1 y_2,\\, x_1 y_2+x_2 y_1)$. So $(0,1)(0,1)=(0\\cdot 0-1\\cdot 1,\\, 0\\cdot 1+1\\cdot 0)=(-1,0)$. The book identifies $(-1,0)$ with the real number $-1$. That is $i^2=-1$, with $i$ the point one unit above the origin. Example 1.1, page 10, is the same addition on a different pair: $(3,7)+(5,-6)=(8,1)$.',
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
        body: 'Definition 1.8 gives $|4+3i|=\\sqrt{4^2+3^2}=\\sqrt{25}=5$. The legs of the right triangle are $|\\operatorname{Re}(z)|=4$ and $|\\operatorname{Im}(z)|=3$, and Identity (1.21) says each leg is at most the hypotenuse. Example 1.6, page 20, is the same length doing arithmetic: $|1+2i|\\,|3+2i|=\\sqrt{5}\\sqrt{13}=\\sqrt{65}=|z_1 z_2|$.',
      },
      memory: [
        '$|z|=\\sqrt{x^2+y^2}$. That is the distance to $0$. Definition 1.8.',
        'The distance from $z_1$ to $z_2$ is $|z_1-z_2|$. Page 18.',
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
      why: '',
      summit: '',
      idea: '',
      read: [
        { pin: 'Definition 1.9, polar representation, page 22', href: sectionHref(GEO2, 'def_polar_rep') },
        { pin: 'Definition 1.10, $\\arg z$, page 23', href: sectionHref(GEO2, 'arg_z') },
        { pin: 'Definition 1.11, $\\operatorname{Arg} z$, page 23', href: sectionHref(GEO2, 'Arg_z') },
        { pin: "Euler's formula, page 25", href: sectionHref(GEO2, 'Euler_s_Identity') },
        { pin: 'Theorem 1.3, arguments add, page 26', href: sectionHref(GEO2, 'thm_arg-sum') },
      ],
      worked: null,
      memory: [],
      exercises: [],
      picture: null,
    },
    {
      id: '1.5',
      title: 'The Algebra of Complex Numbers, Part II',
      page: 29,
      why: '',
      summit: '',
      idea: '',
      read: [
        { pin: "De Moivre's formula, Equation (1.40), page 30", href: sectionHref(ALG2, 'De_Moivre_s_formula') },
        { pin: 'Theorem 1.4, $n$ roots, page 30', href: sectionHref(ALG2, 'sec_algebra-2-8') },
        { pin: 'Equation (1.43), the $n$th roots of unity, page 31', href: sectionHref(ALG2, 'Roots_of_Unity') },
        { pin: 'Definition 1.12, a primitive $n$th root, page 31', href: sectionHref(ALG2, 'Primitive_nth_Root') },
      ],
      worked: null,
      memory: [],
      exercises: [],
      picture: null,
    },
    {
      id: '1.6',
      title: 'The Topology of Complex Numbers',
      page: 35,
      why: '',
      summit: '',
      idea: '',
      read: [
        { pin: 'Equation (1.47), a curve, page 35', href: sectionHref(TOP) },
        { pin: 'Equation (1.50), the open disk $D_\\varepsilon(z_0)$, page 37', href: sectionHref(TOP, 'OpenDisk') },
        { pin: 'Equations (1.51) and (1.52), closed and punctured disks, page 37', href: sectionHref(TOP, 'sec_topology-14') },
        { pin: 'Equation (1.53), the circle $C_R(z_0)$, page 37', href: sectionHref(TOP, 'fig_ch-01-27') },
      ],
      worked: null,
      memory: [],
      exercises: [],
      picture: null,
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
  '§1.2, Exercise 1(a)': sectionHref(ALG1, 'x1_2_1'),
  '§1.3, Exercise 1(a)': sectionHref(GEO1, 'x1_3_1'),
  '§1.3, Exercise 2(a)': sectionHref(GEO1, 'x1_3_2'),
  '§1.3, Exercise 3(b)': sectionHref(GEO1, 'x1_3_3'),
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
  const q = ((Math.round(quarter) % 4) + 4) % 4;
  if (q === 2) return { holds: true, quarter: q, text: 'Two turns. $i^2$ landed on $-1$.' };
  if (q === 1) return { holds: false, quarter: q, text: 'One turn. This point is $i$, not $-1$.' };
  if (q === 3) return { holds: false, quarter: q, text: 'Three turns. This point is $-i$, not $-1$.' };
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
  const r = Math.hypot(re, im);
  if (near(re, 4) && near(im, 3)) return { holds: true, text: 'The length is $5$. This is the book’s $4+3i$.' };
  if (Math.abs(r - 5) <= 0.12) return { holds: true, text: 'The length is $5$. The point is on the circle through $4+3i$.' };
  return { holds: false, text: 'The length is the distance to $0$. It is not $5$.' };
}
