// Pure pictures for the circuit thread. No DOM. The claim is true in one state and false in another.
//
// Howell & Mathews, Complex Analysis, 202 Updated Edition, §5.4, printed pp. 155–156.
// Figure 5.9 is the LRC circuit. (5.42) is EL + ER + EC = E(t).
// (5.43)–(5.45) are the physical drops for I(t) = I0 sin ωt.
// The book then writes the complex current I* = I0 e^{iωt} and says the physical current is Im(I*).
// (5.46) is E* = [R + i(ωL − 1/ωC)] I*. Z is that bracket, and E* = Z I*.
// Those last two sentences are not given their own equation numbers.

import { Arg, abs, mul, wrapArg } from '../core/complex.js';

export const I0 = 1;
export const PSI = Object.freeze({ re: 1.6, im: 0 });
// The impedance stop fixes the current at its peak, so I* = i and |I*| = I0.
export const PEAK_CURRENT = Object.freeze({ re: 0, im: I0 });

export const PHASOR_CHIPS = Object.freeze([
  Object.freeze({ id: 'zero', label: 'ωt = 0', phi: 0 }),
  Object.freeze({ id: 'peak', label: 'ωt = π/2', phi: Math.PI / 2 }),
]);

export const IMPEDANCE_CHIPS = Object.freeze([
  Object.freeze({ id: 'resistor', label: 'Resistor', z: Object.freeze({ re: 2, im: 0 }) }),
  Object.freeze({ id: 'inductor', label: 'Inductor', z: Object.freeze({ re: 0, im: 2 }) }),
  Object.freeze({ id: 'capacitor', label: 'Capacitor', z: Object.freeze({ re: 0, im: -2 }) }),
]);

export const WAVE_CHIPS = Object.freeze([
  Object.freeze({ id: 'zero', label: 'θ = 0', theta: 0 }),
  Object.freeze({ id: 'half', label: 'Half turn', theta: Math.PI }),
]);

const PEAK_TOL = 0.18;
const PHASE_TOL = 0.12;
const CHIP_TOL = 0.05;

export function angNear(theta, target, tol = CHIP_TOL) {
  return Math.abs(wrapArg(theta - target)) < tol;
}

export function pointNear(a, b, tol = CHIP_TOL) {
  return Math.hypot(a.re - b.re, a.im - b.im) <= tol;
}

export function onCircle(z, radius) {
  const r = Math.hypot(z.re, z.im);
  if (!(r > 1e-9)) return { re: radius, im: 0 };
  return { re: (z.re / r) * radius, im: (z.im / r) * radius };
}

export function phasorAt(phi) {
  const angle = wrapArg(phi);
  const I = { re: I0 * Math.cos(angle), im: I0 * Math.sin(angle) };
  return { phi: angle, I, physical: I.im };
}

export function phasorClaim(phi) {
  const atPeak = angNear(phi, Math.PI / 2, PEAK_TOL);
  return {
    holds: atPeak,
    text: atPeak
      ? 'The physical current equals I0. The green point is straight up, so Im(I*) is the whole length.'
      : 'The physical current is not I0. Im(I*) is the height of the green point, and that height is not the whole length upward.',
  };
}

export function clampZ(z) {
  return {
    re: Math.min(2.6, Math.max(0, z.re)),
    im: Math.min(2.6, Math.max(-2.6, z.im)),
  };
}

export function impedanceAt(z) {
  const Z = clampZ(z);
  const E = mul(Z, PEAK_CURRENT);
  return { Z, R: Z.re, X: Z.im, I: PEAK_CURRENT, E };
}

export function impedanceClaim(z) {
  const Z = clampZ(z);
  const inPhase = Z.re > 0.15 && Math.abs(Z.im) < PHASE_TOL;
  return {
    holds: inPhase,
    text: inPhase
      ? 'Voltage and current share a phase. Z is real, so E* points the same way as I*.'
      : 'Voltage and current do not share a phase. E* does not point the same way as I*.',
  };
}

export function waveAt(theta) {
  const angle = wrapArg(theta);
  const phase = { re: Math.cos(angle), im: Math.sin(angle) };
  return { theta: angle, phase, psi: PSI, phased: mul(phase, PSI) };
}

export function waveClaim(theta) {
  const home = angNear(theta, 0, PEAK_TOL);
  return {
    holds: home,
    text: home
      ? 'The phased wave sits on ψ. A global phase of 0 leaves it there, and the length stays |ψ|.'
      : 'The phased wave has left ψ. Multiplying by e^{iθ} turned it, and the length is still |ψ|.',
  };
}

export function sameLength(a, b, tol = 1e-9) {
  return Math.abs(abs(a) - abs(b)) < tol;
}

export function argOf(z) {
  return Arg(z);
}
