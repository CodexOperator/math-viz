// Reviewer B's own A4 script, written from the acceptance text only.
export const expectedErrors = [/media\/video\/staircase-roots/, /media\/audio\/site\/staircase\/intro/, /Failed to load resource/];
export default async function (page, ctx) {
  const { assert, log } = ctx;
  const r = await page.evaluate(async () => {
    const L = await import(new URL('./js/core/listen.js', location.href).href);
    const host = document.createElement('div'); host.id = 'revB'; document.getElementById('view').appendChild(host);
    const out = {};
    const n1 = await L.videoPanel(host, 'staircase-roots');
    out.nullPanel = n1 === null; out.kids0 = host.children.length;
    const M = { VIDEOS: [{ id: 'staircase-roots', title: 'T', summary: 'S', station: 'staircase', src: 'media/video/staircase-roots.mp4', captions: 'media/video/staircase-roots.vtt', seconds: 150, narrated: false, music: false }], SITE_AUDIO: {} };
    const panel = await L.videoPanel(host, 'staircase-roots', { manifest: M });
    out.panelId = panel && panel.id;
    const v = panel.querySelector('video#video-staircase-roots-player[controls][playsinline][preload="metadata"]');
    out.video = !!v;
    out.src = !!panel.querySelector("source[src$='staircase-roots.mp4']");
    out.track = !!panel.querySelector("track[kind=captions][default][src$='staircase-roots.vtt']");
    const h2 = panel.querySelector('h2#video-staircase-roots-title'); out.h2 = h2 && h2.textContent;
    out.h2ok = !!h2 && h2.textContent.startsWith('Watch (2–3 min)');
    out.ovf = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    out.vw = v.getBoundingClientRect().width; out.pw = panel.getBoundingClientRect().width;
    panel.remove();
    const l0 = await L.listenControl(host, 'staircase');
    out.listenNull = l0 === null; out.kids1 = host.children.length;
    const M2 = { VIDEOS: [], SITE_AUDIO: { staircase: { clips: [{ id: 'intro', text: 't', src: 'media/audio/site/staircase/intro.mp3' }] } } };
    const l = await L.listenControl(host, 'staircase', { manifest: M2 });
    out.btn = !!host.querySelector('button#staircase-listen.listen[aria-pressed="false"]') && l.el === host.querySelector('button#staircase-listen');
    out.aud = !!host.querySelector('audio#staircase-listen-audio[preload="none"]');
    out.kids2 = host.children.length;
    l.destroy();
    out.kids3 = host.children.length;
    host.remove();
    return out;
  });
  log(JSON.stringify(r));
  assert(r.nullPanel && r.kids0 === 0, 'videoPanel null, host empty');
  assert(r.panelId === 'video-staircase-roots' && r.video && r.src && r.track && r.h2ok, 'panel structure');
  assert(r.ovf <= 1, 'no overflow'); assert(r.vw <= r.pw + 0.5, 'video fits');
  assert(r.listenNull && r.kids1 === 0, 'listen null');
  assert(r.btn && r.aud && r.kids2 === 2, 'listen structure');
  assert(r.kids3 === 0, 'destroy removes both');
}
