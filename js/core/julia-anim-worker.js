// Renders Julia frames off the page thread.
//
// A render job posts one coarse frame at a time, then says it is done. The page
// then asks for a sharp frame of the index on screen (and the next one), at the
// size it asked for. Only that frame is large, so the stored film stays small.

import { fillJulia, paintJulia } from './fractal.js';

function postSharp(msg) {
  const w = msg.w | 0;
  const h = msg.h | 0;
  if (w < 2 || h < 2) return;
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
  let i = 0;
  // Yield after each stored frame so a sharp frame for the picture on screen
  // can run before the rest of the film is stored.
  const step = () => {
    if (i >= total) {
      self.postMessage({ kind: 'done', token: msg.token, total });
      return;
    }
    const f = frames[i];
    fillJulia(field, w, h, 0, h, msg.view, { re: f.re, im: f.im }, msg.maxIter, f.escape2);
    paintJulia(pixels, field, w, h, 0, h, msg.maxIter, inside, slow, fast);
    const copy = pixels.slice();
    const index = i;
    i += 1;
    self.postMessage({
      kind: 'frame', token: msg.token, index, total, w, h, buffer: copy.buffer,
    }, [copy.buffer]);
    setTimeout(step, 0);
  };
  step();
};
