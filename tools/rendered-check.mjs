// Headless check for the Live / Rendered film switch.
// Serves this repo and opens the Mandelbrot and cardioid stops at 1280, 700, and 390,
// light and dark. The portrait cut is the one under 600px. Nothing autoplays.
// Run: node tools/rendered-check.mjs

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jsonl': 'application/jsonl',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

let failed = 0;
function check(name, cond, extra = '') {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, extra);
  } else {
    console.log('ok  ', name);
  }
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = normalize(join(root, pathname));
      if (!file.startsWith(normalize(root))) {
        res.writeHead(403);
        res.end('no');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      const buf = await readFile(file);
      const type = TYPES[extname(file)] || 'application/octet-stream';
      const range = req.headers.range;
      if (range && extname(file) === '.mp4') {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match) {
          res.writeHead(416);
          res.end();
          return;
        }
        const size = buf.length;
        let start = match[1] === '' ? Math.max(0, size - Number(match[2] || 0)) : Number(match[1]);
        let end = match[1] !== '' && match[2] !== '' ? Number(match[2]) : size - 1;
        if (!(start >= 0) || start >= size || end < start) {
          res.writeHead(416, { 'content-range': `bytes */${size}` });
          res.end();
          return;
        }
        end = Math.min(end, size - 1);
        const chunk = buf.subarray(start, end + 1);
        res.writeHead(206, {
          'content-type': type,
          'content-range': `bytes ${start}-${end}/${size}`,
          'accept-ranges': 'bytes',
          'content-length': String(chunk.length),
          'cache-control': 'no-store',
        });
        res.end(chunk);
        return;
      }
      res.writeHead(200, {
        'content-type': type,
        'accept-ranges': 'bytes',
        'content-length': String(buf.length),
        'cache-control': 'no-store',
      });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('missing');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function startChrome(userDataDir) {
  return new Promise((resolve, reject) => {
    const chrome = spawn('google-chrome', [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`Chrome did not start\n${buf}`)), 20000);
    const onData = (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!match) return;
      clearTimeout(timer);
      chrome.stderr.off('data', onData);
      chrome.stderr.on('data', () => {});
      resolve({ chrome, browserWs: match[1] });
    };
    chrome.stderr.on('data', onData);
    chrome.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function openPage(browserWs) {
  const port = new URL(browserWs).port;
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let next = 0;
  const pending = new Map();
  const bags = { exceptions: [], console: [], bad: [], urls: [] };
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') bags.exceptions.push(msg.params.exceptionDetails?.text || 'exception');
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      bags.console.push(msg.params.args?.map((a) => a.value || a.description).join(' '));
    }
    if (msg.method === 'Network.responseReceived') {
      const { response } = msg.params;
      bags.urls.push(response.url);
      if (response.status >= 400) bags.bad.push(`${response.status} ${response.url}`);
    }
  });
  const send = (method, params = {}) => {
    const id = ++next;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  return { ws, send, bags, close: () => ws.close() };
}

async function waitFor(send, expression, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result?.value) return result.result.value;
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error(`timeout: ${expression}`);
}

async function evalJson(send, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || expression);
  return result.result?.value;
}

function shotName(station, width, theme, mode) {
  return `${station}-${width}-${theme}-${mode}.png`;
}

async function snap(send, file) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(file, Buffer.from(data, 'base64'));
}

