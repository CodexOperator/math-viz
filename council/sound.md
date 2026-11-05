# Council: sound

The plane already paints w. The same two numbers should sing: the angle of w is a pitch class, the size of w is loudness and octave, the stretch |f′| is timbre, and distance to a zero or a pole is a beat.

The prototype is `hear.html`. It is a domain colouring of tan z. Drag the green point, press Hear. A zero goes quiet and low. A pole climbs, brightens, and beats, and it will not get louder than a fixed ceiling.

e^z splits the ear the way Identity (5.1) splits the value: across is only loudness, up is only pitch. Log makes the branch cut a pitch jump at constant loudness.

Quiet until Hear. Mute stays on the screen. Reduced motion drops haptics and the second oscillator, and the sentence says what the note is doing so the lesson is not sound-only.

Cut a Julia mode on this page, typed functions, samples, stereo, and any drone that plays when the hand is gone. What remains is one AudioContext and four sines, live only while Hear is on.

## 1. The vision

A learner who can already see a domain colouring still has to be told what the paint means. Sound does not add a new encoding. It is the paint, in the ear.

Colour is already Arg w. Pitch is that same angle, one turn of the hue circle being one octave. Brightness is already |w|. Loudness and the octave are that same size, with a floor and a ceiling so a pole cannot scream. The derivative the course already calls a zoom becomes the brightness of the tone: a vanishing derivative is a pure sine, a large one grows partials. A zero is the note falling out. A pole is the note hitting the ceiling and starting to beat. A branch point is neither: the size grows, and there is no beat, because a beat is reserved for a zero or a pole.

The page stays quiet until the learner asks. Mute is a word, not an icon you have to learn. When the system asks for reduced motion, nothing throbs and the phone does not buzz; the beat rate remains a number on the page. The sentence under the picture is the same fact as the note, so a deaf learner and a muted laptop still get the lesson.

This is the opposite of a soundtrack. The film, the map, and the story do not hum. One point sings, and only while the hand is on it or the learner has just asked to hear that point.

## 2. Designs

Each one is one gesture. The mark that moves is named. The sentence is true of one state and false of another. Citations are Howell & Mathews, *Complex Analysis*, 202 Updated Edition. Links in the prototype open the HTML edition; the numbers are the printed edition.

### 2.1 The singing point — built

- **Gesture.** Drag the green point on a domain colouring of tan z. Arrow keys do the same thing once the picture is focused. A finger on a phone sings only while it is down.
- **Mark.** The green point. The orange needle is Arg w, and that angle is the pitch. Purple is the sentence, because the sentence is w.
- **Claim.** At a zero: "This is a zero. w is near 0, so the note goes quiet and low." At the pole: "This is a pole. The size of w runs off, so the note climbs, brightens, and beats." Between them the sentence says w is neither, and that sentence is false at both singularities.
- **Book.** Definition 5.6, page 148, is tan z = sin z / cos z, provided the denominator is not zero. Page 151: sin z = 0 exactly at nπ, and cos z = 0 exactly at (n + ½)π. The picture shows the zero at 0, the pole at π/2, and the next zero at π. The book does not say "pole" until §7.4, page 232, where a pole of order k is the Laurent principal part that stops at (z − α)^(−k). On this page the spot is where Definition 5.6 refuses the denominator, and the later word is named in the citation rather than smuggled in as if §5.4 had said it.

The numbers, so the sentence cannot drift away from the speaker:

| Ear | Rule |
| --- | --- |
| Pitch | Arg w, one turn, one octave. Home is 220 Hz when the angle is 0 and \|w\| = 1. |
| Octave | log2\|w\|, clamped to [−2, 2]. |
| Loudness | The same clamp, as a fraction of a ceiling gain of 0.1. At \|w\| ≤ 1/4 the gain is 0. At \|w\| ≥ 4 the gain is 0.1 and stays there. |
| Timbre | log2(1 + \|f′\|) / 4, clamped, feeding a second partial and a third. 0 is a pure sine. |
| Beat | Only inside distance 0.5 of a known zero or pole. Rate 0.48 / distance, never above 6.5 Hz. A zero beats with a sub-octave. A pole beats with a detune of the same note. A branch point does not beat. |

Checked, not hoped: at z = 0.12, tan is quiet (gain under 0.02) and low. At z = π/2 − 0.1, gain is over 0.08, the beat is faster than 2 Hz, and the timbre is bright. At the opening point 0.72 + 0.55i the sentence is the ordinary one and the beat is off. The zero sentence and the pole sentence are different strings.

