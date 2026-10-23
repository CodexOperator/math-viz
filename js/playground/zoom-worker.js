// Deep zoom, off the main thread. Float64, tiles of 64. The page posts one bake at a time.
// A newer bake bumps the token, and the old tiles stop at the next yield.

import { bakeImage } from './field.js';

let token = 0;

self.onmessage = async (ev) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'bake') return;
  const my = ++token;
  const w = msg.w | 0;
  const h = msg.h | 0;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const tile = 64;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      if (my !== token) return;
      bakeImage({
        w, h,
        comp: msg.comp,
        ink: msg.ink,
        maxIter: msg.maxIter,
        rgba,
        x0: x,
        x1: Math.min(w, x + tile),
        y0: y,
        y1: Math.min(h, y + tile),
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  if (my !== token) return;
  self.postMessage({ id: msg.id, rgba, w, h }, [rgba.buffer]);
};
