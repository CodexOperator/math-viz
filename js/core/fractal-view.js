// js/core/fractal-view.js — paint a float field into a plane.
//
// A pass is drawn only when it is finished. While the pointer is moving, that
// pass is one coarse picture per frame. A second request while that coarse pass
// is still painting lets it finish, so one picture can span several frames.
// The pass reads hooks.sample once, when it begins, and every band of that
// picture gets the same value. When the pointer rests, a picture the size of
// the plane's own pixels replaces it. A hidden tab drops the pass and asks for
// the sharp picture again when the tab is visible. Reduced motion skips the
// coarse pass.

import { pageHidden } from './anim.js';

export const FINAL_EDGE = 1400;
const FINAL_CAP = FINAL_EDGE;

export function attachFractal(plane, hooks) {
  const bmp = document.createElement('canvas');
  const bctx = bmp.getContext('2d', { willReadFrequently: true });
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d', { willReadFrequently: true });
  let img = null;
  let field = null;
  let job = 0;
  let rafId = 0;
  let generation = 0;
  let phase = 'idle';
  let crisp = false;
  let suspended = false;
  let pendingAfter = false;
  let owed = false;
  let want = null;
  let running = null;
  let settleTimer = 0;

  const layer = plane.addLayer((ctx, p) => {
    if (!bmp.width || !bctx) return;
    const canvas = p.canvas;
    const match = !!(canvas && bmp.width === canvas.width && bmp.height === canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    if (match && crisp) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bmp, 0, 0);
    } else {
      const sz = p.getSize();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bmp, 0, 0, sz.w, sz.h);
    }
    ctx.restore();
  }, { order: -20 });

  function reduced() {
    return !!hooks.reduced;
  }

  function budgetMs() {
    return Number.isFinite(hooks.budgetMs) ? hooks.budgetMs : 8;
  }

  function nowMs() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function deviceSize() {
    const canvas = plane.canvas;
    if (canvas && canvas.width >= 2 && canvas.height >= 2) return { w: canvas.width, h: canvas.height };
    const sz = plane.getSize();
    return { w: Math.max(2, Math.round(sz.w || 2)), h: Math.max(2, Math.round(sz.h || 2)) };
  }

  function sampleSize(draft) {
    const css = plane.getSize();
    const longCss = Math.max(css.w, css.h, 2);
    if (draft) {
      const cap = hooks.draftEdge || 188;
      const target = Math.max(64, Math.min(cap, Math.round(longCss)));
      return {
        w: Math.max(2, Math.round(target * (css.w / longCss))),
        h: Math.max(2, Math.round(target * (css.h / longCss))),
      };
    }
    const dev = deviceSize();
    const cap = hooks.finalEdge || FINAL_CAP;
    const long = Math.max(dev.w, dev.h, 2);
    const scale = Math.min(1, cap / long);
    return {
      w: Math.max(2, Math.round(dev.w * scale)),
      h: Math.max(2, Math.round(dev.h * scale)),
    };
  }

  function frameView() {
    const v = plane.getView();
    const c = v.center || {};
    return {
      centerRe: c.re, centerIm: c.im,
      centerReLo: c.reLo || 0, centerImLo: c.imLo || 0,
      unitsAcross: v.unitsAcross,
    };
  }

  function emit(next) {
    phase = next;
    if (hooks.onStatus) {
      hooks.onStatus({ phase, generation, crisp, w: bmp.width, h: bmp.height });
    }
  }

  function cancelFrame() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function clearSettle() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = 0;
  }

  function publish(run) {
    if (bmp.width !== run.w || bmp.height !== run.h) {
      bmp.width = run.w;
      bmp.height = run.h;
    }
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, bmp.width, bmp.height);
    bctx.drawImage(work, 0, 0);
    const dev = deviceSize();
    crisp = !run.draft && run.w === dev.w && run.h === dev.h;
    plane.requestDraw();
  }

  function armSettle() {
    clearSettle();
    settleTimer = setTimeout(() => {
      settleTimer = 0;
      if (suspended) return;
      if (pageHidden()) { owed = true; return; }
      request(false);
    }, 90);
  }

  function begin(draft) {
    const useDraft = !!draft && !reduced();
    const sz = plane.getSize();
    if (!wctx || !bctx || sz.w < 2 || sz.h < 2) return;
    const my = ++job;
    const { w, h } = sampleSize(useDraft);
    if (!field || field.length !== w * h) field = new Float32Array(w * h);
    if (work.width !== w || work.height !== h) {
      work.width = w;
      work.height = h;
    }
    if (!img || img.width !== w || img.height !== h) img = wctx.createImageData(w, h);
    // One configuration for every band. A root that moves while this pass is
    // still painting does not mix into the bitmap that gets published.
    const sample = typeof hooks.sample === 'function' ? hooks.sample() : undefined;
    running = { job: my, draft: useDraft, w, h, y: 0, view: frameView(), sample };
    // A finished picture stays up, and keeps its name, until the next one is published.
    // 'drawing' is only the first paint, when nothing finished is on screen yet.
    if (!useDraft && phase !== 'draft' && phase !== 'ready') emit('drawing');
    schedule();
  }

  function takeWant() {
    if (!want || suspended || pageHidden()) return;
    const next = want.draft;
    want = null;
    begin(next);
  }

  function finish(run) {
    if (run.job !== job) return;
    publish(run);
    running = null;
    if (run.draft) {
      emit('draft');
      if (want) takeWant();
      else armSettle();
      return;
    }
    generation += 1;
    emit('ready');
    if (want) takeWant();
  }

  function step() {
    rafId = 0;
    const run = running;
    if (!run || run.job !== job) return;
    if (pageHidden()) {
      owed = true;
      running = null;
      job += 1;
      return;
    }
    const budget = budgetMs();
    const colours = hooks.colours();
    // A first slice stays small, then the next slice is sized from the time that one took.
    // budget <= 0 still paints exactly one slice, so a pass is never published on that frame.
    if (!run.rows) run.rows = Math.max(1, Math.min(12, run.h));
    const t0 = nowMs();
    let bands = 0;
    do {
      const y0 = run.y;
      const y1 = Math.min(run.h, y0 + run.rows);
      const bandT = nowMs();
      hooks.fill(field, run.w, run.h, y0, y1, run.view, run.sample);
      if (run.job !== job) return;
      hooks.paint(img.data, field, run.w, run.h, y0, y1, colours);
      wctx.putImageData(img, 0, 0, 0, y0, run.w, y1 - y0);
      run.y = y1;
      bands += 1;
      if (budget > 0) {
        const took = Math.max(0.05, nowMs() - bandT);
        const fit = Math.floor((budget * 0.75) / (took / Math.max(1, y1 - y0)));
        run.rows = Math.max(1, Math.min(40, run.h, fit || 1));
      }
      if (budget <= 0 || bands >= 4) break;
    } while (run.y < run.h && nowMs() - t0 < budget);
    if (run.job !== job) return;
    if (run.y < run.h) {
      schedule();
      return;
    }
    finish(run);
  }

  function schedule() {
    if (rafId || !running) return;
    if (pageHidden()) {
      owed = true;
      running = null;
      job += 1;
      return;
    }
    rafId = requestAnimationFrame(step);
  }

  function request(draft) {
    const wantDraft = !!draft && !reduced();
    if (suspended) { pendingAfter = true; return; }
    if (pageHidden()) { owed = true; return; }
    clearSettle();
    if (want) {
      if (!wantDraft) want.draft = false;
      return;
    }
    if (running) {
      if (running.draft && wantDraft) {
        want = { draft: true };
        return;
      }
      job += 1;
      running = null;
      cancelFrame();
    }
    begin(wantDraft);
  }

  function suspend() {
    suspended = true;
    pendingAfter = false;
    owed = false;
    want = null;
    running = null;
    job += 1;
    cancelFrame();
    clearSettle();
  }

  function resume() {
    suspended = false;
    if (!pendingAfter) return;
    pendingAfter = false;
    request(false);
  }

  // The bitmap already on screen is the final. Name it ready and do not paint it again.
  function adopt() {
    const sz = sampleSize(false);
    const matches = bmp.width === sz.w && bmp.height === sz.h && bmp.width >= 2;
    if (!matches) return false;
    suspended = false;
    pendingAfter = false;
    owed = false;
    job += 1;
    running = null;
    want = null;
    cancelFrame();
    clearSettle();
    const dev = deviceSize();
    crisp = bmp.width === dev.w && bmp.height === dev.h;
    generation += 1;
    emit('ready');
    return true;
  }

  function present(image) {
    if (!bctx || !image || !image.width || !image.height) return;
    job += 1;
    running = null;
    want = null;
    cancelFrame();
    clearSettle();
    if (bmp.width !== image.width || bmp.height !== image.height) {
      bmp.width = image.width;
      bmp.height = image.height;
    }
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.putImageData(image, 0, 0);
    const dev = deviceSize();
    crisp = image.width === dev.w && image.height === dev.h;
    plane.requestDraw();
    if (hooks.onStatus) {
      hooks.onStatus({ phase, generation, crisp, w: bmp.width, h: bmp.height });
    }
  }

  function onVis() {
    if (pageHidden()) {
      owed = true;
      if (running) {
        running = null;
        job += 1;
        cancelFrame();
      }
      clearSettle();
      return;
    }
    if (owed && !suspended) {
      owed = false;
      request(false);
    }
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onVis);
  }

  const offView = plane.on('viewchange', () => {
    if (suspended) return;
    request(!reduced());
  });

  function destroy() {
    job += 1;
    running = null;
    want = null;
    suspended = true;
    cancelFrame();
    clearSettle();
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', onVis);
    }
    offView();
    layer.remove();
    field = null;
    img = null;
  }

  return {
    request,
    suspend,
    resume,
    adopt,
    present,
    destroy,
    generation: () => generation,
    phase: () => phase,
    get pending() { return rafId !== 0 || running != null || settleTimer !== 0; },
  };
}
