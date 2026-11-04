# Rebuttal: live-films

I opened the five prototypes at 390×844. None of them scroll sideways. The book path on PR #33 names Chapter 5 and then stops: §5.1 the exponential (page 130), §5.2 the logarithm (page 137), §5.3 complex exponents (page 143), §5.4 trig and hyperbolic (page 148, and the phasor stations are already there), §5.5 inverse trig (page 159). The placeholder is waiting for exp, Log, and a power. This rebuttal picks one of those and says what the other five should keep.

## Sound

`hear.html` gets the encoding right. Hue is already Arg w, so pitch is that angle. Brightness is already |w|, so loudness is that size, with a ceiling. On the e^z chip the two ears sit on the two axes, which is Identity (5.1). The page stays silent until Hear, and the sentence is on the screen while the speaker is off. I dragged nothing and still read "w is neither a zero nor a pole."

The fatal flaw on a phone is that the lesson which distinguishes the black spot from the bright spot is a sound. At 390 the picture is a domain colouring of tan z, three chips, and a Hear button under the paint. A student in a hallway, on mute, or on a browser that suspends `AudioContext` the moment the finger lifts, gets the lab's paint plus a sentence. The beat, which is the whole point of the pole, is the part the phone drops. Tan is also §5.4, and the book does not say "pole" until §7.4. The first missing Chapter 5 picture is not a tan colouring.

Absorb the claim key and the quiet rule. A film readout can carry the same string the ear would have spoken, and a film does not start audio by itself. Absorb the e^z split as the sentence, not as a second chip on the sound page: across changes the radius, up changes the angle. Leave the four sines, the haptic patterns, and the escape rhythm in `js/core/sonify.js` until a finger is on one point and Hear has been pressed.

## Draw and map

`draw-map.html` gets the correspondence right. The opening sector under z², e^z, and Log is the same green ink, and every purple corner is f of its green corner. The orange lines are the places the sentence goes false. Play is `createMotion`. The formula box is the parser the site already has. At 390 the claim is on screen before the planes: "The purple angle is twice the green angle."

The fatal flaw on a phone is the fold. The citation, the claim, three chips, a formula field, and Play all sit above the ink. The z plane arrives as a wedge at the bottom of the first screen, and the w plane is another scroll away. A thumb cannot draw a sector and watch the landing in the same glance. The w window also refits, so the student cannot see that e^z of this sector is large. 1800 squares of side 0.12 are the wrong budget for the circle Figure 5.2 already is.

Absorb the cell. A cell is four green corners and four purple corners, checked by `tools/draw-map-check.mjs`. A live film is one point of that grid at time t, not a second mosaic. The orange edges of the fundamental strip are the same lines the exponential film is walking between. Leave the integral sum. It is Chapter 6, and a number under a drawing tool is not the picture.

## Two planes

`council/two-planes.html` gets the graph right. Two sheets, one string from z to f(z), the same colour at both ends. The z² sentence is a real double cover: 0.6 + 0.8i and its opposite land together. e^z uses the fundamental strip. Log's two sides of −1 land about a full turn apart. Turning does not rebuild the buffer. At 390 the forest drops to 36×36 and the sentence is readable above a small tilted pair.

The fatal flaw on a phone is the gesture. "Drag to turn" does not change f. The sentence was true before the finger moved. Pinch zoom does not add samples, and the pitch says a handset GPU was not in the room. Under the picture the student still has three chips and a formula box, which is a fourth control setting the same function as the chips. A 3D orbit on a phone is how the string the sentence is about slides off the thumb.

Absorb one string, as data: the pair (z, f(z)) at the current sample. The partial sums in their design 2.5, n = 1, 4, and 12, are a film of Definition 5.1 settling onto the circle. That film can wait until the closed form walks. Do not absorb OrbitControls, the volume, or a forest inside the clock.

## Pedagogy

`lessons/disk.html` gets the staircase right. Six blanks, the picture does not move until the blank is right, and a wrong answer leaves the dot where it was. At 390 the first card says "The picture has not moved" over a green start inside an orange circle, and the blank is the landing of 1/2. The roadmap keeps a^n and the squaring orbit as two nodes. That split is the one a student loses the night before the exam, and my sequence film can blur it if it is not said out loud.

The fatal flaw on a phone is that the film is the reward for a form. Six typed blanks, a rule box, and a plane capped at 16rem, and the orbit the chapter is about stays hidden until the word is right. A locked door on the chapter page is fair. A picture that refuses to move while the student is still learning what "settles" looks like is the opposite of a steerable film. The 32-step fate word is also a finite test wearing a theorem's coat. The page says so. It must not become the Julia test.

