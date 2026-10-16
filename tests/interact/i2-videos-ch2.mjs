// tests/interact/i2-videos-ch2.mjs: the two films are served, captioned and wired (acceptance criterion A1, the browser half).
//   node tools/smoke.mjs --route mappings,derivative --script tests/interact/i2-videos-ch2.mjs --out docs/review/iter-2/i2-videos-ch2
// Design: docs/designs/iter-2/i2-videos-ch2.md section 7.3. Runs at desktop (1280), phone (390) (and dark with --dark).
// Nothing on the stations is touched. On each route the script checks both films through the manifest (so a missing render is one
// clear failure), then builds the video panel of the film that belongs to the route (or inspects the one the station embeds) and
// reads back what the browser parsed: the structure, the captions as text-track cues and the width at this viewport.
// The harness' Chromium may lack the H.264 decoder: then the panel ends in data-state="error", which is accepted (and logged);
// structure and cues are asserted either way.

const FILMS = [
  { id: 'motion-time', station: 'mappings', beats: ['intro', 'stroke', 'linear', 'square', 'recip', 'paper'] },
  { id: 'zoom-cr', station: 'derivative', beats: ['intro', 'ring', 'move', 'quotient', 'mirror', 'cr', 'abs2'] },
];

// A decoder that is missing is not a bug of the film. Only the two film files are excused, and only for a failed media load.
export const expectedErrors = [
  /^request failed: \S+\/media\/video\/(?:motion-time|zoom-cr)\.mp4/,
  /^console\.error: .*(?:DEMUXER_ERROR|PIPELINE_ERROR|MEDIA_ERR_SRC_NOT_SUPPORTED|Failed to load because no supported source)/,
];

