// The disk lesson's blanks, the finite fate test, and the unlock model.
// Run: node tools/lesson-smoke.mjs

import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import {
  DISK_STEPS,
  INSIDE,
  OUTSIDE,
  WALL,
  bookSquare,
  compileRule,
  grade,
  picturePoints,
  sameAsSquare,
  walk,
} from '../js/core/lesson.js';
import {
  ROADMAP,
  DISK_STRIP,
  emptyProgress,
  inkFraction,
  isInked,
  loadProgress,
  markStep,
  nodeState,
  nodesForChapter,
  normalizeProgress,
  saveProgress,
} from '../js/core/progress.js';

let failed = 0;
let n = 0;

function check(name, cond, detail = '') {
  n += 1;
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, detail);
  } else {
    console.log('ok  ', name);
  }
}

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

const square = compileRule('z^2');
check('z^2 compiles and matches the book square', square.ok && square.same);
check('z*z and zz and z^2+0 are the same rule', compileRule('z*z').same && compileRule('zz').same && compileRule('z^2+0').same);
check('z^2+0.3 is a different rule', compileRule('z^2+0.3').ok && !compileRule('z^2+0.3').same);
check('a bad name is a sentence, not a throw', !compileRule('foo(z)').ok && /don't know the name/.test(compileRule('foo(z)').message));

check('1/2 settles', walk(bookSquare, INSIDE).fate === 'settles');
check('3/2 leaves', walk(bookSquare, OUTSIDE).fate === 'leaves');
check('the non-real cube root stays', walk(bookSquare, WALL).fate === 'stays');
check('−1 settles at 1', walk(bookSquare, { re: -1, im: 0 }).fate === 'settles');
const shifted = compileRule('z^2+0.3');
check('z^2+0.3 sends 0 away', shifted.ok && walk(shifted.f, { re: 0, im: 0 }).fate === 'leaves');
const exp = compileRule('exp(z)');
check('exp(1/2) leaves within 32 steps', exp.ok && walk(exp.f, INSIDE).fate === 'leaves');
check('sameAsSquare rejects a non-function', sameAsSquare(null) === false);

const drawn = picturePoints(walk(bookSquare, INSIDE).points);
check('the drawn orbit is short and stays in the window', drawn.length >= 2 && drawn.length <= 8 && drawn.every((p) => Math.hypot(p.re, p.im) <= 2.2 + 1e-9));

check('1/4, (1/2)^2 and 0.25 pass the first blank', ['1/4', '(1/2)^2', '0.25', '1/2*1/2'].every((s) => grade('image', s).ok));
check('the start itself fails, and the nudge hides 1/4', !grade('image', '1/2').ok && !grade('image', '1/2').nudge.includes('1/4'));
check('z^2 is not a landing', !grade('image', 'z^2').ok);
check('a farther point fails inward', !grade('image', '2').ok);
const badName = grade('image', 'foo');
check('an unknown name uses the parser sentence', !badName.ok && /don't know/.test(badName.nudge));

check('< passes the comparison', grade('compare', '<').ok && grade('compare', 'shorter').ok);
check('= and > fail the comparison', !grade('compare', '=').ok && !grade('compare', '>').ok && !grade('compare', '<=').ok);
check('settles, stays, leaves are the three words', grade('settles', 'settles').ok && grade('leaves', 'Leaves').ok && grade('stays', 'cycles').ok);
check('the wrong fate is refused', !grade('settles', 'leaves').ok && !grade('leaves', 'stays').ok && !grade('stays', 'settles').ok);
check('a negation is not a fate', !grade('stays', 'does not settle').ok);
check('closed passes and open fails', grade('closed', 'the closed unit disk').ok && !grade('closed', 'open').ok);
check('a wrong nudge does not give the answer word', !grade('settles', 'leaves').nudge.includes('settles') && !grade('closed', 'open').nudge.includes('closed'));
check('six steps, one canonical each', DISK_STEPS.length === 6 && DISK_STEPS.every((s) => grade(s.id, s.canonical).ok));

const fresh = emptyProgress();
check('the disk starts open and the slide starts locked', nodeState(fresh, '4.2.disk') === 'open' && nodeState(fresh, '4.2.slide') === 'locked');
check('chapter 5 is its own door', nodeState(fresh, '5.4.current') === 'open');
check('likely nodes can be dropped', nodesForChapter(4, { includeLikely: false }).every((node) => node.scope !== 'likely') && nodesForChapter(4).some((node) => node.id === '4.3.geometric'));
check('the strip is four nodes', DISK_STRIP.length === 4 && DISK_STRIP[2] === '4.2.slide');

let progress = fresh;
for (const s of DISK_STEPS) progress = markStep(progress, '4.2.disk', s.id);
check('six correct blanks ink the disk and open the slide', isInked(progress, '4.2.disk') && nodeState(progress, '4.2.slide') === 'open');
check('which c stays locked until the slide is inked', nodeState(progress, '4.2.which') === 'locked');
check('ink is the fraction of blanks', inkFraction(markStep(fresh, '4.2.disk', 'image'), '4.2.disk') === 1 / 6);
check('a stray flag is dropped', normalizeProgress({ nodes: { '4.2.disk': { steps: { image: 1, no: true } } } }).nodes['4.2.disk'].steps.image === false);

const store = createStore('mv:', { storage: memStorage() });
saveProgress(store, progress);
const loaded = loadProgress(store);
check('progress round-trips through the store', isInked(loaded, '4.2.disk') && nodeState(loaded, '4.2.slide') === 'open');
check('an unknown node is locked', nodeState(fresh, 'nope') === 'locked');
check('the roadmap cites only sections the site already names', ROADMAP.every((node) => ['4.1', '4.2', '4.3', '5.4'].includes(node.section)));

const sources = ['js/core/lesson.js', 'js/core/progress.js', 'js/lessons/disk.js'].map((p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')).join('\n');
check('the lesson does not eval student text', !/\beval\s*\(/.test(sources) && !/new Function\s*\(/.test(sources));
check('the lesson page does not import kit/', !/from ['"][^'"]*kit\//.test(readFileSync(new URL('../js/lessons/disk.js', import.meta.url), 'utf8')));

if (failed) {
  console.error(`${failed} failed of ${n}`);
  process.exit(1);
}
console.log(`${n} checks passed`);
