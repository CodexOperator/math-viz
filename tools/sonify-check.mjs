// The ear is pure. These are the facts the singing page is allowed to say.
import {
  sample, hapticPattern, escapeSteps, escapeRhythm, stretchOf, tan, HOME_HZ, GAIN_CAP, CLAIMS, MAPPING, PRESETS,
} from '../js/core/sonify.js';

let failed = 0;
function check(name, cond) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name);
  } else {
    console.log('ok  ', name);
  }
}

const plain = sample('tan', { re: 0.72, im: 0.55 });
const zero = sample('tan', { re: 0.12, im: 0 });
const pole = sample('tan', { re: Math.PI / 2 - 0.1, im: 0 });
check('tan opens between the zero and the pole', plain.claim === 'plain' && plain.voice.beatKind === 'none');
check('a zero of tan is quiet and low', zero.claim === 'zero' && zero.voice.gain < 0.02 && zero.voice.octave < 0 && zero.text === CLAIMS.zero);
check('a pole of tan climbs, brightens, and beats', pole.claim === 'pole' && pole.voice.gain > 0.08 && pole.voice.beatHz > 2 && pole.voice.beatKind === 'pole' && pole.voice.timbre === 'bright');
check('the zero sentence is not the pole sentence', zero.text !== pole.text && plain.text !== zero.text && plain.text !== pole.text);
check('gain never passes the ceiling', [plain, zero, pole].every((s) => s.voice.gain <= GAIN_CAP + 1e-12));
check('home pitch is 220 Hz at e^0', Math.abs(sample('exp', { re: 0, im: 0 }).voice.freq - HOME_HZ) < 1e-9);

const home = sample('exp', { re: 0, im: 0 });
const loud = sample('exp', { re: 0.8, im: 0 });
const pitched = sample('exp', { re: 0, im: 1.2 });
check('e^0 is the resting note', home.claim === 'exp-home' && Math.abs(home.voice.pitchClass) < 1e-9 && Math.abs(home.voice.gain - GAIN_CAP / 2) < 1e-9);
check('across e^z only the loudness moves', loud.claim === 'exp-loud' && loud.voice.pitchClass < 0.01 && loud.voice.gain > home.voice.gain && loud.voice.freq > home.voice.freq);
check('up e^z only the pitch moves', pitched.claim === 'exp-pitch' && Math.abs(pitched.voice.modulus - 1) < 1e-9 && Math.abs(pitched.voice.pitchClass - 1.2 / (2 * Math.PI)) < 1e-9 && Math.abs(pitched.voice.gain - home.voice.gain) < 1e-9);
check('off both axes, both are off the home note', sample('exp', { re: 0.25, im: 0.55 }).claim === 'exp-both');

const above = sample('log', { re: -0.8, im: 0.02 });
const below = sample('log', { re: -0.8, im: -0.02 });
check('the cut is a pitch jump at the same loudness', above.claim === 'log-cut' && below.claim === 'log-cut' && Math.abs(above.voice.pitchClass - below.voice.pitchClass) > 0.4 && Math.abs(above.voice.gain - below.voice.gain) < 0.02);
check('Log at 1 is a quiet zero', sample('log', { re: 1.04, im: 0 }).claim === 'zero' && sample('log', { re: 1.04, im: 0 }).voice.gain < 0.02);
const branch = sample('log', { re: 0.08, im: 0 });
check('the origin of Log is a branch point and does not beat', branch.claim === 'log-branch' && branch.voice.beatKind === 'none' && branch.voice.modulus > 1.15);

check('tan derivative at 0 is about 1, so the zero is warm rather than a critical point', Math.abs(stretchOf(tan, { re: 0.2, im: 0 }) - 1 / Math.cos(0.2) ** 2) < 0.05);

check('reduced motion has no haptic', hapticPattern('zero', true) === null && hapticPattern('pole', true) === null);
check('a zero is one pulse and a pole is two', JSON.stringify(hapticPattern('zero', false)) === '[16]' && JSON.stringify(hapticPattern('pole', false)) === '[12,36,12]');

check('the orbit of 0 at c = 0 stays', escapeSteps({ re: 0, im: 0 }, { re: 0, im: 0 }) === 40 && escapeRhythm(40).held === true);
check('the orbit of 0 at c = 1 leaves, and a fast leave ticks faster', escapeSteps({ re: 0, im: 0 }, { re: 1, im: 0 }) < 8 && escapeRhythm(2).pulsesPerSec > escapeRhythm(20).pulsesPerSec);
check('the orbit of 0 at c = -1 stays', escapeSteps({ re: 0, im: 0 }, { re: -1, im: 0 }) === 40);

check('three presets, and the mapping names the home pitch', Object.keys(PRESETS).join() === 'tan,exp,log' && MAPPING.some((row) => row.math.includes(String(HOME_HZ))));

console.log(failed ? `${failed} failed` : 'sonify ok');
process.exit(failed ? 1 : 0);
