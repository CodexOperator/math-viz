// Coarse frames while a loop or a zoom is moving, then a sharp frame when it rests.
// A newer token abandons the job between bands, so a stale picture is not posted.

import { renderSet, paintSet } from './set-render.js';

let abandon = -1;

function run(msg) {
  const w = msg.w | 0;
  const h = msg.h | 0;
  if (w < 2 || h < 2) return;
  if (msg.token <= abandon) return;
  const field = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  // A moving frame is small enough to finish before the next message.
  // A sharp frame yields so a cancel can land between bands.
  if (w * h <= 24000) {
    const spec = { ...msg, field, y0: 0, y1: h };
    renderSet(spec);
    if (msg.token <= abandon) return;
    paintSet(pixels, field, spec);
    const copy = pixels.slice();
    self.postMessage({ kind: 'frame', token: msg.token, w, h, buffer: copy.buffer }, [copy.buffer]);
    return;
  }
  let y = 0;
  const band = Math.max(2, Math.ceil(h / 8));
  const step = () => {
    if (msg.token <= abandon) return;
    const y1 = Math.min(h, y + band);
    const spec = { ...msg, field, y0: y, y1 };
    renderSet(spec);
    paintSet(pixels, field, spec);
    y = y1;
    if (y < h) {
      setTimeout(step, 0);
      return;
    }
    if (msg.token <= abandon) return;
    const copy = pixels.slice();
    self.postMessage({ kind: 'frame', token: msg.token, w, h, buffer: copy.buffer }, [copy.buffer]);
  };
  step();
}

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg) return;
  if (msg.op === 'cancel') {
    abandon = msg.token;
    return;
  }
  if (msg.op === 'render') run(msg);
};
