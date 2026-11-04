// js/hear.js
// The singing domain colouring. One gesture: move the green point.
// Sound is off until Hear. Mute is the same button. The picture uses the site clock
// for its paint and does not run a second animation loop.
// Live code: this file does not import from kit/.

import { createDomainColoring, drawColorWheel } from './core/domaincolor.js';
import { createFrame, prefersReducedMotion, pageHidden } from './core/anim.js';
import {
  PRESETS, MAPPING, CLAIMS, sample, hapticPattern, HOME_HZ,
} from './core/sonify.js';

const stage = document.getElementById('stage');
const colorCanvas = document.getElementById('hear-color');
const overlay = document.getElementById('hear-overlay');
const claimEl = document.getElementById('claim');
const readoutEl = document.getElementById('hear-readout');
const observeEl = document.getElementById('observe');
const stateEl = document.getElementById('hear-state');
const toggleBtn = document.getElementById('hear-toggle');
const needle = document.getElementById('hear-needle');
const mapEl = document.getElementById('hear-map');
const wheel = document.getElementById('hear-wheel');

const chips = [...document.querySelectorAll('.chip[data-preset]')];
const frame = createFrame();

let preset = PRESETS.tan;
let point = { re: preset.start.re, im: preset.start.im };
let reduced = prefersReducedMotion();
let armed = false;
let over = false;
let keyDown = false;
let enteredSinceArm = false;
let idleToken = 0;
let jump = true;
let lastClaim = '';
let lastHaptic = '';
let cssW = 1;
let cssH = 1;
let scale = 1;

let audioCtx = null;
let voice = null;
let coloring = null;

const AudioCtx = window.AudioContext || window.webkitAudioContext;

function token(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || '#888';
}

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return 'ran off';
  const t = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(t);
}

function fmtCart(z) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return 'ran off';
  const im = z.im;
  const sign = im < 0 ? '\u2212' : '+';
  return `${fmt(z.re)} ${sign} ${fmt(Math.abs(im))}i`;
}

function clampPoint(z) {
  const [x0, x1] = preset.xRange;
  const [y0, y1] = preset.yRange;
  return {
    re: Math.min(x1, Math.max(x0, z.re)),
    im: Math.min(y1, Math.max(y0, z.im)),
  };
}

function toWorld(clientX, clientY) {
  const r = stage.getBoundingClientRect();
  const u = r.width ? (clientX - r.left) / r.width : 0;
  const v = r.height ? (clientY - r.top) / r.height : 0;
  const [x0, x1] = preset.xRange;
  const [y0, y1] = preset.yRange;
  return clampPoint({ re: x0 + u * (x1 - x0), im: y1 - v * (y1 - y0) });
}

function toCss(re, im) {
  const [x0, x1] = preset.xRange;
  const [y0, y1] = preset.yRange;
  return [
    ((re - x0) / (x1 - x0)) * cssW,
    ((y1 - im) / (y1 - y0)) * cssH,
  ];
}

function current() {
  return sample(preset.id, point);
}

function wantSound() {
  if (!armed || pageHidden()) return false;
  if (over || keyDown) return true;
  if (!enteredSinceArm) return true;
  return false;
}

function statusText(playing) {
  if (!AudioCtx) return 'This browser has no Web Audio. The picture and the numbers still work.';
  if (!armed) return 'Silent. Sound stays off until you press Hear.';
  if (playing) return 'Hearing. Mute stops the note.';
  return 'Hearing is armed. Move onto the picture.';
}

function paintToggle(playing) {
  toggleBtn.setAttribute('aria-pressed', armed ? 'true' : 'false');
  toggleBtn.textContent = armed ? 'Mute' : 'Hear this point';
  toggleBtn.classList.toggle('btn-primary', !armed);
  stateEl.textContent = statusText(playing);
}

function ensureAudio() {
  if (!AudioCtx || audioCtx) return;
  audioCtx = new AudioCtx();
  const master = audioCtx.createGain();
  master.gain.value = 1;
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 8;
  comp.ratio.value = 8;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;
  master.connect(comp);
  comp.connect(audioCtx.destination);
  const make = () => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    return { osc, gain };
  };
  voice = {
    fund: make(),
    p2: make(),
    p3: make(),
    beat: make(),
  };
}

