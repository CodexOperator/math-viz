// Global phase. One drag: θ on the unit circle. Purple is e^{iθ}ψ for a fixed wave ψ.
// The book only teases the quantum world in the Chapter 1 introduction. No wavefunction number is invented.

import { createPlane, drawArc, drawCircle, drawDot, drawLabel, drawRay, drawSegment, DASH } from '../core/plane.js';
import { abs, fmtCart, fmtNum } from '../core/complex.js';
import { PSI, WAVE_CHIPS, angNear, onCircle, waveAt, waveClaim } from './circuit-model.js';
import { chipButton, mountChrome, setClaim, syncChips } from './circuit-ui.js';

const HTML = 'https://complexanalysis.org/web/ch_Complex_Numbers-2.html#ch_Complex_Numbers-2-1';
const PIN = 'Chapter 1 introduction, printed p. 1. PDF number not checked — intro tease only';
const ORIGIN = Object.freeze({ re: 0, im: 0 });

export function mount(section, ctx) {
  const state = { theta: Math.PI };
  const ui = mountChrome(section, {
    id: 'wave-phase',
    title: ctx.station.title,
    lede: 'A global phase is the same spin as multiplying by e^{iθ}. The length of the wave stays put.',
    threads: ctx.station.threads,
    threadList: ctx.threads,
    pin: PIN,
    href: HTML,
    observe: 'Drag the green point around the unit circle. That point is e^{iθ}. The purple point is that same turn applied to a fixed wave ψ.',
    formula: 'e^{i\\theta}\\psi.',
    note: 'PDF number not checked — the book teases the quantum world in the Chapter 1 introduction only, printed page 1: applications ranging from fluid flow, to electric circuits, to the mysterious quantum world. It does not number a wavefunction. This picture is the multiply-by-e^{iθ} move, with a fixed length.',
    chipLabel: 'Global phase',
  });

  const plane = createPlane(ui.planeHost, {
    id: 'wave-phase-plane',
    xRange: [-2.3, 2.3],
    yRange: [-2.3, 2.3],
    grid: 'cart',
    axes: true,
    legend: false,
    maxWidth: 560,
    ariaLabel: 'Global phase of a fixed wave',
  });

  plane.addLayer((ctx2d, pl) => {
    const m = waveAt(state.theta);
    drawCircle(ctx2d, pl, ORIGIN, 1, { color: '--polar', width: 1.5, alpha: 0.9 });
    drawCircle(ctx2d, pl, ORIGIN, abs(PSI), { color: '--output', dash: DASH.guide, width: 1.5, alpha: 0.85 });
    drawRay(ctx2d, pl, m.theta, { color: '--polar', width: 2 });
    if (Math.abs(m.theta) > 0.06) drawArc(ctx2d, pl, ORIGIN, 0.42, 0, m.theta, { color: '--polar', width: 2, arrow: true });
    drawSegment(ctx2d, pl, ORIGIN, m.phased, { color: '--output', width: 3, arrow: true });
    drawDot(ctx2d, pl, m.phased, { color: '--output', radius: 5 });
    drawLabel(ctx2d, pl, PSI, 'ψ', { color: '--text', dx: 10, dy: -12 });
  }, { order: 10 });

  const handle = plane.addPoint({
    id: 'phase',
    z: waveAt(state.theta).phase,
    color: '--input',
    label: 'phase',
    name: 'global phase',
    labelSide: 'above-left',
    step: 0.05,
    snap: (z) => onCircle(z, 1),
    onDrag: (z) => {
      state.theta = Math.atan2(z.im, z.re);
      refresh();
    },
  });

  const buttons = WAVE_CHIPS.map((chip) => {
    const b = chipButton(`wave-phase-chip-${chip.id}`, chip.label, () => {
      state.theta = chip.theta;
      handle.set(waveAt(chip.theta).phase);
    });
    b.dataset.chip = chip.id;
    ui.chips.append(b);
    return b;
  });

  function refresh() {
    const m = waveAt(state.theta);
    setClaim(ui.claim, waveClaim(m.theta));
    ui.readout.textContent = `e^{iθ} = ${fmtCart(m.phase)}, ψ = ${fmtCart(m.psi)}, e^{iθ}ψ = ${fmtCart(m.phased)}, |ψ| = ${fmtNum(abs(m.psi))}`;
    syncChips(buttons, (b) => {
      const chip = WAVE_CHIPS.find((c) => c.id === b.dataset.chip);
      return !!(chip && angNear(m.theta, chip.theta));
    });
  }

  refresh();
  return () => plane.destroy();
}
