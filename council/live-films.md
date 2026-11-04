# Council: live-films

Manim does not render a live, steerable SVG scene in the browser. The right model is the one this site already half-uses: a picture that is a pure function of time and of the number the hand is holding, drawn as SVG, sought by the one clock in `js/core/anim.js`.

Keep the HyperFrames pages for stories whose numbers are fixed. A live film drops GSAP. A tween owns the attribute from one time to the next, and a new \(z\) means building the tween again. The clock in `anim.js` does not own the attribute. It only owns \(t\). The hand owns \(z\).

The prototype rebuilds the §4.1 sequence film. Drag \(z\) while \(z^n\) is walking. The clock does not start over. The sentence flips across the unit circle. The beats change with the branch.

The same player is the orbit of 0, the Newton seed, the geometric pile, the spinning impedance, and the cardioid crossing. The hand never owns \(t\).

Cut Manim ports, Motion Canvas, precomputed parameter grids, and any second clock. Do not redraw Julia dust as SVG. Do not put a slider next to the drag.

## 1. The vision

A film on this site is a sentence you can interrupt.

The terms are walking toward 0. The student puts the green point outside the orange circle, and the same second of the walk becomes a sequence that leaves. The purple dots are not a trail that was recorded. They are \(z^n\) for the point the hand is holding, at this moment. Move the point and the powers move. The time stays.

That is the difference between a rendered film and a live one. The three Manim mp4s on the Mandelbrot stop are a camera that already ran. Scrubbing them visits a frame that was painted for one \(c\). They cannot be told a new \(c\). The HyperFrames pages are closer: every number is computed in `draw(t)`, and the panel seeks one paused timeline. They still feel fixed, because the path, the seed, and the beats were chosen when the page was written. `setParams` can reseed a page, and the sequence film already reads \(z\) from it, but nothing on the page is a hand. The student presses Play and watches.

A live film is the same `draw`, with the hand as an argument. Play, pause, scrub, a hidden tab, and reduced motion stay the rules they already are. The new gesture is a drag that does not restart the clock. The beats are allowed to branch, because "settles", "stays", and "leaves" are not three films. They are one walk, and the wall is the unit circle.

## 2. Six designs

The law under all six: the clock owns \(t\). The hand owns a number that is not \(t\). Scrub borrows \(t\) and pauses, which is the film panel's rule already. Dragging a purple mark would fight the clock, so the hand never does that. The purple mark is the output. It follows.

### The sequence, steered

This is the prototype. It rebuilds `films/film-settle.html`.

The gesture is a drag in the plane. The green point is \(z\). The walk keeps its place in time.

The mark that moves is the newest purple term, \(z^n\), and the terms already shown, which are recomputed from the same \(z\).

The claim is true of one state and false of others. "Settles at 0. The tail sits in the disk." holds only when \(|z| < 1\) and the term on screen has entered the disk of radius \(0.35\) around 0. At the start of the walk the term is \(1\), so the sentence is "Not settled yet." On the circle: "Stays. The modulus is 1, so the terms do not settle." Outside: "Leaves. The modulus is bigger than 1."

§4.1, Definition 4.1, page 103. The opening point is \(\tfrac12 + \tfrac14 i\), the sequence Exercise 1(a) asks about. On the circle, the terms stay, which is the question in Exercise 7. The page is `live/settle.html`. It is not on the map yet.

The beats follow the branch. Inside, the finished frame is the moment the walking term enters the disk. Outside, it is the moment a term leaves the window. On the circle, the walk is still on the circle at half time. Reduced motion steps those finished frames and never says Pause. Crossing the circle mid-play changes the beats and the sentence. It does not rewind \(t\).

A radius within \(0.06\) of \(1\) snaps onto the circle, so "stays" is a place a finger can hold. The orange stroke thickens when it has snapped.

### The orbit of 0, grabbed

Rebuild `films/film-orbit.html`.

The gesture is a drag of \(c\). On this site \(c\) is a hollow square, not a fifth colour. The clock is the step index of \(z \mapsto z^2 + c\), starting at 0.

The mark is the latest purple iterate.