function setAudioParam(param, value, hard) {
  const t = audioCtx.currentTime;
  if (hard) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(value, t);
  } else {
    param.setTargetAtTime(value, t, 0.05);
  }
}

function applyVoice(v, hard) {
  if (!voice || !audioCtx) return;
  const beatOn = !reduced && v.beatKind !== 'none';
  setAudioParam(voice.fund.osc.frequency, v.freq, hard);
  setAudioParam(voice.p2.osc.frequency, v.freq * 2, hard);
  setAudioParam(voice.p3.osc.frequency, v.freq * 3, hard);
  setAudioParam(voice.fund.gain.gain, v.gain, hard);
  setAudioParam(voice.p2.gain.gain, v.gain * v.partial2, hard);
  setAudioParam(voice.p3.gain.gain, v.gain * v.partial3, hard);
  if (beatOn && v.beatKind === 'zero') {
    setAudioParam(voice.beat.osc.frequency, Math.max(30, v.freq / 2), hard);
    setAudioParam(voice.beat.gain.gain, v.gain * 0.65 * v.beatMix, hard);
  } else if (beatOn && v.beatKind === 'pole') {
    setAudioParam(voice.beat.osc.frequency, v.freq + v.beatHz, hard);
    setAudioParam(voice.beat.gain.gain, v.gain * 0.42 * v.beatMix, hard);
  } else {
    setAudioParam(voice.beat.gain.gain, 0, hard);
  }
}

function silence() {
  if (!voice || !audioCtx) return;
  for (const part of [voice.fund, voice.p2, voice.p3, voice.beat]) {
    setAudioParam(part.gain.gain, 0, false);
  }
}

function syncSound(hard) {
  const snap = current();
  const playing = wantSound();
  paintToggle(playing);
  if (playing) {
    const tokenNow = ++idleToken;
    ensureAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    applyVoice(snap.voice, hard || jump);
    jump = false;
    void tokenNow;
  } else if (voice) {
    silence();
    const tokenNow = ++idleToken;
    window.setTimeout(() => {
      if (tokenNow === idleToken && audioCtx && !wantSound()) audioCtx.suspend();
    }, 420);
  }
}

