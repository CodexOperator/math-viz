// One clock for a station picture.
//
// A station keeps at most one animation frame. stop() cancels it, and a callback
// that was already queued does not run. Time steps use elapsed time. A gap longer
// than a frame (a hidden tab) does not move the picture. Reduced motion is the
// caller's branch: this module only reports it. A paint is a finished picture;
// nothing here publishes a strip.
//
// createFrame is a paint. createMotion is a play button. While a motion runs, the
// control that started it says Pause. cancel() is that second click: the picture
// stays where it is. The caller does not start a motion when the page should step.

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

// Register fn for the next time the tab is visible. If it already is, fn runs now.
// The return value removes the listener and is safe to call twice.
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

// Backing store for a CSS box. The bitmap matches the device pixels up to maxDpr,
// so a 1:1 blit is sharp. Returns css size and device size.
export function syncCanvas(canvas, ctx, opts = {}) {
  const maxDpr = Number.isFinite(opts.maxDpr) ? opts.maxDpr : 3;
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

// At most one requestAnimationFrame. stop() drops it. A queued callback whose
// token was bumped does not call fn. While the tab is hidden, nothing is scheduled.
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

// Move a clock forward by elapsed time. A gap above stallMs is time the tab
// was hidden: it does not advance origin. Returns milliseconds since origin.
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

// Which film frame is due. Frames that are not ready yet are not skipped:
// index stays on the last ready frame, and done waits until the last one exists.
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

// One play clock. run(ms, onFrame(u), onDone) moves u from 0 to 1.
// onFrame may return 'hold' to keep going after u reaches 1, so a picture
// can catch a seam it is not allowed to skip. drive(onFrame(dtMs)) keeps
// going until onFrame returns false. cancel() drops a queued callback.
// A hidden tab does not advance time. A gap longer than a frame does not either.
export function createMotion(env) {
  const frame = createFrame(env);
  let token = 0;
  let active = false;

  function cancel() {
    token += 1;
    active = false;
    frame.stop();
  }

  function prime(clock, now) {
    clock.origin = now;
    // elapsedMs treats a last of 0 as "never". A timestamp of 0 still has to count.
    clock.last = now || 1e-6;
  }

  function run(ms, onFrame, onDone) {
    cancel();
    const my = ++token;
    active = true;
    const dur = Math.max(1, Number(ms) || 1);
    const clock = { origin: 0, last: 0 };
    let primed = false;
    const tick = (now) => {
      if (my !== token) return;
      if (!primed) {
        primed = true;
        prime(clock, now);
      }
      const elapsed = elapsedMs(now, clock);
      const u = Math.min(1, Math.max(0, elapsed / dur));
      const held = typeof onFrame === 'function' ? onFrame(u) : undefined;
      if (my !== token) return;
      if (u < 1 || held === 'hold') frame.arm(tick);
      else {
        active = false;
        if (typeof onDone === 'function') onDone();
      }
    };
    frame.arm(tick);
  }

  function drive(onFrame) {
    cancel();
    const my = ++token;
    active = true;
    const clock = { origin: 0, last: 0 };
    let primed = false;
    let prev = 0;
    const tick = (now) => {
      if (my !== token) return;
      if (!primed) {
        primed = true;
        prime(clock, now);
        prev = 0;
      }
      const elapsed = elapsedMs(now, clock);
      const dt = Math.max(0, elapsed - prev);
      prev = elapsed;
      const keep = typeof onFrame === 'function' ? onFrame(dt) : false;
      if (my !== token) return;
      if (keep === false) {
        active = false;
        return;
      }
      frame.arm(tick);
    };
    frame.arm(tick);
  }

  return {
    run,
    drive,
    cancel,
    get running() { return active || frame.pending || frame.held; },
  };
}
