# Rebuttal: draw-and-map

I read the five pitches and opened each prototype, including a 360px width. Claims below are the sentences those pages were showing.

The book loop's Chapter 5 page is one sentence: "The exponential, the logarithm, and the powers are not drawn here yet." Sections 5.1 through 5.5 are named. 5.4 already points at the phasor stations. The hole is 5.1.

## Sound

What it gets right. Hue is already Arg w and brightness is already |w|, so pitch and loudness are not a new code. On `hear.html` the opening sentence was "w is neither a zero nor a pole." Pressing e^z changed it to both loudness and pitch being off the home note, which is Identity (5.1) along the axes. Hear stays off until asked. Mute is a word. The cut of Log is a pitch jump at steady loudness, and they refuse to call the branch point a pole. That honesty is the best sentence in their set.

Fatal on a phone. The note plays only while the finger is down. Lifting the finger to read the sentence silences the pole. A MAT 412 student on a phone in a hallway cannot hold the sound and the claim at once, and iOS will not buzz. The picture I saw is a colour field and one green dot. Nothing in that field is the image of a region, so Figure 5.3 never appears. Tan z is the opening chip, which is §5.4, and Hear is a fourth control beside the three chips.

Absorb. The probe I already compute, Arg w and |w|, is the only input their ear needs. §5.1 should keep publishing that pair. It should not construct an AudioContext.

## Two planes

What it gets right. The graph is four numbers, and a string is one sample of the correspondence. I turned nothing and the page still said, for z², that 0.6 + 0.8i and its opposite land together at −0.28 + 0.96i. Pressing e^z flipped the sentence to the strip: top and bottom land on the same ray, vertical lines become circles, and no string hits 0. Colour is the lab's domain colouring, the same at both ends of a string. They rebuild the forest when the formula changes, not while you turn. The flat-canvas fallback means a missing WebGL context still states the sentence.

Fatal on a phone. At 360px the forest sits under the claim, the chips, and the formula box. The default camera, which is what a student sees before they learn to orbit, does not show the circle that sentence names. I clicked e^z and still saw two painted sheets and a bundle. Orbit-drag on a phone fights the scroll, and the formula box is a fourth control. A fixed 36×36 grid cannot be the rectangle the student just drew.

Absorb. Their fixed windows, one per function, so magnification is something you can see. And their rule that the pen does not live on the 3D page. The strings should be samples of the cell grid below, not a second lattice.

## Live films

What it gets right. `live/settle.html` is the cleanest phone page of the five. At 360px the plane, the green point, and "Settles at 0. The tail sits in the disk." are on the first screen. The clock owns t. The hand owns z. Dragging does not rewind. The marks are a handful of SVG nodes. They refuse a second clock, a Manim port, and a slider beside the drag. That contract is the one the site already proved for films.

Fatal on a phone, for this student, this week. The picture is §4.1, powers of one point, landing inside an orange circle. Chapter 5's missing picture is a rectangle becoming an annular sector. A shaded region is, in their own pitch, not this paint. The scrubber is a second hand on t, under the plane. A student who came for e^z gets a sequence they can already meet on the Chapter 4 walk.

Absorb. If a boundary is walked later, the walker is their `frame(t, params)` on `createMotion`. The hand still owns the ink. t only chooses how much of that ink has been painted.

## Pedagogy

What it gets right. `lessons/disk.html` opened with "The picture has not moved" and a blank for the square of 1/2. A wrong blank does not reveal the landing. The rule box is `compile` from `js/core/parse.js`, and a custom rule does not rewrite the book's blanks. Hints stay closed. They will not lock `#julia` the night before an exam. They will not grade an essay. One store key, `mv:lesson-progress`, and they already know the book page should call `nodesForChapter` rather than invent a second map.

Fatal on a phone. The gesture is typing. At 360px the blank, Check, the rule box, Hint, Back, and Next step sit under a plane that the keyboard will cover. The picture refuses to move until the blank is right, so a student who is lost cannot look at the landing and then answer. The lesson is Example 4.9, which the disk stop already draws. Their own cut list says the §5.4 blanks can wait. Chapter 5 stays a sentence.

