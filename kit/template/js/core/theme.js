// js/core/theme.js
// Theme helpers. No top-level DOM access, so the module imports cleanly in Node.
//
//   cssVar(name)               computed value of a CSS custom property on <html>, trimmed
//   getTheme()                 'light' | 'dark', the theme in effect right now
//   setTheme(t)                'light' | 'dark' | 'auto'; persists, then fires 'themechange' on document
//   onThemeChange(cb)          cb(theme) on every themechange; returns unsubscribe
//   prefersReducedMotion()     boolean
//   initTheme()                called once by app.js start(); returns dispose()

const KEY = 'study:theme'; // scaffold:storage-prefix — raw 'light' | 'dark'. The pre-paint script in index.html reads the same key.
const DARK_QUERY = '(prefers-color-scheme: dark)';
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function media(query) {
  try {
    return typeof matchMedia === 'function' ? matchMedia(query) : null;
  } catch {
    return null;
  }
}

export function cssVar(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

export function getTheme() {
  try {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
  } catch {
    return 'light';
  }
  const m = media(DARK_QUERY);
  return m && m.matches ? 'dark' : 'light';
}

function storedTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

// Keep the browser chrome (phone address bar) in step with --bg. index.html has one theme-color meta per colour
// scheme as the pre-JS default; once the page runs, every one of them gets the colour the page really shows, so an
// explicit theme choice wins over the OS preference.
function syncChrome() {
  try {
    const sel = 'meta[name="theme-color"]';
    const bg = cssVar('--bg');
    if (!bg) return;
    const metas = typeof document.querySelectorAll === 'function' ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)];
    for (const meta of metas) if (meta) meta.setAttribute('content', bg);
  } catch {
    /* cosmetic only */
  }
}

function announce(mode) {
  syncChrome();
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: getTheme(), mode } }));
}

export function setTheme(t) {
  if (t !== 'light' && t !== 'dark' && t !== 'auto') {
    console.warn('[mv] setTheme ignored an unknown value:', t);
    return;
  }
  const root = document.documentElement;
  if (t === 'auto') {
    root.removeAttribute('data-theme');
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* private mode: the choice lasts until reload */
    }
  } else {
    root.setAttribute('data-theme', t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* same */
    }
  }
  announce(t);
}

export function onThemeChange(cb) {
  const handler = (e) => {
    try {
      cb(e && e.detail && e.detail.theme ? e.detail.theme : getTheme());
    } catch (err) {
      console.error('[mv] themechange listener threw', err);
    }
  };
  document.addEventListener('themechange', handler);
  return () => document.removeEventListener('themechange', handler);
}

export function prefersReducedMotion() {
  const m = media(MOTION_QUERY);
  return !!(m && m.matches);
}

let initialised = false;

// Applies a stored choice (the inline script in index.html already did, before first paint),
// syncs the browser chrome, and listens for OS theme changes while the student has not chosen.
// Never fires 'themechange' by itself on start.
export function initTheme() {
  if (initialised) return () => {};
  initialised = true;
  const stored = storedTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  syncChrome();
  const m = media(DARK_QUERY);
  const onOsChange = () => {
    if (!document.documentElement.hasAttribute('data-theme')) announce('auto');
  };
  if (m) {
    if (m.addEventListener) m.addEventListener('change', onOsChange);
    else if (m.addListener) m.addListener(onOsChange);
  }
  return function dispose() {
    initialised = false;
    if (!m) return;
    if (m.removeEventListener) m.removeEventListener('change', onOsChange);
    else if (m.removeListener) m.removeListener(onOsChange);
  };
}
