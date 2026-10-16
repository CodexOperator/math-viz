// tests/interact/i2-videos-ch1.mjs: the two Chapter 1 videos, as far as a browser can check them
// (acceptance criteria A1 and the manifest half of A3 of goal i2-videos-ch1).
//   node tools/smoke.mjs --route addresses --script tests/interact/i2-videos-ch1.mjs
//   node tools/smoke.mjs --route staircase --script tests/interact/i2-videos-ch1.mjs
// Design: docs/designs/iter-2/i2-videos-ch1.md section 7.3. Runs at desktop (1280) and phone (390).
// The files come from `node tools/videos/render.mjs --only two-addresses,staircase-roots`; the stills of A3 are looked at by a person.
// Nothing here depends on a station having embedded the video yet: when the page has no panel for it, the script builds one with
// js/core/listen.js on a fixture host, which checks the manifest-to-panel contract the stations rely on.

const VIDEO_OF_ROUTE = { addresses: 'two-addresses', staircase: 'staircase-roots' };
const STATION_OF_VIDEO = { 'two-addresses': 'addresses', 'staircase-roots': 'staircase' };
const SEGMENTS = {
  'two-addresses': ['intro', 'cart', 'polar', 'same', 'add', 'mul', 'rule', 'euler'],
  'staircase-roots': ['intro', 'names', 'set', 'home', 'jump', 'power', 'roots', 'principal', 'branch'],
};
const MAX_BYTES = 15_000_000;

// Tearing the panel down while the browser is still fetching the video aborts that request, which the harness reports as a failed
// request. Only these two file names are excused; a missing file still fails the HTTP 200 check below.
export const expectedErrors = [/^request failed: \S+\/media\/video\/(?:two-addresses|staircase-roots)\.(?:mp4|vtt)$/];