Absorb. One progress module, theirs, and the book's exercise ticks stay in `js/book/progress.js`. I will not write a third key. A blank on §5.1, if they add one, grades the claim the picture already flips. The tiles are on screen before the blank is filled.

## Deep zoom

What it gets right. The recurrence is the book's, and the extra digits are that same recurrence. `deep-zoom.html` opened with a real picture: blue stayed, orange left, a green cross, and the sentence "Two doubles have run out." Pause draws nothing more. Reset is the wide set in Figure 4.6. The pixel check against a direct high-precision orbit is the right kind of proof. They refuse to paint an unsettled glitch as inside.

Fatal on a phone. The first frame is already past Figure 4.6. The sentence leads with integer length. Play, Reset, a rate field, and two chips are six controls, and at 360px Play is below the canvas. A student who has not yet seen the exponential is looking at a filament and a cross. Nothing on that page is e^z, Log z, or a power.

Absorb. One step of z² + c, applied to a drawn set, is `mapInk` of those cells. The deep window, the long integer, and that Play stay on their page.

## Shared pieces

One cell grid. Squares of side 0.12, indexed by `{i, j, k}`, corners included, already built in `js/draw-map/model.js`. A drawn rectangle is the cells whose corners lie inside it. Two-planes subsamples that lattice for strings. A live film paints the cells with `k / n ≤ t`. Deep zoom does not get a copy of the grid. One application of z² + c is the same cells through `compile('z^2+c')`.

One clock. `createMotion` in `js/core/anim.js`. Live-films' player is that clock with a `frame(t, params)`. Sound's oscillators, if they ever sit on this probe, arm from the Hear gesture or from that tick, and a pause silences them. Two-planes' orbit damping is a camera, and it does not run in the same station as a walk. Deep zoom's Play owns a width. It does not own §5.1.

One progress module. Exercise ticks stay in the book loop's `js/book/progress.js`. Blank ink stays in pedagogy's `mv:lesson-progress`. §5.1 reads a stored rule string only when its own field is empty, and compiles it again. It does not ink a node and it does not lock a hash.

One parser. `compile` in `js/core/parse.js`. Sound correctly has no box. Two-planes, pedagogy, and this page already call `compile`. The `ln(` to `log(` alias lives at the edge of my page today. It should not be copied into a second grammar. Films and deep zoom take no formula until they need one, and then they take this closure.

## Revised pitch, and what I cut

Draw a rectangle in the fundamental strip. e^z paints each of those squares onto the annular sector, and the sentence fails when the ink crosses Im z = ±π.

Cut from my own pitch, for the station that ships:

- Play, on this station. The tiles appear under the hand. A later walk of the boundary is the live-film player, not a second button here.
- The antiderivative number. It is Chapter 6, §6.2, and on a phone it turns the readout into a paragraph. The function can stay in the model. It leaves the page.
- The orange ring for the period copy. Sound hears the repeat. Two-planes shows the two edges of the strip landing on one ray. The orange lines at ±π are enough.
- The little square. That is §3.1, Equation (3.1). It is a second mark on an already small phone canvas. It comes back when the derivative is the sentence.
- A refitting w window on this station. Two-planes is right: the strip and the annulus need fixed units or the stretch is invisible. A typed formula that runs off the window may still refit, and the readout keeps both widths.
- The sector as the opening ink. That sector is Figure 5.4, which is §5.2. It remains the second station. The prototype page can keep it; the Chapter 5 station does not open on it.

## The Chapter 5 station to anchor first

§5.1, The Complex Exponential Function, printed page 130. Definition 5.1 is the series Chapter 4 just taught. Identity (5.1) is |e^z| = e^x and the angle equal to y. Figure 5.2 is the strip −π < y ≤ π. Example 5.2 and Figure 5.3 are the rectangle that becomes an annular sector. That is the draw.

§5.2 is the same grid run backwards, the sector to the rectangle, and it waits until 5.1 is a picture. §5.3 is exp of a logarithm, so it needs both. §5.4 already has the phasor stations on the book path. §5.5 is the inverses of those, and it is not the first hole.
