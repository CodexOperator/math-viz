// Headless check of lessons/disk.html. The picture, the blank, the unlock, and the width.
// Run: node tools/lesson-page.mjs

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

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
      const buf = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
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
    const timer = setTimeout(() => reject(new Error('Chrome did not start\n' + buf)), 20000);
    chrome.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ chrome, wsUrl: match[1] });
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Chrome exited ' + code));
    });
  });
}

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  function send(method, params = {}, sessionId) {
    const my = ++id;
    return new Promise((resolve, reject) => {
      pending.set(my, { resolve, reject });
      const body = { id: my, method, params };
      if (sessionId) body.sessionId = sessionId;
      ws.send(JSON.stringify(body));
    });
  }
  return { send, close: () => ws.close() };
}

async function evaluate(send, session, expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, session);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text + ' ' + (result.exceptionDetails.exception && result.exceptionDetails.exception.description || ''));
  }
  return result.result.value;
}

const SCRIPT = `
(async () => {
  const wait = () => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('blank did not appear')), 8000);
    const tick = () => {
      if (document.getElementById('blank') && document.getElementById('disk-lesson-canvas')) {
        clearTimeout(t);
        resolve();
      } else requestAnimationFrame(tick);
    };
    tick();
  });
  await wait();
  const errors = [];
  const blank = document.getElementById('blank');
  const form = document.getElementById('blank-form');
  const set = (value) => {
    blank.value = value;
    blank.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const submit = () => form.requestSubmit();
  set('1/2');
  submit();
  const wrong = document.getElementById('feedback').textContent;
  const hidden = document.getElementById('claim').textContent;
  set('1/4');
  submit();
  await new Promise((r) => setTimeout(r, 700));
  const right = document.getElementById('feedback').textContent;
  const claim = document.getElementById('claim').textContent;
  const canvas = document.getElementById('disk-lesson-canvas');
  const ctx = canvas.getContext('2d');
  const sample = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
  const rule = document.getElementById('rule');
  rule.value = 'z^2 + i/2';
  rule.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  const note = document.getElementById('rule-note').textContent;
  const tex = document.getElementById('rule-tex').textContent;
  const nextLocked = document.getElementById('next-node').textContent;
  const width = (w) => {
    const prev = document.documentElement.style.width;
    // viewport is set by the caller; just measure
    return { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, w };
  };
  return {
    wrong, hidden, right, claim, note, tex, nextLocked,
    canvas: { w: canvas.width, h: canvas.height, sample: [...sample] },
    step: document.getElementById('lesson').dataset.step,
    katex: !!document.querySelector('#prompt .katex, #rule-tex .katex'),
    measure: width(),
    hintOpen: document.getElementById('hint').open,
  };
})()
`;

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'lesson-'));
  const { server, port } = await serve();
  let chrome;
  let socket;
  let failed = 0;
  const check = (name, cond, detail = '') => {
    if (!cond) {
      failed += 1;
      console.error('FAIL', name, detail);
    } else console.log('ok  ', name);
  };
  try {
    const started = await startChrome(dir);
    chrome = started.chrome;
    socket = await cdp(started.wsUrl);
    const { targetId } = await socket.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await socket.send('Target.attachToTarget', { targetId, flatten: true });
    await socket.send('Page.enable', {}, sessionId);
    await socket.send('Runtime.enable', {}, sessionId);
    await socket.send('Emulation.setDeviceMetricsOverride', {
      width: 360, height: 640, deviceScaleFactor: 1, mobile: true,
    }, sessionId);
    const openLesson = async () => {
      await socket.send('Page.navigate', { url: `http://127.0.0.1:${port}/lessons/disk.html` }, sessionId);
      await evaluate(socket.send, sessionId, `new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('lesson did not mount')), 8000);
        const tick = () => {
          const lesson = document.getElementById('lesson');
          const blank = document.getElementById('blank');
          if (lesson && lesson.dataset.step === 'image' && blank && !blank.readOnly) {
            clearTimeout(t);
            resolve(true);
          } else setTimeout(tick, 30);
        };
        tick();
      })`);
    };
    await openLesson();
    const phone = await evaluate(socket.send, sessionId, SCRIPT);
    check('a wrong landing does not reveal the claim', phone.hidden === 'The picture has not moved.' && !/1\/4|closer/.test(phone.wrong), JSON.stringify(phone.wrong));
    check('1/4 reveals the landing', /closer/.test(phone.right) && phone.claim.includes('1/4'), phone.claim);
    check('the hint stays closed', phone.hintOpen === false);
    check('KaTeX rendered the prompt or the rule', phone.katex === true);
    check('a different rule is named and not graded as z^2', phone.note.includes('purple') && phone.tex.includes('z'), phone.note);
    check('the next node is still locked after one blank', /locked/i.test(phone.nextLocked) || phone.step === 'image', phone.nextLocked + ' ' + phone.step);
    check('the canvas has pixels', phone.canvas.w > 0 && phone.canvas.h > 0 && phone.canvas.sample[3] > 0, JSON.stringify(phone.canvas));
    check('no sideways scroll at 360', phone.measure.scroll <= phone.measure.client + 1, JSON.stringify(phone.measure));

    await socket.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    await new Promise((r) => setTimeout(r, 200));
    const wide = await evaluate(socket.send, sessionId, `({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth })`);
    check('no sideways scroll at 1280', wide.scroll <= wide.client + 1, JSON.stringify(wide));

    await evaluate(socket.send, sessionId, `localStorage.removeItem('mv:lesson-progress'); localStorage.removeItem('mv:lesson-rule'); true`);
    await openLesson();
    const walked = await evaluate(socket.send, sessionId, `
      (async () => {
        const answers = ['1/4', '<', 'settles', 'leaves', 'stays', 'closed'];
        const form = document.getElementById('blank-form');
        const forward = document.getElementById('forward');
        const seen = [];
        for (let i = 0; i < answers.length; i++) {
          const blank = document.getElementById('blank');
          blank.value = answers[i];
          form.requestSubmit();
          await new Promise((r) => setTimeout(r, 40));
          seen.push(document.getElementById('claim').textContent);
          if (i < answers.length - 1) {
            forward.click();
            await new Promise((r) => setTimeout(r, 40));
          }
        }
        const slide = document.querySelector('#ink-map li:nth-child(3)');
        const disk = document.querySelector('#ink-map li:nth-child(2)');
        return {
          seen,
          step: document.getElementById('lesson').dataset.step,
          disk: disk && disk.dataset.state,
          slide: slide && slide.dataset.state,
          next: document.getElementById('next-node').textContent,
          href: document.querySelector('#next-node a') && document.querySelector('#next-node a').getAttribute('href'),
        };
      })()
    `);
    check('the six blanks ink the disk', walked.disk === 'inked' && walked.step === 'closed', JSON.stringify(walked));
    check('the slide node unlocks', walked.slide === 'open' && walked.href === '../index.html#julia', JSON.stringify(walked));
    check('the claims name settles, leaves, stays, and the closed disk',
      walked.seen.some((s) => s.includes('settles')) && walked.seen.some((s) => s.includes('leaves')) && walked.seen.some((s) => s.includes('stays')) && walked.seen.some((s) => s.includes('closed')),
      JSON.stringify(walked.seen));
  } finally {
    if (socket) socket.close();
    if (chrome) {
      const exited = new Promise((resolve) => {
        chrome.once('exit', resolve);
        setTimeout(resolve, 1500);
      });
      chrome.kill();
      await exited;
    }
    server.close();
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  if (failed) process.exit(1);
  console.log('page checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