Absorb `js/core/progress.js` and the store key `mv:lesson-progress`. A beat the hand has actually crossed can ink a step. The picture still plays if the step is blank. Absorb the fate words and the warning that ((1+i)/√2)^n cycles while the squaring orbit of that point falls onto 1. Leave the lock off the hash router, and leave MathJax out.

## Deep zoom

`deep-zoom.html` gets the clock right. One Play owns the width. Pause freezes it. The centre is a long integer and the pixel is only the difference, so a window past two doubles is still the recurrence z ↦ z² + c from §4.2. At 390 the set is on the screen, blue stayed and orange left, with a green cross and two chips. The moving frame is small on purpose.

The fatal flaw on a phone is that the sentence leads with the machine. "Two doubles have run out" is true and it is not the book's question. The centre does not steer, the moving frame is 72 pixels, and a sharp frame at a few hundred pixels is a large fraction of a second. None of that draws e^z, Log, or a power. Chapter 5 is still empty if this is the only new picture.

Absorb the rule that one Play owns the quantity, and that pause ends in one sharp frame and then nothing. A zoom film is this Play, with the width as t. It is not a second Manim mp4 beside a vector orbit. Leave the GPU shader, the series tree, and Newton out, as they already cut them.

## Shared pieces

One clock. `createMotion` in `js/core/anim.js`. A live film wraps it as `createLivePlayer` in `js/core/live-film.js`: pause schedules nothing, a hidden tab and a long gap do not move t, reduced motion steps finished frames and never says Pause. The draw-and-map walk, the disk lesson's orbit, and the deep-zoom Play are already that clock. The two-planes damping loop is the one that has to stay off once a walk is added. Sound's paint is one `createFrame`. Its tones are not a second animation frame, and they stay suspended until Hear.

One cell grid. The draw-and-map cell, green corners and purple corners, recomputed by the existing checker. A film frame is one sample of that grid at time t. The exponential film is the sample on the vertical line x = constant. It does not paint 1800 tiles inside the tick.

One progress module. `js/core/progress.js`, store `mv:lesson-progress`. The exponential film can mark the step "the hand moved x while y was still turning" when that drag has happened. It does not withhold the purple point until the blank is filled. Pedagogy owns the blank. The film owns the motion the blank is about.

One parser. `compile` in `js/core/parse.js`. e^z, Log, and z^c are formulas that compiler already accepts. The first §5.1 station does not grow a formula box. Three chips elsewhere already set the function. A box beside them is a fourth control.

## Revised pitch, and what I cut

The first Chapter 5 film is e^z: the clock owns the angle, the hand owns the real part, and the purple point changes radius without restarting the turn.

Cut from my own phase-1 pitch:

- §5.4 as the first Chapter 5 station. The phasor and the impedance are already on the map. The same law, clock on the angle and hand on a real parameter, applies there later.
- The geometric pile, the Newton walk, and the cardioid orbit as the next build. The sequence page stays the contract. The book loop is waiting for the exponential, so that is the next page.
- A film that seeks a rendered Manim zoom and a vector orbit with one t. Deep zoom's Play is that film.
- A formula box, a chip row, and any sound that starts with Play.
- Treating a^n and the squaring orbit as one sentence. Pedagogy is right that they are two lists. The sequence film should keep saying it is the powers, not the orbit of squaring.

`live/exp.html` is that cut, made small. It uses the same player. y runs from −π to π. Dragging sets x = ln(radius). At the opening frame, x = 0 and the image sits on the unit circle at −1. Setting x = ln 2 while the clock is at 0.4 s leaves y where it was and makes the radius 2. The sentence flips. The angle does not rewind.

## The Chapter 5 station to anchor first

§5.1, The Complex Exponential Function, page 130.

Identity (5.1) is the sentence the film checks: the modulus is e^x and the angle is y. A vertical line in the strip is the walk. The hand moves that line sideways while the point is still turning, which is Figure 5.2 as a gesture instead of a finished drawing. §5.2 is the cut, and it is a crossing, which sound, the two sheets, and the drawn sector already show better as a drag than as a duration. §5.3, the power z^c = exp(c Log z), is the sequence film grown up, and it should be the second station, after the exponential it is built from. §5.4 is already drawn. §5.5 waits.
