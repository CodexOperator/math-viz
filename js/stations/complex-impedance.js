// Complex impedance. One drag: the point Z. Purple is E* = Z I*, with I* fixed at i.
// Howell & Mathews, 202 Updated Edition, §5.4, Figure 5.9, (5.46), printed pp. 155–156.

import { createPlane, drawArc, drawLabel, drawSegment } from '../core/plane.js';
import { abs, fmtCart, fmtNum } from '../core/complex.js';
import {
  IMPEDANCE_CHIPS, PEAK_CURRENT, angNear, argOf, clampZ, impedanceAt, impedanceClaim, pointNear,
} from './circuit-model.js';
import { chipButton, mountChrome, setClaim, syncChips } from './circuit-ui.js';

const HTML = 'https://complexanalysis.org/web/sec_trig-hyperbolics.html#fig_ch-05-09';
const PIN = '§5.4, Figure 5.9, equation (5.46), printed pp. 155–156';
const ORIGIN = Object.freeze({ re: 0, im: 0 });

export function mount(section, ctx) {
  const state = { z: { re: 1.2, im: 0.9 } };
  const ui = mountChrome(section, {
    id: 'complex-impedance',
    title: ctx.station.title,
    lede: 'A series LRC circuit is one point Z. The voltage is that point times the current.',
    threads: ctx.station.threads,
    threadList: ctx.threads,
    pin: PIN,
    href: HTML,
    observe: 'Drag the green point. That point is Z. The thin arrow straight up is the fixed current I* = i. The purple arrow is E* = Z I*, the multiply from the plane: I* is i, so Z turns a quarter turn.',
    formula: 'Z=R+i\\left(\\omega L-\\frac{1}{\\omega C}\\right),\\quad E^{*}=ZI^{*}.',
    note: 'This site cites the 202 Updated Edition: Figure 5.9 and equations (5.42)–(5.46), printed pages 155–156. The HTML page numbers that figure 5.4.9 and those equations (5.4.11)–(5.4.15). HTML exercise 4 names Figures 5.4.6 and 5.4.9. Figure 5.4.6 is the tangent picture, PDF Figure 5.8. The imaginary part is one number, ωL minus 1/(ωC). The picture does not split the inductor and the capacitor into two sliders.',
    chipLabel: 'Which piece of Z',
    exercise: 'Exercise 17 of §5.4 asks for Z at two sets of R, L, C, and ω. Exercise 4 asks why Figures 5.8 and 5.9 came out the way they did. This picture is the hint for the circuit in Figure 5.9. The solution is not worked here.',
  });

  const plane = createPlane(ui.planeHost, {
    id: 'complex-impedance-plane',
    xRange: [-3.2, 3.2],
    yRange: [-3.2, 3.2],
    grid: 'cart',
    axes: true,
    legend: false,
    maxWidth: 560,
    ariaLabel: 'Complex impedance Z and the voltage E star',
  });

  plane.addLayer((ctx2d, pl) => {
    const m = impedanceAt(state.z);
    const knee = { re: m.R, im: 0 };
    if (m.R > 0.04) drawSegment(ctx2d, pl, ORIGIN, knee, { color: '--input', width: 2.5 });
    if (Math.abs(m.X) > 0.04) drawSegment(ctx2d, pl, knee, m.Z, { color: '--polar', width: 2.5 });
    if (abs(m.E) > 0.08) {
      drawSegment(ctx2d, pl, ORIGIN, m.E, { color: '--output', width: 3, arrow: true });
      const to = argOf(m.E);
      if (!angNear(to, Math.PI / 2, 0.08)) {
        drawArc(ctx2d, pl, ORIGIN, 0.55, Math.PI / 2, to, { color: '--polar', width: 2, arrow: true });
      }
    }
    drawSegment(ctx2d, pl, ORIGIN, PEAK_CURRENT, { color: '--cart', width: 1.5, arrow: true, alpha: 0.95 });
    drawLabel(ctx2d, pl, PEAK_CURRENT, 'I*', { color: '--cart', dx: 12, dy: 14 });
  }, { order: 10 });

  const handle = plane.addPoint({
    id: 'Z',
    z: clampZ(state.z),
    color: '--input',
    label: 'Z',
    name: 'impedance',
    step: 0.1,
    snap: clampZ,
    onDrag: (z) => {
      state.z = clampZ(z);
      refresh();
    },
  });

  const buttons = IMPEDANCE_CHIPS.map((chip) => {
    const b = chipButton(`complex-impedance-chip-${chip.id}`, chip.label, () => {
      state.z = { re: chip.z.re, im: chip.z.im };
      handle.set(state.z);
    });
    b.dataset.chip = chip.id;
    ui.chips.append(b);
    return b;
  });

  function refresh() {
    const m = impedanceAt(state.z);
    setClaim(ui.claim, impedanceClaim(m.Z));
    ui.readout.textContent = `Z = ${fmtCart(m.Z)}, X = ωL − 1/(ωC) = ${fmtNum(m.X)}, I* = ${fmtCart(PEAK_CURRENT)}, E* = ${fmtCart(m.E)}`;
    syncChips(buttons, (b) => {
      const chip = IMPEDANCE_CHIPS.find((c) => c.id === b.dataset.chip);
      return !!(chip && pointNear(m.Z, chip.z));
    });
  }

  refresh();
  return () => plane.destroy();
}