The claim uses the words the stop already uses. "Stays" when the orbit is still bounded at this step. "Leaves" when a step has escaped. For \(c = i\) the walk stays and cycles, Example 4.10, page 113. For a \(c\) the film already uses, such as \(0.3\), it leaves. Theorem 4.9, page 113, is the test the sentence is rehearsing: the Julia set is connected exactly when this orbit stays bounded. The live page does not draw the Julia set. It draws the orbit that the theorem asks about.

The branch is the escape. If a step leaves, the beat list ends on that step instead of playing empty time. Drag \(c\) back inside and the later steps are the orbit of the new \(c\), at the same index. \(t\) is not rewound. Every term is recomputed. There is no memory of the \(c\) the hand used to be holding.

### Newton, the seed that never names a root

Rebuild `films/film-newton-walk.html`.

The gesture is a drag of the green seed while the steps of \(z - 1/z\), halved, are playing. §4.2, Example 4.7, page 110: five of them land on \(i\).

The mark is the purple iterate.

The claim "Lands on \(i\)" is true for the book's complex start, once the step has arrived, and false for a real start. Example 4.8, page 110: a real seed stays real, so the walk never answers which root. The real axis is a branch of the story. Cross it mid-play and the remaining picture is the orbit of the new seed at the same step. The five-step ending is not a promise. It is what this seed does.

### The geometric pile

Same drag of \(z\) as the sequence. The mark is no longer the term. It is the purple partial sum, the pile.

"Settles" when \(|z| < 1\) and the pile has sat down. Theorem 4.12, page 118. "Stays" on the circle: the bags do not go to 0, so the pile cannot have settled. Theorem 4.5, page 106. "Leaves" when \(|z| > 1\). The geometric stop already says these three sentences for three chips. The live film is those three chips as one drag, during one walk.

This design is cheap because it is the prototype's frame with a different sum. It is the one to build second, beside the sequence, not instead of the orbit. The orbit is the Chapter 4 story. The pile is the sentence the series stop is already waiting to show moving.

### The impedance that keeps turning

§5.4, Figure 5.9, equations (5.42)–(5.46), printed pages 155–156.

The phasor stop already lets the hand drag the phase. If the clock also owns the phase, the hand and the clock write the same number, and one of them has to lose. So the clock owns \(\omega t\): the current \(I^*\) turns. The hand owns \(Z\), the green point on the impedance picture. The purple mark is \(E^* = Z I^*\), the multiply from Test 1, turning because \(I^*\) is turning and because the hand is moving \(Z\).

The claim is the one the impedance stop already flips. "Voltage and current share a phase" holds when \(Z\) is real and long enough, and fails when \(E^*\) does not point with \(I^*\). The sentence follows the hand. The spin follows the clock. Off resonance the angle between them stays locked while both turn, and a drag of \(Z\) changes that angle without stopping the turn.

One gesture. No slider for \(R\), no slider for \(L\), no slider for \(C\). The imaginary part is one number, which is what that stop already decided.

### The crossing, without the bitmap

Rebuild the orbit inside `films/film-boundary.html`, not the picture of the set.

The gesture is a grab of \(c\) off the fixed path, while the orbit of 0 plays. The mark is that orbit. The orange curve is the cardioid, the wall. The claim is Theorem 4.9 again: the orbit stays, or it has left. Example 4.11, page 115, is the disk the path starts in.

The Julia set breaking into dust is the rendered film that already exists. It is a bitmap, and it should stay one. An SVG scene of the dust is a lie at phone resolution and a second paint. The live page shows the test the theorem names. The mp4 shows the set.

## 3. The technical approach

### Can Manim render this live, as SVG?

No. Not Manim itself, and not the web ports in a way this site should adopt.

Manim Community and ManimGL rasterize, Cairo or OpenGL, to PNG or MP4. The site already plays three of those films. `js/core/rendered-film.js` says "Rendered with Manim." Scrubbing one seeks a baked frame. The frame was painted for one \(c\) and one width. There is no scene graph on the other side of the seek.

