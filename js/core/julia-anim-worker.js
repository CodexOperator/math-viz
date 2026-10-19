// Renders Julia frames off the page thread, one message per frame, so the page
// can play the first frames while the rest are still being drawn.

import { fillJulia, paintJulia } from './fractal.js';

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || msg.kind !== 'render') return;
  const w = msg.w | 0;
  const h = msg.h | 0;
  const frames = msg.frames || [];
  const field = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  const total = frames.length;
  for (let i = 0; i < total; i++) {
    const f = frames[i];
    fillJulia(field, w, h, 0, h, msg.view, { re: f.re, im: f.im }, msg.maxIter, f.escape2);
    paintJulia(pixels, field, w, h, 0, h, msg.maxIter, msg.colours.inside, msg.colours.slow, msg.colours.fast);
    const copy = pixels.slice();
    self.postMessage({
      kind: 'frame', token: msg.token, index: i, total, w, h, buffer: copy.buffer,
    }, [copy.buffer]);
  }
  self.postMessage({ kind: 'done', token: msg.token, total });
};