function buzz(kind) {
  const pattern = hapticPattern(kind, reduced);
  if (!pattern || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch (e) { /* no motor */ }
}

function renderReadout(snap) {
  const v = snap.voice;
  const loud = v.gain <= 0.004 ? 'silent' : `${fmt(v.gain / 0.1, 2)} of the ceiling`;
  const pitch = v.pitchClass === null ? 'pitch at the ceiling' : `${fmt(v.freq, 1)} Hz`;
  const beat = v.beatHz <= 0
    ? 'beat off'
    : v.gain <= 0.004
      ? `beat ${fmt(v.beatHz, 1)} Hz, a ${v.beatKind}, under the silence`
      : reduced
        ? `beat ${fmt(v.beatHz, 1)} Hz, shown here and not played, because motion is reduced`
        : `beat ${fmt(v.beatHz, 1)} Hz, a ${v.beatKind}`;
  const stretch = Number.isFinite(v.stretch) ? fmt(v.stretch, 2) : 'ran off';
  readoutEl.textContent =
    `z = ${fmtCart(point)}\n` +
    `w = ${fmtCart(snap.w)}    |w| = ${fmt(v.modulus, 2)}\n` +
    `${pitch}, loudness ${loud}, octave ${fmt(v.octave, 2)} from ${HOME_HZ} Hz\n` +
    `${beat}\n` +
    `timbre ${v.timbre}, |f'| = ${stretch}`;
}

function renderClaim(snap) {
  if (snap.claim === lastClaim) return;
  const prev = lastClaim;
  lastClaim = snap.claim;
  claimEl.textContent = snap.text;
  if (armed && (snap.claim === 'zero' || snap.claim === 'pole') && snap.claim !== prev) {
    if (lastHaptic !== snap.claim) {
      lastHaptic = snap.claim;
      buzz(snap.claim);
    }
  } else if (snap.claim !== 'zero' && snap.claim !== 'pole') {
    lastHaptic = '';
  }
}

function renderNeedle(snap) {
  const pc = snap.voice.pitchClass;
  if (pc === null) return;
  const deg = -pc * 360;
  needle.setAttribute('transform', `rotate(${deg} 32 32)`);
}

function drawOverlay() {
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const [x0, x1] = preset.xRange;
  const [y0, y1] = preset.yRange;
  ctx.save();
  ctx.strokeStyle = token('--cart');
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  if (y0 < 0 && y1 > 0) {
    const a = toCss(x0, 0);
    const b = toCss(x1, 0);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  if (x0 < 0 && x1 > 0) {
    const a = toCss(0, y0);
    const b = toCss(0, y1);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.restore();

  if (preset.cut) {
    ctx.save();
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = token('--seam');
    ctx.lineWidth = 1.5;
    const a = toCss(x0, 0);
    const b = toCss(0, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = token('--seam');
  ctx.lineWidth = 1.5;
  for (const m of preset.marks) {
    const [x, y] = toCss(m.re, m.im);
    ctx.beginPath();
    ctx.arc(x, y, m.kind === 'pole' ? 11 : 13, 0, Math.PI * 2);
    ctx.stroke();
    if (m.kind === 'pole') {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  const [px, py] = toCss(point.re, point.im);
  ctx.beginPath();
  ctx.fillStyle = token('--input');
  ctx.arc(px, py, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = token('--surface');
  ctx.stroke();
}

function publish(hardSound) {
  const snap = current();
  renderClaim(snap);
  renderReadout(snap);
  renderNeedle(snap);
  frame.arm(() => drawOverlay());
  syncSound(hardSound);
}

function fit() {
  cssW = stage.clientWidth || 320;
  cssH = stage.clientHeight || 320;
  let raw = 1;
  try {
    if (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) raw = devicePixelRatio;
  } catch (e) { /* no window */ }
  const dpr = Math.min(3, Math.max(1, raw));
  let w = Math.max(1, Math.round(cssW * dpr));
  let h = Math.max(1, Math.round(cssH * dpr));
  const long = Math.max(w, h);
  if (long > 1400) {
    const s = 1400 / long;
    w = Math.max(1, Math.round(w * s));
    h = Math.max(1, Math.round(h * s));
  }
  scale = w / cssW;
  for (const c of [colorCanvas, overlay]) {
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }
  if (coloring) {
    coloring.setView({ xRange: preset.xRange, yRange: preset.yRange });
    coloring.render('idle');
  }
  drawOverlay();
}

function paintColor() {
  if (!coloring) {
    coloring = createDomainColoring(colorCanvas, {
      f: preset.f,
      xRange: preset.xRange,
      yRange: preset.yRange,
      maxPixels: { idle: 800000, drag: 120000 },
    });
  } else {
    coloring.setFunction(preset.f);
    coloring.setView({ xRange: preset.xRange, yRange: preset.yRange });
  }
  coloring.render('idle');
}

function fillMap() {
  mapEl.replaceChildren();
  for (const row of MAPPING) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = row.ear;
    const dd = document.createElement('dd');
    dd.textContent = row.math;
    wrap.append(dt, dd);
    mapEl.append(wrap);
  }
}

function setPreset(id, keepPoint) {
  const next = PRESETS[id];
  if (!next) return;
  preset = next;
  if (!keepPoint) point = { re: next.start.re, im: next.start.im };
  else point = clampPoint(point);
  jump = true;
  lastClaim = '';
  for (const chip of chips) {
    chip.setAttribute('aria-pressed', chip.dataset.preset === id ? 'true' : 'false');
  }
  observeEl.textContent = next.observe;
  const label = id === 'tan' ? 'tan z' : id === 'exp' ? 'e to the z' : 'Log z';
  stage.setAttribute('aria-label', `Domain colouring of ${label}. Drag or use the arrow keys to move the green point.`);
  const hash = '#' + id;
  if (location.hash !== hash) history.replaceState(null, '', hash);
  paintColor();
  publish(true);
}

function setPoint(z, hardSound) {
  point = clampPoint(z);
  publish(!!hardSound);
}

toggleBtn.addEventListener('click', () => {
  if (!AudioCtx) return;
  if (armed) {
    armed = false;
    enteredSinceArm = false;
    over = false;
    keyDown = false;
    syncSound(true);
    return;
  }
  armed = true;
  if (!over) enteredSinceArm = false;
  ensureAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  jump = true;
  syncSound(true);
});

for (const chip of chips) {
  chip.addEventListener('click', () => setPreset(chip.dataset.preset, false));
}

stage.addEventListener('pointerdown', (ev) => {
  stage.setPointerCapture(ev.pointerId);
  over = true;
  enteredSinceArm = true;
  if (ev.pointerType !== 'mouse') keyDown = false;
  setPoint(toWorld(ev.clientX, ev.clientY), false);
});

stage.addEventListener('pointermove', (ev) => {
  const dragging = stage.hasPointerCapture(ev.pointerId);
  if (ev.pointerType !== 'mouse' && !dragging) return;
  over = true;
  enteredSinceArm = true;
  setPoint(toWorld(ev.clientX, ev.clientY), false);
});

stage.addEventListener('pointerup', (ev) => {
  if (ev.pointerType === 'mouse') return;
  over = false;
  syncSound(false);
});

stage.addEventListener('pointercancel', () => {
  over = false;
  keyDown = false;
  syncSound(false);
});

stage.addEventListener('pointerleave', (ev) => {
  if (ev.pointerType !== 'mouse') return;
  over = false;
  syncSound(false);
});

stage.addEventListener('pointerenter', (ev) => {
  if (ev.pointerType !== 'mouse') return;
  over = true;
  enteredSinceArm = true;
  syncSound(false);
});

stage.addEventListener('keydown', (ev) => {
  const step = ev.shiftKey ? 0.12 : 0.04;
  let dx = 0;
  let dy = 0;
  if (ev.key === 'ArrowRight') dx = step;
  else if (ev.key === 'ArrowLeft') dx = -step;
  else if (ev.key === 'ArrowUp') dy = step;
  else if (ev.key === 'ArrowDown') dy = -step;
  else return;
  ev.preventDefault();
  keyDown = true;
  setPoint({ re: point.re + dx, im: point.im + dy }, false);
});

stage.addEventListener('keyup', (ev) => {
  if (!ev.key.startsWith('Arrow')) return;
  keyDown = false;
  syncSound(false);
});

document.addEventListener('visibilitychange', () => {
  if (pageHidden()) {
    if (audioCtx) audioCtx.suspend();
  } else {
    syncSound(false);
  }
});

window.addEventListener('pagehide', () => {
  if (audioCtx) audioCtx.close();
});

try {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', () => {
    reduced = mq.matches;
    syncSound(true);
  });
} catch (e) { /* no matchMedia */ }

if (typeof ResizeObserver === 'function') {
  const ro = new ResizeObserver(() => fit());
  ro.observe(stage);
}

fillMap();
drawColorWheel(wheel, { size: 84 });
fit();

const fromHash = (location.hash || '').replace('#', '');
if (PRESETS[fromHash]) setPreset(fromHash, false);
else {
  paintColor();
  publish(false);
}

if (!AudioCtx) {
  toggleBtn.disabled = true;
  paintToggle(false);
}

window.__hear = {
  setPreset(id) { setPreset(id, false); },
  setPoint(re, im) { setPoint({ re, im }, true); },
  state() {
    const snap = current();
    return {
      preset: preset.id,
      claim: snap.claim,
      text: snap.text,
      armed,
      playing: wantSound(),
      freq: snap.voice.freq,
      gain: snap.voice.gain,
      beatHz: snap.voice.beatHz,
      beatKind: snap.voice.beatKind,
      modulus: snap.voice.modulus,
      octave: snap.voice.octave,
      pitchClass: snap.voice.pitchClass,
      timbre: snap.voice.timbre,
      audio: audioCtx ? audioCtx.state : 'none',
      reduced,
    };
  },
};