`manim-svg-animations` (MathItYT, MIT) is a ManimCE plugin that writes each frame's vector objects out as SVG paths and replays them in a page. Its upstream commit `da696ce` is from 2023-03-06, and that is still the copy vendored in manim-extensions as of 2026-11-01. The interactive mode precomputes a linspace of `ValueTracker` values and looks them up. The project's own notes say the interactive mode is experimental, may be too slow, and that the plugin is not for building a site. A drag of \(z\) is a continuum. A grid of baked scenes is the opposite of live, and it goes stale the moment the sentence changes. It is a way to ship a fixed film as SVG instead of an mp4. The HyperFrames pages are already that, and they are sought by the one clock. I would not add this plugin.

`ecmanim` is a TypeScript port. Live playback in the browser is Canvas-2D or WebGL, through its own `play()`. The SVG backend walks the same tree and writes a document per frame, or a numbered sequence. That output is deterministic and tiny. It is not a DOM the student drags while a single clock runs. Its clock is not `anim.js`.

`manim-web` is the same shape: a browser `Scene.play()`, then a video export. Another clock. Another pause story to re-prove.

Motion Canvas is the closest thing people mean by "Manim for the web." Scenes are generators, `yield* tween(...)`. The 2D view draws through `CanvasRenderingContext2D`. Its SVG node parses SVG into canvas shapes and tweens those. The picture on screen is a bitmap. The scheduler is the generator. A drag in the middle of playback fights a tween the generator already yielded. Putting it on this site means a bundler, a second player, and a new proof of hidden tabs, reduced motion, and no draw while paused. The math in these films is a multiplication. It does not need that machine.

Reanimate, the Haskell library, has the right model and the wrong runtime. An animation is a duration and a function from time to an SVG frame. Resolution does not matter. It is a compiled program. We do not ship GHC. We copy the model.

The model is already in every film page. `draw(t)` computes the picture. The panel seeks `t`. What is missing is the hand, and a refusal to let GSAP own the numbers.

### The path that keeps the one clock

A live film is three functions.

`frame(t, params)` returns the marks, the readouts, the claim, the branch, and the beats. No DOM. `js/core/live-film.js` is that function for the sequence, plus the player.

`createLivePlayer` is `createMotion` from `js/core/anim.js`. One loop. Pause calls `cancel`, and a queued callback does not run. A hidden tab schedules nothing. A gap longer than a frame does not move \(t\). Time steps by elapsed time. The button says Pause while it runs, and a second click freezes the picture where it is. A finished walk plays again from the start. It does not jump backward.

`setParams` writes the hand's number. If the clock is running, this paints the frame the hand just asked for, at the current \(t\), and the loop is already scheduled for the next one. \(t\) does not move. If the clock is stopped, that paint is the whole draw, and nothing is scheduled. A paused film draws nothing on its own. The opening picture is one synchronous paint of the finished frame, the same rule as the film panel.

Reduced motion never enters `drive`. The button says Next step, then Start again. The stops are the film panel's cut: just before each interior beat, then the end. `finishedStops` is checked against `filmStops` so the two cuts cannot drift. The beats come from the branch the hand is in now. Turn reduced motion on while a walk is playing and the walk freezes where it is.

The marks are SVG circles, a polyline, and two strokes. Labels and the claim are HTML, not SVG text, which is the film rule already, so a phone reader gets the sentence at the site's type. Colours are the four tokens. Blue axes, orange unit circle, green \(z\), purple terms. No fifth hue. No GSAP, no ticker, no `requestAnimationFrame` in the page. The page does not import `kit/`.

On a phone the picture is about ten nodes. A drag updates attributes. There is no canvas readback and no video decode. The plane is `touch-action: none` so the drag does not scroll the page. At 360px the page does not scroll sideways. Arrow keys move \(z\) by \(0.05\), the same gesture, so the picture is not pointer-only.

The prototype is not registered in `js/data/films.js`. The eight HyperFrames pages stay on M0.2j, and `tools/film-smoke.mjs` still owns them. When a live film replaces a station's iframe, that station keeps one play button. Two clocks on one stop is the bug this pitch exists to prevent.

### Performance

The sequence is eight complex multiplications a frame. The orbit and the Newton walk are the same order. The impedance is one product. None of these need a worker. The rendered minibrot stays a video because a vector picture of that zoom is the wrong tool, and the fractal stations already have a live bitmap path with its own rules. A live film does not join that path.

