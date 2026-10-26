// Complex current. One drag: the phase ωt. The purple mark is Im(I*), the physical current.
// Howell & Mathews, 202 Updated Edition, §5.4, Figure 5.9, (5.42)–(5.46), printed pp. 155–156.

import { createPlane, drawArc, drawCircle, drawDot, drawLabel, drawRay, drawSegment, DASH } from '../core/plane.js';
import { fmtCart, fmtNum } from '../core/complex.js';
import { I0, PHASOR_CHIPS, angNear, onCircle, phasorAt, phasorClaim } from './circuit-model.js';
import { chipButton, mountChrome, setClaim, syncChips } from './circuit-ui.js';

const HTML = 'https://complexanalysis.org/web/sec_trig-hyperbolics.html';
const PIN = '§5.4, Figure 5.9, equations (5.42)–(5.46), printed pp. 155–156';
const ORIGIN = Object.freeze({ re: 0, im: 0 });

export function mount(section, ctx) {
  const state = { phi: Math.PI / 4 };
  const ui = mountChrome(section, {
    id: 'phasor-current',
    title: ctx.station.title,
    lede: 'The same turn you use to multiply, read as a current. I* spins on the circle. The physical current is its height.',
    threads: ctx.station.threads,
    threadList: ctx.threads,
    pin: PIN,
    href: HTML,
    observe: 'Drag the green point around the circle. That point is the complex current. The purple mark is its height, the physical current.',
    formula: 'I^{*}=I_{0}e^{i\\omega t},\\quad I=\\operatorname{Im}(I^{*}).',
    note: 'This site cites the 202 Updated Edition: Figure 5.9 and equations (5.42)–(5.46), printed pages 155–156. The HTML page numbers that figure 5.4.9 and those equations (5.4.11)–(5.4.15). The book writes i. In §1.1, printed page 8, it notes that some engineers write j for the square root of negative one, so i can stand for current.',
    chipLabel: 'Phase of the current',
    exercise: 'Exercise 4 of §5.4 asks why the diagrams in Figures 5.8 and 5.9 came out the way they did. Figure 5.8 is the tangent mapping. This picture is the current in Figure 5.9. The solution is not worked here.',
  });

  const plane = createPlane(ui.planeHost, {
    id: 'phasor-current-plane',
    xRange: [-1.7, 1.7],
    yRange: [-1.7, 1.7],
    grid: 'cart',
    axes: true,
    legend: false,
    maxWidth: 560,
    ariaLabel: 'Complex current on the circle of radius I0',
  });

  plane.addLayer((ctx2d, pl) => {
    const m = phasorAt(state.phi);
    const height = { re: 0, im: m.physical };
    drawCircle(ctx2d, pl, ORIGIN, I0, { color: '--polar', width: 1.5, alpha: 0.9 });
    drawRay(ctx2d, pl, m.phi, { color: '--polar', width: 2 });
    if (Math.abs(m.phi) > 0.06) drawArc(ctx2d, pl, ORIGIN, 0.38, 0, m.phi, { color: '--polar', width: 2, arrow: true });
    drawSegment(ctx2d, pl, m.I, height, { color: '--output', dash: DASH.guide, width: 1.5 });
    if (Math.abs(m.physical) > 0.06) drawSegment(ctx2d, pl, ORIGIN, height, { color: '--output', width: 3, arrow: true });
    drawDot(ctx2d, pl, height, { color: '--output', radius: 5 });
    const onAxis = Math.abs(m.physical) < 0.2;
    drawLabel(ctx2d, pl, height, 'I', {
      color: '--output',
      dx: onAxis ? 16 : 12,
      dy: onAxis ? -18 : (m.physical >= 0 ? -14 : 16),
    });
  }, { order: 10 });

  const handle = plane.addPoint({
    id: 'I',
    z: phasorAt(state.phi).I,
    color: '--input',
    label: 'I*',
    name: 'complex current',
    step: 0.05,
    snap: (z) => onCircle(z, I0),
    onDrag: (z) => {
      state.phi = Math.atan2(z.im, z.re);
      refresh();
    },
  });

  const buttons = PHASOR_CHIPS.map((chip) => {
    const b = chipButton(`phasor-current-chip-${chip.id}`, chip.label, () => {
      state.phi = chip.phi;
      handle.set(phasorAt(chip.phi).I);
    });
    b.dataset.chip = chip.id;
    ui.chips.append(b);
    return b;
  });

  function refresh() {
    const m = phasorAt(state.phi);
    setClaim(ui.claim, phasorClaim(m.phi));
    ui.readout.textContent = `I* = ${fmtCart(m.I)}, Im(I*) = ${fmtNum(m.physical)}, I0 = ${fmtNum(I0)}`;
    syncChips(buttons, (b) => {
      const chip = PHASOR_CHIPS.find((c) => c.id === b.dataset.chip);
      return !!(chip && angNear(m.phi, chip.phi));
    });
  }

  refresh();
  return () => plane.destroy();
}
