// One deep-zoom picture, off the main thread.
// A newer token drops the old pass at the next band. The page paints only
// a finished band-set, never a strip.

import { startPass, renderBand, finishPass } from './deep-zoom.js';
import { paintJulia } from './fractal.js';

let latest = 0;

function drop(token) {
  self.postMessage({ token, dropped: true });
}

function run(msg) {
  const my = msg.token | 0;
  latest = my;
  const pass = startPass({
    kind: msg.kind,
    re: msg.re,
    im: msg.im,
    cRe: msg.cRe,
    cIm: msg.cIm,
    log10Width: msg.log10Width,
    w: msg.w | 0,
    h: msg.h | 0,
    draft: !!msg.draft,
    series: true,
    directBudget: msg.directBudget | 0,
  });
  if (!pass) {
    drop(my);
    return;
  }
  let y = 0;
  const band = Math.max(2, Math.ceil(pass.h / 8));
  const step = () => {
    if (my !== latest) {
      drop(my);
      return;
    }
    const y1 = Math.min(pass.h, y + band);
    renderBand(pass, y, y1);
    y = y1;
    if (y < pass.h) {
      setTimeout(step, 0);
      return;
    }
    if (my !== latest) {
      drop(my);
      return;
    }
    const done = finishPass(pass);
    let inside = 0;
    let outside = 0;
    for (let i = 0; i < done.field.length; i++) {
      if (done.field[i] < 0) inside += 1;
      else outside += 1;
    }
    const pixels = new Uint8ClampedArray(done.w * done.h * 4);
    const colours = msg.colours || {};
    paintJulia(
      pixels, done.field, done.w, done.h, 0, done.h, done.maxIter,
      colours.inside, colours.slow, colours.fast,
    );
    const copy = pixels.slice();
    self.postMessage({
      token: my,
      w: done.w,
      h: done.h,
      buffer: copy.buffer,
      maxIter: done.maxIter,
      skipped: done.skipped,
      glitches: done.glitches,
      glitchLeft: done.glitchLeft,
      digits: done.digits,
      log10Width: done.log10Width,
      draft: !!msg.draft,
      inside,
      outside,
    }, [copy.buffer]);
  };
  setTimeout(step, 0);
}

self.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || !(msg.token > 0)) return;
  if (msg.op === 'cancel') {
    if (msg.token > latest) latest = msg.token;
    return;
  }
  if (msg.op !== 'render') return;
  run(msg);
};
