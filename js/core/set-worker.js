// Coarse frames while a loop or a zoom is moving, then a sharp frame when it rests.
// The page stamps the main picture and the companion with one shared token.
// A render yields before it works. A newer token, or a cancel, drops it before
// the next band, so a job that is already stale does not run. A band that has
// started finishes that band, then stops.

import { renderSet, paintSet } from './set-render.js';
import { frameIsCurrent } from './render-epoch.js';

let latest = -1;
let abandon = -1;

function drop(token) {
  self.postMessage({ kind: 'frame', token, dropped: true });
}

function postBitmap(msg, pixels) {
  const copy = pixels.slice();
  self.postMessage({
    kind: 'frame', token: msg.token, w: msg.w | 0, h: msg.h | 0, buffer: copy.buffer,
  }, [copy.buffer]);
}

function run(msg) {
  const w = msg.w | 0;
  const h = msg.h | 0;
  if (w < 2 || h < 2) return;
  const field = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  // Yield once, so a newer token already in the queue is the one that runs.
  // A short moving frame then finishes. It was the latest when it started.
  // A sharp frame yields between bands, and a cancel stops it there.
  setTimeout(() => {
    if (msg.token !== latest) {
      drop(msg.token);
      return;
    }
    if (w * h <= 24000) {
      const spec = { ...msg, field, y0: 0, y1: h };
      renderSet(spec);
      paintSet(pixels, field, spec);
      postBitmap(msg, pixels);
      return;
    }
    let y = 0;
    const band = Math.max(2, Math.ceil(h / 8));
    const step = () => {
      if (!frameIsCurrent(msg.token, latest, abandon)) {
        drop(msg.token);
        return;
      }
      const y1 = Math.min(h, y + band);
      const spec = { ...msg, field, y0: y, y1 };
      renderSet(spec);
      paintSet(pixels, field, spec);
      y = y1;
      if (y < h) {
        setTimeout(step, 0);
        return;
      }
      if (!frameIsCurrent(msg.token, latest, abandon)) {
        drop(msg.token);
        return;
      }
      postBitmap(msg, pixels);
    };
    step();
  }, 0);
}

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || !(msg.token > 0)) return;
  if (msg.op === 'cancel') {
    if (msg.token > abandon) abandon = msg.token;
    return;
  }
  if (msg.op !== 'render') return;
  if (msg.token < latest) {
    drop(msg.token);
    return;
  }
  latest = msg.token;
  run(msg);
};
