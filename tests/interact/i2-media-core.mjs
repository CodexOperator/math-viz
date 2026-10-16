// tests/interact/i2-media-core.mjs: the media layer (acceptance criterion A4 of goal i2-media-core).
//   node tools/smoke.mjs --route staircase --script tests/interact/i2-media-core.mjs --dark --out docs/review/iter-2/i2-media-core
// Design: docs/designs/iter-2/i2-media-core.md section 7.3. Runs at desktop (1280), phone (390) and dark desktop.
// js/core/listen.js is imported in the page and driven on a fixture host appended to #view; nothing on the station itself is touched.
// The Listen steps play real audio: two short silent WAV blobs, started by a real click so the browser allows sound. When the
// environment has no audio output the script asserts the error path instead and skips the steps that need playback.

const MEDIA = String.raw`media\/(?:video\/staircase-roots\.(?:mp4|vtt)|audio\/site\/staircase\/intro\.mp3)`;

// The fake video and clip files do not exist on purpose: the failed fetches are the point of the error steps. Only these file
// names are excused; a 404 for anything else still fails the run.
export const expectedErrors = [
  new RegExp(String.raw`^HTTP 404: \S+\/` + MEDIA + '$'),
  new RegExp(String.raw`^request failed: \S+\/` + MEDIA),
  /^console\.error: Failed to load resource: the server responded with a status of 404 \(Not Found\)$/,
];

const VIDEO_ERROR = 'The video did not load. Everything else on this page works without it.';

