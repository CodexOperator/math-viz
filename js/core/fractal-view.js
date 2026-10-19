// js/core/fractal-view.js — paint a float field into a plane, live, without blocking the page.
//
// The slow part is the iteration. Drags in one frame collapse to a single coarse picture.
// When the pointer rests, a finer picture replaces it. Reduced motion skips the coarse pass
// so the picture does not flash from chunky to fine.
//
// Browser only. The math stays in fractal.js.

export function attachFractal(plane, hooks) {
  const bmp = document.createElement('canvas');
  const bctx = bmp.getContext('2d', { willReadFrequently: true });
  let img = null;
  let field = null;
  let job = 0;
  let stripRaf = 0;
  let queueRaf = 0;
  let sharpen = 0;
  let generation = 0;
  let phase = 'idle';
  let queued = false;
  let queuedDraft = true;
  let suspended = false;
  let pendingAfter = false;

  const layer = plane.addLayer((ctx, p) => {
    if (!bmp.width || !bctx) return;
    const sz = p.getSize();
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(bmp, 0, 0, sz.w, sz.h);
    ctx.restore();
  }, { order: -20 });

  function sampleSize(draft) {
    const sz = plane.getSize();
    const long = Math.max(sz.w, sz.h, 2);
    const cap = draft ? (hooks.draftEdge || 188) : (hooks.finalEdge || 380);
    const target = Math.max(64, Math.min(cap, Math.round(long)));
    return {
      w: Math.max(2, Math.round(target * (sz.w / long))),
      h: Math.max(2, Math.round(target * (sz.h / long))),
    };
  }

  function frameView() {
    const v = plane.getView();
    return { centerRe: v.center.re, centerIm: v.center.im, unitsAcross: v.unitsAcross };
  }

  function kick(draft) {
    const useDraft = draft && !hooks.reduced;
    const my = ++job;
    cancelAnimationFrame(stripRaf);
    clearTimeout(sharpen);
    const sz = plane.getSize();
    if (!bctx || sz.w < 2 || sz.h < 2) return;
    const { w, h } = sampleSize(useDraft);
    if (!field || field.length !== w * h) field = new Float32Array(w * h);
    if (!img || img.width !== w || img.height !== h) {
      bmp.width = w;
      bmp.height = h;
      img = bctx.createImageData(w, h);
    }
    const view = frameView();
    const colours = hooks.colours();
    const rowsPer = useDraft ? h : Math.max(24, Math.ceil(h / 5));
    let y = 0;
    phase = useDraft ? 'draft' : 'drawing';
    if (hooks.onStatus) hooks.onStatus({ phase, generation });

    function step() {
      if (my !== job) return;
      const y1 = Math.min(h, y + rowsPer);
      hooks.fill(field, w, h, y, y1, view);
      hooks.paint(img.data, field, w, h, y, y1, colours);
      bctx.putImageData(img, 0, 0);
      plane.requestDraw();
      y = y1;
      if (y < h) {
        stripRaf = requestAnimationFrame(step);
        return;
      }
      if (useDraft) {
        phase = 'draft';
        if (hooks.onStatus) hooks.onStatus({ phase, generation });
        sharpen = setTimeout(() => request(false), 90);
        return;
      }
      generation += 1;
      phase = 'ready';
      if (hooks.onStatus) hooks.onStatus({ phase, generation });
    }
    step();
  }

  // One picture per frame. A settled request (draft false) beats a coarse one already waiting.
  function request(draft) {
    if (suspended) { pendingAfter = true; return; }
    if (!queued) queuedDraft = !!draft;
    else if (!draft) queuedDraft = false;
    if (queued) return;
    queued = true;
    queueRaf = requestAnimationFrame(() => {
      queued = false;
      kick(queuedDraft);
    });
  }

  // Hold the current picture. A request made while held is played once, when resume() is called.
  function suspend() {
    suspended = true;
    pendingAfter = false;
    job += 1;
    queued = false;
    cancelAnimationFrame(stripRaf);
    cancelAnimationFrame(queueRaf);
    clearTimeout(sharpen);
  }

  function resume() {
    suspended = false;
    if (!pendingAfter) return;
    pendingAfter = false;
    request(false);
  }

  // Show one pre-rendered frame in the same layer as the live picture.
  function present(image) {
    if (!bctx || !image || !image.width || !image.height) return;
    if (bmp.width !== image.width || bmp.height !== image.height) {
      bmp.width = image.width;
      bmp.height = image.height;
    }
    bctx.putImageData(image, 0, 0);
    plane.requestDraw();
  }

  const offView = plane.on('viewchange', () => {
    // A full picture is cheap (a few tens of milliseconds), so pan and zoom stay sharp.
    request(false);
  });

  function destroy() {
    job += 1;
    queued = false;
    cancelAnimationFrame(stripRaf);
    cancelAnimationFrame(queueRaf);
    clearTimeout(sharpen);
    offView();
    layer.remove();
    field = null;
    img = null;
  }

  return {
    request,
    suspend,
    resume,
    present,
    destroy,
    generation: () => generation,
    phase: () => phase,
  };
}