const PROBE = (id) => `(() => {
  const live = document.getElementById('${id}-picture-live');
  const film = document.getElementById('${id}-picture-rendered');
  const video = document.getElementById('${id}-rendered-video');
  const figure = document.getElementById('${id}-rendered');
  const pair = document.getElementById('${id}-pair');
  const credit = document.getElementById('${id}-rendered-credit');
  const sources = video ? [...video.querySelectorAll('source')].map((s) => ({ media: s.getAttribute('media') || '', src: s.getAttribute('src') })) : [];
  const de = document.documentElement;
  return {
    ready: !!(live && film && video),
    liveChecked: !!(live && live.checked),
    filmChecked: !!(film && film.checked),
    paused: !!(video && video.paused),
    autoplay: !!(video && video.autoplay),
    muted: !!(video && video.muted),
    controls: !!(video && video.controls),
    playsInline: !!(video && video.playsInline),
    preload: video ? video.preload : '',
    poster: video ? video.poster : '',
    cut: video ? video.dataset.cut : '',
    figureHidden: !!(figure && figure.hidden),
    pairHidden: !!(pair && pair.hidden),
    credit: credit ? credit.textContent : '',
    legendPx: document.querySelector('#${id}-film-mode legend') ? parseFloat(getComputedStyle(document.querySelector('#${id}-film-mode legend')).fontSize) : 0,
    creditPx: credit ? parseFloat(getComputedStyle(credit).fontSize) : 0,
    pick: !!document.getElementById('${id}-film-pick'),
    pickHidden: (() => { const p = document.getElementById('${id}-film-pick'); return p ? !!p.hidden : null; })(),
    filmLegend: (() => { const p = document.querySelector('#${id}-film-pick legend'); return p ? p.textContent : ''; })(),
    filmLegendPx: (() => { const p = document.querySelector('#${id}-film-pick legend'); return p ? parseFloat(getComputedStyle(p).fontSize) : 0; })(),
    leavingChecked: (() => { const n = document.getElementById('${id}-film-leaving'); return n ? !!n.checked : null; })(),
    miniChecked: (() => { const n = document.getElementById('${id}-film-minibrot'); return n ? !!n.checked : null; })(),
    leavingName: (() => { const n = document.querySelector('label[for="${id}-film-leaving"]'); return n ? n.textContent.trim() : ''; })(),
    miniName: (() => { const n = document.querySelector('label[for="${id}-film-minibrot"]'); return n ? n.textContent.trim() : ''; })(),
    citeHref: (() => { const a = document.getElementById('${id}-rendered-cite'); return a ? a.getAttribute('href') : ''; })(),
    sources,
    scroll: de.scrollWidth - de.clientWidth,
    theme: de.getAttribute('data-theme'),
    focused: document.activeElement ? document.activeElement.id : '',
  };
})()`;

