// tests/interact/_helpers.mjs
// Helpers for interaction scripts (run by tools/smoke.mjs --script). Playwright's `page` is always passed in,
// so this file has no imports and its pure functions can be imported by Node unit tests.
//
//   planePixel(page, planeId, z)        viewport coordinates of a plane point (window.__mv.planes.get(planeId).toPixel + canvas rect)
//   dragHandle(page, handleId, z, { steps, modifiers })   real mouse drag of a handle button to the plane point z; modifiers: ['Alt'] holds those keys for the whole drag
//   dragHandleAround(page, handleId, {center, radius, startAngle, turns, steps}, onStep)   one continuous circular drag
//   clickChip(page, id), readText(page, selector), setSlider(page, id, value)
//   settle(page, frames), handleZ(page, handleId), readHandleLabel(page, handleId)
//   pure: planeIdOfHandle, nums, parseCart   (nums reads a spaced minus as a sign: "3 - 2i" gives [3, -2]; parseCart gives {re, im})

// 'home-demo-plane-z' -> 'home-demo-plane' (a handle id is `${plane.id}-${point id}`).
export function planeIdOfHandle(handleId) {
  const i = handleId.lastIndexOf('-');
  if (i <= 0) throw new Error(`planeIdOfHandle: "${handleId}" has no "-segment"`);
  return handleId.slice(0, i);
}

const asZ = (z) => (typeof z === 'number' ? { re: z, im: 0 } : { re: Number(z.re), im: Number(z.im ?? 0) });
const byId = (id) => `[id="${String(id).replace(/"/g, '\\"')}"]`;

// Wait for N animation frames (explainers and planes update once per frame); capped at 250 ms.
export async function settle(page, frames = 2) {
  await page.evaluate((n) => new Promise((res) => {
    let k = 0;
    const t = setTimeout(res, 250);
    const step = () => { if (++k >= n) { clearTimeout(t); res(); } else requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), frames);
}

// Viewport coordinates (what page.mouse wants) of plane point z. Scrolls the canvas to the middle of the viewport first.
export async function planePixel(page, planeId, z) {
  z = asZ(z);
  const r = await page.evaluate(({ planeId, z }) => {
    const planes = window.__mv && window.__mv.planes;
    const p = planes && planes.get(planeId);
    if (!p) return { error: `no plane "${planeId}" in window.__mv.planes (have: ${planes ? [...planes.keys()].join(', ') : 'none'})` };
    p.canvas.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });      // the page may use smooth scrolling
    const rect = p.canvas.getBoundingClientRect(), q = p.toPixel(z);
    return { x: rect.left + q.x, y: rect.top + q.y, vw: window.innerWidth, vh: window.innerHeight };
  }, { planeId, z });
  if (r.error) throw new Error(r.error);
  if (r.x < 0 || r.y < 0 || r.x > r.vw || r.y > r.vh) {
    throw new Error(`planePixel: (${z.re}, ${z.im}) on "${planeId}" is at (${r.x.toFixed(1)}, ${r.y.toFixed(1)}), outside the ${r.vw}x${r.vh} viewport`);
  }
  return { x: r.x, y: r.y };
}

// { re, im } read from the handle button's data-re / data-im.
export async function handleZ(page, handleId) {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`no element #${id}`);
    return { re: Number(el.dataset.re), im: Number(el.dataset.im) };
  }, handleId);
}

// The handle button's aria-label ("z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)").
export async function readHandleLabel(page, handleId) {
  return page.evaluate((id) => document.getElementById(id).getAttribute('aria-label'), handleId);
}

// The DOM first (the plane element carries data-plane-id), string slicing second, so a point id with a hyphen cannot break it.
async function planeIdFor(page, handleId) {
  const fromDom = await page.evaluate((id) => {
    const el = document.getElementById(id);
    const pl = el && el.closest('.plane');
    return pl ? pl.dataset.planeId : null;
  }, handleId);
  return fromDom || planeIdOfHandle(handleId);
}

// Mouse-drag the handle button to the plane point z with real pointer events. Returns the handle's final { re, im }.
// modifiers: keys held down for the whole drag, for example ['Alt'] (the plane reports altKey in the onDrag info); released afterwards.
export async function dragHandle(page, handleId, z, { steps = 12, modifiers = [] } = {}) {
  z = asZ(z);
  const loc = page.locator(byId(handleId));
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  const planeId = await planeIdFor(page, handleId);
  const target = await planePixel(page, planeId, z);          // scrolls the canvas to the middle of the viewport, THEN measures
  const box = await loc.boundingBox();                         // viewport coordinates, measured after that scroll (no scroll in between)
  if (!box) throw new Error(`dragHandle: #${handleId} has no bounding box`);
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };     // the hit area's centre is the dot's centre
  const covered = await page.evaluate(({ x, y, id }) => {
    const top = document.elementFromPoint(x, y), el = document.getElementById(id);
    return top && !el.contains(top) ? `${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}` : null;
  }, { x: from.x, y: from.y, id: handleId });
  if (covered) throw new Error(`dragHandle: #${handleId} is covered by ${covered}`);
  for (const k of modifiers) await page.keyboard.down(k);
  try {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: Math.max(1, steps) });
    await page.mouse.up();
  } finally {
    for (const k of [...modifiers].reverse()) await page.keyboard.up(k);        // never leave a key pressed if the drag throws
  }
  await settle(page);
  return handleZ(page, handleId);
}

