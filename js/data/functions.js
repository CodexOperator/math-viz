// js/data/functions.js: the catalogue of the functions that appear on Test 1.
// Pure data. No imports, no DOM, no window. Stations compile `src` with js/core/parse.js:
//   const { f } = compile(fnById('sq').src);
//
// Field notes (see docs/designs/iter-1/i1-data.md):
//  - `src` is parse.js grammar; `tex` is the function as TeX; `label` is the short text for a chip.
//  - `cart` / `polar` are the TeX of u and v in (x, y) and in (r, θ) (θ = Arg z), or null when there is no
//    short closed form (sqrt and the cube root: that is the point of the polar address).
//  - `analytic` means analytic on the plane minus its singular points (sqrt and cbrt: off the cut).
//  - `poles` lists the singular points at which f is undefined. For 1/z that is a true pole; for the
//    direction-only functions (dir, x-over-z) 0 is a point where f has no limit, listed for the plots.
//  - `derivativeTex` is f′ as TeX when f is analytic, else null.
//  - `problems` are the review problems the function is the subject of. `stations` are the stations that offer
//    the function (as the default, a chip or a preset), in registry order; the Lab offers all of them.
//    Every id exists in the registry and in problems.js.
//  - Every exported object is deep-frozen. Copy before mutating.

const T = String.raw; // keeps TeX backslashes readable
const ORIGIN = { re: 0, im: 0 };

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