async function checkDeepZoom(page, width, theme) {
  const label = `mandelbrot deep ${width} ${theme}`;
  page.bags.console.length = 0;
  page.bags.exceptions.length = 0;
  const minibrotMp4 = () => page.bags.urls.filter((u) => u.includes('minibrot') && u.includes('.mp4'));
  await page.send('Runtime.evaluate', { expression: `document.getElementById('mandelbrot-picture-rendered').click()` });
  await new Promise((r) => setTimeout(r, 250));
  await page.send('Runtime.evaluate', { expression: `document.getElementById('mandelbrot-film-leaving').focus()` });
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await new Promise((r) => setTimeout(r, 350));
  const shown = await evalJson(page.send, PROBE('mandelbrot'));
  const portrait = width < 600;
  const wantFile = portrait ? 'minibrot-720x1280' : 'minibrot-1280x720';
  check(`${label}: arrow selects Deep zoom and does not play`, shown.miniChecked && shown.focused === 'mandelbrot-film-minibrot' && shown.paused && shown.autoplay === false && shown.muted && shown.playsInline && shown.preload === 'none' && shown.poster.includes(wantFile) && shown.cut === (portrait ? 'portrait' : 'landscape'), JSON.stringify({ focused: shown.focused, cut: shown.cut, poster: shown.poster, paused: shown.paused }));
  check(`${label}: credit cites the Wikimedia start point`, shown.credit.includes('Rendered with Manim') && shown.credit.includes('Wikimedia Commons, File:Mandelbrot_sequence_new.gif') && shown.credit.includes('Newton solve') && shown.citeHref === 'https://commons.wikimedia.org/wiki/File:Mandelbrot_sequence_new.gif', shown.credit);
  check(`${label}: sources are the minibrot cuts`, shown.sources.some((s) => s.src.includes('minibrot-720x1280.mp4') && s.media === '(max-width: 599px)') && shown.sources.some((s) => s.src.includes('minibrot-1280x720.mp4') && !s.media));
  check(`${label}: choosing the film does not fetch the mp4`, minibrotMp4().length === 0, minibrotMp4().join(' '));
  check(`${label}: no sideways scroll`, shown.scroll <= 1, String(shown.scroll));
  await snap(page.send, join('/opt/cursor/artifacts/rendered-films', `mandelbrot-${width}-${theme}-minibrot.png`));

  if (!portrait) {
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 599, height: 900, deviceScaleFactor: 1, mobile: true,
    });
    await new Promise((r) => setTimeout(r, 350));
    const narrow = await evalJson(page.send, PROBE('mandelbrot'));
    check(`${label}: 599px names the portrait cut and stays paused`, narrow.cut === 'portrait' && narrow.poster.includes('minibrot-720x1280') && narrow.paused && narrow.preload === 'none' && narrow.miniChecked, `${narrow.cut} ${narrow.poster}`);
    check(`${label}: naming the portrait cut does not fetch it`, minibrotMp4().length === 0, minibrotMp4().join(' '));
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 600, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 350));
    const wide = await evalJson(page.send, PROBE('mandelbrot'));
    check(`${label}: 600px names the landscape cut`, wide.cut === 'landscape' && wide.poster.includes('minibrot-1280x720') && wide.paused && wide.miniChecked, `${wide.cut} ${wide.poster}`);
    await page.send('Emulation.setDeviceMetricsOverride', {
      width, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 250));
  }

  await page.send('Runtime.evaluate', {
    expression: `document.getElementById('mandelbrot-rendered-video').play()`,
    userGesture: true,
  });
  await waitFor(page.send, `(() => { const v = document.getElementById('mandelbrot-rendered-video'); return !!(v && v.readyState >= 2 && !v.paused && v.currentTime > 0.05); })()`, 20000);
  const playing = await evalJson(page.send, `(() => { const v = document.getElementById('mandelbrot-rendered-video'); return { w: v.videoWidth, h: v.videoHeight, src: v.currentSrc, paused: v.paused, t: v.currentTime, preload: v.preload }; })()`);
  const file = portrait ? 'minibrot-720x1280.mp4' : 'minibrot-1280x720.mp4';
  check(`${label}: Play decodes ${file}`, playing.w === (portrait ? 720 : 1280) && playing.h === (portrait ? 1280 : 720) && String(playing.src).includes(file) && playing.paused === false && playing.t > 0, JSON.stringify(playing));

  await page.send('Runtime.evaluate', {
    expression: `(() => { document.getElementById('mandelbrot-rendered-video').currentTime = 18; return true; })()`,
    userGesture: true,
  });
  await waitFor(page.send, `(() => { const v = document.getElementById('mandelbrot-rendered-video'); return !!(v && v.currentTime > 17.5); })()`, 15000);
  await page.send('Runtime.evaluate', { expression: `document.getElementById('mandelbrot-picture-live').click()` });
  const seeded = await waitFor(page.send, `(() => {
    const box = document.getElementById('mandelbrot-width');
    const api = window.__mv && window.__mv.mandelbrot;
    const view = document.getElementById('mandelbrot-plane-viewport');
    const chip = document.getElementById('mandelbrot-preset-inside');
    const video = document.getElementById('mandelbrot-rendered-video');
    if (!box || !api || !view || !chip || !video) return null;
    const across = Number(view.dataset.unitsAcross);
    if (!(across > 0) || across > 1e-7) return null;
    const c = api.getC();
    return {
      width: box.value,
      across,
      re: c.re,
      im: c.im,
      centreRe: document.getElementById('mandelbrot-center-re').value,
      centreIm: document.getElementById('mandelbrot-center-im').value,
      chipsHidden: !!(chip.parentElement && chip.parentElement.hidden),
      paused: video.paused,
      live: document.getElementById('mandelbrot-picture-live').checked,
    };
  })()`, 8000);
  const nucleusRe = -0.7468707761049912;
  const nucleusIm = 0.13335830940823915;
  check(`${label}: Live opens on that frame's centre and width`,
    seeded.live && seeded.paused && !seeded.chipsHidden
      && Math.abs(seeded.re - nucleusRe) < 1e-12
      && Math.abs(seeded.im - nucleusIm) < 1e-12
      && Math.abs(seeded.across - 3.5e-8) < 1e-12
      && Math.abs(Number(seeded.width) - 3.5e-8) < 1e-12,
    JSON.stringify(seeded));
  check(`${label}: no console error`, page.bags.console.length === 0 && page.bags.exceptions.length === 0, page.bags.console.concat(page.bags.exceptions).join(' | '));
  if (width === 1280) {
    await page.send('Runtime.evaluate', { expression: `location.hash = '#julia'` });
    await waitFor(page.send, `!document.getElementById('mandelbrot-rendered-video') && !!document.getElementById('julia-plane-viewport')`, 8000);
    check(`${label}: leaving the station drops the video`, true);
  }
}

