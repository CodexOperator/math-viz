// Renders a short strip of Julia frames off the page thread.
// The page posts plain numbers and receives one RGBA buffer per frame.

import { fillJulia, paintJulia } from './fractal.js';

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || msg.kind !== 'render') return;
  const w = msg.w | 0;
  const h = msg.h | 0;
  const frames = msg.frames || [];
  const field = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  const buffers = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    fillJulia(field, w, h, 0, h, msg.view, { re: f.re, im: f.im }, msg.maxIter, f.escape2);
    paintJulia(pixels, field, w, h, 0, h, msg.maxIter, msg.colours.inside, msg.colours.slow, msg.colours.fast);
    const copy = pixels.slice();
    buffers.push(copy.buffer);
  }
  self.postMessage({ kind: 'frames', token: msg.token, w, h, buffers }, buffers);
};