A phone gets one pulse on entering a zero (`navigator.vibrate(16)`) and two pulses on entering a pole (`[12, 36, 12]`). Reduced motion returns nothing. iOS ignores vibrate; the sentence does not.

### 2.2 The exponential splits the ear — built, second chip

- **Gesture.** The same drag, on e^z.
- **Mark.** The green point. Horizontally, only the brightness of the paint moves. Vertically, only the hue moves. The needle agrees with the hue.
- **Claim.** On the real axis, away from 0: only the size has changed, so only the loudness moves. On the imaginary axis, away from 0: only the angle has changed, so only the pitch moves. At 0: the resting note, 220 Hz, loudness exactly half the ceiling. Off both axes the sentence says both are off the home note, and that sentence is false on each axis and at the origin.
- **Book.** Identity (5.1), page 132: e^z = e^x (cos y + i sin y). So \|e^z\| = e^x and the angle is y, taken in (−π, π]. Equation (5.2) on the same page is the period 2πi: the pitch class repeats every 2π upward. The window is y from −3.5 to 3.5, a little more than one period, so the repeat is on the page. Definition 5.1, page 130, is the series; the picture uses the closed form the book derives from it.

This is the cleanest sentence in the set, because the two ears are on the two axes. A learner who drags across and hears the pitch sit still has checked Identity (5.1) without being told to trust the caption.

### 2.3 The cut is a jump you can hear — built, third chip

- **Gesture.** Drag the green point across the dashed negative real axis on Log.
- **Mark.** The green point crossing the dashed seam. The seam is the site's existing dashed grey, not a new hue.
- **Claim.** On the cut: a small step across jumps the pitch and leaves the loudness put. Off the cut: Log is continuous here, so a small step does not jump the pitch. That second sentence is false on the cut.
- **Book.** Definition 5.2, page 137, is the multivalued log. The principal value Log z = ln\|z\| + i Arg z is on page 138. Arg is discontinuous on the negative real axis, and so is Log. The jump in the value is 2πi. The jump in the *pitch* is the jump in Arg(Log z), which is not 2π: the real part ln\|z\| stays, the imaginary part flips sign, and the angle of that point swings by about half a turn. Checked at z = −0.8 ± 0.02i: both sides say "cut", the pitch classes differ by more than 0.4 of an octave, and the gains differ by less than 0.02.

There is also a zero of Log at z = 1, and it goes quiet, same sentence as a zero of tan. The origin is a branch point. \|Log z\| grows slowly (at 0.08 it is only a bit past 2.5), and the note does not beat. The sentence says it is not a pole. Do not sell this as the pole's shout. The pole's shout is tan. The cut's trick is a pitch jump at constant loudness, which a pole does not do.

### 2.4 The derivative is the brightness of the note — in the readout, not its own page

- **Gesture.** The same drag. No new control.
- **Mark.** The word in the readout: pure, warm, or bright. It moves when \|f′\| moves.
- **Claim, when this gets its own station.** At a critical point that is not a zero, the note is a pure sine. Near a pole it is bright. The sentence "the note is pure" is false near the pole.
- **Book.** Equation (3.1), page 79, is f′(z₀) = lim (f(z) − f(z₀)) / (z − z₀). The modulus of that limit is the local stretch: how far Δw runs for a step Δz. The numeric stretch on the page is the central difference with step 10⁻⁴, which at z = 0.2 on tan agrees with sec²(0.2) to better than 0.05.

Honest limit of the prototype: tan′(0) = 1, so the zero of tan is warm, not pure. You cannot hear purity at a zero of z² either, because that critical point is the zero, and the zero is silent. Purity shows up where the derivative is small and the value is not. On Log, f′ = 1/z, so the note gets purer as you leave the origin. A later stop on the derivative station should put the probe where f′ = 0 and f ≠ 0, and the secant zoom already drawn there should be the same number as the partials. Do not draw a second zoom.

### 2.5 Escape is a rhythm — coded, not on this page

- **Gesture.** Drag the green start on the Julia picture the site already has.
- **Mark.** The walk. The tick is the walk's length, not a new dot.
- **Claim.** If the orbit of 0 stays inside the disk of radius 2 for 40 steps, the note is held and there is no tick. If it leaves, it ticks, faster the sooner it leaves, and never faster than 8 Hz. "It ticks" is false of a start that stays. "It is held" is false of a start that leaves.
- **Book.** §4.2, page 113. Theorem 4.9: the Julia set of f_c is connected if and only if the orbit of 0 stays in K_c, the set of points with a bounded orbit. The same page colours a point by "the length of time it takes for points to become sufficiently unbounded": iterate until the absolute value exceeds a bound L, or until a preassigned maximum, and the colour is the number of iterations. The book does not define a metronome. The tick is that iteration count, heard instead of painted. Checked: c = 0 and c = −1 stay (40 steps, held); c = 1 leaves in fewer than 8 steps; a leave at step 2 ticks faster than a leave at step 20.