async function main() {
  const { server, port } = await serve();
  const profile = mkdtempSync(join(tmpdir(), 'film-chrome-'));
  const shotDir = '/opt/cursor/artifacts/rendered-films';
  await mkdir(shotDir, { recursive: true });
  let chrome;
  try {
    const started = await startChrome(profile);
    chrome = started.chrome;
    const widths = [1280, 700, 390];
    const themes = ['light', 'dark'];
    const stations = [
      { id: 'mandelbrot', hash: '#mandelbrot', file: 'leaving' },
      { id: 'bulbs', hash: '#bulbs', file: 'cardioid' },
    ];
    for (const theme of themes) {
      const page = await openPage(started.browserWs);
      await page.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `try{localStorage.setItem('mv:theme','${theme}')}catch(e){}`,
      });
      for (const width of widths) {
        // Leave the previous station before the viewport changes. A live
        // <video> would swap its poster on the resize, and that request can
        // arrive after the next station's log has been cleared.
        await page.send('Page.navigate', { url: 'about:blank' });
        await waitFor(page.send, `document.readyState === 'complete'`);
        await new Promise((r) => setTimeout(r, 150));
        await page.send('Emulation.setDeviceMetricsOverride', {
          width, height: 900, deviceScaleFactor: 1, mobile: width < 600,
        });
        for (const station of stations) {
          page.bags.bad.length = 0;
          page.bags.console.length = 0;
          page.bags.exceptions.length = 0;
          page.bags.urls.length = 0;
          const url = `http://127.0.0.1:${port}/${station.hash}`;
          await page.send('Page.navigate', { url });
          await waitFor(page.send, `!!document.getElementById('${station.id}-picture-live')`);
          await new Promise((r) => setTimeout(r, 250));
          const live = await evalJson(page.send, PROBE(station.id));
          const label = `${station.id} ${width} ${theme}`;
          const wantCut = width < 600 ? 'portrait' : 'landscape';
          const wantFile = wantCut === 'portrait' ? `${station.file}-720x1280` : `${station.file}-1280x720`;
          check(`${label}: live opens, film is not playing`, live.ready && live.liveChecked && !live.filmChecked && live.paused && live.figureHidden && !live.pairHidden);
          if (station.id === 'mandelbrot') {
            check(`${label}: the film picker waits until Rendered`, live.pick && live.pickHidden && live.leavingChecked && !live.miniChecked && live.leavingName === 'Leaving into dust' && live.miniName === 'Deep zoom to a minibrot');
          } else {
            check(`${label}: one film has no picker`, live.pick === false);
          }
          check(`${label}: no autoplay, muted, controls, inline, preload none`, live.autoplay === false && live.muted && live.controls && live.playsInline && live.preload === 'none');
          check(`${label}: cut is ${wantCut}`, live.cut === wantCut && live.poster.includes(wantFile) && live.sources.some((s) => s.src.includes(`${station.file}-720x1280.mp4`) && s.media === '(max-width: 599px)') && live.sources.some((s) => s.src.includes(`${station.file}-1280x720.mp4`) && !s.media));
          check(`${label}: no sideways scroll on Live`, live.scroll <= 1, String(live.scroll));
          check(`${label}: theme`, live.theme === theme, live.theme);
          const mp4Before = page.bags.urls.filter((u) => u.includes('.mp4'));
          check(`${label}: the mp4 is not fetched before Play`, mp4Before.length === 0, mp4Before.join(' '));

          await page.send('Runtime.evaluate', { expression: `document.getElementById('${station.id}-picture-live').focus()` });
          await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
          await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
          await new Promise((r) => setTimeout(r, 400));
          const shown = await evalJson(page.send, PROBE(station.id));
          check(`${label}: Rendered shows the poster and stays paused`, shown.filmChecked && shown.paused && !shown.figureHidden && shown.pairHidden && shown.poster.includes(wantFile));
          check(`${label}: credit names Manim and section 4`, shown.credit.includes('Rendered with Manim') && shown.credit.includes('Chapter 4'));
          if (station.id === 'mandelbrot') {
            check(`${label}: Rendered opens the film picker on Leaving into dust`, !shown.pickHidden && shown.leavingChecked && !shown.miniChecked && shown.filmLegend === 'Film' && shown.filmLegendPx >= 15, `${shown.filmLegendPx}`);
          }
          check(`${label}: the switch and the credit are at least 15px`, shown.legendPx >= 15 && shown.creditPx >= 15, `${shown.legendPx} ${shown.creditPx}`);
          check(`${label}: no sideways scroll on the film`, shown.scroll <= 1, String(shown.scroll));
          const mp4After = page.bags.urls.filter((u) => u.includes('.mp4'));
          check(`${label}: showing the poster does not fetch the mp4`, mp4After.length === 0, mp4After.join(' '));
          const posters = page.bags.urls.filter((u) => u.includes(`/media/films/${station.file}-`) && u.includes('.png'));
          const wrongPoster = posters.filter((u) => !u.includes(`${wantFile}.png`));
          check(`${label}: a fetched poster is the ${wantCut} cut`, wrongPoster.length === 0, wrongPoster.join(' '));
          check(`${label}: no console error`, page.bags.console.length === 0 && page.bags.exceptions.length === 0, page.bags.console.concat(page.bags.exceptions).join(' | '));
          check(`${label}: no failed asset`, page.bags.bad.length === 0, page.bags.bad.join(' | '));
          if ((width === 1280 && theme === 'light') || (width === 390 && theme === 'dark') || (width === 700 && theme === 'light' && station.id === 'bulbs')) {
            await snap(page.send, join(shotDir, shotName(station.id, width, theme, 'rendered')));
          }

          await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
          await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
          await new Promise((r) => setTimeout(r, 80));
          const keyed = await evalJson(page.send, PROBE(station.id));
          check(`${label}: arrow key returns to Live and the film stays paused`, keyed.liveChecked && keyed.figureHidden && keyed.paused && !keyed.pairHidden);
          if (station.id === 'mandelbrot' && ((width === 1280 && theme === 'light') || (width === 390 && theme === 'dark'))) {
            await checkDeepZoom(page, width, theme);
            await page.send('Emulation.setDeviceMetricsOverride', {
              width, height: 900, deviceScaleFactor: 1, mobile: width < 600,
            });
          }
        }
      }
      page.close();
    }
  } finally {
    if (chrome && chrome.pid) {
      chrome.kill('SIGKILL');
      await new Promise((r) => chrome.on('exit', r));
    }
    await new Promise((resolve) => server.close(resolve));
  }
  if (failed) {
    console.error(`\n${failed} rendered-film check(s) failed`);
    process.exit(1);
  }
  console.log('\nrendered film checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