export default async function (page, ctx) {
  const { assert, log, route, viewport } = ctx;
  const id = VIDEO_OF_ROUTE[route];
  if (!id) { log(`route "${route}" carries no Chapter 1 video: nothing to check`); return; }
  const phone = viewport.width < 500;
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // 1. The generated manifest lists the video with the station, the paths and a length of 2 to 3 minutes.
  const entry = await ev(async (id) => {
    const m = await import(new URL('./media/manifest.js', location.href).href);
    return (m.VIDEOS || []).find((v) => v.id === id) || null;
  }, id);
  assert(entry, `media/manifest.js has no VIDEOS entry "${id}" (run node tools/videos/render.mjs --only ${id})`);
  assert(entry.station === STATION_OF_VIDEO[id], `${id}: station is "${entry.station}", expected "${STATION_OF_VIDEO[id]}"`);
  assert(entry.src === `media/video/${id}.mp4`, `${id}: src is ${entry.src}`);
  assert(entry.captions === `media/video/${id}.vtt`, `${id}: captions is ${entry.captions}`);
  assert(entry.seconds >= 118 && entry.seconds <= 182, `${id}: ${entry.seconds} s is outside 2 to 3 minutes`);
  assert(typeof entry.title === 'string' && entry.title.length > 0 && entry.summary.length >= 40, `${id}: title and summary are present`);
  log(`manifest: ${id} ${entry.seconds} s, station ${entry.station}, narrated ${entry.narrated}`);

  // 2. The captions are the narration: one cue per segment, in order, the same text, back to back from 0.
  const data = await ev(async (entry) => {
    const [n, v] = await Promise.all([fetch(`media/narration/videos/${entry.id}.json`).then((r) => r.json()), fetch(entry.captions).then((r) => r.text())]);
    const cues = v.replace(/\r/g, '').split(/\n\n+/).slice(1).filter((b) => b.trim()).map((b) => {
      const lines = b.split('\n');
      const m = lines[1].match(/^(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)$/);
      const t = (a, b2, c, d) => Number(a) * 3600 + Number(b2) * 60 + Number(c) + Number(d) / 1000;
      return { start: t(m[1], m[2], m[3], m[4]), end: t(m[5], m[6], m[7], m[8]), text: lines.slice(2).join('\n').trim() };
    });
    return { head: v.split('\n')[0], narration: n, cues };
  }, entry);
  const segs = data.narration.segments;
  assert(data.head.trim() === 'WEBVTT', `${id}: the .vtt does not start with WEBVTT`);
  assert(segs.map((s) => s.id).join() === SEGMENTS[id].join(), `${id}: segment ids are ${segs.map((s) => s.id).join()}`);
  assert(data.cues.length === segs.length, `${id}: ${data.cues.length} cues for ${segs.length} segments`);
  data.cues.forEach((c, i) => {
    assert(c.text === segs[i].text, `${id}: cue ${i + 1} text differs from segment "${segs[i].id}"`);
    assert(c.end > c.start, `${id}: cue ${i + 1} has no length`);
    if (i === 0) assert(Math.abs(c.start) < 0.01, `${id}: the first cue starts at ${c.start}`);
    else assert(Math.abs(c.start - data.cues[i - 1].end) < 0.01, `${id}: cue ${i + 1} does not follow cue ${i}`);
  });
  const total = data.cues[data.cues.length - 1].end;
  assert(total >= 120 && total <= 180, `${id}: captions end at ${total.toFixed(1)} s, outside 120 to 180`);
  log(`captions: ${data.cues.length} cues, ending at ${total.toFixed(1)} s`);

  // 3. The video file is there, is an MP4 and is under 15 MB.
  const file = await ev(async (src) => {
    const r = await fetch(src);
    const buf = new Uint8Array(await r.arrayBuffer());
    return { status: r.status, bytes: buf.length, ftyp: String.fromCharCode(...buf.slice(4, 8)) };
  }, entry.src);
  assert(file.status === 200, `${id}: ${entry.src} answers HTTP ${file.status}`);
  assert(file.ftyp === 'ftyp', `${id}: ${entry.src} is not an MP4 (box "${file.ftyp}")`);
  assert(file.bytes > 200000 && file.bytes <= MAX_BYTES, `${id}: ${entry.src} is ${file.bytes} bytes (limit ${MAX_BYTES})`);
  log(`file: ${(file.bytes / 1048576).toFixed(2)} MB`);

  // 4. The video panel: the station's own if it already embeds the video, else one built with listen.js on a fixture host.
  let host = null;
  let panelId = `video-${id}`;
  await page.waitForSelector(`#${panelId}`, { timeout: 2500 }).catch(() => {});       // a station builds its panel a moment after load
  const embedded = await ev((pid) => !!document.getElementById(pid), panelId);
  if (!embedded) {
    const built = await ev(async (id) => {
      const L = await import(new URL('./js/core/listen.js', location.href).href);
      const h = document.createElement('section');
      h.id = 'i2v-host';
      document.getElementById('view').appendChild(h);
      const p = await L.videoPanel(h, id);
      return !!p;
    }, id);
    assert(built, `listen.js videoPanel(host, "${id}") resolved null although the manifest lists the video`);
    host = true;
  }
  log(embedded ? `panel: the station embeds ${panelId}` : `panel: built on a fixture host (the station does not embed ${id} yet)`);
  const canPlay = await ev((pid) => !!document.getElementById(`${pid}-player`).canPlayType('video/mp4; codecs="avc1.42E01E"'), panelId);
  const panel = await ev(async ({ pid }) => {
    const el = document.getElementById(pid);
    const video = document.getElementById(`${pid}-player`);
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = video.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    const track = video.querySelector('track');
    const src = video.querySelector('source');
    return {
      heading: (document.getElementById(`${pid}-title`) || {}).textContent || '',
      controls: video.hasAttribute('controls'), playsinline: video.hasAttribute('playsinline'), preload: video.getAttribute('preload'),
      autoplay: video.hasAttribute('autoplay'), loop: video.hasAttribute('loop'),
      track: track ? { kind: track.getAttribute('kind'), def: track.hasAttribute('default'), src: track.getAttribute('src') } : null,
      source: src ? src.getAttribute('src') : video.getAttribute('src'),
      w: r.width, h: r.height, pw: pr.width, vw: window.innerWidth, over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, { pid: panelId });
  assert(panel.heading.startsWith('Watch (2\u20133 min)'), `${id}: panel heading is "${panel.heading}"`);
  assert(panel.controls && panel.playsinline && panel.preload === 'metadata', `${id}: the player needs controls, playsinline and preload="metadata"`);
  assert(!panel.autoplay && !panel.loop, `${id}: the player must not autoplay or loop`);
  assert(panel.track && panel.track.kind === 'captions' && panel.track.def && panel.track.src === entry.captions, `${id}: the captions track is missing or wrong (${JSON.stringify(panel.track)})`);
  assert(panel.source === entry.src, `${id}: the player source is ${panel.source}`);
  assert(panel.over <= 1, `${id}: the page scrolls sideways by ${panel.over}px with the panel`);
  if (phone) assert(panel.pw >= 300 && panel.pw <= panel.vw, `${id}: on a phone the panel is ${panel.pw}px wide in a ${panel.vw}px viewport`);
  else assert(panel.pw >= 400, `${id}: on a desktop the panel is only ${panel.pw}px wide`);
  log(`panel: ${Math.round(panel.pw)} px wide, player ${Math.round(panel.w)} x ${Math.round(panel.h)} px`);

  // 5. When the browser can decode H.264 the player is 16:9 and the metadata says the same length as the manifest. The harness's
  // Chromium cannot decode it: listen.js then hides the player and shows its error line, and this step is skipped.
  if (canPlay) {
    assert(Math.abs(panel.w / panel.h - 16 / 9) < 0.03, `${id}: the player is ${panel.w} x ${panel.h}, not 16:9`);
    if (phone) assert(panel.w >= 280 && panel.w <= panel.vw - 16, `${id}: on a phone the player is ${panel.w}px wide in a ${panel.vw}px viewport`);
    const dur = await ev((pid) => new Promise((res) => {
      const v = document.getElementById(`${pid}-player`);
      if (v.readyState >= 1) return res(v.duration);
      v.addEventListener('loadedmetadata', () => res(v.duration), { once: true });
      v.addEventListener('error', () => res(-1), { once: true });
      setTimeout(() => res(-2), 5000);
    }), panelId);
    assert(dur > 0 && Math.abs(dur - entry.seconds) <= 1.5, `${id}: the browser read a duration of ${dur} s, the manifest says ${entry.seconds} s`);
    log(`metadata: ${dur.toFixed(1)} s`);
  } else {
    log('this browser has no H.264 decoder: the 16:9 and metadata checks are skipped');
  }
  if (host) await ev(() => document.getElementById('i2v-host')?.remove());
}
