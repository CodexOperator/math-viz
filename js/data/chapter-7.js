// Chapter 7 of Howell & Mathews, Complex Analysis, 202 Updated Edition.
// Page numbers are the printed book. Links open the HTML edition.

import { sectionHref } from './book.js';

const S71 = 'sec_uniform-convergence.html';
const S72 = 'sec_taylor-series.html';
const S73 = 'sec_laurent-series.html';
const S74 = 'sec_singularities.html';
const S75 = 'sec_taylor-laurent-apps.html';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

export const CHAPTER_7 = deepFreeze({
  n: 7,
  pin: 'Chapter 7, Taylor and Laurent Series, page 210',
  href: sectionHref(S71),
  stages: [
    {
      id: '7.1',
      title: 'Uniform Convergence',
      page: 210,
      stub: false,
      picture: 'uniform',
      why: 'A series can converge at every point of a disk and still refuse to settle at one speed. Integrating term by term needs the stronger promise.',
      observe: 'Drag the green point toward 1 until it leaves the orange band. Press Play and watch it come back.',
      key: 'Blue is the axis. Orange is the band of width ε. Green is the partial sum and the point you drag. Purple is the limit.',
      summit: 'One N works for the whole set.',
      worked: {
        pin: 'Theorem 7.1, page 212',
        href: sectionHref(S71, 'sec_uniform-convergence-11'),
        body: 'Compare with a series of constants. On the disk $|z|\\le 1/2$, each term of the geometric series satisfies $|z^k|\\le (1/2)^k$, and $\\sum (1/2)^k$ converges. Theorem 7.1, page 212, says the geometric series converges uniformly on that disk. The card under this line fills in why one comparison is enough for the whole set.',
      },
      memory: [
        'The negation (7.3), page 211: one $\\varepsilon>0$ such that for every $N$ there is some $n\\ge N$ and some $z$ still outside the band.',
        'On $|z|\\le 1/2$, compare with $M_k=(1/2)^k$.',
        '$-\\mathrm{Log}(1-z)=\\sum_{n=1}^{\\infty} z^n/n$ for $|z|<1$ (Example 7.2, page 214).',
        'M-test: $|u_k(z)|\\le M_k$ on $T$ and $\\sum M_k$ converges.',
        'A power series that converges uniformly on a set may be integrated term by term along a contour in that set (Corollary 7.2, page 213).',
      ],
      read: [
        { pin: 'Definition 7.1, page 211', href: sectionHref(S71, 'sec_uniform-convergence-5') },
        { pin: 'Theorem 7.1, page 212', href: sectionHref(S71, 'sec_uniform-convergence-11') },
        { pin: 'Theorem 7.2, page 212', href: sectionHref(S71, 'Unif_Conv_of_Series') },
        { pin: 'Corollary 7.1, page 213', href: sectionHref(S71, 'Geom_Series_Conv_Unif') },
        { pin: 'Example 7.2, page 214', href: sectionHref(S71, 'Swap_Application') },
      ],
    },
    {
      id: '7.2',
      title: 'Taylor Series',
      page: 215,
      stub: false,
      picture: 'taylor',
      why: 'Analytic functions equal their Taylor series. The real graph of $1/(1+x^2)$ hides the singularities that stop the series.',
      observe: 'Drag past the orange circle.',
      key: 'Blue axes. Orange is the circle through the nearest singularities, at $\\pm i$. Green is the point you drag. Purple is where the partial sum has settled.',
      summit: 'The Taylor series fills the disk out to the nearest singularity, and it stops there.',
      worked: {
        pin: 'Example 7.4 and Remark 7.1, pages 218–219',
        href: sectionHref(S72, 'sec_taylor-series-14'),
        body: 'Substitute $z^2$ and $-z^2$ into the geometric series. Then $1/(1-z^2)=\\sum z^{2n}$ and $1/(1+z^2)=\\sum (-1)^n z^{2n}$, both for $|z|<1$. The second function is smooth on the real line. Its singularities are at $\\pm i$, and both sit at distance 1 from 0, so the series still dies at the unit circle.',
      },
      memory: [
        'Taylor coefficient: $f^{(k)}(\\alpha)/k!$. At $\\alpha=0$ it is the Maclaurin series.',
        'Radius = distance to the nearest nonremovable singularity (Corollary 7.3, page 218).',
        'Any power series that equals $f$ on a disk is the Taylor series (Theorem 7.5, page 219).',
        'Geometric series: $1/(1-z)=\\sum z^n$ for $|z|<1$. Then substitute $z^2$ or $-z^2$.',
        '$1/(1+z^2)=\\sum_{n=0}^{\\infty}(-1)^n z^{2n}$ for $|z|<1$ (Example 7.4, page 218).',
      ],
      read: [
        { pin: 'Definition 7.2, page 215', href: sectionHref(S72, 'sec_taylor-series-3') },
        { pin: 'Theorem 7.4, page 216', href: sectionHref(S72, 'Taylor_s_Theorem') },
        { pin: 'Corollary 7.3, page 218', href: sectionHref(S72, 'Nuanced_Taylor') },
        { pin: 'Example 7.4, page 218', href: sectionHref(S72, 'sec_taylor-series-14') },
        { pin: 'Theorem 7.5, page 219', href: sectionHref(S72, 'Uniqueness') },
      ],
    },
    {
      id: '7.3',
      title: 'Laurent Series',
      page: 224,
      stub: false,
      picture: 'laurent',
      why: 'A Taylor disk cannot cross a pole. Between two poles the function is still analytic, and the series has to use negative powers.',
      observe: 'Drag across an orange circle.',
      key: 'Blue axes. Orange circles pass through the poles at $-1$ and $2$. Green is the point you drag. Purple is the region whose series is in use.',
      summit: 'Between singularities the Laurent series is a geometric series aimed inward on one side and outward on the other.',
      worked: {
        pin: 'Example 7.7, page 228',
        href: sectionHref(S73, 'ex_three-laurent-expansions'),
        body: '$3/(2+z-z^2)$ splits as $1/(1+z)+(1/2)/(1-z/2)$, with poles at $-1$ and $2$. In the annulus $1<|z|<2$, expand $1/(1+z)$ in powers of $1/z$ and $(1/2)/(1-z/2)$ in powers of $z$. Inside $|z|<1$ both expansions use non-negative powers. Outside $|z|>2$ both use negative powers.',
      },
      memory: [
        'A Laurent series is negative powers plus a power series (Definition 7.3, page 224).',
        'Partial fractions first.',
        'Inside a pole: $1/(1-z/R)=\\sum (z/R)^n$. Outside: expand in $R/z$.',
        'The series in a given annulus is unique (Theorem 7.9, page 228). You almost never compute the integral formula.',
      ],
      read: [
        { pin: 'Definition 7.3, page 224', href: sectionHref(S73, 'sec_laurent-series-4') },
        { pin: 'Definition 7.4, page 224', href: sectionHref(S73, 'sec_laurent-series-6') },
        { pin: 'Theorem 7.8, page 225', href: sectionHref(S73, 'Laurent_s_Theorem') },
        { pin: 'Example 7.7, page 228', href: sectionHref(S73, 'ex_three-laurent-expansions') },
      ],
    },
    {
      id: '7.4',
      title: 'Singularities, Zeros, and Poles',
      page: 232,
      stub: false,
      picture: 'winding',
      why: 'The negative powers name the singularity: none, a finite string, or an infinite tail. The order is how many times the image winds.',
      observe: 'Drag the green point once around the orange circle.',
      key: 'Blue axes. Orange is the circle. Green is the point you drag. Purple follows $z^2$, then $1/z$ the other way on a larger ring. The second turn of $z^2$ keeps its own ring.',
      summit: 'One trip around a zero of order $k$ sends the image around $k$ times.',
      worked: {
        pin: 'Definition 7.5, page 232, and Theorem 7.12, page 235',
        href: sectionHref(S74, 'sec_singularities-4'),
        body: 'On the picture, $f(z)=z^2$ has a zero of order 2 at 0: one lap of the green point sends the purple image around twice. A pole winds the other way. $1/z$ sends the image once the other way, which is a pole of order 1. Theorem 7.12 writes a pole of order $k$ as $h(z)/(z-\\alpha)^k$ with $h(\\alpha)\\neq 0$.',
      },
      memory: [
        'No negative powers: removable. Lowest power $-k$: a pole of order $k$. Infinitely many: essential (Definition 7.5, page 232).',
        'Zero of order $k$: the first $k-1$ derivatives vanish, and the $k$th does not (Definition 7.6, page 234).',
        'A zero of order $m$ over a zero of order $n$, with $n>m$, is a pole of order $n-m$ (Corollary 7.8, page 236).',
        'Pole of order $k$: $f(z)=h(z)/(z-\\alpha)^k$ with $h(\\alpha)\\neq 0$ (Theorem 7.12, page 235).',
      ],
      read: [
        { pin: 'Definition 7.5, page 232', href: sectionHref(S74, 'sec_singularities-4') },
        { pin: 'Definition 7.6, page 234', href: sectionHref(S74, 'order_k_zero_def') },
        { pin: 'Theorem 7.12, page 235', href: sectionHref(S74, 'order_k_pole_thm') },
      ],
    },
    {
      id: '7.5',
      title: 'Applications of Taylor and Laurent Series',
      page: 239,
      stub: false,
      picture: 'removable',
      why: 'A bounded isolated singularity can be filled in. Near 0, $\\sin(z)/z$ stays near 1, so the singularity at 0 is removable.',
      observe: 'Drag the green point toward 0.',
      key: 'Blue is the axis. Orange is the line at height 1, and the hole at 0. Green is the point you drag. Purple is $\\sin(z)/z$.',
      summit: 'The singularity at 0 is removable.',
      worked: {
        pin: 'Theorem 7.13, page 239, and Theorem 7.15, page 240',
        href: sectionHref(S75, 'Isolated_Zeros_Thm'),
        body: 'The zeros of $\\sin z$ are at $n\\pi$. Each one has a disk around it that contains no other zero. Theorem 7.13 needs a connected domain and a function that is not identically zero; $\\sin z$ on $\\mathbb{C}$ is both. On the picture, the Laurent series of $\\sin z/z$ is $1-z^2/3!+z^4/5!-\\cdots$ for $z\\neq 0$, so there are no negative powers. Defining the value at 0 to be 1 removes the singularity. The book does that on page 233. Theorem 7.15, page 240, says a bounded isolated singularity is removable.',
      },
      memory: [
        'On a connected domain, an analytic function that is not identically zero has isolated zeros (Theorem 7.13, page 239).',
        '$\\sin z/z$ at 0 is filled in by the value 1 (Theorem 7.15, page 240).',
        'L\'Hôpital (Corollary 7.11, page 240): the limit is the quotient $f\'(\\alpha)/g\'(\\alpha)$.',
        'Divide the series when $g(\\alpha)\\neq 0$. The coefficients satisfy $a_n=b_0 c_n+\\cdots+b_n c_0$ (Theorem 7.14, page 240). A zero of $g$ is where you stop dividing and switch to a Laurent series.',
        '$|f(z)|\\to\\infty$ means a pole (Theorem 7.16, page 241). A limit of $|f|$ that does not exist means essential (Theorem 7.17, page 242).',
      ],
      read: [
        { pin: 'Theorem 7.13, page 239', href: sectionHref(S75, 'Isolated_Zeros_Thm') },
        { pin: 'Corollary 7.11, page 240', href: sectionHref(S75, 'cor_L_hospital') },
        { pin: 'Theorem 7.14, page 240', href: sectionHref(S75, 'Pr_Series_Division') },
        { pin: 'Theorem 7.15, page 240', href: sectionHref(S75, 'Bd__Analytic_Thm') },
      ],
    },
  ],
});

export function chapter7Stage(id) {
  return CHAPTER_7.stages.find((s) => s.id === id) || null;
}

// The list Continue can count. One exercise id per stage: the stage-complete tick.
// walkSections on the practice engine appends these beside Chapters 4 and 5.
export function chapter7WalkSections() {
  return CHAPTER_7.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    page: stage.page,
    chapter: 7,
    exercises: [`ch7-stage-${stage.id}`],
  }));
}
