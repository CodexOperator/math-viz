import { settle } from '../../../../../tests/interact/_helpers.mjs';
export default async function (page, ctx) {
  await page.waitForFunction(() => document.getElementById('video-two-addresses'), null, { timeout: 8000 }).catch(() => {});
  const info = await page.evaluate(() => {
    const host = document.getElementById('addresses-video-host'), plane = document.getElementById('addresses-plane-host'), p = document.getElementById('video-two-addresses');
    const v = p && p.querySelector('video');
    const rect = (e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), left: Math.round(r.left) }; };
    return { panel: !!p, inside: !!p && host.contains(p), after: !!(plane.compareDocumentPosition(host) & 4), video: v ? { controls: v.controls, preload: v.preload, playsinline: v.playsInline, track: !!v.querySelector('track[kind=captions][default]'), src: v.currentSrc || (v.querySelector('source') || {}).src } : null, heading: p ? (p.querySelector('h2,h3') || {}).textContent : null, plane: rect(plane), host: rect(host), over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  ctx.log(JSON.stringify(info));
  ctx.assert(info.panel && info.inside && info.after, 'video panel present and placed after plane');
  ctx.assert(info.over <= 1, 'overflow');
  await page.evaluate(() => document.getElementById('addresses-video-host').scrollIntoView({ block: 'center' }));
  await settle(page, 3);
  await page.screenshot({ path: `${process.cwd()}/docs/review/iter-2/i2-decisions-everywhere-a/reviewB/clips/${ctx.label}--video.png` });
}