// ONE continuous mouse press: grab the handle, move to the start point, walk around the circle, release.
//   total = max(1, round(|turns| * steps));  angle_i = startAngle + sign(turns) * 2 pi |turns| i / total,  i = 0..total
//   onStep(page, angle_i, i) runs after every position (i = 0 is the start point), so a script can assert between steps.
export async function dragHandleAround(page, handleId, { center = { re: 0, im: 0 }, radius = 1.5, startAngle = 0, turns = 1, steps = 48 } = {}, onStep) {
  const loc = page.locator(byId(handleId));
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  const planeId = await planeIdFor(page, handleId);
  const o = await planePixel(page, planeId, { re: 0, im: 0 });
  const u = await planePixel(page, planeId, { re: 1, im: 0 });
  const scale = u.x - o.x;                                     // the view does not change during a handle drag
  const at = (angle) => ({ x: o.x + scale * (center.re + radius * Math.cos(angle)), y: o.y - scale * (center.im + radius * Math.sin(angle)) });
  const total = Math.max(1, Math.round(Math.abs(turns) * steps)), dir = turns < 0 ? -1 : 1;
  const box = await loc.boundingBox();
  if (!box) throw new Error(`dragHandleAround: #${handleId} has no bounding box`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    const first = at(startAngle);
    await page.mouse.move(first.x, first.y, { steps: 8 });
    await settle(page, 1);
    if (onStep) await onStep(page, startAngle, 0);
    for (let i = 1; i <= total; i++) {
      const angle = startAngle + dir * 2 * Math.PI * Math.abs(turns) * i / total;
      const p = at(angle);
      await page.mouse.move(p.x, p.y);
      await settle(page, 1);
      if (onStep) await onStep(page, angle, i);
    }
  } finally {
    await page.mouse.up();                                     // never leave the button pressed if onStep throws
    await settle(page);
  }
  return handleZ(page, handleId);
}

export async function clickChip(page, id) {
  const loc = page.locator(byId(id));
  await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
  await loc.click({ timeout: 5000 });
  await settle(page);
}

// Trimmed textContent of the first match ('' if absent).
export async function readText(page, selector) {
  return page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent.trim() : ''; }, selector);
}

// Sets value, dispatches 'input' and 'change'. Returns the value the control actually took (ranges clamp and snap to step).
export async function setSlider(page, id, value) {
  const actual = await page.evaluate(({ id, value }) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`no element #${id}`);
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return Number(el.value);
  }, { id, value });
  await settle(page);
  return actual;
}

// ---- pure text helpers for assertions (Node-importable) ----

// Every number in the text, in order, with its sign. A minus counts as a sign when a digit follows it, with or without a
// space, so the spaced form of a handle label reads right: "z = 3 - 2i; r = 3.606, θ = -0.588" -> [3, -2, 3.606, -0.588]
// and "z = -1 + 1.732i; r = 2, θ = 2.094" -> [-1, 1.732, 2, 2.094] ("+ 1.732" stays positive).
// For a whole Cartesian string such as "3 - 2i" prefer parseCart(), which returns { re, im }.
export function nums(text) {
  return (String(text).match(/-?\s*\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || []).map((m) => Number(m.replace(/\s+/g, '')));
}

// "5 + 14i", "-0.5 - i", "2i", "-i", "i", "3", "3 - 2i", "1.5e-3 + 2i" -> { re, im }; ASCII only; null if it does not parse.
export function parseCart(text) {
  const s = String(text).replace(/\s+/g, '');
  if (!s) return null;
  let split = -1;                                              // the last + or - that is not the leading sign and does not follow an exponent 'e'
  for (let i = s.length - 1; i > 0; i--) if ((s[i] === '+' || s[i] === '-') && !/[eE]/.test(s[i - 1])) { split = i; break; }
  const pureNum = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
  const coef = (t) => (t === '' || t === '+' ? 1 : t === '-' ? -1 : Number(t));
  if (split < 0) {
    if (s.endsWith('i')) {
      const co = s.slice(0, -1);
      return (co === '' || co === '+' || co === '-' || pureNum.test(co)) ? { re: 0, im: coef(co) } : null;
    }
    return pureNum.test(s) ? { re: Number(s), im: 0 } : null;
  }
  const a = s.slice(0, split), b = s.slice(split);
  if (!b.endsWith('i') || !pureNum.test(a)) return null;
  const co = b.slice(0, -1);
  return (co === '+' || co === '-' || pureNum.test(co)) ? { re: Number(a), im: coef(co) } : null;
}
