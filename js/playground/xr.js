// WebXR session open, without a headset in the tests.
// immersive-ar is preferred when the caller asks for it and the device allows it.
// immersive-vr is the other real mode. A missing device, or a session the browser
// refuses, comes back as a reason. The caller writes the fallback line.

export function sessionModes(prefer) {
  return prefer === 'ar' ? ['immersive-ar', 'immersive-vr'] : ['immersive-vr', 'immersive-ar'];
}

function featuresFor(mode, hitRequired) {
  if (mode === 'immersive-ar' && hitRequired) {
    return { requiredFeatures: ['hit-test'], optionalFeatures: ['local-floor', 'hand-tracking'] };
  }
  return { optionalFeatures: ['local-floor', 'hit-test', 'hand-tracking'] };
}

// xr is navigator.xr. prefer is 'ar' or 'vr'.
export async function requestImmersive(xr, prefer) {
  if (!xr || typeof xr.isSessionSupported !== 'function' || typeof xr.requestSession !== 'function') {
    return { ok: false, reason: 'missing' };
  }
  let mode = null;
  for (const m of sessionModes(prefer)) {
    let supported = false;
    try { supported = await xr.isSessionSupported(m); } catch { supported = false; }
    if (supported) { mode = m; break; }
  }
  if (!mode) return { ok: false, reason: 'unsupported' };
  try {
    const session = await xr.requestSession(mode, featuresFor(mode, mode === 'immersive-ar'));
    return { ok: true, mode, session };
  } catch (err) {
    if (mode === 'immersive-ar') {
      try {
        const session = await xr.requestSession(mode, featuresFor(mode, false));
        return { ok: true, mode, session };
      } catch (err2) {
        return { ok: false, reason: 'rejected', error: String((err2 && err2.message) || err2) };
      }
    }
    return { ok: false, reason: 'rejected', error: String((err && err.message) || err) };
  }
}

// A select from a controller or a hand. The event may carry a plane point.
// Otherwise the caller supplies the centre it already knows.
export function selectPoint(ev, fallback = [0, 0]) {
  const raw = ev && (ev.point || (ev.detail && ev.detail.point));
  if (Array.isArray(raw) && raw.length >= 2 && Number.isFinite(+raw[0]) && Number.isFinite(+raw[1])) {
    return [+raw[0], +raw[1]];
  }
  const fb = Array.isArray(fallback) ? fallback : [0, 0];
  return [Number.isFinite(+fb[0]) ? +fb[0] : 0, Number.isFinite(+fb[1]) ? +fb[1] : 0];
}

export function bindSelect(session, onSelect, fallback) {
  if (!session || typeof session.addEventListener !== 'function' || typeof onSelect !== 'function') return () => {};
  const handler = (ev) => {
    const fb = typeof fallback === 'function' ? fallback() : fallback;
    onSelect(selectPoint(ev, fb), ev);
  };
  session.addEventListener('select', handler);
  return () => {
    if (typeof session.removeEventListener === 'function') session.removeEventListener('select', handler);
  };
}