export const FUNCTIONS = deepFreeze([
  {
    id: 'sq', label: 'z²', tex: 'z^2', src: 'z^2',
    problems: ['2.1.2'], stations: ['mappings', 'powermap', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'Squares the length and doubles the angle: every name θ of arg z gives the name 2θ of arg w.',
    cart: { u: 'x^2 - y^2', v: '2xy' },
    polar: { u: T`r^2\cos 2\theta`, v: T`r^2\sin 2\theta` },
    derivativeTex: '2z',
  },
  {
    id: 'cube', label: 'z³', tex: 'z^3', src: 'z^3',
    problems: ['2.2.1'], stations: ['powermap', 'derivative', 'lab'],
    analytic: true, poles: [],
    note: 'Cubes the length and triples the angle (every name θ of arg z gives 3θ), so a sector opens three times wider.',
    cart: { u: 'x^3 - 3xy^2', v: '3x^2y - y^3' },
    polar: { u: T`r^3\cos 3\theta`, v: T`r^3\sin 3\theta` },
    derivativeTex: '3z^2',
  },
  {
    id: 'recip', label: '1/z', tex: T`\dfrac{1}{z}`, src: '1/z',
    problems: ['2.5.1'], stations: ['mappings', 'reciprocal', 'derivative', 'lab', 'graph4d'],
    analytic: true, poles: [ORIGIN],
    note: 'Length r becomes 1/r and every name θ of arg z becomes −θ: invert in the unit circle, then mirror across the real axis.',
    cart: { u: T`\dfrac{x}{x^2 + y^2}`, v: T`-\dfrac{y}{x^2 + y^2}` },
    polar: { u: T`\dfrac{\cos\theta}{r}`, v: T`-\dfrac{\sin\theta}{r}` },
    derivativeTex: T`-\dfrac{1}{z^2}`,
  },
  {
    id: 'linear-i', label: 'iz − 2i', tex: 'iz - 2i', src: 'iz - 2i',
    problems: ['2.1.3'], stations: ['mappings', 'linear', 'lab'],
    analytic: true, poles: [],
    note: 'It equals i(z − 2): slide left 2, then a counterclockwise quarter turn.',
    cart: { u: '-y', v: 'x - 2' },
    polar: { u: T`-r\sin\theta`, v: T`r\cos\theta - 2` },
    derivativeTex: 'i',
  },
  {
    id: 'linear-1i', label: '(1 + i)z', tex: '(1 + i)z', src: '(1+i)z',
    problems: ['P4'], stations: ['linear', 'lab'],
    analytic: true, poles: [],
    note: 'Spin by Arg(1 + i) = 45° and stretch by √2.',
    cart: { u: 'x - y', v: 'x + y' },
    polar: { u: T`\sqrt{2}\,r\cos\left(\theta + \tfrac{\pi}{4}\right)`, v: T`\sqrt{2}\,r\sin\left(\theta + \tfrac{\pi}{4}\right)` },
    derivativeTex: '1 + i',
  },
  {
    id: 'sq-plus-iz', label: 'z² + iz', tex: 'z^2 + iz', src: 'z^2 + iz',
    problems: ['2.1.1'], stations: ['mappings', 'lab'],
    analytic: true, poles: [],
    note: 'z² plus a quarter turn of z. Writing it as u + iv is problem 2.1.1.',
    cart: { u: 'x^2 - y^2 - y', v: '2xy + x' },
    polar: { u: T`r^2\cos 2\theta - r\sin\theta`, v: T`r^2\sin 2\theta + r\cos\theta` },
    derivativeTex: '2z + i',
  },
  {
    id: 'sq-plus-z', label: 'z² + z', tex: 'z^2 + z', src: 'z^2 + z',
    problems: ['3.1.1'], stations: ['derivative', 'cauchy-riemann', 'lab'],
    analytic: true, poles: [],
    note: 'Differentiable everywhere: f′(z) = 2z + 1.',
    cart: { u: 'x^2 - y^2 + x', v: '2xy + y' },
    polar: { u: T`r^2\cos 2\theta + r\cos\theta`, v: T`r^2\sin 2\theta + r\sin\theta` },
    derivativeTex: '2z + 1',
  },
  {
    id: 'exp', label: 'e^z', tex: 'e^{z}', src: 'exp(z)',
    problems: ['3.2.1'], stations: ['derivative', 'cauchy-riemann', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'e^x(cos y + i sin y): length e^x and y is a name for arg w, so the Cartesian address of z is the polar address of w.',
    cart: { u: T`e^{x}\cos y`, v: T`e^{x}\sin y` },
    polar: { u: T`e^{r\cos\theta}\cos(r\sin\theta)`, v: T`e^{r\cos\theta}\sin(r\sin\theta)` },
    derivativeTex: 'e^{z}',
  },
  {
    id: 'conj', label: 'conj z', tex: T`\overline{z}`, src: 'conj(z)',
    problems: ['1.1.2', 'P1', 'P2'], stations: ['arithmetic', 'mappings', 'derivative', 'cauchy-riemann', 'lab'],
    analytic: false, poles: [],
    note: 'Mirror across the real axis. Continuous everywhere, differentiable nowhere.',
    cart: { u: 'x', v: '-y' },
    polar: { u: T`r\cos\theta`, v: T`-r\sin\theta` },
    derivativeTex: null,
  },
  {
    id: 're', label: 'Re z', tex: T`\operatorname{Re}(z)`, src: 'Re(z)',
    problems: ['P6'], stations: ['derivative', 'cauchy-riemann', 'lab'],
    analytic: false, poles: [],
    note: 'Squashes the whole plane flat onto the real axis. Differentiable nowhere.',
    cart: { u: 'x', v: '0' },
    polar: { u: T`r\cos\theta`, v: '0' },
    derivativeTex: null,
  },
  {
    id: 'abs2', label: '|z|²', tex: '|z|^2', src: 'abs(z)^2',
    problems: ['3.1.2'], stations: ['derivative', 'cauchy-riemann', 'lab'],
    analytic: false, poles: [],
    note: 'Squares the length and forgets arg z, so the output is real. Differentiable only at 0.',
    cart: { u: 'x^2 + y^2', v: '0' },
    polar: { u: 'r^2', v: '0' },
    derivativeTex: null,
  },
  {
    id: 'dir', label: 'z²/|z|²', tex: T`\dfrac{z^2}{|z|^2}`, src: 'z^2/abs(z)^2',
    problems: ['2.3.1'], stations: ['limits', 'lab'],
    analytic: false, poles: [ORIGIN],
    note: 'Forgets the length and keeps twice the angle (θ a name for arg z): z²/|z|² = e^{2iθ}. Not defined at 0.',
    cart: { u: T`\dfrac{x^2 - y^2}{x^2 + y^2}`, v: T`\dfrac{2xy}{x^2 + y^2}` },
    polar: { u: T`\cos 2\theta`, v: T`\sin 2\theta` },
    derivativeTex: null,
  },
  {
    id: 'sqrt', label: '√z', tex: T`\sqrt{z}`, src: 'sqrt(z)',
    problems: ['2.2.2'], stations: ['principal-root', 'branches', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'Principal square root: square-root the length and halve Arg z. It jumps across the negative real axis, so it is analytic only off that cut.',
    cart: null,
    polar: { u: T`\sqrt{r}\cos\dfrac{\theta}{2}`, v: T`\sqrt{r}\sin\dfrac{\theta}{2}` },
    derivativeTex: T`\dfrac{1}{2\sqrt{z}}`,
  },
  {
    id: 'cbrt', label: 'z^(1/3)', tex: 'z^{1/3}', src: 'z^(1/3)',
    problems: ['2.4.1'], stations: ['principal-root', 'branches', 'lab', 'graph4d'],
    analytic: true, poles: [],
    note: 'Principal cube root: cube-root the length and divide Arg z by 3. It jumps across the negative real axis; moving the seam gives the other branches.',
    cart: null,
    polar: { u: T`r^{1/3}\cos\dfrac{\theta}{3}`, v: T`r^{1/3}\sin\dfrac{\theta}{3}` },
    derivativeTex: T`\dfrac{1}{3}z^{-2/3}`,
  },
  {
    id: 'x-over-z', label: '(Re(1 + z) − 1)/z', tex: T`\dfrac{\operatorname{Re}(1 + z) - 1}{z}`, src: '(Re(1+z) - 1)/z',
    problems: ['P5'], stations: ['limits', 'lab'],
    analytic: false, poles: [ORIGIN],
    note: 'It equals x/z = cos θ e^(−iθ), θ a name for arg z: the value depends on the direction, so there is no limit at 0.',
    cart: { u: T`\dfrac{x^2}{x^2 + y^2}`, v: T`-\dfrac{xy}{x^2 + y^2}` },
    polar: { u: T`\cos^2\theta`, v: T`-\cos\theta\sin\theta` },
    derivativeTex: null,
  },
]);

const FN_BY_ID = new Map(FUNCTIONS.map((f) => [f.id, f]));

export function fnById(id) {
  return FN_BY_ID.get(id) || null;
}
