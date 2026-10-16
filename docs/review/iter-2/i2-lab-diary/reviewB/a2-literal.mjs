// Review B: A2 verbatim, plus an independent recomputation of the 1/z frame numbers.
import assert from 'node:assert/strict';
import * as lab from '../../../../../js/stations/lab.js';
import { pushForward } from '../../../../../js/core/mapping.js';
import { circle, verticalLine, segment } from '../../../../../js/core/shapes.js';
import { inv } from '../../../../../js/core/complex.js';
const { frameBounds, imageBounds, pagesSanitize, replayWindow } = lab;

const pieces = pushForward(circle({ re: 1, im: 0 }, 1), (z) => inv(z), { clampRadius: 40 });
const b = frameBounds(pieces);
console.log('frame of circle(1,1) under 1/z:', JSON.stringify(b));
const span = b.xRange[1] - b.xRange[0];
assert.ok(span >= 4 && span <= 6, `span ${span}`);
assert.ok(b.xRange[0] <= 0 && b.xRange[1] >= 0.5);

const sq = pushForward(verticalLine(2), (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im }), { clampRadius: 40 });
assert.deepEqual(frameBounds(sq), imageBounds(sq));
console.log('vertical line 2 under z^2: frameBounds === imageBounds');

const valid = (i) => ({ name: 'a' + i, savedAt: i + 1, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }] });
const three = pagesSanitize([{ name: 'a', savedAt: 1, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }] }, 'junk', { name: 'b' }]);
assert.equal(three.length, 1);
const many = pagesSanitize(Array.from({ length: 25 }, (_, i) => valid(i)));
assert.equal(many.length, 20);
console.log('25 valid -> 20; names kept:', many.map((p) => p.name).join(','), 'savedAt:', many.map((p) => p.savedAt).join(','));
// newest kept: savedAt 6..25 expected
const kept = many.map((p) => p.savedAt);
assert.ok(Math.min(...kept) >= 6 && Math.max(...kept) === 25, `newest kept ${kept}`);
// also with the input reversed (newest first), the newest are still kept
const rev = pagesSanitize(Array.from({ length: 25 }, (_, i) => valid(24 - i)));
const keptR = rev.map((p) => p.savedAt);
assert.ok(Math.min(...keptR) >= 6 && Math.max(...keptR) === 25, `newest kept (reversed input) ${keptR}`);
console.log('reversed input -> newest 20 kept as well, order:', keptR.slice(0, 3).join(','), '...');

const seg = segment({ re: 0, im: 0 }, { re: 1, im: 0 }, { n: 64 });
const w = replayWindow(seg.points, 0.5);
assert.ok(w.points.every((p) => p.t <= 0.5));
assert.ok(Math.abs(w.cursor.re - 0.5) <= 1e-9 && Math.abs(w.cursor.im) <= 1e-9);
console.log('replayWindow ok: points', w.points.length, 'cursor', JSON.stringify(w.cursor));

// A1(5) says the pages round trip via the store: sanitize idempotent
const again = pagesSanitize(many);
assert.deepEqual(again, many);
console.log('A2 literal: pass');