## 4. How this plugs into the other four

The map the student fills. A branch not taken is a blank. If the hand never crosses the circle, "Leaves" has not been seen, and the map can say so. The sentence is a row in a table, \(z\) in and a claim out. It is not generated. The fill-in is the drag. A typed function, later, is another `frame`. It has to be the same contract: pure, finite, no second clock. A parser that fails draws nothing and leaves \(t\) alone.

Pictures of functions, and sets the student draws. The same player can walk a path \(\gamma(t)\) while the hand drags a coefficient, and the purple image \(f(\gamma(t))\) moves with it. That is the approach film and the mappings stop, made steerable. A shaded region is not this paint. The film animates the boundary as SVG and hands the interior to the set renderer at the current \(t\). One clock. The bitmap, if there is one, is a paint of the finished picture, not a second loop.

The two planes and the strings. A live film of \(z^n\) can be the string forest at one \(t\), with \(t\) the parameter the 3D view is allowed to read. The 3D view already has a frame that pauses. A station uses that frame or the 2D clock. Not both. If the camera is spinning, the film is paused, and the other way around.

Sound, and the deep zoom. A tone can be \(|z^n|\) or the argument, started by the play button and silenced by pause. No draw means no note. The oscillator is armed from the same tick that paints, not from its own timer. The deep-zoom mp4 stays. If a scrub of that video should show the orbit of the frame's \(c\), the panel seeks the video's `currentTime` and the vector orbit with the same \(t\). The video element stays paused. `rendered-film.js` already refuses autoplay. Do not call `video.play()`.

## 5. What to cut

Do not port Manim, ecmanim, manim-web, or Motion Canvas. Each brings a clock, and two of them bring a bundler. The pause rules would have to be proved again, and the picture would be a bitmap.

Do not precompute a grid of \(z\) values. `manim-svg-animations` interactive mode is that grid. A finger is not a linspace. The only Manim-SVG use worth remembering is a baked film that must stay sharp on a phone. The HyperFrames pages already are SVG. The minibrot cannot be.

Do not rebuild all eight films in the build that follows this council. The prototype is the contract. The next two, if this pitch is chosen, are the orbit and the Newton walk, because their sentences already flip. Multiply, unity, the seam, and the approach stay HyperFrames until a number on them has to change while they play. The boundary film's bitmap stays the rendered film. Only its critical orbit is a candidate for this player.

Do not put the live page and the old iframe on the sequence stop together. One play button. When it ships, the iframe goes.

Do not add a slider for \(|z|\), a chip row, or a fourth control. The sequence stop already has two chips. The live gesture is the drag. Play and scrub are the clock, not a second way to set \(z\).

Do not let the student drag a purple term. That edits a frame the clock is computing. The green point is the only thing the hand holds.

Do not rescale the camera to follow a term that leaves. Leaving the window is the sentence. An arrow on the boundary points the way out. The unit circle stays put.

Do not draw while paused. A drag paints the frame the hand asked for, then the clock sleeps. The opening paint is the finished frame. After that, a paused page schedules nothing.

Do not put LaTeX, a tone, or a second plane in the prototype. Those are the other aspects, and each one has to join this clock rather than bring its own.

The circle snap is the one kindness to argue about. Without it, "stays" is a curve of measure zero and a finger will miss it. With it, a point within \(0.06\) of the circle is on the circle. Cut the snap if a later pass wants the raw point, and give the stay branch a chip. Do not give it both a chip and a slider.

## The prototype

`live/settle.html` loads `js/core/live-film.js` and nothing else of the player's. The clock tests are `node tools/live-film-smoke.mjs`. They check the branch flip at the current \(t\), the pause that draws nothing, the hidden-tab gap, reduced motion, and the page itself: play, set \(z = 1.25\) while it is playing, watch a term leave the window with the clock still past two seconds, pause, then hold the circle. The three site checks are unchanged: `node tools/check_vectors.mjs`, `node tools/fractal-smoke.mjs`, `node kit/smoke.mjs`.