export default async function (page, ctx) {
  const { assert, log, route } = ctx;
  const phone = ctx.viewport.width < 500;
  const mine = FILMS.find((f) => f.station === route) || FILMS[0];

  // The dev server of the harness serves .mp4 and .vtt as application/octet-stream; serve the real bytes with the right types, as GitHub Pages does.
  await page.route('**/media/video/*', async (r) => {
    const res = await r.fetch();
    const url = r.request().url();
    const type = /\.vtt(?:[?#]|$)/.test(url) ? 'text/vtt; charset=utf-8' : /\.mp4(?:[?#]|$)/.test(url) ? 'video/mp4' : res.headers()['content-type'];
    await r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': type } });
  });

  // ---------- 1. the manifest lists both films (written by tools/videos/render.mjs) ----------
  const manifest = await page.evaluate(async () => {
    const m = await import(new URL('./media/manifest.js', location.href).href);
    return m.VIDEOS.map((v) => ({ id: v.id, station: v.station, src: v.src, captions: v.captions, seconds: v.seconds, title: v.title, summary: v.summary }));
  });
  for (const f of FILMS) {
    const v = manifest.find((x) => x.id === f.id);
    assert(v, `media/manifest.js has no entry for "${f.id}" (run: node tools/videos/render.mjs --only motion-time,zoom-cr --quality l)`);
    assert(v.station === f.station, `${f.id}: station is "${v.station}", want "${f.station}"`);
    assert(v.src === `media/video/${f.id}.mp4`, `${f.id}: src is "${v.src}"`);
    assert(v.captions === `media/video/${f.id}.vtt`, `${f.id}: captions is "${v.captions}"`);
    assert(v.seconds >= 120 && v.seconds <= 180, `${f.id}: ${v.seconds} s is outside 120..180`);
  }
  log('manifest lists both films with their stations, sources and captions');

  // ---------- 2. captions equal the narration, cue by cue (fetched as text, parsed here) ----------
  for (const f of FILMS) {
    const r = await page.evaluate(async (id) => {
      const n = await (await fetch(`media/narration/videos/${id}.json`)).json();
      const vtt = await (await fetch(`media/video/${id}.vtt`)).text();
      const cues = vtt.replace(/\r/g, '').split(/\n\n+/).map((b) => b.trim().split('\n')).filter((l) => l.some((x) => /-->/.test(x)))
        .map((l) => { const i = l.findIndex((x) => /-->/.test(x)); const m = l[i].match(/(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)/);
          const s = (a, b, c, d) => +a * 3600 + +b * 60 + +c + +d / 1000; return { start: s(...m.slice(1, 5)), end: s(...m.slice(5, 9)), text: l.slice(i + 1).join('\n') }; });
      return { segments: n.segments, cues, head: vtt.slice(0, 6) };
    }, f.id);
    assert(r.head === 'WEBVTT', `${f.id}.vtt does not start with WEBVTT`);
    assert(r.cues.length === r.segments.length && r.cues.length === f.beats.length, `${f.id}: ${r.cues.length} cues, ${r.segments.length} segments`);
    r.cues.forEach((c, i) => {
      assert(r.segments[i].id === f.beats[i], `${f.id}: segment ${i} is "${r.segments[i].id}", want "${f.beats[i]}"`);
      assert(c.text.trim() === r.segments[i].text.trim(), `${f.id}: cue ${i} (${f.beats[i]}) text differs from the narration`);
      assert(c.end > c.start && (i === 0 ? Math.abs(c.start) < 0.001 : Math.abs(c.start - r.cues[i - 1].end) < 0.002), `${f.id}: cue ${i} timing`);
    });
    const v = manifest.find((x) => x.id === f.id);
    assert(Math.abs(r.cues[r.cues.length - 1].end - v.seconds) <= 1.5, `${f.id}: last cue ends at ${r.cues[r.cues.length - 1].end}, manifest says ${v.seconds} s`);
  }
  log('captions equal the narration, cue by cue, in order');

  // ---------- 3. the mp4 is an mp4 and under the size limit ----------
  for (const f of FILMS) {
    const r = await page.evaluate(async (id) => {
      const buf = await (await fetch(`media/video/${id}.mp4`)).arrayBuffer();
      const b = new Uint8Array(buf);
      return { size: b.length, ftyp: String.fromCharCode(...b.slice(4, 8)) };
    }, f.id);
    assert(r.ftyp === 'ftyp', `${f.id}.mp4 does not start with an ISO box (got "${r.ftyp}")`);
    assert(r.size > 200000 && r.size < 15 * 1024 * 1024, `${f.id}.mp4 is ${r.size} bytes, want 200 kB to 15 MB`);
  }
  log('both mp4 files are real mp4 files under 15 MB');

  // ---------- 4. the panel in a real browser (the station's own, or a fixture built with listen.js) ----------
  const id = mine.id;
  const r = await page.evaluate(async ({ id, phone }) => {
    const view = document.getElementById('view');
    let panel = document.getElementById('video-' + id);
    const embedded = !!panel;
    if (!panel) {
      const L = await import(new URL('./js/core/listen.js', location.href).href);
      const host = document.createElement('section');
      host.id = 'i2v-host';
      view.appendChild(host);
      panel = await L.videoPanel(host, id);
    }
    if (!panel) return { error: `videoPanel(${id}) resolved null: the manifest has no usable entry` };
    const video = panel.querySelector('video');
    const track = panel.querySelector('track');
    const out = {
      embedded,
      structure: !!(video && video.hasAttribute('controls') && video.hasAttribute('playsinline') && video.getAttribute('preload') === 'metadata'),
      source: (panel.querySelector('source') || {}).getAttribute ? panel.querySelector('source').getAttribute('src') : null,
      track: track ? { kind: track.getAttribute('kind'), def: track.hasAttribute('default'), src: track.getAttribute('src') } : null,
      title: (panel.querySelector('h2') || {}).textContent || '',
      summary: (panel.querySelector('p.muted') || {}).textContent || '',
    };
    if (track) {
      track.track.mode = 'hidden';                                     // load the cues without drawing them
      await new Promise((res) => {
        const done = () => res();
        if (track.readyState === 2) return res();
        track.addEventListener('load', done); track.addEventListener('error', done); setTimeout(done, 5000);
      });
      out.readyState = track.readyState;
      const cues = track.track.cues ? [...track.track.cues] : [];
      out.cues = cues.map((c) => ({ start: c.startTime, end: c.endTime, text: c.text }));
    }
    await new Promise((res) => { const t0 = performance.now(); const tick = () => (panel.getAttribute('data-state') !== 'loading' || performance.now() - t0 > 4000 ? res() : setTimeout(tick, 100)); tick(); });
    out.state = panel.getAttribute('data-state');
    const rect = panel.getBoundingClientRect();
    out.width = rect.width; out.vw = document.documentElement.clientWidth;
    out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    // placement: a station embeds the panel after its first picture (a canvas or an svg), never before it
    const pic = view.querySelector('canvas, svg');
    out.afterPicture = pic ? !!(panel.compareDocumentPosition(pic) & Node.DOCUMENT_POSITION_PRECEDING) : null;
    out.audio = !!(panel.querySelector('audio'));
    const host = document.getElementById('i2v-host');
    if (host) host.remove();
    return out;
  }, { id, phone });
  assert(!r.error, r.error);
  assert(r.structure, `${id}: the video needs controls, playsinline and preload="metadata"`);
  assert(r.source === `media/video/${id}.mp4`, `${id}: source is "${r.source}"`);
  assert(r.track && r.track.kind === 'captions' && r.track.def && r.track.src === `media/video/${id}.vtt`, `${id}: needs <track kind="captions" default src=".../${id}.vtt">`);
  assert(/^Watch \(2–3 min\)/.test(r.title), `${id}: panel heading is "${r.title}"`);
  assert(/Silent, with captions|With voice and captions/.test(r.summary), `${id}: summary line is "${r.summary}"`);
  assert(r.readyState === 2 && r.cues.length === mine.beats.length, `${id}: the browser parsed ${r.cues ? r.cues.length : 'no'} cues (readyState ${r.readyState}), want ${mine.beats.length}`);
  assert(r.cues.every((c, i) => c.end > c.start && (i === 0 || c.start >= r.cues[i - 1].start)), `${id}: parsed cues must be in order`);
  assert(r.state === 'ready' || r.state === 'error', `${id}: panel still "${r.state}" after 4 s`);
  if (r.state === 'error') log('this Chromium cannot decode the H.264 stream: structure and captions checked, playback not');
  assert(r.width <= r.vw + 0.5, `${id}: the panel is ${r.width}px wide in a ${r.vw}px viewport`);
  assert(r.overflow <= 1, `${id}: the page overflows by ${r.overflow}px`);
  if (r.embedded) assert(r.afterPicture !== false, `${id}: the embedded panel comes before the station's first picture`);
  else log(`(not embedded on #${route} yet: that is i2-decisions-everywhere; the fixture panel was checked instead)`);
  log(`${id}: panel ok at ${phone ? 'phone' : 'desktop'} width (${Math.round(r.width)} px), ${r.cues.length} cues parsed by the browser`);
}
