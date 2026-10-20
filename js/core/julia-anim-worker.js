// Renders Julia frames off the page thread.
//
// A render job posts one coarse frame at a time, then says it is done. The page
// then asks for a sharp frame of the index on screen (and the next one). Only
// that frame is large, so the stored film stays small.

import { fillJulia, paintJulia } from './fractal.js';

const SHARP_EDGE = 640;

function postSharp(msg) {
  let w = msg.w | 0;
  let h = msg.h | 0;
  if (w < 2 || h < 2) return;
  const long = Math.max(w, h);
  if (long > SHARP_EDGE) {
    const s = SHARP_EDGE / long;
    w = Math.max(2, Math.round(w * s));
    h = Math.max(2, Math.round(h * s));
  }
  const field = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  fillJulia(field, w, h, 0, h, msg.view, { re: msg.re, im: msg.im }, msg.maxIter, msg.escape2);
  paintJulia(pixels, field, w, h, 0, h, msg.maxIter, msg.colours.inside, msg.colours.slow, msg.colours.fast);
  const copy = pixels.slice();
  self.postMessage({
    kind: 'sharp', token: msg.token, index: msg.index | 0, w, h, buffer: copy.buffer,
  }, [copy.buffer]);
}

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg) return;
  if (msg.kind === 'sharpen') {
    postSharp(msg);
    return;
  }
  if (msg.kind !== 'render') return;
  const w = msg.w | 0;
  const h = msg.h | 0;
  const frames = msg.frames || [];
  const field = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  const total = frames.length;
  const inside = msg.colours.inside;
  const slow = msg.colours.slow;
  const fast = msg.colours.fast;
  for (let i = 0; i < total; i++) {
    const f = frames[i];
    fillJulia(field, w, h, 0, h, msg.view, { re: f.re, im: f.im }, msg.maxIter, f.escape2);
    paintJulia(pixels, field, w, h, 0, h, msg.maxIter, inside, slow, fast);
    const copy = pixels.slice();
    self.postMessage({
      kind: 'frame', token: msg.token, index: i, total, w, h, buffer: copy.buffer,
    }, [copy.buffer]);
  }
  self.postMessage({ kind: 'done', token: msg.token, total });
};
