// One clock for a station picture. The reference site keeps the same file at js/core/anim.js.
//
// A station keeps at most one animation frame. stop() cancels it, and a callback
// that was already queued does not run. Time steps use elapsed time. A gap longer
// than a frame (a hidden tab) does not move the picture. A paint is a finished
// picture. While the tab is hidden, nothing is scheduled.

export function pageHidden() {
  try {
    return typeof document !== 'undefined' && document.hidden === true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export function afterVisible(fn) {
  if (typeof document === 'undefined' || typeof fn !== 'function') return () => {};
  if (!pageHidden()) {
    fn();
    return () => {};
  }
  const on = () => {
    if (pageHidden()) return;
    document.removeEventListener('visibilitychange', on);
    fn();
  };
  document.addEventListener('visibilitychange', on);
  return () => document.removeEventListener('visibilitychange', on);
}

export function syncCanvas(canvas, ctx, opts = {}) {
  const maxDpr = Number.isFinite(opts.maxDpr) ? opts.maxDpr : 2;
  const cssW = (canvas && canvas.clientWidth) || opts.fallbackW || 640;
  const cssH = (canvas && canvas.clientHeight) || opts.fallbackH || 360;
  let raw = 1;
  try {
    if (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) raw = devicePixelRatio;
  } catch { /* no window */ }
  const dpr = Math.min(Math.max(raw, 1), Math.max(1, maxDpr));
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w;
    canvas.height = h;
  }
  if (ctx && typeof ctx.setTransform === 'function') ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cssW, cssH, dpr, w, h };
}

export function createFrame(env = {}) {
  const raf = env.raf || ((fn) => requestAnimationFrame(fn));
  const cancel = env.cancel || ((id) => cancelAnimationFrame(id));
  const hidden = env.hidden || pageHidden;
  const onVisible = env.onVisible || afterVisible;
  let id = 0;
  let token = 0;
  let held = null;
  let dropVis = null;

  function arm(fn) {
    held = fn;
    if (id) return id;
    if (hidden()) {
      if (!dropVis) {
        dropVis = onVisible(() => {
          dropVis = null;
          if (held) arm(held);
        });
      }
      return 0;
    }
    const my = ++token;
    id = raf((now) => {
      id = 0;
      const run = held;
      held = null;
      if (my !== token || typeof run !== 'function') return;
      if (hidden()) {
        held = run;
        arm(run);
        return;
      }
      run(now);
    });
    return id;
  }

  function stop() {
    token += 1;
    held = null;
    if (id) cancel(id);
    id = 0;
    if (dropVis) dropVis();
    dropVis = null;
  }

  return {
    arm,
    stop,
    get pending() { return id !== 0; },
    get held() { return held != null || dropVis != null; },
  };
}

export function elapsedMs(now, clock, stallMs = 80) {
  if (!clock.last) {
    clock.last = now;
    return now - clock.origin;
  }
  const gap = now - clock.last;
  clock.last = now;
  if (gap > stallMs) clock.origin += gap;
  return now - clock.origin;
}

export function nextFilmFrame(elapsed, frameMs, count, ready) {
  const n = count | 0;
  if (n <= 0) return { index: -1, done: true, due: -1 };
  const span = Math.max(1, Number(frameMs) || 1);
  const due = Math.min(n - 1, Math.max(0, Math.floor(elapsed / span)));
  const have = Math.max(0, ready | 0);
  const index = have <= 0 ? -1 : Math.min(due, have - 1);
  const done = elapsed >= n * span && have >= n;
  return { index, due, done };
}