export default async function (page, ctx) {
  const { assert, log } = ctx;
  const phone = ctx.viewport.width < 500;
  const ov = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---------- fixtures ----------
  await ev(async () => {
    const L = await import(new URL('./js/core/listen.js', location.href).href);
    const host = document.createElement('section');
    host.id = 'i2m-host';
    host.style.margin = '16px 0';
    document.getElementById('view').appendChild(host);
    const urls = [];
    // A 16-bit mono 8000 Hz PCM WAV of silence (little endian header), as a blob: URL.
    const silentWav = (seconds) => {
      const dataBytes = Math.round(seconds * 8000) * 2;
      const buf = new ArrayBuffer(44 + dataBytes);
      const dv = new DataView(buf);
      const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); dv.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE'); str(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true);
      dv.setUint32(28, 16000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, dataBytes, true);
      const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      urls.push(url);
      return url;
    };
    // Records a control's events: each listen:play with the caption text at that moment, and each listen:stop.
    const record = (listen) => {
      const rec = { plays: [], stops: [] };
      const onPlay = (e) => rec.plays.push({ detail: e.detail, caption: (document.getElementById(listen.el.id + '-caption') || {}).textContent ?? null });
      const onStop = (e) => rec.stops.push(e.detail);
      listen.el.addEventListener('listen:play', onPlay);
      listen.el.addEventListener('listen:stop', onStop);
      rec.off = () => { listen.el.removeEventListener('listen:play', onPlay); listen.el.removeEventListener('listen:stop', onStop); };
      return rec;
    };
    window.__i2m = { L, host, urls, silentWav, record, controls: [], recs: {}, extraHosts: [] };
  });
  log('fixtures ready');

  // ---------- 1. the real manifest ----------
  const s1 = await ev(async () => {
    const { L, host } = window.__i2m;
    const real = await L.loadManifest();
    const same = L.loadManifest() === L.loadManifest();
    const expectNull = L.videoFor(real, 'staircase-roots') === null;
    const r = await L.videoPanel(host, 'staircase-roots');
    const out = { same, vids: Array.isArray(real.VIDEOS), expectNull, panelNull: r === null, panelKids: host.children.length };
    if (r) r.remove();
    const valid = L.clipsFor(real, 'staircase').filter((c) => c && typeof c.id === 'string' && c.id && typeof c.src === 'string' && c.src);
    const l = await L.listenControl(host, 'staircase');
    out.listenNull = l === null; out.expectListenNull = valid.length === 0; out.listenKids = host.children.length;
    if (l) l.destroy();
    out.kidsAfter = host.children.length;
    return out;
  });
  assert(s1.same, 'loadManifest() returns the same promise every call');
  assert(s1.vids, 'the real manifest has a VIDEOS array');
  assert(s1.panelNull === s1.expectNull, `videoPanel for the real manifest is null exactly when the manifest has no staircase-roots video (${JSON.stringify(s1)})`);
  assert(s1.panelKids === (s1.expectNull ? 0 : 1), 'the host holds the panel only when there is one');
  assert(s1.listenNull === s1.expectListenNull, `listenControl for the real manifest is null exactly when there are no valid clips (${JSON.stringify(s1)})`);
  assert(s1.listenKids === (s1.expectListenNull ? 0 : 2), 'the host holds button and audio only when there are clips');
  assert(s1.kidsAfter === 0, 'the host is empty again');
  log(`1 real manifest: video ${s1.expectNull ? 'absent' : 'present'}, clips ${s1.expectListenNull ? 'absent' : 'present'}`);

  // ---------- 2. the video panel, explicit manifest (all measured in one synchronous turn) ----------
  const s2 = await ev(async () => {
    const { L, host } = window.__i2m;
    const M = { VIDEOS: [{ id: 'staircase-roots', title: 'T', summary: 'S', station: 'staircase', src: 'media/video/staircase-roots.mp4', captions: 'media/video/staircase-roots.vtt', seconds: 150, narrated: false, music: false }], SITE_AUDIO: {} };
    window.__i2m.M = M;
    const panel = await L.videoPanel(host, 'staircase-roots', { manifest: M });
    const q = (sel) => panel.querySelector(sel);
    const h2 = q('h2#video-staircase-roots-title'), sum = q('p#video-staircase-roots-summary'), video = q('video#video-staircase-roots-player');
    const err = q('p#video-staircase-roots-error');
    const pr = panel.getBoundingClientRect(), vr = video.getBoundingClientRect();
    const probe = (prop, value) => { const d = document.createElement('div'); d.style[prop] = value; host.appendChild(d); const c = getComputedStyle(d); const out = prop === 'background' ? c.backgroundColor : c.color; d.remove(); return out; };
    const cs = getComputedStyle(panel);
    return {
      id: panel.id,
      matches: panel.matches('section.panel.video-panel[data-video="staircase-roots"][data-tone="accent"]'),
      state: panel.dataset.state, narrated: panel.dataset.narrated,
      h2: h2 && h2.textContent, sum: sum && sum.textContent,
      videoOk: !!video && video.matches('[controls][playsinline][preload="metadata"]'), autoplay: video.autoplay, hasAutoplay: video.hasAttribute('autoplay'), hasLoop: video.hasAttribute('loop'),
      source: !!video.querySelector('source[src$="staircase-roots.mp4"][type="video/mp4"]'),
      track: !!video.querySelector('track[kind="captions"][default][src$="staircase-roots.vtt"]'),
      labelled: panel.getAttribute('aria-labelledby') === (h2 && h2.id), described: video.getAttribute('aria-describedby') === (sum && sum.id),
      errHidden: !!err && err.hidden === true, errRole: err && err.getAttribute('role'),
      panelW: pr.width, videoW: vr.width, videoH: vr.height,
      tokenBg: probe('background', 'var(--surface)'), panelBg: cs.backgroundColor,
      borderW: cs.borderTopWidth, borderC: cs.borderTopColor, accent: probe('color', 'var(--accent)'),
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
    };
  });
  assert(s2.id === 'video-staircase-roots' && s2.matches, 'the panel is section#video-staircase-roots.panel.video-panel with data-video and data-tone');
  assert(s2.state === 'loading' && s2.narrated === 'false', `the panel starts in state loading (got ${s2.state}) and data-narrated false`);
  assert(s2.h2 === 'Watch (2–3 min): T', `the heading is "Watch (2–3 min): T" (got "${s2.h2}")`);
  assert(s2.sum === 'S · 150 s · Silent, with captions', `the summary reads "S · 150 s · Silent, with captions" (got "${s2.sum}")`);
  assert(s2.videoOk && s2.autoplay === false && !s2.hasAutoplay && !s2.hasLoop, 'the player has controls, playsinline, preload metadata, and no autoplay or loop');
  assert(s2.source && s2.track, 'the player has a source[type=video/mp4] and a default captions track');
  assert(s2.labelled && s2.described, 'the section is labelled by its heading and the player is described by the summary');
  assert(s2.errHidden && s2.errRole === 'alert', 'the error line exists, hidden, with role alert');
  assert(s2.videoW <= s2.panelW + 0.5, `the video (${s2.videoW}) fits its panel (${s2.panelW})`);
  if (phone) assert(s2.videoW >= 250, `the video is at least 250 px wide at 390 (${s2.videoW})`);
  assert(Math.abs(s2.videoH / s2.videoW - 9 / 16) < 0.02, `the player is 16:9 (${s2.videoW} x ${s2.videoH})`);
  assert(s2.panelBg === s2.tokenBg, `the panel background is --surface (${s2.panelBg} vs ${s2.tokenBg})`);
  assert(s2.panelBg === (s2.dark ? 'rgb(21, 28, 43)' : 'rgb(255, 255, 255)'), `the surface is the ${s2.dark ? 'dark' : 'light'} one (${s2.panelBg})`);
  assert(s2.borderW === '4px' && s2.borderC === s2.accent, `the top rule is 4 px in --accent (${s2.borderW} ${s2.borderC} vs ${s2.accent})`);
  assert((await ov()) <= 1, 'no horizontal overflow with the panel');
  log(`2 video panel: ${Math.round(s2.videoW)} x ${Math.round(s2.videoH)} px in a ${Math.round(s2.panelW)} px panel`);

  // ---------- 3. the error path ----------
  await page.waitForFunction(() => { const e = document.getElementById('video-staircase-roots-error'); return !!e && !e.hidden; }, null, { timeout: 5000 });
  const s3 = await ev(() => {
    const p = document.getElementById('video-staircase-roots');
    return { state: p.dataset.state, display: document.getElementById('video-staircase-roots-player').style.display, text: document.getElementById('video-staircase-roots-error').textContent };
  });
  assert(s3.state === 'error' && s3.display === 'none', `a missing video file hides the player and sets state error (${JSON.stringify(s3)})`);
  assert(s3.text === VIDEO_ERROR, `the error sentence is "${VIDEO_ERROR}" (got "${s3.text}")`);
  await ctx.shot('video-error');
  log('3 video error path shown');

  // ---------- 4. idempotence and options ----------
  const s4 = await ev(async () => {
    const { L, host, M } = window.__i2m;
    const again = await L.videoPanel(host, 'staircase-roots', { manifest: M });
    const out = { same: again === document.getElementById('video-staircase-roots'), kids: host.children.length };
    const host2 = document.createElement('section');
    document.body.appendChild(host2);
    window.__i2m.extraHosts.push(host2);
    const titled = await L.videoPanel(host2, 'staircase-roots', { title: 'Watch', manifest: M });
    out.titled = titled && titled.querySelector('h2').textContent;
    titled.remove();
    out.noSrc = await L.videoPanel(host2, 'staircase-roots', { manifest: { VIDEOS: [{ id: 'staircase-roots', src: '' }] } });
    out.empty = await L.videoPanel(host2, 'staircase-roots', { manifest: { VIDEOS: [] } });
    out.host2Kids = host2.children.length;
    out.badContainer = await L.videoPanel(null, 'x').then(() => 'resolved', (e) => e.name);
    host2.remove();
    host.firstElementChild.remove();
    out.hostKids = host.children.length;
    return out;
  });
  assert(s4.same && s4.kids === 1, 'a second videoPanel call returns the panel already there');
  assert(s4.titled === 'Watch: T', `the title option replaces the lead text (got "${s4.titled}")`);
  assert(s4.noSrc === null && s4.empty === null && s4.host2Kids === 0, 'a video without a src, or none at all, gives null and appends nothing');
  assert(s4.badContainer === 'TypeError', `a bad container rejects with a TypeError (got ${s4.badContainer})`);
  assert(s4.hostKids === 0, 'the host is empty again');
  log('4 idempotence, title option, null cases, bad container');

  // ---------- 5. the Listen control: absent, then present ----------
  const s5 = await ev(async () => {
    const { L, host } = window.__i2m;
    const none = [
      await L.listenControl(host, 'staircase', { manifest: { VIDEOS: [], SITE_AUDIO: {} } }),
      await L.listenControl(host, 'staircase', { manifest: { SITE_AUDIO: { staircase: { title: 'x', clips: [] } } } }),
    ];
    const M2 = { VIDEOS: [], SITE_AUDIO: { staircase: { title: 'Staircase', clips: [{ id: 'intro', text: 't', src: 'media/audio/site/staircase/intro.mp3' }] } } };
    none.push(await L.listenControl(host, 'staircase', { segment: 'nope', manifest: M2 }));
    const out = { nulls: none.map((x) => x === null), kidsAbsent: host.children.length };
    const listen = await L.listenControl(host, 'staircase', { manifest: M2 });
    const r = listen.el.getBoundingClientRect();
    out.match = listen.el.matches('button#staircase-listen.listen[aria-pressed="false"]');
    out.type = listen.el.type; out.text = listen.el.textContent; out.cls = listen.el.className;
    out.audioIs = host.querySelector('audio#staircase-listen-audio[preload="none"]') === listen.audio;
    out.controls = listen.audio.hasAttribute('controls'); out.src = listen.audio.getAttribute('src');
    out.clips = listen.clips.length; out.playing = listen.playing; out.dataState = listen.el.dataset.state;
    out.fetched = performance.getEntriesByType('resource').some((e) => e.name.includes('staircase/intro.mp3'));
    out.kids = host.children.length; out.h = r.height; out.w = r.width; out.vw = innerWidth;
    out.markHidden = listen.el.querySelector('.listen-mark').hidden;
    listen.destroy();
    listen.destroy();
    out.kidsGone = host.children.length;
    out.idsGone = [document.getElementById('staircase-listen'), document.getElementById('staircase-listen-audio')].every((e) => e === null);
    const custom = await L.listenControl(host, 'staircase', { id: 'x-listen', label: 'Hear it', manifest: M2 });
    out.custom = { text: custom.el.textContent, id: custom.el.id, audio: !!document.getElementById('x-listen-audio') };
    custom.destroy();
    return out;
  });
  assert(s5.nulls.every(Boolean) && s5.kidsAbsent === 0, 'no clips, an empty clip list, or an unknown segment give null and append nothing');
  assert(s5.match && s5.type === 'button' && s5.text === 'Listen' && s5.cls === 'btn btn-quiet listen', `the Listen button is button#staircase-listen.btn.btn-quiet.listen with the text Listen (${JSON.stringify(s5)})`);
  assert(s5.audioIs && !s5.controls && s5.src === null, 'audio#staircase-listen-audio has preload none, no controls and no src');
  assert(s5.clips === 1 && s5.playing === false && s5.dataState === 'idle' && s5.markHidden, 'idle: one clip, not playing, mark hidden');
  assert(!s5.fetched && s5.kids === 2, 'nothing is fetched before a click, and the host holds exactly button and audio');
  assert(s5.h >= 43.5 && s5.w <= s5.vw, `the button is at least 44 px tall (${s5.h}) and fits the viewport (${s5.w} of ${s5.vw})`);
  assert(s5.kidsGone === 0 && s5.idsGone, 'destroy() removes both nodes, and a second destroy() does not throw');
  assert(s5.custom.text === 'Hear it' && s5.custom.id === 'x-listen' && s5.custom.audio, `the id and label options are honoured (${JSON.stringify(s5.custom)})`);
  assert((await ov()) <= 1, 'no horizontal overflow with the control');
  log(`5 listen control: absent cases, structure, ${Math.round(s5.w * 10) / 10} x ${s5.h} px`);

  // ---------- 6. playing: the happy path, started by a real click ----------
  await ev(async () => {
    const { L, host, silentWav } = window.__i2m;
    const url = silentWav(0.6);
    const M3 = { VIDEOS: [], SITE_AUDIO: { staircase: { title: 'Staircase', clips: [{ id: 'a', text: 'First clip', src: url }, { id: 'b', text: 'Second clip', src: url }] } } };
    window.__i2m.M3 = M3;
    const listen = await L.listenControl(host, 'staircase', { manifest: M3 });
    window.__i2m.controls.push(listen);
    window.__i2m.recs.main = window.__i2m.record(listen);
    window.__i2m.main = listen;
  });
  await page.click('#staircase-listen');
  let audioWorks = true;
  try {
    await page.waitForFunction(() => window.__i2m.recs.main.plays.length > 0 || document.getElementById('staircase-listen').dataset.state === 'error', null, { timeout: 3000 });
  } catch { /* neither happened: handled below as a failure of the click */ }
  const first = await ev(() => ({ plays: window.__i2m.recs.main.plays.length, state: document.getElementById('staircase-listen').dataset.state }));
  audioWorks = first.plays > 0;
  log(`6 the browser ${audioWorks ? 'plays' : 'refuses'} audio here (state ${first.state})`);
  if (audioWorks) {
    await page.waitForFunction(() => window.__i2m.recs.main.stops.length > 0, null, { timeout: 6000 });
    const s6 = await ev(() => {
      const { recs, main } = window.__i2m;
      const el = document.getElementById('staircase-listen'), cap = document.getElementById('staircase-listen-caption');
      return { plays: recs.main.plays, stops: recs.main.stops, pressed: el.getAttribute('aria-pressed'), state: el.dataset.state,
        capHidden: cap && cap.hidden, capText: cap && cap.textContent, src: main.audio.getAttribute('src'), clip: el.dataset.clip,
        markHidden: el.querySelector('.listen-mark').hidden, playing: main.playing };
    });
    assert(s6.plays.length === 2, `two clips played (${JSON.stringify(s6.plays)})`);
    assert(JSON.stringify(s6.plays.map((p) => p.detail)) === JSON.stringify([{ station: 'staircase', segment: 'a', index: 0, count: 2 }, { station: 'staircase', segment: 'b', index: 1, count: 2 }]),
      `listen:play details are clip a then clip b (${JSON.stringify(s6.plays)})`);
  assert(JSON.stringify(s6.plays.map((p) => p.caption)) === JSON.stringify(['1 of 2 · First clip', '2 of 2 · Second clip']), `the transcript line follows the clip (${JSON.stringify(s6.plays.map((p) => p.caption))})`);
    assert(JSON.stringify(s6.stops) === JSON.stringify([{ station: 'staircase', reason: 'ended', index: 1 }]), `one listen:stop, reason ended, after the last clip (${JSON.stringify(s6.stops)})`);
    assert(s6.pressed === 'false' && s6.state === 'idle' && s6.playing === false, `idle again (${JSON.stringify(s6)})`);
    assert(s6.capHidden === true && s6.capText === '' && s6.src === null && s6.clip === undefined && s6.markHidden, `the transcript is hidden and emptied, the src released, the mark hidden (${JSON.stringify(s6)})`);
    log('6 two clips chained, transcript followed, one listen:stop(ended)');
  } else {
    const s6 = await ev(() => {
      const el = document.getElementById('staircase-listen'), err = document.getElementById('staircase-listen-error');
      return { state: el.dataset.state, pressed: el.getAttribute('aria-pressed'), role: err && err.getAttribute('role'), mark: el.querySelector('.listen-mark').textContent };
    });
    assert(s6.state === 'error' && s6.pressed === 'false' && s6.role === 'alert' && s6.mark === '!', `no audio output: the control shows its error state (${JSON.stringify(s6)})`);
    await page.click('#staircase-listen');
    await page.waitForTimeout(300);
    const lines = await ev(() => document.querySelectorAll('#staircase-listen-error').length);
    assert(lines <= 1, `a second press does not stack error lines (${lines})`);
    log('6 error path (no audio output)');
  }
  await ev(() => { const w = window.__i2m; w.recs.main.off(); w.main.destroy(); w.controls.length = 0; });

  // ---------- 7 to 9: stop, restart, keyboard, segment mode, preemption, destroy while playing (need real playback) ----------
  if (audioWorks) {
    await ev(async () => {
      const { L, host, silentWav } = window.__i2m;
      const url = silentWav(3);
      const M4 = { VIDEOS: [], SITE_AUDIO: { staircase: { title: 'Staircase', clips: [{ id: 'a', text: 'First clip', src: url }, { id: 'b', text: 'Second clip', src: url }] } } };
      const listen = await L.listenControl(host, 'staircase', { manifest: M4 });
      const l2 = await L.listenControl(host, 'staircase', { id: 'seg', segment: 'b', manifest: M4 });
      Object.assign(window.__i2m, { c1: listen, c2: l2 });
      window.__i2m.recs.c1 = window.__i2m.record(listen);
      window.__i2m.recs.c2 = window.__i2m.record(l2);
      listen.stop();                                       // idle: nothing to announce
    });
    const idleStops = await ev(() => window.__i2m.recs.c1.stops.length);
    assert(idleStops === 0, 'stop() while idle fires no listen:stop');
    const playsOf = (k) => ev((key) => window.__i2m.recs[key].plays.length, k);
    const waitPlay = (k, n) => page.waitForFunction(([key, count]) => window.__i2m.recs[key].plays.length >= count, [k, n], { timeout: 3000 });
    const pressed = (id) => ev((i) => document.getElementById(i).getAttribute('aria-pressed'), id);

    // 7. stop, restart, keyboard
    await page.click('#staircase-listen');
    await waitPlay('c1', 1);
    assert((await pressed('staircase-listen')) === 'true', 'playing: aria-pressed is true');
    await ctx.shot('listen-playing');
    await page.click('#staircase-listen');
    const s7 = await ev(() => {
      const { recs, c1 } = window.__i2m;
      return { reasons: recs.c1.stops.map((s) => s.reason), pressed: document.getElementById('staircase-listen').getAttribute('aria-pressed'), paused: c1.audio.paused, src: c1.audio.getAttribute('src') };
    });
    assert(JSON.stringify(s7.reasons) === JSON.stringify(['stopped']) && s7.pressed === 'false' && s7.paused === true && s7.src === null, `a second click stops it (${JSON.stringify(s7)})`);
    await page.focus('#staircase-listen');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.getElementById('staircase-listen').getAttribute('aria-pressed') === 'true', null, { timeout: 1500 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('staircase-listen').getAttribute('aria-pressed') === 'false', null, { timeout: 1500 });
    log('7 stop on second click; Space starts and Enter stops from the keyboard');

    // 8. segment mode and preemption
    const seg = await ev(() => ({ n: window.__i2m.c2.clips.length, id: window.__i2m.c2.clips[0].id }));
    assert(seg.n === 1 && seg.id === 'b', `the segment control holds only clip b (${JSON.stringify(seg)})`);
    const before = await playsOf('c1');
    await page.click('#staircase-listen');
    await waitPlay('c1', before + 1);
    await page.click('#seg');
    await waitPlay('c2', 1);
    const s8 = await ev(() => {
      const { recs } = window.__i2m;
      const last = recs.c1.stops[recs.c1.stops.length - 1];
      return { last: last && last.reason, c1: document.getElementById('staircase-listen').getAttribute('aria-pressed'), c2: document.getElementById('seg').getAttribute('aria-pressed'), caption: document.getElementById('seg-caption') !== null };
    });
    assert(s8.last === 'preempted' && s8.c1 === 'false' && s8.c2 === 'true', `starting another Listen preempts the first (${JSON.stringify(s8)})`);
    assert(!s8.caption, 'single-segment mode makes no transcript line');
    log('8 segment mode and preemption');

    // 9. destroy while playing
    const s9 = await ev(() => {
      const { host, c2, recs } = window.__i2m;
      const reasons = [];
      const on = (e) => reasons.push(e.detail.reason);
      host.addEventListener('listen:stop', on);
      const audio = c2.audio;
      c2.destroy();
      host.removeEventListener('listen:stop', on);
      recs.c2.stops.length = 0;
      return { reasons, gone: document.getElementById('seg') === null && document.getElementById('seg-audio') === null, paused: audio.paused };
    });
    assert(JSON.stringify(s9.reasons) === JSON.stringify(['destroyed']) && s9.gone && s9.paused, `destroy() while playing stops it, says so once, and removes the nodes (${JSON.stringify(s9)})`);
    log('9 destroy while playing');
  } else {
    log('7 to 9 skipped: this browser has no audio output');
  }

  // ---------- 10. teardown ----------
  // Controls are destroyed before the host goes, and their recorders are removed first: a removed playing <audio> pauses itself,
  // and a late event must not reach a listener that reads window.__i2m after it was deleted.
  await ev(() => {
    const w = window.__i2m;
    for (const rec of Object.values(w.recs)) rec.off();
    for (const c of [w.c1, w.c2]) if (c) c.destroy();
    for (const url of w.urls) URL.revokeObjectURL(url);
    for (const h of w.extraHosts) h.remove();
    w.host.remove();
    delete window.__i2m;
  });
  const left = await ev(() => ({ host: !!document.getElementById('i2m-host'), ids: ['staircase-listen', 'seg', 'x-listen', 'video-staircase-roots'].filter((i) => document.getElementById(i)) }));
  assert(!left.host && left.ids.length === 0, `no fixture is left on the page (${JSON.stringify(left)})`);
  assert((await ov()) <= 1, 'no horizontal overflow at the end');
  log('10 teardown clean');
}