This stays off `hear.html` on purpose. A Julia mode would be a second picture and a fourth lesson on a page whose job is one drag. The function is `escapeRhythm` in `js/core/sonify.js`, ready for `#julia` when the synthesis says so. The clock rule is the site's: 0 draws while paused means 0 ticks while paused, a hidden tab schedules nothing, and reduced motion prints the rate instead of pulsing.

### 2.6 Predict, then hear — not built

- **Gesture.** The lab already has a formula box. Do not add another. Before the drag, the learner types the word they expect: quiet, climb, or jump.
- **Mark.** The green point, afterwards, and whether their word matches the claim key.
- **Claim.** The match sentence is true when their word is the claim and false when they said "quiet" at a pole.
- **Book.** The same sections as the chip they are on. This is the fill-in Shael asked for, and it belongs to whoever owns the blanks. Sound only supplies the check: the claim key is already a string a blank can be compared with. Building the blank here would be a second product.

## 3. Technical approach

Pure math lives in `js/core/sonify.js`. No DOM, no `AudioContext`, no timers. `node tools/sonify-check.mjs` recomputes the claims above. The page is `hear.html` plus `js/hear.js` plus `css/hear.css`. It imports `js/core/domaincolor.js`, `js/core/anim.js`, and the sonify module. It does not import from `kit/`. Cloudflare strips `kit/`; a live import there would blank the page.

The paint is the site's domain colouring: hue = Arg w, lightness from \|w\|, rings at powers of two. The overlay is a second canvas so a drag does not repaint the plane. The overlay's paint is one `createFrame` from `js/core/anim.js`. Pointer moves coalesce to that frame. Sound uses `setTargetAtTime` directly, so the ear is not waiting on the paint. There is no second `requestAnimationFrame` loop and no perpetual oscilloscope.

The graph is four sine oscillators (fundamental, octave, twelfth, beat) into a gain into a compressor (threshold −22 dB, ratio 8) into the destination. No samples, no buffers, no worklet. The ceiling gain is 0.1 before the compressor, and the partials are fractions of that, so a pole cannot clip even when all four are open. Frequencies glide with a 50 ms time constant while the point moves, and jump when the chip changes, because a glide from tan to Log would be a lie.

Quiet by default is a latch, not a hope:

- The context is constructed inside the Hear click, synchronously, before any await. That is the user gesture browsers require.
- Until that click, `audio` is `'none'`. Hovering does not start it.
- Hear plays the current point. Mouse leave after the pointer has entered the picture fades the gains and, 420 ms later, suspends the context. A finger-up does the same. Arrow-key up does the same.
- Mute is the same button. It says Mute, `aria-pressed` is true, and the context suspends.
- A hidden tab suspends. `pagehide` closes the context.

Reduced motion is read from `prefers-reduced-motion`. The second oscillator stays at gain 0. The readout still prints the beat rate and says it is not being played. Haptics return null. There is no CSS throb to disable; the needle is set to the angle, not transitioned.

Performance on a phone: the colouring cap is 800 000 idle pixels, long edge 1400, device pixel ratio at most 3, the same caps the site already uses. tan, exp, and Log on a window a few units wide are a few hundred thousand evaluations of `sin`/`cos` or `exp`, once per chip change and once per resize, not once per move. Four oscillators are nothing next to that, and they are suspended when the hand is gone. Touch-action is `none` on the picture so a drag does not scroll it. At 360px the page does not scroll sideways; `tools/hear-smoke.mjs` checks `scrollWidth` against `clientWidth`.

Three chips. Hear is the safety latch, the way the theme button is not a lesson control. If a reviewer counts it as a fourth control, drop Log. Tan and e^z are the two sentences that have to survive. Log is the third because the cut is the one sound a pole cannot fake.

The page is not a station on the story map. Putting it in the registry would move Test 1 and Test 2 counts and fight the chapter build that is already in flight. It links back to `#lab`. When the synthesis adopts it, it becomes one custom station beside the lab, with the same three chips or fewer, and the source tag it already carries.

## 4. How this plugs into the other four

The charter does not name the other four members. These are the four bodies of work around this one, and phase 2 can retarget them once those pitches exist.

