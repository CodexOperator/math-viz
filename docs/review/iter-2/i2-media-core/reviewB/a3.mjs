import assert from 'node:assert/strict';
import * as L from '../../../../../js/core/listen.js';
const log=[];
const m = await L.loadManifest();
assert.ok(m && typeof m==='object'); assert.ok(Array.isArray(m.VIDEOS)); assert.ok(m.SITE_AUDIO && typeof m.SITE_AUDIO==='object' && !Array.isArray(m.SITE_AUDIO));
log.push('manifest shape: VIDEOS len '+m.VIDEOS.length+', SITE_AUDIO keys '+Object.keys(m.SITE_AUDIO).length);
const p1=L.loadManifest(), p2=L.loadManifest(); assert.equal(p1,p2); log.push('same promise');
assert.equal(L.videoFor({VIDEOS:[{id:'a'}]},'a').id,'a'); assert.equal(L.videoFor({VIDEOS:[{id:'a'}]},'b'),null);
assert.equal(L.clipsFor({SITE_AUDIO:{s:{clips:[{id:'x'}]}}},'s').length,1);
assert.deepEqual(L.clipsFor({SITE_AUDIO:{s:{clips:[{id:'x'}]}}},'none'),[]);
L.resetManifestCache(); const p3=L.loadManifest(); assert.notEqual(p3,p1); await p3; log.push('reset gives new promise');
// purity: input not mutated
const mm={SITE_AUDIO:{s:{clips:[{id:'x'}]}}}; const c=L.clipsFor(mm,'s'); c.push({id:'y'}); assert.equal(mm.SITE_AUDIO.s.clips.length,1);
// garbage
assert.equal(L.videoFor(null,'a'),null); assert.equal(L.videoFor(undefined,'a'),null); assert.deepEqual(L.clipsFor(null,'a'),[]); assert.deepEqual(L.clipsFor({SITE_AUDIO:null},'a'),[]);
assert.deepEqual(L.clipsFor({SITE_AUDIO:{}},'__proto__'),[]); assert.deepEqual(L.clipsFor({SITE_AUDIO:{}},'constructor'),[]);
log.push('purity and garbage ok');
// console warn counted for absent manifest: simulate by running in Node (manifest.js exists so no warn)
console.log(log.join('\n'));