**The pictures of functions.** Domain colouring, the reciprocal, the derivative, and the lab already compute w. The voice reads that w. It must not invent a third pair of numbers. Hue and pitch stay the same circle, including the fact the colour legend already states: θ and θ + 2πk are the same colour, and they are the same pitch class. The identity w = z has a seam in Arg and no seam in the paint or in the pitch. Log's cut is audible because the *value* jumps by something other than a full turn of its own argument. If a picture ever shows modulus and argument with different colours than these, the ear is wrong and should be changed, not the colour key.

**The two planes, and the 4D views.** Green is the finger, purple is w. A forest of strings from one plane to the other should be silent except the string under the finger. Colouring a volume by Arg and \|w\| is the same paint; the probe through that volume is the same voice. Do not add a pitch for the fourth coordinate. There are only two numbers.

**The fractal zoom and the films.** Escape time is design 2.5, a rhythm on the Julia clock, not a new renderer. Infinite zoom does not change the mapping: the tick is the step count at the point under the finger, at whatever depth the picture has actually computed. A film stays silent. If a film is ever scored, it has to be the host clock — pause means the tone holds or stops, a hidden tab moves nothing — and Hear still gates it. A film that autoplays audio has failed the quiet rule.

**The fill-in and the wonder.** Design 2.6. The blank compares a word to the claim key. Sound does not write the curriculum. The wonder is the moment the pole starts to beat before the learner has read the sentence, and the sentence then agrees. That only works if the sentence is false somewhere, which is why the ordinary sentence says "neither a zero nor a pole" instead of a slogan that is true everywhere.

## 5. What to cut, and what it costs

Cut, and do not sneak back in during phase 3:

- Samples, piano maps, recorded residues, any buffer. Sines only. A sample cannot glide with Arg w, and it costs a download.
- Stereo by Re z, a "whoosh" on zoom, a drone under the story map, an oscilloscope. None of those is a fact about w.
- Sonifying a whole stroke, a grid, or every pixel. One point. A chord of a curve is a second lesson and a clipping hazard.
- Quantizing to a piano scale. The cut has to be able to land between keys. 220 Hz times a real power of two is the whole instrument.
- Beats above 6.5 Hz and octaves outside ±2. Past that it is a buzz, and a pole would be painful. The ceiling is the pedagogy: the learner hears the note stop climbing, which is the picture going white.
- A Julia chip, a formula box, or a fourth preset on this page.
- Continuous haptics. One pattern on the way in. Nothing on the way around.
- A visual throb for the beat. The number is enough, and reduced motion would have to delete the throb anyway.
- WebAudio worklets, WASM, a second audio clock. The site has one clock already.

Costs that stay, said plainly:

- Hearing the exact silence of a zero takes a small disk. Loudness hits zero at \|w\| = 1/4, which for tan is about \|z\| = 0.24, roughly a fingertip on a phone, not a region. The sentence fires a little earlier, while the note is already quiet and low (\|w\| < 0.35). A learner who misses the black spot still hears the approach. Do not widen the silence by lying about \|w\|.
- Log at 0 will disappoint anyone expecting a pole. The growth is logarithmic. The prototype says so, in the sentence and in this note. Keep the disappointment; it is the difference between a branch point and a pole.
- The word "pole" is §7.4. Using it on a §5.4 picture is a forward pointer, and the source tag says so. Cutting the word and saying only "tan runs off" is the safer citation. I kept the word because Shael asked to hear a zero against a pole, and the tag tells the truth about when the book defines it.
- `AudioContext` on iOS starts only inside a gesture and suspends aggressively. The Hear click is that gesture. If `resume()` fails, the readout still updates. The smoke test in headless Chrome sees the context go `running`, then `suspended` on Mute. This VM has no speaker; the frequencies are checked, the air is not.
- Four oscillators at gain 0.1 are gentle on a laptop and can still be too much in a classroom. Mute is the answer, not a volume slider. A slider would be a fifth control and a second way to set loudness, which \|w\| already sets.
- Haptics are Android-only. Shipping a fake "buzz" graphic for iOS would be a new picture. Don't.
- The page is an extra static file. It does not change `index.html`, the registry, or the kit scaffold. `node tools/check_vectors.mjs`, `node tools/fractal-smoke.mjs`, and `node kit/smoke.mjs` have to stay green because nothing they import was edited. `node tools/sonify-check.mjs` and `node tools/hear-smoke.mjs` are the new checks.

If the synthesis can only keep one idea, keep the singing point on tan: angle is pitch, size is loudness with a ceiling, a zero is quiet, a pole beats. e^z is the second, because it makes the same rule obvious along the axes. Everything else in this note can wait.
